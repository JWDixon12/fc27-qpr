/* Club page (#team/<id>): header with ratings, ground and honours; league position and form;
   head-to-head with us; every fixture and result; the squad by line. Club data is loaded on demand
   from data/clubs/<id>.js and the page re-renders once it arrives. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;
  const esc = (s) => FC.u.esc(s);
  const LINES = [['GK', 'Goalkeepers'], ['DEF', 'Defenders'], ['MID', 'Midfielders'], ['ATT', 'Forwards']];

  function back() {
    return `<button type="button" class="back-btn" onclick="history.length > 1 ? history.back() : (location.hash = 'home')">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Back</button>`;
  }

  function header(id, c) {
    const U = FC.u;
    const t = U.team(id);
    const r = (c && c.ratings) || t.ratings;
    const h = c && c.honours;
    return `<div class="tm-hero club-field" style="--club:${U.clubColor(id)}"><header class="tm-head">${U.crest(id, 96, 'tm-crest').replace(/ data-team="\d+"/, '')}
      <div><h1>${esc(t.name)}</h1><p class="sub">${esc(t.league || '')}${c && c.capacity ? ` · capacity ${U.num(c.capacity)}` : ''}${c && c.clubWorth ? ` · worth ${U.money(c.clubWorth)}` : ''}</p></div></header>
      ${r ? `<p class="numline tm-ratings">${[['OVR', r.ovr], ['ATT', r.att], ['MID', r.mid], ['DEF', r.def]].map(([l, v]) => `<span><small>${l}</small><b>${v}</b></span>`).join('')}</p>` : ''}
      ${h && h.league + h.domesticCups + h.europeanCups === 0 ? '<p class="sub tm-nohon">No major honours.</p>' : ''}
      ${h && h.league + h.domesticCups + h.europeanCups > 0 ? `<dl class="honours-line">${[[h.league, 'League titles'], [h.domesticCups, 'Domestic cups'], [h.europeanCups, 'European Cups']].map(([n, l]) => `<div><dd>${n}</dd><dt>${l}</dt></div>`).join('')}</dl>` : ''}</div>`;
  }

  function standing(id) {
    const rows = FC.u.leagueRows();
    const i = rows.findIndex((r) => r.team === Number(id));
    if (i < 0) return '';
    const r = rows[i];
    if (!r.p) return `<section class="sec"><div class="sec-head"><h2>${esc(FC.u.league().name)}</h2></div><p class="empty-note">Season not started.</p></section>`;
    return `<section class="sec"><div class="sec-head"><h2>${esc(FC.u.league().name)}</h2><a class="sub" href="#league">Table</a></div>
      <p class="numline"><span><small>Pos</small><b>${i + 1}</b></span><span><small>Pts</small><b>${r.pts}</b></span><span><small>P</small><b>${r.p}</b></span></p>
      ${r.form ? `<p class="tm-form">${r.form.split('').map((x) => `<span class="res res-${x}">${x}</span>`).join('')}</p>` : ''}</section>`;
  }

  /** One fixture row from a club's point of view. f: {date,time,comp,home,away,hg,ag}. */
  function row(f, me) {
    const U = FC.u;
    const home = f.home === Number(me);
    const opp = home ? f.away : f.home;
    const done = f.hg != null && f.ag != null;
    const gf = home ? f.hg : f.ag, ga = home ? f.ag : f.hg;
    const res = done ? (gf > ga ? 'W' : gf === ga ? 'D' : 'L') : null;
    const c = U.comp(f.comp);
    return `<li class="tf-row" style="--c:${esc(c.color)}"><span class="tf-date">${U.date(f.date, 'short')}</span>
      <span class="tf-opp"${U.hasClub(opp) ? ` data-team="${opp}" role="link" tabindex="0"` : ''}>${U.crest(opp, 22)}<b>${esc(U.team(opp).name)}</b></span>
      <span class="tf-ha">${home ? 'H' : 'A'}</span>
      <span class="tf-r">${done ? `${gf}–${ga} <i class="res res-${res}">${res}</i>` : esc(U.time12(f.time))}</span></li>`;
  }

  function h2h(id) {
    const us = D().meta.clubId;
    if (Number(id) === us) return '';
    const list = D().fixtures.filter((f) => FC.u.opponent(f) === Number(id));
    if (!list.length) return '';
    return `<section class="sec"><div class="sec-head"><h2>Against ${esc(D().club.short)}</h2><span class="sub">${list.length} this season</span></div>
      <ol class="tf-list">${list.map((f) => row(f, id)).join('')}</ol></section>`;
  }

  function fixtures(id, c) {
    const list = (c && c.fixtures) || [];
    if (!list.length) return '';
    return `<section class="sec"><div class="sec-head"><h2>Fixtures and results</h2><span class="sub">${list.length} matches, all competitions</span></div>
      <ol class="tf-list">${[...list].sort((a, b) => a.date.localeCompare(b.date)).map((f) => row(f, id)).join('')}</ol></section>`;
  }

  function squad(c) {
    if (!c || !c.squad) return '';
    const U = FC.u;
    const by = {};
    c.squad.forEach((p) => { (by[U.posGroup(p.pos)] = by[U.posGroup(p.pos)] || []).push(p); });
    const ours = Number(c.id) === D().meta.clubId;
    return `<section class="sec"><div class="sec-head"><h2>Squad</h2><span class="sub">${c.squad.length} players</span></div>
      ${LINES.filter(([k]) => by[k]).map(([k, l]) => `<h3 class="tm-line">${l}</h3><ol class="sq-list tm-squad">${by[k].sort((a, b) => b.ovr - a.ovr).map((p) => `<li>
        <button type="button" class="sq-row" data-player="${p.id}"${ours ? '' : ` data-club="${c.id}"`}>${U.portrait({ ...p, short: p.name }, 40)}
        <span class="sq-main"><b><span class="sq-pos">${esc(p.pos)}</span>${esc(p.name)}</b><small>${[p.age, p.shirt ? `#${p.shirt}` : null, U.wageYrTag(p.wage), U.contract(p.contractEnd)].filter(Boolean).map(esc).join(' · ')}</small></span>
        <span class="sq-ovr">${p.ovr}</span></button></li>`).join('')}</ol>`).join('')}</section>`;
  }

  FC.views.team = {
    title: (id) => FC.u.team(id).name,
    render(id) {
      const c = (window.CLUBS || {})[Number(id)];
      return `<div class="tm">${back()}${header(id, c)}
        <div class="tm-grid"><div class="tm-col">${standing(id)}${h2h(id)}${fixtures(id, c)}</div><div class="tm-col">${c ? squad(c) : '<p class="empty-note">Loading squad…</p>'}</div></div></div>`;
    },
    after(root, id) {
      if ((window.CLUBS || {})[Number(id)]) return;
      FC.u.loadClub(id).then((c) => {
        if (c && location.hash.split('?')[0] === `#team/${id}`) FC.rerender();
        else if (!c) root.querySelector('.tm-col:last-child').innerHTML = '<p class="empty-note">No squad data for this club.</p>';
      });
    },
  };
})();
