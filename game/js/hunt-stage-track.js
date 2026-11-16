// Monster Hunt's Track step as a chase (Ladi, Nov 16: the questions as a scene, not a text box). The monster has
// fled: it is gone from the street, and the street forks into trails, one per answer, each with a signpost carrying
// the answer's letter and fresh claw marks on it. The answers themselves are still js/quiz.js's own buttons (same
// text, same handlers), restyled as wooden trail signs with claw marks; picking one lights its trail in the street.
// On the verdict Bru (side-on) runs down the trail she picked: right, the monster is there and a net drops on it;
// wrong, she hits a dead end (a barricade, a puff of dust) and the monster is spotted somewhere else, peeking out.
// Nothing here knows which answer is right before the quiz shows its verdict.
//
// A staging for js/hunt-debrief.js (SD.huntDebrief.stages.track); all of its CSS is scoped under .hd-st-track.
(function () {
  const D = SD.huntDebrief;
  if (!D || !D.stages) return;
  const still = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const NS = 'http://www.w3.org/2000/svg';
  const L = i => String.fromCharCode(65 + i);
  const LINES = { ok: 'There it is. Good eye.', guess: 'It landed, but that was a guess. It\'ll come back to you.', bad: 'Dead end. It went the other way. Read why.' };

  // The trail layer: an SVG of the fork (drawn in fit, from the window's layout) and the signposts at its ends.
  function open({ scene, st }) {
    const map = document.createElement('div');
    map.className = 'ht-art';
    map.setAttribute('aria-hidden', 'true');
    map.innerHTML = `<svg class="ht-map" preserveAspectRatio="none"></svg><div class="ht-posts"></div>`;
    const wash = scene.querySelector('.hd-wash');
    (wash || scene.firstChild).after(map);
    // A label for screen readers: it's a chase now, not a monster across the street.
    const foe = scene.querySelector('.hd-foe');
    if (foe) { foe.classList.add('ht-gone'); foe.setAttribute('aria-label', (foe.getAttribute('aria-label') || '').replace(/, squaring up.*$/, ', fled: its tracks fork ahead')); }
    st.ht = { n: 0, pick: -1, geo: null, done: false, res: null, raf: 0 };
  }

  // Each redraw: count the trails, decorate the option buttons in place, and light the trail of the picked one.
  function render({ scene, st, win, sat, mode }) {
    const h = st.ht; if (!h) return;
    win.classList.add('ht-win');
    const opts = [...sat.querySelectorAll('.opts .opt')];
    if (mode === 'q') {
      const n = opts.length || h.n || 4;
      if (n !== h.n) { h.n = n; h.geo = null; }
      const on = opts.findIndex(o => o.classList.contains('on'));
      h.pick = on;
      opts.forEach((o, i) => { o.classList.add('ht-sign'); o.dataset.trail = L(i); });
      const lab = sat.querySelector('.act-l'); if (lab) lab.classList.add('ht-lab');
      scene.classList.toggle('ht-picked', on >= 0);
    }
    draw(scene, st);
  }

  // Where the trails run: from Bru's feet up into the street, fanning out to the right, the signposts at their far
  // ends. On the question: in the gap between the card and the satchel (on a phone, a cluster of posts right of her
  // speech bubble, where the monster stood). On the verdict the card is gone and the scene re-lays itself, so the
  // trails are laid again, after that layout, in the open street under Bru's line (see verdictFit).
  function fit({ scene, st, win, wide, W, H, bw, bl, satTop, cardBottom }) {
    const h = st.ht; if (!h) return;
    const jars = scene.querySelector('.hd-jars');
    // A wide window measures the jar from the left (hunt-debrief's fit); the fight wants it across the street.
    if (wide && jars) jars.style.removeProperty('right');
    if (win.classList.contains('hd-f')) { cancelAnimationFrame(h.raf); h.raf = requestAnimationFrame(() => verdictFit(scene, st, wide)); return; }
    if (h.geo && h.geo.W === W && h.geo.H === H && h.geo.cb === cardBottom && h.geo.st === satTop) return draw(scene, st);
    const gap = Math.max(40, satTop - cardBottom), n = h.n || 4;
    let post, x0, x1, ox, yE;
    if (wide) {
      post = 46; yE = cardBottom + Math.max(post * 1.3, gap * .4);
      x0 = Math.max(bl + bw + 30, W * .34); x1 = W - W * .07; ox = bl + bw * .7;
    } else {
      // The free strip right of the bubble (it ends where the jar would start).
      const js = parseFloat(scene.style.getPropertyValue('--hd-js')) || 66;
      post = Math.max(24, Math.min(30, gap * .32));
      x0 = W - js - 30 + post * .5; x1 = W - post * .5 - 6; ox = W * .32;
      yE = Math.min(satTop - 4, cardBottom + gap * .5 + post * .9);
    }
    h.geo = { W, H, cb: cardBottom, st: satTop, wide, post, ends: [], ox, oy: H + 20 };
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1);
      // Stagger the ends, like alleys at different depths (down, so the planks stay clear of the card).
      h.geo.ends.push([x, yE + (i % 2 ? post * (wide ? .35 : -.45) : 0)]);
    }
    draw(scene, st);
  }

  // The verdict's layout: Bru's line sits clear of the stamp and the notes button, and the trails run under it.
  function verdictFit(scene, st, wide) {
    const h = st.ht; if (!h || !scene.isConnected) return;
    const sr = scene.getBoundingClientRect(), W = scene.offsetWidth, H = scene.offsetHeight;
    const say = scene.querySelector('.hd-say'), ver = scene.querySelector('.hd-verdict'), bru = scene.querySelector('.hs-bru'), foe = scene.querySelector('.hd-foe');
    const rel = el => { const r = el.getBoundingClientRect(); return { l: r.left - sr.left, t: r.top - sr.top, r: r.right - sr.left, b: r.bottom - sr.top, w: r.width, h: r.height }; };
    if (!say || !ver) return;
    if (wide) {
      // The stamp column (stamp, badges, notes) stands top right; the line ends left of it.
      const wh = scene.parentElement && scene.parentElement.querySelector(':scope > .win-h');
      ver.style.setProperty('--hd-ty', Math.round(Math.max(6, wh ? wh.getBoundingClientRect().bottom - sr.top + 10 : 6)) + 'px');
      const v = rel(ver), s = rel(say);
      const sw = Math.round(Math.max(260, v.l - s.l - 20));
      if (Math.abs(sw - s.w) > 2) say.style.setProperty('--hd-sw', sw + 'px');
    } else {
      // Under the stamp column (its notes button shows after the first layout), not under the button.
      const v = rel(ver), top = Math.round(v.b + 10), cur = parseFloat(say.style.top) || 0;
      if (top > cur + 1) {
        const shh = parseFloat(say.style.getPropertyValue('--hd-sh')) || 200;
        say.style.top = top + 'px'; say.style.setProperty('--hd-sh', Math.max(60, Math.round(shh - (top - cur))) + 'px');
      }
    }
    const s = rel(say), b = bru ? rel(bru) : { l: 0, r: W * .4, w: W * .4 }, jars = scene.querySelector('.hd-jars');
    // The monster's spot, from its (unanimated) column: it may still be popping in.
    const jr = jars ? rel(jars) : null, fs = jars ? parseFloat(jars.style.getPropertyValue('--hd-fs')) || 120 : 0;
    const f = jr ? { l: jr.r - fs, t: jr.b - fs, w: fs, h: fs } : { l: W * .8, t: H * .6, w: 0, h: 0 };
    const n = h.n || 4, post = wide ? 46 : 28;
    const x0 = wide ? Math.max(b.r + 60, s.l + 120) : Math.max(b.l + b.w * .78, W * .42), x1 = Math.min(W - post, (wide ? f.l - 10 : W - post * .7));
    const yE = Math.min(H - 60, s.b + post * 1.15 + 6);
    const ox = b.l + b.w * (wide ? .6 : .55);
    const key = [W, H, Math.round(s.b), Math.round(x0), Math.round(x1), h.res].join(',');
    if (h.geo && h.geo.vk === key) return;
    h.geo = { W, H, wide, post, ends: [], ox, oy: H + 20, vk: key };
    for (let i = 0; i < n; i++) h.geo.ends.push([n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (n - 1), yE + (i % 2 ? post * .3 : 0)]);
    // Right: the picked trail runs all the way to where the monster was found.
    if (h.res === true && foe && h.pick >= 0 && h.pick < n) h.geo.ends[h.pick] = [Math.max(x0, f.l + f.w * .12), Math.min(H - 30, f.t + f.h * .8)];
    draw(scene, st);
  }

  function draw(scene, st) {
    const h = st.ht, g = h && h.geo; if (!g) return;
    const svg = scene.querySelector('.ht-map'), posts = scene.querySelector('.ht-posts');
    if (!svg || !posts) return;
    svg.setAttribute('viewBox', `0 0 ${g.W} ${g.H}`);
    const key = `${g.W}x${g.H}:${g.ends.map(e => e.map(Math.round).join(',')).join(';')}`;
    if (svg.dataset.k !== key) {
      svg.dataset.k = key;
      const sw = g.wide ? 34 : 20;
      let out = '';
      g.ends.forEach(([x, y], i) => {
        const cx = g.ox + (x - g.ox) * .15, cy = y + (g.oy - y) * .6;
        const d = `M ${g.ox} ${g.oy} Q ${cx} ${cy} ${x} ${y}`;
        // A point and angle along the curve, for the claw marks.
        const at = t => { const u = 1 - t; return [u * u * g.ox + 2 * u * t * cx + t * t * x, u * u * g.oy + 2 * u * t * cy + t * t * y]; };
        const [mx, my] = at(.72), [nx, ny] = at(.76), ang = Math.atan2(ny - my, nx - mx) * 180 / Math.PI;
        const s = g.wide ? 1.15 : .8;
        out += `<g class="ht-t" data-i="${i}">
          <path class="ht-bed" d="${d}" stroke-width="${sw}"/>
          <path class="ht-glow" d="${d}" stroke-width="${sw * .5}"/>
          <path class="ht-prints" d="${d}" stroke-width="${g.wide ? 5 : 3.5}"/>
          <g class="ht-claw" transform="translate(${mx.toFixed(1)} ${my.toFixed(1)}) rotate(${(ang + 90).toFixed(1)}) scale(${s})">
            <path d="M -9 -10 L -5 10 M -1 -12 L 2 10 M 7 -10 L 9 9"/></g></g>`;
      });
      svg.innerHTML = out;
      posts.innerHTML = g.ends.map(([x, y], i) => `<div class="ht-post" data-i="${i}" style="left:${Math.round(x)}px;top:${Math.round(y)}px;--ps:${g.post}px">
        <span class="ht-plank">${L(i)}</span><span class="ht-pole"></span></div>`).join('');
    }
    const pick = h.pick;
    svg.querySelectorAll('.ht-t').forEach(t => { const i = +t.dataset.i; t.classList.toggle('on', i === pick); t.classList.toggle('dim', pick >= 0 && i !== pick); });
    posts.querySelectorAll('.ht-post').forEach(p => {
      const i = +p.dataset.i; p.classList.toggle('on', i === pick);
      if (h.res != null && i === pick) p.classList.add(h.res ? 'win' : 'lost');
    });
    if (h.res != null) svg.querySelectorAll(`.ht-t[data-i="${pick}"]`).forEach(t => t.classList.add(h.res ? 'win' : 'lost'));
    // The dead end stands at the end of the picked trail, wherever the trails are laid now.
    const dead = scene.querySelector('.ht-dead'), end = g.ends[pick];
    if (dead && end) { dead.style.left = Math.round(end[0]) + 'px'; dead.style.top = Math.round(end[1] - g.post * .2) + 'px'; }
  }

  // The verdict: Bru runs down the picked trail. Right, the monster's at the end of it and a net drops on it.
  // Wrong, a dead end (a barricade and a puff of dust) and it's spotted somewhere else, peeking out.
  function strike(ok, guess, { scene, st, bru }) {
    const h = st.ht; if (!h) return false;
    if (h.done) return true;
    h.done = true;
    const pick = h.pick >= 0 ? h.pick : 0, g = h.geo, end = g && g.ends[pick];
    const foe = scene.querySelector('.hd-foe'), slow = !still();
    scene.classList.add('ht-chase', ok ? 'ht-ok' : 'ht-bad');
    const t = scene.querySelector(`.ht-t[data-i="${pick}"]`), p = scene.querySelector(`.ht-post[data-i="${pick}"]`);
    if (t) t.classList.add(ok ? 'win' : 'lost');
    if (p) p.classList.add(ok ? 'win' : 'lost');
    h.res = ok; h.pick = pick;
    // Bru, side-on, runs off down the trail and comes back.
    bru.turn('side');
    const b = scene.querySelector('.hs-bru');
    if (b && slow) {
      const dx = g ? Math.max(30, Math.min(g.wide ? 280 : 70, (end ? end[0] : g.W * .6) - g.ox)) : 60;
      b.style.setProperty('--ht-dx', Math.round(dx) + 'px');
      b.classList.remove('ht-run'); void b.offsetWidth; b.classList.add('ht-run');
      setTimeout(() => b.classList.remove('ht-run'), 1500);
      // Dust kicked up at her heels.
      for (let k = 0; k < 3; k++) {
        const d = document.createElement('i'); d.className = 'ht-kick';
        d.style.left = Math.round((g ? g.ox : 80) - 30 + k * 18) + 'px'; d.style.animationDelay = (k * 120) + 'ms';
        scene.appendChild(d); setTimeout(() => d.remove(), 1400);
      }
    }
    if (ok) {
      // It was there: it pops out of the trail and a net drops on it.
      if (foe) {
        foe.classList.remove('ht-gone');
        foe.setAttribute('aria-label', (foe.getAttribute('aria-label') || '').replace(/, fled.*$/, ', caught in Bru\'s net'));
        const jar = foe.querySelector('.hd-jar');
        if (jar && !jar.querySelector('.ht-net')) jar.insertAdjacentHTML('beforeend', `<svg class="ht-net" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none">
          <path d="M8 96 Q4 40 20 14 Q50 -4 80 14 Q96 40 92 96"/><path d="M8 30 L92 30 M5 52 L95 52 M6 74 L94 74 M30 6 Q22 50 26 98 M50 2 L50 98 M70 6 Q78 50 74 98"/></svg>`);
        foe.classList.add('ht-found');
      }
      bru.react(guess ? 'smile' : 'grin', 1e9);
      bru.say(`<b>Bru:</b> ${guess ? LINES.guess : LINES.ok}`);
    } else {
      // A dead end: a barricade where the trail stops, and dust.
      {
        const dead = document.createElement('div');
        dead.className = 'ht-dead'; dead.setAttribute('aria-hidden', 'true');
        dead.innerHTML = '<span class="ht-bar">DEAD END</span><i class="ht-puff"></i><i class="ht-puff"></i><i class="ht-puff"></i>';
        scene.querySelector('.ht-art').appendChild(dead);
        draw(scene, st);
      }
      // It's spotted somewhere else: peeking out across the street.
      if (foe) {
        foe.classList.remove('ht-gone');
        foe.setAttribute('aria-label', (foe.getAttribute('aria-label') || '').replace(/, fled.*$/, ', spotted down another trail'));
        const jar = foe.querySelector('.hd-jar');
        if (jar && !jar.querySelector('.ht-bang')) jar.insertAdjacentHTML('beforeend', '<b class="ht-bang" aria-hidden="true">!</b>');
        foe.classList.add('ht-spot');
      }
      if (slow) { bru.react('wince', 800); setTimeout(() => { if (b && b.isConnected) bru.react('frown', 1e9); }, 820); }
      else bru.react('frown', 1e9);
      bru.say(`<b>Bru:</b> ${LINES.bad}`);
    }
    return true;
  }

  D.stages.track = { open, render, strike, fit };

  const css = document.createElement('style');
  css.textContent = `
    /* The fork: trails of packed dirt with paw prints, a claw-mark scratch on each */
    .hd-st-track .ht-art { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
    .hd-st-track .ht-map { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
    .hd-st-track .ht-t path { fill: none; stroke-linecap: round; }
    .hd-st-track .ht-bed { stroke: rgba(70, 50, 28, .62); }
    .hd-st-track .ht-glow { stroke: rgba(255, 190, 110, .1); }
    .hd-st-track .ht-prints { stroke: rgba(255, 228, 180, .55); stroke-dasharray: 2 13; }
    .hd-st-track .ht-claw path { stroke: #ff6a4a; stroke-width: 3.2; filter: drop-shadow(0 0 4px rgba(255, 70, 40, .9)); }
    .hd-st-track .ht-t { transition: opacity .3s; }
    .hd-st-track .ht-t.dim { opacity: .45; }
    .hd-st-track .ht-t.on .ht-glow { stroke: rgba(255, 210, 122, .55); filter: drop-shadow(0 0 8px rgba(255, 190, 90, .8)); }
    .hd-st-track .ht-t.on .ht-prints { stroke: #fff2cf; animation: htPrints 1s linear infinite; }
    @keyframes htPrints { to { stroke-dashoffset: -15; } }
    .hd-st-track .ht-t.win .ht-glow { stroke: rgba(127, 224, 160, .7); filter: drop-shadow(0 0 10px rgba(110, 230, 150, .9)); }
    .hd-st-track .ht-t.lost .ht-glow { stroke: rgba(255, 110, 90, .55); filter: none; }
    .hd-st-track .ht-t.lost .ht-prints { stroke: rgba(255, 150, 130, .7); animation: none; }
    /* A signpost at the end of each trail: a wooden plank with the answer's letter */
    .hd-st-track .ht-posts { position: absolute; inset: 0; }
    .hd-st-track .ht-post { position: absolute; width: 0; height: 0; --ps: 40px; }
    .hd-st-track .ht-pole { position: absolute; left: calc(var(--ps) * -.06); bottom: 0; width: calc(var(--ps) * .12); height: var(--ps); border-radius: 2px; background: linear-gradient(90deg, #4a3218, #7a5630, #3a2410); box-shadow: 0 2px 3px rgba(0, 0, 0, .6); }
    .hd-st-track .ht-plank { position: absolute; z-index: 1; left: calc(var(--ps) * -.42); bottom: calc(var(--ps) * .5); display: grid; place-items: center; width: calc(var(--ps) * .95); height: calc(var(--ps) * .52);
      clip-path: polygon(0 0, 78% 0, 100% 50%, 78% 100%, 0 100%); background: linear-gradient(#a57a42, #7a5226); color: #fff6dc;
      font: 800 calc(var(--ps) * .34)/1 var(--f-head, serif); text-shadow: 0 1px 0 #2a1808; transform: rotate(-4deg); }
    .hd-st-track .ht-post:nth-child(even) .ht-plank { transform: rotate(5deg); }
    .hd-st-track .ht-post.on .ht-plank { background: linear-gradient(#ffd27a, #c9902e); color: #2a1808; text-shadow: none; filter: drop-shadow(0 0 8px rgba(255, 200, 90, .9)); }
    .hd-st-track .ht-post.win .ht-plank { background: linear-gradient(#a8f0bc, #4fae6e); color: #0c2a14; text-shadow: none; filter: drop-shadow(0 0 8px rgba(110, 230, 150, .9)); }
    .hd-st-track .ht-post.lost .ht-plank { opacity: .5; }
    /* It has fled: gone from the street until the verdict */
    .hd-st-track .hd-foe.ht-gone { opacity: 0; visibility: hidden; }
    .hd-st-track .hd-foe { transition: opacity .3s; }
    /* Bru runs down the trail and back */
    .hd-st-track .hs-bru.ht-run { animation: htRun 1.4s cubic-bezier(.45, 0, .3, 1); }
    @keyframes htRun { 0% { translate: 0 0; } 10%, 30% { translate: calc(var(--ht-dx) * .3) -6px; } 20% { translate: calc(var(--ht-dx) * .2) 0; } 45%, 60% { translate: var(--ht-dx) 0; opacity: .85; } 100% { translate: 0 0; } }
    .hd-st-track .ht-kick { position: absolute; z-index: 2; bottom: 12%; width: 26px; height: 18px; border-radius: 50%; background: radial-gradient(rgba(220, 200, 170, .7), transparent 70%); opacity: 0; animation: htKick .9s ease-out forwards; pointer-events: none; }
    @keyframes htKick { 0% { opacity: .9; transform: scale(.4); } 100% { opacity: 0; transform: translate(-24px, -16px) scale(2.2); } }
    /* Right: it pops out of the trail and a net drops on it */
    .hd-st-track .hd-foe.ht-found { animation: htPop .5s cubic-bezier(.3, 1.6, .5, 1) .45s both; }
    @keyframes htPop { from { opacity: 0; transform: translateY(-30px) scale(.4); } to { opacity: 1; transform: none; } }
    .hd-st-track .ht-net { position: absolute; inset: -6% -4% -2%; width: 108%; height: 108%; z-index: 2; overflow: visible; fill: none; stroke: #f0d68a; stroke-width: 2.4; vector-effect: non-scaling-stroke;
      filter: drop-shadow(0 0 3px rgba(0, 0, 0, .9)) drop-shadow(0 0 6px rgba(255, 210, 120, .6)); animation: htNet .45s cubic-bezier(.3, 1.4, .5, 1) 1s both; }
    @keyframes htNet { from { opacity: 0; transform: translateY(-120%) scale(1.3); } to { opacity: 1; transform: none; } }
    .hd-st-track .hd-foe.ht-found .hd-spr { filter: grayscale(.5) brightness(.85) drop-shadow(0 0 10px rgba(110, 230, 150, .6)) !important; animation: htStruggle .3s ease-in-out 1.5s 4 !important; }
    @keyframes htStruggle { 50% { transform: rotate(-4deg) scale(.97); } }
    /* Wrong: a dead end, dust; it's spotted elsewhere, peeking in */
    .hd-st-track .ht-dead { position: absolute; z-index: 2; width: 0; height: 0; }
    .hd-st-track .ht-bar { position: absolute; left: 0; bottom: 4px; transform: translateX(-50%) rotate(-6deg); padding: 3px 7px; white-space: nowrap; border: 2px solid #2a1808; border-radius: 3px;
      background: repeating-linear-gradient(-45deg, #ffcf4a 0 8px, #2a1808 8px 14px); color: #fff; font: 800 11px/1 var(--f-body, sans-serif); letter-spacing: .08em;
      text-shadow: 0 0 3px #000, 0 0 3px #000, 0 1px 0 #000; box-shadow: 0 4px 8px rgba(0, 0, 0, .6); animation: htSlam .4s cubic-bezier(.3, 1.6, .5, 1) .55s both; }
    @keyframes htSlam { from { opacity: 0; transform: translateX(-50%) rotate(-6deg) translateY(-26px) scale(1.6); } to { opacity: 1; transform: translateX(-50%) rotate(-6deg); } }
    .hd-st-track .ht-puff { position: absolute; left: -16px; bottom: -6px; width: 32px; height: 22px; border-radius: 50%; background: radial-gradient(rgba(230, 210, 180, .8), transparent 70%); opacity: 0; animation: htPuff 1s ease-out .6s forwards; }
    .hd-st-track .ht-puff:nth-child(3) { --px: -26px; animation-delay: .65s; } .hd-st-track .ht-puff:nth-child(4) { --px: 26px; animation-delay: .7s; }
    @keyframes htPuff { 0% { opacity: .9; transform: scale(.3); } 100% { opacity: 0; transform: translate(var(--px, 0), -22px) scale(2.4); } }
    .hd-st-track .hd-foe.ht-spot { animation: htPeek .7s cubic-bezier(.3, 1.3, .5, 1) 1s both; }
    @keyframes htPeek { from { opacity: 0; transform: translateX(60%); } to { opacity: 1; transform: none; } }
    .hd-st-track .ht-bang { position: absolute; z-index: 2; top: -8%; left: 6%; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #ffcf4a; color: #2a1808; border: 2px solid #2a1808;
      font: 900 20px/1 var(--f-head, serif); box-shadow: 0 3px 6px rgba(0, 0, 0, .6); animation: htSlam2 .35s cubic-bezier(.3, 1.6, .5, 1) 1.5s both; }
    @keyframes htSlam2 { from { opacity: 0; transform: scale(2); } to { opacity: 1; transform: none; } }
    /* The answers: trail signs, a wooden plank with claw marks scored across its end */
    #panel .win.hd-win.hd-bt.ht-win .hd-sat .act-l::before { content: '🐾 '; }
    #panel .win.hd-win.hd-bt.ht-win .hd-sat .opts .opt.ht-sign { border-color: #7a5630; border-radius: 6px 16px 16px 6px;
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='34' height='30'%3E%3Cpath d='M6 3 L10 27 M15 1 L17 27 M25 3 L26 26' stroke='%23ff7a5a' stroke-width='2.6' stroke-linecap='round' fill='none' opacity='.75'/%3E%3C/svg%3E") right 8px top 8px / 26px 24px no-repeat,
        repeating-linear-gradient(90deg, rgba(255, 220, 160, .04) 0 2px, transparent 2px 9px), linear-gradient(#3a2a1c, #22180f);
      box-shadow: inset 0 0 0 2px #140d08, inset 0 0 0 3px rgba(255, 200, 130, .12), 0 3px 0 #0c0a10; }
    #panel .win.hd-win.hd-bt.ht-win .hd-sat .opts .opt.ht-sign::after { content: none; }
    #panel .win.hd-win.hd-bt.ht-win .hd-sat .opts .opt.ht-sign::before { border-radius: 3px; clip-path: polygon(0 0, 75% 0, 100% 50%, 75% 100%, 0 100%); width: 28px; background: linear-gradient(#e0b46a, #a5772f); }
    #panel .win.hd-win.hd-bt.ht-win .hd-sat .opts .opt.ht-sign.on { border-color: #ffd27a; transform: translateY(-3px);
      background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='34' height='30'%3E%3Cpath d='M6 3 L10 27 M15 1 L17 27 M25 3 L26 26' stroke='%23ffd27a' stroke-width='2.6' stroke-linecap='round' fill='none'/%3E%3C/svg%3E") right 8px top 8px / 26px 24px no-repeat,
        radial-gradient(80% 60% at 50% 30%, rgba(255, 200, 110, .3), transparent 75%), linear-gradient(#4a3420, #26180e);
      box-shadow: inset 0 0 0 2px #140d08, 0 0 0 2px rgba(255, 200, 90, .4), 0 0 16px rgba(255, 180, 60, .55), 0 3px 0 #0c0a10; }
    #panel .win.hd-win.hd-bt.ht-win .hd-sat .opts .opt.ht-sign:focus-visible { outline: 3px solid #ffd27a; outline-offset: 2px; }
    /* The question card is the trail's notice, not an attack */
    #panel .win.hd-bt.ht-win .hd-card { box-shadow: 0 0 0 2px #2a2018, 0 0 0 4px #7a5630, 0 10px 24px rgba(0, 0, 0, .6); }
    #panel .win.hd-bt.ht-win .hd-tag { background: linear-gradient(#5a3e1c, #3a2610); border-color: #e0b46a; color: #ffeec4; }
    /* The verdict stamp sits at the right on a wide screen, clear of the edge (Bru's line ends left of it) */
    @media (min-width: 701px) { .hd-st-track.hd-fb .hd-verdict { left: auto; right: 24px; align-items: flex-end; } }
    @media (max-width: 700px) {
      .hd-st-track .ht-bar { font-size: 9.5px; padding: 2px 5px; }
      .hd-st-track .ht-bang { width: 22px; height: 22px; font-size: 15px; }
      #panel .win.hd-win.hd-bt.ht-win .hd-sat .opts .opt.ht-sign { padding-right: 34px; background-size: 20px 19px, auto, auto; background-position: right 7px top 8px, 0 0, 0 0; }
      #panel .win.hd-win.hd-bt.ht-win .hd-sat .opts .opt.ht-sign::before { width: 25px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .hd-st-track .ht-t.on .ht-prints, .hd-st-track .hs-bru.ht-run, .hd-st-track .ht-kick, .hd-st-track .hd-foe.ht-found, .hd-st-track .ht-net, .hd-st-track .hd-foe.ht-found .hd-spr,
      .hd-st-track .ht-bar, .hd-st-track .ht-puff, .hd-st-track .hd-foe.ht-spot, .hd-st-track .ht-bang { animation: none !important; }
      .hd-st-track .ht-puff { display: none; }
      .hd-st-track .hd-foe { transition: none; }
    }`;
  document.head.appendChild(css);
})();
