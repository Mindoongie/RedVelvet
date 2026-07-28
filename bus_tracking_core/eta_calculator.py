from typing import List, Tuple
from .geo_utils import haversine

def calculate_remaining_distance(current_lat: float, current_lon: float, waypoints: List[Tuple[float, float]], nearest_segment_idx: int) -> float:
    """
    Tính khoảng cách còn lại (mét) từ vị trí hiện tại đến cuối tuyến đường.
    """
    if not waypoints or nearest_segment_idx >= len(waypoints) - 1:
        return 0.0

    # 1. Tính khoảng cách từ điểm hiện tại đến điểm cuối của đoạn hiện tại
    b_lat, b_lon = waypoints[nearest_segment_idx + 1]
    remaining_dist = haversine(current_lat, current_lon, b_lat, b_lon)

    # 2. Cộng thêm chiều dài của các đoạn đường còn lại trên tuyến
    for i in range(nearest_segment_idx + 1, len(waypoints) - 1):
        lat1, lon1 = waypoints[i]
        lat2, lon2 = waypoints[i+1]
        remaining_dist += haversine(lat1, lon1, lat2, lon2)

    return remaining_dist

def calculate_eta_simple(remaining_distance_m: float, current_speed_kmh: float) -> float:
    """
    Tính toán ETA (Estimated Time of Arrival) đơn giản nhất.
    Trả về thời gian dự kiến (tính bằng phút).
    Nếu xe đang dừng (tốc độ = 0), trả về -1 (không thể tính toán).
    """
    if current_speed_kmh <= 0:
        return -1.0
        
    # Chuyển tốc độ từ km/h sang m/s
    speed_ms = current_speed_kmh * (1000.0 / 3600.0)
    
    # Tính thời gian (giây) rồi đổi ra phút
    time_seconds = remaining_distance_m / speed_ms
    return time_seconds / 60.0

def calculate_eta_weighted(remaining_distance_m: float, current_speed_kmh: float, historical_avg_speed_kmh: float, alpha: float = 0.7) -> float:
    """
    Tính ETA có kết hợp (blend) giữa vận tốc hiện tại và vận tốc trung bình lịch sử.
    alpha = 0.7 nghĩa là tin tưởng vận tốc hiện tại 70%, lịch sử 30%.
    """
    blended_speed_kmh = (alpha * current_speed_kmh) + ((1 - alpha) * historical_avg_speed_kmh)
    return calculate_eta_simple(remaining_distance_m, blended_speed_kmh)
