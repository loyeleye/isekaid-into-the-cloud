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
    return `<li class="hb-tile hb-place${mon ? ' hb-mon' : ''}" data-tile="${tile}"><div class="hb-scn">
      <span class="hb-pic"><span class="hb-emo" aria-hidden="true">${TILE_IC[tile]}</span><img src="${PLACE(tile)}" alt="" aria-hidden="true" width="128" height="128" decoding="async" onerror="this.parentNode.classList.add('noimg');this.remove()"></span>
      ${mon ? sprite(mon, 'hb-stand' + (acting ? ' hb-bite' : '')) : ''}
      <span class="hb-tn"><b>${TILE[tile]}</b>${sign ? `<span class="hb-sign">${esc(sign)}</span>` : ''}${mon ? `<span class="hb-monb">${esc(HC.MONSTERS[mon].name)}</span>` : ''}</span>
      <span class="hb-live">${live}</span>${pops ? `<span class="hb-pops" aria-hidden="true">${pops}</span>` : ''}</div>${chips ? `<span class="hb-chips">${chips}</span>` : ''}</li>`;
  }
  const lampHtml = (oil, lamp, drop) => `<span class="hb-lamp" role="img" aria-label="Uptime lamp: ${oil} of ${lamp} oil">${Array.from({ length: lamp }, (_, k) => `<i class="${k < oil ? 'on' : k < oil + (drop | 0) ? 'drip' : ''}"></i>`).join('')}</span>`;
  // The road between two places, with this turn's crates travelling it (and bounced ones coming back up).
  const roadHtml = (n, back) => `<li class="hb-road" aria-hidden="true"><span class="hb-way">${rep(Math.min(n | 0, 4), k => `<i class="hb-mv" style="--k:${k}"></i>`)}${rep(Math.min(back | 0, 4), k => `<i class="hb-mv back" style="--k:${k}"></i>`)}</span></li>`;
  const boardHtml = (b, st, f, spec, fx) => `<ol class="hb-row">${b.tiles.map((t, i) => tileHtml(b, t, st, f, spec, fx) + (i < b.tiles.length - 1 ? roadHtml(fx && fx.roads[i], fx && fx.back[i]) : '')).join('')}</ol>`;
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
      let note = st.note || '';
      const draw = () => {
        const spent = HC.costOf(st.placed), left = b.budget - spent;
        const hand = b.hand.map(id => {
          const c = C[id], on = st.placed.includes(id), ref = st.refused && st.refused[id], dear = !on && c.cost > left;
          return `<button class="hb-card${on ? ' on' : ''}${ref ? ' refused' : ''}" data-card="${esc(id)}" aria-pressed="${on}" ${dear && !ref ? 'aria-disabled="true"' : ''}>
            <span class="hb-cn"><b>${esc(c.name)}</b><span class="hb-cost" aria-label="${c.cost} coins">${'🪙'.repeat(c.cost) || 'free'}</span></span>
            <span class="small">${esc(c.text)}</span><span class="small muted">${ref ? 'Refused here' : on ? `On the ${TILE[c.tile].toLowerCase()} ✓` : `Goes on the ${TILE[c.tile].toLowerCase()}`}</span></button>`;
        }).join('');
        const body = U.panel(`<div class="hb hb-cols"><div class="hb hb-l">
          <p class="hb-ctx">${esc(opts.ctx || '')}</p>
          <p class="hb-title"><b>${esc(b.title)}</b></p><p class="small">${esc(b.line)}</p>
          ${b.mons.map(m => `<p class="hb-mline">${sprite(m, 'hb-sm')} <b>${esc(HC.MONSTERS[m].name)}</b> <span class="small">${esc(HC.MONSTERS[m].what)}</span></p>`).join('')}
          <div class="hb-hud"><span>${lampHtml(st.oil, b.lamp)}</span><span class="small"><b>🪙 ${left}</b> of ${b.budget} left · Deploy ${st.deploy} of ${HC.deploysOf(b)}</span></div>
          ${note ? `<p class="hb-bru" aria-live="polite">${note}</p>` : ''}
          ${boardHtml(b, st, null, spec)}</div><div class="hb hb-r">
          <p class="td-head">Your hand</p><div class="hb-hand">${hand}</div>
          <button class="primary hb-go" id="hb-deploy">Deploy</button>
          ${st.deploy === 1 && !st.placed.length ? '<p class="muted small">Once you deploy, the run plays out on its own. You can change your plan afterwards if the fix didn\'t hold.</p>' : ''}</div></div>`,
        { title: opts.title || 'MONSTER HUNT', noClose: true, cls: 'hn-simwin' });
        body.querySelectorAll('[data-card]').forEach(el => el.onclick = () => {
          const id = el.dataset.card, c = C[id];
          if (st.placed.includes(id)) { st.placed = st.placed.filter(x => x !== id); note = ''; sfx('blip'); return save(); }
          const why = c.refuse && c.refuse(spec.cfg);
          if (why) {
            (st.refused = st.refused || {})[id] = 1;
            note = `<b>Bru:</b> ${esc(teachOnce('refused') || '')} ${esc(why)}`;
            sfx('resist'); return save();
          }
          if (c.cost > b.budget - HC.costOf(st.placed)) { note = '<b>Bru:</b> Not enough coins for that one. Take something back first.'; return save(); }
          st.placed = st.placed.concat(id); note = ''; sfx('card'); save();
        });
        body.querySelectorAll('[data-un]').forEach(el => el.onclick = () => { st.placed = st.placed.filter(x => x !== el.dataset.un); note = ''; save(); });
        body.querySelector('#hb-deploy').onclick = () => { st.note = ''; if (opts.onSave) opts.onSave(st); done(); };
      };
      const save = () => { if (opts.onSave) opts.onSave(st); draw(); };
      draw();
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
        const body = U.panel(`<div class="hb hb-cols"><div class="hb hb-l">
          <p class="hb-ctx">${esc(opts.ctx || '')} · Deploy ${st.deploy}</p>
          <div class="hb-hud"><span>${lampHtml(f.oil, b.lamp, fx.drop)}</span><span class="small"><b>Turn ${f.t}</b> of ${HC.TICKS + HC.DRAIN}${f.t > HC.TICKS ? ' · draining' : ''}</span></div>
          <p class="hb-bru hb-say" aria-live="polite">${say}</p>
          ${boardHtml(b, st, f, spec, fx)}</div><div class="hb hb-r">
          <button class="ghost" id="hb-skip">Skip to the end</button></div></div>`, { title: opts.title || 'MONSTER HUNT', noClose: true, cls: 'hn-simwin' });
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
          poison: ok ? (c.dlq ? 'It went into the dead-letter jar after its 3rd failed receive.' : c.dupeBlocked ? 'Duplicates still arrived, but none changed anything.' : 'No duplicates, nothing lost.') : c.lost ? 'Purging lost good orders along with it.' : c.dupe ? `${c.dupe} orders were handled twice.` : 'It was still in the queue at the end, failing every time it came back.',
          gate: ok ? 'Callers got through as the bucket refilled.' : `${c.gaveUp | 0} callers gave up after bouncing off an empty bucket.`,
          hydra: ok ? 'Writes spread out, and no head was over its cap for long.' : `${c.wgaveUp | 0} writes gave up on the hot head.`,
          warden: ok ? 'Reads got through, and nothing else did.' : c.leak ? 'Reads got through, and so did the cleanup script.' : `${c.denied | 0} reads were denied.`
        }[m];
        return `<li class="hb-res ${ok ? 'ok' : 'bad'}">${sprite(m, ok ? 'hb-sm hb-jarred' : 'hb-sm')}<span class="hn-ico" aria-hidden="true">${ok ? '✓' : '✗'}</span><span><b>${esc(HC.MONSTERS[m].name)}</b> ${ok ? 'contained' : 'not contained'}<br><span class="small">${esc(what)}</span></span></li>`;
      }).join('');
      const placed = st.placed.filter(id => !(C[id].refuse && C[id].refuse(spec.cfg)));
      const backs = placed.map(id => `<li><b>${esc(C[id].name)}:</b> ${esc(C[id].back)}</li>`).join('');
      const left = HC.deploysOf(b) - st.deploy;
      const stars = res.won ? HC.stars(true, st.deploy, res.score, par) : 0;
      const can = !res.won && left > 0 && res.oilLeft > 0;
      const head = res.won ? `CAUGHT ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : res.out ? 'THE LAMP WENT OUT' : 'THE FIX DIDN\'T HOLD';
      const body = U.panel(`<div class="hb">
        <div class="verdict-row"><div class="verdict ${res.won ? 'ok' : 'bad'}">${head}</div></div>
        <div class="hb-hud"><span>${lampHtml(res.oilLeft, b.lamp)}</span><span class="small">Served ${res.served} · oil burned ${res.burned} · coins ${res.coins} · <b>score ${res.score}</b>${par ? ` · par ${par.score}` : ''}</span></div>
        <ul class="hb-results">${mons}</ul>
        ${backs ? `<p class="td-head">What your cards really did</p><ul class="hb-backs">${backs}</ul>` : '<p class="small">You deployed with no changes, so you saw the failure as it is.</p>'}
        ${res.won && stars < 3 ? `<p class="small muted">${st.deploy > 1 ? 'Catch it on the first deploy for 2 stars.' : 'Par is the best plan within budget. A cheaper plan, or one that burns less oil, gets there.'}</p>` : ''}
        ${can ? `<p class="small">${left} deploy${left === 1 ? '' : 's'} left, and the oil you burned stays burned.</p>` : ''}
        ${!res.won && !can ? '<p class="small">No deploys or oil left. It escapes.</p>' : ''}
        <button class="primary hb-go" id="hb-next">${res.won ? (opts.debrief ? 'Debrief: why did that work?' : 'Done') : can ? 'Change the plan' : 'Continue'}</button></div>`,
      { title: opts.title || 'MONSTER HUNT', noClose: true, cls: 'hn-simwin' });
      if (res.won) sfx('levelup'); else sfx('wrong');
      body.querySelector('#hb-next').onclick = () => done({ again: can, stars });
    });
  }

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
    .hb-hand { display: grid; gap: 6px; }
    .hb-card { display: grid; gap: 2px; text-align: left; padding: 8px 10px; border: 2px solid var(--ink); border-radius: 8px; background: #fffdf6; color: inherit; cursor: pointer; font: inherit; }
    .hb-card.on { background: #e3eef9; border-color: #2a4360; box-shadow: inset 4px 0 0 #2a4360; }
    .hb-card.refused { opacity: .6; border-style: dashed; }
    .hb-card[aria-disabled="true"] { opacity: .55; }
    .hb-cn { display: flex; justify-content: space-between; gap: 8px; }
    .hb-cost { white-space: nowrap; font-size: 13px; }
    .hb-go { width: 100%; margin-top: 4px; }
    .hb-results, .hb-yard { list-style: none; margin: 4px 0; padding: 0; display: grid; gap: 6px; }
    .hb-res { display: flex; gap: 8px; padding: 6px 10px; border: 2px solid var(--ink); border-radius: 8px; background: #fff; } .hb-res.bad { border-style: dashed; }
    .hb-backs { margin: 0; padding-left: 18px; font-size: 14px; display: grid; gap: 4px; }
    .hb-yb { width: 100%; display: flex; justify-content: space-between; gap: 8px; text-align: left; }
    .hb-yb[aria-disabled="true"] { opacity: .5; }
    .hb-stars { white-space: nowrap; color: #b8923a; font-size: 16px; }`;
  document.head.appendChild(css);
})();
