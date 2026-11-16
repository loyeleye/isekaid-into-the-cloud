// Rule checks for js/aws-deploy.js: each one states an AWS behaviour from the docs linked in that file's header and
// checks the simulator shows it. Run from game/:  node tools/aws_deploy_check.js
const AD = require('../js/aws-deploy.js');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const full = { houses: 4, demand: 4, gate: 'alb' }, slack = { houses: 6, demand: 4, gate: 'alb' }, clb = { houses: 4, demand: 4, gate: 'clb' };
const run = (st, p, bad) => AD.ebRun(st, p, bad);

// Elastic Beanstalk
let g = run(full, { policy: 'allAtOnce' }), b = run(full, { policy: 'allAtOnce' }, true);
check(g.turned > 0 && g.lumber === 0, 'All at once: downtime while it deploys, nothing extra launched');
check(b.soot === 4 && b.recover >= 2, 'All at once: a failed deployment hits everyone and needs a manual redeploy');
const fastest = AD.EB.filter(p => p !== 'allAtOnce').every(p => run(full, { policy: p, batch: 1, split: 10, evalT: 2, wait: 2 }).finish > g.finish);
check(fastest, 'All at once is the fastest policy');
g = run(full, { policy: 'rolling', batch: 1 });
check(g.turned > 0 && g.lumber === 0 && g.mixed, 'Rolling: reduced capacity, no extra instances, old and new versions serve at once');
check(run(slack, { policy: 'rolling', batch: 2 }).turned === 0, 'Rolling: with spare capacity nobody is turned away');
b = run(full, { policy: 'rolling', batch: 1 }, true);
check(b.failAt === 2 && b.soot <= 1 && b.ticks[1].houses.filter(h => h.v === 'old' && h.st === 'up').length === 3, 'Rolling: a batch that fails its health check stops the deployment; the rest keep the old version');
const bi = run(full, { policy: 'rolling', batch: 1, ignoreHC: true }, true);
check(bi.soot === 4 && bi.turned > b.turned, 'Ignore health check: a failing batch no longer stops it, so every batch cracks');
g = run(full, { policy: 'rollingBatch', batch: 2 });
check(g.turned === 0 && g.lumber === 2 && g.ticks[g.ticks.length - 1].houses.length === 4, 'Rolling with additional batch: full capacity, one extra batch, terminated at the end');
b = run(full, { policy: 'rollingBatch', batch: 2 }, true);
check(b.turned === 0 && b.recover <= 1, 'Rolling with additional batch: minimal impact when the first (extra) batch fails');
g = run(full, { policy: 'immutable' });
check(g.turned === 0 && g.lumber === 4 && g.ticks[2].houses.filter(h => h.rented).length === 1, 'Immutable: one new instance first, then the rest; capacity doubles for a short time');
b = run(full, { policy: 'immutable' }, true);
check(b.soot <= 1 && b.recover === 1 && b.turned === 0, 'Immutable: rollback is terminating the temporary group');
check(!!AD.ebRefuse(clb, { policy: 'split' }) && !AD.ebRefuse(full, { policy: 'split' }), 'Traffic splitting needs an Application Load Balancer');
b = run({ houses: 4, demand: 10, gate: 'alb' }, { policy: 'split', split: 25, evalT: 2 }, true);
check(b.soot === Math.round(10 * 0.25) && b.recover === 1, 'Traffic splitting: a failure affects only the split percentage; traffic moves back');
g = run(full, { policy: 'split', split: 10, evalT: 3 });
check(g.mixed && g.turned === 0, 'Traffic splitting: a share of real traffic tries the new version first');
g = run(full, { policy: 'blueGreen', wait: 0 }); const g2 = run(full, { policy: 'blueGreen', wait: 2 });
check(g.turned > 0 && g2.turned === 0, 'Blue/green: terminating the old environment before DNS caches expire turns people away');
b = run(full, { policy: 'blueGreen', wait: 2 }, true);
check(b.soot === 0 && b.turned === 0, 'Blue/green: the new environment is tested on its own URL before the swap');

