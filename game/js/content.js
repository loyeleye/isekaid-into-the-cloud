// Game content: concepts, cards, incidents, questions and story lines.
//
// This is a small EXAMPLE that keeps the schema the engine reads (js/run.js, js/quiz.js, js/state.js, js/ui.js) and
// boots one short dungeon. It is not chapter 1: the story, cast and chapter plan are still to be decided, and real
// chapters will replace these entries (one file per chapter, as the first game did with js/ch4.js onwards).
// AWS facts here follow the current AWS documentation (Lambda, SQS and IAM user guides). Write every explanation
// fresh; never copy practice-exam questions or course material.
window.SD = window.SD || {};

// `page` is a line from Goddess Uptima's cheat sheet, restored when a concept is understood. `zone` is the chapter
// whose reviews and rewards draw on it.
SD.concepts = {
  lambdaconc: {
    name: 'Lambda Concurrency', zone: 1,
    gist: 'Concurrency is requests per second times average duration. An account has a concurrency quota per Region (1,000 by default, and it can be raised). Past it, synchronous calls get a 429 throttling error and asynchronous events are retried. Reserved concurrency guarantees and caps one function\'s share; provisioned concurrency keeps environments initialized so requests skip cold starts.',
    page: 'Example page. Uptima\'s cheat sheet lines go here once the story is written. — U.'
  },
  sqs: {
    name: 'SQS and the Visibility Timeout', zone: 1,
    gist: 'Receiving a message hides it for the visibility timeout (30 seconds by default, up to 12 hours). Delete it before the timeout or it becomes visible again and is delivered again. Standard queues deliver at least once, so consumers should be idempotent. For a Lambda trigger, AWS recommends a visibility timeout of at least six times the function timeout.',
    page: 'Example page. — U.'
  },
  dlq: {
    name: 'Dead-Letter Queues', zone: 1,
    gist: 'A redrive policy moves a message to a dead-letter queue once its receive count passes maxReceiveCount, so one bad message stops failing forever. The dead-letter queue must be the same type as its source (FIFO with FIFO) and in the same account and Region.',
    page: 'Example page. — U.'
  },
  iam: {
    name: 'IAM Policy Evaluation', zone: 1,
    gist: 'Every request starts implicitly denied. An explicit Allow in an applicable policy permits it, and an explicit Deny in any applicable policy overrides every Allow. Give code an IAM role with only the actions and resources it needs, never long-term access keys.',
    page: 'Example page. — U.'
  }
};

// How two concepts connect, asked in break rooms (Reflect) and drawn on the cheat sheet's mind map. Reflect needs
// at least four links, since the wrong answers come from the other links.
SD.links = [
  { id: 'lambdaconc-sqs', a: 'lambdaconc', b: 'sqs', text: 'A queue in front of a function absorbs a burst that would otherwise be throttled.' },
  { id: 'sqs-dlq', a: 'sqs', b: 'dlq', text: 'Every receive without a delete counts toward the redrive policy, which finally parks the message.' },
  { id: 'lambdaconc-dlq', a: 'lambdaconc', b: 'dlq', text: 'Asynchronous events whose retries run out can be kept in a dead-letter queue instead of lost.' },
  { id: 'iam-lambdaconc', a: 'iam', b: 'lambdaconc', text: 'A function calls other services with its execution role, so its permissions belong on that role.' }
];

