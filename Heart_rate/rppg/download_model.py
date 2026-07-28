"""
Tải model FaceLandmarker của MediaPipe về thư mục models/.

Chạy:  python -m rppg.download_model

Vì sao cần bước này: từ mediapipe 0.10.30 trở đi, API cũ
`mediapipe.solutions.face_mesh` đã bị bỏ hẳn. Backend duy nhất còn cho
landmark chính xác là `mediapipe.tasks.FaceLandmarker`, và nó cần một
file model rời — không nhúng sẵn trong gói pip như API cũ.

Không có model thì hệ thống vẫn chạy được bằng Haar cascade, nhưng ROI
là hình chữ nhật thô theo tỉ lệ bounding box thay vì đa giác bám sát
vùng trán, nên tín hiệu bẩn hơn rõ rệt.
"""

from __future__ import annotations

import os
import sys
import urllib.request

MODEL_URL = (
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/"
    "face_landmarker/float16/1/face_landmarker.task"
)

MODEL_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models"
)
MODEL_PATH = os.path.join(MODEL_DIR, "face_landmarker.task")


def download(force: bool = False) -> str:
    """Tải model nếu chưa có. Trả về đường dẫn tới file."""
    if os.path.exists(MODEL_PATH) and not force:
        size_mb = os.path.getsize(MODEL_PATH) / 1024 / 1024
        print(f"Model đã có sẵn ({size_mb:.1f} MB): {MODEL_PATH}")
        return MODEL_PATH

    os.makedirs(MODEL_DIR, exist_ok=True)
    print(f"Đang tải model từ {MODEL_URL}")

    tmp_path = MODEL_PATH + ".part"
    try:
        urllib.request.urlretrieve(MODEL_URL, tmp_path)
        os.replace(tmp_path, MODEL_PATH)
    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise

    size_mb = os.path.getsize(MODEL_PATH) / 1024 / 1024
    print(f"Xong ({size_mb:.1f} MB): {MODEL_PATH}")
    return MODEL_PATH


if __name__ == "__main__":
    try:
        from .console import setup_console
        setup_console()
    except ImportError:
        pass

    try:
        download(force="--force" in sys.argv)
    except Exception as exc:
        print(f"Tải thất bại: {exc}", file=sys.stderr)
        print("Hệ thống vẫn chạy được bằng Haar cascade, chỉ kém chính xác hơn.",
              file=sys.stderr)
        raise SystemExit(1)
