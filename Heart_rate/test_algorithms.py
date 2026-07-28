"""
Kiểm chứng thuật toán bằng tín hiệu tổng hợp có nhịp tim ĐÃ BIẾT TRƯỚC.

Chạy: python test_algorithms.py

Vì sao cần: khi chạy trên camera thật, anh không có cách nào biết BPM
trả về là đúng hay là ảo. Test này tạo tín hiệu mà anh biết chính xác
nhịp tim là bao nhiêu, rồi kiểm tra pipeline có khôi phục đúng không.

Nếu test này fail thì đừng động đến camera — sửa thuật toán trước.
"""

import numpy as np

from rppg.algorithms import (
    bandpass_filter,
    estimate_hr,
    motion_score,
    pos_algorithm,
    resample_uniform,
)
from rppg.console import setup_console

# Phải gọi trước mọi lệnh print: console Windows mặc định là cp1252,
# không mã hóa được tiếng Việt có dấu.
_COLOR = setup_console()

PASS = "\033[92mĐẠT\033[0m" if _COLOR else "ĐẠT"
FAIL = "\033[91mHỎNG\033[0m" if _COLOR else "HỎNG"
_failures = []


def check(name: str, condition: bool, detail: str = "") -> None:
    print(f"  [{PASS if condition else FAIL}] {name}" + (f"  — {detail}" if detail else ""))
    if not condition:
        _failures.append(name)


def synth_rgb(bpm, duration=20.0, fps=30.0, amplitude=0.006,
              noise=0.002, illum_drift=True, seed=0):
    """Tạo chuỗi RGB giả lập vùng da có mạch đập.

    Mô phỏng đúng những gì xảy ra thật:
      - biên độ mạch chỉ ~0.6% mức DC (đúng thang thực tế của rPPG)
      - kênh xanh lá nhạy nhất với hemoglobin, đỏ ít nhạy nhất
      - có hài bậc 1 như dạng sóng mạch thật
      - có trôi chiếu sáng chậm (nhiễu nhân) mà POS phải triệt được
    """
    rng = np.random.default_rng(seed)
    n = int(duration * fps)
    t = np.arange(n) / fps
    f = bpm / 60.0

    pulse = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t)

    dc = np.array([160.0, 120.0, 110.0])          # R, G, B
    sensitivity = np.array([0.35, 1.00, 0.60])    # G nhạy nhất

    signal = dc[None, :] * (1.0 + amplitude * sensitivity[None, :] * pulse[:, None])

    if illum_drift:
        # Nhiễu chiếu sáng dạng nhân, chậm — POS sinh ra để loại cái này.
        drift = (1.0 + 0.05 * np.sin(2 * np.pi * 0.08 * t)
                 + 0.03 * np.sin(2 * np.pi * 0.03 * t + 1.1))
        signal *= drift[:, None]

    signal += rng.normal(0.0, noise * dc.mean(), signal.shape)
    return signal


def run_pipeline(rgb, fps):
    raw = pos_algorithm(rgb, fps)
    filtered = bandpass_filter(raw, fps, 0.7, 4.0, 3)
    return estimate_hr(filtered, fps)


# ---------------------------------------------------------------------------
print("\n1. Khôi phục nhịp tim từ tín hiệu tổng hợp")
print("   (biên độ mạch 0.6% DC — đúng thang thực tế)\n")

for true_bpm in [48, 62, 75, 90, 115, 140]:
    rgb = synth_rgb(true_bpm, duration=20.0, fps=30.0, seed=int(true_bpm))
    res = run_pipeline(rgb, 30.0)
    err = abs(res.bpm - true_bpm) if res.bpm else float("inf")
    check(f"BPM thật {true_bpm:3d} -> đo được {res.bpm:6.1f}",
          err < 3.0, f"sai số {err:.2f} BPM, SQI {res.sqi_db:.1f} dB")

# ---------------------------------------------------------------------------
print("\n2. Cổng SQI phân biệt tín hiệu thật với nhiễu\n")

rgb_clean = synth_rgb(72, duration=20.0, seed=1)
sqi_clean = run_pipeline(rgb_clean, 30.0).sqi_db

rng = np.random.default_rng(7)
rgb_noise = np.array([160.0, 120.0, 110.0])[None, :] * (
    1.0 + rng.normal(0, 0.01, (600, 3))
)
res_noise = run_pipeline(rgb_noise, 30.0)

check("tín hiệu sạch có SQI cao", sqi_clean > 3.0, f"{sqi_clean:.1f} dB")
check("nhiễu trắng có SQI thấp", res_noise.sqi_db < 3.0,
      f"{res_noise.sqi_db:.1f} dB")
check("SQI tách biệt rõ hai trường hợp",
      sqi_clean - res_noise.sqi_db > 5.0,
      f"chênh {sqi_clean - res_noise.sqi_db:.1f} dB")

