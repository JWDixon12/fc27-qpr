/* Calendar: every month of the season as a grid (fills an ultrawide), or a list. Colour = competition. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;
  let mode = null;

  function fixtureChip(f) {
    const U = FC.u;
    const opp = U.opponent(f);
    const r = U.result(f);
    const has = !!D().matches[f.id];
    const tip = `<strong>${U.esc(U.team(f.home).name)} ${f.played ? `${f.hg}–${f.ag}${U.pensTag(f)}` : 'v'} ${U.esc(U.team(f.away).name)}</strong>${U.esc(U.comp(f.comp).name)} ${U.esc(f.round)} · ${U.time12(f.time)}${has ? '<br>Open in Match Centre' : ''}`;
    const to = has ? `match/${f.id}` : U.hasClub(opp) ? `team/${opp}` : '';
    return `<div class="fx ${f.played ? 'played' : ''} ${to ? 'has' : ''}" style="--c:${U.comp(f.comp).color}" ${to ? `data-href="${to}" tabindex="0" role="link"` : 'tabindex="0"'} data-tip="${U.esc(tip)}">
      <span class="fx-top">${U.crest(opp, 16)}<b>${U.esc(U.team(opp).short)}</b><small>${f.venue}</small></span>
      <span class="fx-bot">${r ? `<span class="fx-score">${r.gf}–${r.ga}${r.pens ? '<small class="pens">p</small>' : ''}</span><span class="fx-res fr-${r.res}" aria-label="${{ W: 'Win', D: 'Draw', L: 'Loss' }[r.res]}">${r.res}</span>` : `<span class="fx-time">${U.time12(f.time)}</span>`}</span></div>`;
  }

  function months() {
    const fx = D().fixtures;
    const first = FC.u.parseDate(fx[0].date);
    const last = FC.u.parseDate(fx[fx.length - 1].date);
    const out = [];
    for (let y = first.getFullYear(), m = first.getMonth(); y < last.getFullYear() || (y === last.getFullYear() && m <= last.getMonth()); m === 11 ? (m = 0, y++) : m++) out.push([y, m]);
    return out;
  }

  function monthGrid(y, m, byDate) {
    const U = FC.u;
    const start = new Date(y, m, 1);
    const lead = (start.getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    const today = D().meta.gameDate;
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<div class="cal-day pad" aria-hidden="true"></div>';
    for (let d = 1; d <= days; d++) {
      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const list = byDate[iso] || [];
      cells += `<div class="cal-day ${iso === today ? 'today' : ''} ${iso < today ? 'past' : ''} ${list.length ? 'busy' : ''}"><span class="cal-n">${d}</span>${list.map(fixtureChip).join('')}</div>`;
    }
    const count = Object.keys(byDate).filter((k) => k.startsWith(`${y}-${String(m + 1).padStart(2, '0')}`)).length;
    return `<section class="cal-month panel" aria-label="${U.MONTHS_LONG[m]} ${y}">
      <header><h2>${U.MONTHS_LONG[m]}</h2><span>${y} · ${count} match${count === 1 ? '' : 'es'}</span></header>
      <div class="cal-dow" aria-hidden="true">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="cal-grid">${cells}</div></section>`;
  }

  function listView() {
    const U = FC.u;
    const groups = {};
    D().fixtures.forEach((f) => {
      const d = U.parseDate(f.date);
      const k = `${U.MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
      (groups[k] = groups[k] || []).push(f);
    });
    return Object.entries(groups).map(([k, list]) => `<section class="cal-list"><h2>${k}</h2><ol>${list.map((f) => {
      const r = U.result(f);
      const has = !!D().matches[f.id];
      const to = has ? `match/${f.id}` : U.hasClub(U.opponent(f)) ? `team/${U.opponent(f)}` : '';
      return `<li style="--c:${U.comp(f.comp).color}" class="${f.played ? 'played' : ''}" ${to ? `data-href="${to}" tabindex="0" role="link"` : ''}>
        <span class="cl-date">${U.date(f.date, 'day')}</span>${U.compChip(f.comp)}<span class="cl-round">${U.esc(f.round)}</span>
        <span class="cl-match">${U.crest(f.home, 24)}<b class="${U.isUs(f.home) ? 'us' : ''}"><span class="cl-full">${U.esc(U.team(f.home).name)}</span><span class="cl-short">${U.esc(U.team(f.home).short)}</span></b>
          <span class="cl-score">${f.played ? `${f.hg}–${f.ag}${U.pensTag(f)}` : (U.time12(f.time) || 'v')}</span>
          <b class="${U.isUs(f.away) ? 'us' : ''}"><span class="cl-full">${U.esc(U.team(f.away).name)}</span><span class="cl-short">${U.esc(U.team(f.away).short)}</span></b>${U.crest(f.away, 24)}</span>
        <span class="cl-res">${r ? U.resChip(r) : ''}${has ? '<small>Match Centre</small>' : ''}</span></li>`;
    }).join('')}</ol></section>`).join('');
  }

  function body() {
    if (mode === 'list') return listView();
    const byDate = {};
    D().fixtures.forEach((f) => { (byDate[f.date] = byDate[f.date] || []).push(f); });
    return `<div class="cal-months">${months().map(([y, m]) => monthGrid(y, m, byDate)).join('')}</div>`;
  }

  FC.views.calendar = {
    render() {
      const U = FC.u;
      if (!mode) mode = window.innerWidth < 760 ? 'list' : 'grid';
      const fx = D().fixtures;
      const p = fx.filter((f) => f.played).length;
      return `<header class="page-head"><div><h1>Calendar</h1><p>${fx.length} fixtures · ${p} played · ${fx.length - p} to go</p></div>
        <div class="panel-head tools">
          <div class="legend">${D().competitions.map((c) => `<span><i class="sw" style="--c:${U.esc(c.color)}"></i>${U.esc(c.name)}</span>`).join('')}</div>
          <div class="seg" role="group" aria-label="Calendar layout">
            <button type="button" data-mode="grid" aria-pressed="${mode === 'grid'}">Months</button>
            <button type="button" data-mode="list" aria-pressed="${mode === 'list'}">List</button></div></div></header>
        <div id="cal-body">${body()}</div>`;
    },
    after(root) {
      root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
        mode = b.dataset.mode;
        root.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        root.querySelector('#cal-body').innerHTML = body();
      }));
    },
  };
})();
