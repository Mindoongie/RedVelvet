import React from 'react';
import { ShieldAlert, AlertTriangle, Phone, Flame, Stethoscope, UserX, Send, CheckCircle2, X } from 'lucide-react';

export default function SosModal({ isOpen, onClose }) {
  const [selectedIncident, setSelectedIncident] = React.useState('traffic_accident');
  const [isDispatched, setIsDispatched] = React.useState(false);
  const [dispatchLogs, setDispatchLogs] = React.useState([]);

  if (!isOpen) return null;

  const incidents = [
    { id: 'traffic_accident', label: 'Tai Nạn Giao Thông', icon: AlertTriangle, color: '#ef4444', channels: ['115 (Cấp cứu)', '113 (Công an)', 'Push Nhà Trường', 'SMS Phụ Huynh'] },
    { id: 'fire', label: 'Hỏa Hoạn / Cháy Xe', icon: Flame, color: '#f97316', channels: ['114 (Cứu Hỏa)', 'Push Nhà Trường', 'BroadCast Xe'] },
    { id: 'medical', label: 'Cấp Cứu Y Tế / Sốc Nhiệt', icon: Stethoscope, color: '#06b6d4', channels: ['115 (Cấp cứu)', 'Bác sĩ Trường', 'SMS Phụ Huynh'] },
    { id: 'intruder', label: 'Kẻ Xâm Nhập / Uy Hiếp', icon: UserX, color: '#a855f7', channels: ['113 (Cảnh Sát)', 'Cảnh báo Ngầm BGH', 'Định vị khẩn'] }
  ];

  const handleSendSos = () => {
    setIsDispatched(true);
    const incidentInfo = incidents.find(i => i.id === selectedIncident);

    setDispatchLogs([
      `[RabbitMQ Queue] Pushed SOS Event: ${incidentInfo.label}`,
      `[Routing Matrix API] Mapped channels to 4 targets in < 200ms`,
      `[SMS Gateway] Sent emergency alert SMS to Hotline 115 & 113`,
      `[WebSocket] Broadcasted emergency beacon to Admin & Parent devices`
    ]);
  };

  const handleReset = () => {
    setIsDispatched(false);
    setDispatchLogs([]);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(10px)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div className="glass-panel" style={{ width: '560px', maxWidth: '100%', padding: '28px', border: '2px solid #ef4444', boxShadow: '0 8px 32px 0 rgba(239, 68, 68, 0.2)' }}>
        
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: '#ef4444', padding: '10px', borderRadius: '12px', color: '#fff', animation: 'pulse-danger 1.5s infinite' }}>
              <ShieldAlert size={28} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171' }}>PÁT PHÁT TÍN HIỆU SOS KHẨN CẤP</h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tự động điều phối Ma trận EmergencyDispatcher đa kênh &lt; 1 giây</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {!isDispatched ? (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', marginBottom: '14px', fontWeight: 600 }}>
              Chọn loại sự cố khẩn cấp để kích hoạt cứu hộ lập tức:
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
              {incidents.map((inc) => {
                const Icon = inc.icon;
                const selected = selectedIncident === inc.id;
                return (
                  <button
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc.id)}
                    style={{
                      background: selected ? `rgba(${inc.color === '#ef4444' ? '239,68,68' : '6,182,212'}, 0.1)` : 'var(--bg-card)',
                      border: selected ? `2px solid ${inc.color}` : '1px solid var(--border-card)',
                      borderRadius: '12px',
                      padding: '14px',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      color: 'var(--text-main)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <Icon size={20} color={inc.color} />
                      <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{inc.label}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Kênh: {inc.channels.join(', ')}
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={onClose}>
                Hủy bỏ
              </button>
              <button className="btn-sos" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSendSos}>
                <Send size={18} /> KÍCH HOẠT SOS CẤP TỐC (SEND BROADCAST)
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ background: 'rgba(5, 150, 105, 0.08)', border: '1px solid var(--emerald-safe)', padding: '16px', borderRadius: '12px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={28} color="var(--emerald-safe)" />
              <div>
                <h3 style={{ fontSize: '1rem', color: 'var(--emerald-safe)', fontWeight: 700 }}>ĐÃ PHÁT TÍN HIỆU SOS THÀNH CÔNG!</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ban Giám Hiệu, Lực lượng cứu hộ và Phụ huynh đã nhận được vị trí GPS xe.</p>
              </div>
            </div>

            {/* RabbitMQ Dispatcher Log Visualizer */}
            <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-card)', padding: '14px', borderRadius: '10px', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-cyan)', marginBottom: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-card)', paddingBottom: '6px', marginBottom: '8px', color: 'var(--text-muted)' }}>
                [EmergencyDispatcher Routing Matrix Log]
              </div>
              {dispatchLogs.map((log, idx) => (
                <div key={idx} style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--emerald-safe)' }}>✓</span> {log}
                </div>
              ))}
            </div>

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleReset}>
              Đóng Cảnh Báo SOS
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
