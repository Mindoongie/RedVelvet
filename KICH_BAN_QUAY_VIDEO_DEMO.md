# KỊCH BẢN QUAY VIDEO DEMO SẢN PHẨM MVP – EDUSAFE BUS
> **Dự án:** EduSafe Bus – Nền Tảng An Toàn Xe Đưa Đón Học Sinh Ứng Dụng AI Thông Minh  
> **Mục tiêu:** Thuyết trình chấm điểm Vòng Chung kết Cuộc thi Khởi nghiệp / Pitching Nhà đầu tư  
> **Thời lượng đề xuất:** 3 phút 30 giây – 4 phút 30 giây  
> **Tỉ lệ khung hình:** 16:9 (Full HD 1080p hoặc 2K 60fps)

---

## 🎬 HƯỚNG DẪN CHUẨN BỊ TRƯỚC KHI BẤM QUAY (CHECKLIST)
1. **Trình duyệt & Màn hình:**
   * Mở sẵn trang: `http://localhost:5173/` (hoặc link deploy Netlify/Vercel của bạn).
   * Bấm `F11` (hoặc ẩn thanh bookmark trình duyệt) để giao diện tràn viền chuyên nghiệp.
   * Đảm bảo đã bật âm thanh máy tính để thu được tiếng **chuông cảnh báo ngủ gật** và **chime SOS**.
2. **Camera & Webcam:**
   * Cho phép trình duyệt truy cập Webcam để demo tính năng quét khuôn mặt và phát hiện nhắm mắt/ngáp trực tiếp.
3. **Mẹo ghi âm:**
   * Giọng đọc dứt khoát, tự tin, nhấn mạnh vào các từ khóa công nghệ: *AI Edge, Noisy-OR Fusion, Haversine GPS, Điểm danh sinh trắc học, Rà soát chống bỏ quên*.

---

## 📋 BẢNG PHÂN CẢNH CHI TIẾT (STORYBOARD & VOICE-OVER SCRIPT)

---

### PHẦN 1: MỞ ĐẦU & TỔNG QUAN VẤN ĐỀ (0:00 - 0:30)

| Thời gian | Phân cảnh & Thao tác trên màn hình (Visual Actions) | Lời thoại thuyết minh (Voice-over Script) |
| :--- | :--- | :--- |
| **0:00 - 0:15** | • Quay màn hình đăng nhập `LoginScreen` với logo EduSafe Bus phát sáng.<br>• Rê chuột lướt qua 4 thẻ phân quyền tài khoản (Admin, Tài xế, Giáo viên, Phụ huynh). | *"Kính chào Ban Giám Khảo và quý vị! Trong thời gian qua, các vụ việc thương tâm do bỏ quên học sinh trên xe đưa đón hay tai nạn do tài xế ngủ gật đã trở thành nỗi ám ảnh lớn của toàn xã hội."* |
| **0:15 - 0:30** | • Zoom nhẹ vào tiêu đề: **EduSafe Bus - Nền Tảng An Toàn Xe Đưa Đón Học Sinh Ứng Dụng AI Thông Minh**.<br>• Click vào tài khoản **Lái xe bus (Tablet cabin)** để chuẩn bị vào giao diện xe. | *"Để giải quyết triệt để bài toán này, nhóm chúng em đã phát triển **EduSafe Bus** – nền tảng ứng dụng công nghệ AI Edge và IoT thời gian thực, xây dựng 'lá chắn an toàn 4 lớp' bảo vệ học sinh từ lúc bước lên xe đến khi về tới trường."* |

---

### PHẦN 2: TRẢI NGHIỆM CABIN LÁI XE BUS – DRIVER TABLET (0:30 - 1:35)

