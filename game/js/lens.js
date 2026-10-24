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

  // ---------- Lens spots ----------
  // Something only the lens shows, in the chapters after the first: each mode has a few. Walk up to one with the
  // lens on and it asks first (predict, then look): you commit an answer, and what the lens shows is the feedback.
  // o: { title, mode, concept, intro: what you see without the lens (text), q, opts: [{ t, ok, no }],
  //      view: { head, rows: [[cells]], note } what the lens shows, why: the explanation, said: [[who, line]] after }
  // Resolves true if the prediction was right.
  const css2 = document.createElement('style');
  css2.textContent = `
.lens-view { margin: 10px 0 6px; padding: 8px 10px; border-radius: 8px; background: #0f2a3a; color: #d9f2ff; box-shadow: inset 0 0 0 2px #5fd0ff; }
.lens-view b.h { display: block; font: 700 11px/1.4 Nunito, sans-serif; letter-spacing: .12em; color: #5fd0ff; margin-bottom: 4px; }
.lens-view table { width: 100%; border-collapse: collapse; font: 12px/1.35 ui-monospace, monospace; }
.lens-view td { padding: 4px 4px; border-top: 1px solid rgba(95,208,255,.25); vertical-align: top; }
.lens-view tr:first-child td { border-top: 0; }
.lens-view .n { margin: 6px 0 0; font-size: 12px; color: #a8dcf2; }
`;
  document.head.appendChild(css2);
  L.spot = function (o) {
    return new Promise(res => {
      const t0 = Date.now(), order = o.opts.map((x, i) => i).sort(() => Math.random() - 0.5);
      const view = o.view ? `<div class="lens-view" hidden><b class="h">THROUGH THE LENS · ${U.esc(o.mode)}${o.view.head ? ' · ' + U.esc(o.view.head) : ''}</b>
        ${o.view.rows ? `<table>${o.view.rows.map(r => `<tr>${r.map(c => `<td>${U.esc(c)}</td>`).join('')}</tr>`).join('')}</table>` : ''}
        ${o.view.note ? `<p class="n">${U.esc(o.view.note)}</p>` : ''}</div>` : '';
      const b = U.panel(`<div class="g2"><p>${U.esc(o.intro)}</p>
        <div class="g2-predict"><b>PREDICT, THEN LOOK</b><p>${U.esc(o.q)}</p>
        <div class="opts col">${order.map(i => `<button class="opt" data-p="${i}">${U.esc(o.opts[i].t)}</button>`).join('')}</div></div>
        ${view}<p class="g2-note"></p></div>`, { title: o.title, noClose: true });
      b.querySelectorAll('[data-p]').forEach(el => el.onclick = () => {
        const x = o.opts[+el.dataset.p];
        b.querySelectorAll('[data-p]').forEach(y => { y.disabled = true; if (o.opts[+y.dataset.p].ok) y.classList.add('on'); });
        if (o.concept && SD.concepts[o.concept]) S.recordAnswer(o.concept, !!x.ok, 1, Date.now() - t0);
        AU.sfx(x.ok ? 'right' : 'wrong');
        const v = b.querySelector('.lens-view'); if (v) v.hidden = false;
        const n = b.querySelector('.g2-note');
        n.textContent = (x.ok ? 'Right. ' : (x.no || 'Not quite.') + ' ') + o.why;
        n.className = 'g2-note ' + (x.ok ? 'ok' : 'bad');
        const go = document.createElement('button'); go.className = 'primary'; go.textContent = 'Continue';
        b.querySelector('.g2').appendChild(go); go.focus();
        go.onclick = () => { U.closePanel(); res(!!x.ok); };
      });
    });
  };
  // A lens spot on the map (feet at fx, fy in world pixels): a slow cyan shimmer with a mark in it.
  L.drawSpot = function (ctx, fx, fy, ts, t, mark) {
    const r = ts * 0.38, y = fy - ts * 0.45, a = 0.55 + 0.25 * Math.sin(t * 2.6 + fx);
    ctx.save();
    const g = ctx.createRadialGradient(fx, y, 1, fx, y, r * 1.8);
    g.addColorStop(0, `rgba(95,208,255,${a})`); g.addColorStop(1, 'rgba(95,208,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx, y, r * 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(217,242,255,${a + 0.2})`; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.lineDashOffset = -t * 8;
    ctx.beginPath(); ctx.arc(fx, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#e8f8ff'; ctx.font = `700 ${Math.round(ts * 0.36)}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(mark || '?', fx, y + 1);
    ctx.restore();
  };
  // A blue wash over the whole view while the lens is on, for maps whose art kit has no lens grade of its own.
  L.wash = function (ctx, vw, vh, t) {
    ctx.save(); ctx.fillStyle = 'rgba(40,120,190,.16)'; ctx.fillRect(0, 0, vw, vh);
    ctx.fillStyle = 'rgba(160,230,255,.05)';
    for (let y = (t * 18) % 6; y < vh; y += 6) ctx.fillRect(0, y, vw, 1);
    ctx.restore();
  };

  // ---------- A chapter's lens ----------
  // Everything a later chapter's map needs, in one place. cfg: { mode, save(): the chapter's save (keeps .lens and
  // .lensDone), busy(), scene(), act(fn): run fn with the controls locked, redraw(): put the map in step, flag(k),
  // spots: { id: { x, y, label, mark, need: [flags it waits for], spot: L.spot's o, after: async () => {} } } }
  // The map calls w.add() once its scene exists, w.apply() whenever it redraws, w.tick(dt) every frame, and hands
  // talk(id) to w.talk(id) first (true when it was a spot). w.seen() is what to draw with (it flickers), w.on() what
  // to walk by; w.hud() is the chip and the button.
  L.world = function (cfg) {
    const sv = () => { const s = cfg.save(); s.lensDone = s.lensDone || {}; return s; };
    const w = {};
    w.on = () => !!sv().lens;
    w.LC = L.make({ mode: cfg.mode, on: w.on, set: v => { sv().lens = v; }, costs: () => true,
      idle: () => cfg.busy() || !document.getElementById('panel').hidden || !document.getElementById('dialog').hidden,
      hold: cfg.hold || (() => false), changed: () => { if (cfg.intro && w.on() && !sv().lensIntro) { sv().lensIntro = true; U.system(cfg.intro[0], cfg.intro[1], 'gold'); } cfg.redraw(); }, dry: () => cfg.act(() => L.teach().then(() => SD.run.gainXp(10))) });
    w.seen = () => w.on() && !w.LC.flicker(performance.now() / 1000);
    w.done = id => !!sv().lensDone[id];
    w.need = id => cfg.spots[id].need || [];
    w.ready = id => w.need(id).every(k => cfg.flag(k));
    w.left = () => Object.keys(cfg.spots).filter(id => !w.done(id)).length;
    w.add = function () {
      const sc = cfg.scene();
      Object.keys(cfg.spots).forEach(id => {
        const o = cfg.spots[id];
        sc.addActor('lens-' + id, { x: o.x, y: o.y, thing: true, label: o.label,
          draw: (ctx, fx, fy, ts, t) => { if (w.seen()) L.drawSpot(ctx, fx, fy, ts, t, o.mark); } });
      });
    };
    w.apply = function () {
      const sc = cfg.scene(); if (!sc) return;
      Object.keys(cfg.spots).forEach(id => {
        const a = sc.actors['lens-' + id]; if (!a) return;
        a.hidden = !w.on() || w.done(id) || !w.ready(id); a.marker = !a.hidden; a.name = a.hidden ? null : cfg.spots[id].label;
      });
    };
    w.tick = dt => w.LC.tick(dt);
    w.toggle = () => { if (!cfg.busy()) w.LC.toggle(); };
    w.hud = () => w.LC.chip() + w.LC.button();
    w.bind = () => { const b = document.getElementById('w-lens'); if (b) { b.onclick = w.toggle; w.LC.repaint(); } };
    w.talk = function (id) {
      if (!/^lens-/.test(id)) return false;
      const k = id.slice(5), o = cfg.spots[k]; if (!o || w.done(k) || !w.ready(k)) return true;
      cfg.act(async () => {
        const ok = await L.spot(Object.assign({ mode: cfg.mode }, o.spot));
        sv().lensDone[k] = true; S.persist();
        SD.run.gainXp(ok ? 15 : 8);
        if (o.after) await o.after(ok);
        if (!w.left()) U.system('LENS · ' + cfg.mode, 'Every spot this lens can show on this floor, found.', 'gold');
      });
      return true;
    };
    window.addEventListener('keydown', e => {
      const sc = cfg.scene();
      if (sc && sc.active && !cfg.busy() && (e.key === 'l' || e.key === 'L') && document.getElementById('panel').hidden && document.getElementById('dialog').hidden) w.toggle();
    });
    return w;
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
