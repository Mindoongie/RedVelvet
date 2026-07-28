// SafeBus AI Engine - FaceMatcher + TripRoster + Storage (JS port, no template literals)
var DISTANCE_THRESHOLD = 0.6;

function euclideanDistance(a, b) {
  var sum = 0;
  for (var i = 0; i < 128; i++) sum += (a[i] - b[i]) * (a[i] - b[i]);
  return Math.sqrt(sum);
}

function findBestMatch(queryDescriptor, labeledDescriptors, threshold) {
  if (threshold === undefined) threshold = DISTANCE_THRESHOLD;
  var bestStudent = null;
  var bestDistance = Infinity;
  for (var i = 0; i < labeledDescriptors.length; i++) {
    var entry = labeledDescriptors[i];
    var minD = Infinity;
    for (var j = 0; j < entry.descriptors.length; j++) {
      var d = euclideanDistance(queryDescriptor, entry.descriptors[j]);
      if (d < minD) minD = d;
    }
    if (minD < bestDistance) { bestDistance = minD; bestStudent = entry; }
  }
  var isMatch = bestStudent !== null && bestDistance <= threshold;
  return {
    student_id: isMatch ? bestStudent.student_id : null,
    full_name: isMatch ? bestStudent.full_name : null,
    distance: Math.round(bestDistance * 10000) / 10000,
    is_match: isMatch
  };
}

