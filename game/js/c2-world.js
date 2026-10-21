// Chapter 2's act 1 as a place you explore instead of a cutscene you watch: the edge of the Cloud the night after
// the wipe, the road to Freya's tower at dawn, the scrap field where she dumps what she deletes (Pingsby's quarter
// to the north, what's left of Brookfall to the south), Seymour's island across a chasm, the tower's foot where the
// Free Cloud's first fire is lit, and Thornwick on the tower's first floor. Every Story Bible beat is still here, as
// something you find; the minigames are in js/c2-games.js and the art in js/c2-art.js.
//
// Like a Zelda overworld, the map is a hub with branches, and what opens it up is something you understand: the
// Version Lens (earned by restoring Pingsby's sign) shows what's under the delete markers, deleted paths you can
// walk once you can see them, and the secrets off the main path. An arrow at the screen's edge points at the next
// step. It plays when the page sets window.SD_CH2 (the chapter 2 demo) or the URL has ?ch2, and hands over to the
// vector slice's Expedition I and camp (js/vec-ch2.js) at the top of Thornwick's stair.
// The map is drawn in code on js/scene.js: 96 x 40 tiles.
(function () {
  const K = SD.vec;
  if (!K || !K.on || !K.ch2) return;
  K.explore = !!window.SD_CH2 || /[?&]ch2\b/.test(location.search);
  if (!K.explore) return;
  const W2 = SD.c2world = {};
  const U = SD.ui, S = SD.state, AU = SD.audio, R = SD.run, T = SD.ch1story, A = SD.c2art, G = SD.c2games, C2 = K.ch2;
  const $ = U.$, esc = s => U.esc(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

  // ---------- Save ----------
  // S.save.c2 (js/vec-ch2.js) gains w: { x: flags, pos, letters: [found], given: [delivered], lens }
  const c2 = () => S.save.c2 || (S.save.c2 = { f: {}, dev: {} });
  const w = () => { const s = c2(); return s.w || (s.w = { x: {}, pos: null, letters: [], given: [], lens: false }); };
  const flag = k => !!w().x[k];
  const setFlag = k => { w().x[k] = true; S.persist(); };
  const lead = () => (S.save.c1 && S.save.c1.lead) || 'mira';
  const others = () => T.order.filter(id => id !== lead());
  // A line by whoever you play is 'lead'; a text can change with the lead.
  const L = lines => lines.map(([s, t, e]) => ({ s: s === 'lead' ? lead() : s, t: typeof t === 'object' ? (t[lead()] || t.other) : t, e }));
  const say = lines => U.dialog(L(lines));

  // ---------- The map ----------
  const MW = 96, MH = 40;
  const PROPS = [];
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
    // The edge: an island of turf on the lip of nothing, ragged at the corners.
    rect(4, 14, 16, 26, '.');
    [[4, 14], [5, 14], [4, 15], [16, 14], [4, 26], [5, 26], [4, 25], [16, 26], [15, 26]].forEach(([x, y]) => set(x, y, 'V'));
    [[6, 15], [14, 15], [5, 24], [15, 25], [12, 25]].forEach(([x, y]) => set(x, y, 'T'));
    // The road east, between dead trees.
    rect(17, 18, 34, 22, '.');
    for (let x = 17; x <= 34; x += 2) { if (hash(x, 1) % 3) set(x, 18, 'T'); if (hash(x, 2) % 3) set(x + 1, 22, 'T'); }
    [[24, 18], [25, 18], [26, 22], [27, 22]].forEach(([x, y]) => set(x, y, 'f'));
    // The scrap field: a ring of heaps round it, rows of heaps across it with gaps, Pingsby's quarter to the north
    // and Brookfall's remains to the south.
    rect(35, 1, 62, 38, 'x');
    row(35, 62, 1, 'T'); row(35, 62, 38, 'T'); col(35, 1, 38, 'T'); col(62, 1, 38, 'T');
    for (let x = 36; x <= 61; x++) { if (![40, 41, 48, 56, 57].includes(x)) set(x, 15, 'T'); if (![38, 39, 48, 54, 55].includes(x)) set(x, 25, 'T'); }
    for (let y = 2; y <= 37; y++) for (let x = 36; x <= 61; x++) if (g[y][x] === 'x' && hash(x, y) % 23 === 0) set(x, y, 'T');
    // The road comes in through a gap in the ring.
    for (let y = 18; y <= 22; y++) set(35, y, 'x');
    // A cross of paths: the road on through the field, and north-south through the gaps.
    row(6, 62, 20, ','); col(48, 3, 36, ',');
    // A secret in the north: a hollow where the floor was deleted, with a nook beyond it you can only reach on what's
    // still under the delete markers.
    rect(53, 2, 58, 7, 'V'); rect(59, 2, 61, 7, 'x'); row(59, 61, 8, 'T'); row(53, 58, 5, 'G');
    // And one in the south-west, where Kyu left a page.
    rect(38, 31, 43, 37, 'V'); rect(36, 33, 37, 37, 'x'); row(36, 37, 32, 'T'); row(38, 43, 34, 'G');
    // The chasm, with Pingsby's footbridge over it under a delete marker.
    rect(63, 0, 65, 39, 'V'); row(63, 65, 20, 'B');
    // Seymour's island and the tower's foot.
    rect(66, 2, 78, 37, 'x'); row(66, 78, 1, 'T'); row(66, 78, 38, 'T');
    for (let y = 2; y <= 37; y++) for (let x = 67; x <= 77; x++) if (hash(x, y) % 29 === 0 && Math.abs(y - 20) > 1) set(x, y, 'T');
    row(66, 78, 20, ',');
    // The tower's wall, and its door.
    col(79, 0, 39, 'W'); set(79, 20, 'D');
    // Thornwick, the tower's first floor: cobbles inside its walls, the marsh path to the south.
    rect(80, 3, 94, 36, 'c'); row(80, 94, 3, 'T'); row(80, 94, 36, 'T'); col(95, 0, 39, 'T');
    rect(81, 31, 93, 35, '.'); [[83, 33], [86, 34], [90, 32], [92, 34]].forEach(([x, y]) => set(x, y, 'f'));
    set(92, 20, 'U');

    // ---- Props ----
    prop('cartc2', 6, 17, 2, 1);
    PROPS.basket = prop('basket', 9, 22, 2, 1);
    prop('speaker', 20, 19); prop('speaker', 28, 21);
    PROPS.welcome = prop('welcome', 32, 18, 2, 1, { ghost: true, tag: 'DELETE MARKER', solid: false });
    prop('notice', 30, 19);
    // Pingsby's quarter.
    PROPS.po = prop('postoffice', 40, 4, 3, 2, { ghost: true, tag: 'DELETE MARKER', solid: false });
    PROPS.bakery = prop('bakery', 44, 10, 2, 1);
    PROPS.band = prop('bandstand', 53, 10, 3, 2, { ghost: true, tag: 'NO VERSIONS', tagCol: '#7a7490', solid: false });
    prop('halfhouse', 36, 9, 3, 2); prop('halfhouse', 50, 3, 3, 2, { color: '#e9a0b0' }); prop('halfhouse', 37, 3, 2, 2, { color: '#e8c46a' });
    // Brookfall's remains.
    prop('shrinebit', 48, 28, 3, 2); prop('halfhouse', 55, 29, 3, 2, { color: '#9fc98a' }); prop('halfhouse', 40, 27, 3, 2, { color: '#7a9ad0' });
    // Seymour's island.
    PROPS.bunker = prop('bunker', 70, 9, 3, 2);
    PROPS.fire = prop('firesite', 71, 24);
    PROPS.gate = prop('towergate', 79, 20, 1, 1, { solid: false });
    // Thornwick.
    [[81, 5, '#8a7a9a'], [89, 5, '#7a8a9a'], [81, 28, '#9a8a7a'], [89, 28, '#8a9a8a'], [81, 13, '#a08a8a']].forEach(([x, y, color]) => prop('cottage', x, y, 3, 2, { color }));
    PROPS.bell = prop('belltower', 85, 6, 2, 3);
    PROPS.box = prop('postbox', 87, 20);
    prop('poster', 84, 17); prop('poster', 90, 24);
    PROPS.stair = prop('stair', 92, 18, 2, 2);
    [[83, 21], [91, 22], [86, 12], [84, 26]].forEach(([x, y]) => prop('lamp', x, y));
    prop('fence', 81, 30, 3, 1); prop('fence', 90, 30, 4, 1);
    return g.map(r => r.join(''));
  })();
  const groundCh = (map, x, y) => (y < 0 || y >= MH || x < 0 || x >= MW) ? 'V' : map[y][x];
  // Who and what you can talk to, by id: [x, y, name].
  const THINGS = { basket: [9, 22, 'Freya\'s basket'], notice: [30, 19, 'A notice'], sign: [32, 18, 'Pingsby\'s sign'], po: [41, 5, 'The post office'], bakery: [44, 10, 'The bakery sign'],
    band: [54, 11, 'The bandstand'], bridge: [63, 20, 'The chasm'], bunker: [71, 10, 'Seymour\'s bunker'], fire: [71, 24, 'The fire'], box: [87, 20, 'The post box'], bell: [85, 8, 'The bell tower'],
    poster1: [84, 17, 'A poster'], poster2: [90, 24, 'A poster'], runbook: [36, 35, 'A torn page'] };
  // The five lost letters: where each lies, and whether only the lens shows it.
  const LETTERS = [[44, 12, false], [60, 4, false], [57, 13, true], [57, 34, false], [74, 6, false]];
  const HOME = { mira: [8, 19, 'east'], kai: [12, 21, 'west'], seoyeon: [7, 23, 'north'], dutch: [13, 18, 'south'] };
  const ZONES = [
    [(x) => x < 17, 'edge', 'THE EDGE OF THE CLOUD', 'kyusad'],
    [(x) => x < 35, 'road', 'THE ROAD TO THE TOWER', 'road'],
    [(x, y) => x < 63 && y < 15, 'scrap', 'PINGSBY\'S QUARTER', 'explore'],
    [(x, y) => x < 63 && y > 25, 'scrap', 'WHAT\'S LEFT OF BROOKFALL', 'explore'],
    [(x) => x < 63, 'scrap', 'THE SCRAP FIELD', 'explore'],
    [(x) => x < 80, 'island', 'THE TOWER\'S FOOT', 'camp'],
    [() => true, 'town', 'THORNWICK · FLOOR 1', 'town']
  ];
  const zoneAt = (x, y) => ZONES.find(z => z[0](x, y));

  // ---------- The scene ----------
  let sc = null, busy = false, follow = false, zone = null, lastTile = '';
  const trail = [];
  const lensOn = () => !!(w().lens && flag('sign'));
  function phase() {
    if (W2.dusk) return 'dusk';
    if (!flag('notes')) return 'night';
    if (flag('fire')) return 'morning';
    return sc && sc.P && sc.P.x < 35 ? 'dawn' : 'day';
  }
  function person(id, look, x, y, face, extra) {
    const a = sc.addActor(id, Object.assign({ x, y, face: face || 'south', speed: 3.2 }, extra));
    a.look = look;
    a.draw = (ctx, fx, fy, ts, t) => A.person(ctx, a.look, fx, fy, ts, t, a.face, a.moving || (a.path && a.path.length), a.o);
    return a;
  }
  function thing(id) { const [x, y, label] = THINGS[id]; return sc.addActor(id, { x, y, thing: true, label, draw: () => {} }); }
  const solidNow = () => 'TV#WB' + (lensOn() ? '' : 'G');

  function makeScene() {
    const map = BASE.slice();
    const lights = () => {
      const l = [[83.5, 21.2, 1.8, '255,200,120', 0], [91.5, 22.2, 1.8, '255,200,120', 0], [86.5, 12.2, 1.8, '255,200,120', 0], [84.5, 26.2, 1.8, '255,200,120', 0]];
      if (PROPS.fire.lit) l.push([71.5, 24.6, 3, '255,140,60', 1]);
      if (PROPS.bunker.open) l.push([71.5, 10, 1.2, '255,215,110', 0]);
      LETTERS.forEach(([x, y], i) => { if (letterShown(i)) l.push([x + 0.5, y + 0.5, 1, '255,230,150', 1]); });
      return l;
    };
    const def = {
      map, solid: solidNow(), doors: { D: 'gate', U: 'stair' }, ground: false, bg: '#0b0a14', clock: false,
      grade: (ctx, t, vw, vh, cx, cy, ts) => A.grade(ctx, t, vw, vh, cx, cy, ts, phase(), lights(), lensOn()),
      ambience: () => (PROPS.fire.lit && sc && sc.P && Math.abs(sc.P.x - 71) + Math.abs(sc.P.y - 24) < 6) ? 'fire' : zone && zone[1] === 'town' ? 'post' : null,
      under(ctx, ts, t, x0, x1, y0, y1) {
        const lens = lensOn();
        for (let y = Math.max(0, y0); y <= Math.min(y1, MH - 1); y++) for (let x = Math.max(0, x0); x <= Math.min(x1, MW - 1); x++) {
          const c = groundCh(map, x, y), z = zoneAt(x, y)[1];
          const base = c === 'T' || c === '#' ? (z === 'town' ? 'c' : z === 'scrap' || z === 'island' ? 'x' : '.') : c === 'G' ? 'B' : c;
          A.ground(ctx, base, x, y, ts, t, (dx, dy) => { const n = groundCh(map, x + dx, y + dy); return n === 'G' ? 'V' : n; }, lens);
        }
      },
      rowDraw(ctx, y, ts, t, x0, x1) {
        if (y < 0 || y >= MH) return;
        const lens = lensOn();
        for (let x = Math.max(0, x0); x < Math.min(x1, MW); x++) if (map[y][x] === 'T') A.wall(ctx, x, y, ts, t, zoneAt(x, y)[1]);
        PROPS.forEach(p => { if (p.y + p.h - 1 === y && p.x + p.w >= x0 - 1 && p.x <= x1) A.prop(ctx, p, ts, t, lens); });
        LETTERS.forEach(([x, ly], i) => { if (ly === y && letterShown(i)) A.prop(ctx, { kind: 'letter', x, y }, ts, t, lens); });
      },
      doorFor(tx, ty) {
        const a = Object.values(sc.actors).find(o => o.thing && !o.hidden && Math.abs(o.x - tx) <= 1 && Math.abs(o.y - ty) <= 2);
        if (a) return beside(a.id);
        return null;
      },
      overlay(ctx, t, vw, vh) { drawOverlay(ctx, t, vw, vh); }
    };
    sc = SD.scene.create($('#w-canvas'), def);
    sc.addActor('pip', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {} });
    const pos = w().pos || [10, 20];
    const P = sc.player(pos[0], pos[1], 'east');
    P.draw = (ctx, fx, fy, ts, t) => A.person(ctx, lead(), fx, fy, ts, t, P.face, P.moving, null);
    others().forEach(id => { const [x, y, f] = HOME[id]; person(id, id, x, y, f, { name: SD.cast[id].name }); });
    Object.keys(THINGS).forEach(thing);
    LETTERS.forEach(([x, y], i) => sc.addActor('letter' + i, { x, y, thing: true, draw: () => {} }));
    person('coo', 'coo', 41, 7, 'south', { name: 'Coo' });
    person('wren', 'wren', 50, 31, 'north', { name: 'Elder Wren', o: { alpha: 0.5 } });
    if (flag('wren')) sc.place('wren', 72, 25);   // he walked to the fire's ring of stones before you saved
    person('marrow', 'marrow', 86, 10, 'south', { name: 'Goodwife Marrow' });
    person('tilly', 'tilly', 82, 25, 'east', { name: 'Tilly', speed: 1.6 });
    person('v1', 'villager', 86, 19, 'east'); person('v2', 'villager2', 88, 19, 'west'); person('v3', 'villager3', 88, 21, 'north');
    sc.addActor('ctl', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {}, tick });
    sc.onTalk = id => talk(id);
    sc.onDoor = d => door(d);
    applyState();
  }
  const letterShown = i => !w().letters.includes(i) && (!LETTERS[i][2] || lensOn()) && (i !== 4 || flag('seymour')) && flag('coo');

  // Put the world in step with the story (after loading, or after a scene).
  function applyState() {
    const A2 = sc.actors;
    sc.def.solid = solidNow();
    PROPS.welcome.restored = flag('sign'); if (flag('sign')) setTile(32, 18, '#'), setTile(33, 18, '#');
    PROPS.po.restored = flag('coo'); if (flag('coo')) for (let i = 40; i <= 42; i++) { setTile(i, 4, '#'); setTile(i, 5, '#'); }
    PROPS.bakery.state = flag('bakery') ? 'pingsby' : 'freya';
    PROPS.basket.read = flag('notes') ? [1, 1, 1, 1] : null;
    if (flag('bridge')) for (let x = 63; x <= 65; x++) setTile(x, 20, 'b');
    A2.bridge.hidden = flag('bridge');
    PROPS.bunker.open = flag('seymour');
    PROPS.fire.lit = flag('fire');
    PROPS.gate.open = flag('fire');
    PROPS.stair.open = flag('offer');
    A2.coo.hidden = !flag('coo');
    if (flag('fire')) { sc.place('coo', 70, 25); sc.place('wren', 72, 25); A2.coo.face = A2.wren.face = 'north'; }
    A2.wren.o = flag('wren') ? null : { alpha: 0.5 };
    A2.runbook.hidden = flag('runbook');
    LETTERS.forEach((l, i) => { A2['letter' + i].hidden = !letterShown(i); });
    follow = flag('notes');
    others().forEach(id => { const a = A2[id]; a.solid = !follow; a.talk = follow ? false : undefined; a.name = follow ? null : SD.cast[id].name; });
    if (follow) others().forEach(id => { const a = A2[id]; if (Math.abs(a.x - sc.P.x) + Math.abs(a.y - sc.P.y) > 6) sc.place(id, sc.P.x, sc.P.y); });
    refresh();
  }
  function setTile(x, y, c) { const m = sc.def.map; m[y] = m[y].slice(0, x) + c + m[y].slice(x + 1); }
  // The "!" over whoever or whatever has something for you.
  function refresh() {
    if (!sc) return;
    const A2 = sc.actors, lens = lensOn();
    const mark = (id, on, name) => { A2[id].marker = !!on; A2[id].name = name === undefined ? (on ? THINGS[id] && THINGS[id][2] : null) : name; };
    mark('basket', !flag('notes'));
    mark('notice', flag('notes') && !flag('notice'));
    mark('sign', flag('notes') && !flag('sign'));
    mark('po', lens && !flag('coo'));
    mark('bakery', flag('coo') && !flag('bakery'));
    mark('band', lens && !flag('band'));
    mark('bridge', lens && !flag('bridge'));
    mark('bunker', flag('bridge') && !flag('seymour'));
    mark('fire', flag('seymour') && flag('wren') && flag('coo') && !flag('fire'));
    mark('box', flag('town') && !flag('offer'));
    mark('bell', false, null);
    mark('poster1', false, null); mark('poster2', false, null);
    mark('runbook', lens && !flag('runbook'));
    A2.coo.marker = flag('coo') && w().letters.some(i => !w().given.includes(i));
    A2.wren.marker = !flag('wren') && flag('seymour');
    A2.marrow.marker = flag('town') && !flag('bells');
    A2.tilly.marker = flag('town') && !flag('tilly');
    hud();
  }

  // ---------- Every frame ----------
  const barks = [
    'Welcome to the Free Tier, everyone! Everything\'s free!',
    'Deleted things are free to leave in the field! Littering is a feature!',
    'Today\'s forecast: free! Tomorrow\'s: also free!',
    'Thornwick\'s post: now with unlimited free waiting!'
  ];
  let bark = null, barkN = 0;
  function tick() {
    const P = sc.P; if (!P) return;
    const k = P.x + ',' + P.y;
    if (k !== lastTile) {
      if (lastTile) { const [x, y] = lastTile.split(',').map(Number); trail.unshift([x, y]); trail.length = Math.min(trail.length, 6); }
      lastTile = k;
      if (!busy) { w().pos = [P.x, P.y]; S.persist(); }
      const z = zoneAt(P.x, P.y);
      if (!zone || z[2] !== zone[2]) { const first = zone === null; const musicChanged = !zone || z[3] !== zone[3]; zone = z; if (musicChanged && !busy) AU.music(z[3]); if (!first) banner(z[2]); }
      // Freya's loudspeakers, as you pass.
      PROPS.forEach(p => {
        if (p.kind !== 'speaker' || !flag('notes') || Math.abs(p.x - P.x) + Math.abs(p.y - P.y) > 3) return;
        const now = performance.now() / 1000;
        if (p.bark && now - p.bark < 12) return;
        p.bark = now; bark = { p, text: barks[barkN++ % barks.length], t: now };
        AU.sfx('blip');
      });
    }
    AU.weather(phase() === 'night' ? 'gloom' : null);
    if (follow) others().forEach((id, i) => {
      const a = sc.actors[id], to = trail[i];
      if (!to || a.scripted || a.moving || a.path.length) return;
      if (a.x !== to[0] || a.y !== to[1]) { a.speed = 7.5; a.path = [to]; }
    });
    // Tilly walks the square, back and forth.
    const t2 = sc.actors.tilly;
    if (!t2.scripted && !t2.path.length && !t2.moving && !busy) { const to = t2.x <= 82 ? 93 : 82; t2.path = straight(t2.x, t2.y, to, t2.y); }
    if (busy || P.moving || P.path.length) return;
    // Story beats that happen where you walk.
    if (!flag('notes') && P.x >= 15) return act(notYet);
    if (flag('notes') && !flag('tower') && P.x >= 18) return act(towerAtDawn);
    if (flag('notes') && !flag('scrap') && P.x >= 36) return act(scrapArrive);
    if (flag('sign') && !flag('lensHint') && P.x >= 37) { setFlag('lensHint'); if (!lensOn()) U.system('TRY THE LENS', 'Tap 👁 (or press L) to look under the delete markers.'); }
    if (flag('fire') && !flag('town') && P.x >= 80) return act(townArrive);
    LETTERS.forEach(([x, y], i) => { if (letterShown(i) && P.x === x && P.y === y) act(() => pickLetter(i)); });
  }
  const straight = (x0, y0, x1, y1) => { const out = []; let x = x0; while (x !== x1) { x += Math.sign(x1 - x); out.push([x, y0]); } return out; };
  function banner(text) {
    const el = document.createElement('div');
    el.className = 'w-zone'; el.textContent = text;
    $('#screen-world').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  // Freya's barks, and the arrow to the next step at the edge of the screen.
  function drawOverlay(ctx, t, vw, vh) {
    if (!sc) return;
    const { cx, cy } = sc.cam(), ts = guessTs(vw, vh);
    if (bark && performance.now() / 1000 - bark.t < 3.4) {
      bark.p.bark = bark.t; // keeps the horn's sound waves going while it talks
      const X = (bark.p.x + 0.9) * ts - cx, Y = (bark.p.y - 1.6) * ts - cy;
      ctx.font = `600 ${Math.max(11, ts * 0.3)}px Fredoka, sans-serif`;
      const lines = wrap(ctx, bark.text, Math.min(vw * 0.7, 240));
      const lh = Math.max(13, ts * 0.36), bw = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16, bh = lines.length * lh + 10;
      const bx = Math.max(6, Math.min(vw - bw - 6, X - bw / 2)), by = Math.max(6, Y - bh);
      ctx.fillStyle = 'rgba(44,138,75,.95)'; ctx.strokeStyle = '#e2bd4f'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, bh, 8) : ctx.rect(bx, by, bw, bh); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
      lines.forEach((l, i) => ctx.fillText(l, bx + 8, by + 6 + lh * (i + 0.8)));
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
    if (W2.fade) { ctx.fillStyle = `rgba(8,6,20,${W2.fade})`; ctx.fillRect(0, 0, vw, vh); }
  }
  // js/scene.js picks 32 or 48 pixels a tile; work out which from the canvas the same way.
  function guessTs(vw, vh) { return Math.max(vw / 15, vh / 13) >= 44 ? 48 : 32; }
  function wrap(ctx, text, max) {
    const out = []; let line = '';
    text.split(' ').forEach(word => { const t2 = line ? line + ' ' + word : word; if (ctx.measureText(t2).width > max && line) { out.push(line); line = word; } else line = t2; });
    if (line) out.push(line);
    return out;
  }

  // Run a scene with the controls locked.
  async function act(fn) {
    if (busy) return;
    busy = true; sc.locked = true; sc.pause();
    try { await fn(); } catch (e) { console.error(e); }
    finally { busy = false; if (sc) { sc.locked = false; w().pos = [sc.P.x, sc.P.y]; applyState(); } S.persist(); }
  }
  const open = (x, y) => !solidNow().includes(sc.tile(x, y)) && !'DU'.includes(sc.tile(x, y));
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
  function walkTo(id, x, y, speed) {
    const a = sc.actors[id]; if (!a) return Promise.resolve();
    const p = pathTo(Math.round(a.x), Math.round(a.y), x, y) || [];
    a.scripted = true; a.speed = speed || 3.4;
    if (a.player) {
      a.path = p;
      return new Promise(res => { const chk = () => (!a.moving && a.x === x && a.y === y) || !p.length ? res() : setTimeout(chk, 60); chk(); }).then(() => { a.scripted = false; });
    }
    a.path = p;
    return new Promise(res => { a.arrive = res; if (!p.length) res(); }).then(() => { a.scripted = false; });
  }
  const faceTo = (a, b) => { const A1 = sc.actors[a], B = sc.actors[b]; if (!A1 || !B) return; const dx = B.x - A1.x, dy = B.y - A1.y; A1.face = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north'); };
  function beside(id) {
    const a = sc.actors[id];
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) {
      const x = a.x + dx, y = a.y + dy;
      if (open(x, y) && !Object.values(sc.actors).some(o => o !== a && !o.hidden && !o.player && o.solid !== false && o.x === x && o.y === y)) return [x, y];
    }
    return [a.x, a.y + 1];
  }
  // Somebody in the party says it: you, if it's your line, else whoever it belongs to.
  const has = id => id === lead() || others().includes(id);

  // ---------- The story ----------
  async function opening() {
    AU.music('story');
    U.closePanel(); U.stage(null);
    await SD.vn.play([...C2.text.cold, ['fx', 'black'],
      ['hide', 'bram'], ['hide', 'mira'], ['bg', 'c2-edge'],
      ['narr', 'The edge of the Cloud, the night after the wipe. The floor just stops. Below it there\'s nothing at all.'],
      ['show', 'kai', 'anger', 'left'],
      ['kai', 'Somebody say it. We deleted her.', 'anger'],
      ['show', 'seoyeon', 'anger', 'right'],
      ['seoyeon', 'You played the card, Kai.', 'anger'],
      ['kai', 'Because every one of you said it was the only way.', 'grief'],
      ['hide', 'kai'], ['show', 'dutch', 'stone', 'left'],
      ['dutch', 'Nobody said anything. Freya did. Every one of us heard what we wanted to.', 'stone'],
      ['hide', 'seoyeon'], ['show', 'mira', 'tired', 'right'],
      ['mira', 'Enough. Sit down, all of you. Eat something.', 'tired'],
      ['narr', 'Mira holds them together for nearly an hour. Then she can\'t. Freya\'s gift basket is still lying where it fell.']
    ]);
    setFlag('cold');
  }
  async function notYet() {
    await say([['lead', { mira: 'Not in the dark. Not like this. The basket first.', kai: 'Not yet. That basket\'s been staring at me all night.', seoyeon: 'Not yet. Her basket. I want to know what she wrote.', dutch: 'Not yet. Evidence first. The basket.', other: 'The basket first.' }]]);
    await walkTo('you', 13, 20, 5);
  }
  async function basket() {
    if (flag('notes')) return say([['narr', 'Four gifts, four notes, one hand. Nobody wants to touch them now.']]);
    await say([['narr', 'The gift basket Freya gave the four of you, tipped out on the ground. A note with every gift.']]);
    const leads = T.order.map((id, i) => ({ id, name: T.leads[id].name.split(' ')[0], prayer: T.leads[id].prayer, sign: ['Love, F.', 'xx F.', '— your Freya', 'Yours, F.'][i], ink: ['#2b2340', '#3a2a6a', '#6a2a3a', '#2a4a3a'][i] }));
    await G.notes(leads);
    await say([
      ['dutch', 'Same handwriting. Same person played all four of us.', 'anger'],
      ['mira', 'Then we stop blaming each other, and start on her.', 'cold']
    ]);
    setFlag('notes');
    AU.sfx('sparkle'); U.flash();
    U.system('DAWN', 'The party follows you now. Take the road east.', 'gold');
    trail.length = 0;
  }
  async function towerAtDawn() {
    setFlag('tower');
    U.stage(null);
    await SD.vn.play(C2.text.tower);
    AU.music('road');
  }
  async function scrapArrive() {
    setFlag('scrap');
    await say([
      ['narr', 'At the tower\'s foot is the field where Freya dumps everything she deletes. Houses, people, shop signs from Pingsby: all of it half there.'],
      ['dutch', 'Pingsby\'s post office should be north of here. And someone in it.', 'neutral']
    ]);
  }
  async function notice() {
    await say([['narr', 'A laminated notice, nailed to a stake: "NOTICE. VERSIONING IS ENABLED ON EVERY BUCKET IN PINGSBY. IT CANNOT BE TURNED OFF, ONLY SUSPENDED, AND I WILL NOT BE SUSPENDING IT. DO NOT ASK. — Sir S. Backups"']]);
    setFlag('notice');
  }
  async function sign() {
    if (flag('sign')) return say([['narr', 'WELCOME TO PINGSBY. Somebody has drawn a small, cross knight in the corner.']]);
    await say([['narr', 'Something is under there, faint as breath: the shape of Pingsby\'s welcome sign, and a tag hung on top of it.']]);
    const r = await G.restore({ title: 'PINGSBY\'S SIGN', bucket: 'pingsby-town', key: 'road/welcome-sign.json',
      rows: [['Delete marker', '2026-10-20 23:51', '—', 'dm cur'], ['v2 · repainted', '2024-05-02 10:00', '1.4 KB', ''], ['v1 · WELCOME TO PINGSBY', '2019-03-14 09:00', '1.2 KB', '']],
      predict: { q: 'Freya deleted the sign with a plain DELETE. What does a plain GET of the key return now?',
        opts: [{ t: '404 Not Found: the current version is a delete marker', ok: true }, { t: 'v2, the newest version that has a body', no: 'The newest version is the delete marker, and a GET of the key looks only at the current one.' }, { t: 'An empty sign, with no body at all', no: 'A delete marker has no data, but a GET doesn\'t return it as an empty object.' }],
        why: 'A GET with no version ID reads the current version. When that\'s a delete marker, S3 answers 404 as if the object were gone, while every version stays in the bucket underneath.' },
      q: 'How do you bring the sign back?',
      opts: [{ t: 'Delete the delete marker, by its version ID', ok: true, out: 'The marker is gone, and v2 is current again. A plain GET returns the sign.', rows: [['Delete marker', '2026-10-20 23:51', '—', 'gone'], ['v2 · repainted', '2024-05-02 10:00', '1.4 KB', 'cur'], ['v1 · WELCOME TO PINGSBY', '2019-03-14 09:00', '1.2 KB', '']] },
        { t: 'Upload a new, empty sign over the top', no: 'That adds a new version on top of the marker: an empty sign, with the real one still underneath.' },
        { t: 'Turn versioning off, so the marker goes away', no: 'Versioning can\'t be turned off once it\'s on, only suspended, and suspending removes nothing.' }] });
    setFlag('sign');
    w().lens = true;
    R.gainXp(r.first ? 15 : 8);
    AU.sfx('sparkle'); U.flash();
    await say([
      ['narr', 'WELCOME TO PINGSBY, solid again, crooked on its posts.'],
      ['seoyeon', 'If she only hid them... then everything here is still underneath.', 'neutral'],
      ['dutch', 'Then we look underneath.', 'neutral']
    ]);
    U.system('NEW: THE VERSION LENS', 'Tap 👁 in the bar, or press L, to see what\'s under the delete markers: deleted things, and the paths that were.', 'gold');
  }
  async function postOffice() {
    if (flag('coo')) return say([['narr', 'Pingsby\'s post office, back where it stood. Somebody has already swept the step.']]);
    if (!lensOn()) return say([['narr', 'A grey heap. Something about it is shaped like a door. Try the Version Lens.']]);
    const r = await G.restore({ title: 'THE POST OFFICE', bucket: 'pingsby-town', key: 'post-office/postmaster-coo.json',
      rows: [['Delete marker', '2026-10-20 23:58', '—', 'dm cur'], ['v3 · Coo, postmaster', '2026-09-30 08:12', '2.1 KB', ''], ['v2 · Coo, assistant postmaster', '2025-07-02 17:40', '2.0 KB', ''], ['v1 · Coo, an egg', '2023-11-11 09:03', '0.3 KB', '']],
      predict: { q: 'Freya deleted Coo too. Take the marker off, and which Coo comes back?',
        opts: [{ t: 'v3, the postmaster: the newest version under the marker', ok: true }, { t: 'v1, the egg: versions come back oldest first', no: 'Removing a marker makes the newest version under it current, not the oldest.' }, { t: 'All three, one after another', no: 'An object has one current version at a time. The others stay in its history.' }],
        why: 'When the delete marker is removed, the next newest version, v3, becomes current. v2 and the egg stay where they are, as history.' },
      q: 'Then bring him back.',
      opts: [{ t: 'Delete the delete marker, by its version ID', ok: true, out: 'DeleteObject with the marker\'s version ID. The marker is gone; v3 is current; a plain GET returns a pigeon.', rows: [['Delete marker', '2026-10-20 23:58', '—', 'gone'], ['v3 · Coo, postmaster', '2026-09-30 08:12', '2.1 KB', 'cur'], ['v2 · Coo, assistant postmaster', '2025-07-02 17:40', '2.0 KB', ''], ['v1 · Coo, an egg', '2023-11-11 09:03', '0.3 KB', '']] },
        { t: 'Copy v1 on top, to be safe', no: 'That brings back the egg. A copy of an old version becomes the new current version.' },
        { t: 'Ask Freya nicely to undelete him', no: 'Freya doesn\'t undelete. Freya doesn\'t read settings either, which is the point.' }] });
    setFlag('coo');
    R.gainXp(r.first ? 20 : 10);
    applyState();
    U.flash(); AU.sfx('heal');
    faceTo('coo', 'you');
    await say([
      ['coo', 'Coo! Delivered! At least once. Possibly twice. Did I miss anything?', 'smile'],
      ['narr', 'Freya never read Pingsby\'s settings. She doesn\'t read fine print.'],
      ['coo', 'A whole field of undelivered post, and five of the letters are mine. A pigeon has standards. Bring me any you find, would you?', 'neutral']
    ]);
    U.system('[QUEST] LOST LETTERS', 'Five of Coo\'s letters are somewhere in the field. Some only show through the lens.', 'gold');
  }
  async function bakery() {
    if (flag('bakery')) return say([['narr', 'PINGSBY BAKERY · EST. 1987. It smells, very faintly, of buns.']]);
    await say([['narr', 'The bakery\'s sign is still here. Freya has painted over it.']]);
    const r = await G.restore({ title: 'THE BAKERY SIGN', bucket: 'pingsby-town', key: 'high-street/bakery-sign.json',
      rows: [['v3 · FREE TIER BAKERY (by root)', '2026-10-20 23:40', '0.9 KB', 'cur'], ['v2 · PINGSBY BAKERY · EST. 1987', '2024-03-01 07:00', '1.6 KB', ''], ['v1 · PINGSBY BAKERY', '1987-06-01 06:00', '1.1 KB', '']],
      q: 'This one wasn\'t deleted: it was overwritten. How do you put Pingsby\'s sign back?',
      opts: [{ t: 'Copy v2 into the same key, so the copy becomes current', ok: true, out: 'A copy of v2 is the new current version, and Freya\'s v3 stays in the history, with her name and the time on it. Evidence.', rows: [['v4 · copy of v2', '2026-10-21 07:10', '1.6 KB', 'new cur'], ['v3 · FREE TIER BAKERY (by root)', '2026-10-20 23:40', '0.9 KB', ''], ['v2 · PINGSBY BAKERY · EST. 1987', '2024-03-01 07:00', '1.6 KB', ''], ['v1 · PINGSBY BAKERY', '1987-06-01 06:00', '1.1 KB', '']] },
        { t: 'Delete v3 for good, by its version ID', ok: 'works', out: 'It works: v2 is current again. But Freya\'s v3 is gone for good, and with it the record that she did this. Dutch looks at you for a long moment.', rows: [['v3 · FREE TIER BAKERY (by root)', '2026-10-20 23:40', '0.9 KB', 'gone'], ['v2 · PINGSBY BAKERY · EST. 1987', '2024-03-01 07:00', '1.6 KB', 'cur'], ['v1 · PINGSBY BAKERY', '1987-06-01 06:00', '1.1 KB', '']] },
        { t: 'Put a delete marker on it', no: 'That hides the whole sign, Freya\'s paint and Pingsby\'s underneath it.' }] });
    setFlag('bakery');
    R.gainXp(r.first ? 15 : 8);
    applyState();
    await say([['dutch', r.pick === 0 ? 'Good. Keep what she did. One day someone will ask.' : 'Next time, keep the version she wrote. One day someone will ask who did it.', 'neutral']]);
  }
  async function bandstand() {
    if (!lensOn()) return say([['narr', 'A ring of bare ground, the size of a bandstand.']]);
    if (flag('band')) return say([['narr', 'The outline of Pingsby\'s bandstand. Nothing left to restore.']]);
    const r = await G.restore({ title: 'THE BANDSTAND', bucket: 'pingsby-town', key: 'park/bandstand.json', sfx: 'wrong',
      log: 'CloudTrail, 2026-10-20 23:44 to 23:45, user root\nDeleteObject  park/bandstand.json  versionId=3HkL…\nDeleteObject  park/bandstand.json  versionId=9aQx…\nDeleteObject  park/bandstand.json  versionId=Lm2P…',
      rows: [],
      q: 'The lens finds no marker here. How do you bring the bandstand back?',
      opts: [{ t: 'You can\'t: every version was deleted by its version ID', ok: true, out: 'A DELETE that names a version ID removes that version permanently. She named all three. Only a lock set before she came would have stopped her.' },
        { t: 'Delete the delete marker', no: 'There is no marker. She didn\'t hide this one. She named each version and deleted it.' },
        { t: 'Copy an older version back into place', no: 'There are no older versions left to copy. The list is empty.' }] });
    setFlag('band');
    R.gainXp(r.first ? 15 : 8);
    await say([
      ['mira', 'The band played here on Sundays. Badly. Everyone came anyway.', 'sad'],
      ['dutch', 'She knew exactly what she was doing with this one. Plain deletes for the rest, so she could put them back. Not this.', 'stone']
    ]);
  }
  async function bridge() {
    if (!lensOn()) return say([['narr', 'The floor just stops. A long way down there\'s nothing at all. Across the gap: a bunker, and the tower\'s wall.']]);
    const r = await G.restore({ title: 'THE FOOTBRIDGE', bucket: 'pingsby-town', key: 'paths/footbridge.json',
      rows: [['Delete marker', '2026-10-20 23:52', '—', 'dm cur'], ['v1 · footbridge, oak', '2021-08-09 12:00', '3.3 KB', '']],
      q: 'Pingsby\'s footbridge, under a marker. Your move.',
      opts: [{ t: 'Delete the delete marker', ok: true, out: 'The bridge is back, plank by plank.', rows: [['Delete marker', '2026-10-20 23:52', '—', 'gone'], ['v1 · footbridge, oak', '2021-08-09 12:00', '3.3 KB', 'cur']] },
        { t: 'Upload a new bridge on top', no: 'A new, empty version is a new, empty bridge. You\'d fall straight through it.' }] });
    setFlag('bridge');
    R.gainXp(r.first ? 10 : 5);
    for (let x = 63; x <= 65; x++) setTile(x, 20, 'b');
    U.flash(); AU.sfx('door');
  }
  async function bunker() {
    if (flag('seymour')) return say([['seymour', 'Hatch is for tapes. Have you got a tape? Then go away.']]);
    AU.music('kyu');
    await say([
      ['narr', 'A steel dome, a sign that says NO VISITORS, and no handle on the outside. You knock.'],
      ['seymour', 'Go away. I\'m offline. That\'s the whole point.'],
      ['lead', { mira: 'Seymour. It\'s Mira. Freya has Kyu.', kai: 'Seymour, it\'s Kai. She wiped Kyu.', seoyeon: 'Sir Seymour. Kyu is gone.', dutch: 'It\'s Dutch. Kyu\'s gone. Wiped.', other: 'Kyu is gone.' }],
      ['seymour', 'I know. I have one tape, made long before the end. Kyu\'s on it. I\'ve tested it: it restores.'],
      ['mira', 'Then restore her.'],
      ['seymour', 'No. Two reasons, in order. Freya holds root, and she\'d wipe her again by morning. And a copy anyone can delete is not a copy. You don\'t believe me. Fine. Tell me which of these would stop her.']
    ]);
    const ok = await G.hatch();
    setFlag('seymour');
    R.gainXp(ok ? 25 : 12);
    applyState();
    await say([
      ['seymour', 'Compliance mode would have done, if anyone had set it before she came. Nobody did. So the tape stays down here, where nothing can reach it.'],
      ['dutch', 'So we take root back.'],
      ['seymour', 'And keep the tape where nobody can touch it. Yes. Close the hatch on your way out.'],
      ['narr', 'The slot snaps shut. Behind it, faintly, someone is humming.']
    ]);
    U.system('[GOAL] TAKE ROOT BACK', 'Kyu\'s tape stays offline until there\'s no root to fear. Somewhere on the island, Elder Wren is waiting.', 'gold');
    AU.music('camp');
  }
  async function wren() {
    if (flag('wren')) return say([['faithful', '...'], ['narr', 'Elder Wren looks at you for a long time, and says nothing.']]);
    if (!flag('seymour')) return say([['narr', 'An old man in Brookfall blue, praying to nothing. He doesn\'t blink. He doesn\'t look quite there.']]);
    await say([['narr', 'Elder Wren, whose faithful you beat at Brookfall. Freya deleted him for praying to Uptima. Then she wrote over him.']]);
    const r = await G.restore({ title: 'ELDER WREN', concept: 's3life', bucket: 'brookfall-shrine', key: 'faithful/elder-wren.json',
      rule: 'Lifecycle rule "tidy-up" (by root): NoncurrentVersionExpiration, NoncurrentDays: 1',
      rows: [['v4 · Elder Wren, faithful of FREYA', '2026-10-20 23:59', '1.1 KB', 'cur'], ['v3 · Elder Wren', '2026-09-21 06:00', '2.4 KB', 'fade'], ['v2 · Elder Wren, deacon', '2001-04-01 06:00', '2.2 KB', 'fade']],
      predict: { q: 'Freya\'s rule is ticking. Do nothing, and what happens to v3 tomorrow?',
        opts: [{ t: 'It\'s deleted for good: it has been noncurrent for a day', ok: true }, { t: 'It moves to S3 Glacier, where it can be restored', no: 'That would be a transition. This rule is an expiration, and expiring a noncurrent version is permanent.' }, { t: 'It becomes current again when v4 expires', no: 'The rule only touches noncurrent versions; v4 is current and stays.' }],
        why: 'NoncurrentVersionExpiration permanently deletes versions a set number of days after they stop being current. Freya set one day, so by tomorrow the only Wren left is hers.' },
      q: 'Bring the real Wren back, in a way her rule can\'t touch.',
      opts: [{ t: 'Copy v3 into the same key, so the copy is current', ok: true, out: 'The copy of v3 is the current version, and a noncurrent-version rule doesn\'t touch current versions. Tomorrow the rule will tidy away Freya\'s v4 instead. Nobody minds.', rows: [['v5 · copy of v3', '2026-10-21 07:30', '2.4 KB', 'new cur'], ['v4 · Elder Wren, faithful of FREYA', '2026-10-20 23:59', '1.1 KB', 'fade'], ['v3 · Elder Wren', '2026-09-21 06:00', '2.4 KB', 'fade'], ['v2 · Elder Wren, deacon', '2001-04-01 06:00', '2.2 KB', 'fade']] },
        { t: 'Suspend versioning on the bucket', no: 'Suspending changes how new writes are kept, not the versions already there. The rule still deletes v3 tomorrow.' },
        { t: 'Wait for the rule to finish, then restore him', no: 'Then v3 is deleted for good, and there\'s nothing left to restore from.' }] });
    setFlag('wren');
    R.gainXp(r.first ? 20 : 10);
    applyState();
    U.flash(); AU.sfx('heal');
    faceTo('wren', 'you');
    await say([['narr', 'Elder Wren is himself again. He looks at the four of you for a long time, and says nothing. Then he walks off toward the tower wall, and sits down where a fire ought to be.']]);
    // Watch him set off, then carry on: he walks the rest of the way on his own.
    await Promise.race([walkTo('wren', 72, 25, 2.6), wait(1500)]);
  }
  async function fire() {
    if (flag('fire')) return say([['coo', rnd(['Letterhead! I\'ll need letterhead.', 'The Free Cloud. Has a ring to it. A delivery ring.', 'At least once. That\'s my promise.']), 'smile']]);
    if (!(flag('coo') && flag('seymour') && flag('wren'))) return say([['narr', 'A ring of stones by the tower wall, where a fire ought to be.']]);
    W2.dusk = true;
    PROPS.fire.lit = true; AU.sfx('door');
    sc.place('coo', 70, 25); sc.place('wren', 72, 25);
    await wait(900);
    U.stage(null);
    await SD.vn.play(C2.text.fire);
    W2.dusk = false;
    setFlag('fire');
    W2.fade = 0.8; await wait(600); W2.fade = 0.4; await wait(400); W2.fade = 0;
    U.system('MORNING', 'The tower\'s door is open. Thornwick is on the other side.', 'gold');
  }
  async function door(d) {
    if (busy) return;
    if (d === 'gate') return act(async () => {
      if (!flag('fire')) { await say([['narr', 'The tower\'s door, sealed with Freya\'s ring. It\'ll open in the morning, the sign says, "for residents".']]); sc.place('you', 78, 20); return; }
      // You're standing in the doorway by now, so go on the way you were facing.
      sc.place('you', sc.P.face === 'west' ? 78 : 80, 20);
    });
    if (d === 'stair') return act(climb);
  }
  async function townArrive() {
    setFlag('town');
    await say([
      ['narr', 'Thornwick, rebuilt as the tower\'s first floor: the village as it was, every morning, forever.'],
      ['narr', 'People wait at the post box for replies that never come. In the bell tower, someone is pulling a rope, and nothing rings.'],
      ['mira', { mira: '...Home.', other: 'Thornwick. It\'s exactly how I left it. That\'s what\'s wrong with it.' }, 'tired']
    ]);
  }
  async function postbox() {
    if (flag('offer')) return say([['narr', 'Freya smiles from the poster on the post box. She smiles at everyone.']]);
    AU.music('quest');
    await say([['narr', 'A red post box, Freya\'s poster pasted on the front, and three people who have waited here since dawn. Every dawn. You open the box\'s ledger and run it yourself for a minute.']]);
    const ok = await G.postbox();
    c2().bonus = Object.assign(c2().bonus || {}, { vistimeout: true });
    R.gainXp(ok ? 25 : 12);
    await say([['narr', 'Then you look at the real thing. Thornwick\'s queue: ReceiveMessage, 0 messages. Every letter posted here goes up the stair to the Mailroom, and is never sent on.']]);
    U.system('CARD UPGRADED', 'Visibility Timeout starts upgraded in Expedition I.', 'gold');
    // Freya, on the poster.
    U.stage(null);
    AU.music('freya');
    await SD.vn.play([['cg', 'c2-postbox', 'in'],
      ['narr', 'Freya meets Mira at the silent post box. She doesn\'t come in person. She\'s on the poster, smiling.'],
      ['freya', 'Give me Thornwick\'s post, love, and every letter goes through. Tilly\'s too. It\'s free.']]);
    if (lead() === 'mira') {
      // Every answer Mira has is the same one.
      await new Promise(res => {
        const b = U.panel('<p>Freya is waiting. What do you say?</p><div class="opts">' + ['…', '…', '…'].map((t, i) => `<button class="opt" data-s="${i}">${t}</button>`).join('') + '</div>', { title: 'FREYA\'S OFFER', noClose: true });
        b.querySelectorAll('[data-s]').forEach(el => el.onclick = () => { U.closePanel(); res(); });
      });
    }
    await SD.vn.play([['narr', 'Mira doesn\'t answer.'], ['freya', 'Take your time. Everything here does.']]);
    setFlag('offer');
    AU.music('town');
    U.system('THE STAIR IS OPEN', 'Up the stair are the Sorting Floors: Expedition I.', 'gold');
  }
  async function marrow() {
    if (flag('bells')) return say([['marrow', rnd(['Listen to it. I\'d forgotten what it sounds like.', 'Ring it again for me, would you? No, don\'t. Once was enough. Once was everything.']), 'neutral']]);
    if (!flag('town')) return;
    faceTo('marrow', 'you');
    await say([
      ['narr', 'The bell-ringer, rope in her hands, pulling. The bell swings. It makes no sound.'],
      ['marrow', 'Every morning. You\'d think I\'d learn.', 'sad'],
      ['marrow', 'They say a rule rings it. Some rule on the bus. I can\'t read the thing. Can you?', 'neutral']
    ]);
    AU.music('quest');
    const ok = await G.bells();
    setFlag('bells');
    c2().dev.bellrope = true;
    c2().bonus = Object.assign(c2().bonus || {}, { pattern: true });
    R.gainXp(ok ? 25 : 12);
    PROPS.bell.ring = performance.now() / 1000;
    AU.sfx('levelup');
    await wait(1200);
    await say([
      ['narr', 'The bell rings. Once, then again. Across the square, every head turns.'],
      ['marrow', '...Oh. Oh, listen to that.', 'sad'],
      ['marrow', 'My son used to say the bell was Thornwick clearing its throat. He wrote me letters. One every week, from the road. Then none.', 'sad']
    ]);
    if (has('mira')) await say([['mira', '...', 'grief'], ['narr', 'Mira knows whose mother this is. Marrow doesn\'t know who Mira is.']]);
    U.system('MARROW\'S BELL ROPE', 'Fix the Event Pattern starts upgraded in Expedition I.', 'gold');
    AU.music('town');
  }
  async function tilly() {
    const t2 = sc.actors.tilly; t2.path = []; t2.scripted = true;
    faceTo('tilly', 'you');
    await say([
      ['narr', 'Tilly, in Inquisition grey, with a pole-net, hunting the beast in the tower. She looks straight through Mira.'],
      ['tilly', 'Move along. There\'s a beast loose.', 'cold'],
      ['mira', 'Tilly...', 'grief'],
      ['tilly', 'Do I know you?', 'cold']
    ]);
    t2.scripted = false;
    setFlag('tilly');
  }
  async function poster(n) {
    if (n === 1) {
      await say([['narr', 'THE GRAND INQUISITOR PROTECTS YOU FROM BEASTS. The small print: "Printed by order of the Inquisition, the night of the tower."']]);
      if (!flag('poster')) { setFlag('poster'); await say([['dutch', 'The night of. Not the morning after. Somebody had this ready.', 'stone']]); }
      return;
    }
    await say([['narr', 'REPORT BEASTS TO THE INQUISITION. REWARDS PAID IN GRANTS. Somebody has drawn a moustache on the Grand Inquisitor, and somebody else has rubbed it out.']]);
  }
  async function villager(id) {
    const lines = { v1: 'A man in his Sunday coat: "Any day now. My brother writes every week. I\'m sure he does."', v2: 'A woman with a basket: "I posted it three years ago. It\'ll come back with an answer. They always do, here."', v3: 'A boy with a paper boat: "Mum says the post goes up the stair. I asked what\'s up the stair. She said, \'Sorting.\'"' };
    await say([['narr', lines[id]]]);
  }
  async function runbook() {
    if (!lensOn()) return;
    setFlag('runbook');
    S.seeConcept('s3ver');
    await say([['narr', 'A torn page in Kyu\'s handwriting, hidden where only someone looking under the markers would find it: "Plain delete = marker on top. Version delete = gone. Overwrite = old version underneath. Seymour was right about everything, which I will never tell him."']]);
    R.gainXp(20);
    U.system('SECRET: KYU\'S RUNBOOK, PAGE 0', 'S3 Versioning and Delete Markers is on your cheat sheet. +20 XP.', 'gold');
  }
  async function pickLetter(i) {
    w().letters.push(i); S.persist();
    AU.sfx('coin');
    U.system('A LOST LETTER', `To: ${esc(G.LETTERS[i].to)}. ${w().letters.length} of 5. Coo will want it.`, 'gold');
    applyState();
  }
  async function cooTalk() {
    faceTo('coo', 'you');
    const owed = w().letters.filter(i => !w().given.includes(i));
    if (!owed.length) {
      const left = 5 - w().letters.length;
      return say([['coo', left ? `${left} still out there, somewhere. Some of them only show through your lens, I'd bet.` : 'All five, delivered. At least once. I checked twice.', 'smile']]);
    }
    await say([['coo', 'Oh! Before I deliver it, tell me what you\'ve learned. A postman checks.', 'smile']]);
    for (const i of owed) {
      const r = await G.letter(i);
      w().given.push(i); S.persist();
      R.gainXp(r && r.ok ? 10 : 4);
    }
    if (w().given.length === 5 && !flag('letters')) {
      setFlag('letters');
      c2().bonus = Object.assign(c2().bonus || {}, { idem: true });
      await say([['coo', 'All five! Delivered at least once and, thanks to you, at most once. Here. A pigeon pays his debts.', 'smile']]);
      U.system('COO\'S THANKS', 'Idempotent Consumer starts upgraded in Expedition I. +30 XP.', 'gold');
      R.gainXp(30);
    } else await say([['coo', 'Delivered! Bring me the rest when you find them.', 'smile']]);
  }
  function climb() {
    if (!flag('offer')) return say([['narr', 'Stone steps up into the dark, and the hum of something processing. Not yet: the post box first.']]).then(() => sc.place('you', 92, 21));
    // Expedition I on the raid engine (js/vec-ch2.js C2.climb): solo with your three, or a party. Not yet steps you
    // back off the stair.
    w().pos = [92, 21]; S.persist();
    return C2.climb().then(r => { if (r === null) sc.place('you', 92, 21); });
  }

  // ---------- Talking ----------
  function talk(id) {
    if (busy) return;
    if (sc.actors[id] && !sc.actors[id].thing) faceTo(id, 'you');
    const fns = { basket, notice, sign, po: postOffice, bakery, band: bandstand, bridge, bunker, wren, fire, box: postbox, marrow, tilly, coo: cooTalk, runbook,
      bell: () => say([['narr', flag('bells') ? 'The bell hangs still now, but it remembers how.' : 'Thornwick\'s bell. Goodwife Marrow is at the foot of the tower.']]),
      poster1: () => poster(1), poster2: () => poster(2), v1: () => villager('v1'), v2: () => villager('v2'), v3: () => villager('v3') };
    if (/^letter\d$/.test(id)) return act(() => pickLetter(+id.slice(6)));
    if (T.order.includes(id)) return act(() => say([[id, rnd({ mira: ['Eat something. I mean it.', 'I can hold this together a bit longer.'], kai: ['Don\'t. Not yet.', 'I\'m fine. I\'m cooking. That\'s fine.'], seoyeon: ['...', 'I keep looking for her in the dark.'], dutch: ['Someone did this on purpose. I want to know how.', 'Look at the basket.'] }[id])]]));
    if (fns[id]) return act(fns[id]);
  }
  function toggleLens() {
    if (!flag('sign') || busy) return;
    w().lens = !w().lens; S.persist();
    AU.sfx(w().lens ? 'sparkle' : 'blip');
    applyState();
  }
  window.addEventListener('keydown', e => { if (sc && sc.active && !busy && (e.key === 'l' || e.key === 'L') && $('#panel').hidden && $('#dialog').hidden) toggleLens(); });

  // ---------- The objective, and where the arrow points ----------
  function step() {
    const owedLetters = w().letters.some(i => !w().given.includes(i));
    if (!flag('notes')) return ['Look at what\'s in Freya\'s basket', [9, 22]];
    if (!flag('sign')) return ['Follow the road to the tower', [32, 19]];
    if (!flag('coo')) return [lensOn() ? 'Find Pingsby\'s post office, north in the field' : 'Turn on the Version Lens (👁)', [41, 6]];
    if (!flag('bridge')) return [lensOn() ? 'Cross the chasm east of the field' : 'Turn on the lens, and cross the chasm', [62, 20]];
    if (!flag('seymour')) return ['Knock on the bunker', [71, 11]];
    if (!flag('wren')) return ['Find Elder Wren, south in the field', [50, 32]];
    if (!flag('fire')) return ['Make camp by the tower wall', [71, 25]];
    if (!flag('town')) return ['Go through the tower\'s door', [80, 20]];
    if (!flag('offer')) return ['See what\'s wrong with the post box', [87, 21]];
    if (owedLetters) return ['Climb the stair, or take Coo his letters', [92, 21]];
    return ['Climb the stair to the Sorting Floors', [92, 21]];
  }
  const target = () => step()[1];

  // ---------- HUD ----------
  function hud() {
    const el = $('#w-hud'); if (!el) return;
    const sv = S.save, need = S.xpFor(sv.level), l = T.leads[lead()];
    el.innerHTML = `<span class="hud-chip"><b>${esc(l.name.split(' ')[0])}</b> · Lv ${sv.level}</span>
      <div class="bar xp w-xp" title="XP"><i style="width:${Math.min(100, sv.xp / need * 100)}%"></i></div>
      <span class="hud-chip w-goal">${esc(step()[0])}</span>
      ${flag('coo') ? `<span class="hud-chip" title="Coo's lost letters">✉ ${w().letters.length}/5</span>` : ''}
      <span class="w-sp"></span>
      ${flag('sign') ? `<button class="${lensOn() ? 'primary' : 'ghost'}" id="w-lens" aria-pressed="${lensOn()}" aria-label="Version Lens" title="Version Lens (L)">👁</button>` : ''}
      <button class="ghost" id="w-codex" aria-label="Cheat sheet" title="Cheat sheet">📖</button>
      <button class="ghost" id="w-snd" aria-label="Sound on or off">${AU.muted() ? '🔇' : '🔊'}</button>
      <button class="ghost" id="w-menu" aria-label="Menu">☰</button>`;
    const lb = $('#w-lens'); if (lb) lb.onclick = toggleLens;
    $('#w-codex').onclick = () => U.codex();
    $('#w-snd').onclick = e => { AU.toggleAll(); e.currentTarget.textContent = AU.muted() ? '🔇' : '🔊'; };
    $('#w-menu').onclick = () => SD.main.menu();
  }
  // The menu and the settings redraw the world's HUD through js/ch1-world.js; send them here while this map is up.
  const ch1Hud = SD.ch1.hud;
  SD.ch1.hud = () => (W2.active ? hud() : ch1Hud());

  // ---------- Entering and leaving ----------
  W2.enter = function () {
    SD.ch1.halt();
    SD.ch1.dress();
    SD.main.show('world');
    $('#w-canvas').setAttribute('aria-label', 'The edge of the Cloud, the scrap field, Seymour\'s island and Thornwick');
    if (!sc) makeScene(); else applyState();
    zone = null; lastTile = '';
    W2.active = true;
    sc.start();
    if (!flag('hinted')) { setFlag('hinted'); U.system('HOW TO MOVE', 'Arrow keys or WASD to walk, E or Enter to talk. Or tap where you want to go, and tap someone to talk to them. The yellow arrow points at your next step.'); }
  };
  W2.halt = function () { W2.active = false; if (sc) { sc.stop(); sc.locked = false; } };

  // The vector slice's chapter 2 opens here instead of with its long cutscene, until you climb the stair.
  const sliceStart = C2.start;
  C2.start = async function () {
    c2(); S.persist();
    if (c2().f.act1) return sliceStart();
    SD.ch1.halt(); U.closePanel(); U.stage(null);
    sc = null;
    if (!flag('cold')) await opening();
    W2.enter();
  };
  // The cards you upgraded in the world (S.save.c2.bonus) start upgraded in every climb (js/vec-ch2.js deckFor).

  // ---------- The chapter 2 demo's own start ----------
  // Pick a lead, skip chapter 1 (its end is where this begins), and walk.
  W2.newGame = async function () {
    const id = await SD.ch1.choose();
    S.save.c1 = { lead: id, f: { intro: true, cart: true, brief: true, done: true }, deck: SD.starterDeck.map(x => ({ id: x, up: false })), pos: null };
    S.save.c2 = null;
    S.save.name = T.leads[id].name.split(' ')[0];
    S.save.flags.prologue = true; S.save.flags.ch1 = true;
    S.persist();
    sc = null;
    C2.start();
  };
  W2.resume = function () {
    const sv = S.save;
    if (!sv.c1 || !sv.c1.lead) return W2.newGame();
    if (sv.run && !sv.run.story) { SD.ch1.dress(); return R.resume(); }
    if (sv.run) { sv.run = null; S.persist(); }
    if (sv.c2 && sv.c2.f.done) return C2.start();
    if (sv.c2 && sv.c2.f.act1) return C2.start();
    sc = null;
    C2.start();
  };
  {
    // The demo's title: Chapter 2 straight away; the chapter 1 demo is a separate link.
    const boot = () => {
      const M = SD.main, title = M.title;
      M.title = function () {
        title();
        const box = $('#title-actions'), sv = S.save;
        if (!box || box.querySelector('#t-start')) return;
        const has = !!(sv.c1 && sv.c1.lead && sv.c2);
        box.innerHTML = (has ? `<button class="primary" id="t-c2go">Continue · ${esc(T.leads[sv.c1.lead].name)}</button><button class="ghost" id="t-c2new">New game</button>` : '<button class="primary" id="t-c2new">Play Chapter 2: The Mailroom</button>') + '<button class="ghost" id="t-help">How to play</button>';
        const h = $('#t-help');
        if (h) h.onclick = () => U.panel('<p>Walk with the arrow keys or WASD, or tap where you want to go. Tap someone, or press E, to talk. Once you have the Version Lens, tap 👁 or press L to see what\'s under the delete markers.</p><p>In the Sorting Floors, play cards to fix incidents, as in chapter 1.</p>', { title: 'HOW TO PLAY' });
        if (has) $('#t-c2go').onclick = () => W2.resume();
        $('#t-c2new').onclick = () => { if (!has) return W2.newGame(); const c = U.panel('<p>Start chapter 2 again from the edge of the Cloud? Your level and cheat sheet stay.</p><div class="row"><button class="primary" id="n-y">Start again</button><button class="ghost" id="n-n">Cancel</button></div>', { title: 'NEW GAME' }); c.querySelector('#n-y').onclick = () => { U.closePanel(); W2.newGame(); }; c.querySelector('#n-n').onclick = U.closePanel; };
      };
      const foot = $('.t-foot'); if (foot) foot.textContent = 'Chapter 2 demo: The Mailroom · Built on the AWS documentation · Saves automatically';
    };
    // js/main.js loads after this file and shows the title on DOMContentLoaded; wrap it before then.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { boot(); SD.main.title(); }, 0), { once: true });
  }

  // For tools/c2_check.js.
  W2.debug = { busy: () => busy, flags: f => { Object.assign(w().x, f); S.persist(); if (sc) applyState(); }, flag, place: (x, y) => sc && sc.place('you', x, y), scene: () => sc, step, act, w, lens: on => { w().lens = on; if (sc) applyState(); } };
})();
