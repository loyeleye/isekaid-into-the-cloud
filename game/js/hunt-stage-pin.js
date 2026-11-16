// Monster Hunt's "Pin it down" step as thrown daggers (js/hunt-debrief.js staging). The claim that doesn't fit is a
// poster nailed to a wooden wall in the street; each reason is one of Bru's throwing daggers (the same buttons and
// handlers js/hunt.js draws, only dressed as blades). Commit a right reason and the dagger flies from her hand and
// thunks into the poster, pinning it (it wobbles on its nails, Bru grins); a wrong one clangs off with a spark and
// falls in the street. CSS, inline SVG and DOM only. Nothing here knows the right reason before the verdict is shown.
(function () {
  const D = SD.huntDebrief;
  if (!D || !D.stages) return;
  const esc = s => SD.ui.esc(String(s == null ? '' : s));
  const still = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const cl = (a, x, z) => Math.max(a, Math.min(z, x));

  // The dagger, pointing right: pommel, leather grip, gold guard, steel blade with a fuller.
  const DAGGER = `<svg viewBox="0 0 120 30" aria-hidden="true" focusable="false"><defs>
    <linearGradient id="hdpSteel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eef4fa"/><stop offset=".45" stop-color="#aab6c3"/><stop offset=".55" stop-color="#6c7886"/><stop offset="1" stop-color="#c9d3dd"/></linearGradient>
    <linearGradient id="hdpGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a0"/><stop offset="1" stop-color="#9a7020"/></linearGradient></defs>
    <circle cx="7" cy="15" r="6" fill="url(#hdpGold)" stroke="#3a2a10" stroke-width="1.5"/>
    <rect x="11" y="10.5" width="22" height="9" rx="2" fill="#5a3418" stroke="#2a160a" stroke-width="1.5"/>
    <path d="M15 11v8M20 11v8M25 11v8M30 11v8" stroke="#8a5a2c" stroke-width="1.6"/>
    <rect x="33" y="3" width="6" height="24" rx="2" fill="url(#hdpGold)" stroke="#3a2a10" stroke-width="1.5"/>
    <path d="M39 9.5H104L118 15L104 20.5H39Z" fill="url(#hdpSteel)" stroke="#2a3038" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="M42 15H100" stroke="#5a6470" stroke-width="1.4" stroke-linecap="round"/></svg>`;

  let st0 = null;   // the Debrief state this staging is dressing (one Pin at a time)

  D.stages.pin = {
    // The poster in the street: hidden while you choose (the real one is on the wall above the daggers), it's what
    // the dagger hits once you commit. A copy of the claim, decorative: the verdict repeats it in Bru's line.
    open({ scene, st }) {
      st0 = st;
      const jars = scene.querySelector('.hd-jars'), foe = jars && jars.querySelector('.hd-foe');
      if (!jars) return;
      const board = document.createElement('div');
      board.className = 'hdp-board'; board.setAttribute('aria-hidden', 'true');
      board.innerHTML = `<div class="hdp-paper"><b>The claim</b><span>${esc(st.m && st.m.pin && st.m.pin.opt)}</span></div><i class="hdp-dg">${DAGGER}</i><i class="hdp-spark"></i><i class="hdp-chips"><b></b><b></b><b></b><b></b></i>`;
      jars.insertBefore(board, foe || null);
    },

    render({ st, win, sat, mode }) {
      win.classList.add('hd-st-pin');
      if (mode !== 'q') return;
      const bq = sat.querySelector('blockquote.hn-opt');
      if (bq && !bq.closest('.hdp-wall')) {
        // The claim nailed to a plank wall: in the street between the question and the daggers when there's room
        // (it stays in reading order: question, claim, reasons), else at the top of the satchel.
        const wall = document.createElement('div'); wall.className = 'hdp-wall';
        bq.before(wall); wall.appendChild(bq); bq.classList.add('hdp-poster');
        const gap = win.querySelector('.hd-gap');
        if (gap && innerWidth > 700 && innerHeight >= 600 && !st.hdpCramped) { gap.appendChild(wall); win.classList.add('hdp-up'); }
      }
      // Each reason is a dagger: a blade glyph for its letter's pommel, and the picked one is drawn, glinting.
      sat.querySelectorAll('.opts .opt').forEach(b => b.classList.add('hdp-dagger'));
    },

    fit({ scene, st, win, wide, W, H, bh, bl, satTop }) {
      const jars = scene.querySelector('.hd-jars');
      const fs = parseFloat(jars && jars.style.getPropertyValue('--hd-fs')) || 160;
      const px = (el, k, v) => el.style.setProperty(k, Math.round(v) + 'px');
      px(win, '--hdp-fr', (wide ? W * .06 : 8) + fs + 16);
      if (win.classList.contains('hd-f')) {
        // The board stands over the monster, beside Bru (who stands taller for the verdict).
        const fbh = wide ? bh : cl(H * .34, H * .44, satTop - 60), fbw = fbh * 475 / 900;
        px(scene, '--hdp-bw', wide ? Math.min(300, Math.max(200, fs * 1.15)) : cl(120, W - fbw - 20, 210));
        // The verdict stamp: over the street under Bru's line on a wide screen (not on the board); on a phone her line
        // starts below the stamp's points, under the title bar.
        px(scene, '--hdp-tx', bl + fbw * .78 + 16); px(scene, '--hdp-tb', H - satTop + 28);
        const wh = win.querySelector(':scope > .win-h');
        px(scene, '--hdp-wh', !wide && wh && getComputedStyle(wh).position !== 'absolute' ? wh.offsetHeight : 0);
      } else {
        // The wall in the street: if it doesn't fit there whole, it goes back to the top of the satchel.
        const wall = win.querySelector('.hd-gap > .hdp-wall'), gap = wall && wall.parentElement;
        if (wall && gap.clientHeight && wall.offsetHeight > gap.clientHeight - 8) {
          st.hdpCramped = true; win.classList.remove('hdp-up');
          const sat = win.querySelector('.hd-sat'); sat.prepend(wall);
        }
      }
    },

    strike(ok, guess, { scene, st, bru }) {
      const board = scene.querySelector('.hdp-board'), foe = scene.querySelector('.hd-foe');
      if (!board) return false;
      const dg = board.querySelector('.hdp-dg'), spark = board.querySelector('.hdp-spark');
      scene.classList.add('hdp-on');
      board.classList.remove('hdp-hit', 'hdp-miss', 'hdp-wob', 'hdp-jolt');
      board.classList.add(ok ? 'hdp-hit' : 'hdp-miss');
      if (ok) {
        bru.react(guess ? 'smile' : 'grin', 1e9);
        bru.say(`<b>Bru:</b> ${guess ? 'Thunk. Pinned, but that was a guess. It\'ll come back to you.' : 'Thunk! Pinned. That\'s the reason.'}`);
      } else {
        bru.react('wince', 800);
        setTimeout(() => { if (st && !st.dead && st.bru) st.bru.react('frown', 1e9); }, 820);
        bru.say('<b>Bru:</b> Clang! That one bounced off. Read why.');
      }
      if (still() || !dg.animate) return true;
      // Thrown once the verdict's layout has settled: from Bru's hand to its resting place (the poster, or the street).
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (!st || st.dead || !board.isConnected) return;
        const hand = scene.querySelector('.hs-bru'), hr = hand && hand.getBoundingClientRect(), r = dg.getBoundingClientRect(), pr = board.querySelector('.hdp-paper').getBoundingClientRect();
        if (!hr || !hr.width || !r.width) return;
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const sx = hr.left + hr.width * .8 - cx, sy = hr.top + hr.height * .52 - cy;
        const T = 'translate(-50%, -50%) ';
        if (ok) {
          const fin = getComputedStyle(dg).transform;
          dg.animate([
            { transform: `${T}translate(${sx}px, ${sy}px) rotate(-700deg) scale(.7)`, opacity: .2 },
            { transform: `${T}translate(${sx * .5}px, ${sy * .5 - 50}px) rotate(-360deg) scale(.9)`, opacity: 1, offset: .5 },
            { transform: fin === 'none' ? T : fin }
          ], { duration: 460, easing: 'cubic-bezier(.45, 0, .85, .6)' }).onfinish = () => {
            if (!board.isConnected) return;
            board.classList.add('hdp-wob');
            if (foe) { foe.classList.remove('hit'); void foe.offsetWidth; foe.classList.add('hit'); }
          };
        } else {
          // It strikes the poster's edge, sparks, bounces back and falls to the street.
          const kx = pr.left + pr.width * .12 - cx, ky = pr.top + pr.height * .3 - cy;
          const fin = getComputedStyle(dg).transform;
          dg.animate([
            { transform: `${T}translate(${sx}px, ${sy}px) rotate(-700deg) scale(.7)`, opacity: .2 },
            { transform: `${T}translate(${kx}px, ${ky}px) rotate(-20deg) scale(1)`, opacity: 1, offset: .42 },
            { transform: `${T}translate(${kx - 50}px, ${ky - 46}px) rotate(-230deg)`, offset: .62 },
            { transform: fin === 'none' ? T : fin }
          ], { duration: 980, easing: 'ease-in' });
          spark.style.left = (pr.width * .12 + (pr.left - board.getBoundingClientRect().left)) + 'px';
          spark.style.top = (pr.height * .3 + (pr.top - board.getBoundingClientRect().top)) + 'px';
          setTimeout(() => {
            if (!board.isConnected) return;
            spark.classList.remove('go'); void spark.offsetWidth; spark.classList.add('go');
            board.classList.add('hdp-jolt');
            if (foe) { foe.classList.remove('lunge'); void foe.offsetWidth; foe.classList.add('hdp-laugh'); }
          }, 410);
        }
      }));
      return true;
    }
  };

  const css = document.createElement('style');
  css.textContent = `
    /* The claim: a parchment poster nailed to a plank wall */
    .hd-st-pin .hdp-wall { position: relative; margin: 2px 0 12px; padding: 12px 14px 14px; border-radius: 4px;
      background: repeating-linear-gradient(0deg, rgba(0, 0, 0, .55) 0 2px, transparent 2px 34px), repeating-linear-gradient(90deg, rgba(255, 220, 160, .04) 0 1px, transparent 1px 7px),
        linear-gradient(90deg, #4a2e18, #5e3b1e 30%, #4f321a 60%, #5a381c);
      box-shadow: inset 0 0 0 2px #24150a, inset 0 0 18px rgba(0, 0, 0, .6), 0 6px 14px rgba(0, 0, 0, .55); }
    .hd-st-pin.hdp-up .hd-gap { display: flex; align-items: center; justify-content: center; padding: 10px var(--hdp-fr, 30%) 10px var(--hd-cl, 8px); }
    .hd-st-pin.hdp-up .hd-gap > .hdp-wall { width: min(100%, 460px); margin: 0; box-sizing: border-box; transform: rotate(-1deg); }
    .hd-st-pin .hdp-wall > blockquote.hn-opt.hdp-poster { position: relative; margin: 0; padding: 22px 16px 14px; border: 0; border-radius: 2px 3px 2px 4px; transform: rotate(.8deg);
      color: #2a1c0e; font-size: 16px; line-height: 1.45; font-weight: 600; overflow-wrap: anywhere; text-shadow: none;
      background: radial-gradient(circle at 14px 12px, #d8dde2 0 2.5px, #4a4038 3px 4px, transparent 4.5px), radial-gradient(circle at calc(100% - 14px) 12px, #d8dde2 0 2.5px, #4a4038 3px 4px, transparent 4.5px),
        radial-gradient(120% 90% at 50% 40%, #f3e4bf 55%, #dcc595 100%);
      box-shadow: 0 0 0 1px rgba(90, 60, 20, .5), 2px 5px 8px rgba(0, 0, 0, .55), inset 0 0 22px rgba(120, 80, 20, .25); }
    .hd-st-pin .hdp-poster::before { content: 'The claim'; position: absolute; top: 5px; left: 0; right: 0; text-align: center; font: 800 10.5px/1 var(--f-head, serif); letter-spacing: .2em; text-transform: uppercase; color: #8a1f1f; }
    /* The scenario recap, dark to sit in the satchel */
    .hd-st-pin .hd-sat details.q-recap { background: rgba(30, 22, 14, .85); border: 1px solid #8a6a36; color: #efe6d2; }
    .hd-st-pin .hd-sat details.q-recap :is(.qr-lbl) { color: #f0d68a; }
    .hd-st-pin .hd-sat details.q-recap :is(.qr-peek, summary, .q-q) { color: #e6d3a6; }
    .hd-st-pin .hd-sat details.q-recap .q-ev { background: rgba(0, 0, 0, .35); color: #efe6d2; }
    /* The reasons: daggers. Pommel (the letter), grip, guard, then a steel blade with its point to the right. */
    #panel .win.hd-win.hd-bt.hd-st-pin .hd-sat .opts .opt.hdp-dagger { isolation: isolate; border: 0; border-radius: 0; background: none; box-shadow: none; overflow: visible;
      padding: 10px 34px 10px 52px; color: #f4f7fa; text-shadow: 0 1px 2px rgba(0, 0, 0, .8); transition: transform .15s, filter .15s; }
    #panel .win.hd-win.hd-bt.hd-st-pin .hd-sat .opts .opt.hdp-dagger::after { content: ''; position: absolute; z-index: -1; inset: -4px 0; right: 0; top: -4px; filter: none; font-size: 0;
      clip-path: polygon(6px calc(50% - 8px), 30px calc(50% - 8px), 30px 0, 39px 0, 39px 4px, calc(100% - 28px) 4px, 100% 50%, calc(100% - 28px) calc(100% - 4px), 39px calc(100% - 4px), 39px 100%, 30px 100%, 30px calc(50% + 8px), 6px calc(50% + 8px));
      background: repeating-linear-gradient(115deg, #6a4020 0 3px, #3e2410 3px 6px) 0 0 / 30px 100% no-repeat, linear-gradient(90deg, #7a5410, #ffe2a0 40%, #b8923a) 30px 0 / 9px 100% no-repeat,
        linear-gradient(rgba(255, 255, 255, .55), rgba(255, 255, 255, 0)) 39px 4px / 100% 2px no-repeat,
        linear-gradient(#5a6774, #39434f 40%, #2a323b 52%, #3a4450 64%, #56626f) 39px 0 / 100% 100% no-repeat; }
    #panel .win.hd-win.hd-bt.hd-st-pin .hd-sat .opts .opt.hdp-dagger::before { left: 0; top: calc(50% - 13px); width: 26px; height: 26px; box-shadow: 0 0 0 2px #3a2a10, 0 2px 3px rgba(0, 0, 0, .6); }
    #panel .win.hd-win.hd-bt.hd-st-pin .hd-sat .opts .opt.hdp-dagger:hover:not(:disabled) { transform: translateX(3px); filter: drop-shadow(0 0 5px rgba(200, 230, 255, .45)); }
    #panel .win.hd-win.hd-bt.hd-st-pin .hd-sat .opts .opt.hdp-dagger.on { transform: translate(6px, -2px) rotate(-.6deg); background: none; box-shadow: none;
      filter: drop-shadow(0 0 2px #fff) drop-shadow(0 0 10px rgba(255, 200, 90, .85)); }
    #panel .win.hd-win.hd-bt.hd-st-pin .hd-sat .opts .opt.hdp-dagger.on::after { background: repeating-linear-gradient(115deg, #6a4020 0 3px, #3e2410 3px 6px) 0 0 / 30px 100% no-repeat, linear-gradient(90deg, #7a5410, #ffe2a0 40%, #b8923a) 30px 0 / 9px 100% no-repeat,
        linear-gradient(100deg, transparent 30%, rgba(255, 255, 255, .25) 45%, transparent 60%) 39px 0 / 100% 100% no-repeat,
        linear-gradient(#6a5a3a, #4a3a22 40%, #3a2c18 52%, #4a3a22 64%, #6a5a3a) 39px 0 / 100% 100% no-repeat; }
    #panel .win.hd-win.hd-bt.hd-st-pin .hd-sat .opts .opt.hdp-dagger:focus-visible { outline: 3px solid #ffd27a; outline-offset: 4px; }
    #panel .win.hd-win.hd-bt.hd-st-pin .hd-sat .opts { gap: 12px; margin-top: 8px; }
    @media (min-width: 701px) { #panel .win.hd-win.hd-bt.hd-st-pin .hd-sat .opts { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); } }

    /* The monster (and the board over it) across the street, at the right: fit() sets an inline right: auto on a wide
       screen, which would leave it at the left edge, in front of Bru. */
    .hd-scene.hd-st-pin .hd-jars { left: auto !important; right: var(--hd-fx, 6%) !important; }
    .hd-scene.hd-st-pin.hd-fb.hd-wide .hd-verdict { left: var(--hdp-tx, 40%) !important; top: auto !important; bottom: var(--hdp-tb, 90px); }
    .hd-scene.hd-st-pin .hd-stamp .hn-pts { padding: 2px 10px; border: 2px solid #f0d68a; border-radius: 14px; background: rgba(10, 8, 6, .72); color: #f0d68a; font-weight: 800; text-shadow: none; opacity: 1; }
    /* The poster in the street, over the monster: shown once you've thrown */
    .hd-st-pin .hdp-board { display: none; position: relative; width: var(--hdp-bw, 240px); margin: 0 0 8px; transform-origin: 50% 0; }
    .hd-st-pin.hdp-on.hd-fb .hdp-board { display: block; }
    .hd-st-pin.hd-quiet .hdp-board { visibility: hidden; }
    .hd-st-pin .hdp-paper { display: grid; gap: 4px; padding: 20px 12px 12px; border-radius: 2px; color: #2a1c0e; text-align: center; font: 600 13px/1.35 var(--f-body, sans-serif); transform: rotate(-2deg);
      background: radial-gradient(circle at 50% 9px, #d8dde2 0 2.5px, #4a4038 3px 4px, transparent 4.5px), radial-gradient(120% 90% at 50% 40%, #f3e4bf 55%, #d6bd8a 100%);
      box-shadow: 0 0 0 1px rgba(90, 60, 20, .5), 3px 7px 10px rgba(0, 0, 0, .6), inset 0 0 18px rgba(120, 80, 20, .3); }
    .hd-st-pin .hdp-paper b { font: 800 10px/1 var(--f-head, serif); letter-spacing: .2em; text-transform: uppercase; color: #8a1f1f; }
    .hd-st-pin .hdp-paper span { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; overflow: hidden; }
    .hd-st-pin .hdp-board.hdp-wob { animation: hdpWob .9s cubic-bezier(.3, .7, .4, 1); }
    @keyframes hdpWob { 15% { transform: rotate(5deg); } 35% { transform: rotate(-3.5deg); } 55% { transform: rotate(2deg); } 75% { transform: rotate(-1deg); } }
    .hd-st-pin .hdp-board.hdp-jolt .hdp-paper { animation: hdpJolt .3s ease-out; }
    @keyframes hdpJolt { 30% { transform: rotate(-2deg) translateX(5px); } 60% { transform: rotate(-2deg) translateX(-2px); } }
    /* The dagger: in the poster (right), or lying in the street below it (wrong) */
    .hd-st-pin .hdp-dg { position: absolute; display: none; width: clamp(64px, calc(var(--hdp-bw, 240px) * .42), 104px); aspect-ratio: 4 / 1; pointer-events: none; filter: drop-shadow(0 3px 3px rgba(0, 0, 0, .6)); }
    .hd-st-pin .hdp-dg svg { display: block; width: 100%; height: 100%; }
    .hd-st-pin .hdp-hit .hdp-dg { display: block; left: 38%; top: 54%; transform: translate(-50%, -50%) rotate(-14deg); z-index: 2; }
    .hd-st-pin .hdp-hit .hdp-dg::after { content: ''; position: absolute; right: 4%; top: 50%; width: 10px; height: 10px; margin: -5px; border-radius: 50%; background: radial-gradient(rgba(60, 30, 10, .55), transparent 70%); }
    .hd-st-pin .hdp-miss .hdp-dg { display: block; left: 30%; top: calc(100% + var(--hd-fs, 140px) - 2px); transform: translate(-50%, -50%) rotate(172deg); opacity: .9; z-index: 4; }
    .hd-st-pin .hdp-wob .hdp-dg { animation: hdpQuiver .45s ease-out; }
    @keyframes hdpQuiver { 0% { transform: translate(-50%, -50%) rotate(-14deg); } 20% { transform: translate(-50%, -50%) rotate(-19deg); } 45% { transform: translate(-50%, -50%) rotate(-10deg); } 70% { transform: translate(-50%, -50%) rotate(-16deg); } 100% { transform: translate(-50%, -50%) rotate(-14deg); } }
    .hd-st-pin .hdp-chips { position: absolute; left: 50%; top: 54%; pointer-events: none; }
    .hd-st-pin .hdp-chips b { position: absolute; width: 5px; height: 3px; background: #c9a46a; opacity: 0; }
    .hd-st-pin .hdp-wob .hdp-chips b { animation: hdpChip .5s ease-out both; }
    .hd-st-pin .hdp-wob .hdp-chips b:nth-child(1) { --cx: 22px; --cy: -18px; } .hd-st-pin .hdp-wob .hdp-chips b:nth-child(2) { --cx: 28px; --cy: 6px; }
    .hd-st-pin .hdp-wob .hdp-chips b:nth-child(3) { --cx: -16px; --cy: -22px; } .hd-st-pin .hdp-wob .hdp-chips b:nth-child(4) { --cx: 12px; --cy: 20px; }
    @keyframes hdpChip { 0% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translate(var(--cx), var(--cy)) rotate(200deg); } }
    .hd-st-pin .hdp-spark { position: absolute; z-index: 5; width: 54px; height: 54px; margin: -27px; border-radius: 50%; pointer-events: none; opacity: 0;
      background: radial-gradient(#fff 0 8%, #fff6b0 14%, rgba(255, 190, 60, .8) 28%, rgba(255, 120, 30, 0) 60%),
        conic-gradient(from 10deg, transparent 0 8%, #fff8c0 9% 11%, transparent 12% 33%, #fff8c0 34% 36%, transparent 37% 58%, #fff8c0 59% 61%, transparent 62% 83%, #fff8c0 84% 86%, transparent 87%); }
    .hd-st-pin .hdp-spark.go { animation: hdpSpark .45s ease-out; }
    @keyframes hdpSpark { 0% { opacity: 1; transform: scale(.3) rotate(0); } 40% { opacity: 1; } 100% { opacity: 0; transform: scale(1.5) rotate(40deg); } }
    .hd-st-pin .hd-foe.hdp-laugh .hd-spr { animation: hdpLaugh .5s ease-in-out 2, hdSquare 1.8s ease-in-out 1s infinite; }
    @keyframes hdpLaugh { 30% { transform: translateY(-10px) rotate(-4deg); } 60% { transform: translateY(0) rotate(3deg); } }
    /* The board stacks over the monster on a phone too */
    @media (max-width: 700px) { .hd-scene.hd-st-pin .hd-jars { flex-direction: column; align-items: flex-end; }
      #panel .win.hd-win.hd-bt.hd-st-pin .hd-sat .opts .opt.hdp-dagger { padding: 9px 32px 9px 50px; }
      .hd-st-pin .hdp-wall { padding: 10px 10px 12px; } .hd-st-pin .hdp-wall > blockquote.hn-opt.hdp-poster { font-size: 15px; padding: 21px 12px 12px; } }
    @media (prefers-reduced-motion: reduce) {
      .hd-st-pin .hdp-board, .hd-st-pin .hdp-paper, .hd-st-pin .hdp-dg, .hd-st-pin .hdp-chips b, .hd-st-pin .hdp-spark, .hd-st-pin .hd-foe.hdp-laugh .hd-spr { animation: none !important; }
      #panel .win.hd-win.hd-bt.hd-st-pin .hd-sat .opts .opt.hdp-dagger { transition: none; }
    }`;
  document.head.appendChild(css);
})();
