"""Lớp 2 — Xu hướng: PERCLOS 60s, ngáp/phút, gật/phút, hợp nhất Noisy-OR → mức 0-3.

Toàn bộ cửa sổ trượt tính theo HIỆU TIMESTAMP (time.monotonic() gắn lúc chụp
frame), không đếm frame — chịu được fps không đều.
"""
from __future__ import annotations

from dataclasses import dataclass, field


class PerclosAccumulator:
    """PERCLOS: tỷ lệ thời gian mắt nhắm trên cửa sổ trượt, tích luỹ theo khoảng thời gian."""

    def __init__(self, cua_so_giay: float):
        self.cua_so_giay = cua_so_giay
        self._closed_intervals: list[tuple[float, float]] = []  # (t_start, t_end) đã đóng
        self._current_start: float | None = None
        self._t_dau_tien: float | None = None

    def update(self, mat_nham: bool, t_capture: float) -> float:
        if self._t_dau_tien is None:
            self._t_dau_tien = t_capture

        if mat_nham:
            if self._current_start is None:
                self._current_start = t_capture
        else:
            if self._current_start is not None:
                self._closed_intervals.append((self._current_start, t_capture))
                self._current_start = None

        window_start = t_capture - self.cua_so_giay
        self._closed_intervals = [
            (s, e) for (s, e) in self._closed_intervals if e >= window_start
        ]

        closed_time = 0.0
        for s, e in self._closed_intervals:
            closed_time += max(0.0, min(e, t_capture) - max(s, window_start))
        if self._current_start is not None:
            closed_time += max(0.0, t_capture - max(self._current_start, window_start))

        elapsed = min(self.cua_so_giay, t_capture - self._t_dau_tien)
        if elapsed <= 1e-9:
            return 0.0
        return min(1.0, closed_time / elapsed)


class YawnDetector:
    """Ngáp: MAR > ngưỡng liên tục >= nguong_ngap_giay = 1 sự kiện, debounce giữa các sự kiện."""

    def __init__(self, nguong_mar: float, nguong_ngap_giay: float, debounce_giay: float, cua_so_phut: float):
        self.nguong_mar = nguong_mar
        self.nguong_ngap_giay = nguong_ngap_giay
        self.debounce_giay = debounce_giay
        self.window_s = cua_so_phut * 60.0

        self._t_bat_dau_mo: float | None = None
        self._da_dem_episode: bool = False
        self._last_event_t: float | None = None
        self._events: list[float] = []
        self._t_dau_tien: float | None = None

    def update(self, mar: float, t_capture: float) -> bool:
        if self._t_dau_tien is None:
            self._t_dau_tien = t_capture

        mo_mieng = mar > self.nguong_mar
        if not mo_mieng:
            self._t_bat_dau_mo = None
            self._da_dem_episode = False
            return False

        if self._t_bat_dau_mo is None:
            self._t_bat_dau_mo = t_capture

        if self._da_dem_episode:
            return False

        thoi_luong = t_capture - self._t_bat_dau_mo
        if thoi_luong < self.nguong_ngap_giay:
            return False

        if self._last_event_t is not None and (t_capture - self._last_event_t) < self.debounce_giay:
            self._da_dem_episode = True
            return False

        self._da_dem_episode = True
        self._last_event_t = t_capture
        self._events.append(t_capture)
        return True

    def su_kien_tren_phut(self, now: float) -> float:
        self._events = [t for t in self._events if now - t <= self.window_s]
        elapsed = min(self.window_s, now - self._t_dau_tien) if self._t_dau_tien is not None else 0.0
        if elapsed <= 1e-9:
            return 0.0
        return len(self._events) / (elapsed / 60.0)


class NodDetector:
    """Gật đầu: pitch vượt ngưỡng rồi hồi lại trong <= hoi_phuc_toi_da_giay = 1 sự kiện."""

    def __init__(self, nguong_pitch_do: float, hoi_phuc_toi_da_giay: float, cua_so_phut: float):
        self.nguong_pitch_do = nguong_pitch_do
        self.hoi_phuc_toi_da_giay = hoi_phuc_toi_da_giay
        self.window_s = cua_so_phut * 60.0

        self._dang_vuot: bool = False
        self._t_vuot_nguong: float | None = None
        self._events: list[float] = []
        self._t_dau_tien: float | None = None

    def update(self, pitch_deg: float, t_capture: float) -> bool:
        if self._t_dau_tien is None:
            self._t_dau_tien = t_capture

        vuot_nguong = pitch_deg >= self.nguong_pitch_do

        if vuot_nguong:
            if not self._dang_vuot:
                self._dang_vuot = True
                self._t_vuot_nguong = t_capture
            return False

        if self._dang_vuot:
            thoi_luong = t_capture - self._t_vuot_nguong
            self._dang_vuot = False
            if thoi_luong <= self.hoi_phuc_toi_da_giay:
                self._events.append(t_capture)
                return True
        return False

    def su_kien_tren_phut(self, now: float) -> float:
        self._events = [t for t in self._events if now - t <= self.window_s]
        elapsed = min(self.window_s, now - self._t_dau_tien) if self._t_dau_tien is not None else 0.0
        if elapsed <= 1e-9:
            return 0.0
        return len(self._events) / (elapsed / 60.0)


