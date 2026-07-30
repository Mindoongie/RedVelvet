"""Coverage (nguyên tắc "hai con số") + phát hiện mất mặt (item 3 + phần
mat_mat_sau_chui_dau của item 7).

Coverage đo bằng HIỆU TIMESTAMP, không đếm frame — nhất quán với toàn bộ
phần còn lại của hệ thống.
"""
from __future__ import annotations

from dataclasses import dataclass


class CoverageTracker:
    def __init__(self):
        self._t_gan_nhat: float | None = None
        self._thoi_gian_kha_dung: float = 0.0
        self._thoi_gian_tong: float = 0.0

    def cap_nhat(self, t_capture: float, kha_dung: bool) -> None:
        if self._t_gan_nhat is None:
            self._t_gan_nhat = t_capture
            return
        dt = t_capture - self._t_gan_nhat
        if dt > 0:
            self._thoi_gian_tong += dt
            if kha_dung:
                self._thoi_gian_kha_dung += dt
        self._t_gan_nhat = t_capture

    @property
    def coverage(self) -> float:
        if self._thoi_gian_tong <= 1e-9:
            return 0.0
        return self._thoi_gian_kha_dung / self._thoi_gian_tong

    @property
    def thoi_gian_tong_giay(self) -> float:
        return self._thoi_gian_tong

    @property
    def thoi_gian_kha_dung_giay(self) -> float:
        return self._thoi_gian_kha_dung


@dataclass
class FaceLossEvent:
    loai: str          # "khong_kha_dung" | "mat_mat_sau_chui_dau"
    t_bat_dau: float
    pitch_truoc_do: float | None = None


class FaceLossTracker:
    """Theo dõi mất landmark liên tục để:
    1) phát `khong_kha_dung` khi mất > `khong_kha_dung_giay` (mặc định 2s) —
       KHÔNG phải cảnh báo ngủ gật, chỉ báo "hết dữ liệu đáng tin".
    2) phát `mat_mat_sau_chui_dau` NGAY khi mất mặt xảy ra lúc pitch đang
       chúi xuống vượt ngưỡng gật đầu — mẫu hình mất landmark nguy hiểm nhất
       (đầu gục đúng lúc landmark rớt) không được phép trôi qua im lặng.
    """

    def __init__(self, khong_kha_dung_giay: float, nguong_pitch_chui_do: float):
        self.khong_kha_dung_giay = khong_kha_dung_giay
        self.nguong_pitch_chui_do = nguong_pitch_chui_do
        self._t_mat_tu: float | None = None
        self._da_bao_khong_kha_dung = False
        self._da_bao_chui_dau = False
        self._pitch_gan_nhat: float | None = None

    def cap_nhat_kha_dung(self, t_capture: float, pitch_deg: float | None) -> None:
        """Gọi khi landmark khả dụng frame này — ghi nhớ pitch gần nhất để
        dùng nếu frame sau bị mất mặt, và xoá mọi trạng thái "đang mất mặt"."""
        if pitch_deg is not None:
            self._pitch_gan_nhat = pitch_deg
        self._t_mat_tu = None
        self._da_bao_khong_kha_dung = False
        self._da_bao_chui_dau = False

    def cap_nhat_mat_landmark(self, t_capture: float) -> FaceLossEvent | None:
        """Gọi khi landmark KHÔNG khả dụng frame này. Trả về tối đa 1 sự kiện
        mỗi lần gọi (mat_mat_sau_chui_dau ưu tiên phát ngay lúc vừa mất;
        khong_kha_dung phát sau khi đủ thời lượng)."""
        vua_mat_lan_dau = self._t_mat_tu is None
        if vua_mat_lan_dau:
            self._t_mat_tu = t_capture

        if (
            vua_mat_lan_dau
            and not self._da_bao_chui_dau
            and self._pitch_gan_nhat is not None
            and self._pitch_gan_nhat >= self.nguong_pitch_chui_do
        ):
            self._da_bao_chui_dau = True
            return FaceLossEvent("mat_mat_sau_chui_dau", t_capture, self._pitch_gan_nhat)

        if not self._da_bao_khong_kha_dung and (t_capture - self._t_mat_tu) >= self.khong_kha_dung_giay:
            self._da_bao_khong_kha_dung = True
            return FaceLossEvent("khong_kha_dung", self._t_mat_tu)

        return None
