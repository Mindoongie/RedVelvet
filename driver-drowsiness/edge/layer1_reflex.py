"""Lớp 1 — Phản xạ: phát hiện nhắm mắt kéo dài theo THỜI GIAN THỰC.

Không phụ thuộc uplink, server hay dashboard. Mọi thời lượng tính bằng hiệu
timestamp (time.monotonic() gắn lúc chụp frame), không đếm frame.

v2: không tự tính "nhắm mắt" từ EAR nữa — nhận thẳng `dang_nham`/`kha_dung`
đã được một EyeStateSource (edge/eye_state.py) quyết định, để Lớp 1 hoạt
động thống nhất với bất kỳ nguồn tín hiệu nào (ear/blendshape/hybrid/onnx).
"""
from __future__ import annotations

import time
from dataclasses import dataclass


@dataclass
class Layer1Event:
    t_start_nham_mat: float   # timestamp bắt đầu episode nhắm mắt
    t_frame_kich_hoat: float  # timestamp CHỤP của frame làm ngưỡng bị vượt
    t_quyet_dinh: float       # time.monotonic() lúc engine ra quyết định kích còi
    latency_ms: float         # (t_quyet_dinh - t_frame_kich_hoat) * 1000 — độ trễ pipeline
    thoi_luong_nham_mat_giay: float
    ear_tai_kich_hoat: float | None = None


class Layer1Reflex:
    def __init__(
        self,
        nguong_nham_mat_giay_mac_dinh: float,
        chop_mat_toi_da_giay: float,
        canh_bao_do_tre_ms: float,
        mat_landmark_toi_da_giay: float = 1.5,
    ):
        self.chop_mat_toi_da_giay = chop_mat_toi_da_giay
        self.canh_bao_do_tre_ms = canh_bao_do_tre_ms
        self.mat_landmark_toi_da_giay = mat_landmark_toi_da_giay
        self._nguong_nham_mat_giay = nguong_nham_mat_giay_mac_dinh
        self._t_bat_dau_nham: float | None = None
        self._da_kich_hoat_episode: bool = False
        self._t_mat_landmark_tu: float | None = None

    @property
    def nguong_hieu_dung(self) -> float:
        return self._nguong_nham_mat_giay

    @property
    def dang_nham_mat(self) -> bool:
        return self._t_bat_dau_nham is not None

    def cap_nhat_nguong(self, nguong_nham_mat_giay: float) -> None:
        """Lớp 3 gọi hàm này để hạ/nâng ngưỡng runtime, không cần restart process."""
        if nguong_nham_mat_giay < self.chop_mat_toi_da_giay:
            print(
                f"[layer1] CẢNH BÁO CẤU HÌNH: ngưỡng nhắm mắt hiệu dụng "
                f"({nguong_nham_mat_giay:.2f}s) thấp hơn ngưỡng chớp mắt tối đa "
                f"({self.chop_mat_toi_da_giay:.2f}s) — nguy cơ báo giả trên chớp mắt bình thường."
            )
        self._nguong_nham_mat_giay = nguong_nham_mat_giay

    def update(
        self,
        dang_nham: bool,
        kha_dung: bool,
        t_capture: float,
        ear: float | None = None,
    ) -> Layer1Event | None:
        """Gọi MỖI FRAME, kể cả khi kha_dung=False (mất landmark) — để bộ đếm
        chuỗi nhắm mắt xử lý đúng quy tắc "không reset khi mất mặt ngắn"."""
        if not kha_dung:
            self._xu_ly_mat_landmark(t_capture)
            return None

        self._t_mat_landmark_tu = None  # landmark khả dụng trở lại -> hết gap

        if not dang_nham:
            self._t_bat_dau_nham = None
            self._da_kich_hoat_episode = False
            return None

        if self._t_bat_dau_nham is None:
            self._t_bat_dau_nham = t_capture

        if self._da_kich_hoat_episode:
            # Đã báo cho episode nhắm mắt hiện tại rồi — chờ mở mắt mới cho phép báo lại.
            return None

        thoi_luong = t_capture - self._t_bat_dau_nham
        if thoi_luong < self._nguong_nham_mat_giay:
            return None

        t_quyet_dinh = time.monotonic()
        latency_ms = (t_quyet_dinh - t_capture) * 1000.0
        self._da_kich_hoat_episode = True

        if latency_ms > self.canh_bao_do_tre_ms:
            print(f"[layer1] CẢNH BÁO ĐỘ TRỄ: latency={latency_ms:.1f}ms vượt ngân sách {self.canh_bao_do_tre_ms}ms")

        return Layer1Event(
            t_start_nham_mat=self._t_bat_dau_nham,
            t_frame_kich_hoat=t_capture,
            t_quyet_dinh=t_quyet_dinh,
            latency_ms=latency_ms,
            thoi_luong_nham_mat_giay=thoi_luong,
            ear_tai_kich_hoat=ear,
        )

    def _xu_ly_mat_landmark(self, t_capture: float) -> None:
        """Mất landmark giữa chuỗi nhắm mắt: KHÔNG reset bộ đếm nếu gap còn
        trong hạn `mat_landmark_toi_da_giay` — bộ đếm coi như tiếp tục chạy
        (vì `_t_bat_dau_nham` không đổi, thời lượng tính ra sẽ tự bao gồm cả
        gap khi landmark quay lại). Gap quá hạn mới reset chuỗi."""
        if self._t_bat_dau_nham is None:
            return  # không đang trong chuỗi nhắm -> mất mặt không ảnh hưởng

        if self._t_mat_landmark_tu is None:
            self._t_mat_landmark_tu = t_capture

        gap = t_capture - self._t_mat_landmark_tu
        if gap > self.mat_landmark_toi_da_giay:
            self._t_bat_dau_nham = None
            self._da_kich_hoat_episode = False
            self._t_mat_landmark_tu = None
