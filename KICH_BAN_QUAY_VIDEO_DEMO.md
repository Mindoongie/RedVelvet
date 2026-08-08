# KỊCH BẢN MASTER QUAY VIDEO DEMO & PITCHING – EDUSAFE BUS
> **Dự án:** EduSafe Bus – Nền Tảng An Toàn Xe Đưa Đón Học Sinh Ứng Dụng AI Thông Minh  
> **Mục tiêu:** Thuyết trình chấm điểm Vòng Chung kết Cuộc thi Khởi nghiệp Sinh viên 2026 / Gọi vốn Pitching Nhà đầu tư  
> **Thời lượng chuẩn:** 3 phút 45 giây – 4 phút 30 giây  
> **Tỉ lệ khung hình:** 16:9 (Full HD 1080p hoặc 2K 60fps)  
> **Nhạc nền đề xuất (BGM):** Modern Tech / Upbeat Corporate Instrumental (Âm lượng 12-15%, hạ nhỏ khi nói, tăng nhẹ ở đoạn chuyển cảnh).

---

## 🎯 DANH SÁCH 8 TÍNH NĂNG "ĐINH" (KILLER FEATURES) ĐƯỢC PHÔ DIỄN TRONG VIDEO
1. 🛡️ **Điểm danh AI Edge Biometrics:** Chạy trực tiếp trên Client (WebAssembly), trích xuất vector 128 chiều với độ tin cậy 99.4%, bảo mật quyền riêng tư trẻ em và không phụ thuộc đường truyền mạng.
2. 🔄 **Cơ chế xác nhận thủ công (Manual Fallback):** Cho phép giáo viên ghi đè tức thì chỉ với 1 click khi học sinh đeo khẩu trang hoặc trời mưa tối.
3. 👁️ **Lõi AI chống ngủ gật đa tầng (Inferensys Drowsiness Engine):** Kết hợp chỉ số `EAR < 0.19` (vùng trễ Hysteresis), `MAR > 0.55` (ngáp), `Head Pitch > 20°` và thuật toán *Noisy-OR Bayesian Fusion* phát còi hú báo động trong cabin.
4. 🧹 **Quy trình rà soát khoang xe cuối hành trình (End-trip Cabin Sweep):** Xóa bỏ 100% rủi ro bỏ quên học sinh trên xe dưới trời nắng nóng.
5. 📍 **Định vị GPS & Thuật toán chống chệch tuyến Haversine:** Chiếu vector vuông góc lên Waypoints lộ trình, cảnh báo ngay khi sai số > 100m.
6. ⚡ **Đồng bộ cảnh báo khẩn cấp đa chiều (Real-time Global Banner):** Phụ huynh gửi báo động -> Toàn bộ Admin, Giáo viên, Tài xế lập tức nhận tín hiệu tức thời kèm còi báo động.
7. 🚨 **Ma trận điều phối cứu hộ SOS (< 200ms):** Tự động phân luồng kết nối tới 113, 114, 115, BGH và SMS Phụ huynh.
8. 📊 **Trung tâm chỉ huy BGH & Xuất báo cáo CSV:** Bảng điều hành tổng quan 12 đội xe, 284 học sinh và ngăn kéo kỹ thuật AI Dev Specs.

---

## 🎬 HƯỚNG DẪN CHUẨN BỊ TRƯỚC KHI BẤM QUAY (CHECKLIST)
* [ ] Mở trình duyệt tại `http://localhost:5173/` (hoặc link deploy Netlify/Vercel của bạn).
* [ ] Nhấn **`F11`** để bật chế độ Fullscreen tràn viền.
* [ ] Bật Webcam máy tính để sẵn sàng cho màn demo nhận diện khuôn mặt và phát hiện ngủ gật.
* [ ] Bật âm thanh máy tính để thu được tiếng chuông báo động (`Drowsy Alarm`) và tiếng chuông khẩn cấp (`SOS Chime`).

