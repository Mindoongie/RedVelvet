from collections import deque
from typing import Tuple

class SimpleMovingAverageFilter:
    """
    Bộ lọc nhiễu GPS đơn giản (Moving Average).
    Giúp làm mượt các điểm tọa độ bị nhảy do sai số thiết bị (nhiễu 5-20m).
    """
    def __init__(self, window_size: int = 5):
        self.window_size = window_size
        self._lats = deque(maxlen=window_size)
        self._lons = deque(maxlen=window_size)

    def process(self, lat: float, lon: float) -> Tuple[float, float]:
        """
        Thêm tọa độ mới vào bộ lọc và trả về tọa độ đã được làm mượt.
        """
        self._lats.append(lat)
        self._lons.append(lon)
        
        avg_lat = sum(self._lats) / len(self._lats)
        avg_lon = sum(self._lons) / len(self._lons)
        
        return avg_lat, avg_lon

class SpeedFilter:
    """
    Lọc các điểm GPS bị lỗi văng xa (teleportation) dựa trên vận tốc phi lý.
    """
    def __init__(self, max_speed_kmh: float = 120.0):
        self.max_speed_kmh = max_speed_kmh

    def is_valid_ping(self, speed_kmh: float) -> bool:
        """Kiểm tra xem dữ liệu vận tốc có hợp lý với xe bus không"""
        return 0 <= speed_kmh <= self.max_speed_kmh
