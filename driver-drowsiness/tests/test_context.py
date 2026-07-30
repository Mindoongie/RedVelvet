"""Test bảng ngưỡng đổi theo mức nền (Lớp 3) + áp dụng runtime vào Lớp 1."""
import json

import pytest

from edge.context import ContextProvider
from edge.layer1_reflex import Layer1Reflex

NGUONG_THEO_MUC_NEN = {
    "binh_thuong": {"nham_mat_giay": 1.2, "perclos_canh_bao": 0.35},
    "cao": {"nham_mat_giay": 0.8, "perclos_canh_bao": 0.28},
}


def _tao_provider(tmp_path, muc_mac_dinh="binh_thuong"):
    return ContextProvider(
        server_url="http://127.0.0.1:1",  # cổng không ai lắng nghe -> luôn unreachable, thất bại nhanh
        endpoint="/api/context",
        file_fallback=str(tmp_path / "context_cache_edge.json"),
        poll_giay=999,  # không cho vòng lặp tự chạy trong test, ta gọi thủ công
        muc_mac_dinh=muc_mac_dinh,
        nguong_theo_muc_nen=NGUONG_THEO_MUC_NEN,
    )


def test_doc_muc_nen_tu_file_fallback_khi_server_khong_du_duoc(tmp_path):
    provider = _tao_provider(tmp_path)
    (tmp_path / "context_cache_edge.json").write_text(json.dumps({"muc": "cao"}), encoding="utf-8")

    provider._poll_once()

    assert provider.muc_hien_tai == "cao"
    assert provider.nguong_hien_tai() == NGUONG_THEO_MUC_NEN["cao"]


def test_giu_gia_tri_cuoi_khi_khong_co_nguon_nao_kha_dung(tmp_path):
    provider = _tao_provider(tmp_path, muc_mac_dinh="cao")
    # không tạo file fallback, server cũng không đọc được

    provider._poll_once()

    assert provider.muc_hien_tai == "cao"  # giữ nguyên giá trị cuối, không crash


def test_bo_qua_gia_tri_khong_hop_le_trong_file(tmp_path):
    provider = _tao_provider(tmp_path, muc_mac_dinh="binh_thuong")
    (tmp_path / "context_cache_edge.json").write_text(json.dumps({"muc": "khong_ton_tai"}), encoding="utf-8")

    provider._poll_once()

    assert provider.muc_hien_tai == "binh_thuong"


@pytest.mark.parametrize("muc,ky_vong", list(NGUONG_THEO_MUC_NEN.items()))
def test_layer1_ap_dung_nguong_theo_muc_nen_runtime(tmp_path, muc, ky_vong):
    layer1 = Layer1Reflex(
        nguong_nham_mat_giay_mac_dinh=1.2,
        chop_mat_toi_da_giay=0.5,
        canh_bao_do_tre_ms=300,
    )
    # Không cần restart process — chỉ cần gọi cap_nhat_nguong() runtime.
    layer1.cap_nhat_nguong(ky_vong["nham_mat_giay"])
    assert layer1.nguong_hieu_dung == ky_vong["nham_mat_giay"]

    # Nhắm mắt đúng bằng ngưỡng mới - epsilon: CHƯA kích còi.
    event = layer1.update(True, True, t_capture=0.0)
    assert event is None
    event = layer1.update(True, True, t_capture=ky_vong["nham_mat_giay"] - 0.05)
    assert event is None

    # Vượt ngưỡng mới: kích còi.
    event = layer1.update(True, True, t_capture=ky_vong["nham_mat_giay"] + 0.01)
    assert event is not None
