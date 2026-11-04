/* Hand-written SVG charts. Charts render at the container's real pixel width (so text
   stays 12px on a 5120px screen); FC.chart.mount() re-renders them on resize.
   Rules (dataviz skill): one y-axis, 2px lines, hairline solid grid, legend for >=2 series,
   text in ink colours, hover layer on every chart. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const esc = (s) => FC.u.esc(s);
  const mounted = new Set();

  /**
   * Render a chart at the element's real width. With {fill: true} the chart also grows to use
   * spare height in a stretched panel (render receives (width, height)); see refill().
   */
  function mount(el, render, opts) {
    if (!el) return;
    const job = { el, render, fill: !!(opts && opts.fill) };
    mounted.add(job);
    drawJob(job);
  }
  function drawJob(j, h) {
    const w = Math.max(240, Math.floor(j.el.clientWidth));
    j.el.innerHTML = j.render(w, h);
  }
  /** Re-fit every fill chart: draw at natural height first, then grow into the panel's spare room. */
  function refill() {
    const jobs = [...mounted].filter((j) => j.fill && j.el.isConnected);
    jobs.forEach((j) => drawJob(j));
    jobs.forEach((j) => {
      const panel = j.el.closest('.panel');
      const svg = j.el.querySelector('svg.chart-svg');
      if (!panel || !svg) return;
      const pad = parseFloat(getComputedStyle(panel).paddingBottom) || 0;
      const extra = Math.floor(panel.getBoundingClientRect().bottom - pad - j.el.getBoundingClientRect().bottom);
      if (extra > 12) drawJob(j, svg.height.baseVal.value + extra);
    });
  }
  let rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      mounted.forEach((j) => { if (!j.el.isConnected) mounted.delete(j); else drawJob(j); });
      refill();
    }, 120);
  });

  function niceTicks(min, max, count) {
    const span = max - min || 1;
    const raw = span / (count || 4);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
    const lo = Math.floor(min / step) * step;
    const out = [];
    for (let v = lo; v <= max + step * 0.001; v += step) out.push(+v.toFixed(6));
    if (out[out.length - 1] < max) out.push(+(out[out.length - 1] + step).toFixed(6));
    return out;
  }

  function legend(series) {
    if (series.length < 2) return '';
    return `<div class="legend">${series.map((s) => `<span><i class="${s.dash ? 'dash' : ''}" style="--c:${s.color}"></i>${esc(s.name)}</span>`).join('')}</div>`;
  }

  /**
   * Multi-series line chart with a hover column per x.
   * opts: { labels[], series[{name,color,values[],dash,area,width,muted}], height, yMin, yMax, invert,
   *         fmt(v), yTicks[], step:boolean, endLabels:boolean, yLabel, tipTitle(i) }
   */
  function line(opts, width) {
    const H = opts.height || 260;
    const pad = { l: 44, r: opts.endLabels ? 96 : 16, t: 14, b: 30 };
    const n = opts.labels.length;
    const all = opts.series.flatMap((s) => s.values.filter((v) => v != null));
    let yMin = opts.yMin != null ? opts.yMin : Math.min(0, ...all);
    let yMax = opts.yMax != null ? opts.yMax : Math.max(...all);
    const ticks = opts.yTicks || niceTicks(yMin, yMax, 4);
    if (!opts.yTicks) { yMin = Math.min(yMin, ticks[0]); yMax = Math.max(yMax, ticks[ticks.length - 1]); }
    const fmt = opts.fmt || ((v) => FC.u.num(v));
    const iw = width - pad.l - pad.r, ih = H - pad.t - pad.b;
    const x = (i) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (v) => {
      const t = (v - yMin) / (yMax - yMin || 1);
      return pad.t + (opts.invert ? t : 1 - t) * ih;
    };
    const grid = ticks.map((t) => `<line class="grid" x1="${pad.l}" x2="${width - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`).join('');
    const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 70))));
    const xl = opts.labels.map((l, i) => (i % every === 0 || i === n - 1 ? `<text class="ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>` : '')).join('');
    const paths = opts.series.map((s) => {
      const pts = s.values.map((v, i) => (v == null ? null : [x(i), y(v)])).filter(Boolean);
      const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : opts.step ? `H${p[0]} V${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
      const area = s.area && d ? `<path class="area" d="${d} V${y(Math.max(yMin, 0))} H${x(0)} Z" style="fill:${s.color}"/>` : '';
      const last = s.values.reduce((a, v, i) => (v != null ? i : a), -1);
      const end = last >= 0 ? `<circle class="end" cx="${x(last)}" cy="${y(s.values[last])}" r="4" style="fill:${s.color}"/>` : '';
      const lab = opts.endLabels && last >= 0 ? `<text class="end-label" x="${x(last) + 8}" y="${y(s.values[last]) + 4}">${esc(s.name)}</text>` : '';
      return `<g class="series ${s.muted ? 'muted' : ''}" data-series="${esc(s.name)}">${area}<path class="ln ${s.dash ? 'dash' : ''}" d="${d}" style="stroke:${s.color};stroke-width:${s.width || 2}px"/>${end}${lab}</g>`;
    }).join('');
    const slot = n === 1 ? iw : iw / (n - 1);
    const hov = opts.labels.map((l, i) => {
      const rows = opts.series.filter((s) => s.values[i] != null && !s.noTip)
        .map((s) => `<span class="tt-row"><i style="--c:${s.color}"></i>${esc(s.name)}<b>${esc(fmt(s.values[i]))}</b></span>`).join('');
      const title = opts.tipTitle ? opts.tipTitle(i) : esc(l);
      return `<g class="hov" tabindex="-1" data-tip="${esc(`<strong>${title}</strong>${rows}`)}"><rect x="${Math.max(pad.l, x(i) - slot / 2)}" y="${pad.t}" width="${Math.min(width - pad.r, x(i) + slot / 2) - Math.max(pad.l, x(i) - slot / 2)}" height="${ih}"/><line x1="${x(i)}" x2="${x(i)}" y1="${pad.t}" y2="${pad.t + ih}"/></g>`;
    }).join('');
    const yl = opts.yLabel ? `<text class="ax ax-title" x="${pad.l}" y="${pad.t - 2}">${esc(opts.yLabel)}</text>` : '';
    return `${legend(opts.series.filter((s) => !s.noLegend))}<svg class="chart-svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" role="img" aria-label="${esc(opts.label || 'Line chart')}">${grid}${yl}<line class="base" x1="${pad.l}" x2="${width - pad.r}" y1="${pad.t + ih}" y2="${pad.t + ih}"/>${xl}${paths}<g class="hovers">${hov}</g></svg>`;
  }

  /** Vertical columns. opts: { items[{label, value, color, tip}], height, yMax, fmt, ref:{value,label} } */
  function columns(opts, width) {
    const H = opts.height || 220;
    const pad = { l: 40, r: 12, t: 16, b: 30 };
    const items = opts.items;
    const max = opts.yMax || Math.max(...items.map((d) => d.value), 1);
    const min = opts.yMin || 0;
    const ticks = opts.yTicks || niceTicks(min, max, 4);
    const top = ticks[ticks.length - 1];
    const iw = width - pad.l - pad.r, ih = H - pad.t - pad.b;
    const y = (v) => pad.t + (1 - (v - min) / (top - min)) * ih;
    const band = iw / items.length;
    const bw = Math.min(24, band * 0.6);
    const fmt = opts.fmt || ((v) => FC.u.num(v));
    const grid = ticks.map((t) => `<line class="grid" x1="${pad.l}" x2="${width - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`).join('');
    const bars = items.map((d, i) => {
      const cx = pad.l + band * i + band / 2;
      const y0 = y(Math.max(min, d.value)), h = Math.max(1, y(min) - y0);
      const r = Math.min(4, h, bw / 2);
      const path = `M${cx - bw / 2},${y(min)} V${y0 + r} Q${cx - bw / 2},${y0} ${cx - bw / 2 + r},${y0} H${cx + bw / 2 - r} Q${cx + bw / 2},${y0} ${cx + bw / 2},${y0 + r} V${y(min)} Z`;
      return `<g class="col" tabindex="0" data-tip="${esc(d.tip || `${d.label}: ${fmt(d.value)}`)}"${d.href ? ` data-href="${esc(d.href)}"` : ''}><rect class="hit" x="${cx - band / 2}" y="${pad.t}" width="${band}" height="${ih}"/><path d="${path}" style="fill:${d.color || 'var(--home)'}"/>${d.mark ? `<text class="col-mark" x="${cx}" y="${y0 - 6}" text-anchor="middle">${esc(d.mark)}</text>` : ''}<text class="ax" x="${cx}" y="${H - 10}" text-anchor="middle">${esc(d.label)}</text></g>`;
    }).join('');
    const ref = opts.ref ? `<line class="ref" x1="${pad.l}" x2="${width - pad.r}" y1="${y(opts.ref.value)}" y2="${y(opts.ref.value)}"/><text class="ax ref-label" x="${width - pad.r}" y="${y(opts.ref.value) - 5}" text-anchor="end">${esc(opts.ref.label)}</text>` : '';
    return `<svg class="chart-svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" role="img" aria-label="${esc(opts.label || 'Column chart')}">${grid}<line class="base" x1="${pad.l}" x2="${width - pad.r}" y1="${y(min)}" y2="${y(min)}"/>${bars}${ref}</svg>`;
  }

  /** Inline sparkline; last point marked. */
  function spark(values, w, h, color) {
    const W = w || 120, H = h || 32;
    const v = values.filter((x) => x != null);
    if (v.length < 2) return '';
    const min = Math.min(...v), max = Math.max(...v);
    const sx = (i) => 3 + (i / (v.length - 1)) * (W - 6);
    const sy = (x) => 3 + (1 - (x - min) / (max - min || 1)) * (H - 6);
    const d = v.map((x, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(x).toFixed(1)}`).join(' ');
    return `<svg class="spark" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><path d="${d}" style="stroke:${color || 'var(--home)'}"/><circle cx="${sx(v.length - 1)}" cy="${sy(v[v.length - 1])}" r="3" style="fill:${color || 'var(--home)'}"/></svg>`;
  }

  /** Radar. axes[{label}], series[{name,color,values 0..1, raw[]}] */
  function radar(axes, series, size) {
    const S = size || 320, c = S / 2, R = S / 2 - 54;
    const n = axes.length;
    const pt = (i, r) => [c + R * r * Math.sin((2 * Math.PI * i) / n), c - R * r * Math.cos((2 * Math.PI * i) / n)];
    const rings = [0.25, 0.5, 0.75, 1].map((r) => `<polygon class="grid" points="${axes.map((_, i) => pt(i, r).join(',')).join(' ')}"/>`).join('');
    const spokes = axes.map((a, i) => {
      const [x, y] = pt(i, 1);
      const [lx, ly] = pt(i, 1.2);
      const rows = series.map((s) => `<span class="tt-row"><i style="--c:${s.color}"></i>${esc(s.name)}<b>${esc(s.raw[i])}</b></span>`).join('');
      return `<line class="grid" x1="${c}" y1="${c}" x2="${x}" y2="${y}"/><text class="ax radar-label" x="${lx}" y="${ly + 4}" text-anchor="${Math.abs(lx - c) < 4 ? 'middle' : lx > c ? 'start' : 'end'}" tabindex="0" data-tip="${esc(`<strong>${esc(a.label)}</strong>${rows}`)}">${esc(a.label)}</text>`;
    }).join('');
    const polys = series.map((s) => `<polygon class="radar-poly" points="${s.values.map((v, i) => pt(i, Math.max(0.02, Math.min(1, v))).join(',')).join(' ')}" style="--c:${s.color}"/>`).join('');
    return `${legend(series)}<svg class="chart-svg radar" width="${S + 72}" height="${S}" viewBox="-36 0 ${S + 72} ${S}" role="img" aria-label="Radar of per-90 output">${rings}${spokes}${polys}</svg>`;
  }

  /** Horizontal bar list in HTML (wraps nicely on phones). items[{label, value, display, color, sub, tip}] */
  function barList(items, opts) {
    const o = opts || {};
    const max = o.max || Math.max(...items.map((d) => Math.abs(d.value)), 1);
    return `<ol class="barlist ${o.cls || ''}">${items.map((d) => `<li tabindex="0" data-tip="${esc(d.tip || `${d.label}: ${d.display}`)}"${d.player ? ` data-player="${d.player}"` : ''}>
      <span class="bl-label">${d.html || esc(d.label)}</span>
      <span class="bl-track"><span class="bl-bar" style="width:${(100 * Math.abs(d.value)) / max}%;--c:${d.color || 'var(--home)'}"></span></span>
      <span class="bl-val">${esc(d.display)}</span></li>`).join('')}</ol>`;
  }

  FC.chart = Object.assign(FC.chart || {}, { mount, refill, niceTicks, legend, line, columns, spark, radar, barList });
})();
