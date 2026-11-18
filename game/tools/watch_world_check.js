// Pure-logic check of the Night Watch's world (js/watch-world.js): every town level and castle floor is reachable,
// shortcuts open only after their quests (the chute is down only, the tunnel both ways), the castle's gate to the
// hill opens only at dusk, the quest stairs and the hoist join the right floors, and wildlife stays in its zone.
// Run from game/:  node tools/watch_world_check.js
const WW = require('../js/watch-world.js');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const from = { scene: 'main-street' };

WW.LEVELS.forEach(l => check(!!WW.route(from, l, {}, 'day'), `by day, ${l} is reachable from Main Street`));
check(!WW.route(from, 'castle:ground', {}, 'day'), 'by day, the castle is shut');
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
check(floorKeys('ground', 70) === 'up', 'left stair from the ground floor goes up only');
check(floorKeys('upper', 70) === 'down,up', 'left stair from the upper floor goes up and down');
check(floorKeys('cellars', 1530) === 'up' && floorKeys('upper', 1530) === 'down', 'right stair joins cellars to upper');
check(floorKeys('ground', 150) === '' && floorKeys('ground', 150, { 'cellar-stair': 1 }) === 'down', 'the cellar stair opens with Dutch\'s quest');
check(floorKeys('upper', 1450, { 'back-stair': 1 }) === 'up' && floorKeys('towers', 1450, { 'back-stair': 1 }) === 'down', 'the back stair joins upper and towers');
check(floorKeys('ground', 800) === '', 'the hoist is chained before the Captain\'s quest');
check(floorKeys('ground', 800, { hoist: 1 }) === 'floor:cellars,floor:towers,floor:upper', 'the hoist stops at every other floor');
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

// With the castle art loaded, floors are 1200 wide and rooms, doors and stairs come from WATCH_ART.floors.
global.window = global.window || {}; require('../js/watch-art.js'); WW.artSync();
const AF = window.WATCH_ART.floors, AL = AF.ground.links;
check(WW.FLOOR_W === AF.ground.width && WW.scene('castle:ground').to === AF.ground.width - 10, 'castle floors take their width from the art');
check(floorKeys('cellars', AL['stair-right']) === 'up' && floorKeys('upper', AL['stair-right']) === 'down', 'right stair sits where the art draws it');
check(floorKeys('upper', AL['back-stair'], { 'back-stair': 1 }) === 'up', 'back stair sits where the art draws it');
check(WW.scene('castle:ground').spots.find(s => s.id === 'door-hall').x === AF.ground.doors.hall, 'doors sit where the art draws them');
{ // spots used with the same key (●) must be far enough apart that the nearest one is clearly the one you mean
  const useKey = v => v.kind !== 'room' && v.kind !== 'stair', bad = [];
  WW.FLOORS.forEach(f => { const sp = WW.scene('castle:' + f).spots.filter(useKey); sp.forEach((a, i) => sp.slice(i + 1).forEach(b => { if (Math.abs(a.x - b.x) < 30) bad.push(f + ':' + a.id + '/' + b.id); })); });
  check(!bad.length, 'no two spots used with the same key are on top of each other' + (bad.length ? ' (' + bad.join(', ') + ')' : ''));
}

console.log(fails.length ? `\n${fails.length} failed` : '\nall ok');
process.exit(fails.length ? 1 : 0);
