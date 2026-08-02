import React from 'react';
import { Camera, Video, AlertCircle, RefreshCw } from 'lucide-react';

// Distance calculation utility
function distance(p1, p2) {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

// Calculate EAR (Eye Aspect Ratio) from 68 landmarks
function calculateEAR(landmarks) {
  // Left eye: indices 36 to 41
  const l1 = landmarks[36];
  const l2 = landmarks[37];
  const l3 = landmarks[38];
  const l4 = landmarks[39];
  const l5 = landmarks[40];
  const l6 = landmarks[41];
  const leftEAR = (distance(l2, l6) + distance(l3, l5)) / (2.0 * distance(l1, l4));

  // Right eye: indices 42 to 47
  const r1 = landmarks[42];
  const r2 = landmarks[43];
  const r3 = landmarks[44];
  const r4 = landmarks[45];
  const r5 = landmarks[46];
  const r6 = landmarks[47];
  const rightEAR = (distance(r2, r6) + distance(r3, r5)) / (2.0 * distance(r1, r4));

  return (leftEAR + rightEAR) / 2.0;
}

// Calculate MAR (Mouth Aspect Ratio) from 68 landmarks
function calculateMAR(landmarks) {
  // Inner lip landmarks: 60 to 67
  const p_left = landmarks[60];
  const p_top = landmarks[62];
  const p_right = landmarks[64];
  const p_bottom = landmarks[66];

  const horizontal = distance(p_left, p_right);
  const vertical = distance(p_top, p_bottom);

  if (horizontal === 0) return 0.0;
  return vertical / horizontal;
}

// Estimate Pitch angle (head nodding) from 68 landmarks
function calculatePitch(landmarks) {
  const bridge = landmarks[27];
  const tip = landmarks[30];
  const chin = landmarks[8];

  const d1 = Math.abs(bridge.y - tip.y);
  const d2 = Math.abs(bridge.y - chin.y);
  if (d2 === 0) return 0;
  const ratio = d1 / d2;

  // Straight is ~0.35. Compressed vertical ratio (< 0.28) implies head tilt downwards
  if (ratio < 0.28) {
    return 25; // Map to 25 degrees
  }
  return 0;
}

export default function CameraAiOverlay({ 
  mode = 'driver', // 'driver' | 'attendance'
  isDrowsy = false, 
  ear = 0.28,
  mar = 0.12,
  onMetricsUpdate,
  onStudentRecognized
}) {
  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const detectLoopRef = React.useRef(null);

  const [useWebcam, setUseWebcam] = React.useState(false);
  const [webcamError, setWebcamError] = React.useState(null);

  // Real-time face-api.js frame-by-frame loop for Driver camera
  const startFaceDetectLoop = () => {
    const detect = async () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const faceapi = window.faceapi;

        if (faceapi) {
          try {
            const result = await faceapi.detectSingleFace(
              video,
              new faceapi.TinyFaceDetectorOptions({ inputSize: 160 })
            ).withFaceLandmarks();

            const ctx = canvas.getContext('2d');
            const dims = faceapi.matchDimensions(canvas, video, true);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (result) {
              // Draw real landmarks & bounding box
              const resized = faceapi.resizeResults(result, dims);
              const boxColor = isDrowsy ? '#ef4444' : '#06b6d4';
              const { x, y, width, height } = resized.detection.box;

              // Draw Face Reticle Box
              ctx.strokeStyle = boxColor;
              ctx.lineWidth = 2;
              ctx.strokeRect(x, y, width, height);

              // Draw eye landmarks (dots 36 to 47)
              const landmarks = resized.landmarks.positions;
              ctx.fillStyle = isDrowsy ? '#ef4444' : '#10b981';
              for (let i = 36; i < 48; i++) {
                ctx.beginPath();
                ctx.arc(landmarks[i].x, landmarks[i].y, 2, 0, 2 * Math.PI);
                ctx.fill();
              }

              // Draw inner mouth landmarks (dots 60 to 67)
              ctx.fillStyle = '#f59e0b';
              for (let i = 60; i < 68; i++) {
                ctx.beginPath();
                ctx.arc(landmarks[i].x, landmarks[i].y, 2, 0, 2 * Math.PI);
                ctx.fill();
              }

              // Calculate actual EAR, MAR, Pitch from RAW un-resized positions
              const rawLandmarks = result.landmarks.positions;
              const computedEar = calculateEAR(rawLandmarks);
              const computedMar = calculateMAR(rawLandmarks);
              const computedPitch = calculatePitch(rawLandmarks);

              if (onMetricsUpdate) {
                onMetricsUpdate(computedEar, computedMar, computedPitch);
              }
            } else {
              // No face detected, revert to null so parent uses mock simulation / awake default
              if (onMetricsUpdate) {
                onMetricsUpdate(null, null, null);
              }
            }
          } catch (err) {
            console.warn("Face detect loop error:", err);
          }
        }
      }
      detectLoopRef.current = requestAnimationFrame(detect);
    };
    detectLoopRef.current = requestAnimationFrame(detect);
  };

  const stopFaceDetectLoop = () => {
    if (detectLoopRef.current) {
      cancelAnimationFrame(detectLoopRef.current);
      detectLoopRef.current = null;
    }
  };

  const startWebcam = async () => {
    try {
      setWebcamError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setUseWebcam(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          startFaceDetectLoop();
        }
      }, 50);
    } catch (err) {
      console.warn("Webcam access error:", err);
      setWebcamError("Không thể truy cập Webcam thiết bị. Đang dùng AI Camera Simulator.");
      setUseWebcam(false);
    }
  };

  const stopWebcam = () => {
    stopFaceDetectLoop();
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setUseWebcam(false);

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    if (onMetricsUpdate) {
      onMetricsUpdate(null, null, null);
    }
  };

  // Clean up webcam on unmount
  React.useEffect(() => {
    return () => {
      stopFaceDetectLoop();
      stopWebcam();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '210px', background: '#050a17', borderRadius: '14px', overflow: 'hidden', border: isDrowsy ? '2px solid #ef4444' : '1px solid var(--border-card)' }}>
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

      {/* Layer 2: HUD Computer Vision Overlays & Canvas */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {/* Dynamic scan line effect */}
        <div className="scan-line" style={{ zIndex: 3 }} />

        {/* Real-time landmark canvas overlay */}
        <canvas 
          ref={canvasRef} 
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            width: '100%', 
            height: '100%',
            display: useWebcam ? 'block' : 'none',
            zIndex: 4
          }} 
        />

        {/* AI HUD Status indicator */}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: '6px', alignItems: 'center', zIndex: 5 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: isDrowsy ? '#ef4444' : '#10b981', animation: 'pulse 1s infinite' }} />
          <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
            AI ENGINE ACTIVE
          </span>
        </div>

        {/* HUD grid corners */}
        <div style={{ position: 'absolute', top: 12, left: 12, width: 8, height: 8, borderTop: '2px solid rgba(255,255,255,0.4)', borderLeft: '2px solid rgba(255,255,255,0.4)', zIndex: 5 }} />
        <div style={{ position: 'absolute', top: 12, right: 12, width: 8, height: 8, borderTop: '2px solid rgba(255,255,255,0.4)', borderRight: '2px solid rgba(255,255,255,0.4)', zIndex: 5 }} />
        <div style={{ position: 'absolute', bottom: 12, left: 12, width: 8, height: 8, borderBottom: '2px solid rgba(255,255,255,0.4)', borderLeft: '2px solid rgba(255,255,255,0.4)', zIndex: 5 }} />
        <div style={{ position: 'absolute', bottom: 12, right: 12, width: 8, height: 8, borderBottom: '2px solid rgba(255,255,255,0.4)', borderRight: '2px solid rgba(255,255,255,0.4)', zIndex: 5 }} />

        {/* Driver Drowsiness fatigue scanner box (Only visible in simulation mode, hidden when live webcam is active) */}
        {mode === 'driver' && !useWebcam && (
          <div style={{ position: 'relative', width: '220px', height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
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
            </div>
          </div>
        )}

        {/* Global Drowsiness Stats Badge (Always visible at the bottom of the view) */}
        {mode === 'driver' && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid var(--border-card)',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.65rem',
            color: isDrowsy ? '#ef4444' : '#38bdf8',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap',
            zIndex: 10
          }}>
            {isDrowsy ? `EAR: ${ear.toFixed(2)} (CẢNH BÁO NHẮM MẮT!)` : `EAR: ${ear.toFixed(2)} | MAR: ${mar.toFixed(2)}`}
          </div>
        )}

        {/* Student attendance face match box */}
        {mode === 'attendance' && (
          <div style={{ position: 'relative', width: '220px', height: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
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
