import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, AlertTriangle, CheckCircle2, PhoneCall, MapPin, 
  Radio, X, BellRing, Sparkles, Send
} from 'lucide-react';
import { getActiveAlerts, acknowledgeAlert, subscribeToAlerts } from '../utils/alertEngine';

export default function GlobalEmergencyBanner({ currentUser, onFocusMap }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    setAlerts(getActiveAlerts());
    const unsubscribe = subscribeToAlerts((updatedAlerts) => {
      setAlerts(updatedAlerts);
    });
    return () => unsubscribe();
  }, []);

  const activeAlerts = alerts.filter(a => a.status === 'active');
  if (activeAlerts.length === 0) return null;

  const currentAlert = activeAlerts[0]; // Hiển thị cảnh báo khẩn cấp nhất

  const handleAcknowledge = () => {
    acknowledgeAlert(currentAlert.id, currentUser ? `${currentUser.roleTitle}: ${currentUser.name}` : 'Quản trị viên');
  };

  const isCritical = currentAlert.severity === 'critical' || currentAlert.type === 'sos';

  return (
    <div style={{ margin: '12px 24px 0 24px' }}>
      <div 
        className="glass-panel" 
        style={{
          background: isCritical 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(185, 28, 28, 0.25))' 
            : 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(217, 119, 6, 0.2))',
          border: isCritical ? '2px solid #ef4444' : '2px solid #f59e0b',
          borderRadius: '16px',
          padding: '14px 20px',
          boxShadow: isCritical 
            ? '0 0 24px rgba(239, 68, 68, 0.35)' 
            : '0 0 20px rgba(245, 158, 11, 0.25)',
          animation: 'pulse-danger 2s infinite',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
          
          {/* Left Icon & Beacon Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div 
              style={{ 
                background: isCritical ? '#dc2626' : '#d97706', 
                color: '#fff', 
                padding: '10px', 
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 12px rgba(239,68,68,0.5)'
              }}
            >
              <BellRing size={24} className="pulse-danger" />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span 
                  style={{ 
                    background: isCritical ? '#ef4444' : '#f59e0b', 
                    color: '#fff', 
                    fontSize: '0.7rem', 
                    fontWeight: 800, 
                    padding: '2px 8px', 
                    borderRadius: '20px',
                    letterSpacing: '0.5px'
                  }}
                >
                  ⚡ ĐỒNG BỘ ĐA KÊNH REAL-TIME ({currentAlert.timestamp})
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Nguồn phát: <strong style={{ color: 'var(--text-main)' }}>{currentAlert.source}</strong>
                </span>
              </div>

              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: isCritical ? '#dc2626' : '#b45309', marginTop: '4px' }}>
                {currentAlert.title}
              </h2>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', marginTop: '2px', fontWeight: 500 }}>
                {currentAlert.message}
              </p>

              {/* Targets Received list */}
              {currentAlert.channels && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  <Radio size={12} color="var(--accent-cyan)" />
                  <span>Đã chuyển tiếp tức thời tới:</span>
                  {currentAlert.channels.map((ch, idx) => (
                    <span 
                      key={idx} 
                      style={{ 
                        background: 'rgba(255,255,255,0.7)', 
                        padding: '1px 6px', 
                        borderRadius: '4px', 
                        border: '1px solid var(--border-card)',
                        fontWeight: 600,
                        color: 'var(--text-main)'
                      }}
                    >
                      {ch}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleAcknowledge}
              className="btn-primary"
              style={{
                background: 'linear-gradient(135deg, #059669, #0d9488)',
                padding: '8px 16px',
                fontSize: '0.82rem',
                boxShadow: '0 4px 12px rgba(5,150,105,0.3)'
              }}
            >
              <CheckCircle2 size={16} /> Tiếp nhận & Phối hợp
            </button>

            <button
              onClick={() => alert(`Đang kết nối đàm thoại ưu tiên tới Tài xế & Giáo viên xe ${currentAlert.busId || 'BUS-01'}...`)}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.82rem' }}
            >
              <PhoneCall size={15} color="var(--primary-blue)" /> Gọi bộ đàm
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
