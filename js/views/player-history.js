/* Career stats on every player sheet, FBref "Standard Stats" style. Source: p.history from
   data/derived/history.json (Transfermarkt, to 30 Jun 2026):
   { seasons: [{season, club, competition, compType, apps, starts?, goals, assists, pens?, minutes, yellows, reds,
     cleanSheets?, conceded?, saves?, country?}] }.
   Tabs filter by competition type; columns with no data are hidden; club summary rows and a career total
   sit at the foot; the best season per column is accented; headers sort; Season + Squad stick on phones.
   A "2026-2027 (this career)" row comes from our captured matches (p.season). Hidden with no data. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const esc = (s) => FC.u.esc(s);
  const TABS = [['all', 'All comps'], ['league', 'Domestic league'], ['cup', 'Domestic cups'], ['europe', 'International cups'], ['international', 'National team']];
  const st = { tab: 'all', sort: null, dir: -1, open: new Set() };
  const num = (v) => (v == null || v === '' ? null : Number(v));
  const sum = (rows, k) => { const v = rows.map((r) => r[k]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) : null; };

  /** "2023/24", "2023-24", "2024" -> "2023-2024" (season start year in .y). */
  function season(s) {
    const m = /^(\d{4})\D?(\d{2,4})?/.exec(String(s));
    if (!m) return { label: String(s), y: 0 };
    const y = Number(m[1]);
    const end = m[2] ? (m[2].length === 2 ? Number(String(y).slice(0, 2) + m[2]) : Number(m[2])) : null;
    return { label: end && end !== y ? `${y}-${String(end).slice(2)}` : String(y), y };
  }

  function ageAt(p, y) {
    if (!p.born || !y) return null;
    const b = FC.u.parseDate(p.born);
    const ref = new Date(y, 8, 1);
    return ref.getFullYear() - b.getFullYear() - (ref < new Date(ref.getFullYear(), b.getMonth(), b.getDate()) ? 1 : 0);
  }

  function rowOf(s, p) {
    const se = season(s.season);
    return { season: se.label, y: se.y, age: ageAt(p, se.y), club: s.club, country: s.country || null, comp: s.competition || '', type: s.compType || 'other',
      mp: num(s.apps), starts: num(s.starts), min: num(s.minutes), gls: num(s.goals), ast: num(s.assists), pk: num(s.pens != null ? s.pens : s.penalties),
      crdy: num(s.yellows), crdr: num(s.reds), ga: num(s.conceded), cs: num(s.cleanSheets), saves: num(s.saves),
      team: s.team || null, crest: s.crest || null, flag: s.flag || null };
  }

  /** "All comps" collapses each season + club into one row, like FBref. */
  function collapse(rows) {
    const by = new Map();
    rows.forEach((r) => {
      const k = `${r.season}|${r.club}`;
      if (!by.has(k)) by.set(k, { ...r, comp: '', parts: [] });
      by.get(k).parts.push(r);
    });
    return [...by.values()].map((g) => {
      const out = { ...g, comp: g.parts.length > 1 ? `${g.parts.length} comps` : g.parts[0].comp };
      ['mp', 'starts', 'min', 'gls', 'ast', 'pk', 'crdy', 'crdr', 'ga', 'cs', 'saves'].forEach((k) => { out[k] = sum(g.parts, k); });
      return out;
    });
  }

  function derive(r) {
    const n90 = r.min != null ? r.min / 90 : null;
    const per = (v) => (v != null && n90 ? v / n90 : null);
    const ga = r.gls != null || r.ast != null ? (r.gls || 0) + (r.ast || 0) : null;
    return { ...r, n90, ga_: ga, gpk: r.gls != null && r.pk != null ? r.gls - r.pk : null, gls90: per(r.gls), ast90: per(r.ast), ga90: per(ga),
      ga90k: r.ga != null && n90 ? r.ga / n90 : null, csp: r.cs != null && r.mp ? (100 * r.cs) / r.mp : null };
  }

  // MP / Gls / Ast / G+A first so they are visible on a phone without scrolling
  const OUT_COLS = [['mp', 'MP'], ['gls', 'Gls'], ['ast', 'Ast'], ['ga_', 'G+A'], ['starts', 'Starts'], ['min', 'Min'], ['n90', '90s', 1], ['gpk', 'G-PK'], ['pk', 'PK'],
    ['crdy', 'CrdY'], ['crdr', 'CrdR'], ['gls90', 'Gls/90', 2], ['ast90', 'Ast/90', 2], ['ga90', 'G+A/90', 2]];
  const GK_COLS = [['mp', 'MP'], ['cs', 'CS'], ['ga', 'GA'], ['csp', 'CS%', 1], ['starts', 'Starts'], ['min', 'Min'], ['n90', '90s', 1], ['ga90k', 'GA90', 2], ['saves', 'Saves'],
    ['crdy', 'CrdY'], ['crdr', 'CrdR']];
  const BEST = new Set(['gls', 'ast', 'ga_', 'mp', 'min', 'cs', 'gls90', 'ga90']);
  const fmt = (v, dp) => (v == null ? '' : dp ? v.toFixed(dp) : FC.u.num(v));

  let byName = null;
  /** History clubs are names (Transfermarkt); match them to our clubs for a crest when possible. */
  function clubId(c) {
    if (c != null && /^\d+$/.test(String(c))) return Number(c);
    if (!byName) {
      byName = new Map();
      Object.entries(window.CAREER.teams || {}).forEach(([id, t]) => byName.set(String(t.name).toLowerCase(), Number(id)));
    }
    return byName.get(String(c || '').toLowerCase()) || null;
  }
  /** Squad cell: our crest (team id), a cached SoFIFA crest, a flag for national teams, else initials. */
  function clubCell(c, r) {
    const U = FC.u;
    const id = (r && r.team) || clubId(c);
    const label = id ? U.team(id).name : String(c || '');
    const img = id ? U.crest(id, 18)
      : r && (r.crest || r.flag) ? `<img class="${r.flag ? 'flag' : 'crest'}" src="${esc(r.crest || r.flag)}" alt="" width="18" height="18" loading="lazy" onerror="this.remove()">`
        : `<span class="crest-fb" style="--s:18px" aria-hidden="true">${esc(U.initials(label || '?'))}</span>`;
    return `<span class="hy-club">${img}<span class="hy-cname">${esc(label)}</span></span>`;
  }

  function current(p) {
    const s = p.season;
    if (!s || !s.apps) return null;
    return derive({ season: window.CAREER.meta.season.replace('/', '-'), y: 9999, age: p.age, club: window.CAREER.meta.clubId, country: null,
      comp: 'This career', type: 'all', mp: s.apps, starts: s.starts, min: s.mins, gls: s.goals, ast: s.assists, pk: null, crdy: s.yellows, crdr: s.reds,
      ga: null, cs: p.pos === 'GK' ? s.cleanSheets : null, saves: null, current: true });
  }

  const COMP_CODE = { 'Bundesliga': 'BL', '2. Bundesliga': 'BL2', 'DFB-Pokal': 'DFB', 'UEFA Champions League': 'UCL', 'Champions League': 'UCL',
    'UEFA Europa League': 'UEL', 'Europa League': 'UEL', 'UEFA Conference League': 'UECL', 'LaLiga': 'LL', 'LaLiga2': 'LL2', 'Copa del Rey': 'CDR',
    'Premier League': 'PL', 'FA Cup': 'FAC', 'EFL Cup': 'EFL', 'Supercopa': 'SUP', 'DFL-Supercup': 'SUP', 'Serie A': 'SA', 'Ligue 1': 'L1' };
  /** Short competition code for the frozen phone column. */
  const compCode = (c) => COMP_CODE[c] || String(c).split(/\s+/).filter((w) => /^[A-Z0-9]/.test(w)).map((w) => w[0]).join('').slice(0, 4) || String(c).slice(0, 4);
  const phone = () => window.matchMedia && window.matchMedia('(max-width: 760px)').matches;
  /** "2025-26" -> "25/26" for the frozen phone column. */
  const shortSeason = (label) => { const m = /^(\d{4})-(\d{2})/.exec(label); return m ? `${m[1].slice(2)}/${m[2]}` : label; };
  function crestOnly(r) {
    const U = FC.u;
    const id = (r && r.team) || clubId(r && r.club);
    if (id) return U.crest(id, 20);
    if (r && (r.crest || r.flag)) return `<img class="${r.flag ? 'flag' : 'crest'}" src="${esc(r.crest || r.flag)}" alt="" width="20" height="20" loading="lazy" onerror="this.remove()">`;
    return `<span class="crest-fb" style="--s:20px" aria-hidden="true">${esc(U.initials(String((r && r.club) || '?')))}</span>`;
  }
  const clubShort = (r) => { const id = (r && r.team) || clubId(r && r.club); return id ? FC.u.shortName(id) : FC.u.shortenName(String((r && r.club) || '')); };

  function table(p) {
    const all = ((p.history && p.history.seasons) || []).map((s) => rowOf(s, p));
    let rows = st.tab === 'all' ? collapse(all.filter((r) => r.type !== 'international')) : all.filter((r) => r.type === st.tab);
    rows = rows.map(derive);
    const cur = st.tab === 'all' || st.tab === 'league' ? current(p) : null;
    const gk = p.pos === 'GK';
    const cols = (gk ? GK_COLS : OUT_COLS).filter(([k]) => rows.some((r) => r[k] != null) || (cur && cur[k] != null));
    const showCountry = rows.some((r) => r.country);
    const showAge = rows.some((r) => r.age != null);
    const ph = phone();
    if (st.sort) rows.sort((a, b) => ((a[st.sort] == null ? -1e9 : a[st.sort]) - (b[st.sort] == null ? -1e9 : b[st.sort])) * st.dir || b.y - a.y);
    else rows.sort((a, b) => b.y - a.y || String(a.comp).localeCompare(String(b.comp)));
    const best = {};
    cols.forEach(([k]) => { if (BEST.has(k)) best[k] = Math.max(...rows.map((r) => (r[k] == null ? -Infinity : r[k]))); });
    const th = (k, l, cls) => `<th class="${cls || 'n'}"${k ? ` data-hysort="${k}" aria-sort="${st.sort === k ? (st.dir > 0 ? 'ascending' : 'descending') : 'none'}"` : ''}>${k ? `<button type="button">${l}</button>` : l}</th>`;
    const cells = (r, isFoot) => cols.map(([k, , dp]) => `<td class="n${!isFoot && BEST.has(k) && r[k] != null && r[k] === best[k] && r[k] > 0 ? ' best' : ''}">${fmt(r[k], dp)}</td>`).join('');
    const key = (r) => `${r.season}|${r.club}`;
    const compCell = (r) => (r.parts && r.parts.length > 1
      ? `<button type="button" class="hy-exp" data-hyexp="${esc(key(r))}" aria-expanded="${st.open.has(key(r))}">${r.parts.length} comps</button>` : esc(r.comp));
    // phone: one frozen column (season + crest), stats next, then comp + short club name
    const head = ph
      ? `${th('y', 'Season', 'hy-s hy-f')}${cols.map(([k, l]) => th(k, l)).join('')}${th(null, 'Comp', 'hy-comp')}${th(null, 'Club', 'hy-cl')}`
      : `${th('y', 'Season', 'hy-s')}${th(null, 'Squad', 'hy-sq')}${showAge ? th('age', 'Age', 'n hy-age') : ''}${showCountry ? th(null, 'Country', '') : ''}${th(null, 'Comp', 'hy-comp')}${cols.map(([k, l]) => th(k, l)).join('')}`;
    const lead = (r) => (ph
      ? `<td class="hy-s hy-f"><span class="hy-fs">${crestOnly(r)}<b>${esc(r.current ? 'This' : shortSeason(r.season))}</b></span></td>`
      : `<td class="hy-s">${esc(r.season)}</td><td class="hy-sq">${clubCell(r.club, r)}</td>${showAge ? `<td class="n hy-age">${r.age == null ? '' : r.age}</td>` : ''}${showCountry ? `<td>${esc(r.country || '')}</td>` : ''}<td class="hy-comp">${compCell(r)}</td>`);
    const tail = (r) => (ph ? `<td class="hy-comp">${compCell(r)}</td><td class="hy-cl">${esc(r.current ? FC.u.shortName(window.CAREER.meta.clubId) : clubShort(r))}</td>` : '');
    const partRow = (x) => (ph
      ? `<tr class="hy-part"><td class="hy-s hy-f"><span class="hy-code" title="${esc(x.comp)}">${esc(compCode(x.comp))}</span></td>${cells(x, true)}<td class="hy-comp">${esc(x.comp)}</td><td class="hy-cl"></td></tr>`
      : `<tr class="hy-part"><td class="hy-s"></td><td class="hy-sq"></td>${showAge ? '<td class="hy-age"></td>' : ''}${showCountry ? '<td></td>' : ''}<td class="hy-comp">${esc(x.comp)}</td>${cells(x, true)}</tr>`);
    const line = (r) => `<tr class="${r.current ? 'hy-cur' : ''}">${lead(r)}${cells(r)}${tail(r)}</tr>`
      + (r.parts && r.parts.length > 1 && st.open.has(key(r)) ? r.parts.map((x) => partRow(derive(x))).join('') : '');
    const clubs = new Map();
    rows.forEach((r) => { if (!clubs.has(String(r.club))) clubs.set(String(r.club), []); clubs.get(String(r.club)).push(r); });
    const foot = (label, club, rs) => {
      const agg = derive({ mp: sum(rs, 'mp'), starts: sum(rs, 'starts'), min: sum(rs, 'min'), gls: sum(rs, 'gls'), ast: sum(rs, 'ast'), pk: sum(rs, 'pk'),
        crdy: sum(rs, 'crdy'), crdr: sum(rs, 'crdr'), ga: sum(rs, 'ga'), cs: sum(rs, 'cs'), saves: sum(rs, 'saves') });
      if (ph) {
        return `<tr class="hy-foot"><td class="hy-s hy-f"><span class="hy-fs">${club ? crestOnly(rs[0]) : ''}<b>${esc(club ? label.replace(' Seasons', ' seas.').replace(' Season', ' seas.') : 'Career')}</b></span></td>${cells(agg, true)}<td class="hy-comp"></td><td class="hy-cl">${club ? esc(clubShort(rs[0])) : esc(label)}</td></tr>`;
      }
      return `<tr class="hy-foot"><td class="hy-s">${esc(label)}</td><td class="hy-sq">${club ? clubCell(club, rs[0]) : '<b>Career</b>'}</td>${showAge ? '<td class="hy-age"></td>' : ''}${showCountry ? '<td></td>' : ''}<td class="hy-comp"></td>${cells(agg, true)}</tr>`;
    };
    const seasonsOf = (rs) => new Set(rs.map((r) => r.season)).size;
    const plural = (n) => `${n} Season${n === 1 ? '' : 's'}`;
    if (!rows.length && !cur) return '<p class="empty-note">No matches in this competition type.</p>';
    return `<div class="table-wrap hy-wrap"><table class="data hy-table ${ph ? 'hy-phone' : ''}"><thead><tr>${head}</tr></thead><tbody>${cur ? line(cur) : ''}${rows.map(line).join('')}</tbody>
      <tfoot>${clubs.size > 1 ? [...clubs.entries()].map(([c, rs]) => foot(plural(seasonsOf(rs)), c, rs)).join('') : ''}${foot(plural(seasonsOf(rows)), null, rows)}</tfoot></table></div>`;
  }


  function chart(p) {
    const by = {};
    ((p.history && p.history.seasons) || []).forEach((s) => { const k = season(s.season).label; by[k] = by[k] || { g: 0, a: 0, y: season(s.season).y }; by[k].g += Number(s.goals) || 0; by[k].a += Number(s.assists) || 0; });
    const keys = Object.keys(by).sort((a, b) => by[a].y - by[b].y);
    if (!keys.length) return '';
    const max = Math.max(1, ...keys.map((k) => by[k].g + by[k].a));
    const W = 320, H = 110, step = (W - 8) / keys.length, bw = Math.min(22, step - 6);
    const bars = keys.map((k, i) => {
      const x = 4 + i * step + (step - bw) / 2, hg = (by[k].g / max) * (H - 26), ha = (by[k].a / max) * (H - 26);
      return `<g data-tip="${esc(`<strong>${esc(k)}</strong>${by[k].g} goals · ${by[k].a} assists`)}"><rect class="hit" x="${4 + i * step}" y="0" width="${step}" height="${H}"/>
        <rect class="hy-g" x="${x}" y="${H - 16 - hg}" width="${bw}" height="${hg}"/><rect class="hy-a" x="${x}" y="${H - 16 - hg - ha - (ha && hg ? 2 : 0)}" width="${bw}" height="${ha}"/>
        ${(i % Math.ceil(keys.length / 6) === 0 && keys.length - 1 - i >= Math.ceil(keys.length / 6)) || i === keys.length - 1 ? `<text class="ax" x="${x + bw / 2}" y="${H - 3}" text-anchor="middle">${esc(k.slice(2, 4))}/${esc(k.slice(-2))}</text>` : ''}</g>`;
    }).join('');
    return `<div class="legend"><span><i class="sw" style="--c:var(--red)"></i>Goals</span><span><i class="sw" style="--c:var(--away)"></i>Assists</span></div>
      <svg class="chart-svg hy-chart" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Goals and assists by season">${bars}</svg>`;
  }

  /* Honours (Transfermarkt, to 30 June 2026), grouped like a trophy cabinet. Team trophies use the real trophy
     art; individual awards (TM id 0) use our award badges. A missing image falls back to a plain cup. */
  const AWARD_ART = [[/scorer|boot|pichichi|capocannon|torj/i, 'golden_boot'], [/keeper|glove|zamora|yashin/i, 'golden_glove'],
    [/young|newcomer|golden boy|talent|breakthrough|rookie|kopa/i, 'young_player'], [/team of|xi\b|eleven/i, 'team_of_the_season']];
  const seasonLabel = (x) => { const m = /^(\d{2})\/(\d{2})$/.exec(x || ''); return m ? `20${m[1]}-${m[2]}` : String(x || ''); };
  const art = (h) => (h.id ? `img/trophies/${h.id}.png`
    : `img/awards/${(AWARD_ART.find(([re]) => re.test(h.name)) || [0, 'player_of_the_season'])[1]}.svg`);

  /* Our own awards from this career (CAREER.awards): Team of the Week picks and Player of the Week. */
  const AWARD_NAME = { championship_team_of_the_week: 'Championship Team of the Week',
    championship_player_of_the_month: 'Championship Player of the Month' };
  const awardName = (k) => AWARD_NAME[k] || k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  const periodLabel = (x) => String(x || '').replace(/^(\d{4})\/(\d{2}) (.+)$/, '$3 $1-$2');

  function careerAwards(p) {
    const out = new Map();
    const add = (key, name, badge, e) => {
      if (!out.has(key)) out.set(key, { name, badge, rows: [] });
      out.get(key).rows.push(e);
    };
    ((window.CAREER && window.CAREER.awards) || []).forEach((e) => {
      if (e.status && e.status !== 'final') return;
      if (e.winner && e.winner.id === p.id) add(e.award, awardName(e.award), 'player_of_the_month', { ...e, r: e.winner });
      const r = (e.xi || []).find((x) => x.id === p.id);
      if (!r) return;
      const base = awardName(e.award);
      add(e.award, base, 'team_of_the_week', { ...e, r });
      if (e.playerOfTheWeek === p.id) add(`${e.award}:potw`, base.replace('Team of the Week', 'Player of the Week'), 'player_of_the_week', { ...e, r });
    });
    return [...out.values()].sort((a, b) => (a.badge === 'team_of_the_week' ? 1 : -1) - (b.badge === 'team_of_the_week' ? 1 : -1));
  }

  function careerTile(g) {
    const periods = g.rows.map((e) => `${periodLabel(e.period)} (${(+e.r.rating).toFixed(1)})`).reverse();
    return `<li class="ho-t"><img src="img/awards/${g.badge}.svg" alt="" width="48" height="48" loading="lazy">
      <div class="ho-x"><b class="ho-n">${g.rows.length > 1 ? `<span class="ho-c">${g.rows.length}×</span>` : ''}${esc(g.name)}</b>
      <span class="ho-y">${esc(periods.slice(0, 6).join(', '))}${periods.length > 6 ? ` +${periods.length - 6}` : ''}</span></div></li>`;
  }

  function honours(p) {
    const list = (p.history && p.history.honours) || [];
    const mine = careerAwards(p);
    if (!list.length && !mine.length) return '';
    const groups = new Map();
    list.forEach((h) => {
      const k = h.id ? `t${h.id}` : `a${h.name}|${h.comp || h.club || ''}`;
      if (!groups.has(k)) groups.set(k, { h, rows: [] });
      groups.get(k).rows.push(h);
    });
    const tile = ({ h, rows }) => {
      const sub = h.id ? '' : (h.comp || h.club || '');
      const seasons = rows.map((r) => seasonLabel(r.season)).reverse();
      const tip = rows.map((r) => `${seasonLabel(r.season)}${r.club ? ` · ${r.club}` : ''}`).reverse().join('\n');
      return `<li class="ho-t" title="${esc(tip)}"><img src="${art(h)}" alt="" width="48" height="48" loading="lazy" onerror="this.onerror=null;this.src='img/trophies/cup.svg'">
        <div class="ho-x"><b class="ho-n">${rows.length > 1 ? `<span class="ho-c">${rows.length}×</span>` : ''}${esc(h.name)}</b>${sub ? `<span class="ho-s">${esc(sub)}</span>` : ''}
        <span class="ho-y">${esc(seasons.slice(0, 6).join(', '))}${seasons.length > 6 ? ` +${seasons.length - 6}` : ''}</span></div></li>`;
    };
    const order = (a, b) => b.rows.length - a.rows.length || (b.rows[b.rows.length - 1].season || '').localeCompare(a.rows[a.rows.length - 1].season || '');
    const all = [...groups.values()];
    const team = all.filter((g) => g.h.id).sort(order);
    const ind = all.filter((g) => !g.h.id).sort(order);
    const part = (title, gs) => (gs.length ? `<h4 class="ho-h">${title}</h4><ul class="ho-grid">${gs.map(tile).join('')}</ul>` : '');
    const thisCareer = mine.length ? `<h4 class="ho-h">Since July 2026</h4><ul class="ho-grid">${mine.map(careerTile).join('')}</ul>` : '';
    return `<section class="panel pp-wide ho"><div class="panel-head"><h3>Honours</h3></div>
      ${thisCareer}${part('Trophies', team)}${part('Individual awards', ind)}</section>`;
  }

  function block(p) {
    const has = p.history && p.history.seasons && p.history.seasons.length;
    if (!has && !(p.season && p.season.apps)) return honours(p);
    st.sort = null; st.dir = -1; st.open.clear();
    if (has && !p.history.seasons.some((s) => st.tab === 'all' || s.compType === st.tab)) st.tab = 'all';
    const types = new Set(((p.history && p.history.seasons) || []).map((s) => s.compType));
    if (!st.tab) st.tab = 'all';
    return `${honours(p)}<section class="panel pp-wide hy" data-hy="${p.id}"><div class="panel-head"><h3>Standard stats</h3><span class="sub">${has ? 'Club career to 30 June 2026' : 'This career'}</span></div>
      ${chart(p)}<div class="seg hy-tabs" role="tablist">${TABS.filter(([k]) => k === 'all' || types.has(k)).map(([k, l]) => `<button type="button" role="tab" data-hytab="${k}" aria-pressed="${st.tab === k}">${l}</button>`).join('')}</div>
      <div class="hy-body">${table(p)}</div></section>`;
  }

  /** Delegated tab + sort handling inside a player sheet. */
  function bind(root, p) {
    const box = root.querySelector('.hy');
    if (!box) return;
    box.addEventListener('click', (e) => {
      const t = e.target.closest('[data-hytab]');
      const h = e.target.closest('[data-hysort]');
      const x = e.target.closest('[data-hyexp]');
      if (x) {
        const k = x.dataset.hyexp;
        if (st.open.has(k)) st.open.delete(k); else st.open.add(k);
      } else if (t) {
        st.tab = t.dataset.hytab; st.sort = null;
        box.querySelectorAll('[data-hytab]').forEach((x) => x.setAttribute('aria-pressed', String(x === t)));
      } else if (h) {
        const k = h.dataset.hysort;
        st.dir = st.sort === k ? -st.dir : -1;
        st.sort = k;
      } else return;
      box.querySelector('.hy-body').innerHTML = table(p);
    });
  }

  FC.history = { block, bind };
})();
