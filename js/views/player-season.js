/* Season extras for the player drawer: per-match heatmap strip with an aggregate view, and
   per-90 rates for the deeper stats captured from the game's Player Performance screens. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const esc = (s) => FC.u.esc(s);

  /** One heatmap source per captured appearance: {f, grid} (sample data) or {f, img} (real capture). */
  function heatSources(p) {
    return FC.stats.linesFor(p.id).map(({ f, m, ln }) => {
      const grid = m.heatmaps && m.heatmaps.players && m.heatmaps.players[String(p.id)];
      if (grid && grid.v) return { f, grid };
      if (ln.maps && ln.maps.heat) return { f, img: ln.maps.heat };
      return null;
    }).filter(Boolean);
  }

  function bigMap(srcs, idx) {
    const pick = idx == null ? srcs : [srcs[idx]];
    const grids = pick.filter((s) => s.grid).map((s) => s.grid);
    if (grids.length === pick.length) {
      return FC.pitch.svg(FC.pitch.heat(FC.pitch.mergeGrids(grids), 'h', 'var(--home)'), { orient: 'h', label: 'Heatmap' });
    }
    // captured images: stack them, each at 1/n strength, screen-blended so overlaps glow brighter
    const imgs = pick.filter((s) => s.img);
    return `<div class="hs-stack">${FC.gp.map({ label: 'Heatmap' })}${imgs.map((s) => `<img src="${esc(s.img)}.webp" alt="" style="opacity:${Math.max(0.25, 1 / imgs.length).toFixed(2)}">`).join('')}</div>`;
  }

  function heatStrip(p) {
    const srcs = heatSources(p);
    if (!srcs.length) return '<p class="empty-note">No heatmap yet.</p>';
    const thumbs = srcs.map((s, i) => {
      const opp = FC.u.team(FC.u.opponent(s.f));
      const mini = s.grid ? FC.pitch.svg(FC.pitch.heat(s.grid, 'h', 'var(--home)'), { orient: 'h', dir: false, label: '' }) : `<img src="${esc(s.img)}.webp" alt="">`;
      return `<button type="button" class="hs-thumb" data-hs="${i}" aria-pressed="false" title="${esc(`${opp.name} · ${FC.u.date(s.f.date)}`)}">${mini}<span>${esc(opp.short)}</span></button>`;
    }).join('');
    return `<div class="hs" data-hs-count="${srcs.length}"><div class="hs-big">${bigMap(srcs, null)}</div>
      <div class="hs-strip"><button type="button" class="hs-all" data-hs="all" aria-pressed="true">All ${srcs.length}</button>${thumbs}</div>
      </div>`;
  }

  function bindStrip(root, p) {
    const box = root.querySelector('.hs');
    if (!box) return;
    const srcs = heatSources(p);
    box.addEventListener('click', (e) => {
      const b = e.target.closest('[data-hs]');
      if (!b) return;
      const idx = b.dataset.hs === 'all' ? null : Number(b.dataset.hs);
      box.querySelector('.hs-big').innerHTML = bigMap(srcs, idx);
      box.querySelectorAll('[data-hs]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
  }

  const DEEP = [
    ['keyPasses', 'Key passes', 2], ['xa', 'Expected assists', 2], ['lineBreaks', 'Line breaks completed', 2],
    ['duelsWon', 'Duels won', 2], ['dribbles', 'Dribbles', 2], ['tackles', 'Tackles', 2], ['interceptions', 'Interceptions', 2],
    ['possWon', 'Possession won', 2], ['possLost', 'Possession lost', 2], ['distanceKm', 'Distance (mi)', 1], ['sprintKm', 'Sprint distance (mi)', 1],
  ];

  function per90(p) {
    const lines = FC.stats.linesFor(p.id).map((x) => x.ln);
    const mins = lines.reduce((s, l) => s + (l.mins || 0), 0);
    if (mins < 45) return '<p class="empty-note">Per-90 rates after 45 minutes.</p>';
    const rows = DEEP.map(([k, label, dp]) => {
      const have = lines.filter((l) => l[k] != null);
      if (!have.length) return '';
      const m = have.reduce((s, l) => s + (l.mins || 0), 0);
      const tot = have.reduce((s, l) => s + l[k], 0);
      return `<tr><td>${label}</td><td class="n">${FC.u.num(tot, dp === 1 ? 1 : k === 'xa' ? 2 : 0)}</td><td class="n"><b>${m ? FC.u.num((tot / m) * 90, dp) : '—'}</b></td><td class="n muted">${m}</td></tr>`;
    }).join('');
    return `<div class="table-wrap"><table class="data"><thead><tr><th>Stat</th><th class="n">Total</th><th class="n">Per 90</th><th class="n">Mins</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  FC.playerSeason = { heatStrip, bindStrip, per90 };
})();