// Cards. kind 'action' plays once; 'infra' stays in play. mit mitigates severity; abs absorbs load ({ any: n } or a
// load type); pow is the hit when a card's tag matches the incident's weak (half when it matches neither, and a
// RESISTED when it matches resist). `concept` ties a card to the concept it teaches. Art keys are in js/art.js ICON.
SD.cards = {
  hotfix:      { name: 'Hotfix', cost: 1, kind: 'action', mit: 6, text: 'Mitigate {mit}.', art: 'wrench', rarity: 'basic' },
  bigmem:      { name: 'More Memory', cost: 1, kind: 'action', abs: { any: 6 }, pow: 3, tags: ['memory'], text: 'Absorb {any} load. Lambda adds CPU in proportion to memory, so each run finishes sooner.', art: 'box', rarity: 'basic', concept: 'lambdaconc' },
  sqsbuffer:   { name: 'SQS Buffer', cost: 2, kind: 'infra', pow: 6, tags: ['queue'], each: { any: 3 }, text: 'Infra. Each turn absorb 3 load. Bursts shrink: the queue holds them and consumers work through them.', art: 'cols', rarity: 'common', concept: 'sqs' },
  reserved:    { name: 'Reserved Concurrency', cost: 1, kind: 'action', pow: 7, tags: ['concurrency'], text: 'Set aside part of the account\'s concurrency for one function. Other functions can no longer starve it.', art: 'lock', rarity: 'common', concept: 'lambdaconc' },
  provisioned: { name: 'Provisioned Concurrency', cost: 2, kind: 'action', pow: 9, tags: ['provisioned'], text: 'Initialize environments before requests arrive, so they skip the cold start. Billed while configured.', art: 'bolt', rarity: 'uncommon', concept: 'lambdaconc' },
  vistimeout:  { name: 'Longer Visibility Timeout', cost: 1, kind: 'action', pow: 7, tags: ['visibility'], text: 'Keep a received message hidden for longer than the work takes, so nobody else picks it up mid-job.', art: 'clock', rarity: 'common', concept: 'sqs' },
  idem:        { name: 'Idempotent Writes', cost: 1, kind: 'infra', pow: 5, tags: ['idem'], each: {}, text: 'Infra. Retries and repeat deliveries count once: each message carries a key, and a repeat is a no-op.', art: 'key', rarity: 'common', concept: 'sqs' },
  dlq:         { name: 'Dead-Letter Queue', cost: 1, kind: 'action', pow: 7, tags: ['dlq'], text: 'After maxReceiveCount receives, park the message in a dead-letter queue to inspect later.', art: 'cyl', rarity: 'common', concept: 'dlq' },
  leastpriv:   { name: 'Least-Privilege Role', cost: 1, kind: 'action', pow: 7, tags: ['leastpriv'], text: 'An execution role that allows exactly the actions and resources the code needs, and nothing else.', art: 'key', rarity: 'common', concept: 'iam' },
  finddeny:    { name: 'Find the Explicit Deny', cost: 2, kind: 'action', pow: 9, tags: ['deny'], text: 'Search every policy that applies for the Deny. One Deny beats any number of Allows.', art: 'eye', rarity: 'uncommon', concept: 'iam' }
};

SD.starterDeck = ['hotfix', 'hotfix', 'hotfix', 'hotfix', 'bigmem', 'bigmem', 'bigmem', 'reserved', 'vistimeout', 'sqsbuffer'];
// Cards that can appear as rewards, unlocked as the hero's level rises.
SD.cardUnlocks = { 1: ['reserved', 'vistimeout', 'idem', 'dlq', 'leastpriv', 'sqsbuffer'], 2: ['provisioned', 'finddeny'] };
// Chapter cards join the reward pool once that chapter is reached.
SD.chapterCards = {};

// Group fights: two or three incidents at once. Odds by chapter; none in this example.
SD.groupFights = {
  odds: {}, trio: {}, elite: {},
  scale: { 2: { sev: 0.6, dmg: 0.6 }, 3: { sev: 0.42, dmg: 0.45 }, elite: { sev: 0.8, dmg: 0.8 }, minion: { sev: 0.4, dmg: 0.45 } }
};

