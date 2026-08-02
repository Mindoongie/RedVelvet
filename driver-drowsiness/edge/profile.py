"""Profile cá nhân hoá ngưỡng theo tài xế (item 2) — lưu tại
profiles/<tai_xe_id>.json. Module này là phần MÔ HÌNH DỮ LIỆU dùng chung giữa
edge/calibrate.py (ghi profile) và edge/main.py (đọc profile lúc khởi động).
"""
from __future__ import annotations

import json
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np


@dataclass
class NguongTinHieu:
    trung_tam: float
    vao: float
    ra: float


@dataclass
class Profile:
    tai_xe_id: str
    created_at: float
    so_mau_mo: int
    so_mau_nham: int
    ear: NguongTinHieu | None = None
    blendshape: NguongTinHieu | None = None

    def created_at_str(self) -> str:
        return time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(self.created_at))

    def ap_dung_vao_config(self, cfg: dict[str, Any]) -> dict[str, Any]:
        """Trả về BẢN SAO config với nguong_hysteresis được ghi đè bằng ngưỡng cá nhân
        (chỉ ghi đè phần tín hiệu đã hiệu chỉnh; tín hiệu chưa hiệu chỉnh giữ mặc định)."""
        cfg_moi = dict(cfg)
        hys = dict(cfg.get("nguong_hysteresis", {}))
        if self.ear is not None:
            hys["ear_vao"] = self.ear.vao
            hys["ear_ra"] = self.ear.ra
        if self.blendshape is not None:
            hys["blendshape_vao"] = self.blendshape.vao
            hys["blendshape_ra"] = self.blendshape.ra
        cfg_moi["nguong_hysteresis"] = hys
        return cfg_moi

    def to_dict(self) -> dict[str, Any]:
        def _nguong_dict(n: NguongTinHieu | None):
            return None if n is None else {"trung_tam": n.trung_tam, "vao": n.vao, "ra": n.ra}

        return {
            "tai_xe_id": self.tai_xe_id,
            "created_at": self.created_at,
            "so_mau_mo": self.so_mau_mo,
            "so_mau_nham": self.so_mau_nham,
            "ear": _nguong_dict(self.ear),
            "blendshape": _nguong_dict(self.blendshape),
        }

    @staticmethod
    def from_dict(d: dict[str, Any]) -> "Profile":
        def _nguong(x):
            return None if x is None else NguongTinHieu(x["trung_tam"], x["vao"], x["ra"])

        return Profile(
            tai_xe_id=d["tai_xe_id"],
            created_at=d["created_at"],
            so_mau_mo=d.get("so_mau_mo", 0),
            so_mau_nham=d.get("so_mau_nham", 0),
            ear=_nguong(d.get("ear")),
            blendshape=_nguong(d.get("blendshape")),
        )


def duong_dan_profile(thu_muc: str, tai_xe_id: str) -> Path:
    return Path(thu_muc) / f"{tai_xe_id}.json"


def doc_profile(thu_muc: str, tai_xe_id: str) -> Profile | None:
    path = duong_dan_profile(thu_muc, tai_xe_id)
    if not path.exists():
        return None
    try:
        return Profile.from_dict(json.loads(path.read_text(encoding="utf-8")))
    except Exception as exc:
        print(f"[profile] Không đọc được profile '{path}' ({exc}) — dùng ngưỡng mặc định.")
        return None


def luu_profile(thu_muc: str, profile: Profile) -> Path:
    path = duong_dan_profile(thu_muc, profile.tai_xe_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(profile.to_dict(), ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def tinh_nguong(gia_tri_mo: list[float], gia_tri_nham: list[float], huong: str) -> float:
    """Điểm giữa hai phân bố (mở/nhắm) theo đúng công thức prompt v2:
    'duoi' (EAR, thấp = nhắm)      : trung_tam = mean(percentile5(mo), percentile95(nham))
    'tren' (blendshape, cao = nhắm): trung_tam = mean(percentile95(mo), percentile5(nham))
    """
    mo = np.asarray(gia_tri_mo, dtype=np.float64)
    nham = np.asarray(gia_tri_nham, dtype=np.float64)
    if huong == "duoi":
        bien_mo = np.percentile(mo, 5)
        bien_nham = np.percentile(nham, 95)
    else:
        bien_mo = np.percentile(mo, 95)
        bien_nham = np.percentile(nham, 5)
    return float((bien_mo + bien_nham) / 2.0)


def bien_do_tach(gia_tri_mo: list[float], gia_tri_nham: list[float], huong: str) -> float:
    """Độ tách giữa hai phân bố — dương & lớn = tách tốt (mở/nhắm rõ ràng);
    nhỏ/âm = chồng lấn, không nên lưu profile."""
    mo = np.asarray(gia_tri_mo, dtype=np.float64)
    nham = np.asarray(gia_tri_nham, dtype=np.float64)
    if huong == "duoi":
        return float(np.percentile(mo, 5) - np.percentile(nham, 95))
    return float(np.percentile(nham, 5) - np.percentile(mo, 95))
