"""
Demo runner cho nhánh rPPG — dùng để quay video dự thi.

Chạy:
    python demo.py                    # webcam mặc định
    python demo.py --camera 1
    python demo.py --video test.mp4   # chạy lại trên file đã quay
    python demo.py --record demo.mp4  # ghi lại màn hình demo

Phím:
    q / ESC   thoát
    r         xóa buffer, đo lại từ đầu
    m         bật/tắt cổng chuyển động (để minh họa hậu quả khi tắt)
    s         chụp ảnh màn hình

BA KHOẢNH KHẮC CẦN QUAY:

  1. ĐỘ TIN CẬY  — ngồi yên, để máy đo SpO2 kẹp ngón tay trong khung hình.
                   Hai số khớp nhau. Không cần nói gì thêm.

  2. BÀI TEST LẮC — rung ghế hoặc lắc camera. Hệ thống trả KHÔNG ĐO ĐƯỢC
                   thay vì bịa ra một con số. Đây là điểm ăn giải.

  3. PHỔ TẦN SỐ  — panel bên phải. Lúc ngồi yên là một đỉnh sạch, lúc lắc
                   là một mớ lộn xộn. Biến lập luận trung thực từ chỗ NÓI RA
                   thành chỗ NHÌN THẤY ĐƯỢC.

  (tùy chọn) BÀI TEST VẬN ĐỘNG — nhảy tại chỗ 20 cái rồi ngồi đo. BPM cao
             rồi giảm dần. Trả lời trước câu hỏi hoài nghi tiêu chuẩn:
             "làm sao biết thuật toán không phải lúc nào cũng trả về 72?"
"""

from __future__ import annotations

import argparse
import time

import cv2
import numpy as np

from rppg import PulseMonitor, RPPGConfig
from rppg.camera import describe_settings, open_camera
from rppg.console import setup_console
from rppg.monitor import (
    STATUS_CALIBRATING,
    STATUS_NO_FACE,
    STATUS_OK,
    STATUS_UNAVAILABLE,
)

# Console Windows mặc định là cp1252 — không in được tiếng Việt có dấu.
setup_console()

# Bảng màu (BGR)
GREEN = (120, 220, 120)
AMBER = (80, 190, 240)
RED = (90, 90, 235)
GREY = (150, 150, 150)
WHITE = (245, 245, 245)
DARK = (32, 30, 28)

PANEL_W = 400
FONT = cv2.FONT_HERSHEY_SIMPLEX

STATUS_TEXT = {
    STATUS_OK: ("DANG DO", GREEN),
    STATUS_CALIBRATING: ("DANG HIEU CHUAN", AMBER),
    STATUS_UNAVAILABLE: ("KHONG DO DUOC", RED),
    STATUS_NO_FACE: ("KHONG THAY MAT", GREY),
    "moving": ("XE DANG CHAY", GREY),
}