---

## 📋 KỊCH BẢN CHI TIẾT THEO TỪNG GIÂY (ACTION & VOICE-OVER SCRIPT)

---

### 🌟 PHẦN 1: ĐẶT VẤN ĐỀ & TUYÊN BỐ SỨ MỆNH (0:00 - 0:30)

* **Mục tiêu:** Gây ấn tượng mạnh trong 10 giây đầu, đánh trúng nỗi đau nhức nhối của xã hội và giới thiệu EduSafe Bus.

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh chi tiết (Voice-over Script) | Gợi ý SFX / Kỹ xảo |
| :--- | :--- | :--- | :--- |
| **0:00 - 0:12** | • Mở màn hình `LoginScreen` với logo EduSafe Bus phát sáng ở giữa.<br>• Rê chuột mượt mà qua 4 thẻ phân quyền tài khoản (Admin, Tài xế, Giáo viên, Phụ huynh). | *"[Tông giọng trầm ấm, trang trọng]* Kính chào Ban Giám Khảo và quý vị! Trong những năm gần đây, những tai nạn thương tâm do **bỏ quên học sinh trên xe đưa đón**, hay thảm kịch bắt nguồn từ việc **tài xế ngủ gật, mất tập trung** đã trở thành nỗi bất an lớn của hàng triệu gia đình Việt Nam." | • BGM nhẹ nhàng, trang trọng.<br>• Zoom nhẹ 105% vào logo phát sáng. |
| **0:12 - 0:30** | • Rê chuột vào tiêu đề: **EduSafe Bus - Nền Tảng An Toàn Xe Đưa Đón Học Sinh Ứng Dụng AI Thông Minh**.<br>• Click chọn tài khoản **Lái xe bus (Tablet cabin)** để chuyển cảnh. | *"[Tông giọng hào hứng, đanh thép]* Để giải quyết triệt để vấn đề này, nhóm chúng em đã phát triển **EduSafe Bus** – nền tảng công nghệ ứng dụng **Trí tuệ nhân tạo AI Edge và IoT thời gian thực**, thiết lập một 'lá chắn an toàn 4 lớp' bảo vệ học sinh từ giây phút bước lên xe đến khi về tới trường. Sau đây, xin kính mời Ban Giám Khảo cùng trải nghiệm hệ thống!" | • SFX: Tiếng Click chuyển cảnh mượt mà. |

---

### 🛡️ PHẦN 2: TRẢI NGHIỆM CABIN TÀI XẾ – AI EDGE & CHỐNG NGỦ GẬT (0:30 - 1:40)

