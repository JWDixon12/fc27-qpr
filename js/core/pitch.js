/* Pitch graphics, ported from the blog's lib/pitch.ts + HeatMap/ShotMap/TeamSheet ideas.
   Units are metres on a 105 x 68 pitch. Data frame (DATA_SCHEMA): x 0..100 toward the goal
   attacked, y 0..100 across with 0 = the attacking team's left touchline.
   orient 'h' = attacking right (viewBox 105x68); 'v' = attacking up (viewBox 68x105). */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const L = 105;
  const W = 68;
  let uid = 0;
  const esc = (s) => FC.u.esc(s);

  function fullPath() {
    const box = (x0, dir) => {
      const bw = 40.32, sw = 18.32, by = (W - bw) / 2, sy = (W - sw) / 2;
      return `M${x0},${by} H${x0 + dir * 16.5} V${by + bw} H${x0} M${x0},${sy} H${x0 + dir * 5.5} V${sy + sw} H${x0}`;
    };
    const arc = (x0, dir) => {
      const spot = x0 + dir * 11, edge = x0 + dir * 16.5;
      const dy = Math.sqrt(9.15 ** 2 - (edge - spot) ** 2);
      return `M${edge},${W / 2 - dy} A9.15,9.15 0 0 ${dir === 1 ? 1 : 0} ${edge},${W / 2 + dy}`;
    };
    const goal = (x0, dir) => `M${x0},${W / 2 - 3.66} H${x0 - dir * 1.6} V${W / 2 + 3.66} H${x0}`;
    return [
      `M0,0 H${L} V${W} H0 Z`, `M${L / 2},0 V${W}`,
      `M${L / 2 + 9.15},${W / 2} A9.15,9.15 0 1 0 ${L / 2 - 9.15},${W / 2} A9.15,9.15 0 1 0 ${L / 2 + 9.15},${W / 2}`,
      box(0, 1), box(L, -1), arc(0, 1), arc(L, -1), goal(0, 1), goal(L, -1),
    ].join(' ');
  }

  function halfPath() {
    const H = L / 2, bw = 40.32, sw = 18.32, gw = 7.32;
    const dx = Math.sqrt(9.15 ** 2 - 5.5 ** 2);
    return [
      `M0,0 H${W} V${H} H0 Z`, `M${(W - bw) / 2},0 V16.5 H${(W + bw) / 2} V0`, `M${(W - sw) / 2},0 V5.5 H${(W + sw) / 2} V0`,
      `M${W / 2 - dx},16.5 A9.15,9.15 0 0 0 ${W / 2 + dx},16.5`, `M${W / 2 - 9.15},${H} A9.15,9.15 0 0 1 ${W / 2 + 9.15},${H}`,
      `M${(W - gw) / 2},0 V-1.6 H${(W + gw) / 2} V0`,
    ].join(' ');
  }

  /** Data frame -> SVG coords. */
  const toH = (x, y) => [(x / 100) * L, (y / 100) * W];
  const toV = (x, y) => [(y / 100) * W, L - (x / 100) * L];
  const toHalf = (x, y) => [(y / 100) * W, ((100 - x) / 100) * L];
  const map = (orient) => (orient === 'v' ? toV : orient === 'half' ? toHalf : toH);

  function stripes(orient, w, h) {
    const n = 12;
    let s = '';
    for (let i = 0; i < n; i += 2) {
      s += orient === 'h'
        ? `<rect x="${(i * w) / n}" y="0" width="${w / n}" height="${h}"/>`
        : `<rect x="0" y="${(i * h) / n}" width="${w}" height="${h / n}"/>`;
    }
    return `<g class="turf-stripe">${s}</g>`;
  }

  /** Wrap layers in a pitch. opts: { orient:'h'|'v'|'half', label, cls, dir:true } */
  function svg(content, opts) {
    const o = opts || {};
    const orient = o.orient || 'h';
    const w = orient === 'h' ? L : W;
    const h = orient === 'h' ? W : orient === 'v' ? L : L / 2;
    const lines = orient === 'half'
      ? `<path class="pitch-lines" d="${halfPath()}"/>`
      : orient === 'v'
        ? `<path class="pitch-lines" transform="translate(0 ${L}) rotate(-90)" d="${fullPath()}"/>`
        : `<path class="pitch-lines" d="${fullPath()}"/>`;
    const dir = o.dir === false ? '' : orient === 'h'
      ? `<text class="pitch-dir" x="${L - 1}" y="-1.4" text-anchor="end">Attacking →</text>`
      : orient === 'v' ? `<text class="pitch-dir" x="${W - 0.5}" y="-1.4" text-anchor="end">Attacking ↑</text>` : '';
    const top = orient === 'half' ? -3 : -4;
    return `<svg class="pitch ${o.cls || ''}" viewBox="-1 ${top} ${w + 2} ${h - top + 1}" role="img" aria-label="${esc(o.label || 'Pitch graphic')}">
      <rect class="turf" x="0" y="0" width="${w}" height="${h}"/>${stripes(orient === 'h' ? 'h' : 'v', w, h)}
      ${content}${lines}${dir}</svg>`;
  }

  /** Heat layer from {cols, rows, v[]} (0..100). color = CSS color. */
  function heat(grid, orient, color) {
    if (!grid || !grid.v) return '';
    const id = `hb${++uid}`;
    const { cols, rows, v } = grid;
    const cw = L / cols, rh = W / rows;
    let cells = '';
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = v[r * cols + c] / 100;
        if (val < 0.06) continue;
        const op = (0.92 * Math.pow(val, 0.9)).toFixed(3);
        if (orient === 'v') cells += `<rect x="${r * (W / rows)}" y="${L - (c + 1) * (L / cols)}" width="${W / rows + 0.1}" height="${L / cols + 0.1}" fill-opacity="${op}"/>`;
        else cells += `<rect x="${c * cw}" y="${r * rh}" width="${cw + 0.1}" height="${rh + 0.1}" fill-opacity="${op}"/>`;
      }
    }
    const w = orient === 'v' ? W : L, h = orient === 'v' ? L : W;
    return `<defs><filter id="${id}" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="${orient === 'v' ? 2.2 : 2}"/></filter>
      <clipPath id="${id}c"><rect width="${w}" height="${h}"/></clipPath></defs>
      <g class="heat-cells" style="fill:${color}" filter="url(#${id})" clip-path="url(#${id}c)">${cells}</g>`;
  }

  /** Sum several heat grids of the same size into one normalised grid. */
  function mergeGrids(grids) {
    const g = grids.filter(Boolean);
    if (!g.length) return null;
    const v = g[0].v.map((_, i) => g.reduce((s, x) => s + x.v[i], 0));
    const max = Math.max(...v) || 1;
    return { cols: g[0].cols, rows: g[0].rows, v: v.map((x) => Math.round((100 * x) / max)) };
  }

  /** Shots on a half pitch (goal at top). Circle area ~ xG; filled = goal. */
  function shots(list, color, nameOf) {
    const R = 3.4;
    const sorted = [...list].sort((a, b) => b.xg - a.xg);
    return sorted.map((s) => {
      const [cx, cy] = toHalf(s.x, s.y);
      const r = Math.max(0.9, R * Math.sqrt(Math.min(s.xg, 1)));
      const tip = `<b>${esc(nameOf(s.player))}</b> ${s.minute}'<br>${s.xg.toFixed(2)} xG · ${esc(s.outcome)}`;
      return `<circle class="shot shot-${esc(s.outcome)}" cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${r.toFixed(2)}" style="--c:${color}" tabindex="0" data-tip="${esc(tip)}"/>`;
    }).join('');
  }

  /** Passing network: edges by count, nodes sized by touches with shirt numbers. */
  function passNet(net, orient, color) {
    if (!net) return '';
    const m = map(orient);
    const at = new Map(net.nodes.map((n) => [n.shirt, n]));
    const maxE = Math.max(...net.edges.map((e) => e.count), 1);
    const maxT = Math.max(...net.nodes.map((n) => n.touches), 1);
    const edges = net.edges.map((e) => {
      const a = at.get(e.from), b = at.get(e.to);
      if (!a || !b) return '';
      const [x1, y1] = m(a.x, a.y), [x2, y2] = m(b.x, b.y);
      const w = (0.25 + 1.5 * (e.count / maxE)).toFixed(2);
      return `<line class="pn-edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w}" stroke-opacity="${(0.25 + 0.6 * e.count / maxE).toFixed(2)}" style="stroke:${color}" data-tip="${esc(`#${e.from} ↔ #${e.to}: ${e.count} passes`)}"/>`;
    }).join('');
    const nodes = net.nodes.map((n) => {
      const [x, y] = m(n.x, n.y);
      const r = 2.4 + 2.2 * (n.touches / maxT);
      return `<g class="pn-node" tabindex="0" data-tip="${esc(`#${n.shirt}: ${n.touches} touches`)}"><circle cx="${x}" cy="${y}" r="${r.toFixed(2)}" style="fill:${color}"/><text x="${x}" y="${y + 1.2}" text-anchor="middle">${n.shirt}</text></g>`;
    }).join('');
    return `<g class="pn">${edges}${nodes}</g>`;
  }

  FC.pitch = { L, W, svg, heat, mergeGrids, shots, passNet, toH, toV, toHalf, map, fullPath };
})();
