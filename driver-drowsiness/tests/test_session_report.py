"""Test báo cáo phiên tự động (item 6): bao_cao.md + events.jsonl + 2 PNG."""
import json

from edge.session_report import SessionRecorder, xuat_bao_cao


def _recorder_mau() -> SessionRecorder:
    rec = SessionRecorder(nguon_tin_hieu="hybrid", profile_id="tai_xe_01")
    for i in range(120):
        rec.ghi_perclos(float(i), min(1.0, i / 200.0))
    rec.ghi_layer1_latency(8.4)
    rec.ghi_layer1_latency(12.1)
    rec.ghi_layer1_latency(250.0)
    rec.ghi_su_kien(30.0, muc=2, chi_so={"perclos": 0.4}, loai="canh_bao_hanh_vi")
    rec.ghi_su_kien(60.0, muc=3, chi_so={"perclos": 0.5}, loai="canh_bao_hanh_vi")
    rec.ghi_su_kien(45.0, muc=2, chi_so={"pitch_truoc_khi_mat": 25.0}, loai="mat_mat_sau_chui_dau")
    return rec


def test_xuat_bao_cao_sinh_du_file(tmp_path):
    rec = _recorder_mau()
    thu_muc = xuat_bao_cao(rec, thoi_gian_tong_giay=120.0, thoi_gian_kha_dung_giay=100.0,
                            thu_muc_goc=str(tmp_path), timestamp_str="20260101-000000")

    assert (thu_muc / "bao_cao.md").exists()
    assert (thu_muc / "events.jsonl").exists()
    assert (thu_muc / "perclos_timeline.png").exists()
    assert (thu_muc / "latency_hist.png").exists()


def test_bao_cao_md_chua_coverage_va_nguon():
    rec = _recorder_mau()
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        thu_muc = xuat_bao_cao(rec, thoi_gian_tong_giay=120.0, thoi_gian_kha_dung_giay=100.0,
                                thu_muc_goc=d, timestamp_str="20260101-000000")
        noi_dung = (thu_muc / "bao_cao.md").read_text(encoding="utf-8")

    assert "83.3%" in noi_dung  # coverage = 100/120
    assert "hybrid" in noi_dung
    assert "tai_xe_01" in noi_dung
    assert "mat_mat_sau_chui_dau" in noi_dung


def test_events_jsonl_dung_so_dong():
    rec = _recorder_mau()
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        thu_muc = xuat_bao_cao(rec, thoi_gian_tong_giay=120.0, thoi_gian_kha_dung_giay=100.0,
                                thu_muc_goc=d, timestamp_str="20260101-000000")
        dong = (thu_muc / "events.jsonl").read_text(encoding="utf-8").strip().splitlines()

    assert len(dong) == 3
    parsed = [json.loads(d) for d in dong]
    assert {p["loai"] for p in parsed} == {"canh_bao_hanh_vi", "mat_mat_sau_chui_dau"}


def test_khong_du_lieu_perclos_khong_crash(tmp_path):
    rec = SessionRecorder(nguon_tin_hieu="ear")
    thu_muc = xuat_bao_cao(rec, thoi_gian_tong_giay=10.0, thoi_gian_kha_dung_giay=10.0,
                            thu_muc_goc=str(tmp_path), timestamp_str="20260101-000001")
    assert (thu_muc / "bao_cao.md").exists()
    assert not (thu_muc / "perclos_timeline.png").exists()
    assert not (thu_muc / "latency_hist.png").exists()
