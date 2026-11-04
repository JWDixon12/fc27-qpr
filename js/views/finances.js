/* Financials: balance and budget over time, wage bill, wage structure, contract expiry timeline, ledger. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;

  function expiry() {
    const U = FC.u;
    const now = U.parseDate(D().meta.gameDate);
    const players = D().squad.filter((p) => p.status !== 'loaned_out').sort((a, b) => a.contractEnd - b.contractEnd || b.wage - a.wage);
    const maxY = Math.max(...players.map((p) => p.contractEnd));
    const end = (y) => new Date(y, 5, 30);
    const span = end(maxY) - now;
    const pct = (d) => Math.max(0, Math.min(100, ((d - now) / span) * 100));
    const years = [];
    for (let y = now.getFullYear() + 1; y <= maxY; y++) years.push(y);
    const thisSeason = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
    return `<div class="expiry"><div class="ex-axis" aria-hidden="true"><span></span><span></span><div>${years.map((y) => `<i style="left:${pct(end(y))}%">Jun ${y}</i>`).join('')}</div></div>
      ${players.map((p) => {
        const soon = p.contractEnd <= thisSeason;
        return `<div class="ex-row ${soon ? 'soon' : ''}" data-player="${p.id}" tabindex="0" data-tip="${U.esc(`<strong>${U.esc(p.name)}</strong>Contract thru June ${p.contractEnd} · ${U.wageYrTag(p.wage)} · age ${p.age}`)}">
          <span class="ex-name">${U.esc(p.name)}</span><span class="ex-flag">${soon ? '<span class="status-tag s-at_risk">Final year</span>' : ''}</span>
          <span class="ex-track">${years.map((y) => `<i class="ex-tick" style="left:${pct(end(y))}%"></i>`).join('')}<span class="ex-bar" style="width:${pct(end(p.contractEnd))}%"></span></span></div>`;
      }).join('')}</div>`;
  }

  FC.views.finances = {
    render() {
      const U = FC.u;
      const F = D().finances;
      const last = F.history[F.history.length - 1] || {};
      const bill = D().club.weeklyWageBill, budget = D().club.wageBudget;
      const used = budget ? Math.round((100 * bill) / budget) : null;
      const wages = D().squad.filter((p) => p.status !== 'loaned_out').sort((a, b) => b.wage - a.wage);
      return `<header class="page-head"><div><h1>Financials</h1><p>${F.history.length ? `Week by week, ${U.date(F.history[0].date)} to ${U.date(last.date)}.` : `${U.esc(D().meta.season)} season.`}</p></div>
        <dl class="tiles head-tiles four"><div class="tile"><dt>${last.balance == null && D().club.clubWorth ? 'Club worth' : 'Club balance'}</dt><dd>${last.balance != null ? U.money(last.balance) : (D().club.clubWorth ? U.money(D().club.clubWorth) : '—')}</dd></div><div class="tile"><dt>Transfer budget</dt><dd>${U.money(D().club.transferBudget)}</dd></div>
          <div class="tile"><dt>Wage bill / year</dt><dd>${U.wageYr(bill)}</dd>${budget ? `<small>of ${U.wageYr(budget)} budget</small>` : `<small>${U.money(bill)} a week</small>`}</div>
          ${budget ? `<div class="tile"><dt>Wage budget used</dt><dd>${used}%</dd><div class="meter ${used > 95 ? 'm-crit' : used > 85 ? 'm-warn' : 'm-good'}" role="meter" aria-valuenow="${used}" aria-valuemin="0" aria-valuemax="100" aria-label="Wage budget used"><i style="width:${Math.min(100, used)}%"></i></div></div>` : `<div class="tile"><dt>Squad value</dt><dd>${U.money(U.sum(D().squad, (p) => p.value || 0))}</dd></div>`}</dl></header>
        <div class="g12">
          <section class="panel stretch fi-bal-p" style="--span:7"><div class="panel-head"><h2>Balance and transfer budget</h2><p class="sub">Weekly, ${U.esc(D().meta.currency || '€')}</p></div><div class="chart" id="fi-bal"></div></section>
          <section class="panel stretch fi-wage-p" style="--span:5"><div class="panel-head"><h2>Wage bill (per year)</h2><p class="sub"></p></div><div class="chart" id="fi-wage"></div></section>
          <section class="panel fi-struct" style="--span:5"><div class="panel-head"><h2>Wage structure</h2><p class="sub">Per year, first team</p></div>
            ${FC.chart.barList(wages.map((p) => ({ label: p.short, player: p.id, value: p.wage, display: U.wageYr(p.wage), tip: `<strong>${U.esc(p.name)}</strong>${U.wageYr(p.wage)} per year · ${(100 * p.wage / bill).toFixed(1)}% of the bill` })), { cls: 'tight' })}</section>
          <section class="panel fi-exp" style="--span:7"><div class="panel-head"><h2>Contract expiry</h2><p class="sub">Bar ends on the contract end date</p></div>${expiry()}</section>
          <section class="panel fi-ledger" style="--span:12"><div class="panel-head"><h2>Ledger</h2><p class="sub">Major income and spending</p></div>
            <div class="table-wrap"><table class="data"><thead><tr><th>Date</th><th>Item</th><th class="n">Amount</th></tr></thead><tbody>
            ${F.ledger.length ? '' : '<tr><td colspan="3" class="empty-note">No ledger entries yet.</td></tr>'}${[...F.ledger].sort((a, b) => b.date.localeCompare(a.date)).map((l) => `<tr><td>${U.date(l.date, 'short')}</td><td>${U.esc(l.item)}</td><td class="n amt ${l.amount < 0 ? 'neg' : 'pos'}">${U.money(l.amount, { plus: true })}</td></tr>`).join('')}
            </tbody></table></div></section>
        </div>`;
    },
    after(root) {
      const U = FC.u;
      const H = D().finances.history;
      if (!H.length) { root.querySelectorAll('.chart').forEach((c) => { c.innerHTML = '<p class="empty-note">Charted week by week once the season is under way.</p>'; }); return; }
      const labels = H.map((h) => U.date(h.date, 'short'));
      FC.chart.mount(root.querySelector('#fi-bal'), (w, h) => FC.chart.line({
        labels, height: h || 260, fmt: (v) => U.money(v), label: 'Club balance and transfer budget by week',
        series: [{ name: 'Balance', color: 'var(--home)', values: H.map((h) => h.balance) }, { name: 'Transfer budget', color: 'var(--away)', values: H.map((h) => h.transferBudget) }],
      }, w), { fill: true });
      FC.chart.mount(root.querySelector('#fi-wage'), (w, h) => FC.chart.line({
        labels, height: h || 260, fmt: (v) => U.wageYr(v), step: true, label: 'Wage bill per year',
        yMin: Math.min(...H.map((h) => h.wageBill)) * 0.9,
        series: [{ name: 'Wage bill', color: 'var(--home)', values: H.map((h) => h.wageBill), area: true }],
      }, w), { fill: true });
    },
  };
})();
