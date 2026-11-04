/* Stats tab, phone first: a sticky control bar (competition, Totals/Per 90, minimum minutes), category
   chips (one category visible at a time), top-5 leaderboards that expand in place, one larger chart
   where it adds something, and a sortable squad table. Pre-season it shows real 2025/26 numbers for
   the current squad plus attribute leaders, and switches to this season after the first captured match. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;
  const esc = (s) => FC.u.esc(s);
  const st = { comp: 'all', per90: false, minMins: 270, cat: 'overview', open: new Set(), sort: 'mins', dir: -1 };
  const CATS = [['overview', 'Overview'], ['attack', 'Attack'], ['passing', 'Passing'], ['defending', 'Defending'], ['goalkeeping', 'Goalkeeping'],
    ['physical', 'Physical'], ['discipline', 'Discipline'], ['table', 'Squad table']];
  // [key, label, decimals, kind] kind: 'avg' (not per-90), 'count' (per-90 capable), 'raw' (never per-90)
  const BOARDS = {
    attack: [['goals', 'Goals'], ['assists', 'Assists'], ['shots', 'Shots'], ['xa', 'Expected assists', 2], ['dribbles', 'Dribbles']],
    passing: [['passes', 'Passes'], ['passAcc', 'Pass accuracy', 1, 'avg', '%'], ['keyPasses', 'Key passes'], ['lineBreaks', 'Line breaks'], ['xa', 'Expected assists', 2]],
    defending: [['tackles', 'Tackles'], ['interceptions', 'Interceptions'], ['possWon', 'Possession won'], ['duelsWon', 'Duels won']],
    goalkeeping: [['saves', 'Saves', 0, 'count', '', 'GK'], ['cleanSheets', 'Clean sheets', 0, 'raw', '', 'GK'], ['rating', 'Average rating', 2, 'avg', '', 'GK']],
    physical: [['distanceKm', 'Distance covered', 1, 'count', ' mi'], ['sprintKm', 'Sprint distance', 1, 'count', ' mi'], ['mins', 'Minutes', 0, 'raw']],
    discipline: [['yellows', 'Yellow cards', 0, 'raw'], ['reds', 'Red cards', 0, 'raw'], ['fouls', 'Fouls'], ['possLost', 'Possession lost']],
  };

  function val(row, key, kind) {
    const v = row[key];
    if (v == null) return null;
    if (!st.per90 || kind === 'avg' || kind === 'raw') return v;
    return row.mins >= st.minMins ? (v / row.mins) * 90 : null;
  }

  /** Top-5 leaderboard with portrait, bar and value; leader highlighted; "See all" expands in place. */
  function board(title, rows, key, dp, kind, unit, sub) {
    const U = FC.u;
    const list = rows.map((r) => ({ r, v: val(r, key, kind) })).filter((x) => x.v != null && x.v > 0).sort((a, b) => b.v - a.v);
    if (!list.length) return '';
    const id = `${st.cat}:${key}`;
    const open = st.open.has(id);
    const max = list[0].v;
    const fmt = (v) => `${FC.u.num(v, st.per90 && kind !== 'avg' && kind !== 'raw' ? 2 : dp || 0)}${unit || ''}`;
    return `<section class="lb"><header class="lb-head"><h3>${esc(title)}${st.per90 && kind !== 'avg' && kind !== 'raw' ? ' <small>per 90</small>' : ''}</h3>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</header>
      <ol class="lb-list">${(open ? list : list.slice(0, 5)).map(({ r, v }, i) => {
        const p = U.player(r.id) || { name: '?', short: '?' };
        return `<li><button type="button" class="lb-row ${i === 0 ? 'lead' : ''}" data-player="${r.id}">
          <span class="lb-rank">${i + 1}</span>${U.portrait(p, 40)}<span class="lb-name"><b>${esc(p.name)}</b><i class="lb-bar"><i style="width:${(100 * v) / max}%"></i></i></span>
          <span class="lb-val">${fmt(v)}</span></button></li>`;
      }).join('')}</ol>${list.length > 5 ? `<button type="button" class="lb-more" data-lbmore="${esc(id)}">${open ? 'Show top 5' : `See all ${list.length}`}</button>` : ''}</section>`;
  }

  function tiles(t) {
    const U = FC.u;
    const items = [['Record', `${t.w}-${t.d}-${t.l}`, 'W-D-L'], ['Goals', `${t.gf}–${t.ga}`, 'for–against'], ['xG', `${t.xgf.toFixed(1)}–${t.xga.toFixed(1)}`, 'for–against'],
      ['Clean sheets', t.cs, `in ${t.n}`], ['Possession', `${Math.round(t.poss)}%`, 'average']];
    return `<dl class="st-tiles">${items.map(([l, v, s]) => `<div><dt>${l}</dt><dd>${esc(v)}</dd><small>${esc(s)}</small></div>`).join('')}</dl>`;
  }

  function leadersStrip(rows) {
    const U = FC.u;
    const pick = [['goals', 'Goals', 0], ['assists', 'Assists', 0], ['rating', 'Avg rating', 2, 'avg'], ['tackles', 'Tackles', 0], ['mins', 'Minutes', 0, 'raw']];
    const cards = pick.map(([k, l, dp, kind]) => {
      const best = rows.map((r) => ({ r, v: val(r, k, kind || 'count') })).filter((x) => x.v != null && x.v > 0).sort((a, b) => b.v - a.v)[0];
      if (!best) return '';
      const p = U.player(best.r.id);
      return `<li><button type="button" class="ld-card" data-player="${best.r.id}">${U.portrait(p, 72)}<span>${esc(l)}</span><b>${FC.u.num(best.v, st.per90 && !kind ? 2 : dp)}</b><small>${esc(p.short)}</small></button></li>`;
    }).join('');
    return cards ? `<section class="st-sec"><h3 class="st-h">Leaders</h3><ol class="ld-strip">${cards}</ol></section>` : '';
  }

  function xgChart() { return '<section class="st-sec"><h3 class="st-h">Expected goals by match</h3><div class="chart" id="st-xg"></div></section>'; }
  function raceChart() { return '<section class="st-sec"><h3 class="st-h">Scoring race</h3><div class="chart" id="st-race"></div></section>'; }

  function squadTable(rows) {
    const U = FC.u;
    const cols = [['pos', 'Pos', null], ['apps', 'MP', 0], ['mins', 'Min', 0], ['goals', 'G', 0], ['assists', 'A', 0], ['rating', 'Rtg', 2], ['shots', 'Sh', 0],
      ['keyPasses', 'KP', 0], ['tackles', 'Tkl', 0], ['interceptions', 'Int', 0], ['distanceKm', 'mi', 1], ['yellows', 'Y', 0], ['reds', 'R', 0]];
    const list = rows.map((r) => ({ ...r, pos: (U.player(r.id) || {}).pos || '' }));
    list.sort((a, b) => {
      const x = a[st.sort], y = b[st.sort];
      if (typeof x === 'string') return String(x).localeCompare(String(y)) * st.dir;
      return ((x == null ? -1 : x) - (y == null ? -1 : y)) * st.dir;
    });
    const th = (k, l) => `<th class="${k === 'pos' ? '' : 'n'}" data-stsort="${k}" aria-sort="${st.sort === k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}"><button type="button">${l}</button></th>`;
    return `<div class="table-wrap st-wrap"><table class="data st-table"><thead><tr><th class="st-name">Player</th>${cols.map(([k, l]) => th(k, l)).join('')}</tr></thead><tbody>
      ${list.map((r) => { const p = U.player(r.id) || { short: '?' }; return `<tr data-player="${r.id}" tabindex="0"><td class="st-name"><span class="st-pl">${U.portrait(p, 24)}<b>${esc(p.short)}</b></span></td>
        ${cols.map(([k, , dp]) => `<td class="${k === 'pos' ? '' : 'n'}">${r[k] == null ? '' : dp == null ? esc(r[k]) : FC.u.num(st.per90 && !['apps', 'mins', 'rating', 'yellows', 'reds'].includes(k) && r.mins >= st.minMins ? (r[k] / r.mins) * 90 : r[k], st.per90 && !['apps', 'mins', 'rating', 'yellows', 'reds'].includes(k) ? 2 : dp)}</td>`).join('')}</tr>`; }).join('')}
      </tbody></table></div>`;
  }

  function body() {
    const rows = FC.statsData.players(st.comp);
    if (!rows.length) return '<p class="empty-note">No matches in this competition yet.</p>';
    if (st.cat === 'overview') return tiles(FC.statsData.team(st.comp)) + leadersStrip(rows) + xgChart();
    if (st.cat === 'table') return squadTable(rows);
    const gkOnly = (only) => (only === 'GK' ? rows.filter((r) => (FC.u.player(r.id) || {}).pos === 'GK') : rows);
    const boards = BOARDS[st.cat].map(([k, l, dp, kind, unit, only]) => board(l, gkOnly(only), k, dp, kind || 'count', unit)).join('');
    return (st.cat === 'attack' ? raceChart() : '') + (boards || '<p class="empty-note">No numbers for this category yet.</p>');
  }

  function drawCharts(root) {
    const U = FC.u;
    const t = FC.statsData.team(st.comp);
    const xg = root.querySelector('#st-xg');
    if (xg && t.series.length < 2) xg.closest('.st-sec').remove();   // one match is already in the xG tile; a one-dot line reads as broken
    else if (xg) {
      FC.chart.mount(xg, (w) => FC.chart.line({ labels: t.series.map((x) => x.label), height: 240, fmt: (v) => v.toFixed(1), label: 'Expected goals for and against',
        tipTitle: (i) => `${esc(U.team(U.opponent(t.series[i].f)).name)} ${t.series[i].gf}–${t.series[i].ga}`,
        series: [{ name: 'xG for', color: 'var(--red)', values: t.series.map((x) => x.xgf) }, { name: 'xG against', color: 'var(--away)', values: t.series.map((x) => x.xga) }] }, w));
    }
    const race = root.querySelector('#st-race');
    if (race) {
      const list = FC.statsData.matches(st.comp);
      const top = FC.statsData.players(st.comp).filter((r) => r.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 3);
      if (!top.length || list.length < 2) { race.closest('.st-sec').remove(); return; }
      FC.chart.mount(race, (w) => FC.chart.line({ labels: list.map(({ f }) => U.team(U.opponent(f)).short), step: true, height: 240, label: 'Cumulative goals',
        series: top.map((r, i) => { let c = 0; return { name: U.player(r.id).short, color: ['var(--red)', 'var(--away)', '#d4af37'][i],
          values: list.map(({ m }) => { const ln = m.players.find((p) => p.id === r.id); c += ln ? ln.goals : 0; return c; }) }; }) }, w));
    }
  }

  /* ---------- pre-season ---------- */
  function preseason() {
    const L = FC.statsData.attributeLeaders();
    return `
      <section class="st-sec"><h3 class="st-h">Last season <small>2025/26, all clubs and competitions</small></h3><div id="st-last"><p class="empty-note">Loading…</p></div></section>
      <section class="st-sec"><h3 class="st-h">Attribute leaders</h3><ol class="ld-strip">${L.map((x) => `<li><button type="button" class="ld-card" data-player="${x.p.id}">${FC.u.portrait(x.p, 72)}<span>${esc(x.label)}</span><b>${x.v}</b><small>${esc(x.p.short)}</small></button></li>`).join('')}</ol></section>`;
  }

  function bar() {
    const comps = new Set(FC.stats.captured().map(({ f }) => FC.u.comp(f.comp).type));
    const lg = window.matchMedia('(max-width: 760px)').matches ? FC.u.league().id : FC.u.league().name;
    const opts = [['all', 'All'], ['league', lg], ['europe', 'Europe'], ['cup', 'Cups']].filter(([k]) => k === 'all' || comps.has(k));
    return `<div class="st-bar"><div class="st-row">
        ${opts.length > 1 ? `<div class="seg" role="group" aria-label="Competition">${opts.map(([k, l]) => `<button type="button" data-stcomp="${k}" aria-pressed="${st.comp === k}">${esc(l)}</button>`).join('')}</div>` : ''}
        <div class="seg" role="group" aria-label="Basis"><button type="button" data-stbasis="tot" aria-pressed="${!st.per90}">Totals</button><button type="button" data-stbasis="p90" aria-pressed="${st.per90}">Per 90</button></div>
        ${st.per90 ? `<label class="st-min">Min. <select class="field" data-stmin>${[90, 270, 450, 900].map((m) => `<option value="${m}"${st.minMins === m ? ' selected' : ''}>${m}'</option>`).join('')}</select></label>` : ''}</div>
      <nav class="st-chips" aria-label="Category">${CATS.map(([k, l]) => `<button type="button" class="chip-btn" data-stcat="${k}" aria-pressed="${st.cat === k}">${l}</button>`).join('')}</nav></div>`;
  }

  FC.views.stats = {
    render() {
      const live = FC.stats.captured().length > 0;
      return `<header class="page-head"><div><h1>Stats</h1><p>${live ? `${FC.stats.captured().length} ${FC.stats.captured().length === 1 ? 'match' : 'matches'} played · all competitions` : `${esc(D().meta.season)} has not started.`}</p></div></header>
        ${live ? `<div id="st-ctl">${bar()}</div><div id="st-body"></div>` : preseason()}`;
    },
    after(root) {
      if (!FC.stats.captured().length) {
        FC.statsData.lastSeason().then((rows) => {
          const box = root.querySelector('#st-last');
          if (!box) return;
          const b = [['goals', 'Goals'], ['assists', 'Assists'], ['mins', 'Minutes'], ['apps', 'Appearances']].map(([k, l]) => board(l, rows, k, 0, 'raw')).join('');
          box.innerHTML = b ? `<div class="lb-grid">${b}</div>` : '<p class="empty-note">No 2025/26 history available yet.</p>';
        });
        return;
      }
      const ctl = root.querySelector('#st-ctl');
      const out = root.querySelector('#st-body');
      const draw = () => { ctl.innerHTML = bar(); out.innerHTML = `<div class="lb-grid st-${st.cat}">${body()}</div>`; drawCharts(out); };
      draw();
      root.addEventListener('click', (e) => {
        const t = e.target;
        const c = t.closest('[data-stcomp]'), b = t.closest('[data-stbasis]'), k = t.closest('[data-stcat]'), m = t.closest('[data-lbmore]'), s = t.closest('[data-stsort]');
        if (c) st.comp = c.dataset.stcomp;
        else if (b) st.per90 = b.dataset.stbasis === 'p90';
        else if (k) { st.cat = k.dataset.stcat; st.open.clear(); }
        else if (m) { const id = m.dataset.lbmore; if (st.open.has(id)) st.open.delete(id); else st.open.add(id); }
        else if (s) { const key = s.dataset.stsort; st.dir = st.sort === key ? -st.dir : -1; st.sort = key; }
        else return;
        draw();
      });
      root.addEventListener('change', (e) => { if (e.target.matches('[data-stmin]')) { st.minMins = Number(e.target.value); draw(); } });
    },
  };
})();
