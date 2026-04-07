/*
   modelmath.js — Model Math tab: KaTeX rendering,
   interactive widgets (Tail Explorer, SD Speedup
   Calculator, Threshold Optimizer)
*/

registerDeferred('model-math', function () {

  /* ── KaTeX auto-render ── */
  var panel = document.getElementById('panel-model-math');
  var katexOpts = {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false }
    ],
    throwOnError: false
  };

  function renderKaTeX(el) {
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(el || panel, katexOpts);
    }
  }

  /* KaTeX scripts are defer'd — may not be ready if page loaded with #model-math */
  if (typeof renderMathInElement === 'function') {
    renderKaTeX(panel);
  } else {
    var katexWait = setInterval(function () {
      if (typeof renderMathInElement === 'function') {
        clearInterval(katexWait);
        renderKaTeX(panel);
      }
    }, 50);
  }

  /* Re-render KaTeX inside collapsible derivations on first open */
  panel.querySelectorAll('.mm-derivation').forEach(function (det) {
    var rendered = false;
    det.addEventListener('toggle', function () {
      if (det.open && !rendered) {
        rendered = true;
        renderKaTeX(det);
      }
    });
  });

  /* ── Shared helpers ── */
  function destroyChart(ref) { if (ref.chart) { ref.chart.destroy(); ref.chart = null; } }

  /* ────────────────────────────────────────────
     WIDGET 1: Tail Explorer (Section 1)
     ──────────────────────────────────────────── */
  var tailRef = { chart: null };
  var tailAlphaEl = document.getElementById('mm-tail-alpha');
  var tailAlphaVal = document.getElementById('mm-tail-alpha-val');
  var tailReadout = document.getElementById('mm-tail-readout');

  function updateTailExplorer() {
    var alpha = parseFloat(tailAlphaEl.value);
    tailAlphaVal.textContent = alpha.toFixed(1);

    var xMin = 1000, B = 128, nBins = 30, maxX = 32000;
    var binW = maxX / nBins;

    /* Generate Pareto samples via inverse CDF */
    var bins = new Array(nBins).fill(0);
    var seed = 42;
    function rand() { seed = (seed * 16807 + 0) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < B; i++) {
      var u = rand();
      var x = xMin * Math.pow(1 - u, -1 / alpha);
      var bi = Math.min(Math.floor(x / binW), nBins - 1);
      bins[bi]++;
    }
    /* Normalize to density */
    for (var j = 0; j < nBins; j++) bins[j] = bins[j] / (B * binW) * 1000;

    var labels = [];
    for (var k = 0; k < nBins; k++) labels.push(Math.round(k * binW + binW / 2));

    /* Analytical values */
    var eMean = xMin * Math.pow(B, 1 / alpha) * alpha / (alpha - 1);
    var median = xMin * Math.pow(2, 1 / alpha);
    var ratio = eMean / median;

    /* Find bin indices for annotation lines */
    var eMaxBin = Math.min(Math.floor(eMean / binW), nBins - 1);
    var medianBin = Math.min(Math.floor(median / binW), nBins - 1);

    tailReadout.innerHTML =
      '<b>E[max]</b> = ' + Math.round(eMean).toLocaleString() + ' tokens &nbsp; ' +
      '<b>Median</b> = ' + Math.round(median).toLocaleString() + ' tokens &nbsp; ' +
      '<b>Ratio</b> = ' + ratio.toFixed(1) + '\u00d7';

    destroyChart(tailRef);
    tailRef.chart = new Chart(document.getElementById('chartTailExplorer'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: bins,
          backgroundColor: 'rgba(59,130,246,0.55)',
          borderRadius: 2,
          barPercentage: 1.0,
          categoryPercentage: 1.0
        }]
      },
      options: {
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: function (ctx) { return ctx[0].label + ' tokens'; },
              label: function (ctx) { return 'density: ' + ctx.raw.toFixed(3); }
            }
          }
        },
        scales: {
          y: { title: { display: true, text: 'Density', font: { size: 9 } }, grid: { color: C.grid }, ticks: { font: { size: 8 } } },
          x: { title: { display: true, text: 'Response Length (tokens)', font: { size: 9 } }, grid: { display: false }, ticks: { font: { size: 7 }, maxRotation: 45, callback: function (v, i) { return i % 5 === 0 ? this.getLabelForValue(v) : ''; } } }
        }
      },
      plugins: [{
        id: 'tailAnnotations',
        afterDraw: function (chart) {
          var ctx = chart.ctx;
          var xScale = chart.scales.x;
          var yScale = chart.scales.y;

          /* E[max] line */
          var xEMax = xScale.getPixelForValue(eMaxBin);
          ctx.save();
          ctx.strokeStyle = C.red;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(xEMax, yScale.top);
          ctx.lineTo(xEMax, yScale.bottom);
          ctx.stroke();
          ctx.fillStyle = C.red;
          ctx.font = '600 9px JetBrains Mono';
          ctx.textAlign = 'center';
          ctx.fillText('E[max]', xEMax, yScale.top - 4);
          ctx.restore();

          /* Median line */
          var xMed = xScale.getPixelForValue(medianBin);
          ctx.save();
          ctx.strokeStyle = C.green;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(xMed, yScale.top);
          ctx.lineTo(xMed, yScale.bottom);
          ctx.stroke();
          ctx.fillStyle = C.green;
          ctx.font = '600 9px JetBrains Mono';
          ctx.textAlign = 'center';
          ctx.fillText('Median', xMed, yScale.top - 4);
          ctx.restore();
        }
      }]
    });
  }

  tailAlphaEl.addEventListener('input', updateTailExplorer);
  updateTailExplorer();

  /* ────────────────────────────────────────────
     WIDGET 2: SD Speedup Calculator (Section 2)
     ──────────────────────────────────────────── */
  var sdRef = { chart: null };
  var sdAlphaEl = document.getElementById('mm-sd-alpha');
  var sdGammaEl = document.getElementById('mm-sd-gamma');
  var sdCEl = document.getElementById('mm-sd-c');
  var sdAlphaVal = document.getElementById('mm-sd-alpha-val');
  var sdGammaVal = document.getElementById('mm-sd-gamma-val');
  var sdCVal = document.getElementById('mm-sd-c-val');
  var sdReadout = document.getElementById('mm-sd-readout');

  function updateSDCalc() {
    var alpha = parseFloat(sdAlphaEl.value);
    var gammaC = parseInt(sdGammaEl.value);
    var costC = parseFloat(sdCEl.value);

    sdAlphaVal.textContent = alpha.toFixed(2);
    sdGammaVal.textContent = gammaC;
    sdCVal.textContent = costC.toFixed(1);

    var gammas = [];
    var enVals = [];
    var suVals = [];
    for (var g = 1; g <= 20; g++) {
      gammas.push(g);
      var en = (1 - Math.pow(alpha, g + 1)) / (1 - alpha);
      var su = en / (1 + g / costC);
      enVals.push(en);
      suVals.push(su);
    }

    var enCurrent = (1 - Math.pow(alpha, gammaC + 1)) / (1 - alpha);
    var suCurrent = enCurrent / (1 + gammaC / costC);

    sdReadout.innerHTML =
      '<b>E[n]</b> = ' + enCurrent.toFixed(2) + ' tokens &nbsp; ' +
      '<b>Speedup</b> = ' + suCurrent.toFixed(2) + '\u00d7';

    /* Point data for current gamma */
    var pointEN = new Array(20).fill(null);
    var pointSU = new Array(20).fill(null);
    pointEN[gammaC - 1] = enVals[gammaC - 1];
    pointSU[gammaC - 1] = suVals[gammaC - 1];

    destroyChart(sdRef);
    sdRef.chart = new Chart(document.getElementById('chartSDCalc'), {
      type: 'line',
      data: {
        labels: gammas,
        datasets: [
          {
            label: 'Speedup',
            data: suVals,
            borderColor: C.green,
            backgroundColor: 'rgba(34,197,94,0.08)',
            fill: true,
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 2
          },
          {
            label: 'E[n]',
            data: enVals,
            borderColor: C.purple,
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            borderDash: [4, 3]
          },
          {
            label: '',
            data: pointSU,
            borderColor: C.green,
            backgroundColor: C.green,
            pointRadius: 6,
            pointStyle: 'circle',
            showLine: false
          },
          {
            label: '',
            data: pointEN,
            borderColor: C.purple,
            backgroundColor: C.purple,
            pointRadius: 6,
            pointStyle: 'circle',
            showLine: false
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            labels: {
              filter: function (item) { return item.text !== ''; }
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                if (ctx.dataset.label === '') return null;
                return ctx.dataset.label + ': ' + ctx.raw.toFixed(2);
              }
            }
          }
        },
        scales: {
          y: { title: { display: true, text: 'Value', font: { size: 9 } }, grid: { color: C.grid }, ticks: { font: { size: 8 } } },
          x: { title: { display: true, text: 'Draft Depth \u03b3', font: { size: 9 } }, grid: { display: false }, ticks: { font: { size: 8 } } }
        }
      }
    });
  }

  sdAlphaEl.addEventListener('input', updateSDCalc);
  sdGammaEl.addEventListener('input', updateSDCalc);
  sdCEl.addEventListener('input', updateSDCalc);
  updateSDCalc();

  /* ────────────────────────────────────────────
     WIDGET 3: Threshold Optimizer (Section 3)
     ──────────────────────────────────────────── */
  var threshRef = { chart: null };
  var osdEl = document.getElementById('mm-osd');
  var b0El = document.getElementById('mm-b0');
  var osdVal = document.getElementById('mm-osd-val');
  var b0Val = document.getElementById('mm-b0-val');
  var threshReadout = document.getElementById('mm-thresh-readout');

  function updateThreshOpt() {
    var osd = parseFloat(osdEl.value);
    var b0 = parseFloat(b0El.value);
    osdVal.textContent = osd.toFixed(2);
    b0Val.textContent = b0.toFixed(2);

    var TAU = 16;
    var ks = [];
    var benefit = [];
    var cost = [];
    var kStar = null;
    var kStarIdx = -1;

    for (var k = 1; k <= 64; k++) {
      ks.push(k);
      var bk = b0 * Math.exp(-k / TAU);
      var ck = osd / k;
      benefit.push(bk);
      cost.push(ck);
      if (kStar === null && bk < ck) {
        kStar = k - 1;
        kStarIdx = k - 2;
      }
    }
    if (kStar === null) { kStar = 64; kStarIdx = 63; }
    if (kStar < 1) { kStar = 1; kStarIdx = 0; }

    /* Point data for k* */
    var pointBenefit = new Array(64).fill(null);
    var pointCost = new Array(64).fill(null);
    if (kStarIdx >= 0 && kStarIdx < 64) {
      pointBenefit[kStarIdx] = benefit[kStarIdx];
      pointCost[kStarIdx] = cost[kStarIdx];
    }

    threshReadout.innerHTML =
      '<b>k*</b> = ' + kStar +
      ' &nbsp; <b>b(k*)</b> = ' + (kStarIdx >= 0 ? benefit[kStarIdx].toFixed(3) : 'N/A') +
      ' &nbsp; <span style="color:' + C.text3 + '">SD collapses when k* < active requests (Tbl 4: BS \u2265 16)</span>';

    destroyChart(threshRef);
    threshRef.chart = new Chart(document.getElementById('chartThreshOpt'), {
      type: 'line',
      data: {
        labels: ks,
        datasets: [
          {
            label: 'Benefit b(k)',
            data: benefit,
            borderColor: C.orange,
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0
          },
          {
            label: 'Cost O_SD / k',
            data: cost,
            borderColor: C.cyan,
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            borderDash: [4, 3]
          },
          {
            label: '',
            data: pointBenefit,
            borderColor: C.accent,
            backgroundColor: C.accent,
            pointRadius: 7,
            pointStyle: 'circle',
            showLine: false
          }
        ]
      },
      options: {
        plugins: {
          legend: {
            labels: {
              filter: function (item) { return item.text !== ''; }
            }
          },
          tooltip: {
            callbacks: {
              label: function (ctx) {
                if (ctx.dataset.label === '') return 'k* = ' + ks[ctx.dataIndex];
                return ctx.dataset.label + ': ' + ctx.raw.toFixed(3);
              }
            }
          }
        },
        scales: {
          y: { title: { display: true, text: 'Value', font: { size: 9 } }, grid: { color: C.grid }, ticks: { font: { size: 8 } } },
          x: { title: { display: true, text: 'Active Requests k', font: { size: 9 } }, grid: { display: false }, ticks: { font: { size: 8 }, callback: function (v, i) { return i % 8 === 0 ? this.getLabelForValue(v) : ''; } } }
        }
      },
      plugins: [{
        id: 'threshZone',
        beforeDraw: function (chart) {
          var ctx = chart.ctx;
          var xScale = chart.scales.x;
          var yScale = chart.scales.y;
          /* Shade BS >= 16 zone */
          var x16 = xScale.getPixelForValue(15); /* index 15 = k=16 */
          var xEnd = xScale.right;
          ctx.save();
          ctx.fillStyle = 'rgba(239,68,68,0.06)';
          ctx.fillRect(x16, yScale.top, xEnd - x16, yScale.bottom - yScale.top);
          ctx.fillStyle = 'rgba(239,68,68,0.4)';
          ctx.font = '600 8px JetBrains Mono';
          ctx.textAlign = 'center';
          ctx.fillText('BS \u2265 16: SD collapses', (x16 + xEnd) / 2, yScale.top + 12);
          ctx.restore();
        }
      }]
    });
  }

  osdEl.addEventListener('input', updateThreshOpt);
  b0El.addEventListener('input', updateThreshOpt);
  updateThreshOpt();

});
