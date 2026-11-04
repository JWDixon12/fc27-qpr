/* Pitches drawn to the exact geometry of the game's post-match maps (measured on 2560x1440
   captures), so the keyed map images (marks only, transparent background) sit on clean lines.
   Portrait, attacking up. Full pitch viewBox 608x811; attacking half 607x409. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const esc = (s) => FC.u.esc(s);
  const FULL = { w: 608, h: 811 };
  const HALF = { w: 607, h: 409 };

  function box(w, top, dir, depth, x0, x1) {
    const y = top + dir * depth;
    return `M${x0},${top} V${y} H${x1} V${top}`;
  }

  function fullLines() {
    const { w, h } = FULL;
    const cx = w / 2;
    return [
      `M1,1 H${w - 1} V${h - 1} H1 Z`, `M1,${h / 2} H${w - 1}`,
      `M${cx - 91},${h / 2} A91,83 0 1 0 ${cx + 91},${h / 2} A91,83 0 1 0 ${cx - 91},${h / 2}`,
      box(w, 1, 1, 149, 124, 480), box(w, 1, 1, 79, 208, 396), `M${cx - 62},150 A72,66 0 0 0 ${cx + 62},150`,
      box(w, h - 1, -1, 149, 124, 480), box(w, h - 1, -1, 79, 208, 396), `M${cx - 62},${h - 150} A72,66 0 0 1 ${cx + 62},${h - 150}`,
      `M${cx - 26},0 H${cx + 26}`, `M${cx - 26},${h} H${cx + 26}`,
    ].join(' ');
  }

  function halfLines() {
    const { w, h } = HALF;
    const cx = w / 2;
    return [
      `M1,1 H${w - 1} V${h - 1} H1 Z`, box(w, 1, 1, 150, 123, 479), box(w, 1, 1, 80, 208, 396),
      `M${cx - 62},151 A72,66 0 0 0 ${cx + 62},151`, `M${cx - 86},${h - 1} A86,84 0 0 1 ${cx + 86},${h - 1}`,
      `M${cx - 26},0 H${cx + 26}`,
    ].join(' ');
  }

  /** Data frame (x toward goal 0..100, y from the attacking side's left 0..100) -> viewBox px. */
  function pt(p, half) {
    const g = half ? HALF : FULL;
    const x = (p.y / 100) * g.w;
    const y = half ? ((100 - p.x) / 50) * g.h : ((100 - p.x) / 100) * g.h;
    return [x, y];
  }

  /**
   * A map figure: clean pitch + keyed overlay image (or the raw crop when raw=true).
   * opts: { src (path without extension), half, raw, label, slots:[{x,y,me,label}], color, caption,
   *         blank (note shown when the game drew an empty map, e.g. no offsides) }
   */
  function map(opts) {
    const half = !!opts.half;
    const g = half ? HALF : FULL;
    const src = opts.src ? (opts.raw ? `${opts.src}_raw.jpg` : `${opts.src}.webp`) : null;
    const dots = (opts.slots || []).map((s) => {
      const [x, y] = pt(s, half);
      return `<circle class="gp-slot ${s.me ? 'me' : ''}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.me ? 17 : 13}"${s.label ? ` data-tip="${esc(s.label)}"` : ''}/>`;
    }).join('');
    const img = src ? `<img class="gp-img ${opts.raw ? 'raw' : ''}" src="${esc(src)}" alt="" loading="lazy" onerror="this.closest('.gp').classList.add('gp-missing');this.remove()">` : '';
    return `<figure class="gp ${half ? 'gp-half' : 'gp-full'} ${opts.raw ? 'is-raw' : ''}" style="--c:${opts.color || 'var(--home)'};aspect-ratio:${g.w}/${g.h}" role="img" aria-label="${esc(opts.label || 'Pitch map')}">
      <svg class="gp-lines" viewBox="0 0 ${g.w} ${g.h}" preserveAspectRatio="none" aria-hidden="true"><rect class="gp-turf" width="${g.w}" height="${g.h}"/><path d="${half ? halfLines() : fullLines()}"/></svg>
      ${img}
      ${dots ? `<svg class="gp-dots" viewBox="0 0 ${g.w} ${g.h}" preserveAspectRatio="none">${dots}</svg>` : ''}
      <span class="gp-empty">No map</span>
      ${opts.blank && !opts.raw ? `<span class="gp-none">${esc(opts.blank)}</span>` : ''}
      ${opts.caption ? `<figcaption>${esc(opts.caption)}</figcaption>` : ''}</figure>`;
  }

  /** Ring gauge for a percentage, game style. */
  function ring(value, label, color) {
    const r = 34, c = 2 * Math.PI * r;
    const v = Math.max(0, Math.min(100, value || 0));
    return `<figure class="gring" style="--c:${color}" role="img" aria-label="${esc(label)} ${v}%">
      <svg viewBox="0 0 84 84"><circle class="gr-track" cx="42" cy="42" r="${r}"/><circle class="gr-fill" cx="42" cy="42" r="${r}" stroke-dasharray="${(c * v) / 100} ${c}" transform="rotate(-90 42 42)"/>
      <text x="42" y="47" text-anchor="middle">${v}%</text></svg><figcaption>${esc(label)}</figcaption></figure>`;
  }

  /** Rating ring coloured like the game (red < 5, orange < 6.5, yellow < 7, green >= 7). */
  function ratingRing(rating, size) {
    const s = size || 96;
    const v = rating == null ? 0 : rating;
    const col = v >= 7 ? 'var(--good)' : v >= 6.5 ? 'var(--gold)' : v >= 5 ? 'var(--serious)' : 'var(--crit)';
    const r = 40, c = 2 * Math.PI * r;
    return `<svg class="rring" width="${s}" height="${s}" viewBox="0 0 96 96" role="img" aria-label="Match rating ${rating == null ? 'not rated' : v.toFixed(1)}">
      <circle cx="48" cy="48" r="${r}" class="rr-track"/><circle cx="48" cy="48" r="${r}" class="rr-fill" style="stroke:${col}" stroke-dasharray="${(c * v) / 10} ${c}" transform="rotate(-90 48 48)"/>
      <text x="48" y="57" text-anchor="middle" style="fill:${col}">${rating == null ? 'N/A' : v.toFixed(1)}</text></svg>`;
  }

  FC.gp = { map, ring, ratingRing, pt, FULL, HALF };
})();
