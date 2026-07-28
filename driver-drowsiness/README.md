# Cảnh báo hành vi mất an toàn — ngủ gật (GĐ1 + demo, kiến trúc v2)

Hệ thống edge-first: toàn bộ phân tích chạy cục bộ trên thiết bị trong xe
("edge"), server chỉ nhận sự kiện. Bản v2 gồm:

- **Lớp 1 — Phản xạ** (< 1s, offline, còi cabin): nhắm mắt kéo dài, có
  hysteresis chống rung + chịu được mất landmark ngắn.
- **Lớp 2 — Xu hướng** (10–60s, mức cảnh báo 0–3): PERCLOS, tần suất ngáp,
  gật đầu, hợp nhất Noisy-OR.
- **Lớp 3 — hook bối cảnh**: nhận mức rủi ro nền (`binh_thuong`/`cao`) từ
  server (dashboard chỉnh), hạ/nâng ngưỡng Lớp 1 & Lớp 2 runtime.
- **v2 — Nguồn tín hiệu cắm được** (EAR / blendshape / hybrid / ONNX),
  **calibration cá nhân theo tài xế**, **coverage** (nguyên tắc hai con số),
  **báo cáo phiên tự động**, và xử lý mất-mặt đúng cách (không reset chuỗi
  nhắm mắt vô cớ, phát hiện mẫu hình "gục đầu làm mất landmark").

Môi trường demo chạy toàn bộ trên **một máy** với webcam thường. "Edge" là
một process Python; "server" là FastAPI trên localhost. Camera IR là hạng mục
phần cứng của lộ trình dài hạn — **không phải điều kiện của bản demo này.**

> Ngôn ngữ sản phẩm: đây là **chỉ báo tham khảo về hành vi mất an toàn**,
> không phải chẩn đoán y tế. Không có bất kỳ cơ chế tự động gọi cấp cứu nào.

---

## 1. Cài đặt

```bash
cd driver-drowsiness
python -m venv .venv
# Windows: .venv\Scripts\activate      |  macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

### Tải model MediaPipe FaceLandmarker

Cần file `models/face_landmarker.task` (478 điểm, bật
`facial_transformation_matrixes` + `face_blendshapes`). Tải về:

```bash
# Windows PowerShell
Invoke-WebRequest -Uri "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task" -OutFile "models/face_landmarker.task"

# macOS/Linux
curl -L -o models/face_landmarker.task "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task"
```

`config.yaml -> landmark.model_path` đã trỏ sẵn tới đường dẫn này. Nguồn
`onnx` (mục 4) cần thêm `models/eye_state.onnx` — không bắt buộc, tự vô hiệu
hoá nếu thiếu.

---

## 2. Chạy demo

```bash
python run_demo.py
```

Lệnh này khởi động **server** (process riêng, `uvicorn`), mở trình duyệt tới
dashboard (`http://127.0.0.1:8000`), rồi khởi động **edge** (process riêng,
mở cửa sổ preview webcam). Nhấn `q` trong cửa sổ preview để thoát edge;
`Ctrl+C` trong terminal để dừng toàn bộ. Lúc thoát, edge tự xuất **báo cáo
phiên** vào `reports/sessions/<timestamp>/` (mục 6).

Chỉ muốn chạy riêng edge (không server, để test Lớp 1 offline):

```bash
python -m edge.main
```

Chỉ muốn chạy riêng server:

```bash
uvicorn server.app:app --host 127.0.0.1 --port 8000
```

Chạy với profile cá nhân của một tài xế cụ thể (xem mục 3):

```bash
python run_demo.py --tai-xe-id nguyen_van_a
# hoặc: python -m edge.main --tai-xe-id nguyen_van_a
```

---

## 3. Calibration cá nhân theo tài xế

Phân bố EAR nền khác nhau đáng kể giữa người (đặc biệt mắt một mí) — một
ngưỡng chung gây báo giả có hệ thống. Hiệu chỉnh 15-20s:

```bash
python -m edge.calibrate --tai-xe-id nguyen_van_a
```

- 10s đầu: nhìn thẳng, mắt mở bình thường.
- 5s sau: nhắm mắt chủ động.
- Ngưỡng cá nhân = điểm giữa hai phân bố (EAR + blendshape), lưu vào
  `profiles/nguyen_van_a.json`.
