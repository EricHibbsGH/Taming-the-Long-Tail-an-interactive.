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
      var meta = chart.getDatasetMeta(3); /* TLT (MIT) dataset */
      if (!meta || !meta.data || meta.data.length < 5) return;
      var bar = meta.data[4]; /* Geomean bar */
      if (!bar) return;
      var ctx = chart.ctx;
      var x = bar.x, y = bar.y;
      ctx.save();
      ctx.fillStyle = C.accent2;
      ctx.font = '600 9px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText('1.86\xd7', x, y - 6);
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
        { label: 'Open-R1', data: [0.25, 0.07, 0.22, null, 0.18], backgroundColor: 'rgba(93,99,114,0.5)', borderRadius: 3 },
        { label: 'VeRL (baseline)', data: [1.00, 1.00, 1.00, 1.00, 1.00], backgroundColor: 'rgba(148,163,184,0.55)', borderRadius: 3 },
        { label: 'TLT-Base', data: [1.41, 1.31, 1.54, 1.38, 1.42], backgroundColor: 'rgba(59,130,246,0.45)', borderRadius: 3 },
        { label: 'TLT (MIT)', data: [1.76, 1.71, 2.12, 1.86, 1.86], backgroundColor: C.accent, borderRadius: 3 }
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

  /* Annotation: subtle boundary + label at the long-tail threshold */
  var longTailAnnotation = {
    id: 'longTailAnnotation',
    afterDraw: function (chart) {
      var ctx = chart.ctx;
      var area = chart.chartArea;
      var xScale = chart.scales.x;
      var tailStart = xScale.getPixelForValue(22);
      if (!tailStart) return;
      ctx.save();
      /* Very subtle background tint for the tail zone */
      ctx.fillStyle = 'rgba(239,68,68,0.04)';
      ctx.fillRect(tailStart, area.top, area.right - tailStart, area.bottom - area.top);
      /* Thin dashed boundary — neutral, not alarming */
      ctx.strokeStyle = 'rgba(239,68,68,0.45)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tailStart, area.top);
      ctx.lineTo(tailStart, area.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      /* Compact label above the line */
      ctx.fillStyle = 'rgba(248,113,113,0.75)';
      ctx.font = '600 9px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText('Long-Tail Zone', tailStart + 5, area.top + 13);
      ctx.font = '400 8px JetBrains Mono';
      ctx.fillStyle = 'rgba(248,113,113,0.5)';
      ctx.fillText('~5% of requests stall the batch', tailStart + 5, area.top + 25);
      ctx.restore();
    }
  };

  new Chart(document.getElementById('chartDist'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        /* Solid line — Qwen-7B */
        { label: 'Qwen-7B',         data: qwen, borderColor: C.accent,                  backgroundColor: 'transparent', fill: false, tension: .4, pointRadius: 0, borderWidth: 2 },
        /* Dashed line — DeepSeek, visually distinct without a second fill */
        { label: 'DeepSeek-R1-7B',  data: ds,   borderColor: 'rgba(148,163,184,0.75)',  backgroundColor: 'transparent', fill: false, tension: .4, pointRadius: 0, borderWidth: 1.5, borderDash: [5, 4] }
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
      ctx.fillText('+14%', pt0.x + 12, midY + 3);
      ctx.restore();
    }
  };

  new Chart(document.getElementById('chartAccept'), {
    type: 'line',
    data: {
      labels: ['1', '2', '3', '4', '5', '6', '7', '8'],
      datasets: [
        { label: 'Vanilla Drafter', data: [92, 72, 52, 36, 24, 16, 10, 6], borderColor: C.orange, backgroundColor: 'rgba(245,158,11,.08)', fill: true, tension: .3, pointRadius: 3, pointBackgroundColor: C.orange, borderWidth: 1.5 },
        { label: 'Adaptive Drafter', data: [96, 88, 78, 65, 50, 38, 28, 20], borderColor: C.accent, backgroundColor: 'rgba(59,130,246,.08)', fill: true, tension: .3, pointRadius: 3, pointBackgroundColor: C.accent, borderWidth: 1.5 }
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

/* RL Step Timeline — Figure 1b
 *
 * Design: All workers share a single time axis (0–100%).
 * Vanilla: Each worker's rollout ends at different times. Early-finishing
 *   workers sit IDLE (empty track space) until the slowest finishes at 85%.
 *   Then ALL workers do inference + training together.
 * TLT: SD shortens the longest rollout to ~44%. Idle GPUs train the drafter
 *   in parallel. All workers finish inference + training ~41% earlier.
 */
(function () {
  var body = document.getElementById('timelineBody');
  body.style.cssText = 'display:flex;flex-direction:column;gap:6px;overflow:hidden;padding:2px 0';

  /* Semantic palette — blue family for TLT work, neutral for standard RL phases */
  var TL_ROLLOUT = 'rgba(59,130,246,0.9)';     /* solid blue — active rollout          */
  var TL_DRAFTER = 'rgba(96,165,250,0.38)';    /* faint blue — opportunistic drafter   */
  var TL_INF     = 'rgba(148,163,184,0.5)';    /* neutral slate — response prefilling  */
  var TL_TRAIN   = 'rgba(100,116,139,0.55)';   /* darker slate — weight update         */
  /* Idle = empty track (--surface2 background) — no colored segment drawn            */

  /* Sync point: the time at which inference begins for all workers.
   * Vanilla = 85 (limited by the slowest worker's rollout length).
   * TLT     = 46 (SD acceleration shrinks the bottleneck ~1.85×).           */
  var V_SYNC = 85,  V_INF = 8,  V_TRAIN = 7;   /* vanilla: inf+train start at 85%  */
  var T_SYNC = 46,  T_INF = 8,  T_TRAIN = 7;   /* TLT:     inf+train start at 46%  */

  /* Worker rollout lengths as % of vanilla total step time */
  var vanillaRollouts = [85, 67, 52, 40, 30];   /* W1 is the long-tail worker        */
  var tltRollouts     = [46, 36, 28, 22, 17];   /* SD reduces all, especially W1     */

  /* Legend */
  var leg = document.createElement('div');
  leg.style.cssText = 'display:flex;gap:12px;font-size:9px;font-family:var(--mono);color:var(--text3);flex-shrink:0;flex-wrap:wrap;margin-bottom:2px';
  [
    ['Rollout',        TL_ROLLOUT],
    ['Drafter Train',  TL_DRAFTER],
    ['Inference',      TL_INF],
    ['RL Train',       TL_TRAIN],
    ['Idle (wasted)',  'rgba(255,255,255,0.06)']
  ].forEach(function (p) {
    var swatch = 'display:inline-block;width:9px;height:9px;border-radius:2px;background:' + p[1] + ';margin-right:3px;vertical-align:middle;' + (p[0] === 'Idle (wasted)' ? 'border:1px solid rgba(255,255,255,0.12)' : '');
    leg.innerHTML += '<span><i style="' + swatch + '"></i>' + p[0] + '</span>';
  });
  body.appendChild(leg);

  function buildSection(title, rollouts, sync, inf, train, isTLT) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'flex:1;min-height:0;display:flex;flex-direction:column;gap:1px';
    wrap.innerHTML = '<div style="font-size:9px;font-weight:600;color:var(--text2);letter-spacing:.3px;text-transform:uppercase;font-family:var(--mono);margin-bottom:2px">' + title + '</div>';

    var tl = document.createElement('div');
    tl.className = 'timeline';
    rollouts.forEach(function (_, i) {
      var row = document.createElement('div'); row.className = 'tl-row';
      row.innerHTML = '<div class="tl-label">W' + (i + 1) + '</div><div class="tl-track" id="tl_' + title.replace(/\W/g,'') + '_' + i + '"></div>';
      tl.appendChild(row);
    });
    wrap.appendChild(tl);
    body.appendChild(wrap);

    setTimeout(function () {
      rollouts.forEach(function (rolloutPct, i) {
        var track = document.getElementById('tl_' + title.replace(/\W/g,'') + '_' + i);
        if (!track) return;

        /* Rollout bar */
        addSeg(track, 0, rolloutPct, TL_ROLLOUT);

        if (isTLT && rolloutPct < sync) {
          /* Drafter training fills the gap while slower workers finish rollout */
          addSeg(track, rolloutPct, sync - rolloutPct, TL_DRAFTER);
        }
        /* Idle for vanilla is EMPTY — track background shows through (no segment) */

        /* Synchronized inference + training (same start time for all workers) */
        addSeg(track, sync,       inf,   TL_INF);
        addSeg(track, sync + inf, train, TL_TRAIN);
      });
    }, 260);
  }

  function addSeg(track, left, width, color) {
    var s = document.createElement('div');
    s.className = 'tl-seg';
    s.style.cssText = 'left:' + left + '%;width:0;background:' + color;
    track.appendChild(s);
    requestAnimationFrame(function () { s.style.width = width + '%'; });
  }

  buildSection('Vanilla RL',   vanillaRollouts, V_SYNC, V_INF, V_TRAIN, false);
  buildSection('TLT (MIT)',   tltRollouts,     T_SYNC, T_INF, T_TRAIN, true);
})();
