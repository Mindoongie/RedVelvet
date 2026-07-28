# TỔNG HỢP CHI TIẾT — KẾ HOẠCH v2.0
## Hệ thống giám sát an toàn tài xế & hành khách trên xe

---

## 1. Tư tưởng thiết kế cốt lõi

Bốn nguyên tắc xuyên suốt, mọi quyết định kỹ thuật đều truy về đây:

1. **Hành vi thị giác là cảm biến chính.** Đo hành vi là đo hình học (mí mắt che bao nhiêu phần trăm con ngươi) — đại lượng bất biến với rung xe và biến động ánh sáng. Đo rPPG là đo điều biến cường độ dưới 1% — đại lượng bị rung xe và ánh sáng nhấp nháy phá hủy trực tiếp. Đây là khác biệt về bản chất vật lý, không phải độ khó kỹ thuật, nên không thể khắc phục bằng thuật toán tốt hơn.
2. **Edge-first.** Mọi thứ có ràng buộc thời gian thực chạy offline trên xe. Server chỉ nhận sự kiện và chỉ số, không nhận luồng video liên tục.
3. **Con người quyết định cuối.** Không tồn tại bất kỳ kích hoạt cấp cứu tự động nào. Mọi bất thường là mục đề xuất trên bảng điều hành.
4. **Danh mục dự thảo Nghị định = đặc tả bắt buộc.** Nhịp tim không nằm trong danh mục, do đó không được phép là đường găng của dự án.

---

## 2. Căn cứ thị trường & định vị

**Cơ hội:** Từ 01/7/2026, xe ô tô kinh doanh vận tải hành khách từ 8 chỗ trở lên bắt buộc lắp thiết bị giám sát hành trình, thiết bị ghi hình người lái và thiết bị ghi hình khoang chở khách. Phần cứng đang được lắp đại trà — nhu cầu chuyển sang lớp phần mềm phân tích.

**Đặc tả từ dự thảo Nghị định (Bộ Công an):** camera tự động nhận diện và cảnh báo: ngủ gật, hút thuốc, sử dụng điện thoại, không thắt dây an toàn, buông hai tay khỏi vô lăng, lái xe quá thời gian quy định — truyền dữ liệu thời gian thực.

**Ngôn ngữ sản phẩm (ràng buộc pháp lý, không phải hình thức):**

| Được dùng | Không được dùng |
|---|---|
| Cảnh báo hành vi mất an toàn giao thông | Chẩn đoán, tầm soát bệnh lý |
| Chỉ báo tham khảo về trạng thái sinh lý | Phát hiện đột quỵ, cảnh báo tim mạch |
| Hỗ trợ điều hành viên ra quyết định | Tự động gọi cấp cứu |
| Nhắc nhở tài xế | Theo dõi sức khỏe tài xế |

Mô tả sản phẩm như thiết bị theo dõi bệnh lý sẽ đẩy phần mềm về khung quản lý trang thiết bị y tế và tạo nghĩa vụ tuân thủ không cần thiết.

---

## 3. Kiến trúc chức năng ba lớp

Ba lớp có thang thời gian khác nhau. **Lớp chậm không phát cảnh báo — nó điều chỉnh độ nhạy của lớp nhanh.**

```
LỚP 1 — PHẢN XẠ       < 1 giây     Edge, offline     → Còi trong cabin
   ↑ ngưỡng được điều chỉnh bởi
LỚP 2 — XU HƯỚNG      10–60 giây   Edge              → Cảnh báo mềm + trung tâm
   ↑ ngưỡng được điều chỉnh bởi
LỚP 3 — BỐI CẢNH      phút–giờ     Edge + server     → Hệ số rủi ro nền
```

### 3.1 Lớp 1 — Phản xạ

