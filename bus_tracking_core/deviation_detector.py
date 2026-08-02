import time
from typing import List, Tuple, Dict, Any
from .geo_utils import check_deviation_from_route

class DeviationDetector:
    """
    Quản lý trạng thái và phát hiện lệch tuyến.
    Bao gồm cơ chế chống báo động giả (cần N lần lệch liên tiếp) và chống spam (thời gian cooldown).
    """
    def __init__(self, threshold_m: float = 100.0, consecutive_required: int = 3, cooldown_seconds: float = 60.0):
        self.threshold_m = threshold_m                   # Ngưỡng lệch (mét)
        self.consecutive_required = consecutive_required # Số lần lệch liên tiếp cần thiết để báo động
        self.cooldown_seconds = cooldown_seconds         # Thời gian chờ giữa 2 lần báo động (giây)
        
        self.consecutive_deviations = 0                  # Biến đếm số lần lệch liên tiếp
        self.last_alert_time = 0.0                       # Thời điểm gửi báo động cuối cùng

    def process_gps_ping(self, bus_lat: float, bus_lon: float, waypoints: List[Tuple[float, float]], current_time: float = None) -> Dict[str, Any]:
        """
        Xử lý 1 tọa độ GPS mới gửi lên.
        Trả về kết quả chi tiết để hệ thống quyết định có kích hoạt Alarm hay không.
        """
        if current_time is None:
            current_time = time.time()
            
        # Dùng hàm toán học từ geo_utils
        is_deviated, min_dist, nearest_idx = check_deviation_from_route(
            bus_lat, bus_lon, waypoints, self.threshold_m
        )

        result = {
            "is_deviated": is_deviated,
            "distance_m": min_dist,
            "nearest_segment": nearest_idx,
            "should_alert": False,
            "reason": ""
        }

        if is_deviated:
            self.consecutive_deviations += 1
            # Nếu đủ số lần lệch liên tiếp
            if self.consecutive_deviations >= self.consecutive_required:
                # Kiểm tra xem đã hết thời gian cooldown chưa
                if (current_time - self.last_alert_time) >= self.cooldown_seconds:
                    result["should_alert"] = True
                    result["reason"] = f"Lệch {self.consecutive_deviations} lần liên tiếp. Khoảng cách: {min_dist:.1f}m"
                    self.last_alert_time = current_time # Cập nhật thời điểm báo động
                else:
                    result["reason"] = "Đang trong thời gian cooldown chống spam."
            else:
                result["reason"] = f"Mới lệch {self.consecutive_deviations}/{self.consecutive_required} lần."
        else:
            # Nếu xe quay lại đúng tuyến, reset biến đếm
            self.consecutive_deviations = 0
            result["reason"] = "Xe đi đúng tuyến."

        return result

    def reset(self):
        """Khôi phục trạng thái ban đầu."""
        self.consecutive_deviations = 0
        self.last_alert_time = 0.0
