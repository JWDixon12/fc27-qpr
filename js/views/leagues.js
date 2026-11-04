/* Leagues browser (#leagues, #leagues/<code>) and global player search (#search).
   The search index (data/search.js, ~6k rows) is loaded only when the search page opens. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;
  const esc = (s) => FC.u.esc(s);
  const st = { q: '', pos: 'ALL' };
  let searchWait = null;

  function loadSearch() {
    if (window.SEARCH) return Promise.resolve(window.SEARCH);
    if (!searchWait) {
      searchWait = new Promise((res) => {
        const sc = document.createElement('script');
        sc.src = 'data/search.js?v=' + (window.FC_BUILD || '');
        sc.onload = () => res(window.SEARCH || []);
        sc.onerror = () => { searchWait = null; res([]); };
        document.head.appendChild(sc);
      });
    }
    return searchWait;
  }

  const searchBox = (value) => `<a class="search-link" href="#search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
    <span>${value ? esc(value) : 'Search players by name, club or position'}</span></a>`;

  function leagueList() {
    const U = FC.u;
    const L = D().leagues || [];
    if (!L.length) return '<p class="empty-note">No league data in this build.</p>';
    return `<ol class="lg-list">${L.map((l) => {
      const top = l.teams.map((t) => ({ t, r: (U.team(t).ratings || {}).ovr || 0 })).sort((a, b) => b.r - a.r).slice(0, 5);
      return `<li><a class="lg-row" href="#leagues/${esc(l.code)}"><span class="lg-name"><b>${esc(l.name)}</b><small>${esc(l.country)} · ${l.teams.length} clubs</small></span>
        <span class="lg-crests" aria-hidden="true">${top.map(({ t }) => U.crest(t, 28).replace(/ data-team="\d+"/, '')).join('')}</span></a></li>`;
    }).join('')}</ol>`;
  }

  function clubList(code) {
    const U = FC.u;
    const l = (D().leagues || []).find((x) => x.code === code);
    if (!l) return '<p class="empty-note">League not found.</p>';
    const rows = l.teams.map((t) => ({ t, team: U.team(t) })).sort((a, b) => ((b.team.ratings || {}).ovr || 0) - ((a.team.ratings || {}).ovr || 0));
    return `<header class="page-head"><div><h1>${esc(l.name)}</h1><p>${esc(l.country)} · ${l.teams.length} clubs, ordered by overall rating</p></div></header>
      <ol class="club-list">${rows.map(({ t, team }) => {
        const r = team.ratings || {};
        return `<li><a class="club-row" href="#team/${t}">${U.crest(t, 40).replace(/ data-team="\d+"/, '')}<span class="cr-name"><b>${esc(team.name)}</b>
          <small>${r.att != null ? `ATT ${r.att} · MID ${r.mid} · DEF ${r.def}` : ''}</small></span>${r.ovr != null ? `<span class="sq-ovr">${r.ovr}</span>` : ''}</a></li>`;
      }).join('')}</ol>`;
  }

  FC.views.leagues = {
    title: (code) => (code ? ((D().leagues || []).find((x) => x.code === code) || {}).name || 'Leagues' : 'Leagues'),
    render(code) {
      const back = code ? `<button type="button" class="back-btn" onclick="history.length > 1 ? history.back() : (location.hash = 'leagues')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>Leagues</button>` : '';
      if (code) return `<div class="lgv">${back}${clubList(code)}</div>`;
      return `<div class="lgv"><header class="page-head"><div><h1>Leagues</h1><p>Every club and player.</p></div></header>${searchBox()}${leagueList()}</div>`;
    },
  };

  /* ---------- player search ---------- */
  const GROUPS = [['ALL', 'All'], ['GK', 'GK'], ['DEF', 'DEF'], ['MID', 'MID'], ['ATT', 'ATT']];
  const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  function results(rows) {
    const U = FC.u;
    const q = norm(st.q.trim());
    if (q.length < 2 && st.pos === 'ALL') return '<p class="empty-note">Type at least two letters, or pick a position.</p>';
    const words = q.split(/\s+/).filter(Boolean);
    const hits = [];
    for (const r of rows) {
      if (st.pos !== 'ALL' && U.posGroup(r[3]) !== st.pos) continue;
      if (words.length) {
        const hay = norm(`${r[1]} ${U.team(r[2]).name} ${r[3]}`);
        if (!words.every((w) => hay.includes(w))) continue;
      }
      hits.push(r);
      if (hits.length >= 60) break;
    }
    if (!hits.length) return '<p class="empty-note">No players match.</p>';
    const ext = ['', 'png', 'webp'];
    return `<p class="sub sr-count">${hits.length === 60 ? 'Top 60 by overall' : `${hits.length} player${hits.length === 1 ? '' : 's'}`}</p><ol class="sq-list">${hits.map((r) => {
      const p = { name: r[1], short: r[1], portrait: r[6] ? `img/players/${r[0]}.${ext[r[6]]}` : null };
      const ours = U.isUs(r[2]);
      return `<li><button type="button" class="sq-row" data-player="${r[0]}"${ours ? '' : ` data-club="${r[2]}"`}>${U.portrait(p, 56)}
        <span class="sq-main"><b><span class="sq-pos">${esc(r[3])}</span>${esc(r[1])}</b><small>${esc(U.team(r[2]).name)} · ${r[5]}</small></span><span class="sq-ovr">${r[4]}</span></button></li>`;
    }).join('')}</ol>`;
  }

  FC.views.search = {
    title: () => 'Search',
    render() {
      return `<div class="srv"><header class="page-head"><div><h1>Search</h1><p>All players, best first.</p></div></header>
        <input class="field sr-input" type="search" id="sr-q" placeholder="Name, club or position" value="${esc(st.q)}" aria-label="Search players" autocomplete="off">
        <div class="seg sr-seg" role="group" aria-label="Position">${GROUPS.map(([k, l]) => `<button type="button" data-srpos="${k}" aria-pressed="${st.pos === k}">${l}</button>`).join('')}</div>
        <div id="sr-out"><p class="empty-note">Loading the player index…</p></div></div>`;
    },
    after(root) {
      const out = root.querySelector('#sr-out');
      const input = root.querySelector('#sr-q');
      loadSearch().then((rows) => {
        const draw = () => { out.innerHTML = results(rows); };
        draw();
        let t = 0;
        input.addEventListener('input', () => { st.q = input.value; clearTimeout(t); t = setTimeout(draw, 120); });
        root.querySelectorAll('[data-srpos]').forEach((b) => b.addEventListener('click', () => {
          st.pos = b.dataset.srpos;
          root.querySelectorAll('[data-srpos]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          draw();
        }));
      });
      if (window.matchMedia('(min-width: 761px)').matches) input.focus();
    },
  };
})();
