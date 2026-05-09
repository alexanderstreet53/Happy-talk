// Aladdin Health Dashboard — prototype controller.
// Renders the four views (Hub, Tree, War Room, Timeline) into #view based on
// the active tab. Uses inline SVG for diagrams to avoid external deps.

(function () {
  const D = window.ALADDIN;
  const S = D.STATUS;
  const view = document.getElementById('view');
  const tabs = document.getElementById('tabs');

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const el = (tag, attrs = {}, children = []) => {
    const node = document.createElementNS(
      tag === 'svg' || tag === 'g' || tag === 'circle' || tag === 'line' ||
      tag === 'rect' || tag === 'text' || tag === 'path' || tag === 'polyline'
        ? 'http://www.w3.org/2000/svg'
        : 'http://www.w3.org/1999/xhtml',
      tag
    );
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') node.setAttribute('class', v);
      else if (k === 'text') node.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v !== undefined && v !== null) node.setAttribute(k, v);
    }
    for (const c of [].concat(children)) {
      if (c == null) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  };

  const fmtMin = (m) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  };

  const statusClass = (s) => s; // 'ok' | 'warn' | 'crit' | 'down'

  const setView = (raw) => {
    const [name, sub] = raw.split('/');
    [...tabs.querySelectorAll('.tab')].forEach((t) =>
      t.classList.toggle('active', t.dataset.view === name)
    );
    view.replaceChildren();
    if (name === 'hub') renderHub();
    else if (name === 'tree') renderTree();
    else if (name === 'war-room') renderWarRoom(sub);
    else if (name === 'timeline') renderTimeline();
    history.replaceState(null, '', `#${raw}`);
  };

  tabs.addEventListener('click', (e) => {
    const t = e.target.closest('.tab');
    if (t) setView(t.dataset.view);
  });

  // -------------------------------------------------------------------------
  // HUB view — landing page with banner + four glanceable quadrants.
  // -------------------------------------------------------------------------
  function renderHub() {
    const banner = el('section', { class: 'hub-banner' }, [
      el('div', { class: 'hub-banner-status' }, [
        el('span', { class: 'dot crit big-dot' }),
        el('div', {}, [
          el('h1', {}, [
            'Aladdin is ', el('span', { class: 'hl', text: 'DEGRADED' }),
          ]),
          el('div', { class: 'hub-banner-sub', text: D.incident.impact }),
        ]),
      ]),
      el('div'), // spacer
      el('div', { class: 'hub-banner-kpis' }, [
        kpi(D.kpis.healthyClients, 'Healthy clients', 'ok'),
        kpi(D.kpis.degradedClients, 'Degraded',       'warn'),
        kpi(D.kpis.impactedClients, 'Impacted',       'crit'),
        kpi(D.kpis.activeIncidents, 'Active P0',      'crit'),
      ]),
    ]);

    const grid = el('section', { class: 'hub-grid' });
    grid.append(
      hubCard('Trunk & Branches',     miniTree(),     () => setView('tree')),
      hubCard('Infrastructure × Clients', miniHeatmap(), () => setView('tree')),
      hubCard('Geographic',           miniWorld(),    () => setView('war-room')),
      hubCard('Last 24h',             miniTimeline(), () => setView('timeline'))
    );

    view.append(banner, grid);
  }

  function kpi(num, label, tone) {
    return el('div', { class: 'kpi' }, [
      el('span', { class: `kpi-num ${tone || ''}`, text: String(num) }),
      el('span', { class: 'kpi-label', text: label }),
    ]);
  }

  function hubCard(title, body, onclick) {
    return el(
      'div',
      { class: 'card', onclick },
      [
        el('div', { class: 'card-head' }, [
          el('span', { class: 'card-title', text: title }),
          el('span', { class: 'card-action', text: 'expand →' }),
        ]),
        body,
      ]
    );
  }

  // -- Mini tree (depth-2 textual tree) -------------------------------------
  function miniTree() {
    const wrap = el('div', { class: 'mini-tree' });
    const walk = (node, depth) => {
      wrap.append(
        el('div', { class: `mini-tree-node depth-${depth}` }, [
          el('span', { class: `dot ${statusClass(node.status)}` }),
          el('span', { text: node.name }),
        ])
      );
      if (depth < 2 && node.children) node.children.forEach((c) => walk(c, depth + 1));
    };
    D.tree.children.forEach((c) => walk(c, 0));
    return wrap;
  }

  // -- Mini heatmap ---------------------------------------------------------
  function miniHeatmap() {
    const { rows, cols, cells } = D.heatmap;
    const wrap = el('div', { class: 'heatmap' });
    const colTemplate = `90px repeat(${cols.length}, minmax(0, 1fr))`;

    const head = el('div', { class: 'heatmap-collabels', style: `grid-template-columns: ${colTemplate}` });
    head.append(el('span'));
    cols.forEach((c) => head.append(el('span', { text: c })));
    wrap.append(head);

    rows.forEach((rowName, i) => {
      const row = el('div', { class: 'heatmap-row', style: `grid-template-columns: ${colTemplate}` });
      row.append(el('div', { class: 'heatmap-rowlabel', text: rowName }));
      cells[i].forEach((status) => {
        row.append(el('div', { class: `heatmap-cell ${statusClass(status)}`, title: `${rowName}: ${status}` }));
      });
      wrap.append(row);
    });
    return wrap;
  }

  // -- Mini world map -------------------------------------------------------
  function miniWorld() {
    const wrap = el('div', { class: 'world' });
    // Use an SVG layer for graticule + flow lines, HTML pins overlaid for labels.
    const svg = el('svg', { viewBox: '0 0 1000 500', preserveAspectRatio: 'xMidYMid meet' });

    // Subtle world graticule — just a few longitude/latitude dotted lines.
    for (let lat = 100; lat < 500; lat += 100) {
      svg.append(el('line', { x1: 0, y1: lat, x2: 1000, y2: lat, stroke: '#1e2640', 'stroke-dasharray': '2 6' }));
    }
    for (let lon = 100; lon < 1000; lon += 100) {
      svg.append(el('line', { x1: lon, y1: 0, x2: lon, y2: 500, stroke: '#1e2640', 'stroke-dasharray': '2 6' }));
    }

    // Flow lines NYC -> LON, LON -> TOK to suggest data movement.
    const nyc = D.geo.find((g) => g.id === 'dc-nyc');
    const lon = D.geo.find((g) => g.id === 'dc-lon');
    const tok = D.geo.find((g) => g.id === 'dc-tok');
    const link = (a, b, color) => {
      const x1 = (a.x / 100) * 1000, y1 = (a.y / 100) * 500;
      const x2 = (b.x / 100) * 1000, y2 = (b.y / 100) * 500;
      const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - 80;
      svg.append(
        el('path', {
          d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`,
          stroke: color, 'stroke-width': 1.5, fill: 'none', opacity: 0.7,
        })
      );
    };
    link(nyc, lon, '#ef4444');
    link(lon, tok, '#22c55e');

    wrap.append(svg);

    D.geo.forEach((g) => {
      const pin = el('div', {
        class: `world-pin ${statusClass(g.status)}`,
        style: `left: ${g.x}%; top: ${g.y}%`,
      }, [
        el('div', { class: 'ring' }),
        el('div', { class: 'label', text: g.label }),
      ]);
      wrap.append(pin);
    });
    return wrap;
  }

  // -- Mini timeline (just a few key strips) --------------------------------
  function miniTimeline() {
    const wrap = el('div', { class: 'mini-timeline' });
    const strips = [
      D.timeline.stripGroups[0].strips[0], // FW NYC PRI
      D.timeline.stripGroups[0].strips[1], // FW NYC SEC
      D.timeline.stripGroups[2].strips[0], // Trading
      D.timeline.stripGroups[2].strips[1], // Order routing
      D.timeline.stripGroups[2].strips[3], // Reporting
    ];
    strips.forEach((s) => {
      const row = el('div', { class: 'mini-timeline-row' });
      row.append(el('div', { class: 'label', text: s.label }));
      const strip = el('div', { class: 'strip' });
      s.segments.forEach((seg) => {
        const left = (seg.from / D.timeline.totalMins) * 100;
        const width = ((seg.to - seg.from) / D.timeline.totalMins) * 100;
        strip.append(el('div', {
          class: `seg ${statusClass(seg.status)}`,
          style: `left: ${left}%; width: ${width}%`,
        }));
      });
      row.append(strip);
      wrap.append(row);
    });
    return wrap;
  }

  // -------------------------------------------------------------------------
  // TREE view — hierarchical SVG layout, trunk at top, branches fanning out.
  // -------------------------------------------------------------------------
  function renderTree() {
    const wrap = el('section', { class: 'tree-wrap' });
    wrap.append(
      el('div', { class: 'tree-legend' }, [
        legendItem('ok',   'Healthy'),
        legendItem('warn', 'Degraded'),
        legendItem('crit', 'Impaired'),
        el('span', { class: 'muted', text: '· click any node to drill in (mock)' }),
      ])
    );

    // Layout the tree top-down using a simple recursive layout: assign each
    // leaf an x-slot, then position parents at the centroid of their children.
    const root = D.tree;
    const leaves = [];
    const flat = [];
    const collectLeaves = (node, depth, parent) => {
      flat.push({ node, depth, parent });
      if (!node.children || node.children.length === 0) {
        node._leafIdx = leaves.length;
        leaves.push(node);
      } else {
        node.children.forEach((c) => collectLeaves(c, depth + 1, node));
      }
    };
    collectLeaves(root, 0, null);

    // Compute x for each node (centroid of leaf descendants).
    const setX = (node) => {
      if (!node.children || node.children.length === 0) {
        node._x = node._leafIdx;
        return [node._x, node._x];
      }
      let lo = Infinity, hi = -Infinity;
      node.children.forEach((c) => {
        const [a, b] = setX(c);
        if (a < lo) lo = a;
        if (b > hi) hi = b;
      });
      node._x = (lo + hi) / 2;
      return [lo, hi];
    };
    setX(root);

    const W = Math.max(900, leaves.length * 110);
    const HSTEP = 110;
    const maxDepth = Math.max(...flat.map((f) => f.depth));
    const H = (maxDepth + 1) * 100 + 40;

    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H });

    // Draw edges first.
    flat.forEach(({ node, parent }) => {
      if (!parent) return;
      const x1 = (parent._x + 0.5) * HSTEP;
      const y1 = ((flat.find((f) => f.node === parent).depth) * 100) + 50;
      const x2 = (node._x + 0.5) * HSTEP;
      const y2 = (flat.find((f) => f.node === node).depth) * 100 + 50;
      const cls = node.status === S.CRIT ? 'edge crit' : node.status === S.WARN ? 'edge warn' : 'edge';
      svg.append(
        el('path', {
          d: `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`,
          fill: 'none',
          class: cls,
        })
      );
    });

    // Draw nodes.
    flat.forEach(({ node, depth }) => {
      const cx = (node._x + 0.5) * HSTEP;
      const cy = depth * 100 + 50;
      const r = depth === 0 ? 14 : depth === 1 ? 11 : 7;
      svg.append(el('circle', {
        cx, cy, r,
        class: `node-circle ${statusClass(node.status)}`,
        'stroke-width': 2,
      }));
      // Label position: above for trunk/branches, below for leaves.
      const labelY = depth === maxDepth ? cy + r + 14 : cy - r - 8;
      const label = el('text', {
        x: cx, y: labelY,
        class: 'node-label',
        'text-anchor': 'middle',
        text: node.name,
      });
      svg.append(label);
    });

    wrap.append(svg);
    view.append(wrap);
  }

  function legendItem(status, label) {
    return el('span', { class: 'item' }, [
      el('span', { class: `dot ${status}` }),
      el('span', { text: label }),
    ]);
  }

  // -------------------------------------------------------------------------
  // WAR ROOM view — incident-centric. 7 variations, each a different mental
  // model for managing the same incident.
  // -------------------------------------------------------------------------
  const WAR_VARIATIONS = [
    // Original 7
    { id: 'operational', label: 'Operational',     render: renderWarOperational, hint: '3-pane operations' },
    { id: 'commander',   label: 'Commander',       render: renderWarCommander,   hint: 'Coordination & decisions' },
    { id: 'diagnostic',  label: 'Diagnostic',      render: renderWarDiagnostic,  hint: 'Hypothesis-driven RCA' },
    { id: 'triage',      label: 'Customer Triage', render: renderWarTriage,      hint: 'Per-client impact cards', badge: '14' },
    { id: 'trace',       label: 'Trace',           render: renderWarTrace,       hint: 'Span-by-span waterfall' },
    { id: 'cost',        label: 'Cost Burn',       render: renderWarCost,        hint: 'Dollars per minute' },
    { id: 'replay',      label: 'Replay',          render: renderWarReplay,      hint: 'Time-scrubber forensics' },
    // 20 new
    { id: 'ai',          label: 'AI Watchdog',     render: renderWarAI,          hint: 'Auto-RCA narrative · Datadog/Dynatrace pattern' },
    { id: 'mesh',        label: 'Service Mesh',    render: renderWarMesh,        hint: 'Animated traffic flow · Vizceral pattern' },
    { id: 'sankey',      label: 'Sankey Flow',     render: renderWarSankey,      hint: 'Left→right impact propagation' },
    { id: 'healthgrid',  label: 'Health Grid',     render: renderWarHealthGrid,  hint: 'Services × regions · AWS Health pattern' },
    { id: 'noc',         label: 'NOC Wall',        render: renderWarNOC,         hint: 'TV-distance glanceable' },
    { id: 'statuspage',  label: 'Status Page',     render: renderWarStatusPage,  hint: 'Customer-facing · Atlassian pattern' },
    { id: 'desks',       label: 'Trade Desks',     render: renderWarDesks,       hint: 'Per-desk floor view' },
    { id: 'geo',         label: 'Geographic',      render: renderWarGeo,         hint: 'World map of impact' },
    { id: 'pager',       label: 'Pager',           render: renderWarPager,       hint: 'On-call · PagerDuty pattern' },
    { id: 'comms',       label: 'Comms',           render: renderWarComms,       hint: 'Stakeholder drafts' },
    { id: 'compliance',  label: 'Compliance',      render: renderWarCompliance,  hint: 'Regulatory reportable events' },
    { id: 'risk',        label: 'Risk Officer',    render: renderWarRisk,        hint: 'VaR & exposure during outage' },
    { id: 'slo',         label: 'SLO Burn',        render: renderWarSLO,         hint: 'Error budget · Google SRE pattern' },
    { id: 'golden',      label: 'Golden Signals',  render: renderWarGolden,      hint: 'Latency/Traffic/Errors/Saturation' },
    { id: 'red',         label: 'RED · USE',       render: renderWarRED,         hint: 'Wilkie · Brendan Gregg patterns' },
    { id: 'heatmap',     label: 'Latency Heatmap', render: renderWarHeatmap,     hint: '2D distribution over time' },
    { id: 'capacity',    label: 'Capacity',        render: renderWarCapacity,    hint: 'Saturation forecast' },
    { id: 'change',      label: 'Change Log',      render: renderWarChange,      hint: 'Recent deploys × incident' },
    { id: 'probes',      label: 'Synthetic',       render: renderWarProbes,      hint: 'Canary tests grid' },
    { id: 'postmortem',  label: 'Post-Mortem',     render: renderWarPostmortem,  hint: 'Auto-drafted · 5 whys' },
  ];

  let activeWarVariation = 'operational';
  let replayCursorMin = 1428; // start the replay scrubber at the 'mitigate' event

  function renderWarRoom(variation) {
    if (variation) activeWarVariation = variation;
    const inc = D.incident;

    const banner = el('section', { class: 'war-banner' }, [
      el('div', {}, [
        el('div', { class: 'war-banner-id', text: `${inc.severity} · ${inc.id}` }),
        el('h2', { text: inc.title }),
        el('div', { class: 'war-banner-meta' }, [
          metaSpan('Status',     inc.status.toUpperCase()),
          metaSpan('Duration',   `${inc.durationMins}m`),
          metaSpan('Affected',   `${inc.affectedClients} clients`),
          metaSpan('Commander',  inc.commander),
          metaSpan('Bridge',     inc.bridge),
        ]),
      ]),
      el('div', { class: 'row-center' }, [
        el('span', { class: 'dot crit' }),
        el('span', { class: 'mono', style: 'color: var(--crit); letter-spacing: 0.06em;', text: 'P0 ACTIVE' }),
      ]),
    ]);

    const subnav = el('nav', { class: 'war-subnav' });
    const body = el('div', { id: 'war-body' });

    const setVar = (id) => {
      activeWarVariation = id;
      [...subnav.querySelectorAll('.war-subnav-item')].forEach((b) =>
        b.classList.toggle('active', b.dataset.variation === id)
      );
      body.replaceChildren();
      const v = WAR_VARIATIONS.find((x) => x.id === id);
      v.render(body);
      history.replaceState(null, '', `#war-room/${id}`);
    };

    WAR_VARIATIONS.forEach((v) => {
      const btn = el('button', {
        class: `war-subnav-item ${activeWarVariation === v.id ? 'active' : ''}`,
        'data-variation': v.id,
        title: v.hint,
        onclick: () => setVar(v.id),
      }, [
        v.label,
        v.badge ? el('span', { class: 'badge', text: v.badge }) : null,
      ]);
      subnav.append(btn);
    });

    view.append(banner, subnav, body);
    setVar(activeWarVariation);
  }

  // -- Variation 1: Operational (the original 3-pane) ----------------------
  function renderWarOperational(container) {
    const grid = el('section', { class: 'war-grid' });
    grid.append(
      el('div', { class: 'card' }, [
        cardHead('Blast Radius — fw-nyc-pri'),
        renderDepGraph(),
      ]),
      el('div', { class: 'card' }, [
        cardHead('Live Metrics — affected components'),
        renderMetrics(),
      ]),
      el('div', { class: 'card' }, [
        cardHead('Runbook'),
        renderRunbook(),
        el('hr', { class: 'soft' }),
        cardHead('Comms'),
        renderComms(),
      ])
    );
    container.append(grid);
  }

  // -- Variation 2: Commander — coordination + decisions + roles -----------
  function renderWarCommander(container) {
    const e = D.etas;

    const actionBar = el('section', { class: 'cmd-action-bar' }, [
      el('div', {}, [
        el('div', { class: 'cmd-action-label', text: 'Next required action' }),
        el('div', { class: 'cmd-action-text', text: e.nextRequiredAction }),
      ]),
      el('div'),
      el('button', { class: 'cmd-action-cta', text: 'CONFIRM ✓' }),
    ]);

    const etaStack = el('div', { class: 'eta-stack' });
    [
      { e: e.mitigation, tone: 'crit'  },
      { e: e.resolution, tone: 'warn'  },
      { e: e.nextComms,  tone: ''      },
    ].forEach(({ e: blk, tone }) => {
      etaStack.append(
        el('div', { class: `eta-block ${tone}` }, [
          el('div', { class: 'eta-label', text: blk.label }),
          el('div', { class: 'eta-value', text: blk.value }),
          el('div', { class: 'eta-confidence' }, [
            'confidence ',
            el('span', { class: blk.confidence, text: blk.confidence }),
          ]),
        ])
      );
    });

    const decisionsCard = el('div', { class: 'card' }, [
      cardHead('Decision Log'),
      (() => {
        const wrap = el('div', { class: 'decisions' });
        D.decisions.forEach((d, i) => {
          const isLatest = i === D.decisions.length - 1;
          wrap.append(
            el('div', { class: `decision-row ${isLatest ? 'latest' : ''}` }, [
              el('div', { class: 'decision-meta' }, [
                el('span', { class: 'decision-time', text: d.at }),
                el('span', { class: 'decision-by', text: d.by }),
              ]),
              el('div', { class: 'decision-text', text: d.text }),
              el('div', { class: 'decision-impact', text: '→ ' + d.impact }),
            ])
          );
        });
        return wrap;
      })(),
    ]);

    const rolesCard = el('div', { class: 'card' }, [
      cardHead('Bridge · Roles'),
      (() => {
        const list = el('div', { class: 'role-list' });
        D.roles.forEach((r) => {
          list.append(
            el('div', { class: 'role-row' }, [
              el('div', { class: 'role-avatar', text: r.avatar }),
              el('div', {}, [
                el('div', { class: 'role-name', text: r.person }),
                el('div', { class: 'role-role', text: r.role }),
              ]),
              el('span', { class: `role-status-pill ${r.status}`, text: r.status }),
            ])
          );
        });
        return list;
      })(),
    ]);

    const grid = el('div', { class: 'cmd-grid' }, [
      el('div', { class: 'card' }, [cardHead('ETAs & Comms'), etaStack]),
      decisionsCard,
      rolesCard,
    ]);

    container.append(actionBar, grid);
  }

  // -- Variation 3: Diagnostic — hypotheses + observations + probes --------
  function renderWarDiagnostic(container) {
    const obs = el('section', { class: 'observations' }, [
      el('span', { class: 'observations-label', text: 'Observations' }),
      ...D.observations.map((o) =>
        el('span', { class: `obs-chip ${o.severity}`, text: o.text })
      ),
    ]);

    const hypList = el('div', { class: 'hypothesis-list' });
    D.hypotheses.forEach((h, i) => {
      const top = i === 0;
      const card = el('div', { class: `hypothesis ${top ? 'top' : ''}` }, [
        el('div', { class: 'hyp-head' }, [
          el('div', { class: 'hyp-text', text: h.text }),
          el('div', { class: 'hyp-prob', text: `${(h.probability * 100).toFixed(0)}%` }),
        ]),
        el('div', { class: 'hyp-bar' }, [
          el('div', { class: 'hyp-bar-fill', style: `width: ${h.probability * 100}%` }),
        ]),
        el('div', { class: 'hyp-section-label', text: 'Supporting evidence' }),
        ...h.evidence.map((e) =>
          el('div', { class: 'hyp-evidence-row' }, [
            el('span', { class: 'mark', text: '✓' }),
            el('span', { text: e }),
          ])
        ),
        el('div', { class: 'hyp-section-label', text: 'What would refute this' }),
        el('div', { class: 'hyp-evidence-row counter' }, [
          el('span', { class: 'mark', text: '⊘' }),
          el('span', { text: h.counter }),
        ]),
        el('div', { class: 'hyp-section-label', text: 'Recommended actions' }),
        el('div', { class: 'hyp-actions' }, h.actions.map((a) =>
          el('button', { class: 'hyp-action-btn', text: a })
        )),
      ]);
      hypList.append(card);
    });

    const probesCard = el('div', { class: 'card' }, [
      cardHead('Probes'),
      (() => {
        const probes = [
          { name: 'show cluster status FW-NYC',         result: 'split-brain confirmed', tone: 'crit' },
          { name: 'ping core → fw-nyc-pri',             result: '< 1ms · healthy',       tone: 'ok' },
          { name: 'show last 30d FW-NYC config diffs',  result: '0 changes',              tone: 'ok' },
          { name: 'show last 24h trading deploys',      result: '0 deploys',              tone: 'ok' },
          { name: 'replay GS Equities order #04471',    result: 'reproducer captured',    tone: 'warn' },
          { name: 'check vendor support ticket',        result: 'P1 · in progress',       tone: 'warn' },
          { name: 'run synthetic order NYC → trading',  result: 'pending…',                tone: 'pending' },
        ];
        const wrap = el('div', { class: 'probe-list' });
        probes.forEach((p) =>
          wrap.append(
            el('div', { class: 'probe-row' }, [
              el('div', { class: 'probe-name', text: p.name }),
              el('div', { class: `probe-result ${p.tone}`, text: p.result }),
            ])
          )
        );
        return wrap;
      })(),
    ]);

    const calibrationCard = el('div', { class: 'card', style: 'margin-top: 14px' }, [
      cardHead('Confidence calibration · last 30 incidents'),
      el('div', { style: 'font-size: 12px; color: var(--text-soft); padding: 8px 4px;' }, [
        el('div', {}, [
          el('span', { class: 'mono', style: 'color: var(--ok)', text: '94% ' }),
          'top-1 hypothesis correct when probability ≥ 0.9',
        ]),
        el('div', { style: 'margin-top: 6px;' }, [
          el('span', { class: 'mono', style: 'color: var(--warn)', text: '67% ' }),
          'top-1 correct when probability between 0.6 – 0.9',
        ]),
        el('div', { style: 'margin-top: 6px;' }, [
          el('span', { class: 'mono', style: 'color: var(--text-muted)', text: 'n=30 ' }),
          'incidents tracked, calibration updated weekly',
        ]),
      ]),
    ]);

    const grid = el('div', { class: 'diag-grid' }, [
      el('div', { class: 'card' }, [
        cardHead('Hypotheses · ranked by posterior probability'),
        hypList,
      ]),
      el('div', { class: 'diag-side' }, [
        probesCard,
        calibrationCard,
      ]),
    ]);

    container.append(obs, grid);
  }

  // -- Variation 4: Customer Triage — per-client cards --------------------
  function renderWarTriage(container) {
    const counts = D.clientImpact.reduce(
      (acc, c) => {
        if (c.status === S.CRIT) acc.crit++;
        if (c.status === S.WARN) acc.warn++;
        if (c.acknowledged) acc.ack++;
        return acc;
      },
      { crit: 0, warn: 0, ack: 0 }
    );

    const toolbar = el('section', { class: 'triage-toolbar' }, [
      el('div', { class: 'triage-counter' }, [
        el('span', { class: 'pill crit', text: `${counts.crit} critical` }),
        el('span', { class: 'pill warn', text: `${counts.warn} degraded` }),
        el('span', { class: 'pill muted', text: `${D.clientImpact.length - counts.ack} unacknowledged` }),
        el('span', { class: 'pill ok', text: `${counts.ack} notified` }),
      ]),
      el('div'), // spacer
      el('div', { class: 'triage-filters' }, [
        el('button', { class: 'triage-filter active', text: 'All' }),
        el('button', { class: 'triage-filter', text: 'T1 only' }),
        el('button', { class: 'triage-filter', text: 'NYC' }),
        el('button', { class: 'triage-filter', text: 'Unacknowledged' }),
      ]),
    ]);

    const grid = el('div', { class: 'triage-grid' });
    D.clientImpact.forEach((c) => {
      const card = el('div', { class: `client-card ${c.status} ${c.acknowledged ? 'acknowledged' : ''}` }, [
        el('div', { class: 'client-head' }, [
          el('div', {}, [
            el('div', { class: 'client-name', text: c.name }),
            el('div', { class: 'client-tags' }, [
              el('span', { class: `client-tag ${c.tier === 'T1' ? 't1' : ''}`, text: c.tier }),
              el('span', { class: 'client-tag', text: c.aum }),
              el('span', { class: 'client-tag', text: c.region }),
              el('span', { class: 'client-tag contact', text: c.contact }),
            ]),
          ]),
          c.acknowledged
            ? el('span', { class: 'ack-badge', text: `✓ ${c.ackBy}` })
            : el('span', { class: 'ack-badge', style: 'background: var(--crit-bg); color: var(--crit);', text: 'OPEN' }),
        ]),
        el('div', { class: 'client-section' }, [
          el('div', { class: 'label', text: 'What they see' }),
          el('div', { class: 'body', text: c.whatTheySee }),
        ]),
        el('div', { class: 'client-section' }, [
          el('div', { class: 'label', text: 'What we are doing' }),
          el('div', { class: 'body', text: c.whatWereDoing }),
        ]),
        el('div', { class: 'client-metrics' }, [
          metricCell(c.orders.queued, 'queued', c.orders.queued > 0 ? 'crit' : ''),
          metricCell(`${c.orders.ack_p95}ms`, 'ack p95', c.orders.ack_p95 > 200 ? 'crit' : c.orders.ack_p95 > 100 ? 'warn' : ''),
          metricCell(`${c.orders.error_pct}%`, 'errors', c.orders.error_pct > 5 ? 'crit' : c.orders.error_pct > 1 ? 'warn' : ''),
        ]),
        el('div', { class: 'client-actions' }, [
          el('button', { class: 'client-action primary', text: 'Draft comms' }),
          el('button', { class: 'client-action', text: 'Initiate failover' }),
          el('button', { class: 'client-action', text: 'Open bridge' }),
        ]),
      ]);
      grid.append(card);
    });

    container.append(toolbar, grid);
  }

  function metricCell(num, label, tone) {
    return el('div', { class: 'client-metric' }, [
      el('div', { class: `num ${tone || ''}`, text: String(num) }),
      el('span', { class: 'lbl', text: label }),
    ]);
  }

  // -- Variation 5: Trace — span-by-span waterfall ------------------------
  function renderWarTrace(container) {
    const t = D.trace;

    const head = el('section', { class: 'trace-head' }, [
      el('div', { class: 'trace-id-block' }, [
        el('span', { class: 'trace-id-label', text: 'Trace ID' }),
        el('span', { class: 'trace-id-val', text: t.trace_id }),
      ]),
      el('div', { class: 'trace-summary' }, [
        t.client + ' · total duration ',
        el('span', { class: 'crit', text: `${t.total_dur_ms}ms` }),
        ' ',
        el('span', { class: 'baseline', text: `(baseline: ${t.baseline_dur_ms}ms · ${(t.total_dur_ms / t.baseline_dur_ms).toFixed(1)}× slower)` }),
      ]),
      el('div', { class: 'trace-controls' }, [
        el('button', { class: 'trace-toggle active', text: 'Single trace' }),
        el('button', { class: 'trace-toggle', text: 'Aggregate (1k traces)' }),
        el('button', { class: 'trace-toggle', text: 'vs baseline' }),
      ]),
    ]);

    const wf = el('section', { class: 'trace-waterfall' });
    const max = t.total_dur_ms;
    const baseline = t.baseline_dur_ms;

    // Axis
    const axis = el('div', { class: 'trace-axis' }, [
      el('div', {}),
      el('div', { class: 'ticks' }, [
        el('span', { text: '0ms' }),
        el('span', { text: `${Math.round(max * 0.25)}ms` }),
        el('span', { text: `${Math.round(max * 0.5)}ms` }),
        el('span', { text: `${Math.round(max * 0.75)}ms` }),
        el('span', { text: `${max}ms` }),
      ]),
      el('div', { style: 'text-align: right;', text: 'duration' }),
    ]);
    wf.append(axis);

    t.spans.forEach((span) => {
      const left = (span.start / max) * 100;
      const width = (span.dur / max) * 100;
      const baselineLeft = (baseline / max) * 100;
      const tone = span.dur > baseline * 5 ? 'crit' : span.dur > baseline * 1.5 ? 'warn' : '';
      wf.append(
        el('div', { class: 'trace-row' }, [
          el('div', { class: 'trace-name', text: span.name }),
          el('div', { class: 'trace-bar-bg' }, [
            el('div', { class: 'trace-baseline-line', style: `left: ${baselineLeft}%` }),
            el('div', {
              class: `trace-bar ${span.status}`,
              style: `left: ${left}%; width: ${Math.max(width, 0.5)}%`,
            }),
          ]),
          el('div', { class: `trace-dur ${tone}`, text: `${span.dur}ms` }),
        ])
      );
      wf.append(
        el('div', { class: 'trace-note-row' }, [
          el('div'),
          el('div', { class: `trace-note ${span.status === S.CRIT ? 'crit' : span.status === S.WARN ? 'warn' : ''}`, text: span.note }),
        ])
      );
    });

    // Diagnosis narrative below
    const diag = el('div', {
      class: 'card',
      style: 'margin-top: 14px;',
    }, [
      cardHead('Why is this slow?'),
      el('div', { style: 'font-size: 13px; color: var(--text-soft); line-height: 1.7; padding: 4px;' }, [
        '5 of 7 spans are within SLO. Two spans on FW-NYC-PRIMARY are out of bounds:',
        el('br'),
        el('br'),
        el('strong', { style: 'color: var(--warn)', text: 'Policy eval (142ms, normally 4ms): ' }),
        'connection-table contention consistent with split-brain state.',
        el('br'),
        el('br'),
        el('strong', { style: 'color: var(--crit)', text: 'PRI → Trading hop (780ms, normally 12ms): ' }),
        '3 connection resets observed before retry #4 succeeded. Logs show "master conflict — connection refused" from FW-NYC-SEC.',
        el('br'),
        el('br'),
        el('span', { style: 'color: var(--accent)' }, [
          '→ Conclusion: ',
          el('strong', { text: 'fully consistent with hypothesis H1 (dual master).' }),
          ' Fix the firewall, fix the trace.',
        ]),
      ]),
    ]);

    container.append(head, wf, diag);
  }

  // -- Variation 6: Cost Burn — dollars per minute ------------------------
  function renderWarCost(container) {
    const c = D.cost;
    const fmt = (n) => '$' + n.toLocaleString('en-US');

    const ticker = el('section', { class: 'cost-ticker' }, [
      el('div', {}, [
        el('div', { class: 'cost-realized' }, [
          el('span', { class: 'currency', text: '$' }),
          el('span', { class: 'blink', text: c.realized.toLocaleString('en-US') }),
        ]),
        el('div', { class: 'cost-rate' }, [
          'Burning ',
          el('strong', { text: fmt(c.burnRatePerMin) }),
          ' per minute · started ', String(D.incident.durationMins), 'm ago',
        ]),
        el('div', { class: 'cost-rank', text: c.rankAllTime }),
      ]),
      el('div', { class: 'cost-context' }, [
        el('span', { class: 'cost-context-label', text: 'Cost if not mitigated in next hour' }),
        el('span', { class: 'cost-context-val', text: fmt(c.realized + c.burnRatePerMin * 60) }),
        el('span', { class: 'cost-context-label', style: 'margin-top: 6px;', text: '24h projection (worst-case)' }),
        el('span', { class: 'cost-context-val', style: 'color: var(--crit)', text: fmt(c.realized + c.burnRatePerMin * 1440) }),
      ]),
    ]);

    const byClientCard = el('div', { class: 'card' }, [
      cardHead('Cost by client tier'),
      (() => {
        const wrap = el('div', { class: 'cost-bar-list' });
        const max = Math.max(...c.byClient.map((x) => x.value));
        c.byClient.forEach((x) => {
          wrap.append(
            el('div', { class: 'cost-bar-row' }, [
              el('div', { class: 'name', text: x.name }),
              el('div', { class: 'bar' }, [
                el('div', { class: 'bar-fill', style: `width: ${(x.value / max) * 100}%` }),
              ]),
              el('div', { class: 'val', text: fmt(x.value) }),
            ])
          );
        });
        return wrap;
      })(),
    ]);

    const byServiceCard = el('div', { class: 'card' }, [
      cardHead('Cost by service'),
      (() => {
        const wrap = el('div', { class: 'cost-bar-list' });
        const max = Math.max(...c.byService.map((x) => x.value));
        c.byService.forEach((x) => {
          wrap.append(
            el('div', { class: 'cost-bar-row' }, [
              el('div', { class: 'name', text: x.name }),
              el('div', { class: 'bar' }, [
                el('div', { class: 'bar-fill', style: `width: ${(x.value / max) * 100}%` }),
              ]),
              el('div', { class: 'val', text: fmt(x.value) }),
            ])
          );
        });
        return wrap;
      })(),
    ]);

    const mitigationCard = el('div', { class: 'card' }, [
      cardHead('Mitigation ROI'),
      (() => {
        const wrap = el('div', { class: 'cost-mit-list' });
        c.mitigations.forEach((m) => {
          const cls = m.deltaPerMin < 0 ? 'save' : 'zero';
          const text = m.deltaPerMin === 0 ? '$0/min' : `${m.deltaPerMin > 0 ? '+' : ''}${m.deltaPerMin}/min`;
          wrap.append(
            el('div', { class: 'cost-mit-row' }, [
              el('div', {}, [
                el('div', { class: 'cost-mit-step', text: m.step }),
                el('div', { class: 'cost-mit-note', text: m.note }),
              ]),
              el('div', { class: `cost-mit-delta ${cls}`, text: text }),
            ])
          );
        });
        return wrap;
      })(),
    ]);

    const grid = el('div', { class: 'cost-grid' }, [byClientCard, byServiceCard, mitigationCard]);

    const historyCard = el('div', { class: 'card', style: 'margin-top: 14px;' }, [
      cardHead('In context · trailing 12 months'),
      (() => {
        const wrap = el('div');
        c.pastIncidents.forEach((p) => {
          wrap.append(
            el('div', { class: `cost-history-row ${p.current ? 'current' : ''}` }, [
              el('div', { class: 'cost-history-name', text: p.name }),
              el('div', { class: 'cost-history-cost', text: fmt(p.cost) }),
              el('div', { class: 'cost-history-dur', text: `${p.durMin}m` }),
            ])
          );
        });
        return wrap;
      })(),
    ]);

    container.append(ticker, grid, historyCard);
  }

  // -- Variation 7: Replay — scrubber + state at time --------------------
  function renderWarReplay(container) {
    const events = D.replayEvents;
    const minMin = events[0].atMin;
    const maxMin = events[events.length - 1].atMin;

    const banner = el('section', { class: 'replay-banner' }, [
      el('div', {}, [
        el('div', { class: 'replay-banner-title', text: 'Forensic replay · INC-2026-0508-014' }),
        el('div', { class: 'replay-banner-sub', text: 'Drag the scrubber to any moment. Every panel reflects state-as-of that time.' }),
      ]),
      el('div', { class: 'replay-time-display', id: 'replay-time-display' }),
    ]);

    // Scrubber wrap
    const scrubber = el('section', { class: 'replay-scrubber-wrap' });
    scrubber.append(
      el('div', { class: 'replay-controls' }, [
        el('button', { class: 'replay-btn', text: '◀◀ start',  onclick: () => setCursor(minMin) }),
        el('button', { class: 'replay-btn', text: '◀ prev',    onclick: () => stepCursor(-1) }),
        el('button', { class: 'replay-btn active', text: '▶ play' }),
        el('button', { class: 'replay-btn', text: '▶▶ next',   onclick: () => stepCursor(1) }),
        el('button', { class: 'replay-btn', text: 'jump to now', onclick: () => setCursor(maxMin) }),
        el('span', { class: 'replay-speed', text: '1× speed' }),
        el('span', { class: 'replay-spacer' }),
        el('button', { class: 'replay-btn', text: 'compare A↔B' }),
        el('button', { class: 'replay-btn', text: 'export clip' }),
        el('button', { class: 'replay-btn', text: '+ annotate' }),
      ])
    );

    const trackWrap = el('div', { class: 'replay-track-wrap' });
    const track = el('div', { class: 'replay-track' });

    events.forEach((ev) => {
      const left = ((ev.atMin - minMin) / (maxMin - minMin)) * 100;
      track.append(
        el('div', {
          class: `replay-event-mark ${ev.kind}`,
          style: `left: ${left}%`,
          title: ev.label,
        })
      );
    });

    const cursorEl = el('div', { class: 'replay-cursor' });
    track.append(cursorEl);

    const input = el('input', {
      type: 'range',
      class: 'replay-input',
      min: String(minMin),
      max: String(maxMin),
      step: '1',
      value: String(replayCursorMin),
      oninput: (e) => setCursor(Number(e.target.value)),
    });
    trackWrap.append(track, input);
    scrubber.append(trackWrap);

    scrubber.append(
      el('div', { class: 'replay-axis' }, [
        el('span', { text: events[0].time }),
        el('span', { text: events[Math.floor(events.length / 2)].time }),
        el('span', { text: events[events.length - 1].time + ' (now)' }),
      ])
    );

    // State at cursor
    const stateCard = el('div', { class: 'replay-state-card', id: 'replay-state-card' });
    const eventListCard = el('div', { class: 'replay-state-card' }, [
      cardHead('Event log'),
      (() => {
        const list = el('div', { class: 'replay-event-list', id: 'replay-event-list' });
        events.forEach((ev) => {
          list.append(
            el('div', {
              class: 'replay-event-row',
              'data-min': String(ev.atMin),
              onclick: () => setCursor(ev.atMin),
            }, [
              el('span', { class: 'time', text: ev.time }),
              el('div', {}, [
                el('span', { class: `kind-dot ${ev.kind}` }),
                el('span', { class: 'label', text: ev.label }),
              ]),
            ])
          );
        });
        return list;
      })(),
    ]);

    const stateGrid = el('div', { class: 'replay-state-grid' }, [stateCard, eventListCard]);

    function eventAtCursor(min) {
      // Find the most recent event at or before the cursor.
      let chosen = events[0];
      events.forEach((ev) => { if (ev.atMin <= min) chosen = ev; });
      return chosen;
    }

    function setCursor(min) {
      replayCursorMin = Math.max(minMin, Math.min(maxMin, min));
      input.value = String(replayCursorMin);
      const left = ((replayCursorMin - minMin) / (maxMin - minMin)) * 100;
      cursorEl.style.left = `${left}%`;
      const current = eventAtCursor(replayCursorMin);
      document.getElementById('replay-time-display').textContent = current.time + ' ET';
      // Update state card
      stateCard.replaceChildren(
        cardHead(`State at ${current.time}`),
        el('div', { style: 'font-size: 11px; color: var(--text-muted); padding: 0 4px 8px 4px;', text: current.label }),
        el('div', { class: 'replay-state-snapshot' }, [
          stateCell('FW-NYC-PRI',     current.state['fw-nyc-pri']),
          stateCell('FW-NYC-SEC',     current.state['fw-nyc-sec']),
          stateCell('Trading',        current.state['svc-trading']),
          stateCell('Order Routing',  current.state['svc-orders']),
        ])
      );
      // Highlight the current row in event log
      const list = document.getElementById('replay-event-list');
      if (list) {
        [...list.children].forEach((row) => {
          const m = Number(row.dataset.min);
          row.classList.toggle('current', m === current.atMin);
          row.classList.toggle('past', m < current.atMin);
        });
      }
    }

    function stepCursor(dir) {
      const idx = events.findIndex((ev) => ev.atMin >= replayCursorMin);
      const target = events[Math.max(0, Math.min(events.length - 1, idx + dir))];
      setCursor(target.atMin);
    }

    container.append(banner, scrubber, stateGrid);
    setCursor(replayCursorMin);
  }

  function stateCell(name, status) {
    const labels = { ok: 'HEALTHY', warn: 'DEGRADED', crit: 'IMPAIRED' };
    return el('div', { class: 'replay-state-cell' }, [
      el('div', { class: 'name', text: name }),
      el('div', { class: `val ${status}`, text: labels[status] || status.toUpperCase() }),
    ]);
  }

  // =========================================================================
  // 20 ADDITIONAL WAR ROOM VARIATIONS
  // =========================================================================

  // -- 8. AI Watchdog (Datadog Watchdog / Dynatrace Davis pattern) -----------
  function renderWarAI(container) {
    const a = D.aiNarrative;
    const banner = el('section', { class: 'ai-banner' }, [
      el('div', { class: 'ai-icon', text: 'AI' }),
      el('div', {}, [
        el('div', { style: 'font-weight: 600; color: var(--text); font-size: 14px;', text: a.title }),
        el('div', { style: 'color: var(--text-soft); font-size: 12px; margin-top: 4px;',
          text: 'Pattern matched against 482 historical incidents · 12 within similarity > 0.7' }),
      ]),
      el('div', { class: 'ai-confidence' }, [
        el('div', { class: 'num', text: `${(a.confidence * 100).toFixed(0)}%` }),
        el('div', { class: 'label', text: 'confidence' }),
      ]),
    ]);
    const summary = el('div', { class: 'ai-summary', text: a.summary });

    const recCard = el('div', { class: 'card' }, [
      cardHead('Recommended actions'),
      (() => {
        const wrap = el('div', { class: 'ai-rec-list' });
        a.recommended.forEach((r) => wrap.append(
          el('div', { class: 'ai-rec-row' }, [
            el('div', {}, [
              el('div', { style: 'color: var(--text); font-weight: 500;', text: r.action }),
              el('div', { class: 'ai-rec-rationale', text: r.rationale }),
            ]),
            el('div', { class: 'ai-rec-conf', text: `${(r.confidence * 100).toFixed(0)}%` }),
          ])
        ));
        return wrap;
      })(),
      el('div', { class: 'var-section-label', style: 'margin-top: 14px;', text: 'Explicitly NOT doing' }),
      (() => {
        const wrap = el('div', { class: 'ai-rec-list' });
        a.notDoing.forEach((r) => wrap.append(
          el('div', { class: 'ai-rec-row dont' }, [
            el('div', {}, [
              el('div', { style: 'color: var(--text-muted); font-weight: 500;', text: '✗ ' + r.action }),
              el('div', { class: 'ai-rec-rationale', text: r.rationale }),
            ]),
            el('div', { class: 'ai-rec-conf', text: '—' }),
          ])
        ));
        return wrap;
      })(),
    ]);

    const similarCard = el('div', { class: 'card' }, [
      cardHead('Similar past incidents'),
      ...a.similar.map((s) =>
        el('div', { class: 'ai-similar-row' }, [
          el('span', { class: 'ai-similar-id', text: s.id }),
          el('span', { class: 'ai-similar-sim', text: `${(s.similarity * 100).toFixed(0)}%` }),
          el('span', { style: 'color: var(--text-soft);', text: s.resolution }),
          el('span', { style: 'color: var(--text-muted); text-align: right;', text: `${s.durMin}m` }),
        ])
      ),
    ]);

    container.append(banner, summary, el('div', { class: 'var-grid-2' }, [recCard, similarCard]));
  }

  // -- 9. Service Mesh — animated Vizceral-style flow ----------------------
  function renderWarMesh(container) {
    const wrap = el('div', { class: 'mesh-wrap' });
    const W = 1200, H = 600;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet' });

    // Layered layout: clients | firewalls | dcs | services | outcomes
    const cols = [
      { x: 100, nodes: [
        { id: 't1na', label: 'T1 N.America', y: 120, status: S.CRIT },
        { id: 't1emea', label: 'T1 EMEA',     y: 220, status: S.OK },
        { id: 't1apac', label: 'T1 APAC',     y: 320, status: S.OK },
        { id: 'wealth', label: 'Wealth',      y: 420, status: S.OK },
        { id: 'insurer', label: 'Insurers',   y: 520, status: S.OK },
      ]},
      { x: 360, nodes: [
        { id: 'fw-nyc', label: 'FW-NYC',  y: 170, status: S.CRIT },
        { id: 'fw-lon', label: 'FW-LON',  y: 320, status: S.OK },
        { id: 'fw-tok', label: 'FW-TOK',  y: 470, status: S.OK },
      ]},
      { x: 620, nodes: [
        { id: 'dc-nyc', label: 'DC NYC', y: 170, status: S.WARN },
        { id: 'dc-lon', label: 'DC LON', y: 320, status: S.OK },
        { id: 'dc-tok', label: 'DC TOK', y: 470, status: S.OK },
      ]},
      { x: 880, nodes: [
        { id: 'trading',   label: 'Trading',   y: 130, status: S.CRIT },
        { id: 'orders',    label: 'Orders',    y: 230, status: S.CRIT },
        { id: 'risk',      label: 'Risk',      y: 330, status: S.OK },
        { id: 'reporting', label: 'Reporting', y: 430, status: S.WARN },
        { id: 'portfolio', label: 'Portfolio', y: 510, status: S.OK },
      ]},
      { x: 1100, nodes: [
        { id: 'ok',       label: 'Healthy',   y: 220, status: S.OK },
        { id: 'degraded', label: 'Degraded',  y: 320, status: S.WARN },
        { id: 'failed',   label: 'Failed',    y: 420, status: S.CRIT },
      ]},
    ];
    const all = {};
    cols.forEach((c) => c.nodes.forEach((n) => { n.x = c.x; all[n.id] = n; }));

    const edges = [
      // Clients → firewalls
      ['t1na','fw-nyc',S.CRIT], ['t1emea','fw-lon',S.OK], ['t1apac','fw-tok',S.OK],
      ['wealth','fw-lon',S.OK], ['insurer','fw-nyc',S.WARN],
      // Firewalls → DCs
      ['fw-nyc','dc-nyc',S.CRIT], ['fw-lon','dc-lon',S.OK], ['fw-tok','dc-tok',S.OK],
      // DCs → services
      ['dc-nyc','trading',S.CRIT], ['dc-nyc','orders',S.CRIT], ['dc-nyc','reporting',S.WARN],
      ['dc-lon','trading',S.OK], ['dc-lon','risk',S.OK], ['dc-lon','portfolio',S.OK],
      ['dc-tok','trading',S.OK], ['dc-tok','risk',S.OK],
      // Services → outcomes
      ['trading','failed',S.CRIT], ['trading','degraded',S.WARN], ['trading','ok',S.OK],
      ['orders','failed',S.CRIT], ['orders','ok',S.OK],
      ['risk','ok',S.OK], ['portfolio','ok',S.OK],
      ['reporting','degraded',S.WARN], ['reporting','ok',S.OK],
    ];

    edges.forEach(([a, b, status]) => {
      const A = all[a], B = all[b];
      if (!A || !B) return;
      const cx1 = A.x + 80, cx2 = B.x - 30;
      const path = `M ${A.x + 18} ${A.y} C ${cx1} ${A.y}, ${cx2} ${B.y}, ${B.x - 18} ${B.y}`;
      svg.append(el('path', { d: path, class: `mesh-edge ${status}` }));
      // Animated particle layer
      svg.append(el('path', { d: path, class: `mesh-edge mesh-particle ${status}`, 'stroke-width': 3 }));
    });

    Object.values(all).forEach((n) => {
      svg.append(el('circle', { cx: n.x, cy: n.y, r: 14, class: `mesh-node-circle ${n.status}`, 'stroke-width': 2 }));
      svg.append(el('text', { x: n.x, y: n.y - 22, class: 'node-label', 'text-anchor': 'middle', text: n.label }));
    });

    wrap.append(svg);
    wrap.append(el('div', { class: 'mesh-legend' }, [
      el('div', {}, [el('span', { class: 'dot ok' }), ' healthy traffic']),
      el('div', { style: 'margin-top: 4px' }, [el('span', { class: 'dot warn' }), ' degraded']),
      el('div', { style: 'margin-top: 4px' }, [el('span', { class: 'dot crit' }), ' failing']),
      el('div', { style: 'margin-top: 6px; color: var(--text-faint)', text: 'Particle speed scales with degradation' }),
    ]));
    container.append(wrap);
  }

  // -- 19. Sankey flow ------------------------------------------------------
  function renderWarSankey(container) {
    const wrap = el('div', { class: 'sankey-wrap' });
    const W = 1200, H = 520;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet' });

    const layers = D.sankey.layers;
    const flows = D.sankey.flows;
    const layerXs = [80, 360, 640, 1100];
    const nodeWidth = 14;

    // Layout: each layer's total height proportional to total value; each node sized by value.
    const layerLayouts = layers.map((nodes, i) => {
      const total = nodes.reduce((s, n) => s + n.value, 0);
      const padding = 12;
      const usableH = H - padding * (nodes.length + 1);
      let y = padding;
      const out = nodes.map((n) => {
        const h = Math.max(20, (n.value / total) * usableH);
        const node = { ...n, x: layerXs[i], y, h, layer: i };
        y += h + padding;
        return node;
      });
      return out;
    });
    const allNodes = {};
    layerLayouts.forEach((arr) => arr.forEach((n) => { allNodes[n.id] = n; }));

    // Track in/out cursor offsets per node so multiple flows stack
    const cursorOut = {}, cursorIn = {};
    Object.values(allNodes).forEach((n) => { cursorOut[n.id] = 0; cursorIn[n.id] = 0; });

    flows.forEach((f) => {
      const a = allNodes[f.from], b = allNodes[f.to];
      if (!a || !b) return;
      // Each flow's thickness proportional to its value relative to the source's outflow.
      const aTotalOut = flows.filter((x) => x.from === f.from).reduce((s, x) => s + x.value, 0);
      const bTotalIn  = flows.filter((x) => x.to === f.to).reduce((s, x) => s + x.value, 0);
      const aH = (f.value / aTotalOut) * a.h;
      const bH = (f.value / bTotalIn) * b.h;
      const ay0 = a.y + cursorOut[f.from]; const ay1 = ay0 + aH;
      const by0 = b.y + cursorIn[f.to];    const by1 = by0 + bH;
      cursorOut[f.from] += aH;
      cursorIn[f.to]    += bH;
      const x1 = a.x + nodeWidth, x2 = b.x;
      const cp1 = (x1 + x2) / 2;
      const path =
        `M ${x1} ${ay0} C ${cp1} ${ay0}, ${cp1} ${by0}, ${x2} ${by0}` +
        ` L ${x2} ${by1} C ${cp1} ${by1}, ${cp1} ${ay1}, ${x1} ${ay1} Z`;
      svg.append(el('path', { d: path, class: `sankey-flow ${f.status}` }));
    });

    Object.values(allNodes).forEach((n) => {
      svg.append(el('rect', { x: n.x, y: n.y, width: nodeWidth, height: n.h, class: `sankey-node-rect ${n.status}` }));
      const labelX = n.layer === 0 ? n.x - 6 : n.x + nodeWidth + 6;
      const anchor = n.layer === 0 ? 'end' : 'start';
      svg.append(el('text', { x: labelX, y: n.y + n.h / 2 + 4, class: 'sankey-node-label', 'text-anchor': anchor, text: `${n.label}` }));
      svg.append(el('text', { x: labelX, y: n.y + n.h / 2 + 18, class: 'sankey-node-label', 'text-anchor': anchor, style: 'fill: var(--text-muted); font-size: 10px;', text: `${n.value}` }));
    });

    wrap.append(svg);

    const legend = el('div', { class: 'tree-legend', style: 'margin-top: 10px;' }, [
      legendItem('ok', 'healthy delivery'),
      legendItem('warn', 'degraded'),
      legendItem('crit', 'failed'),
      el('span', { class: 'muted', text: '· width ∝ client volume · click any flow to expand affected accounts' }),
    ]);
    container.append(wrap, legend);
  }

  // -- 6. AWS Health-style services × regions grid -------------------------
  function renderWarHealthGrid(container) {
    const g = D.healthGrid;
    const wrap = el('div', { class: 'health-grid-wrap' });
    const cols = `220px repeat(${g.regions.length}, 1fr)`;

    const table = el('div', { class: 'health-grid-table', style: `display: grid; grid-template-columns: ${cols}; gap: 4px;` });
    table.append(el('div', { class: 'health-grid-table th row-header', style: 'background: var(--bg-elev-2); padding: 10px; border-radius: var(--r-sm); color: var(--text-muted); font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;', text: 'Service' }));
    g.regions.forEach((r) => table.append(el('div', { style: 'background: var(--bg-elev-2); padding: 10px; border-radius: var(--r-sm); color: var(--text-muted); font-family: var(--mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; text-align: center;', text: r })));

    g.services.forEach((svc) => {
      table.append(el('div', { class: 'health-grid-table row-name', style: 'background: var(--bg-elev-2); padding: 14px 14px; border-radius: var(--r-sm); color: var(--text); font-weight: 500;', text: svc.name }));
      svc.statuses.forEach((status) => {
        const labels = { ok: 'OK', warn: 'DEGRADED', crit: 'IMPAIRED' };
        table.append(el('div', { class: `health-grid-cell ${status}`, text: labels[status] || status.toUpperCase() }));
      });
    });
    wrap.append(table);

    const legend = el('div', { class: 'tree-legend', style: 'margin-top: 14px; justify-content: center;' }, [
      legendItem('ok', 'Operational'),
      legendItem('warn', 'Degraded performance'),
      legendItem('crit', 'Service disruption'),
      el('span', { class: 'muted', text: '· hover any cell for detail · pattern: AWS Service Health Dashboard' }),
    ]);
    container.append(wrap, legend);
  }

  // -- 7. NOC video wall — 4 huge tiles, TV-distance readable --------------
  function renderWarNOC(container) {
    const wall = el('div', { class: 'noc-wall' });
    wall.append(
      el('div', { class: 'noc-quad crit' }, [
        el('div', { class: 'noc-quad-label', text: 'Aladdin Status' }),
        el('div', { class: 'noc-quad-mega crit', text: 'P0' }),
        el('div', { class: 'noc-quad-sub', text: 'NYC perimeter · dual firewall master · 36m' }),
      ]),
      el('div', { class: 'noc-quad crit' }, [
        el('div', { class: 'noc-quad-label', text: 'Clients impacted' }),
        el('div', { class: 'noc-quad-mega crit', text: '14' }),
        el('div', { class: 'noc-quad-sub', text: 'all NYC tier-1 · trading + order routing' }),
      ]),
      el('div', { class: 'noc-quad warn' }, [
        el('div', { class: 'noc-quad-label', text: 'Cost burn' }),
        el('div', { class: 'noc-quad-mega warn', text: '$284K' }),
        el('div', { class: 'noc-quad-sub', text: '$4,800/min · 4th highest of past 12mo' }),
      ]),
      el('div', { class: 'noc-quad' }, [
        el('div', { class: 'noc-quad-label', text: 'ETA to mitigation' }),
        el('div', { class: 'noc-quad-mega', text: '8m' }),
        el('div', { class: 'noc-quad-sub', text: 'medium confidence · SEC demoted, monitoring' }),
      ])
    );
    container.append(wall);
  }

  // -- 5. Atlassian Statuspage-style external view -------------------------
  function renderWarStatusPage(container) {
    const wrap = el('div', { class: 'statuspage-wrap' });
    const banner = el('section', { class: 'statuspage-banner' }, [
      el('span', { class: 'dot crit', style: 'width: 24px; height: 24px;' }),
      el('div', {}, [
        el('h2', { text: 'Some systems are experiencing issues' }),
        el('div', { class: 'sub', text: 'We\'re investigating elevated latency in NYC-region order routing. Other regions and services are operating normally. Last updated 4 minutes ago.' }),
      ]),
    ]);

    const compsCard = el('div', { class: 'card', style: 'padding: 0; background: var(--bg-elev-1);' });
    compsCard.append(el('div', { style: 'padding: 14px 18px; border-bottom: 1px solid var(--line); font-weight: 600; font-size: 14px;', text: 'System status' }));
    D.statusComponents.forEach((c) => {
      const labels = { op: 'Operational', partial: 'Partial outage', major: 'Major outage' };
      compsCard.append(
        el('div', { class: 'statuspage-component-row' }, [
          el('span', { style: 'color: var(--text); font-weight: 500;', text: c.name }),
          el('span', { class: `statuspage-status-label ${c.status}`, text: labels[c.status] || c.status }),
        ])
      );
    });

    const histCard = el('div', { class: 'card', style: 'margin-top: 14px;' }, [
      cardHead('Past 10 days'),
      (() => {
        const wrap2 = el('div', { class: 'statuspage-history' });
        D.statusHistory.forEach((d) => {
          const cls = d.incidents === 0 ? '' : (d.summary.includes('P0') || d.summary.includes('P1') ? 'crit' : 'warn');
          wrap2.append(el('div', { class: `statuspage-history-cell ${cls}`, title: `${d.date} · ${d.summary}` }));
        });
        return wrap2;
      })(),
      el('div', { style: 'display: flex; justify-content: space-between; font-family: var(--mono); font-size: 10px; color: var(--text-muted); margin-top: 6px;' }, [
        el('span', { text: '10 days ago' }),
        el('span', { text: 'today' }),
      ]),
    ]);

    wrap.append(banner, compsCard, histCard);
    container.append(wrap);
  }

  // -- 16. Trade desk floor --------------------------------------------------
  function renderWarDesks(container) {
    const grid = el('div', { class: 'desk-grid' });
    D.tradingDesks.forEach((d) => {
      const card = el('div', { class: `desk-card ${d.status}` }, [
        el('div', { class: 'desk-name', text: d.desk }),
        el('div', { class: 'desk-stats' }, [
          el('div', { class: 'desk-stat' }, [
            el('div', { class: 'num', text: String(d.traders) }),
            el('div', { class: 'lbl', text: 'traders' }),
          ]),
          el('div', { class: 'desk-stat' }, [
            el('div', { class: `num ${d.queued > 0 ? 'crit' : ''}`, text: String(d.queued) }),
            el('div', { class: 'lbl', text: 'queued' }),
          ]),
          el('div', { class: 'desk-stat' }, [
            el('div', { class: `num ${d.latencyMs > 200 ? 'crit' : d.latencyMs > 100 ? 'warn' : ''}`, text: `${d.latencyMs}` }),
            el('div', { class: 'lbl', text: 'p95 ms' }),
          ]),
        ]),
        d.note ? el('div', { class: 'desk-note', text: d.note }) : null,
      ]);
      grid.append(card);
    });
    container.append(grid);
  }

  // -- 17. Geographic impact -------------------------------------------------
  function renderWarGeo(container) {
    const wrap = el('div', { class: 'geo-impact-wrap' });
    const map = el('div', { class: 'geo-mega-map' });
    const W = 1000, H = 500;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet' });
    for (let lat = 100; lat < 500; lat += 100) svg.append(el('line', { x1: 0, y1: lat, x2: W, y2: lat, stroke: '#1e2640', 'stroke-dasharray': '2 6' }));
    for (let lon = 100; lon < 1000; lon += 100) svg.append(el('line', { x1: lon, y1: 0, x2: lon, y2: H, stroke: '#1e2640', 'stroke-dasharray': '2 6' }));

    // Failover lines from NYC to LON (red) and NYC to SYD (red)
    const nyc = D.geoImpact.find((g) => g.region === 'NYC');
    const lon = D.geoImpact.find((g) => g.region === 'LON');
    const tok = D.geoImpact.find((g) => g.region === 'TOK');
    const link = (a, b, color) => {
      const x1 = (a.x / 100) * W, y1 = (a.y / 100) * H;
      const x2 = (b.x / 100) * W, y2 = (b.y / 100) * H;
      const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - 60;
      svg.append(el('path', { d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`, stroke: color, 'stroke-width': 2, fill: 'none', opacity: 0.8 }));
    };
    link(nyc, lon, '#ef4444');
    link(lon, tok, '#22c55e');
    map.append(svg);

    D.geoImpact.forEach((g) => {
      const pin = el('div', { class: `geo-pin ${g.status}`, style: `left: ${g.x}%; top: ${g.y}%;` }, [
        el('div', { class: 'ring' }),
        el('div', { class: 'label', text: g.label }),
      ]);
      map.append(pin);
    });

    const list = el('div', { class: 'geo-region-list' });
    D.geoImpact.forEach((g) => {
      list.append(
        el('div', { class: `geo-region-row ${g.status}` }, [
          el('div', { class: 'geo-region-name', text: g.region }),
          el('div', { class: 'geo-region-num' }, [
            el('div', { class: `top ${g.affected > 0 ? 'crit' : ''}`, text: g.affected > 0 ? `${g.affected} clients impacted` : `${g.healthy} clients healthy` }),
            el('div', { class: 'bot', text: `latency p95: ${g.latencyMs}ms` }),
          ]),
          el('span', { class: `dot ${g.status}` }),
        ])
      );
    });

    wrap.append(map, list);
    container.append(wrap);
  }

  // -- 9. Pager / On-call view ----------------------------------------------
  function renderWarPager(container) {
    const onCallCard = el('div', { class: 'card' }, [
      cardHead('On-call now'),
      (() => {
        const wrap = el('div', { class: 'pager-onCall' });
        D.pagerView.onCall.forEach((p) => {
          wrap.append(
            el('div', { class: 'pager-row' }, [
              el('div', { class: 'role-avatar', text: p.avatar }),
              el('div', { class: 'pager-team' }, [p.team, el('span', { class: 'esc', text: `escalates after ${p.escalates}` })]),
              el('div', { class: 'pager-person', text: p.person }),
              el('div', { class: 'pager-phone', text: p.phone }),
            ])
          );
        });
        return wrap;
      })(),
    ]);

    const pageHistCard = el('div', { class: 'card' }, [
      cardHead('Pages sent · this incident'),
      (() => {
        const wrap = el('div');
        D.pagerView.pages.forEach((p) => {
          wrap.append(
            el('div', { class: 'pager-page-row' }, [
              el('div', { class: 'pager-page-time', text: p.time }),
              el('div', { class: 'pager-page-target', text: p.target }),
              el('div', { class: 'pager-page-ack', text: `✓ ${p.ackBy} · ${p.ackIn}` }),
            ])
          );
        });
        return wrap;
      })(),
    ]);

    const policyCard = el('div', { class: 'card' }, [
      cardHead('Escalation policy · "Network split-brain"'),
      (() => {
        const wrap = el('div', { class: 'pager-policy' });
        D.pagerView.policy.forEach((s, i) =>
          wrap.append(el('div', { class: 'pager-policy-step', text: `${i + 1}. ${s}` }))
        );
        return wrap;
      })(),
    ]);

    container.append(el('div', { class: 'var-grid-2' }, [onCallCard, pageHistCard]));
    container.append(el('div', { style: 'margin-top: 14px;' }, [policyCard]));
  }

  // -- 11. Stakeholder comms ----------------------------------------------
  function renderWarComms(container) {
    const wrap = el('div', { class: 'comms-wrap' });
    D.commsAudiences.forEach((c) => {
      wrap.append(
        el('div', { class: 'comms-card' }, [
          el('div', { class: 'comms-head' }, [
            el('div', { class: 'comms-name', text: c.name }),
            el('span', { class: `comms-status-pill ${c.status}`, text: c.status }),
          ]),
          el('div', { class: 'comms-meta', text: `v${c.version} · ${c.sentAt ? 'sent ' + c.sentAt : 'unsent'}` }),
          el('div', { class: 'comms-draft', text: c.draft }),
          el('div', { class: 'comms-actions' }, [
            el('button', { class: 'comms-action primary', text: c.status === 'draft' ? 'Send' : 'Update' }),
            el('button', { class: 'comms-action', text: 'History' }),
            el('button', { class: 'comms-action', text: 'Diff' }),
          ]),
        ])
      );
    });
    container.append(wrap);
  }

  // -- 14. Compliance ------------------------------------------------------
  function renderWarCompliance(container) {
    const reportCard = el('div', { class: 'card' }, [
      cardHead('Reportable events'),
      (() => {
        const wrap = el('div');
        D.compliance.reportable.forEach((r) => {
          const tone = r.severity;
          wrap.append(
            el('div', { class: `compliance-row ${tone}` }, [
              el('div', { class: 'compliance-framework', text: r.framework }),
              el('div', { class: 'compliance-article', text: r.article }),
              el('div', { class: 'compliance-what', text: r.what }),
              el('div', { class: `compliance-status-pill ${r.status}`, text: r.status }),
              el('div', { class: 'compliance-deadline', text: r.deadline }),
            ])
          );
        });
        return wrap;
      })(),
    ]);

    const evidenceCard = el('div', { class: 'card', style: 'margin-top: 14px;' }, [
      cardHead('Evidence captured · 7-year retention'),
      (() => {
        const wrap = el('div');
        D.compliance.evidence.forEach((e) => {
          wrap.append(
            el('div', { class: 'evidence-row' }, [
              el('span', { class: 'evidence-check', text: e.captured ? '✓' : '✗' }),
              el('span', { class: 'evidence-name', text: e.item }),
              el('span', { class: 'evidence-retention', text: e.retention }),
            ])
          );
        });
        return wrap;
      })(),
    ]);

    container.append(reportCard, evidenceCard);
  }

  // -- 15. Risk officer view ------------------------------------------------
  function renderWarRisk(container) {
    const r = D.riskView;
    const megaGrid = el('div', { class: 'risk-mega-grid' }, [
      riskStat('Value at Risk',         r.varAtRisk,         'crit'),
      riskStat('Open Positions',         String(r.positionsHeld), ''),
      riskStat('Unhedged Exposure',      r.unhedgedExposure,  'warn'),
      riskStat('Market Data Lag',         r.marketDataLag,     'warn'),
    ]);

    const assetCard = el('div', { class: 'card' }, [
      cardHead('Exposure by asset class'),
      (() => {
        const wrap = el('div');
        r.byAssetClass.forEach((a) => {
          wrap.append(
            el('div', { class: `risk-asset-row ${a.risk}` }, [
              el('span', { class: 'risk-asset-name', text: a.asset }),
              el('span', { class: 'risk-asset-num', text: String(a.positions) }),
              el('span', { class: 'risk-asset-num', text: a.exposure }),
              el('span', { class: `dot ${a.risk}` }),
            ])
          );
        });
        return wrap;
      })(),
    ]);

    const contextCard = el('div', { class: 'card' }, [
      cardHead('Market context · incident window'),
      (() => {
        const list = el('ul', { class: 'risk-context-list' });
        r.marketContext.forEach((c) => list.append(el('li', { text: c })));
        return list;
      })(),
    ]);

    container.append(megaGrid, el('div', { class: 'var-grid-2' }, [assetCard, contextCard]));
  }
  function riskStat(label, value, tone) {
    return el('div', { class: 'risk-stat' }, [
      el('div', { class: 'label', text: label }),
      el('div', { class: `value ${tone}`, text: value }),
    ]);
  }

  // -- 1. SLO Burn rate ----------------------------------------------------
  function renderWarSLO(container) {
    const banner = el('section', { class: 'cmd-action-bar' }, [
      el('div', {}, [
        el('div', { class: 'cmd-action-label', text: 'Platform error budget posture · Q2 2026' }),
        el('div', { class: 'cmd-action-text', text: '3 services burning > 5× budget · 2 services exhaust within 8h at current rate' }),
      ]),
      el('div'),
      el('div', { style: 'font-family: var(--mono); font-size: 22px; color: var(--crit); font-weight: 700;', text: '14.2×' }),
    ]);

    const wrap = el('div');
    D.sloServices.forEach((s) => {
      const tone = s.burnRate > 5 ? 'crit' : s.burnRate > 1 ? 'warn' : 'ok';
      const tierTone = s.tier;
      wrap.append(
        el('div', { class: `slo-row ${tone}` }, [
          el('div', { class: 'slo-name' }, [s.name, el('span', { class: 'slo', text: s.slo })]),
          el('div', {}, [
            el('div', { class: `slo-burn-num ${tone}`, text: `${s.burnRate.toFixed(1)}×` }),
            el('div', { class: 'slo-burn-label', text: 'burn rate' }),
          ]),
          el('div', { class: 'slo-budget-bar' }, [
            el('div', { class: 'slo-budget-fill', style: `width: ${s.budgetPct}%` }),
            el('div', { class: 'slo-budget-pace', style: 'left: 38%' }),
          ]),
          el('div', { class: `slo-eta ${tone}` }, [
            'exhausts in ',
            el('strong', { text: s.exhaustsIn }),
          ]),
          el('span', { class: `slo-tier-pill pill-${tierTone}`, text: tierTone }),
        ])
      );
    });
    container.append(banner, wrap);
  }

  // -- 2. Golden signals ----------------------------------------------------
  function renderWarGolden(container) {
    const wrap = el('div', { class: 'golden-grid' });
    D.goldenSignals.forEach((g) => {
      const latencyTone = g.latency.p95 > g.latency.slo * 5 ? 'crit' : g.latency.p95 > g.latency.slo ? 'warn' : 'ok';
      const errTone     = g.errors.pct > g.errors.slo * 5 ? 'crit' : g.errors.pct > g.errors.slo ? 'warn' : 'ok';
      const trafficTone = g.traffic.rps < g.traffic.baseline * 0.7 ? 'warn' : 'ok';
      const satTone     = g.saturation.pct > g.saturation.slo ? 'warn' : 'ok';
      wrap.append(
        el('div', { class: `golden-card ${g.status}` }, [
          el('div', { class: 'golden-name', text: g.name }),
          el('div', { class: 'golden-quad' }, [
            el('div', { class: 'golden-quad-cell' }, [
              el('div', { class: 'label', text: 'Latency' }),
              el('div', { class: `val ${latencyTone}`, text: `${g.latency.p95}ms` }),
              el('div', { class: 'sub', text: `p50 ${g.latency.p50} / p99 ${g.latency.p99} · SLO < ${g.latency.slo}` }),
            ]),
            el('div', { class: 'golden-quad-cell' }, [
              el('div', { class: 'label', text: 'Traffic' }),
              el('div', { class: `val ${trafficTone}`, text: `${(g.traffic.rps / 1000).toFixed(1)}k rps` }),
              el('div', { class: 'sub', text: `baseline ${(g.traffic.baseline / 1000).toFixed(1)}k` }),
            ]),
            el('div', { class: 'golden-quad-cell' }, [
              el('div', { class: 'label', text: 'Errors' }),
              el('div', { class: `val ${errTone}`, text: `${g.errors.pct}%` }),
              el('div', { class: 'sub', text: `SLO < ${g.errors.slo}%` }),
            ]),
            el('div', { class: 'golden-quad-cell' }, [
              el('div', { class: 'label', text: 'Saturation' }),
              el('div', { class: `val ${satTone}`, text: `${g.saturation.pct}%` }),
              el('div', { class: 'sub', text: `limit ${g.saturation.slo}%` }),
            ]),
          ]),
        ])
      );
    });
    container.append(wrap);
  }

  // -- 3. RED + USE ---------------------------------------------------------
  function renderWarRED(container) {
    const redCard = el('div', { class: 'card' }, [
      cardHead('RED method · Tom Wilkie / Grafana'),
      (() => {
        const t = el('table', { class: 'tablet' });
        const head = el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Service' }), el('th', { text: 'Rate' }), el('th', { text: 'Errors' }), el('th', { text: 'Duration p99' }), el('th', { text: '' }),
        ])]);
        const body = el('tbody');
        D.redMethod.forEach((r) => {
          body.append(el('tr', {}, [
            el('td', { text: r.service }),
            el('td', { class: 'num', text: r.rate }),
            el('td', { class: `num ${r.status}`, text: r.errors }),
            el('td', { class: `num ${r.status}`, text: r.dur_p99 }),
            el('td', {}, [el('span', { class: `pill pill-${r.status}`, text: r.status })]),
          ]));
        });
        t.append(head, body);
        return t;
      })(),
    ]);

    const useCard = el('div', { class: 'card' }, [
      cardHead('USE method · Brendan Gregg'),
      (() => {
        const t = el('table', { class: 'tablet' });
        const head = el('thead', {}, [el('tr', {}, [
          el('th', { text: 'Resource' }), el('th', { text: 'Util %' }), el('th', { text: 'Saturation' }), el('th', { text: 'Errors' }), el('th', { text: '' }),
        ])]);
        const body = el('tbody');
        D.useMethod.forEach((u) => {
          body.append(el('tr', {}, [
            el('td', { text: u.resource }),
            el('td', { class: `num ${u.util > 90 ? 'crit' : u.util > 75 ? 'warn' : ''}`, text: `${u.util}%` }),
            el('td', { class: `num ${u.sat === 'critical' ? 'crit' : u.sat === 'high' ? 'warn' : ''}`, text: u.sat }),
            el('td', { class: `num ${u.errors > 0 ? 'crit' : ''}`, text: String(u.errors) }),
            el('td', {}, [el('span', { class: `pill pill-${u.status}`, text: u.status })]),
          ]));
        });
        t.append(head, body);
        return t;
      })(),
    ]);

    container.append(el('div', { class: 'var-grid-2' }, [redCard, useCard]));
  }

  // -- 18. Latency 2D heatmap ----------------------------------------------
  function renderWarHeatmap(container) {
    const h = D.latencyHeatmap;
    const wrap = el('div', { class: 'heatmap-2d-wrap' });
    wrap.append(el('div', { class: 'var-section-label', text: 'Latency distribution · last 30 minutes · NYC trading' }));

    const heat = el('div', { class: 'heatmap-2d' });
    h.matrix.forEach((row, l) => {
      heat.append(el('div', { class: 'heatmap-2d-rowlabel', text: h.latencyLabels[l] }));
      const rowEl = el('div', { class: 'heatmap-2d-row', style: `grid-template-columns: repeat(${row.length}, 1fr);` });
      row.forEach((density) => {
        const intensity = Math.min(1, density);
        const isHigh = l < 6; // top half = high latency
        const color = isHigh
          ? `rgba(239, 68, 68, ${intensity})`
          : `rgba(34, 197, 94, ${intensity * 0.8})`;
        rowEl.append(el('div', { class: 'heatmap-2d-cell', style: `background: ${color};`, title: `density ${density.toFixed(2)}` }));
      });
      heat.append(rowEl);
    });
    wrap.append(heat);

    wrap.append(el('div', { class: 'heatmap-2d-axis' }, [
      el('div'),
      el('div', { class: 'ticks' }, h.timeLabels.map((t) => el('span', { text: t }))),
    ]));

    const incidentLeftPct = (22 / 30) * 100;
    wrap.append(
      el('div', { class: 'heatmap-incident-marker' }, [
        el('div', { class: 'marker', style: `left: calc(110px + 10px + (100% - 120px) * ${incidentLeftPct / 100});`, text: ' ← incident starts (08:14 ET)' }),
      ])
    );

    container.append(wrap);
  }

  // -- 12. Capacity forecast -----------------------------------------------
  function renderWarCapacity(container) {
    D.capacityForecast.forEach((c) => {
      const W = 600, H = 50;
      const all = c.history.concat(c.forecast);
      const max = Math.max(c.limit, ...all);
      const points = all.map((v, i) => {
        const x = (i / (all.length - 1)) * W;
        const y = H - (v / max) * (H - 4) - 2;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });
      const histPts = points.slice(0, c.history.length).join(' ');
      const fcPts = points.slice(c.history.length - 1).join(' ');
      const limitY = H - (c.limit / max) * (H - 4) - 2;
      const svg = el('svg', { class: 'cap-chart', viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none' });
      svg.append(el('line', { x1: 0, y1: limitY, x2: W, y2: limitY, stroke: '#ef4444', 'stroke-width': '1', 'stroke-dasharray': '4 4', opacity: '0.6' }));
      svg.append(el('polyline', { points: histPts, fill: 'none', stroke: '#60a5fa', 'stroke-width': '1.5' }));
      svg.append(el('polyline', { points: fcPts, fill: 'none', stroke: '#f59e0b', 'stroke-width': '1.5', 'stroke-dasharray': '3 3' }));

      container.append(
        el('div', { class: `cap-row ${c.risk}` }, [
          el('div', { class: 'cap-head' }, [
            el('div', { class: 'cap-name', text: c.resource }),
            el('div', { class: `cap-current ${c.risk}` }, [`${c.current}`, el('span', { style: 'font-size: 11px; color: var(--text-muted); margin-left: 4px;', text: `/ ${c.limit}` })]),
            el('div', { class: `cap-eta ${c.risk}` }, ['will hit limit at ', el('strong', { text: c.willHitAt })]),
          ]),
          svg,
        ])
      );
    });
    container.append(el('div', { class: 'tree-legend', style: 'margin-top: 14px;' }, [
      el('span', { class: 'item' }, [el('span', { style: 'display: inline-block; width: 18px; height: 2px; background: var(--accent);' }), el('span', { text: 'observed' })]),
      el('span', { class: 'item' }, [el('span', { style: 'display: inline-block; width: 18px; height: 2px; background: var(--warn); border-bottom: 1px dashed' }), el('span', { text: 'forecast' })]),
      el('span', { class: 'item' }, [el('span', { style: 'display: inline-block; width: 18px; height: 1px; border-top: 1px dashed var(--crit);' }), el('span', { text: 'limit' })]),
    ]));
  }

  // -- 13. Change correlation ---------------------------------------------
  function renderWarChange(container) {
    const card = el('div', { class: 'card' }, [
      cardHead('Recent changes · sorted by correlation with current incident'),
      (() => {
        const t = el('table', { class: 'change-table' });
        const head = el('thead', {}, [el('tr', {}, [
          el('th', { text: 'When' }), el('th', { text: 'Type' }), el('th', { text: 'Change' }), el('th', { text: 'Author' }), el('th', { text: 'Correlation' }),
        ])]);
        const body = el('tbody');
        const sorted = [...D.recentChanges].sort((a, b) => b.correlation - a.correlation);
        sorted.forEach((c) => {
          body.append(el('tr', {}, [
            el('td', { class: 'change-time', text: c.time }),
            el('td', {}, [el('span', { class: `change-type-pill ${c.type}`, text: c.type })]),
            el('td', { text: c.name, style: 'color: var(--text);' }),
            el('td', { text: c.author }),
            el('td', {}, [
              el('span', { class: 'change-corr-bar' }, [
                el('span', { class: 'change-corr-bar-fill', style: `width: ${c.correlation * 100}%; display: block;` }),
              ]),
              el('span', { class: 'change-corr-num', text: `${(c.correlation * 100).toFixed(0)}%` }),
            ]),
          ]));
        });
        t.append(head, body);
        return t;
      })(),
    ]);
    const note = el('div', { class: 'card', style: 'margin-top: 14px;' }, [
      cardHead('Diagnostic note'),
      el('div', { style: 'font-size: 12px; color: var(--text-soft); line-height: 1.65; padding: 4px;' }, [
        'No high-correlation change identified.',
        el('br'), el('br'),
        'The vendor advisory acknowledged at 08:12 (',
        el('span', { style: 'color: var(--warn); font-family: var(--mono);', text: 'corr 0.42' }),
        ') is the strongest candidate but no action was taken.',
        el('br'), el('br'),
        'Combined with the absence of recent FW config changes, this',
        ' suggests the trigger is environmental (load, firmware bug) rather than a deploy regression.',
      ]),
    ]);
    container.append(card, note);
  }

  // -- 20. Synthetic probes ------------------------------------------------
  function renderWarProbes(container) {
    const grid = el('div', { class: 'probe-grid' });
    D.syntheticProbes.forEach((p) => {
      const sparkRow = el('div', { class: 'probe-spark-row' });
      p.spark.forEach((s) => sparkRow.append(el('div', { class: `probe-spark-cell ${s > 0 ? 'pass' : 'fail'}` })));
      grid.append(
        el('div', { class: `probe-tile ${p.status}` }, [
          el('div', { class: 'probe-tile-head' }, [
            el('span', { class: 'probe-tile-name', text: p.name }),
            el('span', { class: `probe-status-pill ${p.status}`, text: p.status }),
          ]),
          sparkRow,
          el('div', { class: 'probe-tile-meta' }, [
            el('span', { text: `every ${p.interval}` }),
            el('span', { text: `pass: ${p.passRate}` }),
          ]),
          el('div', { class: 'probe-tile-meta' }, [
            el('span', { style: 'color: var(--text-soft);', text: `last success: ${p.lastSuccess}` }),
            el('span', {}),
          ]),
        ])
      );
    });
    container.append(grid);
  }

  // -- 10. Post-Mortem draft -----------------------------------------------
  function renderWarPostmortem(container) {
    const p = D.postMortem;
    const wrap = el('div', { class: 'pm-wrap' });

    wrap.append(el('section', { class: 'pm-section' }, [
      el('h3', {}, ['Summary', el('span', { class: 'draft-tag', text: 'DRAFT — auto-populated' })]),
      el('p', { text: p.summary }),
    ]));

    wrap.append(el('section', { class: 'pm-section' }, [
      el('h3', { text: '5 Whys' }),
      ...p.fiveWhys.map((w, i) =>
        el('div', { class: 'pm-why-row' }, [
          el('div', { class: 'pm-why-num', text: `${i + 1}.` }),
          el('div', { class: 'pm-why-q', text: w.q }),
          el('div', { class: 'pm-why-a', text: w.a }),
        ])
      ),
    ]));

    wrap.append(el('section', { class: 'pm-section' }, [
      el('h3', { text: 'Contributing factors' }),
      (() => {
        const list = el('ul', { class: 'pm-list' });
        p.contributing.forEach((c) => list.append(el('li', { text: c })));
        return list;
      })(),
    ]));

    wrap.append(el('section', { class: 'pm-section' }, [
      el('h3', { text: 'Action items' }),
      ...p.actionItems.map((a) =>
        el('div', { class: 'pm-action-row' }, [
          el('div', { class: 'pm-action-owner', text: a.owner }),
          el('div', { class: 'pm-action-due', text: a.due }),
          el('div', { class: 'pm-action-text', text: a.text }),
        ])
      ),
    ]));

    wrap.append(el('section', { class: 'pm-section' }, [
      el('h3', { text: 'Reflection' }),
      el('div', { class: 'pm-good-bad' }, [
        el('div', {}, [
          el('div', { class: 'var-section-label', style: 'color: var(--ok);', text: 'What went well' }),
          (() => {
            const list = el('ul', { class: 'pm-list' });
            p.wentWell.forEach((c) => list.append(el('li', { text: c })));
            return list;
          })(),
        ]),
        el('div', {}, [
          el('div', { class: 'var-section-label', style: 'color: var(--crit);', text: "What didn't" }),
          (() => {
            const list = el('ul', { class: 'pm-list' });
            p.didntGoWell.forEach((c) => list.append(el('li', { text: c })));
            return list;
          })(),
        ]),
      ]),
    ]));

    container.append(wrap);
  }

  function metaSpan(label, value) {
    return el('span', {}, [`${label} `, el('strong', { text: value })]);
  }

  function cardHead(title) {
    return el('div', { class: 'card-head' }, [
      el('span', { class: 'card-title', text: title }),
    ]);
  }

  // -- Dependency graph (small, hand-laid for clarity at demo size) ---------
  function renderDepGraph() {
    const wrap = el('div', { class: 'dep-graph' });
    const W = 480, H = 420;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}` });

    // Position the components in concentric rings around fw-nyc-pri.
    const center = { id: 'fw-nyc-pri', label: 'FW-NYC-PRI', x: W / 2, y: H / 2, status: S.CRIT, r: 16 };
    const ring1 = [
      { id: 'fw-nyc-sec', label: 'FW-NYC-SEC', a: -40, status: S.CRIT },
      { id: 'dc-nyc',     label: 'DC NYC-1',   a:  20, status: S.WARN },
      { id: 'core-net',   label: 'Core Net',   a: 200, status: S.OK },
    ];
    const ring2 = [
      { id: 'svc-trading',  label: 'Trading',    a:  -20, status: S.CRIT },
      { id: 'svc-orders',   label: 'Order Rt.',  a:   30, status: S.CRIT },
      { id: 'svc-reporting',label: 'Reporting',  a:   80, status: S.WARN },
      { id: 'svc-portfolio',label: 'Portfolio',  a:  130, status: S.OK },
      { id: 'svc-risk',     label: 'Risk',       a:  170, status: S.OK },
    ];
    const ring3 = [
      { id: 'cli-tier1-na', label: 'T1 N.America', a:  -5, status: S.CRIT },
      { id: 'cli-tier2-na', label: 'T2 N.America', a:  60, status: S.WARN },
      { id: 'cli-wealth',   label: 'Wealth',       a: 110, status: S.OK },
      { id: 'cli-insurers', label: 'Insurers',     a: 160, status: S.OK },
    ];

    const place = (item, radius) => {
      const rad = (item.a * Math.PI) / 180;
      item.x = W / 2 + radius * Math.cos(rad);
      item.y = H / 2 + radius * Math.sin(rad);
      item.r = 9;
      return item;
    };
    ring1.forEach((n) => place(n, 90));
    ring2.forEach((n) => place(n, 165));
    ring3.forEach((n) => place(n, 200));

    const all = [center, ...ring1, ...ring2, ...ring3];

    // Edges from center outward through related nodes.
    const edges = [
      ['fw-nyc-pri', 'fw-nyc-sec', S.CRIT],
      ['fw-nyc-pri', 'dc-nyc',     S.WARN],
      ['fw-nyc-pri', 'core-net',   null],
      ['dc-nyc',     'svc-trading', S.CRIT],
      ['dc-nyc',     'svc-orders',  S.CRIT],
      ['dc-nyc',     'svc-reporting', S.WARN],
      ['dc-nyc',     'svc-portfolio', null],
      ['dc-nyc',     'svc-risk',    null],
      ['svc-trading', 'cli-tier1-na', S.CRIT],
      ['svc-orders',  'cli-tier1-na', S.CRIT],
      ['svc-trading', 'cli-tier2-na', S.WARN],
      ['svc-portfolio','cli-wealth',  null],
      ['svc-risk',    'cli-insurers', null],
    ];
    const find = (id) => all.find((n) => n.id === id);
    edges.forEach(([a, b, st]) => {
      const A = find(a), B = find(b);
      if (!A || !B) return;
      const cls = st === S.CRIT ? 'edge crit' : st === S.WARN ? 'edge warn' : 'edge';
      svg.append(el('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: cls }));
    });

    all.forEach((n) => {
      svg.append(el('circle', {
        cx: n.x, cy: n.y, r: n.r || 9,
        class: `node-circle ${statusClass(n.status)}`,
        'stroke-width': n.id === center.id ? 3 : 2,
      }));
      svg.append(el('text', {
        x: n.x, y: n.y - (n.r || 9) - 6,
        class: 'node-label', 'text-anchor': 'middle', text: n.label,
      }));
    });

    wrap.append(svg);
    return wrap;
  }

  // -- Live metrics ---------------------------------------------------------
  function renderMetrics() {
    const metrics = el('div', { class: 'metrics' });
    metrics.append(
      metric('NYC order ack p95', '850 ms', 'crit', sparkline([62, 64, 63, 60, 65, 120, 410, 720, 850, 870, 840, 690, 320, 80])),
      metric('Trading error rate', '12.4 %', 'crit', sparkline([0.1, 0.1, 0.2, 0.1, 0.3, 2, 6, 11, 14, 12.4, 12.6, 9, 4, 0.4])),
      metric('FW-NYC throughput',  '0.6 Gbps', 'warn', sparkline([3.2, 3.4, 3.1, 3.3, 3.4, 3.2, 1.4, 0.9, 0.6, 0.6, 0.6, 1.2, 2.4, 3.0])),
      metric('Affected sessions',  '1,427',    'warn', sparkline([12, 14, 13, 11, 18, 220, 940, 1320, 1427, 1410, 1380, 980, 620, 410])),
    );
    return metrics;
  }

  function metric(label, val, tone, spark) {
    return el('div', { class: 'metric' }, [
      el('div', { class: 'metric-label', text: label }),
      el('div', { class: `metric-val ${tone}`, text: val }),
      spark,
    ]);
  }

  function sparkline(values) {
    const w = 200, h = 32;
    const min = Math.min(...values), max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * (h - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const svg = el('svg', { class: 'metric-spark', viewBox: `0 0 ${w} ${h}`, preserveAspectRatio: 'none' });
    svg.append(el('polyline', { points, fill: 'none', stroke: '#60a5fa', 'stroke-width': '1.5' }));
    return svg;
  }

  // -- Runbook --------------------------------------------------------------
  function renderRunbook() {
    const wrap = el('div', { class: 'runbook' });
    D.runbook.forEach((step) => {
      const cls = step.done ? 'runbook-step done' : (step.current ? 'runbook-step current' : 'runbook-step');
      wrap.append(
        el('div', { class: cls }, [
          el('div', { class: 'runbook-checkbox', text: step.done ? '✓' : (step.current ? '▸' : '') }),
          el('div', { text: step.step }),
        ])
      );
    });
    return wrap;
  }

  // -- Comms ----------------------------------------------------------------
  function renderComms() {
    const wrap = el('div', { class: 'comms' });
    D.commsLog.forEach((c) => {
      wrap.append(
        el('div', { class: 'comms-entry' }, [
          el('div', { class: 'comms-time', text: c.at }),
          el('div', { class: 'comms-msg' }, [
            el('span', { class: 'who', text: c.who }),
            el('span', { class: 'text', text: c.msg }),
          ]),
        ])
      );
    });
    return wrap;
  }

  // -------------------------------------------------------------------------
  // TIMELINE view
  // -------------------------------------------------------------------------
  function renderTimeline() {
    const wrap = el('section', { class: 'timeline-wrap' });

    // Axis
    const axis = el('div', { class: 'timeline-axis' });
    axis.append(el('div', { text: '24h window' }));
    const ticks = el('div', { class: 'ticks' });
    ['-24h', '-18h', '-12h', '-6h', 'now'].forEach((t) => ticks.append(el('span', { text: t })));
    axis.append(ticks);
    wrap.append(axis);

    D.timeline.stripGroups.forEach((group) => {
      const g = el('div', { class: 'timeline-group' });
      g.append(el('div', { class: 'timeline-group-label', text: group.group }));
      group.strips.forEach((s) => {
        const row = el('div', { class: 'timeline-row' });
        row.append(el('div', { class: 'label', text: s.label }));
        const strip = el('div', { class: 'timeline-strip' });
        s.segments.forEach((seg) => {
          const left = (seg.from / D.timeline.totalMins) * 100;
          const width = ((seg.to - seg.from) / D.timeline.totalMins) * 100;
          strip.append(el('div', {
            class: `timeline-seg ${statusClass(seg.status)}`,
            style: `left: ${left}%; width: ${width}%`,
            title: `${fmtMin(seg.from)}–${fmtMin(seg.to)} · ${seg.status}`,
          }));
        });
        // Markers overlaid on each strip
        D.timeline.markers.forEach((m) => {
          const left = (m.atMin / D.timeline.totalMins) * 100;
          strip.append(el('div', {
            class: `timeline-marker ${m.kind}`,
            style: `left: ${left}%`,
            title: m.label,
          }));
        });
        row.append(strip);
        g.append(row);
      });
      wrap.append(g);
    });

    // Marker legend / list
    wrap.append(el('div', { class: 'timeline-marker-stack' }, D.timeline.markers.map((m) =>
      el('div', { class: 'marker-row' }, [
        el('div', { class: 'marker-time', text: m.label.split(' — ')[0] }),
        el('div', { class: 'marker-text' }, [
          el('span', { class: `kind ${m.kind}`, text: m.kind }),
          el('span', { text: m.label.split(' — ').slice(1).join(' — ') }),
        ]),
      ])
    )));

    view.append(wrap);
  }

  // -------------------------------------------------------------------------
  // Footer clock
  // -------------------------------------------------------------------------
  const clock = document.getElementById('nowClock');
  const tickClock = () => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('en-US', { hour12: false }) + ' ET';
  };
  tickClock();
  setInterval(tickClock, 1000);

  // -------------------------------------------------------------------------
  // Boot
  // -------------------------------------------------------------------------
  const initial = (location.hash || '#hub').slice(1);
  const initialName = initial.split('/')[0];
  setView(['hub', 'tree', 'war-room', 'timeline'].includes(initialName) ? initial : 'hub');
})();
