"""Lớp 3 — Hook bối cảnh: đọc mức rủi ro nền, tra bảng ngưỡng tương ứng.

Nguồn ưu tiên: endpoint server (dashboard chỉnh được). Fallback: file cục bộ.
Poll định kỳ trên thread riêng; mất mạng/server tắt → giữ nguyên giá trị cuối
(KHÔNG chặn, KHÔNG raise lên vòng lặp chính của Lớp 1/2).
"""
from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any

import requests


class ContextProvider:
    def __init__(
        self,
        server_url: str,
        endpoint: str,
        file_fallback: str,
        poll_giay: float,
        muc_mac_dinh: str,
        nguong_theo_muc_nen: dict[str, dict[str, float]],
    ):
        self._server_url = server_url.rstrip("/")
        self._endpoint = endpoint
        self._file_fallback = Path(file_fallback)
        self._poll_giay = poll_giay
        self._nguong_theo_muc_nen = nguong_theo_muc_nen
        self._muc_hien_tai = muc_mac_dinh if muc_mac_dinh in nguong_theo_muc_nen else next(iter(nguong_theo_muc_nen))

        self._lock = threading.Lock()
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None

    def start(self) -> "ContextProvider":
        self._poll_once()  # lấy giá trị ngay khi khởi động, không đợi hết chu kỳ đầu
        self._thread = threading.Thread(target=self._poll_loop, daemon=True)
        self._thread.start()
        return self

    def stop(self) -> None:
        self._stop_event.set()
        if self._thread is not None:
            self._thread.join(timeout=2)

    def _poll_loop(self) -> None:
        while not self._stop_event.is_set():
            if self._stop_event.wait(self._poll_giay):
                break
            self._poll_once()

    def _poll_once(self) -> None:
        muc = self._try_server()
        if muc is None:
            muc = self._try_file()
        if muc is not None and muc in self._nguong_theo_muc_nen:
            with self._lock:
                if muc != self._muc_hien_tai:
                    print(f"[context] mức rủi ro nền đổi: {self._muc_hien_tai} -> {muc}")
                self._muc_hien_tai = muc
        # Nếu cả server và file đều không đọc được: giữ nguyên giá trị cuối cùng.

    def _try_server(self) -> str | None:
        try:
            resp = requests.get(f"{self._server_url}{self._endpoint}", timeout=2)
            if resp.status_code == 200:
                data: dict[str, Any] = resp.json()
                muc = data.get("muc")
                if muc is not None:
                    self._cache_vao_file(muc)
                return muc
        except Exception:
            return None
        return None

    def _cache_vao_file(self, muc: str) -> None:
        """Ghi cache cục bộ mỗi lần đọc server thành công — dùng làm fallback khi mất mạng."""
        try:
            self._file_fallback.parent.mkdir(parents=True, exist_ok=True)
            self._file_fallback.write_text(json.dumps({"muc": muc}), encoding="utf-8")
        except Exception:
            pass

    def _try_file(self) -> str | None:
        try:
            if self._file_fallback.exists():
                data = json.loads(self._file_fallback.read_text(encoding="utf-8"))
                return data.get("muc")
        except Exception:
            return None
        return None

    @property
    def muc_hien_tai(self) -> str:
        with self._lock:
            return self._muc_hien_tai

    def nguong_hien_tai(self) -> dict[str, float]:
        with self._lock:
            muc = self._muc_hien_tai
        return self._nguong_theo_muc_nen[muc]
