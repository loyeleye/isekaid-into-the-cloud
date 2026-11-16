// The Fire Drill's living war room (storyboard approved by Ladi, Nov 16: project files
// game-modes/multiplayer-real/storyboard). Ladi: "draw full sized characters in the setting", "you are just making
// fancier versions of the same menu". The room is the screen:
//   - A painted plate (assets/img/drill/room.webp): the four leads stand behind one long counter in the request path's
//     order, Seo-yeon (the Gate), Mira (the Queue), Kai (the Function), Dutch (the Store). Callers come in from the
//     left edge. Each lead is the button for their station.
//   - Under each lead, on the counter's front: a brass plaque (the station and its X-Ray status), its live gauge, and
//     what the lead says after a run. A ring on the counter top in the trace map's colour.
//   - Runs play out on the counter: orders slide left to right, 429s bounce back off the left edge, failures pop over
//     the lead where they happen (a grey "?" where X-Ray isn't on).
//   - Uptima sits on the counter between Mira and Kai, blinking, with an emote over her head when things go wrong
//     or right. Her lines are cutscenes (js/mode-drill.js), where she stands full size with blink and talk frames.
//   - Tap a lead and the camera pushes in on them while their desk (the station console) slides up.
// The rules are js/drill-core.js; the gauges, events and flights are shared with js/drill-board.js.
(function () {
  if (!SD.drill || !SD.drillBoard) return;
  const D = SD.drill, U = SD.ui, BD = SD.drillBoard;
  const esc = s => U.esc(String(s == null ? '' : s));
  const R = SD.drillRoom = { STEP_MS: 280 };
  // Where things are on the plate, as % of its width (x) and height (y).
  const X = { callers: -2, gate: 9, queue: 33, fn: 62, store: 85 };
  const HIT = { gate: [0, 20], queue: [20, 41], fn: [52, 73], store: [73, 100] };
  const COUNTER = 66, CHEST = 38;
  const STATUS = { ok: 'OK', error: 'Error 4xx', fault: 'Fault 5xx', throttle: 'Throttle 429', dark: 'Not traced', off: 'Off this path' };
  const env = k => `assets/img/ic-live/${k}.webp`;
  R.pose = (p, cls) => `<span class="up-fig${cls ? ' ' + cls : ''}" data-pose="${p}">
    <img class="up-b" src="assets/img/drill/uptima-${p}.webp" alt="" draggable="false">
    <img class="up-k" src="assets/img/drill/uptima-${p}-blink.webp" alt="" draggable="false" onerror="this.remove()">
    <img class="up-t" src="assets/img/drill/uptima-${p}-talk.webp" alt="" draggable="false" onerror="this.remove()"></span>`;
  R.setPose = (fig, p) => {
    if (!fig) return;
    fig.dataset.pose = p;
    fig.querySelector('.up-b').src = `assets/img/drill/uptima-${p}.webp`;
    ['k', 't'].forEach((c, i) => { const im = fig.querySelector('.up-' + c); if (im) im.src = `assets/img/drill/uptima-${p}-${i ? 'talk' : 'blink'}.webp`; });
  };

  // Layers, back to front (Ladi, Nov 16: "placed behind them in the background, and when she talks the four leads
  // become semi-transparent and out of focus"): the empty room, Uptima standing behind the counter at the leads'
  // scale, then the front: the plate (or its living clips) with a hole cut where she stands, so the leads and the
  // counter stay in front of her. While she talks (.rm.talk) the front fades and blurs and she stays sharp.
  // Until the empty room exists (R.back false), she stands in front of the plate, cut off at the counter top.
  R.back = false;
  R.IDLE_POSE = 'smug';
  R.layers = pose => `<img class="rm-back" src="assets/img/drill/room-empty.webp" alt="" draggable="false" aria-hidden="true">
        <div class="rm-up" aria-hidden="true">${R.pose(pose, 'blinks')}<span class="rm-emote"></span></div>
        <div class="rm-front"><img class="rm-plate" src="assets/img/drill/room.webp" alt="The war room: Seo-yeon, Mira, Kai and Dutch behind the counter" draggable="false">
        <div class="rm-vslot" aria-hidden="true"></div></div>`;
  // A bare room for Uptima's lines: no stations or gauges, the leads faded behind her.
  R.scene = pose => `<div class="rm talk scene${R.back ? '' : ' noback'}" aria-hidden="true"><div class="rm-cam">${R.layers(pose)}</div></div>`;
  // The room. o: { at, zoom, notes: [[station, who, text]], lines: [[who, text]], m, play }
  R.html = function (f, e, o) {
    o = o || {};
    const d = D.DRILLS[f.drill], path = BD.path(f.drill);
    const by = {};
    (o.lines || []).forEach(([w, t]) => { (by[w] = by[w] || []).push(t); });
    const notes = {};
    (o.notes || []).forEach(n => { (notes[n[0]] = notes[n[0]] || []).push(n); });
    const sts = D.ORDER.map(k => {
      const s = D.STATIONS[k], on = path.includes(k), st = on ? (e.nodes[k] || 'dark') : 'off';
      const [a, b] = HIT[k];
      const bad = o.m && BD.TROUBLE[s.who] && BD.TROUBLE[s.who](o.m);
      const say = by[s.who] ? `<p class="rm-say${bad ? ' bad' : ''}" data-vo="${esc(s.who + '|' + by[s.who][0])}"><b>${esc(D.NAMES[s.who])}</b> ${by[s.who].map(esc).join(' ')}</p>` : '';
      const note = (notes[k] || []).map(([, who, text]) => `<p class="rm-note" data-vo="${esc(who + '|' + text)}"><b>${esc(D.NAMES[who] || who)}</b> ${esc(text)}</p>`).join('');
      return `<button class="rm-st st-${st}${k === o.at ? ' at' : ''}" data-at="${k}" data-st="${k}" style="left:${a}%;width:${b - a}%" aria-pressed="${k === o.at}"
          aria-label="${esc(D.NAMES[s.who])}: ${esc(s.name)}, ${esc(s.svc)}. ${esc(STATUS[st])}"><span class="rm-ring"></span><span class="rm-fx"></span></button>
        <div class="rm-col st-${st}${k === o.at ? ' at' : ''}" data-col="${k}" style="--x:${X[k]}%">
          <span class="rm-plq"><b>${esc(s.name)}</b><span>${esc(s.svc)}</span><i>${esc(STATUS[st])}</i></span>
          ${on ? `<span class="rm-g db-g-${k}">${BD.gauge(f, k, null, e.m)}</span>` : ''}
          ${note}${say}</div>`;
    }).join('');
    return `<div class="rm${R.back ? '' : ' noback'}${o.zoom ? ' zoom' : ''}${o.play ? ' playing' : ''}" data-path="${d.path}" role="group" aria-label="The war room" style="--zx:${X[o.at] || 50}%">
      <div class="rm-cam">
        ${R.layers(R.IDLE_POSE)}
        ${sts}
        <div class="rm-fly" aria-hidden="true"></div>
      </div>
      <div class="rm-callers"><span class="db-g-callers">${BD.gaugeCallers(e.m)}</span></div>
      <div class="rm-clock" aria-hidden="true"><span class="rm-tick"></span></div></div>
      ${Object.keys(by).length || (o.notes || []).length ? `<div class="rm-chat" aria-live="polite">${(o.notes || []).map(([, who, text]) => `<p class="rm-note" data-vo="${esc(who + '|' + text)}"><b>${esc(D.NAMES[who] || who)}</b> ${esc(text)}</p>`).join('')}${Object.keys(by).map(w => `<p class="rm-say${o.m && BD.TROUBLE[w] && BD.TROUBLE[w](o.m) ? ' bad' : ''}" data-vo="${esc(w + '|' + by[w][0])}"><b>${esc(D.NAMES[w] || w)}</b> ${by[w].map(esc).join(' ')}</p>`).join('')}</div>` : ''}`;
  };
  // ---- The living plate: Sogni clips over the painted room ----
  // One stage element lives across re-renders (mount() moves it into each new room, so a clip keeps playing).
  // Idle takes play back to back in random order; alarm / clear / slump fade in over them, hold their last
  // frame a moment, then fade back to idle. The clips frame the plate's middle 1880 of 1920 px, full height.
  const VID = 'assets/video/drill/', IDLES = ['idle-a', 'idle-b'], HOLD = { alarm: 600, clear: 2600, slump: 2600 };
  let stage = null, lastKey = null, moodT = 0;
  const still = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ||
    (navigator.connection && navigator.connection.saveData);
  function vEl(cls) {
    const v = document.createElement('video');
    v.className = cls; v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', '');
    v.setAttribute('muted', ''); v.preload = 'auto'; v.disablePictureInPicture = true;
    v.addEventListener('playing', () => v.classList.add('on'));
    return v;
  }
  function nextIdle(v) {
    const cur = v.dataset.clip, other = IDLES.filter(c => c !== cur);
    v.dataset.clip = !cur ? IDLES[(Math.random() * IDLES.length) | 0] : Math.random() < .65 ? other[(Math.random() * other.length) | 0] : cur;
    v.src = VID + v.dataset.clip + '.mp4';
    v.play().catch(() => {});
  }
  function makeStage() {
    const st = document.createElement('div'); st.className = 'rm-vid';
    const idle = vEl('rm-v-idle'), mood = vEl('rm-v-mood');
    idle.addEventListener('ended', () => nextIdle(idle));
    mood.addEventListener('ended', () => {
      clearTimeout(moodT);
      moodT = setTimeout(() => { mood.classList.remove('on'); }, HOLD[mood.dataset.clip] || 1500);
    });
    st.append(idle, mood);
    nextIdle(idle);
    return st;
  }
  // Put the living plate into a freshly drawn room. key: changes when a new drill starts (plays the alarm).
  R.mount = function (root, key) {
    const slot = root && root.querySelector('.rm-vslot');
    if (!slot || still()) return;
    if (!stage) stage = makeStage();
    slot.replaceWith(stage);
    const idle = stage.querySelector('.rm-v-idle');
    if (idle.paused) idle.play().catch(() => {});
    if (key != null && key !== lastKey) { lastKey = key; R.mood('alarm'); }
  };
  // Play a one-shot clip over idle: 'alarm' | 'clear' | 'slump'.
  R.mood = function (clip) {
    if (!stage || !document.body.contains(stage)) return;
    const mood = stage.querySelector('.rm-v-mood');
    clearTimeout(moodT);
    mood.classList.remove('on');
    mood.dataset.clip = clip; mood.src = VID + clip + '.mp4';
    mood.play().catch(() => {});
  };

  // Uptima's reaction on the counter: '!' when it goes wrong, sparkles when it holds.
  R.emote = (root, kind) => {
    const em = root && root.querySelector('.rm-emote');
    if (!em) return;
    em.className = 'rm-emote ' + kind; em.textContent = { bad: '💦', good: '✨', wow: '❗' }[kind] || '';
    void em.offsetWidth; em.classList.add('go');
  };

  // ---- Playback: the run's frames on the counter ----
  R.play = async function (root, f, frames, opts) {
    opts = opts || {};
    const room = root.querySelector('.rm');
    if (!room || !frames || !frames.length) return;
    const fly = room.querySelector('.rm-fly'), tick = room.querySelector('.rm-tick');
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    let skip = false, hurt = 0;
    opts.skipBtn && (opts.skipBtn.onclick = () => { skip = true; });
    let gave = 0, done = 0;
    for (let i = 0; i < frames.length; i++) {
      if (opts.gone && opts.gone()) return;
      const fr = frames[i];
      gave += fr.d.gaveUp | 0;
      done += (fr.d.wcuUsed | 0) - (fr.d.dupes | 0);
      fr.gave = gave; fr.done = Math.max(0, done);
      if (skip) continue;
      tick.textContent = `${(fr.t + 1) * D.TICK_S}s${fr.t >= D.TICKS ? ' · draining' : ''}`;
      const cc = room.querySelector('.db-g-callers'); if (cc) cc.innerHTML = BD.gaugeCallers(null, fr);
      D.ORDER.forEach(k => { const g = room.querySelector('.rm-g.db-g-' + k); if (g) g.innerHTML = BD.gauge(f, k, fr, null); });
      if (!reduce) BD.flights(f, fr).forEach(([a, b, n, kind]) => launch(room, fly, a, b, Math.min(n, 5), kind));
      const ev = BD.events(f, fr);
      ev.forEach(([k, label, st]) => burst(room, k, label, opts.traced && opts.traced[k] ? st : 'dark'));
      const bad = ev.some(x => x[2] !== 'ok');
      if (bad && ++hurt % 4 === 1) R.emote(room, 'bad');
      if (opts.onTick) opts.onTick(fr, i);
      await new Promise(r => setTimeout(r, R.STEP_MS));
    }
    tick.textContent = '';
  };
  function pt(room, k, y) {
    const r = room.querySelector('.rm-cam').getBoundingClientRect(), b = room.getBoundingClientRect();
    return { x: r.left - b.left + r.width * X[k] / 100, y: r.top - b.top + r.height * y / 100 };
  }
  function launch(room, fly, a, b, n, kind) {
    const p = pt(room, a, COUNTER - 4), q = pt(room, b, COUNTER - 4);
    const w = room.clientWidth / 40;
    for (let j = 0; j < n; j++) {
      const e = document.createElement('img');
      e.src = env(kind); e.className = 'rm-flyer'; e.alt = '';
      const dy = -j * w * .35, lift = kind === 'env-429' ? -w * 2.2 : -w * .8;
      e.style.width = w + 'px';
      e.style.transform = `translate(${p.x - w / 2}px, ${p.y - w + dy}px)`;
      e.style.transitionDelay = (j * 36) + 'ms';
      fly.appendChild(e);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        e.style.transform = `translate(${q.x - w / 2}px, ${q.y - w + dy + (kind === 'env-429' ? lift : 0)}px) rotate(${kind === 'env-429' ? -25 : 0}deg)`;
        e.style.opacity = '1';
      }));
      setTimeout(() => e.remove(), R.STEP_MS + 300 + j * 36);
    }
  }
  function burst(room, k, label, st) {
    const box = room.querySelector(`.rm-st[data-st="${k}"] .rm-fx`);
    if (!box) return;
    const e = document.createElement('span');
    e.className = 'db-pop st-' + st;
    e.textContent = st === 'dark' ? '?' : label;
    box.appendChild(e);
    const s = room.querySelector(`.rm-st[data-st="${k}"]`); if (s) { s.classList.remove('hit'); void s.offsetWidth; s.classList.add('hit'); }
    setTimeout(() => e.remove(), 900);
  }

  const css = document.createElement('style');
  css.textContent = `
    .rm { position: relative; width: 100%; aspect-ratio: 1920 / 1072; overflow: hidden; border-radius: 12px; background: #120e0a;
      box-shadow: 0 10px 30px rgba(0, 0, 0, .55); container-type: inline-size; }
    .rm-cam { position: absolute; inset: 0; transform-origin: var(--zx) 34%; transition: transform .55s cubic-bezier(.3, .1, .2, 1); }
    .rm.zoom .rm-cam { transform: scale(1.75); }
    .rm-plate { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; user-select: none; pointer-events: none; }
    .rm-vid { position: absolute; top: 0; bottom: 0; left: 1.0417%; width: 97.9167%; pointer-events: none;
      -webkit-mask-image: linear-gradient(90deg, transparent, #000 1.2%, #000 98.8%, transparent); mask-image: linear-gradient(90deg, transparent, #000 1.2%, #000 98.8%, transparent); }
    .rm-vid video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; opacity: 0; transition: opacity .7s ease; }
    .rm-vid video.on { opacity: 1; }
    .rm-vid .rm-v-mood { transition-duration: .35s; }
    .rm-st { position: absolute; top: 4%; height: ${COUNTER - 2}%; padding: 0; margin: 0; border: 0; border-radius: 40% 40% 8px 8px; background: transparent;
      cursor: pointer; box-shadow: none; z-index: 3; }
    .rm-st:hover, .rm-st:focus-visible { background: radial-gradient(60% 55% at 50% 45%, rgba(255, 236, 170, .16), transparent 70%); outline: none; }
    .rm-st:focus-visible .rm-ring { box-shadow: 0 0 0 3px #f3d36b; }
    .rm-ring { position: absolute; left: 12%; right: 12%; bottom: -2.2%; height: 7%; border-radius: 50%; border: .35cqi solid #8d93a8;
      filter: drop-shadow(0 0 .6cqi currentColor); color: #8d93a8; pointer-events: none; }
    .rm-st.st-ok .rm-ring { border-color: #5fb36b; color: #5fb36b; } .rm-st.st-error .rm-ring { border-color: #e0c341; color: #e0c341; }
    .rm-st.st-fault .rm-ring { border-color: #e0574b; color: #e0574b; } .rm-st.st-throttle .rm-ring { border-color: #a46be0; color: #a46be0; }
    .rm-st.st-dark .rm-ring { border-style: dashed; } .rm-st.st-off .rm-ring { opacity: .35; border-style: dotted; }
    .rm-st.at .rm-ring { box-shadow: 0 0 0 .3cqi #f3d36b, 0 0 1.4cqi rgba(243, 211, 107, .6); }
    .rm-st.st-off { filter: none; }
    .rm-st.hit { animation: rmhit .35s ease-out; }
    @keyframes rmhit { 30% { transform: translateY(-.5%); } }
    .rm-fx { position: absolute; left: 0; right: 0; top: ${CHEST - 12}%; display: flex; flex-direction: column; align-items: center; pointer-events: none; z-index: 6; }
    .rm .db-pop { font-size: max(11px, 1.3cqi); }
    .rm-col { position: absolute; top: ${COUNTER + 2}%; left: var(--x); transform: translateX(-50%); width: 22%; max-width: 22%; z-index: 6;
      display: flex; flex-direction: column; align-items: center; gap: .5cqi; pointer-events: none; transition: opacity .3s; }
    .rm-col[data-col="gate"] { left: max(var(--x), 11%); } .rm-col[data-col="store"] { left: min(var(--x), 88%); }
    .rm-plq { display: flex; flex-wrap: wrap; justify-content: center; align-items: baseline; gap: 0 .6cqi; padding: .3cqi 1cqi; border-radius: .6cqi;
      background: linear-gradient(#d9b45a, #a77d2c); color: #2a1a08; border: .2cqi solid #5a3b10; box-shadow: 0 .3cqi 0 rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .4);
      font-size: max(10px, 1.15cqi); line-height: 1.15; text-align: center; }
    .rm-plq b { font-family: var(--f-head, serif); font-size: max(11px, 1.35cqi); }
    .rm-plq i { font-style: normal; font-weight: 800; width: 100%; }
    .rm-col.st-throttle .rm-plq i { color: #5b2a8f; } .rm-col.st-fault .rm-plq i { color: #8f1d14; } .rm-col.st-error .rm-plq i { color: #6b5600; } .rm-col.st-ok .rm-plq i { color: #1f5a2b; }
    .rm-col.st-off { opacity: .55; }
    .rm-g { display: flex; flex-direction: column; align-items: center; padding: .3cqi .8cqi; border-radius: .6cqi; background: rgba(14, 10, 8, .72); color: #efe6d2; min-height: 0; }
    .rm-g .db-cap, .rm-g .db-bad, .rm-g .db-dlq { font-size: max(9.5px, 1.05cqi); }
    .rm-g .db-pips i { width: max(6px, .8cqi); height: max(6px, .8cqi); } .rm-g .db-slots i { width: max(8px, 1.2cqi); height: max(6px, .7cqi); }
    .rm-g .db-stack .db-env, .rm-g .db-drawer .db-env { width: max(10px, 1.4cqi); }
    .rm-say, .rm-note { position: relative; margin: .4cqi 0 0; padding: .5cqi .9cqi; border-radius: 1cqi; background: #f6efdc; color: #17131f; border: .2cqi solid #17131f;
      font-size: max(11px, 1.3cqi); line-height: 1.3; box-shadow: 0 .3cqi 0 rgba(0, 0, 0, .4); pointer-events: none; animation: rmsay .35s ease-out both; max-width: 100%; }
    .rm-say::before, .rm-note::before { content: ''; position: absolute; top: -.9cqi; left: calc(50% - .8cqi); border: .8cqi solid transparent; border-bottom-color: #17131f; border-top: 0; }
    .rm-say b, .rm-note b { color: #6b3a1a; margin-right: .3cqi; }
    .rm-say.bad { border-color: #9e3a34; background: #fbe4dc; }
    .rm-note { background: #fff3c4; }
    @keyframes rmsay { from { transform: translateY(.8cqi) scale(.9); opacity: 0; } to { transform: none; opacity: 1; } }
    .rm-back { position: absolute; inset: 0; width: 100%; height: 100%; user-select: none; pointer-events: none; }
    .rm.noback .rm-back { display: none; }
    .rm-front { position: absolute; inset: 0; z-index: 3; transition: opacity .45s ease, filter .45s ease;
      -webkit-mask: url(assets/img/drill/room-front-mask.png) 0 0 / 100% 100%; mask: url(assets/img/drill/room-front-mask.png) 0 0 / 100% 100%; }
    .rm.noback .rm-front { -webkit-mask: none; mask: none; z-index: 1; }
    .rm.talk .rm-front { opacity: .32; filter: blur(.35cqi) saturate(.8); }
    .rm.noback.talk .rm-front { opacity: 1; filter: blur(.35cqi) brightness(.5) saturate(.8); }
    /* She stands in the gap between Mira and Kai, at their scale; the counter hides her below the waist. */
    .rm-up { position: absolute; left: 31%; top: 8%; height: 96%; aspect-ratio: .62; z-index: 2; pointer-events: none; }
    .rm.noback .rm-up { z-index: 4; clip-path: inset(0 -20% ${100 - 100 * (COUNTER + 1 - 8) / 96}% -20%); }
    .rm.noback.talk .rm-up { clip-path: none; }
    .up-fig { position: relative; display: block; width: 100%; height: 100%; }
    .up-fig img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; object-position: bottom center; user-select: none; }
    .up-fig .up-k, .up-fig .up-t { opacity: 0; }
    .up-fig.blinks .up-k { animation: upblink 4.6s steps(1, end) infinite; }
    @keyframes upblink { 0%, 93% { opacity: 0; } 94%, 97% { opacity: 1; } 98% { opacity: 0; } }
    .up-fig.talking .up-t { animation: uptalk .32s steps(1, end) infinite; }
    @keyframes uptalk { 0%, 49% { opacity: 1; } 50% { opacity: 0; } }
    .rm-up .up-fig { filter: drop-shadow(0 .8cqi .8cqi rgba(0, 0, 0, .55)); animation: upbreathe 3.8s ease-in-out infinite; transform-origin: 50% 100%; }
    @keyframes upbreathe { 50% { transform: scaleY(1.008) translateY(-.15%); } }
    .rm-emote { position: absolute; left: 40%; top: 0; font-size: 3.2cqi; opacity: 0; pointer-events: none; }
    .rm-emote.go { animation: rmemote 1.4s ease-out; }
    @keyframes rmemote { 0% { opacity: 0; transform: translateY(1cqi) scale(.6); } 15% { opacity: 1; transform: none; } 75% { opacity: 1; } 100% { opacity: 0; transform: translateY(-1cqi); } }
    .rm-fly { position: absolute; inset: 0; pointer-events: none; z-index: 6; }
    .rm-flyer { position: absolute; left: 0; top: 0; image-rendering: pixelated; opacity: .7;
      transition: transform ${R.STEP_MS + 140}ms cubic-bezier(.3, .1, .4, 1), opacity 120ms; filter: drop-shadow(0 2px 2px rgba(0, 0, 0, .6)); }
    .rm-callers { position: absolute; left: 1%; top: 2%; z-index: 7; padding: .3cqi .9cqi; border-radius: .8cqi; background: rgba(14, 10, 8, .72); color: #efe6d2;
      font-size: max(10px, 1.1cqi); }
    .rm-callers .db-g { min-height: 0; flex-direction: row; gap: .6cqi; align-items: baseline; }
    .rm-callers .db-num { font-size: max(13px, 1.8cqi); } .rm-callers .db-cap, .rm-callers .db-bad { font-size: max(10px, 1.1cqi); }
    .rm-clock { position: absolute; left: 50%; top: 2%; transform: translateX(-50%); z-index: 7; }
    .rm-tick:not(:empty) { display: inline-block; padding: .2cqi 1.2cqi; border-radius: 1cqi; background: rgba(12, 10, 16, .85); font-size: max(11px, 1.3cqi); font-weight: 800; color: #f3d36b; }
    .rm.zoom .rm-col:not(.at), .rm.zoom .rm-callers, .rm.zoom .rm-up { opacity: 0; pointer-events: none; }
    .rm.zoom .rm-col.at { opacity: 0; }
    .rm.playing .rm-st { cursor: default; }
    .rm-chat { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
    .rm .rm-note, .rm-chat .rm-say { display: none; }   /* longer notes read below the room; short lines stay in bubbles */
    .rm-chat .rm-say, .rm-chat .rm-note { font-size: 14px; padding: 6px 10px; border-width: 2px; border-radius: 10px; }
    .rm-chat .rm-say::before, .rm-chat .rm-note::before { display: none; }
    @media (max-width: 700px) {
      .rm { border-radius: 0; }
      .rm-col { width: 24%; max-width: 24%; }
      .rm .rm-say { display: none; }
      .rm-chat .rm-say { display: block; }
      .rm-plq span { display: none; }
    }
    @media (prefers-reduced-motion: reduce) { .rm-cam { transition: none; } .up-fig, .rm-up .up-fig { animation: none !important; } }`;
  document.head.appendChild(css);
})();