- Nếu hai phân bố chồng lấn quá mức (không tách được mở/nhắm) — **script từ
  chối lưu profile**, in lý do, yêu cầu hiệu chỉnh lại (không lưu profile rác).
- `python -m edge.main --tai-xe-id nguyen_van_a` sẽ tự đọc profile này nếu
  tồn tại (log `[main] Đang dùng profile cá nhân...`); không có profile thì
  dùng ngưỡng mặc định `config.yaml -> nguong_hysteresis`.

---

## 4. Nguồn tín hiệu trạng thái mắt (cắm được)

`config.yaml -> nguon_tin_hieu.mat`:

| Giá trị | Mô tả |
|---|---|
| `ear` (mặc định) | Đúng hành vi v1 — chỉ dùng Eye Aspect Ratio từ landmark |
| `blendshape` | Dùng `eyeBlinkLeft`/`eyeBlinkRight` từ MediaPipe (cùng model .task, không tải thêm) |
| `hybrid` | NHẮM chỉ khi CẢ HAI nguồn cùng báo nhắm — ưu tiên chống báo giả. Hai nguồn bất đồng ≥ 0.5s được ghi vào `data/bat_dong_nguon.jsonl` để phân tích offline |
| `onnx` | Móc nối GĐ1 cho model phân loại mắt fine-tune sau này (`nguon_onnx.duong_dan_model`) — thiếu file thì tự vô hiệu hoá, log 1 dòng, không crash |

Cả `ear` và `blendshape` đều dùng **hysteresis** (`nguong_hysteresis` trong
config): ngưỡng VÀO-nhắm và RA-nhắm khác nhau, chống rung khi tín hiệu dao
động quanh 1 ngưỡng đơn. Dashboard hiển thị nguồn đang hoạt động ở góc trên.

---

## 5. Coverage & xử lý mất landmark

- Runtime đếm liên tục: tổng thời gian phiên, thời gian có khuôn mặt hợp lệ
  → **coverage** hiển thị trên overlay preview + dashboard + báo cáo phiên +
  mọi báo cáo eval. Không báo cáo độ chính xác nào thiếu coverage đi kèm
  (nguyên tắc "hai con số").
- Mất landmark liên tục ≥ 2s (`coverage.khong_kha_dung_giay`) → sự kiện
  `khong_kha_dung` — **KHÔNG phải cảnh báo ngủ gật**, chỉ báo hết dữ liệu
  đáng tin, dashboard chuyển badge sang màu xám.
- Đang trong chuỗi nhắm mắt mà mất landmark ≤ 1.5s
  (`mat_mat_landmark.toi_da_giu_chuoi_giay`) → bộ đếm **KHÔNG reset** (coi
  như nghi ngờ vẫn đang nhắm); mất lâu hơn mới reset chuỗi.
- Mất landmark NGAY sau khi pitch đang chúi xuống vượt ngưỡng gật đầu → sự
  kiện `mat_mat_sau_chui_dau` ở mức 2, kèm ảnh — mẫu hình mất landmark nguy
  hiểm nhất (đầu gục đúng lúc landmark rớt) không được phép trôi qua im lặng.

---

## 6. Báo cáo phiên tự động

Kết thúc mỗi lần chạy `edge/main.py` (Ctrl+C hoặc nhấn `q`), tự sinh vào
`reports/sessions/<timestamp>/`:

- `bao_cao.md` — thời lượng, coverage, số sự kiện theo mức, độ trễ Lớp 1
  p50/p95, nguồn tín hiệu, profile đang dùng.
- `perclos_timeline.png` — PERCLOS theo thời gian, đánh dấu sự kiện.
- `latency_hist.png` — histogram độ trễ Lớp 1.
- `events.jsonl` — toàn bộ sự kiện trong phiên.

---

## 7. Kịch bản demo

### Regression (từ v1 — vẫn phải chạy được nguyên vẹn)

**R1 — Còi Lớp 1 + độ trễ < 300ms**
1. `python run_demo.py`, nhắm mắt liên tục ~1,2 giây.
2. Còi kêu ngay. Terminal in `[layer1] KÍCH CÒI — nhắm mắt 1.23s (ngưỡng
   1.20s), latency=8.4ms`. `latency` = độ trễ xử lý 1 frame (không phải
   1,2s — đó là ngưỡng thiết kế). Vượt 300ms in thêm `CẢNH BÁO ĐỘ TRỄ`.
