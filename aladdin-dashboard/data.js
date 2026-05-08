// Mock data for the Aladdin Health Dashboard prototype.
// Modelled on the dual-firewall-master P0 incident referenced in the
// design doc. All identifiers and values are illustrative.

window.ALADDIN = (function () {
  const STATUS = { OK: 'ok', WARN: 'warn', CRIT: 'crit', DOWN: 'down' };

  // ---------------------------------------------------------------------------
  // Active incident — drives the war-room view and the global status banner.
  // ---------------------------------------------------------------------------
  const incident = {
    id: 'INC-2026-0508-014',
    severity: 'P0',
    title: 'Dual firewall master conflict — NYC perimeter',
    status: 'mitigating', // open | mitigating | monitoring | resolved
    declaredAt: '2026-05-08T08:14:00-04:00',
    durationMins: 36,
    affectedClients: 47,
    rootComponent: 'fw-nyc-pri',
    impact: 'Trading order routing degraded for NYC-region clients. Risk and reporting unaffected.',
    commander: 'Priya Natarajan',
    bridge: 'aladdin-p0-bridge',
  };

  // ---------------------------------------------------------------------------
  // Components — the things that have health.
  // ---------------------------------------------------------------------------
  const components = [
    // --- Core network / firewalls ---
    { id: 'fw-nyc-pri',     name: 'FW-NYC-PRIMARY',    layer: 'firewall', region: 'NYC',  status: STATUS.CRIT, role: 'master-conflict', criticality: 5 },
    { id: 'fw-nyc-sec',     name: 'FW-NYC-SECONDARY',  layer: 'firewall', region: 'NYC',  status: STATUS.CRIT, role: 'master-conflict', criticality: 5 },
    { id: 'fw-lon-pri',     name: 'FW-LON-PRIMARY',    layer: 'firewall', region: 'LON',  status: STATUS.OK,   role: 'master',          criticality: 5 },
    { id: 'fw-lon-sec',     name: 'FW-LON-SECONDARY',  layer: 'firewall', region: 'LON',  status: STATUS.OK,   role: 'standby',         criticality: 4 },
    { id: 'fw-tok-pri',     name: 'FW-TOK-PRIMARY',    layer: 'firewall', region: 'TOK',  status: STATUS.OK,   role: 'master',          criticality: 5 },
    { id: 'core-net',       name: 'Core Network',      layer: 'network',  region: 'GLOBAL', status: STATUS.OK, criticality: 5 },

    // --- Data centers ---
    { id: 'dc-nyc',  name: 'DC NYC-1',     layer: 'datacenter', region: 'NYC',  status: STATUS.WARN, criticality: 5 },
    { id: 'dc-lon',  name: 'DC LON-1',     layer: 'datacenter', region: 'LON',  status: STATUS.OK,   criticality: 5 },
    { id: 'dc-tok',  name: 'DC TOK-1',     layer: 'datacenter', region: 'TOK',  status: STATUS.OK,   criticality: 4 },
    { id: 'dc-fra',  name: 'DC FRA-1',     layer: 'datacenter', region: 'FRA',  status: STATUS.OK,   criticality: 4 },
    { id: 'dc-syd',  name: 'DC SYD-1',     layer: 'datacenter', region: 'SYD',  status: STATUS.OK,   criticality: 3 },

    // --- App services ---
    { id: 'svc-trading',    name: 'Trading Engine',     layer: 'service', domain: 'Trading',   status: STATUS.CRIT, criticality: 5 },
    { id: 'svc-orders',     name: 'Order Routing',      layer: 'service', domain: 'Trading',   status: STATUS.CRIT, criticality: 5 },
    { id: 'svc-risk',       name: 'Risk Analytics',     layer: 'service', domain: 'Risk',      status: STATUS.OK,   criticality: 5 },
    { id: 'svc-portfolio',  name: 'Portfolio Mgmt',     layer: 'service', domain: 'Portfolio', status: STATUS.OK,   criticality: 4 },
    { id: 'svc-reporting',  name: 'Client Reporting',   layer: 'service', domain: 'Reporting', status: STATUS.WARN, criticality: 3 },
    { id: 'svc-analytics',  name: 'Market Analytics',   layer: 'service', domain: 'Analytics', status: STATUS.OK,   criticality: 4 },
    { id: 'svc-pipelines',  name: 'Data Pipelines',     layer: 'service', domain: 'Data',      status: STATUS.OK,   criticality: 4 },
    { id: 'svc-auth',       name: 'Identity / SSO',     layer: 'service', domain: 'Platform',  status: STATUS.OK,   criticality: 5 },

    // --- Client groups (representing ~200 individual clients) ---
    { id: 'cli-tier1-na',   name: 'Tier-1 N.America',   layer: 'client', region: 'NYC', count: 14, status: STATUS.CRIT, criticality: 5 },
    { id: 'cli-tier1-emea', name: 'Tier-1 EMEA',        layer: 'client', region: 'LON', count: 11, status: STATUS.OK,   criticality: 5 },
    { id: 'cli-tier1-apac', name: 'Tier-1 APAC',        layer: 'client', region: 'TOK', count:  8, status: STATUS.OK,   criticality: 5 },
    { id: 'cli-tier2-na',   name: 'Tier-2 N.America',   layer: 'client', region: 'NYC', count: 33, status: STATUS.WARN, criticality: 3 },
    { id: 'cli-tier2-emea', name: 'Tier-2 EMEA',        layer: 'client', region: 'LON', count: 41, status: STATUS.OK,   criticality: 3 },
    { id: 'cli-tier2-apac', name: 'Tier-2 APAC',        layer: 'client', region: 'TOK', count: 28, status: STATUS.OK,   criticality: 3 },
    { id: 'cli-wealth',     name: 'Wealth Mgmt',        layer: 'client', region: 'GLOBAL', count: 47, status: STATUS.OK, criticality: 2 },
    { id: 'cli-insurers',   name: 'Insurers',           layer: 'client', region: 'GLOBAL', count: 22, status: STATUS.OK, criticality: 4 },
  ];

  // ---------------------------------------------------------------------------
  // Edges (dependency graph). Direction: from -> to means "from depends on to".
  // ---------------------------------------------------------------------------
  const edges = [
    // Firewalls protect data centers
    ['dc-nyc', 'fw-nyc-pri'], ['dc-nyc', 'fw-nyc-sec'],
    ['dc-lon', 'fw-lon-pri'], ['dc-lon', 'fw-lon-sec'],
    ['dc-tok', 'fw-tok-pri'],
    ['dc-fra', 'fw-lon-pri'],
    ['dc-syd', 'fw-tok-pri'],

    // Network underpins everything
    ['fw-nyc-pri', 'core-net'], ['fw-nyc-sec', 'core-net'],
    ['fw-lon-pri', 'core-net'], ['fw-lon-sec', 'core-net'],
    ['fw-tok-pri', 'core-net'],

    // Services hosted in data centers (services depend on DCs)
    ['svc-trading',   'dc-nyc'], ['svc-trading',   'dc-lon'], ['svc-trading',   'dc-tok'],
    ['svc-orders',    'dc-nyc'], ['svc-orders',    'dc-lon'], ['svc-orders',    'dc-tok'],
    ['svc-risk',      'dc-nyc'], ['svc-risk',      'dc-lon'],
    ['svc-portfolio', 'dc-nyc'], ['svc-portfolio', 'dc-lon'],
    ['svc-reporting', 'dc-nyc'], ['svc-reporting', 'dc-fra'],
    ['svc-analytics', 'dc-lon'], ['svc-analytics', 'dc-tok'],
    ['svc-pipelines', 'dc-fra'], ['svc-pipelines', 'dc-syd'],
    ['svc-auth',      'dc-nyc'], ['svc-auth',      'dc-lon'], ['svc-auth',      'dc-tok'],

    // Clients consume services (clients depend on services)
    ['cli-tier1-na',   'svc-trading'], ['cli-tier1-na',   'svc-orders'], ['cli-tier1-na',   'svc-risk'], ['cli-tier1-na',   'svc-portfolio'],
    ['cli-tier1-emea', 'svc-trading'], ['cli-tier1-emea', 'svc-orders'], ['cli-tier1-emea', 'svc-risk'], ['cli-tier1-emea', 'svc-portfolio'],
    ['cli-tier1-apac', 'svc-trading'], ['cli-tier1-apac', 'svc-orders'], ['cli-tier1-apac', 'svc-risk'],
    ['cli-tier2-na',   'svc-trading'], ['cli-tier2-na',   'svc-reporting'],
    ['cli-tier2-emea', 'svc-trading'], ['cli-tier2-emea', 'svc-reporting'],
    ['cli-tier2-apac', 'svc-trading'], ['cli-tier2-apac', 'svc-reporting'],
    ['cli-wealth',     'svc-portfolio'], ['cli-wealth', 'svc-reporting'],
    ['cli-insurers',   'svc-risk'], ['cli-insurers', 'svc-reporting'],
  ];

  // ---------------------------------------------------------------------------
  // Tree structure (trunk → branches → leaves).
  // ---------------------------------------------------------------------------
  const tree = {
    name: 'Aladdin Platform',
    status: STATUS.CRIT,
    children: [
      {
        name: 'Core Infrastructure (Trunk)',
        status: STATUS.CRIT,
        children: [
          { name: 'Core Network', status: STATUS.OK },
          {
            name: 'NYC Perimeter',
            status: STATUS.CRIT,
            children: [
              { name: 'FW-NYC-PRIMARY (master-conflict)', status: STATUS.CRIT },
              { name: 'FW-NYC-SECONDARY (master-conflict)', status: STATUS.CRIT },
              { name: 'DC NYC-1', status: STATUS.WARN },
            ],
          },
          {
            name: 'LON Perimeter',
            status: STATUS.OK,
            children: [
              { name: 'FW-LON-PRIMARY', status: STATUS.OK },
              { name: 'FW-LON-SECONDARY', status: STATUS.OK },
              { name: 'DC LON-1', status: STATUS.OK },
            ],
          },
          {
            name: 'APAC Perimeter',
            status: STATUS.OK,
            children: [
              { name: 'FW-TOK-PRIMARY', status: STATUS.OK },
              { name: 'DC TOK-1', status: STATUS.OK },
              { name: 'DC SYD-1', status: STATUS.OK },
            ],
          },
        ],
      },
      {
        name: 'Trading',
        status: STATUS.CRIT,
        children: [
          { name: 'Trading Engine', status: STATUS.CRIT },
          { name: 'Order Routing', status: STATUS.CRIT },
          { name: 'FIX Gateways', status: STATUS.WARN },
        ],
      },
      {
        name: 'Risk & Analytics',
        status: STATUS.OK,
        children: [
          { name: 'Risk Analytics', status: STATUS.OK },
          { name: 'Market Analytics', status: STATUS.OK },
          { name: 'Stress Testing', status: STATUS.OK },
        ],
      },
      {
        name: 'Portfolio',
        status: STATUS.OK,
        children: [
          { name: 'Portfolio Mgmt', status: STATUS.OK },
          { name: 'Rebalancing', status: STATUS.OK },
        ],
      },
      {
        name: 'Reporting & Data',
        status: STATUS.WARN,
        children: [
          { name: 'Client Reporting', status: STATUS.WARN },
          { name: 'Data Pipelines', status: STATUS.OK },
          { name: 'Data Lake', status: STATUS.OK },
        ],
      },
    ],
  };

  // ---------------------------------------------------------------------------
  // Heatmap data for the hub view (services × client tiers).
  // ---------------------------------------------------------------------------
  const heatmap = {
    rows: ['Trading', 'Order Routing', 'Risk', 'Portfolio', 'Reporting', 'Analytics'],
    cols: ['T1 NA', 'T1 EMEA', 'T1 APAC', 'T2 NA', 'T2 EMEA', 'T2 APAC', 'Wealth', 'Insurers'],
    cells: [
      // Trading row
      [STATUS.CRIT, STATUS.OK, STATUS.OK, STATUS.WARN, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK],
      // Order Routing row
      [STATUS.CRIT, STATUS.OK, STATUS.OK, STATUS.WARN, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK],
      // Risk
      [STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK],
      // Portfolio
      [STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK],
      // Reporting
      [STATUS.WARN, STATUS.OK, STATUS.OK, STATUS.WARN, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK],
      // Analytics
      [STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK, STATUS.OK],
    ],
  };

  // ---------------------------------------------------------------------------
  // Geo data for the mini world map.
  // x,y are percentages on a 1000x500 canvas (rough world equirectangular).
  // ---------------------------------------------------------------------------
  const geo = [
    { id: 'dc-nyc', label: 'NYC',  x: 28, y: 38, status: STATUS.WARN },
    { id: 'dc-lon', label: 'LON',  x: 48, y: 32, status: STATUS.OK },
    { id: 'dc-fra', label: 'FRA',  x: 51, y: 34, status: STATUS.OK },
    { id: 'dc-tok', label: 'TOK',  x: 84, y: 40, status: STATUS.OK },
    { id: 'dc-syd', label: 'SYD',  x: 87, y: 74, status: STATUS.OK },
  ];

  // ---------------------------------------------------------------------------
  // Timeline — health strips per component over a 24-hour window.
  // Each component has a list of {fromMin, toMin, status} segments.
  // 0 min = 24h ago. 1440 min = now.
  // ---------------------------------------------------------------------------
  const T = 1440; // minutes in 24h
  const incidentStartMin = 1404; // 36 minutes ago
  const detectMin        = 1416; // 24 mins ago — incident declared
  const mitigateMin      = 1428; // 12 mins ago — secondary demoted
  const stripGroups = [
    {
      group: 'Core Infra',
      strips: [
        { id: 'fw-nyc-pri', label: 'FW-NYC-PRIMARY', segments: [
          { from: 0,    to: incidentStartMin, status: STATUS.OK },
          { from: incidentStartMin, to: T, status: STATUS.CRIT },
        ]},
        { id: 'fw-nyc-sec', label: 'FW-NYC-SECONDARY', segments: [
          { from: 0,    to: incidentStartMin, status: STATUS.OK },
          { from: incidentStartMin, to: mitigateMin, status: STATUS.CRIT },
          { from: mitigateMin, to: T, status: STATUS.WARN },
        ]},
        { id: 'fw-lon-pri', label: 'FW-LON-PRIMARY', segments: [{ from: 0, to: T, status: STATUS.OK }]},
        { id: 'core-net',   label: 'Core Network',   segments: [
          { from: 0, to: 720, status: STATUS.OK },
          { from: 720, to: 740, status: STATUS.WARN }, // unrelated blip
          { from: 740, to: T,   status: STATUS.OK },
        ]},
      ],
    },
    {
      group: 'Data Centers',
      strips: [
        { id: 'dc-nyc', label: 'DC NYC-1', segments: [
          { from: 0, to: incidentStartMin, status: STATUS.OK },
          { from: incidentStartMin, to: T, status: STATUS.WARN },
        ]},
        { id: 'dc-lon', label: 'DC LON-1', segments: [{ from: 0, to: T, status: STATUS.OK }]},
        { id: 'dc-tok', label: 'DC TOK-1', segments: [{ from: 0, to: T, status: STATUS.OK }]},
        { id: 'dc-fra', label: 'DC FRA-1', segments: [{ from: 0, to: T, status: STATUS.OK }]},
      ],
    },
    {
      group: 'Services',
      strips: [
        { id: 'svc-trading', label: 'Trading Engine', segments: [
          { from: 0, to: incidentStartMin + 4, status: STATUS.OK },
          { from: incidentStartMin + 4, to: T, status: STATUS.CRIT },
        ]},
        { id: 'svc-orders', label: 'Order Routing', segments: [
          { from: 0, to: incidentStartMin + 4, status: STATUS.OK },
          { from: incidentStartMin + 4, to: T, status: STATUS.CRIT },
        ]},
        { id: 'svc-risk', label: 'Risk Analytics', segments: [{ from: 0, to: T, status: STATUS.OK }]},
        { id: 'svc-reporting', label: 'Client Reporting', segments: [
          { from: 0, to: incidentStartMin + 8, status: STATUS.OK },
          { from: incidentStartMin + 8, to: T, status: STATUS.WARN },
        ]},
        { id: 'svc-portfolio', label: 'Portfolio Mgmt', segments: [{ from: 0, to: T, status: STATUS.OK }]},
      ],
    },
  ];

  // Incident markers on the timeline (vertical lines).
  const timelineMarkers = [
    { atMin: incidentStartMin, label: '08:14 — FW-NYC-PRI health check fails',                     kind: 'detect' },
    { atMin: incidentStartMin + 2, label: '08:16 — FW-NYC-SEC promotes to master (DUAL master)',   kind: 'event' },
    { atMin: incidentStartMin + 4, label: '08:18 — Trading latency spike, NYC region',             kind: 'event' },
    { atMin: detectMin,            label: '08:26 — P0 declared, command center mobilises',         kind: 'declare' },
    { atMin: mitigateMin,          label: '08:38 — Network identifies dual master, demotes SEC',   kind: 'mitigate' },
  ];

  // ---------------------------------------------------------------------------
  // War-room runbook for the active incident.
  // ---------------------------------------------------------------------------
  const runbook = [
    { step: 'Confirm dual-master state on NYC perimeter (show cluster status)',  done: true },
    { step: 'Notify trading desks of order-routing degradation',                  done: true },
    { step: 'Open vendor support ticket (Palo Alto, severity 1)',                done: true },
    { step: 'Demote FW-NYC-SECONDARY to standby',                                 done: true },
    { step: 'Verify FW-NYC-PRIMARY holds master role for 5 minutes',              done: false, current: true },
    { step: 'Drain NYC traffic to LON for tier-1 trading clients while monitoring', done: false },
    { step: 'Confirm latency back within SLO across all NYC tier-1 clients',      done: false },
    { step: 'Schedule post-incident review (within 48h)',                          done: false },
  ];

  const commsLog = [
    { at: '08:14 ET', who: 'Auto-page',         msg: 'FW-NYC-PRIMARY health check failing — paged on-call network engineer.' },
    { at: '08:18 ET', who: 'Trading Ops',       msg: 'NYC tier-1 desks reporting order ack latency 850ms (SLO 80ms).' },
    { at: '08:21 ET', who: 'Network on-call',   msg: 'Confirmed cluster split-brain. SEC promoted itself while PRI is still up.' },
    { at: '08:26 ET', who: 'Incident commander', msg: 'P0 declared. Bridge open. Aphus joining.' },
    { at: '08:38 ET', who: 'Network on-call',   msg: 'SEC demoted. PRI holding master. Watching for recurrence.' },
    { at: '08:43 ET', who: 'Trading Ops',       msg: 'NYC ack latency back to 62ms p95. Clients confirming order flow normal.' },
  ];

  // ---------------------------------------------------------------------------
  // Top-line KPIs for the hub banner.
  // ---------------------------------------------------------------------------
  const kpis = {
    overall: STATUS.CRIT,
    healthyClients: 153,
    degradedClients: 33,
    impactedClients: 14,
    activeIncidents: 1,
    p0Count: 1,
    services: { ok: 6, warn: 1, crit: 2 },
    infra:    { ok: 9, warn: 1, crit: 2 },
  };

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    STATUS,
    incident,
    components,
    edges,
    tree,
    heatmap,
    geo,
    timeline: { stripGroups, markers: timelineMarkers, totalMins: T },
    runbook,
    commsLog,
    kpis,
    byId(id) { return components.find(c => c.id === id); },
  };
})();
