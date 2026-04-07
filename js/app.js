/*
   app.js — Core: polyfills, tabs, deferred
   rendering, Chart.js defaults, shared palette,
   keyboard shortcuts, share, animated counters
    */

/* roundRect polyfill */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    this.moveTo(x + r[0], y);
    this.lineTo(x + w - r[1], y);
    this.quadraticCurveTo(x + w, y, x + w, y + r[1]);
    this.lineTo(x + w, y + h - r[2]);
    this.quadraticCurveTo(x + w, y + h, x + w - r[2], y + h);
    this.lineTo(x + r[3], y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r[3]);
    this.lineTo(x, y + r[0]);
    this.quadraticCurveTo(x, y, x + r[0], y);
    this.closePath();
    return this;
  };
}

/* Shared palette */
var C = {
  accent: '#3b82f6', accent2: '#60a5fa',
  green: '#22c55e', green2: '#4ade80',
  orange: '#f59e0b', orange2: '#fbbf24',
  red: '#ef4444', red2: '#f87171',
  purple: '#a855f7', purple2: '#c084fc',
  cyan: '#06b6d4', cyan2: '#22d3ee',
  text3: '#5d6372',
  grid: '#1e2330'
};

/* Deferred rendering */
var _deferred = {};
var _tabReady = {};

function registerDeferred(tabId, fn) {
  if (!_deferred[tabId]) _deferred[tabId] = [];
  _deferred[tabId].push(fn);
}

function activateTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
  document.querySelectorAll('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
  var btn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
  if (btn) btn.classList.add('active');
  var panel = document.getElementById('panel-' + tabId);
  if (panel) panel.classList.add('active');
  if (history.replaceState) history.replaceState(null, '', '#' + tabId);
  setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 80);
  if (!_tabReady[tabId] && _deferred[tabId]) {
    _tabReady[tabId] = true;
    requestAnimationFrame(function () {
      _deferred[tabId].forEach(function (fn) { fn(); });
    });
  }
}

document.querySelectorAll('.tab-btn').forEach(function (btn) {
  btn.addEventListener('click', function () { activateTab(btn.dataset.tab); });
});

/* Keyboard shortcuts: 1-6 for tabs */
var tabOrder = ['overview', 'training-sim', 'sd-explorer', 'benchmarks', 'case-study', 'methodology', 'model-math'];
document.addEventListener('keydown', function (e) {
  /* Don't intercept when user is typing in an input */
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
  var num = parseInt(e.key);
  if (num >= 1 && num <= tabOrder.length) {
    e.preventDefault();
    activateTab(tabOrder[num - 1]);
  }
  /* Left/Right arrow keys */
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
    var current = document.querySelector('.tab-btn.active');
    if (!current) return;
    var idx = tabOrder.indexOf(current.dataset.tab);
    if (idx < 0) return;
    if (e.key === 'ArrowLeft') idx = (idx - 1 + tabOrder.length) % tabOrder.length;
    else idx = (idx + 1) % tabOrder.length;
    activateTab(tabOrder[idx]);
  }
});

/* Toast notification */
function showToast(msg, duration) {
  var toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.classList.remove('show'); }, duration || 2500);
}

/* Share button */
var shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
  shareBtn.addEventListener('click', function () {
    var url = window.location.href;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () {
        showToast('Link copied to clipboard');
      });
    } else {
      /* Fallback */
      var ta = document.createElement('textarea');
      ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Link copied to clipboard');
    }
  });
}

/* Copy citation button */
var copyCiteBtn = document.getElementById('copyCite');
if (copyCiteBtn) {
  copyCiteBtn.addEventListener('click', function () {
    var cite = document.getElementById('citeBlock');
    if (!cite) return;
    var text = cite.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('BibTeX copied to clipboard');
      });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('BibTeX copied to clipboard');
    }
  });
}

/* Animated KPI counters */
function animateCounters() {
  var kpis = document.querySelectorAll('#panel-overview .kpi-val');
  kpis.forEach(function (el) {
    var text = el.textContent.trim();
    var match = text.match(/^([\d.]+)(.*)/);
    if (!match) return;
    var target = parseFloat(match[1]);
    var suffix = match[2]; /* e.g. '×', '%' */
    var start = 0;
    var duration = 1200;
    var startTime = null;

    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      /* Ease out cubic */
      var ease = 1 - Math.pow(1 - progress, 3);
      var current = start + (target - start) * ease;
      /* Format based on target precision */
      if (target >= 10) {
        el.innerHTML = Math.round(current) + suffix;
      } else {
        el.innerHTML = current.toFixed(2) + suffix;
      }
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  });
}

/* Run counters on load */
requestAnimationFrame(function () {
  setTimeout(animateCounters, 300);
});

/* Chart.js defaults */
Chart.defaults.color = '#9aa0b0';
Chart.defaults.borderColor = '#252a36';
Chart.defaults.font.family = "'JetBrains Mono', monospace";
Chart.defaults.font.size = 10;
Chart.defaults.plugins.legend.labels.boxWidth = 8;
Chart.defaults.plugins.legend.labels.padding = 6;
Chart.defaults.plugins.legend.labels.font = { size: 9 };
Chart.defaults.animation.duration = 700;
Chart.defaults.responsive = true;
Chart.defaults.maintainAspectRatio = false;
Chart.defaults.layout = { padding: { top: 4, right: 4, bottom: 2, left: 2 } };
