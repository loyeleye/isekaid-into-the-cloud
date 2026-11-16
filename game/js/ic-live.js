// Incident Commander's Live shift (design "Incident Commander: live request path design", Nov 16; Ladi chose "a Live
// shift in Incident Commander"). Three incidents on a live request path, each played on the machine itself:
//   1. The page arrives: Uptima's pager line and the machine (its parts, their settings). Nothing else.
//   2. Predict: what does the broken path do with the next minute's traffic? A number, committed with Guess, Think so or
//      Sure on the shared stake table. Then the minute runs and the machine shows what happened (L9: state on the parts).
//   3. Fix: tap a part for its evidence (log line or metric) and its knobs. Each knob is taught the first time you turn
//      it, with one line (once per save), never a walkthrough screen. Run the minute again; one more try if the SLO
//      isn't met.
//   4. Debrief: one verified bank question on the rule you just used ("why did that work?"), on the plain exam screen
//      with the shared stake table (SD.modes.ask). A Sure miss goes on the Wall.
//   - Stamps (js/ic-live-core.js): the SLO met, at most two knobs changed, the incident's documented setting.
//   - Saves after every step (S.save.icLive); Stop for now any time. Pay once a day under its own id (ic-live).
// Rules: js/ic-live-core.js on js/aws-sim.js. Opened from Incident Commander's start (js/mode-ic.js).
(function () {
  if (!SD.modes || !SD.icLive || !SD.icLive.core) return;
  const M = SD.modes, U = SD.ui, S = SD.state, L = SD.icLive.core, IL = SD.icLive;
  const ID = 'ic-live', TITLE = 'LIVE SHIFT';
  const esc = s => U.esc(String(s == null ? '' : s));
  const sv = () => S.save;
  const cur = () => sv().icLive || null;
  const save = s => { sv().icLive = s; S.persist(); };
  const taught = () => (sv().icLiveTaught = sv().icLiveTaught || {});
  const plural = (n, a, b) => `${n} ${n === 1 ? a : (b || a + 's')}`;
  // Uptima's lines, in her prequel voice (Ladi, Nov 16: "more naturally sounding ... her usual incompetent self"):
  // grand, vain and no help at all, while the facts on the board, the page and the debrief stay exact.
  const SAY = {
    open: 'Live shift! Kyu\'s asleep, so tonight I\'m in charge. Which means you\'re in charge. I\'ll supervise. From over here. Supportively.',
    next: 'Another page. Don\'t panic. I\'m panicking enough for both of us.',
    ask: 'Before you touch anything, guess what it does. I always guess. I\'m right every single time I\'m right.',
    right: 'You called it! I also called it. In my head. Very loudly.',
    wrong: 'Nope, that\'s not what it did. Remember what it really did. Write it on your hand. That\'s what I do.',
    met: 'GREEN! Five nines! Don\'t touch anything. Don\'t even breathe on it.',
    unmet: 'Still red. One more change. I believe in you. I believe in me more, but you\'re a close second.',
    lastRed: 'Still red, and the shift keeps going. The debrief explains it. I\'d explain, but I\'m busy looking calm.',
    debrief: 'One question on what you just did. It\'s open book. I lost the book.',
    end: 'Three pages, three fixes. I\'m putting my name on the incident report. Go to sleep.'
  };
  const NAMES = {
    apigw: 'API Gateway', orders: 'orders-fn', pool: 'Account concurrency', reports: 'reports-job', queue: 'SQS queue',
    worker: 'worker', dlq: 'Dead-letter queue', table: 'DynamoDB table'
  };
  const partName = (inc, p) => (p === 'worker' ? (inc.id === 'twice' ? 'charge-fn' : 'worker-fn') : p === 'queue' ? (inc.id === 'twice' ? 'payments-queue' : 'orders-queue') : NAMES[p]);
  // The bank question each incident's debrief draws from: the rule it used.
  const DEBRIEF = {
    launch: /reserved concurrency|concurrency limit|TooManyRequests|throttl/i,
    poison: /dead-letter|maxReceiveCount|ReportBatchItemFailures|partial batch|batch item failure/i,
    twice: /visibility timeout|idempoten|attribute_not_exists|conditional write|at-least-once/i
  };
  const say = (line, cls) => `<p class="ic-say${cls ? ' ' + cls : ''}" data-vo="${esc('uptima|' + line)}"><b>Uptima:</b> ${esc(line)}</p>`;
  // On a wide full-screen stage the machine sits on the left and the page, the question and the buttons on the right;
  // on a phone they stack in reading order: the page, the machine, then what to do.
  const cols = (a, m, b) => `<div class="icl-cols"><div class="icl-a">${a}</div><div class="icl-m">${m}</div><div class="icl-b">${b}</div></div>`;
  const panel = (html, o) => U.panel(`<div class="icl">${html}</div>`, Object.assign({ title: TITLE, onClose: stopNow }, o || {}));
  function stopNow() { const s = cur(); if (s) save(s); untune(); scene(false); if (SD.today && SD.today.render) SD.today.render(); }

  // ---- Music (Mureka, CREDITS.md): the live incident loop while a shift is open, a sting on each run's result.
  // Like the Look-Alike Cup, it saves what was playing and puts it back when the shift closes.
  const AU = () => SD.audio && SD.audio.music ? SD.audio : null;
  if (AU() && SD.audio.add) SD.audio.add({ songs: { iclive: 'm-ic-live' }, jingles: { icmet: 'j-ic-met', icred: 'j-ic-red' } });
  let before = null;
  const tune = () => { const a = AU(); if (!a) return; if (before === null) before = a.loopName && a.loopName !== 'iclive' ? a.loopName : ''; if (a.loopName !== 'iclive') a.music('iclive'); };
  const untune = () => { const a = AU(); if (!a || before === null) return; a.music(before || null); before = null; };
  const sting = ok => { const a = AU(); if (a && a.jingle) a.jingle(ok ? 'icmet' : 'icred', 'iclive'); };

  // ---- Art (PixelLab, CREDITS.md; tools/ic_live_art.py): each part is a thing in Uptima's camp, beside its name.
  const IMG = 'assets/img/ic-live/';
  const ART = { apigw: 'gate', orders: 'desk', worker: 'desk', reports: 'reports', queue: 'rack', dlq: 'bin', table: 'vault' };
  const img = (f, cls) => `<img class="${cls}" src="${IMG}${f}.webp" alt="" draggable="false">`;
  // Account concurrency as stools, one per concurrent execution: blue are reserved for orders-fn, grey are taken by
  // reports-job (it wants 8 of whatever is unreserved), and the rest are free to share.
  function stools(x, k) {
    const pool = 10, res = k.reserve || 0, rep = Math.min(8, pool - res), free = pool - res - rep;
    const row = [].concat(Array(res).fill('stool-orders'), Array(rep).fill('stool-reports'), Array(free).fill('stool'));
    return `<span class="icl-stools" aria-hidden="true">${row.map(f => img(f, 'icl-stool')).join('')}</span>`;
  }
  // What the requests did last minute, as envelopes at the part: bounced off a full desk (429), parked in the bin,
  // done twice, waiting in the rack, or through. At most five each; the words beside them carry the counts.
  function flow(x, p, sum) {
    if (!sum) return '';
    const n = v => Math.min(5, v | 0), out = [];
    if (p === 'orders' && sum.throttled) out.push(['env-429', 'bounce', n(sum.throttled)]);
    if (p === 'orders' && !sum.throttled && x.id === 'launch') out.push(['env-done', 'through', 3]);
    if (p === 'queue' && sum.backlog) out.push(['env', 'wait', n(sum.backlog)]);
    if (p === 'dlq' && sum.parked) out.push(['env-poison', 'drop', n(sum.parked)]);
    if (p === 'worker' && x.id === 'poison' && sum.fails) out.push(['env-poison', 'bounce', n(sum.fails)]);
    if (p === 'table' && sum.dupes) out.push(['env-twice', 'wait', n(sum.dupes)]);
    if (p === 'table' && sum.blocked) out.push(['env-done', 'through', n(sum.blocked)]);
    if (!out.length) return '';
    return `<span class="icl-flow" aria-hidden="true">${out.map(([f, how, c]) => Array.from({ length: c }, (_, i) =>
      `<span class="icl-env ${how}" style="animation-delay:${(i * 0.18).toFixed(2)}s">${img(f, '')}</span>`).join('')).join('')}</span>`;
  }

  IL.inProgress = () => { const s = cur(); return !!(s && s.v === 1 && s.phase !== 'done'); };
  IL.status = () => { const s = cur(); return IL.inProgress() ? `Live shift · incident ${s.i + 1} of ${L.INCIDENTS.length}` : ''; };
  IL.start = function () {
    let s = cur();
    if (!IL.inProgress()) {
      s = { v: 1, i: 0, phase: 'page', k: null, runs: 0, pred: null, last: null, open: null, tally: M.newTally(), pts: 0, stamps: [], log: [], t0: Date.now() };
      newIncident(s);
    }
    save(s); draw(s);
  };
  const inc = s => L.INCIDENTS[s.i];
  function newIncident(s) {
    const x = inc(s);
    s.k = L.startKnobs(x); s.runs = 0; s.pred = null; s.last = null; s.before = null; s.open = null; s.phase = 'page'; s.teach = null;
  }
  function draw(s) {
    if (s.phase === 'done') untune(); else tune();
    const live = scene(true);
    if (live && beatFor(s)) return;
    react(s);
    ({ page: pageScreen, play: playScreen, fix: fixScreen, result: resultScreen, debrief: debriefScreen, done: endScreen }[s.phase] || pageScreen)(s);
  }

  // ---- Uptima in the room (Ladi, Nov 16: "draw full sized characters in the setting and have the interface get pulled
  // down during certain beats ... see Uptima as a backdrop in the setting talking to you (living, breathing, blinking
  // and reacting to you)"). She stands in the watch room (her desk is empty while she's up), breathes, blinks, moves
  // her mouth while she talks, and her face follows how the shift is going. Painted with Gemini (tools/ic_live_uptima.py):
  // one body and a face patch per frame, so the frames swap in place. At the beats (a new page, your call, the
  // result, the end) the interface slides down and she says her lines; a tap moves on.
  const FACE_BOX = { left: 29.948, top: 9.448, width: 37.76, height: 18.168 };   // % of the body canvas
  const FACES = ['neutral', 'blink', 'talk', 'happy', 'happy-talk', 'stern', 'stern-talk', 'worried', 'worried-talk'];
  const UP = { mood: 'neutral', blink: false, open: false, talkUntil: 0, timers: [], watch: 0, line: '', pose: null, idle: 0 };
  // Whole-body poses (Ladi's pose sheets, repainted on her canvas): the yawn at dawn, and dozing off if you leave her waiting.
  const POSES = ['yawn', 'asleep'], DOZE_MS = 30000;
  function pose(name) {
    const u = document.querySelector('#icl-scene .icl-upt'); if (!u) return;
    UP.pose = name || null;
    u.querySelector('.icl-ub').src = name ? `${IMG}uptima-pose-${name}.webp` : `${IMG}uptima-body.webp`;
    u.classList.toggle('posed', !!name); u.classList.toggle('asleep', name === 'asleep');
  }
  // Any tap or key wakes her: the bubble pops and she's back, pretending she never slept.
  function wake() {
    UP.idle = Date.now();
    const u = document.querySelector('#icl-scene .icl-upt');
    if (UP.pose !== 'asleep' || !u) return;
    u.classList.add('pop'); UP.pose = 'waking';
    UP.timers.push(setTimeout(() => { u.classList.remove('pop'); pose(null); }, 260));
  }
  function dozeCheck() {
    const s = cur();
    if (UP.pose || !s || !['page', 'fix'].includes(s.phase) || document.body.classList.contains('icl-beat')) return;
    if (Date.now() - UP.idle > DOZE_MS) pose('asleep');
  }
  const face = () => UP.blink ? 'blink' : UP.open ? (UP.mood === 'neutral' ? 'talk' : UP.mood + '-talk') : UP.mood;
  function paintFace() { const f = document.querySelector('#icl-scene .icl-uf'); if (f) f.src = `${IMG}uptima-face-${face()}.webp`; }
  function scene(on) {
    const stage = document.getElementById('mode-stage');
    let el = document.getElementById('icl-scene');
    if (!on || !stage || !document.body.classList.contains('in-mode') || document.body.dataset.stage !== 'ic') {
      UP.timers.forEach(clearTimeout); UP.timers = []; clearInterval(UP.watch); UP.watch = 0;
      ['pointerdown', 'keydown'].forEach(e => document.removeEventListener(e, wake, true));
      if (el) el.remove();
      const vn = document.getElementById('icl-vn'); if (vn) vn.remove();
      const bb = document.getElementById('icl-bubble'); if (bb) bb.remove();
      document.body.classList.remove('icl-on', 'icl-beat');
      return false;
    }
    if (!el) {
      el = document.createElement('div'); el.id = 'icl-scene';
      el.innerHTML = `<picture class="icl-room"><source media="(orientation: portrait)" srcset="${IMG}room-tall.webp"><img src="${IMG}room-wide.webp" alt="" draggable="false"></picture>
        <div class="icl-upt"><img class="icl-ub" src="${IMG}uptima-body.webp" alt="" draggable="false">
          <img class="icl-uf" src="${IMG}uptima-face-neutral.webp" alt="" draggable="false" style="left:${FACE_BOX.left}%;top:${FACE_BOX.top}%;width:${FACE_BOX.width}%;height:${FACE_BOX.height}%">
        <span class="icl-snot" aria-hidden="true"></span></div>`;
      stage.appendChild(el);
      // Her bubble floats above the work (the panel's wash would dim it), so it lives on the body like the talk box.
      const bub = document.createElement('div'); bub.id = 'icl-bubble'; bub.className = 'icl-bubble'; bub.hidden = true; document.body.appendChild(bub);
      FACES.forEach(f => { const i = new Image(); i.src = `${IMG}uptima-face-${f}.webp`; });
      POSES.forEach(f => { const i = new Image(); i.src = `${IMG}uptima-pose-${f}.webp`; });
      blinkSoon();
      UP.idle = Date.now(); UP.pose = null;
      ['pointerdown', 'keydown'].forEach(e => document.addEventListener(e, wake, true));
      // Home, or anything else that closes the panel, takes her away with it.
      UP.watch = setInterval(() => { const pn = document.getElementById('panel'); if (!document.body.classList.contains('in-mode') || document.body.dataset.stage !== 'ic' || (pn && pn.hidden)) scene(false); else dozeCheck(); }, 400);
    }
    document.body.classList.add('icl-on');
    return true;
  }
  function blinkSoon() {
    UP.timers.push(setTimeout(() => {
      UP.blink = true; paintFace();
      UP.timers.push(setTimeout(() => { UP.blink = false; paintFace(); blinkSoon(); }, 130));
    }, 1800 + Math.random() * 3600));
  }
  // Her mouth moves for about as long as the line takes to say.
  function talk(line) {
    UP.talkUntil = Date.now() + Math.min(4200, 400 + line.length * 45);
    const flap = () => {
      if (!document.getElementById('icl-scene')) return;
      if (Date.now() > UP.talkUntil) { UP.open = false; paintFace(); return; }
      UP.open = !UP.open; paintFace();
      UP.timers.push(setTimeout(flap, UP.open ? 120 : 90 + Math.random() * 80));
    };
    flap();
  }
  function speak(line, mood) {
    if (mood) UP.mood = mood;
    paintFace();
    const bub = document.getElementById('icl-bubble');
    if (bub && line && line !== UP.line) { bub.hidden = false; bub.textContent = line; talk(line); }
    else if (bub && !line) bub.hidden = true;
    UP.line = line || '';
  }
  // How she looks while you work: what she last said, or the knob you just touched.
  function react(s) {
    const x = inc(s), p = s.predOut, sum = s.last;
    if (s.phase === 'fix' && s.teach) return speak(s.teach, 'neutral');
    if (s.phase === 'page') return speak(s.i === 0 ? SAY.open : SAY.next, x.sev === 1 ? 'stern' : 'neutral');
    if (s.phase === 'play') return speak('', s.playing === 'last' ? 'neutral' : UP.mood);
    if (s.phase === 'fix') return speak(!s.runs && p ? (p.ok ? SAY.right : SAY.wrong) : SAY.unmet, !s.runs && p ? (p.ok ? 'happy' : 'stern') : 'worried');
    if (s.phase === 'result') return speak(sum.slo ? SAY.met : SAY.unmet, sum.slo ? 'happy' : 'worried');
    if (s.phase === 'debrief') return speak(SAY.debrief, 'neutral');
    if (s.phase === 'done') { pose('yawn'); return speak(SAY.end, 'happy'); }
  }
  // The beats: the interface slides away and she talks. Each beat plays once.
  function beatFor(s) {
    const x = inc(s), p = s.predOut, sum = s.last;
    let key = null, lines = null, mood = 'neutral';
    if (s.phase === 'page') { key = 'p' + s.i; lines = [s.i === 0 ? SAY.open : SAY.next, x.page, SAY.ask]; mood = x.sev === 1 ? 'stern' : 'neutral'; }
    else if (s.phase === 'fix' && !s.runs && p) { key = 'v' + s.i; lines = [p.ok ? SAY.right : SAY.wrong, `You said ${p.v}. It was ${p.truth}.`]; mood = p.ok ? 'happy' : 'stern'; }
    else if (s.phase === 'result' && sum) { key = 'r' + s.i + ':' + s.runs; lines = [sum.slo ? SAY.met : s.runs < 2 ? SAY.unmet : SAY.lastRed, sum.sloLine]; mood = sum.slo ? 'happy' : 'worried'; }
    else if (s.phase === 'done') { key = 'end'; lines = [SAY.end]; mood = 'happy'; }
    pose(s.phase === 'done' ? 'yawn' : null);
    if (!key || s.beat === key) return false;
    s.beat = key; save(s);
    if (window.__iclNoBeats) return false;
    beat(lines, mood, () => { if (cur() === s) draw(s); });
    return true;
  }
  function beat(lines, mood, then) {
    document.body.classList.add('icl-beat');
    let vn = document.getElementById('icl-vn');
    if (!vn) { vn = document.createElement('button'); vn.id = 'icl-vn'; vn.type = 'button'; document.body.appendChild(vn); }
    let i = 0;
    const show = () => {
      const line = lines[i];
      vn.innerHTML = `<b class="icl-vn-name">Uptima</b><span class="icl-vn-line" data-vo="${esc('uptima|' + line)}" aria-live="polite">${esc(line)}</span><span class="icl-vn-more" aria-hidden="true">▸</span>`;
      vn.setAttribute('aria-label', `Uptima: ${line}. Tap to continue.`);
      UP.line = ''; speak('', mood); talk(line);
    };
    vn.onclick = () => {
      if (++i < lines.length) return show();
      vn.remove(); document.body.classList.remove('icl-beat');
      then();
    };
    show(); vn.focus({ preventScroll: true });
  }

  // ---- The machine: the incident's parts in request order, each with its settings and what it did last minute ----
  function partState(x, p, s, sum) {
    const k = s.k, out = [];
    if (p === 'orders' && x.knobs.reserve) out.push(k.reserve ? `Reserved: ${k.reserve}` : 'No reservation');
    if (p === 'apigw' && x.knobs.queue && k.queue) out.push('SQS queue in front');
    if (p === 'apigw' && x.knobs.backoff) out.push(k.backoff ? 'Retries: backoff + jitter' : 'Retries: immediate');
    if (p === 'pool') out.push('10 concurrent executions');
    if (p === 'reports') out.push('Wants 8');
    if (p === 'queue' && x.knobs.vis) out.push(`Visibility timeout ${k.vis} s`);
    if (p === 'worker' && x.knobs.batch) out.push(`Batch ${k.batch}`);
    if (p === 'worker' && x.knobs.partial) out.push(k.partial ? 'Partial batch responses on' : 'Partial batch responses off');
    if (p === 'worker' && x.fnTimeout) out.push(`Timeout ${x.fnTimeout} s`);
    if (p === 'dlq') out.push(k.dlq ? `maxReceiveCount ${k.dlq}` : 'Not set');
    if (p === 'table' && x.knobs.idem) out.push(k.idem ? 'Conditional write on' : 'Plain PutItem');
    const did = [];
    if (sum) {
      if (p === 'orders' && sum.throttled) did.push(`⛔ 429 × ${sum.throttled}`);
      if (p === 'apigw' && sum.gaveUp) did.push(`✗ ${plural(sum.gaveUp, 'caller')} gave up`);
      if (p === 'apigw' && sum.unanswered) did.push(`✉ ${plural(sum.unanswered, 'caller')} got a message ID, not an order`);
      if (p === 'reports' && x.knobs.reserve) did.push(k.reserve > 6 ? '⚠ starved' : 'Running');
      if (p === 'queue' && sum.backlog) did.push(`📥 ${sum.backlog} still waiting`);
      if (p === 'worker' && sum.fails) did.push(`⚠ ${plural(sum.fails, 'failure')}`);
      if ((p === 'worker' && x.id === 'poison' || p === 'table') && sum.dupes) did.push(`×2 ${plural(sum.dupes, 'order')} done twice`);
      if (p === 'table' && sum.blocked) did.push(`🛡 ${sum.blocked} blocked`);
      if (p === 'dlq' && sum.parked) did.push(`🪦 ${sum.parked} parked`);
      if (p === 'orders' && !sum.throttled && x.id === 'launch') did.push('✓ No throttles');
    }
    return { out, did };
  }
  function machine(s, x, sum, open) {
    const parts = x.parts.map((p, i) => {
      const st = partState(x, p, s, sum), knobs = Object.keys(x.knobs).filter(id => x.knobs[id].part === p);
      const tappable = s.phase === 'fix';
      const label = `${partName(x, p)}: ${st.out.join(', ')}${st.did.length ? '. Last minute: ' + st.did.join(', ') : ''}`;
      const arrow = i < x.parts.length - 1 && !(p === 'pool' || p === 'reports') ? '<span class="icl-arrow" aria-hidden="true">↓</span>' : '';
      return `<div class="icl-part${open === p ? ' open' : ''}${st.did.some(d => /⛔|⚠|×2|✗|✉|📥/.test(d)) ? ' hot' : ''}">
        <button class="icl-ph" data-part="${p}" ${tappable ? '' : 'disabled'} aria-expanded="${open === p}" aria-label="${esc(label)}">
          ${ART[p] ? img(ART[p], 'icl-art') : ''}<b>${esc(partName(x, p))}</b>${p === 'pool' ? stools(x, s.k) : ''}${st.out.map(o => `<span class="icl-set">${esc(o)}</span>`).join('')}
          ${st.did.map(d => `<span class="icl-did">${esc(d)}</span>`).join('')}${flow(x, p, sum)}
          ${tappable ? `<span class="icl-tap small">${open === p ? 'Close' : knobs.length ? 'Evidence and settings' : 'Evidence'}</span>` : ''}</button>
        ${open === p ? partOpen(s, x, p, knobs) : ''}</div>${arrow}`;
    }).join('');
    const cols = x.parts.length + x.parts.filter((p, i) => i < x.parts.length - 1 && !(p === 'pool' || p === 'reports')).length;
    return `<div class="icl-machine" role="group" aria-label="The request path" style="--cols:${cols}">${parts}</div>`;
  }
  function partOpen(s, x, p, knobs) {
    const ev = x.evidence[p];
    return `<div class="icl-open">${ev ? `<pre class="icl-ev">${esc(ev)}</pre>` : ''}
      ${knobs.map(id => {
        const kn = x.knobs[id], changed = s.k[id] !== kn.start;
        return `<div class="icl-knob${changed ? ' changed' : ''}" role="group" aria-label="${esc(kn.name)}"><span class="small"><b>${esc(kn.name)}</b>${kn.unit ? ` (${esc(kn.unit)})` : ''}${changed ? ' <span class="icl-chg">✎ changed</span>' : ''}</span>
          ${control(id, kn, s.k[id])}</div>`;
      }).join('')}</div>`;
  }
  // The knobs as things: stools you tap to reserve, a lever for on and off, a dial for a timeout or a count, a tray
  // of envelopes for a batch. Every one is a row of buttons underneath (data-knob, data-v), named in words.
  function control(id, kn, v) {
    const btn = (val, inner, cls, label) => `<button class="${cls || ''}${v === val ? ' on' : ''}" data-knob="${id}" data-v="${val}" aria-pressed="${v === val}" aria-label="${esc(label || String(val))}">${inner}</button>`;
    const vals = kn.values.map(o => o.v);
    if (id === 'reserve') {
      const snap = i => vals.filter(u => u >= i).sort((a, b) => a - b)[0];
      const max = Math.max.apply(null, vals);
      return `<div class="icl-sp"><span class="icl-stools">${Array.from({ length: max }, (_, i) => btn(snap(i + 1), img(i < v ? 'stool-orders' : 'stool', 'icl-stool'), 'icl-sb' + (i < v ? ' res' : ''), `Reserve ${snap(i + 1)}`)).join('')}</span>
        ${btn(0, 'None', 'icl-none', 'No reservation')}<span class="small muted">Tap a stool to reserve up to it for orders-fn.</span></div>`;
    }
    if (vals.length === 2 && vals[0] === 0 && vals[1] === 1) {
      return `<div class="icl-switch${v ? ' up' : ''}">${kn.values.map(o => btn(o.v, esc(o.label), 'icl-sw', o.label)).join('')}<i aria-hidden="true"></i></div>`;
    }
    if (id === 'batch') {
      return `<div class="icl-tray">${kn.values.map(o => btn(o.v, Array.from({ length: o.v }, () => img('env', 'icl-te')).join(''), 'icl-tb', `${o.v} per batch`)).join('')}</div>`;
    }
    // A dial: the pointer turns to the setting; the settings sit around it.
    const n = kn.values.length, idx = Math.max(0, vals.indexOf(v)), ang = i => -120 + (240 * i) / Math.max(1, n - 1);
    return `<div class="icl-dial"><div class="icl-face" aria-hidden="true"><i style="transform:rotate(${ang(idx)}deg)"></i></div>
      <div class="icl-ticks">${kn.values.map(o => btn(o.v, esc(o.label), 'icl-tk', o.label)).join('')}</div></div>`;
  }
  // The minute, turn by turn (30 s each), in words and icons.
  function strip(sum) {
    const W = [['done', '✓'], ['throttled', '⛔'], ['gaveUp', '✗'], ['dupe', '×2'], ['dupeBlocked', '🛡'], ['fail', '⚠'], ['dlq', '🪦']];
    const cells = sum.turns.map((t, i) => {
      const bits = W.filter(([k]) => t[k]).map(([k, g]) => `${g}${t[k]}`);
      if (!bits.length) return '';
      return `<li><span class="icl-tt">${(i + 1) * L.TURN_SECS} s</span> ${bits.join(' ')}</li>`;
    }).filter(Boolean).join('');
    return `<details class="icl-strip"><summary class="small">The minute, 30 s at a time</summary><ul>${cells}</ul>
      <p class="muted small">✓ handled · ⛔ throttled (429) · ✗ caller gave up · ×2 done again · 🛡 second write blocked · ⚠ failed · 🪦 moved to the dead-letter queue</p></details>`;
  }
  function hud(s) {
    return `<p class="icl-hud small"><b>Incident ${s.i + 1} of ${L.INCIDENTS.length}</b> · ${esc(inc(s).name)} · SEV-${inc(s).sev} · Points ${M.sgn(s.pts)}</p>`;
  }

  // ---- 1 and 2: the page, then the prediction ----
  function pageScreen(s) {
    const x = inc(s), pc = L.predictChoices(x);
    const first = s.i === 0;
    const b = panel(cols(`${hud(s)}${say(first ? SAY.open : 'Next page.')}
      <p class="icl-page">📟 <b>${esc(x.page)}</b></p>`,
      machine(s, x, null, null),
      `<div class="icl-pred"><p><b>${esc(x.predict.q)}</b></p>
        <div class="icl-vals" role="group" aria-label="Your prediction">${pc.choices.map(v => `<button class="${s.pred && s.pred.v === v ? 'on' : ''}" data-pred="${v}" aria-pressed="${!!(s.pred && s.pred.v === v)}">${v}</button>`).join('')}</div>
        ${s.pred ? `<p class="small">How sure are you?</p><div class="row icl-conf">${M.CONF.map((c, i) => `<button class="ghost" data-conf="${i}">${c} <span class="small">✓${M.sgn(M.STAKES[i][0])} ✗${M.sgn(M.STAKES[i][1])}</span></button>`).join('')}</div>` : '<p class="muted small">Pick a number first. Nothing is shown until you commit.</p>'}</div>
      <div class="row"><button class="ghost" id="icl-stop">Stop for now</button></div>`));
    b.querySelectorAll('[data-pred]').forEach(el => el.onclick = () => { s.pred = { v: +el.dataset.pred }; save(s); pageScreen(s); });
    b.querySelectorAll('[data-conf]').forEach(el => el.onclick = () => {
      const conf = +el.dataset.conf, ok = s.pred.v === pc.truth;
      const pts = M.stake(ok, conf);
      M.note(s.tally, ok, conf);
      s.pts += pts;
      s.before = L.run(x, s.k);
      s.predOut = { ok, conf, pts, truth: pc.truth, v: s.pred.v };
      s.log.push({ inc: x.id, kind: 'predict', ok, conf, pts });
      s.phase = 'play'; s.playing = 'before';
      save(s); draw(s);
    });
    b.querySelector('#icl-stop').onclick = () => { U.closePanel(); stopNow(); };
  }

  // ---- The minute, played: requests walk the path as envelopes, 30 s a turn, and the SLO lamp lights at the end ----
  // Each event in the turn is one envelope with its own motion: through to the end (done), bounced back (429, a failed
  // batch, a second charge blocked), dropped in the bin (parked in the DLQ), doubled (done twice) or lost at the gate.
  const PLAY_MS = 900, PER_TYPE = 6;
  function lane(x) { return x.parts.filter(p => p !== 'pool' && p !== 'reports'); }
  function motions(x) {
    const L0 = lane(x), first = L0[0], last = L0[L0.length - 1], fn = x.id === 'launch' ? 'orders' : 'worker';
    return {
      done: { from: first, to: last, how: 'go', img: 'env-done' },
      throttled: { from: first, to: fn, how: 'back', img: 'env-429' },
      gaveUp: { from: first, to: first, how: 'lost', img: 'env-429' },
      unanswered: { from: first, to: fn, how: 'go', img: 'env' },
      fail: { from: first, to: fn, how: 'back', img: 'env-poison' },
      dlq: { from: fn, to: 'dlq', how: 'drop', img: 'env-poison' },
      dupe: { from: first, to: last, how: 'go', img: 'env-twice' },
      dupeBlocked: { from: first, to: last, how: 'back', img: 'env-twice' }
    };
  }
  const GLYPH = { done: '✓', throttled: '⛔', gaveUp: '✗', unanswered: '✉', fail: '⚠', dlq: '🪦', dupe: '×2', dupeBlocked: '🛡' };
  function playScreen(s) {
    const x = inc(s), sum = s.playing === 'before' ? s.before : s.last, L0 = lane(x);
    const pos = p => Math.max(0, L0.indexOf(p)) / Math.max(1, L0.length - 1);
    const turns = sum.turns.map((t, i) => ({ t, i })).filter(o => Object.keys(o.t).some(k => GLYPH[k]));
    const b = panel(`${hud(s)}
      <div class="icl-play" role="img" aria-label="The minute playing out on the request path">
        <div class="icl-lane">${L0.map(p => `<div class="icl-stop" style="left:${(pos(p) * 100).toFixed(1)}%">${ART[p] ? img(ART[p], 'icl-big') : ''}<span>${esc(partName(x, p))}</span></div>`).join('')}
          <div class="icl-envs" aria-hidden="true"></div></div>
        ${x.parts.includes('pool') ? `<div class="icl-pstools">${stools(x, s.playing === 'before' ? L.startKnobs(x) : s.k)}</div>` : ''}
        <div class="icl-clock"><b id="icl-t">0:00</b><span id="icl-tally" class="icl-tally"></span></div>
        <div class="icl-lamp" id="icl-lamp" aria-live="polite"></div>
      </div>
      <div class="row"><button class="ghost" id="icl-skip">Skip</button></div>`);
    const box = b.querySelector('.icl-envs'), clock = b.querySelector('#icl-t'), tally = b.querySelector('#icl-tally'), lamp = b.querySelector('#icl-lamp');
    const mv = motions(x), seen = {};
    let k = 0, timer = null, over = false;
    const finish = () => {
      if (over) return; over = true; clearTimeout(timer);
      if (s.playing === 'last') {
        lamp.className = 'icl-lamp ' + (sum.slo ? 'green' : 'red');
        lamp.innerHTML = `<i></i><b>${sum.slo ? 'SLO met' : 'SLO not met'}</b>`;
        sting(sum.slo);
      }
      const next = () => { if (cur() !== s || s.phase !== 'play') return; s.phase = s.playing === 'before' ? 'fix' : 'result'; s.playing = null; save(s); draw(s); };
      timer = setTimeout(next, still() ? 0 : 1800);
      b.querySelector('#icl-skip').onclick = () => { clearTimeout(timer); next(); };
    };
    const step = () => {
      if (cur() !== s || s.phase !== 'play') return;
      if (k >= turns.length) return finish();
      const { t, i } = turns[k++];
      clock.textContent = `${Math.floor((i + 1) * L.TURN_SECS / 60)}:${String((i + 1) * L.TURN_SECS % 60).padStart(2, '0')}`;
      box.innerHTML = Object.keys(t).filter(ty => mv[ty]).map(ty => {
        const m = mv[ty], n = Math.min(PER_TYPE, t[ty]);
        seen[ty] = (seen[ty] | 0) + t[ty];
        return Array.from({ length: n }, (_, j) => `<span class="icl-fly ${m.how}" style="--a:${(pos(m.from) * 100).toFixed(1)}%;--b:${(pos(m.to) * 100).toFixed(1)}%;--d:${(j * 70)}ms;--y:${(j % 3) * 9}px">${img(m.img, '')}</span>`).join('');
      }).join('');
      tally.innerHTML = Object.keys(GLYPH).filter(ty => seen[ty]).map(ty => `<span>${GLYPH[ty]} ${seen[ty]}</span>`).join('');
      timer = setTimeout(step, PLAY_MS);
    };
    b.querySelector('#icl-skip').onclick = () => { clearTimeout(timer); k = turns.length; box.innerHTML = ''; finish(); };
    if (still()) finish(); else step();
  }
  const still = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---- 3: fix it on the machine ----
  function fixScreen(s) {
    const x = inc(s), sum = s.last || s.before, p = s.predOut;
    const changed = L.changes(x, s.k);
    const top = !s.runs && p
      ? `${say(p.ok ? SAY.right : SAY.wrong)}<p class="icl-verdict"><span class="icl-vs ${p.ok ? 'ok' : 'no'}">${p.ok ? '✓' : '✗'} You said <b>${p.v}</b> · it was <b>${p.truth}</b></span> <span class="icl-pts">${esc(M.CONF[p.conf])} ${M.sgn(p.pts)}</span></p>`
      : say(SAY.unmet);
    const teach = s.teach ? `<p class="icl-teach small">💡 ${esc(s.teach)}</p>` : '';
    const b = panel(cols(`${hud(s)}${top}
      <p class="icl-page">📟 ${esc(x.page)}</p>`,
      `${machine(s, x, sum, s.open)}${teach}`,
      `${strip(sum)}
      <p class="icl-changes"><span class="icl-cc${changed.length > L.MAX_CHANGES ? ' over' : ''}" aria-label="${changed.length} of ${L.MAX_CHANGES} changes">${Array.from({ length: Math.max(L.MAX_CHANGES, changed.length) }, (_, i) => `<i class="${i < changed.length ? 'on' : ''}">✎</i>`).join('')}</span>
        <span class="small">${changed.length ? (changed.length > L.MAX_CHANGES ? '<b>Over two: no smallest-change stamp</b>' : `${changed.length} of ${L.MAX_CHANGES} changes`) : 'Tap a part to open it'}</span></p>
      <div class="row"><button class="primary" id="icl-run"${changed.length ? '' : ' disabled'}>▶ Run the next minute</button><button class="ghost" id="icl-stop">Stop for now</button></div>`));
    b.querySelectorAll('[data-part]').forEach(el => el.onclick = () => { s.open = s.open === el.dataset.part ? null : el.dataset.part; s.teach = null; save(s); fixScreen(s); });
    b.querySelectorAll('[data-knob]').forEach(el => el.onclick = () => {
      const id = el.dataset.knob, v = +el.dataset.v;
      s.k[id] = v;
      const key = x.id + ':' + id;
      s.teach = !taught()[key] ? x.knobs[id].teach : null;
      taught()[key] = 1;
      save(s); fixScreen(s);
    });
    b.querySelector('#icl-run').onclick = () => {
      s.last = L.run(x, s.k); s.runs++; s.open = null; s.teach = null; s.phase = 'play'; s.playing = 'last';
      save(s); draw(s);
    };
    b.querySelector('#icl-stop').onclick = () => { U.closePanel(); stopNow(); };
  }

  // ---- The result of a run ----
  function resultScreen(s) {
    const x = inc(s), sum = s.last, st = sum.stamps, more = !sum.slo && s.runs < 2;
    const stamp = (on, label) => `<li class="${on ? 'on' : ''}">${on ? '✓' : '○'} ${esc(label)}</li>`;
    const b = panel(cols(`${hud(s)}${say(sum.slo ? SAY.met : more ? SAY.unmet : SAY.lastRed)}
      <p class="icl-slo"><span class="icl-lamp ${sum.slo ? 'green' : 'red'}"><i></i><b>${sum.slo ? '✓ SLO met' : '✗ SLO not met'}</b></span><span class="small">${esc(sum.sloLine)}</span></p>`,
      machine(s, x, sum, null),
      `${strip(sum)}
      <ul class="icl-stamps">${stamp(st.slo, 'SLO met')}${stamp(st.small, 'Two knobs or fewer')}${stamp(st.rule, 'The documented setting')}</ul>
      <p class="small icl-rule">📘 ${esc(sum.ruleLine)}</p>
      <div class="row">${more ? '<button class="primary" id="icl-again">One more change</button><button class="ghost" id="icl-on">Leave it red, go to the debrief</button>' : '<button class="primary" id="icl-on">Debrief</button>'}</div>`));
    const again = b.querySelector('#icl-again');
    if (again) again.onclick = () => { s.phase = 'fix'; save(s); draw(s); };
    b.querySelector('#icl-on').onclick = () => {
      s.stamps[s.i] = st;
      s.log.push({ inc: x.id, kind: 'fix', slo: sum.slo, changed: sum.changed, stamps: st });
      s.phase = 'debrief'; save(s); draw(s);
    };
  }

  // ---- 4: the debrief question ----
  async function debriefScreen(s) {
    const x = inc(s), rx = DEBRIEF[x.id];
    const text = q => [q.q].concat(q.opts || [], (q.items || []).map(it => it.t || it.text || '')).join(' ');
    const r = M.pick({ match: q => rx.test(text(q)), n: 1, mix: 0, avoid: s.log.filter(l => l.q).map(l => l.q) });
    const it = r.items[0];
    const q = it && (SD.today && SD.today.resolveItem ? SD.today.resolveItem(it) : SD.exam.find(it.q));
    if (!q) return nextIncident(s);
    const res = await M.ask(q, { tally: s.tally, onStop: () => {} });
    if (res.closed || res.skipped || (res.stopped && !res.committed)) { stopNow(); return; }
    s.pts += res.pts | 0;
    s.log.push({ inc: x.id, kind: 'debrief', q: q.id, ok: !!res.ok, conf: res.conf, pts: res.pts | 0 });
    nextIncident(s, !res.stopped);
  }
  function nextIncident(s, show) {
    s.i++;
    if (s.i >= L.INCIDENTS.length) { s.phase = 'done'; s.paid = M.pay(ID); }
    else newIncident(s);
    save(s);
    if (show !== false) draw(s); else stopNow();
  }

  // ---- The end of the shift: ends on the stamps, then calibration ----
  function endScreen(s) {
    const total = s.stamps.reduce((a, st) => a + (st ? (st.slo ? 1 : 0) + (st.small ? 1 : 0) + (st.rule ? 1 : 0) : 0), 0);
    const rows = L.INCIDENTS.map((x, i) => { const st = s.stamps[i] || {}; return `<li><b>${esc(x.name)}</b>: ${st.slo ? '✓ SLO' : '✗ SLO'} · ${st.small ? '✓ small change' : '○ small change'} · ${st.rule ? '✓ documented setting' : '○ documented setting'}</li>`; }).join('');
    const b = panel(`${say(SAY.end)}
      <p class="icl-total"><b>${total} of ${L.INCIDENTS.length * 3} stamps</b> · Points ${M.sgn(s.pts)}${s.paid ? ` · ${esc(s.paid)}` : ''}</p>
      <ul class="icl-stamps">${rows}</ul>
      ${M.calibHtml(s.tally, 'How sure you were this shift')}
      ${M.pipHtml()}
      <div class="row"><button class="primary" id="icl-done">Done</button><button class="ghost" id="icl-new">New live shift</button></div>`);
    M.pipWire(b, 'Incident Commander live shift');
    b.querySelector('#icl-done').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#icl-new').onclick = () => { sv().icLive = null; IL.start(); };
  }

  const css = document.createElement('style');
  css.textContent = `
    .icl-hud { margin: 0 0 6px; }
    /* ---- Uptima in the room ---- */
    #icl-scene { position: absolute; inset: 0; z-index: 1; overflow: hidden; }
    #icl-scene .icl-room img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
    #icl-scene::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(rgba(12, 8, 4, .35), transparent 30%, transparent 70%, rgba(12, 8, 4, .45)); }
    .icl-upt { position: absolute; z-index: 1; bottom: 0; right: 4vw; height: min(calc(100vh - 70px), 1000px); aspect-ratio: 576 / 1032; transform-origin: 50% 100%;
      animation: icl-breathe 4.2s ease-in-out infinite; transition: right .5s ease, height .5s ease, opacity .4s; filter: drop-shadow(0 10px 18px rgba(0, 0, 0, .55)); }
    .icl-upt img { position: absolute; display: block; user-select: none; }
    .icl-ub { inset: 0; width: 100%; height: 100%; }
    .icl-upt.posed .icl-uf { display: none; }
    /* Asleep: a snot bubble at her nose (44.9%, 20.2% of her canvas) swells and shrinks with her breath, and pops when you wake her. */
    .icl-snot { display: none; position: absolute; left: 40.5%; top: 18%; width: 6%; aspect-ratio: 1; border-radius: 50%; transform-origin: 80% 30%; pointer-events: none;
      background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, .95) 0 12%, rgba(200, 235, 255, .45) 13% 55%, rgba(160, 210, 240, .6) 70%, rgba(120, 180, 220, .75) 100%);
      box-shadow: inset 0 0 0 1px rgba(90, 140, 180, .6); animation: icl-snot 3.6s ease-in-out infinite; }
    .icl-upt.asleep .icl-snot { display: block; }
    .icl-upt.pop .icl-snot { display: block; animation: icl-pop .25s ease-out forwards; }
    @keyframes icl-snot { 0%, 100% { transform: scale(.35); } 55% { transform: scale(1.15); } }
    @keyframes icl-pop { 0% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(2.2); opacity: 0; } }
    @keyframes icl-breathe { 0%, 100% { transform: scale(1, 1); } 50% { transform: scale(1.004, 1.012) translateY(-1px); } }
    .icl-bubble { position: fixed; z-index: 21; pointer-events: none; right: calc(4vw + min(calc(100vh - 70px), 1000px) * .5); top: calc(70px + 6vh); max-width: min(340px, 30vw); padding: 12px 16px; border-radius: 14px;
      background: #fbf5e3; color: #2a2018; font-size: 16px; line-height: 1.4; box-shadow: 0 6px 16px rgba(0, 0, 0, .55); }
    .icl-bubble::after { content: ''; position: absolute; right: -14px; top: 22px; border: 8px solid transparent; border-left: 14px solid #fbf5e3; border-right: 0; }
    .icl-bubble[hidden] { display: none; }
    body:has(#panel .win.quiz) .icl-bubble, body:has(#panel[hidden]) .icl-bubble { display: none; }
    /* Wide: the work on the left, Uptima standing on the right, the room lit around her. */
    @media (min-width: 900px) {
      body.icl-on[data-stage="ic"] #panel .win { background: linear-gradient(90deg, rgba(14, 9, 5, .88), rgba(14, 9, 5, .8) 50%, rgba(14, 9, 5, .1) 66%, transparent 75%) !important; }
      body.icl-on[data-stage="ic"] #panel .win-b { padding-left: max(16px, 3vw) !important; padding-right: calc(4vw + min(calc(100vh - 70px), 1000px) * .56 + 24px) !important; }
      body.icl-on[data-stage="ic"] #panel .win.quiz .win-b { padding-left: max(16px, calc((100% - 760px) / 2)) !important; padding-right: max(16px, calc((100% - 760px) / 2)) !important; }
      body.icl-on.in-mode .icl-cols { display: block; }
      body.icl-on #panel .ic-say { display: none; }
      /* Her bubble sits left of her head, in a top band the page text keeps clear of, so it never covers the work. */
      .icl-bubble { right: calc(4vw + min(calc(100vh - 70px), 1000px) * .4); top: calc(70px + 12px); max-width: min(360px, 28vw); }
      body.icl-on #panel .win:not(.quiz) .icl-a { margin-right: max(0px, calc(min(360px, 28vw) - min(calc(100vh - 70px), 1000px) * .16 + 8px)); min-height: 150px; }
    }
    /* The wall board (wide screens): the parts hang on the wall map as things in the camp, joined by a rope, with
       brass name plaques and red tags for trouble. Tapping one pins a paper tag under the row with its log and control. */
    @media (min-width: 1180px) {
      body.icl-on .icl-machine { display: grid; grid-template-columns: repeat(var(--cols), auto); grid-template-rows: auto auto; justify-content: start; align-items: start; gap: 6px 4px; margin: 10px 0 14px; }
      body.icl-on .icl-part { display: contents; }
      body.icl-on .icl-ph { grid-row: 1; flex-direction: column; flex-wrap: nowrap; align-items: center; justify-content: flex-start; gap: 4px; width: auto; max-width: 180px; min-width: 112px; padding: 6px 4px; text-align: center; border-radius: 10px; color: #f3e9d2; text-shadow: 0 2px 3px #000; cursor: pointer; }
      body.icl-on .icl-ph:not(:disabled):hover, body.icl-on .icl-part.open .icl-ph { background: rgba(233, 197, 109, .14); box-shadow: inset 0 0 0 2px rgba(233, 197, 109, .55); }
      body.icl-on .icl-ph .icl-art { width: 92px; height: 92px; filter: drop-shadow(0 5px 5px rgba(0, 0, 0, .7)); }
      body.icl-on .icl-part.hot .icl-art { filter: drop-shadow(0 0 12px rgba(255, 70, 50, .95)) drop-shadow(0 4px 4px #000); }
      body.icl-on .icl-ph > b { display: inline-block; padding: 2px 10px; border-radius: 5px; background: linear-gradient(#dcb65e, #a67c2c); color: #2a1c08; text-shadow: none; border: 2px solid #140b05; font-size: 15px; }
      body.icl-on .icl-ph .icl-set { border: 0; background: rgba(20, 12, 6, .78); color: #efe6d2; text-shadow: none; }
      body.icl-on .icl-ph .icl-did { padding: 1px 8px; border-radius: 10px; background: #a8322a; color: #fff; text-shadow: none; font-size: 12px; }
      body.icl-on .icl-part:not(.hot) .icl-did { background: #2f7a3c; }
      body.icl-on .icl-ph .icl-stools { justify-content: center; width: 200px; padding: 4px; border-radius: 8px; background: rgba(20, 12, 6, .55); }
      body.icl-on .icl-ph .icl-stool { width: 18px; height: 18px; }
      body.icl-on .icl-ph .icl-flow { justify-content: center; }
      body.icl-on .icl-ph .icl-tap { margin: 0; font-size: 12px; color: #e9c56d; }
      body.icl-on .icl-arrow { grid-row: 1; align-self: start; width: 36px; margin-top: 44px; height: 0; overflow: hidden; color: transparent; border-top: 4px dashed #e9c56d; opacity: .8; }
      body.icl-on .icl-open { grid-row: 2; grid-column: 1 / -1; position: relative; max-width: 560px; padding: 12px 14px; color: #2a2018; text-shadow: none; background: #f8f0da; border-radius: 4px; box-shadow: 0 8px 20px rgba(0, 0, 0, .6); }
      body.icl-on .icl-open .muted { color: #6b5a40; }
      body.icl-on .icl-open .icl-sb { background: rgba(60, 40, 20, .15); }
      body.icl-on .icl-open .icl-none, body.icl-on .icl-open .icl-tk, body.icl-on .icl-open .icl-tb { background: #fff8e6; color: #2a2018; border-color: #6b4f22; }
      /* The lever stays in reach while a tag is open. */
      body.icl-on .icl-b > .row { position: sticky; bottom: 8px; z-index: 3; }
      body.icl-on .icl-open .icl-sb.res { background: rgba(80, 120, 200, .3); }
      body.icl-on .icl-open .icl-chg { color: #8a5608; }
      body.icl-on .icl-open .icl-knob.changed { border-left-color: #a67c2c; }
      /* The page and the HUD as a brass plaque and a pager note; the guess in her talk box. */
      body.icl-on .icl-hud { display: inline-block; padding: 6px 12px; border-radius: 6px; background: rgba(20, 12, 6, .85); border: 2px solid #e9c56d; }
      body.icl-on .icl-pred { position: relative; margin: 18px 0 8px; padding: 18px 18px 14px; color: #2a2018; text-shadow: none; border: 2px solid #140b05; border-radius: 12px;
        background: linear-gradient(#fbf5e3, #f0e4c6); box-shadow: 0 0 0 2px rgba(233, 197, 109, .6), 0 10px 24px rgba(0, 0, 0, .55); }
      body.icl-on .icl-pred::before { content: 'Uptima'; position: absolute; top: -15px; left: 16px; padding: 2px 12px; border-radius: 6px; background: linear-gradient(#dcb65e, #a67c2c); color: #2a1c08; font-size: 13px; letter-spacing: .06em; border: 2px solid #140b05; }
      body.icl-on .icl-pred .muted { color: #6b5a40; }
      body.icl-on .icl-pred .icl-vals button { min-width: 64px; min-height: 48px; font-size: 20px; font-weight: 800; background: #fff8e6; color: #2a2018; border-color: #6b4f22; }
      body.icl-on .icl-pred .icl-conf button { color: #2a2018; border-color: #6b4f22; background: #fff8e6; }
    }
    /* Narrow: she stands behind the work, dimmed, and the note carries her words. */
    @media (max-width: 899px) {
      .icl-upt { right: -14vw; height: 74vh; opacity: .5; }
      .icl-bubble { display: none; }
    }
    /* A beat: the interface pulls down out of the way, she steps forward and talks. */
    body.icl-on #panel { transition: transform .45s ease, opacity .3s; }
    body.icl-beat #panel { transform: translateY(104%); opacity: 0; pointer-events: none; }
    body.icl-beat .icl-upt { right: 50%; transform: translateX(50%); animation: none; opacity: 1; height: min(calc(100vh - 70px), 1000px); }
    body.icl-beat .icl-bubble { display: none; }
    #icl-vn { position: fixed; z-index: 21; left: 50%; bottom: calc(16px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%); width: min(860px, calc(100% - 32px)); min-height: 110px;
      display: block; padding: 16px 20px 18px; text-align: left; border: 2px solid #140b05; border-radius: 12px; color: #2a2018; font: inherit; font-size: 18px; line-height: 1.45; cursor: pointer;
      background: linear-gradient(#fbf5e3, #f0e4c6); box-shadow: 0 0 0 2px rgba(233, 197, 109, .6), 0 12px 30px rgba(0, 0, 0, .6); animation: icl-vn-in .35s ease; }
    .icl-vn-name { position: absolute; top: -16px; left: 18px; padding: 3px 12px; border-radius: 6px; background: linear-gradient(#dcb65e, #a67c2c); color: #2a1c08; font-size: 14px; letter-spacing: .06em; border: 2px solid #140b05; }
    .icl-vn-line { display: block; overflow-wrap: anywhere; }
    .icl-vn-more { position: absolute; right: 14px; bottom: 8px; color: #8a5608; animation: icl-more 1s ease-in-out infinite; }
    @keyframes icl-vn-in { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
    @keyframes icl-more { 50% { transform: translateX(4px); } }
    @media (prefers-reduced-motion: reduce) { .icl-upt, #icl-vn, .icl-vn-more, .icl-snot { animation: none !important; } #panel, .icl-upt { transition: none !important; } }
    @media (min-width: 900px) {
      body.in-mode .icl-cols { display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); grid-template-rows: auto 1fr; grid-template-areas: 'm a' 'm b'; gap: 0 28px; align-items: start; }
      body.in-mode .icl-a { grid-area: a; } body.in-mode .icl-m { grid-area: m; } body.in-mode .icl-b { grid-area: b; }
      body.in-mode .icl-m .icl-machine { margin-top: 0; }
    }
    .icl-page { margin: 6px 0; overflow-wrap: anywhere; }
    .icl-machine { display: flex; flex-direction: column; align-items: stretch; gap: 2px; margin: 8px 0; }
    .icl-part { border: 2px solid var(--ink, #222); border-radius: 8px; background: var(--paper, #fff); }
    .icl-part.hot { border-color: #a8322a; box-shadow: 0 0 0 2px rgba(168, 50, 42, .35); }
    .icl-ph { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; width: 100%; min-height: 44px; padding: 6px 8px; text-align: left; background: none; border: 0; color: inherit; font: inherit; }
    .icl-ph:disabled { cursor: default; opacity: 1; }
    .icl-set { font-size: 13px; padding: 1px 6px; border: 1px solid var(--line, #999); border-radius: 10px; }
    .icl-did { font-size: 13px; font-weight: 700; }
    .icl-tap { margin-left: auto; text-decoration: underline; }
    .icl-arrow { text-align: center; line-height: 1; opacity: .7; }
    .icl-open { padding: 4px 8px 8px; }
    /* The evidence: a log scroll, unrolled. */
    .icl-ev { position: relative; white-space: pre-wrap; overflow-wrap: anywhere; font-size: 13px; line-height: 1.45; margin: 12px 4px 12px; padding: 10px 14px; color: #2a2018; text-shadow: none;
      background: repeating-linear-gradient(transparent 0 18px, rgba(90, 70, 40, .08) 18px 19px), linear-gradient(90deg, #e9dcb8, #f8f0da 12%, #f8f0da 88%, #e9dcb8);
      border-radius: 2px; box-shadow: 0 3px 8px rgba(0, 0, 0, .5); }
    .icl-ev::before, .icl-ev::after { content: ''; position: absolute; left: -4px; right: -4px; height: 9px; border-radius: 5px; background: linear-gradient(#c9b48a, #8a7550 60%, #5e4c30); box-shadow: 0 2px 3px rgba(0, 0, 0, .45); }
    .icl-ev::before { top: -6px; } .icl-ev::after { bottom: -6px; }
    .icl-knob { display: flex; flex-direction: column; gap: 4px; margin: 6px 0; }
    .icl-vals { display: flex; flex-wrap: wrap; gap: 6px; }
    .icl-vals button { min-width: 44px; min-height: 40px; padding: 4px 10px; border: 2px solid var(--ink, #222); border-radius: 6px; background: var(--paper, #fff); color: inherit; font: inherit; }
    .icl-vals button.on { border-width: 3px; border-style: double; font-weight: 800; }
    .icl-vals button.on::before { content: '● '; }
    .icl-pred { margin: 8px 0; }
    .icl-conf button { flex: 1 1 0; min-width: 0; }
    .icl-teach { margin: 6px 0; padding: 6px 8px; border: 2px dashed var(--ink, #222); border-radius: 6px; overflow-wrap: anywhere; }
    .icl-strip ul { padding-left: 18px; margin: 4px 0; }
    .icl-strip li { margin: 2px 0; }
    .icl-tt { display: inline-block; min-width: 46px; font-variant-numeric: tabular-nums; }
    .icl-stamps { list-style: none; padding: 0; margin: 6px 0; }
    .icl-stamps li { margin: 4px 0; overflow-wrap: anywhere; }
    .icl-stamps li.on { font-weight: 700; }
    .icl-slo, .icl-verdict, .icl-changes { overflow-wrap: anywhere; }
    .icl-verdict { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; margin: 4px 0 8px; }
    .icl-vs { display: inline-block; padding: 4px 10px; border: 3px double currentColor; border-radius: 4px; font-weight: 800; letter-spacing: .02em; transform: rotate(-2deg); }
    .icl-vs.ok { color: #7fd06a; } .icl-vs.no { color: #ff8a70; }
    .icl-pts { font-weight: 800; }
    .icl-changes { display: flex; align-items: center; gap: 10px; margin: 6px 0; }
    .icl-cc { display: inline-flex; gap: 4px; } .icl-cc i { font-style: normal; display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; border: 2px solid rgba(233, 197, 109, .5); opacity: .45; }
    .icl-cc i.on { opacity: 1; background: #e9c56d; color: #2a1c08; } .icl-cc.over i.on { background: #d2503a; color: #fff; }
    .icl-slo { display: flex; flex-direction: column; gap: 2px; } .icl-slo .icl-lamp { margin: 0; }
    .icl-lamp b { font-size: 18px; }
    .icl-art { width: 40px; height: 40px; object-fit: contain; image-rendering: pixelated; flex: none; }
    .icl-stools { display: flex; flex-wrap: wrap; gap: 1px; width: 100%; }
    .icl-stool { width: 22px; height: 22px; object-fit: contain; image-rendering: pixelated; }
    .icl-flow { display: flex; flex-wrap: wrap; gap: 2px; width: 100%; min-height: 24px; overflow: hidden; }
    .icl-env { display: inline-block; width: 22px; height: 22px; }
    .icl-env img { width: 22px; height: 22px; object-fit: contain; image-rendering: pixelated; }
    .icl-env.bounce { animation: icl-bounce 1.6s ease-in-out infinite; }
    .icl-env.through { animation: icl-through 2.4s linear infinite; }
    .icl-env.drop { animation: icl-drop 1.8s ease-in infinite; }
    @keyframes icl-bounce { 0%, 100% { transform: translateX(0); } 40% { transform: translateX(18px); } 55% { transform: translateX(-6px) rotate(-12deg); } }
    @keyframes icl-through { 0% { transform: translateX(-10px); opacity: 0; } 15%, 80% { opacity: 1; } 100% { transform: translateX(60px); opacity: 0; } }
    @keyframes icl-drop { 0% { transform: translateY(-10px); opacity: 0; } 30% { opacity: 1; } 70%, 100% { transform: translateY(2px); } }
    .icl-knob.changed { padding-left: 8px; border-left: 3px solid #e9c56d; }
    .icl-chg { font-size: 11px; font-weight: 800; color: #e9c56d; letter-spacing: .04em; }
    .icl-sp { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; }
    .icl-sp .icl-stools { width: auto; gap: 2px; }
    .icl-sb { min-width: 34px; min-height: 44px; padding: 2px; border: 2px solid transparent; border-radius: 6px; background: rgba(0, 0, 0, .25); }
    .icl-sb .icl-stool { width: 28px; height: 28px; }
    .icl-sb.res { background: rgba(80, 120, 200, .3); border-color: rgba(140, 180, 255, .5); }
    .icl-sb:hover { border-color: #e9c56d; }
    .icl-none, .icl-sw, .icl-tk, .icl-tb { min-height: 44px; padding: 4px 12px; border: 2px solid var(--ink, #222); border-radius: 6px; background: var(--paper, #fff); color: inherit; font: inherit; }
    .icl-none.on, .icl-tk.on, .icl-tb.on { border-color: #e9c56d; box-shadow: 0 0 0 2px rgba(233, 197, 109, .5); font-weight: 800; }
    .icl-switch { position: relative; display: inline-grid; grid-template-columns: 1fr 1fr; gap: 0; width: max-content; padding: 3px; border-radius: 24px; background: #1a110a; box-shadow: inset 0 2px 6px rgba(0, 0, 0, .7); }
    .icl-switch .icl-sw { position: relative; z-index: 1; min-width: 92px; border: 0; border-radius: 20px; background: none; color: #bfb39a; }
    .icl-switch .icl-sw.on { color: #2a1c08; font-weight: 800; }
    .icl-switch i { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 20px; background: linear-gradient(#dcb65e, #a67c2c); box-shadow: 0 2px 4px rgba(0, 0, 0, .6); transition: transform .2s; }
    .icl-switch.up i { transform: translateX(100%); background: linear-gradient(#bfe6a0, #4f9a3c); }
    .icl-tray { display: flex; flex-wrap: wrap; gap: 6px; }
    .icl-tb { display: inline-flex; gap: 0; align-items: center; }
    .icl-te { width: 22px; height: 22px; image-rendering: pixelated; margin-left: -6px; } .icl-te:first-child { margin-left: 0; }
    .icl-dial { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .icl-face { position: relative; width: 56px; height: 56px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, #6a5236, #2c1c10 70%); border: 3px solid #140b05; box-shadow: 0 3px 6px rgba(0, 0, 0, .6), inset 0 0 0 2px rgba(233, 197, 109, .3); flex: none; }
    .icl-face i { position: absolute; left: 50%; top: 6px; bottom: 50%; width: 4px; margin-left: -2px; border-radius: 2px; background: #e9c56d; transform-origin: 50% 100%; transition: transform .25s; }
    .icl-ticks { display: flex; flex-wrap: wrap; gap: 6px; }
    .icl-play { position: relative; max-width: 760px; margin: 10px auto; padding: 10px 0 6px; }
    .icl-lane { position: relative; height: 128px; margin: 0 44px; }
    .icl-lane::before { content: ''; position: absolute; left: 0; right: 0; top: 46px; border-top: 3px dashed rgba(233, 197, 109, .45); }
    .icl-stop { position: absolute; top: 0; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; gap: 2px; width: 88px; text-align: center; font-size: 12px; font-weight: 700; }
    .icl-big { width: 72px; height: 72px; object-fit: contain; image-rendering: pixelated; filter: drop-shadow(0 3px 4px rgba(0, 0, 0, .6)); }
    .icl-envs { position: absolute; inset: 0; pointer-events: none; }
    .icl-fly { position: absolute; top: calc(30px + var(--y, 0px)); left: var(--a); width: 28px; height: 28px; margin-left: -14px; opacity: 0;
      animation: .62s ease-in-out var(--d, 0ms) forwards; }
    .icl-fly img { width: 28px; height: 28px; object-fit: contain; image-rendering: pixelated; filter: drop-shadow(0 2px 2px rgba(0, 0, 0, .6)); }
    .icl-fly.go { animation-name: icl-go; } .icl-fly.back { animation-name: icl-back; } .icl-fly.lost { animation-name: icl-lost; } .icl-fly.drop { animation-name: icl-dropto; }
    @keyframes icl-go { 0% { left: var(--a); opacity: 0; } 12% { opacity: 1; } 85% { opacity: 1; } 100% { left: var(--b); opacity: .85; } }
    @keyframes icl-back { 0% { left: var(--a); opacity: 0; } 12% { opacity: 1; } 50% { left: var(--b); transform: rotate(0); } 62% { transform: rotate(-25deg) scale(1.15); } 100% { left: var(--a); opacity: .2; transform: rotate(-40deg); } }
    @keyframes icl-lost { 0% { left: var(--a); opacity: 1; } 100% { left: var(--a); opacity: 0; transform: translate(-14px, 40px) rotate(-60deg); } }
    @keyframes icl-dropto { 0% { left: var(--a); opacity: 0; } 12% { opacity: 1; } 60% { left: var(--b); transform: translateY(0); } 100% { left: var(--b); opacity: 1; transform: translateY(26px) rotate(15deg); } }
    @media (min-width: 900px) {
      body.in-mode .icl-play { max-width: 900px; padding-top: 40px; }
      body.in-mode .icl-lane { height: 190px; margin: 0 70px; } body.in-mode .icl-lane::before { top: 70px; }
      body.in-mode .icl-stop { width: 140px; font-size: 15px; } body.in-mode .icl-big { width: 120px; height: 120px; }
      body.in-mode .icl-fly { top: calc(50px + var(--y, 0px)); width: 40px; height: 40px; margin-left: -20px; } body.in-mode .icl-fly img { width: 40px; height: 40px; }
      body.in-mode .icl-pstools .icl-stool { width: 30px; height: 30px; }
      body.in-mode .icl-clock b { font-size: 28px; } body.in-mode .icl-tally { font-size: 20px; }
    }
    .icl-pstools { display: flex; justify-content: flex-end; margin: -6px 0 10px; }
    .icl-pstools .icl-stools { width: auto; }
    .icl-clock { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; font-variant-numeric: tabular-nums; }
    .icl-clock b { font-size: 20px; color: #e9c56d; min-width: 52px; }
    .icl-tally { display: flex; flex-wrap: wrap; gap: 4px 12px; font-weight: 700; }
    .icl-lamp { display: flex; align-items: center; gap: 10px; min-height: 40px; margin-top: 8px; font-size: 18px; }
    .icl-lamp i { width: 28px; height: 28px; border-radius: 50%; border: 3px solid #140b05; }
    .icl-lamp.green i { background: radial-gradient(circle at 35% 30%, #c9ffb0, #3fae3a 60%, #1f5e1c); box-shadow: 0 0 18px 6px rgba(80, 220, 80, .55); }
    .icl-lamp.red i { background: radial-gradient(circle at 35% 30%, #ffc0b0, #d23a2a 60%, #6a1610); box-shadow: 0 0 18px 6px rgba(240, 70, 50, .55); }
    @media (prefers-reduced-motion: reduce) { .icl-env, .icl-fly { animation: none !important; opacity: 1; } }`;
  document.head.appendChild(css);
})();
