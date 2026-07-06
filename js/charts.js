/* ═══════════════════════════════════════════════════
   PredictOps — Charts Module
   ═══════════════════════════════════════════════════ */

const CHART_COLORS = {
  critical: '#ef4444',
  high:     '#f97316',
  medium:   '#f59e0b',
  low:      '#10b981',
  accent:   '#4f8ef7',
  purple:   '#8b5cf6',
  grid:     'rgba(255,255,255,0.05)',
  text:     '#4b5675',
};

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  animation: { duration: 600 },
};

if (typeof Chart !== 'undefined') {
  Chart.defaults.color = CHART_COLORS.text;
  Chart.defaults.borderColor = CHART_COLORS.grid;
  Chart.defaults.font.family = "'Inter', system-ui, sans-serif";
}

const Charts = {};

function destroyChart(key) {
  if (Charts[key]) { Charts[key].destroy(); delete Charts[key]; }
}

function renderRiskDistChart() {
  const kpis = getKPIs();
  const ctx = document.getElementById('riskDistChart');
  if (!ctx) return;
  destroyChart('riskDist');
  Charts.riskDist = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Critical', 'High', 'Medium', 'Low'],
      datasets: [{
        data: [kpis.critical, kpis.high, kpis.medium, kpis.low],
        backgroundColor: [
          CHART_COLORS.critical + 'cc',
          CHART_COLORS.high     + 'cc',
          CHART_COLORS.medium   + 'cc',
          CHART_COLORS.low      + 'cc',
        ],
        borderColor: [
          CHART_COLORS.critical,
          CHART_COLORS.high,
          CHART_COLORS.medium,
          CHART_COLORS.low,
        ],
        borderWidth: 1,
        borderRadius: 5,
        borderSkipped: false,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        y: { grid: { color: CHART_COLORS.grid }, ticks: { color: CHART_COLORS.text, font: { size: 10 } }, beginAtZero: true },
        x: { grid: { display: false }, ticks: { color: CHART_COLORS.text, font: { size: 10 } } },
      },
    },
  });
  const el = document.getElementById('riskTotal');
  if (el) el.textContent = `${State.servers.length} servers`;
}

function renderDowntimeChart() {
  const ctx = document.getElementById('downtimeChart');
  if (!ctx) return;
  destroyChart('downtime');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const baseline = [100,100,100,100,100,100,100,100,100,100,100,100];
  const predicted = [100,96,89,81,75,68,64,60,58,57,56,56];
  Charts.downtime = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        {
          label: 'Baseline',
          data: baseline,
          borderColor: 'rgba(255,255,255,0.15)',
          borderDash: [5, 4],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'With PredictOps',
          data: predicted,
          borderColor: CHART_COLORS.low,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: CHART_COLORS.low,
          fill: true,
          backgroundColor: 'rgba(16,185,129,0.07)',
          tension: 0.3,
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        y: {
          min: 50, max: 110,
          grid: { color: CHART_COLORS.grid },
          ticks: { color: CHART_COLORS.text, font: { size: 10 }, callback: v => v + '%' },
        },
        x: { grid: { display: false }, ticks: { color: CHART_COLORS.text, font: { size: 9 } } },
      },
    },
  });
}

function renderLatencyChart() {
  const ctx = document.getElementById('latencyChart');
  if (!ctx) return;
  destroyChart('latency');
  const labels = Array.from({length:20},(_,i)=> (i * 0.3 + 0.2).toFixed(1) + 's');
  const p50 = 6; const p95 = 12; const p99 = 16;
  const data = labels.map((_, i) => {
    const x = i - 5;
    return Math.max(0, Math.round(500 * Math.exp(-0.5 * (x/2.5)**2)));
  });
  Charts.latency = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: labels.map((_, i) =>
          i <= p50 ? CHART_COLORS.low + '99' :
          i <= p95 ? CHART_COLORS.medium + '99' :
          i <= p99 ? CHART_COLORS.high + '99' :
          CHART_COLORS.critical + '99'
        ),
        borderWidth: 0,
        borderRadius: 2,
        borderSkipped: false,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        y: { display: false, beginAtZero: true },
        x: {
          grid: { display: false },
          ticks: { color: CHART_COLORS.text, font: { size: 9 }, maxTicksLimit: 5 },
        },
      },
    },
  });
}