// Incidents. weak/resist map a card tag to the reason shown on screen. `flavor` is the joke; `symptom` is the lesson.
// pattern is the incident's moves in order, by intent type (handled in js/run.js; labels in SD.intentText).
SD.enemies = {
  throttle: {
    name: 'The Throttle Imp', cause: 'Another function is using most of the account\'s concurrency', sev: 34, concept: 'lambdaconc', tier: 1, sprite: 'imp',
    flavor: 'Example incident.',
    symptom: 'Checkout returns 429 TooManyRequestsException every lunchtime. CloudWatch shows its Throttles climbing while a nightly batch function, still running, holds most of the account\'s concurrency.',
    weak: { concurrency: 'Reserved concurrency sets aside part of the account\'s pool for checkout, so the batch job cannot starve it.', queue: 'A queue in front holds the burst, and the function works through it at the concurrency it has.' },
    resist: { memory: 'More memory adds CPU and can shorten each run, but it does not raise the concurrency limit.' },
    pattern: [{ t: 'burst', n: 10 }, { t: 'read', n: 9 }, { t: 'burst', n: 14 }, { t: 'escalate' }]
  },
  coldstart: {
    name: 'The Cold Start Wraith', cause: 'Heavy initialization runs each time a new execution environment starts', sev: 30, concept: 'lambdaconc', tier: 1, sprite: 'wraith',
    flavor: 'Example incident.',
    symptom: 'The first request after a quiet spell takes 4 seconds; the next ones take 80 ms. The function loads a large library when its environment starts.',
    weak: { provisioned: 'Provisioned concurrency keeps environments initialized ahead of time, so requests skip the start-up.', memory: 'More memory brings more CPU, so initialization finishes sooner.' },
    resist: { concurrency: 'Reserved concurrency only reserves capacity; each new environment still starts cold.' },
    pattern: [{ t: 'read', n: 8 }, { t: 'read', n: 12 }, { t: 'escalate' }, { t: 'read', n: 14 }]
  },
  boomerang: {
    name: 'The Boomerang Message', cause: 'The visibility timeout is shorter than the processing time', sev: 36, concept: 'sqs', tier: 1, sprite: 'echo',
    flavor: 'Example incident.',
    symptom: 'An SQS-triggered function takes 50 seconds per batch, and the queue\'s visibility timeout is 30 seconds. Some orders are processed two or three times.',
    weak: { visibility: 'A visibility timeout longer than the work (AWS suggests six times the function timeout for a Lambda trigger) keeps the message hidden until it is deleted.', idem: 'Standard queues deliver at least once, so idempotent processing makes a repeat harmless.' },
    resist: { concurrency: 'More consumers each still take 50 seconds, so the timeout still runs out mid-job.' },
    pattern: [{ t: 'retry', n: 9 }, { t: 'read', n: 8 }, { t: 'retry', n: 12 }, { t: 'escalate' }]
  },
  poison: {
    name: 'The Poison Pill', cause: 'One failing message sends the whole batch back to the queue', sev: 38, concept: 'dlq', tier: 1, sprite: 'blob',
    flavor: 'Example incident.',
    symptom: 'One malformed order makes the function throw. The whole batch goes back to the queue, so nine good orders are processed again each time, and the bad one never leaves.',
    weak: { dlq: 'A redrive policy moves the message to a dead-letter queue once its receive count passes maxReceiveCount.', idem: 'Idempotent processing makes the re-processed good orders harmless.' },
    resist: { visibility: 'A longer visibility timeout only delays the next failure.' },
    pattern: [{ t: 'retry', n: 10 }, { t: 'write', n: 9 }, { t: 'retry', n: 14 }, { t: 'escalate' }]
  },
  // The example boss. Its incident steps are in SD.bossDesign and its Exam Twists in SD.twists.
  denywarden: {
    name: 'The Deny-All Warden', cause: 'An explicit Deny somewhere overrides the role\'s Allow', short: 'The Warden', sev: 110, concept: 'iam', tier: 9, boss: true, sprite: 'judge',
    intro: 'wardenIntro', win: 'wardenWin',
    flavor: 'Example boss.',
    symptom: 'A new orders service gets AccessDenied on every call to its DynamoDB table, though its role has an Allow for the table.',
    weak: { deny: 'An explicit Deny in any applicable policy beats every Allow, so finding it is what unblocks the call.', leastpriv: 'A role scoped to the table, with no stray statements, is easy to read and reason about.' },
    resist: { memory: 'AccessDenied is not a capacity problem.', concurrency: 'More concurrency only fails faster.' },
    pattern: [{ t: 'write', n: 10 }, { t: 'read', n: 14 }, { t: 'burst', n: 12 }, { t: 'escalate' }, { t: 'write', n: 16 }, { t: 'read', n: 18 }]
  }
};

