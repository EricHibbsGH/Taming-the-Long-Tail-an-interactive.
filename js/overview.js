/*
   overview.js — Overview tab charts
   All data from ASPLOS '26 paper
    */

/* E2E Training Speed — Figure 11 (H100) */
(function () {
  /* Custom annotation plugin to highlight geomean */
  var geoAnnotation = {
    id: 'geoAnnotation',
    afterDraw: function (chart) {
      var meta = chart.getDatasetMeta(3); /* TLT (Ours) dataset */
      if (!meta || !meta.data || meta.data.length < 5) return;
      var bar = meta.data[4]; /* Geomean bar */
      if (!bar) return;
      var ctx = chart.ctx;
      var x = bar.x, y = bar.y;
      ctx.save();
      ctx.fillStyle = C.accent2;
      ctx.font = '600 9px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('1.76\xd7', x, y - 6);
      /* Subtle glow under geomean bar */
      ctx.shadowColor = 'rgba(59,130,246,.3)';
      ctx.shadowBlur = 8;
      ctx.fillStyle = 'rgba(59,130,246,.08)';
      ctx.fillRect(bar.x - bar.width / 2 - 4, chart.chartArea.top, bar.width + 8, chart.chartArea.bottom - chart.chartArea.top);
      ctx.restore();
    }
  };

  new Chart(document.getElementById('chartE2E'), {
    type: 'bar',
    data: {
      labels: ['Qwen-7B', 'DS-7B', 'Qwen-32B', 'Llama-70B', 'Geomean'],
      datasets: [
        { label: 'Open-R1', data: [0.25, 0.07, 0.22, null, 0.18], backgroundColor: C.text3, borderRadius: 3 },
        { label: 'VeRL', data: [1.00, 1.00, 1.00, 1.00, 1.00], backgroundColor: C.orange, borderRadius: 3 },
        { label: 'TLT-Base', data: [1.41, 1.31, 1.54, 1.38, 1.42], backgroundColor: C.purple, borderRadius: 3 },
        { label: 'TLT (Ours)', data: [1.86, 1.86, 2.12, 1.71, 1.76], backgroundColor: C.accent, borderRadius: 3 }
      ]
    },
    options: {
      plugins: {
        legend: { position: 'top' },
        tooltip: { callbacks: { label: function (c) { return c.dataset.label + ': ' + (c.raw != null ? c.raw + '\xd7' : 'N/A'); } } }
      },
      scales: {
        y: { title: { display: true, text: 'Normalized Speed', font: { size: 9 } }, grid: { color: C.grid }, ticks: { callback: function (v) { return v + '\xd7'; }, font: { size: 9 } } },
        x: { grid: { display: false }, ticks: { font: { size: 9 } } }
      }
    },
    plugins: [geoAnnotation]
  });
})();

