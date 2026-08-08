/**
 * Central Emergency & Alert Dispatch Engine (EduSafe Alert Bus)
 * Đồng bộ sự cố khẩn cấp và cảnh báo thời gian thực giữa Phụ huynh, Tài xế, Giáo viên và Ban Giám Hiệu
 */

const STORAGE_KEY = 'edusafe_emergency_alerts';
const SIM_KEY = 'edusafe_shared_simulations';
const CHANNEL_NAME = 'edusafe_emergency_broadcast_v1';

let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not available, using Storage events fallback');
}

// Web Audio Synthesizer for Emergency Chimes & Alarms
export function playAlertSound(severity = 'warning') {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (severity === 'critical' || severity === 'sos') {
      // 2-tone emergency siren
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4); // A4
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } else {
      // High-priority notification chime
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (err) {
    // Audio context may be blocked before user interaction
  }
}

/**
 * Lấy danh sách toàn bộ cảnh báo đang hoạt động
 */
export function getActiveAlerts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Phát tín hiệu cảnh báo / SOS tới toàn bộ các bên liên quan
 * @param {Object} alertPayload
 */
export function dispatchAlert({
  source = 'Hệ thống',
  senderRole = 'parent',
  type = 'parent_alert', // 'parent_alert' | 'sos' | 'route_deviation' | 'drowsiness' | 'left_behind'
  title = 'Cảnh báo khẩn cấp',
  message = '',
  busId = 'BUS-01',
  severity = 'critical', // 'critical' | 'high' | 'warning'
  channels = ['BGH Nhà trường', 'Tài xế BUS-01', 'GV Giám sát', 'Phụ huynh']
}) {
  const newAlert = {
    id: `ALERT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    source,
    senderRole,
    type,
    title,
    message,
    busId,
    severity,
    channels,
    timestamp: new Date().toLocaleTimeString('vi-VN'),
    isoTime: new Date().toISOString(),
    status: 'active'
  };

  try {
    const currentAlerts = getActiveAlerts();
    // Giữ tối đa 20 cảnh báo gần nhất
    const updated = [newAlert, ...currentAlerts.filter(a => a.status === 'active')].slice(0, 20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    // Nếu là chệch tuyến -> tự động kích hoạt cờ routeDev
    if (type === 'parent_alert' || type === 'route_deviation') {
      const sims = getSharedSimulations();
      saveSharedSimulations({ ...sims, routeDev: true });
    }

    // Broadcast tới các tab & window khác
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'NEW_ALERT', payload: newAlert });
    }
    window.dispatchEvent(new CustomEvent('edusafe_new_alert', { detail: newAlert }));
    window.dispatchEvent(new Event('storage'));

    // Phát âm thanh cảnh báo
    playAlertSound(severity);
  } catch (err) {
    console.error('Error dispatching alert:', err);
  }

  return newAlert;
}

/**
 * Tiếp nhận & xử lý / Tắt cảnh báo
 */
export function acknowledgeAlert(alertId, handlerName = 'Quản trị viên') {
  try {
    const currentAlerts = getActiveAlerts();
    const updated = currentAlerts.map(a => 
      a.id === alertId ? { ...a, status: 'acknowledged', handledBy: handlerName, handledAt: new Date().toLocaleTimeString('vi-VN') } : a
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'ACK_ALERT', payload: { alertId, handlerName } });
    }
    window.dispatchEvent(new CustomEvent('edusafe_ack_alert', { detail: { alertId, handlerName } }));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {}
}

/**
 * Xóa toàn bộ cảnh báo
 */
export function clearAllAlerts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'CLEAR_ALERTS' });
    }
    window.dispatchEvent(new Event('storage'));
  } catch (e) {}
}

/**
 * Lấy simulations state được đồng bộ giữa các tab
 */
export function getSharedSimulations() {
  try {
    const raw = localStorage.getItem(SIM_KEY);
    return raw ? JSON.parse(raw) : { drowsiness: false, leftBehind: false, routeDev: false };
  } catch (e) {
    return { drowsiness: false, leftBehind: false, routeDev: false };
  }
}

/**
 * Lưu simulations state được đồng bộ giữa các tab
 */
export function saveSharedSimulations(sims) {
  try {
    localStorage.setItem(SIM_KEY, JSON.stringify(sims));
    if (broadcastChannel) {
      broadcastChannel.postMessage({ type: 'SIMULATION_CHANGE', payload: sims });
    }
    window.dispatchEvent(new CustomEvent('edusafe_sim_change', { detail: sims }));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {}
}

/**
 * Đăng ký lắng nghe sự kiện cảnh báo thời gian thực
 */
export function subscribeToAlerts(callback) {
  const handler = () => {
    callback(getActiveAlerts());
  };

  window.addEventListener('edusafe_new_alert', handler);
  window.addEventListener('edusafe_ack_alert', handler);
  window.addEventListener('storage', handler);

  let bcHandler = null;
  if (broadcastChannel) {
    bcHandler = () => handler();
    broadcastChannel.addEventListener('message', bcHandler);
  }

  return () => {
    window.removeEventListener('edusafe_new_alert', handler);
    window.removeEventListener('edusafe_ack_alert', handler);
    window.removeEventListener('storage', handler);
    if (broadcastChannel && bcHandler) {
      broadcastChannel.removeEventListener('message', bcHandler);
    }
  };
}
