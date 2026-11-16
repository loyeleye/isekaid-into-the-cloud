// Headless balance check for the Rush prototype (js/rush-core.js): plays every build with the 2 starting coins
// (and the third coin from wave 3, where it buys something) over many seeds, and prints win rates and spill.
// node tools/rush_sim.js [seeds] [claim: rush | bell]
const R = require('../js/rush-core.js');
const N = +process.argv[2] || 200, CLAIM = process.argv[3] || 'rush';
const builds = [[], ['rack'], ['reserve'], ['bin'], ['rack', 'reserve'], ['rack', 'bin'], ['reserve', 'bin'], ['rack', 'bin', '+reserve'], ['rack', 'reserve', '+bin'], ['@8:rack'], ['@8:reserve'], ['@8:rack', '@8:reserve'], ['@15:rack', '@15:reserve'], ['bell'], ['bell', 'rack'], ['bell', 'reserve'], ['bell', 'rack', '+bin'], ['@10:bell'], ['rack', 'reserve', '+bin'], ['reserve', 'rack', '+bell'], ['ledger'], ['ledger', 'rack'], ['ledger', 'reserve'], ['ledger', 'rack', '+bin'], ['ledger', 'reserve', '+rack'], ['@10:ledger', '@10:reserve']];
const rows = [];
for (const b of builds) {
  let wins = 0, spill = 0, time = 0, twins = 0, reports = 0, twice = 0;
  for (let s = 1; s <= N; s++) {
    const S = R.create(s, CLAIM);
    b.filter(t => !'+@'.includes(t[0])).forEach(t => R.place(S, t));
    R.start(S);
    while (!S.over && S.time < 300) {
      R.step(S, 1 / 30);
      b.filter(t => t[0] === '+').forEach(t => { if (S.coins) R.place(S, t.slice(1)); });
      b.filter(t => t[0] === '@').forEach(t => { const [at, tool] = t.slice(1).split(':'); if (S.time >= +at) R.place(S, tool); });
      R.drain(S);
    }
    if (S.over === 'win') wins++;
    spill += S.spill; time += S.time; twins += S.twins; reports += S.reports; twice += S.paidTwice;
  }
  rows.push({ build: b.join(' ') || '(nothing)', win: (100 * wins / N).toFixed(0) + '%', spill: (spill / N).toFixed(1), secs: (time / N).toFixed(0), twins: (twins / N).toFixed(1), reports: (reports / N).toFixed(1), twice: (twice / N).toFixed(1) });
}
console.table(rows);
