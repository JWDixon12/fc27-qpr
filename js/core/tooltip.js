/* One floating tooltip for the whole app. Any element with data-tip="<html>" gets it on
   hover and on keyboard focus. Content is built by our own render code (escaped there). */
(function () {
  'use strict';
  const FC = (window.FC = window.FC || {});
  let tip = null;
  let current = null;

  function ensure() {
    if (tip) return tip;
    tip = document.createElement('div');
    tip.className = 'tip';
    tip.setAttribute('role', 'tooltip');
    document.body.appendChild(tip);
    return tip;
  }

  function place(x, y) {
    const t = ensure();
    const pad = 14;
    const r = t.getBoundingClientRect();
    let left = x + pad;
    let top = y + pad;
    if (left + r.width > window.innerWidth - 8) left = x - r.width - pad;
    if (top + r.height > window.innerHeight - 8) top = y - r.height - pad;
    t.style.transform = `translate(${Math.max(8, left)}px, ${Math.max(8, top)}px)`;
  }

  function show(el, x, y) {
    const t = ensure();
    current = el;
    t.innerHTML = el.getAttribute('data-tip');
    t.classList.add('on');
    if (x == null) {
      const r = el.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top;
    }
    place(x, y);
  }

  function hide() {
    current = null;
    if (tip) tip.classList.remove('on');
  }

  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el) show(el, e.clientX, e.clientY);
    else if (current) hide();
  });
  document.addEventListener('pointermove', (e) => {
    if (current) place(e.clientX, e.clientY);
  });
  document.addEventListener('focusin', (e) => {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (el) show(el);
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('scroll', hide, { passive: true, capture: true });

  FC.tip = { hide };
})();
