"""Test tính ngưỡng calibration (item 2): điểm giữa hai phân bố, độ tách,
lưu/đọc profile, và áp dụng profile vào config runtime."""
import numpy as np
import pytest

from edge.profile import NguongTinHieu, Profile, bien_do_tach, doc_profile, luu_profile, tinh_nguong


def test_tinh_nguong_ear_diem_giua_hai_phan_bo():
    # EAR mở tập trung quanh 0.30, EAR nhắm quanh 0.05 -> ngưỡng phải nằm giữa
    mo = list(np.random.RandomState(0).normal(0.30, 0.01, 200))
    nham = list(np.random.RandomState(1).normal(0.05, 0.01, 200))
    nguong = tinh_nguong(mo, nham, huong="duoi")
    assert 0.05 < nguong < 0.30


def test_tinh_nguong_blendshape_diem_giua_hai_phan_bo():
    mo = list(np.random.RandomState(0).normal(0.05, 0.02, 200))
    nham = list(np.random.RandomState(1).normal(0.90, 0.02, 200))
    nguong = tinh_nguong(mo, nham, huong="tren")
    assert 0.05 < nguong < 0.90


def test_bien_do_tach_du_lon_khi_hai_phan_bo_tach_ro():
    mo = [0.30] * 50
    nham = [0.05] * 50
    margin = bien_do_tach(mo, nham, huong="duoi")
    assert margin > 0.2  # tách rất rõ


def test_bien_do_tach_am_khi_chong_lan():
    # hai phân bố chồng lấn hoàn toàn -> margin phải âm hoặc rất nhỏ
    rng = np.random.RandomState(42)
    mo = list(rng.normal(0.20, 0.05, 200))
    nham = list(rng.normal(0.20, 0.05, 200))
    margin = bien_do_tach(mo, nham, huong="duoi")
    assert margin < 0.02


def test_luu_va_doc_profile_round_trip(tmp_path):
    profile = Profile(
        tai_xe_id="tai_xe_A",
        created_at=1700000000.0,
        so_mau_mo=100,
        so_mau_nham=50,
        ear=NguongTinHieu(trung_tam=0.21, vao=0.19, ra=0.23),
        blendshape=NguongTinHieu(trung_tam=0.5, vao=0.55, ra=0.45),
    )
    luu_profile(str(tmp_path), profile)

    loaded = doc_profile(str(tmp_path), "tai_xe_A")
    assert loaded is not None
    assert loaded.tai_xe_id == "tai_xe_A"
    assert loaded.ear.vao == pytest.approx(0.19)
    assert loaded.blendshape.ra == pytest.approx(0.45)


def test_doc_profile_khong_ton_tai_tra_ve_none(tmp_path):
    assert doc_profile(str(tmp_path), "khong_ai_ca") is None


def test_hai_tai_xe_khac_nhau_co_profile_khac_nhau(tmp_path):
    p1 = Profile("tai_xe_1", 1700000000.0, 100, 50, ear=NguongTinHieu(0.22, 0.20, 0.24))
    p2 = Profile("tai_xe_2", 1700000000.0, 100, 50, ear=NguongTinHieu(0.18, 0.16, 0.20))
    luu_profile(str(tmp_path), p1)
    luu_profile(str(tmp_path), p2)

    loaded1 = doc_profile(str(tmp_path), "tai_xe_1")
    loaded2 = doc_profile(str(tmp_path), "tai_xe_2")
    assert loaded1.ear.trung_tam != loaded2.ear.trung_tam


def test_ap_dung_vao_config_ghi_de_hysteresis():
    profile = Profile(
        tai_xe_id="x", created_at=0, so_mau_mo=1, so_mau_nham=1,
        ear=NguongTinHieu(trung_tam=0.21, vao=0.19, ra=0.23),
    )
    cfg = {"nguong_hysteresis": {"ear_vao": 0.10, "ear_ra": 0.30, "blendshape_vao": 0.55, "blendshape_ra": 0.45}}
    cfg_moi = profile.ap_dung_vao_config(cfg)
    assert cfg_moi["nguong_hysteresis"]["ear_vao"] == 0.19
    assert cfg_moi["nguong_hysteresis"]["ear_ra"] == 0.23
    # blendshape chưa hiệu chỉnh (profile.blendshape=None) -> giữ nguyên giá trị config gốc
    assert cfg_moi["nguong_hysteresis"]["blendshape_vao"] == 0.55
    # config gốc KHÔNG bị sửa (trả về bản sao)
    assert cfg["nguong_hysteresis"]["ear_vao"] == 0.10
