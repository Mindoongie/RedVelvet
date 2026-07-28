"""Test CoverageTracker (nguyên tắc hai con số) + FaceLossTracker
(khong_kha_dung, mat_mat_sau_chui_dau)."""
from edge.coverage import CoverageTracker, FaceLossTracker


def test_coverage_nua_kha_dung():
    cov = CoverageTracker()
    cov.cap_nhat(0.0, True)
    cov.cap_nhat(5.0, True)     # 5s khả dụng
    cov.cap_nhat(10.0, False)   # 5s không khả dụng
    assert abs(cov.coverage - 0.5) < 1e-9
    assert abs(cov.thoi_gian_tong_giay - 10.0) < 1e-9
    assert abs(cov.thoi_gian_kha_dung_giay - 5.0) < 1e-9


def test_coverage_toan_bo_kha_dung():
    cov = CoverageTracker()
    cov.cap_nhat(0.0, True)
    cov.cap_nhat(3.0, True)
    assert cov.coverage == 1.0


def test_coverage_rong_tra_ve_0():
    cov = CoverageTracker()
    assert cov.coverage == 0.0


def test_face_loss_khong_kha_dung_sau_2s():
    tracker = FaceLossTracker(khong_kha_dung_giay=2.0, nguong_pitch_chui_do=20)
    tracker.cap_nhat_kha_dung(-1.0, pitch_deg=0.0)  # pitch bình thường, không chúi

    # t=0.0 là frame ĐẦU TIÊN quan sát thấy mất landmark -> đây là mốc bắt đầu đếm gap
    assert tracker.cap_nhat_mat_landmark(0.0) is None
    assert tracker.cap_nhat_mat_landmark(1.9) is None  # elapsed=1.9s, chưa đủ 2.0s
    ev = tracker.cap_nhat_mat_landmark(2.1)             # elapsed=2.1s >= 2.0s
    assert ev is not None
    assert ev.loai == "khong_kha_dung"

    # không báo lại lần 2 cho cùng episode
    assert tracker.cap_nhat_mat_landmark(3.0) is None


def test_face_loss_mat_mat_sau_chui_dau():
    tracker = FaceLossTracker(khong_kha_dung_giay=2.0, nguong_pitch_chui_do=20)
    tracker.cap_nhat_kha_dung(0.0, pitch_deg=25.0)  # đang chúi đầu > 20 độ

    ev = tracker.cap_nhat_mat_landmark(0.05)  # mất mặt NGAY sau đó
    assert ev is not None
    assert ev.loai == "mat_mat_sau_chui_dau"
    assert ev.pitch_truoc_do == 25.0


def test_face_loss_khong_chui_dau_thi_khong_bao_mat_mat_sau_chui_dau():
    tracker = FaceLossTracker(khong_kha_dung_giay=2.0, nguong_pitch_chui_do=20)
    tracker.cap_nhat_kha_dung(0.0, pitch_deg=5.0)  # đầu thẳng, không chúi

    ev = tracker.cap_nhat_mat_landmark(0.05)
    assert ev is None  # không thoả điều kiện chúi đầu


def test_face_loss_quay_lai_kha_dung_reset_trang_thai():
    tracker = FaceLossTracker(khong_kha_dung_giay=2.0, nguong_pitch_chui_do=20)
    tracker.cap_nhat_kha_dung(0.0, pitch_deg=25.0)
    tracker.cap_nhat_mat_landmark(0.05)  # đã báo mat_mat_sau_chui_dau

    tracker.cap_nhat_kha_dung(0.5, pitch_deg=25.0)  # landmark quay lại

    # mất mặt lại lần nữa ngay sau đó -> vẫn được báo (episode mới)
    ev = tracker.cap_nhat_mat_landmark(0.55)
    assert ev is not None
    assert ev.loai == "mat_mat_sau_chui_dau"
