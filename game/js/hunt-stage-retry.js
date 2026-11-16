// Monster Hunt's retry as a REMATCH (js/hunt-debrief.js staging for o.battle === 'retry'). After a miss the monster
// hits back: it lunges at Bru, the hit lands, the screen cracks around her (a glass crack drawn over the street, under
// every card and line, never over text), the crack fades to a faint scar at the edge, and it squares up again under a
// ROUND 2 banner while the twin question (same idea, new scenario) drops in. The verdict: right, a finishing blow
// (a double slash, a burst, it's knocked flat) and the crack shatters away; wrong, it dashes off down the street and
// Bru says you'll pick up its trail. Presentation only: the quiz's question, options, scoring and feedback are its own.
(function () {
  if (!window.SD || !SD.huntDebrief) return;
  const still = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const NS = 'http://www.w3.org/2000/svg';
  const later = (st, ms, f) => setTimeout(() => { if (!st.dead) f(); }, ms);
  const re = (el, c) => { if (!el) return; el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };

  // A glass crack radiating from (x, y), kept inside the W×H box (so nothing in it reaches past the screen's edge).
  function crack(x, y, W, H, R) {
    let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const cx = v => Math.max(1, Math.min(W - 1, v)), cy = v => Math.max(1, Math.min(H - 1, v));
    const rays = [], n = 11;
    for (let i = 0; i < n; i++) {
      let a = (i / n) * Math.PI * 2 + rnd() * .4, r = 0;
      const pts = [[x, y]], len = R * (.55 + rnd() * .55);
      while (r < len) { r += R * (.06 + rnd() * .09); a += (rnd() - .5) * .45; pts.push([cx(x + Math.cos(a) * r), cy(y + Math.sin(a) * r)]); }
      rays.push(pts);
    }
    const d = rays.map(p => 'M' + p.map(q => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L')).join('');
    // Rings: short jagged links between neighbouring rays, near the impact.
    let ring = '';
    [2, 4].forEach(k => rays.forEach((p, i) => {
      const q = rays[(i + 1) % n];
      if (p[k] && q[k] && rnd() > .25) ring += `M${p[k][0].toFixed(1)} ${p[k][1].toFixed(1)}L${((p[k][0] + q[k][0]) / 2 + (rnd() - .5) * 8).toFixed(1)} ${((p[k][1] + q[k][1]) / 2 + (rnd() - .5) * 8).toFixed(1)}L${q[k][0].toFixed(1)} ${q[k][1].toFixed(1)}`;
    }));
    return { d, ring };
  }
  // The scar it leaves: a small crack in from the screen's left edge.
  function scar(y, H) {
    const yy = Math.max(12, Math.min(H - 12, y));
    return `M1 ${yy}L18 ${yy - 6}L30 ${yy - 3}L46 ${yy - 14}L60 ${yy - 12}M18 ${yy - 6}L26 ${yy + 10}L40 ${yy + 16}M30 ${yy - 3}L36 ${yy - 24}M1 ${yy + 22}L14 ${yy + 18}L22 ${yy + 28}`;
  }

  const mk = (tag, cls, html) => { const e = document.createElement(tag); e.className = cls; if (html) e.innerHTML = html; return e; };

  SD.huntDebrief.stages.retry = {
    open({ scene, st }) {
      const fx = mk('div', 'rt-fx');
      fx.setAttribute('aria-hidden', 'true');
      fx.innerHTML = `<svg class="rt-glass" xmlns="${NS}" preserveAspectRatio="none"><g class="rt-crack"><path class="rt-c0"/><path class="rt-c1"/><path class="rt-r0"/><path class="rt-r1"/></g>
        <g class="rt-scar"><path class="rt-c0"/><path class="rt-c1"/></g></svg>
        <div class="rt-flash"></div>
        <div class="rt-banner"><span class="rt-b1">ROUND</span><span class="rt-b2">2</span></div>
        <div class="rt-shards">${Array.from({ length: 12 }, (_, i) => `<i style="--a:${i * 30 + 8}deg;--d:${44 + (i % 4) * 16}px"></i>`).join('')}</div>`;
      scene.appendChild(fx);
      const foe = scene.querySelector('.hd-foe .hd-jar');
      if (foe) foe.insertAdjacentHTML('beforeend', '<i class="rt-x rt-x1"></i><i class="rt-x rt-x2"></i><span class="rt-dust"><i></i><i></i><i></i></span>');
      st.rt = { fx, intro: false, key: '' };
    },

    render({ scene, st, win, card, sat, mode, bru }) {
      const rt = st.rt;
      if (!rt) return;
      if (mode === 'q') {
        // The card is the new scenario: Round 2 on its tag.
        const tag = card.querySelector('.hd-tag');
        if (tag) tag.innerHTML = 'Round 2 <span class="rt-ns">· new scenario</span>';
      }
      if (rt.intro) return;
      rt.intro = true;
      const foe = scene.querySelector('.hd-foe');
      if (still()) {
        // No motion: the scar is there, the banner sits small by it, and Bru says what happened.
        scene.classList.add('rt-after', 'rt-still');
        bru.react('frown', 1200);
        bru.say('<b>Bru:</b> It hit back! Round 2: same idea, new scenario.');
        return;
      }
      // The hit back: it lunges (≈0–380ms), the hit lands (≈300ms: crack, flash, shake, Bru winces), it squares up
      // again (≈700ms), ROUND 2 (≈800–2000ms) while the card drops in late, then the crack fades to a scar.
      scene.classList.add('rt-intro');
      card.classList.add('rt-late'); sat.classList.add('rt-late');
      bru.say('');
      re(foe, 'rt-hitback');
      later(st, 300, () => {
        re(scene, 'rt-cracked'); re(scene, 'rt-jolt');
        bru.react('wince', 900);
      });
      later(st, 750, () => { re(scene, 'rt-r2'); });
      later(st, 1900, () => {
        scene.classList.remove('rt-intro'); scene.classList.add('rt-after');
        if (st.mode === 'q') { bru.react('frown', 1400); bru.say('<b>Bru:</b> It hit back! Round 2: same idea, new scenario.'); }
      });
      later(st, 2600, () => { if (foe) foe.classList.remove('rt-hitback'); });
    },

    strike(ok, guess, { scene, st, bru }) {
      const foe = scene.querySelector('.hd-foe'), calm = still();
      scene.classList.remove('rt-intro', 'rt-r2'); scene.classList.add('rt-after');
      if (foe) foe.classList.remove('rt-hitback', 'rt-ko', 'rt-flee', 'rt-gone');
      if (ok) {
        // The finisher: a double slash, a white burst, the crack shatters, and it's knocked flat.
        if (foe) { foe.setAttribute('aria-label', foe.getAttribute('aria-label').replace(/,.*$/, ', knocked flat')); calm ? foe.classList.add('rt-ko') : re(foe, 'rt-ko'); }
        if (calm) scene.classList.add('rt-healed');
        else { re(scene, 'rt-finish'); later(st, 380, () => scene.classList.add('rt-healed')); }
        bru.turn('front');
        bru.react(guess ? 'smile' : 'grin', 1e9);
        bru.say(`<b>Bru:</b> ${guess ? 'Knocked it down, but that was a guess. It\'ll come back to you.' : 'That\'s the finisher! Round 2 is yours.'}`);
      } else {
        // It gets away: a dash off down the street, a puff of dust where it stood. The scar stays.
        if (foe) {
          foe.setAttribute('aria-label', foe.getAttribute('aria-label').replace(/,.*$/, ', running off down the street'));
          if (calm) foe.classList.add('rt-gone');
          else { re(foe, 'rt-flee'); later(st, 900, () => foe.classList.add('rt-gone')); }
        }
        bru.react('frown', 900);
        later(st, 950, () => { if (st.bru) st.bru.react('smile', 1e9); });
        bru.say('<b>Bru:</b> It ran for it! We\'ll pick up its trail. Read why, then go after it.');
      }
      return true;
    },

    fit({ scene, st, win, wide, W, H, bh, bw, bl, satTop, cardBottom }) {
      const rt = st.rt;
      if (!rt) return;
      // Where the hit lands: Bru's chest (wide) or her face, in the gap between the card and the satchel (phone).
      const fb = win.classList.contains('hd-f');
      const x = wide ? bl + bw * .5 : Math.max(30, bw * .38);
      const y = wide ? H - bh * .62 : Math.max(cardBottom + 30, Math.min(satTop - 30, (cardBottom + satTop) / 2));
      const key = [W, H, Math.round(x), Math.round(y)].join(',');
      if (key !== rt.key) {
        rt.key = key;
        const svg = rt.fx.querySelector('.rt-glass');
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        const c = crack(x, y, W, H, Math.max(W, H) * .55), sc = scar(y, H);
        svg.querySelectorAll('.rt-crack .rt-c0, .rt-crack .rt-c1').forEach(p => p.setAttribute('d', c.d));
        svg.querySelectorAll('.rt-crack .rt-r0, .rt-crack .rt-r1').forEach(p => p.setAttribute('d', c.ring));
        svg.querySelectorAll('.rt-scar path').forEach(p => p.setAttribute('d', sc));
      }
      const set = (k, v) => rt.fx.style.setProperty(k, Math.round(v) + 'px');
      set('--rt-x', x); set('--rt-y', y);
      // ROUND 2 hangs in the open street between the card and the satchel, right of Bru.
      const left = wide ? bl + bw * .9 : bw * .5, gapMid = (cardBottom + satTop) / 2;
      set('--rt-bx', left + (W - left) / 2); set('--rt-by', fb ? H * .45 : gapMid);
      set('--rt-bs', wide ? Math.min(64, Math.max(40, (satTop - cardBottom) * .28)) : Math.min(34, Math.max(20, (satTop - cardBottom) * .26)));
      scene.classList.toggle('rt-wide', wide);
    }
  };

  const css = document.createElement('style');
  css.textContent = `
    .hd-st-retry .rt-fx { position: absolute; inset: 0; z-index: 3; pointer-events: none; overflow: hidden; }
    .hd-st-retry .hs-say.hd-say { z-index: 5; }
    /* The crack: a dark seam under a bright edge, so it reads on the light sky and the dark street alike. */
    .hd-st-retry .rt-glass { position: absolute; inset: 0; width: 100%; height: 100%; overflow: hidden; }
    .hd-st-retry .rt-glass path { fill: none; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
    .hd-st-retry .rt-c0, .hd-st-retry .rt-r0 { stroke: rgba(8, 6, 12, .75); stroke-width: 4; }
    .hd-st-retry .rt-c1, .hd-st-retry .rt-r1 { stroke: rgba(235, 248, 255, .95); stroke-width: 1.6; }
    .hd-st-retry .rt-crack { opacity: 0; }
    .hd-st-retry .rt-scar { opacity: 0; transition: opacity .6s; }
    .hd-st-retry.rt-cracked .rt-crack { animation: rtCrack 1.9s ease-out both; }
    .hd-st-retry.rt-cracked .rt-crack path { stroke-dasharray: 2400; animation: rtDraw .32s ease-out both; }
    @keyframes rtCrack { 0% { opacity: 1; } 55% { opacity: 1; } 100% { opacity: 0; } }
    @keyframes rtDraw { from { stroke-dashoffset: 2400; } to { stroke-dashoffset: 0; } }
    .hd-st-retry.rt-after .rt-scar { opacity: .38; }
    .hd-st-retry.rt-healed .rt-scar { opacity: 0; }
    /* The impact: a white-red flash around Bru and a jolt of the whole street */
    .hd-st-retry .rt-flash { position: absolute; inset: 0; opacity: 0; background: radial-gradient(circle at var(--rt-x, 30%) var(--rt-y, 60%), rgba(255, 255, 255, .95), rgba(255, 90, 60, .55) 14%, rgba(160, 10, 0, .35) 40%, transparent 70%); }
    .hd-st-retry.rt-cracked .rt-flash { animation: rtFlash .55s ease-out; }
    @keyframes rtFlash { 0% { opacity: 1; } 100% { opacity: 0; } }
    .hd-st-retry.rt-jolt { animation: rtJolt .42s ease-out; }
    @keyframes rtJolt { 10% { transform: translate(-10px, 6px); } 30% { transform: translate(9px, -5px); } 50% { transform: translate(-6px, 3px); } 70% { transform: translate(4px, -2px); } }
    /* It hits back: a long lunge at Bru, then it hops back to square up */
    .hd-st-retry .hd-foe.rt-hitback .hd-spr { animation: rtHitback .7s cubic-bezier(.5, 0, .3, 1), rtSquare .5s ease-out .7s 2, hdSquare 1.8s ease-in-out 1.7s infinite; }
    @keyframes rtHitback { 0% { transform: none; } 25% { transform: translateX(14px) scale(.92); } 45% { transform: translateX(calc(-1 * var(--hd-lx, 160px))) scale(1.4) rotate(-10deg); } 60% { transform: translateX(calc(-.85 * var(--hd-lx, 160px))) scale(1.3) rotate(-4deg); } 100% { transform: none; } }
    @keyframes rtSquare { 40% { transform: translateY(-10px) scale(1.06, .94); } 70% { transform: translateY(0) scale(.96, 1.06); } }
    /* ROUND 2: slammed in over the open street, held, then gone */
    .hd-st-retry .rt-banner { position: absolute; left: var(--rt-bx, 60%); top: var(--rt-by, 50%); display: flex; align-items: center; gap: .25em; opacity: 0; transform: translate(-50%, -50%) rotate(-4deg);
      padding: .12em .5em .08em; font: 900 var(--rt-bs, 48px)/1 var(--f-head, serif); letter-spacing: .06em; color: #fff3d6; white-space: nowrap;
      background: linear-gradient(#a81c10, #5a0a04); border: 3px solid #ffd27a; border-radius: 6px; box-shadow: 0 0 0 3px #2a0a06, 0 10px 24px rgba(0, 0, 0, .6), 0 0 30px rgba(255, 90, 40, .6);
      text-shadow: 0 3px 0 #2a0a06, 0 0 12px rgba(255, 200, 120, .7); }
    .hd-st-retry .rt-b2 { display: grid; place-items: center; min-width: 1.15em; height: 1.15em; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #ffe2a0, #c9a24a); color: #2a1c08; text-shadow: none; font-size: .86em; }
    .hd-st-retry.rt-r2 .rt-banner { animation: rtBanner 1.4s cubic-bezier(.2, 1.4, .4, 1) both; }
    @keyframes rtBanner { 0% { opacity: 0; transform: translate(-50%, -50%) rotate(-4deg) scale(2.4); } 18% { opacity: 1; transform: translate(-50%, -50%) rotate(-4deg) scale(1); }
      24% { transform: translate(-50%, -50%) rotate(-4deg) scale(1.06); } 30%, 80% { opacity: 1; transform: translate(-50%, -50%) rotate(-4deg) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) rotate(-4deg) scale(.9); } }
    .hd-st-retry.rt-still .rt-banner { opacity: 1; font-size: 18px; }
    .hd-st-retry.rt-still.rt-healed .rt-banner, .hd-st-retry.rt-still .hd-foe.rt-gone ~ .rt-banner { opacity: 0; }
    /* While it hits back, Bru's line waits */
    .hd-st-retry.rt-intro .hs-say.hd-say { opacity: 0; }
    /* The card and the satchel come in once the hit has landed */
    #panel .win.hd-win:has(> .hd-st-retry) .hd-card.rt-late.hd-drop { animation-delay: .8s; }
    #panel .win.hd-win:has(> .hd-st-retry) .hd-sat.rt-late { animation: rtRise .4s cubic-bezier(.2, 1.2, .4, 1) .85s both; }
    @keyframes rtRise { from { transform: translateY(40%); opacity: 0; } to { transform: none; opacity: 1; } }
    #panel .win.hd-win:has(> .hd-st-retry) .hd-tag .rt-ns { font-weight: 600; letter-spacing: .04em; text-transform: none; color: #ffd8cc; }
    /* The finisher: two slashes crossing, a burst behind it, the screen flashes white */
    .hd-st-retry .rt-x { position: absolute; left: 0; top: 50%; width: 100%; height: 10px; margin-top: -5px; border-radius: 6px; pointer-events: none; transform: rotate(-38deg) scaleX(0);
      background: linear-gradient(90deg, transparent, #fff 25%, #ffe7a0 50%, #fff 75%, transparent); box-shadow: 0 0 18px #ffd27a, 0 0 40px #ff9a3a; }
    .hd-st-retry .rt-x2 { transform: rotate(38deg) scaleX(0); }
    .hd-st-retry .hd-foe.rt-ko .rt-x1 { animation: rtX1 .5s ease-out .05s; }
    .hd-st-retry .hd-foe.rt-ko .rt-x2 { animation: rtX2 .5s ease-out .22s; }
    @keyframes rtX1 { 0% { opacity: 1; transform: rotate(-38deg) scaleX(0); } 45% { opacity: 1; transform: rotate(-38deg) scaleX(1.25); } 100% { opacity: 0; transform: rotate(-38deg) scaleX(1.25) translateY(8px); } }
    @keyframes rtX2 { 0% { opacity: 1; transform: rotate(38deg) scaleX(0); } 45% { opacity: 1; transform: rotate(38deg) scaleX(1.25); } 100% { opacity: 0; transform: rotate(38deg) scaleX(1.25) translateY(8px); } }
    .hd-st-retry .hd-foe.rt-ko .hd-spr { animation: rtKo .9s cubic-bezier(.3, 0, .3, 1) .2s both !important; filter: grayscale(.7) brightness(.75) drop-shadow(0 6px 4px rgba(0, 0, 0, .7)) !important; }
    @keyframes rtKo { 0% { transform: none; filter: brightness(3) drop-shadow(0 0 24px #fff); } 30% { transform: translate(10%, -18%) rotate(40deg) scale(.9); } 70% { transform: translate(6%, 22%) rotate(90deg) scale(.86); }
      85% { transform: translate(6%, 18%) rotate(84deg) scale(.86); } 100% { transform: translate(6%, 22%) rotate(90deg) scale(.86); } }
    .hd-st-retry .hd-foe.rt-ko::after { opacity: .4; }
    .hd-st-retry.rt-finish .rt-flash { animation: rtWhite .5s ease-out .15s; background: radial-gradient(circle at 75% 55%, rgba(255, 255, 255, .95), rgba(255, 230, 160, .6) 25%, transparent 70%); }
    @keyframes rtWhite { 0% { opacity: 0; } 20% { opacity: 1; } 100% { opacity: 0; } }
    .hd-st-retry.rt-finish { animation: rtJolt .4s ease-out .2s; }
    /* ...and the crack flashes once more and shatters away */
    .hd-st-retry.rt-finish .rt-crack { animation: rtShatter .45s ease-in .1s both; transform-origin: var(--rt-x, 30%) var(--rt-y, 60%); transform-box: view-box; }
    @keyframes rtShatter { 0% { opacity: .9; transform: none; } 100% { opacity: 0; transform: scale(1.25); } }
    .hd-st-retry .rt-shards { position: absolute; left: var(--rt-x, 30%); top: var(--rt-y, 60%); width: 0; height: 0; }
    .hd-st-retry .rt-shards i { position: absolute; left: -6px; top: -6px; width: 12px; height: 12px; opacity: 0; background: linear-gradient(135deg, rgba(255, 255, 255, .95), rgba(170, 220, 255, .5)); clip-path: polygon(50% 0, 100% 70%, 20% 100%); }
    .hd-st-retry.rt-finish .rt-shards i { animation: rtShard .7s ease-out .12s; }
    @keyframes rtShard { 0% { opacity: 1; transform: rotate(var(--a)) translateX(4px) rotate(0); } 100% { opacity: 0; transform: rotate(var(--a)) translateX(var(--d)) rotate(220deg); } }
    /* It gets away: a crouch, a dash off to the right, a puff of dust left behind */
    .hd-st-retry .hd-foe.rt-flee .hd-spr { animation: rtFlee .85s cubic-bezier(.6, 0, .9, .4) both !important; }
    @keyframes rtFlee { 0% { transform: none; opacity: 1; } 25% { transform: translateX(-10px) scale(1.05, .9); opacity: 1; } 84% { transform: translateX(110vw) scale(.8, 1.05) skewX(-18deg); opacity: 1; } 85%, 100% { transform: none; opacity: 0; } }
    .hd-st-retry .hd-foe.rt-gone .hd-spr { opacity: 0; animation: none !important; }
    .hd-st-retry .hd-foe.rt-gone::after { opacity: 0; transition: opacity .4s; }
    .hd-st-retry .rt-dust { position: absolute; left: 50%; bottom: 4%; width: 0; height: 0; }
    .hd-st-retry .rt-dust i { position: absolute; left: -16px; top: -16px; width: 32px; height: 32px; border-radius: 50%; opacity: 0; background: radial-gradient(rgba(220, 205, 180, .85), rgba(160, 140, 110, 0) 70%); }
    .hd-st-retry .hd-foe.rt-flee .rt-dust i { animation: rtDust .9s ease-out .2s; }
    .hd-st-retry .hd-foe.rt-flee .rt-dust i:nth-child(2) { animation-delay: .3s; left: -34px; }
    .hd-st-retry .hd-foe.rt-flee .rt-dust i:nth-child(3) { animation-delay: .4s; left: 2px; }
    @keyframes rtDust { 0% { opacity: .9; transform: scale(.4); } 100% { opacity: 0; transform: translateY(-14px) scale(1.8); } }
    @media (prefers-reduced-motion: reduce) {
      .hd-st-retry, .hd-st-retry *, #panel .win.hd-win:has(> .hd-st-retry) .rt-late { animation: none !important; transition: none !important; }
      .hd-st-retry .hd-foe.rt-ko .hd-spr { transform: rotate(90deg) scale(.86); }
    }`;
  document.head.appendChild(css);
})();
