# KỊCH BẢN MASTER QUAY VIDEO DEMO & PITCHING (CHUẨN 3 PHÚT)
> **Dự án:** EduSafe Bus – Nền Tảng An Toàn Xe Đưa Đón Học Sinh Ứng Dụng AI Thông Minh  
> **Thời lượng chuẩn:** **2 phút 45 giây – Đúng 3 phút (180 giây)**  
> **Tốc độ đọc đề xuất:** 135 – 145 từ / phút (Khoảng 430 từ – liền mạch, tự tin, chuyên nghiệp)  
> **Tỉ lệ khung hình:** 16:9 (Full HD 1080p hoặc 2K 60fps)

---

## ⏱️ TIMELINE TỔNG QUAN (180 GIÂY – THỨ TỰ LOGIC CHUẨN ĐỜI THỰC)

```mermaid
timeline
    title Lộ trình Video Demo 3 Phút (180s)
    0:00 - 0:35 (35s) : Mở đầu & Phụ huynh Đăng ký học sinh + Nạp ảnh Face ID từ thiết bị
    0:35 - 1:15 (40s) : Cabin Lái xe (AI Edge 99.4% + Còi hú EAR ngủ gật + Khóa an toàn kép rà soát cuối xe)
    1:15 - 1:45 (30s) : App Phụ huynh (Live GPS + Cảnh báo xe lệch tuyến Haversine + Báo động 1 chạm)
    1:45 - 2:10 (25s) : Giáo viên tại trường (Giám sát đón/trả + Manual Fallback 1 click)
    2:10 - 2:40 (30s) : Trung tâm BGH (Tổng quan 12 xe + Ma trận SOS RabbitMQ < 200ms + Xuất CSV)
    2:40 - 3:00 (20s) : Ngăn kéo AI Specs & Thông điệp kết bài
```

---

## 🎬 BẢNG PHÂN CẢNH CHI TIẾT THEO TỪNG GIÂY (ACTION & VOICE-OVER)

---

### 🌟 PHẦN 1: MỞ ĐẦU & PHỤ HUYNH ĐĂNG KÝ HỌC SINH FACE ID (0:00 – 0:35) • [35 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **0:00 – 0:15** | • Mở màn hình `LoginScreen` -> Chọn tài khoản **Phụ huynh** (`parent.chi@edusafe.edu.vn`).<br>• Chuyển sang Tab: **"Đăng ký tuyến & Face ID"**. | *"[Tông giọng trầm ấm, dứt khoát]* Kính chào Ban Giám Khảo! Những thảm kịch do **bỏ quên học sinh trên xe** hay **tài xế ngủ gật gây tai nạn** đang là nỗi bất an lớn của xã hội. Nhóm chúng em phát triển **EduSafe Bus** – nền tảng AI Edge và IoT thời gian thực, xây dựng 'lá chắn an toàn đa lớp' bảo vệ học sinh từ lúc bước lên xe đến khi về tới trường!" |
| **0:15 – 0:35** | • Nhập ID `HS-001`, tên bé *Phạm Phương Chi*, tuyến `BUS-01`.<br>• Bấm nút **"Tải ảnh từ máy"** (hoặc Mẫu chuẩn / Chụp Webcam) -> Hiện thẻ ảnh hợp lệ `✓ Vector 128-D sẵn sàng`.<br>• Bấm **"Đăng ký xe & Lưu Face ID"**. | *"[Tông giọng hào hứng]* Quy trình bắt đầu từ Phụ huynh: Phụ huynh dễ dàng đăng ký tuyến xe và **nạp ảnh chân dung Face ID trực tiếp từ điện thoại hoặc máy tính**. Mô hình AI trích xuất vector đặc trưng 128 chiều ngay trên thiết bị, sẵn sàng cho việc nhận diện tức thời trên xe." |

---

