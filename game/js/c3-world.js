// Chapter 3, the Granaries (floors 21 to 40), as a place you explore: the Free Cloud's camp at the tower's foot, the
// lift up to Halcyon on floor 21 under its golden barrier, the Cold Stores yard on floor 22, and the bottom of the
// Abyss on floor 32. Story beats are cutscenes (js/c3-story.js) and minigames (js/c3-games.js) you walk into; the
// dungeons are the Borderlands engine's (js/c3-raid.js). The art is js/c3-art.js, on js/c2-art.js's kit.
//
// Zelda-style, the map is a hub with branches, and what opens them is something you understand: the granary gate
// opens for whoever can shelve grain by storage class, the Abyss grate's lift runs once you've shipped the granary
// function's new version behind an alias, the cathedral door once your Design Board passes its load test, and the
// Old Archive's cellar (optional) for the partition limit, typed. Five pages of Hana's speech lie about, some only
// past those doors. An arrow at the screen's edge points at the next step.
//
// It plays standalone when the page sets window.SD_CH = 3 or the URL has ?vector&ch3, and from any chapter that calls
// SD.chapterStart[3](). Its end card hands over to SD.chapterStart[4] when that's loaded.
// Map: 100 x 44 tiles, drawn in code on js/scene.js.
(function () {
  const K = SD.vec;
  if (!K || !K.on || !SD.c3art || !SD.c3raid || !SD.c3games || !SD.c3story) return;
  const W3 = SD.c3world = {};
  const U = SD.ui, S = SD.state, AU = SD.audio, R = SD.run, A = SD.c3art, A2 = SD.c2art, G = SD.c3games, ST = SD.c3story, R3 = SD.c3raid;
  const T1 = SD.ch1story;
  const ORDER = ['mira', 'kai', 'seoyeon', 'dutch'];
  const $ = U.$, esc = s => U.esc(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  const ON = window.SD_CH == 3 || /[?&]ch3\b/.test(location.search);

  // ---------- Save ----------
  // S.save.c3: { lead, f: {}, dev: { sum, oven, dayayear, gauntlet }, deck, w: { x: flags, pos, pages: [] }, choice }
  const c3 = () => S.save.c3 || (S.save.c3 = { lead: (S.save.c1 && S.save.c1.lead) || 'kai', f: {}, dev: {}, w: { x: {}, pos: null, pages: [] } });
  const w = () => { const s = c3(); return s.w || (s.w = { x: {}, pos: null, pages: [] }); };
  const flag = k => !!w().x[k];
  const setFlag = k => { w().x[k] = true; S.persist(); };
  const dev = k => !!(c3().dev && c3().dev[k]);
  const setDev = k => { c3().dev = c3().dev || {}; c3().dev[k] = true; S.persist(); };
  const lead = () => c3().lead || 'kai';
  const others = () => ORDER.filter(id => id !== lead());
  const name = id => (SD.cast[id] && SD.cast[id].name.split(' ')[0]) || id;
  // A line by whoever you play is 'lead'; a text can change with the lead.
  const L = lines => lines.map(([s, t, e]) => ({ s: s === 'lead' ? lead() : s, t: typeof t === 'object' ? (t[lead()] || t.other) : t, e }));
  const say = lines => U.dialog(L(lines));
  const vn = async (steps, music) => { if (music) AU.music(music); U.closePanel(); U.stage(null); await SD.vn.play(steps); };

  // ---------- The map ----------
  const MW = 100, MH = 44;
  const PROPS = [];
  // Door tiles: L the lift (camp and Halcyon), S the stair to the Cold Stores' raid floors, A the Abyss grate, C the
  // cathedral door, K its kitchen door, R the rope up out of the Abyss, Q the Granaries' vault, O the Old Archive.
  const DOORS = { L: 'lift', S: 'stair', A: 'grate', C: 'cathedral', K: 'kitchen', R: 'rope', Q: 'vault', O: 'archive' };
  const UNDER = { L: 'L', S: 'i', A: 'g', C: 'm', K: 'm', R: 'a', Q: 'i', O: 'c' };
  const BASE = (function build() {
    const g = [];
    for (let y = 0; y < MH; y++) g.push(Array(MW).fill('V'));
    const set = (x, y, c) => { if (x >= 0 && x < MW && y >= 0 && y < MH) g[y][x] = c; };
    const rect = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c); };
    const row = (x0, x1, y, c) => rect(x0, y, x1, y, c);
    const col = (x, y0, y1, c) => rect(x, y0, x, y1, c);
    const prop = (kind, x, y, w, h, o) => {
      const p = Object.assign({ kind, x, y, w: w || 1, h: h || 1 }, o);
      PROPS.push(p);
      if (p.solid !== false) for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) set(x + i, y + j, '#');
      return p;
    };
    // The camp at the tower's foot: turf on the lip of nothing, the tower's wall to the north.
    rect(2, 11, 21, 31, '.'); row(2, 21, 10, 'T');
    [[2, 11], [2, 31], [21, 31], [3, 31], [2, 30]].forEach(([x, y]) => set(x, y, 'V'));
    row(4, 21, 20, ','); set(21, 20, 'L');
    // Halcyon, floor 21: honey-stone walls, cobbled streets, the gold square, the cathedral close.
    rect(27, 2, 74, 40, 'c'); row(27, 74, 2, 'T'); row(27, 74, 40, 'T'); col(27, 2, 40, 'T'); col(74, 2, 40, 'T');
    rect(28, 18, 31, 22, 'c'); set(28, 20, 'L');
    rect(46, 15, 60, 27, 'g');
    rect(44, 3, 62, 13, 'm'); row(44, 62, 2, 'T');
    // Inner walls: a lane of houses north of the market, and the Old Archive's yard in the south-west.
    for (let x = 28; x <= 43; x++) if (x % 5 !== 0) set(x, 14, 'T');
    rect(28, 30, 38, 39, 'c'); row(28, 38, 29, 'T'); col(38, 29, 39, 'T'); set(33, 29, 'O');
    for (let x = 29; x <= 37; x++) for (let y = 31; y <= 38; y++) if (hash(x, y) % 9 === 0) set(x, y, 'T');
    set(46, 8, 'K'); set(52, 10, 'C');
    set(53, 31, 'A');
    // The granary gate, east, and the passage up to the Cold Stores.
    rect(74, 11, 77, 13, 'i');
    // The Cold Stores yard, floor 22.
    rect(78, 3, 98, 19, 'i'); row(78, 98, 2, 'T'); row(78, 98, 20, 'T'); col(78, 2, 20, 'T'); col(99, 2, 20, 'T');
    rect(78, 11, 78, 13, 'i');
    for (let y = 4; y <= 18; y++) for (let x = 80; x <= 97; x++) if (hash(x, y) % 31 === 0 && Math.abs(y - 12) > 1) set(x, y, 'T');
    set(97, 10, 'S'); set(96, 3, 'Q');
    // The bottom of the Abyss, floor 32: reached only from below.
    rect(79, 25, 98, 41, 'a'); row(78, 98, 24, 'T'); row(78, 98, 42, 'T'); col(78, 24, 42, 'T'); col(99, 24, 42, 'T');
    for (let y = 26; y <= 40; y++) for (let x = 80; x <= 97; x++) if (hash(x, y) % 17 === 0 && Math.abs(x - 88) > 2) set(x, y, 'T');
    set(96, 26, 'R');

    // ---- Props ----
    // The camp.
    PROPS.stove = prop('c3stove', 6, 13, 2, 1, { jar: 'none' });
    PROPS.fire = prop('firesite', 11, 22, 1, 1, { lit: true });
    PROPS.cafe = prop('c3cafe', 3, 24, 3, 2, { open: false });
    PROPS.term = prop('c3terminal', 17, 13);
    PROPS.board = prop('c3board', 17, 26, 2, 1);
    PROPS.kstall = prop('c3stall', 8, 28, 2, 1, { color: '#5a4a7a', goods: 'pins', hidden: true, solid: false });
    PROPS.mk1 = prop('c3stall', 13, 28, 2, 1, { color: '#c8584a', goods: 'bread', hidden: true, solid: false });
    PROPS.mk2 = prop('c3stall', 16, 29, 2, 1, { color: '#4a8a6a', goods: 'grain', hidden: true, solid: false });
    PROPS.lift1 = prop('c3lift', 20, 19, 2, 1, { label: '21' });
    // Halcyon.
    PROPS.lift2 = prop('c3lift', 28, 19, 2, 1, { label: 'CAMP' });
    [[33, 18, '#c8584a', 'bread'], [37, 18, '#4a8a6a', 'grain'], [41, 18, '#7a5aa0', 'candles'], [35, 23, '#d9a740', 'honey'], [39, 23, '#5a7ab0', 'cloth']].forEach(([x, y, color, goods]) => prop('c3stall', x, y, 2, 1, { color, goods }));
    PROPS.heart = prop('c3heart', 52, 20, 2, 2);
    PROPS.cath = prop('c3cathedral', 48, 4, 9, 6, { open: false });
    PROPS.office = prop('c3office', 64, 16, 3, 2);
    PROPS.bell = prop('c3bell', 66, 5, 2, 3);
    PROPS.grate = prop('c3grate', 52, 32, 3, 2, { open: false });
    PROPS.gate = prop('c3gate', 74, 11, 1, 3, { open: false, h: 3 });
    [[45, 16, '#d9a740'], [61, 16, '#d9a740'], [45, 26, '#7a5aa0'], [61, 26, '#7a5aa0']].forEach(([x, y, color]) => prop('c3banner', x, y, 1, 1, { color }));
    [[30, 5, '#c8a870'], [36, 5, '#b8986a'], [30, 9, '#a88a5a'], [36, 9, '#c8a870'], [66, 26, '#b8986a'], [66, 32, '#c8a870'], [44, 33, '#a88a5a']].forEach(([x, y, color]) => prop('cottage', x, y, 3, 2, { color }));
    [[47, 14], [58, 14], [47, 28], [58, 28], [30, 24], [70, 20]].forEach(([x, y]) => prop('lamp', x, y));
    PROPS.well0 = prop('c3well', 33, 34);
    // The Cold Stores.
    [[80, 4], [84, 4], [88, 4], [80, 15], [84, 16]].forEach(([x, y]) => prop('c3granary', x, y, 3, 2, { frost: true }));
    PROPS.sack = prop('c3sacks', 86, 11, 2, 1, { ice: true, tag: 'DEEP ARCHIVE' });
    prop('c3sacks', 91, 6, 2, 1, { tag: 'STANDARD' }); prop('c3sacks', 91, 15, 2, 1, { tag: 'STANDARD-IA' });
    PROPS.vault = prop('c3gate', 96, 2, 1, 1, { open: false, solid: false, h: 1 });
    // The bottom of the Abyss.
    PROPS.saints = prop('c3saints', 81, 26, 4, 2, { lit: false });
    PROPS.well = prop('c3well', 92, 36);
    PROPS.rope = prop('c3rope', 96, 25, 1, 1, { solid: false });
    return g.map(r => r.join(''));
  })();
  const groundCh = (map, x, y) => (y < 0 || y >= MH || x < 0 || x >= MW) ? 'V' : map[y][x];
  // Who and what you can talk to: [x, y, name].
  const THINGS = { stove: [6, 13, 'Kai\'s stove'], term: [17, 13, 'The terminal'], board: [17, 26, 'The Design Board'], heart: [52, 21, 'The barrier\'s heart'],
    office: [65, 17, 'The ration office'], bell: [66, 7, 'The bell tower'], gate: [74, 12, 'The granary gate'], sack: [86, 11, 'A frozen sack'],
    saints: [82, 27, 'The Saints\' Register'], well: [92, 36, 'A well'], kstall: [8, 28, 'Kagemaru\'s stall'] };
  // Hana's speech, five pages: where each lies, and the bank pool its margin asks from.
  const PAGES = [[43, 21, 'ddbkey'], [67, 10, 'caching'], [93, 17, 's3class'], [81, 38, 'ddbwrite'], [31, 36, 'ddbindex']];
  const ZONES = [
    [x => x < 24, 'camp', 'THE FREE CLOUD · THE TOWER\'S FOOT', 'camp'],
    [(x, y) => x < 78 && x >= 28 && x <= 38 && y >= 29, 'halcyon', 'THE OLD ARCHIVE', 'c3explore'],
    [(x, y) => x < 78 && y <= 13 && x >= 44 && x <= 62, 'halcyon', 'THE CATHEDRAL CLOSE', 'c3town'],
    [x => x < 74, 'halcyon', 'HALCYON · FLOOR 21', 'c3town'],
    [(x, y) => y < 22, 'stores', 'THE COLD STORES · FLOOR 22', 'c3explore'],
    [() => true, 'abyss', 'THE BOTTOM OF THE ABYSS · FLOOR 32', 'c3sad']
  ];
  const zoneAt = (x, y) => ZONES.find(z => z[0](x, y));
  W3.map = { BASE, PAGES, THINGS, DOORS };

  // ---------- The scene ----------
  let sc = null, busy = false, zone = null, lastTile = '';
  const trail = [];
  function phase() {
    if (W3.night) return 'night';
    if (zone && zone[1] === 'abyss') return 'night';
    if (flag('x3') && !flag('speech')) return 'dusk';
    return 'day';
  }
  function person(id, look, x, y, face, extra) {
    const a = sc.addActor(id, Object.assign({ x, y, face: face || 'south', speed: 3.2 }, extra));
    a.look = look;
    a.draw = (ctx, fx, fy, ts, t) => A.person(ctx, a.look, fx, fy, ts, t, a.face, a.moving || (a.path && a.path.length), a.o);
    return a;
  }
  function thing(id) { const [x, y, label] = THINGS[id]; return sc.addActor(id, { x, y, thing: true, label, draw: () => {} }); }
  const SOLID = 'TV#';
  const solidNow = () => SOLID;
  const pageShown = i => !w().pages.includes(i) && (i !== 2 || flag('gate1')) && (i !== 3 || flag('x2')) && (i !== 4 || flag('archive'));

  function makeScene() {
    const map = BASE.slice();
    const lights = () => {
      const l = [[11.5, 22.6, 3, '255,140,60', 1], [52.9, 21, 4, '255,214,100', 1]];
      [[47, 14], [58, 14], [47, 28], [58, 28], [30, 24], [70, 20]].forEach(([x, y]) => l.push([x + 0.5, y + 0.2, 1.8, '255,200,120', 0]));
      if (PROPS.stove.jar === 'lit') l.push([7, 13, 1.2, '255,220,120', 1]);
      if (zone && zone[1] === 'abyss') l.push([86.5, 32.5, 3, '255,170,80', 1]);
      PAGES.forEach(([x, y], i) => { if (pageShown(i)) l.push([x + 0.5, y + 0.5, 1, '255,230,150', 1]); });
      return l;
    };
    const def = {
      map, solid: solidNow(), doors: DOORS, ground: false, bg: '#0b0a14', clock: false,
      grade: (ctx, t, vw, vh, cx, cy, ts) => A2.grade(ctx, t, vw, vh, cx, cy, ts, phase(), lights(), false),
      ambience: () => (sc && sc.P && Math.abs(sc.P.x - 11) + Math.abs(sc.P.y - 22) < 6) ? 'fire' : zone && zone[1] === 'abyss' ? 'rumble' : zone && zone[1] === 'stores' ? 'storm' : null,
      under(ctx, ts, t, x0, x1, y0, y1) {
        for (let y = Math.max(0, y0); y <= Math.min(y1, MH - 1); y++) for (let x = Math.max(0, x0); x <= Math.min(x1, MW - 1); x++) {
          const c = groundCh(map, x, y), z = zoneAt(x, y)[1];
          const floor = z === 'camp' ? '.' : z === 'stores' ? 'i' : z === 'abyss' ? 'a' : (x >= 44 && x <= 62 && y <= 13) ? 'm' : (x >= 46 && x <= 60 && y >= 15 && y <= 27) ? 'g' : 'c';
          const base = c === 'T' || c === '#' ? floor : UNDER[c] || c;
          A.ground(ctx, base, x, y, ts, t, (dx, dy) => groundCh(map, x + dx, y + dy));
        }
      },
      rowDraw(ctx, y, ts, t, x0, x1) {
        if (y < 0 || y >= MH) return;
        for (let x = Math.max(0, x0); x < Math.min(x1, MW); x++) if (map[y][x] === 'T') A.wall(ctx, x, y, ts, t, zoneAt(x, y)[1]);
        PROPS.forEach(p => { if (p.y + p.h - 1 === y && p.x + p.w >= x0 - 1 && p.x <= x1) A2.prop(ctx, p, ts, t, false); });
        PAGES.forEach(([x, py], i) => { if (py === y && pageShown(i)) A2.prop(ctx, { kind: 'c3page', x, y }, ts, t, false); });
      },
      doorFor(tx, ty) {
        const a = Object.values(sc.actors).find(o => o.thing && !o.hidden && Math.abs(o.x - tx) <= 1 && Math.abs(o.y - ty) <= 2);
        return a ? beside(a.id) : null;
      },
      overlay(ctx, t, vw, vh) { drawOverlay(ctx, t, vw, vh); }
    };
    sc = SD.scene.create($('#w-canvas'), def);
    sc.addActor('pip', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {} });
    const pos = w().pos || [10, 20];
    const P = sc.player(pos[0], pos[1], 'east');
    P.draw = (ctx, fx, fy, ts, t) => A.person(ctx, lead(), fx, fy, ts, t, P.face, P.moving, null);
    others().forEach((id, i) => person(id, id, pos[0] - 1 - i, pos[1], 'east', { solid: false, talk: false }));
    Object.keys(THINGS).forEach(thing);
    PAGES.forEach(([x, y], i) => sc.addActor('page' + i, { x, y, thing: true, solid: false, talk: false, draw: () => {} }));
    // Halcyon's people.
    person('noor', 'noor', 51, 11, 'south', { name: 'Noor' });
    person('selvaria', 'selvaria', 55, 11, 'south', { name: 'Selvaria' });
    person('aurelian', 'aurelian', 49, 12, 'south', { name: 'Sir Aurelian' });
    person('g1', 'guard', 47, 11, 'south'); person('g2', 'guard', 57, 11, 'south');
    person('baker', 'baker', 36, 20, 'south', { name: 'A baker' });
    person('c1', 'citizen', 40, 21, 'west'); person('c2', 'citizen2', 44, 23, 'north'); person('child', 'child', 50, 24, 'north', { speed: 1.8 });
    person('lord', 'lord', 63, 22, 'west', { name: 'Lord Brannick' });
    person('keeper', 'citizen2', 72, 12, 'east', { name: 'The gatekeeper' });
    // The Cold Stores.
    person('merchant', 'citizen', 89, 13, 'west', { name: 'A merchant' });
    person('clerk', 'citizen2', 85, 12, 'east', { name: 'A clerk' });
    // The camp.
    person('wen', 'wen', 4, 26, 'south', { name: 'Grandma Wen' });
    person('doug', 'doug', 15, 14, 'south', { name: 'Doug' });
    person('kevin', 'kevin', 16, 15, 'west', { name: 'Kevin' });
    person('kage', 'kage', 9, 29, 'north', { name: 'Kagemaru' });
    person('noorc', 'noor', 14, 26, 'west', { name: 'Noor' });
    person('aurc', 'aurelianplain', 12, 23, 'north', { name: 'Sir Aurelian' });
    // The Abyss.
    person('ash', 'ash', 86, 32, 'south', { name: 'Mother Ash' });
    sc.addActor('ctl', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {}, tick });
    sc.onTalk = id => talk(id);
    sc.onDoor = d => door(d);
    applyState();
  }

  // Put the world in step with the story (after loading, or after a scene).
  function applyState() {
    const X = sc.actors;
    sc.def.solid = solidNow();
    const open = (x, y, c) => setTile(x, y, c);
    PROPS.gate.open = flag('gate1'); if (flag('gate1')) for (let y = 11; y <= 13; y++) open(74, y, 'i');
    X.gate.hidden = flag('gate1');
    PROPS.grate.open = flag('ship');
    PROPS.cath.open = flag('board');
    PROPS.cafe.open = flag('x1');
    PROPS.stove.jar = flag('jar') ? (flag('choice') ? 'dark' : 'lit') : 'none';
    PROPS.saints.lit = flag('register');
    PROPS.vault.open = reckonOpen();
    PROPS.term.done = flag('ship'); PROPS.board.done = flag('board');
    PROPS.kstall.hidden = !flag('x1'); X.kstall.hidden = !flag('x1');
    PROPS.mk1.hidden = PROPS.mk2.hidden = !flag('freed');
    // Who is where.
    const saint = !flag('choice') || c3().choice === 'leave';
    X.noor.hidden = !saint || flag('freed') && c3().choice !== 'leave';
    X.noorc.hidden = !(flag('freed') && c3().choice !== 'leave');
    X.selvaria.hidden = flag('x3');
    X.aurelian.hidden = flag('aurelian') && !flag('x3') || flag('freed');
    X.aurc.hidden = !(flag('aurelian') && !flag('x3'));
    ['wen', 'doug', 'kevin', 'kage'].forEach(id => { X[id].hidden = !flag('x1'); });
    X.ash.hidden = false;
    PAGES.forEach((p, i) => { X['page' + i].hidden = !pageShown(i); });
    others().forEach(id => { const a = X[id]; if (Math.abs(a.x - sc.P.x) + Math.abs(a.y - sc.P.y) > 6) sc.place(id, sc.P.x, sc.P.y); });
    refresh();
  }
  function setTile(x, y, c) { const m = sc.def.map; m[y] = m[y].slice(0, x) + c + m[y].slice(x + 1); }
  // The "!" over whoever has something for you.
  function refresh() {
    if (!sc) return;
    const X = sc.actors;
    const mark = (id, on) => { if (X[id]) X[id].marker = !!on; };
    mark('heart', flag('arrive') && !flag('heart') || flag('asknoor') && !flag('speech'));
    mark('noor', flag('heart') && !flag('crown') || flag('tellher') && !flag('asknoor'));
    mark('keeper', flag('sure') && !flag('gate1'));
    mark('gate', flag('sure') && !flag('gate1'));
    mark('sack', flag('gate1') && !flag('thaw'));
    mark('merchant', flag('gate1') && !flag('toll'));
    mark('wen', flag('x1') && !flag('cache'));
    mark('doug', flag('x1') && !flag('bread'));
    mark('term', flag('x1') && !flag('ship'));
    mark('kage', flag('x1') && !flag('kage'));
    mark('saints', flag('x2') && !flag('register'));
    mark('aurc', flag('aurelian') && !flag('echoes'));
    mark('board', flag('aurelian') && !flag('board'));
    mark('stove', flag('freed') && !flag('clean'));
    hud();
  }

  // ---------- Every frame ----------
  function tick() {
    const P = sc.P; if (!P) return;
    const k = P.x + ',' + P.y;
    if (k !== lastTile) {
      if (lastTile) { const [x, y] = lastTile.split(',').map(Number); trail.unshift([x, y]); trail.length = Math.min(trail.length, 6); }
      lastTile = k;
      if (!busy) { w().pos = [P.x, P.y]; S.persist(); }
      const z = zoneAt(P.x, P.y);
      if (!zone || z[2] !== zone[2]) {
        const first = zone === null, musicChanged = !zone || z[3] !== zone[3]; zone = z;
        const near = z[1] === 'camp' && flag('x1') && P.x < 8 && P.y > 22;
        if (musicChanged && !busy) AU.music(near ? 'c3cafe' : z[3]);
        if (!first) banner(z[2]);
      }
    }
    others().forEach((id, i) => {
      const a = sc.actors[id], to = trail[i];
      if (!to || a.scripted || a.moving || a.path.length) return;
      if (Math.abs(a.x - P.x) + Math.abs(a.y - P.y) > 8) { sc.place(id, P.x, P.y); return; }
      if (a.x !== to[0] || a.y !== to[1]) { a.speed = 7.5; a.path = [to]; }
    });
    // The child runs round the square.
    const ch = sc.actors.child;
    if (!ch.scripted && !ch.path.length && !ch.moving && !busy) { const to = ch.x <= 48 ? 58 : 48; ch.path = straight(ch.x, ch.y, to, ch.y); }
    if (busy || P.moving || P.path.length) return;
    // Story beats that happen where you walk.
    if (flag('offer') && !flag('sure') && P.x >= 44 && P.x <= 62 && P.y >= 15) return act(sure);
    if (flag('x2') && !flag('jar') && zone && zone[1] === 'camp') return act(jarVisit);
    PAGES.forEach(([x, y], i) => { if (pageShown(i) && P.x === x && P.y === y) act(() => pickPage(i)); });
  }
  const straight = (x0, y0, x1, y1) => { const out = []; let x = x0; while (x !== x1) { x += Math.sign(x1 - x); out.push([x, y0]); } return out; };
  function banner(text) {
    const el = document.createElement('div');
    el.className = 'w-zone'; el.textContent = text;
    $('#screen-world').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  // The arrow to the next step at the edge of the screen, and the barrier's gold over Halcyon.
  function drawOverlay(ctx, t, vw, vh) {
    if (!sc) return;
    const { cx, cy } = sc.cam(), ts = guessTs(vw, vh);
    if (zone && zone[1] === 'halcyon' && !flag('freed')) {
      const gr = ctx.createRadialGradient(vw / 2, vh * 1.4, vh * 0.4, vw / 2, vh * 1.4, vh * 1.6);
      gr.addColorStop(0, 'rgba(255,214,100,0)'); gr.addColorStop(0.85, 'rgba(255,214,100,0.08)'); gr.addColorStop(1, 'rgba(255,230,150,0.22)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, vw, vh);
    }
    const tg = target();
    if (tg && !busy) {
      const X = (tg[0] + 0.5) * ts - cx, Y = (tg[1] + 0.5) * ts - cy, m = 28;
      if (X < m || X > vw - m || Y < m || Y > vh - m) {
        const ax = vw / 2, ay = vh / 2, dx = X - ax, dy = Y - ay, k = Math.min((vw / 2 - m) / Math.abs(dx || 1), (vh / 2 - m) / Math.abs(dy || 1));
        const px = ax + dx * k, py = ay + dy * k, a = Math.atan2(dy, dx), pulse = 1 + 0.12 * Math.sin(t * 5);
        ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.scale(pulse, pulse);
        ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
    if (W3.fade) { ctx.fillStyle = `rgba(8,6,20,${W3.fade})`; ctx.fillRect(0, 0, vw, vh); }
  }
  function guessTs(vw, vh) { return Math.max(vw / 15, vh / 13) >= 44 ? 48 : 32; }

  // Run a scene with the controls locked.
  async function act(fn) {
    if (busy) return;
    busy = true; if (sc) { sc.locked = true; sc.pause && sc.pause(); }
    try { await fn(); } catch (e) { console.error(e); }
    finally { busy = false; if (sc) { sc.locked = false; w().pos = [sc.P.x, sc.P.y]; applyState(); } S.persist(); }
  }
  const open = (x, y) => !solidNow().includes(sc.tile(x, y)) && !DOORS[sc.tile(x, y)];
  function beside(id) {
    const a = sc.actors[id];
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) {
      const x = a.x + dx, y = a.y + dy;
      if (open(x, y) && !Object.values(sc.actors).some(o => o !== a && !o.hidden && !o.player && o.solid !== false && o.x === x && o.y === y)) return [x, y];
    }
    return [a.x, a.y + 1];
  }
  const faceTo = (a, b) => { const A1 = sc.actors[a], B = sc.actors[b]; if (!A1 || !B) return; const dx = B.x - A1.x, dy = B.y - A1.y; A1.face = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north'); };
  // Move the party somewhere at once (after a lift, a rope, an expedition).
  function warp(x, y, face) {
    sc.place('you', x, y); if (face) sc.P.face = face;
    others().forEach(id => sc.place(id, x, y));
    trail.length = 0; lastTile = ''; zone = null;
    w().pos = [x, y]; S.persist();
  }
  const xp = n => R.gainXp(n);

  // ---------- The story ----------
  async function opening() {
    await vn(ST.cold, 'story');
    await G.receipts();
    await vn(ST.cold2);
    setFlag('cold');
  }
  async function campWake() {
    setFlag('wake');
    await say([['narr', 'The Free Cloud\'s camp, at the tower\'s foot. Somewhere above, the lift has started running again. Its panel reads 21.'],
      ['kai', { kai: 'Twenty-one. That\'s Halcyon. That\'s where she is.', other: 'Twenty-one. That\'s Halcyon. That\'s where my sister is.' }, 'grief']]);
    U.system('[GOAL] FLOOR 21', 'Take the lift up to Halcyon. Arrow keys or WASD to walk, E to talk, or tap. The yellow arrow points at your next step.', 'gold');
  }
  async function arrive() {
    setFlag('arrive');
    await vn(ST.arrive, 'c3town');
    AU.sfx('x-bell');
  }
  async function heart() {
    if (flag('asknoor') && !flag('speech')) return speech();
    if (flag('heart')) return say([['narr', rnd(['The barrier hums under your hand. It\'s warm, the way a person is warm.', 'Gold light, breathing slowly. The whole city leans on it.'])]]);
    await vn(ST.heart, 'c3sad');
    setFlag('heart');
    AU.music('c3town');
    U.system('[GOAL] THE CROWNING', 'The bells are for the twelfth Saint. Go to the cathedral steps, north of the square.', 'gold');
  }
  async function noorTalk() {
    if (flag('tellher') && !flag('asknoor')) return askNoor();
    if (!flag('heart')) return say([['noor', 'Oh, hi. Sorry, I\'m not supposed to talk before the crowning. Saints smile. That\'s the rule.', 'smile']]);
    if (!flag('crown')) return crown();
    if (flag('x3') && c3().choice === 'leave') return say([['noor', 'You said you\'d come back with root. I\'m counting the days. A day a year, right?', 'sad']]);
    return say([['noor', rnd(['Do you think they still have the bookshop? It was on Harrow Road. It had a cat.', 'Seo-yeon says she\'ll teach me her forms at dawn. I\'m going to be terrible at it.', 'It\'s an honour. That\'s what Saints say. I\'ve got really good at saying it.']), 'smile']]);
  }
  async function crown() {
    await vn(ST.crown, 'c3town');
    await vn(ST.crown2, 'c3culprit');
    setFlag('crown');
    AU.music('c3town');
    U.system('[GOAL] THE KITCHEN DOOR', 'Someone has left the cathedral\'s kitchen door open, on the west side of the close. It smells of butter.', 'gold');
  }
  async function door(d) {
    if (busy) return;
    const P = sc.P;
    if (d === 'lift') return act(async () => {
      AU.sfx('x-lift');
      if (P.x < 24) {
        W3.fade = 0.6; await wait(300); warp(29, 21, 'east'); W3.fade = 0;
        if (!flag('arrive')) await arrive();
      } else { W3.fade = 0.6; await wait(300); warp(19, 20, 'west'); W3.fade = 0; }
    });
    if (d === 'kitchen') return act(async () => {
      if (!flag('crown')) { await say([['narr', 'The cathedral\'s kitchen door. A guard waves you off: "Not before the crowning."']]); return warp(45, 8, 'west'); }
      if (flag('offer')) { await say([['narr', 'The cathedral kitchen. Somebody has washed the omelette pan. It wasn\'t Freya.']]); return warp(45, 8, 'west'); }
      await vn(ST.offer, 'freya');
      setFlag('offer');
      warp(45, 8, 'west');
      AU.music('c3town');
      U.system('FREYA\'S OFFER', 'Free. Halcyon would live on Freya\'s grant forever. Kai said he\'d think about it.', 'gold');
    });
    if (d === 'cathedral') return act(async () => {
      if (!flag('board')) { await say([['narr', flag('x2') ? 'The cathedral\'s great door. Kai: "Not yet. Not without a plan that holds. The Design Board, at camp."' : 'The cathedral\'s great door, shut. Two guards, keys on their left hips.']]); return warp(52, 11, 'south'); }
      if (flag('x3')) { await say([['narr', 'The cathedral is quiet now. The gallery is empty.']]); return warp(52, 11, 'south'); }
      return expedition('cathedral', [52, 11]);
    });
    if (d === 'grate') return act(async () => {
      if (!flag('ship')) { await say([['narr', flag('x1') ? 'The Abyss grate. Its lift is dead: it runs on the granary function, and the version it runs is broken. Ship the fix at camp first.' : 'An iron grate in the square\'s south side. Warm air comes up from below. Kai won\'t look at it.']]); return warp(53, 30, 'north'); }
      if (flag('x2')) { await say([['narr', 'The grate\'s lift goes all the way down now. Mother Ash is at the bottom.']]); W3.fade = 0.6; await wait(300); warp(90, 39, 'north'); W3.fade = 0; return; }
      return expedition('abyss', [53, 30]);
    });
    if (d === 'stair') return act(async () => {
      if (flag('x1')) { await say([['narr', 'The stair up through the Cold Stores. Wen\'s pantry is empty now; she\'s at camp.']]); return warp(96, 10, 'west'); }
      return expedition('cold', [96, 10]);
    });
    if (d === 'rope') return act(async () => {
      AU.sfx('steps'); W3.fade = 0.6; await wait(400); warp(53, 30, 'north'); W3.fade = 0;
      if (!flag('ropeup')) { setFlag('ropeup'); U.system('BACK UP', 'The camp next. Something is waiting there.', 'gold'); }
    });
    if (d === 'vault') return act(async () => {
      if (!reckonOpen()) { await say([['narr', flag('x3') ? 'The Granaries\' vault, sealed from inside. Selvaria went in with the last of the old records. (The Regent\'s Sum opens once Chapter 4\'s first expedition is cleared.)' : 'A vault door, frosted shut. Somebody has written "RECORDS" on it in a clear, careful hand.']]); return warp(96, 4, 'south'); }
      if (flag('x4')) { await say([['narr', 'The vault is open and empty. Every sum in it is right.']]); return warp(96, 4, 'south'); }
      return expedition('regent', [96, 4]);
    });
    if (d === 'archive') return act(archive);
  }
  async function sure() {
    await vn(ST.sure, 'c3sad');
    setFlag('sure');
    AU.music('c3town');
    U.system('[GOAL] THE COLD STORES', 'The granary gate is at the east wall. Its keeper only lets in people who know their grain.', 'gold');
  }
  async function gate() {
    if (flag('gate1')) return;
    if (!flag('sure')) return say([['keeper', 'Stores are closed to visitors. Come back when you\'ve business.', 'neutral']]);
    faceTo('keeper', 'you');
    await say([['keeper', 'Into the stores? Show me you know grain from grain.', 'neutral']]);
    AU.music('quest');
    const r = await G.gate();
    xp(r.ok ? 25 : 12);
    setFlag('gate1');
    AU.sfx('door');
    await say([['keeper', r.ok ? 'Right sack, right shelf, every one. In you go.' : 'Close enough. Mind the minimum stays.', 'neutral']]);
    AU.music('c3town');
  }
  // An expedition from its door. at: where you stand to go back in.
  async function expedition(id, at) {
    const how = await new Promise(res => {
      const names = { cold: ['THE COLD STORES', 'Expedition I: two raid floors, the Quartermaster and the Granary Keeper. Somewhere at the top, someone is running Freya\'s pantry.'],
        abyss: ['THE ABYSS', 'Expedition II: three raid floors, the Single Saint, the Catalogue and the Sinkhole. At the bottom, Mother Ash.'],
        cathedral: ['THE CATHEDRAL', 'Expedition III: four raid floors, up to the gallery. The Precentor, the Archivist, Sir Aurelian\'s Shadow, and Princess Selvaria.'],
        regent: ['THE REGENT\'S SUM', 'The reckoning: four raid floors down into the vault, and Selvaria, still honest.'] }[id];
      const curses = [!dev('sum') ? 'The Drinking Barrier (every hit 40% stronger)' : null, !dev('oven') ? 'Cold Grain (a curse card in every deck)' : null].filter(Boolean);
      const b = U.panel(`<p>${esc(names[1])}</p><p class="muted small">Two of Seymour's Tapes: lose twice more and the expedition ends, back at camp, from its first floor.${curses.length ? ` Curses on these floors: ${esc(curses.join('; '))}.` : ''}</p>
        <div class="row"><button class="primary" id="g3-solo">Go in</button><button class="ghost" id="g3-party">Host a party</button><button class="ghost" id="g3-join">Join a party</button><button class="ghost" id="g3-not">Not yet</button></div>`, { title: names[0], noClose: true });
      b.querySelector('#g3-not').onclick = () => { U.closePanel(); res(null); };
      ['solo', 'party', 'join'].forEach(k => { b.querySelector('#g3-' + k).onclick = () => { U.closePanel(); res(k); }; });
    });
    if (!how) return warp(at[0], at[1]);
    W3.halt();
    AU.music('c3dungeon');
    const r = await R3.play(id, how);
    W3.enter();
    if (!r.won) {
      warp(10, 21, 'east');
      await say([['narr', 'Back at camp. The expedition starts again from its first floor whenever you\'re ready.']]);
      return;
    }
    const n = { cold: 'x1', abyss: 'x2', cathedral: 'x3', regent: 'x4' }[id];
    setFlag(n);
    if (id !== 'regent') { const q = await G.why(id); xp(q && q.ok ? 25 : 10); }
    if (id === 'cold') { warp(9, 24, 'west'); await vn(ST.wen, 'c3cafe'); applyState(); U.system('[GOAL] CAMP', 'Grandma Wen\'s Cache Café is open. Doug and Kevin have a problem. And the terminal has a function to ship.', 'gold'); AU.music('camp'); }
    if (id === 'abyss') { warp(88, 36, 'north'); applyState(); await ashScene(); }
    if (id === 'cathedral') { warp(52, 23, 'north'); applyState(); await tellHer(); }
    if (id === 'regent') { warp(52, 23, 'north'); applyState(); await vn(ST.reckon, 'c3sad'); reckonReward(); }
  }

  // The Cold Stores yard.
  async function sackTalk() {
    if (flag('thaw')) return say([['narr', 'The founding grain, thawed. A handful has gone to the cathedral, by tomorrow, at Standard rates.']]);
    await say([['clerk', 'Frozen solid. I need a handful for the cathedral by tomorrow, and the regent wants it cheap. She always wants it cheap.', 'neutral']]);
    const r = await G.thaw();
    setFlag('thaw'); xp(r.ok ? 20 : 10);
  }
  async function merchant() {
    if (flag('toll')) return say([['merchant', 'Pay for my own carting! Whoever heard of such a thing. Everyone, apparently.', 'neutral']]);
    faceTo('merchant', 'you');
    await say([['merchant', 'I cart the city\'s grain out to sell. The stores pay the carters. Sweet arrangement, eh?', 'neutral']]);
    const r = await SD.quiz.ask({ c: 's3class', type: 'mc', q: 'The stores own the grain (an S3 bucket) and the merchant downloads lots of it. How do you make him pay for the requests and the transfer, not the stores?',
      opts: ['Turn on Requester Pays for the bucket, so the requester is billed for requests and data transfer', 'Move the grain to Standard-IA, so his downloads carry a retrieval fee', 'Give him a presigned URL, so his downloads are billed to his account', 'Turn on Transfer Acceleration, so he pays the per-gigabyte transfer charge'], a: 0,
      no: [null, 'The retrieval fee is billed to the bucket owner, not to the merchant.', 'A presigned URL acts with the signer\'s permissions, and the bucket owner still pays.', 'Acceleration adds a charge to whoever owns the bucket.'],
      why: 'With Requester Pays, the requester pays for requests and data transfer, and the bucket owner pays only for storage. Requests must be authenticated, so AWS knows whom to bill.',
      eli5: 'The shop still pays rent for the shelves, but whoever takes things out pays the porter.' }, { title: 'THE MERCHANT\'S TOLL' });
    setFlag('toll'); xp(r && r.ok ? 15 : 6);
    await say([['merchant', r && r.ok ? 'Requester Pays. Well. I suppose I am the requester.' : 'Hah. Not today, friend.', 'neutral']]);
  }
  // The Old Archive: a cellar whose lock wants the partition limit, typed. Optional.
  async function archive() {
    if (flag('archive')) return sc.P.face === 'north' ? warp(33, 28, 'north') : warp(33, 30, 'south');
    await say([['narr', 'The Old Archive\'s cellar door. A brass lock with a dial and a question scratched above it: "HOW MANY WRITES A SECOND CAN ONE PARTITION TAKE?"']]);
    const r = await SD.quiz.ask({ c: 'ddbkey', type: 'num', q: 'About how many write request units per second can a single DynamoDB partition serve?', unit: 'writes a second', lo: 1000, hi: 1000, ans: '1,000 (and 3,000 reads)',
      why: 'Each partition supports up to 3,000 read units and 1,000 write units a second. That\'s why one hot key throttles, however much capacity the table has.',
      eli5: 'Each checkout lane scans a thousand items a second at most. Ten lanes help nobody if everyone queues at one.' }, { title: 'THE ARCHIVE LOCK' });
    if (!(r && r.ok)) { await say([['narr', 'The dial clicks back to zero. The door stays shut. (Kevin would know.)']]); return warp(33, 28, 'north'); }
    setFlag('archive'); xp(20); AU.sfx('x-lock');
    S.seeConcept('ddbkey');
    await say([['narr', 'The lock gives. Inside: shelves of ledgers, and on top of them, one of Kyu\'s runbook pages: "Partition key = who gets throttled. Pick one with a lot of values. A day a year, everybody. (Who wrote that? Not me.)"']]);
    U.system('SECRET: KYU\'S PAGE 5', 'Choosing a partition key is on your cheat sheet. +20 XP.', 'gold');
    warp(33, 30, 'south');
  }

  // The camp.
  async function wenTalk() {
    faceTo('wen', 'you');
    if (!flag('gary')) {
      setFlag('gary');
      await say([['wen', 'Did I ever tell you about Gary, dears? Bought a half-price croissant every day for years. One day in 1984, he didn\'t come.', 'neutral'],
        ['wen', 'Later I found out it was the day he quit his job. I never found out what the job was.', 'sad']]);
      if (flag('x1') && !sc.actors.kage.hidden) await say([['narr', 'Across the camp, Kagemaru stops polishing a pin for a moment. Then he goes on.']]);
    }
    if (flag('cache')) return say([['wen', rnd(['Warm shelf, warm oven, warm hearts. Mind the TTL on the buns.', 'The keepsakes are ranked, dear. Most asked for at the front.', 'Eat something. You look like a cache miss.']), 'warm']]);
    await say([['wen', 'Now. The ration office upstairs is slow as treacle. Be my shelf for a morning, and I\'ll warm your oven for the floors.', 'smile']]);
    AU.music('c3cafe');
    const r = await G.cacheRush();
    setFlag('cache'); setDev('oven'); xp(r.ok ? 30 : 15);
    AU.sfx('heal'); U.flash();
    U.system('WEN\'S WARM OVEN', 'Cold Grain is lifted: no more curse cards in your deck.', 'gold');
  }
  async function dougTalk() {
    faceTo('doug', 'you');
    if (flag('bread')) return say([['doug', rnd(['Kevin hasn\'t been throttled in two days. He doesn\'t know what to do with himself.', 'A hundred thousand keys. Each a bit warm. None hot. That\'s the dream.']), 'smile']]);
    await say([['doug', 'Kevin\'s throttled again. The barrier\'s ration ledger. Every morning, same thing.', 'tired'], ['kevin', 'THROTTLED.']]);
    AU.music('quest');
    const r = await G.breadLine();
    setFlag('bread'); xp(r.ok ? 30 : 15);
    await say([['narr', 'Kai takes out the burnt page he carries, Hana\'s ink in the margin. A sum that works out to a day a year.'],
      ['kai', 'It\'s a key. She was choosing a key. Spread across everyone, and nobody gets throttled.', 'shock']]);
    setDev('sum');
    AU.sfx('heal'); U.flash();
    U.system('HANA\'S SUM', 'The Drinking Barrier is lifted: hits on these floors are no longer 40% stronger.', 'gold');
    AU.music('camp');
  }
  async function terminal() {
    if (flag('ship')) return say([['narr', 'granary-fn: live → 4. The grate\'s lift runs.']]);
    if (!flag('x1')) return say([['narr', 'A terminal, dark. Pip has stuck a note on it: "LATER."']]);
    const r = await G.shipIt();
    setFlag('ship'); xp(r.ok ? 30 : 15);
    U.system('THE GRATE\'S LIFT RUNS', 'Expedition II: the Abyss, through the grate south of Halcyon\'s square.', 'gold');
  }
  async function kageTalk() {
    faceTo('kage', 'you');
    if (!flag('kage')) {
      setFlag('kage');
      return say([['kage', 'Card pins. Very cheap. Very helpful. I am always helpful.', 'smirk'], ['kage', 'That bunker of Seymour\'s, by the way. What does he keep in it? Just asking. Helpfully.', 'neutral']]);
    }
    return say([['kage', rnd(['Pins for every card. Cheap. Have I mentioned helpful?', 'Your knight friend. Seymour. Does he ever leave the bunker? Just curious.']), 'smirk']]);
  }
  async function jarVisit() {
    setFlag('jar');
    await vn(ST.jar, 'freya');
    applyState();
    AU.music('camp');
    U.system('[GOAL] CAMP, AT NIGHT', 'Someone is waiting by the fire.', 'gold');
    W3.night = true;
    setFlag('aurelian'); applyState();
    await vn(ST.aurelian, 'c3sad');
    AU.music('camp');
  }
  async function aurTalk() {
    faceTo('aurc', 'you');
    if (flag('echoes')) return say([['aurelian', rnd(['Twelve names. I can read every one in the dark.', 'Ask me anything about the records. Once. That was the bargain. Ask anyway.']), 'tired']]);
    await say([['aurelian', 'The choir sings late. Let me show you the cathedral\'s records, and where they lie.', 'tired']]);
    const r = await G.echoes();
    setFlag('echoes'); setDev('gauntlet'); xp(r.ok ? 30 : 15);
    W3.night = false;
    U.system('AURELIAN\'S GAUNTLET', 'A boon: once a fight, one player\'s hit is split across the party (a card in your hand).', 'gold');
  }
  async function boardTalk() {
    if (flag('board')) return say([['narr', 'Halcyon\'s ration office, pinned to the board: cache, spread key, no scans, a proxy. It held.']]);
    if (!flag('aurelian')) return say([['narr', 'The Design Board, blank. Pip: "Later. You\'ll know what to draw once you know the cathedral."']]);
    const r = await G.board();
    setFlag('board'); xp(r.ok ? 40 : 20);
    U.system('THE CATHEDRAL DOOR', 'Expedition III: the Cathedral, through its great door in Halcyon. Selvaria is at the top.', 'gold');
  }

  // The bottom of the Abyss.
  async function ashScene() {
    await vn(ST.ash, 'c3sad');
    await vn(ST.ash2);
    setFlag('ash'); setDev('dayayear');
    AU.sfx('levelup'); U.flash();
    U.system('KAI\'S UPGRADE: A DAY A YEAR', 'Share the Load becomes A Day a Year: one hit, spread across the whole party and every citizen on the field.', 'gold');
    AU.music('c3sad');
  }
  async function ashTalk() {
    faceTo('ash', 'you');
    if (!flag('x2')) return;
    return say([['ash', rnd(['Insult it until it makes a mistake. Works on regents too.', 'Go on, boy. Up the rope. Tell that Hero nothing.', 'Nobody ever asked me. You ask them. All of them.']), 'amused']]);
  }
  async function register() {
    if (flag('register')) return say([['narr', 'The Saints\' Register, lit, and every question a Query.']]);
    const r = await G.register();
    setFlag('register'); xp(r.ok ? 30 : 15);
    AU.sfx('heal');
  }

  // The choice.
  async function tellHer() {
    await vn(ST.tellher, 'c3sad');
    setFlag('tellher');
    AU.music('c3town');
    U.system('[GOAL] ASK', 'Ask Noor what she wants. She\'s on the cathedral steps.', 'gold');
  }
  async function askNoor() {
    await vn(ST.asknoor, 'c3sad');
    setFlag('asknoor');
    AU.music('c3town');
    U.system('[GOAL] SAINT\'S DAY', 'Read Hana\'s speech at the barrier\'s heart, in the square.', 'gold');
  }
  async function speech() {
    const pages = w().pages.length;
    await vn(ST.speech, 'c3sad');
    if (pages === 5) await say([['narr', 'Kai has every page of it, all five, margins and all. He reads the sums out too. Nobody in the square has ever heard the sums.']]);
    await vn(ST.argue);
    const pick = await new Promise(res => {
      const b = U.panel(`<p>The square is quiet. Kai's hand is on the barrier. Noor is watching. So is the city.</p>
        <div class="opts col"><button class="opt" data-c="unmake">Unmake the rewrite. A day a year, from everyone.</button><button class="opt" data-c="leave">Leave it. Come back with root.</button></div>`, { title: 'THE CHOICE', noClose: true });
      b.querySelectorAll('[data-c]').forEach(el => { el.onclick = () => { U.closePanel(); res(el.dataset.c); }; });
    });
    c3().choice = pick; setFlag('speech'); setFlag('choice');
    if (pick === 'unmake') { await vn(ST.unmake, 'c3sad'); AU.sfx('x-barrier'); } else await vn(ST.leave, 'c3sad');
    xp(pages * 10 + 40);
    await vn(ST.uptima, 'kyusad');
    warp(8, 15, 'north'); applyState();
    await vn(ST.clean, 'camp');
    setFlag('clean');
    await vn(ST.freed, 'camp');
    setFlag('freed'); applyState();
    c3().f.done = true; S.persist();
    await endCard();
  }

  // ---------- The reckoning ----------
  // It opens once the party clears chapter 4's first expedition (S.save.c4, or SD.c3world.openReckoning()).
  function reckonOpen() {
    if (!flag('x3')) return false;
    const c4 = S.save.c4;
    return flag('reckon') || !!(c4 && c4.f && (c4.f.x1 || c4.f.exp1));
  }
  W3.openReckoning = () => { setFlag('reckon'); if (sc) applyState(); };
  function reckonReward() {
    if (flag('reckard')) return;
    setFlag('reckard');
    c3().deck = (c3().deck && c3().deck.length ? c3().deck : R3.startDeck()).concat('g-hanasum');
    xp(60); S.persist();
    U.system('KAI\'S ENDING · A CARD OF HIS OWN', 'Hana\'s Sum joins your deck for good. +60 XP.', 'gold');
  }

  // Pages of Hana's speech.
  async function pickPage(i) {
    w().pages.push(i); S.persist();
    AU.sfx('x-page');
    U.system('A PAGE OF HANA\'S SPEECH', `${w().pages.length} of 5. There's a question in the margin, in her hand.`, 'gold');
    const r = await G.page(PAGES[i][2]);
    xp(r && r.ok ? 15 : 6);
    applyState();
  }

  // ---------- Talking ----------
  const BARKS = {
    baker: ['Fresh loaves! Grant-baked, grant-sold. Everything\'s on the grant now.', 'You look like a cook. You hold your hands like a cook.'],
    c1: ['Lovely evening. It\'s always a lovely evening here.', 'The bells? That\'s the crowning. Every night. Lovely.'],
    c2: ['My mother says the barrier hums a song. I can\'t hear it. I\'ve never heard it stop either.', 'Ration day tomorrow. Ration day is every day.'],
    child: ['Does the Saint get to go home after?', 'I\'m racing the barrier! It always wins.'],
    lord: ['Lord Brannick. The regent\'s arithmetic keeps us all fed. One shouldn\'t ask what it adds up.', 'Foreigners. Always foreigners, in my day.'],
    g1: ['Move along.', 'Keys? On the left. Always on the left. Regulation.'],
    g2: ['The gallery is closed to the public.', 'Saint\'s Day soon. Big night. Bigger Drawing.'],
    keeper: ['Mind your minimum stays in there.'], clerk: ['Thawed. Finally.'],
    selvaria: ['Do the sum, Kai Mercer. Then shout.', 'One girl a decade, against a hundred thousand lives. Show me a better number.'],
    aurelian: ['...', 'Not now. Please. Not before the Drawing.']
  };
  function talk(id) {
    if (busy) return;
    if (sc.actors[id] && !sc.actors[id].thing) faceTo(id, 'you');
    const fns = { heart, noor: noorTalk, gate, keeper: gate, sack: sackTalk, clerk: sackTalk, merchant, wen: wenTalk, doug: dougTalk, kevin: dougTalk, term: terminal, kage: kageTalk, kstall: kageTalk,
      aurc: aurTalk, board: boardTalk, ash: ashTalk, saints: register, noorc: () => say([['noor', rnd(['So this is a camp of people who don\'t want anything from me. It\'s loud.', 'Seo-yeon\'s forms are hard. I fell over twice. She said that was "a start".']), 'smile']]),
      stove: () => flag('freed') && !flag('clean') ? say([['narr', 'The camp kitchen. Every pot hung by size.']]) : say([['narr', flag('jar') ? (flag('choice') ? 'The shelf over the stove. Freya\'s jar has gone dark.' : 'The shelf over the stove. Freya\'s jar, warm and gold. Kai doesn\'t look at it.') : 'Kai\'s stove, the camp\'s kitchen. Every pot clean.']]),
      office: () => say([['narr', 'THE RATION OFFICE. A queue out of the door, and a sign: "PLEASE WAIT. THE LEDGER IS BUSY."']]),
      bell: () => { AU.sfx('x-bell'); return say([['narr', 'The bell tower. Every night it rings the crowning, because the crowning is in the template.']]); },
      well: () => say([['narr', 'A well that echoes every change made above it, before and after, for exactly one day. Then it goes quiet.']]) };
    if (/^page\d$/.test(id)) return act(() => pickPage(+id.slice(4)));
    if (ORDER.includes(id)) return act(() => say([[id, rnd({ mira: ['Eat something. I mean it.', 'I\'m not speaking to either of them. You can tell them that.'], kai: ['Don\'t. Not yet.', 'I\'m fine. I\'m cooking. That\'s fine.'], seoyeon: ['...', 'Every guard here holds their sword the same way. Drilled.'], dutch: ['Every guard keeps their keys on the left. Why does that bother me?', 'Someone did this on purpose. I want to know how.'] }[id])]]));
    if (fns[id]) return act(fns[id]);
    const VOICE = { c1: 'citizen', c2: 'citizen', g1: 'guard', g2: 'guard' };
    if (BARKS[id]) return act(() => say([[VOICE[id] || id, rnd(BARKS[id])]]));
  }

  // ---------- The objective, and where the arrow points ----------
  function step() {
    if (!flag('arrive')) return ['Take the lift up to floor 21', [21, 20]];
    if (!flag('heart') && zone && zone[1] === 'camp') return ['Take the lift back up to Halcyon', [21, 20]];
    if (!flag('heart')) return ['Touch the barrier\'s heart, in the square', [52, 22]];
    if (!flag('crown')) return ['Go to the crowning on the cathedral steps', [51, 12]];
    if (!flag('offer')) return ['Go in by the cathedral\'s kitchen door', [46, 8]];
    if (!flag('sure')) return ['Go back to the square', [52, 22]];
    if (!flag('gate1')) return ['Get through the granary gate, east', [73, 12]];
    if (!flag('x1')) return ['Climb the Cold Stores\' stair', [97, 10]];
    if (!flag('cache')) return ['Talk to Grandma Wen at camp', [4, 27]];
    if (!flag('bread')) return ['Help Doug and Kevin', [15, 15]];
    if (!flag('ship')) return ['Ship It at the camp terminal', [17, 14]];
    if (!flag('x2')) return ['Go down through the Abyss grate', [53, 31]];
    if (!flag('ropeup')) return ['Climb the rope back up', [96, 26]];
    if (!flag('jar')) return ['Go back to camp', [12, 21]];
    if (!flag('echoes')) return ['Talk to Sir Aurelian by the fire', [12, 24]];
    if (!flag('board')) return ['Draw the Design Board at camp', [17, 27]];
    if (!flag('x3')) return ['Go in by the cathedral\'s great door', [52, 10]];
    if (!flag('asknoor')) return ['Ask Noor what she wants', [51, 12]];
    if (!flag('speech')) return ['Read Hana\'s speech at the barrier', [52, 22]];
    if (reckonOpen() && !flag('x4')) return ['The Granaries\' vault is open', [96, 3]];
    return ['Explore. Find Hana\'s pages', null];
  }
  const target = () => step()[1];

  // ---------- HUD ----------
  function hud() {
    const el = $('#w-hud'); if (!el) return;
    const sv = S.save, need = S.xpFor(sv.level);
    el.innerHTML = `<span class="hud-chip"><b>${esc(name(lead()))}</b> · Lv ${sv.level}</span>
      <div class="bar xp w-xp" title="XP"><i style="width:${Math.min(100, sv.xp / need * 100)}%"></i></div>
      <span class="hud-chip w-goal">${esc(step()[0])}</span>
      <span class="hud-chip" title="Pages of Hana's speech">📜 ${w().pages.length}/5</span>
      <span class="w-sp"></span>
      <button class="ghost" id="w-codex" aria-label="Cheat sheet" title="Cheat sheet">📖</button>
      <button class="ghost" id="w-snd" aria-label="Sound on or off">${AU.muted() ? '🔇' : '🔊'}</button>
      <button class="ghost" id="w-menu" aria-label="Menu">☰</button>`;
    $('#w-codex').onclick = () => U.codex();
    $('#w-snd').onclick = e => { AU.toggleAll(); e.currentTarget.textContent = AU.muted() ? '🔇' : '🔊'; };
    $('#w-menu').onclick = () => SD.main.menu();
  }
  const prevHud = SD.ch1.hud;
  SD.ch1.hud = () => (W3.active ? hud() : prevHud());

  // ---------- Entering and leaving ----------
  W3.enter = function () {
    SD.ch1.halt();
    if (SD.c2world && SD.c2world.halt) SD.c2world.halt();
    SD.ch1.dress();
    SD.main.show('world');
    $('#w-canvas').setAttribute('aria-label', 'The Free Cloud\'s camp, Halcyon under its barrier, the Cold Stores and the bottom of the Abyss');
    if (!sc) makeScene(); else applyState();
    zone = null; lastTile = '';
    W3.active = true;
    sc.start();
    if (!flag('hinted')) { setFlag('hinted'); U.system('HOW TO MOVE', 'Arrow keys or WASD to walk, E or Enter to talk. Or tap where you want to go, and tap someone to talk to them. The yellow arrow points at your next step.'); }
  };
  W3.halt = function () { W3.active = false; if (sc) { sc.stop(); sc.locked = false; } };

  // The chapter's start, from a new game or from the chapter before.
  W3.start = async function () {
    c3(); S.persist();
    SD.ch1.halt(); U.closePanel(); U.stage(null);
    sc = null;
    if (!flag('cold')) await opening();
    if (c3().f.done) { W3.enter(); return endCard(); }
    W3.enter();
    if (!flag('wake')) act(campWake);
  };
  SD.chapterStart = SD.chapterStart || {};
  SD.chapterStart[3] = () => W3.start();

  async function endCard() {
    W3.halt();
    AU.music('title');
    const next = SD.chapterStart && SD.chapterStart[4];
    const ch = c3().choice === 'leave' ? 'Hana stayed in the barrier, and Noor stayed Saint. Kai promised to come back with root.' : 'The barrier takes a day a year from everyone now. Noor is at camp. The last of Hana is gone, and she wasn\'t afraid.';
    return new Promise(res => {
      const b = U.panel(`<p><b>Chapter 3: The Granaries</b>, floors 21 to 40.</p><p>${esc(ch)}</p>
        <p class="muted small">Pages of Hana's speech: ${w().pages.length} of 5. ${flag('x4') ? 'The Regent\'s Sum: done.' : 'The Regent\'s Sum opens in the Granaries\' vault once Chapter 4\'s first expedition is cleared.'}</p>
        <div class="row">${next ? '<button class="primary" id="g3-next">Continue to Chapter 4</button>' : '<p class="muted">Chapter 4 is on its way.</p>'}<button class="ghost" id="g3-camp">Back to camp</button><button class="ghost" id="g3-title">Title</button></div>`, { title: 'END OF CHAPTER 3', noClose: true });
      const nx = b.querySelector('#g3-next');
      if (nx) nx.onclick = () => { U.closePanel(); res(); SD.chapterStart[4](); };
      b.querySelector('#g3-camp').onclick = () => { U.closePanel(); warpLater(10, 21); W3.enter(); res(); };
      b.querySelector('#g3-title').onclick = () => { U.closePanel(); res(); SD.main.title(); };
    });
  }
  const warpLater = (x, y) => { w().pos = [x, y]; S.persist(); if (sc) warp(x, y, 'east'); };

  // ---------- The chapter 3 demo's own start ----------
  // Pick a lead, as if chapters 1 and 2 were played: level 8, the Mailroom's cards, every earlier concept on the
  // cheat sheet.
  W3.newGame = async function () {
    const id = await SD.ch1.choose();
    const sv = S.save;
    if (!sv.c1 || !sv.c1.lead) sv.c1 = { lead: id, f: { intro: true, cart: true, brief: true, done: true }, deck: SD.starterDeck.map(x => ({ id: x, up: false })), pos: null };
    else sv.c1.lead = id;
    sv.c3 = { lead: id, f: {}, dev: {}, w: { x: {}, pos: null, pages: [] } };
    sv.name = T1.leads[id].name.split(' ')[0];
    sv.flags.prologue = true; sv.flags.ch1 = true;
    if ((sv.level || 1) < 8) { sv.level = 8; sv.xp = 0; }
    Object.keys(SD.concepts).forEach(c => { if (SD.concepts[c].zone && SD.concepts[c].zone < 3) S.seeConcept(c); });
    S.persist();
    sc = null;
    W3.start();
  };
  W3.resume = function () {
    const sv = S.save;
    if (!sv.c3 || !sv.c3.lead) return W3.newGame();
    if (sv.run) { sv.run = null; S.persist(); }
    sc = null;
    W3.start();
  };
  if (ON) {
    // The demo's title: Chapter 3 straight away.
    const boot = () => {
      const M = SD.main, title = M.title;
      M.title = function () {
        title();
        const box = $('#title-actions'), sv = S.save;
        if (!box || box.querySelector('#t-start')) return;
        const has = !!(sv.c3 && sv.c3.lead);
        box.innerHTML = (has ? `<button class="primary" id="t-c3go">Continue · ${esc(T1.leads[sv.c3.lead].name)}</button><button class="ghost" id="t-c3new">New game</button>` : '<button class="primary" id="t-c3new">Play Chapter 3: The Granaries</button>') + '<button class="ghost" id="t-help">How to play</button>';
        const h = $('#t-help');
        if (h) h.onclick = () => U.panel('<p>Walk with the arrow keys or WASD, or tap where you want to go. Tap someone, or press E, to talk. The yellow arrow points at your next step.</p><p>In the dungeons, play cards to fix incidents. You have two of Seymour\'s Tapes for each expedition.</p>', { title: 'HOW TO PLAY' });
        if (has) $('#t-c3go').onclick = () => W3.resume();
        $('#t-c3new').onclick = () => { if (!has) return W3.newGame(); const c = U.panel('<p>Start chapter 3 again from the cold open? Your level and cheat sheet stay.</p><div class="row"><button class="primary" id="n-y">Start again</button><button class="ghost" id="n-n">Cancel</button></div>', { title: 'NEW GAME' }); c.querySelector('#n-y').onclick = () => { U.closePanel(); W3.newGame(); }; c.querySelector('#n-n').onclick = U.closePanel; };
      };
      const foot = $('.t-foot'); if (foot) foot.textContent = 'Chapter 3 demo: The Granaries · Built on the AWS documentation · Saves automatically';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { boot(); SD.main.title(); }, 0), { once: true });
    else { boot(); }
  }

  // A wrong answer in a dungeon: that concept's page of the cheat sheet comes back sooner (the raid records it).
  R3.onMiss = c => { S.seeConcept(c); };
  // The confrontation's three proofs, at the gallery's door (js/c3-raid.js's say hook).
  R3.evidence = async function () {
    const r = await G.evidence();
    setFlag('evidence'); xp(r.ok ? 40 : 20);
    await U.dialog([{ s: 'narr', t: r.right === 3 ? 'When the third proof lands, the whole nave stands. Sir Aurelian takes off his gauntlet and holds it up so the city can read the names.' : 'Enough of it lands. Sir Aurelian takes off his gauntlet and holds it up so the city can read the names.' }]);
    AU.music('c3culprit');
  };

  // For tools/c3_check.js.
  W3.debug = { busy: () => busy, flags: f => { Object.assign(w().x, f); S.persist(); if (sc) applyState(); }, flag, dev, place: (x, y) => sc && warp(x, y), scene: () => sc, step, act, w, c3, talk, door };
})();
