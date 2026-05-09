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
  // Customer triage cards — drives the war-room "Customer Triage" variation.
  // ---------------------------------------------------------------------------
  const clientImpact = [
    {
      id: 'gs-eqty-nyc', name: 'Goldman Equities NYC', tier: 'T1', aum: '$1.2B', region: 'NYC',
      status: STATUS.CRIT, contact: 'Steven Bao (RM)',
      whatTheySee: 'Order acks taking 850ms (8× normal). 23 orders queued. No data losses observed.',
      whatWereDoing: 'Network team rebalancing FW-NYC. ETA 8m. Failover to LON ready if recurrence.',
      orders: { queued: 23, ack_p95: 850, error_pct: 12.4 },
      acknowledged: true, ackBy: 'Sarah Kim', ackAt: '08:31',
    },
    {
      id: 'jpm-fi-nyc', name: 'JPM Fixed Income NYC', tier: 'T1', aum: '$890M', region: 'NYC',
      status: STATUS.CRIT, contact: 'Lisa Park (RM)',
      whatTheySee: 'Trade confirmations delayed 3-5 minutes. 41 pending. Risk feeds running normally.',
      whatWereDoing: 'Confirmations queue draining as latency recovers. Direct line opened with client.',
      orders: { queued: 41, ack_p95: 920, error_pct: 14.1 },
      acknowledged: true, ackBy: 'Sarah Kim', ackAt: '08:33',
    },
    {
      id: 'cit-quant-nyc', name: 'Citadel Quant NYC', tier: 'T1', aum: '$2.4B', region: 'NYC',
      status: STATUS.CRIT, contact: 'Marcus Webb (RM)',
      whatTheySee: 'Algo execution paused (client-side kill switch tripped on latency).',
      whatWereDoing: 'Awaiting client decision to resume. Failover to LON staged.',
      orders: { queued: 0, ack_p95: 1100, error_pct: 18.0 },
      acknowledged: false, contact_phone: 'On hold w/ client',
    },
    {
      id: 'ms-pwm-nyc', name: 'Morgan Stanley PWM', tier: 'T1', aum: '$1.8B', region: 'NYC',
      status: STATUS.CRIT, contact: 'Jenny Liu (RM)',
      whatTheySee: 'Some block trades stuck pending. Partial fills reported by 2 desks.',
      whatWereDoing: 'Order routing engineer engaged. Manual intervention on stuck blocks underway.',
      orders: { queued: 17, ack_p95: 940, error_pct: 11.2 },
      acknowledged: true, ackBy: 'Sarah Kim', ackAt: '08:36',
    },
    {
      id: 'fid-pen-nyc', name: 'Fidelity Pension Desk', tier: 'T2', aum: '$340M', region: 'NYC',
      status: STATUS.WARN, contact: 'Robert Lee (RM)',
      whatTheySee: 'Reporting feed delayed by ~3 minutes. No trading impact.',
      whatWereDoing: 'Reporting will catch up automatically once primary stabilises.',
      orders: { queued: 0, ack_p95: 95, error_pct: 0.4 },
      acknowledged: true, ackBy: 'Diane Foster', ackAt: '08:39',
    },
    {
      id: 'bk-trust-nyc', name: 'BNY Mellon Trust NYC', tier: 'T2', aum: '$210M', region: 'NYC',
      status: STATUS.WARN, contact: 'Janet Wu (RM)',
      whatTheySee: 'Client-portal latency elevated. Trading and risk feeds unaffected.',
      whatWereDoing: 'Reporting service degraded. Recovers automatically with primary.',
      orders: { queued: 0, ack_p95: 78, error_pct: 0.2 },
      acknowledged: false,
    },
  ];

  // ---------------------------------------------------------------------------
  // Diagnostic hypotheses — drives the "Diagnostic" variation. Bayesian-style.
  // ---------------------------------------------------------------------------
  const hypotheses = [
    {
      id: 'h1',
      text: 'Dual firewall master state on NYC perimeter cluster',
      probability: 0.94,
      evidence: [
        'FW-NYC-PRIMARY raising master-conflict alarm (08:14)',
        'FW-NYC-SECONDARY reports as master in cluster status',
        'Trading latency p95 = 850ms (was 62ms 30 min ago)',
        'Pattern matches INC-2024-0312 (resolved by SEC demotion)',
      ],
      counter: 'FW-NYC-PRIMARY shows master role for 5 consecutive minutes — would refute split-brain.',
      actions: ['Demote FW-NYC-SECONDARY', 'Verify PRI holds master', 'Drain to LON if recurrence'],
    },
    {
      id: 'h2',
      text: 'Network partition between core switch and FW pair',
      probability: 0.03,
      evidence: ['Other downstream of core switch unaffected', 'Core switch CPU/memory nominal'],
      counter: 'Core network monitoring shows no partition.',
      actions: ['Run probe core → NYC FWs', 'Check switch logs last 60 min'],
    },
    {
      id: 'h3',
      text: 'Bad config push to firewalls (recent change)',
      probability: 0.02,
      evidence: ['No FW config changes in last 14 days (per audit log)'],
      counter: 'Audit log shows no recent changes.',
      actions: ['Review last 30d FW config changes', 'Cross-check with deploy log'],
    },
    {
      id: 'h4',
      text: 'Trading engine deploy regression',
      probability: 0.01,
      evidence: ['No trading deploys in last 6 hours'],
      counter: 'Last deploy was 9h ago, no health regressions then.',
      actions: ['Check service version', 'Roll back if config-driven'],
    },
  ];

  const observations = [
    { text: 'p95 latency 850ms (NYC trading)',  severity: STATUS.CRIT },
    { text: 'FW-NYC master-conflict alarm',     severity: STATUS.CRIT },
    { text: '23 orders queued · GS Equities',   severity: STATUS.CRIT },
    { text: '14 T1 NYC clients impacted',       severity: STATUS.CRIT },
    { text: 'FW-NYC throughput dropped 80%',    severity: STATUS.WARN },
    { text: 'Reporting feed delayed 3min',      severity: STATUS.WARN },
    { text: 'LON, TOK, FRA all healthy',        severity: STATUS.OK },
    { text: 'Core network nominal',             severity: STATUS.OK },
    { text: 'No FW config changes in 14d',      severity: STATUS.OK },
  ];

  // ---------------------------------------------------------------------------
  // Distributed trace — drives the "Trace Waterfall" variation.
  // ---------------------------------------------------------------------------
  const trace = {
    trace_id: '4f8a3c1e2d9b7a5f',
    client: 'Goldman Equities NYC · order #GS-NYC-04471',
    total_dur_ms: 962,
    baseline_dur_ms: 78,
    spans: [
      { name: 'Client SDK → FIX Gateway',         start: 0,   dur: 4,   status: STATUS.OK,   note: 'Within SLO' },
      { name: 'FIX Gateway · auth + parse',       start: 4,   dur: 8,   status: STATUS.OK,   note: 'Within SLO' },
      { name: 'FIX Gateway → FW-NYC-PRIMARY',     start: 12,  dur: 6,   status: STATUS.OK,   note: 'Within SLO' },
      { name: 'FW-NYC-PRIMARY · policy eval',     start: 18,  dur: 142, status: STATUS.WARN, note: 'Normally 4ms — connection-table contention from dual master' },
      { name: 'FW-NYC-PRIMARY → Trading Engine',  start: 160, dur: 780, status: STATUS.CRIT, note: 'Normally 12ms — 3 connection resets, finally accepted on retry #4' },
      { name: 'Trading Engine · matching',        start: 940, dur: 18,  status: STATUS.OK,   note: 'Within SLO once reached' },
      { name: 'Trading Engine → confirmation',    start: 958, dur: 4,   status: STATUS.OK,   note: 'Within SLO' },
    ],
  };

  // ---------------------------------------------------------------------------
  // Decision log — drives the "Commander" variation.
  // ---------------------------------------------------------------------------
  const decisions = [
    { at: '08:21 ET', by: 'Marcus Chen · Network',     text: 'Confirmed cluster split-brain. SEC promoted while PRI is still up.', impact: 'Diagnosis identified' },
    { at: '08:24 ET', by: 'Aaron Davis · Vendor',      text: 'Palo Alto support concurs with split-brain assessment.',              impact: 'External corroboration' },
    { at: '08:26 ET', by: 'Priya Natarajan · IC',      text: 'Declared P0 incident. Opened bridge.',                                impact: 'Mobilisation' },
    { at: '08:28 ET', by: 'Priya Natarajan · IC',      text: 'Assigned Sarah Kim trading liaison, Diane Foster on comms.',           impact: 'Roles allocated' },
    { at: '08:32 ET', by: 'Priya Natarajan · IC',      text: 'Approved demotion of FW-NYC-SECONDARY (vendor concurred).',            impact: 'Mitigation authorised' },
    { at: '08:38 ET', by: 'Marcus Chen · Network',     text: 'SEC demoted. PRI holding master role.',                               impact: 'Mitigation in progress' },
    { at: '08:43 ET', by: 'Sarah Kim · Trading',       text: 'NYC ack latency back to 62ms p95.',                                   impact: 'Recovery confirmed' },
  ];

  const roles = [
    { role: 'Incident Commander', person: 'Priya Natarajan', avatar: 'PN', status: 'active'     },
    { role: 'Network Lead',       person: 'Marcus Chen',     avatar: 'MC', status: 'active'     },
    { role: 'Trading Liaison',    person: 'Sarah Kim',       avatar: 'SK', status: 'active'     },
    { role: 'Comms Lead',         person: 'Diane Foster',    avatar: 'DF', status: 'active'     },
    { role: 'Vendor Liaison',     person: 'Aaron Davis',     avatar: 'AD', status: 'active'     },
    { role: 'Scribe / Recorder',  person: 'Jenny Liu',       avatar: 'JL', status: 'active'     },
    { role: 'Customer Success',   person: 'Robert Lee',      avatar: 'RL', status: 'standby'    },
    { role: 'Exec Liaison',       person: 'Aphus Kotak',     avatar: 'AK', status: 'monitoring' },
  ];

  const etas = {
    nextRequiredAction: 'Verify FW-NYC-PRIMARY holds master role for 5 consecutive minutes (3:42 remaining)',
    mitigation: { value: '8m',  confidence: 'medium', label: 'ETA to mitigation' },
    resolution: { value: '22m', confidence: 'low',    label: 'ETA to full resolution' },
    nextComms:  { value: '4m',  confidence: 'high',   label: 'Next leadership update' },
  };

  // ---------------------------------------------------------------------------
  // Cost data — drives the "Cost Burn" variation.
  // ---------------------------------------------------------------------------
  const cost = {
    realized: 284419,
    burnRatePerMin: 4800,
    rankAllTime: '4th most costly incident · trailing 12 months',
    pastIncidents: [
      { name: 'INC-2025-1112 · Core DB outage',   cost: 1240000, durMin: 142 },
      { name: 'INC-2025-0801 · LON DC cooling',   cost:  612000, durMin:  88 },
      { name: 'INC-2025-0403 · Auth provider',    cost:  380000, durMin:  54 },
      { name: 'INC-2026-0508 · FW NYC dual master (current)', cost: 284419, durMin: 36, current: true },
      { name: 'INC-2025-0220 · Rate-limit cascade', cost: 220000, durMin: 41 },
    ],
    byClient: [
      { name: 'T1 NA',      value: 178000, share: 0.625 },
      { name: 'T2 NA',      value:  64000, share: 0.225 },
      { name: 'Wealth',     value:  28000, share: 0.099 },
      { name: 'Insurers',   value:  14000, share: 0.049 },
    ],
    byService: [
      { name: 'Trading Engine', value: 142000, share: 0.50 },
      { name: 'Order Routing',  value:  88000, share: 0.31 },
      { name: 'Reporting',      value:  32000, share: 0.11 },
      { name: 'Other',          value:  22000, share: 0.08 },
    ],
    mitigations: [
      { step: 'Open vendor ticket',                 deltaPerMin:    0, note: 'No direct cost reduction yet' },
      { step: 'Demote FW-NYC-SECONDARY',            deltaPerMin: -3100, note: 'Stops connection-table contention' },
      { step: 'Drain T1 NYC traffic to LON',         deltaPerMin: -1200, note: 'Reduces queue depth for top accounts' },
      { step: 'Manual intervention on stuck blocks', deltaPerMin:  -400, note: 'Recovers MS-PWM 17 stuck blocks' },
    ],
  };

  // ---------------------------------------------------------------------------
  // Replay timeline — drives the "Replay / Forensics" variation.
  // ---------------------------------------------------------------------------
  const replayEvents = [
    { atMin: 1404, time: '08:14', label: 'FW-NYC-PRIMARY health check fails',           kind: 'detect',   state: { 'fw-nyc-pri': STATUS.CRIT, 'fw-nyc-sec': STATUS.OK,   'svc-trading': STATUS.OK,  'svc-orders': STATUS.OK   } },
    { atMin: 1406, time: '08:16', label: 'FW-NYC-SECONDARY promotes to master (DUAL)',  kind: 'event',    state: { 'fw-nyc-pri': STATUS.CRIT, 'fw-nyc-sec': STATUS.CRIT, 'svc-trading': STATUS.OK,  'svc-orders': STATUS.OK   } },
    { atMin: 1408, time: '08:18', label: 'Trading latency spike, NYC region',           kind: 'event',    state: { 'fw-nyc-pri': STATUS.CRIT, 'fw-nyc-sec': STATUS.CRIT, 'svc-trading': STATUS.CRIT,'svc-orders': STATUS.CRIT } },
    { atMin: 1411, time: '08:21', label: 'Network confirms split-brain',                kind: 'event',    state: { 'fw-nyc-pri': STATUS.CRIT, 'fw-nyc-sec': STATUS.CRIT, 'svc-trading': STATUS.CRIT,'svc-orders': STATUS.CRIT } },
    { atMin: 1416, time: '08:26', label: 'P0 declared, command center mobilises',        kind: 'declare',  state: { 'fw-nyc-pri': STATUS.CRIT, 'fw-nyc-sec': STATUS.CRIT, 'svc-trading': STATUS.CRIT,'svc-orders': STATUS.CRIT } },
    { atMin: 1422, time: '08:32', label: 'IC approves SEC demotion',                     kind: 'event',    state: { 'fw-nyc-pri': STATUS.CRIT, 'fw-nyc-sec': STATUS.CRIT, 'svc-trading': STATUS.CRIT,'svc-orders': STATUS.CRIT } },
    { atMin: 1428, time: '08:38', label: 'FW-NYC-SEC demoted, PRI holds master',         kind: 'mitigate', state: { 'fw-nyc-pri': STATUS.WARN, 'fw-nyc-sec': STATUS.WARN, 'svc-trading': STATUS.WARN,'svc-orders': STATUS.WARN } },
    { atMin: 1432, time: '08:42', label: 'Trading recovery confirmed',                   kind: 'recover',  state: { 'fw-nyc-pri': STATUS.WARN, 'fw-nyc-sec': STATUS.WARN, 'svc-trading': STATUS.OK,  'svc-orders': STATUS.OK   } },
  ];

  // ===========================================================================
  // 20 ADDITIONAL WAR ROOM VARIATIONS — mock data
  // ===========================================================================

  // 1. SLO Burn Rate (Google SRE Workbook ch. 5)
  const sloServices = [
    { name: 'Trading order routing',  slo: '99.9% < 100ms ack',    burnRate: 14.2, budgetPct: 38, exhaustsIn: '3h 14m', tier: STATUS.CRIT },
    { name: 'Trading engine matching', slo: '99.95% available',     burnRate: 12.8, budgetPct: 42, exhaustsIn: '4h 02m', tier: STATUS.CRIT },
    { name: 'FIX gateways',             slo: '99.95% accept rate',   burnRate:  8.4, budgetPct: 52, exhaustsIn: '7h 45m', tier: STATUS.CRIT },
    { name: 'Client reporting',         slo: '99% < 30min lag',      burnRate:  2.1, budgetPct: 71, exhaustsIn: '6d 12h', tier: STATUS.WARN },
    { name: 'Risk analytics',           slo: '99.9% < 5min lag',     burnRate:  0.6, budgetPct: 87, exhaustsIn: '14d',     tier: STATUS.OK },
    { name: 'Market analytics',         slo: '99% < 1min lag',       burnRate:  0.4, budgetPct: 89, exhaustsIn: '21d',     tier: STATUS.OK },
    { name: 'Portfolio mgmt',           slo: '99.9% available',      burnRate:  0.2, budgetPct: 94, exhaustsIn: '47d',     tier: STATUS.OK },
    { name: 'Identity / SSO',           slo: '99.9% < 200ms',        burnRate:  0.1, budgetPct: 96, exhaustsIn: '90d+',    tier: STATUS.OK },
  ];

  // 2. Golden Signals (Google SRE)
  const goldenSignals = [
    { name: 'Trading Engine',   latency: { p50: 12, p95: 850, p99: 1200, slo: 100 }, traffic: { rps: 12400, baseline: 14200 }, errors: { pct: 12.4,  slo: 0.1 }, saturation: { pct: 78, slo: 80 }, status: STATUS.CRIT },
    { name: 'Order Routing',    latency: { p50:  8, p95: 920, p99: 1400, slo:  80 }, traffic: { rps:  9800, baseline: 11200 }, errors: { pct: 14.1,  slo: 0.1 }, saturation: { pct: 82, slo: 80 }, status: STATUS.CRIT },
    { name: 'FIX Gateway',      latency: { p50: 18, p95: 420, p99:  680, slo: 100 }, traffic: { rps: 14200, baseline: 14200 }, errors: { pct:  8.2,  slo: 0.1 }, saturation: { pct: 71, slo: 80 }, status: STATUS.CRIT },
    { name: 'Risk Analytics',   latency: { p50: 22, p95:  84, p99:  142, slo: 200 }, traffic: { rps:  3400, baseline:  3500 }, errors: { pct:  0.04, slo: 0.1 }, saturation: { pct: 41, slo: 80 }, status: STATUS.OK },
    { name: 'Client Reporting', latency: { p50: 18, p95: 240, p99:  380, slo: 200 }, traffic: { rps:  1820, baseline:  2100 }, errors: { pct:  0.6,  slo: 0.1 }, saturation: { pct: 58, slo: 80 }, status: STATUS.WARN },
    { name: 'Portfolio Mgmt',   latency: { p50: 14, p95:  62, p99:   98, slo: 150 }, traffic: { rps:   840, baseline:   900 }, errors: { pct:  0.02, slo: 0.1 }, saturation: { pct: 32, slo: 80 }, status: STATUS.OK },
  ];

  // 3. RED method (Wilkie/Grafana)
  const redMethod = [
    { service: 'Trading Engine',   rate: '12.4k rps', errors: '12.4%',  dur_p99: '1200ms', status: STATUS.CRIT },
    { service: 'Order Routing',    rate: '9.8k rps',  errors: '14.1%',  dur_p99: '1400ms', status: STATUS.CRIT },
    { service: 'FIX Gateway',      rate: '14.2k rps', errors: '8.2%',   dur_p99: '680ms',  status: STATUS.CRIT },
    { service: 'Risk Analytics',   rate: '3.4k rps',  errors: '0.04%',  dur_p99: '142ms',  status: STATUS.OK },
    { service: 'Client Reporting', rate: '1.8k rps',  errors: '0.6%',   dur_p99: '380ms',  status: STATUS.WARN },
    { service: 'Portfolio Mgmt',   rate: '840 rps',   errors: '0.02%',  dur_p99: '98ms',   status: STATUS.OK },
    { service: 'Market Analytics', rate: '2.1k rps',  errors: '0.1%',   dur_p99: '180ms',  status: STATUS.OK },
    { service: 'Identity / SSO',   rate: '5.2k rps',  errors: '0.01%',  dur_p99: '180ms',  status: STATUS.OK },
  ];

  // 3b. USE method (Brendan Gregg)
  const useMethod = [
    { resource: 'FW-NYC-PRI · CPU',          util: 94, sat: 'high',     errors: 142,  status: STATUS.CRIT },
    { resource: 'FW-NYC-PRI · conn table',   util: 98, sat: 'critical', errors:   0,  status: STATUS.CRIT },
    { resource: 'FW-NYC-SEC · CPU',          util: 91, sat: 'high',     errors:  88,  status: STATUS.CRIT },
    { resource: 'DC NYC-1 · network',        util: 38, sat: 'low',      errors:  12,  status: STATUS.WARN },
    { resource: 'DC NYC-1 · storage IOPS',   util: 42, sat: 'low',      errors:   0,  status: STATUS.OK },
    { resource: 'Trading svc · CPU',          util: 78, sat: 'medium',   errors: 1240, status: STATUS.CRIT },
    { resource: 'Trading svc · memory',       util: 64, sat: 'low',      errors:   0,  status: STATUS.OK },
    { resource: 'Order svc · queue depth',    util: 89, sat: 'high',     errors:   0,  status: STATUS.WARN },
  ];

  // 4. Service Mesh — uses existing components/edges plus highlighted flow paths.
  // (animation handled via CSS keyframes in the renderer)

  // 5. Statuspage-style components
  const statusComponents = [
    { name: 'Aladdin Trading',         status: 'major' },
    { name: 'Order Management',        status: 'major' },
    { name: 'Risk & Analytics',        status: 'op' },
    { name: 'Portfolio Management',    status: 'op' },
    { name: 'Client Reporting',        status: 'partial' },
    { name: 'Market Data Feeds',       status: 'op' },
    { name: 'API & SDK',               status: 'partial' },
    { name: 'Authentication',          status: 'op' },
    { name: 'Data Pipelines',          status: 'op' },
    { name: 'Mobile / Web Console',    status: 'op' },
  ];
  const statusHistory = [
    { date: '2026-05-08', incidents: 1, summary: 'P0 — FW NYC dual master (in progress)' },
    { date: '2026-05-07', incidents: 0, summary: '—' },
    { date: '2026-05-06', incidents: 0, summary: '—' },
    { date: '2026-05-05', incidents: 1, summary: 'P3 — reporting feed delay 8m' },
    { date: '2026-05-04', incidents: 0, summary: '—' },
    { date: '2026-05-03', incidents: 0, summary: '—' },
    { date: '2026-05-02', incidents: 0, summary: '—' },
    { date: '2026-05-01', incidents: 0, summary: '—' },
    { date: '2026-04-30', incidents: 1, summary: 'P2 — APAC market data lag 14m' },
    { date: '2026-04-29', incidents: 0, summary: '—' },
  ];

  // 6. AWS-Health-Dashboard-style services × regions grid
  const healthGrid = {
    regions: ['NA-East', 'NA-West', 'EU-West', 'EU-Central', 'APAC-NE', 'APAC-SE'],
    services: [
      { name: 'Trading',      statuses: [STATUS.CRIT, STATUS.WARN, STATUS.OK,   STATUS.OK,   STATUS.OK, STATUS.OK] },
      { name: 'Order Mgmt',   statuses: [STATUS.CRIT, STATUS.WARN, STATUS.OK,   STATUS.OK,   STATUS.OK, STATUS.OK] },
      { name: 'Risk',         statuses: [STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK, STATUS.OK] },
      { name: 'Portfolio',    statuses: [STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK, STATUS.OK] },
      { name: 'Reporting',    statuses: [STATUS.WARN, STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK, STATUS.OK] },
      { name: 'Market Data',  statuses: [STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK, STATUS.OK] },
      { name: 'Analytics',    statuses: [STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK, STATUS.OK] },
      { name: 'Auth/SSO',     statuses: [STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK, STATUS.OK] },
      { name: 'Data Lake',    statuses: [STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK, STATUS.OK] },
      { name: 'Pipelines',    statuses: [STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK,   STATUS.OK, STATUS.OK] },
    ],
  };

  // 7. NOC video wall — uses existing kpis/incident, no extra data needed.

  // 8. AI Watchdog (Datadog Watchdog / Dynatrace Davis style)
  const aiNarrative = {
    title: 'Aladdin AI · anomaly detected at 08:14:22 ET',
    confidence: 0.91,
    summary: 'Pattern matches dual-master split-brain on FW-NYC perimeter cluster. Indicators: simultaneous master-conflict alarms on PRI and SEC, latency p95 increased 13.6× across 4 trading services within 2 minutes, 0 firewall config changes in last 14 days.',
    similar: [
      { id: 'INC-2024-0312', similarity: 0.94, resolution: 'Demote SEC, restore PRI',          durMin:  28 },
      { id: 'INC-2023-0812', similarity: 0.81, resolution: 'Vendor patch, 4h DC drain',         durMin: 240 },
      { id: 'INC-2022-1104', similarity: 0.72, resolution: 'Network team manual cluster sync',  durMin:  52 },
    ],
    recommended: [
      { action: 'Demote FW-NYC-SECONDARY to standby', confidence: 0.94, rationale: 'Resolved 9 of 12 historically similar incidents' },
      { action: 'Drain T1 NYC traffic to LON',         confidence: 0.62, rationale: 'Reduces blast radius; ~$1.2K/min savings' },
      { action: 'Open Palo Alto sev-1 ticket',          confidence: 0.99, rationale: 'Standard practice for P0 vendor incidents' },
    ],
    notDoing: [
      { action: 'Restart FW-NYC-PRIMARY',  rationale: 'Would clear master role and exacerbate split-brain' },
      { action: 'Roll back recent deploys', rationale: 'No deploys in window of plausible cause' },
    ],
  };

  // 9. PagerDuty-style on-call view
  const pagerView = {
    onCall: [
      { team: 'Network · Primary',           person: 'Marcus Chen',     escalates:  '5m', phone: '+1 212 555 0142', avatar: 'MC' },
      { team: 'Network · Secondary',         person: 'Hiroshi Tanaka',  escalates: '10m', phone: '+1 415 555 0181', avatar: 'HT' },
      { team: 'Trading · Primary',           person: 'Sarah Kim',       escalates:  '5m', phone: '+1 212 555 0203', avatar: 'SK' },
      { team: 'Trading · Secondary',         person: "Liam O'Brien",    escalates: '10m', phone: '+1 212 555 0214', avatar: 'LO' },
      { team: 'Risk Platform',               person: 'Priya Natarajan', escalates: '15m', phone: '+1 212 555 0299', avatar: 'PN' },
      { team: 'Vendor Liaison',               person: 'Aaron Davis',      escalates: '30m', phone: '+1 212 555 0301', avatar: 'AD' },
      { team: 'Customer Success',             person: 'Robert Lee',       escalates: '30m', phone: '+1 212 555 0322', avatar: 'RL' },
      { team: 'Exec on-call',                  person: 'Aphus Kotak',      escalates: '60m', phone: '+1 212 555 0001', avatar: 'AK' },
    ],
    pages: [
      { time: '08:14:12', target: 'Network · Primary',     status: 'acked', ackBy: 'Marcus Chen',     ackIn: '34s' },
      { time: '08:14:14', target: 'Trading · Primary',     status: 'acked', ackBy: 'Sarah Kim',       ackIn: '52s' },
      { time: '08:18:03', target: 'Risk Platform',         status: 'acked', ackBy: 'Priya Natarajan', ackIn: '1m 12s' },
      { time: '08:24:18', target: 'Vendor Liaison',        status: 'acked', ackBy: 'Aaron Davis',     ackIn: '38s' },
      { time: '08:26:00', target: 'Exec on-call',          status: 'acked', ackBy: 'Aphus Kotak',     ackIn: '24s' },
      { time: '08:32:11', target: 'Customer Success',      status: 'acked', ackBy: 'Robert Lee',      ackIn: '1m 04s' },
    ],
    policy: ['Network primary (5m)', 'Network secondary (5m)', 'Network manager (10m)', 'Page exec on-call'],
  };

  // 10. Post-Mortem draft
  const postMortem = {
    summary: 'On 2026-05-08 at 08:14 ET, FW-NYC-PRIMARY entered a master-conflict state when FW-NYC-SECONDARY simultaneously promoted to master, creating a split-brain in the NYC perimeter cluster. Trading order routing for 14 tier-1 NYC clients was degraded for 36 minutes. Total realized cost: $284,419.',
    fiveWhys: [
      { q: 'Why did trading orders fail?',    a: 'Order routing connections to NYC trading service were rejected.' },
      { q: 'Why were connections rejected?',  a: 'FW-NYC-SECONDARY claimed master role and refused traffic from PRI-routed flows.' },
      { q: 'Why did SEC promote itself?',     a: 'SEC cluster heartbeat to PRI timed out, triggering automatic promotion.' },
      { q: 'Why did the heartbeat time out?', a: 'A buffer-overflow bug in FW firmware v8.4.1 drops heartbeats above 80% conn-table util.' },
      { q: 'Why was util above 80%?',          a: 'Connection-table sized 5y ago for ~12k clients; current load ~28k. Capacity review missed in last 3 cycles.' },
    ],
    contributing: [
      'Firmware bug (vendor disclosed: CVE-2025-FW-04421)',
      'Capacity review missed for 3 consecutive cycles',
      'Cluster split-brain detection not auto-mitigated',
      'No load-shedding policy when conn-table > 80%',
    ],
    actionItems: [
      { owner: 'Network',  due: '2026-05-22', text: 'Patch all FW pairs to firmware v8.4.3' },
      { owner: 'Network',  due: '2026-06-01', text: 'Increase conn-table sizing on all FW pairs' },
      { owner: 'Network',  due: '2026-05-15', text: 'Add automated SEC-demote on dual-master detection' },
      { owner: 'SRE',      due: '2026-06-01', text: 'Implement load-shed policy at 75% conn-table util' },
      { owner: 'SRE',      due: '2026-05-30', text: 'Add synthetic probe: NYC trading end-to-end every 30s' },
      { owner: 'Capacity', due: '2026-06-15', text: 'Re-establish quarterly capacity-review cadence' },
    ],
    wentWell: [
      'P0 declared within 12 minutes of first symptom',
      'Vendor concur within 6 minutes of escalation',
      'Mitigation executed within 24 minutes of P0 declaration',
      'Tier-1 NYC clients all received personalised comms',
    ],
    didntGoWell: [
      'No automated detection of dual-master state',
      'Capacity warning signal had been firing for 8 weeks unattended',
      'Customer success team not paged until 18 minutes in',
    ],
  };

  // 11. Stakeholder comms
  const commsAudiences = [
    {
      name: 'Tier-1 client alert', status: 'sent', sentAt: '08:33 ET', version: 4,
      draft: 'BlackRock Aladdin: We are aware of an issue affecting order routing for NYC-region trading. Our engineers have identified the root cause and mitigation is in progress. We expect resolution within 15 minutes. We will follow up with each affected account directly. — Aladdin Operations',
    },
    {
      name: 'Leadership update', status: 'sent', sentAt: '08:30 ET', version: 2,
      draft: 'P0 incident on Aladdin trading: dual firewall master state on NYC perimeter, ~14 tier-1 clients impacted, ~$5K/min cost burn. Mitigation in progress, ETA 8m. No data loss observed. Aphus on bridge as exec liaison. Next update at 08:45.',
    },
    {
      name: 'Regulatory (SEC Reg SCI)', status: 'draft', sentAt: null, version: 1,
      draft: 'Pursuant to 17 CFR 242.1003 (Reg SCI), BlackRock notifies the SEC of a systems disruption affecting order-routing functionality of the Aladdin trading platform on 2026-05-08, 08:14 to ~08:50 ET. Full incident report to follow within 24 hours per Reg SCI requirements.',
    },
    {
      name: 'Status page (public)', status: 'published', sentAt: '08:28 ET', version: 3,
      draft: 'Investigating — We are investigating elevated latency in Aladdin order routing for some NYC-region clients. Other regions and services are operating normally. We will provide updates every 15 minutes.',
    },
  ];

  // 12. Capacity forecast
  const capacityForecast = [
    { resource: 'FW-NYC-PRI · conn table',    current: 98, limit: 100, willHitAt: '08:51 ET', risk: STATUS.CRIT,
      history: [82, 84, 86, 88, 91, 94, 96, 98, 99, 99],  forecast: [99, 100, 100, 100, 100] },
    { resource: 'Trading svc · CPU',           current: 78, limit:  90, willHitAt: '09:14 ET', risk: STATUS.WARN,
      history: [42, 48, 54, 62, 68, 72, 76, 78, 80, 82],  forecast: [84, 86, 88, 90, 92] },
    { resource: 'Order queue depth',           current: 1847, limit: 5000, willHitAt: '10:48 ET', risk: STATUS.WARN,
      history: [120, 280, 540, 920, 1240, 1480, 1620, 1740, 1820, 1847], forecast: [1900, 2100, 2400, 2800, 3300] },
    { resource: 'Reporting batch backlog',     current: 142, limit: 500, willHitAt: '> 24h',   risk: STATUS.OK,
      history: [80, 88, 94, 102, 110, 118, 124, 132, 138, 142], forecast: [148, 154, 160, 166, 172] },
    { resource: 'DC NYC-1 inbound bandwidth',   current:  38, limit:  80, willHitAt: '> 24h',   risk: STATUS.OK,
      history: [32, 34, 36, 38, 40, 38, 36, 38, 38, 38], forecast: [38, 38, 38, 38, 38] },
  ];

  // 13. Change correlation
  const recentChanges = [
    { time: '08:12', type: 'firmware',    name: 'FW-NYC vendor advisory acknowledged (no action taken)', author: 'Marcus Chen',     correlation: 0.42 },
    { time: '07:34', type: 'config',      name: 'Trading engine: max_open_orders raised to 50k',          author: 'Sarah Kim',       correlation: 0.18 },
    { time: '06:14', type: 'deploy',      name: 'Risk service v3.42.1 → v3.42.2 (canary 10%)',            author: 'Priya N.',        correlation: 0.04 },
    { time: '03:00', type: 'maintenance', name: 'DB-NYC-3 routine backup window',                          author: 'auto',            correlation: 0.02 },
    { time: 'D-1',   type: 'config',      name: 'FIX gateway: connection_timeout 10s → 5s',                author: "Liam O'Brien",    correlation: 0.31 },
    { time: 'D-2',   type: 'deploy',      name: 'Order routing v4.12.0 → v4.13.0',                         author: 'Sarah Kim',       correlation: 0.12 },
    { time: 'D-7',   type: 'deploy',      name: 'Reporting v2.8.4 → v2.8.5',                               author: 'Diane F.',        correlation: 0.01 },
    { time: 'D-14',  type: 'config',      name: 'FW-NYC last config change',                                author: 'Marcus Chen',     correlation: 0.04 },
  ];

  // 14. Audit / compliance
  const compliance = {
    reportable: [
      { framework: 'SEC Reg SCI',     article: '17 CFR 242.1003',    what: 'Systems disruption ≥ 30 min',    status: 'pending', deadline: '2026-05-09 08:14 ET (24h)', severity: STATUS.CRIT },
      { framework: 'FINRA',           article: 'Rule 4530',           what: 'Material trading-system outage', status: 'pending', deadline: '2026-05-15 (T+5)',           severity: STATUS.WARN },
      { framework: 'MiFID II',        article: 'Article 17(1)',       what: 'Algo trading system disruption', status: 'n/a',     deadline: '—',                          severity: STATUS.OK },
      { framework: 'CFTC',            article: 'Reg SDR 17.3',        what: 'Disruption of swap-execution',   status: 'n/a',     deadline: '—',                          severity: STATUS.OK },
      { framework: 'Internal · Risk', article: 'BR-RISK-014',         what: 'Trading exposure disclosure',     status: 'sent',    deadline: '08:45 ET',                   severity: STATUS.WARN },
      { framework: 'Client SLA',       article: 'Master Agreement',    what: 'Service-credit calculation',      status: 'pending', deadline: '2026-05-15',                 severity: STATUS.WARN },
    ],
    evidence: [
      { item: 'Bridge call recording',             captured: true, retention: '7y' },
      { item: 'Decision log timestamps',           captured: true, retention: '7y' },
      { item: 'Component health snapshots',        captured: true, retention: '7y' },
      { item: 'Network traffic capture',           captured: true, retention: '90d' },
      { item: 'Vendor support ticket (#PA-44218)',  captured: true, retention: '7y' },
      { item: 'Customer comms sent + receipts',    captured: true, retention: '7y' },
    ],
  };

  // 15. Risk officer view
  const riskView = {
    varAtRisk: '$1.42B',
    positionsHeld: 11420,
    unhedgedExposure: '$84M',
    marketDataLag: '14s (NYC) · 0s (LON, TOK)',
    byAssetClass: [
      { asset: 'Equities',           positions: 5420, exposure: '$640M', risk: STATUS.CRIT },
      { asset: 'Fixed Income',        positions: 3120, exposure: '$420M', risk: STATUS.CRIT },
      { asset: 'Listed Derivatives',  positions: 1680, exposure: '$180M', risk: STATUS.WARN },
      { asset: 'OTC Derivatives',     positions:  720, exposure: '$120M', risk: STATUS.WARN },
      { asset: 'FX',                  positions:  380, exposure:  '$48M', risk: STATUS.OK },
      { asset: 'Commodities',          positions:  100, exposure:  '$12M', risk: STATUS.OK },
    ],
    marketContext: [
      'S&P 500 +0.3% during incident window',
      'VIX flat at 14.2',
      '10Y yield -1bp',
      'No major macro events in window',
      'Pre-market US equity volume nominal',
    ],
  };

  // 16. Trade desk floor
  const tradingDesks = [
    { desk: 'GS NYC Equities',        traders: 8,  queued: 23, status: STATUS.CRIT, latencyMs: 850 },
    { desk: 'JPM NYC Fixed Income',   traders: 6,  queued: 41, status: STATUS.CRIT, latencyMs: 920 },
    { desk: 'Citadel NYC Quant',      traders: 12, queued:  0, status: STATUS.CRIT, latencyMs: 1100, note: 'Algo paused (client kill-switch)' },
    { desk: 'MS NYC PWM',             traders: 4,  queued: 17, status: STATUS.CRIT, latencyMs: 940 },
    { desk: 'Fidelity NYC Pension',   traders: 2,  queued:  0, status: STATUS.WARN, latencyMs:  95 },
    { desk: 'BNY NYC Trust',          traders: 3,  queued:  0, status: STATUS.WARN, latencyMs:  78 },
    { desk: 'GS LON Equities',        traders: 6,  queued:  0, status: STATUS.OK,   latencyMs:  62 },
    { desk: 'JPM LON Fixed Income',   traders: 5,  queued:  0, status: STATUS.OK,   latencyMs:  58 },
    { desk: 'BlackRock LON Wealth',    traders: 4,  queued:  0, status: STATUS.OK,   latencyMs:  64 },
    { desk: 'Nomura TOK Equities',    traders: 4,  queued:  0, status: STATUS.OK,   latencyMs:  84 },
    { desk: 'Mizuho TOK Fixed Income', traders: 3,  queued:  0, status: STATUS.OK,   latencyMs:  78 },
    { desk: 'GS APAC Quant',          traders: 5,  queued:  0, status: STATUS.OK,   latencyMs:  71 },
  ];

  // 17. Geographic impact
  const geoImpact = [
    { region: 'NYC', label: 'New York',  affected: 14, healthy:  0, latencyMs: 850, status: STATUS.CRIT, x: 28, y: 38 },
    { region: 'LON', label: 'London',    affected:  0, healthy: 11, latencyMs:  64, status: STATUS.OK,   x: 48, y: 32 },
    { region: 'FRA', label: 'Frankfurt', affected:  0, healthy:  4, latencyMs:  58, status: STATUS.OK,   x: 51, y: 34 },
    { region: 'TOK', label: 'Tokyo',     affected:  0, healthy:  8, latencyMs:  71, status: STATUS.OK,   x: 84, y: 40 },
    { region: 'SYD', label: 'Sydney',    affected:  0, healthy:  3, latencyMs:  84, status: STATUS.OK,   x: 87, y: 74 },
  ];

  // 18. Latency 2D heatmap
  const latencyHeatmap = (() => {
    const T_BUCKETS = 30;
    const L_BUCKETS = 12;
    const incidentBucket = 22;
    const matrix = [];
    for (let l = 0; l < L_BUCKETS; l++) {
      const row = [];
      for (let t = 0; t < T_BUCKETS; t++) {
        const incidentInfluence = Math.max(0, Math.min(1, (t - incidentBucket) / 4));
        const lowPeak = Math.exp(-Math.pow((l - 2) / 1.5, 2)) * (1 - incidentInfluence * 0.4);
        const highPeak = Math.exp(-Math.pow((l - 9) / 1.5, 2)) * incidentInfluence;
        const noise = (l + t) % 7 === 0 ? 0.04 : 0.01;
        row.push(Math.round((lowPeak + highPeak + noise) * 100) / 100);
      }
      matrix.push(row);
    }
    return {
      timeLabels: ['-30m', '-25m', '-20m', '-15m', '-10m', '-5m', 'now'],
      latencyLabels: ['>30s', '10-30s', '5-10s', '2-5s', '1-2s', '500ms-1s', '200-500ms', '100-200ms', '50-100ms', '25-50ms', '10-25ms', '<10ms'],
      matrix,
    };
  })();

  // 19. Sankey flow
  const sankey = {
    layers: [
      [ // Layer 0 — clients
        { id: 't1-na',    label: 'T1 N.America', value: 47, status: STATUS.CRIT },
        { id: 't2-na',    label: 'T2 N.America', value: 33, status: STATUS.WARN },
        { id: 't1-emea',  label: 'T1 EMEA',      value: 41, status: STATUS.OK },
        { id: 't1-apac',  label: 'T1 APAC',      value: 28, status: STATUS.OK },
      ],
      [ // Layer 1 — perimeter
        { id: 'fw-nyc', label: 'FW-NYC',  value: 80, status: STATUS.CRIT },
        { id: 'fw-lon', label: 'FW-LON',  value: 41, status: STATUS.OK },
        { id: 'fw-tok', label: 'FW-TOK',  value: 28, status: STATUS.OK },
      ],
      [ // Layer 2 — data centers
        { id: 'dc-nyc', label: 'DC NYC',  value: 80, status: STATUS.WARN },
        { id: 'dc-lon', label: 'DC LON',  value: 41, status: STATUS.OK },
        { id: 'dc-tok', label: 'DC TOK',  value: 28, status: STATUS.OK },
      ],
      [ // Layer 3 — outcomes
        { id: 'ok',       label: 'Healthy delivery',  value: 102, status: STATUS.OK },
        { id: 'degraded', label: 'Degraded delivery', value:  33, status: STATUS.WARN },
        { id: 'failed',   label: 'Failed delivery',   value:  14, status: STATUS.CRIT },
      ],
    ],
    flows: [
      { from: 't1-na',    to: 'fw-nyc',   value: 47, status: STATUS.CRIT },
      { from: 't2-na',    to: 'fw-nyc',   value: 33, status: STATUS.WARN },
      { from: 't1-emea',  to: 'fw-lon',   value: 41, status: STATUS.OK },
      { from: 't1-apac',  to: 'fw-tok',   value: 28, status: STATUS.OK },
      { from: 'fw-nyc',   to: 'dc-nyc',   value: 80, status: STATUS.CRIT },
      { from: 'fw-lon',   to: 'dc-lon',   value: 41, status: STATUS.OK },
      { from: 'fw-tok',   to: 'dc-tok',   value: 28, status: STATUS.OK },
      { from: 'dc-nyc',   to: 'failed',   value: 14, status: STATUS.CRIT },
      { from: 'dc-nyc',   to: 'degraded', value: 33, status: STATUS.WARN },
      { from: 'dc-nyc',   to: 'ok',       value: 33, status: STATUS.OK },
      { from: 'dc-lon',   to: 'ok',       value: 41, status: STATUS.OK },
      { from: 'dc-tok',   to: 'ok',       value: 28, status: STATUS.OK },
    ],
  };

  // 20. Synthetic probes
  const probeSpark = (failingTail, n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      if (failingTail && i >= n - failingTail) out.push(0);
      else out.push(0.95 + ((i * 17) % 5) / 100);
    }
    return out;
  };
  const syntheticProbes = [
    { name: 'E2E NYC trading flow',         interval: '30s', lastSuccess: '36m 14s ago', status: STATUS.CRIT, passRate: '12%',  spark: probeSpark(14, 20) },
    { name: 'NYC FIX gateway accept',       interval: '10s', lastSuccess: '36m 02s ago', status: STATUS.CRIT, passRate: '14%',  spark: probeSpark(15, 20) },
    { name: 'NYC order routing roundtrip',  interval: '30s', lastSuccess: '36m 18s ago', status: STATUS.CRIT, passRate: '8%',   spark: probeSpark(16, 20) },
    { name: 'Reporting feed lag',           interval: '60s', lastSuccess: '2m 14s ago',  status: STATUS.WARN, passRate: '78%',  spark: probeSpark( 4, 20) },
    { name: 'E2E LON trading flow',         interval: '30s', lastSuccess: '0s ago',       status: STATUS.OK,   passRate: '100%', spark: probeSpark( 0, 20) },
    { name: 'E2E TOK trading flow',         interval: '30s', lastSuccess: '0s ago',       status: STATUS.OK,   passRate: '100%', spark: probeSpark( 0, 20) },
    { name: 'Risk feed freshness NYC',      interval: '60s', lastSuccess: '32s ago',      status: STATUS.OK,   passRate: '100%', spark: probeSpark( 0, 20) },
    { name: 'Identity SSO probe',            interval: '30s', lastSuccess: '0s ago',       status: STATUS.OK,   passRate: '100%', spark: probeSpark( 0, 20) },
    { name: 'Market data tick freshness',    interval:  '5s', lastSuccess: '4s ago',       status: STATUS.OK,   passRate: '99.9%',spark: probeSpark( 0, 20) },
    { name: 'Database read probe NYC',       interval: '15s', lastSuccess: '0s ago',       status: STATUS.OK,   passRate: '100%', spark: probeSpark( 0, 20) },
    { name: 'Database write probe NYC',      interval: '15s', lastSuccess: '0s ago',       status: STATUS.OK,   passRate: '100%', spark: probeSpark( 0, 20) },
    { name: 'Cross-region failover test',    interval:  '5m', lastSuccess: '4m ago',       status: STATUS.OK,   passRate: '100%', spark: probeSpark( 0, 20) },
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
    clientImpact,
    hypotheses,
    observations,
    trace,
    decisions,
    roles,
    etas,
    cost,
    replayEvents,
    sloServices,
    goldenSignals,
    redMethod,
    useMethod,
    statusComponents,
    statusHistory,
    healthGrid,
    aiNarrative,
    pagerView,
    postMortem,
    commsAudiences,
    capacityForecast,
    recentChanges,
    compliance,
    riskView,
    tradingDesks,
    geoImpact,
    latencyHeatmap,
    sankey,
    syntheticProbes,
    byId(id) { return components.find(c => c.id === id); },
  };
})();
