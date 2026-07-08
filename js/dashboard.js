function renderKPIStrip() {
  const k = getKPIs();
  const el = document.getElementById('kpiStrip');
  if (!el) return;
  el.innerHTML = `
    <div class="kpi-cell">
      <div class="kpi-cell-label">Total servers</div>
      <div class="kpi-cell-val kv-accent">${k.total}</div>
      <div class="kpi-cell-sub">across 10 clients</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-cell-label">Critical risk</div>
      <div class="kpi-cell-val kv-crit">${k.critical}</div>
      <div class="kpi-cell-sub">needs action now</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-cell-label">High risk</div>
      <div class="kpi-cell-val kv-warn">${k.high}</div>
      <div class="kpi-cell-sub">24h window</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-cell-label">Fleet avg risk</div>
      <div class="kpi-cell-val">${k.avgRisk}%</div>
      <div class="kpi-cell-sub">weighted score</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-cell-label">Downtime reduced</div>
      <div class="kpi-cell-val kv-good">44%</div>
      <div class="kpi-cell-sub">vs. baseline</div>
    </div>
    <div class="kpi-cell">
      <div class="kpi-cell-label">Prediction latency</div>
      <div class="kpi-cell-val">1.8s</div>
      <div class="kpi-cell-sub">P50, &lt;5s SLA</div>
    </div>
  `;
}
function renderTopServersTable() {
  const tbody = document.getElementById('topServersTbody');
  if (!tbody) return;
  const top = [...State.servers].sort((a, b) => b.riskPct - a.riskPct).slice(0, 10);
  tbody.innerHTML = top.map(s => `
    <tr>
      <td>${s.name}</td>
      <td>${s.clientName}</td>
      <td>${s.dc}</td>
      <td>
        <div class="risk-mini-bar">
          <span class="risk-badge rb-${s.riskLevel}">${s.riskPct}%</span>
        </div>
      </td>
      <td>${s.mem}%</td>
      <td>${s.diskIO}%</td>
      <td>${s.netLat}ms</td>
      <td><span class="risk-badge rb-${s.riskLevel}">${s.riskLevel}</span></td>
    </tr>
  `).join('');
}
function renderDCHeatmap() {
  const el = document.getElementById('dcHeatmap');
  if (!el) return;
  const stats = getDCStats();
  const maxAvg = Math.max(...stats.map(s => s.avg), 1);
  el.innerHTML = stats.map(s => {
    const width = `${(s.avg / maxAvg) * 100}%`;
    const color = `${getRiskColor(getRiskLevel(s.avg))}66`;
    return `
      <div class="dc-heatmap-row">
        <div class="dc-heatmap-label">${s.dc}</div>
        <div class="dc-heatmap-bar-track">
          <div class="dc-heatmap-bar-fill" style="width:${width}; background:${color};"></div>
        </div>
        <div class="dc-val">${s.avg}%</div>
      </div>
    `;
  }).join('');
}
function renderServerGrid() {
  const grid = document.getElementById('serverGrid');
  if (!grid) return;
  const search = (document.getElementById('serverSearch')?.value || '').trim().toUpperCase();
  const list = State.filtered.filter(s => s.name.includes(search));
  grid.innerHTML = list.map(s => `
    <div class="srv-card risk-${s.riskLevel} ${State.selectedServerId === s.id ? 'selected' : ''}" onclick="selectServer(${s.id})" role="button" tabindex="0" onkeydown="if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectServer(${s.id}); }">
      <div class="srv-name">${s.name}</div>
      <div class="srv-dc">${s.clientName} · ${s.dc}</div>
      <div class="srv-risk-row">
        <span class="srv-risk-pct" style="color:${getRiskColor(s.riskLevel)}">${s.riskPct}%</span>
        <div class="srv-risk-bar"><div class="srv-risk-fill" style="width:${s.riskPct}%; background:${getRiskColor(s.riskLevel)}"></div></div>
      </div>
    </div>
  `).join('') || '<div class="server-grid-empty">No servers match this filter.</div>';
}

