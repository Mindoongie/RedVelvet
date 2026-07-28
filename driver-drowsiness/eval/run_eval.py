"""Khung đánh giá GĐ1: video có nhãn -> recall, precision, báo giả/giờ, độ trễ
(p50/p95/p99), coverage. v2: so sánh nhiều nguồn tín hiệu trên CÙNG video.

Không dùng camera sống — chạy lại đúng pipeline landmark -> EyeStateSource ->
Lớp 1 / Lớp 2 trên một file video, dùng timestamp OpenCV giải mã được cho
từng frame (KHÔNG suy ra thời lượng từ số thứ tự frame, kể cả với video VFR).

Cách chạy (1 nguồn, mặc định theo config.yaml):
    python eval/run_eval.py --video sample.mp4 --labels labels.csv

So sánh nhiều nguồn trên cùng video:
    python eval/run_eval.py --video sample.mp4 --labels labels.csv --nguon ear,blendshape,hybrid,onnx

Định dạng nhãn (CSV): start_sec,end_sec,label với label thuộc
{nham_mat, ngap, gat_dau}.
"""
from __future__ import annotations

import argparse
import copy
import csv
import sys
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import cv2
import numpy as np

from edge.camera import Frame
from edge.config import load_config
from edge.coverage import CoverageTracker
from edge.eye_state import tao_nguon_tin_hieu
from edge.landmark_provider import LandmarkProvider
from edge.layer1_reflex import Layer1Reflex
from edge.layer2_trend import NodDetector, YawnDetector
from edge.metrics import mouth_aspect_ratio, pitch_deg_from_matrix

NHAN_HOP_LE = {"nham_mat", "ngap", "gat_dau"}
NGUON_HOP_LE = {"ear", "blendshape", "hybrid", "onnx"}


@dataclass
class NhanGoc:
    start_sec: float
    end_sec: float
    label: str
    da_khop: bool = False


@dataclass
class PhatHien:
    t: float
    label: str


@dataclass
class KetQuaPipeline:
    nguon: str
    phat_hien: list[PhatHien] = field(default_factory=list)
    latencies_pipeline_ms: list[float] = field(default_factory=list)
    duration_giay: float = 0.0
    coverage: float = 0.0


def doc_nhan(path: str) -> list[NhanGoc]:
    nhans = []
    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            label = row["label"].strip()
            if label not in NHAN_HOP_LE:
                print(f"[eval] Bỏ qua nhãn không hợp lệ: {label}")
                continue
            nhans.append(NhanGoc(float(row["start_sec"]), float(row["end_sec"]), label))
    return nhans


def _sao_chep_nhan(nhans_goc: list[NhanGoc]) -> list[NhanGoc]:
    """Mỗi nguồn cần một bản sao NhanGoc riêng (cờ da_khop độc lập)."""
    return [NhanGoc(n.start_sec, n.end_sec, n.label) for n in nhans_goc]


