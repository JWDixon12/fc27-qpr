/* League: full table with zones and form, bump chart, other competitions (tables and cup paths). */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;

  /** comp.zones: top flight { cl, el, playoff, rel }; second tier { promo, playoff, rel } (play-off places
      sit directly under the automatic promotion places). Counts from the top / bottom of the table. */
  const zonesOf = (comp) => ((comp.zones || {}).promo != null ? { promo: 0, playoff: 0, rel: 3, ...comp.zones }
    : { cl: 4, el: 1, playoff: 0, rel: 3, ...(comp.zones || {}) });
  function zone(i, n, comp) {
    if (comp.type !== 'league') return '';
    const z = zonesOf(comp);
    if (z.promo != null) {
      if (i < z.promo) return 'z-ucl';
      if (i < z.promo + z.playoff) return 'z-po';
      return i >= n - z.rel ? 'z-rel' : '';
    }
    if (i < z.cl) return 'z-ucl';
    if (i < z.cl + z.el) return 'z-uel';
    if (i >= n - z.rel) return 'z-rel';
    if (z.playoff && i >= n - z.rel - z.playoff) return 'z-po';
    return '';
  }


  function table(compId, rows, opts) {
    const U = FC.u;
    const c = U.comp(compId);
    const o = opts || {};
    const body = rows.map((r, i) => {
      const prev = r.posHistory && r.posHistory.length > 1 ? r.posHistory[r.posHistory.length - 2] : null;
      const now = i + 1;
      const mv = prev == null ? '' : prev > now ? `<span class="mv up" title="Up from ${prev}">▲${prev - now}</span>` : prev < now ? `<span class="mv down" title="Down from ${prev}">▼${now - prev}</span>` : '<span class="mv same" title="No change">–</span>';
      const gd = r.gf - r.ga;
      return `<tr class="${U.isUs(r.team) ? 'us' : ''} ${zone(i, rows.length, c)}"${U.hasClub(r.team) ? ` data-href="team/${r.team}" tabindex="0"` : ''}>
        <td class="n pos">${now}</td><td class="mvc">${mv}</td>
        <td class="lt-club"><span class="who">${U.crest(r.team, 26)}<b class="nm-full">${U.esc(U.team(r.team).name)}</b><b class="nm-code">${U.esc(U.team(r.team).short)}</b></span></td>
        <td class="n">${r.p}</td><td class="n">${r.w}</td><td class="n">${r.d}</td><td class="n">${r.l}</td>
        <td class="n">${r.gf}</td><td class="n">${r.ga}</td><td class="n">${gd > 0 ? '+' : ''}${gd}</td><td class="n pts">${r.pts}</td>
        ${o.compact ? '' : `<td><span class="form">${r.form.split('').map((x) => U.resChip({ res: x })).join('')}</span></td>`}</tr>`;
    }).join('');
    return `<div class="table-wrap"><table class="data league-table ${o.compact ? 'compact' : ''}"><thead><tr><th class="n">#</th><th><span class="visually-hidden">Move</span></th><th>Club</th>
      <th class="n">P</th><th class="n">W</th><th class="n">D</th><th class="n">L</th><th class="n">GF</th><th class="n">GA</th><th class="n">GD</th><th class="n">Pts</th>${o.compact ? '' : '<th>Form <small>(oldest → newest)</small></th>'}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function cupPath(compId) {
    const U = FC.u;
    const list = D().fixtures.filter((f) => f.comp === compId);
    if (!list.length) return '';
    return `<section class="panel cup"><div class="panel-head"><h2>${U.esc(U.comp(compId).name)}</h2><p class="sub"></p></div>
      <ol class="cup-path">${list.map((f) => {
        const r = U.result(f);
        const has = !!D().matches[f.id];
        return `<li class="${r ? `cp-${r.res}` : 'cp-next'}" style="--c:${U.comp(compId).color}" ${has ? `data-href="match/${f.id}" tabindex="0" role="link"` : ''}>
          <span class="cp-round">${U.esc(f.round)}</span>${U.crest(U.opponent(f), 30)}
          <span class="cp-opp"><b>${U.esc(U.team(U.opponent(f)).name)}</b><small>${f.venue === 'H' ? 'Home' : 'Away'} · ${U.date(f.date)}</small></span>
          <span class="cp-res">${r ? `${r.gf}–${r.ga}${U.pensR(r)} ${U.resChip(r)}` : 'To play'}</span></li>`;
      }).join('')}</ol></section>`;
  }

  function zoneText(comp) {
    const z = zonesOf(comp || {});
    const word = (n) => ['', 'one', 'two', 'three', 'four', 'five', 'six'][n] || String(n);
    if (z.promo != null) {
      return `The top ${word(z.promo)} go up automatically and the next ${word(z.playoff)} contest the play-offs for the last place. The bottom ${word(z.rel)} are relegated.`;
    }
    return `Top ${word(z.cl)} qualify for the Champions League, ${z.el === 1 ? 'the next' : `the next ${word(z.el)}`} for the Europa League.`
      + `${z.playoff ? ` ${z.playoff === 1 ? 'One club plays' : `${word(z.playoff)} clubs play`} a relegation play-off;` : ''} the bottom ${word(z.rel)} go down.`;
  }

  FC.views.league = {
    render() {
      const U = FC.u;
      const league = D().competitions.find((c) => c.type === 'league');
      const rows = (league && D().table[league.id]) || [];
      const others = D().competitions.filter((c) => c !== league);
      const otherTables = others.filter((c) => D().table[c.id]).map((c) => `<section class="panel"><div class="panel-head"><h2>${U.esc(c.name)}</h2>
        <p class="sub">${c.type === 'europe' ? 'League phase' : ''}</p></div>${table(c.id, D().table[c.id], { compact: true })}</section>`).join('');
      const cups = others.filter((c) => c.type === 'cup' || (c.type === 'europe' && !D().table[c.id])).map((c) => cupPath(c.id)).join('');
      const md = rows.length ? rows[0].posHistory.length : 0;
      const cupsSide = md < 2 && !otherTables;   // no bump chart and no other tables yet: the cup paths fill the side column
      return `<header class="page-head"><div><h1>${U.esc(league ? league.name : 'League')}</h1><p>${md ? `After matchday ${md}.` : 'Season not started.'} ${zoneText(league)}</p></div></header>
        ${md ? '' : `<div class="g12">
          <section class="panel" style="--span:7;--xl:6">${table(league.id, rows)}</section>
          <div class="stack fill lg-pre-side" style="--span:5;--xl:6">${U.ghostCard('Position by matchday', 'Plotted from matchday 1.')}${otherTables}${cups}</div></div>`}
        <div class="g12 lg-grid" ${md ? '' : 'hidden'}>
          <div class="stack lg-main" style="--span:7"><section class="panel lg-table">${table(league.id, rows)}
            <p class="legend zone-key">${zonesOf(league).promo != null ? '<span><i class="sw" style="--c:var(--c-europe)"></i>Promotion</span><span><i class="sw" style="--c:var(--gold)"></i>Play-offs</span>' : `<span><i class="sw" style="--c:var(--c-europe)"></i>Champions League</span><span><i class="sw" style="--c:var(--away)"></i>Europa League</span>${zonesOf(league).playoff ? '<span><i class="sw" style="--c:var(--gold)"></i>Play-off</span>' : ''}`}<span><i class="sw" style="--c:var(--crit)"></i>Relegation</span></p></section>
            ${cupsSide ? '' : `<div class="stack lg-cups">${cups}</div>`}</div>
          <div class="stack ${md ? 'fill' : ''} lg-side" style="--span:5">
            ${md > 1 ? '<section class="panel grow lg-bump-p"><div class="panel-head"><h2>Position by matchday</h2><p class="sub"></p></div><div class="chart" id="lg-bump"></div></section>' : ''}
            <div class="stack lg-other">${otherTables}${cupsSide ? cups : ''}</div></div>
        </div>`;
    },
    after(root) {
      const league = D().competitions.find((c) => c.type === 'league');
      const rows = D().table[league.id] || [];
      if (!root.querySelector('#lg-bump') || rows[0].posHistory.length < 2) return;   // a one-point bump chart says nothing
      const labels = rows[0].posHistory.map((_, i) => `MD${i + 1}`);
      FC.chart.mount(root.querySelector('#lg-bump'), (w, h) => FC.chart.bump(rows, labels, w, D().meta.clubId, h), { fill: true });
    },
  };
})();
