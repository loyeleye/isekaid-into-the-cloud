// Balance check for the Fire Drill (js/drill-core.js): for every drill and every shifting number (seed), the
// warm-up run shows the fault, each intended fix contains it on the first deploy, and every lazy plan (a look-alike
// that does what AWS would do but doesn't fix this fault) and changing nothing both fail. Also: a whole night with
// the intended fixes ends with budget to spare, and a night that changes nothing runs the budget out.
// Run from game/:  node tools/drill_sim.js
const D = require('../js/drill-core.js');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const tryPlan = (id, k, plan) => {
  const f = D.start(id, k);
  const refused = plan.filter(c => D.place(f, c));
  const e = D.deploy(f);
  return { warm: f.log[0], e, refused };
};
for (const id of Object.keys(D.DRILLS)) {
  const d = D.DRILLS[id];
  for (let k = 0; k < 6; k++) {
    const none = tryPlan(id, k, []);
    check(!none.warm.ok && none.warm.cost === 0, `${id} k${k}: the warm-up run shows the fault, free`);
    check(!none.e.ok && none.e.cost >= 4, `${id} k${k}: changing nothing fails (costs ${none.e.cost})`);
    d.fix.forEach(p => { const r = tryPlan(id, k, p); check(r.e.ok && !r.refused.length && r.e.cost <= 1, `${id} k${k}: fix ${p.join(' + ')} contains it (cost ${r.e.cost})`); });
    d.lazy.forEach(p => { const r = tryPlan(id, k, p); check(!r.e.ok, `${id} k${k}: lazy ${p.join(' + ')} doesn't (${r.refused.length ? 'refused' : 'cost ' + r.e.cost})`); });
    check(d.fix.every(p => p.length <= D.CHANGES), `${id}: every fix fits in one deploy's ${D.CHANGES} changes`);
  }
}
// Determinism: the same plan and seed give the same result.
{
  const a = tryPlan('poison', 3, ['partial']), b = tryPlan('poison', 3, ['partial']);
  check(JSON.stringify(a.e.m) === JSON.stringify(b.e.m), 'a run is deterministic');
}
// A night: every row's first choice, fixed on the first deploy, then nothing changed.
const night = fix => {
  const s = D.newNight({ night: 1 });
  while (s.phase !== 'end' && s.phase !== 'zero') {
    const id = D.choices(s.night, s.row)[0];
    D.startDrill(s, id, s.row * 13);
    while (s.phase === 'drill') {
      if (fix && s.drill.deploys === 0) D.DRILLS[id].fix[0].forEach(c => D.place(s.drill, c));
      const e = D.deploy(s.drill);
      D.afterDeploy(s, e);
    }
    if (s.phase === 'debrief') D.settle(s, true);
  }
  return s;
};
{
  const good = night(true), bad = night(false);
  check(good.phase === 'end' && good.budget >= 90, `a night of clean fixes ends with budget to spare (${good.budget}%)`);
  check(bad.phase === 'zero', `a night of changing nothing runs out of budget (${bad.phase}, row ${bad.row})`);
}
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
process.exit(fails.length ? 1 : 0);
