// Mira's Kitchen's balance (js/kitchen-core.js), headless. Each order is beaten by the recipe it teaches, the card it
// starts from doesn't get 3 stars, "turn everything up" doesn't get 3 stars where the bill matters, and every knob an
// order opens changes the result for at least one of its settings (no dead knobs).
// Run from game/:  node tools/kitchen_sim.js      VERBOSE=1 prints each order's par and star spread.
const K = require('../js/kitchen-core.js');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const V = !!process.env.VERBOSE;

// The recipe each order teaches.
const INTENDED = {
  breakfast: { ret: 'proxy', prep: 'outside' },
  pantry: { mem: 1024, timeout: 10, dest: true },
  kitchens: { env: true },
  banquet: { pc: 'alias5' },
  rush: { mem: 1024, timeout: 10, prep: 'outside', ret: 'proxy', dest: true, env: true, pc: 'alias5' }
};
const MAX = { mem: 10240, timeout: 900, prep: 'outside', ret: 'proxy', dest: true, env: true, pc: 'alias10' };
const stars = (id, c) => K.stars(id, K.fire(id, K.cfg(id, c)));

K.ROUTE.forEach(id => {
  const o = K.ORDERS[id], par = K.par(id);
  check(!!par, `${o.name}: has a 3-star recipe`);
  check(stars(id, INTENDED[id]) === 3, `${o.name}: the recipe it teaches gets 3 stars`);
  check(stars(id, {}) <= 2, `${o.name}: its starting card doesn't (${stars(id, {})})`);
  const max = {}; o.knobs.forEach(k => { max[k] = MAX[k]; });
  if (['pantry', 'banquet', 'rush'].includes(id)) check(stars(id, max) < 3, `${o.name}: turning everything up isn't 3 stars (${stars(id, max)})`);
  o.knobs.forEach(k => {
    const vals = K.KNOBS[k].opts.map(v => stars(id, Object.assign({}, INTENDED[id], { [k]: v })));
    check(new Set(vals).size > 1, `${o.name}: the ${K.KNOBS[k].name} knob matters (${vals.join(' ')})`);
  });
  const all = K.recipes(id).map(c => K.stars(id, K.fire(id, c)));
  const three = all.filter(x => x === 3).length;
  if (V) console.log(`     ${id}: par ${par && par.bill} GB-s · ${all.length} recipes · 3★ ${three} · 2★ ${all.filter(x => x === 2).length} · 1★ ${all.filter(x => x === 1).length} · 0★ ${all.filter(x => x === 0).length}`);
  check(three <= Math.max(2, all.length * 0.05), `${o.name}: 3 stars is a real find (${three} of ${all.length} recipes)`);
});

// The facts the rules rest on.
const P = K.fire('pantry', K.cfg('pantry', { mem: 1024, timeout: 10, dest: false }));
check(P.plates.find(p => p.stuck).tries === 3 && P.plates.find(p => p.stuck).out === 'lost', 'an async event that keeps failing is tried 3 times, then dropped with no destination');
check(K.fire('pantry', K.cfg('pantry', { mem: 1024, timeout: 10, dest: true })).plates.find(p => p.stuck).out === 'kept', 'an on-failure destination keeps it');
check(K.fire('breakfast', K.cfg('breakfast', { ret: 'body' })).counts['502'] === 6, 'a proxy integration that gets just the dish answers 502');
check(K.fire('banquet', K.cfg('banquet', { pc: 'latest5' })).refused === 'refused', 'provisioned concurrency on $LATEST is refused');
const slow = K.fire('pantry', K.cfg('pantry', { mem: 512, timeout: 30, dest: true })).plates[1].d, fast = K.fire('pantry', K.cfg('pantry', { mem: 1024, timeout: 30, dest: true })).plates[1].d;
check(fast * 2 === slow, `twice the memory, half the time on CPU-bound work (${slow} s → ${fast} s)`);
const inside = K.fire('breakfast', K.cfg('breakfast', { ret: 'proxy', prep: 'inside' })).plates, outside = K.fire('breakfast', K.cfg('breakfast', { ret: 'proxy', prep: 'outside' })).plates;
check(inside[0].d === outside[0].d && outside[1].d < inside[1].d, 'a cold start costs the same either way; outside the handler, warm calls skip the setup');

// A whole night with the taught recipes, through the night's own steps.
const s = K.newNight({});
K.ROUTE.forEach(id => { K.fireNight(s, INTENDED[id]); K.serve(s); K.next(s); });
check(s.phase === 'end' && K.total(s) === 15, `a night on the taught recipes ends with 15 stars (${K.total(s)})`);
const seen = new Set();
K.ROUTE.forEach(id => [{}, INTENDED[id]].forEach(c => K.fire(id, K.cfg(id, c)).events.forEach(e => seen.add(e))));
const unseen = Object.keys(K.TEACH).filter(e => !seen.has(e) && e !== 'bill' && e !== 'refused');
check(!unseen.length, `every line Mira teaches shows up on a starting card or a taught recipe${unseen.length ? ': missing ' + unseen.join(', ') : ''}`);

console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll kitchen checks passed.');
process.exit(fails.length ? 1 : 0);
