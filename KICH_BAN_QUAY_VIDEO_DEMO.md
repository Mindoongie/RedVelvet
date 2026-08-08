# KỊCH BẢN MASTER QUAY VIDEO DEMO & PITCHING (CHUẨN 3 PHÚT)
> **Dự án:** EduSafe Bus – Nền Tảng An Toàn Xe Đưa Đón Học Sinh Ứng Dụng AI Thông Minh  
> **Thời lượng chuẩn:** **2 phút 45 giây – Đúng 3 phút (180 giây)**  
> **Tốc độ đọc đề xuất:** 135 – 145 từ / phút (Khoảng 425 từ – liền mạch, dứt khoát, không đổi tài khoản vòng vo)  
> **Tỉ lệ khung hình:** 16:9 (Full HD 1080p hoặc 2K 60fps)

---

## ⏱️ TIMELINE TỔNG QUAN (180 GIÂY – MỖI VAI TRÒ 1 LẦN DUY NHẤT)

```mermaid
timeline
    title Luồng 5 Bước Liền Mạch (Không Đổi Tài Khoản Quay Đầu)
    0:00 - 0:45 (45s) : 1. Phụ huynh (Đăng ký nạp ảnh Face ID từ máy -> Chuyển Tab xem Live GPS & Báo động 1 chạm)
    0:45 - 1:30 (45s) : 2. Cabin Lái xe (Nhận diện bé vừa đăng ký 99.4% -> Chống ngủ gật EAR + Khóa rà soát cuối xe)
    1:30 - 1:55 (25s) : 3. Giáo viên tại trường (Giám sát đón/trả -> Manual Fallback ghi đè 1 click)
    1:55 - 2:35 (40s) : 4. Ban Giám Hiệu (Quản lý 12 xe, 284 học sinh -> Ma trận SOS < 200ms -> Xuất CSV)
    2:35 - 3:00 (25s) : 5. AI Specs Drawer & Tuyên bố sứ mệnh kết bài
```

---

## 🎬 BẢNG PHÂN CẢNH CHI TIẾT THEO TỪNG GIÂY (ACTION & VOICE-OVER)

---

### 🌟 PHẦN 1: MỞ ĐẦU & APP PHỤ HUYNH (0:00 – 0:45) • [45 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **0:00 – 0:20** | • Mở màn hình `LoginScreen` -> Chọn tài khoản **Phụ huynh** (`parent.chi@edusafe.edu.vn`).<br>• Vào Tab **"Đăng ký tuyến & Face ID"**: Nhập ID `HS-001`, tên bé *Phạm Phương Chi*, tuyến `BUS-01`.<br>• Bấm **"Tải ảnh từ máy"** -> Hiện `✓ Vector 128-D sẵn sàng`. Bấm **"Đăng ký xe & Lưu Face ID"**. | *"[Tông giọng trầm ấm, tự tin]* Kính chào Ban Giám Khảo! Những thảm kịch do **bỏ quên học sinh trên xe** hay **tài xế ngủ gật gây tai nạn** đang là nỗi bất an lớn của xã hội. Nhóm chúng em phát triển **EduSafe Bus** – nền tảng AI Edge và IoT thời gian thực, xây dựng 'lá chắn an toàn đa lớp' bảo vệ học sinh từ lúc bước lên xe đến khi về tới trường!<br><br>Đầu tiên là App Phụ huynh: Phụ huynh dễ dàng đăng ký tuyến xe và **nạp ảnh Face ID trực tiếp từ điện thoại hoặc máy tính** để trích xuất vector 128 chiều bảo mật ngay trên thiết bị." |
| **0:20 – 0:45** | • Chuyển sang Tab **"Theo dõi hành trình"**: Xem bản đồ Live GPS và ETA tới trường.<br>• Thấy cảnh báo đỏ: *Xe đang chệch lộ trình > 280m*.<br>• Bấm nút đỏ: **"Gửi cảnh báo khẩn cấp"**.<br>• Thanh **Global Emergency Banner** nhấp nháy đỏ trên toàn hệ thống. | *"Đồng thời phụ huynh theo dõi trực tiếp vị trí GPS của xe. Khi xe chệch khỏi lộ trình chuẩn trên 100m dựa trên **thuật toán Haversine GPS**, phụ huynh nhận cảnh báo ngay. Chỉ cần bấm **'Gửi cảnh báo khẩn cấp'**, tín hiệu lập tức đồng bộ thời gian thực tới BGH, Giáo viên và Tài xế trong chưa đầy **0.2 giây**!" |