3. Chớp mắt bình thường (< 0,5s) — KHÔNG có còi kêu.

**R2 — Lớp 1 hoạt động offline**
1. Đang chạy `run_demo.py`, kill process server (Ctrl+C ở cửa sổ server).
2. Nhắm mắt kéo dài lại — còi vẫn kêu, edge chỉ in thêm log
   `[uplink] Gửi event thất bại ... KHÔNG chặn edge` (không crash).

**R3 — Lớp 3 hạ ngưỡng runtime**
1. Bấm nút "Mức rủi ro nền" trên dashboard: `binh_thuong` → `cao`.
2. Trong ≤ 5s, overlay đổi `Nguong nham mat` 1.20s → 0.80s, không cần
   restart. Nhắm mắt ~0,9s để xác nhận còi kêu sớm hơn.

**R4 — Lớp 2 leo mức + ảnh minh chứng**
1. Ngáp lặp lại / nhắm mắt lai rai trong ~60s.
2. Badge mức trên dashboard leo 0→1→2→3; mức ≥ 2 xuất hiện ảnh minh chứng
   trong danh sách sự kiện.

### Mới của v2

**V1 — Đổi nguồn tín hiệu**
1. Sửa `config.yaml -> nguon_tin_hieu.mat` lần lượt `ear` / `blendshape` /
   `hybrid`, chạy lại `python -m edge.main` mỗi lần.
2. Overlay preview + dashboard hiển thị đúng nguồn đang chạy (`Nguon: ...`).
   Với `hybrid`, che một mắt hoặc nheo mắt để tạo bất đồng giữa 2 nguồn quan
   sát `data/bat_dong_nguon.jsonl` được ghi khi bất đồng ≥ 0.5s.

**V2 — Calibration 2 người**
1. `python -m edge.calibrate --tai-xe-id nguoi_a`, rồi
   `python -m edge.calibrate --tai-xe-id nguoi_b` (2 người khác nhau ngồi
   trước webcam lần lượt).
2. Kiểm tra `profiles/nguoi_a.json` và `profiles/nguoi_b.json` có ngưỡng EAR
   khác nhau.
3. `python -m edge.main --tai-xe-id nguoi_a` rồi đổi sang `nguoi_b` — log
   `[main] Đang dùng profile cá nhân...` xác nhận đúng profile.

**V3 — Che camera 3 giây**
1. Đang chạy edge, che ống kính webcam hoàn toàn trong > 2s.
2. Terminal in `[coverage] KHONG_KHA_DUNG`, dashboard badge chuyển xám,
   coverage giảm. Bỏ che ra — **không có** cảnh báo ngủ gật giả nào được kích
   trong lúc che.

**V4 — Nhắm mắt rồi gục đầu**
1. Nhắm mắt, sau đó cúi/gục đầu xuống đủ để MediaPipe mất landmark khi mắt
   vẫn đang nhắm.
2. Terminal in `[coverage] MAT_MAT_SAU_CHUI_DAU ... phát sự kiện mức 2` —
   xuất hiện trên dashboard (khung tím "MAT MAT SAU CHUI DAU"), và nếu vẫn
   nhắm mắt khi ngẩng đầu lại trong hạn cho phép, chuỗi Lớp 1 KHÔNG bị mất
   tiến độ.

**V5 — Eval UTA-RLDD**
```bash
python eval/eval_utarldd.py --videos-dir path/to/UTA-RLDD --nguon ear,hybrid
```
Chạy trên các video có nhãn cấp-video 0 (alert) / 5 (low vigilant) / 10
(drowsy, suy từ tên file) → bảng so sánh theo từng nguồn + báo cáo markdown +
CSV trong `reports/eval/<timestamp>/`.

**V6 — Báo cáo phiên**
1. Chạy demo một lúc rồi thoát (`q` hoặc Ctrl+C).
2. Kiểm tra `reports/sessions/<timestamp>/` có đủ `bao_cao.md`,
   `perclos_timeline.png`, `latency_hist.png`, `events.jsonl`.

