// The Version Lens's cost, for every map that has a lens (js/c2-world.js first; later chapters add their own modes).
// Looking costs a look, not seconds: the pool holds L.MAX looks, and each spent look comes back on its own after
// L.COOL seconds, one at a time, like tokens refilling a bucket, so you can never run out with no way forward. A look
// lasts L.LOOK seconds, but that clock only runs while you're free to walk (never in a dialogue, a panel or a
// minigame), flickers for its last L.WARN seconds, and never closes while you stand on ground only the lens holds up.
// Tapping an empty lens is Freya's free tier saying 503 Slow Down: the first time, one question on what an AWS SDK
// does with a throttling error (it retries with exponential backoff and jitter); after that, a countdown to the next
// look on the button. The menu's Version Lens setting makes it unlimited (an accessibility option).
// Saves in S.save.lens: { n: looks left, cd: seconds to the next look back, left: seconds left on this look, taught }.
(function () {
  const S = SD.state, U = SD.ui, AU = SD.audio;
  const L = SD.lens = { MAX: 5, LOOK: 30, COOL: 20, WARN: 5 };
  const st = () => { const s = S.save; return s.lens || (s.lens = { n: L.MAX, cd: 0, left: L.LOOK, taught: false }); };
  L.state = st;
  L.unlimited = () => !!(S.save && S.save.lensFree);

  const css = document.createElement('style');
  css.textContent = `
#w-lens { position: relative; width: 44px; height: 44px; min-width: 44px; padding: 0; border-radius: 50%; font-size: 18px; }
#w-lens::before { content: ''; position: absolute; inset: -4px; border-radius: 50%; pointer-events: none;
  background: conic-gradient(#5fd0ff calc(var(--lp, 0) * 1turn), rgba(43,35,64,.18) 0);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 3px)); }
#w-lens.warn::before { animation: lensWarn .5s steps(2) infinite; }
#w-lens .lens-n { position: absolute; right: -6px; bottom: -6px; min-width: 18px; height: 18px; padding: 0 4px; border-radius: 9px;
  background: #2b2340; color: #fff; font: 700 11px/18px Nunito, sans-serif; font-style: normal; text-align: center; pointer-events: none; }
#w-lens.dry .lens-n { background: #a3242f; }
#w-lens.dry { opacity: .7; }
#w-lens.shake { animation: lensShake .3s; }
.w-lens-mode { background: #d9f2ff; letter-spacing: .06em; }
@keyframes lensWarn { 50% { opacity: .25; } }
@keyframes lensShake { 25% { transform: translateX(-3px); } 75% { transform: translateX(3px); } }
@media (prefers-reduced-motion: reduce) { #w-lens.warn::before, #w-lens.shake { animation: none; } }
`;
  document.head.appendChild(css);

  // One map's lens. o: { mode: label on the chip, on(), set(on), costs(): whether looks are spent yet, idle(): true
  // while the player can't walk, hold(): true while standing somewhere only the lens holds up, changed(): redraw
  // the map and HUD, dry(): the first empty tap (returns a promise) }
  L.make = function (o) {
    const c = {};
    const metered = () => !L.unlimited() && o.costs();
    c.open = function () {
      const s = st();
      if (metered()) {
        if (s.n <= 0) return c.empty();
        s.n--; if (s.cd <= 0) s.cd = L.COOL;
      }
      s.left = L.LOOK; o.set(true); S.persist();
      AU.sfx('sparkle'); o.changed();
      return true;
    };
    c.close = function () { st().left = 0; o.set(false); S.persist(); AU.sfx('blip'); o.changed(); };
    c.toggle = () => (o.on() ? (c.close(), true) : c.open());
    // An empty lens: the first time, Freya's 503 and the question; after that, a shake and the countdown.
    c.empty = function () {
      const s = st(), b = document.getElementById('w-lens');
      if (b) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); }
      AU.sfx('wrong');
      if (!s.taught && o.dry) { s.taught = true; S.persist(); o.dry(); }
      else U.system('503 SLOW DOWN', `No looks left. The next one is back in ${Math.ceil(s.cd)} s.`);
      return false;
    };
    // Every frame: looks come back one at a time, whatever you're doing; the open look's clock runs only while you
    // can walk, and the lens only closes once you're on solid ground.
    c.tick = function (dt) {
      const s = st();
      dt = Math.min(dt || 0, 0.25);
      if (s.n < L.MAX) {
        s.cd -= dt;
        if (s.cd <= 0) { s.n++; s.cd = s.n < L.MAX ? L.COOL : 0; S.persist(); }
      } else s.cd = 0;
      if (o.on() && metered()) {
        if (!o.idle()) s.left = Math.max(0, s.left - dt);
        if (s.left <= 0 && !o.hold()) { c.close(); if (!s.closed) { s.closed = true; S.persist(); U.system('THE LENS CLOSES', 'That look is used up. Tap 👁 again for another, while you have looks left.'); } }
      }
      c.paint();
    };
    const warn = () => o.on() && metered() && st().left < L.WARN && !o.idle();
    // The last few seconds of a look: the lens drops out for a moment, faster as it runs down.
    c.flicker = t => warn() && Math.sin(t * (10 + 4 * (L.WARN - st().left))) > 0.75;
    c.chip = () => (o.on() ? `<span class="hud-chip w-lens-mode">LENS · ${U.esc(o.mode)}</span>` : '');
    c.button = function () {
      const on = o.on();
      return `<button class="${on ? 'primary' : 'ghost'}" id="w-lens" aria-pressed="${on}" aria-label="Version Lens" title="Version Lens (L)">👁<i class="lens-n"></i></button>`;
    };
    let last = '';
    // The ring round 👁 is what's left of this look; the badge is the looks left, or the wait for the next one.
    c.paint = function () {
      const b = document.getElementById('w-lens'); if (!b) return;
      const s = st(), m = metered(), on = o.on();
      const lp = !m ? (on ? 1 : 0) : on ? s.left / L.LOOK : s.n ? 0 : 1 - s.cd / L.COOL;
      const badge = !m ? (on && L.unlimited() ? '∞' : '') : s.n ? String(s.n) : Math.ceil(s.cd) + 's';
      const key = [lp.toFixed(2), badge, warn(), m && !s.n && !on].join();
      if (key === last) return; last = key;
      b.style.setProperty('--lp', lp.toFixed(3));
      const n = b.querySelector('.lens-n'); if (n) { n.textContent = badge; n.hidden = !badge; }
      b.classList.toggle('warn', warn());
      b.classList.toggle('dry', m && !s.n && !on);
      b.title = !m ? 'Version Lens (L)' : on ? `Version Lens (L): ${Math.ceil(s.left)} s left on this look` : `Version Lens (L): ${s.n} of ${L.MAX} looks${s.n < L.MAX ? `, next back in ${Math.ceil(s.cd)} s` : ''}`;
    };
    c.repaint = () => { last = ''; c.paint(); };
    return c;
  };

  // The first empty tap: what an SDK does with a throttling error. Freya's own line is the wrong answer's bait.
  L.teach = function () {
    return new Promise(res => {
      const opts = [
        { t: 'Waits a random, growing time, then retries', ok: true },
        { t: 'Retries straight away, as fast as it can', no: 'Every throttled client retrying at once is what keeps the service throttled: a thundering herd.' },
        { t: 'Waits exactly 1 s, then exactly 2 s, then exactly 4 s', no: 'Close, but with fixed waits, clients that failed together retry together. The random part, jitter, spreads them out.' },
        { t: 'Gives up and hands the 503 back to your code', no: 'A 503 Slow Down is a throttling error, and throttling errors are retryable: the SDK retries a few times before it gives up.' }
      ];
      const order = opts.map((x, i) => i).sort(() => Math.random() - 0.5);
      const b = U.panel(`<div class="g2"><p>Freya, over the speakers: <i>"Whoa there! You've used up your free looking for now. Try again in a second, love. Then two. Then four."</i></p>
        <div class="g2-predict"><b>WHAT WOULD THE SDK DO?</b><p>S3 says the same thing to a client that calls too fast: 503 Slow Down. What does an AWS SDK do with it?</p>
        <div class="opts col">${order.map(i => `<button class="opt" data-p="${i}">${U.esc(opts[i].t)}</button>`).join('')}</div><p class="g2-note"></p></div></div>`,
        { title: '503 SLOW DOWN', noClose: true });
      b.querySelectorAll('[data-p]').forEach(el => el.onclick = () => {
        const x = opts[+el.dataset.p];
        b.querySelectorAll('[data-p]').forEach(y => { y.disabled = true; if (opts[+y.dataset.p].ok) y.classList.add('on'); });
        AU.sfx(x.ok ? 'right' : 'wrong');
        const n = b.querySelector('.g2-note');
        n.textContent = (x.ok ? 'Right. ' : x.no + ' ') + 'AWS SDKs treat 503 Slow Down as a throttling error and retry it a few times, with exponential backoff (each wait longer than the last) and jitter (each wait picked at random), so clients that failed together don\'t all come back together. Your looks work the same way: each one comes back on its own, given time.';
        n.className = 'g2-note ' + (x.ok ? 'ok' : 'bad');
        const go = document.createElement('button'); go.className = 'primary'; go.textContent = 'Continue';
        b.querySelector('.g2').appendChild(go); go.focus();
        go.onclick = () => { U.closePanel(); res(!!x.ok); };
      });
    });
  };
})();
