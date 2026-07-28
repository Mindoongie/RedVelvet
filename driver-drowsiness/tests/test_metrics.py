"""Unit test cho EAR/MAR/pitch với landmark tổng hợp (không cần camera/mediapipe)."""
import math

import numpy as np
import pytest

from edge.metrics import (
    LEFT_EYE_IDX,
    MOUTH_BOTTOM_IDX,
    MOUTH_LEFT_IDX,
    MOUTH_RIGHT_IDX,
    MOUTH_TOP_IDX,
    RIGHT_EYE_IDX,
    eye_aspect_ratio,
    mouth_aspect_ratio,
    pitch_deg_from_matrix,
)

N_LANDMARKS = 478
W, H = 640, 480  # dùng width != height để bắt lỗi quên scale theo pixel


def _landmarks_rong() -> np.ndarray:
    return np.zeros((N_LANDMARKS, 3), dtype=np.float64)


def _dat_mat(landmarks: np.ndarray, idx: list[int], cx: float, cy: float,
             half_w: float, half_h: float) -> None:
    """Đặt 6 điểm mắt [góc_ngoai, mi_tren_1, mi_tren_2, góc_trong, mi_duoi_1, mi_duoi_2]
    (toạ độ chuẩn hoá [0,1]) quanh tâm (cx, cy)."""
    p1, p2, p3, p4, p5, p6 = idx
    landmarks[p1] = [cx - half_w, cy, 0]
    landmarks[p4] = [cx + half_w, cy, 0]
    landmarks[p2] = [cx - half_w * 0.4, cy - half_h, 0]
    landmarks[p3] = [cx + half_w * 0.4, cy - half_h, 0]
    landmarks[p5] = [cx + half_w * 0.4, cy + half_h, 0]
    landmarks[p6] = [cx - half_w * 0.4, cy + half_h, 0]


def test_ear_mat_mo_cao_hon_nguong():
    landmarks = _landmarks_rong()
    # half_w, half_h theo đơn vị chuẩn hoá; sau khi nhân với (W,H) mới ra pixel thật
    _dat_mat(landmarks, RIGHT_EYE_IDX, cx=0.30, cy=0.40, half_w=0.03, half_h=0.012)
    _dat_mat(landmarks, LEFT_EYE_IDX, cx=0.60, cy=0.40, half_w=0.03, half_h=0.012)

    ear, ear_l, ear_r = eye_aspect_ratio(landmarks, W, H)

    assert ear > 0.21  # mắt mở phải vượt ngưỡng nhắm mắt mặc định trong config
    assert ear_l == pytest.approx(ear_r, rel=1e-6)


def test_ear_mat_nham_thap_hon_nguong():
    landmarks = _landmarks_rong()
    # half_h rất nhỏ so với half_w -> mí mắt gần như khép lại
    _dat_mat(landmarks, RIGHT_EYE_IDX, cx=0.30, cy=0.40, half_w=0.03, half_h=0.0015)
    _dat_mat(landmarks, LEFT_EYE_IDX, cx=0.60, cy=0.40, half_w=0.03, half_h=0.0015)

    ear, _, _ = eye_aspect_ratio(landmarks, W, H)

    assert ear < 0.21


def test_ear_gia_tri_dung_theo_cong_thuc():
    landmarks = _landmarks_rong()
    # Dựng toạ độ pixel tường minh để so khớp công thức EAR = (A+B)/(2C)
    p1, p2, p3, p4, p5, p6 = RIGHT_EYE_IDX
    landmarks[p1] = [0.0, 0.5, 0]
    landmarks[p4] = [0.1, 0.5, 0]     # horizontal (chuẩn hoá) = 0.1 -> pixel = 0.1*W
    landmarks[p2] = [0.03, 0.47, 0]
    landmarks[p6] = [0.03, 0.53, 0]   # vertical p2-p6 (chuẩn hoá) = 0.06 -> pixel = 0.06*H
    landmarks[p3] = [0.07, 0.47, 0]
    landmarks[p5] = [0.07, 0.53, 0]   # vertical p3-p5 giống trên

    landmarks[LEFT_EYE_IDX[0]] = landmarks[p1]  # tránh eye trái = (0,0,0) gây chia 0
    landmarks[LEFT_EYE_IDX[3]] = landmarks[p4]
    landmarks[LEFT_EYE_IDX[1]] = landmarks[p2]
    landmarks[LEFT_EYE_IDX[5]] = landmarks[p6]
    landmarks[LEFT_EYE_IDX[2]] = landmarks[p3]
    landmarks[LEFT_EYE_IDX[4]] = landmarks[p5]

    horizontal_px = 0.1 * W
    vertical_px = 0.06 * H
    expected_ear = (2 * vertical_px) / (2 * horizontal_px)

    _, _, ear_right = eye_aspect_ratio(landmarks, W, H)
    assert ear_right == pytest.approx(expected_ear, rel=1e-6)


def test_mar_mieng_mo_cao_hon_mieng_ngam():
    landmarks_ngam = _landmarks_rong()
    landmarks_ngam[MOUTH_LEFT_IDX] = [0.40, 0.75, 0]
    landmarks_ngam[MOUTH_RIGHT_IDX] = [0.60, 0.75, 0]
    landmarks_ngam[MOUTH_TOP_IDX] = [0.50, 0.745, 0]
    landmarks_ngam[MOUTH_BOTTOM_IDX] = [0.50, 0.755, 0]
    mar_ngam = mouth_aspect_ratio(landmarks_ngam, W, H)

    landmarks_mo = _landmarks_rong()
    landmarks_mo[MOUTH_LEFT_IDX] = [0.40, 0.75, 0]
    landmarks_mo[MOUTH_RIGHT_IDX] = [0.60, 0.75, 0]
    landmarks_mo[MOUTH_TOP_IDX] = [0.50, 0.65, 0]
    landmarks_mo[MOUTH_BOTTOM_IDX] = [0.50, 0.85, 0]
    mar_mo = mouth_aspect_ratio(landmarks_mo, W, H)

    assert mar_mo > mar_ngam
    assert mar_mo > 0.55  # vượt nguong_mar mặc định trong config


def _rotation_x(theta_rad: float) -> np.ndarray:
    c, s = math.cos(theta_rad), math.sin(theta_rad)
    m = np.eye(4)
    m[1, 1] = c
    m[1, 2] = -s
    m[2, 1] = s
    m[2, 2] = c
    return m


def test_pitch_tu_matrix_goc_duong():
    theta = math.radians(20.0)
    matrix = _rotation_x(theta)
    pitch = pitch_deg_from_matrix(matrix, invert=False)
    assert pitch == pytest.approx(20.0, abs=1e-4)


def test_pitch_dao_dau():
    theta = math.radians(20.0)
    matrix = _rotation_x(theta)
    pitch = pitch_deg_from_matrix(matrix, invert=True)
    assert pitch == pytest.approx(-20.0, abs=1e-4)


def test_pitch_matrix_identity_la_zero():
    pitch = pitch_deg_from_matrix(np.eye(4), invert=False)
    assert pitch == pytest.approx(0.0, abs=1e-9)
