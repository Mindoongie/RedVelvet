import math
from typing import Tuple, List

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Tính khoảng cách giữa hai điểm (lat, lon) trên mặt cầu Trái Đất.
    Kết quả trả về theo đơn vị mét (m).
    """
    R = 6371000.0  # Bán kính Trái Đất (mét)
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return R * c


def point_to_segment_distance(p_lat: float, p_lon: float, a_lat: float, a_lon: float, b_lat: float, b_lon: float) -> float:
    """
    Tính khoảng cách ngắn nhất từ điểm P(bus) đến đoạn thẳng AB (đoạn đường giữa 2 waypoint).
    Sử dụng phép chiếu Cartesian cục bộ (1 độ ~ 111,320 mét) để tính toán nhanh và đủ chính xác cho khoảng cách ngắn.
    Kết quả trả về theo đơn vị mét (m).
    """
    METERS_PER_DEG = 111320.0

    # Chuyển đổi tọa độ GPS sang mét tương đối so với trục
    px = p_lon * METERS_PER_DEG * math.cos(math.radians(p_lat))
    py = p_lat * METERS_PER_DEG
    ax = a_lon * METERS_PER_DEG * math.cos(math.radians(a_lat))
    ay = a_lat * METERS_PER_DEG
    bx = b_lon * METERS_PER_DEG * math.cos(math.radians(b_lat))
    by = b_lat * METERS_PER_DEG

    abx = bx - ax
    aby = by - ay
    apx = px - ax
    apy = py - ay

    ab_squared = abx**2 + aby**2
    if ab_squared == 0:
        return math.sqrt(apx**2 + apy**2)

    # Tính hình chiếu của P lên đường thẳng AB
    t = (apx * abx + apy * aby) / ab_squared
    # Giới hạn t trong đoạn [0, 1] để điểm chiếu nằm trên đoạn thẳng AB
    t = max(0.0, min(1.0, t))

    proj_x = ax + t * abx
    proj_y = ay + t * aby

    dist = math.sqrt((px - proj_x)**2 + (py - proj_y)**2)
    return dist


def check_deviation_from_route(bus_lat: float, bus_lon: float, waypoints: List[Tuple[float, float]], threshold_m: float = 100.0) -> Tuple[bool, float, int]:
    """
    Tính khoảng cách từ xe bus đến tuyến đường (tập hợp các đoạn thẳng).
    Trả về: (Có lệch tuyến hay không, Khoảng cách lệch nhỏ nhất, Chỉ số đoạn đường gần nhất)
    """
    if len(waypoints) < 2:
        return False, 0.0, 0

    min_dist = float('inf')
    nearest_idx = 0

    # Duyệt qua từng đoạn thẳng tạo bởi 2 điểm waypoint liền kề
    for i in range(len(waypoints) - 1):
        a_lat, a_lon = waypoints[i]
        b_lat, b_lon = waypoints[i+1]
        
        dist = point_to_segment_distance(bus_lat, bus_lon, a_lat, a_lon, b_lat, b_lon)
        if dist < min_dist:
            min_dist = dist
            nearest_idx = i

    is_deviated = min_dist > threshold_m
    return is_deviated, min_dist, nearest_idx
