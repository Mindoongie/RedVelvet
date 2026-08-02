"""Cooldown chống spam theo loại cảnh báo.

Lớp 1 (còi) và Lớp 2 (event mức cảnh báo) dùng chung cơ chế: mỗi "khoá" cảnh
báo (loại, hoặc loại+mức) có cooldown riêng đọc từ config, tất cả theo
time.monotonic() — không đếm frame.
"""
from __future__ import annotations

import time


class AlertPolicy:
    def __init__(self, cooldown_layer1_giay: float, cooldown_layer2_giay: float):
        self._cooldown_layer1 = cooldown_layer1_giay
        self._cooldown_layer2 = cooldown_layer2_giay
        self._last_fire: dict[str, float] = {}

    def cho_phep_layer1_buzzer(self, now: float | None = None) -> bool:
        return self._cho_phep("layer1_buzzer", self._cooldown_layer1, now)

    def cho_phep_layer2_event(self, muc: int, now: float | None = None) -> bool:
        """Cùng mức không lặp lại trong cửa sổ cooldown; đổi mức luôn được phép báo ngay."""
        return self._cho_phep(f"layer2_event_muc_{muc}", self._cooldown_layer2, now)

    def cho_phep_su_kien_dac_biet(self, loai: str, now: float | None = None) -> bool:
        """Cooldown cho các loại sự kiện đặc biệt (vd mat_mat_sau_chui_dau) —
        dùng chung cửa sổ cooldown với layer2_event."""
        return self._cho_phep(f"dac_biet_{loai}", self._cooldown_layer2, now)

    def _cho_phep(self, key: str, cooldown: float, now: float | None) -> bool:
        now = now if now is not None else time.monotonic()
        last = self._last_fire.get(key)
        if last is not None and (now - last) < cooldown:
            return False
        self._last_fire[key] = now
        return True
