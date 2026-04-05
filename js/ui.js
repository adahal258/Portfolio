/* ═══════════════════════════════════════════════
   UI — Cursor · Nav · Typewriter · Scroll Reveal
   ═══════════════════════════════════════════════ */

/* ── Custom Cursor ── */
(function initCursor() {
  const cur  = document.getElementById('cursor');
  const ring = document.getElementById('cursorRing');
  let mx = 0, my = 0, rx = 0, ry = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cur.style.left = mx + 'px';
    cur.style.top  = my + 'px';
  });

  (function loop() {
    rx += (mx - rx) * .1;
    ry += (my - ry) * .1;
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';
    requestAnimationFrame(loop);
  })();

  /* Grow ring on interactive elements */
  document.querySelectorAll('a, button, .tag').forEach(el => {
    el.addEventListener('mouseenter', () => {
      ring.style.width  = '46px';
      ring.style.height = '46px';
    });
    el.addEventListener('mouseleave', () => {
      ring.style.width  = '30px';
      ring.style.height = '30px';
    });
  });
})();

/* ── Sticky Nav on Scroll ── */
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', scrollY > 60);
});

/* ── Typewriter ── */
(function initTypewriter() {
  const phrases = [
    'Building scalable financial systems.',
    'Microservices & cloud architecture.',
    'Distributed systems at JPMorgan Chase.',
    'Engineering performance at scale.',
    'DevOps · CI/CD · Kubernetes.'
  ];
  let pi = 0, ci = 0, del = false;
  const tw = document.getElementById('tw');

  function type() {
    const ph = phrases[pi];
    if (!del) {
      ci++;
      tw.innerHTML = ph.slice(0, ci) + '<span class="tw-cursor"></span>';
      if (ci === ph.length) { del = true; setTimeout(type, 2200); return; }
    } else {
      ci--;
      tw.innerHTML = ph.slice(0, ci) + '<span class="tw-cursor"></span>';
      if (ci === 0) { del = false; pi = (pi + 1) % phrases.length; setTimeout(type, 350); return; }
    }
    setTimeout(type, del ? 30 : 65);
  }
  setTimeout(type, 1300);
})();

/* ── Scroll Reveal ── */
(function initReveal() {
  const reveals = document.querySelectorAll('.reveal');
  const ro = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.12 });
  reveals.forEach(el => ro.observe(el));
})();
