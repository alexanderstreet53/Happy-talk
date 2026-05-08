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

  const setView = (name) => {
    [...tabs.querySelectorAll('.tab')].forEach((t) =>
      t.classList.toggle('active', t.dataset.view === name)
    );
    view.replaceChildren();
    if (name === 'hub') renderHub();
    else if (name === 'tree') renderTree();
    else if (name === 'war-room') renderWarRoom();
    else if (name === 'timeline') renderTimeline();
    history.replaceState(null, '', `#${name}`);
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
  // WAR ROOM view — incident-centric.
  // -------------------------------------------------------------------------
  function renderWarRoom() {
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

    view.append(banner, grid);
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
  setView(['hub', 'tree', 'war-room', 'timeline'].includes(initial) ? initial : 'hub');
})();
