// Chapter 6, the Mirror Floors (floors 81 to 99): the explorable chapter, from the cold open to the end card.
// One map, four places:
//   Floor 81, Twinwater's near shore   the jetty (Freya's offer, Kagemaru's stall, Mio, the mirror), Chad's booth, the
//                                      signpost gate, the lift, Expedition I
//   The mirror lake                    the jetty out into it, and the causeway to the far shore once you know how
//                                      things cross it
//   The far shore                      the same town again, a shade paler; Expedition II; behind the Lock Room's
//                                      door, Expedition III
//   The Free Cloud's camp              down the lift: Seymour's bunker, Aigerim's shop, Mio's relay station, Ship It,
//                                      the Design Board, Wen and Lord Ashgrove at the fire
// Knowledge opens the way: each gate is a minigame (js/c6-games.js), and a gate you've understood stays open. Eight
// Lost Reflections lie about as collectibles, each with a quick recall question (half on earlier chapters). The
// expeditions are raid-engine dungeons (js/raid.js, data in js/c6-data.js) played solo with the other three as bots,
// with one of Seymour's Tapes. The Clock Room, the confrontation and what Kagemaru does next play from cues in the
// floors' intros and outros.
// Plays standalone with window.SD_CH = 6 or ?vector&ch6; SD.chapterStart[6] starts it from another chapter, and the
// end card hands over to SD.chapterStart[7] when that's loaded. Saves in S.save.c6.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const CH6 = String(window.SD_CH) === '6' || /[?&]ch6\b/.test(location.search);
  const W = SD.c6world = { on: false, active: false };
  const U = SD.ui, S = SD.state, AU = SD.audio, R = SD.run, T = SD.ch1story, A = SD.c6art, G = SD.c6games, D = SD.c6data;
  const $ = U.$, esc = s => U.esc(s);
  const rnd = a => a[Math.floor(Math.random() * a.length)];

  // ---------- Save ----------
  const c6 = () => S.save.c6 || (S.save.c6 = { f: {}, w: { x: {}, pos: null, pages: [], cards: [], miss: [] }, choice: null });
  const w = () => c6().w;
  const c1 = () => S.save.c1 || {};
  const flag = k => !!w().x[k];
  const setFlag = k => { w().x[k] = true; S.persist(); };
  const lead = () => c1().lead || 'mira';
  const others = () => T.order.filter(id => id !== lead());
  // Music: this chapter's own songs once they're loaded (js/audio-chapters.js), else the nearest older one.
  const FB = { c6town: 'town', c6explore: 'explore', c6dungeon: 'map4', c6boss: 'boss', c6culprit: 'boss', c6sad: 'kyusad', c6mirror: 'story' };
  const mus = k => AU.music(AU.has && AU.has(k) ? k : (FB[k] || k));

  // Lines: [who, text, face]. who 'lead' is you; text can be { mira: ..., other: ... } for the lead's own words.
  const pick = t => (t && typeof t === 'object' ? (t[lead()] || t.other) : t);
  const L = lines => lines.map(([s, t, e]) => ({ s: s === 'lead' ? lead() : s === 'mirror' ? 'mir' + lead() : s || 'narr', t: pick(t), e }));
  const say = lines => U.dialog(L(lines));
  // A visual-novel scene, with the same 'lead', 'mirror' and per-lead text.
  const who = s => (s === 'lead' ? lead() : s === 'mirror' ? 'mir' + lead() : s);
  const vn = steps => SD.vn.play(steps.map(s => {
    if (!Array.isArray(s)) return s;
    if (s[0] === 'show' || s[0] === 'hide') return [s[0], who(s[1])].concat(s.slice(2));
    if (['bg', 'cg', 'fx', 'wait', 'narr'].includes(s[0])) return s[0] === 'narr' ? ['narr', pick(s[1])] : s;
    return [who(s[0]), pick(s[1]), s[2]];
  }));
  const NAME = id => ((T.leads[id] || {}).name || id).split(' ')[0];
  const LOST = { mira: 'Bram', kai: 'Hana', seoyeon: 'Jin', dutch: 'Lina' };

  // ---------- The map ----------
  const MW = 64, MH = 48;
  // [x0, y0, x1, y1, id, banner, music, ambience, ground]
  const ZONES = [
    [18, 1, 62, 13, 'far', 'Twinwater · the far shore', 'c6town', 'birds', 'c'],
    [18, 14, 62, 29, 'lake', 'The mirror lake', 'c6mirror', 'sea', 'w'],
    [18, 30, 62, 46, 'near', 'Floor 81 · Twinwater', 'c6town', 'birds', 'c'],
    [1, 20, 16, 36, 'camp', 'The Free Cloud\'s camp', 'camp', 'crickets', 'g']
  ];
  const ROCKZ = [0, 0, 0, 0, 'rock', '', null, null, 'g'];
  const zoneAt = (x, y) => ZONES.find(z => x >= z[0] && x <= z[2] && y >= z[1] && y <= z[3]) || ROCKZ;
  const PROPS = [], PROP = {};
  const BASE = (function build() {
    const m = Array.from({ length: MH }, () => Array(MW).fill('T'));
    const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m[y][x] = c; };
    const set = (x, y, c) => { m[y][x] = c; };
    ZONES.forEach(z => fill(z[0], z[1], z[2], z[3], z[8]));
    // Both shores' sand at the water's edge.
    fill(18, 30, 62, 30, 's'); fill(18, 13, 62, 13, 's');
    // The jetty, and its platform out on the lake; the causeway to the far shore.
    fill(40, 19, 41, 29, 'j'); fill(37, 15, 44, 18, 'j'); fill(60, 14, 60, 29, 'j');
    // Streets.
    fill(19, 38, 54, 38, ','); fill(40, 31, 40, 38, ','); fill(56, 40, 62, 40, ','); fill(58, 39, 59, 40, ','); fill(60, 31, 60, 40, ',');
    fill(19, 7, 62, 7, ','); fill(55, 3, 56, 7, ','); fill(23, 3, 24, 7, ','); fill(60, 7, 60, 12, ',');
    fill(2, 27, 15, 27, ',');
    // Flowers.
    fill(44, 44, 48, 45, 'f'); fill(27, 44, 31, 45, 'f'); fill(36, 9, 40, 10, 'f'); fill(4, 34, 7, 35, 'f');
    // The near shore's hedge (the signpost gate's), and the far shore's wall (the Lock Room's door).
    fill(55, 30, 55, 46, 'T'); set(55, 40, 'G');
    fill(33, 1, 33, 13, 'T'); set(33, 7, 'G');
    // Hedges and trees.
    [[19, 33], [19, 34], [62, 33], [62, 34], [30, 46], [44, 46], [19, 9], [62, 9], [50, 5], [44, 4], [27, 4], [36, 12]].forEach(([x, y]) => set(x, y, 'T'));
    [[6, 25], [14, 21], [1, 33], [15, 35], [10, 35]].forEach(([x, y]) => set(x, y, 'T'));
    // Doors: the lift (town L, camp M); the raid gates come after the props.
    set(18, 38, 'L'); set(16, 27, 'M');
    const prop = (id, kind, x, y, wd, h, more, solid) => {
      const p = Object.assign({ id, kind, x, y, w: wd, h }, more);
      PROPS.push(p); PROP[id] = p;
      if (solid !== false) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + wd; xx++) if (m[yy][xx] !== 'G') m[yy][xx] = '#';
      return p;
    };
    // The near shore.
    prop('h1', 'twinhouse', 21, 32, 4, 3, { sign: 'BAKER' }); prop('h2', 'twinhouse', 27, 32, 4, 3);
    prop('h3', 'twinhouse', 44, 32, 4, 3, { roof: '#5a7ab8' }); prop('h4', 'twinhouse', 50, 32, 4, 3, { sign: 'SCHOOL' });
    prop('h5', 'twinhouse', 21, 41, 4, 3); prop('h6', 'twinhouse', 49, 41, 4, 3, { roof: '#5a7ab8' });
    prop('booth', 'booth', 32, 36, 3, 2);
    prop('notice', 'noticeb', 37, 33, 1, 1);
    prop('liftT', 'lift', 18, 37, 1, 1);
    prop('lamp1', 'lamp', 36, 40, 1, 1); prop('lamp2', 'lamp', 46, 39, 1, 1);
    prop('xp1', 'raidgate', 57, 37, 4, 2, { label: 'EXP. I', open: true });
    // The jetty.
    prop('stall', 'stall', 40, 15, 2, 1);
    prop('mirror', 'mirror', 38, 14, 1, 1, null, false);
    prop('boat1', 'boat', 36, 21, 1, 1, null, false); prop('boat2', 'boat', 45, 25, 1, 1, null, false);
    // The far shore.
    prop('f1', 'twinhouse', 21, 9, 4, 3, { far: true }); prop('f2', 'twinhouse', 27, 9, 4, 3, { far: true });
    prop('f3', 'twinhouse', 44, 9, 4, 3, { far: true, roof: '#7a9ad0', sign: 'BAKER' }); prop('f4', 'twinhouse', 50, 9, 4, 3, { far: true, sign: 'SCHOOL' });
    prop('xp2', 'raidgate', 54, 1, 4, 2, { label: 'EXP. II', open: true });
    prop('xp3', 'raidgate', 22, 1, 4, 2, { label: 'EXP. III', open: true });
    prop('lamp3', 'lamp', 38, 5, 1, 1);
    // The camp.
    prop('liftC', 'lift', 16, 26, 1, 1);
    prop('fire', 'campfire', 8, 29, 1, 1, { lit: true });
    prop('bunker', 'bunker', 2, 21, 3, 2);
    prop('shop', 'shop', 10, 21, 3, 2);
    prop('relay', 'relay', 2, 31, 3, 2);
    prop('ship', 'desk', 7, 23, 1, 1);
    prop('dboard', 'dboard', 14, 24, 1, 1);
    prop('tent1', 'tent', 13, 30, 2, 2); prop('tent2', 'tent', 9, 33, 2, 2);
    // The raid gates' mouths are doors.
    m[38][58] = '1'; m[38][59] = '1'; m[2][55] = '2'; m[2][56] = '2'; m[2][23] = '3'; m[2][24] = '3';
    return m.map(r => r.join(''));
  })();
  // The knowledge gates: id -> [x, y, label, colour, game].
  const GATES = { groute: [55, 40, 'ROUTE 53', '#4a6aa8', 'route'], glake: [60, 29, 'REPLICAS', '#2c6a8a', 'lake'], glock: [33, 7, 'OBJECT LOCK', '#2c3a5a', 'lock'] };
  Object.keys(GATES).forEach(id => { const [x, y, label, col] = GATES[id]; PROPS.push(PROP[id] = { id, kind: 'kgate', x, y, w: 1, h: 1, label, col }); });
  // Lost Reflections: [x, y, concept for its recall question (null: an older chapter's), what's in it].
  const PAGES = [[19, 45, 'regionsaz', 'In it, the near shore with nobody on it at all. It looks almost restful.'],
    [61, 45, null, 'In it, a boy throwing a stone into the lake. Here, no stone ever breaks the water.'],
    [37, 18, 'health53', 'In it, your own face, a moment late.'],
    [3, 35, null, 'In it, the camp fire, burning on both sides of the pebble.'],
    [19, 12, 'objlock', 'In it, a diary with a lock on every page.'],
    [61, 12, 'replicas', 'In it, two bakers kneading the same loaf, a lake apart.'],
    [19, 3, null, 'In it, a temple with a console, and a box with GARY written on it.'],
    [40, 4, null, 'In it, nothing at all. No twin. Just the stone.']];
  const pageHere = i => !w().pages.includes(i);

  // ---------- The scene ----------
  let sc = null, busy = false, zone = null, lastTile = '';

  // ---------- Weather ----------
  // By zone (js/weather.js): fog in long banks over the mirror lake, drifting slower than it; and embers off the
  // camp's fire. Both are quiet: the lake has its own place sound.
  const WX = SD.wx;
  function weather(stage) {
    if (stage === 0) return;
    WX.embers(8.5, 29.5, 1, 12);
    WX.fog(WX.ease('c6fog', zone && zone[4] === 'lake' ? 1 : 0));
  }

  const trail = [];
  const solidNow = () => 'TG#XwV';
  function phase() {
    if (!flag('arrive')) return 'dawn';
    if (flag('choice')) return 'dawn';
    if (flag('reveal') && !flag('freya')) return 'night';
    if (flag('xp3')) return 'dusk';
    return 'day';
  }
  function person(id, look, x, y, face, extra) {
    const a = sc.addActor(id, Object.assign({ x, y, face: face || 'south', speed: 3.2 }, extra));
    a.look = look;
    a.draw = (ctx, fx, fy, ts, t) => A.person(ctx, a.look, fx, fy, ts, t, a.face, a.moving || (a.path && a.path.length), a.o);
    return a;
  }
  const thing = (id, x, y, label) => sc.addActor(id, { x, y, thing: true, label, draw: () => {} });
  const groundCh = (map, x, y) => (y < 0 || y >= MH || x < 0 || x >= MW) ? 'V' : map[y][x];

  function makeScene() {
    const map = BASE.slice();
    const lights = () => {
      const l = [[8.5, 29.5, 3, '255,140,60', 1], [36.5, 40.2, 1.6, '255,220,160', 0], [46.5, 39.2, 1.6, '255,220,160', 0], [38.5, 5.2, 1.6, '255,220,160', 0],
        [58.9, 37.6, 1.8, '200,220,255', 1], [55.9, 1.6, 1.8, '200,220,255', 1], [23.9, 1.6, 1.8, '200,220,255', 1], [38.5, 14.5, 1.6, '220,235,255', 1]];
      if (flag('xp1')) l.push([3.5, 31.5, 1.6, '255,120,180', 1]);
      if (!flag('reveal')) l.push([41, 14.6, 1.8, '190,140,255', 0]);
      PAGES.forEach(([x, y], i) => { if (pageHere(i)) l.push([x + 0.5, y + 0.5, 1, '210,230,255', 1]); });
      return l;
    };
    const isWater = (x, y) => groundCh(map, x, y) === 'w';
    const def = {
      map, solid: solidNow(), doors: { L: 'down', M: 'up', 1: 'xp1', 2: 'xp2', 3: 'xp3' }, ground: false, bg: '#141226', clock: false,
      grade: (ctx, t, vw, vh, cx, cy, ts) => { if (WX) WX.at(ctx, t, vw, vh, cx, cy, ts, sc.P && sc.P.px, sc.P && sc.P.py); A.grade(ctx, t, vw, vh, cx, cy, ts, phase(), lights(), WX && weather); },
      ambience: () => (zone ? zone[7] : null),
      under(ctx, ts, t, x0, x1, y0, y1) {
        const ph = phase();
        for (let y = Math.max(0, y0); y <= Math.min(y1, MH - 1); y++) for (let x = Math.max(0, x0); x <= Math.min(x1, MW - 1); x++) {
          const c = groundCh(map, x, y), z = zoneAt(x, y);
          const base = 'T#X'.includes(c) ? z[8] : 'GLM123'.includes(c) ? (z[4] === 'lake' ? 'j' : ',') : c;
          A.ground(ctx, base, x, y, ts, t, (dx, dy) => { const n = groundCh(map, x + dx, y + dy); return /[123]/.test(n) ? ',' : n === '#' || n === 'T' ? zoneAt(x + dx, y + dy)[8] : n; }, z[4], ph);
        }
        // Everyone at the water's edge has a twin in it.
        A.reflect(ctx, sc, ts, t, isWater);
      },
      rowDraw(ctx, y, ts, t, x0, x1) {
        if (y < 0 || y >= MH) return;
        for (let x = Math.max(0, x0); x < Math.min(x1, MW); x++) {
          const c = map[y][x];
          if (c === 'T') A.wall(ctx, x, y, ts, t, zoneAt(x, y)[4]);
        }
        PROPS.forEach(p => { if (p.y + p.h - 1 === y && p.x + p.w >= x0 - 1 && p.x <= x1) A.prop(ctx, p, ts, t); });
        PAGES.forEach(([x, py], i) => { if (py === y && pageHere(i)) A.prop(ctx, { kind: 'page', x, y }, ts, t); });
      },
      doorFor(tx, ty) {
        const a = Object.values(sc.actors).find(o => o.thing && !o.hidden && Math.abs(o.x - tx) <= 1 && Math.abs(o.y - ty) <= 2);
        return a ? beside(a.id) : null;
      },
      overlay(ctx, t, vw, vh) { drawOverlay(ctx, t, vw, vh); }
    };
    sc = SD.scene.create($('#w-canvas'), def);
    const pos = w().pos || [40, 36];
    const P = sc.player(pos[0], pos[1], 'north');
    P.draw = (ctx, fx, fy, ts, t) => A.person(ctx, lead(), fx, fy, ts, t, P.face, P.moving);
    others().forEach((id, i) => { person(id, id, pos[0], pos[1] + 1 + i, 'north', { solid: false, talk: false }); });
    // The near shore.
    thing('notice', 37, 33, 'The notice board'); thing('booth', 33, 37, 'Mirror Everything Premium');
    person('chad', 'chad', 35, 37, 'south', { name: 'Chad the Consultant' });
    person('twin1', 'twin1', 26, 36, 'east', { name: 'A fisher' }); person('twin2', 'twin2', 47, 36, 'west', { name: 'A baker' });
    person('twin3', 'twin3', 36, 43, 'north', { name: 'A teacher' }); person('twin4', 'twin4', 30, 40, 'east', { name: 'A boatman' });
    // The jetty.
    thing('stall', 40, 15, 'Kagemaru\'s stall'); thing('mirror', 38, 14, 'The still water');
    person('kage', 'kagemaru', 42, 15, 'south', { name: 'Kagemaru' });
    person('mio', 'mio', 43, 17, 'west', { name: 'Mio' });
    // The far shore: the same people, a moment later.
    person('ftwin1', 'twin1', 26, 6, 'east', { name: 'A fisher (far shore)' }); person('ftwin2', 'twin2', 47, 6, 'west', { name: 'A baker (far shore)' });
    person('ftwin3', 'twin3', 38, 3, 'south', { name: 'A teacher (far shore)' }); person('ftwin4', 'twin4', 29, 5, 'east', { name: 'A boatman (far shore)' });
    // The camp.
    thing('bunker', 3, 22, 'Seymour\'s bunker'); thing('shop', 11, 22, 'Aigerim\'s cards'); thing('relay', 3, 32, 'The relay station');
    thing('ship', 7, 23, 'Ship It'); thing('dboard', 14, 24, 'The Design Board'); thing('fire', 8, 29, 'The camp fire');
    person('aigerim', 'aigerim', 9, 24, 'south', { name: 'Aigerim' });
    person('mioC', 'mio', 5, 33, 'west', { name: 'Mio' });
    person('ashgrove', 'ashgrove', 10, 30, 'west', { name: 'Lord Ashgrove' });
    person('wen', 'wen', 6, 30, 'east', { name: 'Grandma Wen' });
    person('freya', 'freya', 12, 32, 'west', { name: 'Freya' });
    person('kageJ', 'kagemaru', 41, 18, 'south', { name: 'Kagemaru' });
    Object.keys(GATES).forEach(id => thing(id, GATES[id][0], GATES[id][1], 'A gate: ' + GATES[id][2]));
    PAGES.forEach(([x, y], i) => sc.addActor('page' + i, { x, y, thing: true, solid: false, draw: () => {} }));
    sc.addActor('ctl', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {}, tick });
    sc.onTalk = id => talk(id);
    sc.onDoor = d => door(d);
    applyState();
  }

  function setTile(x, y, c) { const m = sc.def.map; m[y] = m[y].slice(0, x) + c + m[y].slice(x + 1); }
  function applyState() {
    const A2 = sc.actors;
    Object.keys(GATES).forEach(id => {
      const open = flag(GATES[id][4]), [x, y] = GATES[id];
      PROP[id].open = open; A2[id].hidden = open;
      setTile(x, y, open ? (id === 'glake' ? 'j' : ',') : 'G');
    });
    PROP.stall.packed = flag('reveal');
    PROP.bunker.open = flag('reveal');
    PROP.relay.open = flag('camp');
    PROPS.forEach(p => { if (p.kind === 'twinhouse') p.freed = flag('freed'); });
    A2.kage.hidden = flag('reveal');
    A2.kageJ.hidden = !(flag('xp3') && !flag('choice'));
    A2.mio.hidden = flag('xp1');
    A2.mioC.hidden = !flag('xp1');
    A2.ashgrove.hidden = A2.wen.hidden = !flag('camp');
    A2.freya.hidden = !(flag('reveal') && !flag('freya'));
    PAGES.forEach((p, i) => { A2['page' + i].hidden = !pageHere(i); });
    refresh();
  }
  // The "!" over whoever or whatever has something for you.
  function refresh() {
    if (!sc) return;
    const A2 = sc.actors, tg = step()[2];
    Object.values(A2).forEach(a => { if (a.id !== 'ctl' && a.id !== 'you') a.marker = a.id === tg; });
    const names = { notice: null, booth: 'Mirror Everything Premium', stall: 'Kagemaru\'s stall', mirror: null, bunker: 'Seymour\'s bunker', shop: 'Aigerim\'s cards', relay: 'The relay station', ship: 'Ship It', dboard: 'The Design Board', fire: 'Camp fire' };
    Object.keys(names).forEach(id => { if (A2[id]) A2[id].name = A2[id].marker || ['shop', 'relay', 'ship', 'dboard', 'bunker'].includes(id) ? (names[id] || A2[id].label) : null; });
    Object.keys(GATES).forEach(id => { A2[id].name = A2[id].marker ? GATES[id][2] : null; });
    hud();
  }

  // ---------- Every frame ----------
  const onJetty = P => sc.tile(P.x, P.y) === 'j' && P.x >= 37 && P.x <= 44 && P.y <= 27;
  function tick() {
    const P = sc.P; if (!P) return;
    const k = P.x + ',' + P.y;
    if (k !== lastTile) {
      if (lastTile) { const [x, y] = lastTile.split(',').map(Number); trail.unshift([x, y]); trail.length = Math.min(trail.length, 6); }
      lastTile = k;
      if (!busy) { w().pos = [P.x, P.y]; S.persist(); }
      const z = zoneAt(P.x, P.y);
      if (z[4] !== 'rock' && (!zone || z[4] !== zone[4])) {
        const first = zone === null, change = !zone || z[6] !== zone[6];
        zone = z;
        if (change && !busy) mus(z[6]);
        if (!first) banner(z[5]);
        if (z[4] === 'far') setFlag('far');
      }
    }
    others().forEach((id, i) => {
      const a = sc.actors[id], to = trail[i];
      if (!to || a.scripted || a.moving || a.path.length) return;
      if (a.x !== to[0] || a.y !== to[1]) { a.speed = 7.5; a.path = [to]; }
    });
    if (busy || P.moving || P.path.length) return;
    if (!flag('arrive')) return act(arrive);
    if (!flag('offer') && onJetty(P)) return act(offer);
    if (flag('xp1') && !flag('camp') && zoneAt(P.x, P.y)[4] === 'camp') return act(campArrive);
    PAGES.forEach(([x, y], i) => { if (pageHere(i) && P.x === x && P.y === y) act(() => page(i)); });
  }
  function banner(text) {
    const el = document.createElement('div');
    el.className = 'w-zone'; el.textContent = text;
    $('#screen-world').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  function drawOverlay(ctx, t, vw, vh) {
    if (!sc) return;
    const { cx, cy } = sc.cam(), ts = guessTs(vw, vh), tg = step()[1];
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
  }
  function guessTs(vw, vh) { return Math.max(vw / 15, vh / 13) >= 44 ? 48 : 32; }

  async function act(fn) {
    if (busy) return;
    busy = true; sc.locked = true; sc.pause();
    try { await fn(); } catch (e) { console.error(e); }
    finally { busy = false; if (sc) { sc.locked = false; w().pos = [sc.P.x, sc.P.y]; if (W.active) applyState(); } S.persist(); }
  }
  const open = (x, y) => !solidNow().includes(sc.tile(x, y));
  function beside(id) {
    const a = sc.actors[id];
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) {
      const x = a.x + dx, y = a.y + dy;
      if (open(x, y) && !/[LM123]/.test(sc.tile(x, y)) && !Object.values(sc.actors).some(o => o !== a && !o.hidden && !o.player && o.solid !== false && o.x === x && o.y === y)) return [x, y];
    }
    return [a.x, a.y + 1];
  }
  const goTo = (x, y) => { sc.place('you', x, y); others().forEach(id => sc.place(id, x, y)); trail.length = 0; lastTile = ''; };

  // A card the overworld taught: it joins your deck for every expedition from now on.
  function addCard(id, why) {
    if (!SD.cards[id] || w().cards.includes(id)) return;
    w().cards.push(id); S.persist();
    AU.sfx('sparkle');
    return U.system(why || 'NEW CARD', `${SD.cards[id].name} joins your deck for the expeditions.`, 'gold');
  }
  // An inline question (typed or multiple choice) that this chapter asks itself.
  const ask = (q, title) => SD.quiz.ask(q, { title: title || 'A QUESTION' });
  // A question on an older chapter's lesson, from one you've seen that has a question to ask.
  function olderQ() {
    const has = c => SD.questions.some(q => q.c === c && q.id && !q.lp && q.type !== 'explain');
    const older = Object.keys(SD.concepts).filter(k => SD.concepts[k].zone < 6 && S.concept(k).seen && has(k));
    const list = older.length ? S.pickConcepts(Math.min(3, older.length), older) : [];
    for (const c of list) { const q = D.pickQ(c); if (q) return q; }
    return D.pickQ('regionsaz');
  }

  // ---------- The story: act 1 ----------
  async function coldOpen() {
    mus('c6sad');
    U.closePanel(); U.stage(null);
    await vn([['bg', 'c6-1984'],
      ['narr', 'A memory node, from the oldest backup in the vault. 1984. Uptima\'s temple, before it was Freya\'s.'],
      ['show', 'gary', 'tired', 'left'],
      ['narr', 'Gary at the console, packing a box. A half-price croissant sits on the keyboard. He doesn\'t look up.'],
      ['show', 'kagemaru', 'neutral', 'right'],
      ['narr', 'A hooded figure waits in the doorway, white gloves folded, for the job Gary has just left.'],
      ['freya', 'And why do you want to be my Champion, love?', 'warm'],
      ['kagemaru', 'I like to stand near whoever\'s winning, my lady. And the view is wonderful.', 'neutral'],
      ['hide', 'gary'],
      ['narr', 'Gary walks out past him, box under one arm, and doesn\'t say goodbye.'],
      ['kagemaru', 'Ah ha ha.', 'amused'],
      ['fx', 'black']]);
    setFlag('cold');
  }
  async function arrive() {
    mus('c6town');
    await say([[null, 'Floor 81: Twinwater. A town on both shores of a lake so still it\'s a mirror. Every house has a twin across the water.'],
      [null, 'A fisher waves. On the far shore, a moment later, another fisher waves the same wave.'],
      ['lead', { mira: 'Nobody here looks like they\'ve ever been sad, love. That\'s not a good sign.', kai: 'Everyone\'s smiling. Everyone. Even the fish guy.', seoyeon: 'Nobody here has ever been alone. I can tell from how they stand.', dutch: 'Every one of them has a backup. Freya\'s own town. Of course.' }],
      [others()[0], 'The jetty. Someone\'s waiting at the end of it.', 'neutral']]);
    setFlag('arrive');
  }
  async function offer() {
    mus('freya');
    const no = { mira: 'No. He\'d hate being remembered by you.', kai: 'Hana was never a recipe.', seoyeon: 'I\'ve met Jin\'s Echo. It said his lines without him. No.', dutch: 'No. Lina was real. That\'s the whole point of her.' };
    const inner = { mira: '(Bram, in her voice. Bram, asking me to come home.)', kai: '(Hana. She even laughs like Hana.)', seoyeon: '(Up, Minnow. Forms. In her mouth.)', dutch: '(Lina\'s voice. The exact pitch of it. That\'s the worst part.)' };
    await vn([['bg', 'c6-jetty'],
      ['narr', 'At the end of the jetty, Freya is waiting, as cheerful as ever. Behind her, the lake holds the whole town upside down.'],
      ['show', 'freya', 'warm', 'right'],
      ['freya', 'My loves. All four of you, at once. I\'ve saved my best for last.', 'warm'],
      ['freya', 'I\'ll bring them back. Bram, Hana, Jin, Lina. From my own memory. They\'ll be as real as I am.', 'earnest'],
      ['narr', 'Then she says it again, in their voices. Each of them hears the one they lost.'],
      ['show', 'lead', 'neutral', 'left'],
      ...T.order.map(id => (id === lead() ? ['narr', inner[id]] : [id, no[id], 'cold'])),
      ['lead', { mira: 'No, love.', kai: 'No.', seoyeon: 'No.', dutch: 'No.' }, 'cold'],
      ['freya', 'Free, my loves. Whenever you change your minds.', 'smile'],
      ['narr', 'She goes. At the jetty\'s end, someone has set up a stall, and he is in a wonderful mood.']]);
    mus('c6town');
    setFlag('offer');
  }
  async function stall() {
    if (flag('xp3')) return choice();
    if (!flag('stall')) {
      mus('c6culprit');
      await say([['kagemaru', 'So close to the top! I\'ve marked everything down. You\'ll want it all for the last floors. Ah ha ha.', 'amused'],
        ['lead', { mira: 'You\'ve been on every floor we have, love.', kai: 'You\'re everywhere, man.', seoyeon: 'You were on the mountain too.', dutch: 'You\'ve had a stall in every band since the Granaries.' }],
        ['kagemaru', 'I go where the customers are. Here. On the house. Well. Half the house.', 'neutral']]);
      mus('c6town');
      setFlag('stall');
      await addCard('r6-markdown', 'A GIFT FROM THE STALL');
      return say([[null, 'Marked Down: exactly what you need, and it costs the team 3 SLA every time you play it.']]);
    }
    return say([['kagemaru', rnd(['Everything must go! Including, eventually, you. Ah ha ha.', 'Two of everything, in Twinwater. Except me. There\'s only ever one of me.', 'Buy now. Prices only go up, closer to the top.']), 'amused']]);
  }
  async function mioEar() {
    if (flag('mio')) return say([['mio', rnd(['That one\'s pretending. Shh.', 'I\'ll come to camp after the stairs. I can help with the relay.']), 'smile']]);
    await say([[null, 'An eight-year-old in pink sits at the end of the jetty with her ear to the boards: Mio, from the first game, who can hear what servers think.'],
      ['mio', 'Shh. I\'m listening to the twins. That one\'s fine. That one\'s asleep. That one says it\'s fine and it isn\'t.', 'earnest'],
      ['lead', { mira: 'Which one is lying, love?', kai: 'How can you tell?', seoyeon: 'Which?', dutch: 'Which one?' }],
      ['mio', 'The ones that say "OK" too fast. Real things take a moment.', 'neutral'],
      ['mio', 'The man with the stall... I can\'t hear anything at all from him. Nothing. I don\'t like it.', 'sad'],
      [null, 'Nobody listens to an eight-year-old. Except, by now, this camp.']]);
    setFlag('mio');
  }
  const MIRROR = {
    mira: [['mirror', 'I finished it, love. The list. Every name crossed off, and nobody left to look after.', 'smile'], ['lead', 'Bram would have hated it.', 'warm'], ['mirror', 'He would. I don\'t mind.', 'warm']],
    kai: [['mirror', 'She\'s right here. On the shelf, in her jar. She never leaves.', 'smile'], [null, 'Kai thinks of his own shelf at camp, where Freya\'s jar went dark.'], ['lead', 'Mine went dark.', 'sad']],
    seoyeon: [['mirror', 'The Cult goes down the mountain at dawn. I asked them very politely.', 'cold'], ['lead', 'You would.', 'neutral']],
    dutch: [['mirror', 'Sit down, Dutch. You\'ve earned it.', 'warm'], [null, 'The badge on its chest is polished. Dutch doesn\'t sit.']]
  };
  async function mirror() {
    if (flag('mirror1')) return say([[null, 'The still water. Your reflection looks back, a moment late, and perfectly happy.']]);
    mus('c6mirror');
    await vn([['bg', 'c6-mirror'],
      ['narr', 'Where the jetty ends, the lake is brightest. Your lead looks down, and someone else looks up: who they\'d be if they\'d stayed with Freya.'],
      ['show', 'mirror', 'smile', 'right'], ['show', 'lead', 'neutral', 'left'],
      ...MIRROR[lead()],
      ['narr', 'It isn\'t unhappy. That\'s the worst of it.']]);
    mus('c6town');
    setFlag('mirror1');
  }
  async function notice() {
    await say([[null, flag('freed') ? 'The notice board: "Twinwater Relay Station, at the camp below. Come and say how you are. Somebody will listen."' : 'The notice board: "Twinwater: twice as safe. Every house, every shop, every one of you, kept on both shores. With love, Freya."'],
      ['lead', { dutch: 'Twice as safe. Same account, though. Same hands.', other: 'Two of everything. One owner.' }]]);
    setFlag('notice');
  }
  // Twinwater's people: whatever one says, the twin across the water says a moment later.
  const ECHO = { twin1: ['Lovely day for it. Lovely day for everything.', 'I caught a fish yesterday. So did I. I mean, so did he.'], twin2: ['Fresh bread! Twice as fresh!', 'Nothing ever burns here. I tried, once.'],
    twin3: ['We never teach sadness. Nobody can remember what it was for.', 'The children all answer at once. And then again.'], twin4: ['Boat to the far shore? There\'s no need. You\'re already there.', 'I\'ve never been alone in a boat.'] };
  const FREED = { twin1: 'He doesn\'t say it back. He just doesn\'t. I\'m going to the camp to tell someone.', twin2: 'I burned a loaf this morning. On purpose. I cried. It was wonderful.',
    twin3: 'The children asked me what "lonely" means. I told them. Then I had to sit down.', twin4: 'I rowed out alone. Nobody rowed back.' };
  async function villager(id) {
    const base = id.replace(/^f/, '');
    if (flag('freed')) return say([[base, FREED[base], 'sad']]);
    const line = rnd(ECHO[base]);
    await say([[base, line, 'smile'], [null, `Across the water, a moment later, the same voice: "${line}"`]]);
    setFlag('echo');
  }
  async function gate(id) {
    const g = GATES[id];
    if (id === 'groute') {
      if (!flag('offer')) return say([[null, 'A signpost gate across the road east. It seems to be waiting for you to talk to someone first.'], ['lead', 'The jetty. Someone\'s waiting at the end of it.']]);
      const need = !flag('stall') ? 'The stall at the end of the jetty first.' : !flag('mio') ? 'The girl on the jetty first. She\'s listening to something.' : !flag('mirror1') ? 'Not yet. The water at the end of the jetty... I want to look.' : null;
      if (need) return say([['lead', need, 'neutral']]);
    }
    if (id === 'glake' && !flag('xp1')) return say([[null, 'A gate at the foot of the causeway, and the far shore beyond it. Its plaque: "Only what knows how to cross may cross."'], ['lead', 'Later. The stairs first.']]);
    if (id === 'glake' && !(flag('ship') && flag('diary') && flag('heartbeat') && flag('receipt'))) {
      const n = !flag('ship') ? 'Ship It at camp' : !flag('diary') ? 'Aigerim\'s diary, at camp' : !flag('heartbeat') ? 'Mio\'s heartbeats, at the relay station' : 'Chad\'s receipt, at his booth';
      return say([['lead', `Not yet. ${n} first.`, 'neutral']]);
    }
    if (id === 'glock' && !(flag('reveal') && flag('freya') && flag('board'))) return say([[null, 'A wall across the far shore, and in it a door with an Object Lock on it. Behind it, the Vault.'], ['lead', flag('reveal') ? 'Not yet. Camp first: Freya, and the Design Board.' : 'Not yet.', 'neutral']]);
    const def = G.DEF[g[4]];
    await say([[null, `A gate with a plaque: ${g[2]}. ${{ route: 'A signpost that answers every traveller who asks the way.', lake: 'It lets through only what knows how to cross.', lock: 'It opens for a copy that\'s locked properly.' }[g[4]]}`]]);
    const r = await (def.fields ? G.door(def) : def.steps ? G.order(def) : G.sort(def));
    setFlag(g[4]);
    R.gainXp(r.first === true || r.first === (r.of || 0) || r.mistakes === 0 ? 20 : 10);
    if (def.card) await addCard(def.card);
    if (id === 'glake') {
      await ask({ c: 'replicas', type: 'num', q: 'Aigerim\'s diary bucket replicates to the far shore with S3 Replication Time Control. RTC copies 99.99% of new objects within how many minutes, under its SLA?', lo: 15, hi: 15, ans: 15, unit: 'minutes',
        why: 'S3 Replication Time Control replicates 99.99% of new objects within 15 minutes, backed by an SLA, and adds replication metrics and notifications.',
        eli5: 'The fast ferry promises almost every letter reaches the far shore within a quarter of an hour, and it pays you back if it doesn\'t.' }, 'THE LAKE ROAD');
    }
  }

  // ---------- The expeditions ----------
  const XPS = ['r6stairs', 'r6relay', 'r6vault'], BACK = [[58, 39], [55, 3], [23, 3]];
  async function xpDoor(n) {
    const xp = XPS[n - 1], back = BACK[n - 1];
    if (n === 1 && !flag('route')) { goTo(back[0], back[1]); return say([['lead', 'The signpost gate first.', 'neutral']]); }
    const x = SD.expeditions.find(e => e.id === xp);
    const go = await new Promise(res => {
      const b = U.panel(`<p>${esc(x.blurb)}</p><p class="muted small">Expedition ${['I', 'II', 'III'][n - 1]}: ${x.floors.length} raid floors and ${x.floors.length} floor bosses, with the other three as your party. One of Seymour's Tapes: lose with it left and the floor starts again; lose with none and you're back at camp, and the expedition starts over.</p>
        <div class="row"><button class="primary" id="c6-go">Go in</button><button class="ghost" id="c6-not">Not yet</button></div>`, { title: x.name.toUpperCase(), noClose: true });
      b.querySelector('#c6-not').onclick = () => { U.closePanel(); res(false); };
      b.querySelector('#c6-go').onclick = () => { U.closePanel(); res(true); };
    });
    if (!go) { goTo(back[0], back[1]); return; }
    w().pos = back; S.persist();
    return expedition(xp);
  }
  const SETS = { r6stairs: 'stairs', r6relay: 'relay', r6vault: 'vault' };
  const deckFor = (champ, bot) => {
    const base = !bot && Array.isArray(c1().deck) && c1().deck.length ? c1().deck.map(c => c.id) : (SD.starterDeck || []).slice();
    let d = SD.champions.deck(champ, base);
    // What the overworld taught you is in your own deck; the bots bring the common lessons too.
    d = d.concat(bot ? w().cards.filter(id => SD.cards[id] && !SD.cards[id].quest).slice(-4) : w().cards);
    // The floors' curses, until Mio's Heartbeat and Aigerim's Second Diary lift them.
    if (!flag('heartbeat')) d.push('r6-failcurse');
    if (!flag('diary')) d.push('r6-lag');
    return d.filter(id => SD.cards[id]);
  };
  const onMiss = q => { if (q && q.c) { w().miss = [q.c].concat(w().miss.filter(c => c !== q.c)).slice(0, 12); S.persist(); } };
  // The floors' lines, in the party's voices. A { who: 'c6' } line is a cue for one of this chapter's own scenes.
  async function raidSay(list) {
    let out = [];
    const flush = async () => { if (out.length) { const o = out; out = []; await U.dialog(o); } };
    for (const l of list || []) {
      if (!l) continue;
      if (l.who === 'c6') { await flush(); if (CUES[l.text]) await CUES[l.text](); continue; }
      const t = pick(l.text); if (!t) continue;
      const s = l.who === 'lead' ? lead() : l.who === 'mate1' ? others()[0] : l.who === 'mate2' ? others()[1] : l.who;
      out.push({ s: s && SD.cast[s] ? s : 'narr', t, e: l.e });
    }
    await flush();
  }
  // Songs in the dungeon: the floor, a boss, Kagemaru, your reflection.
  function raidMusic(root) {
    let last = null;
    const beat = () => {
      const boss = root.querySelector('.bossfight'), name = boss ? (root.querySelector('.foe-name') || {}).textContent || '' : '';
      const k = boss ? (/Kagemaru/.test(name) ? 'c6culprit' : /reflection|in the lake/i.test(name) ? 'c6mirror' : 'c6boss') : 'c6dungeon';
      if (k !== last) { last = k; mus(k); }
    };
    beat();
    const iv = setInterval(beat, 800);
    return () => clearInterval(iv);
  }
  async function expedition(xp) {
    W.halt();
    W.set = SETS[xp];
    U.closePanel(); U.stage(null);
    // Kagemaru's twin across the lake is your lead's own reflection.
    const x = SD.expeditions.find(e => e.id === xp);
    if (xp === 'r6vault' && x) { const f = x.floors[x.floors.length - 1]; if (f.bossPack) f.bossPack.ids = ['kagemaru', 'mir' + lead()]; }
    SD.main.show('run');
    const root = $('#run');
    if (SD.champions.setMine) SD.champions.setMine(lead());
    A.raidArt(true);
    const stop = raidMusic(root);
    let won = false;
    try {
      const hub = await SD.net.open();
      await SD.raid.play(root, hub, SD.net.code('c6'), { story: true, label: 'The Mirror Floors', xp, champNames: true, create: true, auto: { bots: others() }, tapes: 1,
        deckFor, pickQ: D.pickQ, say: raidSay, onMiss, onEnd: r => { won = !!(r && r.won); } });
    } catch (e) { console.warn('Mirror Floors:', e); }
    finally { stop(); A.raidArt(false); W.set = null; }
    return after(xp, won);
  }
  async function after(xp, won) {
    if (W.debug.onAfter && W.debug.onAfter(xp, won)) return;
    // An expedition starts from a raid gate's scene (inside act), or from the end card (outside one).
    const run = fn => (busy ? fn() : act(fn));
    if (!won) {
      // No game over: back to camp, and the expedition starts again from its first floor next time.
      w().pos = [9, 27]; S.persist();
      sc = null; W.enter();
      return run(() => say([[null, 'The party wakes by the camp fire, soaked through and bruised. The expedition will start again from its first floor.'],
        ['lead', { mira: 'Up, loves. Tea, then again.', kai: 'Okay. Food. Then again.', seoyeon: 'Again.', dutch: 'Again. Slower.' }, 'tired']]));
    }
    setFlag({ r6stairs: 'xp1', r6relay: 'xp2', r6vault: 'xp3' }[xp]);
    R.gainXp(80);
    if (xp === 'r6stairs') {
      sc = null; W.enter();
      return run(() => say([[null, 'Back on the near shore. The Twin Stairs are quiet, both of them.'], [others()[1], 'Mio said she\'d meet us at camp. Down the lift.', 'neutral']]));
    }
    if (xp === 'r6relay') {
      w().pos = [5, 24]; S.persist();
      sc = null; W.enter();
      return run(() => say([[null, 'That night, at camp, the bunker\'s light goes green for the first time anyone can remember.'], ['seymour', 'You\'ve earned it. Come in. I\'ll show you the tape.', 'neutral']]));
    }
    w().pos = [41, 20]; S.persist();
    sc = null; W.enter();
    return run(() => say([[null, 'Twinwater, at dusk. Kagemaru sits on the jetty with his stall packed up, humming.']]));
  }
  // Cues from the floors' intros and outros (js/c6-data.js).
  const CUES = {
    async keeper() {
      if (flag('keeper')) return;
      await say([[null, 'The Lighthouse Keeper looks up from his ledger. "Ships want guiding. How much can they lose, and how long can they wait? Give me the numbers, and I\'ll pick my lamp."']]);
      await ask({ c: 'drtiers', type: 'num', q: 'The last good copy of the harbour log was made at 12:00. The near shore was lost at 15:10. How many minutes of data could be lost (the RPO this gives)?', lo: 190, hi: 190, ans: 190, unit: 'minutes',
        why: 'RPO is measured back from the failure to the last good copy: 12:00 to 15:10 is 3 hours 10 minutes, 190 minutes.',
        eli5: 'If the last time you saved your game was at noon and the power went at ten past three, you lose everything since noon.' }, 'THE LIGHTHOUSE KEEPER · RPO');
      await ask({ c: 'drtiers', type: 'num', q: 'Restoring the log takes 45 minutes, and launching and checking the lamp 15 more. How many minutes until ships are guided again (the RTO this gives)?', lo: 60, hi: 60, ans: 60, unit: 'minutes',
        why: 'RTO is how long until users are served again: 45 minutes to restore and 15 to launch and check, 60 minutes.',
        eli5: 'Getting the lamp lit again takes an hour, so the ships wait an hour.' }, 'THE LIGHTHOUSE KEEPER · RTO');
      await say([[null, '"Then I\'ll keep one lamp banked, not burning," says the Keeper. "Cheapest that meets both. Now come and test it."']]);
      setFlag('keeper');
    },
    async clock() {
      if (flag('clock')) return;
      AU.sfx('x-tick');
      await say([[null, 'The countdown above the key reads 00:00:59... days, not seconds. One day left of the waiting period Freya set.']]);
      await ask({ c: 'keydelete', type: 'num', q: 'Freya could have picked any waiting period when she scheduled the key\'s deletion. What is the longest one KMS allows, in days?', lo: 30, hi: 30, ans: 30, unit: 'days',
        why: 'A KMS key scheduled for deletion waits 7 to 30 days; 30 is both the default and the most. During the wait it can\'t be used, and the deletion can be cancelled.',
        eli5: 'Throwing away a master key always comes with a waiting week or more, up to a month, so somebody has time to say "wait, no".' }, 'THE CLOCK ROOM');
      setFlag('clock');
    },
    async saved() {
      if (flag('saved')) return;
      mus('c6sad'); AU.sfx('x-lever');
      await vn([['bg', 'c6-clock'],
        ['narr', 'On the last turn, someone plays Cancel Deletion. kms:CancelKeyDeletion. The countdown stops.'],
        ['narr', 'The key survives, and so does Kyu\'s second copy. But the key comes back Disabled, not Enabled, and its key policy hands control to the account\'s IAM policies. Freya\'s.'],
        ['kagemaru', 'Saved it? Touching. Now it\'s a locked box, and only she holds the key to the key.', 'neutral'],
        ['show', 'lead', 'sad', 'left'],
        ['seymour', 'That\'s why you test them. We\'ll test this one the day we can open it.', 'neutral']]);
      await ask({ c: 'keydelete', type: 'mc', q: 'Kyu\'s key had its deletion cancelled with kms:CancelKeyDeletion. What does it take before the copy can be decrypted again?',
        opts: ['Someone allowed kms:EnableKey must enable it: a cancelled key comes back Disabled', 'Nothing: cancelling restores it to Enabled', 'Its key material must be imported again', 'It must be rotated first'], a: 0,
        why: 'Cancelling a scheduled deletion leaves the key Disabled. It works again only after EnableKey, by a principal the key policy (or IAM, where the policy allows it) permits.',
        eli5: 'The box was saved from the bin, but it comes back locked shut. Someone with the right to unlock it has to do it on purpose.' }, 'THE CLOCK ROOM · SAVED');
      setFlag('saved');
      mus('c6dungeon');
    },
    async confront() {
      mus('c6culprit');
      if (flag('confront')) return say([['kagemaru', 'Again? I do love a second showing. Ah ha ha.', 'amused']]);
      await vn([['bg', 'c6-vault'],
        ['narr', 'The Keeper\'s Room. On the card table: Freya\'s backup, locked in compliance mode, retain until 12026. Beside it, Seymour\'s tape.'],
        ['show', 'kagemaru', 'ring', 'right'],
        ['kagemaru', 'I won\'t deny a thing. I\'d like to see whether you can prove it. Watching people work it out is the best part.', 'amused'],
        ['show', 'lead', 'cold', 'left']]);
      await ask({ c: 'cloudtrail', type: 'explain', q: 'Freya read the four prayers the night she chose them. Who else read them that night, and what record would show it?',
        points: [{ t: 'CloudTrail data events on Bru\'s prayer logs (S3 object reads), turned on in the Mailroom', keys: ['data event', 'getobject', 'object.?level', 's3', 'cloudtrail', 'mailroom'], ex: ['the read events in the logs', 'S3 data events recorded by a trail'] },
          { t: 'The Champion\'s role read them, an hour after Freya', keys: ['champion', 'kagemaru', 'his role', 'role', 'an hour', 'after freya'], ex: ['his role read them too', 'the Champion checked her picks'] }],
        model: 'The S3 data events in Bru\'s prayer logs (a trail logging object reads, turned on in the Mailroom) show the Champion\'s role reading all four prayers an hour after Freya did.',
        why: 'Reads of S3 objects are data events: CloudTrail records them only when a trail is set to log data events, which the Mailroom did. Each event names the role that made the call.',
        eli5: 'The letterbox kept a list of everyone who opened each letter, because someone switched that list on. His name is on it, an hour after hers.' }, 'EVIDENCE 1 · THE APPLICANTS\' FILES');
      AU.sfx('x-crowd');
      await say([[null, 'On the near shore, a stretch of Twinwater\'s people take their grants back. Kagemaru applauds.']]);
      await ask({ c: 'keydelete', type: 'mc', q: 'Freya scheduled the deletion of Kyu\'s key. What could have stopped it, and did the Champion\'s role have it?',
        opts: ['kms:CancelKeyDeletion during the waiting period; his role had it, and never used it', 'kms:DisableKey; his role didn\'t have it', 'Nothing can stop a scheduled deletion', 'Deleting the CloudTrail trail'], a: 0,
        why: 'During the waiting period a scheduled deletion can be cancelled with kms:CancelKeyDeletion. CloudTrail shows his role had the permission, and no CancelKeyDeletion call from it.',
        eli5: 'He had the "stop the bin lorry" button the whole time. The log shows he never pressed it.' }, 'EVIDENCE 2 · THE DELETION');
      await say([['kagemaru', 'A second copy would have halved the price of the first. You understand. You\'re customers.', 'amused'], [null, 'Another stretch of shore takes its grants back.']]);
      await ask({ c: 'cloudtrail', type: 'mc', q: 'Gary resigned in 1984, and the Forbidden Index files "Champions, current" under the same day. If a role was made for the new Champion that day, where would its record be now?',
        opts: ['An IAM CreateRole management event, in a trail\'s S3 bucket: event history only keeps 90 days', 'In CloudTrail event history, which keeps everything forever', 'Nowhere: IAM changes are data events, off by default', 'In the role\'s own tags'], a: 0,
        why: 'CreateRole is a management event. Event history shows 90 days of them with no setup; anything older is only where a trail delivered it, such as an S3 bucket.',
        eli5: 'The town\'s diary only remembers the last three months by itself. To remember 1984, somebody had to be copying the pages into a library all along.' }, 'EVIDENCE 3 · THE YEAR');
      await vn([['bg', 'c6-vault'], ['narr', 'Both shores, all at once. Every grant in Twinwater goes back to its owner.'],
        ['show', 'kagemaru', 'reveal', 'right'], ['kagemaru', 'Bravo! Bravo. Now come and take it from me. Mind my twin.', 'reveal']]);
      setFlag('confront');
    },
    async after() {
      if (flag('after')) return;
      mus('c6sad');
      await vn([['bg', 'c6-vault'],
        ['narr', 'Beaten, Kagemaru sits on the floor of the Keeper\'s Room and laughs until he has to hold his sides.'],
        ['show', 'kagemaru', 'amused', 'right'],
        ['freya', 'Delete the tape, love. Now.', 'cold'],
        ['narr', 'Her voice, warm, from the top of the tower. He looks up at the ceiling for a long time. He\'s doing a sum: four bands gone, her pipeline broken, the party standing over him.'],
        ['kagemaru', 'No, my lady. I don\'t think I will.', 'neutral'],
        ['narr', 'The third time anyone has said no to her, after Gary and Kyu. The only time it wasn\'t brave.'],
        ['kagemaru', 'Keep winning and it stays with you. Lose, and it comes home to me. Today it\'s every Memory Shard in your camp. I\'m practically giving it away.', 'amused'],
        ['show', 'lead', 'cold', 'left'],
        ['narr', 'They pay. Seymour\'s tape is theirs, the way his pins always were: for as long as they keep winning.']]);
      c6().tape = true; S.persist(); AU.sfx('x-chain');
      await ask({ c: 'drtiers', type: 'mc', q: 'The deep dive, while he\'s still laughing: which strategy meets an RPO of seconds and an RTO of minutes, at the lowest cost?',
        opts: ['Warm standby, with data replicated continuously', 'Backup and restore', 'Pilot light with nightly backups', 'Multi-site active/active'], a: 0,
        why: 'Seconds of RPO needs continuous replication; minutes of RTO needs a scaled-down full copy already running. That\'s warm standby: more than pilot light costs, less than active/active.',
        eli5: 'Keep a smaller copy of the shop open all the time across the lake, with the till copied every second. If this shop burns, the other one just gets bigger.' }, 'THE DEEP DIVE');
      await ask({ c: 'objlock', type: 'mc', q: 'And Freya\'s backup on his table, in compliance mode until 12026: who can delete it before then?',
        opts: ['Nobody, not even the account\'s root user, until the date', 'Kagemaru, with s3:BypassGovernanceRetention', 'Freya, as the account\'s root user', 'Anyone who suspends versioning'], a: 0,
        why: 'Compliance mode can\'t be shortened or removed by any user, root included, until the retain-until date. Governance mode is the one a permission can bypass.',
        eli5: 'It\'s a time lock, not a key lock. Nobody has a key. You wait for the date.' }, 'THE DEEP DIVE');
      setFlag('after');
    }
  };

  // ---------- The camp ----------
  async function campArrive() {
    await say([[null, 'The Free Cloud\'s camp, at the tower\'s foot. Mio is already up the relay station\'s aerial, listening.'],
      ['mio', 'It\'s quiet here. Nothing down here pretends.', 'smile'],
      [null, 'By the fire sits an old man in black with no watch behind him: Lord Ashgrove. Grandma Wen is stirring a pot beside him.'],
      ['ashgrove', 'Dutch. Tell me about the tower again. Slowly.', 'stone'],
      ['kai', 'Eat first.', 'neutral'], [null, 'He hates it, and eats everything.']]);
    setFlag('camp');
  }
  async function ship() {
    if (!flag('camp')) return say([[null, 'A desk with a template on it, waiting to be shipped to two places at once.']]);
    if (flag('ship')) return say([[null, 'The relay station stands on both shores now: one template, two sizes.']]);
    const r = await G.order(G.DEF.ship);
    setFlag('ship'); R.gainXp(r.mistakes === 0 ? 30 : 15);
    await addCard('r6-stackset');
  }
  async function aigerim() {
    if (!flag('camp')) return say([['aigerim', 'Cards! Cards! Every one I\'ve ever had, still. I can\'t delete any of them. I checked.', 'smile']]);
    if (!flag('diary')) {
      await say([['aigerim', 'My diary. Every day since the first game. I want it safe. From fire, from thieves, and from an admin who\'d like it gone.', 'earnest'],
        ['aigerim', 'Two shelves, and the right lock on each. Help me?', 'smile']]);
      const r = await G.sort(G.DEF.shelves);
      setFlag('diary'); R.gainXp(r.first === r.of ? 30 : 15);
      await say([['aigerim', 'Here. My second diary. A copy on the far shore, locked, on time. Take it with you.', 'smile']]);
      await addCard('r6-comply');
      await addCard('r6-diary', 'PLOT DEVICE: AIGERIM\'S SECOND DIARY');
      return U.system('REPLICATION LAG LIFTED', 'No more Replication Lag cards in your decks.', 'gold');
    }
    return review('drill');
  }
  async function relay() {
    if (!flag('xp1')) return say([[null, 'A hut with an aerial and a sign, RELAY. Nobody runs it yet.']]);
    if (!flag('heartbeat')) {
      await say([['mio', 'Six of them, from the lake. Listen with me. Some of them are lying.', 'earnest']]);
      const r = await G.sort(G.DEF.beats);
      setFlag('heartbeat'); R.gainXp(r.first === r.of ? 30 : 15);
      await addCard('r6-calc');
      await addCard('r6-heartbeat', 'PLOT DEVICE: MIO\'S HEARTBEAT');
      return U.system('FAILOVER LIFTED', 'No more Failover cards in your decks.', 'gold');
    }
    return review(flag('freed') ? 'relay' : 'beats');
  }
  async function receipt() {
    if (!flag('camp')) return say([['chad', 'Mirror Everything Premium! Why have two of everything when you could have THREE? Synergy!', 'smile']]);
    if (flag('receipt')) return review('receipt');
    await say([['chad', 'Twinwater\'s invoice for the first two twins. Totally standard. You\'ll love the third.', 'smug'],
      ['wen', 'Give it here, dear. I\'ve run a café for forty years. I know a padded bill.', 'amused']]);
    const r = await G.pick(G.DEF.receipt);
    await ask({ c: 'costnet', type: 'num', q: 'The first line: 2 TB a day of S3 traffic through the NAT gateway, at $0.045 per GB processed. About how many dollars a day is that? (Count 1 TB as 1,000 GB.)', lo: 88, hi: 93, ans: 90, unit: 'dollars a day',
      why: '2,000 GB x $0.045 = $90 a day, about $2,700 a month, for traffic a gateway endpoint carries for free.',
      eli5: 'Every box that goes through the toll gate costs a few cents. Two thousand boxes a day is ninety dollars a day, for a road that has a free lane right beside it.' }, 'CHAD\'S RECEIPT');
    setFlag('receipt'); R.gainXp(r.first === r.of ? 30 : 15);
    await say([['wen', 'Tag every line with whose it is, set a budget with an alert, and look at Cost Explorer once a week. That\'s the whole secret, dear.', 'smile'],
      ['chad', 'I was literally about to say that.', 'shock']]);
    await addCard('r6-gwend');
    await addCard('r6-receipt', 'PLOT DEVICE: CHAD\'S RECEIPT');
  }
  // Camp review lessons: questions on what you're weakest at, the last missed first.
  const DRILL = { drill: ['objlock', 'awsbackup', 'replicas', 'lifecycle6'], beats: ['health53', 'routing53', 'readiness'], receipt: ['costnet', 'costtools'] };
  const DRILLWHO = { drill: ['aigerim', 'Diary Drill! Three, from my shelves.', 'AIGERIM\'S DIARY DRILL'], beats: ['mio', 'Heartbeats. Three of them. Listen properly.', 'MIO\'S HEARTBEATS'],
    receipt: ['wen', 'Receipt Review, dear. Three lines, and Chad isn\'t allowed to help.', 'WEN\'S RECEIPT REVIEW'], relay: ['mio', 'The Relay Station! I ask what you got wrong most. From everywhere.', 'THE RELAY STATION'] };
  async function review(kind) {
    const seen = Object.keys(SD.concepts).filter(c => S.concept(c).seen && (DRILL[kind] ? DRILL[kind].includes(c) : true));
    const fallback = DRILL[kind] || ['regionsaz'];
    const pool = w().miss.filter(c => seen.includes(c)).concat(S.pickConcepts(3, seen.length ? seen : fallback));
    const cs = [...new Set(pool)].slice(0, 3);
    const [sp, line, title] = DRILLWHO[kind];
    await say([[sp, line, 'smile']]);
    let right = 0;
    for (const c of cs) {
      const q = D.pickQ(c); if (!q) continue;
      const r = await SD.quiz.ask(q, { title });
      if (r && r.ok) right++;
    }
    R.gainXp(10 + right * 5);
    setFlag(kind === 'relay' ? 'relayrev' : 'rev' + kind);
  }
  async function bunker() {
    if (!flag('xp2')) return say([[null, 'Seymour\'s bunker: a steel dome, a sign that says NO VISITORS, and a slot.'], ['seymour', flag('camp') ? 'Not yet. When you\'ve earned it.' : 'Go away. Politely.', 'neutral']]);
    if (flag('reveal')) return say([['seymour', 'I made copies of everything, every night, for forty years. That one I couldn\'t copy. It was the original.', 'neutral']]);
    mus('c6culprit'); AU.sfx('x-lock');
    await vn([['bg', 'c6-bunker'],
      ['narr', 'Seymour opens his bunker for the first time, to show them the tape, because they\'ve earned it.'],
      ['narr', 'Kagemaru is already inside, sitting on the tape case, white gloves folded. Nobody let him in.'],
      ['show', 'kagemaru', 'neutral', 'right'],
      ['narr', 'He lowers his hood. Under it there\'s nothing: the shadow and the grin, as there always were.'],
      ['show', 'kagemaru', 'ring', 'right'],
      ['narr', 'Then he takes off his left glove, slides a ring off his bare finger, and puts it back on over the white glove: the snake eating its tail. Freya\'s halo. The ring from the man at the desk.'],
      ['kagemaru', 'They stopped praying. I never started.', 'reveal'],
      ['show', 'lead', 'neutral', 'left'],
      ['kagemaru', 'Her Champion, since the day Gary quit. I sat across the desk the night she went through your files. A nurse, a cook, a child and a janitor, against a goddess. I told her you\'d lose.', 'amused'],
      ['kagemaru', 'I only said yes when she promised Uptima would pay. That part sounded fun. That same night I read your prayers myself, to see what I was betting on.', 'amused'],
      ['kagemaru', 'Desperate people. My favourite customers. I backed her because she had a plan, and sold to you because you might win. Every pin was a bet on both.', 'reveal'],
      ['kagemaru', 'My lady asked me to delete this. I didn\'t. I never delete anything I could sell. Ah ha ha.', 'amused'],
      ['narr', 'He takes the tape: Seymour\'s original, the one the party\'s working copies were made from.'],
      ['kagemaru', 'Come and see me at the top of the Mirror Floors. Bring shards.', 'ring'],
      ['hide', 'kagemaru'],
      ['seymour', 'The copies you carry still work. But that one was the original, and I can\'t make it again.', 'neutral'],
      ['narr', 'In the ledger he left on the case: what else is in his vault. Kyu\'s second copy, newer than the tape, made on the night of the vault. Freya has scheduled its KMS key for deletion. The waiting period has days left.']]);
    await ask({ c: 'keydelete', type: 'mc', q: 'Kyu\'s second copy is encrypted under a KMS key that Freya has scheduled for deletion. The waiting period has days left. What is true right now?',
      opts: ['The key can\'t be used, and the deletion can still be cancelled', 'The key material is already gone', 'The key still works until the last day', 'Only AWS Support can stop it'], a: 0,
      why: 'A key pending deletion is unusable (any attempt fails and is recorded in CloudTrail) but intact. Until the waiting period ends, CancelKeyDeletion stops the deletion.',
      eli5: 'The box is on the kerb for the bin lorry. You can\'t open it while it sits there, but you can still carry it back inside.' }, 'TWO COPIES · TEST THEM');
    setFlag('reveal'); R.gainXp(30);
    mus('camp');
  }
  async function freya() {
    mus('freya');
    await vn([['bg', 'c6-camp'],
      ['show', 'freya', 'warm', 'right'],
      ['freya', 'You\'re nearly at the top, my loves. I\'m so proud of you.', 'warm'],
      ['freya', 'Has my Champion been looking after you?', 'smile'],
      ['show', 'lead', 'cold', 'left'],
      ['lead', { mira: 'He has, love. Very closely.', kai: 'Yeah. He\'s been great.', seoyeon: 'Closely.', dutch: 'Every step.' }, 'cold'],
      ['narr', 'She means all of it. She brings nothing this time. She doesn\'t know he kept the tape.']]);
    mus('camp');
    setFlag('freya');
  }
  async function dboard() {
    if (!flag('camp')) return say([[null, 'A board on an easel, blank.']]);
    if (!flag('reveal')) return say([[null, 'The Design Board. Someone has written on it: "Before Kagemaru: draw Twinwater as it should have been built." Not yet.']]);
    if (flag('board')) return say([[null, 'Twinwater, built right: a warm standby, failover with health checks, the data replicated, the backups in another account and locked.']]);
    await G.order(G.DEF.board);
    await ask({ c: 'awsbackup', type: 'mc', q: 'The interviewer taps the locked vault on your board. "The backups are copied to a vault in another account, with Vault Lock in compliance mode, and the cooling-off time is over. Who can delete a recovery point in it before its retention ends?"',
      opts: ['Nobody: not that account\'s admins, not its root user, not AWS', 'That account\'s root user', 'Anyone with backup:DeleteRecoveryPoint', 'The production account\'s admin, since the backups came from there'], a: 0,
      why: 'Once a compliance-mode Vault Lock\'s grace time has passed, the lock is immutable: no user, root included, can delete recovery points before their retention ends, or change the lock.',
      eli5: 'The backups sit in a different house, in a safe on a timer. Nobody in either house has a key that beats the timer.' }, 'DESIGN BOARD · THE INTERVIEWER');
    setFlag('board'); R.gainXp(30);
    await addCard('r6-copy');
  }
  async function fire() {
    if (!flag('camp')) return say([[null, 'A camp fire, banked low.']]);
    return say([[others()[0], rnd(['Sit. The lake can wait one evening.', 'Seymour hasn\'t come out of the bunker all day.', 'Mio says the camp sounds honest. I\'ll take it.']), 'warm']]);
  }
  async function ashgrove() {
    if (!flag('ashgrove')) {
      await say([['ashgrove', 'They tell me the tower has a top. That someone sits in it. That she was kind to my son.', 'stone'],
        ['dutch', 'She was kind to everyone. That was the problem.', 'stone'],
        ['ashgrove', 'Tell me again. Slowly. I have time, now. I find I have nothing else.', 'sad']]);
      return setFlag('ashgrove');
    }
    return say([['ashgrove', rnd(['This stew is terrible. More.', 'Caspian would have liked this camp. He would have hated the food.']), 'stone']]);
  }

  // ---------- The choice, and the end ----------
  async function choice() {
    if (flag('choice')) return say([[null, { vault: 'The vault door is shut. Someone inside is humming.', least: 'Kagemaru\'s stall is open at camp. Every sale goes in the log.', run: 'Kagemaru waves from the camp. He has a very nice new tent.' }[c6().choice]]]);
    await say([['kagemaru', 'There you are. I\'ve switched sides, you know. I expect you\'re wondering what to do with a man who\'ll always switch again.', 'amused']]);
    const ch = await new Promise(res => {
      const b = U.panel(`<p>How do you contain the man who sold you everything? <span class="muted small">${esc(NAME(lead()))} decides alone.</span></p>
        <div class="opts col">
        <button class="opt" data-ch="vault">Lock him in the vault<br><span class="muted small">With Freya's backup, and nothing to sell. Safe, as long as the door holds.</span></button>
        <button class="opt" data-ch="least">Let him into the camp, with least privilege (recommended)<br><span class="muted small">He can open a stall and touch nothing else, and every action he takes is logged.</span></button>
        <button class="opt" data-ch="run">Give him the run of the camp<br><span class="muted small">He's been so helpful.</span></button></div>`, { title: 'KAGEMARU', noClose: true, cls: 'wide' });
      b.querySelectorAll('[data-ch]').forEach(el => el.onclick = () => { AU.sfx('ok'); U.closePanel(); res(el.dataset.ch); });
    });
    c6().choice = ch; S.persist();
    mus('c6mirror');
    await vn([['bg', 'c6-jetty'], ['show', 'kagemaru', 'amused', 'right'], ['show', 'lead', 'cold', 'left'],
      ...({ vault: [['lead', 'In the vault. With her backup. Nothing to sell.', 'cold'], ['kagemaru', 'A locked room, and me in it. How long do you think a door holds? Ah ha ha.', 'amused']],
        least: [['lead', { mira: 'A stall at camp, love. One stall. Every sale logged. Touch anything else and we\'ll know.', other: 'A stall at camp. Nothing else. Every action logged.' }, 'cold'], ['kagemaru', 'Trust nothing, verify everything. How grown up. I may even enjoy it.', 'neutral']],
        run: [['lead', 'Come to camp. Help where you like.', 'neutral'], ['kagemaru', 'Oh, I will.', 'amused']] }[ch]),
      ['bg', 'c6-lake'], ['show', 'uptima', 'neutral', 'center'],
      ['narr', 'That night Uptima searches the backlog for his prayer. Every message in ten thousand years. Every lead\'s prayer has been in it.'],
      ['narr', 'There isn\'t one from Kagemaru. He has never asked anyone for anything. He buys it.'],
      ['kagemaru', 'I told you. I never started. Ah ha ha.', 'amused']]);
    setFlag('choice');
    mus('c6sad'); AU.sfx('x-bell');
    await vn([['bg', 'c6-freed'],
      ['narr', 'The Mirror Floors freed. The twins stop answering each other.'],
      ['narr', 'On both shores, people are suddenly alone, and a few of them cry for the first time in forty years. Then they come down to the camp.'],
      ['narr', 'The relay station opens. Mio sits at the front, with her ear to the counter.'],
      ['show', 'mio', 'smile', 'center'], ['mio', 'They\'re all honest now. It\'s really loud.', 'smile']]);
    setFlag('freed');
    c6().f.done = true; S.persist();
    R.gainXp(60);
    await addCard('r6-stone', 'A GIFT FROM TWINWATER');
    return endCard();
  }
  function endCard() {
    W.halt();
    const next = SD.chapterStart && SD.chapterStart[7];
    AU.music('title');
    U.stage(null);
    const sv = S.save, ch = { vault: 'locked in the vault', least: 'at camp, with least privilege', run: 'at camp, with the run of it' }[c6().choice] || 'still on the jetty';
    const b = U.panel(`<div id="c6-end"><p><b>The Mirror Floors are free.</b> Kagemaru is ${esc(ch)}, and Seymour's tape is yours for as long as you keep winning.</p>
      <p class="muted small">Level ${sv.level} · ${w().pages.length} of 8 Lost Reflections · ${w().cards.length} cards learned on the floors</p>
      <p><b>To be continued: Chapter 7: Root</b></p>
      <div class="opts col">
      ${next ? '<button class="primary" id="c6-next">Continue to Chapter 7</button>' : ''}
      <button class="ghost" id="c6-walk">Keep walking the floors</button></div></div>`, { title: 'CHAPTER 6 · THE MIRROR FLOORS', noClose: true });
    const n = b.querySelector('#c6-next'); if (n) n.onclick = () => { U.closePanel(); SD.chapterStart[7](); };
    b.querySelector('#c6-walk').onclick = () => { U.closePanel(); sc = null; W.enter(); };
  }

  // ---------- Pages and people ----------
  async function page(i) {
    if (!pageHere(i)) return;
    const [, , c, text] = PAGES[i];
    w().pages.push(i); S.persist();
    AU.sfx('x-chime');
    await say([[null, `A Lost Reflection: a pebble that still has a reflection when nothing else does. ${text}`]]);
    // Half the pebbles ask about this chapter, half about whatever older lesson is due.
    const q = c ? D.pickQ(c) : olderQ();
    if (q) { const r = await SD.quiz.ask(q, { title: 'A LOST REFLECTION' }); R.gainXp(r && r.ok ? 15 : 5); }
    if (w().pages.length === PAGES.length) { await U.system('ALL EIGHT REFLECTIONS', 'Every Lost Reflection in Twinwater. +50 XP.', 'gold'); R.gainXp(50); }
  }
  function door(d) {
    if (busy) return;
    if (d === 'down') return act(async () => { AU.sfx('x-lift'); goTo(15, 27); if (!flag('xp1')) await say([[null, 'The lift creaks down to the Free Cloud\'s camp, at the tower\'s foot.']]); });
    if (d === 'up') return act(async () => { AU.sfx('x-lift'); goTo(19, 38); });
    const n = { xp1: 1, xp2: 2, xp3: 3 }[d];
    if (n) return act(() => xpDoor(n));
  }
  function talk(id) {
    if (busy) return;
    if (sc.actors[id] && !sc.actors[id].thing) { const a = sc.actors[id], P = sc.P; a.face = Math.abs(P.x - a.x) >= Math.abs(P.y - a.y) ? (P.x > a.x ? 'east' : 'west') : (P.y > a.y ? 'south' : 'north'); }
    if (GATES[id]) return act(() => gate(id));
    if (/^page\d$/.test(id)) return act(() => page(+id.slice(4)));
    if (/^f?twin\d$/.test(id)) return act(() => villager(id));
    const fns = { notice, booth: receipt, chad: receipt, stall, kage: stall, kageJ: choice, mio: mioEar, mirror, bunker, shop: aigerim, aigerim, relay, mioC: relay, ship, dboard, fire, freya, ashgrove,
      wen: () => (flag('receipt') ? review('receipt') : say([['wen', flag('camp') ? 'Sit, dear. Chad\'s booth is on the near shore. Bring me his invoice when you\'re ready; I\'ll show you what\'s wrong with it.' : 'Sit, dear.', 'smile']])) };
    if (T.order.includes(id)) return act(() => say([[id, rnd({ mira: ['Eat something first, love. Then the lake.', 'My reflection looked so tidy. I hated it.'], kai: ['Two of every bakery and not one decent loaf.', 'Hana would\'ve thrown a stone in the lake. Just to see.'], seoyeon: ['Nobody here has ever been alone. I don\'t envy them.', '...'], dutch: ['Every copy is in the same account. One set of hands.', 'Two of everything. Count the owners.'] }[id])]]));
    if (fns[id]) return act(fns[id]);
  }

  // ---------- The objective, and where the arrow points ----------
  // [what to do, [x, y], the actor with the "!"]
  function step() {
    const f = flag;
    if (!f('offer')) return ['Walk out onto the jetty', [40, 24], null];
    if (!f('stall')) return ['Someone has a stall at the end of the jetty', [42, 16], 'kage'];
    if (!f('mio')) return ['A girl on the jetty is listening to something', [43, 18], 'mio'];
    if (!f('mirror1')) return ['Look into the still water at the jetty\'s end', [38, 15], 'mirror'];
    if (!f('route')) return ['The signpost gate, east along the near shore', [54, 40], 'groute'];
    if (!f('xp1')) return ['Expedition I: the Twin Stairs, past the signpost', [58, 39], null];
    if (!f('camp')) return ['Take the lift down to camp (west end of the near shore)', [19, 38], null];
    if (!f('ship')) return ['Ship It: one stack to both shores, at camp', [7, 24], 'ship'];
    if (!f('diary')) return ['Aigerim\'s diary, at her card tent', [9, 25], 'aigerim'];
    if (!f('heartbeat')) return ['Mio\'s heartbeats, at the relay station', [5, 34], 'mioC'];
    if (!f('receipt')) return ['Chad\'s receipt, at his booth on the near shore', [35, 38], 'chad'];
    if (!f('lake')) return ['The causeway gate to the far shore', [60, 30], 'glake'];
    if (!f('xp2')) return ['Expedition II: the Relay, on the far shore', [55, 3], null];
    if (!f('reveal')) return ['Seymour is opening his bunker, at camp', [3, 23], 'bunker'];
    if (!f('freya')) return ['Someone is waiting at camp', [11, 32], 'freya'];
    if (!f('board')) return ['Draw Twinwater, built right, on the Design Board', [14, 25], 'dboard'];
    if (!f('lock')) return ['The Lock Room\'s door, on the far shore', [34, 7], 'glock'];
    if (!f('xp3')) return ['Expedition III: the Vault', [23, 3], null];
    if (!f('choice')) return ['Kagemaru is waiting on the jetty', [41, 19], 'kageJ'];
    return ['The Mirror Floors are free. Lost Reflections: ' + w().pages.length + ' of 8', null, null];
  }

  // ---------- HUD ----------
  function hud() {
    const el = $('#w-hud'); if (!el || !W.active) return;
    const sv = S.save, need = S.xpFor(sv.level), l = T.leads[lead()];
    el.innerHTML = `<span class="hud-chip"><b>${esc(l.name.split(' ')[0])}</b> · Lv ${sv.level}</span>
      <div class="bar xp w-xp" title="XP"><i style="width:${Math.min(100, sv.xp / need * 100)}%"></i></div>
      <span class="hud-chip w-goal">${esc(step()[0])}</span>
      <span class="hud-chip" title="Lost Reflections">◐ ${w().pages.length}/8</span>
      <span class="w-sp"></span>
      <button class="ghost" id="w-codex" aria-label="Cheat sheet" title="Cheat sheet">📖</button>
      <button class="ghost" id="w-snd" aria-label="Sound on or off">${AU.muted() ? '🔇' : '🔊'}</button>
      <button class="ghost" id="w-menu" aria-label="Menu">☰</button>`;
    $('#w-codex').onclick = () => U.codex();
    $('#w-snd').onclick = e => { AU.toggleAll(); e.currentTarget.textContent = AU.muted() ? '🔇' : '🔊'; };
    $('#w-menu').onclick = () => SD.main.menu();
  }
  const ch1Hud = SD.ch1.hud;
  SD.ch1.hud = () => (W.active ? hud() : ch1Hud());

  // The floors' card rewards are this chapter's own, while one of its expeditions is on.
  if (SD.champions && SD.champions.rewards) {
    const rewards = SD.champions.rewards;
    SD.champions.rewards = champ => (W.set ? D.CARDS[W.set].slice() : rewards(champ));
  }

  // ---------- Entering and leaving ----------
  W.enter = function () {
    W.on = true;
    SD.ch1.halt();
    ['c2world', 'c3world', 'c4world', 'c5world'].forEach(k => { if (SD[k] && SD[k].halt && SD[k] !== W) SD[k].halt(); });
    SD.ch1.dress();
    SD.main.show('world');
    $('#w-canvas').setAttribute('aria-label', 'Twinwater on floor 81: the near shore, the jetty over the mirror lake, the far shore, and the camp');
    if (!sc) makeScene(); else applyState();
    zone = null; lastTile = ''; trail.length = 0;
    W.active = true;
    sc.start();
    hud();
    if (!flag('hinted')) { setFlag('hinted'); U.system('HOW TO MOVE', 'Arrow keys or WASD to walk, E or Enter to talk, or tap where you want to go. The yellow arrow points at your next step. Gates open when you understand them.'); }
  };
  W.halt = function () { W.active = false; if (sc) { sc.stop(); sc.locked = false; } };
  // A fresh save (the chapter select's Start, the menu's Erase save): stop this scene for good, even mid-scene.
  W.reset = function () { W.halt(); sc = null; busy = false; };
  // The chapter's start, from another chapter's end card or this demo's title.
  W.start = async function () {
    W.on = true;
    SD.ch1.halt(); U.closePanel(); U.stage(null);
    if (!S.save.c1 || !S.save.c1.lead) return W.newGame();
    c6(); S.persist();
    if (c6().f.done) return endCard();
    sc = null;
    if (!flag('cold')) await coldOpen();
    W.enter();
  };
  SD.chapterStart = SD.chapterStart || {};
  SD.chapterStart[6] = () => W.start();

  // ---------- The chapter 6 demo's own start ----------
  // Assumed, as if chapters 1 to 5 were played: level 20 at least, chapter 1's starter deck, and the earlier
  // chapters' concepts already on the cheat sheet.
  W.newGame = async function () {
    const id = await SD.ch1.choose();
    const sv = S.save;
    sv.c1 = { lead: id, f: { intro: true, cart: true, brief: true, done: true }, deck: SD.starterDeck.map(x => ({ id: x, up: false })), pos: null };
    sv.c6 = null;
    sv.name = T.leads[id].name.split(' ')[0];
    sv.flags.prologue = true; sv.flags.ch1 = true;
    if ((sv.level || 1) < 20) { sv.level = 20; sv.xp = 0; }
    Object.keys(SD.concepts).forEach(c => { if (SD.concepts[c].zone < 6) S.seeConcept(c); });
    S.persist();
    sc = null;
    return W.start();
  };
  if (CH6) {
    const boot = () => {
      const M = SD.main, title = M.title;
      M.title = function () {
        title();
        const box = $('#title-actions'), sv = S.save;
        if (!box || box.querySelector('#t-start')) return;
        const has = !!(sv.c1 && sv.c1.lead && sv.c6);
        box.innerHTML = (has ? `<button class="primary" id="t-c6go">Continue · ${esc(T.leads[sv.c1.lead].name)}</button><button class="ghost" id="t-c6new">New game</button>` : '<button class="primary" id="t-c6new">Play Chapter 6: The Mirror Floors</button>') + '<button class="ghost" id="t-help">How to play</button>';
        const h = $('#t-help');
        if (h) h.onclick = () => U.panel('<p>Walk with the arrow keys or WASD, or tap where you want to go. Tap someone, or press E, to talk. Gates open when you understand them: each one is a small puzzle.</p><p>The expeditions are raids: play cards to fix incidents, with the other three as your party.</p>', { title: 'HOW TO PLAY' });
        if (has) $('#t-c6go').onclick = () => W.start();
        $('#t-c6new').onclick = () => {
          if (!has) return W.newGame();
          const c = U.panel('<p>Start chapter 6 again from the cold open? Your level and cheat sheet stay.</p><div class="row"><button class="primary" id="n-y">Start again</button><button class="ghost" id="n-n">Cancel</button></div>', { title: 'NEW GAME' });
          c.querySelector('#n-y').onclick = () => { U.closePanel(); S.save.c6 = null; S.persist(); sc = null; W.newGame(); };
          c.querySelector('#n-n').onclick = U.closePanel;
        };
      };
      const foot = $('.t-foot'); if (foot) foot.textContent = 'Chapter 6 demo: The Mirror Floors · Built on the AWS documentation · Saves automatically';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { boot(); SD.main.title(); }, 0), { once: true });
  }

  // For tools/c6_check.js and tools/c6_balance.js.
  W.debug = { expedition: xp => expedition(xp), after: (xp, won) => after(xp, won), busy: () => busy, flags: f => { Object.assign(w().x, f); S.persist(); if (sc) applyState(); }, flag, place: (x, y) => sc && goTo(x, y), scene: () => sc, step, act, w, c6, GATES, PAGES, endCard, BASE };
})();
