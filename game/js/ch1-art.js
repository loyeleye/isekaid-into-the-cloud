// Chapter 1's vector art, drawn in code until the concept art is chosen (no PixelLab generations spent on it):
// chibi people for the overworld, the props and ground of Freya's camp, the road, Brookfall and the Temple of
// Uptime, and the incidents that have no generated art. js/ch1-world.js places all of it.
// People and props are drawn in units of 1/32 of a tile, so they scale with the map's tile size.
(function () {
  const A = SD.c1art = {};
  const INK = '#2b2340';
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

  // ---------- Drawing helpers (unit coordinates) ----------
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
      path(fn) { ctx.beginPath(); fn(ctx); return p; }
    };
    return p;
  }
  // Run fn in a frame whose origin is (x, y) in pixels and whose unit is ts / 32 pixels.
  function frame(ctx, x, y, ts, fn, flip, k) {
    ctx.save(); ctx.translate(x, y); const u = ts / 32 * (k || 1); ctx.scale(flip ? -u : u, u);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    fn(P(ctx));
    ctx.restore();
  }

  // ---------- People ----------
  // Looks follow the chosen concept art (Mira D, Kai A, Seo-yeon C, Dutch D) and the story bible. Faces follow how
  // each of them feels in the story: mouth is smile, flat or frown, brow is flat, knit or sad. Only Freya smiles.
  const LOOK = {
    mira: { skin: '#efe6e2', hair: '#3a4157', hairD: '#262b3b', style: 'nun', hood: '#2a2329', band: '#e8ebf0', coat: '#2e2730', coatD: '#1b161d', under: '#e8ebf0', eye: '#8a96a8', robe: true, wolf: true, wolfCol: '#e3e5ec', wolfFace: false, wolfEye: false, mouth: 'flat', brow: 'sad' },
    kai: { skin: '#6e4630', hair: '#5b3122', hairD: '#3a1d14', style: 'locs', coat: '#2a2a30', coatD: '#16161a', under: '#3a3a42', legs: '#24242a', boots: '#151518', eye: '#2a1a12', chef: true, glove: true, towel: true, armband: '#f0d27a', mouth: 'frown', brow: 'knit' },
    seoyeon: { skin: '#f3dcc9', hair: '#16131d', hairD: '#06050a', style: 'bob', coat: '#211d28', coatD: '#121017', under: '#8d1d29', legs: '#211d28', boots: '#0f0d14', eye: '#7a1f26', sash: '#f2efe8', sword: true, ribbon: '#b3242e', mouth: 'flat', brow: 'flat' },
    dutch: { skin: '#e2b496', hair: '#8e9399', style: 'short', coat: '#24345e', coatD: '#172342', under: '#7d8279', legs: '#7d8279', boots: '#4a3020', eye: '#2a1a12', mop: true, keys: true, k: 1.12, mouth: 'frown', brow: 'knit' },
    freya: { skin: '#f6dcc6', hair: '#e7b648', hairD: '#b7862a', style: 'goldbraid', coat: '#2c8a4b', coatD: '#1d6334', under: '#e2bd4f', eye: '#3bd16f', robe: true, halo: true, tray: true, mouth: 'smile', blush: true },
    // Freya before the briefing: the Free Tier's brand promoter, with a lanyard, a clipboard and a basket of samples.
    freyap: { skin: '#f6dcc6', hair: '#e7b648', hairD: '#b7862a', style: 'bob', coat: '#2c8a4b', coatD: '#1d6334', under: '#e2bd4f', legs: '#1d6334', boots: '#3a2c1f', eye: '#3bd16f', halo: true, lanyard: true, clipboard: true, mouth: 'smile', blush: true },
    freyav: { skin: '#f6dcc6', hair: '#e7b648', hairD: '#b7862a', style: 'goldbraid', coat: '#1f6a37', coatD: '#0f3d1e', under: '#3bd16f', eye: '#3bd16f', robe: true, halo: true, virus: true, mouth: 'smile', blush: true },
    kyu: { skin: '#f0dad0', hair: '#15111b', hairD: '#05040a', style: 'long', coat: '#1b1724', coatD: '#0d0b12', under: '#a3203a', eye: '#8a6cff', robe: true, mouth: 'flat', brow: 'sad' },
    uptima: { skin: '#ffe3d0', hair: '#ffc69a', hairD: '#e79a6a', style: 'uptima', coat: '#2b2340', coatD: '#1a1530', under: '#ffffff', eye: '#3b8bff', robe: true, apron: true, crown: true, mouth: 'frown', brow: 'sad' },
    wren: { skin: '#e9c6a6', hair: '#dcd7e6', hairD: '#a9a3b8', style: 'bun', coat: '#5a7ea6', coatD: '#3f5c7e', under: '#e9e1c9', eye: '#4a3b6a', robe: true, staff: true, mouth: 'flat', brow: 'sad' },
    faithful: { skin: '#e5c09d', hair: '#7a5a3a', style: 'hood', hood: '#9fb2cf', coat: '#9fb2cf', coatD: '#7a8db0', under: '#f1e7c6', eye: '#3b2a20', robe: true },
    faithful2: { skin: '#a8724f', hair: '#2a1d16', style: 'hood', hood: '#c2a8d6', coat: '#c2a8d6', coatD: '#9a80b0', under: '#f1e7c6', eye: '#2a1a12', robe: true },
    keeper: { skin: '#e6b893', hair: '#6b3d22', hairD: '#4a2914', style: 'short', coat: '#8a4b2a', coatD: '#6a3720', under: '#f2e6cf', legs: '#4a3b2a', boots: '#2e2218', eye: '#3b2a20', apron: true, mouth: 'flat', brow: 'flat' }
  };
  A.LOOK = LOOK;

  // face: 'south' | 'north' | 'east' | 'west'. moving: whether they're walking. Feet at (fx, fy) in pixels.
  A.person = function (ctx, id, fx, fy, ts, t, face, moving, o) {
    let L = LOOK[id]; if (!L) return;
    // Your lead in the look they're wearing (js/wear.js mapLook): its colours and its one telling detail.
    const lk = SD.wear && SD.wear.mapLook ? SD.wear.mapLook(id) : null;
    if (lk) L = Object.assign({}, L, lk);
    o = o || {};
    // Standing still, your lead can be doing one of the Emote button's actions (js/emote.js): a pose a moment.
    let act = SD.emote && SD.emote.acting ? SD.emote.acting(id) : null;
    if (act && moving) { SD.emote.stop(); act = null; }                // walking off ends it
    const ps = act ? pose(act, face) : null;
    if (ps) { face = ps.face; o = Object.assign({}, o, { arms: ps.arms, shut: ps.shut, lean: ps.lean }); }
    const flip = face === 'west', side = face === 'east' || face === 'west', back = face === 'north';
    const ph = ps ? ps.ph : moving ? Math.sin(t * 13) : 0, bob = ps ? ps.bob : moving ? -Math.abs(Math.sin(t * 13)) * 1.2 : Math.sin(t * 2.2) * 0.35;
    const dx = ps ? ps.dx * ts / 32 : 0;
    // Shadow, unflipped.
    frame(ctx, fx + dx, fy, ts, g => g.ell(0, 0, 9, 2.6).fill('rgba(43,35,64,.22)', false), false, L.k);
    if (o.alpha != null) { ctx.save(); ctx.globalAlpha = o.alpha; }
    frame(ctx, fx + dx, fy + bob * ts / 32, ts, g => { if (ps && ps.rot) g.ctx.rotate(ps.rot); body(g, L, ph, side, back, t, o); }, flip, L.k);
    if (o.alpha != null) ctx.restore();
  };

  // The actions' poses, t seconds in: which way they face, the legs' swing (ph), a hop (bob) and a step (dx) in units,
  // a tilt (rot, radians), a bow at the hips (lean), and where the hands go ([left, right], null for their own swing).
  function pose(act, face) {
    const t = act.t, P = { face: face === 'north' ? 'south' : face, ph: 0, bob: 0, dx: 0, rot: 0, arms: null, shut: false, lean: 0 };
    const S = Math.sin, PI = Math.PI;
    switch (act.id) {
      case 'dance': { const b = Math.floor(t / 0.5) % 2, f = (t % 0.5) / 0.5; P.face = b ? 'east' : 'west'; P.bob = -S(PI * f) * 3; P.ph = S(t * PI * 2); P.arms = [[-13, b ? -40 : -12], [13, b ? -12 : -40]]; break; }
      case 'wave': P.face = 'south'; P.arms = [null, [14 + S(t * 12) * 3, -40]]; break;
      case 'bow': { const k = t < 0.4 ? t / 0.4 : t < 1.4 ? 1 : Math.max(0, 1 - (t - 1.4) / 0.4); if (P.face === 'south') P.face = 'east'; P.lean = 0.45 * k; break; }
      case 'flex': P.face = 'south'; P.arms = [[-14, -31], [14, -31]]; P.bob = -Math.abs(S(t * 6)) * 1.2; break;
      case 'spin': P.face = ['south', 'east', 'north', 'west'][Math.floor(t / 0.13) % 4]; P.bob = -Math.abs(S(t * PI / 1.6)) * 3; break;
      case 'cheer': P.face = 'south'; P.arms = [[-12, -45], [12, -45]]; P.bob = -Math.abs(S(t * PI * 2.5)) * 6; break;
      case 'nap': P.face = 'south'; P.shut = true; P.rot = -0.14 + S(t * 2) * 0.03; break;
      case 'facepalm': P.face = 'south'; P.arms = [null, [3, -29]]; P.rot = 0.05; P.bob = 0.6; break;
      case 'groove': { const w = S(t * PI * 2); P.face = 'south'; P.bob = -Math.abs(S(t * PI * 4)) * 2.5; P.dx = w * 2.5; P.ph = S(t * 8); P.arms = [[-13, w > 0 ? -43 : -12], [13, w > 0 ? -12 : -43]]; P.rot = w * 0.12; break; }
      case 'moonwalk': P.face = 'east'; P.dx = -14 * S(PI * Math.min(1, t / 3)); P.ph = S(t * 13); P.bob = -Math.abs(S(t * 13)) * 0.6; P.rot = -0.08; break;
    }
    return P;
  }

  function body(g, L, ph, side, back, t, o) {
    const c = g.ctx;
    // Behind everything: long hair and braids that hang down the back, the mop when seen from the front.
    if (back) backHair(g, L);
    else if (L.style === 'long' || L.style === 'uptima') longHairBehind(g, L);
    if (L.mop && !back) mop(g, side);
    if ((L.halo || L.ring) && back) halo(g, t);
    if (L.wings) wings(g, L, back, t);
    // Legs or robe.
    if (L.robe) {
      g.path(x => { x.moveTo(-6.5, -20); x.lineTo(6.5, -20); x.quadraticCurveTo(9, -8, 9.5, -1); x.lineTo(-9.5, -1); x.quadraticCurveTo(-9, -8, -6.5, -20); x.closePath(); }).fill(L.coat);
      if (L.apron && !back) g.path(x => { x.moveTo(-4, -18); x.lineTo(4, -18); x.lineTo(6, -2); x.lineTo(-6, -2); x.closePath(); }).fill(L.under);
      if (L.virus) for (let i = 0; i < 4; i++) { c.fillStyle = 'rgba(59,209,111,.7)'; c.fillRect(-7 + i * 4, -14 + ((t * 20 + i * 5) % 12), 1.2, 3); }
      g.ell(-3.5, -0.6, 2.6, 1.4).fill(L.boots || L.coatD);
      g.ell(3.5, -0.6, 2.6, 1.4).fill(L.boots || L.coatD);
    } else {
      const lift = v => Math.max(0, v) * 2.2;
      [[-1, ph], [1, -ph]].forEach(([s, p]) => {
        const y0 = -11 - lift(p) * 0.4, y1 = -lift(p);
        g.rect(s * 3.2 - 2.2, y0, 4.4, y1 - y0, 1.2).fill(L.legs);
        g.rect(s * 3.2 - 2.6, y1 - 2.6, 5.2, 2.8, 1.2).fill(L.boots);
      });
    }
    // Arms swing opposite the legs.
    // An action's raised hand (above the shoulder) is drawn over the head, so it shows.
    const to = i => o.arms && o.arms[i], up = i => !!(to(i) && to(i)[1] < -22);
    const armL = () => { if (!up(0)) arm(g, L, -1, ph, false, to(0)); };
    const armR = () => { if (!up(1)) arm(g, L, 1, -ph, true, to(1)); };
    // A bow bends at the hips: everything above the legs leans (rot, radians; forward when side on).
    if (o.lean) { c.save(); c.translate(0, -10); c.rotate(o.lean); c.translate(0, 10); }
    if (!side) armL();
    // Torso.
    const w0 = L.k ? 8 : 7.2;
    g.path(x => { x.moveTo(-w0, -9); x.lineTo(w0, -9); x.lineTo(w0 - 1, -20); x.quadraticCurveTo(0, -24, -(w0 - 1), -20); x.closePath(); }).fill(L.coat);
    if (!back) {
      if (L.chef) { g.poly(-1.5, -21.5, 2.5, -21.5, 0.5, -13).fill(L.under, 0.8); g.line(0, -21, 0, -10).stroke(L.coatD, 0.8); [-16.5, -13].forEach(y => g.circle(2.6, y, 0.6).fill(L.coatD, false)); }
      else if (L.mop) { g.rect(-3, -21, 6, 12).fill(L.under, 0.8); g.line(0, -21, 0, -9).stroke('#6d7177', 0.7); }
      else if (L.wolf) { g.poly(-2.5, -21, 2.5, -21, 1.5, -10, -1.5, -10).fill(L.under, 0.8); }
      else if (!L.robe) g.poly(-2, -21, 2, -21, 1.2, -10, -1.2, -10).fill(L.under, 0.8);
      if (L.robe && !L.apron) { g.poly(-2.5, -21.5, 2.5, -21.5, 0, -14).fill(L.under, 0.8); g.rect(-6.5, -14, 13, 2.2).fill(L.under, 0.8); }
      if (L.apron) g.poly(-3, -21.5, 3, -21.5, 0, -18).fill(L.under, 0.8);
    }
    // Belt and gear.
    if (!L.robe) g.rect(-w0 + 0.3, -11.5, (w0 - 0.3) * 2, 2, 0.6).fill(L.mop ? '#3a2a20' : L.sash ? L.under : '#3a2a20', 0.8);
    if (L.sash && !back) g.path(x => { x.moveTo(-6, -20.5); x.lineTo(-3, -21.5); x.lineTo(6, -11.5); x.lineTo(3, -10.5); x.closePath(); }).fill(L.sash, 0.8);
    if (L.keys) { g.circle(side ? 5 : -5, -9.5, 2.2).stroke('#d9a740', 1); g.line(side ? 5 : -5, -8, side ? 5.6 : -5.6, -5.5).stroke('#d9a740', 0.9); }
    if (L.wolf && !back) { g.rect(-7, -13, 4, 4, 1).fill('#8a5a32', 0.8); }
    if (L.tabard && !back) { g.rect(-3.6, -20.5, 7.2, 13, 0.8).fill(L.tabard, 0.8); g.circle(0, -16, 1.4).fill(L.crest || '#e2b23a', 0.6); }
    if (L.bib && !back) { g.rect(-4.6, -16, 9.2, 10, 1).fill(L.bib, 0.8); g.line(-4, -16, -5, -20.5).stroke(L.bib, 0.9); g.line(4, -16, 5, -20.5).stroke(L.bib, 0.9); }
    if (L.stripes && !back) [[-6, -18, 6], [-2, -14.5, 7], [-5, -11, 4]].forEach(([x, y, w]) => { g.ctx.fillStyle = L.stripes; g.ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 9 + y); g.ctx.fillRect(x, y, w, 1.1); g.ctx.globalAlpha = 1; });
    if (L.stitch && !back) { g.line(-5, -17, -2, -16).stroke('#e8dcc4', 0.6); g.line(-4.4, -17.8, -4.6, -16.2).stroke('#e8dcc4', 0.5); g.line(-3, -17.4, -3.2, -15.8).stroke('#e8dcc4', 0.5); }
    if (L.lanyard && !back) { g.line(-2.5, -21, 0, -15, 2.5, -21).stroke('#e2bd4f', 0.8); g.rect(-1.4, -15.2, 2.8, 3.2, 0.5).fill('#f4f1ea', 0.6); g.rect(-6.6, -11.5, 13.2, 1.8, 0.6).fill(L.under, 0.7); }
    if (L.sword) { const sx = back ? 5 : -6.5; g.line(sx, -14, sx - 2.5, -1).stroke('#6b6f7a', 1.6); g.line(sx - 1.5, -14.5, sx + 1.5, -13.5).stroke('#2a2a2a', 1.4); g.line(sx - 0.2, -14, sx + 1.2, -8).stroke('#3cb87a', 1.2); }
    if (L.towel && !back) g.path(x => { x.moveTo(side ? -2 : -7.5, -21); x.lineTo(side ? 2 : -3.5, -21.5); x.lineTo(side ? 1.5 : -4, -14); x.lineTo(side ? -2.5 : -7.5, -14.5); x.closePath(); }).fill('#e9e2cf', 0.8);
    if (side) armL();
    // Head.
    head(g, L, side, back, t, o);
    if (L.tray && !back) tray(g, side);
    if (L.clipboard && !back) { const x = side ? 6 : -10.5; g.rect(x, -19, 5, 6.5, 0.6).fill('#9a6a3a', 0.8); g.rect(x + 0.8, -18, 3.4, 4.8).fill('#f4f1ea', false); [-17, -15.6].forEach(y => g.line(x + 1.2, y, x + 3.8, y).stroke('#8a8a8a', 0.4)); }
    armR();
    [0, 1].forEach(i => { if (up(i)) arm(g, L, i ? 1 : -1, 0, !!i, to(i)); });
    if (o.lean) c.restore();
    if (L.lantern && !back) lantern(g, side, t);
    if (L.hat && !back) hat(g, L, side);
    if ((L.halo || L.ring) && !back) halo(g, t);
    if (L.staff) { g.line(side ? 9 : 10, -34, side ? 9 : 10, 0).stroke('#7a5232', 1.8); g.circle(side ? 9 : 10, -35, 2.4).fill('#ffd76a', 1); }
    if (L.mop && back) mop(g, false);
  }

  function arm(g, L, s, p, front, to) {
    const sx = s * (L.k ? 8.2 : 7.4);
    let hx = sx + s * 1.4 + (L.tray && s < 0 ? 2 : 0), hy = -11.5 + p * 1.4;
    if (to) [hx, hy] = to;
    if (L.wolf && s > 0) {
      // Mira's left side stays beast: a long grey foreleg in Bram's silver chain, black claws.
      g.path(x => { x.moveTo(sx - 1.6, -20); x.quadraticCurveTo(sx + 3.5, -16, hx + 1.5, hy + 1); x.lineTo(hx - 2.5, hy + 1.5); x.quadraticCurveTo(sx - 2.5, -14, sx - 1.6, -20); x.closePath(); }).fill(L.wolfCol || '#8f939c');
      g.line(sx - 0.6, -15.5, sx + 2.6, -16.2).stroke('#d8dde3', 1); g.line(sx, -13.5, sx + 2.9, -14).stroke('#d8dde3', 1);
      [-1.5, 0, 1.5].forEach(d => g.line(hx + d, hy + 1.5, hx + d * 1.3, hy + 3.4).stroke('#111', 0.9));
      return;
    }
    // A posed arm bends out at the elbow; a hanging one swings.
    const [cx, cy] = to ? [sx + s * 5, Math.min(-16, (hy - 20) / 2 + 2)] : [sx + s * 2.2, -16];
    g.path(x => { x.moveTo(sx, -20); x.quadraticCurveTo(cx, cy, hx, hy); }).stroke(L.coatD, 3.6);
    g.path(x => { x.moveTo(sx, -20); x.quadraticCurveTo(cx, cy, hx, hy); }).stroke(L.coat, 2.2);
    if (L.armband && s < 0) g.line(sx + s * 0.4, -17.2, sx + s * 2.6, -16.6).stroke(L.armband, 1.3);   // Hana's ribbon
    if (L.glove && s > 0) { g.circle(hx, hy + 0.6, 2).fill('#1a1416', 0.9); g.line(hx - 1, hy - 0.4, hx + 0.6, hy + 1.6).stroke('#ffcf4a', 0.6); }
    else g.circle(hx, hy + 0.6, 1.7).fill(L.skin, 0.9);
  }

  function head(g, L, side, back, t, o) {
    const c = g.ctx, hy = -31, sx = side ? 2.6 : 0;
    // Back hair layer for the styles that frame the face.
    if (!back && (L.style === 'bob' || L.style === 'goldbraid' || L.style === 'braid' || L.style === 'short')) {
      g.path(x => { x.moveTo(-11, hy + 1); x.arc(0, hy, 11, Math.PI, 0); x.lineTo(11, hy + (L.style === 'bob' ? 7 : 3)); x.lineTo(-11, hy + (L.style === 'bob' ? 7 : 3)); x.closePath(); }).fill(L.hairD || L.hair);
    }
    if (L.style === 'nun' && !back) g.path(x => { x.moveTo(-12.5, hy + 15); x.quadraticCurveTo(-13.5, hy - 13, 0, hy - 13); x.quadraticCurveTo(13.5, hy - 13, 12.5, hy + 15); x.closePath(); }).fill(L.hood);
    if (L.style === 'hood') g.path(x => { x.moveTo(-12, hy + 9); x.quadraticCurveTo(-13, hy - 13, 0, hy - 13); x.quadraticCurveTo(13, hy - 13, 12, hy + 9); x.closePath(); }).fill(L.hood);
    g.circle(0, hy, 10).fill(back && L.style !== 'shaved' ? (L.hair || L.skin) : L.skin);
    if (L.wolf && L.wolfFace !== false && !back) {
      // Fur up her left side to the jaw, a wolf's ear, and one amber slit eye.
      c.save(); g.circle(0, hy, 10); c.clip();
      const wx = side ? 1.5 : 0;
      c.fillStyle = '#9a9ea7'; c.fillRect(wx, hy - 11, 12, 22);
      c.strokeStyle = '#7d818a'; c.lineWidth = 0.7; [[3, -6], [6, -2], [4, 3], [7, 5]].forEach(([a, b]) => { c.beginPath(); c.moveTo(wx + a, hy + b); c.lineTo(wx + a + 2, hy + b + 1.4); c.stroke(); });
      c.restore();
      g.circle(0, hy, 10).stroke(INK, 1.2);
    }
    if (back) {
      if (L.style === 'shaved') { g.ell(-3, hy - 5, 3, 1.6).fill('rgba(255,255,255,.25)', false); g.ell(-10, hy + 1, 1.6, 2.6).fill(L.skin); g.ell(10, hy + 1, 1.6, 2.6).fill(L.skin); }
      hairTop(g, L, true, 0, t);
      return;
    }
    // Face.
    if (L.style === 'shaved') { g.ell(-3 + sx, hy - 6, 3.4, 1.6).fill('rgba(255,255,255,.28)', false); if (!side) g.ell(-10, hy + 1, 1.5, 2.4).fill(L.skin); g.ell(10, hy + 1, 1.5, 2.4).fill(L.skin); g.line(-5, hy + 6.2, 5, hy + 6.2).stroke('rgba(0,0,0,.18)', 1.4); }
    const ey = hy + 1, ex = side ? [1.4, 6.4] : [-3.8, 3.8];
    const blink = (Math.floor(t * 0.7 + (L.skin.length)) % 6 === 0) && (t * 0.7 % 1) < 0.12 && !L.halo || o.shut;   // Freya never blinks
    ex.forEach((x, i) => {
      if (side && i === 1) { g.ell(x, ey, 0.9, 1.6).fill(INK, false); return; }
      if (blink) { g.line(x - 1.4, ey, x + 1.4, ey).stroke(INK, 1); return; }
      const wolfEye = L.wolf && L.wolfEye !== false && x > 0;
      g.ell(x, ey, 1.6, 2.1).fill(wolfEye ? '#f0a020' : L.eye, 0.9);
      if (wolfEye) g.line(x, ey - 1.5, x, ey + 1.5).stroke('#111', 0.8);
      else g.circle(x - 0.5, ey - 0.8, 0.6).fill('#fff', false);
    });
    if (L.glasses) { if (side) { g.rect(ex[0] - 2.4, ey - 2.2, 5.2, 4.2, 1.2).stroke('#d9dde2', 0.9); g.line(ex[0] - 2.4, ey - 0.8, -6, ey - 1.6).stroke('#d9dde2', 0.8); } else { ex.forEach(x => g.rect(x - 2.6, ey - 2.2, 5.2, 4.2, 1.2).stroke('#d9dde2', 0.9)); g.line(-1.2, ey - 0.6, 1.2, ey - 0.6).stroke('#d9dde2', 0.8); } }
    if (L.brow) ex.forEach((x, i) => {
      if (side && i === 1) return;
      const d = side ? 1 : x < 0 ? 1 : -1, a = L.brow === 'knit' ? [-3.6, -2.6] : L.brow === 'sad' ? [-2.7, -3.7] : [-3.3, -3.3];
      g.line(x - 1.8 * d, ey + a[0], x + 1.8 * d, ey + a[1]).stroke(INK, 0.9);
    });
    if (L.blush) { g.ell(ex[0] - 2, hy + 4.4, 1.6, 0.9).fill('rgba(255,120,150,.4)', false); if (!side) g.ell(ex[1] + 2, hy + 4.4, 1.6, 0.9).fill('rgba(255,120,150,.4)', false); }
    const mx = side ? 5 : 0;
    if (o.mouth === 'open') g.ell(mx, hy + 5.6, 1.3, 1).fill('#7a2a3a', 0.7);
    else if (L.mouth === 'smile') g.path(x => { x.moveTo(mx - 1.4, hy + 5.4); x.quadraticCurveTo(mx, hy + (L.halo ? 7 : 6.3), mx + 1.4, hy + 5.4); }).stroke(INK, 0.8);
    else if (L.mouth === 'frown') g.path(x => { x.moveTo(mx - 1.5, hy + 6.4); x.quadraticCurveTo(mx, hy + 5.1, mx + 1.5, hy + 6.4); }).stroke(INK, 0.8);
    else g.line(mx - 1.3, hy + 5.9, mx + 1.3, hy + 5.9).stroke(INK, 0.8);
    hairTop(g, L, false, sx, t);
  }

  function hairTop(g, L, back, sx, t) {
    const hy = -31, H = L.hair, D = L.hairD || H;
    switch (L.style) {
      case 'braid':
        if (back) { g.circle(0, hy, 10.4).fill(H); braid(g, 0, hy + 6, 0, hy + 22, H, D); }
        else {
          g.path(x => { x.moveTo(-10.5, hy + 2); x.quadraticCurveTo(-11, hy - 11, 1, hy - 10.8); x.quadraticCurveTo(10, hy - 10, 10.5, hy - 1); x.quadraticCurveTo(5, hy - 7, -1, hy - 5); x.quadraticCurveTo(-6, hy - 3, -10.5, hy + 2); x.closePath(); }).fill(H);
          braid(g, -8, hy + 3, -9.5, hy + 19, H, D);
          if (!sx) g.poly(5, hy - 8, 10, hy - 17, 11, hy - 5).fill('#9a9ea7');   // the wolf's ear
          else g.poly(4, hy - 8, 8, hy - 17, 10, hy - 6).fill('#9a9ea7');
          [[-6, hy - 6], [-3, hy - 8]].forEach(([x, y]) => g.circle(x, y, 0.9).fill('#7fbf5a', 0.5));   // herbs in the braid
        }
        break;
      case 'spiky': {
        const sp = [[-11, hy - 1], [-12, hy - 9], [-7, hy - 9], [-8, hy - 16], [-2, hy - 11], [1, hy - 17], [4, hy - 11], [9, hy - 15], [8, hy - 8], [12, hy - 8], [10.5, hy - 1]];
        g.path(x => { x.moveTo(-10.5, hy + (back ? 6 : 0)); sp.forEach(([a, b]) => x.lineTo(a, b)); x.lineTo(10.5, hy + (back ? 6 : 0)); x.closePath(); }).fill(H);
        g.path(x => { x.moveTo(-10.4, hy - 3.6); x.quadraticCurveTo(0, hy - 6.6, 10.4, hy - 3.6); x.lineTo(10.2, hy - 1.2); x.quadraticCurveTo(0, hy - 4.2, -10.2, hy - 1.2); x.closePath(); }).fill(L.band, 0.9);
        if (back) { g.poly(-1, hy - 3, -4, hy + 6, -1.5, hy + 5).fill(L.band, 0.8); g.poly(1, hy - 3, 4, hy + 7, 1.8, hy + 6).fill(L.band, 0.8); }
        break;
      }
      case 'bob':
        g.path(x => { x.moveTo(-11, hy + (back ? 8 : 7)); x.lineTo(-11, hy - 2); x.quadraticCurveTo(-11, hy - 11.5, 0, hy - 11.5); x.quadraticCurveTo(11, hy - 11.5, 11, hy - 2); x.lineTo(11, hy + (back ? 8 : 7)); if (!back) { x.lineTo(8.5, hy + 7); x.lineTo(8.2, hy - 3.5); x.lineTo(-8.2, hy - 3.5); x.lineTo(-8.5, hy + 7); } x.closePath(); }).fill(H);
        // Seo-yeon's scorched red ribbon, streaming.
        if (L.ribbon) g.path(x => { x.moveTo(-9, hy - 6); x.quadraticCurveTo(-15, hy - 3, -16, hy + 4 + Math.sin(t * 3)); x.lineTo(-14, hy + 4); x.quadraticCurveTo(-13, hy - 2, -8.6, hy - 4); x.closePath(); }).fill(L.ribbon, 0.8);
        if (L.ribbon) g.rect(-10, hy - 8, 3, 3, 0.8).fill(L.ribbon, 0.8);
        break;
      case 'shaved': break;
      case 'nun':
        if (back) g.path(x => { x.moveTo(-11.5, hy); x.arc(0, hy, 11.5, Math.PI, 0); x.lineTo(12.5, hy + 16); x.lineTo(-12.5, hy + 16); x.closePath(); }).fill(L.hood);
        else {
          // Dark hair framing the face, the white band of her wimple, and the veil over it.
          g.path(x => { x.moveTo(-10, hy + 7); x.quadraticCurveTo(-10.5, hy - 6, 0, hy - 7); x.quadraticCurveTo(10.5, hy - 6, 10, hy + 7); x.lineTo(7.6, hy + 7); x.quadraticCurveTo(7, hy - 3, 0, hy - 3.6); x.quadraticCurveTo(-7, hy - 3, -7.6, hy + 7); x.closePath(); }).fill(H);
          g.path(x => { x.moveTo(-10.6, hy - 3.6); x.quadraticCurveTo(0, hy - 9.6, 10.6, hy - 3.6); x.lineTo(10.2, hy - 6.4); x.quadraticCurveTo(0, hy - 12.4, -10.2, hy - 6.4); x.closePath(); }).fill(L.band, 0.9);
          g.path(x => { x.moveTo(-10.4, hy - 6.2); x.quadraticCurveTo(-11, hy - 14, 0, hy - 14); x.quadraticCurveTo(11, hy - 14, 10.4, hy - 6.2); x.quadraticCurveTo(0, hy - 12.2, -10.4, hy - 6.2); x.closePath(); }).fill(L.hood);
        }
        break;
      case 'locs': {
        g.path(x => { x.moveTo(-10.5, hy + 1); x.quadraticCurveTo(-11, hy - 11.5, 0, hy - 11.5); x.quadraticCurveTo(11, hy - 11.5, 10.5, hy + 1); x.quadraticCurveTo(5, hy - 5, 0, hy - 5.5); x.quadraticCurveTo(-5, hy - 5, -10.5, hy + 1); x.closePath(); }).fill(back ? H : H);
        // Locs tied up on top and falling to either side.
        const lc = back ? [[-8, hy - 4, -10, hy + 9], [-4, hy - 6, -5, hy + 10], [0, hy - 6, 0, hy + 10], [4, hy - 6, 5, hy + 10], [8, hy - 4, 10, hy + 9]]
          : [[-9, hy - 4, -11, hy + 6], [9, hy - 4, 11, hy + 6], [-1, hy - 10, -5, hy - 17], [1, hy - 10, 1, hy - 18], [2, hy - 10, 6, hy - 16]];
        lc.forEach(([a, b, c2, d]) => { g.line(a, b, c2, d).stroke(D, 2.4); g.line(a, b, c2, d).stroke(H, 1.4); });
        break;
      }
      case 'goldbraid':
        if (back) { g.circle(0, hy, 10.4).fill(H); braid(g, 2, hy + 6, 3, hy + 26, H, D); }
        else {
          g.path(x => { x.moveTo(-10.5, hy + 3); x.quadraticCurveTo(-11.5, hy - 11.5, 0, hy - 11.5); x.quadraticCurveTo(11.5, hy - 11.5, 10.5, hy + 3); x.quadraticCurveTo(7, hy - 7, 0, hy - 7); x.quadraticCurveTo(-7, hy - 7, -10.5, hy + 3); x.closePath(); }).fill(H);
          braid(g, -8.5, hy + 4, -8, hy + 24, H, D);
          g.circle(0, hy - 7.4, 1.1).fill('#3bd16f', 0.6);
        }
        break;
      case 'long':
        if (back) g.path(x => { x.moveTo(-11, hy); x.arc(0, hy, 11, Math.PI, 0); x.lineTo(10, hy + 20); x.lineTo(-10, hy + 20); x.closePath(); }).fill(H);
        else {
          g.path(x => { x.moveTo(-10.8, hy + 4); x.quadraticCurveTo(-11.5, hy - 11.5, 0, hy - 11.5); x.quadraticCurveTo(11.5, hy - 11.5, 10.8, hy + 4); x.lineTo(8.5, hy - 2); x.lineTo(5, hy - 5.5); x.lineTo(2, hy - 3); x.lineTo(-1, hy - 5.5); x.lineTo(-4.5, hy - 3); x.lineTo(-8.5, hy - 2); x.closePath(); }).fill(H);
          g.rect(6.5, hy - 9, 2.2, 2.2, 0.5).fill('#a3203a', 0.6);
        }
        break;
      case 'uptima':
        if (back) g.path(x => { x.moveTo(-11, hy); x.arc(0, hy, 11, Math.PI, 0); x.lineTo(11, hy + 12); x.lineTo(-11, hy + 12); x.closePath(); }).fill(H);
        else {
          g.path(x => { x.moveTo(-11, hy + 6); x.quadraticCurveTo(-12, hy - 12, 0, hy - 11.5); x.quadraticCurveTo(12, hy - 12, 11, hy + 6); x.lineTo(9, hy - 3); x.quadraticCurveTo(4, hy - 7, 0, hy - 4); x.quadraticCurveTo(-4, hy - 7, -9, hy - 3); x.closePath(); }).fill(H);
          g.rect(-6, hy - 12.5, 12, 2.6, 1).fill('#fff', 0.8);   // the maid's cap
        }
        if (L.crown) g.poly(-4.5, hy - 12, -5, hy - 17, -2.4, hy - 14.5, 0, hy - 18, 2.4, hy - 14.5, 5, hy - 17, 4.5, hy - 12).fill('#ffcf33', 0.9);
        break;
      case 'bun':
        g.circle(0, hy - 11, 4.4).fill(H);
        if (!back) g.path(x => { x.moveTo(-10.5, hy + 1); x.quadraticCurveTo(-10.5, hy - 10.5, 0, hy - 10.5); x.quadraticCurveTo(10.5, hy - 10.5, 10.5, hy + 1); x.quadraticCurveTo(5, hy - 6, 0, hy - 6); x.quadraticCurveTo(-5, hy - 6, -10.5, hy + 1); x.closePath(); }).fill(H);
        else g.circle(0, hy, 10.3).fill(H);
        break;
      case 'hood':
        if (back) g.circle(0, hy, 11).fill(L.hood);
        else g.path(x => { x.moveTo(-11, hy + 2); x.quadraticCurveTo(-11, hy - 12, 0, hy - 12); x.quadraticCurveTo(11, hy - 12, 11, hy + 2); x.quadraticCurveTo(6, hy - 7, 0, hy - 7); x.quadraticCurveTo(-6, hy - 7, -11, hy + 2); x.closePath(); }).fill(L.hood);
        if (!back) g.circle(0, hy - 9, 1.5).fill('#ffd76a', 0.7);
        break;
      case 'short':
        g.path(x => { x.moveTo(-10.5, hy + 1); x.quadraticCurveTo(-11, hy - 11, 0, hy - 11); x.quadraticCurveTo(11, hy - 11, 10.5, hy + 1); x.quadraticCurveTo(6, hy - 5, 0, hy - 5.5); x.quadraticCurveTo(-6, hy - 5, -10.5, hy + 1); x.closePath(); }).fill(back ? H : H);
        break;
    }
  }
  function braid(g, x0, y0, x1, y1, H, D) {
    const n = 4;
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1), x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
      g.ell(x, y, 2.6 - k * 0.6, 2.8).fill(i % 2 ? D : H, 0.8);
    }
    g.line(x1, y1 + 2, x1, y1 + 5).stroke(H, 1.4);
  }
  function backHair(g, L) {
    if (L.style === 'goldbraid' || L.style === 'braid') return;   // drawn with the head
  }
  function longHairBehind(g, L) {
    const hy = -31;
    g.path(x => { x.moveTo(-11, hy); x.lineTo(-11.5, hy + (L.style === 'long' ? 20 : 10)); x.quadraticCurveTo(0, hy + (L.style === 'long' ? 23 : 12), 11.5, hy + (L.style === 'long' ? 20 : 10)); x.lineTo(11, hy); x.closePath(); }).fill(L.hairD || L.hair);
  }
  function halo(g, t) {
    // A thin gold ring. Up close it's a snake eating its own tail.
    const y = -46 + Math.sin(t * 2) * 0.8;
    g.ell(0, y, 8.5, 2.6).stroke('#5a4a10', 2.6); g.ell(0, y, 8.5, 2.6).stroke('#ffd24a', 1.4);
    g.circle(8.2, y + 0.4, 1.2).fill('#ffd24a', 0.6);
  }
  // Looks (js/wear.js): a hat on top of the hair, a lantern in the hand, wings of light behind.
  function hat(g, L, side) {
    const hy = -31;
    if (L.hat === 'santa' && L.style !== 'nun') {
      g.path(x => { x.moveTo(-10.5, hy - 7); x.quadraticCurveTo(-4, hy - 19, 8, hy - 16); x.quadraticCurveTo(13, hy - 14, 14, hy - 9); x.quadraticCurveTo(6, hy - 13, 10.5, hy - 7); x.closePath(); }).fill('#c0202c', 0.9);
      g.rect(-11.5, hy - 9, 23, 3.6, 1.8).fill('#f6f4ee', 0.8); g.circle(14, hy - 8, 2).fill('#f6f4ee', 0.8);
    } else if (L.hat === 'flowers') [-8, -4, 0, 4, 8].forEach((x, i) => { g.circle(x, hy - 9.5 - (i % 2 ? 1 : 0) - (x === 0 ? 1.5 : 0), 1.8).fill(i % 2 ? '#ffffff' : '#ffb3cf', 0.6); g.circle(x, hy - 9.5 - (i % 2 ? 1 : 0) - (x === 0 ? 1.5 : 0), 0.6).fill('#ffd25a', false); });
    else if (L.hat === 'frost') g.poly(-8, hy - 8, -6, hy - 14, -4, hy - 9, -1, hy - 16, 2, hy - 9, 5, hy - 14, 7, hy - 8).fill('#eef9ff', 0.8);
  }
  function lantern(g, side, t) {
    const x = side ? 9 : 10, sway = Math.sin(t * 2.4) * 0.8;
    g.line(x, -11, x + sway, -7).stroke(INK, 0.6);
    g.ell(x + sway, -4.5, 2.6, 3).fill('#e0402a', 0.8); g.ell(x + sway, -4.5, 4.2, 4.6).fill('rgba(255,180,90,.25)', false);
    g.rect(x + sway - 1.8, -7.8, 3.6, 1, 0.3).fill('#e9b53a', false); g.rect(x + sway - 1.8, -2, 3.6, 1, 0.3).fill('#e9b53a', false);
  }
  function wings(g, L, back, t) {
    const f = Math.sin(t * 1.6) * 1.2;
    [-1, 1].forEach(s => [2, 1, 0].forEach(i => g.path(x => { x.moveTo(s * 3, -19); x.quadraticCurveTo(s * (14 + i * 3), -30 - i * 3 - f, s * (17 + i * 2), -22 + i * 3); x.quadraticCurveTo(s * (13 + i * 2), -12 + i * 2, s * 4, -13); x.closePath(); }).fill(['#ffffff', '#eef5ff', '#d6e6ff'][i], 0.7)));
  }
  function tray(g, side) {
    const x = side ? 6 : -9;
    g.ell(x, -15, 5.5, 1.6).fill('#d8b25a', 0.9);
    [-2.5, 0, 2.5].forEach(d => g.ell(x + d, -16.6, 1.6, 1.2).fill('#e8a24a', 0.7));
  }
  function mop(g, side) {
    const x = side ? 2 : 10.5;
    g.line(x, -40, x + 1, -1).stroke('#7a5232', 1.8);
    g.path(c => { c.moveTo(x - 4, -40); c.quadraticCurveTo(x, -47, x + 4, -40); c.lineTo(x + 3, -36); c.lineTo(x - 3, -36); c.closePath(); }).fill('#d9dcd6', 1);
    [-2, 0, 2].forEach(d => g.line(x + d, -40, x + d * 1.2, -35).stroke('#a9aca6', 0.6));
  }

  // ---------- The grade: an overcast Cloud ----------
  // Painted over the world and under the names: the colour drained and cooled (more so towards the temple), cloud
  // shadows sliding over the ground, a nearer layer of mist that moves faster than the ground does (the parallax),
  // the fires and lamps glowing through, lightning, and a vignette. grim: 0 at the camp, 1 at the temple.
  const LIGHTS = [[10.5, 11.6, 2.8, '255,140,60', 1], [8.5, 4.2, 2.2, '226,189,79', 0], [25.5, 5.6, 1.8, '255,170,80', 0], [40.5, 6.4, 1.8, '255,170,80', 1],
    [36.5, 7.3, 2, '255,200,120', 1], [44.5, 7.3, 2, '255,200,120', 1], [56.5, 10.3, 2, '160,200,255', 1], [62.5, 10.3, 2, '160,200,255', 1], [59.5, 7.6, 2.6, '160,200,255', 0]];
  const SHADOWS = Array.from({ length: 9 }, (_, i) => { const h = hash(i * 7 + 3, i * 13 + 5); return [h % 76, 2 + (h >> 7) % 15, 3 + (h >> 11) % 3, 0.18 + ((h >> 5) % 10) / 100]; });
  const MIST = Array.from({ length: 7 }, (_, i) => { const h = hash(i * 11 + 1, i * 5 + 9); return [(h % 100) / 100, 1 + (h >> 6) % 16, 5 + (h >> 9) % 4, 0.5 + ((h >> 4) % 8) / 10]; });
  let flashT = -9;
  A.lightning = t => { flashT = t; };
  A.grade = function (ctx, t, vw, vh, cx, cy, ts, grim) {
    const k = Math.max(0, Math.min(1, grim));
    // Drain and cool the colour.
    ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${0.7 + 0.2 * k})`; ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = `rgba(62,68,96,${0.74 + 0.12 * k})`; ctx.fillRect(0, 0, vw, vh);
    // Cloud shadows drift east over the ground.
    SHADOWS.forEach(([x0, y, r, a]) => {
      const x = ((x0 + t * 0.35) % 82) - 8, X = x * ts - cx, Y = y * ts - cy, R = r * ts;
      if (X < -R || X > vw + R || Y < -R || Y > vh + R) return;
      const gr = ctx.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(20,22,40,${a + 0.12 * k})`); gr.addColorStop(1, 'rgba(30,32,52,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(X, Y, R * 1.5, R, 0, 0, 7); ctx.fill();
    });
    // Fires, lamps and windows.
    ctx.globalCompositeOperation = 'lighter';
    LIGHTS.forEach(([x, y, r, rgb, flick]) => {
      const X = x * ts - cx, Y = y * ts - cy, R = r * ts * (1 + (flick ? Math.sin(t * 9 + x) * 0.05 + Math.sin(t * 23 + y) * 0.03 : 0));
      if (X < -R || X > vw + R || Y < -R || Y > vh + R) return;
      const gr = ctx.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(${rgb},.5)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gr; ctx.fillRect(X - R, Y - R, R * 2, R * 2);
    });
    // Mist, nearer than the ground: it slides past faster than the map scrolls.
    ctx.globalCompositeOperation = 'source-over';
    const span = vw + 10 * ts;
    MIST.forEach(([f, y, w, v]) => {
      const X = ((f * span + t * v * ts - cx * 1.35) % span + span) % span - 5 * ts, Y = y * ts - cy * 1.35 % (18 * ts);
      const gr = ctx.createRadialGradient(X, Y, 0, X, Y, w * ts); gr.addColorStop(0, `rgba(176,182,200,${0.16 + 0.06 * k})`); gr.addColorStop(1, 'rgba(196,200,214,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(X, Y, w * ts, w * ts * 0.22, 0, 0, 7); ctx.fill();
    });
    // Rain at the temple.
    if (k > 0.75) {
      const a = (k - 0.75) * 4 * 0.35;
      ctx.strokeStyle = `rgba(190,198,222,${a})`; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < 140; i++) {
        const h = hash(i, 77), x = (h % 1000) / 1000 * (vw + 80) - 40, sp = 0.9 + ((h >> 10) % 10) / 20;
        const y = (((h >> 4) % 1000) / 1000 * (vh + 60) + t * vh * sp) % (vh + 60) - 30;
        ctx.moveTo(x, y); ctx.lineTo(x - 5, y + 14);
      }
      ctx.stroke();
    }
    const since = t - flashT;
    if (since >= 0 && since < 0.5) { ctx.fillStyle = `rgba(230,236,255,${(since < 0.08 || (since > 0.16 && since < 0.22) ? 0.35 : 0.12) * (1 - since * 2)})`; ctx.fillRect(0, 0, vw, vh); }
    const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    vg.addColorStop(0, 'rgba(10,8,18,0)'); vg.addColorStop(1, `rgba(8,6,14,${0.62 + 0.15 * k})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, vw, vh);
  };

  // ---------- Ground ----------
  // One tile at (x, y). ch is the map's character there; nb(dx, dy) is the neighbour's.
  const GRASS = ['#7cc96a', '#78c466', '#80cd6d', '#76c164'];
  A.ground = function (ctx, ch, x, y, ts, t, nb) {
    const X = x * ts, Y = y * ts, h = hash(x, y);
    const water = ch === 'w', path = ch === ',' || ch === 'D', stone = ch === 's' || ch === 'S', bridge = ch === '=';
    ctx.fillStyle = GRASS[h % 4]; ctx.fillRect(X, Y, ts + 1, ts + 1);
    if (!water && !path && !stone && !bridge && h % 7 === 0) {
      // Tufts and the odd flower.
      ctx.strokeStyle = '#5aa64c'; ctx.lineWidth = ts / 32 * 1.2;
      const tx = X + (h % 23) / 23 * ts * 0.7 + ts * 0.15, ty = Y + (h % 17) / 17 * ts * 0.6 + ts * 0.3;
      ctx.beginPath(); ctx.moveTo(tx - 3, ty); ctx.lineTo(tx - 1, ty - 5); ctx.moveTo(tx, ty); ctx.lineTo(tx + 1, ty - 6); ctx.moveTo(tx + 3, ty); ctx.lineTo(tx + 4, ty - 4); ctx.stroke();
    }
    if (ch === 'f') {
      const cols = ['#ff7aa8', '#ffe066', '#ffffff', '#b98bff'];
      for (let i = 0; i < 4; i++) { const hx = hash(x * 3 + i, y * 5 - i); ctx.fillStyle = cols[hx % 4]; ctx.beginPath(); ctx.arc(X + (hx % 29) / 29 * ts, Y + (hx % 31) / 31 * ts, ts / 32 * 2, 0, 7); ctx.fill(); }
    }
    if (path) {
      // Paths are soft-edged: a blob per tile, joined to its path neighbours.
      ctx.fillStyle = '#e2c38c';
      const r = ts * 0.46;
      ctx.beginPath(); ctx.arc(X + ts / 2, Y + ts / 2, r, 0, 7); ctx.fill();
      const isP = c => c === ',' || c === 'D' || c === '=' || c === 's';
      if (isP(nb(1, 0))) ctx.fillRect(X + ts / 2, Y + ts / 2 - r, ts / 2 + 1, r * 2);
      if (isP(nb(-1, 0))) ctx.fillRect(X, Y + ts / 2 - r, ts / 2, r * 2);
      if (isP(nb(0, 1))) ctx.fillRect(X + ts / 2 - r, Y + ts / 2, r * 2, ts / 2 + 1);
      if (isP(nb(0, -1))) ctx.fillRect(X + ts / 2 - r, Y, r * 2, ts / 2);
      if (h % 3 === 0) { ctx.fillStyle = '#c9a56e'; ctx.beginPath(); ctx.arc(X + (h % 19) / 19 * ts * 0.6 + ts * 0.2, Y + (h % 13) / 13 * ts * 0.6 + ts * 0.2, ts / 32 * 1.4, 0, 7); ctx.fill(); }
    }
    if (stone) {
      ctx.fillStyle = ch === 'S' ? '#d8d2c4' : '#c9c3b6'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.strokeStyle = 'rgba(43,35,64,.18)'; ctx.lineWidth = 1;
      ctx.strokeRect(X + 0.5, Y + 0.5, ts / 2, ts / 2); ctx.strokeRect(X + ts / 2 + 0.5, Y + 0.5, ts / 2, ts / 2);
      ctx.strokeRect(X + ts / 4 + 0.5, Y + ts / 2 + 0.5, ts / 2, ts / 2);
    }
    if (water || bridge) {
      ctx.fillStyle = '#5bb2e6'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = ts / 32 * 1.3;
      const ph = (t * 0.6 + (h % 10) / 10) % 1;
      ctx.beginPath(); const wy = Y + ts * (0.25 + 0.5 * ((h % 5) / 5)); const wx = X + ts * 0.2 + ph * ts * 0.3;
      ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + ts * 0.12, wy - ts * 0.08, wx + ts * 0.24, wy); ctx.quadraticCurveTo(wx + ts * 0.36, wy + ts * 0.08, wx + ts * 0.48, wy); ctx.stroke();
      // Banks where water meets grass.
      ctx.fillStyle = '#4a9a54';
      const dry = c => c !== 'w' && c !== '=';
      if (dry(nb(-1, 0))) ctx.fillRect(X, Y, ts * 0.12, ts + 1);
      if (dry(nb(1, 0))) ctx.fillRect(X + ts * 0.88, Y, ts * 0.12, ts + 1);
    }
    if (bridge) {
      ctx.fillStyle = '#b57a45'; ctx.fillRect(X, Y + ts * 0.08, ts + 1, ts * 0.84);
      ctx.strokeStyle = '#7a4c28'; ctx.lineWidth = 1;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(X + i * ts / 4, Y + ts * 0.08); ctx.lineTo(X + i * ts / 4, Y + ts * 0.92); ctx.stroke(); }
      ctx.fillStyle = '#8a5530'; ctx.fillRect(X, Y + ts * 0.02, ts + 1, ts * 0.1); ctx.fillRect(X, Y + ts * 0.88, ts + 1, ts * 0.1);
    }
  };

  // ---------- Props ----------
  // Each prop stands on the bottom edge of its footprint: (x, y) is its top-left tile, w x h tiles.
  // Drawn in units: 32 to a tile, origin at the footprint's bottom-left corner.
  const PROPS = {};
  A.prop = function (ctx, p, ts, t) {
    const f = PROPS[p.kind]; if (!f) return;
    frame(ctx, p.x * ts, (p.y + (p.h || 1)) * ts, ts, g => f(g, p, t), false);
  };

  PROPS.tree = (g, p, t) => {
    const h = hash(p.x, p.y), sway = Math.sin(t * 1.3 + h) * 0.8;
    g.ell(16, -1, 12, 3.5).fill('rgba(43,35,64,.2)', false);
    if (h % 4 === 0) {
      // A pine.
      g.rect(14, -10, 4, 10).fill('#7a5232');
      [[-44, 12], [-34, 15], [-24, 17]].forEach(([y, w]) => g.poly(16 + sway, y - 14, 16 + w, y + 6, 16 - w, y + 6).fill('#3f8f4f'));
      return;
    }
    g.rect(13.5, -14, 5, 14, 1).fill('#7a5232');
    const cols = h % 3 ? ['#3f9a4c', '#57b45c'] : ['#4a9a3e', '#6cbf55'];
    g.circle(9 + sway, -26, 10).fill(cols[0]); g.circle(23 + sway, -26, 10).fill(cols[0]); g.circle(16 + sway, -36, 12).fill(cols[0]);
    g.circle(13 + sway, -35, 6).fill(cols[1], false); g.circle(20 + sway, -27, 4).fill(cols[1], false);
    if (h % 5 === 1) [[8, -28], [22, -33], [15, -22]].forEach(([x, y]) => g.circle(x + sway, y, 1.6).fill('#ff6b6b', 0.6));
  };
  PROPS.bush = (g, p) => { g.circle(10, -8, 8).fill('#4fa552'); g.circle(20, -9, 9).fill('#4fa552'); g.circle(15, -14, 7).fill('#62b95c', false); };
  PROPS.rock = (g) => { g.path(c => { c.moveTo(4, 0); c.quadraticCurveTo(2, -14, 14, -16); c.quadraticCurveTo(28, -14, 28, 0); c.closePath(); }).fill('#a7a3a0'); g.line(10, -10, 16, -12).stroke('#d6d3cf', 1.6); };
  PROPS.tent = (g, p, t) => {
    const W = (p.w || 3) * 32, H = 54, c = p.color || '#d9c7a0', d = p.dark || '#b39c70';
    g.ell(W / 2, -1, W / 2 - 2, 5).fill('rgba(43,35,64,.18)', false);
    g.poly(4, 0, W / 2, -H, W - 4, 0).fill(c);
    g.poly(W / 2, -H, W - 4, 0, W - 18, 0, W / 2 + 6, -H + 8).fill(d, false);
    g.poly(W / 2 - 12, 0, W / 2, -28, W / 2 + 12, 0).fill('#3a2a20');
    g.poly(W / 2 - 12, 0, W / 2, -28, W / 2 - 5, 0).fill(c);
    g.line(W / 2, -H, W / 2, -H - 12).stroke('#7a5232', 1.6);
    g.poly(W / 2, -H - 12, W / 2 + 10 + Math.sin(t * 4) * 1.5, -H - 9, W / 2, -H - 6).fill(p.flag || '#ff6b6b', 0.9);
    g.line(4, 0, -4, 6).stroke('#7a6a50', 0.8); g.line(W - 4, 0, W + 4, 6).stroke('#7a6a50', 0.8);
    if (p.mark === 'leaf') { g.circle(W / 2 + 18, -18, 7).fill('#fff'); g.path(x => { x.moveTo(W / 2 + 14, -14); x.quadraticCurveTo(W / 2 + 14, -23, W / 2 + 22, -22); x.quadraticCurveTo(W / 2 + 22, -14, W / 2 + 14, -14); x.closePath(); }).fill('#4fae5e', 0.8); }
  };
  PROPS.pavilion = (g, p, t) => {
    // Freya's pavilion: green and gold stripes, a scalloped valance, and her sign, a ring that eats its own tail.
    const W = (p.w || 5) * 32;
    g.ell(W / 2, -1, W / 2 - 4, 7).fill('rgba(43,35,64,.2)', false);
    g.rect(10, -40, W - 20, 40).fill('#f7f0dc');
    for (let i = 0; i < 6; i++) g.rect(10 + i * (W - 20) / 6, -40, (W - 20) / 12, 40).fill('#2c8a4b', false);
    g.rect(10, -40, W - 20, 40).stroke(INK, 1.2);
    g.poly(W / 2 - 14, 0, W / 2 - 14, -28, W / 2 + 14, -28, W / 2 + 14, 0).fill('#3a2a20');
    g.path(x => { x.moveTo(W / 2 - 14, 0); x.quadraticCurveTo(W / 2 - 4, -16, W / 2 - 12, -28); x.lineTo(W / 2 - 14, -28); x.closePath(); }).fill('#2c8a4b');
    g.path(x => { x.moveTo(W / 2 + 14, 0); x.quadraticCurveTo(W / 2 + 4, -16, W / 2 + 12, -28); x.lineTo(W / 2 + 14, -28); x.closePath(); }).fill('#2c8a4b');
    g.poly(2, -40, W / 2, -82, W - 2, -40).fill('#2c8a4b');
    g.poly(W / 2, -82, W / 2 + 18, -40, W / 2 + 34, -40).fill('#e2bd4f', false);
    g.poly(W / 2, -82, W / 2 - 18, -40, W / 2 - 34, -40).fill('#e2bd4f', false);
    g.poly(2, -40, W / 2, -82, W - 2, -40).stroke(INK, 1.2);
    for (let i = 0; i < 8; i++) g.path(x => { const x0 = 2 + i * (W - 4) / 8; x.moveTo(x0, -40); x.quadraticCurveTo(x0 + (W - 4) / 16, -31, x0 + (W - 4) / 8, -40); x.closePath(); }).fill(i % 2 ? '#e2bd4f' : '#2c8a4b');
    g.line(W / 2, -82, W / 2, -96).stroke('#7a5232', 1.8);
    g.circle(W / 2, -100, 4.5).stroke('#ffd24a', 1.8); g.circle(W / 2 + 4, -99, 1).fill('#ffd24a', false);
    g.rect(W / 2 - 18, -60, 36, 13, 3).fill('#fff8e0', 0.9);
    g.ctx.fillStyle = INK; g.ctx.font = '600 8px Fredoka, sans-serif'; g.ctx.textAlign = 'center'; g.ctx.fillText('FREE TIER', W / 2, -51);
    // Sample trays on a table outside.
    g.rect(W - 46, -14, 30, 12, 2).fill('#c9965a'); g.line(W - 42, -2, W - 42, 0).stroke(INK, 1); g.line(W - 20, -2, W - 20, 0).stroke(INK, 1);
    [W - 40, W - 32, W - 24].forEach(x => g.ell(x, -16, 3, 2).fill('#e8a24a', 0.7));
  };
  PROPS.kitchen = (g, p, t) => {
    const W = (p.w || 3) * 32;
    g.line(6, 0, 6, -46).stroke('#7a5232', 2.4); g.line(W - 6, 0, W - 6, -46).stroke('#7a5232', 2.4);
    g.path(x => { x.moveTo(0, -42); x.lineTo(W, -42); x.lineTo(W - 4, -54); x.lineTo(4, -54); x.closePath(); }).fill('#f2efe6');
    for (let i = 0; i < 6; i++) g.path(x => { const x0 = i * W / 6; x.moveTo(x0, -42); x.quadraticCurveTo(x0 + W / 12, -36, x0 + W / 6, -42); x.closePath(); }).fill(i % 2 ? '#d84a3a' : '#f2efe6');
    g.rect(10, -20, W - 46, 20).fill('#b5824d'); g.rect(8, -22, W - 42, 4, 1).fill('#d9a86a');
    [16, 28, 40].forEach((x, i) => { g.line(x, -42, x, -36).stroke('#555', 0.8); g.ell(x, -33, 3.5, 3).fill(['#9aa1a8', '#c7884a', '#9aa1a8'][i], 0.8); });
    // The stove: a pot over a small fire.
    const fx = W - 22;
    g.rect(fx - 9, -12, 18, 12, 2).fill('#6d6a70');
    flame(g, fx, -12, t, 0.7);
    g.path(x => { x.moveTo(fx - 8, -20); x.lineTo(fx + 8, -20); x.lineTo(fx + 6, -12); x.lineTo(fx - 6, -12); x.closePath(); }).fill('#3a3a42');
    for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; g.circle(fx - 3 + i * 3 + Math.sin(t * 2 + i) * 2, -24 - k * 20, 2 + k * 2).fill(`rgba(255,255,255,${0.6 * (1 - k)})`, false); }
  };
  PROPS.watch = (g, p) => {
    const W = (p.w || 2) * 32;
    [[8, 0, 14, -60], [W - 8, 0, W - 14, -60]].forEach(([a, b, c, d]) => g.line(a, b, c, d).stroke('#7a5232', 3));
    g.line(10, -20, W - 10, -40).stroke('#7a5232', 1.6); g.line(W - 10, -20, 10, -40).stroke('#7a5232', 1.6);
    g.rect(6, -66, W - 12, 8, 1).fill('#b5824d');
    g.rect(10, -84, W - 20, 18).fill('rgba(0,0,0,0)', false);
    g.line(10, -66, 10, -84).stroke('#7a5232', 1.6); g.line(W - 10, -66, W - 10, -84).stroke('#7a5232', 1.6);
    g.poly(2, -82, W / 2, -98, W - 2, -82).fill('#8d1d29');
    g.line(W / 2, -98, W / 2, -108).stroke('#7a5232', 1.4); g.poly(W / 2, -108, W / 2 + 9, -105, W / 2, -102).fill('#f2efe8', 0.8);
    // A practice dummy beside it.
    g.line(W + 6, 0, W + 6, -22).stroke('#7a5232', 1.8); g.line(W - 2, -16, W + 14, -16).stroke('#7a5232', 1.6); g.circle(W + 6, -25, 4).fill('#d9c7a0');
  };
  PROPS.crates = (g, p) => {
    g.rect(2, -20, 22, 20, 1).fill('#b5824d'); g.line(2, -20, 24, 0).stroke('#7a5232', 1); g.line(24, -20, 2, 0).stroke('#7a5232', 1);
    g.rect(26, -16, 18, 16, 1).fill('#c79358'); g.line(26, -8, 44, -8).stroke('#7a5232', 1);
    g.rect(8, -36, 18, 16, 1).fill('#c79358'); g.line(8, -28, 26, -28).stroke('#7a5232', 1);
    // A bedroll across the doorway, and the wobbly chair.
    g.rect(46, -6, 16, 6, 3).fill('#5a6a9a');
    const cx = 52; g.rect(cx - 2, -18, 12, 3, 1).fill('#9a6a3a'); g.line(cx, -15, cx - 1, 0).stroke('#7a5232', 1.4); g.line(cx + 8, -15, cx + 9, -2).stroke('#7a5232', 1.4); g.line(cx + 8, -18, cx + 8, -30).stroke('#7a5232', 1.4); g.line(cx + 8, -30, cx + 2, -30).stroke('#7a5232', 1.4);
  };
  PROPS.hospital = (g, p) => {
    // Mira's field hospital: two cots and a table of herbs and bandages.
    g.rect(2, -10, 26, 8, 2).fill('#f4f1ea'); g.line(4, -2, 4, 0).stroke(INK, 1); g.line(26, -2, 26, 0).stroke(INK, 1);
    g.rect(34, -16, 24, 4, 1).fill('#b5824d'); g.line(36, -12, 36, 0).stroke('#7a5232', 1.4); g.line(56, -12, 56, 0).stroke('#7a5232', 1.4);
    [[38, '#7fbf5a'], [44, '#c9e08a'], [50, '#f4f1ea']].forEach(([x, c]) => g.rect(x, -21, 5, 5, 1).fill(c, 0.8));
  };
  PROPS.campfire = (g, p, t) => {
    g.ell(16, -6, 13, 5).fill('#6d6a70');
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.ell(16 + Math.cos(a) * 12, -6 + Math.sin(a) * 4.5, 3, 2.2).fill('#9a969c', 0.8); }
    g.line(9, -5, 23, -8).stroke('#6a4020', 3); g.line(9, -8, 23, -5).stroke('#7a5232', 3);
    flame(g, 16, -7, t, 1.1);
  };
  function flame(g, x, y, t, k) {
    const f = (a, s, col) => {
      const w = 6 * k * s, h = (14 + Math.sin(t * 9 + a) * 2.5) * k * s;
      g.path(c => { c.moveTo(x - w, y); c.quadraticCurveTo(x - w, y - h * 0.5, x + Math.sin(t * 7 + a) * 2, y - h); c.quadraticCurveTo(x + w, y - h * 0.5, x + w, y); c.closePath(); }).fill(col, false);
    };
    f(0, 1, '#ff7a2a'); f(1.3, 0.7, '#ffb43a'); f(2.1, 0.4, '#fff2a0');
  }
  PROPS.cart = (g, p, t) => {
    const open = p.state === 'open';
    g.ell(32, -1, 26, 4).fill('rgba(43,35,64,.2)', false);
    g.rect(6, -26, 52, 18, 2).fill('#b5824d'); g.line(6, -17, 58, -17).stroke('#7a5232', 1);
    g.line(58, -16, 68, -10).stroke('#7a5232', 2.4);
    [16, 46].forEach(x => { g.circle(x, -8, 8).fill('#8a5a32'); g.circle(x, -8, 2).fill('#d9a740', 0.8); [0, 1, 2, 3].forEach(i => { const a = i * Math.PI / 4; g.line(x + Math.cos(a) * 7, -8 + Math.sin(a) * 7, x - Math.cos(a) * 7, -8 - Math.sin(a) * 7).stroke('#5a3a20', 0.8); }); });
    // The chest on the cart.
    if (open) {
      g.poly(18, -26, 46, -26, 48, -44, 20, -40).fill('#9a6a3a');
      g.ctx.save(); g.ctx.globalCompositeOperation = 'lighter'; g.circle(32, -30, 12 + Math.sin(t * 3) * 1.5).fill('rgba(255,220,120,.35)', false); g.ctx.restore();
    }
    g.rect(18, -40, 28, 14, 2).fill('#c79358');
    if (!open) {
      g.rect(18, -40, 28, 5, 2).fill('#9a6a3a');
      g.rect(28, -34, 8, 8, 1.5).fill('#ffcf33', 1); g.path(c => { c.arc(32, -34, 3, Math.PI, 0); }).stroke(INK, 1.4); g.circle(32, -30.5, 1).fill(INK, false);
    }
  };
  PROPS.board = (g, p) => {
    const W = (p.w || 2) * 32;
    g.line(8, 0, 8, -44).stroke('#7a5232', 2.6); g.line(W - 8, 0, W - 8, -44).stroke('#7a5232', 2.6);
    g.rect(2, -46, W - 4, 30, 2).fill('#c79358');
    g.poly(0, -46, W / 2, -56, W, -46).fill('#8a5530');
    // Wanted posters: the Cult's heir and the drunk enforcer, side by side.
    [[8, '#8d1d29'], [W / 2 + 2, '#24345e']].forEach(([x, col]) => {
      g.rect(x, -43, W / 2 - 10, 24, 1).fill('#f4ecd4', 0.9);
      g.ctx.fillStyle = INK; g.ctx.font = '700 4.5px Fredoka, sans-serif'; g.ctx.textAlign = 'center'; g.ctx.fillText('WANTED', x + (W / 2 - 10) / 2, -38);
      g.circle(x + (W / 2 - 10) / 2, -30, 4).fill(col, 0.7);
      g.line(x + 3, -23, x + W / 2 - 13, -23).stroke('#9a8a6a', 0.8);
    });
  };
  PROPS.sign = (g, p) => {
    g.line(16, 0, 16, -30).stroke('#7a5232', 2.4);
    g.poly(4, -30, 30, -30, 34, -26, 30, -22, 4, -22).fill('#c79358');
    g.poly(28, -18, 4, -18, 0, -14, 4, -10, 28, -10).fill('#c79358');
  };
  PROPS.tavern = (g, p, t) => {
    const W = (p.w || 5) * 32;
    g.rect(6, -58, W - 12, 58).fill('#efe2c6');
    [[6, -58, 6, 0], [W - 6, -58, W - 6, 0], [6, -30, W - 6, -30]].forEach(l => g.line(...l).stroke('#7a5232', 2.4));
    g.line(W / 2 - 34, -58, W / 2 - 34, -30).stroke('#7a5232', 1.8); g.line(W / 2 + 34, -58, W / 2 + 34, -30).stroke('#7a5232', 1.8);
    g.poly(-4, -56, W / 2, -96, W + 4, -56).fill('#c0503a');
    for (let i = 1; i < 4; i++) g.line(-4 + i * 8, -56 + i * -4, W + 4 - i * 8, -56 + i * -4).stroke('rgba(43,35,64,.25)', 1);
    g.rect(W / 2 + 18, -94, 10, 22).fill('#9a969c');
    for (let i = 0; i < 2; i++) { const k = (t * 0.4 + i / 2) % 1; g.circle(W / 2 + 23 + Math.sin(t + i) * 3, -98 - k * 24, 3 + k * 3).fill(`rgba(240,240,240,${0.7 * (1 - k)})`, false); }
    // Door, windows lit warm, and the sign with a mug on it.
    g.rect(W / 2 - 10, -28, 20, 28, 1).fill('#7a4c28'); g.circle(W / 2 + 6, -14, 1.2).fill('#ffcf33', 0.6);
    [[22, -50], [W - 42, -50], [22, -24], [W - 42, -24]].forEach(([x, y]) => { g.rect(x, y, 20, 14, 1).fill('#ffd77a'); g.line(x + 10, y, x + 10, y + 14).stroke(INK, 0.8); });
    g.line(W / 2 + 26, -40, W / 2 + 40, -40).stroke('#5a3a20', 1.4);
    g.rect(W / 2 + 30, -40, 14, 12, 2).fill('#f4ecd4', 0.9);
    g.rect(W / 2 + 34, -37, 5, 6, 1).fill('#e8a24a', 0.7); g.path(c => { c.arc(W / 2 + 39.5, -34, 2, -Math.PI / 2, Math.PI / 2); }).stroke(INK, 0.7);
    g.rect(14, -6, 14, 6, 1).fill('#9a6a3a'); g.circle(32, -5, 4).fill('#8a5a32');   // a barrel and a bench
  };
  PROPS.cottage = (g, p) => {
    const W = (p.w || 3) * 32, col = p.color || '#7a9ad0';
    g.rect(6, -40, W - 12, 40).fill('#f2e8d4');
    g.poly(-2, -38, W / 2, -70, W + 2, -38).fill(col);
    g.rect(W / 2 - 8, -24, 16, 24, 1).fill('#8a5a32');
    g.rect(14, -30, 14, 12, 1).fill('#bfe3ff'); g.rect(W - 28, -30, 14, 12, 1).fill('#bfe3ff');
    g.rect(10, -4, W - 20, 4).fill('#7fbf5a', false);
  };
  PROPS.shrine = (g, p, t) => {
    // Brookfall's shrine to Uptima: a stone house for her, a bell, and forty years of prayers tied to the rope.
    const W = (p.w || 3) * 32;
    g.rect(10, -8, W - 20, 8).fill('#b8b2a6');
    g.rect(18, -46, W - 36, 38).fill('#d8d2c4');
    g.poly(6, -44, W / 2, -70, W - 6, -44).fill('#5a7ea6');
    g.rect(W / 2 - 9, -36, 18, 28, 2).fill('#3a3346');
    g.circle(W / 2, -26, 6).stroke('#ffcf33', 1.6);   // her sun
    g.line(W / 2 + 22, -44, W / 2 + 22, -14).stroke('#c9a06a', 1.2);
    g.path(c => { c.moveTo(W / 2 + 18, -14); c.quadraticCurveTo(W / 2 + 22, -22, W / 2 + 26, -14); c.closePath(); }).fill('#d9a740');
    for (let i = 0; i < 7; i++) g.rect(W / 2 + 19 + (i % 2) * 4, -42 + i * 4, 3, 2.4, 0.5).fill(['#fff4d6', '#ffe0ea', '#e0f0ff'][i % 3], 0.5);
    g.rect(W / 2 - 18, -10, 10, 6, 1).fill('#9a6a3a');   // offering box
    g.ell(W / 2 - 13, -11, 2, 1).fill('#e8a24a', 0.6);
  };
  PROPS.lamp = (g, p, t) => {
    g.line(16, 0, 16, -38).stroke('#4a4a52', 2);
    g.rect(11, -46, 10, 9, 2).fill('#ffe28a');
    g.ctx.save(); g.ctx.globalCompositeOperation = 'lighter'; g.circle(16, -42, 9 + Math.sin(t * 3) * 0.6).fill('rgba(255,220,120,.18)', false); g.ctx.restore();
  };
  PROPS.fence = (g, p) => {
    const W = (p.w || 1) * 32;
    g.line(0, -12, W, -12).stroke('#9a6a3a', 2); g.line(0, -6, W, -6).stroke('#9a6a3a', 2);
    for (let x = 4; x < W; x += 12) g.line(x, 0, x, -16).stroke('#7a5232', 2.4);
  };
  PROPS.barricade = (g, p) => {
    g.line(2, 0, 30, -22).stroke('#9a6a3a', 3); g.line(30, 0, 2, -22).stroke('#9a6a3a', 3);
    g.rect(0, -16, 32, 5, 1).fill('#c79358');
  };
  PROPS.rail = (g, p) => {
    // The bridge's railings, drawn over the planks.
    const W = (p.w || 1) * 32;
    g.line(0, -30, W, -30).stroke('#8a5530', 2.2); for (let x = 2; x <= W; x += 16) g.line(x, -24, x, -34).stroke('#7a4c28', 2);
    g.line(0, 2, W, 2).stroke('#8a5530', 2.2); for (let x = 2; x <= W; x += 16) g.line(x, 6, x, -4).stroke('#7a4c28', 2);
  };
  PROPS.pillar = (g, p) => {
    g.rect(8, -60, 16, 56).fill('#ece6d8'); g.rect(4, -66, 24, 8, 1).fill('#d8d2c4'); g.rect(4, -6, 24, 6, 1).fill('#d8d2c4');
    [12, 16, 20].forEach(x => g.line(x, -56, x, -8).stroke('rgba(43,35,64,.15)', 1));
    g.circle(16, -70, 4).fill('#ffcf33', 1);
  };
  PROPS.temple = (g, p, t) => {
    // The Temple of Uptime: white stone, gold trim, her sun over the door, and four masks hung by the gate.
    const W = (p.w || 11) * 32, open = p.state === 'open', mid = p.door != null ? (p.door - p.x + 0.5) * 32 : W / 2;
    g.rect(0, -150, W, 150).fill('#efe9dc');
    for (let i = 0; i < 6; i++) g.rect(10 + i * (W - 40) / 5, -140, 20, 120).fill('#e2dccd');
    g.poly(-8, -148, W / 2, -206, W + 8, -148).fill('#f7f2e6');
    g.poly(18, -152, W / 2, -194, W - 18, -152).fill('#e9dfc4');
    g.line(-8, -148, W + 8, -148).stroke('#d9a740', 3);
    g.circle(W / 2, -172, 13).fill('#ffcf33'); for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2 + t * 0.2; g.line(W / 2 + Math.cos(a) * 16, -172 + Math.sin(a) * 16, W / 2 + Math.cos(a) * 21, -172 + Math.sin(a) * 21).stroke('#d9a740', 1.6); }
    g.rect(0, -12, W, 12).fill('#d8d2c4');
    // The gate.
    g.path(c => { c.moveTo(mid - 30, 0); c.lineTo(mid - 30, -70); c.arc(mid, -70, 30, Math.PI, 0); c.lineTo(mid + 30, 0); c.closePath(); }).fill(open ? '#2b2340' : '#c9a06a');
    if (open) {
      g.ctx.save(); g.ctx.globalCompositeOperation = 'lighter'; g.path(c => { c.moveTo(mid - 26, 0); c.lineTo(mid - 26, -70); c.arc(mid, -70, 26, Math.PI, 0); c.lineTo(mid + 26, 0); c.closePath(); }).fill(`rgba(255,220,140,${0.25 + 0.08 * Math.sin(t * 2)})`, false); g.ctx.restore();
    } else {
      g.line(mid, -100, mid, 0).stroke(INK, 1.4);
      [-14, 14].forEach(d => { g.circle(mid + d, -46, 3).fill('#ffcf33', 1); });
      for (let y = -88; y < 0; y += 16) g.line(mid - 30, y, mid + 30, y).stroke('rgba(43,35,64,.2)', 1);
    }
    // Four masks, two each side of the gate: the roles you could put on.
    const MASK = [['#ffffff', '#3b8bff'], ['#ffe0a0', '#d84a3a'], ['#2b2340', '#ffcf33'], ['#e0d4ff', '#8b6cff']];
    MASK.forEach(([face, trim], i) => {
      const mx = mid + (i < 2 ? -62 + i * 22 : 40 + (i - 2) * 22), my = -84;
      g.line(mx, my - 18, mx, my - 10).stroke('#7a5232', 1);
      g.path(c => { c.moveTo(mx - 8, my - 10); c.quadraticCurveTo(mx, my - 14, mx + 8, my - 10); c.quadraticCurveTo(mx + 9, my + 4, mx, my + 8); c.quadraticCurveTo(mx - 9, my + 4, mx - 8, my - 10); c.closePath(); }).fill(face);
      g.ell(mx - 3.5, my - 3, 2.2, 1.4).fill(INK, false); g.ell(mx + 3.5, my - 3, 2.2, 1.4).fill(INK, false);
      g.line(mx - 6, my - 9, mx + 6, my - 9).stroke(trim, 1.6);
    });
  };
  PROPS.statue = (g, p) => {
    // Uptima, in stone, mid-croissant.
    g.rect(4, -14, 24, 14, 1).fill('#c9c3b6');
    g.path(c => { c.moveTo(9, -14); c.quadraticCurveTo(8, -40, 16, -44); c.quadraticCurveTo(24, -40, 23, -14); c.closePath(); }).fill('#e2dccd');
    g.circle(16, -48, 6).fill('#e2dccd'); g.ell(16, -57, 6, 1.8).stroke('#d9a740', 1.4);
    g.path(c => { c.moveTo(20, -34); c.quadraticCurveTo(26, -38, 28, -32); c.quadraticCurveTo(24, -30, 20, -34); c.closePath(); }).fill('#e2dccd');
  };
  PROPS.scrolls = (g, p) => {
    // A heap of prayers nobody read.
    for (let i = 0; i < 9; i++) { const x = 4 + (i % 4) * 7, y = -4 - Math.floor(i / 4) * 5; g.rect(x, y - 3, 8, 4, 2).fill(['#fff4d6', '#ffe0ea', '#e0f0ff'][i % 3], 0.7); }
  };

  // ---------- Incidents with no generated art (120 x 120 SVG) ----------
  const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  SD.art.addFoe('c1door', { col: '#ffcf33', anim: 'shake', svg: `
    <g ${S}><path d="M18 70 H102 V104 H18Z" fill="#b5824d"/><path d="M14 52 Q60 30 106 52 V70 H14Z" fill="#9a6a3a"/>
    <path d="M18 86 H102" fill="none" stroke-width="2"/><rect x="48" y="62" width="24" height="24" rx="4" fill="#ffcf33"/>
    <path d="M52 62 V54 Q60 42 68 54 V62" fill="none"/><circle cx="60" cy="72" r="3" fill="${INK}"/><path d="M60 74 V80" stroke-width="3"/>
    <circle cx="32" cy="60" r="5" fill="#fff"/><circle cx="88" cy="60" r="5" fill="#fff"/><circle cx="33" cy="61" r="2" fill="${INK}"/><circle cx="87" cy="61" r="2" fill="${INK}"/>
    <path d="M24 52 L38 56 M96 52 L82 56"/></g>
    <g transform="rotate(-12 60 24)"><rect x="18" y="12" width="84" height="22" rx="4" fill="#fff" stroke="#d63a3a" stroke-width="3"/>
    <text x="60" y="28" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="13" fill="#d63a3a">AccessDenied</text></g>` });
  SD.art.addFoe('c1faithful', { col: '#9fb2cf', anim: 'float', svg: `
    <g ${S}><path d="M10 112 Q14 70 30 62 Q46 70 50 112Z" fill="#c2a8d6"/><circle cx="30" cy="54" r="12" fill="#c2a8d6"/><circle cx="30" cy="57" r="7" fill="#a8724f"/>
    <path d="M70 112 Q74 70 90 62 Q106 70 110 112Z" fill="#9fb2cf"/><circle cx="90" cy="54" r="12" fill="#9fb2cf"/><circle cx="90" cy="57" r="7" fill="#e5c09d"/>
    <path d="M34 114 Q38 50 60 40 Q82 50 86 114Z" fill="#5a7ea6"/><circle cx="60" cy="34" r="15" fill="#5a7ea6"/><circle cx="60" cy="37" r="10" fill="#e9c6a6"/>
    <path d="M50 26 Q60 16 70 26" fill="#dcd7e6"/><path d="M86 30 V112" stroke="#7a5232" stroke-width="4"/><circle cx="86" cy="26" r="7" fill="#ffd76a"/></g>
    <circle cx="56" cy="37" r="1.6" fill="${INK}"/><circle cx="64" cy="37" r="1.6" fill="${INK}"/><path d="M55 43 Q60 41 65 43" fill="none" stroke="${INK}" stroke-width="2"/>
    <circle cx="60" cy="80" r="9" fill="none" stroke="#ffcf33" stroke-width="3"/>` });
  SD.art.addFoe('c1mask', { col: '#e0d4ff', anim: 'float', svg: `
    <g ${S}><path d="M22 28 Q60 8 98 28 Q104 76 60 104 Q16 76 22 28Z" fill="#fff"/>
    <path d="M22 28 Q60 8 98 28" fill="none" stroke="#ffcf33" stroke-width="5"/>
    <path d="M34 50 Q44 40 54 50 Q44 58 34 50Z" fill="${INK}"/><path d="M66 50 Q76 40 86 50 Q76 58 66 50Z" fill="${INK}"/>
    <path d="M44 78 Q60 88 76 78" fill="none"/><path d="M98 34 Q114 50 108 74" fill="none" stroke="#8b6cff" stroke-width="4"/><path d="M22 34 Q6 50 12 74" fill="none" stroke="#8b6cff" stroke-width="4"/></g>
    <circle cx="44" cy="50" r="2.5" fill="#ff5a8a"/><circle cx="76" cy="50" r="2.5" fill="#ff5a8a"/>
    <rect x="30" y="98" width="60" height="16" rx="4" fill="#fff8e0" stroke="${INK}" stroke-width="2"/><text x="60" y="110" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="${INK}">role/acolyte</text>` });
  SD.art.addFoe('c1warden', { col: '#ffd76a', anim: 'float', svg: `
    <g ${S}><path d="M30 14 H90 M30 106 H90" stroke-width="6"/><path d="M34 16 Q34 50 60 60 Q34 70 34 104 H86 Q86 70 60 60 Q86 50 86 16Z" fill="#fff8e0"/>
    <path d="M42 26 Q48 46 60 52 Q72 46 78 26Z" fill="#ffcf33" stroke-width="2"/><path d="M42 100 Q50 80 60 74 Q70 80 78 100Z" fill="#ffcf33" stroke-width="2"/>
    <circle cx="60" cy="60" r="16" fill="#fff"/><path d="M60 60 V50 M60 60 L68 64"/>
    <circle cx="50" cy="32" r="3" fill="${INK}"/><circle cx="70" cy="32" r="3" fill="${INK}"/><path d="M50 40 Q60 36 70 40" fill="none" stroke-width="2.5"/>
    <path d="M90 70 L106 62 M106 62 L104 74" fill="none" stroke="#d9a740" stroke-width="3"/><circle cx="104" cy="58" r="5" fill="none" stroke="#d9a740"/></g>` });
  SD.art.addFoe('c1sentinel', { col: '#b9c4d6', anim: 'float', svg: `
    <g ${S}><path d="M38 112 L42 70 H78 L82 112Z" fill="#9aa6bd"/><path d="M36 70 Q36 30 60 26 Q84 30 84 70Z" fill="#c7d0e0"/>
    <path d="M44 46 H76 V54 H44Z" fill="${INK}"/><path d="M60 26 V16" stroke-width="4"/><path d="M60 14 Q72 8 76 20" fill="none" stroke="#d63a3a" stroke-width="5"/>
    <path d="M6 52 Q6 92 30 104 Q42 92 42 52 Q24 46 6 52Z" fill="#3b8bff"/><text x="24" y="82" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="12" fill="#fff" stroke="none">MFA</text>
    <path d="M78 52 Q78 92 102 104 Q114 92 114 52 Q96 46 78 52Z" fill="#2fbf7f"/><rect x="88" y="70" width="16" height="13" rx="2" fill="#ffcf33"/><path d="M91 70 V65 Q96 58 101 65 V70" fill="none"/></g>
    <ellipse cx="52" cy="50" rx="4" ry="2" fill="#ff5a5a"/><ellipse cx="68" cy="50" rx="4" ry="2" fill="#ff5a5a"/>` });
})();