---

### 🛡️ PHẦN 2: CABIN TÀI XẾ – AI EDGE, NGỦ GẬT & KHÓA AN TOÀN KÉP (0:45 – 1:30) • [45 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **0:45 – 1:05** | • Đăng xuất -> Đăng nhập **Lái xe bus** (`driver.hung@edusafe.edu.vn`).<br>• Bấm **"Bắt đầu chuyến đi"**.<br>• Camera AI đối chiếu đúng gương mặt bé *Phạm Phương Chi* vừa đăng ký -> Hiện `Match: 99.4% ✓`, danh sách tự động tích xanh. | *"[Tông giọng hào hứng, tự hào]* Tiếp theo là Tablet tại cabin tài xế. Camera **AI Edge** đối chiếu vector và tự động điểm danh với **độ tin cậy 99.4%** ngay trên thiết bị mà không cần gửi ảnh lên cloud, vừa bảo mật quyền riêng tư cho trẻ vừa hoạt động mượt mà cả khi mất mạng." |
| **1:05 – 1:18** | • Chuyển sang cột trái: Bật webcam giám sát tài xế.<br>• Nhắm mắt > 2s -> Màn hình nhảy **banner đỏ**, còi báo động trong cabin hú liên tục (`beep alert`). | *"Đặc biệt, Lõi AI giám sát mắt **EAR** và ngáp **MAR** theo mô hình **Noisy-OR Bayesian Fusion**. Khi phát hiện tài xế nhắm mắt quá 2.5 giây, còi báo động lập tức hú vang trong cabin để đánh thức tài xế, ngăn ngừa tai nạn từ sớm!" |
| **1:18 – 1:30** | • Thử bấm **"Kết thúc chuyến"** -> Hệ thống hiện cảnh báo đỏ chặn lại: *⛔ QUY ĐỊNH BẮT BUỘC*.<br>• Bấm **"Rà soát khoang xe cuối hành trình"** -> Bấm **"Xác nhận xe trống 100% & Bàn giao"**. | *"Khi về bến, hệ thống áp dụng **cơ chế khóa an toàn kép**: Nếu vẫn còn học sinh trên xe hoặc chưa hoàn thành rà soát khoang xe cuối hành trình, hệ thống sẽ chặn hoàn toàn lệnh kết thúc chuyến, **xóa bỏ 100% thảm kịch bỏ quên học sinh**!" |

---

### 🏫 PHẦN 3: GIÁO VIÊN GIÁM SÁT TẠI TRƯỜNG & MANUAL FALLBACK (1:30 – 1:55) • [25 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **1:30 – 1:55** | • Đăng xuất -> Đăng nhập **Giáo viên giám sát** (`teacher.thu@edusafe.edu.vn`).<br>• Thấy ngay banner cảnh báo từ phụ huynh.<br>• Tìm học sinh *Trần Gia Bảo (Quét thất bại)* -> Bấm nút **"Điểm danh"** (Manual Fallback) -> Đổi sang tích xanh. | *"[Tông giọng chuyên nghiệp]* Tại trường, giáo viên nắm bắt toàn bộ trạng thái đón/trả và cảnh báo từ phụ huynh. Khi học sinh đeo khẩu trang hoặc trời mưa tối khiến AI quét lỗi, giáo viên có thể thực hiện **Manual Fallback** – ghi đè điểm danh thủ công chỉ với 1 click mà không làm gián đoạn hành trình." |

---

### ⚡ PHẦN 4: TRUNG TÂM BGH & MA TRẬN CỨU HỘ SOS (1:55 – 2:35) • [40 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **1:55 – 2:15** | • Đăng xuất -> Đăng nhập **Admin trường** (`admin@edusafe.edu.vn`).<br>• Lướt qua 12 xe, 284 học sinh và **Nhật ký cảnh báo AI system**.<br>• Bấm **"Xuất báo cáo an toàn"** tải file CSV. | *"[Tông giọng uy quyền, tổng quan]* Với Ban Giám Hiệu, Dashboard quản trị kiểm soát 100% đội xe, chỉ số an toàn toàn trường và nhật ký AI cập nhật từng giây. Dữ liệu vận hành được xuất thành báo cáo an toàn CSV chuẩn hóa chỉ với 1 click." |
| **2:15 – 2:35** | • Bấm nút **SOS màu đỏ** trên Navbar -> Chọn *Tai nạn* -> Bấm **"KÍCH HOẠT SOS CẤP TỐC"**.<br>• Log 4 kênh kích hoạt thành công.<br>• Bấm **"Tiếp nhận & Phối hợp"** trên banner để hoàn tất. | *"Khi xảy ra sự cố nguy cấp, **Ma trận SOS đa kênh** điều phối cứu hộ tức thời qua **RabbitMQ**, phát tín hiệu tới 115, 113 và phụ huynh với độ trễ dưới 200 mili-giây." |

