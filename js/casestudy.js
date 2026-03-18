/*
   casestudy.js — Cost calculator + charts
   Data sourced from paper Tables 2, 3 and production trace
    */

document.getElementById('cs-steps').addEventListener('input', function (e) {
  document.getElementById('cs-steps-val').textContent = e.target.value;
});

document.getElementById('cs-calc').addEventListener('click', function () { updateCaseStudy(); });

function updateCaseStudy() {
  var model = document.getElementById('cs-model').value;
  var gpu = document.getElementById('cs-gpu').value;
  var gpuN = parseInt(document.getElementById('cs-gpucount').value);
  var steps = parseInt(document.getElementById('cs-steps').value);
  var seqLen = parseInt(document.getElementById('cs-seqlen').value);

  /* Paper data: end-to-end speedups (Table 2, Fig 11) */
  var modelSU = { 'Qwen2.5-7B': 1.76, 'DeepSeek-R1-7B': 1.71, 'Qwen2.5-32B': 2.12, 'Llama-3.3-70B': 1.86 };
  var gpuSU = { 'B200': 2.33, 'H100': 2.61, 'A100': 2.79, 'RTX 5090': 2.91, 'RTX 4090': 2.87, 'RTX 3090': 3.22 };
  var gpuCost = { 'B200': 4.50, 'H100': 3.00, 'A100': 2.00, 'RTX 5090': 1.80, 'RTX 4090': 1.50, 'RTX 3090': 1.20 };

  var su = modelSU[model] || 1.86;
  var sdSU = gpuSU[gpu] || 2.61;
  var costHr = gpuCost[gpu] || 3.00;

  /* Estimate: ByteDance Qwen-32B on 128 GPUs ~ 40 min/step */
  var baseMin = (model.indexOf('70B') !== -1 ? 80 : model.indexOf('32B') !== -1 ? 40 : 15);
  var scale = 64 / gpuN;
  var stepBase = baseMin * scale * (seqLen / 20480);
  var stepTLT = stepBase / su;
  var hrsBase = steps * stepBase / 60;
  var hrsTLT = steps * stepTLT / 60;
  var gpuHBase = hrsBase * gpuN;
  var gpuHTLT = hrsTLT * gpuN;
  var costBase = gpuHBase * costHr;
  var costTLT = gpuHTLT * costHr;
  var pctSaved = Math.round((1 - 1 / su) * 100);

  function fmt$(v) { return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

  /* Visual bar for time comparison */
  var tltBarPct = Math.round((hrsTLT / hrsBase) * 100);

  document.getElementById('cs-results').innerHTML =
    '<div class="cs-grid">' +
      '<span class="cs-lbl">Model</span><span>' + model + '</span>' +
      '<span class="cs-lbl">GPU</span><span>' + gpuN + '\xd7 ' + gpu + '</span>' +
      '<span class="cs-lbl">Steps</span><span>' + steps + '</span>' +
      '<span class="cs-lbl">Seq Len</span><span>' + seqLen.toLocaleString() + '</span>' +
    '</div><hr>' +
    '<div class="cs-grid">' +
      '<span class="cs-lbl">E2E Speedup</span><span style="color:' + C.accent2 + ';font-weight:700">' + su + '\xd7</span>' +
      '<span class="cs-lbl">SD Speedup</span><span style="color:' + C.green2 + '">' + sdSU + '\xd7</span>' +
    '</div><hr>' +
    /* Visual comparison bars */
    '<div style="margin:4px 0 2px;font-size:9px;color:' + C.text3 + '">TIME COMPARISON</div>' +
    '<div style="display:flex;flex-direction:column;gap:3px">' +
      '<div style="display:flex;align-items:center;gap:4px"><span style="width:42px;font-size:8px;color:' + C.text3 + '">VERL</span>' +
        '<div style="flex:1;height:10px;background:' + C.orange + ';border-radius:2px;opacity:.7"></div>' +
        '<span style="font-size:8px;color:' + C.text2 + '">' + hrsBase.toFixed(0) + 'h</span></div>' +
      '<div style="display:flex;align-items:center;gap:4px"><span style="width:42px;font-size:8px;color:' + C.accent2 + ';font-weight:600">TLT</span>' +
        '<div style="flex:1;height:10px;position:relative"><div style="width:' + tltBarPct + '%;height:100%;background:' + C.accent + ';border-radius:2px"></div></div>' +
        '<span style="font-size:8px;color:' + C.accent2 + ';font-weight:600">' + hrsTLT.toFixed(0) + 'h</span></div>' +
    '</div><hr>' +
    '<div class="cs-section">Baseline (VeRL)</div>' +
    '<div class="cs-grid">' +
      '<span class="cs-lbl">Step Time</span><span>' + stepBase.toFixed(1) + ' min</span>' +
      '<span class="cs-lbl">Total</span><span>' + hrsBase.toFixed(1) + ' hrs (' + (hrsBase / 24).toFixed(1) + 'd)</span>' +
      '<span class="cs-lbl">GPU-Hrs</span><span>' + gpuHBase.toFixed(0) + '</span>' +
      '<span class="cs-lbl">Cost</span><span>' + fmt$(costBase) + '</span>' +
    '</div>' +
    '<div class="cs-section" style="color:' + C.accent2 + '">TLT (MIT)</div>' +
    '<div class="cs-grid">' +
      '<span class="cs-lbl">Step Time</span><span>' + stepTLT.toFixed(1) + ' min</span>' +
      '<span class="cs-lbl">Total</span><span>' + hrsTLT.toFixed(1) + ' hrs (' + (hrsTLT / 24).toFixed(1) + 'd)</span>' +
      '<span class="cs-lbl">GPU-Hrs</span><span>' + gpuHTLT.toFixed(0) + '</span>' +
      '<span class="cs-lbl">Cost</span><span>' + fmt$(costTLT) + '</span>' +
    '</div><hr>' +
    '<div class="cs-grid" style="font-weight:700">' +
      '<span style="color:' + C.green2 + '">Saved Time</span><span style="color:' + C.green2 + '">' + (hrsBase - hrsTLT).toFixed(1) + ' hrs (' + pctSaved + '%)</span>' +
      '<span style="color:' + C.green2 + '">Saved Cost</span><span style="color:' + C.green2 + '">' + fmt$(costBase - costTLT) + '</span>' +
      '<span style="color:' + C.green2 + '">Bonus</span><span style="color:' + C.cyan2 + '">Free Drafter</span>' +
    '</div>';
}

registerDeferred('case-study', function () {
  updateCaseStudy();

  /* Figure 14 — Running Request Profile */
  var labels = [], baseline = [], tlt = [];
  for (var t = 0; t <= 340; t += 5) {
    labels.push(t);
    baseline.push(Math.max(0, Math.round(100 * Math.exp(-t / 120))));
    var tv = t < 80 ? 100 * Math.exp(-t / 100) : Math.max(0, 100 * Math.exp(-80 / 100) * Math.exp(-(t - 80) / 40));
    tlt.push(Math.max(0, Math.round(tv)));
  }

  /* Annotation: shade the saved area */
  var savedAreaPlugin = {
    id: 'savedArea',
    beforeDatasetsDraw: function (chart) {
      var ctx = chart.ctx;
      var meta0 = chart.getDatasetMeta(0);
      var meta1 = chart.getDatasetMeta(1);
      if (!meta0.data || !meta1.data || meta0.data.length < 2) return;
      ctx.save();
      ctx.fillStyle = 'rgba(34,197,94,.06)';
      ctx.beginPath();
      /* Draw along TLT line forward */
      for (var i = 0; i < meta1.data.length; i++) {
        var pt = meta1.data[i];
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      /* Then back along baseline */
      for (var j = meta0.data.length - 1; j >= 0; j--) {
        ctx.lineTo(meta0.data[j].x, meta0.data[j].y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  };

  new Chart(document.getElementById('chartRunReq'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Baseline', data: baseline, borderColor: C.text3, borderWidth: 1.5, pointRadius: 0, tension: .3 },
        { label: 'TLT + Adaptive SD', data: tlt, borderColor: C.accent, borderWidth: 1.5, pointRadius: 0, tension: .3, fill: { target: 'origin', above: 'rgba(59,130,246,.06)' } }
      ]
    },
    options: {
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { title: { display: true, text: '# Running Reqs', font: { size: 9 } }, grid: { color: C.grid }, ticks: { font: { size: 9 } } },
        x: { title: { display: true, text: 'Rollout Time (s)', font: { size: 9 } }, grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 8 } } }
      }
    },
    plugins: [savedAreaPlugin]
  });

  /* Figure 2 — ByteDance Production Trace */
  var seed = 42;
  function pr() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed / 0x7fffffff) - 0.5; }
  var traceSteps = [], maxL = [], p75 = [], p50 = [];
  for (var s = 0; s <= 385; s += 5) {
    traceSteps.push(s);
    maxL.push(Math.min(20480, 18000 + pr() * 1000 + s * 3));
    p75.push(Math.min(14000, 10000 + s * 5 + pr() * 1000));
    p50.push(Math.min(10000, 6000 + s * 4 + pr() * 1000));
  }
  new Chart(document.getElementById('chartBD'), {
    type: 'line',
    data: {
      labels: traceSteps,
      datasets: [
        { label: 'Max', data: maxL, borderColor: C.red, borderWidth: 1.2, pointRadius: 0, tension: .3 },
        { label: 'p75', data: p75, borderColor: C.orange, borderWidth: 1.2, pointRadius: 0, tension: .3 },
        { label: 'p50', data: p50, borderColor: C.green, borderWidth: 1.2, pointRadius: 0, tension: .3 }
      ]
    },
    options: {
      plugins: { legend: { position: 'top' } },
      scales: {
        y: { title: { display: true, text: 'Resp Length', font: { size: 9 } }, grid: { color: C.grid }, max: 22000, ticks: { font: { size: 9 } } },
        x: { title: { display: true, text: 'RL Steps', font: { size: 9 } }, grid: { display: false }, ticks: { maxTicksLimit: 8, font: { size: 8 } } }
      }
    }
  });
});

/* Early calc so data is ready when tab opens */
updateCaseStudy();
