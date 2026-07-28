# PROMPT TRIỂN KHAI — NHÁNH CẢNH BÁO TÀI XẾ NGỦ GẬT (kiến trúc v2.0, phạm vi GĐ1 + demo)

> Dán toàn bộ nội dung dưới đây vào Claude Code. Nếu repo `Inferensys/ai-driver-safety` có sẵn trong workspace, đặt nó cạnh thư mục làm việc để Claude Code port lại các hàm metrics.

---

<vai_tro>
Bạn là kỹ sư phần mềm giàu kinh nghiệm về computer vision thời gian thực và hệ thống edge. Bạn xây dựng một hệ thống cảnh báo tài xế ngủ gật theo kiến trúc edge-first: toàn bộ phân tích chạy cục bộ trên thiết bị trong xe, server chỉ nhận sự kiện. Bạn viết code sạch, có cấu trúc module rõ ràng, mọi tham số ngưỡng đều nằm trong file cấu hình.
</vai_tro>

<boi_canh>
- Hệ thống thuộc kế hoạch v2.0 gồm 3 lớp: Lớp 1 Phản xạ (<1s, offline, còi cabin), Lớp 2 Xu hướng (10–60s, mức cảnh báo 0–3 gửi trung tâm), Lớp 3 Bối cảnh (hệ số rủi ro nền điều chỉnh ngưỡng hai lớp trên).
- Nhánh này triển khai: toàn bộ Lớp 1 + phần buồn ngủ của Lớp 2 (PERCLOS, tần suất ngáp, gật đầu) + hook nhận hệ số Lớp 3. KHÔNG triển khai rPPG, radar mmWave, phát hiện điện thoại/hút thuốc/dây an toàn (các nhánh khác phụ trách).
- Môi trường demo: chạy toàn bộ trên MỘT máy (laptop) với webcam thường. "Edge" là một process Python; "server" là FastAPI trên localhost. Camera IR là hạng mục phần cứng của lộ trình, không phải điều kiện của bản demo.
- Nếu có sẵn mã nguồn repo Inferensys/ai-driver-safety: port lại `eye_aspect_ratio`, `mouth_aspect_ratio` từ metrics.py, ý tưởng Noisy-OR fusion từ scoring.py và cooldown từ alerts.py. Nếu không có repo, tự cài đặt theo đặc tả bên dưới.
</boi_canh>

<muc_tieu>
Xây dựng hệ thống chạy được bằng một lệnh duy nhất, chứng minh được trên demo trực tiếp:
1. Nhắm mắt liên tục 1,2 giây → còi kêu ngay tại edge, độ trễ frame→còi < 300ms (có log chứng minh).
2. Tắt server giữa chừng → Lớp 1 vẫn kêu còi bình thường (chứng minh ràng buộc offline).
3. Tăng mức rủi ro nền trên dashboard → ngưỡng nhắm mắt tự hạ xuống 0,8 giây (chứng minh cơ chế Lớp 3).
4. Ngáp nhiều lần / nhắm mắt lai rai → PERCLOS tăng → mức cảnh báo leo 0→1→2→3, ảnh minh chứng xuất hiện trên dashboard.
</muc_tieu>

<kien_truc>
```
driver-drowsiness/
├── config.yaml                  # TẤT CẢ ngưỡng và tham số nằm ở đây
├── run_demo.py                  # khởi động edge + server + mở dashboard
├── edge/
│   ├── main.py                  # vòng lặp chính
│   ├── camera.py                # capture, gắn timestamp NGAY LÚC CHỤP
│   ├── landmark_provider.py     # MediaPipe FaceLandmarker (478 điểm, bật facial_transformation_matrixes)
│   ├── metrics.py               # EAR, MAR, pitch (từ transformation matrix)
│   ├── layer1_reflex.py         # phát hiện nhắm mắt theo THỜI GIAN THỰC + còi cục bộ
│   ├── layer2_trend.py          # PERCLOS 60s, ngáp/phút, đếm gật đầu, Noisy-OR → mức 0–3
│   ├── context.py               # đọc mức rủi ro nền (Lớp 3), tra bảng ngưỡng tương ứng
│   ├── alert_policy.py          # cooldown chống spam theo loại cảnh báo
│   ├── buzzer.py                # phát âm thanh non-blocking từ chính process edge
│   └── uplink.py                # gửi event JSON + ảnh minh chứng sang server (fire-and-forget)
├── server/
│   └── app.py                   # FastAPI stateless: nhận event, lưu SQLite/JSONL, phục vụ dashboard
├── dashboard/                   # 1 trang HTML+JS: trạng thái realtime (SSE hoặc polling),
│                                # đồ thị PERCLOS, danh sách sự kiện + ảnh, nút chỉnh mức rủi ro nền
├── eval/
│   ├── run_eval.py              # chạy trên video có nhãn → recall, precision, báo giả/giờ, độ trễ TB
│   └── labels_example.csv       # định dạng nhãn: start_sec,end_sec,label
└── tests/                       # unit test cho metrics và PERCLOS
```
Luồng dữ liệu: camera → landmark → metrics → (Lớp 1 phản xạ ngay) + (Lớp 2 tích lũy cửa sổ) → alert_policy → buzzer/uplink. Lớp 1 KHÔNG phụ thuộc uplink, server hay dashboard.
</kien_truc>