---

### 🚀 PHẦN 5: AI SPECS & LỜI KẾT PITCHING (2:35 – 3:00) • [25 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **2:35 – 3:00** | • Bấm nút **`</> AI Specs`** mở ngăn kéo kỹ thuật JSON.<br>• Trở về màn hình chính, mở slide kết thúc bài thuyết trình. | *"[Tông giọng truyền cảm hứng, đanh thép]* Toàn bộ giải pháp được xây dựng trên kiến trúc AI Edge và Microservices hướng sự kiện sẵn sàng mở rộng quy mô toàn quốc. **EduSafe Bus – An toàn của học sinh, Hạnh phúc của mọi gia đình!** Nhóm chúng em xin trân trọng cảm ơn!" |

---

## 🎙️ BẢN ĐỌC LIỀN MẠCH CHO MC (DƯỚI 430 TỪ – ĐỌC TRONG 2 PHÚT 50 GIÂY)

> *"Kính chào Ban Giám Khảo! Những thảm kịch do bỏ quên học sinh trên xe hay tài xế ngủ gật gây tai nạn đang là nỗi bất an lớn của xã hội. Nhóm chúng em phát triển **EduSafe Bus** – nền tảng AI Edge và IoT thời gian thực, xây dựng 'lá chắn an toàn đa lớp' bảo vệ học sinh từ lúc bước lên xe đến khi về tới trường!*
>
> *Đầu tiên là App Phụ huynh: Phụ huynh dễ dàng đăng ký tuyến xe và nạp ảnh Face ID trực tiếp từ điện thoại hoặc máy tính để trích xuất vector 128 chiều bảo mật ngay trên thiết bị. Đồng thời phụ huynh theo dõi trực tiếp vị trí GPS của xe. Khi xe chệch khỏi lộ trình chuẩn trên 100m dựa trên thuật toán Haversine GPS, phụ huynh nhận cảnh báo ngay. Chỉ cần bấm 'Gửi cảnh báo khẩn cấp', tín hiệu lập tức đồng bộ thời gian thực tới BGH, Giáo viên và Tài xế trong chưa đầy 0.2 giây!*
>
> *Tại Cabin tài xế, camera AI Edge đối chiếu vector và tự động điểm danh với độ tin cậy 99.4% ngay trên thiết bị mà không cần gửi ảnh lên cloud, vừa bảo mật quyền riêng tư cho trẻ vừa hoạt động mượt mà cả khi mất mạng. Đặc biệt, Lõi AI giám sát mắt EAR và ngáp MAR theo mô hình Noisy-OR Bayesian Fusion – khi phát hiện tài xế nhắm mắt quá 2.5 giây, còi báo động lập tức hú vang để đánh thức tài xế! Hệ thống áp dụng cơ chế khóa an toàn kép: buộc tài xế phải rà soát khoang xe cuối hành trình, xóa bỏ 100% thảm kịch bỏ quên học sinh.*
>
> *Tại trường, giáo viên nắm bắt toàn bộ trạng thái đón/trả. Khi học sinh đeo khẩu trang hoặc trời mưa tối khiến AI quét lỗi, giáo viên có thể thực hiện Manual Fallback – ghi đè điểm danh thủ công chỉ với 1 click mà không làm gián đoạn hành trình.*
>
> *Với Ban Giám Hiệu, Dashboard quản trị kiểm soát 100% đội xe, chỉ số an toàn toàn trường và nhật ký AI cập nhật từng giây. Dữ liệu vận hành được xuất thành báo cáo an toàn CSV chuẩn hóa chỉ với 1 click. Khi xảy ra sự cố nguy cấp, Ma trận SOS đa kênh điều phối cứu hộ tức thời qua RabbitMQ, phát tín hiệu tới 115, 113 và phụ huynh với độ trễ dưới 200 mili-giây.*
>
> *Toàn bộ giải pháp được xây dựng trên kiến trúc AI Edge và Microservices hướng sự kiện sẵn sàng mở rộng quy mô toàn quốc. **EduSafe Bus – An toàn của học sinh, Hạnh phúc của mọi gia đình!** Nhóm chúng em xin trân trọng cảm ơn!"*
