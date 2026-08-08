# SƠ ĐỒ TUẦN TỰ CHI TIẾT HỆ THỐNG EDUSAFE BUS (DETAILED SEQUENCE DIAGRAMS)

> **EduSafe Bus** — Nền tảng Giám sát An toàn Xe Đưa Đón Học sinh Thông minh tích hợp Trí tuệ Nhân tạo (AI Edge Computing), Định vị thời gian thực và Cảnh báo Đa kênh.

---

## 📑 MỤC LỤC
1. [Tổng Quan Thành Phần Hệ Thống (Participants & Components)](#1-tổng-quan-thành-phần-hệ-thống)
2. [Sơ Đồ 1: Tổng Thể Luồng Vận Hành Chuyến Xe (End-to-End Trip Lifecycle)](#2-sơ-đồ-1-tổng-thể-luồng-vận-hành-chuyến-xe)
3. [Sơ Đồ 2: Điểm Danh AI Edge Khuôn Mặt Học Sinh & Xác Nhận Thủ Công](#3-sơ-đồ-2-điểm-danh-ai-edge-khuôn-mặt-học-sinh--xác-nhận-thủ-công)
4. [Sơ Đồ 3: Giám Sát Buồn Ngủ & Mất Tập Trung Lái Xe (Noisy-OR Bayesian Engine)](#4-sơ-đồ-3-giám-sát-buồn-ngủ--mất-tập-trung-lái-xe)
5. [Sơ Đồ 4: Định Vị GPS Realtime & Thuật Toán Cảnh Báo Chệch Tuyến Haversine](#5-sơ-đồ-4-định-vị-gps-realtime--thuật-toán-cảnh-báo-chệch-tuyến-haversine)
6. [Sơ Đồ 5: Ma Trận Xử Lý Nút Bấm Khẩn Cấp (Emergency SOS Dispatcher)](#6-sơ-đồ-5-ma-trận-xử-lý-nút-bấm-khẩn-cấp)
7. [Sơ Đồ 6: Quy Trình Rà Soát Khoang Xe Cuối Hành Trình Chống Bỏ Quên (End-Trip Cabin Sweep)](#7-sơ-đồ-6-quy-trình-rà-soát-khoang-xe-cuối-hành-trình-chống-bỏ-quên)

---

## 1. TỔNG QUAN THÀNH PHẦN HỆ THỐNG

Các đối tượng tham gia trong các Sequence Diagram được định danh như sau:

| Loại | Tên Thành Phần | Ký Hiệu | Vai Trò & Chức Năng Kỹ Thuật |
| :--- | :--- | :--- | :--- |
| **Actors** | Lái Xe Bus | `Driver` | Thao tác Tablet Cabin, nhận cảnh báo ngủ gật, thực hiện End-Trip Sweep. |
| | Giáo Viên Giám Sát | `Teacher` | Dùng app camera quét khuôn mặt học sinh tại trạm đón/trả, xác nhận thủ công. |
| | Phụ Huynh Học Sinh | `Parent` | Nhận thông báo Push/SMS khi con lên/xuống xe, theo dõi vị trí xe real-time. |
| | Admin Nhà Trường | `Admin` | Giám sát điều hành toàn bộ đội xe, nhận cảnh báo chệch tuyến và SOS. |
| **Client / Edge** | App Lái Xe (Driver Tablet) | `Tablet` | Giao diện React SPA Cabin tích hợp WebCam & Drowsiness Engine. |
| | App Giáo Viên (Teacher App) | `TeacherApp` | Giao diện React SPA tích hợp WebCam AI & Face Recognition. |
| | App Phụ Huynh & Admin | `ClientApps` | Giao diện Web/Mobile React hiển thị Mapbox & Báo cáo Realtime. |
| **AI Engines** | Lõi Nhận Diện Khuôn Mặt | `FaceAI` | Thư viện `face-api.js` (tinyFaceDetector, 68 Landmarks, 128-D Descriptor). |
| | Lõi Giám Sát Buồn Ngủ | `DrowsyAI` | Thuật toán tính `EAR`, `MAR`, `Pitch` & Mạng Bayes `Noisy-OR Fusion`. |
| **Backend Services** | Backend API Gateway | `API` | Node.js / Express xử lý REST API, Authentication (JWT), Business Logic. |
| | Realtime WebSocket Server | `WS` | Socket.io Server broadcast vị trí GPS & Tín hiệu cảnh báo thời gian thực. |
| | Hàng Đợi Sự Kiện | `RabbitMQ` | Message Broker tiếp nhận và phân phối sự kiện khẩn cấp (SOS/Alerts). |
| **Storage** | Cache Bộ Nhớ Đệm | `Redis` | Lưu trữ vị trí GPS tức thời, Session và Socket ID mapping. |
| | Cơ Sở Dữ Liệu Quan Hệ | `PostgreSQL` | Lưu trữ Học sinh, Chuyến xe, Roster, Vector khuôn mặt, Nhật ký vi phạm. |
| **3rd Party APIs** | Dịch Vụ SMS & Push Alert | `Twilio_FCM` | Twilio SMS Gateway & Firebase Cloud Messaging (Push Notifications). |

---

## 2. SƠ ĐỒ 1: TỔNG THỂ LUỒNG VẬN HÀNH CHUYẾN XE

Sơ đồ mô tả bức tranh toàn cảnh một hành trình đưa đón học sinh từ lúc khởi tạo đến khi kết thúc.

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Lái Xe Bus
    actor Teacher as Giáo Viên Giám Sát
    actor Parent as Phụ Huynh
    actor Admin as Admin Trường
    participant Tablet as Driver Tablet UI
    participant TeacherApp as Teacher Monitor UI
    participant WS as WebSocket Server
    participant API as Backend API Server
    participant DB as PostgreSQL DB

    Note over Driver, DB: 1. GIAO ĐOẠN KHỞI TẠO CHUYẾN XE (TRIP INITIALIZATION)
    Driver->>Tablet: Đăng nhập & Chọn tuyến xe (Ví dụ: Route 01 - Buổi Sáng)
    Tablet->>API: POST /api/v1/trips/start {busId, driverId, routeId}
    API->>DB: Kiểm tra lịch trình & Đổi trạng thái trip -> 'IN_PROGRESS'
    API-->>Tablet: Trả về Danh sách Roster chuẩn bị & Waypoints lộ trình
    Tablet->>WS: Subscribe channel `bus:BUS_01:telemetry`

    Note over Teacher, Parent: 2. GIAO ĐOẠN ĐÓN HỌC SINH TẠI TRẠM (PICKUP STATION)
    Teacher->>TeacherApp: Mở khung quét điểm danh tại Trạm 1
    TeacherApp->>TeacherApp: Quét khuôn mặt HS (Edge AI Face-api.js)
    TeacherApp->>API: POST /api/v1/roster/scan {studentId, status: 'boarded', timestamp}
    API->>DB: Ghi nhận lịch sử lên xe (TRIP_ROSTER)
    API->>WS: Publish event `student:boarded`
    WS-->>Parent: Push Notification: "Bé Minh Anh đã lên xe Bus 01 lúc 07:15"

    Note over Driver, Admin: 3. GIAO ĐOẠN DI CHUYỂN & GIÁM SÁT REAL-TIME (IN-TRANSIT MONITORING)
    loop Liên tục mỗi 1 giây (Telemetry Stream & AI Surveillance)
        Tablet->>Tablet: Đọc Camera Cabin -> Tính EAR/MAR -> Kiểm tra Buồn ngủ
        Tablet->>WS: Emit `bus:location` {lat, lng, speed, drowsinessRisk}
        WS->>Redis: Cập nhật GPS Cache thời gian thực
        WS-->>ClientApps: Broadcast tọa độ cho Map Admin & Phụ huynh
        
        opt Nếu phát hiện Lệch Tuyến (>150m) hoặc Buồn Ngủ Level 2
            WS-->>Admin: Cảnh báo đỏ trên Admin Dashboard UI
        end
    end

    Note over Driver, DB: 4. GIAO ĐOẠN KẾT THÚC & RÀ SOÁT KHOANG XE (END-TRIP CABIN SWEEP)
    Driver->>Tablet: Chọn "Kết thúc chuyến đi" tại bãi đỗ
    Tablet->>Tablet: Yêu cầu thực hiện "Rà soát khoang xe cuối hành trình"
    Driver->>Driver: Đi xuống cuối xe kiểm tra ghế & bấm nút quét xác nhận ở đuôi xe
    Driver->>Tablet: Xác nhận "Xe trống - Không còn học sinh"
    Tablet->>API: POST /api/v1/trips/end {tripId, sweepConfirmed: true}
    API->>DB: Đối soát Roster: check count(still_on_bus) == 0
    alt Roster đối soát thành công (Trống 100%)
        API->>DB: Đổi trạng thái trip -> 'COMPLETED'
        API-->>Tablet: Thông báo Chuyến xe thành công & An toàn!
    else Phát hiện còn học sinh sót trên DB
        API-->>Tablet: ALARM KHẨN CẤP: "Cảnh báo! Còn 1 học sinh chưa xuống xe!"
        API->>WS: Broadcast Emergency Alert -> Admin & Teacher
    end
```

---

## 3. SƠ ĐỒ 2: ĐIỂM DANH AI EDGE KHUÔN MẶT HỌC SINH & XÁC NHẬN THỦ CÔNG

Chi tiết quy trình quét khuôn mặt sử dụng thuật toán AI Edge (`face-api.js`) trích xuất mảng Vector 128 chiều và tính khoảng cách Euclid (Euclidean Distance), hỗ trợ cơ chế xác nhận thủ công (Manual Fallback).

```mermaid
sequenceDiagram
    autonumber
    actor Student as Học Sinh
    actor Teacher as Giáo Viên
    participant CamUI as CameraAiOverlay (React)
    participant FaceEngine as face-api.js (Edge Model)
    participant RosterUtil as faceEngine.js Utility
    participant API as Backend API Server
    participant DB as PostgreSQL DB
    participant WS as WebSocket / FCM

    Teacher->>CamUI: Mở Camera điểm danh tại trạm đón/trả
    CamUI->>FaceEngine: Tải trước weights (`tinyFaceDetector`, `faceLandmark68`, `faceRecognitionNet`)
    FaceEngine-->>CamUI: Models Loaded (Sẵn sàng quét 30 fps)

    loop Xử lý mỗi khung hình Video (WebCam Stream)
        CamUI->>FaceEngine: DetectSingleFace(videoFrame).withFaceLandmarks().withFaceDescriptor()
        
        alt Phát hiện khuôn mặt trong khung hình
            FaceEngine-->>CamUI: Trả về Bounding Box & Vector đặc trưng `128-D Float32Array`
            CamUI->>RosterUtil: findBestMatch(currentDescriptor, studentRosterDescriptors)
            RosterUtil->>RosterUtil: Tính Euclidean Distance d = sqrt(sum((v1[i] - v2[i])^2))
            
            alt Khoảng cách d <= Threshold 0.55 (Độ tin cậy > 85%)
                RosterUtil-->>CamUI: Khớp danh tính: Student ID (VD: HS01 - Nguyễn Minh Anh)
                CamUI->>Teacher: Hiển thị Bounding Box XANH LÁ + Tên & Độ tin cậy (99.4%)
                CamUI->>API: POST /api/v1/attendance/scan {studentId: 'HS01', status: 'boarded', confidence: 0.994}
                API->>DB: Ghi nhận bản ghi điểm danh TRIP_ROSTER
                API->>WS: Gửi sự kiện `ATTENDANCE_SUCCESS`
                WS-->>Parent: Push Alert Mobile: "Bé Minh Anh đã lên xe"
            else Khoảng cách d > 0.55 (Quét thất bại / Nhầm lẫn / Đeo khẩu trang)
                RosterUtil-->>CamUI: Match Failed (Distance too high)
                CamUI->>Teacher: Hiển thị Bounding Box CAM: "Quét thất bại / Không nhận diện được"
            end
        else Không có khuôn mặt
            CamUI->>CamUI: Chờ khung hình tiếp theo
        end
    end

    Note over Teacher, DB: LUỒNG XÁC NHẬN THỦ CÔNG (MANUAL FALLBACK ROSTER)
    opt Khi AI quét thất bại hoặc ánh sáng yếu
        Teacher->>CamUI: Bấm chọn học sinh trên Danh sách Roster (VD: HS03 - Trần Gia Bảo)
        Teacher->>CamUI: Nhấn nút "Xác Nhận Thủ Công (Manual Confirm)"
        CamUI->>API: POST /api/v1/attendance/manual-override {studentId: 'HS03', teacherId, status: 'manual'}
        API->>DB: Cập nhật status='manual', lưu Teacher Audit Log
        API->>WS: Gửi thông báo cập nhật Roster Realtime
        CamUI->>Teacher: Cập nhật Badge "Điểm Danh Thủ Công" (Màu xanh dương)
    end
```

---

## 4. SƠ ĐỒ 3: GIÁM SÁT BUỒN NGỦ & MẤT TẬP TRUNG LÁI XE

Luồng xử lý chỉ số sinh trắc học `EAR` (Eye Aspect Ratio), `MAR` (Mouth Aspect Ratio) và độ nghiêng đầu `Pitch` thông qua mô hình tích lũy rủi ro **Noisy-OR Bayesian Fusion** trên Driver Tablet.

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Lái Xe Bus
    participant TabletCam as Cabin WebCam
    participant Detector as DrowsinessDetector Class
    participant Sound as HTML5 Audio Synth (Alert Beep)
    participant WS as WebSocket Server
    participant AdminUI as Admin Dashboard

    Driver->>TabletCam: Lái xe đối diện Camera giám sát Cabin
    
    loop Chu kỳ tính toán mỗi 250ms (4Hz Loop)
        TabletCam->>Detector: Truyền tham số Live: processFrame(EAR, MAR, Pitch, contextLevel)
        
        Detector->>Detector: 1. Tính toán EAR (Eye Aspect Ratio)
        Detector->>Detector: 2. Tính toán MAR (Mouth Aspect Ratio - Ngáp)
        Detector->>Detector: 3. Cập nhật cửa sổ trượt PERCLOS (Tỷ lệ phần trăm nhắm mắt)
        Detector->>Detector: 4. Áp dụng Thuật toán Noisy-OR Bayesian Fusion:
        Note over Detector: RiskScore = 1 - (1 - P_ear) * (1 - P_mar) * (1 - P_pitch)

        alt TH1: EAR < 0.19 liên tục > 2.5 giây (L1 Reflex - Nhắm mắt ngắn)
            Detector->>Sound: Trigger playBeepAlert() (Âm thanh "Tít... Tít...")
            Detector->>Detector: Set alertLevel = 1 (Cảnh báo nhẹ Cabin)
        else TH2: RiskScore >= 0.65 HOẶC Nhắm mắt > 4.0s (L2 Danger - Buồn ngủ nặng)
            Detector->>Sound: Trigger Continuous Siren (Còi hú báo động nguy hiểm)
            Detector->>Detector: Set alertLevel = 2 (Cảnh báo mức đỏ)
            Detector->>WS: Emit `drowsiness:alert` {driverId, busId, alertLevel: 2, riskScore, ear, mar}
            WS->>AdminUI: Pop-up Cảnh báo Đỏ & Phát còi hú tại Trung tâm Điều hành Admin
        else TH3: Trạng thái tỉnh táo bình thường (EAR > 0.25)
            Detector->>Detector: Giảm dần RiskScore về mức an toàn (< 0.20)
            Detector->>Sound: Dừng mọi âm thanh cảnh báo
        end

        Detector-->>TabletCam: Trả về trạng thái DrowsinessState render UI Gauge/Telemetry
    end
```

---

## 5. SƠ ĐỒ 4: ĐỊNH VỊ GPS REALTIME & THUẬT TOÁN CẢNH BÁO CHỆCH TUYẾN HAVERSINE

Mô tả luồng truyền nhận dữ liệu định vị, lọc nhiễu GPS và thuật toán chiếu Vector khoảng cách vuông góc Haversine lên lộ trình chuẩn để phát hiện xe đi sai tuyến.

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Lái Xe
    participant GPS as Device GPS / Simulator
    participant Tablet as Driver Tablet UI
    participant MapEngine as LiveMapSimulator (Haversine Engine)
    participant WS as Socket.io Server
    participant Redis as Redis Cache
    actor Parent as App Phụ Huynh

    loop Mỗi 1-2 giây truyền nhận GPS Telemetry
        GPS->>Tablet: Tọa độ GPS thô (Raw GPS: lat, lng, speed, heading)
        Tablet->>MapEngine: Lọc nhiễu qua bộ lọc Trung bình trượt (SMA Filter)
        MapEngine->>MapEngine: Lấy tập hợp Waypoints chuẩn của Route từ Memory
        
        Note over MapEngine: THUẬT TOÁN ĐO CHỆCH TUYẾN (PERPENDICULAR HAVERSINE PROJECTION)
        MapEngine->>MapEngine: 1. Xác định đoạn thẳng Waypoint W(i) -> W(i+1) gần nhất
        MapEngine->>MapEngine: 2. Chiếu điểm GPS P xuống đường thẳng W(i)W(i+1) thành P'
        MapEngine->>MapEngine: 3. Tính khoảng cách Haversine d = Distance(P, P') tính bằng Mét

        alt Khoảng cách chệch tuyến d > 150 mét (Vượt ngưỡng an toàn)
            MapEngine->>MapEngine: Kích hoạt trạng thái `isOffRoute = true`
            MapEngine->>Tablet: Bật Badge Đỏ: "CẢNH BÁO CHỆCH LỘ TRÌNH ĐÃ ĐĂNG KÝ!"
            Tablet->>WS: Emit `bus:off_route` {busId, routeId, deviationMeters: d, currentCoords}
            WS->>Redis: Lưu vết Sự cố Chệch tuyến
            WS-->>Parent: Push Notification Alert: "Xe Bus 01 đang đi chệch lộ trình 180m!"
        else Khoảng cách d <= 150 mét (Đi đúng tuyến)
            MapEngine->>MapEngine: Set `isOffRoute = false`
            Tablet->>WS: Emit `bus:telemetry` {busId, coords: {lat, lng}, speed, etaNextStop}
            WS->>Redis: SET bus:01:location {lat, lng, updated_at}
            WS-->>Parent: Cập nhật vị trí Bus biểu tượng Icon chạy trên bản đồ & ETA (VD: 5 phút nữa tới trạm)
        end
    end
```

---

## 6. SƠ ĐỒ 5: MA TRẬN XỬ LÝ NÚT BẤM KHẨN CẤP (EMERGENCY SOS DISPATCHER)

Sơ đồ mô tả quy trình kích hoạt SOS khi gặp sự cố nghiêm trọng (Va chạm, hỏa hoạn, tài xế đột quỵ), đảm bảo thông báo được phát tán đồng thời đa kênh (Multi-channel Fanout) với độ trễ dưới 1 giây.

```mermaid
sequenceDiagram
    autonumber
    actor User as Lái xe / Giáo viên / Admin
    participant SosModal as SosModal UI Component
    participant API as Backend API Gateway
    participant RabbitMQ as RabbitMQ Message Broker
    participant EmergencyWorker as SOS Dispatcher Service
    participant WS as Socket.io Server
    participant Twilio_FCM as Twilio SMS & FCM Push Gateway
    actor Recipients as BGH / Phụ Huynh / Cấp Cứu 115

    User->>SosModal: Bấm giữ Nút SOS Khẩn Cấp (Hold 2s để chống bấm nhầm)
    SosModal->>SosModal: Kích hoạt Haptic Vibration & Âm thanh đếm ngược
    SosModal->>API: POST /api/v1/emergency/sos {busId, location, reason: 'CRASH/MEDICAL', triggeredBy}
    
    API->>API: Tạo mã sự cố khẩn cấp (Incidents Ticket ID: #SOS-9982)
    API->>RabbitMQ: Publish Message `emergency.sos.event` to Exchange 'sos_fanout'
    API-->>SosModal: Trả về 200 OK: "Tín hiệu SOS đã phát thành công!"

    par Xử lý đa kênh song song (Concurrent Multi-channel Processing < 1s)
        RabbitMQ->>WS: Broadcast Urgent Signal `EMERGENCY_ALERT_BROADCAST`
        WS-->>Recipients: Pop-up màn hình Đỏ + Chuông báo động cấp bách trên App Admin & Parent

        and
        RabbitMQ->>EmergencyWorker: Consume `emergency.sos.event`
        EmergencyWorker->>Twilio_FCM: Gọi API Twilio SMS & Call khẩn cấp
        Twilio_FCM-->>Recipients: Gửi tin nhắn SMS khẩn cấp tới Số hotline BGH & Phụ huynh
        Twilio_FCM-->>Recipients: Tự động kích hoạt cuộc gọi tổng đài cứu hộ 113 / 115 (Nếu cấu hình)

        and
        EmergencyWorker->>Twilio_FCM: Gọi Firebase Cloud Messaging (FCM High Priority)
        Twilio_FCM-->>Recipients: Push Alert đè màn hình khóa điện thoại (Lock-screen Alert)
    end
```

---

## 7. SƠ ĐỒ 6: QUY TRÌNH RÀ SOÁT KHOANG XE CUỐI HÀNH TRÌNH CHỐNG BỎ QUÊN (END-TRIP CABIN SWEEP)

Quy trình bắt buộc nhằm loại bỏ 100% rủi ro bỏ quên học sinh ngủ trên xe sau khi chuyến đi hoàn tất.

```mermaid
sequenceDiagram
    autonumber
    actor Driver as Lái Xe Bus
    participant Tablet as Driver Tablet UI
    participant Scanner as NFC/QR Code Scanner (Đuôi xe)
    participant API as Backend API Server
    participant DB as PostgreSQL DB
    actor Admin as Admin Trường / Phụ Huynh

    Driver->>Tablet: Nhấn nút "KẾT THÚC CHUYẾN XE" tại bãi đỗ
    Tablet->>API: GET /api/v1/trips/check-roster-status?busId=BUS01
    API->>DB: Trích xuất số lượng học sinh còn trạng thái `boarded` (chưa scan xuống)
    DB-->>API: Trả về kết quả (Ví dụ: `remaining_students = 0` hoặc `remaining_students = 1`)

    alt Trường hợp A: Vẫn còn học sinh chưa quét thẻ/khuôn mặt xuống xe
        API-->>Tablet: CẢNH BÁO: "Còn 1 học sinh chưa điểm danh xuống xe!"
        Tablet->>Tablet: KHÓA tính năng kết thúc chuyến + Hiển thị Danh sách học sinh chưa xuống
        Tablet->>Driver: Yêu cầu Lái xe đi xuống từng hàng ghế kiểm tra trực tiếp!
    else Trường hợp B: Tất cả học sinh đã xuống xe theo dữ liệu
        API-->>Tablet: Dữ liệu Roster khớp 100%
    end

    Note over Driver, Scanner: THỰC HIỆN QUY TRÌNH VẬT LÝ (PHYSICAL CABIN SWEEP)
    Tablet->>Driver: "Vui lòng di chuyển xuống BẬT CÔNG TẮC / QUÉT MÃ QR ở hàng ghế CUỐI CÙNG xe!"
    Driver->>Driver: Đi từ đầu xe xuống cuối xe, kiểm tra kỹ từng gầm ghế
    Driver->>Scanner: Quét mã QR / Chạm NFC Checkpoint cố định ở vách đỗ cuối xe
    Scanner->>Tablet: Xác thực vị trí Lái xe đã đứng ở cuối xe (Physical Presence Verified)

    Tablet->>API: POST /api/v1/trips/confirm-sweep {tripId, driverId, sweepTimestamp, checkpointId}
    API->>DB: Cập nhật SWEEP_LOGS {verified: true} & Đóng Trip -> 'CLOSED'
    API-->>Tablet: Mở khóa xe thành công! Hiển thị "BÁO CÁO AN TOÀN: CHUYẾN XE HOÀN HẢO"
    API->>Admin: Gửi Báo cáo Hoàn tất Chuyến xe An toàn đến Admin Dashboard
```

---

> **EduSafe Bus System Architecture** — Được thiết kế và chuẩn hóa kỹ thuật theo tiêu chuẩn an toàn ISO 26262 & Quyền riêng tư Trẻ em (COPPA).