* **Mục tiêu:** Phô diễn 3 tính năng công nghệ đỉnh cao: Nhận diện khuôn mặt 128-D, Lõi AI chống ngủ gật Noisy-OR Fusion và Rà soát cuối xe.

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh chi tiết (Voice-over Script) | Gợi ý SFX / Kỹ xảo |
| :--- | :--- | :--- | :--- |
| **0:30 - 0:55** | • Đang ở giao diện **Tablet Lái xe**.<br>• Bấm nút màu xanh **"Bắt đầu chuyến đi"**.<br>• Bấm mở Camera nhận diện khuôn mặt (`face-api.js`). Đưa mặt vào khung hình.<br>• Khung nhận diện viền xanh lá hiện tên: *Nguyễn Minh Anh - Match 99.4%*, danh sách roster tự động tích xanh `Đã quét`. | *"[Tông giọng tự tin, nhấn mạnh công nghệ]* Đầu tiên là giao diện Tablet đặt ngay tại cabin tài xế. Khi học sinh bước lên xe, mô hình **AI Edge SSD MobileNet** chạy trực tiếp dưới trình duyệt Client sẽ trích xuất vector khuôn mặt 128 chiều, tự động đối khớp và điểm danh với **độ tin cậy trên 99%** [Nghỉ 0.5s]. Cơ chế xử lý cục bộ này giúp bảo mật tuyệt đối quyền riêng tư của học sinh và hoạt động trơn tru ngay cả khi xe đi vào vùng mất sóng 4G." | • Zoom cận cảnh vào dòng: `Match: 99.4% ✓` và nhãn `128-D Vector`. |
| **0:55 - 1:20** | • Rê chuột sang cột trái: **Giám sát tài xế (Drowsiness Engine)**.<br>• Bật Webcam giám sát tài xế. Thực hiện động tác nhắm mắt quá 2 giây hoặc bấm kích hoạt mô phỏng.<br>• Màn hình nhảy **Banner đỏ rực báo động**, còi báo động trong cabin hú vang liên tục (`beep alert`).<br>• Rê chuột chỉ vào các chỉ số: **EAR (0.16)**, **PERCLOS (35%)**, **Risk Score** và bối cảnh lớp 3. | *"[Tông giọng kịch tính, dồn dập]* Tiếp theo là Lõi AI phát hiện ngủ gật thời gian thực. Bằng việc kết hợp chỉ số mở mắt **EAR**, độ mở miệng **MAR** và độ nghiêng đầu **Pitch** qua thuật toán xác suất **Noisy-OR Bayesian Fusion**, ngay khi tài xế nhắm mắt quá 2.5 giây, hệ thống lập tức kích hoạt **còi báo động âm thanh cường độ cao** trong cabin để đánh thức tài xế, ngăn chặn thảm họa tai nạn giao thông từ sớm!" | • Bật âm thanh còi hú báo động thật từ Web Audio.<br>• Highlight viền đỏ xung quanh chỉ số EAR. |
| **1:20 - 1:40** | • Cuộn chuột xuống dưới cùng của màn hình Tablet.<br>• Bấm vào nút lớn: **"Rà soát khoang xe cuối hành trình" (End-trip Sweep)**.<br>• Thao tác quét xác nhận hoàn tất rà soát hàng ghế cuối xe. | *"[Tông giọng nhấn mạnh, thuyết phục]* Khi xe về tới bến, quy trình **End-trip Cabin Sweep** bắt buộc tài xế phải trực tiếp đi xuống cuối xe quét xác nhận trạng thái khoang trống. Hệ thống đối soát chéo với dữ liệu học sinh còn trên xe, **xóa bỏ 100% nguy cơ bỏ quên học sinh** trên xe dưới trời nắng nóng." | • Icon Checkmark xanh phát sáng xác nhận xe đã trống. |

---

### 📱 PHẦN 3: TRẢI NGHIỆM APP PHỤ HUYNH – LIVE GPS & CẢNH BÁO LỆCH TUYẾN (1:40 - 2:35)

