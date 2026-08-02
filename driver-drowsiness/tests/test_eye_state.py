"""Test EyeStateSource: EarSource, BlendshapeSource, HybridSource (đồng thuận
2 nguồn + graceful degrade khi 1 nguồn mất), OnnxEyeClassifierSource (tự vô
hiệu hoá khi thiếu model), và factory tao_nguon_tin_hieu (tương thích ngược)."""
import numpy as np
import pytest

from edge.eye_state import (
    BlendshapeSource,
    EarSource,
    HybridSource,
    OnnxEyeClassifierSource,
    tao_nguon_tin_hieu,
)
from edge.metrics import LEFT_EYE_IDX, RIGHT_EYE_IDX

N_LANDMARKS = 478
W, H = 640, 480


def _landmarks(half_h: float) -> np.ndarray:
    """half_h nhỏ = mắt nhắm, half_h lớn = mắt mở (xem test_metrics._dat_mat)."""
    lm = np.zeros((N_LANDMARKS, 3), dtype=np.float64)
    for idx, cx in ((RIGHT_EYE_IDX, 0.30), (LEFT_EYE_IDX, 0.60)):
        p1, p2, p3, p4, p5, p6 = idx
        half_w = 0.03
        lm[p1] = [cx - half_w, 0.4, 0]
        lm[p4] = [cx + half_w, 0.4, 0]
        lm[p2] = [cx - half_w * 0.4, 0.4 - half_h, 0]
        lm[p3] = [cx + half_w * 0.4, 0.4 - half_h, 0]
        lm[p5] = [cx + half_w * 0.4, 0.4 + half_h, 0]
        lm[p6] = [cx - half_w * 0.4, 0.4 + half_h, 0]
    return lm


LANDMARKS_MO = _landmarks(half_h=0.012)
LANDMARKS_NHAM = _landmarks(half_h=0.0015)


def test_ear_source_hysteresis_co_ban():
    src = EarSource(nguong_vao=0.19, nguong_ra=0.23)
    r1 = src.danh_gia(LANDMARKS_MO, None, W, H, t_capture=0.0)
    assert r1.kha_dung is True
    assert r1.dang_nham is False

    r2 = src.danh_gia(LANDMARKS_NHAM, None, W, H, t_capture=0.1)
    assert r2.dang_nham is True


def test_ear_source_khong_kha_dung_khi_mat_landmark():
    src = EarSource(nguong_vao=0.19, nguong_ra=0.23)
    r = src.danh_gia(None, None, W, H, t_capture=0.0)
    assert r.kha_dung is False


def test_blendshape_source_co_ban():
    src = BlendshapeSource(nguong_vao=0.55, nguong_ra=0.45)
    r_mo = src.danh_gia(None, {"eyeBlinkLeft": 0.05, "eyeBlinkRight": 0.05}, W, H, 0.0)
    assert r_mo.kha_dung is True
    assert r_mo.dang_nham is False

    r_nham = src.danh_gia(None, {"eyeBlinkLeft": 0.9, "eyeBlinkRight": 0.85}, W, H, 0.1)
    assert r_nham.dang_nham is True


def test_blendshape_source_khong_kha_dung_khi_thieu_blendshape():
    src = BlendshapeSource(nguong_vao=0.55, nguong_ra=0.45)
    r = src.danh_gia(None, None, W, H, 0.0)
    assert r.kha_dung is False


def test_hybrid_nham_chi_khi_ca_hai_dong_thuan():
    hybrid = HybridSource(EarSource(0.19, 0.23), BlendshapeSource(0.55, 0.45))
    blink_nham = {"eyeBlinkLeft": 0.9, "eyeBlinkRight": 0.9}
    blink_mo = {"eyeBlinkLeft": 0.05, "eyeBlinkRight": 0.05}

    # cả hai cùng báo nhắm -> hybrid nhắm
    r = hybrid.danh_gia(LANDMARKS_NHAM, blink_nham, W, H, 0.0)
    assert r.dang_nham is True
    assert r.kha_dung is True

    # chỉ EAR báo nhắm, blendshape báo mở -> hybrid ưu tiên chống báo giả -> KHÔNG nhắm
    hybrid2 = HybridSource(EarSource(0.19, 0.23), BlendshapeSource(0.55, 0.45))
    r2 = hybrid2.danh_gia(LANDMARKS_NHAM, blink_mo, W, H, 0.0)
    assert r2.dang_nham is False
    assert r2.kha_dung is True


