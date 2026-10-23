// Chapter 4, the Sealed Floors (floors 41 to 60): the explorable chapter, from the cold open to the end card.
// One map, six places:
//   Floor 41, the Alliance's town   the seal-house (Freya's offer), the succession hall, Madam Ok's tea house, the lift
//   The Free Cloud's camp           down the lift, at the tower's foot: Ship It, Lexi's library, the Design Board, Forms
//   The Gate Passes (north)         a security group gate, a network ACL gate, Rule 100's nook, Expedition I
//   The Hidden Valley (north-east)  past the rockfall once Expedition I is cleared: the Sealed Archive, and Lexi
//   The Ruins of Burning Peak (east) Ryu's Seal opens the gate; the yard gate's policy, a side door, Expedition II
//   Namgung's House (south)         Let Me Choose at the gate, the key-policy gate, the study, the records room,
//                                   the guards, Expedition III
// Knowledge opens the way: each gate is a minigame (js/c4-games.js), and a gate you've understood stays open. Eight
// pages of Jin's forms lie about as collectibles, each with a quick recall question (some on earlier chapters). The
// expeditions are raid-engine dungeons (js/raid.js, data in js/c4-data.js) played solo with the other three as bots,
// with two of Seymour's Tapes. Old Gu's letter and the confrontation play from cues in the floors' intros.
// Plays standalone with window.SD_CH = 4 or ?vector&ch4; SD.chapterStart[4] starts it from another chapter, and the
// end card hands over to SD.chapterStart[5] when that's loaded. Saves in S.save.c4.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const CH4 = String(window.SD_CH) === '4' || /[?&]ch4\b/.test(location.search);
  const W = SD.c4world = { on: false, active: false };
  const U = SD.ui, S = SD.state, AU = SD.audio, R = SD.run, T = SD.ch1story, A = SD.c4art, G = SD.c4games, D = SD.c4data;
  const $ = U.$, esc = s => U.esc(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const rnd = a => a[Math.floor(Math.random() * a.length)];

  // ---------- Save ----------
  const c4 = () => S.save.c4 || (S.save.c4 = { f: {}, w: { x: {}, pos: null, pages: [], cards: [], miss: [] }, choice: null });
  const w = () => c4().w;
  const c1 = () => S.save.c1 || {};
  const flag = k => !!w().x[k];
  const setFlag = k => { w().x[k] = true; S.persist(); };
  const lead = () => c1().lead || 'seoyeon';
  const others = () => T.order.filter(id => id !== lead());
  // Music: this chapter's own songs once they're loaded (js/audio-chapters.js), else the nearest older one.
  const FB = { c4town: 'town', c4explore: 'explore', c4dungeon: 'map4', c4boss: 'boss', c4culprit: 'boss', c4sad: 'kyusad', c4peak: 'story' };
  const mus = k => AU.music(AU.has && AU.has(k) ? k : (FB[k] || k));

  // Lines: [who, text, face]. who 'lead' is you; text can be { seoyeon: ..., other: ... } for the lead's own words.
  const pick = t => (t && typeof t === 'object' ? (t[lead()] || t.other) : t);
  const L = lines => lines.map(([s, t, e]) => ({ s: s === 'lead' ? lead() : s || 'narr', t: pick(t), e }));
  const say = lines => U.dialog(L(lines));
  // A visual-novel scene, with the same 'lead' and per-lead text. The chapter's scenes are named with cut.def, for the
  // cutscene viewer (js/reel.js), and played with cut.play.
  const cut = SD.reel.chapter('4', { music: k => mus(k) });
  const vn = steps => steps.map(s => {
    if (!Array.isArray(s)) return s;
    if (s[0] === 'show' || s[0] === 'hide') return [s[0], s[1] === 'lead' ? lead() : s[1]].concat(s.slice(2));
    if (['bg', 'cg', 'fx', 'wait', 'narr'].includes(s[0])) return s[0] === 'narr' ? ['narr', pick(s[1])] : s;
    return [s[0] === 'lead' ? lead() : s[0], pick(s[1]), s[2]];
  });

  // ---------- The map ----------
  const MW = 72, MH = 54;
  // [x0, y0, x1, y1, id, banner, music, ambience, ground]
  const ZONES = [
    [22, 1, 46, 15, 'pass', 'The Gate Passes', 'c4explore', 'leaves', '.'],
    [50, 1, 70, 15, 'valley', 'The Hidden Valley', 'c4explore', 'leaves', '.'],
    [22, 17, 46, 35, 'town', 'Floor 41 · The Alliance\'s town', 'c4town', 'birds', 'c'],
    [1, 19, 18, 34, 'camp', 'The Free Cloud\'s camp', 'camp', 'crickets', 'g'],
    [50, 17, 70, 35, 'ruins', 'The Ruins of Burning Peak', 'c4peak', 'fire', 'a'],
    [22, 37, 46, 52, 'house', 'Namgung\'s House', 'c4explore', 'birds', 'g']
  ];
  const ROCKZ = [0, 0, 0, 0, 'rock', '', null, null, '.'];
  const zoneAt = (x, y) => ZONES.find(z => x >= z[0] && x <= z[2] && y >= z[1] && y <= z[3]) || ROCKZ;
  const PROPS = [], PROP = {};
  const BASE = (function build() {
    const m = Array.from({ length: MH }, () => Array(MW).fill('T'));
    const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m[y][x] = c; };
    const set = (x, y, c) => { m[y][x] = c; };
    ZONES.forEach(z => fill(z[0], z[1], z[2], z[3], z[8]));
    // Paths.
    fill(33, 1, 33, 15, ','); fill(47, 5, 59, 5, ','); fill(59, 5, 59, 10, ','); fill(59, 10, 70, 10, ',');
    fill(47, 26, 66, 26, ','); fill(66, 25, 66, 26, ','); fill(33, 37, 33, 52, ','); fill(30, 45, 33, 45, ','); fill(30, 45, 30, 49, ','); fill(30, 49, 33, 49, ',');
    fill(2, 27, 17, 27, ','); fill(40, 45, 40, 46, ',');
    // The town's flowers and the house's garden.
    [[31, 33], [32, 33], [44, 25], [23, 21], [45, 34]].forEach(([x, y]) => set(x, y, 'f'));
    fill(24, 39, 30, 41, 'f'); fill(36, 39, 44, 41, 'f'); fill(2, 32, 6, 33, 'f');
    // The pass: the NACL wall with its gate, Rule 100's nook, and the rockfall into the valley.
    fill(22, 9, 46, 9, 'T'); set(33, 9, 'G');
    fill(39, 10, 39, 15, 'T'); set(39, 12, 'G');
    fill(47, 5, 49, 5, 'X'); set(47, 5, ','); set(49, 5, ',');
    // Pines and boulders.
    [[26, 6], [29, 12], [42, 5], [37, 13], [24, 11], [44, 2], [27, 3], [53, 12], [56, 3], [68, 4], [62, 13], [52, 8]].forEach(([x, y]) => set(x, y, 'T'));
    // The valley's river and bridge.
    fill(66, 1, 66, 15, 'r'); set(66, 10, 'b');
    // The town's gates: north (a security group), east (the ruins, sealed), south (the house).
    set(33, 16, 'G'); fill(47, 26, 49, 26, ','); set(48, 26, 'G'); set(33, 36, 'G');
    // The ruins: the yard wall and its gate, the side room and its door.
    fill(57, 17, 57, 35, 'T'); set(57, 26, 'G'); fill(50, 30, 56, 30, 'T'); set(53, 30, 'G');
    [[52, 20], [54, 22], [52, 24], [61, 31], [64, 29], [68, 30]].forEach(([x, y]) => set(x, y, 'T'));
    // The house: hedges, the inner wall and its key gate, the records room.
    fill(22, 44, 46, 44, 'T'); set(33, 44, 'G'); fill(29, 45, 29, 52, 'T'); set(29, 50, 'G');
    [[31, 38], [35, 38], [31, 42], [35, 42], [44, 47], [44, 51], [37, 51]].forEach(([x, y]) => set(x, y, 'T'));
    // Doors: the lift (town L, camp M) and the three raid gates.
    set(23, 27, 'L'); set(17, 27, 'M');
    const prop = (id, kind, x, y, wd, h, more, solid) => {
      const p = Object.assign({ id, kind, x, y, w: wd, h }, more);
      PROPS.push(p); PROP[id] = p;
      if (solid !== false) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + wd; xx++) if (m[yy][xx] !== 'G') m[yy][xx] = '#';
      return p;
    };
    // Town.
    prop('sealhouse', 'sealhouse', 24, 18, 6, 3);
    prop('hall', 'succhall', 37, 18, 8, 4);
    prop('tea', 'teahouse', 38, 29, 6, 3);
    prop('home', 'hanok', 24, 30, 5, 3, { sealed: true });
    prop('home2', 'hanok', 28, 22, 4, 2, { sealed: true, roof: '#4a3a5a' });
    prop('notice', 'board', 29, 26, 1, 1);
    prop('banner', 'banner', 35, 27, 1, 1, { col: '#e8e4dc' });
    prop('liftT', 'lift', 23, 26, 1, 1);
    prop('lampT1', 'lamp', 32, 24, 1, 1); prop('lampT2', 'lamp', 36, 31, 1, 1);
    prop('plumT', 'plum', 45, 22, 1, 1);
    // Camp.
    prop('liftC', 'lift', 17, 26, 1, 1);
    prop('fire', 'campfire', 9, 28, 1, 1, { lit: true });
    prop('tent1', 'tent', 12, 21, 2, 2); prop('tent2', 'tent', 13, 30, 2, 2); prop('tent3', 'tent', 3, 29, 2, 2);
    prop('library', 'library', 2, 20, 5, 3);
    prop('ship', 'desk', 8, 22, 1, 1);
    prop('dboard', 'board', 15, 24, 1, 1);
    prop('seat1', 'seat', 7, 29, 1, 1, null, false); prop('seat2', 'seat', 11, 29, 1, 1, null, false);
    prop('plumC', 'plum', 2, 25, 1, 1);
    // The passes and the valley.
    prop('xp1', 'raidgate', 32, 1, 4, 2, { label: 'EXP. I', open: true });
    prop('vault', 'vault', 58, 2, 4, 3);
    // The ruins.
    prop('burned', 'burned', 60, 18, 6, 4);
    prop('xp2', 'raidgate', 65, 24, 4, 2, { label: 'EXP. II', open: true });
    prop('post1', 'yardpost', 51, 22, 1, 1); prop('post2', 'yardpost', 54, 19, 1, 1);
    // The house.
    prop('nghouse', 'namgung', 37, 46, 6, 3);
    prop('study', 'desk', 40, 49, 1, 1);
    prop('knife', 'knife', 41, 49, 1, 1);
    prop('xp3', 'raidgate', 32, 47, 4, 2, { label: 'EXP. III', open: true });
    prop('ledger', 'ledger', 23, 46, 1, 1);
    prop('plumH1', 'plum', 25, 42, 1, 1); prop('plumH2', 'plum', 43, 42, 1, 1);
    // The raid gates' mouths are doors.
    m[2][33] = '1'; m[2][34] = '1'; m[25][66] = '2'; m[25][67] = '2'; m[48][33] = '3'; m[48][34] = '3';
    return m.map(r => r.join(''));
  })();
  // The knowledge gates: id -> [x, y, label, colour, game].
  const GATES = { gsg: [33, 16, 'SG', '#2c6a8a', 'sg'], gnacl: [33, 9, 'NACL', '#6a4a8a', 'nacl'], g100: [39, 12, 'RULE 100', '#8a4a4a', 'order100'],
    gruins: [48, 26, 'SEALED', '#8d1d29', null], gyard: [57, 26, 'IAM', '#6a5a3a', 'policy'], gside: [53, 30, 'POLICY', '#8a6a3a', 'respol'],
    ghouse: [33, 36, 'NAMGUNG', '#1a2440', null], gkey: [33, 44, 'KMS', '#2c3a5a', 'keydoor'], gsse: [29, 50, 'SSE', '#3a5a6a', 'sse'] };
  Object.keys(GATES).forEach(id => { const [x, y, label, col] = GATES[id]; PROPS.push(PROP[id] = { id, kind: 'kgate', x, y, w: 1, h: 1, label, col }); });
  // Pages of Jin's forms: [x, y, concept for its recall question, what's on the page].
  const PAGES = [[44, 13, 'sgnacl', 'Form 1, the Closed Gate. In the margin, in a fourteen-year-old\'s hand: "Do it badly, Minnow. Then do it again."'],
    [24, 4, null, 'Form 2, Snow on the Pass. A stick figure falling over, labelled JIN.'],
    [69, 12, 'subnets', 'Form 3, the River Road. "Feet first. The rest of you follows."'],
    [45, 33, null, 'Form 4, the Tea House Step. "Old Gu says this one\'s for running away. He would know."'],
    [3, 33, 'endpoints', 'Form 5, the Back Door. A small drawing of a fish. "Minnow."'],
    [52, 34, 'iampol', 'Form 6, Allowed Twice. "Ask the master AND the gate."'],
    [69, 34, null, 'Form 7, Ash on the Sleeve. Scorched at one corner.'],
    [24, 51, 'kmsenv', 'Form 8, the Sealed Hand. The last page. "Up, Minnow. Forms."']];
  const pageHere = i => !w().pages.includes(i);

  // ---------- The scene ----------
  let sc = null, busy = false, zone = null, lastTile = '';

  // ---------- Weather ----------
  // By zone (js/weather.js): snow through the Gate Passes and the Hidden Valley, small flakes far off and big ones
  // close; over the Ruins of Burning Peak, a warm smoky air, ash sifting down and sparks rising through it; and
  // embers off the camp's fire. The passes' cold wind is what you hear (js/audio.js SKY); the Peak's fire is its own place sound.
  const WX = SD.wx;
  const zk = () => (zone ? zone[4] : null);
  function weather(stage) {
    const z = zk(), snow = WX.ease('c4snow', z === 'pass' || z === 'valley' ? 1 : 0), ash = WX.ease('c4ash', z === 'ruins' ? 1 : 0);
    if (stage === 0) { WX.wash('source-over', 'rgb(226,234,250)', 0.08 * snow); WX.wash('source-over', 'rgb(150,70,40)', 0.07 * ash); return; }
    WX.embers(9.5, 28.5, 1, 12);
    WX.snow(snow);
    WX.fog(ash * 0.5, '168,156,156');
    WX.ash(ash);
  }

  const trail = [];
  const solidNow = () => 'TG#XrV';
  function phase() {
    if (!flag('arrive')) return 'dawn';
    if (flag('bow') && !flag('choice')) return 'night';
    if (flag('choice')) return 'dawn';
    if (flag('echo') && !flag('freya')) return 'dusk';
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
  const SEAL = { o: { seal: true } };

  function makeScene() {
    const map = BASE.slice();
    const lights = () => {
      const l = [[9.5, 28.5, 3, '255,140,60', 1], [32.5, 24.2, 1.6, '255,200,120', 0], [36.5, 31.2, 1.6, '255,200,120', 0], [41, 30.4, 2, '255,200,120', 0]];
      if (flag('lexi')) l.push([4.5, 21.5, 2, '200,160,255', 0]);
      PAGES.forEach(([x, y], i) => { if (pageHere(i)) l.push([x + 0.5, y + 0.5, 1, '255,230,150', 1]); });
      return l;
    };
    const def = {
      map, solid: solidNow(), doors: { L: 'down', M: 'up', 1: 'xp1', 2: 'xp2', 3: 'xp3' }, ground: false, bg: '#141226', clock: false,
      grade: (ctx, t, vw, vh, cx, cy, ts) => { if (WX) WX.at(ctx, t, vw, vh, cx, cy, ts, sc.P && sc.P.px, sc.P && sc.P.py); A.grade(ctx, t, vw, vh, cx, cy, ts, phase(), lights(), WX && weather); },
      ambience: () => (zone ? zone[7] : null),
      under(ctx, ts, t, x0, x1, y0, y1) {
        for (let y = Math.max(0, y0); y <= Math.min(y1, MH - 1); y++) for (let x = Math.max(0, x0); x <= Math.min(x1, MW - 1); x++) {
          const c = groundCh(map, x, y), z = zoneAt(x, y);
          const base = 'T#X'.includes(c) ? z[8] : 'GLM123'.includes(c) ? ',' : c;
          A.ground(ctx, base, x, y, ts, t, (dx, dy) => { const n = groundCh(map, x + dx, y + dy); return /[123]/.test(n) ? ',' : n === '#' ? z[8] : n; }, z[4]);
        }
      },
      rowDraw(ctx, y, ts, t, x0, x1) {
        if (y < 0 || y >= MH) return;
        for (let x = Math.max(0, x0); x < Math.min(x1, MW); x++) {
          const c = map[y][x];
          if (c === 'T') A.wall(ctx, x, y, ts, t, zoneAt(x, y)[4]);
          else if (c === 'X') A.prop(ctx, { kind: 'rock', x, y, w: 1, h: 1 }, ts, t);
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
    const pos = w().pos || [24, 28];
    const P = sc.player(pos[0], pos[1], 'east');
    P.draw = (ctx, fx, fy, ts, t) => A.person(ctx, lead(), fx, fy, ts, t, P.face, P.moving, { seal: true });
    others().forEach((id, i) => { person(id, id, pos[0] - 1 - i, pos[1], 'east', { solid: false, talk: false, o: { seal: true } }); });
    // The town.
    thing('sealhouse', 27, 20, 'The seal-house'); thing('hall', 40, 21, 'The succession hall'); thing('tea', 40, 31, 'The tea house');
    thing('home', 26, 32, 'A sealed family book'); thing('notice', 29, 26, 'The notice board'); thing('banner', 35, 27, 'Burning Peak\'s banner pole'); thing('home2', 30, 23, 'A sealed door');
    person('baek', 'master1', 36, 24, 'west', Object.assign({ name: 'Master Baek' }, SEAL));
    person('seol', 'master2', 27, 34, 'north', Object.assign({ name: 'Master Seol' }, SEAL));
    person('tw', 'townswoman', 30, 27, 'west', Object.assign({ name: 'A townswoman' }, SEAL));
    person('tm', 'townsman', 37, 33, 'north', Object.assign({ name: 'A townsman' }, SEAL));
    person('cultist', 'cultist', 44, 33, 'west', Object.assign({ name: 'A Cult disciple' }, SEAL));
    person('ok', 'ok', 42, 32, 'south', Object.assign({ name: 'Madam Ok' }, SEAL));
    person('namgung', 'namgung', 39, 22, 'south', Object.assign({ name: 'Namgung Hyeon' }, SEAL));
    person('ryu', 'ryu', 43, 22, 'south', Object.assign({ name: 'Namgung Ryu' }, SEAL));
    // The camp.
    thing('library', 4, 22, 'Lexi\'s library'); thing('ship', 8, 22, 'Ship It'); thing('dboard', 15, 24, 'The Design Board'); thing('fire', 9, 28, 'Forms at the fire');
    person('lexi', 'lexi', 5, 24, 'south', { name: 'Lexi' });
    person('freya', 'freya', 11, 31, 'west', { name: 'Freya' });
    person('ryuC', 'ryu', 7, 31, 'east', Object.assign({ name: 'Namgung Ryu' }, SEAL));
    // The passes, the valley, the ruins, the house.
    thing('vault', 59, 4, 'The Sealed Archive');
    thing('study', 40, 49, 'Namgung\'s study'); thing('knife', 41, 49, 'The knife'); thing('ledger', 23, 46, 'A ledger');
    person('guard', 'steward', 36, 49, 'west', Object.assign({ name: 'Namgung\'s guards' }, SEAL));
    Object.keys(GATES).forEach(id => thing(id, GATES[id][0], GATES[id][1], 'A gate: ' + GATES[id][2]));
    PAGES.forEach(([x, y], i) => sc.addActor('page' + i, { x, y, thing: true, solid: false, draw: () => {} }));
    sc.addActor('ctl', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {}, tick });
    sc.onTalk = id => talk(id);
    sc.onDoor = d => door(d);
    applyState();
  }

  function setTile(x, y, c) { const m = sc.def.map; m[y] = m[y].slice(0, x) + c + m[y].slice(x + 1); }
  const gateOpen = id => ({ gsg: 'sg', gnacl: 'nacl', g100: 'order100', gruins: 'gruins', gyard: 'policy', gside: 'respol', ghouse: 'letme', gkey: 'keydoor', gsse: 'sse' })[id];
  function applyState() {
    const A2 = sc.actors;
    Object.keys(GATES).forEach(id => {
      const open = flag(gateOpen(id)), [x, y] = GATES[id];
      PROP[id].open = open; A2[id].hidden = open;
      setTile(x, y, open ? ',' : 'G');
    });
    if (flag('xp1')) setTile(48, 5, ',');
    PROP.sealhouse.open = flag('freed'); PROP.home.sealed = PROP.home2.sealed = !flag('freed');
    PROP.vault.open = flag('lexi');
    A2.vault.hidden = flag('lexi');
    A2.lexi.hidden = !flag('lexi');
    A2.freya.hidden = !(flag('echo') && !flag('freya'));
    A2.ryu.hidden = flag('ryu1');
    A2.namgung.hidden = flag('xp3');
    A2.ryuC.hidden = !flag('choice');
    A2.guard.hidden = flag('edge');
    PAGES.forEach((p, i) => { A2['page' + i].hidden = !pageHere(i); });
    refresh();
  }
  // The "!" over whoever or whatever has something for you.
  function refresh() {
    if (!sc) return;
    const A2 = sc.actors, tg = step()[2];
    Object.values(A2).forEach(a => { if (a.id !== 'ctl' && a.id !== 'you') a.marker = a.id === tg; });
    const names = { sealhouse: 'The seal-house', hall: 'The succession hall', tea: 'The tea house', library: 'Lexi\'s library', ship: 'Ship It', dboard: 'The Design Board', vault: 'The Sealed Archive', banner: 'The banner pole', study: 'The study', knife: null, fire: 'Forms' };
    Object.keys(names).forEach(id => { if (A2[id]) A2[id].name = A2[id].marker || ['library', 'fire', 'ship', 'dboard'].includes(id) ? names[id] : null; });
    Object.keys(GATES).forEach(id => { A2[id].name = A2[id].marker ? GATES[id][2] : null; });
    hud();
  }

  // ---------- Every frame ----------
  function tick() {
    const P = sc.P; if (!P) return;
    AU.weather(zk() === 'pass' || zk() === 'valley' ? 'snow' : null);
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
        if (z[4] === 'pass') setFlag('pass');
        if (z[4] === 'ruins') setFlag('ruins');
        if (z[4] === 'house') setFlag('house');
      }
    }
    others().forEach((id, i) => {
      const a = sc.actors[id], to = trail[i];
      if (!to || a.scripted || a.moving || a.path.length) return;
      if (a.x !== to[0] || a.y !== to[1]) { a.speed = 7.5; a.path = [to]; }
    });
    if (busy || P.moving || P.path.length) return;
    if (!flag('arrive')) return act(arrive);
    if (flag('lexi') && !flag('camp') && zoneAt(P.x, P.y)[4] === 'camp') return act(campArrive);
    if (flag('bow') && !flag('hand')) return act(otherHand);
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

  // ---------- The story: act 1 ----------
  cut.def('cold', 'Burning Peak, years ago', () => vn([['bg', 'c4-dawn'],
    ['narr', 'Burning Peak, years ago. Dawn, and a memory the seals haven\'t reached. Seo-yeon is nine, and she has Jin by the ankle.'],
    ['show', 'seoyeon', 'neutral', 'left'],
    ['seoyeon', 'Get up. Forms.', 'neutral'],
    ['show', 'jin', 'smirk', 'right'],
    ['jin', 'Five more minutes, Minnow. Old Gu taught me a new word last night. Want to hear it?', 'smirk'],
    ['narr', 'Old Gu, still drunk on the yard steps, laughs at the word. Jin does the forms badly on purpose until she laughs too.'],
    ['narr', 'Far below, smoke on the road. Nothing else.'],
    ['fx', 'black']]), { music: 'c4peak', note: 'Seo-yeon at nine, and Jin, and Old Gu.' });
  async function coldOpen() {
    U.closePanel(); U.stage(null);
    await cut.play('cold');
    setFlag('cold');
  }
  async function arrive() {
    mus('c4town');
    await say([[null, 'Floor 41: a mountain town of perfect manners. Every door, letter and family book in it is sealed.'],
      ['lead', { seoyeon: '(Every master here will know my sword style on sight.)', other: 'Everyone here has a faint line of script under one ear.' }],
      ['seoyeon', 'Like mine. Don\'t stare at it.', 'cold'],
      ['dutch', 'Nobody will say where they were born. That\'s not manners. That\'s a lock.', 'stone'],
      ['kai', 'Seal-house, tea house, that big hall. Where first?', 'neutral'],
      [null, 'Freya\'s voice, from everywhere, bright as a shop: "For your safety, every record on these floors is now encrypted at rest! Keys are available from the key administrator. Hi!"']]);
    setFlag('arrive');
  }
  async function notice() {
    await say([[null, 'The notice board: "Records, letters and family books are kept at the Seal-House, for your safety. Namgung Hyeon, for the Alliance."'],
      ['townswoman', 'Where was I born? I had it a moment ago. It\'s sealed, dear. Everything is.', 'sad'],
      [null, 'Below it, two wanted posters. The reward for the Demon Cult\'s heir has gone up again.'],
      ['dutch', 'Yours pays better. Again.', 'stone'], ['seoyeon', 'I\'m more dangerous. Again.', 'neutral']]);
    setFlag('notice');
  }
  async function master(id) {
    const m = id === 'baek' ? 'master1' : 'master2';
    await say([[null, `${SD.cast[m].name} sees how Seo-yeon stands, and goes very still.`], [m, 'That stance. That\'s... no. Good morning, young lady.', 'stone'], ['seoyeon', 'Good morning, Master.', 'neutral']]);
    setFlag('master');
  }
  cut.def('sealhouse', 'The Seal-House', () => vn([['bg', 'c4-sealhouse'],
    ['narr', 'The Seal-House: shelves of everyone\'s past, every scroll sealed. Freya is waiting at the counter.'],
    ['show', 'freya', 'neutral', 'right'],
    ['freya', 'I\'ll give you every key on these floors, love. Namgung\'s too. You choose what to unseal. You always should have.', 'neutral'],
    ['show', 'seoyeon', 'cold', 'left'],
    ['narr', 'Let me choose. Her prayer, word for word.'],
    ['seoyeon', 'Thank you. That\'s very kind.', 'neutral'],
    ['narr', 'Free, and every key\'s policy would name Freya as its administrator. Seo-yeon folds the offer neatly, and files it in the fire.'],
    ['narr', 'The last thing to burn is the fine print. Dutch reads it anyway: KEY ADMINISTRATOR, FREYA. KEY USERS, ANYONE SHE LIKES.']]), { music: 'freya', note: 'Freya offers every key on these floors.' });
  async function sealhouse() {
    if (flag('offer')) return say([[null, flag('freed') ? 'The shelves are open. People are reading their own pasts, some of them crying.' : 'Shelf after shelf of the town\'s pasts, every scroll sealed.']]);
    await cut.play('sealhouse');
    mus('c4town');
    setFlag('offer');
  }
  cut.def('ok', 'Madam Ok\'s tea', () => vn([['ok', 'There she is. My heir, in a disciple\'s robe. You scowl like your mother, child.', 'warm'],
    ['seoyeon', 'I don\'t have a mother.', 'cold'],
    ['ok', 'You have a whole Cult of them. When Freya\'s truce breaks we go down the mountain, and you lead us.', 'smile'],
    ['ok', 'Drink your tea. I never poison guests. It\'s bad for business.', 'amused'],
    ['kai', 'She\'s joking. Right?', 'neutral'], ['seoyeon', 'No.', 'neutral']]), { note: 'The Cult\'s Left Hand, and her heir.' });
  async function tea() {
    if (!flag('okmet')) {
      await cut.play('ok');
      return setFlag('okmet');
    }
    if (flag('camp') && !flag('abacus')) {
      await say([['ok', 'The Cult\'s treasury, child. Your grandfather\'s books. Somebody keeps leaving the keys under the mat, and I want it to stop.', 'amused'],
        ['ok', 'The treasury password is carved on the treasury door.', 'amused'], ['seoyeon', 'Why?', 'neutral'],
        ['ok', 'Who looks at a door?', 'smile'], ['seoyeon', 'Everyone. It\'s a door.', 'neutral']]);
      const r = await G.sort(G.DEF.mat);
      await say([['ok', r.first === r.of ? 'Every one, first time. You count like Old Gu did, before the drink.' : 'Good. Slower than Gu. Better than his son.', 'warm'],
        ['ok', 'Take my abacus. Nothing walks out of your pocket while you carry it.', 'smile']]);
      setFlag('abacus');
      await addCard('k4-vault');
      await addCard('k4-abacus', 'PLOT DEVICE: OK\'S ABACUS');
      return U.system('LEAKED KEYS LIFTED', 'No more Leaked Key cards in your decks.', 'gold');
    }
    return say([['ok', rnd(['Your grandfather took three sugars. I take four. It\'s a competition.', 'The Alliance calls me the Left Hand. The right one\'s for shaking.', 'Come home when you\'re ready, child. I\'ll still be here. I\'m always here.']), 'amused']]);
  }
  async function hall() {
    if (!flag('ryu1')) {
      await say([[null, 'On the hall\'s steps, Namgung Hyeon, the most honoured man in the Alliance, bows to Seo-yeon the way he did across the breakfast table.'],
        ['namgung', 'Seo-yeon. You look well.', 'warm'], ['seoyeon', 'Leader Namgung.', 'cold'],
        [null, 'Behind him, a young man in white tries to catch her eye: Namgung Ryu.'],
        ['ryu', 'I wrote to you. Every month. They sealed every—', 'earnest'], ['steward', 'Young master. Your father is waiting.', 'neutral']]);
      return setFlag('ryu1');
    }
    return say([[null, flag('xp3') ? 'The succession hall stands empty. Nobody has sat in his chair.' : 'The succession hall. Through the doors, Namgung is hearing petitions, very fairly.']]);
  }

  // ---------- The Gate Passes ----------
  async function gate(id) {
    const g = GATES[id];
    if (id === 'gruins') return ruinsGate();
    if (id === 'ghouse') return houseGate();
    if (id === 'gsg' && !flag('offer')) return say([[null, 'A gate across the north road. The guard looks at the seal-house, then at you. "See the Seal-House first, miss. Everyone does."']]);
    if (id === 'gsg' && !(flag('okmet') && flag('ryu1'))) return say([['seoyeon', flag('okmet') ? 'Not yet. The succession hall first.' : 'Not yet. The tea house first. Somebody there is staring at me.', 'neutral']]);
    const def = G.DEF[g[4]];
    await say([[null, `A gate with a plaque: ${g[2]}. ${{ sg: 'It answers only to its rules, and it has none yet.', nacl: 'It checks everyone, both ways.', order100: 'Its rules are carved in order down the stone.', policy: 'Old Gu\'s words are scratched into it.', respol: 'Its own policy is pinned to it.', keydoor: 'A key policy, sealed.', sse: 'Four shelves behind it, four seals.' }[g[4]]}`]]);
    const r = await (def.fields ? G.door(def) : def.steps ? G.order(def) : G.sort(def));
    setFlag(g[4]);
    R.gainXp(r.first === true || r.first === (r.of || 0) || r.mistakes === 0 ? 20 : 10);
    if (def.card) await addCard(def.card);
    if (id === 'gkey') {
      await ask({ c: 'kmskeys', type: 'num', q: 'Namgung could schedule this key for deletion, and every letter sealed under it would be lost for good. What is the shortest waiting period KMS allows before a scheduled deletion happens, in days?', lo: 7, hi: 7, ans: 7, unit: 'days',
        why: 'A key scheduled for deletion waits 7 to 30 days (30 by default), unusable but recoverable: you can cancel the deletion during the wait.',
        eli5: 'Throwing away a master key takes a week at least. For those 7 days nobody can use it, and you can still change your mind.' }, 'THE SCHEDULED DELETION');
    }
  }
  async function xpDoor(n) {
    const xp = ['k4gates', 'k4peak', 'k4house'][n - 1];
    const back = [[33, 3], [66, 27], [33, 49]][n - 1];
    if (n === 2 && !flag('chain')) {
      await say([[null, 'The Burned Hall\'s door has words cut into it: "Borrowed robes come off at the hour."']]);
      await ask({ c: 'stschain', type: 'num', q: 'Inside, a role\'s session is used to assume a second role (role chaining). At most how many hours can that chained session last?', lo: 1, hi: 1, ans: 1, unit: 'hours',
        why: 'A chained role session lasts at most one hour, whatever the second role\'s maximum session duration says.',
        eli5: 'A borrowed robe borrowed from someone in a borrowed robe only lasts an hour. After that it falls off, and you have to ask again.' }, 'THE BURNED HALL\'S DOOR');
      setFlag('chain');
    }
    if (n === 3 && !flag('study')) { goTo(back[0], back[1]); return say([['seoyeon', 'Not yet. His study first. I want to see it.', 'cold']]); }
    if (n === 3 && !flag('edge')) {
      await say([['steward', 'Nobody goes into the Succession Hall past the guards, miss. Not even you. Tell them what each of them is for.', 'neutral']]);
      await G.sort(G.DEF.edge); setFlag('edge'); await addCard('k4-waf');
    }
    const x = SD.expeditions.find(e => e.id === xp);
    const go = await new Promise(res => {
      const b = U.panel(`<p>${esc(x.blurb)}</p><p class="muted small">Expedition ${['I', 'II', 'III'][n - 1]}: ${x.floors.length} raid floors and ${x.floors.length} floor bosses, with the other three as your party. Two of Seymour's Tapes: lose with a tape left and the floor starts again; lose with none and you're back at camp, and the expedition starts over.</p>
        <div class="row"><button class="primary" id="c4-go">Go in</button><button class="ghost" id="c4-not">Not yet</button></div>`, { title: x.name.toUpperCase(), noClose: true });
      b.querySelector('#c4-not').onclick = () => { U.closePanel(); res(false); };
      b.querySelector('#c4-go').onclick = () => { U.closePanel(); res(true); };
    });
    if (!go) { goTo(back[0], back[1]); return; }
    w().pos = back; S.persist();
    return expedition(xp);
  }

  // ---------- The expeditions ----------
  const SETS = { k4gates: 'gates', k4peak: 'ruins', k4house: 'house', k4letter: 'house' };
  const deckFor = (champ, bot) => {
    const base = !bot && Array.isArray(c1().deck) && c1().deck.length ? c1().deck.map(c => c.id) : (SD.starterDeck || []).slice();
    let d = SD.champions.deck(champ, base);
    // What the overworld taught you is in your own deck; the bots bring the common lessons too.
    d = d.concat(bot ? w().cards.filter(id => SD.cards[id] && !SD.cards[id].quest).slice(-4) : w().cards);
    if (champ === 'seoyeon' && flag('ownkey')) d.unshift('k4-ownkey');
    if (champ === 'seoyeon' && flag('reckon')) d.unshift('k4-lastletter');
    // The floors' curses, until Ryu's Seal and Ok's Abacus lift them.
    if (!flag('ryuseal')) d.push('k4-sealed');
    if (!flag('abacus')) d.push('k4-leaked');
    return d.filter(id => SD.cards[id]);
  };
  const onMiss = q => { if (q && q.c) { w().miss = [q.c].concat(w().miss.filter(c => c !== q.c)).slice(0, 12); S.persist(); } };
  // The floors' lines, in the party's voices. A { who: 'c4' } line is a cue for one of this chapter's own scenes.
  async function raidSay(list) {
    let out = [];
    const flush = async () => { if (out.length) { const o = out; out = []; await U.dialog(o); } };
    for (const l of list || []) {
      if (!l) continue;
      if (l.who === 'c4') { await flush(); if (CUES[l.text]) await CUES[l.text](); continue; }
      const t = pick(l.text); if (!t) continue;
      const who = l.who === 'lead' ? lead() : l.who === 'mate1' ? others()[0] : l.who === 'mate2' ? others()[1] : l.who;
      out.push({ s: who && SD.cast[who] ? who : 'narr', t, e: l.e });
    }
    await flush();
  }
  // Songs in the dungeon: the floor, a boss, Namgung, Jin's Echo.
  function raidMusic(root) {
    let last = null;
    const beat = () => {
      const boss = root.querySelector('.bossfight'), name = boss ? (root.querySelector('.foe-name') || {}).textContent || '' : '';
      const k = boss ? (/Namgung|read aloud/.test(name) ? 'c4culprit' : /Echo/.test(name) ? 'c4sad' : 'c4boss') : 'c4dungeon';
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
    SD.main.show('run');
    const root = $('#run');
    if (SD.champions.setMine) SD.champions.setMine(lead());
    A.raidArt(true);
    const stop = raidMusic(root);
    let won = false;
    try {
      const hub = await SD.net.open();
      await SD.raid.play(root, hub, SD.net.code('c4'), { story: true, label: 'The Sealed Floors', xp, champNames: true, create: true, auto: { bots: others() }, tapes: 2,
        deckFor, pickQ: D.pickQ, say: raidSay, onMiss, onEnd: r => { won = !!(r && r.won); } });
    } catch (e) { console.warn('Sealed Floors:', e); }
    finally { stop(); A.raidArt(false); W.set = null; }
    return after(xp, won);
  }
  async function after(xp, won) {
    if (W.debug.onAfter && W.debug.onAfter(xp, won)) return;
    // An expedition starts from a raid gate's scene (inside act), or from the end card (outside one).
    const run = fn => (busy ? fn() : act(fn));
    if (!won) {
      w().pos = [10, 26]; S.persist();
      sc = null; W.enter();
      return run(() => say([[null, 'The party wakes by the camp fire, bruised. The expedition will start again from its first floor.'], ['seoyeon', 'Up. Forms. Then we go again.', 'tired']]));
    }
    const f = { k4gates: 'xp1', k4peak: 'xp2', k4house: 'xp3', k4letter: 'reckon' }[xp];
    setFlag(f);
    R.gainXp(80);
    if (xp === 'k4letter') { await addCard('k4-lastletter', 'SEO-YEON\'S CARD'); return endCard(); }
    sc = null; W.enter();
    if (xp === 'k4gates') return run(async () => {
      await say([[null, 'Down at the Outer Wall, the rockfall into the Hidden Valley has been cleared away.'], ['seoyeon', 'There\'s a vault down there. Sealed. Someone is reading in it.', 'neutral']]);
    });
    if (xp === 'k4peak') return run(echo);
    if (xp === 'k4house') return run(bow);
  }
  cut.def('gu', 'Old Gu\'s letter', () => vn([['bg', 'c4-letter'],
    ['narr', 'Under the floorboards of the master\'s room: a letter for her eighteenth birthday, sealed with a key that names her.'],
    ['show', 'gu', 'smile', 'center'],
    ['gu', 'Kid. If you\'re reading this I\'m dead or sober, and I don\'t know which is worse.', 'smile'],
    ['gu', 'I didn\'t take you to hide you, kid. I took you so you\'d get to choose.', 'warm'],
    ['hide', 'gu'], ['show', 'seoyeon', 'grief', 'center'],
    ['narr', 'The man who made her a Burning Peak disciple did it so she wouldn\'t have to be anyone\'s.']]), { music: 'c4sad', note: 'For her eighteenth birthday, under the floorboards.' });
  cut.def('hall', 'The Succession Hall', () => vn([['bg', 'c4-hall'],
    ['narr', 'The Succession Hall. The whole Alliance is here, Ryu and Madam Ok among them. Namgung waits in front of his chair.'],
    ['show', 'namgung', 'stone', 'right'],
    ['namgung', 'I burned the Peak to stop a war. I raised the child. I killed the boy. I regret none of it.', 'stone'],
    ['show', 'seoyeon', 'cold', 'left'],
    ['seoyeon', 'I know. That\'s not what I came to prove. You told the Alliance Burning Peak struck first.', 'cold']]), { music: 'c4culprit', note: 'Namgung regrets none of it.' });
  cut.def('evidence-1', 'Evidence 1: the raid order', () => vn([['cut', 'the-evidence'], ['narr', 'The Hwa sect\'s elder stands, and takes back his grants. One.']]), { note: 'The Hwa sect takes back its grants.' });
  cut.def('evidence-3', 'The hall turns', () => vn([['bg', 'c4-hall'], ['cut', 'the-evidence'], ['narr', 'The third one turns the hall. They all have birthdays. Sect after sect takes its grants back.'],
    ['show', 'namgung', 'neutral', 'right'], ['namgung', 'Then read me, all of you. And then fight me.', 'neutral']]), { note: 'Every sect has birthdays.' });
  cut.def('summer-house', 'The summer house', () => vn([['bg', 'c4-summer'],
    ['narr', 'The summer house in the high passes. This year\'s birthday letter lies unsent on the table.'],
    ['show', 'seoyeon', 'cold', 'left'], ['show', 'namgung', 'sad', 'right'],
    ['narr', 'With the knife she didn\'t use, she cuts the white mourning sash off her own robes, and gives it to him.'],
    ['seoyeon', 'I\'m done mourning you. Now you get to.', 'cold'],
    ['narr', 'She opens his account in front of the Alliance, and they read it in his own words. Ryu chooses the truth, and the hall goes with him.'],
    ['narr', 'Namgung is not killed. He is read.']]), { music: 'c4sad', note: 'Namgung is not killed. He is read.' });
  // Cues from the floors' intros and outros (js/c4-data.js).
  const CUES = {
    async gu() {
      await cut.play('gu');
      setFlag('gu');
      mus('c4dungeon');
    },
    async confront() {
      await cut.play('hall');
      await ask({ c: 'stschain', type: 'explain', q: 'The raid order on Burning Peak is in the Alliance\'s CloudTrail records, signed by a role, not a person. What in the record\'s userIdentity shows who was behind that session?',
        points: [{ t: 'The session issuer: the role that was assumed', keys: ['sessionissuer', 'session issuer', 'issuer', 'assumed.?role'], ex: ['which role was assumed', 'the role that issued the session'] },
          { t: 'The role session name (the end of the ARN): Namgung\'s', keys: ['session name', 'sessionname', 'role session', 'namgung', 'arn'], ex: ['the name given to the session', 'the session was named after him'] }],
        model: 'userIdentity is an AssumedRole: sessionContext.sessionIssuer names the role, and the ARN ends with the role session name, which is Namgung\'s.',
        why: 'An assumed-role userIdentity carries the session issuer (the role) and an ARN ending in the role session name, chosen by whoever called AssumeRole.',
        eli5: 'The order was signed in a borrowed robe. The log says whose robe (the role) and whose name was sewn into it that night (the session name).' }, 'EVIDENCE 1 · THE RAID ORDER');
      await cut.play('evidence-1');
      await ask({ c: 'kmskeys', type: 'mc', q: 'Seo-yeon can read Namgung\'s sealed account and nobody else in the hall can. What does she need, and what does the house\'s own key policy say?',
        opts: ['Permission to decrypt the data key with the KMS key, which the key policy grants only to her', 'The plaintext data key, which Namgung gave her', 'Administrator access to the house\'s account', 'A grant from Freya'], a: 0,
        why: 'To open envelope-encrypted data you need kms:Decrypt on the KMS key that protects its data key. Namgung\'s key policy allows that to her role and nobody else.',
        eli5: 'His letter has its own little key, locked in a master box. Only she is on the master box\'s list, so only she can get the little key out.' }, 'EVIDENCE 2 · THE SEALED ACCOUNT');
      await say([[null, 'The Tang sect follows. Two.']]);
      await ask({ c: 'detect', type: 'explain', q: 'Every year on her birthday, Namgung decrypted her sealed memories and read them. Were those reads recorded, and did anyone have to turn that on first?',
        points: [{ t: 'Yes: every KMS Decrypt call is recorded in CloudTrail', keys: ['yes', 'recorded', 'logged', 'cloudtrail'], ex: ['the decrypt calls were logged'] },
          { t: 'No setup: KMS calls are management events, logged by default', keys: ['management event', 'by default', 'default', 'nobody had to', 'no one had to', 'automatic'], ex: ['nothing had to be turned on', 'it is on by default'] }],
        model: 'Yes, and nobody had to turn it on: KMS calls such as Decrypt are management events, which CloudTrail records by default.',
        why: 'KMS API calls are management events. CloudTrail keeps 90 days of management events in event history with no setup, and a trail keeps them for longer.',
        eli5: 'The key box keeps a diary of every time it was opened, all by itself. Nobody had to ask it to.' }, 'EVIDENCE 3 · THE BIRTHDAY READS');
      await cut.play('evidence-3');
      setFlag('confront');
    },
    async reckon() {
      await cut.play('summer-house');
    }
  };

  cut.def('echo', 'Jin\'s Echo', () => vn([['bg', 'c4-ruins'],
    ['narr', 'In the master\'s room, Jin\'s Echo had stood waiting: what the nightly redeploy rebuilds of Jin. His style and his lines, without him.'],
    ['show', 'jin', 'neutral', 'right'],
    ['jin', 'The road. Five more minutes. Gu taught me a word. Get up.', 'neutral'],
    ['narr', 'It said his lines out of order, like a log replayed without its timestamps. When it fell it said, in his voice:'],
    ['jin', 'Up, Minnow. Forms.', 'smirk'],
    ['hide', 'jin'], ['show', 'seoyeon', 'grief', 'left'], ['show', 'dutch', 'stone', 'right'],
    ['dutch', 'It sounded like him. That\'s what she does too.', 'stone']]), { music: 'c4sad', note: 'What the nightly redeploy rebuilds of Jin.' });
  async function echo() {
    await cut.play('echo');
    setFlag('echo');
    w().pos = [10, 26]; goTo(10, 26);
    mus('camp');
  }
  cut.def('bow', 'Namgung bows', () => vn([['bg', 'c4-hall'],
    ['narr', 'Beaten, Namgung Hyeon straightens his robe, and bows to her the way he did across the breakfast table.'],
    ['show', 'namgung', 'sad', 'right'],
    ['namgung', 'You were the best student this house ever had. I am sorry it was this house.', 'sad'],
    ['show', 'seoyeon', 'frozen', 'left'],
    ['narr', 'Freya\'s blessing takes him up the tower. He doesn\'t look back.'],
    ['show', 'ryu', 'sad', 'center'], ['ryu', 'Father.', 'sad']]), { music: 'c4sad', note: 'Freya\'s blessing takes him up the tower.' });
  async function bow() {
    await cut.play('bow');
    setFlag('bow');
    w().pos = [16, 28]; goTo(16, 28);
    return otherHand();
  }

  // ---------- The Hidden Valley ----------
  cut.def('lexi', 'Lexi in the archive', () => vn([['bg', 'c4-archive'],
    ['narr', 'Inside, a girl with an eyepatch over a perfectly good eye sits cross-legged on a pile of sealed scrolls, reading.'],
    ['show', 'lexi', 'happy', 'center'],
    ['lexi', 'VISITORS! I\'ve been sealed in here with the Forbidden Index for weeks! The seals are REAL!', 'happy'],
    ['lexi', 'I am Lexi, keeper of forbidden knowledge. Also the regular kind. Library card?', 'earnest'],
    ['show', 'seoyeon', 'neutral', 'left'], ['seoyeon', 'We\'re here to get you out.', 'neutral'],
    ['lexi', 'The Index has one card for "Gary". One word, in his handwriting: No. Dated 1984. Filed under Champions, former.', 'shock'],
    ['narr', 'She comes down the mountain with them, and the camp gets a library.']]), { music: 'quest', note: 'The keeper of forbidden knowledge. Also the regular kind.' });
  async function vault() {
    if (flag('lexi')) return;
    if (!flag('archive')) {
      await say([[null, 'A vault in the valley rock, sealed with a lock that only answers to the key-keepers\' service. From inside, someone is humming.']]);
      await G.door(G.DEF.archive); setFlag('archive'); R.gainXp(20); await addCard('k4-privlink');
    }
    await cut.play('lexi');
    setFlag('lexi');
    mus('c4explore');
  }

  // ---------- The camp ----------
  async function campArrive() {
    await say([[null, 'The Free Cloud\'s camp, at the tower\'s foot. Lexi is already shelving the Cheat Sheet in a tent marked LIBRARY.'],
      ['lexi', 'The library is OPEN. The index too. Also there are letters on the top shelf for you, from Namgung Ryu. I\'m not supposed to say.', 'smile'],
      ['seoyeon', 'Ryu.', 'frozen']]);
    setFlag('camp');
  }
  async function ship() {
    if (!flag('camp')) return say([[null, 'A desk with an order function on it, waiting to be shipped.']]);
    if (flag('ship')) return say([[null, 'The order function hums along inside the VPC. The password never touched the package.']]);
    const r = await G.sort(G.DEF.ship);
    setFlag('ship'); R.gainXp(r.first === r.of ? 30 : 15);
    await addCard('k4-natgw');
  }
  cut.def('ryu-letters', 'Ryu\'s letters', () => vn([['bg', 'c4-camp'],
    ['narr', 'Unsealed, Ryu\'s letters are mostly about Jin.'],
    ['show', 'ryu', 'warm', 'right'],
    ['ryu', 'He told the worst jokes in the yard. He fell asleep in the library once, and I let him.', 'warm'],
    ['ryu', 'I wanted you to know someone in that house remembers him.', 'earnest'],
    ['show', 'seoyeon', 'grief', 'left'], ['narr', 'She reads them twice, and then puts them somewhere she won\'t lose them.']]), { music: 'c4sad', note: 'Mostly about Jin.' });
  async function library() {
    if (!flag('lexi')) return say([[null, 'An empty tent with empty shelves. Someone should run this.']]);
    if (!flag('ryuseal')) {
      await say([['lexi', 'Ryu slips his letters through the archive\'s back door. He wants them sealed so only you can read them. Properly. Help me?', 'earnest'],
        ['lexi', 'We shall use the forbidden technique: ENVELOPE ENCRYPTION!', 'happy'], ['dutch', 'Bless you.', 'neutral'],
        ['lexi', 'Every letter gets its own little key. Then the little key goes into the Sealbox, and the Sealbox never opens. Not for me. Not for the Alliance. Not for anyone.', 'earnest'],
        ['seoyeon', 'Then why not put the letter in the Sealbox?', 'neutral']]);
      await G.order(G.DEF.seal);
      await ask({ c: 'kmsenv', type: 'num', q: 'Why the data key? What is the most plaintext, in kilobytes, that KMS Encrypt will take directly?', lo: 4, hi: 4.1, ans: 4, unit: 'KB',
        why: 'Encrypt takes up to 4 KB (4,096 bytes) of plaintext. Anything bigger is encrypted locally with a data key from GenerateDataKey.',
        eli5: 'The master box only takes notes the size of a postcard. For a whole letter, you lock it with a little key, and put the little key in the box.' }, 'SEAL AND UNSEAL');
      await say([['seoyeon', 'Four kilobytes.', 'neutral'], ['lexi', 'And Ryu writes very long letters.', 'smile']]);
      await G.sort(G.DEF.readers);
      await addCard('k4-envelope'); await addCard('k4-keypol');
      await cut.play('ryu-letters');
      mus('camp');
      setFlag('ryuseal');
      await addCard('k4-ryuseal', 'PLOT DEVICE: RYU\'S SEAL');
      return U.system('SEALED HANDS LIFTED', 'No more Sealed Hand cards in your decks. And the ruins\' gate is sealed in the same script.', 'gold');
    }
    if (flag('xp2') && !flag('cards')) {
      await say([['lexi', 'I rebuilt the guild gate from the first game. With TOKENS. Who gets in, who gets a 401, who gets a 403?', 'happy']]);
      const r = await G.sort(G.DEF.cards);
      setFlag('cards'); R.gainXp(r.first === r.of ? 30 : 15);
      await addCard('k4-verify');
      await addCard('k4-index', 'PLOT DEVICE: LEXI\'S FORBIDDEN INDEX');
      return;
    }
    return review('lexi');
  }
  // Index Cards (Lexi) and Forms (Seo-yeon): questions on what you're weakest at, the last missed first.
  async function review(who) {
    const seen = Object.keys(SD.concepts).filter(c => S.concept(c).seen && (who === 'lexi' ? ['iampol', 'stschain', 'cognito', 'federation', 'sigv4', 'progaccess'].includes(c) : true));
    const pool = w().miss.filter(c => seen.includes(c)).concat(S.pickConcepts(3, seen.length ? seen : ['sgnacl']));
    const cs = [...new Set(pool)].slice(0, 3);
    await say([[who === 'lexi' ? 'lexi' : 'seoyeon', who === 'lexi' ? 'Index Cards! Three, from what\'s due.' : 'Forms. Three of them, the ones you dropped last first.', 'neutral']]);
    let right = 0;
    for (const c of cs) {
      const q = D.pickQ(c); if (!q) continue;
      const r = await SD.quiz.ask(q, { title: who === 'lexi' ? 'LEXI\'S INDEX CARDS' : 'DAWN FORMS' });
      if (r && r.ok) right++;
    }
    R.gainXp(10 + right * 5);
    setFlag(who === 'lexi' ? 'index' : 'forms');
  }
  async function dboard() {
    if (!flag('camp')) return say([[null, 'A board on an easel, blank.']]);
    if (!flag('xp2')) return say([[null, 'The Design Board. Lexi has written on it: "Before Namgung: draw the Alliance\'s sign-in." Not yet.']]);
    if (flag('board')) return say([[null, 'The Alliance\'s sign-in, drawn and checked: user pool, token checked at the API, a scoped role, Secrets Manager, a customer managed key.']]);
    await G.order(G.DEF.board);
    await ask({ c: 'kmskeys', type: 'mc', q: 'The interviewer taps the KMS key on your board. "Its key policy doesn\'t allow the account, and doesn\'t name the admin. An IAM admin with kms:* in their IAM policy tries to decrypt the records. What happens?"',
      opts: ['Denied: only principals the key policy allows can use the key, and it doesn\'t let IAM policies count', 'Allowed: kms:* in IAM covers it', 'Allowed, because admins bypass key policies', 'Denied, but only for 7 days'], a: 0,
      why: 'A KMS key\'s key policy is the primary control. IAM policies only count on a key whose key policy allows the account (the "Enable IAM policies" statement).',
      eli5: 'The master box has its own guest list. If the list doesn\'t say "anyone the house trusts", the house\'s keyring is useless on it.' }, 'DESIGN BOARD · THE INTERVIEWER');
    setFlag('board'); R.gainXp(30);
    await addCard('k4-refresh');
    return upgrade();
  }
  async function upgrade() {
    if (!(flag('board') && flag('freya')) || flag('ownkey')) return;
    setFlag('ownkey');
    await say([['seoyeon', 'With an AWS managed key, someone else writes the policy. With a customer managed key, I write it. My own name on it.', 'cold']]);
    return U.system('SEO-YEON\'S UPGRADE: MY OWN KEY', 'A customer managed key, with her own name on the policy. My Own Key is in Seo-yeon\'s deck from Expedition III, whoever plays her.', 'gold');
  }
  cut.def('freya', 'Freya\'s choice', () => vn([['bg', 'c4-camp'],
    ['show', 'freya', 'neutral', 'right'],
    ['freya', 'No gift this time, love. A choice. Namgung\'s own account of the night of the Peak, sealed.', 'neutral'],
    ['freya', 'It\'s yours to open. You choose.', 'neutral'],
    ['show', 'seoyeon', 'cold', 'left'],
    ['narr', 'Its key policy names her, and only her. Namgung wrote it for her, and sealed it so only she could read it.'],
    ['seoyeon', 'Not tonight.', 'cold'], ['narr', 'She doesn\'t open it.'],
    ['narr', 'Freya leaves her usual card behind: "How likely are you to recommend the Free Tier to a friend? 0 to 10." Seo-yeon files it in the fire.']]), { music: 'freya', note: 'Namgung\'s own account, sealed for Seo-yeon.' });
  async function freya() {
    await cut.play('freya');
    mus('camp');
    setFlag('freya');
    return upgrade();
  }
  cut.def('cat-forms', 'The marsh cat at dawn', () => vn([['bg', 'c4-camp'],
    ['narr', 'The marsh cat is asleep in the middle of the dawn forms, exactly where Seo-yeon wants to stand.'],
    ['narr', 'Four people say four names at once: "Patient." "Chef." "Honoured Guest." "Suspect." It doesn\'t move.'],
    ['narr', 'Down the hill, Marrow\'s bell rings for the cat. It rings for every alarm. Seo-yeon does her forms around it.']]), { note: 'Seo-yeon\'s spot in the dawn forms, taken.' });
  async function fire() {
    if (!flag('camp')) return say([[null, 'A camp fire, banked low.']]);
    if (!flag('cat4')) {
      setFlag('cat4');
      return cut.play('cat-forms');
    }
    return review('forms');
  }
  cut.def('other-hand', 'The other hand', () => vn([['bg', 'c4-camp'],
    ['narr', 'That night Seo-yeon sits by the fire with Namgung\'s sealed account in her lap, and can\'t make herself open it.'],
    ['show', 'mira', 'tired', 'left'],
    ['mira', 'Brother Anselm made me the beast with his own hands, love. They were shaking. I\'ve never managed to hate him for it.', 'tired'],
    ['show', 'seoyeon', 'sad', 'right'],
    ['seoyeon', 'I remember the seal going on. His hand on my forehead. He said "I\'m sorry." The only time he ever did.', 'sad'],
    ['narr', 'They keep it from the others. Then Mira holds the lamp while Seo-yeon breaks the seal.']]), { music: 'c4sad', note: 'Mira and Seo-yeon by the fire.' });
  async function otherHand() {
    await cut.play('other-hand');
    setFlag('hand');
    mus('camp');
  }

  // ---------- The ruins ----------
  async function ruinsGate() {
    if (!flag('ryuseal')) return say([[null, 'The ruins\' gate, sealed shut in the Namgung house\'s own script.'], ['seoyeon', 'Someone in that house has a key.', 'cold']]);
    if (!(flag('ship') && flag('abacus'))) return say([['seoyeon', flag('ship') ? 'Not yet. Madam Ok wants her treasury counted first. The tea house.' : 'Not yet. Ship It first. Lexi says the order function is waiting at camp.', 'neutral']]);
    await say([[null, 'Ryu\'s seal is in the same script. The gate reads it, and opens.'], ['seoyeon', 'Burning Peak.', 'frozen']]);
    setFlag('gruins');
  }

  // ---------- Namgung's house ----------
  cut.def('let-me-choose', 'Let me choose', () => vn([['narr', 'Outside Namgung\'s house. Kai reaches for the seal scar under her ear.'],
    ['kai', 'One touch. I could unmake it. Give you back whatever\'s still under there.', 'earnest'],
    ['seoyeon', 'Let me choose.', 'cold'],
    ['narr', 'She has his wrist. Those are the words of her prayer.'],
    ['narr', 'Kai steps back. After the Granaries he knows what that costs him, and he does it anyway.'],
    ['seoyeon', 'Thank you.', 'neutral']]), { note: 'Kai and the seal scar, outside Namgung\'s house.' });
  async function houseGate() {
    if (!flag('xp2')) return say([[null, 'The Namgung house\'s gate, and a guard who bows very politely and doesn\'t move.']]);
    if (!(flag('freya') && flag('cards') && flag('board'))) return say([['seoyeon', 'Not yet. Camp first: Freya is waiting for me, and so are Lexi and the Design Board.', 'cold']]);
    await cut.play('let-me-choose');
    setFlag('letme');
  }
  cut.def('study', 'Namgung\'s study', () => vn([['narr', 'Namgung\'s study, where she once stood with a knife. She sits down with it now.'],
    ['dutch', 'You going to use it this time?', 'stone'],
    ['seoyeon', 'If you had Professor Vell on the tower, would you let go?', 'cold'],
    ['dutch', '...Yes.', 'stone'],
    ['seoyeon', 'I kept every birthday letter he sent me. Last year I answered one. I said I was well. I asked about his back.', 'sad'],
    ['dutch', 'That\'s not a crime, kid.', 'neutral'],
    ['seoyeon', 'In my family it\'s the worst one there is.', 'cold'], ['narr', 'He can\'t tell which family she means, and for once he doesn\'t ask. Above them, something moves in the rafters.']]), { note: 'Dutch asks if she\'ll use the knife this time.' });
  async function study() {
    if (flag('study')) return say([[null, 'His study, as tidy as a sealed scroll.']]);
    await cut.play('study');
    await G.sort(G.DEF.detect);
    setFlag('study'); R.gainXp(20);
    await addCard('k4-guardduty');
  }

  // ---------- The choice, and the end ----------
  cut.def('square', 'The square at first light', () => vn([['narr', 'The square, at first light. The Cult wants Burning Peak\'s name for a war banner. The Alliance wants it buried. Ryu wants whatever she wants.']]), { note: 'Before Burning Peak\'s name is chosen.' });
  cut.def('name', 'Burning Peak\'s name', (ch = 'school') => vn([['bg', ch === 'school' ? 'c4-school' : 'c4-town'], ['cut', 'burning-peaks-name'], ...(ch === 'school' ? [] : [['cg', 'cut-burning-peaks-name-1']]),
    ...({ banner: [['show', 'ok', 'smile', 'right'], ['ok', 'That\'s my heir.', 'smile'], ['narr', 'The Cult comes down to the camp armed, and the training yard has two halves that don\'t speak.']],
      bury: [['show', 'ryu', 'sad', 'right'], ['narr', 'Burning Peak becomes a name on a grave. Ryu comes down to the camp, with a few quiet disciples.']],
      school: [['show', 'seoyeon', 'neutral', 'left'], ['seoyeon', 'Burning Peak is a school. Anyone, Alliance or Cult. Forms at dawn.', 'neutral'], ['narr', 'Both families walk out on her. Over the next chapter, one by one, their children turn up for forms anyway.']] }[ch]),
    ['bg', 'c4-dawn'], ['cut', 'burning-peaks-name'], ['show', 'uptima', 'neutral', 'center'],
    ['narr', 'Uptima reads the prayer: "Let me choose." And then, for once, she doesn\'t say anything at all. She waits.'],
    ['seoyeon', 'I did.', 'neutral'],
    ['narr', 'It\'s the only prayer Uptima doesn\'t answer, and the right one not to.']]), { music: 'c4peak', note: 'Seo-yeon\'s choice, and the prayer Uptima doesn\'t answer.', alts: [['A school', 'school'], ['A war banner', 'banner'], ['Bury it', 'bury']] });
  cut.def('seals-open', 'The seals open', (ch = 'school') => vn([['bg', 'c4-town'], ['narr', 'The seals open across the band. People remember where they were born, and some of them wish they didn\'t.'],
    ['narr', ch === 'school' ? 'The disciples and the Cult\'s children move down to the camp, and the training yard opens.' : 'The training yard opens, and the camp gets louder.']]), { note: 'The end of Chapter 4.', alts: [['A school', 'school'], ['A war banner or a grave', 'bury']] });
  async function choice() {
    if (!flag('hand')) return say([[null, 'Burning Peak\'s old banner pole. Nobody has flown anything from it for twenty years.']]);
    if (flag('choice') && c4().choice === 'school' && !flag('word')) {
      setFlag('word');
      return say([[null, 'Burning Peak\'s first dawn forms. Alliance children on the left, the Cult\'s on the right, all of them yawning.'],
        ['seoyeon', 'Get up. Forms. And one word, for historical accuracy. Old Gu taught it to Jin, and Jin taught it to me. It goes:', 'neutral'],
        [null, 'Down the hill, Marrow\'s bell rings over it. Nobody hears the word. Every child in the yard repeats it anyway.']]);
    }
    if (flag('choice')) return say([[null, { banner: 'The war banner snaps on the pole.', bury: 'The pole is bare. The name is on a grave now.', school: 'A small sign on the pole: BURNING PEAK. FORMS AT DAWN. ALL WELCOME.' }[c4().choice]]]);
    await cut.play('square');
    const ch = await new Promise(res => {
      const b = U.panel(`<p>What does Burning Peak's name mean from now on? <span class="muted small">Seo-yeon decides alone. Whatever she picks, both families turn their backs on her, for a while.</span></p>
        <div class="opts col">
        <button class="opt" data-ch="banner">A war banner<br><span class="muted small">Madam Ok's choice. The Cult comes down to the camp armed.</span></button>
        <button class="opt" data-ch="bury">Bury it<br><span class="muted small">The Alliance's. A name on a grave; Ryu and a few quiet disciples come to camp.</span></button>
        <button class="opt" data-ch="school">A school, open to both (recommended)<br><span class="muted small">Hers. Anyone, Alliance or Cult, with dawn forms.</span></button></div>`, { title: 'BURNING PEAK\'S NAME', noClose: true, cls: 'wide' });
      b.querySelectorAll('[data-ch]').forEach(el => el.onclick = () => { AU.sfx('ok'); U.closePanel(); res(el.dataset.ch); });
    });
    c4().choice = ch; S.persist();
    await cut.play('name', ch);
    setFlag('choice');
    await cut.play('seals-open', ch);
    setFlag('freed');
    c4().f.done = true; S.persist();
    R.gainXp(60);
    return endCard();
  }
  function endCard() {
    W.halt();
    const next = SD.chapterStart && SD.chapterStart[5];
    AU.music('title');
    U.stage(null);
    const sv = S.save, ch = { banner: 'a war banner', bury: 'a name on a grave', school: 'a school, open to both' }[c4().choice] || 'still hers to choose';
    const b = U.panel(`<div id="c4-end"><p><b>The Sealed Floors are open.</b> Burning Peak's name is ${esc(ch)}.</p>
      <p class="muted small">Level ${sv.level} · ${w().pages.length} of 8 pages of Jin's forms · ${w().cards.length} cards learned on the floors${flag('reckon') ? ' · The Last Letter read' : ''}</p>
      <div class="opts col">
      ${next ? '<button class="primary" id="c4-next">Continue to Chapter 5</button>' : '<p class="muted">Chapter 5: to be continued.</p>'}
      ${flag('reckon') ? '' : '<button class="ghost" id="c4-letter">The Last Letter (a reckoning, 2 raid floors, hard)</button>'}
      <button class="ghost" id="c4-walk">Keep walking the floors</button></div></div>`, { title: 'CHAPTER 4 · THE SEALED FLOORS', noClose: true });
    const n = b.querySelector('#c4-next'); if (n) n.onclick = () => { U.closePanel(); SD.chapterStart[5](); };
    const l = b.querySelector('#c4-letter');
    if (l) l.onclick = () => { U.closePanel(); expedition('k4letter'); };
    b.querySelector('#c4-walk').onclick = () => { U.closePanel(); sc = null; W.enter(); };
  }

  // ---------- Pages and people ----------
  async function page(i) {
    if (!pageHere(i)) return;
    const [, , c, text] = PAGES[i];
    w().pages.push(i); S.persist();
    AU.sfx('coin');
    await say([[null, `A page of Jin's forms. ${text}`]]);
    // Half the pages ask about this chapter, half about whatever older lesson is due.
    const older = Object.keys(SD.concepts).filter(k => SD.concepts[k].zone < 4 && S.concept(k).seen);
    const cc = c || (older.length ? S.pickConcepts(1, older)[0] : 'sgnacl');
    const q = D.pickQ(cc);
    if (q) { const r = await SD.quiz.ask(q, { title: 'A PAGE OF JIN\'S FORMS' }); R.gainXp(r && r.ok ? 15 : 5); }
    if (w().pages.length === PAGES.length) { await U.system('ALL EIGHT FORMS', 'Every page of Jin\'s forms. +50 XP.', 'gold'); R.gainXp(50); }
  }
  function door(d) {
    if (busy) return;
    if (d === 'down') return act(async () => { AU.sfx('door'); goTo(16, 28); if (!flag('lexi')) await say([[null, 'The lift creaks down to the Free Cloud\'s camp, at the tower\'s foot. Nobody\'s home yet.']]); });
    if (d === 'up') return act(async () => { AU.sfx('door'); goTo(24, 28); });
    const n = { xp1: 1, xp2: 2, xp3: 3 }[d];
    if (n) return act(() => xpDoor(n));
  }
  function talk(id) {
    if (busy) return;
    if (sc.actors[id] && !sc.actors[id].thing) { const a = sc.actors[id], P = sc.P; a.face = Math.abs(P.x - a.x) >= Math.abs(P.y - a.y) ? (P.x > a.x ? 'east' : 'west') : (P.y > a.y ? 'south' : 'north'); }
    if (GATES[id]) return act(() => gate(id));
    if (/^page\d$/.test(id)) return act(() => page(+id.slice(4)));
    const fns = { sealhouse, tea, ok: tea, hall, namgung: hall, notice, tw: notice, vault, library, lexi: library, ship, dboard, fire, freya, study, knife: study, banner: choice,
      baek: () => master('baek'), seol: () => master('seol'),
      ryu: hall, ryuC: () => say([['ryu', { banner: 'I don\'t agree with you. I came anyway.', bury: 'Thank you. For him.', school: 'I\'ll teach the third form. Jin always did it wrong.' }[c4().choice] || 'Seo-yeon.', 'warm']]),
      tm: () => say([['townsman', flag('freed') ? 'I was born in the valley. I remember the river.' : 'Lovely morning. Lovely, lovely morning. Please don\'t ask me anything.', 'sad']]),
      cultist: () => say([['cultist', flag('okmet') ? 'Madam Ok says you\'re coming home. She says it every day.' : 'The Left Hand is in the tea house, heir.', 'smile']]),
      home: () => say([[null, flag('freed') ? 'A family book, open now. Somebody has been crying over it.' : 'A family book, sealed. The name on the cover has been sealed too.']]),
      home2: () => say([[null, 'A sealed door. Even the doorbell is sealed.']]),
      ledger: () => say([[null, 'A ledger of grants: which sect may read what. Several lines have been crossed out recently, by hand.']]),
      guard: () => xpDoor(3) };
    if (T.order.includes(id)) return act(() => say([[id, rnd({ mira: ['Eat something first, love. Then gates.', 'She\'s holding up. Don\'t ask her if she is.'], kai: ['I\'m not touching anything. I\'m just saying I could.', 'This town needs a decent kitchen.'], seoyeon: ['Forms at dawn. All of you.', '...'], dutch: ['Every lock has a log. Find the log.', 'Nobody here will say where they were born. Interesting.'] }[id])]]));
    if (fns[id]) return act(fns[id]);
  }

  // ---------- The objective, and where the arrow points ----------
  // [what to do, [x, y], the actor with the "!"]
  function step() {
    const f = flag;
    if (!f('offer')) return ['See the seal-house', [27, 21], 'sealhouse'];
    if (!f('okmet')) return ['Someone in the tea house is staring at you', [42, 33], 'ok'];
    if (!f('ryu1')) return ['Visit the succession hall', [40, 22], 'hall'];
    if (!f('sg')) return ['Open the gate north to the Gate Passes', [33, 17], 'gsg'];
    if (!f('nacl')) return ['Get through the pass\'s second gate', [33, 10], 'gnacl'];
    if (!f('xp1')) return ['Expedition I: the Gate Passes, at the top of the pass', [33, 3], null];
    if (!f('lexi')) return ['Find the Sealed Archive in the Hidden Valley', [59, 5], 'vault'];
    if (!f('camp')) return ['Take the lift down to camp (west side of town)', [23, 27], null];
    if (!f('ship')) return ['Ship It: the order function at camp', [8, 23], 'ship'];
    if (!f('ryuseal')) return ['Ryu\'s letters: see Lexi at the library', [4, 23], 'library'];
    if (!f('abacus')) return ['Madam Ok\'s treasury, at the tea house', [42, 33], 'ok'];
    if (!f('gruins')) return ['Open the ruins\' gate, east of town, with Ryu\'s Seal', [47, 26], 'gruins'];
    if (!f('policy')) return ['The yard gate: allowed twice', [56, 26], 'gyard'];
    if (!f('xp2')) return ['Expedition II: the Ruins of Burning Peak', [66, 27], null];
    if (!f('freya')) return ['Someone is waiting at camp', [11, 30], 'freya'];
    if (!f('cards')) return ['Lexi\'s guild gate, at the library', [4, 23], 'library'];
    if (!f('board')) return ['Draw the Alliance\'s sign-in on the Design Board', [15, 25], 'dboard'];
    if (!f('letme')) return ['Go to Namgung\'s house, south of town', [33, 35], 'ghouse'];
    if (!f('keydoor')) return ['The house\'s inner gate: a key policy', [33, 43], 'gkey'];
    if (!f('study')) return ['Find Namgung\'s study', [40, 50], 'study'];
    if (!f('xp3')) return ['Expedition III: Namgung\'s House, round the front of the hall', [33, 49], 'guard'];
    if (!f('hand')) return ['Go back to camp for the night', [16, 28], null];
    if (!f('choice')) return ['Choose what Burning Peak\'s name means, in the town square', [35, 28], 'banner'];
    return ['The Sealed Floors are open. Pages of Jin\'s forms: ' + w().pages.length + ' of 8', null, null];
  }

  // ---------- HUD ----------
  function hud() {
    const el = $('#w-hud'); if (!el || !W.active) return;
    const sv = S.save, need = S.xpFor(sv.level), l = T.leads[lead()];
    el.innerHTML = `<span class="hud-chip"><b>${esc(l.name.split(' ')[0])}</b> · Lv ${sv.level}</span>
      <div class="bar xp w-xp" title="XP"><i style="width:${Math.min(100, sv.xp / need * 100)}%"></i></div>
      <span class="hud-chip w-goal">${esc(step()[0])}</span>
      <span class="hud-chip" title="Pages of Jin's forms">📜 ${w().pages.length}/8</span>
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
    if (SD.c2world && SD.c2world.halt) SD.c2world.halt();
    SD.ch1.dress();
    SD.main.show('world');
    $('#w-canvas').setAttribute('aria-label', 'Floor 41, the Alliance\'s town, the Gate Passes, the Hidden Valley, the ruins of Burning Peak, Namgung\'s house, and the camp');
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
    c4(); S.persist();
    if (c4().f.done) return endCard();
    sc = null;
    if (!flag('cold')) await coldOpen();
    W.enter();
  };
  SD.chapterStart = SD.chapterStart || {};
  SD.chapterStart[4] = () => W.start();

  // ---------- The chapter 4 demo's own start ----------
  // Assumed, as if chapters 1 to 3 were played: level 12 at least, chapter 1's starter deck, and the earlier
  // chapters' concepts already on the cheat sheet.
  W.newGame = async function () {
    const id = await SD.ch1.choose();
    const sv = S.save;
    sv.c1 = { lead: id, f: { intro: true, cart: true, brief: true, done: true }, deck: SD.starterDeck.map(x => ({ id: x, up: false })), pos: null };
    sv.c4 = null;
    sv.name = T.leads[id].name.split(' ')[0];
    sv.flags.prologue = true; sv.flags.ch1 = true;
    if ((sv.level || 1) < 12) { sv.level = 12; sv.xp = 0; }
    Object.keys(SD.concepts).forEach(c => { if (SD.concepts[c].zone < 4) S.seeConcept(c); });
    S.persist();
    sc = null;
    return W.start();
  };
  if (CH4) {
    const boot = () => {
      const M = SD.main, title = M.title;
      M.title = function () {
        title();
        const box = $('#title-actions'), sv = S.save;
        if (!box || box.querySelector('#t-start')) return;
        const has = !!(sv.c1 && sv.c1.lead && sv.c4);
        box.innerHTML = (has ? `<button class="primary" id="t-c4go">Continue · ${esc(T.leads[sv.c1.lead].name)}</button><button class="ghost" id="t-c4new">New game</button>` : '<button class="primary" id="t-c4new">Play Chapter 4: The Sealed Floors</button>') + '<button class="ghost" id="t-help">How to play</button>';
        const h = $('#t-help');
        if (h) h.onclick = () => U.panel('<p>Walk with the arrow keys or WASD, or tap where you want to go. Tap someone, or press E, to talk. Gates open when you understand them: each one is a small puzzle.</p><p>The expeditions are raids: play cards to fix incidents, with the other three as your party.</p>', { title: 'HOW TO PLAY' });
        if (has) $('#t-c4go').onclick = () => W.start();
        $('#t-c4new').onclick = () => {
          if (!has) return W.newGame();
          const c = U.panel('<p>Start chapter 4 again from the cold open? Your level and cheat sheet stay.</p><div class="row"><button class="primary" id="n-y">Start again</button><button class="ghost" id="n-n">Cancel</button></div>', { title: 'NEW GAME' });
          c.querySelector('#n-y').onclick = () => { U.closePanel(); S.save.c4 = null; S.persist(); sc = null; W.newGame(); };
          c.querySelector('#n-n').onclick = U.closePanel;
        };
      };
      const foot = $('.t-foot'); if (foot) foot.textContent = 'Chapter 4 demo: The Sealed Floors · Built on the AWS documentation · Saves automatically';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { boot(); SD.main.title(); }, 0), { once: true });
  }

  // For tools/c4_check.js.
  W.debug = { expedition: xp => expedition(xp), after: (xp, won) => after(xp, won), busy: () => busy, flags: f => { Object.assign(w().x, f); S.persist(); if (sc) applyState(); }, flag, place: (x, y) => sc && goTo(x, y), scene: () => sc, step, act, w, c4, GATES, PAGES, endCard };
})();