| Thuộc tính | Đặc tả |
|---|---|
| Mục tiêu | Bắt microsleep và nhắm mắt kéo dài |
| Đầu vào | Video hồng ngoại 850nm hoặc 940nm, ≥ 15 fps |
| Xử lý | Face landmark → chỉ số đóng mắt (EAR) hoặc mô hình phân loại trạng thái mắt |
| Kích hoạt | Mắt nhắm liên tục ≥ 1,2 giây (giá trị khởi điểm, hiệu chỉnh trên dữ liệu Việt Nam) |
| Đầu ra | Còi trong cabin |
| Ngân sách độ trễ | < 300 ms từ khung hình đến âm thanh |
| Ràng buộc | **Chạy hoàn toàn offline — không thương lượng.** Một cảnh báo chống ngủ gật đi qua đường truyền di động là một cảnh báo có thể không đến |

### 3.2 Lớp 2 — Xu hướng

| Chỉ số | Cách tính | Ghi chú |
|---|---|---|
| PERCLOS | Tỷ lệ thời gian mắt nhắm trên cửa sổ trượt 60 giây | Tham chiếu literature: 0–30% tỉnh táo, 30–40% buồn ngủ. Bắt buộc hiệu chỉnh lại trên dữ liệu Việt Nam |
| Tần suất ngáp | Số sự kiện/phút, từ chỉ số mở miệng (MAR) + phân loại | — |
| Gật đầu | Số sự kiện gật từ góc pitch của head pose | — |
| Điện thoại, hút thuốc | Object detection trong vùng cabin | Theo danh mục dự thảo Nghị định |
| Dây an toàn, tay rời vô lăng | Phân đoạn + tư thế | Theo danh mục dự thảo Nghị định |

**Đầu ra:** mức cảnh báo 0–3, gửi về trung tâm điều hành kèm ảnh minh chứng.

### 3.3 Lớp 3 — Bối cảnh

Lớp rẻ nhất và thường bị bỏ phí nhất — phần lớn đầu vào đã có sẵn, không cần cảm biến mới.

| Nguồn | Dữ liệu | Đóng góp vào hệ số rủi ro |
|---|---|---|
| Thiết bị GSHT | Thời gian lái liên tục, tổng giờ ngày/tuần | Luật giới hạn 4 giờ liên tục, 10 giờ/ngày, 48 giờ/tuần. Càng gần trần, rủi ro càng cao |
| Đồng hồ hệ thống | Khung giờ | Hai đỉnh nguy cơ sinh học: 00–06h và 13–15h |
| rPPG (mục 4) | Nhịp tim nền đo lúc dừng | Lệch khỏi baseline cá nhân |

**Cơ chế sử dụng:** khi hệ số rủi ro nền cao, hạ ngưỡng Lớp 1 và Lớp 2 — ví dụ ngưỡng nhắm mắt từ 1,2 giây xuống 0,8 giây, ngưỡng PERCLOS từ 35% xuống 28%. Hệ thống nhạy hơn đúng vào lúc tài xế dễ ngủ gật nhất, thay vì một ngưỡng cố định cho mọi hoàn cảnh.

---

## 4. rPPG — chỉ báo bối cảnh lúc dừng

### 4.1 Điều kiện kích hoạt (đồng thời cả ba)

- Vận tốc GPS < 2 km/h liên tục ≥ 15 giây
- Độ rung từ IMU dưới ngưỡng đặt trước
- Phát hiện được vùng trán không bị che (tóc mái, mũ, kính râm là điều kiện loại)

Điều kiện này né hai nguồn nhiễu chí mạng: rung thân xe (1–2 Hz) và ánh sáng nhấp nháy khi di chuyển (60 km/h qua hàng cột cách 20 m → 0,83 Hz ≈ 50 BPM) — cả hai đều nằm trong dải nhịp tim người, không lọc được bằng bandpass.

### 4.2 Chuỗi xử lý

