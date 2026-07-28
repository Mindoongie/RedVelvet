"""
Trích xuất ROI vùng trán và giá trị trung bình RGB.

Hỗ trợ ba backend, tự động chọn cái nào dùng được:

  1. mediapipe.solutions.face_mesh   (API cũ, chính xác nhất, không cần tải model)
  2. mediapipe.tasks FaceLandmarker  (API mới, cần file .task)
  3. OpenCV Haar cascade             (luôn có sẵn, kém chính xác, dùng khi bí)

Lý do phải làm cả ba: các phiên bản mediapipe khác nhau expose API khác
nhau, và trong một nhóm nhiều người thì gần như chắc chắn sẽ lệch phiên
bản. Fallback giúp không ai mất nửa ngày vì lỗi cài đặt.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional, Tuple

import cv2
import numpy as np


# Đa giác bao vùng trán trên lưới 468 điểm của MediaPipe Face Mesh.
# Đi vòng: chân tóc trái -> đỉnh trán -> chân tóc phải -> xuống -> trên lông mày -> về trái
FOREHEAD_LANDMARKS = [
    103, 67, 109, 10, 338, 297, 332,   # biên trên (chân tóc)
    333, 299, 337, 151, 108, 69, 104,  # biên dưới (ngay trên lông mày)
]

# Hai điểm đuôi mắt, dùng làm thước đo kích thước khuôn mặt.
LEFT_EYE_OUTER = 33
RIGHT_EYE_OUTER = 263

# Nơi tìm model của backend 2 khi không ai chỉ định đường dẫn.
# Từ mediapipe 0.10.30 trở đi, API cũ mp.solutions đã bị bỏ hẳn, nên
# backend 2 trở thành đường chính chứ không còn là phương án dự phòng.
# Tải model bằng: python -m rppg.download_model
_BUNDLED_MODEL = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "models",
    "face_landmarker.task",
)


def _find_task_model(explicit: Optional[str]) -> Optional[str]:
    """Tìm file .task theo thứ tự: tham số -> biến môi trường -> model kèm theo."""
    for candidate in (explicit,
                      os.environ.get("FACE_LANDMARKER_TASK"),
                      _BUNDLED_MODEL):
        if candidate and os.path.exists(candidate):
            return candidate
    return None


@dataclass
class ROISample:
    """Một mẫu trích từ đúng một khung hình."""
    ok: bool
    rgb_mean: Optional[np.ndarray] = None   # (3,) theo thứ tự R, G, B
    center: Optional[np.ndarray] = None     # (2,) tâm khuôn mặt, pixel
    scale: float = 0.0                      # kích thước đặc trưng, pixel
    mask: Optional[np.ndarray] = None       # mask ROI, để vẽ overlay
    reason: str = ""                        # lý do thất bại, để debug


def _trimmed_channel_means(
    frame_bgr: np.ndarray,
    mask: np.ndarray,
    trim_percent: float,
) -> Optional[np.ndarray]:
    """Trung bình từng kênh sau khi cắt bỏ pixel sáng nhất và tối nhất.

    trim_percent là TỔNG phần trăm bị loại, chia đều hai đầu.
    Ví dụ 20.0 -> bỏ 10% tối nhất và 10% sáng nhất.

    Mục đích: loại tóc mái, chân tóc, gọng kính, vệt bóng đổ lọt vào ROI.
    Với người dùng Việt Nam thì tóc mái là nguồn nhiễu ROI phổ biến nhất,
    nên bước này không phải tùy chọn.
    """
    ys, xs = np.nonzero(mask)
    if ys.size == 0:
        return None

    pixels = frame_bgr[ys, xs].astype(np.float64)   # (M, 3) thứ tự BGR

    if trim_percent > 0.0:
        half = trim_percent / 2.0
        # Xếp hạng theo độ sáng tổng, cắt hai đầu, giữ nguyên tương quan kênh.
        luma = pixels.mean(axis=1)
        lo, hi = np.percentile(luma, [half, 100.0 - half])
        keep = (luma >= lo) & (luma <= hi)
        if keep.sum() >= 20:
            pixels = pixels[keep]

    bgr_mean = pixels.mean(axis=0)
    return bgr_mean[::-1].copy()   # đổi sang R, G, B


class ForeheadROIExtractor:
    """Trích ROI trán từ khung hình BGR.

    Dùng như context manager hoặc gọi close() khi xong:

        with ForeheadROIExtractor() as extractor:
            sample = extractor.extract(frame_bgr)
    """

    def __init__(
        self,
        trim_percent: float = 20.0,
        min_pixels: int = 200,
        task_model_path: Optional[str] = None,
    ) -> None:
        self.trim_percent = trim_percent
        self.min_pixels = min_pixels
        self.backend = "none"

        self._mesh = None
        self._landmarker = None
        self._cascade = None
        self._last_ts_ms = -1   # backend 2 đòi timestamp tăng nghiêm ngặt

        # --- Backend 1: mediapipe.solutions.face_mesh ---
        try:
            import mediapipe as mp
            self._mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=False,
                max_num_faces=1,
                refine_landmarks=False,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5,
            )
            self.backend = "mediapipe_solutions"
            return
        except Exception:
            self._mesh = None

        # --- Backend 2: mediapipe.tasks FaceLandmarker ---
        try:
            model_path = _find_task_model(task_model_path)
            if model_path:
                from mediapipe.tasks import python as mp_python
                from mediapipe.tasks.python import vision

                options = vision.FaceLandmarkerOptions(
                    base_options=mp_python.BaseOptions(model_asset_path=model_path),
                    running_mode=vision.RunningMode.VIDEO,
                    num_faces=1,
                )
                self._landmarker = vision.FaceLandmarker.create_from_options(options)
                self.backend = "mediapipe_tasks"
                return
        except Exception:
            self._landmarker = None

        # --- Backend 3: Haar cascade (luôn có trong opencv) ---
        cascade_path = os.path.join(
            cv2.data.haarcascades, "haarcascade_frontalface_default.xml"
        )
        self._cascade = cv2.CascadeClassifier(cascade_path)
        if self._cascade.empty():
            raise RuntimeError("Không nạp được Haar cascade; kiểm tra cài đặt OpenCV")
        self.backend = "haar_cascade"

    # -- API chính -------------------------------------------------------

    def extract(self, frame_bgr: np.ndarray, timestamp_ms: int = 0) -> ROISample:
        if frame_bgr is None or frame_bgr.size == 0:
            return ROISample(ok=False, reason="khung hình rỗng")

        if self.backend == "mediapipe_solutions":
            return self._extract_mesh(frame_bgr)
        if self.backend == "mediapipe_tasks":
            return self._extract_tasks(frame_bgr, timestamp_ms)
        return self._extract_haar(frame_bgr)

    # -- Backend 1 -------------------------------------------------------

    def _extract_mesh(self, frame_bgr: np.ndarray) -> ROISample:
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        rgb.flags.writeable = False
        result = self._mesh.process(rgb)

        if not result.multi_face_landmarks:
            return ROISample(ok=False, reason="không thấy khuôn mặt")

        h, w = frame_bgr.shape[:2]
        lm = result.multi_face_landmarks[0].landmark
        points = np.array([[lm[i].x * w, lm[i].y * h] for i in range(len(lm))])
        return self._from_landmarks(frame_bgr, points)

    # -- Backend 2 -------------------------------------------------------

    def _extract_tasks(self, frame_bgr: np.ndarray, timestamp_ms: int) -> ROISample:
        import mediapipe as mp

        # RunningMode.VIDEO đòi timestamp TĂNG NGHIÊM NGẶT, bằng nhau cũng ném
        # lỗi. Hai khung hình rơi vào cùng một mili-giây là chuyện bình thường
        # khi camera chạy nhanh hoặc khi phát lại file video, nên phải tự đẩy
        # lên thay vì để exception làm chết cả vòng lặp.
        if timestamp_ms <= self._last_ts_ms:
            timestamp_ms = self._last_ts_ms + 1
        self._last_ts_ms = timestamp_ms

        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        result = self._landmarker.detect_for_video(mp_image, timestamp_ms)

        if not result.face_landmarks:
            return ROISample(ok=False, reason="không thấy khuôn mặt")

        h, w = frame_bgr.shape[:2]
        lm = result.face_landmarks[0]
        points = np.array([[p.x * w, p.y * h] for p in lm])
        return self._from_landmarks(frame_bgr, points)

    # -- Backend 3 -------------------------------------------------------

    def _extract_haar(self, frame_bgr: np.ndarray) -> ROISample:
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        faces = self._cascade.detectMultiScale(gray, 1.15, 5, minSize=(120, 120))

        if len(faces) == 0:
            return ROISample(ok=False, reason="không thấy khuôn mặt")

        x, y, w, h = max(faces, key=lambda f: f[2] * f[3])

        # Tỉ lệ vùng trán theo bounding box khuôn mặt:
        # ngang 30-70%, dọc 8-28% — tránh chân tóc và lông mày.
        x0, x1 = int(x + 0.30 * w), int(x + 0.70 * w)
        y0, y1 = int(y + 0.08 * h), int(y + 0.28 * h)

        mask = np.zeros(frame_bgr.shape[:2], dtype=np.uint8)
        mask[max(0, y0):y1, max(0, x0):x1] = 255

        return self._finalize(
            frame_bgr,
            mask,
            center=np.array([x + w / 2.0, y + h / 2.0]),
            scale=float(w),
        )

    # -- Dùng chung ------------------------------------------------------

    def _from_landmarks(self, frame_bgr: np.ndarray, points: np.ndarray) -> ROISample:
        if points.shape[0] <= max(FOREHEAD_LANDMARKS):
            return ROISample(ok=False, reason="thiếu landmark vùng trán")

        polygon = points[FOREHEAD_LANDMARKS].astype(np.int32)

        mask = np.zeros(frame_bgr.shape[:2], dtype=np.uint8)
        cv2.fillConvexPoly(mask, cv2.convexHull(polygon), 255)

        # Co vào trong vài pixel để tránh dính chân tóc ở rìa đa giác.
        mask = cv2.erode(mask, np.ones((5, 5), np.uint8), iterations=1)

        eye_dist = float(np.linalg.norm(
            points[LEFT_EYE_OUTER] - points[RIGHT_EYE_OUTER]
        ))
        return self._finalize(
            frame_bgr,
            mask,
            center=points.mean(axis=0),
            scale=eye_dist,
        )

    def _finalize(
        self,
        frame_bgr: np.ndarray,
        mask: np.ndarray,
        center: np.ndarray,
        scale: float,
    ) -> ROISample:
        n_pixels = int(np.count_nonzero(mask))
        if n_pixels < self.min_pixels:
            return ROISample(ok=False, reason=f"ROI quá nhỏ ({n_pixels}px)")

        rgb_mean = _trimmed_channel_means(frame_bgr, mask, self.trim_percent)
        if rgb_mean is None:
            return ROISample(ok=False, reason="không tính được trung bình ROI")

        # ROI quá tối thì tỉ số tín hiệu/nhiễu không thể đủ.
        if rgb_mean.mean() < 15.0:
            return ROISample(ok=False, reason="ROI quá tối")

        # ROI bão hòa thì thông tin biến thiên đã bị cắt cụt.
        if rgb_mean.max() > 250.0:
            return ROISample(ok=False, reason="ROI bị cháy sáng")

        return ROISample(
            ok=True,
            rgb_mean=rgb_mean,
            center=np.asarray(center, dtype=np.float64),
            scale=float(scale),
            mask=mask,
        )

    # -- Vòng đời --------------------------------------------------------

    def close(self) -> None:
        if self._mesh is not None:
            self._mesh.close()
            self._mesh = None
        if self._landmarker is not None:
            self._landmarker.close()
            self._landmarker = None

    def __enter__(self) -> "ForeheadROIExtractor":
        return self

    def __exit__(self, *exc) -> None:
        self.close()
