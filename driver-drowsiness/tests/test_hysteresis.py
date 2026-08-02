"""Test bộ hysteresis (chống rung quanh 1 ngưỡng) dùng cho EAR/blendshape/ONNX."""
from edge.hysteresis import HysteresisBoolState


def test_huong_duoi_ear_vao_ra_dung_vung_chet():
    hys = HysteresisBoolState(nguong_vao=0.19, nguong_ra=0.23, huong="duoi")
    assert hys.cap_nhat(0.30) is False   # mở mắt bình thường
    assert hys.cap_nhat(0.20) is False   # trong vùng chết (0.19-0.23), CHƯA vào nhắm
    assert hys.cap_nhat(0.18) is True    # tụt dưới 0.19 -> vào nhắm
    assert hys.cap_nhat(0.20) is True    # vẫn trong vùng chết nhưng ĐANG nhắm -> giữ nguyên
    assert hys.cap_nhat(0.24) is False   # vượt 0.23 -> ra nhắm


def test_huong_duoi_chong_rung_quanh_nguong_don_cu():
    """Tín hiệu dao động quanh 0.21 (ngưỡng đơn v1) không được gây rung liên tục
    khi đã ở trong vùng chết 0.19-0.23."""
    hys = HysteresisBoolState(nguong_vao=0.19, nguong_ra=0.23, huong="duoi")
    hys.cap_nhat(0.18)  # vào nhắm
    assert hys.trang_thai is True
    for gia_tri in (0.20, 0.22, 0.19, 0.21, 0.20):
        assert hys.cap_nhat(gia_tri) is True  # dao động trong vùng chết, KHÔNG rung ra "mở"


def test_huong_tren_blendshape_vao_ra():
    hys = HysteresisBoolState(nguong_vao=0.55, nguong_ra=0.45, huong="tren")
    assert hys.cap_nhat(0.10) is False
    assert hys.cap_nhat(0.50) is False   # vùng chết, chưa vào nhắm
    assert hys.cap_nhat(0.60) is True    # vượt 0.55 -> nhắm
    assert hys.cap_nhat(0.50) is True    # vùng chết nhưng đang nhắm -> giữ
    assert hys.cap_nhat(0.40) is False   # tụt dưới 0.45 -> mở lại


def test_reset():
    hys = HysteresisBoolState(nguong_vao=0.19, nguong_ra=0.23, huong="duoi")
    hys.cap_nhat(0.18)
    assert hys.trang_thai is True
    hys.reset()
    assert hys.trang_thai is False
