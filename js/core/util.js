/* Shared helpers. Classic script: everything hangs off window.FC. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  FC.views = FC.views || {};
  const D = () => window.CAREER;

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  const cur = () => (D().meta && D().meta.currency) || '€';
  function money(n, opts) {
    if (n == null) return '—';
    const sign = n < 0 ? '−' : opts && opts.plus && n > 0 ? '+' : '';
    const a = Math.abs(n);
    let s;
    if (a >= 1e9) s = (a / 1e9).toFixed(2) + 'B';
    else if (a >= 1e6) s = (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    else if (a >= 1e3) s = Math.round(a / 1e3) + 'K';
    else s = String(a);
    return sign + cur() + s;
  }
  /** Wages are stored per week (game units); Justin reads them per year. */
  const WEEKS = 52;
  const wageYr = (w) => (w == null ? '—' : money(w * WEEKS));
  const wageYrTag = (w) => (w == null ? null : `${money(w * WEEKS)}/yr`);
  /** 189 -> 6'2" ; 77 -> 170 lbs. */
  function height(cm) {
    if (!cm) return null;
    const inches = Math.floor(cm / 2.54 + 1e-9); // EA truncates, e.g. 189 cm -> 6'2"
    return `${Math.floor(inches / 12)}'${inches % 12}"`;
  }
  const weight = (kg) => (kg ? `${Math.floor(kg * 2.20462)} lbs` : null); // EA truncates: 77 kg -> 169 lbs
  /** FC contracts run to the end of June: 2030 -> 'thru Jun 2030' (long) / 'thru 2030' (short). */
  const contract = (y, long) => (y ? `thru ${long ? 'Jun ' : ''}${y}` : null);
  const num = (n, dp) => (n == null || Number.isNaN(n) ? '—' : Number(n).toLocaleString('en-GB', { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }));

  const parseDate = (s) => new Date(s + 'T12:00:00');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  function date(s, style) {
    if (!s) return '—';
    const d = parseDate(s);
    if (style === 'short') return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
    if (style === 'day') return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
    return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  /** "20:00" -> "8:00 PM". Empty or malformed input returns ''. */
  function time12(t) {
    const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
    if (!m) return '';
    const h = Number(m[1]);
    return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
  }
  const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 864e5);

  /* ---------- lookups ---------- */
  const team = (id) => D().teams[String(id)] || { name: String(id), short: String(id).slice(0, 3).toUpperCase(), crest: null };
  const teamName = (id) => (typeof id === 'number' || /^\d+$/.test(String(id)) ? team(id).name : String(id));
  const comp = (id) => D().competitions.find((c) => c.id === id) || (D().otherComps || []).find((c) => c.id === id) || { id, name: id, type: 'cup', color: '#888' };
  const squadById = () => {
    if (!FC._squadIdx) FC._squadIdx = new Map(D().squad.map((p) => [p.id, p]));
    return FC._squadIdx;
  };
  const player = (id) => squadById().get(Number(id));
  /** Name for a player id from squad or any captured match line; strings pass through. */
  function personName(id) {
    if (id == null) return '';
    if (typeof id === 'string' && !/^\d+$/.test(id)) return id;
    const p = player(id);
    if (p) return p.short;
    for (const m of Object.values(D().matches)) {
      const ln = m.players.find((x) => x.id === Number(id));
      if (ln && ln.name) return ln.name;
    }
    return 'Unknown';
  }
  const us = () => D().meta.clubId;
  const isUs = (id) => Number(id) === us();
  const opponent = (f) => (f.home === us() ? f.away : f.home);
  /** Result from our point of view: {res:'W'|'D'|'L', gf, ga} or null. */
  function result(f) {
    if (!f.played || f.hg == null || (f.home !== us() && f.away !== us())) return null;
    const home = f.home === us();
    const gf = home ? f.hg : f.ag;
    const ga = home ? f.ag : f.hg;
    if (gf === ga && f.pens) {   // cup tie settled by a shootout: the shootout decides W / L
      const pf = home ? f.pens[0] : f.pens[1];
      const pa = home ? f.pens[1] : f.pens[0];
      return { res: pf > pa ? 'W' : 'L', gf, ga, pens: [pf, pa] };
    }
    return { res: gf > ga ? 'W' : gf === ga ? 'D' : 'L', gf, ga };
  }
  /** ' (3–5 pens)' after a score: home-away order for fixtures, ours-theirs for results. */
  const pensTag = (f) => (f && f.pens ? ` <small class="pens">(${f.pens[0]}–${f.pens[1]} pens)</small>` : '');
  const pensR = (r) => (r && r.pens ? ` <small class="pens">(${r.pens[0]}–${r.pens[1]} pens)</small>` : '');
  /** Our domestic league competition and its table rows. */
  const league = () => D().competitions.find((c) => c.type === 'league') || { id: 'PL', name: 'League' };
  const leagueRows = () => (D().table && D().table[league().id]) || [];
  const played = () => D().fixtures.filter((f) => f.played);
  const upcoming = () => D().fixtures.filter((f) => !f.played);

  /* ---------- images with graceful fallback ---------- */
  function initials(name) {
    const parts = String(name).replace(/\./g, '').split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts.length === 1 ? parts[0].slice(0, 2) : parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  /** Primary club colours (deepened where the kit colour is too light for white text). */
  const CLUB_COLORS = { 1: '#b8000a', 2: '#670e36', 5: '#034694', 7: '#003399', 8: '#1d428a', 9: '#b0102a', 10: '#1f5f94', 11: '#b51d12',
    13: '#2a2627', 14: '#b80000', 18: '#132257', 21: '#c1052a', 32: '#b8000a', 31: '#b51d12', 52: '#7d1b2a', 94: '#0033a0', 106: '#c1121f',
    144: '#2a2a2a', 237: '#00703f', 240: '#b52d20', 241: '#004d98', 243: '#2a2a3a', 305: '#a3001b', 483: '#8a6d00', 1745: '#0b3d91',
    1799: '#1b458f', 1800: '#1d6fa3', 1808: '#0057b8', 1925: '#c00510', 1943: '#a50d12', 1952: '#a86400', 112172: '#c0063a',
    22: '#a88400', 23: '#0f6b3a', 25: '#b8001a', 28: '#0a3f8f', 34: '#004d9d', 36: '#b8001a', 38: '#1a7f49', 169: '#b5121c', 580: '#2a2a2e',
    1824: '#9e0010', 1831: '#b8001a', 10029: '#1961b5', 10030: '#003a80', 100409: '#a8302c', 66: '#1c3f94', 191: '#b50e2a', 211: '#0b4ea2',
    219: '#1f7ea8', 327: '#2a2a2e', 700: '#7d6b00', 873: '#1a5aa8', 1873: '#b8001a' };
  const clubColor = (id) => (Number(id) === us() && D().club.colors ? D().club.colors.primary : CLUB_COLORS[Number(id)] || '#3a3a40');
  const SHORT_ALIAS = { 'Olympique Lyonnais': 'Lyon', 'Olympique de Marseille': 'Marseille', 'Paris Saint-Germain': 'PSG', 'Manchester City': 'Man City',
    'Manchester United': 'Man United', 'Bayer 04 Leverkusen': 'Leverkusen', 'Borussia Dortmund': 'Dortmund', 'Tottenham Hotspur': 'Spurs',
    'Borussia Mönchengladbach': "M'gladbach", 'Real Madrid Castilla': 'Castilla', 'Wolverhampton Wanderers': 'Wolves', 'Newcastle United': 'Newcastle',
    'Nottingham Forest': "Nott'm Forest", 'Brighton & Hove Albion': 'Brighton', 'West Ham United': 'West Ham', 'Atlético de Madrid': 'Atlético' };
  const GENERIC = /^(?:FC|AFC|CF|SC|SV|VfB|VfL|TSG|FSV|RC|RCD|SD|UD|CD|AC|AS|SS|SSC|OGC|LOSC|SpVgg|1\.|FK|SK|CA|Club|Royal)\s+|\s+(?:FC|CF|AFC|SC|CP|AC|SD|BSC|\d{4})$/;
  /** Compact club name for tight table cells: alias, else strip generic tokens. */
  function shortenName(name) {
    let n = SHORT_ALIAS[name] || String(name || '');
    for (let i = 0; i < 3 && GENERIC.test(n); i++) n = n.replace(GENERIC, '');
    return n.trim();
  }
  const shortName = (id) => { const t = team(id); const sn = t.shortName && t.shortName.length > 3 ? t.shortName : t.name; return shortenName(SHORT_ALIAS[t.name] || sn); };
  const hasClub = (id) => (D().clubIndex || []).includes(Number(id));
  /** Load data/clubs/<id>.js once (script injection works on file:// and static hosting). */
  const clubWaits = {};
  function loadClub(id) {
    const n = Number(id);
    window.CLUBS = window.CLUBS || {};
    if (window.CLUBS[n]) return Promise.resolve(window.CLUBS[n]);
    if (!hasClub(n)) return Promise.resolve(null);
    if (!clubWaits[n]) {
      clubWaits[n] = new Promise((res) => {
        const sc = document.createElement('script');
        sc.src = `data/clubs/${n}.js?v=${window.FC_BUILD || ''}`;
        sc.onload = () => res(window.CLUBS[n] || null);
        sc.onerror = () => { delete clubWaits[n]; res(null); };
        document.head.appendChild(sc);
      });
    }
    return clubWaits[n];
  }
  function crest(id, size, extra) {
    const t = team(id);
    const tap = hasClub(id) ? ` data-team="${Number(id)}"` : '';
    const sz = size || 32;
    const fb = esc(t.short || initials(t.name));
    if (!t.crest) return `<span class="crest-fb" style="--s:${sz}px" aria-hidden="true"${tap}>${fb}</span>`;
    return `<img class="crest ${extra || ''}" src="${esc(t.crest)}" alt="${esc(t.name)} crest" width="${sz}" height="${sz}" loading="lazy" data-fb="${fb}" data-fbk="crest" onerror="FC.u.imgFail(this)"${tap}>`;
  }
  function portrait(p, size, extra) {
    const sz = size || 48;
    const name = p ? p.name || p.short : '?';
    const fb = esc(initials(name));
    if (!p || !p.portrait) return `<span class="face-fb" style="--s:${sz}px" aria-hidden="true">${fb}</span>`;
    return `<img class="face ${extra || ''}" src="${esc(p.portrait)}" alt="" width="${sz}" height="${sz}" loading="lazy" data-fb="${fb}" data-fbk="face" onerror="FC.u.imgFail(this)">`;
  }
  /** " · 56 caps, 26 goals" for a senior international (Transfermarkt to 30 Jun 2026, then the save). */
  function caps(p) {
    const n = p && p.intl;
    if (!n || !n.caps) return '';
    const t = `${n.caps} ${n.caps === 1 ? 'cap' : 'caps'}, ${n.goals} ${n.goals === 1 ? 'goal' : 'goals'}`;
    return ` <span class="pp-caps" title="${esc(n.team)} senior caps">· ${t}</span>`;
  }
  function flag(p) {
    if (!p || !p.natFlag) return '<span class="flag flag-ph" aria-hidden="true"></span>';
    return `<img class="flag" src="${esc(p.natFlag)}" alt="${esc(p.nat)}" title="${esc(p.nat)}" width="21" height="14" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'flag flag-ph'}))">`;
  }
  function imgFail(img) {
    const span = document.createElement('span');
    span.className = img.dataset.fbk === 'crest' ? 'crest-fb' : 'face-fb';
    span.style.setProperty('--s', (img.getAttribute('width') || 32) + 'px');
    span.setAttribute('aria-hidden', 'true');
    span.textContent = img.dataset.fb || '?';
    if (img.dataset.team) span.dataset.team = img.dataset.team;
    if (img.className) span.className += ' ' + img.className.replace(/\b(crest|face)\b/g, '').trim();
    img.replaceWith(span);
  }

  /* ---------- small UI atoms ---------- */
  const compChip = (id) => {
    const c = comp(id);
    return `<span class="comp-chip" style="--c:${esc(c.color)}"><i></i>${esc(c.name)}</span>`;
  };
  const resChip = (r) => (r ? `<span class="res res-${r.res}" title="${{ W: 'Win', D: 'Draw', L: 'Loss' }[r.res]}">${r.res}</span>` : '');
  const resPill = (r) => (r ? `<span class="res-pill rp-${r.res}">${{ W: 'Win', D: 'Draw', L: 'Loss' }[r.res]}</span>` : '');
  /** Goal lines for one team in a captured match: "Name 23' (pen)". */
  const goalsFor = (m, teamId) => (m ? m.events.filter((e) => /goal/.test(e.type) && e.team === teamId)
    .map((e) => `${esc(personName(e.player))}${e.minute == null ? '' : ` ${e.minute}'`}${e.type === 'pen_goal' ? ' (pen)' : e.type === 'own_goal' ? ' (og)' : ''}`) : []);
  const apps = (n) => `${n} app${n === 1 ? '' : 's'}`;
  /** Plain empty-state block: a factual heading and one line. */
  const ghostCard = (title, body) => `<section class="panel ghost-card pp-wide"><h3>${esc(title)}</h3><p>${esc(body)}</p></section>`;
  const ratingClass = (r) => (r == null ? '' : r >= 8 ? 'r-elite' : r >= 7 ? 'r-good' : r >= 6 ? 'r-ok' : 'r-poor');
  const sum = (a, f) => a.reduce((s, x) => s + (f ? f(x) : x), 0);
  const posGroup = (pos) =>
    pos === 'GK' ? 'GK' : /B$|CB|WB/.test(pos) ? 'DEF' : /DM|CM|AM|^[LR]M$/.test(pos) ? 'MID' : 'ATT';

  FC.u = {
    pensTag, pensR,
    hasClub, loadClub, clubColor, shortName, shortenName, esc, money, wageYr, wageYrTag, height, weight, contract, num, date, time12, parseDate, daysBetween, MONTHS, MONTHS_LONG, DAYS,
    league, leagueRows, team, teamName, comp, player, personName, us, isUs, opponent, result, played, upcoming,
    initials, crest, portrait, flag, caps, imgFail, compChip, resChip, resPill, goalsFor, apps, ghostCard, ratingClass, sum, posGroup,
  };
})();
