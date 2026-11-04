/* Transfers: our business in and out, net-spend curve, world feed, shortlist (no potential, ever). */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;

  const clubCell = (c) => {
    const U = FC.u;
    const known = typeof c === 'number' || /^\d+$/.test(String(c));
    return `<span class="club"${known && U.hasClub(c) ? ` data-team="${c}"` : ''}>${known ? U.crest(c, 22) : `<span class="crest-fb" style="--s:22px" aria-hidden="true">${U.esc(U.initials(c))}</span>`}${U.esc(U.teamName(c))}</span>`;
  };

  function deal(t) {
    const U = FC.u;
    const p = typeof t.player === 'number' ? U.player(t.player) : null;
    const name = p ? p.name : U.personName(t.player);
    const incoming = U.isUs(t.to);
    return `<li class="deal ${incoming ? 'in' : 'out'}" ${p ? `data-player="${p.id}" tabindex="0"` : ''}>
      ${p ? U.portrait(p, 44) : `<span class="face-fb" style="--s:44px">${U.esc(U.initials(name))}</span>`}
      <div class="deal-main"><b>${U.esc(name)}</b><span class="deal-route">${clubCell(t.from)}<i aria-hidden="true">→</i>${clubCell(t.to)}</span></div>
      <div class="deal-fee"><b>${t.fee ? U.money(t.fee) : t.type === 'loan' ? 'Loan' : 'Free'}</b><small>${U.date(t.date, 'short')} · ${U.esc(t.type)}${t.wage ? ` · ${U.wageYrTag(t.wage)}` : ''}</small></div></li>`;
  }

  FC.views.transfers = {
    render() {
      const U = FC.u;
      const T = D().transfers;
      const ins = T.ours.filter((t) => U.isUs(t.to));
      const outs = T.ours.filter((t) => !U.isUs(t.to));
      const spent = U.sum(ins, (t) => t.fee || 0), got = U.sum(outs, (t) => t.fee || 0);
      return `<header class="page-head"><div><h1>Transfers</h1><p>${T.ours.length} deals this season. Fees in ${U.esc(D().meta.currency || '€')}.</p></div>
        <dl class="tiles head-tiles four"><div class="tile"><dt>Spent</dt><dd>${U.money(spent)}</dd></div><div class="tile"><dt>Received</dt><dd>${U.money(got)}</dd></div>
          <div class="tile"><dt>Net spend</dt><dd>${U.money(spent - got)}</dd></div><div class="tile"><dt>Budget left</dt><dd>${U.money(D().club.transferBudget)}</dd></div></dl></header>
        <div class="g12 tr-grid">
          <section class="panel tr-deals" style="--span:8"><div class="deals-cols">
            <div><div class="panel-head"><h2>Arrivals</h2><p class="sub">${ins.length} in</p></div><ol class="deals">${ins.map(deal).join('') || '<li class="empty-note">No arrivals yet.</li>'}</ol></div>
            <div><div class="panel-head"><h2>Departures</h2><p class="sub">${outs.length} out, loans included</p></div><ol class="deals">${outs.map(deal).join('') || '<li class="empty-note">No departures yet.</li>'}</ol></div></div></section>
          <div class="stack tr-side" style="--span:4;--xl:3">
            <section class="panel tr-net"><div class="panel-head"><h2>Net spend</h2><p class="sub">Cumulative</p></div><div class="chart" id="tr-net"></div></section>
            <section class="panel tr-short"><div class="panel-head"><h2>Shortlist</h2><p class="sub">Scouted targets</p></div>
            ${T.shortlist.length ? `<ul class="shortlist">${T.shortlist.map((s) => `<li><header>${U.crest(s.club, 28)}<div><b>${U.esc(s.name)}</b><small>${U.esc(U.teamName(s.club))}</small></div><span class="sl-ovr">${s.ovr}<small>${U.esc(s.pos)}</small></span></header>
              <p class="sl-meta">${s.age} yrs · ${U.money(s.value)} · contract thru ${s.contractEnd}</p>${s.note ? `<p class="sl-note">${U.esc(s.note)}</p>` : ''}</li>`).join('')}</ul>` : '<p class="empty-note">No targets shortlisted.</p>'}</section></div>
          <section class="panel tr-world" style="--span:12"><div class="panel-head"><h2>Around the world</h2><p class="sub">Newest first</p></div>
            ${T.world.length ? `<div class="table-wrap"><table class="data world-table"><thead><tr><th>Date</th><th>Player</th><th>From</th><th>To</th><th class="n">Fee</th></tr></thead><tbody>
            ${[...T.world].sort((a, b) => b.date.localeCompare(a.date)).map((w) => `<tr><td>${U.date(w.date, 'short')}</td><td><b>${U.esc(w.playerName)}</b></td><td>${clubCell(w.fromTeam)}</td><td>${clubCell(w.toTeam)}</td><td class="n">${w.fee ? U.money(w.fee) : 'Free'}</td></tr>`).join('')}
            </tbody></table></div>` : '<p class="empty-note">No other transfers recorded yet.</p>'}</section>
        </div>`;
    },
    after(root) {
      const U = FC.u;
      const deals = [...D().transfers.ours].filter((t) => t.fee).sort((a, b) => a.date.localeCompare(b.date));
      if (!deals.length) { root.querySelector('#tr-net').innerHTML = '<p class="empty-note">No fees paid or received yet.</p>'; return; }
      let run = 0;
      const vals = deals.map((t) => (run += U.isUs(t.to) ? t.fee : -t.fee));
      FC.chart.mount(root.querySelector('#tr-net'), (w, h) => FC.chart.line({
        labels: deals.map((t) => U.date(t.date, 'short')), height: h || 220, step: true, label: 'Cumulative net transfer spend',
        series: [{ name: 'Net spend', color: 'var(--home)', values: vals, area: true }], fmt: (v) => U.money(v),
        tipTitle: (i) => `${U.esc(U.personName(deals[i].player))}: ${U.isUs(deals[i].to) ? 'bought' : 'sold'} for ${U.money(deals[i].fee)}`,
      }, w), { fill: true });
    },
  };
})();
