"""Test PERCLOS với chuỗi (timestamp, trạng thái mắt) dựng sẵn — kể cả fps không đều.

Đúng theo ràng buộc: PERCLOS tính bằng hiệu timestamp, không đếm frame — nghĩa
là lấy mẫu dày hay thưa trong cùng khoảng thời gian phải cho cùng kết quả.
"""
from edge.layer2_trend import NodDetector, PerclosAccumulator, YawnDetector


def test_perclos_nua_cua_so_nham_mat():
    acc = PerclosAccumulator(cua_so_giay=60)
    acc.update(True, 0.0)
    perclos = acc.update(True, 10.0)  # vẫn đang nhắm, elapsed=10, closed=10 -> 1.0
    assert perclos == 1.0

    perclos = acc.update(False, 10.0)  # mở mắt tại t=10 -> đóng interval [0,10]
    assert perclos == 1.0  # elapsed vẫn ~10 (closed 10/10)

    perclos = acc.update(False, 20.0)  # elapsed=20, closed=10 -> 0.5
    assert abs(perclos - 0.5) < 1e-9


def test_perclos_khong_phu_thuoc_mat_do_lay_mau():
    """Lấy mẫu dày (nhiều điểm/giây) và lấy mẫu thưa trên CÙNG kịch bản thời gian
    (nhắm 0-10s, mở 10-25s) phải cho ra PERCLOS giống nhau — chứng minh không
    đếm frame mà chỉ dùng hiệu timestamp."""

    def chay_kich_ban(mau_moi_giay_khi_nham: float, mau_moi_giay_khi_mo: float) -> float:
        acc = PerclosAccumulator(cua_so_giay=60)
        t = 0.0
        dt_nham = 1.0 / mau_moi_giay_khi_nham
        while t < 10.0:
            acc.update(True, t)
            t += dt_nham
        t = 10.0
        dt_mo = 1.0 / mau_moi_giay_khi_mo
        last = 0.0
        while t < 25.0:
            last = acc.update(False, t)
            t += dt_mo
        return last if last else acc.update(False, 25.0)

    perclos_day = chay_kich_ban(mau_moi_giay_khi_nham=30, mau_moi_giay_khi_mo=30)  # 30 fps
    perclos_thua = chay_kich_ban(mau_moi_giay_khi_nham=3, mau_moi_giay_khi_mo=7)   # fps thấp & không đều

    assert abs(perclos_day - perclos_thua) < 0.02


def test_perclos_luon_trong_khoang_0_1():
    acc = PerclosAccumulator(cua_so_giay=5)
    t = 0.0
    for i in range(200):
        mat_nham = (i % 3 == 0)
        perclos = acc.update(mat_nham, t)
        assert 0.0 <= perclos <= 1.0
        t += 0.05


def test_yawn_debounce_khong_dem_hai_lan_lien_tiep():
    d = YawnDetector(nguong_mar=0.55, nguong_ngap_giay=1.5, debounce_giay=3.0, cua_so_phut=3)
    t = 0.0
    # mở miệng liên tục 2s -> 1 sự kiện tại t=1.5
    su_kien = False
    while t <= 2.0:
        su_kien = d.update(0.7, t) or su_kien
        t += 0.1
    assert su_kien
    assert len(d._events) == 1

    # ngậm miệng lại rồi mở lại ngay (trong vòng debounce) -> KHÔNG tính thêm
    d.update(0.3, t)
    t += 0.1
    while t <= 3.5:
        d.update(0.7, t)
        t += 0.1
    assert len(d._events) == 1


def test_nod_hoi_phuc_trong_han_duoc_tinh():
    d = NodDetector(nguong_pitch_do=20, hoi_phuc_toi_da_giay=2.0, cua_so_phut=3)
    assert d.update(25, 0.0) is False   # vượt ngưỡng, bắt đầu tính
    assert d.update(10, 1.0) is True    # hồi phục trong 1s <= 2s -> tính 1 sự kiện
    assert len(d._events) == 1


def test_nod_hoi_phuc_qua_han_khong_tinh():
    d = NodDetector(nguong_pitch_do=20, hoi_phuc_toi_da_giay=2.0, cua_so_phut=3)
    assert d.update(25, 0.0) is False
    assert d.update(10, 5.0) is False   # hồi phục sau 5s > 2s -> KHÔNG tính
    assert len(d._events) == 0
