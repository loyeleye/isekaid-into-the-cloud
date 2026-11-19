// Pure-logic check of the Night Watch's world (js/watch-world.js): every town level and castle floor is reachable,
// shortcuts open only after their quests (the chute is down only, the tunnel both ways), the castle's gate to the
// hill opens only at dusk, the stairs and the ladder join the right floors, and wildlife stays in its zone.
// Run from game/:  node tools/watch_world_check.js
const WW = require('../js/watch-world.js');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const from = { scene: 'main-street' };

WW.LEVELS.forEach(l => check(!!WW.route(from, l, {}, 'day'), `by day, ${l} is reachable from Main Street`));
{ // by day the castle gate is the early end of the day (the mode asks, then starts dusk); no other door opens
  const g = WW.TOWN['west-road'].spots.find(v => v.id === 'pell-gate'), ms = WW.moves({ scene: 'west-road', x: g.x, unlocks: {}, phase: 'day' });
  check(ms.length === 1 && ms[0].label === 'End the day early', 'by day, the castle gate offers to end the day early');
  const o = WW.TOWN['main-street'].spots.find(v => v.id === 'outpost');
  check(!WW.moves({ scene: 'main-street', x: o.x, unlocks: { outpost: 1 }, phase: 'day' }).length, 'by day, the watch outpost door stays shut');
}
WW.FLOORS.forEach(f => check(!!WW.route(from, 'castle:' + f, {}, 'dusk'), `at dusk, the castle ${f} is reachable`));
check(!!WW.route(from, 'bridge', {}, 'night'), 'the bridge is reachable from the upper floor');

const at = (scene, x, unlocks, phase) => WW.create({ scene, x, unlocks, phase });
const keys = st => WW.moves(st).map(m => m.key).sort().join(',');
check(keys(at('west-road', 1440, {})) === '', 'the lookout chute is shut before Fennel\'s quest');
check(keys(at('west-road', 1440, { chute: 1 })) === 'down', 'after the quest the chute goes down');
check(!WW.TOWN['far-lane'].spots.some(s => s.to && s.to.scene === 'west-road'), 'nothing on the Far Lane leads back up the chute');
check(keys(at('hill-road', 3720, { tunnel: 1 })) === 'down' && keys(at('far-lane', 3600, { tunnel: 1 })) === 'up', 'Seymour\'s tunnel runs both ways');
check(keys(at('far-lane', 3600, {})) === '', 'the tunnel is shut before Seymour\'s quest');

const floorKeys = (f, x, u) => keys(at('castle:' + f, x, u, 'night'));
// One stair per pair of floors (HD floors, Nov 19), and the ladder through the trapdoors, opened a stretch at a time.
check(floorKeys('cellars', 70, { 'cellar-stair': 1 }) === 'up' && floorKeys('ground', 70, { 'cellar-stair': 1 }) === 'down', 'the left stair joins the cellars and the ground floor');
check(floorKeys('ground', 1530) === 'up' && floorKeys('upper', 1530) === 'down', 'the right stair joins the ground and upper floors');
check(floorKeys('upper', 150) === 'up' && floorKeys('towers', 1450) === 'down', 'the back stair joins the upper floor and the towers, at its own x on each');
check(floorKeys('ground', 800) === '', 'the ladder is chained before any quest');
check(floorKeys('ground', 800, { 'cellar-stair': 1 }) === 'floor:cellars' && floorKeys('upper', 800, { 'cellar-stair': 1 }) === '', 'Dutch\'s quest opens the ladder from the ground floor to the cellars');
check(floorKeys('towers', 800, { 'back-stair': 1 }) === 'floor:upper' && floorKeys('ground', 800, { 'back-stair': 1 }) === '', 'Kai\'s quest opens the ladder from the upper floor to the towers');
check(floorKeys('ground', 800, { hoist: 1 }) === 'floor:cellars,floor:towers,floor:upper', 'the Captain\'s quest opens the ladder to every floor');
check(WW.roomAt('upper', 300) === 'wardrobe' && WW.roomAt('upper', 1300) === 'bridge-tower', 'the upper floor runs Wardrobe (big, left), Ledger, Bridge tower');

const st = at('main-street', 560, {});
WW.step(st, 100, { right: 1 });
check(st.x === 2960, 'walking stops at the end of the street');
WW.LEVELS.concat(WW.FLOORS.map(f => 'castle:' + f)).forEach(sc => WW.scene(sc).spots.forEach(s => check(s.x >= WW.scene(sc).from - 1 && s.x <= WW.scene(sc).to + 1, `${sc}: ${s.id} is inside the walkable range`)));

['day', 'night'].forEach(ph => WW.LEVELS.forEach(l => {
  const list = WW.spawn(l, ph, 'clear', 3);
  for (let i = 0; i < 600; i++) WW.animals(list, 1 / 30, 200 + i * 6);
  check(list.length <= 8 && list.every(a => a.x >= a.a && a.x <= a.b), `${l} ${ph}: ${list.length} animals stay in their zones`);
}));
const wet = WW.spawn('main-street', 'day', 'rain', 3); WW.animals(wet, 1, 0);
check(wet.every(a => a.state === 'sleep' || a.state === 'perch'), 'in rain the animals shelter');
check(WW.weather(3, 'day') === 'wind' && WW.weather(6, 'night') === 'storm' && WW.weather(9, 'night') === 'clear', 'the weather calendar matches the doc');