---

## 8. Cấu hình

**Toàn bộ ngưỡng nằm trong `config.yaml`** — không có số hardcode trong code.
Config v1 cũ (không có các mục v2 bên dưới) vẫn chạy được nguyên vẹn — mọi
giá trị v2 đều có default tương thích ngược.

| Mục | Ý nghĩa |
|---|---|
| `layer1.nguong_nham_mat_giay` | Thời lượng nhắm mắt kích còi mặc định |
| `nguon_tin_hieu.mat` | Nguồn trạng thái mắt: `ear`\|`blendshape`\|`hybrid`\|`onnx` |
| `nguong_hysteresis` | Ngưỡng VÀO/RA nhắm cho EAR & blendshape (chống rung) |
| `nguon_onnx` | Đường dẫn model ONNX + ngưỡng (móc nối GĐ1) |
| `layer2.perclos`, `layer2.ngap`, `layer2.gat_dau` | Cửa sổ trượt + ngưỡng cho từng chỉ số Lớp 2 |
| `layer2.noisy_or` | Trọng số hợp nhất + bảng map risk -> mức 0-3 |
| `layer3.nguong_theo_muc_nen` | Bảng ngưỡng theo mức rủi ro nền (Lớp 3) |
| `coverage`, `mat_mat_landmark` | Ngưỡng khong_kha_dung, giữ-chuỗi khi mất mặt, pitch chúi đầu |
| `calibration` | Thời lượng calibrate, độ tách tối thiểu, độ rộng băng hysteresis |
| `frame_log` | Bật/tắt + sampling ghi JSONL để phân tích offline |
| `session_report` | Thư mục xuất báo cáo phiên |
| `alert_policy.cooldown_giay` | Chống spam còi/event |
| `uplink` | Địa chỉ server, endpoint, xe_id/tai_xe_id |

**Hiệu chỉnh pitch (gật đầu):** dấu của góc pitch trích từ
`facial_transformation_matrixes` phụ thuộc quy ước trục của thiết bị/camera.
Nếu test trên máy bạn thấy "Pitch" trên overlay đổi dấu SAI chiều khi cúi đầu
(âm khi lẽ ra phải dương), đặt `layer2.gat_dau.dao_dau_pitch: true` trong
`config.yaml` (không cần sửa code).

---

## 9. Test

```bash
pytest
```

`tests/` gồm: EAR/MAR/pitch trên landmark tổng hợp (`test_metrics.py`),
PERCLOS/ngáp/gật trên chuỗi timestamp dựng sẵn kể cả fps không đều
(`test_perclos.py`), bảng ngưỡng theo mức nền (`test_context.py`), hành vi
Lớp 1 + alert policy + giữ-chuỗi khi mất mặt (`test_layer1.py`), hysteresis
(`test_hysteresis.py`), các nguồn tín hiệu EAR/blendshape/hybrid/ONNX
(`test_eye_state.py`), coverage + phát hiện mất mặt (`test_coverage.py`),
tính ngưỡng calibration + lưu/đọc profile (`test_profile.py`), và báo cáo
phiên tự động (`test_session_report.py`).

---

## 10. Eval

### Video có nhãn hành vi (khung cổng GĐ1)

```bash
python eval/run_eval.py --video sample.mp4 --labels labels.csv
# so sánh nhiều nguồn tín hiệu trên CÙNG video:
python eval/run_eval.py --video sample.mp4 --labels labels.csv --nguon ear,blendshape,hybrid,onnx
```

`labels.csv` định dạng `start_sec,end_sec,label` với
`label ∈ {nham_mat, ngap, gat_dau}` — xem ví dụ ở `eval/labels_example.csv`.
In ra: **recall, precision, báo giả/giờ, coverage, độ trễ p50/p95/p99**. Ở
chế độ `--nguon`, in thêm bảng so sánh giữa các nguồn. Đây là khung cho cổng
chuyển GĐ1 (recall ≥ 85%, báo giả < 1 lần/giờ trên tập độc lập) — chưa cần
đạt số ở bản demo này, chỉ cần chạy đúng và ra đủ báo cáo.

### UTA-RLDD (nhãn cấp-video)

