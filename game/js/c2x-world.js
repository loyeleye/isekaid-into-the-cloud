// Chapter 2, part 2: the rest of the Mailroom, after Expedition I and its camp (Story Bible 10-chapter-2-mailroom.md).
// Four places you walk, joined by the tower's lift: the camp at the tower's foot, floor 7 (the Dead Letter Office's
// front hall), floor 13 (the Inquisition's square) and floor 1 (Thornwick). Each expedition starts through a door:
//   Expedition II, the Dead Letter Office: the Clerks, the Stream Room, the Prayer Vault (js/c2x-data.js 'deadletter')
//   Expedition III, the Inquisition's Tower: the Square, the River Gate, the Stair, the Top of the Stair (Hale)
//   The reckoning, the Grey Novice: the back stairs and the bell (where Hale is bound with Bram's chain)
// What opens the way is something you understand: the clerk's bench opens floor 7's inner door; Bru's Compass
// (Ask the Logs) shows the passage to Hale's dispatch office; the evidence found on floor 13 is proved at the
// top of the stair, and each piece proved weakens Hale. The minigames are js/c2x-games.js, the art js/c2x-art.js.
// SD.chapterStart['2b'] starts it (part A's lift); it plays standalone with window.SD_CH = '2b' or ?vector&ch2b,
// and its end card hands over to SD.chapterStart[3]. The save is S.save.c2x (S.save.c2 is only read).
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const X = SD.c2x, XA = SD.c2xart, G = SD.c2xgames, A = SD.c2art;
  if (!X || !XA || !G || !A || !SD.scene) return;
  const W = SD.c2xworld = {};
  const U = SD.ui, S = SD.state, AU = SD.audio, R = SD.run, T = SD.ch1story, Q = SD.quiz;
  const $ = U.$, esc = s => U.esc(s);
  const STANDALONE = window.SD_CH === '2b' || /[?&]ch2b\b/.test(location.search);
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const ORDER = X.ORDER;

  // ---------- People ----------
  const CAST = { bru: { name: 'Bru', title: 'The Guild\'s receptionist' }, anselm: { name: 'Brother Anselm', title: 'Inquisition' },
    wren: { name: 'Elder Wren', title: 'The Free Cloud' }, inquisitor: { name: 'An inquisitor', title: '' }, clerk: { name: 'A clerk', title: 'Dead Letter Office' },
    pip: { name: 'Pip', title: 'A lost packet' }, tilly: { name: 'Tilly', title: 'Inquisition novice' }, hale: { name: 'Grand Inquisitor Hale', title: 'Thornwick' },
    marrow: { name: 'Goodwife Marrow', title: 'Thornwick\'s bell-ringer' } };
  Object.keys(CAST).forEach(k => { if (!SD.cast[k]) SD.cast[k] = CAST[k]; });
  if (U.voice) [['bru', 1000], ['anselm', 300], ['clerk', 700], ['inquisitor', 240]].forEach(([w, hz]) => U.voice(w, hz));

  // ---------- Save ----------
  const sv = () => S.save.c2x || (S.save.c2x = { f: {}, pos: null, letters: [], given: [], compass: false, choice: null });
  const flag = k => !!sv().f[k];
  const setFlag = k => { sv().f[k] = true; S.persist(); };
  const lead = () => (S.save.c1 && S.save.c1.lead) || 'mira';
  const mates = () => ORDER.filter(id => id !== lead());
  const who = w => (w === 'lead' ? lead() : w === 'mate1' ? mates()[0] : w === 'mate2' ? mates()[1] : w && SD.cast[w] ? w : 'narr');
  const txt = t => (t && typeof t === 'object' ? (t[lead()] || t.other) : t);
  // [speaker, text, face]: speaker 'lead' is you; a text can be { mira: ..., other: ... }.
  const L = lines => lines.map(([s, t, e]) => ({ s: who(s), t: txt(t), e }));
  const say = lines => U.dialog(L(lines));
  const SPR = new Set(['mira', 'kai', 'seoyeon', 'dutch', 'freya', 'coo', 'pip', 'seymour', 'uptima', 'tilly', 'marrow', 'hale', 'anselm', 'bru', 'faithful', 'bram']);
  // A short visual-novel scene (6 lines or fewer, skippable): speakers step on as they speak, two at a time.
  function vn(bg, lines) {
    const cmds = [['bg', bg]], on = [];
    lines.forEach(([s, t, e]) => {
      const id = s === 'narr' ? 'narr' : who(s), text = txt(t);
      if (id === 'narr' || !SPR.has(id)) { cmds.push(id === 'narr' ? ['narr', text] : ['narr', (SD.cast[id] ? SD.cast[id].name + ': ' : '') + text]); return; }
      if (!on.some(o => o.id === id)) {
        let side = on.length ? (on[on.length - 1].side === 'left' ? 'right' : 'left') : 'left';
        if (on.length >= 2) { const o = on.shift(); cmds.push(['hide', o.id]); side = o.side; }
        on.push({ id, side }); cmds.push(['show', id, e || 'neutral', side]);
      }
      cmds.push([id, text, e || 'neutral']);
    });
    on.forEach(o => cmds.push(['hide', o.id]));
    U.closePanel(); U.stage(null);
    return SD.vn.play(cmds);
  }

  // ---------- The map ----------
  // Four rooms side by side on one 119 x 28 grid, walled, with nothing between them: only the lift joins them.
  const MW = 119, MH = 28;
  const ROOMS = { camp: [0, 27], office: [29, 57], square: [59, 89], town: [91, 117] };
  const roomAt = x => Object.keys(ROOMS).find(r => x >= ROOMS[r][0] && x <= ROOMS[r][1]) || 'camp';
  const LIFT = { camp: [22, 12], office: [31, 4], square: [61, 4], town: [113, 4] };
  const ARRIVE = { camp: [22, 13], office: [31, 5], square: [61, 5], town: [113, 5] };
  const NAMES = { camp: 'The camp, at the tower\'s foot', office: 'Floor 7 · The Dead Letter Office', square: 'Floor 13 · The Inquisition\'s square', town: 'Floor 1 · Thornwick' };
  const BANNER = { camp: 'THE CAMP', office: 'FLOOR 7 · DEAD LETTERS', square: 'FLOOR 13 · THE SQUARE', town: 'FLOOR 1 · THORNWICK' };
  const PROPS = [];
  const BASE = (function build() {
    const g = [];
    for (let y = 0; y < MH; y++) g.push(Array(MW).fill('V'));
    const set = (x, y, c) => { if (x >= 0 && x < MW && y >= 0 && y < MH) g[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
    const prop = (kind, x, y, w, h, o) => {
      const p = Object.assign({ kind, x, y, w: w || 1, h: h || 1 }, o);
      PROPS.push(p);
      if (p.solid !== false) for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) set(x + i, y + j, '#');
      return p;
    };
    const room = (r, floor) => { const [x0, x1] = ROOMS[r]; rect(x0, 0, x1, MH - 1, 'T'); rect(x0 + 1, 1, x1 - 1, MH - 2, floor); };
    room('camp', 'x'); room('office', 'w'); room('square', 'c'); room('town', 'c');
    // Camp: the path through it, and a few dead trees.
    rect(1, 14, 26, 14, ',');
    [[3, 3], [8, 2], [25, 3], [2, 24], [25, 25], [10, 25]].forEach(([x, y]) => set(x, y, 'T'));
    // Floor 7: rows of pigeonholes between the desks.
    [[34, 12, 40], [46, 12, 54], [34, 23, 41], [47, 23, 54]].forEach(([x0, y, x1]) => rect(x0, y, x1, y, 'T'));
    // Floor 13: the river along the south wall, and Hale's dispatch office in the north-east corner (H: the hidden way).
    rect(60, 22, 88, 26, '~');
    rect(77, 1, 77, 8, 'T'); rect(86, 1, 86, 8, 'T'); rect(77, 8, 86, 8, 'T'); set(81, 8, 'H');
    // Thornwick: the square's flowers.
    [[96, 23], [104, 24], [111, 22]].forEach(([x, y]) => set(x, y, 'f'));
    // The lifts, and the doors out (X: floor 7's inner door, Y: the stair up the Inquisition's tower).
    Object.keys(LIFT).forEach(r => { const [x, y] = LIFT[r]; PROPS[r + 'Lift'] = prop('xlift', x, y - 2, 2, 2, { floor: { camp: 'C', office: '7', square: '13', town: '1' }[r] }); set(x, y, 'L'); set(x + 1, y, 'L'); });
    set(57, 14, 'X'); set(89, 13, 'Y');
    // ---- Props ----
    PROPS.bunker = prop('bunker', 19, 2, 3, 2);
    PROPS.fire = prop('firesite', 12, 16, 1, 1, { lit: true });
    PROPS.board = prop('xboard', 5, 19, 2, 1, { label: 'QUESTS' });
    PROPS.kitchen = prop('xkitchen', 14, 21, 2, 1);
    PROPS.design = prop('xdesign', 19, 19, 2, 1);
    [[4, 8], [24, 20], [9, 14]].forEach(([x, y]) => prop('lamp', x, y));
    PROPS.bench = prop('xbench', 42, 14, 2, 1);
    prop('xcounter', 35, 9, 3, 1); prop('xcounter', 45, 18, 3, 1);
    PROPS.chute = prop('xchute', 50, 2, 2, 2);
    PROPS.archive = prop('xarchive', 65, 2, 4, 2);
    PROPS.ledger = prop('xledger', 66, 19, 2, 1);
    prop('xferry', 70, 22, 3, 1);
    PROPS.desk = prop('xdesk', 81, 4, 2, 1);
    PROPS.post1 = prop('xhalepost', 72, 7); PROPS.post2 = prop('xhalepost', 64, 13);
    [[69, 9], [84, 11], [74, 20]].forEach(([x, y]) => prop('lamp', x, y));
    [[94, 3, '#8a7a9a'], [100, 3, '#7a8a9a'], [106, 3, '#9a8a7a'], [94, 17, '#8a9a8a'], [106, 17, '#a08a8a']].forEach(([x, y, color]) => prop('cottage', x, y, 3, 2, { color }));
    PROPS.bell = prop('belltower', 100, 16, 2, 3);
    PROPS.box = prop('postbox', 98, 10);
    [[97, 8], [110, 8], [104, 14], [97, 22]].forEach(([x, y]) => prop('lamp', x, y));
    return g.map(r => r.join(''));
  })();
  const groundCh = (map, x, y) => (y < 0 || y >= MH || x < 0 || x >= MW) ? 'V' : map[y][x];
  // What you can talk to: [x, y, name].
  const THINGS = { bunker: [20, 3, 'Seymour\'s bunker'], fire: [12, 16, 'The fire'], board: [5, 19, 'Bru\'s quest board'], kitchen: [14, 21, 'Kai\'s kitchen'], design: [19, 19, 'The Design Board'],
    bench: [42, 14, 'The clerk\'s bench'], chute: [50, 3, 'The prayer chute'],
    archive: [66, 3, 'The event archive'], ledger: [66, 19, 'The ferry ledger'], desk: [81, 4, 'Hale\'s dispatch desk'], post1: [72, 7, 'A poster'], post2: [64, 13, 'A poster'],
    d0: [95, 4, 'The Ashbys\' door'], d1: [101, 4, 'The Fenns\' door'], d2: [107, 4, 'The Coopers\' door'], d3: [95, 18, 'The Reeds\' door'], box: [98, 10, 'The post box'] };
  // The dead letters: spaced recall from Expedition I and before. Three on floor 7, three on floor 13.
  const LETTERS = [[36, 20], [53, 16], [40, 6], [64, 10], [84, 18], [75, 20]];
  const RECALL = ['sqsfifo', 'lambdasqs', 'snsfan', 'eventbridge', 'kinesis', 'mqmsk', 's3ver', 's3lock', 's3life'];
  const FAMILIES = [['d0', 'The Ashbys'], ['d1', 'The Fenns'], ['d2', 'The Coopers'], ['d3', 'The Reeds'], ['marrow', 'Goodwife Marrow']];

  // ---------- The scene ----------
  let sc = null, busy = false, zone = null, lastTile = '';
  const trail = [];
  const solidNow = () => 'TV#~' + (sv().compass ? '' : 'H');
  const phase = () => ({ camp: flag('uptima') && !flag('prayer') ? 'dusk' : 'night', office: 'night', square: 'day', town: 'morning' })[roomAt(sc && sc.P ? sc.P.x : 0)];
  function person(id, look, x, y, face, extra) {
    const a = sc.addActor(id, Object.assign({ x, y, face: face || 'south', speed: 3.2 }, extra));
    a.look = look;
    a.draw = (ctx, fx, fy, ts, t) => A.person(ctx, a.look, fx, fy, ts, t, a.face, a.moving || (a.path && a.path.length), a.o);
    return a;
  }
  const letterShown = i => !sv().letters.includes(i) && flag(i < 3 ? 'start' : 'seen13');

  function makeScene() {
    const map = BASE.slice();
    const lights = () => {
      const l = [];
      PROPS.forEach(p => { if (p.kind === 'lamp') l.push([p.x + 0.5, p.y + 0.2, 1.8, '255,200,120', 0]); });
      l.push([12.5, 16.6, 3, '255,140,60', 1], [51, 3, 1.6, '255,215,110', 1]);
      LETTERS.forEach(([x, y], i) => { if (letterShown(i)) l.push([x + 0.5, y + 0.5, 1, '255,230,150', 1]); });
      if (sv().compass) l.push([81.5, 8.5, 1.4, '255,215,106', 1]);
      return l;
    };
    const def = {
      map, solid: solidNow(), doors: { L: 'lift', X: 'office', Y: 'stair' }, ground: false, bg: '#0b0a14', clock: false,
      grade: (ctx, t, vw, vh, cx, cy, ts) => A.grade(ctx, t, vw, vh, cx, cy, ts, phase(), lights(), false),
      ambience: () => (sc && sc.P && Math.abs(sc.P.x - 12) + Math.abs(sc.P.y - 16) < 6) ? 'fire' : zone && zone[0] === 'town' ? 'post' : null,
      under(ctx, ts, t, x0, x1, y0, y1) {
        const comp = !!sv().compass;
        for (let y = Math.max(0, y0); y <= Math.min(y1, MH - 1); y++) for (let x = Math.max(0, x0); x <= Math.min(x1, MW - 1); x++) {
          const c = groundCh(map, x, y), r = roomAt(x);
          if (XA.ground(ctx, c, x, y, ts, t, comp)) continue;
          const base = c === 'T' || c === '#' ? (r === 'office' ? 'w' : r === 'camp' ? 'x' : 'c') : c;
          if (base === 'w') { XA.ground(ctx, 'w', x, y, ts, t, comp); continue; }
          A.ground(ctx, base, x, y, ts, t, (dx, dy) => groundCh(map, x + dx, y + dy), false);
        }
      },
      rowDraw(ctx, y, ts, t, x0, x1) {
        if (y < 0 || y >= MH) return;
        for (let x = Math.max(0, x0); x < Math.min(x1, MW); x++) if (map[y][x] === 'T') {
          const r = roomAt(x);
          if (!XA.wall(ctx, x, y, ts, t, r)) A.wall(ctx, x, y, ts, t, r === 'camp' ? 'edge' : 'town');
        }
        PROPS.forEach(p => { if (p.y + p.h - 1 === y && p.x + p.w >= x0 - 1 && p.x <= x1) A.prop(ctx, p, ts, t, false); });
        LETTERS.forEach(([x, ly], i) => { if (ly === y && letterShown(i)) A.prop(ctx, { kind: 'letter', x, y }, ts, t, false); });
      },
      doorFor(tx, ty) {
        const a = Object.values(sc.actors).find(o => o.thing && !o.hidden && Math.abs(o.x - tx) <= 1 && Math.abs(o.y - ty) <= 2);
        return a ? beside(a.id) : null;
      },
      overlay(ctx, t, vw, vh) { drawOverlay(ctx, t, vw, vh); }
    };
    sc = SD.scene.create($('#w-canvas'), def);
    const pos = sv().pos || ARRIVE.office;
    const P = sc.player(pos[0], pos[1], 'south');
    P.draw = (ctx, fx, fy, ts, t) => A.person(ctx, lead(), fx, fy, ts, t, P.face, P.moving, null);
    mates().forEach(id => person(id, id, pos[0], pos[1], 'south', { solid: false, talk: false }));
    Object.keys(THINGS).forEach(id => { const [x, y, label] = THINGS[id]; sc.addActor(id, { x, y, thing: true, label, draw: () => {} }); });
    LETTERS.forEach(([x, y], i) => sc.addActor('letter' + i, { x, y, thing: true, solid: false, draw: () => {} }));
    // Camp.
    person('uptima', 'uptima', 16, 21, 'west', { name: 'Uptima' });
    person('wren', 'wren', 13, 18, 'north', { name: 'Elder Wren' });
    person('bru', 'bru', 7, 19, 'west', { name: 'Bru' });
    person('anselm', 'anselm', 9, 11, 'south', { name: 'Brother Anselm' });
    person('seymour', 'seymour', 23, 4, 'west', { name: 'Sir Seymour' });
    // Floor 7.
    person('clerk1', 'clerk', 36, 8, 'south', { name: 'A clerk' }); person('clerk2', 'clerk', 46, 17, 'south', { name: 'A clerk' });
    // Floor 13.
    person('inq1', 'inquisitor', 72, 12, 'south', { name: 'An inquisitor' }); person('inq2', 'inquisitor', 82, 14, 'west', { name: 'An inquisitor' });
    person('v1', 'villager', 70, 16, 'east'); person('v2', 'villager2', 74, 17, 'north'); person('v3', 'villager3', 77, 15, 'west');
    // Thornwick.
    person('tilly', 'tilly', 96, 12, 'east', { name: 'Tilly', speed: 1.6 });
    person('marrow', 'marrow', 102, 19, 'south', { name: 'Goodwife Marrow' });
    sc.addActor('ctl', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {}, tick });
    sc.onTalk = id => talk(id);
    sc.onDoor = d => door(d);
    applyState();
  }

  // Put the world in step with the story.
  function applyState() {
    if (!sc) return;
    const A2 = sc.actors;
    sc.def.solid = solidNow();
    PROPS.archive.open = flag('ev1');
    A2.uptima.hidden = !flag('dlo');
    A2.wren.hidden = !flag('dlo');
    A2.bru.hidden = !flag('dlo');
    A2.board.hidden = !flag('dlo');
    A2.anselm.hidden = !flag('freed') || flag('grey');
    A2.tilly.hidden = !flag('tower') || (flag('choice') && sv().choice === 'keep');
    LETTERS.forEach((l, i) => { A2['letter' + i].hidden = !letterShown(i); });
    refresh();
  }
  function refresh() {
    if (!sc) return;
    const A2 = sc.actors, s = step();
    const nextId = s[2];
    Object.values(A2).forEach(a => { if (a.thing && THINGS[a.id]) { a.marker = a.id === nextId; a.name = a.marker ? THINGS[a.id][2] : null; } });
    ['uptima', 'bru', 'anselm', 'tilly', 'marrow'].forEach(id => { A2[id].marker = id === nextId; });
    hud();
  }

  // ---------- Every frame ----------
  function tick() {
    const P = sc.P; if (!P) return;
    const k = P.x + ',' + P.y;
    if (k !== lastTile) {
      if (lastTile) { const [x, y] = lastTile.split(',').map(Number); if (Math.abs(x - P.x) + Math.abs(y - P.y) <= 1) trail.unshift([x, y]); else trail.length = 0; trail.length = Math.min(trail.length, 6); }
      lastTile = k;
      if (!busy) { sv().pos = [P.x, P.y]; S.persist(); }
      const r = roomAt(P.x);
      if (!zone || zone[0] !== r) {
        const first = zone === null; zone = [r];
        if (!busy) AU.music(music(r));
        if (!first) banner(BANNER[r]);
        refresh();
      }
    }
    mates().forEach((id, i) => {
      const a = sc.actors[id], to = trail[i];
      if (!a || a.scripted || a.moving || a.path.length) return;
      if (!to) { if (Math.abs(a.x - P.x) + Math.abs(a.y - P.y) > 3) sc.place(id, P.x, P.y); return; }
      if (a.x !== to[0] || a.y !== to[1]) { a.speed = 7.5; a.path = [to]; }
    });
    const t2 = sc.actors.tilly;
    if (!t2.hidden && !t2.scripted && !t2.path.length && !t2.moving && !busy) { const to = t2.x <= 95 ? 112 : 95; t2.path = straight(t2.x, t2.y, to, t2.y); }
    if (busy || P.moving || P.path.length) return;
    LETTERS.forEach(([x, y], i) => { if (letterShown(i) && P.x === x && P.y === y) act(() => pickLetter(i)); });
  }
  const music = r => ({ camp: 'camp', office: 'c2xexplore', square: 'c2xexplore', town: 'c2xtown' })[r];
  const straight = (x0, y0, x1, y1) => { const out = []; let x = x0; while (x !== x1) { x += Math.sign(x1 - x); out.push([x, y0]); } return out; };
  function banner(text) {
    const el = document.createElement('div');
    el.className = 'w-zone'; el.textContent = text;
    $('#screen-world').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  // The yellow arrow at the screen's edge, toward the next step (or the lift, when it's on another floor).
  function drawOverlay(ctx, t, vw, vh) {
    if (!sc) return;
    const { cx, cy } = sc.cam(), ts = Math.max(vw / 15, vh / 13) >= 44 ? 48 : 32;
    const tg = target();
    if (tg && !busy) {
      const X2 = (tg[0] + 0.5) * ts - cx, Y2 = (tg[1] + 0.5) * ts - cy, m = 28;
      if (X2 < m || X2 > vw - m || Y2 < m || Y2 > vh - m) {
        const ax = vw / 2, ay = vh / 2, dx = X2 - ax, dy = Y2 - ay, k = Math.min((vw / 2 - m) / Math.abs(dx || 1), (vh / 2 - m) / Math.abs(dy || 1));
        const px = ax + dx * k, py = ay + dy * k, a = Math.atan2(dy, dx), pulse = 1 + 0.12 * Math.sin(t * 5);
        ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.scale(pulse, pulse);
        ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
  }

  // Run a scene with the controls locked.
  async function act(fn) {
    if (busy || !sc) return;
    busy = true; sc.locked = true; sc.pause();
    try { await fn(); } catch (e) { console.error(e); }
    finally { busy = false; if (sc) { sc.locked = false; sv().pos = [sc.P.x, sc.P.y]; applyState(); } S.persist(); }
  }
  const open = (x, y) => !solidNow().includes(sc.tile(x, y)) && !'LXY'.includes(sc.tile(x, y));
  function beside(id) {
    const a = sc.actors[id];
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) {
      const x = a.x + dx, y = a.y + dy;
      if (open(x, y) && !Object.values(sc.actors).some(o => o !== a && !o.hidden && !o.player && o.solid !== false && o.x === x && o.y === y)) return [x, y];
    }
    return [a.x, a.y + 1];
  }
  const faceTo = (a, b) => { const A1 = sc.actors[a], B = sc.actors[b]; if (!A1 || !B) return; const dx = B.x - A1.x, dy = B.y - A1.y; A1.face = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north'); };
  // Move the party somewhere (a lift ride, or home from an expedition).
  function moveTo(r, xy) {
    const [x, y] = xy || ARRIVE[r];
    sc.place('you', x, y); mates().forEach(id => sc.place(id, x, y));
    trail.length = 0; lastTile = ''; sv().pos = [x, y]; S.persist();
  }
  const ask = (q, title, ctx) => Q.ask(Object.assign({ type: 'mc' }, q), { title, context: ctx || 'Spaced recall' }).then(r => !!(r && r.ok));

  // ---------- The story ----------
  async function opening() {
    AU.music('c2xexplore');
    await vn('c2x-office', [
      ['narr', 'Floor 7. The lift opens on the Dead Letter Office: pigeonholes to the ceiling, a clerk at every desk, and not one letter answered.'],
      ['seoyeon', 'They\'re prayers. All of them.', 'sad'],
      ['kai', 'That clerk gave up after three seconds. They all do.', 'anger'],
      ['dutch', 'Then we find out why. There\'s a bench over there with a clerk on it.', 'neutral'],
      ['mira', 'And somewhere at the bottom of all this, someone reads them.', 'cold']
    ]);
    setFlag('start');
  }
  async function bench() {
    if (flag('bench')) return say([['narr', 'The clerk on the bench works at 1,769 MB now, and finishes his sacks in time. He still looks tired.']]);
    await say([['narr', 'A clerk on a workbench, wired to a meter. A label on him reads: 128 MB · TIMEOUT 3 s. He\'s halfway through a sack, and about to be cut off.']]);
    const ok = await G.bench();
    setFlag('bench');
    R.gainXp(ok ? 20 : 10);
    AU.sfx('x-stamp'); U.flash();
    await say([['narr', 'Somewhere at the east end of the hall, a lock thuds open.'], ['lead', { mira: 'Sized right, he finishes. That\'s all they needed.', other: 'Sized right, he finishes. That\'s all they needed.' }]]);
    U.system('THE INNER DOOR', 'The door at the east end of floor 7 is open: the way into the Dead Letter Office.', 'gold');
  }
  async function innerDoor() {
    if (!flag('bench')) {
      await say([['narr', 'Locked. A brass plate: STAFF ONLY. CLERKS MUST BE SIZED BEFORE ENTRY.']]);
      return moveTo('office', [56, 14]);
    }
    sv().f.f7 = true; S.persist();
    const went = await expedition('deadletter');
    if (!went) moveTo('office', [56, 14]);
  }
  async function stairDoor() {
    const n = ['ev1', 'ev2', 'ev3'].filter(flag).length;
    if (n < 3) await say([['dutch', `We have ${n} of the 3 pieces. We can climb without the rest, but he'll be stronger for every piece we haven't got.`, 'stone']]);
    sv().f.f13 = true; S.persist();
    const went = await expedition('inqtower');
    if (!went) moveTo('square', [88, 13]);
  }

  // After Expedition II: the midpoint, in two short scenes.
  async function midpoint() {
    AU.music('c2xsad');
    await vn('c2x-vault', [
      ['narr', 'At the bottom of the Prayer Vault, in the backlog, with the prayers still pouring over her, sits Uptima. In chains.'],
      ['uptima', 'Freya put me here. "You didn\'t want to hear complaints, love. Now you can hear all of them."', 'sad'],
      ['uptima', 'I have no grants left. I\'m asking the four people who tried to kill me for help.', 'sad'],
      ['kai', 'Give me one reason.', 'anger'],
      ['mira', 'Nobody gets left in there. Not even you.', 'cold'],
      ['narr', 'Mira breaks the chain. It\'s the healer in her, not forgiveness. Forgiveness isn\'t on offer.']
    ]);
    AU.sfx('x-chain');
    await vn('c2x-vault', [
      ['narr', 'In the same vault, Mira finds two prayers from the same night.'],
      ['narr', 'Her own, still sealed: "Not him. Take the rest of me, not him."'],
      ['narr', 'And one from the tower: "Let me get the girl out." It\'s signed by Brother Anselm.'],
      ['mira', 'He was there.', 'shock'],
      ['dutch', 'Then he\'s alive. And he saw it.', 'stone']
    ]);
  }
  async function uptima() {
    if (flag('uptima')) {
      if (flag('prayer')) return say([['uptima', 'I read twelve more last night. One was about a goat. I answered it.', 'neutral']]);
      return say([['uptima', rnd(['I read some of the backlog every night. It\'s mostly about the weather.', 'The pots are clean. Don\'t look at me like that.']), 'sad']]);
    }
    await say([
      ['narr', 'Uptima comes into camp, and everyone looks away. Elder Wren is the only one who stands up. She can\'t look at him.'],
      ['kai', 'Kitchen. You can start on the pots.', 'anger'],
      ['uptima', 'I did this at the Cache Café. Part time.', 'sad'],
      ['uptima', 'I brought the backlog. I\'ll read some of it every night.', 'neutral']
    ]);
    AU.music('freya');
    await vn('c2-fire', [
      ['narr', 'That night Freya visits the camp: a smiling projection over the fire.'],
      ['freya', 'Oh good, you found her! Is she listening yet?', 'smile'],
      ['freya', 'Tilly could be here tonight, love. Safe. One little grant.', 'neutral'],
      ['mira', 'Please leave.', 'cold'],
      ['narr', 'Freya leaves. Freya always does what she\'s asked.']
    ]);
    setFlag('uptima');
    AU.music('camp');
  }
  // Pip's "Why did that work?", after each expedition.
  async function pip(c, k) {
    await say([['pip', 'Why did that work? I was there and I still don\'t know.', 'neutral']]);
    const q = X.pickQ(c);
    if (q) { const ok = await ask(q, 'WHY DID THAT WORK?', 'Pip asks'); R.gainXp(ok ? 12 : 5); await say([['pip', ok ? 'Oh! So it was on purpose.' : 'So it wasn\'t luck. Good. I hate luck.', ok ? 'happy' : 'neutral']]); }
    setFlag(k);
  }
  async function bru() {
    if (flag('bru')) return say([['bru', rnd(['I always know where everyone is. Right now, Hale is on floor 13.', 'The Compass points where they walked. Not where they want you to think they walked.']), 'smile']]);
    await say([
      ['bru', 'I logged every prayer at that desk for years. I know who reads them: Freya. Every one, every night.', 'tired'],
      ['bru', 'Want to see? We ask the logs. If the lines are tidy, the logs can answer anything.', 'neutral']
    ]);
    const ok = await G.logs();
    const q = SD.qpick(['dva-4-673'], { c: 'datatrail' });
    if (q) await ask(q, 'WHO READS THE PRAYERS?', 'Bru asks');
    sv().compass = true; setFlag('bru');
    R.gainXp(ok ? 20 : 10);
    AU.sfx('sparkle'); U.flash();
    await say([['bru', 'Read logging is on for the prayer queue now. Every read, written down. And take this: it points where people really walked.', 'smile']]);
    U.system('NEW: BRU\'S COMPASS', 'It shows the ways people really walked, even through walls they hide. On floor 13, look for footprints.', 'gold');
  }
  async function design() {
    if (flag('design')) return say([['narr', 'Thornwick\'s post as it should have been: a topic, a queue per village, a dead-letter queue on each, and a bell on every one.']]);
    if (!flag('dlo')) return say([['narr', 'A whiteboard on an easel. Nobody has drawn anything on it yet.']]);
    const ok = await G.design();
    setFlag('design');
    R.gainXp(ok ? 25 : 12);
    U.system('THE LIFT', 'Floor 13 is open: the Inquisition\'s tower. Take the lift.', 'gold');
  }
  async function fire() {
    if (flag('freed') || !flag('uptima')) return say([['narr', 'The fire. Someone has left a pot of Kai\'s stew on the stones.']]);
    if (!flag('tillyPair')) {
      await vn('c2-marsh', [
        ['narr', 'The night after the burning field. Tilly burned a "beast nest" on the town floor, and Mira watched from the reeds.'],
        ['mira', 'She\'s better off hating a beast than having one for a mother.', 'tired'],
        ['seoyeon', 'I was raised by the man who burned my family. He was kind to me every day for eight years.', 'sad'],
        ['seoyeon', 'When she finds out, she won\'t need someone who\'s right. She\'ll need someone who doesn\'t make her choose.', 'neutral'],
        ['mira', 'How old were you?', 'sad'],
        ['narr', '"Seventeen." Mira does the sum. Tilly is fifteen.']
      ]);
      return setFlag('tillyPair');
    }
    if (flag('choice') && !flag('prayer')) return prayerNight();
    return say([['narr', 'The fire. Someone has left a pot of Kai\'s stew on the stones.']]);
  }
  async function whatHeFelt() {
    await vn('c2-fire', [
      ['narr', 'That night, at camp. On the stair, Kai grabbed Mira\'s beast arm to pull her clear, and the Unmaking flared.'],
      ['narr', 'For one second he felt the stair, the men on it, and how good letting it out felt.'],
      ['mira', 'Now you know.', 'tired'],
      ['kai', 'At the barrier, with my hand on Hana, there was one second when I didn\'t care about the hundred thousand.', 'grief'],
      ['kai', 'I only took my hand away because the twelfth Saint was watching. Now you know.', 'sad'],
      ['narr', 'Neither of them tells anyone.']
    ]);
    setFlag('felt');
  }

  // Floor 13: the evidence.
  async function square() {
    await say([
      ['narr', 'Floor 13: the Inquisition\'s tower, rebuilt. The square, the river gate, and the stair Bram died on.'],
      ['mira', 'He died on that stair.', 'grief'],
      ['dutch', 'Then we don\'t go up it guessing. Three things would hang him: his order, the ferry ledger, his own report.', 'stone']
    ]);
    setFlag('seen13');
  }
  async function archive() {
    if (flag('ev1')) return say([['narr', 'The archive\'s door stands open. Inside, the evening of the tower, replayed and written down.']]);
    await say([['narr', 'The Inquisition\'s event archive: every event its bus carried, kept.']]);
    const ok = await G.archive();
    setFlag('ev1'); R.gainXp(ok ? 20 : 10);
    await say([['narr', 'THE ORDER FOR THE TOWER. Hale\'s command went out on the bus at dusk. His men were waiting before Bram arrived.'], ['dutch', 'One.', 'stone']]);
  }
  async function ledger() {
    if (flag('ev2')) return say([['narr', 'The ferry ledger, in order. Tilly, out through the river gate, at the second hour.']]);
    await say([['narr', 'The ferry\'s ledger, chained to its post. Every crossing, in a FIFO log.']]);
    const ok = await G.ledger();
    setFlag('ev2'); R.gainXp(ok ? 20 : 10);
    await say([['narr', 'THE FERRY LEDGER. Tilly, carried out through the river gate at the second hour, while the beast was still on the stair.'], ['mira', 'Someone carried her out.', 'shock']]);
  }
  async function desk() {
    if (flag('ev3')) return say([['narr', 'Hale\'s desk. His seal, his ink, his dispatches in a neat stack.']]);
    const ok = await G.report();
    setFlag('ev3'); R.gainXp(ok ? 20 : 10);
    await vn('c2x-archive', [
      ['narr', 'HALE\'S REPORT: "The beast killed Bram Holloway." It was sent before the fight on the stair ended. Dutch reads the rest by their dates.'],
      ['dutch', 'Your man never stood a chance. That one isn\'t on you.', 'stone'],
      ['dutch', 'The ones on the stair are.', 'stone'],
      ['mira', 'Yes.', 'tired'],
      ['dutch', 'Okay.', 'neutral'],
      ['narr', 'He doesn\'t say anything else. It\'s the kindest thing anyone has done for her in two years.']
    ]);
  }
  // The confrontation at the top of the stair (the 'evidence' line of the last floor's intro): each piece found is a
  // question every player answers on their own screen, and each one proved weakens Hale.
  const PROOF = {
    ev1: { c: 'ebarchive', q: 'Hale says no order went out that night. How do you show what the Inquisition\'s bus carried at dusk last year?',
      opts: ['Replay the bus\'s archive for that evening to a rule that records each event', 'Read the bus\'s CloudWatch metrics for that evening', 'Look in the dead-letter queue of the rule\'s target', 'Send the order again and see who answers'], a: 0,
      no: [null, 'Metrics count events; they don\'t keep what the events said.', 'Only events that failed to deliver land there, and his order was delivered.', 'That makes a new event. It proves nothing about last year.'],
      why: 'An EventBridge archive keeps the events a bus received. Replaying a time window sends those same events again, to the rules you choose, so you can see exactly what went out.',
      eli5: 'The town crier kept a recording of everything he shouted. Play back that evening, and everyone hears the order again.' },
    ev2: { c: 'msgattr', q: 'Why can you trust the ferry ledger\'s order for Tilly\'s crossing?',
      opts: ['It\'s a FIFO queue, which keeps the order within a message group', 'Standard queues always deliver in the order sent', 'The ferryman wrote the times by hand', 'Every message in a queue has a sequence number'], a: 0,
      no: [null, 'A standard queue gives best-effort order, so it can shuffle.', 'Hand-written times are only as honest as the hand.', 'Only FIFO queues give messages sequence numbers.'],
      why: 'An SQS FIFO queue delivers the messages of one message group in the exact order they were sent, so the ferry\'s crossings read back in sequence.',
      eli5: 'The ferry tickets were on one spike, newest on top. Nobody could slip a ticket into the middle.' },
    ev3: { c: 'msgattr', q: 'Which attribute shows when Hale\'s report was first sent, however many times it was received after?',
      opts: ['SentTimestamp', 'ApproximateFirstReceiveTimestamp', 'ApproximateReceiveCount', 'The message\'s visibility timeout'], a: 0,
      no: [null, 'That\'s when it was first received, not sent.', 'That counts receives. It says nothing about when.', 'That\'s how long it hides after a receive.'],
      why: 'SentTimestamp is set by SQS when the message is sent, and it never changes. His report was sent before the fight on the stair ended.',
      eli5: 'The postmark goes on when the letter is posted. Opening it again later doesn\'t change the postmark.' }
  };
  let haleBase = null;
  async function confront() {
    const found = ['ev1', 'ev2', 'ev3'].filter(flag);
    if (!found.length) return U.dialog(L([['hale', 'You have nothing. Thornwick knows what I protected them from.', 'smile'], ['narr', 'Hale fights at full strength.']]));
    await U.dialog(L([['hale', 'A beast came for this town, and I stopped it. That\'s all there is.', 'smile'], ['dutch', 'Then you won\'t mind us showing them.', 'stone']]));
    const keep = $('#panel') ? [...$('#panel').childNodes] : [], hid = $('#panel') && $('#panel').hidden;
    let proved = 0;
    try {
      for (const k of found) { if (await ask(PROOF[k], 'THE EVIDENCE', 'Prove it')) proved++; }
    } finally { const p = $('#panel'); if (p) { p.innerHTML = ''; keep.forEach(n => p.appendChild(n)); p.hidden = hid; } }
    const e = SD.enemies.hale;
    if (haleBase === null) haleBase = e.sev;
    e.sev = Math.round(haleBase * (1 - 0.12 * proved));
    await U.dialog(L([
      ['narr', proved ? `${proved} of ${found.length} proved. In the square below, people take back their grants, and Hale's light dims.` : 'Nothing proved. Hale just fights at full strength.'],
      ['tilly', 'I heard all of it.', 'cold'],
      ['narr', 'She doesn\'t believe it yet. She keeps listening.']
    ]));
  }
  async function haleEscapes() {
    AU.music('c2xsad');
    await vn('c2x-stair', [
      ['narr', 'Beaten, Hale runs up the tower, past the bell, and is gone.'],
      ['narr', 'Tilly stays on the town floor. She goes with nobody.'],
      ['tilly', 'I heard all of it. That doesn\'t mean I believe it.', 'cold'],
      ['mira', 'I know.', 'grief']
    ]);
  }

  // Thornwick: the letters from Freya's basket, door by door, then the last one.
  async function arriveTown() {
    await say([
      ['narr', 'Thornwick, floor 1. Mira has Freya\'s basket of letters: one for every family Hale turned against her.'],
      ['lead', { mira: 'I\'ll take them myself. Door by door.', dutch: '(Carry the bag. Say nothing.)', kai: 'I\'ll cook for every house. It\'s what I can do.', seoyeon: 'I\'ll bow at every door.', other: 'Door by door, then.' }]
    ]);
    setFlag('f1');
  }
  const delivered = id => (sv().given || []).includes(id);
  async function deliver(id) {
    if (!flag('f1')) return say([['narr', 'A closed door.']]);
    if (delivered(id)) return say([['narr', 'The door stays shut. The letter is gone from the step, though.']]);
    const i = FAMILIES.findIndex(f => f[0] === id), name = FAMILIES[i][1];
    const angle = { dutch: ['narr', 'Dutch carries the bag, and says nothing.'], kai: ['narr', 'Kai leaves a pot of stew on the step.'], seoyeon: ['narr', 'Seo-yeon bows at the door, low and long.'],
      mira: ['mira', ['(I held your baby once.)', '(I bought bread from you every week.)', '(Bram fixed your roof.)', '(You sang at our wedding.)', '(You were kind to me, once.)'][i], 'sad'] }[lead()];
    const react = [['narr', `${name}' door opens a crack, and slams.`], ['narr', `${name} take the letter without a word.`], ['narr', `${name} won't open the door. The letter goes under it.`], ['narr', `${name} read it on the step, and close the door gently.`]];
    if (id === 'marrow') await say([['narr', 'Goodwife Marrow reads hers on the step. Then she picks up a stone and throws it.'], angle, ['narr', 'It misses. On purpose.']]);
    else await say([['narr', `Mira knocks. "A letter for ${name}."`], angle, react[i]]);
    sv().given = (sv().given || []).concat(id); S.persist();
    AU.sfx('x-stamp');
    if (FAMILIES.every(f => delivered(f[0]))) await say([['narr', 'One letter left in the bag: the one Mira wrote to Tilly, and never sent.']]);
  }
  async function tilly() {
    if (!flag('f1') || !FAMILIES.every(f => delivered(f[0]))) return say([['tilly', 'Inquisition business. Move along.', 'cold']]);
    if (flag('choice')) return say([['tilly', sv().choice === 'give' ? 'I read it. You\'re still lying.' : 'Move along.', 'cold']]);
    await say([['narr', 'Tilly, with her pole-net over her shoulder. She looks straight through Mira.']]);
    const pick = await new Promise(res => {
      const b = U.panel(`<p>The last letter in the bag is the one Mira wrote to Tilly, and never sent.</p>
        <div class="opts"><button class="opt" id="xc-give"><b>Give it to her</b></button><button class="opt" id="xc-keep"><b>Keep it</b></button></div>`, { title: 'THE LAST LETTER', noClose: true });
      b.querySelector('#xc-give').onclick = () => { U.closePanel(); res('give'); };
      b.querySelector('#xc-keep').onclick = () => { U.closePanel(); res('keep'); };
    });
    sv().choice = pick; setFlag('choice');
    if (pick === 'give') await say([['narr', 'Tilly reads it in front of Mira, all the way to the end.'], ['tilly', 'You\'re lying.', 'anger'], ['narr', 'She keeps it.']]);
    else await say([['narr', 'Mira puts the letter back in the bag. Tilly walks back to the Inquisition\'s door.'], ['lead', { mira: '(Better she hates a beast.)', other: 'Mira doesn\'t say anything all the way back to the lift.' }]]);
  }
  async function prayerNight() {
    AU.music('c2xsad');
    await vn('c2-fire', [
      ['narr', 'That night, at the fire, Uptima opens Mira\'s prayer and reads it aloud.'],
      ['uptima', '"Not him. Take the rest of me, not him."', 'sad'],
      ['uptima', 'I\'m sorry. I didn\'t read it.', 'sad'],
      ['mira', 'You\'d have said no.', 'cold'],
      ['uptima', 'Probably. But you\'d have known someone heard you.', 'neutral'],
      ['narr', 'It\'s the first thing Uptima has done that anyone in camp respects.']
    ]);
    setFlag('prayer');
    await vn('c2-square', [
      ['narr', 'In Thornwick, people take back their grants. High above the Cloud, Freya\'s halo flickers for the first time.'],
      ['narr', 'They move down to the camp. Thornwick\'s postmen join Coo, and Goodwife Marrow hangs the bell.'],
      ['marrow', 'It rings for every alarm now. Not for her.', 'neutral']
    ]);
    AU.sfx('x-bell');
    await vn('c2-fire', [
      ['narr', 'Later, Kai talks about Hana for the first time: the leases, the lies to his bosses, the floss.'],
      ['seoyeon', 'I\'ve been playing Hana. And letting you play Jin.', 'anger'],
      ['seoyeon', 'I\'m not your sister.', 'anger'],
      ['kai', 'Good. She\'d have made me floss.', 'smirk']
    ]);
    setFlag('freed');
    AU.music('camp');
  }
  async function anselm() {
    if (flag('reckon') && !flag('grey')) return reckoning();
    await say([
      ['anselm', 'Forty-one names, each with a date. I kept them in order, in case anyone ever asked.', 'tired'],
      ['anselm', 'Hale is on the bell tower\'s back stairs, with what\'s left of his guard. I\'ll come with you.', 'neutral'],
      sv().choice === 'give' ? ['narr', 'Tilly is at the edge of camp with Mira\'s letter in her fist. She\'s coming to look for Hale too.'] : ['narr', 'Tilly is on the back stairs with Hale. She\'ll fight you. Win without hurting her.']
    ]);
    setFlag('reckon');
    await reckoning();
  }
  async function reckoning() {
    await expedition('greynovice');
  }
  async function ending() {
    AU.music('c2xsad');
    await vn('c2x-stair', [
      ['narr', 'On the last floor, Brother Anselm told Tilly who killed Bram, and who tried to get her out.'],
      ['tilly', sv().choice === 'give' ? 'You wrote to me. You never sent it.' : 'He says you tried to get me out.', 'neutral'],
      ['mira', 'Every day.', 'warm'],
      ['narr', 'High above the Cloud, Freya loses Hale\'s blessing, and doesn\'t notice yet.'],
      ['mira', { mira: '(Bram. It wasn\'t me.)', other: 'It wasn\'t me, Bram. It was never me.' }, 'grief']
    ]);
    const c1 = S.save.c1;
    if (c1 && c1.lead === 'mira' && !c1.deck.some(d => d.id === 'rts')) { c1.deck.push({ id: 'rts', up: false }); S.persist(); U.system('NEW CARD: RETURN TO SENDER', 'Mira\'s own. Her Letters are a dead-letter queue now: redrive the whole pile back at its sender.', 'gold'); }
    setFlag('grey');
  }

  // The dead letters on the floors: an old question, from Expedition I and before.
  async function pickLetter(i) {
    if (sv().letters.includes(i)) return;
    const pool = (SD.questions || []).filter(q => RECALL.includes(q.c) && q.id && q.type === 'mc');
    const q = (pool.length ? SD.qpick(pool) : null) || X.pickQ('dlqredrive');
    await say([['narr', 'A dead letter, fallen out of its pigeonhole. Someone has written a question on the back.']]);
    const ok = q ? await ask(q, 'A DEAD LETTER') : true;
    sv().letters.push(i); S.persist();
    R.gainXp(ok ? 10 : 4); AU.sfx(ok ? 'sparkle' : 'blip');
  }

  // ---------- The lift ----------
  const liftOpen = r => r === 'office' || r === 'camp' || (r === 'square' && flag('design')) || (r === 'town' && flag('felt'));
  async function lift() {
    const here = roomAt(sc.P.x);
    const pick = await new Promise(res => {
      const opts = ['camp', 'office', 'square', 'town'].filter(r => r !== here && liftOpen(r));
      const b = U.panel(`<p>The tower's lift. A brass dial, and the floors it will take you to.</p>
        <div class="opts">${opts.map(r => `<button class="opt" id="xl-${r}"><b>${esc(NAMES[r])}</b></button>`).join('')}</div>
        <div class="row"><button class="ghost" id="xl-stay">Stay here</button></div>`, { title: 'THE LIFT', noClose: true });
      opts.forEach(r => { b.querySelector('#xl-' + r).onclick = () => { U.closePanel(); res(r); }; });
      b.querySelector('#xl-stay').onclick = () => { U.closePanel(); res(null); };
    });
    if (!pick) return moveTo(here);
    AU.sfx('x-lift');
    moveTo(pick);
    zone = null;
    AU.music(music(pick));
    if (pick === 'square' && !flag('seen13')) await square();
    if (pick === 'town' && !flag('f1')) await arriveTown();
  }
  function door(d) {
    if (busy) return;
    if (d === 'lift') return act(lift);
    if (d === 'office') return act(innerDoor);
    if (d === 'stair') return act(stairDoor);
  }
  function talk(id) {
    if (busy) return;
    const a = sc.actors[id];
    if (a && !a.thing) faceTo(id, 'you');
    if (/^letter\d$/.test(id)) return act(() => pickLetter(+id.slice(6)));
    const fns = { bench, fire, design, uptima, bru, board: bru, anselm, tilly, archive, ledger, desk,
      kitchen: () => (flag('uptima') ? uptima() : say([['narr', 'Kai\'s kitchen. Every pot is clean, which is suspicious.']])),
      bunker: () => say([['narr', 'Seymour\'s bunker. A sign on the hatch: TAPES, TWO PER CLIMB. NO REFUNDS.']]),
      seymour: () => say([['seymour', 'Two tapes a climb, and not one more. Fall with none left and you start the climb again. I don\'t make the rules. I do enforce them.', 'neutral']]),
      wren: () => say([['wren', flag('prayer') ? 'She read it to you. I heard. That\'s a start.' : 'She was my goddess. She\'s still somebody\'s.', 'neutral']]),
      chute: () => say([['narr', 'PRAYERS ↓. The chute never stops. Somewhere below, they pile up unread.']]),
      clerk1: () => say([['clerk', rnd(['Three seconds. Three seconds for a whole sack!', 'I start cold every morning. Every single morning.']), 'neutral']]),
      clerk2: () => say([['clerk', rnd(['Failed twice, then dropped. Nobody told me where to put them.', 'There\'s a cap on how many of us can work at once.']), 'neutral']]),
      post1: () => say([['narr', 'A poster: HALE PROTECTS. A drawing of a beast, with claws, and a woman\'s face.']]),
      post2: () => say([['narr', 'A poster: REPORT ALL BEASTS. THE INQUISITION ANSWERS EVERY REPORT.']]),
      inq1: () => say([['inquisitor', 'Move along. The Grand Inquisitor is busy protecting you.', 'neutral']]), inq2: () => say([['inquisitor', 'Nobody goes up the stair without the Grand Inquisitor\'s leave.', 'neutral']]),
      v1: () => say([['narr', 'A man from Thornwick, staring up at the stair. "I was here the day she knocked one of them down."']]),
      v2: () => say([['narr', '"Hale says she ate him. Bram. Hale says a lot of things."']]),
      v3: () => say([['narr', '"My grant is Freya\'s. Everyone\'s is. What else would we do?"']]),
      box: () => say([['narr', 'Thornwick\'s post box. Someone has fixed the slot.']]),
      marrow: () => (flag('f1') && !delivered('marrow') ? deliver('marrow') : say([['marrow', flag('f1') ? 'I\'ve read it. Don\'t make me say anything.' : 'Thornwick\'s bell. I ring it for the Inquisition. Move along.', 'sad']])) };
    if (/^d\d$/.test(id)) return act(() => deliver(id));
    if (fns[id]) return act(fns[id]);
  }

  // ---------- The objective, and where the arrow points ----------
  // [text, [x, y], id of what to talk to]. Another floor's step points at this floor's lift.
  function step() {
    const s = rawStep();
    if (!sc || !sc.P || !s[1]) return s;
    const here = roomAt(sc.P.x), there = roomAt(s[1][0]);
    if (here !== there) return [s[0] + ' (take the lift)', LIFT[here], null];
    return s;
  }
  function rawStep() {
    const A2 = sc && sc.actors;
    if (!flag('bench')) return ['Tune the clerk at the bench', [42, 15], 'bench'];
    if (!flag('dlo')) return ['Go through the inner door, into the Dead Letter Office', [57, 14], null];
    if (!flag('uptima')) return ['Find Uptima in Kai\'s kitchen', [16, 22], 'uptima'];
    if (!flag('bru')) return ['See Bru at the quest board: Who Reads the Prayers?', [7, 20], 'bru'];
    if (!flag('tillyPair')) return ['Sit by the fire', [12, 17], 'fire'];
    if (!flag('design')) return ['Draw Thornwick\'s post on the Design Board', [19, 20], 'design'];
    if (!flag('ev1')) return ['Search the Inquisition\'s event archive', [66, 4], 'archive'];
    if (!flag('ev2')) return ['Read the ferry ledger by the river', [66, 20], 'ledger'];
    if (!flag('ev3')) return [sv().compass ? 'Follow the Compass\'s footprints to Hale\'s dispatch desk' : 'Find Hale\'s dispatch desk', [81, 5], 'desk'];
    if (!flag('tower')) return ['Climb the stair to Hale', [89, 13], null];
    if (!flag('f1')) return ['Take the lift down to Thornwick', [113, 5], null];
    const next = FAMILIES.find(f => !delivered(f[0]));
    if (next) { const t = next[0] === 'marrow' ? [102, 20] : [THINGS[next[0]][0], THINGS[next[0]][1] + 1]; return [`Deliver the letters, door by door (${(sv().given || []).length}/5)`, t, next[0]]; }
    if (!flag('choice')) return ['The last letter: find Tilly', A2 && A2.tilly ? [A2.tilly.x, A2.tilly.y] : [100, 12], 'tilly'];
    if (!flag('prayer')) return ['Back to camp, to the fire', [12, 17], 'fire'];
    if (!flag('grey')) return ['Brother Anselm is waiting in camp', [9, 12], 'anselm'];
    return ['The end of the Mailroom', null, null];
  }
  const target = () => step()[1];

  // ---------- HUD ----------
  function hud() {
    const el = $('#w-hud'); if (!el || !sc) return;
    const s = S.save, need = S.xpFor(s.level), l = T.leads[lead()];
    el.innerHTML = `<span class="hud-chip"><b>${esc(l.name.split(' ')[0])}</b> · Lv ${s.level}</span>
      <div class="bar xp w-xp" title="XP"><i style="width:${Math.min(100, s.xp / need * 100)}%"></i></div>
      <span class="hud-chip w-goal">${esc(step()[0])}</span>
      <span class="hud-chip" title="Dead letters found">✉ ${sv().letters.length}/6</span>
      ${sv().compass ? '<span class="hud-chip" title="Bru\'s Compass: it shows where people really walked">🧭</span>' : ''}
      <span class="w-sp"></span>
      <button class="ghost" id="w-codex" aria-label="Cheat sheet" title="Cheat sheet">📖</button>
      <button class="ghost" id="w-snd" aria-label="Sound on or off">${AU.muted() ? '🔇' : '🔊'}</button>
      <button class="ghost" id="w-menu" aria-label="Menu">☰</button>`;
    $('#w-codex').onclick = () => U.codex();
    $('#w-snd').onclick = e => { AU.toggleAll(); e.currentTarget.textContent = AU.muted() ? '🔇' : '🔊'; };
    $('#w-menu').onclick = () => SD.main.menu();
  }
  const prevHud = SD.ch1.hud;
  SD.ch1.hud = () => (W.active ? hud() : prevHud());

  // ---------- The expeditions, on the raid engine (js/raid.js) ----------
  const XP = id => (SD.expeditions || []).find(x => x.id === id);
  const BASEDECK = ['hotfix', 'hotfix', 'hotfix', 'hotfix', 'dlq', 'vistimeout', 'idem', 'longpoll', 'fifo', 'subscribe', 'filterpol', 'pattern', 'shardkey'];
  let curXp = null;
  const deckFor = champ => {
    const CH = SD.champions, d = CH && champ ? CH.deck(champ, BASEDECK.slice()) : BASEDECK.slice();
    if (curXp !== 'deadletter') d.push('redrive', 'dlqalarm');
    if (champ === 'mira' && curXp !== 'deadletter') d.push('rts');
    return d;
  };
  async function raidSay(list) {
    if (!Array.isArray(list) || !list.length) return;
    const vault = XP('deadletter') && XP('deadletter').floors[2], top = XP('inqtower') && XP('inqtower').floors[3];
    if (vault && list === vault.intro) { tune.base = 'c2xvault'; AU.music('c2xvault'); }
    if (top && list === top.intro) tune.boss = 'c2xculprit';
    let out = [];
    for (const l of list) {
      if (!l) continue;
      if (l.who === 'evidence') { if (out.length) await U.dialog(out); out = []; await confront(); continue; }
      const t = txt(l.text);
      if (t) out.push({ s: who(l.who), t: String(t), e: l.e });
    }
    if (out.length) await U.dialog(out);
  }
  const tune = { base: 'c2xdungeon', boss: 'c2xboss' };
  let undress = null;
  function dress(xp) {
    const CH = SD.champions, RN = R, others = (SD.expeditions || []).filter(x => x.id !== xp);
    const was = { rewards: CH.rewards, sprite: CH.sprite, opens: others.map(x => x.opens), art: SD.dungeonArt, node: Object.assign({}, RN.NODE), curses: SD.quests && SD.quests.curses, hale: SD.enemies.hale && SD.enemies.hale.sev };
    curXp = xp; haleBase = null;
    CH.rewards = () => (xp === 'deadletter' ? X.cardsII : X.cardsIII).slice();
    others.forEach(x => { x.opens = () => false; });
    if (SD.quests) SD.quests.curses = () => [];   // Nothing Arrives was lifted by Coo's Redrive Stamp in part 1
    RN.NODE.notes = { l: 'Kyu\'s Runbook', g: 'notebook' };
    RN.NODE.sort = { l: 'The Sorting Table', g: 'scales' };
    SD.dungeonArt = null;
    CH.sprite = function (id, scale) {
      const c = CH.get(id), d = document.createElement('div');
      if (!c) return d;
      const h = c.h * scale, w = h * 0.4;
      d.className = 'champ-spr';
      d.style.cssText = `width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;background:url("${K.fig(id, 'neutral', 'full')}") center/contain no-repeat`;
      return d;
    };
    const keep = CH.list.map(c => ({ c, sheet: c.sheet, w: c.w, h: c.h, n: c.n }));
    CH.list.forEach(c => {
      const W2 = 30, H = 75, fig = K.fig(c.id, 'neutral', 'full');
      Object.assign(c, { w: W2, h: H, n: 0, sheet: K.uri(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W2}" height="${H * 3}" viewBox="0 0 ${W2} ${H * 3}"><image href="${fig}" xlink:href="${fig}" x="0" y="${H * 2}" width="${W2}" height="${H}"/></svg>`) });
    });
    document.body.classList.add('c2-floors');
    tune.base = 'c2xdungeon'; tune.boss = 'c2xboss';
    let boss = false;
    AU.music(tune.base);
    const mo = new MutationObserver(() => { const b = !!document.querySelector('#run .combat.bossfight'); if (b !== boss) { boss = b; AU.music(b ? tune.boss : tune.base); } });
    mo.observe($('#run'), { childList: true, subtree: true });
    undress = () => {
      Object.assign(CH, { rewards: was.rewards, sprite: was.sprite });
      keep.forEach(k => Object.assign(k.c, { sheet: k.sheet, w: k.w, h: k.h, n: k.n }));
      others.forEach((x, i) => { x.opens = was.opens[i]; });
      if (SD.quests) SD.quests.curses = was.curses;
      if (SD.enemies.hale) SD.enemies.hale.sev = was.hale;
      SD.dungeonArt = was.art;
      delete RN.NODE.notes; delete RN.NODE.sort; Object.assign(RN.NODE, was.node);
      document.body.classList.remove('c2-floors');
      mo.disconnect();
      curXp = null; undress = null;
    };
  }
  const GAME = { deadletter: 'dlo', inqtower: 'tower', greynovice: 'tower' };
  const story = (xp, extra) => Object.assign({ story: true, label: XP(xp).name, xp, champNames: true, deckFor, pickQ: X.pickQ, say: raidSay, tapes: 2 }, extra);
  function joinScreen(root, dir, game, label) {
    const net = SD.net, pre = net.PREFIX[game];
    return new Promise(res => {
      let off = null;
      const draw = () => {
        const list = dir.tables().filter(t => net.cleanCode(t.code).length >= 4);
        root.innerHTML = `<div class="mi-card rd"><span class="mi-tag">${esc(label)}</span><h2 style="margin:2px 0 6px">Join a party</h2>
          ${list.length ? `<ul class="mn-list">${list.map(t => `<li><b>${esc(t.nick || 'A party')}</b> <small class="muted">${t.players | 0}/${t.max | 0}${t.info ? ' · ' + esc(t.info) : ''}</small> <button class="mi-btn sm" type="button" data-code="${esc(net.cleanCode(t.code))}">Join</button></li>`).join('')}</ul>` : '<p class="muted">No open parties right now. Ask a friend for their code.</p>'}
          <label class="pt-lbl" for="xj-code">A friend's code<input id="xj-code" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="${pre.toUpperCase()}7KQP"></label>
          <p class="muted small" id="xj-why" role="status"></p>
          <div class="row"><button class="primary" type="button" id="xj-go">Join</button><button class="ghost" type="button" id="xj-back">Back</button></div></div>`;
        root.querySelectorAll('[data-code]').forEach(b => { b.onclick = () => done(b.dataset.code); });
        root.querySelector('#xj-go').onclick = () => {
          const c = net.cleanCode(root.querySelector('#xj-code').value);
          if (c.length !== 5 || c[0] !== pre) { root.querySelector('#xj-why').textContent = `These codes are 5 letters and start with ${pre.toUpperCase()}, like ${pre.toUpperCase()}7KQP.`; return; }
          done(c);
        };
        root.querySelector('#xj-back').onclick = () => done(null);
      };
      const done = c => { if (off) off(); res(c); };
      off = dir.onTables(() => draw()) || null;
      draw();
    });
  }
  // Play one expedition: 'solo' (you and three bots), 'party' or 'join'. Resolves true if every floor was cleared.
  W.raid = async function (xp, how) {
    const RD = SD.raid, net = SD.net, CH = SD.champions, game = GAME[xp];
    SD.main.show('run');
    const root = $('#run');
    CH.setMine(lead());
    if (!undress) dress(xp);
    let won = false, hub = null, dir = null;
    const onEnd = r => { won = !!(r && r.won); };
    try {
      hub = await net.open();
      if (how === 'solo') {
        if (hub.setNick && !(hub.remembered && hub.remembered())) hub.setNick(T.leads[lead()].name.split(' ')[0], true);
        await RD.play(root, hub, net.code(game), story(xp, { create: true, auto: { bots: mates() }, onEnd }));
      } else {
        dir = await hub.directory(game);
        const create = how === 'party', code = create ? net.code(game) : await joinScreen(root, dir, game, XP(xp).name);
        if (code) {
          let status = null, last = '', hosting = false, listed = true;
          const beat = () => {
            const st = status ? status() : null;
            if (!st || !st.lead) { if (hosting) { hosting = false; last = ''; dir.unhost(); } return; }
            const info = { code, nick: hub.me.nick, players: st.players, max: st.max, open: !!(listed && st.open), champ: st.champ || null, info: net.clean(st.info, 48) };
            const j = JSON.stringify(info);
            if (j !== last) { last = j; hosting = true; dir.host(info); }
          };
          const poll = setInterval(beat, 1000);
          try {
            await RD.play(root, hub, code, story(xp, { create, onEnd, status: f => { status = f; beat(); }, vis: { get: () => listed, set: v => { listed = !!v; beat(); } } }));
          } finally { clearInterval(poll); if (hosting) dir.unhost(); }
        }
      }
    } catch (e) {
      console.warn(XP(xp).name + ':', e);
    } finally {
      if (dir) dir.leave();
      if (undress) undress();
    }
    return won;
  };
  // The door's panel: climb now (alone or with friends), or not yet. Resolves false for "not yet".
  function expedition(xp) {
    const E = XP(xp), net = !!(SD.net && SD.raid);
    return new Promise(res => {
      const b = U.panel(`<p>${esc(E.blurb)}</p>
        <p class="muted small">${E.floors.length} raid floors, each with a boss. Seymour gives you two tapes: fall with one left and you start the floor again. Fall with none, and it's back to camp to start the expedition over.</p>
        <div class="opts"><button class="opt primary" id="xe-solo"><b>Go</b> · you and your three</button>
        ${net ? '<button class="opt" id="xe-party"><b>Form a party</b> · friends join with your code</button><button class="opt" id="xe-join"><b>Join a party</b> · with a friend\'s code</button>' : ''}</div>
        <div class="row"><button class="ghost" id="xe-not">Not yet</button></div>`, { title: E.name.toUpperCase(), noClose: true });
      const go = how => async () => {
        U.closePanel();
        W.halt();
        const won = await W.raid(xp, how);
        await after(xp, won);
        res(true);
      };
      b.querySelector('#xe-solo').onclick = go('solo');
      if (net) { b.querySelector('#xe-party').onclick = go('party'); b.querySelector('#xe-join').onclick = go('join'); }
      b.querySelector('#xe-not').onclick = () => { U.closePanel(); res(false); };
    });
  }
  async function after(xp, won) {
    SD.ch1.dress();
    SD.main.show('world');
    U.stage(null);
    if (!won) {
      enter('camp'); sc.locked = true;
      U.system('BACK TO CAMP', 'The party limps back down to camp. Next time, the expedition starts over from its first floor.');
      return;
    }
    // (This runs inside the door's act(), so the world stays locked until it's done.)
    if (xp === 'deadletter') { setFlag('dlo'); await midpoint(); enter('camp'); sc.locked = true; await pip('lambdaasync', 'pip2'); return; }
    if (xp === 'inqtower') { setFlag('tower'); await haleEscapes(); enter('camp'); sc.locked = true; await whatHeFelt(); await pip('msgattr', 'pip3'); return; }
    if (xp === 'greynovice') { await ending(); return endCard(); }
  }

  // ---------- Entering and leaving ----------
  function enter(room) {
    SD.ch1.halt();
    SD.ch1.dress();
    SD.main.show('world');
    $('#w-canvas').setAttribute('aria-label', 'The camp at the tower\'s foot, floor 7, floor 13 and Thornwick, joined by the lift');
    if (!sc) makeScene();
    if (room) moveTo(room);
    applyState();
    zone = null; lastTile = '';
    W.active = true;
    sc.start();
    AU.music(music(roomAt(sc.P.x)));
  }
  W.halt = function () { W.active = false; if (sc) { sc.stop(); sc.locked = false; } };
  function endCard() {
    setFlag('done');
    W.halt();
    U.stage('c2xfire');
    AU.music('c2xsad');
    const next = SD.chapterStart && typeof SD.chapterStart[3] === 'function' ? SD.chapterStart[3] : null;
    const b = U.panel(`<div class="verdict ok">END OF CHAPTER 2</div>
      <p>Hale is bound with Bram's chain, for Thornwick's court. Uptima reads the backlog by the fire, and Goodwife Marrow's bell rings for every alarm. Freya's halo flickered tonight, for the first time.</p>
      <p class="muted small">Chapter 2, part 2: the Dead Letter Office, the Inquisition's Tower and the Grey Novice.</p>
      <div class="row">${next ? '<button class="primary" id="c2x-next">Continue to Chapter 3</button>' : ''}<button class="${next ? 'ghost' : 'primary'}" id="c2x-end">Title</button><button class="ghost" id="c2x-replay">Replay part 2</button></div>`, { title: 'CHAPTER 2 · THE MAILROOM', noClose: true });
    if (next) b.querySelector('#c2x-next').onclick = () => { U.closePanel(); U.stage(null); next(); };
    b.querySelector('#c2x-end').onclick = () => { U.closePanel(); U.stage(null); SD.main.title(); };
    b.querySelector('#c2x-replay').onclick = () => { U.closePanel(); U.stage(null); S.save.c2x = null; S.persist(); sc = null; W.start(); };
  }

  // Part 2 starts here: from part 1's lift, the standalone title, or anything else that hands over.
  W.start = async function () {
    sv(); S.persist();
    if (SD.c2world && SD.c2world.active) SD.c2world.halt();
    SD.ch1.halt(); U.closePanel(); U.stage(null);
    if (flag('done')) return endCard();
    sc = null;
    if (!flag('start')) await opening();
    enter(sv().pos ? null : 'office');
  };
  SD.chapterStart = SD.chapterStart || {};
  SD.chapterStart['2b'] = () => W.start();

  // ---------- Standalone ----------
  // Pick a lead, as if part 1 were done: chapter 1's deck, level 6, and part 1's ideas already met once.
  W.newGame = async function () {
    const id = await SD.ch1.choose();
    S.save.c1 = { lead: id, f: { intro: true, cart: true, brief: true, done: true }, deck: SD.starterDeck.map(x => ({ id: x, up: false })), pos: null };
    S.save.name = T.leads[id].name.split(' ')[0];
    S.save.flags.prologue = true; S.save.flags.ch1 = true;
    if ((S.save.level || 1) < 6) { S.save.level = 6; S.save.xp = 0; }
    RECALL.forEach(c => { if (SD.concepts[c]) S.recordAnswer(c, true, 1, 9000); });
    S.save.c2x = null;
    S.persist();
    sc = null;
    W.start();
  };
  if (STANDALONE) {
    const boot = () => {
      const M = SD.main, title = M.title;
      M.title = function () {
        title();
        const box = $('#title-actions'), s = S.save;
        if (!box || box.querySelector('#t-start')) return;
        const has = !!(s.c1 && s.c1.lead && s.c2x && s.c2x.f && s.c2x.f.start);
        box.innerHTML = (has ? `<button class="primary" id="t-c2xgo">Continue · ${esc(T.leads[s.c1.lead].name)}</button>` : '') +
          `<button class="${has ? 'ghost' : 'primary'}" id="t-c2xnew">Play Chapter 2, part 2: The Dead Letter Office</button><button class="ghost" id="t-help">How to play</button>`;
        $('#t-help').onclick = () => U.panel('<p>Walk with the arrow keys or WASD, or tap where you want to go. Tap someone, or press E, to talk. The yellow arrow points at your next step; the lift joins the floors.</p><p>Behind the doors are the expeditions: raid floors where you play cards to fix incidents, alone with your three or with friends.</p>', { title: 'HOW TO PLAY' });
        if (has) $('#t-c2xgo').onclick = () => W.start();
        $('#t-c2xnew').onclick = () => {
          if (!has) return W.newGame();
          const c = U.panel('<p>Start part 2 again from floor 7? Your level and cheat sheet stay.</p><div class="row"><button class="primary" id="n-y">Start again</button><button class="ghost" id="n-n">Cancel</button></div>', { title: 'NEW GAME' });
          c.querySelector('#n-y').onclick = () => { U.closePanel(); W.newGame(); };
          c.querySelector('#n-n').onclick = U.closePanel;
        };
      };
      const foot = $('.t-foot'); if (foot) foot.textContent = 'Chapter 2, part 2: The Dead Letter Office · Built on the AWS documentation · Saves automatically';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { boot(); SD.main.title(); }, 0), { once: true });
  }

  // For tools/c2x_check.js and tools/c2x_balance.js.
  W.debug = { busy: () => busy, flag, sv, scene: () => sc, step, act, place: (x, y) => sc && sc.place('you', x, y), room: () => sc && roomAt(sc.P.x),
    flags: f => { Object.assign(sv().f, f); S.persist(); if (sc) applyState(); }, raid: (xp, how) => W.raid(xp, how || 'solo'), LETTERS, THINGS, LIFT, ARRIVE, roomAt,
    want: () => { const t = rawStep()[1]; return t ? roomAt(t[0]) : null; }, shown: letterShown };
})();
