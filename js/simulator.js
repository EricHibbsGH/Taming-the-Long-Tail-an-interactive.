/* 
   simulator.js — Training Simulator
   Side-by-side: Baseline vs TLT rollout
   Shows GPU under-utilization (long-tail)
   vs SD-accelerated tail completion
    */

var SIM = {
  running: false, time: 0, lastTS: 0, speed: 4, frame: null,
  cfg: { model: 'Qwen2.5-32B', bs: 128, maxLen: 32768, thresh: 32 },
  baseline: { reqs: [], elapsed: 0, done: false },
  tlt: { reqs: [], elapsed: 0, done: false, sdActive: false },
  history: { t: [], baseUtil: [], tltUtil: [] }
};

var liveChart = null;

/* Deterministic pseudo-random for reproducible long-tail */
var _seed = 0;
function srand(s) { _seed = s; }
function rand() { _seed = (_seed * 1103515245 + 12345) & 0x7fffffff; return _seed / 0x7fffffff; }

/* Generate log-normal long-tail batch */
function generateBatch(n, maxLen) {
  var reqs = [];
  for (var i = 0; i < n; i++) {
    var u1 = Math.max(0.0001, rand()), u2 = rand();
    var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    var len = Math.exp(7.5 + 1.8 * z);
    len = Math.max(200, Math.min(maxLen, Math.round(len)));
    reqs.push({ target: len, progress: 0, done: false });
  }
  reqs.sort(function (a, b) { return a.target - b.target; });
  return reqs;
}

function resetSim() {
  SIM.running = false; SIM.time = 0; SIM.lastTS = 0;
  SIM.cfg.model = document.getElementById('sim-model').value;
  SIM.cfg.bs = parseInt(document.getElementById('sim-bs').value);
  SIM.cfg.maxLen = parseInt(document.getElementById('sim-maxlen').value);
  SIM.cfg.thresh = parseInt(document.getElementById('sim-thresh').value);
  SIM.speed = parseInt(document.getElementById('sim-speed').value);
  SIM.history = { t: [], baseUtil: [], tltUtil: [] };

  /* Same seed = identical request distribution for fair comparison */
  srand(42);
  SIM.baseline = { reqs: generateBatch(SIM.cfg.bs, SIM.cfg.maxLen), elapsed: 0, done: false };
  srand(42);
  SIM.tlt = { reqs: generateBatch(SIM.cfg.bs, SIM.cfg.maxLen), elapsed: 0, done: false, sdActive: false };

  document.getElementById('sim-start').textContent = '▶ Start Rollout';
  if (SIM.frame) cancelAnimationFrame(SIM.frame);

  initLiveChart();
  updateKPIs();
  drawPane('simBaseline', SIM.baseline, false);
  drawPane('simTLT', SIM.tlt, true);
}

function initLiveChart() {
  var ctx = document.getElementById('chartLive').getContext('2d');
  if (liveChart) liveChart.destroy();
  liveChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Baseline GPU %', data: [], borderColor: C.orange, borderWidth: 1.5, pointRadius: 0, tension: .3, fill: { target: 'origin', above: 'rgba(245,158,11,.06)' } },
        { label: 'TLT GPU %', data: [], borderColor: C.accent, borderWidth: 1.5, pointRadius: 0, tension: .3, fill: { target: 'origin', above: 'rgba(59,130,246,.06)' } }
      ]
    },
    options: {
      animation: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { title: { display: true, text: 'GPU Util %', font: { size: 9 } }, min: 0, max: 105, grid: { color: C.grid }, ticks: { font: { size: 8 }, callback: function (v) { return v + '%'; } } },
        x: { display: false }
      }
    }
  });
}

