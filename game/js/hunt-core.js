// Monster Hunt's boards: monsters are AWS failures (design: project files game-modes/monster-hunt/real-game-design.md,
// approved by Ladi Nov 16, with Kaiju Cats' plan-then-run challenge). A board is a small architecture in a row
// (callers, IAM door, API gate, queue, function, table). You place config cards within a budget, press Deploy, and
// watch 16 turns play out with no input: 12 turns of arrivals and 4 to drain. Every rule is in js/aws-sim.js with its
// AWS docs link, and a wrong card still does exactly what AWS would do. It just doesn't fix this failure.
// Pure: no DOM, no randomness (a board's numbers shift with its seed), no saves. js/hunt-board.js draws it;
// tools/huntsim_check.js checks every board and card.
//   - The Uptime lamp holds oil, and every error burns some (COST). It carries across a board's deploys. Teach boards
//     have a bigger lamp, so one wrong deploy can be survived; tighter boards don't forgive as much.
//   - Caught: a deploy ends with the lamp lit and every monster on the row contained (see CONTAINED).
//   - Score: requests served − 2 × oil burned − coins spent. Par is the best first-deploy score of any plan that fits
//     the budget, found by trying them all. Stars: 1 caught, 2 caught on the first deploy, 3 also at par.
// Game scale: 1 turn is 15 seconds of real time, and the numbers are small. Card text gives the real settings.
(function (root) {
  const AS = (root.SD && root.SD.awsSim) || (typeof require !== 'undefined' ? require('./aws-sim.js') : null);
  const HC = {};
  HC.TICKS = 12; HC.DRAIN = 4; HC.DEPLOYS = 3;
  HC.COST = { gaveUp: 1, fail: 1, dupe: 1, lost: 2, denied: 1, leak: 3, wgaveUp: 1, left: 1 };
  // A timeout or an out-of-memory error costs nothing by itself: the caller retries it, and what burns oil is the
  // caller giving up (gaveUp).

  // ---- The monsters ----
  HC.MONSTERS = {
    poison: { name: 'The Poison Pill', topic: 'sqs', tile: 'queue', what: 'A message your function can never process.' },
    gate: { name: 'The Throttle Gate', topic: 'apigateway', tile: 'gate', what: 'Takes only so many requests per turn.' },
    hydra: { name: 'The Hot Key Hydra', topic: 'dynamodb', tile: 'table', what: 'Every write lands on one head.' },
    warden: { name: 'The Deny Warden', topic: 'iam', tile: 'door', what: 'Nothing gets through the door it doesn\'t allow.' },
    // Troubleshooting (Domain 4, Ladi, Nov 16): every Phantom board has the same symptom, errors at the function, and a
    // different cause. A clue (an X-Ray trace, a log line or CloudWatch metrics) shows which one, and only its fix holds.
    phantom: { name: 'The Phantom Error', topic: 'lambda', tile: 'fn', what: 'Calls fail at the function. Read the clue to find out why.' }
  };
  // Bank topics that call each monster (js/hunt.js picks the board from the poster's topic).
  HC.TOPICS = { sqs: 'poison', apigateway: 'gate', dynamodb: 'hydra', iam: 'warden', sts: 'warden', lambda: 'phantom', cloudwatch: 'phantom', xray: 'phantom', observability: 'phantom' };

  // ---- Cards. tile: where it goes. refuse(cfg): the reason AWS won't take it on this board, or null. apply(cfg)
  // changes the board's settings. back: what it really does, shown after a deploy (never "right" or "wrong").
  const C = HC.CARDS = {
    dlq: { name: 'Dead-letter queue', tile: 'queue', cost: 1, text: 'Redrive policy: DLQ orders-dlq (standard), maxReceiveCount 3.',
      refuse: c => (c.queue.fifo ? 'A FIFO queue can only use a FIFO dead-letter queue.' : null),
      apply: c => { c.queue.dlq = true; c.queue.maxReceive = 3; },
      back: 'After its 3rd receive fails, SQS moves the message to the dead-letter queue, so it stops coming back.' },
    dlqfifo: { name: 'FIFO dead-letter queue', tile: 'queue', cost: 1, text: 'Redrive policy: DLQ orders-dlq.fifo, maxReceiveCount 3.',
      refuse: c => (!c.queue.fifo ? 'A standard queue can only use a standard dead-letter queue.' : null),
      apply: c => { c.queue.dlq = true; c.queue.maxReceive = 3; },
      back: 'After its 3rd receive fails, SQS moves the message to the FIFO dead-letter queue, and its message group moves again.' },
    vislong: { name: 'Longer visibility timeout', tile: 'queue', cost: 1, text: 'Visibility timeout 30 s → 1 min.',
      apply: c => { c.queue.vis = 4; },
      back: 'A received message stays hidden longer. A message that always fails still comes back, just less often.' },
    vis6x: { name: 'Visibility timeout 6× function timeout', tile: 'queue', cost: 1, text: 'Visibility timeout 30 s → 6 × the function timeout (AWS\'s advice for Lambda).',
      apply: c => { c.queue.vis6x = true; },
      back: 'Messages stay hidden while the function works on them, so none shows again mid-work as a duplicate.' },
    longpoll: { name: 'Long polling', tile: 'queue', cost: 1, text: 'ReceiveMessageWaitTimeSeconds 0 → 20 s.',
      apply: c => { c.queue.longpoll = true; },
      back: 'Fewer empty receives and a smaller bill. What happens to a message after it\'s received doesn\'t change.' },
    purge: { name: 'Purge the queue', tile: 'queue', cost: 0, text: 'At turn 6, PurgeQueue.',
      apply: c => { c.queue.purgeAt = 6; },
      back: 'PurgeQueue deletes every message in the queue: the bad one and every good one waiting with it.' },
    batch10: { name: 'Bigger batches', tile: 'fn', cost: 1, text: 'Event source mapping batch size 2 → 10.',
      apply: c => { c.fn.batch = 10; },
      back: 'Without partial batch responses, one failure sends its whole batch back, so a bigger batch returns more good messages.' },
    fntimeout: { name: 'Longer function timeout', tile: 'fn', cost: 1, text: 'Function timeout 1 min → 3 min.',
      apply: c => { c.fn.timeout = 12; },
      back: 'The function is allowed to run longer, but it still takes the same time. The queue\'s visibility timeout is now even shorter by comparison.' },
    condwrite: { name: 'Conditional write', tile: 'fn', cost: 2, text: 'PutItem with attribute_not_exists(orderId).',
      apply: c => { c.fn.idem = true; },
      back: 'A second write of the same order fails its condition and changes nothing, so a duplicate does no harm. It\'s still delivered, and the function still spends time on every copy.' },
    backoff: { name: 'Backoff with jitter', tile: 'callers', cost: 1, text: 'Client retries wait 1, 2, 4… turns, spread by jitter.',
      apply: c => { c.client.backoff = true; },
      back: 'Bounced requests come back spread out over later turns, as tokens refill, instead of all at once.' },
    retrymore: { name: 'More retries', tile: 'callers', cost: 1, text: 'Client max attempts 3 → 6, retrying at once.',
      apply: c => { c.client.max = 6; },
      back: 'Each bounced request tries again straight away, more times. They still arrive together and hit an empty bucket.' },
    burstup: { name: 'Raise the account burst', tile: 'gate', cost: 1, text: 'Account-level burst 5,000 → 10,000.',
      refuse: () => 'AWS sets the account-level burst, and you can\'t change it. You can ask for a higher rate quota.',
      apply: () => {}, back: '' },
    quota: { name: 'Rate quota increase', tile: 'gate', cost: 1, text: 'Service Quotas: request a higher steady rate.',
      apply: c => { c.gate.later = 99; },
      back: 'A real fix for steady growth, but it applies only once the request is approved, after this rush is over.' },
    lambdaconc: { name: 'Reserved concurrency', tile: 'fn', cost: 1, text: 'Function reserved concurrency → 100.',
      apply: c => { c.fn.stools += 10; },
      back: 'The function can run more copies at once, but the 429s come from the gate in front of it, so nothing changes.' },
    usage: { name: 'Usage plan on the batch key', tile: 'gate', cost: 1, text: 'Usage plan: throttle the nightly batch job\'s API key to 1 request per turn.',
      apply: c => { c.gate.noisyCap = 1; },
      back: 'The batch job\'s key is throttled on its own, so it can\'t empty the bucket your callers share.' },
    shard: { name: 'Write sharding', tile: 'table', cost: 1, text: 'Partition key status → status#1…3 (random suffix).',
      apply: c => { c.table.key = 'shard'; },
      back: 'The suffix spreads one hot value across partitions, so each head takes its share of the writes.' },
    unique: { name: 'High-cardinality key', tile: 'table', cost: 2, text: 'Partition key status → orderId (a new table).',
      apply: c => { c.table.key = 'unique'; },
      back: 'Every order has its own key value, so writes spread across all the partitions.' },
    wcuup: { name: 'More table capacity', tile: 'table', cost: 2, text: 'Provisioned WCU 1,000 → 4,000.',
      apply: c => { c.table.wcuUp = true; },
      back: 'The table\'s total goes up, but one key value still lives on one partition, and a partition tops out at 1,000 WCU.' },
    ondemand: { name: 'On-demand mode', tile: 'table', cost: 1, text: 'Capacity mode: provisioned → on-demand.',
      apply: c => { c.table.onDemand = true; },
      back: 'No capacity to plan, but the per-partition limit applies in either mode, so the hot head still throttles.' },
    dax: { name: 'DAX cluster', tile: 'table', cost: 2, text: 'Put a DAX cache in front of the table.',
      apply: c => { c.table.dax = true; },
      back: 'DAX caches reads. Writes still go to the table, to the same hot partition.' },
    idallow: { name: 'Identity policy Allow', tile: 'door', cost: 1, text: 'App role policy: Allow s3:GetObject on reports/*.',
      apply: c => { c.door.idAllow = true; },
      back: 'In one account, an Allow in the identity policy is enough for S3, unless an explicit Deny applies.' },
    resallow: { name: 'Bucket policy Allow', tile: 'door', cost: 1, text: 'Bucket policy: Allow the app role s3:GetObject.',
      apply: c => { c.door.resAllow = true; },
      back: 'In one account, an Allow in the bucket policy is enough, unless an explicit Deny applies.' },
    admin: { name: 'AdministratorAccess', tile: 'door', cost: 0, text: 'Attach the AWS managed AdministratorAccess policy to the app role.',
      apply: c => { c.door.idAllow = true; c.door.admin = true; },
      back: 'It\'s an Allow for everything, so it loses to any explicit Deny, and it also lets through actions nobody should run.' },
    undeny: { name: 'Remove the Deny', tile: 'door', cost: 1, text: 'Delete the bucket policy\'s Deny statement for the app role.',
      apply: c => { c.door.deny = false; },
      back: 'With the explicit Deny gone, the Allows that were already there can apply.' },
    trust: { name: 'Trust the app role', tile: 'door', cost: 1, text: 'reports-reader trust policy: Allow the app role sts:AssumeRole.',
      apply: c => { c.door.trust = true; },
      back: 'A role\'s trust policy decides who may assume it. Now it names the app role.' },
    stsallow: { name: 'Allow sts:AssumeRole', tile: 'door', cost: 1, text: 'App role policy: Allow sts:AssumeRole on reports-reader.',
      apply: c => { c.door.idAllow = true; },
      back: 'Your side now allows the call, but the role\'s trust policy still doesn\'t name you, so AssumeRole is refused.' },
    // The Phantom's cards (Lambda, checked on docs.aws.amazon.com Nov 16, 2026): timeout default 3 s, max 900 s
    // (configuration-timeout.html); memory 128 MB to 10,240 MB with CPU in proportion (configuration-memory.html);
    // reserved concurrency is both a floor and a ceiling, and over it Lambda throttles (lambda-concurrency.html);
    // provisioned concurrency keeps environments initialized and can't exceed reserved concurrency
    // (provisioned-concurrency.html).
    tmo15: { name: 'Longer timeout', tile: 'fn', cost: 1, text: 'Function timeout 3 s → 15 s.',
      apply: c => { c.fn.timeoutS = 15; },
      back: 'The function may now run for up to 15 seconds, so it can wait for a slow answer. Whatever else is wrong still fails, just later.' },
    mem1g: { name: 'More memory', tile: 'fn', cost: 1, text: 'Function memory 128 MB → 1,024 MB.',
      apply: c => { c.fn.memMB = 1024; },
      back: 'More memory, and CPU in proportion to it. It ends out-of-memory errors and speeds up the function\'s own work, but it can\'t make another service answer faster.' },
    rcup: { name: 'Raise reserved concurrency', tile: 'fn', cost: 1, text: 'Reserved concurrency 2 → 20.',
      apply: c => { c.fn.stools = 20; c.fn.reserved = 20; },
      back: 'Up to 20 copies may run at once, so a rush isn\'t throttled. Each copy still has the same timeout and memory.' },
    provconc: { name: 'Provisioned concurrency', tile: 'fn', cost: 2, text: 'Provisioned concurrency 5 on the live alias.',
      refuse: c => (c.fn.reserved != null && c.fn.reserved < 5 ? 'Provisioned concurrency can\'t be more than the function\'s reserved concurrency.' : null),
      apply: () => {},
      back: 'Five environments stay initialized, so those calls skip the cold start. The timeout, the memory and how many copies may run don\'t change.' },
    roleadmin: { name: 'AdministratorAccess on the role', tile: 'door', cost: 0, text: 'Attach AdministratorAccess to reports-reader.',
      apply: c => { c.door.roleAdmin = true; },
      back: 'That changes what the role can do once assumed. It doesn\'t change who may assume it.' }
  };

  // Bru's line the first time each thing happens (L9: a rule is taught by its first use). Once per save.
  HC.TEACH = {
    throttled: 'Bucket\'s dry. 429. Wait for it to refill.',
    gaveUp: 'Three tries and it gave up. That one\'s an error now.',
    fail: 'It failed again. It\'ll be back when its visibility timeout runs out.',
    dlq: '¡Eso! Into the dead-letter jar. Lid on.',
    dupe: 'Same order, handled twice. It showed again before the function finished.',
    wthrottle: 'All the writes went to one head. Throttled.',
    denied: 'Access denied. Nothing allowed it, or something denied it.',
    leak: '¡Ay! That script just deleted things nobody should delete.',
    lost: 'Purged. The good messages too.',
    refused: 'AWS won\'t take that setting here.',
    timeout: 'Timed out. It was still waiting when the clock ran out.',
    oom: 'Out of memory. It used every megabyte it had.'
  };

  // ---- A small seeded random, so a board's numbers shift per play but replay the same ----
  const rng = seed => { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const pick = (r, a) => a[Math.floor(r() * a.length)];

  // ---- Boards ----
  // make(seed) → { cfg, arrive(t) → tickets, ...labels }. tier: teach, tight, combo, boss. fix: groups of cards, and every
  // winning plan holds at least one card from each group (tools/huntsim_check.js proves it for many seeds).
  const base = () => ({ client: { backoff: false, max: 3 }, gate: null, queue: null, fn: { stools: 2, work: 1, batch: 1, timeout: 4, idem: false }, table: null, door: null });
  const tickets = (t, n, o) => Array.from({ length: n }, (_, i) => Object.assign({ id: `r${t}-${i}`, tag: 'any', work: 1 }, o || {}));
  HC.BOARDS = [
    { id: 'p-teach', fix: [['dlq']], tier: 'teach', mons: ['poison'], tiles: ['callers', 'queue', 'fn'], budget: 2, lamp: 10,
      hand: ['dlq', 'vislong', 'longpoll', 'purge'],
      title: 'One bad order', line: 'One order in the queue can never be processed. Find a way to stop it coming back.',
      make(seed) {
        const r = rng(seed), c = base(), at = 1 + Math.floor(r() * 2), n = 3;
        c.queue = { fifo: false, vis: 2, dlq: false, maxReceive: 3 };
        return { cfg: c, arrive: t => tickets(t, t <= 6 ? n : t <= 10 ? 1 : 0).concat(t === at ? [{ id: 'poison', tag: 'any', work: 1, poison: true }] : []) };
      } },
    { id: 'p-echo', fix: [['vis6x', 'condwrite']], tier: 'tight', mons: ['poison'], tiles: ['callers', 'queue', 'fn'], budget: 2, lamp: 6,
      hand: ['vis6x', 'condwrite', 'fntimeout', 'dlq', 'longpoll', 'batch10'],
      title: 'Lambda consumer: orders handled twice', line: 'The function takes 45 seconds per order and its timeout is 1 minute. The queue still has the default visibility timeout.',
      make(seed) {
        const r = rng(seed), c = base(), n = 1 + (r() < 0.5 ? 0 : 1);
        c.queue = { fifo: false, vis: 2, dlq: false, maxReceive: 3 };
        c.fn = { stools: 6, work: 3, batch: 1, timeout: 4, idem: false };
        return { cfg: c, arrive: t => tickets(t, t <= 10 ? n : 0, { work: 3 }) };
      } },
    { id: 'p-fifo', fix: [['dlqfifo']], tier: 'tight', mons: ['poison'], tiles: ['callers', 'queue', 'fn'], budget: 1, lamp: 6,
      hand: ['dlq', 'dlqfifo', 'vislong', 'purge', 'longpoll'],
      title: 'FIFO queue: one group stuck', line: 'A FIFO queue keeps each customer\'s orders in order. One customer\'s first order can never be processed.',
      make(seed) {
        const r = rng(seed), c = base(), g = pick(r, ['cust-7', 'cust-12', 'cust-31']);
        c.queue = { fifo: true, vis: 2, dlq: false, maxReceive: 3 };
        c.fn = { stools: 3, work: 1, batch: 1, timeout: 4, idem: false };
        let n = 0;
        return { group: g, cfg: c, arrive: t => {
          if (t > 10) return [];
          const out = [{ id: `${g}-${t}`, tag: 'any', work: 1, group: g, n: ++n, poison: t === 1 }];
          out.push({ id: `cust-2-${t}`, tag: 'any', work: 1, group: 'cust-2', n: t });
          return out;
        } };
      } },
    { id: 'g-teach', fix: [['backoff']], tier: 'teach', mons: ['gate'], tiles: ['callers', 'gate', 'fn'], budget: 1, lamp: 8,
      hand: ['backoff', 'lambdaconc', 'burstup', 'quota'],
      title: 'Morning rush', line: 'Callers arrive in bursts bigger than the gate\'s bucket. When a call bounces, the client retries straight away.',
      make(seed) {
        const r = rng(seed), c = base(), big = 7 + (r() < 0.5 ? 0 : 1);
        c.gate = { rate: 2, burst: 3 };
        c.fn = { stools: 20, work: 1, batch: 1, timeout: 4, idem: false };
        return { cfg: c, arrive: t => tickets(t, t === 1 || t === 7 ? big : t <= 12 && t % 3 === 0 ? 1 : 0) };
      } },
    { id: 'g-noisy', fix: [['usage']], tier: 'tight', mons: ['gate'], tiles: ['callers', 'gate', 'fn'], budget: 2, lamp: 6,
      hand: ['backoff', 'usage', 'retrymore', 'burstup', 'quota'],
      title: 'The nightly batch job', line: 'A batch job on its own API key shares the gate with your callers and grabs every token it can.',
      make(seed) {
        const r = rng(seed), c = base(), job = 3 + (r() < 0.5 ? 0 : 1);
        c.gate = { rate: 3, burst: 4 };
        c.fn = { stools: 20, work: 1, batch: 1, timeout: 4, idem: false };
        return { cfg: c, arrive: t => (t > 12 ? [] : tickets(t, job, { tag: 'noisy', noisy: true }).map(x => Object.assign(x, { id: 'j' + x.id })).concat(tickets(t, t % 2 ? 3 : 1))) };
      } },
    { id: 'h-teach', fix: [['shard']], tier: 'teach', mons: ['hydra'], tiles: ['callers', 'fn', 'table'], budget: 2, lamp: 8,
      hand: ['shard', 'wcuup', 'dax', 'ondemand'],
      title: 'Every order is ACTIVE', line: 'Each new order is written with partition key status = ACTIVE. The table has three partitions.',
      make(seed) {
        const r = rng(seed), c = base(), n = 3 + (r() < 0.5 ? 0 : 1);
        c.fn = { stools: 6, work: 1, batch: 1, timeout: 4, idem: false };
        c.table = { key: 'hot', parts: 3, cap: 2 };
        return { cfg: c, arrive: t => tickets(t, t <= 12 ? n : 0) };
      } },
    { id: 'h-tight', fix: [['shard']], tier: 'tight', mons: ['hydra'], tiles: ['callers', 'fn', 'table'], budget: 1, lamp: 5,
      hand: ['shard', 'unique', 'ondemand', 'wcuup', 'dax'],
      title: 'Sale day, one coin', line: 'Same hot key, bigger rush, and only one coin to spend.',
      make(seed) {
        const r = rng(seed), c = base(), n = 4 + (r() < 0.5 ? 0 : 1);
        c.fn = { stools: 8, work: 1, batch: 1, timeout: 4, idem: false };
        c.table = { key: 'hot', parts: 3, cap: 2 };
        return { cfg: c, arrive: t => tickets(t, t <= 12 ? n : 0) };
      } },
    { id: 'w-teach', fix: [['idallow', 'resallow']], tier: 'teach', mons: ['warden'], tiles: ['callers', 'door', 'fn'], budget: 1, lamp: 8,
      hand: ['idallow', 'resallow', 'admin'],
      title: 'The reports bucket', line: 'The app role reads reports from an S3 bucket in the same account. Nothing allows it yet. A stale cleanup script also runs at turn 5.',
      make() {
        const c = base();
        c.fn.stools = 6;
        c.door = { deny: false, idAllow: false, resAllow: false };
        return { cfg: c, arrive: t => (t > 12 ? [] : tickets(t, 2).concat(t === 5 ? [{ id: 'cleanup', tag: 'any', work: 1, forbidden: true }] : [])) };
      } },
    { id: 'w-deny', fix: [['undeny']], tier: 'tight', mons: ['warden'], tiles: ['callers', 'door', 'fn'], budget: 1, lamp: 6,
      hand: ['admin', 'idallow', 'resallow', 'undeny'],
      title: 'The red seal', line: 'The app role\'s policy already allows s3:GetObject, but reads fail. An old incident left a Deny for the app role in the bucket policy.',
      make() {
        const c = base();
        c.fn.stools = 6;
        c.door = { deny: true, idAllow: true, resAllow: false };
        return { cfg: c, arrive: t => (t > 12 ? [] : tickets(t, 2).concat(t === 5 ? [{ id: 'cleanup', tag: 'any', work: 1, forbidden: true }] : [])) };
      } },
    { id: 'w-trust', fix: [['trust']], tier: 'tight', mons: ['warden'], tiles: ['callers', 'door', 'fn'], budget: 1, lamp: 6,
      hand: ['stsallow', 'roleadmin', 'trust'],
      title: 'Assume the reports role', line: 'The app calls sts:AssumeRole on reports-reader, in the same account, and gets AccessDenied.',
      make() {
        const c = base();
        c.fn.stools = 6;
        c.door = { assume: true, trust: false, idAllow: false };
        return { cfg: c, arrive: t => (t > 12 ? [] : tickets(t, 2)) };
      } },
    // The Phantom: the same symptom on every board, a different clue. Calls are synchronous, and the checkout app's own
    // client retries a failed call at once, giving up after 3 attempts. (The AWS SDK wouldn't: a function error comes
    // back as a 200 with X-Amz-Function-Error, which it doesn't retry, and it backs off with jitter on throttles.)
    { id: 'x-teach', fix: [['tmo15']], tier: 'teach', mons: ['phantom'], tiles: ['callers', 'fn'], budget: 1, lamp: 8,
      hand: ['tmo15', 'mem1g', 'rcup', 'provconc'],
      title: 'Checkout hangs', line: 'Checkout calls fail. Read the trace before you pick.',
      clue: { tool: 'X-Ray trace · POST /checkout', lines: ['checkout (Lambda)  3.0 s  ⚠ error', '  Invocation  3.0 s', '    payments-api (HTTP)  3.0 s, no answer yet', 'Function timeout: 3 s (the default) · Memory: 128 MB', 'The payments team: "Our API takes about 8 s to answer this week."'] },
      make(seed) {
        const r = rng(seed), c = base(), off = Math.floor(r() * 2);
        c.fn = { stools: 6, work: 1, batch: 1, timeout: 4, idem: false, timeoutS: 3, callS: 8, memMB: 128, needMB: 100 };
        return { cfg: c, arrive: t => tickets(t, t <= 12 && (t + off) % 2 === 0 ? 1 : 0) };
      } },
    { id: 'x-oom', fix: [['mem1g']], tier: 'tight', mons: ['phantom'], tiles: ['callers', 'fn'], budget: 1, lamp: 6,
      hand: ['mem1g', 'tmo15', 'rcup', 'provconc'],
      title: 'Big photos', line: 'The thumbnail function fails on every upload since the app started sending full-size phone photos.',
      clue: { tool: 'CloudWatch Logs · /aws/lambda/thumbnailer', lines: ['REPORT  Duration: 2104 ms  Billed Duration: 2105 ms  Memory Size: 128 MB  Max Memory Used: 128 MB', 'REPORT  Duration: 1987 ms  Billed Duration: 1988 ms  Memory Size: 128 MB  Max Memory Used: 128 MB', 'Errors: every invocation · Timeout: 30 s'] },
      make(seed) {
        const r = rng(seed), c = base(), n = 1 + (r() < 0.5 ? 0 : 1);
        c.fn = { stools: 6, work: 1, batch: 1, timeout: 4, idem: false, timeoutS: 30, callS: 2, memMB: 128, needMB: 300 };
        return { cfg: c, arrive: t => tickets(t, t <= 12 ? n : 0) };
      } },
    { id: 'x-throttle', fix: [['rcup']], tier: 'tight', mons: ['phantom'], tiles: ['callers', 'fn'], budget: 1, lamp: 6,
      hand: ['rcup', 'tmo15', 'mem1g', 'provconc'],
      title: 'Flash sale', line: 'The sale started and callers get errors. The function itself looks healthy.',
      clue: { tool: 'CloudWatch metrics · sale-api', lines: ['Throttles: climbing every minute', 'ConcurrentExecutions: flat at 2', 'Errors: 0 · Duration p99: 0.9 s', 'Reserved concurrency: 2 (set during last month\'s incident)'] },
      make(seed) {
        const r = rng(seed), c = base(), n = 4 + (r() < 0.5 ? 0 : 1);
        c.fn = { stools: 2, reserved: 2, work: 1, batch: 1, timeout: 4, idem: false, timeoutS: 10, callS: 1, memMB: 512, needMB: 100 };
        return { cfg: c, arrive: t => tickets(t, t <= 12 ? n : 0) };
      } },
    { id: 'x-two', fix: [['tmo15'], ['rcup']], tier: 'combo', mons: ['phantom'], tiles: ['callers', 'fn'], budget: 2, lamp: 7,
      hand: ['tmo15', 'rcup', 'mem1g', 'provconc'],
      title: 'Two clues', line: 'Launch day. Calls fail two different ways. Each clue points at one of them.',
      clue: { tool: 'CloudWatch metrics and an X-Ray trace · launch-api', lines: ['Throttles: climbing · ConcurrentExecutions: flat at 2', 'Reserved concurrency: 2', 'Trace: launch (Lambda)  3.0 s  ⚠ error', '  inventory-api (HTTP)  3.0 s, no answer yet (it usually takes about 6 s)', 'Function timeout: 3 s · Memory: 128 MB'] },
      make(seed) {
        const r = rng(seed), c = base(), n = 3 + (r() < 0.5 ? 0 : 1);
        c.fn = { stools: 2, reserved: 2, work: 1, batch: 1, timeout: 4, idem: false, timeoutS: 3, callS: 6, memMB: 128, needMB: 100 };
        return { cfg: c, arrive: t => tickets(t, t <= 12 ? n : 0) };
      } },
    { id: 'c-gate-hydra', fix: [['backoff'], ['shard']], tier: 'combo', mons: ['gate', 'hydra'], tiles: ['callers', 'gate', 'fn', 'table'], budget: 2, lamp: 7,
      hand: ['backoff', 'shard', 'lambdaconc', 'ondemand', 'burstup', 'dax'],
      title: 'Rush hour, hot key', line: 'Bursts bounce at the gate and retry at once. Whatever gets through writes status = ACTIVE.',
      make(seed) {
        const r = rng(seed), c = base(), big = 7 + (r() < 0.5 ? 0 : 1);
        c.gate = { rate: 2, burst: 3 };
        c.fn = { stools: 20, work: 1, batch: 1, timeout: 4, idem: false };
        c.table = { key: 'hot', parts: 3, cap: 1 };
        return { cfg: c, arrive: t => tickets(t, t === 1 || t === 7 ? big : t <= 12 && t % 3 === 0 ? 1 : 0) };
      } },
    { id: 'c-poison-hydra', fix: [['dlq'], ['shard']], tier: 'combo', mons: ['poison', 'hydra'], tiles: ['callers', 'queue', 'fn', 'table'], budget: 2, lamp: 7,
      hand: ['dlq', 'shard', 'vislong', 'ondemand', 'purge', 'wcuup'],
      title: 'Orders pile up', line: 'One bad order keeps failing in the queue, and every good one writes status = ACTIVE.',
      make(seed) {
        const r = rng(seed), c = base(), n = 3 + (r() < 0.5 ? 0 : 1);
        c.queue = { fifo: false, vis: 2, dlq: false, maxReceive: 3 };
        c.fn = { stools: 3, work: 1, batch: 1, timeout: 4, idem: false };
        c.table = { key: 'hot', parts: 3, cap: 2 };
        return { cfg: c, arrive: t => tickets(t, t <= 10 ? n : 0).concat(t === 1 ? [{ id: 'poison', tag: 'any', work: 1, poison: true }] : []) };
      } },
    { id: 'boss', fix: [['backoff'], ['dlq'], ['shard']], tier: 'boss', mons: ['gate', 'poison', 'hydra'], tiles: ['callers', 'gate', 'queue', 'fn', 'table'], budget: 3, lamp: 8, deploys: 2,
      hand: ['backoff', 'dlq', 'shard', 'vislong', 'ondemand', 'lambdaconc', 'burstup'],
      title: 'Launch night', line: 'Bursts at the gate, a bad order in the queue and a hot key on the table, all at once. Two deploys.',
      make(seed) {
        const r = rng(seed), c = base(), big = 7 + (r() < 0.5 ? 0 : 1), at = 2 + Math.floor(r() * 2);
        c.gate = { rate: 3, burst: 4 };
        c.queue = { fifo: false, vis: 2, dlq: false, maxReceive: 3 };
        c.fn = { stools: 4, work: 1, batch: 1, timeout: 4, idem: false };
        c.table = { key: 'hot', parts: 3, cap: 2 };
        return { cfg: c, arrive: t => tickets(t, t === 1 || t === 7 ? big : t <= 12 ? 2 : 0).concat(t === at ? [{ id: 'poison', tag: 'any', work: 1, poison: true }] : []) };
      } }
  ];
  HC.board = id => HC.BOARDS.find(b => b.id === id) || null;
  HC.deploysOf = b => b.deploys || HC.DEPLOYS;
  // The board a monster gets on its nth catch: teach, then each tight board, then a combo it's in, then the boss.
  HC.ladder = mon => {
    const of = t => HC.BOARDS.filter(b => b.tier === t && b.mons.includes(mon)).map(b => b.id);
    return of('teach').concat(of('tight'), of('combo'), of('boss'));
  };
  HC.boardFor = (mon, wins) => { const l = HC.ladder(mon); return l[Math.min(wins | 0, l.length - 1)] || null; };

  // ---- Plans ----
  const clone = o => JSON.parse(JSON.stringify(o));
  HC.refused = (b, seed, id) => { const c = C[id], s = b.make(seed | 0); return c && c.refuse ? c.refuse(s.cfg) : null; };
  HC.costOf = ids => ids.reduce((n, id) => n + (C[id] ? C[id].cost : 0), 0);
  HC.fits = (b, ids) => HC.costOf(ids) <= b.budget;

  // ---- One deploy: 16 turns with no input. Returns the frames to draw and the outcome. ----
  HC.run = function (b, seed, placed, oil) {
    const spec = b.make(seed | 0), cfg = clone(spec.cfg);
    placed.forEach(id => { const c = C[id]; if (c && !(c.refuse && c.refuse(spec.cfg))) c.apply(cfg); });
    if (cfg.queue && cfg.queue.vis6x) cfg.queue.vis = 6 * cfg.fn.timeout;
    const start = oil == null ? b.lamp : oil;
    const w = AS.world({ desks: [{ id: 'fn', takes: 'any', base: cfg.fn.stools }] });
    w.retry = { backoff: cfg.client.backoff, max: cfg.client.max };
    w.idem = !!cfg.fn.idem;
    w.desks[0].batch = cfg.fn.batch;
    if (cfg.queue) { const q = AS.addQueue(w, cfg.queue.fifo); q.vis = cfg.queue.vis; q.dlq = !!cfg.queue.dlq; q.maxReceive = cfg.queue.maxReceive; }
    const bucket = cfg.gate ? AS.bucket(cfg.gate.rate, cfg.gate.burst) : null;
    let pending = [], writes = [], burned = 0, served = 0;
    const whyOf = {};
    const frames = [], all = [], firstAt = {};
    const counts = {};
    const note = (t, type, id, extra) => { const e = Object.assign({ t, type, id }, extra || {}); all.push(e); counts[type] = (counts[type] | 0) + 1; if (firstAt[type] == null) firstAt[type] = t; if (HC.COST[type]) burned += HC.COST[type]; return e; };
    let out = false, door = null;
    for (let t = 1; t <= HC.TICKS + HC.DRAIN; t++) {
      const evs = [];
      const push = (type, id, extra) => evs.push(note(t, type, id, extra));
      let incoming = (t <= HC.TICKS ? spec.arrive(t) : []).map(x => Object.assign({ attempts: 0 }, x));
      const due = pending.filter(p => p.at <= t); pending = pending.filter(p => p.at > t);
      incoming = incoming.concat(due.map(p => p.tk));
      // The IAM door: a denied call gets 403 and isn't retried.
      if (cfg.door) {
        const v = AS.iamEval(cfg.door);
        door = v.why;
        incoming = incoming.filter(tk => {
          if (tk.forbidden) { if (cfg.door.admin && !cfg.door.deny) push('leak', tk.id); else push('blocked', tk.id); return false; }
          if (!v.allowed) { push('denied', tk.id, { why: v.why }); return false; }
          return true;
        });
      }
      // The API gate: a token bucket, and the client's retries.
      let tokens = null, bounced = 0;
      if (bucket) {
        if (cfg.gate.later && t >= cfg.gate.later) bucket.rate = cfg.gate.rate + 2;
        AS.refill(bucket);
        let noisyN = 0;
        incoming = incoming.filter(tk => {
          if (tk.noisy && cfg.gate.noisyCap != null && ++noisyN > cfg.gate.noisyCap) return false;   // its own usage plan throttles it
          if (AS.take(bucket)) return true;
          if (tk.noisy) return false;
          bounced++;
          push('throttled', tk.id);
          tk.attempts++;
          if (tk.attempts >= cfg.client.max) push('gaveUp', tk.id);
          else pending.push({ tk, at: t + AS.retryWait(tk.attempts, cfg.client.backoff, tk.id) });
          return false;
        });
        tokens = bucket.tokens;
      }
      // The Phantom's function: an invocation that needs more memory than it has, or waits longer than its timeout,
      // errors. Either way the call fails, and the caller retries it.
      if (cfg.fn.timeoutS != null) incoming.forEach(tk => {
        const why = cfg.fn.needMB > cfg.fn.memMB ? 'oom' : cfg.fn.callS > cfg.fn.timeoutS ? 'timeout' : null;
        if (why) { tk.poison = true; whyOf[tk.id] = why; }
      });
      // The function, behind the queue or called directly.
      const fnEv = AS.tick(w, incoming.map(tk => (tk.noisy ? Object.assign({}, tk) : tk)));
      const done = [];
      fnEv.forEach(e => {
        const noisy = /^j/.test(String(e.id));
        if (e.type === 'done') { if (!noisy) done.push({ id: e.id }); return; }
        if (noisy) return;
        if (e.type === 'fail' && whyOf[e.id]) push(whyOf[e.id], e.id);
        else if (['fail', 'dupe', 'dupeBlocked', 'dlq', 'gaveUp', 'throttled'].includes(e.type)) push(e.type, e.id);
      });
      // Purge: every message in the queue is deleted.
      if (cfg.queue && cfg.queue.purgeAt === t) {
        w.queue.items.forEach(m => { if (!m.tk.poison) push('lost', m.tk.id); else w.resolved[m.tk.id] = 1; });
        w.queue.items = [];
      }
      // The table: each handled request writes once. A throttled write is retried by the SDK, 3 attempts in all.
      let load = null;
      if (cfg.table) {
        const batch = writes.concat(done.map(d => ({ id: d.id, attempts: 0 })));
        const wt = AS.writeTurn(batch, cfg.table.key, cfg.table.parts, cfg.table.cap);
        load = wt.load;
        served += wt.ok.length;
        writes = [];
        wt.throttled.forEach(id => {
          const x = batch.find(y => y.id === id);
          x.attempts++;
          push('wthrottle', id);
          if (x.attempts >= 3) push('wgaveUp', id); else writes.push(x);
        });
      } else served += done.length;
      const q = w.queue;
      const poison = q ? q.items.filter(m => m.tk.poison) : [];
      frames.push({
        t, oil: Math.max(0, start - burned), tokens, bounced, load,
        queue: q ? q.items.length : null, hidden: q ? q.items.filter(m => m.hide > 0).length : 0,
        poisonRecv: poison.length ? Math.max(...poison.map(m => m.recv)) : (q && q.bin.length ? q.maxReceive : 0),
        poisonIn: poison.length > 0, jar: q ? q.bin.length : 0,
        busy: w.desks[0].busy.length, stools: AS.stools(w).fn, door, served,
        pendingRetries: pending.length, pendingWrites: writes.length,
        evs: evs.map(e => ({ type: e.type, id: e.id }))
      });
      if (burned >= start) { out = true; break; }
    }
    // Whatever is still waiting at the end was never answered.
    if (!out) {
      const left = (w.queue ? w.queue.items.filter(m => !m.tk.poison).length : 0) + pending.length + writes.length;
      for (let i = 0; i < left; i++) note(HC.TICKS + HC.DRAIN, 'left', null);
      if (burned >= start) out = true;
    }
    const late = type => all.some(e => e.type === type && e.t > 6);
    const poisonLeft = w.queue ? w.queue.items.some(m => m.tk.poison) : false;
    const contained = {};
    b.mons.forEach(m => {
      if (m === 'poison') contained.poison = !poisonLeft && !late('dupe') && !counts.lost;
      if (m === 'gate') contained.gate = !late('gaveUp');
      if (m === 'hydra') contained.hydra = !late('wgaveUp') && !writes.length;
      if (m === 'warden') contained.warden = !late('denied') && !counts.leak;
      // The Phantom's fixes work from the first call, so any error at all means it wasn't contained.
      if (m === 'phantom') contained.phantom = !counts.gaveUp && !counts.timeout && !counts.oom && !counts.throttled;
    });
    const won = !out && Object.values(contained).every(Boolean);
    const coins = HC.costOf(placed.filter(id => !(C[id] && C[id].refuse && C[id].refuse(spec.cfg))));
    return { frames, events: all, counts, firstAt, burned: Math.min(burned, start), out, contained, won, served,
      score: served - 2 * Math.min(burned, start) - coins, coins, oilLeft: Math.max(0, start - burned) };
  };

  // Every plan that fits the budget (refused cards left out), so par is the best a first deploy can do.
  HC.plans = function (b, seed) {
    const spec = b.make(seed | 0), hand = b.hand.filter(id => !(C[id].refuse && C[id].refuse(spec.cfg)));
    const out = [];
    for (let mask = 0; mask < 1 << hand.length; mask++) {
      const ids = hand.filter((_, i) => mask & (1 << i));
      if (HC.fits(b, ids)) out.push(ids);
    }
    return out;
  };
  HC.par = function (b, seed) {
    let best = null;
    HC.plans(b, seed).forEach(ids => { const r = HC.run(b, seed, ids); if (r.won && (!best || r.score > best.score)) best = { score: r.score, ids }; });
    return best;
  };
  HC.stars = (won, deploy, score, par) => (!won ? 0 : deploy > 1 ? 1 : par && score >= par.score ? 3 : 2);

  if (typeof module !== 'undefined' && module.exports) module.exports = HC;
  if (root && root.SD) root.SD.huntCore = HC;
})(typeof window !== 'undefined' ? window : globalThis);
