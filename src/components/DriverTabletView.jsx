import React from 'react';
import { Eye, Volume2, VolumeX, ScanLine, ShieldCheck, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import CameraAiOverlay from './CameraAiOverlay';

// ─── Hằng số chu kỳ AI tự động ───────────────────────────────────────────────
const AI_CYCLE_DELAY_MS  = 8000;  // sau 8s bắt đầu cảnh báo ngủ gật
const AI_ALERT_DURATION  = 6000;  // cảnh báo kéo dài 6s rồi tắt
const AI_CYCLE_PERIOD_MS = 22000; // lặp lại mỗi 22s

export default function DriverTabletView({ simulations }) {
  const [audioEnabled, setAudioEnabled] = React.useState(true);

  // ─── Trạng thái AI tự động phát hiện ngủ gật ──────────────────────────────
  // Kết hợp: AI nội bộ (auto-cycle) + admin demo toggle
  const [aiDrowsy, setAiDrowsy] = React.useState(false);
  const isDrowsy = aiDrowsy || simulations.drowsiness;

  React.useEffect(() => {
    // Chu kỳ: chờ → bật cảnh báo → tắt → lặp
    const runCycle = () => {
      const onTimer  = setTimeout(() => setAiDrowsy(true),  AI_CYCLE_DELAY_MS);
      const offTimer = setTimeout(() => setAiDrowsy(false), AI_CYCLE_DELAY_MS + AI_ALERT_DURATION);
      return [onTimer, offTimer];
    };

    const [on1, off1] = runCycle();
    const interval = setInterval(() => runCycle(), AI_CYCLE_PERIOD_MS);
    return () => {
      clearTimeout(on1);
      clearTimeout(off1);
      clearInterval(interval);
    };
  }, []);

  // ─── Âm thanh cảnh báo khi phát hiện ngủ gật ─────────────────────────────
  React.useEffect(() => {
    if (isDrowsy && audioEnabled) {
      try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 1.2);
      } catch (e) { /* ignore */ }
    }
  }, [isDrowsy]);

  // ─── Trạng thái rà soát khoang xe ────────────────────────────────────────
  const [sweepState, setSweepState] = React.useState('idle'); // idle | scanning | clear | found
  const studentsOnBus = simulations.leftBehind ? 1 : 0;

  const handleSweep = () => {
    setSweepState('scanning');
    setTimeout(() => {
      setSweepState(studentsOnBus > 0 ? 'found' : 'clear');
    }, 2500); // giả lập AI quét mất 2.5s
  };

  // ─── Chỉ số sinh trắc học ────────────────────────────────────────────────
  const earValue   = isDrowsy ? 0.16 : 0.28;
  const marValue   = isDrowsy ? 0.65 : 0.12;
  const riskScore  = isDrowsy ? 88   : 12;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>

      {/* ── Banner tài xế ───────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '14px 20px', border: '1px solid var(--accent-bus)', background: 'rgba(245,158,11,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#f59e0b', padding: '8px 14px', borderRadius: '8px', color: '#000', fontWeight: 800, fontSize: '0.9rem' }}>
            TABLET LÁI XE
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>XE BUS 01 – TÀI XẾ: NGUYỄN VĂN HÙNG</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              AI giám sát liên tục · Cảnh báo tự động khi phát hiện bất thường
            </p>
          </div>
        </div>

        <button
          className="btn-secondary"
          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          onClick={() => setAudioEnabled(!audioEnabled)}
        >
          {audioEnabled
            ? <Volume2  size={16} color="#34d399" />
            : <VolumeX  size={16} color="#f87171" />}
          <span>{audioEnabled ? 'Chuông: BẬT' : 'Chuông: TẮT'}</span>
        </button>
      </div>

      {/* ── Banner cảnh báo ngủ gật (AI tự động hiện) ──────────────────────── */}
      {isDrowsy && (
        <div style={{
          background: 'rgba(239,68,68,0.95)', color: '#fff',
          padding: '16px 24px', borderRadius: '14px', textAlign: 'center',
          animation: 'pulse-danger 1s infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px'
        }}>
          <AlertTriangle size={32} />
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>AI PHÁT HIỆN DẤU HIỆU BUỒN NGỦ!</div>
            <div style={{ fontSize: '0.9rem', marginTop: '4px', opacity: 0.9 }}>
              EAR = {earValue} (dưới ngưỡng 0.20) · Vui lòng dừng xe an toàn hoặc nhờ Giáo Viên hỗ trợ
            </div>
          </div>
        </div>
      )}

      {/* ── Nội dung chính ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '20px' }}>

        {/* Cột trái: Camera AI HUD ───────────────────────────────────────── */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Eye size={18} color="var(--accent-cyan)" /> Giám Sát Mắt & Khuôn Mặt (Inferensys AI)
            </h3>
            <span className={isDrowsy ? 'badge-danger' : 'badge-safe'}>
              {isDrowsy ? 'CẢNH BÁO MỆT MỎI' : 'AI: TỈNH TÁO'}
            </span>
          </div>

          <div style={{ height: '260px' }}>
            <CameraAiOverlay mode="driver" isDrowsy={isDrowsy} />
          </div>

          {/* Bộ 3 chỉ số */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {[
              { label: 'EAR (Mở mắt)',      value: earValue,  bad: earValue < 0.20, note: '≥ 0.20' },
              { label: 'MAR (Ngáp)',         value: marValue,  bad: marValue > 0.50, note: '< 0.50' },
              { label: 'Risk Score (Bayes)', value: `${riskScore}%`, bad: riskScore > 50, note: 'Noisy-OR' },
            ].map(m => (
              <div key={m.label} style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{m.label}</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: m.bad ? '#ef4444' : '#34d399' }}>
                  {m.value}
                </div>
                <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Ngưỡng: {m.note}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cột phải: Quét Khoang Xe ──────────────────────────────────────── */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ScanLine size={18} color="#f59e0b" /> Rà Soát Khoang Xe Cuối Chuyến
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Bấm nút bên dưới sau khi đến điểm cuối. AI sẽ quét toàn bộ khoang xe bằng nhận diện khuôn mặt để đảm bảo không còn học sinh nào bị bỏ quên.
          </p>

          {/* Nút Quét Khoang Xe lớn, nổi bật */}
          {sweepState === 'idle' && (
            <button
              onClick={handleSweep}
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#000', border: 'none',
                borderRadius: '16px', padding: '28px',
                fontSize: '1.1rem', fontWeight: 900,
                cursor: 'pointer', width: '100%',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                boxShadow: '0 8px 24px rgba(245,158,11,0.4)',
                transition: 'transform 0.15s ease',
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <ScanLine size={40} />
              QUÉT KHOANG XE
              <span style={{ fontSize: '0.75rem', fontWeight: 600, opacity: 0.8 }}>
                Nhận diện khuôn mặt AI – End-trip Sweep
              </span>
            </button>
          )}

          {/* Đang quét */}
          {sweepState === 'scanning' && (
            <div style={{ textAlign: 'center', padding: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '48px', height: '48px', border: '4px solid rgba(6,182,212,0.3)', borderTopColor: 'var(--accent-cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ color: '#38bdf8', fontWeight: 700 }}>AI đang quét khoang xe…</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phân tích camera toàn khoang xe</div>
            </div>
          )}

          {/* Kết quả: An toàn */}
          {sweepState === 'clear' && (
            <div style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid #10b981', borderRadius: '14px', padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={48} color="#34d399" />
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34d399' }}>KHOANG XE TRỐNG – AN TOÀN!</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Không phát hiện học sinh nào còn trên xe.</div>
              <button className="btn-secondary" style={{ marginTop: '8px' }} onClick={() => setSweepState('idle')}>
                Quét Lại
              </button>
            </div>
          )}

          {/* Kết quả: Phát hiện học sinh */}
          {sweepState === 'found' && (
            <div style={{ background: 'rgba(239,68,68,0.2)', border: '2px solid #ef4444', borderRadius: '14px', padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', animation: 'pulse-danger 1.5s infinite' }}>
              <Users size={48} color="#f87171" />
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f87171' }}>⚠ CÒN HỌC SINH TRÊN XE!</div>
              <div style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>Phạm Phương Chi – Lớp 2C</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vui lòng kiểm tra ghế cuối trước khi tắt máy xe.</div>
              <button className="btn-secondary" style={{ marginTop: '8px', borderColor: '#ef4444', color: '#f87171' }} onClick={() => setSweepState('idle')}>
                Xác Nhận & Quét Lại
              </button>
            </div>
          )}

        </div>
      </div>

      {/* Keyframe spin cho loading */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
