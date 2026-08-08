import React, { useState, useEffect } from 'react';
import {
  School, ShieldAlert, Camera, CheckCircle2, XCircle, AlertTriangle,
  Clock, Users, UserCheck, PenLine, RefreshCw, MapPin, Bell
} from 'lucide-react';
import LiveMapSimulator from './LiveMapSimulator';
import { getRoster, saveRoster, startTrip, getStudentsForBus } from '../utils/faceEngine';
import { getActiveAlerts, subscribeToAlerts } from '../utils/alertEngine';

// ─── Dữ liệu học sinh ban đầu ────────────────────────────────────────────────
// status:
//   'waiting'  – chưa được quét
//   'scanned'  – AI quét thành công
//   'failed'   – AI quét thất bại (không nhận ra / độ tin cậy thấp)
//   'manual'   – giáo viên xác nhận thủ công
const INITIAL_STUDENTS = [
  { id: 'HS-002', name: 'Nguyễn Minh Anh',  cls: '3A', station: 'Trạm 1: Vinhomes',    status: 'scanned', confidence: 99.4, time: '07:15' },
  { id: 'HS-004', name: 'Lê Hoàng Khoa',    cls: '3A', station: 'Trạm 1: Vinhomes',    status: 'scanned', confidence: 98.9, time: '07:16' },
  { id: 'HS-003', name: 'Trần Gia Bảo',     cls: '4B', station: 'Trạm 2: Pearl Plaza', status: 'failed',  confidence: 43.2, time: '07:28' },
  { id: 'HS-001', name: 'Phạm Phương Chi',  cls: '2C', station: 'Trạm 2: Pearl Plaza', status: 'scanned', confidence: 99.6, time: '07:29' },
  { id: 'HS-005', name: 'Vũ Đức Minh',      cls: '1A', station: 'Trạm 3: Masteri',     status: 'waiting', confidence: null, time: null },
  { id: 'HS-006', name: 'Hoàng Thị Lan',    cls: '5B', station: 'Trạm 3: Masteri',     status: 'waiting', confidence: null, time: null },
];

// Trạng thái hiển thị
const STATUS_META = {
  scanned: { label: 'Đã quét',     color: 'var(--emerald-safe)', bg: 'rgba(4,120,87,0.06)', border: 'rgba(4,120,87,0.2)' },
  failed:  { label: 'Quét thất bại', color: 'var(--accent-bus)', bg: 'rgba(180,83,9,0.06)', border: 'rgba(180,83,9,0.2)' },
  manual:  { label: 'Điểm danh thủ công', color: 'var(--primary-blue)', bg: 'rgba(29,78,216,0.06)', border: 'rgba(29,78,216,0.2)' },
  waiting: { label: 'Chờ quét',    color: 'var(--text-muted)', bg: 'var(--bg-card-hover)', border: 'var(--border-card)' },
  alighted: { label: 'Đã xuống xe', color: 'var(--accent-cyan)', bg: 'rgba(6,182,212,0.06)', border: 'rgba(6,182,212,0.2)' },
};

