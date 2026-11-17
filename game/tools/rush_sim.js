// Headless balance check for the Rush prototype (js/rush-core.js): plays every build with the 2 starting coins
// (and the third coin from wave 3, where it buys something) over many seeds, and prints win rates and spill.
// node tools/rush_sim.js [seeds] [claim: rush | bell | double | slow | picky] [orders, comma-separated: cold,herd,shelf] [extra]
// A build is a list of tools: placed before the lever, "+tool" as soon as there's a coin for it, "@secs:tool" at that
// time, and "retries=0" places the retry dial and turns it to 0. With "extra" as the fourth argument it plays the
// claim's main builds with and without each of its extra buys (first, before the lever, and "+" later).
// SIM_COLS=build,win,spill trims the table to those columns; SIM_COINS=2 starts with 2 more coins (carried over or
// won from letters).
const R = require('../js/rush-core.js');
const N = +process.argv[2] || 200, CLAIM = process.argv[3] || 'rush', ORDERS = (process.argv[4] || '').split(',').filter(Boolean);
const SLOW = [[], ['hourglass'], ['stopwatch'], ['hourglass', 'stopwatch'], ['hourglass', 'stopwatch', '+bin'], ['hourglass', 'bin'], ['stopwatch', 'bin'], ['hourglass', 'reserve'], ['hourglass', 'stopwatch', '+reserve'], ['hourglass', 'stopwatch', '+bin', '+reserve'], ['reserve', 'bin']];
const PICKY = [[], ['filter'], ['rack'], ['reserve'], ['rack', 'reserve'], ['filter', 'rack'], ['filter', 'reserve'], ['filter', 'rack', '+reserve'], ['filter', 'rack', '+bin'], ['rack', 'reserve', '+filter'], ['rack', 'reserve', '+bin'], ['filter', 'bin'], ['@10:filter', '@10:rack']];
const OLD = CLAIM === 'slow' ? SLOW : CLAIM === 'picky' ? PICKY : [[], ['rack'], ['reserve'], ['bin'], ['rack', 'reserve'], ['rack', 'bin'], ['reserve', 'bin'], ['rack', 'bin', '+reserve'], ['rack', 'reserve', '+bin'], ['@8:rack'], ['@8:reserve'], ['@8:rack', '@8:reserve'], ['@15:rack', '@15:reserve'], ['bell'], ['bell', 'rack'], ['bell', 'reserve'], ['bell', 'rack', '+bin'], ['@10:bell'], ['rack', 'reserve', '+bin'], ['reserve', 'rack', '+bell'], ['ledger'], ['ledger', 'rack'], ['ledger', 'reserve'], ['ledger', 'rack', '+bin'], ['ledger', 'reserve', '+rack'], ['@10:ledger', '@10:reserve']];
// The main builds per claim, and the extra buys to try on top of each.
const MAIN = {
  rush: [['rack'], ['reserve'], ['rack', 'reserve'], ['rack', 'bin', '+reserve'], ['@8:reserve'], ['@8:rack', '@8:reserve'], ['bin']],
  bell: [['bell', 'rack'], ['bell', 'reserve'], ['rack', 'reserve'], ['bell', 'rack', '+bin'], ['@15:rack', '@15:reserve'], ['bell']],
  double: [['ledger', 'rack'], ['ledger', 'reserve'], ['ledger', 'rack', '+bin'], ['rack', 'reserve'], ['@10:ledger', '@10:reserve']],
  slow: [['hourglass', 'stopwatch'], ['hourglass', 'stopwatch', '+bin'], ['hourglass', 'reserve'], ['hourglass', 'stopwatch', '+reserve'], ['stopwatch', 'bin']],
  picky: [['filter', 'rack'], ['rack'], ['filter', 'reserve'], ['filter', 'rack', '+reserve'], ['filter', 'rack', '+bin'], ['@10:filter', '@10:rack']]
}[CLAIM];
const EXTRA = (R.CLAIMS[CLAIM].extra || []).filter(t => !R.TOOLS[t].order || ORDERS.includes(R.TOOLS[t].order));
const builds = process.argv[5] === 'extra' ? MAIN.flatMap(b => [b].concat(...EXTRA.map(e => {
  const t = e === 'retries' ? 'retries=0' : e, need = R.TOOLS[e].needs;
  // A buy that needs another tool goes after it; one that doesn't is tried first (before the lever) and later (+).
  if (need) return b.some(x => x.replace(/^[+]|^@\d+:/, '') === need) ? [b.concat('+' + t)] : [];
  return [[t].concat(b), b.concat('+' + t)];
}))) : OLD;
const rows = [];
for (const b of builds) {
  let wins = 0, spill = 0, time = 0, twins = 0, reports = 0, twice = 0, colds = 0, expired = 0, herds = 0, reap = 0, cut = 0, bfail = 0, aged = 0, tossed = 0, dedup = 0, upk = 0, caught = 0;
  for (let s = 1; s <= N; s++) {
    const S = R.create(s, CLAIM, ORDERS, +process.env.SIM_COINS || 0);
    const put = t => { const [tool, n] = t.split('='); if (R.place(S, tool) === '' && n != null) while (S.retryN !== +n) R.turn(S, tool); };
    b.filter(t => !'+@'.includes(t[0])).forEach(put);
    R.start(S);
    while (!S.over && S.time < 300) {
      R.step(S, 1 / 30);
      // With the failure crate, replay a refund whenever there's a coin spare.
      if (S.dest && S.crate.length && S.coins > 0) R.turn(S, 'dest');
      b.filter(t => t[0] === '+').forEach(t => { if (S.coins > 0 && !S[t.slice(1).split('=')[0]]) put(t.slice(1)); });
      b.filter(t => t[0] === '@').forEach(t => { const [at, tool] = t.slice(1).split(':'); if (S.time >= +at && !S[tool.split('=')[0]]) put(tool); });
      R.drain(S);
    }
    if (S.over === 'win') wins++;
    spill += S.spill; time += S.time; twins += S.twins; reports += S.reports; twice += S.paidTwice; colds += S.colds; expired += S.expired; herds += S.herds; reap += S.reappeared; cut += S.timedOut; bfail += S.batchFails; aged += S.aged; tossed += S.tossed; dedup += S.deduped; upk += S.upkeepPaid; caught += S.caught;
  }
  rows.push({ build: b.join(' ') || '(nothing)', win: (100 * wins / N).toFixed(0) + '%', spill: (spill / N).toFixed(1), secs: (time / N).toFixed(0), twins: (twins / N).toFixed(1), reports: (reports / N).toFixed(1), twice: (twice / N).toFixed(1), colds: (colds / N).toFixed(1), expired: (expired / N).toFixed(1), herds: (herds / N).toFixed(1), reappeared: (reap / N).toFixed(1), cutOff: (cut / N).toFixed(1), batchFails: (bfail / N).toFixed(1), aged: (aged / N).toFixed(1), tossed: (tossed / N).toFixed(1), deduped: (dedup / N).toFixed(1), upkeep: (upk / N).toFixed(1), caught: (caught / N).toFixed(1) });
}
const cols = (process.env.SIM_COLS || '').split(',').filter(Boolean);
console.table(cols.length ? rows.map(r => Object.fromEntries(cols.map(c => [c, r[c]]))) : rows);
