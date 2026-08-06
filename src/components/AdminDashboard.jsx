import React from 'react';
import { Bus, Users, ShieldCheck, AlertTriangle, PhoneCall, FileText } from 'lucide-react';
import LiveMapSimulator from './LiveMapSimulator';

export default function AdminDashboard({ simulations }) {
  const fleetData = [
    { id: 'BUS-01', route: 'Tuyến 1: Quận 2 - Bình Thạnh - Q1', driver: 'Nguyễn Văn Hùng', teacher: 'Trần Thị Thu', students: '24 / 24', ear: simulations.drowsiness ? '0.14 (MỆT MỎI CẤP 3!)' : '0.28 (Tỉnh táo)', mar: simulations.drowsiness ? '0.65' : '0.12', status: simulations.drowsiness ? 'warning' : 'safe' },
    { id: 'BUS-02', route: 'Tuyến 2: Quận 7 - Nhà Bè', driver: 'Lê Hoàng Nam', teacher: 'Phạm Minh Trang', students: '22 / 22', ear: '0.29', mar: '0.10', status: 'safe' },
    { id: 'BUS-03', route: 'Tuyến 3: Thủ Đức - Q9', driver: 'Trịnh Quốc Bảo', teacher: 'Lê Thị Mai', students: '28 / 28', ear: '0.27', mar: '0.15', status: simulations.routeDev ? 'danger' : 'safe' },
    { id: 'BUS-04', route: 'Tuyến 4: Tân Bình - Phú Nhuận', driver: 'Vũ Đức Cường', teacher: 'Nguyễn Thanh Hà', students: '20 / 20', ear: '0.26', mar: '0.11', status: 'safe' },
  ];

  const handleExportReport = () => {
    const headers = ['Mã xe', 'Lộ trình', 'Tài xế', 'Giáo viên', 'Học sinh', 'EAR (Mắt)', 'Trạng thái AI'];
    const rows = fleetData.map(bus => [
      bus.id,
      bus.route,
      bus.driver,
      bus.teacher,
      bus.students,
      bus.status === 'warning' ? '0.16 (CẢNH BÁO)' : bus.ear,
      bus.status === 'danger' || bus.status === 'warning' ? 'ALERT AI' : 'AN TOÀN'
    ]);
    
    let csvContent = "\uFEFF" + headers.join(',') + '\n' + rows.map(r => r.map(val => `"${val.replace(/"/g, '""')}"`).join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `bao_cao_an_toan_doi_xe_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
      
      {/* Dynamic Top Active Alert Banner if simulation is active */}
      {(simulations.drowsiness || simulations.leftBehind || simulations.routeDev) && (
        <div className="glass-panel" style={{ padding: '14px 20px', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertTriangle size={24} color="#f87171" className="pulse-danger" />
            <div>
              <h3 style={{ fontSize: '0.95rem', color: '#f87171', fontWeight: 700 }}>
                CẢNH BÁO AI REAL-TIME TỪ ĐỘI XE!
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>
                {simulations.drowsiness && '• BUS-01: Phát hiện tài xế nhắm mắt quá hạn (Hysteresis EAR < 0.21) | '}
                {simulations.leftBehind && '• BUS-01: Phát hiện 1 học sinh chưa quét khuôn mặt xuống trạm | '}
                {simulations.routeDev && '• BUS-03: Xe chệch khỏi đường chuẩn Haversine > 100m'}
              </p>
            </div>
          </div>
          <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
            <PhoneCall size={14} /> Liên hệ tài xế ngay
          </button>
        </div>
      )}

      {/* KPI Cards Row (Removed Heart Rate Card) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        
        {/* Active Buses */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tổng xe hoạt động</span>
            <Bus size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            12 / 12 <span style={{ fontSize: '0.8rem', color: 'var(--emerald-safe)', fontWeight: 600 }}>(100%)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Đang chạy lộ trình sáng
          </div>
        </div>

        {/* Total Students */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Học sinh trên xe</span>
            <Users size={20} color="var(--emerald-safe)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
            284 / 284
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--emerald-safe)', marginTop: '4px' }}>
            ✓ Quét khuôn mặt 100% an toàn
          </div>
        </div>

        {/* AI Safety Index */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chỉ số an toàn AI</span>
            <ShieldCheck size={20} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: simulations.drowsiness || simulations.routeDev ? '#f87171' : '#38bdf8', fontFamily: 'var(--font-mono)' }}>
            {simulations.drowsiness || simulations.routeDev ? '84.5%' : '99.2%'}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Đánh giá Noisy-OR Fusion Model
          </div>
        </div>

      </div>

      {/* Main Center Area: Live Map & Fleet Control */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        
        {/* Map Simulator Panel */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Bản đồ giám sát tuyến xe bus real-time
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge-ai">Live Stream GPS</span>
            </div>
          </div>
          <div style={{ height: '360px', width: '100%' }}>
            <LiveMapSimulator isDeviated={simulations.routeDev} />
          </div>
        </div>

        {/* Telemetry & AI Stream Feed */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="var(--accent-cyan)" /> Nhật ký cảnh báo AI system
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '340px' }}>
            <div style={{ background: 'var(--bg-card-hover)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--emerald-safe)', fontSize: '0.75rem', borderTop: '1px solid var(--border-card)', borderRight: '1px solid var(--border-card)', borderBottom: '1px solid var(--border-card)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>07:42:15 - face-api.js Edge</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Quét thành công 24/24 học sinh Xe Bus 01</div>
            </div>

            {simulations.drowsiness && (
              <div style={{ background: 'rgba(239,68,68,0.15)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #ef4444', fontSize: '0.75rem' }}>
                <div style={{ color: '#f87171', fontSize: '0.65rem', fontWeight: 700 }}>07:43:10 - AI Driver Safety (CẢNH BÁO)</div>
                <div style={{ fontWeight: 700, color: '#ef4444' }}>Tài xế nhắm mắt quá 2.5s (EAR: 0.16) - Đã phát âm thanh báo động!</div>
              </div>
            )}

            {simulations.routeDev && (
              <div style={{ background: 'rgba(239,68,68,0.15)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #ef4444', fontSize: '0.75rem' }}>
                <div style={{ color: '#f87171', fontSize: '0.65rem', fontWeight: 700 }}>07:44:00 - Bustracker GPS</div>
                <div style={{ fontWeight: 700, color: '#ef4444' }}>Xe Bus 03 chệch khỏi hành trình 280m - Đã gởi tọa độ về BGH</div>
              </div>
            )}

            <div style={{ background: 'var(--bg-card-hover)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid var(--accent-bus)', fontSize: '0.75rem', borderTop: '1px solid var(--border-card)', borderRight: '1px solid var(--border-card)', borderBottom: '1px solid var(--border-card)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>07:35:18 - EmergencyDispatcher</div>
              <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>Kiểm tra định kỳ kết nối RabbitMQ & WebSockets - OK</div>
            </div>
          </div>
        </div>

      </div>

      {/* Fleet Management Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>Danh sách đội xe & trạng thái sinh trắc học cabin</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn-secondary" 
              style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              onClick={handleExportReport}
            >
              <FileText size={14} /> Xuất báo cáo an toàn
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-card)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                <th style={{ padding: '12px' }}>MÃ XE</th>
                <th style={{ padding: '12px' }}>LỘ TRÌNH</th>
                <th style={{ padding: '12px' }}>TÀI XẾ</th>
                <th style={{ padding: '12px' }}>GIÁO VIÊN</th>
                <th style={{ padding: '12px' }}>HỌC SINH</th>
                <th style={{ padding: '12px' }}>EAR (MẮT)</th>
                <th style={{ padding: '12px' }}>TRẠNG THÁI AI</th>
              </tr>
            </thead>
            <tbody>
              {fleetData.map((bus) => (
                <tr key={bus.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{bus.id}</td>
                  <td style={{ padding: '12px', color: 'var(--text-main)' }}>{bus.route}</td>
                  <td style={{ padding: '12px', color: 'var(--text-main)' }}>{bus.driver}</td>
                  <td style={{ padding: '12px', color: 'var(--text-main)' }}>{bus.teacher}</td>
                  <td style={{ padding: '12px', fontWeight: 600, color: 'var(--emerald-safe)', fontFamily: 'var(--font-mono)' }}>{bus.students}</td>
                  <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: bus.status === 'warning' ? 'var(--danger-red)' : 'var(--text-main)' }}>
                    {bus.status === 'warning' ? '0.16 (CẢNH BÁO)' : bus.ear}
                  </td>
                  <td style={{ padding: '12px' }}>
                    {bus.status === 'danger' || bus.status === 'warning' ? (
                      <span className="badge-danger">ALERT AI</span>
                    ) : (
                      <span className="badge-safe">AN TOÀN</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
