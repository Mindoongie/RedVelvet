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
    """Gật đầu — đếm 1 sự kiện cho mỗi episode pitch vượt ngưỡng, theo MỘT trong hai đường:

    1. GIỮ ĐỦ LÂU: pitch chúi liên tục >= `toi_thieu_giu_giay` -> đếm NGAY, không
       chờ ngẩng lên. Bản cũ chỉ chốt sự kiện ở nhánh hồi phục, nên đầu gục xuống
       rồi nằm im — ca nguy hiểm nhất — không ghi nhận được gì cả.
    2. HỒI PHỤC KỊP: pitch trở lại dưới ngưỡng trong <= `hoi_phuc_toi_da_giay`
       -> đếm lúc ngẩng lên. Giữ đường cũ cho cú gật nhanh, nông chưa đủ (1).

    Mỗi episode đếm tối đa 1 lần (`_da_dem_episode`), nên hai đường trên không
    cộng trùng, và `ghi_nhan_gat_tu_su_kien_ngoai()` cũng tôn trọng cờ này.

    Mất landmark: main.py gọi `bao_mat_landmark()` mỗi frame mất mặt, khoảng
    trống đó bị TRỪ khỏi thời lượng chúi. Ngược với Lớp 1 — nơi gap được cộng
    vào vì mắt đang nhắm lúc mất mặt thì vẫn coi như đang nhắm; ở đây gap không
    phải bằng chứng đầu vẫn đang chúi, và tính vào sẽ thổi `thoi_luong` vượt
    `hoi_phuc_toi_da_giay` khiến cú gật bị vứt oan.
    """

    def __init__(self, nguong_pitch_do: float, hoi_phuc_toi_da_giay: float, cua_so_phut: float,
                 toi_thieu_giu_giay: float = 1.0):
        self.nguong_pitch_do = nguong_pitch_do
        self.hoi_phuc_toi_da_giay = hoi_phuc_toi_da_giay
        self.toi_thieu_giu_giay = toi_thieu_giu_giay
        self.window_s = cua_so_phut * 60.0

        self._dang_vuot: bool = False
        self._t_vuot_nguong: float | None = None
        self._da_dem_episode: bool = False
        self._tong_gap_giay: float = 0.0
        self._t_mat_landmark_tu: float | None = None
        self._events: list[float] = []
        self._t_dau_tien: float | None = None

    def update(self, pitch_deg: float, t_capture: float) -> bool:
        if self._t_dau_tien is None:
            self._t_dau_tien = t_capture
        self._chot_gap(t_capture)

        if pitch_deg >= self.nguong_pitch_do:
            if not self._dang_vuot:
                self._dang_vuot = True
                self._t_vuot_nguong = t_capture
                self._da_dem_episode = False
                self._tong_gap_giay = 0.0
            if self._da_dem_episode:
                return False
            if self._thoi_luong(t_capture) < self.toi_thieu_giu_giay:
                return False
            self._da_dem_episode = True          # đường 1
            self._events.append(t_capture)
            return True

        if not self._dang_vuot:
            return False

        thoi_luong = self._thoi_luong(t_capture)
        da_dem = self._da_dem_episode
        self._reset_episode()
        if da_dem or thoi_luong > self.hoi_phuc_toi_da_giay:
            return False
        self._events.append(t_capture)           # đường 2
        return True

    def bao_mat_landmark(self, t_capture: float) -> None:
        """Gọi MỖI FRAME không có landmark. Đồng hồ episode tạm dừng: mốc bắt
        đầu khoảng trống được ghi lại, `_chot_gap()` cộng dồn khi landmark quay
        lại. Ngoài episode chúi đầu thì không cần theo dõi gì."""
        if not self._dang_vuot:
            return
        if self._t_mat_landmark_tu is None:
            self._t_mat_landmark_tu = t_capture

    def ghi_nhan_gat_tu_su_kien_ngoai(self, t_capture: float) -> bool:
        """main.py gọi khi FaceLossTracker phát `mat_mat_sau_chui_dau` — mất
        landmark ngay lúc pitch đang chúi quá ngưỡng LÀ bằng chứng của một cú
        gật, nhưng `update()` không bao giờ nhìn thấy frame ngẩng lên nên đường
        (2) không thể chốt. Trả về True nếu thực sự cộng thêm 1 sự kiện."""
        if self._t_dau_tien is None:
            self._t_dau_tien = t_capture
        if self._da_dem_episode:
            return False
        self._da_dem_episode = True
        self._events.append(t_capture)
        return True

    def _chot_gap(self, t_capture: float) -> None:
        """Landmark khả dụng trở lại — cộng khoảng vừa mất vào tổng gap của episode."""
        if self._t_mat_landmark_tu is None:
            return
        self._tong_gap_giay += max(0.0, t_capture - self._t_mat_landmark_tu)
        self._t_mat_landmark_tu = None

    def _thoi_luong(self, t_capture: float) -> float:
        """Thời lượng đầu đã chúi, ĐÃ TRỪ các khoảng mất landmark."""
        if self._t_vuot_nguong is None:
            return 0.0
        return max(0.0, t_capture - self._t_vuot_nguong - self._tong_gap_giay)

    def _reset_episode(self) -> None:
        self._dang_vuot = False
        self._t_vuot_nguong = None
        self._da_dem_episode = False
        self._tong_gap_giay = 0.0
        self._t_mat_landmark_tu = None

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
            toi_thieu_giu_giay=gat_cfg.get("toi_thieu_giu_giay", 1.0),
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

    def bao_mat_landmark(self, t_capture: float) -> None:
        """Gọi mỗi frame mất landmark — khi đó `update()` KHÔNG chạy, nên bộ đếm
        gật cần được báo riêng để tạm dừng đồng hồ. PERCLOS và ngáp không cần:
        cả hai chỉ tích luỹ từ chính các frame khả dụng."""
        self.nod_detector.bao_mat_landmark(t_capture)

    def bao_gat_tu_mat_mat(self, t_capture: float) -> bool:
        """Cộng 1 sự kiện gật từ `mat_mat_sau_chui_dau` (đầu chúi quá ngưỡng rồi
        landmark rớt). Trả về True nếu thực sự cộng — False khi episode chúi đầu
        hiện tại đã được `update()` đếm rồi, tránh cộng trùng."""
        return self.nod_detector.ghi_nhan_gat_tu_su_kien_ngoai(t_capture)

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