<dac_ta_chuc_nang>
1. Camera & timestamp
   - Capture ở fps cao nhất webcam cho phép (mục tiêu ≥ 15 fps), mỗi frame kèm `time.monotonic()` gắn ngay lúc đọc.
   - Mọi phép đo thời lượng tính bằng HIỆU TIMESTAMP, tuyệt đối không đếm số frame (frame rate không ổn định làm sai thời lượng).

2. Lớp 1 — Phản xạ (layer1_reflex.py)
   - Mắt "nhắm" khi EAR < `nguong_ear` (mặc định 0.21). Theo dõi thời điểm bắt đầu nhắm; khi (now − t_bắt_đầu) ≥ `nguong_nham_mat_giay` hiệu dụng → kích còi.
   - Còi phát non-blocking từ chính process edge (simpleaudio/sounddevice/pygame — chọn thư viện ổn định nhất trên máy hiện tại, kèm fallback in cảnh báo ra console nếu thiếu audio device).
   - Log mỗi lần kích: `latency_ms = (t_quyết_định − t_chụp_frame_kích_hoạt) × 1000`. In cảnh báo nếu > 300ms.
   - Chớp mắt bình thường (< 0,5s) không được kích còi.

3. Lớp 2 — Xu hướng (layer2_trend.py)
   - PERCLOS: tỷ lệ thời gian mắt nhắm trên cửa sổ trượt 60 giây, tính theo timestamp (tích lũy các khoảng nhắm, không đếm frame).
   - Ngáp: MAR > `nguong_mar` liên tục ≥ `nguong_ngap_giay` (mặc định 1,5s) = 1 sự kiện, có debounce (2 sự kiện cách nhau ≥ 3s); chỉ số = sự kiện/phút trên cửa sổ 3 phút.
   - Gật đầu: pitch (từ facial transformation matrix) chúi xuống vượt `nguong_pitch_do` (mặc định 20°) rồi hồi lại trong ≤ 2s = 1 sự kiện gật; đếm trên cửa sổ 3 phút.
   - Hợp nhất Noisy-OR: risk = 1 − ∏(1 − wᵢ·xᵢ) với xᵢ là các cờ/mức chuẩn hóa (PERCLOS vượt ngưỡng, ngáp/phút, gật/phút, sự kiện Lớp 1 gần đây), wᵢ trong config.
   - Map risk → mức cảnh báo 0/1/2/3 theo bảng trong config; quy tắc cứng: PERCLOS ≥ `nguong_perclos_cao` → tối thiểu mức 2.
   - Mức ≥ 2: chụp frame hiện tại, vẽ khung mặt + các chỉ số lên ảnh, lưu cục bộ và gửi kèm event.

4. Lớp 3 — Hook bối cảnh (context.py)
   - Mức rủi ro nền: `binh_thuong` | `cao`. Nguồn: endpoint trên server (dashboard chỉnh được) VÀ file cục bộ làm fallback; edge poll mỗi 5s, mất mạng thì giữ giá trị cuối.
   - Config định nghĩa BẢNG NGƯỠNG THEO MỨC NỀN, ví dụ:
     ```yaml
     nguong_theo_muc_nen:
       binh_thuong: { nham_mat_giay: 1.2, perclos_canh_bao: 0.35 }
       cao:         { nham_mat_giay: 0.8, perclos_canh_bao: 0.28 }
     ```
   - Đổi mức nền có hiệu lực runtime, không cần restart.