/* Response Length Distribution — Figure 1a */
(function () {
  var labels = [], qwen = [], ds = [];
  for (var i = 0; i <= 30; i++) {
    labels.push(i === 0 ? '0' : i + 'K');
    qwen.push(Math.max(0, 3.2 * Math.exp(-i / 2.5) + 0.08 * Math.exp(-Math.pow(i - 28, 2) / 8)));
    ds.push(Math.max(0, 2.8 * Math.exp(-i / 3.0) + 0.12 * Math.exp(-Math.pow(i - 29, 2) / 6)));
  }

  /* Annotation plugin to mark the long tail */
  var longTailAnnotation = {
    id: 'longTailAnnotation',
    afterDraw: function (chart) {
      var ctx = chart.ctx;
      var area = chart.chartArea;
      var xScale = chart.scales.x;
      var tailStart = xScale.getPixelForValue(22);
      if (!tailStart) return;
      ctx.save();
      /* Red shaded zone for the tail region */
      ctx.fillStyle = 'rgba(239,68,68,0.07)';
      ctx.fillRect(tailStart, area.top, area.right - tailStart, area.bottom - area.top);
      /* Dashed boundary line */
      ctx.strokeStyle = 'rgba(239,68,68,0.6)';
      ctx.setLineDash([4, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tailStart, area.top);
      ctx.lineTo(tailStart, area.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      /* Main label */
      ctx.fillStyle = C.red2;
      ctx.font = '700 10px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText('\u26a0 Long-Tail Zone', tailStart + 5, area.top + 16);
      /* Sub-label */
      ctx.fillStyle = 'rgba(248,113,113,0.7)';
      ctx.font = '500 8px JetBrains Mono';
      ctx.fillText('~5% of requests', tailStart + 5, area.top + 28);
      ctx.fillText('hold up entire batch', tailStart + 5, area.top + 39);
      ctx.restore();
    }
  };

  new Chart(document.getElementById('chartDist'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Qwen-7B', data: qwen, borderColor: C.accent, backgroundColor: 'rgba(59,130,246,.08)', fill: true, tension: .4, pointRadius: 0, borderWidth: 1.5 },
        { label: 'DeepSeek-R1-7B', data: ds, borderColor: C.green, backgroundColor: 'rgba(34,197,94,.06)', fill: true, tension: .4, pointRadius: 0, borderWidth: 1.5 }
      ]
    },
    options: {
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { title: { display: true, text: 'Density', font: { size: 9 } }, grid: { color: C.grid }, ticks: { font: { size: 9 } } },
        x: { title: { display: true, text: 'Response Length (tokens)', font: { size: 9 } }, grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 8 } } }
      }
    },
    plugins: [longTailAnnotation]
  });
})();

/* Token Accept Rate — Figure 16 */
(function () {
  /* Annotation showing the gap between vanilla and adaptive */
  var gapAnnotation = {
    id: 'gapAnnotation',
    afterDraw: function (chart) {
      var ctx = chart.ctx;
      var meta0 = chart.getDatasetMeta(0); /* Vanilla */
      var meta1 = chart.getDatasetMeta(1); /* Adaptive */
      if (!meta0.data || !meta1.data || meta0.data.length < 8) return;
      /* Draw gap arrow at position 8 */
      var pt0 = meta0.data[7]; /* Vanilla at pos 8 */
      var pt1 = meta1.data[7]; /* Adaptive at pos 8 */
      if (!pt0 || !pt1) return;
      ctx.save();
      ctx.strokeStyle = C.green2;
      ctx.fillStyle = C.green2;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(pt0.x + 8, pt0.y);
      ctx.lineTo(pt1.x + 8, pt1.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '600 8px JetBrains Mono';
      ctx.textAlign = 'left';
      var midY = (pt0.y + pt1.y) / 2;
      ctx.fillText('+26%', pt0.x + 12, midY + 3);
      ctx.restore();
    }
  };

  new Chart(document.getElementById('chartAccept'), {
    type: 'line',
    data: {
      labels: ['1', '2', '3', '4', '5', '6', '7', '8'],
      datasets: [
        { label: 'Vanilla Drafter', data: [92, 72, 52, 36, 24, 16, 10, 6], borderColor: C.orange, backgroundColor: 'rgba(245,158,11,.08)', fill: true, tension: .3, pointRadius: 3, pointBackgroundColor: C.orange, borderWidth: 1.5 },
        { label: 'Adaptive Drafter', data: [96, 88, 78, 68, 58, 48, 40, 32], borderColor: C.accent, backgroundColor: 'rgba(59,130,246,.08)', fill: true, tension: .3, pointRadius: 3, pointBackgroundColor: C.accent, borderWidth: 1.5 }
      ]
    },
    options: {
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { title: { display: true, text: 'Accept Rate (%)', font: { size: 9 } }, min: 0, max: 100, grid: { color: C.grid }, ticks: { font: { size: 9 } } },
        x: { title: { display: true, text: 'Draft Token Position', font: { size: 9 } }, grid: { display: false }, ticks: { font: { size: 9 } } }
      }
    },
    plugins: [gapAnnotation]
  });
})();

