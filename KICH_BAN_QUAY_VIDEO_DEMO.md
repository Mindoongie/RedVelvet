# KỊCH BẢN MASTER QUAY VIDEO DEMO & PITCHING (CHUẨN 3 PHÚT)
> **Dự án:** EduSafe Bus – Nền Tảng An Toàn Xe Đưa Đón Học Sinh Ứng Dụng AI Thông Minh  
> **Thời lượng chuẩn:** **2 phút 45 giây – Đúng 3 phút (180 giây)**  
> **Tốc độ đọc đề xuất:** 135 – 145 từ / phút (Khoảng 390 từ – vừa vặn, dứt khoát, dễ ghi hình)  
> **Tỉ lệ khung hình:** 16:9 (Full HD 1080p hoặc 2K 60fps)

---

## ⏱️ TIMELINE TỔNG QUAN (180 GIÂY)

```mermaid
timeline
    title Lộ trình Video Demo 3 Phút (180s)
    0:00 - 0:20 (20s) : Đặt vấn đề (Tài xế ngủ gật, xe chệch tuyến) & Giới thiệu EduSafe Bus
    0:20 - 0:55 (35s) : Cabin Lái xe (AI Edge 128-D khuôn mặt + Còi hú EAR ngủ gật)
    0:55 - 1:35 (40s) : App Phụ huynh (Live GPS + Lệch tuyến Haversine + Báo động 1 chạm)
    1:35 - 2:05 (30s) : Giáo viên tại trường (Giám sát đón/trả + Manual Fallback 1 click)
    2:05 - 2:40 (35s) : Trung tâm BGH (Tổng quan 12 xe + Ma trận SOS < 200ms + Xuất CSV)
    2:40 - 3:00 (20s) : Ngăn kéo AI Specs & Thông điệp kết bài
```

---

## 🎬 BẢNG PHÂN CẢNH CHI TIẾT THEO TỪNG GIÂY (ACTION & VOICE-OVER)

---

### 🌟 PHẦN 1: MỞ ĐẦU & ĐẶT VẤN ĐỀ (0:00 – 0:20) • [20 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **0:00 – 0:20** | • Mở màn hình đăng nhập `LoginScreen`.<br>• Lướt chuột qua 4 vai trò.<br>• Click chọn tài khoản **Lái xe bus** (`driver.hung@edusafe.edu.vn`). | *"[Tông giọng trầm ấm, dứt khoát]* Kính chào Ban Giám Khảo! Các thảm kịch bắt nguồn từ việc **tài xế ngủ gật, mất tập trung** hay **xe đưa đón đi chệch lộ trình** đang là nỗi bất an lớn của xã hội. Nhóm chúng em phát triển **EduSafe Bus** – nền tảng AI Edge và IoT thời gian thực, xây dựng 'lá chắn an toàn đa lớp' bảo vệ học sinh từ lúc bước lên xe đến khi về tới trường!" |

---

### 🛡️ PHẦN 2: CABIN TÀI XẾ – AI EDGE & CHỐNG NGỦ GẬT (0:20 – 0:55) • [35 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **0:20 – 0:38** | • Tại giao diện Tablet Lái xe: Bấm **"Bắt đầu chuyến đi"**.<br>• Mở camera AI: Đưa mặt vào khung nhận diện, hiện `Match: 99.4% ✓` và danh sách tự động tích xanh. | *"[Tông giọng hào hứng, tự tin]* Đầu tiên là Tablet tại cabin tài xế. Camera **AI Edge** trích xuất vector khuôn mặt 128 chiều, tự động điểm danh với **độ tin cậy 99.4%** ngay trên thiết bị mà không cần gửi ảnh lên cloud, vừa bảo mật quyền riêng tư cho trẻ vừa hoạt động tốt cả khi mất mạng." |
| **0:38 – 0:55** | • Chuyển sang cột trái: Bật webcam giám sát tài xế.<br>• Nhắm mắt > 2s -> Màn hình nhảy **banner đỏ**, còi báo động trong cabin hú liên tục (`beep alert`). | *"Đặc biệt, Lõi AI giám sát mắt **EAR** và ngáp **MAR** theo mô hình **Noisy-OR Bayesian Fusion**. Khi phát hiện tài xế nhắm mắt quá 2.5 giây, còi báo động lập tức hú vang trong cabin để đánh thức tài xế, ngăn ngừa tai nạn từ sớm!" |

