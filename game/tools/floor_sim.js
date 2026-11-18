// The Sorting Floor's balance (js/floor-core.js on js/aws-sim.js), headless. Design rule P2 ("water finds a crack"):
// each claim is beaten by its intended architecture and punishes at least one lazy build, and no lazy build is
// close to best everywhere. Then whole nights with three policies.
// Run from game/:  node tools/floor_sim.js      VERBOSE=1 prints every build's spill.
const F = require('../js/floor-core.js');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const V = !!process.env.VERBOSE;

// The intended build per claim (what the claim teaches), with its knobs.
const INTENDED = {
  rush: [['stdq'], { vis: 1, batch: 2 }],
  bell: [['reserve'], {}],
  poison: [['stdq', 'dlq', 'partial'], { vis: 1, batch: 2 }],
  double: [['stdq', 'condwrite'], { vis: 2, batch: 2 }],
  ledger: [['fifo'], { vis: 2, batch: 1 }],
  crowd: [['sns', 'filter'], {}],
  regulars: [['cache', 'gsi'], {}],
  hunch: [['stdq', 'sns', 'filter', 'dlq', 'condwrite', 'shard'], { vis: 2, batch: 2 }]
};
const LAZY = { none: [], queue: ['stdq'], reserve: ['reserve'], backoff: ['backoff'], fanout: ['sns'], 'queue+ledger': ['stdq', 'condwrite'] };
const claims = Object.keys(F.CLAIMS).filter(id => !F.CLAIMS[id].boss && !F.CLAIMS[id].legacy);
const spill = (id, b, k) => F.simClaim(id, b, k || { vis: 1, batch: 2 }).spill;

const best = {};
claims.concat(['hunch']).forEach(id => {
  const [b, k] = INTENDED[id];
  best[id] = spill(id, b, k);
  const lz = Object.keys(LAZY).map(n => [n, spill(id, LAZY[n])]);
  if (V) console.log(`     ${id}: intended ${best[id]} · ` + lz.map(x => x.join(' ')).join(' · '));
  check(best[id] <= (id === 'hunch' ? 12 : 8), `${F.CLAIMS[id].name}: the intended build (${b.join(' + ')}) spills ${best[id]}`);
  const punished = lz.filter(x => x[1] >= best[id] + 10).map(x => x[0]);
  check(punished.length >= 2, `${F.CLAIMS[id].name}: lazy builds that spill 10+ more: ${punished.join(', ') || 'none'}`);
});
// No lazy build within 4 of the best on every claim.
Object.keys(LAZY).forEach(n => {
  const close = claims.filter(id => spill(id, LAZY[n]) <= best[id] + 4);
  check(close.length < claims.length, `"${n}" isn't close to best everywhere (close on ${close.length} of ${claims.length})`);
});
check(spill('bell', ['stdq']) >= 30, 'a queue in front of callers waiting for an answer is the worst build there');
check(spill('crowd', ['sns']) > spill('crowd', ['sns', 'filter']) + 10, 'Fan-Out without a filter policy spills; with one, it doesn\'t');
check(spill('crowd', ['eb']) === spill('crowd', ['sns', 'filter']), 'an EventBridge rule and a filtered Fan-Out both work on the Crowd');
check(spill('double', ['stdq', 'condwrite'], { vis: 1, batch: 2 }) > spill('double', ['stdq', 'condwrite'], { vis: 2, batch: 2 }) ||
  spill('double', ['fifo'], { vis: 1, batch: 2 }) > spill('double', ['fifo'], { vis: 2, batch: 2 }), 'a short visibility timeout costs on heavy tickets');
check(spill('regulars', ['cache']) > spill('regulars', ['cache', 'gsi']), 'on the Regulars, the cache alone still scans for the status lookups; a GSI makes them Queries');
check(spill('regulars', ['gsi']) > spill('regulars', ['cache', 'gsi']) + 5, 'without the door cache, the repeated price checks bounce');
{ const a = F.simClaim('regulars', ['cache', 'gsi']).counts, b = F.simClaim('regulars', ['cache']).counts;
  check(a.cached > 0 && !a.scanned && b.scanned > 0, `the cache answers repeats at the door (${a.cached}) and the GSI removes the scans (${b.scanned} without it)`); }
check(spill('hunch', ['stdq', 'sns', 'filter', 'dlq', 'condwrite']) > spill('hunch', ['stdq', 'sns', 'filter', 'dlq', 'condwrite', 'shard']), 'on the Hunch, the hot key costs until its writes are spread');

// Whole nights. smart: plays the claim's lesson pieces first, then any piece, then Mop; sets the knobs.
const playable = (s, pred) => { const f = s.fight; for (let h = 0; h < f.hand.length; h++) if (!F.why(s, h) && pred(s.deck[f.hand[h]])) return h; return -1; };
const POL = {
  smart: (s, cl) => {
    let h;
    while ((h = playable(s, e => cl.lesson.includes(e.id))) >= 0) F.play(s, h);
    while ((h = playable(s, e => F.CARDS[e.id].kind === 'piece')) >= 0) F.play(s, h);
    while ((h = playable(s, e => e.id === 'guard' || e.id === 'patch' || e.id === 'redrive')) >= 0) F.play(s, h);
    F.setVis(s, 2);
  },
  basics: s => { let h; while ((h = playable(s, e => e.id === 'guard' || e.id === 'patch')) >= 0) F.play(s, h); },
  queue: s => { let h; while ((h = playable(s, e => e.id === 'stdq' || e.id === 'guard' || e.id === 'patch')) >= 0) F.play(s, h); }
};
const nights = {};
Object.keys(POL).forEach(n => {
  const rs = [1, 2, 3, 4, 5].map(seed => F.simNight(POL[n], { seed }));
  const avg = Math.round(rs.reduce((a, r) => a + r.budget, 0) / rs.length);
  nights[n] = avg;
  console.log(`     night 1, ${n}: budget left ${rs.map(r => Math.max(0, r.budget)).join(', ')} (avg ${avg}), cleared ${rs.map(r => r.cleared).join(', ')}`);
});
check(nights.smart >= 30, `a player who builds for each claim ends night 1 with budget to spare (avg ${nights.smart}%)`);
check(nights.smart > nights.queue + 15 && nights.smart > nights.basics + 15, 'building the right architecture beats queue-always and basics-only by 15+');
const fork = [1, 2, 3].map(seed => F.simNight(POL.smart, { seed, night: 2, fork: true }));
check(fork.every(r => r.phase !== 'zero'), `night 2's other forks are survivable with the smart policy (${fork.map(r => r.budget).join(', ')})`);

console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll floor balance checks pass.');
process.exit(fails.length ? 1 : 0);