# FFT luôn tìm được một đỉnh kể cả với nhiễu thuần — đó là lý do cần SQI.
check("FFT vẫn trả đỉnh cho nhiễu (nên KHÔNG được tin đỉnh)",
      res_noise.bpm is not None,
      f"đỉnh giả tại {res_noise.bpm:.1f} BPM")

# ---------------------------------------------------------------------------
print("\n3. Resample xử lý đúng timestamp không đều\n")

true_bpm = 78.0
n = 600
rng = np.random.default_rng(3)

# Kịch bản thật hay gặp nhất: camera KHAI BÁO 30 fps nhưng thực tế chỉ
# giao được 24 fps (thiếu sáng nên tự hạ tốc, hoặc CPU không kịp, hoặc
# rớt khung khi truyền). Cộng thêm jitter ngẫu nhiên.
declared_fps = 30.0
real_fps = 24.0
intervals = (1.0 / real_fps) * (1.0 + rng.uniform(-0.25, 0.25, n))
timestamps = np.cumsum(intervals)

t_real = timestamps - timestamps[0]
f = true_bpm / 60.0
pulse = np.sin(2 * np.pi * f * t_real) + 0.35 * np.sin(2 * np.pi * 2 * f * t_real)
dc = np.array([160.0, 120.0, 110.0])
sens = np.array([0.35, 1.0, 0.6])
rgb_jitter = dc[None, :] * (1.0 + 0.006 * sens[None, :] * pulse[:, None])
rgb_jitter += rng.normal(0, 0.25, rgb_jitter.shape)

# Cách ĐÚNG: nội suy về lưới đều theo timestamp thật lúc chụp.
rgb_uniform, fps_actual = resample_uniform(timestamps, rgb_jitter, 30.0)
res_correct = run_pipeline(rgb_uniform, fps_actual)
err_correct = abs(res_correct.bpm - true_bpm)

# Cách SAI: tin vào fps camera khai báo, bỏ qua timestamp.
res_wrong = run_pipeline(rgb_jitter, declared_fps)
err_wrong = abs(res_wrong.bpm - true_bpm)

check("có resample thì khôi phục đúng", err_correct < 3.0,
      f"đo {res_correct.bpm:.1f}, sai số {err_correct:.2f} BPM")
check("cách sai lệch nghiêm trọng", err_wrong > 10.0,
      f"đo {res_wrong.bpm:.1f}, sai số {err_wrong:.1f} BPM")
print(f"\n       Chú ý: cách sai vẫn trả SQI {res_wrong.sqi_db:.1f} dB — "
      f"tức là\n       hệ thống TỰ TIN vào một con số sai {err_wrong:.0f} BPM. "
      f"Không có\n       cách nào phát hiện lỗi này từ đầu ra.")

# ---------------------------------------------------------------------------
print("\n4. Cửa sổ dài cho độ phân giải tần số tốt hơn\n")

for dur, expect in [(10.0, 6.0), (20.0, 3.0), (30.0, 2.0)]:
    print(f"       cửa sổ {dur:4.0f}s -> độ phân giải thực "
          f"{60.0 / dur:.1f} BPM (mục tiêu ~{expect:.0f})")

rgb_10 = synth_rgb(72, duration=10.0, seed=11)
rgb_30 = synth_rgb(72, duration=30.0, seed=11)
e10 = abs(run_pipeline(rgb_10, 30.0).bpm - 72)
e30 = abs(run_pipeline(rgb_30, 30.0).bpm - 72)
check("cửa sổ 30s không tệ hơn cửa sổ 10s", e30 <= e10 + 0.5,
      f"sai số 10s={e10:.2f}, 30s={e30:.2f}")

# ---------------------------------------------------------------------------
print("\n5. Chỉ số chuyển động\n")

rng = np.random.default_rng(5)
still_centers = np.array([320.0, 240.0]) + rng.normal(0, 0.5, (300, 2))
shake_centers = np.array([320.0, 240.0]) + rng.normal(0, 12.0, (300, 2))
scales = np.full(300, 120.0)

m_still = motion_score(still_centers, scales)
m_shake = motion_score(shake_centers, scales)

check("ngồi yên -> điểm chuyển động thấp", m_still < 0.02, f"{m_still:.4f}")
check("rung lắc -> điểm chuyển động cao", m_shake > 0.02, f"{m_shake:.4f}")

# ---------------------------------------------------------------------------
print("\n" + "=" * 62)
if _failures:
    print(f"  {len(_failures)} kiểm tra HỎNG: {', '.join(_failures)}")
    raise SystemExit(1)
print("  Toàn bộ kiểm tra ĐẠT — pipeline khôi phục đúng nhịp tim đã biết.")
print("=" * 62 + "\n")
