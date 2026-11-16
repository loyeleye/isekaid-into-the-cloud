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
  const say = t => `<div class="du-say ct-say" data-vo="${esc('kagemaru|' + t)}"><img src="${kage(t)}" alt="" width="52" height="60"><p><b>Kagemaru:</b> "${esc(t)}"</p></div>`;
  const teachLine = (s, key) => { const t = T.teach(s, key); return t ? `<p class="ct-teach" role="status">${esc(t)}</p>` : ''; };
  const panel = (html, title) => U.panel(`<div class="ct">${html}</div>`, { title: title || TITLE, onClose: stopNow, cls: 'du-win ct-win' });
  function stopNow() { const s = cur(); if (s) save(s); untune(); if (SD.today && SD.today.render) SD.today.render(); }

  // ---- Pieces ----
  const SETC = { dq: '#3f5f80', kr: '#b8923a', sc: '#4f7f5c', tw: '#a8652d', kk: '#9e3a34' };
  const pinName = id => T.PINS[id].name;
  // An enamel pin: PixelLab art (assets/img/table/pin-<id>.webp, CREDITS.md) for the ids in PIN_ART, else a drawn disc.
  const PIN_ART = new Set(Object.keys(T.PINS));
  function pinHtml(id, o) {
    o = o || {};
    const P = T.PINS[id], img = PIN_ART.has(id) ? `<img src="assets/img/table/pin-${id}.webp" alt="" width="48" height="48">` : '';
    return `<span class="ct-pin${o.cls ? ' ' + o.cls : ''}" style="--pc:${SETC[P.set]}">${img || `<i aria-hidden="true">${esc(P.name.replace(/^(Beanstalk: |CloudWatch |CloudTrail |SQS |KMS |X-Ray |Lambda)/, '').slice(0, 2))}</i>`}<span>${esc(P.name)}</span></span>`;
  }
  const jobTitle = j => j.needs.map(n => T.NEEDS[n].t).join(' + ');
  const jobWords = j => j.needs.map((n, k) => T.NEEDS[n].w[(j.w && j.w[k]) | 0]);
  const svgHand = () => '<svg viewBox="0 0 60 44" aria-hidden="true"><ellipse cx="30" cy="40" rx="20" ry="4" fill="#000" opacity=".35"/><path d="M14 30 q-4 -10 2 -12 l2 -10 q2 -4 5 0 l1 8 l2 -12 q3 -4 5 0 l1 12 l2 -10 q3 -4 5 0 l0 12 l3 -6 q4 -2 4 3 l-4 12 q-3 6 -10 6 h-10 q-6 0 -8 -3 z" fill="#5d4d85" stroke="#17131f" stroke-width="2"/></svg>';
  const STATE = { open: 'his pin, not yet answered', held: 'his pin, held when you called it', stood: 'his pin, left standing', cracked: 'his fake, cracked: yours', mine: 'your pin, held', failed: 'your pin cracked: his' };

  // ---- The table ----
  let selPin = null, selSq = null;
  function feltHtml(s) {
    const b = s.b, nx = b.open < 0 ? T.nextSq(s, b) : -1;
    const cells = b.jobs.map((j, i) => {
      const x = b.cells[i], st = b.state[i], hard = j.needs.length > 1;
      const label = `${T.SQ[i]}: ${jobWords(j).join(' And: ')}${x ? '. ' + (x === 'me' ? 'Yours' : 'His') + ', ' + pinName(b.pins[i]) + ', ' + STATE[st] : '. Open'}${hard ? '. Two needs, counts double' : ''}`;
      const stamp = st === 'cracked' || st === 'failed' ? '<b class="ct-st crack" aria-hidden="true">✕</b>' : st === 'held' || st === 'mine' ? '<b class="ct-st ok" aria-hidden="true">✓</b>' : st === 'open' ? '<b class="ct-st open" aria-hidden="true">?</b>' : '';
      const owner = x ? `<span class="ct-own ${x}">${x === 'me' ? 'yours' : 'his'}</span>` : '';
      const piece = x ? pinHtml(b.pins[i], { cls: 'sm' + (st === 'cracked' || st === 'failed' ? ' cracked' : '') }) : '';
      const hand = !x && i === nx ? `<span class="ct-hand">${svgHand()}<span class="du-word">his next</span></span>` : '';
      const cls = `ct-sq set-${j.set}${x ? ' taken ' + x : ''}${hard ? ' hard' : ''}${i === selSq ? ' on' : ''}${i === b.open ? ' open' : ''}`;
      return `<button class="${cls}" data-sq="${i}" aria-label="${esc(label)}" style="--sc:${SETC[j.set]}">
        <span class="ct-job">${esc(jobTitle(j))}</span>${hard ? '<span class="ct-two" aria-hidden="true">××</span>' : ''}${piece}${owner}${stamp}${hand}</button>`;
    }).join('');
    return `<div class="du-felt ct-felt"><div class="ct-grid">${cells}</div></div>`;
  }
  // The slip under the felt: the picked square's job in full (his open square when nothing is picked).
  function slipHtml(s) {
    const b = s.b, i = selSq != null ? selSq : b.open;
    if (i == null || i < 0) return '<p class="small ct-slip muted">Tap a square to read its job.</p>';
    const j = b.jobs[i], x = b.cells[i];
    const who = x ? (x === 'me' ? 'Yours' : 'His') + `: ${pinName(b.pins[i])} (${STATE[b.state[i]]}).` : 'Open.';
    return `<div class="ct-slip" style="--sc:${SETC[j.set]}"><p class="small"><b>${esc(T.SQ[i])}</b> · ${esc(T.SETS[j.set].name)}${j.needs.length > 1 ? ' · two needs, counts double' : ''}</p>
      ${jobWords(j).map(w => `<p class="ct-need">${esc(w)}</p>`).join('')}<p class="small">${esc(who)}</p></div>`;
  }
  function hud(s) {
    const b = s.b, k = s.boards.length + 1, nb = T.boardsTonight(s);
    return `<p class="du-hud"><span><b>Board ${k}${nb > 1 ? ' of ' + nb : ''}</b> · ${esc(T.SETS[b.lead].name)}${b.partner ? ' + ' + esc(T.SETS[b.partner].name) : ''}</span>${nb > 1 ? `<span>Boards ${s.score[0]}–${s.score[1]}</span>` : ''}<span>Night ${s.n}</span></p>`;
  }
  function tableScreen(s, msg, teach) {
    tune('duel');
    const b = s.b;
    const empties = b.cells.some(x => !x);
    if (selPin && !b.hand.includes(selPin)) selPin = null;
    if (selSq != null && b.cells[selSq]) { if (selSq !== b.open) selSq = null; }
    const canPlace = selPin && selSq != null && !b.cells[selSq];
    const open = b.open >= 0 ? b.pins[b.open] : null;
    const hint = !empties ? 'The board is full. Call his last pin or let it stand.' : selPin && selSq == null ? 'Now tap an open job.' : !selPin && selSq != null && !b.cells[selSq] ? 'Now pick a pin from your hand.' : 'Pick a pin and an open job, or call his pin.';
    const body = panel(`${say(msg || SAY.lay)}${teach || ''}
      ${hud(s)}
      <div class="ct-play"><div class="ct-board" role="region" aria-label="The felt">${feltHtml(s)}</div>
      <div class="ct-side">${slipHtml(s)}
      <div class="ct-hand-row" role="group" aria-label="Your pins">${b.hand.map(id => `<button class="ct-hpin${id === selPin ? ' on' : ''}" data-pin="${id}" aria-pressed="${id === selPin}">${pinHtml(id)}</button>`).join('')}</div>
      <div class="ct-acts">
        ${canPlace ? `<button class="primary" id="ct-place">Place ${esc(pinName(selPin))} on the ${esc(T.SQ[selSq])}</button>` : `<p class="small ct-hint">${esc(hint)}</p>`}
        ${open ? `<button class="${canPlace ? 'ghost' : 'primary'}" id="ct-call">Call his ${esc(pinName(open))}: it's a fake</button>` : ''}
        ${!empties ? '<button class="ghost" id="ct-stand">Let it stand</button>' : ''}
      </div>
      <details class="du-asl"><summary class="small">His rule</summary><p class="small">He takes his winning square, else blocks your two in a line, else a square that gives him two in a line, else the square on the most lines he can still win. The centre and corners carry two needs and count double if the board fills with no line. A tie goes to the house.</p></details>
      <div class="row"><button class="ghost" id="ct-stop">Stop for now</button></div></div></div>`);
    body.querySelectorAll('[data-pin]').forEach(el => el.onclick = () => { selPin = selPin === el.dataset.pin ? null : el.dataset.pin; tableScreen(s, msg); });
    body.querySelectorAll('[data-sq]').forEach(el => el.onclick = () => { const i = +el.dataset.sq; selSq = selSq === i ? null : i; tableScreen(s, msg); });
    const pl = body.querySelector('#ct-place'), ca = body.querySelector('#ct-call'), stn = body.querySelector('#ct-stand');
    if (pl) pl.onclick = () => move(s, { pin: selPin, sq: selSq });
    if (ca) ca.onclick = () => move(s, { call: true });
    if (stn) stn.onclick = () => move(s, { stand: true });
    body.querySelector('#ct-stop').onclick = () => { U.closePanel(); stopNow(); };
  }

  // A move, then its test on the felt.
  function move(s, act) {
    const r = T.act(s, act);
    selPin = null; selSq = null;
    if (!r) return tableScreen(s);
    if (r.kind === 'stand') { const who = T.after(s); save(s); return who ? boardOver(s) : tableScreen(s, SAY.lay); }
    save(s);
    testScreen(s, r);
  }
  function testScreen(s, r) {
    const b = s.b, j = b.jobs[r.sq];
    const verdict = r.kind === 'call' ? (r.ok ? 'Fake. It cracks, and the square is yours.' : 'Genuine. It holds, and stays his.') : (r.ok ? 'It holds. The square is yours.' : 'It cracks. He takes the square.');
    const msg = r.kind === 'call' ? (r.ok ? SAY.callFake : SAY.callReal) : (r.ok ? SAY.held : SAY.failed);
    const tk = r.kind === 'call' ? (r.ok ? 'callFake' : 'callReal') : (r.ok ? 'hold' : 'fail');
    const extra = r.extra != null ? `<p class="small">He helps himself to the ${esc(T.SQ[r.extra])} as well, with ${esc(pinName(b.pins[r.extra]))}. It stands untested.</p>` : '';
    const lines = r.test.lines.map(l => `<li class="${l.ok ? 'ok' : 'bad'}"><span class="small">${esc(T.NEEDS[l.need].w[(j.w && j.w[j.needs.indexOf(l.need)]) | 0])}</span><br>${l.ok ? '✓' : '✕'} ${esc(l.line)}</li>`).join('');
    const held = r.test.ok;
    const body = panel(`${say(msg)}${teachLine(s, tk)}${j.needs.length > 1 ? teachLine(s, 'chalk') : ''}
      <div class="ct-test ${held ? 'held' : 'cracked'}" style="--sc:${SETC[j.set]}">
        <img class="ct-scene" src="assets/img/table/scene-${j.set}.webp" alt="" width="192" height="96">
        <p class="small"><b>The test</b> · ${esc(T.SQ[r.sq])} · ${esc(T.SETS[j.set].name)}</p>
        <div class="ct-test-pin">${pinHtml(r.pin, { cls: held ? '' : 'cracked' })}<b class="ct-stamp ${held ? 'ok' : 'crack'}">${held ? 'HOLDS' : 'CRACKS'}</b></div>
        <ul class="ct-lines">${lines}</ul>
        <p><b>${esc(verdict)}</b></p>${extra}
      </div>
      <div class="row"><button class="primary" id="ct-next">${'Next'}</button></div>`);
    if (held && U.burst) { const el = body.querySelector('.ct-stamp'); if (el && (r.kind === 'place' || !r.ok)) U.burst(el); }
    if (!held && r.kind === 'call' && U.burst) { const el = body.querySelector('.ct-stamp'); if (el) U.burst(el); }
    body.querySelector('#ct-next').onclick = () => {
      const who = T.after(s);
      save(s);
      if (who) return boardOver(s);
      const c = s.b.cells.slice(); c[s.b.open] = null;
      const threat = s.b.open >= 0 && T.line(s.b.cells, 'him') && !T.line(c, 'him');
      tableScreen(s, threat ? SAY.line : SAY.lay, threat ? teachLine(s, 'line') : '');
    };
  }

  // ---- Board over: his ledger shows any fakes you let stand ----
  function boardOver(s) {
    const last = s.boards[s.boards.length - 1], b = s.b;
    const stood = b.cells.map((x, i) => (x === 'him' && b.state[i] === 'stood' && !b.stock[i].real && b.pins[i] === b.stock[i].pin ? i : -1)).filter(i => i >= 0);
    const fakes = b.stock.filter(x => !x.real).length;
    const body = panel(`${say(last.res === 'me' ? SAY.boardMe : SAY.boardHim)}${stood.length ? teachLine(s, 'stood') : ''}
      ${hud(Object.assign({}, s, { boards: s.boards.slice(0, -1) }))}
      ${feltHtml(s)}
      <p class="td-big">Board ${s.boards.length} to ${last.res === 'me' ? 'you' : 'Kagemaru'}.</p>
      ${last.byCount ? '<p class="small">No line, so it went to the count (the centre and corners count double). A tie goes to the house.</p>' : ''}
      <div class="ct-ledger"><p class="small"><b>His ledger.</b> He brought ${fakes} fakes and ${9 - fakes} genuine pins to this board.</p>
        ${stood.length ? `<p class="small">Fakes you let stand: ${stood.map(i => `<b>${esc(pinName(b.pins[i]))}</b> on "${esc(jobTitle(b.jobs[i]))}" (${esc(T.NEEDS[b.jobs[i].needs.find(n => !T.holds(b.pins[i], n))].why[b.pins[i]])})`).join('; ')}.</p>` : '<p class="small">You let none of his fakes stand.</p>'}</div>
      <div class="row"><button class="primary" id="ct-bill">The bill</button></div>`);
    body.querySelector('#ct-bill').onclick = () => billScreen(s);
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
    const list = L.items.map((x, k) => `<li class="${k < L.i ? 'done' : k === L.i ? 'on' : ''}">${pinHtml(x.pin, { cls: 'sm' })}<span class="small">${esc(x.needs.map(n => T.NEEDS[n].t).join(' + '))}: ${esc(WHY[x.why])}${k < L.i ? (L.res[k] && L.res[k].ok ? ' · paid ✓' : ' · still owed') : ''}</span></li>`).join('');
    const body = panel(`${say(L.i === 0 ? (L.items.some(x => x.why !== 'held') ? SAY.bill : SAY.billNone) : 'Next item.')}
      <ul class="ct-bill">${list}</ul>
      <p class="small">${esc(pinName(it.pin))}: ${esc(T.PINS[it.pin].back)}</p>
      <p class="small">One exam question per item. Say how sure you are.</p>
      <div class="row"><button class="primary" id="ct-pay">Pay item ${L.i + 1} of ${L.items.length}</button><button class="ghost" id="ct-stop">Stop for now</button></div>`, 'HIS BILL');
    body.querySelector('#ct-stop').onclick = () => { U.closePanel(); stopNow(); };
    body.querySelector('#ct-pay').onclick = async () => {
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

  // ---- Picks ----
  function rivalBtn(id) {
    const R = T.SETS[id], P = R.partner ? T.SETS[R.partner] : null, rec = keep().rec[id];
    return `<button class="opt du-rival" data-rival="${id}" style="--sc:${SETC[id]}"><span class="ct-medal" aria-hidden="true"></span><span><b>${esc(R.name)}</b><br>
      <span class="small">${esc(R.what)}${P ? ` Mixed with ${esc(P.name)}.` : ''}</span><br>
      <span class="small">Your bill: ${rec && rec[3] ? `${rec[2]} of ${rec[3]} right` : 'nothing owed yet'}</span></span></button>`;
  }
  function pickScreen(s) {
    s.offers = s.offers || T.offers(s);
    const first = s.n === 1;
    const body = panel(`${say(first ? SAY.walkup : SAY.sit)}${first ? teachLine(s, 'first') : ''}
      <p><b>${s.offers.length > 1 ? 'Who do you face first?' : 'Tonight\'s stock'}</b></p>
      <div class="opts">${s.offers.map(rivalBtn).join('')}</div>
      <p class="muted small">Night ${s.n}. ${T.boardsTonight(s) > 1 ? 'Two boards, and at one each, the Counterfeit Rack.' : 'One board tonight.'}${s.n >= 4 && s.weak.includes(s.offers[0]) ? ` ${esc(T.SETS[s.offers[0]].name)} is on offer because your bill says it's your weakest.` : ''}</p>
      <div class="row"><button class="ghost" id="ct-stop">Stop for now</button></div>`);
    body.querySelectorAll('[data-rival]').forEach(el => el.onclick = () => { T.startBoard(s, el.dataset.rival); save(s); tableScreen(s, s.b.edge ? SAY.edge : SAY.lay); });
    body.querySelector('#ct-stop').onclick = () => { U.closePanel(); stopNow(); };
  }
  function counterScreen(s) {
    const c = s.counter;
    if (c.who === 'him') {
      const body = panel(`${say(SAY.hisPick)}<p>He lost board 1, so he picks the stock: <b>${esc(T.SETS[c.pick].name)}</b>.</p>
        <div class="row"><button class="primary" id="ct-go">Board 2</button></div>`);
      body.querySelector('#ct-go').onclick = () => { T.startBoard(s, c.pick); s.counter = null; save(s); tableScreen(s, SAY.lay); };
      return;
    }
    const body = panel(`${say(SAY.myPick)}<p><b>You lost board 1, so you pick board 2.</b></p><div class="opts">${c.offers.map(rivalBtn).join('')}</div>`);
    body.querySelectorAll('[data-rival]').forEach(el => el.onclick = () => { T.startBoard(s, el.dataset.rival); s.counter = null; save(s); tableScreen(s, SAY.lay); });
  }

  // ---- The Counterfeit Rack ----
  let marks = null;
  function rackScreen(s) {
    tune('duellast');
    const K = s.rack;
    if (!marks || marks.length !== K.jobs.length) marks = Array(K.jobs.length).fill(null);
    const rows = K.jobs.map((j, i) => `<li class="ct-rk" style="--sc:${SETC[j.set]}"><p class="small"><b>${esc(T.SETS[j.set].name)}</b> · ${esc(jobWords(j)[0])}</p>
      <div class="ct-rk-row">${pinHtml(K.stock[i].pin)}<span class="ct-mark" role="group" aria-label="${esc(pinName(K.stock[i].pin))}: genuine or fake">
        <button class="${marks[i] === true ? 'on' : ''}" data-m="${i}" data-v="1" aria-pressed="${marks[i] === true}">Genuine</button><button class="${marks[i] === false ? 'on' : ''}" data-m="${i}" data-v="0" aria-pressed="${marks[i] === false}">Fake</button></span></div></li>`).join('');
    const ready = marks.every(x => x !== null);
    const body = panel(`${say(K.jobs.length === 1 ? SAY.sudden : SAY.rack)}
      <p>${K.jobs.length === 1 ? 'One pin decides the Cup.' : `Mark each pin genuine or fake. Two are genuine. ${K.need} of ${K.jobs.length} right wins the Cup.`}</p>
      <ul class="ct-rack">${rows}</ul>
      <div class="row"><button class="primary" id="ct-test" ${ready ? '' : 'disabled'}>Test them all</button></div>`, 'THE COUNTERFEIT RACK');
    body.querySelectorAll('[data-m]').forEach(el => el.onclick = () => { marks[+el.dataset.m] = el.dataset.v === '1'; rackScreen(s); });
    body.querySelector('#ct-test').onclick = () => {
      if (!marks.every(x => x !== null)) return;
      const r = T.settleRack(s, marks);
      // A wrong mark comes back as tomorrow's first bill item.
      r.tests.forEach((t, i) => { if (t.ok !== marks[i]) keep().carryPins = keep().carryPins.concat([{ pin: K.stock[i].pin, needs: K.jobs[i].needs }]).slice(-3); });
      s.rackRes = { right: r.right, won: r.won, lines: r.tests.map((t, i) => ({ ok: t.ok, mark: marks[i], line: t.lines[0].line })) };
      marks = null;
      save(s);
      endScreen(s);
    };
  }

  // ---- The end: the Rack or the last board, win or lose, then the ledger and Pip ----
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
    const rack = s.rackRes ? `<ul class="ct-lines">${s.rackRes.lines.map((x, i) => `<li class="${x.ok === x.mark ? 'ok' : 'bad'}">${pinHtml(s.rack.stock[i].pin, { cls: 'sm' + (x.ok ? '' : ' cracked') })} ${x.ok ? 'Genuine' : 'Fake'}: ${esc(x.line)} ${x.ok === x.mark ? '✓' : '✕ you marked it ' + (x.mark ? 'genuine' : 'fake')}</li>`).join('')}</ul>` : '';
    const mins = Math.max(1, Math.round(minutes(s)));
    const body = panel(`${say(won ? SAY.won : SAY.lost)}
      <p class="td-big">${won ? 'The tin cup is yours until tomorrow night.' : 'The cup stays on his shelf tonight.'}</p>
      ${s.rackRes ? `<p><b>The Rack: ${s.rackRes.right} of ${s.rack.jobs.length} right.</b></p>${rack}` : ''}
      <p class="small"><b>His ledger.</b> Pins tested ${tests}, held ${held} · calls ${calls.length}, ${right} caught a fake · bill ${M.sgn(s.billPts | 0)} · ${mins} ${mins === 1 ? 'minute' : 'minutes'}.</p>
      ${s.paid ? `<p class="small"><b>${esc(s.paid)}</b></p>` : ''}
      <p class="muted small">Tomorrow the stock rotates. Anything still owed opens the first bill.</p>
      ${M.pipHtml()}
      <div class="row"><button class="primary" id="ct-done">Walk back</button></div>`, 'HIS LEDGER');
    M.pipWire(body, 'The Look-Alike Cup');
    body.querySelector('#ct-done').onclick = () => { U.closePanel(); stopNow(); };
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
    .ct-say img { image-rendering: pixelated; object-fit: cover; object-position: center top; background: #2a2433; }
    .ct-scene { display: block; width: 100%; height: auto; aspect-ratio: 2 / 1; image-rendering: pixelated; border-radius: 6px; margin: 0 0 6px; }
    .ct-teach { margin: 4px 0 6px; padding: 4px 8px; border-left: 4px solid var(--sun, #b8923a); font-size: 14px; }
    .ct { max-width: 720px; margin: 0 auto; }
    .ct:has(.ct-play) { max-width: none; }
    .ct-felt { max-width: min(100%, 520px); }
    .ct-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: #2f5a3f; border-radius: 8px; padding: 4px; }
    .ct-sq { position: relative; min-height: 92px; padding: 4px 3px 18px; border: 2px solid rgba(236,230,216,.45); border-top: 5px solid var(--sc); border-radius: 7px; background: #ece6d8; color: #17131f; display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; box-shadow: none; font: inherit; }
    .ct-sq.hard { border-style: double; border-width: 4px; border-top: 5px solid var(--sc); }
    .ct-sq.on { outline: 3px solid #cfdbe8; outline-offset: 1px; }
    .ct-sq.open { box-shadow: 0 0 0 3px #c9b6f0; }
    .ct-sq.taken.me { background: #dfe8d6; }
    .ct-sq.taken.him { background: #ded6ea; }
    .ct-job { font: 700 11.5px/1.15 var(--f-body, sans-serif); overflow-wrap: anywhere; }
    .ct-sq.taken .ct-job { font-size: 10px; opacity: .75; }
    .ct-sq.hard .ct-job { padding: 0 9px; }
    .ct-two { position: absolute; top: 1px; right: 4px; font: 800 10px var(--f-body, sans-serif); color: var(--sc); }
    .ct-own { position: absolute; bottom: 2px; left: 0; right: 0; font: 800 10px var(--f-body, sans-serif); letter-spacing: .05em; text-transform: uppercase; }
    .ct-own.me { color: #2d5a2a; } .ct-own.him { color: #4a3a6e; }
    .ct-st { position: absolute; top: 2px; left: 4px; font: 900 14px var(--f-body, sans-serif); }
    .ct-st.ok { color: #2d7a3a; } .ct-st.crack { color: #9e3a34; } .ct-st.open { color: #5d4d85; }
    .ct-hand { position: absolute; inset: auto 0 2px 0; display: flex; flex-direction: column; align-items: center; pointer-events: none; }
    .ct-hand svg { width: 34px; height: auto; }
    .ct-pin { display: inline-flex; align-items: center; gap: 5px; max-width: 100%; text-align: left; font: 700 12px/1.15 var(--f-body, sans-serif); }
    .ct-pin > i, .ct-pin > img { flex: none; width: 30px; height: 30px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff8 0 18%, transparent 19%), var(--pc); border: 2px solid #b8923a; color: #fff; font: 800 11px/26px var(--f-body, sans-serif); text-align: center; font-style: normal; box-shadow: 0 2px 0 #17131f55; }
    .ct-pin > img { object-fit: contain; background: none; border: 0; box-shadow: none; image-rendering: pixelated; }
    .ct-pin > span { overflow-wrap: anywhere; }
    .ct-pin.sm { flex-direction: column; gap: 1px; font-size: 9.5px; text-align: center; }
    .ct-pin.sm > i, .ct-pin.sm > img { width: 24px; height: 24px; font-size: 9px; line-height: 20px; }
    .ct-pin.cracked > i, .ct-pin.cracked > img { filter: grayscale(.7); background-image: linear-gradient(120deg, transparent 45%, #17131f 46% 50%, transparent 51%), radial-gradient(circle at 35% 30%, #fff8 0 18%, transparent 19%); }
    .ct-slip { border: 2px solid var(--ink, #222); border-left: 6px solid var(--sc, #222); border-radius: 8px; padding: 6px 8px; margin: 6px 0; }
    .ct-slip p { margin: 0 0 4px; } .ct-need { font-weight: 700; }
    .ct-hand-row { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 6px 0; }
    .ct-hpin { min-height: 48px; padding: 6px; border-radius: 8px; text-align: left; }
    .ct-hpin.on { outline: 3px solid var(--sun, #b8923a); transform: translateY(-2px); }
    .ct-acts { display: flex; flex-direction: column; gap: 6px; margin: 6px 0; }
    .ct-acts button { min-height: 44px; }
    .ct-hint { margin: 0; }
    .ct-test { border: 3px solid var(--sc); border-radius: 10px; padding: 8px 10px; margin: 6px 0; }
    .ct-test-pin { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .ct-stamp { font: 900 16px var(--f-body, sans-serif); letter-spacing: .08em; padding: 2px 8px; border: 3px solid; border-radius: 6px; transform: rotate(-6deg); }
    .ct-stamp.ok { color: #2d7a3a; } .ct-stamp.crack { color: #9e3a34; }
    .ct-lines { list-style: none; padding: 0; margin: 6px 0; }
    .ct-lines li { padding: 4px 0 4px 8px; border-left: 4px solid #2d7a3a; margin: 4px 0; }
    .ct-lines li.bad { border-left-color: #9e3a34; }
    .ct-ledger { border: 2px dashed var(--ink, #222); border-radius: 8px; padding: 4px 8px; margin: 6px 0; }
    .ct-bill { list-style: none; padding: 0; margin: 6px 0; }
    .ct-bill li { display: flex; gap: 8px; align-items: center; padding: 4px 0; border-bottom: 1px solid #0002; }
    .ct-bill li.done { opacity: .6; } .ct-bill li.on { font-weight: 700; }
    .ct-medal { width: 34px; height: 34px; border-radius: 50%; background: var(--sc); border: 3px solid #b8923a; flex: none; }
    .ct-rack { list-style: none; padding: 0; margin: 6px 0; }
    .ct-rk { border-left: 6px solid var(--sc); padding: 4px 8px; margin: 6px 0; }
    .ct-rk p { margin: 0 0 4px; }
    .ct-rk-row { display: flex; gap: 8px; align-items: center; justify-content: space-between; flex-wrap: wrap; }
    .ct-mark { display: flex; gap: 4px; }
    .ct-mark button { min-height: 40px; padding: 4px 10px; }
    .ct-mark button.on { outline: 3px solid var(--sun, #b8923a); font-weight: 800; }
    @media (min-width: 900px) {
      .ct-play { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, 1fr); gap: 20px; align-items: start; }
      .ct-felt { max-width: 640px; }
      .ct-sq { min-height: 130px; padding: 8px 6px 22px; }
      .ct-job { font-size: 14px; }
      .ct-sq.taken .ct-job { font-size: 12px; }
      .ct-pin.sm { font-size: 11px; } .ct-pin.sm > i, .ct-pin.sm > img { width: 34px; height: 34px; }
      .ct-hand svg { width: 44px; }
    }
    @media (prefers-reduced-motion: reduce) { .ct-hpin.on { transform: none; } }`;
  document.head.appendChild(css);
})();
