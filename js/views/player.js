/* Player profile drawer: bio, contract, OVR history, season stats, ratings, heatmap, per-90 radar.
   Never shows potential (not in the data) or hidden personality traits. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;
  const RADAR = [['goals', 'Goals'], ['assists', 'Assists'], ['shots', 'Shots'], ['keyPasses', 'Key passes'], ['dribbles', 'Dribbles'],
    ['passes', 'Passes'], ['tackles', 'Tackles'], ['interceptions', 'Interceptions'], ['possWon', 'Poss. won']];

  function per90Table() {
    const rows = FC.stats.totals().filter((t) => t.mins >= 90);
    return rows.map((t) => ({ id: t.id, v: RADAR.map(([k]) => (t[k] / t.mins) * 90) }));
  }

  function radar(p) {
    const all = per90Table();
    const me = all.find((r) => r.id === p.id);
    if (!me) return '<p class="empty-note">Available after 90 minutes.</p>';
    const outfield = all.filter((r) => FC.u.player(r.id) && FC.u.player(r.id).pos !== 'GK');
    const max = RADAR.map((_, i) => Math.max(...all.map((r) => r.v[i]), 0.01));
    const avg = RADAR.map((_, i) => outfield.reduce((s, r) => s + r.v[i], 0) / (outfield.length || 1));
    return FC.chart.radar(RADAR.map(([, l]) => ({ label: l })), [
      { name: 'Squad average', color: 'var(--away)', values: avg.map((v, i) => v / max[i]), raw: avg.map((v) => v.toFixed(2)) },
      { name: p.short, color: 'var(--home)', values: me.v.map((v, i) => v / max[i]), raw: me.v.map((v) => v.toFixed(2)) },
    ], 340);
  }

  FC.views._player = {
    render(p) {
      const U = FC.u;
      const s = p.season || {};
      const lines = FC.stats.linesFor(p.id);
      const hist = p.ovrHistory || [];
      const delta = hist.length > 1 ? p.ovr - hist[0].ovr : 0;
      const status = p.status === 'injured' && p.injury ? `<span class="pl-flag inj">${U.esc(p.injury.type)} · back ${U.date(p.injury.returnDate)}</span>`
        : p.status === 'loaned_out' && p.loan ? `<span class="pl-flag loan">On loan at ${U.esc(p.loan.club)} until ${U.date(p.loan.until)}</span>`
          : p.status === 'suspended' ? '<span class="pl-flag sus">Suspended</span>' : '<span class="pl-flag fit">Available</span>';
      const find = ((window.CAREER.youth || {}).finds || {})[String(p.id)];
      const scouted = find ? `<span class="pl-flag scout">Academy · found by ${U.esc(find.scout)}</span>` : '';
      const gd = U.parseDate(D().meta.gameDate);
      const seasonsLeft = p.contractEnd - (gd.getMonth() >= 6 ? gd.getFullYear() + 1 : gd.getFullYear()) + 1;
      return `<article class="pp">
        <header class="pp-head club-field" style="--club:${U.clubColor(D().meta.clubId)}">
          <span class="pp-num" aria-hidden="true">${p.shirt || ''}</span>
          ${U.portrait(p, 200, 'pp-face')}
          <div class="pp-id"><p class="pp-pos"><span class="pos-tag pg-${U.posGroup(p.pos)}">${p.pos}</span> ${p.altPos.map((x) => `<span class="pos-tag">${x}</span>`).join(' ')}</p>
            <h2>${U.esc(p.name)}</h2>
            <p class="pp-sub">${U.flag(p)}<span>${U.esc(p.nat)}${U.caps(p)} · ${p.age} years old${p.shirt ? ` · #${p.shirt}` : ''}${p.captain ? ' · <b class="gold">Captain</b>' : ''}${p.homegrown ? ' · Academy graduate' : ''}</span></p>
            ${status}${scouted}</div>
          <div class="pp-ovr"><b>${p.ovr}</b><small>Overall</small>${delta ? `<span class="${delta > 0 ? 'up' : 'down'}">${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} since ${U.date(hist[0].date, 'short')}</span>` : ''}</div>
        </header>
        <div class="pp-grid">${FC.attrs ? FC.attrs.block(p, D().squad, 'Squad') : ''}${FC.history ? `<div class="hy-slot">${FC.history.block(p)}</div>` : ''}
          <section class="panel"><div class="panel-head"><h3>Contract</h3></div>
            <dl class="tiles"><div class="tile"><dt>Value</dt><dd>${U.money(p.value)}</dd></div>
              <div class="tile"><dt>Wage / year</dt><dd>${U.wageYr(p.wage)}</dd></div>
              <div class="tile"><dt>Contract</dt><dd>${U.contract(p.contractEnd)}</dd><small>${seasonsLeft <= 1 ? 'Final season' : `${seasonsLeft} seasons left`}</small></div>
              <div class="tile"><dt>Release</dt><dd>${p.releaseClause ? U.money(p.releaseClause) : 'No clause'}</dd></div></dl></section>
          ${hist.length > 1 ? `<section class="panel"><div class="panel-head"><h3>Overall history</h3><p class="sub">${hist.map((h) => `${U.date(h.date, 'short')}: ${h.ovr}`).join(' · ')}</p></div>
            <div class="chart" id="pp-ovr"></div></section>` : ''}
          <section class="panel pp-wide"><div class="panel-head"><h3>This season</h3><p class="sub">All competitions</p></div>
            <dl class="tiles">${[['Apps', s.apps], ['Starts', s.starts], ['Minutes', U.num(s.mins)], ['Goals', s.goals], ['Assists', s.assists],
              ['Avg rating', s.avgRating ? s.avgRating.toFixed(2) : '—'], ['POTM', s.motm], ['Clean sheets', s.cleanSheets], ['Cards', `${s.yellows || 0} / ${s.reds || 0}`]]
              .map(([l, v]) => `<div class="tile"><dt>${l}</dt><dd>${v == null ? '—' : v}</dd></div>`).join('')}</dl></section>
          ${lines.length ? `
          <section class="panel pp-wide"><div class="panel-head"><h3>Rating by match</h3><p class="sub">Line shows the season average</p></div>
            ${lines.length ? '<div class="chart" id="pp-rat"></div>' : '<p class="empty-note">No appearances yet.</p>'}</section>
          <section class="panel"><div class="panel-head"><h3>Where he plays</h3><p class="sub">By match or combined</p></div>${FC.playerSeason.heatStrip(p)}</section>
          <section class="panel"><div class="panel-head"><h3>Per 90 vs squad</h3><p class="sub">Scaled to the squad best on each axis</p></div>${radar(p)}</section>
          <section class="panel pp-wide"><div class="panel-head"><h3>Deeper numbers per 90</h3></div>${FC.playerSeason.per90(p)}</section>
          ` : FC.u.ghostCard('No matches yet', 'Ratings, heatmaps and per-90 numbers appear after his first appearance.')}
          ${lines.length ? `<section class="panel pp-wide"><div class="panel-head"><h3>Match log</h3></div><div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Opponent</th><th>Comp</th><th>Pos</th><th class="n">Min</th><th class="n">G</th><th class="n">A</th><th class="n">Shots</th><th class="n">Pass %</th><th class="n">Tackles</th><th class="n">mi</th><th class="n">Rating</th></tr></thead><tbody>
            ${lines.map(({ f, ln }) => `<tr data-href="match/${f.id}" tabindex="0"><td>${U.date(f.date, 'short')}</td><td><span class="who">${U.crest(U.opponent(f), 20)}${U.esc(U.team(U.opponent(f)).short)} <small>${f.venue}</small></span></td>
              <td>${U.compChip(f.comp)}</td><td>${ln.pos}</td><td class="n">${ln.mins}</td><td class="n">${ln.goals}</td><td class="n">${ln.assists}</td><td class="n">${ln.shots}</td><td class="n">${ln.passAcc}</td><td class="n">${ln.tackles}</td><td class="n">${ln.distanceKm}</td>
              <td class="n"><span class="rating ${U.ratingClass(ln.rating)}">${ln.rating.toFixed(1)}</span>${ln.motm ? ' <span class="chip">POTM</span>' : ''}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
        </div></article>`;
    },
    after(root, p) {
      FC.playerSeason.bindStrip(root, p);
      if (FC.history) FC.history.bind(root, p);
      if (FC.history && p.hasHistory) {
        // career history ships with the club file (kept out of career.js to keep the phone payload small)
        FC.u.loadClub(window.CAREER.meta.clubId).then((c) => {
          const full = c && c.squad.find((x) => x.id === p.id);
          const slot = root.querySelector('.hy-slot');
          if (!full || !full.history || !slot || !slot.isConnected) return;
          slot.innerHTML = FC.history.block({ ...p, history: full.history });
          FC.history.bind(slot, { ...p, history: full.history });
        });
      }
      const U = FC.u;
      const hist = p.ovrHistory || [];
      if (hist.length > 1) {
        FC.chart.mount(root.querySelector('#pp-ovr'), (w) => FC.chart.line({
          labels: hist.map((h) => U.date(h.date, 'short')), series: [{ name: 'Overall', color: 'var(--home)', values: hist.map((h) => h.ovr), area: true }],
          yMin: Math.min(...hist.map((h) => h.ovr)) - 2, yMax: Math.max(...hist.map((h) => h.ovr)) + 1, height: 150, label: 'Overall rating history',
        }, w));
      }
      const lines = FC.stats.linesFor(p.id);
      const el = root.querySelector('#pp-rat');
      if (el) {
        const avg = lines.reduce((s, l) => s + l.ln.rating, 0) / lines.length;
        FC.chart.mount(el, (w) => FC.chart.columns({
          items: lines.map(({ f, ln }) => ({ label: U.team(U.opponent(f)).short, value: ln.rating, href: `match/${f.id}`, mark: '',
            color: U.comp(f.comp).color,
            tip: `<strong>${U.esc(U.team(U.opponent(f)).name)} (${f.venue})</strong>${U.esc(U.comp(f.comp).name)} · ${U.date(f.date)}<br>Rating ${ln.rating.toFixed(1)} · ${ln.mins}'${ln.goals ? ` · ${ln.goals} G` : ''}${ln.assists ? ` · ${ln.assists} A` : ''}` })),
          yMin: 5, yMax: 10, yTicks: [5, 6, 7, 8, 9, 10], height: 200, fmt: (v) => String(v), ref: { value: avg, label: `Average ${avg.toFixed(2)}` },
          label: 'Match ratings',
        }, w) + `<div class="legend">${[...new Set(lines.map((l) => l.f.comp))].map((c) => `<span><i class="sw" style="--c:${U.comp(c).color}"></i>${U.esc(U.comp(c).name)}</span>`).join('')}</div>`);
      }
    },
  };
})();
