// Chapter 6's pictures, all drawn in code: the Mirror Floors' overworld (js/c6-world.js) in chapter 1's overworld kit
// (32 units to a tile, people and props standing on the bottom edge of their footprint): Twinwater on both shores of a
// lake so still it's a mirror, the jetty with Kagemaru's stall, and the Free Cloud's camp; the new faces walking and
// in the visual novel (js/vec-cast.js's kit); the chapter's stills; the enemies of the three expeditions (120 x 120
// SVG, as js/ch1-mines-art.js); and, while a chapter 6 raid plays, vector stand-ins for the raid engine's painted
// backdrop, fighters and map.
// Everything in Twinwater has a twin: whoever stands at the water's edge is drawn again in the lake, upside down.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const A = SD.c6art = {};
  const ART = SD.c1art, ART2 = SD.c2art;
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

  // ---------- People, walking ----------
  // Only the ones another chapter hasn't drawn already.
  const LOOKS = {
    kagemaru: { skin: '#0c0a12', hair: '#0c0a12', hairD: '#05040a', style: 'hood', hood: '#100d18', coat: '#100d18', coatD: '#07060c', under: '#1a1626', eye: '#0c0a12', robe: true, mouth: 'flat', brow: 'flat' },
    mio: { skin: '#f3dcc9', hair: '#3a2a3a', hairD: '#1e141e', style: 'bob', coat: '#ff8ab8', coatD: '#d0608c', under: '#fff4f8', legs: '#5a4a6a', boots: '#3a2a3a', eye: '#ff5fa2', mouth: 'smile', brow: 'flat', k: 0.78 },
    aigerim: { skin: '#f0d0b4', hair: '#1e1418', hairD: '#0a0608', style: 'long', coat: '#c8487a', coatD: '#9a2c58', under: '#fbe6ee', legs: '#4a2a3a', boots: '#2a161e', eye: '#ff5fa2', mouth: 'smile', brow: 'flat' },
    chad: { skin: '#f0d0b4', hair: '#c8a24a', hairD: '#9a7a2a', style: 'short', coat: '#5a3a8a', coatD: '#3e2462', under: '#ffffff', legs: '#3e2462', boots: '#1a1622', eye: '#2b2340', mouth: 'smile', brow: 'flat' },
    ashgrove: { skin: '#ecccb0', hair: '#c8c2cc', hairD: '#8a8490', style: 'short', coat: '#2a2a34', coatD: '#16161e', under: '#d8d4cc', legs: '#2a2a34', boots: '#120e14', eye: '#4a5a6a', mouth: 'flat', brow: 'knit', k: 1.06 },
    wen: { skin: '#f0d0b4', hair: '#dcd7e6', hairD: '#a9a3b8', style: 'bun', coat: '#c8584a', coatD: '#9a3a32', under: '#f2e6cf', eye: '#3a2a20', robe: true, apron: true, mouth: 'smile', brow: 'flat' },
    // Twinwater's people: every one of them on both shores.
    twin1: { skin: '#f0d6c4', hair: '#7a6a5a', hairD: '#5a4a3a', style: 'short', coat: '#9ab8d8', coatD: '#7a98b8', under: '#f4f8fc', legs: '#5a6a8a', boots: '#2e2a30', eye: '#3a4a6a', mouth: 'smile', brow: 'flat' },
    twin2: { skin: '#a8724f', hair: '#2a1d16', hairD: '#160c06', style: 'bun', coat: '#b8d8d0', coatD: '#98b8b0', under: '#f4fcfa', eye: '#2a1a12', robe: true, mouth: 'smile', brow: 'flat' },
    twin3: { skin: '#e8c4a8', hair: '#d8c06a', hairD: '#a88a3a', style: 'bob', coat: '#d8c8e8', coatD: '#b8a8c8', under: '#fbf8ff', legs: '#6a5a7a', boots: '#2e2a30', eye: '#4a3a5a', mouth: 'smile', brow: 'flat' },
    twin4: { skin: '#6e4630', hair: '#3a2018', hairD: '#24120c', style: 'locs', coat: '#c8d8e8', coatD: '#a8b8c8', under: '#f4f8fc', legs: '#4a5a6a', boots: '#1e1a20', eye: '#2a1a12', mouth: 'smile', brow: 'flat' }
  };
  Object.keys(LOOKS).forEach(k => { if (!ART.LOOK[k]) ART.LOOK[k] = LOOKS[k]; });
  const basePerson = ART2 ? ART2.person : ART.person;
  A.person = function (ctx, id, fx, fy, ts, t, face, moving, o) {
    basePerson(ctx, id, fx, fy, ts, t, face, moving, o);
    // Kagemaru: the white gloves, and under the hood only a grin.
    if (id === 'kagemaru' && face !== 'north') frame(ctx, fx, fy, ts, g => {
      const s = face === 'west' ? -1 : face === 'east' ? 1 : 0;
      g.ctx.beginPath(); g.ctx.arc(1.5 * s, -33.5, 3.6, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke('#f6f2ea', 1.3);
      g.circle(-6 + 2 * s, -16, 2.2).fill('#ece8e0', 0.6); g.circle(6 + 2 * s, -16, 2.2).fill('#ece8e0', 0.6);
    });
  };
  // The lake's twins: whoever stands at the water's edge is drawn again in it, upside down and faint. Below them if the
  // water is below, above them if it's above (the near shore's people show up in the lake the wrong way round, which
  // is the point).
  A.reflect = function (ctx, sc, ts, t, isWater) {
    Object.values(sc.actors).forEach(a => {
      if (a.hidden || !a.draw || a.thing || a.id === 'ctl') return;
      const x = Math.round(a.px), y = Math.round(a.py);
      const down = isWater(x, y + 1), up = !down && isWater(x, y - 1);
      if (!down && !up) return;
      const fx = a.px * ts + ts / 2, fy = a.py * ts + ts * 0.95;
      ctx.save();
      ctx.globalAlpha = 0.3 + 0.04 * Math.sin(t * 1.3 + x);
      const pivot = down ? fy : fy - ts * 0.9;
      ctx.translate(0, pivot * 2); ctx.scale(1, -1);
      try { a.draw(ctx, fx, down ? fy : fy - ts * 0.9, ts, t); } catch (e) { /* a reflection is never worth a crash */ }
      ctx.restore();
    });
  };

  // ---------- The ground ----------
  const COB = ['#d8d4ce', '#d2cec8', '#dcd8d2', '#cfcac4'], SAND = ['#e8dcbc', '#e2d6b4', '#ecdfc2', '#ddd0ae'], GRASS = ['#7fa66a', '#79a064', '#85ab6f', '#73995f'];
  const WOOD = ['#a8845a', '#a07c54', '#ae8a60', '#9a7650'];
  A.ground = function (ctx, ch, x, y, ts, t, nb, zone, phase) {
    const X = x * ts, Y = y * ts, h = hash(x, y), u = ts / 32;
    const fill = c => { ctx.fillStyle = c; ctx.fillRect(X, Y, ts + 1, ts + 1); };
    if (ch === 'V') { fill('#141226'); return; }
    if (ch === 'w' || ch === 'j') {
      // The mirror lake: the sky in it, very still, with a slow shimmer.
      const g = ctx.createLinearGradient(X, Y, X, Y + ts);
      const top = phase === 'night' ? '#2a3a6a' : phase === 'dusk' ? '#8a90c0' : '#a8c4e8', bot = phase === 'night' ? '#1e2a52' : phase === 'dusk' ? '#7a80b0' : '#94b4dc';
      g.addColorStop(0, top); g.addColorStop(1, bot);
      ctx.fillStyle = g; ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = u;
      const o = Math.sin(t * 0.6 + x * 0.7 + y * 0.3) * ts * 0.15;
      if (h % 3 === 0) { ctx.beginPath(); ctx.moveTo(X + ts * 0.2 + o, Y + ts * 0.4); ctx.lineTo(X + ts * 0.6 + o, Y + ts * 0.4); ctx.stroke(); }
      if (h % 7 === 2) { ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.3 * Math.sin(t * 2 + h)})`; ctx.fillRect(X + (h % 23) / 23 * ts, Y + (h % 19) / 19 * ts, 1.6 * u, 1.6 * u); }
      // A pale line where the water meets the shore.
      const land = c => c && !'wjG'.includes(c) && c !== 'V';
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.4 * u;
      if (land(nb(0, -1))) { ctx.beginPath(); ctx.moveTo(X, Y + 1); ctx.lineTo(X + ts, Y + 1); ctx.stroke(); }
      if (land(nb(0, 1))) { ctx.beginPath(); ctx.moveTo(X, Y + ts - 1); ctx.lineTo(X + ts, Y + ts - 1); ctx.stroke(); }
      if (ch === 'j') {
        // Jetty boards over the water, with posts at the edges.
        ctx.fillStyle = WOOD[h % 4]; ctx.fillRect(X + ts * 0.04, Y, ts * 0.92, ts + 1);
        ctx.strokeStyle = 'rgba(60,36,20,.35)'; ctx.lineWidth = u;
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X + ts * 0.04, Y + i * ts / 4); ctx.lineTo(X + ts * 0.96, Y + i * ts / 4); ctx.stroke(); }
        if (nb(-1, 0) === 'w') { ctx.fillStyle = '#5a3a1e'; ctx.fillRect(X, Y + ts * 0.4, 3 * u, ts * 0.3); }
        if (nb(1, 0) === 'w') { ctx.fillStyle = '#5a3a1e'; ctx.fillRect(X + ts - 3 * u, Y + ts * 0.4, 3 * u, ts * 0.3); }
      }
      return;
    }
    if (ch === 's') {
      fill(SAND[h % 4]);
      if (h % 5 === 0) { ctx.fillStyle = 'rgba(160,140,100,.35)'; ctx.beginPath(); ctx.ellipse(X + (h % 23) / 23 * ts, Y + (h % 19) / 19 * ts, 2 * u, 1 * u, 0, 0, 7); ctx.fill(); }
      return;
    }
    if (ch === 'g' || ch === 'f') {
      fill(GRASS[h % 4]);
      if (h % 6 === 0) { ctx.strokeStyle = '#5a8448'; ctx.lineWidth = u * 1.2; const tx = X + (h % 23) / 23 * ts * 0.7 + ts * 0.15, ty = Y + (h % 17) / 17 * ts * 0.6 + ts * 0.3; ctx.beginPath(); ctx.moveTo(tx - 3, ty); ctx.lineTo(tx - 1, ty - 5); ctx.moveTo(tx, ty); ctx.lineTo(tx + 1, ty - 6); ctx.stroke(); }
      if (ch === 'f') for (let i = 0; i < 3; i++) { const hx = hash(x * 3 + i, y * 5 - i); ctx.fillStyle = ['#c8e0ff', '#f4f0ff', '#ffffff'][hx % 3]; ctx.beginPath(); ctx.arc(X + (hx % 29) / 29 * ts, Y + (hx % 31) / 31 * ts, u * 1.8, 0, 7); ctx.fill(); }
      return;
    }
    // Twinwater's streets: pale cobbles, swept twice a day (once on each shore).
    fill(COB[h % 4]);
    ctx.strokeStyle = 'rgba(43,35,64,.12)'; ctx.lineWidth = 1;
    const o = (y % 2) * ts / 4;
    for (let i = -1; i < 3; i++) ctx.strokeRect(X + o + i * ts / 2 + 0.5, Y + 0.5, ts / 2, ts / 2);
    for (let i = -1; i < 3; i++) ctx.strokeRect(X - o + i * ts / 2 + ts / 4 + 0.5, Y + ts / 2 + 0.5, ts / 2, ts / 2);
    if (ch === ',') {
      ctx.fillStyle = zone === 'camp' ? '#cdbf9e' : '#e6e2da';
      const r = ts * 0.42, isP = c => c === ',' || /[LM123G]/.test(c);
      ctx.beginPath(); ctx.arc(X + ts / 2, Y + ts / 2, r, 0, 7); ctx.fill();
      if (isP(nb(1, 0))) ctx.fillRect(X + ts / 2, Y + ts / 2 - r, ts / 2 + 1, r * 2);
      if (isP(nb(-1, 0))) ctx.fillRect(X, Y + ts / 2 - r, ts / 2, r * 2);
      if (isP(nb(0, 1))) ctx.fillRect(X + ts / 2 - r, Y + ts / 2, r * 2, ts / 2 + 1);
      if (isP(nb(0, -1))) ctx.fillRect(X + ts / 2 - r, Y, r * 2, ts / 2);
    }
  };
  // A 'T' tile: the camp's trees, Twinwater's clipped hedges, and the cliff outside it all.
  A.wall = function (ctx, x, y, ts, t, zone) {
    const X = x * ts, Y = y * ts, h = hash(x, y);
    if (zone === 'camp') return ART.prop(ctx, { kind: 'tree', x, y, w: 1, h: 1 }, ts, t);
    if (zone === 'near' || zone === 'far') return frame(ctx, X, Y + ts, ts, g => {
      g.rect(1, -22, 30, 22, 6).fill(zone === 'far' ? '#6a9a8a' : '#5a8a7a'); g.rect(4, -20, 24, 8, 4).fill(zone === 'far' ? '#7aaa9a' : '#6a9a8a', false);
    });
    if (h % 3 === 0) return ART.prop(ctx, { kind: 'rock', x, y, w: 1, h: 1 }, ts, t);
    frame(ctx, X, Y + ts, ts, g => {
      g.ell(16, -1, 11, 3).fill('rgba(43,35,64,.2)', false);
      g.rect(14, -9, 4, 9).fill('#6a4a2a');
      [[-40, 11], [-30, 14], [-20, 16]].forEach(([yy, w]) => g.poly(16, yy - 12, 16 + w, yy + 8, 16 - w, yy + 8).fill(h % 2 ? '#3a6a5a' : '#2f5a4a'));
    });
  };

  // ---------- Props ----------
  const PR = {};
  A.prop = function (ctx, p, ts, t) {
    if (p.hidden) return;
    const f = PR[p.kind];
    if (!f) return ART2 ? ART2.prop(ctx, p, ts, t) : ART.prop(ctx, p, ts, t);
    frame(ctx, p.x * ts, (p.y + (p.h || 1)) * ts, ts, g => f(g, p, t));
  };
  // A Twinwater house: white walls, a blue roof, and on the far shore the same house a shade paler.
  PR.twinhouse = (g, p, t) => {
    const W = p.w * 32, H = p.h * 32, far = p.far, freed = p.freed;
    g.ell(W / 2, -1, W * 0.48, 4).fill('rgba(43,35,64,.2)', false);
    g.rect(4, -H * 0.66, W - 8, H * 0.66).fill(far ? '#f4f6fa' : '#eef0f4');
    for (let x = 10; x < W - 10; x += 16) g.rect(x, -H * 0.54, 9, H * 0.22, 1).fill(freed && hash(p.x, x) % 3 === 0 ? '#ffcf7a' : '#9ab8d8', 0.8);
    g.rect(W / 2 - 7, -H * 0.4, 14, H * 0.4, 2).fill(p.door || '#5a7aa8');
    g.poly(0, -H * 0.62, W / 2, -H * 1.02, W, -H * 0.62).fill(p.roof || (far ? '#6a8ac8' : '#4a6aa8'));
    g.line(W / 2, -H * 1.02, W / 2, -H * 1.14).stroke(INK, 1.2); g.circle(W / 2, -H * 1.16, 2).fill('#ffe28a', 0.8);
    if (p.sign) { g.rect(W / 2 - 18, -H * 0.66 - 2, 36, 9, 2).fill('#f6efd8', 0.8); g.text(p.sign, W / 2, -H * 0.66 + 5, 6, '#3a4a7a'); }
  };
  // Kagemaru's stall: a striped awning, a card table, and a sign that is always marked down.
  PR.stall = (g, p, t) => {
    const W = p.w * 32, packed = p.packed;
    g.ell(W / 2, -1, W * 0.48, 3).fill('rgba(43,35,64,.2)', false);
    g.rect(4, -16, W - 8, 16).fill('#3a2a4a');
    if (packed) { g.rect(10, -26, W - 20, 10, 2).fill('#5a4a6a'); g.line(10, -21, W - 10, -21).stroke('#2a1a3a', 1); return; }
    g.line(6, -16, 6, -44).stroke('#5a4a6a', 2.4); g.line(W - 6, -16, W - 6, -44).stroke('#5a4a6a', 2.4);
    for (let i = 0; i < 6; i++) g.poly(2 + i * (W - 4) / 6, -44, 2 + (i + 1) * (W - 4) / 6, -44, 2 + (i + 1) * (W - 4) / 6, -36, 2 + i * (W - 4) / 6, -36).fill(i % 2 ? '#8a5aba' : '#f2eef8', 0.8);
    for (let i = 0; i < 4; i++) g.rect(8 + i * (W - 16) / 4, -22, (W - 16) / 4 - 3, 6, 1).fill(['#ffd24a', '#7fd0ff', '#ff8ab8', '#7fe0a0'][i], 0.6);
    g.rect(W / 2 - 16, -58, 32, 10, 2).fill('#fff8e0', 0.8); g.text('50% OFF', W / 2, -50.5, 6, '#8a2a5a');
  };
  // The place on the jetty where the lake shows you yourself: a ring of brighter water.
  PR.mirror = (g, p, t) => {
    const a = 0.35 + 0.2 * Math.sin(t * 1.4);
    g.ctx.globalAlpha = a; g.ell(16, -14, 14, 6).fill('#ffffff', false); g.ctx.globalAlpha = 1;
    g.ell(16, -14, 14, 6).stroke('rgba(255,255,255,.8)', 1.2);
    g.ell(16, -14, 8 + 2 * Math.sin(t * 2), 3).stroke('rgba(200,220,255,.9)', 0.8);
  };
  // Chad's booth: a banner, a laptop and a stack of brochures.
  PR.booth = (g, p, t) => {
    const W = p.w * 32;
    g.ell(W / 2, -1, W * 0.48, 3).fill('rgba(43,35,64,.2)', false);
    g.rect(4, -20, W - 8, 20, 2).fill('#5a3a8a'); g.rect(8, -26, 20, 6, 1).fill('#2a2a34'); g.rect(10, -32, 16, 7, 1).fill('#7fd0ff', 0.8);
    g.line(4, -20, 4, -58).stroke('#3e2462', 2); g.line(W - 4, -20, W - 4, -58).stroke('#3e2462', 2);
    g.rect(2, -60, W - 4, 16, 2).fill('#ffd24a'); g.text('MIRROR EVERYTHING', W / 2, -53, 5.6, '#3e2462'); g.text('PREMIUM', W / 2, -47, 5.6, '#8a2a34');
    for (let i = 0; i < 3; i++) g.rect(W - 26 + i * 2, -24 - i * 2, 14, 4, 1).fill('#ffffff', 0.6);
  };
  // Mio's relay station: a hut with an aerial and a lamp that blinks with every heartbeat it hears.
  PR.relay = (g, p, t) => {
    const W = p.w * 32, H = p.h * 32, on = p.open;
    g.ell(W / 2, -1, W * 0.48, 4).fill('rgba(43,35,64,.2)', false);
    g.rect(4, -H * 0.62, W - 8, H * 0.62).fill('#e8e0d0');
    g.poly(0, -H * 0.6, W / 2, -H * 0.95, W, -H * 0.6).fill('#ff8ab8');
    g.rect(W / 2 - 7, -H * 0.4, 14, H * 0.4, 2).fill('#5a4a6a');
    g.line(W - 14, -H * 0.8, W - 14, -H * 1.5).stroke('#5a5468', 2); g.line(W - 22, -H * 1.3, W - 6, -H * 1.3).stroke('#5a5468', 1.4);
    g.circle(W - 14, -H * 1.52, 2.6).fill(on && Math.sin(t * 6) > 0 ? '#ff5fa2' : '#5a2a3a', 0.6);
    g.rect(W / 2 - 18, -H * 0.62 - 1, 36, 8, 2).fill('#f6efd8', 0.8); g.text('RELAY', W / 2, -H * 0.62 + 5, 6, '#8a2a5a');
  };
  // Aigerim's card shop: a tent hung with cards, and a diary chained to the pole.
  PR.shop = (g, p, t) => {
    const W = p.w * 32;
    g.ell(W / 2, -1, W * 0.48, 4).fill('rgba(43,35,64,.2)', false);
    g.poly(2, 0, W / 2, -52, W - 2, 0).fill('#c8487a'); g.poly(W / 2 - 8, 0, W / 2, -18, W / 2 + 8, 0).fill('#3a1a2a', false);
    for (let i = 0; i < 5; i++) g.rect(6 + i * (W - 16) / 5, -14 - (i % 2) * 6, 6, 8, 1).fill(['#ffd24a', '#7fd0ff', '#ffffff', '#7fe0a0', '#ff8ab8'][i], 0.6);
    g.rect(W - 14, -10, 10, 8, 1).fill('#6a3a2a', 0.8); g.line(W - 9, -10, W / 2 + 4, -40).stroke('#c8c8d0', 0.8);
  };
  // A knowledge gate across a street: a white arch with its rule on a plaque. Open when you've understood it.
  PR.kgate = (g, p, t) => {
    const W = p.w * 32, open = p.open, col = p.col || '#4a6aa8';
    g.rect(0, -44, 6, 44).fill('#e8ecf4'); g.rect(W - 6, -44, 6, 44).fill('#e8ecf4');
    g.rect(-3, -50, W + 6, 8, 2).fill(col);
    g.rect(W / 2 - 16, -62, 32, 12, 2).fill('#f6efd8', 0.8); g.text(p.label || 'RULE', W / 2, -53, 6, INK);
    if (!open) {
      g.rect(6, -40, W - 12, 40).fill('rgba(120,160,220,.3)', false);
      for (let i = 0; i < 3; i++) g.line(8, -32 + i * 11, W - 8, -36 + i * 11).stroke(`rgba(255,255,255,${0.5 + 0.3 * Math.sin(t * 2 + i)})`, 1.2);
      g.circle(W / 2, -20, 5).fill('#ffd24a', 1); g.rect(W / 2 - 1, -20, 2, 6).fill(INK, false);
    } else g.line(6, -2, W - 6, -2).stroke('rgba(127,224,160,.6)', 2);
  };
  // A raid entrance: a stair going down into the water, with a lamp either side.
  PR.raidgate = (g, p, t) => {
    const W = p.w * 32;
    g.rect(2, -58, W - 4, 58).fill('#8a94b0'); g.rect(10, -46, W - 20, 46).fill(p.open ? '#14182c' : '#3a4060');
    for (let i = 0; i < 4; i++) g.rect(14 + i * 3, -10 - i * 9, W - 28 - i * 6, 4).fill('rgba(160,180,220,.35)', false);
    g.poly(-2, -56, W / 2, -74, W + 2, -56).fill('#4a6aa8');
    [6, W - 6].forEach(x => { g.rect(x - 3, -30, 6, 10, 2).fill('#cfe2ff', 0.8); g.ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 5 + x); g.circle(x, -25, 9).fill('#cfe2ff', false); g.ctx.globalAlpha = 1; });
    if (p.label) { g.rect(W / 2 - 24, -88, 48, 11, 2).fill('#f6efd8', 0.8); g.text(p.label, W / 2, -80, 6, INK); }
  };
  PR.lift = (g, p, t) => {
    g.rect(2, -54, 28, 54).fill('#9aa4bc'); g.rect(6, -48, 20, 48).fill('#1a1e30');
    g.line(16, -54, 16, -80).stroke('#c8d0e0', 2); g.rect(9, -8 - (Math.sin(t) + 1) * 4, 14, 6).fill('#c8a24a', 0.8);
    g.text('LIFT', 16, -57, 6, '#f6efd8');
  };
  // The Design Board, on an easel.
  PR.dboard = (g, p) => {
    g.line(8, 0, 12, -40).stroke('#6a4a2a', 2.2); g.line(24, 0, 20, -40).stroke('#6a4a2a', 2.2);
    g.rect(2, -46, 28, 22, 2).fill('#f6f2e8');
    g.line(6, -40, 14, -40, 14, -32).stroke('#4a6aa8', 1); g.line(18, -42, 26, -36).stroke('#c8487a', 1); g.circle(22, -30, 3).stroke('#2c8a4b', 1);
  };
  PR.desk = (g) => { g.rect(2, -16, 28, 6, 2).fill('#6a4a2a'); g.rect(4, -10, 3, 10).fill('#5a3a1a'); g.rect(25, -10, 3, 10).fill('#5a3a1a'); g.rect(8, -24, 12, 8, 1).fill('#2a2a34'); g.rect(9, -23, 10, 6, 1).fill('#7fd0ff', 0.6); };
  PR.boat = (g, p, t) => {
    const b = Math.sin(t * 1.2 + p.x) * 1.2;
    g.poly(2, -10 + b, 30, -10 + b, 24, -2 + b, 8, -2 + b).fill('#8a5a3a'); g.line(6, -10 + b, 26, -10 + b).stroke('#5a3a1e', 1.2);
  };
  // A Lost Reflection: the chapter's collectible, a pebble that has a reflection when nothing else does.
  PR.page = (g, p, t) => {
    const b = Math.sin(t * 3 + p.x) * 1.5;
    g.ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4 + p.y); g.circle(16, -12 + b, 10).fill('#cfe2ff', false); g.ctx.globalAlpha = 1;
    g.ell(16, -10 + b, 6, 4).fill('#e8ecf4', 0.8); g.ell(16, -3, 5, 1.6).fill('rgba(140,170,220,.6)', false);
    g.line(13, -12 + b, 15, -13 + b).stroke('#ffffff', 1);
  };
  PR.noticeb = (g) => {
    g.line(8, 0, 8, -40).stroke('#5a7aa8', 2.4); g.line(24, 0, 24, -40).stroke('#5a7aa8', 2.4);
    g.rect(2, -44, 28, 24, 2).fill('#f4f6fa'); g.text('TWINWATER', 16, -36, 4.6, '#3a4a7a');
    g.line(6, -31, 26, -31).stroke('#9ab8d8', 0.8); g.line(6, -27, 22, -27).stroke('#9ab8d8', 0.8);
  };

  // ---------- The grade ----------
  const PHASE = { dawn: { mul: 'rgba(230,200,220,.92)', warm: 'rgba(60,24,40,.06)', vig: 0.45 }, day: { mul: 'rgba(250,252,255,1)', warm: null, vig: 0.28 },
    dusk: { mul: 'rgba(200,180,210,.9)', warm: 'rgba(60,30,40,.08)', vig: 0.5 }, night: { mul: 'rgba(96,108,160,.95)', warm: null, vig: 0.68 } };
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
  const { p, c, e } = K;
  const FACE = 'M142 168 C142 205 152 238 200 268 C248 238 258 205 258 168 C258 118 232 98 200 98 C168 98 142 118 142 168Z';
  const grin = w => p(`M${200 - w} 210 Q200 ${232 + w * 0.3} ${200 + w} 210 Q200 ${222 + w * 0.15} ${200 - w} 210Z`, '#f6f2ea', null, null, 0.95);
  const NEW = {
    // Kagemaru: the man in the opening scene, as the first game made him. A hood, white gloves, and under the hood a
    // shadow and a grin and nothing else. The ring goes on over his left glove once he stops hiding it.
    kagemaru: { skin: '#0c0a12', skinD: '#0c0a12', hair: '#0c0a12', hairD: '#05040a', style: 'man', coat: '#100d18', coatD: '#07060c', collar: 'high', gloveL: '#ece8e0', gloveR: '#ece8e0', light: 'lamp',
      faces: { amused: { wide: 1 }, reveal: { reveal: 1, ring: 1, wide: 1 }, ring: { ring: 1 } },
      headOverride: (L, F) => p(FACE, '#0b0910') + grin(F.wide ? 30 : 22) + c(178, 186, 3, '#ffb45a', null, null, F.reveal ? 0.8 : 0.4) + c(222, 186, 3, '#ffb45a', null, null, F.reveal ? 0.8 : 0.4),
      top: (L, F) => (F.reveal ? p('M120 300 C150 290 250 290 280 300 C270 270 240 262 200 262 C160 262 130 270 120 300Z', '#08070c', '#ffb45a', 2, 0.7)
        : p('M140 176 C132 104 166 80 200 80 C236 80 268 104 260 176 C254 132 232 112 200 110 C168 112 146 132 140 176Z', '#08070c', '#ffb45a', 2, 0.9)),
      over: (L, F) => p('M120 316 C150 300 180 296 200 296 L200 780 L104 780Z', '#0b0910', null, null, 0.4)
        + (F.ring ? `<g transform="translate(96 646)">${c(0, 6, 8, 'none', '#e0b44a', 4)}${c(-2, 2, 3, '#ffe9a0')}</g>` : '') },
    mio: { skin: '#f3dcc9', skinD: '#dcbfa9', hair: '#3a2a3a', hairD: '#1e141e', hairL: '#5a4a5a', eye: '#ff5fa2', style: 'bob', coat: '#ff8ab8', coatD: '#d0608c', under: '#fff4f8', collar: 'shirt', blush: 0.5, k: 0.86,
      over: () => K.r(250, 500, 40, 56, '#5a5468', INK, 3, null, 6) + p('M270 500 L270 460', null, '#5a5468', 4) + c(270, 456, 6, '#ff5fa2', INK, 2) },
    aigerim: { skin: '#f0d0b4', skinD: '#d8b090', hair: '#1e1418', hairD: '#0a0608', hairL: '#4a3a3e', eye: '#ff5fa2', style: 'long', coat: '#c8487a', coatD: '#9a2c58', under: '#fbe6ee', collar: 'v', blush: 0.3,
      over: () => K.r(90, 540, 70, 90, '#6a3a2a', INK, 3, null, 6) + p('M100 560 h50 M100 580 h40', null, '#e8dcc0', 3) + p('M125 540 C140 500 170 470 190 440', null, '#c8c8d0', 3) },
    chad: { skin: '#f0d0b4', skinD: '#d8b090', hair: '#c8a24a', hairD: '#9a7a2a', hairL: '#e8c86a', eye: '#2b2340', style: 'short', coat: '#5a3a8a', coatD: '#3e2462', under: '#ffffff', collar: 'shirt', blush: 0.2,
      over: () => p('M196 300 L190 420 L200 440 L210 420 L204 300Z', '#ffd24a', INK, 2.5) + K.r(250, 520, 70, 50, '#f4f6fa', INK, 3, null, 4) + p('M260 540 h50 M260 552 h36', null, '#5a3a8a', 3) },
    gary: { skin: '#e2b496', skinD: '#c8957a', skinD2: '#a87660', hair: '#e2b496', hairD: '#c8957a', eye: '#2b2340', style: 'none', beard: true, age: 1, coat: '#c8763a', coatD: '#9a5a2a', under: '#f2e6cf', collar: 'shirt', blush: 0.3,
      over: () => K.r(110, 560, 180, 110, '#c8a87a', INK, 3, null, 4) + p('M110 590 h180', null, '#9a7a4a', 3) + e(240, 556, 26, 12, '#e8b86a', INK, 2.5) },
    ashgrove: { skin: '#ecccb0', skinD: '#d0ae92', skinD2: '#b48e72', hair: '#c8c2cc', hairD: '#8a8490', hairL: '#f2eef4', eye: '#4a5a6a', style: 'short', beard: true, age: 1, k: 1.06, coat: '#2a2a34', coatD: '#16161e', under: '#d8d4cc', collar: 'high' },
    wen: { skin: '#f0d0b4', skinD: '#d8b090', skinD2: '#c09070', hair: '#dcd7e6', hairD: '#a9a3b8', hairL: '#ffffff', eye: '#3a2a20', style: 'bob', age: 1, coat: '#c8584a', coatD: '#9a3a32', under: '#f2e6cf', collar: 'v', blush: 0.4 }
  };
  Object.keys(NEW).forEach(k => { if (!K.cast[k]) K.cast[k] = NEW[k]; });
  // Your lead's reflection in the lake: the same figure, lit from below by moonlight off the water.
  ['mira', 'kai', 'seoyeon', 'dutch'].forEach(id => { if (K.cast[id]) K.cast['mir' + id] = Object.assign({}, K.cast[id], { light: 'moon' }); });
  const NAMES = {
    kagemaru: { name: 'Kagemaru', title: 'Card Fixer' }, mio: { name: 'Mio', title: 'Hears servers, age 15' }, aigerim: { name: 'Aigerim', title: 'Card Peddler' },
    chad: { name: 'Chad', title: 'Certified Solutions Visionary' }, gary: { name: 'Gary', title: 'Freya\'s Champion, 1984' }, ashgrove: { name: 'Lord Ashgrove', title: 'Caspian\'s father' },
    wen: { name: 'Grandma Wen', title: 'Cache Café' }, twin1: { name: 'A Twinwater fisher', title: 'Floor 81' }, twin2: { name: 'A Twinwater baker', title: 'Floor 81' },
    twin3: { name: 'A Twinwater teacher', title: 'Floor 81' }, twin4: { name: 'A Twinwater boatman', title: 'Floor 81' }
  };
  Object.keys(NAMES).forEach(k => { if (!SD.cast[k]) SD.cast[k] = NAMES[k]; });
  ['mira', 'kai', 'seoyeon', 'dutch'].forEach(id => { SD.cast['mir' + id] = { name: ((SD.cast[id] || {}).name || id) + ', in the lake', title: 'Mirror' }; });
  [['kagemaru', 340], ['mio', 1250], ['aigerim', 900], ['chad', 520], ['gary', 260], ['ashgrove', 300], ['wen', 820], ['twin1', 600], ['twin2', 760], ['twin3', 700], ['twin4', 480]].forEach(([w, hz]) => SD.ui.voice && SD.ui.voice(w, hz));
  // Drawn the first time the visual novel shows them, not at load.
  const lazy = (o, k, make) => { let v; Object.defineProperty(o, k, { enumerable: true, configurable: true, get: () => v || (v = make()) }); };
  const sprite = (id, faces) => { const o = {}; faces.forEach(f => lazy(o, f, () => K.fig(id, f, 'bust'))); return { faces: o }; };
  const SPR = { kagemaru: ['neutral', 'amused', 'reveal', 'ring'], mio: ['neutral', 'smile', 'sad', 'shock', 'earnest'], aigerim: ['neutral', 'smile', 'sad', 'earnest', 'shock'],
    chad: ['neutral', 'smile', 'smug', 'shock'], gary: ['neutral', 'tired'], ashgrove: ['neutral', 'stone', 'sad'], wen: ['neutral', 'smile', 'amused'] };
  const add = {};
  Object.keys(SPR).forEach(id => { if (!(SD.vn.art.sprites[id] && SD.vn.art.sprites[id].faces)) add[id] = sprite(id, SPR[id]); });
  ['mira', 'kai', 'seoyeon', 'dutch'].forEach(id => { if (K.cast['mir' + id]) add['mir' + id] = sprite('mir' + id, ['neutral', 'smile', 'cold', 'warm']); });
  SD.vn.addSprites(add);

  // ---------- Stills ----------
  const S = {}, SF = {};
  const sky = K.skyL, R = K.r, T = K.t, G = K.g;
  const house = (x, y, w, roof, op) => G(R(-w / 2, -150, w, 150, '#eef0f4', K.NIGHT, 3) + p(`M${-w / 2 - 20} -150 L0 -240 L${w / 2 + 20} -150Z`, roof || '#4a6aa8', K.NIGHT, 3) + R(-20, -90, 40, 90, '#5a7aa8', K.NIGHT, 3) + R(-w / 2 + 20, -130, 30, 30, '#9ab8d8', K.NIGHT, 2) + R(w / 2 - 50, -130, 30, 30, '#9ab8d8', K.NIGHT, 2), `translate(${x} ${y})`, op);
  // The same row of houses on both shores of the lake, the far one upside down in the water.
  const shores = (topCol, waterCol) => [R(0, 0, 1200, 1200, topCol), R(0, 600, 1200, 600, waterCol),
    house(220, 560, 180), house(520, 560, 220, '#6a8ac8'), house(860, 560, 200),
    G(house(220, 560, 180) + house(520, 560, 220, '#6a8ac8') + house(860, 560, 200), 'translate(0 1200) scale(1 -1)', 0.35),
    p(Array.from({ length: 14 }, (_, i) => `M${60 + i * 80} ${680 + (i % 3) * 60} h${30 + (i % 4) * 10}`).join(' '), null, '#ffffff', 3, 0.35)];
  // Cold open: Uptima's temple in 1984, before it was Freya's. A console, a box, a croissant on the keyboard.
  SF['c6-1984'] = () => K.scene([sky('c61', '#3a2a1a', '#8a6a3a'), R(0, 0, 1200, 1200, '#4a3622', null, null, 0.4),
    ...Array.from({ length: 5 }, (_, i) => R(80 + i * 260, 120, 60, 760, '#6a5034', K.NIGHT, 3)),
    R(0, 840, 1200, 360, '#3a2a1a'),
    G(R(-200, -160, 400, 160, '#2a2a30', K.NIGHT, 4) + R(-170, -140, 340, 110, '#3a6a3a', K.NIGHT, 3) + p('M-150 -110 h120 M-150 -90 h200 M-150 -70 h80', null, '#9aff9a', 4, 0.8)
      + R(-180, 0, 360, 30, '#4a4a52', K.NIGHT, 3) + e(110, -8, 40, 14, '#e8b86a', K.NIGHT, 3), 'translate(420 820)'),
    G(R(-90, -110, 180, 110, '#c8a87a', K.NIGHT, 3) + p('M-90 -80 h180', null, '#9a7a4a', 3) + T(0, -40, 'GARY', { size: 26, fill: '#6a4a2a' }), 'translate(820 840)'),
    G(p('M-60 0 L-50 -420 C-40 -470 40 -470 50 -420 L60 0Z', '#0b0910', K.NIGHT, 3) + c(-40, -180, 12, '#ece8e0', K.NIGHT, 2) + c(40, -180, 12, '#ece8e0', K.NIGHT, 2), 'translate(1090 900)', 0.9),
    p('M0 0 h1200 v1200 h-1200Z', '#ffcf7a', null, null, 0.06), K.glow('c61g', 420, 680, 420, '#9aff9a', 0.18), K.vignette(1200, 1200, 0.7)]);
  // Twinwater: the lake so still it's a mirror, and the same town on both shores.
  SF['c6-lake'] = () => K.scene([sky('c6l', '#a8c4e8', '#e8eef8'), ...shores('#dce8f8', '#a8c4e8'), K.vignette(1200, 1200, 0.35)]);
  // The jetty at dusk: Kagemaru's stall at the end of it, the awning striped.
  const row = () => house(0, 0, 180) + house(260, 0, 220, '#6a8ac8') + house(520, 0, 200) + house(760, 0, 180, '#6a8ac8') + house(1000, 0, 200);
  SF['c6-jetty'] = () => K.scene([sky('c6j', '#5a5a9a', '#e8b0b8', '#b8a0c8'), R(0, 620, 1200, 580, '#8a90c0'),
    G(row(), 'translate(70 622) scale(0.42)'), G(row(), 'translate(70 618) scale(0.42 -0.42)', 0.3),
    p('M560 1200 L600 640 L660 640 L700 1200Z', '#a8845a', K.NIGHT, 3) + p('M590 760 h90 M580 880 h110 M570 1000 h130 M562 1120 h146', null, '#7a5a3a', 3),
    G(R(-90, -60, 180, 60, '#3a2a4a', K.NIGHT, 3) + p(Array.from({ length: 6 }, (_, i) => `M${-100 + i * 34} -130 h34 v24 h-34Z`).join(' '), '#8a5aba', K.NIGHT, 2) + p('M-96 -60 V-130 M96 -60 V-130', null, '#5a4a6a', 6), 'translate(630 640)'),
    p(Array.from({ length: 10 }, (_, i) => `M${80 + i * 110} ${700 + (i % 3) * 70} h${40 + (i % 3) * 15}`).join(' '), null, '#ffffff', 3, 0.3), K.vignette(1200, 1200, 0.5)]);
  // The mirror: looking down into the lake, and the light of someone standing in it.
  SF['c6-mirror'] = () => K.scene([sky('c6m', '#1e2a52', '#2a3a6a'), K.stars(1200, 1200, 120, 61, 0.6),
    e(600, 640, 420, 140, '#3a4a7a', null, null, 0.7), e(600, 640, 300, 90, '#6a7ab0', null, null, 0.5), K.glow('c6mg', 600, 600, 360, '#cfe2ff', 0.4),
    p('M300 640 Q600 600 900 640', null, '#ffffff', 3, 0.4), K.vignette(1200, 1200, 0.75)]);
  // Seymour's bunker, inside: shelves of tapes, one lamp, and on the tape case a man in a hood.
  SF['c6-bunker'] = () => K.scene([sky('c6b', '#2a2a32', '#3a3a44'), R(0, 0, 1200, 1200, '#3a3e4a'),
    ...Array.from({ length: 4 }, (_, i) => R(60 + i * 290, 160, 240, 560, '#565c6c', K.NIGHT, 3)),
    p(Array.from({ length: 144 }, (_, i) => { const s = i % 4, r = Math.floor(i / 12), c = Math.floor(i / 4) % 3; return (i * 7) % 11 === 3 ? '' : `M${84 + s * 290 + c * 72} ${186 + r * 44} h48 v30 h-48Z`; }).join(' '), '#14101f', '#8a94a8', 2, 0.9),
    R(0, 860, 1200, 340, '#2a2e38'), G(R(-120, -90, 240, 90, '#7a8498', K.NIGHT, 4) + R(-40, -76, 80, 30, '#14101f', K.NIGHT, 2) + T(0, -24, 'No. 401', { size: 22, fill: '#e8d27a', font: 'ui-monospace, monospace' }), 'translate(600 900)'),
    G(p('M0 0 L0 -60', null, '#8a94a8', 4) + e(0, -70, 30, 16, '#ffcf7a', K.NIGHT, 3), 'translate(600 140)'), K.glow('c6bg', 600, 260, 520, '#ffcf7a', 0.3), K.vignette(1200, 1200, 0.75)]);
  // The camp at the tower's foot, at night.
  SF['c6-camp'] = () => K.scene([sky('c6c', '#0e0c18', '#1a1420'), K.stars(1200, 600, 120, 43, 0.8), R(0, 760, 1200, 440, '#1e2414'),
    G(p('M-160 0 L0 -200 L160 0Z', '#c8487a', K.NIGHT, 4), 'translate(250 860)'), G(R(-120, -160, 240, 160, '#e8e0d0', K.NIGHT, 4) + p('M-140 -160 L0 -240 L140 -160Z', '#ff8ab8', K.NIGHT, 4) + p('M80 -240 V-340', null, '#5a5468', 6), 'translate(950 880)'),
    G(p('M-50 10 L50 -6 M-46 -6 L48 12', null, '#4a2c16', 12) + p('M-36 0 C-46 -46 -18 -72 0 -120 C10 -82 36 -64 36 0Z', '#ff8a2a', K.NIGHT, 3) + p('M-16 0 C-20 -28 -6 -46 0 -72 C8 -46 20 -28 16 0Z', '#ffe08a'), 'translate(600 960) scale(1.2)'),
    K.glow('c6cg', 600, 900, 460, '#ff9a3a', 0.45), K.vignette(1200, 1200, 0.65)]);
  // Kagemaru's vault: a card table, Freya's backup under glass, Seymour's tape beside it.
  SF['c6-vault'] = () => K.scene([sky('c6v', '#1a1428', '#2a2040'), R(0, 0, 1200, 1200, '#221a32'),
    ...Array.from({ length: 6 }, (_, i) => R(40 + i * 200, 100, 120, 760, '#3a2e50', K.NIGHT, 3)),
    R(0, 860, 1200, 340, '#140f20'), G(R(-260, -40, 520, 40, '#3a6a4a', K.NIGHT, 4) + p('M-240 0 L-220 140 M240 0 L220 140', null, '#3a2a1a', 10), 'translate(600 820)'),
    G(R(-90, -150, 180, 150, '#cfe2ff', K.NIGHT, 3, 0.35) + e(0, -70, 50, 40, '#ffd76a', K.NIGHT, 3, 0.8) + T(0, -164, 'RETAIN UNTIL 12026', { size: 20, fill: '#cfe2ff', font: 'ui-monospace, monospace' }), 'translate(470 780)'),
    G(R(-60, -40, 120, 40, '#7a8498', K.NIGHT, 3) + R(-24, -32, 48, 18, '#14101f') + T(0, -46, 'No. 401', { size: 16, fill: '#e8d27a', font: 'ui-monospace, monospace' }), 'translate(760 780)'),
    K.glow('c6vg', 600, 700, 480, '#8a6cff', 0.3), K.vignette(1200, 1200, 0.8)]);
  // The Clock Room: a key under glass, and a countdown over it.
  SF['c6-clock'] = () => K.scene([sky('c6k', '#2a1a1a', '#1a1018'), R(0, 0, 1200, 1200, '#2a1c22'),
    c(600, 420, 300, '#3a2a30', K.NIGHT, 6) + c(600, 420, 260, '#f4ecd8', K.NIGHT, 4) + p('M600 420 L600 220 M600 420 L740 480', null, INK, 10) + c(600, 420, 14, INK),
    ...Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2; return c((600 + Math.sin(a) * 230).toFixed(0), (420 - Math.cos(a) * 230).toFixed(0), 8, INK); }),
    G(R(-120, -60, 240, 60, '#cfe2ff', K.NIGHT, 3, 0.4) + c(-30, -30, 18, '#ffd24a', K.NIGHT, 3) + R(-12, -36, 80, 12, '#ffd24a', K.NIGHT, 3), 'translate(600 900)'),
    T(600, 1060, '00 : 00 : 59', { size: 64, fill: '#ff6a6a', font: 'ui-monospace, monospace' }), K.vignette(1200, 1200, 0.75)]);
  // Twinwater freed, at dawn: the lake ripples, and the reflections don't match any more.
  SF['c6-freed'] = () => K.scene([sky('c6f', '#6a5a9a', '#ffc8a0', '#f0a0b8'), R(0, 600, 1200, 600, '#c8a8c8'),
    house(220, 560, 180), house(520, 560, 220, '#6a8ac8'), house(860, 560, 200),
    G(house(300, 560, 160) + house(700, 560, 240, '#6a8ac8'), 'translate(0 1200) scale(1 -1)', 0.3),
    p(Array.from({ length: 20 }, (_, i) => `M${30 + i * 60} ${640 + (i % 5) * 50} q15 -8 30 0`).join(' '), null, '#ffffff', 3, 0.5), c(900, 300, 90, '#ffe8c0', null, null, 0.7), K.vignette(1200, 1200, 0.35)]);
  Object.keys(SF).forEach(k => lazy(S, k, SF[k]));
  A.scenes = S;
  SD.vn.addScenes(Object.fromEntries(Object.keys(SF).map(k => { const o = { label: k }; lazy(o, 'src', () => S[k]); return [k, o]; })));

  // ---------- Enemies ----------
  const SS = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const eyes = (x1, x2, y, r) => `<circle cx="${x1}" cy="${y}" r="${r || 4}" fill="#fff" ${SS}/><circle cx="${x2}" cy="${y}" r="${r || 4}" fill="#fff" ${SS}/><circle cx="${x1 + 1}" cy="${y + 1}" r="1.8" fill="${INK}"/><circle cx="${x2 - 1}" cy="${y + 1}" r="1.8" fill="${INK}"/>`;
  const tag = (t, col, y) => { const w = Math.max(44, t.length * 5.4 + 10); return `<rect x="${60 - w / 2}" y="${y || 100}" width="${w}" height="15" rx="4" fill="#fff8e0" stroke="${col || INK}" stroke-width="2"/><text x="60" y="${(y || 100) + 11}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="${col || INK}">${K.esc(t)}</text>`; };
  // A twin's faint double, a little behind and to the right.
  const ghost = svg => `<g opacity=".28" transform="translate(14 -6)">${svg}</g>${svg}`;
  const BODY = {
    // A stair with a face on the top step.
    stair: o => `<g ${SS}><path d="M14 104 H104 V84 H84 V64 H64 V44 H44 V28 H24 V104Z" fill="${o.col}"/><path d="M24 44 H44 M44 64 H64 M64 84 H84" fill="none" stroke-width="2"/></g>${eyes(30, 40, 38, 3)}`,
    // A sleepy guard with a lantern.
    watch: o => `<g ${SS}><path d="M34 112 L38 64 H82 L86 112Z" fill="${o.col}"/><circle cx="60" cy="48" r="17" fill="${o.skin || '#e8ecf4'}"/><path d="M40 42 Q60 20 80 42 Q70 32 60 32 Q50 32 40 42Z" fill="${o.col2 || '#4a6aa8'}"/><path d="M92 112 V70 M86 70 H98 V86 H86Z" fill="#ffe28a"/></g>${eyes(53, 67, 48, 3)}<path d="M54 58 H66" stroke="${INK}" stroke-width="2.5"/>`,
    // A coin standing on its edge.
    coin: o => `<g ${SS}><ellipse cx="60" cy="60" rx="34" ry="40" fill="${o.col}"/><ellipse cx="60" cy="60" rx="24" ry="30" fill="none" stroke-width="2"/></g>${eyes(50, 70, 54, 4)}<text x="60" y="84" text-anchor="middle" font-family="ui-monospace, monospace" font-size="12" font-weight="700" fill="${INK}">90%</text>`,
    // A heart on a monitor line, beating when it shouldn't.
    heart: o => `<g ${SS}><path d="M60 100 C20 74 14 46 34 34 C46 26 56 32 60 42 C64 32 74 26 86 34 C106 46 100 74 60 100Z" fill="${o.col}"/><path d="M6 66 H34 L42 52 L50 80 L58 60 H114" fill="none" stroke-width="2.5" stroke="#2c8a4b"/></g>${eyes(48, 72, 54, 4)}`,
    // A lighthouse with a lamp and a face.
    light: o => `<g ${SS}><path d="M42 112 L48 40 H72 L78 112Z" fill="${o.col}"/><path d="M45 70 H75 M44 90 H76" fill="none" stroke="#d63a3a" stroke-width="6"/><rect x="44" y="24" width="32" height="16" fill="#ffe28a"/><path d="M40 24 L60 8 L80 24Z" fill="${o.col2 || '#4a6aa8'}"/></g>${eyes(54, 66, 54, 3)}`,
    // A flame in a little house.
    flame: o => `<g ${SS}><path d="M24 112 V60 L60 32 L96 60 V112Z" fill="${o.col2 || '#e8e0d0'}"/><path d="M60 104 C40 98 44 76 60 60 C76 76 80 98 60 104Z" fill="${o.col}"/></g>${eyes(52, 68, 88, 3)}`,
    // A box of backups with a face.
    box: o => `<g ${SS}><rect x="22" y="40" width="76" height="64" rx="6" fill="${o.col}"/><path d="M22 56 H98 M60 40 V56" fill="none" stroke-width="2.5"/><path d="M30 40 L40 26 H80 L90 40" fill="${o.col2 || '#c8a87a'}"/></g>${eyes(46, 74, 76, 4)}`,
    // Two clerks of the same face.
    clerk: o => `<g ${SS}><path d="M30 114 Q30 70 60 62 Q90 70 90 114Z" fill="${o.col}"/><circle cx="60" cy="46" r="17" fill="${o.skin || '#f0d6c4'}"/><path d="M46 38 Q60 22 74 38" fill="${o.col2 || '#7a6a5a'}"/><rect x="66" y="80" width="26" height="20" rx="2" fill="#f4f6fa"/></g>${eyes(53, 67, 48, 3)}`,
    // A bridge with a toll booth.
    bridge: o => `<g ${SS}><path d="M6 96 Q60 40 114 96" fill="none" stroke-width="8" stroke="${o.col}"/><path d="M6 96 H114" fill="none" stroke-width="4"/><rect x="44" y="40" width="32" height="34" rx="3" fill="${o.col2 || '#ffd24a'}"/></g>${eyes(52, 68, 54, 3)}<text x="60" y="70" text-anchor="middle" font-family="ui-monospace, monospace" font-size="9" font-weight="700" fill="${INK}">$</text>`,
    // A coil of cable with an eye.
    cable: o => `<g ${SS}><circle cx="60" cy="64" r="34" fill="none" stroke-width="10" stroke="${o.col}"/><circle cx="60" cy="64" r="20" fill="none" stroke-width="6" stroke="${o.col}"/><path d="M94 64 H116" fill="none" stroke-width="8" stroke="${o.col}"/></g>${eyes(52, 68, 64, 4)}`,
    // A key with a face on its bow.
    key: o => `<g ${SS}><circle cx="44" cy="52" r="26" fill="${o.col}"/><circle cx="44" cy="52" r="9" fill="#fff8e0"/><path d="M68 52 H108 V62 H100 V72 H92 V62 H84 V68 H76 V58 H68Z" fill="${o.col}"/></g>${eyes(36, 52, 40, 3)}`,
    // A padlock with eyes.
    lock: o => `<g ${SS}><path d="M38 56 V40 Q38 18 60 18 Q82 18 82 40 V56" fill="none" stroke-width="6" stroke="${o.col2 || '#7a7484'}"/><rect x="26" y="52" width="68" height="54" rx="8" fill="${o.col}"/><circle cx="60" cy="80" r="7" fill="${INK}"/></g>${eyes(46, 74, 66, 4)}`,
    // A clock with a countdown.
    clock: o => `<g ${SS}><circle cx="60" cy="58" r="40" fill="${o.col}"/><circle cx="60" cy="58" r="32" fill="#f4ecd8"/><path d="M60 58 V34 M60 58 L76 66" fill="none" stroke-width="4"/></g>${eyes(48, 72, 50, 3)}`,
    // A shadow in the water, grinning.
    shadow: o => `<g ${SS}><path d="M24 110 Q20 60 60 30 Q100 60 96 110 Q80 100 60 110 Q40 100 24 110Z" fill="${o.col}" opacity=".9"/></g><path d="M42 70 Q60 86 78 70 Q60 78 42 70Z" fill="#f6f2ea"/><circle cx="48" cy="56" r="3" fill="#ffb45a"/><circle cx="72" cy="56" r="3" fill="#ffb45a"/>`
  };
  const FOE = {
    oneaz: ['stair', '#c8d0e0', 'shake', '1 AZ'], standby: ['watch', '#9ab8d8', 'float', 'standby', { ghost: 1 }], coin: ['coin', '#ffd24a', 'squish', 'weight 90/10'], liar: ['heart', '#ff8ab8', 'shake', 'HTTP 200 (lie)'],
    watchman: ['watch', '#4a6aa8', 'float', 'primary', { ghost: 1, col2: '#2a3a6a' }], watchtwin: ['watch', '#8aaad8', 'float', 'secondary'],
    pilot: ['flame', '#ff9a3a', 'float', 'pilot light'], warm: ['flame', '#ffcf7a', 'squish', 'warm standby', { col2: '#cfe2ff' }], active: ['flame', '#ff6a3a', 'shake', 'active/active', { ghost: 1 }],
    restorer: ['box', '#c8a87a', 'squish', 'RTO: 6h'], keeper: ['light', '#f4f6fa', 'float', 'RPO? RTO?'], keepertwin: ['light', '#cfe2ff', 'float', 'lamp 2'],
    lag: ['clerk', '#9ab8d8', 'float', 'lag: 3600s', { ghost: 1 }], lastwriter: ['clerk', '#d8c8e8', 'shake', 'last writer'], xread: ['clerk', '#b8d8d0', 'float', 'us-east-1?'], gtable: ['box', '#7fd0ff', 'float', 'global table', { ghost: 1 }],
    splitbrain: ['clerk', '#6a5aa8', 'shake', 'two writers', { ghost: 1 }], splittwin: ['clerk', '#8a7ac8', 'shake', 'writer 2'],
    tangle: ['bridge', '#8a94b0', 'shake', 'A-B-C?'], hub: ['bridge', '#5a6a8a', 'float', 'TGW $/GB'], privpath: ['key', '#7fe0a0', 'float', 'PrivateLink'], natbill: ['bridge', '#c8a24a', 'squish', '$0.045/GB'],
    longcable: ['cable', '#5a5468', 'shake', 'one line'], toll: ['bridge', '#8a6a3a', 'float', 'cross-AZ $', { ghost: 1, col2: '#ffd24a' }], tolltwin: ['bridge', '#a8845a', 'float', 'inter-Region $'],
    drift: ['clerk', '#e8c4a8', 'shake', 'drifted', { ghost: 1 }], onekey: ['key', '#c8a24a', 'float', '1 Region'], immutablee: ['box', '#e8ecf4', 'float', 'replaced, not patched', { col2: '#9aa4bc' }],
    shadow: ['shadow', '#14101f', 'float', 'replica key'], shadowtwin: ['shadow', '#2a2240', 'float', 'reflection'],
    unlabelled: ['box', '#d8d4ce', 'squish', 'no tags'], untested: ['box', '#c8b48a', 'shake', 'never restored'], snapfreq: ['clock', '#9ab8d8', 'shake', 'every 24h'],
    archivists: ['clerk', '#5a4a6a', 'float', 'same account', { ghost: 1 }], archtwin: ['clerk', '#7a6a8a', 'float', 'same Region'],
    governance: ['lock', '#9ab8d8', 'shake', 'governance'], compliance: ['lock', '#4a6aa8', 'float', 'until 2036'], legalhold: ['lock', '#c8a24a', 'float', 'hold: no date'], lifecycler: ['clock', '#7fe0a0', 'squish', 'expire: 90d'],
    smiths: ['lock', '#2c3a5a', 'shake', 'which lock?', { ghost: 1 }], smithtwin: ['lock', '#5a6a8a', 'shake', 'the other lock'],
    pending: ['clock', '#ff8a8a', 'shake', 'pending deletion'], window: ['clock', '#d63a3a', 'shake', '7-30 days', { ghost: 1 }], windowtwin: ['clock', '#e86a6a', 'shake', 'replica: pending']
  };
  Object.keys(FOE).forEach(id => {
    const [body, col, anim, label, more] = FOE[id], o = Object.assign({ col }, more), svg = BODY[body](o);
    SD.art.addFoe('r6-' + id, { col, anim, svg: (o.ghost ? ghost(svg) : svg) + tag(label, /lie|pending|deletion|\$|never|no |one line/i.test(label) ? '#d63a3a' : INK) });
  });
  // Kagemaru and the mirror: drawn from the figures themselves, so the boss is the man you've been buying from.
  const figFoe = (id, face, label, col, op) => () => {
    const f = K.fig(id, face, 'full');
    return f ? `<image href="${f}" x="22" y="0" width="76" height="114" preserveAspectRatio="xMidYMax meet"${op ? ` opacity="${op}"` : ''}/>${tag(label, col)}` : tag(label, col);
  };
  SD.art.addFoe('r6-kagemaru', { col: '#100d18', anim: 'float', svg: figFoe('kagemaru', 'reveal', 'Kagemaru', '#8a2a5a') });
  ['mira', 'kai', 'seoyeon', 'dutch'].forEach(id => SD.art.addFoe('r6-mir' + id, { col: '#cfe2ff', anim: 'float', svg: figFoe(K.cast['mir' + id] ? 'mir' + id : id, 'cold', 'your reflection', '#4a6aa8', 0.85) }));

  // ---------- The raid, in vector ----------
  // While a chapter 6 raid plays (js/c6-world.js turns it on with A.raidArt(true)): a drawn backdrop over the painted
  // one, each champion's standing figure as a one-frame sheet (js/raid.js reads its idle row at y = 2h), and no painted
  // map tiles (SD.dungeonArt is set aside, so the engine draws plain rooms over the drawn map below).
  let css = null;
  const raidCss = () => {
    if (css) return;
    css = document.createElement('style');
    const back = K.scene([sky('c6rb', '#2a3050', '#6a7ab0'), ...shores('#3a4060', '#2a3050').slice(1), K.vignette(1200, 1200, 0.6)]);
    const mapBg = K.uri(K.svg('0 0 120 120', R(0, 0, 120, 120, '#22283e') + p('M0 30 Q30 24 60 32 T120 30 M0 90 Q40 84 70 92 T120 88', null, '#2e3652', 6) + c(20, 60, 3, '#3a4460') + c(90, 60, 4, '#3a4460')));
    css.textContent = `html.c6raid .rd-stage { background-image: url("${back}") !important; background-size: cover !important; background-position: center !important; }
html.c6raid .rd .map { background: url("${mapBg}") repeat, #22283e; background-size: 120px 120px; }`;
    document.head.appendChild(css);
  };
  let keptArt = null;
  A.raidArt = function (on) {
    if (on) raidCss();
    document.documentElement.classList.toggle('c6raid', !!on);
    if (on && SD.dungeonArt) { keptArt = SD.dungeonArt; SD.dungeonArt = null; }
    if (!on && keptArt) { SD.dungeonArt = keptArt; keptArt = null; }
    const CH = SD.champions;
    if (on && CH) CH.list.forEach(ch => {
      if (ch.sheet && !/^assets\//.test(ch.sheet)) return;
      const w = ch.w, h = ch.h, fig = K.fig(ch.id, 'neutral', 'full');
      if (!fig) return;
      ch.n = 0;
      ch.sheet = K.uri(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h * 3}" width="${w}" height="${h * 3}"><image href="${fig}" xlink:href="${fig}" x="${w * 0.08}" y="${h * 2}" width="${w * 0.84}" height="${h}" preserveAspectRatio="xMidYMax meet"/></svg>`);
    });
  };
})();
