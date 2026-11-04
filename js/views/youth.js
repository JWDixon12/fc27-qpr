/* Youth Academy: scouts, prospects (age / position / overall / nation only - never potential), graduates. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;

  const GROUPS = [['GK', 'Goalkeepers'], ['DEF', 'Defenders'], ['MID', 'Midfielders'], ['ATT', 'Attackers']];
  const GROUP_OF = { GK: 'GK', CB: 'DEF', LCB: 'DEF', RCB: 'DEF', LB: 'DEF', RB: 'DEF', LWB: 'DEF', RWB: 'DEF', SW: 'DEF',
    CDM: 'MID', LDM: 'MID', RDM: 'MID', CM: 'MID', LCM: 'MID', RCM: 'MID', CAM: 'MID', LAM: 'MID', RAM: 'MID', LM: 'MID', RM: 'MID' };
  const groupOf = (pos) => GROUP_OF[pos] || 'ATT';

  /** Five-pip meter for scout experience / judgement (1-5 stars, as in the game). */
  function pips(n, label) {
    return `<span class="yo-pips" role="img" aria-label="${label} ${n} of 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  }

  function flag(src, alt, cls) {
    return src ? `<img class="${cls || 'yo-flag'}" src="${src}" alt="${FC.u.esc(alt || '')}" width="24" height="16" loading="lazy">` : '';
  }

  /** Everyone this scout brought in, with how far they have got: in academy -> promoted -> senior debut. */
  function scoutRecord(s) {
    const Y = D().youth;
    const finds = Object.entries(Y.finds || {}).filter(([, f]) => f.scout === s.name).map(([id, f]) => {
      const senior = D().squad.find((p) => String(p.id) === id);
      const pros = Y.prospects.find((p) => String(p.id) === id);
      const who = senior || pros;
      const debut = senior && senior.season && senior.season.apps > 0;
      return { id, f, name: who ? who.name : `#${id}`, stage: debut ? 'debut' : senior ? 'promoted' : pros ? 'academy' : 'left' };
    });
    const n = (st) => finds.filter((x) => st.includes(x.stage)).length;
    return { finds, signed: finds.length, promoted: n(['promoted', 'debut']), debuts: n(['debut']) };
  }

  function scoutCard(s, best) {
    const U = FC.u;
    const R = scoutRecord(s);
    const STAGE = { debut: 'Senior debut', promoted: 'Promoted', academy: 'Academy', left: 'Left club' };
    const findsHtml = R.finds.length ? `<ul class="yo-finds">${R.finds.sort((a, b) => ['debut', 'promoted', 'academy', 'left'].indexOf(a.stage) - ['debut', 'promoted', 'academy', 'left'].indexOf(b.stage))
      .map((x) => `<li class="st-${x.stage}"${x.stage !== 'academy' && x.stage !== 'left' ? ` data-player="${x.id}" tabindex="0"` : ''}><span>${U.esc(x.name)}</span><em>${STAGE[x.stage]}</em></li>`).join('')}</ul>` : '<p class="yo-return">No finds yet.</p>';
    return `<article class="yo-scout${best ? ' best' : ''}">
      ${s.flag ? `<img class="yo-scout-bg" src="${s.flag}" alt="" aria-hidden="true">` : ''}
      <p class="yo-kicker">${best ? 'Chief scout · ' : ''}${s.country ? 'Scouting' : 'Awaiting assignment'}</p>
      <h3 class="yo-country">${U.esc(s.country || 'At the training ground')}</h3>
      <p class="yo-scout-name">${flag(s.natFlag, s.nat, 'yo-flag sm')}${U.esc(s.name)}</p>
      <dl class="yo-meters"><div><dt>Experience</dt><dd>${pips(s.experience, 'Experience')}</dd></div><div><dt>Judgement</dt><dd>${pips(s.judgement, 'Judgement')}</dd></div></dl>
      <dl class="yo-record"><div><dt>Found</dt><dd>${R.signed}</dd></div><div><dt>Promoted</dt><dd>${R.promoted}</dd></div><div><dt>Debuts</dt><dd>${R.debuts}</dd></div></dl>
      ${findsHtml}
      ${s.returns ? `<p class="yo-return">Reports back <b>${U.date(s.returns)}</b></p>` : ''}
    </article>`;
  }

  function foundBy(id) {
    const f = (D().youth.finds || {})[String(id)];
    return f ? `<span class="yo-found"> · ${FC.u.esc(f.scout.split(' ').slice(-1)[0])}</span>` : '';
  }

  function prospectRow(p) {
    const U = FC.u;
    return `<li class="yo-row">
      <span class="yo-ovr">${p.ovr}</span>
      <div class="yo-who"><b>${U.esc(p.name)}</b><small>${flag(p.natFlag, p.nat, 'yo-flag sm')}${U.esc(p.nat || '')}${foundBy(p.id)}</small></div>
      <span class="pos-tag pg-${U.posGroup(p.pos)}">${U.esc(p.pos)}</span>
      <span class="yo-age">${p.age}<small>yrs</small></span>
    </li>`;
  }

  FC.views.youth = {
    render() {
      const U = FC.u;
      const Y = D().youth;
      const grads = D().squad.filter((p) => p.homegrown).sort((a, b) => b.ovr - a.ovr);
      const prospects = [...Y.prospects].sort((a, b) => b.ovr - a.ovr || a.age - b.age);
      const bestScout = Y.scouts.reduce((b, s) => (!b || s.judgement + s.experience > b.judgement + b.experience ? s : b), null);
      const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
      const groups = GROUPS.map(([g, label]) => [label, prospects.filter((p) => groupOf(p.pos) === g)]).filter(([, l]) => l.length);
      return `<header class="page-head yo-head"><div><h1>Youth Academy</h1>
          <p class="yo-stats"><span><b>${Y.scouts.length}</b> ${Y.scouts.length === 1 ? 'scout' : 'scouts'}</span><span><b>${prospects.length}</b> ${prospects.length === 1 ? 'prospect' : 'prospects'}</span><span><b>${grads.length}</b> ${grads.length === 1 ? 'graduate' : 'graduates'}</span></p></div></header>
        <section class="yo-sec"><h2 class="yo-h">Scouting network</h2>
          ${Y.scouts.length ? `<div class="yo-scouts">${Y.scouts.map((s) => scoutCard(s, s === bestScout)).join('')}</div>` : '<p class="empty-note">No scouts hired.</p>'}</section>
        <div class="yo-grid">
          <section class="yo-sec panel yo-pros"><div class="panel-head"><h2>Prospects</h2><p class="sub">${prospects.length ? `Youth squad · ages ${Math.min(...prospects.map((p) => p.age))}–${Math.max(...prospects.map((p) => p.age))}` : ''}</p></div>
            ${groups.length ? groups.map(([label, list]) => `<h3 class="yo-group">${label}<span>${list.length}</span></h3><ol class="yo-list">${list.map(prospectRow).join('')}</ol>`).join('') : '<p class="empty-note">No prospects in the youth squad.</p>'}</section>
          <section class="yo-sec panel yo-grads"><div class="panel-head"><h2>Academy graduates</h2><p class="sub">Promoted to the senior squad</p></div>
            ${grads.length ? `<ul class="yo-gradlist">${grads.map((p) => `<li data-player="${p.id}" tabindex="0">${U.portrait(p, 52)}<div class="yo-who"><b>${U.esc(p.name)}</b>
              <small>${p.natFlag ? flag(p.natFlag, p.nat, 'yo-flag sm') : ''}${U.esc(p.pos)} · ${p.age} yrs${foundBy(p.id)}${p.status === 'loaned_out' && p.loan ? ` · on loan at ${U.esc(p.loan.club)}` : p.season && p.season.apps ? ` · ${U.apps(p.season.apps)}` : ' · awaiting debut'}</small></div><span class="yo-ovr">${p.ovr}</span></li>`).join('')}</ul>` : '<p class="empty-note">No academy graduates yet.</p>'}</section>
        </div>`;
    },
  };
})();
