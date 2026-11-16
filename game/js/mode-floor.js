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
  if (SD.art && SD.art.addFoe) Object.keys(F.CLAIMS).forEach(id => { if (!F.CLAIMS[id].boss) SD.art.addFoe('floor-' + id, { col: '#c9a07a', anim: 'float', src: `assets/img/monsters/floor-${id}.webp` }); });
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
  function mapScreen(s) {
    const boss = F.atBoss(s);
    const rows = F.ROWS.map((r, i) => {
      const ch = F.choices(s.night, i);
      const doors = ch.map(id => {
        const cl = F.CLAIMS[id], here = i === s.row, done = s.path[i] === id;
        return `<button class="fl-door${here ? ' reach' : ''}${done ? ' done' : ''}" data-claim="${id}" ${here ? '' : 'disabled'}>
          <span class="fl-dn">${esc(cl.name)}</span><span class="fl-dt">${esc(HOME[cl.home])}${done ? ' · cleared' : ''}</span></button>`;
      }).join('');
      return `<div class="fl-row">${doors}</div>`;
    }).reverse().join('');
    const first = s.fresh && s.night === 1 && !s.path.length;
    const b = panel(`<p class="fl-night">Night ${s.night}</p>
      ${say('dutch', 'neutral', first ? F.SAY.arrive : s.path.length ? 'Next door.' : F.SAY.again)}
      ${budgetJar(s)}
      <div class="fl-map">
        <button class="fl-door fl-boss${boss ? ' reach' : ''}" data-claim="hunch" ${boss ? '' : 'disabled'}><span class="fl-dn">The Hunch</span><span class="fl-dt">Top of the heap · everything at once</span></button>
        ${rows}
      </div>
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

  // ---- The floor ----
  function ticket(tk, o) {
    o = o || {};
    const q = cur() && cur().fight && cur().fight.world.queue;
    const st = F.stamps(tk);
    const glyph = { bell: icon('ringing-bell'), num: `<b>${esc(tk.group + tk.n)}</b>`, dup: '<b>×2</b>', heavy: icon('hourglass'), star: '<b>✱</b>', lock: icon('padlock'), tag: `<b>${tk.tag === 'peak' ? 'P' : 'T'}</b>` };
    const cls = ['fl-tk', tk.tag && tk.tag !== 'any' ? 'tag-' + tk.tag : '', o.hidden ? 'down' : '', o.cls || ''].join(' ');
    const again = !o.hidden && o.recv > 0;
    const label = again ? `Received ${plural(o.recv, 'time')} already${q && q.dlq ? ' (the bin takes a failing ticket at 3)' : ''}` : o.hidden ? `Face down: shows again in ${plural(o.hidden, 'turn')}` : o.back ? `Retries in ${plural(o.back, 'turn')}, attempt ${(tk.attempts | 0) + 1} of 3` : (st.map(x => x[1]).join(', ') || 'A plain ticket');
    const face = again ? `<b>↺${o.recv}</b>` : o.hidden ? `<b>⌛${o.hidden}</b>` : o.back ? `<b>↻${o.back}</b>` : st.slice(0, 2).map(x => glyph[x[0]]).join('') || icon('ticket');
    return `<span class="${cls}" role="img" aria-label="${esc(label)}" title="${esc(label)}">${face}</span>`;
  }
  function deskHtml(s, d, stools) {
    const f = s.fight, w = f.world, n = stools[d.id];
    const busy = d.busy.map(b => b.msgs.map(m => m.tk));
    const seats = [];
    for (let i = 0; i < n; i++) seats.push(`<span class="fl-stool${busy[i] ? ' busy' : ''}${d.reserved != null ? ' bolted' : ''}" title="${busy[i] ? 'Working: ' + busy[i].length + ' ticket(s)' : 'Free stool'}">${busy[i] ? ticket(busy[i][0]) : ''}</span>`);
    const knob = w.queue ? `<span class="fl-knob" role="group" aria-label="Batch size">Batch ${[1, 2, 3].map(k => `<button class="${d.batch === k ? 'on' : ''}" data-batch="${k}" aria-pressed="${d.batch === k}">${k}</button>`).join('')}</span>` : '';
    return `<div class="fl-desk"><div class="fl-dh"><b>${esc(d.name || 'The desk')}</b>${d.takes !== 'any' ? `<span class="fl-takes tag-${d.takes}">${d.takes === 'peak' ? 'P' : 'T'} only</span>` : ''}${d.reserved != null ? '<span class="fl-bolt">Reserved</span>' : ''}${d.partial ? '<span class="fl-bolt">Partial batch</span>' : ''}</div>
      <div class="fl-stools">${seats.join('') || '<span class="muted small">No stools free</span>'}</div>${knob}</div>`;
  }
  function floorScreen(s) {
    const f = s.fight, w = f.world, cl = F.CLAIMS[f.claim], q = w.queue;
    const stools = SD.awsSim.stools(w);
    const nc = w.pool ? w.pool.total - Object.keys(stools).reduce((a, k) => a + stools[k] - (w.desks.find(d => d.id === k).extra || 0), 0) : 0;
    const wave = F.wave(s);
    const pieces = f.pieces.map(p => p.id);
    const door = pieces.filter(id => C[id].slot === 'door').map(id => `<span class="fl-piece">${icon(C[id].icon)}${esc(C[id].name)}</span>`).join('') || '<span class="muted small">Open: no policy on it</span>';
    const router = pieces.find(id => C[id].slot === 'router');
    const routerHtml = router ? `<span class="fl-piece">${icon(C[router].icon)}${esc(C[router].name)}${router === 'sns' && w.router.filter ? ' + filter policy' : ''}</span>` : `<span class="muted small">None: everything goes to ${esc(w.desks[0].name)}</span>`;
    const rack = q ? `<div class="fl-zone fl-rack"><div class="fl-zh"><b>${icon(C[q.fifo ? 'fifo' : 'stdq'].icon)}${q.fifo ? 'FIFO rack' : 'The rack'}</b>
        <span class="fl-knob" role="group" aria-label="Visibility timeout">Timeout ${[1, 2, 3].map(k => `<button class="${q.vis === k ? 'on' : ''}" data-vis="${k}" aria-pressed="${q.vis === k}">${k}</button>`).join('')}</span></div>
        ${w.desks.map(d => { const lane = q.items.filter(m => m.desk === d.id); return `<div class="fl-lane">${w.desks.length > 1 ? `<span class="small">${esc(d.name)}:</span>` : ''}${lane.map(m => ticket(m.tk, { hidden: m.hide, recv: m.recv })).join('') || '<span class="muted small">empty</span>'}</div>`; }).join('')}
        ${q.dlq || q.bin.length ? `<div class="fl-bin">${icon('swap-bag')}<span>Dead-letter bin: <b>${q.bin.length}</b>${q.bin.length ? ' · ' + q.bin.map(m => ticket(m.tk, { cls: 'bad' })).join('') : ''}</span></div>` : ''}</div>`
      : '<div class="fl-zone fl-rack none"><span class="muted small">No rack: callers go straight to the desks.</span></div>';
    const last = f.lastOut;
    const counts = {};
    (f.last || []).forEach(e => { counts[e.type] = (counts[e.type] | 0) + 1; });
    const WORD = { done: 'handled', throttled: 'bounced (429)', gaveUp: 'gave up', unanswered: 'left unanswered', dupe: 'handled twice', dupeBlocked: 'second write blocked', deduped: 'copy dropped', order: 'out of order', rejected: 'wrong desk', fail: 'failed', dlq: 'into the bin', leak: 'leaked', denied: 'turned back' };
    const result = last ? `<div class="fl-result${last.spill ? ' spilt' : ''}" aria-live="polite">${Object.keys(WORD).filter(k => counts[k]).map(k => `<span>${counts[k]} ${WORD[k]}</span>`).join(' · ') || 'Nothing moved.'}
        <b>${last.spill ? `Spilled −${last.spill}` : 'No spill'}${last.caught ? ` · Mop caught ${last.caught}` : ''}</b></div>
        ${last.lines.map(t => say('dutch', 'neutral', F.TEACH[t])).join('')}` : (f.turn === 0 && s.cleared === 0 && s.night === 1 ? say('dutch', 'neutral', 'Tickets come down the chute. The clerks handle them. Play what you want on the floor, then pull the lever.') : '');
    const hand = f.hand.map((i, h) => {
      const e = s.deck[i], c = C[e.id], why = F.why(s, h);
      return `<button class="fl-card${why ? ' no' : ''}${e.up ? ' up' : ''}" data-h="${h}" ${why ? 'aria-disabled="true"' : ''}>
        <span class="fl-cost">${F.cost(e)}</span>${icon(c.icon)}<b>${esc(c.name)}${e.up ? ' ✓' : ''}</b>
        <span class="fl-ct">${esc(F.cardText(e))}</span>${why ? `<span class="fl-why">${esc(why)}</span>` : `<span class="fl-tag">${c.kind === 'piece' ? 'Stays on the floor' : 'This turn'}</span>`}</button>`;
    }).join('');
    const b = panel(`<div class="fl-top"><span class="fl-foe" role="img" aria-label="${esc(cl.name)}">${foe(f.claim)}</span><div class="fl-tn"><p class="fl-claim">${esc(cl.name)}</p><p class="small">${esc(HOME[cl.home])} · "${esc(cl.says)}"</p></div>
        <p class="fl-turn">Turn ${Math.min(f.turn + 1, cl.limit)} of ${cl.limit}<br><span class="small">${plural(Math.max(0, f.waves.length - f.turn), 'wave')} to come</span></p></div>
      ${budgetJar(s)}
      <div class="fl-zone fl-chute"><div class="fl-zh"><b>${icon('direction-signs')}The chute</b><span class="small">${wave.length ? plural(wave.length, 'ticket') + ' this turn' : 'empty'}</span></div>
        <div class="fl-lane">${wave.map(tk => ticket(tk)).join('') || '<span class="muted small">Nothing new. The floor works through what it has.</span>'}</div>
        ${w.pending.length ? `<div class="fl-lane fl-retry"><span class="small"><b>Coming back</b> (bounced callers retrying):</span>${w.pending.map(p => ticket(p.tk, { cls: 'retry', back: p.at - w.t })).join('')}</div>` : ''}</div>
      <div class="fl-zone fl-strip"><b>${icon('key')}Door</b>${door}</div>
      <div class="fl-zone fl-strip"><b>${icon('direction-signs')}Router</b>${routerHtml}</div>
      ${rack}
      <div class="fl-desks">${w.desks.map(d => deskHtml(s, d, stools)).join('')}</div>
      ${nc > 0 ? `<p class="small fl-nc">${icon('armchair')}The Night Clerk (batch reports) is sitting on ${plural(nc, 'stool')} of the ${w.pool.total}.</p>` : ''}
      ${pieces.includes('condwrite') ? `<p class="small">${icon('open-book')}Kai's ledger is open: a ticket handled twice spills nothing.</p>` : ''}
      ${pieces.includes('backoff') ? `<p class="small">${icon('hourglass')}Callers who bounce wait 1, then 2 turns before trying again.</p>` : ''}
      ${result}
      <p class="fl-cap">Capacity <b>${f.cap}</b> of ${F.CAP}${f.guard ? ` · Mop ready (${f.guard})` : ''}</p>
      <div class="fl-hand">${hand}</div>
      <details class="fl-what small"><summary>What spills</summary><p>Bounced (429) 1 · Gave up 3 · Caller left unanswered 3 · Handled twice 2 · Out of order 2 · Wrong desk 1 · Failed 1 · Leaked 4 · Never handled 2 · Parked in the bin 1.</p></details>
      <div class="fl-dock"><button class="ghost" id="fl-stop">☰ Stop</button><button class="primary" id="fl-lever">${icon('spanner')}Pull the lever</button></div>`);
    b.querySelectorAll('[data-h]').forEach(el => el.onclick = () => {
      const h = +el.dataset.h, why = F.why(s, h);
      if (why) { U.float && U.float(el, why); return; }
      F.play(s, h); save(s); draw(s);
    });
    b.querySelectorAll('[data-vis]').forEach(el => el.onclick = () => { F.setVis(s, +el.dataset.vis); save(s); draw(s); });
    b.querySelectorAll('[data-batch]').forEach(el => el.onclick = () => { F.setBatch(s, +el.dataset.batch); save(s); draw(s); });
    b.querySelector('#fl-stop').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#fl-lever').onclick = () => {
      F.lever(s);
      keep().taught = s.taught;
      save(s);
      draw(s);
      const r = document.querySelector('.fl-result');
      if (r && U.burst && !r.classList.contains('spilt')) U.burst(r);
    };
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
    const r = M.pick({ match: q => !!re && re.test(text(q)), n: 1, verifiedOnly: true, mix: 0, avoid: Array.from(used) });
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
      <div class="fl-hand">${opts.map(id => `<button class="fl-card" data-take="${id}"><span class="fl-cost">${C[id].cost}</span>${icon(C[id].icon)}<b>${esc(C[id].name)}</b><span class="fl-ct">${esc(C[id].text)}</span><span class="fl-tag">${esc(C[id].who)}</span></button>`).join('')}</div>
      <div class="fl-dock"><button class="ghost" id="fl-leave">Leave it</button></div>`);
    const go = id => { F.take(s, id); save(s); draw(s); };
    b.querySelectorAll('[data-take]').forEach(el => el.onclick = () => go(el.dataset.take));
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
    const b = panel(`<p class="fl-night">Night ${s.night}: ${zero ? 'shutters down' : 'the Hunch drained'}</p>
      ${say('dutch', zero ? 'tired' : 'smile', zero ? F.SAY.zero : F.SAY.won)}
      ${budgetJar(s)}
      <p>Claims closed <b>${s.cleared}</b> · Proofs held <b>${proofs} of ${s.debriefs.length}</b> · Spilled <b>${s.spilled}</b></p>
      ${top ? `<p class="fl-since">${icon(C[top].icon)} The piece that carried you: <b>${esc(C[top].name)}</b>. ${esc(C[top].back)}</p>` : ''}
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
    .fl-door.reach { background: var(--bone, #e2dbcb); box-shadow: 0 0 0 3px var(--sun, #b8923a); font-weight: 700; }
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
    .fl-hand { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .fl-card { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 92px; padding: 6px 8px; text-align: left; border: 3px solid var(--ink, #17131f); border-radius: 10px; background: #fff; color: var(--ink, #17131f); font-size: 13px; line-height: 1.2; }
    .fl-card .fl-gi { width: 22px; height: 22px; }
    .fl-card.no { background: #ddd6c8; }
    .fl-card.up { box-shadow: inset 0 0 0 3px var(--mint, #4f7f5c); }
    .fl-cost { position: absolute; top: 4px; right: 6px; width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--ink, #17131f); background: var(--sun, #b8923a); font-weight: 800; display: flex; align-items: center; justify-content: center; }
    .fl-ct { font-size: 12px; overflow-wrap: anywhere; }
    .fl-why { font-size: 11px; font-weight: 800; color: var(--red, #9e3a34); }
    .fl-tag { font-size: 11px; font-weight: 800; color: var(--blue, #3f5f80); }
    .fl-proof, .fl-since { display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; border-left: 4px solid var(--ink, #17131f); background: var(--bone, #e2dbcb); }
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
    .fl-zone.fl-rack.none { background: transparent; }`;
  document.head.appendChild(css);
})();