```
Camera (khóa exposure/gain/WB, tắt HDR, tắt denoise)
  ↓
[EDGE] MediaPipe → ROI vùng trán → rgb_mean + timestamp lúc chụp
  ↓
[EDGE] Resample về lưới thời gian đều 30 Hz
  ↓
[EDGE] POS → Butterworth bandpass 0,7–4 Hz
  ↓
[EDGE] FFT cửa sổ 20–30 giây → đỉnh phổ + tính SQI
  ↓
SQI đạt? ── Không ──→ trả về `unavailable`
  │ Có
  ↓
[SERVER] BPM + SQI + timestamp (vài chục byte)
```

### 4.3 Bốn sửa đổi kỹ thuật bắt buộc

| # | Sửa đổi | Lý do |
|---|---|---|
| a | Xử lý tại edge, không gửi frame | 720p/15fps ≈ 10–18 Mbps/người — xe 30 học sinh bất khả thi trên 4G. Nén H.264/JPEG với chroma subsampling xóa sạch mức điều biến 0,1–1% chính là tín hiệu cần đo. Trích rgb_mean tại edge → vài chục kbps, bảo toàn tín hiệu |
| b | Timestamp gắn lúc chụp + resample lưới đều | Variable frame rate + jitter mạng làm giả định fps cố định sai → FFT map sai bin, trả BPM sai âm thầm không có dấu hiệu lỗi |
| c | Cửa sổ 20–30 giây (thay 10 giây) | Cửa sổ 10s → độ phân giải 0,1 Hz = 6 BPM, không phân biệt được 128 với 132. Cửa sổ 30s → 0,033 Hz ≈ 2 BPM. Khả thi vì chỉ chạy khi xe đứng yên, không có yêu cầu realtime |
| d | Cổng chất lượng tín hiệu SQI | SQI = năng lượng ±0,2 Hz quanh đỉnh / năng lượng còn lại trong 0,7–4 Hz. Dưới ngưỡng (khởi điểm 3 dB) → trả `unavailable`, tuyệt đối không trả số. FFT luôn tìm được một đỉnh kể cả trên nhiễu thuần — không có cổng này, không phân biệt được "đo được 72" với "đoán bừa ra 72" |

### 4.4 Diễn giải kết quả

Bỏ hoàn toàn ngưỡng cố định 50/130 BPM (50 bình thường với người thể lực tốt; 130 bình thường với học sinh vừa chạy lên xe; nhịp nghỉ trẻ tiểu học vốn 75–115 — ngưỡng người lớn áp lên trẻ em tạo bão cảnh báo giả → người vận hành tắt tính năng).

Thay bằng **baseline cá nhân**:
- Median trượt 14 ngày của các phép đo đạt SQI, theo từng người
- Đánh dấu khi lệch quá 2 độ lệch chuẩn so với baseline của chính người đó
- Đầu ra là một mục trên bảng điều hành cho người trực xem xét — **không kích hoạt bất kỳ cơ chế khẩn cấp nào**

### 4.5 Ba điều rPPG không làm (ghi rõ trong tài liệu kỹ thuật)

1. **Không phát hiện đột quỵ** — đột quỵ là sự cố mạch máu não; nhịp tim không phải dấu hiệu chẩn đoán, nhiều ca đột quỵ nhịp tim hoàn toàn bình thường.
2. **Không đo căng thẳng** — cần HRV (tỷ số LF/HF) với độ chính xác từng khoảng nhịp cỡ mili-giây, điều đỉnh FFT về nguyên lý không cung cấp.
3. **Không phát hiện ngủ gật** — LF/HF cần cửa sổ 1–5 phút, microsleep chỉ 3–15 giây. Sai thang thời gian một bậc độ lớn.

---

## 5. Khoang hành khách — phát hiện bỏ quên trẻ

Hạng mục có tỷ lệ giá trị trên độ khó cao nhất toàn đề án, ý nghĩa xã hội rõ ràng nhất tại Việt Nam.

