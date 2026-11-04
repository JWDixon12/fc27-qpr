/* Club Home, in score-app order: next match, coming up, form, table around us, top performers,
   one news line, squad ratings line. Sections are flat; only the next-match hero is a card. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;
  const esc = (s) => FC.u.esc(s);

  function countdown(f) {
    const now = new Date(D().meta.gameDate + 'T09:00:00');
    const ko = new Date(`${f.date}T${f.time || '15:00'}:00`);
    let mins = Math.max(0, Math.round((ko - now) / 60000));
    const d = Math.floor(mins / 1440); mins -= d * 1440;
    const h = Math.floor(mins / 60); mins -= h * 60;
    const cell = (v, l) => `<span class="cd-cell"><b>${String(v).padStart(2, '0')}</b><small>${l}</small></span>`;
    return `<div class="countdown" aria-label="Kick-off in ${d} days ${h} hours ${mins} minutes">${cell(d, 'days')}${cell(h, 'hrs')}${cell(mins, 'min')}</div>`;
  }

  function hero(f) {
    const U = FC.u;
    if (!f) return '<section class="hero"><p class="empty-note">No fixtures left this season.</p></section>';
    const side = (id) => `<div class="hero-side">${U.crest(id, 96, 'hero-crest')}<span class="hero-name"${U.hasClub(id) ? ` data-team="${id}"` : ''}>${esc(U.team(id).name)}</span></div>`;
    return `<section class="hero club-field" style="--club:${U.clubColor(D().meta.clubId)}" aria-label="Next match">
      <header class="hero-top"><span class="hero-label">Next match</span>${U.compChip(f.comp)}</header>
      <div class="hero-face">${side(f.home)}<span class="hero-vs">v</span>${side(f.away)}</div>
      <p class="hero-when">${U.date(f.date, 'day')}, ${U.time12(f.time)} · ${f.venue === 'H' ? esc(D().club.stadium) : 'Away'}</p>
      ${countdown(f)}</section>`;
  }

  function comingUp() {
    const U = FC.u;
    const list = U.upcoming().slice(1, 7);
    if (!list.length) return '';
    return `<section class="sec"><div class="sec-head"><h2>Coming up</h2><a class="sub" href="#calendar">All fixtures</a></div>
      <ol class="cu">${list.map((n) => {
        const o = U.opponent(n);
        return `<li><a class="cu-row" href="#${U.hasClub(o) ? `team/${o}` : 'calendar'}" style="--c:${esc(U.comp(n.comp).color)}">
          <span class="cu-date">${U.date(n.date, 'short')}</span>${U.crest(o, 24)}<b>${esc(U.team(o).name)}</b><span class="cu-ha">${n.venue}</span></a></li>`;
      }).join('')}</ol></section>`;
  }

  function form(played) {
    const U = FC.u;
    const list = played.slice(-5);
    if (!list.length) return '';
    return `<section class="sec"><div class="sec-head"><h2>Form</h2><span class="sub">Last ${list.length}, newest right</span></div>
      <ol class="form-line">${list.map((f) => {
        const r = U.result(f);
        const has = !!D().matches[f.id];
        const tag = has ? `a href="#match/${f.id}"` : 'span';
        return `<li><${tag} class="fl-item">${U.crest(U.opponent(f), 24)}<b>${r.gf}–${r.ga}${r.pens ? '<small class="pens">p</small>' : ''}</b><i class="res res-${r.res}">${r.res}</i></${has ? 'a' : 'span'}></li>`;
      }).join('')}</ol></section>`;
  }

  /** Table rows around our position (two above, two below). */
  function tableAround() {
    const U = FC.u;
    const rows = U.leagueRows();
    if (!rows.length || !rows[0].p) return '';
    const i = rows.findIndex((r) => U.isUs(r.team));
    const from = Math.max(0, Math.min(rows.length - 5, i - 2));
    return `<section class="sec"><div class="sec-head"><h2>${esc(U.league().name)}</h2><a class="sub" href="#league">Full table</a></div>
      <table class="data mini-table"><thead><tr><th class="n">#</th><th>Club</th><th class="n">P</th><th class="n">GD</th><th class="n">Pts</th></tr></thead><tbody>
      ${rows.slice(from, from + 5).map((r, k) => `<tr class="${U.isUs(r.team) ? 'us' : ''}"><td class="n">${from + k + 1}</td><td class="lt-club"><span class="who">${U.crest(r.team, 18)}<span class="nm-full">${esc(U.team(r.team).name)}</span><span class="nm-code">${esc(U.team(r.team).short)}</span></span></td>
        <td class="n">${r.p}</td><td class="n">${r.gf - r.ga > 0 ? '+' : ''}${r.gf - r.ga}</td><td class="n"><b>${r.pts}</b></td></tr>`).join('')}</tbody></table></section>`;
  }

  function performers() {
    const sq = D().squad.filter((p) => p.season && p.season.apps);
    if (!sq.length) return '';
    const top = (fn) => [...sq].sort((a, b) => fn(b) - fn(a))[0];
    const g = top((p) => p.season.goals + p.season.assists / 100);
    const a = top((p) => p.season.assists + p.season.goals / 100);
    const r = top((p) => (p.season.apps >= 2 ? p.season.avgRating : 0));
    const item = (p, label, v) => `<li><button type="button" class="tp" data-player="${p.id}"><span class="tp-l">${label}</span><b>${esc(p.name)}</b><span class="tp-v">${v}</span></button></li>`;
    return `<section class="sec"><div class="sec-head"><h2>Top performers</h2><a class="sub" href="#stats">Stats</a></div>
      <ol class="tp-line">${item(g, 'Goals', g.season.goals)}${item(a, 'Assists', a.season.assists)}${r.season.avgRating ? item(r, 'Avg rating', r.season.avgRating.toFixed(2)) : ''}</ol></section>`;
  }

  FC.views.home = {
    render() {
      const U = FC.u;
      const played = U.played();
      const P = FC.homePre;
      return `<div class="home2">
        <div class="h-main">${hero(U.upcoming()[0])}${comingUp()}${form(played)}</div>
        <div class="h-side">${tableAround()}${performers()}${P.news()}${P.squadLine()}</div></div>`;
    },
  };
})();
