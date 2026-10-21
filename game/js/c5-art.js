// Chapter 5's pictures, all drawn in code: the Machine Floors' overworld (js/c5-world.js) in chapter 1's overworld kit
// (32 units to a tile, people and props standing on the bottom edge of their footprint): the Arcanum's city on floor 61
// with its spires, lecture bells and wanted posters, the Crown's old station, the Astronomy Tower, the Workshops, the
// undercroft and its janitor's closet, and the Free Cloud's camp at the tower's foot; the new faces walking and in the
// visual novel (js/vec-cast.js's kit); the chapter's stills; the enemies of the three expeditions (120 x 120 SVG, as
// js/ch1-mines-art.js); and, while a chapter 5 raid plays, vector stand-ins for the raid engine's painted backdrop,
// fighters and map.
// Freya's template shows as a faint green grid line on whatever she rebuilds each night.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const A = SD.c5art = {};
  const ART = SD.c1art;
  const INK = '#2b2340';
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

  // ---------- Drawing helpers (unit coordinates, as in js/ch1-art.js) ----------
  function P(ctx) {
    const g = {
      ctx,
      fill(c, line) { ctx.fillStyle = c; ctx.fill(); if (line !== false) { ctx.strokeStyle = INK; ctx.lineWidth = line || 1.2; ctx.stroke(); } return g; },
      stroke(c, w) { ctx.strokeStyle = c || INK; ctx.lineWidth = w || 1.2; ctx.stroke(); return g; },
      poly(...pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); return g; },
      line(...pts) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); return g; },
      circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); return g; },
      ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); return g; },
      rect(x, y, w, h, r) { ctx.beginPath(); if (r && ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); return g; },
      text(s, x, y, size, col, weight) { ctx.fillStyle = col || INK; ctx.font = `${weight || 700} ${size}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(s, x, y); return g; }
    };
    return g;
  }
  function frame(ctx, x, y, ts, fn) {
    ctx.save(); ctx.translate(x, y); const u = ts / 32; ctx.scale(u, u);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    fn(P(ctx));
    ctx.restore();
  }
  // A faint green grid: Freya's template, laid over whatever it rebuilt tonight.
  const grid = (g, x, y, w, h, t, a) => {
    const al = a != null ? a : 0.22 + 0.1 * Math.sin(t * 2);
    for (let i = 0; i <= w; i += 6) g.line(x + i, y, x + i, y + h).stroke(`rgba(59,209,111,${al})`, 0.6);
    for (let j = 0; j <= h; j += 6) g.line(x, y + j, x + w, y + j).stroke(`rgba(59,209,111,${al})`, 0.6);
  };

  // ---------- People, walking ----------
  Object.assign(ART.LOOK, {
    iris: { skin: '#f2d8c6', hair: '#b9b0c8', hairD: '#8a8098', style: 'bob', coat: '#6a5a8a', coatD: '#4a3e66', under: '#e8e0f2', eye: '#5a6a8a', robe: true, scarf: '#c8a8e8', lantern: true, mouth: 'smile', brow: 'flat' },
    ashgrove: { skin: '#e8c8b0', hair: '#9a9aa2', hairD: '#6a6a72', style: 'short', coat: '#3a3a44', coatD: '#24242c', under: '#e8e4dc', legs: '#24242c', boots: '#16161c', eye: '#3a4048', mouth: 'flat', brow: 'knit', k: 1.06 },
    theo: { skin: '#c8946a', hair: '#4a3a30', hairD: '#2a2018', style: 'short', coat: '#5a6a5a', coatD: '#3a4a3a', under: '#d8cdb4', legs: '#3a3a30', boots: '#2a2018', eye: '#2a1a12', mouth: 'flat', brow: 'sad' },
    pella: { skin: '#8a5a3a', hair: '#1a1210', hairD: '#0a0606', style: 'braid', coat: '#3a4a7a', coatD: '#26325a', under: '#f2efe8', legs: '#26325a', boots: '#1a1420', eye: '#2a1a12', mouth: 'flat', brow: 'flat' },
    ayo: { skin: '#5a3a26', hair: '#1a1210', hairD: '#0a0606', style: 'shaved', coat: '#7a4a2a', coatD: '#5a3418', under: '#d8b48a', legs: '#3a2a1a', boots: '#1a120c', eye: '#2a1a12', apron: true, k: 1.18, mouth: 'smile', brow: 'flat' },
    kaito: { skin: '#f0d6c0', hair: '#1a1a2a', hairD: '#0a0a14', style: 'spiky', coat: '#c83a3a', coatD: '#8a2626', under: '#f2efe8', legs: '#2a2a3a', boots: '#16161e', eye: '#3a2a20', cape: '#c83a3a', mouth: 'smile', brow: 'flat' },
    cron: { skin: '#e2b496', hair: '#c8c2b8', hairD: '#9a948a', style: 'short', coat: '#6a7a4a', coatD: '#4a5a32', under: '#e8dcc4', legs: '#4a3b2a', boots: '#2e2218', eye: '#3b2a20', hat: '#a8843a', mouth: 'flat', brow: 'sad' },
    watch: { skin: '#e2b496', hair: '#3a2a20', hairD: '#1a120c', style: 'short', coat: '#2a3a6a', coatD: '#1a2448', under: '#c8a24a', legs: '#1a2448', boots: '#14141c', eye: '#2a1a12', mouth: 'flat', brow: 'knit' },
    student: { skin: '#f0d0b4', hair: '#6a4a2a', hairD: '#4a2c16', style: 'bob', coat: '#5a5a7a', coatD: '#3a3a5a', under: '#e8e4f4', eye: '#3a2a20', robe: true, lantern: true, pale: true, mouth: 'flat', brow: 'sad' },
    student2: { skin: '#a8724f', hair: '#2a1d16', hairD: '#160c06', style: 'short', coat: '#5a5a7a', coatD: '#3a3a5a', under: '#e8e4f4', legs: '#3a3a5a', boots: '#22222e', eye: '#2a1a12', lantern: true, pale: true, mouth: 'flat', brow: 'sad' },
    scholar: { skin: '#e8c4a8', hair: '#5a3a2a', hairD: '#3a2418', style: 'short', coat: '#7a4a6a', coatD: '#5a3050', under: '#f2efe8', legs: '#3a2a3a', boots: '#22161e', eye: '#3a2a20', robe: true, mouth: 'flat', brow: 'flat' }
  });
  const basePerson = SD.c2art ? SD.c2art.person : ART.person;
  A.person = function (ctx, id, fx, fy, ts, t, face, moving, o) {
    const L = ART.LOOK[id];
    // Kaito's cape, behind him.
    if (L && L.cape && face !== 'south') frame(ctx, fx, fy, ts, g => { const s = Math.sin(t * 3) * 1.2; g.poly(-7, -26, 7, -26, 9 + s, -4, -9 + s, -4).fill(L.cape, 0.8); });
    basePerson(ctx, id, fx, fy, ts, t, face, moving, o);
    if (!L) return;
    const side = face === 'west' ? -1 : 1;
    // A lit lantern, held out at the side: a grant.
    if (L.lantern && !(o && o.dark)) frame(ctx, fx, fy, ts, g => {
      const x = 9 * side, y = -14 + Math.sin(t * 2 + fx) * 0.6;
      g.line(x, y - 6, x, y - 2).stroke('#6a5a3a', 0.8);
      g.ctx.globalAlpha = 0.3 + 0.12 * Math.sin(t * 5 + fx); g.circle(x, y + 2, 7).fill('#ffd27a', false); g.ctx.globalAlpha = 1;
      g.rect(x - 2.5, y - 2, 5, 7, 1.5).fill('#ffe08a', 0.7);
    });
    if (L.scarf && face !== 'north') frame(ctx, fx, fy, ts, g => { g.rect(-6, -27, 12, 3, 1.5).fill(L.scarf, 0.6); g.line(3 * side, -25, 5 * side, -17).stroke(L.scarf, 2); });
    if (L.hat) frame(ctx, fx, fy, ts, g => { g.ell(0, -44, 13, 3).fill(L.hat, 0.8); g.rect(-7, -52, 14, 8, 3).fill(L.hat, 0.8); });
    // The drained scholarship students: a little greyer than everyone else.
    if (L.pale) frame(ctx, fx, fy, ts, g => { g.ell(0, -22, 9, 22).fill('rgba(200,206,230,.12)', false); });
    // Everyone Freya rebuilt tonight carries a little of her grid.
    if (o && o.grid) frame(ctx, fx, fy, ts, g => grid(g, -8, -40, 16, 36, t, 0.12));
  };

  // ---------- The ground ----------
  const COB = ['#8e93a8', '#959ab0', '#878ca2', '#9aa0b4'], FLAG = ['#4a4656', '#504c5c', '#45414f', '#554f60'], GRASS = ['#6f9a62', '#69945c', '#76a068', '#638e57'];
  const IRON = ['#6a5e58', '#706460', '#645852', '#76695f'];
  A.ground = function (ctx, ch, x, y, ts, t, nb, zone) {
    const X = x * ts, Y = y * ts, h = hash(x, y), u = ts / 32;
    const fill = c => { ctx.fillStyle = c; ctx.fillRect(X, Y, ts + 1, ts + 1); };
    if (ch === 'V') {
      fill('#100e1c');
      if (h % 5 === 0) { ctx.fillStyle = `rgba(220,226,255,${0.3 + 0.3 * Math.sin(t * 1.4 + h)})`; ctx.fillRect(X + (h % 29) / 29 * ts, Y + ((h >> 5) % 31) / 31 * ts, u * 1.3, u * 1.3); }
      return;
    }
    if (ch === 'g' || ch === 'f') {
      fill(GRASS[h % 4]);
      if (h % 6 === 0) { ctx.strokeStyle = '#4f7a44'; ctx.lineWidth = u * 1.2; const tx = X + (h % 23) / 23 * ts * 0.7 + ts * 0.15, ty = Y + (h % 17) / 17 * ts * 0.6 + ts * 0.3; ctx.beginPath(); ctx.moveTo(tx - 3, ty); ctx.lineTo(tx - 1, ty - 5); ctx.moveTo(tx, ty); ctx.lineTo(tx + 1, ty - 6); ctx.stroke(); }
      if (ch === 'f') for (let i = 0; i < 3; i++) { const hx = hash(x * 3 + i, y * 5 - i); ctx.fillStyle = ['#c8a8e8', '#f4e0a0', '#ffffff'][hx % 3]; ctx.beginPath(); ctx.arc(X + (hx % 29) / 29 * ts, Y + (hx % 31) / 31 * ts, u * 1.8, 0, 7); ctx.fill(); }
      return;
    }
    if (ch === 'i') {
      fill(IRON[h % 4]);
      ctx.strokeStyle = 'rgba(20,14,12,.35)'; ctx.lineWidth = u; ctx.strokeRect(X + 0.5, Y + 0.5, ts - 1, ts - 1);
      ctx.fillStyle = 'rgba(20,14,12,.4)'; [[0.15, 0.15], [0.85, 0.15], [0.15, 0.85], [0.85, 0.85]].forEach(([a, b]) => { ctx.beginPath(); ctx.arc(X + a * ts, Y + b * ts, u * 1.2, 0, 7); ctx.fill(); });
      if (h % 7 === 0) { ctx.fillStyle = `rgba(255,140,60,${0.12 + 0.08 * Math.sin(t * 3 + h)})`; ctx.fillRect(X, Y, ts, ts); }
      return;
    }
    if (ch === 'p') {
      fill(FLAG[h % 4]);
      ctx.strokeStyle = 'rgba(10,8,16,.35)'; ctx.lineWidth = u;
      const o = (y % 2) * ts / 2;
      ctx.strokeRect(X - o + 0.5, Y + 0.5, ts, ts / 2); ctx.strokeRect(X - o + ts + 0.5, Y + 0.5, ts, ts / 2); ctx.strokeRect(X + o / 2 + 0.5, Y + ts / 2 + 0.5, ts, ts / 2);
      if (h % 9 === 0) { ctx.fillStyle = 'rgba(120,160,200,.18)'; ctx.beginPath(); ctx.ellipse(X + ts * 0.5, Y + ts * 0.6, 5 * u, 2 * u, 0, 0, 7); ctx.fill(); }
      return;
    }
    // City cobbles; a lighter flagstone path over them.
    fill(COB[h % 4]);
    ctx.strokeStyle = 'rgba(43,35,64,.14)'; ctx.lineWidth = 1;
    const o = (y % 2) * ts / 4;
    for (let i = -1; i < 3; i++) ctx.strokeRect(X + o + i * ts / 2 + 0.5, Y + 0.5, ts / 2, ts / 2);
    for (let i = -1; i < 3; i++) ctx.strokeRect(X - o + i * ts / 2 + ts / 4 + 0.5, Y + ts / 2 + 0.5, ts / 2, ts / 2);
    if (ch === ',') {
      ctx.fillStyle = '#c8c2b4';
      const r = ts * 0.44, isP = c => c === ',' || /[A-Z0-9]/.test(c) && c !== 'T' && c !== 'V';
      ctx.beginPath(); ctx.arc(X + ts / 2, Y + ts / 2, r, 0, 7); ctx.fill();
      if (isP(nb(1, 0))) ctx.fillRect(X + ts / 2, Y + ts / 2 - r, ts / 2 + 1, r * 2);
      if (isP(nb(-1, 0))) ctx.fillRect(X, Y + ts / 2 - r, ts / 2, r * 2);
      if (isP(nb(0, 1))) ctx.fillRect(X + ts / 2 - r, Y + ts / 2, r * 2, ts / 2 + 1);
      if (isP(nb(0, -1))) ctx.fillRect(X + ts / 2 - r, Y, r * 2, ts / 2);
    }
  };
  // What a 'T' tile is depends on where it is: the city's stone walls with a spire now and then, the workshops' brick
  // and pipes, the undercroft's dark stone, the camp's trees, and plain tower rock between them.
  A.wall = function (ctx, x, y, ts, t, zone) {
    const X = x * ts, Y = y * ts, h = hash(x, y);
    if (zone === 'city') return frame(ctx, X, Y + ts, ts, g => {
      g.rect(0, -44, 32, 44).fill('#6a6a86', false); g.rect(0, -48, 32, 6).fill('#4a4a66', false);
      g.line(0, -30, 32, -30).stroke('rgba(20,18,30,.3)', 1); g.line(16, -44, 16, -30).stroke('rgba(20,18,30,.3)', 1); g.line(8, -30, 8, 0).stroke('rgba(20,18,30,.3)', 1); g.line(24, -30, 24, 0).stroke('rgba(20,18,30,.3)', 1);
      if (h % 5 === 0) { g.poly(8, -48, 16, -78, 24, -48).fill('#5a4a8a'); g.circle(16, -80, 2).fill('#ffd24a', false); }
      else if (h % 7 === 1) { g.rect(11, -40, 10, 14, 4).fill('#ffd27a', 0.8); g.ctx.globalAlpha = 0.2; g.circle(16, -33, 12).fill('#ffd27a', false); g.ctx.globalAlpha = 1; }
    });
    if (zone === 'shops') return frame(ctx, X, Y + ts, ts, g => {
      g.rect(0, -42, 32, 42).fill('#8a4a3a', false);
      for (let r = 0; r < 6; r++) for (let c = 0; c < 3; c++) g.rect(c * 11 + (r % 2) * 5 - 3, -42 + r * 7, 10, 6).stroke('rgba(40,16,10,.35)', 0.8);
      if (h % 3 === 0) { g.rect(4, -36, 24, 4, 2).fill('#9a8a6a'); g.circle(22, -34, 3).fill('#c8a24a'); }
      if (h % 4 === 1) { g.ctx.globalAlpha = 0.25 + 0.15 * Math.sin(t * 2 + h); g.ell(16, -50 - (t * 6 + h) % 14, 6, 4).fill('#b8b4c4', false); g.ctx.globalAlpha = 1; }
    });
    if (zone === 'under') return frame(ctx, X, Y + ts, ts, g => {
      g.rect(0, -40, 32, 40).fill('#2e2a3a', false); g.rect(0, -44, 32, 6).fill('#22202c', false);
      g.line(0, -24, 32, -24).stroke('rgba(0,0,0,.35)', 1); g.line(12, -40, 12, -24).stroke('rgba(0,0,0,.35)', 1); g.line(22, -24, 22, 0).stroke('rgba(0,0,0,.35)', 1);
      if (h % 6 === 0) { g.rect(13, -34, 6, 8, 2).fill('#ffb45a', 0.6); g.ctx.globalAlpha = 0.18 + 0.08 * Math.sin(t * 7 + h); g.circle(16, -30, 10).fill('#ffb45a', false); g.ctx.globalAlpha = 1; }
    });
    if (zone === 'camp') return ART.prop(ctx, { kind: 'tree', x, y, w: 1, h: 1 }, ts, t);
    frame(ctx, X, Y + ts, ts, g => {
      g.rect(0, -30, 32, 30).fill(h % 2 ? '#3a3648' : '#34303f', false);
      g.poly(2, -30, 10 + h % 6, -40 - h % 8, 22, -34, 30, -30).fill('#4a4458', false);
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
  const spire = (g, x, y, w, h, col) => { g.poly(x - w / 2, y, x, y - h, x + w / 2, y).fill(col || '#5a4a8a'); g.circle(x, y - h - 2, 2.4).fill('#ffd24a', 0.8); };
  const sign = (g, x, y, s, size) => { const w = Math.max(30, s.length * (size || 6) * 0.62 + 10); g.rect(x - w / 2, y - 9, w, 11, 2).fill('#f6efd8', 0.8); g.text(s, x, y - 1, size || 6, '#3a2a5a'); };
  const windows = (g, W, H, col, t) => { for (let x = 10; x < W - 10; x += 14) { g.rect(x, -H * 0.62, 8, H * 0.24, 4).fill(col, 0.8); } };
  // The Arcanum: a great hall of lecture rooms, spires on every corner.
  PR.arcanum = (g, p, t) => {
    const W = p.w * 32, H = p.h * 32;
    g.ell(W / 2, -1, W * 0.5, 4).fill('rgba(43,35,64,.25)', false);
    g.rect(6, -H * 0.8, W - 12, H * 0.8).fill('#7a7896');
    g.rect(2, -H * 0.84, W - 4, 8).fill('#4a4866');
    windows(g, W, H, '#ffd27a', t);
    g.rect(W / 2 - 16, -H * 0.46, 32, H * 0.46, 14).fill('#3a2a4a');
    spire(g, 12, -H * 0.84, 16, 50); spire(g, W - 12, -H * 0.84, 16, 50); spire(g, W / 2, -H * 0.84, 24, 70, '#6a5a9a');
    sign(g, W / 2, -H * 0.5 - 4, 'THE ARCANUM', 6.5);
    if (!p.free) grid(g, 8, -H * 0.78, W - 16, H * 0.3, t);
  };
  // The Crown's old station: a squat watch-house with a blue lamp. His badge hangs inside on a nail.
  PR.station = (g, p, t) => {
    const W = p.w * 32, H = p.h * 32;
    g.ell(W / 2, -1, W * 0.48, 4).fill('rgba(43,35,64,.22)', false);
    g.rect(4, -H * 0.66, W - 8, H * 0.66).fill('#5a6080');
    g.poly(0, -H * 0.66, W / 2, -H * 0.98, W, -H * 0.66).fill('#2a3050');
    g.rect(W / 2 - 8, -H * 0.4, 16, H * 0.4, 2).fill('#2a2436');
    g.rect(12, -H * 0.54, 14, 12, 2).fill('#ffd27a', 0.8); g.rect(W - 26, -H * 0.54, 14, 12, 2).fill('#ffd27a', 0.8);
    g.rect(W / 2 - 3, -H * 0.86, 6, 8, 2).fill('#5a8ad8', 0.8);
    g.ctx.globalAlpha = 0.25 + 0.12 * Math.sin(t * 3); g.circle(W / 2, -H * 0.82, 10).fill('#5a8ad8', false); g.ctx.globalAlpha = 1;
    sign(g, W / 2, -H * 0.66 - 2, 'CROWN STATION', 5.5);
  };
  // The Astronomy Tower: tall, round, a domed observatory on top, and a rail round the dome.
  PR.tower = (g, p, t) => {
    const W = p.w * 32, H = p.h * 32;
    g.ell(W / 2, -1, W * 0.5, 4).fill('rgba(43,35,64,.3)', false);
    g.rect(10, -H * 0.86, W - 20, H * 0.86).fill('#6e6a8a');
    for (let y = 18; y < H * 0.8; y += 22) g.rect(W / 2 - 4, -y - 10, 8, 10, 4).fill('#ffd27a', 0.6);
    g.rect(4, -H * 0.9, W - 8, 8).fill('#4a4866');
    g.ctx.beginPath(); g.ctx.arc(W / 2, -H * 0.9, W / 2 - 10, Math.PI, 0); g.ctx.closePath(); g.fill('#3a3a66');
    g.line(W / 2 - 4, -H * 0.9 - 26, W / 2 + 18, -H * 0.9 - 44).stroke('#c8a24a', 3);
    for (let x = 6; x <= W - 6; x += 6) g.line(x, -H * 0.9, x, -H * 0.9 - 6).stroke('#8a84a4', 1);
    g.line(4, -H * 0.9 - 6, W - 4, -H * 0.9 - 6).stroke('#8a84a4', 1.4);
    g.rect(W / 2 - 14, -40, 28, 40, 12).fill(p.open ? '#120f1c' : '#2a2436');
    if (p.label) sign(g, W / 2, -46, p.label, 6);
    if (!p.free) grid(g, 12, -H * 0.84, W - 24, H * 0.5, t);
  };
  // A wanted poster: Dutch's face, badly drawn, and a reward.
  PR.poster = (g, p, t) => {
    g.rect(14, -40, 3, 40).fill('#6a4a2a');
    g.rect(4, -44, 24, 26, 1).fill('#f2e6c8', 0.8);
    g.text('WANTED', 16, -38, 5, '#8a2a2a');
    g.circle(16, -29, 5).fill('#e2b496', 0.6); g.line(12, -33, 20, -33).stroke('#8e9399', 2); g.line(13, -27, 19, -27).stroke(INK, 0.8);
    g.line(8, -21, 24, -21).stroke('#8a2a2a', 0.8);
  };
  // The lecture bell tower.
  PR.bell = (g, p, t) => {
    const W = p.w * 32, H = p.h * 32, sw = Math.sin(t * 1.4) * 2;
    g.rect(8, -H * 0.8, W - 16, H * 0.8).fill('#7a7896');
    g.rect(14, -H * 0.76, W - 28, H * 0.28).fill('#2a2436');
    g.ctx.save(); g.ctx.translate(W / 2, -H * 0.72); g.ctx.rotate(sw * 0.04);
    g.poly(-8, 0, -6, 14, 6, 14, 8, 0).fill('#c8a24a'); g.circle(0, 15, 2).fill(INK, false); g.ctx.restore();
    spire(g, W / 2, -H * 0.8, W - 10, 30);
  };
  PR.lift = (g, p, t) => {
    g.rect(2, -54, 28, 54).fill('#5a5468'); g.rect(6, -48, 20, 48).fill(p.open === false ? '#3a3448' : '#1a1628');
    g.line(16, -54, 16, -80).stroke('#8a8494', 2); g.rect(9, -8 - (Math.sin(t) + 1) * 4, 14, 6).fill('#c8a24a', 0.8);
    g.text('LIFT', 16, -57, 6, '#f6efd8');
  };
  // A knowledge gate: an arch with its rule on a brass plaque, and a gear lock. Open when you've understood it.
  PR.kgate = (g, p, t) => {
    const W = p.w * 32, open = p.open, col = p.col || '#5a4a8a';
    g.rect(0, -44, 6, 44).fill('#7a7896'); g.rect(W - 6, -44, 6, 44).fill('#7a7896');
    g.rect(-3, -50, W + 6, 8, 2).fill(col);
    sign(g, W / 2, -52, p.label || 'RULE', 6);
    if (!open) {
      g.rect(6, -40, W - 12, 40).fill('rgba(59,209,111,.14)', false);
      grid(g, 6, -40, W - 12, 40, t, 0.35);
      g.ctx.save(); g.ctx.translate(W / 2, -20); g.ctx.rotate(t * 0.6);
      for (let i = 0; i < 8; i++) { g.ctx.rotate(Math.PI / 4); g.rect(-1.5, -9, 3, 4).fill('#c8a24a', false); }
      g.circle(0, 0, 6).fill('#c8a24a', 0.8); g.circle(0, 0, 2).fill(INK, false); g.ctx.restore();
    } else g.line(6, -2, W - 6, -2).stroke('rgba(127,224,160,.6)', 2);
  };
  // A raid entrance: an iron door with a lamp either side.
  PR.raidgate = (g, p, t) => {
    const W = p.w * 32;
    g.rect(2, -58, W - 4, 58).fill('#4a4458'); g.rect(10, -46, W - 20, 46, 10).fill(p.open ? '#120f1c' : '#2a2436');
    g.rect(-2, -62, W + 4, 8, 2).fill('#3a3448');
    [6, W - 6].forEach(x => { g.rect(x - 3, -30, 6, 10, 2).fill('#ffcf7a', 0.8); g.ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 5 + x); g.circle(x, -25, 9).fill('#ffcf7a', false); g.ctx.globalAlpha = 1; });
    if (p.label) sign(g, W / 2, -64, p.label, 6);
  };
  // The Forge: a long workshop with a chimney and a furnace glow at the door.
  PR.forge = (g, p, t) => {
    const W = p.w * 32, H = p.h * 32;
    g.ell(W / 2, -1, W * 0.5, 4).fill('rgba(43,35,64,.25)', false);
    g.rect(4, -H * 0.66, W - 8, H * 0.66).fill('#8a4a3a');
    g.poly(0, -H * 0.66, W / 2, -H * 0.9, W, -H * 0.66).fill('#4a2a22');
    g.rect(W - 24, -H * 1.1, 12, H * 0.4).fill('#5a3a2a');
    for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; g.ctx.globalAlpha = 0.4 * (1 - k); g.circle(W - 18 + k * 10, -H * 1.1 - k * 30, 5 + k * 8).fill('#b8b4c4', false); } g.ctx.globalAlpha = 1;
    g.rect(W / 2 - 14, -H * 0.42, 28, H * 0.42, 4).fill('#2a1410');
    g.ctx.globalAlpha = 0.45 + 0.2 * Math.sin(t * 6); g.rect(W / 2 - 12, -H * 0.38, 24, H * 0.36, 4).fill('#ff8a3a', false); g.ctx.globalAlpha = 1;
    sign(g, W / 2, -H * 0.66 - 4, 'THE WORKSHOPS', 6);
    if (!p.free) grid(g, 6, -H * 0.64, W - 12, H * 0.2, t);
  };
  PR.anvil = (g, p, t) => { g.ell(16, -1, 10, 3).fill('rgba(43,35,64,.25)', false); g.rect(11, -10, 10, 10).fill('#3a3a44'); g.poly(4, -16, 28, -16, 26, -10, 6, -10).fill('#4a4a56'); g.poly(28, -16, 32, -14, 28, -12).fill('#4a4a56'); if (p.lit) { g.ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 8); g.circle(16, -18, 4).fill('#ff8a3a', false); g.ctx.globalAlpha = 1; } };
  // The lower stair of the closet, going down; the template's chain across it until Ayo cuts it.
  PR.stairdown = (g, p, t) => {
    const W = p.w * 32;
    g.rect(0, -30, W, 30).fill('#22202c');
    for (let i = 0; i < 5; i++) g.rect(4 + i * 3, -26 + i * 5, W - 8 - i * 6, 5).fill(i % 2 ? '#3a3648' : '#34303f', 0.6);
    if (p.chained) {
      for (let x = 2; x < W - 2; x += 7) g.ell(x + 3.5, -18 + Math.sin(x) * 1.5, 4, 2.4).stroke('#9aa0b0', 2);
      g.rect(W / 2 - 5, -22, 10, 10, 2).fill('#3bd16f', 0.8); g.circle(W / 2, -17, 1.5).fill(INK, false);
    }
    if (p.label) sign(g, W / 2, -34, p.label, 6);
  };
  PR.shelf = (g, p, t) => {
    const W = p.w * 32, H = p.h * 32;
    g.rect(2, -H + 4, W - 4, H - 4).fill('#4a3424');
    for (let y = -H + 10; y < -2; y += 12) { g.line(4, y + 10, W - 4, y + 10).stroke('#2a1a10', 2); for (let x = 6; x < W - 6; x += 5) g.rect(x, y, 4, 9).fill(['#8a2a34', '#2c3a5a', '#c8a24a', '#5a7a5a'][hash(x, y + p.x) % 4], 0.5); }
    if (!p.free) grid(g, 2, -H + 4, W - 4, H - 4, t, 0.18);
  };
  PR.mop = (g) => { g.rect(10, -10, 12, 10, 2).fill('#5a7aa8'); g.line(18, -10, 22, -34).stroke('#a8843a', 2); g.ell(15, -12, 6, 3).fill('#d8d4c8', 0.6); };
  PR.desk = (g) => { g.rect(2, -16, 28, 6, 2).fill('#6a4a2a'); g.rect(4, -10, 3, 10).fill('#5a3a1a'); g.rect(25, -10, 3, 10).fill('#5a3a1a'); g.rect(18, -22, 6, 6).fill('#ffcf7a', 0.6); };
  // Pella's carrel: a desk under two hundred years of records.
  PR.carrel = (g, p) => { g.rect(2, -40, 28, 24).fill('#4a3424'); for (let i = 0; i < 5; i++) g.rect(5 + i * 5, -38, 4, 18).fill(['#e8dcc0', '#d8cca8', '#f2e6c8'][i % 3], 0.5); g.rect(0, -16, 32, 6, 2).fill('#6a4a2a'); g.rect(3, -10, 3, 10).fill('#5a3a1a'); g.rect(26, -10, 3, 10).fill('#5a3a1a'); };
  // Cron's clock, on a post: stopped at 23:59 once he's done.
  PR.clock = (g, p, t) => {
    g.rect(14, -30, 4, 30).fill('#6a4a2a'); g.circle(16, -40, 11).fill('#f6efd8');
    const m = p.stopped ? 59 / 60 : (t / 20) % 1, hr = p.stopped ? 23.98 / 12 : (t / 240) % 1;
    g.line(16, -40, 16 + Math.sin(m * Math.PI * 2) * 8, -40 - Math.cos(m * Math.PI * 2) * 8).stroke(INK, 1.2);
    g.line(16, -40, 16 + Math.sin(hr * Math.PI * 2) * 5, -40 - Math.cos(hr * Math.PI * 2) * 5).stroke(INK, 1.8);
  };
  // Kaito's machines: a stack of servers, some smoking.
  PR.machines = (g, p, t) => {
    const W = p.w * 32;
    for (let i = 0; i < 4; i++) { g.rect(4, -12 - i * 10, W - 8, 9, 2).fill('#3a3a4a'); g.circle(10, -8 - i * 10, 1.5).fill(i % 2 ? '#7fe0a0' : '#ff9a5a', false); }
    if (!p.calm) { g.ctx.globalAlpha = 0.35; g.circle(W - 12, -52 - (t * 8) % 10, 6).fill('#9a9aa8', false); g.ctx.globalAlpha = 1; }
  };
  PR.bench = (g) => { g.rect(2, -10, 28, 6, 2).fill('#6a5a7a'); g.rect(4, -4, 3, 4).fill('#4a3a5a'); g.rect(25, -4, 3, 4).fill('#4a3a5a'); };
  PR.steps = (g) => { g.rect(0, -12, 32, 4).fill('#8a88a0', 0.6); g.rect(0, -8, 32, 4).fill('#9a98b0', 0.6); g.rect(0, -4, 32, 4).fill('#aaa8c0', 0.6); };
  // A page of Lina's diary: the chapter's collectible, a scrap with cipher taps on it.
  PR.page = (g, p, t) => {
    const b = Math.sin(t * 3 + p.x) * 1.5;
    g.ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 4 + p.y); g.circle(16, -12 + b, 10).fill('#c8b0ff', false); g.ctx.globalAlpha = 1;
    g.poly(9, -6 + b, 23, -8 + b, 22, -22 + b, 8, -20 + b).fill('#f6efd8', 0.8);
    for (let i = 0; i < 3; i++) g.line(11, -17 + i * 3.5 + b, 19, -18 + i * 3.5 + b).stroke('#7a6a9a', 0.8);
  };
  // The forge Ayo sets up at camp.
  PR.campforge = (g, p, t) => {
    g.rect(2, -24, 28, 24, 3).fill('#5a3a2a'); g.rect(8, -18, 16, 10, 3).fill('#2a1410');
    g.ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 7); g.rect(9, -17, 14, 8, 3).fill('#ff8a3a', false); g.ctx.globalAlpha = 1;
    g.rect(12, -40, 8, 16).fill('#4a2a1a');
  };

  // ---------- The grade ----------
  const PHASE = { dawn: { mul: 'rgba(230,196,210,.9)', warm: 'rgba(60,24,40,.08)', vig: 0.5 }, day: { mul: 'rgba(246,244,255,1)', warm: null, vig: 0.3 },
    dusk: { mul: 'rgba(196,170,200,.9)', warm: 'rgba(60,30,40,.08)', vig: 0.55 }, night: { mul: 'rgba(84,92,150,.95)', warm: null, vig: 0.7 } };
  A.grade = function (ctx, t, vw, vh, cx, cy, ts, phase, lights) {
    const ph = PHASE[phase] || PHASE.day;
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = ph.mul; ctx.fillRect(0, 0, vw, vh);
    ctx.globalCompositeOperation = 'lighter';
    if (ph.warm) { ctx.fillStyle = ph.warm; ctx.fillRect(0, 0, vw, vh); }
    (lights || []).forEach(([x, y, r, rgb, flick]) => {
      const X = x * ts - cx, Y = y * ts - cy, R = r * ts * (1 + (flick ? Math.sin(t * 9 + x) * 0.05 : 0));
      if (X < -R || X > vw + R || Y < -R || Y > vh + R) return;
      const gr = ctx.createRadialGradient(X, Y, 0, X, Y, R); gr.addColorStop(0, `rgba(${rgb},.45)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gr; ctx.fillRect(X - R, Y - R, R * 2, R * 2);
    });
    ctx.globalCompositeOperation = 'source-over';
    const vg = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.35, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    vg.addColorStop(0, 'rgba(10,8,18,0)'); vg.addColorStop(1, `rgba(8,6,14,${ph.vig})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, vw, vh);
  };

  // ---------- The new faces, in the visual novel ----------
  const { p, c } = K;
  const lanternV = () => p('M300 470 L300 520', null, '#6a5a3a', 4) + K.r(282, 520, 36, 50, '#ffe08a', INK, 3, null, 10) + c(300, 545, 46, '#ffd27a', null, null, 0.25);
  Object.assign(K.cast, {
    // Iris Vell: the most loved teacher in the Arcanum. Silver bob, violet robes, a lilac scarf, and a lantern.
    iris: { skin: '#f2d8c6', skinD: '#dcbcaa', hair: '#b9b0c8', hairD: '#8a8098', hairL: '#e2dcec', eye: '#5a6a8a', style: 'bob', coat: '#6a5a8a', coatD: '#4a3e66', under: '#e8e0f2', collar: 'v', robe: true, age: 1, blush: 0.25,
      over: () => p('M150 300 C170 330 230 330 250 300 L256 330 C230 360 170 360 144 330Z', '#c8a8e8', INK, 2.5) + p('M232 330 L250 420 L230 424 L220 344Z', '#c8a8e8', INK, 2.5) },
    // Lord Ashgrove: Caspian's father, grey and courteous and implacable, in the watch's dark coat.
    ashgrove: { skin: '#e8c8b0', skinD: '#d0ac94', skinD2: '#b8907a', hair: '#9a9aa2', hairD: '#6a6a72', hairL: '#c8c8d0', eye: '#3a4048', style: 'slick', age: 1, k: 1.08, coat: '#3a3a44', coatD: '#24242c', under: '#e8e4dc', collar: 'high',
      over: () => p('M186 340 L214 340 L210 372 L190 372Z', '#c8a24a', INK, 2) },
    // Theo Marsh: older now, a dock worker's coat, a folded map.
    theo: { skin: '#c8946a', skinD: '#a8784e', skinD2: '#8a603a', hair: '#4a3a30', hairD: '#2a2018', hairL: '#6a5a4a', eye: '#2a1a12', style: 'messy', beard: true, age: 1, coat: '#5a6a5a', coatD: '#3a4a3a', under: '#d8cdb4', collar: 'shirt' },
    // Pella Quinn: the scholarship students' rep, drained, ink on her fingers.
    pella: { skin: '#8a5a3a', skinD: '#6e4428', skinD2: '#56321c', hair: '#1a1210', hairD: '#0a0606', hairL: '#3a2a22', eye: '#2a1a12', style: 'braids', ribbon: '#3a4a7a', coat: '#3a4a7a', coatD: '#26325a', under: '#f2efe8', collar: 'shirt', blush: 0.2 },
    // Ayo, the blacksmith from the first game: huge, booming, an apron, a hammer.
    ayo: { skin: '#5a3a26', skinD: '#422818', skinD2: '#2e1a0e', hair: '#1a1210', hairD: '#0a0606', hairL: '#2a1e18', eye: '#2a1a12', style: 'none', beard: true, k: 1.2, coat: '#7a4a2a', coatD: '#5a3418', under: '#d8b48a', collar: 'v',
      over: () => p('M150 330 L250 330 L262 700 L138 700Z', '#5a3a26', INK, 3) + p('M290 380 L330 140', null, '#6a4a2a', 10) + K.r(300, 110, 60, 36, '#4a4a56', INK, 3, null, 4) },
    // Kaito: the rival hero with the Legendary Skill, Kubernetes. Spiky hair, a red cape.
    kaito: { skin: '#f0d6c0', skinD: '#d8b8a0', hair: '#1a1a2a', hairD: '#0a0a14', hairL: '#3a3a52', eye: '#3a2a20', style: 'messy', coat: '#c83a3a', coatD: '#8a2626', under: '#f2efe8', collar: 'high', blush: 0.2,
      over: () => p('M100 330 C80 500 70 700 60 900 L140 900 C130 700 130 500 140 340Z', '#c83a3a', INK, 3) + c(200, 330, 12, '#ffd24a', INK, 2.5) },
    // Farmer Cron: does everything at midnight because his father did. A straw hat and a pocket watch.
    cron: { skin: '#e2b496', skinD: '#c8957a', skinD2: '#a87660', hair: '#c8c2b8', hairD: '#9a948a', hairL: '#e8e4dc', eye: '#3b2a20', style: 'elder', age: 1, coat: '#6a7a4a', coatD: '#4a5a32', under: '#e8dcc4', collar: 'shirt',
      top: () => p('M110 150 L290 150 L270 134 C260 96 140 96 130 134Z', '#c8a24a', INK, 3) + p('M140 134 L260 134', null, '#8a6a2a', 6),
      over: () => c(232, 420, 14, '#e8d27a', INK, 2.5) + p('M232 410 L232 420 L240 424', null, INK, 2) },
    // The watch, and the scholarship students with Iris's lanterns.
    watch: { skin: '#e2b496', skinD: '#c8957a', hair: '#3a2a20', hairD: '#1a120c', hairL: '#5a4a3a', eye: '#2a1a12', style: 'short', coat: '#2a3a6a', coatD: '#1a2448', under: '#c8a24a', collar: 'high' },
    student: { skin: '#f0d0b4', skinD: '#d8b498', hair: '#6a4a2a', hairD: '#4a2c16', hairL: '#8a6a4a', eye: '#3a2a20', style: 'bob', coat: '#5a5a7a', coatD: '#3a3a5a', under: '#e8e4f4', collar: 'v', robe: true, over: lanternV }
  });
  const cast = (id, o) => { SD.cast[id] = SD.cast[id] || o; };
  cast('iris', { name: 'Iris Vell', title: 'The Arcanum' }); cast('ashgrove', { name: 'Lord Ashgrove', title: 'The watch' }); cast('theo', { name: 'Theo Marsh', title: 'Floor 76' });
  cast('pella', { name: 'Pella Quinn', title: 'Scholarship students' }); cast('ayo', { name: 'Ayo', title: 'Blacksmith' }); cast('kaito', { name: 'Kaito', title: 'Legendary Skill: Kubernetes' });
  cast('cron', { name: 'Farmer Cron', title: 'Midnight' }); cast('watch', { name: 'The watch', title: 'Floor 61' }); cast('student', { name: 'A scholarship student', title: 'The Arcanum' });
  cast('scholar', { name: 'A scholar', title: 'Floor 61' });
  [['iris', 760], ['ashgrove', 280], ['theo', 360], ['pella', 980], ['watch', 400], ['student', 1100], ['scholar', 640]].forEach(([w, hz]) => SD.ui.voice && SD.ui.voice(w, hz));
  const sprite = (id, faces) => ({ faces: Object.fromEntries(faces.map(f => [f, K.fig(id, f, 'bust')])) });
  SD.vn.addSprites({
    iris: sprite('iris', ['neutral', 'smile', 'warm', 'sad', 'cold', 'earnest', 'frozen']), ashgrove: sprite('ashgrove', ['neutral', 'cold', 'stone', 'sad', 'grief']),
    theo: sprite('theo', ['neutral', 'sad', 'earnest', 'tired']), pella: sprite('pella', ['neutral', 'smile', 'earnest', 'frustrated', 'happy']),
    ayo: sprite('ayo', ['neutral', 'happy', 'laugh', 'sad']), kaito: sprite('kaito', ['neutral', 'smug', 'shock', 'earnest', 'sad']),
    cron: sprite('cron', ['neutral', 'sad', 'tired', 'earnest', 'smile']), student: sprite('student', ['neutral', 'sad', 'earnest']), watch: sprite('watch', ['neutral', 'stone']),
    dutch: sprite('dutch', ['neutral', 'stone', 'grief', 'anger', 'tired', 'sad', 'warm', 'shock', 'frozen', 'earnest']),
    lina: sprite('lina', ['neutral', 'smile', 'earnest', 'happy']), seoyeon: sprite('seoyeon', ['neutral', 'frozen', 'grief', 'anger', 'sad', 'warm', 'cold', 'tired']),
    mira: sprite('mira', ['neutral', 'grief', 'cold', 'desperate', 'sad', 'anger', 'warm', 'tired', 'shock']), kai: sprite('kai', ['neutral', 'shock', 'grief', 'anger', 'smirk', 'sad', 'earnest']),
    seymour: sprite('seymour', ['neutral', 'sad'])
  });

  // ---------- Stills ----------
  const S = {};
  const sky = K.skyL, R = K.r, G = K.g;
  const spires = (y, col, seed, n) => { const rg = K.rng(seed); let s = ''; for (let i = 0; i < n; i++) { const x = 40 + i * (1120 / (n - 1)) + (rg() - 0.5) * 40, h = 160 + rg() * 260, w = 50 + rg() * 50; s += R(x - w / 2, y - h, w, h + 400, col, K.NIGHT, 3) + p(`M${x - w / 2 - 6} ${y - h} L${x} ${y - h - 90 - rg() * 60} L${x + w / 2 + 6} ${y - h}Z`, '#4a3a7a', K.NIGHT, 3) + (rg() > 0.4 ? R(x - 8, y - h + 40, 16, 26, '#ffd27a', K.NIGHT, 2, 0.85, 8) : ''); } return s; };
  const gridS = (x, y, w, h, a) => p(Array.from({ length: Math.ceil(w / 40) + 1 }, (_, i) => `M${x + i * 40} ${y} V${y + h}`).join(' ') + Array.from({ length: Math.ceil(h / 40) + 1 }, (_, j) => ` M${x} ${y + j * 40} H${x + w}`).join(''), null, '#3bd16f', 1.5, a || 0.18);
  const lanternS = (x, y, s, lit) => G(p('M0 -30 L0 0', null, '#6a5a3a', 4) + R(-18, 0, 36, 50, lit ? '#ffe08a' : '#4a4658', K.NIGHT, 3, null, 10), `translate(${x} ${y}) scale(${s || 1})`) + (lit ? c(x, y + 25 * (s || 1), 60 * (s || 1), '#ffd27a', null, null, 0.2) : '');
  // Cold open: a kitchen table at night, a lamp, a girl of eight very seriously learning a cipher.
  S['c5-kitchen'] = K.scene([sky('c5k', '#2a1e1a', '#140e0c'), R(0, 0, 1200, 1200, '#3a2a22'), R(0, 780, 1200, 420, '#2a1c14'),
    R(140, 160, 300, 260, '#1a1830', K.NIGHT, 4), K.stars(300, 260, 30, 51, 0.6).replace(/cx="(\d+)"/g, (m, x) => `cx="${+x + 140}"`).replace(/cy="(\d+)"/g, (m, y) => `cy="${+y + 160}"`),
    G(R(-320, -20, 640, 40, '#7a5a3a', K.NIGHT, 3) + R(-300, 20, 24, 300, '#5a3a24', K.NIGHT, 3) + R(276, 20, 24, 300, '#5a3a24', K.NIGHT, 3)
      + p('M-120 -26 L60 -36 L64 -18 L-116 -10Z', '#f2ead8', K.NIGHT, 3) + p('M-90 -26 h20 M-60 -27 h10 M-44 -28 h30 M-90 -16 h40 M-40 -18 h14', null, '#3a3a6a', 4), 'translate(600 820)'),
    G(p('M0 0 L-30 -80 L30 -80Z', '#c8a24a', K.NIGHT, 3) + R(-4, 0, 8, 60, '#6a4a2a'), 'translate(740 700)'), K.glow('c5kg', 740, 640, 460, '#ffcf7a', 0.4), K.vignette(1200, 1200, 0.8)]);
  // The wall between their rooms, that night: two hands, tapping.
  S['c5-wall'] = K.scene([sky('c5w', '#1a1830', '#0e0c18'), R(0, 0, 590, 1200, '#2a2640'), R(610, 0, 590, 1200, '#262238'), R(590, 0, 20, 1200, '#4a4466', K.NIGHT, 3),
    G(p('M0 0 C20 -20 50 -20 70 0 L80 60 L-10 60Z', '#f0d2bc', K.NIGHT, 3), 'translate(500 560)'), G(p('M0 0 C-20 -20 -50 -20 -70 0 L-80 60 L10 60Z', '#e2b496', K.NIGHT, 3), 'translate(700 620)'),
    K.t(600, 380, '·  ·  ·     ·     ·  ·  ·  ·', { size: 44, fill: '#c8b0ff', font: 'ui-monospace, monospace' }), K.vignette(1200, 1200, 0.85)]);
  // The first night at the tower's foot: Seymour's tapes by the fire, one of them going green.
  S['c5-tapes'] = K.scene([sky('c5t', '#0e0c18', '#1a1622'), K.stars(1200, 600, 120, 57, 0.8), R(0, 760, 1200, 440, '#1e2414'),
    G(p('M-50 10 L50 -6 M-46 -6 L48 12', null, '#4a2c16', 12) + p('M-36 0 C-46 -46 -18 -72 0 -120 C10 -82 36 -64 36 0Z', '#ff8a2a', K.NIGHT, 3) + p('M-16 0 C-20 -28 -6 -46 0 -72 C8 -46 20 -28 16 0Z', '#ffe08a'), 'translate(600 960) scale(1.2)'),
    G(R(-90, -50, 80, 50, '#2a2a34', K.NIGHT, 4, null, 6) + c(-70, -26, 12, '#9aa0b0', K.NIGHT, 3) + c(-30, -26, 12, '#9aa0b0', K.NIGHT, 3)
      + R(10, -50, 80, 50, '#2a2a34', K.NIGHT, 4, null, 6) + c(30, -26, 12, '#3bd16f', K.NIGHT, 3) + c(70, -26, 12, '#3bd16f', K.NIGHT, 3) + gridS(10, -50, 80, 50, 0.6), 'translate(600 820) scale(2)'),
    K.glow('c5tg', 600, 900, 460, '#ff9a3a', 0.45), K.vignette(1200, 1200, 0.65)]);
  // Floor 61, the Arcanum's city: spires, lecture bells, and Dutch's face on every wall.
  S['c5-city'] = K.scene([sky('c5c', '#5a6a9a', '#d8d0e8'), spires(760, '#7a7896', 61, 9), R(0, 760, 1200, 440, '#8e93a8'),
    ...Array.from({ length: 6 }, (_, i) => G(R(-50, -70, 100, 80, '#f2e6c8', K.NIGHT, 3) + K.t(0, -44, 'WANTED', { size: 18, fill: '#8a2a2a' }) + c(0, -18, 16, '#e2b496', K.NIGHT, 2), `translate(${120 + i * 190} ${880 + (i % 2) * 40})`)),
    gridS(0, 300, 1200, 460, 0.12), K.vignette(1200, 1200, 0.45)]);
  // The Crown's old station: a desk, a cold stove, and on a nail, a badge polished bright.
  S['c5-station'] = K.scene([sky('c5s', '#2a2a3a', '#3a3446'), R(0, 0, 1200, 1200, '#3a3a4a'), R(0, 840, 1200, 360, '#2a2430'),
    R(160, 560, 520, 40, '#5a4030', K.NIGHT, 3), R(180, 600, 24, 240, '#4a3020'), R(636, 600, 24, 240, '#4a3020'),
    G(c(0, 0, 8, '#8a8a92', K.NIGHT, 2) + p('M0 0 L0 40', null, '#6a5a3a', 3) + p('M-40 40 L40 40 L30 120 L0 140 L-30 120Z', '#d7c27a', K.NIGHT, 4) + K.t(0, 96, 'CROWN', { size: 18, fill: '#6a5a2a' }), 'translate(880 360)'),
    K.glow('c5sg', 880, 460, 260, '#ffe8a0', 0.35), R(140, 160, 300, 220, '#5a8ad8', K.NIGHT, 4, 0.4), K.vignette(1200, 1200, 0.7)]);
  // The diary by lamplight: Lina's last pages, in a cipher on top of her father's.
  S['c5-diary'] = K.scene([sky('c5d', '#1a1210', '#0a0806'), R(0, 0, 1200, 1200, '#2a1e16'),
    G(p('M-360 -220 L0 -240 L0 240 L-360 260Z', '#f2ead8', K.NIGHT, 4) + p('M0 -240 L360 -220 L360 260 L0 240Z', '#eee4d0', K.NIGHT, 4)
      + p(Array.from({ length: 12 }, (_, i) => `M-320 ${-180 + i * 34} h${200 + (i * 37) % 100} M40 ${-180 + i * 34} h${180 + (i * 53) % 120}`).join(' '), null, '#5a4a8a', 6, 0.7), 'translate(600 640) rotate(-2)'),
    K.glow('c5dg', 600, 600, 520, '#ffcf7a', 0.35), K.vignette(1200, 1200, 0.85)]);
  // The janitor's closet, rebuilt to the last shelf: and the trial's ledgers, back where Iris burned them.
  S['c5-closet'] = K.scene([sky('c5l', '#1a1622', '#24202e'), R(0, 0, 1200, 1200, '#22202c'),
    ...Array.from({ length: 4 }, (_, i) => R(80 + i * 280, 140, 220, 860, '#3a2a1e', K.NIGHT, 3)),
    p(Array.from({ length: 64 }, (_, i) => `M${92 + (i % 4) * 280 + (i * 29) % 170} ${170 + Math.floor(i / 4) * 52} h18 v44 h-18Z`).join(' '), '#8a6a4a', K.NIGHT, 2, 0.85),
    gridS(60, 120, 1080, 900, 0.16), G(R(-80, -120, 160, 120, '#6a2a2a', K.NIGHT, 3) + R(-70, -110, 140, 100, '#e8dcc0') + p('M-56 -90 h100 M-56 -70 h80 M-56 -50 h110 M-56 -30 h60', null, '#3a2a2a', 4), 'translate(600 1060)'),
    K.glow('c5lg', 600, 940, 360, '#ffcf7a', 0.35), K.vignette(1200, 1200, 0.8)]);
  // The city at night, from the station steps: Mira and Dutch, and the button.
  S['c5-steps'] = K.scene([sky('c5n', '#0e0c1e', '#2a2a4a'), K.stars(1200, 500, 120, 63, 0.8), spires(760, '#3a3a56', 67, 8), R(0, 760, 1200, 440, '#3a3a50'),
    G(R(-300, 0, 600, 30, '#5a5a70', K.NIGHT, 3) + R(-320, 30, 640, 30, '#4a4a60', K.NIGHT, 3), 'translate(600 900)'),
    G(c(0, 0, 26, '#d7c27a', K.NIGHT, 4) + c(-8, -6, 4, K.NIGHT) + c(8, -6, 4, K.NIGHT) + c(-8, 8, 4, K.NIGHT) + c(8, 8, 4, K.NIGHT) + p('M24 6 l20 6 M24 -2 l24 -2 M22 12 l14 14', null, '#d7c27a', 3), 'translate(600 700) scale(2)'),
    K.glow('c5ng', 600, 700, 300, '#ffe8a0', 0.25), K.vignette(1200, 1200, 0.7)]);
  // The camp at the tower's foot: the fire, the tents, the lift up into the Arcanum.
  S['c5-camp'] = K.scene([sky('c5p', '#0e0c18', '#1a1420'), K.stars(1200, 600, 120, 71, 0.8), R(0, 760, 1200, 440, '#1e2414'),
    G(p('M-160 0 L0 -200 L160 0Z', '#5a4a7a', K.NIGHT, 4), 'translate(250 860)'), G(p('M-130 0 L0 -170 L130 0Z', '#4a5a7a', K.NIGHT, 4), 'translate(950 870)'),
    R(1060, 200, 40, 600, '#4a4458', K.NIGHT, 3), G(p('M-50 10 L50 -6 M-46 -6 L48 12', null, '#4a2c16', 12) + p('M-36 0 C-46 -46 -18 -72 0 -120 C10 -82 36 -64 36 0Z', '#ff8a2a', K.NIGHT, 3) + p('M-16 0 C-20 -28 -6 -46 0 -72 C8 -46 20 -28 16 0Z', '#ffe08a'), 'translate(600 960) scale(1.2)'),
    K.glow('c5pg', 600, 900, 460, '#ff9a3a', 0.45), K.vignette(1200, 1200, 0.65)]);
  // The clocktower's gears, and the pipeline that redeploys the tower at midnight.
  S['c5-clock'] = K.scene([sky('c5o', '#1a1428', '#2a2040'), R(0, 0, 1200, 1200, '#1e1a2e'),
    ...[[360, 460, 260], [820, 380, 200], [700, 860, 300], [240, 960, 160]].map(([x, y, r], i) => G(c(0, 0, r, '#8a6a3a', K.NIGHT, 4) + c(0, 0, r * 0.7, '#6a5030', K.NIGHT, 3) + c(0, 0, r * 0.16, '#c8a24a', K.NIGHT, 3)
      + p(Array.from({ length: 12 }, (_, k) => { const a = k / 12 * Math.PI * 2; return `M${(Math.cos(a) * r).toFixed(0)} ${(Math.sin(a) * r).toFixed(0)} L${(Math.cos(a) * (r + 30)).toFixed(0)} ${(Math.sin(a) * (r + 30)).toFixed(0)}`; }).join(' '), null, '#8a6a3a', 22), `translate(${x} ${y}) rotate(${i * 13})`)),
    G(c(0, 0, 150, '#f6efd8', K.NIGHT, 6) + p('M0 0 L0 -120 M0 0 L-6 -90', null, K.NIGHT, 10), 'translate(600 300)'), gridS(0, 0, 1200, 1200, 0.2), K.vignette(1200, 1200, 0.75)]);
  // The Healers' Ward: a chart at the foot of an empty bed by the window.
  S['c5-ward'] = K.scene([sky('c5h', '#2a3040', '#1a1e2a'), R(0, 0, 1200, 1200, '#3a4050'), R(700, 120, 360, 420, '#8aa0c8', K.NIGHT, 4, 0.5),
    R(0, 820, 1200, 380, '#2a2e3a'), G(R(-260, -60, 520, 120, '#e8e8f0', K.NIGHT, 4, null, 10) + R(-280, 60, 560, 30, '#8a8a9a', K.NIGHT, 3), 'translate(600 760)'),
    G(R(-120, -160, 240, 200, '#f6efd8', K.NIGHT, 4) + p('M-100 0 L-60 -30 L-20 -60 L20 -100 L50 -110 L60 10 L100 20', null, '#d63a3a', 6), 'translate(600 1000)'),
    G(p('M0 0 C-10 -40 10 -60 0 -100 M0 -60 C20 -80 30 -70 40 -90', null, '#6a5a3a', 6) + c(0, -110, 14, '#9a8a9a') + c(40, -96, 12, '#8a7a8a'), 'translate(900 560)'), K.vignette(1200, 1200, 0.7)]);
  // The relay map: brass wires, a line from one office, two hops, the infirmary ward. 23:38.
  S['c5-relay'] = K.scene([sky('c5r', '#1a1428', '#2a2232'), R(0, 0, 1200, 1200, '#221c2a'),
    p(Array.from({ length: 9 }, (_, i) => `M0 ${180 + i * 100} H1200`).join(' '), null, '#8a6a3a', 6, 0.5),
    G(R(-460, -140, 920, 280, '#f2ead8', K.NIGHT, 4) + c(-360, 0, 40, '#c8a8e8', K.NIGHT, 4) + c(0, -40, 36, '#c8c2b4', K.NIGHT, 4) + c(360, 20, 40, '#d63a3a', K.NIGHT, 4)
      + p('M-320 0 L-36 -40 M36 -40 L320 20', null, '#3a2a5a', 8) + K.t(0, 110, '23:38', { size: 44, fill: '#8a2a2a' }), 'translate(600 600)'), K.vignette(1200, 1200, 0.75)]);
  // The Observatory at 23:50: the rail, the dome open to the stars, the students along the walls with their lanterns.
  const obs = lit => K.scene([sky('c5b' + lit, '#06051a', '#1a1840'), K.stars(1200, 700, 200, 79, 0.9), p('M0 700 C200 300 1000 300 1200 700 L1200 1200 L0 1200Z', '#2a2846', K.NIGHT, 4),
    R(0, 900, 1200, 300, '#1e1c30'), p('M80 880 H1120', null, '#8a84a4', 10), p(Array.from({ length: 22 }, (_, i) => `M${100 + i * 48} 880 V960`).join(' '), null, '#8a84a4', 6),
    ...Array.from({ length: 9 }, (_, i) => lanternS(120 + i * 120, 600 + (i % 2) * 40, 1.2, i < lit)), K.vignette(1200, 1200, 0.6)]);
  S['c5-observatory'] = obs(9); S['c5-observatory2'] = obs(6); S['c5-observatory3'] = obs(3); S['c5-observatory0'] = obs(0);
  // The rail: a hand in a fist, a strip of lilac scarf.
  S['c5-rail'] = K.scene([sky('c5a', '#06051a', '#2a2846'), K.stars(1200, 1200, 160, 83, 0.9), p('M0 640 H1200', null, '#8a84a4', 16),
    p(Array.from({ length: 13 }, (_, i) => `M${i * 100} 640 V820`).join(' '), null, '#8a84a4', 10),
    G(p('M-60 0 C-80 -40 -40 -80 0 -70 C40 -80 80 -40 60 0 L40 60 L-40 60Z', '#e2b496', K.NIGHT, 4) + p('M0 -60 C40 40 20 200 60 320', null, '#c8a8e8', 26), 'translate(600 600)'), K.vignette(1200, 1200, 0.7)]);
  // Dawn after: the students' lanterns going out across the band, and the grid gone from the spires.
  S['c5-dawn'] = K.scene([sky('c5z', '#4a3a6a', '#ffc89a', '#f0a0b8'), c(600, 620, 130, '#ffe8c0', null, null, 0.7), spires(780, '#8a7a9a', 89, 9), R(0, 780, 1200, 420, '#a89aa8'),
    ...Array.from({ length: 10 }, (_, i) => lanternS(110 + i * 110, 900 + (i % 3) * 30, 0.9, false)), K.vignette(1200, 1200, 0.4)]);
  A.scenes = S;
  SD.vn.addScenes(Object.fromEntries(Object.keys(S).map(k => [k, { src: S[k], label: k }])));

  // ---------- Enemies ----------
  const SS = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const eyes = (x1, x2, y, r) => `<circle cx="${x1}" cy="${y}" r="${r || 4}" fill="#fff" ${SS}/><circle cx="${x2}" cy="${y}" r="${r || 4}" fill="#fff" ${SS}/><circle cx="${x1 + 1}" cy="${y + 1}" r="1.8" fill="${INK}"/><circle cx="${x2 - 1}" cy="${y + 1}" r="1.8" fill="${INK}"/>`;
  const tag = (t, col, y) => { const w = Math.max(44, t.length * 5.4 + 10); return `<rect x="${60 - w / 2}" y="${y || 100}" width="${w}" height="15" rx="4" fill="#fff8e0" stroke="${col || INK}" stroke-width="2"/><text x="60" y="${(y || 100) + 11}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="${col || INK}">${K.esc(t)}</text>`; };
  const gridE = `<path d="${Array.from({ length: 7 }, (_, i) => `M${18 + i * 14} 14 V96 M14 ${18 + i * 13} H106`).join(' ')}" stroke="#3bd16f" stroke-width="1" opacity=".35" fill="none"/>`;
  const BODY = {
    // A stone golem, broad and blocky.
    golem: o => `<g ${SS}><rect x="28" y="40" width="64" height="58" rx="8" fill="${o.col}"/><rect x="38" y="16" width="44" height="30" rx="6" fill="${o.col2 || o.col}"/><rect x="12" y="46" width="18" height="40" rx="6" fill="${o.col}"/><rect x="90" y="46" width="18" height="40" rx="6" fill="${o.col}"/></g>${eyes(52, 68, 30, 4)}<path d="M52 40 H68" stroke="${INK}" stroke-width="2.5"/>`,
    // A gear with a face.
    gear: o => `<g ${SS}><path d="${Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2, b = a + 0.3; return `M${60 + Math.cos(a) * 34} ${54 + Math.sin(a) * 34} L${60 + Math.cos(a) * 44} ${54 + Math.sin(a) * 44} L${60 + Math.cos(b) * 44} ${54 + Math.sin(b) * 44} L${60 + Math.cos(b) * 34} ${54 + Math.sin(b) * 34}`; }).join(' ')}" fill="${o.col2 || '#8a6a3a'}"/><circle cx="60" cy="54" r="36" fill="${o.col}"/></g>${eyes(50, 70, 50, 5)}<path d="M50 66 Q60 72 70 66" stroke="${INK}" stroke-width="2.5" fill="none"/>`,
    // A crate on legs: a container.
    crate: o => `<g ${SS}><rect x="22" y="28" width="76" height="60" rx="4" fill="${o.col}"/><path d="M22 48 H98 M22 68 H98" fill="none" stroke-width="2"/><path d="M40 88 L36 104 M80 88 L84 104" fill="none"/></g>${eyes(48, 72, 40, 4)}`,
    // A floating page.
    scroll: o => `<g ${SS}><rect x="24" y="30" width="72" height="60" rx="4" fill="${o.col}"/><rect x="18" y="24" width="10" height="72" rx="4" fill="${o.col2 || '#8a6a3a'}"/><rect x="92" y="24" width="10" height="72" rx="4" fill="${o.col2 || '#8a6a3a'}"/></g>${eyes(48, 72, 52, 4)}<path d="M46 70 H74 M46 78 H66" stroke="${INK}" stroke-width="2"/>`,
    // A ghost.
    spirit: o => `<g ${SS}><path d="M30 110 Q36 100 30 90 Q20 50 60 30 Q100 50 90 90 Q84 100 90 110 Q80 102 72 110 Q66 100 60 110 Q54 100 48 110 Q40 102 30 110Z" fill="${o.col}" opacity=".9"/></g>${eyes(50, 70, 60, 5)}<path d="M52 76 Q60 82 68 76" stroke="${INK}" stroke-width="2.5" fill="none"/>`,
    // A familiar: a little owl-bat with one job.
    familiar: o => `<g ${SS}><path d="M16 60 Q30 30 44 48 L60 36 L76 48 Q90 30 104 60 Q90 56 82 70 Q60 96 38 70 Q30 56 16 60Z" fill="${o.col2 || '#5a4a8a'}"/><ellipse cx="60" cy="62" rx="24" ry="26" fill="${o.col}"/><path d="M44 40 L48 30 L54 40 M66 40 L72 30 L76 40" fill="${o.col}"/></g>${eyes(52, 68, 58, 6)}<path d="M57 70 L60 74 L63 70" fill="#ffd24a" stroke="${INK}" stroke-width="2"/>`,
    // A robed person of rank.
    lord: o => `<g ${SS}><path d="M26 114 Q26 62 60 52 Q94 62 94 114Z" fill="${o.col}"/><path d="M60 52 L48 114 M60 52 L72 114" fill="none" stroke="${o.col2 || '#e8e4dc'}" stroke-width="4"/><circle cx="60" cy="38" r="17" fill="${o.skin || '#ecccb0'}"/><path d="M42 34 Q60 10 78 34 Q70 24 60 24 Q50 24 42 34Z" fill="${o.hair || '#c8c2cc'}"/></g><path d="M52 38 H56 M64 38 H68" stroke="${INK}" stroke-width="2.5"/><path d="M54 48 H66" stroke="${INK}" stroke-width="2"/>`,
    // A clock face.
    clock: o => `<g ${SS}><circle cx="60" cy="56" r="40" fill="${o.col}"/><circle cx="60" cy="56" r="32" fill="#f6efd8"/><path d="M60 56 L60 32 M60 56 L74 50" fill="none" stroke-width="4"/><path d="M36 18 L44 26 M84 18 L76 26" fill="none" stroke-width="5"/></g>${eyes(48, 72, 66, 3)}`,
    // A bucket, with a mop.
    bucket: o => `<g ${SS}><path d="M30 52 L90 52 L82 106 L38 106Z" fill="${o.col}"/><ellipse cx="60" cy="52" rx="30" ry="8" fill="#9ab8d8"/><path d="M70 50 L92 8" fill="none" stroke="#a8843a" stroke-width="5"/><path d="M62 52 Q60 40 72 42 Q80 48 74 54" fill="#d8d4c8"/></g>${eyes(50, 70, 78, 5)}`,
    // A stair with a face, stone steps going up.
    stair: o => `<g ${SS}><path d="M10 104 H34 V84 H54 V64 H74 V44 H94 V24 H110 V104Z" fill="${o.col}"/></g>${eyes(72, 90, 66, 4)}<path d="M74 82 Q82 86 90 82" stroke="${INK}" stroke-width="2.5" fill="none"/>`,
    // A wire relay: brass posts and a wire.
    relay: o => `<g ${SS}><rect x="16" y="30" width="12" height="74" fill="${o.col2 || '#8a6a3a'}"/><rect x="92" y="30" width="12" height="74" fill="${o.col2 || '#8a6a3a'}"/><path d="M22 40 Q60 70 98 40" fill="none" stroke="${o.col}" stroke-width="5"/><circle cx="60" cy="62" r="18" fill="${o.col}"/></g>${eyes(54, 66, 60, 3)}`,
    // A lantern held up, a student behind it.
    lantern: o => `<g ${SS}><path d="M34 114 Q34 72 60 64 Q86 72 86 114Z" fill="#5a5a7a"/><circle cx="60" cy="48" r="14" fill="#f0d0b4"/><path d="M48 44 Q60 28 72 44" fill="#6a4a2a"/><path d="M84 60 L84 70" fill="none"/><rect x="74" y="70" width="20" height="26" rx="6" fill="${o.col}"/></g><circle cx="84" cy="83" r="20" fill="#ffd27a" opacity=".3"/><path d="M54 48 H56 M64 48 H66" stroke="${INK}" stroke-width="2.5"/>`,
    // A flag on a switch.
    flag: o => `<g ${SS}><rect x="30" y="80" width="60" height="24" rx="8" fill="#3a3a4a"/><path d="M50 82 L50 18" fill="none" stroke-width="4"/><path d="M50 20 L96 32 L50 46Z" fill="${o.col}"/></g>${eyes(64, 78, 92, 3)}`,
    // A dashboard nobody opens: a screen with charts.
    screen: o => `<g ${SS}><rect x="14" y="20" width="92" height="66" rx="6" fill="${o.col}"/><rect x="22" y="28" width="76" height="50" fill="#1a1e2a"/><path d="M28 70 L44 56 L58 62 L72 40 L90 46" fill="none" stroke="#7fe0a0" stroke-width="3"/><path d="M50 86 L44 104 H76 L70 86" fill="#4a4a5a"/></g>`
  };
  const FOE = {
    golem: ['golem', '#9a98a6', 'shake', 'm7.48xlarge'], reclaim: ['spirit', '#d8c070', 'float', '2 min warning'], burst: ['lord', '#8aa0c8', 'shake', 'credits: 0', { hair: '#6a4a2a', skin: '#f0d0b4' }],
    night: ['clock', '#5a6a9a', 'float', 'on all night'], liar: ['lord', '#7a8a6a', 'float', 'GET /ping: 200', { hair: '#3a3036', col2: '#ffd24a' }], forgemaster: ['golem', '#8a4a3a', 'shake', 'scale: 1 → 40', { col2: '#c8a24a' }],
    norole: ['crate', '#a89a7a', 'shake', 'taskRoleArn: none'], fatimage: ['crate', '#c8a07a', 'squish', 'image: 4.2 GB'], oldforge: ['golem', '#6a5a4a', 'shake', 'v1 → v2, lit'], migrant: ['crate', '#8a9ab8', 'float', 'lift and shift'],
    overseer: ['lord', '#5a4a3a', 'float', '1000 jobs', { hair: '#2a1d16' }], line: ['gear', '#8a8a96', 'shake', '52 services', { col2: '#5a5a66' }],
    furniture: ['spirit', '#8a7a6a', 'float', 'staff: unlogged'], rewritten: ['scroll', '#e8dcc0', 'shake', 'edited after'], ninety: ['clock', '#a89aa8', 'float', 'day 91'], nodata: ['scroll', '#c8c0e0', 'float', 'data events: off'],
    mop: ['bucket', '#5a7aa8', 'squish', 'no logs'],
    polly: ['familiar', '#e8c46a', 'float', 'speaks'], transcribe: ['familiar', '#7fd0ff', 'float', 'listens'], translate: ['familiar', '#9fc98a', 'float', 'translates'], textract: ['familiar', '#e8dcc0', 'float', 'reads forms'],
    rekognition: ['familiar', '#c8a0d8', 'float', 'sees'], comprehend: ['familiar', '#f0a0a8', 'float', 'understands'], lex: ['familiar', '#a8b4c8', 'float', 'talks back'], sagemaker: ['familiar', '#7fe0a0', 'float', 'learns'],
    fullscan: ['scroll', '#c8b48a', 'squish', 'SELECT *'], q: ['lord', '#6a8aff', 'float', 'Amazon Q', { hair: '#2a3a8a', skin: '#c8d8ff' }], dean: ['lord', '#3a2a5a', 'float', 'two questions', { hair: '#ffffff' }],
    flatline: ['screen', '#6a6a7a', 'float', 'no alarm'], scream: ['spirit', '#f0a0a8', 'shake', 'ERROR!!! oh no'], dashboard: ['screen', '#8a8a9a', 'float', 'views: 0'], custom: ['scroll', '#7fe0a0', 'float', 'PutMetricData'],
    nurse: ['lord', '#e8e8f0', 'float', 'intents: hidden', { hair: '#3a2a2a', col2: '#d63a3a' }],
    unseen: ['stair', '#5a5668', 'float', 'not recorded'], reader: ['spirit', '#6a6a8a', 'float', 'GetObject'], loop: ['scroll', '#c8c2b4', 'shake', 'logs → same bucket'], liftop: ['relay', '#9a8a6a', 'shake', 'FailedInvocations'],
    stair: ['stair', '#7a7896', 'float', 'recording'],
    slowhop: ['relay', '#c8a24a', 'float', '4.8 s'], lostheader: ['scroll', '#e8a0a0', 'shake', 'no trace header'], metadata: ['scroll', '#b8b2a8', 'float', 'metadata only'], sampler: ['lord', '#5a6a8a', 'float', '1 in 20', { hair: '#3a3036' }],
    relaykeeper: ['relay', '#8a6a3a', 'shake', 'annotations'],
    unapproved: ['scroll', '#f2ead8', 'shake', 'no approval'], stagevar: ['flag', '#7a9ad0', 'float', 'test → prod'], flag: ['flag', '#e8c46a', 'shake', 'flipped live'], unread: ['scroll', '#d8c0a0', 'float', 'Replacement: True'],
    midnight: ['clock', '#1a2440', 'shake', '00:00', { col2: '#3bd16f' }],
    iris: ['lord', '#6a5a8a', 'float', 'Iris Vell', { hair: '#b9b0c8', skin: '#f2d8c6', col2: '#c8a8e8' }], lantern: ['lantern', '#ffe08a', 'float', 'a lantern']
  };
  Object.keys(FOE).forEach(id => {
    const [body, col, anim, label, more] = FOE[id], o = Object.assign({ col }, more);
    const rebuilt = ['midnight', 'line', 'forgemaster', 'rewritten', 'iris'].includes(id);
    SD.art.addFoe('x5-' + id, { col, anim, svg: (rebuilt ? gridE : '') + BODY[body](o) + tag(label, /no |none|off|0$|hidden|not /i.test(label) ? '#d63a3a' : INK) });
  });

  // ---------- The raid, in vector ----------
  // While a chapter 5 raid plays (js/c5-world.js turns it on with A.raidArt(true)): a drawn backdrop over the
  // painted one, each champion's standing figure as a one-frame sheet (js/raid.js reads its idle row at y = 2h), and
  // no painted map tiles (SD.dungeonArt is set aside, so the engine draws plain rooms over the drawn map below).
  const css = document.createElement('style');
  const back = K.scene([sky('c5rb', '#1a1630', '#4a4068'), spires(820, '#3a3654', 97, 8), gridS(0, 300, 1200, 600, 0.12), R(0, 820, 1200, 380, '#2a2638'), K.vignette(1200, 1200, 0.6)]);
  const mapBg = K.uri(K.svg('0 0 120 120', R(0, 0, 120, 120, '#26223a') + p('M0 30 H120 M0 90 H120 M30 0 V120 M90 0 V120', null, '#3a3654', 3) + c(60, 60, 4, '#4a4466')));
  css.textContent = `html.c5raid .rd-stage { background-image: url("${back}") !important; background-size: cover !important; background-position: center !important; }
html.c5raid .rd .map { background: url("${mapBg}") repeat, #26223a; background-size: 120px 120px; }`;
  document.head.appendChild(css);
  let keptArt = null;
  A.raidArt = function (on) {
    document.documentElement.classList.toggle('c5raid', !!on);
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
