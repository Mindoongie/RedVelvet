/**
 * Lõi Cảnh Báo Buồn Ngủ Đa Tầng của Tài Xế (Driver Drowsiness Engine)
 * Được chuyển đổi từ module Python của nhánh cuce sang ES6 Javascript
 */

// Cấu hình mặc định (tương ứng config.yaml trong nhánh cuce)
export const DROWSINESS_CONFIG = {
  // Hysteresis chống rung cho EAR (vùng chết từ 0.19 đến 0.23)
  ear_vao: 0.19,
  ear_ra: 0.23,

  // Ngưỡng theo mức rủi ro nền (Lớp 3)
  nguong_theo_muc_nen: {
    binh_thuong: { nham_mat_giay: 1.2, perclos_canh_bao: 0.35 },
    cao: { nham_mat_giay: 0.8, perclos_canh_bao: 0.28 }
  },

  perclos: {
    cua_so_giay: 60,
    nguong_perclos_cao: 0.35 // Quy tắc cứng: PERCLOS >= 0.35 -> tối thiểu mức 2
  },

  ngap: {
    nguong_mar: 0.55,
    nguong_ngap_giay: 1.5,
    debounce_giay: 3.0,
    cua_so_phut: 3
  },

  gat_dau: {
    nguong_pitch_do: 20,
    toi_thieu_giu_giay: 1.0,
    hoi_phuc_toi_da_giay: 4.0,
    cua_so_phut: 3
  },

  noisy_or: {
    trong_so: {
      perclos: 0.9,
      ngap_phut: 0.6,
      gat_phut: 0.7,
      layer1_gan_day: 0.8
    },
    chuan_hoa: {
      nguong_ngap_phut_max: 3,
      nguong_gat_phut_max: 4,
      cua_so_layer1_giay: 90
    },
    muc_theo_risk: [
      { muc: 3, nguong: 0.75 },
      { muc: 2, nguong: 0.5 },
      { muc: 1, nguong: 0.25 },
      { muc: 0, nguong: 0.0 }
    ]
  }
};

/**
 * Lớp tích lũy tính chỉ số PERCLOS trên cửa sổ trượt 60 giây
 */
export class PerclosAccumulator {
  constructor(windowSeconds = 60) {
    this.windowMs = windowSeconds * 1000;
    this.history = []; // các khoảng [{ t_start, t_end, isClosed }]
    this.lastState = false; // true = Closed, false = Open
    this.lastStateTime = null;
  }

  update(isClosed, timestampMs) {
    if (this.lastStateTime === null) {
      this.lastStateTime = timestampMs;
      this.lastState = isClosed;
      return 0.0;
    }

    // Lưu khoảng thời gian vừa qua
    const duration = timestampMs - this.lastStateTime;
    if (duration > 0) {
      this.history.push({
        t_start: this.lastStateTime,
        t_end: timestampMs,
        isClosed: this.lastState
      });
    }

    this.lastStateTime = timestampMs;
    this.lastState = isClosed;

    // Dọn dẹp các bản ghi cũ nằm ngoài cửa sổ trượt
    const cutoff = timestampMs - this.windowMs;
    this.history = this.history.filter(h => h.t_end > cutoff);

    // Tính tỷ lệ nhắm mắt
    let closedTime = 0;
    let totalTime = 0;

    this.history.forEach(h => {
      // Cắt bớt phần nằm trước cutoff
      const start = Math.max(h.t_start, cutoff);
      const end = h.t_end;
      const dur = end - start;

      if (dur > 0) {
        totalTime += dur;
        if (h.isClosed) {
          closedTime += dur;
        }
      }
    });

    if (totalTime === 0) return isClosed ? 1.0 : 0.0;
    return closedTime / totalTime;
  }

  reset() {
    this.history = [];
    this.lastStateTime = null;
  }
}

/**
 * Bộ phát hiện ngáp dựa trên MAR
 */
export class YawnDetector {
  constructor(cfg = DROWSINESS_CONFIG.ngap) {
    this.cfg = cfg;
    this.events = []; // danh sách timestamp các lần ngáp
    this.yawnStartMs = null;
    this.lastYawnEndMs = 0;
  }

  update(mar, timestampMs) {
    const isMouthOpen = mar >= this.cfg.nguong_mar;

    if (isMouthOpen) {
      if (this.yawnStartMs === null) {
        this.yawnStartMs = timestampMs;
      } else {
        const durationSec = (timestampMs - this.yawnStartMs) / 1000.0;
        if (durationSec >= this.cfg.nguong_ngap_giay) {
          // Đạt tiêu chuẩn ngáp
          if (timestampMs - this.lastYawnEndMs >= this.cfg.debounce_giay * 1000) {
            this.events.push(timestampMs);
            this.lastYawnEndMs = timestampMs;
          }
          this.yawnStartMs = null; // Reset chốt
        }
      }
    } else {
      this.yawnStartMs = null;
    }
  }

