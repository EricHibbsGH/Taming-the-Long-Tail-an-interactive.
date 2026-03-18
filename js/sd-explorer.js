/*
   sd-explorer.js — Heatmaps + SD Strategy charts
*/

var DEPTHS = [4, 6, 8, 10, 12, 16];
var VERIFY = [16, 32, 48, 64, 96, 128];

/* Figure 13a — Accept Length (Qwen-32B, TP=4, BS=1, topK=8) */
var ACCEPT_LEN = [
  [4.63, 4.74, 4.78, 4.81, 4.81, 4.82],
  [5.71, 6.08, 6.16, 6.31, 6.31, 6.36],
  [6.34, 7.01, 7.24, 7.39, 7.49, 7.51],
  [6.80, 7.63, 7.97, 8.21, 8.31, 8.39],
  [7.02, 8.05, 8.49, 8.76, 8.86, 9.06],
  [7.25, 8.44, 8.97, 9.23, 9.51, 9.78]
];

/* Figure 13b — Speedup */
var SPEEDUP = [
  [2.71, 2.67, 2.63, 2.60, 2.51, 2.40],
  [3.09, 3.16, 3.15, 3.17, 3.08, 2.94],
  [3.19, 3.40, 3.43, 3.47, 3.39, 3.29],
  [3.22, 3.46, 3.56, 3.62, 3.56, 3.46],
  [3.12, 3.47, 3.58, 3.66, 3.59, 3.54],
  [2.94, 3.26, 3.41, 3.48, 3.49, 3.45]
];

/* makeHeatmap — optR/optC mark the optimal cell with a white border */
function makeHeatmap(canvasId, wrapperId, data, colorFn, fmtFn, optR, optC) {
  var canvas = document.getElementById(canvasId);
  var wrap   = document.getElementById(wrapperId);
  var ctx    = canvas.getContext('2d');

  function render() {
    var W = wrap.offsetWidth, H = wrap.offsetHeight;
    if (W < 20 || H < 20) return;
    var dpr = window.devicePixelRatio || 1;
    canvas.width  = W * dpr; canvas.height = H * dpr;
    canvas.style.width  = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var rows = data.length, cols = data[0].length;
    var padL = 44, padT = 8, padR = 6, padB = 36;
    var cw = (W - padL - padR) / cols;
    var ch = (H - padT - padB) / rows;

    /* X ticks */
    ctx.font = '9px JetBrains Mono'; ctx.fillStyle = '#9aa0b0'; ctx.textAlign = 'center';
    VERIFY.forEach(function (v, i) {
      ctx.fillText(String(v), padL + i * cw + cw / 2, H - padB + 13);
    });
    ctx.fillStyle = '#60a5fa'; ctx.font = '600 9px DM Sans';
    ctx.fillText('\u2190 Tokens to Verify \u2192', padL + cols * cw / 2, H - 2);

    /* Y ticks */
    ctx.font = '9px JetBrains Mono'; ctx.fillStyle = '#9aa0b0'; ctx.textAlign = 'right';
    DEPTHS.forEach(function (d, i) {
      ctx.fillText(String(d), padL - 6, padT + i * ch + ch / 2 + 3);
    });
    ctx.save();
    ctx.translate(8, padT + rows * ch / 2);
    ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center';
    ctx.fillStyle = '#60a5fa'; ctx.font = '600 9px DM Sans';
    ctx.fillText('Tree Depth \u2191', 0, 0);
    ctx.restore();

    /* Cells */
    var flat = data.flat();
    var mn = Math.min.apply(null, flat), mx = Math.max.apply(null, flat);
    data.forEach(function (row, ri) {
      row.forEach(function (val, ci) {
        var x = padL + ci * cw, y = padT + ri * ch;
        var t = (val - mn) / (mx - mn);
        ctx.fillStyle = colorFn(t);
        ctx.beginPath(); ctx.roundRect(x + 1, y + 1, cw - 2, ch - 2, 3); ctx.fill();
        if (ri === optR && ci === optC) {
          ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.roundRect(x + 2, y + 2, cw - 4, ch - 4, 2); ctx.stroke();
        }
        ctx.fillStyle = t > 0.5 ? '#fff' : '#bbb';
        ctx.font = '600 9px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText(fmtFn(val), x + cw / 2, y + ch / 2 + 3);
      });
    });
  }

  new ResizeObserver(function () {
    if (wrap.offsetWidth > 20 && wrap.offsetHeight > 20) render();
  }).observe(wrap);
  return render;
}

