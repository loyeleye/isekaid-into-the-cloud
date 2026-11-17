// The Fire Drill's rules (design: project files game-modes/multiplayer-real/design.md, approved by Ladi Nov 16 as its
// own mode; Multiplayer is unchanged). A drill is one small production system with a hidden fault. Four champions each
// own one station of it: Seo-yeon the Gate (API Gateway and the callers' retries), Mira the Queue (SQS), Kai the
// Function (Lambda, its role and its writes) and Dutch the Store (DynamoDB and its KMS key). The fault usually shows
// at a different station from the one that caused it. You read the signals, make up to 3 changes, and deploy, up to
// 3 times. The run is deterministic: the same settings and the same seed always give the same result.
// The AWS rules are js/aws-sim-ops.js (on js/aws-sim.js), each with its docs link. Pure: no DOM, no randomness, no
// saves. js/mode-drill.js draws it; tools/drill_sim.js plays it headless.
(function (root) {
  const AS = (root.SD && root.SD.awsSim) || (typeof require !== 'undefined' ? (require('./aws-sim.js'), require('./aws-sim-ops.js')) : null);
  const D = {};
  D.TICKS = 12;          // arrival ticks per run, then up to DRAIN more for the system to settle
  D.DRAIN = 8;
  D.TICK_S = 10;         // one tick is 10 seconds of game time
  D.CHANGES = 3;         // changes per deploy (a dial turned or a card placed)
  D.DEPLOYS = 3;
  D.ATTEMPTS = 4;        // a caller's tries before it gives up (the game's number; the card never states one)
  D.BUDGET = 100;        // the night's error budget (SLA)
  D.RUN_CAP = 12;        // most a single run can cost
  D.ESCALATE = 6;        // the extra cost when a drill escalates
  D.PARTS = 3;           // the table's partitions
  D.PER_PART = 3;        // writes per partition per tick (the real cap is 1,000 WCU a second)

  // ---- Stations ----
  D.STATIONS = {
    gate: { name: 'The Gate', who: 'seoyeon', svc: 'API Gateway' },
    queue: { name: 'The Queue', who: 'mira', svc: 'SQS' },
    fn: { name: 'The Function', who: 'kai', svc: 'Lambda' },
    store: { name: 'The Store', who: 'dutch', svc: 'DynamoDB' }
  };
  D.ORDER = ['gate', 'queue', 'fn', 'store'];
  // A station as a drill shows it (a drill can rename one, as The Stampede Stream makes the Queue a Kinesis stream).
  D.station = (drill, k) => Object.assign({}, D.STATIONS[k], (DR[drill] && DR[drill].stations && DR[drill].stations[k]) || {});
  D.NAMES = { seoyeon: 'Seo-yeon', mira: 'Mira', kai: 'Kai', dutch: 'Dutch' };

  // ---- Settings. Each change costs 1 of the deploy's 3. A dial's values are real-sized (seconds, counts). ----
  // set(cfg) applies the change. why(cfg, drill): a reason it can't be placed (a rule AWS enforces), or ''.
  // back: the real rule, shown on the card's back.
  D.CARDS = {
    // Seo-yeon: the Gate
    backoff: { at: 'gate', name: 'Callers\' SDK retry: backoff and jitter', text: 'Callers who get a 429 wait 1, 2, then 4 ticks, spread apart, before trying again.',
      back: 'The SDKs retry throttling errors with exponential backoff and jitter.', set: c => { c.gate.retry = 'backoff'; }, on: c => c.gate.retry === 'backoff' },
    immediate: { at: 'gate', name: 'Callers\' retry: immediately', text: 'Callers who get a 429 try again on the very next tick.',
      back: 'Retrying at once just hits the same empty bucket.', set: c => { c.gate.retry = 'immediate'; }, on: c => c.gate.retry === 'immediate' },
    plan: { at: 'gate', name: 'Usage plan: throttle the batch client', text: 'The batch client\'s API key gets its own limit: 2 requests a tick.',
      back: 'Usage plans throttle per client, by the API key each client sends.', set: c => { c.gate.plan = true; }, on: c => c.gate.plan },
    burst: { at: 'gate', name: 'Raise the account burst', text: 'Make the Gate\'s bucket bigger.',
      back: 'The account-level bucket (5,000 requests behind 10,000 a second, per Region) isn\'t yours to change.',
      why: () => (AS.burstChangeable ? '' : 'Refused: AWS sets the account-level burst. You can\'t change it.'), set: () => {}, on: () => false },
    // The Lambda authorizer (only in a drill with one). Its policy is cached by token for the TTL.
    ttl300: { at: 'gate', dial: 'authttl', needs: 'auth', name: 'Authorizer cache TTL 300 s', text: 'A token\'s policy is reused for 5 minutes without asking the authorizer again.',
      back: '300 seconds is the default. The cached policy is used for every method the token calls in that time.', set: c => { c.gate.ttl = 300; }, on: c => c.gate.ttl === 300 },
    ttl0: { at: 'gate', dial: 'authttl', needs: 'auth', name: 'Authorizer cache TTL 0 (off)', text: 'Ask the authorizer about every request.',
      back: 'A TTL of 0 turns policy caching off: correct every time, and one authorizer call per request.', set: c => { c.gate.ttl = 0; }, on: c => c.gate.ttl === 0 },
    ttl3600: { at: 'gate', dial: 'authttl', needs: 'auth', name: 'Authorizer cache TTL 3600 s', text: 'A token\'s policy is reused for an hour.',
      back: '3600 seconds is the most API Gateway allows.', set: c => { c.gate.ttl = 3600; }, on: c => c.gate.ttl === 3600 },
    authwild: { at: 'gate', needs: 'auth', name: 'Authorizer policy: the whole API (stage/*/*)', text: 'The authorizer\'s Allow covers every method and path in the stage, not just the one called.',
      back: 'A cached policy is checked against every later call with the same token. Scope it to what the token may do, not to the first call.', set: c => { c.gate.wild = true; }, on: c => c.gate.wild },
    // The Gate publishing to an SNS topic (only in a drill with one): the integration request's mapping.
    snsattr: { at: 'gate', needs: 'sns', name: 'Integration: send order_type as a message attribute', text: 'The Publish call carries order_type in MessageAttributes, not only in the order\'s JSON.',
      back: 'A filter policy reads message attributes by default. An attribute the publisher never sets can\'t match anything.', set: c => { c.gate.snsattr = true; }, on: c => c.gate.snsattr },
    // Usage plans (only in a drill with API keys). Each key in a plan gets its own throttle and quota counters.
    keysplit: { at: 'gate', needs: 'keys', name: 'Give the partner its own API key', text: 'The partner gets partner-key in the same usage plan. The shop\'s app keeps app-key.',
      back: 'A usage plan\'s throttle and quota apply to each API key on its own. Two clients on one key share one count.', set: c => { c.gate.split = true; }, on: c => c.gate.split },
    quotaup: { at: 'gate', needs: 'keys', name: 'Raise the plan\'s quota to 100 a day', text: 'Double the requests each key may make in a day.',
      back: 'It stops tonight\'s 429s, and the partner\'s contract is 50 a day. One shared key can\'t limit one client without the other.', set: c => { c.gate.quota = 100; }, on: c => c.gate.quota === 100 },
    stagerate: { at: 'gate', needs: 'keys', name: 'Raise the stage\'s throttle', text: 'Let the stage take more requests a second.',
      back: 'Stage and method throttling limit the rate. A quota counts requests over a day, a week or a month, per API key.', set: c => { c.gate.stage = true; }, on: c => c.gate.stage },
    // The API Gateway stage cache (only in a drill with one). A response is cached by its cache key for the TTL.
    gttl0: { at: 'gate', dial: 'gcachettl', needs: 'gcache', name: 'Stage cache TTL 0 (off)', text: 'Nothing is cached: every request goes to the function.',
      back: 'A TTL of 0 turns caching off. Every request reaches the backend.', set: c => { c.gate.gttl = 0; }, on: c => c.gate.gttl === 0 },
    gttl300: { at: 'gate', dial: 'gcachettl', needs: 'gcache', name: 'Stage cache TTL 300 s', text: 'A cached response is served for 5 minutes.',
      back: '300 seconds is the default.', set: c => { c.gate.gttl = 300; }, on: c => c.gate.gttl === 300 },
    gttl3600: { at: 'gate', dial: 'gcachettl', needs: 'gcache', name: 'Stage cache TTL 3600 s', text: 'A cached response is served for an hour.',
      back: '3600 seconds is the most API Gateway allows.', set: c => { c.gate.gttl = 3600; }, on: c => c.gate.gttl === 3600 },
    ckey: { at: 'gate', needs: 'gcache', name: 'Cache key: add the customerId query string', text: 'GET /orders caches one response per customerId instead of one for everyone.',
      back: 'The cache tells requests apart only by the parameters you mark as cache keys: headers, paths or query strings.', set: c => { c.gate.ckey = true; }, on: c => c.gate.ckey },
    gflush: { at: 'gate', needs: 'gcache', name: 'Flush the stage cache', text: 'Empty the stage\'s cache, once, at the start of the run.',
      back: 'Flushing empties the cache. The next response is cached under the same key as before.', set: c => { c.gate.gflush = true; }, on: c => c.gate.gflush, once: true },
    maxage: { at: 'gate', needs: 'gcache', name: 'Clients send Cache-Control: max-age=0', text: 'The shop\'s app asks for a fresh answer on every request.',
      back: 'Only a caller allowed execute-api:InvalidateCache can invalidate an entry. This stage requires that, and ignores the header from anyone else, with a warning.', set: c => { c.gate.maxage = true; }, on: c => c.gate.maxage },
    gtrace: { at: 'gate', name: 'X-Ray tracing on the stage', obs: true, text: 'The Gate shows on the trace map in its real colour.',
      back: 'API Gateway tracing is turned on per stage.', set: c => { c.gate.trace = true; }, on: c => c.gate.trace },
    // Mira: the Queue
    vis30: { at: 'queue', sqs: true, dial: 'vis', name: 'Visibility timeout 30 s', text: 'A received message hides for 30 seconds.', back: 'The default visibility timeout is 30 seconds (max 12 hours).', set: c => { c.queue.vis = 30; }, on: c => c.queue.vis === 30 },
    vis60: { at: 'queue', sqs: true, dial: 'vis', name: 'Visibility timeout 60 s', text: 'A received message hides for 60 seconds.', back: 'An undeleted message is received again when its timeout runs out.', set: c => { c.queue.vis = 60; }, on: c => c.queue.vis === 60 },
    vis120: { at: 'queue', sqs: true, dial: 'vis', name: 'Visibility timeout 120 s', text: 'A received message hides for 2 minutes.', back: 'An undeleted message is received again when its timeout runs out.', set: c => { c.queue.vis = 120; }, on: c => c.queue.vis === 120 },
    vis360: { at: 'queue', sqs: true, dial: 'vis', name: 'Visibility timeout 360 s', text: 'A received message hides for 6 minutes.', back: 'For a Lambda consumer AWS advises at least 6x the function timeout, plus the batching window.', set: c => { c.queue.vis = 360; }, on: c => c.queue.vis === 360 },
    // The Short Fuse's timeline (audit, Nov 17: the gesture mirrors the concept): you drag the visibility window
    // along the function's Duration bars instead of turning the dial. Any value in seconds, set by D.setVis; dragging
    // it again in the same deploy costs nothing more. Never placed as a card, so on() is false.
    visline: { at: 'queue', sqs: true, needs: 'visLine', name: 'Visibility timeout (the window)', text: 'How long a received message stays hidden.',
      back: 'An undeleted message turns visible again when its window ends. For a Lambda consumer AWS advises at least 6x the function timeout.', set: () => {}, on: () => false },
    dlq: { at: 'queue', sqs: true, name: 'Redrive policy → orders-dlq', text: 'After 3 receives, a message moves to orders-dlq.',
      back: 'maxReceiveCount moves a message to the dead-letter queue. The DLQ must be the same type as its queue.',
      why: c => (AS.dlqTypeOk(c.queue.fifo, false) ? '' : 'Refused: a FIFO queue needs a FIFO dead-letter queue.'), set: c => { c.queue.dlq = 'std'; }, on: c => c.queue.dlq === 'std' },
    dlqfifo: { at: 'queue', sqs: true, name: 'Redrive policy → orders-dlq.fifo', text: 'After 3 receives, a message moves to orders-dlq.fifo.',
      back: 'A FIFO queue\'s dead-letter queue must also be FIFO.',
      why: c => (AS.dlqTypeOk(c.queue.fifo, true) ? '' : 'Refused: a standard queue needs a standard dead-letter queue.'), set: c => { c.queue.dlq = 'fifo'; }, on: c => c.queue.dlq === 'fifo' },
    groups: { at: 'queue', sqs: true, name: 'MessageGroupId = customerId', text: 'Each customer\'s orders get their own message group.',
      back: 'Order is kept within a group, and Lambda can work as many groups at once as there are.',
      why: c => (c.queue.fifo ? '' : 'Only a FIFO queue has message groups.'), set: c => { c.queue.groups = 'customer'; }, on: c => c.queue.groups === 'customer' },
    purge: { at: 'queue', sqs: true, name: 'Purge the queue', text: 'Delete every message waiting in the queue, once, at the start of the run.',
      back: 'PurgeQueue deletes all the messages in a queue, good ones included.', set: c => { c.queue.purge = true; }, on: c => c.queue.purge, once: true },
    // Mira, on a stream: Kai's trigger on it (the event source mapping's error handling)
    bisect: { at: 'queue', needs: 'stream', name: 'BisectBatchOnFunctionError', text: 'When a batch fails, split it in two and retry each half.',
      back: 'Bisecting isolates the bad record. The records around it can be processed again, so writes should be idempotent.', set: c => { c.stream.bisect = true; }, on: c => c.stream.bisect },
    retry2: { at: 'queue', needs: 'stream', name: 'MaximumRetryAttempts 2', text: 'After 2 retries, give up on a failing batch and move on.',
      back: 'The default is -1: retry until the record expires (24 hours on a DynamoDB stream, the retention period on Kinesis).', set: c => { c.stream.retries = 2; }, on: c => c.stream.retries === 2 },
    onfail: { at: 'queue', needs: 'stream', name: 'On-failure destination → orders-failed', text: 'When Lambda gives up on a batch, it sends a note about it to the SQS queue orders-failed.',
      back: 'The note says which records failed (shard and sequence numbers), not the records themselves. Without one, discarded records are just gone.', set: c => { c.stream.onfail = true; }, on: c => c.stream.onfail },
    // Mira, on a topic: the shipping subscription (an SNS topic with a Lambda subscriber).
    scopebody: { at: 'queue', needs: 'sns', name: 'FilterPolicyScope: MessageBody', text: 'The shipping subscription\'s filter policy reads the order\'s JSON body instead of its attributes.',
      back: 'The default scope is MessageAttributes. MessageBody needs a well-formed JSON message. A policy change can take up to 15 minutes to fully take effect.', set: c => { c.topic.scope = 'body'; }, on: c => c.topic.scope === 'body' },
    nofilter: { at: 'queue', needs: 'sns', name: 'Remove the shipping filter policy', text: 'The shipping subscription gets every order published to the topic.',
      back: 'With no filter policy, a subscriber receives every message published to its topic.', set: c => { c.topic.filter = false; }, on: c => !c.topic.filter },
    subdlq: { at: 'queue', needs: 'sns', name: 'Subscription redrive policy → shipping-dlq', text: 'Messages SNS can\'t deliver to the shipping function go to the SQS queue shipping-dlq.',
      back: 'A subscription\'s dead-letter queue keeps messages that failed delivery. A message a filter policy rejects isn\'t a failure: it was never meant to be delivered.', set: c => { c.topic.dlq = true; }, on: c => c.topic.dlq },
    rawon: { at: 'queue', needs: 'sns', name: 'Raw message delivery', text: 'Deliver the order to the shipping function without the SNS envelope.',
      back: 'Raw message delivery is for SQS, HTTP/S and Firehose subscriptions. Filtering doesn\'t need it.',
      why: () => 'Refused: raw message delivery isn\'t available for a Lambda subscription.', set: () => {}, on: () => false },
    // Mira, on a state machine: the Charge task's error handling (Step Functions Retry and Catch).
    rtrans: { at: 'queue', dial: 'sfnretry', needs: 'sfn', name: 'Retry Lambda.TooManyRequestsException, Lambda.ServiceException: MaxAttempts 3, BackoffRate 2', text: 'Charge retries only Lambda\'s passing errors, up to 3 times, waiting longer each time.',
      back: 'Retry errors that might clear. MaxAttempts defaults to 3, IntervalSeconds to 1, BackoffRate to 2.0.', set: c => { c.flow.retry = 'trans'; }, on: c => c.flow.retry === 'trans' },
    rall: { at: 'queue', dial: 'sfnretry', needs: 'sfn', name: 'Retry States.ALL: MaxAttempts 3', text: 'Charge retries any error at all, up to 3 times.',
      back: 'States.ALL matches every error, including ones that will fail the same way every time.', set: c => { c.flow.retry = 'all'; }, on: c => c.flow.retry === 'all' },
    rnone: { at: 'queue', dial: 'sfnretry', needs: 'sfn', name: 'No retrier', text: 'Any error fails the Charge state the first time.',
      back: 'With no Retry field, a state doesn\'t retry.', set: c => { c.flow.retry = 'none'; }, on: c => c.flow.retry === 'none' },
    catchrp: { at: 'queue', dial: 'sfncatch', needs: 'sfn', name: 'Catch CardDeclined → ReleaseStock, ResultPath $.error', text: 'A declined card goes to ReleaseStock, with the error added to the order under error.',
      back: 'ResultPath $.error keeps the state\'s input and adds the error output to it.', set: c => { c.flow.catch = 'rp'; }, on: c => c.flow.catch === 'rp' },
    catchno: { at: 'queue', dial: 'sfncatch', needs: 'sfn', name: 'Catch CardDeclined → ReleaseStock', text: 'A declined card goes to ReleaseStock.',
      back: 'Without ResultPath a catcher\'s ResultPath is $: the error output replaces the whole input.', set: c => { c.flow.catch = 'norp'; }, on: c => c.flow.catch === 'norp' },
    catchnone: { at: 'queue', dial: 'sfncatch', needs: 'sfn', name: 'No catcher', text: 'An error Charge can\'t retry fails the whole execution.',
      back: 'An error no retrier or catcher handles fails the entire execution.', set: c => { c.flow.catch = 'none'; }, on: c => c.flow.catch === 'none' },
    catchfirst: { at: 'queue', needs: 'sfn', name: 'Catch States.ALL first, then CardDeclined', text: 'A catch-all catcher at the top of the Catch list, the declined-card one after it.',
      back: 'States.ALL must be alone in its ErrorEquals and in the last catcher.', why: () => 'Refused: States.ALL must appear alone, in the last catcher.', set: () => {}, on: () => false },
    // Kai: the Function
    to30: { at: 'fn', dial: 'timeout', name: 'Function timeout 30 s', text: 'The function stops after 30 seconds.', back: 'A function that runs past its timeout is stopped: "Task timed out".', set: c => { c.fn.timeout = 30; }, on: c => c.fn.timeout === 30 },
    to60: { at: 'fn', dial: 'timeout', name: 'Function timeout 60 s', text: 'The function stops after 60 seconds.', back: 'A function that runs past its timeout is stopped: "Task timed out".', set: c => { c.fn.timeout = 60; }, on: c => c.fn.timeout === 60 },
    to120: { at: 'fn', dial: 'timeout', name: 'Function timeout 120 s', text: 'The function stops after 2 minutes.', back: 'The maximum is 15 minutes.', set: c => { c.fn.timeout = 120; }, on: c => c.fn.timeout === 120 },
    b1: { at: 'fn', dial: 'batch', name: 'Batch size 1', text: 'Each invocation takes 1 message.', back: 'The batch size of an SQS event source mapping (default 10).', set: c => { c.fn.batch = 1; }, on: c => c.fn.batch === 1 },
    b3: { at: 'fn', dial: 'batch', name: 'Batch size 3', text: 'Each invocation takes up to 3 messages.', back: 'The batch size of an SQS event source mapping (default 10).', set: c => { c.fn.batch = 3; }, on: c => c.fn.batch === 3 },
    partial: { at: 'fn', name: 'ReportBatchItemFailures', text: 'The function reports which messages failed. Only those go back.',
      back: 'Without it a failed batch comes back whole, successes included.', set: c => { c.fn.partial = true; }, on: c => c.fn.partial },
    reserved: { at: 'fn', name: 'Reserved concurrency 20', text: 'Set aside 20 concurrent executions for this function.',
      back: 'Reserved concurrency is both a guarantee and a cap. It doesn\'t pre-initialise anything.', set: c => { c.fn.reserved = 20; }, on: c => c.fn.reserved === 20 },
    prov: { at: 'fn', name: 'Provisioned concurrency 6 on alias live', text: 'Keep 6 environments initialised for the alias the Gate calls.',
      back: 'Provisioned concurrency keeps environments warm. It needs a version or alias.', set: c => { c.fn.prov = 6; }, on: c => c.fn.prov === 6 },
    provlatest: { at: 'fn', name: 'Provisioned concurrency 6 on $LATEST', text: 'Keep 6 environments initialised for $LATEST.',
      back: 'Provisioned concurrency can\'t go on $LATEST.', why: () => (AS.provTargetOk('$LATEST') ? '' : 'Refused: provisioned concurrency needs a published version or an alias, not $LATEST.'), set: () => {}, on: () => false },
    rolekms: { at: 'fn', name: 'Role policy: allow kms:Decrypt', text: 'The function\'s role allows kms:Decrypt on the table\'s key.',
      back: 'An identity policy counts for a KMS key only if the key policy lets IAM policies grant access.', set: c => { c.fn.kms = true; }, on: c => c.fn.kms },
    admin: { at: 'fn', name: 'Attach AdministratorAccess', text: 'Give the function\'s role AdministratorAccess.',
      back: 'An Allow in IAM still needs the key policy to let IAM decide. And it breaks least privilege.', set: c => { c.fn.admin = true; }, on: c => c.fn.admin },
    cond: { at: 'fn', name: 'Conditional write', text: 'Write with attribute_not_exists(orderId): a second write of the same order changes nothing.',
      back: 'A failed condition returns ConditionalCheckFailedException instead of overwriting.', set: c => { c.fn.cond = true; }, on: c => c.fn.cond },
    fninvoke: { at: 'fn', needs: 'auth', name: 'Role policy: allow execute-api:Invoke', text: 'The function\'s role may call API Gateway APIs.',
      back: 'That lets the function call APIs. Who may call this API is decided at the Gate, by the authorizer\'s policy.', set: c => { c.fn.invoke = true; }, on: c => c.fn.invoke },
    ddbput: { at: 'fn', name: 'Role policy: allow dynamodb:PutItem on table/orders', text: 'The function\'s role may write items to the orders table, and nothing more.',
      back: 'Least privilege: allow only the actions and resources the function needs. With no Allow, IAM denies by default.', set: c => { c.fn.iam = c.fn.iam.concat('dynamodb:PutItem'); }, on: c => c.fn.iam.includes('dynamodb:PutItem') },
    ddbstar: { at: 'fn', name: 'Role policy: allow dynamodb:* on *', text: 'The function\'s role may do anything to any table.',
      back: 'It works, and it breaks least privilege: one bug in the function can now delete any table.', set: c => { c.fn.iam = c.fn.iam.concat('dynamodb:*'); c.fn.wide = true; }, on: c => c.fn.wide },
    // The secret (only in a drill with one): how the function gets the ledger database's credentials.
    secinit: { at: 'fn', dial: 'sec', needs: 'secret', name: 'Read the secret once, at start-up', text: 'Each environment fetches the password when it starts and keeps it.',
      back: 'A value kept in a global lives as long as the environment does.', set: c => { c.fn.sec = 'init'; }, on: c => c.fn.sec === 'init' },
    secttl: { at: 'fn', dial: 'sec', needs: 'secret', name: 'Parameters and Secrets extension, TTL 300 s', text: 'The Lambda extension caches the secret for 5 minutes.',
      back: 'SECRETS_MANAGER_TTL is 300 seconds by default, and at most. The cache doesn\'t notice a rotation before then.', set: c => { c.fn.sec = 'ttl'; }, on: c => c.fn.sec === 'ttl' },
    seccall: { at: 'fn', dial: 'sec', needs: 'secret', name: 'GetSecretValue on every call', text: 'Fetch the password from Secrets Manager for every order.',
      back: 'Always current, but every order pays for an API call and waits for it. AWS recommends caching secrets.', set: c => { c.fn.sec = 'call'; }, on: c => c.fn.sec === 'call' },
    refetch: { at: 'fn', needs: 'secret', name: 'On a login failure, read the secret again', text: 'If the database rejects the password, fetch the current secret and try once more.',
      back: 'Rotation can change a secret under a running function. Fetching it again when a login fails picks up the new one.', set: c => { c.fn.refetch = true; }, on: c => c.fn.refetch },
    // The release (only in a drill with one): how CodeDeploy shifts the alias live to the new version (SAM DeploymentPreference).
    allatonce: { at: 'fn', dial: 'shift', needs: 'release', name: 'Deployment: AllAtOnce', text: 'All of live\'s traffic moves to the new version at once.',
      back: 'AllAtOnce shifts everything in one step, and the deployment is over almost as soon as it starts.', set: c => { c.fn.shift = 'all'; }, on: c => c.fn.shift === 'all' },
    canary: { at: 'fn', dial: 'shift', needs: 'release', name: 'Deployment: Canary10Percent5Minutes', text: '10% of live\'s traffic goes to the new version for 5 minutes, then the rest.',
      back: 'A canary shifts traffic in two steps. The deployment runs until the last step.', set: c => { c.fn.shift = 'canary'; }, on: c => c.fn.shift === 'canary' },
    linear: { at: 'fn', dial: 'shift', needs: 'release', name: 'Deployment: Linear10PercentEvery1Minute', text: 'Another 10% of live\'s traffic moves to the new version every minute.',
      back: 'Linear shifts traffic in equal steps, a set time apart.', set: c => { c.fn.shift = 'linear'; }, on: c => c.fn.shift === 'linear' },
    alarm: { at: 'fn', needs: 'release', name: 'Alarms: roll back on the alias\'s Errors', text: 'A CloudWatch alarm on Errors greater than 0 is listed in the deployment preference.',
      back: 'CodeDeploy stops and rolls back a deployment when one of its alarms goes off while it\'s running.', set: c => { c.fn.alarm = true; }, on: c => c.fn.alarm },
    hook: { at: 'fn', needs: 'release', name: 'Hooks: PreTraffic test', text: 'Before any traffic moves, a test function sends the new version one order and reports back.',
      back: 'CodeDeploy runs the PreTraffic hook before shifting. If it reports Failed, the deployment rolls back.', set: c => { c.fn.hook = true; }, on: c => c.fn.hook },
    // The uploads (only in a drill with them): how the function presigns the S3 multipart upload's part URLs.
    exp60: { at: 'fn', dial: 'uexp', needs: 'upload', name: 'Presigned URLs: ExpiresIn 60 s', text: 'Each part\'s URL works for one minute after it\'s signed.',
      back: 'S3 checks a presigned URL\'s expiry when each request starts. A part sent after that is turned away.', set: c => { c.up.exp = 60; }, on: c => c.up.exp === 60 },
    exp900: { at: 'fn', dial: 'uexp', needs: 'upload', name: 'Presigned URLs: ExpiresIn 15 min', text: 'Each part\'s URL works for 15 minutes after it\'s signed.',
      back: 'A URL expires at its ExpiresIn or when the credentials that signed it expire, whichever comes first.', set: c => { c.up.exp = 900; }, on: c => c.up.exp === 900 },
    exp7d: { at: 'fn', dial: 'uexp', needs: 'upload', name: 'Presigned URLs: ExpiresIn 7 days', text: 'Each part\'s URL works for a week after it\'s signed.',
      back: '7 days (604,800 seconds) is the most Signature Version 4 allows. Signed by a role, the URL still dies with the role\'s session.', set: c => { c.up.exp = 604800; }, on: c => c.up.exp === 604800 },
    exp30d: { at: 'fn', dial: 'uexp', needs: 'upload', name: 'Presigned URLs: ExpiresIn 30 days', text: 'Each part\'s URL works for a month.',
      back: 'Signature Version 4 caps a presigned URL at 7 days.', why: () => 'Refused: a presigned URL lasts at most 7 days (604,800 seconds).', set: () => {}, on: () => false },
    demand: { at: 'fn', needs: 'upload', name: 'Presign each part when it\'s sent', text: 'The phone asks the function for a part\'s URL just before sending that part.',
      back: 'Each URL is signed moments before it\'s used, with whatever credentials the function has right then.', set: c => { c.up.demand = true; }, on: c => c.up.demand },
    userkey: { at: 'fn', needs: 'upload', name: 'Sign with an IAM user\'s access key', text: 'Put a long-term access key in an environment variable and sign with that instead of the role.',
      back: 'A user\'s key outlives any session, and it\'s a long-term secret sitting in your function. Roles exist so you don\'t do this.', set: c => { c.up.userKey = true; }, on: c => c.up.userKey },
    single: { at: 'fn', needs: 'upload', name: 'Upload in one PUT', text: 'One presigned PutObject URL for the whole video, no parts.',
      back: 'A single PUT uploads at most 5 GB. Past that you need a multipart upload.', why: () => 'Refused: one PUT uploads at most 5 GB, and these videos are 8 GB. Use a multipart upload.', set: () => {}, on: () => false },
    ftrace: { at: 'fn', name: 'X-Ray active tracing', obs: true, text: 'The function, and the calls it makes, show on the trace map in their real colours.',
      back: 'Lambda sends traces to X-Ray only with Active tracing on.', set: c => { c.fn.trace = true; }, on: c => c.fn.trace },
    // Dutch: the Store
    kstatus: { at: 'store', dial: 'key', name: 'Keep orders keyed by status', text: 'Orders are keyed by status. Almost all of them are PENDING.', back: 'A low-cardinality key puts most writes on one partition. A table\'s key schema is set when it\'s created and can\'t be changed.', set: c => { c.store.key = 'status'; }, on: c => c.store.key === 'status' },
    korder: { at: 'store', dial: 'key', name: 'New table orders-v2, keyed by orderId', text: 'A key can\'t change in place, so create orders-v2 keyed by each order\'s own id and send the writes there.', back: 'A high-cardinality key spreads writes across partitions. To change a table\'s partition key you create a new table (KeySchema: orderId HASH) and move the data.', set: c => { c.store.key = 'orderId'; }, on: c => c.store.key === 'orderId' },
    kshard: { at: 'store', dial: 'key', name: 'New table orders-v2, keyed by status#suffix', text: 'Create orders-v2 keyed by status plus a calculated suffix from 1 to 9, and send the writes there.', back: 'Write sharding: a random or calculated suffix spreads one hot value. The key is set when the table is created, so this is a new table too.', set: c => { c.store.key = 'shard'; }, on: c => c.store.key === 'shard' },
    wcu: { at: 'store', name: 'Double the table\'s WCU', text: 'Provision twice the write capacity for the table.',
      back: 'Each partition still serves at most 1,000 WCU a second.', set: c => { c.store.wcu = 2 * c.store.wcu0; }, on: c => c.store.wcu > c.store.wcu0 },
    kprole: { at: 'store', name: 'Key policy: allow the function\'s role', text: 'Add the function\'s role to the key policy, for kms:Decrypt and kms:GenerateDataKey.',
      back: 'A key policy can grant access to a role directly.', set: c => { c.store.keyPolicy = 'role'; }, on: c => c.store.keyPolicy === 'role' },
    kpiam: { at: 'store', name: 'Key policy: let IAM policies decide', text: 'Add the statement that lets this account\'s IAM policies grant access to the key.',
      back: 'This is what the default key policy does. Then the role\'s own policy must allow it.', set: c => { c.store.keyPolicy = 'iam'; }, on: c => c.store.keyPolicy === 'iam' },
    // Reads (only in a drill that reads its own writes back).
    consread: { at: 'store', needs: 'reads', name: 'GetItem with ConsistentRead: true', text: 'Read the order back strongly consistent: DAX passes it straight to the table.',
      back: 'A strongly consistent read returns every write that succeeded before it. It costs twice the read capacity, and DAX doesn\'t cache it.', set: c => { c.store.consistent = true; }, on: c => c.store.consistent },
    daxnode: { at: 'store', needs: 'reads', name: 'Add a node to the DAX cluster', text: 'Three DAX nodes instead of two.',
      back: 'More nodes add read capacity and availability. DAX reads are still eventually consistent.', set: c => { c.store.dax = 3; }, on: c => c.store.dax === 3 },
    gsiread: { at: 'store', needs: 'reads', name: 'Read from the byCustomer index, ConsistentRead: true', text: 'Look the order up in the global secondary index instead, strongly consistent.',
      back: 'A global secondary index only supports eventually consistent reads.', why: () => 'Refused: a global secondary index doesn\'t support strongly consistent reads.', set: () => {}, on: () => false },
    rotsingle: { at: 'store', dial: 'rot', needs: 'secret', name: 'Rotation: single user', text: 'Every 30 days, orders_app gets a new password, and the old one stops working.',
      back: 'Single user: one set of credentials. A client still holding the old password is turned away.', set: c => { c.store.rot = 'single'; }, on: c => c.store.rot === 'single' },
    rotalt: { at: 'store', dial: 'rot', needs: 'secret', name: 'Rotation: alternating users', text: 'Two users take turns. Each rotation changes the one not in use.',
      back: 'Alternating users: the previous credentials keep working until the next rotation, so a cached copy still logs in.', set: c => { c.store.rot = 'alt'; }, on: c => c.store.rot === 'alt' },
    rotoff: { at: 'store', dial: 'rot', needs: 'secret', name: 'Turn off rotation', text: 'The password never changes.',
      back: 'Nothing goes stale, and nothing rotates: a leaked password stays good forever.', set: c => { c.store.rot = 'off'; }, on: c => c.store.rot === 'off' },
    // The cache (only in a drill with one): ElastiCache in front of the table. The strategy and TTL are the
    // function's code (SET with EX); they sit at Dutch's desk because the cache is his.
    cachelazy: { at: 'store', dial: 'cstrat', needs: 'cache', name: 'Cache: lazy loading only', text: 'A key goes into the cache only when a read misses it.',
      back: 'Lazy loading caches only what is read, and nothing updates a key once it\'s there: it can go stale.', set: c => { c.cache.wt = false; }, on: c => !c.cache.wt },
    cachewt: { at: 'store', dial: 'cstrat', needs: 'cache', name: 'Cache: write-through', text: 'Every write to the table also writes the cache. A read that misses still loads the key.',
      back: 'Write-through keeps cached data current. It also caches everything written, most of which is never read: cache churn.', set: c => { c.cache.wt = true; }, on: c => c.cache.wt },
    cttl0: { at: 'store', dial: 'cttl', needs: 'cache', name: 'Cache TTL: none', text: 'Cached keys never expire.', back: 'With no TTL a key stays until it\'s overwritten or evicted.', set: c => { c.cache.ttl = 0; }, on: c => c.cache.ttl === 0 },
    cttl10: { at: 'store', dial: 'cttl', needs: 'cache', name: 'Cache TTL 10 s', text: 'Every cached key expires 10 seconds after it\'s set.', back: 'A TTL shorter than the time between reads means nearly every read misses.', set: c => { c.cache.ttl = 10; }, on: c => c.cache.ttl === 10 },
    cttl60: { at: 'store', dial: 'cttl', needs: 'cache', name: 'Cache TTL 60 s', text: 'Every cached key expires a minute after it\'s set.', back: 'Adding a TTL to each write gives you the strengths of both strategies.', set: c => { c.cache.ttl = 60; }, on: c => c.cache.ttl === 60 },
    cttl3600: { at: 'store', dial: 'cttl', needs: 'cache', name: 'Cache TTL 1 hour', text: 'Every cached key expires an hour after it\'s set.', back: 'A TTL longer than the night is, for tonight, no TTL at all.', set: c => { c.cache.ttl = 3600; }, on: c => c.cache.ttl === 3600 },
    replica: { at: 'store', needs: 'cache', name: 'Add a read replica to the cache', text: 'A second node copies the primary and serves reads too.',
      back: 'A replica adds read capacity and failover. It copies what the primary holds, stale keys included.', set: c => { c.cache.replica = true; }, on: c => c.cache.replica },
    flush: { at: 'store', needs: 'cache', name: 'FLUSHALL the cache', text: 'Delete every key in the cache, once, early in the run.',
      back: 'Flushing empties the cache. Every read then misses once, and lazy loading fills it again the same way as before.', set: c => { c.cache.flush = true; }, on: c => c.cache.flush, once: true },
    // The bucket (only in a drill with uploads): S3, where callers upload straight from their phones with presigned URLs.
    lifecycle: { at: 'store', needs: 'upload', name: 'Lifecycle: abort incomplete multipart uploads after 1 day', text: 'Parts of an upload nobody finished are deleted a day later.',
      back: 'S3 keeps, and bills, an incomplete upload\'s parts until it\'s completed or aborted. This rule cleans them up. It finishes nothing.', set: c => { c.up.lifecycle = true; }, on: c => c.up.lifecycle },
    publicput: { at: 'store', needs: 'upload', name: 'Bucket policy: anyone may PutObject', text: 'Uploads need no signature at all.',
      back: 'It works, and now anyone on the internet can write to your bucket. Presigned URLs exist so you never have to do this.', set: c => { c.up.pub = true; }, on: c => c.up.pub },
    insights: { at: 'store', name: 'Contributor Insights', obs: true, text: 'The Store names its most throttled key.',
      back: 'CloudWatch Contributor Insights for DynamoDB shows the most accessed and throttled keys.', set: c => { c.store.insights = true; }, on: c => c.store.insights },
    trail: { at: 'store', name: 'Read CloudTrail', obs: true, text: 'Look up the key\'s recent Decrypt calls and who made them.',
      back: 'CloudTrail records KMS calls such as Decrypt, and some denied calls too.', set: c => { c.store.trail = true; }, on: c => c.store.trail }
  };
  const C = D.CARDS;
  D.HANDS = {
    gate: ['backoff', 'immediate', 'plan', 'burst', 'ttl300', 'ttl0', 'ttl3600', 'authwild', 'snsattr', 'keysplit', 'quotaup', 'stagerate', 'gttl0', 'gttl300', 'gttl3600', 'ckey', 'gflush', 'maxage', 'gtrace'],
    queue: ['vis30', 'vis60', 'vis120', 'vis360', 'dlq', 'dlqfifo', 'groups', 'purge', 'bisect', 'retry2', 'onfail', 'scopebody', 'nofilter', 'subdlq', 'rawon',
      'rnone', 'rtrans', 'rall', 'catchnone', 'catchno', 'catchrp', 'catchfirst'],
    fn: ['to30', 'to60', 'to120', 'b1', 'b3', 'partial', 'reserved', 'prov', 'provlatest', 'rolekms', 'fninvoke', 'ddbput', 'ddbstar', 'admin', 'cond', 'secinit', 'secttl', 'seccall', 'refetch', 'allatonce', 'canary', 'linear', 'alarm', 'hook', 'exp60', 'exp900', 'exp7d', 'exp30d', 'demand', 'userkey', 'single', 'ftrace'],
    store: ['kstatus', 'korder', 'kshard', 'wcu', 'kprole', 'kpiam', 'consread', 'daxnode', 'gsiread', 'rotsingle', 'rotalt', 'rotoff', 'cachelazy', 'cachewt', 'cttl0', 'cttl10', 'cttl60', 'cttl3600', 'replica', 'flush', 'lifecycle', 'publicput', 'insights', 'trail']
  };

  // ---- The default system: healthy-looking settings, which each drill then breaks one way ----
  function baseCfg() {
    return {
      gate: { retry: 'backoff', plan: false, trace: false, ttl: 300, wild: false, snsattr: false, split: false, quota: 50, stage: false, gttl: 300, ckey: false, gflush: false, maxage: false },
      queue: { on: false, fifo: false, vis: 120, dlq: null, groups: 'one', purge: false },
      fn: { timeout: 30, batch: 1, partial: false, reserved: null, prov: 0, kms: true, admin: false, cond: false, trace: false,
        iam: ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:PutItem'], wide: false, shift: 'all', alarm: false, hook: false, sec: 'init', refetch: false },
      store: { on: true, key: 'orderId', wcu: 12, wcu0: 12, keyPolicy: 'iam', kms: false, insights: false, trail: false, rot: 'single', consistent: false, dax: 2 },
      stream: { bisect: false, retries: null, onfail: false },
      cache: { wt: false, ttl: 0, replica: false, flush: false },
      up: { exp: 60, demand: false, userKey: false, pub: false, lifecycle: false },
      topic: { scope: 'attrs', filter: true, dlq: false },
      flow: { retry: 'none', catch: 'none' }
    };
  }
  const clone = o => JSON.parse(JSON.stringify(o));

  // ---- Arrivals ----
  // A request: { id, client, cust, poison, work (seconds) }. pre: messages already in the queue at the start.
  const R = (id, o) => Object.assign({ id, client: 'shop', cust: 'c0', work: 10 }, o || {});
  const steady = (n, o, from, to) => t => (t >= (from | 0) && t < (to == null ? D.TICKS : to) ? Array.from({ length: n }, (_, i) => R(`t${t}-${i}`, Object.assign({ cust: 'c' + ((t * n + i) % 6) }, o || {}))) : []);
  const both = (...fs) => t => [].concat(...fs.map(f => f(t)));

  // ---- The drills ----
  // break(cfg, v): the fault, on top of baseCfg. v: this play's shifting numbers (from the seed).
  // ok(m): contained, from the run's counts. fix: the intended changes (tools/drill_sim.js checks them).
  // lazy: plans that must not contain it. q: the bank pattern for the debrief.
  D.DRILLS = {
    storm: { name: 'Retry Storm', cause: 'gate', lead: 'seoyeon', path: 'sync',
      says: 'The batch client is back. It doesn\'t take no for an answer.',
      setup: v => ({ bucket: [4, 5], arrivals: both(steady(4, { client: 'shop' }), t => (t % 4 === 0 && t < D.TICKS ? Array.from({ length: 6 + (v.k % 2) }, (_, i) => R(`b${t}-${i}`, { client: 'batch' })) : [])) }),
      break: c => { c.gate.retry = 'immediate'; },
      ok: m => m.gaveUp === 0, fix: [['backoff'], ['backoff', 'plan']], lazy: [['plan'], ['reserved'], ['burst']],
      hidden: 'Callers retried a 429 at once, so every retry hit the same empty bucket.',
      q: /backoff|jitter|429|TooManyRequests|throttl.*(API Gateway|retr)|usage plan/i },
    hot: { name: 'The Hot Key', cause: 'store', lead: 'dutch', path: 'sync',
      says: 'Every order is PENDING. Every single one.',
      setup: v => ({ bucket: [40, 40], arrivals: steady(5 + (v.k % 2)) }),
      break: c => { c.store.key = 'status'; },
      ok: m => m.hot === 0 && m.over === 0, fix: [['korder'], ['kshard']], lazy: [['wcu'], ['reserved'], ['to120']],
      hidden: 'The partition key was status, so almost every write went to one partition.',
      q: /partition key|hot (partition|key)|write shard|high[- ]cardinality|WriteThrottle|ProvisionedThroughputExceeded/i },
    herd: { name: 'The Thundering Herd', boss: true, cause: 'gate+store', lead: 'seoyeon', path: 'sync',
      says: 'Two things are wrong. Fix one and you\'ll meet the other.',
      setup: v => ({ bucket: [4, 5], arrivals: both(steady(4, { client: 'shop' }), t => (t % 4 === 0 && t < D.TICKS ? Array.from({ length: 6 + (v.k % 2) }, (_, i) => R(`b${t}-${i}`, { client: 'batch' })) : [])) }),
      break: c => { c.gate.retry = 'immediate'; c.store.key = 'status'; },
      ok: m => m.gaveUp === 0 && m.hot === 0 && m.over === 0, fix: [['backoff', 'korder'], ['backoff', 'kshard']], lazy: [['backoff'], ['korder'], ['wcu', 'reserved']],
      hidden: 'Immediate retries stormed the Gate, and the status key throttled the Store.',
      q: /backoff|jitter|throttl|partition key|hot partition|write shard/i },
    locked: { name: 'The Locked Drawer', cause: 'store', lead: 'dutch', path: 'sync',
      says: 'The drawer is locked, and the key isn\'t ours.',
      setup: v => ({ bucket: [40, 40], arrivals: steady(3 + (v.k % 2)) }),
      break: c => { c.store.kms = true; c.store.keyPolicy = 'admins'; c.fn.kms = false; },
      ok: m => m.denied === 0 && !m.adminUsed, fix: [['kprole'], ['kpiam', 'rolekms']], lazy: [['admin'], ['rolekms'], ['reserved']],
      hidden: 'The key policy named only the key\'s administrators, so nothing else could use the key.',
      q: /KMS|key polic|kms:Decrypt|customer managed key|grant/i },
    badge: { name: 'The Wrong Badge', cause: 'fn', lead: 'dutch', path: 'sync',
      says: 'Everyone upstairs says 500. Somebody downstairs said 400 first.',
      setup: v => ({ bucket: [40, 40], arrivals: steady(3 + (v.k % 2)) }),
      break: c => { c.fn.iam = ['dynamodb:GetItem', 'dynamodb:Query', 'dynamodb:Scan', 'dynamodb:BatchGetItem']; },
      ok: m => m.iamDenied === 0 && !m.adminUsed && !m.wideUsed, fix: [['ddbput']], lazy: [['admin'], ['ddbstar'], ['wcu'], ['reserved']],
      hidden: 'The function\'s role could only read the table, so every PutItem was denied with a 4xx, and the Gate passed it on as a 5xx.',
      q: /AccessDenied|least[- ]privilege|execution role|not authorized to perform|identity-based polic/i },
    canary: { name: 'The Bad Canary', cause: 'fn', lead: 'kai', path: 'sync', release: true,
      says: 'Release night! Version 2 ships twenty seconds in, ready or not.',
      setup: v => ({ bucket: [40, 40], release: 2 + (v.k % 2), arrivals: steady(5 + (v.k % 2)) }),
      break: () => {},
      ok: m => m.v2Fail <= 1 && m.stopped > 0, fix: [['canary', 'alarm'], ['linear', 'alarm'], ['hook']], lazy: [['canary'], ['linear'], ['alarm'], ['reserved'], ['to120']],
      hidden: 'Version 2 failed every order, and AllAtOnce gave it all of live\'s traffic with nothing to stop it.',
      q: /canary|traffic shift|DeploymentPreference|weighted alias|PreTraffic|AllAtOnce|Linear10Percent|Canary10Percent/i },
    vault: { name: 'The Locked Vault', cause: 'fn', lead: 'dutch', path: 'sync', secret: true,
      says: 'The ledger password changes tonight. Nobody told the function.',
      setup: v => ({ bucket: [40, 40], rotate: 3 + (v.k % 2), arrivals: steady(4) }),
      break: () => {},
      ok: m => m.authFail === 0 && !m.perCall && !m.rotOff, fix: [['refetch'], ['rotalt']], lazy: [['secttl'], ['seccall'], ['rotoff'], ['reserved']],
      hidden: 'Each environment read the password once and kept it. When the secret rotated, every warm environment was still using the old one.',
      q: /Secrets Manager|AWSCURRENT|AWSPREVIOUS|rotation|Parameters and Secrets|secret cach/i },
    pass: { name: 'The Forged Pass', cause: 'gate', lead: 'seoyeon', path: 'sync', auth: true,
      says: 'Same customer, same token. One door opens, the next one doesn\'t.',
      setup: v => ({ bucket: [40, 40], auth: true, arrivals: t => (t < D.TICKS ? Array.from({ length: 4 }, (_, i) => { const n = t * 4 + i + (v.k % 2) * 6;
        return R(`p${t}-${i}`, { cust: 'c' + (n % 6), token: 'tok-c' + (n % 6), meth: Math.floor(n / 6) % 2 ? 'POST' : 'GET' }); }).concat([R(`a${t}`, { client: 'bot', cust: 'anon' })]) : []) }),
      break: () => {},
      ok: m => m.forbidden === 0, fix: [['authwild'], ['ttl0']], lazy: [['ttl3600'], ['fninvoke'], ['reserved'], ['plan']],
      hidden: 'The authorizer allowed only the method each token called first, and API Gateway cached that policy for 5 minutes, so the token\'s next call to another method got 403.',
      q: /authorizer|Cognito|execute-api|401|403|Unauthorized|Forbidden/i },
    shelf: { name: 'The Stale Shelf', cause: 'store', lead: 'dutch', path: 'sync', reads: true,
      says: 'We wrote it. We read it. It wasn\'t there. Then it was.',
      setup: v => ({ bucket: [40, 40], reads: true, arrivals: steady(4 + (v.k % 2)) }),
      break: () => {},
      ok: m => m.stale === 0, fix: [['consread']], lazy: [['daxnode'], ['wcu'], ['gsiread'], ['reserved'], ['cond']],
      hidden: 'The function read each order back right after writing it, with an eventually consistent read through DAX, so some reads didn\'t see the write yet.',
      q: /ConsistentRead|strongly consistent|eventually consistent|read-after-write|\bDAX\b/i },
    cache: { name: 'The Old Price', cause: 'store', lead: 'dutch', path: 'sync', cache: true,
      stations: { store: { svc: 'ElastiCache' } },
      says: 'The prices changed at noon. The shop is still quoting this morning\'s.',
      // reads: price lookups, 4 a tick over 8 products. The shop's orders go on as usual (3 a tick).
      setup: v => ({ bucket: [40, 40], cache: { prods: 8, cap: 28, upd: 7 + (v.k % 2) },
        arrivals: t => (t < D.TICKS ? Array.from({ length: 4 }, (_, i) => R(`r${t}-${i}`, { read: 'p' + ((2 * t + i + v.k) % 8) })).concat(steady(3)(t)) : []) }),
      break: () => {},
      ok: m => m.cstale === 0 && m.evictions === 0 && m.misses * 2 <= m.reads,
      fix: [['cachewt', 'cttl60']], lazy: [['cttl60'], ['cttl10'], ['cachewt'], ['cachewt', 'cttl10'], ['cachewt', 'cttl3600'], ['flush'], ['replica'], ['consread'], ['reserved']],
      hidden: 'The cache used lazy loading with no TTL, so once a price was cached nothing ever refreshed it. Write-through alone would have filled it with orders nobody reads.',
      q: /ElastiCache|lazy loading|write-through|cache churn|cache-aside/i },
    upload: { name: 'The Half Upload', cause: 'fn', lead: 'kai', path: 'sync', upload: true,
      stations: { store: { name: 'The Bucket', svc: 'S3' } },
      says: 'The big videos start uploading fine. They just never finish.',
      // One 8 GB video upload a tick, in 8 parts of 1 GB, one part a tick from the caller's phone. The function's role
      // credentials, which sign the URLs, expire at credAt (the game's number; Lambda gives later calls fresh ones).
      setup: v => ({ bucket: [40, 40], upload: { parts: 8, credAt: 4 + (v.k % 2) }, arrivals: t => (t < D.TICKS ? [R(`u${t}`, { up: true })] : []) }),
      break: () => {},
      ok: m => m.upFail === 0 && !m.userKey && !m.pubPut,
      fix: [['demand'], ['demand', 'lifecycle']], lazy: [['exp900'], ['exp7d'], ['lifecycle'], ['userkey'], ['exp900', 'userkey'], ['publicput'], ['reserved'], ['to120']],
      hidden: 'The function signed all of a video\'s part URLs at the start. Late parts outlived the URL\'s 60 seconds, and parts sent after the role\'s credentials expired failed whatever ExpiresIn said.',
      q: /presigned|pre-signed|multipart upload/i },
    quota: { name: 'The Shared Key', cause: 'gate', lead: 'seoyeon', path: 'sync', keys: true,
      says: 'The partner\'s nightly sync started early. Now the shop can\'t get in either.',
      setup: v => ({ bucket: [40, 40], keys: true, arrivals: both(steady(3, { client: 'shop' }), t => (t < D.TICKS ? Array.from({ length: 3 + (v.k % 2) }, (_, i) => R(`n${t}-${i}`, { client: 'partner' })) : [])) }),
      break: () => {},
      ok: m => m.shopLimited === 0 && !m.quotaRaised, fix: [['keysplit']], lazy: [['quotaup'], ['stagerate'], ['plan'], ['immediate'], ['reserved']],
      hidden: 'The shop\'s app and the partner sent the same API key, so they shared one quota. The partner spent it, and then everyone on the key got 429.',
      q: /usage plan|API key|quota/i },
    receipt: { name: 'The Wrong Receipt', cause: 'gate', lead: 'seoyeon', path: 'sync', gcache: true,
      says: 'Fast answers all night. Some of them were somebody else\'s.',
      setup: v => ({ bucket: [40, 40], gcache: true, warm: 'c' + ((v.k + 3) % 6), arrivals: steady(4) }),
      break: () => {},
      ok: m => m.leaked === 0 && !m.cacheOff, fix: [['ckey']], lazy: [['gttl0'], ['gflush'], ['maxage'], ['gttl3600'], ['reserved']],
      hidden: 'GET /orders was cached without customerId in its cache key, so every customer got whichever customer\'s orders were cached first.',
      q: /cache key|stage cache|API Gateway cach|caching .*API Gateway|InvalidateCache|max-age=0/i },
    cold: { name: 'Cold Open', cause: 'fn', lead: 'kai', path: 'sync',
      says: 'Quiet, quiet, then everyone at once.',
      setup: v => ({ bucket: [40, 40], cold: true, arrivals: t => (t % 4 === 0 ? Array.from({ length: 5 + (v.k % 2) }, (_, i) => R(`c${t}-${i}`)) : []) }),
      break: () => {},
      ok: m => m.slow === 0, fix: [['prov']], lazy: [['reserved'], ['to120'], ['provlatest']],
      hidden: 'Every burst found its environments reclaimed, so each request waited for a cold start.',
      q: /cold start|provisioned concurrency|init(ialization)? (duration|latency)|SnapStart/i },
    // visLine: the Queue's visibility timeout is a timeline you drag (js/mode-drill.js), and the drill holds you to
    // AWS's rule: at least 6x the function's timeout (m.visShort). A window that only clears tonight's work stops
    // the duplicates but isn't signed off: the margin is for a batch Lambda retries after a throttle.
    fuse: { name: 'Short Fuse', cause: 'queue+fn', lead: 'mira', path: 'async', visLine: true,
      says: 'Some orders are going through twice.',
      work: v => 40 + 10 * (v.k % 2),
      setup: v => ({ arrivals: steady(2, { work: DR.fuse.work(v) }) }),
      break: c => { c.queue.on = true; c.queue.vis = 30; c.fn.timeout = 60; },
      ok: m => m.dupes === 0 && m.condBlocked === 0 && m.timeouts === 0 && m.left === 0 && !m.visShort, fix: [['vis360']], lazy: [['vis60'], ['vis120'], ['to120'], ['to30'], ['cond'], ['to120', 'vis360']],
      hidden: 'The queue\'s visibility timeout was shorter than the work, so messages came back while still being worked.',
      q: /visibility timeout|received (more than once|twice)|duplicate|six times|6x/i },
    poison: { name: 'The Poison Batch', cause: 'queue+fn', lead: 'kai', path: 'async',
      says: 'One order in there will never go through.',
      setup: v => ({ arrivals: t => steady(2)(t).concat(t === 1 + (v.k % 3) ? [R('bad', { poison: true })] : []) }),
      break: c => { c.queue.on = true; c.queue.vis = 30; c.fn.timeout = 30; c.fn.batch = 3; },
      ok: m => m.dupes === 0 && m.goodParked === 0 && m.poisonLoose === 0 && m.lost === 0, fix: [['partial', 'dlq']], lazy: [['dlq'], ['partial'], ['purge'], ['vis360']],
      hidden: 'One message always failed. With no partial batch response its batch came back whole, and with no DLQ it never stopped.',
      q: /ReportBatchItemFailures|partial batch|dead-letter|\bDLQ\b|maxReceiveCount|poison/i },
    single: { name: 'Single File', cause: 'queue', lead: 'mira', path: 'async',
      says: 'Orders keep their order. All of them. In one line.',
      setup: v => ({ arrivals: steady(3 + (v.k % 2), { work: 10 }) }),
      break: c => { c.queue.on = true; c.queue.fifo = true; c.queue.groups = 'one'; c.queue.vis = 120; },
      ok: m => m.maxAge <= 30 && m.left === 0, fix: [['groups']], lazy: [['reserved'], ['b3'], ['vis360']],
      hidden: 'Every message had the same group ID, so the function could only ever work one batch at a time.',
      q: /FIFO|message group|MessageGroupId|ApproximateAgeOfOldestMessage/i },
    stampede: { name: 'The Stampede Stream', cause: 'queue+fn', lead: 'mira', path: 'async', stream: true,
      stations: { queue: { name: 'The Stream', svc: 'Kinesis' } },
      says: 'Everything\'s in order. That\'s the problem.',
      setup: v => ({ arrivals: t => (t === 1 + (v.k % 3) ? [R('bad', { poison: true })] : []).concat(steady(2, { work: 10 })(t)) }),
      break: c => { c.queue.on = true; c.fn.batch = 3; c.fn.cond = true; },
      ok: m => m.lost === 0 && m.goodParked === 0 && m.poisonLoose === 0 && m.poisonDropped === 0 && m.left === 0,
      fix: [['bisect', 'retry2', 'onfail']], lazy: [['retry2', 'onfail'], ['bisect', 'retry2'], ['bisect'], ['partial', 'retry2', 'onfail'], ['b1', 'retry2', 'onfail'], ['reserved']],
      hidden: 'One record always failed. A stream keeps its order, so Lambda retried that batch forever and nothing behind it moved.',
      q: /Kinesis|DynamoDB Streams?|BisectBatchOnFunctionError|MaximumRetryAttempts|on-failure destination|IteratorAge|shard/i },
    quiet: { name: 'The Quiet Subscriber', cause: 'queue', lead: 'mira', path: 'sync', hub: 'sns', sns: true,
      stations: { queue: { name: 'The Topic', svc: 'SNS' } },
      says: 'Every order went out. Shipping says nothing came in.',
      setup: v => ({ bucket: [40, 40], arrivals: t => (t < D.TICKS ? Array.from({ length: 4 }, (_, i) => R(`s${t}-${i}`, { cust: 'c' + ((t * 4 + i) % 6), kind: (t * 4 + i + v.k) % 3 === 0 ? 'pickup' : 'ship' })) : []) }),
      break: () => {},
      ok: m => m.filtered === 0 && m.misrouted === 0, fix: [['snsattr'], ['scopebody']], lazy: [['nofilter'], ['subdlq'], ['reserved'], ['to120']],
      hidden: 'The shipping subscription\'s filter policy read message attributes, the default, but the Gate put order_type only in the message body, so no order matched.',
      q: /filter polic|FilterPolicyScope|message attribute|SNS.*(fan[- ]?out|subscri)|NumberOfNotificationsFilteredOut/i },
    catch: { name: 'The Dropped Catch', cause: 'queue', lead: 'kai', path: 'sync', hub: 'sfn', sfn: true,
      stations: { queue: { name: 'The Workflow', svc: 'Step Functions' } },
      says: 'Half the failures should have retried. The other half should never have.',
      setup: v => ({ bucket: [40, 40], arrivals: t => (t < D.TICKS ? Array.from({ length: 4 }, (_, i) => { const n = t * 4 + i;
        return R(`w${t}-${i}`, { cust: 'c' + (n % 6), flaky: (n + v.k) % 5 === 1, declined: (n + v.k) % 7 === 3 }); }) : []) }),
      break: () => {},
      ok: m => m.lost === 0 && m.stuck === 0 && m.recharged === 0, fix: [['rtrans', 'catchrp']],
      lazy: [['rall', 'catchrp'], ['rtrans'], ['catchrp'], ['rtrans', 'catchno'], ['rall'], ['reserved'], ['to120']],
      hidden: 'The Charge task had no retrier, so Lambda\'s passing throttles failed good orders, and no catcher, so a declined card failed the execution with the stock still held.',
      q: /Step Functions|state machine|States\.ALL|ErrorEquals|ResultPath|Retry.*Catch|Catch.*Retry|MaxAttempts|BackoffRate/i },
    midnight: { name: 'The Midnight Batch', boss: true, cause: 'queue+fn', lead: 'mira', path: 'async',
      says: 'One line, and one bad order at the front of it.',
      setup: v => ({ arrivals: t => steady(2, { work: 20 })(t).concat(t === 1 + (v.k % 2) ? [R('bad', { poison: true, cust: 'c1' })] : []) }),
      break: c => { c.queue.on = true; c.queue.fifo = true; c.queue.groups = 'one'; c.queue.vis = 30; c.fn.timeout = 30; c.fn.batch = 1; },
      ok: m => m.dupes === 0 && m.poisonLoose === 0 && m.goodParked === 0 && m.lost === 0 && m.left === 0,
      fix: [['groups', 'dlqfifo']], lazy: [['groups'], ['dlqfifo'], ['reserved', 'vis360']],
      hidden: 'Every message shared one group, so the function worked one at a time, and the poison message blocked the group behind it.',
      q: /FIFO|message group|MessageGroupId|dead-letter|\bDLQ\b/i }
  };
  const DR = D.DRILLS;

  // ---- The night: two floors of two drills and a boss. Night 1 is one path; later nights fork (L7). ----
  D.ROWS = [['storm', 'cold', 'pass', 'quota'], ['hot', 'locked', 'shelf', 'cache'], ['badge', 'canary', 'vault', 'upload'], ['herd'], ['fuse', 'single', 'quiet', 'receipt'], ['poison', 'stampede', 'catch'], ['midnight']];
  D.choices = (night, row) => (night <= 1 ? D.ROWS[row].slice(0, 1) : D.ROWS[row].slice());

  // ---- One run ----
  // Returns { m: counts and metrics, lines: the pager, nodes: trace map status per station }.
  D.run = function (drill, cfg, v) {
    const d = DR[drill], set = d.setup(v || { k: 0 }), path = d.path;
    const gate = AS.gateBucket(...(set.bucket || [40, 40]));
    const m = { req: 0, ok: 0, gaveUp: 0, shopGaveUp: 0, throttles429: 0, fault5xx: 0, error4xx: 0, hot: 0, over: 0, denied: 0, slow: 0, dupes: 0, condBlocked: 0,
      timeouts: 0, errors: 0, invocations: 0, maxConc: 0, maxDur: 0, sent: 0, received: 0, deleted: 0, maxAge: 0, left: 0, parked: 0, goodParked: 0,
      poisonLoose: 0, lost: 0, purged: 0, wcuUsed: 0, latency: 0, adminUsed: !!cfg.fn.admin, iamDenied: 0, wideUsed: !!cfg.fn.wide,
      v2: 0, v2Fail: 0, shifted: 0, stopped: 0, hookFailed: 0, lateAlarm: 0,
      authFail: 0, secretCalls: 0, refetched: 0, rotated: 0, perCall: !!(set.rotate != null && cfg.fn.sec === 'call'), rotOff: !!(set.rotate != null && cfg.store.rot === 'off'),
      poisonParked: 0, poisonDropped: 0, splits: 0, gaveUpBatches: 0, forbidden: 0, unauth: 0, authCalls: 0, forbidPost: 0, stale: 0, rcu: 0,
      limit429: 0, shopLimited: 0, quotaAt: 0, quotaRaised: !!(set.keys && cfg.gate.quota > 50), ghits: 0, gmisses: 0, leaked: 0, cacheWarn: 0, cacheOff: !!(set.gcache && cfg.gate.gttl === 0),
      reads: 0, hits: 0, misses: 0, cstale: 0, evictions: 0, cacheMax: 0, flushed: 0,
      uploads: 0, upDone: 0, upFail: 0, up403: 0, upToken: 0, parts: 0, signed: 0, orphans: 0, userKey: !!(set.upload && cfg.up.userKey), pubPut: !!(set.upload && cfg.up.pub),
      visShort: !!(d.visLine && cfg.queue.vis < 6 * cfg.fn.timeout),
      published: 0, delivered: 0, filteredOut: 0, noAttr: 0, filtered: 0, misrouted: 0,
      started: 0, succeeded: 0, execFailed: 0, fnThrottled: 0, retried: 0, declines: 0, recharged: 0, stuck: 0, released: 0, releaseFailed: 0 };
    const written = {}, retries = [], envs = [];   // envs: { busy: tick until, last: tick last used, prov }
    const q = { items: [], dlq: [] };               // { r, vis (tick visible from), recv, sentAt, inflight }
    for (let i = 0; i < (cfg.fn.prov | 0); i++) envs.push({ busy: -1, last: -1, prov: true });
    const REAP = 3;                                  // ticks an idle environment stays warm (the game's number)
    const pool = cfg.fn.reserved != null ? cfg.fn.reserved : 10;
    const kmsOk = !cfg.store.kms || AS.kmsAllows(cfg.store.keyPolicy, cfg.fn.kms || cfg.fn.admin);
    const putOk = AS.iamAllows(cfg.fn.admin ? ['*'] : cfg.fn.iam, 'dynamodb:PutItem');
    // The release: at set.release CodeDeploy starts moving the alias live to version 2, which fails every order.
    // rel.w: version 2's share of live's traffic. rel.state: null, 'shifting' (the deployment is running), 'done', 'stopped'.
    const rel = { w: 0, state: null, n: 0, at: set.release };
    // The secret: the ledger database's password, rotated at set.rotate. ver: the current version; valid: versions the
    // database still accepts (single user: only the current one; alternating users: the previous one too).
    const sec = { ver: 1, valid: [1] };
    // The Lambda authorizer: its answer per token, cached for cfg.gate.ttl seconds. It allows the method called
    // (scoped to event.methodArn) or, with wild, the whole stage. A request with no token never reaches it: 401.
    const authCache = {};
    const authorize = (r, t) => {
      if (!r.token) { m.unauth++; return false; }
      let c = authCache[r.token];
      if (!c || t >= c.exp) { m.authCalls++; c = { res: cfg.gate.wild ? '*' : r.meth, exp: t + Math.ceil(cfg.gate.ttl / D.TICK_S) }; if (cfg.gate.ttl > 0) authCache[r.token] = c; }
      if (c.res === '*' || c.res === r.meth) return true;
      m.forbidden++; if (r.meth === 'POST') m.forbidPost++; return false;
    };
    // Usage plan quotas, per API key (The Shared Key): requests the plan has let through so far tonight. A run is the
    // game's day. A request over its key's quota gets 429 (QUOTA_EXCEEDED) before any throttling.
    const used = {};
    const keyOf = r => (cfg.gate.split && r.client === 'partner' ? 'partner-key' : 'app-key');
    // The stage cache (The Wrong Receipt): GET /orders?customerId=..., cached by its cache key for cfg.gate.gttl
    // seconds. Without customerId in the key, every customer shares one entry. It starts warm with an earlier
    // customer's answer, unless flushed.
    const gcache = {};
    if (set.gcache && cfg.gate.gttl > 0 && !cfg.gate.gflush) gcache['GET /orders'] = { cust: set.warm, exp: D.TICKS + D.DRAIN };
    const gcached = (r, t) => {
      const ck = cfg.gate.ckey ? 'GET /orders?customerId=' + r.cust : 'GET /orders', e = gcache[ck];
      if (cfg.gate.maxage) m.cacheWarn++;   // the header is ignored: these callers may not invalidate
      if (cfg.gate.gttl > 0 && e && t < e.exp) { m.ghits++; m.latency = Math.max(m.latency, 40); if (e.cust !== r.cust) m.leaked++; else m.ok++; return; }
      m.gmisses++; m.invocations++; m.ok++; m.latency = Math.max(m.latency, 600);
      m.maxConc = Math.max(m.maxConc, 1);
      if (cfg.gate.gttl > 0) gcache[ck] = { cust: r.cust, exp: t + Math.ceil(cfg.gate.gttl / D.TICK_S) };
    };
    // A write to the Store: returns 'ok', 'dupe', 'blocked', 'hot', 'over' or 'denied'.
    let tickWrites = [];
    const write = (r) => {
      if (!putOk) { m.iamDenied++; return 'denied'; }
      if (!kmsOk) { m.denied++; return 'denied'; }
      const part = AS.partitionOf(cfg.store.key === 'status' ? 'status' : 'spread', tickWrites.length, D.PARTS);
      tickWrites.push({ id: r.id, part });
      const res = AS.writeTick(tickWrites, D.PER_PART, cfg.store.wcu);
      if (res.hot.includes(r.id)) { tickWrites.pop(); m.hot++; return 'hot'; }
      if (res.over.includes(r.id)) { tickWrites.pop(); m.over++; return 'over'; }
      m.wcuUsed++;
      if (written[r.id]) { if (cfg.fn.cond) { m.condBlocked++; return 'blocked'; } m.dupes++; return 'dupe'; }
      written[r.id] = 1; return 'ok';
    };
    // The cache (The Old Price): key -> { ver, exp (tick it expires at), used (tick last read or set) }. Full at cap
    // keys; the cluster's maxmemory-policy here is allkeys-lru, so the least recently used key is evicted to make room.
    // The prices change at cc.upd (a job writes them to the table). Starts warm: every product cached, at version 1.
    const cc = set.cache, cache = new Map(), price = { ver: 1 };
    const ttlT = cfg.cache.ttl ? Math.ceil(cfg.cache.ttl / D.TICK_S) : Infinity;
    const cset = (k, ver, t) => {
      if (!cache.has(k) && cache.size >= cc.cap) { let lk = null, lu = Infinity; cache.forEach((e, key) => { if (e.used < lu) { lu = e.used; lk = key; } }); cache.delete(lk); m.evictions++; }
      cache.set(k, { ver, exp: t + ttlT, used: t }); m.cacheMax = Math.max(m.cacheMax, cache.size);
    };
    if (cc) for (let i = 0; i < cc.prods; i++) cset('p' + i, 1, -1);
    const cacheRead = (r, t) => {
      m.reads++;
      const e = cache.get(r.read);
      if (e && t < e.exp) { e.used = t; m.hits++; if (e.ver < price.ver) m.cstale++; else m.ok++; return; }
      m.misses++; m.rcu++; cset(r.read, price.ver, t); m.ok++;
    };
    // The uploads (The Half Upload): each caller asks the function for URLs, then sends part i at tick start + i,
    // straight to S3. S3 checks a URL when each request starts: past ExpiresIn, or past the signing credentials' expiry,
    // it's refused, and the caller gives up, leaving an incomplete multipart upload.
    const ups = [];
    const credExp = t => (cfg.up.userKey ? Infinity : t < set.upload.credAt ? set.upload.credAt : Infinity);
    const uploadStart = (r, t) => {
      m.uploads++;
      const P = set.upload.parts;
      if (cfg.up.demand) m.signed++; else m.signed += P;
      ups.push({ start: t, next: 0, P, dead: false });
    };
    const uploadTick = t => {
      ups.forEach(u => {
        if (u.dead || u.next >= u.P || t < u.start + u.next) return;
        const sentAt = t, signedAt = cfg.up.demand ? t : u.start;
        if (cfg.up.demand && u.next > 0) { m.signed++; m.invocations++; }
        m.parts++;
        if (!cfg.up.pub) {
          if (sentAt >= credExp(signedAt)) { m.upToken++; u.dead = true; }
          else if ((sentAt - signedAt) * D.TICK_S >= cfg.up.exp) { m.up403++; u.dead = true; }
        }
        if (u.dead) { m.upFail++; m.orphans++; return; }
        u.next++;
        if (u.next >= u.P) m.upDone++;
      });
    };
    const sync = (r, t) => {
      if (set.gcache) return gcached(r, t);
      if (set.auth && !authorize(r, t)) return;
      // The topic (The Quiet Subscriber): the Gate publishes each order, and the caller gets the Publish's 200 at once.
      // The shipping subscription's filter policy, { "order_type": ["ship"] }, decides what reaches the function.
      if (d.hub === 'sns') {
        m.published++; m.ok++;
        let go;
        if (!cfg.topic.filter) go = true;
        else if (cfg.topic.scope === 'body' || cfg.gate.snsattr) go = r.kind === 'ship';
        else { go = false; m.noAttr++; }
        if (!go) { m.filteredOut++; if (r.kind === 'ship') m.filtered++; return; }
        m.delivered++; if (r.kind !== 'ship') m.misrouted++;
      }
      // The state machine (The Dropped Catch): StartExecution answers at once; the Charge task invokes the function.
      if (d.hub === 'sfn') { m.started++; m.ok++; }
      // A warm environment if one is free (provisioned ones never go cold), else a new one: a cold start.
      let e = envs.find(x => x.busy !== t && (x.prov || (x.last >= 0 && t - x.last <= REAP)));
      let cold = false;
      if (!e) {
        for (let i = envs.length - 1; i >= 0; i--) if (!envs[i].prov && envs[i].busy !== t && t - envs[i].last > REAP) envs.splice(i, 1);
        if (envs.filter(x => x.busy === t).length >= pool) { m.fault5xx++; m.throttlesFn = (m.throttlesFn | 0) + 1; return; }
        e = { busy: -1, last: -1, prov: false }; envs.push(e); cold = true;
      }
      if (set.rotate != null && (cold || e.key == null)) { e.key = sec.ver; e.keyAt = t; m.secretCalls++; }
      e.busy = t; e.last = t; m.invocations++;
      m.maxConc = Math.max(m.maxConc, envs.filter(x => x.busy === t).length);
      if (cold && set.cold) { m.slow++; m.latency = Math.max(m.latency, 3000); } else m.latency = Math.max(m.latency, 120);
      // The alias's weighted routing: the share of requests the new version gets, spread evenly.
      if (rel.w > 0) {
        const to2 = Math.floor((rel.n + 1) * rel.w + 1e-9) > Math.floor(rel.n * rel.w + 1e-9); rel.n++;
        if (to2) { m.v2++; m.v2Fail++; m.errors++; m.fault5xx++; return; }
      }
      // The ledger login with this environment's copy of the password.
      if (set.rotate != null) {
        if (cfg.fn.sec === 'call') { e.key = sec.ver; m.secretCalls++; }
        else if (cfg.fn.sec === 'ttl' && (t - e.keyAt) * D.TICK_S >= 300) { e.key = sec.ver; e.keyAt = t; m.secretCalls++; }
        if (!sec.valid.includes(e.key)) {
          if (cfg.fn.refetch) { e.key = sec.ver; e.keyAt = t; m.secretCalls++; m.refetched++; }
          else { m.authFail++; m.errors++; m.fault5xx++; return; }
        }
      }
      if (r.read) { cacheRead(r, t); return; }
      if (r.up) { uploadStart(r, t); m.ok++; return; }
      // Charge's errors and how the state machine handles them. A flaky order's first invocation is throttled
      // (Lambda.TooManyRequestsException); a declined card throws CardDeclined every time.
      if (d.hub === 'sfn') {
        const retr = cfg.flow.retry;
        if (r.flaky) {
          m.fnThrottled++;
          if (retr === 'none') { m.execFailed++; m.lost++; return; }
          m.retried++; m.invocations++;
        }
        if (r.declined) {
          m.declines++; m.errors++;
          if (retr === 'all') { m.recharged++; m.retried += 3; m.invocations += 3; m.errors += 3; }
          if (cfg.flow.catch === 'rp') { m.released++; m.succeeded++; return; }
          if (cfg.flow.catch === 'norp') m.releaseFailed++;
          m.execFailed++; m.stuck++; return;
        }
      }
      const w = write(r);
      if (d.hub === 'sfn' && w === 'ok') m.succeeded++;
      if (w !== 'ok' && w !== 'blocked') { m.errors++; m.fault5xx++; return; }
      if (cc && cfg.cache.wt) cset('order:' + r.id, 1, t);
      // Reading the order straight back (The Stale Shelf). Through DAX, eventually consistent: a read this soon after
      // the write misses it about one time in three (the game's number). ConsistentRead goes to the table and sees it.
      if (set.reads) {
        if (cfg.store.consistent) m.rcu += 2; else { m.rcu += 1; if (AS.hash(r.id + ':read') % 3 === 0) { m.stale++; return; } }
      }
      m.ok++;
    };
    // One tick of the deployment, before the tick's requests. The alarm (Errors > 0 on live) goes off the tick after
    // an error; CodeDeploy acts on it only while the deployment is still running (the game's timing: a real alarm
    // evaluates over periods of a minute or more).
    const releaseTick = t => {
      if (rel.state === 'shifting' && cfg.fn.alarm && m.v2Fail) { rel.state = 'stopped'; rel.w = 0; m.stopped++; return; }
      if (rel.state === 'done' && cfg.fn.alarm && m.v2Fail && !m.lateAlarm) m.lateAlarm++;
      if (t === rel.at) {
        if (cfg.fn.hook) { m.hookFailed++; m.stopped++; rel.state = 'stopped'; return; }
        m.shifted++;
        rel.state = cfg.fn.shift === 'all' ? 'done' : 'shifting';
        rel.w = AS.shiftWeight(cfg.fn.shift, 0);
      } else if (rel.state === 'shifting') rel.w = AS.shiftWeight(cfg.fn.shift, (t - rel.at) * D.TICK_S);
      if (rel.state === 'shifting' && rel.w >= 1) rel.state = 'done';
    };
    // A stream shard (The Stampede Stream): records in order, one batch out at a time (ParallelizationFactor 1). A
    // failed batch is retried from the same place, so nothing behind it moves, until it succeeds, is bisected, or runs
    // out of retries (MaximumRetryAttempts; the default -1 retries until the record expires). The game doesn't count
    // a split as a retry. sh.pending: batches waiting to be retried, the first one next.
    const sh = { pending: [], attempts: 0, busyUntil: -1 };
    const drop = x => { const k = q.items.indexOf(x); if (k >= 0) q.items.splice(k, 1); };
    const streamTick = t => {
      if (t < sh.busyUntil) return;
      if (!sh.pending.length) { const next = q.items.filter(x => !x.claimed).slice(0, cfg.fn.batch); if (!next.length) return; next.forEach(x => { x.claimed = true; }); sh.pending.push(next); }
      const cur = sh.pending[0];
      m.invocations++; m.received += cur.length; sh.busyUntil = t + 1; m.maxConc = Math.max(m.maxConc, 1); m.maxDur = Math.max(m.maxDur, cur.length * 2);
      let failAt = -1;
      for (let i = 0; i < cur.length; i++) { if (cur[i].r.poison) { failAt = i; break; } write(cur[i].r); }
      if (failAt < 0) { cur.forEach(x => { drop(x); m.deleted++; }); sh.pending.shift(); sh.attempts = 0; return; }
      m.errors++;
      let rest = cur;
      // ReportBatchItemFailures: the records before the failed one are checkpointed; the retry starts at it.
      if (cfg.fn.partial) { cur.slice(0, failAt).forEach(x => { drop(x); m.deleted++; }); rest = cur.slice(failAt); }
      if (cfg.stream.bisect && rest.length > 1) { const h = Math.ceil(rest.length / 2); sh.pending.splice(0, 1, rest.slice(0, h), rest.slice(h)); m.splits++; sh.attempts = 0; return; }
      sh.pending[0] = rest;
      sh.attempts++;
      if (cfg.stream.retries != null && sh.attempts > cfg.stream.retries) {
        sh.pending.shift(); sh.attempts = 0; m.gaveUpBatches++;
        rest.forEach(x => {
          drop(x);
          if (cfg.stream.onfail) { m.parked++; q.dlq.push(x); if (x.r.poison) m.poisonParked++; else m.goodParked++; } else if (x.r.poison) m.poisonDropped++; else m.lost++;
        });
      }
    };
    const inflight = [];   // { end, items: [msg], fail: bool }
    const groupOf = r => (cfg.queue.fifo ? (cfg.queue.groups === 'customer' ? r.cust : 'all') : null);
    const last = D.TICKS + D.DRAIN;
    // Frames for the board's playback (js/mode-drill.js): per tick, what changed and what each station holds.
    const frames = [];
    let before = Object.assign({}, m);
    const snap = t => {
      const d = {};
      Object.keys(m).forEach(k => { if (typeof m[k] === 'number' && m[k] !== before[k]) d[k] = m[k] - before[k]; });
      const parts = [0, 0, 0]; tickWrites.forEach(w => { parts[w.part] = (parts[w.part] | 0) + 1; });
      frames.push({ t, d, tokens: Math.max(0, Math.floor(gate.tokens)), burst: gate.burst, retry: retries.length,
        qv: q.items.filter(x => x.vis <= t).length, qh: q.items.filter(x => x.vis > t).length, dlq: q.dlq.length, infl: inflight.length,
        busy: path === 'sync' ? envs.filter(x => x.busy === t).length : inflight.length, warm: envs.length, parts });
      before = Object.assign({}, m);
    };
    for (let t = 0; t < last; t++) {
      tickWrites = [];
      AS.gateRefill(gate);
      if (rel.at != null) releaseTick(t);
      if (cc) {
        cache.forEach((e, k) => { if (t >= e.exp) cache.delete(k); });
        if (cfg.cache.flush && t === 2) { m.flushed = cache.size; cache.clear(); }
        if (t === cc.upd) { price.ver++; if (cfg.cache.wt) for (let i = 0; i < cc.prods; i++) cset('p' + i, price.ver, t); }
      }
      if (set.upload) uploadTick(t);
      if (t === set.rotate && cfg.store.rot !== 'off') { sec.ver++; sec.valid = cfg.store.rot === 'alt' ? [sec.ver, sec.ver - 1] : [sec.ver]; m.rotated = t * D.TICK_S || 1; }
      // Arrivals and due retries, interleaved by client so no client always goes first.
      const now = (t < D.TICKS ? set.arrivals(t) : []).map(r => ({ r, att: 1 }));
      now.forEach(() => m.req++);
      const due = retries.filter(x => x.at === t); due.forEach(x => retries.splice(retries.indexOf(x), 1));
      // Retries land first (they were already waiting), then the new arrivals, alternating between clients.
      const mix = list => { const by = {}; list.forEach(x => { (by[x.r.client] = by[x.r.client] || []).push(x); }); const ks = Object.keys(by).sort(), out = []; for (let i = 0; out.length < list.length; i++) ks.forEach(k => { if (by[k][i]) out.push(by[k][i]); }); return out; };
      const all = mix(due).concat(mix(now));
      const perClient = {};
      all.forEach(x => {
        const r = x.r;
        perClient[r.client] = (perClient[r.client] | 0) + 1;
        const planned = cfg.gate.plan && r.client === 'batch' && perClient.batch > 2;
        const overQuota = set.keys && (used[keyOf(r)] | 0) >= cfg.gate.quota;
        if (overQuota) { m.limit429++; if (r.client === 'shop') m.shopLimited++; if (!m.quotaAt) m.quotaAt = t * D.TICK_S || 1; }
        else if (set.keys) used[keyOf(r)] = (used[keyOf(r)] | 0) + 1;
        if (overQuota || planned || !AS.gateTake(gate)) {
          m.throttles429++;
          if (x.att < D.ATTEMPTS) retries.push({ r, att: x.att + 1, at: t + AS.retryDelay(x.att, cfg.gate.retry === 'backoff', r.id) });
          else { m.gaveUp++; if (r.client !== 'batch') m.shopGaveUp++; }
          return;
        }
        if (path === 'sync') sync(r, t);
        else { q.items.push({ r, vis: t, recv: 0, sentAt: t }); m.sent++; }
      });
      if (path !== 'async') { snap(t); continue; }
      if (d.stream) { streamTick(t); q.items.forEach(x => { m.maxAge = Math.max(m.maxAge, (t - x.sentAt) * D.TICK_S); }); snap(t); continue; }
      // Finish batches that end this tick.
      for (let i = inflight.length - 1; i >= 0; i--) {
        const b = inflight[i];
        if (b.end !== t) continue;
        inflight.splice(i, 1);
        b.done.forEach(msg => { const k = q.items.indexOf(msg); if (k >= 0) { q.items.splice(k, 1); m.deleted++; } });
      }
      // Purge (once, after the first arrivals): every waiting message is deleted, good ones too.
      if (cfg.queue.purge && t === 2) { const n = q.items.filter(x => x.vis <= t).length; m.purged += n; m.lost += n; q.items = q.items.filter(x => x.vis > t); }
      // Poll: free slots receive batches of visible messages.
      // FIFO: a group with a message still hidden is locked, so only one batch per group is out at a time (AS.pollCap).
      let free = AS.pollCap(cfg.fn.reserved, pool, false, 0) - inflight.length;
      const lockedG = new Set();
      if (cfg.queue.fifo) q.items.forEach(x => { if (x.vis > t) lockedG.add(groupOf(x.r)); });
      while (free > 0) {
        let pick;
        if (cfg.queue.fifo) {
          const g = q.items.map(x => groupOf(x.r)).find(gr => !lockedG.has(gr));
          if (g == null) break;
          pick = q.items.filter(x => groupOf(x.r) === g).slice(0, cfg.fn.batch);
          lockedG.add(g);
        } else pick = q.items.filter(x => x.vis <= t).slice(0, cfg.fn.batch);
        if (!pick.length) break;
        // maxReceiveCount: a message received 3 times already moves to the DLQ instead of being received again.
        if (cfg.queue.dlq) {
          const gone = pick.filter(x => x.recv >= 3);
          gone.forEach(x => { q.items.splice(q.items.indexOf(x), 1); q.dlq.push(x); m.parked++; if (!x.r.poison) m.goodParked++; });
          pick = pick.filter(x => x.recv < 3);
          if (!pick.length) continue;
        }
        free--;
        const visT = Math.max(1, Math.ceil(cfg.queue.vis / D.TICK_S));
        pick.forEach(x => { x.recv++; m.received++; x.vis = t + visT; m.maxAge = Math.max(m.maxAge, (t - x.sentAt) * D.TICK_S); });
        m.invocations++;
        // Work the batch in order: each message's write lands when its work is done, unless the function times out first.
        let el = 0, failed = false, timedOut = false;
        const done = [];
        for (const x of pick) {
          if (failed && !cfg.fn.partial) break;
          if (x.r.poison) { failed = true; continue; }
          if (el + x.r.work > cfg.fn.timeout) { timedOut = true; break; }
          el += x.r.work;
          const w = write(x.r);
          if (w === 'ok' || w === 'blocked' || w === 'dupe') done.push(x); else failed = true;
        }
        if (timedOut) { m.timeouts++; m.errors++; el = cfg.fn.timeout; } else if (failed) m.errors++;
        m.maxDur = Math.max(m.maxDur, el);
        // Without ReportBatchItemFailures, any failure returns the whole batch: nothing is deleted.
        const del = timedOut || (failed && !cfg.fn.partial) ? [] : done;
        inflight.push({ end: t + Math.max(1, Math.ceil(el / D.TICK_S)), items: pick, done: del, group: cfg.queue.fifo ? groupOf(pick[0].r) : null });
        m.maxConc = Math.max(m.maxConc, inflight.length);
      }
      q.items.forEach(x => { m.maxAge = Math.max(m.maxAge, (t - x.sentAt) * D.TICK_S); });
      snap(t);
    }
    m.left = q.items.filter(x => !x.r.poison).length;
    m.poisonLoose = q.items.filter(x => x.r.poison).length;
    m.ok = path === 'async' ? Object.keys(written).length : m.ok;
    return { m, lines: pager(d, cfg, m, set), nodes: nodes(d, cfg, m), frames };
  };

  // Per-tick series for each station's metrics (the console's small charts). Small: 20 numbers each.
  D.sparks = function (frames, stream, dd) {
    const hub = dd && dd.hub;
    const by = f => frames.map(fr => f(fr.d, fr) | 0);
    return {
      gate: Object.assign({ Count: by(d => (d.req | 0) + (d.throttles429 | 0)), '4XXError': by(d => (d.throttles429 | 0) + (d.forbidden | 0) + (d.unauth | 0) + (d.stale | 0)), '5XXError': by(d => d.fault5xx), Latency: by(d => (d.slow ? 3000 : d.gmisses ? 600 : d.ghits ? 40 : 120)) },
        dd && dd.gcache ? { CacheHitCount: by(d => d.ghits), CacheMissCount: by(d => d.gmisses) } : {}),
      queue: hub === 'sns' ? { NumberOfMessagesPublished: by(d => d.published), NumberOfNotificationsDelivered: by(d => d.delivered), NumberOfNotificationsFilteredOut: by(d => d.filteredOut), '…FilteredOut-NoMessageAttributes': by(d => d.noAttr) }
        : hub === 'sfn' ? { ExecutionsStarted: by(d => d.started), ExecutionsSucceeded: by(d => d.succeeded), ExecutionsFailed: by(d => d.execFailed) }
        : stream ? { IncomingRecords: by(d => d.sent), IteratorAge: by((d, fr) => fr.qv) } : { NumberOfMessagesSent: by(d => d.sent), NumberOfMessagesReceived: by(d => d.received), NumberOfMessagesDeleted: by(d => d.deleted), ApproximateAgeOfOldestMessage: by((d, fr) => fr.qv + fr.qh) },
      fn: { Invocations: by(d => d.invocations), Errors: by(d => d.errors), Duration: by(d => (d.timeouts ? 2 : 1)), ConcurrentExecutions: by((d, fr) => fr.busy), Throttles: by(d => d.fnThrottled) },
      store: dd && dd.cache ? { CacheHits: by(x => x.hits), CacheMisses: by(x => x.misses), Evictions: by(x => x.evictions) }
        : dd && dd.upload ? { PutRequests: by(x => x.parts), '4xxErrors': by(x => (x.up403 | 0) + (x.upToken | 0)) }
          : { ConsumedWriteCapacityUnits: by(d => d.wcuUsed), WriteThrottleEvents: by(d => (d.hot | 0) + (d.over | 0)) }
    };
  };

  // ---- The run's cost to the error budget ----
  D.cost = function (drill, m) {
    const c = m.gaveUp + m.fault5xx + m.slow + m.dupes + m.lost + m.goodParked + (DR[drill].path === 'async' ? Math.ceil(m.left / 2) + m.poisonLoose * 2 : 0) + (m.adminUsed ? 2 : 0) + (m.wideUsed ? 2 : 0)
      + m.poisonDropped + (m.perCall ? 2 : 0) + (m.rotOff ? 2 : 0) + m.forbidden + m.stale + m.filtered + m.misrouted + m.stuck + m.recharged
      + m.cstale + Math.ceil(m.evictions / 3) + (m.misses * 2 > m.reads ? Math.ceil((m.misses - m.reads / 2) / 3) : 0)
      + m.upFail + (m.userKey ? 2 : 0) + (m.pubPut ? 3 : 0) + m.leaked + (m.quotaRaised ? 2 : 0) + (m.cacheOff ? 2 : 0) + (m.visShort ? 2 : 0);
    return Math.min(D.RUN_CAP, c);
  };

  // ---- Signals: the trace map and the pager ----
  // A node shows its colour only when it's traced: the Gate with stage tracing, the Function and what it calls with
  // active tracing. Untraced nodes stay grey ('dark').
  function nodes(d, cfg, m) {
    const traced = { gate: cfg.gate.trace, queue: cfg.fn.trace && (d.path === 'async' || !!d.hub), fn: cfg.fn.trace, store: cfg.fn.trace };
    const st = {
      gate: AS.xrayStatus({ fault: m.fault5xx > 0, throttle: m.throttles429 > 0, error: m.forbidden + m.unauth + m.stale > 0 }),
      queue: d.hub === 'sfn' ? AS.xrayStatus({ fault: m.execFailed > 0 }) : 'ok',
      fn: AS.xrayStatus({ fault: m.errors > 0 }),
      store: AS.xrayStatus({ throttle: m.hot + m.over + m.evictions > 0, error: m.denied > 0 || m.iamDenied > 0 || m.condBlocked > 0 || m.cstale > 0 || m.upFail > 0 })
    };
    const out = {};
    D.ORDER.forEach(k => { out[k] = traced[k] ? st[k] : 'dark'; });
    if (d.path !== 'async' && !d.hub) out.queue = 'off';
    return out;
  }
  D.metrics = function (drill, cfg, m) {
    const d = DR[drill];
    return {
      gate: [['Count', m.req + m.throttles429 - m.gaveUp], ['4XXError', m.throttles429 + m.forbidden + m.unauth + m.stale], ['5XXError', m.fault5xx], ['Latency', (m.latency || 0) + ' ms']]
        .concat(d.gcache ? [['CacheHitCount', m.ghits], ['CacheMissCount', m.gmisses]] : []),
      queue: d.hub === 'sns' ? [['NumberOfMessagesPublished', m.published], ['NumberOfNotificationsDelivered', m.delivered], ['NumberOfNotificationsFilteredOut', m.filteredOut]].concat(m.noAttr ? [['…FilteredOut-NoMessageAttributes', m.noAttr]] : [])
        : d.hub === 'sfn' ? [['ExecutionsStarted', m.started], ['ExecutionsSucceeded', m.succeeded], ['ExecutionsFailed', m.execFailed]]
        : d.stream ? [['IncomingRecords', m.sent], ['IteratorAge', m.maxAge * 1000 + ' ms max']] : d.path === 'async' ? [['NumberOfMessagesSent', m.sent], ['NumberOfMessagesReceived', m.received], ['NumberOfMessagesDeleted', m.deleted], ['ApproximateAgeOfOldestMessage', m.maxAge + ' s']] : [],
      fn: [['Invocations', m.invocations], ['Errors', m.errors], ['Duration', (d.path === 'async' ? m.maxDur : 1) * 1000 + ' ms max'], ['ConcurrentExecutions', m.maxConc]].concat(m.fnThrottled ? [['Throttles', m.fnThrottled]] : []),
      store: d.cache ? [['CacheHits', m.hits], ['CacheMisses', m.misses], ['Evictions', m.evictions], ['DatabaseMemoryUsagePercentage', Math.round(100 * m.cacheMax / d.setup({ k: 0 }).cache.cap) + '%']]
        : d.upload ? [['PutRequests', m.parts], ['4xxErrors', m.up403 + m.upToken], ['BytesUploaded', m.parts + ' GB']]
          : [['ConsumedWriteCapacityUnits', m.wcuUsed], ['WriteThrottleEvents', m.hot + m.over]]
    };
  };
  // One line per station, in its owner's voice: what their logs and metrics say, never why.
  function pager(d, cfg, m, set) {
    const L = [];
    const n = (x, a, b) => `${x} ${x === 1 ? a : (b || a + 's')}`;
    if (m.limit429) L.push(['seoyeon', `${n(m.limit429, 'request')} got 429, and the access logs say QUOTA_EXCEEDED, not THROTTLED, from ${m.quotaAt} seconds on.${m.shopLimited ? ` ${m.shopLimited} of them were the shop's own app.` : ''} ${cfg.gate.split ? 'The partner now sends partner-key, and the shop sends app-key.' : 'The shop and the partner both send the same API key, app-key.'}`]);
    else if (m.throttles429) L.push(['seoyeon', `${n(m.throttles429, 'request')} got 429 Too Many Requests${m.gaveUp ? `, and ${n(m.gaveUp, 'caller')} gave up after trying again and again` : ''}.`]);
    else if (m.forbidden) L.push(['seoyeon', `${n(m.forbidden, 'request')} got 403 Forbidden${m.forbidPost === m.forbidden ? ', every one a POST' : ''}. The same tokens' first calls went through.${m.unauth ? ` ${n(m.unauth, 'request')} got 401 Unauthorized: no token at all, the scraper bot.` : ''}`]);
    else if (m.stale) L.push(['seoyeon', `${n(m.stale, 'caller')} got 404 Not Found for an order they had just placed.`]);
    else if (m.cstale) L.push(['seoyeon', `${n(m.cstale, 'caller')} got a 200 with this morning's price. Nothing failed. The answer was just old.`]);
    else if (d.cache && m.misses * 2 > m.reads) L.push(['seoyeon', `Every caller got an answer, slowly: ${m.misses} of ${m.reads} price lookups went all the way to the table.`]);
    else if (d.upload && !m.fault5xx) L.push(['seoyeon', `Every request for upload URLs got a 200. The uploads themselves go straight to S3. They never pass me.`]);
    else if (m.fault5xx && (m.iamDenied || m.v2Fail || m.authFail)) L.push(['seoyeon', `${n(m.fault5xx, 'caller')} got 502 Bad Gateway: the function errored, so the Gate had no answer to pass on.`]);
    else if (m.fault5xx) L.push(['seoyeon', `${n(m.fault5xx, 'caller')} got a 5XX from the Gate.`]);
    else if (m.slow) L.push(['seoyeon', `Latency spiked to ${m.latency} ms on ${n(m.slow, 'request')}. IntegrationLatency is most of it.`]);
    else if (m.leaked) L.push(['seoyeon', `Every response was 200 OK, fast, and CacheHitCount is ${m.ghits}. But ${m.leaked} of those answers showed a customer someone else's orders.`]);
    else if (m.unauth) L.push(['seoyeon', `Every caller with a token got through. ${n(m.unauth, 'request')} got 401 Unauthorized: the scraper bot, with no token at all.`]);
    else if (d.hub === 'sns') L.push(['seoyeon', `Every Publish to the orders topic got 200 OK and a MessageId.${cfg.gate.snsattr ? ' Each one carries order_type as a message attribute now.' : ''}`]);
    else if (d.hub === 'sfn') L.push(['seoyeon', 'Every StartExecution got 200 OK and an executionArn. What happens after that isn\'t the Gate\'s to see.']);
    else L.push(['seoyeon', 'Gate\'s quiet. Every caller got an answer.']);
    if (d.hub === 'sns') {
      if (m.noAttr) L.push(['mira', `${m.published} published, ${m.delivered} delivered to shipping. NumberOfNotificationsFilteredOut-NoMessageAttributes: ${m.noAttr}. The messages carry no attributes at all.`]);
      else if (!cfg.topic.filter) L.push(['mira', `No filter on shipping: all ${n(m.delivered, 'order')} delivered${m.misrouted ? `, ${m.misrouted} of them pickups` : ''}.`]);
      else L.push(['mira', `${m.published} published, ${m.delivered} delivered to shipping, ${m.filteredOut} filtered out${m.filtered ? '' : ': the pickups'}.`]);
      if (cfg.topic.dlq) L.push(['mira', 'shipping-dlq is empty. SNS delivered everything the policy let through.']);
    } else if (d.hub === 'sfn') {
      L.push(['mira', `${n(m.started, 'execution')} started, ${m.succeeded} succeeded, ${m.execFailed} failed.`]);
      if (m.lost) L.push(['mira', `${n(m.lost, 'execution')} failed in Charge on Lambda.TooManyRequestsException. No retrier matched.`]);
      if (m.stuck && !m.releaseFailed) L.push(['mira', `${n(m.stuck, 'execution')} failed in Charge on CardDeclined. No catcher matched, so nothing after Charge ran.`]);
      if (m.releaseFailed) L.push(['mira', `CardDeclined was caught ${n(m.releaseFailed, 'time')}, then ReleaseStock failed: its input had only Error and Cause, no orderId.`]);
      if (m.recharged) L.push(['mira', `Charge was retried on CardDeclined ${n(m.retried - (m.fnThrottled && cfg.flow.retry !== 'none' ? m.fnThrottled : 0), 'time')}. The card was declined every time.`]);
      if (m.released && !m.releaseFailed) L.push(['mira', `${n(m.released, 'declined card')} went to ReleaseStock, and the stock went back on the shelf.`]);
    } else if (d.stream) {
      if (m.maxAge > 30) L.push(['mira', `IteratorAge reached ${m.maxAge} seconds: the shard is stuck behind one record.${m.left + m.poisonLoose ? ` ${n(m.left + m.poisonLoose, 'record')} still waiting.` : ''}`]);
      else L.push(['mira', `${n(m.sent, 'record')} in, every one read.`]);
      if (m.splits) L.push(['mira', `Failing batches were split in two ${n(m.splits, 'time')}.`]);
      if (m.parked) L.push(['mira', `${n(m.parked, 'record')} went to orders-failed${m.goodParked ? `, and ${m.goodParked} of them were good orders` : ''}.`]);
      if (m.lost + m.poisonDropped) L.push(['mira', `Lambda gave up on ${n(m.lost + m.poisonDropped, 'record')} and dropped ${m.lost + m.poisonDropped === 1 ? 'it' : 'them'}: nothing was set up to catch ${m.lost + m.poisonDropped === 1 ? 'it' : 'them'}.${m.lost ? ` ${n(m.lost, 'good order')} gone.` : ''}`]);
    } else if (d.path === 'async') {
      if (m.visShort && !m.dupes) L.push(['mira', `Nothing came back twice this run. But VisibilityTimeout ${cfg.queue.vis} is under 6x the function's Timeout ${cfg.fn.timeout}, which is ${6 * cfg.fn.timeout}. If Lambda is throttled and retries a batch, its messages turn visible mid-retry.`]);
      if (m.received > m.sent) L.push(['mira', `NumberOfMessagesReceived is ${m.received}, but only ${m.sent} were sent.${m.parked ? ` ${n(m.parked, 'message')} moved to the DLQ.` : ''}`]);
      else L.push(['mira', `${m.sent} sent, ${m.deleted} deleted.${m.parked ? ` ${n(m.parked, 'message')} in the DLQ.` : ''}`]);
      if (m.maxAge > 30) L.push(['mira', `ApproximateAgeOfOldestMessage reached ${m.maxAge} seconds.${m.left + m.poisonLoose ? ` ${n(m.left + m.poisonLoose, 'message')} still waiting.` : ''}`]);
      if (m.lost) L.push(['mira', `The purge took ${n(m.lost, 'good message')} with it.`]);
    }
    if (d.cache) L.push(['kai', `${m.reads} price lookups: ${m.hits} came from the cache, ${m.misses} missed and read the table.`]);
    if (d.upload) L.push(['kai', `I signed ${n(m.signed, 'part URL')}${cfg.up.demand ? ', each one just before its part went' : `, all ${set.upload.parts} for a video at once, when it started`}. ${m.upDone} of ${n(m.uploads, 'upload')} finished.`]);
    if (d.hub === 'sns') {
      if (!m.invocations) L.push(['kai', 'Not one invocation. Nothing reached the shipping function.']);
      else if (m.misrouted) L.push(['kai', `${n(m.invocations, 'invocation')}, no errors. ${m.misrouted} of them printed shipping labels for pickup orders.`]);
    }
    if (d.hub === 'sfn') {
      if (m.fnThrottled) L.push(['kai', `Lambda throttled ${n(m.fnThrottled, 'invocation')} from Charge: TooManyRequestsException.${cfg.flow.retry !== 'none' ? ' Each one went through on its retry.' : ''}`]);
      if (m.declines) L.push(['kai', `${n(m.declines, 'order')} threw CardDeclined: the payment provider said no.`]);
    }
    if (m.cacheWarn) L.push(['seoyeon', `${n(m.cacheWarn, 'response')} carried a warning header: the app's Cache-Control: max-age=0 was ignored.`]);
    if (d.gcache) L.push(['kai', m.cacheOff ? `Every request reached me: ${n(m.invocations, 'invocation')}, about 600 ms each.` : `Only ${n(m.invocations, 'request')} reached me all night. The Gate answered the other ${m.ghits} from its cache.`]);
    if (m.limit429) L.push(['kai', `Nothing reached me for those ${m.limit429}. The Gate turned them away before the function ran.`]);
    if (m.timeouts) L.push(['kai', `Task timed out after ${cfg.fn.timeout}.00 seconds, ${n(m.timeouts, 'time')}.`]);
    if (m.forbidden) L.push(['kai', `Nothing reached me for those ${m.forbidden}. The Gate turned them away before the function ran.`]);
    if (m.stale) L.push(['kai', `${n(m.stale, 'order')} came back "not found" when I read them right after writing them.`]);
    if (m.authFail) L.push(['kai', `${n(m.authFail, 'login')} to the ledger database failed: password authentication failed for user orders_app.`]);
    if (m.refetched) L.push(['kai', `${n(m.refetched, 'login')} failed once, then worked after reading the secret again.`]);
    if (m.perCall) L.push(['kai', `GetSecretValue ran ${m.secretCalls} times: once for every order.`]);
    if (m.iamDenied) L.push(['kai', `AccessDeniedException on ${n(m.iamDenied, 'write')}: orders-fn-role is not authorized to perform dynamodb:PutItem on table/orders, because no identity-based policy allows it.`]);
    if (m.denied) L.push(['kai', `AccessDeniedException on ${n(m.denied, 'write')}: not authorized to perform kms:Decrypt.`]);
    if (m.v2Fail) L.push(['kai', (m.v2Fail === 1 ? '1 invocation failed, on version 2 (ExecutedVersion).' : `${m.v2Fail} invocations failed, every one on version 2 (ExecutedVersion).`) + ' Version 1 had none.']);
    if (m.hookFailed) L.push(['kai', 'The PreTraffic hook\'s test order failed on version 2, so CodeDeploy rolled back before live moved at all.']);
    else if (m.stopped) L.push(['kai', 'The Errors alarm went off mid-deployment, and CodeDeploy rolled live back to version 1.']);
    else if (m.lateAlarm) L.push(['kai', 'The Errors alarm went off, but the deployment had already finished, so nothing rolled back.']);
    else if (m.shifted && cfg.fn.shift !== 'all') L.push(['kai', `CodeDeploy is still shifting: version 2 has ${cfg.fn.shift === 'canary' ? '10%' : 'a growing share'} of live, and nothing is watching it.`]);
    if (m.hot) L.push(['kai', `ThrottlingException on ${n(m.hot, 'write')}.`]);
    if (m.over) L.push(['kai', `ProvisionedThroughputExceededException on ${n(m.over, 'write')}.`]);
    if (m.errors && !d.hub && !m.timeouts && !m.denied && !m.iamDenied && !m.v2Fail && !m.authFail && !m.hot && !m.over) L.push(['kai', `${n(m.errors, 'invocation')} failed. One message throws every time it's read.`]);
    if (m.condBlocked) L.push(['kai', `ConditionalCheckFailedException ${n(m.condBlocked, 'time')}: the order was already written.`]);
    if (!L.some(x => x[0] === 'kai')) L.push(['kai', `${n(m.invocations, 'invocation')}, no errors${m.maxConc ? `, at most ${m.maxConc} at once` : ''}.`]);
    if (m.dupes) L.push(['dutch', `${n(m.dupes, 'order')} written twice.`]);
    if (d.cache) {
      const upd = set.cache.upd * D.TICK_S;
      if (m.cstale) L.push(['dutch', `The table has had the new prices since ${upd} seconds in. The cache still hands out ${m.cstale} old ones. Nothing told it.`]);
      if (m.evictions) L.push(['dutch', `Evictions: ${m.evictions}. The cache is full of orders nobody reads, so it throws keys out to make room (maxmemory-policy allkeys-lru).`]);
      if (m.misses * 2 > m.reads) L.push(['dutch', 'Keys expire before anyone reads them twice. The cache is mostly empty, and the table takes the reads.']);
      if (m.flushed) L.push(['dutch', `FLUSHALL cleared ${n(m.flushed, 'key')}. They came straight back the same way.`]);
      if (!m.cstale && !m.evictions && m.misses * 2 <= m.reads) L.push(['dutch', `Cache and table agree. Memory peaked at ${m.cacheMax} keys.`]);
    }
    if (d.upload) {
      if (m.up403) L.push(['dutch', `${n(m.up403, 'part')} got 403 AccessDenied: Request has expired.`]);
      if (m.upToken) L.push(['dutch', `${n(m.upToken, 'part')} got ExpiredToken: the credentials that signed the URL had expired.`]);
      if (m.orphans) L.push(['dutch', `${n(m.orphans, 'incomplete multipart upload')} left behind. S3 keeps their parts, and bills them, until someone aborts them${cfg.up.lifecycle ? ': the lifecycle rule will, in a day' : ''}.`]);
      if (m.userKey) L.push(['dutch', 'Those URLs were signed with an IAM user\'s long-term access key, sitting in an environment variable.']);
      if (m.pubPut) L.push(['dutch', 'The bucket takes a PutObject from anyone now. Anyone at all.']);
      if (!m.upFail && !m.userKey && !m.pubPut) L.push(['dutch', `${m.parts} GB in. Every multipart upload completed.`]);
    }
    if (m.hot + m.over) L.push(['dutch', `WriteThrottleEvents: ${m.hot + m.over}. ConsumedWriteCapacityUnits ${m.wcuUsed} of ${cfg.store.wcu * (D.TICKS + D.DRAIN)}, so the table isn't full.`.replace(/ConsumedWriteCapacityUnits (\d+) of (\d+), so the table isn't full\./, (s, a, b) => (m.over ? `The table hit its provisioned WCU.` : `ConsumedWriteCapacityUnits ${a}, well under the table's ${b}.`))]);
    if (cfg.store.insights && m.hot) L.push(['dutch', 'Contributor Insights: the most throttled key is status = PENDING, almost every write.']);
    if (cfg.store.trail && m.denied) L.push(['dutch', `CloudTrail: Decrypt (invoked by dynamodb.amazonaws.com) denied for role orders-fn. The key policy names only the key's admins${cfg.store.keyPolicy === 'iam' ? ', plus the account' : ''}.`]);
    if (d.gcache) L.push(['dutch', 'Table\'s fine. Every order is filed under the right customer.']);
    if (m.stale) L.push(['dutch', 'Every one of those orders is in the table. Read it again a second later and it\'s there.']);
    else if (cfg.store.consistent && m.rcu) L.push(['dutch', `Strongly consistent reads: ${m.rcu} read units, twice what eventually consistent costs. DAX passed them all through.`]);
    if (m.rotated) L.push(['dutch', `Secrets Manager rotated ledger/orders_app at ${m.rotated} seconds. ${cfg.store.rot === 'alt' ? 'Alternating users: the previous password still works.' : 'Single user: the old password stopped working.'}`]);
    if (m.rotOff) L.push(['dutch', 'Rotation is off. The ledger password hasn\'t changed since the day it was made.']);
    if (d.hub === 'sns' && m.filtered) L.push(['dutch', `${n(m.filtered, 'order')} to ship and no shipping label for any of them. The shop says they were all placed.`]);
    if (d.hub === 'sns' && m.misrouted) L.push(['dutch', `${n(m.misrouted, 'shipping label')} for orders the customer is picking up in store.`]);
    if (m.stuck) L.push(['dutch', `${n(m.stuck, 'order')} still hold stock in the inventory table, for payments that never went through.`]);
    if (m.iamDenied) L.push(['dutch', `The table turned away ${n(m.iamDenied, 'write')} with a 400. It never got as far as capacity.`]);
    if (!L.some(x => x[0] === 'dutch')) L.push(['dutch', m.denied ? 'Nothing reached the table.' : 'Table\'s fine from here.']);
    return L;
  }

  // ---- A drill in play ----
  // f: { drill, cfg, v, deploys: n, changes: [card ids this deploy], log: [{ m, cost, lines, nodes, ok }], state }
  D.start = function (drill, seed) {
    const cfg = baseCfg();
    const v = { k: Math.abs(seed | 0) % 6 };
    DR[drill].break(cfg, v);
    const f = { drill, cfg, v, deploys: 0, changes: [], log: [], state: 'read' };
    // The warm-up run: the fault in place, free.
    const r = D.run(drill, cfg, v);
    f.log.push({ m: r.m, lines: r.lines, nodes: r.nodes, cost: 0, ok: DR[drill].ok(r.m), warm: true, spark: D.sparks(r.frames, DR[drill].stream, DR[drill]) });
    D.lastFrames = r.frames;
    return f;
  };
  // Why a card can't be placed now, or ''.
  D.why = function (f, id) {
    const c = C[id], d = DR[f.drill];
    if (!c) return 'No such setting.';
    if (c.at === 'queue' && d.path !== 'async' && !d.hub) return 'There\'s no queue on this path.';
    if (c.needs && !d[c.needs]) return { release: 'No release goes out in this drill.', secret: 'This system has no secret to read.', stream: 'There\'s no stream on this path.', auth: 'This API has no authorizer.', reads: 'Nothing reads its writes back in this drill.', sns: 'There\'s no topic in this drill.', sfn: 'No state machine runs in this drill.', cache: 'There\'s no cache in this drill.', keys: 'This API has no API keys or usage plan.', gcache: 'This stage has no cache.', upload: 'Nothing uploads to S3 in this drill.', visLine: 'This queue\'s timeout is set on its dial.' }[c.needs];
    if (c.sqs && (d.stream || d.hub)) return `That's an SQS setting, and this is ${d.hub === 'sns' ? 'an SNS topic' : d.hub === 'sfn' ? 'a state machine' : 'a stream'}.`;
    if (c.on(f.cfg)) return 'Already set.';
    if (f.changes.length >= D.CHANGES) return `That's ${D.CHANGES} changes for this deploy.`;
    return c.why ? c.why(f.cfg, d) : '';
  };
  // Whether a setting belongs on this drill's desks at all (not just whether it can be placed now).
  D.shown = (drill, id) => { const c = C[id], d = DR[drill]; return !(c.needs && !d[c.needs]) && !(c.sqs && (d.stream || d.hub)); };
  // Whether the Queue's station is on this drill's path (a queue, a stream, a topic or a state machine).
  D.hasQueue = drill => DR[drill].path === 'async' || !!DR[drill].hub;
  D.place = function (f, id) {
    const w = D.why(f, id);
    if (w) return w;
    C[id].set(f.cfg);
    f.changes.push(id);
    return '';
  };
  // The Short Fuse's timeline: set the visibility timeout to sec (snapped to 10 s, 0 to 12 hours). The first drag of
  // a deploy is one change; more drags in the same deploy move it for free, and dragging it back to where the deploy
  // started takes the change back. Returns '' or why it can't move.
  D.VIS_MAX = 43200;
  D.setVis = function (f, sec) {
    const v = Math.max(0, Math.min(D.VIS_MAX, Math.round((+sec || 0) / 10) * 10));
    if (!f.changes.includes('visline')) {
      if (v === f.cfg.queue.vis) return '';
      const w = D.why(f, 'visline');
      if (w) return w;
      f.visFrom = f.cfg.queue.vis;
      f.changes.push('visline');
    } else if (v === f.visFrom) f.changes.splice(f.changes.indexOf('visline'), 1);
    f.cfg.queue.vis = v;
    return '';
  };
  // What the timeline draws: the work each message takes, the function's timeout, the 6x mark and the ruler's end.
  D.visLine = function (f) {
    const d = DR[f.drill], work = d.work ? d.work(f.v) : 10, timeout = f.cfg.fn.timeout, six = 6 * timeout;
    return { work, timeout, six, vis: f.cfg.queue.vis, max: Math.max(480, Math.ceil(six * 1.25 / 60) * 60) };
  };
  // Deploy: run with the current settings. Returns the log entry.
  D.deploy = function (f) {
    const d = DR[f.drill];
    const r = D.run(f.drill, f.cfg, f.v);
    const ok = d.ok(r.m);
    const e = { m: r.m, lines: r.lines, nodes: r.nodes, cost: D.cost(f.drill, r.m), ok, changes: f.changes.slice() };
    e.spark = D.sparks(r.frames, d.stream, d);
    D.lastFrames = r.frames;   // for the board's playback; not saved
    f.deploys++; f.log.push(e); f.changes = [];
    f.cfg.queue.purge = false; f.cfg.gate.gflush = false;
    if (ok) f.state = 'contained'; else if (f.deploys >= D.DEPLOYS) f.state = 'escalated';
    return e;
  };
  D.clean = f => f.state === 'contained' && f.deploys === 1;

  // Lines a rule's first appearance carries (once per save, L9).
  D.TEACH = {
    '429': ['seoyeon', 'The Gate\'s bucket only refills so fast. A 429 means it was empty.'],
    vis: ['mira', 'AWS says a queue in front of a function wants a visibility timeout of at least six times the function\'s timeout.'],   // voiced (js/vo-modes.js): keep word for word
    hot: ['dutch', 'The table has room. One partition doesn\'t. Each one only takes so many writes a second.'],
    kms: ['dutch', 'A KMS key listens to its key policy first. If that doesn\'t let IAM decide, no IAM policy helps.'],
    cold: ['kai', 'New environment, new start-up. Reserved concurrency saves a place. It doesn\'t warm it.'],
    fifo: ['mira', 'One group, one line. The function can only work as many groups as there are.'],
    poison: ['kai', 'Without ReportBatchItemFailures, one bad message sends the whole batch back.'],
    refused: ['dutch', 'AWS won\'t take that one. Read the refusal: it\'s the lesson.'],
    grey: ['seoyeon', 'Grey on the map means nobody traced it. You can\'t see what you didn\'t instrument.'],
    auth: ['seoyeon', '401 means no pass at all. 403 means a pass that says no. And the Gate remembers what a pass said.'],
    reads: ['dutch', 'Reads are eventually consistent unless you ask. Right after a write, ask: ConsistentRead.'],
    secret: ['dutch', 'A secret you read once and keep goes stale the moment it rotates. Cache it, and know when to read it again.'],
    stream: ['mira', 'A stream keeps its order. A record that always fails holds up everything behind it, and by default Lambda retries it until it expires.'],
    iam: ['dutch', 'A 4xx down here turns into a 5xx up there. On the trace, yellow is a 4xx and red is a 5xx. Start at the yellow.'],
    cache: ['dutch', 'Lazy loading only fills what misses, and nothing refreshes it. Write-through keeps it current. Put a TTL on every write.'],
    churn: ['kai', 'Cache everything you write and most of it is never read. A TTL clears that out. Too short, though, and nothing stays long enough to hit.'],
    presign: ['kai', 'S3 checks a presigned URL when each request starts. Sign every part up front and the last ones arrive too late.'],
    token: ['dutch', 'A URL can\'t outlive the credentials that signed it. Signed by a role, it dies with the role\'s session, whatever ExpiresIn says.'],
    fanout: ['mira', 'A filter policy reads message attributes unless you tell it to read the body. No attributes, no match, and SNS doesn\'t call that an error.'],
    flow: ['kai', 'Retry what might work next time. Catch what never will. And give the catch a ResultPath, or the error replaces your input.'],
    quota: ['seoyeon', 'A usage plan counts each API key on its own. Share a key and you share its quota, and once it\'s spent, everyone on that key gets 429.'],
    gcache: ['seoyeon', 'The stage cache tells requests apart only by the cache keys you give it. Leave out who\'s asking, and everyone gets the first answer.'],
    canary: ['kai', 'A canary only helps if something is watching it. CodeDeploy rolls back on an alarm only while the deployment is still running.']
  };
  // Which teach line a run earns first.
  D.teachFor = function (f, e, taught) {
    const m = e.m, keys = [];
    if (m.limit429) keys.push('quota');
    if (m.throttles429 > m.limit429) keys.push('429');
    if (m.leaked) keys.push('gcache');
    if (m.hot) keys.push('hot');
    if (m.denied) keys.push('kms');
    if (m.iamDenied) keys.push('iam');
    if (m.authFail) keys.push('secret');
    if (m.forbidden) keys.push('auth');
    if (m.stale) keys.push('reads');
    if (m.cstale) keys.push('cache');
    if (m.evictions || m.misses * 2 > m.reads) keys.push('churn');
    if (m.upToken) keys.push('token');
    if (m.up403) keys.push('presign');
    if (DR[f.drill].stream && m.maxAge > 30) keys.push('stream');
    if (m.v2Fail) keys.push('canary');
    if (m.filtered) keys.push('fanout');
    if (DR[f.drill].hub === 'sfn' && (m.lost || m.stuck || m.recharged)) keys.push('flow');
    if (m.slow) keys.push('cold');
    if ((m.dupes || m.visShort) && DR[f.drill].path === 'async' && !DR[f.drill].stream) keys.push('vis');
    if (f.cfg.queue.fifo && m.maxAge > 30) keys.push('fifo');
    if (!DR[f.drill].stream && (m.goodParked || (m.errors && m.dupes))) keys.push('poison');
    if (Object.values(e.nodes).includes('dark')) keys.push('grey');
    return keys.filter(k => !taught[k]).slice(0, 1);
  };

  // ---- The night ----
  D.newNight = function (o) {
    o = o || {};
    return { v: 1, night: o.night || 1, row: 0, path: [], phase: 'map', budget: D.BUDGET, drill: null, done: [], debriefs: [], taught: Object.assign({}, o.taught || {}), carry: (o.carry || []).slice(), spent: 0 };
  };
  D.startDrill = function (s, id, seed) { s.drill = D.start(id, seed); s.phase = 'drill'; };
  // After a deploy: spend the budget, and move on when the drill is over.
  D.afterDeploy = function (s, e) {
    s.budget -= e.cost; s.spent += e.cost;
    const f = s.drill;
    if (f.state === 'escalated') { s.budget -= D.ESCALATE; s.spent += D.ESCALATE; }
    if (s.budget <= 0) { s.phase = 'zero'; return; }
    if (f.state !== 'read') s.phase = 'debrief';
  };
  D.settle = function (s, ok) {
    const f = s.drill;
    s.done.push({ drill: f.drill, state: f.state, deploys: f.deploys, clean: D.clean(f), proof: ok });
    if (ok && s.budget > 0) s.budget = Math.min(D.BUDGET, s.budget + 3);
    s.row++;
    s.drill = null;
    s.phase = s.row >= D.ROWS.length ? 'end' : 'map';
  };
  D.baseCfg = baseCfg;
  D.clone = clone;

  if (typeof module !== 'undefined' && module.exports) module.exports = D;
  if (root.SD) root.SD.drill = D;
})(typeof window !== 'undefined' ? window : globalThis);
