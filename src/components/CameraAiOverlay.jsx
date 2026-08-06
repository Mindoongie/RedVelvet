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
              // Calculate actual EAR, MAR, Pitch from RAW un-resized positions
              const rawLandmarks = result.landmarks.positions;
              // Scale EAR by 1.35 to adjust raw 2D landmark ratio offset for normal webcam inputs
              const computedEar = calculateEAR(rawLandmarks) * 1.35;
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
      {/* Top absolute camera button (Clean view overlay) */}
      <button 
        onClick={useWebcam ? stopWebcam : startWebcam}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 10,
          background: useWebcam ? 'rgba(239, 68, 68, 0.85)' : 'rgba(6, 182, 212, 0.85)',
          border: useWebcam ? '1px solid #ef4444' : '1px solid var(--accent-cyan)',
          color: '#ffffff',
          borderRadius: '6px',
          padding: '5px 12px',
          fontSize: '0.72rem',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'auto',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
        }}
      >
        {useWebcam ? <RefreshCw size={12} /> : <Video size={12} />}
        {useWebcam ? 'Tắt Webcam Live' : 'Mở Webcam Live'}
      </button>

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
            background: mode === 'driver' ? 'radial-gradient(circle, #1e293b 0%, #090d1a 100%)' : 'radial-gradient(circle, #0f172a 0%, #040711 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.8rem',
            fontWeight: 500,
            flexDirection: 'column',
            gap: '8px'
          }}>
            <Camera size={28} color="rgba(255,255,255,0.2)" />
            <span>Camera giám sát tài xế đang tắt</span>
          </div>
        )}
      </div>

      {/* Layer 2: Transparent canvas for dimensions and error notices */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
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
