/* ═══════════════════════════════════════════════════
   PredictOps — Data Engine
   ═══════════════════════════════════════════════════ */

const CLIENTS = [
  { id: 0, name: 'Axiom Corp',   dcs: ['US-East-1','US-West-2'] },
  { id: 1, name: 'NexaCloud',    dcs: ['EU-Frankfurt','AP-Singapore'] },
  { id: 2, name: 'Veriton',      dcs: ['AP-Tokyo','US-Central'] },
  { id: 3, name: 'DataSphere',   dcs: ['US-East-1','EU-Frankfurt'] },
];

const ALL_DCS = ['US-East-1','US-West-2','EU-Frankfurt','AP-Singapore','AP-Tokyo','US-Central'];

const RISK_LEVELS = {
  critical: { min: 85, color: '#ef4444', class: 'critical' },
  high:     { min: 65, color: '#f97316', class: 'high' },
  medium:   { min: 35, color: '#f59e0b', class: 'medium' },
  low:      { min: 0,  color: '#10b981', class: 'low' },
};

function rnd(a, b)   { return Math.floor(Math.random() * (b - a + 1)) + a; }
function frnd(a, b)  { return parseFloat((Math.random() * (b - a) + a).toFixed(1)); }
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

function getRiskLevel(pct) {
  if (pct >= 85) return 'critical';
  if (pct >= 65) return 'high';
  if (pct >= 35) return 'medium';
  return 'low';
}

function getRiskColor(level) {
  return { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#10b981' }[level];
}

function generateServer(i) {
  const rand = Math.random();
  let riskPct;
  if      (rand < 0.08) riskPct = rnd(85, 99);
  else if (rand < 0.23) riskPct = rnd(65, 84);
  else if (rand < 0.58) riskPct = rnd(35, 64);
  else                  riskPct = rnd(5,  34);

  const riskLevel = getRiskLevel(riskPct);
  const clientObj = CLIENTS[rnd(0, 3)];

  const stressMultiplier = riskPct / 100;
  const mem     = clamp(Math.round(40 + stressMultiplier * 55 + rnd(-5, 5)), 25, 99);
  const diskIO  = clamp(Math.round(30 + stressMultiplier * 65 + rnd(-8, 8)), 15, 99);
  const netLat  = clamp(Math.round(10 + stressMultiplier * 280 + rnd(-10, 10)), 5, 350);
  const errRate = clamp(parseFloat((stressMultiplier * 9 + Math.random() * 0.5).toFixed(1)), 0, 10);
  const missing = rnd(0, 24);

  return {
    id: i,
    name: `SRV-${String(i + 1).padStart(4, '0')}`,
    clientId: clientObj.id,
    clientName: clientObj.name,
    dc: clientObj.dcs[rnd(0, clientObj.dcs.length - 1)],
    riskPct,
    riskLevel,
    mem, diskIO, netLat, errRate,
    uptime: frnd(95, 99.9),
    missing,
    lastMaintenance: rnd(3, 120),
    cpuCores: [8, 16, 32, 64][rnd(0, 3)],
    ramGB: [32, 64, 128, 256][rnd(0, 3)],
    history: generateHistory(riskPct),
  };
}

function generateHistory(basePct) {
  const pts = [];
  let v = Math.max(5, basePct - rnd(20, 40));
  for (let i = 0; i < 24; i++) {
    v = clamp(v + (i > 16 ? rnd(1, 4) : frnd(-3, 4)), 1, 100);
    pts.push(Math.round(v));
  }
  return pts;
}

const State = {
  servers:         [],
  filtered:        [],
  activeRiskFilter: 'all',
  activeClient:    'all',
  activeDC:        'all',
  selectedServerId: null,
  updateCount:     0,
};

function initServers() {
  State.servers = Array.from({ length: 120 }, (_, i) => generateServer(i));
  applyFilters();
}

function applyFilters() {
  const { activeRiskFilter, activeClient, activeDC } = State;
  State.filtered = State.servers.filter(s => {
    if (activeRiskFilter !== 'all' && s.riskLevel !== activeRiskFilter) return false;
    if (activeClient !== 'all' && s.clientId !== parseInt(activeClient)) return false;
    if (activeDC !== 'all' && s.dc !== activeDC) return false;
    return true;
  });
}

function tickServers() {
  State.updateCount++;
  State.servers.forEach(s => {
    const drift = frnd(-2.5, 3.2);
    s.riskPct   = clamp(Math.round(s.riskPct + drift), 1, 99);
    s.riskLevel = getRiskLevel(s.riskPct);

    s.mem     = clamp(s.mem     + rnd(-2, 3), 25, 99);
    s.diskIO  = clamp(s.diskIO  + rnd(-3, 4), 15, 99);
    s.netLat  = clamp(s.netLat  + rnd(-8, 10), 5, 350);
    s.errRate = clamp(parseFloat((s.errRate + frnd(-0.4, 0.5)).toFixed(1)), 0, 10);

    s.history.shift();
    s.history.push(s.riskPct);
  });
  applyFilters();
}

function getKPIs() {
  const s = State.servers;
  return {
    total:    s.length,
    critical: s.filter(x => x.riskLevel === 'critical').length,
    high:     s.filter(x => x.riskLevel === 'high').length,
    medium:   s.filter(x => x.riskLevel === 'medium').length,
    low:      s.filter(x => x.riskLevel === 'low').length,
    avgRisk:  Math.round(s.reduce((a, x) => a + x.riskPct, 0) / s.length),
  };
}

function getDCStats() {
  return ALL_DCS.map(dc => {
    const dcServers = State.servers.filter(s => s.dc === dc);
    if (!dcServers.length) return { dc, avg: 0, count: 0 };
    const avg = Math.round(dcServers.reduce((a, s) => a + s.riskPct, 0) / dcServers.length);
    return { dc, avg, count: dcServers.length };
  }).sort((a, b) => b.avg - a.avg);
}

function generateAlerts() {
  const crits = State.servers
    .filter(s => s.riskLevel === 'critical')
    .sort((a, b) => b.riskPct - a.riskPct)
    .slice(0, 5);
  const highs = State.servers
    .filter(s => s.riskLevel === 'high')
    .sort((a, b) => b.riskPct - a.riskPct)
    .slice(0, 4);

  const alerts = [
    ...crits.map((s, i) => ({
      level: 'critical',
      server: s.name,
      dc: s.dc,
      client: s.clientName,
      msg: `Failure probability ${s.riskPct}%. Memory ${s.mem}%, Disk I/O ${s.diskIO}%. Immediate action required.`,
      time: `${i * 3 + rnd(1, 5)}m ago`,
    })),
    ...highs.map((s, i) => ({
      level: 'high',
      server: s.name,
      dc: s.dc,
      client: s.clientName,
      msg: `Risk score elevated to ${s.riskPct}%. Error rate ${s.errRate}/min. Schedule maintenance within 24h.`,
      time: `${15 + i * 8 + rnd(1, 10)}m ago`,
    })),
    {
      level: 'info',
      server: 'ML Engine',
      dc: 'Global',
      client: 'System',
      msg: `Model retrained on NexaCloud fleet. F1 score improved to 0.931. Precision: 94.5%.`,
      time: '2h ago',
    },
    {
      level: 'info',
      server: 'AP-Singapore',
      dc: 'AP-Singapore',
      client: 'NexaCloud',
      msg: `4 servers entered scheduled maintenance window. Predictions suppressed.`,
      time: '3h ago',
    },
  ];
  return alerts;
}