function drawPane(canvasId, state, isTLT) {
  var canvas = document.getElementById(canvasId);
  var parent = canvas.parentElement;
  var W = parent.offsetWidth, H = parent.offsetHeight;
  if (W < 10 || H < 10) return;
  var dpr = window.devicePixelRatio || 1;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  var reqs = state.reqs, n = reqs.length;
  if (n === 0) return;
  var padL = 42, padR = 8, padT = 10, padB = 32;
  var plotW = W - padL - padR, plotH = H - padT - padB;
  if (plotH < 10 || plotW < 10) return;

  /* Compute bar sizing to strictly fit within plotH */
  var gapRatio = 0.2; /* gap is 20% of bar height */
  /* barH * n + gapRatio * barH * (n + 1) = plotH */
  var barH = plotH / (n + gapRatio * (n + 1));
  var gap = barH * gapRatio;
  /* Clamp bar size for readability */
  if (barH > 6) { barH = 6; gap = Math.max(0.5, (plotH - n * barH) / (n + 1)); }
  if (barH < 0.5) barH = 0.5;
  if (gap < 0) gap = 0;

  /* Axis lines */
  ctx.strokeStyle = '#3a4050';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padL, padT + plotH); ctx.lineTo(padL + plotW, padT + plotH);
  ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH);
  ctx.stroke();

  /* Y-axis label */
  ctx.save();
  ctx.translate(11, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#9aa0b0';
  ctx.font = '9px JetBrains Mono';
  ctx.textAlign = 'center';
  ctx.fillText('REQUESTS (sorted by length)', 0, 0);
  ctx.restore();

  /* Clip drawing to the plot area so nothing overflows past axes */
  ctx.save();
  ctx.beginPath();
  ctx.rect(padL, padT, plotW, plotH);
  ctx.clip();

  /* Threshold line for TLT */
  if (isTLT) {
    var thIdx = n - SIM.cfg.thresh;
    if (thIdx > 0 && thIdx < n) {
      var thY = padT + gap + thIdx * (barH + gap) - gap / 2;
      ctx.save();
      ctx.strokeStyle = C.purple;
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(padL, thY); ctx.lineTo(padL + plotW, thY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.purple2;
      ctx.font = '9px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.fillText('SD activates ↓ (' + SIM.cfg.thresh + ' remaining)', padL + plotW, thY - 3);
      ctx.restore();
    }
  }

  /* Draw request bars */
  for (var i = 0; i < n; i++) {
    var req = reqs[i];
    var y = padT + gap + i * (barH + gap);
    var targetW = (req.target / SIM.cfg.maxLen) * plotW;
    var progW = (req.progress / SIM.cfg.maxLen) * plotW;

    /* Target ghost */
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    ctx.fillRect(padL, y, targetW, barH);

    /* Progress */
    if (req.done) {
      ctx.fillStyle = 'rgba(34,197,94,.55)';
    } else if (isTLT && state.sdActive) {
      ctx.fillStyle = 'rgba(168,85,247,.75)';
    } else {
      ctx.fillStyle = 'rgba(59,130,246,.65)';
    }
    ctx.fillRect(padL, y, progW, barH);
  }

  ctx.restore(); /* Remove clip */

  /* Bottom axis ticks and labels */
  var tickCount = plotW > 200 ? 4 : 3;
  ctx.fillStyle = '#9aa0b0';
  ctx.font = '9px JetBrains Mono';
  ctx.textAlign = 'center';
  for (var j = 0; j <= tickCount; j++) {
    var xp = padL + plotW * j / tickCount;
    ctx.strokeStyle = '#3a4050';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xp, padT + plotH);
    ctx.lineTo(xp, padT + plotH + 4);
    ctx.stroke();
    ctx.fillText(Math.round(SIM.cfg.maxLen * j / tickCount / 1000) + 'K', xp, padT + plotH + 14);
  }

  /* X-axis title */
  ctx.fillStyle = '#9aa0b0';
  ctx.font = '9px JetBrains Mono';
  ctx.textAlign = 'center';
  ctx.fillText('Output Tokens →', padL + plotW / 2, H - 4);
}

function updateKPIs() {
  var ba = SIM.baseline.reqs.filter(function (r) { return !r.done; }).length;
  var ta = SIM.tlt.reqs.filter(function (r) { return !r.done; }).length;
  var bn = SIM.baseline.reqs.length, tn = SIM.tlt.reqs.length;
  var bUtil = bn > 0 ? Math.round(ba / bn * 100) : 0;
  var tUtil = tn > 0 ? Math.round(ta / tn * 100) : 0;

  document.getElementById('kpi-baseline').innerHTML =
    '<span><span class="sk-l">Active:</span><span class="sk-v">' + ba + '/' + bn + '</span></span>' +
    '<span><span class="sk-l">GPU:</span><span class="sk-v">' + bUtil + '%</span></span>' +
    '<span><span class="sk-l">Time:</span><span class="sk-v">' + SIM.baseline.elapsed.toFixed(1) + 's</span></span>';

  document.getElementById('kpi-tlt').innerHTML =
    '<span><span class="sk-l">Active:</span><span class="sk-v" style="color:' + (ta === 0 ? C.green2 : '') + '">' + ta + '/' + tn + '</span></span>' +
    '<span><span class="sk-l">GPU:</span><span class="sk-v">' + tUtil + '%</span></span>' +
    '<span><span class="sk-l">Time:</span><span class="sk-v">' + SIM.tlt.elapsed.toFixed(1) + 's</span></span>' +
    (SIM.tlt.sdActive ? '<span><span class="sk-v" style="color:' + C.purple2 + '">SD ON</span></span>' : '');
}

