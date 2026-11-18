// The Night Watch (Ladi, Nov 17: one game per exam domain; then "a completely different map with a completely different
// game loop", then "combine the 3", and "build it in parallel with the other fixes and play it last"). Domain 2,
// Security, only. Storyboard: the Claude Doc "The Night Watch: new loop storyboard".
// Seo-yeon is the castle's night warden. Each night has three phases:
//   1. Day: hear the town's gossip, then set the locks and keys on the castle floor plan (this file).
//   2. Evening: the night shift, a walkable patrol to find and fix the breaches (a later build; for now the dawn
//      report shows each breach the plan left).
//   3. The raid, on the last night only: tower defense, with every missed breach coming back (a later build).
// Build step 1 (this file and js/watch-data.js): the moon calendar, the day's gossip and floor plan, the dawn report
// with candles and pay, and one verified Domain 2 debrief question on the night's task statement.
// Save: S.save.watch = { night (next to play, 0-8), silver, best: { nightId: candles }, missed: { slotId: count } }.
(function () {
  const M = SD.modes, U = SD.ui, S = SD.state, W = SD.watchData;
  if (!M || !W) return;
  const esc = s => U.esc(String(s == null ? '' : s));
  const E = () => SD.exam;
  const RES = { ok: ['✓', 'Narrow fix'], wide: ['⚠', 'Too wide: fined'], block: ['✗', 'Worker turned away'], leak: ['✗', 'Thief gets in'] };
  const CANDLE = ['Every errand done', 'No thief, no leak', 'No spare keys'];
  const SAY = {
    open: 'Somebody\'s been getting in after dark. Listen to the town by day, lock up by dusk, and we\'ll see who\'s right by morning.',
    plan: 'Tap a pin on the plan to change what\'s there. Narrow is good. Narrow is always good.',
    dawn: 'Morning. Let\'s see what the night made of your plan.',
    q: 'The Captain wants a word before you sleep. One question. Tell her how sure you are.'
  };

  const sv = () => {
    const s = S.save;
    s.watch = s.watch && s.watch.v === 2 ? s.watch : { v: 2, night: 0, silver: 0, best: {}, missed: {} };
    return s.watch;
  };
  const head = (who, mood) => {
    try { if (SD.art && SD.art.portrait) { const p = SD.art.portrait(who, 34, mood || 'neutral'); if (p) return `<span class="nw-head">${p}</span>`; } } catch (e) { /* no portrait yet */ }
    return '<span class="nw-head nw-head-x" aria-hidden="true">🗨️</span>';
  };
  const say = (who, line, mood) => `<p class="nw-say">${head(who, mood)}<span><b>${esc(who === 'seoyeon' ? 'Seo-yeon' : W.WHO[who] || who)}:</b> ${esc(line)}</span></p>`;
  const candles = c => `<span class="nw-candles" aria-label="${c.filter(Boolean).length} of 3 candles">${c.map((on, i) => `<span class="nw-c ${on ? 'on' : ''}" title="${esc(CANDLE[i])}">🕯️</span>`).join('')}</span>`;

  // ---- The moon calendar ----
  function calendar() {
    const w = sv();
    const moons = W.NIGHTS.map((n, i) => {
      const b = w.best[n.id], open = i <= w.night;
      return `<button class="nw-moon ${open ? '' : 'locked'} ${n.boss ? 'boss' : ''}" data-n="${i}" ${open ? '' : 'disabled'}>
        <span class="nw-mi">${b != null ? '🌕' : open ? '🌖' : '🌑'}</span><span class="nw-mn">Night ${i + 1}</span>
        <span class="nw-mt">${open ? esc(n.name) : '???'}</span>${b != null ? `<span class="nw-mb">${'🕯️'.repeat(b) || '—'}</span>` : ''}</button>`;
    }).join('');
    const b = U.panel(`${say('seoyeon', SAY.open, 'tired')}
      <p class="nw-silver">🪙 ${w.silver} silver saved</p>
      <div class="nw-moons">${moons}</div>`, { title: 'THE NIGHT WATCH' });
    b.querySelectorAll('.nw-moon:not(.locked)').forEach(el => el.onclick = () => day(+el.dataset.n));
  }

  // ---- Phase 1: the day ----
  function day(i) {
    const n = W.NIGHTS[i];
    const plan = {};
    n.set.forEach(([id, t]) => { plan[id] = t; });
    let pick = null;
    const draw = () => {
      const pins = room => n.set.filter(([id]) => W.SLOTS[id].room === room).map(([id]) => {
        const s = W.SLOTS[id], t = s.tiles[plan[id]];
        return `<button class="nw-pin ${pick === id ? 'on' : ''}" data-slot="${id}" aria-label="${esc(s.name)}: ${esc(t.label)}">
          <span class="nw-pi">${s.kind === 'key' ? '🗝️' : '🔒'}</span><span class="nw-pl">${esc(t.icon)} ${esc(t.label)}</span></button>`;
      }).join('');
      const roomHtml = id => {
        const r = W.ROOMS[id], lit = n.open.includes(id);
        return `<div class="nw-room ${lit ? 'lit' : 'dark'}" data-room="${id}"><span class="nw-rn">${r.icon} ${esc(r.name)}</span>
          <span class="nw-ra">${esc(r.aws)}</span>${lit ? pins(id) : ''}</div>`;
      };
      const grid = W.FLOORS.map(([f, label]) => {
        const rooms = W.ORDER.filter(id => W.ROOMS[id].floor === f);
        return `<div class="nw-floor" data-floor="${f}"><span class="nw-fl">${esc(label)}</span><div class="nw-frow" style="--n:${rooms.length}">${rooms.map(roomHtml).join('')}</div></div>`;
      }).join('<span class="nw-stairs" aria-hidden="true">⋮ stairs</span>');
      const s = pick && W.SLOTS[pick];
      const tray = s ? `<div class="nw-tray" role="group" aria-label="${esc(s.name)}"><p class="nw-ask"><b>${esc(s.name)}.</b> ${esc(s.ask)}</p>
        <div class="nw-tiles">${Object.keys(s.tiles).map(k => `<button class="nw-tile ${plan[pick] === k ? 'on' : ''}" data-tile="${k}"><span class="nw-ti">${esc(s.tiles[k].icon)}</span>${esc(s.tiles[k].label)}</button>`).join('')}</div></div>` : '';
      const body = U.panel(`<p class="nw-step">Night ${i + 1} · ${esc(n.name)} · <b>Day</b></p>
        <div class="nw-gossip">${n.clues.map(([who, line]) => say(who, line)).join('')}</div>
        ${say('mira', `Two of them agree it's the ${W.ROOMS[W.SLOTS[n.set[0][0]].room].name.toLowerCase()}. Start there.`, 'neutral')}
        <p class="nw-errands">${n.errands.map(e => `<span>🚶 ${esc(e)}</span>`).join('')}</p>
        <div class="nw-plan" aria-label="The castle floor plan">${grid}</div>
        ${tray || `<p class="nw-hint">${esc(SAY.plan)}</p>`}
        <div class="row"><button class="ghost" id="nw-back">Moons</button><button class="primary" id="nw-seal">Seal the plan</button></div>`, { title: 'THE NIGHT WATCH' });
      body.querySelectorAll('.nw-pin').forEach(el => el.onclick = () => { pick = pick === el.dataset.slot ? null : el.dataset.slot; draw(); });
      body.querySelectorAll('.nw-tile').forEach(el => el.onclick = () => { plan[pick] = el.dataset.tile; pick = null; draw(); });
      body.querySelector('#nw-back').onclick = calendar;
      body.querySelector('#nw-seal').onclick = () => dawn(i, plan);
    };
    draw();
  }

  // ---- Dawn: the report, pay and the debrief ----
  function dawn(i, plan) {
    const n = W.NIGHTS[i], r = W.score(n, plan), w = sv();
    r.breaches.forEach(x => { w.missed[x.id] = (w.missed[x.id] || 0) + 1; });
    const rows = r.rows.map(x => `<li class="nw-r ${x.res}"><span class="nw-rr">${RES[x.res][0]}</span><span><b>${esc(x.slot.name)}:</b> ${esc(x.slot.tiles[x.tile].label)} · <i>${RES[x.res][1]}</i><br><span class="nw-line">${esc(x.line)}</span></span></li>`).join('');
    const b = U.panel(`<p class="nw-step">Night ${i + 1} · ${esc(n.name)} · <b>Dawn</b></p>
      ${say('seoyeon', SAY.dawn)}
      <div class="nw-dawn">${candles(r.candles)}<span class="nw-cl">${r.candles.map((on, k) => `${on ? '✓' : '·'} ${CANDLE[k]}`).join('<br>')}</span></div>
      <ul class="nw-rows">${rows}</ul>
      ${r.breaches.length ? `<p class="nw-note">${r.breaches.length} breach${r.breaches.length > 1 ? 'es' : ''} left open. Soon you'll walk the castle at night to find and fix them. For now, they go in the ledger, and the raid on the last night remembers them.</p>` : ''}
      <p class="nw-silver">🪙 Pay: ${r.pay} silver</p>
      <div class="row"><button class="primary" id="nw-q">The Captain's question</button></div>`, { title: 'THE NIGHT WATCH' });
    b.querySelector('#nw-q').onclick = () => debrief(i, r);
  }
  function question(n) {
    const text = q => [q.q].concat(q.opts || []).join(' ');
    const inTask = q => String(E().taskOf(q) || '') === n.task, inDom = q => E().domainOf(q) === 2;
    for (const match of [q => inTask(q) && n.q.test(text(q)), inTask, inDom]) {
      const r = M.pick({ match, n: 1, verifiedOnly: true, mix: 0 });
      if (r.items[0]) return E().find(r.items[0].q);
    }
    return null;
  }
  async function debrief(i, r) {
    const n = W.NIGHTS[i], w = sv(), q = question(n);
    let bonus = 0, ok = null;
    if (q) {
      const a = await M.ask(q, { tally: M.newTally(), title: 'THE CAPTAIN\'S QUESTION' });
      if (!a.closed && !a.skipped) { ok = !!a.ok; if (ok) bonus = W.PAY.debrief; }
    }
    w.silver += r.pay + bonus;
    w.best[n.id] = Math.max(w.best[n.id] == null ? 0 : w.best[n.id], r.lit);
    if (i === w.night && i < W.NIGHTS.length - 1) w.night = i + 1;
    const pay = M.pay('watch');
    S.persist();
    const b = U.panel(`${say('seoyeon', ok === true ? 'The Captain nodded. That\'s practically a parade.' : ok === false ? 'The Captain sighed. We\'ll do better tomorrow.' : 'Get some sleep.', ok === false ? 'tired' : 'neutral')}
      <p class="nw-silver">🪙 +${r.pay + bonus} silver${bonus ? ` (with ${bonus} for the right answer)` : ''} · ${w.silver} saved</p>
      ${pay ? `<p class="small muted">${esc(pay)}</p>` : ''}
      <div class="row"><button class="primary" id="nw-cal">Back to the moons</button></div>`, { title: 'THE NIGHT WATCH' });
    b.querySelector('#nw-cal').onclick = calendar;
  }

  M.register({
    id: 'watch', name: 'The Night Watch', host: 'Seo-yeon', minutes: 'about 10',
    blurb: 'Hear the town\'s gossip by day, set the castle\'s locks and keys, and see who gets in by morning. Security only.',
    start: () => { M.walkFirst('watch', [
      { title: 'The day', html: '<p>Somebody\'s getting into the castle at night. In the day, listen to the gossip: it tells you which lock is wrong.</p>' },
      { title: 'The plan', html: '<p>The castle\'s floor plan shows tonight\'s locks (policies on rooms) and keys (what each worker may do). Tap a pin, then pick the narrowest setting that still lets the worker through.</p>' },
      { title: 'Dawn', html: '<p>Three candles: every errand done, no thief or leak, and no spare keys. Then one exam question from the Security domain.</p>' }
    ]).then(calendar); },
    status: () => { const w = S.save && S.save.watch; return w && w.v === 2 && (w.night || w.silver) ? `Night ${w.night + 1} of ${W.NIGHTS.length} · ${w.silver} silver` : ''; }
  });
  SD.watch = { calendar, day, dawn, question };

  const css = document.createElement('style');
  css.textContent = `
    body.in-mode[data-stage="watch"] #mode-stage .ms-bg { filter: brightness(.5) saturate(.7) hue-rotate(-14deg); }
    body.in-mode[data-stage="watch"] #mode-stage .ms-wash { background: linear-gradient(180deg, rgba(10, 18, 48, .6), rgba(6, 10, 28, .75)); }
    .nw-say { display: flex; gap: 8px; align-items: flex-start; margin: 6px 0; font-size: 14px; line-height: 1.35; }
    .nw-head { flex: none; width: 34px; height: 34px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; background: rgba(255,255,255,.08); }
    .nw-step { margin: 0 0 6px; font-size: 13px; letter-spacing: .02em; color: #b9c4ff; }
    .nw-silver { margin: 8px 0; font-weight: 700; color: #e9c56d; }
    .nw-moons { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .nw-moon { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 4px; border-radius: 10px; border: 1px solid rgba(185,196,255,.35); background: rgba(20,28,70,.55); color: inherit; font: inherit; cursor: pointer; }
    .nw-moon.boss { border-color: #e9c56d; }
    .nw-moon.locked { opacity: .45; cursor: default; }
    .nw-mi { font-size: 26px; } .nw-mn { font-size: 12px; color: #b9c4ff; } .nw-mt { font-size: 12.5px; font-weight: 700; text-align: center; } .nw-mb { font-size: 12px; }
    .nw-gossip { display: grid; gap: 2px; margin-bottom: 6px; }
    .nw-errands { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 8px; font-size: 12.5px; }
    .nw-errands span { padding: 3px 8px; border-radius: 999px; background: rgba(233,197,109,.14); border: 1px solid rgba(233,197,109,.4); }
    .nw-plan { display: grid; gap: 0; padding: 8px; border-radius: 12px; background: rgba(8,12,34,.7); border: 1px solid rgba(185,196,255,.3); }
    .nw-floor { padding: 6px; border-radius: 10px; background: rgba(255,255,255,.04); border: 1px solid rgba(185,196,255,.18); }
    .nw-fl { display: block; font-size: 10.5px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #b9c4ff; margin: 0 0 4px 2px; }
    .nw-frow { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 5px; }
    .nw-stairs { display: block; text-align: center; font-size: 11px; color: #7f8bc7; line-height: 1.4; }
    .nw-room { min-height: 64px; min-width: 0; overflow-wrap: break-word; hyphens: auto; padding: 6px; border-radius: 8px; border: 1px solid rgba(185,196,255,.35); display: flex; flex-direction: column; gap: 3px; }
    .nw-room.lit { background: rgba(40,52,110,.55); }
    .nw-room.dark { opacity: .35; border-style: dashed; }
    .nw-rn { font-size: 12.5px; font-weight: 700; } .nw-ra { font-size: 11px; color: #b9c4ff; }
    .nw-pin { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 4px; width: 100%; padding: 4px 5px; border-radius: 7px; border: 1px solid #e9c56d; background: rgba(233,197,109,.12); color: inherit; font: inherit; font-size: 11.5px; text-align: left; cursor: pointer; animation: nw-pulse 1.6s ease-in-out infinite; }
    .nw-pin.on { background: rgba(233,197,109,.35); animation: none; }
    @keyframes nw-pulse { 50% { box-shadow: 0 0 0 3px rgba(233,197,109,.25); } }
    @media (prefers-reduced-motion: reduce) { .nw-pin { animation: none; } }
    .nw-tray { margin-top: 8px; padding: 8px; border-radius: 10px; background: rgba(20,28,70,.85); border: 1px solid #e9c56d; }
    .nw-ask { margin: 0 0 6px; font-size: 13px; }
    .nw-tiles { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .nw-tile { display: flex; align-items: center; gap: 6px; padding: 8px; border-radius: 8px; border: 1px solid rgba(185,196,255,.4); background: rgba(255,255,255,.06); color: inherit; font: inherit; font-size: 13px; cursor: pointer; }
    .nw-tile.on { border-color: #e9c56d; background: rgba(233,197,109,.2); }
    .nw-ti { font-size: 18px; }
    .nw-hint { margin: 8px 0; font-size: 13px; color: #b9c4ff; }
    .nw-dawn { display: flex; gap: 12px; align-items: center; margin: 6px 0; }
    .nw-candles { font-size: 26px; } .nw-c { opacity: .25; filter: grayscale(1); } .nw-c.on { opacity: 1; filter: none; }
    .nw-cl { font-size: 12.5px; line-height: 1.5; }
    .nw-rows { list-style: none; padding: 0; margin: 6px 0; display: grid; gap: 6px; }
    .nw-r { display: flex; gap: 8px; padding: 6px 8px; border-radius: 8px; font-size: 13px; border-left: 4px solid #8a93b8; background: rgba(255,255,255,.05); }
    .nw-r.ok { border-left-color: #6fcf8a; } .nw-r.wide { border-left-color: #e9c56d; } .nw-r.block, .nw-r.leak { border-left-color: #ff7a7a; }
    .nw-rr { font-weight: 700; } .nw-line { font-size: 12px; color: #c9d0ee; }
    .nw-note { font-size: 12.5px; color: #c9d0ee; }
  `;
  document.head.appendChild(css);
})();