  getEventsPerMinute(nowMs) {
    const windowMs = this.cfg.cua_so_phut * 60 * 1000;
    const cutoff = nowMs - windowMs;
    this.events = this.events.filter(t => t > cutoff);

    if (this.events.length === 0) return 0.0;
    const earliest = Math.min(...this.events);
    const elapsedMinutes = Math.max(0.1, (nowMs - earliest) / (60 * 1000));
    return this.events.length / elapsedMinutes;
  }
}

/**
 * Bộ phát hiện gật đầu dựa trên góc Pitch
 */
export class NodDetector {
  constructor(cfg = DROWSINESS_CONFIG.gat_dau) {
    this.cfg = cfg;
    this.events = []; // danh sách timestamp các lần gật đầu
    this.nodStartMs = null;
    this.isNodRegistered = false;
  }

  update(pitchDeg, timestampMs) {
    const isNodding = pitchDeg >= this.cfg.nguong_pitch_do;

    if (isNodding) {
      if (this.nodStartMs === null) {
        this.nodStartMs = timestampMs;
        this.isNodRegistered = false;
      } else {
        const durationSec = (timestampMs - this.nodStartMs) / 1000.0;
        // Đường 1: Gục đầu giữ quá lâu (1.0s) -> Kích hoạt ngay
        if (durationSec >= this.cfg.toi_thieu_giu_giay && !this.isNodRegistered) {
          this.events.push(timestampMs);
          this.isNodRegistered = true;
        }
      }
    } else {
      if (this.nodStartMs !== null) {
        const durationSec = (timestampMs - this.nodStartMs) / 1000.0;
        // Đường 2: Gật nhanh chúi xuống rồi ngẩng lên (dưới 4s) -> Ghi nhận sự kiện gật đầu
        if (durationSec > 0.1 && durationSec < this.cfg.hoi_phuc_toi_da_giay && !this.isNodRegistered) {
          this.events.push(timestampMs);
        }
      }
      this.nodStartMs = null;
      this.isNodRegistered = false;
    }
  }

  getEventsPerMinute(nowMs) {
    const windowMs = this.cfg.cua_so_phut * 60 * 1000;
    const cutoff = nowMs - windowMs;
    this.events = this.events.filter(t => t > cutoff);

    if (this.events.length === 0) return 0.0;
    const earliest = Math.min(...this.events);
    const elapsedMinutes = Math.max(0.1, (nowMs - earliest) / (60 * 1000));
    return this.events.length / elapsedMinutes;
  }
}

/**
 * Bộ kiểm soát tích hợp Noisy-OR Fusion
 */
export class NoisyOrFusion {
  constructor(cfg = DROWSINESS_CONFIG.noisy_or) {
    this.cfg = cfg;
  }

  calculate(perclos, perclosAlertThreshold, yawnsPerMin, nodsPerMin, isLayer1Recent) {
    const x_perclos = perclosAlertThreshold > 0 ? Math.min(1.0, perclos / perclosAlertThreshold) : 0.0;
    const x_yawn = Math.min(1.0, yawnsPerMin / this.cfg.chuan_hoa.nguong_ngap_phut_max);
    const x_nod = Math.min(1.0, nodsPerMin / this.cfg.chuan_hoa.nguong_gat_phut_max);
    const x_layer1 = isLayer1Recent ? 1.0 : 0.0;

    const indicators = {
      perclos: x_perclos,
      ngap_phut: x_yawn,
      gat_phut: x_nod,
      layer1_gan_day: x_layer1
    };

    let product = 1.0;
    for (const [key, x] of Object.entries(indicators)) {
      const weight = this.cfg.trong_so[key] || 0.0;
      product *= (1.0 - weight * x);
    }
    const riskScore = 1.0 - product;

    // Sắp xếp các mức rủi ro giảm dần theo ngưỡng
    const sortedLevels = [...this.cfg.muc_theo_risk].sort((a, b) => b.nguong - a.nguong);
    let alertLevel = 0;
    for (const level of sortedLevels) {
      if (riskScore >= level.nguong) {
        alertLevel = level.muc;
        break;
      }
    }

    return {
      riskScore,
      alertLevel,
      indicators
    };
  }
}

/**
 * Trình phát hiện buồn ngủ tổng hợp (Drowsiness Detector)
 */
export class DrowsinessDetector {
  constructor(cfg = DROWSINESS_CONFIG) {
    this.cfg = cfg;
    this.perclosAcc = new PerclosAccumulator(cfg.perclos.cua_so_giay);
    this.yawnDetector = new YawnDetector(cfg.ngap);
    this.nodDetector = new NodDetector(cfg.gat_dau);
    this.fusion = new NoisyOrFusion(cfg.noisy_or);

    this.eyeClosedStartMs = null;
    this.layer1AlertHistory = []; // Timestamps các lần còi phản xạ Layer 1
    this.lastL1AlertTime = 0;

    // Load state from localStorage on startup to prevent reset on tab unmount/remount
    this.loadState();
  }