// Lambda and CodeDeploy
const fn = { demand: 10 }, P = o => Object.assign({ publish: true, wait: 5, every: 1 }, o);
const ws = p => { const r = AD.lamRun(fn, p, 'good'); return r.ticks.map(t => t.w); };
check(JSON.stringify(ws(P({ cfg: 'canary', wait: 5 }))) === JSON.stringify([0.1, 0.1, 0.1, 0.1, 0.1, 1]), 'Canary10Percent5Minutes: 10 percent, then the other 90 percent five minutes later');
check(ws(P({ cfg: 'linear', every: 1 })).map(w => Math.round(w * 10)).join() === '1,2,3,4,5,6,7,8,9,10', 'Linear10PercentEvery1Minute: 10 percent more every minute');
check(ws(P({ cfg: 'all' })).join() === '1', 'AllAtOnce: everything at once');
check(AD.CANARY.join() === '5,10,15,30' && AD.LINEAR.join() === '1,2,3,10', 'The 9 predefined Lambda configurations');
let r = AD.lamRun(fn, P({ cfg: 'canary', alarm: true }), 'load');
check(r.soot === 1 && r.caughtBy === 'alarm' && r.ticks[r.ticks.length - 1].w === 0, 'An alarm rolls the deployment back automatically');
r = AD.lamRun(fn, P({ cfg: 'canary' }), 'load');
check(r.recover === Infinity && r.ticks[r.ticks.length - 1].w === 1, 'Without an alarm, a bad version takes all the traffic');
r = AD.lamRun(fn, P({ cfg: 'all', pre: true }), 'test');
check(r.soot === 0 && r.caughtBy === 'pre', 'BeforeAllowTraffic runs before any traffic shifts');
r = AD.lamRun(fn, P({ cfg: 'all', pre: true }), 'load');
check(r.soot > 0, 'A hook test doesn\'t catch a crack that only shows under real traffic');
r = AD.lamRun(fn, P({ cfg: 'canary', post: true }), 'test');
check(r.caughtBy === 'post' && r.soot > 10, 'AfterAllowTraffic runs after all traffic has shifted');
check(!!AD.lamRefuse(fn, { cfg: 'all', publish: false }), 'An alias can\'t point to $LATEST');
check(!!AD.lamRefuse({ demand: 10, first: true }, P({ cfg: 'canary' })) && !AD.lamRefuse({ demand: 10, first: true }, P({ cfg: 'all' })), 'CodeDeploy needs a previous version to shift from');
check(AD.cfgName(P({ cfg: 'linear', every: 1 })) === 'Linear10PercentEvery1Minute' && AD.cfgName(P({ cfg: 'linear', every: 2 })) === 'Linear10PercentEvery2Minutes', 'Configuration names match CodeDeploy\'s');

// CloudFormation DeletionPolicy
check(AD.cfnDefault('rds') === 'Snapshot' && AD.cfnDefault('ddb') === 'Delete' && AD.cfnDefault('s3') === 'Delete', 'Delete is the default, except RDS DB instances (Snapshot)');
check(!!AD.cfnRefuse([{ id: 't', type: 'ddb', name: 't' }], { t: 'Snapshot' }) && !AD.cfnRefuse([{ id: 'w', type: 'rds', name: 'w' }], { w: 'Snapshot' }), 'Snapshot is supported for RDS, not for a DynamoDB table');
const td = AD.cfnTeardown([{ id: 't', type: 'ddb', name: 't' }, { id: 'x', type: 'ec2', name: 'x' }], { t: 'Retain' });
check(td.res[0].kept === 'running' && td.res[0].cost > 0 && !td.res[1].data, 'Retain keeps the resource and its contents, and it keeps costing; Delete keeps nothing');
console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll deployment rule checks passed.');
process.exit(fails.length ? 1 : 0);
