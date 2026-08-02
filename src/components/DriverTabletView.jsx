import React, { useState, useEffect, useRef } from 'react';
import { 
  Eye, Volume2, VolumeX, ScanLine, ShieldCheck, AlertTriangle, 
  CheckCircle2, Users, ArrowUpDown, Play, Square, UserCheck, 
  HelpCircle, RefreshCw, LogIn, LogOut, Camera
} from 'lucide-react';
import CameraAiOverlay from './CameraAiOverlay';
import { 
  getStudentsForBus, 
  getRoster, 
  startTrip, 
  registerScan, 
  rosterSummary, 
  findBestMatch,
  loadFaceModels
} from '../utils/faceEngine';

import { DrowsinessDetector } from '../utils/drowsinessEngine';

export default function DriverTabletView({ simulations }) {
  const [audioEnabled, setAudioEnabled] = useState(true);
  
  // Drowsiness Engine setup
  const detectorRef = useRef(new DrowsinessDetector());
  const [drowsinessState, setDrowsinessState] = useState({
    isClosed: false,
    isL1Triggered: false,
    perclos: 0.0,
    yawnsPerMin: 0.0,
    nodsPerMin: 0.0,
    riskScore: 0.12,
    alertLevel: 0,
    ear: 0.28,
    mar: 0.10,
    pitch: 0
  });

  const [contextLevel, setContextLevel] = useState(localStorage.getItem('safebus_context_level') || 'binh_thuong');

  useEffect(() => {
    const handleStorageChange = () => {
      setContextLevel(localStorage.getItem('safebus_context_level') || 'binh_thuong');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const realtimeMetricsRef = useRef({ ear: null, mar: null, pitch: null });

  // Run periodic Drowsiness check via the DrowsinessEngine
  useEffect(() => {
    const interval = setInterval(() => {
      // Determine simulated EAR, MAR, Pitch based on simulation state
      let earInput = 0.28;
      let marInput = 0.10;
      let pitchInput = 0;

      const realMetrics = realtimeMetricsRef.current;
      if (realMetrics.ear !== null) {
        earInput = realMetrics.ear;
        marInput = realMetrics.mar;
        pitchInput = realMetrics.pitch;
      } else if (simulations.drowsiness) {
        // Driver is simulated as drowsy: cycle between eyes closed, yawns and head nods
        const timeFactor = Date.now() % 15000;
        if (timeFactor < 5000) {
          // Yawning phase
          earInput = 0.25;
          marInput = 0.65;
          pitchInput = 5;
        } else if (timeFactor < 10000) {
          // Closed eyes (nhắm mắt)
          earInput = 0.14;
          marInput = 0.10;
          pitchInput = 10;
        } else {
          // Head nodding (gật đầu)
          earInput = 0.22;
          marInput = 0.15;
          pitchInput = 25;
        }
      } else {
        // Normal blinking
        const blinkFactor = Date.now() % 4000;
        if (blinkFactor < 200) {
          earInput = 0.12; // normal blink
        } else {
          earInput = 0.28 + Math.random() * 0.02;
        }
        marInput = 0.10 + Math.random() * 0.04;
        pitchInput = (Math.random() - 0.5) * 4;
      }

      const res = detectorRef.current.processFrame(earInput, marInput, pitchInput, contextLevel);

      setDrowsinessState({
        isClosed: res.isClosed,
        isL1Triggered: res.isL1Triggered,
        perclos: res.perclos,
        yawnsPerMin: res.yawnsPerMin,
        nodsPerMin: res.nodsPerMin,
        riskScore: res.riskScore,
        alertLevel: res.alertLevel,
        ear: earInput,
        mar: marInput,
        pitch: pitchInput
      });

      // Play beep sound if Layer 1 reflex triggers
      if (res.isL1Triggered && audioEnabled) {
        playBeepAlert();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [simulations.drowsiness, audioEnabled, contextLevel]);

  const isDrowsy = drowsinessState.alertLevel >= 2;

  // ─── Trạng thái Chuyến xe & Điểm danh ──────────────────────────────────────
  const [isTripActive, setIsTripActive] = useState(false);
  const isTripActiveRef = useRef(isTripActive);
  useEffect(() => {
    isTripActiveRef.current = isTripActive;
  }, [isTripActive]);

  const [scanMode, setScanMode] = useState('boarded'); // 'boarded' (lên xe) | 'alighted' (xuống xe)
  const [tripRosterState, setTripRosterState] = useState(null);
  
  // Camera & AI Scanning states
  const [cameraActive, setCameraActive] = useState(false);
  const [modelStatus, setModelStatus] = useState('Chưa tải'); // 'Chưa tải' | 'loading' | 'ready' | 'error'
  const [modelMsg, setModelMsg] = useState('AI Điểm Danh chưa khởi động.');
  const [lastScanResult, setLastScanResult] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const drawLoopRef = useRef(null);
  
  const lastScannedIdRef = useRef(null);
  const lastScannedTimeRef = useRef(null);
  const lastUnknownTimeRef = useRef(null);

  // Load current trip status and auto load face models on mount
  useEffect(() => {
    const current = getRoster('BUS-01');
    if (current) {
      setIsTripActive(true);
      setTripRosterState(rosterSummary(current));
    }
    // Auto load AI models so they are ready for both driver monitoring and student attendance
    initAiModels();
  }, []);

  const playBeepAlert = () => {
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
    } catch (e) {}
  };

  const playBeepSuccess = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  const playBeepError = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  };

  // ─── Quản lý Chuyến Đi ────────────────────────────────────────────────────
  const handleStartTrip = () => {
    const students = getStudentsForBus('BUS-01');
    if (students.length === 0) {
      alert('Tuyến BUS-01 hiện chưa có học sinh nào đăng ký. Vui lòng đăng ký học sinh từ tài khoản Phụ Huynh.');
      return;
    }
    const r = startTrip('BUS-01', students);
    setIsTripActive(true);
    setTripRosterState(rosterSummary(r));
    setLastScanResult(null);
  };

  const handleEndTrip = () => {
    if (!tripRosterState) return;
    if (window.confirm('Bạn có chắc chắn muốn kết thúc chuyến đi và bàn giao xe?')) {
      setIsTripActive(false);
      setTripRosterState(null);
      localStorage.removeItem('safebus_trip_BUS-01');
    }
  };

  // ─── Điểm Danh Thủ Công ───────────────────────────────────────────────────
  const handleManualCheck = (studentId, event) => {
    if (!isTripActive) return;
    const res = registerScan('BUS-01', studentId, event);
    if (res.success) {
      playBeepSuccess();
      setTripRosterState(res.roster);
      setLastScanResult({
        student_id: studentId,
        full_name: res.roster.entries.find(e => e.student_id === studentId).full_name,
        confidence: 100,
        time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        success: true,
        isManual: true
      });
    }
  };

  // ─── Điểm Danh Bằng Camera AI ─────────────────────────────────────────────
  const initAiModels = async () => {
    try {
      setModelStatus('loading');
      setModelMsg('Đang tải mô hình nhận diện khuôn mặt...');
      await loadFaceModels((msg) => setModelMsg(msg));
      setModelStatus('ready');
      setModelMsg('Mô hình AI sẵn sàng. Bật camera điểm danh.');
    } catch (err) {
      setModelStatus('error');
      setModelMsg('Lỗi tải mô hình AI: ' + err.message);
    }
  };

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' }
      });
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          startFaceScanLoop();
        }
      }, 50);
    } catch (err) {
      alert('Không thể truy cập camera: ' + err.message);
    }
  };

  const stopWebcam = () => {
    if (drawLoopRef.current) {
      cancelAnimationFrame(drawLoopRef.current);
      drawLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const startFaceScanLoop = () => {
    const detectAndScan = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const faceapi = window.faceapi;

        if (faceapi && isTripActiveRef.current) {
          const result = await faceapi.detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })
          ).withFaceLandmarks().withFaceDescriptor();

          const ctx = canvas.getContext('2d');
          const dims = faceapi.matchDimensions(canvas, video, true);
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          if (result) {
            // Draw box
            const resized = faceapi.resizeResults(result, dims);
            faceapi.draw.drawDetections(canvas, resized);

            // Compare descriptors
            const match = findBestMatch(Array.from(result.descriptor));
            
            if (match.is_match) {
              const sid = match.student_id;
              
              // Cooldown: prevent scanning the same student within 5 seconds
              const now = Date.now();
              if (lastScannedIdRef.current === sid && now - lastScannedTimeRef.current < 5000) {
                // Do nothing
              } else {
                const scanRes = registerScan('BUS-01', sid, scanMode === 'boarded' ? 'boarded' : 'alighted');
                
                if (scanRes.success) {
                  playBeepSuccess();
                  setLastScanResult({
                    student_id: sid,
                    full_name: match.full_name,
                    confidence: Math.round((1 - match.distance) * 100),
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                    success: true
                  });
                  setTripRosterState(scanRes.roster);
                  
                  lastScannedIdRef.current = sid;
                  lastScannedTimeRef.current = now;
                }
              }
            } else {
              // Unknown face warning (cooldown 3s)
              const now = Date.now();
              if (!lastUnknownTimeRef.current || now - lastUnknownTimeRef.current > 3000) {
                playBeepError();
                setLastScanResult({
                  student_id: 'UNKNOWN',
                  full_name: 'Người Lạ / Chưa Đăng Ký',
                  confidence: 0,
                  time: new Date().toLocaleTimeString('vi-VN'),
                  success: false
                });
                lastUnknownTimeRef.current = now;
              }
            }
          }
        }
      }
      drawLoopRef.current = requestAnimationFrame(detectAndScan);
    };
    drawLoopRef.current = requestAnimationFrame(detectAndScan);
  };



  useEffect(() => {
    return () => {
      if (drawLoopRef.current) cancelAnimationFrame(drawLoopRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  // Biometrics
  const earValue   = drowsinessState.ear;
  const marValue   = drowsinessState.mar;
  const riskScore  = Math.round(drowsinessState.riskScore * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
      
      {/* ── Driver Banner ─────────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ 
        padding: '14px 20px', 
        border: '1px solid var(--accent-bus)', 
        background: 'rgba(217,119,6,0.08)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ 
            background: 'var(--accent-bus)', 
            padding: '8px 14px', 
            borderRadius: '8px', 
            color: '#fff', 
            fontWeight: 800, 
            fontSize: '0.9rem' 
          }}>
            TABLET LÁI XE
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              XE BUS-01 – TÀI XẾ: NGUYỄN VĂN HÙNG
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Giám sát an toàn thông minh · Điểm danh khuôn mặt học sinh
            </p>
          </div>
        </div>

        <button
          className="btn-secondary"
          style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          onClick={() => setAudioEnabled(!audioEnabled)}
        >
          {audioEnabled
            ? <Volume2 size={16} color="var(--emerald-safe)" />
            : <VolumeX size={16} color="var(--danger-red)" />}
          <span>{audioEnabled ? 'Chuông: BẬT' : 'Chuông: TẮT'}</span>
        </button>
      </div>

      {/* ── Driver Drowsy Alarm Banner ─────────────────────────────────── */}
      {isDrowsy && (
        <div style={{
          background: 'var(--danger-red)', color: '#fff',
          padding: '16px 24px', borderRadius: '14px', textAlign: 'center',
          animation: 'pulse-danger 1s infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px'
        }}>
          <AlertTriangle size={32} />
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>AI PHÁT HIỆN DẤU HIỆU BUỒN NGỦ (CẤP {drowsinessState.alertLevel})!</div>
            <div style={{ fontSize: '0.9rem', marginTop: '4px', opacity: 0.9 }}>
              EAR = {earValue.toFixed(2)} | PERCLOS = {(drowsinessState.perclos * 100).toFixed(1)}% | Bối cảnh Lớp 3: {contextLevel === 'cao' ? 'RỦI RO CAO' : 'BÌNH THƯỜNG'}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN COCKPIT VIEW AREA ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>

        {/* 1. LEFT COLUMN: Driver Fatigue Safety (Inferensys AI) */}
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={15} color="var(--accent-cyan)" /> Giám Sát Tài Xế
            </h3>
            <span className={isDrowsy ? 'badge-danger' : 'badge-safe'} style={{ fontSize: '0.62rem' }}>
              {isDrowsy ? `MỆT MỎI CẤP ${drowsinessState.alertLevel}` : 'TỈNH TÁO'}
            </span>
          </div>

          <div style={{ height: '210px' }}>
            <CameraAiOverlay 
              mode="driver" 
              isDrowsy={isDrowsy} 
              ear={earValue} 
              mar={marValue} 
              onMetricsUpdate={(ear, mar, pitch) => {
                realtimeMetricsRef.current = { ear, mar, pitch };
              }}
            />
          </div>

          {/* Indices */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {[
              { label: 'EAR (Chỉ số mở mắt)', value: earValue.toFixed(2), bad: earValue < 0.20, note: 'Chuẩn ≥ 0.20 (Vùng chết: 0.19-0.23)' },
              { label: 'MAR (Chỉ số ngáp)', value: marValue.toFixed(2), bad: marValue > 0.55, note: 'Chuẩn < 0.55' },
              { label: 'PERCLOS (Tỉ lệ nhắm mắt)', value: `${(drowsinessState.perclos * 100).toFixed(1)}%`, bad: drowsinessState.perclos >= 0.35, note: 'Cửa sổ trượt 60s' },
              { label: 'Ngáp & Gật đầu', value: `${drowsinessState.yawnsPerMin.toFixed(1)} ypm / ${drowsinessState.nodsPerMin.toFixed(1)} npm`, bad: drowsinessState.yawnsPerMin > 1.0 || drowsinessState.nodsPerMin > 1.0, note: 'Cửa sổ trượt 1p' },
              { label: 'Risk Score (Độ rủi ro)', value: `${riskScore}%`, bad: riskScore > 50, note: 'Noisy-OR Fusion' },
            ].map(m => (
              <div key={m.label} style={{ 
                background: 'var(--bg-card-hover)', 
                padding: '6px 10px', 
                borderRadius: '6px', 
                border: '1px solid var(--border-card)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.68rem'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{m.label}</div>
                  <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{m.note}</div>
                </div>
                <div style={{ 
                  fontSize: '1.05rem', 
                  fontWeight: 800, 
                  fontFamily: 'var(--font-mono)', 
                  color: m.bad ? 'var(--danger-red)' : 'var(--emerald-safe)' 
                }}>
                  {m.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. MIDDLE COLUMN: Student Face Scan Camera (1 Camera) */}
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={16} color="var(--primary-teal)" /> AI Attendance Stream
            </h3>
            
            <button
              onClick={() => setScanMode(prev => prev === 'boarded' ? 'alighted' : 'boarded')}
              className="badge-ai"
              style={{ 
                fontSize: '0.65rem', 
                cursor: 'pointer', 
                background: 'rgba(8,145,178,0.1)', 
                border: '1px solid rgba(8,145,178,0.3)',
                padding: '4px 8px'
              }}
            >
              <ArrowUpDown size={10} /> Mode: {scanMode === 'boarded' ? 'LÊN XE' : 'XUỐNG XE'}
            </button>
          </div>

          {/* Attendance Camera Box */}
          <div style={{ 
            position: 'relative', 
            height: '210px', 
            background: '#000', 
            borderRadius: '12px', 
            overflow: 'hidden',
            border: '1px solid var(--border-card)'
          }}>
            {/* video element is always rendered to prevent null ref on startWebcam */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                display: cameraActive ? 'block' : 'none'
              }} 
            />
            <canvas 
              ref={canvasRef} 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                width: '100%', 
                height: '100%',
                display: cameraActive ? 'block' : 'none'
              }} 
            />

            {cameraActive && (
              <div style={{ 
                position: 'absolute', top: 8, left: 8, 
                background: scanMode === 'boarded' ? 'rgba(5,150,105,0.9)' : 'rgba(217,119,6,0.9)',
                color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700 
              }}>
                ĐANG ĐIỂM DANH: {scanMode === 'boarded' ? 'LÊN XE' : 'XUỐNG XE'}
              </div>
            )}

            {!cameraActive && (
              <div style={{ 
                width: '100%', height: '100%', 
                display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyContent: 'center', 
                color: '#94a3b8', gap: '8px',
                textAlign: 'center', padding: '16px'
              }}>
                <Camera size={26} color="var(--primary-teal)" />
                <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>{modelMsg}</div>
                {modelStatus !== 'ready' ? (
                  <button 
                    onClick={initAiModels}
                    disabled={modelStatus === 'loading'}
                    style={{ 
                      fontSize: '0.72rem', 
                      padding: '6px 12px',
                      background: 'linear-gradient(135deg, var(--primary-teal), var(--accent-cyan))',
                      border: 'none',
                      color: '#ffffff',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    {modelStatus === 'loading' ? <RefreshCw size={12} className="spin" /> : 'Kích Hoạt AI'}
                  </button>
                ) : (
                  <button 
                    onClick={startWebcam}
                    disabled={!isTripActive}
                    style={{ 
                      fontSize: '0.72rem', 
                      padding: '6px 12px', 
                      background: isTripActive ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: isTripActive ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.1)',
                      color: isTripActive ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.3)',
                      borderRadius: '6px',
                      cursor: isTripActive ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 600,
                      opacity: isTripActive ? 1 : 0.5,
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Mở Camera Điểm Danh
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {isTripActive && cameraActive && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={stopWebcam}
                className="btn-secondary"
                style={{ flex: 1, fontSize: '0.72rem', padding: '6px', justifyContent: 'center' }}
              >
                Tắt Camera Điểm Danh
              </button>
            </div>
          )}

          {/* Last Scanned Result HUD */}
          <div style={{ 
            background: 'var(--bg-card-hover)', 
            border: '1px solid var(--border-card)', 
            borderRadius: '10px', padding: '8px', 
            flexGrow: 1, display: 'flex', flexDirection: 'column', 
            justifyContent: 'center', minHeight: '75px' 
          }}>
            {lastScanResult ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ 
                  width: '42px', height: '42px', borderRadius: '50%',
                  background: lastScanResult.success ? 'var(--emerald-safe)' : 'var(--danger-red)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '1rem', fontWeight: 800
                }}>
                  {lastScanResult.student_id === 'UNKNOWN' ? '?' : lastScanResult.full_name[0]}
                </div>
                <div style={{ flexGrow: 1, fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 800, color: lastScanResult.success ? 'var(--emerald-safe)' : 'var(--danger-red)' }}>
                      {lastScanResult.success ? 'AI NHẬN DIỆN THÀNH CÔNG' : 'AI PHÁT HIỆN NGƯỜI LẠ'}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>{lastScanResult.time}</span>
                  </div>
                  <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.8rem', marginTop: '2px' }}>
                    {lastScanResult.full_name} {lastScanResult.student_id !== 'UNKNOWN' && `(${lastScanResult.student_id})`}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                    Vector Match: {lastScanResult.confidence}% {lastScanResult.isManual ? '(Nhập tay)' : lastScanResult.isMock ? '(Giả lập)' : ''}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                <HelpCircle size={18} />
                <span>Chưa có dữ liệu quét khuôn mặt gần đây.</span>
                <span style={{ fontSize: '0.62rem' }}>Học sinh đứng trước camera để hệ thống điểm danh tự động.</span>
              </div>
            )}
          </div>
        </div>

        {/* 3. RIGHT COLUMN: Trip Roster & Manual Fallback */}
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={15} color="var(--accent-bus)" /> Roster & Kiểm Tra Thủ Công
            </h3>
            {isTripActive && (
              <span className="badge-safe" style={{ fontSize: '0.65rem' }}>
                ĐANG CHẠY
              </span>
            )}
          </div>

          {/* Trip Control Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isTripActive ? (
              <button 
                onClick={handleStartTrip}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '8px', background: 'linear-gradient(135deg, var(--emerald-safe), #059669)' }}
              >
                <Play size={14} /> BẮT ĐẦU CHUYẾN ĐI
              </button>
            ) : (
              <button 
                onClick={handleEndTrip}
                className="btn-sos"
                style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', padding: '8px', animation: 'none', boxShadow: 'none' }}
              >
                <Square size={14} /> KẾT THÚC CHUYẾN ĐI
              </button>
            )}
          </div>

          {/* Trip Statistics Summary */}
          {isTripActive && tripRosterState && (
            <div style={{ 
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px',
              background: 'var(--bg-card-hover)', border: '1px solid var(--border-card)',
              padding: '5px 8px', borderRadius: '8px', fontSize: '0.68rem', textAlign: 'center'
            }}>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Chưa Lên</div>
                <div style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '0.95rem' }}>
                  {tripRosterState.counts.not_boarded}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--primary-blue)' }}>Trên Xe</div>
                <div style={{ fontWeight: 800, color: 'var(--primary-blue)', fontSize: '0.95rem' }}>
                  {tripRosterState.counts.on_bus}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--emerald-safe)' }}>Đã Xuống</div>
                <div style={{ fontWeight: 800, color: 'var(--emerald-safe)', fontSize: '0.95rem' }}>
                  {tripRosterState.counts.alighted}
                </div>
              </div>
            </div>
          )}

          {/* Roster student list for manual fallback */}
          <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '260px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Danh sách điểm danh:
            </div>
            
            {!isTripActive ? (
              <div style={{ 
                flexGrow: 1, display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyContent: 'center', 
                color: 'var(--text-muted)', fontSize: '0.7rem', 
                textAlign: 'center', padding: '20px',
                border: '1px dashed var(--border-card)', borderRadius: '10px'
              }}>
                <UserCheck size={20} />
                <span style={{ marginTop: '6px' }}>Ấn "Bắt Đầu Chuyến Đi" để nạp danh sách học sinh lên xe.</span>
              </div>
            ) : tripRosterState ? (
              <div style={{ 
                display: 'flex', flexDirection: 'column', gap: '6px', 
                overflowY: 'auto', flexGrow: 1, maxHeight: '360px' 
              }}>
                {tripRosterState.entries.map(s => {
                  let statusLabel = 'Chưa lên';
                  let statusColor = 'var(--text-muted)';
                  
                  if (s.status === 'on_bus') {
                    statusLabel = `Đã lên (${s.boarded_at})`;
                    statusColor = 'var(--primary-blue)';
                  } else if (s.status === 'alighted') {
                    statusLabel = `Đã xuống (${s.alighted_at})`;
                    statusColor = 'var(--emerald-safe)';
                  }

                  return (
                    <div key={s.student_id} style={{ 
                      background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                      borderRadius: '8px', padding: '6px 8px', fontSize: '0.7rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.full_name}</div>
                        <div style={{ fontSize: '0.62rem', color: statusColor, fontWeight: 600 }}>{statusLabel}</div>
                      </div>

                      {/* Manual boarding/alighting buttons */}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button 
                          onClick={() => handleManualCheck(s.student_id, 'boarded')}
                          disabled={s.status === 'on_bus'}
                          style={{ 
                            background: s.status === 'on_bus' ? 'rgba(37,99,235,0.1)' : 'var(--bg-card-hover)',
                            border: '1px solid var(--border-card)',
                            borderRadius: '4px', padding: '3px 6px', fontSize: '0.6rem',
                            cursor: 'pointer', color: s.status === 'on_bus' ? 'var(--primary-blue)' : 'var(--text-main)'
                          }}
                        >
                          Lên xe
                        </button>
                        <button 
                          onClick={() => handleManualCheck(s.student_id, 'alighted')}
                          disabled={s.status === 'alighted'}
                          style={{ 
                            background: s.status === 'alighted' ? 'rgba(5,150,105,0.1)' : 'var(--bg-card-hover)',
                            border: '1px solid var(--border-card)',
                            borderRadius: '4px', padding: '3px 6px', fontSize: '0.6rem',
                            cursor: 'pointer', color: s.status === 'alighted' ? 'var(--emerald-safe)' : 'var(--text-main)'
                          }}
                        >
                          Xuống
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
