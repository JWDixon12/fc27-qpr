/* The Room: board / fans / media / dressing-room meters, storylines, inbox.
   Hidden player personalities are deliberately never rendered here or anywhere else. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;
  const NOTES = {
    board: 'Confidence of the owners in the project',
    fans: 'Mood in the stands and online',
    media: 'Tone of the press coverage',
    dressingRoom: 'Squad harmony and belief in the manager',
  };
  const LABEL = { board: 'Board', fans: 'Fans', media: 'Media', dressingRoom: 'Dressing room' };

  FC.views.room = {
    render() {
      const U = FC.u;
      const R = D().room;
      const inbox = [...R.inbox].sort((a, b) => b.date.localeCompare(a.date));
      return `<header class="page-head"><div><h1>The Room</h1><p>Board, supporters, media and squad, plus club news and messages.</p></div></header>
        <section class="panel meters2"><div class="panel-head"><h2>Standing</h2><span class="sub">0–100</span></div>${Object.entries(R.meters).map(([k, v]) => FC.chart.meter(v, LABEL[k] || k, NOTES[k])).join('')}</section>
        <div class="g12 room-grid">
          <section class="panel" style="--span:7"><div class="panel-head"><h2>Storylines</h2></div>
            ${R.storylines.length ? '' : '<p class="empty-note">No news.</p>'}<ul class="stories big">${R.storylines.map((s) => `<li><span class="story-status st-${U.esc(s.status)}">${U.esc(s.status)}</span><h3>${U.esc(s.title)}</h3><p>${U.esc(s.body)}</p><small>Updated ${U.date(s.updated)}</small></li>`).join('')}</ul></section>
          <section class="panel" style="--span:5"><div class="panel-head"><h2>Inbox</h2><p class="sub">${inbox.length} messages</p></div>
            ${inbox.length ? '' : '<p class="empty-note">Inbox is empty.</p>'}<ul class="inbox">${inbox.map((m, i) => `<li><details ${i === 0 ? 'open' : ''}><summary><span class="ib-from">${U.esc(m.from)}</span><span class="ib-date">${U.date(m.date, 'short')}</span><b>${U.esc(m.subject)}</b></summary><p>${U.esc(m.body)}</p></details></li>`).join('')}</ul></section>
        </div>`;
    },
  };
})();