| Thuộc tính | Đặc tả |
|---|---|
| Kích hoạt | Sau khi tắt máy và đóng cửa → quét toàn khoang |
| Phương pháp chính | Phát hiện người + phát hiện chuyển động vi mô trên video IR |
| Phương pháp bổ trợ | Radar mmWave (trẻ nằm khuất dưới ghế, bị che bằng chăn) |
| Thang leo cảnh báo | Còi trong xe → tin nhắn tài xế → gọi điều hành viên → gọi phụ huynh |
| Yêu cầu | **Không được phép âm thầm bỏ sót — thà báo giả còn hơn bỏ lọt** |

**Nguyên tắc thiết kế đảo ngược:** đây là bài toán duy nhất ưu tiên recall tuyệt đối trên precision — ngược hoàn toàn với cảnh báo hành vi tài xế, nơi báo giả cao sẽ giết chết sản phẩm.

---

## 6. Hạ tầng kỹ thuật

### 6.1 Phân chia edge / server

| Chạy tại edge | Chạy tại server |
|---|---|
| Toàn bộ Lớp 1 | Tổng hợp đa phương tiện |
| Toàn bộ Lớp 2 | Bảng điều hành, quản lý cảnh báo |
| Trích xuất chỉ số rPPG + SQI | Baseline cá nhân theo thời gian dài |
| Phát hiện bỏ quên khoang khách | Lưu minh chứng, báo cáo tuân thủ |

**Nguyên tắc state:** state nằm ở edge theo từng xe; server hoàn toàn stateless (scale ngang được, không rò rỉ bộ nhớ theo person_id).

### 6.2 Yêu cầu phần cứng camera

| Tham số | Yêu cầu | Lý do |
|---|---|---|
| Chiếu sáng | IR chủ động 850nm hoặc 940nm | Hoạt động ban đêm; giảm ảnh hưởng ánh sáng ngoài |
| Frame rate | ≥ 15 fps, ổn định | Lớp 1 cần độ trễ thấp |
| Exposure/gain/WB | Khóa được qua API | Auto-exposure triệt tiêu đúng dao động rPPG cần đo |
| HDR, denoise | Tắt được | Xử lý hậu kỳ phá tín hiệu vi sai |
| Truy cập luồng | Raw hoặc nén thấp | Nén phá tín hiệu rPPG |

**Hành động sớm (GĐ 0):** đa số camera IP/hành trình trên thị trường không cho khóa các tham số này — khảo sát và chốt nhà cung cấp **trước khi viết dòng code rPPG nào**.

---

## 7. Tuân thủ pháp lý

### 7.1 Bảo vệ dữ liệu cá nhân — Luật 91/2025/QH15 (hiệu lực 01/01/2026)

Video khuôn mặt + dữ liệu sinh lý = nhóm dữ liệu nhạy cảm nhất (sinh trắc học + sức khỏe).

| Hạng mục | Yêu cầu |
|---|---|
| Đồng ý — tài xế | Văn bản riêng trong khuôn khổ quan hệ lao động, nêu rõ mục đích và thời hạn lưu |
| Đồng ý — học sinh | Người đại diện theo pháp luật; trẻ từ đủ 07 tuổi cần đồng ý của cả trẻ và người đại diện; có cơ chế rút lại |
| Tối thiểu hóa | Không truyền/lưu ảnh mặt thô khi không cần; ưu tiên landmark và chỉ số dẫn xuất |
| Bảo mật | Mã hóa dữ liệu sinh trắc, hạn chế quyền truy cập, ghi log truy cập |
| Sự cố | Cơ chế thông báo cho chủ thể dữ liệu khi xảy ra thiệt hại |

### 7.2 Quản lý hệ thống AI — Luật 134/2025/QH15 (01/3/2026) + NĐ 142/2026/NĐ-CP (01/5/2026)

