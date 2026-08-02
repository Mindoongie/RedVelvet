"""Bọc MediaPipe FaceLandmarker (478 điểm, bật facial_transformation_matrixes)."""
from __future__ import annotations

from dataclasses import dataclass

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import (
    FaceLandmarker,
    FaceLandmarkerOptions,
    RunningMode,
)

from edge.camera import Frame


@dataclass
class LandmarkResult:
    landmarks: np.ndarray               # shape (N, 3) normalized x,y,z
    transformation_matrix: np.ndarray | None  # shape (4, 4) hoặc None nếu không có mặt
    blendshapes: dict[str, float] | None      # vd {"eyeBlinkLeft": 0.8, "jawOpen": 0.1, ...}
    image_width: int
    image_height: int
    t_capture: float


class LandmarkProvider:
    """Chạy FaceLandmarker ở RunningMode.VIDEO — đồng bộ, đơn giản, đủ nhanh cho demo CPU.

    Luôn bật output_face_blendshapes: cùng file .task đang dùng, không tải
    model mới, chi phí thêm không đáng kể — cho phép ghi log CẢ HAI nguồn tín
    hiệu (EAR + blink blendshape) mỗi frame ngay cả khi chỉ một nguồn đang
    active, phục vụ so sánh nguồn offline (eval v2).
    """

    def __init__(
        self,
        model_path: str,
        num_faces: int = 1,
        min_face_detection_confidence: float = 0.5,
        min_face_presence_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ):
        base_options = BaseOptions(model_asset_path=model_path)
        options = FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=RunningMode.VIDEO,
            num_faces=num_faces,
            min_face_detection_confidence=min_face_detection_confidence,
            min_face_presence_confidence=min_face_presence_confidence,
            min_tracking_confidence=min_tracking_confidence,
            output_facial_transformation_matrixes=True,
            output_face_blendshapes=True,
        )
        self._detector = FaceLandmarker.create_from_options(options)
        self._last_ts_ms = -1

    def _next_timestamp_ms(self, t_capture: float) -> int:
        ts_ms = int(t_capture * 1000)
        if ts_ms <= self._last_ts_ms:
            ts_ms = self._last_ts_ms + 1
        self._last_ts_ms = ts_ms
        return ts_ms

    def process(self, frame: Frame) -> LandmarkResult | None:
        rgb = cv2.cvtColor(frame.image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        ts_ms = self._next_timestamp_ms(frame.t_capture)
        result = self._detector.detect_for_video(mp_image, ts_ms)

        if not result.face_landmarks:
            return None

        h, w = frame.image.shape[:2]
        lm = result.face_landmarks[0]
        landmarks = np.array([[p.x, p.y, p.z] for p in lm], dtype=np.float64)

        matrix = None
        if result.facial_transformation_matrixes:
            matrix = np.array(result.facial_transformation_matrixes[0], dtype=np.float64)

        blendshapes = None
        if result.face_blendshapes:
            blendshapes = {c.category_name: c.score for c in result.face_blendshapes[0]}

        return LandmarkResult(
            landmarks=landmarks,
            transformation_matrix=matrix,
            blendshapes=blendshapes,
            image_width=w,
            image_height=h,
            t_capture=frame.t_capture,
        )

    def close(self) -> None:
        self._detector.close()

    def __enter__(self) -> "LandmarkProvider":
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.close()
