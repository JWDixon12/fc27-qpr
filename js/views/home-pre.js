/* Club blocks shared by Home and Squad: the one news line, the squad ratings line, the club
   record (honours, plain gold numbers) and the "contracts ending" row group. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;
  const esc = (s) => FC.u.esc(s);

  function seasonEndYear() {
    const d = FC.u.parseDate(D().meta.gameDate);
    return d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
  }

  /** Newest storyline as one headline linking to The Room. */
  function news() {
    const N = D().news || [];
    if (N.length) {
      return `<section class="sec"><div class="sec-head"><h2>News</h2><a class="sub" href="#news">All stories</a></div>
        <ol class="news-list">${N.slice(0, 3).map((a) => `<li><a href="#news/${esc(a.slug)}"><span class="nw-meta"><b>${esc(a.kind)}</b><span>${FC.u.date(a.date)}</span></span><b>${esc(a.headline)}</b></a></li>`).join('')}</ol></section>`;
    }
    const s = [...(D().room.storylines || [])].sort((a, b) => b.updated.localeCompare(a.updated))[0];
    if (!s) return '';
    return `<section class="sec"><div class="sec-head"><h2>News</h2><a class="sub" href="#room">The Room</a></div>
      <a class="news" href="#room"><b>${esc(s.title)}</b><span>${FC.u.date(s.updated)}</span></a></section>`;
  }

  function squadLine() {
    const r = D().club.ratings;
    const active = D().squad.filter((p) => p.status !== 'loaned_out');
    const avg = active.length ? FC.u.sum(active, (p) => p.ovr) / active.length : 0;
    const parts = r && r.attack != null
      ? [['ATT', r.attack], ['MID', r.midfield], ['DEF', r.defence], ['OVR', r.overall]]
      : [['Players', active.length], ['Avg OVR', avg.toFixed(1)]];
    return `<section class="sec"><div class="sec-head"><h2>Squad</h2><a class="sub" href="#squad">${active.length} players</a></div>
      <p class="numline">${parts.map(([l, v]) => `<span><small>${l}</small><b>${v}</b></span>`).join('')}</p></section>`;
  }

  function clubRecord() {
    const C = D().club;
    const h = C.honours;
    const rows = [...(C.nickname ? [['Nickname', C.nickname]] : []), ['Ground', `${C.stadium}${C.capacity ? ` · capacity ${FC.u.num(C.capacity)}` : ''}`]];
    if (C.clubWorth) rows.push(['Club worth', FC.u.money(C.clubWorth)]);
    return `<section class="sec club-rec"><div class="sec-head"><h2>Club</h2></div>
      <dl class="kv">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${h && (h.league || h.domesticCups || h.europeanCups) ? `<dl class="honours-line">${[[h.league, 'League titles'], [h.domesticCups, 'Domestic cups'], [h.europeanCups, 'European Cups']]
        .map(([n, l]) => `<div><dd>${n}</dd><dt>${l}</dt></div>`).join('')}</dl>` : ''}</section>`;
  }

  function contracts() {
    const y = seasonEndYear();
    const list = D().squad.filter((p) => p.contractEnd <= y && p.status !== 'loaned_out').sort((a, b) => b.wage - a.wage);
    if (!list.length) return '';
    return `<section class="sec"><div class="sec-head"><h2>Contracts ending ${y}</h2><span class="sub">${list.length} players</span></div>
      <table class="data"><thead><tr><th>Player</th><th>Pos</th><th class="n">Age</th><th class="n">Wage/yr</th><th class="n">Ends</th></tr></thead><tbody>
      ${list.map((p) => `<tr data-player="${p.id}" tabindex="0"><td><b>${esc(p.name)}</b></td><td>${esc(p.pos)}</td><td class="n">${p.age}</td><td class="n">${FC.u.wageYr(p.wage)}</td><td class="n">30 Jun ${p.contractEnd}</td></tr>`).join('')}
      </tbody></table></section>`;
  }

  FC.homePre = { news, squadLine, clubRecord, contracts, seasonEndYear };
})();
