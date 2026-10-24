#!/usr/bin/env node
// Lens check: the Version Lens's cost (js/lens.js) on a stubbed page, with the clock driven by hand. Checks that a
// look costs one of L.MAX, that spent looks come back one at a time after L.COOL seconds, that a look's L.LOOK
// seconds only run while the player can walk, that it never closes on ground only the lens holds up, that an empty
// tap teaches the 503 once and then only says how long, that it's free until the map says it costs, and that the
// menu's unlimited setting turns the cost off.
//   node tools/lens_check.js          exit 1 on any failure
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

const el = () => ({ style: { setProperty() {} }, classList: { toggle() {}, add() {}, remove() {} }, querySelector: () => null, offsetWidth: 0 });
const notes = [], sfx = [];
const ctx = {
  console, Math, String,
  document: { createElement: () => ({}), head: { appendChild() {} }, getElementById: () => el() },
  SD: { state: { save: {}, persist() {} }, ui: { esc: s => s, system: (t, b) => notes.push(t), panel: () => el(), closePanel() {} }, audio: { sfx: k => sfx.push(k) } }
};
ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/lens.js'), 'utf8'), ctx, { filename: 'js/lens.js' });
const L = ctx.SD.lens;

let fails = 0;
const ok = (cond, what) => { if (!cond) { fails++; console.log('FAIL ' + what); } };
const world = { on: false, idle: false, hold: false, costs: true, dry: 0 };
const c = L.make({ mode: 'VERSIONS', on: () => world.on, set: v => { world.on = v; }, costs: () => world.costs,
  idle: () => world.idle, hold: () => world.hold, changed() {}, dry: () => { world.dry++; } });
const run = (secs, step = 0.1) => { for (let t = 0; t < secs - 1e-9; t += step) c.tick(step); };
const s = L.state();

// Free until the map says it costs.
world.costs = false;
ok(c.open() && world.on && s.n === L.MAX, 'a free look spends nothing');
run(L.LOOK + 5);
ok(world.on, 'a free look never times out');
c.close(); world.costs = true;

// A look costs one, and lasts L.LOOK seconds of walking.
ok(c.open() && s.n === L.MAX - 1, 'opening spends one look');
run(L.LOOK - 1);
ok(world.on, 'still open just before the look runs out');
world.idle = true; run(20); world.idle = false;
ok(world.on, 'the clock stops while the player can\'t walk');
world.hold = true; run(3);
ok(world.on, 'it never closes on ground only the lens holds up');
world.hold = false; c.tick(0.1);
ok(!world.on, 'it closes once back on solid ground');

// Spent looks come back one at a time.
c.open(); c.close();
const before = s.n, wait = s.cd;
ok(before < L.MAX && wait > 1, 'a spent look is on its cooldown');
run(wait - 0.5);
ok(s.n === before, 'no look back before the cooldown');
run(1);
ok(s.n === before + 1, 'one look back after the cooldown');

// Run it dry: the first empty tap teaches, the next only says how long.
while (s.n > 0) { c.open(); c.close(); }
ok(!c.open() && world.dry === 1, 'the first empty tap teaches the 503');
const n0 = notes.length;
ok(!c.open() && world.dry === 1 && notes.length === n0 + 1 && notes[n0] === '503 SLOW DOWN', 'later empty taps just say when the next look is back');
run(L.COOL + 0.2);
ok(s.n === 1 && c.open(), 'an empty lens always comes back, given time');
c.close();
run(L.COOL * L.MAX + 1);
ok(s.n === L.MAX && s.cd === 0, 'the pool refills to full and stops');

// The menu's unlimited setting.
ctx.SD.state.save.lensFree = true;
const n1 = s.n;
ok(c.open() && s.n === n1, 'unlimited: opening spends nothing');
run(L.LOOK + 5);
ok(world.on, 'unlimited: no time limit');
c.close(); ctx.SD.state.save.lensFree = false;

console.log(fails ? `${fails} lens check(s) failed` : 'Lens check passed');
process.exit(fails ? 1 : 0);
