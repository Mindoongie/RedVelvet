import React from 'react';
import { X, CheckCircle, Cpu, AlertOctagon, Layers, Terminal } from 'lucide-react';

export default function AIDevPanel({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '540px',
      maxWidth: '90vw',
      height: '100vh',
      backgroundColor: '#0b132b',
      borderLeft: '1px solid var(--accent-cyan)',
      boxShadow: '-10px 0 30px rgba(0,0,0,0.7)',
      zIndex: 9999,
      overflowY: 'auto',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-card)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Cpu color="var(--accent-cyan)" size={24} />
          <div>
            <h2 style={{ fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>Hướng Dẫn Ghép AI (AI Integration Specs)</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Dành cho các thành viên phụ trách lõi AI & Backend</p>
          </div>
        </div>
        <button 
          onClick={onClose} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
      </div>

      {/* Integration Overview Alert */}
      <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '12px', padding: '12px', fontSize: '0.8rem', color: '#38bdf8' }}>
        <p style={{ fontWeight: 600, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <CheckCircle size={14} /> Giao diện Frontend đã sẵn sàng các Slot & Webhook!
        </p>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Tất cả UI components đều được thiết kế các vị trí sẵn (Slot video canvas, State Hooks, WebSocket subscriber) đúng chuẩn báo cáo kỹ thuật.
        </p>
      </div>

      {/* Modules Specification Accordion / Cards */}

      {/* 3.1 Face API */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} /> 3.1. Nhận diện khuôn mặt & Rà soát khoang xe
          </h3>
          <span className="badge-safe" style={{ fontSize: '0.65rem' }}>face-api.js</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Trích xuất vector 128 chiều (128-D descriptor), khoảng cách Euclid threshold 0.6. State Machine: <code>boarded</code>, <code>alighted</code>, <code>wrong_bus</code>.
        </p>
        <div style={{ background: '#070b19', padding: '10px', borderRadius: '8px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: '#a7f3d0' }}>
          <div>// Target Hook in TeacherMonitorView.jsx & DriverTabletView.jsx</div>
          <div>const onFaceDetected = (studentId, descriptor128D, confidence) =&gt; &#123;</div>
          <div>&nbsp;&nbsp;if (distance(descriptor128D, targetVector) &lt; 0.6) &#123;</div>
          <div>&nbsp;&nbsp;&nbsp;&nbsp;updateRosterStatus(studentId, 'boarded');</div>
          <div>&nbsp;&nbsp;&#125;</div>
          <div>&#125;;</div>
        </div>
      </div>

      {/* 3.2 Driver Safety */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={16} /> 3.2. Cảnh báo tài xế ngủ gật & Biometrics
          </h3>
          <span className="badge-warning" style={{ fontSize: '0.65rem' }}>Inferensys / ai-driver-safety</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Tính toán tự động chỉ số: EAR (Eye Aspect Ratio), MAR (Mouth Aspect Ratio), Horizontal Head Offset & Mạng Bayes Noisy-OR Fusion.
        </p>
        <div style={{ background: '#070b19', padding: '10px', borderRadius: '8px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: '#fde68a' }}>
          <div>// Target State in DriverTabletView.jsx</div>
          <div>const driverMetrics = &#123;</div>
          <div>&nbsp;&nbsp;ear: 0.18, // &lt; 0.20 triggers fatigue</div>
          <div>&nbsp;&nbsp;mar: 0.65, // Yawning detection</div>
          <div>&nbsp;&nbsp;noisyOrRiskScore: 0.85 // High Risk Threshold</div>
          <div>&#125;;</div>
        </div>
      </div>

      {/* 3.4 & 3.5 GPS & SOS Routing Matrix */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '0.9rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Terminal size={16} /> 3.4 & 3.5. Haversine GPS & SOS Routing Matrix
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
          Thuật toán Haversine đo độ cong Trái Đất, vector vuông góc lộ trình. EmergencyDispatcher đẩy tin nhắn vào RabbitMQ queue & WebSocket real-time.
        </p>
        <div style={{ background: '#070b19', padding: '10px', borderRadius: '8px', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: '#fca5a5' }}>
          <div>// Emergency Dispatcher Payload</div>
          <div>const sosPayload = &#123;</div>
          <div>&nbsp;&nbsp;category: "traffic_accident" | "fire" | "medical" | "intruder",</div>
          <div>&nbsp;&nbsp;channels: ["SMS_115", "SMS_114", "PUSH_PARENT", "WEBSOCKET_ADMIN"],</div>
          <div>&nbsp;&nbsp;location: &#123; lat: 10.762622, lng: 106.660172 &#125;</div>
          <div>&#125;;</div>
        </div>
      </div>

      {/* Bottom Footer Note */}
      <div style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', paddingTop: '10px' }}>
        EduSafe Bus Startup Web Architecture &copy; 2026 - Designed for seamless AI core integration.
      </div>
    </div>
  );
}
