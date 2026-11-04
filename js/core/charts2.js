/* Football-specific charts: bump chart, threat momentum, xG race, stat comparison, gauges. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const esc = (s) => FC.u.esc(s);

  /** Position-over-time for every club. Ours drawn last in red; others muted until hovered. */
  function bump(rows, labels, width, highlight, height) {
    const H = Math.max(360, rows.length * 22 + 50, height || 0);
    const pad = { l: 34, r: 150, t: 14, b: 30 };
    const n = labels.length;
    const iw = width - pad.l - pad.r, ih = H - pad.t - pad.b;
    const x = (i) => pad.l + (n === 1 ? 0 : (i / (n - 1)) * iw);
    const y = (p) => pad.t + ((p - 1) / (rows.length - 1)) * ih;
    const grid = rows.map((_, i) => `<text class="ax" x="${pad.l - 10}" y="${y(i + 1) + 4}" text-anchor="end">${i + 1}</text>`).join('');
    const xl = labels.map((l, i) => `<line class="grid" x1="${x(i)}" x2="${x(i)}" y1="${pad.t}" y2="${pad.t + ih}"/><text class="ax" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(l)}</text>`).join('');
    const ordered = [...rows].sort((a, b) => (a.team === highlight) - (b.team === highlight));
    const lines = ordered.map((r) => {
      const t = FC.u.team(r.team);
      const ours = r.team === highlight;
      const d = r.posHistory.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p)}`).join(' ');
      const last = r.posHistory.length - 1;
      const hist = r.posHistory.map((p, i) => `${labels[i]}: ${p}`).join(' · ');
      return `<g class="bump-line ${ours ? 'ours' : ''}" tabindex="0" data-tip="${esc(`<strong>${esc(t.name)}</strong>${esc(hist)}`)}">
        <path d="${d}"/>${r.posHistory.map((p, i) => `<circle cx="${x(i)}" cy="${y(p)}" r="${ours ? 5 : 3.5}"/>`).join('')}
        <text class="bump-label" x="${x(last) + 12}" y="${y(r.posHistory[last]) + 4}">${esc(t.short)} <tspan>${r.pts} pts</tspan></text></g>`;
    }).join('');
    return `<svg class="chart-svg bump" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" role="img" aria-label="League position after each matchday">${xl}${grid}${lines}</svg>`;
  }

  /** Threat momentum as in the game's Possession tab: home bars up, away bars down, goals marked. */
  function momentum(threat, goals, width, names, colors) {
    const cs = colors || ['var(--home)', 'var(--away)'];
    const H = 200, pad = { l: 8, r: 8, t: 22, b: 26 };
    const mid = pad.t + (H - pad.t - pad.b) / 2;
    const half = (H - pad.t - pad.b) / 2 - 4;
    const maxMin = Math.max(92, ...threat.map((t) => t.minute + 2));
    const x = (m) => pad.l + (m / maxMin) * (width - pad.l - pad.r);
    const bw = Math.max(2, (width - pad.l - pad.r) / threat.length - 2);
    const bars = threat.map((t) => {
      const tip = `<strong>${t.minute}'–${t.minute + 2}'</strong><span class="tt-row"><i style="--c:${cs[0]}"></i>${esc(names[0])}<b>${Math.round(t.home * 100)}</b></span><span class="tt-row"><i style="--c:${cs[1]}"></i>${esc(names[1])}<b>${Math.round(t.away * 100)}</b></span>`;
      return `<g class="mo" data-tip="${esc(tip)}"><rect class="hit" x="${x(t.minute)}" y="${pad.t}" width="${bw + 2}" height="${2 * half + 8}"/>
        <rect class="mo-h" style="fill:${cs[0]}" x="${x(t.minute)}" y="${mid - 2 - t.home * half}" width="${bw}" height="${Math.max(1, t.home * half)}" rx="1.5"/>
        <rect class="mo-a" style="fill:${cs[1]}" x="${x(t.minute)}" y="${mid + 2}" width="${bw}" height="${Math.max(1, t.away * half)}" rx="1.5"/></g>`;
    }).join('');
    const ticks = [0, 15, 30, 45, 60, 75, 90].map((m) => `<text class="ax" x="${x(m)}" y="${H - 6}" text-anchor="middle">${m}'</text>`).join('');
    const gm = goals.map((g) => {
      const up = g.home;
      const gy = up ? pad.t - 6 : H - pad.b + 2;
      return `<g class="mo-goal" data-tip="${esc(`<strong>Goal ${g.minute}'</strong>${esc(g.name)}`)}"><line x1="${x(g.minute)}" x2="${x(g.minute)}" y1="${pad.t}" y2="${H - pad.b}"/><circle cx="${x(g.minute)}" cy="${up ? pad.t : H - pad.b}" r="5"/></g>`;
    }).join('');
    return `<svg class="chart-svg momentum" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" role="img" aria-label="Threat momentum by two-minute window">
      <line class="ht" x1="${x(45)}" x2="${x(45)}" y1="${pad.t - 10}" y2="${H - pad.b}"/><text class="ax" x="${x(45) + 4}" y="${pad.t - 10}">HT</text>
      <line class="base" x1="${pad.l}" x2="${width - pad.r}" y1="${mid}" y2="${mid}"/>${bars}${gm}${ticks}</svg>`;
  }

  /** Cumulative xG step race. teams: [{name,color,shots[{minute,xg,outcome,player}]}] */
  function xgRace(teams, width, nameOf) {
    const H = 240, pad = { l: 40, r: 16, t: 14, b: 28 };
    const end = 95;
    const tot = teams.map((t) => t.shots.reduce((s, x) => s + x.xg, 0));
    const ticks = FC.chart.niceTicks(0, Math.max(1, ...tot), 4);
    const yMax = ticks[ticks.length - 1];
    const x = (m) => pad.l + (Math.min(m, end) / end) * (width - pad.l - pad.r);
    const y = (v) => H - pad.b - (v / yMax) * (H - pad.t - pad.b);
    const grid = ticks.map((t) => `<line class="grid" x1="${pad.l}" x2="${width - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text class="ax" x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('');
    const xt = [0, 15, 30, 45, 60, 75, 90].map((m) => `<text class="ax" x="${x(m)}" y="${H - 8}" text-anchor="middle">${m}'</text>`).join('');
    const lines = teams.map((t) => {
      let cum = 0, d = `M${x(0)},${y(0)}`;
      const marks = [];
      [...t.shots].sort((a, b) => a.minute - b.minute).forEach((s) => {
        d += ` H${x(s.minute)}`;
        cum += s.xg;
        d += ` V${y(cum)}`;
        marks.push(`<circle class="${s.outcome === 'goal' ? 'xg-goal' : 'xg-shot'}" cx="${x(s.minute)}" cy="${y(cum)}" r="${s.outcome === 'goal' ? 6 : 3}" style="--c:${t.color}" tabindex="0" data-tip="${esc(`<strong>${esc(nameOf(s.player))} ${s.minute}'</strong>${s.xg.toFixed(2)} xG · ${esc(s.outcome)}<br>Running total ${cum.toFixed(2)}`)}"/>`);
      });
      d += ` H${x(end)}`;
      return `<g><path class="ln" d="${d}" style="stroke:${t.color};stroke-width:2.5px"/>${marks.join('')}<text class="end-label" x="${width - pad.r}" y="${y(cum) - 8}" text-anchor="end">${cum.toFixed(2)}</text></g>`;
    }).join('');
    return `${FC.chart.legend(teams)}<svg class="chart-svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" role="img" aria-label="Cumulative expected goals by minute">${grid}<line class="ht" x1="${x(45)}" x2="${x(45)}" y1="${pad.t}" y2="${H - pad.b}"/><line class="base" x1="${pad.l}" x2="${width - pad.r}" y1="${y(0)}" y2="${y(0)}"/>${xt}${lines}</svg>`;
  }

  /** Game-style stat comparison rows: home value | label | away value, with split bar. */
  /** Mirrored rows: value | label | value over a 6px track. Each side's bar grows from the centre;
      the leader's half is coloured (home red, away blue), the other stays grey. */
  function compare(rows) {
    return `<div class="compare">${rows.map((r) => {
      const [a, b] = r.values.map((v) => v || 0);
      const lead = r.lowerBetter ? (a < b ? 0 : a > b ? 1 : -1) : a > b ? 0 : a < b ? 1 : -1;
      const max = Math.max(a, b) || 1;
      const fa = r.fmt ? r.fmt(r.values[0]) : r.values[0], fb = r.fmt ? r.fmt(r.values[1]) : r.values[1];
      return `<div class="cmp-row">
        <span class="cmp-v ${lead === 0 ? 'lead' : ''}">${esc(fa)}</span><span class="cmp-l">${esc(r.label)}</span><span class="cmp-v ${lead === 1 ? 'lead' : ''}">${esc(fb)}</span>
        <span class="cmp-track" aria-hidden="true"><span class="ct-h"><i class="${lead === 0 ? 'on' : ''}" style="width:${(100 * a) / max}%"></i></span><span class="ct-a"><i class="${lead === 1 ? 'on' : ''}" style="width:${(100 * b) / max}%"></i></span></span></div>`;
    }).join('')}</div>`;
  }

  /** Single horizontal meter 0..100 with status as coloured text (replaces the old arc gauge). */
  function meter(value, label, note) {
    const status = value >= 65 ? 'good' : value >= 40 ? 'neutral' : 'crit';
    const word = { good: 'Positive', neutral: 'Neutral', crit: 'Negative' }[status];
    return `<div class="meter-row" role="meter" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(label)}">
      <span class="mr-l">${esc(label)}${note ? `<small>${esc(note)}</small>` : ''}</span><b>${value}</b><span class="status-tag s-${status}">${word}</span>
      <span class="mr-track"><i style="width:${value}%"></i></span></div>`;
  }

  /** Arc gauge 0..100 with a status band colour. */
  function gauge(value, label, note) {
    const S = 180, c = 90, R = 70, sw = 12;
    const ang = (v) => Math.PI * (1 - v / 100);
    const pt = (v) => [c + R * Math.cos(ang(v)), c - R * Math.sin(ang(v))];
    const [x0, y0] = pt(0), [x1, y1] = pt(100), [xv, yv] = pt(Math.max(0.5, value));
    const status = value >= 70 ? 'good' : value >= 45 ? 'warn' : 'crit';
    const word = { good: 'Strong', warn: 'Uneasy', crit: 'Hostile' }[status];
    return `<figure class="gauge g-${status}" tabindex="0" data-tip="${esc(`<strong>${esc(label)}</strong>${value}/100 · ${word}`)}">
      <svg viewBox="0 0 ${S} ${c + 16}" width="100%" role="img" aria-label="${esc(label)} ${value} of 100">
        <path class="g-track" d="M${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1}" stroke-width="${sw}"/>
        <path class="g-fill" d="M${x0},${y0} A${R},${R} 0 0 1 ${xv},${yv}" stroke-width="${sw}"/>
        <text class="g-val" x="${c}" y="${c - 4}" text-anchor="middle">${value}</text>
      </svg>
      <figcaption><b>${esc(label)}</b><span class="status-tag s-${status}">${word}</span>${note ? `<small>${esc(note)}</small>` : ''}</figcaption></figure>`;
  }

  /** Headline strip above team stats: xG and shots as big mirrored numbers, possession as a split bar. */
  function statStrip(m, names) {
    const ts = m.teamStats || {};
    const big = (label, a, b, fmt) => `<div class="ss-cell"><b class="ss-h">${fmt ? fmt(a) : a}</b><span>${label}</span><b class="ss-a">${fmt ? fmt(b) : b}</b></div>`;
    const [ph, pa] = m.possession;
    return `<div class="statstrip">${big('xG', m.xg[0], m.xg[1], (v) => v.toFixed(2))}${ts.shots ? big('Shots', ts.shots[0], ts.shots[1]) : ''}${ts.onTarget ? big('On target', ts.onTarget[0], ts.onTarget[1]) : ''}
      <div class="ss-poss" role="img" aria-label="Possession ${esc(names[0])} ${ph}%, ${esc(names[1])} ${pa}%"><span>${ph}%</span><i class="h" style="flex:${ph}"></i><i class="a" style="flex:${pa}"></i><span>${pa}%</span><small>Possession</small></div></div>`;
  }

  /** compare() with the first `keep` rows visible and the rest behind an "All stats" disclosure. */
  function compareFold(rows, keep) {
    if (rows.length <= keep + 2) return compare(rows);
    return `${compare(rows.slice(0, keep))}<details class="more-stats"><summary>All stats <span>${rows.length - keep} more</span></summary>${compare(rows.slice(keep))}</details>`;
  }

  FC.chart = Object.assign(FC.chart || {}, { bump, momentum, xgRace, compare, compareFold, statStrip, gauge, meter });
})();