def draw_spectrum(panel, spectrum, cfg, y0, height):
    """Vẽ phổ công suất — đây là tài sản demo quan trọng nhất."""
    x0, x1 = 20, PANEL_W - 20
    y1 = y0 + height

    cv2.rectangle(panel, (x0, y0), (x1, y1), (55, 52, 48), -1)

    if spectrum is None or spectrum.freqs_hz.size == 0:
        cv2.putText(panel, "cho du lieu...", (x0 + 12, y0 + height // 2),
                    FONT, 0.45, GREY, 1, cv2.LINE_AA)
        return

    band = ((spectrum.freqs_hz >= cfg.hr_min_hz) &
            (spectrum.freqs_hz <= cfg.hr_max_hz))
    freqs = spectrum.freqs_hz[band]
    power = spectrum.power[band]
    if freqs.size < 2:
        return

    # Lưới mốc BPM
    for bpm_tick in (60, 90, 120, 180):
        hz = bpm_tick / 60.0
        if not (cfg.hr_min_hz <= hz <= cfg.hr_max_hz):
            continue
        gx = int(x0 + (hz - cfg.hr_min_hz) /
                 (cfg.hr_max_hz - cfg.hr_min_hz) * (x1 - x0))
        cv2.line(panel, (gx, y0), (gx, y1), (70, 66, 62), 1)
        cv2.putText(panel, str(bpm_tick), (gx - 10, y1 + 14),
                    FONT, 0.34, GREY, 1, cv2.LINE_AA)

    # Đường phổ
    xs = np.linspace(x0, x1, freqs.size).astype(np.int32)
    ys = (y1 - power * (height - 6)).astype(np.int32)
    pts = np.stack([xs, ys], axis=1)

    good = spectrum.sqi_db >= cfg.sqi_threshold_db
    colour = GREEN if good else RED

    fill = np.vstack([[[x0, y1]], pts, [[x1, y1]]])
    overlay = panel.copy()
    cv2.fillPoly(overlay, [fill], (colour[0] // 4, colour[1] // 4, colour[2] // 4))
    cv2.addWeighted(overlay, 0.6, panel, 0.4, 0, panel)
    cv2.polylines(panel, [pts], False, colour, 2, cv2.LINE_AA)

    # Đánh dấu đỉnh
    if spectrum.peak_hz is not None:
        px = int(x0 + (spectrum.peak_hz - cfg.hr_min_hz) /
                 (cfg.hr_max_hz - cfg.hr_min_hz) * (x1 - x0))
        cv2.line(panel, (px, y0), (px, y1), colour, 1, cv2.LINE_AA)
        cv2.circle(panel, (px, int(ys[np.argmin(np.abs(xs - px))])), 4,
                   colour, -1, cv2.LINE_AA)

    cv2.putText(panel, "PHO TAN SO (BPM)", (x0, y0 - 8),
                FONT, 0.42, WHITE, 1, cv2.LINE_AA)


def draw_panel(result, cfg, height, motion_gate_on):
    """Dựng panel thông tin bên phải."""
    panel = np.full((height, PANEL_W, 3), DARK, dtype=np.uint8)

    cv2.putText(panel, "rPPG - NHIP TIM TU XA", (20, 34),
                FONT, 0.6, WHITE, 1, cv2.LINE_AA)
    cv2.line(panel, (20, 46), (PANEL_W - 20, 46), (70, 66, 62), 1)

    label, colour = STATUS_TEXT.get(result.status, (result.status.upper(), GREY))
    cv2.putText(panel, label, (20, 78), FONT, 0.62, colour, 2, cv2.LINE_AA)

    # Số BPM lớn — hoặc dấu gạch khi không đo được.
    if result.status == STATUS_OK and result.bpm is not None:
        cv2.putText(panel, f"{result.bpm:.0f}", (20, 168),
                    FONT, 2.6, GREEN, 4, cv2.LINE_AA)
        cv2.putText(panel, "BPM", (185, 168), FONT, 0.7, GREEN, 2, cv2.LINE_AA)
    else:
        cv2.putText(panel, "--", (20, 168), FONT, 2.6, GREY, 4, cv2.LINE_AA)

    y = 205

    if result.status == STATUS_CALIBRATING:
        bar_w = int((PANEL_W - 40) * result.progress)
        cv2.rectangle(panel, (20, y), (PANEL_W - 20, y + 12), (60, 57, 53), -1)
        cv2.rectangle(panel, (20, y), (20 + bar_w, y + 12), AMBER, -1)
        y += 34

    # Chỉ số kỹ thuật
    rows = [
        ("SQI", f"{result.sqi_db:.1f} dB" if result.sqi_db is not None else "--",
         GREEN if (result.sqi_db or -99) >= cfg.sqi_threshold_db else RED),
        ("nguong SQI", f"{cfg.sqi_threshold_db:.1f} dB", GREY),
        ("chuyen dong", f"{result.motion:.4f}" if result.motion is not None else "--",
         GREEN if (result.motion or 0) <= cfg.motion_threshold else RED),
        ("nguong c.dong", f"{cfg.motion_threshold:.3f}", GREY),
        ("buffer", f"{result.buffer_sec:.1f}s / {cfg.window_sec:.0f}s", GREY),
    ]
    for name, value, col in rows:
        cv2.putText(panel, name, (20, y), FONT, 0.44, GREY, 1, cv2.LINE_AA)
        cv2.putText(panel, value, (175, y), FONT, 0.44, col, 1, cv2.LINE_AA)
        y += 24

    if result.reason:
        y += 6
        for i, chunk in enumerate(_wrap(result.reason, 42)[:2]):
            cv2.putText(panel, chunk, (20, y + i * 17),
                        FONT, 0.40, AMBER, 1, cv2.LINE_AA)
        y += 40

    # Chừa chỗ cho dòng phím tắt và hàng nhãn mốc BPM nằm dưới đồ thị.
    # Không chừa thì với khung hình thấp (camera 480p, hoặc file video đầu
    # vào nhỏ) đồ thị sẽ đè lên chân panel và nhãn mốc bị cắt mất.
    FOOTER_H, TICK_H = 30, 20
    spec_bottom = height - FOOTER_H - TICK_H
    spec_h = 110
    spec_y0 = max(y + 18, min(360, spec_bottom - spec_h))
    if spec_y0 + spec_h > spec_bottom:
        spec_h = max(50, spec_bottom - spec_y0)
    draw_spectrum(panel, result.spectrum, cfg, spec_y0, spec_h)

    foot = "m: cong c.dong " + ("BAT" if motion_gate_on else "TAT") + "   r: reset   q: thoat"
    cv2.putText(panel, foot, (20, height - 16), FONT, 0.38, GREY, 1, cv2.LINE_AA)
    return panel


def _wrap(text, width):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 <= width:
            cur = f"{cur} {w}".strip()
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--video", type=str, default=None,
                    help="chạy lại trên file video thay vì webcam")
    ap.add_argument("--record", type=str, default=None,
                    help="ghi màn hình demo ra file mp4")
    ap.add_argument("--window", type=float, default=20.0,
                    help="cửa sổ phân tích, giây (20-30 khuyến nghị)")
    ap.add_argument("--sqi", type=float, default=3.0, help="ngưỡng SQI, dB")
    ap.add_argument("--no-lock", action="store_true",
                    help="KHÔNG khóa exposure (chỉ để minh họa hậu quả)")
    args = ap.parse_args()

    cfg = RPPGConfig(window_sec=args.window, sqi_threshold_db=args.sqi)

    if args.video:
        cap = cv2.VideoCapture(args.video)
        source_fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    else:
        cap = open_camera(args.camera, lock_exposure=not args.no_lock)
        source_fps = None

    if not cap.isOpened():
        raise SystemExit("Không mở được nguồn video")

    print("Camera:", describe_settings(cap))
    if args.no_lock:
        print("CẢNH BÁO: auto-exposure đang BẬT — tín hiệu rPPG sẽ bị triệt tiêu")

    monitor = PulseMonitor(config=cfg)
    print("Backend phát hiện khuôn mặt:", monitor.backend)
    if monitor.backend == "haar_cascade":
        print("  (đang dùng fallback Haar — cài mediapipe để ROI chính xác hơn)")

    writer = None
    frame_index = 0
    t_start = time.time()

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break

            # Với file video, dựng timestamp từ chỉ số khung và fps của file.
            # Với webcam, dùng đồng hồ thật ngay lúc đọc được khung hình.
            if source_fps:
                ts = t_start + frame_index / source_fps
            else:
                ts = time.time()
            frame_index += 1

            result = monitor.process_frame("driver", frame, timestamp=ts)

            if result.status in (STATUS_OK, STATUS_UNAVAILABLE,
                                 STATUS_CALIBRATING):
                col = GREEN if result.status == STATUS_OK else AMBER
                cv2.putText(frame, "ROI: vung tran", (14, 26),
                            FONT, 0.5, col, 1, cv2.LINE_AA)

            h = frame.shape[0]
            panel = draw_panel(result, cfg, h, cfg.motion_gate_enabled)
            canvas = np.hstack([frame, panel])

            if args.record and writer is None:
                fourcc = cv2.VideoWriter_fourcc(*"mp4v")
                writer = cv2.VideoWriter(args.record, fourcc, 25.0,
                                         (canvas.shape[1], canvas.shape[0]))
            if writer is not None:
                writer.write(canvas)

            cv2.imshow("rPPG demo", canvas)
            key = cv2.waitKey(1) & 0xFF
            if key in (ord("q"), 27):
                break
            if key == ord("r"):
                monitor.reset()
            if key == ord("m"):
                cfg.motion_gate_enabled = not cfg.motion_gate_enabled
            if key == ord("s"):
                name = f"shot_{int(time.time())}.png"
                cv2.imwrite(name, canvas)
                print("đã lưu", name)
    finally:
        cap.release()
        if writer is not None:
            writer.release()
        monitor.close()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