function filterByRisk(level, btn) {
  State.activeRiskFilter = level;
  applyFilters();
  document.querySelectorAll('.risk-filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderServerGrid();
}

function selectServer(id) {
  State.selectedServerId = id;
  const s = State.servers.find(x => x.id === id);
  if (!s) return;
  renderServerGrid();

  const panel = document.getElementById('serverDetailPanel');
  panel.hidden = false;
  document.getElementById('sdpTitle').textContent = s.name;
  document.getElementById('sdpMeta').textContent =
    `${s.clientName} · ${s.dc} · ${s.cpuCores} cores / ${s.ramGB}GB RAM · Last maintenance ${s.lastMaintenance}d ago · ${s.missing}% missing telemetry`;

  document.getElementById('sdpMetrics').innerHTML = `
    ${metricCard('Failure risk', s.riskPct + '%', s.riskLevel === 'low' ? 'trend-ok' : s.riskLevel === 'medium' ? 'trend-warn' : 'trend-bad')}
    ${metricCard('Memory usage', s.mem + '%', s.mem > 80 ? 'trend-bad' : s.mem > 60 ? 'trend-warn' : 'trend-ok')}
    ${metricCard('Disk I/O', s.diskIO + '%', s.diskIO > 80 ? 'trend-bad' : s.diskIO > 60 ? 'trend-warn' : 'trend-ok')}
    ${metricCard('Net latency', s.netLat + 'ms', s.netLat > 200 ? 'trend-bad' : s.netLat > 100 ? 'trend-warn' : 'trend-ok')}
    ${metricCard('Error rate', s.errRate + '/min', s.errRate > 6 ? 'trend-bad' : s.errRate > 3 ? 'trend-warn' : 'trend-ok')}
    ${metricCard('Uptime', s.uptime + '%', s.uptime < 97 ? 'trend-warn' : 'trend-ok')}
  `;

  document.getElementById('sdpRec').innerHTML = buildRecommendation(s);
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function metricCard(label, val, trendClass) {
  return `
    <div class="sdp-metric">
      <div class="sdp-metric-label">${label}</div>
      <div class="sdp-metric-val">${val}</div>
      <div class="sdp-metric-trend ${trendClass}">●</div>
    </div>
  `;
}

function buildRecommendation(s) {
  if (s.riskLevel === 'critical') {
    return `<strong>Recommended action:</strong> Schedule immediate maintenance window. Memory and disk I/O are both elevated — likely a resource exhaustion pattern. Estimated time-to-failure based on trend: ${rnd(2, 8)} hours.`;
  }
  if (s.riskLevel === 'high') {
    return `<strong>Recommended action:</strong> Schedule maintenance within 24 hours. Monitor error rate closely — a sustained increase would upgrade this to critical.`;
  }
  if (s.riskLevel === 'medium') {
    return `<strong>Recommended action:</strong> No immediate action required. Add to next routine maintenance cycle.`;
  }
  return `<strong>Recommended action:</strong> Server is healthy. Continue standard monitoring cadence.`;
}

function closeDetail() {
  State.selectedServerId = null;
  document.getElementById('serverDetailPanel').hidden = true;
  renderServerGrid();
}
function renderAlerts() {
  const list = document.getElementById('alertsList');
  if (!list) return;
  const alerts = generateAlerts();
  const activeCount = alerts.filter(a => a.level !== 'info').length;
  document.getElementById('alertsCount').textContent = `${activeCount} active`;
  list.innerHTML = alerts.map(a => `
    <div class="alert-item">
      <div class="alert-indicator ai-${a.level}"></div>
      <div class="alert-body">
        <div class="alert-server">${a.server} <span style="color:var(--text-3);font-weight:400;">· ${a.client}</span></div>
        <div class="alert-msg">${a.msg}</div>
        <div class="alert-time">${a.time}</div>
      </div>
    </div>
  `).join('');
}
function switchDashView(view, btn) {
  document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  ['overview', 'servers', 'alerts'].forEach(v => {
    const panel = document.getElementById(`dv-${v}`);
    if (panel) panel.hidden = v !== view;
  });
  if (view === 'overview') {
    renderRiskDistChart();
    renderDowntimeChart();
    renderLatencyChart();
    renderTopServersTable();
    renderDCHeatmap();
  } else if (view === 'servers') {
    renderServerGrid();
  } else if (view === 'alerts') {
    renderAlerts();
    renderAlertVolumeChart();
    renderClientAccChart();
  }
}
function applyFiltersFromUI() {
  const clientFilter = document.getElementById('clientFilter');
  const dcFilter = document.getElementById('dcFilter');
  if (clientFilter) State.activeClient = clientFilter.value;
  if (dcFilter) State.activeDC = dcFilter.value;
  applyFilters();
  renderServerGrid();
}
function updateLastUpdatedLabel() {
  const el = document.getElementById('lastUpdated');
  if (el) el.textContent = 'Updated just now';
}

function refreshActiveView() {
  const activeTab = document.querySelector('.dash-tab.active');
  const view = activeTab ? activeTab.textContent.trim().toLowerCase() : 'overview';
  renderKPIStrip();
  if (view === 'overview') {
    renderRiskDistChart();
    renderTopServersTable();
    renderDCHeatmap();
  } else if (view === 'servers') {
    renderServerGrid();
  } else if (view === 'alerts') {
    renderAlerts();
  }
  updateLastUpdatedLabel();
}

function startLiveLoop() {
  setInterval(() => {
    tickServers();
    refreshActiveView();
  }, 8000);
}

function initDashboard() {
  initServers();
  renderKPIStrip();
  renderRiskDistChart();
  renderDowntimeChart();
  renderLatencyChart();
  renderTopServersTable();
  renderDCHeatmap();
  startLiveLoop();
}
