// Chapter 7's pictures, all drawn in code: the camp the night before the finale (js/c7-world.js) in chapter 1's
// overworld kit (32 units to a tile, people and props standing on the bottom edge of their footprint), with every
// band's buildings borrowed from the chapter that drew them; the people nobody had drawn walking yet (Seymour, Pip,
// Coo, Gary and the marsh cat); Kyu in the visual novel; the chapter's stills; the enemies of floor 100 (120 x 120
// SVG, as js/c6-art.js); and, while the climb plays, vector stand-ins for the raid engine's painted backdrop.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const A = SD.c7art = {};
  const ART = SD.c1art, A6 = SD.c6art;
  const INK = '#2b2340';
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

  // ---------- Drawing helpers (unit coordinates, as in js/c6-art.js) ----------
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

  // ---------- People, walking ----------
  if (!ART.LOOK.gary) ART.LOOK.gary = { skin: '#e2b496', hair: '#e2b496', hairD: '#c8957a', style: 'shaved', coat: '#8a8a94', coatD: '#6a6a74', under: '#a8a8b0', legs: '#4a4a5a', boots: '#2a2a30', eye: '#2b2340', mouth: 'flat', brow: 'flat' };
  // The ones who aren't people-shaped, or are in armour: drawn here, standing on (0, 0), facing the way they face.
  const ODD = {
    // Sir Seymour Backups: full plate, a closed visor, a red plume and a gear on the blue tabard.
    seymour: (g, t, back, moving) => {
      const b = moving ? -Math.abs(Math.sin(t * 12)) * 1.2 : 0;
      g.ell(16, -1, 10, 3).fill('rgba(43,35,64,.22)', false);
      g.rect(10, -12 + b, 5, 12, 1).fill('#8a94a8'); g.rect(17, -12 + b, 5, 12, 1).fill('#8a94a8');
      g.rect(8, -30 + b, 16, 19, 3).fill('#a8b0c0');
      if (!back) { g.rect(11, -29 + b, 10, 16, 1).fill('#2c4a8a', 0.8); g.circle(16, -21 + b, 3).fill('#e8c45a', 0.6); }
      g.rect(5, -29 + b, 4, 13, 2).fill('#8a94a8'); g.rect(23, -29 + b, 4, 13, 2).fill('#8a94a8');
      g.rect(9, -43 + b, 14, 14, 5).fill('#b8c0cc');
      if (!back) g.line(11, -37 + b, 21, -37 + b).stroke('#1a1a22', 1.8);
      g.line(16, -43 + b, 14, -50 + b, 10, -52 + b).stroke('#c8302a', 3);
    },
    // Pip: a small, polite packet with an aerial.
    pip: (g, t, back) => {
      const b = Math.sin(t * 3) * 1.2;
      g.ell(16, -1, 8, 2.4).fill('rgba(43,35,64,.2)', false);
      g.ell(16, -10 + b, 9, 10).fill('#6fd6ff');
      g.line(16, -20 + b, 19, -26 + b).stroke(INK, 1.2); g.circle(19.5, -27 + b, 2).fill('#ffe14d', 0.8);
      if (!back) { g.circle(13, -12 + b, 1.4).fill(INK, false); g.circle(19, -12 + b, 1.4).fill(INK, false); g.rect(11, -6 + b, 10, 5, 1).fill('#fffdf6', 0.6); }
    },
    // Coo: a grey pigeon in a postman's cap, with a satchel.
    coo: (g, t, back) => {
      const peck = Math.sin(t * 2.4) > 0.7 ? 2 : 0;
      g.ell(16, -1, 7, 2).fill('rgba(43,35,64,.2)', false);
      g.line(14, -4, 14, 0).stroke('#e07a5a', 1.2); g.line(18, -4, 18, 0).stroke('#e07a5a', 1.2);
      g.ell(16, -9, 8, 6).fill('#a8b0c4'); g.rect(10, -12, 7, 6, 2).fill('#3a4a7a', 0.8);
      g.circle(20, -15 + peck, 4.5).fill('#a8b0c4');
      g.rect(16.5, -21 + peck, 8, 3, 1).fill('#26325a', 0.8);
      if (!back) { g.circle(21.5, -15.5 + peck, 1).fill(INK, false); g.poly(24, -15 + peck, 27, -14 + peck, 24, -13 + peck).fill('#e8b86a', 0.6); }
      g.rect(7, -9, 5, 5, 1).fill('#a8743a', 0.8);
    },
    // The marsh cat: a scrawny grey-brown tabby, a thin S of a tail and a clump of marsh weed on its back.
    cat: (g, t, back) => {
      const sw = Math.sin(t * 1.8) * 3;
      g.ell(16, -1, 9, 2.4).fill('rgba(43,35,64,.2)', false);
      g.line(8, -6, 4, -12, 7 + sw * 0.4, -18).stroke('#7a6a58', 2);
      g.ell(15, -6, 8, 5).fill('#8a7a66');
      [11, 15, 19].forEach(x => g.line(x, -10, x - 1, -3).stroke('#4a3e32', 1));
      g.circle(22, -10, 4.6).fill('#8a7a66');
      g.poly(19, -13, 20, -18, 22, -14).fill('#8a7a66'); g.poly(23, -14, 25, -18, 26, -12).fill('#8a7a66');
      if (!back) { g.circle(21, -10.5, 1).fill('#5ac85a', false); g.circle(24, -10.5, 1).fill('#5ac85a', false); }
      g.ell(13, -11, 3, 1.6).fill('#4a7a3a', 0.6);
    }
  };
  const basePerson = A6 ? A6.person : ART.person;
  A.person = function (ctx, id, fx, fy, ts, t, face, moving, o) {
    const f = ODD[id];
    if (!f) return basePerson(ctx, id, fx, fy, ts, t, face, moving, o);
    frame(ctx, fx - ts / 2, fy, ts, g => {
      if (face === 'west') { g.ctx.translate(32, 0); g.ctx.scale(-1, 1); }
      f(g, t, face === 'north', moving);
    });
  };

  // ---------- The ground ----------
  const GRASS = { night: ['#3e5a3e', '#3a563a', '#42603f', '#375236'], day: ['#7fa66a', '#79a064', '#85ab6f', '#73995f'] };
  const PATH = ['#b8a888', '#b2a282', '#bcac8c', '#ad9d7e'], STONE = ['#a8a4b4', '#a29eae', '#aeaaba', '#9c98a8'];
  A.ground = function (ctx, ch, x, y, ts, t, nb, phase) {
    const X = x * ts, Y = y * ts, h = hash(x, y), u = ts / 32, night = phase !== 'day';
    const fill = c => { ctx.fillStyle = c; ctx.fillRect(X, Y, ts + 1, ts + 1); };
    if (ch === 'V') { fill('#141226'); return; }
    if (ch === 'p') {
      // The flagstones at the tower's foot.
      fill(STONE[h % 4]);
      ctx.strokeStyle = 'rgba(43,35,64,.18)'; ctx.lineWidth = u;
      ctx.strokeRect(X + 0.5, Y + 0.5, ts / 2, ts / 2); ctx.strokeRect(X + ts / 2 + 0.5, Y + ts / 2 + 0.5, ts / 2, ts / 2);
      return;
    }
    if (ch === 'c') {
      // Cron's rows: soil, and something green coming up in every one.
      fill(night ? '#4a3a2a' : '#7a5a3a');
      ctx.fillStyle = night ? '#3a6a3a' : '#6aa04a';
      for (let i = 0; i < 3; i++) { const yy = Y + ts * (0.2 + i * 0.3); ctx.fillRect(X + ts * 0.1, yy, ts * 0.8, 2 * u); if ((h + i) % 2) { ctx.beginPath(); ctx.arc(X + ts * (0.3 + (h % 5) / 10), yy - u, 2 * u, 0, 7); ctx.fill(); } }
      return;
    }
    fill(GRASS[night ? 'night' : 'day'][h % 4]);
    if (h % 6 === 0) { ctx.strokeStyle = night ? '#2e4a2e' : '#5a8448'; ctx.lineWidth = u * 1.2; const tx = X + (h % 23) / 23 * ts * 0.7 + ts * 0.15, ty = Y + (h % 17) / 17 * ts * 0.6 + ts * 0.3; ctx.beginPath(); ctx.moveTo(tx - 3, ty); ctx.lineTo(tx - 1, ty - 5); ctx.moveTo(tx, ty); ctx.lineTo(tx + 1, ty - 6); ctx.stroke(); }
    if (ch === 'f') for (let i = 0; i < 3; i++) { const hx = hash(x * 3 + i, y * 5 - i); ctx.fillStyle = ['#ffd24a', '#ff8ab8', '#f4f0ff'][hx % 3]; ctx.beginPath(); ctx.arc(X + (hx % 29) / 29 * ts, Y + (hx % 31) / 31 * ts, u * 1.8, 0, 7); ctx.fill(); }
    if (ch === ',') {
      ctx.fillStyle = PATH[h % 4];
      const r = ts * 0.4, isP = c => c === ',' || /[LGp]/.test(c);
      ctx.beginPath(); ctx.arc(X + ts / 2, Y + ts / 2, r, 0, 7); ctx.fill();
      if (isP(nb(1, 0))) ctx.fillRect(X + ts / 2, Y + ts / 2 - r, ts / 2 + 1, r * 2);
      if (isP(nb(-1, 0))) ctx.fillRect(X, Y + ts / 2 - r, ts / 2, r * 2);
      if (isP(nb(0, 1))) ctx.fillRect(X + ts / 2 - r, Y + ts / 2, r * 2, ts / 2 + 1);
      if (isP(nb(0, -1))) ctx.fillRect(X + ts / 2 - r, Y, r * 2, ts / 2);
    }
  };
  // A 'T' tile: the camp's trees, and now and then a rock.
  A.wall = function (ctx, x, y, ts, t) {
    return ART.prop(ctx, { kind: hash(x, y) % 7 === 0 ? 'rock' : 'tree', x, y, w: 1, h: 1 }, ts, t);
  };

  // ---------- Props ----------
  // Each band's building comes from the chapter that drew it: a prop with from: 'c4' is drawn by js/c4-art.js, and
  // so on. Anything else is this chapter's own, or falls back to chapter 6's (and through it chapters 2 and 1).
  const PR = {};
  A.prop = function (ctx, p, ts, t) {
    if (p.hidden) return;
    const f = PR[p.kind];
    if (f) return frame(ctx, p.x * ts, (p.y + (p.h || 1)) * ts, ts, g => f(g, p, t));
    const art = p.from && SD[p.from + 'art'];
    if (art && art.prop) return art.prop(ctx, p, ts, t);
    return A6 ? A6.prop(ctx, p, ts, t) : ART.prop(ctx, p, ts, t);
  };
  // The foot of the tower: a wall going up out of sight, and the lift to floor 100 in it.
  PR.towerfoot = (g, p, t) => {
    const W = p.w * 32, H = p.h * 32;
    g.rect(0, -H, W, H).fill('#4a4660');
    for (let y = -H + 12; y < -8; y += 14) g.line(2, y, W - 2, y).stroke('rgba(20,16,30,.35)', 1);
    for (let i = 0; i < 6; i++) g.rect(10 + i * (W - 20) / 6, -H + 10, 8, 12, 2).fill(Math.sin(t * 0.7 + i * 1.9) > 0.3 ? '#ffd76a' : '#2a2638', 0.6);
    g.rect(W / 2 - 18, -48, 36, 48, 3).fill('#2a2640');
    g.rect(W / 2 - 14, -44, 28, 44).fill(p.open ? '#14101f' : '#3a3450', false);
    g.line(W / 2, -48, W / 2, -H + 4).stroke('#c8d0e0', 1.6);
    g.rect(W / 2 - 7, -12 - (Math.sin(t) + 1) * 4, 14, 6).fill('#c8a24a', 0.8);
    g.rect(W / 2 - 26, -62, 52, 11, 2).fill('#f6efd8', 0.8); g.text('FLOOR 100', W / 2, -54, 6.4, INK);
  };
  // The gift basket, full: a letter, a loaf, a seal, a lantern and a stone, each from a band.
  PR.giftbasket = (g, p, t) => {
    const n = p.gifts || 0;
    g.ell(16, -1, 14, 3.5).fill('rgba(43,35,64,.2)', false);
    g.ctx.beginPath(); g.ctx.arc(16, -14, 10, Math.PI, 0); g.stroke('#9a6a3a', 1.8);
    g.poly(4, -14, 28, -14, 25, 0, 7, 0).fill('#c99a5a');
    for (let i = 0; i < 4; i++) g.line(8 + i * 5, -13, 9 + i * 4.5, -1).stroke('#9a6a3a', 0.8);
    const G = [[8, -17, '#fffaf0'], [14, -18, '#d8a45a'], [20, -17, '#b3242e'], [11, -21, '#e8c45a'], [18, -21, '#cfe2ff']];
    G.slice(0, n).forEach(([x, y, c]) => g.rect(x, y, 6, 5, 1.4).fill(c, 0.7));
    if (n >= 5) { g.ctx.globalAlpha = 0.3 + 0.15 * Math.sin(t * 3); g.circle(16, -16, 14).fill('#ffe9a0', false); g.ctx.globalAlpha = 1; }
  };
  // Cron's fence, round his rows.
  PR.fence = (g, p) => {
    const W = p.w * 32;
    for (let x = 2; x < W; x += 8) g.rect(x, -14, 3, 14, 1).fill('#a8845a', 0.8);
    g.line(0, -10, W, -10).stroke('#8a6a3a', 1.6); g.line(0, -4, W, -4).stroke('#8a6a3a', 1.6);
  };
  // Uptima's prayer box beside the fire: a crate of paper slips, and a lamp to read them by.
  PR.prayers = (g, p, t) => {
    g.rect(4, -12, 24, 12, 2).fill('#8a6a4a');
    for (let i = 0; i < 6; i++) g.rect(6 + i * 3.6, -16 - (i % 3), 3, 6, 0.6).fill('#fffaf0', 0.5);
    g.line(28, -12, 28, -24).stroke('#5a4a3a', 1.2); g.rect(25, -30, 6, 6, 1).fill('#ffe28a', 0.8);
    g.ctx.globalAlpha = 0.25 + 0.08 * Math.sin(t * 5); g.circle(28, -27, 8).fill('#ffe28a', false); g.ctx.globalAlpha = 1;
  };
  // Where two of the four are sitting up late: a lantern on the ground, and its pool of light.
  PR.spot = (g, p, t) => {
    g.ctx.globalAlpha = 0.3 + 0.12 * Math.sin(t * 2 + p.x); g.ell(16, -6, 14, 6).fill('#ffe9a0', false); g.ctx.globalAlpha = 1;
    g.rect(13, -14, 6, 8, 1.4).fill('#ffd76a', 0.8); g.line(16, -14, 16, -17).stroke(INK, 1);
  };
  // A school's front step at dawn: a slate, a bell on a post.
  PR.school = (g, p) => {
    const W = p.w * 32, H = p.h * 32;
    g.ell(W / 2, -1, W * 0.48, 4).fill('rgba(43,35,64,.2)', false);
    g.rect(4, -H * 0.64, W - 8, H * 0.64).fill('#ece4d4');
    g.poly(0, -H * 0.6, W / 2, -H * 0.95, W, -H * 0.6).fill('#5a3a5a');
    g.rect(W / 2 - 8, -H * 0.4, 16, H * 0.4, 2).fill('#6a4a2a');
    g.rect(W / 2 - 18, -H * 0.64 - 2, 36, 9, 2).fill('#f6efd8', 0.8); g.text('SCHOOL', W / 2, -H * 0.64 + 5, 6, '#5a3a5a');
    g.line(W - 6, 0, W - 6, -H * 0.8).stroke('#6a4a2a', 1.6); g.circle(W - 6, -H * 0.8 - 3, 3).fill('#e8c45a', 0.8);
  };

  // ---------- The grade ----------
  A.grade = (...a) => (A6 && A6.grade ? A6.grade(...a) : null);

  // ---------- Kyu and Uptima, in the visual novel ----------
  // Drawn the first time the visual novel shows them, not at load.
  const lazy = (o, k, make) => { let v; Object.defineProperty(o, k, { enumerable: true, configurable: true, get: () => v || (v = make()) }); };
  const sprite = (id, faces) => { const o = {}; faces.forEach(f => lazy(o, f, () => K.fig(id, f, 'bust'))); return { faces: o }; };
  const SPR = { kyu: ['neutral', 'sad', 'cold', 'earnest', 'warm', 'tired', 'smile'], uptima: ['neutral', 'sad', 'warm', 'earnest', 'smile', 'tired'], gary: ['neutral', 'tired'] };
  const add = {};
  Object.keys(SPR).forEach(id => {
    const have = (SD.vn.art.sprites[id] || {}).faces || {};
    if (SPR[id].some(f => !(f in have)) && K.cast[id]) add[id] = sprite(id, SPR[id]);
  });
  SD.vn.addSprites(add);
  const NAMES = { cat: { name: 'The marsh cat', title: 'Name pending' } };
  Object.keys(NAMES).forEach(k => { if (!SD.cast[k]) SD.cast[k] = NAMES[k]; });

  // ---------- Stills ----------
  const { p, c, e } = K;
  const S = {}, SF = {};
  const sky = K.skyL, R = K.r, T = K.t, G = K.g;
  const fireAt = (x, y, s) => G(p('M-50 10 L50 -6 M-46 -6 L48 12', null, '#4a2c16', 12) + p('M-36 0 C-46 -46 -18 -72 0 -120 C10 -82 36 -64 36 0Z', '#ff8a2a', K.NIGHT, 3) + p('M-16 0 C-20 -28 -6 -46 0 -72 C8 -46 20 -28 16 0Z', '#ffe08a'), `translate(${x} ${y}) scale(${s || 1})`);
  const tent = (x, y, col, s) => G(p('M-160 0 L0 -200 L160 0Z', col, K.NIGHT, 4) + p('M-30 0 L0 -60 L30 0Z', '#1a1420', null, null, 0.8), `translate(${x} ${y}) scale(${s || 1})`);
  // The camp the night before: every band's roof under the tower, and the fire in the middle.
  SF['c7-camp'] = () => K.scene([sky('c7c', '#0c0a18', '#241a30'), K.stars(1200, 560, 160, 71, 0.85),
    R(500, 0, 200, 760, '#2a2638', K.NIGHT, 4), ...Array.from({ length: 9 }, (_, i) => R(530 + (i % 3) * 52, 80 + Math.floor(i / 3) * 210, 24, 34, i % 4 === 1 ? '#ffd76a' : '#3a3450', null, null, 0.9)),
    R(0, 760, 1200, 440, '#1e2414'),
    tent(160, 900, '#c8487a', 0.7), tent(1040, 900, '#4a6aa8', 0.7),
    G(R(-90, -110, 180, 110, '#efe2c6', K.NIGHT, 3) + p('M-110 -110 L0 -170 L110 -110Z', '#c0503a', K.NIGHT, 3) + T(0, -60, 'POST', { size: 26, fill: '#24345e' }), 'translate(340 820) scale(0.8)'),
    G(R(-100, -130, 200, 130, '#e8e4f4', K.NIGHT, 3) + p('M-120 -130 L0 -200 L120 -130Z', '#3a2260', K.NIGHT, 3) + T(0, -70, 'LIBRARY', { size: 22, fill: '#3a2260' }), 'translate(860 820) scale(0.8)'),
    fireAt(600, 980, 1.3), K.glow('c7cg', 600, 920, 520, '#ff9a3a', 0.5), K.vignette(1200, 1200, 0.6)]);
  // The Throne Room: Uptima's throne, empty, and a crown on it.
  SF['c7-throne'] = () => K.scene([sky('c7t', '#1a1428', '#3a2a40'), R(0, 0, 1200, 1200, '#2a2034', null, null, 0.5),
    ...Array.from({ length: 6 }, (_, i) => R(60 + i * 200, 80, 70, 780, '#3a2e48', K.NIGHT, 3)),
    R(0, 860, 1200, 340, '#1a1422'), p('M380 860 L420 760 L780 760 L820 860Z', '#4a3a5a', K.NIGHT, 4),
    G(p('M-120 0 L-120 -380 Q0 -460 120 -380 L120 0Z', '#e8d8b0', K.NIGHT, 5) + R(-90, -150, 180, 40, '#c8a24a', K.NIGHT, 3) + R(-100, -110, 200, 110, '#d8c49a', K.NIGHT, 4)
      + p('M-40 -200 L-30 -240 L-14 -210 L0 -250 L14 -210 L30 -240 L40 -200Z', '#ffd24a', K.NIGHT, 3) + T(0, -164, 'Member account', { size: 11, fill: '#8a6a2a', font: 'Georgia, serif' }), 'translate(600 760)'),
    K.glow('c7tg', 600, 520, 380, '#ffd76a', 0.25), K.vignette(1200, 1200, 0.75)]);
  // The roof: the top of the Cloud, the sky right there, a hatch, and one dusty console.
  SF['c7-roof'] = () => K.scene([sky('c7r', '#0a1430', '#6a7ab8', '#2a3a70'), K.stars(1200, 700, 200, 83, 0.9),
    e(600, 1100, 900, 340, '#e8ecf4', K.NIGHT, 4), e(600, 1100, 820, 290, '#f6f8fc', null, null, 0.8),
    G(R(-60, -14, 120, 14, '#5a5468', K.NIGHT, 3) + R(-46, -40, 92, 26, '#3a3448', K.NIGHT, 3), 'translate(300 900)'),
    G(R(-150, -150, 300, 150, '#4a4a52', K.NIGHT, 4) + R(-124, -128, 248, 96, '#2a3a2a', K.NIGHT, 3) + p('M-104 -100 h140 M-104 -80 h190 M-104 -60 h90', null, '#9aff9a', 4, 0.6)
      + R(-140, 0, 280, 26, '#5a5a62', K.NIGHT, 3) + e(80, -4, 34, 12, '#e8b86a', K.NIGHT, 3) + p('M-150 -150 h300', null, '#c8c2b0', 6, 0.5), 'translate(720 880)'),
    K.glow('c7rg', 720, 800, 300, '#9aff9a', 0.16), K.vignette(1200, 1200, 0.55)]);
  // The console up close: the policy list, and one line nobody has attached.
  SF['c7-console'] = () => K.scene([sky('c7k', '#141a14', '#1e2a1e'), R(80, 120, 1040, 700, '#2a3a2a', K.NIGHT, 6),
    T(600, 220, 'SERVICE CONTROL POLICIES', { size: 40, fill: '#9aff9a', font: 'ui-monospace, monospace' }),
    T(600, 320, 'FullAWSAccess            attached', { size: 30, fill: '#6aba6a', font: 'ui-monospace, monospace' }),
    T(600, 400, 'gary-deny (1984)     NOT ATTACHED', { size: 30, fill: '#ffe28a', font: 'ui-monospace, monospace' }),
    R(0, 860, 1200, 340, '#3a3a40'), e(840, 900, 120, 40, '#e8b86a', K.NIGHT, 4), p('M760 892 Q840 870 920 892', null, '#c8904a', 4),
    T(600, 1080, 'Member accounts: 1   (the Cloud)', { size: 26, fill: '#c8c2b0', font: 'ui-monospace, monospace' }), K.vignette(1200, 1200, 0.6)]);
  // The lights going out: every window in the camp dark at once, far below.
  SF['c7-dark'] = () => K.scene([R(0, 0, 1200, 1200, '#06050c'), K.stars(1200, 1200, 90, 29, 0.4),
    ...Array.from({ length: 14 }, (_, i) => R(80 + i * 78, 900 + (i % 3) * 30, 30, 40, '#141220', '#2a2438', 2)), K.vignette(1200, 1200, 0.85)]);
  // Kyu, restored: a test account first, a soft light, and her.
  SF['c7-kyu'] = () => K.scene([sky('c7y', '#120e20', '#2a1e3a'), K.glow('c7yg', 600, 560, 520, '#c8a0ff', 0.45),
    R(380, 300, 440, 300, '#1a1428', '#8a6cff', 3, 0.7, 12), T(600, 360, 'RESTORE TEST', { size: 30, fill: '#c8a0ff', font: 'ui-monospace, monospace' }),
    T(600, 420, 'kyu-copy-2  →  test account', { size: 24, fill: '#e8dcff', font: 'ui-monospace, monospace' }), T(600, 470, 'checked: OK', { size: 24, fill: '#9aff9a', font: 'ui-monospace, monospace' }),
    R(0, 880, 1200, 320, '#1a1422'), K.vignette(1200, 1200, 0.7)]);
  // The Top: Freya on Uptima's throne with her sample tray, and the tower's speakers.
  SF['c7-top'] = () => K.scene([sky('c7p', '#ffd8e8', '#ffeef4', '#ffe4ec'), R(0, 820, 1200, 380, '#f4dce8'),
    ...Array.from({ length: 4 }, (_, i) => G(R(-30, -30, 60, 60, '#d8c4d0', K.NIGHT, 3) + c(0, 0, 18, '#8a7a88', K.NIGHT, 2), `translate(${150 + i * 300} 140)`)),
    G(p('M-130 0 L-130 -400 Q0 -480 130 -400 L130 0Z', '#fff4f8', K.NIGHT, 5) + R(-110, -120, 220, 120, '#ffd0e0', K.NIGHT, 4), 'translate(600 840)'),
    G(e(0, 0, 90, 22, '#f6f2ea', K.NIGHT, 3) + c(-40, -10, 12, '#ff8ab8', K.NIGHT, 2) + c(0, -12, 12, '#ffd24a', K.NIGHT, 2) + c(40, -10, 12, '#7fd0ff', K.NIGHT, 2), 'translate(860 800)'),
    K.glow('c7pg', 600, 560, 460, '#ffffff', 0.4), K.vignette(1200, 1200, 0.3)]);
  // The message nobody will ever read: one, waiting.
  SF['c7-queue'] = () => K.scene([R(0, 0, 1200, 1200, '#0a0812'),
    ...Array.from({ length: 12 }, (_, i) => R(120 + i * 84, 560, 64, 80, '#14101f', '#2a2438', 2, 0.6)),
    R(1000, 560, 64, 80, '#ffd0e0', '#ff8ab8', 3, 0.9), T(600, 760, 'ApproximateNumberOfMessagesVisible: 1', { size: 24, fill: '#5a5468', font: 'ui-monospace, monospace' }),
    K.glow('c7qg', 1032, 600, 140, '#ff8ab8', 0.35), K.vignette(1200, 1200, 0.8)]);
  // Uptima at the fire, with the Design Board and the prayers.
  SF['c7-fire'] = () => K.scene([sky('c7f', '#0e0c18', '#1a1420'), K.stars(1200, 600, 120, 47, 0.8), R(0, 760, 1200, 440, '#1e2414'),
    G(p('M-6 0 L-2 -260 M6 0 L2 -260', null, '#6a4a2a', 10) + R(-140, -300, 280, 180, '#f6f2e8', K.NIGHT, 4) + p('M-110 -270 h80 v50 M-10 -280 l80 40 M60 -200 h-120', null, '#4a6aa8', 5) + c(80, -170, 18, null, '#2c8a4b', 5), 'translate(900 860)'),
    G(R(-80, -50, 160, 50, '#8a6a4a', K.NIGHT, 3) + p(Array.from({ length: 8 }, (_, i) => `M${-70 + i * 18} -50 v-26`).join(' '), null, '#fffaf0', 8), 'translate(320 900)'),
    fireAt(600, 980, 1.2), K.glow('c7fg', 600, 900, 480, '#ff9a3a', 0.45), K.vignette(1200, 1200, 0.6)]);
  // Morning after: the tower quiet, a stall at the camp's edge, a croissant-shaped gap on a keyboard.
  SF['c7-dawn'] = () => K.scene([sky('c7d', '#6a5a9a', '#ffc8a0', '#f0a0b8'), R(500, 0, 200, 780, '#6a6080', K.NIGHT, 4), R(0, 760, 1200, 440, '#7a9a6a'),
    tent(200, 900, '#c8487a', 0.6), tent(1000, 900, '#4a6aa8', 0.6),
    G(R(-90, -16, 180, 16, '#3a2a4a', K.NIGHT, 3) + p(Array.from({ length: 6 }, (_, i) => `M${-96 + i * 32} -90 h32 v22 h-32Z`).join(' '), '#8a5aba', K.NIGHT, 2) + p('M-92 -16 V-90 M92 -16 V-90', null, '#5a4a6a', 6), 'translate(760 960)'),
    c(900, 260, 90, '#ffe8c0', null, null, 0.7), K.vignette(1200, 1200, 0.3)]);
  Object.keys(SF).forEach(k => lazy(S, k, SF[k]));
  A.scenes = S;
  SD.vn.addScenes(Object.fromEntries(Object.keys(SF).map(k => { const o = { label: k }; lazy(o, 'src', () => S[k]); return [k, o]; })));

  // ---------- Enemies ----------
  const SS = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const eyes = (x1, x2, y, r) => `<circle cx="${x1}" cy="${y}" r="${r || 4}" fill="#fff" ${SS}/><circle cx="${x2}" cy="${y}" r="${r || 4}" fill="#fff" ${SS}/><circle cx="${x1 + 1}" cy="${y + 1}" r="1.8" fill="${INK}"/><circle cx="${x2 - 1}" cy="${y + 1}" r="1.8" fill="${INK}"/>`;
  const tag = (t, col, y) => { const w = Math.max(44, t.length * 5.4 + 10); return `<rect x="${60 - w / 2}" y="${y || 100}" width="${w}" height="15" rx="4" fill="#fff8e0" stroke="${col || INK}" stroke-width="2"/><text x="60" y="${(y || 100) + 11}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="${col || INK}">${K.esc(t)}</text>`; };
  const BODY = {
    // A ticket with a face: a session token.
    token: o => `<g ${SS}><path d="M20 34 H100 V52 A8 8 0 0 0 100 68 V86 H20 V68 A8 8 0 0 0 20 52Z" fill="${o.col}"/><path d="M76 34 V86" fill="none" stroke-dasharray="4 4" stroke-width="2"/></g>${eyes(40, 58, 56, 4)}`,
    // An hourglass that won't run out.
    glass: o => `<g ${SS}><path d="M34 18 H86 M34 104 H86 M38 18 Q38 50 60 60 Q82 50 82 18 M38 104 Q38 70 60 60 Q82 70 82 104" fill="${o.col}"/><path d="M48 96 Q60 84 72 96Z" fill="#ffe28a"/></g>${eyes(50, 70, 38, 3)}`,
    // Two badges, one pinned on the other.
    badge: o => `<g ${SS}><path d="M30 30 H74 V80 L52 94 L30 80Z" fill="${o.col}"/><path d="M50 44 H94 V94 L72 108 L50 94Z" fill="${o.col2 || '#ffd24a'}"/></g>${eyes(62, 82, 66, 3)}`,
    // A drawer of sessions, one sticking out.
    drawer: o => `<g ${SS}><rect x="18" y="26" width="84" height="78" rx="4" fill="${o.col}"/><path d="M18 52 H102 M18 78 H102" fill="none" stroke-width="2"/><rect x="28" y="60" width="64" height="20" rx="2" fill="#fff8e0"/><circle cx="60" cy="39" r="3" fill="${INK}"/></g>${eyes(48, 72, 92, 3)}`,
    // A page of the policy book, with eyes in the margin.
    page: o => `<g ${SS}><path d="M28 14 H80 L94 28 V108 H28Z" fill="${o.col}"/><path d="M80 14 V28 H94" fill="none"/><path d="M40 52 H82 M40 64 H82 M40 76 H72 M40 88 H78" fill="none" stroke-width="2" stroke="${o.col2 || '#8a7a9a'}"/></g>${eyes(48, 68, 34, 3)}`,
    // A temple mask, smiling like Freya.
    mask: o => `<g ${SS}><path d="M26 30 Q60 6 94 30 Q100 78 60 104 Q20 78 26 30Z" fill="${o.col}"/><path d="M40 72 Q60 88 80 72" fill="none" stroke-width="3"/></g><path d="M38 50 Q46 44 54 50 M66 50 Q74 44 82 50" fill="none" stroke="${INK}" stroke-width="3"/>`,
    // A robed figure with a book: the Chaplain.
    monk: o => `<g ${SS}><path d="M30 114 Q30 62 60 52 Q90 62 90 114Z" fill="${o.col}"/><circle cx="60" cy="40" r="16" fill="${o.skin || '#e8d8c4'}"/><path d="M42 36 Q60 12 78 36 Q70 26 60 26 Q50 26 42 36Z" fill="${o.col2 || '#3a2a4a'}"/><rect x="40" y="72" width="40" height="26" rx="2" fill="#f6efd8"/><path d="M60 72 V98" fill="none" stroke-width="2"/></g>${eyes(53, 67, 42, 3)}`,
    // A crown with a face.
    crown: o => `<g ${SS}><path d="M20 90 L24 40 L42 62 L60 30 L78 62 L96 40 L100 90Z" fill="${o.col}"/><rect x="20" y="86" width="80" height="14" rx="3" fill="${o.col2 || '#c8a24a'}"/><circle cx="60" cy="93" r="4" fill="#d63a3a"/></g>${eyes(50, 70, 72, 4)}`,
    // A key on a text file.
    keyfile: o => `<g ${SS}><path d="M22 20 H72 L88 36 V104 H22Z" fill="#f4f6fa"/><circle cx="46" cy="60" r="16" fill="${o.col}"/><path d="M62 60 H96 V68 H90 V76 H84 V68 H76 V74 H70 V64 H62Z" fill="${o.col}"/></g>${eyes(40, 52, 56, 3)}`,
    // A password on a slip, and nothing behind it.
    slip: o => `<g ${SS}><rect x="16" y="36" width="88" height="48" rx="3" fill="${o.col}"/><path d="M28 62 H92" fill="none" stroke-dasharray="6 5" stroke-width="3"/></g>${eyes(48, 72, 50, 3)}`,
    // Two clerks pointing at each other.
    clerks: o => `<g ${SS}><path d="M10 114 Q10 76 34 70 Q58 76 58 114Z" fill="${o.col}"/><circle cx="34" cy="54" r="13" fill="#f0d6c4"/><path d="M62 114 Q62 76 86 70 Q110 76 110 114Z" fill="${o.col2 || '#9ab8d8'}"/><circle cx="86" cy="54" r="13" fill="#e8c4a8"/><path d="M50 88 L72 80 M70 88 L48 80" fill="none" stroke-width="3"/></g>${eyes(30, 40, 54, 2.5)}${eyes(82, 92, 54, 2.5)}`,
    // A wrapped gift with a face, and a tag.
    gift: o => `<g ${SS}><rect x="22" y="44" width="76" height="60" rx="4" fill="${o.col}"/><rect x="18" y="34" width="84" height="14" rx="3" fill="${o.col2 || '#ff8ab8'}"/><path d="M60 34 V104" fill="none" stroke-width="6" stroke="${o.col2 || '#ff8ab8'}"/><path d="M60 34 Q44 14 38 30 Q48 36 60 34 Q72 36 82 30 Q76 14 60 34Z" fill="${o.col2 || '#ff8ab8'}"/></g>${eyes(42, 78, 74, 4)}`,
    // A very long bill, unrolling.
    scroll: o => `<g ${SS}><rect x="30" y="10" width="60" height="96" fill="${o.col}"/><ellipse cx="60" cy="10" rx="32" ry="6" fill="${o.col2 || '#d8c49a'}"/><ellipse cx="60" cy="106" rx="32" ry="6" fill="${o.col2 || '#d8c49a'}"/><path d="M40 40 H80 M40 52 H74 M40 64 H80 M40 76 H70" fill="none" stroke-width="2"/></g>${eyes(50, 70, 26, 3)}<text x="60" y="94" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" font-weight="700" fill="#d63a3a">$$$</text>`,
    // A shape made of yeses.
    yes: o => `<g ${SS}><path d="M60 10 L104 52 L82 108 H38 L16 52Z" fill="${o.col}"/></g><text x="60" y="48" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" font-weight="700" fill="${INK}">YES YES</text><text x="60" y="88" text-anchor="middle" font-family="ui-monospace, monospace" font-size="10" font-weight="700" fill="${INK}">YES YES YES</text>${eyes(48, 72, 64, 4)}`,
    // A plate-armoured steward with a key ring.
    steward: o => `<g ${SS}><path d="M30 114 L34 60 H86 L90 114Z" fill="${o.col}"/><rect x="40" y="22" width="40" height="38" rx="12" fill="${o.col2 || '#c8c0a8'}"/><path d="M46 40 H74" fill="none" stroke-width="4"/><circle cx="96" cy="86" r="10" fill="none" stroke="#ffd24a" stroke-width="4"/><path d="M96 96 V108 H102" fill="none" stroke="#ffd24a" stroke-width="3"/></g>`
  };
  const FOE = {
    oldtoken: ['token', '#e8d8b0', 'shake', 'issued 01:10'], longsession: ['glass', '#cfe2ff', 'squish', '12h max'], assumer: ['badge', '#9ab8d8', 'float', 'chained'],
    copygrant: ['badge', '#ff8ab8', 'shake', 'in every role', { col2: '#ffd0e0' }], keeper7: ['drawer', '#8a7a6a', 'float', 'old sessions'], oldsession: ['token', '#c8b88a', 'shake', 'still valid'],
    implicit: ['page', '#f4f6fa', 'float', 'no Allow'], wildcard7: ['page', '#ffd24a', 'shake', '"*" : "*"'], narrow: ['page', '#cfe2ff', 'squish', 'session: Get only'], otherbucket: ['page', '#d8c8e8', 'float', 'other account'],
    notboundary: ['page', '#e8e4f4', 'shake', 'boundary: none', { col2: '#c8c2cc' }], chaplain: ['monk', '#4a3a5a', 'float', 'every page'], mask: ['mask', '#fff4f8', 'float', 'Condition?'],
    root: ['crown', '#ffd24a', 'float', 'root'], nomfa: ['slip', '#fff8e0', 'shake', 'password only'], rootkey: ['keyfile', '#c8a24a', 'shake', 'root key'],
    sharedfoe: ['clerks', '#c8b48a', 'shake', 'not my job'], steward: ['steward', '#8a94a8', 'float', 'IAM: ignored'], crown: ['crown', '#e8c45a', 'float', 'the crown'],
    giftshop: ['gift', '#7fd0ff', 'squish', 'FREE'], fineprint: ['page', '#fffaf0', 'float', 'see terms'], trial: ['glass', '#ffd24a', 'shake', 'free for 12 months'],
    bill: ['scroll', '#f6efd8', 'shake', '5 bills'], grant: ['yes', '#ffcf7a', 'float', 'every grant'], grantshard: ['yes', '#ffe9a0', 'float', 'one band\'s yes']
  };
  Object.keys(FOE).forEach(id => {
    const [body, col, anim, label, more] = FOE[id], o = Object.assign({ col }, more);
    SD.art.addFoe('r7-' + id, { col, anim, svg: BODY[body](o) + tag(label, /root|key|password|FREE|\$|not my|ignored|still/i.test(label) ? '#d63a3a' : INK) });
  });
  // Freya and her blessings: drawn from the figures themselves, so the boss is the goddess you've been talking to.
  const figFoe = (id, face, label, col, tint) => () => {
    const f = K.fig(id, face, 'full');
    const halo = tint ? `<ellipse cx="60" cy="60" rx="50" ry="56" fill="${tint}" opacity=".28"/>` : '';
    return f ? `${halo}<image href="${f}" x="22" y="0" width="76" height="114" preserveAspectRatio="xMidYMax meet"/>${tag(label, col)}` : halo + tag(label, col);
  };
  const goddess = K.cast.freyag ? 'freyag' : 'freya';
  SD.art.addFoe('r7-freya', { col: '#ff8ab8', anim: 'float', svg: figFoe(goddess, 'smile', 'Freya', '#8a2a5a') });
  SD.art.addFoe('r7-freyabk', { col: '#ff8ab8', anim: 'float', svg: figFoe(goddess, 'cold', 'restored', '#8a2a5a', '#cfe2ff') });
  SD.art.addFoe('r7-faces', { col: '#3a2a4a', anim: 'shake', svg: figFoe(K.cast.freyav ? 'freyav' : goddess, 'neutral', 'borrowed faces', '#8a2a5a') });
  [['bmessage', 'every message', '#7fd0ff'], ['bone', 'draws from one', '#ffd24a'], ['bsealed', 'sealed', '#2c3a5a'], ['brewritten', 'rewritten', '#c8a0ff']].forEach(([id, label, tint]) =>
    SD.art.addFoe('r7-' + id, { col: tint, anim: 'float', svg: figFoe(goddess, 'warm', label, '#8a2a5a', tint) }));

  // ---------- The raid, in vector ----------
  // While the climb plays (js/c7-world.js turns it on with A.raidArt(true)): a drawn backdrop over the painted one and
  // the champions' standing figures, as js/c6-art.js does for the Mirror Floors (whose switch this reuses).
  let css = null;
  const raidCss = () => {
    if (css) return;
    css = document.createElement('style');
    const back = K.scene([sky('c7rb', '#1a1428', '#4a3a5a'), ...Array.from({ length: 6 }, (_, i) => R(60 + i * 200, 80, 70, 780, '#3a2e48', K.NIGHT, 3)), R(0, 860, 1200, 340, '#1a1422'), K.vignette(1200, 1200, 0.6)]);
    const mapBg = K.uri(K.svg('0 0 120 120', R(0, 0, 120, 120, '#241c30') + p('M0 40 H120 M0 80 H120 M40 0 V120 M80 0 V120', null, '#2e2440', 3) + c(60, 60, 4, '#3a3050')));
    css.textContent = `html.c7raid.c6raid .rd-stage, html.c7raid .rd-stage { background-image: url("${back}") !important; background-size: cover !important; background-position: center !important; }
html.c7raid.c6raid .rd .map, html.c7raid .rd .map { background: url("${mapBg}") repeat, #241c30; background-size: 120px 120px; }`;
    document.head.appendChild(css);
  };
  A.raidArt = function (on) {
    if (A6 && A6.raidArt) A6.raidArt(on);
    if (on) raidCss();
    document.documentElement.classList.toggle('c7raid', !!on);
  };
})();
