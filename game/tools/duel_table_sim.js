// Plays the Counterfeit Table (js/duel-core.js) headless, to check the design's exploit rules (P2) and difficulty (P3):
//   - play that knows the rules wins about 3 in 4 Cups;
//   - "always call" and "never call" both win under 35% of Cups, and so do placing pins at random and guessing half.
// A policy "knows" a test with chance p: right about whether a pin does a job, otherwise a coin flip.
// Run from game/:  node tools/duel_table_sim.js      NIGHTS=2000 HONEST=0.45 node tools/duel_table_sim.js
const T = require('../js/duel-core.js');
const NIGHTS = +(process.env.NIGHTS || 2000);
if (process.env.HONEST) T.HONEST = +process.env.HONEST;

function mkRng(seed) { const st = { seed }; return T.rng(st); }
const empties = b => b.cells.map((x, i) => (x ? -1 : i)).filter(i => i >= 0);
// A square's worth to you (the same shape as the old Cup's greedy placement).
function sqScore(b, i) {
  const t = b.cells.slice(); t[i] = 'me';
  if (T.line(t, 'me')) return 100;
  const cnt = (c, l, w) => l.filter(k => c[k] === w).length;
  let v = T.HARD.includes(i) ? 4 : 0;
  v += T.LINES.filter(l => l.includes(i) && cnt(b.cells, l, 'him') === 0).length * 3;
  v += T.LINES.filter(l => l.includes(i) && cnt(t, l, 'me') === 2 && cnt(t, l, 'him') === 0).length * 8;
  const h = b.cells.slice(); h[i] = 'him';
  if (T.line(h, 'him')) v += 60;
  return v;
}
function policyMove(s, pol, R) {
  const b = s.b, open = b.open;
  const believe = (pin, job) => { const truth = T.test(pin, job).ok; return R() < pol.p ? truth : R() < 0.5; };
  const sqs = empties(b);
  if (pol.kind === 'always') return open >= 0 ? { call: true } : sqs.length ? { pin: b.hand[0], sq: sqs[0] } : { stand: true };
  if (pol.kind === 'never' || pol.kind === 'random') {
    if (!sqs.length) return { stand: true };
    const sq = pol.kind === 'random' ? sqs[Math.floor(R() * sqs.length)] : sqs.sort((a, z) => sqScore(b, z) - sqScore(b, a))[0];
    return { pin: b.hand[Math.floor(R() * b.hand.length)], sq };
  }
  // Knows the rules (to p): call his pin when it looks fake; else place the pin that looks right on the best square.
  const fakeLooks = open >= 0 && !believe(b.pins[open], b.jobs[open]);
  if (fakeLooks) return { call: true };
  const opts = [];
  sqs.forEach(sq => b.hand.forEach(pin => { if (believe(pin, b.jobs[sq])) opts.push({ pin, sq, v: sqScore(b, sq) }); }));
  if (opts.length) { opts.sort((a, z) => z.v - a.v); return { pin: opts[0].pin, sq: opts[0].sq }; }
  if (open >= 0) return { call: true };
  if (!sqs.length) return { stand: true };
  return { pin: b.hand[0], sq: sqs[0] };
}
function night(pol, seed) {
  const R = mkRng(seed * 7 + 1);
  const s = T.newNight({ night: 4, seed });
  T.startBoard(s, T.offers(s)[0]);
  let guard = 0, decisions = 0, billQ = 0;
  while (++guard < 200) {
    if (s.phase === 'board') {
      const a = policyMove(s, pol, R);
      const r = T.act(s, a);
      if (!r) T.act(s, { stand: true });
      decisions++; s.secs += 40;
      T.after(s);
    } else if (s.phase === 'bill') {
      billQ++; s.secs += 90;
      T.paid(s, { ok: R() < pol.p, conf: 1 });
    } else if (s.phase === 'counter') {
      const c = s.counter; T.startBoard(s, c.who === 'him' ? c.pick : c.offers[0]);
    } else if (s.phase === 'rack') {
      s.secs += 75;
      const marks = s.rack.jobs.map((j, i) => {
        const truth = T.test(s.rack.stock[i].pin, j).ok;
        if (pol.kind === 'always') return false;
        if (pol.kind === 'never') return true;
        if (pol.kind === 'random') return R() < 0.5;
        return R() < pol.p ? truth : R() < 0.5;
      });
      T.settleRack(s, marks);
    } else break;
  }
  return { won: T.cupWon(s), boards: s.boards, decisions, billQ, mins: s.secs / 60 + 1.5, rack: !!s.rack };
}
const POLS = [
  { name: 'knows the rules (p 0.9)', kind: 'know', p: 0.9 },
  { name: 'knows the rules (p 0.8)', kind: 'know', p: 0.8 },
  { name: 'knows the rules (p 0.7)', kind: 'know', p: 0.7 },
  { name: 'half-knows (p 0.5)', kind: 'know', p: 0.5 },
  { name: 'always call', kind: 'always', p: 0.5 },
  { name: 'never call', kind: 'never', p: 0.5 },
  { name: 'random pins', kind: 'random', p: 0.5 }
];
const out = {};
POLS.forEach(pol => {
  let won = 0, bw = 0, bn = 0, mins = 0, maxm = 0, dec = 0, bq = 0, racks = 0;
  for (let k = 1; k <= NIGHTS; k++) {
    const r = night(pol, k);
    won += r.won; bn += r.boards.length; bw += r.boards.filter(x => x.res === 'me').length; mins += r.mins; maxm = Math.max(maxm, r.mins);
    dec += r.decisions; bq += r.billQ; racks += r.rack;
  }
  out[pol.name] = won / NIGHTS;
  console.log(`${pol.name.padEnd(26)} Cups ${(100 * won / NIGHTS).toFixed(0).padStart(3)}%  boards ${(100 * bw / bn).toFixed(0).padStart(3)}%  minutes ${(mins / NIGHTS).toFixed(1)} (max ${maxm.toFixed(1)})  moves ${(dec / NIGHTS).toFixed(1)}  bill questions ${(bq / NIGHTS).toFixed(1)}  rack ${(100 * racks / NIGHTS).toFixed(0)}%`);
});
const fails = [];
const want = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
want(out['knows the rules (p 0.9)'] >= 0.7 && out['knows the rules (p 0.9)'] <= 0.92, 'knowing play (p 0.9) wins 70 to 92% of Cups');
want(out['knows the rules (p 0.8)'] >= 0.55, 'mostly knowing play (p 0.8) still wins most Cups');
want(out['knows the rules (p 0.8)'] > out['half-knows (p 0.5)'] + 0.2, 'knowing more wins clearly more');
['always call', 'never call', 'random pins', 'half-knows (p 0.5)'].forEach(n => want(out[n] < 0.35, `${n} wins under 35% of Cups`));
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
process.exit(fails.length ? 1 : 0);
