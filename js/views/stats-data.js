/* Stats tab data: per-player aggregation filtered by competition type, team summary, and the
   pre-season sources (real 2025/26 history for our squad; attribute leaders). */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;

  const SUM_KEYS = ['goals', 'assists', 'shots', 'keyPasses', 'passes', 'dribbles', 'tackles', 'interceptions', 'possWon', 'possLost',
    'distanceKm', 'sprintKm', 'saves', 'xa', 'lineBreaks', 'duelsWon', 'mins', 'fouls'];

  /** Captured matches for our club, filtered by competition type ('all' | 'league' | 'europe' | 'cup'). */
  function matches(comp) {
    return FC.stats.captured().filter(({ f }) => comp === 'all' || FC.u.comp(f.comp).type === comp);
  }

  /** One row per player: sums of SUM_KEYS, apps, starts, rating average, motm, cards, clean sheets. */
  function players(comp) {
    const us = D().meta.clubId;
    const map = new Map();
    matches(comp).forEach(({ f, m }) => {
      const conceded = f.home === us ? m.score[1] : m.score[0];
      m.players.filter((p) => p.team === us).forEach((p) => {
        const t = map.get(p.id) || { id: p.id, apps: 0, ratingSum: 0, passAccW: 0, motm: 0, yellows: 0, reds: 0, cleanSheets: 0 };
        t.apps += 1;
        SUM_KEYS.forEach((k) => { t[k] = (t[k] || 0) + (Number(p[k]) || 0); });
        t.ratingSum += p.rating || 0;
        t.passAccW += (p.passAcc || 0) * (p.passes || 0);
        if (p.motm) t.motm += 1;
        if (['GK', 'CB', 'RB', 'LB'].includes(p.pos) && conceded === 0 && p.mins >= 60) t.cleanSheets += 1;
        map.set(p.id, t);
      });
      m.events.filter((e) => e.team === us && (e.type === 'yellow' || e.type === 'red')).forEach((e) => {
        const t = map.get(e.player);
        if (t) t[e.type === 'yellow' ? 'yellows' : 'reds'] += 1;
      });
    });
    return [...map.values()].map((t) => ({ ...t, rating: t.apps ? t.ratingSum / t.apps : null, passAcc: t.passes ? t.passAccW / t.passes : null }));
  }

  /** Team summary from our side of each captured match. */
  function team(comp) {
    const us = D().meta.clubId;
    const list = matches(comp);
    const out = { n: list.length, w: 0, d: 0, l: 0, gf: 0, ga: 0, xgf: 0, xga: 0, cs: 0, poss: 0, possN: 0, series: [] };
    list.forEach(({ f, m }) => {
      const i = f.home === us ? 0 : 1;
      const gf = m.score[i], ga = m.score[1 - i];
      out[gf > ga ? 'w' : gf === ga ? 'd' : 'l'] += 1;
      out.gf += gf; out.ga += ga; out.xgf += m.xg[i]; out.xga += m.xg[1 - i]; if (m.possession[i] != null) { out.poss += m.possession[i]; out.possN += 1; }
      if (ga === 0) out.cs += 1;
      out.series.push({ f, label: FC.u.team(FC.u.opponent(f)).short, xgf: m.xg[i], xga: m.xg[1 - i], gf, ga });
    });
    out.poss = out.possN ? out.poss / out.possN : 0;
    return out;
  }

  /** Real 2025/26 club stats for our squad (history.json lives in clubs/<us>.js). */
  function lastSeason() {
    return FC.u.loadClub(D().meta.clubId).then((c) => {
      const hist = new Map(((c && c.squad) || []).filter((p) => p.history).map((p) => [p.id, p.history.seasons]));
      return D().squad.map((p) => {
        const rows = (hist.get(p.id) || []).filter((r) => /^2025/.test(String(r.season)) && r.compType !== 'international');
        const s = (k) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
        const clubs = [...new Set(rows.map((r) => r.club))];
        return { id: p.id, apps: s('apps'), goals: s('goals'), assists: s('assists'), mins: s('minutes'), clubs };
      }).filter((r) => r.apps > 0);
    });
  }

  /** Attribute leaders from the squad's attributes. */
  function attributeLeaders() {
    const sq = D().squad.filter((p) => p.attributes && p.status !== 'loaned_out');
    const a = (p, g, k) => (p.attributes[g] || {})[k] || 0;
    const best = (label, fn, filter) => {
      const pool = sq.filter(filter || (() => true));
      const p = pool.sort((x, y) => fn(y) - fn(x))[0];
      return p ? { label, p, v: Math.round(fn(p)) } : null;
    };
    return [
      best('Fastest', (p) => a(p, 'pace', 'sprintspeed')),
      best('Best finisher', (p) => a(p, 'shooting', 'finishing')),
      best('Best passer', (p) => (a(p, 'passing', 'shortpassing') + a(p, 'passing', 'longpassing') + a(p, 'passing', 'vision')) / 3),
      best('Best tackler', (p) => a(p, 'defending', 'standingtackle')),
      best('Strongest', (p) => a(p, 'physical', 'strength')),
      best('Best goalkeeper', (p) => p.ovr, (p) => p.pos === 'GK'),
    ].filter(Boolean);
  }

  FC.statsData = { players, team, lastSeason, attributeLeaders, matches };
})();
