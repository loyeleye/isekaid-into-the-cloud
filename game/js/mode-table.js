// The Counterfeit Table: the Look-Alike Cup's screen (design: project files game-modes/lookalike-cup-real/design.md,
// approved by Ladi Nov 16). The rules are js/duel-core.js (SD.table). The Look-Alike Cup's entry (js/mode-duel.js) opens
// this for every new night; a night saved under the old rules finishes the old way.
//   - All state is on the felt (L9): each square is a job card; his pin lies face up on his square with "his pin"
//     until you answer it; a held pin shows ✓, a cracked one a crack; his hand hovers over his next square.
//   - No walkthrough: Kagemaru's first line says what a square is, and each rule's first use carries one line
//     (SD.table.TEACH, once per save).
//   - The questions are the bill after each board: one bank question per thing owed (a wrong call, a failed pin, a
//     fake you let stand), up to 3, verified only, on the plain exam screen with the shared stake table (SD.modes.ask).
//     A miss's twin opens the next night's first bill.
//   - Saves after every step (S.save.table). Ends on the Counterfeit Rack or the last board, win or lose.
(function () {
  if (!SD.modes || !SD.table) return;
  const M = SD.modes, U = SD.ui, S = SD.state, T = SD.table, E = () => SD.exam, D = () => SD.topicDrill;
  const TITLE = 'THE LOOK-ALIKE CUP';
  const esc = s => U.esc(String(s == null ? '' : s));
  const sv = () => S.save;
  const keep = () => {
    const k = sv().table = sv().table || {};
    k.nights = k.nights | 0; k.taught = k.taught || {}; k.carryQ = k.carryQ || []; k.carryPins = k.carryPins || []; k.rec = k.rec || {};
    return k;
  };
  const cur = () => keep().night || null;
  const save = s => {
    const now = Date.now();
    if (typeof document === 'undefined' || !document.hidden) s.el = (s.el || 0) + (now - (s.tick || now));
    s.tick = now;
    keep().night = s; keep().taught = s.taught; S.persist();
  };
  const minutes = s => ((s.el || 0) + (document.hidden ? 0 : Date.now() - (s.tick || Date.now()))) / 60000;

  // ---- Music: the table under the board, the tenser loop for the Rack, the sting when the Cup is won ----
  const AU = () => (SD.audio && SD.audio.music ? SD.audio : null);
  let before = null;
  const tune = name => { const a = AU(); if (!a) return; if (before === null) before = a.loopName && !/^duel/.test(a.loopName) ? a.loopName : ''; a.music(name); };
  const untune = () => { const a = AU(); if (!a || before === null) return; a.music(before || null); before = null; };

  // ---- Kagemaru ----
  const SAY = {
    walkup: 'Shop\'s shut. I play one game a night, with one regular. Tonight that\'s you. Sit. Every square is a job, and I sell pins for every job. Mostly real ones.',
    sit: 'Same table, fresh stock. Some of it is even genuine.',
    held: 'Fine. It works. I have more.',
    failed: 'Cracked. That\'s mine now, thank you.',
    callFake: 'Ah. You checked the clasp. Rude, but correct.',
    callReal: 'Genuine. You called an honest pin a fake, so I\'ll take another square for the insult.',
    lay: 'There. That should do the job. Probably.',
    line: 'Three in a line. Unless you think one of them is paste.',
    boardMe: 'Hm. You checked the labels. How dull.',
    boardHim: 'That one\'s mine. Now, the bill.',
    bill: 'Now the bill. Everything you got wrong, I keep a note of. Pay it in answers.',
    billNone: 'Nothing owed? I\'ll find something. Here.',
    myPick: 'Your pick, since you lost. Bold. Or desperate.',
    hisPick: 'My pick. I know exactly what you\'re bad at. I keep a ledger.',
    rack: 'One board each. So, the Rack. Four pins, two of them genuine. Tell me which.',
    sudden: 'Closing time. One pin. Real or paste?',
    won: 'Won, have you. I\'ll have to start pricing you properly.',
    lost: 'Come back tomorrow. The stock rotates. Your mistakes don\'t. Ah ha ha.',
    edge: 'You won the Cup last time, so the house opens on the centre. Genuine, before you ask.',
    resume: 'Oh, you\'re back. I kept your seat, and the pins exactly where they were.'
  };
  // His pose at the table (PixelLab, assets/img/table/kage-<pose>.webp, CREDITS.md), by line. Freya's ring stays under
  // his glove until chapter 6's reveal, so after it he's the plain unmasked portrait, as js/vec-cast.js does.
  const POSE = { walkup: 'lay', sit: 'lay', lay: 'lay', edge: 'lay', line: 'hover', held: 'pay', boardMe: 'caught', callFake: 'caught', won: 'pay',
    failed: 'smug', callReal: 'smug', boardHim: 'smug', lost: 'smug', hisPick: 'ledger', myPick: 'hover', bill: 'ledger', billNone: 'ledger',
    rack: 'hover', sudden: 'hover', resume: 'lay' };
  const revealed = () => { const c6 = sv() && sv().c6; return !!(c6 && c6.w && c6.w.x && c6.w.x.reveal); };
  const kage = t => {
    const k = Object.keys(SAY).find(x => SAY[x] === t);
    if (!revealed() && k && POSE[k]) return `assets/img/table/kage-${POSE[k]}.webp`;
    return `assets/img/portraits/kagemaru-${revealed() ? 'neutral' : 'gloved'}.webp`;
  };
  const teachLine = (s, key) => { const t = T.teach(s, key); return t ? `<p class="ct-teach" role="status">${esc(t)}</p>` : ''; };
  const panel = (html, title) => U.panel(`<div class="ct">${html}</div>`, { title: title || TITLE, onClose: stopNow, cls: 'du-win ct-win' });
  function stopNow() { const s = cur(); if (s) save(s); untune(); if (SD.today && SD.today.render) SD.today.render(); }

  // ---- Pieces ----
  const SETC = { dq: '#3f5f80', kr: '#b8923a', sc: '#4f7f5c', tw: '#a8652d', kk: '#9e3a34' };
  const pinName = id => T.PINS[id].name;
  const jobTitle = j => j.needs.map(n => T.NEEDS[n].t).join(' + ');
  const jobWords = j => j.needs.map((n, k) => T.NEEDS[n].w[(j.w && j.w[k]) | 0]);
  const svgHand = () => '<svg viewBox="0 0 60 44" aria-hidden="true"><ellipse cx="30" cy="40" rx="20" ry="4" fill="#000" opacity=".35"/><path d="M14 30 q-4 -10 2 -12 l2 -10 q2 -4 5 0 l1 8 l2 -12 q3 -4 5 0 l1 12 l2 -10 q3 -4 5 0 l0 12 l3 -6 q4 -2 4 3 l-4 12 q-3 6 -10 6 h-10 q-6 0 -8 -3 z" fill="#5d4d85" stroke="#17131f" stroke-width="2"/></svg>';
  const STATE = { open: 'his pin, not yet answered', held: 'his pin, held when you called it', stood: 'his pin, left standing', cracked: 'his fake, cracked: yours', mine: 'your pin, held', failed: 'your pin cracked: his' };

  // ---- The stall: every screen is a beat in one full-screen scene (no panels) ----
  // Layers, back to front: his stall; Kagemaru, large, behind the counter (he breathes, leans toward the square you
  // touch, drums his fingers when you take your time, and jolts when a move lands); his line in a speech bubble at his
  // mouth; the counter, with whatever is on it this beat (the felt and your hand, his ledger, the tray and the bin).
  // The test is a cutaway to the job running in town.
  const still = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const CRACK = '<svg class="ct-crk" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 2 L20 14 L28 20 L18 30 L26 36 L22 46 M28 20 L40 16 M18 30 L6 34" fill="none" stroke="#17131f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  let idleT = 0;
  function world(o) {
    const t = o.say;
    const k = o.kage === false ? '' : `<div class="w-kage${o.lean != null ? ' lean' + o.lean : ''}${o.react ? ' react' : ''}" aria-hidden="true"><img src="${kage(t)}" alt="" width="128" height="128"></div>`;
    return `<div class="ct-world ${o.cls || ''}">
      <div class="w-bg" aria-hidden="true"></div>
      ${o.hud != null ? `<div class="w-hud">${o.hud}</div>` : ''}
      <div class="w-up">${o.back || ''}${k}${t ? `<p class="w-bubble" data-vo="${esc('kagemaru|' + t)}"><b class="w-sr">Kagemaru: </b>${esc(t)}</p>` : ''}${o.teach ? `<div class="w-teach">${o.teach}</div>` : ''}${o.over || ''}</div>
      <div class="w-down">${o.down || ''}</div>
    </div>`;
  }
  // After a scene is drawn: he starts drumming his fingers if you take more than a few seconds.
  function alive(body) {
    clearTimeout(idleT);
    const k = body.querySelector('.w-kage');
    if (k && !still()) idleT = setTimeout(() => { if (k.isConnected) k.classList.add('idle'); }, 9000);
  }
  const stopBtn = '<button class="w-mini" id="ct-stop">Stop for now</button>';
  const wireStop = body => { const b = body.querySelector('#ct-stop'); if (b) b.onclick = () => { clearTimeout(idleT); U.closePanel(); stopNow(); }; };

  // ---- The table: the felt lies on his counter in front of him, your pins along the bottom edge ----
  let selPin = null, selSq = null, ruleOpen = false;
  function feltHtml(s, o) {
    o = o || {};
    const b = s.b, nx = b.open < 0 ? T.nextSq(s, b) : -1;
    const cells = b.jobs.map((j, i) => {
      const x = b.cells[i], st = b.state[i], hard = j.needs.length > 1;
      const label = `${T.SQ[i]}: ${jobWords(j).join(' And: ')}${x ? '. ' + (x === 'me' ? 'Yours' : 'His') + ', ' + pinName(b.pins[i]) + ', ' + STATE[st] : '. Open'}${hard ? '. Two needs, counts double' : ''}`;
      const stamp = st === 'cracked' || st === 'failed' ? '<b class="ct-st crack" aria-hidden="true">✕</b>' : st === 'held' || st === 'mine' ? '<b class="ct-st ok" aria-hidden="true">✓</b>' : st === 'open' ? '<b class="ct-st open" aria-hidden="true">?</b>' : '';
      const owner = x ? `<span class="ct-own ${x}">${x === 'me' ? 'yours' : 'his'}</span>` : '';
      const piece = x ? `<span class="ct-piece${st === 'cracked' || st === 'failed' ? ' cracked' : ''}"><img src="assets/img/table/pin-${b.pins[i]}.webp" alt="" width="48" height="48">${CRACK}</span>` : '';
      const hand = !x && i === nx ? `<span class="ct-hand">${svgHand()}<span class="du-word">his next</span></span>` : '';
      const cls = `ct-sq set-${j.set}${x ? ' taken ' + x : ''}${hard ? ' hard' : ''}${i === selSq ? ' on' : ''}${i === b.open ? ' open' : ''}`;
      return `<button class="${cls}" data-sq="${i}" aria-label="${esc(label)}" style="--sc:${SETC[j.set]}" ${o.still ? 'tabindex="-1"' : ''}>
        <span class="ct-job">${esc(jobTitle(j))}</span>${hard ? '<span class="ct-two" aria-hidden="true">××</span>' : ''}${piece}${owner}${stamp}${hand}</button>`;
    }).join('');
    return `<div class="du-felt ct-felt"><div class="ct-grid">${cells}</div></div>`;
  }
  // The job card: the picked square's job, lifted off the felt (his open square when nothing is picked).
  function slipHtml(s) {
    const b = s.b, i = selSq != null ? selSq : b.open;
    if (i == null || i < 0) return '<div class="w-card ct-slip muted"><p class="small">Tap a square to read its job.</p></div>';
    const j = b.jobs[i], x = b.cells[i];
    const who = x ? (x === 'me' ? 'Yours' : 'His') + `: ${pinName(b.pins[i])} (${STATE[b.state[i]]}).` : 'Open.';
    return `<div class="w-card ct-slip" style="--sc:${SETC[j.set]}"><p class="w-cardh">${esc(T.SQ[i])} · ${esc(T.SETS[j.set].name)}${j.needs.length > 1 ? ' · two needs' : ''}</p>
      ${jobWords(j).map(w => `<p class="ct-need">${esc(w)}</p>`).join('')}<p class="small">${esc(who)}</p></div>`;
  }
  function hud(s) {
    const b = s.b, k = s.boards.length + 1, nb = T.boardsTonight(s);
    return `<span class="du-hud"><span><b>Board ${k}${nb > 1 ? ' of ' + nb : ''}</b> · ${esc(T.SETS[b.lead].name)}${b.partner ? ' + ' + esc(T.SETS[b.partner].name) : ''}</span>${nb > 1 ? `<span>Boards ${s.score[0]}–${s.score[1]}</span>` : ''}<span>Night ${s.n}</span></span>`;
  }
  const RULE = 'He takes his winning square, else blocks your two in a line, else a square that gives him two in a line, else the square on the most lines he can still win. The centre and corners carry two needs and count double if the board fills with no line. A tie goes to the house.';
  function tableScreen(s, msg, teach, react) {
    tune('duel');
    const b = s.b;
    const empties = b.cells.some(x => !x);
    if (selPin && !b.hand.includes(selPin)) selPin = null;
    if (selSq != null && b.cells[selSq]) { if (selSq !== b.open) selSq = null; }
    const canPlace = selPin && selSq != null && !b.cells[selSq];
    const open = b.open >= 0 ? b.pins[b.open] : null;
    const hint = !empties ? 'The board is full. Call his last pin or let it stand.' : selPin && selSq == null ? 'Now tap an open job.' : !selPin && selSq != null && !b.cells[selSq] ? 'Now pick a pin from your hand.' : 'Pick a pin and an open job, or call his pin.';
    const lean = selSq != null ? selSq % 3 : null;
    const body = panel(world({
      cls: 'table', say: msg || SAY.lay, teach, react, lean,
      hud: `${hud(s)}<span class="w-hudb"><button class="w-mini" id="ct-rule" aria-expanded="${ruleOpen}">His rule</button>${stopBtn}</span>`,
      over: `${slipHtml(s)}${ruleOpen ? `<div class="w-card w-rule"><p class="w-cardh">His rule</p><p class="small">${esc(RULE)}</p></div>` : ''}`,
      down: `<div class="ct-play"><div class="ct-board" role="region" aria-label="The felt">${feltHtml(s)}</div>
        <div class="ct-side"><div class="ct-acts">
          ${canPlace ? `<button class="primary" id="ct-place">Lay ${esc(pinName(selPin))} on the ${esc(T.SQ[selSq])}</button>` : `<p class="small ct-hint">${esc(hint)}</p>`}
          ${open ? `<button class="${canPlace ? 'ghost' : 'primary'}" id="ct-call" aria-label="Call his ${esc(pinName(open))} a fake">✋ Call his pin a fake</button>` : ''}
          ${!empties ? '<button class="ghost" id="ct-stand">Let it stand</button>' : ''}
        </div>
        <div class="ct-hand-row" role="group" aria-label="Your pins">${b.hand.map(id => `<button class="ct-hpin${id === selPin ? ' on' : ''}" data-pin="${id}" aria-pressed="${id === selPin}" style="--pc:${SETC[T.PINS[id].set]}"><img src="assets/img/table/pin-${id}.webp" alt="" width="48" height="48"><span>${esc(pinName(id))}</span></button>`).join('')}</div></div></div>`
    }));
    body.querySelectorAll('[data-pin]').forEach(el => el.onclick = () => { selPin = selPin === el.dataset.pin ? null : el.dataset.pin; tableScreen(s, msg); });
    body.querySelectorAll('[data-sq]').forEach(el => el.onclick = () => { const i = +el.dataset.sq; selSq = selSq === i ? null : i; tableScreen(s, msg); });
    const pl = body.querySelector('#ct-place'), ca = body.querySelector('#ct-call'), stn = body.querySelector('#ct-stand');
    if (pl) pl.onclick = () => move(s, { pin: selPin, sq: selSq });
    if (ca) ca.onclick = () => move(s, { call: true });
    if (stn) stn.onclick = () => move(s, { stand: true });
    body.querySelector('#ct-rule').onclick = () => { ruleOpen = !ruleOpen; tableScreen(s, msg); };
    wireStop(body); alive(body);
  }

  // A move, then its test.
  function move(s, act) {
    const r = T.act(s, act);
    selPin = null; selSq = null; ruleOpen = false;
    if (!r) return tableScreen(s);
    if (r.kind === 'stand') { const who = T.after(s); save(s); return who ? boardOver(s) : tableScreen(s, SAY.lay, '', true); }
    save(s);
    testScreen(s, r);
  }

  // ---- The test: a cutaway. He lifts the pin to the lamp; the screen cuts to the job running in town. The job's slip
  // runs into the pin and through it (✓), or drops while the pin shakes and cracks (✕); a call opens with his hammer.
  // Each need's line shows as it runs, and every line stays on screen at the end. Instant under reduced motion. ----
  let benchId = 0;
  function playBench(el, steps, o) {
    const id = ++benchId, run = el.querySelector('.ct-run'), cap = o.cap;
    const at = (ms, f) => setTimeout(() => { if (id === benchId && el.isConnected) f(); }, ms);
    const end = () => { run.classList.remove('go', 'pass', 'drop'); if (!o.held) run.classList.add('cracked'); el.classList.add('done'); cap.innerHTML = o.final; if (o.after) o.after(); };
    if (still()) return end();
    let t = 500;   // the cut in
    if (o.call) { at(t, () => run.classList.add('hit')); t += 650; }
    steps.forEach(st => {
      at(t, () => { run.classList.remove('go', 'pass', 'drop'); void run.offsetWidth; run.classList.add('go'); cap.innerHTML = st.need; });
      t += 650;
      at(t, () => { run.classList.add(st.ok ? 'pass' : 'drop'); if (!st.ok) run.classList.add('cracked'); cap.innerHTML = st.need + st.line; });
      t += 1500;
    });
    at(t, end);
  }
  function benchHtml(pin, set, o) {
    return `<div class="ct-bench${o.call ? ' call' : ''}${o.held ? ' held' : ' cracked'}" style="--sc:${SETC[set]}">
      <img class="ct-scene" src="assets/img/table/scene-${set}.webp" alt="" width="192" height="96">
      <div class="ct-run" aria-hidden="true">
        <img class="ct-tok" src="assets/img/table/tok-${set}.webp" alt="" width="64" height="64">
        <span class="ct-bpin"><img src="assets/img/table/pin-${pin}.webp" alt="" width="48" height="48">${CRACK}</span>
        ${o.call ? '<img class="ct-ham" src="assets/img/table/hammer.webp" alt="" width="64" height="64">' : ''}
        <span class="ct-goal">✓</span>
      </div>
      <b class="ct-stamp ${o.held ? 'ok' : 'crack'}">${o.held ? 'HOLDS' : 'CRACKS'}</b>
    </div>`;
  }
  function testScreen(s, r) {
    const b = s.b, j = b.jobs[r.sq];
    const verdict = r.kind === 'call' ? (r.ok ? 'Fake. It cracks, and the square is yours.' : 'Genuine. It holds, and stays his.') : (r.ok ? 'It holds. The square is yours.' : 'It cracks. He takes the square.');
    const msg = r.kind === 'call' ? (r.ok ? SAY.callFake : SAY.callReal) : (r.ok ? SAY.held : SAY.failed);
    const tk = r.kind === 'call' ? (r.ok ? 'callFake' : 'callReal') : (r.ok ? 'hold' : 'fail');
    const extra = r.extra != null ? `<p class="small">He helps himself to the ${esc(T.SQ[r.extra])} as well, with ${esc(pinName(b.pins[r.extra]))}. It stands untested.</p>` : '';
    const words = l => T.NEEDS[l.need].w[(j.w && j.w[j.needs.indexOf(l.need)]) | 0];
    const steps = r.test.lines.map(l => ({ ok: l.ok, need: `<span class="small ct-capneed">${esc(words(l))}</span>`, line: `<span class="ct-capline ${l.ok ? 'ok' : 'bad'}">${l.ok ? '✓' : '✕'} ${esc(l.line)}</span>` }));
    const held = r.test.ok;
    const body = panel(world({
      cls: 'cut', kage: false, say: msg,
      teach: `${teachLine(s, tk)}${j.needs.length > 1 ? teachLine(s, 'chalk') : ''}`,
      hud: `<span class="du-hud"><span><b>The test</b> · ${esc(T.SQ[r.sq])} · ${esc(T.SETS[j.set].name)} · ${esc(pinName(r.pin))}</span></span>`,
      back: benchHtml(r.pin, j.set, { call: r.kind === 'call', held }),
      down: `<div class="ct-test ${held ? 'held' : 'cracked'}"><p class="ct-cap" aria-live="polite"></p><p class="ct-verdict"><b>${esc(verdict)}</b></p>${extra}</div>
        <div class="row"><button class="primary" id="ct-next">Back to the table</button></div>`
    }));
    const bench = body.querySelector('.ct-bench');
    playBench(bench, steps, { call: r.kind === 'call', held, cap: body.querySelector('.ct-cap'), final: steps.map(x => x.need + x.line).join(''),
      after: () => { if (U.burst && (held ? r.kind === 'place' : r.kind === 'call')) U.burst(bench.querySelector('.ct-stamp')); } });
    body.querySelector('#ct-next').onclick = () => {
      benchId++;
      const who = T.after(s);
      save(s);
      if (who) return boardOver(s);
      const c = s.b.cells.slice(); c[s.b.open] = null;
      const threat = s.b.open >= 0 && T.line(s.b.cells, 'him') && !T.line(c, 'him');
      tableScreen(s, threat ? SAY.line : SAY.lay, threat ? teachLine(s, 'line') : '', true);
    };
  }

  // ---- Board over: the felt as it ended, and his ledger shows any fakes you let stand ----
  function boardOver(s) {
    const last = s.boards[s.boards.length - 1], b = s.b;
    const stood = b.cells.map((x, i) => (x === 'him' && b.state[i] === 'stood' && !b.stock[i].real && b.pins[i] === b.stock[i].pin ? i : -1)).filter(i => i >= 0);
    const fakes = b.stock.filter(x => !x.real).length;
    const body = panel(world({
      cls: 'over', say: last.res === 'me' ? SAY.boardMe : SAY.boardHim, react: true,
      teach: stood.length ? teachLine(s, 'stood') : '',
      hud: `${hud(Object.assign({}, s, { boards: s.boards.slice(0, -1) }))}`,
      over: `<p class="w-banner ${last.res === 'me' ? 'me' : 'him'}">Board ${s.boards.length} to ${last.res === 'me' ? 'you' : 'Kagemaru'}</p>`,
      down: `<div class="ct-play"><div class="ct-board">${feltHtml(s, { still: true })}</div><div class="ct-side">
        <p class="td-big w-sr">Board ${s.boards.length} to ${last.res === 'me' ? 'you' : 'Kagemaru'}.</p>
        ${last.byCount ? '<p class="small">No line, so it went to the count (the centre and corners count double). A tie goes to the house.</p>' : ''}
        <div class="ct-ledger"><p class="small"><b>His ledger.</b> He brought ${fakes} fakes and ${9 - fakes} genuine pins to this board.</p>
        ${stood.length ? `<p class="small">Fakes you let stand: ${stood.map(i => `<b>${esc(pinName(b.pins[i]))}</b> on "${esc(jobTitle(b.jobs[i]))}" (${esc(T.NEEDS[b.jobs[i].needs.find(n => !T.holds(b.pins[i], n))].why[b.pins[i]])})`).join('; ')}.</p>` : '<p class="small">You let none of his fakes stand.</p>'}</div>
        <div class="row"><button class="primary" id="ct-bill">He opens his ledger</button></div></div></div>`
    }));
    body.querySelectorAll('.ct-sq').forEach(el => el.disabled = true);
    body.querySelector('#ct-bill').onclick = () => billScreen(s);
    alive(body);
  }

  // ---- The bill: "why did that one crack?" ----
  const qtext = q => [q.q].concat(q.opts || [], (q.items || []).map(i => i.t)).join(' ');
  function billQuestion(s, item, used) {
    const k = keep();
    // The twins rule first: last night's missed bill question, changed, opens the first bill.
    while (s.boards.length === 1 && k.carryQ.length) {
      const id = k.carryQ.shift(), q = E().find(id);
      if (q && E().allowed(q) && !used.has(q.id)) return q;
    }
    const re = T.PINS[item.pin].q;
    const r = M.pick({ match: q => re.test(qtext(q)), n: 1, verifiedOnly: true, mix: 0, avoid: Array.from(used) });
    const it = r.items[0];
    return it ? E().find(it.q) : null;
  }
  const twinOf = (q, used) => ((SD.twins && SD.twins[q.id]) || []).map(id => E().find(id)).filter(x => x && E().allowed(x) && D().isVerified(x) && !used.has(x.id))[0] || null;
  const WHY = { call: 'you called it a fake, and it held', place: 'it cracked on your square', stood: 'you let his fake stand', held: 'it held for you: prove you know why', carry: 'last night\'s Rack' };
  function billScreen(s) {
    const L = s.bill;
    s.billUsed = s.billUsed || [];
    if (!L.items.length && keep().carryPins.length) L.items.push(Object.assign({ why: 'carry' }, keep().carryPins.shift()));
    if (L.i >= L.items.length) return afterBill(s);
    const it = L.items[L.i];
    // His ledger, open across the counter: what you owe on the left, the line you're paying on the right.
    const list = L.items.map((x, k) => `<li class="${k < L.i ? 'done' : k === L.i ? 'on' : ''}"><img src="assets/img/table/pin-${x.pin}.webp" alt="" width="48" height="48"><span><b>${esc(pinName(x.pin))}</b>, ${esc(x.needs.map(n => T.NEEDS[n].t).join(' + '))}<i>${esc(WHY[x.why].replace(/^./, c => c.toUpperCase()))}.${k < L.i ? (L.res[k] && L.res[k].ok ? ' Paid ✓' : ' Still owed') : ''}</i></span></li>`).join('');
    const body = panel(world({
      cls: 'bill', say: L.i === 0 ? (L.items.some(x => x.why !== 'held') ? SAY.bill : SAY.billNone) : 'Next item.',
      hud: `<span class="du-hud"><span><b>His bill</b> · line ${L.i + 1} of ${L.items.length}</span></span><span class="w-hudb">${stopBtn}</span>`,
      down: `<div class="ct-book"><div class="ct-pg"><p class="ct-pgh">The bill</p><ul class="ct-bill">${list}</ul></div>
        <div class="ct-pg"><p class="ct-pgh">This line</p><p>${esc(pinName(it.pin))}: ${esc(T.PINS[it.pin].back)}</p>
          <p class="ct-pgnote">One exam question per line. Say how sure you are.</p>
          <button class="ct-paystamp" id="ct-pay">Pay line ${L.i + 1} of ${L.items.length}</button></div></div>`
    }), 'HIS BILL');
    wireStop(body); alive(body);
    body.querySelector('#ct-pay').onclick = async () => {
      clearTimeout(idleT);
      const used = new Set(s.billUsed);
      const q = billQuestion(s, it, used);
      if (!q) { T.paid(s, { ok: true, conf: 0 }); save(s); return billScreen(s); }
      untune();
      const r = await M.ask(q, { tally: s.tally, title: 'HIS BILL', context: `${pinName(it.pin)} · ${WHY[it.why]}` });
      if (r.closed || r.skipped) { save(s); return billScreen(s); }
      s.billUsed.push(q.id); used.add(q.id);
      const set = T.PINS[it.pin].set, rec = keep().rec[set] = keep().rec[set] || [0, 0, 0, 0];
      // [first-try right, first-try asked, right, asked] per set: the hypothesis's number (bill first-try accuracy).
      rec[3]++; if (r.ok) rec[2]++;
      if (!(keep().seenQ || []).includes(q.id)) { rec[1]++; if (r.ok) rec[0]++; keep().seenQ = (keep().seenQ || []).concat([q.id]).slice(-400); }
      if (!r.ok) { const tw = twinOf(q, used); keep().carryQ = keep().carryQ.concat([tw ? tw.id : q.id]).slice(-3); }
      s.billPts = (s.billPts | 0) + (r.pts | 0);
      T.paid(s, r);
      save(s);
      billScreen(s);
    };
  }
  function afterBill(s) {
    const ph = s.phase === 'bill' ? T.afterBill(s) : s.phase;
    save(s);
    if (ph === 'counter') return counterScreen(s);
    if (ph === 'rack') {
      if (minutes(s) > 14 && s.rack && s.rack.jobs.length > 1) T.startRack(s, true);
      save(s);
      return rackScreen(s);
    }
    return endScreen(s);
  }

  // ---- Picks: the trays of pins on his counter ----
  function rivalBtn(id) {
    const R = T.SETS[id], P = R.partner ? T.SETS[R.partner] : null, rec = keep().rec[id];
    const of = x => Object.keys(T.PINS).filter(p => T.PINS[p].set === x);
    const pins = of(id).slice(0, 5).concat(P ? of(R.partner).slice(0, 2) : []);
    return `<button class="du-rival ct-trayb" data-rival="${id}" style="--sc:${SETC[id]}">
      <span class="ct-tray" aria-hidden="true"><img class="ct-traybg" src="assets/img/table/pintray.webp" alt="" width="192" height="64"><span class="ct-traypins">${pins.map(p => `<img src="assets/img/table/pin-${p}.webp" alt="" width="48" height="48">`).join('')}</span></span>
      <span class="ct-trayt"><b>${esc(R.name)}</b> <span class="small">${esc(R.what)}${P ? ` Mixed with ${esc(P.name)}.` : ''}</span>
      <span class="small ct-trayrec">Your bill: ${rec && rec[3] ? `${rec[2]} of ${rec[3]} right` : 'nothing owed yet'}</span></span></button>`;
  }
  function pickScreen(s) {
    s.offers = s.offers || T.offers(s);
    const first = s.n === 1;
    const body = panel(world({
      cls: 'pick walkup', say: first ? SAY.walkup : SAY.sit, react: true, teach: first ? teachLine(s, 'first') : '',
      hud: `<span class="du-hud"><span><b>Night ${s.n}</b></span></span><span class="w-hudb">${stopBtn}</span>`,
      back: '<div class="w-shutter" aria-hidden="true"></div>',
      down: `<p class="w-ask">${s.offers.length > 1 ? 'Which tray first?' : 'Tonight\'s stock'}</p>
        <div class="ct-trays">${s.offers.map(rivalBtn).join('')}</div>
        <p class="small w-note">Night ${s.n}. ${T.boardsTonight(s) > 1 ? 'Two boards, and at one each, the Counterfeit Rack.' : 'One board tonight.'}${s.n >= 4 && s.weak.includes(s.offers[0]) ? ` ${esc(T.SETS[s.offers[0]].name)} is on offer because your bill says it's your weakest.` : ''}</p>`
    }));
    body.querySelectorAll('[data-rival]').forEach(el => el.onclick = () => { T.startBoard(s, el.dataset.rival); save(s); tableScreen(s, s.b.edge ? SAY.edge : SAY.lay, '', true); });
    wireStop(body); alive(body);
  }
  function counterScreen(s) {
    const c = s.counter;
    if (c.who === 'him') {
      const body = panel(world({
        cls: 'pick', say: SAY.hisPick, react: true, hud: '',
        down: `<p class="w-ask">He lost board 1, so he picks the stock: ${esc(T.SETS[c.pick].name)}.</p><div class="ct-trays">${rivalBtn(c.pick).replace('data-rival=', 'data-his=')}</div>
          <div class="row"><button class="primary" id="ct-go">Board 2</button></div>`
      }));
      body.querySelector('[data-his]').disabled = true;
      body.querySelector('#ct-go').onclick = () => { T.startBoard(s, c.pick); s.counter = null; save(s); tableScreen(s, SAY.lay, '', true); };
      return alive(body);
    }
    const body = panel(world({
      cls: 'pick', say: SAY.myPick, react: true, hud: '',
      down: `<p class="w-ask">You lost board 1, so you pick board 2.</p><div class="ct-trays">${c.offers.map(rivalBtn).join('')}</div>`
    }));
    body.querySelectorAll('[data-rival]').forEach(el => el.onclick = () => { T.startBoard(s, el.dataset.rival); s.counter = null; save(s); tableScreen(s, SAY.lay, '', true); });
    alive(body);
  }

  // ---- The Counterfeit Rack: he pulls the rack down behind him. Drag (or tap, then tap) each pin onto the velvet
  // tray (genuine) or into the scrap bin (fake) on the counter; then he takes his hammer to each one. ----
  let marks = null, rkSel = null;
  function rackPin(K, i) {
    const j = K.jobs[i], id = K.stock[i].pin;
    return `<button class="ct-rk ct-rkpin${rkSel === i ? ' on' : ''}" data-rk="${i}" style="--sc:${SETC[j.set]}" aria-pressed="${rkSel === i}"
      aria-label="${esc(pinName(id))} for: ${esc(jobWords(j)[0])}${marks[i] === true ? '. On the tray: genuine' : marks[i] === false ? '. In the bin: fake' : ''}">
      <img src="assets/img/table/pin-${id}.webp" alt="" width="48" height="48">${CRACK}<span class="ct-rkname">${esc(pinName(id))}</span>
      <span class="ct-rktag">${esc(T.NEEDS[j.needs[0]].t)}</span><b class="ct-rkst" aria-hidden="true"></b></button>`;
  }
  function rackScreen(s) {
    tune('duellast');
    const K = s.rack;
    const fresh = !marks || marks.length !== K.jobs.length;
    if (fresh) { marks = Array(K.jobs.length).fill(null); rkSel = null; }
    const idx = K.jobs.map((_, i) => i);
    const hooks = idx.map(i => `<span class="ct-hook">${marks[i] === null ? rackPin(K, i) : ''}</span>`).join('');
    const zone = v => `<div class="ct-zone ${v ? 'real' : 'fake'}" data-zone="${v ? 1 : 0}">
      <img class="ct-zimg" src="assets/img/table/${v ? 'tray-real' : 'bin-fake'}.webp" alt="" width="128" height="64">
      <button class="ct-zbtn" data-zone="${v ? 1 : 0}" ${rkSel == null ? 'disabled' : ''}>${v ? 'Genuine: on the tray' : 'Fake: in the bin'}</button>
      <div class="ct-zpins">${idx.filter(i => marks[i] === v).map(i => rackPin(K, i)).join('')}</div></div>`;
    const sel = rkSel != null ? K.jobs[rkSel] : null;
    const slip = sel ? `<div class="w-card ct-slip" style="--sc:${SETC[sel.set]}"><p class="w-cardh">${esc(pinName(K.stock[rkSel].pin))} · ${esc(T.SETS[sel.set].name)}</p>${jobWords(sel).map(w => `<p class="ct-need">${esc(w)}</p>`).join('')}<p class="small">Drop it on the tray or in the bin.</p></div>`
      : `<div class="w-card ct-slip muted"><p class="small">${K.jobs.length === 1 ? 'One pin decides the Cup. Tap it to read its job.' : `Two are genuine. ${K.need} of ${K.jobs.length} right wins the Cup. Tap a pin to read its job.`}</p></div>`;
    const ready = marks.every(x => x !== null);
    const body = panel(world({
      cls: 'rack', say: K.jobs.length === 1 ? SAY.sudden : SAY.rack,
      hud: '<span class="du-hud"><span><b>The Counterfeit Rack</b></span></span>',
      back: `<div class="ct-rackwall${fresh ? ' enter' : ''}"><img class="ct-rackbg" src="assets/img/table/rack.webp" alt="" width="256" height="96"><div class="ct-hooks" role="group" aria-label="His rack">${hooks}</div></div>`,
      down: `${slip}<div class="ct-zones">${zone(true)}${zone(false)}</div>
        <div class="row"><button class="primary" id="ct-test" ${ready ? '' : 'disabled'}>Hand him the hammer</button></div>`
    }), 'THE COUNTERFEIT RACK');
    const put = (i, v) => { marks[i] = v; rkSel = null; rackScreen(s); };
    body.querySelectorAll('[data-rk]').forEach(el => {
      const i = +el.dataset.rk;
      el.onclick = () => { if (el.dataset.dragged) return; rkSel = rkSel === i ? null : i; rackScreen(s); };
      // Drag: the pin follows the finger; let go over the tray or the bin.
      el.onpointerdown = e => {
        const x0 = e.clientX, y0 = e.clientY; let moved = false;
        const over = ev => { const h = document.elementFromPoint(ev.clientX, ev.clientY); return h && h.closest ? h.closest('.ct-zone') : null; };
        const mv = ev => { const dx = ev.clientX - x0, dy = ev.clientY - y0; if (!moved && Math.hypot(dx, dy) < 8) return; moved = true; el.classList.add('drag'); el.style.transform = `translate(${dx}px, ${dy}px)`;
          el.style.visibility = 'hidden'; const z = over(ev); el.style.visibility = '';
          body.querySelectorAll('.ct-zone').forEach(x => x.classList.toggle('over', x === z)); };
        const up = ev => {
          removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up);
          if (!moved) return;
          el.dataset.dragged = 1; el.style.visibility = 'hidden';
          const z = over(ev);
          el.style.visibility = '';
          if (z) put(i, z.dataset.zone === '1'); else rackScreen(s);
        };
        addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
      };
    });
    body.querySelectorAll('.ct-zbtn').forEach(el => el.onclick = () => { if (rkSel != null) put(rkSel, el.dataset.zone === '1'); });
    alive(body);
    body.querySelector('#ct-test').onclick = () => {
      if (!marks.every(x => x !== null)) return;
      clearTimeout(idleT);
      const m = marks.slice();
      const r = T.settleRack(s, m);
      // A wrong mark comes back as tomorrow's first bill item.
      r.tests.forEach((t, i) => { if (t.ok !== m[i]) keep().carryPins = keep().carryPins.concat([{ pin: K.stock[i].pin, needs: K.jobs[i].needs }]).slice(-3); });
      s.rackRes = { right: r.right, won: r.won, lines: r.tests.map((t, i) => ({ ok: t.ok, mark: m[i], line: t.lines[0].line })) };
      marks = null; rkSel = null;
      save(s);
      // His hammer, one pin at a time: genuine ones ring, fakes crack. Then the end.
      body.querySelector('#ct-test').disabled = true;
      body.querySelectorAll('.ct-zbtn').forEach(b => b.disabled = true);
      if (still()) return endScreen(s);
      const k = body.querySelector('.w-kage'); if (k) k.classList.add('swing');
      idx.forEach((i, n) => setTimeout(() => {
        const el = body.querySelector(`[data-rk="${i}"]`); if (!el || !el.isConnected) return;
        el.classList.add('hit', r.tests[i].ok ? 'rang' : 'cracked', r.tests[i].ok === m[i] ? 'right' : 'wrong');
        el.querySelector('.ct-rkst').textContent = r.tests[i].ok === m[i] ? '✓' : '✕';
      }, 300 + n * 700));
      setTimeout(() => { if (body.isConnected) endScreen(s); }, 300 + idx.length * 700 + 900);
    };
  }

  // ---- The end: he pushes the tin cup across the counter (or puts it back on his shelf); his ledger page; Pip ----
  function endScreen(s) {
    const k = keep();
    if (!s.ended) {
      s.ended = Date.now(); s.phase = 'done';
      k.nights = s.n; k.cupLast = T.cupWon(s) ? 1 : 0; s.paid = M.pay('duel');
      save(s);
    }
    const won = T.cupWon(s);
    const tests = s.log.length, held = s.log.filter(l => l.ok).length;
    const calls = s.log.filter(l => l.kind === 'call'), right = calls.filter(l => l.ok).length;
    const rack = s.rackRes ? `<div class="ct-rackres">${s.rackRes.lines.map((x, i) => `<div class="ct-rr ${x.ok === x.mark ? 'ok' : 'bad'}"><img src="assets/img/table/pin-${s.rack.stock[i].pin}.webp" alt="" width="48" height="48"><b>${x.ok === x.mark ? '✓' : '✕'} ${x.ok ? 'Genuine' : 'Fake'}</b></div>`).join('')}</div>
      <ul class="ct-lines">${s.rackRes.lines.map((x, i) => `<li class="${x.ok === x.mark ? 'ok' : 'bad'}"><b>${esc(pinName(s.rack.stock[i].pin))}</b>: ${esc(x.line)}${x.ok === x.mark ? '' : ` (you marked it ${x.mark ? 'genuine' : 'fake'})`}</li>`).join('')}</ul>` : '';
    const mins = Math.max(1, Math.round(minutes(s)));
    const body = panel(world({
      cls: 'end ' + (won ? 'won' : 'lost'), say: won ? SAY.won : SAY.lost, react: true, hud: '',
      over: `<img class="w-cup" src="assets/img/table/cup.webp" alt="${won ? 'The tin cup, yours' : 'The tin cup, back on his shelf'}" width="96" height="96">`,
      down: `<p class="td-big w-headline">${won ? 'The tin cup is yours until tomorrow night.' : 'The cup stays on his shelf tonight.'}</p>
        ${s.rackRes ? `<p><b>The Rack: ${s.rackRes.right} of ${s.rack.jobs.length} right.</b></p>${rack}` : ''}
        <div class="ct-page"><p class="ct-pageh">His ledger</p>
          <p><span>Pins tested</span><b>${tests}</b></p><p><span>Held</span><b>${held}</b></p>
          <p><span>Calls</span><b>${calls.length}</b></p><p><span>Fakes caught</span><b>${right}</b></p>
          <p><span>The bill</span><b>${M.sgn(s.billPts | 0)}</b></p><p><span>Time at the table</span><b>${mins} ${mins === 1 ? 'min' : 'mins'}</b></p></div>
        ${s.paid ? `<p class="small"><b>${esc(s.paid)}</b></p>` : ''}
        <p class="small w-note">Tomorrow the stock rotates. Anything still owed opens the first bill.</p>
        ${M.pipHtml()}
        <div class="row"><button class="primary" id="ct-done">Walk back</button></div>`
    }), 'HIS LEDGER');
    M.pipWire(body, 'The Look-Alike Cup');
    body.querySelector('#ct-done').onclick = () => { clearTimeout(idleT); U.closePanel(); stopNow(); };
    alive(body);
    if (won && !s.jingled && AU() && SD.audio.jingle) { s.jingled = 1; save(s); SD.audio.jingle('duelcup', ''); }
  }

  // ---- Start and resume ----
  function draw(s, msg) {
    if (s.phase === 'pick') return pickScreen(s);
    if (s.phase === 'board') return tableScreen(s, msg || (s.b.edge && !s.b.turns ? SAY.edge : SAY.resume));
    if (s.phase === 'bill') return billScreen(s);
    if (s.phase === 'counter') return counterScreen(s);
    if (s.phase === 'rack') return rackScreen(s);
    return endScreen(s);
  }
  function start(o) {
    o = o || {};
    let s = cur();
    if (s && s.v === 2 && s.phase !== 'done' && !o.fresh) { s.tick = Date.now(); return draw(s); }
    const k = keep();
    // Weakest set first, by the bill's right rate (a set with nothing asked yet counts as 60%).
    const rate = id => { const r = k.rec[id]; return r && r[3] ? r[2] / r[3] : 0.6; };
    const weak = T.RIVALS.slice().sort((a, z) => rate(a) - rate(z)).filter(id => rate(id) < 0.6);
    s = T.newNight({ night: k.nights + 1, seed: (o.seed != null ? o.seed : Date.now()) >>> 0, taught: k.taught, edge: !!k.cupLast, weak });
    s.tally = M.newTally(); s.el = 0; s.tick = Date.now();
    save(s);
    draw(s);
  }
  const status = () => { const s = cur(); return s && s.v === 2 && s.phase !== 'done' ? `Resume · night ${s.n}${s.b ? `, board ${s.boards.length + (s.phase === 'board' ? 1 : 0)}` : ''}` : ''; };
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
    const s = cur();
    if (!s || s.phase === 'done') return;
    const now = Date.now();
    if (document.hidden) s.el = (s.el || 0) + (now - (s.tick || now));
    s.tick = now;
  });
  SD.duelTable = { start, status, draw: () => { const s = cur(); if (s) draw(s); } };

  const css = document.createElement('style');
  css.textContent = `
    /* ---- The stall: one full-screen scene; the window's padding goes, the scene fills it ---- */
    body.in-mode #panel .win-b:has(> .ct > .ct-world) { padding: 0 !important; background: #0d0a12 !important; }
    .ct:has(> .ct-world) { max-width: none; min-height: 100%; display: flex; flex-direction: column; }
    .ct-world { position: relative; flex: 1; min-height: 100%; display: grid; grid-template-rows: auto minmax(170px, 1fr) auto; overflow-x: clip; color: #f4ecd8; isolation: isolate; }
    .w-bg { position: absolute; inset: 0; z-index: -2; background: url(assets/img/table/stall.webp) 30% 35% / cover no-repeat; image-rendering: pixelated; filter: brightness(.5) saturate(1.05); }
    .w-bg::after { content: ''; position: absolute; inset: 0; background: radial-gradient(70% 55% at 50% 30%, rgba(255, 190, 90, .22), transparent 70%), linear-gradient(transparent 40%, rgba(0, 0, 0, .55)); }
    .w-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .w-hud { position: relative; z-index: 4; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 4px 10px; padding: 6px 12px; background: linear-gradient(rgba(0, 0, 0, .55), transparent); text-shadow: 0 1px 2px #000; }
    .w-hud:empty { display: none; }
    .w-hud .du-hud { margin: 0; font-size: 13px; }
    .w-hudb { display: flex; gap: 6px; margin-left: auto; }
    .w-mini { min-height: 32px !important; padding: 2px 10px !important; font-size: 12px !important; border-radius: 16px !important; background: rgba(23, 19, 31, .6) !important; color: #f4ecd8 !important; border: 1px solid rgba(236, 228, 212, .35) !important; box-shadow: none !important; }
    /* Upper half: Kagemaru behind the counter, his bubble, the job card */
    .w-up { position: relative; z-index: 1; min-height: 170px; }
    .w-kage { position: absolute; left: 50%; bottom: -6px; height: min(100%, 440px); aspect-ratio: 1; transform: translateX(-50%); transform-origin: 50% 100%; transition: transform .5s ease; z-index: 1; }
    .w-kage img { width: 100%; height: 100%; image-rendering: pixelated; filter: drop-shadow(0 12px 18px #000); transform-origin: 50% 100%; animation: w-breathe 3.6s ease-in-out infinite; }
    @keyframes w-breathe { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.012, 1.03); } }
    .w-kage.lean0 { transform: translateX(-56%) rotate(-3deg); } .w-kage.lean2 { transform: translateX(-44%) rotate(3deg); } .w-kage.lean1 { transform: translateX(-50%) translateY(4%) scale(1.03); }
    .w-kage.react img { animation: w-react .55s ease-out, w-breathe 3.6s ease-in-out .55s infinite; }
    @keyframes w-react { 0% { transform: translateY(8%) scale(.96); } 45% { transform: translateY(-4%) scale(1.04); } 100% { transform: none; } }
    .w-kage.idle img { animation: w-drum .5s ease-in-out 6, w-breathe 3.6s ease-in-out 3s infinite; }
    @keyframes w-drum { 50% { transform: translateY(1.5%) rotate(-1deg); } }
    .w-kage.swing img { animation: w-drum .35s ease-in-out 8; }
    .w-bubble { position: absolute; z-index: 3; top: 8px; right: 10px; max-width: min(62%, 440px); margin: 0; padding: 8px 12px; border-radius: 14px; background: #f4ecd8; color: #17131f; font: 600 14.5px/1.3 Georgia, 'Times New Roman', serif; box-shadow: 0 6px 18px rgba(0, 0, 0, .65); }
    .w-bubble::after { content: ''; position: absolute; left: 22px; bottom: -10px; border: 10px solid transparent; border-top-color: #f4ecd8; border-bottom: 0; }
    .w-teach { position: absolute; z-index: 3; left: 10px; top: 8px; max-width: min(38%, 280px); }
    .w-teach .ct-teach { margin: 0 0 6px; padding: 6px 8px; font-size: 12.5px; background: rgba(23, 19, 31, .82); border-left: 4px solid var(--sun, #e2c26a); border-radius: 0 8px 8px 0; color: #f4ecd8; }
    .w-card { position: absolute; z-index: 3; right: 10px; bottom: 8px; width: min(52%, 340px); margin: 0; padding: 8px 10px; border-radius: 8px; border: 0; border-top: 6px solid var(--sc, #6a5a48); background: #efe3c2; color: #2a2018; transform: rotate(2deg); box-shadow: 0 10px 24px rgba(0, 0, 0, .7); font: 600 13.5px/1.3 Georgia, 'Times New Roman', serif; }
    .w-card p { margin: 0 0 4px; } .w-card .small { font-family: var(--f-body, sans-serif); color: #5a4636; }
    .w-card.muted { opacity: .92; }
    .w-cardh { font: 800 10.5px var(--f-body, sans-serif) !important; letter-spacing: .1em; text-transform: uppercase; color: var(--sc, #5a4636); }
    .w-card .ct-need { font-weight: 700; }
    .w-rule { right: auto; left: 10px; bottom: 8px; transform: rotate(-2deg); --sc: #5d4d85; }
    .w-banner { position: absolute; z-index: 3; left: 50%; bottom: 10px; transform: translateX(-50%) rotate(-3deg); margin: 0; padding: 6px 16px; border: 4px solid; border-radius: 8px; background: rgba(236, 230, 216, .95); font: 900 clamp(15px, 4.6vw, 22px) var(--f-body, sans-serif); letter-spacing: .05em; text-transform: uppercase; white-space: nowrap; max-width: 92%; animation: w-slam .4s cubic-bezier(.3, 1.6, .5, 1); }
    .w-banner.me { color: #2d7a3a; } .w-banner.him { color: #6e3a8e; }
    @keyframes w-slam { from { transform: translateX(-50%) rotate(-3deg) scale(1.3); opacity: 0; } }
    /* Lower half: the counter, and what's on it */
    .w-down { position: relative; z-index: 2; padding: 10px 12px calc(14px + env(safe-area-inset-bottom, 0px)); background: linear-gradient(#5e3d24, #3b2515 60%, #2c1b10); border-top: 6px solid #8a5a32; box-shadow: 0 -12px 28px rgba(0, 0, 0, .65), inset 0 2px 0 rgba(255, 220, 160, .18); }
    .w-down .small, .w-down p { color: #f1e6cc; }
    .w-down .w-card p { color: #2a2018; } .w-down .w-card .small { color: #5a4636; }
    .w-ask { margin: 0 0 6px; font-weight: 700; }
    .w-note { margin: 6px 0 0; opacity: .85; }
    .ct-felt { max-width: none !important; margin: 0 auto; padding: 0 !important; background: none !important; perspective: 900px; }
    .ct-grid { max-width: min(100%, 440px); margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; padding: 6px; border-radius: 10px; background: #2f5a3f; border: 9px solid #6b4426;
      transform: rotateX(24deg); transform-origin: 50% 100%; box-shadow: 0 18px 24px rgba(0, 0, 0, .6), inset 0 0 30px rgba(0, 0, 0, .35); }
    .ct-sq { position: relative; aspect-ratio: 1.15; min-height: 0; padding: 4px 3px 16px; border: 2px solid rgba(236, 230, 216, .45); border-top: 5px solid var(--sc); border-radius: 6px; background: #ece6d8; color: #17131f; display: flex; flex-direction: column; align-items: center; gap: 1px; text-align: center; box-shadow: none; font: inherit; cursor: pointer; }
    .ct-sq.hard { border-style: double; border-width: 4px; border-top: 5px solid var(--sc); }
    .ct-sq.on { outline: 3px solid #ffd27a; outline-offset: 1px; transform: translateY(-4px); box-shadow: 0 6px 10px rgba(0, 0, 0, .45); }
    .ct-sq.open { box-shadow: 0 0 0 3px #c9b6f0; }
    .ct-sq.taken.me { background: #dfe8d6; } .ct-sq.taken.him { background: #ded6ea; }
    .ct-sq:disabled { opacity: 1; cursor: default; }
    .ct-job { font: 700 10.5px/1.12 var(--f-body, sans-serif); overflow-wrap: anywhere; }
    .ct-sq.taken .ct-job { font-size: 9px; opacity: .7; }
    .ct-sq.hard .ct-job { padding: 0 8px; }
    .ct-two { position: absolute; top: 0; right: 3px; font: 800 9px var(--f-body, sans-serif); color: var(--sc); }
    .ct-own { position: absolute; bottom: 1px; left: 0; right: 0; font: 800 9px var(--f-body, sans-serif); letter-spacing: .05em; text-transform: uppercase; }
    .ct-own.me { color: #2d5a2a; } .ct-own.him { color: #4a3a6e; }
    .ct-st { position: absolute; top: 1px; left: 3px; font: 900 13px var(--f-body, sans-serif); }
    .ct-st.ok { color: #2d7a3a; } .ct-st.crack { color: #9e3a34; } .ct-st.open { color: #5d4d85; }
    .ct-piece { position: relative; width: 46%; max-width: 64px; aspect-ratio: 1; flex: none; }
    .ct-piece img { width: 100%; height: 100%; filter: drop-shadow(0 4px 2px rgba(0, 0, 0, .5)); }
    .ct-piece .ct-crk, .ct-bpin .ct-crk { position: absolute; inset: 8%; width: 84%; height: 84%; opacity: 0; }
    .ct-piece.cracked .ct-crk { opacity: 1; } .ct-piece.cracked img { filter: grayscale(.7) brightness(.8); }
    .ct-hand { position: absolute; inset: auto 0 1px 0; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
    .ct-hand svg { width: 30px; height: auto; }
    .ct-hand .du-word { font-size: 9px; }
    .ct-play { display: grid; gap: 8px; }
    .ct-acts { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 2px 0 6px; }
    .ct-acts button { min-height: 44px; }
    .ct-hint { margin: 0; text-align: center; width: 100%; }
    .ct-hand-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .ct-hpin { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 0; padding: 4px 2px !important; border-radius: 10px !important; background: rgba(23, 19, 31, .45) !important; border: 2px solid transparent !important; color: #f4ecd8 !important; box-shadow: none !important; transition: transform .15s; }
    .ct-hpin img { width: min(15vw, 64px); height: auto; filter: drop-shadow(0 6px 4px rgba(0, 0, 0, .6)); }
    .ct-hpin span { font: 700 10.5px/1.1 var(--f-body, sans-serif); text-align: center; overflow-wrap: anywhere; }
    .ct-hpin.on { transform: translateY(-10px) rotate(-4deg); border-color: #ffd27a !important; background: rgba(23, 19, 31, .75) !important; }
    .ct-hpin.on img { filter: drop-shadow(0 0 10px #ffd27a); }
    /* The cutaway: the job running in town, full width */
    .ct-world.cut .w-up { min-height: 220px; }
    .ct-world.cut .w-bubble { top: auto; bottom: 10px; right: auto; left: 10px; }
    .ct-world.cut .w-teach { top: 8px; left: 10px; max-width: 60%; }
    .ct-bench { position: absolute; inset: 0; overflow: hidden; animation: w-cutin .5s ease-out; }
    @keyframes w-cutin { from { clip-path: circle(4% at 50% 60%); filter: brightness(2); } to { clip-path: circle(80% at 50% 50%); } }
    .ct-bench .ct-scene { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; filter: brightness(.75) saturate(.95); margin: 0; border-radius: 0; aspect-ratio: auto; }
    .ct-run { position: absolute; inset: 0; }
    .ct-tok, .ct-bpin, .ct-ham, .ct-goal { position: absolute; top: 46%; }
    .ct-tok { width: 15%; max-width: 110px; height: auto; left: 2%; transform: translateY(-50%); opacity: 0; image-rendering: pixelated; filter: drop-shadow(0 3px 2px #0009); }
    .ct-bpin { left: 50%; width: 28%; max-width: 200px; aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(circle, rgba(255, 236, 170, .4), transparent 70%); }
    .ct-bpin img { width: 100%; height: 100%; filter: drop-shadow(0 6px 6px #000a) drop-shadow(0 0 16px rgba(255, 210, 122, .7)); }
    .ct-goal { right: 6%; transform: translateY(-50%); font: 900 clamp(28px, 8vw, 56px) var(--f-body, sans-serif); color: #7fdc8c; opacity: 0; text-shadow: 0 2px 3px #000; }
    .ct-ham { width: 18%; max-width: 120px; height: auto; left: 58%; top: 8%; transform-origin: 80% 80%; transform: rotate(40deg); opacity: 0; image-rendering: pixelated; }
    .ct-run.hit .ct-ham { animation: ct-ham .6s ease-in forwards; }
    @keyframes ct-ham { 0% { opacity: 1; transform: rotate(50deg); } 70% { opacity: 1; transform: rotate(-25deg); } 100% { opacity: 0; transform: rotate(-25deg); } }
    .ct-run.go .ct-tok { animation: ct-in .6s ease-out forwards; }
    .ct-run.go.pass .ct-tok { animation: ct-thru .9s ease-in forwards; }
    .ct-run.go.drop .ct-tok { animation: ct-drop .9s ease-in forwards; }
    @keyframes ct-in { from { opacity: 0; left: 2%; } 20% { opacity: 1; } to { opacity: 1; left: 30%; } }
    @keyframes ct-thru { from { opacity: 1; left: 30%; } 60% { opacity: 1; left: 72%; } to { opacity: 0; left: 80%; } }
    @keyframes ct-drop { from { opacity: 1; left: 30%; transform: translateY(-50%) rotate(0); } to { opacity: 0; left: 34%; transform: translateY(90%) rotate(70deg); } }
    .ct-run.pass .ct-bpin { animation: ct-glow .9s ease-out; }
    @keyframes ct-glow { 50% { box-shadow: 0 0 0 8px rgba(127, 220, 140, .6), 0 0 40px rgba(255, 236, 170, .9); } }
    .ct-run.pass .ct-goal { animation: ct-goal .9s ease-out forwards; }
    @keyframes ct-goal { from { opacity: 0; transform: translateY(-50%) scale(.4); } 60% { opacity: 1; transform: translateY(-50%) scale(1.2); } to { opacity: 1; transform: translateY(-50%) scale(1); } }
    .ct-run.drop .ct-bpin { animation: ct-shake .5s; }
    @keyframes ct-shake { 20%, 60% { transform: translate(-54%, -50%) rotate(-6deg); } 40%, 80% { transform: translate(-46%, -50%) rotate(6deg); } }
    .ct-run.cracked .ct-crk { opacity: 1; }
    .ct-run.cracked .ct-bpin img { filter: grayscale(.7) brightness(.8) drop-shadow(0 6px 6px #000a); }
    .ct-stamp { font: 900 18px var(--f-body, sans-serif); letter-spacing: .08em; padding: 2px 10px; border: 4px solid; border-radius: 8px; }
    .ct-stamp.ok { color: #2d7a3a; } .ct-stamp.crack { color: #9e3a34; }
    .ct-bench .ct-stamp { position: absolute; right: 8%; bottom: 18%; font-size: clamp(20px, 6vw, 36px); background: rgba(236, 230, 216, .94); opacity: 0; transform: rotate(-8deg) scale(2.2); transition: opacity .25s, transform .3s cubic-bezier(.3, 1.6, .5, 1); }
    .ct-bench.done .ct-stamp { opacity: 1; transform: rotate(-8deg) scale(1); }
    .ct-test { margin: 0 0 6px; }
    .ct-cap { min-height: 3.2em; margin: 0 0 4px; }
    .ct-capneed { display: block; opacity: .85; margin-top: 6px; }
    .ct-capline { display: block; font-weight: 700; } .ct-capline.ok { color: #9fe3a8; } .ct-capline.bad { color: #f0a29b; }
    .ct-verdict { margin: 4px 0; }
    .ct-lines { list-style: none; padding: 0; margin: 6px 0; }
    .ct-lines li { padding: 4px 0 4px 8px; border-left: 4px solid #4caf62; margin: 4px 0; }
    .ct-lines li.bad { border-left-color: #d0645c; }
    .ct-ledger { border: 2px dashed rgba(241, 230, 204, .5); border-radius: 8px; padding: 4px 8px; margin: 6px 0; }
    /* The bill: his ledger open across the counter */
    .ct-world.bill { grid-template-rows: auto minmax(130px, .6fr) auto; }
    .ct-book { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding: 8px; border-radius: 10px; background: #5a2e1c; box-shadow: 0 14px 28px rgba(0, 0, 0, .7); animation: w-open .5s ease-out; transform-origin: 50% 0; }
    @keyframes w-open { from { transform: perspective(800px) rotateX(-70deg); opacity: 0; } }
    .ct-pg { position: relative; padding: 10px 10px 12px; border-radius: 4px; color: #2a2018; background: repeating-linear-gradient(transparent 0 25px, rgba(80, 60, 40, .12) 25px 26px), linear-gradient(#f3e8cc, #e6d6ae); font: 600 14px/1.35 Georgia, 'Times New Roman', serif; display: flex; flex-direction: column; }
    .ct-pg p { color: #2a2018 !important; margin: 0 0 8px; }
    .ct-pgh { font: 800 11px var(--f-body, sans-serif) !important; letter-spacing: .12em; text-transform: uppercase; color: #7a2e22 !important; }
    .ct-pgnote { font: 500 12.5px var(--f-body, sans-serif) !important; color: #5a4636 !important; }
    .ct-bill { list-style: none; padding: 0; margin: 0; }
    .ct-bill li { display: grid; grid-template-columns: 34px 1fr; gap: 6px; align-items: start; margin: 0 0 10px; }
    .ct-bill li img { width: 34px; height: 34px; }
    .ct-bill li i { display: block; font-weight: 500; font-size: 12.5px; color: #5a4636; }
    .ct-bill li.done { opacity: .55; } .ct-bill li.on b { text-decoration: underline 2px #7a2e22; }
    .ct-paystamp { margin-top: auto; align-self: center; min-height: 44px; padding: 6px 14px !important; border: 3px solid #7a2e22 !important; border-radius: 8px !important; background: rgba(122, 46, 34, .08) !important; color: #7a2e22 !important; font: 900 14px var(--f-body, sans-serif) !important; letter-spacing: .06em; text-transform: uppercase; transform: rotate(-3deg); box-shadow: none !important; }
    /* The walk-up: the shutter rolls up; the trays on his counter */
    .w-shutter { position: absolute; inset: 0 0 auto; height: 100%; z-index: 2; background: repeating-linear-gradient(#4a3020 0 14px, #3a2416 14px 16px); box-shadow: 0 8px 20px #000; transform: translateY(-101%); animation: w-roll 1.2s ease-in .1s backwards; }
    @keyframes w-roll { from { transform: translateY(0); } }
    .ct-trays { display: grid; gap: 8px; }
    .ct-trayb { display: grid !important; grid-template-columns: 1fr; gap: 4px; text-align: left; padding: 6px 8px 8px !important; border-radius: 10px !important; background: rgba(23, 19, 31, .4) !important; border: 2px solid rgba(236, 228, 212, .25) !important; color: #f4ecd8 !important; box-shadow: none !important; }
    .ct-trayb:hover:not(:disabled) { border-color: #ffd27a !important; }
    .ct-tray { position: relative; display: block; width: 100%; max-width: 380px; margin: 0 auto; }
    .ct-traybg { display: block; width: 100%; height: auto; image-rendering: pixelated; }
    .ct-traypins { position: absolute; inset: 6% 6% 20%; display: flex; justify-content: space-evenly; align-items: center; }
    .ct-traypins img { width: 14%; max-width: 56px; height: auto; filter: drop-shadow(0 3px 2px #000a); }
    .ct-trayt .small { display: block; color: #e6dcc4; } .ct-trayrec { opacity: .85; }
    /* The Rack: on the wall behind him; the tray and the bin on the counter */
    .ct-world.rack .w-kage { height: min(58%, 300px); z-index: 0; }
    .ct-rackwall { position: absolute; z-index: 4; left: 50%; top: 4px; width: min(96%, 640px); transform: translateX(-50%); }
    .ct-rackwall.enter { animation: w-drop .6s cubic-bezier(.3, 1.4, .5, 1); }
    @keyframes w-drop { from { transform: translate(-50%, -110%); } }
    .ct-rackbg { display: block; width: 100%; height: auto; image-rendering: pixelated; filter: brightness(.85) drop-shadow(0 10px 14px #000); }
    .ct-hooks { position: absolute; inset: 14% 14% 22%; display: grid; grid-template-columns: repeat(4, 1fr); align-items: center; justify-items: center; }
    .ct-hook { min-width: 0; width: 100%; display: flex; justify-content: center; }
    .ct-world.rack .w-bubble { top: auto; bottom: 8px; right: auto; left: 10px; max-width: 46%; }
    .w-down .w-card { position: static; width: auto; max-width: 900px; margin: 0 auto 8px; transform: none; }
    .ct-rkpin { position: relative; display: flex; flex-direction: column; align-items: center; gap: 1px; width: 100%; max-width: 120px; min-height: 0; padding: 2px !important;
      border: 2px solid transparent !important; border-radius: 10px !important; background: transparent !important; color: #f4ecd8 !important; touch-action: none; cursor: grab; font: inherit; box-shadow: none !important; }
    .ct-rkpin.on { border-color: #ffd27a !important; background: rgba(23, 19, 31, .55) !important; }
    .ct-rkpin.drag { z-index: 20; cursor: grabbing; }
    .ct-rkpin > img { width: min(13vw, 64px); height: auto; filter: drop-shadow(0 4px 3px #000a); }
    .ct-rkpin .ct-crk { position: absolute; top: 4px; left: 50%; width: 40px; height: 40px; transform: translateX(-50%); opacity: 0; }
    .ct-rkpin.cracked .ct-crk { opacity: 1; } .ct-rkpin.cracked > img { filter: grayscale(.7) brightness(.8); }
    .ct-rkname { font: 700 10px/1.1 var(--f-body, sans-serif); text-align: center; overflow-wrap: anywhere; text-shadow: 0 1px 2px #000; }
    .ct-rktag { font: 600 9.5px/1.1 var(--f-body, sans-serif); opacity: .85; text-align: center; overflow-wrap: anywhere; text-shadow: 0 1px 2px #000; }
    .ct-hooks .ct-rktag, .ct-hooks .ct-rkname { display: none; }
    .ct-rkst { position: absolute; top: 0; right: 4px; font: 900 18px var(--f-body, sans-serif); }
    .ct-rkpin.right .ct-rkst { color: #7fdc8c; } .ct-rkpin.wrong .ct-rkst { color: #f0a29b; }
    .ct-rkpin.hit { animation: ct-hit .45s; }
    @keyframes ct-hit { 20%, 60% { transform: rotate(-8deg); } 40%, 80% { transform: rotate(8deg); } }
    .ct-rkpin.rang { box-shadow: 0 0 0 3px rgba(226, 194, 106, .9), 0 0 18px rgba(255, 210, 122, .8) !important; }
    .ct-zones { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 0 0 6px; }
    .ct-zone { position: relative; display: flex; flex-direction: column; gap: 4px; padding: 6px; border-radius: 10px; border: 2px dashed rgba(236, 228, 212, .35); min-height: 140px; }
    .ct-zone.real { background: rgba(47, 90, 63, .3); } .ct-zone.fake { background: rgba(110, 60, 50, .3); }
    .ct-zone.over { border-style: solid; border-color: #ffd27a; }
    .ct-zimg { width: 100%; max-width: 170px; height: auto; margin: 0 auto; image-rendering: pixelated; filter: drop-shadow(0 6px 6px #000a); }
    .ct-zbtn { min-height: 40px; font-size: 13px; }
    .ct-zpins { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    /* The end: the cup across the counter, his ledger page */
    .w-cup { position: absolute; z-index: 3; left: 50%; bottom: -14px; width: min(30%, 170px); height: auto; transform: translateX(-50%); filter: drop-shadow(0 0 24px rgba(255, 220, 120, .85)); animation: w-push 1.1s cubic-bezier(.2, .9, .3, 1.2); }
    @keyframes w-push { from { transform: translate(-50%, -70%) scale(.5); opacity: 0; } }
    .ct-world.lost .w-cup { left: auto; right: 6%; bottom: 40%; width: min(16%, 90px); filter: grayscale(.5) brightness(.6); animation: w-shelf 1s ease-in-out; }
    @keyframes w-shelf { from { right: 42%; bottom: 0; width: min(24%, 130px); } }
    .ct-world.end .w-kage { left: 30%; }
    .ct-world.lost .w-kage { left: 50%; }
    .w-headline { margin: 0 0 6px; color: #ffe6a8 !important; }
    .ct-rackres { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; margin: 4px 0; }
    .ct-rr { display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; font-size: 12px; }
    .ct-rr img { width: 44px; height: 44px; }
    .ct-rr.ok b { color: #9fe3a8; } .ct-rr.bad b { color: #f0a29b; }
    .ct-page { padding: 12px 16px 10px; margin: 8px 0; border-radius: 6px; color: #2a2018; display: grid; grid-template-columns: 1fr 1fr; gap: 0 22px;
      background: repeating-linear-gradient(transparent 0 25px, rgba(80, 60, 40, .08) 25px 26px), linear-gradient(#efe3c2, #e2d2a8);
      box-shadow: inset 0 0 0 1px rgba(120, 85, 30, .45), inset 0 0 30px rgba(120, 85, 30, .25), 0 6px 16px rgba(0, 0, 0, .6); font: italic 600 15px/1.3 Georgia, 'Times New Roman', serif; }
    .ct-page p { display: flex; justify-content: space-between; gap: 6px; margin: 0; padding: 3px 0; border-bottom: 1px solid rgba(80, 60, 40, .25); color: #2a2018 !important; }
    .ct-page p b { font-style: normal; }
    .ct-pageh { grid-column: 1 / -1; justify-content: center !important; font: 800 12px var(--f-body, sans-serif) !important; letter-spacing: .14em; text-transform: uppercase; border: 0 !important; }
    @media (max-width: 899px) {
      /* Phone: he stands left of centre so the job card on the right doesn't cover him; his bubble runs along the top */
      .ct-world.table .w-kage { left: 30%; }
      .ct-world.table .w-bubble { left: 10px; right: auto; max-width: 52%; }
      .ct-world.table .w-bubble::after { left: auto; right: 30%; }
      .ct-world.table .w-card { width: 54%; bottom: 6px; padding: 6px 8px; font-size: 12.5px; }
      .ct-world.table .w-teach { left: auto; right: 10px; max-width: 44%; }
      .ct-hpin img { width: min(12vw, 46px); }
      .ct-hpin span { font-size: 9.5px; }
      .ct-sq { aspect-ratio: auto; min-height: 58px; padding: 2px 2px 12px; }
      .ct-world.table { grid-template-rows: auto minmax(128px, 1fr) auto; }
      .ct-side { display: flex; flex-direction: column; gap: 4px; } .ct-side .ct-hand-row { order: -1; }
      .ct-world.table .w-card .small { display: none; }
      .ct-world.table .w-card { top: 36px; bottom: auto; font-size: 11.5px; padding: 5px 7px; }
      .ct-job { font-size: 9.5px; letter-spacing: -.01em; }
      .ct-sq.taken .ct-job { font-size: 8.5px; }
      .ct-piece { width: 30px; }
      .ct-hint { font-size: 11.5px; }
      .ct-play { gap: 2px; }
      .ct-grid { border-width: 6px; padding: 4px; gap: 4px; }
      .w-down { padding-top: 8px; }
      .ct-acts { margin: 0 0 4px; } .ct-acts button { min-height: 40px; padding: 4px 12px; }
      .ct-world.pick .w-teach, .ct-world.over .w-teach { top: auto; bottom: 8px; max-width: 46%; }
      .ct-world.rack { grid-template-rows: auto minmax(240px, 1fr) auto; }
      .ct-world.rack .w-bubble { right: 10px; left: auto; max-width: 56%; font-size: 12.5px; }
      /* His line fades after a few seconds so you can see him; tap him to hear it again */
      .ct-world.table .w-bubble { animation: w-fade .4s ease 6s forwards; }
    }
    @keyframes w-fade { to { opacity: 0; visibility: hidden; } }
    @media (max-width: 899px) and (max-height: 700px) { .ct-world.table .ct-hint { display: none; } }
    @media (max-width: 420px) { .ct-page { grid-template-columns: 1fr; } .w-bubble { font-size: 13.5px; } }
    /* Wide screens: a bigger stage; on the counter the felt sits left and your pins and moves right */
    @media (min-width: 900px) {
      .ct-world { grid-template-rows: auto minmax(260px, 1fr) auto; }
      .w-down { padding: 14px max(24px, calc((100% - 1100px) / 2)) 20px; }
      .ct-world.table .ct-play, .ct-world.over .ct-play { grid-template-columns: minmax(0, 1fr) minmax(320px, 420px); gap: 24px; align-items: center; }
      .ct-grid { max-width: min(100%, 540px, 54vh); }
      .ct-job { font-size: 12.5px; } .ct-sq.taken .ct-job { font-size: 10.5px; }
      .ct-hpin span { font-size: 12px; }
      .w-bubble { font-size: 17px; right: max(16px, calc((100% - 1100px) / 2)); }
      .w-card { right: max(16px, calc((100% - 1100px) / 2)); font-size: 15px; }
      .w-teach { left: max(16px, calc((100% - 1100px) / 2)); }
      .ct-trays { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
      .ct-book { max-width: 900px; margin: 0 auto; }
      .ct-zones { max-width: 900px; margin: 0 auto 6px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .w-kage img, .w-kage, .ct-bench, .ct-run *, .w-cup, .ct-rkpin, .w-shutter, .ct-book, .w-banner, .ct-rackwall { animation: none !important; transition: none !important; }
    }`;
  document.head.appendChild(css);
})();
