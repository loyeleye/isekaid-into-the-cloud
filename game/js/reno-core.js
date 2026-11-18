// The Renovation (design: project files game-modes/architects-draft/real-game-design.md, approved by Ladi Nov 16):
// Architect's Draft as a real game. Pure rules on js/aws-deploy.js, no DOM: the jobs (a client, a street or a function
// or a stack, and the slate of constraints chalked on the gate), the plans and their knobs, Seymour's double inspection
// (a sound release and a cracked one), par, and the nights. Loads in the browser (SD.reno) and in Node (require).
//   R.newNight({ night, seed, misses, lastGrand })     a night: five jobs, the last one the Grand Opening
//   R.job(tpl, seed)                        one job, its numbers shifted by the seed
//   R.inspect(job, plan)                    { refused, good, bad, lines: [{ id, text, ok }], pass }
//   R.plans(job)                            every plan the job's hand allows (par searches these)
//   R.par(job)                              the cheapest passing plan and its cost
(function (root) {
  const AD = (typeof require !== 'undefined' && typeof module !== 'undefined') ? require('./aws-deploy.js') : root.SD.awsDeploy;
  const R = {};
  R.PLANS = 3;            // plans per job
  R.JOBS = 5;             // jobs per night

  // A small seeded generator, so a job's numbers shift per night but a job never changes under you.
  R.rng = function (seed) { let a = (seed >>> 0) || 1; return () => { a ^= a << 13; a >>>= 0; a ^= a >> 17; a ^= a << 5; a >>>= 0; return a / 4294967296; }; };

  // ---- The districts ----
  R.DISTRICTS = {
    eb: { name: 'Beanstalk Row', what: 'an Elastic Beanstalk environment', night: 1 },
    lam: { name: 'the Shrine Bridge', what: 'a Lambda function behind its live alias', night: 2 },
    cfn: { name: 'the Blueprint Office', what: 'a CloudFormation stack', night: 3 }
  };

  // ---- The slate: each line is checked on Seymour's two runs ----
  // g: the run with a sound release; b: the run with the cracked beam; plan: the plan.
  const fmtT = n => (n === Infinity ? 'never' : n);
  R.SLATE = {
    noTurn: { text: () => 'Nobody turned away, in either run', icon: 'gate',
      ok: (g, b) => g.turned + b.turned === 0, got: (g, b) => `${g.turned + b.turned} turned away` },
    soot: { text: k => (k === 0 ? 'Nobody gets soot, even if it cracks' : `At most ${k} soot if it cracks`), icon: 'soot',
      ok: (g, b, k) => b.soot <= k, got: (g, b) => `${b.soot} soot` },
    lumber: { text: k => (k === 0 ? 'No lumber: nothing extra to rent' : `Lumber ${k}: rent at most ${k} extra`), icon: 'lumber',
      ok: (g, b, k) => Math.max(g.lumber, b.lumber) <= k, got: (g, b) => `${Math.max(g.lumber, b.lumber)} rented` },
    sundown: { text: k => `Done by sundown: tick ${k}`, icon: 'sun',
      ok: (g, b, k) => g.finish <= k, got: g => `done at tick ${fmtT(g.finish)}` },
    back: { text: k => `If it cracks, everyone's back on the old version within ${k} tick${k === 1 ? '' : 's'}`, icon: 'back',
      ok: (g, b, k) => b.recover <= k, got: (g, b) => (b.recover === Infinity ? 'never came back' : `back after ${b.recover}`) },
    // The Blueprint Office: the teardown's outcome.
    keep: { text: (k, job) => `Keep the data in ${nameOf(job, k)}`, icon: 'jar',
      ok: (g, b, k) => !!(g.res.find(r => r.id === k) || {}).data, got: (g, b, k) => ((g.res.find(r => r.id === k) || {}).data ? 'kept' : 'gone') },
    // The crate and the line (Nov 18).
    once: { text: (k, job) => `The library is packed once and shared by all ${job.fn.pkg.fns} bells`, icon: 'jar',
      ok: g => g.pkg === 'layer', got: g => (g.pkg === 'layer' ? 'one layer, shared' : g.pkg === 'image' ? 'copied into each image' : 'copied into each .zip') },
    noShip: { text: () => 'A broken version never leaves the yard', icon: 'gate',
      ok: (g, b) => b.shipped === false || (!b.caughtBy && b.soot === 0), got: (g, b) => (b.shipped === false ? 'stopped at the build' : b.caughtBy ? `deployed, then caught by the ${b.caughtBy === 'pre' ? 'pre-traffic hook' : b.caughtBy === 'post' ? 'post-traffic hook' : 'alarm'}` : 'it shipped') },
    signed: { text: () => 'A person signs off before it ships', icon: 'seal',
      ok: g => !!g.approved, got: g => (g.approved ? 'signed off' : 'nobody signed') },
    nightly: { text: k => `Costs at most ${k} lumber a night afterwards`, icon: 'lumber',
      ok: (g, b, k) => g.lumber <= k, got: g => `${g.lumber} a night` },
    noRun: { text: (k, job) => `Nothing of ${nameOf(job, k)} left running`, icon: 'gate',
      ok: (g, b, k) => (g.res.find(r => r.id === k) || {}).kept !== 'running', got: (g, b, k) => ((g.res.find(r => r.id === k) || {}).kept === 'running' ? 'still running' : 'gone') }
  };
  function nameOf(job, id) { const r = (job.stack || []).find(x => x.id === id); return r ? r.name : id; }

  // ---- The jobs (templates). Each one is beaten by its intended plan and lost by the lazy ones (tools/reno_sim.js). ----
  // street(rnd) gives the Beanstalk street; slate(st) the lines; hand the cards on offer; crack (Lambda) what kind of
  // bad release Seymour's second run uses: 'test' (a hook's test finds it) or 'load' (only real traffic shows it).
  const N456 = r => 4 + Math.floor(r() * 3);
  R.T = {
    // Beanstalk Row
    fullHouse: { d: 'eb', client: 'kai', title: 'The lunch rush', grand: false,
      scroll: 'Every table is full from open to close. Nobody leaves my kitchen hungry. Not one. I\'ll rent you a couple of stalls next door if you need them.',
      street: r => { const n = N456(r); return { houses: n, demand: n, gate: 'alb' }; },
      slate: () => [['noTurn'], ['lumber', 2]], hand: ['allAtOnce', 'rolling', 'rollingBatch'] },
    shoestring: { d: 'eb', client: 'mira', title: 'The quiet ward',
      scroll: 'Two beds are always empty this time of night, and there\'s no money to rent more. If the new wing cracks, I want as few patients as possible near it.',
      street: r => { const n = 5 + Math.floor(r() * 2); return { houses: n, demand: n - 2, gate: 'alb' }; },
      slate: () => [['noTurn'], ['lumber', 0], ['soot', 2]], hand: ['allAtOnce', 'rolling', 'rollingBatch', 'immutable'] },
    testStreet: { d: 'eb', client: 'dutch', title: 'The test office',
      scroll: 'This is the test office, kid. Nobody works here but you. I want it done before sundown and I\'m not paying for extra rooms.',
      street: r => ({ houses: 3 + Math.floor(r() * 2), demand: 0, gate: 'alb' }),
      slate: () => [['sundown', 3], ['lumber', 0]] },
    trap: { d: 'eb', client: 'seoyeon', title: 'The gatehouse',
      scroll: 'One room is always free, and I will lend you one more. If a room cracks, the renovation stops there. I would rather it did not roll on into every room.',
      street: r => { const n = N456(r); return { houses: n, demand: n - 1, gate: 'alb' }; },
      slate: () => [['noTurn'], ['lumber', 1], ['soot', 2]] },
    noSoot: { d: 'eb', client: 'mira', title: 'The infirmary',
      scroll: 'Not one patient sees a cracked beam. Not one. Test it on a street of its own, then move everyone at once. And don\'t leave anyone standing at a locked door.',
      street: r => { const n = N456(r); return { houses: n, demand: n, gate: 'alb' }; },
      slate: () => [['soot', 0], ['noTurn']] },
    classic: { d: 'eb', client: 'dutch', title: 'The old night office',
      scroll: 'Old building, old gate. A Classic one, they tell me. Full house every night. If it cracks I want one sooty clerk at most, and everyone back where they were next tick.',
      street: r => { const n = N456(r); return { houses: n, demand: n, gate: 'clb' }; },
      slate: () => [['noTurn'], ['soot', 1], ['back', 1], ['sundown', 8]] },
    quickSafe: { d: 'eb', client: 'seoyeon', title: 'Grand Opening: the new gate', grand: true,
      scroll: 'A few real visitors try the new gate first, and if it cracks they are the only ones. It must be finished by tick six. My gate is the modern kind.',
      street: r => { const n = N456(r); return { houses: n, demand: n, gate: 'alb' }; },
      slate: () => [['noTurn'], ['soot', 1], ['back', 1], ['sundown', 6]] },
    grandRow: { d: 'eb', client: 'kai', title: 'Grand Opening: the kitchen annex', grand: true,
      scroll: 'Opening night. Every seat taken, two stalls of lumber at most, and if it cracks, two burnt diners at most and everyone back on the old menu next tick. By tick twelve.',
      street: () => ({ houses: 6, demand: 6, gate: 'alb' }),
      slate: () => [['noTurn'], ['lumber', 2], ['soot', 2], ['back', 1], ['sundown', 12]] },
    // The Shrine Bridge (Lambda)
    firstBell: { d: 'lam', client: 'marrow', title: 'The first bell', crack: null,
      scroll: 'It\'s a brand-new bell. It has never rung before. Ring it tonight, please, by the third minute.',
      fn: () => ({ demand: 10, first: true }), slate: () => [['sundown', 3]] },
    rush: { d: 'lam', client: 'pip', title: 'The lunchtime lost and found', crack: 'load',
      scroll: 'Sorry. The last version only broke when lots of people came at once. Could only one person meet it if it breaks? And it has to be finished by minute six.',
      fn: () => ({ demand: 10 }), slate: () => [['soot', 1], ['sundown', 6]] },
    testable: { d: 'lam', client: 'marrow', title: 'The bell rope', crack: 'test',
      scroll: 'Last time the rope wasn\'t tied: the bell never had permission to swing. A test would have caught it. Nobody should hear a broken bell. By minute eight.',
      fn: () => ({ demand: 10 }), slate: () => [['soot', 0], ['sundown', 8]] },
    careful: { d: 'lam', client: 'pip', title: 'The slow shelf', crack: 'load',
      scroll: 'There\'s no hurry tonight. But if it breaks under the crowd, two people at most, and everyone back to the old shelf straight away.',
      fn: () => ({ demand: 10 }), slate: () => [['soot', 2], ['back', 1], ['sundown', 12]] },
    lateCheck: { d: 'lam', client: 'marrow', title: 'The night bell', crack: 'test',
      scroll: 'The new chime needs the tower\'s key, and the test bell knows how to check for it. Three people hearing it wrong is the most I\'ll forgive. I need it by minute four.',
      fn: () => ({ demand: 10 }), slate: () => [['soot', 3], ['sundown', 4]] },
    grandBridge: { d: 'lam', client: 'pip', title: 'Grand Opening: the bridge', grand: true, crack: 'load',
      scroll: 'Everyone crosses tonight! If it breaks under the crowd, one person at most and everyone back straight away. By minute seven, please. Sorry. Thank you.',
      fn: () => ({ demand: 10 }), slate: () => [['soot', 1], ['back', 1], ['sundown', 7]] },
    // The crate (task 3.1): how the function is packed.
    bigShrine: { d: 'lam', client: 'pip', title: 'The oracle shrine', crack: null, q: 'crate',
      scroll: 'The new shrine\'s oracle is a 600 MB model, plus the code. They say it won\'t fit in a crate. Sorry. Could it be up by minute three?',
      fn: () => ({ demand: 10, pkg: { mb: 640, fns: 1 } }), slate: () => [['sundown', 3]] },
    sharedRope: { d: 'lam', client: 'marrow', title: 'Three bells, one rope', crack: null, q: 'crate',
      scroll: 'Three bells use the same rope library. I want it packed once and shared by all three, not copied into every bell. Ring the new one by minute three.',
      fn: () => ({ demand: 10, pkg: { mb: 40, fns: 3 } }), slate: () => [['once'], ['sundown', 3]] },
    // The line (task 3.4): the pipeline before Deploy.
    nightlyBuild: { d: 'lam', client: 'pip', title: 'The sum that was wrong', crack: 'unit', pipe: true, q: 'line',
      scroll: 'Last time the shrine added the offerings up wrong. A plain unit test would have caught it before it ever left the yard. Nobody on the bridge should even see it. By minute six.',
      fn: () => ({ demand: 10 }), slate: () => [['noShip'], ['sundown', 6]] },
    signedBell: { d: 'lam', client: 'marrow', title: 'The tower\'s rules', crack: 'test', pipe: true, q: 'line',
      scroll: 'The tower\'s rule: a person signs off before any new chime goes up. And last time the chime had no permission to ring the tower. Nobody hears a broken one. By minute nine.',
      fn: () => ({ demand: 10 }), slate: () => [['signed'], ['soot', 0], ['sundown', 9]] },
    // The Blueprint Office (CloudFormation)
    ledger: { d: 'cfn', client: 'coo', title: 'The post office ledger',
      scroll: 'Coo. The old post office stack comes down tonight. The ledger table stays: every letter ever sent is in it. Two lumber a night is all the Quarter can spare.',
      stack: () => [{ id: 'rooms', type: 'ec2', name: 'the sorting rooms' }, { id: 'ledger', type: 'ddb', name: 'the ledger' }],
      slate: () => [['keep', 'ledger'], ['nightly', 2], ['noRun', 'rooms']] },
    well: { d: 'cfn', client: 'mira', title: 'The ward records',
      scroll: 'The ward\'s stack is coming down. Its records are in the well, a proper database. Keep them, and keep it cheap: one lumber a night.',
      stack: () => [{ id: 'beds', type: 'ec2', name: 'the beds' }, { id: 'well', type: 'rds', name: 'the records well' }],
      slate: () => [['keep', 'well'], ['nightly', 1]] },
    sweep: { d: 'cfn', client: 'dutch', title: 'Grand Opening: Freya\'s leftovers', grand: true,
      scroll: 'The stack Freya left behind comes down. Keep the case files (the database) and the evidence table. Nothing of hers stays running. Three lumber a night, tops.',
      stack: () => [{ id: 'rooms', type: 'ec2', name: 'Freya\'s rooms' }, { id: 'files', type: 'rds', name: 'the case files' }, { id: 'table', type: 'ddb', name: 'the evidence table' }, { id: 'board', type: 's3', name: 'her notice board' }],
      slate: () => [['keep', 'files'], ['keep', 'table'], ['nightly', 3], ['noRun', 'rooms'], ['noRun', 'board']] },
    // Stack updates (Nov 18): the change set marks what gets replaced, and UpdateReplacePolicy decides the old one's fate.
    recount: { d: 'cfn', update: true, client: 'coo', title: 'The ledger\'s new numbers',
      scroll: 'Coo. The ledger\'s order numbers were written as words. Tonight they become numbers, and Seymour\'s change set says the ledger table gets replaced. Keep every old letter. Two lumber a night, no more.',
      stack: () => [{ id: 'rooms', type: 'ec2', name: 'the sorting rooms' }, { id: 'ledger', type: 'ddb', name: 'the ledger', replace: true }],
      slate: () => [['keep', 'ledger'], ['nightly', 2]] },
    rebuild: { d: 'cfn', update: true, client: 'mira', title: 'The well, rebuilt',
      scroll: 'The records well is being rebuilt tonight, and the change set says Replacement: True. The new well starts empty, so keep the old records somewhere. One lumber a night is all I have.',
      stack: () => [{ id: 'beds', type: 'ec2', name: 'the beds' }, { id: 'well', type: 'rds', name: 'the records well', replace: true }],
      slate: () => [['keep', 'well'], ['nightly', 1]] }
  };

  // The first three nights each open one district (L7); from night 4 a mix, with last night's misses first.
  R.NIGHTS = {
    1: ['fullHouse', 'shoestring', 'testStreet', 'trap', 'grandRow'],
    2: ['firstBell', 'rush', 'noSoot', 'testable', 'grandBridge'],
    3: ['ledger', 'classic', 'lateCheck', 'well', 'sweep']
  };
  R.districtsOpen = night => Object.keys(R.DISTRICTS).filter(d => R.DISTRICTS[d].night <= night);
  R.nightPlan = function (night, rnd, misses, lastGrand) {
    if (R.NIGHTS[night]) return R.NIGHTS[night].slice();
    const ids = Object.keys(R.T), grand = ids.filter(id => R.T[id].grand), rest = ids.filter(id => !R.T[id].grand && R.T[id].client && id !== 'firstBell');
    const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const back = (misses || []).filter(id => R.T[id] && !R.T[id].grand);
    const pool = back.concat(shuffle(rest).filter(id => !back.includes(id)));
    // Mix districts (P9): no more than two from one district before the Grand Opening.
    const out = [], per = {};
    pool.forEach(id => { const d = R.T[id].d; if (out.length < R.JOBS - 1 && (per[d] | 0) < 2) { out.push(id); per[d] = (per[d] | 0) + 1; } });
    // And every district at least once (playtest, Nov 17: with only two Blueprint Office jobs in the pool, nights 4
    // to 7 drew none): a missing district swaps in for the last fresh job of the busiest one. Misses keep their seats.
    R.districtsOpen(night).forEach(d => {
      if (per[d]) return;
      const add = pool.find(id => R.T[id].d === d && !out.includes(id));
      let at = -1;
      out.forEach((id, i) => { if (!back.includes(id) && (at < 0 || per[R.T[id].d] >= per[R.T[out[at]].d])) at = i; });
      if (!add || at < 0) return;
      per[R.T[out[at]].d]--; out.splice(at, 1); out.push(add); per[d] = 1;
    });
    const gm = (misses || []).find(id => R.T[id] && R.T[id].grand);
    // A fresh Grand Opening goes round all four in turn (playtest, Nov 17: a shuffle per night gave the new gate on
    // nights 4 and 6, and with a miss in between, three nights running), never the one that just opened.
    const turn = grand.slice(night % grand.length).concat(grand.slice(0, night % grand.length)).filter(id => id !== lastGrand);
    out.push(gm || turn[0]);
    return out;
  };

  // ---- One job ----
  R.job = function (id, seed) {
    const t = R.T[id], rnd = R.rng(seed || 1);
    const job = { id, d: t.d, client: t.client, title: t.title, scroll: t.scroll, grand: !!t.grand, crack: t.crack || null, pipe: !!t.pipe, q: t.q || null };
    if (t.d === 'eb') { job.street = t.street(rnd); job.hand = t.hand || AD.EB.slice(); }
    if (t.d === 'lam') job.fn = t.fn(rnd);
    if (t.d === 'cfn') { job.stack = t.stack(rnd); job.update = !!t.update; }
    job.slate = t.slate(job).map(([k, v]) => ({ k, v }));
    job.lines = job.slate.map(l => R.SLATE[l.k].text(l.v, job));
    return job;
  };

  // ---- Plans ----
  R.defaultPlan = function (job, last) {
    if (job.d === 'eb') { const p = Object.assign({ policy: job.hand[0], batch: 1, ignoreHC: false, split: 10, evalT: 2, wait: 0 }, last || {}); if (!job.hand.includes(p.policy)) p.policy = job.hand[0]; return p; }
    if (job.d === 'lam') return Object.assign({ cfg: 'all', wait: 5, every: 1, alarm: false, pre: false, post: false, publish: false, pkg: 'zip', build: false, approval: false }, last || {});
    const p = {}; job.stack.forEach(r => { p[r.id] = job.update ? 'Delete' : AD.cfnDefault(r.type); }); return p;
  };
  R.plans = function (job) {
    const out = [];
    if (job.d === 'eb') {
      job.hand.forEach(policy => {
        if (policy === 'rolling' || policy === 'rollingBatch') [1, 2, 3].forEach(batch => [false, true].forEach(ignoreHC => out.push({ policy, batch, ignoreHC })));
        else if (policy === 'split') [10, 25, 50].forEach(split => [2, 3, 4].forEach(evalT => out.push({ policy, split, evalT })));
        else if (policy === 'blueGreen') [0, 2].forEach(wait => out.push({ policy, wait }));
        else out.push({ policy });
      });
    } else if (job.d === 'lam') {
      const cfgs = [{ cfg: 'all' }].concat(AD.CANARY.map(wait => ({ cfg: 'canary', wait })), AD.LINEAR.map(every => ({ cfg: 'linear', every })));
      const pkgs = job.fn.pkg ? ['zip', 'layer', 'image'] : ['zip'], two = job.pipe ? [false, true] : [false];
      cfgs.forEach(c => [false, true].forEach(alarm => [false, true].forEach(pre => [false, true].forEach(post => pkgs.forEach(pkg => two.forEach(build => two.forEach(approval =>
        out.push(Object.assign({ alarm, pre, post, publish: true, pkg, build, approval }, c)))))))));
    } else {
      const ids = job.stack.filter(r => !job.update || r.replace).map(r => r.id), opts = ['Delete', 'Retain', 'Snapshot'];
      const rec = (i, p) => { if (i === ids.length) return out.push(Object.assign({}, p)); opts.forEach(o => { p[ids[i]] = o; rec(i + 1, p); }); };
      rec(0, {});
    }
    return out;
  };
  // A plan's cost, for par: lumber first, then how long it took.
  const cost = (job, g, b) => (job.d === 'cfn' ? g.lumber : Math.max(g.lumber || 0, b.lumber || 0) * 100 + (g.finish === Infinity ? 99 : g.finish));

  // ---- Seymour's double inspection ----
  R.inspect = function (job, plan) {
    let g, b, refused = null;
    if (job.d === 'eb') { g = AD.ebRun(job.street, plan, false); b = AD.ebRun(job.street, plan, true); refused = g.refused; }
    else if (job.d === 'lam') { g = AD.lamRun(job.fn, plan, 'good'); b = AD.lamRun(job.fn, plan, job.crack || 'good'); refused = g.refused; g.lumber = 0; b.lumber = 0; g.turned = b.turned = 0; }
    else { g = job.update ? AD.cfnUpdate(job.stack, plan) : AD.cfnTeardown(job.stack, plan); b = g; refused = g.refused; }
    if (refused) return { refused, good: g, bad: b, lines: [], pass: false };
    const lines = job.slate.map(l => {
      const S = R.SLATE[l.k];
      return { k: l.k, v: l.v, text: S.text(l.v, job), ok: !!S.ok(g, b, l.v), got: S.got(g, b, l.v) };
    });
    return { refused: null, good: g, bad: b, lines, pass: lines.every(x => x.ok), cost: cost(job, g, b) };
  };
  R.par = function (job) {
    let best = null;
    R.plans(job).forEach(p => { const r = R.inspect(job, p); if (r.pass && (!best || r.cost < best.cost)) best = { plan: p, cost: r.cost, res: r }; });
    return best;
  };

  // ---- The lazy plans the simulator plays against every job (P2): none may win everywhere ----
  R.LAZY = {
    eb: [{ policy: 'allAtOnce' }, { policy: 'rolling', batch: 1 }, { policy: 'rollingBatch', batch: 1 }, { policy: 'immutable' }, { policy: 'split', split: 10, evalT: 2 }, { policy: 'blueGreen', wait: 2 }],
    lam: [{ cfg: 'canary', wait: 5, alarm: true, pre: true, post: true, publish: true }, { cfg: 'all', alarm: true, publish: true }, { cfg: 'linear', every: 1, alarm: true, publish: true }, { cfg: 'canary', wait: 10, alarm: true, publish: true }],
    cfn: [{ '*': 'Retain' }, { '*': 'Delete' }]
  };
  R.lazyPlan = function (job, p) {
    if (job.d !== 'cfn') return p;
    const o = {}; job.stack.forEach(r => { o[r.id] = p['*']; }); return o;
  };

  // ---- A night ----
  R.newNight = function (o) {
    o = o || {};
    const night = Math.max(1, o.night | 0 || 1), seed = (o.seed >>> 0) || (night * 7919 + 13);
    const rnd = R.rng(seed);
    const ids = R.nightPlan(night, rnd, o.misses, o.lastGrand);
    return { v: 1, night, seed, phase: 'board', at: 0, jobs: ids.map((id, i) => ({ id, seed: seed + i * 101, plans: [], done: false, pass: false })), debriefs: [], open: R.districtsOpen(night) };
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = R;
  if (root && root.SD) root.SD.reno = R;
})(typeof window !== 'undefined' ? window : this);
