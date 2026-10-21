// Chapter 1's climb up Mount Quota: Coldstart at the foot, the switchbacks and their puzzles, three Rest Stops,
// the Deny Mines' mouth, the cable lift and the ranger's hut, then out onto the summit, where js/ch1-world.js takes
// over (Freya's camp, the road east, Brookfall and the temple). Words in js/ch1-trek-story.js, questions in
// js/ch1-trek.js. The map is drawn in code on js/scene.js: 34 x 64 tiles, the foot at the bottom.
//
// Every puzzle is predict, then answer, then see: a quick guess about what IAM will do, the real question (recorded,
// with confidence), and the gate opens. A concept you miss on the way comes back at the next Rest Stop.
(function () {
  const M = SD.ch1m = {};
  const U = SD.ui, S = SD.state, Q = SD.quiz, AU = SD.audio, W1 = SD.ch1, T = SD.ch1trek, CS = SD.ch1story, ART = SD.c1art;
  const $ = U.$;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const INK = '#2b2340';
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

  const c1 = () => S.save.c1;
  const f = () => c1().f;
  const flag = k => !!f()[k];
  const setFlag = k => { f()[k] = true; S.persist(); };
  const lead = () => c1().lead;
  const others = () => CS.order.filter(id => id !== lead());

  // The climb is under way until you reach the summit. A save that was already in Freya's camp (intro, from before
  // the climb existed) stays there.
  M.active = () => { const sv = S.save; return !!(sv.c1 && sv.c1.lead) && !sv.c1.f.summit && !sv.c1.f.intro; };

  // ---------- Words ----------
  // Freya wears her promoter's face on the painted build until her briefing; the vector build is neutral unless a
  // line asks for a face (Ladi, Oct 21: neutral mostly, a smile now and then).
  function L(lines) {
    const me = lead();
    return lines.map(([s, t, e]) => ({ s: s === 'lead' ? me : s, t: typeof t === 'object' ? t[me] : t, e: s === 'freya' && !window.SD_VECTOR ? 'promoter' : e }));
  }
  const say = lines => U.dialog(L(lines));

  // ---------- The map ----------
  // ^ cliff, . alpine ground (snow above row 20), , path, = rope ledge, C the Deny Mines, X onto the summit.
  const MW = 34, MH = 64, SNOW = 20;
  const PROPS = [];
  const G = (function build() {
    const g = [];
    for (let y = 0; y < MH; y++) g.push(new Array(MW).fill('^'));
    const set = (x, y, c) => { if (x >= 0 && x < MW && y >= 0 && y < MH) g[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
    // A trail: a path one tile wide with a tile of ground either side, along straight legs.
    const trail = pts => {
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) {
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (g[y + dy] && g[y + dy][x + dx] === '^') set(x + dx, y + dy, '.');
        }
      }
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++) for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++) set(x, y, ',');
      }
    };
    const prop = (kind, x, y, w, h, o) => {
      const p = Object.assign({ kind, x, y, w: w || 1, h: h || 1 }, o);
      PROPS.push(p);
      if (p.solid !== false) for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) set(x + i, y + j, '#');
      return p;
    };
    // Coldstart, the village at the foot.
    rect(2, 52, 31, 62, '.');
    trail([[16, 62], [16, 49]]); trail([[6, 57], [26, 57]]);
    // The lower switchbacks, then the windy ledge and the cave mouth.
    trail([[16, 49], [29, 49], [29, 44], [4, 44], [4, 39], [29, 39], [29, 34], [24, 34]]);
    rect(1, 42, 6, 46, '.'); rect(27, 37, 32, 41, '.');
    for (let x = 6; x <= 23; x++) { set(x, 33, '^'); set(x, 35, '^'); set(x, 34, '='); }
    trail([[5, 34], [5, 30], [16, 30]]);
    set(5, 34, ','); set(24, 34, ',');
    // The upper trail: out of the mines, along to the lift; then from the top station to the summit.
    trail([[16, 24], [27, 24]]); rect(26, 21, 31, 25, '.');
    trail([[27, 13], [6, 13], [6, 7], [16, 7], [16, 2]]); rect(24, 11, 31, 15, '.'); rect(17, 5, 22, 9, '.');
    set(16, 1, 'X');
    // Coldstart's houses and the welcome hut.
    M.hut = prop('hut', 12, 52, 3, 2);
    M.cart = prop('cart', 18, 54, 2, 1, { state: 'locked' });
    prop('board', 19, 58, 2, 1); prop('trailmap', 12, 58, 2, 1);
    prop('cottage', 3, 53, 3, 2, { color: '#8aa0c8' }); prop('cottage', 25, 53, 3, 2, { color: '#c9a070' });
    prop('cottage', 4, 59, 3, 2, { color: '#a7c98a' }); prop('cottage', 26, 59, 3, 2, { color: '#d9a0b0' });
    prop('fence', 8, 61, 2, 1); prop('fence', 22, 61, 2, 1);
    [[9, 55], [23, 55]].forEach(([x, y]) => prop('lamp', x, y));
    [[2, 52], [31, 52], [2, 62], [31, 62], [10, 62], [22, 62], [30, 56]].forEach(([x, y]) => prop('pine', x, y));
    // Gates: each opens when its puzzle is solved.
    M.gates = {
      m_go: prop('bar', 15, 50, 3, 1, { label: 'trailhead' }),
      m_locker: prop('step', 28, 46, 3, 1),
      m_toll: prop('bar', 16, 38, 1, 3, { upright: true }),
      m_ledge: prop('wind', 24, 33, 1, 3, { solid: true }),
      m_lift: prop('liftgate', 27, 25, 1, 1),
      m_log: prop('bar', 8, 12, 1, 3, { upright: true }),
      m_rest3: prop('bar', 15, 3, 3, 1)
    };
    // Along the way.
    prop('locker', 24, 47, 2, 1); prop('sign', 22, 50);
    prop('tollhut', 13, 36, 3, 2); prop('bench', 2, 43, 2, 1); prop('sign', 3, 46);
    prop('stove', 29, 37, 3, 2); prop('ledgesign', 25, 32, 2, 1, { solid: false });
    prop('cave', 15, 27, 3, 2); prop('rockfall', 14, 25, 5, 2, { solid: true });
    prop('cave', 15, 22, 3, 1, { upper: true });
    prop('station', 28, 21, 3, 2); prop('station', 28, 10, 3, 2, { top: true });
    prop('rangerhut', 10, 10, 3, 2); prop('bench', 19, 5, 2, 1); prop('flag', 17, 2, 1, 1);
    // Trees low down, cairns high up.
    [[7, 47], [11, 47], [20, 47], [2, 41], [9, 41], [20, 42], [24, 41], [31, 43], [12, 37], [21, 37], [27, 36], [31, 36], [3, 32], [8, 31], [21, 31], [26, 31]].forEach(([x, y]) => { if (g[y][x] === '.') prop('pine', x, y); });
    [[19, 23], [24, 23], [21, 25], [11, 12], [19, 14], [4, 9], [8, 6], [13, 5], [21, 8]].forEach(([x, y]) => { if (g[y][x] === '.') prop('cairn', x, y); });
    return g;
  })();
  const MAP = G.map(r => r.join(''));
  const HOME = { freya: [15, 55, 'south'] };

  // ---------- Drawing ----------
  function P(ctx) {
    const p = {
      ctx,
      fill(c, line) { ctx.fillStyle = c; ctx.fill(); if (line !== false) { ctx.strokeStyle = INK; ctx.lineWidth = line || 1.2; ctx.stroke(); } return p; },
      stroke(c, w) { ctx.strokeStyle = c || INK; ctx.lineWidth = w || 1.2; ctx.stroke(); return p; },
      poly(...pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); return p; },
      line(...pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); return p; },
      circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); return p; },
      ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); return p; },
      rect(x, y, w, h, r) { ctx.beginPath(); if (r && ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); return p; },
      text(s, x, y, size, col) { ctx.fillStyle = col || INK; ctx.font = `600 ${size || 7}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(s, x, y); return p; }
    };
    return p;
  }
  function frame(ctx, x, y, ts, fn) {
    ctx.save(); ctx.translate(x, y); const u = ts / 32; ctx.scale(u, u);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    fn(P(ctx));
    ctx.restore();
  }
  const groundCh = (x, y) => {
    if (y < 0 || y >= MH || x < 0 || x >= MW) return '^';
    const c = MAP[y][x];
    return c === '#' ? (G[y][x] === '#' ? '.' : c) : c;
  };
  function ground(ctx, x, y, ts, t) {
    const ch = groundCh(x, y), X = x * ts, Y = y * ts, h = hash(x, y), snow = y <= SNOW;
    if (ch === '^') {
      // Cliff: banded rock, darker the higher it goes, with a snowy lip near the top.
      ctx.fillStyle = snow ? ['#8e93a6', '#8a8fa2', '#9398aa'][h % 3] : ['#7b7468', '#766f63', '#80786b'][h % 3];
      ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.strokeStyle = 'rgba(43,35,64,.22)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(X, Y + ts * (0.3 + (h % 5) / 20)); ctx.lineTo(X + ts, Y + ts * (0.35 + (h % 7) / 25)); ctx.stroke();
      if (h % 4 === 0) { ctx.beginPath(); ctx.moveTo(X + ts * 0.6, Y + ts * 0.5); ctx.lineTo(X + ts * 0.7, Y + ts); ctx.stroke(); }
      if (groundCh(x, y - 1) !== '^') { ctx.fillStyle = snow ? '#eef2f8' : '#6f8f55'; ctx.fillRect(X, Y, ts + 1, ts * 0.14); }
      return;
    }
    ctx.fillStyle = snow ? ['#e8edf5', '#e2e8f1', '#edf1f7'][h % 3] : ['#8fb174', '#88aa6e', '#94b678'][h % 3];
    ctx.fillRect(X, Y, ts + 1, ts + 1);
    if (!snow && h % 6 === 0) {
      ctx.strokeStyle = '#6e9258'; ctx.lineWidth = ts / 32 * 1.2;
      const tx = X + (h % 23) / 23 * ts * 0.7 + ts * 0.15, ty = Y + (h % 17) / 17 * ts * 0.6 + ts * 0.3;
      ctx.beginPath(); ctx.moveTo(tx - 3, ty); ctx.lineTo(tx - 1, ty - 5); ctx.moveTo(tx + 2, ty); ctx.lineTo(tx + 3, ty - 5); ctx.stroke();
    }
    if (ch === ',' || ch === 'C' || ch === 'X') {
      ctx.fillStyle = snow ? '#c9cdd6' : '#cdb48a';
      const r = ts * 0.44;
      ctx.beginPath(); ctx.arc(X + ts / 2, Y + ts / 2, r, 0, 7); ctx.fill();
      const isP = (dx, dy) => ',CX='.includes(groundCh(x + dx, y + dy));
      if (isP(1, 0)) ctx.fillRect(X + ts / 2, Y + ts / 2 - r, ts / 2 + 1, r * 2);
      if (isP(-1, 0)) ctx.fillRect(X, Y + ts / 2 - r, ts / 2, r * 2);
      if (isP(0, 1)) ctx.fillRect(X + ts / 2 - r, Y + ts / 2, r * 2, ts / 2 + 1);
      if (isP(0, -1)) ctx.fillRect(X + ts / 2 - r, Y, r * 2, ts / 2);
    }
    if (ch === '=') {
      // The ledge: a strip of path with a drop below, and the guide rope on rings once you have it.
      ctx.fillStyle = '#7b7468'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.fillStyle = '#b9a27c'; ctx.fillRect(X, Y + ts * 0.25, ts + 1, ts * 0.5);
      ctx.fillStyle = 'rgba(20,18,30,.35)'; ctx.fillRect(X, Y + ts * 0.75, ts + 1, ts * 0.25);
      ctx.strokeStyle = '#d9b36a'; ctx.lineWidth = ts / 32 * 1.6;
      ctx.beginPath(); ctx.moveTo(X, Y + ts * 0.2); ctx.quadraticCurveTo(X + ts / 2, Y + ts * 0.3 + Math.sin(t * 3 + x) * ts * 0.03, X + ts, Y + ts * 0.2); ctx.stroke();
      ctx.fillStyle = '#9aa1a8'; ctx.beginPath(); ctx.arc(X + ts / 2, Y + ts * 0.18, ts * 0.05, 0, 7); ctx.fill();
    }
  }
  // Props this map adds; anything else (trees, cottages, the cart, the board) is js/ch1-art.js's.
  const KINDS = {
    pine(g, p, t) {
      const h = hash(p.x, p.y), sway = Math.sin(t * 1.6 + h) * 1.2, snow = p.y <= SNOW + 4;
      g.ell(16, -1, 11, 3).fill('rgba(43,35,64,.2)', false);
      g.rect(14, -10, 4, 10).fill('#6a4a30');
      [[-46, 12], [-35, 15], [-24, 17]].forEach(([y, w]) => g.poly(16 + sway, y - 14, 16 + w, y + 6, 16 - w, y + 6).fill('#3d6e4c'));
      if (snow) g.poly(16 + sway, -60, 22, -50, 10, -50).fill('#f2f5fa', false);
    },
    cairn(g) { [[16, -4, 9, 5], [15, -11, 7, 4], [17, -17, 5, 3.5]].forEach(([x, y, rx, ry]) => g.ell(x, y, rx, ry).fill('#9aa0ad')); },
    hut(g, p, t) {
      // The Free Tier welcome hut: green and cream, a ring sign that eats its own tail.
      const W = 96;
      g.ell(W / 2, -1, W / 2 - 4, 6).fill('rgba(43,35,64,.2)', false);
      g.rect(8, -38, W - 16, 38).fill('#f2ecda');
      for (let i = 0; i < 5; i++) g.rect(8 + i * (W - 16) / 5, -38, (W - 16) / 10, 38).fill('#2f7a4a', false);
      g.rect(8, -38, W - 16, 38).stroke(INK, 1.2);
      g.poly(2, -38, W / 2, -64, W - 2, -38).fill('#2f7a4a');
      g.rect(W / 2 - 10, -24, 20, 24).fill('#3a2a20');
      g.rect(W / 2 - 22, -54, 44, 11, 3).fill('#fff8e0', 0.9).text('FREE TIER', W / 2, -46, 7);
      g.circle(W / 2, -70, 4).stroke('#e2bd4f', 1.8);
      g.rect(W - 24, -20, 12, 10, 1).fill('#ffe9a8', 0.8);
    },
    trailmap(g) {
      g.line(8, 0, 8, -40).stroke('#6a4a30', 2.4); g.line(56, 0, 56, -40).stroke('#6a4a30', 2.4);
      g.rect(2, -44, 60, 30, 2).fill('#efe4c8');
      g.line(10, -18, 22, -22, 16, -28, 40, -30, 28, -36, 46, -40).stroke('#b0412e', 1.4);
      [[10, -18], [40, -30], [46, -40]].forEach(([x, y]) => g.circle(x, y, 1.8).fill('#b0412e', false));
      g.poly(30, -40, 36, -44, 42, -40).fill('#8e93a6', 0.8);
    },
    bar(g, p) {
      if (p.open) return;
      if (p.upright) { g.rect(10, -p.h * 32, 12, p.h * 32, 2).fill('#c94a3a'); for (let i = 0; i < p.h * 2; i++) g.rect(10, -p.h * 32 + i * 16 + 6, 12, 5).fill('#f2efe6', false); return; }
      g.line(6, 0, 6, -20).stroke('#6a4a30', 2.4); g.line(p.w * 32 - 6, 0, p.w * 32 - 6, -20).stroke('#6a4a30', 2.4);
      g.rect(0, -18, p.w * 32, 7, 2).fill('#c94a3a');
      for (let i = 0; i < p.w * 3; i++) g.rect(4 + i * 10.6, -18, 5, 7).fill('#f2efe6', false);
    },
    step(g, p) {
      if (p.open) { g.line(48, -30, 48, 0).stroke('#d9b36a', 1.6); g.circle(48, -30, 2).fill('#9aa1a8', 0.8); return; }
      g.poly(0, 0, 4, -26, 30, -32, 64, -30, 92, -24, 96, 0).fill('#7b7468');
      g.line(10, -18, 40, -22, 80, -16).stroke('rgba(43,35,64,.3)', 1);
    },
    wind(g, p, t) {
      if (p.open) return;
      for (let i = 0; i < 4; i++) { const k = (t * 1.4 + i / 4) % 1; g.line(28 - k * 60, -70 + i * 18, 18 - k * 60, -72 + i * 18, 8 - k * 60, -68 + i * 18).stroke(`rgba(230,236,250,${0.7 * (1 - k)})`, 1.6); }
    },
    liftgate(g, p) { if (!p.open) g.rect(4, -30, 24, 30, 2).fill('#5a6a8a'); },
    locker(g) {
      g.rect(6, -40, 48, 40, 2).fill('#6d7a86'); g.line(30, -40, 30, 0).stroke(INK, 1);
      g.rect(10, -34, 16, 10, 1).fill('#e8e2d0', 0.8); g.circle(34, -20, 2).fill('#e2bd4f', 0.8);
    },
    tollhut(g) {
      const W = 96;
      g.rect(10, -34, W - 20, 34).fill('#b5824d'); g.poly(4, -34, W / 2, -56, W - 4, -34).fill('#7a3a2a');
      g.rect(W / 2 - 14, -26, 28, 14, 2).fill('#ffe9a8', 0.9);
      g.rect(14, -48 + 30, 22, 8, 1).fill('#efe4c8', 0.8);
    },
    bench(g) { g.rect(4, -12, 56, 5, 1).fill('#9a6a3a'); g.line(10, -7, 10, 0).stroke('#6a4a30', 1.8); g.line(54, -7, 54, 0).stroke('#6a4a30', 1.8); },
    stove(g, p, t) {
      const W = 96;
      g.rect(8, -36, W - 16, 36).fill('#8a7a68'); g.poly(2, -36, W / 2, -54, W - 2, -36).fill('#5a4a40');
      g.rect(W / 2 - 10, -24, 20, 24).fill('#2a1e18');
      g.ell(W / 2, -8, 5, 3 + Math.sin(t * 8) * 0.6).fill('#ff9a3a', false);
    },
    ledgesign(g) { g.rect(2, -26, 60, 22, 2).fill('#5a524a'); g.text('DENY IF', 32, -16, 6, '#f2efe6').text('SecureTransport=false', 32, -8, 5, '#f2efe6'); },
    cave(g, p) {
      const W = p.w * 32;
      g.path = null;
      const c = g.ctx;
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(0, -p.h * 32 - 10, W / 2, -p.h * 32 - 14); c.quadraticCurveTo(W, -p.h * 32 - 10, W, 0); c.closePath();
      c.fillStyle = '#5a554e'; c.fill(); c.strokeStyle = INK; c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.moveTo(16, 0); c.quadraticCurveTo(18, -p.h * 32 + 6, W / 2, -p.h * 32 + 2); c.quadraticCurveTo(W - 18, -p.h * 32 + 6, W - 16, 0); c.closePath();
      c.fillStyle = '#100c14'; c.fill();
      if (!p.upper) { g.rect(W - 30, -p.h * 32 - 6, 34, 12, 2).fill('#c9965a', 0.9).text('DENY MINES', W - 13, -p.h * 32 + 3, 5); }
    },
    rockfall(g, p) {
      for (let i = 0; i < 9; i++) { const h = hash(p.x + i, p.y), x = 6 + (i % 5) * 32 + (h % 9), y = -4 - Math.floor(i / 5) * 22 - (h % 7), r = 12 + (h % 8); g.ell(x, y, r, r * 0.75).fill(['#8a8478', '#7b7468', '#958e82'][h % 3]); }
    },
    station(g, p, t) {
      const W = p.w * 32;
      g.rect(6, -40, W - 12, 40).fill('#6a6f80'); g.poly(0, -40, W / 2, -58, W, -40).fill('#3f4456');
      g.rect(W / 2 - 12, -28, 24, 28).fill('#1e1a24');
      g.line(W / 2, -58, W / 2, p.top ? 40 : -200).stroke('#2a2a32', 1.4);
      if (!p.top) { const y = -80 - ((t * 6) % 40); g.rect(W / 2 - 10, y, 20, 14, 3).fill('#c94a3a'); }
    },
    rangerhut(g) {
      const W = 96;
      g.rect(8, -36, W - 16, 36).fill('#8a6a4a'); g.poly(2, -36, W / 2, -60, W - 2, -36).fill('#e8edf5');
      g.rect(W / 2 - 10, -24, 20, 24).fill('#2a1e18'); g.rect(14, -26, 14, 10, 1).fill('#ffe9a8', 0.8);
    },
    flag(g, p, t) { g.line(16, 0, 16, -50).stroke('#6a4a30', 2); g.poly(16, -50, 36 + Math.sin(t * 5) * 3, -44, 16, -38).fill('#2f7a4a'); g.circle(24, -44, 2.4).stroke('#e2bd4f', 1); }
  };
  function drawProp(ctx, p, ts, t) {
    if (KINDS[p.kind]) frame(ctx, p.x * ts, (p.y + p.h) * ts, ts, g => KINDS[p.kind](g, p, t));
    else ART.prop(ctx, p, ts, t);
  }

  // ---------- The scene ----------
  let sc = null, busy = false, zone = null, lastTile = '';
  const trail = [];
  function person(id, look, x, y, face, extra) {
    const a = sc.addActor(id, Object.assign({ x, y, face: face || 'south', speed: 3.2 }, extra));
    a.look = look;
    a.draw = (ctx, fx, fy, ts, t) => ART.person(ctx, a.look, fx, fy, ts, t, a.face, a.moving || (a.path && a.path.length), a.o);
    return a;
  }
  function thing(id, x, y, name) { return sc.addActor(id, { x, y, thing: true, name, draw: () => {} }); }
  function setTile(x, y, c) { sc.def.map[y] = sc.def.map[y].slice(0, x) + c + sc.def.map[y].slice(x + 1); }

  const ZONES = [[51, 'coldstart', 'camp', 'COLDSTART'], [32, 'lower', 'road', 'THE SWITCHBACKS'], [26, 'mouth', 'road', 'THE DENY MINES'], [0, 'upper', 'road', 'THE UPPER TRAIL']];
  const zoneAt = y => ZONES.find(z => y >= z[0]);

  function makeScene() {
    const map = MAP.slice();
    const def = {
      map, solid: '^#', doors: { C: 'cave', X: 'summit' }, ground: false, bg: '#3a3f4c', clock: false,
      // Colder and greyer the higher you climb; the storm closes in above the cave.
      grade: (ctx, t, vw, vh, cx, cy, ts) => ART.grade(ctx, t, vw, vh, cx, cy, ts, Math.max(0, Math.min(1, (MH - 10 - (cy + vh / 2) / ts) / 52))),
      under(ctx, ts, t, x0, x1, y0, y1) {
        for (let y = Math.max(0, y0); y <= Math.min(y1, MH - 1); y++) for (let x = Math.max(0, x0); x <= Math.min(x1, MW - 1); x++) ground(ctx, x, y, ts, t);
      },
      rowDraw(ctx, y, ts, t, x0, x1) {
        if (y < 0 || y >= MH) return;
        PROPS.forEach(p => { if (p.y + p.h - 1 === y && p.x + p.w >= x0 - 1 && p.x <= x1) drawProp(ctx, p, ts, t); });
      },
      doorFor(tx, ty) {
        const a = Object.values(sc.actors).find(o => o.thing && !o.hidden && Math.abs(o.x - tx) <= 1 && Math.abs(o.y - ty) <= 2);
        return a ? [a.x, a.y + 1] : null;
      },
      overlay(ctx, t, vw, vh) { if (M.fade) { ctx.fillStyle = `rgba(14,10,40,${M.fade})`; ctx.fillRect(0, 0, vw, vh); } }
    };
    sc = SD.scene.create($('#w-canvas'), def);
    sc.addActor('pip', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {} });
    const me = lead(), pos = c1().mpos || [16, 60];
    const P = sc.player(pos[0], pos[1], 'north');
    P.look = me;
    P.draw = (ctx, fx, fy, ts, t) => ART.person(ctx, me, fx, fy, ts, t, P.face, P.moving, null);
    person('freya', 'freyap', HOME.freya[0], HOME.freya[1], HOME.freya[2], { name: 'Freya' });
    others().forEach((id, i) => person(id, id, pos[0] - 1 + i, pos[1] + 1, 'north', { solid: false, talk: false }));
    thing('cart', 19, 54, 'Supply cart');
    thing('board', 20, 58, 'Notice board');
    thing('trailmap', 13, 58, 'Trail map');
    thing('locker', 25, 47, 'Ranger\'s locker');
    thing('keeper', 16, 37, 'Toll keeper');
    thing('ledge', 26, 32, 'Painted rock');
    thing('lift', 27, 23, 'Lift station');
    thing('motor', 30, 23, 'Lift motor');
    thing('logbook', 11, 11, 'Ranger\'s logbook');
    sc.addActor('ctl', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {}, tick });
    sc.onTalk = id => talk(id);
    sc.onDoor = d => door(d);
    applyState();
  }

  // Put the mountain in step with the story flags.
  function applyState() {
    const A = sc.actors;
    M.cart.state = flag('cart') ? 'open' : 'locked';
    Object.entries(M.gates).forEach(([k, p]) => {
      p.open = flag(k);
      for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) setTile(p.x + i, p.y + j, p.open ? (G[p.y + j][p.x + i] === '#' ? '.' : G[p.y + j][p.x + i]) : '#');
    });
    // Gates sit on the path: put the path back under an open one.
    Object.values(M.gates).forEach(p => { if (p.open) for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) { const x = p.x + i, y = p.y + j; if (isPath(x, y)) setTile(x, y, ','); } });
    // Freya waits outside the mines, and is at the top of them when you come out.
    const inside = flag('m_rock') && !flag('m_exit');
    A.freya.hidden = inside;
    A.freya.talk = inside ? false : undefined;
    refresh();
  }
  const PATHS = new Set();
  [[15, 50], [16, 50], [17, 50], [28, 46], [29, 46], [30, 46], [16, 38], [16, 39], [16, 40], [24, 33], [24, 34], [24, 35], [27, 25], [8, 12], [8, 13], [8, 14], [15, 3], [16, 3], [17, 3]]
    .forEach(([x, y]) => { if (G[y] && G[y][x] === ',' || [[16, 50], [29, 46], [16, 39], [24, 34], [8, 13], [16, 3], [27, 25]].some(([a, b]) => a === x && b === y)) PATHS.add(x + ',' + y); });
  const isPath = (x, y) => PATHS.has(x + ',' + y);

  function refresh() {
    if (!sc) return;
    const A = sc.actors;
    const mark = (id, on) => { if (A[id]) A[id].marker = !!on; };
    mark('cart', !flag('cart'));
    mark('board', flag('cart') && !flag('m_board'));
    mark('trailmap', flag('m_board') && !flag('m_map'));
    mark('locker', !flag('m_locker'));
    mark('keeper', flag('m_rest1') && !flag('m_toll'));
    mark('ledge', flag('m_rest2') && !flag('m_ledge'));
    mark('lift', flag('m_exit') && !flag('m_lift'));
    mark('motor', flag('m_lift') && !flag('m_op'));
    mark('logbook', flag('m_op') && !flag('m_log'));
    A.freya.marker = !flag('m_go') && flag('m_board');
    if (W1.hud) W1.hud();
  }
  M.objective = function () {
    if (!flag('cart')) return 'Open the supply cart by the hut';
    if (!flag('m_board')) return 'Read the notice board';
    if (!flag('m_go')) return 'Tell Freya you\'re ready to climb';
    if (!flag('m_locker')) return 'Get the rope from the ranger\'s locker';
    if (!flag('m_rest1')) return 'Climb to Rest Stop 1';
    if (!flag('m_toll')) return 'Get past the toll hut';
    if (!flag('m_rest2')) return 'Climb to Rest Stop 2';
    if (!flag('m_ledge')) return 'Cross the windy ledge';
    if (!flag('m_mines')) return 'Go through the Deny Mines';
    if (!flag('m_lift')) return 'Ride the cable lift';
    if (!flag('m_op')) return 'Start the lift motor';
    if (!flag('m_log')) return 'Read the ranger\'s logbook';
    if (!flag('m_rest3')) return 'Rest at Rest Stop 3';
    return 'Onto the summit';
  };

  // ---------- Every frame ----------
  function tick() {
    const P = sc.P; if (!P) return;
    const k = P.x + ',' + P.y;
    if (k !== lastTile) {
      if (lastTile) { const [x, y] = lastTile.split(',').map(Number); trail.unshift([x, y]); trail.length = Math.min(trail.length, 6); }
      lastTile = k;
      if (!busy) { c1().mpos = [P.x, P.y]; S.persist(); }
      const z = zoneAt(P.y);
      if (z !== zone) { const first = zone === null; zone = z; if (!busy || first) AU.music(z[2]); if (!first) banner(z[3]); }
    }
    AU.weather(P.y < 26 ? 'tempest' : 'gloom');
    // The party follows you; Freya too, once she sets off with you, except inside the mines.
    const party = others().concat(flag('m_go') && !sc.actors.freya.hidden ? ['freya'] : []);
    party.forEach((id, i) => {
      const a = sc.actors[id], to = trail[i];
      if (!a || !to || a.scripted || a.moving || a.path.length) return;
      if (a.x !== to[0] || a.y !== to[1]) { a.speed = 7.5; a.path = [to]; }
    });
    if (busy || P.moving || P.path.length) return;
    if (!flag('m_rest1') && P.x <= 6 && P.y >= 42 && P.y <= 46) return act(() => restStop(0, 'm_rest1'));
    if (!flag('m_rest2') && P.x >= 28 && P.y >= 37 && P.y <= 41) return act(() => restStop(1, 'm_rest2'));
    if (!flag('m_rest3') && P.x >= 17 && P.y >= 5 && P.y <= 9) return act(() => restStop(2, 'm_rest3'));
    if (!flag('m_rock') && P.y <= 31 && P.y >= 29 && P.x >= 12 && P.x <= 20) return act(rockfall);
  }
  function banner(text) {
    const el = document.createElement('div');
    el.className = 'w-zone'; el.textContent = text;
    $('#screen-world').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  async function act(fn) {
    if (busy) return;
    busy = true; sc.locked = true; sc.pause();
    try { await fn(); } catch (e) { console.error(e); }
    finally { busy = false; if (sc) { sc.locked = false; c1().mpos = [sc.P.x, sc.P.y]; } S.persist(); if (sc) { applyState(); } }
  }
  const faceTo = (a, b) => { const A = sc.actors[a], B = sc.actors[b]; if (!A || !B) return; const dx = B.x - A.x, dy = B.y - A.y; A.face = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north'); };

  // ---------- Talking ----------
  function talk(id) {
    if (busy) return;
    faceTo(id, 'you');
    if (id === 'freya') return act(freyaTalk);
    if (id === 'cart') return act(cart);
    if (id === 'board') return act(board);
    if (id === 'trailmap') return act(async () => { await say(T.map); setFlag('m_map'); });
    if (id === 'locker') return act(() => puzzle('m_locker', T.locker, T.lockerPredict, pool('locker'), T.lockerWon, 'THE RANGER\'S LOCKER'));
    if (id === 'keeper') return act(() => flag('m_rest1') ? puzzle('m_toll', T.toll, T.tollPredict, pool('toll'), T.tollWon, 'THE TOLL HUT') : say([['narr', 'The keeper waves you on up the trail, to the bench first.']]));
    if (id === 'ledge') return act(() => puzzle('m_ledge', T.ledge, T.ledgePredict, pool('ledge'), T.ledgeWon, 'THE WINDY LEDGE'));
    if (id === 'lift') return act(() => puzzle('m_lift', T.lift, T.liftPredict, pool('lift'), T.liftWon, 'THE CABLE LIFT'));
    if (id === 'motor') return act(motor);
    if (id === 'logbook') return act(() => puzzle('m_log', T.logbook, T.logPredict, pool('logbook'), T.logWon, 'THE RANGER\'S LOGBOOK'));
  }
  async function door(d) {
    if (busy) return;
    if (d === 'cave') return act(cave);
    if (d === 'summit') return act(summit);
  }

  async function freyaTalk() {
    if (!flag('cart')) return say(T.cartNag);
    if (!flag('m_board')) return say(T.gateShut);
    if (!flag('m_go')) {
      AU.music('freya');
      await say(T.setOff);
      setFlag('m_go'); trail.length = 0;
      U.system('[QUEST] UP MOUNT QUOTA', 'Climb to Freya\'s camp on the summit. Your party follows you.', 'gold');
      AU.music('camp');
      return;
    }
    return say([['freya', 'Up. Mind the wind.']]);
  }
  async function cart() {
    if (flag('cart')) return say([['narr', 'The cart is open and someone has restocked it already. A card on top: "Help yourself! xx F."']]);
    await say(CS.cartLocked);
    W1.storyFight('lockeddoor', { single: true, log: 'Your kit is in the cart. Play a card to open it.' }, async () => {
      c1().deck = c1().deck.filter(c => c.id !== 'blessing');
      c1().deck.push({ id: 'adminaccess', up: false });
      setFlag('cart');
      applyState();
      const P = sc.P;
      await walk('freya', P.x + 1, P.y); faceTo('freya', 'you'); faceTo('you', 'freya');
      AU.music('freya');
      await say(T.cartWon);
      const n = U.cardNums('adminaccess');
      U.system('NEW CARD: ADMINISTRATORACCESS', U.esc(SD.cards.adminaccess.text.replace(/\{(\w+)\}/g, (_, k) => n[k] != null ? n[k] : '')), 'gold');
      await walk('freya', HOME.freya[0], HOME.freya[1]); sc.actors.freya.face = 'south';
      U.system('[COLDSTART] THE NOTICE BOARD', 'Read the trail rules before you set off.');
      AU.music('camp');
    });
  }
  async function board() {
    if (!flag('cart')) return say([['narr', 'TRAIL RULES, and a policy statement. Kit first, says a note pinned under it.']]);
    if (flag('m_board')) return say([['narr', 'TRAIL RULES: one statement. Someone has drawn a little star next to "Condition".']]);
    await say(T.board);
    S.seeConcept('polanatomy');
    await askUntil(pool('board'), 'THE NOTICE BOARD');
    await say(T.boardWon);
    setFlag('m_board');
    U.system('[COLDSTART] READY?', 'Look at the trail map if you like, then tell Freya you\'re ready.');
  }
  async function motor() {
    if (!flag('m_lift')) return say([['narr', 'The motor is cold. The lift needs a rider first.']]);
    await say(T.operator);
    S.seeConcept('lambdaperm');
    await askUntil(pool('motor'), 'THE LIFT MOTOR');
    await say(T.operatorWon);
    setFlag('m_op');
    // The ride: through the storm and out above it, to the top station.
    M.fade = 0.6; await wait(400);
    await say(T.ride);
    sc.place('you', 26, 13); others().concat('freya').forEach((id, i) => sc.place(id, 25 + i % 2, 12 + (i > 1 ? 2 : 0)));
    trail.length = 0; lastTile = '';
    await wait(300); M.fade = 0;
  }

  // ---------- Puzzles ----------
  // Predict, then answer: a quick guess at what IAM will do, then the real question; the gate opens either way, and
  // what you missed comes back at the next Rest Stop.
  async function puzzle(k, intro, predict, qids, won, title) {
    if (flag(k)) return say([['narr', 'Done here. The trail goes on.']]);
    AU.music('freya');
    await say(intro);
    await guess(predict, title);
    const q0 = SD.questions.find(q => q.id === qids[0]);
    if (q0) S.seeConcept(q0.c);
    await askUntil(qids, title);
    await say(won);
    setFlag(k);
    AU.music(zone ? zone[2] : 'road');
  }
  function guess(p, title) {
    return new Promise(res => {
      const b = U.panel(`<div class="q-ctx">Predict first</div><p class="q-q">${U.esc(p.q)}</p>
        <div class="opts">${p.opts.map((o, i) => `<button class="opt" data-pr="${i}">${U.esc(o)}</button>`).join('')}</div>
        <p class="muted small">A quick guess, not scored. Then try it and see.</p>`, { title: title || 'PREDICT', noClose: true, cls: 'quiz' });
      b.querySelectorAll('[data-pr]').forEach(el => el.onclick = () => {
        const ok = +el.dataset.pr === p.a;
        AU.sfx(ok ? 'ok' : 'resist');
        const r = U.panel(`<div class="verdict ${ok ? 'ok' : 'bad'}">${ok ? 'GOOD CALL' : 'NOT QUITE'}</div><p>${U.esc(ok ? p.right : p.wrong)}</p>
          ${ok ? '' : '<p class="muted small">A wrong guess is the part you remember. Now the real question.</p>'}
          <div class="row"><button class="primary" id="pr-ok">Try it</button></div>`, { title: title || 'PREDICT', noClose: true, cls: 'quiz' });
        r.querySelector('#pr-ok').onclick = () => { U.closePanel(); res(ok); };
      });
    });
  }
  // A puzzle's questions, in a random order: the first is asked, and the next one only if you miss it.
  // Two questions from the spot's pool, at random (js/qpick.js), the second only asked if the first is missed.
  const pool = k => {
    const ids = SD.ch1pools[k].filter(id => SD.questions.some(q => q.id === id));
    const a = SD.qpick(ids), b = a && SD.qpick(ids.filter(id => id !== a.id));
    return [a, b].filter(Boolean).map(q => q.id);
  };
  // The first question; if it's missed, another on the same idea. A miss is saved for the next Rest Stop.
  async function askUntil(qids, title) {
    for (const id of qids) {
      const q = SD.questions.find(x => x.id === id); if (!q) continue;
      const r = await Q.ask(q, { title });
      if (r && r.ok) return true;
      miss(q.c);
    }
    await say([['freya', 'Close enough for now. We\'ll come back to that one.']]);
    return false;
  }
  function miss(c) { const m = c1().miss || (c1().miss = []); if (!m.includes(c)) m.push(c); S.persist(); }
  M.miss = miss;
  // The Deny Mines (js/ch1-mines.js) speak in the climb's voice.
  M.say = say;

  // ---------- Rest Stops: a camp scene, and what you missed since the last one ----------
  const leadScenes = () => Object.keys(CS.camp).filter(k => CS.camp[k].who.includes(lead()));
  async function restStop(i, k) {
    const P = sc.P;
    AU.music('camp');
    await say(T.rest[i]);
    // What you missed, asked again with another question on the same idea.
    const m = (c1().miss || []).slice();
    if (m.length) {
      await say(T.check);
      for (const c of m) {
        const q = SD.qpick(SD.questions.filter(q => q.c === c && q.id && !q.lp));
        if (!q) continue;
        const r = await Q.ask(q, { title: 'REST STOP ' + (i + 1), context: 'From the way up: ' + SD.concepts[c].name });
        if (r && r.ok) c1().miss = c1().miss.filter(x => x !== c);
      }
      S.persist();
      await say(T.checkDone);
    } else await say(T.checkNone);
    // The camp scene: the next of your lead's three, with whoever it's with walking over.
    const key = leadScenes().find(s => !flag('s_' + s));
    if (key) {
      const s = CS.camp[key], partner = s.who.find(w => w !== lead());
      if (partner && sc.actors[partner]) { await walk(partner, P.x + 1, P.y); faceTo(partner, 'you'); faceTo('you', partner); }
      await say(s.lines);
      setFlag('s_' + key);
      U.system('[REST STOP] ' + s.title.toUpperCase(), 'A scene from their story.');
    }
    setFlag(k);
    if (k === 'm_rest3') U.system('[QUEST] THE SUMMIT', 'Freya\'s camp is just above. Follow the trail up.', 'gold');
  }

  // ---------- The Deny Mines ----------
  async function rockfall() {
    AU.music('freya');
    await say(T.rockfall);
    setFlag('m_rock');
    applyState();
    AU.music('road');
  }
  async function cave() {
    if (flag('m_mines')) { sc.place('you', 16, 24); return; }
    if (!flag('m_rock')) await rockfall();
    const how = await lobby();
    if (!how) { sc.place('you', 16, 30); sc.P.face = 'south'; return; }
    // The exit runs here, inside this same act: a second act() from the mines' onDone would be dropped while this one runs.
    if (M.mines) { M.halt(); let cleared = false; await M.mines(how, () => { cleared = true; }); if (cleared) { M.enter(); await caveExit(); } return; }
    await say(T.minesSoon);
    await caveExit();
  }
  async function caveExit() {
    setFlag('m_mines'); setFlag('m_exit');
    applyState();
    sc.place('you', 16, 24); sc.P.face = 'north';
    others().forEach((id, i) => sc.place(id, 15 + i, 23 + (i === 1 ? 2 : 0)));
    sc.place('freya', 18, 23); sc.actors.freya.hidden = false;
    trail.length = 0; lastTile = '';
    faceTo('freya', 'you');
    AU.music('freya');
    await say(T.caveExit);
    U.system('[QUEST] THE CABLE LIFT', 'Freya rode it up. See if it will take you.', 'gold');
  }
  // The Borderlands lobby at the cave mouth: solo with your companions as bots, or a party with friends.
  function lobby() {
    return new Promise(res => {
      const party = !!(SD.ch1mines && SD.ch1mines.party);
      const b = U.panel(`<p>The Deny Mines go right through the mountain: two floors, then out onto the upper trail.</p>
        <p class="muted small">This is a Borderlands dungeon. You can play it alone, with your three companions as bots, or form a party: friends who join with your code each play one of the others, and an empty seat takes a bot.</p>
        <div class="opts"><button class="opt" id="lb-solo"><b>Go in with your companions</b> · solo, they play as bots</button>
        <button class="opt" id="lb-party" ${party ? '' : 'disabled'}><b>Form a party</b> · ${party ? 'share a code with friends' : 'not open yet'}</button>
        <button class="opt" id="lb-join" ${party ? '' : 'disabled'}><b>Join a party</b> · ${party ? 'type a friend\'s code' : 'not open yet'}</button></div>
        <div class="row"><button class="ghost" id="lb-no">Not yet</button></div>`, { title: 'THE DENY MINES', noClose: true });
      b.querySelector('#lb-solo').onclick = () => { U.closePanel(); res('solo'); };
      b.querySelector('#lb-party').onclick = () => { U.closePanel(); res('party'); };
      b.querySelector('#lb-join').onclick = () => { U.closePanel(); res('join'); };
      b.querySelector('#lb-no').onclick = () => { U.closePanel(); res(null); };
    });
  }

  // ---------- Onto the summit ----------
  async function summit() {
    if (!flag('m_rest3')) { await say(T.summitGate); sc.place('you', 16, 3); return; }
    setFlag('summit'); setFlag('intro');
    c1().pos = [8, 14];
    S.persist();
    M.halt(); sc = null;
    W1.enter();
    const W = W1.debug;
    await W.act(async () => {
      await W.say(T.summit);
      U.system('[CAMP] FREYA\'S CAMP', 'See Freya at her pavilion when you\'re ready. The others are around the camp.');
    });
  }

  // ---------- Walking ----------
  const open = (x, y) => !'^#'.includes(sc.tile(x, y));
  function pathTo(sx, sy, tx, ty) {
    const key = (x, y) => x + ',' + y, prev = new Map([[key(sx, sy), null]]), q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === tx && y === ty) {
        const out = []; let k = key(x, y);
        while (k !== key(sx, sy)) { out.unshift(k.split(',').map(Number)); k = prev.get(k); }
        return out;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (prev.has(k) || !open(nx, ny)) continue;
        prev.set(k, key(x, y)); q.push([nx, ny]);
      }
    }
    return null;
  }
  function walk(id, x, y) {
    const a = sc.actors[id]; if (!a) return Promise.resolve();
    if (!open(x, y)) { const alt = [[0, 1], [0, -1], [-1, 0], [1, 1]].map(([dx, dy]) => [x + dx, y + dy]).find(([a2, b2]) => open(a2, b2)); if (alt) [x, y] = alt; }
    const p = pathTo(Math.round(a.x), Math.round(a.y), x, y) || [];
    a.scripted = true; a.speed = 3.6; a.path = p;
    return new Promise(res => { a.arrive = res; if (!p.length) res(); }).then(() => { a.scripted = false; });
  }

  // ---------- Entering and leaving ----------
  M.enter = function () {
    // Saves from before the climb kept Freya's Blessing; the climb hands out AdministratorAccess instead.
    c1().deck.forEach(c => { if (c.id === 'blessing') c.id = 'adminaccess'; });
    W1.dress();
    SD.main.show('world');
    if (!sc) makeScene(); else applyState();
    zone = null; lastTile = '';
    sc.start();
  };
  M.halt = function () { if (sc) { sc.stop(); sc.locked = false; } };
  // A story fight's way back to the mountain (js/ch1-world.js calls it instead of re-entering the summit).
  M.back = function (onWin) { M.enter(); return act(onWin); };
  M.lost = function (back) { M.enter(); if (back) sc.place('you', back[0], back[1]); return act(() => say(CS.lostStory)); };
  // A new game: the prologue has played; wake up at the foot of the mountain.
  M.start = async function () {
    M.enter();
    await act(async () => {
      const P = sc.P;
      P.face = 'north';
      await wait(400);
      await walk('freya', P.x, P.y - 2);
      faceTo('freya', 'you');
      AU.music('freya');
      await say(T.wake);
      setFlag('m_wake');
      await walk('freya', HOME.freya[0], HOME.freya[1]);
      sc.actors.freya.face = 'south';
      U.system('[COLDSTART] YOUR KIT', 'The supply cart is by the welcome hut.');
      AU.music('camp');
    });
  };
  M.resume = function () { M.enter(); if (!flag('m_wake')) M.start(); };

  // For tools/ch1_check.js.
  M.debug = { busy: () => busy, scene: () => sc, act, place: (x, y) => sc && sc.place('you', x, y), flags: o => { Object.assign(f(), o); S.persist(); if (sc) applyState(); } };
})();
