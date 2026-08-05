import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, MessageSquare, AlertTriangle, ShieldAlert, CheckCircle2, 
  MapPin, Navigation, Camera, User, Plus, Trash2, Video, RefreshCw,
  Award, ShieldCheck, HeartHandshake
} from 'lucide-react';
import LiveMapSimulator from './LiveMapSimulator';
import { 
  loadFaceModels, 
  registerStudent, 
  assignStudentToBus, 
  getStudentRegistry,
  deleteStudent
} from '../utils/faceEngine';

const DEVIATION_TRIGGER_MS = 10000;

export default function ParentAppView({ simulations }) {
  const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' | 'register'
  
  // ─── Tracking Tab States ────────────────────────────────────────────────
  const [aiDeviated, setAiDeviated] = useState(false);
  const isDeviated = aiDeviated || simulations.routeDev;
  const [alertState, setAlertState] = useState('idle'); // idle | sent

  useEffect(() => {
    const timer = setTimeout(() => setAiDeviated(true), DEVIATION_TRIGGER_MS);
    return () => clearTimeout(timer);
  }, []);

  const handleSendAlert = () => {
    setAlertState('sent');
  };

  // ─── Registration Tab States ───────────────────────────────────────────
  const [studentId, setStudentId] = useState('');
  const [fullName, setFullName] = useState('');
  const [busId, setBusId] = useState('BUS-01');
  const [modelStatus, setModelStatus] = useState('Chưa tải'); // 'Chưa tải' | 'loading' | 'ready' | 'error'
  const [modelMsg, setModelMsg] = useState('Mô hình AI chưa được khởi động.');
  const [cameraActive, setCameraActive] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedDescriptors, setCapturedDescriptors] = useState([]);
  const [capturedThumbs, setCapturedThumbs] = useState([]);
  const [registeredStudents, setRegisteredStudents] = useState([]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const drawLoopRef = useRef(null);

  // Load students list
  const refreshStudents = () => {
    setRegisteredStudents(getStudentRegistry());
  };

  useEffect(() => {
    refreshStudents();
  }, []);

  // Initialize face-api models
  const initAiModels = async () => {
    try {
      setModelStatus('loading');
      setModelMsg('Đang tải mô hình AI khuôn mặt...');
      await loadFaceModels((msg) => setModelMsg(msg));
      setModelStatus('ready');
      setModelMsg('Mô hình AI sẵn sàng. Vui lòng bật camera.');
    } catch (err) {
      console.error(err);
      setModelStatus('error');
      setModelMsg('Không thể tải mô hình: ' + err.message);
    }
  };

  // Start webcam
  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } 
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        startFaceDetectionLoop();
      }, 50);
    } catch (err) {
      console.error("Camera access error:", err);
      alert('Không thể mở camera: ' + (err.message || 'Vui lòng cấp quyền truy cập camera trong trình duyệt.'));
    }
  };

  // Stop webcam
  const stopWebcam = () => {
    if (drawLoopRef.current) {
      cancelAnimationFrame(drawLoopRef.current);
      drawLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    
    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  // Face detection loop for UI overlay
  const startFaceDetectionLoop = () => {
    const detect = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const faceapi = window.faceapi;

        if (faceapi) {
          try {
            const result = await faceapi.detectSingleFace(
              video, 
              new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })
            ).withFaceLandmarks();

            const ctx = canvas.getContext('2d');
            const dims = faceapi.matchDimensions(canvas, video, true);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (result) {
              const resized = faceapi.resizeResults(result, dims);
              faceapi.draw.drawDetections(canvas, resized);
              faceapi.draw.drawFaceLandmarks(canvas, resized);
            }
          } catch (e) {
            console.warn("Detection loop error:", e);
          }
        }
      }
      drawLoopRef.current = requestAnimationFrame(detect);
    };
    drawLoopRef.current = requestAnimationFrame(detect);
  };

  // Capture face sample descriptor (1 photo proof)
  const captureSample = async () => {
    if (!window.faceapi || modelStatus !== 'ready' || !cameraActive) return;

    setIsCapturing(true);
    setModelMsg('Đang nhận diện và trích xuất vector khuôn mặt...');

    try {
      const video = videoRef.current;
      const faceapi = window.faceapi;
      
      const result = await faceapi.detectSingleFace(
        video, 
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224 })
      ).withFaceLandmarks().withFaceDescriptor();

      if (!result) {
        alert('Không phát hiện khuôn mặt! Vui lòng căn chỉnh khuôn mặt vào giữa camera.');
        setModelMsg('Không phát hiện khuôn mặt. Thử lại.');
        setIsCapturing(false);
        return;
      }

      // Capture canvas snapshot for thumbnail
      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = video.videoWidth;
      tmpCanvas.height = video.videoHeight;
      tmpCanvas.getContext('2d').drawImage(video, 0, 0);
      const dataUrl = tmpCanvas.toDataURL('image/jpeg', 0.7);

      setCapturedThumbs([dataUrl]);
      setCapturedDescriptors([Array.from(result.descriptor)]);
      
      setModelMsg('Đã chụp 1 ảnh minh chứng khuôn mặt thành công!');
    } catch (err) {
      alert('Lỗi chụp mẫu: ' + err.message);
      setModelMsg('Lỗi: ' + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle register student
  const handleRegister = (e) => {
    e.preventDefault();
    if (!studentId.trim() || !fullName.trim()) {
      alert('Vui lòng điền đầy đủ Mã học sinh và Họ tên.');
      return;
    }
    if (capturedDescriptors.length < 1) {
      alert('Vui lòng chụp 1 ảnh minh chứng khuôn mặt của bé trước khi hoàn tất đăng ký.');
      return;
    }

    // Save student details and descriptors
    registerStudent(studentId.trim(), fullName.trim(), capturedDescriptors);
    
    // Assign to bus
    assignStudentToBus(busId, studentId.trim(), fullName.trim());

    // Reset fields
    setStudentId('');
    setFullName('');
    setCapturedDescriptors([]);
    setCapturedThumbs([]);
    stopWebcam();
    refreshStudents();
    alert(`Đã đăng ký xe đưa đón và ảnh minh chứng mặt cho học sinh ${fullName} thành công!`);
  };

  // Handle delete student
  const handleDelete = (id, name) => {
    if (confirm(`Bạn có chắc chắn muốn xóa đăng ký đi xe của bé ${name}?`)) {
      deleteStudent(id);
      refreshStudents();
    }
  };

  // Auto clean camera on unmount
  useEffect(() => {
    return () => {
      if (drawLoopRef.current) cancelAnimationFrame(drawLoopRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
      
      {/* Smartphone Frame mockup */}
      <div className="glass-panel" style={{
        width: '430px', maxWidth: '100%',
        borderRadius: '36px',
        border: isDeviated && activeTab === 'tracking' ? '3px solid #dc2626' : '3px solid var(--border-card)',
        padding: '16px',
        background: 'var(--bg-card)',
        boxShadow: isDeviated && activeTab === 'tracking'
          ? '0 20px 50px rgba(220,38,38,0.15)'
          : '0 20px 40px rgba(148,163,184,0.1)',
        transition: 'all 0.4s ease',
        position: 'relative'
      }}>
        
        {/* Notch */}
        <div style={{ 
          width: '130px', 
          height: '20px', 
          background: 'var(--bg-card-hover)', 
          borderRadius: '10px', 
          margin: '0 auto 12px auto', 
          border: '1px solid var(--border-card)' 
        }} />

        {/* Tab Selection */}
        <div className="role-tabs" style={{ marginBottom: '16px', justifyContent: 'center' }}>
          <button 
            className={`tab-btn ${activeTab === 'tracking' ? 'active' : ''}`}
            onClick={() => setActiveTab('tracking')}
            style={{ flex: 1, justifyContent: 'center', padding: '6px' }}
          >
            <Navigation size={14} /> Theo Dõi Xe
          </button>
          <button 
            className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('register');
              stopWebcam();
            }}
            style={{ flex: 1, justifyContent: 'center', padding: '6px' }}
          >
            <Camera size={14} /> Đăng Ký Bé Đi Xe
          </button>
        </div>

        {/* ──────── TAB 1: TRACKING ──────── */}
        {activeTab === 'tracking' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            
            {/* Deviation Warning Alert */}
            {isDeviated && (
              <div style={{
                background: alertState === 'sent' ? 'rgba(5,150,105,0.1)' : 'rgba(220,38,38,0.08)',
                border: alertState === 'sent' ? '1px solid var(--emerald-safe)' : '1px solid var(--danger-red)',
                borderRadius: '14px', padding: '12px 14px', marginBottom: '12px',
                transition: 'all 0.3s ease'
              }}>
                {alertState === 'idle' ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <AlertTriangle size={20} color="var(--danger-red)" />
                      <div>
                        <div style={{ fontWeight: 800, color: 'var(--danger-red)', fontSize: '0.85rem' }}>XE ĐANG CHỆCH LỘ TRÌNH!</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          AI GPS phát hiện chệch tuyến &gt; 280m
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleSendAlert}
                      style={{
                        width: '100%',
                        background: 'var(--danger-red)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px',
                        fontWeight: 800,
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <ShieldAlert size={14} /> GỬI CẢNH BÁO KHẨN CẤP
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={20} color="var(--emerald-safe)" />
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--emerald-safe)', fontSize: '0.82rem' }}>Đã Gửi Cảnh Báo Thành Công!</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                        Nhà trường & Tài xế đã được thông báo.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Student Info Bar */}
            <div style={{ 
              background: 'linear-gradient(135deg, rgba(8,145,178,0.1), rgba(15,118,110,0.1))', 
              border: '1px solid rgba(8,145,178,0.2)', 
              borderRadius: '16px', padding: '12px', marginBottom: '12px', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
            }}>
              <div>
                <div style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>HỌC SINH ĐANG ĐI XE</div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>Phạm Phương Chi</h3>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Lớp 2C · Tuyến xe: BUS-01</div>
              </div>
              <div style={{ 
                width: '38px', height: '38px', borderRadius: '50%', 
                background: 'var(--primary-teal)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', 
                fontWeight: 800, color: '#fff', fontSize: '0.85rem' 
              }}>
                PC
              </div>
            </div>

            {/* GPS Live Map */}
            <div style={{ 
              height: '200px', borderRadius: '14px', overflow: 'hidden', 
              marginBottom: '12px', border: isDeviated ? '2px solid var(--danger-red)' : '1px solid var(--border-card)' 
            }}>
              <LiveMapSimulator isDeviated={isDeviated} eta={isDeviated ? '? phút' : '8 phút'} speed={isDeviated ? 52 : 38} />
            </div>

            {/* Status Summary */}
            <div style={{ 
              background: 'var(--bg-card-hover)', 
              border: '1px solid var(--border-card)', 
              borderRadius: '12px', padding: '10px', marginBottom: '12px' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Trạng Thái Bé</span>
                {isDeviated
                  ? <span className="badge-danger" style={{ fontSize: '0.65rem' }}>LỆCH TUYẾN</span>
                  : <span className="badge-safe" style={{ fontSize: '0.65rem' }}>ĐANG TRÊN XE BUS-01</span>
                }
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.72rem' }}>
                <div style={{ background: 'var(--bg-card)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>ETA Tới Trường</div>
                  <div style={{ fontWeight: 800, color: isDeviated ? 'var(--danger-red)' : 'var(--primary-blue)', fontFamily: 'var(--font-mono)' }}>
                    {isDeviated ? 'Đang cập nhật…' : '07:45 AM'}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-card)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-card)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.6rem' }}>Độ Chính Xác GPS</div>
                  <div style={{ fontWeight: 800, color: isDeviated ? 'var(--danger-red)' : 'var(--emerald-safe)', fontFamily: 'var(--font-mono)' }}>
                    {isDeviated ? 'Yếu (280m)' : 'Tốt (4.2m)'}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div style={{ marginBottom: '14px' }}>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700 }}>Lịch Sử Di Chuyển Hôm Nay</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingLeft: '8px', borderLeft: '2px solid rgba(8,145,178,0.3)' }}>
                <div style={{ position: 'relative', paddingLeft: '12px' }}>
                  <div style={{ position: 'absolute', left: '-17px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--emerald-safe)' }} />
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)' }}>07:15 SA – Đã lên xe Bus 01</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Quét AI khuôn mặt nhận dạng thành công</div>
                </div>
                <div style={{ position: 'relative', paddingLeft: '12px' }}>
                  <div style={{ position: 'absolute', left: '-17px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-main)' }}>07:30 SA – Qua trạm Pearl Plaza</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Vận tốc 38 km/h · Đúng lộ trình</div>
                </div>
              </div>
            </div>

            {/* Phone buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.7rem', padding: '8px' }}>
                <Phone size={12} color="var(--emerald-safe)" /> Gọi Tài Xế
              </button>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center', fontSize: '0.7rem', padding: '8px' }}>
                <MessageSquare size={12} color="var(--accent-cyan)" /> Nhắn Giáo Viên
              </button>
            </div>
          </div>
        )}

        {/* ──────── TAB 2: REGISTER ──────── */}
        {activeTab === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Đăng Ký Tuyến Đi & Khuôn Mặt AI
              </h3>
              <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                Đăng ký vé xe đưa đón và chụp mẫu nhận diện thông minh cho con
              </p>
            </div>

            {/* AI Setup Status */}
            {modelStatus !== 'ready' ? (
              <div style={{ 
                background: 'var(--bg-card-hover)', 
                border: '1px solid var(--border-card)', 
                padding: '12px', borderRadius: '12px', 
                textAlign: 'center' 
              }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  {modelMsg}
                </p>
                <button 
                  onClick={initAiModels}
                  disabled={modelStatus === 'loading'}
                  className="btn-primary"
                  style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                >
                  {modelStatus === 'loading' ? <RefreshCw size={14} className="spin" /> : <Video size={14} />}
                  <span>Kích Hoạt AI Camera</span>
                </button>
              </div>
            ) : (
              /* Camera Active Section */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ 
                  position: 'relative', 
                  width: '100%', 
                  height: '210px', 
                  background: '#050a17', 
                  borderRadius: '12px', 
                  overflow: 'hidden',
                  border: '1px solid var(--border-card)'
                }}>
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

                  {!cameraActive && (
                    <div style={{ 
                      width: '100%', height: '100%', 
                      display: 'flex', flexDirection: 'column', 
                      alignItems: 'center', justifyContent: 'center', 
                      color: '#ffffff', gap: '12px',
                      background: 'radial-gradient(circle, #1e293b 0%, #090d1a 100%)'
                    }}>
                      <Video size={36} color="var(--accent-cyan)" />
                      <button 
                        type="button"
                        onClick={startWebcam}
                        className="btn-primary"
                        style={{ fontSize: '0.8rem', padding: '8px 16px', fontWeight: 700 }}
                      >
                        <Video size={16} /> Bật Camera Lấy Mẫu
                      </button>
                    </div>
                  )}
                </div>

                <p style={{ fontSize: '0.65rem', color: 'var(--accent-cyan)', textAlign: 'center', fontWeight: 600 }}>
                  {modelMsg}
                </p>

                {cameraActive && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button"
                      onClick={captureSample}
                      disabled={isCapturing}
                      className="btn-primary"
                      style={{ flex: 2, fontSize: '0.75rem', padding: '8px', justifyContent: 'center' }}
                    >
                      <Camera size={14} /> 
                      <span>
                        {isCapturing 
                          ? 'Đang trích xuất...' 
                          : (capturedDescriptors.length >= 1 ? 'Chụp Lại Ảnh Minh Chứng' : 'Chụp Ảnh Minh Chứng')}
                      </span>
                    </button>
                    <button 
                      type="button"
                      onClick={stopWebcam}
                      className="btn-secondary"
                      style={{ flex: 1, fontSize: '0.75rem', padding: '8px', justifyContent: 'center' }}
                    >
                      Tắt Cam
                    </button>
                  </div>
                )}

                {/* Thumbnail Previews */}
                {capturedThumbs.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>Ảnh minh chứng khuôn mặt:</span>
                      <span onClick={() => { setCapturedThumbs([]); setCapturedDescriptors([]); }} style={{ color: 'var(--danger-red)', cursor: 'pointer' }}>Xóa ảnh</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {capturedThumbs.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '48px', height: '48px', borderRadius: '6px', overflow: 'hidden', border: '2px solid var(--accent-cyan)' }}>
                          <img src={url} alt={`thumb-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Mã số học sinh (ID)
                </label>
                <input 
                  type="text" 
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Ví dụ: HS-005"
                  required
                  style={{
                    width: '100%',
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Họ tên của con
                </label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Phạm Minh Khang"
                  required
                  style={{
                    width: '100%',
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '3px' }}>
                  Tuyến Xe Đăng Ký
                </label>
                <select 
                  value={busId}
                  onChange={(e) => setBusId(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-card-hover)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                >
                  <option value="BUS-01">Tuyến 1: BUS-01 (Quận 2 - Bình Thạnh)</option>
                  <option value="BUS-02">Tuyến 2: BUS-02 (Quận 7 - Nhà Bè)</option>
                  <option value="BUS-03">Tuyến 3: BUS-03 (Thủ Đức - Q9)</option>
                  <option value="BUS-04">Tuyến 4: BUS-04 (Tân Bình - Phú Nhuận)</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={capturedDescriptors.length < 1}
                style={{ 
                  width: '100%', justifyContent: 'center', 
                  fontSize: '0.8rem', padding: '8px', 
                  marginTop: '4px',
                  opacity: capturedDescriptors.length < 1 ? 0.6 : 1 
                }}
              >
                <Plus size={14} /> Hoàn Tất Đăng Ký
              </button>
            </form>

            {/* List of registered children */}
            <div style={{ marginTop: '4px', borderTop: '1px solid var(--border-card)', paddingTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>
                <HeartHandshake size={12} color="var(--primary-blue)" />
                <span>Danh sách con đã đăng ký ({registeredStudents.length}):</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                {registeredStudents.map(s => (
                  <div key={s.student_id} style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--bg-card-hover)', padding: '6px 8px', borderRadius: '8px',
                    border: '1px solid var(--border-card)', fontSize: '0.7rem'
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{s.full_name} ({s.student_id})</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                        ✓ {s.descriptors ? s.descriptors.length : 0} mẫu mặt · Xe đăng ký
                      </div>
                    </div>
                    {/* Only allow deleting non-mock students or allow deleting all to test */}
                    <button 
                      onClick={() => handleDelete(s.student_id, s.full_name)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--danger-red)' }}
                      title="Xóa đăng ký"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
      <style>{`
        .spin {
          animation: spin-anim 1s linear infinite;
        }
        @keyframes spin-anim {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
