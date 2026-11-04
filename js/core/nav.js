/* Phone navigation: a fixed bottom tab bar (Home, Fixtures, Squad, Match, More) plus a "More"
   sheet with the remaining sections. Hidden on wider screens, where the top tab row is used. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const I = {
    home: '<path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z"/>',
    calendar: '<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    squad: '<circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19.5c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.5 14.6c2.6-.3 4.6 1.3 5 4.9"/>',
    match: '<circle cx="12" cy="12" r="8.5"/><path d="m12 7.6 3.6 2.6-1.4 4.2H9.8l-1.4-4.2z"/><path d="M12 3.5v4.1M20.1 9.4l-4.5.8M17.2 19.4l-3-5M6.8 19.4l3-5M3.9 9.4l4.5.8"/>',
    more: '<circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/>',
    stats: '<path d="M5 20V11M10 20V5M15 20v-7M20 20V8"/>',
    league: '<rect x="4" y="4.5" width="16" height="15" rx="1.5"/><path d="M4 9.5h16M4 14.5h16M9 4.5v15"/>',
    transfers: '<path d="M4 8h13l-3.5-3.5M20 16H7l3.5 3.5"/>',
    finances: '<rect x="3.5" y="6" width="17" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M7 9.5v5M17 9.5v5"/>',
    youth: '<path d="M12 20v-8M12 12c0-4 2.5-6.5 7-7-.3 4.6-2.8 7-7 7zM12 14c0-3-2-5-5.5-5.5.2 3.6 2.3 5.5 5.5 5.5z"/>',
    leagues: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.4 3.6 5.3 3.6 8.5s-1.1 6.1-3.6 8.5c-2.5-2.4-3.6-5.3-3.6-8.5S9.5 5.9 12 3.5z"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>',
    news: '<rect x="3.5" y="5" width="14" height="14.5" rx="1.5"/><path d="M17.5 9h3v9a1.5 1.5 0 0 1-3 0M7 9h7M7 12.5h7M7 16h4.5"/>',
    room: '<path d="M4.5 6.5h15v9h-8l-4.5 4v-4h-2.5z"/>',
  };
  const MAIN = [['home', 'Home'], ['calendar', 'Fixtures'], ['squad', 'Squad'], ['match', 'Match']];
  const MORE = [['news', 'News'], ['leagues', 'Leagues'], ['search', 'Search'], ['stats', 'Stats'], ['league', 'League'], ['transfers', 'Transfers'], ['finances', 'Financials'], ['youth', 'Youth'], ['room', 'The Room']];
  const icon = (k) => `<svg viewBox="0 0 24 24" aria-hidden="true">${I[k]}</svg>`;

  function mount() {
    const nav = document.createElement('nav');
    nav.className = 'bnav';
    nav.setAttribute('aria-label', 'Sections');
    nav.innerHTML = MAIN.map(([k, l]) => `<a href="#${k}" data-bnav="${k}">${icon(k)}<span>${l}</span></a>`).join('') +
      `<button type="button" data-bnav="more" aria-expanded="false" aria-controls="bsheet">${icon('more')}<span>More</span></button>`;
    const sheet = document.createElement('div');
    sheet.className = 'bsheet';
    sheet.id = 'bsheet';
    sheet.hidden = true;
    sheet.innerHTML = `<div class="bsheet-scrim" data-bclose></div><div class="bsheet-panel" role="dialog" aria-label="More sections">
      <span class="bsheet-grip" aria-hidden="true"></span>
      <div class="bsheet-grid">${MORE.filter(([k]) => k !== 'news' || ((window.CAREER || {}).news || []).length).map(([k, l]) => `<a href="#${k}" data-bmore="${k}">${icon(k)}<span>${l}</span></a>`).join('')}</div></div>`;
    document.body.append(nav, sheet);
    nav.querySelector('[data-bnav=more]').addEventListener('click', () => (sheet.hidden ? open() : close()));
    sheet.addEventListener('click', (e) => { if (e.target.closest('[data-bclose],[data-bmore]')) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  function open() {
    const s = document.getElementById('bsheet');
    s.hidden = false;
    requestAnimationFrame(() => s.classList.add('open'));
    document.querySelector('[data-bnav=more]').setAttribute('aria-expanded', 'true');
    const first = s.querySelector('a');
    if (first) first.focus();
  }
  function close() {
    const s = document.getElementById('bsheet');
    if (!s || s.hidden) return;
    s.classList.remove('open');
    document.querySelector('[data-bnav=more]').setAttribute('aria-expanded', 'false');
    setTimeout(() => { s.hidden = true; }, 220);
  }

  function update(view) {
    const inMore = MORE.some(([k]) => k === view);
    document.querySelectorAll('[data-bnav]').forEach((a) => {
      const on = a.dataset.bnav === view || (a.dataset.bnav === 'more' && inMore);
      a.classList.toggle('on', on);
      if (on && a.tagName === 'A') a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    document.querySelectorAll('[data-bmore]').forEach((a) => a.classList.toggle('on', a.dataset.bmore === view));
  }

  FC.nav = { mount, update, close, icon };
})();
