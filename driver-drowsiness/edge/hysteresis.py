"""Bộ chuyển giá trị liên tục -> boolean có trễ (hysteresis) — chống rung khi
tín hiệu dao động quanh ngưỡng đơn. Dùng chung cho EAR, blendshape, ONNX.
"""
from __future__ import annotations


class HysteresisBoolState:
    """huong='duoi': giá trị THẤP = trạng thái True (vd EAR, thấp = nhắm mắt).
    huong='tren' : giá trị CAO  = trạng thái True (vd blendshape blink, cao = nhắm mắt).

    Vùng giữa nguong_vao và nguong_ra là "vùng chết" — không đổi trạng thái,
    chống rung khi tín hiệu dao động sát ngưỡng đơn cũ.
    """

    def __init__(self, nguong_vao: float, nguong_ra: float, huong: str = "duoi"):
        if huong not in ("duoi", "tren"):
            raise ValueError("huong phải là 'duoi' hoặc 'tren'")
        self.nguong_vao = nguong_vao
        self.nguong_ra = nguong_ra
        self.huong = huong
        self._trang_thai = False

    def cap_nhat(self, value: float) -> bool:
        if self.huong == "duoi":
            if not self._trang_thai and value < self.nguong_vao:
                self._trang_thai = True
            elif self._trang_thai and value > self.nguong_ra:
                self._trang_thai = False
        else:
            if not self._trang_thai and value > self.nguong_vao:
                self._trang_thai = True
            elif self._trang_thai and value < self.nguong_ra:
                self._trang_thai = False
        return self._trang_thai

    @property
    def trang_thai(self) -> bool:
        return self._trang_thai

    def reset(self, trang_thai: bool = False) -> None:
        self._trang_thai = trang_thai