// With the castle art loaded (the HD floors in js/watch-art-castle.js replace the old ones), rooms, doors and stairs come from the art.
global.window = global.window || {}; require('../js/watch-art.js'); require('../js/watch-art-castle.js'); WW.artSync();
const AF = window.WATCH_ART.floors, L = f => AF[f].links;
check(AF.hd === 1 && WW.FLOOR_W === AF.ground.width && WW.scene('castle:ground').to === AF.ground.walls[1] - 34, 'castle floors take the HD art, its width and its end walls');
check(floorKeys('cellars', L('cellars')['stair-left'], { 'cellar-stair': 1 }) === 'up' && floorKeys('ground', L('ground')['stair-left'], { 'cellar-stair': 1 }) === 'down', 'the left stair sits where the art draws it, on both floors');
check(floorKeys('ground', L('ground')['stair-right']) === 'up' && floorKeys('upper', WW.linkX(WW.LINKS.find(l => l.id === 'stair-right'), 'upper')) === 'down', 'the right stair rises where the ground floor draws it');
// Ladi, Nov 19: both ends of every floor have a stair up and a stair down (the cellars only up, the towers only down).
// Three are blocked until a quest; they show but don't move you.
{ const ALL = { 'cellar-stair': 1, hoist: 1, 'back-stair': 1 }, W = WW.FLOOR_W / 2;
  const ends = (f, u) => { const out = { left: [], right: [] };
    WW.scene('castle:' + f).spots.filter(s => s.kind === 'stair').forEach(s => out[s.x < W ? 'left' : 'right'].push(floorKeys(f, s.x, u))); return out; };
  const want = { towers: ['down'], upper: ['down', 'up'], ground: ['down', 'up'], cellars: ['up'] };
  WW.FLOORS.forEach(f => { const e = ends(f, ALL);
    check(['left', 'right'].every(k => e[k].slice().sort().join() === want[f].join()), `${f}: each end has ${want[f].join(' and ')} once the quests are done`); });
  const shut = WW.LINKS.filter(l => l.needs);
  check(shut.length === 2 && shut.map(l => l.id).sort().join() === 'east-tower-stair,stair-left' && shut.every(l => l.joins.every(f => floorKeys(f, WW.linkX(l, f)) === '')), 'the two blocked stairs (near cellar stair, far tower stair) are shut before their quests');
  check(shut.every(l => l.joins.every(f => floorKeys(f, WW.linkX(l, f), { [l.needs]: 1 }) !== '')), 'each blocked stair opens with its quest');
  check(shut.every(l => l.joins.every(f => /^Blocked stair (up|down) to the /.test(WW.scene('castle:' + f).spots.find(s => s.id === l.id).label))), 'a blocked stair says where it goes');
  const lft = WW.LINKS.filter(l => !l.lift).every(l => l.joins.every(f => (WW.linkX(l, f) < W) === (WW.linkX(l, l.joins[0]) < W)));
  check(lft, 'every stair stays on its side: a left stair lands you on the left of the next floor'); }
WW.FLOORS.forEach(f => { const sc = WW.scene('castle:' + f), w = AF[f].walls, st = at('castle:' + f, 300, {});
  WW.step(st, 100, { right: 1 }); const r = st.x; WW.step(st, 100, { left: 1 });
  check(r < w[1] - 20 && st.x > w[0] + 10, `${f}: she stops at the end walls (${Math.round(st.x)} to ${Math.round(r)})`); });
check(floorKeys('upper', L('upper')['back-stair']) === 'up' && floorKeys('towers', L('towers')['back-stair']) === 'down', 'the back stair sits where the art draws it');
{ const m = WW.moves(at('castle:ground', L('ground')['stair-left'], { 'cellar-stair': 1 }, 'night'))[0];
  check(m && m.to.x === L('cellars')['stair-left'], 'taking a stair lands you on that stair on the next floor'); }
check(floorKeys('ground', L('ground').ladder, { hoist: 1 }) === 'floor:cellars,floor:towers,floor:upper', 'the ladder sits on the trapdoors');
check(WW.scene('castle:upper').spots.some(s => s.id === 'door-wardrobe' && s.popup && s.x === AF.upper.doors.wardrobe), 'archway rooms are doorways that open a popup');
check(WW.roomAt('cellars', AF.cellars.doors.tavern) === 'tavern' && !WW.CASTLE.ground.rooms.some(r => r[0] === 'tavern'), 'the tavern is in the cellars now');
{ // spots used with the same key (●) must be far enough apart that the nearest one is clearly the one you mean
  const useKey = v => v.kind !== 'room' && v.kind !== 'stair' && !v.popup, bad = [];   // a popup doorway is used with ● only to walk in
  WW.FLOORS.forEach(f => { const sp = WW.scene('castle:' + f).spots.filter(useKey); sp.forEach((a, i) => sp.slice(i + 1).forEach(b => { if (Math.abs(a.x - b.x) < 30) bad.push(f + ':' + a.id + '/' + b.id); })); });
  check(!bad.length, 'no two spots used with the same key are on top of each other' + (bad.length ? ' (' + bad.join(', ') + ')' : ''));
}

console.log(fails.length ? `\n${fails.length} failed` : '\nall ok');
process.exit(fails.length ? 1 : 0);
