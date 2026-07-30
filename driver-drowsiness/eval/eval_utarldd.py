"""eval/eval_utarldd.py — Bộ nạp & đánh giá trên UTA-RLDD (item 5).

UTA-RLDD gán nhãn Ở CẤP VIDEO (không có mốc thời gian như nhãn hành vi):
0 = alert, 5 = low vigilant, 10 = drowsy. Với nhãn cấp-video, đo:
  (a) MỌI cảnh báo Lớp 1 trên video 'alert' (0) = báo giả -> báo giả/giờ
  (b) tỷ lệ thời gian ở mức cảnh báo Lớp 2 >= 1 trên video 'drowsy' (10) so
      với video 'alert' (0)
  (c) PERCLOS trung bình theo lớp (0/5/10)
  (d) coverage theo lớp (nguyên tắc hai con số — không báo cáo (a)-(c) mà
      thiếu (d) đi kèm)

Xuất báo cáo markdown + CSV vào reports/eval/<timestamp>/.

Cách chạy:
    python eval/eval_utarldd.py --videos-dir path/to/UTA-RLDD
    python eval/eval_utarldd.py --videos-dir path/to/UTA-RLDD --nguon ear,hybrid   # so sánh nguồn
    python eval/eval_utarldd.py --videos-dir . --label-map nhan.csv                # nhãn tường minh

Quy ước suy luận nhãn từ tên file/thư mục (khi KHÔNG dùng --label-map): tìm
token 0/5/10 đứng độc lập (không dính số khác) trong tên file hoặc thư mục
cha — đúng quy ước phổ biến của bộ UTA-RLDD gốc (vd '0.mp4', 'sub12_10.mp4').
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
import time
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import cv2

from edge.camera import Frame
from edge.config import load_config
from edge.coverage import CoverageTracker
from edge.eye_state import tao_nguon_tin_hieu
from edge.landmark_provider import LandmarkProvider
from edge.layer1_reflex import Layer1Reflex
from edge.layer2_trend import Layer2Trend
from edge.metrics import mouth_aspect_ratio, pitch_deg_from_matrix

MUC_HOP_LE = {0, 5, 10}
TEN_LOP = {0: "alert", 5: "low_vigilant", 10: "drowsy"}
NGUON_HOP_LE = {"ear", "blendshape", "hybrid", "onnx"}


@dataclass
class KetQuaVideo:
    video_path: str
    nguon: str
    muc_nhan: int
    duration_giay: float = 0.0
    coverage: float = 0.0
    so_lan_kich_coi_layer1: int = 0
    thoi_gian_muc_ge1_giay: float = 0.0
    perclos_trung_binh: float = 0.0

    @property
    def ty_le_muc_ge1(self) -> float:
        return self.thoi_gian_muc_ge1_giay / self.duration_giay if self.duration_giay > 1e-9 else 0.0

    @property
    def bao_gia_gio(self) -> float:
        gio = self.duration_giay / 3600.0
        return self.so_lan_kich_coi_layer1 / gio if gio > 1e-9 else 0.0


def suy_luan_nhan_tu_ten(path: Path) -> int | None:
    for phan in (path.stem, path.parent.name):
        m = re.search(r"(?<!\d)(10|0|5)(?!\d)", phan)
        if m:
            muc = int(m.group(1))
            if muc in MUC_HOP_LE:
                return muc
    return None


def tim_video_va_nhan(videos_dir: str, label_map_csv: str | None) -> list[tuple[Path, int]]:
    if label_map_csv:
        ket_qua = []
        with open(label_map_csv, "r", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                ket_qua.append((Path(row["video_path"]), int(row["label"])))
        return ket_qua

    root = Path(videos_dir)
    ket_qua: list[tuple[Path, int]] = []
    for ext in ("*.mp4", "*.avi", "*.mov", "*.mkv"):
        for p in sorted(root.rglob(ext)):
            muc = suy_luan_nhan_tu_ten(p)
            if muc is not None:
                ket_qua.append((p, muc))
            else:
                print(f"[eval_utarldd] Bỏ qua (không suy ra được nhãn 0/5/10 từ tên): {p}")
    return ket_qua


def chay_video(video_path: Path, muc_nhan: int, cfg: dict, nguon: str | None) -> KetQuaVideo | None:
    cfg_chay = dict(cfg)
    if nguon is not None:
        cfg_chay = {**cfg, "nguon_tin_hieu": {**cfg.get("nguon_tin_hieu", {}), "mat": nguon}}
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
    layer2 = Layer2Trend(l2_cfg)
    eye_source = tao_nguon_tin_hieu(cfg_chay)
    coverage_tracker = CoverageTracker()
    dao_dau_pitch = l2_cfg["gat_dau"].get("dao_dau_pitch", False)
    perclos_canh_bao = l2_cfg["perclos"]["nguong_perclos_cao"]  # ngưỡng "binh_thuong" mặc định cho eval offline

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"[eval_utarldd] Không mở được video: {video_path} — bỏ qua.")
        return None

    so_lan_kich_coi = 0
    t_muc_ge1_tich_luy = 0.0
    t_truoc: float | None = None
    muc_truoc = 0
    perclos_values: list[float] = []

    with LandmarkProvider(
        model_path=lm_cfg["model_path"], num_faces=lm_cfg["num_faces"],
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
                fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
                t = n_frame / fps
            t_cuoi = max(t_cuoi, t)

            result = landmark_provider.process(Frame(image=image, t_capture=t))
            landmarks = result.landmarks if result is not None else None
            blendshapes = result.blendshapes if result is not None else None
            width = result.image_width if result is not None else image.shape[1]
            height = result.image_height if result is not None else image.shape[0]

            danh_gia = eye_source.danh_gia(landmarks, blendshapes, width, height, t, image)
            coverage_tracker.cap_nhat(t, danh_gia.kha_dung)

            event1 = layer1.update(danh_gia.dang_nham, danh_gia.kha_dung, t, ear=danh_gia.ear)
            if event1 is not None:
                so_lan_kich_coi += 1

            if result is not None and danh_gia.kha_dung:
                mar = mouth_aspect_ratio(result.landmarks, result.image_width, result.image_height)
                pitch = 0.0
                if result.transformation_matrix is not None:
                    pitch = pitch_deg_from_matrix(result.transformation_matrix, invert=dao_dau_pitch)

                snap = layer2.update(danh_gia.dang_nham, mar, pitch, t, perclos_canh_bao)
                perclos_values.append(snap.perclos)

                if t_truoc is not None and muc_truoc >= 1:
                    t_muc_ge1_tich_luy += max(0.0, t - t_truoc)
                muc_truoc = snap.muc
                t_truoc = t

        duration_giay = t_cuoi
        if duration_giay <= 0:
            fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
            frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT) or n_frame
            duration_giay = frame_count / fps

    cap.release()

    return KetQuaVideo(
        video_path=str(video_path),
        nguon=nguon_hien_dung,
        muc_nhan=muc_nhan,
        duration_giay=duration_giay,
        coverage=coverage_tracker.coverage,
        so_lan_kich_coi_layer1=so_lan_kich_coi,
        thoi_gian_muc_ge1_giay=t_muc_ge1_tich_luy,
        perclos_trung_binh=(sum(perclos_values) / len(perclos_values)) if perclos_values else 0.0,
    )


def _trung_binh(vals: list[float]) -> float:
    return sum(vals) / len(vals) if vals else float("nan")


def tong_hop_theo_lop(ket_qua_list: list[KetQuaVideo]) -> dict[int, dict]:
    tong_hop = {}
    for muc in sorted({kq.muc_nhan for kq in ket_qua_list}):
        nhom = [kq for kq in ket_qua_list if kq.muc_nhan == muc]
        tong_giay = sum(kq.duration_giay for kq in nhom)
        tong_kich_coi = sum(kq.so_lan_kich_coi_layer1 for kq in nhom)
        gio = tong_giay / 3600.0
        tong_hop[muc] = {
            "ten_lop": TEN_LOP.get(muc, str(muc)),
            "so_video": len(nhom),
            "bao_gia_gio": (tong_kich_coi / gio) if gio > 1e-9 else float("nan"),
            "ty_le_muc_ge1_tb": _trung_binh([kq.ty_le_muc_ge1 for kq in nhom]),
            "perclos_tb": _trung_binh([kq.perclos_trung_binh for kq in nhom]),
            "coverage_tb": _trung_binh([kq.coverage for kq in nhom]),
        }
    return tong_hop


def xuat_bao_cao(
    ket_qua_list: list[KetQuaVideo],
    thu_muc_goc: str,
    timestamp_str: str,
) -> Path:
    thu_muc = Path(thu_muc_goc) / timestamp_str
    thu_muc.mkdir(parents=True, exist_ok=True)

    with open(thu_muc / "chi_tiet.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["video_path", "nguon", "muc_nhan", "ten_lop", "duration_giay", "coverage",
                          "so_lan_kich_coi_layer1", "bao_gia_gio", "ty_le_muc_ge1", "perclos_trung_binh"])
        for kq in ket_qua_list:
            writer.writerow([kq.video_path, kq.nguon, kq.muc_nhan, TEN_LOP.get(kq.muc_nhan, kq.muc_nhan),
                              f"{kq.duration_giay:.2f}", f"{kq.coverage:.4f}", kq.so_lan_kich_coi_layer1,
                              f"{kq.bao_gia_gio:.4f}", f"{kq.ty_le_muc_ge1:.4f}", f"{kq.perclos_trung_binh:.4f}"])

    dong = [
        "# Báo cáo UTA-RLDD — GĐ1", "",
        f"- Thời điểm: {timestamp_str}",
        f"- Tổng số video: {len(ket_qua_list)}", "",
    ]

    for nguon in sorted({kq.nguon for kq in ket_qua_list}):
        nhom_nguon = [kq for kq in ket_qua_list if kq.nguon == nguon]
        tong_hop = tong_hop_theo_lop(nhom_nguon)
        dong += [f"## Nguồn: `{nguon}`", "",
                 "| Lớp | Số video | Báo giả/giờ | Tỷ lệ TB mức≥1 | PERCLOS TB | Coverage TB |",
                 "|---|---|---|---|---|---|"]
        for muc, s in tong_hop.items():
            dong.append(
                f"| {s['ten_lop']} ({muc}) | {s['so_video']} | {s['bao_gia_gio']:.3f} | "
                f"{s['ty_le_muc_ge1_tb']*100:.1f}% | {s['perclos_tb']:.3f} | {s['coverage_tb']*100:.1f}% |"
            )
        dong.append("")
        if 0 in tong_hop and 10 in tong_hop:
            dong.append(
                f"- **So sánh alert vs drowsy**: tỷ lệ thời gian mức≥1 alert={tong_hop[0]['ty_le_muc_ge1_tb']*100:.1f}% "
                f"vs drowsy={tong_hop[10]['ty_le_muc_ge1_tb']*100:.1f}% "
                f"(chênh lệch {(tong_hop[10]['ty_le_muc_ge1_tb']-tong_hop[0]['ty_le_muc_ge1_tb'])*100:+.1f} điểm %)."
            )
        dong.append("")

    (thu_muc / "bao_cao.md").write_text("\n".join(dong), encoding="utf-8")
    return thu_muc


def main() -> None:
    parser = argparse.ArgumentParser(description="Đánh giá trên UTA-RLDD (nhãn cấp-video 0/5/10)")
    parser.add_argument("--videos-dir", required=True)
    parser.add_argument("--label-map", default=None, help="CSV tường minh video_path,label thay vì suy từ tên file")
    parser.add_argument("--config", default=str(Path(__file__).resolve().parent.parent / "config.yaml"))
    parser.add_argument("--nguon", default=None, help="1 hoặc nhiều nguồn phân tách bởi dấu phẩy để so sánh")
    parser.add_argument("--out", default="reports/eval")
    args = parser.parse_args()

    cfg = load_config(args.config)
    videos = tim_video_va_nhan(args.videos_dir, args.label_map)
    if not videos:
        raise SystemExit(f"[eval_utarldd] Không tìm thấy video nào có nhãn hợp lệ trong '{args.videos_dir}'.")

    print(f"[eval_utarldd] Tìm thấy {len(videos)} video có nhãn.")

    danh_sach_nguon = [None]
    if args.nguon:
        danh_sach_nguon = [s.strip() for s in args.nguon.split(",") if s.strip()]
        for n in danh_sach_nguon:
            if n not in NGUON_HOP_LE:
                raise SystemExit(f"Nguồn không hợp lệ: {n!r} (chấp nhận: {sorted(NGUON_HOP_LE)})")

    ket_qua_list: list[KetQuaVideo] = []
    for nguon in danh_sach_nguon:
        for path, muc in videos:
            print(f"[eval_utarldd] Đang chạy {path.name} (nhãn={muc}, nguồn={nguon or 'config mặc định'})...")
            kq = chay_video(path, muc, cfg, nguon)
            if kq is not None:
                ket_qua_list.append(kq)

    timestamp_str = time.strftime("%Y%m%d-%H%M%S")
    thu_muc = xuat_bao_cao(ket_qua_list, args.out, timestamp_str)
    print(f"\n[eval_utarldd] Đã xuất báo cáo: {thu_muc}")


if __name__ == "__main__":
    main()