### 🛡️ PHẦN 2: CABIN TÀI XẾ – AI EDGE, NGỦ GẬT & KHÓA AN TOÀN KÉP (0:35 – 1:15) • [40 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **0:35 – 0:52** | • Đăng xuất -> Đăng nhập tài khoản **Lái xe bus** (`driver.hung@edusafe.edu.vn`).<br>• Bấm **"Bắt đầu chuyến đi"**.<br>• Camera AI đối chiếu đúng gương mặt bé *Phạm Phương Chi* vừa đăng ký -> Hiện `Match: 99.4% ✓`, danh sách tự động tích xanh. | *"Tại Cabin tài xế, camera **AI Edge** trích xuất vector khuôn mặt và tự động điểm danh với **độ tin cậy 99.4%** mà không cần gửi ảnh lên cloud, vừa bảo mật quyền riêng tư cho trẻ vừa hoạt động mượt mà cả khi mất mạng." |
| **0:52 – 1:04** | • Cột trái: Bật webcam giám sát tài xế.<br>• Nhắm mắt > 2s -> Màn hình nhảy **banner đỏ**, còi báo động trong cabin hú liên tục (`beep alert`). | *"Đặc biệt, Lõi AI giám sát mắt **EAR** và ngáp **MAR** theo mô hình **Noisy-OR Bayesian Fusion**. Khi phát hiện tài xế nhắm mắt quá 2.5 giây, còi báo động lập tức hú vang trong cabin để đánh thức tài xế, ngăn ngừa tai nạn từ sớm!" |
| **1:04 – 1:15** | • Bấm thử **"Kết thúc chuyến"** -> Bật cảnh báo đỏ chặn lại: *⛔ QUY ĐỊNH BẮT BUỘC*.<br>• Bấm **"Rà soát khoang xe cuối hành trình"** -> Bấm **"Xác nhận xe trống 100% & Bàn giao"**. | *"Hệ thống áp dụng **cơ chế khóa an toàn kép**: Nếu vẫn còn học sinh trên xe hoặc chưa rà soát khoang xe cuối hành trình, hệ thống sẽ chặn hoàn toàn lệnh kết thúc chuyến, **xóa bỏ 100% nguy cơ bỏ quên học sinh**!" |

---

### 📱 PHẦN 3: APP PHỤ HUYNH – LIVE GPS & CẢNH BÁO LỆCH TUYẾN (1:15 – 1:45) • [30 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **1:15 – 1:30** | • Đăng xuất -> Đăng nhập lại **Phụ huynh**.<br>• Mở Tab **"Theo dõi hành trình"**: Xem Live GPS và lộ trình xe di chuyển. | *"[Tông giọng nhẹ nhàng, an tâm]* Phụ huynh theo dõi trực tiếp vị trí GPS thời gian thực của xe, giờ con lên xe và thời gian dự kiến tới trường." |
| **1:30 – 1:45** | • Thấy cảnh báo đỏ: *Xe đang chệch lộ trình > 280m*.<br>• Bấm nút đỏ: **"Gửi cảnh báo khẩn cấp"**.<br>• Thanh **Global Emergency Banner** nhấp nháy đỏ trên toàn hệ thống. | *"Khi xe chệch khỏi lộ trình chuẩn trên 100m theo **thuật toán Haversine GPS**, phụ huynh nhận cảnh báo ngay. Chỉ cần bấm **'Gửi cảnh báo khẩn cấp'**, tín hiệu lập tức đồng bộ thời gian thực tới BGH, Giáo viên và Tài xế trong chưa đầy **0.2 giây**!" |

---

### 🏫 PHẦN 4: GIÁO VIÊN GIÁM SÁT & MANUAL FALLBACK (1:45 – 2:10) • [25 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **1:45 – 2:10** | • Đăng xuất -> Đăng nhập **Giáo viên giám sát** (`teacher.thu@edusafe.edu.vn`).<br>• Thấy ngay banner cảnh báo từ phụ huynh.<br>• Tìm học sinh *Trần Gia Bảo (Quét thất bại)* -> Bấm nút **"Điểm danh"** (Manual Fallback) -> Đổi sang tích xanh. | *"[Tông giọng chuyên nghiệp]* Tại trường, giáo viên nắm bắt toàn bộ trạng thái đón/trả và cảnh báo từ phụ huynh. Khi học sinh đeo khẩu trang hoặc trời mưa tối khiến AI quét lỗi, giáo viên có thể thực hiện **Manual Fallback** – ghi đè điểm danh thủ công chỉ với 1 click mà không làm gián đoạn hành trình." |

---

### ⚡ PHẦN 5: TRUNG TÂM BGH & MA TRẬN CỨU HỘ SOS (2:10 – 2:40) • [30 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **2:10 – 2:25** | • Đăng xuất -> Đăng nhập **Admin trường** (`admin@edusafe.edu.vn`).<br>• Lướt qua 12 xe, 284 học sinh và **Nhật ký cảnh báo AI system**.<br>• Bấm **"Xuất báo cáo an toàn"** tải file CSV. | *"[Tông giọng uy quyền, tổng quan]* Với Ban Giám Hiệu, Dashboard quản trị kiểm soát 100% đội xe, chỉ số an toàn toàn trường và nhật ký AI cập nhật từng giây. Dữ liệu vận hành được xuất thành báo cáo an toàn CSV chuẩn hóa chỉ với 1 click." |
| **2:25 – 2:40** | • Bấm nút **SOS màu đỏ** trên Navbar -> Chọn *Tai nạn* -> Bấm **"KÍCH HOẠT SOS CẤP TỐC"**.<br>• Log 4 kênh kích hoạt thành công.<br>• Bấm **"Tiếp nhận & Phối hợp"** trên banner để hoàn tất. | *"Khi xảy ra sự cố nguy cấp, **Ma trận SOS đa kênh** điều phối cứu hộ tức thời qua **RabbitMQ**, phát tín hiệu tới 115, 113 và phụ huynh với độ trễ dưới 200 mili-giây." |

