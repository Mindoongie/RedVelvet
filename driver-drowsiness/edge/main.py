"""Vòng lặp chính của edge: camera -> landmark -> EyeStateSource (ear/blendshape/
hybrid/onnx) -> (Lớp 1 phản xạ ngay) + (Lớp 2 tích luỹ cửa sổ) -> alert_policy
-> buzzer/uplink. Song song: coverage + phát hiện mất mặt (khong_kha_dung,
mat_mat_sau_chui_dau).

Lớp 1 KHÔNG phụ thuộc uplink, server hay dashboard — chạy được khi rút mạng.
"""
from __future__ import annotations

import argparse
import time
from pathlib import Path

import cv2
import numpy as np

from edge.alert_policy import AlertPolicy
from edge.buzzer import Buzzer
from edge.camera import Camera
from edge.config import load_config
from edge.context import ContextProvider
from edge.coverage import CoverageTracker, FaceLossTracker
from edge.eye_state import tao_nguon_tin_hieu
from edge.jsonl_logger import JsonlLogger
from edge.landmark_provider import LandmarkProvider
from edge.layer1_reflex import Layer1Reflex
from edge.layer2_trend import Layer2Trend
from edge.metrics import mouth_aspect_ratio, pitch_deg_from_matrix
from edge.profile import doc_profile
from edge.session_report import SessionRecorder, xuat_bao_cao
from edge.uplink import Uplink

MAU_THEO_MUC = {
    0: (0, 200, 0),
    1: (0, 200, 200),
    2: (0, 128, 255),
    3: (0, 0, 255),
}


def _ve_overlay(image: np.ndarray, danh_gia, mar: float, pitch: float,
                 perclos: float, ngap_phut: float, gat_phut: float, muc: int,
                 nguong_nham_mat_giay: float, muc_nen: str, latency_ms: float | None,
                 coverage: float, profile_id: str | None) -> np.ndarray:
    out = image.copy()
    mau = MAU_THEO_MUC.get(muc, (255, 255, 255)) if danh_gia.kha_dung else (140, 140, 140)
    ear_txt = f"{danh_gia.ear:.3f}" if danh_gia.ear is not None else "-"
    blink_txt = f"{danh_gia.blink_mean:.2f}" if danh_gia.blink_mean is not None else "-"
    dong = [
        f"Nguon: {danh_gia.nguon}  EAR: {ear_txt}  Blink: {blink_txt}  MAR: {mar:.3f}  Pitch: {pitch:.1f} deg",
        f"PERCLOS(60s): {perclos:.2f}  Ngap/phut: {ngap_phut:.2f}  Gat/phut: {gat_phut:.2f}  Coverage: {coverage*100:.0f}%",
        f"Muc canh bao: {muc}   Muc nen: {muc_nen}   Nguong nham mat: {nguong_nham_mat_giay:.2f}s   "
        f"Profile: {profile_id or 'mac dinh'}",
    ]
    if not danh_gia.kha_dung:
        dong.append("KHONG KHA DUNG — mat landmark")
    if latency_ms is not None:
        dong.append(f"Layer1 latency lan gan nhat: {latency_ms:.1f} ms")

    cv2.rectangle(out, (0, 0), (out.shape[1], 12 + 22 * len(dong)), (0, 0, 0), thickness=-1)
    for i, text in enumerate(dong):
        cv2.putText(out, text, (8, 22 + 22 * i), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)

    cv2.rectangle(out, (0, 0), (out.shape[1] - 1, out.shape[0] - 1), mau, thickness=6)
    return out


def _luu_anh_minh_chung(image: np.ndarray, thu_muc: str, tien_to: str = "evidence") -> str:
    Path(thu_muc).mkdir(parents=True, exist_ok=True)
    ts_ms = int(time.time() * 1000)
    filename = f"{tien_to}_{ts_ms}.jpg"
    path = str(Path(thu_muc) / filename)
    cv2.imwrite(path, image)
    return path