def test_hybrid_graceful_degrade_khi_mot_nguon_mat():
    hybrid = HybridSource(EarSource(0.19, 0.23), BlendshapeSource(0.55, 0.45))
    # blendshape mất (None), EAR vẫn khả dụng và báo nhắm -> hybrid dùng EAR, vẫn khả dụng
    r = hybrid.danh_gia(LANDMARKS_NHAM, None, W, H, 0.0)
    assert r.kha_dung is True
    assert r.dang_nham is True


def test_hybrid_ghi_bat_dong_nguon(tmp_path):
    from edge.jsonl_logger import JsonlLogger

    log_path = tmp_path / "bat_dong_nguon.jsonl"
    logger = JsonlLogger(str(log_path))
    hybrid = HybridSource(EarSource(0.19, 0.23), BlendshapeSource(0.55, 0.45),
                           bat_dong_toi_thieu_giay=0.5, ghi_bat_dong=logger)
    blink_mo = {"eyeBlinkLeft": 0.05, "eyeBlinkRight": 0.05}

    # EAR báo nhắm, blendshape báo mở liên tục >= 0.5s -> phải ghi log bất đồng
    hybrid.danh_gia(LANDMARKS_NHAM, blink_mo, W, H, 0.0)
    hybrid.danh_gia(LANDMARKS_NHAM, blink_mo, W, H, 0.3)
    hybrid.danh_gia(LANDMARKS_NHAM, blink_mo, W, H, 0.6)

    assert log_path.exists()
    noi_dung = log_path.read_text(encoding="utf-8").strip()
    assert noi_dung  # có ít nhất 1 dòng
    assert "ear_dang_nham" in noi_dung


def test_onnx_source_tu_vo_hieu_hoa_khi_khong_co_model():
    src = OnnxEyeClassifierSource(duong_dan_model="models/khong_ton_tai.onnx", nguong_vao=0.5, nguong_ra=0.5)
    r = src.danh_gia(LANDMARKS_NHAM, None, W, H, 0.0, frame_image=np.zeros((H, W, 3), dtype=np.uint8))
    assert r.kha_dung is False
    assert r.dang_nham is False


def test_onnx_source_khong_config_cung_tu_vo_hieu_hoa():
    src = OnnxEyeClassifierSource(duong_dan_model=None, nguong_vao=0.5, nguong_ra=0.5)
    r = src.danh_gia(LANDMARKS_NHAM, None, W, H, 0.0)
    assert r.kha_dung is False


def test_factory_mac_dinh_tuong_thich_nguoc_v1():
    """Config KHÔNG có nguon_tin_hieu/nguong_hysteresis (v1 cũ) -> mặc định
    nguồn 'ear' với vao=ra=layer1.nguong_ear (không hysteresis)."""
    cfg_v1 = {"layer1": {"nguong_ear": 0.21}}
    src = tao_nguon_tin_hieu(cfg_v1)
    assert isinstance(src, EarSource)
    assert src._hys.nguong_vao == 0.21
    assert src._hys.nguong_ra == 0.21


def test_factory_chon_nguon_theo_config():
    cfg = {"layer1": {"nguong_ear": 0.21}, "nguon_tin_hieu": {"mat": "blendshape"},
           "nguong_hysteresis": {"blendshape_vao": 0.55, "blendshape_ra": 0.45}}
    src = tao_nguon_tin_hieu(cfg)
    assert isinstance(src, BlendshapeSource)


def test_factory_hybrid():
    cfg = {"layer1": {"nguong_ear": 0.21}, "nguon_tin_hieu": {"mat": "hybrid"}}
    src = tao_nguon_tin_hieu(cfg)
    assert isinstance(src, HybridSource)


def test_factory_nguon_khong_hop_le_bao_loi():
    cfg = {"layer1": {"nguong_ear": 0.21}, "nguon_tin_hieu": {"mat": "khong_ton_tai"}}
    with pytest.raises(ValueError):
        tao_nguon_tin_hieu(cfg)
