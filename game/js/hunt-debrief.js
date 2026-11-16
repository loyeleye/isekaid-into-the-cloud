// Monster Hunt's Debrief as a scene (Ladi, Nov 16: "It's still box heavy rather than showing things live in a scene";
// "You are just making fancier versions of the same menu / text box interface"). After a board, the poster's own exam
// question is asked in the same painted street: Bru stands full size and asks it on a dialogue card pulled down over
// the scene, the monster you just caught sits in its jar beside her (or lurks, if it got away), and the answers are
// cards along the bottom, like the satchel on the boards. She reacts to the verdict: a grin, turned to you, when you
// have it; a frown, with the monster rattling its jar, when you don't. The feedback stays in the scene, on the card.
//
// The question itself is still js/quiz.js's (through SD.modes.ask), untouched: the same text, options, multi-select,
// Type it first, scoring, Wall and feedback. This file only re-homes its nodes while the Debrief is up: each time the
// quiz draws its window, the scene is moved into it and the window's nodes are sorted into the card and the satchel.
// Nothing here knows which option is right before the quiz shows its verdict.
//
// API: SD.huntDebrief.ask(m, ask) → ask()'s result. m: the hunt's monster (a board poster); ask: the call that asks
// the question (js/hunt.js's shell().ask), run inside the scene.
(function () {
  const D = SD.huntDebrief = {};
  const U = SD.ui, esc = s => U.esc(String(s == null ? '' : s));
  const still = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let st = null;

  D.ask = async function (m, ask) {
    const HB = SD.huntBoard;
    if (!HB || !HB.bruOn || !HB.bruHtml || !window.MutationObserver || !document.querySelector('#panel')) return ask();
    open(m);
    try { return await ask(); } finally { close(); }
  };

  // The monsters on the poster's board, and whether each was contained (the last run's result, or the board's).
  function mons(m) {
    const HC = SD.huntCore, b = HC && m.qs && HC.board(m.qs.board);
    if (!b) return [];
    const last = m.sim && m.sim.last, won = !!(m.res && m.res.sim && m.res.sim.ok);
    return b.mons.slice(0, 2).map(id => ({ id, name: (HC.MONSTERS[id] || {}).name || id, tile: (HC.MONSTERS[id] || {}).tile,
      caught: last && last.contained && id in last.contained ? !!last.contained[id] : won }));
  }

  function open(m) {
    const HB = SD.huntBoard, ms = mons(m), caught = ms.length ? ms.every(x => x.caught) : true;
    const scene = document.createElement('div');
    scene.className = 'hd-scene';
    scene.innerHTML = `<div class="hs-view" aria-hidden="true"><div class="hs-street"><img class="hs-bg" src="${HB.STREET}" alt="" decoding="async"></div></div>
      <div class="hd-wash" aria-hidden="true"></div>
      ${HB.bruHtml()}
      <div class="hd-jars">${ms.map(x => `<div class="hd-mon ${x.caught ? 'jarred' : 'loose'}" role="img" aria-label="${esc(x.name)}, ${x.caught ? 'caught in its jar' : 'loose: it got away'}">
        <span class="hd-jar" aria-hidden="true"><img class="hd-spr" src="assets/img/hunt/${esc(x.id)}.webp" alt="" decoding="async"></span></div>`).join('')}<div class="hd-hp"></div></div>
      <p class="hs-say hd-say" aria-live="polite" hidden></p>`;
    st = { m, scene, ms, caught, bru: null, mode: null, cTop: 0, sTop: 0, dead: false, reacted: false };
    st.obs = new MutationObserver(wrap);
    st.obs.observe(document.querySelector('#panel'), { childList: true, subtree: true });
    st.ro = window.ResizeObserver ? new ResizeObserver(() => fit()) : null;
    st.onResize = () => fit();
    window.addEventListener('resize', st.onResize);
    wrap();
  }
  function close() {
    if (!st) return;
    st.dead = true;
    st.obs.disconnect();
    if (st.ro) st.ro.disconnect();
    window.removeEventListener('resize', st.onResize);
    st.scene.remove();
    st = null;
  }

  // What the window holds: the question ('q'), the verdict and feedback ('f'), or something else on the way ('o':
  // reading a typed answer, its rubric).
  const TOP = '.hn-hp, .q-ctx, .q-ev, .q-q, .tf-said';
  function wrap() {
    if (!st || st.dead) return;
    const p = document.querySelector('#panel'), win = p && !p.hidden ? p.querySelector(':scope > .win.quiz') : null;
    // The window closed after the question was up (Continue, Stop for now, Home): the Debrief is over, whatever its promise does next.
    // (Before the question's first window, the panel is still closed from the board.)
    if (!win) { if (st.seen && p && (p.hidden || !p.firstElementChild)) { st.dead = true; st.obs.disconnect(); } return; }
    st.seen = true;
    if (win.dataset.hd) return;
    const b = win.querySelector(':scope > .win-b');
    if (!b) return;
    win.dataset.hd = '1';
    win.classList.add('hd-win');
    win.prepend(st.scene);
    if (!st.bru) start();
    const mode = b.querySelector(':scope > .verdict-row') ? 'f' : b.querySelector(':scope > :is(.conf, .type-first, .say-first)') ? 'q' : 'o';
    const card = document.createElement('div'), inn = document.createElement('div'), sat = document.createElement('div'), gap = document.createElement('div');
    card.className = 'hd-card'; inn.className = 'hd-in'; sat.className = 'hd-sat'; gap.className = 'hd-gap';
    card.innerHTML = `<span class="hd-tag" aria-hidden="true">${mode === 'q' ? 'Bru asks' : 'Bru'}</span>`;
    card.appendChild(inn);
    // The health tag (js/hunt.js puts it in every hunt question) hangs on the jar on a wide screen; on a phone it
    // stays at the top of the card, as one small line.
    const hp = b.querySelector('.hn-hp'), slot = st.scene.querySelector('.hd-hp');
    if (hp && innerWidth > 700) { slot.innerHTML = ''; slot.appendChild(hp); }
    else if (hp) { slot.innerHTML = ''; b.prepend(hp); }
    [...b.children].forEach(k => {
      const low = mode === 'q' ? !k.matches(TOP) : k.matches('.q-foot, #q-confirm');
      (low ? sat : inn).appendChild(k);
    });
    if (!sat.children.length) sat.classList.add('empty');
    b.append(card, gap, sat);
    win.classList.toggle('hd-f', mode === 'f');
    win.classList.toggle('hd-q', mode === 'q');
    // A redraw of the same question (a tap on an option) keeps where you'd scrolled; a new step drops in from the top.
    if (mode === st.mode && mode === 'q') { inn.scrollTop = st.cTop; sat.scrollTop = st.sTop; }
    else { st.cTop = st.sTop = 0; if (!still()) card.classList.add('hd-drop'); }
    inn.addEventListener('scroll', () => { st.cTop = inn.scrollTop; }, { passive: true });
    sat.addEventListener('scroll', () => { st.sTop = sat.scrollTop; }, { passive: true });
    if (mode === 'f' && st.mode !== 'f') verdict(b);
    // Phones: after picking an answer, bring the confidence buttons into view in the satchel.
    const conf = sat.querySelector('.conf');
    if (mode === 'q' && conf && innerWidth <= 700 && sat.querySelector('[data-o].on') && sat.scrollHeight > sat.clientHeight)
      requestAnimationFrame(() => { sat.scrollTop = Math.max(sat.scrollTop, conf.offsetTop + conf.offsetHeight - sat.clientHeight); });
    st.mode = mode;
    if (st.ro) { st.ro.disconnect(); [win, b, card, sat].forEach(x => st.ro.observe(x)); }
    fit();
  }

  // Bru comes to life the first time the scene is in the page (her blinking and breathing stop once it's gone).
  function start() {
    const HB = SD.huntBoard, ms = st.ms;
    st.bru = HB.bruOn(st.scene);
    st.bru.turn('three');
    const name = ms.length ? ms.map(x => x.name).join(' and ') : 'It';
    st.bru.say(`<b>Bru:</b> ${st.caught ? `${esc(name)}, in the jar. Now tell me why that worked.` : `${esc(name)} got away. Tell me what would have held it.`}`);
    // On a phone the street pans: start with the monster's spot in view.
    const v = st.scene.querySelector('.hs-view'), t = ms[0] && HB.SPOT && HB.SPOT[ms[0].tile];
    requestAnimationFrame(() => { if (v && t && v.scrollWidth > v.clientWidth) v.scrollLeft = Math.max(0, v.scrollWidth * t[0] / 100 - v.clientWidth * .6); });
  }

  // The verdict is on screen (the answer is committed): Bru and the monster react to it.
  function verdict(b) {
    const v = b.querySelector('.verdict'), ok = !!(v && v.classList.contains('ok')), guess = ok && /GUESS/i.test(v.textContent);
    const jars = st.scene.querySelectorAll('.hd-mon');
    jars.forEach(j => { j.classList.remove('rattle', 'cowed'); void j.offsetWidth; j.classList.add(ok ? 'cowed' : 'rattle'); });
    if (ok) {
      st.bru.turn('front');
      st.bru.react(guess ? 'smile' : 'grin', 1e9);
      st.bru.say(`<b>Bru:</b> ${guess ? 'Right, but that was a guess. It\'ll come back to you.' : st.caught ? 'That\'s it. That\'s why the lid stays on.' : 'That\'s it. Next time it stays in the jar.'}`);
    } else {
      st.bru.react('frown', 1e9);
      st.bru.say(`<b>Bru:</b> ${st.caught ? 'Hear that rattle? Not quite. Read why.' : 'Not quite. Read why.'}`);
    }
  }

  // Where Bru, her line and the jar stand: worked out from the card and the satchel, so her face stays in the gap
  // between them on a phone, and the card starts at her shoulder on a wide screen.
  function fit() {
    if (!st || !st.scene.isConnected) return;
    // Layout sizes, not boxes: the window pops in scaled, and the card drops in.
    const sc = st.scene, win = sc.parentElement;
    const card = win.querySelector('.hd-card'), sat = win.querySelector('.hd-sat');
    const W = sc.offsetWidth, H = sc.offsetHeight;
    if (!W || !H) return;
    const wide = innerWidth > 700;
    const b = card && card.parentElement, bt = b ? b.offsetTop : 0;
    const cb = card ? bt + card.offsetTop + card.offsetHeight : 0;
    const satTop = sat && !sat.classList.contains('empty') && sat.offsetHeight ? bt + sat.offsetTop : H;
    const cl = (a, x, z) => Math.max(a, Math.min(z, x));
    let bh, bl;
    if (wide) { bh = Math.min(H * .78, 620); bl = Math.max(4, Math.round(innerWidth * .02)); }
    else { bh = cl(H * .3, (H - cb) / .95, H * .72); bl = 0; }
    const bw = bh * 475 / 900, gapH = satTop - cb;
    const js = wide ? cl(80, bh * .2, 128) : cl(48, (gapH - 22) / 1.1, 92);
    const set = (el, k, v) => el.style.setProperty(k, Math.round(v) + 'px');
    set(sc, '--hd-bh', bh); set(sc, '--hd-bl', bl); set(sc, '--hd-js', js);
    set(win, '--hd-cl', wide ? bl + bw + 12 : 8); set(win, '--hd-sl', wide ? bl + bw * .62 : 0);
    const jars = sc.querySelector('.hd-jars');
    if (wide) { set(jars, '--hd-jx', bl + bw * .7); jars.style.right = 'auto'; }
    else { jars.style.removeProperty('--hd-jx'); jars.style.right = '8px'; }
    set(jars, '--hd-jb', H - satTop + 4);
    const say = sc.querySelector('.hd-say');
    if (wide) {
      // Over her head, with the tail pointing down at her.
      set(say, '--hd-sx', bl + 4); set(say, '--hd-sb', bh * .985 + 10); set(say, '--hd-sw', Math.max(160, Math.min(320, bw + 12 - 24)));
      say.style.top = 'auto';
    } else {
      // Beside her face, in the gap, left of the jar.
      const x = bw * .64;
      set(say, '--hd-sx', x); set(say, '--hd-sw', Math.max(110, W - x - js - 30));
      say.style.top = Math.round(cb + 6) + 'px'; say.style.removeProperty('--hd-sb');
      set(say, '--hd-sh', Math.max(40, gapH - 12));
    }
    sc.classList.toggle('hd-wide', wide);
    sc.classList.toggle('hd-tight', !wide && gapH < 64);
  }

  const css = document.createElement('style');
  css.textContent = `
    /* The window is the scene: no box, the street behind everything. */
    #panel .win.hd-win { background: #0c0a10 !important; overflow: hidden; }
    #panel .win.hd-win > .win-h { position: relative; z-index: 3; background: linear-gradient(rgba(6, 5, 10, .8), rgba(6, 5, 10, 0)) !important; border: 0; }
    #panel .win.hd-win > .win-b { position: relative; z-index: 2; flex: 1; min-height: 0; padding: 0 !important; overflow: hidden !important; background: none !important; box-shadow: none !important;
      display: grid; grid-template-rows: auto minmax(0, 1fr) auto; grid-template-columns: minmax(0, 1fr); container-type: size; }
    .hd-scene { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
    .hd-scene .hs-view { position: absolute; inset: 0; overflow: hidden; }
    .hd-scene .hs-street { left: 0; width: max(100cqw, calc(100cqh * 1584 / 672)); }
    .hd-wash { position: absolute; inset: 0; background: radial-gradient(90% 70% at 30% 70%, transparent, rgba(6, 5, 10, .55)), linear-gradient(rgba(6, 5, 10, .45), rgba(6, 5, 10, .1) 40%, rgba(6, 5, 10, .55)); }
    .hd-scene .hs-bru { left: var(--hd-bl, 2vw); height: var(--hd-bh, 78%); z-index: 1; }
    /* Bru's line: over her head on a wide screen, beside her face on a phone */
    .hd-scene .hs-say.hd-say { left: var(--hd-sx, 12px); bottom: var(--hd-sb, auto); width: max-content; max-width: var(--hd-sw, 280px); max-height: var(--hd-sh, none); overflow: hidden; z-index: 4; font-size: 15px; }
    .hd-scene.hd-wide .hs-say.hd-say::before { left: 34px; bottom: -14px; border: 8px solid transparent; border-top: 14px solid #2a2018; border-bottom: 0; }
    .hd-scene.hd-wide .hs-say.hd-say::after { left: 36px; bottom: -10px; border: 6px solid transparent; border-top: 11px solid #fbf5e3; border-bottom: 0; }
    .hd-scene:not(.hd-wide) .hs-say.hd-say { font-size: 13px; padding: 6px 9px; border-radius: 12px; }
    .hd-scene:not(.hd-wide) .hs-say.hd-say::before { left: -12px; top: 12px; bottom: auto; }
    .hd-scene:not(.hd-wide) .hs-say.hd-say::after { left: -8px; top: 14px; bottom: auto; }
    .hd-scene.hd-tight .hs-say.hd-say { clip-path: inset(50%); }
    /* The jar (or the monster loose), beside her */
    .hd-jars { position: absolute; z-index: 3; left: var(--hd-jx, auto); bottom: var(--hd-jb, 30%); display: flex; align-items: flex-end; gap: 6px; flex-direction: column; }
    .hd-jars > .hd-mon + .hd-mon { margin-top: -6px; }
    .hd-mon { position: relative; display: grid; place-items: center; }
    .hd-jar { position: relative; display: grid; place-items: center; width: var(--hd-js, 96px); height: calc(var(--hd-js, 96px) * 1.1); box-sizing: border-box;
      border: 3px solid rgba(200, 230, 255, .75); border-top-width: 2px; border-radius: 16px 16px 22px 22px;
      background: linear-gradient(100deg, rgba(255, 255, 255, .22) 0 14%, transparent 15% 70%, rgba(255, 255, 255, .1) 71% 78%, transparent 79%), rgba(140, 200, 230, .12);
      box-shadow: inset 0 -10px 16px rgba(120, 190, 220, .25), 0 0 14px rgba(150, 210, 240, .3), 0 8px 10px rgba(0, 0, 0, .5); }
    .hd-jar::before { content: ''; position: absolute; top: -12px; left: 10%; right: 10%; height: 10px; border-radius: 4px; background: linear-gradient(#a07a3a, #6a4a1e); border: 2px solid #3a2a14; }
    .hd-spr { width: 78%; height: auto; image-rendering: pixelated; animation: hdLurk 2.6s ease-in-out infinite; }
    .hd-mon.jarred .hd-spr { filter: grayscale(.85) brightness(.8); }
    .hd-mon.loose .hd-jar { border: 0; background: none; box-shadow: none; }
    .hd-mon.loose .hd-jar::before { display: none; }
    .hd-mon.loose .hd-spr { width: 100%; filter: drop-shadow(0 0 10px rgba(255, 70, 40, .7)) drop-shadow(0 6px 4px rgba(0, 0, 0, .7)); }
    @keyframes hdLurk { 50% { transform: translateY(-3px) scale(1.02); } }
    /* Wrong: it rattles its jar (or lunges, loose). Right: it shrinks back. */
    .hd-mon.rattle .hd-jar { animation: hdRattle .5s ease-in-out 3; box-shadow: inset 0 -10px 16px rgba(255, 80, 60, .35), 0 0 16px rgba(255, 60, 40, .7), 0 8px 10px rgba(0, 0, 0, .5); }
    .hd-mon.rattle .hd-spr { filter: drop-shadow(0 0 10px rgba(255, 50, 30, .95)); animation: hdBang .25s ease-out 6; }
    .hd-mon.loose.rattle .hd-jar { animation: hdLunge .45s ease-out 2; box-shadow: none; }
    @keyframes hdRattle { 20% { transform: rotate(-7deg) translateX(-3px); } 50% { transform: rotate(6deg) translateX(3px); } 80% { transform: rotate(-3deg); } }
    @keyframes hdBang { 50% { transform: scale(1.12) translateY(-4px); } }
    @keyframes hdLunge { 40% { transform: translateX(-14px) scale(1.15) rotate(-6deg); } }
    .hd-mon.cowed .hd-spr { animation: none; transform: scale(.86) translateY(6%); filter: grayscale(1) brightness(.7); transition: transform .4s, filter .4s; }
    .hd-mon.jarred.cowed .hd-jar { box-shadow: inset 0 -10px 16px rgba(120, 220, 150, .3), 0 0 16px rgba(120, 230, 150, .55), 0 8px 10px rgba(0, 0, 0, .5); }
    .hd-hp:empty { display: none; }
    .hd-hp { order: -1; }
    .hd-hp .hn-hp.hn-inq { margin: 4px 0 0; padding: 3px 8px 3px 4px; gap: 6px; transform: rotate(-1.5deg); font-size: 12px; }
    .hd-hp .hn-hp .hn-por { width: 30px; height: 30px; }
    .hd-hp .hn-hp .hn-por img { width: 30px; height: 30px; }
    .hd-hp .hn-wk { display: none; }
    .hd-hp .hn-hpn > b { font-size: 12px; }
    /* The question card: Bru's dialogue, pulled down over the scene. Paper, dark ink. */
    .hd-card { position: relative; z-index: 2; min-width: 0; margin: 10px 10px 0 var(--hd-cl, 8px); max-width: 860px; min-height: 0; display: flex; flex-direction: column;
      max-height: 38cqh; border-radius: 6px; background: linear-gradient(#fbf5e3, #f0e4c6); box-shadow: 0 0 0 2px #2a2018, 0 10px 24px rgba(0, 0, 0, .6);
      --cream: #f3e9d2; --paper: #eadfc4; --bone: #f8f1df; --ink: #2a2018; --muted: #6a5a48; --line: #b9a780; --blue: #3f5f80; --blue-d: #2a4360; --sun: #b8923a; --mi-ink: #2a2018; --mi-muted: #6a5a48; color: #2a2018; text-shadow: none; }
    @media (min-width: 701px) { .hd-card { max-height: 46cqh; } }
    #panel .hd-win.hd-f .hd-card { max-height: 60cqh; }
    /* Shadows at the top and bottom edges while there's more to scroll (they scroll away at the ends). */
    .hd-in { position: relative; z-index: 1; overflow-y: auto; overscroll-behavior: contain; padding: 14px 14px 12px; min-height: 0; scrollbar-width: thin; border-radius: 6px;
      background: linear-gradient(#fbf5e3 30%, rgba(251, 245, 227, 0)) center top, linear-gradient(rgba(240, 228, 198, 0), #f0e4c6 70%) center bottom,
        radial-gradient(farthest-side at 50% 0, rgba(60, 40, 10, .28), transparent) center top, radial-gradient(farthest-side at 50% 100%, rgba(60, 40, 10, .32), transparent) center bottom,
        linear-gradient(#fbf5e3, #f0e4c6);
      background-repeat: no-repeat; background-size: 100% 36px, 100% 36px, 100% 12px, 100% 12px, 100% 100%; background-attachment: local, local, scroll, scroll, scroll; }
    .hd-tag { position: absolute; z-index: 2; top: -9px; left: 12px; padding: 2px 8px; border: 1px solid #8a6a2a; border-radius: 3px; background: linear-gradient(#3a2c14, #24190c); color: #f0d68a;
      font: 700 11px/1.3 var(--f-head, serif); letter-spacing: .1em; text-transform: uppercase; }
    /* Its tail points at Bru: left on a wide screen, down to her face on a phone. */
    .hd-card::after { content: ''; position: absolute; width: 16px; height: 16px; background: #f4e9cd; box-shadow: 2px 2px 0 #2a2018; left: 22%; bottom: -8px; transform: rotate(45deg); }
    @media (min-width: 701px) { .hd-card::after { left: -8px; top: 34px; bottom: auto; box-shadow: -2px 2px 0 #2a2018; } }
    .hd-card.hd-drop { animation: hdDrop .45s cubic-bezier(.2, 1.3, .4, 1) both; }
    @keyframes hdDrop { from { transform: translateY(-110%); opacity: 0; } to { transform: none; opacity: 1; } }
    .hd-card .q-ctx { color: #6a4a1e; }
    .hd-card .q-q { margin: 0; font-size: 17px; line-height: 1.4; text-wrap: pretty; }
    .hd-card .q-ev { font-size: 12px; }
    .hd-card :is(.opt, .ghost, .row button):not(.primary) { background: #fffaf0; color: #2a2018; border: 1.5px solid #6a5a48; box-shadow: 0 2px 0 rgba(60, 40, 20, .35); }
    .hd-card .opt.on { background: #dbe6f0; border-color: #2a4360; }
    .hd-card a { color: #2a4360; }
    .hd-card .verdict-row { margin-top: 2px; }
    .hd-gap { min-height: 0; }
    /* The satchel: the answers as cards along the bottom, your confidence at the end. */
    .hd-sat { position: relative; z-index: 2; min-width: 0; min-height: 0; max-height: 48cqh; overflow-y: auto; overscroll-behavior: contain; padding: 18px 12px 0 max(12px, var(--hd-sl, 0px));
      background: linear-gradient(rgba(20, 13, 6, 0), rgba(20, 13, 6, .88) 22px), repeating-linear-gradient(0deg, rgba(0, 0, 0, .12) 0 2px, transparent 2px 6px); scrollbar-width: thin; }
    .hd-sat.empty { display: none; }
    .hd-sat .act-l { margin: 0 0 4px; color: #f0d68a; font-size: 14px; text-shadow: 0 1px 2px #000; }
    .hd-sat > p.muted { margin: 0 0 4px; color: #e6d3a6; text-shadow: 0 1px 2px #000; }
    .hd-sat .opts { margin: 4px 0 8px; gap: 8px; counter-reset: hdopt; }
    @media (min-width: 701px) { .hd-sat .opts { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); } }
    #panel .win.hd-win .hd-sat .opts .opt { position: relative; counter-increment: hdopt; padding: 9px 10px 9px 42px; font-size: 14px; line-height: 1.35; color: #f6ecd6; border: 2px solid #8a6a36; border-radius: 10px;
      background: radial-gradient(80% 60% at 50% 30%, rgba(255, 190, 90, .12), transparent 70%), linear-gradient(#30263a, #1c1620);
      box-shadow: inset 0 0 0 2px #1a1218, inset 0 0 0 3px rgba(255, 210, 130, .14), 0 3px 0 #0c0a10; }
    #panel .win.hd-win .hd-sat .opts .opt::before { content: counter(hdopt, upper-alpha); position: absolute; left: 9px; top: 9px; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%;
      font: 800 13px/1 var(--f-body); color: #2a1c08; background: radial-gradient(circle at 40% 35%, #ffe2a0, #c9a24a); box-shadow: 0 1px 0 #0c0a10; }
    #panel .win.hd-win .hd-sat .opts .opt:hover:not(:disabled) { transform: translateY(-2px); }
    #panel .win.hd-win .hd-sat .opts .opt:focus-visible { outline: 3px solid #ffd27a; outline-offset: 2px; }
    #panel .win.hd-win .hd-sat .opts .opt.on { border-color: #ffd27a; background: radial-gradient(80% 60% at 50% 30%, rgba(255, 210, 120, .34), transparent 75%), linear-gradient(#4a3a22, #251a12);
      box-shadow: inset 0 0 0 2px #1a1218, 0 0 0 2px rgba(255, 200, 90, .35), 0 0 14px rgba(255, 180, 60, .5), 0 3px 0 #0c0a10; }
    #panel .win.hd-win .hd-sat .conf { position: sticky; bottom: 0; margin: 0 -12px 0 calc(-1 * max(12px, var(--hd-sl, 0px))); padding: 8px 12px 10px max(12px, var(--hd-sl, 0px)); border-top: 1px solid rgba(255, 210, 130, .25);
      background: rgba(20, 13, 6, .96); color: #e6d3a6; }
    .hd-sat .conf > .muted { color: #e6d3a6; }
    .hd-sat .conf-b { margin-top: 4px; }
    .hd-sat .stake-help { margin: 4px 0 0; color: #c9bca4; }
    .hd-sat :is(.type-first, .say-first, .num, .order-done) { color: #efe6d2; }
    .hd-sat .q-foot { position: static; margin: 0 -12px 0 calc(-1 * max(12px, var(--hd-sl, 0px))); padding: 8px 12px 12px max(12px, var(--hd-sl, 0px)); background: rgba(20, 13, 6, .96); border-top: 1px solid rgba(255, 210, 130, .25); }
    .hd-sat .q-foot .cred-more { color: #e6d3a6; }
    .hd-sat > #q-confirm { margin: 0 0 12px; width: 100%; }
    @media (prefers-reduced-motion: reduce) {
      .hd-spr, .hd-mon.rattle .hd-jar, .hd-mon.rattle .hd-spr, .hd-mon.loose.rattle .hd-jar, .hd-card.hd-drop { animation: none !important; }
      .hd-mon.cowed .hd-spr { transition: none; }
    }
    /* phones: the card at the top, the satchel at the bottom, Bru's face and the jar in the gap between */
    @media (max-width: 700px) {
      .hd-card { margin: 8px 8px 0; }
      #panel .hd-win.hd-f .hd-card { max-height: 54cqh; }
      .hd-in { padding: 12px 12px 10px; }
      .hd-card .q-q { font-size: 15px; }
      .hd-card .q-ctx { font-size: 11px; }
      .hd-sat { padding: 16px 10px 0; }
      #panel .win.hd-win .hd-sat .opts .opt { font-size: 13.5px; padding: 8px 9px 8px 38px; }
      #panel .win.hd-win .hd-sat .opts .opt::before { left: 7px; top: 8px; width: 22px; height: 22px; font-size: 12px; }
      #panel .win.hd-win .hd-sat .conf, .hd-sat .q-foot { margin: 0 -10px; padding: 6px 10px 8px; }
      .hd-sat .conf-b button { padding-top: 6px; padding-bottom: 6px; }
      .hd-card .hn-hp.hn-inq { display: flex; margin: 0 0 6px; padding: 0; box-shadow: none; background: none; transform: none; gap: 6px; }
      .hd-card .hn-hp .hn-por { display: none; }
      .hd-card .hn-hp .hn-wk { display: none; }
      .hd-card .hn-hp .hn-hpn { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 10px; font-size: 13px; }
      .hd-jars { flex-direction: row; }
      #panel .win.hd-win .hd-sat .conf { position: static; }
      .hd-sat .stake-help { font-size: 11.5px; }
    }`;
  document.head.appendChild(css);
})();
