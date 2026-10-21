// Chapter 2, part 2 (Story Bible, "Chapter 2: The Mailroom", from Expedition II on): the data for the Dead Letter
// Office (floors 7 to 12) and the Inquisition's Tower (floors 13 to 20), played on the Borderlands engine
// (js/raid.js), and the Grey Novice, the reckoning in Thornwick's bell tower. The world that leads into them is
// js/c2x-world.js, the minigames js/c2x-games.js, the art js/c2x-art.js, the Huh??? and ELI5 lines js/c2x-help.js.
//   Expedition II, the Dead Letter Office: three floors. The Clerks (Lambda functions as clerks: timeouts, memory and
//     CPU, concurrency, what happens to a failed event, layers; boss the Night Shift), the Stream Room (Kinesis with
//     Lambda, API Gateway validation and throttling, Step Functions; boss the Seven Votes) and the Prayer Vault (echoes;
//     alarms on queues, scaling consumers, redrive; boss the Unread).
//   Expedition III, the Inquisition's Tower: four floors. The Square (coupling, retries, backoff, circuit breakers,
//     API Gateway mapping), the River Gate (Transfer Family, FIFO order by message group, choreography and
//     orchestration), the Stair (message attributes, alarms on the right metric; the Seven) and the Top of the Stair
//     (Grand Inquisitor Hale, and the dead-letter questions that beat him).
//   The Grey Novice: two floors up the bell tower's back stairs, mixing the whole chapter.
// Here: concepts and links, cards (Mira's Return to Sender among them), enemies, Field Notes, sorts, events, the bank
// questions each concept draws on, and the expeditions themselves. AWS facts follow the current AWS documentation
// (Lambda, SQS, Kinesis, API Gateway, Step Functions, EventBridge, CloudWatch, CloudTrail, Transfer Family); every
// explanation here is written fresh.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const X = SD.c2x = SD.c2x || {};

  // ---------- Concepts ----------
  const C = (name, gist, page) => ({ name, zone: 2, gist, page: page + ' — Kyu' });
  Object.assign(SD.concepts, {
    lambdacfg: C('Lambda Memory, Timeout and Concurrency',
      'A function\'s memory setting (128 MB to 10,240 MB) also sets its CPU: at 1,769 MB it has the equivalent of one full vCPU, so a CPU-bound function runs faster with more memory, often for about the same cost. The timeout (up to 900 seconds, 3 by default) ends a run that takes longer. Reserved concurrency sets aside, and caps, how many copies run at once; past it, requests are throttled. Measure before you size: the REPORT line\'s Max Memory Used, Lambda Insights, Compute Optimizer or Power Tuning.',
      'Memory buys CPU. Measure first, then pay for what the work needs.'),
    lambdaasync: C('When an Event Fails: Three Ways to Invoke',
      'Invoked synchronously, a failed call returns its error to the caller, who decides whether to retry. Invoked asynchronously, Lambda queues the event, retries a failed one twice more by default (0 to 2 retries, for up to 6 hours), then sends a record to the on-failure destination (SQS, SNS, Lambda, EventBridge or S3), or the older dead-letter queue, or drops it. From a queue or stream, the event source mapping polls and retries the batch; its own settings and the queue\'s redrive policy decide where failures end up.',
      'Ask who is holding the letter when it fails. That\'s who has to retry it.'),
    lambdapack: C('Layers and Packaging',
      'A Lambda layer is a .zip of libraries or tools that functions share; a function can use up to five, and a layer\'s files appear under /opt (for Python, inside a python/ folder). Each layer version is fixed: a function keeps the version ARN it was given until it\'s updated. The handler setting names the file and the function to run, such as app.handle. The Serverless Application Repository holds whole ready-made applications to deploy.',
      'Pack the shared tools once. Every clerk can borrow them.'),
    kinesislambda: C('Kinesis with Lambda',
      'Lambda reads each shard in order and retries a failed batch until it succeeds or the records expire, so one bad record can block its shard. BisectBatchOnFunctionError splits a failing batch to find it; MaximumRetryAttempts and MaximumRecordAgeInSeconds limit the retries; an on-failure destination keeps a record of what was skipped. IteratorAge shows how far behind the reader is; ParallelizationFactor (up to 10) reads several batches from one shard at once, still in order per partition key. A new mapping can start AT_TIMESTAMP to reprocess.',
      'A stream waits for its slowest reader. Split the bad batch and keep moving.'),
    apigw: C('API Gateway: Validation, Throttling and Mapping',
      'A REST API can check a request before calling anything: a request validator with a JSON-schema model rejects a bad body with 400. Throttling (account, stage, method and usage-plan limits, a token bucket of rate and burst) answers extra calls with 429. A mapping template in a custom integration rewrites a request or response, and $context.responseOverride.status changes the status code returned. AppSync is the managed choice when the caller wants GraphQL.',
      'Check the letter at the door, not at the desk. Then say no politely: 400 or 429.'),
    stepfn: C('Step Functions: Retry and Catch',
      'A Task state\'s Retry field lists errors to retry, with IntervalSeconds, MaxAttempts, BackoffRate, MaxDelaySeconds and JitterStrategy. Its Catch field sends errors that are still failing to another state, and ResultPath decides whether the error replaces the input or is added to it. Standard workflows run up to a year with exactly-once steps; Express workflows run up to five minutes, at least once, for high volume.',
      'Retry what passes on its own. Catch what never will, and send it somewhere useful.'),
    orchestration: C('Choreography and Orchestration',
      'In choreography each service reacts to events on a bus or topic and nobody is in charge: it\'s loosely coupled and easy to extend, but each service handles its own failures and one order is harder to follow. In orchestration a coordinator such as Step Functions calls each step in turn and owns the retries, timeouts and compensations, so the whole flow is visible in one place.',
      'A dance with no caller, or a conductor with a score. Know which you\'ve got.'),
    sqsalarm: C('Alarms on Queues, and Enough Readers',
      'SQS sends free metrics to CloudWatch every minute: ApproximateNumberOfMessagesVisible (the backlog), ApproximateAgeOfOldestMessage, NumberOfMessagesSent and more. An alarm on a dead-letter queue\'s visible messages above 0 means something failed and nobody has looked; an alarm on the oldest message\'s age catches readers falling behind. Scale readers on backlog per reader, not CPU: Lambda scales its SQS pollers on its own, and an EC2 group can track a backlog-per-instance metric.',
      'A queue nobody reads is just a quiet room. Put a bell on it.'),
    dlqredrive: C('Dead-Letter Queues and Redrive',
      'A redrive policy on the source queue names the dead-letter queue and a maxReceiveCount: a message received that many times without being deleted moves to the DLQ. A DLQ must be the same type as its source (a FIFO queue\'s DLQ is FIFO) in the same account and Region. A count of 1 sends a message there after a single failed try, with no room for a passing error. Once the bug is fixed, a DLQ redrive (StartMessageMoveTask) moves the messages back to the source queue or another queue. Set the source queue\'s visibility timeout to at least six times a Lambda reader\'s timeout.',
      'The lost-and-found isn\'t the end. Once it\'s fixed, send them home.'),
    logsinsights: C('CloudWatch Logs Insights',
      'Logs Insights queries log groups with a pipe of commands: fields picks fields, filter keeps matching events, stats aggregates (count, avg, max, pct) by fields or time bins, sort orders and limit trims. Fields in JSON log lines are discovered for you, so structured logging means no parse commands; Lambda\'s REPORT lines carry @duration, @maxMemoryUsed and @memorySize.',
      'Write your logs as if someone will ask them a question. Someone will.'),
    datatrail: C('CloudTrail: Management and Data Events',
      'A trail records management events (control-plane calls such as UpdateFunctionConfiguration or CreateQueue) by default. Data events are the high-volume calls on the data itself, such as S3 GetObject and DeleteObject, Lambda Invoke, or SQS SendMessage, ReceiveMessage and DeleteMessage: they\'re off by default, cost extra, and must be turned on per trail with event selectors. Each record says who (userIdentity), what, when and from where.',
      'Who changed the lock is in the log by default. Who opened the letter, only if you asked.'),
    coupling: C('Loose Coupling, Retries and Circuit Breakers',
      'Tightly coupled services call each other directly and fail together; a queue or a bus between them lets each work at its own pace. Retry a passing error with exponential backoff and random jitter, cap the attempts, and make the work idempotent so a repeat is harmless. A circuit breaker stops calling a service that keeps failing, fails fast while open, and tries again after a while. Stateless services keep session data outside themselves, so any copy can answer.',
      'If everyone shouts again at once, nobody is heard. Wait a random moment.'),
    transfer: C('AWS Transfer Family',
      'Transfer Family runs managed SFTP, FTPS, FTP and AS2 servers that store files straight in S3 or EFS, so partners keep their own clients and keys. A server can be public, or have a VPC endpoint with Elastic IPs and security groups for partners who allow-list addresses; users authenticate with SSH keys, a directory or a custom identity provider.',
      'The ferry takes whatever it\'s handed and lands it in the store. Mind who you let aboard.'),
    ebarchive: C('EventBridge Archive and Replay',
      'An archive on an event bus keeps the events it receives (all of them, or those matching a pattern) for a retention period, or forever. A replay sends archived events from a chosen time window back to the bus, to all its rules or only the ones you name. An archive only holds events from after it was created, and replayed events carry a replay-name field so rules can tell them apart.',
      'If the bus kept a copy, you can play the evening again and watch what it carried.'),
    msgattr: C('Message Attributes and Timestamps',
      'SQS adds system attributes to each message: SentTimestamp (when the queue accepted it, in epoch milliseconds), ApproximateFirstReceiveTimestamp, ApproximateReceiveCount, and for FIFO queues MessageGroupId, MessageDeduplicationId and SequenceNumber. Receiving again never changes SentTimestamp. A message is deleted with the ReceiptHandle from its latest receive, not its MessageId; message attributes the sender adds travel beside the body.',
      'The postmark is stamped when it\'s posted. Opening it twice doesn\'t move the date.')
  });
  SD.links.push(
    { id: 'lambdacfg-lambdaconc', a: 'lambdacfg', b: 'lambdaconc', text: 'Reserved concurrency both guarantees and caps a function\'s copies; memory and timeout decide how long each copy takes.' },
    { id: 'lambdaasync-dlq', a: 'lambdaasync', b: 'dlq', text: 'An async invoke\'s failures go to an on-failure destination or a DLQ on the function; a queue reader\'s go to the queue\'s own DLQ.' },
    { id: 'kinesislambda-kinesis', a: 'kinesislambda', b: 'kinesis', text: 'Order holds per shard, so a stuck batch holds up only its own shard, and bisecting finds the bad record in it.' },
    { id: 'stepfn-orchestration', a: 'stepfn', b: 'orchestration', text: 'Step Functions is the orchestrator: its Retry and Catch put each step\'s failure handling in one place.' },
    { id: 'sqsalarm-dlqredrive', a: 'sqsalarm', b: 'dlqredrive', text: 'An alarm on the DLQ tells a person something failed; redrive sends it back once they\'ve fixed it.' },
    { id: 'logsinsights-datatrail', a: 'logsinsights', b: 'datatrail', text: 'Logs say what your code did; a trail\'s data events say who touched the data. Bru needs both.' },
    { id: 'coupling-snsfan', a: 'coupling', b: 'snsfan', text: 'A topic with a queue per reader is loose coupling in practice: a slow reader slows only itself.' },
    { id: 'msgattr-sqsfifo', a: 'msgattr', b: 'sqsfifo', text: 'A FIFO message carries its group and sequence number; every message carries the time it was sent.' },
    { id: 'ebarchive-eventbridge', a: 'ebarchive', b: 'eventbridge', text: 'Rules decide where events go now; an archive and a replay decide whether you can see them again later.' }
  );

  // ---------- Cards ----------
  const card = (name, cost, kind, pow, tags, art, rarity, concept, text, o) => Object.assign({ name, cost, kind, pow, tags, art, rarity, concept, ch: 2, text }, o);
  Object.assign(SD.cards, {
    ondest: card('On-Failure Destination', 1, 'action', 8, ['destination'], 'cyl', 'common', 'lambdaasync', 'After the last retry, Lambda sends the failed event and its error to a queue, topic, bus or bucket you can read.'),
    layer: card('Shared Layer', 1, 'infra', 5, ['layer'], 'note', 'common', 'lambdapack', 'Infra. Each turn absorb 2 load. One layer of shared tools, under /opt for every clerk.', { each: { any: 2 } }),
    tunemem: card('Measure, Then Size', 1, 'action', 8, ['memory', 'tune'], 'pulse', 'common', 'lambdacfg', 'Read Max Memory Used and the duration, then set memory where the work stops getting faster. Memory buys CPU.'),
    timeoutup: card('Timeout Above the Work', 1, 'action', 7, ['timeout'], 'pulse', 'common', 'lambdacfg', 'Set the timeout above the slowest real run, and the client\'s own timeout below it.'),
    bisect: card('Bisect on Error', 1, 'action', 8, ['bisect'], 'eraser', 'common', 'kinesislambda', 'Split a failing batch in half, and again, until the one bad record is alone.'),
    parallel: card('Parallelization Factor', 2, 'action', 10, ['shard', 'parallel'], 'bolt2', 'uncommon', 'kinesislambda', 'Read up to ten batches from each shard at once, still in order for each partition key.'),
    reqvalid: card('Request Validator', 1, 'action', 7, ['validator'], 'gate', 'common', 'apigw', 'A JSON schema at the door: a bad body gets 400 before it reaches a clerk.'),
    throttlecap: card('Usage Plan Throttle', 2, 'infra', 6, ['ratelimit', 'throttle'], 'gate', 'uncommon', 'apigw', 'Infra. Each turn absorb 2 load. Rate and burst per caller; the rest get 429.', { each: { any: 2 } }),
    retrycatch: card('Retry and Catch', 2, 'action', 10, ['catch', 'orch'], 'note', 'uncommon', 'stepfn', 'Retry the error that passes, with backoff and jitter. Catch the rest and route them on.'),
    dlqalarm: card('Alarm on the DLQ', 1, 'action', 7, ['alarm'], 'eye', 'common', 'sqsalarm', 'Visible messages in the dead-letter queue above 0: page a person. Reveals the enemy\'s weaknesses.', { reveal: true }),
    redrive: card('Start a Redrive', 1, 'action', 9, ['redrive'], 'cyl', 'uncommon', 'dlqredrive', 'The bug is fixed: move every message in the dead-letter queue back to its source.'),
    breaker: card('Circuit Breaker', 1, 'action', 8, ['breaker'], 'lock', 'common', 'coupling', 'After enough failures, stop calling. Fail fast while it\'s open; try one call when it half-opens.'),
    decouple: card('Put a Queue Between', 1, 'action', 8, ['decouple', 'queue'], 'cyl', 'common', 'coupling', 'The caller drops the work in a queue and walks on. Each side runs at its own pace.'),
    statelessc: card('Keep State Outside', 1, 'action', 7, ['stateless'], 'key', 'common', 'coupling', 'Sessions in a shared store, not in the server. Any copy can answer anyone.'),
    msggroup: card('Message Group ID', 1, 'action', 8, ['fifo', 'group'], 'note', 'common', 'sqsfifo', 'Order holds within one message group. Pick the group that keeps a story together.'),
    sftp: card('Transfer Family Server', 1, 'action', 7, ['transfer'], 'gate', 'common', 'transfer', 'A managed SFTP server that lands files straight in S3. Partners keep their own clients.'),
    replay: card('Archive and Replay', 2, 'action', 10, ['replay'], 'eye', 'uncommon', 'ebarchive', 'Play the bus\'s archived evening again, to only the rule you name.'),
    senttime: card('Read the SentTimestamp', 1, 'action', 8, ['timestamp'], 'eye', 'common', 'msgattr', 'When the queue first took the message. Receiving it again never moves it.'),
    rightmetric: card('Alarm on the Right Metric', 1, 'action', 8, ['alarm', 'metric'], 'eye', 'common', 'sqsalarm', 'Watch the oldest message\'s age and the DLQ\'s depth, not the CPU of something idle.'),
    mapcard: card('Mapping Template', 1, 'action', 7, ['mapping'], 'note', 'common', 'apigw', 'Rewrite the request on the way in and the response on the way out, status code included.'),
    // Mira's chapter upgrade: the Letters pile becomes the dead-letter queue, and it all goes back to Hale at once.
    rts: card('Return to Sender', 2, 'action', 15, ['redrive', 'dlq'], 'cyl', 'rare', 'dlqredrive', 'Mira\'s Letters are a dead-letter queue now. Redrive the whole pile back at its sender. Hits every enemy.', { all: true, quest: true, champ: 'mira' })
  });
  X.cardsII = ['ondest', 'layer', 'tunemem', 'timeoutup', 'bisect', 'parallel', 'reqvalid', 'throttlecap', 'retrycatch', 'dlqalarm', 'redrive'];
  X.cardsIII = ['breaker', 'decouple', 'statelessc', 'msggroup', 'sftp', 'replay', 'senttime', 'rightmetric', 'mapcard', 'redrive', 'dlqalarm'];
  SD.chapterCards = SD.chapterCards || {};
  SD.chapterCards[2] = (SD.chapterCards[2] || []).concat(['ondest', 'tunemem', 'timeoutup', 'bisect', 'reqvalid', 'breaker', 'decouple', 'msggroup', 'dlqalarm', 'senttime'].filter(id => !(SD.chapterCards[2] || []).includes(id)));

  // ---------- Enemies ----------
  const F = o => Object.assign({ ch: 2, raid: true, resist: {} }, o);
  Object.assign(SD.enemies, {
    // Floor 1, the Clerks
    dlcold: F({ name: 'Cold Start', short: 'Cold Start', cause: 'A new execution environment loads everything before the first request', sev: 28, concept: 'lambdacfg', tier: 1, sprite: 'x-cold',
      flavor: 'Always slow on the first hit. Always fine on the second.',
      symptom: 'The first letter after a quiet hour takes 4 seconds; the next ones take 80 ms. The clerk loads the whole SDK at start-up.',
      weak: { provisioned: 'Provisioned concurrency keeps environments warm before the letters arrive.', memory: 'More memory brings more CPU, so start-up finishes sooner.', layer: 'Load only what the clerk uses; shared tools in a layer, not the whole kit.' },
      resist: { concurrency: 'Reserved concurrency reserves copies; each new copy still starts cold.' },
      pattern: [{ t: 'read', n: 6 }, { t: 'read', n: 9 }, { t: 'burst', n: 7 }] }),
    dlreaper: F({ name: 'The Timeout Reaper', short: 'Reaper', cause: 'The function\'s timeout is shorter than the work', sev: 30, concept: 'lambdacfg', tier: 1, sprite: 'x-reaper',
      flavor: 'He doesn\'t care how close you were.',
      symptom: 'Logs show "Task timed out after 3.00 seconds" on every slow afternoon. The partner call it waits on takes 4 to 6 seconds.',
      weak: { timeout: 'Raise the timeout above the slowest real run, and give the HTTP client a shorter timeout of its own.', tune: 'Measure the slowest runs before you choose the number.' },
      resist: { concurrency: 'More copies all time out the same way.', memory: 'It\'s waiting on the partner, not the CPU.' },
      pattern: [{ t: 'write', n: 7 }, { t: 'burst', n: 8 }, { t: 'write', n: 7 }] }),
    dlstarved: F({ name: 'The Starved Clerk', short: 'Starved Clerk', cause: 'A CPU-bound function at 128 MB gets a sliver of a CPU', sev: 30, concept: 'lambdacfg', tier: 1, sprite: 'x-starved',
      flavor: 'He uses 90 MB of his 128. He\'s still starving.',
      symptom: 'Sorting a sack of letters takes 24 seconds at 128 MB. Max Memory Used is 90 MB, so everyone says memory isn\'t the problem.',
      weak: { memory: 'Memory sets CPU: at 1,769 MB the clerk gets a whole vCPU, and the sort takes 2 seconds for about the same cost.', tune: 'Measure at several memory sizes and pick where it stops getting faster.' },
      resist: { timeout: 'A longer timeout lets him starve for longer.' },
      pattern: [{ t: 'read', n: 7 }, { t: 'write', n: 7 }, { t: 'escalate' }] }),
    dlcap: F({ name: 'The Cap', short: 'The Cap', cause: 'Reserved concurrency throttles everything past its limit', sev: 30, concept: 'lambdaconc', tier: 1, sprite: 'x-cap',
      flavor: 'Ten clerks. Never eleven. Eleven gets a 429.',
      symptom: 'At the evening rush, invokes fail with TooManyRequestsException: ReservedFunctionConcurrentInvocationLimitExceeded.',
      weak: { concurrency: 'Raise the reserved concurrency to what the rush needs (within the account\'s pool).', queue: 'A queue in front holds the rush, and the clerks work through it at the pace they have.' },
      resist: { memory: 'Faster clerks help a little, but the cap is still ten.' },
      pattern: [{ t: 'burst', n: 8 }, { t: 'read', n: 7 }, { t: 'burst', n: 9 }] }),
    dlretrier: F({ name: 'The Async Retrier', short: 'Retrier', cause: 'An async event fails three times and is dropped, with no destination', sev: 46, concept: 'lambdaasync', tier: 2, elite: true, sprite: 'x-retrier',
      flavor: 'Once, twice, three times, and then it\'s as if the letter never was.',
      symptom: 'A prayer arrives as an asynchronous invoke. The clerk fails; Lambda retries twice; then the event is gone. Nobody knows it existed.',
      weak: { destination: 'An on-failure destination keeps the event and its error after the last retry.', dlq: 'A dead-letter queue on the function also keeps it (without the error details).', idem: 'Idempotent work makes the two retries harmless.' },
      resist: { timeout: 'It isn\'t timing out. It\'s failing, and nobody is keeping the failures.' },
      pattern: [{ t: 'retry', n: 9 }, { t: 'retry', n: 10 }, { t: 'escalate' }, { t: 'burst', n: 11 }] }),
    nightshift: F({ name: 'The Night Shift', short: 'Night Shift', cause: 'A function with a 3-second timeout and 128 MB, fighting work that needs more', sev: 80, concept: 'lambdacfg', tier: 3, boss: true, sprite: 'x-nightshift',
      flavor: 'Three seconds, 128 megabytes, and ten thousand years of post.',
      symptom: 'Every letter the Night Shift sorts takes 20 seconds of CPU at 128 MB, and its timeout is 3. It times out, retries, and times out. The office never closes.',
      weak: { memory: 'Give it memory, and with it CPU. Measure where the sort stops getting faster.', tune: 'Lambda Insights shows CPU pinned and memory fine: it\'s starving for CPU.', timeout: 'A timeout above the real work, with a margin.', concurrency: 'Enough reserved copies for the night\'s sacks.' },
      resist: { allow: 'Permissions aren\'t its problem tonight.' },
      pattern: [{ t: 'write', n: 10 }, { t: 'read', n: 11 }, { t: 'burst', n: 12 }, { t: 'escalate', up: 3 }, { t: 'retry', n: 12 }] }),
    // Floor 2, the Stream Room
    dlage: F({ name: 'Iterator Age', short: 'Iterator Age', cause: 'The reader falls further behind the stream every turn', sev: 30, concept: 'kinesislambda', tier: 1, sprite: 'x-age',
      flavor: 'It\'s reading this morning\'s prayers. It\'s nearly midnight.',
      symptom: 'IteratorAge climbs all night. Each batch is slow, the shards have room to spare, and each sender\'s prayers must stay in order.',
      weak: { parallel: 'ParallelizationFactor reads several batches from each shard at once, still in order per key.', shard: 'More shards spread the reading, if the keys are spread too.', scale: 'More reading, in parallel, closes the gap.' },
      resist: { timeout: 'A longer timeout makes each batch no faster.' },
      pattern: [{ t: 'read', n: 7 }, { t: 'escalate' }, { t: 'read', n: 9 }] }),
    dlpoison: F({ name: 'The Poison Record', short: 'Poison Record', cause: 'One bad record blocks its whole shard while Lambda retries', sev: 32, concept: 'kinesislambda', tier: 1, sprite: 'x-poison',
      flavor: 'Nothing behind it moves until it does. It never does.',
      symptom: 'A malformed prayer makes the function throw. With default settings Lambda retries the batch until the record expires, and the shard stands still for hours.',
      weak: { bisect: 'Bisect the batch on error until the bad record is alone.', destination: 'Cap the retries and send the skipped batch to an on-failure destination.' },
      resist: { scale: 'More readers wait behind the same stuck record.' },
      pattern: [{ t: 'retry', n: 8 }, { t: 'write', n: 7 }, { t: 'retry', n: 9 }] }),
    dlgate: F({ name: 'The Gatekeeper', short: 'Gatekeeper', cause: 'Bad bodies reach the clerks, and nobody is throttled', sev: 30, concept: 'apigw', tier: 1, sprite: 'x-gatekeeper',
      flavor: '400 for the wrong form, 429 for the impatient. Today he says neither.',
      symptom: 'Half the prayers posted to the API have no sender field, and each one still invokes a clerk. One caller sends a thousand a second.',
      weak: { validator: 'A request validator with a model rejects a bad body with 400 before any clerk runs.', ratelimit: 'A usage plan throttles each caller; the rest get 429.', throttle: 'Rate and burst limits per stage and method.' },
      resist: { memory: 'Bigger clerks still process the junk.' },
      pattern: [{ t: 'burst', n: 8 }, { t: 'read', n: 7 }, { t: 'burst', n: 9 }] }),
    dlinquiry: F({ name: 'The Inquiry', short: 'Inquiry', cause: 'A synchronous chain where one slow clerk stalls all the others', sev: 48, concept: 'orchestration', tier: 2, elite: true, sprite: 'x-inquiry',
      flavor: 'Each clerk waits for the next to answer. The last one is at lunch.',
      symptom: 'Five functions call each other directly and wait. When the fourth is slow, the first three hold their connections, and a failure in the fifth loses the whole case.',
      weak: { orch: 'Orchestrate the steps with Step Functions: each one retried and caught in one place.', decouple: 'Put a queue between the clerks so nobody waits on the slowest.', queue: 'A queue lets each clerk work at its own pace.', catch: 'Catch the failure and route it, instead of losing the case.' },
      resist: { timeout: 'Longer timeouts make everyone wait longer.' },
      pattern: [{ t: 'read', n: 9 }, { t: 'write', n: 10 }, { t: 'escalate' }, { t: 'burst', n: 11 }] }),
    sevenvotes: F({ name: 'The Seven Votes', short: 'Seven Votes', cause: 'An orchestrated trial of seven steps that fails at any of them', sev: 84, concept: 'stepfn', tier: 3, boss: true, sprite: 'x-votes',
      flavor: 'Seven inquisitors, seven steps, one verdict decided before the first.',
      symptom: 'A state machine of seven Task states. A passing error in step 3 fails the whole trial; a real one in step 6 vanishes with its input.',
      weak: { catch: 'Catch the error that never passes and route it, with ResultPath keeping the input.', orch: 'Retry with backoff, MaxAttempts and jitter on the step that only needs time.', backoff: 'Wait longer each time, and at random, so the retries don\'t pile up.', jitter: 'Jitter spreads the retries out.' },
      resist: { timeout: 'The steps aren\'t too slow. They fail, and nobody catches them.' },
      pattern: [{ t: 'retry', n: 11 }, { t: 'write', n: 12 }, { t: 'burst', n: 12 }, { t: 'escalate', up: 3 }, { t: 'read', n: 13 }] }),
    // Floor 3, the Prayer Vault
    dlunanswered: F({ name: 'Unanswered', short: 'Unanswered', cause: 'Every prayer still in the queue makes it bigger', sev: 50, concept: 'sqsalarm', tier: 2, elite: true, sprite: 'x-unanswered',
      flavor: 'It grows by one for every prayer nobody read.',
      symptom: 'ApproximateNumberOfMessagesVisible on the prayer queue has gone up every day for ten thousand years. No alarm has ever fired.',
      weak: { alarm: 'An alarm on the backlog, and on the oldest message\'s age, tells a person it\'s growing.', scale: 'More readers than the queue fills.', redrive: 'Send what\'s been set aside back to be read.' },
      resist: { memory: 'Faster readers won\'t help if there are none.' },
      pattern: [{ t: 'read', n: 9 }, { t: 'escalate' }, { t: 'burst', n: 11 }, { t: 'read', n: 11 }] }),
    unread: F({ name: 'The Unread', short: 'The Unread', cause: 'Ten thousand years of prayers in one queue, with nobody reading', sev: 90, concept: 'dlqredrive', tier: 3, boss: true, sprite: 'x-unread',
      flavor: 'Every prayer anyone in Thornwick ever said, in one shape. Some of them are yours.',
      symptom: 'The prayer queue\'s dead-letter queue holds every prayer that failed, and nothing watches it. It grows each turn by the number of messages visible.',
      weak: { redrive: 'Redrive the dead-letter queue back to readers, now that someone will read it.', scale: 'Add readers faster than it fills.', alarm: 'An alarm on the DLQ\'s depth means a person knows.', dlq: 'Set the failing ones aside after a few tries instead of forever.' },
      resist: { allow: 'Nobody is denied. Nobody is reading.', timeout: 'Time isn\'t short. Readers are.' },
      pattern: [{ t: 'read', n: 11 }, { t: 'burst', n: 12 }, { t: 'escalate', up: 3 }, { t: 'retry', n: 12 }, { t: 'read', n: 14 }] }),
    // Expedition III, floor 1, the Square
    qcoupled: F({ name: 'Tight Coupling', short: 'Coupling', cause: 'Two services that call each other directly and fail together', sev: 32, concept: 'coupling', tier: 1, sprite: 'x-coupled',
      flavor: 'Two inquisitors, one chain. Hit one and both fall over.',
      symptom: 'The order service calls the stocks service and waits. When the stocks are slow, the orders stop; when the stocks fall over, so do the orders.',
      weak: { decouple: 'A queue between them: orders drop the work and walk on.', queue: 'A queue lets each side run at its own pace.' },
      resist: { timeout: 'A longer wait is still a wait.' },
      pattern: [{ t: 'write', n: 7 }, { t: 'read', n: 8 }, { t: 'burst', n: 8 }] }),
    qstorm: F({ name: 'The Retry Storm', short: 'Retry Storm', cause: 'Seven inquisitors retry at once, straight away, forever', sev: 32, concept: 'coupling', tier: 1, sprite: 'x-storm',
      flavor: 'If at first you don\'t succeed, shout again, immediately, with everyone.',
      symptom: 'A partner returns 503 for a few seconds. Every caller retries in a tight loop, and the partner rate-limits the whole account.',
      weak: { jitter: 'Exponential backoff with random jitter spreads the retries out.', breaker: 'A circuit breaker stops calling while the partner is down.', idem: 'Idempotency keys make each repeat harmless.' },
      resist: { scale: 'More callers make a bigger storm.' },
      pattern: [{ t: 'retry', n: 8 }, { t: 'retry', n: 9 }, { t: 'escalate' }] }),
    qsticky: F({ name: 'The Sticky Sentry', short: 'Sticky Sentry', cause: 'Each sentry keeps its own sessions, so nobody else can answer', sev: 30, concept: 'coupling', tier: 1, sprite: 'x-sticky',
      flavor: 'He remembers you. He\'s the only one who does.',
      symptom: 'Sessions live in each server\'s memory. When a sentry falls, everyone he was serving is signed out.',
      weak: { stateless: 'Keep sessions in a shared store; any sentry can answer anyone.' },
      resist: { scale: 'More sticky sentries, more people stuck to one.' },
      pattern: [{ t: 'read', n: 8 }, { t: 'write', n: 7 }, { t: 'read', n: 8 }] }),
    qgate: F({ name: 'The Inquisitor\'s Gate', short: 'The Gate', cause: 'A mapping template rewrites what you send, and errors come back as 200', sev: 48, concept: 'apigw', tier: 2, elite: true, sprite: 'x-qgate',
      flavor: 'You said "innocent". The gate heard "guilty". The status says 200 OK.',
      symptom: 'The Inquisition\'s API maps every request through a template that drops the defence\'s fields, and turns every error from the court into HTTP 200.',
      weak: { mapping: 'Fix the mapping template, and set $context.responseOverride.status when the body is an error.', validator: 'Validate the request against a model before anything rewrites it.' },
      resist: { ratelimit: 'Throttling the gate doesn\'t change what it says.' },
      pattern: [{ t: 'read', n: 9 }, { t: 'write', n: 10 }, { t: 'escalate' }, { t: 'burst', n: 11 }] }),
    qsquare: F({ name: 'The Square Itself', short: 'The Square', cause: 'A crowd that moves as one: every stall calls every other', sev: 82, concept: 'coupling', tier: 3, boss: true, sprite: 'x-square',
      flavor: 'The day Bram knocked an inquisitor down, the whole square turned at once.',
      symptom: 'Every stall in the square calls every other directly and retries at once. One shout and the whole crowd fails together.',
      weak: { decouple: 'A queue between each stall and the next.', breaker: 'Stop calling the stall that keeps failing.', jitter: 'Back off at random, so the retries don\'t land together.', stateless: 'Let any stall serve anyone.' },
      resist: { scale: 'A bigger crowd is a bigger mob.' },
      pattern: [{ t: 'retry', n: 11 }, { t: 'write', n: 11 }, { t: 'burst', n: 12 }, { t: 'escalate', up: 3 }, { t: 'retry', n: 13 }] }),
    // Floor 2, the River Gate
    qferry: F({ name: 'The Ferryman', short: 'Ferryman', cause: 'A home-made file server that partners must change their clients for', sev: 32, concept: 'transfer', tier: 1, sprite: 'x-ferry',
      flavor: 'He takes anything handed to him. He asks nothing. He loses half of it.',
      symptom: 'Partners upload over SFTP to a server someone patches by hand, and a script copies the files to storage at night, when it remembers.',
      weak: { transfer: 'A Transfer Family SFTP server lands each file straight in S3, with the partners\' own keys and clients.' },
      resist: { queue: 'A queue won\'t carry a 2 GB ledger.' },
      pattern: [{ t: 'write', n: 8 }, { t: 'write', n: 8 }, { t: 'burst', n: 8 }] }),
    qorder: F({ name: 'Out of Order', short: 'Out of Order', cause: 'A standard queue shuffles crossings that must stay in order', sev: 32, concept: 'sqsfifo', tier: 1, sprite: 'x-order',
      flavor: 'The ferry left before it arrived. Apparently.',
      symptom: 'Each crossing is logged as three messages: boarded, crossed, landed. On a standard queue they arrive in any order.',
      weak: { fifo: 'A FIFO queue keeps order within a message group.', group: 'One message group per ferry, so each ferry\'s crossings stay in order and the ferries run in parallel.' },
      resist: { scale: 'More readers shuffle it faster.' },
      pattern: [{ t: 'read', n: 8 }, { t: 'retry', n: 8 }, { t: 'read', n: 8 }] }),
    qtwice: F({ name: 'The Double Crossing', short: 'Double Crossing', cause: 'A retried send logs the same crossing twice', sev: 30, concept: 'sqsfifo', tier: 1, sprite: 'x-twice',
      flavor: 'Same boat, same passenger, two tickets.',
      symptom: 'The ferry\'s sender times out and retries. The ledger shows two identical crossings, a second apart.',
      weak: { fifo: 'A FIFO queue drops a repeat with the same deduplication ID within five minutes.', idem: 'Idempotent readers make the repeat harmless.' },
      resist: { timeout: 'A longer timeout makes the retry rarer, not harmless.' },
      pattern: [{ t: 'retry', n: 8 }, { t: 'write', n: 8 }, { t: 'retry', n: 9 }] }),
    qchoreo: F({ name: 'Choreographer and Conductor', short: 'Choreo & Conductor', cause: 'Two styles of the same workflow, each blaming the other', sev: 50, concept: 'orchestration', tier: 2, elite: true, sprite: 'x-choreo',
      flavor: 'One dances to whatever she hears. One insists on the score.',
      symptom: 'Half the river gate reacts to events on a bus; half is called step by step. When a crossing fails halfway, nobody knows who should undo it.',
      weak: { orch: 'Where one flow needs retries and undo in one place, orchestrate it with Step Functions.', catch: 'Catch the failure and run the compensating step.', decouple: 'Where teams just react, let them choreograph on a bus, with correlation IDs.' },
      resist: { timeout: 'Neither is too slow. They disagree about who\'s in charge.' },
      pattern: [{ t: 'write', n: 10 }, { t: 'read', n: 10 }, { t: 'escalate' }, { t: 'burst', n: 12 }] }),
    qgatehouse: F({ name: 'The Gatehouse', short: 'Gatehouse', cause: 'The river gate\'s ledger is only trustworthy if its order is', sev: 84, concept: 'sqsfifo', tier: 3, boss: true, sprite: 'x-gatehouse',
      flavor: 'It let a girl out at the second hour. It would rather you didn\'t know.',
      symptom: 'Crossings arrive shuffled and doubled, and files land wherever the ferryman drops them. The ledger can\'t prove anything as it is.',
      weak: { group: 'Order by message group: each ferry\'s crossings in sequence.', fifo: 'FIFO with deduplication: in order, and once.', transfer: 'A managed file landing for the ledgers themselves.', orch: 'One orchestrated flow for each crossing.' },
      resist: { scale: 'More readers on a standard queue only shuffle faster.' },
      pattern: [{ t: 'read', n: 12 }, { t: 'retry', n: 12 }, { t: 'burst', n: 12 }, { t: 'escalate', up: 3 }, { t: 'write', n: 13 }] }),
    // Floor 3, the Stair
    qwatch: F({ name: 'The Watchman', short: 'Watchman', cause: 'An alarm on the wrong metric, which never fires', sev: 50, concept: 'sqsalarm', tier: 2, elite: true, sprite: 'x-watch',
      flavor: 'He watches the CPU of a reader that hasn\'t run in a week. All quiet.',
      symptom: 'The stair\'s only alarm watches the reader\'s CPU. The queue\'s oldest message is nine days old and the DLQ holds 4,000. Green across the board.',
      weak: { metric: 'Alarm on ApproximateAgeOfOldestMessage and the DLQ\'s visible messages.', alarm: 'An alarm on what the people waiting would notice.' },
      resist: { scale: 'More readers he isn\'t watching either.' },
      pattern: [{ t: 'read', n: 10 }, { t: 'escalate' }, { t: 'write', n: 11 }, { t: 'read', n: 12 }] }),
    qseven: F({ name: 'The Seven', short: 'The Seven', cause: 'Seven inquisitors who wrote the story before the fight ended', sev: 88, concept: 'msgattr', tier: 3, boss: true, sprite: 'x-seven',
      flavor: 'The ones Bram hunted, as one pack. They remember the stair better than anyone.',
      symptom: 'Their report of the night is received again every time anyone asks, and each time they swear it was written after the fight.',
      weak: { timestamp: 'SentTimestamp: when the report was first posted, however often it\'s received.', metric: 'Watch the right thing, and the story falls apart.', alarm: 'An alarm on the age of what nobody read.', jitter: 'They retry together. Make them wait their turn.' },
      resist: { allow: 'Their grants are fine. Their story isn\'t.' },
      pattern: [{ t: 'retry', n: 12 }, { t: 'read', n: 12 }, { t: 'burst', n: 13 }, { t: 'escalate', up: 3 }, { t: 'write', n: 13 }] }),
    // Floor 4, the Top of the Stair
    hale: F({ name: 'Grand Inquisitor Hale', short: 'Hale', cause: 'Accusations that nobody absorbs come back heavier, again and again', sev: 96, concept: 'dlqredrive', tier: 3, boss: true, sprite: 'x-hale',
      flavor: 'The most liked man in Thornwick. He protected them from a beast.',
      symptom: 'Hale floods the stair with accusations. Every one that fails comes back next turn, heavier, with no limit and nowhere else to go.',
      weak: { dlq: 'A dead-letter queue with a sensible maxReceiveCount takes the accusations that keep failing.', redrive: 'Redrive the whole pile back at its sender.', idem: 'An accusation seen twice is answered once.', timestamp: 'His own report\'s SentTimestamp, before the fight ended.', replay: 'The bus\'s archive, replayed: his order went out at dusk.', group: 'The ferry ledger, in order: Tilly out at the second hour.' },
      resist: { scale: 'More readers read more accusations.', allow: 'Thornwick\'s grants are his, unless you prove otherwise.' },
      pattern: [{ t: 'retry', n: 11 }, { t: 'retry', n: 12 }, { t: 'burst', n: 12 }, { t: 'escalate', up: 3 }, { t: 'retry', n: 14 }, { t: 'write', n: 13 }] }),
    // The Grey Novice
    qguard: F({ name: 'Hale\'s Last Guard', short: 'Last Guard', cause: 'What\'s left of the guard: every failure handled the old way', sev: 86, concept: 'coupling', tier: 3, boss: true, sprite: 'x-guard',
      flavor: 'Four men who still believe him, holding the back stairs.',
      symptom: 'They call each other directly, retry at once, keep no record of what failed, and alarm on nothing.',
      weak: { decouple: 'A queue between them.', breaker: 'Stop calling the one who keeps failing.', destination: 'Keep a record of what failed.', alarm: 'Alarm on what matters.', jitter: 'Back off at random.' },
      resist: { scale: 'More guards, more of the same.' },
      pattern: [{ t: 'retry', n: 11 }, { t: 'write', n: 12 }, { t: 'escalate', up: 3 }, { t: 'burst', n: 13 }, { t: 'read', n: 12 }] }),
    halebell: F({ name: 'Hale, at the Bell', short: 'Hale', cause: 'A man who would rather be a martyr than a liar', sev: 88, concept: 'dlqredrive', tier: 3, boss: true, sprite: 'x-halebell',
      flavor: 'He asks you to kill him. It would be the last thing he ever got to decide.',
      symptom: 'Hale rings the bell over and over: accusations, sent again and again, to every door in Thornwick.',
      weak: { dlq: 'Set the failing accusations aside.', redrive: 'Send them back to him.', timestamp: 'The postmark doesn\'t lie.', idem: 'Answer each accusation once.' },
      resist: { allow: 'He has no grants left. He has a bell.' },
      pattern: [{ t: 'retry', n: 12 }, { t: 'burst', n: 12 }, { t: 'retry', n: 13 }, { t: 'escalate', up: 3 }, { t: 'write', n: 14 }] })
  });

  // ---------- Field Notes ----------
  // Kyu's runbook pages and her notes on the walls, in her handwriting. Each ends with a question on its concept.
  Object.assign(SD.fieldNotes = SD.fieldNotes || {}, {
    threeways: { title: 'Kyu\'s page 2: three ways a letter fails', c: 'lambdaasync', steps: [
      'Synchronous (an API, the console, Invoke with RequestResponse): the error goes straight back to whoever called. They decide whether to try again.',
      'Asynchronous (S3, SNS, EventBridge, Invoke with Event): Lambda queues the event and answers "accepted" at once.',
      'If the function fails, Lambda tries twice more by default, waiting longer each time, for up to six hours.',
      'After the last try the event goes to the on-failure destination (with its error) or the function\'s DLQ. With neither, it\'s dropped.',
      'From a queue or a stream, an event source mapping polls. A failed batch goes back to the queue (and its own DLQ), or the stream retries it.'] },
    memcpu: { title: 'Memory buys CPU', c: 'lambdacfg', ev: '128 MB   sort takes 24.0 s   Max Memory Used 90 MB\n512 MB   sort takes  6.0 s\n1769 MB  sort takes  1.8 s   (one full vCPU)\n3008 MB  sort takes  1.8 s   (single-threaded: no faster)',
      steps: [
        'Lambda gives a function CPU in proportion to its memory.',
        'At 1,769 MB the function has one full vCPU; above that it gets more cores.',
        'This sort is single-threaded, so past one vCPU it gets no faster.',
        'You pay for memory times duration, so 1,769 MB here costs about the same as 128 MB, and is thirteen times faster.',
        'Max Memory Used says nothing about CPU. Measure the duration at several sizes.'] },
    timeouts: { title: 'Timeouts, inside out', c: 'lambdacfg', steps: [
      'The function\'s timeout (3 seconds by default, up to 900) ends a run that goes on too long.',
      'Set it above the slowest real run you\'ve measured, not the average.',
      'Give the HTTP client a shorter timeout than the function, so the code can fail cleanly and log why.',
      'Behind an API Gateway REST API, the integration has its own timeout, 29 seconds by default.',
      'A queue reading the function needs a visibility timeout of at least six times the function\'s.'] },
    layers: { title: 'The layer cake', c: 'lambdapack', steps: [
      'A layer is a .zip of shared libraries or tools. A function can use up to five.',
      'Its files appear under /opt. A Python layer puts packages in a top-level python/ folder.',
      'Each publish makes a new, fixed version. A function keeps the version it was given until you update it.',
      'Layers count toward the 250 MB unzipped limit of the function.',
      'The Serverless Application Repository goes further: whole applications, ready to deploy.'] },
    bisect: { title: 'One bad record in the stream', c: 'kinesislambda', steps: [
      'Lambda reads each shard in order, a batch at a time.',
      'With default settings, a failed batch is retried until it succeeds or its records expire. The shard stands still.',
      'BisectBatchOnFunctionError splits the batch in two and retries each half, until the bad record is alone.',
      'MaximumRetryAttempts and MaximumRecordAgeInSeconds stop retrying sooner.',
      'An on-failure destination gets a record of what was skipped, so it can be looked at later.'] },
    gateway: { title: 'Two ways to say no', c: 'apigw', ev: 'POST /prayers   { "text": "..." }          -> 400 Bad Request (no sender)\nPOST /prayers   1,000 a second from one key -> 429 Too Many Requests',
      steps: [
        'A request validator checks the body against a model\'s JSON schema before anything runs. Missing a required field: 400.',
        'Throttling is a token bucket: a steady rate and a burst. Calls past it get 429.',
        'Limits stack: the account, the stage, the method, and a usage plan per API key.',
        'A client that gets 429 should back off and retry later. One that gets 400 should fix the request.'] },
    sfnretry: { title: 'Kyu\'s trial clock', c: 'stepfn', ev: '"Retry": [{ "ErrorEquals": ["Busy"], "IntervalSeconds": 2, "MaxAttempts": 4, "BackoffRate": 2, "JitterStrategy": "FULL" }],\n"Catch": [{ "ErrorEquals": ["States.ALL"], "ResultPath": "$.error", "Next": "Appeal" }]',
      steps: [
        'Busy is the error that passes on its own: retry it, 2 s, then 4, then 8, then 16, at random within each.',
        'Anything else, or Busy after the fourth try, falls to the Catch.',
        'States.ALL matches every error. Next sends the trial to the Appeal state.',
        'ResultPath "$.error" adds the error to the input instead of replacing it, so Appeal still knows whose trial it was.'] },
    choreo: { title: 'A dance, or a conductor', c: 'orchestration', steps: [
      'Choreography: each service listens on a bus and reacts. Nobody is in charge.',
      'It\'s easy to add a new listener without touching anyone else.',
      'But each service handles its own failures, and following one order means correlation IDs in every log.',
      'Orchestration: a state machine calls each step and owns the retries, timeouts and undo steps.',
      'Use the conductor where one flow must finish or be undone; let the rest dance.'] },
    alarms: { title: 'Kyu\'s page 3: the queue nobody reads', c: 'sqsalarm', ev: 'Alarm 1: prayers-dlq   ApproximateNumberOfMessagesVisible  > 0     for 1 minute\nAlarm 2: prayers      ApproximateAgeOfOldestMessage       > 3600  for 5 minutes',
      steps: [
        'SQS sends its metrics to CloudWatch every minute, free.',
        'A dead-letter queue should normally be empty. One message in it means something failed.',
        'Alarm 1 pages a person the minute anything lands there.',
        'Alarm 2 catches the readers falling behind: the oldest prayer has waited an hour.',
        'An alarm nobody routes to a person is just a light in an empty room.'] },
    redrive: { title: 'Sending them home', c: 'dlqredrive', steps: [
      'The redrive policy lives on the source queue: the DLQ\'s ARN and maxReceiveCount.',
      'Each receive that isn\'t followed by a delete counts. Past maxReceiveCount, SQS moves the message to the DLQ.',
      'The DLQ must be the same type as the source: a FIFO queue needs a FIFO DLQ, in the same account and Region.',
      'Fix the reader first. Then start a DLQ redrive (StartMessageMoveTask) back to the source queue.',
      'Keep the DLQ\'s retention longer than the source\'s: a message\'s age counts from when it was first sent.'] },
    backoff: { title: 'Everyone shouting at once', c: 'coupling', steps: [
      'A passing error, such as a 503 for a few seconds, is worth retrying.',
      'Retrying at once, all together, makes the outage worse: a retry storm.',
      'Wait longer each time (exponential backoff), and pick the wait at random (jitter) so callers spread out.',
      'Cap the attempts, and send what still fails to a queue for later.',
      'If a service keeps failing, a circuit breaker stops calling it for a while and fails fast instead.'] },
    mapping: { title: 'The gate that rewrites', c: 'apigw', ev: '#set($body = $input.path(\'$\'))\n#if($body.error != "")\n  #set($context.responseOverride.status = 400)\n#end\n$input.json(\'$\')',
      steps: [
        'In a custom (non-proxy) integration, a mapping template rewrites the request on the way in.',
        'Another rewrites the backend\'s response on the way out.',
        'A backend that answers 200 with an error in the body fools every client.',
        '$context.responseOverride.status sets the status the client sees: here, 400 when there\'s an error.',
        'With a proxy integration nothing is rewritten; the function shapes the response itself.'] },
    fifogroups: { title: 'In order, but only within a group', c: 'sqsfifo', ev: 'group ferry-north: boarded(1) crossed(2) landed(3)\ngroup ferry-south: boarded(1) crossed(2) landed(3)',
      steps: [
        'A FIFO queue delivers each message group\'s messages in the order they were sent.',
        'Different groups can be read in parallel, in any order relative to each other.',
        'While a group\'s message is being processed, nothing else from that group is handed out.',
        'A repeat with the same deduplication ID, sent within five minutes, is accepted and dropped.',
        'So the ledger for one ferry is in order. The order between two ferries proves nothing.'] },
    transferfam: { title: 'The ferry that lands in the store', c: 'transfer', steps: [
      'Transfer Family runs a managed SFTP, FTPS, FTP or AS2 server for you.',
      'Files land straight in an S3 bucket or an EFS file system.',
      'Partners keep their own SFTP clients and SSH keys; you add each one\'s public key to a user.',
      'For partners who allow-list addresses, use a VPC endpoint with Elastic IPs.',
      'S3 events can then start the processing as each file lands.'] },
    attrs: { title: 'The postmark', c: 'msgattr', ev: 'SentTimestamp                    1729456200000   (the second hour, 02:30)\nApproximateFirstReceiveTimestamp 1729458000000\nApproximateReceiveCount          41',
      steps: [
        'SQS stamps SentTimestamp when it accepts the message: epoch milliseconds.',
        'ApproximateReceiveCount goes up with every receive. SentTimestamp never moves.',
        'ApproximateFirstReceiveTimestamp is when someone first received it.',
        'So a report received 41 times was still written at 02:30, the first time.',
        'Delete a message with the ReceiptHandle from your latest receive, not its MessageId.'] },
    deepdive: { title: 'Three questions at the top of the stair', c: 'dlqredrive', steps: [
      'maxReceiveCount 1: a single passing failure sends a good message to the DLQ. Leave room for a retry or two.',
      'The visibility timeout must outlast the reader: at least six times a Lambda reader\'s timeout, or a message reappears mid-work.',
      'A FIFO queue\'s DLQ must be FIFO too: a dead-letter queue is always the same type as its source.',
      'Then redrive, once someone has read why they failed.'] }
  });

  // ---------- Sorts ----------
  // Predict how many of five get through, then sort them (js/raid.js's Policy Sort room).
  Object.assign(SD.policySorts = SD.policySorts || {}, {
    asyncfail: { title: 'Which failures can you read tomorrow?', c: 'lambdaasync',
      ev: 'Function "pray": async invokes retry 2 times, on-failure destination: an SQS queue.\nFunction "sort": async invokes retry 2 times, no destination, no DLQ.\nBoth fail on every event today.',
      reqs: [
        { t: 'An S3 upload invokes "pray"', ok: true, why: 'S3 invokes asynchronously; after two retries the record goes to the destination queue.' },
        { t: 'An S3 upload invokes "sort"', ok: false, why: 'Async, retried twice, then dropped: no destination and no DLQ.' },
        { t: 'The console\'s Test button invokes "pray"', ok: false, why: 'The console invokes synchronously. The error goes back to the console; no destination is used.' },
        { t: 'An EventBridge rule invokes "pray"', ok: true, why: 'EventBridge invokes asynchronously, so the destination keeps it.' },
        { t: 'Invoke with InvocationType Event on "pray"', ok: true, why: 'Event is the asynchronous invoke type.' }] },
    gatesort: { title: 'Who gets past the Gatekeeper?', c: 'apigw',
      ev: 'POST /prayers: request validator on, model requires "sender" and "text".\nUsage plan for key K: rate 10 requests a second, burst 20.',
      reqs: [
        { t: 'Key K, 5 a second, with sender and text', ok: true, why: 'Valid body, well under the rate.' },
        { t: 'Key K, one request with only "text"', ok: false, why: 'The validator rejects it with 400: "sender" is required.' },
        { t: 'Key K, a sudden 15 at once after a quiet minute', ok: true, why: 'The bucket holds a burst of 20.' },
        { t: 'Key K, 100 a second for a minute', ok: false, why: 'Past the rate once the burst is spent: 429.' },
        { t: 'Key K, a valid body with an extra field "mood"', ok: true, why: 'A JSON schema allows extra fields unless it sets additionalProperties to false.' }] },
    trialsort: { title: 'Which steps survive the trial?', c: 'stepfn',
      ev: 'Step "Vote": Retry ["Busy"] MaxAttempts 3. Catch ["States.ALL"] -> "Appeal".\nStep "Verdict": no Retry, no Catch.',
      reqs: [
        { t: '"Vote" throws Busy once, then succeeds', ok: true, why: 'Retried, and the second try works.' },
        { t: '"Vote" throws Busy four times in a row', ok: true, why: 'Three retries spent, then the Catch sends it to Appeal. The execution goes on.' },
        { t: '"Vote" throws Forged', ok: true, why: 'Not retried, but States.ALL catches it.' },
        { t: '"Verdict" throws Busy', ok: false, why: 'No Retry and no Catch: the execution fails.' },
        { t: '"Verdict" times out', ok: false, why: 'States.Timeout, and nothing catches it.' }] },
    alarmsort: { title: 'Which bells ring?', c: 'sqsalarm',
      ev: 'Alarm A: prayers-dlq visible messages > 0 for 1 minute.\nAlarm B: prayers oldest message age > 3,600 s for 5 minutes.\nAlarm C: the reader\'s CPU > 80%.',
      reqs: [
        { t: 'One prayer fails five times and moves to the DLQ', ok: true, why: 'Alarm A: the DLQ is no longer empty.' },
        { t: 'The readers stop for two hours; nothing fails', ok: true, why: 'Alarm B: the oldest prayer has waited over an hour.' },
        { t: 'The readers stop for two hours, and Alarm C is the only one there', ok: false, why: 'Stopped readers use no CPU. C stays quiet.' },
        { t: 'A steady trickle, read within seconds', ok: false, why: 'Nothing failed and nothing waits.' },
        { t: 'Someone redrives the DLQ, and every prayer is read', ok: false, why: 'The DLQ empties; Alarm A goes back to OK.' }] },
    breakersort: { title: 'Through the breaker', c: 'coupling',
      ev: 'Circuit breaker on the court\'s API: opens after 5 failures in a row, stays open 30 s, then lets one trial call through (half-open).',
      reqs: [
        { t: 'A call while it\'s closed and the court is up', ok: true, why: 'Closed means calls go through.' },
        { t: 'A call 10 s after it opened', ok: false, why: 'Open: it fails fast without calling.' },
        { t: 'The first call 31 s after it opened', ok: true, why: 'Half-open: one trial call goes through.' },
        { t: 'A second call while that trial call is still waiting', ok: false, why: 'Half-open lets only the trial through.' },
        { t: 'A call after the trial call succeeded', ok: true, why: 'Success closes the breaker again.' }] },
    fifosort: { title: 'What the ledger proves', c: 'sqsfifo',
      ev: 'FIFO queue river-ledger. Group ferry-north: boarded, crossed, landed. Group ferry-south: boarded, crossed, landed. Content-based deduplication on.',
      reqs: [
        { t: 'ferry-north\'s "crossed" is read before its "landed"', ok: true, why: 'Order holds within a group.' },
        { t: 'ferry-south\'s "landed" is read before ferry-north\'s "boarded"', ok: true, why: 'Groups run independently; this can happen.' },
        { t: 'ferry-north\'s "landed" is read before its "boarded"', ok: false, why: 'Never, within one group.' },
        { t: 'The same "boarded" body sent twice in a minute is read twice', ok: false, why: 'Content-based deduplication drops the repeat within 5 minutes.' },
        { t: 'Two of ferry-north\'s messages are handed to two readers at once', ok: false, why: 'A group\'s next message waits until the one in flight is deleted.' }] },
    attrsort: { title: 'Which attribute says so?', c: 'msgattr',
      ev: 'Hale\'s report: SentTimestamp 02:30. ApproximateFirstReceiveTimestamp 03:05. ApproximateReceiveCount 41.\nThe fight on the stair ended at 02:50.',
      reqs: [
        { t: 'The report was posted before the fight ended', ok: true, why: 'SentTimestamp 02:30, before 02:50.' },
        { t: 'Receiving it 41 times moved its sent time', ok: false, why: 'SentTimestamp never changes after the send.' },
        { t: 'Someone first read it at 03:05', ok: true, why: 'That\'s ApproximateFirstReceiveTimestamp.' },
        { t: 'Its MessageId deletes it', ok: false, why: 'Deleting takes the ReceiptHandle from a receive.' },
        { t: 'It was received more than once', ok: true, why: 'ApproximateReceiveCount is 41.' }] }
  });

  // ---------- Events ----------
  // ask: a question on the concept (right/wrong rewards); story events carry a scene of their own.
  Object.assign(SD.expeditionEvents = SD.expeditionEvents || {}, {
    layercake: { id: 'layercake', title: 'The Layer Cake', who: null,
      text: 'A shelf of identical tool kits, one per clerk, each packed by hand. Beside it, a single labelled tin: SHARED, /opt.',
      choices: [
        { label: 'Work out what the tin is for', out: 'Right: a Shared Layer card for each of you. Wrong: a kit falls on the team for 6 SLA.', fx: { ask: { c: 'lambdapack', right: { card: 'layer' }, wrong: { sla: -6 } } } },
        { label: 'Take a ready-made clerk from the repository shelf (15 bits each)', out: 'A whole clerk, ready to deploy. Each of you pays 15 bits and removes a card you no longer need.', fx: { cost: 15, remove: 1 } },
        { label: 'Leave the kits', out: 'You leave them. A clerk thanks you for not touching his.', fx: {} }] },
    kyupage2: { id: 'kyupage2', title: 'A Page in Kyu\'s Hand', who: null,
      text: 'Pinned to a sorting desk, page 2 of Kyu\'s runbook: "What happens to a letter that fails depends on who\'s holding it." A blank under it, for the answer.',
      choices: [
        { label: 'Fill in the blank', out: 'Right: one of you refactors a card. Wrong: the page curls up, and the team loses 5 SLA.', fx: { ask: { c: 'lambdaasync', right: { upgrade: 1, who: 'one' }, wrong: { sla: -5 } } } },
        { label: 'Pocket the page for later', out: 'Each of you gains 15 bits. Kyu would want it read, not kept.', fx: { bits: 15 } }] },
    brudesk: { id: 'brudesk', title: 'Bru at the Prayer Desk', who: null,
      text: 'A receptionist chained to a desk, logging every prayer as it passes, faster than anyone could read them. She doesn\'t look up. "Name, prayer, time. Next."',
      choices: [
        { label: 'Ask her who reads them', out: '"Freya. Every one, every night." She keeps writing. The team recovers 10 SLA just from being told something true.', fx: { sla: 10 } },
        { label: 'Ask what the logs are for', out: 'Right: each of you gains 20 bits from her drawer. Wrong: she sighs, and the team loses 4 SLA.', fx: { ask: { c: 'logsinsights', right: { bits: 20 }, wrong: { sla: -4 } } } }] },
    trialclock: { id: 'trialclock', title: 'The Trial Clock', who: null,
      text: 'A clock with seven hands, one per step of a trial. Step three keeps failing and starting the whole clock over.',
      choices: [
        { label: 'Fix the clock\'s retries', out: 'Right: a Retry and Catch card for each of you. Wrong: the clock strikes the team for 6 SLA.', fx: { ask: { c: 'stepfn', right: { card: 'retrycatch' }, wrong: { sla: -6 } } } },
        { label: 'Stop the clock and rest', out: 'The team recovers 8 SLA.', fx: { sla: 8 } }] },
    kyupage3: { id: 'kyupage3', title: 'Kyu\'s Page 3', who: null,
      text: 'Page 3, in her handwriting: "A queue nobody reads is just a quiet room. Put a bell on it." Two alarms are sketched under it, half drawn.',
      choices: [
        { label: 'Finish the sketch', out: 'Right: an Alarm on the DLQ card for each of you. Wrong: the team loses 6 SLA to the quiet.', fx: { ask: { c: 'sqsalarm', right: { card: 'dlqalarm' }, wrong: { sla: -6 } } } },
        { label: 'Read it twice and move on', out: 'The team recovers 6 SLA.', fx: { sla: 6 } }] },
    namgung: { id: 'namgung', title: 'A Sealed Letter', who: null,
      text: 'In the stacks, one letter sealed with a crest of crossed blades. It\'s addressed to Seo-yeon. She looks at it for a long time, and doesn\'t open it.',
      choices: [
        { label: 'Leave it sealed, as she wants', out: 'She puts it inside her coat. The team recovers 8 SLA.', fx: { sla: 8 } },
        { label: 'Work out why a sealed letter still counts', out: 'Right: one of you refactors a card. Wrong: the team loses 4 SLA.', fx: { ask: { c: 'msgattr', right: { upgrade: 1, who: 'one' }, wrong: { sla: -4 } } } }] },
    saintprayer: { id: 'saintprayer', title: 'A Prayer in a Hand He Knows', who: null,
      text: 'Kai pulls a prayer out of the backlog and goes still. He puts it back exactly where it was. Later he scrubs a pot for an hour.',
      choices: [
        { label: 'Say nothing, and help with the pot', out: 'Each of you gains 15 bits, somehow.', fx: { bits: 15 } },
        { label: 'Redrive the prayers around it', out: 'Right: each of you picks an uncommon card. Wrong: the team loses 5 SLA.', fx: { ask: { c: 'dlqredrive', right: { card: 'uncommon' }, wrong: { sla: -5 } } } }] },
    crowd: { id: 'crowd', title: 'The Crowd', who: null,
      text: 'Thornwick, on the square, watching. Every time one of them shouts, they all shout, straight away.',
      choices: [
        { label: 'Teach them to wait their turn', out: 'Right: each of you gains 20 bits. Wrong: the shouting costs the team 6 SLA.', fx: { ask: { c: 'coupling', right: { bits: 20 }, wrong: { sla: -6 } } } },
        { label: 'Wait it out', out: 'It quiets. The team recovers 6 SLA.', fx: { sla: 6 } }] },
    ferrybell: { id: 'ferrybell', title: 'The Ferry Bell', who: null,
      text: 'A ledger chained to the river gate, crossings in neat columns, each with a group and a sequence number.',
      choices: [
        { label: 'Read the ledger the way the queue would', out: 'Right: a Message Group ID card for each of you. Wrong: the river takes 6 SLA.', fx: { ask: { c: 'sqsfifo', right: { card: 'msggroup' }, wrong: { sla: -6 } } } },
        { label: 'Ride the ferry across instead', out: 'Each of you gains 10 bits from the fare box. The ferryman doesn\'t notice.', fx: { bits: 10 } }] },
    memorynode: { id: 'memorynode', title: 'A Memory on the Stair', who: null,
      text: 'A node of light on the landing. It plays the stair, two years ago, for whoever plays Mira. Everyone else sees only that she has stopped walking.',
      choices: [
        { label: 'Wait with her', out: 'Nobody says anything. The team recovers 10 SLA.', fx: { sla: 10 } },
        { label: 'Read the timestamps on the wall instead', out: 'Right: a Read the SentTimestamp card for each of you. Wrong: the team loses 6 SLA.', fx: { ask: { c: 'msgattr', right: { card: 'senttime' }, wrong: { sla: -6 } } } }] },
    anselmbook: { id: 'anselmbook', title: 'Anselm\'s Book', who: null,
      text: 'Brother Anselm stops on the stair and opens his book: forty-one names, each with a date. "I kept them in order. In case anyone ever asked."',
      choices: [
        { label: 'Ask why order matters', out: 'Right: each of you refactors... one of you does. Wrong: the team loses 4 SLA.', fx: { ask: { c: 'sqsfifo', right: { upgrade: 1, who: 'one' }, wrong: { sla: -4 } } } },
        { label: 'Let him read a name aloud', out: 'He reads one. The team recovers 10 SLA.', fx: { sla: 10 } }] }
  });
  SD.expeditionEvents.anselmbook.choices[0].out = 'Right: one of you refactors a card. Wrong: the team loses 4 SLA.';

  // ---------- Questions ----------
  // From the exam bank (and js/bank-c2x.js), filed under this part's concepts. Each Field Notes room, whiteboard and
  // event asks one of a concept's at random.
  const POOLS = {
    lambdacfg: ['dva-4-102', 'dva-4-07', 'dva-4-201', 'dva-4-224', 'dva-4-101'],
    lambdaasync: ['dva-1-02', 'dva-1-203', 'dva-1-216', 'dva-1-214'],
    lambdapack: ['dva-1-17', 'dva-1-218', 'dva-1-209'],
    kinesislambda: ['dva-1-201', 'dva-1-219', 'dva-4-210', 'dva-1-123'],
    apigw: ['dva-1-13', 'dva-1-128', 'dva-1-301', 'dva-1-303', 'dva-1-129'],
    stepfn: ['dva-1-115', 'dva-1-116', 'dva-1-309', 'dva-1-310'],
    orchestration: ['dva-1-308', 'saa-2-109', 'dva-1-112', 'dva-1-20'],
    sqsalarm: ['saa-2-102', 'dva-4-115', 'dva-4-674', 'dva-4-676'],
    dlqredrive: ['dva-1-105', 'dva-1-212', 'dva-1-104', 'dva-1-672'],
    logsinsights: ['dva-4-04', 'dva-4-13', 'dva-4-224'],
    datatrail: ['dva-4-404', 'dva-4-673', 'dva-4-12'],
    coupling: ['dva-1-141', 'dva-1-14', 'dva-1-142', 'saa-2-01'],
    transfer: ['saa-2-104', 'saa-2-221', 'saa-2-677'],
    ebarchive: ['dva-1-113', 'dva-1-675'],
    msgattr: ['dva-1-670', 'dva-1-106', 'dva-1-671'],
    sqsfifo: ['dva-1-04', 'dva-1-05', 'saa-2-110']
  };
  X.POOLS = POOLS;
  // An id can sit in two pools (dva-4-224); it's filed once, under the first.
  Object.keys(POOLS).forEach(c => POOLS[c].forEach(id => {
    const b = (SD.bank || []).find(q => q.id === id);
    if (b && !SD.questions.some(q => q.id === id)) SD.questions.push(Object.assign({}, b, { c }));
  }));
  // A concept's question at random, as a fresh copy filed under that concept.
  X.pickQ = c => (POOLS[c] ? SD.qpick(POOLS[c], { c }) : SD.qpick(SD.questions.filter(q => q.c === c && q.id && !q.lp && q.type !== 'explain'))) || null;

  // ---------- The expeditions ----------
  const ORDER = ['mira', 'kai', 'seoyeon', 'dutch'];
  const sv = () => (SD.state && SD.state.save && SD.state.save.c2x) || { f: {} };
  const P = rows => rows;
  // Balance (Ladi, 2026-10-21: each expedition harder than the one before, about 90% clean clears over the part):
  // each expedition's sev and dmg (js/raid.js) set its difficulty. Was 0.85 and 0.85 for all three. The Dead Letter
  // Office 0.8 and 0.6, the Inquisition's Tower 0.75 and 0.55 (it was the hardest), the Grey Novice 0.85 and 0.92.
  SD.expeditions = (SD.expeditions || []).concat([{
    id: 'deadletter', name: 'The Dead Letter Office', who: ORDER, opens: () => !!sv().f.f7, sev: 0.8, dmg: 0.6,
    blurb: 'Floors 7 to 12: the clerks who never finish, the stream that never stops, and the vault where the prayers go.',
    back: 'Up to the lift',
    cafe: { title: 'The Clerks\' Tea Room', who: null, name: 'The tea room', text: 'A tea room for clerks who never take a break. The urn is warm. Someone has left cards on the counter, priced in red ink.' },
    camp: { title: 'The Franking Room', text: 'A quiet room full of franking machines. Sit for a minute, or use the bench to tune one of your cards. Each of you chooses one.' },
    regroup: [{ who: 'mate1', text: 'Everyone up? Back to the start of the floor. We know what\'s in there now.' }],
    floors: [
      { name: 'The Clerks', gate: 'THE DEAD LETTER OFFICE · THE CLERKS', map: '2', beat: 'Clerks that time out, starve, start cold and drop what fails.',
        boss: 'nightshift', bossTitle: 'The Night Shift', fade: 5,
        plan: P([['fight', 'notes', 'fight'], ['notes', 'fight', 'sort'], ['fight', 'event', 'notes'], ['elite', 'notes', 'cafe'], ['camp', 'fight', 'event'], ['notes', 'sort', 'fight'], ['fight', 'elite', 'board'], ['event', 'notes', 'fight'], ['camp', 'cafe', 'camp']]),
        fights: ['dlcold', 'dlreaper', 'dlstarved', 'dlcap', { ids: ['dlcold', 'dlreaper'] }, { ids: ['dlstarved', 'dlcap'] }],
        elites: ['dlretrier'], notes: ['threeways', 'memcpu', 'timeouts', 'layers'], sorts: ['asyncfail'], events: ['layercake', 'kyupage2'],
        intro: [
          { who: null, text: 'Floor 7. Desks to the horizon, a clerk at every one, each stamping the same letter over and over.' },
          { who: 'lead', text: 'They\'re not lazy. They\'re timing out.' },
          { who: 'mate1', text: 'Three seconds each. That\'s not a job, that\'s a sneeze.' }],
        outro: [
          { who: null, text: 'The Night Shift sits back. For the first time in ten thousand years, its in-tray is empty.' },
          { who: 'mate2', text: 'More memory, a real timeout, and somewhere for the failures to go. That\'s all it ever needed.' },
          { who: 'lead', text: 'Down. Somebody\'s logging prayers down there.' }] },
      { name: 'The Stream Room', gate: 'THE DEAD LETTER OFFICE · THE STREAM ROOM', map: '2', beat: 'A river of prayers in shards, a gate that says no to nobody, and a trial of seven steps.',
        boss: 'sevenvotes', bossTitle: 'The Seven Votes', fade: 5,
        plan: P([['fight', 'event', 'fight'], ['sort', 'fight', 'notes'], ['fight', 'notes', 'event'], ['elite', 'cafe', 'notes'], ['camp', 'fight', 'sort'], ['notes', 'fight', 'event'], ['fight', 'elite', 'board'], ['sort', 'notes', 'fight'], ['camp', 'cafe', 'camp']]),
        fights: ['dlage', 'dlpoison', 'dlgate', { ids: ['dlage', 'dlpoison'] }, { ids: ['dlgate', 'dlcap'] }],
        elites: ['dlinquiry'], notes: ['bisect', 'gateway', 'sfnretry', 'choreo'], sorts: ['gatesort', 'trialsort'], events: ['brudesk', 'trialclock'],
        intro: [
          { who: null, text: 'The Stream Room: a channel of light through the floor, every prayer in Thornwick flowing past in shards.' },
          { who: 'mate1', text: 'Somebody\'s reading this. Slowly.' },
          { who: 'lead', text: 'There. At the desk. She\'s chained to it.' }],
        outro: [
          { who: null, text: 'The Seven Votes fall silent. Bru\'s chain comes off with the last of them.' },
          { who: 'bru', text: 'Freya. She reads every one, every night. I log them. I always know where everyone is.' },
          { who: 'lead', text: 'Then come with us. Where does it all go?' },
          { who: 'bru', text: 'Down. To the vault.' }] },
      { name: 'The Prayer Vault', gate: 'THE DEAD LETTER OFFICE · THE PRAYER VAULT', map: '2', beat: 'Echoes of every floor so far, and ten thousand years of prayers nobody read.',
        boss: 'unread', bossTitle: 'The Unread', fade: 4,
        plan: P([['fight', 'notes', 'fight'], ['event', 'fight', 'sort'], ['notes', 'elite', 'fight'], ['fight', 'cafe', 'event'], ['camp', 'notes', 'fight'], ['fight', 'event', 'notes'], ['elite', 'fight', 'board'], ['notes', 'sort', 'fight'], ['camp', 'cafe', 'camp']]),
        fights: [{ ids: ['dlcold', 'dlpoison'] }, { ids: ['dlreaper', 'dlgate'] }, 'dlstarved', 'dlage', { ids: ['dlcap', 'dlage'] }, 'dlpoison'],
        elites: ['dlunanswered', 'dlretrier'], notes: ['alarms', 'redrive', 'threeways', 'bisect'], sorts: ['alarmsort', 'asyncfail'], events: ['kyupage3', 'namgung', 'saintprayer'],
        intro: [
          { who: null, text: 'The Prayer Vault. Shelves of sealed prayers climb into the dark, and more pour in from above, all the time.' },
          { who: 'mate2', text: 'Nobody has ever read one of these.' },
          { who: 'lead', text: 'Then we start.' }],
        outro: [
          { who: null, text: 'The Unread thins to a drift of paper. At the bottom of the backlog, with the prayers still pouring over her, someone is sitting in chains.' },
          { who: 'lead', text: '...Uptima.' }] }
    ]
  }, {
    id: 'inqtower', name: 'The Inquisition\'s Tower', who: ORDER, opens: () => !!sv().f.f13, sev: 0.75, dmg: 0.55,
    blurb: 'Floors 13 to 20: the tower Bram died in, rebuilt. The square, the river gate, the stair, and Hale at the top.',
    back: 'Back down to the square',
    cafe: { title: 'The Penitents\' Kitchen', who: null, name: 'The kitchen', text: 'A bare kitchen for the Inquisition\'s penitents. The bread is hard. The cards on the shelf are not.' },
    camp: { title: 'A Cell With the Door Off', text: 'An empty cell with its door taken off its hinges. Rest, or tune one of your cards. Each of you chooses one.' },
    regroup: [{ who: 'mate1', text: 'Up. Back to the start of the floor. We\'re not done.' }],
    floors: [
      { name: 'The Square', gate: 'THE INQUISITION\'S TOWER · THE SQUARE', map: '2', beat: 'A crowd where everyone calls everyone, retries at once, and falls together.',
        boss: 'qsquare', bossTitle: 'The Square Itself', fade: 5,
        plan: P([['fight', 'notes', 'fight'], ['sort', 'fight', 'event'], ['fight', 'notes', 'fight'], ['elite', 'cafe', 'notes'], ['camp', 'fight', 'sort'], ['notes', 'fight', 'event'], ['fight', 'elite', 'board'], ['event', 'notes', 'fight'], ['camp', 'cafe', 'camp']]),
        fights: ['qcoupled', 'qstorm', 'qsticky', { ids: ['qcoupled', 'qstorm'] }, { ids: ['qsticky', 'qstorm'] }],
        elites: ['qgate'], notes: ['backoff', 'mapping', 'gateway'], sorts: ['breakersort'], events: ['crowd'],
        intro: [
          { who: null, text: 'Floor 14 is the square, rebuilt: the stalls, the bell tower, the spot where Bram knocked an inquisitor down.' },
          { who: 'lead', text: { mira: 'I know every stone of this.', other: 'She knows every stone of this. Look at her.' } },
          { who: 'mate1', text: 'Everyone here talks to everyone. Loudly. At once.' }],
        outro: [
          { who: null, text: 'The Square Itself breaks up into people again: tired, embarrassed, quiet.' },
          { who: 'mate2', text: 'One queue between each of them, and they stop being a mob.' },
          { who: 'lead', text: 'The river gate is next. That\'s where she went out.' }] },
      { name: 'The River Gate', gate: 'THE INQUISITION\'S TOWER · THE RIVER GATE', map: '2', beat: 'A ferry that takes anything, a ledger out of order, and two styles of the same flow.',
        boss: 'qgatehouse', bossTitle: 'The Gatehouse', fade: 5,
        plan: P([['fight', 'event', 'fight'], ['notes', 'fight', 'sort'], ['fight', 'notes', 'fight'], ['elite', 'cafe', 'event'], ['camp', 'notes', 'fight'], ['sort', 'fight', 'notes'], ['fight', 'elite', 'board'], ['notes', 'event', 'fight'], ['camp', 'cafe', 'camp']]),
        fights: ['qferry', 'qorder', 'qtwice', { ids: ['qorder', 'qtwice'] }, { ids: ['qferry', 'qorder'] }],
        elites: ['qchoreo'], notes: ['fifogroups', 'transferfam', 'choreo'], sorts: ['fifosort'], events: ['ferrybell'],
        intro: [
          { who: null, text: 'The river gate: black water under the tower, a ferry on a chain, and a ledger for every crossing.' },
          { who: 'mate1', text: 'The ferry takes anything. It doesn\'t ask what.' },
          { who: 'lead', text: 'Then let\'s find out what it carried at the second hour.' }],
        outro: [
          { who: null, text: 'The Gatehouse opens. Its ledger lies in order now, every ferry\'s crossings in sequence.' },
          { who: 'mate2', text: 'The second hour. A girl, carried out. The beast was still on the stair.' },
          { who: 'lead', text: 'The stair, then.' }] },
      { name: 'The Stair', gate: 'THE INQUISITION\'S TOWER · THE STAIR', map: '2', beat: 'Echoes from the whole band, an alarm that never rings, and the seven men Bram hunted.',
        boss: 'qseven', bossTitle: 'The Seven', fade: 4,
        plan: P([['fight', 'notes', 'fight'], ['event', 'fight', 'sort'], ['fight', 'notes', 'elite'], ['notes', 'cafe', 'fight'], ['camp', 'fight', 'event'], ['fight', 'sort', 'notes'], ['elite', 'fight', 'board'], ['notes', 'fight', 'event'], ['camp', 'cafe', 'camp']]),
        fights: [{ ids: ['qstorm', 'qorder'] }, { ids: ['qcoupled', 'dlpoison'] }, 'qtwice', 'dlreaper', { ids: ['qsticky', 'dlgate'] }, 'qferry'],
        elites: ['qwatch', 'qgate'], notes: ['attrs', 'alarms', 'fifogroups', 'backoff'], sorts: ['attrsort', 'alarmsort'], events: ['memorynode'],
        intro: [
          { who: null, text: 'The stair. Narrow, and very long, and every step of it is where something happened.' },
          { who: 'mate2', text: 'Mira. You don\'t have to—' },
          { who: 'lead', text: { mira: 'I do. Keep walking.', other: 'She does. Keep walking with her.' } }],
        outro: [
          { who: null, text: 'The Seven come apart into seven old men, who look at Mira and then at the floor.' },
          { who: 'mate1', text: 'Their report was posted at the second hour and a half. The fight ended at ten to three.' },
          { who: 'lead', text: 'He wrote the story first. Up.' }] },
      { name: 'The Top of the Stair', gate: 'THE INQUISITION\'S TOWER · THE TOP OF THE STAIR', map: '2', beat: 'No incidents left, only Hale, and the three questions that decide what his accusations cost.',
        boss: 'hale', bossTitle: 'Grand Inquisitor Hale', fade: 0,
        plan: P([['notes', 'camp', 'notes'], ['fight', 'notes', 'fight'], ['notes', 'cafe', 'sort'], ['camp', 'notes', 'fight'], ['notes', 'fight', 'notes'], ['sort', 'camp', 'notes'], ['fight', 'notes', 'board'], ['notes', 'cafe', 'notes'], ['camp', 'cafe', 'camp']]),
        fights: [{ ids: ['qwatch'] }, { ids: ['qstorm', 'qtwice'] }, 'qcoupled'],
        elites: ['qwatch'], notes: ['deepdive', 'redrive', 'attrs', 'alarms'], sorts: ['attrsort', 'fifosort'], events: [],
        intro: [
          { who: null, text: 'The top of the stair. Hale stands where Bram died, with Tilly beside him in her grey. Through the bell tower\'s open wall, all Thornwick is watching.' },
          { who: 'hale', text: 'I protected them from a beast. Ask anyone.' },
          { who: 'lead', text: { mira: 'I\'m asking you.', other: 'We have something to show Thornwick first.' } },
          { who: 'evidence', text: '' }],
        outro: [
          { who: null, text: 'Hale\'s last accusation goes back to him with all the others. He staggers, and runs, up the tower, out of reach.' },
          { who: 'tilly', text: '...' },
          { who: null, text: 'Tilly doesn\'t follow him. She doesn\'t follow anyone. She walks down to the town floor alone.' }] }
    ]
  }, {
    id: 'greynovice', name: 'The Grey Novice', who: ORDER, opens: () => !!sv().f.reckon, sev: 0.85, dmg: 0.92,
    blurb: 'The bell tower\'s back stairs, where Hale hides with what\'s left of his guard.',
    back: 'Back down to Thornwick',
    cafe: { title: 'The Bell-Ringer\'s Cupboard', who: null, name: 'Marrow\'s cupboard', text: 'Goodwife Marrow\'s cupboard: rope, candles, a teapot, and a few cards she says she found.' },
    camp: { title: 'The Belfry Landing', text: 'A landing under the bells. Rest, or tune a card. Each of you chooses one.' },
    regroup: [{ who: 'mate1', text: 'Again. From the bottom of these stairs.' }],
    floors: [
      { name: 'The Back Stairs', gate: 'THE GREY NOVICE · THE BACK STAIRS', map: '2', beat: 'Every idea in the Mailroom, mixed, and the last of Hale\'s guard.',
        boss: 'qguard', bossTitle: 'Hale\'s Last Guard', fade: 3,
        plan: P([['fight', 'notes', 'fight'], ['event', 'fight', 'sort'], ['fight', 'notes', 'fight'], ['elite', 'cafe', 'event'], ['camp', 'fight', 'notes'], ['fight', 'sort', 'event'], ['elite', 'fight', 'board'], ['notes', 'fight', 'notes'], ['camp', 'cafe', 'camp']]),
        fights: [{ ids: ['dlreaper', 'qstorm'] }, { ids: ['dlpoison', 'qorder'] }, { ids: ['dlgate', 'qcoupled'] }, 'dlstarved', 'qtwice', 'dlage'],
        elites: ['dlretrier', 'qwatch', 'dlinquiry'], notes: ['threeways', 'bisect', 'alarms', 'backoff', 'fifogroups', 'deepdive'], sorts: ['asyncfail', 'breakersort', 'fifosort'], events: ['anselmbook', 'crowd'],
        intro: [
          { who: null, text: 'The bell tower\'s back stairs. Brother Anselm climbs with you, his book under his arm.' },
          { who: 'anselm', text: 'He\'ll be at the top. He always is.' }],
        outro: [
          { who: null, text: 'The last of the guard sit down on the stairs and let you pass.' },
          { who: 'anselm', text: 'Tilly. Wait. There\'s something I should have told you two years ago.' }] },
      { name: 'The Bell', gate: 'THE GREY NOVICE · THE BELL', map: '2', beat: 'Hale, the bell, and a chain Mira never needed.',
        boss: 'halebell', bossTitle: 'Hale, at the Bell', fade: 0,
        plan: P([['notes', 'camp', 'notes'], ['fight', 'event', 'fight'], ['notes', 'cafe', 'sort'], ['camp', 'fight', 'notes'], ['fight', 'notes', 'fight'], ['sort', 'camp', 'event'], ['fight', 'notes', 'board'], ['notes', 'cafe', 'fight'], ['camp', 'cafe', 'camp']]),
        fights: [{ ids: ['qwatch'] }, { ids: ['qstorm', 'dlretrier'] }, 'qgate', 'dlunanswered'],
        elites: ['qchoreo'], notes: ['deepdive', 'redrive', 'attrs'], sorts: ['attrsort', 'alarmsort'], events: ['anselmbook'],
        intro: [
          { who: null, text: 'The bell. Hale has his hands on the rope, ringing it for nobody.' },
          { who: 'hale', text: 'Kill me. Let them remember me for something.' }],
        outro: [
          { who: null, text: 'Mira unwinds Bram\'s silver chain from her beast arm, the chain she never needed, and binds Hale with it.' },
          { who: 'lead', text: { mira: 'Thornwick\'s court can decide what you are.', other: 'She doesn\'t kill him. Thornwick\'s court will decide.' } }] }
    ]
  }]);
  X.ORDER = ORDER;
})();