def chay_pipeline(video_path: str, cfg: dict, nguon: str | None = None) -> KetQuaPipeline:
    """Chạy lại pipeline landmark -> EyeStateSource -> Lớp 1/Lớp 2 trên video,
    với nguồn tín hiệu mắt do `nguon` chỉ định (None = dùng đúng config.yaml)."""
    cfg_chay = copy.deepcopy(cfg)
    if nguon is not None:
        cfg_chay.setdefault("nguon_tin_hieu", {})["mat"] = nguon
    nguon_hien_dung = cfg_chay.get("nguon_tin_hieu", {}).get("mat", "ear")

    lm_cfg = cfg_chay["landmark"]
    l1_cfg = cfg_chay["layer1"]
    l2_cfg = cfg_chay["layer2"]

    layer1 = Layer1Reflex(
        nguong_nham_mat_giay_mac_dinh=l1_cfg["nguong_nham_mat_giay"],
        chop_mat_toi_da_giay=l1_cfg["chop_mat_toi_da_giay"],
        canh_bao_do_tre_ms=l1_cfg["canh_bao_do_tre_ms"],
        mat_landmark_toi_da_giay=cfg_chay.get("mat_mat_landmark", {}).get("toi_da_giu_chuoi_giay", 1.5),
    )
    eye_source = tao_nguon_tin_hieu(cfg_chay)
    coverage_tracker = CoverageTracker()
    yawn_detector = YawnDetector(
        nguong_mar=l2_cfg["ngap"]["nguong_mar"],
        nguong_ngap_giay=l2_cfg["ngap"]["nguong_ngap_giay"],
        debounce_giay=l2_cfg["ngap"]["debounce_giay"],
        cua_so_phut=l2_cfg["ngap"]["cua_so_phut"],
    )
    nod_detector = NodDetector(
        nguong_pitch_do=l2_cfg["gat_dau"]["nguong_pitch_do"],
        hoi_phuc_toi_da_giay=l2_cfg["gat_dau"]["hoi_phuc_toi_da_giay"],
        cua_so_phut=l2_cfg["gat_dau"]["cua_so_phut"],
    )
    dao_dau_pitch = l2_cfg["gat_dau"].get("dao_dau_pitch", False)

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError(f"Không mở được video: {video_path}")

    ket_qua = KetQuaPipeline(nguon=nguon_hien_dung)

    with LandmarkProvider(
        model_path=lm_cfg["model_path"],
        num_faces=lm_cfg["num_faces"],
        min_face_detection_confidence=lm_cfg["min_face_detection_confidence"],
        min_face_presence_confidence=lm_cfg["min_face_presence_confidence"],
        min_tracking_confidence=lm_cfg["min_tracking_confidence"],
    ) as landmark_provider:

        t_cuoi = 0.0
        n_frame = 0

        while True:
            ok, image = cap.read()
            if not ok:
                break
            n_frame += 1
            t = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0
            if t <= 0.0:
                # một số codec không trả pos_msec đáng tin cậy ngay từ đầu; fallback sang fps*index
                fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
                t = n_frame / fps
            t_cuoi = max(t_cuoi, t)

            result = landmark_provider.process(Frame(image=image, t_capture=t))
            landmarks = result.landmarks if result is not None else None
            blendshapes = result.blendshapes if result is not None else None
            width = result.image_width if result is not None else image.shape[1]
            height = result.image_height if result is not None else image.shape[0]

            danh_gia_mat = eye_source.danh_gia(landmarks, blendshapes, width, height, t, image)
            coverage_tracker.cap_nhat(t, danh_gia_mat.kha_dung)

            event1 = layer1.update(danh_gia_mat.dang_nham, danh_gia_mat.kha_dung, t, ear=danh_gia_mat.ear)
            if event1 is not None:
                ket_qua.phat_hien.append(PhatHien(t=event1.t_frame_kich_hoat, label="nham_mat"))
                ket_qua.latencies_pipeline_ms.append(event1.latency_ms)

            if result is None:
                continue

            mar = mouth_aspect_ratio(result.landmarks, result.image_width, result.image_height)
            pitch = 0.0
            if result.transformation_matrix is not None:
                pitch = pitch_deg_from_matrix(result.transformation_matrix, invert=dao_dau_pitch)

            if yawn_detector.update(mar, t):
                ket_qua.phat_hien.append(PhatHien(t=t, label="ngap"))

            if nod_detector.update(pitch, t):
                ket_qua.phat_hien.append(PhatHien(t=t, label="gat_dau"))

        duration_giay = t_cuoi
        if duration_giay <= 0:
            fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or n_frame
            duration_giay = frame_count / fps

    cap.release()
    ket_qua.duration_giay = duration_giay
    ket_qua.coverage = coverage_tracker.coverage
    return ket_qua