---

### 🚀 PHẦN 6: AI SPECS & LỜI KẾT PITCHING (2:40 – 3:00) • [20 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **2:40 – 3:00** | • Bấm nút **`</> AI Specs`** mở ngăn kéo kỹ thuật JSON.<br>• Trở về màn hình chính, mở slide kết thúc bài thuyết trình. | *"[Tông giọng truyền cảm hứng, đanh thép]* Toàn bộ giải pháp được xây dựng trên kiến trúc AI Edge và Microservices hướng sự kiện sẵn sàng mở rộng quy mô toàn quốc. **EduSafe Bus – An toàn của học sinh, Hạnh phúc của mọi gia đình!** Nhóm chúng em xin trân trọng cảm ơn!" |

---

## 🎙️ BẢN ĐỌC LIỀN MẠCH CHO MC (DƯỚI 430 TỪ – ĐỌC TRONG 2 PHÚT 50 GIÂY)

> *"Kính chào Ban Giám Khảo! Những thảm kịch do bỏ quên học sinh trên xe hay tài xế ngủ gật gây tai nạn đang là nỗi bất an lớn của xã hội. Nhóm chúng em phát triển **EduSafe Bus** – nền tảng AI Edge và IoT thời gian thực, xây dựng 'lá chắn an toàn đa lớp' bảo vệ học sinh từ lúc bước lên xe đến khi về tới trường!*
>
> *Quy trình bắt đầu từ Phụ huynh: Phụ huynh dễ dàng đăng ký tuyến xe và nạp ảnh chân dung Face ID trực tiếp từ điện thoại hoặc máy tính. Mô hình AI trích xuất vector đặc trưng 128 chiều ngay trên thiết bị, sẵn sàng cho việc nhận diện tức thời trên xe.*
>
> *Tại Cabin tài xế, camera AI Edge trích xuất vector khuôn mặt và tự động điểm danh với độ tin cậy 99.4% mà không cần gửi ảnh lên cloud, vừa bảo mật quyền riêng tư cho trẻ vừa hoạt động mượt mà cả khi mất mạng.*
>
> *Đặc biệt, Lõi AI giám sát mắt EAR và ngáp MAR theo mô hình Noisy-OR Bayesian Fusion. Khi phát hiện tài xế nhắm mắt quá 2.5 giây, còi báo động lập tức hú vang trong cabin để đánh thức tài xế, ngăn ngừa tai nạn từ sớm! Hệ thống áp dụng cơ chế khóa an toàn kép: Nếu vẫn còn học sinh trên xe hoặc chưa rà soát khoang xe cuối hành trình, hệ thống sẽ chặn hoàn toàn lệnh kết thúc chuyến, xóa bỏ 100% nguy cơ bỏ quên học sinh.*
>
> *Với Phụ huynh, giao diện điện thoại cho phép theo dõi trực tiếp vị trí GPS của xe, giờ con lên xe và thời gian dự kiến tới trường. Khi xe chệch khỏi lộ trình chuẩn trên 100m theo thuật toán Haversine GPS, phụ huynh nhận cảnh báo ngay. Chỉ cần bấm 'Gửi cảnh báo khẩn cấp', tín hiệu lập tức đồng bộ thời gian thực tới BGH, Giáo viên và Tài xế trong chưa đầy 0.2 giây!*
>
> *Tại trường, giáo viên nắm bắt toàn bộ trạng thái đón/trả. Khi học sinh đeo khẩu trang hoặc trời mưa tối khiến AI quét lỗi, giáo viên có thể thực hiện Manual Fallback – ghi đè điểm danh thủ công chỉ với 1 click mà không làm gián đoạn hành trình.*
>
> *Với Ban Giám Hiệu, Dashboard quản trị kiểm soát 100% đội xe, chỉ số an toàn toàn trường và nhật ký AI cập nhật từng giây. Dữ liệu vận hành được xuất thành báo cáo an toàn CSV chuẩn hóa chỉ với 1 click. Khi xảy ra sự cố nguy cấp, Ma trận SOS đa kênh điều phối cứu hộ tức thời qua RabbitMQ, phát tín hiệu tới 115, 113 và phụ huynh với độ trễ dưới 200 mili-giây.*
>
> *Toàn bộ giải pháp được xây dựng trên kiến trúc AI Edge và Microservices hướng sự kiện sẵn sàng mở rộng quy mô toàn quốc. **EduSafe Bus – An toàn của học sinh, Hạnh phúc của mọi gia đình!** Nhóm chúng em xin trân trọng cảm ơn!"*
