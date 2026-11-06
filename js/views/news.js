/* News: the club's newsroom. #news = front page (lead story + latest), #news/<slug> = one article.
   Articles come from career.news (built from world/news/*.md by build_site.py), newest first. */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  const D = () => window.CAREER;
  const esc = (s) => FC.u.esc(s);
  const list = () => (D().news || []);
  const find = (slug) => list().find((a) => a.slug === slug);

  /** Inline marks: **bold** and *italic*, applied after escaping. */
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');

  function body(blocks) {
    return blocks.map((b) => {
      if (b.startsWith('::')) return FC.newsGfx ? FC.newsGfx.render(b) : '';
      if (b.startsWith('## ')) return `<h2>${inline(b.slice(3))}</h2>`;
      if (b.startsWith('> ')) {
        const [quote, who] = b.slice(2).split(' -- ');
        return `<blockquote><p>${inline(quote)}</p>${who ? `<cite>${inline(who)}</cite>` : ''}</blockquote>`;
      }
      return `<p>${inline(b)}</p>`;
    }).join('');
  }

  /** Visual for a story: a match crest pair, else the first tagged player's portrait, else our crest. */
  function art(a, size) {
    const U = FC.u;
    const hero = a.hero && (D().awards || []).flatMap((x) => [...x.xi, ...(x.winner ? [x.winner] : [])]).find((p) => p.id === a.hero && p.portrait);
    if (hero) return `<span class="nw-art nw-art-player"><img src="${esc(hero.portrait)}" alt="" loading="lazy" onerror="this.remove()"></span>`;
    const f = a.match && D().fixtures.find((x) => x.id === a.match);
    if (f) return `<span class="nw-art nw-art-match">${U.crest(f.home, size)}<i>v</i>${U.crest(f.away, size)}</span>`;
    const p = (a.players || []).map((id) => D().squad.find((s) => s.id === id)).find((s) => s && s.portrait);
    if (p) return `<span class="nw-art nw-art-player"><img src="${esc(p.portrait)}" alt="" loading="lazy" onerror="this.remove()"></span>`;
    return `<span class="nw-art nw-art-club">${U.crest(D().meta.clubId, size)}</span>`;
  }

  const meta = (a) => `<span class="nw-meta"><b>${esc(a.kind)}</b><span>${FC.u.date(a.date)}</span></span>`;

  function card(a) {
    return `<li><a class="nw-card" href="#news/${esc(a.slug)}">${art(a, 44)}<span class="nw-card-txt">${meta(a)}
      <b class="nw-h">${esc(a.headline)}</b><span class="nw-sf">${esc(a.standfirst)}</span></span></a></li>`;
  }

  function front() {
    const L = list();
    if (!L.length) return '<header class="page-head"><div><h1>News</h1></div></header><p class="empty-note">No stories yet.</p>';
    const [lead, ...rest] = L;
    return `<header class="page-head"><div><h1>News</h1></div></header>
      <a class="nw-lead" href="#news/${esc(lead.slug)}">${art(lead, 96)}<span class="nw-lead-txt">${meta(lead)}
        <b class="nw-h">${esc(lead.headline)}</b><span class="nw-sf">${esc(lead.standfirst)}</span>
        ${lead.byline ? `<span class="nw-by">${esc(lead.byline)}</span>` : ''}</span></a>
      ${rest.length ? `<section class="nw-latest"><h2 class="nw-sec">Latest</h2><ol class="nw-grid">${rest.map(card).join('')}</ol></section>` : ''}`;
  }

  function article(a) {
    const U = FC.u;
    const people = (a.players || []).map((id) => D().squad.find((s) => s.id === id)).filter(Boolean);
    const f = a.match && D().fixtures.find((x) => x.id === a.match);
    const more = list().filter((x) => x.slug !== a.slug).slice(0, 4);
    return `<button type="button" class="back-btn" onclick="history.length > 1 ? history.back() : (location.hash = 'news')"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>News</button>
      <div class="nw-page">
        <article class="nw-art-page">
          <header class="nw-head">${meta(a)}<h1>${esc(a.headline)}</h1><p class="nw-sf">${esc(a.standfirst)}</p>
            ${a.byline ? `<p class="nw-by">${esc(a.byline)}</p>` : ''}</header>
          <div class="nw-body">${body(a.body)}</div>
        </article>
        <aside class="nw-side">
          ${f ? `<section class="sec"><div class="sec-head"><h2>The match</h2></div><a class="nw-fx" href="#match/${esc(f.id)}">${U.crest(f.home, 30)}<span>${esc(U.team(f.home).name)} ${f.hg != null ? `${f.hg}–${f.ag}` : 'v'} ${esc(U.team(f.away).name)}</span>${U.crest(f.away, 30)}</a></section>` : ''}
          ${people.length ? `<section class="sec"><div class="sec-head"><h2>In this story</h2></div><ul class="nw-people">${people.map((p) => `<li data-player="${p.id}" tabindex="0" role="button">${U.portrait(p, 40)}<span><b>${esc(p.name)}</b><small>${esc(p.pos)} · ${p.age}</small></span></li>`).join('')}</ul></section>` : ''}
          ${more.length ? `<section class="sec"><div class="sec-head"><h2>More stories</h2></div><ol class="nw-more">${more.map((m) => `<li><a href="#news/${esc(m.slug)}">${meta(m)}<b>${esc(m.headline)}</b></a></li>`).join('')}</ol></section>` : ''}
        </aside>
      </div>`;
  }

  FC.views.news = {
    title: (slug) => (slug && find(slug) ? find(slug).headline : 'News'),
    render(slug) {
      const a = slug && find(slug);
      return `<div class="nw">${a ? article(a) : front()}</div>`;
    },
  };
  FC.news = { list, art };
})();
