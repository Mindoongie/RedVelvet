import time
import json
from bus_tracking_core.goong_map_api import GoongMapAPI
from bus_tracking_core.deviation_detector import DeviationDetector
from bus_tracking_core.gps_filter import SimpleMovingAverageFilter
from bus_tracking_core.eta_calculator import calculate_remaining_distance, calculate_eta_simple

# 1. SETUP THÔNG SỐ
API_KEY = "0DoQ7tLprstpmuviK5YIGkT4k5mFF5PsofQLHYbW"  # <-- KEY Goong Maps của bạn
origin = (21.02881, 105.85417)       # 17 Trần Nguyên Hãn
destination = (21.00313, 105.8457)   # Tạ Quang Bửu, Bách Khoa

def run_backend_logic_for_scenario(waypoints, gps_stream):
    """
    Hàm này chạy lõi Backend (Lọc nhiễu -> Phát hiện lệch -> Tính ETA)
    Trả về mảng kết quả để truyền cho Frontend.
    """
    noise_filter = SimpleMovingAverageFilter(window_size=3)
    detector = DeviationDetector(threshold_m=100.0, consecutive_required=3, cooldown_seconds=10.0)
    
    results = []
    for ping in gps_stream:
        # Lọc nhiễu
        s_lat, s_lon = noise_filter.process(ping['lat'], ping['lon'])
        
        # Check chệch
        status = detector.process_gps_ping(s_lat, s_lon, waypoints)
        
        # Tính ETA
        rem_dist = calculate_remaining_distance(s_lat, s_lon, waypoints, status['nearest_segment'])
        eta_min = calculate_eta_simple(rem_dist, ping['speed'])
        
        # Format text hiển thị
        if status['should_alert']:
            ui_status = "🚨 ALARM: ĐÃ LỆCH TUYẾN"
            alert = True
        elif status['is_deviated']:
            ui_status = status['reason'] # Sẽ hiện "Mới lệch 1/3 lần..."
            alert = False
        else:
            ui_status = "Xe đi đúng tuyến"
            alert = False
            
        results.append({
            "lat": s_lat,
            "lon": s_lon,
            "eta": f"{eta_min:.1f} phút",
            "status": ui_status,
            "alert": alert
        })
    return results