// Dungeons, one per chapter. pools by depth: 1 for floors 0-1, 2 for floors 2-4, 3 below, plus elites.
SD.enemyPools = { 1: ['throttle', 'coldstart', 'boomerang'], 2: ['throttle', 'boomerang', 'poison'], 3: ['coldstart', 'poison', 'boomerang'], elite: ['poison', 'throttle'] };
SD.chapters = {
  1: { name: 'the Example Dungeon', rank: 'E', boss: 'denywarden', pools: SD.enemyPools, gate: 'ENTERING THE EXAMPLE DUNGEON...',
    blurb: 'A placeholder dungeon that exercises the engine. The Deny-All Warden waits at the bottom.' }
};

// What the incident does next, as shown above it. Keys are the intent types used in patterns.
SD.intentText = {
  read: i => `Read load ${i.n}`,
  write: i => `Write load ${i.n}`,
  burst: i => `Burst ${i.n}: a spike of requests`,
  retry: i => `Redelivery ${i.n}: x1.5 unless idempotent`,
  escalate: i => `Escalates: all load +${(i && i.up) || 3}`
};

// Boss incident response, run from data (js/run.js R.incident): diagnose (read the evidence in `ev` and say what's
// wrong), fix (the smallest correct change) and prevent (what stops it or catches it next time). Each is a question
// (type mc by default, or multi; a fix that really is a number can be num), and each right answer buffs the fight.
SD.bossDesign = {
  denywarden: {
    concepts: ['iam'],
    diagnose: {
      c: 'iam', type: 'mc',
      ev: 'orders-fn  09:12:44Z  ERROR\nAccessDeniedException: User: arn:aws:sts::111122223333:assumed-role/orders-fn-role/orders-fn ' +
        'is not authorized to perform: dynamodb:PutItem on resource: arn:aws:dynamodb:us-east-1:111122223333:table/Orders ' +
        'with an explicit deny in a service control policy',
      q: 'The orders function\'s role allows dynamodb:PutItem on the Orders table, yet every write fails like this. What\'s wrong?',
      opts: ['An SCP on the account denies it, whatever the role allows', 'The role has no Allow for dynamodb:PutItem on this table', 'The table\'s resource-based policy denies the function\'s role', 'The function\'s temporary credentials expired mid-run'], a: 0,
      no: [null, 'A missing Allow reads "because no identity-based policy allows". This one names an explicit deny.', 'A Deny in the table\'s own policy would say "in a resource-based policy". This one says service control policy.', 'Expired credentials fail with ExpiredTokenException, not an explicit deny.'],
      why: 'The error names the type of policy that denied it. A service control policy sets the most that an account\'s principals can do, so its Deny wins over any Allow in the role.'
    },
    fix: {
      c: 'iam', type: 'mc',
      q: 'The security team\'s SCP denies dynamodb:PutItem to every principal except a list of approved roles. What\'s the smallest correct change?',
      opts: ['Add orders-fn-role to the SCP\'s list of approved principal ARNs', 'Attach AdministratorAccess to orders-fn-role so it outranks the SCP', 'Add a second Allow for dynamodb:* on every table to the role', 'Run the writes as the account\'s root user, which SCPs skip'], a: 0,
      no: [null, 'Nothing outranks an SCP\'s Deny. AdministratorAccess is an Allow like any other.', 'More Allows change nothing while the Deny matches, and dynamodb:* on every table is far more than the function needs.', 'SCPs apply to a member account\'s root user too, and nobody should run an app as root.'],
      why: 'The Deny is the only thing in the way, so narrow it. Its condition (for example ArnNotLike on aws:PrincipalArn) lists the approved roles, and the orders role joins the list. The role keeps its tight Allow on the one table.'
    },
    prevent: {
      c: 'iam', type: 'mc',
      q: 'What catches the next policy change like this one before the customers do?',
      opts: ['A CloudWatch alarm on the orders function\'s Errors metric', 'Turn on DynamoDB point-in-time recovery for the Orders table', 'Raise the reserved concurrency of the orders function', 'A global table, so writes can fail over to another Region'], a: 0,
      no: [null, 'Point-in-time recovery restores data. Nothing was lost here; the writes were refused.', 'More concurrency only fails faster. Every invocation hits the same Deny.', 'An SCP covers the whole account in every Region, so the replica\'s writes are denied too.'],
      why: 'When a write is denied the function throws, and Lambda counts that in the function\'s Errors metric. An alarm on it pages someone within minutes of the next bad policy change.'
    },
    startCard: 'finddeny',
    go: 'Now get the orders service through the gate. At half severity, expect an exam twist.'
  }
};