/* Accept Length: max 9.78 at row 5 (Depth=16), col 5 (Verify=128) */
var renderAL = makeHeatmap('chartHeatAL', 'heatAL-wrap', ACCEPT_LEN,
  function (t) { return 'rgba(59,130,246,' + (0.12 + t * 0.88) + ')'; },
  function (v) { return v.toFixed(2); }, 5, 5);

/* Speedup: max 3.66 at row 4 (Depth=12), col 3 (Verify=64) */
var renderSU = makeHeatmap('chartHeatSU', 'heatSU-wrap', SPEEDUP,
  function (t) { return 'rgba(34,197,94,' + (0.12 + t * 0.88) + ')'; },
  function (v) { return v.toFixed(2) + '\xd7'; }, 4, 3);

registerDeferred('sd-explorer', function () {
  renderAL(); renderSU();

  /* TopK Sensitivity — Tbl 1 — table with inline bar visualization */
  var topkRows = [
    { k: 4,  al: 8.29, su: 3.51 },
    { k: 6,  al: 8.66, su: 3.65 },
    { k: 8,  al: 8.67, su: 3.64 },
    { k: 10, al: 8.67, su: 3.64 },
    { k: 12, al: 8.60, su: 3.56 },
    { k: 16, al: 8.42, su: 3.47 }
  ];
  var alMin = 8.29, alRng = 0.38, suMin = 3.47, suRng = 0.18;

  document.getElementById('topk-table').innerHTML =
    '<table class="data" style="width:100%;table-layout:fixed"><thead><tr>' +
    '<th style="width:52px">Top-K</th><th>Accept Length</th><th>Speedup</th>' +
    '</tr></thead><tbody>' +
    topkRows.map(function (r) {
      var alPct = Math.max(4, Math.round((r.al - alMin) / alRng * 100));
      var suPct = Math.max(4, Math.round((r.su - suMin) / suRng * 100));
      var opt   = r.k === 8 || r.k === 10;
      return '<tr' + (opt ? ' class="opt-row"' : '') + '>' +
        '<td class="num">K=' + r.k + '</td>' +
        '<td><div class="bar-cell"><div class="bar-track"><div class="bar-fill c-acc" style="width:' + alPct + '%"></div></div>' +
        '<span class="bar-val' + (opt ? ' hi' : '') + '">' + r.al.toFixed(2) + '</span></div></td>' +
        '<td><div class="bar-cell"><div class="bar-track"><div class="bar-fill c-grn" style="width:' + suPct + '%"></div></div>' +
        '<span class="bar-val' + (opt ? ' hi' : '') + '">' + r.su.toFixed(2) + '\xd7</span></div></td>' +
        '</tr>';
    }).join('') + '</tbody></table>';

  /* Batch Size x Verify-Tokens Speedup — line chart */
  new Chart(document.getElementById('chartBatchSD'), {
    type: 'line',
    data: {
      labels: ['BS=1', 'BS=2', 'BS=4', 'BS=8', 'BS=16', 'BS=32'],
      datasets: [
        { label: 'TV=16', data: [3.22, 3.08, 3.01, 2.73, 2.67, 2.48], borderColor: C.accent,  backgroundColor: 'transparent', tension: .3, borderWidth: 1.5, pointRadius: 2.5, pointBackgroundColor: C.accent  },
        { label: 'TV=32', data: [3.46, 3.28, 3.09, 2.63, 2.52, 2.23], borderColor: C.green,   backgroundColor: 'transparent', tension: .3, borderWidth: 1.5, pointRadius: 2.5, pointBackgroundColor: C.green   },
        { label: 'TV=48', data: [3.56, 3.39, 3.13, 2.51, 2.24, 1.90], borderColor: C.orange,  backgroundColor: 'transparent', tension: .3, borderWidth: 1.5, pointRadius: 2.5, pointBackgroundColor: C.orange  },
        { label: 'TV=64', data: [3.62, 3.38, 2.98, 2.27, 1.91, 1.70], borderColor: C.purple,  backgroundColor: 'transparent', tension: .3, borderWidth: 1.5, pointRadius: 2.5, pointBackgroundColor: C.purple  }
      ]
    },
    options: {
      plugins: { legend: { position: 'top', labels: { font: { size: 9 }, color: '#9aa0b0', padding: 8, boxWidth: 12 } } },
      scales: {
        y: { title: { display: true, text: 'Speedup', font: { size: 9 }, color: '#5d6372' }, grid: { color: C.grid }, ticks: { callback: function (v) { return v + '\xd7'; }, font: { size: 9 } }, min: 1.5 },
        x: { grid: { display: false }, ticks: { font: { size: 9 } } }
      }
    }
  });
});