def run(config_path: str = "config.yaml", tai_xe_id_override: str | None = None) -> None:
    cfg = load_config(config_path)

    cam_cfg = cfg["camera"]
    lm_cfg = cfg["landmark"]
    l1_cfg = cfg["layer1"]
    buzzer_cfg = cfg["buzzer"]
    l2_cfg = cfg["layer2"]
    l3_cfg = cfg["layer3"]
    policy_cfg = cfg["alert_policy"]
    uplink_cfg = cfg["uplink"]
    nguon_cfg = cfg.get("nguon_tin_hieu", {})
    coverage_cfg = cfg.get("coverage", {"khong_kha_dung_giay": 2.0})
    mat_landmark_cfg = cfg.get("mat_mat_landmark", {"toi_da_giu_chuoi_giay": 1.5, "nguong_pitch_chui_do": 20})
    frame_log_cfg = cfg.get("frame_log", {"bat": False})
    calib_cfg = cfg.get("calibration", {"thu_muc_profile": "profiles"})

    tai_xe_id = tai_xe_id_override or uplink_cfg["tai_xe_id"]
    profile = doc_profile(calib_cfg.get("thu_muc_profile", "profiles"), tai_xe_id)
    if profile is not None:
        print(f"[main] Đang dùng profile cá nhân cho tài xế '{tai_xe_id}' "
              f"(hiệu chỉnh lúc {profile.created_at_str()}).")
        cfg_hieu_dung = profile.ap_dung_vao_config(cfg)
    else:
        print(f"[main] Không có profile cho tài xế '{tai_xe_id}' — dùng ngưỡng mặc định config.yaml.")
        cfg_hieu_dung = cfg

    eye_source = tao_nguon_tin_hieu(
        cfg_hieu_dung, thu_muc_bat_dong=nguon_cfg.get("duong_dan_bat_dong_log")
    )

    layer1 = Layer1Reflex(
        nguong_nham_mat_giay_mac_dinh=l1_cfg["nguong_nham_mat_giay"],
        chop_mat_toi_da_giay=l1_cfg["chop_mat_toi_da_giay"],
        canh_bao_do_tre_ms=l1_cfg["canh_bao_do_tre_ms"],
        mat_landmark_toi_da_giay=mat_landmark_cfg.get("toi_da_giu_chuoi_giay", 1.5),
    )
    buzzer = Buzzer(
        thu_vien_uu_tien=buzzer_cfg["thu_vien_uu_tien"],
        tan_so_hz=buzzer_cfg["tan_so_hz"],
        thoi_luong_giay=buzzer_cfg["thoi_luong_giay"],
        bien_do=buzzer_cfg["bien_do"],
    )
    layer2 = Layer2Trend(l2_cfg)
    alert_policy = AlertPolicy(
        cooldown_layer1_giay=policy_cfg["cooldown_giay"]["layer1_buzzer"],
        cooldown_layer2_giay=policy_cfg["cooldown_giay"]["layer2_event"],
    )
    uplink = Uplink(
        server_url=uplink_cfg["server_url"],
        event_endpoint=uplink_cfg["event_endpoint"],
        timeout_giay=uplink_cfg["timeout_giay"],
        xe_id=uplink_cfg["xe_id"],
        tai_xe_id=tai_xe_id,
        telemetry_endpoint=uplink_cfg.get("telemetry_endpoint"),
    )
    telemetry_interval_giay = uplink_cfg.get("telemetry_interval_giay", 2)
    last_telemetry_t: float = 0.0
    context = ContextProvider(
        server_url=uplink_cfg["server_url"],
        endpoint=l3_cfg["server_endpoint"],
        file_fallback=l3_cfg["file_fallback"],
        poll_giay=l3_cfg["poll_giay"],
        muc_mac_dinh=l3_cfg["muc_mac_dinh"],
        nguong_theo_muc_nen=l3_cfg["nguong_theo_muc_nen"],
    ).start()

    coverage_tracker = CoverageTracker()
    face_loss_tracker = FaceLossTracker(
        khong_kha_dung_giay=coverage_cfg.get("khong_kha_dung_giay", 2.0),
        nguong_pitch_chui_do=mat_landmark_cfg.get("nguong_pitch_chui_do", 20),
    )

    frame_logger = None
    frame_log_sampling = max(1, frame_log_cfg.get("sampling", 5))
    if frame_log_cfg.get("bat", False):
        frame_logger = JsonlLogger(frame_log_cfg.get("duong_dan", "data/frame_log.jsonl"))
    frame_index = 0

    thu_muc_anh = l2_cfg["anh_minh_chung"]["thu_muc_luu"]
    muc_toi_thieu_chup = l2_cfg["anh_minh_chung"]["muc_toi_thieu_de_chup"]

    last_latency_ms: float | None = None
    profile_id = tai_xe_id if profile is not None else None
    session_report_cfg = cfg.get("session_report", {"thu_muc": "reports/sessions"})
    session = SessionRecorder(nguon_tin_hieu=eye_source.ten, profile_id=profile_id)

    print("[main] Khởi động edge. Nhấn 'q' trong cửa sổ preview để thoát.")

    with Camera(cam_cfg["device_index"], cam_cfg["width"], cam_cfg["height"], cam_cfg["target_fps"]) as camera, \
            LandmarkProvider(
                model_path=lm_cfg["model_path"],
                num_faces=lm_cfg["num_faces"],
                min_face_detection_confidence=lm_cfg["min_face_detection_confidence"],
                min_face_presence_confidence=lm_cfg["min_face_presence_confidence"],
                min_tracking_confidence=lm_cfg["min_tracking_confidence"],
            ) as landmark_provider:

        try:
            while True:
                frame = camera.read()
                if frame is None:
                    print("[main] Không đọc được frame từ camera, thử lại...")
                    continue

                nguong_hien_tai = context.nguong_hien_tai()
                layer1.cap_nhat_nguong(nguong_hien_tai["nham_mat_giay"])

                result = landmark_provider.process(frame)

                landmarks = result.landmarks if result is not None else None
                blendshapes = result.blendshapes if result is not None else None
                width = result.image_width if result is not None else frame.image.shape[1]
                height = result.image_height if result is not None else frame.image.shape[0]

                mar = pitch = 0.0
                if result is not None:
                    mar = mouth_aspect_ratio(result.landmarks, width, height)
                    if result.transformation_matrix is not None:
                        pitch = pitch_deg_from_matrix(
                            result.transformation_matrix, invert=l2_cfg["gat_dau"]["dao_dau_pitch"]
                        )

                danh_gia = eye_source.danh_gia(landmarks, blendshapes, width, height, frame.t_capture, frame.image)

                # --- Coverage + phát hiện mất mặt (item 3 + item 7) ---
                coverage_tracker.cap_nhat(frame.t_capture, danh_gia.kha_dung)
                if danh_gia.kha_dung:
                    face_loss_tracker.cap_nhat_kha_dung(frame.t_capture, pitch)
                else:
                    fl_event = face_loss_tracker.cap_nhat_mat_landmark(frame.t_capture)
                    if fl_event is not None:
                        if fl_event.loai == "khong_kha_dung":
                            print(f"[coverage] KHONG_KHA_DUNG — mất landmark từ t={fl_event.t_bat_dau:.2f}s "
                                  f"(KHÔNG phải cảnh báo hành vi, chỉ báo hết dữ liệu đáng tin).")
                        elif fl_event.loai == "mat_mat_sau_chui_dau":
                            print(f"[coverage] MAT_MAT_SAU_CHUI_DAU — mất landmark ngay sau khi pitch chúi "
                                  f"{fl_event.pitch_truoc_do:.1f}° — phát sự kiện mức 2.")
                            if alert_policy.cho_phep_su_kien_dac_biet("mat_mat_sau_chui_dau"):
                                anh_path = _luu_anh_minh_chung(frame.image, thu_muc_anh, tien_to="mat_mat_sau_chui_dau")
                                chi_so_dac_biet = {"pitch_truoc_khi_mat": fl_event.pitch_truoc_do}
                                session.ghi_su_kien(frame.t_capture, 2, chi_so_dac_biet, loai="mat_mat_sau_chui_dau")
                                uplink.gui_event(
                                    muc=2,
                                    chi_so=chi_so_dac_biet,
                                    anh_minh_chung_path=anh_path,
                                    loai="mat_mat_sau_chui_dau",
                                )

                # --- Lớp 1: phản xạ, offline, không phụ thuộc server. Gọi MỖI FRAME
                # (kể cả khi kha_dung=False) để bộ đếm chuỗi xử lý đúng quy tắc mất-mặt. ---
                event1 = layer1.update(danh_gia.dang_nham, danh_gia.kha_dung, frame.t_capture, ear=danh_gia.ear)
                if event1 is not None:
                    last_latency_ms = event1.latency_ms
                    session.ghi_layer1_latency(event1.latency_ms)
                    print(
                        f"[layer1] KÍCH CÒI — nhắm mắt {event1.thoi_luong_nham_mat_giay:.2f}s "
                        f"(ngưỡng {layer1.nguong_hieu_dung:.2f}s), latency={event1.latency_ms:.1f}ms, "
                        f"nguồn={danh_gia.nguon}"
                    )
                    if alert_policy.cho_phep_layer1_buzzer():
                        buzzer.sound()
                    layer2.bao_layer1_event(frame.t_capture)

                muc = 0
                perclos = ngap_phut = gat_phut = 0.0

                if danh_gia.kha_dung:
                    # --- Lớp 2: xu hướng, tích luỹ cửa sổ ---
                    snap = layer2.update(
                        dang_nham=danh_gia.dang_nham,
                        mar=mar,
                        pitch_deg=pitch,
                        t_capture=frame.t_capture,
                        perclos_canh_bao=nguong_hien_tai["perclos_canh_bao"],
                    )
                    muc, perclos, ngap_phut, gat_phut = snap.muc, snap.perclos, snap.ngap_phut, snap.gat_phut
                    session.ghi_perclos(frame.t_capture, perclos)

                    if frame.t_capture - last_telemetry_t >= telemetry_interval_giay:
                        last_telemetry_t = frame.t_capture
                        uplink.gui_telemetry(
                            muc, perclos, ngap_phut, gat_phut, danh_gia.ear, last_latency_ms,
                            kha_dung=danh_gia.kha_dung, nguon_tin_hieu=danh_gia.nguon,
                            profile=profile_id, coverage=coverage_tracker.coverage,
                        )

                    if muc >= muc_toi_thieu_chup and alert_policy.cho_phep_layer2_event(muc):
                        overlay = _ve_overlay(
                            frame.image, danh_gia, mar, pitch, perclos, ngap_phut, gat_phut, muc,
                            layer1.nguong_hieu_dung, context.muc_hien_tai, last_latency_ms,
                            coverage_tracker.coverage, profile_id,
                        )
                        anh_path = _luu_anh_minh_chung(overlay, thu_muc_anh)
                        print(f"[layer2] EVENT mức {muc} (risk={snap.risk:.2f}) — ảnh minh chứng: {anh_path}")
                        chi_so_event = {
                            "perclos": perclos,
                            "ngap_phut": ngap_phut,
                            "gat_phut": gat_phut,
                            "ear": danh_gia.ear,
                        }
                        session.ghi_su_kien(frame.t_capture, muc, chi_so_event)
                        uplink.gui_event(
                            muc=muc,
                            chi_so=chi_so_event,
                            anh_minh_chung_path=anh_path,
                        )
                else:
                    # Vẫn báo telemetry nhịp thấp khi mất mặt, để dashboard chuyển xám kịp thời.
                    if frame.t_capture - last_telemetry_t >= telemetry_interval_giay:
                        last_telemetry_t = frame.t_capture
                        uplink.gui_telemetry(
                            0, 0.0, 0.0, 0.0, None, last_latency_ms,
                            kha_dung=False, nguon_tin_hieu=danh_gia.nguon,
                            profile=profile_id, coverage=coverage_tracker.coverage,
                        )

                if frame_logger is not None:
                    frame_index += 1
                    if frame_index % frame_log_sampling == 0:
                        frame_logger.ghi({
                            "t": frame.t_capture, "nguon": danh_gia.nguon,
                            "dang_nham": danh_gia.dang_nham, "kha_dung": danh_gia.kha_dung,
                            "ear": danh_gia.ear, "blink_mean": danh_gia.blink_mean,
                            "mar": mar, "pitch": pitch, "muc": muc, "perclos": perclos,
                        })

                if cam_cfg["preview_window"]:
                    preview = _ve_overlay(
                        frame.image, danh_gia, mar, pitch, perclos, ngap_phut, gat_phut, muc,
                        layer1.nguong_hieu_dung, context.muc_hien_tai, last_latency_ms,
                        coverage_tracker.coverage, profile_id,
                    )
                    cv2.imshow("Canh bao ngu gat - Edge preview", preview)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break
        finally:
            context.stop()
            cv2.destroyAllWindows()
            print(f"[main] Đã dừng edge. Coverage phiên: {coverage_tracker.coverage*100:.1f}% "
                  f"({coverage_tracker.thoi_gian_kha_dung_giay:.1f}s / {coverage_tracker.thoi_gian_tong_giay:.1f}s)")
            thu_muc_bao_cao = xuat_bao_cao(
                session,
                thoi_gian_tong_giay=coverage_tracker.thoi_gian_tong_giay,
                thoi_gian_kha_dung_giay=coverage_tracker.thoi_gian_kha_dung_giay,
                thu_muc_goc=session_report_cfg.get("thu_muc", "reports/sessions"),
                timestamp_str=time.strftime("%Y%m%d-%H%M%S"),
            )
            print(f"[main] Đã xuất báo cáo phiên: {thu_muc_bao_cao}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config.yaml")
    parser.add_argument("--tai-xe-id", default=None,
                         help="Ghi đè uplink.tai_xe_id trong config.yaml — tiện để đổi qua lại giữa các "
                              "profile đã hiệu chỉnh (edge/calibrate.py) mà không cần sửa file config.")
    args = parser.parse_args()
    run(args.config, tai_xe_id_override=args.tai_xe_id)