function renderAlertVolumeChart() {
  const ctx = document.getElementById('alertVolumeChart');
  if (!ctx) return;
  destroyChart('alertVol');
  const hours = Array.from({length:24},(_,i)=>`${i}:00`);
  const crits = [1,0,2,1,0,1,3,4,2,1,3,5,4,3,2,4,5,6,4,3,5,3,4,2];
  const highs = [3,2,4,2,1,2,5,7,4,3,6,8,6,5,4,7,9,10,7,5,8,6,7,4];
  Charts.alertVol = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: hours,
      datasets: [
        {
          label: 'Critical',
          data: crits,
          backgroundColor: CHART_COLORS.critical + '99',
          borderRadius: 2, borderSkipped: false,
        },
        {
          label: 'High',
          data: highs,
          backgroundColor: CHART_COLORS.high + '77',
          borderRadius: 2, borderSkipped: false,
        },
      ],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        y: { grid: { color: CHART_COLORS.grid }, ticks: { color: CHART_COLORS.text, font: { size: 9 } }, stacked: true },
        x: { grid: { display: false }, ticks: { color: CHART_COLORS.text, font: { size: 8 }, maxTicksLimit: 8 }, stacked: true },
      },
    },
  });
}

function renderClientAccChart() {
  const ctx = document.getElementById('clientAccChart');
  if (!ctx) return;
  destroyChart('clientAcc');
  Charts.clientAcc = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: CLIENTS.map(c => c.name),
      datasets: [{
        data: [94.2, 93.1, 88.7, 95.4],
        backgroundColor: CHART_COLORS.accent + '99',
        borderColor: CHART_COLORS.accent,
        borderWidth: 1,
        borderRadius: 5,
        borderSkipped: false,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      indexAxis: 'y',
      scales: {
        x: {
          min: 80, max: 100,
          grid: { color: CHART_COLORS.grid },
          ticks: { color: CHART_COLORS.text, font: { size: 10 }, callback: v => v + '%' },
        },
        y: { grid: { display: false }, ticks: { color: CHART_COLORS.text, font: { size: 11 } } },
      },
    },
  });
}

function renderFeatureChart() {
  const ctx = document.getElementById('featureChart');
  if (!ctx) return;
  destroyChart('feature');
  Charts.feature = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Error log rate','Memory usage','App crash freq','Disk I/O','Net latency','Maint history'],
      datasets: [{
        data: [91, 88, 82, 74, 66, 59],
        backgroundColor: [
          CHART_COLORS.critical + 'cc',
          CHART_COLORS.high     + 'cc',
          CHART_COLORS.purple   + 'cc',
          CHART_COLORS.medium   + 'cc',
          CHART_COLORS.accent   + 'cc',
          CHART_COLORS.low      + 'cc',
        ],
        borderWidth: 0,
        borderRadius: 4,
        borderSkipped: false,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      indexAxis: 'y',
      scales: {
        x: {
          min: 0, max: 100,
          grid: { color: CHART_COLORS.grid },
          ticks: { color: CHART_COLORS.text, font: { size: 10 }, callback: v => v + '%' },
        },
        y: { grid: { display: false }, ticks: { color: CHART_COLORS.text, font: { size: 11 } } },
      },
    },
  });
}

function renderAdaptChart() {
  const ctx = document.getElementById('adaptChart');
  if (!ctx) return;
  destroyChart('adapt');
  Charts.adapt = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['0h','8h','16h','24h','32h','40h','48h','56h','64h','72h'],
      datasets: [{
        label: 'Accuracy',
        data: [58, 67, 73, 79, 84, 87, 90, 91, 92, 93],
        borderColor: CHART_COLORS.accent,
        borderWidth: 2.5,
        pointRadius: 4,
        pointBackgroundColor: CHART_COLORS.accent,
        fill: true,
        backgroundColor: 'rgba(79,142,247,0.08)',
        tension: 0.35,
      }],
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        y: {
          min: 50, max: 100,
          grid: { color: CHART_COLORS.grid },
          ticks: { color: CHART_COLORS.text, font: { size: 10 }, callback: v => v + '%' },
        },
        x: { grid: { display: false }, ticks: { color: CHART_COLORS.text, font: { size: 10 } } },
      },
    },
  });
}

function animateRings() {
  const circumference = 2 * Math.PI * 52;
  document.querySelectorAll('.pr-fill').forEach(circle => {
    const pct = parseInt(circle.getAttribute('data-pct')) || 0;
    const offset = circumference - (pct / 100) * circumference;
    circle.style.strokeDasharray  = circumference;
    circle.style.strokeDashoffset = circumference;
    setTimeout(() => {
      circle.style.strokeDashoffset = offset;
    }, 200);
  });
}
