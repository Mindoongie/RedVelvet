import urllib.request
import urllib.parse
import json
from typing import List, Tuple, Dict, Any

class GoongMapAPI:
    """
    Class xử lý các tương tác với Goong Maps API
    Tài liệu: https://docs.goong.io/
    """
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://rsapi.goong.io"

    def get_directions(self, origin_lat: float, origin_lon: float, dest_lat: float, dest_lon: float) -> Dict[str, Any]:
        """
        Lấy lộ trình đường đi giữa 2 điểm.
        """
        origin = f"{origin_lat},{origin_lon}"
        destination = f"{dest_lat},{dest_lon}"
        
        url = f"{self.base_url}/Direction?origin={origin}&destination={destination}&vehicle=car&api_key={self.api_key}"
        
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                return data
        except Exception as e:
            print(f"Lỗi khi gọi Goong API: {e}")
            return {}

    def extract_waypoints_from_directions(self, directions_data: dict) -> List[Tuple[float, float]]:
        """
        Bóc tách tập hợp các điểm (lat, lon) tạo thành tuyến đường từ dữ liệu API trả về.
        """
        waypoints = []
        if not directions_data or "routes" not in directions_data or len(directions_data["routes"]) == 0:
            return waypoints

        route = directions_data["routes"][0]
        for leg in route.get("legs", []):
            for step in leg.get("steps", []):
                # Goong trả về điểm bắt đầu của từng step
                start_loc = step.get("start_location", {})
                if "lat" in start_loc and "lng" in start_loc:
                    waypoints.append((start_loc["lat"], start_loc["lng"]))
                
                # Điểm kết thúc
                end_loc = step.get("end_location", {})
                if "lat" in end_loc and "lng" in end_loc:
                    waypoints.append((end_loc["lat"], end_loc["lng"]))
                    
        return waypoints
