// The Sorting Floor (design: project files game-modes/lost-and-found-real/design.md, approved by Ladi Nov 16): the
// Lost and Found as a real game. Dutch's chute, the doors, the router board, the rack and the clerks' desks are the
// screen, and everything that happens shows on them (L9). The rules are js/floor-core.js on js/aws-sim.js.
//   - Its own mode for now ("its own door"). It doesn't touch the Lost and Found's nights 1 to 5 (js/mode-pop*.js,
//     rules frozen until Dec 1); a door on that map can point here once that build merges.
//   - No walkthrough screens: the first claim teaches by its first 429, and each rule's first appearance carries one
//     line from Dutch (SD.floor.TEACH, once per save).
//   - The question is the debrief: after each claim, one bank question on a piece that carried it, verified only, on
//     the plain exam screen with the shared stake table (SD.modes.ask). Right: that card is proven (costs 1 less; Fan-Out
//     gets its filter). Wrong: by the twins rule, a verified twin (or the question itself) opens next night's first debrief.
//   - Saves after every step (S.save.floor). Ends on the Hunch's last wave, win or lose, then Pip's "why did that work?".
(function () {
  if (!SD.modes || !SD.floor || !SD.awsSim) return;
  const M = SD.modes, U = SD.ui, S = SD.state, F = SD.floor, C = F.CARDS;
  const E = () => SD.exam, D = () => SD.topicDrill;
  const ID = 'floor', TITLE = 'THE SORTING FLOOR';
  const esc = s => U.esc(String(s == null ? '' : s));
  const sv = () => S.save;
  const cur = () => sv().floor || null;
  const keep = () => (sv().floorKeep = sv().floorKeep || { night: 0, taught: {}, carry: [], best: null });
  const save = s => { sv().floor = s; S.persist(); };
  const icon = (n, cls) => `<svg class="fl-gi${cls ? ' ' + cls : ''}" viewBox="0 0 512 512" aria-hidden="true">${(SD.icons && SD.icons[n]) || ''}</svg>`;
  const NAMES = { dutch: 'Dutch', mira: 'Mira', seoyeon: 'Seo-yeon', kai: 'Kai' };
  const head = (who, mood) => { try { return SD.art && SD.art.portrait ? `<span class="fl-head">${SD.art.portrait(who, 34, mood || 'neutral')}</span>` : ''; } catch (e) { return ''; } };
  const say = (who, mood, line) => `<p class="fl-say" data-vo="${esc(who + '|' + line)}">${head(who, mood)}<span><b>${esc(NAMES[who] || who)}:</b> ${esc(line)}</span></p>`;
  // The claimants, drawn with PixelLab (tools/floor_art.py, assets/img/monsters/floor-<id>.webp).
  if (SD.art && SD.art.addFoe) Object.keys(F.CLAIMS).forEach(id => { if (!F.CLAIMS[id].boss) SD.art.addFoe('floor-' + id, { col: '#c9a07a', anim: 'float', src: `assets/img/monsters/floor-${F.CLAIMS[id].art || id}.webp` }); });
  const foe = id => { try { return F.CLAIMS[id].boss ? (SD.pop && SD.pop.HUNCH_SVG) || '' : SD.art.enemy('floor-' + id); } catch (e) { return ''; } };
  const HOME = { thornwick: 'Thornwick', peak: 'Burning Peak', halcyon: 'Halcyon', arcanum: 'the Arcanum' };
  const panel = html => U.panel(`<div class="fl">${html}</div>`, { title: TITLE, onClose: stopNow, cls: 'fl-win' });
  function stopNow() { const s = cur(); if (s) save(s); if (SD.today && SD.today.render) SD.today.render(); }
  const plural = (n, a, b) => `${n} ${n === 1 ? a : (b || a + 's')}`;

  function start() {
    let s = cur();
    if (!s || s.v !== 1 || s.phase === 'done') {
      const k = keep();
      s = F.newNight({ night: k.night + 1, taught: k.taught, carry: k.carry });
      s.tally = M.newTally();
      s.fresh = true;
    }
    save(s);
    draw(s);
  }
  function draw(s) {
    ({ map: mapScreen, floor: floorScreen, debrief: debriefScreen, reward: rewardScreen, end: endScreen, zero: endScreen }[s.phase] || mapScreen)(s);
  }

  // ---- The map: one row of doors per claim, the Hunch's door always in view at the top (L7) ----
  function budgetJar(s) {
    const b = Math.max(0, s.budget);
    return `<div class="fl-jar" role="img" aria-label="Error budget ${b}%"><span class="fl-jar-l">${icon('checked-shield')}Error budget</span><span class="fl-jar-b"><i style="width:${b}%"></i></span><b>${b}%</b></div>`;
  }
  // The night's map: one row of doors per claim, the Hunch on top. With end set, closed claims carry a stamp.
  function mapHtml(s, end) {
    const boss = !end && F.atBoss(s);
    const rows = F.ROWS.map((r, i) => {
      const ch = F.choices(s.night, i);
      const doors = ch.map(id => {
        const cl = F.CLAIMS[id], here = i === s.row, done = s.path[i] === id;
        if (end && !done && ch.length > 1) return '';
        return `<button class="fl-door${here && !end ? ' reach' : ''}${done ? ' done' : ''}" data-claim="${id}" ${here && !end ? '' : 'disabled'}>
          ${end && done ? `<span class="fl-foe-s">${foe(id)}</span>` : ''}<span class="fl-dn">${esc(cl.name)}</span><span class="fl-dt">${esc(HOME[cl.home])}${done && !end ? ' · cleared' : ''}</span>${end && done ? '<span class="fl-stamp">Closed</span>' : ''}</button>`;
      }).join('');
      return `<div class="fl-row">${doors}</div>`;
    }).reverse().join('');
    const zero = end && s.phase === 'zero';
    return `<div class="fl-map${end ? ' fl-endmap' : ''}">
        <button class="fl-door fl-boss${boss ? ' reach' : ''}" data-claim="hunch" ${boss ? '' : 'disabled'}>${end ? `<span class="fl-foe-s">${foe('hunch')}</span>` : ''}<span class="fl-dn">The Hunch</span><span class="fl-dt">Top of the heap · everything at once</span>${end ? `<span class="fl-stamp${zero ? ' red' : ''}">${zero ? 'Shutters down' : 'Drained'}</span>` : ''}</button>
        ${rows}
      </div>`;
  }
  function mapScreen(s) {
    const boss = F.atBoss(s);
    const first = s.fresh && s.night === 1 && !s.path.length;
    const b = panel(`<p class="fl-night">Night ${s.night}</p>
      ${say('dutch', 'neutral', first ? F.SAY.arrive : s.path.length ? 'Next door.' : F.SAY.again)}
      ${budgetJar(s)}
      ${mapHtml(s)}
      <p class="small muted">Deck: ${plural(s.deck.length, 'card')}${s.deck.some(e => e.up) ? ` · proven: ${s.deck.filter(e => e.up).map(e => esc(C[e.id].name)).join(', ')}` : ''}</p>
      <div class="fl-dock"><button class="ghost" id="fl-stop">☰ Stop for now</button></div>`);
    b.querySelectorAll('[data-claim]').forEach(el => el.onclick = () => {
      if (el.disabled) return;
      s.fresh = false;
      if (el.dataset.claim !== 'hunch') s.path[s.row] = el.dataset.claim;
      F.startClaim(s, el.dataset.claim, s.night * 7919);
      save(s); draw(s);
    });
    b.querySelector('#fl-stop').onclick = () => { U.closePanel(); stopNow(); };
  }

  // ---- The room's pieces as objects: the floor's own sprites (tools/floor_room_art.py) and Incident Commander's desk,
  // stools, rack, bin, gate and envelopes (assets/img/ic-live, made for this game). ----
  const sprite = (src, cls, alt) => `<img class="fl-spr${cls ? ' ' + cls : ''}" src="assets/img/${src}.webp" alt="${esc(alt || '')}"${alt ? '' : ' aria-hidden="true"'} draggable="false">`;
  const CLERK = name => /Mira/.test(name) ? 'mira' : /Seo-yeon/.test(name) ? 'seoyeon' : /Kai/.test(name) ? 'kai' : /Dutch/.test(name) ? 'dutch' : null;

  // ---- Cards: art first. The picture and a few words on the face; press and hold (or hover) for the whole rule. ----
  const SHORT = { patch: '+1 stool, this turn', guard: 'Catch 3 of the spill', stdq: 'Tickets wait, not bounce', fifo: 'In order, no repeats',
    dlq: '3rd fail drops in the bin', partial: 'Only the bad one returns', condwrite: 'Handled twice costs 0', sns: 'Every desk gets a copy',
    filter: 'Each bell rings its own', eb: 'Route by pattern', reserve: 'Bolt 4 stools per desk', backoff: 'Retry after 1, then 2',
    leastpriv: 'Only the allowed get in', deny: 'Deny beats Allow *', redrive: 'Bin back to the rack',
    cache: 'Repeat asks get the copy', gsi: 'Look up by status', shard: 'Busy key, many shelves' };
  function cardHtml(id, o) {
    const c = C[id], kind = c.kind === 'piece' ? 'piece' : 'act';
    const foot = o.why ? `<span class="fl-why">${esc(o.why)}</span>` : o.who ? `<span class="fl-tag">${esc(o.who)}</span>` : `<span class="fl-tag">${kind === 'piece' ? 'Stays' : 'This turn'}</span>`;
    return `<button class="fl-card k-${kind}${o.why ? ' no' : ''}${o.up ? ' up' : ''}" ${o.attrs} title="${esc(o.text)}" aria-label="${esc(c.name + '. ' + o.text + (o.why ? ' ' + o.why : ''))}">
      <span class="fl-art">${icon(c.icon)}</span><span class="fl-cost">${o.cost}</span>
      <b>${esc(c.name)}${o.up ? ' ✓' : ''}</b><span class="fl-short">${esc(SHORT[id] || '')}</span>${foot}
      <span class="fl-ct" aria-hidden="true">${esc(o.text)}</span></button>`;
  }
  function wirePeek(b) {
    b.querySelectorAll('.fl-card').forEach(el => {
      let t = null;
      const end = () => { clearTimeout(t); if (el.classList.contains('peek')) setTimeout(() => el.classList.remove('peek'), 0); };
      el.addEventListener('pointerdown', () => { el.dataset.peeked = ''; t = setTimeout(() => { el.classList.add('peek'); el.dataset.peeked = '1'; }, 420); });
      el.addEventListener('pointerup', end); el.addEventListener('pointerleave', end); el.addEventListener('pointercancel', end);
      el.addEventListener('contextmenu', e => e.preventDefault());
    });
  }
  const peeked = el => { const p = el.dataset.peeked === '1'; el.dataset.peeked = ''; return p; };

  // ---- The floor ----
  function ticket(tk, o) {
    o = o || {};
    const q = cur() && cur().fight && cur().fight.world.queue;
    const st = F.stamps(tk);
    const glyph = { bell: icon('ringing-bell'), num: `<b>${esc(tk.group + tk.n)}</b>`, dup: '<b>×2</b>', heavy: icon('hourglass'), star: '<b>✱</b>', lock: icon('padlock'), same: icon('files'), look: icon('magnifying-glass'), hot: icon('campfire'), tag: `<b>${tk.tag === 'peak' ? 'P' : 'T'}</b>` };
    const cls = ['fl-tk', tk.tag && tk.tag !== 'any' ? 'tag-' + tk.tag : '', o.hidden ? 'down' : '', o.cls || ''].join(' ');
    const again = !o.hidden && o.recv > 0;
    const label = again ? `Received ${plural(o.recv, 'time')} already${q && q.dlq ? ' (the bin takes a failing ticket at 3)' : ''}` : o.hidden ? `Face down: shows again in ${plural(o.hidden, 'turn')}` : o.back ? `Retries in ${plural(o.back, 'turn')}, attempt ${(tk.attempts | 0) + 1} of 3` : (st.map(x => x[1]).join(', ') || 'A plain ticket');
    const face = again ? `<b>↺${o.recv}</b>` : o.hidden ? `<b>⌛${o.hidden}</b>` : o.back ? `<b>↻${o.back}</b>` : st.slice(0, 2).map(x => glyph[x[0]]).join('') || icon('ticket');
    return `<span class="${cls}" data-tk="${esc(tk.id)}" role="img" aria-label="${esc(label)}" title="${esc(label)}">${face}</span>`;
  }
  function deskHtml(s, d, stools) {
    const f = s.fight, w = f.world, n = stools[d.id];
    const busy = d.busy.map(b => b.msgs.map(m => m.tk));
    const seats = [];
    for (let i = 0; i < n; i++) seats.push(`<span class="fl-stool${busy[i] ? ' busy' : ''}${d.reserved != null ? ' bolted' : ''}" title="${busy[i] ? 'Working: ' + busy[i].length + ' ticket(s)' : 'Free stool'}">${sprite(d.reserved != null ? 'ic-live/stool-orders' : 'ic-live/stool', 'fl-stspr')}${busy[i] ? ticket(busy[i][0]) : ''}</span>`);
    const who = CLERK(d.name || '');
    const knob = w.queue ? `<span class="fl-knob" role="group" aria-label="Batch size">Batch ${[1, 2, 3].map(k => `<button class="${d.batch === k ? 'on' : ''}" data-batch="${k}" aria-pressed="${d.batch === k}">${k}</button>`).join('')}</span>` : '';
    return `<div class="fl-desk" data-desk="${esc(d.id)}"><div class="fl-dk">${who ? head(who, 'neutral') : ''}${sprite('ic-live/desk', 'fl-dkspr')}</div><div class="fl-dh"><b>${esc(d.name || 'The desk')}</b>${d.takes !== 'any' ? `<span class="fl-takes tag-${d.takes}">${d.takes === 'peak' ? 'P' : 'T'} only</span>` : ''}${d.reserved != null ? '<span class="fl-bolt">Reserved</span>' : ''}${d.partial ? '<span class="fl-bolt">Partial batch</span>' : ''}</div>
      <div class="fl-stools">${seats.join('') || '<span class="muted small">No stools free</span>'}</div>${knob}</div>`;
  }
  function floorScreen(s, fin) {
    const f = s.fight, w = f.world, cl = F.CLAIMS[f.claim], q = w.queue;
    const stools = SD.awsSim.stools(w);
    const nc = w.pool ? w.pool.total - Object.keys(stools).reduce((a, k) => a + stools[k] - (w.desks.find(d => d.id === k).extra || 0), 0) : 0;
    const wave = F.wave(s);
    const pieces = f.pieces.map(p => p.id);
    const door = pieces.filter(id => C[id].slot === 'door').map(id => `<span class="fl-piece">${icon(C[id].icon)}${esc(C[id].name)}</span>`).join('') || '<span class="muted small">Open: no cache on it</span>';
    const router = pieces.find(id => C[id].slot === 'router');
    const routerHtml = router ? `<span class="fl-piece">${icon(C[router].icon)}${esc(C[router].name)}${router === 'sns' && w.router.filter ? ' + filter policy' : ''}</span>` : `<span class="muted small">None: everything goes to ${esc(w.desks[0].name)}</span>`;
    const rack = q ? `<div class="fl-zone fl-rack">${sprite('ic-live/rack', 'fl-zs')}<div class="fl-zh"><b>${q.fifo ? 'FIFO rack' : 'The rack'}</b>
        <span class="fl-knob" role="group" aria-label="Visibility timeout">Timeout ${[1, 2, 3].map(k => `<button class="${q.vis === k ? 'on' : ''}" data-vis="${k}" aria-pressed="${q.vis === k}">${k}</button>`).join('')}</span></div>
        ${w.desks.map(d => { const lane = q.items.filter(m => m.desk === d.id); return `<div class="fl-lane">${w.desks.length > 1 ? `<span class="small">${esc(d.name)}:</span>` : ''}${lane.map(m => ticket(m.tk, { hidden: m.hide, recv: m.recv })).join('') || '<span class="muted small">empty</span>'}</div>`; }).join('')}
        ${q.dlq || q.bin.length ? `<div class="fl-bin">${sprite('ic-live/bin', 'fl-binspr')}<span>Dead-letter bin: <b>${q.bin.length}</b>${q.bin.length ? ' · ' + q.bin.map(m => ticket(m.tk, { cls: 'bad' })).join('') : ''}</span></div>` : ''}</div>`
      : '<div class="fl-zone fl-rack none"><span class="muted small">No rack: callers go straight to the desks.</span></div>';
    const last = f.lastOut;
    const counts = {};
    (f.last || []).forEach(e => { counts[e.type] = (counts[e.type] | 0) + 1; });
    const WORD = { done: 'handled', throttled: 'bounced (429)', gaveUp: 'gave up', unanswered: 'left unanswered', dupe: 'handled twice', dupeBlocked: 'second write blocked', deduped: 'copy dropped', order: 'out of order', rejected: 'wrong desk', fail: 'failed', dlq: 'into the bin', leak: 'leaked', denied: 'turned back', cached: 'answered from the cache', scanned: 'found by a full scan', hot: 'held at a busy shelf' };
    const result = last ? `<div class="fl-result${last.spill ? ' spilt' : ''}" aria-live="polite">${Object.keys(WORD).filter(k => counts[k]).map(k => `<span>${counts[k]} ${WORD[k]}</span>`).join(' · ') || 'Nothing moved.'}
        <b>${last.spill ? `Spilled −${last.spill}` : 'No spill'}${last.caught ? ` · Mop caught ${last.caught}` : ''}</b></div>
        ${last.lines.map(t => say('dutch', 'neutral', F.TEACH[t])).join('')}` : (f.turn === 0 && s.cleared === 0 && s.night === 1 ? say('dutch', 'neutral', 'Tickets come down the chute. The clerks handle them. Play what you want on the floor, then pull the lever.') : '');
    const hand = f.hand.map((i, h) => {
      const e = s.deck[i], why = F.why(s, h);
      return cardHtml(e.id, { attrs: `data-h="${h}" ${why ? 'aria-disabled="true"' : ''}`, cost: F.cost(e), up: e.up, text: F.cardText(e), why });
    }).join('');
    const b = panel(`<div class="fl-top"><span class="fl-foe" role="img" aria-label="${esc(cl.name)}">${foe(f.claim)}</span><div class="fl-tn"><p class="fl-claim">${esc(cl.name)}</p><p class="small">${esc(HOME[cl.home])} · "${esc(cl.says)}"</p></div>
        <p class="fl-turn">Turn ${Math.min(f.turn + 1, cl.limit)} of ${cl.limit}<br><span class="small">${plural(Math.max(0, f.waves.length - f.turn), 'wave')} to come</span></p></div>
      ${budgetJar(s)}
      <div class="fl-play"><div class="fl-board">
      <div class="fl-zone fl-chute">${sprite('floor/chute', 'fl-zs')}<div class="fl-zh"><b>The chute</b><span class="small">${wave.length ? plural(wave.length, 'ticket') + ' this turn' : 'empty'}</span></div>
        <div class="fl-lane">${wave.map(tk => ticket(tk)).join('') || '<span class="muted small">Nothing new. The floor works through what it has.</span>'}</div>
        ${w.pending.length ? `<div class="fl-lane fl-retry"><span class="small"><b>Coming back</b> (bounced callers retrying):</span>${w.pending.map(p => ticket(p.tk, { cls: 'retry', back: p.at - w.t })).join('')}</div>` : ''}</div>
      <div class="fl-zone fl-strip" data-zone="door">${sprite('ic-live/gate', 'fl-zs')}<b>Door</b>${door}</div>
      <div class="fl-zone fl-strip">${sprite(router === 'sns' ? 'floor/bell' : 'floor/router', 'fl-zs')}<b>Router</b>${routerHtml}</div>
      ${rack}
      <div class="fl-desks">${w.desks.map(d => deskHtml(s, d, stools)).join('')}</div>
      <div class="fl-puddle${f.spill ? '' : ' dry'}" style="--p:${Math.min(1, f.spill / 36).toFixed(2)}" role="img" aria-label="Spilled this claim: ${f.spill}"><i></i>${f.guard ? sprite('floor/mop', 'fl-mopspr', 'Mop ready') : ''}<span>${f.spill ? `Spilled this claim <b>${f.spill}</b>` : 'Floor dry'}</span></div>
      ${nc > 0 ? `<p class="small fl-nc">${sprite('floor/nightclerk', 'fl-ncspr')}The Night Clerk (batch reports) is sitting on ${plural(nc, 'stool')} of the ${w.pool.total}.</p>` : ''}
      ${pieces.includes('condwrite') ? `<p class="small">${icon('open-book')}Kai's ledger is open: a ticket handled twice spills nothing.</p>` : ''}
      ${pieces.includes('backoff') ? `<p class="small">${icon('hourglass')}Callers who bounce wait 1, then 2 turns before trying again.</p>` : ''}
      </div><div class="fl-side">
      ${s.ruleNote && C[s.ruleNote] && !fin ? `<p class="fl-rule">${icon(C[s.ruleNote].icon)}<span><b>${esc(C[s.ruleNote].name)}:</b> ${esc(C[s.ruleNote].text)}</span></p>` : ''}
      ${result}
      ${fin ? '' : `<p class="fl-cap">Capacity <b>${f.cap}</b> of ${F.CAP}${f.guard ? ` · Mop ready (${f.guard})` : ''}</p>
      <div class="fl-hand">${hand}</div>`}
      <details class="fl-what small"><summary>What spills</summary><p>Bounced (429) 1 · Gave up 3 · Caller left unanswered 3 · Handled twice 2 · Out of order 2 · Wrong desk 1 · Failed 1 · Leaked 4 · Never handled 2 · Parked in the bin 1.</p></details>
      </div></div>
      <div class="fl-dock">${fin ? `<button class="primary" id="fl-on">${s.phase === 'zero' ? 'The shutters come down' : 'Claim closed: on to the proof'}</button>`
        : `<button class="ghost" id="fl-stop">☰ Stop</button><button class="primary" id="fl-lever">${sprite('floor/lever', 'fl-lvspr')}Pull the lever</button>`}</div>`);
    if (fin) { b.querySelector('#fl-on').onclick = () => { stopTurn(); draw(s); }; return b; }
    wirePeek(b);
    b.querySelectorAll('[data-h]').forEach(el => el.onclick = () => {
      if (peeked(el)) return;
      const h = +el.dataset.h, why = F.why(s, h);
      if (why) { U.float && U.float(el, why); return; }
      // The first time each card is played, its whole rule shows on the floor (the face only has a few words).
      const id = s.deck[f.hand[h]].id, k = keep(); k.read = k.read || {};
      s.ruleNote = k.read[id] ? null : id; k.read[id] = 1;
      F.play(s, h); save(s); draw(s);
    });
    b.querySelectorAll('[data-vis]').forEach(el => el.onclick = () => { F.setVis(s, +el.dataset.vis); save(s); draw(s); });
    b.querySelectorAll('[data-batch]').forEach(el => el.onclick = () => { F.setBatch(s, +el.dataset.batch); save(s); draw(s); });
    b.querySelector('#fl-stop').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#fl-lever').onclick = () => {
      stopTurn();
      const before = snapTickets(b), oldBudget = Math.max(0, s.budget);
      s.ruleNote = null;
      const out = F.lever(s);
      keep().taught = s.taught;
      save(s);
      // The claim's last turn plays out on the floor too; a button then opens the debrief (or the shutters).
      const nb = s.phase === 'floor' ? (draw(s), document.querySelector('#panel .fl')) : floorScreen(s, true);
      if (out && nb) playTurn(nb, before, out, oldBudget);
    };
    return b;
  }

  // ---- The lever pull, played out on the board. No rules here: F.lever has already run, and this replays its events
  // (tickets travel chute → desk; bounced callers fly back to the retry row; spills drip into the puddle and the jar). ----
  let turnTimers = [], turnNodes = [];
  function stopTurn() {
    turnTimers.forEach(clearTimeout); turnTimers = [];
    turnNodes.forEach(n => { try { n.remove(); } catch (e) { /* gone */ } }); turnNodes = [];
    document.querySelectorAll('#panel [data-wait]').forEach(el => { el.style.opacity = ''; el.removeAttribute('data-wait'); });
    document.querySelectorAll('#panel .fl-hold').forEach(el => el.classList.remove('fl-hold'));
  }
  const reduced = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || !Element.prototype.animate;
  function snapTickets(b) {
    const m = {}, ch = b.querySelector('.fl-chute');
    b.querySelectorAll('[data-tk]').forEach(el => { if (!m[el.dataset.tk]) m[el.dataset.tk] = { r: el.getBoundingClientRect(), html: el.outerHTML }; });
    m.__chute = ch ? ch.getBoundingClientRect() : null;
    const pd = b.querySelector('.fl-puddle');
    m.__p = pd ? pd.style.getPropertyValue('--p') : null;
    return m;
  }
  const POP = { done: ['✓', 'good'], deduped: ['copy dropped', 'good'], dupeBlocked: ['2nd write blocked', 'good'], dlq: ['→ bin', ''],
    throttled: ['429', 'bad'], gaveUp: ['gave up', 'bad'], unanswered: ['no answer', 'bad'], dupe: ['×2 handled', 'bad'], order: ['out of order', 'bad'],
    rejected: ['wrong desk', 'bad'], fail: ['failed', 'bad'], leak: ['leaked!', 'bad'], denied: ['turned back', ''], cached: ['from cache', 'good'], scanned: ['full scan', ''], hot: ['busy shelf', 'bad'] };
  const SFX = { done: 'card', throttled: 'resist', denied: 'resist', cached: 'card', hot: 'resist', gaveUp: 'hurt', leak: 'hurt', fail: 'hurt', dlq: 'thud' };
  function fx(name) { try { if (SD.audio && SD.audio.sfx) SD.audio.sfx(name); } catch (e) { /* no sound */ } }
  function popAt(r, text, cls) {
    if (!r) return;
    const p = document.createElement('div');
    p.className = 'fl-pop ' + (cls || '');
    p.textContent = text;
    p.style.left = (r.left + r.width / 2) + 'px'; p.style.top = (r.top + r.height / 2) + 'px';
    document.body.appendChild(p); turnNodes.push(p);
    turnTimers.push(setTimeout(() => p.remove(), 1300));
  }
  function playTurn(b, before, out, oldBudget) {
    if (reduced()) return;
    const evs = out.events.filter(e => e.id);
    const ids = new Set(evs.map(e => e.id));
    const at = sel => { const el = b.querySelector(sel); return el && el.getBoundingClientRect(); };
    const deskR = id => at(`.fl-desk[data-desk="${id}"]`) || at('.fl-desk');
    const puddle = b.querySelector('.fl-puddle'), jar = b.querySelector('.fl-jar-b i');
    // Tickets that moved without an event of their own (into the rack, onto a stool, along the retry row) slide there.
    b.querySelectorAll('[data-tk]').forEach(el => {
      const id = el.dataset.tk;
      if (ids.has(id)) { el.style.opacity = '0'; el.dataset.wait = '1'; return; }
      const was = before[id] ? before[id].r : before.__chute;
      if (!was) return;
      const r = el.getBoundingClientRect(), dx = was.left - r.left, dy = was.top - r.top;
      if (Math.abs(dx) + Math.abs(dy) < 2) return;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.3, .7, .3, 1)' });
    });
    // The verdict and Dutch's line arrive after the tickets do.
    b.querySelectorAll('.fl-result, .fl-side > .fl-say').forEach(el => el.classList.add('fl-hold'));
    const newP = puddle && puddle.style.getPropertyValue('--p');
    if (puddle && before.__p != null) { puddle.style.setProperty('--p', before.__p); puddle.querySelector('span').classList.add('fl-hold'); }
    if (jar) jar.style.width = oldBudget + '%';
    const step = Math.min(130, 1700 / Math.max(1, evs.length));
    evs.forEach((e, i) => turnTimers.push(setTimeout(() => fly(e), 120 + i * step)));
    turnTimers.push(setTimeout(settle, 120 + evs.length * step + 560));
    function fly(e) {
      const src = before[e.id] ? before[e.id].r : before.__chute;
      if (!src) return;
      const g = document.createElement('div');
      g.className = 'fl-ghost';
      g.innerHTML = before[e.id] ? before[e.id].html : '<span class="fl-tk"></span>';
      g.style.left = src.left + 'px'; g.style.top = src.top + 'px';
      document.body.appendChild(g); turnNodes.push(g);
      const c = r => [r.left + r.width / 2 - (src.left + src.width / 2), r.top + r.height / 2 - (src.top + src.height / 2)];
      const desk = (e.type === 'denied' || e.type === 'cached') ? at('[data-zone="door"]') : deskR(e.desk);
      const [x1, y1] = desk ? c(desk) : [0, 0];
      const k = [{ transform: 'translate(0, 0)' }, { transform: `translate(${x1}px, ${y1}px)`, offset: .55 }];
      let end = desk, fade = 'scale(.5)';
      if (e.type === 'throttled') {
        const back = b.querySelector(`[data-tk="${e.id}"]`), br = back && back.getBoundingClientRect();
        const [x2, y2] = br ? c(br) : [0, 0];
        k.push({ transform: `translate(${x2}px, ${y2}px) rotate(-14deg)` }); end = br || src; fade = null;
      } else if (e.type === 'denied') {
        k.push({ transform: `translate(${x1 - 14}px, ${y1}px)`, offset: .7 }, { transform: `translate(${x1 + 10}px, ${y1}px)`, offset: .82 }, { transform: `translate(${x1}px, ${y1 + 30}px)`, opacity: 0 });
      } else if (POP[e.type] && POP[e.type][1] === 'bad' && puddle) {
        const pr = puddle.getBoundingClientRect(), [x2, y2] = c(pr);
        k.push({ transform: `translate(${x2 + (Math.random() * 60 - 30)}px, ${y2}px) scale(.6)`, opacity: .2 });
      } else k.push({ transform: `translate(${x1}px, ${y1}px) ${fade}`, opacity: 0 });
      g.animate(k, { duration: 620, easing: 'ease-in-out', fill: 'forwards' }).onfinish = () => {
        g.remove();
        const real = b.querySelector(`[data-tk="${e.id}"][data-wait]`);
        if (real) { real.style.opacity = ''; real.removeAttribute('data-wait'); }
      };
      turnTimers.push(setTimeout(() => {
        const p = POP[e.type];
        if (p) popAt(desk, p[0], p[1]);
        const cost = F.COST[e.type];
        if (cost && puddle) turnTimers.push(setTimeout(() => popAt(puddle.getBoundingClientRect(), '−' + cost, 'drip'), 260));
        if (SFX[e.type]) fx(SFX[e.type]);
      }, 340));
      void end;
    }
    function settle() {
      b.querySelectorAll('[data-wait]').forEach(el => { el.style.opacity = ''; el.removeAttribute('data-wait'); });
      b.querySelectorAll('.fl-hold').forEach(el => el.classList.remove('fl-hold'));
      if (puddle && newP) puddle.style.setProperty('--p', newP);
      if (jar) { jar.style.width = ''; }
      if (out.caught && puddle) popAt(puddle.getBoundingClientRect(), `Mop caught ${out.caught}`, 'good');
      if (out.spill) { popAt(at('.fl-jar'), '−' + out.spill + '%', 'drip big'); fx('hurt'); }
      else { const r = b.querySelector('.fl-result'); if (r && U.burst) U.burst(r); fx('ok'); }
    }
  }

  // ---- The debrief: "why did that work?" ----
  function debriefQuestion(s, cardId) {
    const k = keep();
    const used = new Set((s.debriefs || []).map(d => d.q));
    // The twins rule first: a miss from last night opens the first debrief.
    while (s.carry.length) {
      const id = s.carry.shift(), q = E().find(id);
      if (q && E().allowed(q) && !used.has(q.id)) { k.carry = s.carry.slice(); return { q, why: 'again' }; }
    }
    const re = C[cardId] && C[cardId].q;
    const text = q => [q.q].concat(q.opts || []).join(' ');
    const r = M.pickDomain(1, { match: q => !!re && re.test(text(q)), n: 1, verifiedOnly: true, mix: 0, avoid: Array.from(used) });
    const it = r.items[0];
    return it ? { q: E().find(it.q), why: 'card' } : null;
  }
  function verifiedTwins(q, avoid) {
    return ((SD.twins && SD.twins[q.id]) || []).map(id => E().find(id)).filter(x => x && E().allowed(x) && D().isVerified(x) && !avoid.has(x.id));
  }
  function debriefScreen(s) {
    const f = s.fight, cl = F.CLAIMS[f.claim], card = F.debriefCard(s), c = C[card];
    const won = s.budget > 0;
    const b = panel(`<p class="fl-claim">${esc(cl.name)}: ${f.lastOut && f.lastOut.end && f.lastOut.end.quiet ? 'cleared' : 'closed'}</p>
      ${budgetJar(s)}
      <p>This claim spilled <b>${f.spill}</b>.${f.lastOut && f.lastOut.end && f.lastOut.end.lost ? ` ${plural(f.lastOut.end.lost, 'ticket')} never got handled.` : ''}</p>
      ${say(...(f.spill <= 6 ? cl.cleared : ['dutch', 'tired', 'Messy. But it\'s closed.']))}
      <div class="fl-proof">${icon(c.icon)}<span><b>${esc(c.name)}</b><br><span class="small">${esc(c.back)}</span></span></div>
      ${say('dutch', 'neutral', 'Now the proof. Why did that work? One question, and say how sure you are.')}
      <div class="fl-dock"><button class="primary" id="fl-ask">Answer the proof</button></div>`);
    b.querySelector('#fl-ask').onclick = async () => {
      const pick = debriefQuestion(s, card);
      if (!pick || !pick.q) { F.settle(s, false, card); save(s); draw(s); return; }
      const r = await M.ask(pick.q, { tally: s.tally, title: 'THE PROOF' });
      if (r.closed || r.skipped) { save(s); draw(s); return; }
      const avoid = new Set((s.debriefs || []).map(d => d.q).concat([pick.q.id]));
      s.debriefs.push({ q: pick.q.id, card, ok: !!r.ok, conf: r.conf, pts: r.pts, claim: f.claim });
      if (!r.ok) {
        const tw = verifiedTwins(pick.q, avoid);
        keep().carry = (keep().carry || []).concat([tw.length ? tw[0].id : pick.q.id]).slice(-3);
      }
      s.lastProof = { ok: !!r.ok, card, pts: r.pts };
      F.settle(s, !!r.ok, card);
      save(s); draw(s);
    };
    if (!won) return;
  }

  function rewardScreen(s) {
    const p = s.lastProof, f = s.fight, opts = F.rewards(s);
    const card = p && C[p.card];
    const b = panel(`${p ? (p.ok ? say('dutch', 'smile', `That's a record. ${card.name} is proven: it costs 1 less from now on.`) : say('dutch', 'tired', 'Not that one. The same idea comes back next night in a different coat.')) : ''}
      ${p ? `<p class="small">Points ${M.sgn(p.pts)}</p>` : ''}
      <p><b>Take a card for the deck</b> (or leave it):</p>
      <div class="fl-hand">${opts.map(id => cardHtml(id, { attrs: `data-take="${id}"`, cost: C[id].cost, text: C[id].text, who: C[id].who })).join('')}</div>
      <div class="fl-dock"><button class="ghost" id="fl-leave">Leave it</button></div>`);
    const go = id => { F.take(s, id); save(s); draw(s); };
    b.querySelectorAll('[data-take]').forEach(el => el.onclick = () => { if (peeked(el)) return; go(el.dataset.take); });
    wirePeek(b);
    b.querySelector('#fl-leave').onclick = () => go(null);
    void f;
  }

  // ---- The end: the Hunch's last wave, win or lose (L1), then one line and Pip ----
  function endScreen(s) {
    const k = keep();
    const zero = s.phase === 'zero';
    if (!s.paid) {
      s.paid = M.pay(ID) || ' ';
      k.night = s.night; k.taught = s.taught;
      if (!k.best || s.budget > k.best) k.best = Math.max(0, s.budget);
      if (SD.modeStage && SD.modeStage.sting) SD.modeStage.sting(ID, zero ? 'lose' : 'win');
    }
    const top = Object.keys(s.used).filter(id => C[id].kind === 'piece').sort((a, b) => s.used[b] - s.used[a])[0];
    const proofs = s.debriefs.filter(d => d.ok).length;
    const tile = (n, label, art) => `<div class="fl-tile">${art}<b>${n}</b><span>${label}</span></div>`;
    const b = panel(`<p class="fl-night">Night ${s.night}: ${zero ? 'shutters down' : 'the Hunch drained'}</p>
      ${say('dutch', zero ? 'tired' : 'smile', zero ? F.SAY.zero : F.SAY.won)}
      <div class="fl-endtop">
        ${mapHtml(s, true)}
        <div class="fl-endside">
          ${budgetJar(s)}
          <div class="fl-tiles">${tile(s.cleared, 'claims closed', sprite('ic-live/env-done', 'fl-tlspr'))}${tile(`${proofs}/${s.debriefs.length}`, 'proofs held', icon('checked-shield'))}${tile(s.spilled, 'spilled', '<i class="fl-drop"></i>')}</div>
          ${top ? `<p class="small">The piece that carried you</p><div class="fl-carry">${cardHtml(top, { attrs: 'disabled', cost: C[top].cost, text: C[top].back, who: 'Played ' + plural(s.used[top], 'time') })}</div>` : ''}
        </div>
      </div>
      ${s.tally ? M.calibHtml(s.tally, 'How sure you were in the proofs') : ''}
      ${s.paid && s.paid.trim() ? `<p class="small">${esc(s.paid)}</p>` : ''}
      ${M.pipHtml()}
      <p class="small muted">That's the night. Stop here.</p>
      <div class="fl-dock"><button class="primary" id="fl-done">Done</button></div>`);
    M.pipWire(b, 'The Sorting Floor');
    b.querySelector('#fl-done').onclick = () => { s.phase = 'done'; save(s); U.closePanel(); stopNow(); };
    save(s);
  }

  M.register({
    id: ID, name: 'The Sorting Floor', minutes: 'about 18', host: 'Dutch',
    blurb: 'Every claim is a workload. Build the architecture that handles it: queues, bins, bells and rules.',
    start,
    status: () => { const s = cur(); if (!s || s.v !== 1 || s.phase === 'done') return '';
      return `Resume · Night ${s.night} · ${s.fight ? F.CLAIMS[s.fight.claim].name + ' · ' : ''}Budget ${Math.max(0, s.budget)}%`; }
  });
  SD.floorUi = { draw: () => { const s = cur(); if (s) draw(s); }, start };

  const css = document.createElement('style');
  css.textContent = `
    .fl { display: flex; flex-direction: column; gap: 8px; }
    .fl p { margin: 0; }
    .fl-gi { width: 18px; height: 18px; vertical-align: -4px; flex: 0 0 auto; }
    .fl-night, .fl-claim { font-family: var(--f-head); font-weight: 700; font-size: 18px; }
    .fl-top { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
    .fl-foe { flex: 0 0 64px; width: 64px; height: 64px; }
    .fl-foe svg { width: 64px; height: 64px; }
    .fl-tn { flex: 1; min-width: 0; }
    .fl-turn { text-align: right; font-weight: 700; font-size: 14px; }
    .fl-say { display: flex; gap: 8px; align-items: flex-start; font-size: 15px; line-height: 1.35; }
    .fl-head { flex: 0 0 34px; width: 34px; height: 40px; overflow: hidden; border-radius: 8px; border: 2px solid var(--ink, #17131f); background: var(--paper, #c7bca4); }
    .fl-head .bust, .fl-head svg { width: 30px !important; height: 36px !important; }
    .fl-head img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
    .fl-jar { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .fl-jar-l { display: inline-flex; gap: 4px; align-items: center; font-weight: 700; }
    .fl-jar-b { flex: 1; height: 12px; border: 2px solid var(--ink, #17131f); border-radius: 6px; overflow: hidden; background: var(--bone, #e2dbcb); }
    .fl-jar-b i { display: block; height: 100%; background: var(--blue, #3f5f80); }
    .fl-map { display: flex; flex-direction: column; gap: 8px; padding: 8px; border-radius: 12px; border: 3px solid var(--ink, #17131f); background: repeating-linear-gradient(45deg, #8a8478 0 6px, #7f796e 6px 12px); }
    .fl-row { display: flex; gap: 6px; justify-content: center; }
    .fl-door { flex: 1 1 0; max-width: 160px; min-height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border: 3px solid var(--ink, #17131f); border-radius: 12px 12px 4px 4px; background: #c9c2b2; color: var(--ink, #17131f); font-size: 13px; }
    .fl-door:disabled { opacity: 1; }
    .fl-door.reach { background: #f3ecd9; box-shadow: 0 0 0 3px var(--sun, #b8923a); font-weight: 700; }
    .fl-door.done { background: #9fb09a; }
    .fl-boss { max-width: none; background: #2c3550; color: #fff; }
    .fl-boss.reach { background: #3f5f80; color: #fff; }
    .fl-dn { font-weight: 800; } .fl-dt { font-size: 11px; }
    .fl-zone { border: 2px solid var(--ink, #17131f); border-radius: 10px; padding: 6px 8px; background: var(--bone, #e2dbcb); display: flex; flex-direction: column; gap: 4px; }
    .fl-zh { display: flex; justify-content: space-between; align-items: center; gap: 6px; flex-wrap: wrap; }
    .fl-zh b { display: inline-flex; gap: 4px; align-items: center; }
    .fl-chute { background: repeating-linear-gradient(90deg, #d9d2c0 0 10px, #cfc7b3 10px 20px); }
    .fl-strip { flex-direction: row; flex-wrap: wrap; align-items: center; gap: 6px; }
    .fl-strip > b { display: inline-flex; gap: 4px; align-items: center; min-width: 74px; }
    .fl-piece { display: inline-flex; gap: 4px; align-items: center; padding: 2px 6px; border: 2px solid var(--ink, #17131f); border-radius: 8px; background: #fff; font-size: 13px; font-weight: 700; }
    .fl-rack.none { background: transparent; border-style: dashed; }
    .fl-lane { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; min-height: 34px; }
    .fl-tk { display: inline-flex; align-items: center; justify-content: center; gap: 1px; width: 30px; height: 34px; border: 2px solid var(--ink, #17131f); border-radius: 4px; background: #fffaf0; font-size: 11px; line-height: 1; }
    .fl-tk .fl-gi { width: 13px; height: 13px; vertical-align: 0; }
    .fl-tk.tag-peak { background: #f3d6c2; } .fl-tk.tag-thornwick { background: #d6e3cf; }
    .fl-tk.down { background: #4a4552; color: #fff; }
    .fl-tk.bad { border-style: dashed; }
    .fl-tk.retry { border-style: dashed; background: #f6e3a8; }
    .fl-retry { border-top: 1px dashed var(--ink, #17131f); padding-top: 4px; }
    .fl-bin { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; font-size: 13px; }
    .fl-desks { display: flex; flex-wrap: wrap; gap: 6px; }
    .fl-desk { flex: 1 1 150px; border: 3px solid var(--ink, #17131f); border-radius: 10px; padding: 6px; background: #c9b590; display: flex; flex-direction: column; gap: 4px; }
    .fl-dh { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; font-size: 13px; }
    .fl-takes, .fl-bolt { font-size: 11px; font-weight: 800; padding: 1px 4px; border: 1px solid var(--ink, #17131f); border-radius: 4px; background: #fff; }
    .fl-takes.tag-peak { background: #f3d6c2; } .fl-takes.tag-thornwick { background: #d6e3cf; }
    .fl-stools { display: flex; flex-wrap: wrap; gap: 4px; }
    .fl-stool { width: 36px; height: 40px; border: 2px solid var(--ink, #17131f); border-radius: 50% 50% 6px 6px; background: #e8dcc2; display: flex; align-items: center; justify-content: center; }
    .fl-stool.bolted { box-shadow: inset 0 0 0 3px var(--blue, #3f5f80); }
    .fl-stool .fl-tk { width: 26px; height: 28px; }
    .fl-knob { display: inline-flex; gap: 3px; align-items: center; font-size: 12px; font-weight: 700; }
    .fl-knob button { min-width: 34px; min-height: 34px; padding: 0 6px; }
    .fl-knob button.on { background: var(--blue, #3f5f80); color: #fff; }
    .fl-nc { display: flex; gap: 4px; align-items: center; }
    .fl-result { padding: 6px 8px; border: 3px double var(--ink, #17131f); border-radius: 8px; background: #fff; font-size: 13px; display: flex; flex-wrap: wrap; gap: 2px 8px; }
    .fl-result.spilt { border-color: var(--red, #9e3a34); color: var(--red, #9e3a34); }
    .fl-cap { font-size: 14px; }
    .fl-hand { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
    .fl-card { position: relative; display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 120px; padding: 0 6px 6px; text-align: center; overflow: hidden;
      border: 3px solid var(--ink, #17131f); border-radius: 10px; background: #fffaf0; color: var(--ink, #17131f); font-size: 13px; line-height: 1.15; -webkit-touch-callout: none; user-select: none; }
    .fl-art { display: flex; align-items: center; justify-content: center; align-self: stretch; height: 52px; margin: 0 -6px 4px; border-bottom: 3px solid #17131f;
      background: radial-gradient(circle at 50% 60%, rgba(255, 255, 255, .45), transparent 60%), linear-gradient(#5d7fa3, #2f4c6c); }
    .k-act .fl-art { background: radial-gradient(circle at 50% 60%, rgba(255, 255, 255, .5), transparent 60%), linear-gradient(#e0b65a, #a77a26); }
    .fl-art .fl-gi { width: 38px; height: 38px; color: #fffaf0; fill: currentColor; filter: drop-shadow(0 2px 0 rgba(0, 0, 0, .45)); }
    .fl-card > b { font-size: 14px; }
    .fl-short { font-size: 12px; color: #4a4036; }
    .fl-card .fl-tag, .fl-card .fl-why { margin-top: auto; }
    .fl-card .fl-ct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 8px; background: #fffaf0; color: #17131f; font-size: 13px; line-height: 1.3; opacity: 0; pointer-events: none; transition: opacity .12s; }
    .fl-card.peek .fl-ct { opacity: 1; }
    @media (hover: hover) { .fl-card:hover .fl-ct { opacity: 1; transition-delay: .45s; } }
    .fl-card.no .fl-art { filter: grayscale(.8) brightness(.8); }
    .fl-card.no { background: #ddd6c8; }
    .fl-card.up { box-shadow: inset 0 0 0 3px var(--mint, #4f7f5c); }
    .fl-cost { position: absolute; z-index: 1; top: 4px; right: 6px; width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--ink, #17131f); background: var(--sun, #b8923a); font-weight: 800; display: flex; align-items: center; justify-content: center; }
    .fl-why { font-size: 11px; font-weight: 800; color: var(--red, #9e3a34); }
    .fl-tag { font-size: 11px; font-weight: 800; color: var(--blue, #3f5f80); }
    .fl-proof, .fl-since { display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; border-left: 4px solid #17131f; background: #e2dbcb; }
    .fl-proof .muted, .fl-since .muted, .fl-proof .small, .fl-since .small { color: #4a4036; }
    .fl-proof .fl-gi { width: 28px; height: 28px; }
    .fl-what summary { cursor: pointer; font-weight: 700; min-height: 32px; }
    .fl-dock { position: sticky; bottom: -16px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin: 4px -16px -16px; padding: 10px 16px; background: var(--cream, #fffaf0); border-top: 3px solid var(--ink, #17131f); }
    .fl-dock button { min-height: 44px; display: inline-flex; gap: 6px; align-items: center; justify-content: center; }
    .fl-dock .primary { flex: 1 1 auto; }
    /* Boxes painted light keep dark ink, also on the full-screen stage's dark glass (js/mode-stage.js). */
    :is(.fl-chute, .fl-desk, .fl-tk, .fl-card, .fl-result, .fl-piece, .fl-door:not(.fl-boss), .fl-stool, .fl-takes, .fl-bolt, .fl-proof, .fl-since, .fl-head) { color: #17131f; }
    :is(.fl-chute, .fl-desk, .fl-tk, .fl-card, .fl-stool, .fl-cost, .fl-takes, .fl-bolt) { border-color: #17131f; }
    .fl-tk.down { color: #fff; }
    .fl-card .fl-tag { color: #3f5f80; } .fl-card .fl-why, .fl-result.spilt { color: #9e3a34; }
    .fl-zone:not(.fl-chute) { background: rgba(226, 219, 203, .12); }
    .fl-zone.fl-rack.none { background: transparent; }
    .fl-puddle { position: relative; display: flex; align-items: center; justify-content: center; min-height: 34px; font-size: 13px; color: #e8e2f2; }
    .fl-puddle i { position: absolute; left: 50%; top: 50%; width: calc(30% + 70% * var(--p, 0)); height: calc(18px + 16px * var(--p, 0)); transform: translate(-50%, -50%);
      border-radius: 50%; background: radial-gradient(ellipse at 40% 35%, rgba(150, 190, 230, .55), rgba(40, 70, 110, .75) 60%, rgba(20, 30, 50, .2)); box-shadow: 0 0 12px rgba(90, 140, 200, .35); transition: width .6s ease-out, height .6s ease-out; }
    .fl-puddle.dry i { opacity: .25; }
    .fl-puddle span { position: relative; text-shadow: 0 1px 2px #000; }
    .fl-ghost { position: fixed; z-index: 60; pointer-events: none; will-change: transform; }
    .fl-ghost .fl-tk { box-shadow: 0 4px 10px rgba(0, 0, 0, .55); }
    .fl-pop { position: fixed; z-index: 61; pointer-events: none; transform: translate(-50%, -50%); font-family: var(--f-head); font-weight: 800; font-size: 17px; color: #fff; white-space: nowrap;
      text-shadow: 0 2px 0 #000, 0 0 6px rgba(0, 0, 0, .8); animation: flPop 1.25s ease-out forwards; }
    .fl-pop.good { color: #a8e6a0; } .fl-pop.bad { color: #ff9a8a; } .fl-pop.drip { color: #9cc8ff; } .fl-pop.big { font-size: 26px; }
    @keyframes flPop { 0% { opacity: 0; transform: translate(-50%, -30%) scale(.7); } 15% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } 100% { opacity: 0; transform: translate(-50%, -160%) scale(1); } }
    .fl-hold { opacity: 0; }
    .fl-result, .fl-side > .fl-say { transition: opacity .35s ease-out; }
    .fl-jar-b i { transition: width .7s ease-out; }
    /* The room as objects: sprites on soft plates, not ruled boxes. */
    .fl-spr { image-rendering: pixelated; display: block; flex: 0 0 auto; }
    .fl-zone { position: relative; border: 0; border-radius: 12px; box-shadow: inset 0 0 0 1px rgba(255, 235, 200, .14); }
    .fl-zone:not(.fl-chute) { background: rgba(30, 24, 20, .55); }
    .fl-zone.fl-rack.none { background: transparent; box-shadow: inset 0 0 0 2px rgba(255, 235, 200, .18); }
    .fl-zone .fl-zs { position: absolute; left: 6px; bottom: 4px; height: 56px; width: auto; }
    .fl-chute, .fl-rack:not(.none) { padding-left: 92px; min-height: 86px; }
    .fl-chute .fl-zs { height: 80px; }
    .fl-rack .fl-zs { height: 78px; }
    .fl-strip { padding-left: 76px; min-height: 64px; }
    .fl-strip .fl-zs { height: 56px; }
    .fl-chute { background: linear-gradient(90deg, rgba(120, 82, 44, .55), rgba(60, 40, 22, .55)); color: #f3e9d2; }
    .fl-chute .small, .fl-chute b { color: #f3e9d2; }
    .fl-binspr { height: 48px; }
    .fl-ncspr { height: 44px; }
    .fl-lvspr { height: 30px; margin: -6px 2px -6px -4px; }
    .fl-mopspr { position: absolute; right: 8%; bottom: 0; height: 46px; }
    .fl-desk { flex-direction: row; flex-wrap: wrap; align-items: flex-end; gap: 6px 10px; border: 0; background: rgba(30, 24, 20, .55); box-shadow: inset 0 0 0 1px rgba(255, 235, 200, .14); color: #f3e9d2; }
    .fl-desk .fl-dh { flex: 1 1 100%; order: -1; }
    .fl-desk .fl-dh b { color: #f3e9d2; }
    .fl-dk { position: relative; display: flex; align-items: flex-end; }
    .fl-dk .fl-head { position: absolute; left: 50%; bottom: 46px; transform: translateX(-50%); z-index: 0; width: 40px; height: 46px; border: 0; background: none; }
    .fl-dkspr { position: relative; z-index: 1; height: 78px; }
    .fl-dk { padding-top: 28px; }
    .fl-stools { align-items: flex-end; }
    .fl-stool { position: relative; width: 46px; height: 66px; border: 0; border-radius: 0; background: none; align-items: flex-end; box-shadow: none; }
    .fl-stool.bolted { box-shadow: none; }
    .fl-stspr { height: 46px; margin: 0 auto; }
    .fl-stool .fl-tk { position: absolute; left: 50%; top: 0; transform: translateX(-50%); }
    /* Tickets are envelopes; the stamp is the seal, the homeland a ribbon. */
    .fl-tk { position: relative; width: 34px; height: 30px; border: 0; border-radius: 0; background: url(assets/img/ic-live/env.webp) center / 100% 100% no-repeat; image-rendering: pixelated;
      color: #17131f; font-size: 11px; filter: drop-shadow(0 2px 1px rgba(0, 0, 0, .5)); }
    .fl-tk > * { position: relative; top: 2px; padding: 0 2px; border-radius: 6px; background: rgba(255, 250, 240, .85); }
    .fl-tk.tag-peak { background-color: transparent; box-shadow: inset 0 -4px 0 #d9733a; } .fl-tk.tag-thornwick { background-color: transparent; box-shadow: inset 0 -4px 0 #4f8f4c; }
    .fl-tk.retry { background-image: url(assets/img/ic-live/env-429.webp); background-color: transparent; border: 0; }
    .fl-tk.bad { background-image: url(assets/img/ic-live/env-poison.webp); border: 0; }
    .fl-tk.down { background-color: transparent; filter: brightness(.45) drop-shadow(0 2px 1px rgba(0, 0, 0, .5)); }
    .fl-tk.down > * { background: #2a2433; color: #fff; }
    .fl-stool .fl-tk { width: 28px; height: 24px; }
    /* The end of the night: the map first, stamped. */
    .fl-endtop, .fl-endside { display: flex; flex-direction: column; gap: 10px; }
    .fl-endmap { overflow: hidden; }
    .fl-endmap .fl-door { position: relative; overflow: visible; flex-direction: row; flex-wrap: wrap; justify-content: flex-start; column-gap: 8px; max-width: 320px; width: 100%; padding: 4px 96px 4px 8px; text-align: left; }
    .fl-endmap .fl-door .fl-dn, .fl-endmap .fl-door .fl-dt { flex: 1 1 60%; }
    .fl-endmap .fl-door .fl-foe-s { order: -1; flex: 0 0 auto; }
    .fl-endmap .fl-boss { max-width: none; }
    .fl-endmap .fl-door.done { background: #e8dcc2; }
    .fl-foe-s { display: block; width: 40px; height: 40px; } .fl-foe-s svg, .fl-foe-s img { width: 40px !important; height: 40px !important; }
    .fl-boss .fl-foe-s { width: 52px; height: 52px; } .fl-boss .fl-foe-s svg { width: 52px !important; height: 52px !important; }
    .fl-stamp { position: absolute; right: 4px; top: 50%; transform: translateY(-50%) rotate(-12deg); padding: 1px 6px; border: 3px double #2f6b3a; border-radius: 4px; color: #2f6b3a; background: rgba(255, 250, 240, .8);
      font-family: var(--f-head); font-weight: 800; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; animation: flStamp .5s cubic-bezier(.2, 1.6, .4, 1) backwards; }
    .fl-stamp.red { border-color: #9e3a34; color: #9e3a34; }
    .fl-endmap .fl-row:nth-child(2) .fl-stamp { animation-delay: .9s; } .fl-endmap .fl-row:nth-child(3) .fl-stamp { animation-delay: .7s; }
    .fl-endmap .fl-row:nth-child(4) .fl-stamp { animation-delay: .5s; } .fl-endmap .fl-row:nth-child(5) .fl-stamp { animation-delay: .3s; }
    .fl-boss .fl-stamp { animation-delay: 1.2s; font-size: 16px; }
    @keyframes flStamp { 0% { opacity: 0; transform: translateY(-50%) rotate(-12deg) scale(1.3); } 100% { opacity: 1; transform: translateY(-50%) rotate(-12deg) scale(1); } }
    .fl-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .fl-tile { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 12px; background: rgba(30, 24, 20, .6); box-shadow: inset 0 0 0 1px rgba(255, 235, 200, .16); text-align: center; }
    .fl-tile b { font-family: var(--f-head); font-size: 26px; line-height: 1; }
    .fl-tile span { font-size: 12px; opacity: .85; }
    .fl-tile .fl-gi { width: 30px; height: 30px; fill: #a8e6a0; }
    .fl-tlspr { height: 30px; }
    .fl-drop { display: block; width: 22px; height: 28px; border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; background: radial-gradient(circle at 40% 35%, #cfe6ff, #3f6f9e 70%); transform: rotate(0deg); clip-path: polygon(50% 0, 100% 62%, 92% 88%, 50% 100%, 8% 88%, 0 62%); }
    .fl-carry .fl-card { width: 100%; max-width: 220px; min-height: 0; opacity: 1; }
    .fl-carry .fl-card .fl-ct { position: static; opacity: 1; padding: 4px 0 0; background: none; font-size: 12px; text-align: left; }
    @media (min-width: 900px) { .fl-endtop { display: grid; grid-template-columns: minmax(0, 1fr) minmax(320px, 1fr); align-items: start; } }
    .fl-rule { display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; border-left: 4px solid #3f5f80; border-radius: 4px; background: #f3ecd9; color: #17131f; font-size: 14px; line-height: 1.3; }
    .fl-rule .fl-gi { width: 24px; height: 24px; }
    .fl-play, .fl-board, .fl-side { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    /* Edge to edge (Ladi, Nov 16): no window box. The floor fills the stage under the bar with the sorting room behind
       a darker wash, like Monster Hunt. On a wide screen the room (chute to desks) sits on the left and the turn's
       result and your hand on the right, so the whole turn fits on one screen without scrolling. */
    body.in-mode[data-stage="floor"] #panel { padding: calc(56px + env(safe-area-inset-top, 0px)) 0 0; align-items: stretch; }
    body.in-mode[data-stage="floor"] #panel :is(.win, .win.wide) { width: 100%; max-width: none; height: 100%; min-height: 100%; max-height: 100%; align-self: stretch;
      padding: 0; border: 0; border-radius: 0; -webkit-backdrop-filter: none; backdrop-filter: none; box-shadow: none;
      background: radial-gradient(120% 90% at 50% 40%, rgba(10, 8, 14, .45), rgba(10, 8, 14, .8)); }
    body.in-mode[data-stage="floor"] #panel .win-h { width: 100%; max-width: 1180px; margin: 0 auto; padding: 10px 16px 6px; border: 0; background: none; }
    body.in-mode[data-stage="floor"] #panel .win-h > span:first-child { visibility: hidden; }
    body.in-mode[data-stage="floor"] #panel .win-b { border-radius: 0; background: none; box-shadow: none; padding: 12px max(16px, calc((100% - 1148px) / 2)) 0; }
    body.in-mode[data-stage="floor"] #panel .win-b { display: flex; flex-direction: column; }
    body.in-mode[data-stage="floor"] #panel .fl { flex: 1 0 auto; }
    body.in-mode[data-stage="floor"] #panel .fl-dock { bottom: 0; margin: auto 0 0; padding: 14px 0 calc(12px + env(safe-area-inset-bottom, 0px)); border-top: 0;
      background: linear-gradient(rgba(10, 8, 14, 0), rgba(10, 8, 14, .92) 34%); }
    body.in-mode[data-stage="floor"] #panel .fl-map { width: 100%; max-width: 760px; align-self: center; }
    @media (min-width: 900px) {
      .fl-play { display: grid; grid-template-columns: minmax(0, 3fr) minmax(340px, 2fr); gap: 20px; align-items: start; }
      body.in-mode[data-stage="floor"] #panel .fl-hand { grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); }
    }`;
  document.head.appendChild(css);
})();