```bash
python eval/eval_utarldd.py --videos-dir path/to/UTA-RLDD
python eval/eval_utarldd.py --videos-dir path/to/UTA-RLDD --nguon ear,hybrid   # so sánh nguồn
python eval/eval_utarldd.py --videos-dir . --label-map nhan.csv                # nhãn tường minh (video_path,label)
```

Nhãn suy từ token `0`/`5`/`10` trong tên file hoặc thư mục cha (quy ước phổ
biến của UTA-RLDD gốc). Đo: báo giả/giờ trên video `alert`, tỷ lệ thời gian
ở mức ≥ 1 trên `drowsy` so với `alert`, PERCLOS trung bình theo lớp, coverage
theo lớp. Xuất `reports/eval/<timestamp>/{bao_cao.md, chi_tiet.csv}`.

---

## 11. Kiến trúc & phạm vi

```
driver-drowsiness/
├── config.yaml            # TẤT CẢ ngưỡng/tham số (v1 + v2)
├── run_demo.py            # khởi động edge + server + mở dashboard
├── edge/
│   ├── camera.py, landmark_provider.py, metrics.py   # capture -> landmark -> EAR/MAR/pitch/blendshapes
│   ├── hysteresis.py, eye_state.py                   # v2: HysteresisBoolState + EyeStateSource cắm được
│   ├── layer1_reflex.py, layer2_trend.py              # Lớp 1 phản xạ, Lớp 2 xu hướng
│   ├── context.py                                     # Lớp 3 hook bối cảnh
│   ├── coverage.py                                    # v2: CoverageTracker + FaceLossTracker
│   ├── profile.py, calibrate.py                       # v2: calibration cá nhân theo tài xế
│   ├── session_report.py                              # v2: báo cáo phiên tự động
│   ├── alert_policy.py, buzzer.py, uplink.py           # cooldown, còi, gửi event/telemetry
│   └── jsonl_logger.py, main.py                        # frame-log/bat_dong_nguon JSONL, vòng lặp chính
├── server/               # FastAPI stateless: nhận event/telemetry, SQLite, SSE
├── dashboard/            # 1 trang HTML+JS (realtime qua SSE)
├── eval/                 # run_eval.py (+ --nguon so sánh), eval_utarldd.py, labels_example.csv
├── profiles/             # (runtime, gitignored) profile cá nhân theo tài xế
├── reports/              # (runtime, gitignored) báo cáo phiên + báo cáo eval
└── tests/                # unit test cho toàn bộ module trên
```

**Không thuộc phạm vi nhánh này** (do các nhánh khác phụ trách): rPPG, radar
mmWave, phát hiện điện thoại/hút thuốc/dây an toàn.

**Điều cấm (đã tuân thủ trong code):**
- Không gửi frame/base64 theo từng khung hình — ảnh chỉ gửi kèm sự kiện mức
  ≥ 2 (`edge/uplink.py: gui_event`). Nhịp `gui_telemetry` gửi định kỳ
  (mặc định 2s/lần, `uplink.telemetry_interval_giay`) chỉ chứa số liệu vô
  hướng (PERCLOS, ngáp/phút, gật/phút, EAR, coverage, nguồn/profile đang
  dùng) để dashboard cập nhật realtime — không bao giờ kèm ảnh.
- Không có cơ chế emergency/gọi cấp cứu tự động — đầu ra tối đa là còi cabin
  + event lên dashboard.
- Không hardcode ngưỡng — toàn bộ nằm trong `config.yaml` (kể cả toàn bộ
  ngưỡng mới của v2).
- Không đo thời lượng bằng đếm frame — mọi cửa sổ trượt/coverage/gap dùng
  hiệu `time.monotonic()` gắn lúc chụp frame (`edge/camera.py`).
- Không dùng từ ngữ y tế trong UI/log/biến hướng người dùng.
- Server không giữ state phân tích per-driver (`server/app.py` chỉ lưu event
  đã được edge tính xong); Lớp 1 không phụ thuộc mạng
  (`edge/layer1_reflex.py` không import `uplink`/`context`/`requests`).
- Tương thích ngược: config v1 cũ (thiếu các mục v2) vẫn chạy đúng hành vi v1
  (mặc định `nguon_tin_hieu.mat: ear`, hysteresis fallback về `layer1.nguong_ear`).
