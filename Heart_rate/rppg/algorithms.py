"""
Xử lý tín hiệu rPPG: resample theo timestamp -> POS -> bandpass -> FFT -> SQI.

Toàn bộ hàm ở đây là hàm thuần (pure function), không giữ trạng thái,
không phụ thuộc camera hay mediapipe. Nhờ vậy test được độc lập bằng
tín hiệu tổng hợp (xem test_algorithms.py).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple

import numpy as np
from scipy import signal as sps


# --------------------------------------------------------------------------
# 1. Resample về lưới thời gian đều
# --------------------------------------------------------------------------

def resample_uniform(
    timestamps: np.ndarray,
    values: np.ndarray,
    target_fps: float,
) -> Tuple[np.ndarray, float]:
    """Nội suy chuỗi lấy mẫu không đều về lưới thời gian đều.

    ĐÂY LÀ BƯỚC HAY BỊ BỎ QUÊN NHẤT và là lỗi âm thầm nguy hiểm nhất.

    Webcam chạy variable frame rate; nếu có truyền qua mạng thì còn thêm
    jitter. Giả định "fps cố định" khiến trục thời gian bị co giãn, FFT
    map sai bin, và hệ thống trả BPM sai mà KHÔNG hề báo lỗi.

    Args:
        timestamps: mảng (N,) thời điểm CHỤP của từng khung hình, đơn vị giây.
        values: mảng (N,) hoặc (N, C) giá trị tương ứng.
        target_fps: tần số lưới đều đầu ra.

    Returns:
        (values_uniform, actual_fps)
    """
    timestamps = np.asarray(timestamps, dtype=np.float64)
    values = np.asarray(values, dtype=np.float64)

    if timestamps.ndim != 1:
        raise ValueError("timestamps phải là mảng 1 chiều")
    if timestamps.shape[0] < 2:
        raise ValueError("cần ít nhất 2 mẫu để resample")

    # Timestamp phải tăng đơn điệu; loại các mẫu bị lặp hoặc lùi thời gian.
    order = np.argsort(timestamps, kind="stable")
    timestamps = timestamps[order]
    values = values[order]
    keep = np.concatenate(([True], np.diff(timestamps) > 1e-9))
    timestamps = timestamps[keep]
    values = values[keep]

    if timestamps.shape[0] < 2:
        raise ValueError("không đủ mẫu hợp lệ sau khi lọc timestamp trùng")

    duration = timestamps[-1] - timestamps[0]
    n_out = max(2, int(round(duration * target_fps)))
    grid = np.linspace(timestamps[0], timestamps[-1], n_out)

    if values.ndim == 1:
        out = np.interp(grid, timestamps, values)
    else:
        out = np.stack(
            [np.interp(grid, timestamps, values[:, c]) for c in range(values.shape[1])],
            axis=1,
        )

    actual_fps = (n_out - 1) / duration if duration > 0 else target_fps
    return out, float(actual_fps)


# --------------------------------------------------------------------------
# 2. POS (Plane-Orthogonal-to-Skin)
# --------------------------------------------------------------------------

# Ma trận chiếu của POS, theo Wang et al. 2017 (IEEE TBME).
_POS_PROJECTION = np.array([[0.0, 1.0, -1.0],
                            [-2.0, 1.0, 1.0]], dtype=np.float64)

_POS_WINDOW_SEC = 1.6  # độ dài cửa sổ trượt trong bài báo gốc


def pos_algorithm(rgb: np.ndarray, fps: float) -> np.ndarray:
    """Trích tín hiệu mạch đập thô từ chuỗi RGB bằng thuật toán POS.

    Ý tưởng: chiếu tín hiệu RGB lên một mặt phẳng trực giao với hướng
    biến thiên do ánh sáng gây ra, nên loại được phần lớn nhiễu do thay
    đổi độ sáng và bóng đổ, giữ lại phần biến thiên do máu.

    Lưu ý: POS chỉ triệt được nhiễu chiếu sáng dạng NHÂN và CHẬM. Nó
    KHÔNG triệt được rung cơ học hay ánh sáng nhấp nháy có chu kỳ nằm
    trong dải 0.7-4 Hz — đó là lý do phải có motion gate ở tầng trên.

    Args:
        rgb: mảng (N, 3) trung bình kênh R, G, B theo thời gian, lưới đều.
        fps: tần số lấy mẫu của lưới đều.

    Returns:
        Mảng (N,) tín hiệu rPPG thô.
    """
    rgb = np.asarray(rgb, dtype=np.float64)
    if rgb.ndim != 2 or rgb.shape[1] != 3:
        raise ValueError(f"rgb phải có shape (N, 3), nhận được {rgb.shape}")

    n = rgb.shape[0]
    win = int(round(_POS_WINDOW_SEC * fps))
    out = np.zeros(n, dtype=np.float64)

    if win < 4 or n < win:
        # Chuỗi quá ngắn cho cửa sổ trượt: chạy POS một lần trên toàn bộ.
        return _pos_single_window(rgb)

    for start in range(0, n - win + 1):
        block = rgb[start:start + win]                 # (win, 3)
        h = _pos_single_window(block)
        # Overlap-add, đã trừ trung bình bên trong _pos_single_window.
        out[start:start + win] += h

    return out


def _pos_single_window(block: np.ndarray) -> np.ndarray:
    """Áp POS cho đúng một cửa sổ, trả về tín hiệu đã trừ trung bình."""
    mean = block.mean(axis=0)
    # Nếu một kênh gần như bằng 0 thì chuẩn hóa theo thời gian sẽ nổ.
    if np.any(np.abs(mean) < 1e-9):
        return np.zeros(block.shape[0], dtype=np.float64)

    normalized = block / mean                          # chuẩn hóa theo thời gian
    projected = _POS_PROJECTION @ normalized.T         # (2, win)

    s1, s2 = projected[0], projected[1]
    std2 = np.std(s2)
    alpha = (np.std(s1) / std2) if std2 > 1e-12 else 0.0

    h = s1 + alpha * s2
    h -= h.mean()
    return h


# --------------------------------------------------------------------------
# 3. Lọc thông dải
# --------------------------------------------------------------------------

def bandpass_filter(
    sig: np.ndarray,
    fps: float,
    low_hz: float = 0.7,
    high_hz: float = 4.0,
    order: int = 3,
) -> np.ndarray:
    """Butterworth thông dải, lọc hai chiều (zero-phase) bằng filtfilt.

    Dùng filtfilt thay vì lfilter để không làm lệch pha — quan trọng nếu
    sau này cần dò đỉnh sóng để tính khoảng nhịp.
    """
    sig = np.asarray(sig, dtype=np.float64)
    nyquist = fps / 2.0

    high_hz = min(high_hz, nyquist * 0.95)
    if low_hz >= high_hz:
        raise ValueError(f"dải lọc không hợp lệ với fps={fps}")

    sos = sps.butter(order, [low_hz / nyquist, high_hz / nyquist],
                     btype="bandpass", output="sos")

    # filtfilt cần chuỗi dài hơn vài lần bậc bộ lọc.
    padlen = 3 * (2 * order + 1)
    if sig.shape[0] <= padlen:
        return sig - sig.mean()

    return sps.sosfiltfilt(sos, sig)


# --------------------------------------------------------------------------
# 4. Ước lượng nhịp tim + SQI
# --------------------------------------------------------------------------

@dataclass
class SpectrumResult:
    """Kết quả phân tích phổ của một cửa sổ tín hiệu."""
    bpm: Optional[float]        # None nếu không tìm được đỉnh hợp lệ
    sqi_db: float               # tỉ số tín hiệu trên nhiễu, đơn vị dB
    freqs_hz: np.ndarray        # trục tần số (để vẽ phổ trong demo)
    power: np.ndarray           # phổ công suất đã chuẩn hóa
    peak_hz: Optional[float]


def estimate_hr(
    sig: np.ndarray,
    fps: float,
    low_hz: float = 0.7,
    high_hz: float = 4.0,
    peak_halfwidth_hz: float = 0.2,
    include_harmonic: bool = True,
    zero_pad_factor: int = 4,
) -> SpectrumResult:
    """Tìm nhịp tim và tính SQI từ tín hiệu rPPG đã lọc.

    SQI ở đây là tỉ số:
        (năng lượng quanh đỉnh + quanh hài bậc 1) / (phần còn lại trong dải)

    Tính cả hài bậc 1 là có chủ đích: nhịp tim thật gần như luôn sinh ra
    hài, còn nhiễu do rung hay ánh sáng nhấp nháy thường chỉ có một đỉnh.
    Điều này giúp phân biệt đỉnh thật với đỉnh giả tốt hơn đáng kể.

    Zero-padding chỉ làm mịn vị trí đỉnh (nội suy), KHÔNG tăng độ phân
    giải thực. Độ phân giải thực vẫn là 1/T — muốn tốt hơn phải kéo dài
    cửa sổ, đó là lý do config để 20-30 giây thay vì 10.
    """
    sig = np.asarray(sig, dtype=np.float64)
    n = sig.shape[0]

    empty = np.array([], dtype=np.float64)
    if n < 8:
        return SpectrumResult(None, -np.inf, empty, empty, None)

    # Cửa sổ Hann giảm rò rỉ phổ.
    windowed = sig * sps.get_window("hann", n)

    nfft = int(2 ** np.ceil(np.log2(n * max(1, zero_pad_factor))))
    spectrum = np.fft.rfft(windowed, n=nfft)
    freqs = np.fft.rfftfreq(nfft, d=1.0 / fps)
    power = np.abs(spectrum) ** 2

    band = (freqs >= low_hz) & (freqs <= high_hz)
    if not np.any(band) or power[band].sum() <= 0:
        return SpectrumResult(None, -np.inf, freqs, power, None)

    band_freqs = freqs[band]
    band_power = power[band]

    peak_idx = int(np.argmax(band_power))
    peak_hz = float(band_freqs[peak_idx])

    # --- Tính SQI ---
    signal_mask = np.abs(band_freqs - peak_hz) <= peak_halfwidth_hz
    if include_harmonic:
        harmonic_hz = peak_hz * 2.0
        if harmonic_hz <= high_hz:
            signal_mask |= np.abs(band_freqs - harmonic_hz) <= peak_halfwidth_hz

    signal_energy = band_power[signal_mask].sum()
    noise_energy = band_power[~signal_mask].sum()

    if noise_energy <= 1e-20:
        sqi_db = 40.0  # trần hợp lý, tránh vô cực
    elif signal_energy <= 1e-20:
        sqi_db = -np.inf
    else:
        sqi_db = float(10.0 * np.log10(signal_energy / noise_energy))

    # Chuẩn hóa phổ về [0, 1] để vẽ.
    power_norm = power / power[band].max()

    return SpectrumResult(
        bpm=peak_hz * 60.0,
        sqi_db=sqi_db,
        freqs_hz=freqs,
        power=power_norm,
        peak_hz=peak_hz,
    )


# --------------------------------------------------------------------------
# 5. Chỉ số chuyển động
# --------------------------------------------------------------------------

def motion_score(centers: np.ndarray, scales: np.ndarray) -> float:
    """Ước lượng mức chuyển động của khuôn mặt trong cửa sổ.

    Trả về độ lệch chuẩn của tâm khuôn mặt, chuẩn hóa theo kích thước
    khuôn mặt để không phụ thuộc khoảng cách tới camera.

    Đây là cách thay thế rẻ tiền cho IMU: trên laptop không có cảm biến
    gia tốc thì độ dịch chuyển landmark là chỉ báo rung dùng được.

    Args:
        centers: mảng (N, 2) tọa độ tâm khuôn mặt theo pixel.
        scales: mảng (N,) kích thước đặc trưng của khuôn mặt theo pixel.
    """
    centers = np.asarray(centers, dtype=np.float64)
    scales = np.asarray(scales, dtype=np.float64)

    if centers.shape[0] < 3:
        return 0.0

    median_scale = float(np.median(scales))
    if median_scale < 1e-6:
        return float("inf")

    normalized = centers / median_scale
    return float(np.linalg.norm(np.std(normalized, axis=0)))