export default function TeacherMonitorView({ simulations, openSosModal }) {
  const getLiveStudents = () => {
    const roster = getRoster('BUS-01');
    if (roster && roster.entries && Object.keys(roster.entries).length > 0) {
      const entries = Object.values(roster.entries);
      const studentMap = {};
      INITIAL_STUDENTS.forEach(s => { studentMap[s.id] = s; });

      return entries.map(e => {
        let status = 'waiting';
        if (e.status === 'on_bus') {
          status = e.isManual ? 'manual' : 'scanned';
        } else if (e.status === 'alighted') {
          status = 'alighted';
        } else if (e.status === 'failed') {
          status = 'failed';
        } else if (studentMap[e.student_id]) {
          status = studentMap[e.student_id].status;
        }
        
        const init = studentMap[e.student_id] || {};
        return {
          id: e.student_id,
          name: e.full_name,
          cls: init.cls || '3A',
          station: init.station || 'Trạm 1: Pearl Plaza',
          status: status,
          confidence: e.status === 'on_bus' ? (e.isManual ? 100 : 99.4) : (init.confidence || null),
          time: e.boarded_at || e.alighted_at || init.time || null
        };
      });
    }
    return INITIAL_STUDENTS;
  };

  const [students, setStudents] = React.useState(getLiveStudents);
  const [confirmTarget, setConfirmTarget] = React.useState(null); // student.id đang cần xác nhận
  const [activeTab, setActiveTab] = React.useState('attendance'); // 'attendance' | 'map'
  const [liveAlerts, setLiveAlerts] = React.useState([]);

  React.useEffect(() => {
    setLiveAlerts(getActiveAlerts());
    const unsub = subscribeToAlerts((updated) => {
      setLiveAlerts(updated);
    });

    const handleStorage = () => {
      setStudents(getLiveStudents());
    };
    window.addEventListener('storage', handleStorage);
    return () => {
      unsub();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Điểm danh thủ công
  const handleManualConfirm = (id) => {
    let roster = getRoster('BUS-01');
    if (!roster) {
      const assigned = getStudentsForBus('BUS-01');
      roster = startTrip('BUS-01', assigned.length > 0 ? assigned : INITIAL_STUDENTS.map(s => ({ student_id: s.id, full_name: s.name })));
    }
    
    if (roster && roster.entries) {
      const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      if (roster.entries[id]) {
        roster.entries[id].status = 'on_bus';
        roster.entries[id].boarded_at = now;
        roster.entries[id].isManual = true;
      } else {
        const sTarget = students.find(s => s.id === id);
        roster.entries[id] = {
          student_id: id,
          full_name: sTarget ? sTarget.name : 'Học sinh',
          status: 'on_bus',
          boarded_at: now,
          isManual: true
        };
      }
      saveRoster('BUS-01', roster);
      window.dispatchEvent(new Event('storage'));
    }

    setStudents(prev => prev.map(s =>
      s.id === id
        ? { ...s, status: 'manual', confidence: 100, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) }
        : s
    ));
    setConfirmTarget(null);
  };

  // Đánh dấu vắng mặt (HS không có mặt, quét AI bị nhầm)
  const handleMarkAbsent = (id) => {
    let roster = getRoster('BUS-01');
    if (roster && roster.entries && roster.entries[id]) {
      roster.entries[id].status = 'not_boarded';
      roster.entries[id].boarded_at = null;
      roster.entries[id].alighted_at = null;
      roster.entries[id].isManual = false;
      saveRoster('BUS-01', roster);
      window.dispatchEvent(new Event('storage'));
    }

    setStudents(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'waiting', confidence: null, time: null } : s
    ));
    setConfirmTarget(null);
  };

  // Thống kê
  const counts = {
    scanned: students.filter(s => s.status === 'scanned').length,
    manual:  students.filter(s => s.status === 'manual').length,
    failed:  students.filter(s => s.status === 'failed').length,
    waiting: students.filter(s => s.status === 'waiting').length,
    alighted: students.filter(s => s.status === 'alighted').length,
  };
  const onBus = counts.scanned + counts.manual;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '14px 20px', border: '1px solid var(--primary-teal)', background: 'rgba(13,148,136,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: '#0d9488', padding: '8px 14px', borderRadius: '8px', color: '#fff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <School size={18} /> Giám sát từ trường
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>Giáo viên: Trần Thị Thu</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Theo dõi điểm danh khuôn mặt từ xa · Xác nhận thủ công khi AI quét thất bại
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Cảnh báo thời gian thực từ Phụ Huynh & SOS */}
          {liveAlerts.filter(a => a.status === 'active').map(alert => (
            <div key={alert.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', color: '#f87171', animation: 'pulse-danger 2s infinite' }}>
              <Bell size={14} />
              <span><strong>{alert.source}:</strong> {alert.title}</span>
            </div>
          ))}

          {/* Cảnh báo từ xe nếu admin bật simulation */}
          {(simulations.drowsiness || simulations.leftBehind || simulations.routeDev) && liveAlerts.filter(a => a.status === 'active').length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', color: '#f87171' }}>
              <Bell size={14} />
              <span>
                {simulations.drowsiness && 'Tài xế ngủ gật (Cấp 2) · '}
                {simulations.leftBehind && 'HS bỏ quên · '}
                {simulations.routeDev && 'Xe lệch tuyến'}
              </span>
            </div>
          )}
          <button className="btn-sos" style={{ padding: '8px 14px' }} onClick={openSosModal}>
            <ShieldAlert size={16} /> SOS
          </button>
        </div>
      </div>

      {/* ── KPI Summary ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '14px' }}>
        {[
          { label: 'Đã quét AI',          value: counts.scanned, color: 'var(--emerald-safe)', icon: <Camera size={18} color="var(--emerald-safe)" /> },
          { label: 'Điểm danh thủ công',  value: counts.manual,  color: 'var(--primary-blue)',  icon: <PenLine size={18} color="var(--primary-blue)" /> },
          { label: 'Quét thất bại',        value: counts.failed,  color: 'var(--accent-bus)',  icon: <XCircle size={18} color="var(--accent-bus)" /> },
          { label: 'Chờ quét',             value: counts.waiting, color: 'var(--text-muted)', icon: <Clock   size={18} color="var(--text-muted)" /> },
          { label: 'Đã xuống xe',          value: counts.alighted, color: 'var(--accent-cyan)', icon: <CheckCircle2 size={18} color="var(--accent-cyan)" /> },
        ].map(k => (
          <div key={k.label} className="glass-panel" style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: k.color }}>{k.value}</div>
            </div>
            {k.icon}
          </div>
        ))}
      </div>

      {/* ── Tab điều hướng ──────────────────────────────────────────────────── */}
      <div className="role-tabs" style={{ width: 'fit-content' }}>
        <button className={`tab-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
          <UserCheck size={15} /> Điểm danh & quét mặt
        </button>
        <button className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`} onClick={() => setActiveTab('map')}>
          <MapPin size={15} /> Vị trí xe thời gian thực
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1: ĐIỂM DANH & QUÉT MẶT
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'attendance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px' }}>

          {/* Cột trái: Camera feed từ xe (nhận qua AI) */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={16} color="var(--accent-cyan)" /> Feed Camera Xe (face-api.js)
              </h3>
              <span className="badge-ai" style={{ fontSize: '0.65rem' }}>128-D Vector</span>
            </div>

            {/* Camera overlay */}
            {(() => {
              const activeStudent = students.find(s => s.status === 'manual' || s.status === 'scanned') || students[0] || { name: 'Học sinh', confidence: 99.4, status: 'scanned', cls: '3A', time: '07:15' };
              const isManual = activeStudent.status === 'manual';
              return (
                <>
                  <div style={{ height: '260px' }}>
                    <div style={{ position: 'relative', height: '100%', background: '#050a17', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="scan-line" />
                      {/* Face bounding box mô phỏng */}
                      <div style={{ position: 'relative', width: '180px', height: '200px' }}>
                        <div style={{ position: 'absolute', inset: 0, border: `2px dashed ${isManual ? '#1d4ed8' : '#10b981'}`, borderRadius: '14px', boxShadow: isManual ? '0 0 18px rgba(29,78,216,0.3)' : '0 0 18px rgba(16,185,129,0.3)', background: isManual ? 'rgba(29,78,216,0.05)' : 'rgba(16,185,129,0.04)' }} />
                        <div style={{ position: 'absolute', top: -4, left: -4, width: 12, height: 12, borderTop: `3px solid ${isManual ? '#60a5fa' : '#34d399'}`, borderLeft: `3px solid ${isManual ? '#60a5fa' : '#34d399'}` }} />
                        <div style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderTop: `3px solid ${isManual ? '#60a5fa' : '#34d399'}`, borderRight: `3px solid ${isManual ? '#60a5fa' : '#34d399'}` }} />
                        <div style={{ position: 'absolute', bottom: -4, left: -4, width: 12, height: 12, borderBottom: `3px solid ${isManual ? '#60a5fa' : '#34d399'}`, borderLeft: `3px solid ${isManual ? '#60a5fa' : '#34d399'}` }} />
                        <div style={{ position: 'absolute', bottom: -4, right: -4, width: 12, height: 12, borderBottom: `3px solid ${isManual ? '#60a5fa' : '#34d399'}`, borderRight: `3px solid ${isManual ? '#60a5fa' : '#34d399'}` }} />
                        <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8, background: 'var(--bg-card)', padding: '4px 6px', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-card)' }}>
                          <div style={{ fontSize: '0.72rem', color: isManual ? 'var(--primary-blue)' : 'var(--emerald-safe)', fontWeight: 700 }}>{activeStudent.name}</div>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                            {isManual ? 'Điểm danh thủ công ✓' : `Match: ${activeStudent.confidence || 99.4}% ✓`}
                          </div>
                        </div>
                      </div>
                      <div style={{ position: 'absolute', top: 10, left: 10 }}>
                        <span className="badge-ai" style={{ fontSize: '0.62rem', background: 'var(--bg-card)', backdropFilter: 'blur(6px)' }}>
                          <Camera size={10} /> Live từ Xe Bus 01
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Kết quả quét cuối */}
                  <div style={{ background: 'var(--bg-card-hover)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-card)', fontSize: '0.78rem' }}>
                    <div style={{ color: isManual ? 'var(--primary-blue)' : 'var(--emerald-safe)', fontWeight: 600, marginBottom: '4px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <CheckCircle2 size={14} /> Lần quét / xác nhận gần nhất:
                    </div>
                    <div style={{ color: 'var(--text-main)', fontWeight: 700 }}>{activeStudent.name} – Lớp {activeStudent.cls}</div>
                    <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
                      {isManual ? 'Xác nhận bởi Giáo viên (Manual Fallback)' : 'Dist: 0.12 / threshold 0.60'} · {activeStudent.time ? `Lên xe ${activeStudent.time}` : 'Vừa cập nhật'}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Thống kê tiến trình */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>Tiến độ điểm danh</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>{onBus} / {students.length} học sinh</span>
              </div>
              <div style={{ height: '8px', background: 'var(--border-card)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(onBus / students.length) * 100}%`, background: 'linear-gradient(90deg, var(--emerald-safe), var(--accent-cyan))', borderRadius: '4px', transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>

          {/* Cột phải: Danh sách điểm danh */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Danh sách học sinh – Điểm danh & xác nhận thủ công
              </h3>
              <span className="badge-ai" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem' }}>
                <Users size={12} /> {students.length} HS
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', maxHeight: '500px' }}>
              {students.map(st => {
                const meta = STATUS_META[st.status];
                const needsAction = st.status === 'failed' || st.status === 'waiting';
                return (
                  <div key={st.id} style={{ borderRadius: '10px', border: `1px solid ${meta.border}`, background: meta.bg, overflow: 'hidden' }}>

                    {/* Row chính */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.88rem' }}>{st.name}</span>
                          <span style={{ fontSize: '0.65rem', background: 'var(--bg-card-hover)', color: 'var(--text-muted)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border-card)' }}>
                            Lớp {st.cls}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {st.station}
                          {st.confidence !== null && (
                            <span style={{ marginLeft: '8px', fontFamily: 'var(--font-mono)', color: st.confidence < 60 ? '#f87171' : '#38bdf8' }}>
                              · Độ tin cậy: {st.confidence}%
                            </span>
                          )}
                          {st.time && <span style={{ marginLeft: '8px' }}>· {st.time}</span>}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {/* Badge trạng thái */}
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, color: meta.color, background: 'var(--bg-card)', border: `1px solid ${meta.border}`, padding: '3px 8px', borderRadius: '12px', whiteSpace: 'nowrap' }}>
                          {meta.label}
                        </span>

                        {/* Nút xử lý cho failed/waiting */}
                        {needsAction && (
                          <button
                            onClick={() => setConfirmTarget(confirmTarget === st.id ? null : st.id)}
                            style={{ background: 'rgba(8,145,178,0.1)', border: '1px solid var(--accent-cyan)', color: 'var(--accent-cyan)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <PenLine size={12} />
                            {st.status === 'failed' ? 'Xử lý' : 'Điểm danh'}
                          </button>
                        )}

                        {/* Nút sửa lại cho đã quét */}
                        {(st.status === 'scanned' || st.status === 'manual') && (
                          <button
                            onClick={() => setConfirmTarget(confirmTarget === st.id ? null : st.id)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                            title="Chỉnh sửa"
                          >
                            <PenLine size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Panel xử lý khi mở rộng */}
                    {confirmTarget === st.id && (
                      <div style={{ borderTop: `1px solid ${meta.border}`, padding: '12px 14px', background: 'var(--bg-card-hover)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {st.status === 'failed' && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--accent-bus)', marginBottom: '4px' }}>
                            ⚠ AI không nhận ra khuôn mặt (độ tin cậy {st.confidence}%). Giáo viên xác nhận hoặc đánh dấu vắng:
                          </p>
                        )}
                        {(st.status === 'scanned' || st.status === 'manual') && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            Học sinh thực sự có mặt trên xe không?
                          </p>
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleManualConfirm(st.id)}
                            style={{ flex: 1, background: 'rgba(4,120,87,0.1)', border: '1px solid var(--emerald-safe)', color: 'var(--emerald-safe)', borderRadius: '8px', padding: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <CheckCircle2 size={14} /> Xác nhận có mặt (Điểm danh thủ công)
                          </button>
                          <button
                            onClick={() => handleMarkAbsent(st.id)}
                            style={{ flex: 1, background: 'rgba(185,28,28,0.1)', border: '1px solid var(--danger-red)', color: 'var(--danger-red)', borderRadius: '8px', padding: '8px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          >
                            <XCircle size={14} /> AI quét nhầm – Đánh dấu vắng
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2: BẢN ĐỒ VỊ TRÍ XE
      ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === 'map' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} color="var(--accent-cyan)" /> Vị trí xe Bus 01 – Thời gian thực
          </h3>
          <div style={{ height: '420px' }}>
            <LiveMapSimulator isDeviated={simulations.routeDev} />
          </div>
        </div>
      )}

    </div>
  );
}
