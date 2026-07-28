"""Còi cabin — phát âm thanh non-blocking từ chính process edge.

Thử các thư viện audio theo thứ tự ưu tiên trong config; nếu không thiết bị
audio nào khả dụng thì fallback in cảnh báo ra console (không được để lỗi
audio làm crash hoặc chặn vòng lặp chính).
"""
from __future__ import annotations

import threading

import numpy as np


def _make_tone(freq_hz: float, duration_s: float, amplitude: float, sample_rate: int = 44100) -> np.ndarray:
    t = np.linspace(0, duration_s, int(sample_rate * duration_s), endpoint=False)
    tone = amplitude * np.sin(2 * np.pi * freq_hz * t)
    # fade in/out ngắn để tránh click
    fade = min(200, len(tone) // 10)
    if fade > 0:
        envelope = np.ones_like(tone)
        envelope[:fade] = np.linspace(0, 1, fade)
        envelope[-fade:] = np.linspace(1, 0, fade)
        tone *= envelope
    return tone.astype(np.float32)


class Buzzer:
    def __init__(self, thu_vien_uu_tien: list[str], tan_so_hz: float, thoi_luong_giay: float, bien_do: float):
        self.freq_hz = tan_so_hz
        self.duration_s = thoi_luong_giay
        self.amplitude = bien_do
        self._backend = self._pick_backend(thu_vien_uu_tien)
        if self._backend is None:
            print("[buzzer] KHÔNG tìm được thiết bị audio khả dụng — fallback in cảnh báo console.")

    def _pick_backend(self, priorities: list[str]) -> str | None:
        for name in priorities:
            try:
                if name == "sounddevice":
                    import sounddevice as sd  # noqa: F401
                    sd.check_output_settings()
                    return "sounddevice"
                if name == "simpleaudio":
                    import simpleaudio  # noqa: F401
                    return "simpleaudio"
                if name == "pygame":
                    import pygame  # noqa: F401
                    return "pygame"
            except Exception:
                continue
        return None

    def sound(self) -> None:
        """Kích còi. Không blocking — chạy trên thread riêng, lỗi audio không văng lên caller."""
        threading.Thread(target=self._play_safe, daemon=True).start()

    def _play_safe(self) -> None:
        try:
            self._play()
        except Exception as exc:
            print(f"[buzzer] Lỗi phát âm thanh ({exc}) — CẢNH BÁO: NHẮM MẮT KÉO DÀI!")

    def _play(self) -> None:
        if self._backend is None:
            print("!!! CẢNH BÁO: NHẮM MẮT KÉO DÀI !!! (không có thiết bị audio)")
            return

        tone = _make_tone(self.freq_hz, self.duration_s, self.amplitude)

        if self._backend == "sounddevice":
            import sounddevice as sd
            sd.play(tone, samplerate=44100, blocking=True)
        elif self._backend == "simpleaudio":
            import simpleaudio as sa
            pcm = (tone * 32767).astype(np.int16)
            play_obj = sa.play_buffer(pcm, 1, 2, 44100)
            play_obj.wait_done()
        elif self._backend == "pygame":
            import pygame
            if not pygame.mixer.get_init():
                pygame.mixer.init(frequency=44100, size=-16, channels=1)
            pcm = (tone * 32767).astype(np.int16)
            sound = pygame.sndarray.make_sound(pcm)
            sound.play()
