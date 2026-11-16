// Monster Hunt's boards on screen (rules: js/hunt-core.js on js/aws-sim.js; design: project files
// game-modes/monster-hunt/real-game-design.md). Plan, then run:
//   Plan    the board's tiles stand top to bottom (callers, IAM door, API gate, queue, function, table), with the
//           monster on the tile it breaks. Tap a card in your hand to place it on its tile, tap it again to take it
//           back. Coins cap what you can place. A card AWS won't take here says why the first time you tap it.
//   Run     Deploy plays 16 turns with no input. Everything shows on the tiles (L9): marbles in the gate's bucket and
//           a 429 stamp, crates in the queue with the bad order's receive count chalked on its tag, the dead-letter
//           jar, the function's stools, a lantern per table partition, the door's seal, and the Uptime lamp's oil.
//           Bru says one line the first time each thing happens (SD.huntCore.TEACH, once per save).
//   After   what each monster did, then what every card you placed really does. Caught: stars against par. Not caught:
//           re-plan with the oil that's left, up to the board's deploys, or it escapes.
// API: SD.huntBoard.play(boardId, { seed, state, onSave, title, ctx, debrief }) → Promise { won, stars, deploy,
//      placed, fix }   ·   SD.huntBoard.yard()   Bru's yard: every board, to practise outside the hunt.
(function () {
  if (!SD.huntCore || !SD.awsSim) return;
  const HC = SD.huntCore, C = HC.CARDS, U = SD.ui, S = SD.state;
  const B = SD.huntBoard = {};
  const esc = s => U.esc(String(s == null ? '' : s));
  const sv = () => S.save;
  const taught = () => (sv().huntTaught = sv().huntTaught || {});
  const yardRec = () => (sv().huntYard = sv().huntYard || {});
  const sfx = n => { try { if (SD.audio && SD.audio.sfx) SD.audio.sfx(n); } catch (e) { /* no sound */ } };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const TILE = { callers: 'Callers', door: 'IAM door', gate: 'API gate', queue: 'Queue', fn: 'Function', table: 'Table' };
  const TILE_IC = { callers: '👥', door: '🚪', gate: '⛩️', queue: '📬', fn: 'λ', table: '🗄️' };
  const MON_IC = { poison: '☠️', gate: '🗿', hydra: '🐉', warden: '🛡️' };
  B.STEP_MS = 420;
  // The monsters' sprites (PixelLab, night-horror style to match the hunt card's mimic video: tools/hunt_art.py), and
  // the events that are each one acting, so its sprite lunges on the turn it does harm.
  const SPRITE = m => `assets/img/hunt/${m}.webp`;
  const ACTS = { poison: ['fail', 'dupe', 'lost'], gate: ['throttled', 'gaveUp'], hydra: ['wthrottle', 'wgaveUp'], warden: ['denied', 'leak'] };
  const sprite = (m, cls) => `<img class="hb-spr${cls ? ' ' + cls : ''}" src="${SPRITE(m)}" alt="" aria-hidden="true" width="56" height="56" decoding="async">`;

  // A card's drawn icon (tools/hunt_art.py card-<id>), over its tile's emoji: the emoji shows until the icon loads,
  // and stays if the icon is missing.
  const cardIcon = (id, cls) => `<span class="hb-ic${cls ? ' ' + cls : ''}" aria-hidden="true"><span class="hb-icf">${TILE_IC[C[id].tile]}</span><img src="assets/img/hunt/card-${esc(id)}.webp" alt="" aria-hidden="true" width="64" height="64" decoding="async" onload="this.parentNode.classList.add('img')" onerror="this.remove()"></span>`;

  // ---- Drawing one tile: a place on the night street ----
  // Each tile is a 128 px pixel-art place (assets/img/hunt/place-<tile>.webp, tools/hunt_art.py) with the board's
  // monster standing in it, and the live state drawn as things in the scene: crates on the cart, marbles in the gate's
  // bucket, the function's stools, the table's heads, the door's seal, the dead-letter jar. A missing picture falls
  // back to the tile's emoji. fx (the run only, see runFx): what moved this turn, so crates travel the road between
  // places and harm pops up where it happened.
  const PLACE = t => `assets/img/hunt/place-${t}.webp`;
  const rep = (n, f) => Array.from({ length: Math.max(0, n | 0) }, (_, k) => f(k)).join('');
  const crate = cls => `<i class="hb-cr${cls ? ' ' + cls : ''}"></i>`;
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  function tileHtml(b, tile, st, f, spec, fx) {
    const mon = b.mons.find(m => HC.MONSTERS[m].tile === tile);
    const here = st.placed.filter(id => C[id].tile === tile);
    const chips = here.map(id => `<button class="hb-chip" data-un="${esc(id)}" aria-label="Take back ${esc(C[id].name)}">${esc(C[id].name)} <span aria-hidden="true">✕</span></button>`).join('');
    const nOf = type => (f ? f.evs.filter(e => e.type === type).length : 0);
    let live = '', sign = '';
    const cfg = spec.cfg;
    if (tile === 'callers') {
      const wait = f ? f.pendingRetries : 0, come = f ? Math.min(fx ? fx.arr : 0, 6) : 3;
      live = `<span class="hb-folk" role="img" aria-label="${f ? (wait ? `${wait} waiting to retry` : 'No one waiting to retry') : 'Callers send requests each turn'}">${rep(come, () => '<i></i>')}${rep(Math.min(wait, 8), () => '<i class="wait"></i>')}</span>${wait ? `<b class="hb-n" aria-hidden="true">↻ ${wait}</b>` : ''}`;
      sign = f ? (wait ? 'retrying' : '') : 'send requests';
    }
    if (tile === 'gate' && cfg.gate) {
      const tokens = f ? f.tokens : cfg.gate.burst;
      live = `<span class="hb-bucket" role="img" aria-label="Bucket: ${tokens} of ${cfg.gate.burst} tokens, refills ${cfg.gate.rate} a turn">${rep(cfg.gate.burst, k => `<i class="${k < tokens ? 'on' : ''}"></i>`)}</span><b class="hb-n" aria-hidden="true">${tokens}/${cfg.gate.burst}</b>${f && f.bounced ? `<span class="hb-stamp">429 × ${f.bounced}</span>` : ''}`;
      sign = `+${cfg.gate.rate} a turn`;
    }
    if (tile === 'door' && cfg.door) {
      const v = f ? f.door : SD.awsSim.iamEval(cfg.door).why;
      const seal = { allow: ['ok', 'ALLOW', 'Allow'], deny: ['red', 'DENY', 'Explicit deny'], implicit: ['grey', 'NO ALLOW', 'No allow'], trust: ['grey', 'NOT YOU', 'Trust policy: not you'] }[v] || ['grey', '?', 'Unknown'];
      live = `<span class="hb-seal hb-${seal[0]}" role="img" aria-label="Door seal: ${seal[2]}"><span aria-hidden="true">${seal[1]}</span></span>${nOf('leak') ? '<span class="hb-stamp">DELETED!</span>' : ''}`;
    }
    if (tile === 'queue' && cfg.queue) {
      const n = f ? f.queue : 0, recv = f ? f.poisonRecv : 0, inQ = f ? f.poisonIn : false, jar = f ? f.jar : 0;
      const bad = b.mons.includes('poison') && inQ;
      const good = Math.max(0, n - (bad ? 1 : 0)), show = Math.min(good, 14);
      const out = Math.min(f ? Math.max(0, f.hidden - (bad ? 1 : 0)) : 0, show);   // received, so hidden until the visibility timeout
      const pile = (bad ? crate('bad' + (nOf('fail') ? ' hit' : '')) : '') + rep(show, k => crate(k >= show - out ? 'out' : ''));
      const tag = b.mons.includes('poison') && (inQ || recv) ? `<span class="hb-tag${inQ ? '' : ' gone'}" role="img" aria-label="Bad order: received ${plural(recv, 'time')}"><span aria-hidden="true">☠</span><b class="hb-chalk" aria-hidden="true">${'|'.repeat(recv) || '·'}</b></span>` : '';
      const dlqOn = st.placed.includes('dlq') || st.placed.includes('dlqfifo');
      live = `<span class="hb-crates" role="img" aria-label="${plural(n, 'message')} in the queue${out ? `, ${out} out being handled` : ''}">${pile}</span><b class="hb-n" aria-hidden="true">${n}${out ? ` · ${out} out` : ''}</b>${tag}${dlqOn ? `<span class="hb-jar${jar ? ' full' : ''}" role="img" aria-label="Dead-letter jar: ${plural(jar, 'message')}"><b class="hb-lid" aria-hidden="true"></b>${rep(Math.min(jar, 3), () => crate('bad'))}${nOf('dlq') ? crate('bad hb-fly') : ''}<b class="hb-jn" aria-hidden="true">${jar}</b></span>` : ''}`;
      sign = cfg.queue.fifo ? 'FIFO' : 'Standard';
    }
    if (tile === 'fn') {
      const busy = f ? f.busy : 0, stools = f ? f.stools : cfg.fn.stools, shown = Math.min(stools, 20);
      live = `<span class="hb-stools${shown > 10 ? ' two' : ''}" role="img" aria-label="Function: ${f ? `${busy} of ${stools} stools busy` : `${stools} stools, so ${stools} at once`}">${rep(shown, k => `<i class="${k < busy ? 'busy' : ''}"></i>`)}</span>${stools > 20 ? `<b class="hb-n">+${stools - 20}</b>` : ''}${nOf('dupe') ? '<span class="hb-stamp">TWICE!</span>' : ''}${nOf('fail') ? '<span class="hb-stamp">FAILED</span>' : ''}`;
      sign = `${f ? `${busy} of ${stools} busy` : `${stools} at once`}${cfg.fn.work > 1 ? ` · ${cfg.fn.work * 15} s each` : ''}`;
    }
    if (tile === 'table' && cfg.table) {
      const load = f && f.load ? f.load : Array.from({ length: cfg.table.parts }, () => 0), cap = cfg.table.cap;
      live = `<span class="hb-heads">${load.map((n, k) => `<span class="hb-head${n > cap ? ' hot' : ''}" role="img" aria-label="Partition ${k + 1}: ${n} writes, cap ${cap}"><i style="--fill:${Math.min(1, n / Math.max(1, cap))}"></i><small aria-hidden="true">P${k + 1} <b>${n}/${cap}</b></small></span>`).join('')}</span>${nOf('wthrottle') ? `<span class="hb-stamp">THROTTLED × ${nOf('wthrottle')}</span>` : ''}`;
      sign = `cap ${cap} a turn`;
    }
    const acting = mon && f && f.evs.some(e => ACTS[mon].includes(e.type));
    const pops = fx && fx.pops[tile] ? fx.pops[tile].map((p, k) => `<span class="hb-pop${p[1] ? ' ' + p[1] : ''}" style="--k:${k}">${esc(p[0])}</span>`).join('') : '';
    // A spot on the street (see SPOT): the monster stands on the cobbles, the live state floats over the place, the
    // items you placed hang there (tap one to take it back), and harm pops up above it.
    const items = here.map(id => `<button class="hb-chip hs-item" data-un="${esc(id)}" aria-label="Take back ${esc(C[id].name)}">${cardIcon(id)}<span class="hs-in">${esc(C[id].name)} <span aria-hidden="true">✕</span></span></button>`).join('');
    const [x, y] = SPOT[tile];
    return `<div class="hb-tile hb-place hs-spot${mon ? ' hb-mon' : ''}" data-tile="${tile}" style="--x:${x}%;--y:${y}%">
      ${mon ? `<span class="hs-mon">${sprite(mon, 'hb-stand' + (acting ? ' hb-bite' : ''))}</span>` : ''}
      <div class="hs-info"><span class="hb-tn"><b>${TILE[tile]}</b>${sign ? `<span class="hb-sign">${esc(sign)}</span>` : ''}${mon ? `<span class="hb-monb">${esc(HC.MONSTERS[mon].name)}</span>` : ''}</span>
      <span class="hb-live">${live}</span>${pops ? `<span class="hb-pops" aria-hidden="true">${pops}</span>` : ''}</div>
      ${items ? `<span class="hb-chips hs-items">${items}</span>` : ''}</div>`;
  }
  const lampHtml = (oil, lamp, drop) => `<span class="hb-lamp" role="img" aria-label="Uptime lamp: ${oil} of ${lamp} oil">${Array.from({ length: lamp }, (_, k) => `<i class="${k < oil ? 'on' : k < oil + (drop | 0) ? 'drip' : ''}"></i>`).join('')}</span>`;
  // The road between two places, with this turn's crates travelling it (and bounced ones coming back up).
  // ---- The street (Ladi, Nov 16: "draw full sized characters in the setting... living, breathing, blinking and
  // reacting to you"; "It's still box heavy rather than showing things live in a scene") ----
  // One painted night street (assets/img/hunt/street.webp) with a spot for each kind of tile, left to right. A board
  // lights the spots it uses; the rest stay dark. Crates roll along the cobbles between lit spots during a run.
  // SPOT: x and y (the spot's foot) as % of the street picture.
  const SPOT = { callers: [10, 66], gate: [29, 66], queue: [44, 66], fn: [60, 66], table: [76, 64], door: [91, 64] };
  const STREET = 'assets/img/hunt/street.webp';
  const ROAD_Y = 84;
  const roadHtml = (b, fx) => {
    if (!fx) return '';
    return b.tiles.slice(0, -1).map((t, i) => {
      const a = SPOT[t][0], z = SPOT[b.tiles[i + 1]][0];
      return rep(Math.min(fx.roads[i] | 0, 4), k => `<i class="hs-mv" style="--a:${a}%;--b:${z}%;--k:${k}"></i>`) +
        rep(Math.min(fx.back[i] | 0, 4), k => `<i class="hs-mv back" style="--a:${z}%;--b:${a}%;--k:${k}"></i>`);
    }).join('');
  };
  const boardHtml = (b, st, f, spec, fx) => Object.keys(SPOT).filter(t => !b.tiles.includes(t)).map(t => `<span class="hs-dark" style="--x:${SPOT[t][0]}%" aria-hidden="true"></span>`).join('') +
    `<div class="hb-row hs-row" role="list" aria-label="The board: ${b.tiles.map(t => TILE[t]).join(', then ')}">${b.tiles.map(t => tileHtml(b, t, st, f, spec, fx)).join('')}</div><div class="hs-road" aria-hidden="true">${roadHtml(b, fx)}</div>`;

  // ---- Bru, full size in the street ----
  // Drawn from Ladi's character sheet in three poses (assets/img/hunt/bru/body-<pose>.webp), each with a face on top
  // that changes (face-<pose>-<mood>.webp, laid over the body at POSE[pose].at, in % of the body). She breathes (CSS),
  // blinks every few seconds, moves her mouth while a new line comes up, and reacts: smile when you place an item,
  // frown at a refusal or an escape, wince when the lamp burns oil, grin at a catch. And she turns: to you while she
  // talks you through the plan and the results, to the monster (side) while the run plays.
  const POSE = {
    front: { at: [43.29, 9.79, 24.92, 12.15], faces: ['neutral', 'blink', 'talk', 'smile', 'wince', 'frown', 'grin'] },
    three: { at: [38.5, 10.3, 25.08, 11.73], faces: ['neutral', 'blink', 'talk', 'smile', 'wince', 'frown', 'grin'] },
    side: { at: [50.32, 10.21, 18.21, 11.22], faces: ['neutral', 'blink', 'talk', 'smile', 'wince', 'frown', 'grin'] },
  };
  const BODY = p => `assets/img/hunt/bru/body-${p}.webp`;
  const FACE = (p, m) => `assets/img/hunt/bru/face-${p}-${m}.webp`;
  Object.keys(POSE).forEach(p => [BODY(p), ...POSE[p].faces.map(m => FACE(p, m))].forEach(u => { const i = new Image(); i.src = u; }));
  const still = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  function bruOn(root) {
    const el = root.querySelector('.hs-bru'), fig = el.querySelector('.hs-fig'), bod = el.querySelector('.hs-body'), face = el.querySelector('.hs-face'), say = root.querySelector('.hs-say');
    const o = { mood: 'neutral', until: 0, flap: 0, line: null, home: 'three', pose: 'three' };
    // A mood her current pose has no face for turns her to the three-quarter view for it.
    const poseFor = m => (POSE[o.home].faces.includes(m) ? o.home : 'three');
    const place = p => { const a = POSE[p].at; face.style.cssText = `left:${a[0]}%;top:${a[1]}%;width:${a[2]}%;height:${a[3]}%`; };
    const show = m => {
      const p = poseFor(m), k = p + ':' + m;
      if (p !== o.pose) {
        o.pose = p; bod.src = BODY(p); place(p); el.dataset.pose = p;
        if (!still()) { fig.classList.remove('turn'); void fig.offsetWidth; fig.classList.add('turn'); }
      }
      if (face.dataset.k !== k) { face.dataset.k = k; face.src = FACE(p, m); }
      el.dataset.mood = m;
    };
    const base = () => (Date.now() < o.until ? o.mood : 'neutral');
    o.react = (m, ms) => { o.mood = m; o.until = Date.now() + (ms || 1400); show(m); };
    o.turn = p => { o.home = p; show(base()); };
    place('three');
    o.say = (html) => {
      if (html === o.line) return;
      o.line = html; say.innerHTML = html || ''; say.hidden = !html;
      if (!html || still()) return;
      let n = 0; clearInterval(o.flap);
      o.flap = setInterval(() => { if (!el.isConnected || ++n > 8) { clearInterval(o.flap); show(base()); return; } if (base() === 'neutral') show(n % 2 ? 'talk' : 'neutral'); }, 150);
    };
    const blink = () => {
      if (!el.isConnected) return;
      const m = base();
      if (m === 'neutral' || m === 'smile') { show('blink'); setTimeout(() => el.isConnected && show(base()), 130); }
      setTimeout(blink, 2200 + Math.random() * 3600);
    };
    const tick = () => { if (!el.isConnected) return; if (Date.now() >= o.until && el.dataset.mood !== 'neutral' && el.dataset.mood !== 'talk' && el.dataset.mood !== 'blink') show('neutral'); setTimeout(tick, 250); };
    setTimeout(blink, 1500); tick();
    return o;
  }
  const bruHtml = () => `<div class="hs-bru" aria-hidden="true" data-pose="three"><div class="hs-fig"><img class="hs-body" src="${BODY('three')}" alt=""><img class="hs-face" src="${FACE('three', 'neutral')}" data-k="three:neutral" alt=""></div></div>`;
  // For the hunt's other screens in the same street (the bounty board, the Debrief): Bru's markup, and bruOn(root)
  // on a root that holds .hs-bru and a .hs-say bubble ({ react(mood, ms), say(html), turn('front'|'three'|'side') }).
  B.bruHtml = bruHtml; B.bruOn = bruOn; B.STREET = STREET; B.SPOT = SPOT;
  // The scene: the HUD on top, the street (it scrolls sideways on a narrow screen), Bru in front at the left, and
  // the satchel along the bottom. Opened once per board and updated in place, so Bru keeps breathing between turns.
  function sceneOpen(b, opts) {
    const root0 = document.querySelector('#panel .hs');
    if (root0 && root0.dataset.board === b.id && B._scene && B._scene.root === root0) return B._scene;
    const body = U.panel(`<div class="hb hs" data-board="${esc(b.id)}">
        <div class="hs-hud"></div>
        <div class="hs-view"><div class="hs-street"><img class="hs-bg" src="${STREET}" alt="" aria-hidden="true" decoding="async"><div class="hs-layer"></div></div></div>
        ${bruHtml()}
        <p class="hs-say hb-bru hb-say" aria-live="polite" hidden></p>
        <div class="hs-cut"></div>
        <div class="hs-sat"></div></div>`,
      { title: opts.title || 'MONSTER HUNT', noClose: true, cls: 'hn-simwin hs-win' });
    const root = body.querySelector('.hs');
    const sc = B._scene = { root, body, hud: root.querySelector('.hs-hud'), view: root.querySelector('.hs-view'), layer: root.querySelector('.hs-layer'), sat: root.querySelector('.hs-sat'), cut: root.querySelector('.hs-cut') };
    sc.bru = bruOn(root);
    // Room for Bru on a wide screen: the street starts at her shoulder, so she stands in front of it, not on a spot.
    const fit = () => { if (!root.isConnected) return ro.disconnect(); const wide = innerWidth > 700, w = root.querySelector('.hs-bru').getBoundingClientRect().width; root.style.setProperty('--bw', wide ? Math.round(w * .62) + 'px' : '0px'); root.style.setProperty('--bruw', Math.round(w) + 'px'); };
    const ro = new ResizeObserver(fit); ro.observe(root); fit();
    // On a narrow screen, start with the monster's spot in view.
    const m = b.mons.map(x => HC.MONSTERS[x].tile).find(t => SPOT[t]) || b.tiles[0];
    requestAnimationFrame(() => { const v = sc.view, w = v.scrollWidth; if (w > v.clientWidth) v.scrollLeft = Math.max(0, w * SPOT[m][0] / 100 - v.clientWidth * .55); });
    return sc;
  }
  // The board as a night street: places joined by a cobbled road, the live state as things in each place.
  const sceneCss = document.createElement('style');
  sceneCss.textContent = `
    .hb-row { list-style: none; margin: 4px 0; padding: 10px 8px; display: grid; gap: 0; border-radius: 12px;
      background: radial-gradient(2px 2px at 12% 8%, #fff8 50%, transparent 51%), radial-gradient(1.5px 1.5px at 78% 4%, #fff6 50%, transparent 51%),
        radial-gradient(1.5px 1.5px at 55% 12%, #fff5 50%, transparent 51%), radial-gradient(120% 60% at 20% 0%, #2a2244 0%, #121020 55%, #08070d 100%);
      box-shadow: inset 0 0 0 2px #0c0a10, inset 0 0 40px rgba(0, 0, 0, .8); }
    .hb-place { position: relative; display: grid; gap: 4px; color: #efe6d2; }
    .hb-place .muted { color: #b7a98f; }
    .hb-scn { position: relative; display: grid; grid-template-columns: 128px minmax(0, 1fr); grid-template-rows: auto 1fr; column-gap: 10px; min-height: 128px;
      border-radius: 10px; overflow: hidden;
      background: linear-gradient(to top, rgba(0, 0, 0, .55) 0 16px, transparent 16px),
        repeating-linear-gradient(90deg, #2a2230 0 13px, #1c1720 13px 15px) bottom / 100% 16px no-repeat,
        radial-gradient(70% 90% at 0% 100%, rgba(255, 170, 70, .16), transparent 70%), linear-gradient(#100d1c, #1e1828);
      box-shadow: inset 0 0 0 2px #2c2236, 0 2px 0 #050408; }
    .hb-place.hb-mon .hb-scn { background: linear-gradient(to top, rgba(0, 0, 0, .55) 0 16px, transparent 16px),
        repeating-linear-gradient(90deg, #2e2026 0 13px, #1e1418 13px 15px) bottom / 100% 16px no-repeat,
        radial-gradient(60% 100% at 40% 100%, rgba(255, 70, 40, .22), transparent 70%), linear-gradient(#170c14, #2a1820);
      box-shadow: inset 0 0 0 2px #6a2420, 0 2px 0 #050408; }
    .hb-pic { grid-row: 1 / span 2; position: relative; width: 128px; height: 128px; }
    .hb-pic img { display: block; width: 128px; height: 128px; image-rendering: pixelated; -webkit-mask-image: linear-gradient(90deg, #000 80%, transparent); mask-image: linear-gradient(90deg, #000 80%, transparent); }
    .hb-emo { display: none; }
    .hb-pic.noimg { display: grid; place-items: center; margin: 6px; width: 116px; height: 116px; border: 2px solid #5a4630; border-radius: 8px; background: linear-gradient(#2a2230, #1d1822); }
    .hb-pic.noimg .hb-emo { display: block; font-size: 44px; line-height: 1; }
    .hb-spr.hb-stand { position: absolute; left: 76px; bottom: 4px; width: 64px; height: 64px; z-index: 2; transform: none; filter: drop-shadow(0 0 6px rgba(255, 90, 50, .6)); }
    .hb-spr.hb-stand.hb-bite { animation: hbLunge .36s ease-out; filter: drop-shadow(0 0 10px rgba(255, 50, 30, 1)); }
    @keyframes hbLunge { 0% { transform: none; } 40% { transform: translateX(8px) scale(1.18) rotate(-5deg); } 100% { transform: none; } }
    .hb-place.hb-mon .hb-tn, .hb-place.hb-mon .hb-live { padding-left: 14px; }
    .hb-tn { grid-column: 2; display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 6px; padding: 7px 6px 0 0; font-size: 12px; line-height: 1.25; }
    .hb-tn > b { font: 800 11px/1.2 var(--f-head); letter-spacing: .08em; text-transform: uppercase; padding: 2px 6px; border: 1px solid #c9a24a; border-radius: 3px; background: #3a2c14; color: #ffe2a0; box-shadow: 0 2px 0 #120c06; }
    .hb-sign { color: #c9bca4; font-size: 12px; }
    .hb-monb { flex-basis: 100%; color: #ff9a7a; font-weight: 800; font-size: 12px; }
    .hb-live { grid-column: 2; align-self: end; display: flex; flex-wrap: wrap; align-items: flex-end; gap: 4px 8px; padding: 4px 6px 6px 0; min-height: 30px; }
    .hb-n { font: 800 12px/1 var(--f-body); color: #ffe2a0; padding: 2px 5px; border-radius: 4px; background: rgba(0, 0, 0, .55); }
    .hb-chips { display: flex; flex-wrap: wrap; gap: 4px; padding: 0 2px 2px; }
    .hb-chip { font: 700 12px var(--f-body); padding: 3px 8px; border: 2px solid #c9a24a; border-radius: 999px; background: #3a2c14; color: #ffe2a0; cursor: pointer; }
    .hb-live .hb-stamp { animation: hbSlam .3s ease-out both; }
    @keyframes hbSlam { from { opacity: 0; transform: scale(1.9) rotate(-12deg); } to { opacity: 1; transform: rotate(-5deg); } }
    .hb-stamp { font: 800 12px/1 var(--f-head); letter-spacing: .06em; padding: 3px 6px; border: 2px solid #ff5a46; color: #ff5a46; transform: rotate(-5deg); background: #2a0f0f; box-shadow: 0 0 10px rgba(255, 60, 40, .45); }
    /* Callers: hooded townsfolk with lanterns. Grey ones are waiting to retry. */
    .hb-folk { display: inline-flex; align-items: flex-end; gap: 3px; flex-wrap: wrap; max-width: 150px; }
    .hb-folk i { position: relative; width: 13px; height: 24px; border-radius: 6px 6px 2px 2px; background: linear-gradient(#5a4a72, #3a2e4c); box-shadow: inset 0 3px 0 #241c30; }
    .hb-folk i::after { content: ''; position: absolute; right: -3px; bottom: 5px; width: 4px; height: 5px; border-radius: 2px; background: #ffc24a; box-shadow: 0 0 5px #ffa02a; }
    .hb-folk i.wait { background: linear-gradient(#5a5560, #3a3640); animation: hbPace 1.2s ease-in-out infinite alternate; }
    .hb-folk i.wait::after { background: #8a8070; box-shadow: none; }
    @keyframes hbPace { from { transform: translateX(-2px); } to { transform: translateX(2px); } }
    /* The gate's bucket of marbles: one per token. */
    .hb-bucket { position: relative; display: inline-flex; flex-wrap: wrap-reverse; gap: 2px; max-width: 100px; margin-top: 14px; padding: 5px 7px 6px; border: 3px solid #8a6a3a; border-top: 0; border-radius: 0 0 12px 12px; background: linear-gradient(#4a3418, #2a1c0c); }
    .hb-bucket::before { content: ''; position: absolute; left: -3px; right: -3px; top: -12px; height: 16px; border: 2px solid #b8923a; border-bottom: 0; border-radius: 50% 50% 0 0; }
    .hb-bucket i { width: 16px; height: 16px; border-radius: 50%; border: 1px solid #5a6a80; background: rgba(0, 0, 0, .4); }
    .hb-bucket i.on { border-color: #bfe0ff; background: radial-gradient(circle at 35% 35%, #e8f6ff, #4aa0f0 60%, #2a5a9a); box-shadow: 0 0 6px #4ab0ff; }
    /* The queue: crates on the cart (faded ones are out being handled), the bad one, its tag, the dead-letter jar. */
    .hb-crates { display: inline-flex; flex-wrap: wrap-reverse; gap: 1px; max-width: 96px; align-items: flex-end; }
    .hb-cr { display: inline-block; width: 18px; height: 16px; box-sizing: border-box; border: 2px solid #5a3e1c; border-radius: 2px; background: linear-gradient(45deg, transparent 45%, #9a6a30 45% 55%, transparent 55%), #e2b878; }
    .hb-cr.out { opacity: .3; border-style: dashed; }
    .hb-cr.bad { border-color: #3a0808; background: linear-gradient(45deg, transparent 45%, #3a0808 45% 55%, transparent 55%), #c0392b; box-shadow: 0 0 6px rgba(255, 60, 40, .6); }
    .hb-cr.hit { animation: hbHit .42s ease-out; }
    @keyframes hbHit { 0%, 100% { box-shadow: 0 0 6px rgba(255, 60, 40, .6); } 40% { box-shadow: 0 0 16px 4px #ff3a1e; transform: scale(1.35) rotate(8deg); } }
    .hb-tag { display: inline-flex; gap: 4px; align-items: center; font-size: 12px; padding: 2px 6px; border-radius: 3px; background: #1c1e1c; color: #f2f2ea; border: 1px solid #6a6a60; transform: rotate(3deg); }
    .hb-tag.gone { opacity: .45; text-decoration: line-through; }
    .hb-chalk { font: 700 13px var(--f-head); letter-spacing: .18em; color: #fff; text-shadow: 0 0 2px #fff8; }
    .hb-jar { position: relative; display: inline-flex; flex-wrap: wrap-reverse; align-content: flex-start; gap: 1px; width: 40px; height: 48px; padding: 4px 3px; border: 2px solid rgba(190, 235, 210, .8); border-top-width: 1px; border-radius: 6px 6px 14px 14px; background: linear-gradient(90deg, rgba(255, 255, 255, .18), rgba(127, 191, 143, .12) 40%, transparent); box-sizing: border-box; }
    .hb-jar.full { box-shadow: 0 0 10px rgba(120, 230, 150, .55); }
    .hb-jar .hb-cr { width: 13px; height: 12px; }
    .hb-lid { position: absolute; left: 4px; right: 4px; top: -7px; height: 6px; border-radius: 2px; background: #a07a40; }
    .hb-jn { position: absolute; right: -6px; bottom: -6px; font: 800 11px/1 var(--f-body); padding: 2px 4px; border-radius: 6px; background: #16261b; color: #cfeed6; border: 1px solid #7fbf8f; }
    .hb-jar .hb-fly { position: absolute; left: 12px; bottom: 6px; animation: hbFly .42s ease-in both; }
    @keyframes hbFly { 0% { transform: translate(-90px, -10px) rotate(0); } 60% { transform: translate(-30px, -34px) rotate(200deg); } 100% { transform: translate(0, 0) rotate(360deg); } }
    /* The function's stools: a worker sits on each busy one. */
    .hb-stools { display: grid; grid-template-columns: repeat(10, 12px); gap: 14px 3px; padding-top: 12px; }
    .hb-stools i { position: relative; width: 12px; height: 12px; background: linear-gradient(#b8884a, #8a6a3a) top / 100% 4px no-repeat, linear-gradient(#6a4a20, #6a4a20) 1px 4px / 2px 8px no-repeat, linear-gradient(#6a4a20, #6a4a20) 9px 4px / 2px 8px no-repeat; }
    .hb-stools i.busy::after { content: ''; position: absolute; left: 1px; bottom: 9px; width: 10px; height: 12px; border-radius: 5px 5px 2px 2px; background: linear-gradient(#ffd27a 0 4px, #4a86c8 4px); box-shadow: 0 0 6px rgba(255, 200, 100, .5); animation: hbWork .42s ease-in-out; }
    @keyframes hbWork { 50% { transform: translateY(-2px); } }
    /* The table's heads: iron cabinets that fill with this turn's writes and glow red past their cap. */
    .hb-heads { display: inline-flex; gap: 6px; align-items: flex-end; }
    .hb-head { display: grid; justify-items: center; gap: 2px; }
    .hb-head i { position: relative; width: 24px; height: 36px; border: 2px solid #8a7a60; border-radius: 3px; background: repeating-linear-gradient(#241d16 0 8px, #3a3026 8px 9px); overflow: hidden; }
    .hb-head i::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--fill) * 100%); background: #f0b53c; transition: height .3s; }
    .hb-head.hot i { border-color: #ff5a46; box-shadow: 0 0 10px #ff3a1e; animation: hbShake .3s linear 2; }
    .hb-head.hot i::after { background: #d0452f; }
    @keyframes hbShake { 25% { transform: translateX(-1px); } 75% { transform: translateX(1px); } }
    .hb-head small { font-size: 10px; color: #c9bca4; white-space: nowrap; } .hb-head small b { color: #ffe2a0; } .hb-head.hot small b { color: #ff7a5a; }
    /* The door's wax seal. */
    .hb-seal { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 50%; font: 800 10px/1.05 var(--f-head); text-align: center; transform: rotate(-8deg); border: 3px double rgba(255, 255, 255, .35); box-shadow: 0 2px 0 rgba(0, 0, 0, .5); }
    .hb-seal.hb-ok { background: radial-gradient(circle at 40% 35%, #5ac07a, #1e6a36); color: #eaffef; }
    .hb-seal.hb-red { background: radial-gradient(circle at 40% 35%, #e0503c, #7a1410); color: #ffeae6; }
    .hb-seal.hb-grey { background: radial-gradient(circle at 40% 35%, #8a8070, #3a342c); color: #f2eadc; }
    /* What went wrong where, popping up over the place. */
    .hb-pops { position: absolute; right: 6px; top: 40%; display: grid; justify-items: end; gap: 2px; pointer-events: none; z-index: 3; }
    .hb-pop { font: 800 14px/1 var(--f-head); color: #ff6a50; text-shadow: 0 1px 0 #000, 0 0 6px rgba(255, 60, 40, .7); animation: hbPop .42s ease-out both; animation-delay: calc(var(--k) * 60ms); }
    .hb-pop.good { color: #8fe0a2; text-shadow: 0 1px 0 #000, 0 0 6px rgba(80, 220, 120, .6); }
    .hb-pop.oil { color: #ffc04a; font-size: 12px; text-shadow: 0 1px 0 #000, 0 0 6px rgba(255, 160, 40, .7); }
    @keyframes hbPop { 0% { opacity: 0; transform: translateY(10px) scale(.7); } 35% { opacity: 1; transform: translateY(0) scale(1.2); } 100% { opacity: 1; transform: translateY(-6px) scale(1); } }
    /* The road between places, and the crates on it this turn. */
    .hb-road { position: relative; height: 30px; }
    .hb-way { position: absolute; left: 46px; width: 36px; top: -4px; bottom: -4px; z-index: 1;
      background: linear-gradient(90deg, #120f16 0 3px, transparent 3px calc(100% - 3px), #120f16 calc(100% - 3px)),
        repeating-linear-gradient(transparent 0 5px, rgba(255, 220, 150, .3) 5px 9px) center / 2px 100% no-repeat,
        repeating-linear-gradient(#3a3040 0 6px, #2e2634 6px 8px); }
    .hb-mv { position: absolute; left: 11px; top: 0; width: 12px; height: 11px; border: 2px solid #5a3e1c; border-radius: 2px; background: #e2b878; animation: hbMove .42s linear both; animation-delay: calc(var(--k) * 70ms); }
    .hb-mv:nth-child(2n) { left: 4px; } .hb-mv:nth-child(3n) { left: 18px; }
    .hb-mv.back { border-color: #5a1010; background: #ff7a5a; animation-name: hbBack; }
    @keyframes hbMove { from { transform: translateY(-10px); opacity: 0; } 15% { opacity: 1; } to { transform: translateY(30px); opacity: 1; } }
    @keyframes hbBack { from { transform: translateY(26px) rotate(0); } 50% { transform: translateY(10px) translateX(6px) rotate(-30deg); } to { transform: translateY(-8px) translateX(-4px) rotate(-60deg); opacity: .8; } }
    /* Oil dripping from the Uptime lamp. */
    .hb-lamp i { position: relative; }
    .hb-lamp i.drip { animation: hbDrain .42s ease-out both; }
    .hb-lamp i.drip::after { content: ''; position: absolute; left: 50%; top: 100%; width: 6px; height: 8px; margin-left: -3px; border-radius: 50% 50% 50% 50% / 30% 30% 70% 70%; background: #f08a1e; animation: hbDrip .42s ease-in both; }
    @keyframes hbDrain { from { background: radial-gradient(circle at 50% 70%, #ffe08a, #f08a1e 70%); } to { background: rgba(240, 138, 30, .25); } }
    @keyframes hbDrip { from { transform: translateY(-8px); opacity: 1; } to { transform: translateY(12px); opacity: .9; } }
    .hb-say { min-height: 2.7em; }
    @media (min-width: 900px) { body.in-mode .hb-scn { grid-template-columns: 128px minmax(0, 1fr); column-gap: 16px; } body.in-mode .hb-live { gap: 6px 14px; } }
    @media (prefers-reduced-motion: reduce) {
      .hb-spr.hb-stand.hb-bite, .hb-live .hb-stamp, .hb-cr.hit, .hb-folk i.wait, .hb-stools i.busy::after, .hb-head.hot i, .hb-pop, .hb-lamp i.drip, .hb-lamp i.drip::after, .hb-jar .hb-fly { animation: none; }
      .hb-cr.hit { box-shadow: 0 0 14px 3px #ff3a1e; }
      .hb-lamp i.drip { background: rgba(240, 138, 30, .25); } .hb-lamp i.drip::after { transform: translateY(4px); }
      .hb-mv { animation: none; transform: translateY(calc(var(--k) * 6px)); } .hb-mv.back { animation: none; transform: translateY(calc(var(--k) * 6px)) rotate(-30deg); }
    }`;
  document.head.appendChild(sceneCss);
  // What moved on one turn of the run, worked out from this frame and the last (roughly: the board draws it, the rules
  // in hunt-core decide it). arr: callers arriving. roads[i]: crates on the road after tile i. back[i]: crates bounced
  // back up it off the gate. pops: what to pop up on each place (harm, with the oil it burned; a type with no text
  // already has a stamp on the place). drop: oil lost.
  const POP = {
    throttled: ['gate', null], gaveUp: ['callers', n => `${n} gave up`], fail: ['queue', null], dlq: ['queue', () => 'into the jar', 'good'],
    dupe: ['fn', n => `twice ×${n}`], dupeBlocked: ['fn', () => 'no change', 'good'], lost: ['queue', n => `${n} purged`], denied: ['door', n => `403 ×${n}`],
    leak: ['door', () => 'deleted!'], blocked: ['door', () => 'blocked', 'good'], wthrottle: ['table', n => `throttled ×${n}`], wgaveUp: ['table', n => `${n} gave up`]
  };
  function runFx(b, f, prev, arrived, oil0) {
    const k = {};
    f.evs.forEach(e => { k[e.type] = (k[e.type] | 0) + 1; });
    const due = Math.max(0, (prev ? prev.pendingRetries : 0) - f.pendingRetries + f.bounced - (k.gaveUp | 0));
    const come = arrived + due, served = f.served - (prev ? prev.served : 0);
    let flow = come;
    const roads = [], back = [];
    b.tiles.slice(0, -1).forEach((t, i) => {
      if (t === 'gate') flow -= f.bounced;
      if (t === 'door') flow -= (k.denied | 0) + (k.leak | 0) + (k.blocked | 0);
      if (t === 'queue') flow = Math.min(f.busy, 3) + (k.fail | 0);
      if (t === 'fn') flow = served + (k.wthrottle | 0);
      roads.push(Math.max(0, flow));
      back.push(b.tiles[i + 1] === 'gate' ? f.bounced : 0);
    });
    const pops = {};
    Object.keys(k).forEach(type => {
      const p = POP[type];
      if (!p) return;
      const tile = p[0] === 'queue' && !b.tiles.includes('queue') ? 'fn' : p[0];
      pops[tile] = pops[tile] || [];
      if (p[1]) pops[tile].push([p[1](k[type]), p[2] || 'bad']);
    });
    Object.keys(pops).forEach(tile => {
      const oil = Object.keys(k).filter(type => POP[type] && (POP[type][0] === tile || (POP[type][0] === 'queue' && tile === 'fn' && !b.tiles.includes('queue')))).reduce((s, type) => s + (HC.COST[type] | 0) * k[type], 0);
      if (oil) pops[tile].push([`−${oil} oil`, 'oil']);
    });
    return { arr: come, roads, back, pops, drop: Math.max(0, (prev ? prev.oil : oil0) - f.oil) };
  }

  // ---- Plan ----
  function planScreen(b, st, opts) {
    return new Promise(done => {
      const spec = b.make(st.seed);
      let note = st.note || '', mood = null;
      const draw = () => {
        const spent = HC.costOf(st.placed), left = b.budget - spent;
        // An item card: the drawn icon, the name and the cost lead; the AWS setting it makes is one small line under
        // the name (it's what you're learning, so it stays on the card); a marker in the corner shows its tile.
        const hand = b.hand.map(id => {
          const c = C[id], on = st.placed.includes(id), ref = st.refused && st.refused[id], dear = !on && c.cost > left;
          const where = TILE[c.tile].toLowerCase();
          return `<button class="hb-card${on ? ' on' : ''}${ref ? ' refused' : ''}" data-card="${esc(id)}" aria-pressed="${on}" ${dear && !ref ? 'aria-disabled="true"' : ''}>
              ${cardIcon(id)}<span class="hb-cn">${esc(c.name)}</span><span class="hb-cfg">${esc(c.text)}</span>
              <span class="hb-meta"><span class="hb-cost">${c.cost ? `<span aria-hidden="true">${'🪙'.repeat(c.cost)}</span><span class="sr">${c.cost} coin${c.cost === 1 ? '' : 's'}</span>` : 'free'}</span>
                <span class="hb-where" title="Goes on the ${where}"><span aria-hidden="true">${TILE_IC[c.tile]}</span><span class="sr">, goes on the ${where}</span></span></span>
              ${ref ? '<span class="hb-state">Refused here</span>' : on ? `<span class="hb-state">On the ${where} ✓</span>` : ''}</button>`;
        }).join('');
        const sc = sceneOpen(b, opts), body = sc.root;
        if (sc.root.classList.contains('cut')) sc.bru.react('neutral', 0);
        sc.bru.turn('front');
        sc.root.classList.remove('run', 'cut');
        sc.hud.innerHTML = `<span class="hs-lamp">${lampHtml(st.oil, b.lamp)}</span>
          <span class="hs-title"><span class="hb-ctx">${esc(opts.ctx || '')}</span><b class="hb-title">${esc(b.title)}</b></span>
          <span class="hs-coins"><b>🪙 ${left}</b> of ${b.budget} left · Deploy ${st.deploy} of ${HC.deploysOf(b)}</span>`;
        sc.layer.innerHTML = boardHtml(b, st, null, spec);
        sc.sat.innerHTML = `<p class="td-head hs-sh">Your hand <span class="small muted">· tap an item to place it at its spot</span></p><button class="primary hb-go" id="hb-deploy">Deploy</button><div class="hb-hand">${hand}</div>`;
        sc.bru.say(note || `<b>Bru:</b> ${esc(b.line)}${st.deploy === 1 && !st.placed.length ? ' Pick your items, then Deploy. The run plays out on its own.' : ''}`);
        if (mood) { sc.bru.react(mood[0], mood[1]); mood = null; }
        body.querySelectorAll('[data-card]').forEach(el => el.onclick = () => {
          const id = el.dataset.card, c = C[id];
          if (st.placed.includes(id)) { st.placed = st.placed.filter(x => x !== id); note = ''; sfx('blip'); return save(); }
          const why = c.refuse && c.refuse(spec.cfg);
          if (why) {
            (st.refused = st.refused || {})[id] = 1;
            note = `<b>Bru:</b> ${esc(teachOnce('refused') || '')} ${esc(why)}`;
            mood = ['frown', 2600]; sfx('resist'); return save();
          }
          if (c.cost > b.budget - HC.costOf(st.placed)) { note = '<b>Bru:</b> Not enough coins for that one. Take something back first.'; mood = ['frown', 1600]; return save(); }
          st.placed = st.placed.concat(id); note = `<b>Bru:</b> ${esc(C[id].name)}, on the ${TILE[C[id].tile].toLowerCase()}.`; mood = ['smile', 1500]; sfx('card'); save();
        });
        body.querySelectorAll('[data-un]').forEach(el => el.onclick = () => { st.placed = st.placed.filter(x => x !== el.dataset.un); note = ''; save(); });
        body.querySelector('#hb-deploy').onclick = () => { st.note = ''; if (opts.onSave) opts.onSave(st); done(); };
      };
      const save = () => { if (opts.onSave) opts.onSave(st); draw(); };
      draw();
      // A new board opens on a cutscene: no HUD, the street leans in on the monster, Bru sets it up. Tap or wait.
      if (!st.intro) {
        st.intro = 1; if (opts.onSave) opts.onSave(st);
        const sc = B._scene, m = b.mons[0], t = HC.MONSTERS[m].tile;
        sc.root.style.setProperty('--fx', SPOT[t][0] + '%');
        sc.root.classList.add('intro');
        // She's looking down the street at it, then turns to you to tell you about it.
        sc.bru.turn('side'); setTimeout(() => { if (sc.root.classList.contains('intro')) sc.bru.turn('three'); }, Math.min(1100, B.STEP_MS * 3));
        sc.bru.say(`<b>Bru:</b> ${esc(HC.MONSTERS[m].name)}. ${esc(HC.MONSTERS[m].what)} ${esc(b.line)}`);
        const end = () => { if (sc.root.classList.contains('intro')) { sc.root.classList.remove('intro'); draw(); } };
        sc.root.addEventListener('click', end, { once: true });
        setTimeout(end, B.STEP_MS * 7);
      }
    });
  }
  function teachOnce(type) { const t = taught(); if (t[type] || !HC.TEACH[type]) return ''; t[type] = 1; S.persist(); return HC.TEACH[type]; }

  // ---- Run ----
  const EV_LINE = {
    throttled: n => `${n} bounced with 429`, gaveUp: n => `${n} gave up`, fail: () => 'The bad order failed again', dlq: () => 'Moved to the dead-letter queue',
    dupe: n => `${n} handled twice`, dupeBlocked: n => `${n} duplicate${n === 1 ? '' : 's'} changed nothing`, wthrottle: n => `${n} write${n === 1 ? '' : 's'} throttled`,
    wgaveUp: n => `${n} write${n === 1 ? '' : 's'} gave up`, denied: n => `${n} denied`, leak: () => 'The cleanup script deleted a bucket', blocked: () => 'The cleanup script was blocked',
    lost: n => `Purged: ${n} good order${n === 1 ? '' : 's'} lost`, left: n => `${n} never answered`
  };
  // Bru says one line under the lamp: the newest thing he teaches (held a few turns so it can be read), else what
  // happened this turn. The rest is on the board.
  const HOLD = 4;
  async function runScreen(b, st, res, opts) {
    const spec = b.make(st.seed), flow = b.make(st.seed);
    let k = 0, say = '', hold = 0, prev = null;
    B._skip = false;
    const skip = () => B._skip;
    for (const f of res.frames) {
      k++;
      const kinds = {};
      f.evs.forEach(e => { kinds[e.type] = (kinds[e.type] | 0) + 1; });
      const fx = runFx(b, f, prev, f.t <= HC.TICKS ? flow.arrive(f.t).length : 0, st.oil);
      prev = f;
      let taughtNow = '';
      Object.keys(kinds).forEach(type => { const t = teachOnce(type); if (t) taughtNow = t; });
      if (taughtNow) { say = `<b>Bru:</b> ${esc(taughtNow)}`; hold = HOLD; }
      else if (hold > 0) hold--;
      if (!hold) {
        const sum = Object.keys(kinds).filter(t => EV_LINE[t]).map(t => EV_LINE[t](kinds[t]));
        const served = f.served - (k > 1 ? res.frames[k - 2].served : 0);
        if (!sum.length) sum.push(f.t > HC.TICKS ? (f.queue || f.busy ? 'Draining what\'s left' : 'All quiet') : served ? `${served} served` : 'Quiet turn');
        say = `<span class="muted">Turn ${f.t}:</span> ${esc(sum.join(' · '))}`;
      }
      if (!skip() || k === res.frames.length) {
        const sc = sceneOpen(b, opts);
        sc.root.classList.add('run'); sc.root.classList.remove('cut', 'intro');
        sc.bru.turn('side');
        sc.hud.innerHTML = `<span class="hs-lamp">${lampHtml(f.oil, b.lamp, fx.drop)}</span>
          <span class="hs-title"><span class="hb-ctx">${esc(opts.ctx || '')} · Deploy ${st.deploy}</span><b class="hb-title">${esc(b.title)}</b></span>
          <span class="hs-coins"><b>Turn ${f.t}</b> of ${HC.TICKS + HC.DRAIN}${f.t > HC.TICKS ? ' · draining' : ''}</span>`;
        sc.layer.innerHTML = boardHtml(b, st, f, spec, fx);
        if (!sc.sat.querySelector('#hb-skip')) sc.sat.innerHTML = '<button class="ghost" id="hb-skip">Skip to the end</button>';
        sc.bru.say(say);
        if (fx.drop) sc.bru.react('wince', 900); else if (kinds.dlq || kinds.dupeBlocked || kinds.blocked) sc.bru.react('smile', 1200);
        if (f.evs.some(e => HC.COST[e.type])) sfx('hit'); else if (f.evs.some(e => e.type === 'dlq')) sfx('sparkle');
        await wait(skip() ? 0 : B.STEP_MS);
        if (opts.gone && opts.gone()) return false;
      }
    }
    return true;
  }

  // ---- After a deploy ----
  function afterScreen(b, st, res, par, opts) {
    return new Promise(done => {
      const spec = b.make(st.seed);
      const mons = b.mons.map(m => {
        const ok = res.contained[m], c = res.counts;
        const what = {
          poison: ok ? (c.dlq ? 'Into the dead-letter jar after its 3rd failed receive.' : c.dupeBlocked ? 'Duplicates arrived, but changed nothing.' : 'No duplicates, nothing lost.') : c.lost ? 'Purged, with good orders lost too.' : c.dupe ? `${c.dupe} orders handled twice.` : 'Still in the queue, failing every time it came back.',
          gate: ok ? 'Callers got through as the bucket refilled.' : `${c.gaveUp | 0} callers gave up on an empty bucket.`,
          hydra: ok ? 'Writes spread out. No head stayed over its cap.' : `${c.wgaveUp | 0} writes gave up on the hot head.`,
          warden: ok ? 'Reads got through, and nothing else did.' : c.leak ? 'Reads got through, and so did the cleanup script.' : `${c.denied | 0} reads were denied.`
        }[m];
        // Caught: the sprite sits in a glass jar, greyed. Escaped: it's mid-lunge, with claw marks.
        return `<li class="hb-res ${ok ? 'ok' : 'bad'}"><span class="${ok ? 'hb-jarf' : 'hb-escf'}" aria-hidden="true">${sprite(m)}</span>
          <span class="hb-rn"><b>${esc(HC.MONSTERS[m].name)}</b> <span class="hb-rb">${ok ? '✓ contained' : '✗ not contained'}</span></span><span class="hb-rl">${esc(what)}</span></li>`;
      }).join('');
      const placed = st.placed.filter(id => !(C[id].refuse && C[id].refuse(spec.cfg)));
      // A card counts as part of the fix if any of the board's fix groups has it.
      const inFix = id => b.fix.some(g => g.includes(id));
      const backs = placed.map(id => { const f = inFix(id);
        return `<li class="hb-back ${f ? 'fix' : 'miss'}"><span class="hb-bic">${cardIcon(id)}<span class="hb-badge" aria-hidden="true">${f ? '✓' : '✗'}</span></span>
          <span class="hb-bt"><b>${esc(C[id].name)}</b><span class="sr"> (${f ? 'part of the fix' : 'not the fix'})</span><span class="hb-bs">${esc(C[id].back)}</span></span></li>`; }).join('');
      const left = HC.deploysOf(b) - st.deploy;
      const stars = res.won ? HC.stars(true, st.deploy, res.score, par) : 0;
      const can = !res.won && left > 0 && res.oilLeft > 0;
      const head = res.won ? `CAUGHT ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : res.out ? 'THE LAMP WENT OUT' : 'THE FIX DIDN\'T HOLD';
      const stat = (ic, n, what, cls) => `<span class="hb-st${cls ? ' ' + cls : ''}"><span class="hb-sti" aria-hidden="true">${ic}</span><b>${n}</b><small>${what}</small></span>`;
      // The end of a run is a cutscene over the street: letterbox, the verdict, the monster in a jar or running
      // off, Bru's reaction and line, and what each item really did.
      const sc = sceneOpen(b, opts), body = sc.root;
      sc.root.classList.remove('run', 'intro'); sc.root.classList.add('cut');
      sc.cut.innerHTML = `<div class="hb hb-after">
        <div class="verdict-row"><div class="verdict ${res.won ? 'ok' : 'bad'}">${head}</div></div>
        <div class="hb-stats"><span class="hb-st hb-stl">${lampHtml(res.oilLeft, b.lamp)}<small>oil ${res.oilLeft} of ${b.lamp}</small></span>
          <span class="hb-vs">${stat('🏆', res.score, 'score', 'hb-big')}${par ? `<span class="hb-vsx" aria-hidden="true">vs</span>${stat('⛳', par.score, 'par')}` : ''}</span>
          ${stat('👥', res.served, 'served')}${stat('🔥', res.burned, 'burned')}${stat('🪙', res.coins, 'coins')}</div>
        <ul class="hb-results">${mons}</ul>
        ${backs ? `<p class="td-head">What your cards really did</p><ul class="hb-backs">${backs}</ul>` : '<p class="small">You deployed with no changes, so you saw the failure as it is.</p>'}
        ${res.won && stars < 3 ? `<p class="small muted">${st.deploy > 1 ? 'Catch it on the first deploy for 2 stars.' : 'Par is the best plan within budget. A cheaper plan, or one that burns less oil, gets there.'}</p>` : ''}
        ${can ? `<p class="hb-left"><span class="hb-pips" aria-hidden="true">${'▲'.repeat(left)}</span> <b>${left} deploy${left === 1 ? '' : 's'} left</b> <span class="small">· the oil you burned stays burned</span></p>` : ''}
        ${!res.won && !can ? '<p class="small">No deploys or oil left. It escapes.</p>' : ''}
        <button class="primary hb-go" id="hb-next">${res.won ? (opts.debrief ? 'Debrief: why did that work?' : 'Done') : can ? 'Change the plan' : 'Continue'}</button></div>`;
      sc.sat.innerHTML = '';
      const bodyNext = sc.cut.querySelector('#hb-next');
      sc.bru.turn('front');
      sc.bru.react(res.won ? 'grin' : 'frown', 1e9);
      sc.bru.say(`<b>Bru:</b> ${res.won ? (stars === 3 ? 'Lid on. Perfect.' : 'Lid on. Got it.') : can ? 'It got away. Change the plan?' : 'Gone into the fog.'}`);
      if (res.won) sfx('levelup'); else sfx('wrong');
      body.querySelector('#hb-next').onclick = () => done({ again: can, stars });
    });
  }

  // The hand as RPG item cards, and the after screen as a game's end screen (sprites in jars, cards with ✓/✗ badges).
  const cardCss = document.createElement('style');
  cardCss.textContent = `
    .hb .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    /* Every icon sits in an inventory slot. A card without a drawn icon yet shows its tile's emoji as a rune in the
       same slot, so it reads as a different kind of item, not a broken image. */
    .hb-ic { position: relative; display: grid; place-items: center; width: 60px; height: 60px; flex: none; border-radius: 12px;
      background: radial-gradient(circle at 50% 40%, rgba(255, 200, 110, .22), rgba(0, 0, 0, .45) 72%); box-shadow: inset 0 0 0 2px rgba(255, 210, 130, .35), inset 0 2px 6px rgba(0, 0, 0, .7); }
    .hb-ic img { position: absolute; inset: 5px; width: calc(100% - 10px); height: calc(100% - 10px); object-fit: contain; image-rendering: pixelated; filter: drop-shadow(0 2px 0 rgba(0, 0, 0, .6)); }
    .hb-icf { color: #ffd27a; font-weight: 800; font-size: 28px; line-height: 1; filter: sepia(.5) drop-shadow(0 0 4px rgba(255, 190, 90, .6)) drop-shadow(0 2px 0 rgba(0, 0, 0, .7)); }
    .hb-ic.img .hb-icf { visibility: hidden; }
    /* The hand: two cards a row on a phone, a compact grid in the wide right column. */
    .hb-hand { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
    /* (js/mode-stage.js lays the hunt's lists out at 320px a column on the wide stage: the hand overrides that, so it stays a compact grid.) */
    @media (min-width: 900px) { body.in-mode #panel .hb-cols .hb-r .hb-hand { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); } }
    .hb-cfg { font: 11px/1.3 ui-monospace, SFMono-Regular, Menlo, monospace; color: #c9bca4; overflow-wrap: anywhere; }
    .hb-card { position: relative; display: grid; justify-items: center; align-content: start; gap: 4px; width: 100%; min-height: 128px; padding: 10px 6px 8px;
      text-align: center; font: inherit; color: #efe6d2; cursor: pointer; border: 2px solid #8a6a36; border-radius: 10px;
      background: radial-gradient(80% 60% at 50% 30%, rgba(255, 190, 90, .16), transparent 70%), linear-gradient(#30263a, #1c1620);
      box-shadow: inset 0 0 0 2px #1a1218, inset 0 0 0 3px rgba(255, 210, 130, .18), 0 3px 0 #0c0a10; transition: transform .12s, box-shadow .12s; }
    .hb-card:hover:not([aria-disabled="true"]) { transform: translateY(-2px); }
    .hb-card:focus-visible { outline: 3px solid #ffd27a; outline-offset: 2px; }
    .hb-card.on { border-color: #ffd27a; background: radial-gradient(80% 60% at 50% 30%, rgba(255, 210, 120, .38), transparent 75%), linear-gradient(#4a3a22, #251a12);
      box-shadow: inset 0 0 0 2px #1a1218, 0 0 0 2px rgba(255, 200, 90, .35), 0 0 14px rgba(255, 180, 60, .55), 0 3px 0 #0c0a10; }
    .hb-card.refused { border: 2px dashed #ff6a52; filter: grayscale(.85); opacity: .75; }
    .hb-card[aria-disabled="true"] { opacity: .5; filter: grayscale(.6); cursor: not-allowed; }
    .hb-cn { color: #f6ecd6; font-weight: 800; font-size: 13px; line-height: 1.2; overflow-wrap: anywhere; }
    .hb-meta { display: flex; justify-content: space-between; align-items: center; gap: 4px; width: 100%; margin-top: auto; padding-top: 4px; border-top: 1px solid rgba(255, 210, 130, .2); }
    .hb-cost { white-space: nowrap; font-size: 14px; font-weight: 800; color: #ffd27a; letter-spacing: -.12em; }
    .hb-where { display: inline-grid; place-items: center; min-width: 24px; height: 22px; padding: 0 4px; border-radius: 6px; font-size: 13px; font-weight: 800; color: #ffd27a; background: rgba(0, 0, 0, .35); border: 1px solid rgba(255, 210, 130, .3); }
    .hb-state { width: 100%; padding: 3px 6px; border-radius: 4px; font: 800 10px/1.2 var(--f-body); letter-spacing: .04em; text-transform: uppercase;
      background: #ffd27a; color: #2a1c08; }
    .hb-card.refused .hb-state { background: #ff6a52; color: #1a0606; }
    /* After a deploy */
    .hb-after { max-width: 880px; width: 100%; margin: 0 auto; gap: 10px; }
    .hb-after .verdict-row { justify-content: center; margin-bottom: 0; }
    .hb-after .verdict { font-size: clamp(30px, 8vw, 48px); text-align: center; line-height: 1.05; }
    .hb-stats { display: flex; flex-wrap: wrap; justify-content: center; align-items: stretch; gap: 6px; }
    .hb-st { display: grid; justify-items: center; align-content: center; gap: 0; min-width: 0; padding: 4px 7px; border-radius: 8px; border: 2px solid #5a4630;
      background: linear-gradient(#2a2230, #1d1822); color: #efe6d2; }
    .hb-st b { font: 800 17px/1.1 var(--f-head); } .hb-st small { font-size: 9px; text-transform: uppercase; letter-spacing: .05em; color: #c9bca4; }
    .hb-sti { font-size: 14px; line-height: 1; }
    .hb-stl { flex-basis: 100%; max-width: 320px; } @media (min-width: 700px) { .hb-stl { flex-basis: auto; } } .hb-stl .hb-lamp i { width: 11px; height: 16px; }
    .hb-vs { display: flex; align-items: center; gap: 4px; }
    .hb-vsx { font: 800 12px var(--f-head); color: #ffd27a; text-shadow: 0 1px 2px #000; }
    .hb-st.hb-big { border-color: #c9a24a; } .hb-st.hb-big b { font-size: 24px; color: #ffd27a; }
    .hb-results { list-style: none; margin: 2px 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
    .hb-res { display: grid; justify-items: center; gap: 3px; width: min(100%, 220px); padding: 8px 8px 10px; border-radius: 12px; text-align: center; color: #efe6d2;
      border: 2px solid #5a4630; background: radial-gradient(100% 70% at 50% 25%, rgba(255, 150, 60, .18), transparent 70%), linear-gradient(#2a2230, #17131c); }
    .hb-res.ok { border-color: #5f9e70; } .hb-res.bad { border-color: #b03a2a; background: radial-gradient(100% 70% at 50% 25%, rgba(255, 60, 40, .25), transparent 70%), linear-gradient(#30202a, #17131c); }
    .hb-res .hb-spr { width: 64px; height: 64px; position: static; transform: none; }
    .hb-jarf { position: relative; display: grid; place-items: center; width: 84px; height: 92px; margin-top: 10px; border: 3px solid rgba(200, 230, 255, .75); border-top-width: 2px;
      border-radius: 16px 16px 22px 22px; background: linear-gradient(100deg, rgba(255, 255, 255, .22) 0 14%, transparent 15% 70%, rgba(255, 255, 255, .1) 71% 78%, transparent 79%), rgba(140, 200, 230, .12);
      box-shadow: inset 0 -10px 16px rgba(120, 190, 220, .25), 0 0 10px rgba(150, 210, 240, .25); }
    .hb-jarf::before { content: ''; position: absolute; top: -12px; left: 8px; right: 8px; height: 10px; border-radius: 4px; background: linear-gradient(#a07a3a, #6a4a1e); border: 2px solid #3a2a14; }
    .hb-jarf .hb-spr { filter: grayscale(1) brightness(.75) contrast(.9); opacity: .8; }
    .hb-escf { position: relative; display: grid; place-items: center; width: 92px; height: 92px; margin-top: 10px; }
    .hb-escf .hb-spr { transform: translateX(8px) rotate(-6deg) scale(1.15); filter: drop-shadow(0 0 8px rgba(255, 60, 40, .9)); }
    .hb-escf::before { content: ''; position: absolute; left: -6px; top: 22px; width: 34px; height: 46px;
      background: repeating-linear-gradient(180deg, rgba(255, 200, 160, .8) 0 2px, transparent 2px 10px); mask: linear-gradient(90deg, transparent, #000); -webkit-mask: linear-gradient(90deg, transparent, #000); }
    .hb-escf::after { content: ''; position: absolute; right: -4px; top: 6px; width: 40px; height: 52px; transform: rotate(18deg);
      background: repeating-linear-gradient(90deg, transparent 0 6px, #ff4a36 6px 9px, transparent 9px 14px); border-radius: 50%; opacity: .9; filter: drop-shadow(0 0 3px #ff3020); }
    .hb-rn { font-size: 14px; line-height: 1.2; color: #f6ecd6; } .hb-rb { display: inline-block; font: 800 11px/1 var(--f-body); padding: 3px 6px; border-radius: 4px; text-transform: uppercase; letter-spacing: .04em; }
    .hb-res.ok .hb-rb { background: #2b5a37; color: #cfeed6; } .hb-res.bad .hb-rb { background: #5a1a14; color: #ffc9bd; }
    .hb-rl { font-size: 13px; line-height: 1.3; color: #e2d6bd; }
    .hb-backs { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); }
    .hb-back { display: flex; gap: 8px; align-items: center; padding: 6px 8px; border-radius: 10px; border: 2px solid #5a4630; background: linear-gradient(#2a2230, #1d1822); color: #efe6d2; }
    .hb-back.fix { border-color: #5f9e70; } .hb-back.miss { border-color: #7a3a30; }
    .hb-bic { position: relative; flex: none; } .hb-bic .hb-ic { width: 48px; height: 48px; } .hb-bic .hb-icf { font-size: 26px; }
    .hb-back.miss .hb-ic { filter: grayscale(.6); opacity: .8; }
    .hb-badge { position: absolute; right: -4px; bottom: -4px; display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; font: 800 12px/1 var(--f-body); border: 2px solid #0c0a10; }
    .hb-back.fix .hb-badge { background: #4fbf6a; color: #08200e; } .hb-back.miss .hb-badge { background: #e0503c; color: #200806; }
    .hb-bt { display: grid; gap: 1px; min-width: 0; } .hb-bt b { font-size: 13px; } .hb-bs { font-size: 12px; line-height: 1.3; color: #d8ccb2; }
    .hb-left { text-align: center; text-shadow: 0 1px 3px rgba(0, 0, 0, .8); } .hb-pips { color: #ffd27a; letter-spacing: .1em; }
    @media (prefers-reduced-motion: reduce) { .hb-card { transition: none; } }`;
  document.head.appendChild(cardCss);

  // ---- One board, start to finish (resumes from opts.state) ----
  B.play = async function (id, opts) {
    opts = opts || {};
    const b = HC.board(id);
    if (!b) return null;
    const st = opts.state && opts.state.id === id ? opts.state : { id, seed: opts.seed || (1 + Math.floor(Math.random() * 9999)), deploy: 1, oil: b.lamp, placed: [], refused: {} };
    const par = HC.par(b, st.seed);
    const save = () => { if (opts.onSave) opts.onSave(st); };
    save();
    for (;;) {
      await planScreen(b, st, Object.assign({}, opts, { onSave: s => { Object.assign(st, s); save(); } }));
      if (opts.gone && opts.gone()) return null;
      const res = HC.run(b, st.seed, st.placed, st.oil);
      const ok = await runScreen(b, st, res, opts);
      if (!ok) return null;
      st.oil = res.oilLeft;
      st.last = { won: res.won, contained: res.contained };
      save();
      const r = await afterScreen(b, st, res, par, opts);
      if (opts.gone && opts.gone()) return null;
      if (res.won || !r.again) {
        U.closePanel();
        return { won: res.won, stars: r.stars, deploy: st.deploy, placed: st.placed.slice(), fix: b.fix.map(g => g.find(x => st.placed.includes(x)) || g[0]), score: res.score, par: par ? par.score : null };
      }
      st.deploy++;
      save();
    }
  };


  // The street scene's layout. The panel's window is the whole stage (js/mode-stage.js); here the scene fills it.
  const hsCss = document.createElement('style');
  hsCss.textContent = `
    .win.hs-win > .win-b { padding: 0 !important; overflow: hidden !important; display: flex; flex-direction: column; }
    .hs { position: relative; flex: 1; min-height: 0; display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 0; overflow: hidden; color: #efe6d2; }
    .hs .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    /* HUD */
    .hs-win .win-h > span:first-child { display: none; }
    .hs-hud { position: relative; z-index: 4; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 4px 14px; padding: 6px 14px;
      background: linear-gradient(rgba(6, 5, 10, .85), rgba(6, 5, 10, 0)); text-shadow: 0 1px 3px #000; font-size: 14px; }
    .hs-title { display: grid; justify-items: center; text-align: center; flex: 1; min-width: 0; }
    .hs-title .hb-ctx { font-size: 11px; opacity: .7; } .hs-title .hb-title { font: 700 17px/1.15 var(--f-head, serif); color: #f0d68a; }
    .hs-coins { white-space: nowrap; }
    /* The street: as tall as the room allows; sideways scroll when it's wider than the screen */
    .hs-view { position: relative; min-height: 0; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; overscroll-behavior-x: contain; container-type: size;
      background: linear-gradient(rgba(6, 5, 10, .5), rgba(6, 5, 10, .5)), url(${STREET}) left bottom / auto 100% no-repeat; }
    /* The street keeps the picture's shape (the spots are % of it): as tall as the view, or as wide as what's right of
       Bru, whichever is bigger, sitting on the bottom edge. --bw: room kept for Bru on a wide screen (set from JS). */
    .hs-street { position: absolute; bottom: 0; left: var(--bw, 0px); width: max(calc(100cqw - var(--bw, 0px)), calc(100cqh * 1584 / 672)); aspect-ratio: 1584 / 672;
      transform-origin: var(--fx, 50%) 70%; transition: transform .8s ease; }
    .hs-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; user-select: none; }
    .hs-layer { position: absolute; inset: 0; }
    .hs-dark { position: absolute; top: 0; bottom: 0; left: calc(var(--x) - 9%); width: 18%; background: radial-gradient(60% 60% at 50% 60%, rgba(6, 5, 12, .72), rgba(6, 5, 12, .45) 70%, transparent); pointer-events: none; }
    .hs-row { position: absolute; inset: 0; margin: 0; padding: 0; background: none; box-shadow: none; border-radius: 0; display: block; }
    .hs-spot { position: absolute; left: var(--x); top: var(--y); width: 0; height: 0; color: #efe6d2; }
    .hs-mon { position: absolute; left: 0; top: 0; transform: translate(-50%, -88%); }
    .hs-mon .hb-spr { position: static; width: clamp(72px, 9vw, 140px); height: auto; transform: none; image-rendering: pixelated; filter: drop-shadow(0 0 10px rgba(255, 70, 40, .6)) drop-shadow(0 6px 4px rgba(0, 0, 0, .7)); animation: hsLurk 2.6s ease-in-out infinite; }
    .hs-mon .hb-spr.hb-bite { animation: hsBite .35s ease-out; filter: drop-shadow(0 0 14px rgba(255, 40, 30, 1)); }
    @keyframes hsLurk { 50% { transform: translateY(-3px) scale(1.02); } }
    @keyframes hsBite { 40% { transform: scale(1.25) rotate(-5deg); } }
    .hs-info { position: absolute; left: 0; bottom: calc(100% + clamp(70px, 12vh, 150px)); transform: translateX(-50%); display: grid; justify-items: center; gap: 3px; width: max-content; max-width: 30vw; text-align: center; }
    .hs-spot .hb-tn { display: flex; flex-wrap: wrap; justify-content: center; gap: 2px 6px; align-items: baseline; font-size: 12px; text-shadow: 0 1px 3px #000, 0 0 6px #000; }
    .hs-spot .hb-tn b { font: 700 11px/1 var(--f-head, serif); letter-spacing: .08em; text-transform: uppercase; padding: 3px 6px; border: 1px solid #8a6a2a; border-radius: 3px; background: linear-gradient(#3a2c14, #24190c); color: #f0d68a; }
    .hs-spot .hb-monb { color: #ff9a7a; font-weight: 800; }
    .hs-spot .hb-sign { color: #e6d3a6; }
    .hs-spot .hb-live { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 4px 8px; padding: 4px 8px; border-radius: 10px; background: rgba(8, 6, 12, .55); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
    .hs-spot .hb-live:empty { display: none; }
    .hs-items { position: absolute; left: 0; top: 4px; transform: translateX(-50%); display: flex; gap: 4px; }
    .hs-item { display: grid; justify-items: center; gap: 1px; padding: 2px 4px; border: 1px solid #c9a24a; border-radius: 8px; background: rgba(30, 22, 10, .8); color: #ffe2a0; font: 700 10px var(--f-body, sans-serif); cursor: pointer; max-width: 92px; }
    .hs-item .hb-ic { width: 30px; height: 30px; }
    .hs-item .hs-in { white-space: normal; line-height: 1.1; }
    .hs-spot .hb-pops { position: absolute; left: 0; bottom: calc(100% + clamp(130px, 22vh, 240px)); transform: translateX(-50%); }
    /* crates on the cobbles between spots */
    .hs-road { position: absolute; inset: 0; pointer-events: none; }
    .hs-mv { position: absolute; top: ${ROAD_Y}%; left: var(--a); width: 14px; height: 14px; margin: -7px; border: 2px solid #5a3e1c; border-radius: 2px; background: #e2b878;
      animation: hsRoll ${'${'}B.STEP_MS}ms linear both; animation-delay: calc(var(--k) * 60ms); }
    .hs-mv.back { background: #d0452f; border-color: #5a1a10; }
    @keyframes hsRoll { from { left: var(--a); } to { left: var(--b); } }
    /* Bru */
    .hs-bru { position: absolute; z-index: 3; left: max(4px, 2vw); bottom: 0; height: min(78%, 620px); aspect-ratio: 475 / 900; pointer-events: none;
      transform-origin: 50% 100%; animation: hsBreathe 3.8s ease-in-out infinite; filter: drop-shadow(0 0 18px rgba(0, 0, 0, .6)); }
    .hs-fig { position: absolute; inset: 0; transform-origin: 50% 100%; }
    .hs-fig.turn { animation: hsTurn .24s ease-out; }
    @keyframes hsTurn { 0% { transform: scaleX(.86); opacity: .85; } 100% { transform: none; opacity: 1; } }
    .hs-body { position: absolute; inset: 0; width: 100%; height: 100%; }
    .hs-face { position: absolute; }
    @keyframes hsBreathe { 50% { transform: scale(1.006, 1.014); } }
    .hs-bru[data-mood="wince"] { animation: hsFlinch .4s ease-out, hsBreathe 3.8s ease-in-out .4s infinite; }
    @keyframes hsFlinch { 30% { transform: translateX(-6px) rotate(-1.5deg); } }
    .hs-bru[data-mood="grin"] { animation: hsHop .6s ease-out 2, hsBreathe 3.8s ease-in-out 1.2s infinite; }
    @keyframes hsHop { 40% { transform: translateY(-10px); } }
    .hs-say { position: absolute; z-index: 5; left: calc(max(4px, 2vw) + min(78%, 620px) * .36); bottom: calc(min(78%, 620px) * .74); max-width: min(420px, 46vw); margin: 0;
      padding: 10px 14px; border: 2px solid #2a2018; border-radius: 16px; background: #fbf5e3; pointer-events: none; color: #2a2018; font-size: 15px; line-height: 1.35; box-shadow: 0 6px 18px rgba(0, 0, 0, .55); }
    .hs-say::before { content: ''; position: absolute; left: -12px; bottom: 14px; border: 8px solid transparent; border-right: 12px solid #2a2018; }
    .hs-say::after { content: ''; position: absolute; left: -8px; bottom: 16px; border: 6px solid transparent; border-right: 10px solid #fbf5e3; }
    .hs-say[hidden] { display: none; }
    .hs-say .muted { color: #6a5a48; }
    /* the satchel: your items along the bottom, Deploy at the end */
    .hs-sat { position: relative; z-index: 4; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 4px 12px; padding: 8px 14px 10px max(14px, var(--bw, 0px));
      background: linear-gradient(rgba(20, 13, 6, 0), rgba(20, 13, 6, .9) 30%), repeating-linear-gradient(0deg, rgba(0, 0, 0, .12) 0 2px, transparent 2px 6px); }
    .hs-sat:empty { display: none; }
    .hs-sat .hb-hand { grid-column: 1 / -1; }
    .hs-sat .hs-sh { margin: 0; color: #e6d3a6; font-size: 13px; text-shadow: 0 1px 2px #000; }
    .hs-sat .hs-sh .muted { color: #b7a98f; }
    .hs-sat .hb-hand { display: flex !important; gap: 8px; overflow-x: auto; padding: 4px 2px 6px; scroll-snap-type: x proximity; grid-template-columns: none !important; }
    .hs-sat .hb-card { flex: 0 0 auto; width: 150px; scroll-snap-align: start; }
    .hs-sat .hb-go { width: auto; min-width: 140px; margin: 0; }
    .hs-sat #hb-skip { grid-column: 2; }
    /* intro cutscene: letterbox, no HUD or satchel, lean in on the monster */
    .hs::before, .hs::after { content: ''; position: absolute; left: 0; right: 0; z-index: 6; height: 0; background: #000; transition: height .6s ease; pointer-events: none; }
    .hs::before { top: 0; } .hs::after { bottom: 0; }
    .hs.intro::before, .hs.intro::after, .hs.cut::before, .hs.cut::after { height: 7%; }
    .hs.intro .hs-hud, .hs.intro .hs-sat { opacity: 0; pointer-events: none; }
    .hs-hud, .hs-sat { transition: opacity .5s ease; }
    .hs.intro .hs-street { transform: scale(1.35); }
    .hs.intro .hs-info { opacity: 0; }
    /* the end of a run: a cutscene over the street */
    .hs-cut { display: none; }
    .hs.cut .hs-cut { display: block; position: absolute; z-index: 5; left: max(14px, calc(min(78%, 620px) * .3 + 2vw)); right: 14px; top: 9%; bottom: 8%; overflow-y: auto; padding: 4px 6px 10px;
      background: radial-gradient(80% 70% at 60% 40%, rgba(6, 5, 10, .78), rgba(6, 5, 10, .35)); border-radius: 18px; }
    .hs.cut .hs-info, .hs.cut .hs-items { opacity: .35; }
    .hs.cut .hs-say { bottom: auto; top: 10%; left: max(4px, 2vw); max-width: min(260px, 40vw); }
    .hs.cut .hs-say::before, .hs.cut .hs-say::after { display: none; }
    .hs-cut .hb-after { gap: 10px; }
    @media (prefers-reduced-motion: reduce) { .hs-bru, .hs-mon .hb-spr, .hs-mv { animation: none !important; } .hs-street { transition: none; } .hs-mv { left: var(--b); } }
    /* phones: the street takes the middle and pans; Bru from the waist up at the left, her line by her head; compact items */
    @media (max-width: 700px) {
      .hs-hud { display: grid; grid-template-columns: auto 1fr; gap: 2px 8px; font-size: 12px; padding: 4px 10px; }
      .hs-hud .hs-title { grid-column: 1 / -1; grid-row: 2; justify-items: start; text-align: left; }
      .hs-hud .hs-coins { justify-self: end; }
      .hs-title .hb-ctx { display: none; } .hs-title .hb-title { font-size: 14px; }
      .hb-lamp i { width: 9px; height: 14px; }
      .hs-bru { height: 52%; left: 0; bottom: 0; }
      .hs-say { left: calc(var(--bruw, 120px) * .86); right: 8px; bottom: calc(52% * .86); max-width: none; font-size: 13px; padding: 7px 10px; }
      .hs-sat { padding: 6px 10px 8px; }
      .hs-sat .hs-sh .muted { display: none; }
      .hs-sat .hb-go { min-width: 0; padding: 8px 18px; }
      .hs-sat .hb-card { width: 210px; display: grid; grid-template-columns: 38px minmax(0, 1fr); grid-template-rows: auto auto auto; column-gap: 8px; row-gap: 1px; align-items: start; text-align: left; padding: 6px 8px; }
      .hs-sat .hb-card > .hb-ic { grid-row: 1 / span 3; width: 38px; height: 38px; }
      .hs-sat .hb-card .hb-cn { font-size: 13px; text-align: left; }
      .hs-sat .hb-card .hb-cfg { font-size: 10.5px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-align: left; }
      .hs-sat .hb-card .hb-meta { grid-column: 2; }
      .hs-sat .hb-card .hb-state { grid-column: 1 / -1; }
      .hs-info { max-width: 46vw; }
      .hs.cut .hs-cut { left: 8px; right: 8px; top: 8%; bottom: 8%; }
      .hs.cut .hs-say { display: none; }
    }`;
  document.head.appendChild(hsCss);

  // ---- Bru's yard: every board, to practise outside the hunt (not on the Wall) ----
  // Starts narrow (L7): the teach boards first; a monster's tight boards open once its teach board is caught, the
  // combos once both their monsters have one, and the boss once any combo is caught. A board caught on the hunt counts.
  B.record = function (id, r) { const y = yardRec(), o = y[id] || {}; y[id] = { stars: Math.max(o.stars || 0, r.stars || 0), best: Math.max(o.best == null ? -999 : o.best, r.score) }; S.persist(); };
  const caught = id => (yardRec()[id] && yardRec()[id].stars) || 0;
  B.open = function (b) {
    if (b.tier === 'teach') return true;
    const teachOf = m => HC.BOARDS.some(x => x.tier === 'teach' && x.mons.includes(m) && caught(x.id));
    if (b.tier === 'tight' || b.tier === 'combo') return b.mons.every(teachOf);
    return HC.BOARDS.some(x => x.tier === 'combo' && caught(x.id));
  };
  B.yard = function () {
    const groups = [['teach', 'First boards'], ['tight', 'Tighter boards'], ['combo', 'Two monsters at once'], ['boss', 'Boss board']];
    const rows = groups.map(([t, name]) => {
      const bs = HC.BOARDS.filter(b => b.tier === t);
      const items = bs.map(b => {
        const on = B.open(b), s = caught(b.id);
        return `<li><button class="opt hb-yb" data-yb="${esc(b.id)}" ${on ? '' : 'aria-disabled="true"'}><span><b>${b.mons.map(m => MON_IC[m]).join('')} ${esc(b.title)}</b><br><span class="small">${on ? esc(b.mons.map(m => HC.MONSTERS[m].name).join(' + ')) : 'Catch the first boards to open this one.'}</span></span><span class="hb-stars" aria-label="${s} stars">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span></button></li>`;
      }).join('');
      return `<p class="td-head">${name}</p><ul class="hb-yard">${items}</ul>`;
    }).join('');
    const body = U.panel(`<div class="hb"><p class="td-head" data-vo="${esc('bru|Practice boards. Nothing here goes on the Wall, so break things.')}">Practice boards. Nothing here goes on the Wall, so break things.</p>${rows}</div>`,
      { title: 'BRU\'S YARD', onClose: () => { if (SD.hunt && SD.hunt.open) SD.hunt.open(); }, cls: 'hn-simwin' });
    body.querySelectorAll('[data-yb]').forEach(el => el.onclick = async () => {
      const b = HC.board(el.dataset.yb);
      if (!B.open(b)) return;
      const r = await B.play(b.id, { title: 'BRU\'S YARD', ctx: 'Practice board' });
      if (r && r.won) B.record(b.id, r);
      B.yard();
    });
  };

  // Skip lives on the panel, not the button: the run redraws every turn, so a tap must survive the redraw.
  document.addEventListener('click', e => { if (e.target && e.target.closest && e.target.closest('#hb-skip')) B._skip = true; }, true);

  const css = document.createElement('style');
  css.textContent = `
    .hb { display: grid; gap: 6px; align-content: start; }
    /* On the full-screen stage, wide: the board on the left, the hand (or the run's log) on the right. */
    @media (min-width: 900px) { body.in-mode .hb-cols { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 12px 24px; align-items: start; }
      body.in-mode .hb-cols > .hb-r { position: sticky; top: 0; } }
    .hb p { margin: 0; }
    .hb-ctx { font-size: 12px; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; opacity: .75; }
    .hb-title { font-size: 17px; }
    .hb-mline { font-size: 14px; }
    .hb-hud { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 4px 10px; padding: 6px 8px; border: 2px solid var(--ink); border-radius: 8px; background: #fff8e6; }
    .hb-lamp { display: inline-flex; gap: 3px; } .hb-lamp i { width: 12px; height: 18px; border: 2px solid #3a2a14; border-radius: 50% 50% 40% 40% / 60% 60% 40% 40%; background: transparent; }
    .hb-lamp i.on { background: radial-gradient(circle at 50% 70%, #ffe08a, #f08a1e 70%); box-shadow: 0 0 6px rgba(255, 160, 40, .7); }
    .hb-bru { padding: 6px 10px; border-left: 4px solid #b8923a; background: #fff3c4; font-size: 14px; }
    .hb-spr { width: 56px; height: 56px; object-fit: contain; image-rendering: pixelated; filter: drop-shadow(0 0 6px rgba(255, 140, 50, .45)); }
    .hb-spr.hb-sm { width: 32px; height: 32px; vertical-align: middle; position: static; transform: none; filter: none; }
    .hb-spr.hb-jarred { filter: grayscale(1) brightness(.7); opacity: .7; }
    .hb-spr.hb-bite { animation: hbBite .35s ease-out; filter: drop-shadow(0 0 8px rgba(255, 60, 40, .9)); }
    @keyframes hbBite { 0% { transform: translateY(-50%) scale(1); } 40% { transform: translateY(-50%) translateX(6px) scale(1.18) rotate(-4deg); } 100% { transform: translateY(-50%) scale(1); } }
    @media (prefers-reduced-motion: reduce) { .hb-spr.hb-bite { animation: none; } }
    .hb-go { width: 100%; margin-top: 4px; }
    .hb-yard { list-style: none; margin: 4px 0; padding: 0; display: grid; gap: 6px; }
    .hb-yb { width: 100%; display: flex; justify-content: space-between; gap: 8px; text-align: left; }
    .hb-yb[aria-disabled="true"] { opacity: .5; }
    .hb-stars { white-space: nowrap; color: #b8923a; font-size: 16px; }`;
  document.head.appendChild(css);
})();