* **Mục tiêu:** Thể hiện sự an tâm tuyệt đối của phụ huynh, thuật toán Haversine và tính năng gửi cảnh báo khẩn cấp 1 chạm.

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh chi tiết (Voice-over Script) | Gợi ý SFX / Kỹ xảo |
| :--- | :--- | :--- | :--- |
| **1:40 - 1:55** | • Bấm **Đăng Xuất** trên Navbar -> Đăng nhập tài khoản **Phụ huynh học sinh** (`parent.chi@edusafe.edu.vn`).<br>• Giao diện Mockup Smartphone hiện lên với thiết kế Glassmorphism tinh tế.<br>• Xem thẻ học sinh: *Bé Phạm Phương Chi - Lớp 2C*, bản đồ vệ tinh và lịch sử đón lúc 07:15. | *"[Tông giọng nhẹ nhàng, an tâm]* Với Phụ huynh, chiếc điện thoại thông minh trở thành cầu nối thông tin minh bạch. Cha mẹ có thể theo dõi vị trí GPS trực tiếp của xe bus, xem giờ đón chính xác của con và thời gian dự kiến xe tới trường." | • Zoom vào mô hình điện thoại mô phỏng bản đồ Goong Maps. |
| **1:55 - 2:20** | • Nhìn thấy khung cảnh báo đỏ nổi bật: **"Xe đang chệch lộ trình! AI GPS phát hiện chệch tuyến > 280m"**.<br>• Bấm nút đỏ: **"Gửi cảnh báo khẩn cấp"**.<br>• Tiếng chuông chime vang lên, thanh **Global Emergency Banner** màu đỏ nhấp nháy phát sáng trên đỉnh màn hình.<br>• Rê chuột chỉ vào 2 nút: *Gọi thoại cho tài xế* và *Nhắn tin cho giáo viên*. | *"[Tông giọng cấp bách, tự hào công nghệ]* Khi xe bus đi chệch khỏi tuyến đường quy định trên 100 mét dựa trên **thuật toán hình học Haversine GPS**, phụ huynh nhận được thông báo tức thì. Chỉ cần nhấn nút **'Gửi cảnh báo khẩn cấp'**, tín hiệu báo động sẽ được đồng bộ theo thời gian thực tới Ban Giám Hiệu, Giáo viên và Tablet của tài xế trong chưa đầy **0.2 giây**!" | • SFX: Tiếng Emergency Chime phát ra từ hệ thống.<br>• Highlight banner đỏ trên cùng. |
| **2:20 - 2:35** | • Bấm chuyển sang tab: **"Đăng ký bé đi xe"**.<br>• Rê chuột qua khu vực chụp ảnh và vector hóa khuôn mặt học sinh mới tại nhà. | *"[Tông giọng mượt mà]* Phụ huynh cũng có thể chủ động đăng ký nhận diện khuôn mặt cho con ngay tại nhà qua camera điện thoại, hệ thống tự động đồng bộ vào danh bạ an toàn của đội xe." | • Chuyển tab mượt mà. |

---

### 🏫 PHẦN 4: GIÁM SÁT TỪ TRƯỜNG – TEACHER MONITOR & MANUAL FALLBACK (2:35 - 3:15)

* **Mục tiêu:** Minh chứng tính linh hoạt, xử lý ngoại lệ trong thực tế và vai trò điều phối của giáo viên tại trường.

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh chi tiết (Voice-over Script) | Gợi ý SFX / Kỹ xảo |
| :--- | :--- | :--- | :--- |
| **2:35 - 2:55** | • Đăng xuất -> Đăng nhập tài khoản **Giáo viên giám sát** (`teacher.thu@edusafe.edu.vn`).<br>• Quan sát thấy **Global Emergency Banner** nhấp nháy cảnh báo vừa được phụ huynh gửi.<br>• Xem bảng 5 KPI: *Đã quét AI (3), Điểm danh thủ công (0), Quét thất bại (1), Chờ quét (2), Đã xuống xe (0)*. | *"[Tông giọng chuyên nghiệp]* Tại trường học, Giáo viên giám sát theo dõi toàn diện tiến độ của toàn bộ chuyến xe. Mọi cảnh báo từ phụ huynh hay sự cố trên đường đều hiển thị trực quan ngay trên đầu màn hình." | • Rê chuột qua thanh 5 thẻ KPI màu sắc. |
| **2:55 - 3:15** | • Tìm đến học sinh có trạng thái màu cam: **Trần Gia Bảo - Quét thất bại (Độ tin cậy 43.2%)**.<br>• Bấm nút: **"Điểm danh" (Manual Fallback)**.<br>• Trạng thái lập tức đổi sang màu xanh dương: `Điểm danh thủ công` và KPI cập nhật tức thời. | *"[Tông giọng nhấn mạnh tính thực tế]* Điểm vượt trội của EduSafe Bus là **Cơ chế xác nhận thủ công (Manual Fallback)**. Trong thực tế khi học sinh đeo khẩu trang hoặc trời mưa tối khiến AI quét thất bại, giáo viên có thể ghi đè xác nhận chỉ với 1 click, lưu vết lịch sử rõ ràng mà không làm chậm trễ chuyến đi của các em." | • Zoom vào nút bấm "Điểm danh" và sự thay đổi màu sắc của dòng trạng thái. |

