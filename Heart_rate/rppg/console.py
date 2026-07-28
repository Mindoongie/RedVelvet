"""
Chuẩn bị console để in được tiếng Việt và mã màu.

Vì sao cần: console Windows mặc định dùng codepage cp1252, không mã hóa
được chữ có dấu. Toàn bộ thông báo trong module này là tiếng Việt, nên
nếu không gọi setup_console() thì chương trình chết ngay dòng print đầu
tiên với UnicodeEncodeError — trước cả khi chạm tới thuật toán.

Chỉ dùng cho script chạy trực tiếp (demo.py, test_algorithms.py).
Thư viện lõi không in ra gì nên không cần.
"""

from __future__ import annotations

import os
import sys


def _enable_ansi_on_windows() -> bool:
    """Bật xử lý mã màu ANSI cho console Windows. True nếu thành công."""
    if os.name != "nt":
        return True
    try:
        import ctypes

        kernel32 = ctypes.windll.kernel32
        # -11 = STD_OUTPUT_HANDLE, 0x0004 = ENABLE_VIRTUAL_TERMINAL_PROCESSING
        handle = kernel32.GetStdHandle(-11)
        mode = ctypes.c_uint32()
        if not kernel32.GetConsoleMode(handle, ctypes.byref(mode)):
            return False
        return bool(kernel32.SetConsoleMode(handle, mode.value | 0x0004))
    except Exception:
        return False


def setup_console() -> bool:
    """Cho phép in UTF-8 và bật màu nếu được. Trả về True nếu dùng được màu.

    Gọi một lần ở đầu script, trước bất kỳ lệnh print nào.

    Màu bị tắt khi đầu ra bị chuyển hướng vào file hoặc pipe — lúc đó mã
    ANSI chỉ là rác trong file log.
    """
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass   # không phải stream chuẩn, bỏ qua

    if not sys.stdout.isatty():
        return False
    if os.environ.get("NO_COLOR"):
        return False
    return _enable_ansi_on_windows()