function getRoster(busId) {
  try { return JSON.parse(localStorage.getItem('safebus_trip_' + busId) || 'null'); }
  catch(e) { return null; }
}
function saveRoster(busId, roster) {
  localStorage.setItem('safebus_trip_' + busId, JSON.stringify(roster));
}
function startTrip(busId, expectedStudents) {
  var roster = { bus_id: busId, entries: {} };
  for (var i = 0; i < expectedStudents.length; i++) {
    var s = expectedStudents[i];
    roster.entries[s.student_id] = {
      student_id: s.student_id, full_name: s.full_name,
      status: 'not_boarded', boarded_at: null, alighted_at: null
    };
  }
  saveRoster(busId, roster);
  return roster;
}
function registerScan(busId, studentId, event, matchedName) {
  var roster = getRoster(busId);
  if (!roster) return { alerts: [{ severity:'error', code:'no_trip', message:'Chua khoi tao chuyen xe. Bam "Bat dau chuyen" truoc.' }], roster_summary: null };
  var alerts = [];
  var now = new Date().toLocaleTimeString('vi-VN');
  var entry = roster.entries[studentId];
  if (!entry) {
    var name = matchedName || studentId;
    alerts.push({ severity:'critical', code:'wrong_bus', message:'CANH BAO: ' + name + ' KHONG THUOC danh sach xe ' + busId + ' - CO THE LEN NHAM XE!' });
    saveRoster(busId, roster);
    return { alerts: alerts, roster_summary: rosterSummary(roster) };
  }
  if (event === 'boarded') {
    if (entry.status === 'on_bus') {
      alerts.push({ severity:'warning', code:'duplicate_scan', message: entry.full_name + ' da quet len xe truoc do (quet trung lap)' });
    } else {
      entry.status = 'on_bus';
      entry.boarded_at = now;
    }
  } else if (event === 'alighted') {
    if (entry.status !== 'on_bus') {
      alerts.push({ severity:'warning', code:'mismatch', message: entry.full_name + ' quet xuong xe nhung he thong chua ghi nhan da len xe' });
    }
    entry.status = 'alighted';
    entry.alighted_at = now;
  }
  saveRoster(busId, roster);
  return { alerts: alerts, roster_summary: rosterSummary(roster) };
}
function cabinSweep(busId) {
  var roster = getRoster(busId);
  if (!roster) return { alerts: [], roster_summary: null };
  var alerts = [];
  var entries = Object.values(roster.entries);
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.status === 'on_bus') {
      alerts.push({ severity:'critical', code:'left_on_bus', message:'KHAN CAP: ' + e.full_name + ' VAN CON TREN XE ' + busId + ' - KIEM TRA KHOANG XE NGAY!' });
    }
  }
  return { alerts: alerts, roster_summary: rosterSummary(roster) };
}
function rosterSummary(roster) {
  if (!roster) return null;
  var counts = { not_boarded:0, on_bus:0, alighted:0 };
  var entries = Object.values(roster.entries);
  for (var i = 0; i < entries.length; i++) counts[entries[i].status]++;
  return {
    bus_id: roster.bus_id,
    total: entries.length,
    counts: counts,
    still_on_bus: entries.filter(function(e){return e.status==='on_bus';}).map(function(e){return e.full_name;}),
    entries: entries
  };
}
function getStudentRegistry() {
  try { return JSON.parse(localStorage.getItem('safebus_students') || '[]'); }
  catch(e) { return []; }
}
function saveStudentRegistry(list) {
  localStorage.setItem('safebus_students', JSON.stringify(list));
}
function registerStudent(studentId, fullName, descriptors) {
  var list = getStudentRegistry();
  var idx = -1;
  for (var i = 0; i < list.length; i++) if (list[i].student_id === studentId) { idx = i; break; }
  if (idx >= 0) {
    list[idx].full_name = fullName;
    for (var j = 0; j < descriptors.length; j++) list[idx].descriptors.push(descriptors[j]);
  } else {
    list.push({ student_id: studentId, full_name: fullName, descriptors: descriptors });
  }
  saveStudentRegistry(list);
  for (var k = 0; k < list.length; k++) if (list[k].student_id === studentId) return list[k];
}
function deleteStudent(studentId) {
  var list = getStudentRegistry().filter(function(s){return s.student_id !== studentId;});
  saveStudentRegistry(list);
}
function clearAllStudents() { localStorage.removeItem('safebus_students'); }
function getBusAssignments() {
  try { return JSON.parse(localStorage.getItem('safebus_bus_assignments') || '{}'); }
  catch(e) { return {}; }
}
function saveBusAssignments(a) { localStorage.setItem('safebus_bus_assignments', JSON.stringify(a)); }
function assignStudentToBus(busId, studentId, fullName) {
  var a = getBusAssignments();
  if (!a[busId]) a[busId] = [];
  var found = false;
  for (var i = 0; i < a[busId].length; i++) if (a[busId][i].student_id === studentId) { found = true; break; }
  if (!found) a[busId].push({ student_id: studentId, full_name: fullName });
  saveBusAssignments(a);
}
function removeStudentFromBus(busId, studentId) {
  var a = getBusAssignments();
  if (a[busId]) { a[busId] = a[busId].filter(function(s){return s.student_id !== studentId;}); saveBusAssignments(a); }
}
function getStudentsForBus(busId) {
  return getBusAssignments()[busId] || [];
}
function playAlert(type) {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === 'critical') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.2);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.4);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(); osc.stop(ctx.currentTime + 0.8);
    } else {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    }
  } catch(e) {}
}
function playSuccess() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(523, ctx.currentTime);
    osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(); osc.stop(ctx.currentTime + 0.4);
  } catch(e) {}
}
async function loadFaceModels(statusCallback) {
  var MODEL_URL = './models';
  statusCallback('Dang tai model nhan dien khuon mat...', 'loading');
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
  await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
  statusCallback('Model san sang', 'success');
}
async function captureDescriptor(videoEl) {
  var result = await faceapi
    .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
    .withFaceLandmarks().withFaceDescriptor();
  return result ? Array.from(result.descriptor) : null;
}
function startDrawLoop(videoEl, overlayEl, modelReadyFn) {
  function loop() {
    if (modelReadyFn() && videoEl.readyState >= 2) {
      faceapi
        .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
        .withFaceLandmarks()
        .then(function(result) {
          var ctx = overlayEl.getContext('2d');
          var dims = faceapi.matchDimensions(overlayEl, videoEl, true);
          ctx.clearRect(0, 0, overlayEl.width, overlayEl.height);
          if (result) {
            var resized = faceapi.resizeResults(result, dims);
            faceapi.draw.drawDetections(overlayEl, resized);
            faceapi.draw.drawFaceLandmarks(overlayEl, resized);
          }
        });
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}