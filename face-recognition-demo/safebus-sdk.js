/**
 * SafeBus SDK v1.0
 * Nhúng tính năng nhận diện khuôn mặt vào bất kỳ trang HTML nào bằng 1 dòng lệnh.
 *
 * Cách dùng:
 *   SafeBus.init('container-id', { busId: 'BUS-01', mode: 'checkin' });
 *
 * Modes:
 *   'checkin'  — Kiosk quét mặt lên/xuống xe
 *   'register' — Đăng ký khuôn mặt học sinh
 *
 * Options:
 *   busId        {string}   Mã xe mặc định (vd: 'BUS-01')
 *   mode         {string}   'checkin' | 'register'
 *   modelsPath   {string}   Đường dẫn thư mục chứa model AI (mặc định: './models')
 *   onScanSuccess {function} Callback(student, event) khi quét thành công
 *   onAlert      {function} Callback(alert) khi có cảnh báo
 *
 * API:
 *   SafeBus.init(containerId, options)
 *   SafeBus.destroy(containerId)
 *   SafeBus.exportData()
 */
(function (global) {
  'use strict';

  // ─────────────────────────────────────────────
  // ENGINE LOGIC (ported from engine.js)
  // ─────────────────────────────────────────────

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
    catch (e) { return null; }
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
    if (!roster) return { alerts: [{ severity: 'error', code: 'no_trip', message: 'Chua khoi tao chuyen xe.' }], roster_summary: null };
    var alerts = [];
    var now = new Date().toLocaleTimeString('vi-VN');
    var entry = roster.entries[studentId];
    if (!entry) {
      var name = matchedName || studentId;
      alerts.push({ severity: 'critical', code: 'wrong_bus', message: 'CANH BAO: ' + name + ' KHONG THUOC danh sach xe ' + busId + '!' });
      saveRoster(busId, roster);
      return { alerts: alerts, roster_summary: rosterSummary(roster) };
    }
    if (event === 'boarded') {
      if (entry.status === 'on_bus') {
        alerts.push({ severity: 'warning', code: 'duplicate_scan', message: entry.full_name + ' da quet len xe truoc do.' });
      } else {
        entry.status = 'on_bus'; entry.boarded_at = now;
      }
    } else if (event === 'alighted') {
      if (entry.status !== 'on_bus') {
        alerts.push({ severity: 'warning', code: 'mismatch', message: entry.full_name + ' quet xuong nhung chua ghi nhan len xe.' });
      }
      entry.status = 'alighted'; entry.alighted_at = now;
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
        alerts.push({ severity: 'critical', code: 'left_on_bus', message: 'KHAN CAP: ' + e.full_name + ' VAN CON TREN XE ' + busId + '!' });
      }
    }
    return { alerts: alerts, roster_summary: rosterSummary(roster) };
  }
  function rosterSummary(roster) {
    if (!roster) return null;
    var counts = { not_boarded: 0, on_bus: 0, alighted: 0 };
    var entries = Object.values(roster.entries);
    for (var i = 0; i < entries.length; i++) counts[entries[i].status]++;
    return {
      bus_id: roster.bus_id, total: entries.length, counts: counts,
      still_on_bus: entries.filter(function (e) { return e.status === 'on_bus'; }).map(function (e) { return e.full_name; }),
      entries: entries
    };
  }
  function getStudentRegistry() {
    try { return JSON.parse(localStorage.getItem('safebus_students') || '[]'); }
    catch (e) { return []; }
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
    saveStudentRegistry(getStudentRegistry().filter(function (s) { return s.student_id !== studentId; }));
  }
  function clearAllStudents() { localStorage.removeItem('safebus_students'); }
  function getBusAssignments() {
    try { return JSON.parse(localStorage.getItem('safebus_bus_assignments') || '{}'); }
    catch (e) { return {}; }
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
    if (a[busId]) { a[busId] = a[busId].filter(function (s) { return s.student_id !== studentId; }); saveBusAssignments(a); }
  }
  function getStudentsForBus(busId) { return getBusAssignments()[busId] || []; }
  function exportData() {
    var data = { students: getStudentRegistry(), assignments: getBusAssignments() };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = 'safebus_data.json'; a.click();
    URL.revokeObjectURL(url);
  }

  // Audio helpers
  function playAlert(type) {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator(); var gain = ctx.createGain();
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
    } catch (e) { }
  }
  function playSuccess() {
    try {
      var ctx = new (window.AudioContext || window.webkitAudioContext)();
      var osc = ctx.createOscillator(); var gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(); osc.stop(ctx.currentTime + 0.4);
    } catch (e) { }
  }

  // face-api helpers
  async function loadFaceModels(modelsPath, onStatus) {
    onStatus('Dang tai model AI...', 'loading');
    await faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath);
    await faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath);
    await faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath);
    onStatus('Model san sang', 'success');
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
        faceapi.detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
          .withFaceLandmarks()
          .then(function (result) {
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

  // ─────────────────────────────────────────────
  // CSS (inject once into <head>)
  // ─────────────────────────────────────────────
  var CSS_INJECTED = false;
  function injectCSS() {
    if (CSS_INJECTED) return;
    CSS_INJECTED = true;
    var style = document.createElement('style');
    style.id = 'safebus-sdk-styles';
    style.textContent = [
      '.sb-widget{font-family:"Inter",sans-serif;--sb-primary:#6366f1;--sb-primary-dark:#4f46e5;--sb-primary-light:#a5b4fc;--sb-accent:#f43f5e;--sb-green:#10b981;--sb-amber:#f59e0b;--sb-bg:#0a0b0f;--sb-bg2:#111318;--sb-card:#13151f;--sb-border:rgba(255,255,255,0.08);--sb-text:#f1f5f9;--sb-text2:#94a3b8;--sb-text3:#64748b;background:var(--sb-bg);color:var(--sb-text);border-radius:20px;overflow:hidden;position:relative}',
      '.sb-widget *{box-sizing:border-box;margin:0;padding:0}',
      '.sb-header{background:rgba(10,11,15,.95);border-bottom:1px solid var(--sb-border);padding:14px 20px;display:flex;align-items:center;gap:12px;backdrop-filter:blur(20px)}',
      '.sb-header-title{font-size:16px;font-weight:800;flex:1}',
      '.sb-badge{display:inline-flex;align-items:center;gap:6px;font-size:11px;color:var(--sb-text2);padding:4px 10px;border:1px solid var(--sb-border);border-radius:999px}',
      '.sb-dot{width:8px;height:8px;border-radius:50%;background:#f59e0b;animation:sb-blink 1.5s infinite;flex-shrink:0}',
      '.sb-dot.ready{background:#22c55e;animation:none}',
      '@keyframes sb-blink{0%,100%{opacity:1}50%{opacity:.3}}',
      '.sb-body{padding:20px;display:grid;grid-template-columns:1fr 340px;gap:20px}',
      '@media(max-width:700px){.sb-body{grid-template-columns:1fr}}',
      '.sb-stage{position:relative;width:100%;aspect-ratio:4/3;border-radius:14px;overflow:hidden;background:#060710;box-shadow:0 8px 32px rgba(0,0,0,.5);margin-bottom:14px}',
      '.sb-stage video,.sb-stage canvas{position:absolute;top:0;left:0;width:100%;height:100%}',
      '.sb-scan-line{position:absolute;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--sb-primary),transparent);opacity:0;animation:sb-scan 2s linear infinite}',
      '.sb-scan-line.active{opacity:.8}',
      '@keyframes sb-scan{0%{top:0}100%{top:100%}}',
      '.sb-status{padding:12px 14px;border-radius:10px;background:var(--sb-bg2);border:1px solid var(--sb-border);font-size:13px;min-height:46px;display:flex;align-items:center;line-height:1.5;transition:all .3s;margin-bottom:14px;font-weight:500}',
      '.sb-status.loading{background:rgba(99,102,241,.1);border-color:rgba(99,102,241,.4);color:var(--sb-primary-light)}',
      '.sb-status.success{background:rgba(16,185,129,.1);border-color:rgba(16,185,129,.4);color:#6ee7b7}',
      '.sb-status.warning{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.4);color:#fcd34d}',
      '.sb-status.error{background:rgba(244,63,94,.1);border-color:rgba(244,63,94,.4);color:#fda4af;animation:sb-shake .3s ease}',
      '@keyframes sb-shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}',
      '.sb-btn-row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}',
      '.sb-btn{padding:13px 16px;border:none;border-radius:10px;cursor:pointer;font-size:14px;font-weight:700;font-family:inherit;transition:all .2s;display:inline-flex;align-items:center;gap:6px;justify-content:center;flex:1}',
      '.sb-btn:disabled{opacity:.4;cursor:not-allowed}',
      '.sb-btn-board{background:linear-gradient(135deg,var(--sb-primary),var(--sb-primary-dark));color:#fff;box-shadow:0 4px 16px rgba(99,102,241,.35)}',
      '.sb-btn-board:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 24px rgba(99,102,241,.5)}',
      '.sb-btn-alight{background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;box-shadow:0 4px 16px rgba(245,158,11,.3)}',
      '.sb-btn-alight:hover:not(:disabled){transform:translateY(-2px)}',
      '.sb-btn-end{background:linear-gradient(135deg,var(--sb-accent),#e11d48);color:#fff;width:100%;margin-top:4px;padding:13px;box-shadow:0 4px 16px rgba(244,63,94,.3)}',
      '.sb-btn-end:hover:not(:disabled){transform:translateY(-2px)}',
      '.sb-btn-start{background:linear-gradient(135deg,var(--sb-green),#059669);color:#fff;padding:9px 16px;font-size:13px;border-radius:9px;border:none;cursor:pointer;font-weight:700;font-family:inherit;transition:all .2s}',
      '.sb-btn-start:disabled{opacity:.4;cursor:not-allowed}',
      '.sb-card{background:var(--sb-card);border:1px solid var(--sb-border);border-radius:16px;padding:18px;margin-bottom:16px}',
      '.sb-card-title{font-size:13px;font-weight:700;color:var(--sb-primary-light);margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid var(--sb-border)}',
      '.sb-input{padding:9px 11px;border-radius:9px;border:1.5px solid var(--sb-border);background:var(--sb-bg2);color:var(--sb-text);font-size:13px;font-family:inherit;transition:border-color .2s;width:100%}',
      '.sb-input:focus{outline:none;border-color:var(--sb-primary)}',
      '.sb-trip-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.sb-trip-indicator{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;padding:4px 11px;border-radius:999px;background:rgba(255,255,255,.05);border:1px solid var(--sb-border);color:var(--sb-text3)}',
      '.sb-trip-indicator.running{background:rgba(16,185,129,.15);border-color:rgba(16,185,129,.3);color:#6ee7b7}',
      '.sb-stats-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px}',
      '.sb-stat-box{background:var(--sb-bg2);border:1px solid var(--sb-border);border-radius:12px;padding:12px;text-align:center}',
      '.sb-stat-box .num{font-size:26px;font-weight:800}',
      '.sb-stat-box .lbl{font-size:10px;color:var(--sb-text2);margin-top:3px;font-weight:600;text-transform:uppercase;letter-spacing:.4px}',
      '.sb-stat-box.on-bus .num{color:var(--sb-primary-light)}',
      '.sb-stat-box.on-bus{border-color:rgba(99,102,241,.25)}',
      '.sb-stat-box.alighted .num{color:#6ee7b7}',
      '.sb-stat-box.alighted{border-color:rgba(16,185,129,.25)}',
      '.sb-stat-box.not-boarded .num{color:#fcd34d}',
      '.sb-stat-box.not-boarded{border-color:rgba(245,158,11,.25)}',
      '.sb-log{background:var(--sb-bg2);border:1px solid var(--sb-border);border-radius:10px;padding:10px;font-family:monospace;font-size:11px;height:160px;overflow-y:auto;line-height:1.6}',
      '.sb-log .lc{color:var(--sb-text3)}.sb-log .ls{color:#6ee7b7;font-weight:600}.sb-log .lw{color:#fcd34d}.sb-log .le{color:#fda4af;font-weight:700}',
      '.sb-roster-detail{font-size:12px;color:var(--sb-text2)}',
      '.sb-roster-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--sb-border)}',
      '.sb-alert-banner{display:none;position:absolute;top:70px;left:50%;transform:translateX(-50%);z-index:200;background:#f43f5e;color:#fff;padding:14px 24px;border-radius:12px;font-size:14px;font-weight:800;box-shadow:0 8px 32px rgba(244,63,94,.6);animation:sb-pop .3s ease;text-align:center;max-width:90%;white-space:nowrap}',
      '.sb-alert-banner.show{display:block}',
      '@keyframes sb-pop{from{transform:translateX(-50%) scale(.8);opacity:0}to{transform:translateX(-50%) scale(1);opacity:1}}',
      /* Register mode */
      '.sb-reg-body{padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:20px}',
      '@media(max-width:700px){.sb-reg-body{grid-template-columns:1fr}}',
      '.sb-form-group{display:flex;flex-direction:column;gap:5px;margin-bottom:12px}',
      '.sb-label{font-size:12px;font-weight:500;color:var(--sb-text2)}',
      '.sb-samples-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin:12px 0}',
      '.sb-slot{aspect-ratio:1;border-radius:8px;border:2px dashed var(--sb-border);display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--sb-text3);background:var(--sb-bg2);overflow:hidden;transition:all .2s;font-weight:700}',
      '.sb-slot.filled{border-color:#22c55e;border-style:solid}',
      '.sb-slot img{width:100%;height:100%;object-fit:cover}',
      '.sb-progress{height:4px;background:var(--sb-border);border-radius:999px;overflow:hidden;margin-bottom:12px}',
      '.sb-progress-fill{height:100%;background:linear-gradient(90deg,var(--sb-primary),var(--sb-green));border-radius:999px;transition:width .3s ease;width:0}',
      '.sb-btn-capture{background:linear-gradient(135deg,var(--sb-primary),var(--sb-primary-dark));color:#fff;padding:10px 16px;border-radius:9px;border:none;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit;transition:all .2s;display:inline-flex;align-items:center;gap:6px}',
      '.sb-btn-capture:hover:not(:disabled){transform:translateY(-1px)}',
      '.sb-btn-capture:disabled{opacity:.4;cursor:not-allowed}',
      '.sb-btn-save{background:linear-gradient(135deg,var(--sb-green),#059669);color:#fff;padding:10px 18px;border-radius:9px;border:none;cursor:pointer;font-size:13px;font-weight:700;font-family:inherit;transition:all .2s;display:inline-flex;align-items:center;gap:6px}',
      '.sb-btn-save:disabled{opacity:.4;cursor:not-allowed}',
      '.sb-btn-ghost{background:rgba(255,255,255,.05);border:1.5px solid var(--sb-border);color:var(--sb-text2);padding:9px 14px;border-radius:9px;cursor:pointer;font-size:12px;font-weight:600;font-family:inherit;transition:all .2s}',
      '.sb-btn-ghost:hover{background:rgba(255,255,255,.1)}',
      '.sb-btn-danger{background:linear-gradient(135deg,#f43f5e,#e11d48);color:#fff;padding:6px 12px;border-radius:8px;border:none;cursor:pointer;font-size:11px;font-weight:700;font-family:inherit}',
      '.sb-student-table{width:100%;border-collapse:collapse;font-size:12px}',
      '.sb-student-table th{text-align:left;padding:8px 10px;background:var(--sb-bg2);color:var(--sb-text2);font-weight:600;border-bottom:1px solid var(--sb-border)}',
      '.sb-student-table td{padding:8px 10px;border-bottom:1px solid var(--sb-border)}',
      '.sb-badge-green{display:inline-block;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;background:rgba(16,185,129,.15);color:#6ee7b7}',
      '.sb-assign-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:10px}',
      '.sb-tag{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:rgba(99,102,241,.15);color:var(--sb-primary-light);border:1px solid rgba(99,102,241,.3)}',
      '.sb-tag button{background:none;border:none;cursor:pointer;font-size:13px;padding:0 2px;color:var(--sb-text3);line-height:1}',
      '.sb-empty{text-align:center;padding:24px;color:var(--sb-text3);font-size:13px}',
      '.sb-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;transition:opacity .05s;border-radius:14px}',
      '.sb-flash.active{opacity:.7}',
      '.sb-instructions{background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--sb-text2);line-height:1.7;margin-bottom:12px}',
      '.sb-instructions b{color:var(--sb-primary-light)}',
    ].join('\n');
    document.head.appendChild(style);
  }

  // ─────────────────────────────────────────────
  // HTML TEMPLATES
  // ─────────────────────────────────────────────

  function checkinTemplate(id) {
    return [
      '<div class="sb-alert-banner" id="' + id + '-banner"></div>',
      '<div class="sb-header">',
      '  <span style="font-size:20px">🎯</span>',
      '  <span class="sb-header-title">Kiosk Điểm danh khuôn mặt</span>',
      '  <div class="sb-badge"><span class="sb-dot" id="' + id + '-dot"></span><span id="' + id + '-model-text">Đang tải model...</span></div>',
      '</div>',
      '<div class="sb-body">',
      '  <div>',
      '    <div class="sb-stage">',
      '      <video id="' + id + '-video" autoplay muted playsinline></video>',
      '      <canvas id="' + id + '-overlay"></canvas>',
      '      <div class="sb-scan-line" id="' + id + '-scanline"></div>',
      '    </div>',
      '    <div class="sb-status" id="' + id + '-status">Đang khởi tạo...</div>',
      '    <div class="sb-btn-row">',
      '      <button class="sb-btn sb-btn-board" id="' + id + '-btn-board" disabled>⬆️ LÊN XE</button>',
      '      <button class="sb-btn sb-btn-alight" id="' + id + '-btn-alight" disabled>⬇️ XUỐNG XE</button>',
      '    </div>',
      '    <button class="sb-btn sb-btn-end" id="' + id + '-btn-end" disabled>🔍 Kết thúc chuyến &amp; Rà soát khoang xe</button>',
      '  </div>',
      '  <div>',
      '    <div class="sb-card">',
      '      <div class="sb-card-title">🚌 Thông tin chuyến xe</div>',
      '      <div class="sb-trip-row">',
      '        <span style="font-size:12px;color:var(--sb-text2);font-weight:600;white-space:nowrap">Mã xe:</span>',
      '        <input class="sb-input" id="' + id + '-bus-id" value="BUS-01" style="width:100px"/>',
      '        <button class="sb-btn-start" id="' + id + '-btn-start">▶ Bắt đầu</button>',
      '        <span class="sb-trip-indicator" id="' + id + '-indicator">⚪ Chưa chạy</span>',
      '      </div>',
      '    </div>',
      '    <div class="sb-card">',
      '      <div class="sb-card-title">📊 Thống kê chuyến</div>',
      '      <div class="sb-stats-grid">',
      '        <div class="sb-stat-box on-bus"><div class="num" id="' + id + '-s-onbus">–</div><div class="lbl">Trên xe</div></div>',
      '        <div class="sb-stat-box alighted"><div class="num" id="' + id + '-s-alighted">–</div><div class="lbl">Đã xuống</div></div>',
      '        <div class="sb-stat-box not-boarded"><div class="num" id="' + id + '-s-notboard">–</div><div class="lbl">Chưa lên</div></div>',
      '      </div>',
      '      <div class="sb-roster-detail" id="' + id + '-roster">Bắt đầu chuyến để xem danh sách.</div>',
      '    </div>',
      '    <div class="sb-card">',
      '      <div class="sb-card-title">📋 Nhật ký</div>',
      '      <div class="sb-log" id="' + id + '-log"></div>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('');
  }

  function registerTemplate(id) {
    return [
      '<div class="sb-header">',
      '  <span style="font-size:20px">📸</span>',
      '  <span class="sb-header-title">Đăng ký khuôn mặt học sinh</span>',
      '  <div class="sb-badge"><span class="sb-dot" id="' + id + '-dot"></span><span id="' + id + '-model-text">Đang tải model...</span></div>',
      '</div>',
      '<div class="sb-reg-body">',
      '  <div>',
      '    <div class="sb-card">',
      '      <div class="sb-card-title">👤 Thông tin học sinh</div>',
      '      <div class="sb-form-group"><label class="sb-label">Mã học sinh *</label><input class="sb-input" id="' + id + '-sid" placeholder="VD: HS-001"/></div>',
      '      <div class="sb-form-group"><label class="sb-label">Họ tên đầy đủ *</label><input class="sb-input" id="' + id + '-name" placeholder="VD: Nguyễn Văn An"/></div>',
      '    </div>',
      '    <div class="sb-card">',
      '      <div class="sb-card-title">📷 Chụp mẫu khuôn mặt (tối thiểu 3, khuyến nghị 5)</div>',
      '      <div class="sb-instructions"><b>Hướng dẫn:</b> Chụp 5 tấm từ các góc: <b>thẳng, trái, phải, cao, thấp</b>. Phím tắt: <b>Space</b></div>',
      '      <div class="sb-stage" style="max-width:360px">',
      '        <video id="' + id + '-video" autoplay muted playsinline></video>',
      '        <canvas id="' + id + '-overlay"></canvas>',
      '        <div class="sb-flash" id="' + id + '-flash"></div>',
      '      </div>',
      '      <div class="sb-samples-grid" id="' + id + '-slots">',
      '        <div class="sb-slot" id="' + id + '-slot0">1</div>',
      '        <div class="sb-slot" id="' + id + '-slot1">2</div>',
      '        <div class="sb-slot" id="' + id + '-slot2">3</div>',
      '        <div class="sb-slot" id="' + id + '-slot3">4</div>',
      '        <div class="sb-slot" id="' + id + '-slot4">5</div>',
      '      </div>',
      '      <div class="sb-progress"><div class="sb-progress-fill" id="' + id + '-prog"></div></div>',
      '      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">',
      '        <button class="sb-btn-capture" id="' + id + '-btn-capture" disabled>📷 Chụp mẫu (<span id="' + id + '-count">0</span>/5)</button>',
      '        <button class="sb-btn-ghost" id="' + id + '-btn-reset">🗑 Xóa hết</button>',
      '      </div>',
      '      <div class="sb-status" id="' + id + '-status">Đang tải model nhận diện khuôn mặt...</div>',
      '      <div style="margin-top:12px">',
      '        <button class="sb-btn-save" id="' + id + '-btn-save" disabled>✅ Lưu đăng ký</button>',
      '      </div>',
      '    </div>',
      '    <div class="sb-card">',
      '      <div class="sb-card-title">🚌 Phân công xe cho học sinh</div>',
      '      <div class="sb-assign-row">',
      '        <select class="sb-input" id="' + id + '-assign-sel" style="flex:1"></select>',
      '        <input class="sb-input" id="' + id + '-assign-bus" placeholder="Mã xe (BUS-01)" style="width:120px"/>',
      '        <button class="sb-btn-capture" id="' + id + '-btn-assign">Phân công</button>',
      '      </div>',
      '      <div id="' + id + '-assign-list" style="margin-top:12px"></div>',
      '    </div>',
      '  </div>',
      '  <div>',
      '    <div class="sb-card">',
      '      <div class="sb-card-title">📋 Danh sách học sinh đã đăng ký</div>',
      '      <div id="' + id + '-student-list"><div class="sb-empty">Chưa có học sinh nào.</div></div>',
      '    </div>',
      '    <div class="sb-card">',
      '      <div class="sb-card-title">🚌 Phân công xe (tổng quan)</div>',
      '      <div id="' + id + '-bus-overview"><div class="sb-empty">Chưa có phân công xe nào.</div></div>',
      '      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">',
      '        <button class="sb-btn-ghost" id="' + id + '-btn-export">📤 Xuất JSON</button>',
      '        <button class="sb-btn-danger" id="' + id + '-btn-clearall">🗑 Xóa tất cả HS</button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('');
  }

  // ─────────────────────────────────────────────
  // WIDGET INSTANCES
  // ─────────────────────────────────────────────
  var instances = {};

  // ─────────────────────────────────────────────
  // CHECKIN WIDGET LOGIC
  // ─────────────────────────────────────────────
  function initCheckin(id, container, opts) {
    var modelReady = false;
    var tripStarted = false;
    var isScanning = false;

    var $ = function (sel) { return container.querySelector(sel); };
    var byId = function (sid) { return document.getElementById(sid); };

    function setStatus(t, c) {
      var el = byId(id + '-status');
      el.textContent = t; el.className = 'sb-status' + (c ? ' ' + c : '');
    }
    function logLine(t, cls) {
      var log = byId(id + '-log');
      var d = document.createElement('div'); d.className = cls || 'lc';
      d.textContent = '[' + new Date().toLocaleTimeString('vi-VN') + '] ' + t;
      log.prepend(d);
    }
    function updateStats(summary) {
      if (!summary) return;
      byId(id + '-s-onbus').textContent = summary.counts.on_bus;
      byId(id + '-s-alighted').textContent = summary.counts.alighted;
      byId(id + '-s-notboard').textContent = summary.counts.not_boarded;
      var entries = summary.entries || [];
      if (entries.length) {
        var html = entries.map(function (e) {
          var icon = e.status === 'on_bus' ? '🟦' : e.status === 'alighted' ? '🟢' : '⚪';
          var label = e.status === 'on_bus' ? 'Trên xe' : e.status === 'alighted' ? 'Đã xuống' : 'Chưa lên';
          return '<div class="sb-roster-row"><span>' + icon + ' <b>' + e.full_name + '</b></span><span style="color:var(--sb-text3)">' + label + '</span></div>';
        }).join('');
        byId(id + '-roster').innerHTML = html;
      }
    }
    function showBanner(msg, duration) {
      var b = byId(id + '-banner');
      b.textContent = msg; b.classList.add('show');
      setTimeout(function () { b.classList.remove('show'); }, duration || 3000);
    }

    async function startCamera() {
      try {
        var s = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360, facingMode: 'user' } });
        byId(id + '-video').srcObject = s;
        instances[id].stream = s;
        await new Promise(function (r) { byId(id + '-video').onloadedmetadata = r; });
      } catch (e) { setStatus('Lỗi camera: ' + e.message, 'error'); }
    }

    async function initModels() {
      try {
        await loadFaceModels(opts.modelsPath, function (msg, cls) { setStatus(msg, cls); });
        modelReady = true;
        byId(id + '-dot').classList.add('ready');
        byId(id + '-model-text').textContent = 'Model sẵn sàng';
        setStatus('Model sẵn sàng. Bấm "Bắt đầu chuyến" để điểm danh.', 'success');
        startDrawLoop(byId(id + '-video'), byId(id + '-overlay'), function () { return modelReady; });
      } catch (e) { byId(id + '-model-text').textContent = 'Lỗi'; setStatus('Lỗi tải model: ' + e.message, 'error'); }
    }

    byId(id + '-btn-start').addEventListener('click', function () {
      var busId = byId(id + '-bus-id').value.trim();
      if (!busId) { setStatus('Nhập mã xe trước.', 'warning'); return; }
      var students = getStudentsForBus(busId);
      startTrip(busId, students);
      tripStarted = true;
      byId(id + '-btn-board').disabled = false;
      byId(id + '-btn-alight').disabled = false;
      byId(id + '-btn-end').disabled = false;
      byId(id + '-btn-start').disabled = true;
      byId(id + '-indicator').textContent = '🟢 Đang chạy';
      byId(id + '-indicator').className = 'sb-trip-indicator running';
      var summary = rosterSummary(getRoster(busId));
      updateStats(summary);
      setStatus('Chuyến ' + busId + ' bắt đầu! ' + students.length + ' học sinh.', 'success');
      logLine('Bắt đầu chuyến: ' + busId + ' (' + students.length + ' HS)', 'ls');
    });

    async function handleScan(eventType) {
      if (!modelReady) { setStatus('Model chưa sẵn sàng.', 'warning'); return; }
      if (!tripStarted) { setStatus('Chưa bắt đầu chuyến!', 'warning'); return; }
      if (isScanning) return;
      isScanning = true;
      var busId = byId(id + '-bus-id').value.trim();
      var scanLine = byId(id + '-scanline');
      scanLine.classList.add('active');
      setStatus('Đang quét khuôn mặt...', 'loading');

      var desc = await captureDescriptor(byId(id + '-video'));
      if (!desc) {
        setStatus('Không phát hiện khuôn mặt. Di chuyển vào trung tâm khung hình.', 'warning');
        scanLine.classList.remove('active'); isScanning = false; return;
      }

      var students = getStudentRegistry();
      var match = findBestMatch(desc, students);
      if (!match.is_match) {
        setStatus('⚠️ Không nhận diện được khuôn mặt! (dist=' + match.distance + ')', 'error');
        logLine('Không nhận diện được khuôn mặt (dist=' + match.distance + ')', 'le');
        playAlert('critical');
        if (opts.onAlert) opts.onAlert({ severity: 'critical', code: 'unknown_face', message: 'Không nhận diện được khuôn mặt' });
        scanLine.classList.remove('active'); isScanning = false; return;
      }

      var result = registerScan(busId, match.student_id, eventType, match.full_name);
      updateStats(result.roster_summary);

      if (result.alerts && result.alerts.length) {
        var isCritical = result.alerts.some(function (a) { return a.severity === 'critical'; });
        var msg = result.alerts.map(function (a) { return a.message; }).join(' | ');
        setStatus(msg, isCritical ? 'error' : 'warning');
        result.alerts.forEach(function (a) { logLine(a.message, a.severity === 'critical' ? 'le' : 'lw'); });
        if (isCritical) { playAlert('critical'); showBanner(result.alerts[0].message, 5000); }
        else playAlert('warning');
        if (opts.onAlert) result.alerts.forEach(function (a) { opts.onAlert(a); });
      } else {
        var action = eventType === 'boarded' ? 'ĐÃ LÊN XE ⬆️' : 'ĐÃ XUỐNG XE ⬇️';
        setStatus(match.full_name + ' — ' + action + ' (dist: ' + match.distance + ')', 'success');
        logLine(match.full_name + ' — ' + action, 'ls');
        playSuccess();
        if (opts.onScanSuccess) opts.onScanSuccess({ student_id: match.student_id, full_name: match.full_name }, eventType);
      }
      scanLine.classList.remove('active'); isScanning = false;
    }

    byId(id + '-btn-board').addEventListener('click', function () { handleScan('boarded'); });
    byId(id + '-btn-alight').addEventListener('click', function () { handleScan('alighted'); });

    byId(id + '-btn-end').addEventListener('click', function () {
      var busId = byId(id + '-bus-id').value.trim();
      setStatus('Đang rà soát khoang xe...', 'loading');
      var scanLine = byId(id + '-scanline');
      scanLine.classList.add('active');
      setTimeout(function () { scanLine.classList.remove('active'); }, 2000);
      var result = cabinSweep(busId);
      updateStats(result.roster_summary);
      if (result.alerts && result.alerts.length) {
        var msg = result.alerts.map(function (a) { return a.message; }).join(' | ');
        setStatus('🚨 ' + msg, 'error');
        result.alerts.forEach(function (a) { logLine('[KHOANG XE] ' + a.message, 'le'); });
        playAlert('critical');
        showBanner('🚨 PHÁT HIỆN HỌC SINH TRÊN XE! KIỂM TRA NGAY!', 8000);
        if (opts.onAlert) result.alerts.forEach(function (a) { opts.onAlert(a); });
      } else {
        setStatus('✅ An toàn! Khoang xe sạch. Chuyến kết thúc.', 'success');
        logLine('Kết thúc chuyến – khoang xe an toàn ✅', 'ls');
        playSuccess();
      }
      tripStarted = false;
      byId(id + '-btn-board').disabled = true;
      byId(id + '-btn-alight').disabled = true;
      byId(id + '-btn-end').disabled = true;
      byId(id + '-btn-start').disabled = false;
      byId(id + '-indicator').textContent = '⚪ Kết thúc';
      byId(id + '-indicator').className = 'sb-trip-indicator';
    });

    (async function () { await startCamera(); await initModels(); })();
  }

  // ─────────────────────────────────────────────
  // REGISTER WIDGET LOGIC
  // ─────────────────────────────────────────────
  function initRegister(id, container, opts) {
    var modelReady = false;
    var capturedDescriptors = [];
    var capturedThumbs = [];
    var isCapturing = false;
    var MAX = 5;

    var byId = function (sid) { return document.getElementById(sid); };

    function setStatus(t, c) {
      var el = byId(id + '-status');
      el.textContent = t; el.className = 'sb-status' + (c ? ' ' + c : '');
    }
    function updateSampleUI() {
      var n = capturedDescriptors.length;
      byId(id + '-count').textContent = n;
      byId(id + '-prog').style.width = (n / MAX * 100) + '%';
      for (var i = 0; i < MAX; i++) {
        var slot = byId(id + '-slot' + i);
        if (i < n && capturedThumbs[i]) {
          slot.innerHTML = '<img src="' + capturedThumbs[i] + '" alt="Mau ' + (i + 1) + '"/>';
          slot.classList.add('filled');
        } else {
          slot.innerHTML = '' + (i + 1);
          slot.classList.remove('filled');
        }
      }
      byId(id + '-btn-capture').disabled = !modelReady || n >= MAX;
      byId(id + '-btn-save').disabled = n < 3;
    }
    function renderAll() {
      renderStudentList();
      renderStudentDropdown();
      renderBusAssignment();
    }
    function renderStudentDropdown() {
      var sel = byId(id + '-assign-sel');
      var list = getStudentRegistry();
      sel.innerHTML = list.length
        ? list.map(function (s) { return '<option value="' + s.student_id + '">' + s.full_name + ' (' + s.student_id + ')</option>'; }).join('')
        : '<option value="">-- Chưa có học sinh --</option>';
    }
    function renderStudentList() {
      var list = getStudentRegistry();
      var area = byId(id + '-student-list');
      if (!list.length) { area.innerHTML = '<div class="sb-empty">Chưa có học sinh nào.</div>'; return; }
      area.innerHTML = '<table class="sb-student-table"><thead><tr><th>#</th><th>Mã HS</th><th>Họ tên</th><th>Mẫu</th><th></th></tr></thead><tbody>' +
        list.map(function (s, i) {
          return '<tr><td>' + (i + 1) + '</td><td><code style="font-size:11px;background:rgba(255,255,255,.08);padding:1px 5px;border-radius:4px;color:var(--sb-primary-light)">' + s.student_id + '</code></td><td><b>' + s.full_name + '</b></td><td><span class="sb-badge-green">' + s.descriptors.length + ' mẫu</span></td><td><button class="sb-btn-danger" data-sid="' + s.student_id + '">Xóa</button></td></tr>';
        }).join('') + '</tbody></table>';
      var btns = area.querySelectorAll('.sb-btn-danger[data-sid]');
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          deleteStudent(btn.getAttribute('data-sid'));
          renderAll();
        });
      });
    }
    function renderBusAssignment() {
      var a = getBusAssignments();
      var keys = Object.keys(a);
      var area = byId(id + '-bus-overview');
      if (!keys.length) { area.innerHTML = '<div class="sb-empty">Chưa có phân công xe nào.</div>'; return; }
      area.innerHTML = keys.map(function (busId) {
        var students = a[busId];
        return '<div style="margin-bottom:14px"><div style="font-size:12px;font-weight:700;color:var(--sb-primary-light);margin-bottom:7px">🚌 ' + busId + '</div>' +
          (students.length
            ? students.map(function (s) { return '<span class="sb-tag">' + s.full_name + '<button data-bus="' + busId + '" data-sid="' + s.student_id + '">×</button></span> '; }).join('')
            : '<span style="color:var(--sb-text3);font-size:12px">Chưa có học sinh</span>') +
          '</div>';
      }).join('');
      area.querySelectorAll('.sb-tag button').forEach(function (btn) {
        btn.addEventListener('click', function () {
          removeStudentFromBus(btn.getAttribute('data-bus'), btn.getAttribute('data-sid'));
          renderAll();
        });
      });
    }

    async function startCamera() {
      try {
        var stream = await navigator.mediaDevices.getUserMedia({ video: { width: 480, height: 360, facingMode: 'user' } });
        byId(id + '-video').srcObject = stream;
        instances[id].stream = stream;
        await new Promise(function (r) { byId(id + '-video').onloadedmetadata = r; });
      } catch (e) { setStatus('Lỗi camera: ' + e.message, 'error'); }
    }

    async function initModels() {
      try {
        await loadFaceModels(opts.modelsPath, function (msg, cls) { setStatus(msg, cls); });
        modelReady = true;
        byId(id + '-dot').classList.add('ready');
        byId(id + '-model-text').textContent = 'Model sẵn sàng';
        setStatus('Sẵn sàng chụp mẫu khuôn mặt.', 'success');
        updateSampleUI();
        startDrawLoop(byId(id + '-video'), byId(id + '-overlay'), function () { return modelReady; });
      } catch (e) {
        byId(id + '-model-text').textContent = 'Lỗi';
        setStatus('Lỗi tải model: ' + e.message, 'error');
      }
    }

    async function captureSample() {
      if (!modelReady || isCapturing) return;
      if (capturedDescriptors.length >= MAX) { setStatus('Đã đủ 5 mẫu. Bấm "Lưu đăng ký".', 'warning'); return; }
      isCapturing = true;
      setStatus('Đang chụp mẫu...', 'loading');
      try {
        var vid = byId(id + '-video');
        var result = await faceapi
          .detectSingleFace(vid, new faceapi.TinyFaceDetectorOptions({ inputSize: 224 }))
          .withFaceLandmarks().withFaceDescriptor();
        if (!result) { setStatus('Không phát hiện khuôn mặt. Di chuyển vào trung tâm.', 'warning'); isCapturing = false; return; }
        var tmp = document.createElement('canvas');
        tmp.width = vid.videoWidth; tmp.height = vid.videoHeight;
        tmp.getContext('2d').drawImage(vid, 0, 0);
        capturedThumbs.push(tmp.toDataURL('image/jpeg', .7));
        capturedDescriptors.push(Array.from(result.descriptor));
        var fl = byId(id + '-flash');
        fl.classList.add('active'); setTimeout(function () { fl.classList.remove('active'); }, 150);
        var n = capturedDescriptors.length;
        setStatus(n < 3 ? 'Đã chụp ' + n + '/5 – cần thêm ' + (3 - n) + ' mẫu' : n < MAX ? 'Đã chụp ' + n + '/5. Có thể lưu hoặc chụp thêm.' : 'Đủ 5 mẫu! Bấm "Lưu đăng ký".', 'success');
        updateSampleUI();
      } catch (e) { setStatus('Lỗi: ' + e.message, 'error'); }
      isCapturing = false;
    }

    byId(id + '-btn-capture').addEventListener('click', captureSample);
    byId(id + '-btn-reset').addEventListener('click', function () {
      capturedDescriptors = []; capturedThumbs = [];
      updateSampleUI(); setStatus('Đã xóa mẫu.', '');
    });
    byId(id + '-btn-save').addEventListener('click', function () {
      var sid = byId(id + '-sid').value.trim();
      var name = byId(id + '-name').value.trim();
      if (!sid || !name) { setStatus('Nhập đầy đủ Mã học sinh và Họ tên.', 'warning'); return; }
      if (capturedDescriptors.length < 3) { setStatus('Cần ít nhất 3 mẫu khuôn mặt.', 'warning'); return; }
      var s = registerStudent(sid, name, capturedDescriptors);
      setStatus('✅ Đăng ký thành công: ' + name + ' (' + s.descriptors.length + ' mẫu)', 'success');
      byId(id + '-sid').value = ''; byId(id + '-name').value = '';
      capturedDescriptors = []; capturedThumbs = [];
      updateSampleUI(); renderAll();
    });
    byId(id + '-btn-assign').addEventListener('click', function () {
      var sel = byId(id + '-assign-sel');
      var busId = byId(id + '-assign-bus').value.trim();
      if (!sel.value || !busId) { alert('Chọn học sinh và nhập mã xe'); return; }
      var sname = getStudentRegistry().find(function (s) { return s.student_id === sel.value; });
      assignStudentToBus(busId, sel.value, sname ? sname.full_name : sel.value);
      renderAll();
    });
    byId(id + '-btn-export').addEventListener('click', exportData);
    byId(id + '-btn-clearall').addEventListener('click', function () {
      if (confirm('Xóa hết dữ liệu học sinh?')) { clearAllStudents(); renderAll(); }
    });

    document.addEventListener('keydown', function handler(e) {
      if (!instances[id]) { document.removeEventListener('keydown', handler); return; }
      if (e.code === 'Space' && !e.target.matches('input,select')) { e.preventDefault(); captureSample(); }
    });

    renderAll();
    (async function () { await startCamera(); await initModels(); })();
  }

  // ─────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────
  global.SafeBus = {
    /**
     * Khởi tạo widget SafeBus vào container.
     * @param {string} containerId - ID của div sẽ chứa widget
     * @param {object} options     - Cấu hình
     */
    init: function (containerId, options) {
      var opts = Object.assign({
        mode: 'checkin',
        busId: 'BUS-01',
        modelsPath: './models',
        onScanSuccess: null,
        onAlert: null
      }, options || {});

      var container = document.getElementById(containerId);
      if (!container) { console.error('[SafeBus SDK] Container not found: #' + containerId); return; }
      if (typeof faceapi === 'undefined') { console.error('[SafeBus SDK] face-api.js chưa được tải. Thêm <script src="face-api.min.js"> trước safebus-sdk.js'); return; }

      injectCSS();
      container.classList.add('sb-widget');

      // Pre-fill busId vào input nếu được truyền vào
      var id = containerId;

      if (opts.mode === 'checkin') {
        container.innerHTML = checkinTemplate(id);
        document.getElementById(id + '-bus-id').value = opts.busId;
        instances[id] = { mode: 'checkin', stream: null };
        initCheckin(id, container, opts);
      } else if (opts.mode === 'register') {
        container.innerHTML = registerTemplate(id);
        instances[id] = { mode: 'register', stream: null };
        initRegister(id, container, opts);
      } else {
        console.error('[SafeBus SDK] Mode không hợp lệ: ' + opts.mode + '. Dùng "checkin" hoặc "register".');
      }

      console.log('[SafeBus SDK] Widget "' + opts.mode + '" đã khởi tạo trong #' + containerId);
    },

    /**
     * Dừng widget và giải phóng camera.
     * @param {string} containerId
     */
    destroy: function (containerId) {
      var inst = instances[containerId];
      if (!inst) return;
      if (inst.stream) { inst.stream.getTracks().forEach(function (t) { t.stop(); }); }
      var container = document.getElementById(containerId);
      if (container) { container.innerHTML = ''; container.classList.remove('sb-widget'); }
      delete instances[containerId];
      console.log('[SafeBus SDK] Widget #' + containerId + ' đã bị hủy.');
    },

    /** Xuất toàn bộ dữ liệu học sinh và phân công xe ra file JSON */
    exportData: exportData,

    /** Truy cập engine functions trực tiếp (nâng cao) */
    engine: {
      getStudentRegistry: getStudentRegistry,
      getStudentsForBus: getStudentsForBus,
      getBusAssignments: getBusAssignments,
      getRoster: getRoster,
      rosterSummary: rosterSummary,
      findBestMatch: findBestMatch
    }
  };

})(window);
