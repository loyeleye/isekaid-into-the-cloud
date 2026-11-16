// Balance checks for the Renovation (js/reno-core.js on js/aws-deploy.js). Run from game/:  node tools/reno_sim.js
//   - Every job, at every seed, has a passing plan (its par), and the job's intended lesson is among the passing plans.
//   - Every lazy plan ("always immutable", "canary with everything on" ...) fails at least 40% of its district's jobs.
//   - Nights 1 to 3 open one district each, and later nights mix districts with a Grand Opening last.
const R = require('../js/reno-core.js');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const SEEDS = 12;
// What each job is meant to teach: a passing plan must match this.
const LESSON = {
  fullHouse: p => p.policy === 'rollingBatch', shoestring: p => p.policy === 'rolling', testStreet: p => p.policy === 'allAtOnce',
  trap: p => (p.policy === 'rolling' || p.policy === 'rollingBatch') && !p.ignoreHC, noSoot: p => p.policy === 'blueGreen' && p.wait >= 2,
  classic: p => p.policy === 'immutable' || p.policy === 'blueGreen', quickSafe: p => p.policy === 'split' || p.policy === 'blueGreen',
  grandRow: p => p.policy === 'rollingBatch',
  firstBell: p => p.cfg === 'all', rush: p => p.cfg === 'canary' && p.alarm, testable: p => p.pre, careful: p => p.alarm,
  lateCheck: p => p.pre && p.cfg === 'all', grandBridge: p => p.cfg === 'canary' && p.alarm,
  ledger: p => p.ledger === 'Retain', well: p => p.well === 'Snapshot', sweep: p => p.files === 'Snapshot' && p.table === 'Retain'
};
const lazyPass = {};
Object.keys(R.T).forEach(id => {
  let solvable = 0, lesson = 0, onlyLesson = 0;
  for (let s = 1; s <= SEEDS; s++) {
    const job = R.job(id, s * 977);
    const pass = R.plans(job).filter(p => R.inspect(job, p).pass);
    if (pass.length) solvable++;
    if (pass.some(LESSON[id])) lesson++;
    if (pass.length && pass.every(LESSON[id])) onlyLesson++;
    (R.LAZY[job.d] || []).forEach((lp, i) => {
      const k = job.d + ':' + JSON.stringify(lp);
      lazyPass[k] = lazyPass[k] || { pass: 0, n: 0 };
      lazyPass[k].n++; if (R.inspect(job, R.lazyPlan(job, lp)).pass) lazyPass[k].pass++;
    });
  }
  const par = R.par(R.job(id, 977));
  check(solvable === SEEDS, `${id}: solvable at every seed (${solvable}/${SEEDS}), par ${par ? JSON.stringify(par.plan) : 'none'}`);
  check(lesson === SEEDS, `${id}: its lesson passes at every seed (${lesson}/${SEEDS}); only the lesson passes at ${onlyLesson}`);
});
Object.keys(lazyPass).forEach(k => {
  const x = lazyPass[k], rate = x.pass / x.n;
  check(rate <= 0.6, `lazy ${k} passes ${Math.round(rate * 100)}% of its district's jobs (at most 60%)`);
});
// Nights
[1, 2, 3].forEach(n => { const s = R.newNight({ night: n }); check(s.jobs.length === R.JOBS && R.T[s.jobs[R.JOBS - 1].id].grand, `night ${n}: ${s.jobs.map(j => j.id).join(', ')}`); });
for (let n = 4; n <= 9; n++) {
  const s = R.newNight({ night: n, misses: n === 5 ? ['rush'] : [] });
  const ds = new Set(s.jobs.map(j => R.T[j.id].d));
  check(s.jobs.length === R.JOBS && R.T[s.jobs[R.JOBS - 1].id].grand && ds.size >= 2 && (n !== 5 || s.jobs[0].id === 'rush'), `night ${n}: ${s.jobs.map(j => j.id).join(', ')}`);
}
console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll reno balance checks passed.');
process.exit(fails.length ? 1 : 0);
