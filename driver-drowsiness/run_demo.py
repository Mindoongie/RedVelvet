"""Khởi động toàn bộ demo bằng MỘT lệnh: server (process riêng) + edge (process riêng) + mở dashboard.

Edge và server chạy như hai process độc lập (đúng kiến trúc edge-first) —
tắt process server không ảnh hưởng process edge, có thể demo trực tiếp bằng
cách Ctrl+C hoặc kill process server trong lúc edge vẫn chạy.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
import time
import webbrowser
from pathlib import Path

import requests
import yaml

ROOT = Path(__file__).resolve().parent


def _doi_server_san_sang(url: str, timeout_giay: float = 15.0) -> bool:
    t0 = time.monotonic()
    while time.monotonic() - t0 < timeout_giay:
        try:
            resp = requests.get(url, timeout=1)
            if resp.status_code == 200:
                return True
        except Exception:
            pass
        time.sleep(0.3)
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Chạy demo hệ thống cảnh báo hành vi mất an toàn (ngủ gật)")
    parser.add_argument("--config", default="config.yaml")
    parser.add_argument("--no-browser", action="store_true", help="Không tự mở trình duyệt dashboard")
    parser.add_argument("--tai-xe-id", default=None, help="Ghi đè uplink.tai_xe_id — chọn profile cá nhân đã calibrate")
    args = parser.parse_args()

    with open(ROOT / args.config, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f)

    host = cfg["server"]["host"]
    port = cfg["server"]["port"]
    server_url = f"http://{host}:{port}"

    print(f"[run_demo] Khởi động server tại {server_url} ...")
    server_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "server.app:app", "--host", host, "--port", str(port)],
        cwd=str(ROOT),
    )

    edge_proc = None
    try:
        if _doi_server_san_sang(f"{server_url}/api/context"):
            print("[run_demo] Server đã sẵn sàng.")
            if not args.no_browser:
                webbrowser.open(server_url)
        else:
            print("[run_demo] CẢNH BÁO: server chưa phản hồi sau 15s — vẫn tiếp tục khởi động edge "
                  "(minh hoạ đúng ràng buộc: Lớp 1 không phụ thuộc server).")

        print("[run_demo] Khởi động edge (cửa sổ preview sẽ mở, nhấn 'q' để thoát) ...")
        edge_cmd = [sys.executable, "-m", "edge.main", "--config", args.config]
        if args.tai_xe_id:
            edge_cmd += ["--tai-xe-id", args.tai_xe_id]
        edge_proc = subprocess.Popen(edge_cmd, cwd=str(ROOT))
        edge_proc.wait()
    except KeyboardInterrupt:
        print("\n[run_demo] Nhận Ctrl+C — đang dừng...")
    finally:
        for proc, ten in ((edge_proc, "edge"), (server_proc, "server")):
            if proc is not None and proc.poll() is None:
                proc.terminate()
                try:
                    proc.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    proc.kill()
        print("[run_demo] Đã dừng toàn bộ demo.")


if __name__ == "__main__":
    main()
