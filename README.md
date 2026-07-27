# EduSafe Bus - Nền Tảng Giám Sát An Toàn Xe Đưa Đón Học Sinh Thông Minh

![EduSafe Bus Logo](/public/edusafe_logo.png)

> **Dự án Khởi nghiệp Công nghệ Giáo dục & An toàn Giao thông**  
> Hệ thống tích hợp Trí tuệ nhân tạo (AI) giúp giải quyết triệt để rủi ro bỏ quên học sinh trên xe, giám sát sự mất tập trung/ngủ gật của tài xế và cảnh báo chệch lộ trình thời gian thực.

> ⚡ **Lưu ý nút Demo (Ngủ Gật / Bỏ Quên / Lệch Tuyến)**: Các nút mô phỏng AI chỉ hiện ở đúng vai trò cần thiết — Giáo Viên sẽ không thấy nút nào vì không liên quan đến các tình huống đó.

---

## 📌 1. Danh Sách Tài Khoản Đăng Nhập Phân Quyền (Credentials)

Hệ thống tự động nhận diện vai trò dựa trên email khi đăng nhập và chuyển thẳng tới giao diện chuyên biệt của người đó:

| Phân Quyền (Role) | Email Đăng Nhập | Mật Khẩu | Mô Tả Giao Diện |
| :--- | :--- | :--- | :--- |
| **Admin Trường** | `admin@edusafe.edu.vn` | `admin123` | Dashboard tổng quan đội xe, chỉ số an toàn AI, bản đồ GPS & báo cáo vi phạm |
| **Lái Xe Bus** | `driver.hung@edusafe.edu.vn` | `driver123` | Màn hình Tablet cabin giám sát mắt ngủ gật (EAR), rà soát khoang xe (End-trip) |
| **Giáo Viên Giám Sát** | `teacher.thu@edusafe.edu.vn` | `teacher123` | Khung quét điểm danh khuôn mặt học sinh lúc đón/trả trạm |
| **Phụ Huynh** | `parent.chi@edusafe.edu.vn` | `parent123` | Màn hình Mobile theo dõi vị trí xe real-time, ETA và nhận thông báo con lên/xuống xe |

---

## 🛠️ 2. Hướng Dẫn Cài Đặt & Chạy Chế Độ Development

### Yêu cầu môi trường:
- **Node.js**: `v18.0.0` trở lên (Khuyến nghị `v20.x` hoặc `v24.x`)
- **NPM**: `v9.x` trở lên

### Các bước thực hiện:

1. **Cài đặt thư viện phụ thuộc (Dependencies)**:
   ```bash
   npm install
   ```

2. **Chạy server phát triển (Development Mode)**:
   ```bash
   npm run dev
   ```
   Ứng dụng sẽ tự động chạy tại địa chỉ: `http://localhost:5173/`

3. **Kiểm tra Build Production bundle**:
   ```bash
   npm run build
   ```

---

## 🐳 3. Hướng Dẫn Đóng Gói & Triển Khai Với Docker

Dự án đã được cấu hình sẵn **Multi-stage Dockerfile** kết hợp Nginx để tối ưu hóa hiệu năng, giảm dung lượng image và bảo mật cho môi trường Production.

### Sử dụng Docker Compose (Khuyến nghị)
Chạy lệnh duy nhất để build và khởi chạy ứng dụng:
```bash
docker-compose up -d --build
```
- **Cổng truy cập**: 
  - `http://localhost:8080` (Hoặc `http://localhost:5173`)
- **Kiểm tra trạng thái container**:
  ```bash
  docker-compose ps
  ```
- **Dừng ứng dụng**:
  ```bash
  docker-compose down
  ```

---

## 🌐 4. Publish Lên Internet (Để Mọi Người Dùng)

Vì web chỉ có **giao diện tĩnh + đăng nhập client-side**, không cần server riêng. Tất cả mọi người (Admin, Lái xe, Giáo viên, Phụ huynh) dùng **cùng một URL** rồi đăng nhập bằng tài khoản của role mình.

### Cách 1: Netlify (Nhanh nhất — Miễn phí, HTTPS tự động)

