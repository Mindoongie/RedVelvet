import React from 'react';
import { 
  ShieldAlert, 
  Code2, 
  Bell, 
  AlertTriangle, 
  MapPin,
  Clock,
  Sparkles,
  LogOut,
  User
} from 'lucide-react';

// Simulation toggle buttons chỉ dành cho Admin (demo tổng quan).
// Driver & Parent nhận cảnh báo AI tự động trong view riêng của họ.
const SIM_ROLES = {
  drowsiness: ['admin'],
  leftBehind:  ['admin'],
  routeDev:    ['admin'],
};

export default function Navbar({ 
  currentUser, 
  onLogout,
  devDrawerOpen, 
  setDevDrawerOpen,
  simulations,
  toggleSimulation,
  openSosModal
}) {
  const [time, setTime] = React.useState(new Date().toLocaleTimeString('vi-VN'));

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('vi-VN'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Guard: currentUser chưa sẵn sàng (có thể xảy ra trong HMR)
  if (!currentUser) return null;

  return (
    <header className="glass-panel" style={{ margin: '16px 24px 0 24px', padding: '12px 20px', borderRadius: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand Logo & Logged In Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img 
            src="/edusafe_logo.png" 
            alt="EduSafe Logo" 
            style={{ width: '42px', height: '42px', borderRadius: '10px', objectFit: 'cover', boxShadow: '0 0 12px rgba(8,145,178,0.2)' }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: '800', background: 'linear-gradient(90deg, #0891b2, #059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                EduSafe Bus
              </h1>
              <span className="badge-ai" style={{ fontSize: '0.65rem' }}>
                <Sparkles size={12} /> {currentUser.roleTitle}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={12} color="var(--accent-cyan)" />
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{currentUser.name}</span> ({currentUser.email})
            </p>
          </div>
        </div>

        {/* Action Controls & AI Dev Handoff Drawer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          
          {/* Simulation Toggles Bar — only shown for relevant roles */}
          {(() => {
            const role = currentUser.role;
            const show = {
              drowsiness: SIM_ROLES.drowsiness.includes(role),
              leftBehind:  SIM_ROLES.leftBehind.includes(role),
              routeDev:    SIM_ROLES.routeDev.includes(role),
            };
            const anyVisible = Object.values(show).some(Boolean);
            if (!anyVisible) return null;
            return (
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-card)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                {show.drowsiness && (
                  <button
                    style={{
                      background: simulations.drowsiness ? 'rgba(239,68,68,0.3)' : 'transparent',
                      border: simulations.drowsiness ? '1px solid #ef4444' : 'none',
                      color: simulations.drowsiness ? '#ef4444' : 'var(--text-muted)',
                      padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                    onClick={() => toggleSimulation('drowsiness')}
                    title="Mô phỏng cảnh báo tài xế ngủ gật"
                  >
                    <AlertTriangle size={12} /> Ngủ Gật
                  </button>
                )}
                {show.leftBehind && (
                  <button
                    style={{
                      background: simulations.leftBehind ? 'rgba(245,158,11,0.3)' : 'transparent',
                      border: simulations.leftBehind ? '1px solid #f59e0b' : 'none',
                      color: simulations.leftBehind ? '#fbbf24' : 'var(--text-muted)',
                      padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                    onClick={() => toggleSimulation('leftBehind')}
                    title="Mô phỏng học sinh bị bỏ quên"
                  >
                    <Bell size={12} /> Bỏ Quên
                  </button>
                )}
                {show.routeDev && (
                  <button
                    style={{
                      background: simulations.routeDev ? 'rgba(6,182,212,0.3)' : 'transparent',
                      border: simulations.routeDev ? '1px solid #06b6d4' : 'none',
                      color: simulations.routeDev ? '#38bdf8' : 'var(--text-muted)',
                      padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                    onClick={() => toggleSimulation('routeDev')}
                    title="Mô phỏng xe chệch lộ trình"
                  >
                    <MapPin size={12} /> Lệch Tuyến
                  </button>
                )}
              </div>
            );
          })()}

          {/* AI Team Handoff Drawer Trigger */}
          <button 
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            onClick={() => setDevDrawerOpen(!devDrawerOpen)}
          >
            <Code2 size={16} color="var(--accent-cyan)" />
            <span>AI Specs</span>
          </button>

          {/* SOS Trigger */}
          <button 
            className="btn-sos"
            style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            onClick={openSosModal}
          >
            <ShieldAlert size={16} /> SOS
          </button>

          {/* Live Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-cyan)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)', paddingLeft: '4px' }}>
            <Clock size={14} />
            <span>{time}</span>
          </div>

          {/* Logout Button */}
          <button 
            className="btn-secondary" 
            style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: 'rgba(220, 38, 38, 0.3)', color: 'var(--danger-red)' }}
            onClick={onLogout}
            title="Đăng xuất khỏi phân quyền"
          >
            <LogOut size={14} /> Đăng Xuất
          </button>

        </div>

      </div>
    </header>
  );
}
