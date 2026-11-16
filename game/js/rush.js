// The Rush (prototype): draws js/rush-core.js on a canvas over Ladi's Sogni room, and takes the player's hands.
// The room is the screen: tickets slide down the painted chute, sit on Mira's stools, bounce back up on a 429,
// splat into the puddle, and the tank on the wall fills. You drag tools off the toolbelt into the room while it runs.
// Only the question after the claim is a plain screen (#q).
(function () {
  const R = SD.rushCore;
  const cv = document.getElementById('rush'), cx = cv.getContext('2d'), qEl = document.getElementById('q');
  const IMG = {}, SRC = {
    'room-wide': 'assets/img/rush/room-wide.webp', 'room-tall': 'assets/img/rush/room-tall.webp',
    desk: 'assets/img/rush/desk.webp', stool: 'assets/img/rush/stool.webp', bolted: 'assets/img/rush/stool-bolted.webp',
    rack: 'assets/img/rush/rack.webp', clerk: 'assets/img/rush/nightclerk.webp', tank: 'assets/img/rush/tank.webp',
    bin: 'assets/img/rush/bin.webp', bell: 'assets/img/rush/bell.webp', puddle: 'assets/img/rush/puddle.webp',
    env: 'assets/img/rush/envelope.webp', env429: 'assets/img/rush/envelope-bounced.webp', envDone: 'assets/img/rush/envelope-done.webp',
    'dutch-neutral': 'assets/img/portraits/dutch-neutral.webp', 'dutch-smile': 'assets/img/portraits/dutch-smile.webp',
    'dutch-tired': 'assets/img/portraits/dutch-tired.webp', 'dutch-surprised': 'assets/img/portraits/dutch-surprised.webp'
  };
  const qs = new URLSearchParams(location.search);
  const SEED = +qs.get('seed') || (Date.now() % 100000) + 1;

  // ---- Layouts: one per backdrop, in that backdrop's pixels ----
  const WIDE = {
    W: 1344, H: 768, bg: 'room-wide',
    chute: [[240, 158], [628, 566]], foot: [690, 612], hatch: [190, 120],
    lever: { x: 100, y: 430, r: 125, pivot: [95, 450], label: [118, 585] },
    clerk: { x: 360, y: 628, h: 190 }, puddle: { x: 520, y: 652 },
    rack: { x: 720, y: 630, h: 200 }, stools: { xs: [1080, 1030, 980, 930, 880, 830], y: 636, h: 72 },
    desk: { x: 1215, y: 632, h: 180 }, tank: { x: 1190, y: 245, h: 230 }, bin: { x: 1272, y: 742, h: 104 },
    belt: { h: 100, slot: 116 }, title: [36, 26], handled: [1250, 46], say: { x: 400, y: 36, w: 600 }, fs: 1
  };
  const TALL = {
    W: 768, H: 1344, bg: 'room-tall',
    chute: [[560, 330], [338, 676]], foot: [330, 968], hatch: [300, 150],
    lever: { x: 118, y: 660, r: 140, pivot: [120, 750], label: [118, 470] },
    clerk: { x: 108, y: 1048, h: 170 }, puddle: { x: 300, y: 1020 },
    rack: { x: 470, y: 1016, h: 176 }, stools: { xs: [706, 648, 590, 532, 474, 416], y: 1176, h: 66 },
    desk: { x: 660, y: 1024, h: 160 }, tank: { x: 640, y: 560, h: 220 }, bin: { x: 104, y: 1222, h: 92 },
    belt: { h: 150, slot: 162 }, coinsAt: [470, 50], title: [24, 24], handled: [690, 50], say: { x: 16, y: 150, w: 736 }, fs: 1.7
  };
  let L = WIDE, scale = 1, ox = 0, oy = 0, dpr = 1;

  // ---- State ----
  let S, fx, pops, drag, sayQ, said, saying, stamp, endAt, last, flashT, leverT, coinPulse;
  function reset(seed) {
    S = R.create(seed); fx = []; pops = []; drag = null; sayQ = []; said = {}; saying = null; stamp = null; endAt = 0;
    flashT = 0; leverT = 0; coinPulse = 0;
    qEl.classList.remove('on'); qEl.innerHTML = '';
    say('intro', 'neutral', 'Tickets slide down the chute. Mira handles them at her stools. Build what you like, then pull the lever.', 9);
  }

  // ---- Dutch: one line per lesson, once per claim ----
  function say(key, mood, text, secs) {
    if (said[key]) return; said[key] = 1;
    sayQ.push({ mood, text, secs: secs || Math.max(4.5, text.length / 16) });
  }
  const LINES = {
    rack: 'A queue. Tickets wait on the rack for a free stool instead of bouncing. It may hand you the same one twice.',
    reserve: 'Reserved stools. Four are bolted down for Mira and nobody else can sit on them. She can\'t use more than four, either.',
    bin: 'A dead-letter bin. A ticket that fails three times off the rack goes in here instead of going round forever.',
    binNoRack: 'It only catches tickets that fail off the rack. A caller at the desk gets the error straight back.',
    bell: 'The bell is for the next claim.',
    throttle: 'Bounced. Two free stools, more people than that. Do the sums.',
    splat: 'Third bounce and they give up. That\'s a lost request, and it goes in the tank.',
    poison: 'That one\'s poison. It fails every time, however often you try it.',
    poisonRack: 'That one\'s poison. It fails every time, and off the rack it just comes back for another go.',
    twin: 'Same ticket twice. A standard queue delivers at least once. Make the job safe to do twice.',
    clog: 'Those will never clear. Nothing takes a bad ticket off the rack.',
    coin: 'Halfway. Have another coin.'
  };

  // ---- Images ----
  function load() {
    return Promise.all(Object.keys(SRC).map(k => new Promise(res => {
      const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = () => res(); im.src = SRC[k];
    }))).then(() => {
      // The poison ticket: the envelope tinted violet.
      const e = IMG.env; if (!e) return;
      const c = document.createElement('canvas'); c.width = e.width; c.height = e.height;
      const g = c.getContext('2d'); g.drawImage(e, 0, 0); g.globalCompositeOperation = 'source-atop';
      g.fillStyle = 'rgba(120, 40, 170, .62)'; g.fillRect(0, 0, c.width, c.height); IMG.envPoison = c;
    });
  }

  // ---- Geometry ----
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  const arc = (p, q, h, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t) - h * 4 * t * (1 - t)];
  function stoolPos(i) { return [L.stools.xs[i], L.stools.y - L.stools.h - 14]; }
  function rackSlot(n) {
    const r = L.rack, cols = 3, w = r.h * 0.2, hgt = r.h * 0.22;
    const c = n % cols, row = Math.floor(n / cols);
    return [r.x + (c - 1) * w, r.y - r.h * 0.78 + row * hgt];
  }
  const RACK_SLOTS = 9;
  function chutePos(t) {
    const [a, b] = L.chute;
    if (t < 0.8) { const u = t / 0.8; return [lerp(a[0], b[0], u * u), lerp(a[1], b[1], u * u)]; }
    const u = (t - 0.8) / 0.2; return arc(b, L.foot, -10, u);
  }
  function chuteAngle() {
    const [a, b] = L.chute; let ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (ang > Math.PI / 2) ang -= Math.PI; else if (ang < -Math.PI / 2) ang += Math.PI;
    return ang;
  }
  function spot(tool) {
    if (tool === 'rack') { const r = L.rack, w = r.h * 0.72; return [r.x - w / 2, r.y - r.h - 6, w, r.h + 12]; }
    if (tool === 'bin') { const b = L.bin, w = b.h * 0.95; return [b.x - w / 2, b.y - b.h - 6, w, b.h + 12]; }
    if (tool === 'reserve') { const xs = L.stools.xs.slice(0, 4), h = L.stools.h; return [Math.min(...xs) - 34, L.stools.y - h - 30, Math.max(...xs) - Math.min(...xs) + 68, h + 42]; }
    return null;
  }
  const TOOLS = ['rack', 'reserve', 'bin', 'bell'];
  const TOOL_IMG = { rack: 'rack', reserve: 'bolted', bin: 'bin', bell: 'bell' };
  const TOOL_LABEL = { rack: 'Rack', reserve: 'Bolt 4', bin: 'Bin', bell: 'Bell' };
  function beltRect() {
    const n = TOOLS.length, s = L.belt.slot, w = n * s + 24, h = L.belt.h;
    return [(L.W - w) / 2, L.H - h - 12, w, h];
  }
  function slotRect(i) { const [bx, by, , bh] = beltRect(); return [bx + 12 + i * L.belt.slot + 4, by + 8, L.belt.slot - 8, bh - 16]; }
  const inRect = (p, r, pad) => p[0] >= r[0] - (pad || 0) && p[0] <= r[0] + r[2] + (pad || 0) && p[1] >= r[1] - (pad || 0) && p[1] <= r[1] + r[3] + (pad || 0);

  // ---- Where each ticket is, from its phase ----
  function ticketDraw(k) {
    const u = k.dur ? Math.min(1, k.t / k.dur) : 0;
    const qi = S.queue.indexOf(k.id);
    const fromRack = () => rackSlot(Math.min(RACK_SLOTS - 1, 4));
    switch (k.phase) {
      case 'slide': return { p: chutePos(ease(u)), rot: u < 0.8 ? chuteAngle() : chuteAngle() * (1 - (u - .8) / .2) };
      case 'shelf': return qi < RACK_SLOTS ? { p: rackSlot(Math.max(0, qi)), s: 0.42 } : null;
      case 'hidden': return { p: [L.rack.x + L.rack.h * 0.32, L.rack.y - L.rack.h * 0.95], s: 0.42, a: 0.35 };
      case 'walk': { const src = k.from === 'rack' ? fromRack() : L.foot; return { p: arc(src, stoolPos(k.stool), 60, ease(u)), s: lerp(k.from === 'rack' ? .42 : .5, .5, u) }; }
      case 'work': return { p: stoolPos(k.stool), ring: u };
      case 'done': return { p: arc(stoolPos(k.seat || 0), L.handled, 120, ease(u)), s: lerp(.5, .3, u), img: 'envDone' };
      case 'bounce': return { p: arc(L.foot, L.hatch, 180, ease(u)), rot: -0.6 + u * 4, img: 'env429' };
      case 'splat': return { p: arc(L.foot, [L.puddle.x, L.puddle.y - 6], 60, u), rot: u * 2, img: 'env429', a: 1 - u * .3 };
      case 'tobin': return { p: arc(stoolPos(k.seat || 0), [L.bin.x, L.bin.y - L.bin.h * .7], 140, ease(u)), rot: u * 6, s: lerp(.5, .3, u) };
      case 'back': return { p: arc(stoolPos(k.seat || 0), fromRack(), 50, ease(u)), s: .45 };
    }
    return null;
  }

  // ---- The loop ----
  function frame(now) {
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now;
    if (S.started && !S.over) R.step(S, dt);
    for (const e of R.drain(S)) onEvent(e);
    tick(dt);
    draw();
    requestAnimationFrame(frame);
  }
  function popAt(p, text, col, size) { pops.push({ x: p[0], y: p[1], text, col, size: size || 34, t: 0 }); }
  function onEvent(e) {
    const k = S.tickets.find(x => x.id === e.id);
    switch (e.type) {
      case 'lever': leverT = 1; if (saying && said.intro && sayQ.indexOf(saying) < 0 && /pull the lever/.test(saying.text)) saying = null; break;
      case 'wave': popAt([L.W / 2, L.H * 0.36], 'Wave ' + e.wave, '#ffe6a8', 56); break;
      case 'coin': coinPulse = 1.5; say('coin', 'smile', LINES.coin); break;
      case 'throttle': popAt([L.foot[0] + 20 + (Math.random() - .5) * 60, L.foot[1] - 70 - Math.random() * 40], '429', '#ff8a7a', 40); flashT = .25; say('throttle', 'tired', LINES.throttle); break;
      case 'spill':
        popAt([L.puddle.x, L.puddle.y - 60], '-1', '#9cc8ff', 36);
        popAt([L.tank.x - 70, L.tank.y - L.tank.h * .2], '+1', '#9cc8ff', 28);
        for (let i = 0; i < 8; i++) fx.push({ x: L.puddle.x, y: L.puddle.y - 4, vx: (Math.random() - .5) * 220, vy: -120 - Math.random() * 160, t: 0 });
        if (e.why === 'throttled') say('splat', 'tired', LINES.splat);
        break;
      case 'poisonFail': if (k && k.stool == null) popAt(k.from === 'rack' ? rackSlot(4) : L.foot, 'fail', '#d59cff', 30); say('poison', 'surprised', S.rack && !S.bin ? LINES.poisonRack : LINES.poison); break;
      case 'twin': popAt(rackSlot(0), 'x2', '#ffb27a', 38); say('twin', 'neutral', LINES.twin); break;
      case 'binned': popAt([L.bin.x, L.bin.y - L.bin.h - 20], 'binned', '#d59cff', 28); break;
      case 'clog': say('clog', 'tired', LINES.clog); break;
      case 'win': stamp = { text: 'CLOSED', col: '#3c9a58', t: 0 }; endAt = 1.8; break;
      case 'lose': stamp = { text: 'FLOODED', col: '#c8473b', t: 0 }; endAt = 1.8; break;
    }
  }
  function tick(dt) {
    pops.forEach(p => p.t += dt); pops = pops.filter(p => p.t < 1.2);
    fx.forEach(f => { f.t += dt; f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 600 * dt; }); fx = fx.filter(f => f.t < .8);
    flashT = Math.max(0, flashT - dt); coinPulse = Math.max(0, coinPulse - dt);
    if (leverT) leverT = Math.max(0, leverT - dt * 0.7);
    if (!saying && sayQ.length) saying = Object.assign(sayQ.shift(), { t: 0 });
    if (saying) { saying.t += dt; if (saying.t > saying.secs) saying = null; }
    if (stamp) stamp.t += dt;
    if (endAt) { endAt -= dt; if (endAt <= 0) { endAt = 0; showQuestion(); } }
  }

  // ---- Drawing ----
  function img(k, x, y, h, anchor, alpha, rot, w) {
    const im = IMG[k]; if (!im) return;
    const ww = w || im.width * h / im.height, hh = w ? im.height * w / im.width : h;
    cx.save(); cx.globalAlpha = alpha == null ? 1 : alpha; cx.translate(x, y); if (rot) cx.rotate(rot);
    const ax = anchor === 'mb' ? -ww / 2 : -ww / 2, ay = anchor === 'mb' ? -hh : -hh / 2;
    cx.drawImage(im, ax, ay, ww, hh); cx.restore();
  }
  function shadow(x, y, w) {
    cx.save(); cx.fillStyle = 'rgba(0,0,0,.35)'; cx.beginPath(); cx.ellipse(x, y, w / 2, w * .09, 0, 0, Math.PI * 2); cx.fill(); cx.restore();
  }
  function rrect(x, y, w, h, r) { cx.beginPath(); cx.roundRect ? cx.roundRect(x, y, w, h, r) : cx.rect(x, y, w, h); }
  function text(t, x, y, size, col, align, weight) {
    size *= L.fs; cx.save(); cx.font = `${weight || 700} ${size}px Fredoka, "Trebuchet MS", system-ui, sans-serif`; cx.textAlign = align || 'center'; cx.textBaseline = 'middle';
    cx.lineJoin = 'round'; cx.lineWidth = Math.max(3, size / 6); cx.strokeStyle = 'rgba(0,0,0,.9)'; cx.strokeText(t, x, y); cx.fillStyle = col; cx.fillText(t, x, y); cx.restore();
  }
  function plaque(t, x, y) {
    const f = 15 * L.fs; cx.save(); cx.font = `700 ${f}px Nunito, "Segoe UI", system-ui, sans-serif`; const w = cx.measureText(t).width + 16;
    rrect(x - w / 2, y - f * .75, w, f * 1.5, 8); cx.fillStyle = 'rgba(32,24,18,.82)'; cx.fill(); cx.strokeStyle = 'rgba(214,178,84,.9)'; cx.lineWidth = 1.5; cx.stroke();
    cx.fillStyle = '#f6e7c4'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(t, x, y + 1); cx.restore();
  }
  function glowSpot(r, strong) {
    const pulse = .5 + .5 * Math.sin(performance.now() / 220);
    cx.save(); rrect(r[0], r[1], r[2], r[3], 14);
    cx.fillStyle = `rgba(255,214,102,${(strong ? .22 : .1) + pulse * .08})`; cx.fill();
    cx.setLineDash([10, 8]); cx.lineWidth = 4; cx.strokeStyle = `rgba(255,214,102,${strong ? .95 : .6})`; cx.stroke(); cx.restore();
  }
  function wrap(t, maxW) {
    const words = t.split(' '), lines = []; let cur = '';
    for (const w of words) { const n = cur ? cur + ' ' + w : w; if (cx.measureText(n).width > maxW && cur) { lines.push(cur); cur = w; } else cur = n; }
    if (cur) lines.push(cur); return lines;
  }
  function draw() {
    const cw = cv.width, ch = cv.height;
    cx.setTransform(1, 0, 0, 1, 0, 0);
    // The backdrop fills the whole screen behind the stage, dimmed, so there are no bars.
    const bg = IMG[L.bg];
    if (bg) {
      const cs = Math.max(cw / bg.width, ch / bg.height);
      cx.drawImage(bg, (cw - bg.width * cs) / 2, (ch - bg.height * cs) / 2, bg.width * cs, bg.height * cs);
      cx.fillStyle = 'rgba(10,8,14,.55)'; cx.fillRect(0, 0, cw, ch);
    } else { cx.fillStyle = '#120e16'; cx.fillRect(0, 0, cw, ch); }
    cx.setTransform(scale * dpr, 0, 0, scale * dpr, ox * dpr, oy * dpr);
    if (bg) cx.drawImage(bg, 0, 0, L.W, L.H);
    const dragging = drag && drag.moved ? drag.tool : null;
    // The lever: glows until it's pulled.
    if (!S.started) {
      const p = .5 + .5 * Math.sin(performance.now() / 260);
      cx.save(); const g = cx.createRadialGradient(L.lever.x, L.lever.y, 10, L.lever.x, L.lever.y, L.lever.r);
      g.addColorStop(0, `rgba(255,214,102,${.35 + p * .2})`); g.addColorStop(1, 'rgba(255,214,102,0)'); cx.fillStyle = g;
      cx.beginPath(); cx.arc(L.lever.x, L.lever.y, L.lever.r, 0, Math.PI * 2); cx.fill(); cx.restore();
      text('PULL', L.lever.label[0], L.lever.label[1], 30, '#ffe08a');
    } else if (leverT) {
      const [px, py] = L.lever.pivot, Rr = 120;
      cx.save(); cx.globalAlpha = leverT; cx.strokeStyle = '#ffe066'; cx.lineWidth = 7; cx.beginPath(); cx.arc(px, py, Rr, -1.3, 0.45); cx.stroke(); cx.restore();
    }
    // The Night Clerk, with his four stools' worth of papers.
    shadow(L.clerk.x, L.clerk.y + 2, L.clerk.h * .9); img('clerk', L.clerk.x, L.clerk.y + 6, L.clerk.h, 'mb');
    // The puddle grows with every lost request.
    if (S.spill) img('puddle', L.puddle.x, L.puddle.y, 0, 'mm', .92, 0, 110 + S.spill * 22);
    // The tank (error budget) and its water.
    drawTank();
    // The rack, or its glowing spot.
    if (S.rack) {
      shadow(L.rack.x, L.rack.y + 2, L.rack.h * .62); img('rack', L.rack.x, L.rack.y + 6, L.rack.h, 'mb');
      const n = S.queue.length; if (n > RACK_SLOTS) text('+' + (n - RACK_SLOTS), L.rack.x + L.rack.h * .42, L.rack.y - L.rack.h * .6, 26, '#ffe6a8');
      plaque('Rack · SQS queue', L.rack.x, L.rack.y - L.rack.h - 16 * L.fs);
    } else if (dragging === 'rack' || (!drag && !S.started && !S.placed.length)) glowSpot(spot('rack'), dragging === 'rack');
    // Mira's desk and the six stools.
    shadow(L.desk.x, L.desk.y + 2, L.desk.h * 1.05); img('desk', L.desk.x, L.desk.y + 8, L.desk.h, 'mb');
    plaque('Mira', L.desk.x, L.desk.y - L.desk.h - 4);
    drawStools(dragging === 'reserve');
    // The bin.
    if (S.bin) { shadow(L.bin.x, L.bin.y + 2, L.bin.h * .8); img('bin', L.bin.x, L.bin.y + 4, L.bin.h, 'mb'); plaque('Bin · DLQ', L.bin.x, L.bin.y - L.bin.h - 14); if (S.binned) text(String(S.binned), L.bin.x + L.bin.h * .4, L.bin.y - L.bin.h * .55, 24, '#e5b8ff'); }
    else if (dragging === 'bin') glowSpot(spot('bin'), true);
    // Tickets.
    const waitN = S.tickets.filter(k => k.phase === 'wait').length;
    for (const k of S.tickets) {
      const d = ticketDraw(k); if (!d) continue;
      const key = d.img || (k.poison ? 'envPoison' : 'env');
      img(key, d.p[0], d.p[1], 0, 'mm', d.a, d.rot || 0, 110 * (d.s || .5));
      if (k.twin && (k.phase === 'work' || k.phase === 'walk')) text('x2', d.p[0] + 26, d.p[1] - 20, 18, '#ffb27a');
      if (d.ring != null) {
        cx.save(); cx.lineWidth = 6; cx.strokeStyle = k.poison ? '#d59cff' : '#8fe68f'; cx.beginPath();
        cx.arc(d.p[0], d.p[1], 32, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * d.ring); cx.stroke(); cx.restore();
      }
    }
    if (waitN) text('↺ ' + waitN, L.hatch[0] + 60, L.hatch[1] + 10, 28, '#ff9a8a');
    // Splashes and floating numbers.
    cx.save(); cx.fillStyle = 'rgba(120,180,255,.85)';
    fx.forEach(f => { cx.beginPath(); cx.arc(f.x, f.y, 5 * (1 - f.t), 0, Math.PI * 2); cx.fill(); }); cx.restore();
    pops.forEach(p => { cx.save(); cx.globalAlpha = Math.min(1, 2.4 - p.t * 2); text(p.text, p.x, p.y - p.t * 50, p.size, p.col); cx.restore(); });
    if (flashT) { cx.save(); cx.fillStyle = `rgba(255,80,60,${flashT * .35})`; cx.fillRect(0, 0, L.W, L.H); cx.restore(); }
    drawHud(); drawBelt(); drawSay();
    if (drag && drag.moved) img(TOOL_IMG[drag.tool], drag.x, drag.y, drag.tool === 'rack' ? L.rack.h * .9 : 110, 'mm', .85);
    if (stamp) drawStamp();
  }
  function drawTank() {
    const t = L.tank, im = IMG.tank; if (!im) return;
    const w = im.width * t.h / im.height, x0 = t.x - w / 2, y0 = t.y - t.h / 2;
    img('tank', t.x, t.y, t.h, 'mm');
    const lvl = Math.min(1, S.spill / S.cap);
    if (lvl) {
      const gx0 = x0 + w * .2, gx1 = x0 + w * .62, gy0 = y0 + t.h * .2, gy1 = y0 + t.h * .74, top = gy1 - (gy1 - gy0) * lvl;
      cx.save(); rrect(gx0, top, gx1 - gx0, gy1 - top, 6); cx.fillStyle = lvl > .75 ? 'rgba(230,90,80,.75)' : 'rgba(60,130,230,.72)'; cx.fill(); cx.restore();
    }
    plaque(`Error budget ${S.spill}/${S.cap}`, t.x, y0 + t.h + 16);
  }
  function drawStools(hot) {
    const seats = R.seats(S), own = R.owners(S), st = L.stools;
    if (hot && !S.reserve) glowSpot(spot('reserve'), true);
    seats.forEach((s, i) => {
      const x = st.xs[i];
      shadow(x, st.y + 2, st.h * .8);
      img(S.reserve && own[i] === 'mira' ? 'bolted' : 'stool', x, st.y + 6, st.h, 'mb', own[i] === 'clerk' ? .9 : 1);
      if (own[i] === 'clerk') {
        // The Night Clerk's papers hold this stool.
        cx.save(); for (let j = 0; j < 3; j++) { cx.fillStyle = j % 2 ? '#e8dcc0' : '#f7efdc'; cx.strokeStyle = '#6b5a3a'; cx.lineWidth = 1.5; rrect(x - 18 + j * 2, st.y - st.h - 4 - j * 5, 36, 10, 2); cx.fill(); cx.stroke(); }
        cx.fillStyle = '#5a7fc0'; cx.fillRect(x - 3, st.y - st.h - 18, 6, 16); cx.restore();
      }
    });
    const mira = own.filter(o => o === 'mira').length;
    plaque(S.reserve ? `Mira ${mira} reserved · Night Clerk ${6 - mira}` : `Night Clerk ${6 - mira} · Mira ${mira}`, (st.xs[0] + st.xs[st.xs.length - 1]) / 2, st.y - st.h - 44 - 10 * L.fs);
  }
  function drawHud() {
    text('THE RUSH', L.title[0], L.title[1] + 16 * L.fs, 32, '#fff0d2', 'left');
    for (let i = 0; i < 4; i++) {
      const x = L.title[0] + 12 * L.fs + i * 28 * L.fs, y = L.title[1] + 56 * L.fs;
      cx.save(); cx.beginPath(); cx.arc(x, y, 10 * L.fs, 0, Math.PI * 2); cx.fillStyle = i < S.wave ? '#ffd666' : 'rgba(50,44,60,.9)'; cx.fill();
      cx.lineWidth = 3; cx.strokeStyle = '#000'; cx.stroke(); cx.restore();
    }
    img('envDone', L.handled[0] - 30 - 16 * L.fs, L.handled[1], 0, 'mm', 1, 0, 52 * L.fs);
    text(String(S.handled), L.handled[0], L.handled[1], 34, '#bff5b4', 'left');
  }
  function drawBelt() {
    const [bx, by, bw, bh] = beltRect();
    cx.save(); rrect(bx, by, bw, bh, 22); cx.fillStyle = 'rgba(24,20,30,.92)'; cx.fill(); cx.lineWidth = 3; cx.strokeStyle = '#be9650'; cx.stroke(); cx.restore();
    TOOLS.forEach((t, i) => {
      const r = slotRect(i), used = S[t], locked = R.TOOLS[t].locked, poor = !used && !locked && S.coins < 1;
      const hot = drag && drag.tool === t;
      cx.save(); rrect(r[0], r[1], r[2], r[3], 14); cx.fillStyle = used ? 'rgba(30,26,34,1)' : 'rgba(58,48,62,1)'; cx.fill();
      cx.lineWidth = hot ? 4 : 2; cx.strokeStyle = hot ? '#ffd666' : '#64566e'; cx.stroke(); cx.restore();
      if (!used) img(TOOL_IMG[t], r[0] + r[2] / 2, r[1] + r[3] / 2 - 8 * L.fs, 52 * L.fs, 'mm', locked || poor ? .4 : 1);
      cx.save(); cx.font = `700 ${14 * L.fs}px Nunito, "Segoe UI", sans-serif`; cx.textAlign = 'center'; cx.fillStyle = used ? '#8a7f92' : '#f2e6cc';
      cx.fillText(used ? 'placed' : locked ? 'next claim' : TOOL_LABEL[t], r[0] + r[2] / 2, r[1] + r[3] - 6); cx.restore();
      if (!used && !locked) {
        cx.save(); cx.beginPath(); cx.arc(r[0] + r[2] - 10, r[1] + 10, 13 * L.fs, 0, Math.PI * 2); cx.fillStyle = '#d6b254'; cx.fill(); cx.lineWidth = 2.5; cx.strokeStyle = '#000'; cx.stroke(); cx.restore();
        text('1', r[0] + r[2] - 10, r[1] + 11, 15, '#2b1a08');
      }
      if (!used && !locked) text(String(i + 1), r[0] + 12, r[1] + 12, 14, '#9d90a8');
    });
    const cxp = L.coinsAt ? L.coinsAt[0] : bx + bw + 26, cyp = L.coinsAt ? L.coinsAt[1] : by + bh / 2, puls = coinPulse ? 1 + .2 * Math.sin(coinPulse * 12) : 1;
    cx.save(); cx.translate(cxp + 14, cyp); cx.scale(puls, puls); cx.beginPath(); cx.arc(0, 0, 16 * L.fs, 0, Math.PI * 2); cx.fillStyle = '#d6b254'; cx.fill(); cx.lineWidth = 3; cx.strokeStyle = '#000'; cx.stroke(); cx.restore();
    text(String(S.coins), cxp + 22 + 22 * L.fs, cyp, 30, '#ffdc78', 'left');
  }
  function drawSay() {
    if (!saying) return;
    const s = L.say, a = Math.min(1, saying.t * 5, (saying.secs - saying.t) * 3);
    cx.save(); cx.globalAlpha = Math.max(0, a);
    const fz = 20 * Math.min(L.fs, 1.45), lh = fz * 1.35; cx.font = `700 ${fz}px Nunito, "Segoe UI", system-ui, sans-serif`;
    const pw = 76 * Math.min(L.fs, 1.4), lines = wrap(saying.text, s.w - pw - 40), h = Math.max(pw + 12, 24 + lines.length * lh);
    rrect(s.x, s.y, s.w, h, 16); cx.fillStyle = 'rgba(255,250,238,.96)'; cx.fill(); cx.lineWidth = 4; cx.strokeStyle = '#111'; cx.stroke();
    const face = IMG['dutch-' + saying.mood] || IMG['dutch-neutral'];
    if (face) { cx.save(); rrect(s.x + 8, s.y + 6, pw, pw, 10); cx.clip(); cx.fillStyle = '#efe2c4'; cx.fillRect(s.x + 8, s.y + 6, pw, pw); cx.drawImage(face, s.x + 8, s.y + 6, pw, pw); cx.restore(); }
    cx.fillStyle = '#1e160f'; cx.textBaseline = 'top';
    lines.forEach((l, i) => cx.fillText(l, s.x + pw + 24, s.y + 14 + i * lh));
    cx.restore();
  }
  function drawStamp() {
    const u = Math.min(1, stamp.t / .35), sc = lerp(2.2, 1, ease(u));
    cx.save(); cx.translate(L.W / 2, L.H * .4); cx.rotate(-0.17); cx.scale(sc, sc); cx.globalAlpha = u;
    cx.lineWidth = 10; cx.strokeStyle = stamp.col; rrect(-250, -70, 500, 140, 14); cx.stroke();
    cx.lineWidth = 4; rrect(-236, -56, 472, 112, 8); cx.stroke();
    cx.font = '700 76px Fredoka, "Trebuchet MS", sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = stamp.col; cx.fillText(stamp.text, 0, 4);
    cx.restore();
  }

  // ---- The question after the claim (the only plain screen) ----
  const QS = {
    rack: {
      q: 'A checkout API calls a Lambda function synchronously. During flash sales, callers get 429 errors, and some orders are lost once their retries run out. Orders can be processed a few seconds late. What is the best fix?',
      opts: ['Put an SQS queue in front of the function and let Lambda poll it', 'Configure a dead-letter queue on the function', 'Raise the function\'s timeout to 15 minutes', 'Give the function more memory'],
      why: 'A queue soaks up the burst. Messages wait until a concurrent execution is free, and Lambda\'s poller takes them as fast as it can. A function\'s dead-letter queue only catches failed asynchronous invocations, and neither the timeout nor memory adds concurrency.'
    },
    reserve: {
      q: 'Two Lambda functions share one account. A nightly batch function sometimes takes most of the account\'s concurrency, and the checkout function gets throttled. What guarantees checkout always has capacity?',
      opts: ['Set reserved concurrency on the checkout function', 'Turn on provisioned concurrency for the batch function', 'Increase the checkout function\'s memory', 'Turn on X-Ray tracing for the checkout function'],
      why: 'Reserved concurrency sets aside that many concurrent executions for one function, and no other function can use them. It is also that function\'s ceiling. Provisioned concurrency keeps environments initialised to cut cold starts; it doesn\'t stop one function from using capacity another needs.'
    },
    bin: {
      q: 'A Lambda function processes messages from an SQS standard queue. One malformed message fails every time, reappears after its visibility timeout and is retried over and over. What should you configure?',
      opts: ['A redrive policy that moves a message to a dead-letter queue after a set maxReceiveCount', 'A visibility timeout of 0 seconds', 'Long polling on the queue', 'A larger batch size on the event source mapping'],
      why: 'A redrive policy on the source queue moves a message to the dead-letter queue once it has been received maxReceiveCount times without being deleted. A shorter visibility timeout only brings it back sooner, and long polling and batch size don\'t change what happens to a message that keeps failing.'
    }
  };
  function pickQ() {
    if (S.bin && S.rack && S.binned) return 'bin';
    if (S.rack && !S.bin && S.lost) return 'bin';
    if (S.rack) return 'rack';
    if (S.reserve) return 'reserve';
    return 'rack';
  }
  function shuffle(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function showQuestion() {
    const key = pickQ(), Q = QS[key], order = shuffle([0, 1, 2, 3], Math.random);
    const won = S.over === 'win';
    const sum = `${S.handled} handled · ${S.lost} lost · ${S.throttles} bounces${S.twins ? ` · ${S.twins} twins` : ''}${S.binned ? ` · ${S.binned} binned` : ''}`;
    qEl.innerHTML = `<div class="q-card"><h2 id="q-h">${won ? 'Claim closed.' : 'The floor flooded.'}</h2><p class="q-sum">${sum}</p>
      <p class="q-ask">Exam question</p><p class="q-text">${Q.q}</p>
      <div class="q-opts">${order.map(i => `<button type="button" data-i="${i}">${Q.opts[i]}</button>`).join('')}</div>
      <p class="q-why"></p><button type="button" class="q-again">Play again</button></div>`;
    qEl.classList.add('on');
    const why = qEl.querySelector('.q-why'), again = qEl.querySelector('.q-again');
    qEl.querySelectorAll('.q-opts button').forEach(b => b.addEventListener('click', () => {
      const i = +b.dataset.i;
      qEl.querySelectorAll('.q-opts button').forEach(x => { x.disabled = true; if (+x.dataset.i === 0) x.classList.add('right'); });
      if (i !== 0) b.classList.add('wrong');
      why.innerHTML = `<b>${i === 0 ? 'Right.' : 'Not quite.'}</b> ${Q.why}`; why.classList.add('on'); again.classList.add('on'); again.focus();
    }));
    again.addEventListener('click', () => reset(SEED + Math.floor(Math.random() * 1000)));
    const first = qEl.querySelector('.q-opts button'); if (first) first.focus();
  }

  // ---- Hands ----
  function toStage(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left - ox) / scale, (e.clientY - r.top - oy) / scale]; }
  function tryPlace(tool, where) {
    const why = R.canPlace(S, tool);
    if (why === 'locked') { say('bell', 'neutral', LINES.bell); said.bell = 0; return; }
    if (why === 'coins') { popAt(where || [L.W / 2, beltRect()[1] - 20], 'No coins', '#ffdc78', 28); return; }
    if (why) return;
    R.place(S, tool);
    say(tool, 'neutral', LINES[tool]);
    if (tool === 'bin' && !S.rack) say('binNoRack', 'neutral', LINES.binNoRack);
  }
  cv.addEventListener('pointerdown', e => {
    if (qEl.classList.contains('on')) return;
    const p = toStage(e);
    for (let i = 0; i < TOOLS.length; i++) if (inRect(p, slotRect(i))) {
      drag = { tool: TOOLS[i], x: p[0], y: p[1], sx: p[0], sy: p[1], moved: false };
      cv.setPointerCapture(e.pointerId); return;
    }
    if (Math.hypot(p[0] - L.lever.x, p[1] - L.lever.y) < L.lever.r) { R.start(S); return; }
  });
  cv.addEventListener('pointermove', e => {
    if (!drag) return; const p = toStage(e); drag.x = p[0]; drag.y = p[1];
    if (Math.hypot(p[0] - drag.sx, p[1] - drag.sy) > 12) drag.moved = true;
  });
  cv.addEventListener('pointerup', e => {
    if (!drag) return; const d = drag; drag = null;
    if (!d.moved) { tryPlace(d.tool, [d.x, d.y - 60]); return; }
    const r = spot(d.tool);
    if (!r || inRect([d.x, d.y], r, 90)) tryPlace(d.tool, [d.x, d.y]);
  });
  cv.addEventListener('pointercancel', () => { drag = null; });
  addEventListener('keydown', e => {
    if (qEl.classList.contains('on')) return;
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); R.start(S); }
    const n = +e.key; if (n >= 1 && n <= 4) tryPlace(TOOLS[n - 1]);
  });

  // ---- Size: the stage fits the screen; the backdrop fills the rest ----
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    const w = innerWidth, h = innerHeight;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    L = qs.has('tall') || w < h * 0.85 ? TALL : WIDE;
    scale = Math.min(w / L.W, h / L.H); ox = (w - L.W * scale) / 2; oy = (h - L.H * scale) / 2;
  }
  addEventListener('resize', resize);
  resize(); reset(SEED);
  // For tools/rush_check.js: where things are on screen, in CSS pixels.
  const toClient = p => [ox + p[0] * scale, oy + p[1] * scale];
  window.SD_RUSH = {
    get S() { return S; }, reset, place: tryPlace, start: () => R.start(S),
    at: { slot: i => { const r = slotRect(i); return toClient([r[0] + r[2] / 2, r[1] + r[3] / 2]); }, spot: t => { const r = spot(t); return toClient([r[0] + r[2] / 2, r[1] + r[3] / 2]); }, lever: () => toClient([L.lever.x, L.lever.y]) }
  };
  load().then(() => requestAnimationFrame(frame));
})();
