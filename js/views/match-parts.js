/* Match Centre pitch panels: shot map, passing network, team heatmaps, events timeline, player ratings. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const U = () => FC.u;
  const col = (id) => FC.matchColor(id);
  let perfTeam = null;
  let perfPlayer = null;

  function pair(f, inner, caption) {
    const u = U();
    return `<div class="mc-pair">${[f.home, f.away].map((t) => `<figure><figcaption>${u.crest(t, 20)}<b>${u.esc(u.team(t).short)}</b>${caption ? `<span>${caption(t)}</span>` : ''}</figcaption>${inner(t)}</figure>`).join('')}</div>`;
  }

  function shotMap(f, m) {
    const u = U();
    const stat = (t) => {
      const s = m.shots.filter((x) => x.team === t);
      return `${s.length} shots · ${s.filter((x) => x.outcome === 'goal').length} goals · ${s.reduce((a, x) => a + x.xg, 0).toFixed(2)} xG`;
    };
    return `<div class="panel-head"><h2>Shot map</h2><p class="sub">Each side attacking up</p></div>
      ${pair(f, (t) => FC.pitch.svg(FC.pitch.shots(m.shots.filter((s) => s.team === t), col(t), u.personName), { orient: 'half', label: `${u.team(t).name} shots` }), stat)}
      <p class="pitch-key"><span><i class="fill"></i>Goal</span><span><i style="background:rgba(236,231,223,.25)"></i>Saved</span><span><i></i>Off target</span><span><i style="border-style:dashed"></i>Blocked</span><span>Bigger circle = better chance</span></p>`;
  }

  function passing(f, m) {
    const u = U();
    const acc = (t) => `${m.teamStats.passes[t === f.home ? 0 : 1]} passes · ${m.teamStats.passAcc[t === f.home ? 0 : 1]}%`;
    return `<div class="panel-head"><h2>Passing network</h2><p class="sub">Starting XI, average positions</p></div>
      ${pair(f, (t) => FC.pitch.svg(FC.pitch.passNet(m.passNetwork[String(t)], 'v', col(t)), { orient: 'v', label: `${u.team(t).name} passing network` }), acc)}
      <p class="pitch-key"><span>Thicker line = more passes between the pair</span><span>Bigger circle = more touches</span></p>`;
  }

  function heatmaps(f, m) {
    const u = U();
    const poss = (t) => `${m.possession[t === f.home ? 0 : 1]}% possession`;
    return `<div class="panel-head"><h2>Team heatmaps</h2><p class="sub"></p></div>
      ${pair(f, (t) => {
        const g = m.heatmaps && m.heatmaps.team && m.heatmaps.team[String(t)];
        if (g && typeof g === 'string') return `<img class="heat-img" src="${u.esc(g)}" alt="${u.esc(u.team(t).name)} heatmap" onerror="this.replaceWith(Object.assign(document.createElement('p'),{className:'empty-note',textContent:'Heatmap image missing'}))">`;
        return FC.pitch.svg(FC.pitch.heat(g, 'v', col(t)), { orient: 'v', label: `${u.team(t).name} heatmap` });
      }, poss)}`;
  }

  const ICON = {
    goal: '<svg viewBox="0 0 16 16" class="ev-i ev-goal" aria-hidden="true"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.6l2.6 1.9-1 3.1H6.4l-1-3.1z"/></svg>',
    yellow: '<i class="ev-card y" aria-hidden="true"></i>', red: '<i class="ev-card r" aria-hidden="true"></i>',
    sub: '<span class="ev-subicon" aria-hidden="true"><b>▲</b><b>▼</b></span>',
    injury: '<svg viewBox="0 0 16 16" class="ev-i ev-inj" aria-hidden="true"><rect x="2.5" y="2.5" width="11" height="11" rx="2.5"/><path d="M8 5v6M5 8h6"/></svg>',
  };

  function timeline(f, m) {
    const u = U();
    const label = { goal: 'Goal', pen_goal: 'Penalty goal', own_goal: 'Own goal', yellow: 'Yellow card', red: 'Red card', sub: 'Substitution', injury: 'Injury' };
    const rows = m.events.filter((e) => e.type !== 'shootout').map((e) => {
      const left = e.team === f.home;
      const who = u.player(e.player);
      const icon = /goal/.test(e.type) ? ICON.goal : ICON[e.type] || '';
      const detail = e.type === 'sub' ? `<span class="ev-name">${u.esc(u.personName(e.player))}</span><small class="ev-off">${u.esc(u.personName(e.playerOut))}</small>`
        : `<span class="ev-name">${u.esc(u.personName(e.player))}${e.type === 'pen_goal' ? ' (pen)' : e.type === 'own_goal' ? ' (og)' : ''}</span>${e.assist ? `<small>Assist ${u.esc(u.personName(e.assist))}</small>` : e.type === 'injury' ? '<small>Injured</small>' : ''}`;
      return `<li class="ev ${left ? 'l' : 'r'} ev-${e.type}" aria-label="${e.minute} minutes, ${label[e.type] || e.type}">
        <div class="ev-body" ${who ? `data-player="${who.id}" tabindex="0"` : ''}>${icon}<div>${detail}</div>${who ? u.portrait(who, 34) : ''}</div>
        <span class="ev-min">${e.minute}'</span></li>`;
    }).join('');
    return `<div class="panel-head"><h2>Events</h2><p class="sub">${u.esc(u.team(f.home).short)} left · ${u.esc(u.team(f.away).short)} right</p></div>
      <ol class="events">${rows}<li class="ev ft"><span class="ev-min">FT</span></li>${shootout(f, m)}</ol>`;
  }

  /** Penalty shootout kicks in taking order, under full time: tick for scored, cross for saved or missed. */
  function shootout(f, m) {
    const u = U();
    const kicks = m.events.filter((e) => e.type === 'shootout');
    if (!kicks.length) return '';
    const mark = (ok) => `<span class="so-mark ${ok ? 'ok' : 'no'}" aria-hidden="true">${ok ? '✓' : '✗'}</span>`;
    return `<li class="ev ft"><span class="ev-min">PENS</span></li>${kicks.map((e) => {
      const who = u.player(e.player);
      return `<li class="ev ${e.team === f.home ? 'l' : 'r'} ev-so" aria-label="Penalty ${e.scored ? 'scored' : 'missed'}">
        <div class="ev-body" ${who ? `data-player="${who.id}" tabindex="0"` : ''}>${mark(e.scored)}<div><span class="ev-name">${u.esc(u.personName(e.player))}</span>${e.scored ? '' : '<small>Saved</small>'}</div>${who ? u.portrait(who, 34) : ''}</div>
        <span class="ev-min">${e.order}</span></li>`;
    }).join('')}`;
  }

  const POS_ORDER = ['GK', 'RB', 'RWB', 'CB', 'LB', 'LWB', 'CDM', 'CM', 'RM', 'CAM', 'LM', 'RW', 'LW', 'CF', 'ST'];

  function performance(f, m) {
    const u = U();
    if (perfTeam !== f.home && perfTeam !== f.away) perfTeam = u.us();
    const lines = m.players.filter((p) => p.team === perfTeam)
      .sort((a, b) => (b.mins >= 45) - (a.mins >= 45) || POS_ORDER.indexOf(a.pos) - POS_ORDER.indexOf(b.pos));
    if (!lines.find((p) => p.id === perfPlayer)) perfPlayer = (lines.find((p) => p.motm) || lines[0] || {}).id;
    const name = (p) => p.name || u.personName(p.id);
    const rows = lines.map((p) => `<tr data-line="${p.id}" class="${p.id === perfPlayer ? 'sel' : ''}" tabindex="0" aria-selected="${p.id === perfPlayer}">
      <td><span class="pos-tag pg-${u.posGroup(p.pos)}">${p.pos}</span></td><td><b>${u.esc(name(p))}</b>${p.motm ? ' <span class="chip">POTM</span>' : ''}${p.mins < 45 ? ' <small class="muted">sub</small>' : ''}</td>
      <td class="n"><span class="rating ${u.ratingClass(p.rating)}">${p.rating.toFixed(1)}</span></td><td class="n">${p.mins}</td><td class="n">${p.goals}</td><td class="n">${p.assists}</td>
      <td class="n">${p.shots}</td><td class="n">${p.passes}</td><td class="n">${p.passAcc}%</td><td class="n">${p.keyPasses}</td><td class="n">${p.dribbles}</td><td class="n">${p.tackles}</td><td class="n">${p.interceptions}</td><td class="n">${p.distanceKm}</td></tr>`).join('');
    const sel = lines.find((p) => p.id === perfPlayer);
    return `<div class="panel-head"><h2>Player performance</h2>
        <div class="seg" role="group" aria-label="Team">${[f.home, f.away].map((t) => `<button type="button" data-perf-team="${t}" aria-pressed="${t === perfTeam}">${u.esc(u.team(t).name)}</button>`).join('')}</div></div>
      <div class="perf"><div class="table-wrap"><table class="data perf-table"><thead><tr><th>Pos</th><th>Player</th><th class="n">Rating</th><th class="n">Min</th><th class="n">G</th><th class="n">A</th><th class="n">Shots</th><th class="n">Passes</th><th class="n">Pass %</th><th class="n">Key</th><th class="n">Drib</th><th class="n">Tkl</th><th class="n">Int</th><th class="n">mi</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${sel ? detail(f, m, sel) : ''}</div>`;
  }

  function detail(f, m, p) {
    const u = U();
    const sq = u.player(p.id);
    const grid = m.heatmaps && m.heatmaps.players && m.heatmaps.players[String(p.id)];
    const team = m.players.filter((x) => x.team === p.team);
    const tot = (k) => team.reduce((s, x) => s + (x[k] || 0), 0);
    const stats = [['Goals', p.goals, tot('goals')], ['Assists', p.assists, tot('assists')], ['Shots', p.shots, tot('shots')], ['Shot accuracy', `${p.shotAcc}%`, ''],
      ['Passes', p.passes, tot('passes')], ['Pass accuracy', `${p.passAcc}%`, ''], ['Dribbles', p.dribbles, tot('dribbles')], ['Tackles', p.tackles, tot('tackles')],
      ['Possession won', p.possWon, tot('possWon')], ['Possession lost', p.possLost, tot('possLost')], ['Distance (mi)', p.distanceKm, ''], ['Sprint (mi)', p.sprintKm, ''],
      ...(p.pos === 'GK' ? [['Saves', p.saves, '']] : [])];
    return `<aside class="perf-detail" aria-live="polite">
      <header>${sq ? u.portrait(sq, 64) : `<span class="face-fb" style="--s:64px">${u.esc(u.initials(p.name || '?'))}</span>`}
        <div><b>${u.esc(p.name || u.personName(p.id))}</b><small>${p.pos} · ${p.mins} min</small></div><span class="rating big ${u.ratingClass(p.rating)}">${p.rating.toFixed(1)}</span></header>
      ${grid && grid.v ? FC.pitch.svg(FC.pitch.heat(grid, 'v', col(p.team)), { orient: 'v', label: 'Player heatmap', cls: 'perf-heat' }) : '<p class="empty-note">No player heatmap for this side.</p>'}
      <table class="perf-stats"><thead><tr><th></th><th class="n">Player</th><th class="n">Team</th></tr></thead><tbody>${stats.map(([l, a, b]) => `<tr><td>${l}</td><td class="n">${a}</td><td class="n">${b}</td></tr>`).join('')}</tbody></table>
      ${sq ? `<button type="button" class="link-btn" data-player="${sq.id}">Open full profile</button>` : ''}</aside>`;
  }

  function bind(root, f, m) {
    const box = root.querySelector('#mc-perf');
    if (!box) return;
    const redraw = () => { box.innerHTML = performance(f, m); };
    box.addEventListener('click', (e) => {
      const t = e.target.closest('[data-perf-team]');
      const r = e.target.closest('[data-line]');
      if (t) { perfTeam = Number(t.dataset.perfTeam); perfPlayer = null; redraw(); }
      else if (r) { perfPlayer = Number(r.dataset.line); redraw(); const n = box.querySelector(`[data-line="${perfPlayer}"]`); if (n) n.focus(); }
    });
    box.addEventListener('keydown', (e) => {
      const r = e.target.closest('[data-line]');
      if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); r.click(); }
    });
  }

  FC.matchParts = { shotMap, passing, heatmaps, timeline, performance, bind };
})();
