import React from 'react';
import { ShieldAlert, AlertTriangle, Phone, Flame, Stethoscope, UserX, Send, CheckCircle2, X } from 'lucide-react';
import { dispatchAlert } from '../utils/alertEngine';

export default function SosModal({ isOpen, onClose }) {
  const [selectedIncident, setSelectedIncident] = React.useState('traffic_accident');
  const [isDispatched, setIsDispatched] = React.useState(false);
  const [dispatchLogs, setDispatchLogs] = React.useState([]);

  if (!isOpen) return null;

  const incidents = [
    { id: 'traffic_accident', label: 'Tai nạn giao thông', icon: AlertTriangle, color: '#ef4444', channels: ['115 (Cấp cứu)', '113 (Công an)', 'BGH Nhà Trường', 'SMS Phụ Huynh'] },
    { id: 'fire', label: 'Hoả hoạn / Cháy xe', icon: Flame, color: '#f97316', channels: ['114 (Cứu Hỏa)', 'BGH Nhà Trường', 'Tài xế & Tablet Xe', 'Phụ Huynh'] },
    { id: 'medical', label: 'Cấp cứu y tế / sốc nhiệt', icon: Stethoscope, color: '#06b6d4', channels: ['115 (Cấp cứu)', 'Bác sĩ Trường', 'Tài Xế', 'SMS Phụ Huynh'] },
    { id: 'intruder', label: 'Kẻ xâm nhập / uy hiếp', icon: UserX, color: '#a855f7', channels: ['113 (Cảnh Sát)', 'Cảnh báo Ngầm BGH', 'Tài xế', 'Định vị khẩn'] }
  ];

  const handleSendSos = () => {
    setIsDispatched(true);
    const incidentInfo = incidents.find(i => i.id === selectedIncident);

    dispatchAlert({
      source: 'Hệ thống Báo Động SOS Khẩn Cấp (Xe BUS-01)',
      senderRole: 'driver',
      type: 'sos',
      title: `🚨 BÁO ĐỘNG SOS KHẨN CẤP: ${incidentInfo.label.toUpperCase()}`,
      message: `Đã kích hoạt điều phối cứu hộ đa kênh: ${incidentInfo.channels.join(' · ')}. Tọa độ GPS xe: 10.7769° N, 106.7009° E.`,
      busId: 'BUS-01',
      severity: 'critical',
      channels: incidentInfo.channels
    });

    setDispatchLogs([
      `[RabbitMQ Queue] Pushed SOS Event: ${incidentInfo.label}`,
      `[Routing Matrix API] Mapped channels to 4 targets in < 200ms`,
      `[SMS Gateway] Sent emergency alert SMS to Hotline 115 & 113`,
      `[WebSocket] Broadcasted emergency beacon to Admin, Teacher, Driver & Parent devices`
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
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171' }}>PHÁT TÍN HIỆU SOS KHẨN CẤP</h2>
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
                <Send size={18} /> KÍCH HOẠT SOS CẤP TỐC
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

            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleReset}>
              Đóng cảnh báo SOS
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
