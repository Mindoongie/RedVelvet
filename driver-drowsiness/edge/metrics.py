"""EAR, MAR, pitch — port ý tưởng từ Inferensys/ai-driver-safety metrics.py,
cài lại trên landmark index của MediaPipe FaceLandmarker (478 điểm).
"""
from __future__ import annotations

import math

import numpy as np

# Landmark index theo mesh 468/478 điểm của MediaPipe FaceMesh/FaceLandmarker.
# Thứ tự mỗi mắt: [góc_ngoai, mi_tren_1, mi_tren_2, góc_trong, mi_duoi_1, mi_duoi_2]
LEFT_EYE_IDX = [362, 385, 387, 263, 373, 380]
RIGHT_EYE_IDX = [33, 160, 158, 133, 153, 144]

# Miệng: điểm trong môi trên/dưới (dọc) và khoé miệng trái/phải (ngang)
MOUTH_TOP_IDX = 13
MOUTH_BOTTOM_IDX = 14
MOUTH_LEFT_IDX = 78
MOUTH_RIGHT_IDX = 308


def _dist(p1: np.ndarray, p2: np.ndarray) -> float:
    return float(np.linalg.norm(p1 - p2))


def _to_pixel(landmarks: np.ndarray, width: int, height: int) -> np.ndarray:
    """landmarks: (N, 3) normalized [0,1] -> pixel toạ độ (N, 2)."""
    px = landmarks[:, :2].copy()
    px[:, 0] *= width
    px[:, 1] *= height
    return px


def _single_eye_ear(px: np.ndarray, idx: list[int]) -> float:
    p1, p2, p3, p4, p5, p6 = (px[i] for i in idx)
    vertical = _dist(p2, p6) + _dist(p3, p5)
    horizontal = 2.0 * _dist(p1, p4)
    if horizontal <= 1e-9:
        return 0.0
    return vertical / horizontal


def eye_aspect_ratio(landmarks: np.ndarray, width: int, height: int) -> tuple[float, float, float]:
    """Trả về (ear_trung_binh, ear_trai, ear_phai)."""
    px = _to_pixel(landmarks, width, height)
    left = _single_eye_ear(px, LEFT_EYE_IDX)
    right = _single_eye_ear(px, RIGHT_EYE_IDX)
    return (left + right) / 2.0, left, right


def mouth_aspect_ratio(landmarks: np.ndarray, width: int, height: int) -> float:
    px = _to_pixel(landmarks, width, height)
    vertical = _dist(px[MOUTH_TOP_IDX], px[MOUTH_BOTTOM_IDX])
    horizontal = _dist(px[MOUTH_LEFT_IDX], px[MOUTH_RIGHT_IDX])
    if horizontal <= 1e-9:
        return 0.0
    return vertical / horizontal


def pitch_deg_from_matrix(matrix: np.ndarray, invert: bool = False) -> float:
    """Trích góc pitch (độ) từ facial_transformation_matrix 4x4.

    Dùng phân rã Euler XYZ chuẩn trên khối rotation 3x3. Dấu dương/âm phụ
    thuộc quy ước trục của thiết bị — dùng cờ `invert` (config: dao_dau_pitch)
    để hiệu chỉnh nếu góc đo ra ngược chiều thực tế khi test trên camera.
    """
    r = matrix[:3, :3]
    sy = math.sqrt(r[0, 0] ** 2 + r[1, 0] ** 2)
    singular = sy < 1e-6
    if not singular:
        pitch_rad = math.atan2(r[2, 1], r[2, 2])
    else:
        pitch_rad = math.atan2(-r[1, 2], r[1, 1])
    pitch_deg = math.degrees(pitch_rad)
    return -pitch_deg if invert else pitch_deg
