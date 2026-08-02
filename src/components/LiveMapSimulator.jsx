import React from 'react';
import { MapPin, Navigation, Bus, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LiveMapSimulator({ isDeviated, speed = 42, eta = '12 phút' }) {
  const [busProgress, setBusProgress] = React.useState(35); // % along route

  // Auto move bus back and forth slightly to simulate live GPS motion
  React.useEffect(() => {
    const interval = setInterval(() => {
      setBusProgress(prev => (prev >= 90 ? 10 : prev + 0.5));
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Map coordinates (percentages for SVG viewBox 0 0 800 400)
  const waypoints = [
    { id: 1, name: 'Trạm 1: Vinhomes', x: 80, y: 320, students: 5, status: 'completed' },
    { id: 2, name: 'Trạm 2: Pearl Plaza', x: 260, y: 220, students: 4, status: 'completed' },
    { id: 3, name: 'Trạm 3: Masteri An Phú', x: 480, y: 150, students: 6, status: 'current' },
    { id: 4, name: 'Trạm 4: Trường Nguyễn Du', x: 720, y: 80, students: 0, status: 'upcoming' },
  ];

  // Calculate bus SVG position
  // Segment interpolation
  let busX = 260 + (busProgress / 100) * 460;
  let busY = 220 - (busProgress / 100) * 140;

  if (isDeviated) {
    // Offset bus off route to demonstrate Haversine Route Deviation alert
    busY += 65;
    busX += 20;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '340px', background: '#f1f5f9', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border-card)' }}>
      {/* Map Header Overlay */}
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10, display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div className="badge-ai" style={{ background: 'rgba(255, 255, 255, 0.85)', backdropFilter: 'blur(8px)', padding: '6px 12px' }}>
          <Navigation size={14} color="var(--accent-cyan)" />
          <span>Lõi Bustracker & Haversine GPS</span>
        </div>
        
        {isDeviated ? (
          <div className="badge-danger" style={{ background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '6px 12px' }}>
            <AlertTriangle size={14} /> CẢNH BÁO LỆCH LỘ TRÌNH (&gt; 150m)
          </div>
        ) : (
          <div className="badge-safe" style={{ background: 'rgba(16, 185, 129, 0.85)', padding: '6px 12px' }}>
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
          <span style={{ color: 'var(--emerald-safe)', fontWeight: 700, marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>{eta}</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Sai số Haversine:</span>
          <span style={{ color: isDeviated ? 'var(--danger-red)' : 'var(--emerald-safe)', fontWeight: 700, marginLeft: '6px', fontFamily: 'var(--font-mono)' }}>
            {isDeviated ? '280m (Vượt ngưỡng)' : '4.2m'}
          </span>
        </div>
      </div>

      {/* SVG Vector Map Rendering */}
      <svg viewBox="0 0 800 400" style={{ width: '100%', height: '100%', display: 'block' }}>
        <defs>
          {/* Map Grid Pattern */}
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
          </pattern>

          {/* Glow filter */}
          <filter id="glow-route" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>

          <filter id="glow-bus" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grid Background */}
        <rect width="800" height="400" fill="url(#grid)" />

        {/* Secondary roads / background map aesthetics */}
        <path d="M 0 100 Q 200 120 400 90 T 800 130" fill="none" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="4" />
        <path d="M 120 0 Q 150 200 200 400" fill="none" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="4" />
        <path d="M 500 0 L 520 400" fill="none" stroke="rgba(148, 163, 184, 0.25)" strokeWidth="4" />

        {/* Main Standard Route Polyline */}
        <path 
          d="M 80 320 L 260 220 L 480 150 L 720 80" 
          fill="none" 
          stroke={isDeviated ? "rgba(239, 68, 68, 0.3)" : "rgba(6, 182, 212, 0.8)"} 
          strokeWidth="6" 
          strokeDasharray="8 4"
          filter="url(#glow-route)"
        />

        {/* If Deviated: Render Haversine perpendicular vector projection line */}
        {isDeviated && (
          <g>
            {/* Projected point on planned route */}
            <line 
              x1={busX - 20} y1={busY - 65} 
              x2={busX} y2={busY} 
              stroke="#ef4444" strokeWidth="2" strokeDasharray="4 4" 
            />
            <text x={(busX + busX - 20)/2 + 10} y={(busY + busY - 65)/2} fill="#ef4444" fontSize="12" fontWeight="700" fontFamily="var(--font-mono)">
              Vector Lệch 280m
            </text>
          </g>
        )}

        {/* Waypoint Markers */}
        {waypoints.map((wp) => (
          <g key={wp.id} transform={`translate(${wp.x}, ${wp.y})`}>
            {/* Outer halo */}
            <circle r="16" fill={wp.status === 'completed' ? 'rgba(16, 185, 129, 0.2)' : wp.status === 'current' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(148, 163, 184, 0.1)'} />
            <circle r="8" fill={wp.status === 'completed' ? '#10b981' : wp.status === 'current' ? '#06b6d4' : '#64748b'} />
            
            {/* Label */}
            <rect x="-60" y="-38" width="120" height="22" rx="4" fill="rgba(255, 255, 255, 0.95)" stroke="var(--border-card)" strokeWidth="1" />
            <text x="0" y="-23" textAnchor="middle" fill="var(--text-main)" fontSize="10" fontWeight="600">
              {wp.name}
            </text>
          </g>
        ))}

        {/* Animated Bus Icon */}
        <g transform={`translate(${busX}, ${busY})`} filter="url(#glow-bus)">
          {/* Bus pulse aura */}
          <circle r="22" fill={isDeviated ? "rgba(239, 68, 68, 0.3)" : "rgba(245, 158, 11, 0.3)"}>
            <animate attributeName="r" values="18;26;18" dur="2s" repeatCount="indefinite" />
          </circle>

          {/* Bus Icon Container */}
          <rect x="-18" y="-14" width="36" height="28" rx="6" fill={isDeviated ? "var(--danger-red)" : "var(--accent-bus)"} stroke="var(--bg-card)" strokeWidth="2" />
          <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="800">
            BUS 01
          </text>
        </g>
      </svg>
    </div>
  );
}
