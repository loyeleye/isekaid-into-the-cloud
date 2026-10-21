// Chapter 2's explorable act 1 (js/c2-world.js), drawn in code in chapter 1's overworld style (js/ch1-art.js): the
// edge of the Cloud, the road to Freya's tower, the scrap field where she dumps what she deletes, Seymour's bunker,
// the tower's foot and Thornwick's town floor. Deleted things are drawn as ghosts: faint until you look through the
// Version Lens, then cyan, with their delete marker on top. Same units as chapter 1: 32 to a tile, people and props
// standing on the bottom edge of their footprint.
(function () {
  const A = SD.c2art = {};
  const ART = SD.c1art;
  const INK = '#2b2340';
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

  // ---------- Drawing helpers (unit coordinates, as in js/ch1-art.js) ----------
  function P(ctx) {
    const p = {
      ctx,
      fill(c, line) { ctx.fillStyle = c; ctx.fill(); if (line !== false) { ctx.strokeStyle = A.ink || INK; ctx.lineWidth = line || 1.2; ctx.stroke(); } return p; },
      stroke(c, w) { ctx.strokeStyle = c || A.ink || INK; ctx.lineWidth = w || 1.2; ctx.stroke(); return p; },
      poly(...pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); return p; },
      line(...pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); return p; },
      circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); return p; },
      ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); return p; },
      rect(x, y, w, h, r) { ctx.beginPath(); if (r && ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); return p; },
      path(fn) { ctx.beginPath(); fn(ctx); return p; },
      text(s, x, y, size, col, weight) { ctx.fillStyle = col || INK; ctx.font = `${weight || 700} ${size}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(s, x, y); return p; }
    };
    return p;
  }
  function frame(ctx, x, y, ts, fn, flip, k) {
    ctx.save(); ctx.translate(x, y); const u = ts / 32 * (k || 1); ctx.scale(flip ? -u : u, u);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    fn(P(ctx));
    ctx.restore();
  }

  // ---------- People ----------
  // New faces for the overworld, in chapter 1's chibi kit; the visual-novel figures are in js/vec-cast.js.
  Object.assign(ART.LOOK, {
    tilly: { skin: '#f0d6c4', hair: '#8a5a2a', hairD: '#6a3e1a', style: 'short', coat: '#8a8a92', coatD: '#626270', under: '#d8d8de', legs: '#626270', boots: '#2e2a30', eye: '#5a6a3a', mouth: 'flat', brow: 'flat', net: true },
    marrow: { skin: '#e8c4a8', hair: '#c8c2cc', hairD: '#9a94a0', style: 'hood', hood: '#6a3a4a', coat: '#5a4a3a', coatD: '#3e3226', under: '#e8dcc4', eye: '#4a3a2a', robe: true, mouth: 'flat', brow: 'sad' },
    villager: { skin: '#e2b496', hair: '#6b3d22', hairD: '#4a2914', style: 'short', coat: '#7a6a8a', coatD: '#5a4a6a', under: '#e8dcc4', legs: '#4a3b2a', boots: '#2e2218', eye: '#3b2a20', mouth: 'flat', brow: 'sad' },
    villager2: { skin: '#a8724f', hair: '#2a1d16', hairD: '#160c06', style: 'bun', coat: '#6a8a7a', coatD: '#4a6a5a', under: '#f1e7c6', eye: '#2a1a12', robe: true, mouth: 'flat', brow: 'sad' },
    villager3: { skin: '#f0d0b4', hair: '#d8c06a', hairD: '#a88a3a', style: 'bob', coat: '#9a6a4a', coatD: '#7a4a2a', under: '#f2efe8', legs: '#4a3b2a', boots: '#2e2218', eye: '#3a2a20', mouth: 'flat', brow: 'flat' }
  });
  // Tilly's pole-net, over her shoulder.
  const basePerson = ART.person;
  A.person = function (ctx, id, fx, fy, ts, t, face, moving, o) {
    if (id === 'coo') return coo(ctx, fx, fy, ts, t, face, moving, o);
    basePerson(ctx, id, fx, fy, ts, t, face, moving, o);
    if (ART.LOOK[id] && ART.LOOK[id].net) frame(ctx, fx, fy, ts, g => {
      const s = face === 'west' ? -1 : 1;
      g.line(-6 * s, -12, 8 * s, -46).stroke('#7a5232', 1.6);
      g.ell(10 * s, -50, 6, 4, -0.5 * s).stroke('#d8d8de', 1);
      g.line(5 * s, -52, 15 * s, -48).stroke('rgba(216,216,222,.6)', 0.5); g.line(8 * s, -54, 12 * s, -46).stroke('rgba(216,216,222,.6)', 0.5);
    });
  };
  // Postmaster Coo: a pigeon in a postman's cap with a satchel. Bobs his head as he walks, as pigeons do.
  function coo(ctx, fx, fy, ts, t, face, moving, o) {
    const flip = face === 'west', back = face === 'north', bob = moving ? Math.sin(t * 16) * 2 : Math.sin(t * 2) * 0.4;
    frame(ctx, fx, fy, ts, g => g.ell(0, 0, 8, 2.4).fill('rgba(43,35,64,.22)', false));
    if (o && o.alpha != null) { ctx.save(); ctx.globalAlpha = o.alpha; }
    frame(ctx, fx, fy, ts, g => {
      g.line(-2, 0, -2, -5).stroke('#d86a6a', 1.4); g.line(2, 0, 2, -5).stroke('#d86a6a', 1.4);
      g.ell(0, -12, 9, 8).fill('#8f95a6');
      g.ell(-3, -10, 5, 4.4).fill('#a6acbb', false);
      g.path(c => { c.moveTo(5, -16); c.quadraticCurveTo(13, -14, 10, -7); c.quadraticCurveTo(7, -9, 4, -10); c.closePath(); }).fill('#6f7586');
      // Satchel across the chest.
      g.line(-6, -18, 5, -7).stroke('#7a5232', 1.4); g.rect(2, -10, 6, 5, 1).fill('#9a6a3a', 0.8);
      const hx = back ? 0 : 2 + bob * 0.5;
      g.path(c => { c.moveTo(hx - 4, -18); c.quadraticCurveTo(hx - 5, -23, hx, -24); c.quadraticCurveTo(hx + 5, -23, hx + 4, -18); c.closePath(); }).fill('#5fae9a', 0.8);
      g.circle(hx, -27, 5.4).fill('#8f95a6');
      if (!back) {
        g.poly(hx + 4.6, -27.4, hx + 8.6, -26.2, hx + 4.6, -25).fill('#e8b23a', 0.8);
        g.circle(hx + 2, -28, 1.4).fill('#ff8a3a', 0.6); g.circle(hx + 2.2, -28.2, 0.5).fill('#111', false);
      }
      // The cap.
      g.rect(hx - 5, -34, 10, 4.4, 1.4).fill('#24345e', 0.9); g.rect(hx - 1, -30.4, 8, 1.6, 0.8).fill('#172342', 0.7);
      g.circle(hx, -32, 0.9).fill('#ffcf33', false);
    }, flip);
    if (o && o.alpha != null) ctx.restore();
  }

  // ---------- Ground ----------
  // . turf  , path  x scrap dust  c cobbles  V nothing (the floor stops)  B a deleted bridge  b the bridge, restored
  // W the tower's wall  D the tower's door  U the stair up to the Sorting Floors  f dead flowers
  const TURF = ['#7fa06a', '#7a9b65', '#83a46e', '#789963'];
  const DUST = ['#9a948c', '#958f87', '#9f9991', '#928c84'];
  const isVoid = c => c === 'V' || c === 'B';
  A.ground = function (ctx, ch, x, y, ts, t, nb, lens) {
    const X = x * ts, Y = y * ts, h = hash(x, y), u = ts / 32;
    if (isVoid(ch)) {
      ctx.fillStyle = '#0b0a14'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      // Far stars, twinkling: there's nothing under the Cloud at all.
      for (let i = 0; i < 2; i++) {
        const hs = hash(x * 7 + i, y * 3 - i); if (hs % 3) continue;
        ctx.fillStyle = `rgba(220,226,255,${0.35 + 0.35 * Math.sin(t * 1.5 + hs)})`;
        ctx.fillRect(X + (hs % 29) / 29 * ts, Y + ((hs >> 5) % 31) / 31 * ts, u * 1.2, u * 1.2);
      }
      // A crumbling lip where the floor gives out.
      ['-1,0', '1,0', '0,-1', '0,1'].forEach(k => {
        const [dx, dy] = k.split(',').map(Number), n = nb(dx, dy);
        if (isVoid(n) || n === 'T') return;
        ctx.fillStyle = '#3a3542';
        for (let i = 0; i < 4; i++) {
          const hs = hash(x * 5 + i + dx * 13, y * 9 + i + dy * 17), s = (3 + hs % 5) * u, o = (i + 0.5) / 4 * ts;
          const cx = dx > 0 ? X + ts - s / 2 : dx < 0 ? X + s / 2 : X + o, cy = dy > 0 ? Y + ts - s / 2 : dy < 0 ? Y + s / 2 : Y + o;
          ctx.fillRect(cx - s / 2, cy - s / 2 + ((t * 3 + hs) % 7 < 0.2 ? u : 0), s, s);
        }
      });
      if (ch === 'B' && lens) {
        // The bridge's ghost: planks in dashed cyan, where it used to be.
        ctx.strokeStyle = `rgba(110,230,255,${0.55 + 0.2 * Math.sin(t * 3)})`; ctx.lineWidth = 1.4 * u; ctx.setLineDash([4 * u, 3 * u]);
        ctx.strokeRect(X + 1, Y + ts * 0.12, ts - 2, ts * 0.76);
        for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X + i * ts / 4, Y + ts * 0.12); ctx.lineTo(X + i * ts / 4, Y + ts * 0.88); ctx.stroke(); }
        ctx.setLineDash([]);
      }
      return;
    }
    const turf = ch === '.' || ch === 'f' || ch === 'T' || ch === '#';
    if (ch === 'x' || ch === 'W' || (ch === 'D' && !A.inTown(x))) {
      ctx.fillStyle = DUST[h % 4]; ctx.fillRect(X, Y, ts + 1, ts + 1);
      if (h % 4 === 0) { ctx.fillStyle = ['#b9b2a6', '#7a746c', '#c9a06a', '#8aa0c0'][h % 7 % 4]; ctx.fillRect(X + (h % 23) / 23 * ts * 0.8, Y + (h % 19) / 19 * ts * 0.8, 3 * u, 2 * u); }
      if (h % 9 === 1) { ctx.strokeStyle = 'rgba(43,35,64,.25)'; ctx.lineWidth = u; ctx.beginPath(); ctx.moveTo(X + ts * 0.2, Y + ts * 0.6); ctx.lineTo(X + ts * 0.5, Y + ts * 0.5); ctx.lineTo(X + ts * 0.7, Y + ts * 0.75); ctx.stroke(); }
      return;
    }
    if (ch === 'c' || ch === 'U' || (ch === 'D' && A.inTown(x))) {
      ctx.fillStyle = h % 2 ? '#bdb5a8' : '#b6aea1'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.strokeStyle = 'rgba(43,35,64,.16)'; ctx.lineWidth = 1;
      const o = (y % 2) * ts / 4;
      for (let i = -1; i < 3; i++) ctx.strokeRect(X + o + i * ts / 2 + 0.5, Y + 0.5, ts / 2, ts / 2);
      for (let i = -1; i < 3; i++) ctx.strokeRect(X - o + i * ts / 2 + ts / 4 + 0.5, Y + ts / 2 + 0.5, ts / 2, ts / 2);
      return;
    }
    ctx.fillStyle = TURF[h % 4]; ctx.fillRect(X, Y, ts + 1, ts + 1);
    if (turf && h % 6 === 0) {
      ctx.strokeStyle = '#61844f'; ctx.lineWidth = u * 1.2;
      const tx = X + (h % 23) / 23 * ts * 0.7 + ts * 0.15, ty = Y + (h % 17) / 17 * ts * 0.6 + ts * 0.3;
      ctx.beginPath(); ctx.moveTo(tx - 3, ty); ctx.lineTo(tx - 1, ty - 5); ctx.moveTo(tx, ty); ctx.lineTo(tx + 1, ty - 6); ctx.stroke();
    }
    if (ch === 'f') for (let i = 0; i < 3; i++) { const hx = hash(x * 3 + i, y * 5 - i); ctx.fillStyle = ['#c9a0a8', '#d8cfa0', '#b0a8c0'][hx % 3]; ctx.beginPath(); ctx.arc(X + (hx % 29) / 29 * ts, Y + (hx % 31) / 31 * ts, u * 1.8, 0, 7); ctx.fill(); }
    if (ch === ',') {
      ctx.fillStyle = '#cdb68e';
      const r = ts * 0.44, isP = c => c === ',' || c === 'b' || c === 'D';
      ctx.beginPath(); ctx.arc(X + ts / 2, Y + ts / 2, r, 0, 7); ctx.fill();
      if (isP(nb(1, 0))) ctx.fillRect(X + ts / 2, Y + ts / 2 - r, ts / 2 + 1, r * 2);
      if (isP(nb(-1, 0))) ctx.fillRect(X, Y + ts / 2 - r, ts / 2, r * 2);
      if (isP(nb(0, 1))) ctx.fillRect(X + ts / 2 - r, Y + ts / 2, r * 2, ts / 2 + 1);
      if (isP(nb(0, -1))) ctx.fillRect(X + ts / 2 - r, Y, r * 2, ts / 2);
    }
    if (ch === 'b') {
      ctx.fillStyle = '#0b0a14'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.fillStyle = '#b57a45'; ctx.fillRect(X, Y + ts * 0.1, ts + 1, ts * 0.8);
      ctx.strokeStyle = '#7a4c28'; ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X + i * ts / 4, Y + ts * 0.1); ctx.lineTo(X + i * ts / 4, Y + ts * 0.9); ctx.stroke(); }
      ctx.fillStyle = '#8a5530'; ctx.fillRect(X, Y + ts * 0.04, ts + 1, ts * 0.1); ctx.fillRect(X, Y + ts * 0.86, ts + 1, ts * 0.1);
    }
  };
  A.inTown = x => x >= 80;

  // ---------- Props ----------
  // p.ghost: deleted, drawn faint (cyan through the lens). p.label: the delete marker's tag through the lens.
  const PROPS = A.PROPS = {};
  A.prop = function (ctx, p, ts, t, lens) {
    if (p.hidden) return;
    const f = PROPS[p.kind];
    if (!f) return ART.prop(ctx, p, ts, t);
    const ghost = p.ghost && !p.restored;
    if (ghost) {
      ctx.save();
      ctx.globalAlpha = lens ? 0.5 + 0.12 * Math.sin(t * 2.4 + p.x) : 0.1 + 0.05 * Math.sin(t * 1.7 + p.x);
      if (lens) ctx.filter = 'grayscale(1) sepia(1) hue-rotate(150deg) saturate(3) brightness(1.15)';
    }
    frame(ctx, p.x * ts, (p.y + (p.h || 1)) * ts, ts, g => f(g, p, t, lens), false);
    if (ghost) {
      ctx.restore();
      if (lens && p.tag) {
        // The delete marker, hung on top of whatever it hides.
        frame(ctx, (p.x + (p.w || 1) / 2) * ts, p.y * ts - ts * 0.1, ts, g => {
          const w = p.tag.length * 3.6 + 10, bobY = Math.sin(t * 2 + p.x) * 1.5;
          g.rect(-w / 2, -10 + bobY, w, 11, 3).fill(p.tagCol || '#ff5a7a', 1);
          g.text(p.tag, 0, -2.4 + bobY, 6.4, '#fff');
        });
      }
    }
  };

  PROPS.basket = (g, p, t) => {
    // Freya's gift basket, tipped over: four gifts, four notes in one hand.
    g.ell(20, -1, 18, 4).fill('rgba(43,35,64,.2)', false);
    g.path(c => { c.moveTo(4, -2); c.quadraticCurveTo(2, -16, 14, -18); c.lineTo(26, -14); c.quadraticCurveTo(30, -6, 22, 0); c.closePath(); }).fill('#c99a5a');
    for (let i = 0; i < 4; i++) g.line(6 + i * 5, -2, 8 + i * 5, -16).stroke('#9a6a3a', 0.8);
    g.ell(26, -12, 4, 7, -0.6).fill('#a87a40');
    [[34, -4, '#e2bd4f'], [40, -8, '#3bd16f'], [30, -2, '#b3242e'], [44, -2, '#8a96a8']].forEach(([x, y, c], i) => {
      g.rect(x, y - 4, 7, 5, 1).fill(c, 0.8);
      if (!p.read || !p.read[i]) g.rect(x + 1, y - 11, 6, 4.5, 0.6).fill('#fffaf0', 0.6);
    });
  };
  PROPS.speaker = (g, p, t) => {
    // One of Freya's loudspeakers: a pole, a brass horn and her ring that eats its own tail.
    g.line(16, 0, 16, -54).stroke('#4a4a52', 2.4);
    g.poly(16, -56, 30, -64, 30, -46).fill('#d9a740');
    g.ell(30, -55, 2.4, 9).fill('#a87a20');
    g.circle(12, -40, 4.2).stroke('#3bd16f', 1.6); g.circle(15, -42.5, 0.9).fill('#3bd16f', false);
    if (p.bark && t - p.bark < 3) for (let i = 0; i < 3; i++) {
      const k = ((t - p.bark) * 1.4 + i / 3) % 1;
      g.path(c => c.arc(30, -55, 6 + k * 16, -0.7, 0.7)).stroke(`rgba(255,240,180,${0.8 * (1 - k)})`, 1.2);
    }
  };
  PROPS.welcome = (g, p) => {
    // WELCOME TO PINGSBY, on two posts. Restored, it's painted; as a ghost, only its outline.
    const W = (p.w || 2) * 32;
    g.line(10, 0, 10, -30).stroke('#7a5232', 2.4); g.line(W - 10, 0, W - 10, -30).stroke('#7a5232', 2.4);
    g.rect(2, -40, W - 4, 20, 3).fill('#e8d8b0');
    g.text('WELCOME TO', W / 2, -32, 5.4, '#5a3a20'); g.text('PINGSBY', W / 2, -24, 8, '#8d1d29');
  };
  PROPS.notice = (g, p) => {
    g.line(16, 0, 16, -18).stroke('#7a5232', 1.6);
    g.rect(7, -32, 18, 15, 1).fill('#fffaf0', 0.9);
    [-28, -25, -22, -19.5].forEach((y, i) => g.line(10, y, i === 3 ? 18 : 22, y).stroke('#8a8a8a', 0.6));
  };
  PROPS.postoffice = (g, p, t) => {
    // Pingsby's post office: red roof, a POST sign, a pigeon-hole window.
    const W = (p.w || 3) * 32;
    g.ell(W / 2, -1, W / 2 - 4, 5).fill('rgba(43,35,64,.18)', false);
    g.rect(8, -44, W - 16, 44).fill('#efe2c6');
    g.poly(0, -42, W / 2, -72, W, -42).fill('#c0503a');
    g.rect(W / 2 - 9, -26, 18, 26, 1).fill('#6a4a2a');
    g.rect(16, -36, 16, 12, 1).fill('#bfe3ff'); g.rect(W - 32, -36, 16, 12, 1).fill('#bfe3ff');
    g.rect(W / 2 - 20, -56, 40, 11, 2).fill('#24345e');
    g.text('POST', W / 2, -48, 8, '#ffcf33');
    for (let i = 0; i < 3; i++) g.rect(W - 30 + i * 5, -35, 4, 4, 0.5).fill(['#f4ecd4', '#ffe0ea', '#e0f0ff'][i], 0.4);
  };
  PROPS.bakery = (g, p) => {
    // The bakery's sign. Freya painted over it; restored, it says what it always said.
    const W = (p.w || 2) * 32, freya = p.state !== 'pingsby';
    g.line(8, 0, 8, -26).stroke('#7a5232', 2.4); g.line(W - 8, 0, W - 8, -26).stroke('#7a5232', 2.4);
    g.rect(0, -42, W, 20, 4).fill(freya ? '#2c8a4b' : '#c79358');
    if (freya) { g.text('FREE TIER', W / 2, -33, 7, '#ffe28a'); g.text('BAKERY', W / 2, -25.5, 6, '#fff'); g.circle(8, -36, 3).stroke('#ffe28a', 1); }
    else { g.text('PINGSBY', W / 2, -33, 7, '#5a2a10'); g.text('BAKERY · EST. 1987', W / 2, -25.5, 4.6, '#5a2a10'); g.ell(W - 9, -32, 4, 3).fill('#e8a24a', 0.7); }
  };
  PROPS.bandstand = (g, p, t) => {
    // Pingsby's bandstand: deleted by version, so nothing is left but the outline of where it stood.
    const W = (p.w || 3) * 32;
    g.ctx.setLineDash([3, 3]);
    g.ell(W / 2, -6, W / 2 - 6, 8).stroke('rgba(200,210,230,.6)', 1.2);
    [10, W / 2, W - 10].forEach(x => g.line(x, -6, x, -40).stroke('rgba(200,210,230,.45)', 1));
    g.poly(2, -40, W / 2, -62, W - 2, -40).stroke('rgba(200,210,230,.5)', 1.2);
    g.ctx.setLineDash([]);
    // Something left lying in it: a music stand.
    g.line(W / 2 + 14, -2, W / 2 + 14, -14).stroke('#6b6f7a', 1.2); g.poly(W / 2 + 9, -14, W / 2 + 19, -14, W / 2 + 17, -20, W / 2 + 11, -20).fill('#6b6f7a', 0.6);
  };
  PROPS.heap = (g, p) => {
    // A heap of deleted bits: half a door, a shop sign, a wheel, a chair leg.
    const h = hash(p.x, p.y), k = 0.8 + (h % 5) / 10;
    g.ell(16, -1, 15 * k, 4).fill('rgba(43,35,64,.2)', false);
    g.path(c => { c.moveTo(2, 0); c.quadraticCurveTo(4, -16 * k, 14, -20 * k); c.quadraticCurveTo(26, -18 * k, 30, 0); c.closePath(); }).fill(['#8a847c', '#7f796f', '#938d84'][h % 3]);
    if (h % 3 === 0) { g.circle(10, -10 * k, 6).stroke('#6a4a2a', 1.6); g.line(4, -10 * k, 16, -10 * k).stroke('#6a4a2a', 0.8); }
    if (h % 3 === 1) g.rect(14, -22 * k, 12, 8, 1).fill(['#c0503a', '#5a7ea6', '#e8c46a'][h % 3], 0.8);
    if (h % 3 === 2) { g.rect(8, -24 * k, 7, 14, 1).fill('#9a6a3a', 0.8); g.circle(13, -17 * k, 0.8).fill('#ffcf33', false); }
    // The edge of it is coming apart, pixel by pixel.
    for (let i = 0; i < 4; i++) { const hs = hash(p.x * 3 + i, p.y * 7); g.rect(4 + hs % 24, -6 - hs % (18 * k), 2.4, 2.4).fill('rgba(140,200,255,.35)', false); }
  };
  PROPS.halfhouse = (g, p) => {
    // A cottage with its right half deleted, the cut edge flaking into nothing.
    const W = (p.w || 3) * 32, col = p.color || '#7a9ad0', cut = W * 0.55;
    g.ctx.save(); g.rect(-4, -80, cut + 4, 84); g.ctx.clip();
    g.rect(6, -40, W - 12, 40).fill('#e2d8c4');
    g.poly(-2, -38, W / 2, -70, W + 2, -38).fill(col);
    g.rect(14, -30, 14, 12, 1).fill('#9ab8cc'); g.rect(W / 2 - 8, -24, 16, 24, 1).fill('#7a5a3a');
    g.ctx.restore();
    for (let i = 0; i < 9; i++) { const hs = hash(p.x * 11 + i, p.y * 3 + i); g.rect(cut + (hs % 12), -4 - (hs % 60), 3, 3).fill(i % 2 ? '#e2d8c4' : col, false); }
  };
  PROPS.shrinebit = (g, p, t) => {
    // What Freya kept of Brookfall's shrine: a step, half a wall, the bell rope with its prayers.
    const W = (p.w || 3) * 32;
    g.rect(6, -8, W - 12, 8).fill('#a8a296');
    g.rect(14, -40, W / 2 - 14, 32).fill('#c8c2b4');
    g.poly(8, -38, W / 2 + 6, -58, W / 2 + 6, -38).fill('#5a7ea6');
    g.line(W - 26, -46, W - 26, -12).stroke('#c9a06a', 1.2);
    for (let i = 0; i < 6; i++) g.rect(W - 29 + (i % 2) * 4, -44 + i * 5, 3, 2.4, 0.5).fill(['#fff4d6', '#ffe0ea', '#e0f0ff'][i % 3], 0.5);
  };
  PROPS.bunker = (g, p, t) => {
    // Sir Seymour Backups' bunker: a steel dome with a sign, a slot, and no handle on the outside.
    const W = (p.w || 3) * 32;
    g.ell(W / 2, -1, W / 2 - 2, 6).fill('rgba(43,35,64,.22)', false);
    g.path(c => { c.moveTo(4, 0); c.quadraticCurveTo(4, -58, W / 2, -60); c.quadraticCurveTo(W - 4, -58, W - 4, 0); c.closePath(); }).fill('#8a909c');
    g.path(c => { c.moveTo(12, -6); c.quadraticCurveTo(14, -44, W / 2 - 4, -52); }).stroke('#b8bec8', 2);
    for (let i = 0; i < 5; i++) g.circle(14 + i * (W - 28) / 4, -6, 1.4).fill('#5a606c', false);
    g.rect(W / 2 - 13, -32, 26, 32, 2).fill('#5a606c');
    g.rect(W / 2 - 7, -22, 14, 3, 1).fill(p.open ? '#ffd76a' : '#1a1a22', 0.8);
    g.rect(W - 34, -46, 28, 10, 1).fill('#f4ecd4', 0.9); g.text('NO VISITORS', W - 20, -39, 4.4, '#8d1d29');
    g.line(W / 2 + 22, -60, W / 2 + 22, -74).stroke('#4a4a52', 1.2); g.circle(W / 2 + 22, -75, 1.8).fill(p.open ? '#7fe0a0' : '#ff5a5a', false);
  };
  PROPS.firesite = (g, p, t) => {
    // Where the first fire of the Free Cloud will be: a ring of stones, then a fire.
    if (p.lit) return ART.prop(g.ctx, { kind: 'campfire', x: 0, y: -1, w: 1, h: 1 }, 32, t);
    g.ell(16, -6, 13, 5).fill('#6d6a70');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.ell(16 + Math.cos(a) * 12, -6 + Math.sin(a) * 4.5, 3, 2.2).fill('#9a969c', 0.8); }
    g.line(9, -5, 23, -8).stroke('#4a3020', 3);
  };
  PROPS.cartc2 = (g, p, t) => ART.prop(g.ctx, { kind: 'cart', x: 0, y: -1, w: 2, h: 1, state: 'open' }, 32, t);
  PROPS.towergate = (g, p, t) => {
    // The tower's foot: a great arch in the wall, shut with Freya's ring until morning.
    const W = (p.w || 1) * 32;
    g.rect(-28, -96, W + 56, 96).fill('#3a3a50');
    for (let y = -90; y < 0; y += 14) g.line(-28, y, W + 28, y).stroke('#2a2a3e', 1.2);
    g.path(c => { c.moveTo(-8, 0); c.lineTo(-8, -50); c.quadraticCurveTo(W / 2, -78, W + 8, -50); c.lineTo(W + 8, 0); c.closePath(); }).fill(p.open ? '#e8d8a8' : '#1a1a28');
    if (!p.open) { g.circle(W / 2, -40, 9).stroke('#3bd16f', 2.4); g.circle(W / 2 + 6, -46, 1.6).fill('#3bd16f', false); }
    else g.text('THORNWICK', W / 2, -56, 5.4, '#5a3a20');
    [[-20, -80], [W + 12, -70], [-14, -30]].forEach(([x, y], i) => g.rect(x, y, 6, 8).fill(['#ffd25a', '#9be07a', '#8ab8ff'][i], 0.6));
  };
  PROPS.postbox = (g, p, t) => {
    // Thornwick's post box: a red pillar box with a slot, and Freya's poster pasted on it.
    g.ell(16, -1, 9, 3).fill('rgba(43,35,64,.22)', false);
    g.rect(8, -40, 16, 40, 3).fill('#c0302a');
    g.ell(16, -40, 9, 4).fill('#a0201a');
    g.rect(10, -32, 12, 2.4, 1).fill('#1a1a1a', false);
    g.rect(10.5, -26, 11, 13, 1).fill('#f6efd8', 0.8);
    g.circle(16, -21, 3).fill('#f6dcc6', 0.5); g.ell(16, -24.6, 3, 1).stroke('#ffd24a', 0.6);
    g.text('FREE!', 16, -14.6, 3.4, '#2c8a4b');
  };
  PROPS.belltower = (g, p, t) => {
    // Thornwick's bell tower: stone, an open belfry and a bell that has made no sound in years.
    const W = (p.w || 2) * 32, swing = p.ring && t - p.ring < 4 ? Math.sin((t - p.ring) * 8) * 0.35 * (1 - (t - p.ring) / 4) : 0;
    g.rect(8, -110, W - 16, 110).fill('#b8b2a6');
    for (let y = -100; y < 0; y += 12) g.line(8, y, W - 8, y).stroke('rgba(43,35,64,.2)', 1);
    g.rect(14, -100, W - 28, 30).fill('#3a3346');
    g.poly(2, -110, W / 2, -136, W - 2, -110).fill('#6a4a5a');
    g.ctx.save(); g.ctx.translate(W / 2, -98); g.ctx.rotate(swing);
    g.path(c => { c.moveTo(-9, 18); c.quadraticCurveTo(-8, 0, 0, 0); c.quadraticCurveTo(8, 0, 9, 18); c.closePath(); }).fill('#d9a740');
    g.circle(0, 19, 2).fill('#8a6a20', false);
    g.ctx.restore();
    g.line(W / 2, -78, W / 2, -20).stroke('#c9a06a', 1.2);
    g.rect(W / 2 - 8, -24, 16, 24, 1).fill('#6a4a2a');
    if (swing) for (let i = 0; i < 3; i++) { const k = ((t - p.ring) * 0.8 + i / 3) % 1; g.circle(W / 2, -88, 14 + k * 40).stroke(`rgba(255,226,140,${0.7 * (1 - k)})`, 1.4); }
  };
  PROPS.poster = (g, p) => {
    // THE GRAND INQUISITOR PROTECTS YOU FROM BEASTS, on a board.
    g.line(8, 0, 8, -30).stroke('#7a5232', 2); g.line(24, 0, 24, -30).stroke('#7a5232', 2);
    g.rect(2, -48, 28, 26, 1).fill('#ece4cc');
    g.circle(16, -40, 5).fill('#d8d2c4', 0.8); g.ell(16, -45, 5, 2).fill('#6a6a72', 0.6);
    g.text('PROTECTS YOU', 16, -29.5, 3.4, '#8d1d29'); g.text('FROM BEASTS', 16, -25.4, 3.4, '#8d1d29');
  };
  PROPS.stair = (g, p, t) => {
    // The stair up to the Sorting Floors: stone steps into the dark, and the hum of something processing.
    const W = (p.w || 2) * 32;
    g.rect(0, -60, W, 60).fill('#3a3a50');
    g.path(c => { c.moveTo(8, 0); c.lineTo(8, -40); c.quadraticCurveTo(W / 2, -58, W - 8, -40); c.lineTo(W - 8, 0); c.closePath(); }).fill('#12101c');
    for (let i = 0; i < 5; i++) g.rect(12 + i * 2, -8 - i * 7, W - 24 - i * 4, 4).fill(`rgba(120,120,150,${0.6 - i * 0.1})`, false);
    if (p.open) g.circle(W / 2, -30, 8 + Math.sin(t * 3) * 1).fill('rgba(255,210,120,.25)', false);
    g.text('SORTING FLOORS', W / 2, -50, 4.4, '#d8d2c4');
  };
  PROPS.deadtree = (g, p, t) => {
    g.ell(16, -1, 10, 3).fill('rgba(43,35,64,.2)', false);
    g.line(16, 0, 16, -30).stroke('#5a4a40', 3.4);
    g.line(16, -18, 6, -30).stroke('#5a4a40', 2); g.line(16, -24, 26, -36).stroke('#5a4a40', 2); g.line(16, -30, 12, -42).stroke('#5a4a40', 1.6);
  };
  PROPS.letter = (g, p, t) => {
    // A lost letter, glowing faintly, waiting to be delivered.
    const y = -6 + Math.sin(t * 2.4 + p.x) * 1.5;
    g.ctx.save(); g.ctx.globalCompositeOperation = 'lighter'; g.circle(16, y - 3, 9).fill('rgba(255,230,150,.22)', false); g.ctx.restore();
    g.rect(9, y - 8, 14, 10, 1).fill('#fffaf0', 0.9);
    g.line(9, y - 8, 16, y - 2, 23, y - 8).stroke(INK, 0.8);
    g.circle(16, y - 2.5, 1.4).fill('#c0302a', false);
  };

  // ---------- Light ----------
  // The whole map is graded by the time of day: night at the edge, dawn on the road, grey day over the scrap,
  // firelight at the camp, and Thornwick's endless morning. Through the Version Lens everything goes blue.
  const MIST = Array.from({ length: 8 }, (_, i) => { const h = hash(i * 11 + 1, i * 5 + 9); return [(h % 100) / 100, 2 + (h >> 6) % 16, 5 + (h >> 9) % 4, 0.4 + ((h >> 4) % 8) / 10]; });
  const PHASE = {
    night: { mul: 'rgba(40,46,90,.86)', sat: 0.6, vig: 0.75 },
    dawn: { mul: 'rgba(150,110,140,.55)', sat: 0.45, vig: 0.55, warm: 'rgba(255,150,120,.10)' },
    day: { mul: 'rgba(160,160,176,.35)', sat: 0.35, vig: 0.45 },
    dusk: { mul: 'rgba(120,70,90,.62)', sat: 0.45, vig: 0.65, warm: 'rgba(255,130,60,.10)' },
    morning: { mul: 'rgba(170,150,130,.35)', sat: 0.5, vig: 0.45, warm: 'rgba(255,220,160,.08)' }
  };
  A.grade = function (ctx, t, vw, vh, cx, cy, ts, phase, lights, lens) {
    const ph = PHASE[phase] || PHASE.day;
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${ph.sat})`; ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ph.mul; ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = 'lighter';
    if (ph.warm) { ctx.fillStyle = ph.warm; ctx.fillRect(0, 0, vw, vh); }
    (lights || []).forEach(([x, y, r, rgb, flick]) => {
      const X = x * ts - cx, Y = y * ts - cy, R = r * ts * (1 + (flick ? Math.sin(t * 9 + x) * 0.05 + Math.sin(t * 23 + y) * 0.03 : 0));
      if (X < -R || X > vw + R || Y < -R || Y > vh + R) return;
      const gr = ctx.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(${rgb},.5)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gr; ctx.fillRect(X - R, Y - R, R * 2, R * 2);
    });
    ctx.globalCompositeOperation = 'source-over';
    const span = vw + 10 * ts;
    MIST.forEach(([f, y, w, v]) => {
      const X = ((f * span + t * v * ts - cx * 1.3) % span + span) % span - 5 * ts, Y = y * ts - cy;
      const gr = ctx.createRadialGradient(X, Y, 0, X, Y, w * ts); gr.addColorStop(0, 'rgba(186,190,206,.16)'); gr.addColorStop(1, 'rgba(196,200,214,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(X, Y, w * ts, w * ts * 0.22, 0, 0, 7); ctx.fill();
    });
    if (lens) {
      // The Version Lens: a blue wash and slow scanlines.
      ctx.fillStyle = 'rgba(40,120,200,.12)'; ctx.fillRect(0, 0, vw, vh);
      ctx.fillStyle = 'rgba(140,220,255,.05)';
      for (let y = (t * 30) % 6; y < vh; y += 6) ctx.fillRect(0, y, vw, 1);
    }
    const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    vg.addColorStop(0, 'rgba(10,8,18,0)'); vg.addColorStop(1, `rgba(8,6,14,${ph.vig})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, vw, vh);
  };
  // What a 'T' tile is depends on where it is: dead trees on the edge and the road, heaps in the scrap field,
  // Thornwick's walls in town.
  A.wall = function (ctx, x, y, ts, t, zone) {
    if (zone === 'town') {
      const X = x * ts, Y = y * ts;
      ctx.fillStyle = '#8a8478'; ctx.fillRect(X, Y - ts * 0.4, ts + 1, ts * 1.4);
      ctx.strokeStyle = 'rgba(43,35,64,.3)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) ctx.strokeRect(X + ((y + i) % 2) * ts / 4 + 0.5, Y - ts * 0.4 + i * ts * 0.46, ts / 2, ts * 0.46);
      return;
    }
    if (zone === 'scrap') return A.prop(ctx, { kind: 'heap', x, y, w: 1, h: 1 }, ts, t);
    if (hash(x, y) % 3 === 0) return ART.prop(ctx, { kind: 'rock', x, y, w: 1, h: 1 }, ts, t);
    A.prop(ctx, { kind: 'deadtree', x, y, w: 1, h: 1 }, ts, t);
  };
})();
