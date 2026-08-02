"""Giao diện nguồn tín hiệu trạng thái mắt — cắm được (EAR / blendshape /
hybrid / ONNX). Mọi implementation trả về DanhGiaMat với cùng hợp đồng, tầng
trên (Lớp 1, Lớp 2) chỉ tiêu thụ `.dang_nham` + `.kha_dung`, không quan tâm
nguồn nào sinh ra chúng.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional, Protocol

import numpy as np

from edge.hysteresis import HysteresisBoolState
from edge.jsonl_logger import JsonlLogger
from edge.metrics import eye_aspect_ratio


@dataclass
class DanhGiaMat:
    dang_nham: bool
    kha_dung: bool
    nguon: str
    ear: Optional[float] = None
    blink_mean: Optional[float] = None
    onnx_score: Optional[float] = None


class EyeStateSource(Protocol):
    ten: str

    def danh_gia(
        self,
        landmarks: np.ndarray | None,
        blendshapes: dict[str, float] | None,
        width: int,
        height: int,
        t_capture: float,
        frame_image: np.ndarray | None = None,
    ) -> DanhGiaMat: ...


class EarSource:
    ten = "ear"

    def __init__(self, nguong_vao: float, nguong_ra: float):
        self._hys = HysteresisBoolState(nguong_vao, nguong_ra, huong="duoi")

    def danh_gia(self, landmarks, blendshapes, width, height, t_capture, frame_image=None) -> DanhGiaMat:
        if landmarks is None:
            return DanhGiaMat(dang_nham=self._hys.trang_thai, kha_dung=False, nguon=self.ten)
        ear, _, _ = eye_aspect_ratio(landmarks, width, height)
        dang_nham = self._hys.cap_nhat(ear)
        return DanhGiaMat(dang_nham=dang_nham, kha_dung=True, nguon=self.ten, ear=ear)


class BlendshapeSource:
    ten = "blendshape"

    def __init__(self, nguong_vao: float, nguong_ra: float):
        self._hys = HysteresisBoolState(nguong_vao, nguong_ra, huong="tren")

    def danh_gia(self, landmarks, blendshapes, width, height, t_capture, frame_image=None) -> DanhGiaMat:
        if not blendshapes:
            return DanhGiaMat(dang_nham=self._hys.trang_thai, kha_dung=False, nguon=self.ten)
        blink_mean = (blendshapes.get("eyeBlinkLeft", 0.0) + blendshapes.get("eyeBlinkRight", 0.0)) / 2.0
        dang_nham = self._hys.cap_nhat(blink_mean)
        return DanhGiaMat(dang_nham=dang_nham, kha_dung=True, nguon=self.ten, blink_mean=blink_mean)


class HybridSource:
    """NHẮM chỉ khi CẢ HAI nguồn cùng báo nhắm (ưu tiên chống báo giả).

    Nếu một nguồn không khả dụng, xuống hạng dùng nguồn còn lại (graceful
    degrade) thay vì coi cả khung hình là không khả dụng.
    """

    ten = "hybrid"

    def __init__(
        self,
        ear_source: EarSource,
        blendshape_source: BlendshapeSource,
        bat_dong_toi_thieu_giay: float = 0.5,
        ghi_bat_dong: JsonlLogger | None = None,
    ):
        self._ear_src = ear_source
        self._bs_src = blendshape_source
        self._bat_dong_toi_thieu_giay = bat_dong_toi_thieu_giay
        self._ghi_bat_dong = ghi_bat_dong
        self._t_bat_dau_bat_dong: float | None = None
        self._da_ghi_episode_hien_tai = False

    def danh_gia(self, landmarks, blendshapes, width, height, t_capture, frame_image=None) -> DanhGiaMat:
        ear_res = self._ear_src.danh_gia(landmarks, blendshapes, width, height, t_capture)
        bs_res = self._bs_src.danh_gia(landmarks, blendshapes, width, height, t_capture)

        if ear_res.kha_dung and bs_res.kha_dung:
            dang_nham = ear_res.dang_nham and bs_res.dang_nham
            kha_dung = True
            self._theo_doi_bat_dong(ear_res, bs_res, t_capture)
        elif ear_res.kha_dung:
            dang_nham, kha_dung = ear_res.dang_nham, True
            self._reset_bat_dong()
        elif bs_res.kha_dung:
            dang_nham, kha_dung = bs_res.dang_nham, True
            self._reset_bat_dong()
        else:
            dang_nham, kha_dung = False, False
            self._reset_bat_dong()

        return DanhGiaMat(
            dang_nham=dang_nham, kha_dung=kha_dung, nguon=self.ten,
            ear=ear_res.ear, blink_mean=bs_res.blink_mean,
        )

    def _theo_doi_bat_dong(self, ear_res: DanhGiaMat, bs_res: DanhGiaMat, t_capture: float) -> None:
        bat_dong = ear_res.dang_nham != bs_res.dang_nham
        if not bat_dong:
            self._reset_bat_dong()
            return
        if self._t_bat_dau_bat_dong is None:
            self._t_bat_dau_bat_dong = t_capture
            self._da_ghi_episode_hien_tai = False
        thoi_luong = t_capture - self._t_bat_dau_bat_dong
        if thoi_luong >= self._bat_dong_toi_thieu_giay and not self._da_ghi_episode_hien_tai:
            self._da_ghi_episode_hien_tai = True
            if self._ghi_bat_dong is not None:
                self._ghi_bat_dong.ghi({
                    "t_bat_dau": self._t_bat_dau_bat_dong,
                    "t_phat_hien": t_capture,
                    "thoi_luong_giay": thoi_luong,
                    "ear": ear_res.ear,
                    "ear_dang_nham": ear_res.dang_nham,
                    "blink_mean": bs_res.blink_mean,
                    "blendshape_dang_nham": bs_res.dang_nham,
                })

    def _reset_bat_dong(self) -> None:
        self._t_bat_dau_bat_dong = None
        self._da_ghi_episode_hien_tai = False


class OnnxEyeClassifierSource:
    """Móc nối GĐ1: chạy model ONNX phân loại mắt mở/nhắm (vd open-closed-eye-0001
    hoặc model fine-tune sau này). Nếu file model không tồn tại hoặc lỗi tải/
    suy luận -> tự vô hiệu hoá vĩnh viễn, log một dòng, KHÔNG crash edge.
    """

    ten = "onnx"

    def __init__(
        self,
        duong_dan_model: str | None,
        nguong_vao: float,
        nguong_ra: float,
        kich_thuoc_dau_vao: tuple[int, int] = (24, 24),
    ):
        self._hys = HysteresisBoolState(nguong_vao, nguong_ra, huong="tren")
        self._kich_thuoc = kich_thuoc_dau_vao
        self._session = None
        self._input_name: str | None = None
        self._enabled = self._thu_tai_model(duong_dan_model)

    def _thu_tai_model(self, duong_dan_model: str | None) -> bool:
        if not duong_dan_model:
            print("[eye_state] Không cấu hình đường dẫn model ONNX — nguồn 'onnx' bị vô hiệu hoá.")
            return False
        path = Path(duong_dan_model)
        if not path.exists():
            print(f"[eye_state] Không tìm thấy file model ONNX tại '{path}' — nguồn 'onnx' bị vô hiệu hoá "
                  f"(móc nối cho model fine-tune GĐ1, thả file vào đây khi có).")
            return False
        try:
            import onnxruntime as ort
            self._session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
            self._input_name = self._session.get_inputs()[0].name
            return True
        except Exception as exc:
            print(f"[eye_state] Lỗi tải model ONNX ({exc}) — nguồn 'onnx' bị vô hiệu hoá.")
            return False

    def danh_gia(self, landmarks, blendshapes, width, height, t_capture, frame_image=None) -> DanhGiaMat:
        if not self._enabled or landmarks is None or frame_image is None:
            return DanhGiaMat(dang_nham=self._hys.trang_thai, kha_dung=False, nguon=self.ten)
        try:
            score = self._suy_luan(frame_image, landmarks, width, height)
        except Exception as exc:
            print(f"[eye_state] Lỗi suy luận ONNX ({exc}) — vô hiệu hoá nguồn 'onnx' cho phần còn lại của phiên.")
            self._enabled = False
            return DanhGiaMat(dang_nham=self._hys.trang_thai, kha_dung=False, nguon=self.ten)

        dang_nham = self._hys.cap_nhat(score)
        return DanhGiaMat(dang_nham=dang_nham, kha_dung=True, nguon=self.ten, onnx_score=score)

    def _cat_mat(self, frame_image: np.ndarray, landmarks: np.ndarray, idx: list[int],
                 width: int, height: int) -> np.ndarray:
        pts = landmarks[idx, :2].copy()
        pts[:, 0] *= width
        pts[:, 1] *= height
        x_min, y_min = pts.min(axis=0)
        x_max, y_max = pts.max(axis=0)
        pad_x = (x_max - x_min) * 0.6 + 4
        pad_y = (y_max - y_min) * 0.6 + 4
        x0 = max(0, int(x_min - pad_x))
        y0 = max(0, int(y_min - pad_y))
        x1 = min(width, int(x_max + pad_x))
        y1 = min(height, int(y_max + pad_y))
        crop = frame_image[y0:y1, x0:x1]
        if crop.size == 0:
            crop = np.zeros((*self._kich_thuoc, 3), dtype=np.uint8)
        return crop

    def _suy_luan(self, frame_image: np.ndarray, landmarks: np.ndarray, width: int, height: int) -> float:
        import cv2
        from edge.metrics import LEFT_EYE_IDX, RIGHT_EYE_IDX

        scores = []
        for idx in (LEFT_EYE_IDX, RIGHT_EYE_IDX):
            crop = self._cat_mat(frame_image, landmarks, idx, width, height)
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
            resized = cv2.resize(gray, self._kich_thuoc, interpolation=cv2.INTER_AREA)
            tensor = (resized.astype(np.float32) / 255.0).reshape(1, 1, *self._kich_thuoc)
            output = self._session.run(None, {self._input_name: tensor})[0]
            scores.append(float(np.asarray(output).reshape(-1)[0]))
        return float(np.mean(scores))


def tao_nguon_tin_hieu(cfg: dict[str, Any], thu_muc_bat_dong: str | None = None) -> EyeStateSource:
    """Factory: dựng EyeStateSource theo config.yaml (nguon_tin_hieu.mat).

    Tương thích ngược: config v1 không có mục `nguon_tin_hieu`/`nguong_hysteresis`
    -> mặc định nguồn 'ear' với vao=ra=layer1.nguong_ear (không hysteresis,
    đúng hành vi v1).
    """
    layer1_cfg = cfg.get("layer1", {})
    nguong_ear_v1 = layer1_cfg.get("nguong_ear", 0.21)

    hys_cfg = cfg.get("nguong_hysteresis", {})
    ear_vao = hys_cfg.get("ear_vao", nguong_ear_v1)
    ear_ra = hys_cfg.get("ear_ra", nguong_ear_v1)
    bs_vao = hys_cfg.get("blendshape_vao", 0.55)
    bs_ra = hys_cfg.get("blendshape_ra", 0.45)

    nguon_cfg = cfg.get("nguon_tin_hieu", {})
    mat = nguon_cfg.get("mat", "ear")

    onnx_cfg = cfg.get("nguon_onnx", {})

    if mat == "ear":
        return EarSource(ear_vao, ear_ra)
    if mat == "blendshape":
        return BlendshapeSource(bs_vao, bs_ra)
    if mat == "onnx":
        return OnnxEyeClassifierSource(
            duong_dan_model=onnx_cfg.get("duong_dan_model"),
            nguong_vao=onnx_cfg.get("nguong_vao", 0.5),
            nguong_ra=onnx_cfg.get("nguong_ra", 0.5),
        )
    if mat == "hybrid":
        ghi_bat_dong = JsonlLogger(thu_muc_bat_dong) if thu_muc_bat_dong else None
        return HybridSource(
            EarSource(ear_vao, ear_ra),
            BlendshapeSource(bs_vao, bs_ra),
            bat_dong_toi_thieu_giay=nguon_cfg.get("bat_dong_toi_thieu_giay", 0.5),
            ghi_bat_dong=ghi_bat_dong,
        )
    raise ValueError(f"nguon_tin_hieu.mat không hợp lệ: {mat!r} (chấp nhận ear|blendshape|hybrid|onnx)")
