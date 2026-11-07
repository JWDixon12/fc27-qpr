/* Graphics an article can embed with a directive block (one line on its own in the .md):
     ::totw <period>                 Team of the Week on a pitch (headshots, clubs, ratings, goal / assist icons)
     ::scorecard <matchId>           score, scorers and the headline stat bars
     ::heatmap <matchId> <id> [id]   player heatmaps with their match line
     ::ratings <matchId>             our player ratings as a bar chart
   Unknown or unresolvable directives render nothing, so a typo never breaks a story. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;
  const U = () => FC.u;
  const esc = (s) => FC.u.esc(s);

  const BALL = '<svg viewBox="0 0 16 16" class="ng-i ng-ball" aria-hidden="true"><circle cx="8" cy="8" r="6.6"/><path d="M8 4.7l2.5 1.8-.95 2.95h-3.1L5.5 6.5z"/></svg>';
  const BOOT = '<svg viewBox="0 0 256 256" class="ng-i ng-boot" aria-hidden="true"><path d="M70.8,184H32a8,8,0,0,1,0-16H70.8a8,8,0,1,1,0,16Zm32,16H48a8,8,0,0,0,0,16h54.8a8,8,0,1,0,0-16Zm128.36-33.37-28.63-14.31A47.74,47.74,0,0,1,176,109.39V80a8,8,0,0,0-7.93-8A48.05,48.05,0,0,1,120,24.07a8,8,0,0,0-12.83-6.44L45.11,64.68a4,4,0,0,0-.41,6l51.44,51.44a8.19,8.19,0,0,1,.6,11.09,8,8,0,0,1-11.71.43l-53-53a4,4,0,0,0-6.44,1.09,16,16,0,0,0,3.12,18.22L142.4,213.66a8,8,0,0,0,5.66,2.34H224a16,16,0,0,0,16-16V180.94A15.92,15.92,0,0,0,231.16,166.63Z"/></svg>';
  const icons = (goals, assists) => `${BALL.repeat(goals || 0)}${BOOT.repeat(assists || 0)}`;
  const contribution = (g, a) => [g ? `${g} goal${g > 1 ? 's' : ''}` : '', a ? `${a} assist${a > 1 ? 's' : ''}` : ''].filter(Boolean).join(', ');

  function face(src, name, cls) {
    const ini = esc(U().initials(name || '?'));
    return src ? `<img class="${cls}" src="${esc(src)}" alt="" loading="lazy" onerror="this.outerHTML='<span class=&quot;${cls} ng-fb&quot;>${ini}</span>'">`
      : `<span class="${cls} ng-fb">${ini}</span>`;
  }

  /* ------------------------------------------------------------------ Team of the Week */
  const ROW = { ST: 'FW', CF: 'FW', LS: 'FW', RS: 'FW', LF: 'FW', RF: 'FW', LW: 'AM', RW: 'AM', CAM: 'AM', LAM: 'AM', RAM: 'AM',
    LM: 'MID', RM: 'MID', CM: 'MID', LCM: 'MID', RCM: 'MID', CDM: 'DM', LDM: 'DM', RDM: 'DM',
    LB: 'DEF', RB: 'DEF', CB: 'DEF', LCB: 'DEF', RCB: 'DEF', LWB: 'DEF', RWB: 'DEF', GK: 'GK' };
  const ORDER = ['FW', 'AM', 'MID', 'DM', 'DEF', 'GK'];
  const side = (pos) => (/^L/.test(pos || '') ? -1 : /^R/.test(pos || '') ? 1 : 0);

  function totw(period) {
    const A = (D().awards || []).filter((a) => /team_of_the_week/.test(a.award));
    const a = A.find((x) => x.period === period) || (!period && A[A.length - 1]);
    if (!a) return '';
    const LINE = (p) => ({ FW: 'FW', AM: 'MID', MID: 'MID', DM: 'MID', DEF: 'DEF', GK: 'GK' })[ROW[p.pos] || p.line] || p.line;
    const LIFT = { AM: -6, DM: 6 };
    const lr = (p) => { const x = side(p.pos); return x || ({ LM: -1, RM: 1 })[p.pos] || 0; };
    const rows = ['FW', 'MID', 'DEF', 'GK'].map((l) => a.xi.filter((p) => LINE(p) === l)
      .sort((x, y) => lr(x) - lr(y) || (LIFT[ROW[x.pos]] || 0) - (LIFT[ROW[y.pos]] || 0))).filter((r) => r.length);
    const ys = { 4: [12, 40, 68, 90], 3: [15, 50, 88] }[rows.length] || rows.map((_, i) => 10 + (80 * i) / Math.max(1, rows.length - 1));
    const nodes = rows.map((r, i) => r.map((p, j) => {
      const n = r.length;
      const x = n >= 5 ? 9 + (82 * j) / (n - 1) : ((j + 1) * 100) / (n + 1);
      const arc = n >= 5 ? [-7, 3, 9, 3, -7, 0][Math.min(j, n - 1 - j)] : 0;   // wide men high, centre deep
      const y = ys[i] + (n >= 5 ? arc : (LIFT[ROW[p.pos]] || 0));
      const potw = p.id === a.playerOfTheWeek;
      return `<div class="ng-node${potw ? ' potw' : ''}" style="left:${x}%;top:${y}%">
          <div class="ng-face-wrap">${face(p.portrait, p.name, 'ng-face')}<span class="ng-rate ${U().ratingClass(p.rating)}">${p.rating.toFixed(1)}</span>
            ${p.team ? `<span class="ng-crest">${U().crest(p.team, 22).replace(/ data-team="\d+"/, '')}</span>` : ''}</div>
          <b class="ng-name">${esc(p.name)}</b><small class="ng-club">${esc(U().team(p.team).short || p.club)}</small>
          ${p.goals || p.assists ? `<span class="ng-icons" title="${esc(contribution(p.goals, p.assists))}">${icons(p.goals, p.assists)}</span>` : ''}</div>`;
    }).join('')).join('');
    const star = a.xi.find((p) => p.id === a.playerOfTheWeek);
    return `<figure class="ng ng-totw"><figcaption class="ng-cap"><span>Team of the Week</span><b>${esc(a.period)} · ${esc(a.formation)}</b></figcaption>
      <div class="ng-pitch"><svg class="ng-lines" viewBox="0 0 68 100" preserveAspectRatio="none" aria-hidden="true">
        <rect x="1" y="1" width="66" height="98"/><line x1="1" y1="50" x2="67" y2="50"/><circle cx="34" cy="50" r="9"/>
        <rect x="14" y="1" width="40" height="16"/><rect x="24" y="1" width="20" height="6"/>
        <rect x="14" y="83" width="40" height="16"/><rect x="24" y="93" width="20" height="6"/></svg>${nodes}</div>
      ${star ? `<p class="ng-foot"><span class="ng-star">★</span> Player of the Week: <b>${esc(star.name)}</b> (${esc(star.club)}), ${star.rating.toFixed(1)}${contribution(star.goals, star.assists) ? `, ${contribution(star.goals, star.assists)}` : ''}</p>` : ''}
      <p class="ng-key">${BALL} goal <span></span>${BOOT} assist</p></figure>`;
  }

  /* ------------------------------------------------------------------ Match graphics */
  const match = (id) => (D().matches || {})[id];
  const fixture = (id) => D().fixtures.find((f) => f.id === id);
  const factVal = (m, tab, label) => {
    for (const sec of (m.facts || {})[tab] || []) for (const r of sec.rows) if (r.label === label) return r.values;
    return null;
  };

  function scorecard(id) {
    const m = match(id), f = fixture(id);
    if (!m || !f) return '';
    const u = U();
    const goals = (t) => m.events.filter((e) => /goal/.test(e.type) && e.team === t)
      .map((e) => `<li>${BALL}${esc(u.personName(e.player))}${e.minute == null ? '' : ` ${e.minute}'`}</li>`).join('');
    const rows = [['Possession', m.possession[0] == null ? null : m.possession, (v) => `${v}%`], ['Shots', factVal(m, 'shooting', 'Total Shots')],
      ['On target', factVal(m, 'shooting', 'On Target')], ['Expected goals', m.xg, (v) => Number(v).toFixed(2)],
      ['Passes', factVal(m, 'passing', 'Total Passes')], ['Tackles won', factVal(m, 'summary', 'Tackles Won')]]
      .filter((r) => r[1]).map(([label, values, fmt]) => ({ label, values, fmt }));
    return `<figure class="ng ng-score"><figcaption class="ng-cap"><span>${esc(u.comp(f.comp).name)}</span><b>${esc(u.date(f.date))}</b></figcaption>
      <div class="ng-sb">${u.crest(f.home, 56)}<div class="ng-sb-mid"><b>${m.score[0]}<i>–</i>${m.score[1]}</b>${m.pens ? `<small>${m.pens[0]}–${m.pens[1]} on penalties</small>` : '<small>Full time</small>'}</div>${u.crest(f.away, 56)}</div>
      <div class="ng-sb-names"><b>${esc(u.team(f.home).name)}</b><b>${esc(u.team(f.away).name)}</b></div>
      <div class="ng-goals"><ul>${goals(f.home)}</ul><ul>${goals(f.away)}</ul></div>
      ${FC.chart.compare(rows)}</figure>`;
  }

  function lineOf(m, pid) { return m.players.find((p) => p.id === pid); }

  function heatmap(id, ...pids) {
    const m = match(id);
    if (!m) return '';
    const u = U();
    const cards = pids.map(Number).map((pid) => {
      const p = lineOf(m, pid);
      if (!p || !p.maps || !p.maps.heat) return '';
      const sq = (D().squad || []).find((s) => s.id === pid);
      const stats = [['Min', p.mins], ['Passes', `${p.passes} · ${p.passAcc}%`], ['Dribbles', p.dribbles], ['Key passes', p.keyPasses],
        ['Tackles', p.tackles]].filter((s) => s[1] != null);
      return `<div class="ng-heat">${face(sq ? sq.portrait : null, p.name, 'ng-hface')}
        <div class="ng-heat-id"><b>${esc(p.name)}</b><small>${esc(p.pos)}${contribution(p.goals, p.assists) ? ` · ${esc(contribution(p.goals, p.assists))}` : ''}</small>
          ${p.goals || p.assists ? `<span class="ng-icons">${icons(p.goals, p.assists)}</span>` : ''}</div>
        <span class="ng-rate big ${u.ratingClass(p.rating)}">${p.rating.toFixed(1)}</span>
        <img class="ng-heat-img" src="${esc(p.maps.heat)}.webp" alt="${esc(p.name)} heatmap" loading="lazy">
        <dl class="ng-heat-stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></div>`;
    }).join('');
    return cards ? `<figure class="ng ng-heats"><figcaption class="ng-cap"><span>Heatmap</span><b>Where they played</b></figcaption><div class="ng-heat-row">${cards}</div></figure>` : '';
  }

  function ratings(id) {
    const m = match(id);
    if (!m) return '';
    const u = U();
    const ours = m.players.filter((p) => p.team === D().meta.clubId && p.mins > 0).sort((a, b) => b.rating - a.rating);
    return `<figure class="ng ng-rat"><figcaption class="ng-cap"><span>Player ratings</span><b>${esc(u.team(D().meta.clubId).name)}</b></figcaption>
      <ol class="ng-bars">${ours.map((p) => `<li${p.motm ? ' class="motm"' : ''}><span class="ng-bn">${esc(p.name)}${p.mins < 45 ? ' <small>sub</small>' : ''}</span>
        <span class="ng-bt"><i class="${u.ratingClass(p.rating)}" style="width:${p.rating * 10}%"></i></span>
        <b class="ng-bv">${p.rating.toFixed(1)}</b>${p.goals || p.assists ? `<span class="ng-icons">${icons(p.goals, p.assists)}</span>` : '<span></span>'}</li>`).join('')}</ol></figure>`;
  }

  const KINDS = { totw: (args) => totw(args.join(' ')), scorecard: ([id]) => scorecard(id), heatmap: ([id, ...p]) => heatmap(id, ...p), ratings: ([id]) => ratings(id) };

  /** A '::kind args' block -> HTML ('' when the data is missing). */
  function render(block) {
    const [kind, ...args] = block.slice(2).trim().split(/\s+/);
    try { return (KINDS[kind] || (() => ''))(args); } catch (e) { return ''; }
  }

  FC.newsGfx = { render, totw };
})();
