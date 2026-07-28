"""Capture webcam, gắn timestamp NGAY LÚC CHỤP.

Mọi phép đo thời lượng trong hệ thống dùng hiệu timestamp của frame này,
tuyệt đối không đếm số frame (frame rate của webcam không ổn định).
"""
from __future__ import annotations

import time
from dataclasses import dataclass

import cv2
import numpy as np


@dataclass
class Frame:
    image: np.ndarray      # BGR, như OpenCV trả về
    t_capture: float        # time.monotonic() gắn ngay lúc đọc frame thành công


class Camera:
    def __init__(self, device_index: int = 0, width: int = 640, height: int = 480,
                 target_fps: int = 15):
        self.device_index = device_index
        self.width = width
        self.height = height
        self.target_fps = target_fps
        self._cap: cv2.VideoCapture | None = None

    def open(self) -> "Camera":
        self._cap = cv2.VideoCapture(self.device_index)
        if not self._cap.isOpened():
            raise RuntimeError(
                f"Không mở được camera index={self.device_index}. "
                "Kiểm tra webcam đã cắm/không bị app khác chiếm dụng."
            )
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        self._cap.set(cv2.CAP_PROP_FPS, self.target_fps)
        return self

    def read(self) -> Frame | None:
        """Đọc một frame. Trả None nếu đọc thất bại (không raise, để vòng lặp chính tự quyết định retry)."""
        if self._cap is None:
            raise RuntimeError("Camera chưa được open()")
        ok, image = self._cap.read()
        t_capture = time.monotonic()
        if not ok or image is None:
            return None
        return Frame(image=image, t_capture=t_capture)

    def release(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    def __enter__(self) -> "Camera":
        return self.open()

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.release()
