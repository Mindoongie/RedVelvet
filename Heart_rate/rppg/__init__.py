"""
rPPG — đo nhịp tim không tiếp xúc từ camera thường.

Cách dùng tối thiểu:

    import time
    from rppg import PulseMonitor

    monitor = PulseMonitor()
    result = monitor.process_frame("driver", frame_bgr, timestamp=time.time())

    if result.status == "ok":
        hien_thi(result.bpm)
    else:
        hien_thi("--")     # KHÔNG hiển thị số cũ, KHÔNG đoán

Đọc docstring của monitor.py để biết hợp đồng giao diện đầy đủ.
"""

from .config import DEFAULT_CONFIG, RPPGConfig
from .monitor import (
    STATUS_CALIBRATING,
    STATUS_MOVING,
    STATUS_NO_FACE,
    STATUS_OK,
    STATUS_UNAVAILABLE,
    PulseMonitor,
    PulseResult,
)

__version__ = "0.1.0"

__all__ = [
    "PulseMonitor",
    "PulseResult",
    "RPPGConfig",
    "DEFAULT_CONFIG",
    "STATUS_OK",
    "STATUS_CALIBRATING",
    "STATUS_UNAVAILABLE",
    "STATUS_NO_FACE",
    "STATUS_MOVING",
]
