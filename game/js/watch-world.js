// The Night Watch's walkable world (storyboard v3, Ladi Nov 17; doc "The Night Watch", sections "The world", "The
// castle", "Look and feel", "Castle shortcuts"). Pure logic, no DOM: js/watch-view.js draws it and js/mode-watch.js
// runs the days and nights. Shapes shared with the art and content threads: js/watch-schema.md.
//   - The town is four stacked side-view levels (West Road on top, Hill Road, Main Street, the Far Lane at the
//     bottom). Forks in the road join them: stand at a fork and press up or down.
//   - The castle is four floors, one on screen at a time, joined by the left stair (ground, upper, towers) and the
//     right stair (cellars, ground, upper). Quests add the cellar stair (left, ground to cellars), the back stair
//     (right, upper to towers) and the supply hoist in the middle (every floor). The bridge leaves the upper floor's
//     far end for the neighbour's castle; you walk to their door, never inside.
//   - Shortcuts from big quests: the lookout chute (West Road down to the Far Lane cottage, down only) and Seymour's
//     tunnel (Hill Road bunker to the Far Lane well, both ways).
//   - Wildlife: scenery only. Each animal wanders a home zone, scatters a few steps when you come close, shelters in
//     rain and follows day and night.
// World units are pixels of a 360-tall view; the ground line is at y = GROUND.
(function (root) {
  const WW = {};
  WW.GROUND = 300;
  WW.VIEW_H = 360;
  WW.SPEED = 200;              // walking speed, px per second
  WW.REACH = 56;             // how close you must stand to use something
  WW.FLOORS = ['towers', 'upper', 'ground', 'cellars'];
  WW.LEVELS = ['west-road', 'hill-road', 'main-street', 'far-lane'];

  // ---- Town levels: x positions come from the doc's town map (widget x * 4). ----
  // Each spot: id, x, kind (who | place | fork | gate | travel | fix), label, and for forks/travel a `to`.
  // `fix` marks the night-9 fix spots (doc: "Fix spots on night 9").
  const T = {
    'west-road': { name: 'West Road', from: 1000, to: 3300, spots: [
      { id: 'far-gate', x: 1000, kind: 'fix', fix: 'door', label: 'Far gate' },
      { id: 'lookout-ruin', x: 1440, kind: 'travel', label: 'Lookout ruin', to: { scene: 'far-lane', x: 1120 }, dir: 'down', needs: 'chute', oneWay: true },
      { id: 'shrine', x: 1920, kind: 'fix', fix: 'sealing-bench', label: 'Wayside shrine' },
      { id: 'fork-west-down', x: 2600, kind: 'fork', label: 'Down to Hill Road', to: { scene: 'hill-road', x: 2264 }, dir: 'down' },
      { id: 'coach-house', x: 2880, kind: 'fix', fix: 'badge-desk', label: 'Coach house', who: 'hollis' },
      { id: 'pell-gate', x: 3280, kind: 'gate', label: 'Gate to the castle hill', who: 'pell', to: { scene: 'castle:ground', x: 160 }, dir: 'use', dusk: true }
    ] },
    'hill-road': { name: 'Hill Road', from: 1200, to: 3960, spots: [
      { id: 'fork-hill-down', x: 1200, kind: 'fork', label: 'Down to Main Street', to: { scene: 'main-street', x: 760 }, dir: 'down' },
      { id: 'post-office', x: 1440, kind: 'fix', fix: 'sealing-bench', label: 'Post office', who: 'coo' },
      { id: 'library', x: 1880, kind: 'fix', fix: 'door', label: 'Library', who: 'lexi' },
      { id: 'fork-hill-up', x: 2264, kind: 'fork', label: 'Up to the West Road', to: { scene: 'west-road', x: 2600 }, dir: 'up' },
      { id: 'bounty-board', x: 2760, kind: 'place', label: 'Bounty board', who: 'bru' },
      { id: 'doug-flat', x: 3200, kind: 'place', label: 'Doug\'s flat', who: 'doug' },
      { id: 'bunker', x: 3720, kind: 'travel', fix: 'badge-desk', label: 'Seymour\'s bunker', who: 'seymour', to: { scene: 'far-lane', x: 3620 }, dir: 'down', needs: 'tunnel' }
    ] },
    'main-street': { name: 'Main Street', from: 96, to: 2960, spots: [
      { id: 'path-down', x: 320, kind: 'fork', label: 'Down to the Far Lane', to: { scene: 'far-lane', x: 560 }, dir: 'down' },
      { id: 'base-camp', x: 560, kind: 'place', label: 'Base Camp', who: 'mira', also: ['kai', 'dutch', 'ayo'] },
      { id: 'fork-main-up', x: 760, kind: 'fork', label: 'Up to Hill Road', to: { scene: 'hill-road', x: 1200 }, dir: 'up', who: 'tess' },
      { id: 'forge', x: 1230, kind: 'place', label: 'Forge' },   // clear of the main-to-hill ramp (760 to 1220)
      { id: 'bakery', x: 1440, kind: 'place', label: 'Bakery' },
      { id: 'outpost', x: 1335, kind: 'gate', label: 'Watch outpost (a door to the castle)', to: { scene: 'castle:ground', x: 640 }, dir: 'use', needs: 'outpost' },
      { id: 'fork-main-down', x: 1680, kind: 'fork', label: 'Down to the Far Lane', to: { scene: 'far-lane', x: 2000 }, dir: 'down' },
      { id: 'cafe', x: 2000, kind: 'fix', fix: 'door', label: 'Cache Café', who: 'wen' },
      { id: 'stall', x: 2400, kind: 'fix', fix: 'badge-desk', label: 'Kagemaru\'s stall', who: 'kagemaru' },
      { id: 'lock-shop', x: 2760, kind: 'fix', fix: 'sealing-bench', label: 'Lock shop', who: 'hobb' }
    ] },
    'far-lane': { name: 'Far Lane', from: 160, to: 3900, spots: [
      { id: 'town-gate', x: 200, kind: 'fix', fix: 'door', label: 'Gate out of town' },
      { id: 'path-up', x: 560, kind: 'fork', label: 'Up to Main Street', to: { scene: 'main-street', x: 320 }, dir: 'up' },
      { id: 'cottage', x: 1120, kind: 'place', label: 'Orchard cottage', who: 'fennel' },
      { id: 'fork-far-up', x: 2000, kind: 'fork', label: 'Up to Main Street', to: { scene: 'main-street', x: 1680 }, dir: 'up' },
      { id: 'dock', x: 2520, kind: 'fix', fix: 'badge-desk', label: 'River dock', who: 'odu' },
      { id: 'granary', x: 3160, kind: 'fix', fix: 'sealing-bench', label: 'Granary' },
      { id: 'well', x: 3600, kind: 'travel', label: 'Town well', to: { scene: 'hill-road', x: 3720 }, dir: 'up', needs: 'tunnel' }
    ] }
  };
  WW.TOWN = T;
  // Other names the content uses for the same spots (js/watch-content.js), and a lookup by either name.
  WW.ALIAS = { 'kagemaru-stall': 'stall', 'cafe-back-door': 'cafe', 'key-cabinet': 'lock-shop', 'library-archive': 'library',
    'post-counter': 'post-office', harbourmaster: 'dock', 'first-fork': 'fork-main-up', 'castle-gate': 'pell-gate' };
  WW.spot = function (level, id) {
    artSync();
    const real = WW.ALIAS[id] || id, lv = level ? [level] : Object.keys(T);
    for (const l of lv) { const s = T[l] && T[l].spots.find(v => v.id === real); if (s) return Object.assign({ level: l }, s); }
    return null;
  };

  // ---- The castle: four floors. Rooms by x range; doors (lock slots) sit between rooms. ----
  // These are the pre-art numbers (1600 wide). Once WATCH_ART.floors loads (1200 wide, one painted wall each), artSync()
  // takes room ranges, door x and stair x from the art so the walls and the logic line up.
  let FW = 1600, BRIDGE_X = 1590, OUTPOST_X = 640, EXIT_X = 40;
  WW.ENTRY_X = 160;   // where you stand on the ground floor after coming in through the main gate
  const C = {
    towers: { name: 'Towers', rooms: [['watchtower', 120, 460, 'Watchtower'], ['lookout', 460, 790, 'Lookout'], ['captain', 810, 1480, 'Captain\'s room']] },
    upper: { name: 'Upper floor', rooms: [['wardrobe', 120, 790, 'Wardrobe'], ['ledger', 810, 1140, 'Ledger room'], ['bridge-tower', 1140, 1480, 'Bridge tower']] },
    ground: { name: 'Ground floor', rooms: [['gate', 120, 460, 'Main gate'], ['hall', 460, 790, 'Great hall'], ['post-room', 810, 1140, 'Post room'], ['tavern', 1140, 1480, 'Tavern']] },
    cellars: { name: 'Cellars', rooms: [['archive', 120, 460, 'Archive'], ['strongroom', 460, 790, 'Strongroom'], ['barracks', 810, 1480, 'Barracks']] }
  };
  WW.CASTLE = C;
  WW.FLOOR_W = FW;
  // Stairs and lifts. `needs` names the unlock a quest gives (doc: Castle shortcuts).
  const LINKS = [
    { id: 'stair-left', x: 70, joins: ['ground', 'upper', 'towers'] },
    { id: 'stair-right', x: 1530, joins: ['cellars', 'ground', 'upper'] },
    { id: 'cellar-stair', x: 150, joins: ['cellars', 'ground'], needs: 'cellar-stair' },
    { id: 'back-stair', x: 1450, joins: ['upper', 'towers'], needs: 'back-stair' },
    { id: 'hoist', x: 800, joins: ['towers', 'upper', 'ground', 'cellars'], needs: 'hoist', lift: true }
  ];
  WW.LINKS = LINKS;
  let synced = false;
  // Town forks follow the painted ramps (WATCH_ART.town.ramps, lower end first), so the art can move a climb and the
  // fork spots on both roads move with it.
  let rampsSynced = false;
  function rampSync() {
    const R = typeof window !== 'undefined' && window.WATCH_ART && window.WATCH_ART.town && window.WATCH_ART.town.ramps;
    if (rampsSynced || !R) return;
    rampsSynced = true;
    R.forEach(r => {
      const [lo, lx] = r.from, [hi, hx] = r.to;
      const up = T[lo] && T[lo].spots.find(v => v.kind === 'fork' && v.to.scene === hi && !v.moved);
      const dn = T[hi] && T[hi].spots.find(v => v.kind === 'fork' && v.to.scene === lo && !v.moved);
      if (up) { up.x = lx; up.to.x = hx; up.moved = 1; }
      if (dn) { dn.x = hx; dn.to.x = lx; dn.moved = 1; }
    });
    Object.values(T).forEach(t => t.spots.sort((p, q) => p.x - q.x));
  }
  WW.rampSync = rampSync;
  function artSync() {
    rampSync();
    if (synced) return;
    const F = typeof window !== 'undefined' && window.WATCH_ART && window.WATCH_ART.floors;
    if (!F || !F.ground || !F.ground.rooms) return;
    synced = true;
    FW = F.ground.width || FW; WW.FLOOR_W = FW;
    Object.keys(C).forEach(f => {
      const a = F[f]; if (!a || !a.rooms) return;
      const names = Object.fromEntries(C[f].rooms.map(r => [r[0], r[3]]));
      C[f].rooms = a.rooms.map(([id, x0, x1]) => [id, x0, x1, names[id] || id]);
      C[f].doors = a.doors || {};
    });
    const L = F.ground.links || {};
    LINKS.forEach(l => { if (L[l.id] != null) l.x = L[l.id]; });
    if (L['bridge-door'] != null) BRIDGE_X = L['bridge-door'];
    const g = C.ground.rooms.find(r => r[0] === 'gate');
    if (g) { EXIT_X = g[1] + 50; WW.ENTRY_X = g[1] + 100; T['west-road'].spots.find(v => v.id === 'pell-gate').to.x = WW.ENTRY_X; }   // the main gate is in the gate room, clear of the hoist shaft
    if (g) OUTPOST_X = Math.round((g[1] + g[2]) / 2) + 20;   // in the gate room, clear of the doors
    const op = T['main-street'].spots.find(v => v.id === 'outpost'); if (op) op.to.x = OUTPOST_X;
  }
  WW.artSync = artSync;

  // Every scene, by id: town levels by level id, castle floors as castle:<floor>, plus the bridge.
  WW.scene = function (id) {
    artSync();
    if (T[id]) return { id, kind: 'town', name: T[id].name, from: T[id].from, to: T[id].to, spots: T[id].spots };
    if (id === 'bridge') return { id, kind: 'bridge', name: 'The bridge', from: 40, to: 900, spots: [
      { id: 'bridge-door', x: 40, kind: 'travel', label: 'Back to the bridge tower', to: { scene: 'castle:upper', x: BRIDGE_X - 30 }, dir: 'use' },
      { id: 'neighbour-door', x: 880, kind: 'fix', fix: 'door', label: 'The neighbour\'s door (their account: you can\'t go in)' }
    ] };
    const m = /^castle:(\w+)$/.exec(id);
    if (m && C[m[1]]) {
      const f = m[1], spots = [];
      LINKS.forEach(l => { if (l.joins.includes(f)) spots.push({ id: l.id, x: l.x, kind: l.lift ? 'lift' : 'stair', label: l.lift ? 'Supply hoist' : 'Stairs', link: l, needs: l.needs }); });
      C[f].rooms.forEach(([rid, a, b, name], i) => {
        spots.push({ id: 'room-' + rid, x: (a + b) / 2, kind: 'room', room: rid, label: name });
        if (i > 0) spots.push({ id: 'door-' + rid, x: (C[f].doors || {})[rid] != null ? C[f].doors[rid] : a, kind: 'door', room: rid, label: name + ' door' });
      });
      if (f === 'upper') spots.push({ id: 'bridge-exit', x: BRIDGE_X, kind: 'travel', label: 'Out onto the bridge', to: { scene: 'bridge', x: 60 }, dir: 'use' });
      if (f === 'ground') spots.push({ id: 'outpost-back', x: OUTPOST_X, kind: 'travel', label: 'Outpost door to Main Street', to: { scene: 'main-street', x: 1335 }, dir: 'use', dawn: true, needs: 'outpost' });
      if (f === 'ground') spots.push({ id: 'castle-exit', x: EXIT_X, kind: 'travel', label: 'Down to the town', to: { scene: 'west-road', x: 3240 }, dir: 'use', dawn: true });
      return { id, kind: 'castle', floor: f, name: C[f].name, from: 30, to: FW - 10, spots: spots.sort((p, q) => p.x - q.x) };
    }
    return null;
  };
  WW.roomAt = function (floor, x) {
    artSync();
    const r = C[floor] && C[floor].rooms.find(([, a, b]) => x >= a && x <= b);
    return r ? r[0] : null;
  };

  // ---- A walker in the world ----
  // st: { scene, x, facing (1 right, -1 left), moving, unlocks: { chute, tunnel, ... }, phase: 'day' | 'night' }
  WW.create = function (o) {
    o = o || {};
    return { scene: o.scene || 'main-street', x: o.x != null ? o.x : 560, facing: 1, moving: false, walk: 0,
      unlocks: Object.assign({}, o.unlocks || {}), phase: o.phase || 'day', night: o.night || 1 };
  };
  WW.step = function (st, dt, input) {
    const sc = WW.scene(st.scene); if (!sc) return st;
    const dir = (input && input.right ? 1 : 0) - (input && input.left ? 1 : 0);
    st.moving = !!dir;
    if (dir) { st.facing = dir; st.x = Math.max(sc.from, Math.min(sc.to, st.x + dir * WW.SPEED * dt)); st.walk += dt; }
    return st;
  };
  // What can be used from here: the nearest spot within reach, with whether it's open and what pressing does.
  WW.near = function (st) {
    const sc = WW.scene(st.scene); if (!sc) return null;
    let best = null;
    sc.spots.forEach(s => { const d = Math.abs(s.x - st.x); if (d <= WW.REACH && (!best || d < best.d)) best = { spot: s, d }; });
    return best && best.spot;
  };
  WW.open = function (st, s) {
    if (!s) return false;
    if (s.needs && !st.unlocks[s.needs]) return false;
    if (s.kind === 'gate') return st.phase === 'dusk' || st.phase === 'night' || (st.phase === 'day' && !!s.dusk);   // by day, the castle gate ends the day early (Ladi, Nov 18)
    if (s.dawn) return st.phase !== 'night' || st.night === 9;   // the Long Night spans town and castle
    return true;
  };
  // The moves available at the current spot: [{ key: 'up' | 'down' | 'use', to: { scene, x }, label }].
  WW.moves = function (st) {
    const s = WW.near(st); if (!s) return [];
    const out = [];
    if ((s.kind === 'fork' || s.kind === 'travel' || s.kind === 'gate') && s.to) {
      if (WW.open(st, s)) out.push({ key: s.dir === 'use' ? 'use' : s.dir, to: s.to, label: s.kind === 'gate' && st.phase === 'day' ? 'End the day early' : s.label, via: s.id });
    }
    if ((s.kind === 'stair' || s.kind === 'lift') && WW.open(st, s)) {
      const l = s.link, f = WW.scene(st.scene).floor, i = WW.FLOORS.indexOf(f);
      if (l.lift) {
        l.joins.filter(g => g !== f).forEach(g => out.push({ key: 'floor:' + g, to: { scene: 'castle:' + g, x: l.x }, label: 'Hoist to the ' + C[g].name.toLowerCase(), via: l.id }));
      } else {
        const up = WW.FLOORS[i - 1], dn = WW.FLOORS[i + 1];
        if (up && l.joins.includes(up)) out.push({ key: 'up', to: { scene: 'castle:' + up, x: l.x }, label: 'Up to the ' + C[up].name.toLowerCase(), via: l.id });
        if (dn && l.joins.includes(dn)) out.push({ key: 'down', to: { scene: 'castle:' + dn, x: l.x }, label: 'Down to the ' + C[dn].name.toLowerCase(), via: l.id });
      }
    }
    return out;
  };
  WW.go = function (st, key) {
    const m = WW.moves(st).find(v => v.key === key);
    if (!m) return null;
    st.scene = m.to.scene; st.x = m.to.x; st.moving = false;
    return m;
  };
  // Shortest walk between two places, as a list of scene ids (breadth-first over forks, stairs and shortcuts).
  // Used by the checks (every place reachable) and by the night-9 hint arrow.
  WW.route = function (from, to, unlocks, phase) {
    const seen = { [from.scene]: true }, q = [[from.scene]];
    while (q.length) {
      const path = q.shift(), here = path[path.length - 1];
      if (here === to) return path;
      const sc = WW.scene(here);
      sc.spots.forEach(s => {
        const st = { scene: here, x: s.x, unlocks: unlocks || {}, phase: phase || 'night' };
        WW.moves(st).forEach(m => { if (!seen[m.to.scene]) { seen[m.to.scene] = true; q.push(path.concat(m.to.scene)); } });
      });
    }
    return null;
  };

  // ---- Weather (doc: Weather table; fixed per day) ----
  WW.WEATHER = { day: { 3: 'wind', 5: 'rain', 7: 'mist' }, night: { 4: 'fog', 5: 'rain', 6: 'storm', 9: 'clear' } };
  WW.weather = (n, phase) => (phase === 'day' ? WW.WEATHER.day[n] : WW.WEATHER.night[n]) || 'clear';

  // ---- Wildlife (doc: A living town). Spawn tables by scene: [kind, zone from, zone to, day | night | both] ----
  WW.FAUNA = {
    'west-road': [['horse', 2820, 2960, 'day'], ['horse', 2840, 2980, 'day'], ['crow', 1860, 1980, 'day'], ['rabbit', 900, 1200, 'day'], ['owl', 1400, 1480, 'night'], ['moth', 3220, 3300, 'night']],
    'hill-road': [['pigeon', 1380, 1520, 'day'], ['pigeon', 1400, 1500, 'day'], ['cat', 1840, 1940, 'day'], ['goat', 3640, 3800, 'day'], ['bat', 1300, 3800, 'night']],
    'main-street': [['chicken', 1380, 1520, 'day'], ['chicken', 1360, 1540, 'day'], ['dog', 2300, 2520, 'day'], ['cat', 1960, 2040, 'day'], ['sparrow', 600, 1200, 'day'], ['fox', 700, 900, 'night'], ['moth', 2000, 2080, 'night']],
    'far-lane': [['duck', 2300, 2900, 'day'], ['duck', 2400, 3000, 'day'], ['heron', 2560, 2660, 'day'], ['bee', 1000, 1260, 'day'], ['firefly', 980, 1280, 'night'], ['frog', 3540, 3660, 'night']],
    'castle:ground': [['dove', 480, 780, 'both'], ['cat', 200, 1400, 'night']],
    'castle:cellars': [['rat', 140, 1460, 'night'], ['rat', 300, 1300, 'night']],
    'castle:towers': [['bat', 140, 1460, 'night']],
    'castle:upper': []
  };
  const FLIERS = { crow: 1, pigeon: 1, sparrow: 1, owl: 1, bat: 1, moth: 1, bee: 1, firefly: 1, dove: 1, heron: 0 };
  // A small seeded random so a scene's animals start the same every visit (and the checks are repeatable).
  const rng = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  WW.spawn = function (sceneId, phase, weather, seed) {
    const r = rng(seed || 7), night = phase === 'night' || phase === 'dusk';
    return (WW.FAUNA[sceneId] || []).filter(([, , , when]) => when === 'both' || (when === 'night') === night).slice(0, 8).map(([kind, a, b], i) => ({
      kind, a, b, x: a + r() * (b - a), facing: r() < 0.5 ? -1 : 1, state: 'idle', t: r() * 2, flier: !!FLIERS[kind],
      sheltered: weather === 'rain' || weather === 'storm', id: sceneId + ':' + i, r
    }));
  };
  // One tick for every animal: wander, idle, scatter from the player, shelter in rain (stay still, tucked in).
  WW.animals = function (list, dt, playerX) {
    list.forEach(a => {
      a.t -= dt;
      const near = Math.abs(a.x - playerX) < 70;
      if (a.sheltered) { a.state = a.flier ? 'perch' : 'sleep'; return; }
      if (near && a.state !== 'run' && a.state !== 'fly') { a.state = a.flier ? 'fly' : 'run'; a.facing = a.x < playerX ? -1 : 1; a.t = 0.8; }
      if (a.t <= 0) {
        const roll = a.r();
        a.state = roll < 0.45 ? 'idle' : roll < 0.85 ? 'walk' : (a.flier ? 'perch' : 'idle');
        if (a.state === 'walk') a.facing = a.r() < 0.5 ? -1 : 1;
        a.t = 1 + a.r() * 2.5;
      }
      const v = a.state === 'walk' ? 26 : a.state === 'run' ? 120 : a.state === 'fly' ? 150 : 0;
      a.x += a.facing * v * dt;
      if (a.x < a.a) { a.x = a.a; a.facing = 1; }
      if (a.x > a.b) { a.x = a.b; a.facing = -1; }
    });
    return list;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = WW;
  if (root && root.SD) root.SD.watchWorld = WW;
})(typeof window !== 'undefined' ? window : null);
