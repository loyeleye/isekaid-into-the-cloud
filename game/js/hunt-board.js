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

  // ---- Drawing one tile ----
  function tileHtml(b, tile, st, f, spec) {
    const mon = b.mons.find(m => HC.MONSTERS[m].tile === tile);
    const here = st.placed.filter(id => C[id].tile === tile);
    const chips = here.map(id => `<button class="hb-chip" data-un="${esc(id)}" aria-label="Take back ${esc(C[id].name)}">${esc(C[id].name)} <span aria-hidden="true">✕</span></button>`).join('');
    let live = '';
    const cfg = spec.cfg;
    if (tile === 'gate' && cfg.gate) {
      const tokens = f ? f.tokens : cfg.gate.burst;
      live = `<span class="hb-bucket" role="img" aria-label="Bucket: ${tokens} of ${cfg.gate.burst} tokens">${Array.from({ length: cfg.gate.burst }, (_, k) => `<i class="${k < tokens ? 'on' : ''}"></i>`).join('')}</span>
        <span class="small muted">refills ${cfg.gate.rate} a turn</span>${f && f.bounced ? `<span class="hb-stamp">429 × ${f.bounced}</span>` : ''}`;
    }
    if (tile === 'callers') live = f ? `<span class="small">${f.pendingRetries ? `${f.pendingRetries} waiting to retry` : 'No one waiting to retry'}</span>` : '<span class="small muted">Send requests each turn.</span>';
    if (tile === 'door' && cfg.door) {
      const v = f ? f.door : SD.awsSim.iamEval(cfg.door).why;
      const seal = { allow: ['ok', 'ALLOW'], deny: ['red', 'EXPLICIT DENY'], implicit: ['grey', 'NO ALLOW'], trust: ['grey', 'TRUST POLICY: NOT YOU'] }[v] || ['grey', '?'];
      live = `<span class="hb-seal hb-${seal[0]}">${seal[1]}</span>${f && f.evs.some(e => e.type === 'leak') ? '<span class="hb-stamp">DELETED!</span>' : ''}`;
    }
    if (tile === 'queue' && cfg.queue) {
      const n = f ? f.queue : 0, recv = f ? f.poisonRecv : 0, inQ = f ? f.poisonIn : false, jar = f ? f.jar : 0;
      live = `<span class="hb-crates" role="img" aria-label="${n} messages in the queue">${Array.from({ length: Math.min(n, 12) }, () => '<i></i>').join('')}${n > 12 ? `<b>+${n - 12}</b>` : ''}${n ? '' : '<span class="small muted">empty</span>'}</span>
        ${b.mons.includes('poison') && (inQ || (f && recv)) ? `<span class="hb-tag${inQ ? '' : ' gone'}">☠ received <b class="hb-chalk">${'|'.repeat(recv) || '·'}</b></span>` : ''}
        ${st.placed.includes('dlq') || st.placed.includes('dlqfifo') ? `<span class="hb-jar${jar ? ' full' : ''}">jar ${jar}</span>` : ''}
        <span class="small muted">${cfg.queue.fifo ? 'FIFO' : 'Standard'}</span>`;
    }
    if (tile === 'fn') {
      const busy = f ? f.busy : 0, stools = f ? f.stools : cfg.fn.stools;
      live = `<span class="small">${f ? `${busy} of ${stools} busy` : `${stools} at once`}${cfg.fn.work > 1 ? ` · ${cfg.fn.work * 15} s per order` : ''}</span>${f && f.evs.some(e => e.type === 'dupe') ? '<span class="hb-stamp">TWICE!</span>' : ''}${f && f.evs.some(e => e.type === 'fail') ? '<span class="hb-stamp">FAILED</span>' : ''}`;
    }
    if (tile === 'table' && cfg.table) {
      const load = f && f.load ? f.load : Array.from({ length: cfg.table.parts }, () => 0), cap = cfg.table.cap;
      live = `<span class="hb-heads">${load.map((n, k) => `<span class="hb-head${n > cap ? ' hot' : ''}" role="img" aria-label="Partition ${k + 1}: ${n} writes, cap ${cap}"><i style="--fill:${Math.min(1, n / Math.max(1, cap))}"></i><small>P${k + 1}</small></span>`).join('')}</span>
        ${f && f.evs.some(e => e.type === 'wthrottle') ? `<span class="hb-stamp">THROTTLED × ${f.evs.filter(e => e.type === 'wthrottle').length}</span>` : ''}`;
    }
    const acting = mon && f && f.evs.some(e => ACTS[mon].includes(e.type));
    return `<li class="hb-tile${mon ? ' hb-mon' : ''}" data-tile="${tile}">${mon ? sprite(mon, acting ? 'hb-bite' : '') : ''}
      <span class="hb-tn"><span aria-hidden="true">${TILE_IC[tile]}</span> ${TILE[tile]}${mon ? ` <span class="hb-monb">${MON_IC[mon]} ${esc(HC.MONSTERS[mon].name)}</span>` : ''}</span>
      <span class="hb-live">${live}</span>${chips ? `<span class="hb-chips">${chips}</span>` : ''}</li>`;
  }
  const lampHtml = (oil, lamp) => `<span class="hb-lamp" role="img" aria-label="Uptime lamp: ${oil} of ${lamp} oil">${Array.from({ length: lamp }, (_, k) => `<i class="${k < oil ? 'on' : ''}"></i>`).join('')}</span>`;
  const boardHtml = (b, st, f, spec) => `<ol class="hb-row">${b.tiles.map((t, i) => tileHtml(b, t, st, f, spec) + (i < b.tiles.length - 1 ? '<li class="hb-arrow" aria-hidden="true">↓</li>' : '')).join('')}</ol>`;

  // ---- Plan ----
  function planScreen(b, st, opts) {
    return new Promise(done => {
      const spec = b.make(st.seed);
      let note = st.note || '';
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
  async function runScreen(b, st, res, opts) {
    const spec = b.make(st.seed);
    let k = 0;
    B._skip = false;
    const skip = () => B._skip;
    const lines = [];
    for (const f of res.frames) {
      k++;
      const kinds = {};
      f.evs.forEach(e => { kinds[e.type] = (kinds[e.type] | 0) + 1; });
      Object.keys(kinds).forEach(type => {
        const t = teachOnce(type);
        if (t) lines.unshift(`<b>Bru:</b> ${esc(t)}`);
      });
      const sum = Object.keys(kinds).filter(t => EV_LINE[t]).map(t => EV_LINE[t](kinds[t])).join(' · ');
      if (sum) lines.unshift(`<span class="muted">Turn ${f.t}:</span> ${esc(sum)}`);
      if (!skip() || k === res.frames.length) {
        const body = U.panel(`<div class="hb hb-cols"><div class="hb hb-l">
          <p class="hb-ctx">${esc(opts.ctx || '')} · Deploy ${st.deploy}</p>
          <div class="hb-hud"><span>${lampHtml(f.oil, b.lamp)}</span><span class="small"><b>Turn ${f.t}</b> of ${HC.TICKS + HC.DRAIN}${f.t > HC.TICKS ? ' · draining' : ''}</span></div>
          ${boardHtml(b, st, f, spec)}</div><div class="hb hb-r">
          <ul class="hb-log" aria-live="polite">${lines.slice(0, 4).map(l => `<li>${l}</li>`).join('')}</ul>
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
      const body = U.panel(`<div class="hb hb-after">
        <div class="verdict-row"><div class="verdict ${res.won ? 'ok' : 'bad'}">${head}</div></div>
        <div class="hb-stats"><span class="hb-st hb-stl">${lampHtml(res.oilLeft, b.lamp)}<small>oil ${res.oilLeft} of ${b.lamp}</small></span>
          <span class="hb-vs">${stat('🏆', res.score, 'score', 'hb-big')}${par ? `<span class="hb-vsx" aria-hidden="true">vs</span>${stat('⛳', par.score, 'par')}` : ''}</span>
          ${stat('👥', res.served, 'served')}${stat('🔥', res.burned, 'burned')}${stat('🪙', res.coins, 'coins')}</div>
        <ul class="hb-results">${mons}</ul>
        ${backs ? `<p class="td-head">What your cards really did</p><ul class="hb-backs">${backs}</ul>` : '<p class="small">You deployed with no changes, so you saw the failure as it is.</p>'}
        ${res.won && stars < 3 ? `<p class="small muted">${st.deploy > 1 ? 'Catch it on the first deploy for 2 stars.' : 'Par is the best plan within budget. A cheaper plan, or one that burns less oil, gets there.'}</p>` : ''}
        ${can ? `<p class="hb-left"><span class="hb-pips" aria-hidden="true">${'▲'.repeat(left)}</span> <b>${left} deploy${left === 1 ? '' : 's'} left</b> <span class="small">· the oil you burned stays burned</span></p>` : ''}
        ${!res.won && !can ? '<p class="small">No deploys or oil left. It escapes.</p>' : ''}
        <button class="primary hb-go" id="hb-next">${res.won ? (opts.debrief ? 'Debrief: why did that work?' : 'Done') : can ? 'Change the plan' : 'Continue'}</button></div>`,
      { title: opts.title || 'MONSTER HUNT', noClose: true, cls: 'hn-simwin' });
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
    .hb-row { list-style: none; margin: 4px 0; padding: 0; display: grid; gap: 2px; }
    .hb-arrow { text-align: center; font-weight: 800; opacity: .5; line-height: 1; }
    .hb-row { padding: 8px; border-radius: 10px; background: radial-gradient(120% 80% at 15% 0%, #3a2c1a 0%, #17131c 55%, #0d0b10 100%); box-shadow: inset 0 0 0 2px #0c0a10, inset 0 0 30px rgba(0, 0, 0, .8); }
    .hb-tile { position: relative; display: grid; gap: 4px; padding: 7px 10px; border: 2px solid #5a4630; border-radius: 6px; color: #efe6d2; background: linear-gradient(#2a2230, #1d1822); box-shadow: 0 2px 0 #0c0a10; }
    .hb-tile .muted { color: #b7a98f; }
    .hb-tile.hb-mon { min-height: 72px; padding-left: 74px; border-color: #8a2a22; background: radial-gradient(90% 120% at 0% 50%, rgba(255, 150, 60, .22), transparent 60%), linear-gradient(#30202a, #1d1418); }
    .hb-tile.hb-mon .hb-spr { position: absolute; left: 6px; top: 50%; transform: translateY(-50%); }
    .hb-spr { width: 56px; height: 56px; object-fit: contain; image-rendering: pixelated; filter: drop-shadow(0 0 6px rgba(255, 140, 50, .45)); }
    .hb-spr.hb-sm { width: 32px; height: 32px; vertical-align: middle; position: static; transform: none; filter: none; }
    .hb-spr.hb-jarred { filter: grayscale(1) brightness(.7); opacity: .7; }
    .hb-spr.hb-bite { animation: hbBite .35s ease-out; filter: drop-shadow(0 0 8px rgba(255, 60, 40, .9)); }
    @keyframes hbBite { 0% { transform: translateY(-50%) scale(1); } 40% { transform: translateY(-50%) translateX(6px) scale(1.18) rotate(-4deg); } 100% { transform: translateY(-50%) scale(1); } }
    @media (prefers-reduced-motion: reduce) { .hb-spr.hb-bite { animation: none; } }
    .hb-monb { color: #ff9a7a !important; }
    .hb-arrow { color: #b7a98f; }
    .hb-tn { font-weight: 800; display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: baseline; }
    .hb-monb { font-size: 13px; }
    .hb-live { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; min-height: 22px; }
    .hb-chips { display: flex; flex-wrap: wrap; gap: 4px; }
    .hb-chip { font: 700 12px var(--f-body); padding: 3px 8px; border: 2px solid #c9a24a; border-radius: 999px; background: #3a2c14; color: #ffe2a0; cursor: pointer; }
    .hb-bucket { display: inline-flex; gap: 3px; } .hb-bucket i { width: 14px; height: 14px; border-radius: 50%; border: 2px solid #8a7a60; background: transparent; }
    .hb-bucket i.on { background: radial-gradient(circle at 35% 35%, #c9e4ff, #3a78c2); }
    .hb-stamp { font: 800 12px/1 var(--f-head); letter-spacing: .06em; padding: 3px 6px; border: 2px solid #ff5a46; color: #ff5a46; transform: rotate(-4deg); background: #2a0f0f; }
    .hb-crates { display: inline-flex; flex-wrap: wrap; gap: 2px; align-items: center; } .hb-crates i { width: 12px; height: 12px; border: 2px solid #5a3e1c; background: #e2b878; border-radius: 2px; }
    .hb-tag { font-size: 13px; padding: 2px 6px; border: 2px dashed #ff7a5a; border-radius: 4px; background: #2a1414; } .hb-tag.gone { opacity: .45; text-decoration: line-through; }
    .hb-chalk { font-family: var(--f-head); letter-spacing: .15em; }
    .hb-jar { font-size: 13px; padding: 2px 8px; border: 2px solid #7fbf8f; border-radius: 6px 6px 10px 10px; color: #cfeed6; background: #16261b; } .hb-jar.full { background: #2b5a37; font-weight: 800; }
    .hb-seal { font: 800 12px/1 var(--f-head); padding: 5px 8px; border-radius: 50px; border: 3px double currentColor; }
    .hb-seal.hb-ok { color: #8fe0a2; } .hb-seal.hb-red { color: #ff5a46; } .hb-seal.hb-grey { color: #c9bca4; }
    .hb-heads { display: inline-flex; gap: 6px; }
    .hb-head { display: grid; justify-items: center; gap: 1px; } .hb-head i { position: relative; width: 16px; height: 22px; border: 2px solid #8a7a60; border-radius: 4px; background: #241d16; overflow: hidden; }
    .hb-head i::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: calc(var(--fill) * 100%); background: #f0b53c; }
    .hb-head.hot i::after { background: #d0452f; } .hb-head small { font-size: 10px; }
    .hb-go { width: 100%; margin-top: 4px; }
    .hb-log { list-style: none; margin: 2px 0; padding: 6px 10px; min-height: 64px; border: 2px solid var(--ink); border-radius: 8px; background: #fffdf6; font-size: 13px; display: grid; gap: 2px; }
    .hb-yard { list-style: none; margin: 4px 0; padding: 0; display: grid; gap: 6px; }
    .hb-yb { width: 100%; display: flex; justify-content: space-between; gap: 8px; text-align: left; }
    .hb-yb[aria-disabled="true"] { opacity: .5; }
    .hb-stars { white-space: nowrap; color: #b8923a; font-size: 16px; }`;
  document.head.appendChild(css);
})();