- Bắt buộc phân loại hệ thống AI theo mức rủi ro trước khi đưa vào sử dụng; chịu trách nhiệm pháp lý về kết quả phân loại
- Tự đánh giá hoặc qua tổ chức đánh giá sự phù hợp; rủi ro cao có thể bị yêu cầu đánh giá độc lập
- Nộp kết quả và nhận mã định danh qua Cổng một cửa về AI (Bộ KH&CN); nghĩa vụ báo cáo sự cố + định kỳ
- **Đánh giá sơ bộ:** hệ thống giám sát trẻ em + suy luận sinh lý + can thiệp an toàn giao thông = ứng viên mạnh cho nhóm rủi ro cao. Thiết kế v2.0 (hạ cấp rPPG, bỏ auto cấp cứu) đã chủ động giảm mức rủi ro nhưng vẫn phải phân loại chính thức — **khởi động hồ sơ từ GĐ 0**

### 7.3 Trang thiết bị y tế

Ngôn ngữ sản phẩm mục 2 được thiết kế để tránh bị xếp vào khung TTBYT. Luật sư chuyên ngành rà toàn bộ tài liệu marketing + kỹ thuật trước khi công bố.

---

## 8. Kế hoạch kiểm định

### 8.1 Nguyên tắc hai con số

Mỗi tính năng báo cáo **hai** con số: (1) độ chính xác khi hệ thống trả kết quả, (2) tỷ lệ thời gian có kết quả hợp lệ (coverage). Mốc cảnh tỉnh: nghiên cứu rPPG trên đường thật với 10 tài xế — chỉ 4 người đạt ±5 BPM trong 48–75% thời lượng chuyến; 6 người còn lại độ chính xác dưới 20%. Chỉ báo MAE trên phần dữ liệu hợp lệ sẽ cho con số đẹp và vô nghĩa.

### 8.2 Chỉ tiêu theo tính năng

| Tính năng | Đối chứng | Chỉ số bắt buộc |
|---|---|---|
| Lớp 1 — nhắm mắt | Chuyên gia gán nhãn video | Recall, độ trễ trung bình, **báo giả/giờ** |
| Lớp 2 — PERCLOS | Gán nhãn + thang KSS tự báo cáo | Sensitivity, specificity, báo giả/giờ |
| Hành vi vi phạm | Gán nhãn thủ công | Precision, recall theo từng hành vi |
| rPPG | Đai ngực hoặc SpO2 | MAE **và** coverage, tách theo điều kiện |
| Bỏ quên khoang khách | Kịch bản dàn dựng | Recall (mục tiêu 100%), báo giả/ngày |

**Báo giả/giờ là chỉ số sống chết:** recall 95% nhưng báo giả 5 lần/giờ → tài xế vô hiệu hóa trong tuần đầu → recall thực tế = 0.

### 8.3 Yêu cầu tập dữ liệu

- ≥ 30 người, đủ đa dạng: kính, kính râm, tóc mái, mũ, râu, nhiều tông da
- ≥ 3 khung giờ: sáng, chiều, đêm
- Đủ điều kiện đường: nội đô, cao tốc, đường xấu, mưa, nắng gắt, qua hầm
- **Tập kiểm định độc lập với tập hiệu chỉnh ngưỡng**

---

## 9. Lộ trình & cổng chuyển giai đoạn

| GĐ | Thời gian | Nội dung | Điều kiện chuyển giai đoạn |
|---|---|---|---|
| 0 | Tuần 1–4 | Khảo sát + chốt camera (mục 6.2). Khởi động hồ sơ phân loại AI + tuân thủ dữ liệu | ≥ 2 nhà cung cấp camera khóa được exposure/gain/WB |
| 1 | Tháng 1–3 | Lớp 1 + Lớp 2 trên edge. Thu thập + gán nhãn dữ liệu Việt Nam. Hiệu chỉnh ngưỡng | Recall ≥ 85% và báo giả < 1 lần/giờ trên tập độc lập |
| 2 | Tháng 3–6 | Lớp 3 (GSHT, khung giờ). Bỏ quên khoang khách. Bảng điều hành | Recall bỏ quên = 100% trên bộ kịch bản dàn dựng |
| 3 | Tháng 6–9 | rPPG lúc dừng, có SQI + baseline cá nhân | **Chỉ khởi động nếu GĐ 1, 2 đã đạt.** Coverage ≥ 60% khi dừng, MAE ≤ 5 BPM |
| ∥ | Suốt dự án | Phân loại AI, hồ sơ đồng ý, rà pháp lý tài liệu | Hoàn tất trước phát hành thương mại |