| Thời gian | Phân cảnh & Thao tác trên màn hình (Visual Actions) | Lời thoại thuyết minh (Voice-over Script) |
| :--- | :--- | :--- |
| **0:30 - 0:50** | • Đang ở màn hình **Lái xe bus**.<br>• Bấm nút **"Bắt đầu chuyến đi"** trong phần Roster.<br>• Bật camera nhận diện khuôn mặt (face-api.js). Đưa mặt vào khung quét. | *"Đầu tiên là giao diện Tablet đặt tại cabin tài xế. Khi học sinh bước lên xe, camera AI Edge sẽ tự động trích xuất vector khuôn mặt 128 chiều để điểm danh tức thì với độ tin cậy trên 99%, không cần dùng thẻ từ dễ mất hay ghi sổ thủ công."* |
| **0:50 - 1:15** | • Chuyển sang cột bên trái: **Giám sát tài xế (Drowsiness Engine)**.<br>• Bật Webcam giám sát tài xế. Làm động tác nhắm mắt > 2s hoặc bấm mô phỏng.<br>• Hệ thống nhảy còi báo động đỏ rực, phát tiếng beep liên tục và tính toán **Risk Score / EAR / PERCLOS**. | *"Đặc biệt, hệ thống tích hợp Lõi AI giám sát trạng thái tài xế thời gian thực. Bằng thuật toán Noisy-OR Bayesian Fusion phân tích chỉ số EAR (Eye Aspect Ratio) và độ mở miệng MAR, khi phát hiện tài xế nhắm mắt quá 2.5 giây, còi báo động lập tức hú vang ngay trong cabin để đánh thức tài xế, ngăn chặn nguy cơ tai nạn từ sớm."* |
| **1:15 - 1:35** | • Kéo xuống nút **"Rà soát khoang xe cuối hành trình"**.<br>• Thao tác quét xác nhận xe đã trống hoàn toàn học sinh. | *"Khi kết thúc hành trình, quy trình **End-trip Cabin Sweep** buộc tài xế phải đi xuống cuối xe quét xác nhận, đối soát dữ liệu với danh sách học sinh, loại bỏ hoàn toàn 100% rủi ro bỏ quên trẻ trên xe."* |

---

### PHẦN 3: TRẢI NGHIỆM APP PHỤ HUYNH – PARENT APP (1:35 - 2:30)

| Thời gian | Phân cảnh & Thao tác trên màn hình (Visual Actions) | Lời thoại thuyết minh (Voice-over Script) |
| :--- | :--- | :--- |
| **1:35 - 1:45** | • Bấm **Đăng Xuất** -> Chọn đăng nhập tài khoản **Phụ huynh học sinh** (Phụ huynh: Phạm Văn Nam).<br>• Hiển thị giao diện điện thoại thông minh dạng Glassmorphism cao cấp. | *"Tiếp theo là giao diện dành riêng cho Phụ huynh. Cha mẹ có thể theo dõi vị trí trực tiếp của xe qua bản đồ GPS, biết chính xác con mình đã lên xe lúc mấy giờ và thời gian dự kiến (ETA) tới trường."* |
| **1:45 - 2:10** | • Trên màn hình phụ huynh, xuất hiện khung cảnh báo đỏ: **"Xe đang chệch lộ trình! AI GPS phát hiện chệch tuyến > 280m"**.<br>• Bấm nút **"Gửi cảnh báo khẩn cấp"**.<br>• Âm thanh chime vang lên, thanh **Global Emergency Banner** màu đỏ nhấp nháy phát sáng trên đỉnh màn hình. | *"Khi xe bus di chuyển sai lệch khỏi lộ trình chuẩn trên 100 mét dựa trên thuật toán Haversine GPS, phụ huynh nhận được cảnh báo ngay. Phụ huynh chỉ cần bấm một chạm **'Gửi cảnh báo khẩn cấp'** – tín hiệu sẽ lập tức đồng bộ thời gian thực tới Nhà trường, Giáo viên và Tablet của tài xế."* |
| **2:10 - 2:30** | • Chuyển sang tab **"Đăng ký bé đi xe"**.<br>• Rê chuột qua phần thêm ảnh nhận diện khuôn mặt của học sinh. | *"Phụ huynh cũng có thể đăng ký khuôn mặt cho con ngay tại nhà qua camera điện thoại, hệ thống tự động mã hóa và cập nhật vào danh bạ an toàn của xe."* |

---

### PHẦN 4: GIÁM SÁT TỪ TRƯỜNG – TEACHER MONITOR VIEW (2:30 - 3:15)

| Thời gian | Phân cảnh & Thao tác trên màn hình (Visual Actions) | Lời thoại thuyết minh (Voice-over Script) |
| :--- | :--- | :--- |
| **2:30 - 2:50** | • Đăng xuất -> Đăng nhập tài khoản **Giáo viên giám sát** (Cô: Trần Thị Thu).<br>• Quan sát thấy **Global Emergency Banner** hiển thị cảnh báo phụ huynh vừa gửi.<br>• Xem bảng thống kê 5 KPI: Đã quét AI, Điểm danh thủ công, Quét thất bại, Chờ quét, Đã xuống xe. | *"Tại trường học, giáo viên giám sát nắm bắt toàn bộ trạng thái của học sinh trên xe theo thời gian thực. Mọi tín hiệu cảnh báo từ phụ huynh hay sự cố trên đường đều được tiếp nhận trực quan."* |
| **2:50 - 3:15** | • Tìm đến học sinh có trạng thái *"Quét thất bại"* (VD: Trần Gia Bảo).<br>• Bấm nút **"Điểm danh" / "Xử lý thủ công"**.<br>• Trạng thái chuyển sang màu xanh dương *"Điểm danh thủ công"*. | *"Trong trường hợp học sinh đeo khẩu trang, trời mưa tối khiến AI quét không thành công, giáo viên có thể thực hiện **Manual Fallback** – xác nhận thủ công chỉ với 1 click, đảm bảo dữ liệu luôn chính xác và không làm chậm lịch trình di chuyển."* |