---

### ⚡ PHẦN 5: TRUNG TÂM ĐIỀU HÀNH BGH & MA TRẬN CỨU HỘ SOS (3:15 - 4:00)

* **Mục tiêu:** Khẳng định quy mô quản trị toàn diện, khả năng mở rộng hàng trăm xe và ma trận cứu hộ khẩn cấp cứu sinh mạng.

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh chi tiết (Voice-over Script) | Gợi ý SFX / Kỹ xảo |
| :--- | :--- | :--- | :--- |
| **3:15 - 3:35** | • Đăng xuất -> Đăng nhập tài khoản **Quản trị viên nhà trường** (`admin@edusafe.edu.vn`).<br>• Lướt qua bảng điều khiển tổng: 12/12 Xe hoạt động, 284 Học sinh, Chỉ số an toàn AI 84.5%, và bảng **Nhật ký cảnh báo AI system** đang ghi nhận sự cố chệch tuyến từ phụ huynh. | *"[Tông giọng uy quyền, tổng quan]* Đối với Ban Giám Hiệu, Dashboard quản trị cung cấp bức tranh toàn cảnh về 100% đội xe trong thành phố, chỉ số an toàn sinh trắc học tổng hợp và nhật ký AI Telemetry cập nhật từng giây." | • Lướt mượt qua bảng điều khiển và danh sách đội xe BUS-01 đến BUS-04. |
| **3:35 - 3:50** | • Bấm nút **SOS màu đỏ** trên Navbar.<br>• Hộp thoại **"PHÁT TÍN HIỆU SOS KHẨN CẤP"** hiện ra.<br>• Chọn loại sự cố: **"Tai nạn giao thông"** hoặc **"Cấp cứu y tế / sốc nhiệt"** -> Bấm **"KÍCH HOẠT SOS CẤP TỐC"**.<br>• Nhật ký 4 kênh RabbitMQ, WebSocket, SMS Gateway kích hoạt thành công trong `< 200ms`. | *"[Tông giọng dứt khoát, ấn tượng]* Khi xảy ra biến cố nghiêm trọng trên đường, **Ma trận cứu hộ SOS đa kênh** sẽ kích hoạt điều phối tức thời qua kiến trúc hàng đợi **RabbitMQ**, phát tín hiệu tới xe cấp cứu 115, công an 113 và phụ huynh với độ trễ **dưới 200 mili-giây**." | • Highlight bảng log điều phối 4 kênh cứu nạn. |
| **3:50 - 4:00** | • Bấm nút **"Xuất báo cáo an toàn"** trên bảng danh sách đội xe -> File CSV tự động tải về máy tính.<br>• Bấm nút màu xanh **"Tiếp nhận & Phối hợp"** trên Global Banner để kết thúc cảnh báo thành công. | *"[Tông giọng hài lòng]* Dữ liệu vận hành được tự động trích xuất thành báo cáo an toàn CSV chuẩn hóa chỉ với 1 click để phục vụ công tác thanh tra và lưu trữ hồ sơ." | • Hiển thị file CSV tải về góc dưới màn hình. |

---

### 🚀 PHẦN 6: MINH CHỨNG CÔNG NGHỆ & LỜI KẾT PITCHING (4:00 - 4:30)

* **Mục tiêu:** Khẳng định chiều sâu kỹ thuật, tính khả thi thương mại và để lại ấn tượng khó quên với Ban Giám Khảo.

