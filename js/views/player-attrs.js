/* Player attributes: bio line, six-axis radar (outfield PAC..PHY, keepers DIV..POS) against the
   club average, and every detailed attribute in FIFA-style colour bands. Used by our player sheet
   and by the sheet for any other club's player (FC.attrs.sheet). Never shows potential. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const esc = (s) => FC.u.esc(s);

  const OUT_AXES = [['PAC', 'Pace'], ['SHO', 'Shooting'], ['PAS', 'Passing'], ['DRI', 'Dribbling'], ['DEF', 'Defending'], ['PHY', 'Physical']];
  const GK_AXES = [['DIV', 'Diving'], ['HAN', 'Handling'], ['KIC', 'Kicking'], ['REF', 'Reflexes'], ['SPD', 'Speed'], ['POS', 'Positioning']];
  const GROUPS = [
    ['pace', 'Pace', [['acceleration', 'Acceleration'], ['sprintspeed', 'Sprint speed']]],
    ['shooting', 'Shooting', [['positioning', 'Positioning'], ['finishing', 'Finishing'], ['shotpower', 'Shot power'], ['longshots', 'Long shots'], ['volleys', 'Volleys'], ['penalties', 'Penalties']]],
    ['passing', 'Passing', [['vision', 'Vision'], ['crossing', 'Crossing'], ['freekickaccuracy', 'FK accuracy'], ['shortpassing', 'Short passing'], ['longpassing', 'Long passing'], ['curve', 'Curve']]],
    ['dribbling', 'Dribbling', [['agility', 'Agility'], ['balance', 'Balance'], ['reactions', 'Reactions'], ['ballcontrol', 'Ball control'], ['dribbling', 'Dribbling'], ['composure', 'Composure']]],
    ['defending', 'Defending', [['interceptions', 'Interceptions'], ['headingaccuracy', 'Heading accuracy'], ['defensiveawareness', 'Def. awareness'], ['standingtackle', 'Standing tackle'], ['slidingtackle', 'Sliding tackle']]],
    ['physical', 'Physical', [['jumping', 'Jumping'], ['stamina', 'Stamina'], ['strength', 'Strength'], ['aggression', 'Aggression']]],
    ['goalkeeping', 'Goalkeeping', [['gkdiving', 'Diving'], ['gkhandling', 'Handling'], ['gkkicking', 'Kicking'], ['gkpositioning', 'Positioning'], ['gkreflexes', 'Reflexes']]],
  ];

  /** FIFA-style value band. */
  const band = (v) => (v >= 85 ? 'b5' : v >= 75 ? 'b4' : v >= 65 ? 'b3' : v >= 50 ? 'b2' : 'b1');
  const isGK = (p) => p.pos === 'GK';
  const axesFor = (p) => (isGK(p) ? GK_AXES : OUT_AXES);
  const outOf5 = (n) => (n == null ? '—' : `${n}/5`);

  function squadAverage(squad, gk) {
    const pool = squad.filter((x) => x.face && isGK(x) === gk);
    const keys = (gk ? GK_AXES : OUT_AXES).map(([k]) => k);
    if (!pool.length) return null;
    return Object.fromEntries(keys.map((k) => [k, Math.round(pool.reduce((s, x) => s + (x.face[k] || 0), 0) / pool.length)]));
  }

  function radar(p, avg, avgLabel) {
    if (!p.face) return '';
    const axes = axesFor(p);
    const series = [];
    if (avg) series.push({ name: avgLabel, color: 'var(--mute)', values: axes.map(([k]) => (avg[k] || 0) / 99), raw: axes.map(([k]) => avg[k]) });
    series.push({ name: p.short || p.name, color: 'var(--red)', values: axes.map(([k]) => (p.face[k] || 0) / 99), raw: axes.map(([k]) => p.face[k]) });
    const tiles = axes.map(([k]) => `<div><dt>${k}</dt><dd class="${band(p.face[k])}">${p.face[k]}</dd></div>`).join('');
    return `<div class="at-radar">${FC.chart.radar(axes.map(([k]) => ({ label: `${k} ${p.face[k]}` })), series, 300)}</div><dl class="at-face">${tiles}</dl>`;
  }

  function groups(p) {
    if (!p.attributes) return '';
    const order = isGK(p) ? [GROUPS[6], ...GROUPS.slice(0, 6)] : GROUPS.slice(0, 6);
    return `<div class="at-groups">${order.map(([key, label, rows]) => {
      const g = p.attributes[key] || {};
      return `<section class="at-g"><h4>${label}</h4><dl>${rows.map(([k, l]) => `<div><dt>${l}</dt><dd class="${band(g[k])}">${g[k] == null ? '—' : g[k]}</dd></div>`).join('')}</dl></section>`;
    }).join('')}</div>`;
  }

  function bio(p) {
    const items = [
      ['Age', p.age], ['Height', FC.u.height(p.height)], ['Weight', FC.u.weight(p.weight)],
      ['Foot', p.foot], ['Weak foot', outOf5(p.weakFoot)], ['Skill moves', outOf5(p.skillMoves)], ['Int. reputation', outOf5(p.intlRep)],
      ['Nation', p.nat], ['Wage', FC.u.wageYrTag(p.wage)], ['Contract', FC.u.contract(p.contractEnd, true)],
    ].filter(([, v]) => v != null && v !== '');
    return `<dl class="at-bio">${items.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
  }

  /** Attributes section for any player; avgSquad = the club's squad for the radar comparison. */
  function block(p, avgSquad, clubName) {
    if (!p.face && !p.attributes) return '';
    const avg = avgSquad ? squadAverage(avgSquad, isGK(p)) : null;
    return `<section class="panel pp-wide at"><div class="panel-head"><h3>Attributes</h3>${avg ? `<span class="sub">Grey: ${esc(clubName)} ${isGK(p) ? 'goalkeeper' : 'outfield'} average</span>` : ''}</div>
      ${bio(p)}<div class="at-top">${radar(p, avg, `${clubName} average`)}</div>${groups(p)}</section>`;
  }

  /** Full sheet for a player from another club (loaded from data/clubs/<id>.js). */
  function sheet(p, club) {
    const U = FC.u;
    const face = { ...p, short: p.name };
    return `<article class="pp">
      <header class="pp-head club-field" style="--club:${U.clubColor(club.id)}">${U.portrait(face, 200, 'pp-face')}
        <div class="pp-id"><p class="pp-pos"><span class="pos-tag">${esc(p.pos)}</span> ${(p.altPos || []).map((x) => `<span class="pos-tag">${esc(x)}</span>`).join(' ')}</p>
          <h2>${esc(p.name)}</h2>
          <p class="pp-sub"><a class="club-link" href="#team/${club.id}">${U.crest(club.id, 20)}<span>${esc(club.name)}</span></a>${p.nat ? `<span class="pp-nat">${U.flag(p)}${esc(p.nat)}${U.caps(p)}</span>` : ''}${p.shirt ? ` · #${p.shirt}` : ''}</p></div>
        <div class="pp-ovr"><b>${p.ovr}</b><small>Overall</small></div></header>
      <div class="pp-grid">${block(p, club.squad, club.name)}${FC.history ? FC.history.block(p) : ''}</div></article>`;
  }

  FC.attrs = { block, sheet, after(root, p) { if (FC.history) FC.history.bind(root, p); }, band, squadAverage };
})();
