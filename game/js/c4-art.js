// Chapter 4's pictures, all drawn in code: the Sealed Floors' overworld (js/c4-world.js) in chapter 1's overworld kit
// (32 units to a tile, people and props standing on the bottom edge of their footprint): the Alliance's mountain
// town where every record is sealed, the Gate Passes and the Hidden Valley, the ruins of Burning Peak, Namgung's house
// and the Free Cloud's camp; the new faces walking and in the visual novel (js/vec-cast.js's kit); the chapter's
// stills; the enemies of the four expeditions (120 x 120 SVG, as js/ch1-mines-art.js); and, while a chapter 4 raid
// plays, vector stand-ins for the raid engine's painted backdrop, fighters and map.
// Sealed things are drawn with a faint line of red sealing script, like the one under everyone's ear.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const A = SD.c4art = {};
  const ART = SD.c1art;
  const INK = '#2b2340';
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

  // ---------- Drawing helpers (unit coordinates, as in js/ch1-art.js) ----------
  function P(ctx) {
    const p = {
      ctx,
      fill(c, line) { ctx.fillStyle = c; ctx.fill(); if (line !== false) { ctx.strokeStyle = INK; ctx.lineWidth = line || 1.2; ctx.stroke(); } return p; },
      stroke(c, w) { ctx.strokeStyle = c || INK; ctx.lineWidth = w || 1.2; ctx.stroke(); return p; },
      poly(...pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); return p; },
      line(...pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); return p; },
      circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); return p; },
      ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); return p; },
      rect(x, y, w, h, r) { ctx.beginPath(); if (r && ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); return p; },
      text(s, x, y, size, col, weight) { ctx.fillStyle = col || INK; ctx.font = `${weight || 700} ${size}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(s, x, y); return p; }
    };
    return p;
  }
  function frame(ctx, x, y, ts, fn) {
    ctx.save(); ctx.translate(x, y); const u = ts / 32; ctx.scale(u, u);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    fn(P(ctx));
    ctx.restore();
  }
  // A line of red sealing script, the curse of these floors.
  const script = (g, x, y, w, t, a) => {
    for (let i = 0; i < w; i += 3) { const h = hash(i, y | 0); g.line(x + i, y + (h % 3) - 1, x + i + 2, y + ((h >> 3) % 3) - 1).stroke(`rgba(214,58,58,${a != null ? a : 0.55 + 0.25 * Math.sin(t * 2 + i)})`, 0.9); }
  };

  // ---------- People, walking ----------
  Object.assign(ART.LOOK, {
    jin: { skin: '#f0d0b4', hair: '#1a1418', hairD: '#0a0608', style: 'short', coat: '#6a2a2a', coatD: '#4a1a1a', under: '#f2efe8', legs: '#4a1a1a', boots: '#2a1a14', eye: '#3a2a20', sword: true, mouth: 'smile', brow: 'flat' },
    ryu: { skin: '#f0d6c0', hair: '#22202a', hairD: '#0e0d14', style: 'short', coat: '#e8e4dc', coatD: '#b8b2a8', under: '#4a6a9a', legs: '#4a5a7a', boots: '#2a2a34', eye: '#3a2a20', sash: '#4a6a9a', mouth: 'flat', brow: 'sad' },
    namgung: { skin: '#ecccb0', hair: '#c8c2cc', hairD: '#8a8490', style: 'short', coat: '#2c3a5a', coatD: '#1a2440', under: '#e8e4dc', eye: '#3a2a20', robe: true, mouth: 'flat', brow: 'flat', k: 1.08 },
    ok: { skin: '#f0d0b8', hair: '#1a1018', hairD: '#0a060c', style: 'bun', coat: '#8d1d29', coatD: '#5a1018', under: '#1a1018', eye: '#7a1f26', robe: true, mouth: 'smile', brow: 'flat' },
    lexi: { skin: '#f3dcc9', hair: '#5a3a8a', hairD: '#3a2260', style: 'bob', coat: '#2a2340', coatD: '#16121f', under: '#e8e4f4', legs: '#2a2340', boots: '#16121f', eye: '#8a6cff', patch: true, mouth: 'smile', brow: 'flat' },
    gu: { skin: '#e2b496', hair: '#a8a4a0', hairD: '#7a7672', style: 'bun', coat: '#6a5a3a', coatD: '#4a3e26', under: '#d8cdb4', eye: '#3a2a20', robe: true, mouth: 'smile', brow: 'flat' },
    master1: { skin: '#e8c4a8', hair: '#3a3036', hairD: '#1a1418', style: 'short', coat: '#e8e4dc', coatD: '#b8b2a8', under: '#2c3a5a', legs: '#2c3a5a', boots: '#1a1a24', eye: '#3a2a20', sword: true, mouth: 'flat', brow: 'knit' },
    master2: { skin: '#d8a888', hair: '#c8c2cc', hairD: '#8a8490', style: 'bun', coat: '#5a6a8a', coatD: '#3a4a6a', under: '#e8e4dc', eye: '#3a2a20', robe: true, mouth: 'flat', brow: 'knit' },
    townsman: { skin: '#e2b496', hair: '#4a3a2a', hairD: '#2a1e14', style: 'short', coat: '#7a8a6a', coatD: '#5a6a4a', under: '#e8dcc4', legs: '#4a3b2a', boots: '#2e2218', eye: '#3b2a20', mouth: 'flat', brow: 'sad' },
    townswoman: { skin: '#f0d0b4', hair: '#2a1d16', hairD: '#160c06', style: 'bun', coat: '#9a7a9a', coatD: '#7a5a7a', under: '#f1e7c6', eye: '#2a1a12', robe: true, mouth: 'flat', brow: 'sad' },
    cultist: { skin: '#e8c0a0', hair: '#1a1018', hairD: '#0a060c', style: 'short', coat: '#3a1a22', coatD: '#22101a', under: '#8d1d29', legs: '#22101a', boots: '#120a0e', eye: '#7a1f26', mouth: 'smile', brow: 'flat' },
    steward: { skin: '#e6c0a0', hair: '#5a5a62', hairD: '#3a3a42', style: 'short', coat: '#3a3a4a', coatD: '#26263a', under: '#e8e4dc', legs: '#26263a', boots: '#16161e', eye: '#3a2a20', mouth: 'flat', brow: 'flat' }
  });
  const basePerson = SD.c2art ? SD.c2art.person : ART.person;
  A.person = function (ctx, id, fx, fy, ts, t, face, moving, o) {
    basePerson(ctx, id, fx, fy, ts, t, face, moving, o);
    const L = ART.LOOK[id];
    // Lexi's eyepatch, over a perfectly good eye.
    if (L && L.patch && face !== 'north') frame(ctx, fx, fy, ts, g => { const s = face === 'west' ? -1 : 1; g.ell(-3 * s, -35, 2.6, 2.2).fill('#16121f', 0.6); g.line(-6 * s, -38, 6 * s, -36).stroke('#16121f', 0.8); });
    // Everyone on these floors wears a faint line of sealing script under one ear.
    if (L && o && o.seal && face !== 'north') frame(ctx, fx, fy, ts, g => script(g, 2, -29, 5, t, 0.7));
  };

  // ---------- The ground ----------
  const ROCK = ['#9a98a6', '#a3a1ae', '#94929f', '#a8a6b2'], SNOW = ['#e8ecf4', '#e2e6f0', '#eef1f7', '#dde2ec'], GRASS = ['#7fa66a', '#79a064', '#85ab6f', '#73995f'];
  const ASH = ['#5a5250', '#625a56', '#55504e', '#6a605a'], WOOD = ['#a8845a', '#a07c54', '#ae8a60', '#9a7650'];
  A.ground = function (ctx, ch, x, y, ts, t, nb, zone) {
    const X = x * ts, Y = y * ts, h = hash(x, y), u = ts / 32;
    const fill = c => { ctx.fillStyle = c; ctx.fillRect(X, Y, ts + 1, ts + 1); };
    if (ch === 'V') {
      fill('#141226');
      if (h % 5 === 0) { ctx.fillStyle = `rgba(220,226,255,${0.3 + 0.3 * Math.sin(t * 1.4 + h)})`; ctx.fillRect(X + (h % 29) / 29 * ts, Y + ((h >> 5) % 31) / 31 * ts, u * 1.3, u * 1.3); }
      // Cloud below the passes.
      ctx.fillStyle = 'rgba(200,206,230,.08)'; ctx.beginPath(); ctx.ellipse(X + ts / 2 + Math.sin(t * 0.3 + y) * ts * 0.3, Y + ts / 2, ts * 0.8, ts * 0.25, 0, 0, 7); ctx.fill();
      return;
    }
    if (ch === 'r') {
      fill('#4a7aa8');
      ctx.strokeStyle = 'rgba(220,240,255,.45)'; ctx.lineWidth = u;
      const o = (t * 12 + x * 7) % ts;
      ctx.beginPath(); ctx.moveTo(X, Y + ts * 0.3 + Math.sin(t * 2 + x) * 2); ctx.lineTo(X + ts, Y + ts * 0.3 + Math.sin(t * 2 + x + 1) * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X + o * 0.3, Y + ts * 0.7); ctx.lineTo(X + o * 0.3 + ts * 0.4, Y + ts * 0.7); ctx.stroke();
      return;
    }
    if (ch === 'b') {
      fill('#4a7aa8');
      ctx.fillStyle = '#b57a45'; ctx.fillRect(X, Y + ts * 0.1, ts + 1, ts * 0.8);
      ctx.strokeStyle = '#7a4c28'; ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X + i * ts / 4, Y + ts * 0.1); ctx.lineTo(X + i * ts / 4, Y + ts * 0.9); ctx.stroke(); }
      return;
    }
    if (ch === 'c') {
      fill(h % 2 ? '#c4bcb0' : '#bcb4a8');
      ctx.strokeStyle = 'rgba(43,35,64,.15)'; ctx.lineWidth = 1;
      const o = (y % 2) * ts / 4;
      for (let i = -1; i < 3; i++) ctx.strokeRect(X + o + i * ts / 2 + 0.5, Y + 0.5, ts / 2, ts / 2);
      for (let i = -1; i < 3; i++) ctx.strokeRect(X - o + i * ts / 2 + ts / 4 + 0.5, Y + ts / 2 + 0.5, ts / 2, ts / 2);
      return;
    }
    if (ch === 'w') {
      fill(WOOD[h % 4]);
      ctx.strokeStyle = 'rgba(60,36,20,.3)'; ctx.lineWidth = u;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X, Y + i * ts / 4); ctx.lineTo(X + ts, Y + i * ts / 4); ctx.stroke(); }
      if (h % 3 === 0) { ctx.beginPath(); ctx.moveTo(X + (h % 7) / 7 * ts, Y); ctx.lineTo(X + (h % 7) / 7 * ts, Y + ts / 4); ctx.stroke(); }
      return;
    }
    if (ch === 'a') {
      fill(ASH[h % 4]);
      if (h % 5 === 0) { ctx.fillStyle = 'rgba(255,120,60,' + (0.25 + 0.2 * Math.sin(t * 3 + h)) + ')'; ctx.fillRect(X + (h % 23) / 23 * ts * 0.8, Y + (h % 19) / 19 * ts * 0.8, 2 * u, 2 * u); }
      if (h % 7 === 1) { ctx.strokeStyle = 'rgba(20,16,20,.5)'; ctx.lineWidth = 2 * u; ctx.beginPath(); ctx.moveTo(X + ts * 0.2, Y + ts * 0.7); ctx.lineTo(X + ts * 0.7, Y + ts * 0.55); ctx.stroke(); }
      return;
    }
    if (ch === 'g' || ch === 'f') {
      fill(GRASS[h % 4]);
      if (h % 6 === 0) { ctx.strokeStyle = '#5a8448'; ctx.lineWidth = u * 1.2; const tx = X + (h % 23) / 23 * ts * 0.7 + ts * 0.15, ty = Y + (h % 17) / 17 * ts * 0.6 + ts * 0.3; ctx.beginPath(); ctx.moveTo(tx - 3, ty); ctx.lineTo(tx - 1, ty - 5); ctx.moveTo(tx, ty); ctx.lineTo(tx + 1, ty - 6); ctx.stroke(); }
      if (ch === 'f') for (let i = 0; i < 3; i++) { const hx = hash(x * 3 + i, y * 5 - i); ctx.fillStyle = ['#f0b0c0', '#f4e0a0', '#ffffff'][hx % 3]; ctx.beginPath(); ctx.arc(X + (hx % 29) / 29 * ts, Y + (hx % 31) / 31 * ts, u * 1.8, 0, 7); ctx.fill(); }
      return;
    }
    // Mountain rock, with snow in the high passes; a stone path over either.
    const high = zone === 'pass' || zone === 'valley';
    fill(high ? SNOW[h % 4] : ROCK[h % 4]);
    if (h % 5 === 0) { ctx.fillStyle = high ? 'rgba(150,160,190,.35)' : 'rgba(43,35,64,.18)'; ctx.beginPath(); ctx.ellipse(X + (h % 23) / 23 * ts, Y + (h % 19) / 19 * ts, 3 * u, 1.6 * u, 0, 0, 7); ctx.fill(); }
    if (ch === ',') {
      ctx.fillStyle = high ? '#b8b4c4' : '#cdbf9e';
      const r = ts * 0.42, isP = c => c === ',' || c === 'b' || /[A-Z]/.test(c) && c !== 'T' && c !== 'R' && c !== 'V';
      ctx.beginPath(); ctx.arc(X + ts / 2, Y + ts / 2, r, 0, 7); ctx.fill();
      if (isP(nb(1, 0))) ctx.fillRect(X + ts / 2, Y + ts / 2 - r, ts / 2 + 1, r * 2);
      if (isP(nb(-1, 0))) ctx.fillRect(X, Y + ts / 2 - r, ts / 2, r * 2);
      if (isP(nb(0, 1))) ctx.fillRect(X + ts / 2 - r, Y + ts / 2, r * 2, ts / 2 + 1);
      if (isP(nb(0, -1))) ctx.fillRect(X + ts / 2 - r, Y, r * 2, ts / 2);
    }
  };
  // What a 'T' tile is depends on where it is: pines and boulders on the mountain, the town's walls, charred posts in
  // the ruins, the house's clipped hedges, the camp's trees.
  A.wall = function (ctx, x, y, ts, t, zone) {
    const X = x * ts, Y = y * ts, h = hash(x, y);
    if (zone === 'town' || zone === 'hall') {
      ctx.fillStyle = '#e8e2d6'; ctx.fillRect(X, Y - ts * 0.35, ts + 1, ts * 1.35);
      ctx.fillStyle = '#3a3a4a'; ctx.fillRect(X - 1, Y - ts * 0.5, ts + 2, ts * 0.2);
      ctx.strokeStyle = 'rgba(43,35,64,.25)'; ctx.lineWidth = 1; ctx.strokeRect(X + 0.5, Y - ts * 0.3, ts, ts * 1.3);
      return;
    }
    if (zone === 'ruins') return frame(ctx, X, Y + ts, ts, g => {
      g.ell(16, -1, 10, 3).fill('rgba(20,16,20,.3)', false);
      g.poly(11, 0, 13, -30 - h % 10, 19, -26 - h % 8, 21, 0).fill(h % 2 ? '#2a2226' : '#3a2e2a');
      g.line(14, -10, 18, -16).stroke('rgba(255,120,60,.35)', 1);
    });
    if (zone === 'house') return frame(ctx, X, Y + ts, ts, g => {
      g.rect(1, -22, 30, 22, 6).fill('#4a7a4a'); g.rect(4, -20, 24, 8, 4).fill('#5a8a5a', false);
    });
    if (zone === 'camp') return ART.prop(ctx, { kind: 'tree', x, y, w: 1, h: 1 }, ts, t);
    if (h % 3 === 0) return ART.prop(ctx, { kind: 'rock', x, y, w: 1, h: 1 }, ts, t);
    frame(ctx, X, Y + ts, ts, g => {
      const sway = Math.sin(t * 1.1 + h) * 0.6, snow = zone === 'pass' || zone === 'valley';
      g.ell(16, -1, 11, 3).fill('rgba(43,35,64,.2)', false);
      g.rect(14, -9, 4, 9).fill('#6a4a2a');
      [[-46, 12], [-36, 15], [-25, 17]].forEach(([yy, w]) => { g.poly(16 + sway, yy - 12, 16 + w, yy + 8, 16 - w, yy + 8).fill('#2f6a4a'); if (snow) g.poly(16 + sway, yy - 12, 16 + w * 0.5, yy - 2, 16 - w * 0.5, yy - 2).fill('#f2f4fa', false); });
    });
  };

  // ---------- Props ----------
  const PR = {};
  A.prop = function (ctx, p, ts, t) {
    if (p.hidden) return;
    const f = PR[p.kind];
    if (!f) return ART.prop(ctx, p, ts, t);
    frame(ctx, p.x * ts, (p.y + (p.h || 1)) * ts, ts, g => f(g, p, t));
  };
  // A hanok roof: dark tiles that curve up at the ends.
  const roof = (g, x0, x1, y, rise, col) => {
    g.ctx.beginPath(); g.ctx.moveTo(x0 - 6, y); g.ctx.quadraticCurveTo(x0 + 4, y - 4, x0 + 10, y - rise); g.ctx.lineTo(x1 - 10, y - rise); g.ctx.quadraticCurveTo(x1 - 4, y - 4, x1 + 6, y); g.ctx.closePath(); g.fill(col || '#3a3a4a');
    for (let x = x0 + 6; x < x1 - 4; x += 6) g.line(x, y - 2, x + 2, y - rise + 2).stroke('rgba(255,255,255,.12)', 1);
  };
  const house = (g, p, t, o) => {
    const W = p.w * 32, H = p.h * 32;
    g.ell(W / 2, -1, W * 0.48, 4).fill('rgba(43,35,64,.2)', false);
    g.rect(4, -H * 0.62, W - 8, H * 0.62).fill(o.wall || '#ece4d4');
    for (let x = 10; x < W - 10; x += 14) g.rect(x, -H * 0.5, 9, H * 0.28).fill(o.win || '#c8a86a', 0.8);
    g.rect(W / 2 - 7, -H * 0.42, 14, H * 0.42).fill(o.door || '#6a4a2a');
    roof(g, 4, W - 4, -H * 0.6, H * 0.4, o.roof);
    if (o.sign) { g.rect(W / 2 - 16, -H * 0.98, 32, 9, 2).fill('#f6efd8', 0.8); g.text(o.sign, W / 2, -H * 0.98 + 7, 6, '#8a2a34'); }
    if (o.sealed) script(g, 8, -H * 0.2, W - 16, t);
  };
  PR.sealhouse = (g, p, t) => house(g, p, t, { roof: '#2c3a5a', sign: 'SEAL-HOUSE', sealed: !p.open });
  PR.succhall = (g, p, t) => { house(g, p, t, { roof: '#5a2a2a', wall: '#f2ece0', sign: 'SUCCESSION HALL', win: '#e8c46a' }); g.rect(6, -4, p.w * 32 - 12, 4).fill('#a8a094'); };
  PR.teahouse = (g, p, t) => { house(g, p, t, { roof: '#5a1018', wall: '#e8d8c4', sign: 'TEA', win: '#ffcf7a' }); g.circle(p.w * 32 - 8, -p.h * 32 * 0.5, 4).fill('#d63a3a'); };
  PR.hanok = (g, p, t) => house(g, p, t, { roof: p.roof || '#3a3a4a', wall: p.wall || '#ece4d4', sealed: p.sealed });
  PR.namgung = (g, p, t) => { house(g, p, t, { roof: '#1a2440', wall: '#f6f0e6', sign: 'NAMGUNG', win: '#e8c46a' }); g.rect(2, -3, p.w * 32 - 4, 3).fill('#8a8478'); };
  PR.burned = (g, p, t) => {
    const W = p.w * 32, H = p.h * 32;
    g.rect(4, -H * 0.5, W - 8, H * 0.5).fill('#3a302c');
    g.poly(2, -H * 0.5, 10, -H * 0.9, 18, -H * 0.55, W * 0.5, -H * 0.85, W - 14, -H * 0.5).fill('#2a2226');
    for (let x = 8; x < W - 8; x += 10) g.line(x, -H * 0.5, x + 3, -H * 0.2).stroke('rgba(255,120,60,.25)', 1.5);
    g.ell(W / 2, -H * 0.3, 6 + Math.sin(t * 4) * 1, 3).fill('rgba(255,140,60,.3)', false);
  };
  PR.yardpost = (g, p) => { g.rect(13, -26, 6, 26).fill('#6a4a2a'); g.rect(9, -20, 14, 3).fill('#7a5a3a'); };
  // A knowledge gate: an arch with its rule written on a plaque. Open when you've understood it.
  PR.kgate = (g, p, t) => {
    const W = p.w * 32, open = p.open, col = p.col || '#6a4a8a';
    g.rect(0, -44, 6, 44).fill('#7a7484'); g.rect(W - 6, -44, 6, 44).fill('#7a7484');
    g.rect(-3, -50, W + 6, 8, 2).fill(col);
    g.rect(W / 2 - 14, -62, 28, 12, 2).fill('#f6efd8', 0.8); g.text(p.label || 'RULE', W / 2, -53, 6.5, '#2b2340');
    if (!open) {
      g.rect(6, -40, W - 12, 40).fill('rgba(214,58,58,.25)', false);
      for (let i = 0; i < 4; i++) script(g, 8, -34 + i * 9, W - 16, t + i);
      g.circle(W / 2, -20, 5).fill('#ffd24a', 1); g.rect(W / 2 - 1, -20, 2, 6).fill(INK, false);
    } else g.line(6, -2, W - 6, -2).stroke('rgba(127,224,160,.6)', 2);
  };
  // A raid entrance: a dark gate with a lantern either side.
  PR.raidgate = (g, p, t) => {
    const W = p.w * 32;
    g.rect(2, -58, W - 4, 58).fill('#4a4458'); g.rect(10, -46, W - 20, 46).fill(p.open ? '#120f1c' : '#2a2436');
    roof(g, 0, W, -56, 14, '#2a2436');
    [6, W - 6].forEach(x => { g.rect(x - 3, -30, 6, 10, 2).fill('#ffcf7a', 0.8); g.ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 5 + x); g.circle(x, -25, 9).fill('#ffcf7a', false); g.ctx.globalAlpha = 1; });
    if (p.label) { g.rect(W / 2 - 22, -72, 44, 11, 2).fill('#f6efd8', 0.8); g.text(p.label, W / 2, -64, 6, '#2b2340'); }
  };
  // The Sealed Archive: a vault in the valley rock.
  PR.vault = (g, p, t) => {
    const W = p.w * 32;
    g.poly(0, 0, 4, -50, W / 2, -64, W - 4, -50, W, 0).fill('#6a6878');
    g.rect(W / 2 - 16, -40, 32, 40, 4).fill(p.open ? '#14101f' : '#8a6a3a');
    if (!p.open) { script(g, W / 2 - 14, -30, 28, t); script(g, W / 2 - 14, -20, 28, t + 1); g.circle(W / 2, -12, 4).fill('#ffd24a'); }
    else { g.ctx.globalAlpha = 0.4 + 0.15 * Math.sin(t * 3); g.circle(W / 2, -20, 12).fill('#c9a0ff', false); g.ctx.globalAlpha = 1; }
  };
  PR.library = (g, p, t) => { house(g, p, t, { roof: '#3a2260', wall: '#e8e4f4', sign: 'LIBRARY', win: '#c9a0ff' }); };
  PR.lift = (g, p, t) => {
    g.rect(2, -54, 28, 54).fill('#5a5468'); g.rect(6, -48, 20, 48).fill(p.open === false ? '#3a3448' : '#1a1628');
    g.line(16, -54, 16, -80).stroke('#8a8494', 2); g.rect(9, -8 - (Math.sin(t) + 1) * 4, 14, 6).fill('#c8a24a', 0.8);
    g.text('LIFT', 16, -57, 6, '#f6efd8');
  };
  PR.plum = (g, p, t) => {
    const h = hash(p.x, p.y);
    g.ell(16, -1, 12, 3).fill('rgba(43,35,64,.2)', false); g.rect(14, -18, 4, 18).fill('#5a3a2a');
    g.circle(16, -28, 13).fill('#7a5a6a'); [[-8, -30], [6, -36], [9, -24], [-3, -38], [0, -22]].forEach(([dx, dy], i) => g.circle(16 + dx, dy, 2.2).fill(['#ffd0dc', '#ffffff', '#f4a8bc'][(h + i) % 3], false));
  };
  PR.banner = (g, p, t) => { g.rect(14, -40, 3, 40).fill('#6a4a2a'); g.ctx.beginPath(); g.ctx.moveTo(17, -38); g.ctx.quadraticCurveTo(26 + Math.sin(t * 2) * 2, -32, 30, -36); g.ctx.lineTo(30, -18); g.ctx.quadraticCurveTo(24, -20, 17, -20); g.ctx.closePath(); g.fill(p.col || '#e8e4dc'); };
  PR.seat = (g) => { g.rect(2, -10, 28, 6, 2).fill('#7a5a3a'); g.rect(4, -4, 3, 4).fill('#5a3a2a'); g.rect(25, -4, 3, 4).fill('#5a3a2a'); };
  PR.bookcart = (g, p, t) => { g.rect(3, -20, 26, 14, 2).fill('#5a3a8a'); for (let i = 0; i < 6; i++) g.rect(5 + i * 4, -28, 3, 9).fill(['#d63a3a', '#ffd24a', '#7fd0ff', '#7fe0a0'][i % 4], 0.6); g.circle(8, -3, 3).fill('#3a3448'); g.circle(24, -3, 3).fill('#3a3448'); };
  // A page of Jin's forms: the chapter's collectible, a scrap of paper with a stick-figure stance on it.
  PR.page = (g, p, t) => {
    const b = Math.sin(t * 3 + p.x) * 1.5;
    g.ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4 + p.y); g.circle(16, -12 + b, 10).fill('#ffe28a', false); g.ctx.globalAlpha = 1;
    g.poly(9, -6 + b, 23, -8 + b, 22, -22 + b, 8, -20 + b).fill('#f6efd8', 0.8);
    g.circle(15.5, -18 + b, 1.5).stroke(INK, 0.7); g.line(15.5, -16.5 + b, 15.5, -12 + b, 12, -9 + b).stroke(INK, 0.7); g.line(15.5, -12 + b, 19, -9 + b).stroke(INK, 0.7); g.line(12, -15 + b, 19, -14 + b).stroke(INK, 0.7);
  };
  PR.knife = (g) => { g.rect(10, -6, 12, 3, 1).fill('#3a2a2a'); g.line(22, -4.5, 29, -4.5).stroke('#c8c8d0', 1.6); };
  PR.desk = (g) => { g.rect(2, -16, 28, 6, 2).fill('#6a4a2a'); g.rect(4, -10, 3, 10).fill('#5a3a1a'); g.rect(25, -10, 3, 10).fill('#5a3a1a'); g.rect(18, -22, 6, 6).fill('#ffcf7a', 0.6); };
  PR.ledger = (g, p, t) => { g.rect(6, -14, 20, 12, 2).fill('#2c3a5a'); g.line(16, -14, 16, -2).stroke('#e8e4dc', 1); script(g, 8, -8, 16, t, 0.5); };

  // ---------- The grade ----------
  const PHASE = { dawn: { mul: 'rgba(230,190,200,.9)', warm: 'rgba(60,24,30,.08)', vig: 0.5 }, day: { mul: 'rgba(250,248,255,1)', warm: null, vig: 0.3 },
    dusk: { mul: 'rgba(200,170,190,.9)', warm: 'rgba(60,30,20,.08)', vig: 0.55 }, night: { mul: 'rgba(90,100,150,.95)', warm: null, vig: 0.7 } };
  // fx(stage), if given, paints the map's weather (js/weather.js): stage 0 under the lamps, stage 1 over them, both
  // under the vignette.
  A.grade = function (ctx, t, vw, vh, cx, cy, ts, phase, lights, fx) {
    const ph = PHASE[phase] || PHASE.day;
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ph.mul; ctx.fillRect(0, 0, vw, vh);
    if (fx) { ctx.globalCompositeOperation = 'source-over'; fx(0); }
    ctx.globalCompositeOperation = 'lighter';
    if (ph.warm) { ctx.fillStyle = ph.warm; ctx.fillRect(0, 0, vw, vh); }
    (lights || []).forEach(([x, y, r, rgb, flick]) => {
      const X = x * ts - cx, Y = y * ts - cy, R = r * ts * (1 + (flick ? Math.sin(t * 9 + x) * 0.05 : 0));
      if (X < -R || X > vw + R || Y < -R || Y > vh + R) return;
      const gr = ctx.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gr; ctx.fillRect(X - R, Y - R, R * 2, R * 2);
    });
    ctx.globalCompositeOperation = 'source-over';
    if (fx) fx(1);
    const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    vg.addColorStop(0, 'rgba(10,8,18,0)'); vg.addColorStop(1, `rgba(8,6,14,${ph.vig})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, vw, vh);
  };

  // ---------- The new faces, in the visual novel ----------
  const { p, c } = K;
  Object.assign(K.cast, {
    ryu: { skin: '#f0d6c0', skinD: '#d8b8a0', hair: '#22202a', hairD: '#0e0d14', hairL: '#3e3a48', eye: '#3a2a20', style: 'short', coat: '#e8e4dc', coatD: '#b8b2a8', under: '#4a6a9a', collar: 'cross' },
    namgung: { skin: '#ecccb0', skinD: '#d0ae92', skinD2: '#b48e72', hair: '#c8c2cc', hairD: '#8a8490', hairL: '#f2eef4', eye: '#3a2a20', style: 'slick', beard: true, age: 1, k: 1.1, coat: '#2c3a5a', coatD: '#1a2440', under: '#e8e4dc', collar: 'cross', robe: true },
    ok: { skin: '#f0d0b8', skinD: '#d8b098', hair: '#1a1018', hairD: '#0a060c', hairL: '#3a2a3a', eye: '#7a1f26', style: 'long', coat: '#8d1d29', coatD: '#5a1018', under: '#1a1018', collar: 'v', robe: true, blush: 0.3,
      over: () => p('M180 120 L200 96 L220 120', null, '#e2bd4f', 4) + c(200, 92, 6, '#e2bd4f', INK, 2) },
    lexi: { skin: '#f3dcc9', skinD: '#dcbfa9', hair: '#5a3a8a', hairD: '#3a2260', hairL: '#8a6aba', eye: '#8a6cff', style: 'bob', coat: '#2a2340', coatD: '#16121f', under: '#e8e4f4', collar: 'high', blush: 0.3,
      over: () => p('M214 196 C214 182 246 182 246 196 C246 210 214 210 214 196Z', '#16121f', INK, 2.5) + p('M160 180 L214 192 M246 192 L262 186', null, '#16121f', 3) },
    gu: { skin: '#e2b496', skinD: '#c8957a', skinD2: '#a87660', hair: '#a8a4a0', hairD: '#7a7672', hairL: '#d8d4d0', eye: '#3a2a20', style: 'elder', beard: true, age: 1, coat: '#6a5a3a', coatD: '#4a3e26', under: '#d8cdb4', collar: 'cross', robe: true, blush: 0.5 }
  });
  Object.assign(SD.cast, {
    ryu: { name: 'Namgung Ryu', title: 'Namgung\'s son' }, namgung: { name: 'Namgung Hyeon', title: 'Alliance Leader' }, ok: { name: 'Madam Ok', title: 'The Cult\'s Left Hand' },
    lexi: { name: 'Lexi', title: 'Librarian' }, gu: SD.cast.gu || { name: 'Old Gu', title: 'Burning Peak' }, steward: { name: 'The Steward', title: 'Namgung\'s house' },
    master1: { name: 'Master Baek', title: 'Murim Alliance' }, master2: { name: 'Master Seol', title: 'Murim Alliance' }, cultist: { name: 'A Cult courier', title: 'Demon Cult' },
    townsman: { name: 'A townsman', title: 'Floor 41' }, townswoman: { name: 'A townswoman', title: 'Floor 41' }, uptima: SD.cast.uptima
  });
  [['ryu', 560], ['namgung', 300], ['ok', 820], ['lexi', 1050], ['steward', 420], ['master1', 380], ['master2', 460], ['cultist', 700], ['townsman', 480], ['townswoman', 760]].forEach(([w, hz]) => SD.ui.voice && SD.ui.voice(w, hz));
  const sprite = (id, faces) => ({ faces: Object.fromEntries(faces.map(f => [f, K.fig(id, f, 'bust')])) });
  SD.vn.addSprites({
    ryu: sprite('ryu', ['neutral', 'sad', 'warm', 'earnest', 'shock']), namgung: sprite('namgung', ['neutral', 'cold', 'warm', 'sad', 'stone']),
    ok: sprite('ok', ['neutral', 'smile', 'amused', 'cold', 'warm']), lexi: sprite('lexi', ['neutral', 'smile', 'happy', 'shock', 'earnest']),
    gu: sprite('gu', ['neutral', 'smile', 'warm']), jin: sprite('jin', ['neutral', 'smirk']), seoyeon: sprite('seoyeon', ['neutral', 'frozen', 'grief', 'anger', 'sad', 'warm', 'cold', 'tired'])
  });

  // ---------- Stills ----------
  const S = {};
  const sky = K.skyL, R = K.r, T = K.t, G = K.g, E = K.e;
  const peaks = (y, col, seed, amp, snow) => { const rg = K.rng(seed); let d = `M0 1200 L0 ${y}`, s = ''; for (let x = 0; x <= 1200; x += 150) { const top = y - rg() * amp; d += ` L${x + 75} ${top.toFixed(0)} L${x + 150} ${(y + (rg() - 0.5) * amp * 0.3).toFixed(0)}`; if (snow) s += p(`M${x + 50} ${(top + 40).toFixed(0)} L${x + 75} ${top.toFixed(0)} L${x + 100} ${(top + 40).toFixed(0)}Z`, '#f2f4fa', null, null, 0.9); } return p(d + ' L1200 1200Z', col, K.NIGHT, 3) + s; };
  const hanokS = (x, y, w, col) => G(R(-w / 2 + 20, -150, w - 40, 150, '#ece4d4', K.NIGHT, 3) + p(`M${-w / 2} -150 Q${-w / 2 + 30} -160 ${-w / 2 + 50} -220 L${w / 2 - 50} -220 Q${w / 2 - 30} -160 ${w / 2} -150Z`, col || '#2c3a5a', K.NIGHT, 3) + R(-30, -110, 60, 110, '#6a4a2a', K.NIGHT, 3), `translate(${x} ${y})`);
  // Cold open: Burning Peak at dawn, the yard, and far below, smoke on the road.
  S['c4-dawn'] = K.scene([sky('c4d', '#3a2a5a', '#ffb88a', '#e88aa0'), c(820, 560, 110, '#ffe0b0', null, null, 0.7),
    peaks(640, '#6a4a6a', 3, 220, true), peaks(760, '#4a3a50', 7, 120), R(0, 820, 1200, 380, '#8a7a6a'),
    hanokS(300, 830, 360, '#4a2a2a'), G(R(-6, -160, 12, 160, '#6a4a2a', K.NIGHT, 3) + R(-40, -120, 80, 10, '#7a5a3a', K.NIGHT, 3), 'translate(760 960)'),
    p('M1040 760 C1020 700 1060 660 1030 600 C1010 560 1050 520 1040 480', null, '#8a8494', 18, 0.35), K.vignette(1200, 1200, 0.5)]);
  // The Alliance's town: white walls, dark roofs, every door sealed.
  S['c4-town'] = K.scene([sky('c4t', '#9ab0d0', '#e8eef6'), peaks(560, '#7a8aa8', 11, 260, true), peaks(700, '#5a6a88', 13, 140),
    R(0, 760, 1200, 440, '#c4bcb0'), hanokS(260, 800, 340), hanokS(640, 780, 420, '#5a2a2a'), hanokS(1000, 810, 320),
    p(Array.from({ length: 12 }, (_, i) => `M${120 + i * 90} 740 l40 6`).join(' '), null, '#d63a3a', 3, 0.6), K.vignette(1200, 1200, 0.45)]);
  // The seal-house, where everyone's records are kept, and where Freya makes her offer.
  S['c4-sealhouse'] = K.scene([sky('c4s', '#2a2236', '#4a3a4a'), R(0, 0, 1200, 1200, '#3a2e2a'),
    ...Array.from({ length: 5 }, (_, i) => R(80 + i * 220, 220, 180, 640, '#5a4632', K.NIGHT, 3)),
    p(Array.from({ length: 60 }, (_, i) => `M${100 + (i % 5) * 220 + (i * 37) % 140} ${260 + Math.floor(i / 5) * 50} h28 v34 h-28Z`).join(' '), '#e8dcc0', K.NIGHT, 2, 0.85),
    p(Array.from({ length: 30 }, (_, i) => `M${110 + (i % 5) * 220 + (i * 53) % 130} ${280 + Math.floor(i / 5) * 100} l20 4`).join(' '), null, '#d63a3a', 3, 0.8),
    R(0, 900, 1200, 300, '#2a201c'), K.glow('c4sg', 600, 560, 500, '#ffcf7a', 0.25), K.vignette(1200, 1200, 0.75)]);
  // The Sealed Archive, opened: Lexi on a ladder in the dark, reading.
  S['c4-archive'] = K.scene([sky('c4a', '#1a1428', '#2a2040'), R(0, 0, 1200, 1200, '#1e1830'),
    ...Array.from({ length: 4 }, (_, i) => R(100 + i * 270, 120, 200, 860, '#3a2a50', K.NIGHT, 3)),
    p(Array.from({ length: 48 }, (_, i) => `M${110 + (i % 4) * 270 + (i * 31) % 160} ${150 + Math.floor(i / 4) * 68} h20 v52 h-20Z`).join(' '), '#8a6aba', K.NIGHT, 2, 0.8),
    G(p('M-60 0 L-20 -520 M60 0 L20 -520', null, '#8a6a3a', 10) + p('M-50 -60 h100 M-46 -140 h92 M-42 -220 h84 M-38 -300 h76 M-34 -380 h68', null, '#8a6a3a', 8), 'translate(820 1000)'),
    K.glow('c4ag', 820, 460, 420, '#c9a0ff', 0.35), K.vignette(1200, 1200, 0.8)]);
  // The ruins of Burning Peak: the yard in ash, black posts, the master's room roofless.
  S['c4-ruins'] = K.scene([sky('c4r', '#5a4a5a', '#c8a090'), peaks(620, '#5a4a50', 17, 200, true), R(0, 760, 1200, 440, '#5a5250'),
    ...Array.from({ length: 9 }, (_, i) => p(`M${100 + i * 120} 900 L${108 + i * 120} ${700 - (i * 37) % 120} L${126 + i * 120} ${720 - (i * 53) % 90} L${134 + i * 120} 900Z`, '#2a2226', K.NIGHT, 3)),
    G(R(-200, -140, 400, 140, '#3a302c', K.NIGHT, 3) + p('M-210 -140 L-120 -260 L-40 -150 L80 -240 L200 -140Z', '#2a2226', K.NIGHT, 3), 'translate(600 860)'),
    p('M300 640 C280 560 330 520 300 440 M900 660 C880 600 930 560 910 480', null, '#8a8494', 14, 0.3), K.vignette(1200, 1200, 0.55)]);
  // Old Gu's letter under the floorboards.
  S['c4-letter'] = K.scene([sky('c4l', '#2a1c12', '#0a0806'), R(0, 0, 1200, 1200, '#3a2818'),
    ...Array.from({ length: 7 }, (_, i) => R(0, 120 + i * 150, 1200, 140, i === 4 ? '#1a100a' : '#6a4a2c', K.NIGHT, 3)),
    G(p('M-170 -60 L170 -70 L176 60 L-164 70Z', '#f2ead8', K.NIGHT, 3) + p('M-170 -60 L4 6 L170 -70', null, K.NIGHT, 3) + c(0, 4, 20, '#8a2a34', K.NIGHT, 2) + p('M-120 40 l60 4 M-120 52 l90 2', null, '#d63a3a', 3, 0.7), 'translate(600 790) rotate(-3)'),
    K.glow('c4lg', 600, 760, 520, '#ff9a3a', 0.3), K.vignette(1200, 1200, 0.9)]);
  // The succession hall: the whole Alliance in rows, Namgung on the dais.
  S['c4-hall'] = K.scene([sky('c4h', '#3a2a2a', '#5a3a2a'), R(0, 0, 1200, 1200, '#4a2a22'),
    ...Array.from({ length: 6 }, (_, i) => R(60 + i * 200, 100, 40, 900, '#7a2a22', K.NIGHT, 3)),
    R(300, 520, 600, 60, '#8a6a3a', K.NIGHT, 3), R(0, 840, 1200, 360, '#2a1a16'),
    p(Array.from({ length: 24 }, (_, i) => `M${80 + (i % 12) * 95} ${i < 12 ? 900 : 990} c0 -40 40 -40 40 0Z`).join(' '), '#e8e4dc', K.NIGHT, 2, 0.8),
    K.glow('c4hg', 600, 480, 420, '#ffcf7a', 0.3), K.vignette(1200, 1200, 0.7)]);
  // The camp at the tower's foot, at night: the fire, the tents, the lift.
  S['c4-camp'] = K.scene([sky('c4c', '#0e0c18', '#1a1420'), K.stars(1200, 600, 120, 41, 0.8), R(0, 760, 1200, 440, '#1e2414'),
    G(p('M-160 0 L0 -200 L160 0Z', '#5a4a7a', K.NIGHT, 4), 'translate(250 860)'), G(p('M-130 0 L0 -170 L130 0Z', '#4a5a7a', K.NIGHT, 4), 'translate(950 870)'),
    G(p('M-50 10 L50 -6 M-46 -6 L48 12', null, '#4a2c16', 12) + p('M-36 0 C-46 -46 -18 -72 0 -120 C10 -82 36 -64 36 0Z', '#ff8a2a', K.NIGHT, 3) + p('M-16 0 C-20 -28 -6 -46 0 -72 C8 -46 20 -28 16 0Z', '#ffe08a'), 'translate(600 960) scale(1.2)'),
    K.glow('c4cg', 600, 900, 460, '#ff9a3a', 0.45), K.vignette(1200, 1200, 0.65)]);
  // The summer house in the high passes, in snow.
  S['c4-summer'] = K.scene([sky('c4u', '#8a9ab8', '#e8eef6'), peaks(520, '#8a9ab8', 23, 260, true), R(0, 780, 1200, 420, '#eef1f7'), hanokS(600, 820, 460, '#1a2440'),
    K.rain(1200, 1200, 90, 5, '#ffffff', 0.5), K.vignette(1200, 1200, 0.45)]);
  // The training yard at dawn, after: the school, open to both families.
  S['c4-school'] = K.scene([sky('c4k', '#4a3a6a', '#ffc89a', '#f0a0a8'), c(600, 600, 120, '#ffe8c0', null, null, 0.7), peaks(660, '#6a5a7a', 29, 160, true),
    R(0, 780, 1200, 420, '#a8946a'), G(R(-6, -160, 12, 160, '#6a4a2a', K.NIGHT, 3) + R(-40, -120, 80, 10, '#7a5a3a', K.NIGHT, 3), 'translate(300 940)'),
    G(R(-6, -160, 12, 160, '#6a4a2a', K.NIGHT, 3) + R(-40, -120, 80, 10, '#7a5a3a', K.NIGHT, 3), 'translate(900 940)'),
    p(Array.from({ length: 10 }, (_, i) => `M${180 + i * 90} 1000 c0 -60 30 -60 30 0Z`).join(' '), '#e8e4dc', K.NIGHT, 2) + p(Array.from({ length: 6 }, (_, i) => `M${225 + i * 150} 1040 c0 -60 30 -60 30 0Z`).join(' '), '#8d1d29', K.NIGHT, 2),
    K.vignette(1200, 1200, 0.4)]);
  A.scenes = S;
  SD.vn.addScenes(Object.fromEntries(Object.keys(S).map(k => [k, { src: S[k], label: k }])));

  // ---------- Enemies ----------
  // A few bodies, each with its own colours and a tag that says what it is.
  const SS = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const eyes = (x1, x2, y, r) => `<circle cx="${x1}" cy="${y}" r="${r || 4}" fill="#fff" ${SS}/><circle cx="${x2}" cy="${y}" r="${r || 4}" fill="#fff" ${SS}/><circle cx="${x1 + 1}" cy="${y + 1}" r="1.8" fill="${INK}"/><circle cx="${x2 - 1}" cy="${y + 1}" r="1.8" fill="${INK}"/>`;
  const tag = (t, col, y) => { const w = Math.max(44, t.length * 5.4 + 10); return `<rect x="${60 - w / 2}" y="${y || 100}" width="${w}" height="15" rx="4" fill="#fff8e0" stroke="${col || INK}" stroke-width="2"/><text x="60" y="${(y || 100) + 11}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="${col || INK}">${K.esc(t)}</text>`; };
  const seal = (x, y, w) => `<path d="${Array.from({ length: Math.floor(w / 5) }, (_, i) => `M${x + i * 5} ${y + (i % 2 ? 1 : -1)} l3 ${i % 3 - 1}`).join(' ')}" stroke="#d63a3a" stroke-width="2" fill="none" opacity=".85"/>`;
  const BODY = {
    // A guard in lamellar armour with a spear.
    guard: (o) => `<g ${SS}><path d="M34 112 L38 64 H82 L86 112Z" fill="${o.col}"/><path d="M40 70 H80 M40 80 H80 M40 90 H80" fill="none" stroke-width="2"/><circle cx="60" cy="48" r="17" fill="${o.skin || '#e8c4a8'}"/><path d="M40 44 Q60 18 80 44 L76 36 Q60 28 44 36Z" fill="${o.col2 || '#3a3a4a'}"/><path d="M96 112 L96 20 M90 26 L96 12 L102 26" fill="none"/></g>${eyes(53, 67, 48, 3)}<path d="M54 58 H66" stroke="${INK}" stroke-width="2.5"/>`,
    // A stone gate with a face.
    gate: (o) => `<g ${SS}><path d="M12 112 V36 H108 V112 H84 V60 Q60 44 36 60 V112Z" fill="${o.col}"/><path d="M6 36 H114 L106 22 H14Z" fill="${o.col2 || '#3a3a4a'}"/></g>${eyes(48, 72, 74, 5)}<path d="M50 90 Q60 84 70 90" stroke="${INK}" stroke-width="3" fill="none"/>`,
    // A ghostly spirit, robes trailing.
    spirit: (o) => `<g ${SS}><path d="M30 110 Q36 100 30 90 Q20 50 60 30 Q100 50 90 90 Q84 100 90 110 Q80 102 72 110 Q66 100 60 110 Q54 100 48 110 Q40 102 30 110Z" fill="${o.col}" opacity=".9"/></g>${eyes(50, 70, 60, 5)}<path d="M52 76 Q60 82 68 76" stroke="${INK}" stroke-width="2.5" fill="none"/>`,
    // A floating scroll or sealed letter.
    scroll: (o) => `<g ${SS}><rect x="24" y="34" width="72" height="56" rx="4" fill="${o.col}"/><rect x="18" y="28" width="10" height="68" rx="4" fill="${o.col2 || '#8a6a3a'}"/><rect x="92" y="28" width="10" height="68" rx="4" fill="${o.col2 || '#8a6a3a'}"/></g>${eyes(48, 72, 56, 4)}<path d="M46 72 H74 M46 80 H66" stroke="${INK}" stroke-width="2"/>`,
    // A key with a face on its bow.
    key: (o) => `<g ${SS}><circle cx="44" cy="52" r="26" fill="${o.col}"/><circle cx="44" cy="52" r="9" fill="#fff8e0"/><path d="M68 52 H108 V62 H100 V72 H92 V62 H84 V68 H76 V58 H68Z" fill="${o.col}"/></g>${eyes(36, 52, 40, 3)}`,
    // A padlock with eyes.
    lock: (o) => `<g ${SS}><path d="M38 56 V40 Q38 18 60 18 Q82 18 82 40 V56" fill="none" stroke-width="6" stroke="${o.col2 || '#7a7484'}"/><rect x="26" y="52" width="68" height="54" rx="8" fill="${o.col}"/><circle cx="60" cy="80" r="7" fill="${INK}"/></g>${eyes(46, 74, 66, 4)}`,
    // A card or token, with a seal stamp.
    token: (o) => `<g ${SS}><rect x="22" y="26" width="76" height="62" rx="8" fill="${o.col}"/><circle cx="80" cy="44" r="10" fill="${o.col2 || '#ffd24a'}"/><path d="M32 70 H70 M32 78 H60" fill="none" stroke-width="2"/></g>${eyes(44, 60, 46, 4)}`,
    // A hulking beast of a road: a cart with teeth.
    beast: (o) => `<g ${SS}><path d="M16 96 Q14 54 60 46 Q106 54 104 96Z" fill="${o.col}"/><path d="M26 96 L32 106 L38 96 L44 106 L50 96 L56 106 L62 96 L68 106 L74 96 L80 106 L86 96 L92 106" fill="#fff"/><circle cx="36" cy="110" r="7" fill="#3a3448"/><circle cx="84" cy="110" r="7" fill="#3a3448"/></g>${eyes(46, 74, 68, 5)}`,
    // A person of rank: robed, a sword at the hip.
    lord: (o) => `<g ${SS}><path d="M26 114 Q26 62 60 52 Q94 62 94 114Z" fill="${o.col}"/><path d="M60 52 L48 114 M60 52 L72 114" fill="none" stroke="${o.col2 || '#e8e4dc'}" stroke-width="4"/><circle cx="60" cy="38" r="17" fill="${o.skin || '#ecccb0'}"/><path d="M42 34 Q60 10 78 34 Q70 24 60 24 Q50 24 42 34Z" fill="${o.hair || '#c8c2cc'}"/><path d="M90 76 L112 104" fill="none" stroke-width="4"/></g><path d="M52 38 H56 M64 38 H68" stroke="${INK}" stroke-width="2.5"/><path d="M54 48 H66" stroke="${INK}" stroke-width="2"/>`,
    // A watching eye in the rafters.
    eye: (o) => `<g ${SS}><path d="M8 40 H112 M20 40 V20 M100 40 V20" fill="none" stroke="${o.col2 || '#6a4a2a'}" stroke-width="6"/><ellipse cx="60" cy="72" rx="44" ry="26" fill="#fff"/><circle cx="60" cy="72" r="16" fill="${o.col}"/><circle cx="60" cy="72" r="6" fill="${INK}"/></g>`
  };
  const FOE = {
    stateless: ['guard', '#8a9ab8', 'shake', 'stateless'], ephemeral: ['gate', '#9a98a6', 'shake', 'port 49152?'], stateful: ['guard', '#5a8a6a', 'float', 'remembers you'], rule100: ['gate', '#7a6a9a', 'shake', 'RULE 100: DENY'],
    gatekeeper: ['gate', '#6a6a8a', 'shake', 'SG + NACL', { col2: '#2c3a5a' }], noroute: ['spirit', '#a8b4c8', 'float', 'no route'], tollroad: ['beast', '#c8a24a', 'squish', '$0.045/GB'], backdoor: ['gate', '#8a7a5a', 'float', 'vpce: *'],
    singlenat: ['beast', '#7a8aa8', 'shake', '1 NAT, 1 AZ'], warden: ['guard', '#3a5a8a', 'float', 'private', { col2: '#1a2440' }],
    wildcard: ['spirit', '#ffd24a', 'squish', 'Action: *'], boundary: ['guard', '#8a6a5a', 'shake', 'boundary'], gatepol: ['gate', '#a87a5a', 'float', 'Principal: *'], inline: ['lord', '#6a5a3a', 'float', 'inline policy', { hair: '#ffffff' }],
    ghost: ['spirit', '#c8c0e0', 'float', 'allowed twice?'], tempcreds: ['token', '#7fd0ff', 'float', 'expires 1h'], chained: ['key', '#9a7ac8', 'shake', 'chained: 1h max'], stranger: ['lord', '#5a4a3a', 'float', 'no ExternalId', { hair: '#2a1d16' }],
    unsigned: ['scroll', '#e8dcc0', 'shake', 'no signature'], envoy: ['lord', '#4a6a5a', 'float', 'cross-account', { hair: '#1a1418' }], longkey: ['key', '#c8a24a', 'shake', 'AKIA... (2019)'],
    jinecho: ['lord', '#6a2a2a', 'float', 'echo', { hair: '#1a1418', skin: '#f0d0b4', col2: '#f2efe8' }],
    forged: ['token', '#e8c46a', 'shake', 'bad signature'], expired: ['token', '#b8b2a8', 'float', 'exp: yesterday'], wrongaud: ['token', '#9fc98a', 'float', 'aud: other app'], fedstranger: ['lord', '#7a5a8a', 'float', 'SAML: unmapped', { hair: '#5a3a2a' }],
    steward: ['lord', '#3a3a4a', 'float', 'the Steward', { hair: '#5a5a62' }], plaintext: ['scroll', '#f6efd8', 'float', 'plaintext'], openroad: ['beast', '#c8b48a', 'squish', 'http://'], byok: ['lock', '#8a6a9a', 'shake', 'SSE-C: lost key'],
    spy: ['spirit', '#5a5a6a', 'float', 'PII unlabelled'], keeper: ['lord', '#5a3a6a', 'float', 'sealed only', { hair: '#3a3036' }], rotlock: ['lock', '#c8a24a', 'shake', 'rotates'], foreign: ['key', '#7a9ad0', 'float', 'acct 4444...'],
    countdown: ['lock', '#d06a5a', 'shake', 'deletion: 7d'], watcher: ['eye', '#3a8a5a', 'float', 'GuardDuty'], knife: ['spirit', '#c8c8d0', 'float', 'the knife'],
    injector: ['scroll', '#e8a0a0', 'shake', "' OR 1=1 --"], flood: ['beast', '#a8b4c8', 'squish', '10k req/s'], hsm: ['lock', '#5a6a7a', 'float', 'single-tenant'],
    namgung: ['lord', '#2c3a5a', 'float', 'Namgung Hyeon', { col2: '#e8e4dc' }], waf: ['guard', '#5a6a8a', 'shake', 'WAF'], shield: ['guard', '#8a8aa8', 'shake', 'Shield'],
    unsent: ['scroll', '#f2ead8', 'float', 'unsent', { col2: '#8a2a34' }], summer: ['lord', '#1a2440', 'float', 'read aloud', { col2: '#e8e4dc' }]
  };
  Object.keys(FOE).forEach(id => {
    const [body, col, anim, label, more] = FOE[id], o = Object.assign({ col }, more);
    const sealed = ['namgung', 'unsent', 'summer', 'keeper', 'knife', 'jinecho'].includes(id);
    SD.art.addFoe('k4-' + id, { col, anim, svg: BODY[body](o) + (sealed ? seal(30, 30, 60) : '') + tag(label, /deny|bad|lost|no |expires|deletion/i.test(label) ? '#d63a3a' : INK) });
  });

  // ---------- The raid, in vector ----------
  // While a chapter 4 raid plays (js/c4-world.js turns it on with A.raidArt(true)): a drawn backdrop over the
  // painted one, each champion's standing figure as a one-frame sheet (js/raid.js reads its idle row at y = 2h), and
  // no painted map tiles (SD.dungeonArt is set aside, so the engine draws plain rooms over the drawn map below).
  const css = document.createElement('style');
  const back = K.scene([sky('c4rb', '#2a2236', '#5a4a6a'), peaks(560, '#3a3048', 31, 220, true), peaks(700, '#2a2236', 33, 120), R(0, 760, 1200, 440, '#3a3442'), K.vignette(1200, 1200, 0.6)]);
  const mapBg = K.uri(K.svg('0 0 120 120', R(0, 0, 120, 120, '#2a2436') + p('M0 30 Q30 20 60 34 T120 30 M0 90 Q40 80 70 94 T120 88', null, '#3a3448', 6) + c(20, 60, 3, '#4a4458') + c(90, 60, 4, '#4a4458')));
  css.textContent = `html.c4raid .rd-stage { background-image: url("${back}") !important; background-size: cover !important; background-position: center !important; }
html.c4raid .rd .map { background: url("${mapBg}") repeat, #2a2436; background-size: 120px 120px; }`;
  document.head.appendChild(css);
  let keptArt = null;
  A.raidArt = function (on) {
    document.documentElement.classList.toggle('c4raid', !!on);
    if (on && SD.dungeonArt) { keptArt = SD.dungeonArt; SD.dungeonArt = null; }
    if (!on && keptArt) { SD.dungeonArt = keptArt; keptArt = null; }
    const CH = SD.champions;
    if (on && CH) CH.list.forEach(ch => {
      if (ch.sheet && !/^assets\//.test(ch.sheet)) return;
      const w = ch.w, h = ch.h, fig = K.fig(ch.id, 'neutral', 'full');
      ch.n = 0;
      ch.sheet = K.uri(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h * 3}" width="${w}" height="${h * 3}"><image href="${fig}" xlink:href="${fig}" x="${w * 0.08}" y="${h * 2}" width="${w * 0.84}" height="${h}" preserveAspectRatio="xMidYMax meet"/></svg>`);
    });
  };
})();
