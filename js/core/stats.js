/* Derived numbers from captured matches: per-player lines, per-90 rates, team trends. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;

  /** Captured played fixtures in date order: [{f, m}] */
  /** Captured competitive fixtures in date order: [{f, m}]. With {extras:true} also captured
      matches outside the fixture list (friendlies/exhibitions carry their own m.fixture). */
  function captured(opts) {
    const list = D().fixtures.filter((f) => f.played && D().matches[f.id]).map((f) => ({ f, m: D().matches[f.id] }));
    if (!(opts && opts.extras)) return list;
    const have = new Set(list.map((x) => x.f.id));
    const extra = Object.entries(D().matches).filter(([id, m]) => m.fixture && !have.has(id)).map(([id, m]) => ({ f: { ...m.fixture, id, played: true }, m }));
    return [...list, ...extra].sort((a, b) => a.f.date.localeCompare(b.f.date));
  }

  /** Every match line for one of our players, oldest first. */
  function linesFor(id) {
    const out = [];
    captured().forEach(({ f, m }) => {
      const ln = m.players.find((p) => p.id === Number(id));
      if (ln) out.push({ f, m, ln });
    });
    return out;
  }

  const METRICS = [
    { key: 'goals', label: 'Goals', per90: true },
    { key: 'assists', label: 'Assists', per90: true },
    { key: 'rating', label: 'Average rating', avg: true, dp: 2, min: 2 },
    { key: 'motm', label: 'Player of the match', per90: false, bool: true },
    { key: 'shots', label: 'Shots', per90: true },
    { key: 'keyPasses', label: 'Key passes', per90: true },
    { key: 'passes', label: 'Passes', per90: true },
    { key: 'passAcc', label: 'Pass accuracy', avg: true, unit: '%', min: 2, weight: 'passes' },
    { key: 'dribbles', label: 'Dribbles', per90: true },
    { key: 'tackles', label: 'Tackles', per90: true },
    { key: 'interceptions', label: 'Interceptions', per90: true },
    { key: 'possWon', label: 'Possession won', per90: true },
    { key: 'distanceKm', label: 'Distance covered', per90: true, dp: 1, unit: ' mi' },
    { key: 'sprintKm', label: 'Sprint distance', per90: true, dp: 1, unit: ' mi' },
    { key: 'saves', label: 'Saves', per90: true },
    { key: 'xa', label: 'Expected assists', per90: true, dp: 2 },
    { key: 'lineBreaks', label: 'Line breaks completed', per90: true },
    { key: 'duelsWon', label: 'Duels won', per90: true },
    { key: 'possLost', label: 'Possession lost', per90: true },
    { key: 'mins', label: 'Minutes', per90: false },
  ];

  /** Season totals per our player from match lines. */
  function totals() {
    const us = D().meta.clubId;
    const map = new Map();
    captured().forEach(({ m }) => {
      m.players.filter((p) => p.team === us).forEach((p) => {
        const t = map.get(p.id) || { id: p.id, apps: 0, ratingSum: 0, passAccW: 0 };
        t.apps += 1;
        METRICS.forEach((mt) => {
          if (mt.avg) return;
          const v = mt.bool ? (p[mt.key] ? 1 : 0) : p[mt.key] || 0;
          t[mt.key] = (t[mt.key] || 0) + v;
        });
        t.ratingSum += p.rating;
        t.passAccW += (p.passAcc || 0) * (p.passes || 0);
        map.set(p.id, t);
      });
    });
    map.forEach((t) => {
      t.rating = t.ratingSum / t.apps;
      t.passAcc = t.passes ? t.passAccW / t.passes : 0;
    });
    return [...map.values()];
  }

  /** Value of a metric for a totals row; per90 divides countable stats by minutes/90. */
  function value(t, mt, per90) {
    if (mt.avg) return t.apps >= (mt.min || 1) ? t[mt.key] : null;
    if (per90 && mt.per90) return t.mins >= 90 ? (t[mt.key] / t.mins) * 90 : null;
    return t[mt.key];
  }

  /** Team-level series per captured match, from our perspective. */
  function teamSeries() {
    const us = D().meta.clubId;
    return captured().map(({ f, m }) => {
      const i = f.home === us ? 0 : 1;
      const o = 1 - i;
      return {
        f, m, label: FC.u.team(FC.u.opponent(f)).short, date: f.date,
        xgFor: m.xg[i], xgAg: m.xg[o], gf: m.score[i], ga: m.score[o], poss: m.possession[i],
        shots: m.teamStats.shots[i], shotsAg: m.teamStats.shots[o], passAcc: m.teamStats.passAcc[i],
      };
    });
  }

  const rolling = (vals, k) => vals.map((_, i) => {
    const s = vals.slice(Math.max(0, i - k + 1), i + 1);
    return +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(2);
  });

  /** Which side index (0 home / 1 away) we were in a fixture. */
  const side = (f) => (f.home === D().meta.clubId ? 0 : 1);

  FC.stats = { captured, linesFor, METRICS, totals, value, teamSeries, rolling, side };
})();