---

### 📱 PHẦN 3: APP PHỤ HUYNH – LIVE GPS & CẢNH BÁO LỆCH TUYẾN (0:55 – 1:35) • [40 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **0:55 – 1:12** | • Đăng xuất -> Đăng nhập tài khoản **Phụ huynh** (`parent.chi@edusafe.edu.vn`).<br>• Xem giao diện điện thoại: Thẻ bé Phạm Phương Chi và bản đồ GPS. | *"[Tông giọng nhẹ nhàng, an tâm]* Với Phụ huynh, giao diện điện thoại cho phép theo dõi trực tiếp vị trí GPS của xe, giờ con lên xe và thời gian dự kiến tới trường." |
| **1:12 – 1:35** | • Thấy cảnh báo đỏ: *Xe đang chệch lộ trình > 280m*.<br>• Bấm nút đỏ: **"Gửi cảnh báo khẩn cấp"**.<br>• Thanh **Global Emergency Banner** nhấp nháy đỏ trên toàn hệ thống. | *"Khi xe chệch khỏi lộ trình chuẩn trên 100m dựa trên **thuật toán Haversine GPS**, phụ huynh nhận cảnh báo ngay. Chỉ cần bấm **'Gửi cảnh báo khẩn cấp'**, tín hiệu lập tức đồng bộ thời gian thực tới BGH, Giáo viên và Tài xế trong chưa đầy **0.2 giây**!" |

---

### 🏫 PHẦN 4: GIÁO VIÊN GIÁM SÁT & MANUAL FALLBACK (1:35 – 2:05) • [30 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **1:35 – 2:05** | • Đăng xuất -> Đăng nhập **Giáo viên giám sát** (`teacher.thu@edusafe.edu.vn`).<br>• Thấy ngay banner cảnh báo từ phụ huynh.<br>• Tìm học sinh *Trần Gia Bảo (Quét thất bại)* -> Bấm nút **"Điểm danh"** (Manual Fallback) -> Đổi sang tích xanh. | *"[Tông giọng chuyên nghiệp]* Tại trường, giáo viên nắm bắt toàn bộ trạng thái đón/trả và cảnh báo từ phụ huynh. Khi học sinh đeo khẩu trang hoặc trời mưa tối khiến AI quét lỗi, giáo viên có thể thực hiện **Manual Fallback** – ghi đè điểm danh thủ công chỉ với 1 click mà không làm gián đoạn hành trình." |

---

### ⚡ PHẦN 5: TRUNG TÂM BGH & MA TRẬN CỨU HỘ SOS (2:05 – 2:40) • [35 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **2:05 – 2:25** | • Đăng xuất -> Đăng nhập **Admin trường** (`admin@edusafe.edu.vn`).<br>• Lướt qua 12 xe, 284 học sinh và **Nhật ký cảnh báo AI system**.<br>• Bấm **"Xuất báo cáo an toàn"** tải file CSV. | *"[Tông giọng uy quyền, tổng quan]* Với Ban Giám Hiệu, Dashboard quản trị kiểm soát 100% đội xe, chỉ số an toàn toàn trường và nhật ký AI cập nhật từng giây. Dữ liệu vận hành được xuất thành báo cáo an toàn CSV chuẩn hóa chỉ với 1 click." |
| **2:25 – 2:40** | • Bấm nút **SOS màu đỏ** trên Navbar -> Chọn *Tai nạn* -> Bấm **"KÍCH HOẠT SOS CẤP TỐC"**.<br>• Log 4 kênh kích hoạt thành công.<br>• Bấm **"Tiếp nhận & Phối hợp"** trên banner để hoàn tất. | *"Khi xảy ra sự cố nguy cấp, **Ma trận SOS đa kênh** điều phối cứu hộ tức thời qua **RabbitMQ**, phát tín hiệu tới 115, 113 và phụ huynh với độ trễ dưới 200 mili-giây." |