| Thời gian | Thao tác trên màn hình (Screen Actions) | Lời thoại thuyết minh chi tiết (Voice-over Script) | Gợi ý SFX / Kỹ xảo |
| :--- | :--- | :--- | :--- |
| **4:00 - 4:15** | • Bấm nút **`</> AI Specs`** trên Navbar -> Ngăn kéo kỹ thuật **AIDevPanel** trượt ra từ bên phải.<br>• Lướt qua cấu trúc JSON Payload, công thức tính toán Haversine và sơ đồ vi dịch vụ. | *"[Tông giọng khẳng định, tự tin]* Toàn bộ giải pháp được xây dựng trên nền tảng công nghệ vững chắc: xử lý AI Edge trực tiếp trên thiết bị, kết hợp kiến trúc Microservices hướng sự kiện (Event-Driven) sẵn sàng mở rộng quy mô phục vụ hàng nghìn trường học trên toàn quốc." | • Rê chuột qua các khối code JSON và công thức toán học. |
| **4:15 - 4:30** | • Đóng ngăn kéo, trở về góc nhìn tổng thể giao diện hệ thống.<br>• Chuyển sang slide kết thúc có logo EduSafe Bus, slogan và thông tin liên hệ đội ngũ. | *"[Tông giọng truyền cảm hứng, xúc động và đầy nhiệt huyết]* **EduSafe Bus** không đơn thuần là một sản phẩm công nghệ – mà là lời cam kết bảo vệ tương lai của thế hệ trẻ trên mỗi nẻo đường đến trường. **An toàn của học sinh – Hạnh phúc của mọi gia đình!** Nhóm chúng em xin chân thành cảm ơn Ban Giám Khảo đã chú ý lắng nghe!" | • Nhạc nền (BGM) tăng dần âm lượng ở 3 giây cuối và fade out nhẹ nhàng. |

---

## 🎙️ BẢN GHI LỜI THOẠI ĐỌC LIỀN MẠCH (FULL DEDICATED VOICE-OVER SCRIPT)
*(Dành cho MC hoặc thành viên đội thi cầm giấy đọc trực tiếp khi lồng tiếng video)*

