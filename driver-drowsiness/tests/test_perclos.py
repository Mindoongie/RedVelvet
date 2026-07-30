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


def _nod_detector(**kwargs) -> NodDetector:
    tham_so = dict(nguong_pitch_do=20, hoi_phuc_toi_da_giay=4.0, cua_so_phut=3,
                   toi_thieu_giu_giay=1.0)
    tham_so.update(kwargs)
    return NodDetector(**tham_so)


def test_nod_gap_dau_nam_im_van_duoc_dem():
    """Lỗ hổng của bản cũ: đầu gục xuống rồi KHÔNG ngẩng lên -> không sự kiện nào."""
    d = _nod_detector()
    assert d.update(25, 0.0) is False    # vừa vượt ngưỡng
    assert d.update(25, 0.5) is False    # chưa đủ toi_thieu_giu_giay
    assert d.update(25, 1.0) is True     # đủ 1.0s -> đếm NGAY, đầu vẫn đang chúi
    assert len(d._events) == 1


def test_nod_giu_lau_chi_dem_mot_lan():
    d = _nod_detector()
    d.update(25, 0.0)
    assert d.update(25, 1.0) is True
    t = 1.5
    while t <= 10.0:
        assert d.update(25, t) is False  # vẫn gục, không đếm lại
        t += 0.5
    assert d.update(10, 10.5) is False   # ngẩng lên: episode đã đếm rồi
    assert len(d._events) == 1


def test_nod_mat_landmark_khong_thoi_phong_thoi_luong():
    """Gap mất mặt bị TRỪ khỏi thoi_luong, không đẩy cú gật vượt hạn hồi phục."""
    d = _nod_detector(hoi_phuc_toi_da_giay=2.0)
    assert d.update(25, 0.0) is False
    for t in (0.2, 1.0, 3.0, 4.5):
        d.bao_mat_landmark(t)            # mất landmark từ 0.2s
    # Ngẩng lên lúc 5.0s: thô là 5.0s > 2.0s, nhưng trừ gap 4.8s còn 0.2s -> vẫn tính.
    assert d.update(10, 5.0) is True
    assert len(d._events) == 1


def test_nod_tru_gap_roi_van_qua_han_thi_khong_tinh():
    d = _nod_detector(hoi_phuc_toi_da_giay=2.0)
    assert d.update(25, 0.0) is False
    d.bao_mat_landmark(3.0)              # chúi 3s CÓ landmark rồi mới mất
    assert d.update(10, 4.0) is False    # thoi_luong = 4.0 - 1.0(gap) = 3.0 > 2.0
    assert len(d._events) == 0


def test_gat_tu_mat_mat_duoc_cong_va_khong_leo_sang_episode_sau():
    d = _nod_detector()
    assert d.update(25, 0.0) is False                       # chúi đầu, chưa đủ thời lượng
    assert d.ghi_nhan_gat_tu_su_kien_ngoai(0.3) is True      # landmark rớt -> mat_mat_sau_chui_dau
    assert d.update(10, 2.0) is False                        # ngẩng lên: không cộng trùng
    assert d.update(25, 3.0) is False                        # cú gật MỚI
    assert d.update(25, 4.0) is True
    assert len(d._events) == 2


def test_gat_tu_mat_mat_khong_cong_trung_voi_duong_giu_lau():
    d = _nod_detector()
    d.update(25, 0.0)
    assert d.update(25, 1.0) is True                         # đường "giữ đủ lâu" đã đếm
    assert d.ghi_nhan_gat_tu_su_kien_ngoai(1.2) is False
    assert len(d._events) == 1