---

### 🚀 PHẦN 6: AI SPECS & LỜI KẾT PITCHING (2:40 – 3:00) • [20 giây]

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh (Voice-over) |
| :--- | :--- | :--- |
| **2:40 – 3:00** | • Bấm nút **`</> AI Specs`** mở ngăn kéo kỹ thuật JSON.<br>• Trở về màn hình chính, mở slide kết thúc bài thuyết trình. | *"[Tông giọng truyền cảm hứng, đanh thép]* Toàn bộ giải pháp được xây dựng trên kiến trúc AI Edge và Microservices hướng sự kiện sẵn sàng mở rộng quy mô toàn quốc. **EduSafe Bus – An toàn của học sinh, Hạnh phúc của mọi gia đình!** Nhóm chúng em xin trân trọng cảm ơn!" |

---

## 🎙️ BẢN ĐỌC LIỀN MẠCH CHO MC (DƯỚI 390 TỪ – ĐỌC TRONG 2 PHÚT 45 GIÂY)

> *"Kính chào Ban Giám Khảo! Các thảm kịch bắt nguồn từ việc tài xế ngủ gật, mất tập trung hay xe đưa đón đi chệch lộ trình đang là nỗi bất an lớn của xã hội. Nhóm chúng em phát triển **EduSafe Bus** – nền tảng AI Edge và IoT thời gian thực, xây dựng 'lá chắn an toàn đa lớp' bảo vệ học sinh từ lúc bước lên xe đến khi về tới trường!*
>
> *Đầu tiên là Tablet tại cabin tài xế. Camera AI Edge trích xuất vector khuôn mặt 128 chiều, tự động điểm danh với độ tin cậy trên 99% ngay trên thiết bị mà không cần gửi ảnh lên cloud, vừa bảo mật quyền riêng tư cho trẻ vừa hoạt động tốt cả khi mất mạng.*
>
> *Đặc biệt, Lõi AI giám sát mắt EAR và ngáp MAR theo mô hình Noisy-OR Bayesian Fusion. Khi phát hiện tài xế nhắm mắt quá 2.5 giây, còi báo động lập tức hú vang trong cabin để đánh thức tài xế, ngăn ngừa tai nạn từ sớm!*
>
> *Với Phụ huynh, giao diện điện thoại cho phép theo dõi trực tiếp vị trí GPS của xe, giờ con lên xe và thời gian dự kiến tới trường. Khi xe chệch khỏi lộ trình chuẩn trên 100m dựa trên thuật toán Haversine GPS, phụ huynh nhận cảnh báo ngay. Chỉ cần bấm 'Gửi cảnh báo khẩn cấp', tín hiệu lập tức đồng bộ thời gian thực tới BGH, Giáo viên và Tài xế trong chưa đầy 0.2 giây!*
>
> *Tại trường, giáo viên nắm bắt toàn bộ trạng thái đón/trả. Khi học sinh đeo khẩu trang hoặc trời mưa tối khiến AI quét lỗi, giáo viên có thể thực hiện Manual Fallback – ghi đè điểm danh thủ công chỉ với 1 click mà không làm gián đoạn hành trình.*
>
> *Với Ban Giám Hiệu, Dashboard quản trị kiểm soát 100% đội xe, chỉ số an toàn toàn trường và nhật ký AI cập nhật từng giây. Dữ liệu vận hành được xuất thành báo cáo an toàn CSV chuẩn hóa chỉ với 1 click. Khi xảy ra sự cố nguy cấp, Ma trận SOS đa kênh điều phối cứu hộ tức thời qua RabbitMQ, phát tín hiệu tới 115, 113 và phụ huynh với độ trễ dưới 200 mili-giây.*
>
> *Toàn bộ giải pháp được xây dựng trên kiến trúc AI Edge và Microservices hướng sự kiện sẵn sàng mở rộng quy mô toàn quốc. **EduSafe Bus – An toàn của học sinh, Hạnh phúc của mọi gia đình!** Nhóm chúng em xin trân trọng cảm ơn!"*
