"""
Cấu hình tập trung cho module rPPG.

Mọi hằng số của hệ thống nằm ở đúng một chỗ này. Khi hiệu chỉnh ngưỡng
trên dữ liệu thật, chỉ sửa file này — không rải magic number khắp code.
"""

from dataclasses import dataclass


@dataclass
class RPPGConfig:
    # ----- Cửa sổ phân tích -----
    # Vì rPPG chỉ chạy khi xe đứng yên nên không có ràng buộc thời gian thực.
    # Cửa sổ dài hơn cho độ phân giải tần số tốt hơn:
    #   10s -> 0.10 Hz = 6 BPM  (quá thô, không phân biệt được 128 với 132)
    #   20s -> 0.05 Hz = 3 BPM
    #   30s -> 0.033 Hz = 2 BPM
    window_sec: float = 20.0

    # Số giây tối thiểu phải tích lũy trước khi trả kết quả đầu tiên.
    min_window_sec: float = 10.0

    # Tần số lưới đều dùng để resample. KHÔNG phải fps của camera —
    # camera chạy variable frame rate nên phải nội suy về lưới đều.
    resample_fps: float = 30.0

    # Khoảng cách tối thiểu giữa hai lần tính lại BPM (giây).
    # Tính FFT mỗi khung hình là lãng phí CPU vô ích.
    update_interval_sec: float = 0.5

    # ----- Dải tần nhịp tim -----
    # 0.7-4.0 Hz tương đương 42-240 BPM.
    hr_min_hz: float = 0.7
    hr_max_hz: float = 4.0
    bandpass_order: int = 3

    # ----- Cổng chất lượng tín hiệu (SQI) -----
    # SNR = năng lượng quanh đỉnh (và hài bậc 1) / phần còn lại trong dải.
    # Dưới ngưỡng -> trả 'unavailable', TUYỆT ĐỐI không trả một con số đoán.
    # 3.0 dB là giá trị khởi điểm, phải hiệu chỉnh lại trên dữ liệu thật.
    sqi_threshold_db: float = 3.0

    # Bề rộng nửa dải quanh đỉnh khi tính năng lượng tín hiệu (Hz).
    sqi_peak_halfwidth_hz: float = 0.2

    # Có tính cả hài bậc 1 vào năng lượng tín hiệu không.
    # Nhịp tim thật luôn có hài; nhiễu chuyển động thường không.
    sqi_include_harmonic: bool = True

    # ----- Cổng đứng yên (motion gate) -----
    # rPPG chỉ hợp lệ khi đối tượng và camera tương đối tĩnh.
    # Đo bằng độ lệch chuẩn của tâm khuôn mặt, chuẩn hóa theo kích thước mặt.
    # Vượt ngưỡng -> 'unavailable' bất kể SQI bao nhiêu.
    motion_threshold: float = 0.020

    # Bật/tắt cổng đứng yên (tắt khi chạy trên dataset đã biết là tĩnh).
    motion_gate_enabled: bool = True

    # ----- Trích xuất ROI -----
    # Cắt bớt phần trăm pixel sáng nhất và tối nhất trong ROI trán trước
    # khi lấy trung bình. Loại tóc mái, chân tóc, gọng kính, bóng đổ.
    # Rất cần với tập người dùng Việt Nam (tóc mái phổ biến).
    roi_trim_percent: float = 20.0

    # Số pixel tối thiểu trong ROI để coi mẫu là hợp lệ.
    roi_min_pixels: int = 200

    # ----- Quản lý bộ nhớ -----
    # Xóa buffer của person_id không có khung hình mới sau ngần này giây.
    # Bản thiết kế cũ giữ buffer vĩnh viễn -> rò rỉ bộ nhớ khi người rời xe.
    person_ttl_sec: float = 60.0

    def __post_init__(self) -> None:
        if self.min_window_sec > self.window_sec:
            raise ValueError("min_window_sec không được lớn hơn window_sec")
        if self.hr_min_hz >= self.hr_max_hz:
            raise ValueError("hr_min_hz phải nhỏ hơn hr_max_hz")
        if not 0.0 <= self.roi_trim_percent < 50.0:
            raise ValueError("roi_trim_percent phải trong [0, 50)")


DEFAULT_CONFIG = RPPGConfig()