// Exam Twists (js/run.js examTwist): at half severity a boss asks its incident again with one thing changed, and
// you say which part of your answer still holds. Each is a multiple choice question with a `change` line.
SD.twists = {
  denywarden: [
    { c: 'iam', change: 'The Deny is in the Orders table\'s resource-based policy instead of an SCP.',
      q: 'Which part of your answer still holds?',
      opts: ['The Deny still wins; the fix moves to the table\'s own policy', 'The role\'s Allow wins now, since both are in one account', 'Nothing changes: still add the role to the SCP\'s list', 'The call works: resource policies can only allow, not deny'], a: 0,
      no: [null, 'In one account either policy can allow, but an explicit Deny in either one still wins.', 'The SCP isn\'t what denies it now. The table\'s policy is.', 'Resource-based policies can deny, and DynamoDB tables support them.'],
      why: 'An explicit Deny wins wherever it sits. The error would now say "in a resource-based policy", and the fix is to narrow that statement in the table\'s policy (PutResourcePolicy), not the SCP.' },
    { c: 'iam', change: 'Someone tries the same write as the member account\'s root user.',
      q: 'Which part of your answer still holds?',
      opts: ['Still denied: SCPs limit a member account\'s root user too', 'Allowed: the root user isn\'t bound by any policy at all', 'Allowed: SCPs only apply to roles, never to the root user', 'Denied, but only because root has no Allow for DynamoDB'], a: 0,
      no: [null, 'In a member account, SCPs limit the root user like everyone else.', 'SCPs cover every principal in a member account, the root user included.', 'Root can do anything in its own account without an Allow. The SCP is what denies it.'],
      why: 'SCPs limit every principal in a member account, its root user included. Only the organization\'s management account sits outside them, so the fix is still to narrow the SCP.' }
  ]
};

