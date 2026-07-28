"""
Tiện ích camera cho rPPG.

BỐN CÁI BẪY LÀM HỎNG DEMO rPPG — đọc trước khi quay:

1. AUTO-EXPOSURE / AUTO-WHITE-BALANCE
   Biên độ tín hiệu rPPG chỉ khoảng 0.1-1% mức DC. Vòng lặp tự động phơi
   sáng của camera CHỦ ĐỘNG TRIỆT TIÊU đúng dao động độ sáng mà ta cần đo.
   Không khóa thì tín hiệu biến mất và mất nửa ngày không hiểu vì sao.

2. ĐÈN HUỲNH QUANG VÀ LED RẺ
   Điện lưới Việt Nam 50 Hz -> đèn nhấp nháy 100 Hz. Lấy mẫu ở 30 fps
   thì tần số này aliasing xuống thẳng vào dải 0.7-4 Hz và tạo một đỉnh
   giả rất thuyết phục. Quay dưới ánh sáng ban ngày hoặc đèn LED nguồn DC.

3. NÉN VIDEO
   H.264/MJPEG với chroma subsampling xóa sạch mức điều biến 0.1-1%.
   Đọc raw từ camera, đừng đọc qua luồng RTSP đã nén.

4. TIMESTAMP
   Dùng thời điểm CHỤP, không dùng thứ tự khung hình. Xem test_algorithms.py
   phần 3: sai fps 30 vs 24 khiến 78 BPM bị đọc thành 97.6 BPM, mà SQI
   vẫn báo 9.1 dB — hệ thống tự tin vào một con số sai 20 BPM.
"""

from __future__ import annotations

from typing import Optional

import cv2


def open_camera(
    index: int = 0,
    width: int = 1280,
    height: int = 720,
    fps: int = 30,
    lock_exposure: bool = True,
    exposure_value: Optional[float] = None,
) -> cv2.VideoCapture:
    """Mở camera và khóa các tham số tự động.

    Trả về VideoCapture đã cấu hình. Luôn kiểm tra .isOpened() sau khi gọi.

    Lưu ý: khả năng khóa exposure phụ thuộc driver. Trên Linux có thể cần
    dùng v4l2-ctl trực tiếp:

        v4l2-ctl -d /dev/video0 -c auto_exposure=1
        v4l2-ctl -d /dev/video0 -c exposure_time_absolute=250
        v4l2-ctl -d /dev/video0 -c white_balance_automatic=0

    Cách kiểm tra đã khóa được chưa: che nửa khung hình bằng tay rồi bỏ ra.
    Nếu độ sáng phần còn lại tự điều chỉnh theo thì auto-exposure VẪN BẬT.
    """
    cap = cv2.VideoCapture(index)
    if not cap.isOpened():
        return cap

    cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)
    cap.set(cv2.CAP_PROP_FPS, fps)

    # Giảm buffer để timestamp sát thời điểm chụp thật.
    try:
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    except Exception:
        pass

    if lock_exposure:
        # 0.25 = chế độ thủ công với backend V4L2; 0.75 = tự động.
        cap.set(cv2.CAP_PROP_AUTO_EXPOSURE, 0.25)
        if exposure_value is not None:
            cap.set(cv2.CAP_PROP_EXPOSURE, exposure_value)
        cap.set(cv2.CAP_PROP_AUTO_WB, 0)

    return cap


def describe_settings(cap: cv2.VideoCapture) -> str:
    """Chuỗi mô tả cấu hình camera — nên in ra lúc khởi động để kiểm tra."""
    props = {
        "width": cv2.CAP_PROP_FRAME_WIDTH,
        "height": cv2.CAP_PROP_FRAME_HEIGHT,
        "fps": cv2.CAP_PROP_FPS,
        "auto_exposure": cv2.CAP_PROP_AUTO_EXPOSURE,
        "exposure": cv2.CAP_PROP_EXPOSURE,
        "auto_wb": cv2.CAP_PROP_AUTO_WB,
    }
    parts = []
    for name, prop in props.items():
        try:
            parts.append(f"{name}={cap.get(prop):g}")
        except Exception:
            parts.append(f"{name}=?")
    return "  ".join(parts)
