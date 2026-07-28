# rPPG — Đo nhịp tim không tiếp xúc từ camera

Đo nhịp tim qua webcam thường, không cần cảm biến tiếp xúc. Dùng cho bối cảnh giám sát người trong xe **khi xe đứng yên**.

Điểm cốt lõi của thiết kế: hệ thống **từ chối trả số khi không đủ tin cậy**, thay vì đoán bừa. FFT luôn tìm được một đỉnh kể cả với đầu vào là nhiễu thuần — cổng SQI là thứ duy nhất phân biệt "đo được 72" với "đoán bừa ra 72".

---

## Cài đặt

```bash
cd Heart_rate
pip install -r requirements.txt
python -m rppg.download_model      # tải model landmark (~3,6 MB)
```

Bước tải model là cần thiết với mediapipe từ 0.10.30 trở đi — bản mới đã bỏ hẳn API cũ `mediapipe.solutions`, nên backend landmark chính xác cần một file model rời. Bỏ qua bước này thì hệ thống vẫn chạy được bằng Haar cascade, nhưng ROI là hình chữ nhật thô thay vì đa giác bám sát vùng trán, tín hiệu bẩn hơn rõ rệt.

## Chạy

```bash
python test_algorithms.py     # kiểm chứng thuật toán — chạy cái này trước
python demo.py                # demo webcam
```

Nếu `test_algorithms.py` hỏng thì đừng động đến camera — sửa thuật toán trước.

### Tham số demo

| Lệnh | Tác dụng |
|---|---|
| `python demo.py` | Webcam mặc định |
| `python demo.py --camera 1` | Chọn webcam khác |
| `python demo.py --video test.mp4` | Chạy lại trên file đã quay |
| `python demo.py --record demo.mp4` | Ghi màn hình demo ra file |
| `python demo.py --window 30` | Cửa sổ phân tích 30 s (mặc định 20) |
| `python demo.py --sqi 5` | Nâng ngưỡng SQI lên 5 dB |
| `python demo.py --no-lock` | **Không** khóa exposure — chỉ để minh họa hậu quả |

**Phím:** `q`/`ESC` thoát · `r` đo lại từ đầu · `m` bật/tắt cổng chuyển động · `s` chụp màn hình

---

## Quay demo cho đúng

Bốn cái bẫy làm hỏng demo rPPG, theo thứ tự hay gặp:

**1. Auto-exposure / auto-white-balance.** Biên độ tín hiệu rPPG chỉ khoảng 0,1–1 % mức DC. Vòng lặp tự động phơi sáng của camera có nhiệm vụ giữ độ sáng ổn định, nên nó **chủ động triệt tiêu đúng cái dao động mà ta cần đo**. `open_camera()` đã cố khóa, nhưng khả năng khóa phụ thuộc driver.

> Cách kiểm tra đã khóa được chưa: che nửa khung hình bằng tay rồi bỏ ra. Nếu độ sáng phần còn lại tự điều chỉnh theo thì auto-exposure **vẫn đang bật**.

Trên Linux có thể cần ép bằng `v4l2-ctl`:
```bash
v4l2-ctl -d /dev/video0 -c auto_exposure=1 -c exposure_time_absolute=250 -c white_balance_automatic=0
```

**2. Đèn huỳnh quang và LED rẻ.** Điện lưới 50 Hz → đèn nhấp nháy 100 Hz. Lấy mẫu ở 30 fps thì tần số này aliasing xuống thẳng dải 0,7–4 Hz và tạo một đỉnh giả rất thuyết phục. Quay dưới ánh sáng ban ngày hoặc đèn LED nguồn DC.

**3. Nén video.** H.264/MJPEG với chroma subsampling xóa sạch mức điều biến 0,1–1 %. Đọc raw từ camera, đừng đọc qua luồng RTSP đã nén.

**4. Timestamp.** Dùng thời điểm **chụp**, không dùng thứ tự khung hình. Sai fps 30 vs 24 khiến 78 BPM bị đọc thành 97,6 BPM — mà SQI vẫn báo 9,1 dB, tức hệ thống hoàn toàn tự tin vào một con số sai 20 BPM.

### Ba khoảnh khắc nên quay

1. **Độ tin cậy** — ngồi yên, để máy đo SpO2 kẹp ngón tay trong khung hình. Hai số khớp nhau.
2. **Bài test lắc** — rung ghế hoặc lắc camera. Hệ thống trả `KHONG DO DUOC` thay vì bịa ra một con số.
3. **Phổ tần số** — panel bên phải. Ngồi yên là một đỉnh sạch, lắc là một mớ lộn xộn.

*(tùy chọn)* Nhảy tại chỗ 20 cái rồi ngồi đo — BPM cao rồi giảm dần. Trả lời trước câu hỏi hoài nghi tiêu chuẩn: "làm sao biết thuật toán không phải lúc nào cũng trả về 72?"

---

## Tích hợp

