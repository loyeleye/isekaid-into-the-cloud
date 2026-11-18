// Mira's Kitchen: the rules (Ladi, Nov 18: Development's second game, task 1.2, "Develop code for AWS Lambda").
// Mira runs the infirmary kitchen in Thornwick from Bram's old recipe book, and the kitchen is a Lambda function: one
// recipe card (the function's code and configuration) cooks every order the wards send. An order is a set of guests
// (invocations). You set the recipe on the bench, fire the stove, and every plate shows what Lambda did with it.
// Pure: no DOM, no randomness, no saves. js/mode-kitchen.js draws it; tools/kitchen_sim.js plays it headless.
//
// The AWS behaviour, checked against the Lambda and API Gateway developer guides on Nov 18, 2026:
//   - Memory is 128 MB to 10,240 MB, and CPU comes in proportion to memory, so CPU-bound work runs faster with more
//     memory (configuration-memory). Here a job's work is given in seconds at 1,024 MB and scales with 1024 / memory.
//   - The timeout defaults to 3 seconds and goes up to 900 (configuration-timeout). A call that runs past it is
//     stopped ("Task timed out") and its execution environment is reset (lambda-runtime-environment).
//   - Code outside the handler runs once, when a new execution environment starts (a cold start); later calls in the
//     same environment (warm starts) reuse what it set up, such as SDK clients and database connections
//     (best-practices). Set up inside the handler, the same work is paid on every call.
//   - A Lambda proxy integration must return statusCode and body (headers may be left out); any other output shape
//     makes API Gateway answer 502 Bad Gateway (set-up-lambda-proxy-integrations).
//   - Amazon S3 invokes a function asynchronously (with-s3). For an asynchronous call that fails or times out, Lambda
//     tries it two more times by default, and an on-failure destination (or a dead-letter queue) keeps the event once
//     the tries run out (invocation-async-error-handling, invocation-async-retain-records). Without one it's dropped.
//   - Environment variables change a function's behaviour without changing its code (configuration-envvars): the
//     same recipe reads which pantry (table) to use from the stage it runs in.
//   - Provisioned concurrency keeps pre-initialized execution environments ready, so those calls skip the cold start.
//     It goes on a published version or an alias, never on $LATEST (provisioned-concurrency).
//   - Billing: duration (init included) times the memory set, in GB-seconds; provisioned concurrency is paid for as
//     long as it's configured. The bill here counts both in GB-seconds; it's a comparison, not a price.
//
// A plate: served, late (served, but slower than the guest waits), 502, timed out, wrong pantry, lost (an async event
// that failed every try with nowhere to go), or kept (it failed every try and the on-failure destination holds it).
// A stuck job (a corrupt file that hangs the code) can never be served: kept is the right answer for it.
// Stars for an order: 3 with no failures, at most lateOk late plates and a bill within a quarter of par (the cheapest
// 3-star recipe on that order's knobs); 2 with no failures; 1 with failures on at most half the guests; else 0.
(function (root) {
  const K = {};
  K.MEM = [128, 512, 1024, 2048, 10240];
  K.TIMEOUT = [3, 10, 30, 300, 900];
  K.PC = ['none', 'latest5', 'alias2', 'alias5', 'alias10'];
  K.INIT = 1;           // a new execution environment's start, in seconds, before the code outside the handler
  K.TRIES = 3;          // an asynchronous event: the first try and two retries
  K.SLACK = 1.25;       // 3 stars: the bill within a quarter of par
  K.DEFAULT = { mem: 128, timeout: 3, prep: 'inside', ret: 'body', dest: false, env: false, pc: 'none' };

  // The bench: each knob's options and words. A knob an order doesn't list stays where the order's start puts it.
  K.KNOBS = {
    mem: { name: 'Memory', opts: K.MEM, say: v => v >= 1024 ? (v / 1024) + ' GB' : v + ' MB' },
    timeout: { name: 'Timeout', opts: K.TIMEOUT, say: v => v < 60 ? v + ' s' : (v / 60) + ' min' },
    prep: { name: 'Pantry connection', opts: ['inside', 'outside'], say: v => v === 'inside' ? 'Opened on every call (inside the handler)' : 'Opened once per cook (outside the handler)' },
    ret: { name: 'What the counter gets', opts: ['body', 'proxy'], say: v => v === 'body' ? 'Just the dish' : 'statusCode and body' },
    dest: { name: 'When an event fails every try', opts: [false, true], say: v => v ? 'Send it to an on-failure destination' : 'Nowhere: it\'s dropped' },
    env: { name: 'Which pantry', opts: [false, true], say: v => v ? 'Read it from an environment variable' : 'Written in the code ("test-pantry")' },
    pc: { name: 'Provisioned concurrency', opts: K.PC, say: v => ({ none: 'None', latest5: '5 on $LATEST', alias2: '2 on the alias "live"', alias5: '5 on the alias "live"', alias10: '10 on the alias "live"' })[v] }
  };
  const pcOf = v => ({ none: [0, null], latest5: [5, 'latest'], alias2: [2, 'alias'], alias5: [5, 'alias'], alias10: [10, 'alias'] })[v] || [0, null];
  K.pcOf = pcOf;

  // Guests: kind 'api' (the counter, API Gateway with a proxy integration, synchronous) or 's3' (the photo pantry,
  // asynchronous). work: seconds at 1,024 MB. setup: the pantry connection's seconds. n guests; burst: all at once.
  // stage 'test' or 'prod' (which pantry is right); stuck: the job hangs until the timeout.
  K.ORDERS = {
    breakfast: {
      name: 'Breakfast at the counter', ward: 'The east ward', icon: 'coffee-cup',
      says: 'Six trays, one at a time, through the hatch.',
      brief: 'The ward orders at the counter (API Gateway, proxy integration) and waits at the hatch for each tray.',
      knobs: ['ret', 'prep'], start: { mem: 1024, timeout: 3, prep: 'inside', ret: 'body', env: true },
      guests: [{ kind: 'api', n: 6, work: 0.2, setup: 1.5, patience: 1, stage: 'prod' }], lateOk: 1,
      teach: ['502', 'cold', 'warm'], q: /proxy|statusCode|502|Bad Gateway|outside the (function )?handler|init(ializ)?|cold start|execution environment/i
    },
    pantry: {
      name: 'The photo pantry', ward: 'The records room', icon: 'film-strip',
      says: 'Five photos dropped in the bucket. Thumbnails for the board within ten seconds each.',
      brief: 'Each photo dropped in the bucket (S3) calls the recipe asynchronously: nobody waits at the hatch.',
      knobs: ['mem', 'timeout', 'dest'], start: { mem: 128, timeout: 3, prep: 'outside', ret: 'proxy', env: true, dest: false },
      guests: [{ kind: 's3', n: 4, work: 6, patience: 10, stage: 'prod' }, { kind: 's3', n: 1, work: 6, stuck: true, stage: 'prod' }], lateOk: 0,
      teach: ['timeout', 'retry', 'lost', 'kept', 'cpu'], q: /asynchronous|on-failure destination|dead-letter|time(s)? out|timeout|memory|CPU/i
    },
    kitchens: {
      name: 'Two kitchens, one recipe', ward: 'The new wing', icon: 'teapot',
      says: 'The test kitchen and the real one both cook from your card today.',
      brief: 'The same recipe runs in the test stage and in production. Each stage has its own pantry (table).',
      knobs: ['env', 'ret', 'prep'], start: { mem: 1024, timeout: 3, prep: 'outside', ret: 'proxy', env: false },
      guests: [{ kind: 'api', n: 2, work: 0.2, setup: 1.5, patience: 1, stage: 'test' }, { kind: 'api', n: 4, work: 0.2, setup: 1.5, patience: 1, stage: 'prod' }], lateOk: 1,
      teach: ['wrong'], q: /environment variable/i
    },
    banquet: {
      name: 'The banquet toast', ward: 'The great hall', icon: 'cupcake',
      says: 'Five tables raise their glasses at once. Nobody waits.',
      brief: 'Five calls arrive in the same second, right as the toast ends. Each needs a cook ready to go.',
      knobs: ['pc'], start: { mem: 1024, timeout: 3, prep: 'outside', ret: 'proxy', env: true, pc: 'none' },
      guests: [{ kind: 'api', n: 5, burst: true, work: 0.3, setup: 1.5, patience: 1, stage: 'prod' }], lateOk: 0, window: 10,
      teach: ['coldBurst', 'refused', 'pc'], q: /provisioned concurrency|cold start|alias/i
    },
    rush: {
      name: 'The dinner rush', ward: 'Every ward', icon: 'campfire', boss: true,
      says: 'Everything at once, and the card starts from Bram\'s old page.',
      brief: 'The counter, the photo pantry, the toast and the test kitchen, all on one recipe card. It starts blank.',
      knobs: ['mem', 'timeout', 'prep', 'ret', 'dest', 'env', 'pc'], start: Object.assign({}, K.DEFAULT),
      guests: [{ kind: 'api', n: 4, work: 0.2, setup: 1.5, patience: 1, stage: 'prod' },
        { kind: 's3', n: 3, work: 6, patience: 10, stage: 'prod' }, { kind: 's3', n: 1, work: 6, stuck: true, stage: 'prod' },
        { kind: 'api', n: 5, burst: true, work: 0.3, setup: 1.5, patience: 1, stage: 'prod' },
        { kind: 'api', n: 2, work: 0.2, setup: 1.5, patience: 1, stage: 'test' }], lateOk: 1, window: 20,
      teach: [], q: /Lambda/
    }
  };
  K.ROUTE = ['breakfast', 'pantry', 'kitchens', 'banquet', 'rush'];
  K.FIRES = 3;

  // Mira's one line per rule, the first time it shows (once per save).
  K.TEACH = {
    '502': 'The counter only takes a tray with a statusCode and a body on it. Anything else, the guest gets a 502 Bad Gateway.',
    cold: 'The first tray of the day is slow: a new cook has to start up and open the pantry. That\'s a cold start.',
    warm: 'Opened outside the handler, the pantry connection stays open for the next tray. Inside, every tray pays for it again.',
    timeout: 'The cook stops at the timeout, mid-dish. Lambda calls it "Task timed out".',
    retry: 'A photo is asynchronous: when it fails, Lambda tries it twice more on its own.',
    lost: 'Three tries and nowhere to send it: that photo is gone. Nobody will know it was ever dropped.',
    kept: 'The on-failure destination kept the bad one, with the reason. Someone can look at it in the morning.',
    cpu: 'More memory gives the cook more CPU too. A slow, heavy dish can finish faster for about the same bill.',
    wrong: 'The recipe had "test-pantry" written in it, so the real kitchen cooked from the test pantry. Read it from the stage instead.',
    coldBurst: 'Five guests at once means five cooks, and every new cook starts cold.',
    refused: 'Provisioned concurrency won\'t go on $LATEST. Publish a version, point the alias at it, and put it there.',
    pc: 'Provisioned cooks start up before the guests come, so nobody waits for a cold start. You pay for them while they stand by.',
    bill: 'It worked, but the bill is high. A timeout or memory set far past what the dish needs is paid on every try.'
  };

  K.cfg = (order, cfg) => Object.assign({}, K.DEFAULT, K.ORDERS[order].start, cfg || {});
  // A recipe Lambda wouldn't accept, or null.
  K.refuse = function (order, cfg) {
    const c = K.cfg(order, cfg);
    if (pcOf(c.pc)[1] === 'latest') return 'refused';
    return null;
  };

  // Fire the stove: every guest's plate, in order. Returns { plates, counts, bill, standing, fails, late, refused }.
  K.fire = function (order, cfg) {
    const o = K.ORDERS[order], c = K.cfg(order, cfg);
    const refused = K.refuse(order, c);
    if (refused) return { plates: [], counts: {}, bill: 0, standing: 0, fails: guestsOf(o), late: 0, refused, events: [refused] };
    const [pcN, pcOn] = pcOf(c.pc);
    let warm = pcOn === 'alias' ? pcN : 0;
    const gb = c.mem / 1024, plates = [];
    let bill = 0;
    const run = (g, cold) => {
      const d = (cold ? K.INIT + (c.prep === 'outside' ? (g.setup || 0) : 0) : 0) + (c.prep === 'inside' ? (g.setup || 0) : 0) + g.work * 1024 / c.mem;
      const timedOut = g.stuck || d > c.timeout + 1e-9;
      const billed = timedOut ? c.timeout : d;
      bill += gb * billed;
      return { d: round(billed), timedOut };
    };
    o.guests.forEach((g, gi) => {
      let fresh = 0;
      if (g.burst) { fresh = Math.max(0, g.n - warm); warm = Math.max(warm, g.n); }
      for (let i = 0; i < g.n; i++) {
        let cold;
        if (g.burst) cold = i >= g.n - fresh;
        else { cold = warm < 1; if (cold) warm = 1; }
        const p = { g: gi, i, kind: g.kind, stage: g.stage, stuck: !!g.stuck, cold, tries: 1 };
        let a = run(g, cold);
        if (g.kind === 's3') {
          while (a.timedOut && p.tries < K.TRIES) { p.tries++; a = run(g, false); }
          p.d = a.d;
          if (a.timedOut) p.out = c.dest ? 'kept' : 'lost';
          else if (g.stage === 'prod' && !c.env) p.out = 'wrong';
          else p.out = p.tries > 1 || a.d > g.patience ? 'late' : 'served';
        } else {
          p.d = a.d;
          if (a.timedOut) p.out = 'timeout';
          else if (c.ret !== 'proxy') p.out = '502';
          else if (g.stage === 'prod' && !c.env) p.out = 'wrong';
          else p.out = a.d > g.patience ? 'late' : 'served';
        }
        p.fail = !(p.out === 'served' || p.out === 'late' || (p.out === 'kept' && p.stuck));
        plates.push(p);
      }
    });
    const standing = pcOn === 'alias' ? pcN * gb * (o.window || 10) : 0;
    const counts = {};
    plates.forEach(p => { counts[p.out] = (counts[p.out] | 0) + 1; });
    const fails = plates.filter(p => p.fail).length, late = counts.late | 0;
    return { plates, counts, bill: round(bill + standing), run: round(bill), standing: round(standing), fails, late, refused: null, events: events(plates, c) };
  };
  function events(plates, c) {
    const ev = [];
    const add = k => { if (!ev.includes(k)) ev.push(k); };
    plates.forEach(p => {
      if (p.out === '502') add('502');
      if (p.cold && p.kind === 'api' && plates.filter(x => x.cold && x.kind === 'api').length > 1) add('coldBurst');
      if (p.cold && p.out === 'late') add('cold');
      if (!p.cold && c.prep === 'outside' && p.kind === 'api' && p.out === 'served') add('warm');
      if (p.tries > 1) { add('timeout'); add('retry'); }
      if (p.out === 'timeout') add('timeout');
      if (p.out === 'lost') add('lost');
      if (p.out === 'kept') add('kept');
      if (p.out === 'wrong') add('wrong');
    });
    if (pcOf(c.pc)[1] === 'alias') add('pc');
    if (c.mem > 128 && plates.some(p => p.kind === 's3' && !p.stuck && (p.out === 'served' || p.out === 'late'))) add('cpu');
    return ev;
  }
  const round = n => Math.round(n * 10) / 10;
  const guestsOf = o => o.guests.reduce((a, g) => a + g.n, 0);
  K.guests = id => guestsOf(K.ORDERS[id]);

  // Every recipe the order's knobs allow.
  K.recipes = function (order) {
    const o = K.ORDERS[order];
    let list = [{}];
    o.knobs.forEach(k => { list = [].concat(...list.map(r => K.KNOBS[k].opts.map(v => Object.assign({}, r, { [k]: v })))); });
    return list.map(r => K.cfg(order, r));
  };
  const parCache = {};
  // Par: the cheapest recipe with no failures and at most lateOk late plates. { bill, cfg }.
  K.par = function (order) {
    if (parCache[order]) return parCache[order];
    const o = K.ORDERS[order];
    let best = null;
    K.recipes(order).forEach(c => {
      const r = K.fire(order, c);
      if (r.refused || r.fails || r.late > o.lateOk) return;
      if (!best || r.bill < best.bill) best = { bill: r.bill, cfg: c };
    });
    return (parCache[order] = best);
  };
  K.stars = function (order, r) {
    const o = K.ORDERS[order], n = guestsOf(o), par = K.par(order);
    if (r.refused) return 0;
    if (!r.fails && r.late <= o.lateOk && par && r.bill <= par.bill * K.SLACK + 1e-9) return 3;
    if (!r.fails) return 2;
    return r.fails * 2 <= n ? 1 : 0;
  };
  // Why a 2-star firing missed the third, in words, or ''.
  K.short = function (order, r) {
    const o = K.ORDERS[order], par = K.par(order);
    if (r.refused || r.fails) return '';
    if (r.late > o.lateOk) return `${r.late} late plate${r.late === 1 ? '' : 's'} (this order allows ${o.lateOk || 'none'})`;
    if (par && r.bill > par.bill * K.SLACK) return `the bill is ${r.bill} GB-s; it can be done for ${par.bill}`;
    return '';
  };

  // ---- The night ----
  K.newNight = function (o) {
    o = o || {};
    return { v: 1, night: o.night || 1, step: 0, phase: 'bench', cfg: K.cfg(K.ROUTE[0]), fires: [], stars: {}, debriefs: [], taught: Object.assign({}, o.taught || {}), carry: (o.carry || []).slice() };
  };
  K.order = s => K.ROUTE[s.step];
  // One firing: records it, returns { r, stars, lines } where lines are the rules taught for the first time.
  K.fireNight = function (s, cfg) {
    const id = K.order(s);
    s.cfg = K.cfg(id, cfg);
    const r = K.fire(id, s.cfg), st = K.stars(id, r);
    const lines = r.events.filter(e => K.TEACH[e] && !s.taught[e]);
    if (st === 2 && /bill/.test(K.short(id, r)) && !s.taught.bill) lines.push('bill');
    lines.forEach(e => { s.taught[e] = true; });
    s.fires.push({ cfg: s.cfg, stars: st, bill: r.bill, fails: r.fails, late: r.late });
    s.stars[id] = Math.max(s.stars[id] | 0, st);
    s.phase = 'plates';
    return { r, stars: st, lines };
  };
  K.firesLeft = s => K.FIRES - s.fires.length;
  // Serve: the order's best firing stands; on to its debrief.
  K.serve = s => { s.phase = 'debrief'; };
  K.again = s => { if (K.firesLeft(s) > 0) s.phase = 'bench'; };
  // After the debrief: the next order starts from its own page of the book (the rush starts blank).
  K.next = function (s) {
    s.step++;
    s.fires = [];
    if (s.step >= K.ROUTE.length) { s.phase = 'end'; return; }
    s.cfg = K.cfg(K.order(s));
    s.phase = 'bench';
  };
  K.total = s => K.ROUTE.reduce((a, id) => a + (s.stars[id] | 0), 0);

  if (typeof module !== 'undefined' && module.exports) module.exports = K;
  if (root && root.SD) root.SD.kitchen = K;
})(typeof window !== 'undefined' ? window : globalThis);