**Nguyên tắc lộ trình:** rPPG ở cuối và có điều kiện — nếu GĐ 1, 2 gặp khó, loại rPPG mà sản phẩm vẫn đầy đủ chức năng theo dự thảo Nghị định. (Bản 1.0 đặt rPPG ở đường găng: tính năng xác suất thất bại cao nhất có khả năng kéo sập toàn đề án.)

---

## 10. Rủi ro & biện pháp

| Rủi ro | Mức | Biện pháp |
|---|---|---|
| Không tìm được camera khóa exposure | Cao | Đưa lên GĐ 0; thất bại → loại rPPG khỏi phạm vi ngay |
| Báo giả cao → người dùng tắt tính năng | Cao | Báo giả/giờ là **cổng chuyển giai đoạn**, không phải chỉ số phụ |
| Tóc mái/mũ che trán → rPPG không đo được | TB | Đã tính vào điều kiện kích hoạt; coverage thấp là kết quả chấp nhận được, không phải lỗi |
| Bị phân loại rủi ro cao → chi phí đánh giá độc lập | TB | Hồ sơ từ GĐ 0; thiết kế đã chủ động giảm mức rủi ro |
| Phản ứng tài xế về quyền riêng tư | TB | Minh bạch dữ liệu; xử lý tại edge, không truyền video liên tục; truyền thông nội bộ trước triển khai |
| Dự thảo Nghị định đổi danh mục hành vi | Thấp | Kiến trúc lớp cho phép thêm bộ phát hiện mới không sửa lõi |

---

## 11. Bản đồ dataset

### Nhóm A + B — Hành vi (Lớp 1, Lớp 2)

| Bộ | Quy mô | Dùng cho | Nơi tải |
|---|---|---|---|
| MRL Eye Dataset | ~85.000 ảnh mắt IR, 37 người | Lớp 1 — nhắm/mở mắt | Kaggle, Roboflow |
| Roboflow Universe | Nhiều bộ 1.000–10.000 ảnh | Lớp 1 + 2, khởi động nhanh | universe.roboflow.com |
| StateFarm Distracted Driver | ~22.000 ảnh, 10 lớp | Lớp 2 — điện thoại, tay rời vô lăng | Kaggle |
| UTA-RLDD | 60 người, 30 giờ, buồn ngủ thật | Lớp 2 — PERCLOS | Kaggle mirror |
| YawDD | ~350 video trong xe thật | Ngáp | IEEE DataPort |
| DMD (MIT) | 37 người, RGB xe thật | Lớp 2, gaze, head pose | GitHub Vicomtech |
| chbh7051/driver-drowsiness | — | Khởi động nhanh | Hugging Face |

### Nhóm C — rPPG (thứ tự dùng)

1. **UBFC-rPPG** (42 video) hoặc **PURE** (10 người, 6 kịch bản chuyển động đầu) — hiệu chuẩn POS trong điều kiện lý tưởng, xác nhận code đúng
2. **MR-NIRP Car / Garage** — thử đúng điều kiện vận hành (đỗ, nổ máy) mà kế hoạch quy định
3. **MR-NIRP Car / Driving** — chứng minh vì sao KHÔNG chạy rPPG khi xe di chuyển (slide phản biện, không phải slide thất bại)

### Cần email xin phép

| Bộ | Vì sao đáng chờ | Đầu mối |
|---|---|---|
| NTHU-DDD | IR + ban đêm + kính râm — gần điều kiện thực nhất | Ký license, email CVLab NTHU |
| MR-NIRP Car | Bộ rPPG duy nhất có kịch bản "Garage" khớp thiết kế | MERL/Rice |
| DROZY | Buồn ngủ thật + ground truth PSG/PVT — đối chứng mạnh nhất | ORBi (ĐH Liège) |
