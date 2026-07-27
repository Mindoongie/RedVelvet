import React from 'react';
import { Phone, MessageSquare, AlertTriangle, ShieldAlert, CheckCircle2, MapPin, Navigation } from 'lucide-react';
import LiveMapSimulator from './LiveMapSimulator';

// ─── Cảnh báo lệch hướng xuất hiện sau X giây (giả lập AI GPS) ───────────────
const DEVIATION_TRIGGER_MS = 10000; // 10 giây sau khi load phụ huynh nhìn thấy cảnh báo

export default function ParentAppView({ simulations }) {
  // Auto-trigger deviation alert (AI GPS) hoặc admin bật từ dashboard
  const [aiDeviated, setAiDeviated] = React.useState(false);
  const isDeviated = aiDeviated || simulations.routeDev;

  React.useEffect(() => {
    const timer = setTimeout(() => setAiDeviated(true), DEVIATION_TRIGGER_MS);
    return () => clearTimeout(timer);
  }, []);

  // Trạng thái nút cảnh báo của phụ huynh
  const [alertState, setAlertState] = React.useState('idle'); // idle | sent

  const handleSendAlert = () => {
    setAlertState('sent');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>

      {/* ── Smartphone Frame ─────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{
        width: '420px', maxWidth: '100%',
        borderRadius: '32px',
        border: isDeviated ? '3px solid #ef4444' : '3px solid #3a506b',
        padding: '20px',
        background: '#070c1b',
        boxShadow: isDeviated
          ? '0 20px 50px rgba(239,68,68,0.35)'
          : '0 20px 50px rgba(0,0,0,0.6)',
        transition: 'all 0.4s ease'
      }}>

        {/* Notch */}
        <div style={{ width: '120px', height: '18px', background: '#1c2541', borderRadius: '10px', margin: '0 auto 16px auto', border: '1px solid var(--border-card)' }} />

        {/* ── Cảnh báo lệch hướng (AI tự động hiện) ──────────────────────── */}
        {isDeviated && (
          <div style={{
            background: alertState === 'sent' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.9)',
            border: alertState === 'sent' ? '2px solid #10b981' : '2px solid #ef4444',
            borderRadius: '14px', padding: '14px 16px', marginBottom: '14px',
            transition: 'all 0.3s ease'
          }}>
            {alertState === 'idle' ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <AlertTriangle size={22} color="#fff" />
                  <div>
                    <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>XE ĐANG CHỆCH LỘ TRÌNH!</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)' }}>
                      AI GPS phát hiện lệch &gt; 280m · 14:42:07
                    </div>
                  </div>
                </div>
                {/* Nút phụ huynh bấm để gửi cảnh báo */}
                <button
                  onClick={handleSendAlert}
                  style={{
                    width: '100%',
                    background: '#fff',
                    color: '#ef4444',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '10px',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <ShieldAlert size={18} /> GỬI CẢNH BÁO ĐẾN NHÀ TRƯỜNG & TÀI XẾ
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle2 size={22} color="#34d399" />
                <div>
                  <div style={{ fontWeight: 800, color: '#34d399', fontSize: '0.9rem' }}>Cảnh báo đã được gửi!</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Nhà trường và tài xế đã được thông báo · BGH đang xử lý
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Thông tin học sinh ───────────────────────────────────────────── */}
        <div style={{ background: 'linear-gradient(135deg,rgba(6,182,212,0.2),rgba(13,148,136,0.2))', border: '1px solid rgba(6,182,212,0.4)', borderRadius: '16px', padding: '14px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>HỌC SINH ĐANG THEO DÕI</div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>Phạm Phương Chi</h3>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Lớp 2C · Trường THCS Nguyễn Du</div>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#fff', fontSize: '1rem' }}>
            PC
          </div>
        </div>

        {/* ── Bản đồ GPS live ──────────────────────────────────────────────── */}
        <div style={{ height: '220px', borderRadius: '14px', overflow: 'hidden', marginBottom: '14px', border: isDeviated ? '2px solid #ef4444' : '1px solid var(--border-card)' }}>
          <LiveMapSimulator isDeviated={isDeviated} eta={isDeviated ? '? phút' : '8 phút'} speed={isDeviated ? 52 : 38} />
        </div>

        {/* ── Trạng thái tóm tắt ───────────────────────────────────────────── */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '12px', marginBottom: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Trạng Thái</span>
            {isDeviated
              ? <span className="badge-danger" style={{ fontSize: '0.65rem' }}>LỆCH LỘ TRÌNH</span>
              : <span className="badge-safe"  style={{ fontSize: '0.65rem' }}>ĐANG TRÊN XE BUS 01</span>
            }
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '8px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Dự kiến tới trường</div>
              <div style={{ fontWeight: 800, color: isDeviated ? '#f87171' : '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                {isDeviated ? 'Đang xử lý…' : '07:45 AM'}
              </div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '8px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>Sai số GPS</div>
              <div style={{ fontWeight: 800, color: isDeviated ? '#ef4444' : '#34d399', fontFamily: 'var(--font-mono)' }}>
                {isDeviated ? '280m (!!)' : '4.2m'}
              </div>
            </div>
          </div>
        </div>

        {/* ── Timeline ─────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '18px' }}>
          <h4 style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>Lịch Sử Di Chuyển Hôm Nay</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '8px', borderLeft: '2px solid rgba(6,182,212,0.3)' }}>
            <div style={{ position: 'relative', paddingLeft: '14px' }}>
              <div style={{ position: 'absolute', left: '-21px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', background: '#34d399' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>07:15 SA – Đã lên xe Bus 01</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Xác nhận quét khuôn mặt AI (Đúng xe)</div>
            </div>
            <div style={{ position: 'relative', paddingLeft: '14px' }}>
              <div style={{ position: 'absolute', left: '-21px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', background: '#06b6d4' }} />
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>07:30 SA – Qua trạm Pearl Plaza</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Vận tốc 42 km/h · Đúng lộ trình</div>
            </div>
            {isDeviated && (
              <div style={{ position: 'relative', paddingLeft: '14px' }}>
                <div style={{ position: 'absolute', left: '-21px', top: '3px', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }} />
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171' }}>07:42 SA – Xe chệch lộ trình!</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Haversine phát hiện lệch 280m · AI đã gửi cảnh báo</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Nút liên hệ ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '10px' }}>
            <Phone size={14} color="#34d399" /> Gọi Tài Xế
          </button>
          <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', padding: '10px' }}>
            <MessageSquare size={14} color="#38bdf8" /> Nhắn Giáo Viên
          </button>
        </div>

      </div>
    </div>
  );
}
