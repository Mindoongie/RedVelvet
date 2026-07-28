"""
API tích hợp chính của nhánh rPPG.

ĐÂY LÀ FILE DUY NHẤT NHÓM CẦN ĐỌC để tích hợp. Mọi thứ khác là chi tiết
bên trong.

    from rppg import PulseMonitor

    monitor = PulseMonitor()
    result = monitor.process_frame("driver", frame_bgr, timestamp=time.time())

    if result.status == "ok":
        hien_thi(result.bpm)
    else:
        hien_thi("--")     # KHÔNG hiển thị số cũ, KHÔNG đoán

HỢP ĐỒNG GIAO DIỆN — bốn điều nhóm cần thống nhất:

  1. Đầu ra là TÍN HIỆU HIỂN THỊ VÀ BỐI CẢNH, không phải nguồn kích hoạt
     cảnh báo. Đừng nối bpm vào chuông báo khẩn cấp.
  2. Khi status != "ok" thì KHÔNG có số. Hiển thị "--" hoặc "đang đo",
     tuyệt đối không dùng lại giá trị cũ.
  3. rPPG chỉ hợp lệ khi xe ĐỨNG YÊN. Tầng trên nên chỉ gọi process_frame
     khi tốc độ < 2 km/h (xem tham số vehicle_stationary).
  4. bpm KHÔNG dùng để suy ra đột quỵ, căng thẳng hay buồn ngủ.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional

import numpy as np

from .algorithms import (
    SpectrumResult,
    bandpass_filter,
    estimate_hr,
    motion_score,
    pos_algorithm,
    resample_uniform,
)
from .config import DEFAULT_CONFIG, RPPGConfig
from .face_roi import ForeheadROIExtractor

# Các giá trị hợp lệ của trường status.
STATUS_OK = "ok"                     # đo được, số dùng được
STATUS_CALIBRATING = "calibrating"   # đang tích lũy dữ liệu
STATUS_UNAVAILABLE = "unavailable"   # đủ dữ liệu nhưng chất lượng không đạt
STATUS_NO_FACE = "no_face"           # không thấy khuôn mặt
STATUS_MOVING = "moving"             # rung/chuyển động quá ngưỡng


@dataclass
class PulseResult:
    """Kết quả trả về cho mỗi khung hình."""

    person_id: str
    status: str
    timestamp: float

    bpm: Optional[float] = None      # chỉ khác None khi status == "ok"
    sqi_db: Optional[float] = None   # tỉ số tín hiệu/nhiễu, dB
    buffer_sec: float = 0.0          # đã tích lũy bao nhiêu giây
    progress: float = 0.0            # tiến độ hiệu chuẩn, 0..1
    motion: Optional[float] = None   # điểm chuyển động, càng nhỏ càng tĩnh
    reason: str = ""                 # giải thích khi không có số

    # Chỉ dùng cho demo/gỡ lỗi, KHÔNG gửi qua mạng.
    spectrum: Optional[SpectrumResult] = field(default=None, repr=False)

    def to_dict(self) -> dict:
        """Bản gọn để serialize JSON — đã bỏ spectrum."""
        data = asdict(self)
        data.pop("spectrum", None)
        return data


class _PersonBuffer:
    """Buffer tín hiệu của một người."""

    __slots__ = ("timestamps", "rgb", "centers", "scales",
                 "last_seen", "last_compute", "last_result")

    def __init__(self) -> None:
        self.timestamps: List[float] = []
        self.rgb: List[np.ndarray] = []
        self.centers: List[np.ndarray] = []
        self.scales: List[float] = []
        self.last_seen: float = 0.0
        self.last_compute: float = 0.0
        self.last_result: Optional[PulseResult] = None

    def append(self, ts: float, rgb: np.ndarray,
               center: np.ndarray, scale: float) -> None:
        self.timestamps.append(ts)
        self.rgb.append(rgb)
        self.centers.append(center)
        self.scales.append(scale)
        self.last_seen = ts

    def trim(self, window_sec: float) -> None:
        """Bỏ các mẫu cũ hơn cửa sổ phân tích."""
        if not self.timestamps:
            return
        cutoff = self.timestamps[-1] - window_sec
        keep = 0
        for i, ts in enumerate(self.timestamps):
            if ts >= cutoff:
                keep = i
                break
        else:
            keep = len(self.timestamps) - 1
        if keep > 0:
            del self.timestamps[:keep]
            del self.rgb[:keep]
            del self.centers[:keep]
            del self.scales[:keep]

    @property
    def duration(self) -> float:
        if len(self.timestamps) < 2:
            return 0.0
        return self.timestamps[-1] - self.timestamps[0]


class PulseMonitor:
    """Điều phối đo nhịp tim từ xa cho nhiều người cùng lúc.

    An toàn khi gọi từ nhiều luồng. Buffer của mỗi person_id tách biệt và
    tự động giải phóng sau person_ttl_sec nếu không có khung hình mới —
    điều này vá lỗi rò rỉ bộ nhớ của thiết kế dùng buffer vĩnh viễn.
    """

    def __init__(
        self,
        config: Optional[RPPGConfig] = None,
        extractor: Optional[ForeheadROIExtractor] = None,
    ) -> None:
        self.config = config or DEFAULT_CONFIG
        self._extractor = extractor or ForeheadROIExtractor(
            trim_percent=self.config.roi_trim_percent,
            min_pixels=self.config.roi_min_pixels,
        )
        self._owns_extractor = extractor is None
        self._buffers: Dict[str, _PersonBuffer] = {}
        self._lock = threading.RLock()

    @property
    def backend(self) -> str:
        """Backend phát hiện khuôn mặt đang dùng — nên log lúc khởi động."""
        return self._extractor.backend

    # -- API chính -------------------------------------------------------

    def process_frame(
        self,
        person_id: str,
        frame_bgr: np.ndarray,
        timestamp: Optional[float] = None,
        vehicle_stationary: bool = True,
    ) -> PulseResult:
        """Nạp một khung hình và trả về trạng thái hiện tại.

        Args:
            person_id: định danh người trong xe (ví dụ "driver", "seat_03").
            frame_bgr: khung hình BGR từ OpenCV.
            timestamp: thời điểm CHỤP tính bằng giây. Nếu để None sẽ dùng
                time.time() — chỉ chấp nhận được khi xử lý ngay tại chỗ.
                Nếu khung hình đi qua hàng đợi hay qua mạng thì BẮT BUỘC
                truyền timestamp gắn lúc chụp, nếu không trục thời gian sai
                và BPM sai một cách âm thầm.
            vehicle_stationary: tầng trên truyền vào. False -> không đo.
        """
        ts = time.time() if timestamp is None else float(timestamp)

        if not vehicle_stationary:
            with self._lock:
                self._buffers.pop(person_id, None)
            return PulseResult(
                person_id=person_id,
                status=STATUS_MOVING,
                timestamp=ts,
                reason="xe đang di chuyển — rPPG không hợp lệ",
            )

        sample = self._extractor.extract(frame_bgr, timestamp_ms=int(ts * 1000))

        with self._lock:
            self._evict_stale(ts)
            buf = self._buffers.setdefault(person_id, _PersonBuffer())

            if not sample.ok:
                buf.last_seen = ts
                return PulseResult(
                    person_id=person_id,
                    status=STATUS_NO_FACE,
                    timestamp=ts,
                    buffer_sec=buf.duration,
                    reason=sample.reason,
                )

            buf.append(ts, sample.rgb_mean, sample.center, sample.scale)
            buf.trim(self.config.window_sec)

            duration = buf.duration
            progress = min(1.0, duration / self.config.min_window_sec)

            if duration < self.config.min_window_sec:
                result = PulseResult(
                    person_id=person_id,
                    status=STATUS_CALIBRATING,
                    timestamp=ts,
                    buffer_sec=duration,
                    progress=progress,
                    reason=f"đang tích lũy {duration:.1f}/"
                           f"{self.config.min_window_sec:.0f}s",
                )
                buf.last_result = result
                return result

            # Không tính lại FFT mỗi khung hình.
            if (buf.last_result is not None
                    and ts - buf.last_compute < self.config.update_interval_sec):
                cached = buf.last_result
                cached.timestamp = ts
                cached.buffer_sec = duration
                return cached

            buf.last_compute = ts
            result = self._compute(person_id, buf, ts)
            buf.last_result = result
            return result

    # -- Tính toán -------------------------------------------------------

    def _compute(self, person_id: str, buf: _PersonBuffer,
                 ts: float) -> PulseResult:
        cfg = self.config
        duration = buf.duration

        base = dict(person_id=person_id, timestamp=ts,
                    buffer_sec=duration, progress=1.0)

        # --- Cổng đứng yên ---
        motion = motion_score(np.array(buf.centers), np.array(buf.scales))
        if cfg.motion_gate_enabled and motion > cfg.motion_threshold:
            return PulseResult(
                status=STATUS_UNAVAILABLE,
                motion=motion,
                reason=f"chuyển động quá lớn ({motion:.3f} > "
                       f"{cfg.motion_threshold:.3f})",
                **base,
            )

        # --- Resample -> POS -> bandpass -> FFT ---
        try:
            rgb_uniform, fps = resample_uniform(
                np.array(buf.timestamps),
                np.array(buf.rgb),
                cfg.resample_fps,
            )
        except ValueError as exc:
            return PulseResult(status=STATUS_UNAVAILABLE, motion=motion,
                               reason=f"resample thất bại: {exc}", **base)

        if fps < 2 * cfg.hr_max_hz:
            return PulseResult(
                status=STATUS_UNAVAILABLE, motion=motion,
                reason=f"fps quá thấp ({fps:.1f}) cho dải tần cần đo",
                **base,
            )

        pulse_raw = pos_algorithm(rgb_uniform, fps)
        pulse_filtered = bandpass_filter(
            pulse_raw, fps, cfg.hr_min_hz, cfg.hr_max_hz, cfg.bandpass_order
        )
        spectrum = estimate_hr(
            pulse_filtered, fps,
            low_hz=cfg.hr_min_hz,
            high_hz=cfg.hr_max_hz,
            peak_halfwidth_hz=cfg.sqi_peak_halfwidth_hz,
            include_harmonic=cfg.sqi_include_harmonic,
        )

        # --- Cổng chất lượng tín hiệu ---
        # Đây là điểm mấu chốt: FFT LUÔN LUÔN tìm được một đỉnh, kể cả khi
        # đầu vào hoàn toàn là nhiễu. Không có cổng này thì hệ thống không
        # có cách nào phân biệt "đo được 72" với "đoán bừa ra 72".
        if spectrum.bpm is None:
            return PulseResult(status=STATUS_UNAVAILABLE, motion=motion,
                               spectrum=spectrum,
                               reason="không tìm được đỉnh phổ", **base)

        if spectrum.sqi_db < cfg.sqi_threshold_db:
            return PulseResult(
                status=STATUS_UNAVAILABLE,
                sqi_db=spectrum.sqi_db,
                motion=motion,
                spectrum=spectrum,
                reason=f"SQI thấp ({spectrum.sqi_db:.1f} < "
                       f"{cfg.sqi_threshold_db:.1f} dB)",
                **base,
            )

        return PulseResult(
            status=STATUS_OK,
            bpm=round(spectrum.bpm, 1),
            sqi_db=spectrum.sqi_db,
            motion=motion,
            spectrum=spectrum,
            **base,
        )

    # -- Quản lý vòng đời ------------------------------------------------

    def _evict_stale(self, now: float) -> None:
        """Giải phóng buffer của người đã rời khỏi khung hình."""
        ttl = self.config.person_ttl_sec
        stale = [pid for pid, b in self._buffers.items()
                 if now - b.last_seen > ttl]
        for pid in stale:
            del self._buffers[pid]

    def reset(self, person_id: Optional[str] = None) -> None:
        """Xóa buffer của một người, hoặc của tất cả nếu person_id là None."""
        with self._lock:
            if person_id is None:
                self._buffers.clear()
            else:
                self._buffers.pop(person_id, None)

    @property
    def tracked_persons(self) -> List[str]:
        with self._lock:
            return list(self._buffers.keys())

    def close(self) -> None:
        with self._lock:
            self._buffers.clear()
        if self._owns_extractor:
            self._extractor.close()

    def __enter__(self) -> "PulseMonitor":
        return self

    def __exit__(self, *exc) -> None:
        self.close()
