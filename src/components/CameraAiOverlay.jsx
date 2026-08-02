import React from 'react';
import { Camera, Video, AlertCircle, RefreshCw } from 'lucide-react';

export default function CameraAiOverlay({ 
  mode = 'driver', // 'driver' | 'attendance'
  isDrowsy = false, 
  ear = 0.28,
  mar = 0.12,
  onStudentRecognized
}) {
  const videoRef = React.useRef(null);
  const [useWebcam, setUseWebcam] = React.useState(false);
  const [webcamError, setWebcamError] = React.useState(null);

  // Toggle Webcam vs Synthetic AI Simulation stream
  const startWebcam = async () => {
    try {
      setWebcamError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setUseWebcam(true);
      }
    } catch (err) {
      console.warn("Webcam access error:", err);
      setWebcamError("Không thể truy cập Webcam thiết bị. Đang dùng AI Camera Simulator.");
      setUseWebcam(false);
    }
  };

  const stopWebcam = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setUseWebcam(false);
  };

  // Clean up webcam on unmount
  React.useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '280px', background: '#050a17', borderRadius: '14px', overflow: 'hidden', border: isDrowsy ? '2px solid #ef4444' : '1px solid var(--border-card)' }}>
      {/* Top Overlay Header controls */}
      <div style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="badge-ai" style={{ background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(6px)' }}>
          <Camera size={14} color="var(--accent-cyan)" />
          <span>{mode === 'driver' ? 'AI Driver Eye/Face Camera (Inferensys)' : 'Face Recognition Stream (face-api.js)'}</span>
        </div>

        <button 
          onClick={useWebcam ? stopWebcam : startWebcam}
          style={{
            background: useWebcam ? 'rgba(239, 68, 68, 0.2)' : 'rgba(6, 182, 212, 0.2)',
            border: useWebcam ? '1px solid #ef4444' : '1px solid var(--accent-cyan)',
            color: useWebcam ? '#f87171' : '#38bdf8',
            borderRadius: '6px',
            padding: '4px 10px',
            fontSize: '0.7rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'auto'
          }}
        >
          {useWebcam ? <RefreshCw size={12} /> : <Video size={12} />}
          {useWebcam ? 'Tắt Webcam Live' : 'Mở Webcam Live'}
        </button>
      </div>

      {/* Layer 1: Live Video or Synthetic Backdrop */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            display: useWebcam ? 'block' : 'none'
          }} 
        />
        {!useWebcam && (
          <div style={{
            width: '100%',
            height: '100%',
            background: mode === 'driver' ? 'radial-gradient(circle, #1e293b 0%, #090d1a 100%)' : 'radial-gradient(circle, #0f172a 0%, #040711 100%)'
          }} />
        )}
      </div>

      {/* Layer 2: HUD Computer Vision Overlays */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Dynamic scan line effect */}
        <div className="scan-line" style={{ zIndex: 3 }} />

        {/* AI HUD Status indicator */}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: '6px', alignItems: 'center', zIndex: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: isDrowsy ? '#ef4444' : '#10b981', animation: 'pulse 1s infinite' }} />
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            AI ENGINE ACTIVE
          </span>
        </div>

        {/* HUD grid corners */}
        <div style={{ position: 'absolute', top: 12, left: 12, width: 8, height: 8, borderTop: '2px solid rgba(255,255,255,0.4)', borderLeft: '2px solid rgba(255,255,255,0.4)' }} />
        <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderTop: '2px solid rgba(255,255,255,0.4)', borderRight: '2px solid rgba(255,255,255,0.4)' }} />
        <div style={{ position: 'absolute', bottom: 12, left: 12, width: 8, height: 8, borderBottom: '2px solid rgba(255,255,255,0.4)', borderLeft: '2px solid rgba(255,255,255,0.4)' }} />
        <div style={{ position: 'absolute', bottom: 12, right: 12, width: 8, height: 8, borderBottom: '2px solid rgba(255,255,255,0.4)', borderRight: '2px solid rgba(255,255,255,0.4)' }} />

        {/* Driver Drowsiness fatigue scanner box */}
        {mode === 'driver' && (
          <div style={{ position: 'relative', width: '220px', height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute',
              width: '180px',
              height: '200px',
              border: isDrowsy ? '2px dashed #ef4444' : '2px dashed #06b6d4',
              borderRadius: '16px',
              boxShadow: isDrowsy ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 15px rgba(6, 182, 212, 0.2)',
              background: isDrowsy ? 'rgba(239, 68, 68, 0.05)' : 'rgba(6, 182, 212, 0.03)',
              transition: 'all 0.3s ease'
            }}>
              {/* Corner reticles */}
              <div style={{ position: 'absolute', top: -4, left: -4, width: 12, height: 12, borderTop: '3px solid #38bdf8', borderLeft: '3px solid #38bdf8' }} />
              <div style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderTop: '3px solid #38bdf8', borderRight: '3px solid #38bdf8' }} />
              <div style={{ position: 'absolute', bottom: -4, left: -4, width: 12, height: 12, borderBottom: '3px solid #38bdf8', borderLeft: '3px solid #38bdf8' }} />
              <div style={{ position: 'absolute', bottom: -4, right: -4, width: 12, height: 12, borderBottom: '3px solid #38bdf8', borderRight: '3px solid #38bdf8' }} />

              {/* Eyes Landmark Points Simulation */}
              <div style={{ position: 'absolute', top: '75px', left: '40px', display: 'flex', gap: '50px' }}>
                <div style={{
                  width: 24, height: isDrowsy ? 2 : 12, 
                  borderRadius: isDrowsy ? 0 : '50%',
                  background: isDrowsy ? '#ef4444' : '#06b6d4',
                  border: '1px solid #ffffff'
                }} />
                <div style={{
                  width: 24, height: isDrowsy ? 2 : 12, 
                  borderRadius: isDrowsy ? 0 : '50%',
                  background: isDrowsy ? '#ef4444' : '#06b6d4',
                  border: '1px solid #ffffff'
                }} />
              </div>

              {/* Mouth Point (MAR Yawn Detector) */}
              <div style={{
                position: 'absolute',
                top: '130px',
                left: '65px',
                width: 50,
                height: isDrowsy ? 24 : 10,
                borderRadius: '12px',
                border: '1px solid #f59e0b',
                background: isDrowsy ? 'rgba(245, 158, 11, 0.3)' : 'transparent'
              }} />

              {/* Confidence Badge */}
              <div style={{
                position: 'absolute',
                bottom: '-28px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(15, 23, 42, 0.9)',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.65rem',
                color: isDrowsy ? '#ef4444' : '#38bdf8',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap'
              }}>
                {isDrowsy ? `EAR: ${ear.toFixed(2)} (NHẮM MẮT!)` : `EAR: ${ear.toFixed(2)} | MAR: ${mar.toFixed(2)}`}
              </div>
            </div>
          </div>
        )}

        {/* Student attendance face match box */}
        {mode === 'attendance' && (
          <div style={{ position: 'relative', width: '220px', height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{
              position: 'absolute',
              width: '170px',
              height: '190px',
              border: '2px solid var(--emerald-safe)',
              borderRadius: '14px',
              boxShadow: '0 0 20px rgba(4, 120, 87, 0.15)',
              background: 'rgba(4, 120, 87, 0.05)'
            }}>
              <div style={{ position: 'absolute', top: -4, left: -4, width: 12, height: 12, borderTop: '3px solid var(--emerald-safe)', borderLeft: '3px solid var(--emerald-safe)' }} />
              <div style={{ position: 'absolute', top: -4, right: -4, width: 12, height: 12, borderTop: '3px solid var(--emerald-safe)', borderRight: '3px solid var(--emerald-safe)' }} />
              <div style={{ position: 'absolute', bottom: -4, left: -4, width: 12, height: 12, borderBottom: '3px solid var(--emerald-safe)', borderLeft: '3px solid var(--emerald-safe)' }} />
              <div style={{ position: 'absolute', bottom: -4, right: -4, width: 12, height: 12, borderBottom: '3px solid var(--emerald-safe)', borderRight: '3px solid var(--emerald-safe)' }} />

              <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-card)', padding: '4px 6px', borderRadius: '6px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--emerald-safe)' }}>
                  Em: Nguyễn Minh Anh
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Vector Match: 99.4% (Thành công)
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Webcam Error Warning Notice */}
      {webcamError && (
        <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '6px 10px', borderRadius: '6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 12 }}>
          <AlertCircle size={14} /> {webcamError}
        </div>
      )}
    </div>
  );
}