// Questions. type mc (choose; `no` explains each wrong option), num (estimate within lo..hi), order (tap in sequence),
// multi (pick every item with ok: true). `c` is the concept the answer is recorded against.
SD.questions = [
  { id: 'q-lc1', c: 'lambdaconc', type: 'mc', q: 'A synchronous API\'s Lambda function is at its concurrency limit. What does a caller see for the extra requests?',
    opts: ['A throttling error (429 TooManyRequestsException)', 'The requests wait in a Lambda queue until capacity frees up', 'Lambda runs past the limit and bills the extra', 'The requests go to the function\'s dead-letter queue'], a: 0,
    no: [null, 'Lambda queues only asynchronous invocations. A synchronous caller gets the error and decides whether to retry.', 'The limit is a ceiling. Going past it needs a quota increase, not extra billing.', 'Dead-letter queues hold asynchronous events whose retries ran out, not throttled synchronous calls.'],
    why: 'Synchronous callers get a 429 and handle the retry themselves. Asynchronous events are queued by Lambda and retried.' },
  { id: 'q-lc2', c: 'lambdaconc', type: 'num', q: 'A function handles 200 requests a second and each takes 0.5 seconds. Roughly how many concurrent executions does it need?', unit: 'executions', lo: 90, hi: 110, ans: '100 (200 × 0.5)', why: 'Concurrency is requests per second times average duration in seconds.' },
  { id: 'q-lc3', c: 'lambdaconc', type: 'mc', q: 'Which setting removes cold starts for a latency-sensitive function?',
    opts: ['Provisioned concurrency', 'Reserved concurrency', 'A longer function timeout', 'More ephemeral storage'], a: 0,
    no: [null, 'Reserved concurrency guarantees and caps how many environments the function may use, but each new one still starts cold.', 'The timeout limits how long one run may last; start-up still happens first.', 'Ephemeral storage changes how much /tmp space the function gets, not when its environments are prepared.'],
    why: 'Provisioned concurrency initializes environments before requests arrive. You pay for it while it is configured.' },
  { id: 'q-sq1', c: 'sqs', type: 'mc', q: 'A consumer receives an SQS message and crashes before deleting it. What happens to the message?',
    opts: ['It reappears once the visibility timeout ends', 'SQS deletes it when the consumer disconnects', 'It moves straight to the dead-letter queue', 'It stays hidden until the retention period ends'], a: 0,
    no: [null, 'SQS never deletes a message for you; only a DeleteMessage call does.', 'A message reaches the dead-letter queue only after its receive count passes the redrive policy\'s maxReceiveCount.', 'Hiding lasts only for the visibility timeout. Retention (4 days by default) is how long an undeleted message can stay in the queue at all.'],
    why: 'Receiving hides a message for the visibility timeout. If it is not deleted in time, it is delivered again.' },
  { id: 'q-sq2', c: 'sqs', type: 'mc', q: 'A Lambda function with a 60-second timeout is triggered by an SQS queue. What visibility timeout does AWS recommend for the queue?',
    opts: ['At least 360 seconds, six times the function timeout', '30 seconds, the default', '60 seconds, the same as the function timeout', '12 hours, the maximum'], a: 0,
    no: [null, 'The default is shorter than the function can run, so messages reappear while they are still being processed.', 'Equal leaves no room for Lambda to retry a batch that was throttled while it was being processed.', 'The maximum would hold back a genuine retry for up to 12 hours after a failure.'],
    why: 'Six times the function timeout gives Lambda room to retry throttled batches before the messages become visible again.' },
  { id: 'q-dl1', c: 'dlq', type: 'mc', q: 'When does SQS move a message to its dead-letter queue?',
    opts: ['When its receive count passes the redrive policy\'s maxReceiveCount', 'As soon as a consumer throws an error', 'When it has been in the queue longer than the visibility timeout', 'When the consumer is in a different Region'], a: 0,
    no: [null, 'SQS never sees your errors. It counts how many times a message was received without being deleted.', 'The visibility timeout controls hiding after each receive, not when a message is given up on.', 'Where the consumer runs does not matter. The dead-letter queue itself must be in the same account and Region as the source queue.'],
    why: 'Each receive without a delete adds to the count, and the redrive policy moves the message once the count passes maxReceiveCount.' },
  { id: 'q-dl2', c: 'dlq', type: 'mc', q: 'A FIFO queue needs a dead-letter queue. Which can it use?',
    opts: ['A FIFO queue', 'A standard queue', 'An SNS topic', 'Either a standard or a FIFO queue'], a: 0,
    no: [null, 'A FIFO queue\'s dead-letter queue must also be FIFO.', 'An SQS redrive policy targets another SQS queue, not a topic.', 'The types must match: standard with standard, FIFO with FIFO.'],
    why: 'A dead-letter queue matches its source queue\'s type and lives in the same account and Region.' },
  { id: 'q-iam1', c: 'iam', type: 'mc', q: 'An identity policy allows s3:GetObject on a bucket, and the bucket policy has an explicit Deny for that same user. What happens?',
    opts: ['Denied: an explicit Deny overrides any Allow', 'Allowed: identity policies win inside one account', 'Allowed: the newer policy wins', 'It depends on which policy was attached first'], a: 0,
    no: [null, 'Both policies are evaluated, and a matching Deny in either one ends it.', 'IAM does not compare policy ages.', 'Attachment order plays no part in evaluation.'],
    why: 'An explicit Deny in any applicable policy overrides every Allow.' },
  { id: 'q-iam2', c: 'iam', type: 'mc', q: 'A new IAM user with no policies attached calls s3:ListBucket on a bucket that has no bucket policy. What happens?',
    opts: ['Denied, since no policy allows it', 'Allowed: new users can read in their own account', 'Allowed if the bucket is in the user\'s home Region', 'Denied only if some policy names the user in a Deny'], a: 0,
    no: [null, 'IAM starts from deny. Without an Allow from some policy, the request fails.', 'IAM users have no home Region, and Regions play no part in this decision.', 'No Deny is needed: with no Allow anywhere, the implicit deny already applies.'],
    why: 'Everything is implicitly denied until an applicable policy allows it.' },
  { id: 'q-iam3', c: 'iam', type: 'mc', q: 'A Lambda function needs to read one DynamoDB table. Where should its permissions come from?',
    opts: ['Its execution role, with an Allow for that table', 'Access keys stored in environment variables', 'The developer\'s own IAM user credentials', 'A resource-based policy on the function'], a: 0,
    no: [null, 'Long-term keys in configuration can leak and do not rotate themselves. The execution role supplies temporary credentials automatically.', 'Personal credentials tie the app to one person and give it far more than it needs.', 'A function\'s resource-based policy controls who may invoke it, not what it may call.'],
    why: 'Lambda assumes the execution role and gives the function temporary credentials for it, so permissions belong on that role.' }
];