def _percentiles(values: list[float], ps: tuple[int, ...] = (50, 95, 99)) -> dict[int, float]:
    if not values:
        return {p: float("nan") for p in ps}
    arr = np.asarray(values, dtype=np.float64)
    return {p: float(np.percentile(arr, p)) for p in ps}


def tinh_chi_so(
    ket_qua: KetQuaPipeline,
    nhans_goc: list[NhanGoc],
    dung_sai_giay: float,
) -> dict:
    """So khớp phát hiện với nhãn gốc -> TP/FP/FN, recall, precision, báo
    giả/giờ, độ trễ phát-hiện-so-với-mốc-gán-nhãn (p50/p95/p99), coverage."""
    nhans = _sao_chep_nhan(nhans_goc)
    tp = 0
    fp = 0
    latencies_khop_s: list[float] = []

    for ph in sorted(ket_qua.phat_hien, key=lambda p: p.t):
        ung_vien = [
            n for n in nhans
            if not n.da_khop and n.label == ph.label
            and (n.start_sec - dung_sai_giay) <= ph.t <= (n.end_sec + dung_sai_giay)
        ]
        if ung_vien:
            khop = min(ung_vien, key=lambda n: abs(ph.t - n.start_sec))
            khop.da_khop = True
            tp += 1
            latencies_khop_s.append(max(0.0, ph.t - khop.start_sec))
        else:
            fp += 1

    fn = sum(1 for n in nhans if not n.da_khop)

    recall = tp / (tp + fn) if (tp + fn) > 0 else float("nan")
    precision = tp / (tp + fp) if (tp + fp) > 0 else float("nan")
    gio = ket_qua.duration_giay / 3600.0 if ket_qua.duration_giay > 0 else float("nan")
    bao_gia_gio = fp / gio if gio and gio > 0 else float("nan")

    do_tre_percentiles_ms = _percentiles([s * 1000.0 for s in latencies_khop_s])
    pipeline_percentiles_ms = _percentiles(ket_qua.latencies_pipeline_ms)

    return {
        "nguon": ket_qua.nguon,
        "tp": tp, "fp": fp, "fn": fn,
        "recall": recall, "precision": precision, "bao_gia_gio": bao_gia_gio,
        "coverage": ket_qua.coverage,
        "do_tre_p50_ms": do_tre_percentiles_ms[50],
        "do_tre_p95_ms": do_tre_percentiles_ms[95],
        "do_tre_p99_ms": do_tre_percentiles_ms[99],
        "pipeline_p50_ms": pipeline_percentiles_ms[50],
        "pipeline_p95_ms": pipeline_percentiles_ms[95],
    }


def in_bao_cao_don(ket_qua: KetQuaPipeline, chi_so: dict, video_path: str, nhans_goc: list[NhanGoc]) -> None:
    print("=" * 68)
    print(f"Video: {video_path}  (thời lượng {ket_qua.duration_giay:.1f}s)  Nguồn: {ket_qua.nguon}")
    print(f"Nhãn gốc: {len(nhans_goc)}   Phát hiện: {len(ket_qua.phat_hien)}")
    print("-" * 68)
    print(f"Recall              : {chi_so['recall']:.3f}   (mục tiêu GĐ1 >= 0.85)")
    print(f"Precision           : {chi_so['precision']:.3f}")
    print(f"Báo giả / giờ       : {chi_so['bao_gia_gio']:.3f}   (mục tiêu GĐ1 < 1.0)")
    print(f"Coverage            : {chi_so['coverage']*100:.1f}%   (nguyên tắc hai con số — luôn đi kèm độ chính xác)")
    print(f"Độ trễ p50/p95/p99  : {chi_so['do_tre_p50_ms']:.1f} / {chi_so['do_tre_p95_ms']:.1f} / "
          f"{chi_so['do_tre_p99_ms']:.1f} ms")
    print("-" * 68)
    print(f"TP={chi_so['tp']}  FP={chi_so['fp']}  FN={chi_so['fn']}")
    print(f"(Độ trễ pipeline Lớp 1 riêng phần frame->quyết định, p50/p95: "
          f"{chi_so['pipeline_p50_ms']:.2f} / {chi_so['pipeline_p95_ms']:.2f} ms)")
    print("=" * 68)