```python
import time
from rppg import PulseMonitor

monitor = PulseMonitor()
result = monitor.process_frame("driver", frame_bgr, timestamp=time.time())

if result.status == "ok":
    hien_thi(result.bpm)      # float, ví dụ 72.4
else:
    hien_thi("--")            # KHÔNG hiển thị số cũ, KHÔNG đoán
```

### Năm trạng thái

| `status` | Nghĩa | Có `bpm` |
|---|---|:---:|
| `ok` | Đo được, số dùng được | ✅ |
| `calibrating` | Đang tích lũy dữ liệu (xem `progress`) | ❌ |
| `unavailable` | Đủ dữ liệu nhưng chất lượng không đạt | ❌ |
| `no_face` | Không thấy khuôn mặt | ❌ |
| `moving` | Xe đang chạy | ❌ |

Mọi trạng thái không phải `ok` đều kèm `reason` giải thích.

### Hợp đồng giao diện — bốn điều bắt buộc

1. Đầu ra là **tín hiệu hiển thị và bối cảnh**, không phải nguồn kích hoạt cảnh báo. Đừng nối `bpm` vào chuông báo khẩn cấp.
2. Khi `status != "ok"` thì **không có số**. Hiển thị `--` hoặc "đang đo" — tuyệt đối không dùng lại giá trị cũ.
3. rPPG chỉ hợp lệ khi xe **đứng yên**. Tầng trên nên chỉ gọi `process_frame` khi tốc độ < 2 km/h (dùng tham số `vehicle_stationary`).
4. `bpm` **không** dùng để suy ra đột quỵ, căng thẳng hay buồn ngủ.

---

## Cấu trúc

```
Heart_rate/
├── rppg/                    thư viện (import cái này)
│   ├── __init__.py
│   ├── config.py            toàn bộ hằng số, một chỗ duy nhất
│   ├── algorithms.py        hàm thuần: resample → POS → bandpass → FFT → SQI
│   ├── face_roi.py          khung hình → trung bình RGB vùng trán
│   ├── monitor.py           API tích hợp — PulseMonitor
│   ├── camera.py            mở camera, khóa chế độ tự động
│   ├── console.py           cho phép in tiếng Việt trên console Windows
│   └── download_model.py    tải model landmark
├── models/                  model đã tải về (không commit)
├── demo.py                  giao diện trực quan
├── test_algorithms.py       kiểm chứng bằng tín hiệu có đáp án biết trước
├── BAO_CAO_KY_THUAT.md      đánh giá chất lượng, hiệu năng, vấn đề tồn đọng
└── CAU_TRUC_MA_NGUON.md     tra cứu file nào chứa hàm nào
```

Khi hiệu chỉnh ngưỡng trên dữ liệu thật, **chỉ sửa `config.py`**.

---

## Kết quả kiểm chứng hiện tại

`python test_algorithms.py` — 14/14 ĐẠT.

| Kiểm tra | Kết quả |
|---|---|
| Khôi phục nhịp tim, dải 48–140 BPM | sai số tối đa **0,34 BPM** |
| SQI tín hiệu sạch vs nhiễu trắng | 7,7 dB vs −4,5 dB — **tách biệt 12,3 dB** |
| Bỏ qua resample (fps 30 khai báo, 24 thật) | 78 → **97,6 BPM**, mà SQI vẫn 9,1 dB |
| Chuyển động: ngồi yên vs rung lắc | 0,0058 vs 0,1385 (ngưỡng 0,020) |

Hiệu năng: **12,9 ms** mỗi lần tính (cửa sổ 20 s) → ~2,6 % một lõi CPU. RAM 190 KB/người.

---

## Giới hạn đã biết

- **Chưa hiệu chỉnh trên dữ liệu thật.** Ngưỡng `sqi_threshold_db = 3.0` và `motion_threshold = 0.020` là giá trị khởi điểm, chưa so sánh với thiết bị chuẩn (SpO2/ECG).
- **Một người tại một thời điểm.** Kiến trúc buffer đã sẵn cho nhiều người, nhưng tầng trích xuất dùng chung một extractor `max_num_faces=1`.
- **Chưa an toàn đa luồng.** `extract()` gọi ngoài lock, mà MediaPipe FaceLandmarker là stateful.
- **Không có bảo vệ nhầm hài bậc hai.** Nếu FFT chọn hài làm đỉnh chính, hệ thống báo BPM gấp đôi với độ tin cậy cao.

Chi tiết và mức độ ưu tiên xử lý: xem [BAO_CAO_KY_THUAT.md](Heart_rate/BAO_CAO_KY_THUAT.md).

---

## Yêu cầu

Python 3.9+ · numpy · scipy · opencv-python · mediapipe *(tùy chọn nhưng nên có)*

Đã kiểm chứng trên: Python 3.12.10, numpy 2.5.0, scipy 1.18.0, opencv 5.0.0, mediapipe 0.10.35, Windows 11.
