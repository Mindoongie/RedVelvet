"""Báo cáo phiên tự động (item 6). Kết thúc mỗi phiên chạy `edge/main.py`,
sinh vào `reports/sessions/<timestamp>/`:
  - bao_cao.md          : thời lượng, coverage, số sự kiện theo mức, độ trễ
                           Lớp 1 p50/p95, nguồn tín hiệu, profile đang dùng
  - perclos_timeline.png: PERCLOS theo thời gian, đánh dấu các sự kiện
  - latency_hist.png    : histogram độ trễ Lớp 1
  - events.jsonl        : toàn bộ sự kiện trong phiên
"""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import numpy as np

from edge.jsonl_logger import JsonlLogger


@dataclass
class SessionRecorder:
    nguon_tin_hieu: str
    profile_id: str | None = None
    perclos_series: list[tuple[float, float]] = field(default_factory=list)   # (t_capture, perclos)
    layer1_latencies_ms: list[float] = field(default_factory=list)
    su_kien_theo_muc: dict[int, int] = field(default_factory=dict)
    su_kien_dac_biet: dict[str, int] = field(default_factory=dict)
    events_log: list[dict[str, Any]] = field(default_factory=list)

    def ghi_perclos(self, t_capture: float, perclos: float) -> None:
        self.perclos_series.append((t_capture, perclos))

    def ghi_layer1_latency(self, latency_ms: float) -> None:
        self.layer1_latencies_ms.append(latency_ms)

    def ghi_su_kien(self, t_capture: float, muc: int, chi_so: dict[str, Any],
                     loai: str = "canh_bao_hanh_vi") -> None:
        self.su_kien_theo_muc[muc] = self.su_kien_theo_muc.get(muc, 0) + 1
        if loai != "canh_bao_hanh_vi":
            self.su_kien_dac_biet[loai] = self.su_kien_dac_biet.get(loai, 0) + 1
        self.events_log.append({"t_capture": t_capture, "muc": muc, "chi_so": chi_so, "loai": loai})


def _percentile(values: list[float], p: float) -> float | None:
    if not values:
        return None
    return float(np.percentile(np.asarray(values, dtype=np.float64), p))


def _ve_perclos_timeline(recorder: SessionRecorder, path: Path) -> bool:
    if len(recorder.perclos_series) < 2:
        return False
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    ts = [t for t, _ in recorder.perclos_series]
    t0 = ts[0]
    xs = [t - t0 for t in ts]
    ys = [p for _, p in recorder.perclos_series]

    fig, ax = plt.subplots(figsize=(9, 3.5))
    ax.plot(xs, ys, color="#5aa9ff", linewidth=1.5, label="PERCLOS")
    for ev in recorder.events_log:
        if ev["loai"] != "canh_bao_hanh_vi":
            continue
        ax.axvline(ev["t_capture"] - t0, color="#ff9f43", linestyle="--", linewidth=0.8, alpha=0.7)
    ax.set_xlabel("Thời gian phiên (giây)")
    ax.set_ylabel("PERCLOS (cửa sổ 60s)")
    ax.set_ylim(0, 1)
    ax.set_title("PERCLOS theo thời gian — đường đứt: sự kiện mức >= 2")
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)
    return True


def _ve_latency_hist(recorder: SessionRecorder, path: Path) -> bool:
    if not recorder.layer1_latencies_ms:
        return False
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(6, 3.5))
    ax.hist(recorder.layer1_latencies_ms, bins=20, color="#5aa9ff", edgecolor="#0f1420")
    ax.set_xlabel("Độ trễ Lớp 1 (ms)")
    ax.set_ylabel("Số lần")
    ax.set_title("Histogram độ trễ Lớp 1 (frame -> quyết định)")
    fig.tight_layout()
    fig.savefig(path)
    plt.close(fig)
    return True


def xuat_bao_cao(
    recorder: SessionRecorder,
    thoi_gian_tong_giay: float,
    thoi_gian_kha_dung_giay: float,
    thu_muc_goc: str,
    timestamp_str: str,
) -> Path:
    """timestamp_str do người gọi truyền vào (vd time.strftime(...)) — module
    này không tự lấy đồng hồ hệ thống, giữ cho hàm dễ test / tái lập."""
    thu_muc = Path(thu_muc_goc) / timestamp_str
    thu_muc.mkdir(parents=True, exist_ok=True)

    coverage = (thoi_gian_kha_dung_giay / thoi_gian_tong_giay) if thoi_gian_tong_giay > 1e-9 else 0.0
    p50 = _percentile(recorder.layer1_latencies_ms, 50)
    p95 = _percentile(recorder.layer1_latencies_ms, 95)

    events_logger = JsonlLogger(thu_muc / "events.jsonl")
    for ev in recorder.events_log:
        events_logger.ghi(ev)

    co_bieu_do_perclos = _ve_perclos_timeline(recorder, thu_muc / "perclos_timeline.png")
    co_bieu_do_latency = _ve_latency_hist(recorder, thu_muc / "latency_hist.png")

    dong = [
        "# Báo cáo phiên — Cảnh báo hành vi mất an toàn (ngủ gật)",
        "",
        f"- Thời điểm: {timestamp_str}",
        f"- Nguồn tín hiệu: `{recorder.nguon_tin_hieu}`",
        f"- Profile: `{recorder.profile_id or 'mặc định (chưa hiệu chỉnh)'}`",
        f"- Thời lượng phiên: {thoi_gian_tong_giay:.1f}s",
        f"- Coverage (nguyên tắc hai con số): **{coverage*100:.1f}%** khả dụng "
        f"({thoi_gian_kha_dung_giay:.1f}s / {thoi_gian_tong_giay:.1f}s)",
        "",
        "## Sự kiện theo mức cảnh báo",
        "",
        "| Mức | Số lần |",
        "|---|---|",
    ]
    for muc in sorted(recorder.su_kien_theo_muc):
        dong.append(f"| {muc} | {recorder.su_kien_theo_muc[muc]} |")
    if not recorder.su_kien_theo_muc:
        dong.append("| (không có) | 0 |")

    if recorder.su_kien_dac_biet:
        dong += ["", "## Sự kiện đặc biệt", "", "| Loại | Số lần |", "|---|---|"]
        for loai, n in recorder.su_kien_dac_biet.items():
            dong.append(f"| {loai} | {n} |")

    dong += [
        "",
        "## Độ trễ Lớp 1 (frame -> quyết định)",
        "",
        f"- p50: {p50:.1f} ms" if p50 is not None else "- p50: (không có sự kiện Lớp 1 trong phiên)",
        f"- p95: {p95:.1f} ms" if p95 is not None else "",
        "",
        "## Tệp đính kèm",
        "",
        f"- `perclos_timeline.png`{'' if co_bieu_do_perclos else ' (không đủ dữ liệu, chưa sinh)'}",
        f"- `latency_hist.png`{'' if co_bieu_do_latency else ' (không có sự kiện Lớp 1, chưa sinh)'}",
        "- `events.jsonl`",
        "",
    ]
    (thu_muc / "bao_cao.md").write_text("\n".join(line for line in dong if line is not None), encoding="utf-8")

    return thu_muc