/* RL Step Timeline — Figure 1b */
(function () {
  var body = document.getElementById('timelineBody');
  body.style.cssText = 'display:flex;flex-direction:column;justify-content:flex-start;gap:8px;overflow:hidden';

  var vanillaData = [
    { w: [85, 10, 5], idle: 0 },
    { w: [65, 10, 5], idle: 20 },
    { w: [50, 10, 5], idle: 35 },
    { w: [40, 10, 5], idle: 45 },
    { w: [30, 10, 5], idle: 55 }
  ];
  var tltData = [
    { w: [55, 8, 7], sd: 10, dt: 0 },
    { w: [42, 8, 7], sd: 8, dt: 15 },
    { w: [32, 8, 7], sd: 6, dt: 27 },
    { w: [25, 8, 7], sd: 5, dt: 35 },
    { w: [20, 8, 7], sd: 4, dt: 41 }
  ];

  /* Legend */
  var leg = document.createElement('div');
  leg.style.cssText = 'display:flex;gap:10px;font-size:9px;font-family:var(--mono);color:var(--text3);margin-bottom:2px;flex-shrink:0';
  [['Rollout', C.accent], ['SD Accel', C.purple2], ['Drafter Train', C.cyan], ['Inference', C.green], ['RL Train', C.orange], ['Idle (wasted)', 'rgba(239,68,68,0.4)']].forEach(function (p) {
    leg.innerHTML += '<span><i style="display:inline-block;width:7px;height:7px;border-radius:2px;background:' + p[1] + ';margin-right:2px;vertical-align:middle"></i>' + p[0] + '</span>';
  });
  body.appendChild(leg);

  function buildSection(label, data, isTLT) {
    var sec = document.createElement('div');
    sec.innerHTML = '<div style="font-size:9px;font-weight:600;color:var(--text2);margin-bottom:1px;font-family:var(--mono)">' + label + '</div>';
    var tl = document.createElement('div');
    tl.className = 'timeline';
    data.forEach(function (row, i) {
      var r = document.createElement('div'); r.className = 'tl-row';
      var id = label.replace(/[^a-zA-Z0-9]/g, '') + 'w' + i;
      r.innerHTML = '<div class="tl-label">W' + (i + 1) + '</div><div class="tl-track" id="' + id + '"></div>';
      tl.appendChild(r);
    });
    sec.appendChild(tl);
    body.appendChild(sec);

    setTimeout(function () {
      data.forEach(function (row, i) {
        var id = label.replace(/[^a-zA-Z0-9]/g, '') + 'w' + i;
        var track = document.getElementById(id);
        if (!track) return;
        var left = 0;
        addSeg(track, left, row.w[0], C.accent); left += row.w[0];
        if (isTLT && row.dt > 0) addSeg(track, left, row.dt, C.cyan, .6);
        if (isTLT && row.sd > 0) addSeg(track, row.w[0] - row.sd, row.sd, C.purple2, .7);
        if (!isTLT && row.idle > 0) { addSeg(track, left, row.idle, 'rgba(239,68,68,0.18)'); left += row.idle; }
        var infL = isTLT ? row.w[0] + Math.max(row.dt || 0, 0) : left;
        addSeg(track, Math.min(infL, 86), row.w[1], C.green);
        addSeg(track, Math.min(infL, 86) + row.w[1], row.w[2], C.orange);
      });
    }, 250);
  }

  function addSeg(track, left, width, color, opacity) {
    var s = document.createElement('div');
    s.className = 'tl-seg';
    s.style.cssText = 'left:' + left + '%;width:0;background:' + color + ';' + (opacity ? 'opacity:' + opacity : '');
    track.appendChild(s);
    requestAnimationFrame(function () { s.style.width = width + '%'; });
  }

  buildSection('Vanilla RL', vanillaData, false);
  buildSection('TLT (Ours)', tltData, true);
})();
