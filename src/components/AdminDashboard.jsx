import React from 'react';
import { Bus, Users, ShieldCheck, AlertTriangle, PhoneCall, FileText } from 'lucide-react';
import LiveMapSimulator from './LiveMapSimulator';

export default function AdminDashboard({ simulations }) {
  const fleetData = [
    { id: 'BUS-01', route: 'Tuyến 1: Quận 2 - Bình Thạnh - Q1', driver: 'Nguyễn Văn Hùng', teacher: 'Trần Thị Thu', students: '24 / 24', ear: '0.28 (Bình thường)', mar: '0.12', status: simulations.drowsiness ? 'warning' : 'safe' },
    { id: 'BUS-02', route: 'Tuyến 2: Quận 7 - Nhà Bè', driver: 'Lê Hoàng Nam', teacher: 'Phạm Minh Trang', students: '22 / 22', ear: '0.29', mar: '0.10', status: 'safe' },
    { id: 'BUS-03', route: 'Tuyến 3: Thủ Đức - Q9', driver: 'Trịnh Quốc Bảo', teacher: 'Lê Thị Mai', students: '28 / 28', ear: '0.27', mar: '0.15', status: simulations.routeDev ? 'danger' : 'safe' },
    { id: 'BUS-04', route: 'Tuyến 4: Tân Bình - Phú Nhuận', driver: 'Vũ Đức Cường', teacher: 'Nguyễn Thanh Hà', students: '20 / 20', ear: '0.26', mar: '0.11', status: 'safe' },
  ];

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
                {simulations.drowsiness && '• BUS-01: Phát hiện tài xế nhắm mắt > 2.5s (EAR < 0.20) | '}
                {simulations.leftBehind && '• BUS-01: Phát hiện 1 học sinh chưa quét khuôn mặt xuống trạm | '}
                {simulations.routeDev && '• BUS-03: Xe chệch khỏi đường chuẩn Haversine > 280m'}
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
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tổng Xe Hoạt Động</span>
            <Bus size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
            12 / 12 <span style={{ fontSize: '0.8rem', color: '#34d399', fontWeight: 600 }}>(100%)</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Đang chạy lộ trình sáng
          </div>
        </div>

        {/* Total Students */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Học Sinh Trên Xe</span>
            <Users size={20} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff', fontFamily: 'var(--font-mono)' }}>
            284 / 284
          </div>
          <div style={{ fontSize: '0.75rem', color: '#34d399', marginTop: '4px' }}>
            ✓ Quét khuôn mặt 100% an toàn
          </div>
        </div>

        {/* AI Safety Index */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Chỉ Số An Toàn AI</span>
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
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>
              Bản Đồ Giám Sát Tuyến Xe Bus Real-Time (GPS & Haversine Deviation)
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
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} color="var(--accent-cyan)" /> Nhật Ký Cảnh Báo AI System
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', maxHeight: '340px' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #34d399', fontSize: '0.75rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>07:42:15 - face-api.js Edge</div>
              <div style={{ fontWeight: 600, color: '#fff' }}>Quét thành công 24/24 học sinh Xe Bus 01</div>
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

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', borderLeft: '3px solid #f59e0b', fontSize: '0.75rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>07:35:18 - EmergencyDispatcher</div>
              <div style={{ fontWeight: 600, color: '#fff' }}>Kiểm tra định kỳ kết nối RabbitMQ & WebSockets - OK</div>
            </div>
          </div>
        </div>

      </div>

      {/* Fleet Management Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Danh Sách Đội Xe & Trạng Thái Sinh Trắc Học Cabin</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
              <FileText size={14} /> Xuất Báo Cáo An Toàn
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
                <tr key={bus.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>{bus.id}</td>
                  <td style={{ padding: '12px', color: '#fff' }}>{bus.route}</td>
                  <td style={{ padding: '12px', color: 'var(--text-main)' }}>{bus.driver}</td>
                  <td style={{ padding: '12px', color: 'var(--text-main)' }}>{bus.teacher}</td>
                  <td style={{ padding: '12px', fontWeight: 600, color: '#34d399', fontFamily: 'var(--font-mono)' }}>{bus.students}</td>
                  <td style={{ padding: '12px', fontFamily: 'var(--font-mono)', color: bus.status === 'warning' ? '#f87171' : 'var(--text-main)' }}>
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
