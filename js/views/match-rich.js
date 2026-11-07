/* Match Centre for matches captured from the game's post-match screens (match.facts present).
   Mirrors the game: Summary / Possession / Shooting / Passing / Defending / Events, each with the
   team lists in the middle and both teams' maps (with every map view) either side. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const esc = (s) => FC.u.esc(s);
  const st = { tab: 'summary', view: {}, raw: false };
  const TABS = [['summary', 'Summary'], ['possession', 'Possession'], ['shooting', 'Shooting'], ['passing', 'Passing'], ['defending', 'Defending'], ['events', 'Events']];
  const VIEWS = {
    possession: [['poss_overall', 'Overall'], ['poss_won', 'Possession won'], ['poss_lost', 'Possession lost'], ['poss_beat', 'Beat opponent']],
    shooting: [['shots_all', 'All shots'], ['shots_goals', 'Goals'], ['shots_off', 'Off target'], ['shots_blocked', 'Blocked'], ['shots_saved', 'Saved']],
    passing: [['pass_network', 'Passing network'], ['pass_all', 'All passes'], ['pass_completed', 'Completed'], ['pass_assists', 'Assists'], ['pass_intercepted', 'Intercepted'], ['pass_offsides', 'Offsides']],
    defending: [['tackles_all', 'All tackles'], ['tackles_standing', 'Standing'], ['tackles_sliding', 'Sliding'], ['tackles_interceptions', 'Interceptions']],
  };
  const RING = { summary: null, possession: ['possession', 'Possession'], shooting: ['shotAccuracy', 'Shot accuracy'], passing: ['passAccuracy', 'Pass accuracy'], defending: ['tackleSuccess', 'Tackle success'] };

  const sideName = (m, s) => m.sides[s].name;
  const fmt = (v) => (typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2) : v);

  function scoreboard(f, m) {
    const U = FC.u;
    const goals = (s) => m.events.filter((e) => /goal/.test(e.type) && e.side === s).map((e) => `<li>${esc(e.player)}${e.minute == null ? '' : ` ${e.minute}'`}${e.assist ? ` <small>(${esc(e.assist)})</small>` : ''}</li>`).join('');
    const side = (s, i) => `<div class="sb-side sb-${i ? 'r' : 'l'}">${U.crest(m.sides[s].teamId, 110, 'sb-crest')}<h2${U.hasClub(m.sides[s].teamId) ? ` data-team="${m.sides[s].teamId}"` : ''}>${esc(sideName(m, s))}</h2>
      <p class="sb-xg">${m.xg[i].toFixed(2)} xG${m.possession[i] == null ? '' : ` · ${m.possession[i]}% possession`}</p><ul class="sb-goals">${goals(s)}</ul></div>`;
    const paused = m.minutesPlayed && m.minutesPlayed < 90;
    return `<section class="scoreboard" aria-label="Score">
      <header>${f.comp ? U.compChip(f.comp) : ''}</header>
      <div class="sb-main">${side('home', 0)}<div class="sb-score"><b>${m.score[0]}</b><i>:</i><b>${m.score[1]}</b><small>${paused ? `Paused at ${esc(m.clock)}` : m.pens ? `${m.pens[0]}–${m.pens[1]} on penalties` : 'Full time'}</small></div>${side('away', 1)}</div></section>`;
  }

  const LOWER = /Beaten|Fouls|Yellow|Red|Recovery|Penalties Committed|Offside/i;
  const toRow = (r) => ({ label: r.label.replace(' %', '').replace('Expected Goals', 'xG'), values: r.values, lowerBetter: LOWER.test(r.label), fmt: fmt });

  /** Game lists as mirrored rows with tracks, one plain heading per section. */
  function list(sections) {
    return `<div class="glist">${sections.map((sec) => `<h4>${esc(sec.section)}</h4>${FC.chart.compare(sec.rows.map(toRow))}`).join('')}</div>`;
  }

  /** Summary in score-app order: Possession, Shots, On target, xG, Passes, Tackles; the rest folded. */
  function summary(m) {
    const rows = m.facts.summary[0].rows;
    const get = (l) => rows.find((r) => r.label === l);
    const pct = (v) => `${v}%`;
    const head = [get('Possession %'), get('Shots'), { label: 'On target', values: m.teamStats.onTarget }, get('Expected Goals'), get('Passes'), get('Tackles')].filter(Boolean);
    const rest = rows.filter((r) => !head.includes(r) && !/Line Breaks/.test(r.label));
    const rates = [['Dribble success', 'dribbleSuccess'], ['Shot accuracy', 'shotAccuracy'], ['Pass accuracy', 'passAccuracy'], ['Tackle success', 'tackleSuccess']]
      .map(([l, k]) => ({ label: l, values: m.rings[k], fmt: pct }));
    const lb = rows.filter((r) => /Line Breaks/.test(r.label)).map((r) => ({ ...toRow(r), label: r.label.replace('Def Line Breaks ', 'Line breaks, ').replace(', A', ', a').replace(', T', ', t').replace(', O', ', o') }));
    return FC.chart.compare(head.map((r) => (r.values ? (r.label === 'On target' ? r : { ...toRow(r), fmt: r.label === 'Possession %' ? pct : fmt }) : r)))
      + `<details class="more-stats"><summary>All stats <span>${rest.length + rates.length + lb.length} more</span></summary>${FC.chart.compare([...rates, ...rest.map(toRow), ...lb])}</details>`;
  }

  /** Vertical threat strip like the game: minute 0 at the top, home bars left, away bars right. */
  function threat(m) {
    const n = m.minutesPlayed && m.minutesPlayed < 90 ? Math.max(30, m.minutesPlayed + 2) : 90;
    const W = 360, step = n < 60 ? 11 : 5.4, mid = W / 2, top = 24, bot = 16, H = top + bot + n * step, half = mid - 14;
    const bars = Array.from({ length: n }, (_, i) => {
      const t = m.threat[i];
      const y = top + i * step;
      if (!t) return `<rect class="th-empty" x="${mid - 6}" y="${y}" width="12" height="${Math.max(1, step - 1.5)}"/>`;
      const tip = `<strong>${i}'</strong><span class="tt-row"><i style="--c:var(--L)"></i>${esc(m.sides.home.short)}<b>${Math.round(t.home * 100)}</b></span><span class="tt-row"><i style="--c:var(--R)"></i>${esc(m.sides.away.short)}<b>${Math.round(t.away * 100)}</b></span>`;
      return `<g data-tip="${esc(tip)}"><rect class="hit" x="0" y="${y}" width="${W}" height="${step}"/>
        <rect style="fill:var(--L)" x="${mid - 2 - t.home * half}" y="${y}" width="${Math.max(0.5, t.home * half)}" height="${Math.max(1, step - 1.5)}" rx="1"/>
        <rect style="fill:var(--R)" x="${mid + 2}" y="${y}" width="${Math.max(0.5, t.away * half)}" height="${Math.max(1, step - 1.5)}" rx="1"/></g>`;
    }).join('');
    const goals = m.events.filter((e) => /goal/.test(e.type)).map((e) => {
      const y = top + e.minute * step + step / 2;
      const x = e.side === 'home' ? 18 : W - 18;
      return `<g class="th-goal" data-tip="${esc(`<strong>Goal ${e.minute}'</strong>${esc(e.player)}`)}"><line x1="${mid}" x2="${x}" y1="${y}" y2="${y}"/><circle cx="${x}" cy="${y}" r="7"/></g>`;
    }).join('');
    const ticks = [0, 15, 30, 45, 60, 75, 90].filter((t) => t < n).map((t) => `<text class="ax th-tick" x="4" y="${top + t * step + 4}">${t}'</text>`).join('');
    const ht = n > 45 ? `<line class="ht" x1="0" x2="${W}" y1="${top + 45 * step}" y2="${top + 45 * step}"/>` : '';
    return `<figure class="threat"><figcaption>Threat <small>per minute${m.minutesPlayed < 90 ? `, played to ${esc(m.clock)}` : ''}</small></figcaption>
      <svg class="chart-svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Attacking threat by minute">
      ${ht}${bars}${goals}${ticks}</svg></figure>`;
  }

  function sideCol(f, m, tab, s, i) {
    const color = i ? 'var(--R)' : 'var(--L)';
    const v = st.view[tab] || VIEWS[tab][0][0];
    const fm = m.factsMaps[v];
    const label = (VIEWS[tab].find((x) => x[0] === v) || [])[1];
    return `<div class="gm-side"><span class="gm-team">${esc(sideName(m, s))}</span>${FC.gp.map({ src: fm && fm[s], half: fm && fm.half, raw: st.raw, color, label: `${sideName(m, s)}: ${label}`, blank: fm && fm.blank && fm.blank.includes(s) ? 'None this match' : '' })}</div>`;
  }

  function events(f, m) {
    const U = FC.u;
    const shots = m.shots.map((s) => `<tr><td><span class="side-dot" style="--c:var(--${s.side === 'home' ? 'L' : 'R'})"></span>${esc(m.sides[s.side].short)}</td><td>${s.minute != null ? `${s.minute}'` : '<span class="muted" title="Minute not shown on the shot map">—</span>'}</td>
      <td><b>${esc(s.player)}</b></td><td>${esc(s.type || '')}</td><td class="n">${s.xg.toFixed(2)}</td><td>${esc({ goal: 'Goal', saved: 'Saved', off: 'Off target', blocked: 'Blocked' }[s.outcome] || s.outcome)}</td></tr>`).join('');
    const GOAL = '<svg viewBox="0 0 16 16" class="ev-i ev-goal" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.6l2.6 1.9-1 3.1H6.4l-1-3.1z"/></svg>';
    const icon = (e) => {
      if (/goal/.test(e.type)) return GOAL;
      if (e.type === 'yellow') return '<span class="ev-card y" aria-label="Yellow card"></span>';
      if (e.type === 'red' || e.type === 'second_yellow') return `<span class="ev-card r${e.type === 'second_yellow' ? ' y2' : ''}" aria-label="Red card"></span>`;
      if (e.type === 'sub') return '<span class="ev-subicon" aria-label="Substitution"><b>&#9650;</b><b>&#9660;</b></span>';
      if (e.type === 'injury') return '<svg viewBox="0 0 16 16" class="ev-i ev-inj" aria-label="Injury"><rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/><path d="M8 5v6M5 8h6"/></svg>';
      return '';
    };
    const label = (e) => {
      if (e.type === 'sub') return `<span class="ev-name">${esc(e.player)}</span><small class="ev-out">${esc(e.playerOut || '')}</small>`;
      const what = { yellow: 'Yellow card', red: 'Red card', second_yellow: 'Second yellow', own_goal: 'Own goal', pen_goal: 'Penalty', injury: 'Injured' }[e.type];
      const sub = e.assist ? `Assist ${esc(e.assist)}` : what ? what : '';
      return `<span class="ev-name">${esc(e.player)}</span>${sub ? `<small>${sub}</small>` : ''}`;
    };
    const evs = m.events.filter((e) => e.type !== 'shootout');
    const kicks = m.events.filter((e) => e.type === 'shootout');
    const half = evs.some((e) => e.minute == null) ? -2 : evs.findIndex((e) => e.minute > 45);
    const rows = evs.map((e, i) => {
      const ht = i === half ? '<li class="ev ft ht"><span class="ev-min">HT</span></li>' : '';
      return `${ht}<li class="ev ${e.side === 'home' ? 'l' : 'r'} ev-${esc(e.type)}"><div class="ev-body">${icon(e)}<div>${label(e)}</div></div><span class="ev-min">${e.minute == null ? '' : `${e.minute}'`}</span></li>`;
    }).join('');
    const so = kicks.length ? `<li class="ev ft"><span class="ev-min">PENS</span></li>${kicks.map((e) => `<li class="ev ${e.side === 'home' ? 'l' : 'r'} ev-so"><div class="ev-body"><span class="so-mark ${e.scored ? 'ok' : 'no'}" aria-hidden="true">${e.scored ? '✓' : '✗'}</span><div><span class="ev-name">${esc(e.player)}</span>${e.scored ? '' : '<small>Saved</small>'}</div></div><span class="ev-min">${e.order}</span></li>`).join('')}` : '';
    const end = `<li class="ev ft"><span class="ev-min">${m.minutesPlayed < 90 ? esc(m.clock.split(':')[0]) + "'" : 'FT'}</span></li>${so}`;
    const shotTable = m.shots.length ? `<div class="table-wrap"><table class="data"><caption class="visually-hidden">Shots</caption><thead><tr><th>Team</th><th>Min</th><th>Player</th><th>Type</th><th class="n">xG</th><th>Result</th></tr></thead><tbody>${shots}</tbody></table></div>` : '';
    return `<div class="gm-events"><ol class="events">${rows}${half === -1 ? '<li class="ev ft ht"><span class="ev-min">HT</span></li>' : ''}${end}</ol>${shotTable}</div>`;
  }

  function body(f, m) {
    const tab = st.tab;
    if (tab === 'events') return events(f, m);
    if (tab === 'summary') return `<div class="gm-solo">${summary(m)}</div>`;
    const r = RING[tab];
    const rate = r && m.rings[r[0]] ? FC.chart.compare([{ label: r[1], values: m.rings[r[0]], fmt: (v) => `${v}%` }]) : '';
    if (!Object.keys(m.factsMaps).length) return `<div class="gm-solo">${rate}${list(m.facts[tab])}</div>`;
    const views = VIEWS[tab];
    const tools = `<div class="gm-tools"><div class="seg" role="group" aria-label="Map view">${views.map(([k, l]) => `<button type="button" data-gview="${k}" aria-pressed="${(st.view[tab] || views[0][0]) === k}">${l}</button>`).join('')}</div>
      <div class="seg" role="group" aria-label="Map style"><button type="button" data-graw="0" aria-pressed="${!st.raw}">Clean</button><button type="button" data-graw="1" aria-pressed="${st.raw}">Original</button></div></div>`;
    const centre = (tab === 'possession' ? threat(m) : '') + rate + list(m.facts[tab].filter((sec) => tab !== 'possession'));
    return `${tools}<div class="gm-grid">${sideCol(f, m, tab, 'home', 0)}<div class="gm-centre">${centre}</div>${sideCol(f, m, tab, 'away', 1)}</div>`;
  }

  function render(f, m) {
    return `${scoreboard(f, m)}
      <section class="panel gm" aria-label="Match facts"><div class="panel-head"><h2>Match facts</h2></div>
        <nav class="gm-tabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" role="tab" data-gtab="${k}" aria-selected="${st.tab === k}">${l}</button>`).join('')}</nav>
        <div class="gm-body" id="gm-body">${body(f, m)}</div></section>
      <section class="panel" id="mp-section">${FC.matchPlayer.render(f, m)}</section>`;
  }

  function after(root, f, m) {
    const box = root.querySelector('#gm-body');
    const redraw = () => { box.innerHTML = body(f, m); };
    root.querySelector('.gm-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-gtab]');
      if (!b) return;
      st.tab = b.dataset.gtab;
      root.querySelectorAll('[data-gtab]').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
      redraw();
    });
    box.addEventListener('click', (e) => {
      const v = e.target.closest('[data-gview]');
      const r = e.target.closest('[data-graw]');
      if (v) { st.view[st.tab] = v.dataset.gview; redraw(); }
      if (r) { st.raw = r.dataset.graw === '1'; redraw(); }
    });
    FC.matchPlayer.bind(root.querySelector('#mp-section'), f, m);
  }

  /** Test hook for screenshots: set tab/view/raw then re-render the current view. */
  FC.matchRich = { render, after, state: st, VIEWS };
})();