function tick(ts) {
  if (!SIM.running) return;
  if (!SIM.lastTS) SIM.lastTS = ts;
  var dt = Math.min(0.1, (ts - SIM.lastTS) / 1000) * SIM.speed;
  SIM.lastTS = ts;
  SIM.time += dt;

  var baselineDone = SIM.baseline.reqs.every(function (r) { return r.done; });
  var tltDone = SIM.tlt.reqs.every(function (r) { return r.done; });

  /* Baseline: constant 1 tok/step speed */
  if (!baselineDone) {
    SIM.baseline.elapsed += dt;
    var bTok = 180 * dt; /* tokens per tick */
    SIM.baseline.reqs.forEach(function (r) {
      if (!r.done) {
        r.progress = Math.min(r.target, r.progress + bTok * (0.85 + rand() * 0.3));
        if (r.progress >= r.target) r.done = true;
      }
    });
  }

  /* TLT: same base speed, but SD kicks in when active ≤ threshold */
  if (!tltDone) {
    SIM.tlt.elapsed += dt;
    var tActive = SIM.tlt.reqs.filter(function (r) { return !r.done; }).length;
    SIM.tlt.sdActive = tActive <= SIM.cfg.thresh && tActive > 0;

    /* SD multiplier: adaptive drafter gives ~3-4× speedup on tail */
    var sdMult = SIM.tlt.sdActive ? 3.5 : 1.0;
    var tTok = 180 * dt * sdMult;

    /* Reset RNG to keep both panes synchronized for the "same randomness" feel */
    SIM.tlt.reqs.forEach(function (r) {
      if (!r.done) {
        r.progress = Math.min(r.target, r.progress + tTok * (0.85 + rand() * 0.3));
        if (r.progress >= r.target) r.done = true;
      }
    });
  }

  /* Record GPU utilization */
  var ba2 = SIM.baseline.reqs.filter(function (r) { return !r.done; }).length;
  var ta2 = SIM.tlt.reqs.filter(function (r) { return !r.done; }).length;
  var bn2 = SIM.baseline.reqs.length;
  if (SIM.history.t.length === 0 || SIM.time - SIM.history.t[SIM.history.t.length - 1] > 0.15) {
    SIM.history.t.push(SIM.time);
    SIM.history.baseUtil.push(baselineDone ? 0 : Math.round(ba2 / bn2 * 100));
    SIM.history.tltUtil.push(tltDone ? 0 : Math.round(ta2 / bn2 * 100));

    if (liveChart && SIM.history.t.length > 1) {
      liveChart.data.labels = SIM.history.t.map(function (t) { return t.toFixed(1); });
      liveChart.data.datasets[0].data = SIM.history.baseUtil.slice();
      liveChart.data.datasets[1].data = SIM.history.tltUtil.slice();
      if (liveChart.data.labels.length > 120) {
        liveChart.data.labels.shift();
        liveChart.data.datasets[0].data.shift();
        liveChart.data.datasets[1].data.shift();
      }
      liveChart.update();
    }
  }

  drawPane('simBaseline', SIM.baseline, false);
  drawPane('simTLT', SIM.tlt, true);
  updateKPIs();

  if (baselineDone && tltDone) {
    SIM.running = false;
    document.getElementById('sim-start').textContent = '▶ Restart';
    /* Show completion summary */
    showSimSummary();
    return;
  }
  SIM.frame = requestAnimationFrame(tick);
}

/* Completion summary overlay */
function showSimSummary() {
  var speedup = SIM.baseline.elapsed > 0 ? (SIM.baseline.elapsed / SIM.tlt.elapsed).toFixed(2) : '—';
  var timeSaved = (SIM.baseline.elapsed - SIM.tlt.elapsed).toFixed(1);
  var pctSaved = SIM.baseline.elapsed > 0 ? Math.round((1 - SIM.tlt.elapsed / SIM.baseline.elapsed) * 100) : 0;
  if (typeof showToast === 'function') {
    showToast('Rollout complete — TLT speedup: ' + speedup + '× (' + pctSaved + '% faster, ' + timeSaved + 's saved)', 5000);
  }
}

/* Controls */
document.getElementById('sim-thresh').addEventListener('input', function (e) {
  document.getElementById('sim-thresh-val').textContent = e.target.value;
  SIM.cfg.thresh = parseInt(e.target.value);
});
document.getElementById('sim-speed').addEventListener('input', function (e) {
  document.getElementById('sim-speed-val').textContent = e.target.value + '×';
  SIM.speed = parseInt(e.target.value);
});

document.getElementById('sim-start').addEventListener('click', function () {
  if (SIM.running) {
    SIM.running = false;
    document.getElementById('sim-start').textContent = '▶ Resume';
  } else {
    var allDone = SIM.baseline.reqs.length > 0 && SIM.baseline.reqs.every(function (r) { return r.done; });
    if (SIM.baseline.reqs.length === 0 || allDone) resetSim();
    SIM.running = true; SIM.lastTS = 0;
    document.getElementById('sim-start').textContent = '⏸ Pause';
    SIM.frame = requestAnimationFrame(tick);
  }
});
document.getElementById('sim-reset').addEventListener('click', resetSim);

/* Resize handling */
var simRO = new ResizeObserver(function () {
  drawPane('simBaseline', SIM.baseline, false);
  drawPane('simTLT', SIM.tlt, true);
});
var bp = document.getElementById('simBaseline');
if (bp && bp.parentElement) simRO.observe(bp.parentElement);
var tp = document.getElementById('simTLT');
if (tp && tp.parentElement) simRO.observe(tp.parentElement);

/* Deferred init */
registerDeferred('training-sim', function () {
  resetSim();
});
resetSim();