  saveState() {
    try {
      const state = {
        yawnEvents: this.yawnDetector.events,
        lastYawnEndMs: this.yawnDetector.lastYawnEndMs,
        nodEvents: this.nodDetector.events,
        layer1AlertHistory: this.layer1AlertHistory,
        lastL1AlertTime: this.lastL1AlertTime,
        eyeClosedStartMs: this.eyeClosedStartMs,
        perclosHistory: this.perclosAcc.history
      };
      localStorage.setItem('safebus_drowsiness_state', JSON.stringify(state));
    } catch (e) {}
  }

  loadState() {
    try {
      const data = localStorage.getItem('safebus_drowsiness_state');
      if (data) {
        const state = JSON.parse(data);
        this.yawnDetector.events = state.yawnEvents || [];
        this.yawnDetector.lastYawnEndMs = state.lastYawnEndMs || 0;
        this.nodDetector.events = state.nodEvents || [];
        this.layer1AlertHistory = state.layer1AlertHistory || [];
        this.lastL1AlertTime = state.lastL1AlertTime || 0;
        this.eyeClosedStartMs = state.eyeClosedStartMs || null;
        this.perclosAcc.history = state.perclosHistory || [];
      }
    } catch (e) {}
  }

  processFrame(ear, mar, pitch, contextLevel = 'binh_thuong') {
    const now = Date.now();

    // 1. Phép xác định mắt nhắm (Sử dụng Hysteresis chống rung nhiễu)
    let isClosed = false;
    if (this.eyeClosedStartMs !== null) {
      // Đang trong trạng thái nhắm mắt, cần vượt ear_ra (0.23) mới tính là mở mắt ra
      isClosed = ear < this.cfg.ear_ra;
    } else {
      // Đang mở mắt, tụt dưới ear_vao (0.19) mới bắt đầu tính nhắm mắt
      isClosed = ear < this.cfg.ear_vao;
    }

    // 2. Cập nhật trạng thái nhắm mắt để tính Lớp 1 (Phản xạ)
    let isL1Triggered = false;
    const thresholdSec = this.cfg.nguong_theo_muc_nen[contextLevel].nham_mat_giay;

    if (isClosed) {
      if (this.eyeClosedStartMs === null) {
        this.eyeClosedStartMs = now;
      } else {
        const closedSec = (now - this.eyeClosedStartMs) / 1000.0;
        if (closedSec >= thresholdSec) {
          // Báo động Lớp 1
          const cooldownMs = 5000;
          if (now - this.lastL1AlertTime >= cooldownMs) {
            isL1Triggered = true;
            this.lastL1AlertTime = now;
            this.layer1AlertHistory.push(now);
          }
        }
      }
    } else {
      this.eyeClosedStartMs = null;
    }

    // 3. Cập nhật các bộ tích lũy xu hướng (Lớp 2)
    const perclos = this.perclosAcc.update(isClosed, now);
    this.yawnDetector.update(mar, now);
    this.nodDetector.update(pitch, now);

    const yawnsPerMin = this.yawnDetector.getEventsPerMinute(now);
    const nodsPerMin = this.nodDetector.getEventsPerMinute(now);

    // Kiểm tra xem Lớp 1 có kích hoạt gần đây không (cua_so_layer1_giay = 90s)
    const l1Cutoff = now - (this.cfg.noisy_or.chuan_hoa.cua_so_layer1_giay * 1000);
    this.layer1AlertHistory = this.layer1AlertHistory.filter(t => t > l1Cutoff);
    const isL1Recent = this.layer1AlertHistory.length > 0;

    // 4. Noisy-OR Fusion để ra mức rủi ro chung (Risk: 0..1, Level: 0..3)
    const perclosAlertThreshold = this.cfg.nguong_theo_muc_nen[contextLevel].perclos_canh_bao;
    let { riskScore, alertLevel, indicators } = this.fusion.calculate(
      perclos,
      perclosAlertThreshold,
      yawnsPerMin,
      nodsPerMin,
      isL1Recent
    );

    // Quy tắc cứng: PERCLOS vượt perclos_cao (0.35) thì tối thiểu mức cảnh báo 2
    if (perclos >= this.cfg.perclos.nguong_perclos_cao && alertLevel < 2) {
      alertLevel = 2;
    }

    // Save state on every frame processed to survive unmount/remount
    this.saveState();

    return {
      isClosed,
      isL1Triggered,
      perclos,
      yawnsPerMin,
      nodsPerMin,
      riskScore,
      alertLevel,
      indicators
    };
  }

  reset() {
    this.perclosAcc.reset();
    this.yawnDetector.events = [];
    this.yawnDetector.yawnStartMs = null;
    this.yawnDetector.lastYawnEndMs = 0;
    this.nodDetector.events = [];
    this.nodDetector.nodStartMs = null;
    this.nodDetector.isNodRegistered = false;
    this.eyeClosedStartMs = null;
    this.layer1AlertHistory = [];
    this.lastL1AlertTime = 0;
    try {
      localStorage.removeItem('safebus_drowsiness_state');
    } catch (e) {}
  }
}