---

### PHẦN 5: TRUNG TÂM ĐIỀU HÀNH BGH & MA TRẬN SOS CẤP CỨU (3:15 - 4:00)

| Thời gian | Phân cảnh & Thao tác trên màn hình (Visual Actions) | Lời thoại thuyết minh (Voice-over Script) |
| :--- | :--- | :--- |
| **3:15 - 3:35** | • Đăng xuất -> Đăng nhập tài khoản **Quản trị viên nhà trường** (Admin Dashboard).<br>• Lướt qua bảng điều khiển tổng: 12/12 Xe hoạt động, 284/284 Học sinh, Bản đồ giám sát GPS toàn thành phố và **Nhật ký cảnh báo AI system**. | *"Đây là Trung tâm điều hành dành cho Ban Giám Hiệu. Toàn bộ đội xe, chỉ số an toàn AI tổng hợp và tọa độ vệ tinh của từng tuyến đường được giám sát tập trung."* |
| **3:35 - 3:50** | • Bấm nút **"SOS"** màu đỏ trên thanh Navbar.<br>• Hộp thoại **"PHÁT TÍN HIỆU SOS KHẨN CẤP"** hiện ra.<br>• Chọn 1 loại sự cố (VD: *Tai nạn giao thông* hoặc *Cấp cứu y tế*) -> Bấm **"KÍCH HOẠT SOS CẤP TỐC"**.<br>• Quan sát các kênh RabbitMQ, WebSocket, SMS Gateway kích hoạt dưới 200ms. | *"Khi xảy ra sự cố nghiêm trọng trên đường, Ma trận SOS đa kênh sẽ điều phối tức thời trong vòng chưa đầy 200ms tới lực lượng cứu hộ 115, 113, Công an và đường dây nóng phụ huynh."* |
| **3:50 - 4:00** | • Bấm nút **"Xuất báo cáo an toàn"** trên bảng danh sách đội xe để tải file CSV. | *"Dữ liệu vận hành được tự động trích xuất thành báo cáo an toàn CSV chuẩn hóa để lưu trữ và báo cáo cơ quan quản lý."* |

---

### PHẦN 6: MINH CHỨNG CÔNG NGHỆ & LỜI KẾT (4:00 - 4:30)

| Thời gian | Phân cảnh & Thao tác trên màn hình (Visual Actions) | Lời thoại thuyết minh (Voice-over Script) |
| :--- | :--- | :--- |
| **4:00 - 4:15** | • Bấm mở **Ngăn kéo kỹ thuật AI Dev Panel** ở góc trên màn hình.<br>• Lướt qua cấu trúc JSON Payload, thuật toán Haversine và mô hình Noisy-OR Fusion. | *"EduSafe Bus được xây dựng trên nền tảng công nghệ vững chắc: xử lý AI Edge trực tiếp trên thiết bị, kết hợp kiến trúc Microservices hướng sự kiện (Event-Driven Architecture) với Docker và WebSockets."* |
| **4:15 - 4:30** | • Trở về màn hình chính, mở rộng khung nhìn toàn cảnh.<br>• Kết thúc video với slide thông tin đội thi. | *"EduSafe Bus không chỉ là một giải pháp công nghệ, mà là cam kết bảo vệ tương lai của các em học sinh trên mỗi nẻo đường đến trường. Nhóm chúng em xin chân thành cảm ơn Ban Giám Khảo đã lắng nghe!"* |

---

## 💡 MẸO QUAY VIDEO ĐẠT ĐIỂM TỐI ĐA (PRO TIPS)
1. **Âm thanh nền (BGM):** Lồng nhạc nền công nghệ nhẹ nhàng, hiện đại (nhạc Corporate / Upbeat Tech không lời, âm lượng khoảng 10-15% để giọng nói to rõ).
2. **Hiệu ứng Zoom & Highlight:** Trong khâu hậu kỳ (dùng CapCut / Premiere / Camtasia), hãy zoom nhẹ vào các chỉ số: *Độ tin cậy 99.4%*, *Chỉ số EAR*, *Nút SOS* khi giọng đọc nhắc tới.
3. **Phụ đề (Subtitles):** Thêm phụ đề tiếng Việt (hoặc song ngữ Việt - Anh) ở nửa dưới màn hình để người xem dễ dàng theo dõi ngay cả khi không bật tiếng.
