"""Gửi event JSON sang server — fire-and-forget, KHÔNG được chặn vòng lặp chính.

Chỉ gửi ảnh minh chứng khi kèm theo một sự kiện mức >= 2 (không bao giờ gửi
frame/base64 theo từng khung hình).
"""
from __future__ import annotations

import base64
import threading
import time
from pathlib import Path
from typing import Any

import requests


class Uplink:
    def __init__(
        self,
        server_url: str,
        event_endpoint: str,
        timeout_giay: float,
        xe_id: str,
        tai_xe_id: str,
        telemetry_endpoint: str | None = None,
    ):
        self._event_url = server_url.rstrip("/") + event_endpoint
        self._telemetry_url = server_url.rstrip("/") + telemetry_endpoint if telemetry_endpoint else None
        self._timeout = timeout_giay
        self._xe_id = xe_id
        self._tai_xe_id = tai_xe_id

    def gui_event(
        self,
        muc: int,
        chi_so: dict[str, Any],
        anh_minh_chung_path: str | None = None,
        loai: str = "canh_bao_hanh_vi",
    ) -> None:
        payload: dict[str, Any] = {
            "xe_id": self._xe_id,
            "tai_xe_id": self._tai_xe_id,
            "ts": time.time(),
            "muc": muc,
            "chi_so": chi_so,
            "loai": loai,
        }
        if anh_minh_chung_path is not None:
            try:
                data = Path(anh_minh_chung_path).read_bytes()
                payload["anh_minh_chung"] = base64.b64encode(data).decode("ascii")
            except Exception as exc:
                print(f"[uplink] Không đọc được ảnh minh chứng {anh_minh_chung_path}: {exc}")

        threading.Thread(target=self._gui_safe, args=(self._event_url, payload, "event"), daemon=True).start()

    def gui_telemetry(
        self,
        muc: int,
        perclos: float,
        ngap_phut: float,
        gat_phut: float,
        ear: float | None = None,
        layer1_latency_ms: float | None = None,
        kha_dung: bool | None = None,
        nguon_tin_hieu: str | None = None,
        profile: str | None = None,
        coverage: float | None = None,
    ) -> None:
        """Nhịp đo định kỳ NHẸ (không ảnh) để dashboard vẽ đồ thị PERCLOS realtime,
        hiển thị nguồn tín hiệu/profile đang dùng, và trạng thái coverage."""
        if self._telemetry_url is None:
            return
        payload: dict[str, Any] = {
            "xe_id": self._xe_id,
            "ts": time.time(),
            "muc": muc,
            "perclos": perclos,
            "ngap_phut": ngap_phut,
            "gat_phut": gat_phut,
            "ear": ear,
            "layer1_latency_ms": layer1_latency_ms,
            "kha_dung": kha_dung,
            "nguon_tin_hieu": nguon_tin_hieu,
            "profile": profile,
            "coverage": coverage,
        }
        threading.Thread(target=self._gui_safe, args=(self._telemetry_url, payload, "telemetry"), daemon=True).start()

    def _gui_safe(self, url: str, payload: dict[str, Any], nhan: str) -> None:
        try:
            requests.post(url, json=payload, timeout=self._timeout)
        except Exception as exc:
            print(f"[uplink] Gửi {nhan} thất bại (server có thể đang tắt) — ghi log, KHÔNG chặn edge: {exc}")
