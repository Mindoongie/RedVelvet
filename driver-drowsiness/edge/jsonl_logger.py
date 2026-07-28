"""Ghi JSONL append-only, dùng chung cho bat_dong_nguon.jsonl, frame-log
sampling, và events.jsonl của báo cáo phiên."""
from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any


class JsonlLogger:
    def __init__(self, path: str | Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def ghi(self, record: dict[str, Any]) -> None:
        line = json.dumps(record, ensure_ascii=False)
        with self._lock:
            with open(self.path, "a", encoding="utf-8") as f:
                f.write(line + "\n")