@dataclass
class Layer2Snapshot:
    t_capture: float
    perclos: float
    ngap_phut: float
    gat_phut: float
    layer1_gan_day: bool
    risk: float
    muc: int
    xi: dict = field(default_factory=dict)


class NoisyOrFusion:
    def __init__(self, trong_so: dict[str, float], chuan_hoa: dict[str, float], muc_theo_risk: list[dict]):
        self.trong_so = trong_so
        self.nguong_ngap_phut_max = chuan_hoa["nguong_ngap_phut_max"]
        self.nguong_gat_phut_max = chuan_hoa["nguong_gat_phut_max"]
        # sắp xếp giảm dần theo ngưỡng để lấy mức cao nhất thoả điều kiện risk >= ngưỡng
        self.muc_theo_risk = sorted(muc_theo_risk, key=lambda r: r["nguong"], reverse=True)

    def tinh(self, perclos: float, perclos_canh_bao: float, ngap_phut: float, gat_phut: float,
              layer1_gan_day: bool) -> tuple[float, int, dict]:
        x_perclos = min(1.0, perclos / perclos_canh_bao) if perclos_canh_bao > 0 else 0.0
        x_ngap = min(1.0, ngap_phut / self.nguong_ngap_phut_max) if self.nguong_ngap_phut_max > 0 else 0.0
        x_gat = min(1.0, gat_phut / self.nguong_gat_phut_max) if self.nguong_gat_phut_max > 0 else 0.0
        x_layer1 = 1.0 if layer1_gan_day else 0.0

        xi = {"perclos": x_perclos, "ngap_phut": x_ngap, "gat_phut": x_gat, "layer1_gan_day": x_layer1}

        prod = 1.0
        for key, x in xi.items():
            w = self.trong_so.get(key, 0.0)
            prod *= (1.0 - w * x)
        risk = 1.0 - prod

        muc = 0
        for r in self.muc_theo_risk:
            if risk >= r["nguong"]:
                muc = r["muc"]
                break

        return risk, muc, xi


class Layer2Trend:
    def __init__(self, cfg: dict):
        perclos_cfg = cfg["perclos"]
        ngap_cfg = cfg["ngap"]
        gat_cfg = cfg["gat_dau"]
        noisy_or_cfg = cfg["noisy_or"]

        self.perclos_acc = PerclosAccumulator(perclos_cfg["cua_so_giay"])
        self.nguong_perclos_cao = perclos_cfg["nguong_perclos_cao"]

        self.yawn_detector = YawnDetector(
            nguong_mar=ngap_cfg["nguong_mar"],
            nguong_ngap_giay=ngap_cfg["nguong_ngap_giay"],
            debounce_giay=ngap_cfg["debounce_giay"],
            cua_so_phut=ngap_cfg["cua_so_phut"],
        )
        self.nod_detector = NodDetector(
            nguong_pitch_do=gat_cfg["nguong_pitch_do"],
            hoi_phuc_toi_da_giay=gat_cfg["hoi_phuc_toi_da_giay"],
            cua_so_phut=gat_cfg["cua_so_phut"],
        )
        self.dao_dau_pitch = gat_cfg.get("dao_dau_pitch", False)

        self.fusion = NoisyOrFusion(
            trong_so=noisy_or_cfg["trong_so"],
            chuan_hoa=noisy_or_cfg["chuan_hoa"],
            muc_theo_risk=noisy_or_cfg["muc_theo_risk"],
        )
        self.cua_so_layer1_giay = noisy_or_cfg["chuan_hoa"]["cua_so_layer1_giay"]

        self._layer1_event_times: list[float] = []

    def bao_layer1_event(self, t_capture: float) -> None:
        self._layer1_event_times.append(t_capture)

    def update(
        self,
        dang_nham: bool,
        mar: float,
        pitch_deg: float,
        t_capture: float,
        perclos_canh_bao: float,
    ) -> Layer2Snapshot:
        """`dang_nham` phải đến từ CÙNG một EyeStateSource dùng cho Lớp 1 —
        để PERCLOS và còi Lớp 1 luôn thống nhất về "mắt đang nhắm", bất kể
        nguồn tín hiệu đang cấu hình là ear/blendshape/hybrid/onnx."""
        perclos = self.perclos_acc.update(dang_nham, t_capture)
        self.yawn_detector.update(mar, t_capture)
        self.nod_detector.update(pitch_deg, t_capture)

        ngap_phut = self.yawn_detector.su_kien_tren_phut(t_capture)
        gat_phut = self.nod_detector.su_kien_tren_phut(t_capture)

        self._layer1_event_times = [
            t for t in self._layer1_event_times if t_capture - t <= self.cua_so_layer1_giay
        ]
        layer1_gan_day = len(self._layer1_event_times) > 0

        risk, muc, xi = self.fusion.tinh(perclos, perclos_canh_bao, ngap_phut, gat_phut, layer1_gan_day)

        # Quy tắc cứng: PERCLOS >= nguong_perclos_cao (cố định, không phụ thuộc mức nền) -> tối thiểu mức 2.
        if perclos >= self.nguong_perclos_cao and muc < 2:
            muc = 2

        return Layer2Snapshot(
            t_capture=t_capture,
            perclos=perclos,
            ngap_phut=ngap_phut,
            gat_phut=gat_phut,
            layer1_gan_day=layer1_gan_day,
            risk=risk,
            muc=muc,
            xi=xi,
        )
