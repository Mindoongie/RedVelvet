import React from 'react';
import { Navigation, AlertTriangle, ShieldCheck } from 'lucide-react';
import { 
  checkDeviationFromRoute, 
  calculateRemainingDistance, 
  calculateEtaSimple, 
  SimpleMovingAverageFilter 
} from '../utils/mapTracking';

// Goong Maps Key References (Merged from lanh branch)
export const GOONG_MAP_TILES_KEY = 'Glr05IWv5eqyowXAYE5mphqFZMgcCpXwBxiLS201';
export const GOONG_MAP_API_KEY = '0DoQ7tLprstpmuviK5YIGkT4k5mFF5PsofQLHYbW';

export default function LiveMapSimulator({ isDeviated, speed = 42, eta: fallbackEta = '12 phút' }) {
  const [busProgress, setBusProgress] = React.useState(35); // % along route
  const [goongError, setGoongError] = React.useState(false);
  
  const filterRef = React.useRef(new SimpleMovingAverageFilter(3));
  const mapContainerRef = React.useRef(null);
  const mapRef = React.useRef(null);
  const busMarkerRef = React.useRef(null);

  // Auto move bus back and forth slightly to simulate live GPS motion
  React.useEffect(() => {
    const interval = setInterval(() => {
      setBusProgress(prev => (prev >= 90 ? 10 : prev + 0.5));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Map coordinates (Percentages for SVG, plus real HCMC GPS values)
  const svgWaypoints = [
    { id: 1, name: 'Trạm 1: Vinhomes', x: 80, y: 320, lat: 10.7938, lon: 106.7218, status: 'completed' },
    { id: 2, name: 'Trạm 2: Pearl Plaza', x: 260, y: 220, lat: 10.7997, lon: 106.7118, status: 'completed' },
    { id: 3, name: 'Trạm 3: Masteri An Phú', x: 480, y: 150, lat: 10.8015, lon: 106.7388, status: 'current' },
    { id: 4, name: 'Trạm 4: Trường Nguyễn Du', x: 720, y: 80, lat: 10.7766, lon: 106.6953, status: 'upcoming' },
  ];

  // Interpolate bus coordinates (X, Y and GPS lat, lon) based on progress
  let segIdx = 0;
  let t = 0;
  if (busProgress < 33) {
    segIdx = 0;
    t = busProgress / 33;
  } else if (busProgress < 66) {
    segIdx = 1;
    t = (busProgress - 33) / 33;
  } else {
    segIdx = 2;
    t = (busProgress - 66) / 34;
  }
  t = Math.max(0, Math.min(1, t));

  const startWp = svgWaypoints[segIdx];
  const endWp = svgWaypoints[segIdx + 1];

  let rawBusX = startWp.x + t * (endWp.x - startWp.x);
  let rawBusY = startWp.y + t * (endWp.y - startWp.y);
  let rawBusLat = startWp.lat + t * (endWp.lat - startWp.lat);
  let rawBusLon = startWp.lon + t * (endWp.lon - startWp.lon);

  // Apply route deviation offset if active
  if (isDeviated) {
    rawBusLat += 0.0025; // Shift GPS coordinates north
    rawBusLon += 0.0015; // Shift GPS coordinates east
    rawBusY += 65;
    rawBusX += 20;
  }

  // Smooth raw coordinates through the Moving Average Filter
  const [smoothedLat, smoothedLon] = React.useMemo(() => {
    return filterRef.current.process(rawBusLat, rawBusLon);
  }, [rawBusLat, rawBusLon]);

  // Compute Deviation using the Haversine Point-to-Segment algorithm
  const gpsWaypoints = svgWaypoints.map(wp => [wp.lat, wp.lon]);
  const deviationInfo = React.useMemo(() => {
    return checkDeviationFromRoute(smoothedLat, smoothedLon, gpsWaypoints, 100.0);
  }, [smoothedLat, smoothedLon]);

  // Compute remaining distance & dynamic ETA
  const remainingDistance = React.useMemo(() => {
    return calculateRemainingDistance(smoothedLat, smoothedLon, gpsWaypoints, deviationInfo.nearestIdx);
  }, [smoothedLat, smoothedLon, deviationInfo.nearestIdx]);

  const calculatedEta = React.useMemo(() => {
    const etaMin = calculateEtaSimple(remainingDistance, speed);
    return etaMin > 0 ? `${etaMin.toFixed(1)} phút` : fallbackEta;
  }, [remainingDistance, speed, fallbackEta]);

  // Initialize Goong Map
  React.useEffect(() => {
    if (!window.goongjs) {
      setGoongError(true);
      return;
    }

    let map = null;
    try {
      window.goongjs.accessToken = GOONG_MAP_TILES_KEY;

      map = new window.goongjs.Map({
        container: mapContainerRef.current,
        style: `https://tiles.goong.io/assets/goong_map_web.json?api_key=${GOONG_MAP_TILES_KEY}`,
        center: [106.7218, 10.7938],
        zoom: 13.5
      });

      mapRef.current = map;

      map.on('load', () => {
        // Draw route line
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: svgWaypoints.map(wp => [wp.lon, wp.lat])
            }
          }
        });

        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#1d4ed8',
            'line-width': 5,
            'line-opacity': 0.8
          }
        });

        // Station pins
        svgWaypoints.forEach(wp => {
          const el = document.createElement('div');
          el.style.width = '14px';
          el.style.height = '14px';
          el.style.borderRadius = '50%';
          el.style.backgroundColor = wp.status === 'completed' ? 'var(--emerald-safe)' : wp.status === 'current' ? 'var(--accent-cyan)' : '#64748b';
          el.style.border = '2px solid white';
          el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

          new window.goongjs.Marker(el)
            .setLngLat([wp.lon, wp.lat])
            .addTo(map);
        });

        // Bus marker
        const busEl = document.createElement('div');
        busEl.style.width = '34px';
        busEl.style.height = '34px';
        busEl.style.backgroundImage = 'url(https://cdn-icons-png.flaticon.com/512/3448/3448339.png)';
        busEl.style.backgroundSize = 'cover';
        busEl.style.borderRadius = '6px';
        busEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';

        const marker = new window.goongjs.Marker(busEl)
          .setLngLat([rawBusLon, rawBusLat])
          .addTo(map);

        busMarkerRef.current = marker;
      });
    } catch (err) {
      console.error('Failed to init Goong Map:', err);
      setGoongError(true);
    }

    return () => {
      if (map) {
        map.remove();
      }
      mapRef.current = null;
    };
  }, []);

  // Sync bus marker on map with simulated GPS position
  React.useEffect(() => {
    if (busMarkerRef.current) {
      busMarkerRef.current.setLngLat([smoothedLon, smoothedLat]);
    }
  }, [smoothedLat, smoothedLon]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '340px', background: '#f1f5f9', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
      {/* Map Header Overlay */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div className="badge-ai" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', padding: '6px 12px' }}>
          <Navigation size={14} color="var(--accent-cyan)" />
          <span>Lõi Bustracker & Haversine GPS</span>
        </div>
        
        {deviationInfo.isDeviated ? (
          <div className="badge-danger" style={{ background: 'var(--danger-red)', color: '#ffffff', padding: '6px 12px' }}>
            <AlertTriangle size={14} /> CẢNH BÁO LỆCH LỘ TRÌNH (&gt; 100m)
          </div>
        ) : (
          <div className="badge-safe" style={{ background: 'var(--emerald-safe)', color: '#ffffff', padding: '6px 12px' }}>
            <ShieldCheck size={14} /> Đúng Tuyến Lộ Trình
          </div>
        )}
      </div>

      {/* Map Metrics Floating Widget */}
      <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 10, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-card)', padding: '10px 14px', borderRadius: '10px', display: 'flex', gap: '16px', fontSize: '0.75rem' }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Vận tốc:</span>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 700, marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>{speed} km/h</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Dự kiến ETA:</span>
          <span style={{ color: 'var(--emerald-safe)', fontWeight: 700, marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>{calculatedEta}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Sai số Haversine:</span>
          <span style={{ color: deviationInfo.isDeviated ? 'var(--danger-red)' : 'var(--emerald-safe)', fontWeight: 700, marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>
            {deviationInfo.distance.toFixed(1)}m {deviationInfo.isDeviated ? '(Vượt ngưỡng)' : ''}
          </span>
        </div>
      </div>

      {/* Map Rendering Container */}
      {!goongError && window.goongjs ? (
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '340px' }} />
      ) : (
        /* Fallback Vector SVG Map */
        <svg viewBox="0 0 800 400" style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
            </pattern>
            <filter id="glow-route" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-bus" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <rect width="800" height="400" fill="url(#grid)" />

          <path d="M 0 100 Q 200 120 400 90 T 800 130" fill="none" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="4" />
          <path d="M 120 0 Q 150 200 200 400" fill="none" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="4" />
          <path d="M 500 0 L 520 400" fill="none" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="4" />

          {/* Main Standard Route Polyline */}
          <path 
            d="M 80 320 L 260 220 L 480 150 L 720 80" 
            fill="none" 
            stroke={deviationInfo.isDeviated ? "rgba(185, 28, 28, 0.3)" : "rgba(6, 182, 212, 0.8)"} 
            strokeWidth="6" 
            strokeDasharray="8 4"
            filter="url(#glow-route)"
          />

          {/* If Deviated: Render Haversine perpendicular vector projection line */}
          {deviationInfo.isDeviated && (
            <g>
              <line 
                x1={rawBusX - 20} y1={rawBusY - 65} 
                x2={rawBusX} y2={rawBusY} 
                stroke="var(--danger-red)" strokeWidth="2" strokeDasharray="4 4" 
              />
              <text x={(rawBusX + rawBusX - 20)/2 + 10} y={(rawBusY + rawBusY - 65)/2} fill="var(--danger-red)" fontSize="12" fontWeight="700" fontFamily="var(--font-mono)">
                Vector Lệch {deviationInfo.distance.toFixed(0)}m
              </text>
            </g>
          )}

          {/* Waypoint Markers */}
          {svgWaypoints.map((wp) => (
            <g key={wp.id} transform={`translate(${wp.x}, ${wp.y})`}>
              <circle r="16" fill={wp.status === 'completed' ? 'rgba(4, 120, 87, 0.2)' : wp.status === 'current' ? 'rgba(8, 145, 178, 0.3)' : 'rgba(148, 163, 184, 0.1)'} />
              <circle r="8" fill={wp.status === 'completed' ? 'var(--emerald-safe)' : wp.status === 'current' ? 'var(--accent-cyan)' : '#64748b'} />
              <rect x="-60" y="-38" width="120" height="22" rx="4" fill="rgba(255, 255, 255, 0.95)" stroke="var(--border-card)" strokeWidth="1" />
              <text x="0" y="-23" textAnchor="middle" fill="var(--text-main)" fontSize="10" fontWeight="600">
                {wp.name}
              </text>
            </g>
          ))}

          {/* Animated Bus Icon */}
          <g transform={`translate(${rawBusX}, ${rawBusY})`} filter="url(#glow-bus)">
            <circle r="22" fill={deviationInfo.isDeviated ? "rgba(185, 28, 28, 0.3)" : "rgba(180, 83, 9, 0.3)"}>
              <animate attributeName="r" values="18;26;18" dur="2s" repeatCount="indefinite" />
            </circle>
            <rect x="-18" y="-14" width="36" height="28" rx="6" fill={deviationInfo.isDeviated ? "var(--danger-red)" : "var(--accent-bus)"} stroke="var(--bg-card)" strokeWidth="2" />
            <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">
              BUS 01
            </text>
          </g>
        </svg>
      )}
    </div>
  );
}
