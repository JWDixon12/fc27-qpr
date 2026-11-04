/* App shell: masthead, tab nav, hash router (#view or #view/arg), player drawer, global clicks. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  FC.views = FC.views || {};
  const TABS = [
    ['home', 'Club Home'], ['news', 'News'], ['calendar', 'Calendar'], ['squad', 'Squad'], ['match', 'Match Centre'], ['stats', 'Stats'],
    ['league', 'League'], ['transfers', 'Transfers'], ['finances', 'Financials'], ['youth', 'Youth Academy'], ['room', 'The Room'], ['leagues', 'Leagues'], ['search', 'Search'],
  ];

  function fail(msg) {
    document.getElementById('view').innerHTML = `<section class="empty-state"><h1>Career data not loaded</h1><p>${FC.u ? FC.u.esc(msg) : msg}</p></section>`;
  }

  function masthead() {
    const C = window.CAREER;
    const u = FC.u;
    const crest = u.crest(C.meta.clubId, 56, 'mast-crest');
    document.getElementById('mast').innerHTML = `
      <a class="mast-id" href="#home" aria-label="Club home">${crest}
        <span class="mast-name"><b>${u.esc(C.club.name)}</b><small>${u.esc(C.meta.season)} · Manager ${u.esc(C.meta.manager)}</small></span></a>
      <div class="mast-meta">
        ${C.meta.sample ? '<span class="sample-badge" title="Generated sample data, not your save">Demo · sample data</span>' : ''}
        <span class="game-date" title="Current in-game date"><small>In-game date</small><b>${u.date(C.meta.gameDate, 'day')} ${u.parseDate(C.meta.gameDate).getFullYear()}</b></span>
      </div>
      <p class="mast-pill" aria-label="Season, manager and in-game date"><span>${u.esc(C.meta.season)}</span><span>${u.esc(C.meta.manager)}</span><span>${u.date(C.meta.gameDate)}</span></p>`;
    document.getElementById('tabs').innerHTML = TABS.filter(([id]) => id !== 'news' || (C.news || []).length).map(([id, label]) => `<a href="#${id}" data-tab="${id}">${label}</a>`).join('');
  }

  /** Hash = #view[/arg][?p=<playerId>[&c=<clubId>]]. The query opens the player sheet over the view. */
  function parse() {
    const raw = (location.hash || '#home').slice(1);
    const [path, query] = raw.split('?');
    const [view, ...rest] = path.split('/');
    const q = new URLSearchParams(query || '');
    return { view: FC.views[view] ? view : 'home', arg: rest.join('/') || null, path, player: q.get('p'), club: q.get('c') };
  }

  function renderView(view, arg) {
    const root = document.getElementById('view');
    document.querySelectorAll('#tabs a').forEach((a) => {
      const on = a.dataset.tab === view;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
      if (on && a.scrollIntoView) a.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    const v = FC.views[view];
    try {
      root.innerHTML = `<div class="view view-${view}">${v.render(arg)}</div>`;
      if (v.after) v.after(root.firstElementChild, arg);
      FC.chart.refill();
    } catch (err) {
      root.innerHTML = `<section class="empty-state"><h1>This tab hit a data problem</h1><p>${FC.u.esc(err.message)}</p><p>Check that data/career.js follows docs/DATA_SCHEMA.md.</p></section>`;
      setTimeout(() => { throw err; });
    }
    const label = (TABS.find((t) => t[0] === view) || [])[1] || (v.title ? v.title(arg) : 'Club');
    document.title = `${label} · ${window.CAREER.club.short} career`;
  }

  function route() {
    const r = parse();
    FC.tip.hide();
    if (FC.nav) { FC.nav.update(r.view); FC.nav.close(); }
    const key = `${r.view}/${r.arg || ''}`;
    if (FC._routeKey !== key) {
      if (FC._routeKey) window.scrollTo({ top: 0 });
      renderView(r.view, r.arg);
      FC._routeKey = key;
    }
    if (r.player) showPlayer(r.player, r.club);
    else hidePlayer();
  }
  FC.rerender = () => { const r = parse(); renderView(r.view, r.arg); };

  /* ---------- player sheet (part of the URL so phone Back closes it) ---------- */
  let lastFocus = null;
  function showPlayer(id, club) {
    const dr = document.getElementById('drawer');
    const body = dr.querySelector('.drawer-body');
    const ours = FC.u.player(id);
    if (ours && FC.views._player) {
      body.innerHTML = FC.views._player.render(ours);
      FC.views._player.after(body, ours);
    } else if (club && FC.attrs) {
      body.innerHTML = '<p class="empty-note">Loading player…</p>';
      FC.u.loadClub(club).then((c) => {
        const p = c && c.squad.find((x) => String(x.id) === String(id));
        body.innerHTML = p ? FC.attrs.sheet(p, c) : '<p class="empty-note">Player not found.</p>';
        if (p) FC.attrs.after(body, p, c);
      });
    } else return;
    if (dr.hidden) lastFocus = document.activeElement;
    dr.hidden = false;
    requestAnimationFrame(() => dr.classList.add('open'));
    document.body.classList.add('drawer-open');
    dr.querySelector('.drawer-panel').scrollTop = 0;
    dr.querySelector('.drawer-close').focus({ preventScroll: true });
  }
  function hidePlayer() {
    const dr = document.getElementById('drawer');
    if (dr.hidden) return;
    dr.classList.remove('open');
    document.body.classList.remove('drawer-open');
    setTimeout(() => { if (!dr.classList.contains('open')) dr.hidden = true; }, 260);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  /** Close via button / scrim / Escape: step back if the sheet was opened in this session, else drop the query. */
  function closePlayer() {
    if (!parse().player) return;
    if (FC._openedHere) history.back();
    else location.hash = parse().path;
  }
  FC.openPlayer = (id, club) => {
    FC._openedHere = true;
    const ours = FC.u.player(id);
    location.hash = `${parse().path}?p=${id}${!ours && club ? `&c=${club}` : ''}`;
  };

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('.drawer-close') || t.classList.contains('drawer-scrim')) { closePlayer(); return; }
    const tm = t.closest('[data-team]');
    if (tm && FC.u.hasClub(tm.dataset.team)) { e.preventDefault(); e.stopPropagation(); location.hash = `team/${tm.dataset.team}`; return; }
    const pl = t.closest('[data-player]');
    if (pl) { e.preventDefault(); FC.openPlayer(pl.dataset.player, pl.dataset.club); return; }
    const href = t.closest('[data-href]');
    if (href) { e.preventDefault(); location.hash = href.dataset.href; }
  });
  window.addEventListener('hashchange', () => { if (!parse().player) FC._openedHere = false; });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePlayer();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-player],[data-href],[data-team]') && !e.target.matches('a,button')) {
      e.preventDefault();
      e.target.click();
    }
  });

  function boot() {
    if (!window.CAREER) { fail('data/career.js did not load or does not set window.CAREER.'); return; }
    try {
      masthead();
    } catch (err) {
      fail(err.message);
      throw err;
    }
    document.title = window.CAREER.club.name;
    const col = (window.CAREER.club.colors || {}).primary;
    if (col) {
      const css = document.documentElement.style;
      const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      const [r, g, b] = rgb(col);
      css.setProperty('--red', col); css.setProperty('--home', col); css.setProperty('--c-league', col);
      css.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
      css.setProperty('--red-deep', `rgb(${Math.round(r * 0.62)}, ${Math.round(g * 0.62)}, ${Math.round(b * 0.62)})`);
    }
    const icon = document.querySelector('link[rel=icon]');
    if (icon && window.CAREER.club.crest) icon.href = window.CAREER.club.crest;
    if (FC.nav) FC.nav.mount();
    const setH = () => document.documentElement.style.setProperty('--mast-h', `${document.querySelector('.mast').offsetHeight}px`);
    setH();
    window.addEventListener('resize', setH);
    window.addEventListener('hashchange', route);
    route();
    document.body.classList.add('ready');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
