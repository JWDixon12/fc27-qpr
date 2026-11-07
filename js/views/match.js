/* Match Centre: pick a captured match, then scoreboard, momentum, xG race, team stats, and the
   pitch panels (match-parts.js). Our club is always red (--L/--R map to left/right team colours). */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;

  const colorOf = (id) => (FC.u.isUs(id) ? 'var(--home)' : 'var(--away)');

  function picker(list, cur) {
    const U = FC.u;
    return `<nav class="mc-picker" aria-label="Choose a match">${list.map(({ f }) => {
      const r = U.result(f);
      return `<a href="#match/${f.id}" class="mc-ticket ${f.id === cur ? 'on' : ''}" style="--c:${U.comp(f.comp).color}" ${f.id === cur ? 'aria-current="page"' : ''}>
        <small>${U.date(f.date, 'short')} · ${U.esc(U.comp(f.comp).name)}</small>
        <span class="mt-row">${U.crest(f.home, 24)}<b>${f.hg}–${f.ag}${U.pensTag(f)}</b>${U.crest(f.away, 24)}<span class="mt-res">${U.resChip(r)}</span></span></a>`;
    }).join('')}</nav>`;
  }

  function scoreboard(f, m) {
    const U = FC.u;
    const goals = (t) => m.events.filter((e) => /goal/.test(e.type) && e.team === t)
      .map((e) => `<li>${U.esc(U.personName(e.player))} ${e.minute}'${e.type === 'pen_goal' ? ' (pen)' : e.type === 'own_goal' ? ' (og)' : ''}</li>`).join('');
    const reds = (t) => m.events.filter((e) => e.type === 'red' && e.team === t).map((e) => `<li class="red-card">${U.esc(U.personName(e.player))} ${e.minute}'</li>`).join('');
    const side = (t, i) => `<div class="sb-side sb-${i ? 'r' : 'l'}">${U.crest(t, 110, 'sb-crest')}<h2${U.hasClub(t) ? ` data-team="${t}"` : ''}>${U.esc(U.team(t).name)}</h2>
      <p class="sb-xg">${m.xg[i].toFixed(2)} xG${m.possession[i] == null ? '' : ` · ${m.possession[i]}% possession`}</p><ul class="sb-goals">${goals(t)}${reds(t)}</ul></div>`;
    return `<section class="scoreboard" aria-label="Final score">
      <header>${U.compChip(f.comp)}<span>${U.esc(f.round)}</span><span>${U.date(f.date, 'day')} ${U.parseDate(f.date).getFullYear()}</span><span>${f.venue === 'H' ? U.esc(D().club.stadium) : 'Away'}</span></header>
      <div class="sb-main">${side(f.home, 0)}<div class="sb-score"><b>${m.score[0]}</b><i>:</i><b>${m.score[1]}</b><small>${m.pens ? `${m.pens[0]}–${m.pens[1]} on penalties` : 'Full time'}</small></div>${side(f.away, 1)}</div></section>`;
  }

  function teamStats(f, m) {
    const s = m.teamStats;
    const pct = (v) => `${v}%`;
    const rows = [
      ['Possession', m.possession, pct], ['Expected goals', m.xg, (v) => v.toFixed(2)], ['Shots', s.shots], ['On target', s.onTarget],
      ['Passes', s.passes], ['Pass accuracy', s.passAcc, pct], ['Dribble success', s.dribbleSuccess, pct], ['Tackles', s.tackles],
      ['Tackles won', s.tacklesWon], ['Interceptions', s.interceptions], ['Saves', s.saves],
      ['Ball recovery (sec)', s.ballRecoverySec, (v) => `${v}s`, true], ['Fouls', s.fouls, null, true], ['Offsides', s.offsides, null, true],
      ['Corners', s.corners], ['Free kicks', s.freeKicks], ['Penalties', s.penalties], ['Yellow cards', s.yellows, null, true], ['Red cards', s.reds, null, true],
      ['Line breaks through', s.lineBreaksThrough], ['Line breaks around', s.lineBreaksAround], ['Line breaks over', s.lineBreaksOver], ['Line breaks attempted', s.lineBreaksAttempted],
    ].filter((r) => Array.isArray(r[1]));
    const order = ['Possession', 'Shots', 'On target', 'Expected goals', 'Passes', 'Tackles'];
    const sorted = [...order.map((l) => rows.find((r) => r[0] === l)).filter(Boolean), ...rows.filter((r) => !order.includes(r[0]))];
    return FC.chart.compareFold(sorted.map(([label, values, fmt, lowerBetter]) => ({ label: label === 'Expected goals' ? 'xG' : label, values, fmt: fmt || undefined, lowerBetter })), 6);
  }

  FC.views.match = {
    render(arg) {
      const U = FC.u;
      const list = FC.stats.captured({ extras: true });
      if (!list.length) return '<header class="page-head"><h1>Match Centre</h1></header><p class="empty-note">No matches played yet.</p>';
      const cur = list.find((x) => x.f.id === arg) || list[list.length - 1];
      const { f, m } = cur;
      if (m.facts) {
        return `<div class="mc mc-rich" style="--L:${m.sides.home.color};--R:${m.sides.away.color}">
          <header class="page-head"><div><h1>Match Centre</h1></div></header>
          ${picker(list, f.id)}${FC.matchRich.render(f, m)}</div>`;
      }
      const L = colorOf(f.home), R = colorOf(f.away);
      const P = FC.matchParts;
      return `<div class="mc" style="--L:${L};--R:${R}">
        <header class="page-head"><div><h1>Match Centre</h1></div></header>
        ${picker(list, f.id)}
        ${scoreboard(f, m)}
        <div class="g12 mc-grid">
          <div class="stack mc-stack" style="--span:6">
            <section class="panel mc-threat"><div class="panel-head"><h2>Threat</h2><p class="sub">${U.esc(U.team(f.home).short)} up · ${U.esc(U.team(f.away).short)} down</p></div><div class="chart" id="mc-mo"></div></section>
            <section class="panel mc-xg"><div class="panel-head"><h2>Expected goals race</h2></div><div class="chart" id="mc-xg"></div></section>
            <section class="panel mc-shot">${P.shotMap(f, m)}</section>
          </div>
          <section class="panel mc-ev" style="--span:6">${P.timeline(f, m)}</section>
          <section class="panel mc-stats" style="--span:12"><div class="panel-head"><h2>Team stats</h2><p class="sub cmp-key"><span><i style="--c:${L}"></i>${U.esc(U.team(f.home).name)}</span><span><i style="--c:${R}"></i>${U.esc(U.team(f.away).name)}</span></p></div>${teamStats(f, m)}</section>
          <section class="panel mc-pass" style="--span:6">${P.passing(f, m)}</section>
          <section class="panel mc-heat" style="--span:6">${P.heatmaps(f, m)}</section>
          <section class="panel mc-perf" style="--span:12" id="mc-perf">${P.performance(f, m)}</section>
        </div></div>`;
    },
    after(root, arg) {
      const U = FC.u;
      const list = FC.stats.captured({ extras: true });
      if (!list.length) return;
      const { f, m } = list.find((x) => x.f.id === arg) || list[list.length - 1];
      if (m.facts) { FC.matchRich.after(root, f, m); return; }
      const names = [U.team(f.home).short, U.team(f.away).short];
      const goals = m.events.filter((e) => /goal/.test(e.type)).map((e) => ({ minute: e.minute, home: e.team === f.home, name: U.personName(e.player) }));
      FC.chart.mount(root.querySelector('#mc-mo'), (w) => FC.chart.momentum(m.threat, goals, w, names, [colorOf(f.home), colorOf(f.away)]));
      FC.chart.mount(root.querySelector('#mc-xg'), (w) => FC.chart.xgRace([
        { name: U.team(f.home).name, color: colorOf(f.home), shots: m.shots.filter((s) => s.team === f.home) },
        { name: U.team(f.away).name, color: colorOf(f.away), shots: m.shots.filter((s) => s.team === f.away) },
      ], w, U.personName));
      FC.matchParts.bind(root, f, m);
    },
  };
  FC.matchColor = colorOf;
})();
