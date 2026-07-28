"""Nạp config.yaml một lần và chia sẻ cho toàn bộ edge process."""
from __future__ import annotations

import threading
from pathlib import Path
from typing import Any

import yaml

_lock = threading.Lock()
_config: dict[str, Any] | None = None
_config_path: Path | None = None


def load_config(path: str | Path = "config.yaml") -> dict[str, Any]:
    """Nạp (hoặc nạp lại) config.yaml. An toàn để gọi nhiều lần."""
    global _config, _config_path
    with _lock:
        _config_path = Path(path)
        with open(_config_path, "r", encoding="utf-8") as f:
            _config = yaml.safe_load(f)
        return _config


def get_config() -> dict[str, Any]:
    if _config is None:
        return load_config()
    return _config


def reload_config() -> dict[str, Any]:
    if _config_path is None:
        return load_config()
    return load_config(_config_path)
