/*
   benchmarks.js — Tables & benchmark charts
*/

registerDeferred('benchmarks', function () {

  /* GPU Diversity (Qwen-7B, BS=1) — Tbl 2 — inline speedup bars */
  var gpuData = [
    ['B200',     605.05, 259.71, 2.33],
    ['H100',     430.24, 164.65, 2.61],
    ['A100',     259.01,  92.83, 2.79],
    ['RTX 5090', 293.84, 100.89, 2.91],
    ['RTX 4090', 187.44,  65.28, 2.87],
    ['RTX 3090', 166.41,  51.75, 3.22]
  ];
  var suMin = 2.33, suRng = 0.89;
  document.getElementById('tblGPU').innerHTML =
    '<thead><tr><th>GPU</th><th class="num">w/ SD</th><th class="num">w/o SD</th><th>Speedup</th></tr></thead><tbody>' +
    gpuData.map(function (r) {
      var pct = Math.round((r[3] - suMin) / suRng * 100);
      var hi  = r[3] >= 3.0;
      return '<tr><td>' + r[0] + '</td><td class="num">' + r[1] + '</td><td class="num">' + r[2] + '</td>' +
        '<td><div class="bar-cell"><div class="bar-track" style="max-width:90px"><div class="bar-fill ' + (hi ? 'c-grn' : 'c-acc') + '" style="width:' + Math.max(6, pct) + '%"></div></div>' +
        '<span class="bar-val' + (hi ? ' hi' : '') + '">' + r[3].toFixed(2) + '\xd7</span></div></td></tr>';
    }).join('') + '</tbody>';

  /* Cluster Scale — Tbl 3 */
  document.getElementById('tblScale').innerHTML =
    '<thead><tr><th>Model</th><th class="num">1 Node</th><th class="num">2 Nodes</th><th class="num">4 Nodes</th><th class="num">8 Nodes</th></tr></thead><tbody>' +
    [['Qwen-7B',  '1.21\xd7', '1.45\xd7', '1.62\xd7', '1.76\xd7'],
     ['Qwen-32B', 'OOM',      'OOM',       '1.83\xd7', '2.12\xd7']]
    .map(function (r) {
      return '<tr><td>' + r[0] + '</td>' + r.slice(1).map(function (v) {
        var num = parseFloat(v);
        var hi  = !isNaN(num) && num >= 1.7;
        var oom = v === 'OOM';
        return '<td class="num" style="' + (oom ? 'color:var(--text3)' : '') + '">' + (hi ? '<b class="hi">' : '') + v + (hi ? '</b>' : '') + '</td>';
      }).join('') + '</tr>';
    }).join('') + '</tbody>';

  /* SD Method Comparison — Tbl 7 — inline AL and throughput bars */
  var methods = [
    { name: 'No-SD',   al: 1.00, thpt: 242, su: 1.00, cost: '\u2014' },
    { name: 'HASS',    al: 6.67, thpt: 554, su: 2.29, cost: '3\xd7'  },
    { name: 'Eagle',   al: 6.53, thpt: 542, su: 2.24, cost: '1\xd7'  },
    { name: 'Eagle-3', al: 6.83, thpt: 617, su: 2.55, cost: '7\xd7'  }
  ];
  var mxAL = 6.83, mxThpt = 617;
  document.getElementById('tblMethods').innerHTML =
    '<thead><tr><th>Method</th><th>Acc. Len</th><th>Thpt (tok/s)</th><th class="num">Speedup</th><th class="num">Cost</th></tr></thead><tbody>' +
    methods.map(function (m) {
      var alPct   = Math.max(4, Math.round(m.al / mxAL * 100));
      var thptPct = Math.max(4, Math.round(m.thpt / mxThpt * 100));
      var best  = m.name === 'Eagle-3';
      var cheap = m.name === 'Eagle';
      return '<tr' + (best ? ' class="opt-row"' : '') + '>' +
        '<td>' + m.name + (cheap ? ' <span style="font-size:8px;color:var(--green2)">[best $/perf]</span>' : '') + '</td>' +
        '<td><div class="bar-cell"><div class="bar-track"><div class="bar-fill c-acc" style="width:' + alPct + '%"></div></div>' +
        '<span class="bar-val' + (best ? ' hi' : '') + '">' + m.al.toFixed(2) + '</span></div></td>' +
        '<td><div class="bar-cell"><div class="bar-track"><div class="bar-fill c-pur" style="width:' + thptPct + '%"></div></div>' +
        '<span class="bar-val' + (best ? ' hi' : '') + '">' + m.thpt + '</span></div></td>' +
        '<td class="num' + (best ? ' hi' : '') + '">' + m.su.toFixed(2) + '\xd7</td>' +
        '<td class="num">' + m.cost + '</td>' +
        '</tr>';
    }).join('') + '</tbody>';

  /* Drafter Effectiveness — Tbl 6 */
  document.getElementById('tblDrafter').innerHTML =
    '<thead><tr><th>Phase</th><th class="num">Base AL</th><th class="num">Post-RL AL</th><th class="num">Gain</th></tr></thead><tbody>' +
    '<tr><td>RL Training</td><td class="num">4.59</td><td class="num hi">6.53</td><td class="num hi">+42%</td></tr>' +
    '<tr><td>Deployment</td><td class="num">3.76</td><td class="num hi">5.15</td><td class="num hi">+37%</td></tr>' +
    '</tbody>';

  /* CUDAGraph Memory — Tbl 5 */
  new Chart(document.getElementById('chartCGMem'), {
    type: 'bar',
    data: {
      labels: ['Single Strategy', 'Vanilla Multiple', 'Bucketed (Ours)'],
      datasets: [{ label: 'GB', data: [7.81, 30.39, 10.69], backgroundColor: ['rgba(93,99,114,0.55)', 'rgba(93,99,114,0.4)', C.accent], borderRadius: 3 }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: function (c) { return c.raw + ' GB'; } } } },
      scales: {
        x: { title: { display: true, text: 'Memory (GB)', font: { size: 9 }, color: '#5d6372' }, grid: { color: C.grid }, ticks: { font: { size: 9 } } },
        y: { grid: { display: false }, ticks: { font: { size: 9 } } }
      }
    }
  });

  /* Spot Trainer Optimizations — Fig 17 */
  new Chart(document.getElementById('chartOptim'), {
    type: 'bar',
    data: {
      labels: ['Vanilla Ckpt', 'Async Ckpt', 'Selective Async', 'Vanilla Batch', 'Seq Packing'],
      datasets: [{
        label: 'ms / samp\u00b7s\u207b\u00b9',
        data: [893, 280, 97, 13.3, 29.6],
        backgroundColor: ['rgba(93,99,114,0.5)', 'rgba(93,99,114,0.5)', C.accent, 'rgba(93,99,114,0.5)', C.accent],
        borderRadius: 3
      }]
    },
    options: {
      indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: C.grid }, ticks: { font: { size: 9 } } },
        y: { grid: { display: false }, ticks: { font: { size: 9 } } }
      }
    }
  });
});
