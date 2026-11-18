// Mira's Kitchen, in the room (Ladi, Nov 17: "It's still a box interface. Can you use real world sprites like the other
// games started doing?" / "Draft is a better reference. Monster Hunt as well"). Like Architect's Draft's street and
// Monster Hunt's notice board, the game is the painting: Bram's kitchen (assets/img/stage/kitchen-*.webp) fills the
// screen edge to edge, every setting is a painted thing standing in it (assets/img/kitchen/, Sogni, CREDITS.md), and
// Mira stands in the room, full size, talking in a speech bubble. js/mode-kitchen.js runs the screens; the rules stay in
// js/kitchen-core.js.
//   - One world in the painting's own pixels: the wide painting (1344 x 768) on a landscape screen, the tall one
//     (768 x 1344) on a phone held upright, each with its own LAYOUT of where things stand. The world is scaled to
//     cover the space between the top bar and the dock, centred on its focus.
//   - The ticket rail under the mantle: one paper ticket per call. A burst is clipped up together.
//   - The braziers: one per cook (execution environment). A cold start is a brazier being lit (and the pantry opened if
//     the key hangs outside the handler); a warm one is already burning. Provisioned cooks (on the alias) are lit
//     before the first ticket.
//   - The stove knob (Memory) and the brass timer (Timeout): drag round, or tap to step on (arrow keys too).
//   - The pantry key: on the hook by the window (opened once per cook: outside the handler) or in the pot (every call:
//     inside). Drag it across, or tap where it should go.
//   - The tray on the hatch sill: tap to tie the statusCode tag on it, or take it off (a 502 at the counter).
//   - The pantry jar on the shelf: tap to swap its label, chalked "test-pantry" (in the code) or a brass plate read
//     from the stage (an environment variable).
//   - The spoiled crate under the bench: the on-failure destination. Tap its spot to put it there or take it away.
//   - The peg rack above the window: provisioned concurrency. Tap to hang more cooks' hats, on $LATEST or on "live".
//   - Bram's book on the bench: tap it to read the recipe as code. Each change writes its line, which floats up.
//   - A firing plays on the painting: a ticket lights up, its brazier lights (cold) or is already going (warm), the pan
//     cooks for the call's seconds (sped up), a call past the timer smokes, an async call goes again on the same
//     brazier, and the plate lands on the bench (or in the crate, when the destination keeps it). Skip ends it.
// API: SD.kitchenScene.html(order, cfg, { r, live, hot, say, mood, wrote })   the world, Mira and her bubble
//      SD.kitchenScene.fit(root)                       scales the world to its stage (call after render; on resize too)
//      SD.kitchenScene.wire(root, cfg, set(key, v), { book })   the things you handle, when live
//      SD.kitchenScene.play(root, r, done)              plays a firing; returns stop() (Skip)
//      SD.kitchenScene.OUT                               each plate outcome's glyph, word and class
(function () {
  if (!SD.kitchen) return;
  const K = SD.kitchen, KS = SD.kitchenScene = {};
  const esc = s => SD.ui.esc(String(s == null ? '' : s));
  const icon = (n, cls) => `<svg class="kx-gi${cls ? ' ' + cls : ''}" viewBox="0 0 512 512" aria-hidden="true">${(SD.icons && SD.icons[n]) || ''}</svg>`;
  const reduced = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const IMG = n => `assets/img/kitchen/${n}.webp`;
  // Sprite width / height.
  const AR = { 'brazier-off': 231 / 256, 'brazier-on': 225 / 256, hat: 256 / 200, hook: 110 / 256, jar: 124 / 256, knob: 1, pegrack: 400 / 71,
    'plate-full': 150 / 100, plate: 150 / 68, pot: 256 / 162, rail: 900 / 65, tag: 61 / 140, ticket: 69 / 120, timer: 189 / 256, tray: 256 / 178,
    'mira-smile': 288 / 640, 'mira-neutral': 288 / 640, key: 97 / 256, crate: 246 / 256 };
  const SRC = { key: 'assets/img/ic/fix-key.webp', crate: 'assets/img/ic/fix-crate.webp' };
  const src = n => SRC[n] || IMG(n);

  // Where things stand, in the painting's pixels: [centre x, bottom y, width]; boxes are [left, top, right, bottom].
  // bubble: where Mira's speech bubble floats on a wide screen ([left x, top y] in the painting, width in screen pixels);
  // on a phone it sits above the painting instead.
  const LAYOUT = {
    wide: { W: 1344, H: 768, bg: 'assets/img/stage/kitchen-wide.webp', focus: [672, 420],
      rail: [300, 262, 470], tickets: [70, 262, 490, 380], knob: [282, 528, 62], timer: [960, 520, 70],
      hook: [470, 400, 34], keyHook: [470, 442, 26], pot: [330, 462, 112], keyPot: [330, 428, 26],
      tray: [850, 412, 120], jar: [760, 412, 64], peg: [585, 342, 160],
      braziers: [30, 640, 470, 745], plates: [610, 580, 1010, 700], book: [600, 505, 870, 600], crate: [565, 700, 96],
      mira: [1150, 748, 238], bubble: [500, 100, 600] },
    tall: { W: 768, H: 1344, bg: 'assets/img/stage/kitchen-tall.webp', focus: [400, 810],
      rail: [280, 520, 520], tickets: [30, 520, 530, 610], knob: [250, 830, 56], timer: [470, 692, 62],
      hook: [560, 620, 30], keyHook: [560, 662, 24], pot: [170, 712, 110], keyPot: [170, 678, 26],
      tray: [655, 628, 104], jar: [385, 690, 50], peg: [640, 500, 160],
      braziers: [230, 960, 540, 1030], plates: [20, 1040, 540, 1180], book: [240, 860, 640, 960], crate: [110, 1030, 96],
      mira: [665, 1185, 185] }
  };
  KS.layout = () => (window.innerWidth < window.innerHeight * 0.95 || window.innerWidth < 640 ? 'tall' : 'wide');
  const px = n => Math.round(n * 10) / 10 + 'px';
  // A sprite with its bottom centre at (x, y), w wide.
  const spot = (name, a, o) => {
    o = o || {};
    const [x, y, w] = a, h = w / (AR[name] || 1);
    return `left:${px(x - w / 2)};top:${px(y - h)};width:${px(w)};height:${px(h)};${o.style || ''}`;
  };
  const box = b => `left:${px(b[0])};top:${px(b[1])};width:${px(b[2] - b[0])};height:${px(b[3] - b[1])}`;
  const sprite = (name, a, o) => `<img class="kw-sp ${o && o.cls || ''}" src="${src(name)}" alt="" draggable="false" style="${spot(name, a, o)}">`;

  const OUT = {
    served: ['✓', 'Served', 'good'], late: ['⌛', 'Late', 'warn'], '502': ['502', 'Bad Gateway', 'bad'], timeout: ['⏱', 'Timed out', 'bad'],
    wrong: ['≠', 'Wrong pantry', 'bad'], lost: ['✗', 'Lost', 'bad'], kept: ['⇩', 'Kept', 'keep']
  };
  KS.OUT = OUT;
  const plateLabel = p => `${p.kind === 'api' ? 'Counter' : 'Photo'}${p.stage === 'test' ? ' (test)' : ''}: ${OUT[p.out][1]}${p.stuck ? ' (the corrupt file)' : ''}. ${p.d} seconds, ${[p.cold ? 'cold start' : 'warm', p.tries > 1 ? p.tries + ' tries' : ''].filter(Boolean).join(', ')}.`;
  function plate(p, i) {
    const [g, word, cls] = OUT[p.out], full = p.out === 'served' || p.out === 'late';
    return `<li class="kw-plate ${cls}${p.stuck ? ' stuck' : ''}" data-pl="${i}" role="img" aria-label="${esc(plateLabel(p))}" title="${esc(plateLabel(p))}">
      <img src="${IMG(full ? 'plate-full' : 'plate')}" alt="" draggable="false"><b class="kw-stamp">${esc(g)}</b><span class="kw-pd">${p.d}s${p.cold ? '❄' : ''}${p.tries > 1 ? '↻' + p.tries : ''}</span><span class="sr">${esc(word)}</span></li>`;
  }

  // The order's calls as paper tickets under the mantle.
  function tickets(o) {
    let n = 0;
    return o.guests.map(g => {
      const t = [];
      for (let i = 0; i < g.n; i++) t.push(`<span class="kw-tk ${g.kind}${g.stuck ? ' stuck' : ''}" data-tk="${n++}"><img src="${IMG('ticket')}" alt="" draggable="false">${icon(g.stuck ? 'spider-web' : g.kind === 'api' ? 'coffee-cup' : 'film-strip')}${g.stage === 'test' ? '<b>T</b>' : ''}</span>`);
      return `<span class="kw-clip${g.burst ? ' burst' : ''}" title="${esc(`${g.kind === 'api' ? 'Counter' : 'Photos'}${g.stage === 'test' ? ', test' : ''}: ${g.stuck ? 'a corrupt file' : g.burst ? g.n + ' at once' : g.n + ', one by one'}`)}">${t.join('')}</span>`;
    }).join('');
  }

  // The dials' angle: N stops over 240 degrees.
  const angle = (key, v) => { const o = K.KNOBS[key].opts, i = Math.max(0, o.indexOf(v)); return -120 + (240 * i) / (o.length - 1); };

  // The braziers: one per cook, in up to two rows.
  function braziers(L, n, prelit) {
    const [x0, , x1, y1] = L.braziers, per = Math.min(n, 5), rows = Math.ceil(n / 5);
    const w = Math.min(96, ((x1 - x0) / per) * 0.86);
    let out = '';
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / 5), col = i % 5, inRow = Math.min(5, n - row * 5);
      const x = x0 + ((x1 - x0) * (col + 0.5)) / inRow, y = y1 - (rows - 1 - row) * w * 0.5;
      const lit = i < prelit;
      out += `<div class="kw-br${lit ? ' lit pre' : ''}" data-b="${i}" style="${spot('brazier-off', [x, y, w])}">
        <img class="kw-off" src="${IMG('brazier-off')}" alt="" draggable="false"><img class="kw-on" src="${IMG('brazier-on')}" alt="" draggable="false">
        <i class="kw-smoke" aria-hidden="true"></i><span class="kw-bt">${lit ? 'ready' : ''}</span></div>`;
    }
    return out;
  }

  KS.html = function (order, c, o2) {
    o2 = o2 || {};
    const o = K.ORDERS[order], r = o2.r, live = !!o2.live, hot = o2.hot, lay = o2.layout || KS.layout(), L = LAYOUT[lay];
    const k = o.knobs, can = key => live && k.includes(key);
    const api = o.guests.some(g => g.kind === 'api'), s3 = o.guests.some(g => g.kind === 's3') || k.includes('dest');
    const [pcN, pcOn] = K.pcOf(c.pc);
    const nB = r && !r.refused ? r.burners : Math.max(1, ...o.guests.map(g => (g.burst ? g.n : 1)), pcOn === 'alias' ? pcN : 0);
    const prelit = pcOn === 'alias' ? pcN : 0;
    const tap = (key, inner, a, name, label, extra) => can(key)
      ? `<button type="button" class="kw-thing${hot === key ? ' hot' : ''}" ${extra || ''} aria-label="${esc(label)}" style="${spot(name, a)}">${inner}</button>`
      : `<div class="kw-thing fixed${hot === key ? ' hot' : ''}" role="img" aria-label="${esc(label)}" style="${spot(name, a)}">${inner}</div>`;
    const img = n => `<img src="${src(n)}" alt="" draggable="false">`;
    const chalk = (t, cls) => `<span class="kw-chalk${cls ? ' ' + cls : ''}">${esc(t)}</span>`;
    const parts = [];
    // The rail and its tickets.
    parts.push(sprite('rail', L.rail), `<div class="kw-tks" style="${box(L.tickets)}">${tickets(o)}</div>`);
    // Memory: the stove knob. Timeout: the brass timer, its needle drawn on its blank face.
    parts.push(tap('mem', `<span class="kw-rot" style="--a:${angle('mem', c.mem)}deg">${img('knob')}</span>${chalk(K.KNOBS.mem.say(c.mem))}`, L.knob, 'knob',
      `Memory: ${K.KNOBS.mem.say(c.mem)}`, `data-dial="mem" role="slider" aria-valuetext="${esc(K.KNOBS.mem.say(c.mem))}"`));
    parts.push(tap('timeout', `${img('timer')}<i class="kw-needle" style="--a:${angle('timeout', c.timeout)}deg"></i>${chalk(K.KNOBS.timeout.say(c.timeout))}`, L.timer, 'timer',
      `Timeout: ${K.KNOBS.timeout.say(c.timeout)}`, `data-dial="timeout" role="slider" aria-valuetext="${esc(K.KNOBS.timeout.say(c.timeout))}"`));
    // The pantry key: on the hook or in the pot. Each is a place to tap; the key is dragged between them.
    const keyAt = c.prep === 'outside' ? L.keyHook : L.keyPot;
    const slot = (v, name, a, label) => can('prep') && c.prep !== v
      ? `<button type="button" class="kw-thing kw-slot" data-set="prep" data-v="${v}" aria-label="${esc(label)}" style="${spot(name, a)}">${img(name)}</button>`
      : `<div class="kw-thing kw-slot${c.prep === v ? ' on' : ''}${k.includes('prep') ? '' : ' fixed'}" data-v="${v}" style="${spot(name, a)}">${img(name)}</div>`;
    parts.push(slot('outside', 'hook', L.hook, 'Hang the pantry key on the hook: open the pantry once per cook, outside the handler'));
    parts.push(slot('inside', 'pot', L.pot, 'Drop the pantry key in the pot: open the pantry on every call, inside the handler'));
    parts.push(`<${can('prep') ? 'button type="button"' : 'div'} class="kw-thing kw-key${hot === 'prep' ? ' hot' : ''}${c.prep === 'inside' ? ' in' : ''}" ${can('prep') ? 'data-drag="prep"' : ''} aria-label="The pantry key: ${esc(K.KNOBS.prep.say(c.prep))}" style="${spot('key', keyAt)}">${img('key')}</${can('prep') ? 'button' : 'div'}>`);
    parts.push(`<span class="kw-chalk kw-keyl${can('prep') ? '' : ' fixed'}" style="left:${px(c.prep === 'outside' ? L.hook[0] - 70 : L.pot[0] - 70)};top:${px(c.prep === 'outside' ? L.hook[1] + 46 : L.pot[1] + 4)}">${c.prep === 'outside' ? 'once per cook' : 'every call'}</span>`);
    // The tray, with or without its statusCode tag.
    if (api || k.includes('ret')) parts.push(tap('ret', `${img('tray')}${c.ret === 'proxy' ? `<span class="kw-tag"><img src="${IMG('tag')}" alt=""><i>statusCode 200<br>+ body</i></span>` : ''}${chalk(c.ret === 'proxy' ? 'tagged' : 'just the dish')}`, L.tray, 'tray',
      `The tray: ${K.KNOBS.ret.say(c.ret)}`, `data-tog="ret" aria-pressed="${c.ret === 'proxy'}"`));
    // The pantry jar and its label.
    if (k.includes('env') || o.guests.some(g => g.stage === 'test')) parts.push(tap('env', `${img('jar')}<i class="kw-label${c.env ? ' brass' : ''}">${c.env ? '${PANTRY_<wbr>TABLE}' : 'test-<wbr>pantry'}</i>`, L.jar, 'jar',
      `The pantry jar: ${K.KNOBS.env.say(c.env)}`, `data-tog="env" aria-pressed="${!!c.env}"`));
    // The peg rack: provisioned cooks' hats, on $LATEST or on "live".
    if (k.includes('pc')) {
      const [x, y, w] = L.peg, hats = [];
      for (let i = 0; i < Math.min(pcN, 10); i++) hats.push(`<img class="kw-hat" src="${IMG('hat')}" alt="" style="left:${(10 + (i % 5) * 20).toFixed(1)}%;top:${i >= 5 ? 70 : 40}%">`);
      parts.push(tap('pc', `${img('pegrack')}${hats.join('')}<span class="kw-signs"><i class="${pcOn === 'latest' ? 'on' : ''}">$LATEST</i><i class="${pcOn === 'alias' ? 'on' : ''}">live</i></span>`, [x, y, w], 'pegrack',
        `The peg rack: ${K.KNOBS.pc.say(c.pc)}`, 'data-cyc="pc"'));
    }
    // The cooks.
    parts.push(braziers(L, nB, prelit));
    // The bench: plates land here; the crate under it keeps what failed every try.
    const keptHere = p => p.out === 'kept';
    const plates = r && !r.refused ? r.plates.map((p, i) => (keptHere(p) ? '' : plate(p, i))).join('') : '';
    parts.push(`<ul class="kw-plates" style="${box(L.plates)}" aria-label="Plates on the bench">${plates}</ul>`);
    if (s3) {
      const kept = r && !r.refused ? r.plates.map((p, i) => (keptHere(p) ? plate(p, i) : '')).join('') : '';
      const a = L.crate;
      parts.push(c.dest
        ? `<${can('dest') ? 'button type="button" data-tog="dest" aria-pressed="true"' : 'div role="img"'} class="kw-thing kw-crate${hot === 'dest' ? ' hot' : ''}" aria-label="The spoiled crate: on-failure destination" style="${spot('crate', a)}">${img('crate')}${chalk('spoiled-queue')}<ul class="kw-kept">${kept}</ul></${can('dest') ? 'button' : 'div'}>`
        : `<${can('dest') ? 'button type="button" data-tog="dest" aria-pressed="false"' : 'div role="img"'} class="kw-thing kw-crate none${hot === 'dest' ? ' hot' : ''}" aria-label="No crate: failed photos are dropped" style="${spot('crate', a)}">${chalk('no crate')}</${can('dest') ? 'button' : 'div'}>`);
    }
    // Bram's book: the recipe as code.
    parts.push(`<button type="button" class="kw-book" aria-label="Bram's book: read the recipe as code" style="${box(L.book)}"><span>${icon('open-book')}The recipe as code</span></button>`);
    if (o2.wrote) parts.push(`<p class="kw-wrote" aria-hidden="true" style="left:${px(L.book[0])};top:${px(L.book[1] - 60)};max-width:${px(Math.max(420, L.book[2] - L.book[0]))}">${esc(o2.wrote)}</p>`);
    // Mira, and what she says.
    const mood = o2.mood === 'smile' ? 'mira-smile' : 'mira-neutral';
    // A phone: Mira steps out while the stove fires, so the plates and braziers have the room.
    if (!(lay === 'tall' && r)) parts.push(`<img class="kw-mira" src="${IMG(mood)}" alt="" draggable="false" style="${spot(mood, L.mira)}">`);
    const bub = o2.say ? `<div class="kw-say" aria-live="polite"${L.bubble ? ` data-bx="${L.bubble[0]}" data-by="${L.bubble[1]}" data-bw="${L.bubble[2]}"` : ''}><div>${o2.say}</div></div>` : '';
    return `<div class="kw-stage" data-layout="${lay}">${bub}<div class="kw-view"><div class="kw-world${live ? ' live' : ''}" style="width:${L.W}px;height:${L.H}px" data-fx="${L.focus[0]}" data-fy="${L.focus[1]}">
      <img class="kw-bg" src="${L.bg}" alt="Bram's kitchen at night: the stove lit, the recipe book open on the bench" draggable="false">${parts.join('')}</div></div></div>`;
  };

  // Scale the world to cover its stage, centred on the focus, never showing past the painting's edge.
  KS.fit = function (root) {
    const stg = root.querySelector('.kw-stage'), st = stg && stg.querySelector('.kw-view'), w = st && st.querySelector('.kw-world');
    if (!w) return;
    // Refit whenever the view changes size (the panel settling, the bubble's text changing, a resize).
    if (!st._ro && window.ResizeObserver) { st._ro = new ResizeObserver(() => KS.fit(root)); st._ro.observe(st); }
    const W = parseFloat(w.style.width), H = parseFloat(w.style.height), aw = st.clientWidth, ah = st.clientHeight;
    if (!aw || !ah) return;
    const s = Math.max(aw / W, ah / H);
    const tx = Math.min(0, Math.max(aw - W * s, aw / 2 - +w.dataset.fx * s)), ty = Math.min(0, Math.max(ah - H * s, ah / 2 - +w.dataset.fy * s));
    w.style.transform = `translate(${px(tx)}, ${px(ty)}) scale(${s.toFixed(4)})`;
    w.dataset.s = s;
    // A wide screen: the bubble floats beside Mira's head, kept inside the stage.
    const b = stg.querySelector('.kw-say[data-bx]');
    if (b && stg.dataset.layout === 'wide') {
      const bw = Math.min(+b.dataset.bw, aw - 16);
      b.style.width = px(bw);
      b.style.left = px(Math.max(8, Math.min(aw - bw - 8, +b.dataset.bx * s + tx)));
      b.style.top = px(Math.max(8, +b.dataset.by * s + ty));
      b.style.maxHeight = px(ah * 0.46);
    }
  };

  // ---- Handling the things ----
  KS.wire = function (root, c, set, o) {
    o = o || {};
    const x = root.querySelector('.kw-world');
    if (!x) return;
    const book = x.querySelector('.kw-book');
    // A tapped plate says what happened to it (its seconds, cold start and tries are hidden on a phone).
    x.querySelectorAll('[data-pl]').forEach(el => el.onclick = () => {
      const st = root.querySelector('.kw-view');
      let tip = st && st.querySelector('.kw-tip');
      if (!st) return;
      if (!tip) { tip = document.createElement('p'); tip.className = 'kw-tip'; tip.setAttribute('role', 'status'); st.appendChild(tip); }
      tip.textContent = el.getAttribute('aria-label');
      clearTimeout(tip._t); tip.hidden = false; tip._t = setTimeout(() => { tip.hidden = true; }, 3500);
    });
    if (book) book.onclick = () => o.book && o.book();
    if (!x.classList.contains('live')) return;
    x.querySelectorAll('button[data-set]').forEach(el => el.onclick = () => set(el.dataset.set, el.dataset.v));
    x.querySelectorAll('[data-tog]').forEach(el => el.onclick = () => { const k = el.dataset.tog; set(k, k === 'ret' ? (c.ret === 'proxy' ? 'body' : 'proxy') : !c[k]); });
    x.querySelectorAll('[data-cyc]').forEach(el => el.onclick = () => { const k = el.dataset.cyc, opts = K.KNOBS[k].opts; set(k, opts[(opts.indexOf(c[k]) + 1) % opts.length]); });
    x.querySelectorAll('button[data-dial]').forEach(el => wireDial(el, c, set));
    const key = x.querySelector('[data-drag="prep"]');
    if (key) wireKey(key, x, c, set);
  };
  function wireDial(el, c, set) {
    const k = el.dataset.dial, opts = K.KNOBS[k].opts, n = opts.length;
    let start = null, moved = false, at = opts.indexOf(c[k]);
    const rot = el.querySelector('.kw-rot, .kw-needle'), lab = el.querySelector('.kw-chalk');
    const pick = e => {
      const b = el.getBoundingClientRect(), dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
      return Math.max(0, Math.min(n - 1, Math.round(((Math.atan2(dx, -dy) * 180 / Math.PI + 120) / 240) * (n - 1))));
    };
    el.addEventListener('pointerdown', e => { start = [e.clientX, e.clientY]; moved = false; try { el.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
    el.addEventListener('pointermove', e => {
      if (!start || (!moved && Math.hypot(e.clientX - start[0], e.clientY - start[1]) < 6)) return;
      moved = true;
      const j = pick(e);
      if (j !== at) { at = j; if (rot) rot.style.setProperty('--a', angle(k, opts[j]) + 'deg'); if (lab) lab.textContent = K.KNOBS[k].say(opts[j]); }
    });
    el.addEventListener('pointerup', () => {
      if (!start) return;
      start = null;
      if (moved) { if (opts[at] !== c[k]) set(k, opts[at]); } else set(k, opts[(opts.indexOf(c[k]) + 1) % n]);
    });
    el.addEventListener('pointercancel', () => { start = null; });
    el.onclick = e => e.preventDefault();
    el.onkeydown = e => {
      const i = opts.indexOf(c[k]);
      if (['ArrowRight', 'ArrowUp'].includes(e.key) && i < n - 1) { e.preventDefault(); set(k, opts[i + 1]); }
      if (['ArrowLeft', 'ArrowDown'].includes(e.key) && i > 0) { e.preventDefault(); set(k, opts[i - 1]); }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set(k, opts[(i + 1) % n]); }
    };
  }
  // The key follows the pointer and lands on the hook or in the pot, whichever it's let go over. A tap on the key
  // moves it to the other place.
  function wireKey(key, x, c, set) {
    let st = null;
    const s = () => +(x.dataset.s || 1);
    const over = e => [...x.querySelectorAll('.kw-slot')].find(el => { const b = el.getBoundingClientRect(), m = 14; return e.clientX >= b.left - m && e.clientX <= b.right + m && e.clientY >= b.top - m && e.clientY <= b.bottom + m; });
    key.addEventListener('pointerdown', e => { st = { x: e.clientX, y: e.clientY, moved: false }; try { key.setPointerCapture(e.pointerId); } catch (er) { /* ignore */ } });
    key.addEventListener('pointermove', e => {
      if (!st) return;
      const dx = e.clientX - st.x, dy = e.clientY - st.y;
      if (!st.moved && Math.hypot(dx, dy) < 5) return;
      st.moved = true;
      key.classList.add('drag');
      key.style.transform = `translate(${dx / s()}px, ${dy / s()}px) rotate(-14deg)`;
      const o = over(e);
      x.querySelectorAll('.kw-slot').forEach(el => el.classList.toggle('over', el === o));
    });
    key.addEventListener('pointerup', e => {
      if (!st) return;
      const moved = st.moved; st = null;
      key.classList.remove('drag'); key.style.transform = '';
      const to = over(e);
      x.querySelectorAll('.kw-slot').forEach(el => el.classList.remove('over'));
      if (moved) { if (to && to.dataset.v !== c.prep) set('prep', to.dataset.v); }
      else set('prep', c.prep === 'outside' ? 'inside' : 'outside');
    });
    key.addEventListener('pointercancel', () => { st = null; key.classList.remove('drag'); key.style.transform = ''; });
    key.onclick = e => e.preventDefault();
    key.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); set('prep', c.prep === 'outside' ? 'inside' : 'outside'); } };
  }

  // ---- A firing, played out ----
  // Each try's time on screen: its seconds at about a quarter-second each, between 0.3 and 1.3 s, and the whole
  // firing squeezed to about 7 seconds when it runs longer.
  KS.timeline = function (r) {
    const steps = [];
    let T = 0, i = 0;
    const vis = a => Math.max(300, Math.min(1300, a.d * 260));
    while (i < r.plates.length) {
      const p0 = r.plates[i];
      if (p0.burst) {
        let end = T;
        for (; i < r.plates.length && r.plates[i].burst && r.plates[i].g === p0.g; i++) {
          const p = r.plates[i]; let t = T;
          p.att.forEach((a, j) => { steps.push({ p: i, b: p.cook, t, v: vis(a), a, j, last: j === p.att.length - 1 }); t += vis(a) + 120; });
          end = Math.max(end, t);
        }
        T = end + 80;
      } else {
        const p = r.plates[i];
        p.att.forEach((a, j) => { steps.push({ p: i, b: p.cook, t: T, v: vis(a), a, j, last: j === p.att.length - 1 }); T += vis(a) + 120; });
        i++;
      }
    }
    const k = T > 7000 ? 7000 / T : 1;
    steps.forEach(s => { s.t *= k; s.v *= k; });
    return { steps, total: T * k };
  };
  KS.play = function (root, r, done) {
    const x = root.querySelector('.kw-world');
    let over = false;
    const timers = [];
    const finish = () => {
      if (over) return; over = true;
      timers.forEach(clearTimeout);
      document.querySelectorAll('.kw-flying').forEach(el => el.remove());
      if (x) {
        x.querySelectorAll('[data-pl]').forEach(el => el.classList.remove('kw-wait'));
        x.querySelectorAll('.kw-tk').forEach(el => { el.classList.remove('on'); el.classList.add('done'); });
        x.querySelectorAll('.kw-br').forEach(b => b.classList.remove('lighting', 'cooking', 'smoke'));
        x.classList.remove('firing');
      }
      done && done();
    };
    if (!x || !r || r.refused || reduced()) { setTimeout(finish, 0); return finish; }
    x.classList.add('firing');
    x.querySelectorAll('[data-pl]').forEach(el => el.classList.add('kw-wait'));
    const tl = KS.timeline(r);
    tl.steps.forEach(s => {
      timers.push(setTimeout(() => {
        const b = x.querySelector(`.kw-br[data-b="${s.b}"]`), tk = x.querySelector(`.kw-tk[data-tk="${s.p}"]`), bt = b && b.querySelector('.kw-bt');
        if (tk) tk.classList.add('on');
        if (!b) return;
        b.classList.remove('smoke');
        const cold = s.a.init > 0 && s.j === 0;
        const initMs = cold ? Math.min(s.v * 0.7, s.v * (s.a.init / Math.max(s.a.d, 0.01))) : 0;
        if (cold) { b.classList.add('lighting'); if (bt) bt.textContent = '❄ cold start'; }
        else if (bt) bt.textContent = s.j ? `↻ try ${s.j + 1}` : 'warm';
        timers.push(setTimeout(() => { b.classList.remove('lighting'); b.classList.add('lit', 'cooking'); }, initMs));
        timers.push(setTimeout(() => {
          b.classList.remove('cooking');
          if (s.a.timedOut) { b.classList.add('smoke'); if (bt) bt.textContent = '⏱ timed out'; }
          else if (bt) bt.textContent = `${s.a.d} s`;
          if (s.last) land(s.p, b, tk);
        }, s.v));
      }, s.t));
    });
    timers.push(setTimeout(finish, tl.total + 700));
    function land(i, b, tk) {
      const slot = x.querySelector(`[data-pl="${i}"]`);
      if (tk) { tk.classList.remove('on'); tk.classList.add('done'); }
      if (!slot) return;
      const from = b.getBoundingClientRect(), to = slot.getBoundingClientRect();
      const g = slot.cloneNode(true);
      g.classList.remove('kw-wait'); g.classList.add('kw-flying');
      const fx = from.left + from.width / 2 - to.width / 2, fy = from.top;
      g.style.cssText = `position:fixed;left:${fx}px;top:${fy}px;width:${to.width}px;height:${to.height}px;margin:0;z-index:50;`;
      document.body.appendChild(g);
      const an = g.animate([{ transform: 'translate(0,0) scale(.7)' }, { transform: `translate(${to.left - fx}px, ${to.top - fy}px) scale(1)` }], { duration: 440, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'forwards' });
      an.onfinish = () => { g.remove(); slot.classList.remove('kw-wait'); };
    }
    return finish;
  };

  const css = document.createElement('style');
  css.textContent = `
    .kw-stage { position: relative; overflow: hidden; width: 100%; height: 100%; background: #1a1210; touch-action: manipulation; display: flex; flex-direction: column; }
    .kw-view { position: relative; flex: 1; min-height: 0; overflow: hidden; }
    .kw-world { position: absolute; left: 0; top: 0; transform-origin: 0 0; transition: none !important; }
    .kw-bg { position: absolute; inset: 0; width: 100%; height: 100%; user-select: none; }
    .kw-sp, .kw-thing { position: absolute; }
    .kw-thing { display: block; padding: 0; margin: 0; border: 0 !important; background: none !important; box-shadow: none !important; min-height: 0; color: inherit; border-radius: 0; }
    .kw-thing > img, .kw-rot > img { display: block; width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 6px 6px rgba(0,0,0,.45)); user-select: none; }
    button.kw-thing { cursor: pointer; }
    .kw-world.live button.kw-thing:not(.kw-slot) > img, .kw-world.live button.kw-thing .kw-rot > img { filter: drop-shadow(0 0 6px rgba(255, 212, 90, .75)) drop-shadow(0 6px 6px rgba(0,0,0,.45)); }
    .kw-world.live button.kw-thing:hover > img, .kw-world.live button.kw-thing:focus-visible > img { filter: drop-shadow(0 0 12px rgba(255, 212, 90, 1)) drop-shadow(0 6px 6px rgba(0,0,0,.45)); }
    button.kw-thing:focus-visible { outline: 4px solid #ffd45a; outline-offset: 4px; }
    .kw-thing.fixed { cursor: default; }
    .kw-rot { position: absolute; inset: 0; display: block; transform: rotate(var(--a)); transition: transform .25s cubic-bezier(.3,1.4,.5,1); }
    .kw-needle { position: absolute; left: 50%; top: 36%; width: 6%; height: 30%; margin-left: -3%; border-radius: 3px; background: #9e2a24; transform-origin: 50% 85%; transform: rotate(var(--a)); transition: transform .25s cubic-bezier(.3,1.4,.5,1); box-shadow: 0 0 0 2px rgba(60,20,10,.4); }
    .kw-needle::after { content: ''; position: absolute; left: 50%; bottom: 8%; width: 220%; height: 0; padding-bottom: 220%; margin-left: -110%; border-radius: 50%; background: #3a2a18; }
    .kw-chalk { position: absolute; left: 50%; top: 100%; transform: translate(-50%, 4px); padding: 2px 10px; border-radius: 6px; background: rgba(20, 16, 14, .82); color: #ffe7a8; font: 700 20px/1.2 var(--f-body, system-ui); white-space: nowrap; pointer-events: none; box-shadow: 0 2px 0 rgba(0,0,0,.4); }
    [data-layout="tall"] .kw-chalk { font-size: 26px; }
    .kw-keyl { transform: none; left: auto; top: auto; font-size: 16px; }
    [data-layout="tall"] .kw-keyl { font-size: 22px; }
    .hot > .kw-chalk, .kw-thing.hot .kw-chalk { animation: kwHot 1.1s ease-out; }
    @keyframes kwHot { from { background: #ffd45a; color: #2a1a06; transform: translate(-50%, 4px) scale(1.25); } }
    .kw-key { z-index: 4; touch-action: none; cursor: grab; transition: left .3s, top .3s; }
    .kw-key.in { transform: rotate(28deg); }
    .kw-key.drag { cursor: grabbing; z-index: 60; transition: none; }
    .kw-slot.over > img { filter: drop-shadow(0 0 14px #ffd45a) !important; }
    .kw-tag { position: absolute; right: -6%; top: -30%; width: 34%; transform: rotate(10deg); }
    .kw-tag img { width: 40%; display: block; margin: 0 auto; }
    .kw-tag i { position: absolute; left: -40%; right: -40%; top: 52%; padding: 2px 4px; border-radius: 4px; background: #fbf4e3; color: #2a1a06; font: 700 15px/1.15 ui-monospace, monospace; font-style: normal; text-align: center; box-shadow: 0 2px 0 rgba(0,0,0,.4); }
    .kw-label { position: absolute; left: 6%; right: 6%; top: 46%; padding: 3px 2px; border-radius: 4px; background: #2b2b2b; color: #eee; font: 700 12px/1.1 ui-monospace, monospace; font-style: normal; text-align: center; letter-spacing: -.04em; }
    .kw-label.brass { background: linear-gradient(#f2d478, #b8923a); color: #2a1a06; }
    [data-layout="tall"] .kw-label { font-size: 10px; }
    .kw-hat { position: absolute; width: 17%; transform: translate(-10%, -60%); filter: drop-shadow(0 3px 3px rgba(0,0,0,.4)); }
    .kw-signs { position: absolute; left: 0; right: 0; top: 112%; display: flex; justify-content: space-between; }
    .kw-signs i { padding: 2px 8px; border-radius: 5px; background: rgba(20,16,14,.8); color: #bbb; font: 700 16px ui-monospace, monospace; font-style: normal; }
    .kw-signs i.on { background: #ffd45a; color: #2a1a06; }
    .kw-crate.none { border: 4px dashed rgba(255, 230, 190, .5) !important; border-radius: 12px; }
    .kw-crate .kw-chalk { top: 100%; }
    .kw-kept { position: absolute; left: 10%; right: 10%; top: 8%; display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; margin: 0; padding: 0; list-style: none; }
    .kw-kept .kw-plate { width: 40%; }
    .kw-tks { position: absolute; display: flex; flex-wrap: wrap; align-content: flex-start; gap: 6px 14px; }
    .kw-clip { display: inline-flex; gap: 3px; }
    .kw-clip.burst { padding: 2px 4px; border-radius: 8px; box-shadow: 0 0 0 3px rgba(255, 212, 90, .55); }
    .kw-tk { position: relative; display: inline-block; width: 30px; height: 52px; transition: transform .2s, opacity .3s; }
    [data-layout="tall"] .kw-tk { width: 26px; height: 46px; } [data-layout="tall"] .kw-tks { gap: 4px 10px; } [data-layout="tall"] .kw-clip { gap: 2px; }
    .kw-tk img { width: 100%; height: 100%; filter: drop-shadow(0 3px 3px rgba(0,0,0,.4)); }
    .kw-tk .kx-gi { position: absolute; left: 22%; top: 40%; width: 56%; height: 34%; fill: #3a2a18; }
    .kw-tk.s3 .kx-gi { fill: #2a4360; } .kw-tk.stuck .kx-gi { fill: #9e3a34; }
    .kw-tk b { position: absolute; right: 8%; bottom: 6%; font-size: 12px; color: #9e3a34; }
    .kw-tk.on { transform: translateY(8px) rotate(-8deg); filter: drop-shadow(0 0 8px #ffd45a); }
    .kw-tk.done { opacity: .25; }
    .kw-br { position: absolute; }
    .kw-br img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 6px 6px rgba(0,0,0,.5)); transition: opacity .35s; }
    .kw-on { opacity: 0; }
    .kw-br.lit .kw-on, .kw-br.lighting .kw-on { opacity: 1; } .kw-br.lit .kw-off { opacity: 0; }
    .kw-br.lighting .kw-on { animation: kwLight .45s ease-in-out infinite alternate; }
    @keyframes kwLight { from { opacity: .15; } to { opacity: .9; } }
    .kw-br.cooking .kw-on { animation: kwBubble .5s ease-in-out infinite alternate; }
    @keyframes kwBubble { to { transform: translateY(-2%) scale(1.02); } }
    .kw-br.lit .kw-on { filter: drop-shadow(0 0 16px rgba(255, 150, 50, .8)) drop-shadow(0 6px 6px rgba(0,0,0,.5)); }
    .kw-br.smoke .kw-on { filter: grayscale(.8) brightness(.7); }
    .kw-smoke { position: absolute; left: 20%; top: -40%; width: 60%; height: 60%; border-radius: 50%; background: radial-gradient(circle, rgba(210,210,210,.85), rgba(210,210,210,0) 70%); opacity: 0; }
    .kw-br.smoke .kw-smoke { animation: kwSmoke .8s ease-out infinite; }
    @keyframes kwSmoke { from { transform: translateY(20%) scale(.6); opacity: .9; } to { transform: translateY(-40%) scale(1.4); opacity: 0; } }
    .kw-bt { position: absolute; left: 50%; bottom: 100%; transform: translateX(-50%); padding: 1px 6px; border-radius: 5px; background: rgba(20,16,14,.8); color: #ffe7a8; font: 700 15px var(--f-body, system-ui); white-space: nowrap; }
    .kw-bt:empty { display: none; }
    [data-layout="tall"] .kw-bt { font-size: 20px; }
    .kw-plates { position: absolute; display: flex; flex-wrap: wrap; align-content: flex-end; justify-content: center; gap: 2px 4px; margin: 0; padding: 0; list-style: none; }
    .kw-plate { position: relative; width: 50px; display: flex; flex-direction: column; align-items: center; }
    [data-layout="tall"] .kw-plates .kw-plate { width: 58px; } [data-layout="tall"] .kw-plates { align-content: flex-start; }
    .kw-plate img { width: 100%; filter: drop-shadow(0 3px 3px rgba(0,0,0,.5)); }
    .kw-stamp { position: absolute; left: 50%; top: 4%; transform: translateX(-50%) rotate(-10deg); padding: 0 5px; border-radius: 5px; font: 900 18px/1.2 var(--f-head, serif); color: #fff; background: #2f7a3a; box-shadow: 0 2px 0 rgba(0,0,0,.4); }
    .kw-plate.warn .kw-stamp { background: #c0892a; } .kw-plate.bad .kw-stamp { background: #9e3a34; } .kw-plate.keep .kw-stamp { background: #2a4360; }
    .kw-pd { font: 700 12px var(--f-body, system-ui); color: #fff3da; text-shadow: 0 1px 2px #000, 0 0 4px #000; white-space: nowrap; }
    [data-layout="tall"] .kw-stamp { font-size: 24px; } [data-layout="tall"] .kw-pd { display: none; }
    /* A phone: only the things this order lets you change carry a label; the rest stay in the picture unlabelled, and
       each live thing gets a finger-sized tap area around it. Brazier notes show only while the stove fires. */
    [data-layout="tall"] :is(.kw-thing.fixed .kw-chalk, .kw-keyl.fixed, .kw-signs:not(button .kw-signs)) { display: none; }
    [data-layout="tall"] .kw-thing.fixed > img { opacity: .9; }
    [data-layout="tall"] button.kw-thing::after { content: ''; position: absolute; left: 50%; top: 50%; width: max(100%, 100px); height: max(100%, 100px); transform: translate(-50%, -50%); }
    [data-layout="tall"] .kw-world:not(.firing) .kw-bt { display: none; }
    [data-layout="tall"] .kw-plates .kw-plate { cursor: pointer; }
    .kw-tip { position: absolute; left: 8px; right: 8px; bottom: 8px; z-index: 12; margin: 0; padding: 6px 10px; border-radius: 8px; background: rgba(20, 16, 14, .9); color: #ffe7a8; font: 600 14px/1.3 var(--f-body, system-ui); }
    .kw-tip[hidden] { display: none; }
    .kw-plate.kw-wait { visibility: hidden; }
    .kw-flying .sr { display: none; }
    .kw-book { position: absolute; border: 0 !important; background: none !important; box-shadow: none !important; padding: 0; border-radius: 12px; cursor: pointer; display: flex; align-items: flex-start; justify-content: center; }
    .kw-book span { display: inline-flex; gap: 6px; align-items: center; margin-top: 40%; padding: 3px 10px; border-radius: 999px; background: rgba(20,16,14,.75); color: #ffe7a8; font: 700 16px var(--f-body, system-ui); }
    [data-layout="tall"] .kw-book span { font-size: 22px; margin-top: 18%; }
    .kw-book:hover span, .kw-book:focus-visible span { background: #ffd45a; color: #2a1a06; }
    .kw-book .kx-gi { width: 1.2em; height: 1.2em; fill: currentColor; }
    .kw-wrote { position: absolute; z-index: 6; margin: 0; padding: 6px 12px; border-radius: 6px; background: #fbf4e3; color: #2a1a06; font: 700 18px/1.3 ui-monospace, monospace; box-shadow: 0 4px 10px rgba(0,0,0,.5); pointer-events: none; animation: kwWrote 2.6s ease-out forwards; }
    [data-layout="tall"] .kw-wrote { font-size: 22px; }
    @keyframes kwWrote { 0% { opacity: 0; transform: translateY(20px); } 12% { opacity: 1; transform: none; } 75% { opacity: 1; } 100% { opacity: 0; transform: translateY(-30px); } }
    .kw-mira { position: absolute; z-index: 3; pointer-events: none; filter: drop-shadow(0 10px 14px rgba(0,0,0,.6)); transform-origin: 50% 100%; animation: kwBreathe 3.8s ease-in-out infinite; }
    @keyframes kwBreathe { 50% { transform: scale(1.006, 1.012); } }
    .kw-say { position: relative; z-index: 7; flex: 0 0 auto; display: flex; font-size: 15px; }
    .kw-say > div { flex: 1; min-width: 0; max-height: 100%; overflow: auto; padding: 8px 12px; background: #fbf5e3; color: #2a2018; line-height: 1.35; box-shadow: 0 6px 14px rgba(0,0,0,.5); }
    [data-layout="tall"] > .kw-say { max-height: 27%; border-bottom: 3px solid #2a2018; }
    [data-layout="tall"] > .kw-say::after { content: ''; position: absolute; right: 22%; bottom: -15px; border: 12px solid transparent; border-top-color: #2a2018; border-bottom: 0; }
    [data-layout="wide"] > .kw-say { position: absolute; }
    [data-layout="wide"] > .kw-say > div { border-radius: 16px; border: 3px solid #2a2018; }
    [data-layout="wide"] > .kw-say::after { content: ''; position: absolute; right: -16px; top: 46%; border: 12px solid transparent; border-left-color: #2a2018; border-right: 0; }
    .kw-say p { margin: 0 0 .35em; } .kw-say p:last-child { margin: 0; }
    .kw-say .kw-who { font-weight: 800; }
    .kw-say small { display: block; font-size: .87em; opacity: .9; margin-top: .2em; }
    @media (min-width: 1500px) { .kw-say { font-size: 17px; } }
    @media (prefers-reduced-motion: reduce) { .kw-mira, .kw-br.lighting .kw-on, .kw-br.cooking .kw-on, .kw-br.smoke .kw-smoke, .kw-wrote { animation: none; } }`;
  document.head.appendChild(css);
})();
