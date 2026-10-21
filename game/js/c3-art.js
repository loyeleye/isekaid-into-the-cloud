// Chapter 3, the Granaries, drawn in code: the overworld (the Free Cloud's camp, Halcyon on floor 21 under its golden
// barrier, the Cold Stores yard on floor 22, the bottom of the Abyss on floor 32) in chapter 1's chibi style on
// js/c2-art.js's prop kit, the new people for the overworld and the visual-novel figures (js/vec-cast.js), the
// cutscene backgrounds, and the 120 x 120 SVGs of every enemy in js/c3-raid.js. No painted or generated images.
(function () {
  const K = SD.vec, A2 = SD.c2art, ART = SD.c1art;
  if (!K || !A2 || !ART) return;
  const A = SD.c3art = {};
  const INK = '#2b2340';
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  const PROPS = A2.PROPS;

  // ---------- People, in the overworld ----------
  Object.assign(ART.LOOK, {
    noor: { skin: '#c99a76', hair: '#1d1410', hairD: '#0e0806', style: 'long', coat: '#fff4d6', coatD: '#e8d29a', under: '#ffd25a', eye: '#3a2216', robe: true, halo: true, mouth: 'smile', brow: 'flat', blush: true },
    selvaria: { skin: '#f4e2d6', hair: '#d8d4e6', hairD: '#a8a2bc', style: 'braid', coat: '#3a2a5a', coatD: '#241a3a', under: '#d9a740', eye: '#6a5aa0', robe: true, crown: true, mouth: 'flat', brow: 'flat' },
    aurelian: { skin: '#e2b48e', hair: '#d9b25a', hairD: '#a8822a', style: 'short', coat: '#c8ccd6', coatD: '#8a90a0', under: '#e8c86a', legs: '#8a90a0', boots: '#4a4a56', eye: '#3a4a6a', sword: true, mouth: 'frown', brow: 'sad', k: 1.1 },
    aurelianplain: { skin: '#e2b48e', hair: '#d9b25a', hairD: '#a8822a', style: 'short', coat: '#5a4a3a', coatD: '#3e3226', under: '#e8dcc4', legs: '#3e3226', boots: '#2e2218', eye: '#3a4a6a', mouth: 'frown', brow: 'sad', k: 1.1 },
    ash: { skin: '#cfa888', hair: '#e8e2ea', hairD: '#a8a2b0', style: 'long', coat: '#6a5a5a', coatD: '#4a3e3e', under: '#c8b090', eye: '#c88a2a', robe: true, staff: true, mouth: 'smile', brow: 'arch' },
    wen: { skin: '#f0d0b4', hair: '#dcd7e6', hairD: '#a9a3b8', style: 'bun', coat: '#c8584a', coatD: '#9a3a32', under: '#f2e6cf', eye: '#3a2a20', robe: true, apron: true, mouth: 'smile', brow: 'flat' },
    doug: { skin: '#e2b496', hair: '#7a5232', hairD: '#5a3a22', style: 'short', coat: '#4a6a8a', coatD: '#30506a', under: '#e8e2d0', legs: '#3a3a44', boots: '#2a2a30', eye: '#2a1a12', mouth: 'flat', brow: 'sad', k: 1.06 },
    kage: { skin: '#d8b896', hair: '#1a1418', style: 'hood', hood: '#2a2236', coat: '#2a2236', coatD: '#18121f', under: '#5a4a7a', eye: '#c8a0ff', robe: true, mouth: 'smile', brow: 'arch' },
    hanac: { skin: '#6e4630', hair: '#2a1810', hairD: '#160c06', style: 'braid', coat: '#fff4d6', coatD: '#e8d29a', under: '#ffd25a', eye: '#3a2216', robe: true, halo: true, mouth: 'flat', brow: 'flat' },
    guard: { skin: '#e2b496', hair: '#3a2a20', style: 'short', coat: '#8a7a3a', coatD: '#6a5a2a', under: '#d8c890', legs: '#4a4030', boots: '#2e2218', eye: '#2a1a12', sword: true, mouth: 'flat', brow: 'flat' },
    baker: { skin: '#a8724f', hair: '#2a1d16', hairD: '#160c06', style: 'bun', coat: '#f2ece0', coatD: '#d0c8b8', under: '#f2ece0', eye: '#2a1a12', robe: true, apron: true, mouth: 'smile', brow: 'flat' },
    lord: { skin: '#f0d6c4', hair: '#8a8a92', style: 'short', coat: '#6a2a4a', coatD: '#4a1a32', under: '#e8c86a', legs: '#2a1a24', boots: '#1a1018', eye: '#3a2a20', mouth: 'frown', brow: 'knit' },
    child: { skin: '#c99a76', hair: '#3a2416', style: 'spiky', coat: '#7a9ad0', coatD: '#5a7ab0', under: '#f2efe8', legs: '#4a3b2a', boots: '#2e2218', eye: '#2a1a12', mouth: 'smile', brow: 'up', k: 0.82 },
    citizen: { skin: '#e9c6a6', hair: '#6b4426', hairD: '#4a2c16', style: 'short', coat: '#9a8a5a', coatD: '#7a6a3a', under: '#f1e7c6', legs: '#4a3b2a', boots: '#2e2218', eye: '#3b2a20', mouth: 'flat', brow: 'sad' },
    citizen2: { skin: '#8a5a3a', hair: '#1a1210', hairD: '#0a0606', style: 'braid', coat: '#7a6a9a', coatD: '#5a4a7a', under: '#f1e7c6', eye: '#2a1a12', robe: true, mouth: 'flat', brow: 'flat' }
  });
  // Kevin: Doug's bot, a filing cabinet on wheels with one blinking eye.
  function kevin(ctx, fx, fy, ts, t, face, moving) {
    const u = ts / 32;
    ctx.save(); ctx.translate(fx, fy); ctx.scale(u, u); ctx.lineJoin = 'round';
    const bob = moving ? Math.sin(t * 14) * 1 : 0;
    ctx.fillStyle = 'rgba(43,35,64,.22)'; ctx.beginPath(); ctx.ellipse(0, 0, 9, 2.6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
    [[-5, -2], [5, -2]].forEach(([x, y]) => { ctx.fillStyle = '#3a3a44'; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 7); ctx.fill(); ctx.stroke(); });
    ctx.fillStyle = '#9aa6b8'; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-8, -26 + bob, 16, 22, 2) : ctx.rect(-8, -26 + bob, 16, 22); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7a869a'; [-20, -13].forEach(y => { ctx.fillRect(-6, y + bob, 12, 5); ctx.strokeRect(-6, y + bob, 12, 5); });
    const blink = (t * 1.3) % 3 < 0.15;
    ctx.fillStyle = blink ? '#3a3a44' : '#ff5a5a'; ctx.beginPath(); ctx.arc(0, -23 + bob, 1.6, 0, 7); ctx.fill();
    ctx.restore();
  }
  A.person = function (ctx, id, fx, fy, ts, t, face, moving, o) {
    if (id === 'kevin') return kevin(ctx, fx, fy, ts, t, face, moving);
    return A2.person(ctx, id, fx, fy, ts, t, face, moving, o);
  };

  // ---------- Ground ----------
  // Halcyon's own tiles on top of chapter 2's: m marble (the cathedral close), a the Abyss's black rock, g gold
  // flagstones (the square), i ice (the Cold Stores), B the barrier, L a lift or rope, and the rest as js/c2-art.js.
  A.ground = function (ctx, ch, x, y, ts, t, nb) {
    const X = x * ts, Y = y * ts, h = hash(x, y), u = ts / 32;
    if (ch === 'm' || ch === 'g') {
      ctx.fillStyle = ch === 'm' ? (h % 2 ? '#e8e2d6' : '#e0d9cc') : (h % 2 ? '#e8cf8a' : '#e2c67e'); ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.strokeStyle = ch === 'm' ? 'rgba(43,35,64,.12)' : 'rgba(140,100,30,.22)'; ctx.lineWidth = 1; ctx.strokeRect(X + 0.5, Y + 0.5, ts, ts);
      if (ch === 'm' && h % 5 === 0) { ctx.strokeStyle = 'rgba(120,110,140,.25)'; ctx.beginPath(); ctx.moveTo(X + ts * 0.2, Y + ts * 0.3); ctx.quadraticCurveTo(X + ts * 0.5, Y + ts * 0.6, X + ts * 0.8, Y + ts * 0.5); ctx.stroke(); }
      return;
    }
    if (ch === 'a') {
      ctx.fillStyle = ['#2e2a36', '#2a2632', '#332e3a', '#28242f'][h % 4]; ctx.fillRect(X, Y, ts + 1, ts + 1);
      if (h % 7 === 0) { ctx.fillStyle = `rgba(255,190,90,${0.25 + 0.2 * Math.sin(t * 2 + h)})`; ctx.fillRect(X + (h % 23) / 23 * ts, Y + (h % 19) / 19 * ts, 2 * u, 2 * u); }
      return;
    }
    if (ch === 'i') {
      ctx.fillStyle = h % 2 ? '#d8eef6' : '#cfe6f0'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      if (h % 4 === 0) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = u; ctx.beginPath(); ctx.moveTo(X + ts * 0.2, Y + ts * 0.7); ctx.lineTo(X + ts * 0.6, Y + ts * 0.3); ctx.stroke(); }
      return;
    }
    if (ch === 'B') {
      // The barrier: a wall of gold light, slowly breathing.
      ctx.fillStyle = '#e2c67e'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      const a = 0.55 + 0.2 * Math.sin(t * 1.6 + (x + y) * 0.4);
      ctx.fillStyle = `rgba(255,214,100,${a})`; ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.strokeStyle = `rgba(255,248,210,${a})`; ctx.lineWidth = 1.2 * u;
      ctx.beginPath(); ctx.moveTo(X, Y + ((t * 8 + x * 5) % ts)); ctx.lineTo(X + ts, Y + ((t * 8 + x * 5 + 10) % ts)); ctx.stroke();
      return;
    }
    if (ch === 'L') {
      ctx.fillStyle = '#5a5060'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.strokeStyle = '#c9a85a'; ctx.lineWidth = 2 * u; ctx.strokeRect(X + 3 * u, Y + 3 * u, ts - 6 * u, ts - 6 * u);
      ctx.fillStyle = '#c9a85a'; ctx.beginPath(); ctx.moveTo(X + ts / 2, Y + 7 * u); ctx.lineTo(X + ts / 2 + 6 * u, Y + 15 * u); ctx.lineTo(X + ts / 2 - 6 * u, Y + 15 * u); ctx.fill();
      return;
    }
    return A2.ground(ctx, ch, x, y, ts, t, nb, false);
  };
  // What a wall tile is, by zone: the camp's scrap, Halcyon's honey-stone wall, the stores' ice, the Abyss's rock.
  A.wall = function (ctx, x, y, ts, t, zone) {
    const X = x * ts, Y = y * ts;
    if (zone === 'halcyon') {
      ctx.fillStyle = '#c8a870'; ctx.fillRect(X, Y - ts * 0.4, ts + 1, ts * 1.4);
      ctx.strokeStyle = 'rgba(90,60,20,.3)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) ctx.strokeRect(X + ((y + i) % 2) * ts / 4 + 0.5, Y - ts * 0.4 + i * ts * 0.46, ts / 2, ts * 0.46);
      ctx.fillStyle = '#e8d29a'; ctx.fillRect(X, Y - ts * 0.46, ts + 1, ts * 0.1);
      return;
    }
    if (zone === 'stores') {
      ctx.fillStyle = '#a8c8d8'; ctx.fillRect(X, Y - ts * 0.5, ts + 1, ts * 1.5);
      ctx.fillStyle = '#eef8fc'; ctx.beginPath(); ctx.moveTo(X, Y - ts * 0.5); ctx.lineTo(X + ts * 0.3, Y - ts * 0.2); ctx.lineTo(X + ts * 0.6, Y - ts * 0.5); ctx.lineTo(X + ts, Y - ts * 0.3); ctx.lineTo(X + ts, Y - ts * 0.5); ctx.fill();
      return;
    }
    if (zone === 'abyss') {
      ctx.fillStyle = '#1a1720'; ctx.fillRect(X, Y - ts * 0.5, ts + 1, ts * 1.5);
      ctx.fillStyle = '#2e2a36'; ctx.beginPath(); ctx.moveTo(X, Y + ts); ctx.lineTo(X + ts * 0.4, Y - ts * 0.4); ctx.lineTo(X + ts, Y + ts); ctx.fill();
      return;
    }
    return A2.wall(ctx, x, y, ts, t, zone === 'camp' ? 'scrap' : zone);
  };

  // ---------- Props ----------
  // Unit coordinates, 32 to a tile, standing on the bottom edge of the footprint (js/c2-art.js's frame).
  PROPS.c3heart = (g, p, t) => {
    // The barrier's heart in the square: a tall stone with gold light running up it. Kai's hand print glows on it.
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.4);
    g.ell(32, -1, 28, 6).fill('rgba(43,35,64,.22)', false);
    g.poly(18, 0, 22, -86, 32, -96, 42, -86, 46, 0).fill('#d8c49a');
    g.poly(32, -96, 42, -86, 46, 0, 36, 0).fill('#c0aa7a', false);
    for (let i = 0; i < 4; i++) g.line(26 + i * 4, -6, 28 + i * 3, -80 + i * 6).stroke(`rgba(255,214,100,${0.4 + 0.5 * pulse})`, 1.4);
    g.circle(32, -50, 6 + pulse * 1.5).fill(`rgba(255,236,160,${0.6 + 0.3 * pulse})`, false);
    if (p.hand) g.ell(32, -36, 4, 5).fill('rgba(255,240,180,.9)', false);
  };
  PROPS.c3cathedral = (g, p, t) => {
    // Halcyon's cathedral: white stone, three gold spires, a rose window, and the regent's gallery over the door.
    const W = p.w * 32, H = 150;
    g.rect(8, -H + 40, W - 16, H - 40).fill('#ece6da');
    g.rect(W - 40, -H + 40, 32, H - 40).fill('#d6cfc0', false);
    [[W * 0.18, 70], [W * 0.5, 100], [W * 0.82, 70]].forEach(([x, h]) => { g.rect(x - 14, -H + 40 - h * 0.3, 28, h * 0.3 + 4).fill('#e4ddcf'); g.poly(x - 16, -H + 40 - h * 0.3, x, -H + 40 - h, x + 16, -H + 40 - h * 0.3).fill('#d9a740'); });
    g.circle(W / 2, -H + 72, 16).fill('#7a5aa0'); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.line(W / 2, -H + 72, W / 2 + Math.cos(a) * 15, -H + 72 + Math.sin(a) * 15).stroke('#ffd76a', 1); }
    // The gallery.
    g.rect(W / 2 - 34, -66, 68, 8).fill('#c9b48a'); for (let i = 0; i < 7; i++) g.line(W / 2 - 30 + i * 10, -58, W / 2 - 30 + i * 10, -50).stroke(INK, 1);
    // The door.
    g.path(c => { c.moveTo(W / 2 - 18, 0); c.lineTo(W / 2 - 18, -32); c.quadraticCurveTo(W / 2, -50, W / 2 + 18, -32); c.lineTo(W / 2 + 18, 0); c.closePath(); }).fill(p.open ? '#ffe9a0' : '#6a4a2a');
    if (!p.open) g.line(W / 2, 0, W / 2, -42).stroke('#3a2a1a', 1.2);
    // The kitchen's side door, east.
    g.rect(W - 34, -26, 16, 26, 2).fill('#7a5232'); g.circle(W - 22, -12, 1.4).fill('#ffd76a', false);
  };
  PROPS.c3stall = (g, p, t) => {
    // A market stall under a striped awning.
    const c = p.color || '#c8584a';
    g.ell(32, -1, 30, 5).fill('rgba(43,35,64,.2)', false);
    g.rect(6, -22, 52, 22).fill('#b5824d'); g.rect(6, -24, 52, 4).fill('#8a5a2a');
    for (let i = 0; i < 5; i++) g.poly(4 + i * 11.2, -44, 15.2 + i * 11.2, -44, 15.2 + i * 11.2, -36, 4 + i * 11.2, -36).fill(i % 2 ? '#fff3dc' : c, 0.8);
    g.line(6, -36, 6, -22).stroke(INK, 1.4); g.line(58, -36, 58, -22).stroke(INK, 1.4);
    (p.goods || ['#e8b86a', '#d8a050', '#f0d090']).forEach((col, i) => g.ell(16 + i * 15, -27, 6, 4).fill(col, 0.8));
  };
  PROPS.c3granary = (g, p, t) => {
    // A round granary silo with a conical roof and a frosted door.
    g.ell(32, -1, 26, 5).fill('rgba(43,35,64,.2)', false);
    g.rect(10, -70, 44, 70).fill('#d8c49a'); for (let i = 1; i < 5; i++) g.line(10, -i * 14, 54, -i * 14).stroke('rgba(90,60,20,.3)', 0.8);
    g.poly(6, -70, 32, -100, 58, -70).fill('#8a5a2a');
    g.rect(24, -26, 16, 26, 2).fill(p.frost ? '#cfe6f0' : '#6a4a2a');
  };
  PROPS.c3sacks = (g, p, t) => {
    const cols = p.ice ? ['#cfe6f0', '#bcdcea', '#e2f2f8'] : ['#d8b878', '#c9a868', '#e2c88a'];
    [[8, 0], [22, 0], [15, -10]].forEach(([x, y], i) => {
      g.path(c => { c.moveTo(x - 7, y); c.quadraticCurveTo(x - 9, y - 14, x, y - 16); c.quadraticCurveTo(x + 9, y - 14, x + 7, y); c.closePath(); }).fill(cols[i]);
      g.line(x - 3, y - 15, x + 3, y - 15).stroke(INK, 1.2);
    });
    if (p.tag) g.rect(20, -24, 14, 7, 1.5).fill('#fff8e0', 0.8), g.text(p.tag, 27, -18.6, 4.6, INK);
  };
  PROPS.c3grate = (g, p, t) => {
    // The grate over the Abyss: iron bars over black, warm light far down.
    g.rect(2, -30, 60, 30, 3).fill('#14101c');
    g.circle(32, -14, 8).fill(`rgba(255,170,80,${0.25 + 0.1 * Math.sin(t * 2)})`, false);
    for (let i = 0; i < 6; i++) g.line(8 + i * 10, -30, 8 + i * 10, 0).stroke(p.open ? 'rgba(90,90,100,.3)' : '#5a5a66', 2.2);
    g.rect(2, -32, 60, 4, 1).fill('#4a4a56');
  };
  PROPS.c3lift = (g, p, t) => {
    // The tower's lift: a brass cage on a chain.
    g.rect(2, -48, 28, 48, 2).fill('rgba(201,168,90,.25)');
    for (let i = 0; i < 5; i++) g.line(4 + i * 6, -48, 4 + i * 6, 0).stroke('#c9a85a', 1.2);
    g.line(16, -48, 16, -80).stroke('#8a8a92', 1.6);
    g.text(p.label || '21', 16, -52, 7, '#ffe9a0');
  };
  PROPS.c3stove = (g, p, t) => {
    // Kai's kitchen at camp: a field stove, a pot, a cleaver on a block, and the shelf over it.
    g.ell(32, -1, 30, 5).fill('rgba(43,35,64,.2)', false);
    g.rect(4, -24, 56, 24, 2).fill('#3a3a42'); g.rect(10, -18, 20, 12, 2).fill(`rgba(255,${120 + 40 * Math.sin(t * 6)},50,.9)`, false);
    g.ell(46, -28, 10, 5).fill('#8a8a92'); g.rect(36, -28, 20, 6).fill('#8a8a92', false);
    for (let i = 0; i < 3; i++) g.line(40 + i * 6, -34 - (t * 10 + i * 7) % 12, 42 + i * 6, -40 - (t * 10 + i * 7) % 12).stroke('rgba(255,255,255,.5)', 1);
    // The shelf, and Freya's jar on it once she has visited.
    g.rect(2, -54, 60, 4).fill('#7a5232');
    if (p.jar) { const on = p.jar === 'lit'; g.rect(40, -66, 10, 12, 2).fill(on ? 'rgba(255,224,130,.6)' : 'rgba(200,210,230,.4)'); if (on) g.line(45, -64, 45, -57).stroke(`rgba(255,236,160,${0.7 + 0.3 * Math.sin(t * 3)})`, 1.6); }
    g.rect(12, -62, 10, 8, 1).fill('#c9a07a');
  };
  PROPS.c3cafe = (g, p, t) => {
    // Grandma Wen's Cache Café: a counter, a warm oven, and rank shelves of keepsakes.
    const open = !!p.open;
    g.ell(48, -1, 44, 6).fill('rgba(43,35,64,.2)', false);
    g.rect(4, -60, 88, 60).fill(open ? '#f2e2c8' : '#9a948c');
    g.poly(0, -60, 48, -82, 96, -60).fill(open ? '#c8584a' : '#6a646c');
    g.rect(10, -50, 40, 4).fill('#7a5232'); g.rect(10, -36, 40, 4).fill('#7a5232');
    if (open) [['#ffd76a', 14], ['#ff9aa8', 24], ['#9ad0ff', 34], ['#a6e070', 44]].forEach(([c, x]) => { g.circle(x, -53, 3).fill(c, 0.6); g.rect(x - 3, -42, 6, 6, 1).fill(c, 0.6); });
    g.rect(58, -38, 28, 38, 3).fill('#3a3a42'); g.rect(62, -32, 20, 14, 3).fill(open ? `rgba(255,150,60,${0.7 + 0.2 * Math.sin(t * 5)})` : '#2a2a30', false);
    if (open) g.text('CACHE CAFÉ', 48, -66, 7, '#fff3dc');
  };
  PROPS.c3office = (g, p, t) => {
    // The ration office: a counter window, a ledger board and a queue rail.
    g.ell(40, -1, 36, 5).fill('rgba(43,35,64,.2)', false);
    g.rect(4, -56, 72, 56).fill('#d8c49a'); g.poly(0, -56, 40, -74, 80, -56).fill('#8a5a2a');
    g.rect(14, -40, 26, 18, 2).fill(p.open ? '#ffe9a0' : '#5a4a3a');
    g.rect(46, -46, 24, 30, 2).fill('#f6efd8'); for (let i = 0; i < 5; i++) g.line(50, -40 + i * 5, 66, -40 + i * 5).stroke('rgba(43,35,64,.5)', 0.8);
    g.text('RATIONS', 40, -60, 6.6, '#fff3dc');
  };
  PROPS.c3bell = (g, p, t) => {
    // The cathedral's bell tower, apart from the nave: the Saints' bell.
    const sw = p.ring ? Math.sin(t * 6) * 0.3 : 0;
    g.rect(6, -110, 40, 110).fill('#e4ddcf'); g.poly(2, -110, 26, -140, 50, -110).fill('#d9a740');
    g.rect(14, -100, 24, 26, 2).fill('#3a3048');
    g.path(c => { c.save(); c.translate(26, -98); c.rotate(sw); c.moveTo(-8, 18); c.quadraticCurveTo(-8, 2, 0, 2); c.quadraticCurveTo(8, 2, 8, 18); c.closePath(); c.restore(); }).fill('#d9a740');
    g.rect(18, -26, 16, 26, 2).fill(p.open ? '#ffe9a0' : '#6a4a2a');
  };
  PROPS.c3saints = (g, p, t) => {
    // The Saints' wall at the bottom of the Abyss: eleven names scratched into the rock, one candle each.
    g.rect(0, -60, p.w * 32, 60, 3).fill('#3a3442');
    for (let i = 0; i < 11; i++) {
      const x = 10 + i * (p.w * 32 - 20) / 10;
      g.line(x - 5, -44, x + 5, -44).stroke('rgba(230,220,240,.6)', 1); g.line(x - 4, -40, x + 3, -40).stroke('rgba(230,220,240,.4)', 0.8);
      g.rect(x - 1.5, -16, 3, 8).fill('#f2ece0', false);
      g.circle(x, -19 - Math.sin(t * 7 + i) * 0.6, 1.8).fill(i < (p.lit == null ? 11 : p.lit) ? 'rgba(255,190,90,.95)' : 'rgba(80,70,90,.6)', false);
    }
  };
  PROPS.c3rope = (g, p, t) => {
    const s = Math.sin(t * 1.3) * 2;
    g.line(16, -90, 16 + s, 0).stroke('#b5824d', 2.4);
    for (let i = 1; i < 6; i++) g.line(13 + s * i / 6, -i * 15, 19 + s * i / 6, -i * 15 - 2).stroke('#8a5a2a', 1.2);
  };
  PROPS.c3page = (g, p, t) => {
    // A page of Hana's speech, glowing faintly, weighed down by a pebble.
    const b = Math.sin(t * 2 + p.x) * 1.2;
    g.circle(16, -8, 9 + b).fill('rgba(255,236,160,.22)', false);
    g.poly(9, -4, 22, -6, 23, -14, 10, -12).fill('#f6efd8', 0.8);
    g.line(12, -8, 20, -9).stroke('rgba(43,35,64,.6)', 0.6); g.line(12, -10, 19, -11).stroke('rgba(43,35,64,.6)', 0.6);
    g.circle(20, -5, 2).fill('#8a8a92', 0.6);
  };
  PROPS.c3gate = (g, p, t) => {
    // The granary gate: a heavy door frosted shut, with the Quartermaster's tally board beside it.
    const H = (p.h || 2) * 32;
    g.rect(0, -H, 32, H).fill(p.open ? 'rgba(207,230,240,.15)' : '#9ab8c8', p.open ? false : 1.2);
    if (!p.open) { for (let i = 0; i < 4; i++) g.line(4, -H + 8 + i * (H - 12) / 3, 28, -H + 8 + i * (H - 12) / 3).stroke('#eef8fc', 1.4); g.text('❄', 16, -H / 2, 10, '#ffffff'); }
  };
  PROPS.c3well = (g, p, t) => {
    g.ell(16, -6, 14, 6).fill('#5a5a66'); g.ell(16, -7, 10, 4).fill('#14101c', false);
    g.line(4, -6, 4, -30).stroke('#7a5232', 2); g.line(28, -6, 28, -30).stroke('#7a5232', 2); g.line(2, -30, 30, -30).stroke('#7a5232', 2.2);
  };
  PROPS.c3banner = (g, p, t) => {
    const w = Math.sin(t * 2 + p.x) * 2;
    g.line(4, 0, 4, -50).stroke('#7a5232', 1.6);
    g.path(c => { c.moveTo(4, -50); c.lineTo(24 + w, -48); c.lineTo(22 + w, -32); c.lineTo(4, -34); c.closePath(); }).fill(p.color || '#d9a740');
  };
  PROPS.c3terminal = (g, p, t) => {
    // The camp table where Ship It runs: a crate desk, a slate showing the function's aliases.
    g.rect(2, -18, 44, 18, 2).fill('#9a6a3a');
    g.rect(8, -38, 32, 20, 2).fill('#1d1b2a'); g.text(p.done ? 'live → v4' : 'live → v3', 24, -25, 6, '#7fe0a0');
  };
  PROPS.c3board = (g, p, t) => {
    // The Design Board: a big slate on an easel.
    g.line(8, 0, 14, -40).stroke('#7a5232', 1.8); g.line(56, 0, 50, -40).stroke('#7a5232', 1.8);
    g.rect(4, -56, 56, 34, 2).fill('#24303a');
    g.rect(10, -50, 12, 8, 1).stroke('#e8f0f8', 0.8); g.rect(40, -50, 12, 8, 1).stroke('#e8f0f8', 0.8); g.line(22, -46, 40, -46).stroke('#e8f0f8', 0.8);
    g.rect(24, -36, 14, 8, 1).stroke(p.done ? '#7fe0a0' : '#ffd24a', 0.8);
  };

  // ---------- The visual-novel cast ----------
  // New figures in js/vec-cast.js's kit. Freya is the kit's own (neutral by default).
  Object.assign(K.cast, {
    noor: { skin: '#c99a76', skinD: '#ad7e5c', hair: '#1d1410', hairD: '#0e0806', hairL: '#3a2a20', eye: '#3a2216', style: 'long', veil: '#ffe9a8', coat: '#fff4d6', coatD: '#e8d29a', under: '#ffd25a', collar: 'v', robe: true, blush: 0.35, light: 'gold' },
    selvaria: { skin: '#f4e2d6', skinD: '#dcc4b6', hair: '#d8d4e6', hairD: '#a8a2bc', hairL: '#ffffff', eye: '#6a5aa0', browCol: '#a8a2bc', style: 'braids', coat: '#3a2a5a', coatD: '#241a3a', under: '#d9a740', collar: 'high', robe: true,
      top: () => K.p('M160 104 L176 76 L192 98 L200 70 L208 98 L224 76 L240 104Z', '#d9a740', INK, 3) },
    aurelian: { skin: '#e2b48e', skinD: '#c99670', hair: '#d9b25a', hairD: '#a8822a', hairL: '#f2d88a', eye: '#3a4a6a', style: 'short', coat: '#c8ccd6', coatD: '#8a90a0', under: '#e8c86a', collar: 'high', k: 1.08,
      gloveR: '#a8aebc', over: () => K.p('M110 300 C120 290 150 286 170 300 L160 330 L116 330Z', '#dfe3ea', INK, 3) + K.p('M230 300 C250 286 280 290 290 300 L284 330 L240 330Z', '#dfe3ea', INK, 3) },
    ash: { skin: '#cfa888', skinD: '#b48a6a', skinD2: '#9a7050', hair: '#e8e2ea', hairD: '#a8a2b0', hairL: '#ffffff', eye: '#c88a2a', style: 'elder', age: 1, coat: '#6a5a5a', coatD: '#4a3e3e', under: '#c8b090', collar: 'v', robe: true, light: 'lamp' },
    wen: { skin: '#f0d0b4', skinD: '#d8b090', skinD2: '#c09070', hair: '#dcd7e6', hairD: '#a9a3b8', hairL: '#ffffff', eye: '#3a2a20', style: 'scarf', scarf: '#c8584a', age: 1, coat: '#c8584a', coatD: '#9a3a32', under: '#f2e6cf', collar: 'v', robe: true, blush: 0.4 },
    doug: { skin: '#e2b496', skinD: '#c8957a', hair: '#7a5232', hairD: '#5a3a22', hairL: '#9a7252', eye: '#2a1a12', style: 'short', coat: '#4a6a8a', coatD: '#30506a', under: '#e8e2d0', collar: 'shirt', k: 1.06 },
    kage: { skin: '#d8b896', skinD: '#b89876', hair: '#1a1418', hairD: '#0a0608', hairL: '#3a3036', eye: '#c8a0ff', style: 'short', hood: '#2a2236', hoodD: '#18121f', coat: '#2a2236', coatD: '#18121f', under: '#5a4a7a', collar: 'v', robe: true },
    kevin: { skin: '#9aa6b8', skinD: '#7a869a', hair: '#9aa6b8', style: 'none', coat: '#9aa6b8', coatD: '#7a869a', collar: 'high', gloveL: '#7a869a', gloveR: '#7a869a',
      headOverride: () => K.r(140, 110, 120, 150, '#9aa6b8', INK, 3.5, null, 10) + K.r(152, 150, 96, 36, '#7a869a', INK, 2.5, null, 4) + K.c(200, 200, 14, '#ff5a5a', INK, 3) + K.r(152, 222, 96, 26, '#7a869a', INK, 2.5, null, 4) }
  });
  const sprite = (id, faces) => ({ faces: Object.fromEntries(faces.map(f => [f, K.fig(id, f, 'bust')])) });
  SD.vn.addSprites({
    noor: sprite('noor', ['neutral', 'smile', 'sad', 'shock', 'warm']),
    selvaria: sprite('selvaria', ['neutral', 'cold', 'unreadable', 'sad']),
    aurelian: sprite('aurelian', ['neutral', 'grief', 'sad', 'tired']),
    ash: sprite('ash', ['neutral', 'laugh', 'sad', 'amused']),
    wen: sprite('wen', ['neutral', 'smile', 'warm', 'sad']),
    doug: sprite('doug', ['neutral', 'tired', 'smile']),
    kage: sprite('kage', ['neutral', 'smirk']),
    hana: sprite('hana', ['neutral', 'smile', 'amused', 'warm', 'sad'])
  });
  Object.assign(SD.cast, {
    noor: { name: 'Noor Haddad', title: 'The twelfth Saint' }, selvaria: { name: 'Princess Selvaria', title: 'Regent of Halcyon' },
    aurelian: { name: 'Sir Aurelian', title: 'The Hero of Halcyon' }, ash: { name: 'Mother Ash', title: 'The seventh Saint' },
    wen: { name: 'Grandma Wen', title: 'The Cache Café' }, doug: { name: 'Doug', title: 'Ops, mostly' }, kevin: { name: 'Kevin', title: 'A bot' },
    kage: { name: 'Kagemaru', title: 'Card pins, cheap' }, citizen: { name: 'A citizen', title: 'Halcyon' }, lord: { name: 'Lord Brannick', title: 'Halcyon' },
    baker: { name: 'A baker', title: 'Halcyon' }, child: { name: 'A child', title: 'Halcyon' }, guard: { name: 'A cathedral guard', title: 'Halcyon' }
  });
  [['noor', 980], ['selvaria', 640], ['aurelian', 300], ['ash', 520], ['wen', 760], ['doug', 380], ['kevin', 1500], ['kage', 340], ['citizen', 600], ['lord', 330], ['baker', 820], ['child', 1250], ['guard', 420]].forEach(([w, hz]) => SD.ui.voice(w, hz));
  // Townsfolk speak with a figure too, so no line ever reaches for a painted portrait.
  Object.assign(K.cast, {
    citizen: { skin: '#e9c6a6', skinD: '#d2a888', hair: '#6b4426', hairD: '#4a2c16', hairL: '#8a6040', eye: '#3b2a20', style: 'short', coat: '#9a8a5a', coatD: '#7a6a3a', under: '#f1e7c6', collar: 'shirt' },
    lord: { skin: '#f0d6c4', skinD: '#dcb8a4', hair: '#8a8a92', hairD: '#6a6a72', hairL: '#b0b0b8', eye: '#3a2a20', style: 'slick', coat: '#6a2a4a', coatD: '#4a1a32', under: '#e8c86a', collar: 'high' },
    baker: { skin: '#a8724f', skinD: '#8a5a3a', hair: '#2a1d16', hairD: '#160c06', hairL: '#4a3a2a', eye: '#2a1a12', style: 'scarf', scarf: '#f2ece0', coat: '#f2ece0', coatD: '#d0c8b8', under: '#f2ece0', collar: 'v', robe: true },
    child: { skin: '#c99a76', skinD: '#ad7e5c', hair: '#3a2416', hairD: '#24140a', hairL: '#5a3a26', eye: '#2a1a12', style: 'messy', coat: '#7a9ad0', coatD: '#5a7ab0', under: '#f2efe8', collar: 'shirt', blush: 0.4 },
    guard: { skin: '#e2b496', skinD: '#c8957a', hair: '#3a2a20', hairD: '#24180e', hairL: '#5a4a3a', eye: '#2a1a12', style: 'short', coat: '#8a7a3a', coatD: '#6a5a2a', under: '#d8c890', collar: 'high' }
  });

  // ---------- Cutscene backgrounds ----------
  const { p, c, r, t, g } = K;
  const sky = (id, a, b) => ({ defs: K.lin(id, [[0, a], [1, b]]), body: r(0, 0, 1200, 1200, `url(#${id})`) });
  const S = {};
  // Kai's kitchen in our world, at night: a table under a lamp, a shoebox of receipts, a door with light under it.
  S['c3-kitchen'] = K.scene([sky('k1', '#3a2e3e', '#1a141e'),
    r(0, 760, 1200, 440, '#4a3a32'), r(140, 300, 300, 260, '#5a4a52', K.NIGHT, 4), r(170, 330, 240, 200, '#20304a'), K.stars(240, 200, 20, 5, 0.6).replace(/cx="(\d+)"/g, (m, x) => `cx="${+x + 170}"`),
    r(760, 260, 260, 520, '#6a4a3a', K.NIGHT, 4), K.glow('door', 890, 790, 240, '#fff2a8', 0.9), r(760, 770, 260, 14, '#fff6c8'),
    K.glow('lamp', 600, 420, 420, '#ffd88a', 0.5), p('M600 0 L600 300', null, K.NIGHT, 4), p('M540 300 L660 300 L630 340 L570 340Z', '#e8b86a', K.NIGHT, 4),
    r(300, 640, 600, 40, '#8a5a3a', K.NIGHT, 4), r(330, 680, 30, 200, '#6a4a2a'), r(840, 680, 30, 200, '#6a4a2a'),
    r(420, 580, 140, 64, '#c99a5a', K.NIGHT, 3), ...[0, 1, 2, 3, 4].map(i => r(436 + i * 22, 560 - (i % 2) * 10, 18, 30, '#f6efd8', K.NIGHT, 2)),
    r(640, 600, 120, 40, '#f6efd8', K.NIGHT, 2), p('M650 615 h90 M650 627 h70', null, '#6a6378', 3), c(820, 610, 22, '#e8e2d6', K.NIGHT, 3), K.vignette(1200, 1200, 0.6)]);
  // Halcyon at dusk under the barrier: honey-stone roofs, the cathedral's spires, a dome of gold light.
  const roofs = (y, col, n, seed) => { const R = K.rng(seed); let s = ''; for (let i = 0; i < n; i++) { const x = i * 1200 / n + R() * 30, w = 1200 / n + 10, h = 60 + R() * 90; s += r(x, y - h, w, h + 400, col, K.NIGHT, 3) + p(`M${x - 6} ${y - h} L${x + w / 2} ${y - h - 50} L${x + w + 6} ${y - h}Z`, '#a85a3a', K.NIGHT, 3); } return s; };
  const dome = { defs: K.rad('dome', [[0.7, '#ffd76a', 0], [0.95, '#ffd76a', 0.35], [1, '#fff2c0', 0.6]], 0.5, 1, 0.75), body: `<ellipse cx="600" cy="1000" rx="900" ry="900" fill="url(#dome)"/>` };
  const spires = g(r(480, 360, 240, 500, '#ece6da', K.NIGHT, 4) + [[520, 220], [600, 120], [680, 220]].map(([x, y]) => p(`M${x - 40} 380 L${x} ${y} L${x + 40} 380Z`, '#d9a740', K.NIGHT, 4)).join('') + c(600, 470, 46, '#7a5aa0', K.NIGHT, 4));
  S['c3-halcyon'] = K.scene([sky('h1', '#ff9a6a', '#5a3a6a'), K.stars(1200, 400, 30, 9, 0.5), spires, roofs(820, '#c8a870', 9, 4), roofs(980, '#b0905a', 7, 8), dome, r(0, 1000, 1200, 200, '#8a6a3a'), K.vignette(1200, 1200, 0.5)]);
  S['c3-square'] = K.scene([sky('s1', '#2a2050', '#5a3a6a'), K.stars(1200, 500, 50, 12, 0.7), spires, roofs(860, '#a8905a', 8, 2), dome,
    r(0, 900, 1200, 300, '#e2c67e'), p('M540 900 L560 560 L600 520 L640 560 L660 900Z', '#d8c49a', K.NIGHT, 4), K.glow('heart', 600, 700, 160, '#fff2a8', 0.8), K.vignette(1200, 1200, 0.55)]);
  S['c3-cathkitchen'] = K.scene([sky('ck', '#5a3a2a', '#2a1a14'), r(0, 0, 1200, 1200, '#6a4a3a', null, null, 0.4),
    ...[0, 1, 2, 3].map(i => r(140 + i * 240, 200, 160, 220, '#8a6a4a', K.NIGHT, 3)), r(0, 760, 1200, 440, '#4a3428'), r(200, 640, 800, 50, '#a87a4a', K.NIGHT, 4),
    r(860, 420, 220, 260, '#2a2a30', K.NIGHT, 4), K.glow('fire', 970, 600, 220, '#ff9a4a', 0.8), ...[0, 1, 2, 3, 4].map(i => c(260 + i * 140, 160, 26, '#b8a890', K.NIGHT, 3)), K.vignette(1200, 1200, 0.6)]);
  S['c3-abyss'] = K.scene([sky('ab', '#1a1620', '#0a080e'), ...[0, 1, 2, 3, 4, 5].map(i => p(`M${i * 220 - 60} 1200 L${i * 220 + 40} ${300 + (i % 3) * 120} L${i * 220 + 160} 1200Z`, '#2a2632', K.NIGHT, 3)),
    K.glow('ember', 600, 900, 380, '#ffaa50', 0.45), r(380, 820, 440, 80, '#3a3442', K.NIGHT, 3), ...Array.from({ length: 11 }, (_, i) => c(400 + i * 40, 800, 6, '#ffbe5a')), K.vignette(1200, 1200, 0.75)]);
  S['c3-camp'] = K.scene([sky('cp', '#2a2a50', '#4a3a5a'), K.stars(1200, 600, 60, 21, 0.8), r(0, 820, 1200, 380, '#5a5448'), r(1000, 0, 200, 1200, '#3a3446', K.NIGHT, 4),
    K.glow('cf', 560, 860, 300, '#ff9a4a', 0.7), p('M500 900 L560 760 L620 900Z', '#ffb238'), r(140, 640, 220, 200, '#3a3a42', K.NIGHT, 4), r(140, 560, 220, 16, '#7a5232'), r(300, 520, 30, 40, '#ffe082', K.NIGHT, 2, 0.8), K.vignette(1200, 1200, 0.6)]);
  S['c3-gallery'] = K.scene([sky('ga', '#3a2a5a', '#120c1c'), ...[0, 1, 2, 3, 4, 5].map(i => r(60 + i * 200, 100, 70, 1100, '#e4ddcf', K.NIGHT, 3)), c(600, 300, 140, '#7a5aa0', K.NIGHT, 5),
    K.glow('rose', 600, 300, 300, '#c8a0ff', 0.5), r(200, 700, 800, 40, '#c9b48a', K.NIGHT, 4), ...Array.from({ length: 16 }, (_, i) => p(`M${210 + i * 50} 740 v100`, null, K.NIGHT, 4)), K.glow('gold', 600, 1100, 500, '#ffd76a', 0.5), K.vignette(1200, 1200, 0.6)]);
  Object.assign(K.scenes || (K.scenes = {}), S);
  SD.vn.addScenes(Object.fromEntries(Object.keys(S).map(k => [k, { src: S[k], label: k }])));

  // ---------- Enemies ----------
  // Each is a body shape, colours, eyes and a tag, so the floors read as one family. 120 x 120, as js/art.js wants.
  const ST = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const eyes = (x1, x2, y, r0, mad) => `<circle cx="${x1}" cy="${y}" r="${r0 || 4}" fill="#fff" ${ST}/><circle cx="${x2}" cy="${y}" r="${r0 || 4}" fill="#fff" ${ST}/><circle cx="${x1 + 1}" cy="${y + 1}" r="1.8" fill="${INK}"/><circle cx="${x2 - 1}" cy="${y + 1}" r="1.8" fill="${INK}"/>${mad ? `<path d="M${x1 - 6} ${y - 7} L${x1 + 4} ${y - 4} M${x2 + 6} ${y - 7} L${x2 - 4} ${y - 4}" ${ST} fill="none"/>` : ''}`;
  const tag = (txt, col, y) => { const w = Math.max(40, txt.length * 5.2 + 10); return `<rect x="${60 - w / 2}" y="${y || 100}" width="${w}" height="15" rx="4" fill="#fff8e0" stroke="${col || INK}" stroke-width="2"/><text x="60" y="${(y || 100) + 11}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="${col || INK}">${K.esc(txt)}</text>`; };
  const BODY = {
    sack: col => `<path d="M30 104 Q18 64 46 46 L40 30 L80 30 L74 46 Q102 64 90 104Z" fill="${col}" ${ST}/><path d="M42 36 H78" ${ST} fill="none"/>`,
    barrel: col => `<path d="M30 30 Q24 66 30 104 H90 Q96 66 90 30Z" fill="${col}" ${ST}/><path d="M27 52 H93 M27 82 H93" ${ST} fill="none"/>`,
    shelf: col => `<path d="M22 22 H98 V106 H22Z" fill="${col}" ${ST}/><path d="M22 50 H98 M22 78 H98" ${ST} fill="none"/><rect x="30" y="34" width="10" height="14" fill="#fff8e0" ${ST}/><rect x="70" y="62" width="10" height="14" fill="#fff8e0" ${ST}/>`,
    ghost: col => `<path d="M24 108 L24 56 Q24 18 60 18 Q96 18 96 56 L96 108 L84 98 L72 108 L60 98 L48 108 L36 98Z" fill="${col}" ${ST} opacity="0.92"/>`,
    blob: col => `<path d="M16 104 Q10 58 60 44 Q110 58 104 104Z" fill="${col}" ${ST}/>`,
    crystal: col => `<path d="M60 10 L92 48 L78 106 H42 L28 48Z" fill="${col}" ${ST}/><path d="M60 10 L60 106 M28 48 L92 48" ${ST} fill="none" opacity=".5"/>`,
    robed: col => `<path d="M26 112 Q26 56 60 46 Q94 56 94 112Z" fill="${col}" ${ST}/><circle cx="60" cy="40" r="18" fill="#e9c6a6" ${ST}/>`,
    book: col => `<path d="M16 34 L60 44 L104 34 V100 L60 110 L16 100Z" fill="${col}" ${ST}/><path d="M60 44 V110" ${ST} fill="none"/><path d="M26 50 L50 55 M26 62 L50 67 M70 55 L94 50 M70 67 L94 62" stroke="#fff8e0" stroke-width="2" fill="none"/>`,
    bell: col => `<path d="M60 14 Q30 20 30 70 L20 96 H100 L90 70 Q90 20 60 14Z" fill="${col}" ${ST}/><circle cx="60" cy="102" r="7" fill="${col}" ${ST}/>`,
    hole: col => `<ellipse cx="60" cy="84" rx="48" ry="22" fill="#14101c" ${ST}/><path d="M24 80 Q60 20 96 80" fill="${col}" ${ST} opacity=".85"/>`,
    knight: col => `<path d="M28 112 L32 62 H88 L92 112Z" fill="${col}" ${ST}/><path d="M38 62 Q38 22 60 20 Q82 22 82 62Z" fill="#c8ccd6" ${ST}/><rect x="44" y="40" width="32" height="7" fill="${INK}"/>`
  };
  const FACEY = { sack: 70, barrel: 58, shelf: 92, ghost: 52, blob: 74, crystal: 56, robed: 40, book: 80, bell: 56, hole: 60, knight: 86 };
  function foe(id, body, col, label, o) {
    o = o || {};
    const fy = o.ey || FACEY[body];
    const svg = BODY[body](col) + (o.extra || '') + (o.noEyes ? '' : eyes(o.ex1 || 50, o.ex2 || 70, fy, o.er, o.mad)) + (label ? tag(label, o.tc, o.ty) : '') + (o.crown ? `<path d="M40 10 L46 -4 L54 8 L60 -8 L66 8 L74 -4 L80 10Z" fill="#ffd23f" ${ST}/>` : '');
    SD.art.addFoe('g-' + id, { col: o.sev || col, anim: o.anim || 'float', svg });
  }
  // Expedition I: the Cold Stores.
  foe('hoarder', 'sack', '#e2c88a', 'STANDARD · forever', { anim: 'squish', extra: `<path d="M86 60 L104 54 L100 70Z" fill="#ffd76a" ${ST}/>` });
  foe('frostbite', 'sack', '#cfe6f0', 'restore: 12 h', { extra: `<path d="M36 50 L44 58 M84 50 L76 58" stroke="#fff" stroke-width="3"/>` });
  foe('rot', 'blob', '#9ab06a', 'no lifecycle', { anim: 'squish', extra: `<circle cx="38" cy="90" r="5" fill="#6a8a3a"/><circle cx="84" cy="94" r="4" fill="#6a8a3a"/>` });
  foe('thousand', 'blob', '#e8d090', '1,000,000 PUTs', { anim: 'shake', extra: Array.from({ length: 9 }, (_, i) => `<circle cx="${22 + i * 10}" cy="${40 - (i % 3) * 8}" r="3" fill="#d8b060" ${ST}/>`).join('') });
  foe('minstay', 'robed', '#5a7ea6', 'min 30 days', { ey: 40, ex1: 54, ex2: 66, er: 3, extra: `<rect x="70" y="70" width="26" height="30" rx="3" fill="#fff8e0" ${ST}/><path d="M74 78 h18 M74 86 h14" stroke="${INK}" stroke-width="2"/>` });
  foe('quartermaster', 'robed', '#8a5a2a', 'class: ???', { ey: 40, ex1: 54, ex2: 66, er: 3, crown: false, extra: `<path d="M20 70 L40 64 L40 100 L20 104Z" fill="#cfe6f0" ${ST}/><path d="M100 70 L80 64 L80 100 L100 104Z" fill="#e2c88a" ${ST}/>` });
  foe('sack', 'sack', '#d8b878', 'object');
  foe('shelf', 'shelf', '#8a6a9a', 'NFS · many', { ey: 92 });
  foe('barrel', 'barrel', '#9a6a3a', 'block · one', {});
  foe('outerfarms', 'blob', '#7aa06a', 'half outside', { extra: `<path d="M60 44 V104" stroke="#fff" stroke-width="3" stroke-dasharray="6 5"/>` });
  foe('hotbarrel', 'barrel', '#d8583a', '64,000 IOPS', { mad: true, extra: `<path d="M44 24 Q50 10 46 0 M74 24 Q80 10 76 0" stroke="#ff9a3a" stroke-width="4" fill="none"/>` });
  foe('keeper', 'robed', '#6a7a3a', 'which store?', { ey: 40, ex1: 54, ex2: 66, er: 3, extra: `<rect x="16" y="76" width="18" height="22" fill="#d8b878" ${ST}/><rect x="86" y="76" width="18" height="22" fill="#8a6a9a" ${ST}/>` });
  // Expedition II: the Abyss.
  foe('hotkey', 'crystal', '#ff7a4a', 'PK = "SAINT"', { mad: true, anim: 'shake' });
  foe('ptexceeded', 'ghost', '#c8b0e8', 'Throughput Exceeded', { ty: 98 });
  foe('burst', 'blob', '#ffd24a', 'burst: 300 s', { anim: 'shake', extra: `<path d="M60 20 L66 36 L82 34 L70 44 L76 58 L60 50 L44 58 L50 44 L38 34 L54 36Z" fill="#fff2a8" ${ST}/>` });
  foe('writeshard', 'crystal', '#ff9a6a', 'SAINT#1 … #10', { extra: `<path d="M28 48 L92 48" stroke="#fff" stroke-width="2" stroke-dasharray="4 4"/>` });
  foe('singlesaint', 'robed', '#fff4d6', 'one partition', { ey: 40, ex1: 54, ex2: 66, er: 3, extra: `<circle cx="60" cy="18" r="22" fill="none" stroke="#ffd24a" stroke-width="4"/>` });
  foe('scan', 'ghost', '#a8c0e8', 'Scan · all of it', { ey: 50 });
  foe('filter', 'blob', '#c8a0d8', 'read 10,000 · kept 3', { extra: `<path d="M40 40 L80 40 L66 60 V76 L54 70 V60Z" fill="#fff8e0" ${ST}/>` });
  foe('lateindex', 'book', '#7a8aa8', 'GSI · 5 WCU', { ey: 80 });
  foe('secondsort', 'book', '#5a4a7a', 'LSI: too late', { ey: 80, mad: true });
  foe('catalogue', 'book', '#a8743a', 'Query? Scan?', { ey: 80, crown: false, extra: `<path d="M20 30 L10 20 M100 30 L110 20" ${ST}/>` });
  foe('staleread', 'ghost', '#d8e0c8', 'read: v6 (is v7)', {});
  foe('doublewriter', 'robed', '#6a8a7a', 'last write wins', { ey: 40, ex1: 54, ex2: 66, er: 3, extra: `<path d="M18 70 L36 84 M102 70 L84 84" stroke="${INK}" stroke-width="4"/><rect x="10" y="62" width="10" height="14" fill="#fff8e0" ${ST}/><rect x="100" y="62" width="10" height="14" fill="#fff8e0" ${ST}/>` });
  foe('ghost400', 'ghost', '#e8d8ff', '412 KB', { extra: `<path d="M30 70 Q60 90 90 70" fill="none" ${ST}/>` });
  foe('expiry', 'ghost', '#c8c0d0', 'TTL: soon-ish', { extra: `<circle cx="60" cy="84" r="12" fill="#fff8e0" ${ST}/><path d="M60 76 V84 L66 88" ${ST} fill="none"/>` });
  foe('sinkhole', 'hole', '#4a3a5a', 'TransactWrite…', { ey: 60 });
  // Expedition III: the Cathedral.
  foe('replicalag', 'robed', '#b8a8d8', 'a beat behind', { ey: 40, ex1: 54, ex2: 66, er: 3, extra: `<path d="M86 30 q8 -6 16 0 M90 22 q8 -6 16 0" stroke="${INK}" stroke-width="2" fill="none"/>` });
  foe('connstorm', 'blob', '#8ab0d8', '100 connections', { anim: 'shake', extra: Array.from({ length: 6 }, (_, i) => `<path d="M${20 + i * 16} 30 L${30 + i * 14} 48" stroke="#ffd24a" stroke-width="3"/>`).join('') });
  foe('standby', 'knight', '#c8ccd6', 'standby · no reads', { ey: 86 });
  foe('precentor', 'robed', '#e4ddcf', 'writer', { ey: 40, ex1: 54, ex2: 66, er: 3, extra: `<path d="M84 52 L96 30 L104 34" stroke="${INK}" stroke-width="3" fill="none"/>` });
  foe('grate', 'blob', '#3a3442', 'burned 14:05', { extra: `<path d="M30 70 V100 M45 64 V102 M60 62 V102 M75 64 V102 M90 70 V100" stroke="#ff9a3a" stroke-width="3"/>` });
  foe('fulltext', 'ghost', '#f0e8c8', 'LIKE %saint%', {});
  foe('wrongengine', 'shelf', '#7a5a3a', 'a tree in rows', { ey: 92, extra: `<path d="M40 28 L60 18 L80 28 M60 18 V12" stroke="#a6e070" stroke-width="3" fill="none"/>` });
  foe('archivist', 'book', '#3a5a4a', 'restore to 14:00', { ey: 80, extra: `<circle cx="60" cy="24" r="12" fill="#fff8e0" ${ST}/><path d="M60 18 V24 L56 28" ${ST} fill="none"/>` });
  foe('twelfthbell', 'bell', '#d9a740', 'BONG ×12', { anim: 'shake' });
  foe('shadow', 'knight', '#3a3048', 'the Drawing', { ey: 86, extra: `<path d="M92 70 L112 20" stroke="#c8ccd6" stroke-width="5"/>` });
  foe('selvaria', 'robed', '#3a2a5a', 'one Saint, one key', { ey: 40, ex1: 54, ex2: 66, er: 3, extra: `<path d="M44 26 L48 14 L54 22 L60 10 L66 22 L72 14 L76 26Z" fill="#d9a740" ${ST}/><path d="M60 56 L60 96" stroke="#ffd76a" stroke-width="4"/>` });
  foe('noorpart', 'robed', '#fff4d6', 'partition: NOOR', { ey: 40, ex1: 54, ex2: 66, er: 3, extra: `<circle cx="60" cy="18" r="20" fill="none" stroke="#ffd24a" stroke-width="3"/>` });
  foe('citizen', 'robed', '#9a8a5a', 'a day a year', { ey: 40, ex1: 54, ex2: 66, er: 3 });
  foe('ledger', 'book', '#6a2a4a', 'old records', { ey: 80 });
})();
