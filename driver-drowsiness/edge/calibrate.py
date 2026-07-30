"""Calibration theo từng tài xế (item 2).

    python -m edge.calibrate --tai-xe-id <id>

Quy trình 15-20s có hướng dẫn trên preview:
  - N giây nhìn thẳng, mắt mở bình thường -> thu phân bố EAR_mo, blink_mo
  - M giây nhắm mắt chủ động             -> thu phân bố EAR_nham, blink_nham
Ngưỡng cá nhân = điểm giữa hai phân bố (edge/profile.py: tinh_nguong). Từ
chối lưu nếu hai phân bố chồng lấn quá mức (không tách được mở/nhắm).
"""
from __future__ import annotations

import argparse
import time

import cv2
import numpy as np

from edge.camera import Camera
from edge.config import load_config
from edge.landmark_provider import LandmarkProvider
from edge.metrics import eye_aspect_ratio
from edge.profile import NguongTinHieu, Profile, bien_do_tach, luu_profile, tinh_nguong


def _ve_huong_dan(image: np.ndarray, tieu_de: str, giay_con_lai: float) -> np.ndarray:
    out = image.copy()
    h, w = out.shape[:2]
    cv2.rectangle(out, (0, 0), (w, 70), (0, 0, 0), thickness=-1)
    cv2.putText(out, tieu_de, (12, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
    cv2.putText(out, f"Con lai: {giay_con_lai:0.1f}s", (12, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                (0, 220, 255), 1, cv2.LINE_AA)
    return out


def _thu_thap_giai_doan(
    camera: Camera,
    landmark_provider: LandmarkProvider,
    tieu_de: str,
    thoi_gian_giay: float,
    hien_preview: bool,
) -> tuple[list[float], list[float]]:
    """Trả về (danh_sach_ear, danh_sach_blink_mean) thu được trong giai đoạn này."""
    ear_values: list[float] = []
    blink_values: list[float] = []
    t_bat_dau = None

    while True:
        frame = camera.read()
        if frame is None:
            continue
        if t_bat_dau is None:
            t_bat_dau = frame.t_capture

        da_troi_qua = frame.t_capture - t_bat_dau
        con_lai = thoi_gian_giay - da_troi_qua
        if con_lai <= 0:
            break

        result = landmark_provider.process(frame)
        if result is not None:
            ear, _, _ = eye_aspect_ratio(result.landmarks, result.image_width, result.image_height)
            ear_values.append(ear)
            if result.blendshapes:
                blink = (result.blendshapes.get("eyeBlinkLeft", 0.0)
                         + result.blendshapes.get("eyeBlinkRight", 0.0)) / 2.0
                blink_values.append(blink)

        if hien_preview:
            preview = _ve_huong_dan(frame.image, tieu_de, con_lai)
            cv2.imshow("Calibration - Canh bao ngu gat", preview)
            cv2.waitKey(1)

    return ear_values, blink_values


def chay_calibration(
    tai_xe_id: str,
    config_path: str = "config.yaml",
    hien_preview: bool = True,
) -> Profile | None:
    cfg = load_config(config_path)
    cam_cfg = cfg["camera"]
    lm_cfg = cfg["landmark"]
    calib_cfg = cfg.get("calibration", {})

    thoi_gian_mo = calib_cfg.get("thoi_gian_mo_giay", 10)
    thoi_gian_nham = calib_cfg.get("thoi_gian_nham_giay", 5)
    bien_do_toi_thieu_ear = calib_cfg.get("bien_do_toi_thieu_ear", 0.02)
    bien_do_toi_thieu_bs = calib_cfg.get("bien_do_toi_thieu_blendshape", 0.05)
    do_rong_ear = calib_cfg.get("do_rong_bang_ear", 0.02)
    do_rong_bs = calib_cfg.get("do_rong_bang_blendshape", 0.05)
    thu_muc_profile = calib_cfg.get("thu_muc_profile", "profiles")

    print(f"[calibrate] Bắt đầu hiệu chỉnh cho tài xế '{tai_xe_id}'.")
    print(f"[calibrate] Giai đoạn 1: nhìn thẳng, mắt mở bình thường trong {thoi_gian_mo}s...")

    with Camera(cam_cfg["device_index"], cam_cfg["width"], cam_cfg["height"], cam_cfg["target_fps"]) as camera, \
            LandmarkProvider(
                model_path=lm_cfg["model_path"],
                num_faces=lm_cfg["num_faces"],
                min_face_detection_confidence=lm_cfg["min_face_detection_confidence"],
                min_face_presence_confidence=lm_cfg["min_face_presence_confidence"],
                min_tracking_confidence=lm_cfg["min_tracking_confidence"],
            ) as landmark_provider:

        ear_mo, blink_mo = _thu_thap_giai_doan(
            camera, landmark_provider, "Nhin thang, mat mo binh thuong", thoi_gian_mo, hien_preview
        )

        print(f"[calibrate] Giai đoạn 2: nhắm mắt chủ động trong {thoi_gian_nham}s...")
        ear_nham, blink_nham = _thu_thap_giai_doan(
            camera, landmark_provider, "NHAM MAT chu dong", thoi_gian_nham, hien_preview
        )

    if hien_preview:
        cv2.destroyAllWindows()

    if len(ear_mo) < 5 or len(ear_nham) < 5:
        print(f"[calibrate] Không đủ mẫu landmark hợp lệ (mở={len(ear_mo)}, nhắm={len(ear_nham)}) "
              f"— có thể mất mặt trong lúc hiệu chỉnh. HỦY, không lưu profile. Hãy thử lại.")
        return None

    ear_margin = bien_do_tach(ear_mo, ear_nham, huong="duoi")
    print(f"[calibrate] Độ tách EAR: {ear_margin:.4f} (tối thiểu yêu cầu {bien_do_toi_thieu_ear:.4f})")
    if ear_margin < bien_do_toi_thieu_ear:
        print("[calibrate] TỪ CHỐI LƯU PROFILE: phân bố EAR mở/nhắm chồng lấn quá mức — "
              "không tách được mở/nhắm một cách đáng tin. Hãy hiệu chỉnh lại (nhắm mắt dứt khoát hơn).")
        return None

    ear_center = tinh_nguong(ear_mo, ear_nham, huong="duoi")
    ear_nguong = NguongTinHieu(trung_tam=ear_center, vao=ear_center - do_rong_ear, ra=ear_center + do_rong_ear)

    blendshape_nguong = None
    if len(blink_mo) >= 5 and len(blink_nham) >= 5:
        bs_margin = bien_do_tach(blink_mo, blink_nham, huong="tren")
        print(f"[calibrate] Độ tách blendshape: {bs_margin:.4f} (tối thiểu yêu cầu {bien_do_toi_thieu_bs:.4f})")
        if bs_margin < bien_do_toi_thieu_bs:
            print("[calibrate] TỪ CHỐI LƯU PROFILE: phân bố blendshape mở/nhắm chồng lấn quá mức. "
                  "Hãy hiệu chỉnh lại.")
            return None
        bs_center = tinh_nguong(blink_mo, blink_nham, huong="tren")
        blendshape_nguong = NguongTinHieu(trung_tam=bs_center, vao=bs_center + do_rong_bs, ra=bs_center - do_rong_bs)
    else:
        print("[calibrate] CẢNH BÁO: không đủ mẫu blendshape (model có thể không xuất eyeBlinkLeft/Right) "
              "— profile chỉ chứa ngưỡng EAR.")

    profile = Profile(
        tai_xe_id=tai_xe_id,
        created_at=time.time(),
        so_mau_mo=len(ear_mo),
        so_mau_nham=len(ear_nham),
        ear=ear_nguong,
        blendshape=blendshape_nguong,
    )
    path = luu_profile(thu_muc_profile, profile)
    print(f"[calibrate] Đã lưu profile: {path}")
    print(f"[calibrate]   EAR: trung_tam={ear_nguong.trung_tam:.3f} vao={ear_nguong.vao:.3f} ra={ear_nguong.ra:.3f}")
    if blendshape_nguong is not None:
        print(f"[calibrate]   Blendshape: trung_tam={blendshape_nguong.trung_tam:.3f} "
              f"vao={blendshape_nguong.vao:.3f} ra={blendshape_nguong.ra:.3f}")
    return profile


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hiệu chỉnh ngưỡng mắt cá nhân theo tài xế")
    parser.add_argument("--tai-xe-id", required=True)
    parser.add_argument("--config", default="config.yaml")
    parser.add_argument("--no-preview", action="store_true", help="Không mở cửa sổ preview (headless)")
    args = parser.parse_args()
    chay_calibration(args.tai_xe_id, args.config, hien_preview=not args.no_preview)
