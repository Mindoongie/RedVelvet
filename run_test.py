import time
from bus_tracking_core.goong_map_api import GoongMapAPI
from bus_tracking_core.deviation_detector import DeviationDetector
from bus_tracking_core.gps_filter import SimpleMovingAverageFilter
from bus_tracking_core.eta_calculator import calculate_remaining_distance, calculate_eta_simple

# 1. SETUP THÔNG SỐ
API_KEY = "0DoQ7tLprstpmuviK5YIGkT4k5mFF5PsofQLHYbW"  # <-- KEY Goong Maps của bạn
origin = (21.0285, 105.8542)         # Hồ Gươm, Hà Nội
destination = (21.0031, 105.8456)    # Đại học Bách Khoa Hà Nội

def run_simulation():
    print("--- BẮT ĐẦU TEST MODULE BUS TRACKING ---\n")

    # 2. LẤY TUYẾN ĐƯỜNG TỪ GOONG MAPS
    print("1. Gọi Goong API lấy tuyến đường...")
    goong = GoongMapAPI(API_KEY)
    
    # (Nếu chưa có Key, ta dùng tuyến đường giả lập để code vẫn chạy được)
    waypoints = [
        (21.02850, 105.85420),
        (21.02500, 105.85100),
        (21.01800, 105.84800),
        (21.00310, 105.84560)
    ]
    
    if API_KEY != "YOUR_GOONG_API_KEY_HERE":
        data = goong.get_directions(origin[0], origin[1], destination[0], destination[1])
        real_waypoints = goong.extract_waypoints_from_directions(data)
        if real_waypoints:
            waypoints = real_waypoints
            print(f"   -> Đã lấy thành công {len(waypoints)} điểm lộ trình từ Goong Maps.")
    else:
        print("   -> Chưa có API KEY, sử dụng tuyến đường giả định (Mock Data).")

    # 3. KHỞI TẠO CÁC MODULE THUẬT TOÁN
    print("\n2. Khởi tạo thuật toán Lọc nhiễu và Cảnh báo lệch tuyến...")
    noise_filter = SimpleMovingAverageFilter(window_size=3)
    # Ngưỡng lệch 100m, cần 3 lần liên tiếp, cooldown 10 giây cho dễ test
    detector = DeviationDetector(threshold_m=100.0, consecutive_required=3, cooldown_seconds=10.0)

    # 4. GIẢ LẬP DỮ LIỆU GPS TỪ XE BUS (Bị nhiễu và đi chệch)
    mock_gps_stream = [
        {"lat": 21.02850, "lon": 105.85420, "speed": 30}, # Đúng tuyến
        {"lat": 21.02505, "lon": 105.85105, "speed": 35}, # Hơi nhiễu 1 tí (vẫn tính là đúng tuyến)
        {"lat": 21.02500, "lon": 105.86000, "speed": 40}, # Bắt đầu chệch xa (Lần 1)
        {"lat": 21.02550, "lon": 105.86100, "speed": 40}, # Vẫn chệch (Lần 2)
        {"lat": 21.02600, "lon": 105.86200, "speed": 40}, # Vẫn chệch (Lần 3 -> Phải báo động!)
        {"lat": 21.01800, "lon": 105.84800, "speed": 30}, # Vòng về đúng tuyến
    ]

    print("\n3. Bắt đầu giả lập nhận tín hiệu GPS realtime:")
    for i, ping in enumerate(mock_gps_stream):
        print(f"\n--- Nhận Ping #{i+1} ---")
        
        # Bước A: Lọc nhiễu tọa độ
        smooth_lat, smooth_lon = noise_filter.process(ping['lat'], ping['lon'])
        print(f"Tọa độ gốc: {ping['lat']:.5f}, {ping['lon']:.5f} | Đã lọc: {smooth_lat:.5f}, {smooth_lon:.5f}")

        # Bước B: Cập nhật độ lệch tuyến
        status = detector.process_gps_ping(smooth_lat, smooth_lon, waypoints)
        print(f"Cách tuyến đường: {status['distance_m']:.1f}m. Trạng thái: {status['reason']}")
        if status['should_alert']:
            print("🚨 ALARM: TÀI XẾ ĐÃ ĐI SAI TUYẾN QUÁ MỨC CHO PHÉP !!!")
            
        # Bước C: Tính khoảng cách còn lại & ETA (thời gian đến)
        # Giả sử xe đã đi qua các waypoint trước đó, lấy từ segment gần nhất
        nearest_idx = status['nearest_segment']
        rem_dist = calculate_remaining_distance(smooth_lat, smooth_lon, waypoints, nearest_idx)
        eta_minutes = calculate_eta_simple(rem_dist, ping['speed'])
        
        print(f"Còn lại: {rem_dist:.1f}m. Thời gian đến dự kiến (ETA): {eta_minutes:.1f} phút.")
        
        time.sleep(1) # Chờ 1 giây giả lập thời gian thực

if __name__ == "__main__":
    run_simulation()
