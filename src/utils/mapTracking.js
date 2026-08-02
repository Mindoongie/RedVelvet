/**
 * Lõi định vị & Theo dõi Tuyến xe Bus (Bustracker & Haversine GPS)
 * Được chuyển đổi từ module Python của nhánh lanh sang ES6 Javascript
 */

// Bán kính Trái Đất (mét)
const EARTH_RADIUS_M = 6371000.0;
const METERS_PER_DEG = 111320.0;

/**
 * Tính khoảng cách Haversine giữa 2 điểm GPS (mét)
 */
export function haversine(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * Math.PI / 180.0;
  const dLon = (lon2 - lon1) * Math.PI / 180.0;

  const rLat1 = lat1 * Math.PI / 180.0;
  const rLat2 = lat2 * Math.PI / 180.0;

  const a = Math.sin(dLat / 2.0) ** 2 +
            Math.cos(rLat1) * Math.cos(rLat2) * (Math.sin(dLon / 2.0) ** 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_M * c;
}

/**
 * Tính khoảng cách ngắn nhất từ điểm P đến đoạn thẳng AB (mét)
 * Sử dụng phép chiếu Cartesian cục bộ để tối ưu hiệu năng
 */
export function pointToSegmentDistance(pLat, pLon, aLat, aLon, bLat, bLon) {
  const pCos = Math.cos(pLat * Math.PI / 180.0);
  const aCos = Math.cos(aLat * Math.PI / 180.0);
  const bCos = Math.cos(bLat * Math.PI / 180.0);

  const px = pLon * METERS_PER_DEG * pCos;
  const py = pLat * METERS_PER_DEG;
  const ax = aLon * METERS_PER_DEG * aCos;
  const ay = aLat * METERS_PER_DEG;
  const bx = bLon * METERS_PER_DEG * bCos;
  const by = bLat * METERS_PER_DEG;

  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;

  const abSquared = abx * abx + aby * aby;
  if (abSquared === 0) {
    return Math.sqrt(apx * apx + apy * apy);
  }

  let t = (apx * abx + apy * aby) / abSquared;
  t = Math.max(0.0, Math.min(1.0, t));

  const projX = ax + t * abx;
  const projY = ay + t * aby;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}

/**
 * Kiểm tra xem xe có bị chệch lộ trình so với tập hợp các waypoint không
 */
export function checkDeviationFromRoute(busLat, busLon, waypoints, thresholdM = 100.0) {
  if (!waypoints || waypoints.length < 2) {
    return { isDeviated: false, distance: 0.0, nearestIdx: 0 };
  }

  let minDistance = Infinity;
  let nearestIdx = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const [aLat, aLon] = waypoints[i];
    const [bLat, bLon] = waypoints[i + 1];

    const dist = pointToSegmentDistance(busLat, busLon, aLat, aLon, bLat, bLon);
    if (dist < minDistance) {
      minDistance = dist;
      nearestIdx = i;
    }
  }

  return {
    isDeviated: minDistance > thresholdM,
    distance: minDistance,
    nearestIdx: nearestIdx
  };
}

/**
 * Bộ lọc nhiễu GPS - Moving Average
 */
export class SimpleMovingAverageFilter {
  constructor(windowSize = 5) {
    this.windowSize = windowSize;
    this.lats = [];
    this.lons = [];
  }

  process(lat, lon) {
    this.lats.push(lat);
    this.lons.push(lon);

    if (this.lats.length > this.windowSize) {
      this.lats.shift();
      this.lons.shift();
    }

    const avgLat = this.lats.reduce((sum, val) => sum + val, 0) / this.lats.length;
    const avgLon = this.lons.reduce((sum, val) => sum + val, 0) / this.lons.length;

    return [avgLat, avgLon];
  }

  reset() {
    this.lats = [];
    this.lons = [];
  }
}

/**
 * Tính quãng đường còn lại trên lộ trình từ vị trí hiện tại
 */
export function calculateRemainingDistance(currentLat, currentLon, waypoints, nearestSegmentIdx) {
  if (!waypoints || waypoints.length === 0) return 0.0;
  if (nearestSegmentIdx >= waypoints.length - 1) return 0.0;

  // 1. Khoảng cách đến cuối đoạn hiện tại
  const [bLat, bLon] = waypoints[nearestSegmentIdx + 1];
  let remaining = haversine(currentLat, currentLon, bLat, bLon);

  // 2. Khoảng cách các đoạn tiếp theo
  for (let i = nearestSegmentIdx + 1; i < waypoints.length - 1; i++) {
    const [lat1, lon1] = waypoints[i];
    const [lat2, lon2] = waypoints[i + 1];
    remaining += haversine(lat1, lon1, lat2, lon2);
  }

  return remaining;
}

/**
 * Tính toán ETA dự kiến (phút)
 */
export function calculateEtaSimple(remainingDistanceM, speedKmh) {
  if (speedKmh <= 0) return -1.0;
  
  // km/h -> m/s
  const speedMs = speedKmh * (1000.0 / 3600.0);
  const timeSeconds = remainingDistanceM / speedMs;
  return timeSeconds / 60.0;
}

/**
 * Bộ kiểm soát chệch hướng có cooldown & bộ đếm lần lệch liên tiếp
 */
export class DeviationDetector {
  constructor(thresholdM = 100.0, consecutiveRequired = 3, cooldownMs = 30000) {
    this.thresholdM = thresholdM;
    this.consecutiveRequired = consecutiveRequired;
    this.cooldownMs = cooldownMs;

    this.consecutiveDeviations = 0;
    this.lastAlertTime = 0;
  }

  processGpsPing(busLat, busLon, waypoints) {
    const now = Date.now();
    const { isDeviated, distance, nearestIdx } = checkDeviationFromRoute(
      busLat, busLon, waypoints, this.thresholdM
    );

    const result = {
      isDeviated,
      distanceM: distance,
      nearestSegment: nearestIdx,
      shouldAlert: false,
      reason: "Xe đi đúng tuyến."
    };

    if (isDeviated) {
      this.consecutiveDeviations++;
      if (this.consecutiveDeviations >= this.consecutiveRequired) {
        if (now - this.lastAlertTime >= this.cooldownMs) {
          result.shouldAlert = true;
          result.reason = `Lệch ${this.consecutiveDeviations} lần liên tiếp (${distance.toFixed(1)}m).`;
          this.lastAlertTime = now;
        } else {
          result.reason = "Đang trong thời gian giãn cách báo động (cooldown).";
        }
      } else {
        result.reason = `Mới lệch ${this.consecutiveDeviations}/${this.consecutiveRequired} lần.`;
      }
    } else {
      this.consecutiveDeviations = 0;
    }

    return result;
  }

  reset() {
    this.consecutiveDeviations = 0;
    this.lastAlertTime = 0;
  }
}