// Dungeon events: a short scene with choices; `good` marks the right call, `effect` its reward or cost.
SD.events = [
  {
    id: 'ex-retry', ch: 1, title: 'An Example Event', concept: 'sqs',
    text: 'A consumer keeps crashing halfway through its work, and the same messages keep coming back.',
    choices: [
      { label: 'Make processing idempotent and raise the visibility timeout', good: true, out: 'Repeats become harmless, and messages stay hidden until the work is done.', effect: { card: 'idem', xp: 15 } },
      { label: 'Delete each message the moment it is received', good: false, out: 'Now every crash loses an order for good.', effect: { sla: -8 } },
      { label: 'Ignore it', good: false, out: 'The messages keep coming back.', effect: {} }
    ]
  }
];

// Specs: hero classes, unlocked by level. Generalist only for now.
SD.specs = { none: { name: 'Generalist', rank: 1, text: 'No bonuses, no weaknesses.' } };
// Keepsakes bought with Memory Shards, and the card shop. Empty until a town has places to buy them.
SD.metaShop = [];
SD.cardShop = [];
SD.ranks = ['E', 'D', 'C', 'B', 'A', 'S'];

// Characters for portraits and dialogue. Painted portraits are listed in js/art.js PAINTED; the rest are drawn in code.
SD.cast = {
  uptima: { name: 'Uptima', title: 'Goddess of the Cloud', hue: 45, hair: 'goddess', eye: '#3b8bff' },
  system: { name: 'SYSTEM', title: '', hue: 200, hair: 'none', eye: '#3b8bff' },
  you: { name: 'You', title: 'Hero', hue: 200, hair: 'short', eye: '#5a4bd6' }
};

// Story lines the engine plays. Placeholders until the story is written.
SD.story = {
  wardenIntro: [{ s: 'narr', t: 'Example boss. Its scene goes here once the story is written.' }],
  wardenWin: [{ s: 'narr', t: 'Example dungeon cleared.' }],
  cascade: [{ s: 'narr', t: 'You fell. Back to town for another try.' }]
};