def in_bang_so_sanh(danh_sach_chi_so: list[dict]) -> None:
    cols = ["nguon", "recall", "precision", "bao_gia_gio", "coverage", "do_tre_p50_ms", "do_tre_p95_ms"]
    tieu_de = ["Nguồn", "Recall", "Precision", "Báo giả/h", "Coverage", "p50 (ms)", "p95 (ms)"]
    rows = []
    for c in danh_sach_chi_so:
        rows.append([
            c["nguon"],
            f"{c['recall']:.3f}",
            f"{c['precision']:.3f}",
            f"{c['bao_gia_gio']:.3f}",
            f"{c['coverage']*100:.1f}%",
            f"{c['do_tre_p50_ms']:.1f}",
            f"{c['do_tre_p95_ms']:.1f}",
        ])
    widths = [max(len(tieu_de[i]), *(len(r[i]) for r in rows)) + 2 for i in range(len(cols))]

    def _dong(vals: list[str]) -> str:
        return "".join(v.ljust(widths[i]) for i, v in enumerate(vals))

    print("\n" + "=" * sum(widths))
    print("SO SÁNH NGUỒN TÍN HIỆU (cùng video, cùng nhãn)")
    print("=" * sum(widths))
    print(_dong(tieu_de))
    print("-" * sum(widths))
    for r in rows:
        print(_dong(r))
    print("=" * sum(widths))


def main() -> None:
    parser = argparse.ArgumentParser(description="Đánh giá GĐ1: recall, precision, báo giả/giờ, độ trễ percentile, coverage")
    parser.add_argument("--video", required=True)
    parser.add_argument("--labels", required=True)
    parser.add_argument("--config", default=str(Path(__file__).resolve().parent.parent / "config.yaml"))
    parser.add_argument("--dung-sai-giay", type=float, default=1.5,
                         help="Biên dung sai khi khớp phát hiện với nhãn gốc (giây)")
    parser.add_argument("--nguon", default=None,
                         help="Danh sách nguồn phân tách bởi dấu phẩy để SO SÁNH, vd: ear,blendshape,hybrid,onnx "
                              "(mặc định: chỉ chạy đúng 1 lần theo nguon_tin_hieu.mat trong config.yaml)")
    args = parser.parse_args()

    cfg = load_config(args.config)
    nhans_goc = doc_nhan(args.labels)

    if args.nguon:
        danh_sach_nguon = [s.strip() for s in args.nguon.split(",") if s.strip()]
        for n in danh_sach_nguon:
            if n not in NGUON_HOP_LE:
                raise SystemExit(f"Nguồn không hợp lệ: {n!r} (chấp nhận: {sorted(NGUON_HOP_LE)})")

        danh_sach_chi_so = []
        for nguon in danh_sach_nguon:
            print(f"\n[eval] Đang chạy pipeline với nguồn '{nguon}'...")
            ket_qua = chay_pipeline(args.video, cfg, nguon=nguon)
            chi_so = tinh_chi_so(ket_qua, nhans_goc, args.dung_sai_giay)
            in_bao_cao_don(ket_qua, chi_so, args.video, nhans_goc)
            danh_sach_chi_so.append(chi_so)

        in_bang_so_sanh(danh_sach_chi_so)
    else:
        ket_qua = chay_pipeline(args.video, cfg, nguon=None)
        chi_so = tinh_chi_so(ket_qua, nhans_goc, args.dung_sai_giay)
        in_bao_cao_don(ket_qua, chi_so, args.video, nhans_goc)


if __name__ == "__main__":
    main()
