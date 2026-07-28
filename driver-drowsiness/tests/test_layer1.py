"""Test Lớp 1: chớp mắt bình thường không kích còi; nhắm mắt kéo dài mới kích;
độ trễ (frame -> quyết định) đo đúng; mất landmark ngắn KHÔNG reset chuỗi
(item 7); mất landmark dài THÌ reset."""
from edge.alert_policy import AlertPolicy
from edge.layer1_reflex import Layer1Reflex

NGUONG_NHAM_MAT_GIAY = 1.2
MAT_LANDMARK_TOI_DA_GIAY = 1.5


def _tao_layer1() -> Layer1Reflex:
    return Layer1Reflex(
        nguong_nham_mat_giay_mac_dinh=NGUONG_NHAM_MAT_GIAY,
        chop_mat_toi_da_giay=0.5,
        canh_bao_do_tre_ms=300,
        mat_landmark_toi_da_giay=MAT_LANDMARK_TOI_DA_GIAY,
    )


def test_chop_mat_binh_thuong_khong_kich_coi():
    layer1 = _tao_layer1()
    # nhắm 0.3s (< 0.5s chớp mắt tối đa, xa dưới ngưỡng 1.2s) rồi mở mắt lại
    assert layer1.update(True, True, 0.0) is None
    assert layer1.update(True, True, 0.3) is None
    assert layer1.update(False, True, 0.4) is None  # mở mắt lại


def test_nham_mat_keo_dai_kich_coi_dung_moc():
    layer1 = _tao_layer1()
    assert layer1.update(True, True, 0.0) is None
    assert layer1.update(True, True, 1.19) is None
    event = layer1.update(True, True, 1.21)
    assert event is not None
    assert event.thoi_luong_nham_mat_giay >= NGUONG_NHAM_MAT_GIAY


def test_khong_kich_coi_lap_lai_trong_cung_episode():
    layer1 = _tao_layer1()
    layer1.update(True, True, 0.0)
    event1 = layer1.update(True, True, 1.3)
    assert event1 is not None
    event2 = layer1.update(True, True, 1.5)  # vẫn đang nhắm mắt, KHÔNG báo lại
    assert event2 is None


def test_mo_mat_lai_cho_phep_episode_moi():
    layer1 = _tao_layer1()
    layer1.update(True, True, 0.0)
    assert layer1.update(True, True, 1.3) is not None
    layer1.update(False, True, 1.4)  # mở mắt -> reset episode
    layer1.update(True, True, 1.4)
    event2 = layer1.update(True, True, 1.4 + NGUONG_NHAM_MAT_GIAY + 0.01)
    assert event2 is not None


def test_mat_landmark_ngan_khong_reset_chuoi():
    """Đang trong chuỗi nhắm mắt, mất landmark <= 1.5s, quay lại vẫn nhắm ->
    chuỗi liên tục, thời lượng tính cả gap (item 7)."""
    layer1 = _tao_layer1()
    layer1.update(True, True, 0.0)          # bắt đầu chuỗi nhắm tại t=0
    assert layer1.update(True, False, 0.5) is None    # mất landmark tại t=0.5 (gap bắt đầu)
    assert layer1.update(True, False, 1.0) is None    # vẫn mất, gap=0.5s < 1.5s -> chưa reset
    # landmark quay lại tại t=1.3, vẫn nhắm -> thời lượng kể từ t=0 là 1.3s >= 1.2s -> kích còi
    event = layer1.update(True, True, 1.3)
    assert event is not None
    assert event.thoi_luong_nham_mat_giay >= NGUONG_NHAM_MAT_GIAY


def test_mat_landmark_dai_thi_reset_chuoi():
    """Mất landmark > 1.5s giữa chuỗi nhắm mắt -> reset, không kích còi ăn gian."""
    layer1 = _tao_layer1()
    layer1.update(True, True, 0.0)
    assert layer1.update(True, False, 0.5) is None
    assert layer1.update(True, False, 2.2) is None  # gap = 2.2 - 0.5 = 1.7s > 1.5s -> reset
    # landmark quay lại vẫn nhắm tại t=2.3 -> chuỗi mới bắt đầu từ đây, CHƯA đủ 1.2s
    event = layer1.update(True, True, 2.3)
    assert event is None
    event2 = layer1.update(True, True, 2.3 + NGUONG_NHAM_MAT_GIAY + 0.01)
    assert event2 is not None


def test_mat_landmark_khi_khong_trong_chuoi_khong_anh_huong():
    layer1 = _tao_layer1()
    # Chưa từng nhắm mắt -> mất landmark không tạo hiệu ứng gì
    assert layer1.update(False, False, 0.0) is None
    assert layer1.update(False, False, 5.0) is None
    assert layer1.dang_nham_mat is False


def test_alert_policy_cooldown_layer1():
    policy = AlertPolicy(cooldown_layer1_giay=5, cooldown_layer2_giay=30)
    assert policy.cho_phep_layer1_buzzer(now=0.0) is True
    assert policy.cho_phep_layer1_buzzer(now=2.0) is False  # còn trong cooldown 5s
    assert policy.cho_phep_layer1_buzzer(now=5.1) is True


def test_alert_policy_cooldown_layer2_theo_muc():
    policy = AlertPolicy(cooldown_layer1_giay=5, cooldown_layer2_giay=30)
    assert policy.cho_phep_layer2_event(muc=2, now=0.0) is True
    assert policy.cho_phep_layer2_event(muc=2, now=10.0) is False  # cùng mức, còn cooldown
    assert policy.cho_phep_layer2_event(muc=3, now=10.0) is True   # đổi mức -> cho phép ngay


def test_alert_policy_cooldown_su_kien_dac_biet():
    policy = AlertPolicy(cooldown_layer1_giay=5, cooldown_layer2_giay=30)
    assert policy.cho_phep_su_kien_dac_biet("mat_mat_sau_chui_dau", now=0.0) is True
    assert policy.cho_phep_su_kien_dac_biet("mat_mat_sau_chui_dau", now=10.0) is False
    assert policy.cho_phep_su_kien_dac_biet("mat_mat_sau_chui_dau", now=30.1) is True
