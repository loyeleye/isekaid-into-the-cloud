// The Rush (prototype, rush.html): the Sorting Floor as a real-time game. Design: project files
// game-modes/lost-and-found-real/real-game/v3 (sketch and storyboard, approved by Ladi on Nov 16: "go").
// These are the rules only, with no drawing, so tools/rush_sim.js can run them headless. js/rush.js draws them.
//
// The AWS behind each rule (DVA-C02), kept true to the docs:
//   - Stools are concurrent executions. Six in the account; the Night Clerk's function takes up to four of them, so
//     Mira's function gets what's left. A synchronous caller who finds no free stool gets a 429 (throttled) and
//     retries with backoff; after three throttles it gives up, and that request is lost (spill).
//   - Reserved stools are reserved concurrency: four are Mira's, nobody else can use them, and she can't use more.
//   - The rack is an SQS standard queue with Lambda polling it: tickets wait instead of bouncing, and delivery is at
//     least once, so now and then the same ticket arrives twice.
//   - The bin is a dead-letter queue on the rack (a redrive policy, maxReceiveCount 3). A poison ticket fails every
//     time; after a failure it stays hidden for the visibility timeout, then comes back. With no bin it never leaves.
//   - The tank is the error budget. Lost requests fill it; when it's full the claim fails.
//   - Claim 2, the Bell: ribboned tickets must reach Mira's function and the Reports function, which sits at the Night
//     Clerk's stools tonight. Without the bell, Mira copies each one out for Reports herself (her stool is held twice
//     as long: the producer calling every consumer itself). The bell is an SNS topic with both as subscribers: one
//     ring and each gets its own copy. SNS invokes Lambda asynchronously, so Reports' copies wait in Lambda's own
//     event queue (the tray) until a Reports stool is free, instead of bouncing.
//   - Claim 3, the Double-claimer: nervous callers resend the same ticket (a client retrying after a timeout), and
//     the rack's at-least-once twins are back. Doing the same ticket twice pays out twice, and that's a lost request
//     in the tank. The ledger is an idempotency record in DynamoDB: before the work, Mira writes the ticket's key
//     with a conditional write (attribute_not_exists). A repeat fails the condition and is dropped at once.
//   - Claim 5, the Picky Bell: the bell is up and rings for every ticket. Mira's function and the Reports function
//     are both subscribed, but Reports only wants refunds (gold envelopes). Without a filter, Reports is invoked for every
//     copy and has to open each one to throw most of them away, so its tray (Lambda's async event queue) backs up;
//     a copy that waits longer than the maximum event age is discarded, and a refund lost that way is a lost request.
//     The filter card is a subscription filter policy on Reports' subscription: SNS only sends it the refunds.
//   - Claim 6, the Hot Shelf (the Records Vault): after Mira does a ticket she files it in one of four cabinets, a
//     DynamoDB table's partitions. The cabinet comes from a hash of the caller (the partition key), so all of one
//     caller's tickets go to the same cabinet. Each cabinet files at most so many tickets a second (a partition's
//     ceiling: 1,000 write units a second), and tonight one caller sends most of the tickets, so their cabinet
//     throttles while the other three sit idle. A throttled write isn't the end: the SDK retries it with exponential
//     backoff, and Mira's stool stays taken while it waits. After three throttles the SDK gives up and the ticket is
//     lost (off the rack it goes back on the rack instead, like any failed message). The suffix stamp is write
//     sharding: a suffix calculated from the ticket number is added to the busy caller's key, so their tickets
//     spread across all four cabinets. The on-demand dial is on-demand capacity mode: each cabinet can go up to the
//     per-partition ceiling instead of its share of the table's provisioned capacity, which helps a little, but
//     the hot caller wants more than one cabinet's ceiling. (Adaptive capacity is on anyway and has the same cap.)
//     Two rooms: while the vault runs, the cellar from the first claims is open too, with lighter waves, as review
//     (CLAIMS.review, a second state in S.review, stepped with the first). Its tickets need the old fixes (the rack,
//     the bin, the bolted stools). The two rooms share the coins and the tank (the error budget), and the night only
//     ends when both are done.
//   - Review questions and the intern (the cellar in claim 6): some tickets are review questions, the letters of
//     earlier claims (ids in S.qpool, set by js/rush.js). They wait on Mira's desk until someone answers; a right
//     answer files them, a wrong one or one left too long is a lost request. The intern (a coin buy) takes any question
//     the player has already solved (the answer book) and answers it after a moment, wrong about one time in five.
//     Its answers wait, stamped, for the player to check: a wrong one caught is saved, and a wrong one nobody checks
//     in time goes into the files and leaks into the tank every few seconds until someone catches it. Checking is a
//     glance; answering is reading the whole question, so the intern pays when it's watched. (No AWS idea here:
//     this is the review.)
//   - The answer book (S.book): one record per question (the letters, by id), whoever answered it. js/rush.js
//     records the player's answers with answer(S, id, right, 'player'); a record is solved once the player has
//     got it right. The book is passed into create() and carried through the run, and a second room writes to its
//     first room's book. It's there so another answerer (by: anything but 'player') can be hooked in later and
//     its answers told apart from the player's: see answer() and solved().
//   - Night Orders (one of two picked before each claim, and they stack): optional twists on these rules.
//     Each has a catch and an upside.
//       cold:   a stool nobody has used for a few seconds is cold, and its next ticket takes three times as long.
//               That's a Lambda cold start (a new execution environment starts before your code runs). Upside: a
//               coin at the start of every wave from wave 2 (Lambda only bills while it runs, so idle is savings).
//       herd:   bounced callers all retry at the same moment instead of on their own backoff. That's a thundering
//               herd; real clients add jitter (a random wait) to spread their retries out. Upside: they try 4 times
//               before giving up, not 3 (SDKs let you set the number of attempts). The bite: every four retries
//               that land together bring a new caller (a retry storm adds load on top of the load).
//       batch:  each stool takes two tickets off the rack per trip and does them in a bit more than the time of one
//               (Lambda's batch size on an SQS trigger). Catch: if either fails, both go back (a batch fails as a
//               whole unless the function reports partial batch failures).
//       fifo:   the rack is a FIFO queue: each caller's tickets go out one at a time, in order (a message group has
//               one message in flight at a time). Upside: the rack drops a ticket it has already been sent (FIFO
//               deduplication), and never hands out a twin.
//       shelf:  a ticket left on the rack too long expires and is lost. That's the queue's message retention period
//               (1 minute to 14 days in SQS; seconds here). Upside: the rack is free (SQS's free tier).
//       eventual: before closing a ticket Mira looks it up, and now and then the read comes back stale (it doesn't
//               show a write that only just finished), so she reads again and her stool stays taken a bit longer.
//               That's DynamoDB's default, the eventually consistent read; asking again shortly returns the new item.
//               Upside: eventually consistent reads cost half as much, so a coin at the start of every claim.
//     Letters (questions between waves), stakes and the timeout are Night Orders too, but they're about the
//     questions, so they live in js/rush.js.
//   - The extra buys (each claim's `extra` list; a tool with `order` only joins the belt while that order is pinned):
//       Upkeep: some buys bill coins at the start of waves 2 to 4. Coins can go below zero for upkeep only, and you
//       can't buy while they are. A claim's books close at the end: debt is written off, leftovers carry over.
//       warm:     (cold only) provisioned concurrency on Mira's first stool: never cold, but billed every wave, used or not
//                 (https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html,
//                 https://aws.amazon.com/lambda/pricing/).
//       jitter:   (herd only) callers back off exponentially with a random jitter, so far fewer retries land
//                 together. It also gives back the herd's upside: 3 tries again, not 4
//                 (https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html).
//       handoff:  without the bell, Mira invokes Reports asynchronously (InvocationType Event) instead of copying a
//                 ribboned ticket out herself: Lambda queues the event and answers at once, so her stool is held a
//                 little longer, not twice as long, and Reports' copy waits in its tray. The bell still decouples
//                 better: Mira doesn't know about Reports at all
//                 (https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html).
//       ledger in the Slow Courier (2 coins there): an idempotent handler shrugs off the rack's duplicates, the
//                 ones from at-least-once delivery and the ones a short visibility timeout causes
//                 (https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html).
//       memory:   more memory for Mira's function. Lambda gives CPU in proportion to memory, so her jobs are quicker,
//                 and you pay for it every wave (GB-seconds)
//                 (https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html).
//       ttl:      the ledger bills storage, a coin a wave for every 12 keys it holds. TTL deletes keys once they
//                 expire, at no cost; a repeat that arrives after its key has gone is paid twice, so the TTL has to
//                 outlast the retry window (https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html).
//       partial:  (batch only) ReportBatchItemFailures: when one ticket in a batch fails, only that one goes back
//                 (https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html). Not at the Slow
//                 Courier: its bad tickets time out, and a timed-out invocation fails the whole batch whatever it
//                 would have returned, so the buy would do nothing there.
//       dest:     an on-failure destination for Reports' async invocations: a refund that ages out or fails every
//                 retry goes in the crate with its record instead of vanishing. Replaying one costs a coin (a game
//                 rule: someone has to redrive it); whatever's still in the crate at closing is lost
//                 (https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html).
//       retries:  the retry attempts dial on Reports' async invocations, 2 (the default), 1 or 0. In the Picky Bell some
//                 refund copies jam once and some always fail
//                 (https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html).
//     Long polling was cut: Lambda's SQS poller already long-polls whatever the queue says, so it isn't a lever for
//     Mira's rack (https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html).
(function (root) {
  const SD = root.SD = root.SD || {};
  const T = {
    slide: 0.9, walk: 0.5, work: 1.4, done: 0.7, bounce: 0.9, splat: 0.6, tobin: 0.8, back: 0.5, hidden: 1.6,
    backoff: [0.6, 1.4], gap: 3, clog: 6, drop: 0.45, coldAfter: 2, coldX: 3, herd: 2.5, retain: 20,
    // The Slow Courier: heavy parcels take longer; the rack hides a taken ticket for vis seconds (visHourglass with
    // the hourglass); the stopwatch cuts any job off at fnTimeout. Batching does two tickets in batchX of the time.
    heavy: 4, vis: 3, visHourglass: 9, fnTimeout: 6, stuckSay: 7, batchX: 1.5,
    // The Picky Bell: a copy waiting in Reports' tray longer than maxAge is discarded (maximum event age).
    maxAge: 5, report: 2.45,
    // The extra buys: memory's speed-up, the ledger's keys per coin of storage bill and
    // its TTL, and the wait before Reports retries a failed copy.
    memX: 0.94, warmN: 1, handX: 1.65, perBill: 12, ttl: 12, jitter: 0.25, jitterWin: 0.2, retryWait: 1.2, badWork: 2.45,
    // The Hot Shelf: Mira's quick job before filing; each cabinet's filing rate a second (its share of the table) and
    // with the on-demand dial (the per-partition ceiling); how many unused filings a cabinet can bank (burst).
    // Eventually consistent: how often a read comes back stale, and how long the second look takes.
    vaultWork: 0.25, cabRate: 0.8, cabMax: 1.0, cabBurst: 2.5, staleP: 0.12, stale: 0.8,
    // Review questions: how long one waits for an answer; the intern's thinking time and how often it's wrong; how
    // long its answer waits to be checked; how often a wrong one nobody caught leaks into the tank.
    askWait: 14, internThink: 1.5, internWrong: 0.25, checkWindow: 8, leak: 3
  };
  const CABS = 4, HOT_CAB = 2;
  const STOOLS = 6, CLERK_MAX = 4, RESERVE = 4, CAP = 12, MAX_THROTTLES = 3, MAX_RECEIVES = 3, TWIN_P = 0.1;
  // Each wave: how many tickets, over how many seconds, and how many of them are poison.
  const WAVES = [
    { n: 10, secs: 4, poison: 0 },
    { n: 14, secs: 5, poison: 0 },
    { n: 12, secs: 5, poison: 3 },
    { n: 24, secs: 6, poison: 2 }
  ];
  // The claims, played in order. A claim's locked tools show on the belt as "next claim".
  const CLAIMS = {
    rush: { name: 'THE RUSH', title: 'the Rush', waves: WAVES, locked: ['bell'], next: 'bell', close: 95, clerk: 'papers' },
    bell: {
      name: 'THE BELL', title: 'the Bell', locked: [], next: 'double', close: 70, clerk: 'reports',
      waves: [
        { n: 10, secs: 5, poison: 0, ribbon: 0.8 },
        { n: 14, secs: 5, poison: 0, ribbon: 0.8 },
        { n: 14, secs: 5, poison: 2, ribbon: 0.7 },
        { n: 20, secs: 6, poison: 1, ribbon: 0.8 }
      ]
    }
  };
  CLAIMS.double = {
    name: 'THE DOUBLE-CLAIMER', title: 'the Double-claimer', locked: [], next: null, close: 80, clerk: 'papers',
    belt: ['rack', 'reserve', 'bin', 'ledger'], resend: 0.35, twiceCosts: true,
    waves: [
      { n: 10, secs: 5, poison: 0 },
      { n: 12, secs: 5, poison: 0 },
      { n: 12, secs: 5, poison: 1 },
      { n: 16, secs: 6, poison: 1 }
    ]
  };
  // Claim 4: some parcels are heavy and some never finish. The rack is already up, and it hides a taken ticket for
  // only 3 seconds: a job that runs longer reappears on the rack, someone else does it too, and it pays out twice.
  // The hourglass is the queue's visibility timeout (longer than any honest job); the stopwatch is the function's
  // timeout (it cuts a stuck job off so it fails, goes back and, with the bin, ends up there). It needs both, the
  // stopwatch shorter than the hourglass: AWS says set the visibility timeout to at least 6 times the function's.
  CLAIMS.slow = {
    name: 'THE SLOW COURIER', title: 'the Slow Courier', locked: [], next: null, close: 85, clerk: 'papers',
    belt: ['reserve', 'bin', 'hourglass', 'stopwatch'], rackUp: true, visibility: true, twiceCosts: true,
    waves: [
      { n: 8, secs: 5, poison: 0, heavy: 0.4 },
      { n: 10, secs: 5, poison: 1, heavy: 0.4 },
      { n: 10, secs: 5, poison: 1, heavy: 0.4 },
      { n: 12, secs: 6, poison: 1, heavy: 0.4 }
    ]
  };
  CLAIMS.double.next = 'slow';
  // Claim 5: the bell is up and rings for every ticket; Reports only wants the refunds. See the header.
  CLAIMS.picky = {
    name: 'THE PICKY BELL', title: 'the Picky Bell', locked: [], next: null, close: 80, clerk: 'reports',
    belt: ['rack', 'reserve', 'bin', 'filter'], bellUp: true, picky: true,
    waves: [
      { n: 12, secs: 5, poison: 0, refund: 0.5 },
      { n: 16, secs: 5, poison: 0, refund: 0.5 },
      { n: 16, secs: 5, poison: 1, refund: 0.5 },
      { n: 20, secs: 6, poison: 1, refund: 0.5 }
    ]
  };
  CLAIMS.slow.next = 'picky';
  // Claim 6: the Records Vault. One caller sends most of the tickets, and their cabinet throttles. See the header.
  CLAIMS.hot = {
    name: 'THE HOT SHELF', title: 'the Hot Shelf', locked: [], next: 'locked', close: 56, clerk: 'papers',
    belt: ['shard', 'ondemand', 'rack'], vault: true, mira: 3, coins: 1,
    // hot: the share of each wave's tickets from the one busy caller.
    waves: [
      { n: 12, secs: 5, poison: 0, hot: 0.8 },
      { n: 16, secs: 5, poison: 0, hot: 0.8 },
      { n: 18, secs: 5, poison: 0, hot: 0.8 },
      { n: 24, secs: 6, poison: 0, hot: 0.8 }
    ]
  };
  CLAIMS.picky.next = 'hot';
  // The review room for claim 6: the cellar of claims 1 to 3, lighter, with poison from wave 3. Never played alone.
  CLAIMS.review = {
    name: 'THE CELLAR', title: 'the cellar', locked: [], next: null, close: 56, clerk: 'papers',
    // ask: how many review questions come down in the wave, between the tickets.
    belt: ['rack', 'reserve', 'bin', 'intern'],
    waves: [
      { n: 8, secs: 4, poison: 0, ask: 2 },
      { n: 10, secs: 4, poison: 0, ask: 3 },
      { n: 10, secs: 5, poison: 2, ask: 3 },
      { n: 14, secs: 6, poison: 2, ask: 4 }
    ]
  };
  CLAIMS.hot.review = 'review';
  // ---- Claim 8, the Night Audit (rules in js/rush-audit.js, SD.rushAudit) ----
  // One continuous night, 22:00 to 06:00, no waves: faults overlap at four stations, and the buys change what you can
  // see. Not chained yet (claim 7 comes before it); play it with rush.html?claim=audit.
  CLAIMS.audit = {
    name: 'THE NIGHT AUDIT', title: 'the Night Audit', engine: 'audit', room: 'watch', locked: [], next: 'sorter', close: 144, clerk: 'papers', cap: 26,
    belt: ['tracer', 'pins', 'alarm', 'stamp', 'tally', 'hires'], extras: ['rule', 'lens'],
    night: { start: 22, hours: 8, hourSecs: 18, rate: [0.32, 0.36, 0.4, 0.44, 0.48, 0.52, 0.56, 0.6], maxLive: [1, 1, 2, 3, 3, 3, 3, 3],
      gap: [[0, 0], [0, 0], [12, 16], [11, 15], [10, 14], [9, 13], [9, 13], [9, 12]], transientP: 0.35, refund: 0.3 }
  };
  // ---- end claim 8 ----
  const TOOLS = {
    rack: { name: 'Rack', aws: 'SQS standard queue', cost: 1 },
    reserve: { name: 'Bolted stools', aws: 'Reserved concurrency', cost: 1 },
    bin: { name: 'Dead-letter bin', aws: 'Dead-letter queue', cost: 1 },
    bell: { name: 'Bell', aws: 'SNS topic (fan-out)', cost: 1 },
    ledger: { name: 'Ledger', aws: 'DynamoDB conditional write (idempotency)', cost: 1 },
    hourglass: { name: 'Hourglass', aws: 'Visibility timeout', cost: 1 },
    stopwatch: { name: 'Stopwatch', aws: 'Function timeout', cost: 1 },
    filter: { name: 'Filter card', aws: 'SNS subscription filter policy', cost: 1 },
    shard: { name: 'Suffix stamp', aws: 'Write sharding (partition key suffix)', cost: 1 },
    ondemand: { name: 'On-demand dial', aws: 'On-demand capacity mode', cost: 1 },
    intern: { name: 'Intern', aws: 'Review helper (answers what you\'ve solved)', cost: 1 }
  };
  // The extra buys (see the header). upkeep: coins billed at the start of waves 2 to 4. needs: placed only after that
  // tool. order: on the belt only while that Night Order is pinned.
  Object.assign(TOOLS, {
    warm: { name: 'Warm stool', aws: 'Provisioned concurrency', cost: 1, upkeep: 1, order: 'cold' },
    jitter: { name: 'Jitter dial', aws: 'Exponential backoff with jitter', cost: 2, order: 'herd' },
    handoff: { name: 'Hand-off', aws: 'Async invoke (InvocationType Event)', cost: 1 },
    memory: { name: 'Memory', aws: 'Function memory (CPU scales with it)', cost: 1, upkeep: 1 },
    ttl: { name: 'TTL', aws: 'DynamoDB Time to Live', cost: 1, needs: 'ledger' },
    partial: { name: 'Partial batch', aws: 'ReportBatchItemFailures', cost: 1, order: 'batch' },
    dest: { name: 'Failure crate', aws: 'On-failure destination (async)', cost: 1 },
    retries: { name: 'Retry dial', aws: 'Async retry attempts (0 to 2)', cost: 1 }
  });
  // Claim 8's buys (the Night Audit). hourly: coins billed on the clock's hour. where: what it's placed on.
  Object.assign(TOOLS, {
    tracer: { name: 'Tracer', aws: 'X-Ray active tracing', cost: 2, hourly: 1, where: 'room' },
    pins: { name: 'Pins', aws: 'X-Ray annotations (searchable)', cost: 1, where: 'room' },
    rule: { name: 'Rule card', aws: 'X-Ray sampling rule (at the root)', cost: 1, where: 'counter' },
    alarm: { name: 'Klaxon', aws: 'CloudWatch alarm (SNS action)', cost: 1, where: 'gauge' },
    stamp: { name: 'EMF stamp', aws: 'Embedded metric format', cost: 1, where: 'desk' },
    tally: { name: 'Tally', aws: 'Custom metric (PutMetricData)', cost: 1, where: 'station' },
    hires: { name: '1s dial', aws: 'High-resolution metric and alarm', cost: 1, hourly: 1, where: 'gauge' },
    lens: { name: 'Lens', aws: 'CloudWatch Logs Insights query', cost: 1, where: 'room' }
  });
  CLAIMS.rush.extra = ['memory', 'warm', 'jitter'];
  CLAIMS.bell.extra = ['handoff', 'memory', 'partial'];
  CLAIMS.double.extra = ['memory', 'ttl', 'partial'];
  CLAIMS.slow.extra = ['ledger'];
  // The ledger costs more at the dock: it's a whole table, not a page in a book.
  CLAIMS.slow.costs = { ledger: 2 };
  // Memory is priced up at the Rush, so it can't stand in for the rack (or the bolted stools) as a cheap fix.
  CLAIMS.rush.costs = { memory: 2 };
  CLAIMS.picky.extra = ['dest', 'retries', 'partial'];
  // The Picky Bell's Reports copies can fail now: some refunds jam once (a retry fixes them), a few always fail.
  CLAIMS.picky.waves.forEach((w, i) => { w.jam = i >= 2 ? 0.05 : 0; w.bad = i >= 2 ? 0.05 : 0; });
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // coins: what's left over from the last claim, on top of the usual 2. book: the run's answer book (a Map), if any.
  function create(seed, claim, orders, coins, book) {
    const C = CLAIMS[claim] || CLAIMS.rush;
    const S = {
      claim: CLAIMS[claim] ? claim : 'rush', name: C.name, locked: C.locked.slice(), next: C.next, close: C.close,
      orders: new Set(orders || []), maxThrottles: (orders || []).includes('herd') ? MAX_THROTTLES + 1 : MAX_THROTTLES, saved: 0, storm: 0, lastFree: Array(STOOLS).fill(-99), colds: 0, expired: 0, herds: 0,
      clerk: C.clerk, twiceCosts: !!C.twiceCosts, belt: (C.belt || ['rack', 'reserve', 'bin', 'bell']).slice(), ledger: false, keys: new Set(), paidTwice: 0, dropped: 0, resends: 0,
      seed: seed >>> 0, rand: rng(seed || 1), time: 0, started: false, over: null, tray: [], reports: 0, rings: 0,
      wave: 0, spawns: [], nextId: 1, tickets: [], queue: [],
      rack: !!C.rackUp, reserve: false, bin: false, hourglass: false, stopwatch: false, visibility: !!C.visibility, bell: !!C.bellUp, picky: !!C.picky, filter: false, filtered: 0, tossed: 0, aged: 0, deduped: 0, sent: new Set(), reappeared: 0, timedOut: 0, batches: 0, batchFails: 0,
      book: book || new Map(), qpool: [], asks: [], quizN: 0, intern: false, asked: 0, reviewed: 0, byYou: 0, byIntern: 0, caught: 0, missed: 0, leaked: 0, unanswered: 0, wrongYou: 0,
      // Two rooms (claim 6) start with a coin more.
      coins: 2 + (C.coins || 0) + (coins || 0) + ((orders || []).includes('eventual') ? 1 : 0), bonusGiven: false, stale: 0,
      vault: !!C.vault, miraStools: C.mira || 0, shard: false, ondemand: false, hotThrottles: 0, writeLost: 0,
      cabs: Array.from({ length: CABS }, () => ({ tok: T.cabBurst, filed: 0, throttled: 0, heat: 0 })),
      spill: 0, cap: CAP, handled: 0, binned: 0, twins: 0, throttles: 0, lost: 0,
      placed: [], events: [], clogT: 0, allSpawned: false
    };
    // The extra buys: on the belt after the claim's own tools, an order's buy only while that order is pinned.
    for (const t of C.extra || []) if (!TOOLS[t].order || S.orders.has(TOOLS[t].order)) S.belt.push(t);
    Object.assign(S, { costs: C.costs || null, handed: 0, upkeepPaid: 0, bills: 0, retryN: 2, landed: [], crate: [], crated: 0, replayed: 0, failedOut: 0, jams: 0, ttlGone: 0, paidKeys: new Set(), keyAt: new Map(), partials: 0 });
    // Claim 8: the Watch Room has its own engine (js/rush-audit.js), with no waves.
    if (C.engine === 'audit') return root.SD.rushAudit.init(S, C);
    // Spawn times: each wave spreads its tickets over its seconds, with a little jitter, poison mixed in.
    let t = 0.4;
    C.waves.forEach((w, wi) => {
      const poisonAt = new Set();
      while (poisonAt.size < w.poison) poisonAt.add(2 + Math.floor(S.rand() * (w.n - 2)));
      for (let i = 0; i < w.n; i++) {
        const poison = poisonAt.has(i);
        const at = t + (i / w.n) * w.secs + S.rand() * 0.25, key = 'k' + S.spawns.length;
        S.spawns.push({ t: at, wave: wi + 1, poison, stuck: poison && !!C.visibility, ribbon: !poison && S.rand() < (w.ribbon || 0), heavy: !poison && !!w.heavy && S.rand() < w.heavy, refund: !poison && !!w.refund && S.rand() < w.refund, hot: !poison && !!w.hot && S.rand() < w.hot, cab: w.hot ? Math.floor(S.rand() * CABS) : 0, group: i % 3, key });
        { const sp = S.spawns[S.spawns.length - 1]; if (sp.refund && w.jam) { const r = S.rand(); sp.fail = r < w.bad ? 'bad' : r < w.bad + w.jam ? 'jam' : ''; } }
        // A nervous caller sends the same ticket again a moment later.
        if (!poison && C.resend && S.rand() < C.resend) S.spawns.push({ t: at + 0.8 + S.rand() * 1.6, wave: wi + 1, poison: false, ribbon: false, group: i % 3, key, resend: true });
      }
      // Review questions, spread through the wave (no dice, so the room's other rolls are untouched).
      for (let j = 0; j < (w.ask || 0); j++) S.spawns.push({ t: t + (j + 0.5) / w.ask * w.secs + 0.2, wave: wi + 1, poison: false, quiz: true, key: 'q' + j, qn: S.quizN++ });
      t += w.secs + (C.gap || T.gap);
    });
    S.spawns.sort((a, b) => a.t - b.t);
    // A second room running alongside (its own seed, so this room's rolls are untouched). It shares the coins and the tank.
    if (C.review) { S.review = create(((seed >>> 0) ^ 0x5bd1e995) >>> 0, C.review, orders, 0, S.book); S.review.parent = S; S.review.close = S.close; }
    // Claim 9 (the freight yard): its own rules live in js/rush-yard.js.
    if (C.yard && SD.rushYard) SD.rushYard.init(S, C);
    // Claim 7 (the Locked Desk): its rules live in js/rush-office.js.
    if (C.office && SD.rushOffice) SD.rushOffice.init(S, C);
    return S;
  }
  // Which stools are whose. Index 0 is next to Mira's desk.
  function owners(S) {
    const mira = S.reserve ? RESERVE : S.miraStools || STOOLS - CLERK_MAX;
    return Array.from({ length: STOOLS }, (_, i) => (i < mira ? 'mira' : 'clerk'));
  }
  function seats(S) {
    const own = owners(S), busy = new Set(S.tickets.filter(k => k.stool != null).map(k => k.stool));
    return own.map((o, i) => ({ owner: o, ticket: busy.has(i) ? S.tickets.find(k => k.stool === i).id : null }));
  }
  // In the Rush the Night Clerk's papers hold his stools; in the Bell they're the Reports function's.
  // A stool counts as warm while it's in use (a ticket was just freed from it this frame).
  function busySince(S, i) { return S.lastFree[i] >= S.time; }
  function freeStool(S, owner) {
    const s = seats(S), o = owner || 'mira';
    if (o === 'clerk' && S.clerk === 'papers') return -1;
    for (let i = 0; i < s.length; i++) if (s[i].owner === o && s[i].ticket == null) return i;
    return -1;
  }
  const ev = (S, type, data) => S.events.push(Object.assign({ type, t: S.time }, data || {}));
  // The coins: a second room spends from the first room's purse.
  const purse = S => S.parent || S;
  // Shelf life's upside: the rack is free.
  function costOf(S, tool) { return tool === 'rack' && S.orders.has('shelf') ? 0 : S.costs && S.costs[tool] != null ? S.costs[tool] : TOOLS[tool].cost; }
  function canPlace(S, tool, target, opts) {
    if (S.audit) return root.SD.rushAudit.canPlace(S, tool, target, opts); // claim 8
    const d = TOOLS[tool];
    if (!d) return 'unknown';
    if (S.locked.includes(tool) || !S.belt.includes(tool)) return 'locked';
    if (S[tool]) return 'placed';
    if (d.needs && !S[d.needs]) return 'needs';
    if (purse(S).coins < costOf(S, tool)) return 'coins';
    if (S.over || purse(S).over) return 'over';
    return '';
  }
  function place(S, tool, target, opts) {
    if (S.audit) return root.SD.rushAudit.place(S, tool, target, opts); // claim 8
    const why = canPlace(S, tool);
    if (why) return why;
    S[tool] = true; purse(S).coins -= costOf(S, tool); S.placed.push(tool);
    // The jitter dial spreads the herd out, and the herd's 4 tries go with it. The retry dial starts at 1.
    if (tool === 'jitter') S.maxThrottles = MAX_THROTTLES;
    if (tool === 'retries') S.retryN = 1;
    if (tool === 'intern') placeIntern(S);
    // Claim 7: its buys set up their own state (js/rush-office.js).
    if (S.office && SD.rushOffice) SD.rushOffice.placed(S, tool);
    // Tickets already waiting their turn to retry walk onto the new rack.
    ev(S, 'place', { tool });
    return '';
  }
  function start(S) { const M = purse(S); if (!M.started && !M.over) { M.started = true; ev(M, 'lever'); if (M.review) M.review.started = true; } }
  function go(k, phase, dur) { k.phase = phase; k.t = 0; k.dur = dur; }
  function spawn(S, sp) {
    if (sp.resend) { S.resends++; ev(S, 'resend', { key: sp.key }); }
    if (sp.quiz) { const q = { id: S.nextId++, key: sp.key, wave: sp.wave, quiz: true, qn: sp.qn, poison: false, desk: 'mira', throttles: 0, receives: 0, stool: null, from: 'chute', phase: '', t: 0, dur: 0 }; go(q, 'slide', T.slide); S.tickets.push(q); return; }
    const k = { id: S.nextId++, key: sp.key, wave: sp.wave, poison: sp.poison, stuck: !!sp.stuck, heavy: !!sp.heavy, refund: !!sp.refund, fail: sp.fail || '', hot: !!sp.hot, cab: sp.cab || 0, group: sp.group, ribbon: sp.ribbon, desk: 'mira', twin: !!sp.resend, throttles: 0, receives: 0, stool: null, from: 'chute', phase: '', t: 0, dur: 0 };
    go(k, 'slide', T.slide);
    S.tickets.push(k);
    if (S.yard) SD.rushYard.onSpawn(S, k, sp);
  }
  // Onto the rack. Retention counts from when the ticket was first sent, not each time it comes back.
  function enqueue(S, k) { go(k, 'shelf', 0); if (k.queuedAt == null) k.queuedAt = S.time; S.queue.push(k.id); }
  function free(S, k) { if (k.stool != null) S.lastFree[k.stool] = S.time; k.stool = null; }
  function remove(S, k) { S.tickets = S.tickets.filter(x => x !== k); }
  // The ticket reaches the bottom of the chute.
  function arrive(S, k) {
    // A review question lands on Mira's desk and waits for an answer.
    if (k.quiz) { k.q = S.qpool.length ? S.qpool[k.qn % S.qpool.length] : null; k.askAt = S.time; go(k, 'ask', 0); S.asks.push(k.id); S.asked++; ev(S, 'ask', { id: k.id, q: k.q }); return; }
    // The bell rings once and Reports gets its own copy, which waits in the tray.
    if (k.ribbon && S.bell) {
      k.ribbon = false; S.rings++;
      const c = { id: S.nextId++, wave: k.wave, poison: false, ribbon: false, desk: 'reports', twin: false, throttles: 0, receives: 0, stool: null, from: 'tray', phase: '', t: 0, dur: 0 };
      go(c, 'tray', 0); S.tickets.push(c); S.tray.push(c.id);
      ev(S, 'ring', { id: k.id, copy: c.id });
    }
    // The Picky Bell rings once for every ticket. Reports gets a copy unless its filter policy rules it out.
    if (S.picky && S.bell && !k.rung && k.desk === 'mira') {
      k.rung = true;
      if (k.refund || !S.filter) {
        S.rings++;
        const c = { id: S.nextId++, wave: k.wave, poison: false, ribbon: false, desk: 'reports', want: !!k.refund, fail: k.refund ? k.fail : '', read: true, twin: false, throttles: 0, receives: 0, stool: null, from: 'tray', phase: '', t: 0, dur: 0, trayAt: S.time };
        go(c, 'tray', 0); S.tickets.push(c); S.tray.push(c.id);
        ev(S, 'ring', { id: k.id, copy: c.id, want: c.want });
      } else { S.filtered++; ev(S, 'filtered', { id: k.id }); }
    }
    // Claim 9: new-form refunds come over the counter (a synchronous call), so they skip the platform.
    if (S.yard && k.sync) { SD.rushYard.counter(S, k); return; }
    if (S.rack) {
      // FIFO: the rack drops a ticket it has already been sent (deduplication).
      if (S.orders.has('fifo') && k.key) {
        if (S.sent.has(k.key)) { remove(S, k); S.deduped++; ev(S, 'dedup', { id: k.id }); return; }
        S.sent.add(k.key);
      }
      enqueue(S, k); return;
    }
    const i = freeStool(S);
    if (i >= 0) { k.stool = k.seat = i; k.from = 'chute'; go(k, 'walk', T.walk); return; }
    k.throttles++; S.throttles++;
    ev(S, 'throttle', { id: k.id, n: k.throttles });
    if (k.throttles >= S.maxThrottles) { go(k, 'splat', T.splat); return; }
    go(k, 'bounce', T.bounce);
  }
  function workOf(k, S) { return k.read ? (k.fail === 'bad' ? T.badWork : T.report) : k.stuck ? Infinity : k.heavy ? T.heavy : k.ribbon ? T.work * 2 : S && S.vault ? T.vaultWork : T.work; }
  // The Hot Shelf: which cabinet a ticket files into. The busy caller's key always hashes to the same one, unless the
  // suffix stamp adds a number calculated from the ticket (write sharding), which spreads them over all four.
  function cabOf(S, k) { return k.hot ? (S.shard ? (parseInt(String(k.key).slice(1), 10) || k.id) % CABS : HOT_CAB) : k.cab; }
  function cabRate(S) { return S.ondemand ? T.cabMax : T.cabRate; }
  // File the ticket: the cabinet takes it if it has room this second. If not, the write is throttled, and the SDK
  // retries it with backoff while the ticket keeps Mira's stool. After the last try the write fails.
  function tryFile(S, k) {
    const c = cabOf(S, k), cab = S.cabs[c];
    cab.heat += 1;
    if (cab.tok >= 1) { cab.tok -= 1; cab.filed++; k.cabAt = c; free(S, k); go(k, 'done', T.done); return; }
    k.wthrottles = (k.wthrottles || 0) + 1; S.throttles++; S.hotThrottles++; cab.throttled++;
    ev(S, 'hotThrottle', { id: k.id, cab: c, n: k.wthrottles, hot: k.hot });
    if (k.wthrottles >= S.maxThrottles) {
      free(S, k); S.writeLost++; ev(S, 'writeFail', { id: k.id, cab: c });
      if (k.from === 'rack') failBack(S, k); else go(k, 'splat', T.splat);
      return;
    }
    go(k, 'retry', T.backoff[k.wthrottles - 1] || 1);
  }
  // Eventually consistent: Mira's look-up before she closes a ticket comes back stale now and then, so she looks again.
  function staleRead(S, k) {
    if (!S.orders.has('eventual') || k.reread || k.desk !== 'mira' || k.poison || k.cutOff || (k.riders && k.riders.length)) return false;
    if (S.rand() >= T.staleP) return false;
    k.reread = true; S.stale++; ev(S, 'stale', { id: k.id, stool: k.stool }); go(k, 'work', T.stale);
    return true;
  }
  // Batching: the tickets riding along with this one.
  function riders(S, k) { return (k.riders || []).map(id => S.tickets.find(x => x.id === id)).filter(Boolean); }
  // A failed ticket off the rack goes back (and with the bin, into it after MAX_RECEIVES).
  function failBack(S, k) {
    if (S.bin && k.receives >= MAX_RECEIVES) { go(k, 'tobin', T.tobin); return; }
    go(k, 'back', T.back);
  }
  function finishWork(S, k) {
    if (staleRead(S, k)) return;
    const viaRack = k.from === 'rack', rs = riders(S, k);
    // The Hot Shelf: done, now file it (and any batch riders, each its own write; a throttled rider goes back).
    if (S.vault && k.desk === 'mira' && !k.poison && !k.cutOff) {
      for (const r of rs) {
        r.seat = k.seat; r.host = null;
        const c = cabOf(S, r), cab = S.cabs[c]; cab.heat += 1;
        if (cab.tok >= 1) { cab.tok -= 1; cab.filed++; r.cabAt = c; go(r, 'done', T.done); }
        else { S.throttles++; S.hotThrottles++; cab.throttled++; ev(S, 'hotThrottle', { id: r.id, cab: c, n: 1, hot: r.hot }); failBack(S, r); }
      }
      k.riders = null;
      tryFile(S, k); return;
    }
    free(S, k);
    if (k.cutOff) { S.timedOut++; ev(S, 'timedOut', { id: k.id }); }
    // A batch succeeds or fails together: one bad ticket sends the whole batch back.
    if (rs.length) {
      const all = [k].concat(rs), bad = all.some(x => x.poison || k.cutOff);
      for (const r of rs) { r.seat = k.seat; r.host = null; }
      k.riders = null;
      // Partial batch response: only the tickets that failed go back; the rest are done.
      if (bad && S.partial && !k.cutOff) {
        S.partials++; ev(S, 'partial', { id: k.id, n: all.filter(x => x.poison).length });
        for (const x of all) { if (x.poison) { ev(S, 'poisonFail', { id: x.id, receives: x.receives }); failBack(S, x); } else if (x !== k) go(x, 'done', T.done); }
        if (k.poison) return;
        go(k, 'done', T.done); return;
      }
      if (bad) {
        S.batchFails++; ev(S, 'batchFail', { id: k.id, n: all.length });
        for (const x of all) { if (x.poison) ev(S, 'poisonFail', { id: x.id, receives: x.receives }); failBack(S, x); }
        return;
      }
      for (const r of rs) go(r, 'done', T.done);
    }
    if (k.cutOff && !k.poison) { failBack(S, k); return; }
    // A Reports copy that fails: Lambda retries it (up to the retry dial), then discards it.
    if (k.desk === 'reports' && k.fail) {
      const once = k.fail === 'jam' && k.tries;
      if (!once) {
        k.tries = (k.tries || 0) + 1; if (k.fail === 'jam') S.jams++;
        ev(S, 'reportFail', { id: k.id, n: k.tries, bad: k.fail === 'bad' });
        if (k.tries <= S.retryN && !k.replay) { go(k, 'rwait', T.retryWait); return; }
        discard(S, k, 'retries'); return;
      }
    }
    // Reports opened a copy it didn't want: thrown away, a whole invocation for nothing.
    if (k.desk === 'reports' && S.picky && !k.want) { go(k, 'drop', T.drop); S.tossed++; ev(S, 'tossed', { id: k.id }); return; }
    if (k.desk === 'reports') { go(k, 'done', T.done); return; }
    // Claim 9: a waybill can also fail on the version it went to.
    if (!k.poison && !(S.yard && SD.rushYard.fails(S, k))) {
      go(k, 'done', T.done);
      // At-least-once delivery: now and then the rack hands the same ticket over again.
      if (viaRack && !k.twin && !S.orders.has('fifo') && S.rand() < TWIN_P) {
        const tw = { id: S.nextId++, key: k.key, wave: k.wave, poison: false, twin: true, throttles: 0, receives: 0, stool: null, from: 'rack', phase: '', t: 0, dur: 0 };
        S.tickets.push(tw); enqueue(S, tw); S.twins++;
        ev(S, 'twin', { id: tw.id, of: k.id });
      }
      return;
    }
    // Poison fails every time.
    if (k.poison) ev(S, 'poisonFail', { id: k.id, receives: k.receives });
    if (!viaRack) { go(k, 'splat', T.splat); return; }
    failBack(S, k);
  }
  // What the placed buys bill each wave, plus the ledger's storage (a coin per T.perBill keys) without TTL.
  function upkeep(S) {
    let n = 0; for (const t of S.placed) n += TOOLS[t].upkeep || 0;
    if (S.ledger && !S.ttl && S.belt.includes('ttl')) n += Math.floor(S.keys.size / T.perBill);
    return n;
  }
  // A Reports copy Lambda gives up on: into the failure crate with a destination, or lost if it was a refund.
  function discard(S, k, why) {
    S.tray = S.tray.filter(x => x !== k.id); free(S, k);
    if (S.dest && !k.replay && k.want) { go(k, 'crate', 0); S.crate.push(k.id); S.crated++; ev(S, 'crated', { id: k.id, why }); return; }
    remove(S, k); S.failedOut++; ev(S, 'discarded', { id: k.id, why, want: k.want });
    if (k.want) lose1(S, k, why === 'aged' ? 'aged' : 'failed');
  }
  // Using a placed tool. The retry dial turns: 1, 0, 2, 1... The failure crate replays its oldest refund for a coin
  // (somebody has to redrive it): back to the front of Reports' tray, once, with a fresh maximum age.
  function turn(S, tool) {
    if (!S[tool] || S.over) return 'no';
    if (tool === 'retries') { S.retryN = (S.retryN + 2) % 3; ev(S, 'dial', { n: S.retryN }); return ''; }
    if (tool === 'dest') {
      if (!S.crate.length) return 'empty';
      if (purse(S).coins < 1) return 'coins';
      const id = S.crate.shift(), k = S.tickets.find(x => x.id === id); if (!k) return 'empty';
      purse(S).coins--; k.replay = true; k.trayAt = S.time; S.replayed++; go(k, 'tray', 0); S.tray.unshift(id); ev(S, 'replay', { id }); return '';
    }
    return 'no';
  }
  // A lost request goes in the tank. Both rooms share one: the second room's spill fills the first room's tank.
  function lose1(S, k, why) {
    const M = purse(S);
    S.spill++; S.lost++; if (M !== S) M.spill++;
    ev(S, 'spill', { id: k.id, why });
    if (M.spill >= M.cap && !M.over) { M.over = 'lose'; ev(M, 'lose'); if (M !== S) S.over = 'lose'; }
  }
  function step(S, dt) {
    // Claim 7 (the Locked Desk): the office's main room has its own step (js/rush-office.js).
    if (S.office && SD.rushOffice) return SD.rushOffice.step(S, dt);
    if (!S.started || S.over) return;
    if (S.audit) { root.SD.rushAudit.step(S, dt); return; } // claim 8: the Watch Room's own step
    // The second room runs first, on the same clock. If it floods the shared tank, the night is over.
    if (S.review) { step(S.review, dt); if (S.over) return; }
    S.time += dt;
    const tt = S.time;
    // Waves and the bonus coin after wave 2.
    while (S.spawns.length && S.spawns[0].t <= tt) {
      const sp = S.spawns.shift();
      if (sp.wave !== S.wave) { S.wave = sp.wave; ev(S, 'wave', { wave: sp.wave }); if (sp.wave === 3 && !S.bonusGiven && !S.parent) { S.bonusGiven = true; S.coins++; ev(S, 'coin'); }
        // Cold stools' upside: idle stools cost nothing, and the savings come back as a coin each wave.
        if (sp.wave >= 2 && S.orders.has('cold') && !S.parent) { S.coins++; S.saved++; ev(S, 'saved'); }
        // Upkeep: what the placed buys bill this wave (and the ledger's storage without TTL). Below zero is debt.
        if (sp.wave >= 2 && !S.parent) { const n = upkeep(S); if (n) { S.coins -= n; S.upkeepPaid += n; S.bills++; ev(S, 'upkeep', { n }); } } }
      spawn(S, sp);
    }
    if (!S.spawns.length) S.allSpawned = true;
    // Claim 9: the yard's deployment clock, crates, hotfix and upkeep.
    if (S.yard) { SD.rushYard.tick(S, dt); if (S.over || purse(S).over) return; }
    // The Hot Shelf: each cabinet gets its filings back a second at a time, and its heat (recent writes) cools.
    if (S.vault) { const r = cabRate(S); for (const c of S.cabs) { c.tok = Math.min(T.cabBurst, c.tok + r * dt); c.heat *= Math.exp(-dt / 1.5); } }
    // Advance every ticket.
    for (const k of S.tickets.slice()) {
      k.t += dt;
      // A stuck job with nothing to cut it off: say so once.
      if (k.stuck && k.phase === 'work' && !k.saidStuck && k.t > T.stuckSay) { k.saidStuck = true; ev(S, 'stuck', { id: k.id }); }
      if (k.phase === 'shelf' || k.phase === 'tray' || k.phase === 'ride' || k.phase === 'crate' || k.t < k.dur) continue;
      switch (k.phase) {
        case 'slide': arrive(S, k); break;
        case 'walk':
          // The ledger: write this ticket's key only if it isn't there. A repeat fails the condition and is dropped.
          // (Twins and reappeared copies carry no desk; they're Mira's too.)
          if (S.ledger && k.desk !== 'reports' && !k.poison) {
            if (S.keys.has(k.key)) {
              for (const r of riders(S, k)) { r.host = null; enqueue(S, r); }
              k.riders = null; go(k, 'drop', T.drop); S.dropped++; ev(S, 'dropped', { id: k.id }); break;
            }
            // Its key was written once and has expired since (TTL): the condition passes, and this one pays out again.
            if (S.ttl && S.paidKeys.has(k.key)) k.late = true;
            S.keys.add(k.key); S.keyAt.set(k.key, S.time);
          }
          {
            let w = workOf(k, S);
            // The hand-off: an async invoke of Reports instead of copying it out by hand.
            if (S.handoff && k.ribbon && k.desk !== 'reports') w = T.work * T.handX;
            // Batching: two tickets in one trip, done in a bit more than the time of the longer one.
            for (const r of riders(S, k)) w = Math.max(w, workOf(r, S)) * T.batchX;
            // Memory: CPU scales with it, so Mira's jobs go quicker.
            if (S.memory && k.desk !== 'reports') w *= T.memX;
            // Cold start: this stool hasn't been used for a while. Warm stools (provisioned concurrency) never are.
            const warm = S.warm && k.stool < T.warmN && k.desk !== 'reports';
            if (!warm && S.orders.has('cold') && S.time - S.lastFree[k.stool] > T.coldAfter && !busySince(S, k.stool)) { w *= T.coldX; S.colds++; ev(S, 'cold', { id: k.id, stool: k.stool }); }
            // The stopwatch cuts off any job longer than the function's timeout.
            if (S.stopwatch && w > T.fnTimeout) { k.cutOff = true; w = T.fnTimeout; }
            // Claim 9: the LIVE points pick the version, and the version sets the pace.
            if (S.yard && !k.quiz) w = SD.rushYard.route(S, k, w);
            go(k, 'work', w);
          }
          break;
        case 'drop': free(S, k); remove(S, k); break;
        case 'work': finishWork(S, k); break;
        case 'retry': tryFile(S, k); break;
        case 'done':
          if (k.desk === 'reports') S.reports++;
          else if (k.quiz) S.reviewed++;
          else {
            S.handled++;
            // Handed off: Reports' copy goes in its tray (Lambda's async event queue).
            if (k.ribbon && S.handoff) { k.ribbon = false; S.handed++; const c = { id: S.nextId++, wave: k.wave, poison: false, ribbon: false, desk: 'reports', twin: false, throttles: 0, receives: 0, stool: null, from: 'tray', phase: '', t: 0, dur: 0 }; go(c, 'tray', 0); S.tickets.push(c); S.tray.push(c.id); ev(S, 'handoff', { id: k.id, copy: c.id }); }
            if (k.ribbon) S.reports++;
            // Without the ledger, a key done before means this one paid out twice.
            if (S.twiceCosts && !S.ledger && k.key) { if (S.keys.has(k.key)) { S.paidTwice++; remove(S, k); lose1(S, k, 'twice'); break; } S.keys.add(k.key); }
            // With TTL, a key can expire before a late repeat arrives: then the ledger lets it through and it pays twice.
            else if (S.twiceCosts && S.ledger && k.late) { S.paidTwice++; remove(S, k); lose1(S, k, 'twice'); break; }
            if (k.key) S.paidKeys.add(k.key);
          }
          remove(S, k); ev(S, 'handled', { id: k.id, twin: k.twin, desk: k.desk, copied: !!k.ribbon }); break;
        case 'bounce':
          // A herd: everyone waits for the same moment instead of their own backoff.
          if (S.orders.has('herd') && !S.jitter) go(k, 'wait', T.herd - (S.time % T.herd) + 0.05);
          // Jitter: the usual backoff, times a random amount, so the retries spread out.
          else if (S.jitter) go(k, 'wait', T.herd - (S.time % T.herd) + 0.05 + S.rand() * T.jitter);
          else go(k, 'wait', T.backoff[k.throttles - 1] || 1);
          break;
        case 'wait': go(k, 'slide', T.slide); break;
        case 'splat': remove(S, k); lose1(S, k, k.poison || k.err ? 'error' : 'throttled'); break;
        case 'tobin': remove(S, k); S.binned++; ev(S, 'binned', { id: k.id }); if (S.yard) lose1(S, k, 'returned'); break;
        case 'back': go(k, 'hidden', T.hidden); break;
        case 'hidden': enqueue(S, k); break;
        case 'rwait': go(k, 'tray', 0); S.tray.unshift(k.id); break;
      }
      if (S.over) return;
    }
    // TTL: keys older than T.ttl are deleted from the ledger.
    if (S.ttl && S.ledger) for (const [key, at] of S.keyAt) if (S.time - at > T.ttl) { S.keyAt.delete(key); S.keys.delete(key); S.ttlGone++; }
    // Shelf life: a ticket on the rack too long expires.
    if (S.orders.has('shelf') && S.queue.length) {
      for (const id of S.queue.slice()) {
        const k = S.tickets.find(x => x.id === id);
        if (k && S.time - k.queuedAt > T.retain) { S.queue = S.queue.filter(x => x !== id); remove(S, k); S.expired++; ev(S, 'expired', { id }); lose1(S, k, 'expired'); if (S.over) return; }
      }
    }
    // A herd lands: count how many retries came back down together this frame.
    if (S.orders.has('herd') && !S.jitter) { const n = S.tickets.filter(k => k.phase === 'slide' && k.t === 0 && k.throttles).length; if (n >= 3) {
      S.herds++; ev(S, 'herd', { n });
      // A retry storm draws a crowd: every four retries landing together bring a new caller with them.
      for (let i = 0; i < Math.floor(n / 4); i++) { spawn(S, { wave: S.wave, poison: false, ribbon: false, key: 'storm' + S.nextId }); S.storm++; }
    } }
    // With jitter the retries spread out, but ones that still land close together (within T.jitterWin) still herd.
    if (S.orders.has('herd') && S.jitter) {
      const now = S.tickets.filter(k => k.phase === 'slide' && k.t === 0 && k.throttles).length;
      if (now) { for (let i = 0; i < now; i++) S.landed.push(S.time); S.landed = S.landed.filter(t => S.time - t <= T.jitterWin);
        const n = S.landed.length; if (n >= 3) { S.herds++; ev(S, 'herd', { n }); S.landed = [];
          for (let i = 0; i < Math.floor(n / 4); i++) { spawn(S, { wave: S.wave, poison: false, ribbon: false, key: 'storm' + S.nextId }); S.storm++; } } }
    }
    // Lambda polls the rack: each free stool of Mira's takes the oldest ticket.
    if (S.rack) {
      let i;
      // FIFO: a caller with a ticket out (or failed and waiting to come back) has to wait for it.
      const fifo = S.orders.has('fifo'), out = ['walk', 'work', 'ride', 'back', 'hidden', 'retry'];
      const nextQ = () => {
        if (!fifo) return 0;
        const busy = new Set(S.tickets.filter(x => x.from === 'rack' && x.group != null && out.includes(x.phase)).map(x => x.group));
        return S.queue.findIndex(id => { const x = S.tickets.find(t => t.id === id); return !x || !busy.has(x.group); });
      };
      while (S.queue.length && (i = freeStool(S)) >= 0) {
        const qi = nextQ(); if (qi < 0) break;
        const id = S.queue.splice(qi, 1)[0], k = S.tickets.find(x => x.id === id);
        if (!k) continue;
        k.receives++; k.stool = k.seat = i; k.from = 'rack'; k.takenAt = S.time; k.wthrottles = 0; go(k, 'walk', T.walk);
        // Batching: the stool takes a second ticket off the rack in the same trip.
        const ri = S.orders.has('batch') && S.queue.length ? nextQ() : -1;
        if (ri >= 0) {
          const r = S.tickets.find(x => x.id === S.queue[ri]);
          if (r) { S.queue.splice(ri, 1); r.receives++; r.seat = i; r.from = 'rack'; r.takenAt = S.time; r.host = k.id; go(r, 'ride', 0); k.riders = [r.id]; S.batches++; }
        }
      }
    }
    // Visibility timeout: a ticket taken off the rack is hidden for vis seconds. Still being worked after that, it
    // shows up on the rack again for someone else (same key, so doing both pays out twice).
    if (S.visibility) {
      const vis = S.hourglass ? T.visHourglass : T.vis;
      for (const k of S.tickets.slice()) {
        if (k.takenAt == null || k.reappearedAt === k.takenAt || !['walk', 'work', 'ride'].includes(k.phase) || S.time - k.takenAt <= vis) continue;
        k.reappearedAt = k.takenAt;
        const c = { id: S.nextId++, key: k.key, wave: k.wave, poison: k.poison, stuck: k.stuck, heavy: k.heavy, group: k.group, twin: true, throttles: 0, receives: k.receives, stool: null, from: 'rack', phase: '', t: 0, dur: 0 };
        S.tickets.push(c); enqueue(S, c); S.reappeared++;
        ev(S, 'reappear', { id: c.id, of: k.id });
      }
    }
    // Maximum event age: a copy that has waited in the tray too long is discarded. A refund lost that way counts.
    if (S.picky) {
      for (const id of S.tray.slice()) {
        const k = S.tickets.find(x => x.id === id);
        if (k && S.time - k.trayAt > T.maxAge) {
          S.tray = S.tray.filter(x => x !== id);
          // An on-failure destination keeps it for later.
          if (k.want && S.dest && !k.replay) { ev(S, 'aged', { id, want: k.want, caught: true }); discard(S, k, 'aged'); continue; }
          remove(S, k); ev(S, 'aged', { id, want: k.want });
          if (k.want) { S.aged++; lose1(S, k, 'aged'); if (S.over) return; }
        }
      }
    }
    // Review questions: the intern answers what it can, unanswered ones run out, unchecked wrong answers leak.
    if (S.asked || S.tickets.some(k => k.quiz)) reviewStep(S);
    if (purse(S).over) return;
    // Reports takes copies from its tray at its own stools.
    let j;
    while (S.tray.length && (j = freeStool(S, 'clerk')) >= 0) {
      const id = S.tray.shift(), k = S.tickets.find(x => x.id === id);
      if (!k) continue;
      k.stool = k.seat = j; go(k, 'walk', T.walk);
    }
    // Shutters down: whatever is still in the room at closing time is lost.
    if (S.close && S.time >= S.close) {
      const left = S.tickets.slice();
      ev(S, 'close', { n: left.length });
      for (const k of left) { remove(S, k); lose1(S, k, 'closed'); if (S.over) return; }
      S.over = 'win'; ev(S, 'win'); return;
    }
    // The end: every ticket resolved. Poison going round and round with no bin never resolves; after a while the
    // night calls it, and each one counts as two lost requests (it held up a stool every lap).
    if (S.allSpawned) {
      const left = S.tickets;
      // With a second room, the night ends when both are done.
      if (!left.length) { if (!S.review || S.review.over) { S.over = 'win'; ev(S, 'win'); } return; }
      // (Refunds waiting in the failure crate don't count as going round; they're lost at closing if not replayed.)
      const round = left.filter(k => k.phase !== 'crate');
      if (!S.bin && round.length && round.every(k => k.poison && k.from === 'rack')) {
        S.clogT += dt;
        if (S.clogT >= T.clog) {
          ev(S, 'clog', { n: round.length });
          for (const k of round) { remove(S, k); lose1(S, k, 'clog'); lose1(S, k, 'clog'); if (S.over) return; }
          for (const k of S.tickets.slice()) { remove(S, k); lose1(S, k, 'closed'); if (S.over) return; }
          S.over = 'win'; ev(S, 'win');
        }
      } else S.clogT = 0;
    }
  }
  // ---- Review questions and the intern ----
  const isSolved = (S, q) => { const r = q != null && purse(S).book.get(q); return !!(r && r.solved); };
  function unask(S, k) { S.asks = S.asks.filter(x => x !== k.id); }
  function reviewStep(S) {
    for (const k of S.tickets.slice()) {
      if (!k.quiz) continue;
      if (k.phase === 'ask') {
        // The intern takes questions the player has solved, one moment after it's free to (it was hired, or it landed).
        // Claim 7's intern scope: on 'topics' it also takes unsolved questions from a topic you've solved, and guesses more.
        const wide = !isSolved(S, k.q) && !!SD.rushOffice && SD.rushOffice.wide(S, k.q);
        if (S.intern && (isSolved(S, k.q) || wide) && S.time - Math.max(k.askAt, S.internAt || 0) >= T.internThink) {
          const right = S.rand() >= (wide ? SD.rushOffice.T.internWrongWide : T.internWrong);
          unask(S, k); k.internRight = right; k.stampAt = S.time; go(k, 'stamped', 0); S.byIntern++;
          answer(S, k.q, right, 'intern'); ev(S, 'internAnswer', { id: k.id, right });
        } else if (S.time - k.askAt > T.askWait) { unask(S, k); S.unanswered++; ev(S, 'unanswered', { id: k.id }); remove(S, k); lose1(S, k, 'unanswered'); if (purse(S).over) return; }
      } else if (k.phase === 'stamped' && S.time - k.stampAt > T.checkWindow) {
        // Nobody checked. A right answer is filed as it is; a wrong one goes in the files and starts leaking.
        if (k.internRight) go(k, 'done', T.done);
        else { miss(S, k); if (purse(S).over) return; }
      } else if (k.phase === 'leak' && S.time - k.leakAt >= T.leak) {
        k.leakAt = S.time; S.leaked++; lose1(S, k, 'intern'); if (purse(S).over) return;
      }
    }
  }
  // A wrong answer goes into the files: it costs a lost request now, and another every few seconds until it's caught.
  function miss(S, k) { S.missed++; k.leakAt = S.time; go(k, 'leak', 0); ev(S, 'internMiss', { id: k.id }); S.leaked++; lose1(S, k, 'intern'); }
  function placeIntern(S) { S.internAt = S.time; }
  // The player answers a question waiting on the desk (right: they picked the answer).
  function reply(S, id, right) {
    const k = S.tickets.find(x => x.id === id);
    if (!k || k.phase !== 'ask' || S.over || purse(S).over) return false;
    unask(S, k); answer(S, k.q, right, 'player');
    if (right) { S.byYou++; go(k, 'done', T.done); ev(S, 'replied', { id, right: true }); }
    else { S.wrongYou++; ev(S, 'replied', { id, right: false }); remove(S, k); lose1(S, k, 'wrongAnswer'); }
    return true;
  }
  // The player checks one of the intern's answers. verdict: 'wrong' (it's wrong) or 'ok' (looks right). Catching a
  // wrong one saves the ticket (and stops a leak); waving a wrong one through sends it into the files to leak.
  function check(S, id, verdict) {
    const k = S.tickets.find(x => x.id === id);
    if (!k || (k.phase !== 'stamped' && k.phase !== 'leak') || S.over || purse(S).over) return '';
    if (k.internRight) { go(k, 'done', T.done); ev(S, 'checked', { id, was: 'right' }); return 'right'; }
    if (verdict === 'wrong') { S.caught++; go(k, 'done', T.done); ev(S, 'caught', { id, leaking: k.phase === 'leak' }); return 'caught'; }
    if (k.phase === 'stamped') miss(S, k);
    return 'missed';
  }
  function drain(S) { const e = S.events; S.events = []; return e; }
  // The answer book. by says who answered: 'player', or a helper's name. Only the player's right answers make a
  // question solved; every answer is counted under its answerer, and the last one is kept (with its time).
  function answer(S, id, right, by) {
    const M = purse(S), who = by || 'player';
    const r = M.book.get(id) || { id, solved: false, right: 0, wrong: 0, by: {}, last: null };
    if (right) r.right++; else r.wrong++;
    r.by[who] = r.by[who] || { right: 0, wrong: 0 }; r.by[who][right ? 'right' : 'wrong']++;
    if (right && who === 'player') r.solved = true;
    r.last = { right: !!right, by: who, t: M.time, claim: M.claim };
    M.book.set(id, r); ev(M, 'answer', { qid: id, right: !!right, by: who });
    return r;
  }
  // The questions the player has solved (what a helper would be allowed to answer).
  function solved(S) { return [...purse(S).book.values()].filter(r => r.solved).map(r => r.id); }
  const ORDERS = ['letters', 'cold', 'herd', 'shelf', 'batch', 'fifo', 'eventual', 'stakes', 'timeout'];
  SD.rushCore = { T, WAVES, CLAIMS, TOOLS, ORDERS, STOOLS, CAP, MAX_THROTTLES, MAX_RECEIVES, CABS, HOT_CAB, cabOf, cabRate, answer, solved, reply, check, create, step, start, place, canPlace, costOf, seats, owners, drain, upkeep, turn };
  // Internals for js/rush-yard.js (claim 9).
  SD.rushCore.lib = { ev, go, remove, lose1, enqueue, purse };
  // For js/rush-office.js (claim 7): the helpers its own step needs.
  SD.rushCore.internal = { ev, lose1, purse, go, remove, reviewStep, isSolved };
  if (typeof module !== 'undefined') module.exports = SD.rushCore;
})(typeof window !== 'undefined' ? window : globalThis);