5. Alert policy & uplink
   - Cooldown theo loại (mặc định: còi Lớp 1 tối đa 1 lần/5s; event Lớp 2 cùng mức không lặp trong 30s).
   - Uplink: POST JSON nhỏ `{xe_id, tai_xe_id, ts, muc, chi_so: {perclos, ngap_phut, gat_phut, ear}, anh_minh_chung?}` — fire-and-forget với timeout ngắn, lỗi mạng chỉ ghi log, KHÔNG được chặn vòng lặp chính.

6. Server & dashboard
   - Server stateless: nhận event → ghi SQLite hoặc JSONL → phục vụ API đọc + SSE/polling cho dashboard. Không giữ bất kỳ state phân tích nào theo tài xế.
   - Dashboard 1 trang: mức cảnh báo hiện tại (0–3, đổi màu), đồ thị PERCLOS theo thời gian, danh sách sự kiện kèm ảnh minh chứng, nút gạt mức rủi ro nền (binh_thuong/cao) để demo Lớp 3, hiển thị độ trễ Lớp 1 gần nhất.
</dac_ta_chuc_nang>

<dieu_cam>
- KHÔNG gửi frame/base64 qua HTTP theo từng khung hình dưới bất kỳ hình thức nào. Ảnh chỉ được gửi khi là minh chứng của một sự kiện mức ≥ 2.
- KHÔNG có bất kỳ cơ chế emergency/tự động gọi cấp cứu nào. Đầu ra tối đa là còi cabin + event lên dashboard.
- KHÔNG hardcode ngưỡng trong code — mọi con số nằm trong config.yaml.
- KHÔNG đo thời lượng bằng đếm frame — chỉ dùng timestamp.
- KHÔNG dùng từ ngữ y tế trong UI/log/tên biến hướng người dùng ("đột quỵ", "bệnh lý", "chẩn đoán", "sức khỏe") — chỉ dùng "cảnh báo hành vi mất an toàn", "chỉ báo tham khảo".
- Server KHÔNG giữ state phân tích per-driver; Lớp 1 KHÔNG phụ thuộc mạng.
</dieu_cam>

<cong_nghe>
Python 3.10+, mediapipe (FaceLandmarker .task, bật output_facial_transformation_matrixes), opencv-python, numpy, fastapi + uvicorn, pyyaml, sqlite3 (chuẩn thư viện). Không yêu cầu GPU. Chạy được trên webcam laptop. requirements.txt đầy đủ, ghi rõ cách tải file model .task trong README.
</cong_nghe>

<kiem_thu>
- tests/: unit test cho EAR/MAR/pitch với landmark tổng hợp; test PERCLOS với chuỗi (timestamp, trạng thái mắt) dựng sẵn — kể cả trường hợp fps không đều; test bảng ngưỡng đổi theo mức nền.
- eval/run_eval.py: đầu vào video + labels CSV (start_sec,end_sec,label ∈ {nham_mat, ngap, gat_dau}) → xuất recall, precision, số báo giả/giờ, độ trễ trung bình. Đây là khung cho cổng GĐ1 (recall ≥ 85%, báo giả < 1 lần/giờ) — chưa cần đạt số, cần chạy đúng.
</kiem_thu>

<quy_trinh>
Làm theo 5 bước, sau mỗi bước chạy thử và báo cáo ngắn (chạy được gì, lệnh gì để tôi tự kiểm tra) rồi mới sang bước kế:
1. Skeleton + config.yaml + camera loop + landmark provider (hiển thị EAR/MAR/pitch realtime lên cửa sổ preview).
2. Lớp 1 + buzzer + log độ trễ. Mốc kiểm tra: nhắm mắt 1,2s → còi; rút mạng vẫn chạy.
3. Lớp 2 đầy đủ + Noisy-OR + alert policy + lưu ảnh minh chứng.
4. Server + uplink + dashboard (SSE/polling, nút mức rủi ro nền).
5. Hook Lớp 3 hoàn chỉnh + eval harness + tests + README (cách chạy demo 4 kịch bản trong <muc_tieu>).
</quy_trinh>

<tieu_chi_hoan_thanh>
- `python run_demo.py` khởi động toàn bộ; README mô tả 4 kịch bản demo và cách tái hiện từng kịch bản.
- Cả 4 mục trong <muc_tieu> đều tái hiện được trên webcam laptop.
- `pytest` xanh; `python eval/run_eval.py --video sample.mp4 --labels labels.csv` chạy ra báo cáo đủ 4 chỉ số.
- Toàn bộ ngưỡng chỉnh được trong config.yaml, đổi mức nền không cần restart.
</tieu_chi_hoan_thanh>