**Bước 1:** Đẩy code lên GitHub:
```bash
git add .
git commit -m "feat: EduSafe Bus web UI"
git push origin cheese
```

**Bước 2:** Truy cập [netlify.com](https://netlify.com) → Đăng nhập → **"Add new site" → "Import from Git"**

**Bước 3:** Chọn repo `RedVelvet`, nhánh `cheese`. Netlify tự đọc `netlify.toml` và cấu hình:
- Build command: `npm run build`
- Publish directory: `dist`

**Bước 4:** Nhấn **Deploy** → Sau ~2 phút nhận URL dạng `https://edusafe-bus.netlify.app`

**Bước 5:** Gửi link đó cho tất cả thành viên. Mỗi người đăng nhập bằng email/mật khẩu của role mình.

> 🔒 Netlify hỗ trợ **HTTPS miễn phí** và **custom domain** nếu nhóm có domain riêng.

---

### Cách 2: VPS / Cloud Server (Khi cần backend AI ghép vào)

Khi nhóm đã làm xong phần AI và cần deploy server thật:

```bash
# Trên VPS (Ubuntu), cài Docker + Docker Compose
curl -fsSL https://get.docker.com | sh
apt install docker-compose -y

# Clone repo và chạy
git clone <repo-url>
cd RedVelvet
docker-compose up -d --build
```

Truy cập qua IP hoặc domain của VPS tại cổng `8080`.

---

Giao diện Frontend đã được thiết kế sẵn các **UI Slots, Live WebCam Handlers, WebSocket Subscriber Payload Schemas** đúng theo tài liệu kỹ thuật dự án:

1. **Nhận diện khuôn mặt (`face-api.js`)**:
   - **Tệp giao diện**: `src/components/TeacherMonitorView.jsx` & `src/components/CameraAiOverlay.jsx`
   - **Định dạng Descriptor**: Vector 128 chiều (`128-D descriptor`), khoảng cách Euclid threshold `0.60`.
   - **Trạng thái Roster**: `boarded` (đã lên), `alighted` (đã xuống), `wrong_bus` (lên nhầm xe).

2. **Cảnh báo ngủ gật tài xế (`Inferensys / ai-driver-safety`)**:
   - **Tệp giao diện**: `src/components/DriverTabletView.jsx`
   - **Chỉ số Biometrics**:
     - `EAR` (Eye Aspect Ratio): Ngưỡng `< 0.20` kích hoạt chuông cảnh báo nhắm mắt > 2.5s.
     - `MAR` (Mouth Aspect Ratio): Ngưỡng `> 0.50` phát hiện hành vi ngáp mệt mỏi.
     - `Noisy-OR Fusion`: Thuật toán mạng Bayes tính toán tổng hợp điểm rủi ro cabin.

3. **Định vị & Lệch tuyến Haversine (`bustracker`)**:
   - **Tệp giao diện**: `src/components/LiveMapSimulator.jsx`
   - **Thuật toán**: Chiếu vector vuông góc từ GPS lên lộ trình chuẩn. Ngưỡng cảnh báo lệch `> 150m`.

4. **Ma trận Nút bấm SOS Khẩn Cấp (`EmergencyDispatcher`)**:
   - **Tệp giao diện**: `src/components/SosModal.jsx`
   - **Luồng xử lý**: Đẩy message vào hàng đợi RabbitMQ, kích hoạt đồng thời tin nhắn SMS 113/114/115, Push Notification và WebSocket đến BGH & Phụ huynh `< 1s`.

> 💡 **Mẹo**: Nhấp vào nút **`</> AI Specs`** trên thanh tiêu đề Navbar trong ứng dụng để xem chi tiết mã nguồn mẫu tích hợp dành cho AI Backend.

---

## 📑 5. Đóng Góp Dự Án & Bản Quyền

- **Tác giả dự án**: Đội ngũ Khởi nghiệp EduSafe Bus
- **Công nghệ**: React, Vite, Lucide Icons, Nginx, Docker.
- **Bản quyền**: &copy; 2026 EduSafe Bus Platform. All rights reserved.