def generate_html(waypoints, scenario_correct, scenario_deviate):
    """
    Tạo file HTML với dữ liệu bản đồ chính xác 100% từ Goong API và hình nền Goong Maps
    """
    # Goong JS yêu cầu định dạng [lng, lat], nhưng backend đang dùng [lat, lng]
    # Nên ta cần map lại cho Frontend
    waypoints_lng_lat = [[p[1], p[0]] for p in waypoints]
    
    html_template = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Demo Bản Đồ - Bus Tracking Tích hợp thật (Goong Maps)</title>
    <!-- Thư viện Goong JS -->
    <script src='https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.js'></script>
    <link href='https://cdn.jsdelivr.net/npm/@goongmaps/goong-js@1.0.9/dist/goong-js.css' rel='stylesheet' />
    <style>
        body {{ margin: 0; padding: 0; font-family: Arial, sans-serif; }}
        #map {{ height: 100vh; width: 100%; }}
        #info-panel {{
            position: absolute; top: 20px; left: 50px; z-index: 1000;
            background: rgba(255, 255, 255, 0.95); padding: 20px;
            border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); width: 300px;
        }}
        .warning {{ color: #d9534f; font-weight: bold; }}
        .success {{ color: #5cb85c; font-weight: bold; }}
        .btn {{ padding: 10px; width: 100%; color: white; border: none; border-radius: 5px; cursor: pointer; margin-bottom: 10px; font-weight: bold;}}
        .btn-green {{ background: #28a745; }}
        .btn-red {{ background: #dc3545; }}
    </style>
</head>
<body>
    <div id="info-panel">
        <h2>Hệ thống Tracking</h2>
        <button class="btn btn-green" onclick="startSimulation('correct')">▶ Chạy Test ĐÚNG TUYẾN</button>
        <button class="btn btn-red" onclick="startSimulation('deviate')">▶ Chạy Test LỆCH HƯỚNG</button>
        <hr>
        <p><strong>Trạng thái:</strong> <span id="status" class="success">Chưa chạy</span></p>
        <p><strong>ETA:</strong> <span id="eta">---</span></p>
    </div>
    <div id="map"></div>

    <script>
        goongjs.accessToken = 'cdRcfn7LsObuzzllZr6W'; // MapTiles Key của bạn
        
        var waypoints = {json.dumps(waypoints_lng_lat)};
        
        var map = new goongjs.Map({{
            container: 'map',
            style: 'https://tiles.goong.io/assets/goong_map_web.json',
            center: waypoints[0], // [lng, lat]
            zoom: 15
        }});

        var busMarker = null;
        var popup = new goongjs.Popup({{ offset: 25, closeButton: false }}).setText('CẢNH BÁO: Xe đi sai tuyến quá mức!');

        map.on('load', function () {{
            // Vẽ đường đi
            map.addSource('route', {{
                'type': 'geojson',
                'data': {{
                    'type': 'Feature',
                    'properties': {{}},
                    'geometry': {{
                        'type': 'LineString',
                        'coordinates': waypoints
                    }}
                }}
            }});
            
            map.addLayer({{
                'id': 'route',
                'type': 'line',
                'source': 'route',
                'layout': {{
                    'line-join': 'round',
                    'line-cap': 'round'
                }},
                'paint': {{
                    'line-color': '#007bff',
                    'line-width': 6,
                    'line-opacity': 0.7
                }}
            }});

            // Tạo icon xe bus
            var el = document.createElement('div');
            el.style.backgroundImage = 'url(https://cdn-icons-png.flaticon.com/512/3448/3448339.png)';
            el.style.width = '40px';
            el.style.height = '40px';
            el.style.backgroundSize = '100%';
            
            busMarker = new goongjs.Marker(el)
                .setLngLat(waypoints[0])
                .addTo(map);
        }});

        // Data sinh ra từ Backend Python
        var data_correct = {json.dumps(scenario_correct)};
        var data_deviate = {json.dumps(scenario_deviate)};
        
        let timeoutId = null;

        function runStep(dataArray, step) {{
            if (step >= dataArray.length) {{
                alert("Đã chạy xong kịch bản!");
                return;
            }}
            var data = dataArray[step];
            
            // Goong dùng Lng, Lat (ngược với hệ truyền thống)
            var currentPos = [data.lon, data.lat];
            busMarker.setLngLat(currentPos);
            map.panTo(currentPos);
            
            document.getElementById('eta').innerText = data.eta;
            var statusEl = document.getElementById('status');
            statusEl.innerText = data.status;
            
            if (data.alert) {{
                statusEl.className = 'warning';
                if (!popup.isOpen()) {{
                    busMarker.setPopup(popup);
                    busMarker.togglePopup();
                }}
            }} else if (data.status.includes("Mới lệch")) {{
                statusEl.className = 'warning';
                if (popup.isOpen()) busMarker.togglePopup();
            }} else {{
                statusEl.className = 'success';
                if (popup.isOpen()) busMarker.togglePopup();
            }}

            timeoutId = setTimeout(function() {{ runStep(dataArray, step + 1); }}, 1000);
        }}

        function startSimulation(type) {{
            if (!busMarker) {{ alert("Bản đồ đang tải, chờ chút!"); return; }}
            if(timeoutId) clearTimeout(timeoutId);
            
            // Tắt popup nếu đang mở
            if (popup.isOpen()) busMarker.togglePopup();
            
            if(type === 'correct') {{
                runStep(data_correct, 0);
            }} else {{
                runStep(data_deviate, 0);
            }}
        }}
    </script>
</body>
</html>"""
    with open("demo_map.html", "w", encoding="utf-8") as f:
        f.write(html_template)
    print("Đã tạo thành công file demo_map.html mới nhất với bản đồ Goong!")

def main():
    print("1. Gọi Goong API lấy lộ trình thực tế...")
    goong = GoongMapAPI(API_KEY)
    data = goong.get_directions(origin[0], origin[1], destination[0], destination[1])
    waypoints = goong.extract_waypoints_from_directions(data)
    
    if not waypoints:
        print("Lỗi lấy lộ trình")
        return
        
    print(f"Lấy thành công {len(waypoints)} điểm đường phố chính xác.")

    # TRƯỜNG HỢP 1: XE ĐI ĐÚNG TUYẾN
    # Xe sẽ bám sát toàn bộ các điểm của lộ trình từ đầu đến cuối
    mock_correct_stream = []
    for i in range(len(waypoints)):
        mock_correct_stream.append({
            "lat": waypoints[i][0] + 0.00005, # Cộng xíu nhiễu GPS (nhưng thuật toán sẽ lọc)
            "lon": waypoints[i][1] - 0.00005,
            "speed": 35 # 35 km/h
        })

    # TRƯỜNG HỢP 2: XE ĐI CHỆCH HƯỚNG
    # 3 điểm đầu đi đúng, từ điểm thứ 4 rẽ ngang sang phố khác
    mock_deviate_stream = [
        {"lat": waypoints[0][0], "lon": waypoints[0][1], "speed": 30},
        {"lat": waypoints[1][0], "lon": waypoints[1][1], "speed": 30},
        {"lat": waypoints[2][0], "lon": waypoints[2][1], "speed": 30},
        # Bắt đầu rẽ ngang xa dần lộ trình
        {"lat": waypoints[2][0] + 0.0010, "lon": waypoints[2][1] + 0.0010, "speed": 40}, # Cách 100m
        {"lat": waypoints[2][0] + 0.0020, "lon": waypoints[2][1] + 0.0020, "speed": 40}, # Cách 200m
        {"lat": waypoints[2][0] + 0.0030, "lon": waypoints[2][1] + 0.0030, "speed": 40}, # Cách 300m (Báo động!)
        {"lat": waypoints[2][0] + 0.0040, "lon": waypoints[2][1] + 0.0040, "speed": 40},
    ]

    print("2. Chạy Backend xử lý Thuật toán...")
    res_correct = run_backend_logic_for_scenario(waypoints, mock_correct_stream)
    res_deviate = run_backend_logic_for_scenario(waypoints, mock_deviate_stream)

    print("3. Xuất file giao diện Frontend (demo_map.html)...")
    generate_html(waypoints, res_correct, res_deviate)

if __name__ == "__main__":
    main()
