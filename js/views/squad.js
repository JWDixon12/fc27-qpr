/* Squad: sortable table, portrait cards, and a 4-2-3-1 depth chart on a pitch. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;
  const state = { q: '', group: 'ALL', view: 'table', sort: 'ovr', dir: -1 };

  const COLS = [
    ['shirt', '#', true], ['name', 'Player', false], ['pos', 'Pos', false], ['age', 'Age', true], ['ovr', 'OVR', true],
    ['value', 'Value', true], ['wage', 'Wage/yr', true], ['contractEnd', 'Contract', true], ['apps', 'Apps', true],
    ['goals', 'G', true], ['assists', 'A', true], ['avgRating', 'Avg', true],
  ];
  const get = (p, k) => (['apps', 'goals', 'assists', 'avgRating'].includes(k) ? (p.season ? p.season[k] : null) : p[k]);

  function filtered() {
    const U = FC.u;
    const q = state.q.trim().toLowerCase();
    return D().squad.filter((p) => {
      if (state.group === 'LOAN') { if (p.status !== 'loaned_out') return false; } else if (p.status === 'loaned_out') return false;
      if (state.group !== 'ALL' && state.group !== 'LOAN' && U.posGroup(p.pos) !== state.group) return false;
      return !q || `${p.name} ${p.short} ${p.nat} ${p.pos} ${p.altPos.join(' ')}`.toLowerCase().includes(q);
    }).sort((a, b) => {
      const va = get(a, state.sort), vb = get(b, state.sort);
      if (va == null) return 1;
      if (vb == null) return -1;
      return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * state.dir;
    });
  }

  function statusBadge(p) {
    if (p.status === 'injured') return `<span class="pl-flag inj" data-tip="${FC.u.esc(`<strong>${p.injury.type}</strong>Back ${FC.u.date(p.injury.returnDate)}`)}">Injured</span>`;
    if (p.status === 'suspended') return '<span class="pl-flag sus">Suspended</span>';
    if (p.status === 'loaned_out' && p.loan) return `<span class="pl-flag loan">On loan · ${FC.u.esc(p.loan.club)}</span>`;
    return '';
  }

  function table(list) {
    const U = FC.u;
    const head = COLS.map(([k, l, n]) => `<th class="${n ? 'n' : ''}" ${state.sort === k ? `aria-sort="${state.dir > 0 ? 'ascending' : 'descending'}"` : ''}><button type="button" data-sort="${k}">${l}</button></th>`).join('');
    const rows = list.map((p) => {
      const s = p.season || {};
      return `<tr data-player="${p.id}" tabindex="0">
        <td class="n shirt">${p.shirt || ''}</td>
        <td><span class="who">${U.portrait(p, 36)}<span class="nm">${U.flag(p)}<b>${U.esc(p.name)}</b>${p.captain ? '<span class="cap" title="Captain">C</span>' : ''}${statusBadge(p)}</span></span></td>
        <td><span class="pos-tag pg-${U.posGroup(p.pos)}">${p.pos}</span> <small class="alt">${p.altPos.join(' ')}</small></td>
        <td class="n">${p.age}</td><td class="n"><b class="ovr">${p.ovr}</b></td><td class="n">${U.money(p.value)}</td>
        <td class="n">${U.wageYr(p.wage)}</td><td class="n">${p.contractEnd}</td><td class="n">${s.apps || 0}</td>
        <td class="n">${s.goals || 0}</td><td class="n">${s.assists || 0}</td>
        <td class="n">${s.avgRating ? `<span class="rating ${U.ratingClass(s.avgRating)}">${s.avgRating.toFixed(2)}</span>` : '—'}</td></tr>`;
    }).join('');
    return `${phoneRows(list)}<div class="table-wrap sq-desk"><table class="data squad-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  /** Phone list: portrait, name, one secondary line, big OVR badge at the right edge. */
  function phoneRows(list) {
    const U = FC.u;
    const tier = (o) => (o >= 85 ? 'ov-elite' : o >= 80 ? 'ov-high' : o >= 75 ? 'ov-mid' : 'ov-low');
    return `<ol class="sq-list">${list.map((p) => `<li><button type="button" class="sq-row" data-player="${p.id}">
      ${U.portrait(p, 48)}<span class="sq-main"><b><span class="sq-pos pg-${U.posGroup(p.pos)}">${U.esc(p.pos)}</span>${U.esc(p.name)}${p.captain ? '<span class="cap" title="Captain">C</span>' : ''}</b>
      <small>${[p.age, p.nat, U.wageYrTag(p.wage), U.contract(p.contractEnd)].filter((x) => x != null).map(U.esc).join(' · ')}</small>${statusBadge(p)}</span>
      <span class="sq-ovr ${tier(p.ovr)}">${p.ovr}</span></button></li>`).join('')}</ol>`;
  }

  function cards(list) {
    const U = FC.u;
    return `<div class="pcards">${list.map((p) => `<button type="button" class="pcard" data-player="${p.id}">
      <span class="pc-num" aria-hidden="true">${p.shirt || ''}</span>
      <span class="pc-ovr"><b>${p.ovr}</b><small class="pg-${U.posGroup(p.pos)}">${p.pos}</small></span>
      ${U.portrait(p, 120, 'pc-face')}
      <span class="pc-name">${U.esc(p.name)}</span>
      <span class="pc-meta">${U.flag(p)}<span>${p.age} yrs · ${U.money(p.value)}</span></span>
      ${p.season && p.season.apps ? `<span class="pc-season">${U.apps(p.season.apps)} · ${p.season.goals} G · ${p.season.assists} A</span>` : '<span class="pc-season">No apps yet</span>'}
      ${statusBadge(p)}</button>`).join('')}</div>`;
  }

  /* 4-2-3-1 depth. Slot coordinates are the team frame (x up the pitch, y across, 0 = left). */
  const SLOTS = [
    ['GK', 'Goalkeeper', ['GK'], 7, 50], ['RB', 'Right back', ['RB', 'RWB'], 30, 86], ['RCB', 'Centre back', ['CB'], 24, 63],
    ['LCB', 'Centre back', ['CB'], 24, 37], ['LB', 'Left back', ['LB', 'LWB'], 30, 14], ['RDM', 'Holding mid', ['CDM', 'CM'], 46, 64],
    ['LDM', 'Holding mid', ['CDM', 'CM'], 46, 36], ['RM', 'Right wide', ['RM', 'RW'], 68, 86], ['CAM', 'Number 10', ['CAM', 'CM'], 66, 50],
    ['LM', 'Left wide', ['LM', 'LW'], 68, 14], ['ST', 'Striker', ['ST', 'CF'], 86, 50],
  ];

  function depth() {
    const U = FC.u;
    const pool = D().squad.filter((p) => p.status !== 'loaned_out');
    const fits = (p, roles) => roles.includes(p.pos) ? 2 : p.altPos.some((r) => roles.includes(r)) ? 1 : 0;
    const score = (p, roles) => p.ovr + (roles.includes(p.pos) ? 4 : 0) - (p.status === 'injured' ? 30 : 0);
    const ranked = {};
    SLOTS.forEach(([id, , roles]) => {
      ranked[id] = pool.filter((p) => fits(p, roles)).sort((a, b) => score(b, roles) - score(a, roles));
    });
    // starters: fill the scarcest slots first, one slot per player
    const starters = {};
    const taken = new Set();
    ['GK', 'ST', 'CAM', 'RM', 'LM', 'RB', 'LB', 'RCB', 'LCB', 'RDM', 'LDM'].forEach((id) => {
      const pick = ranked[id].find((p) => !taken.has(p.id) && p.status !== 'injured') || ranked[id].find((p) => !taken.has(p.id));
      if (pick) { starters[id] = pick; taken.add(pick.id); }
    });
    const lists = {};
    SLOTS.forEach(([id]) => {
      const first = starters[id];
      const backups = ranked[id].filter((p) => !taken.has(p.id)).slice(0, 2);
      lists[id] = first ? [first, ...backups] : backups;
    });
    const slots = SLOTS.map(([id, label, , x, y]) => {
      const L = lists[id] || [];
      return `<div class="dslot" style="--hx:${x}%;--hy:${y}%;--vx:${y}%;--vy:${100 - x}%" aria-label="${label}">
        <span class="ds-label">${label}</span>
        ${L.map((p, i) => `<button type="button" class="ds-p ${i === 0 ? 'first' : ''} ${p.status === 'injured' ? 'inj' : ''}" data-player="${p.id}">
          ${i === 0 ? U.portrait(p, 44) : ''}<span>${U.esc(p.short)}</span><b>${p.ovr}</b></button>`).join('') || '<span class="empty-note">Nobody</span>'}</div>`;
    }).join('');
    // phone: a compact mini-pitch with shirt numbers, then the slots as a list grouped by line
    const LINE = [['Attack', ['LM', 'CAM', 'RM', 'ST']], ['Midfield', ['LDM', 'RDM']], ['Defence', ['LB', 'LCB', 'RCB', 'RB']], ['Goalkeeper', ['GK']]];
    const mini = SLOTS.map(([id, , , x, y]) => {
      const p = (lists[id] || [])[0];
      return p ? `<span class="dm-dot" style="left:${y}%;top:${100 - x}%">${p.shirt || ''}</span>` : '';
    }).join('');
    const list = LINE.map(([name, ids]) => `<h4 class="dl-line">${name}</h4><ol class="dl-list">${ids.map((id) => {
      const slot = SLOTS.find((x) => x[0] === id);
      const [first, ...rest] = lists[id] || [];
      if (!first) return '';
      return `<li><span class="dl-slot">${U.esc(slot[1])}</span>
        <button type="button" class="dl-first ${first.status === 'injured' ? 'inj' : ''}" data-player="${first.id}">${U.portrait(first, 36)}<b>${U.esc(first.short)}</b><span class="sq-ovr">${first.ovr}</span></button>
        ${rest.length ? `<span class="dl-cover">Cover: ${rest.map((p) => `<button type="button" class="link-btn" data-player="${p.id}">${U.esc(p.short)} ${p.ovr}</button>`).join(', ')}</span>` : ''}</li>`;
    }).join('')}</ol>`).join('');
    return `<div class="depth"><div class="depth-pitch">
      ${FC.pitch.svg('', { orient: 'h', cls: 'dp-h', label: 'Depth chart pitch', dir: false })}
      ${slots}</div>
      <div class="depth-phone"><div class="dm-pitch" aria-hidden="true">${FC.pitch.svg('', { orient: 'v', cls: 'dm-svg', label: '', dir: false })}${mini}</div>${list}</div>
      </div>`;
  }

  function body() {
    const list = filtered();
    if (state.view === 'depth') return depth();
    if (!list.length) return '<p class="empty-note">No players match this search.</p>';
    return state.view === 'cards' ? cards(list) : table(list);
  }

  FC.views.squad = {
    render() {
      const U = FC.u;
      const active = D().squad.filter((p) => p.status !== 'loaned_out');
      const avgAge = U.sum(active, (p) => p.age) / active.length;
      const groups = [['ALL', 'All'], ['GK', 'GK'], ['DEF', 'DEF'], ['MID', 'MID'], ['ATT', 'ATT'], ['LOAN', 'Loans']];
      return `<header class="page-head"><div><h1>Squad</h1><p>${active.length} senior players · average age ${avgAge.toFixed(1)} · ${D().squad.length - active.length} out on loan</p></div>
        <dl class="tiles head-tiles"><div class="tile"><dt>Squad value</dt><dd>${U.money(U.sum(active, (p) => p.value))}</dd></div>
          <div class="tile"><dt>Wage bill / yr</dt><dd>${U.wageYr(D().club.weeklyWageBill)}</dd></div>
          <div class="tile"><dt>Average OVR</dt><dd>${(U.sum(active, (p) => p.ovr) / active.length).toFixed(1)}</dd></div></dl></header>
        <section class="panel"><div class="panel-head squad-tools">
          <input class="field" type="search" id="sq-q" placeholder="Search name, nation or position" value="${U.esc(state.q)}" aria-label="Search squad">
          <div class="seg" role="group" aria-label="Position group">${groups.map(([k, l]) => `<button type="button" data-group="${k}" aria-pressed="${state.group === k}">${l}</button>`).join('')}</div>
          <div class="seg" role="group" aria-label="Layout">${[['table', 'Table'], ['cards', 'Cards'], ['depth', 'Depth chart']].map(([k, l]) => `<button type="button" data-view="${k}" aria-pressed="${state.view === k}">${l}</button>`).join('')}</div>
        </div><div id="sq-body">${body()}</div></section>
        <div class="sq-extra">${FC.homePre.contracts()}${FC.homePre.clubRecord()}</div>`;
    },
    after(root) {
      const redraw = () => { root.querySelector('#sq-body').innerHTML = body(); };
      const press = (attr, val) => root.querySelectorAll(`[${attr}]`).forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute(attr) === val)));
      root.querySelector('#sq-q').addEventListener('input', (e) => { state.q = e.target.value; redraw(); });
      root.addEventListener('click', (e) => {
        const g = e.target.closest('[data-group]');
        const v = e.target.closest('[data-view]');
        const s = e.target.closest('[data-sort]');
        if (g) { state.group = g.dataset.group; press('data-group', state.group); redraw(); }
        if (v) { state.view = v.dataset.view; press('data-view', state.view); redraw(); }
        if (s) {
          const k = s.dataset.sort;
          state.dir = state.sort === k ? -state.dir : k === 'name' || k === 'pos' || k === 'shirt' ? 1 : -1;
          state.sort = k;
          redraw();
        }
      });
    },
  };
})();
