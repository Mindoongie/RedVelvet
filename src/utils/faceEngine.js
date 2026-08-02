// SafeBus AI Face Recognition & Storage Engine

const DISTANCE_THRESHOLD = 0.55;

export function euclideanDistance(a, b) {
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    sum += (a[i] - b[i]) * (a[i] - b[i]);
  }
  return Math.sqrt(sum);
}

export function findBestMatch(queryDescriptor, threshold = DISTANCE_THRESHOLD) {
  const labeledStudents = getStudentRegistry();
  let bestStudent = null;
  let bestDistance = Infinity;

  for (let student of labeledStudents) {
    let minD = Infinity;
    if (!student.descriptors || student.descriptors.length === 0) continue;
    
    for (let desc of student.descriptors) {
      const d = euclideanDistance(queryDescriptor, desc);
      if (d < minD) minD = d;
    }

    if (minD < bestDistance) {
      bestDistance = minD;
      bestStudent = student;
    }
  }

  const isMatch = bestStudent !== null && bestDistance <= threshold;
  return {
    student_id: isMatch ? bestStudent.student_id : null,
    full_name: isMatch ? bestStudent.full_name : null,
    distance: Math.round(bestDistance * 10000) / 10000,
    is_match: isMatch
  };
}

// ─────────────────────────────────────────────
// STORAGE & SEEDING UTILITIES
// ─────────────────────────────────────────────

export function getStudentRegistry() {
  try {
    let list = JSON.parse(localStorage.getItem('safebus_students') || 'null');
    if (!list || list.length === 0) {
      // Seed default students
      list = [
        {
          student_id: 'HS-001',
          full_name: 'Phạm Phương Chi',
          descriptors: [Array(128).fill(0.1)] // mock descriptor
        },
        {
          student_id: 'HS-002',
          full_name: 'Nguyễn Minh Anh',
          descriptors: [Array(128).fill(0.2)] // mock descriptor
        },
        {
          student_id: 'HS-003',
          full_name: 'Trần Đức Nam',
          descriptors: [Array(128).fill(0.3)] // mock descriptor
        }
      ];
      localStorage.setItem('safebus_students', JSON.stringify(list));
      
      // Seed default bus assignments
      const assignments = {
        'BUS-01': [
          { student_id: 'HS-001', full_name: 'Phạm Phương Chi' },
          { student_id: 'HS-002', full_name: 'Nguyễn Minh Anh' },
          { student_id: 'HS-003', full_name: 'Trần Đức Nam' }
        ]
      };
      localStorage.setItem('safebus_bus_assignments', JSON.stringify(assignments));
    }
    return list;
  } catch (e) {
    return [];
  }
}

export function saveStudentRegistry(list) {
  localStorage.setItem('safebus_students', JSON.stringify(list));
}

export function registerStudent(studentId, fullName, descriptors) {
  const list = getStudentRegistry();
  const idx = list.findIndex(s => s.student_id === studentId);
  if (idx >= 0) {
    list[idx].full_name = fullName;
    list[idx].descriptors = [...list[idx].descriptors, ...descriptors];
  } else {
    list.push({ student_id: studentId, full_name: fullName, descriptors });
  }
  saveStudentRegistry(list);
  return list.find(s => s.student_id === studentId);
}

export function deleteStudent(studentId) {
  const list = getStudentRegistry().filter(s => s.student_id !== studentId);
  saveStudentRegistry(list);
  
  // Also remove from bus assignments
  const a = getBusAssignments();
  for (let busId in a) {
    a[busId] = a[busId].filter(s => s.student_id !== studentId);
  }
  saveBusAssignments(a);
}

export function getBusAssignments() {
  try {
    return JSON.parse(localStorage.getItem('safebus_bus_assignments') || '{}');
  } catch (e) {
    return {};
  }
}

export function saveBusAssignments(a) {
  localStorage.setItem('safebus_bus_assignments', JSON.stringify(a));
}

export function assignStudentToBus(busId, studentId, fullName) {
  const a = getBusAssignments();
  if (!a[busId]) a[busId] = [];
  
  const found = a[busId].some(s => s.student_id === studentId);
  if (!found) {
    a[busId].push({ student_id: studentId, full_name: fullName });
  }
  saveBusAssignments(a);
}

export function removeStudentFromBus(busId, studentId) {
  const a = getBusAssignments();
  if (a[busId]) {
    a[busId] = a[busId].filter(s => s.student_id !== studentId);
    saveBusAssignments(a);
  }
}

export function getStudentsForBus(busId) {
  // Ensure default seeding run by calling getStudentRegistry first
  getStudentRegistry();
  return getBusAssignments()[busId] || [];
}

// ─────────────────────────────────────────────
// TRIP ROSTER UTILITIES
// ─────────────────────────────────────────────

export function getRoster(busId) {
  try {
    return JSON.parse(localStorage.getItem('safebus_trip_' + busId) || 'null');
  } catch (e) {
    return null;
  }
}

export function saveRoster(busId, roster) {
  localStorage.setItem('safebus_trip_' + busId, JSON.stringify(roster));
}

export function startTrip(busId, expectedStudents) {
  const roster = { bus_id: busId, entries: {} };
  for (let s of expectedStudents) {
    roster.entries[s.student_id] = {
      student_id: s.student_id,
      full_name: s.full_name,
      status: 'not_boarded', // 'not_boarded' | 'on_bus' | 'alighted'
      boarded_at: null,
      alighted_at: null
    };
  }
  saveRoster(busId, roster);
  return roster;
}

export function registerScan(busId, studentId, event) {
  const roster = getRoster(busId);
  if (!roster) {
    return {
      error: 'Chưa khởi tạo chuyến xe. Vui lòng bắt đầu chuyến xe.',
      roster: null
    };
  }

  const entry = roster.entries[studentId];
  if (!entry) {
    return {
      error: `CẢNH BÁO: Học sinh không thuộc danh sách xe ${busId}!`,
      roster: rosterSummary(roster)
    };
  }

  const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  if (event === 'boarded') {
    entry.status = 'on_bus';
    entry.boarded_at = now;
  } else if (event === 'alighted') {
    entry.status = 'alighted';
    entry.alighted_at = now;
  }

  saveRoster(busId, roster);
  return {
    success: true,
    roster: rosterSummary(roster)
  };
}

export function cabinSweep(busId) {
  const roster = getRoster(busId);
  if (!roster) return [];
  const entries = Object.values(roster.entries);
  return entries.filter(e => e.status === 'on_bus');
}

export function rosterSummary(roster) {
  if (!roster) return null;
  const counts = { not_boarded: 0, on_bus: 0, alighted: 0 };
  const entries = Object.values(roster.entries);
  for (let e of entries) {
    counts[e.status]++;
  }
  return {
    bus_id: roster.bus_id,
    total: entries.length,
    counts: counts,
    still_on_bus: entries.filter(e => e.status === 'on_bus').map(e => e.full_name),
    entries: entries
  };
}

export async function loadFaceModels(statusCallback = () => {}) {
  const MODEL_URL = '/models';
  statusCallback('Đang tải mô hình nhận dạng...', 'loading');
  if (typeof window.faceapi === 'undefined') {
    throw new Error('Thư viện face-api.js chưa được tải trên trang.');
  }
  await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  statusCallback('Mô hình AI sẵn sàng!', 'success');
}