> *"Kính chào Ban Giám Khảo và quý vị! Trong những năm gần đây, những tai nạn thương tâm do bỏ quên học sinh trên xe đưa đón, hay thảm kịch bắt nguồn từ việc tài xế ngủ gật, mất tập trung đã trở thành nỗi bất an lớn của hàng triệu gia đình Việt Nam.*
>
> *Để giải quyết triệt để vấn đề này, nhóm chúng em đã phát triển **EduSafe Bus** – nền tảng công nghệ ứng dụng Trí tuệ nhân tạo AI Edge và IoT thời gian thực, thiết lập một 'lá chắn an toàn 4 lớp' bảo vệ học sinh từ giây phút bước lên xe đến khi về tới trường. Sau đây, xin kính mời Ban Giám Khảo cùng trải nghiệm hệ thống!*
>
> *Đầu tiên là giao diện Tablet đặt ngay tại cabin tài xế. Khi học sinh bước lên xe, mô hình AI Edge SSD MobileNet chạy trực tiếp dưới trình duyệt Client sẽ trích xuất vector khuôn mặt 128 chiều, tự động đối khớp và điểm danh với độ tin cậy trên 99%. Cơ chế xử lý cục bộ này giúp bảo mật tuyệt đối quyền riêng tư của học sinh và hoạt động trơn tru ngay cả khi xe đi vào vùng mất sóng 4G.*
>
> *Tiếp theo là Lõi AI phát hiện ngủ gật thời gian thực. Bằng việc kết hợp chỉ số mở mắt EAR, độ mở miệng MAR và độ nghiêng đầu Pitch qua thuật toán xác suất Noisy-OR Bayesian Fusion, ngay khi tài xế nhắm mắt quá 2.5 giây, hệ thống lập tức kích hoạt còi báo động âm thanh cường độ cao trong cabin để đánh thức tài xế, ngăn chặn thảm họa tai nạn giao thông từ sớm!*
>
> *Khi xe về tới bến, quy trình End-trip Cabin Sweep bắt buộc tài xế phải trực tiếp đi xuống cuối xe quét xác nhận trạng thái khoang trống. Hệ thống đối soát chéo với dữ liệu học sinh còn trên xe, xóa bỏ 100% nguy cơ bỏ quên học sinh trên xe dưới trời nắng nóng.*
>
> *Với Phụ huynh, chiếc điện thoại thông minh trở thành cầu nối thông tin minh bạch. Cha mẹ có thể theo dõi vị trí GPS trực tiếp của xe bus, xem giờ đón chính xác của con và thời gian dự kiến xe tới trường. Khi xe bus đi chệch khỏi tuyến đường quy định trên 100 mét dựa trên thuật toán hình học Haversine GPS, phụ huynh nhận được thông báo tức thì. Chỉ cần nhấn nút 'Gửi cảnh báo khẩn cấp', tín hiệu báo động sẽ được đồng bộ theo thời gian thực tới Ban Giám Hiệu, Giáo viên và Tablet của tài xế trong chưa đầy 0.2 giây! Phụ huynh cũng có thể chủ động đăng ký nhận diện khuôn mặt cho con ngay tại nhà qua camera điện thoại.*
>
> *Tại trường học, Giáo viên giám sát theo dõi toàn diện tiến độ của toàn bộ chuyến xe. Điểm vượt trội của EduSafe Bus là Cơ chế xác nhận thủ công (Manual Fallback). Trong thực tế khi học sinh đeo khẩu trang hoặc trời mưa tối khiến AI quét thất bại, giáo viên có thể ghi đè xác nhận chỉ với 1 click, lưu vết lịch sử rõ ràng mà không làm chậm trễ chuyến đi của các em.*
>
> *Đối với Ban Giám Hiệu, Dashboard quản trị cung cấp bức tranh toàn cảnh về 100% đội xe trong thành phố, chỉ số an toàn sinh trắc học tổng hợp và nhật ký AI Telemetry cập nhật từng giây. Khi xảy ra biến cố nghiêm trọng trên đường, Ma trận cứu hộ SOS đa kênh sẽ kích hoạt điều phối tức thời qua kiến trúc hàng đợi RabbitMQ, phát tín hiệu tới xe cấp cứu 115, công an 113 và phụ huynh với độ trễ dưới 200 mili-giây. Dữ liệu vận hành được tự động trích xuất thành báo cáo an toàn CSV chuẩn hóa chỉ với 1 click để phục vụ công tác thanh tra và lưu trữ hồ sơ.*
>
> *Toàn bộ giải pháp được xây dựng trên nền tảng công nghệ vững chắc: xử lý AI Edge trực tiếp trên thiết bị, kết hợp kiến trúc Microservices hướng sự kiện sẵn sàng mở rộng quy mô phục vụ hàng nghìn trường học trên toàn quốc.*
>
> *EduSafe Bus không đơn thuần là một sản phẩm công nghệ – mà là lời cam kết bảo vệ tương lai của thế hệ trẻ trên mỗi nẻo đường đến trường. An toàn của học sinh – Hạnh phúc của mọi gia đình! Nhóm chúng em xin chân thành cảm ơn Ban Giám Khảo đã chú ý lắng nghe!"*

---

## 🏆 DANH MỤC CÁC CÂU NÓI ĐẮT GIÁ (PUNCHLINES DÀNH CHO BAN GIÁM KHẢO)
* *"Xóa bỏ 100% rủi ro bỏ quên học sinh trên xe bằng quy trình End-trip Cabin Sweep hai lớp."*
* *"AI Edge Biometrics bảo vệ quyền riêng tư dữ liệu trẻ em, không gửi ảnh lên máy chủ công cộng."*
* *"Lõi Noisy-OR Bayesian Fusion phát hiện tài xế mệt mỏi trước khi tai nạn có cơ hội xảy ra."*
* *"Độ trễ điều phối SOS dưới 200 mili-giây – Từng giây đều là sự sống của các em học sinh."*
