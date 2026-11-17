// The Counterfeit Table: the Look-Alike Cup's rules as a real game (design: project files
// game-modes/lookalike-cup-real/design.md, approved by Ladi Nov 16). Every square on Kagemaru's felt is a job written
// as a need ("every guild gets every order"), and every card is a service pin. He lays his pins face up on the jobs,
// and some are look-alikes that don't really do the job. On your turn you call his last pin or place one of yours,
// and either way the pin is tested: it holds or cracks by what the service really does. The questions come after the
// board, as his bill. js/mode-duel.js draws it; tools/duel_core_check.js checks every test; tools/duel_table_sim.js plays it.
// Pure: no DOM, no saves; randomness only from the seed stored in the night (same seed, same night).
//
// Every rule below was checked against the current AWS docs on Nov 16, 2026 (links by set). Numbers on the felt are
// small; each pin's back gives the real value.
//   Dupli-Queue. SQS: a received message is hidden from other consumers and is deleted once processed; standard
//     queues give at-least-once delivery and best-effort order; FIFO keeps order within a message group and drops a
//     duplicate inside the 5-minute deduplication interval; messages wait in the queue up to the retention period
//     (default 4 days, up to 14).
//     https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
//     https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/standard-queues.html
//     https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-fifo-queues.html
//     https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-queue-parameters.html
//   SNS pushes each message to every subscriber; a filter policy (attributes or body) narrows it; message archiving
//     and replay is only for FIFO topics.
//     https://docs.aws.amazon.com/sns/latest/dg/welcome.html  https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html
//     https://docs.aws.amazon.com/sns/latest/dg/message-archiving-and-replay-topic-owner.html
//   EventBridge: a rule's event pattern matches source, metadata or detail values and sends to up to 5 targets; an
//     archive can replay events.
//     https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html
//     https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rules.html  https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-archive.html
//   Kinesis Data Streams: records stay 24 hours by default (up to 365 days); each consuming application reads the
//     stream independently; the partition key decides the shard, and records in a shard carry sequence numbers.
//     https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html  https://docs.aws.amazon.com/streams/latest/dev/key-concepts.html
//   Keyring. KMS Encrypt takes up to 4,096 bytes of plaintext; data keys (GenerateDataKey) are for large data and are
//     stored encrypted beside it; automatic rotation of a customer managed key's material is off until enabled, then
//     every 365 days by default (90 to 2,560 days can be set), and RotateKeyOnDemand rotates it now.
//     https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html  https://docs.aws.amazon.com/kms/latest/developerguide/data-keys.html
//     https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
//   Secrets Manager rotates secrets automatically (managed rotation or a Lambda function) and replicates them to other
//     Regions; it's charged per secret.
//     https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html
//     https://docs.aws.amazon.com/secretsmanager/latest/userguide/create-manage-multi-region-secrets.html  https://aws.amazon.com/secrets-manager/pricing/
//   Parameter Store: standard parameters have no additional charge (10,000 per Region, 4 KB); advanced ones are 8 KB,
//     charged, and alone take parameter policies (Expiration, ExpirationNotification, NoChangeNotification); for
//     credentials that need automatic rotation AWS recommends Secrets Manager.
//     https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html
//     https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-policies.html
//   Shift Change. CodeDeploy for Lambda: CodeDeployDefault.LambdaCanary10Percent5Minutes (10%, the rest five minutes
//     later), LambdaLinear10PercentEvery1Minute, LambdaAllAtOnce.
//     https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html
//   Elastic Beanstalk: all at once (instances out of service for a short time), rolling (capacity drops by a batch),
//     rolling with additional batch (a new batch first, full capacity), immutable (a fresh group of instances in a
//     separate Auto Scaling group), traffic splitting (canary testing: a percentage of traffic for an evaluation time).
//     https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html
//   Three Watchers. CloudTrail event history: the past 90 days of management events; data events (such as S3 object
//     reads) aren't logged by default. CloudWatch alarms watch a metric; Logs Insights queries log lines. X-Ray groups
//     a request's segments into a trace with a service map; annotations are indexed for filter expressions, metadata
//     isn't.
//     https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html
//     https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html
//     https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/AlarmThatSendsEmail.html
//     https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/AnalyzingLogData.html
//     https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html
//   Kettles and Aliases. Provisioned concurrency pre-initialises execution environments (no cold-start wait) and is
//     charged; reserved concurrency is both a floor and a ceiling and costs nothing extra. A published version can't
//     change; $LATEST is the unpublished code; a weighted alias splits traffic between two versions.
//     https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html  https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html
//     https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html  https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html
(function (root) {
  const T = {};

  // ---- The sets: a rival's lead set and the partner set mixed into its boards (interleaving, principle 9) ----
  T.SETS = {
    dq: { name: 'Dupli-Queue', partner: 'kk', what: 'Queues, topics, buses and streams.' },
    kr: { name: 'Keyring', partner: 'dq', what: 'KMS, Secrets Manager and Parameter Store.' },
    sc: { name: 'Shift Change', partner: 'kk', what: 'CodeDeploy for Lambda and Beanstalk deployment policies.' },
    tw: { name: 'Three Watchers', partner: 'kr', what: 'CloudTrail, CloudWatch and X-Ray.' },
    kk: { name: 'Kettles and Aliases', partner: null, what: 'Lambda concurrency, versions and aliases.' }
  };
  T.RIVALS = ['dq', 'kr', 'sc', 'tw'];

  // ---- Pins. term: the real API, setting or name, shown under the test's stamp (Ladi, Nov 17: the AWS term beside
  // the result). type: the part of term typed once in his ledger, where the first setting in it isn't it (js/type-once.js).
  // back: the real rule, on the pin's back. q: the bank pattern its bill question is picked by. ----
  T.PINS = {
    sqs: { set: 'dq', name: 'SQS standard queue', type: 'VisibilityTimeout', term: 'ReceiveMessage → DeleteMessage · VisibilityTimeout', back: 'Pulled by one consumer, hidden while it works, deleted when done. At-least-once, best-effort order. Kept 4 days by default, up to 14.', q: /\bSQS\b(?![^.]*FIFO)|standard queue/i },
    fifo: { set: 'dq', name: 'SQS FIFO queue', type: 'MessageDeduplicationId', term: 'MessageGroupId · MessageDeduplicationId', back: 'Order kept within a message group. A duplicate is dropped inside the 5-minute deduplication interval.', q: /FIFO|message group|deduplication/i },
    sns: { set: 'dq', name: 'SNS topic', term: 'Publish → every subscription · FilterPolicy', back: 'Pushes every message to every subscriber. A filter policy narrows what a subscriber gets. Archive and replay: FIFO topics only.', q: /\bSNS\b|fan-?out|filter polic/i },
    eb: { set: 'dq', name: 'EventBridge rule', term: 'EventPattern → Targets (up to 5) · archive and replay', back: 'An event pattern matches the event\'s source or detail and sends it to up to 5 targets. An archive can replay events.', q: /EventBridge|event bus|event pattern/i },
    kds: { set: 'dq', name: 'Kinesis Data Stream', term: 'PartitionKey → shard · retention 24 h to 365 days', back: 'Records stay 24 hours by default, up to 365 days. Each consumer app reads the stream on its own. The partition key picks the shard.', q: /Kinesis|shard|partition key/i },

    enc: { set: 'kr', name: 'KMS Encrypt', term: 'kms:Encrypt, up to 4,096 bytes', back: 'Encrypts up to 4,096 bytes directly under a KMS key.', q: /\bKMS\b|\bEncrypt\b|key polic/i },
    dkey: { set: 'kr', name: 'KMS data key', term: 'kms:GenerateDataKey → Plaintext + CiphertextBlob', back: 'GenerateDataKey gives a key for large data. You keep its encrypted copy beside the data (envelope encryption).', q: /data key|envelope|GenerateDataKey/i },
    sm: { set: 'kr', name: 'Secrets Manager', term: 'Secrets Manager rotation · ReplicaRegions', back: 'Rotates secrets automatically and replicates them to other Regions. Charged per secret.', q: /Secrets Manager|rotat/i },
    pss: { set: 'kr', name: 'Parameter Store (standard)', term: 'Parameter Store Tier: Standard (4 KB, no charge)', back: 'No additional charge, up to 10,000 parameters a Region, 4 KB each. No policies, no rotation.', q: /Parameter Store|SecureString|\bSSM\b/i },
    psa: { set: 'kr', name: 'Parameter Store (advanced)', type: 'Advanced', term: 'Parameter Store Tier: Advanced (8 KB) · Policies', back: '8 KB values, charged. Parameter policies: Expiration, ExpirationNotification, NoChangeNotification. Still no rotation.', q: /Parameter Store|advanced parameter|parameter polic/i },

    canary: { set: 'sc', name: 'LambdaCanary10Percent5Minutes', type: 'LambdaCanary10Percent5Minutes', term: 'CodeDeployDefault.LambdaCanary10Percent5Minutes', back: 'CodeDeploy for Lambda: 10% of traffic first, the other 90% five minutes later.', q: /canary/i },
    linear: { set: 'sc', name: 'LambdaLinear10PercentEvery1Minute', type: 'LambdaLinear10PercentEvery1Minute', term: 'CodeDeployDefault.LambdaLinear10PercentEvery1Minute', back: 'CodeDeploy for Lambda: another 10% every minute until all traffic has moved.', q: /linear/i },
    allat: { set: 'sc', name: 'LambdaAllAtOnce', type: 'LambdaAllAtOnce', term: 'CodeDeployDefault.LambdaAllAtOnce', back: 'CodeDeploy for Lambda: all traffic moves at once.', q: /all[- ]at[- ]once|AllAtOnce/i },
    ebAll: { set: 'sc', name: 'Beanstalk: All at once', type: 'AllAtOnce', term: 'DeploymentPolicy: AllAtOnce', back: 'Every instance gets the new version at once. Fastest, with a short outage.', q: /all[- ]at[- ]once/i },
    rolling: { set: 'sc', name: 'Beanstalk: Rolling', type: 'Rolling', term: 'DeploymentPolicy: Rolling · BatchSize', back: 'A batch at a time. Capacity drops by a batch while it\'s out. No new instances.', q: /\brolling\b/i },
    rollb: { set: 'sc', name: 'Beanstalk: Rolling with additional batch', type: 'RollingWithAdditionalBatch', term: 'DeploymentPolicy: RollingWithAdditionalBatch', back: 'Launches an extra batch first, so capacity stays full. The old instances are then updated in place.', q: /additional batch|rolling with/i },
    immut: { set: 'sc', name: 'Beanstalk: Immutable', type: 'Immutable', term: 'DeploymentPolicy: Immutable', back: 'A fresh group of new instances in a separate Auto Scaling group. Roll back by dropping them.', q: /immutable/i },
    split: { set: 'sc', name: 'Beanstalk: Traffic splitting', type: 'TrafficSplitting', term: 'DeploymentPolicy: TrafficSplitting', back: 'New instances take a set percentage of traffic for an evaluation time (canary testing), then all or none.', q: /traffic splitting|traffic-splitting/i },

    trail: { set: 'tw', name: 'CloudTrail event history', term: 'CloudTrail LookupEvents: 90 days of management events', back: 'The last 90 days of management events: who called which API, and when. Data events are off by default.', q: /CloudTrail/i },
    trailD: { set: 'tw', name: 'CloudTrail data events', type: 'AWS::S3::Object', term: 'Trail event selectors: data events (AWS::S3::Object)', back: 'A trail set to log data events, such as S3 object reads, as well as management events.', q: /CloudTrail|data event/i },
    alarm: { set: 'tw', name: 'CloudWatch alarm', term: 'CloudWatch alarm: metric · Threshold · AlarmActions', back: 'Watches one metric and acts (for example, notifies) when it crosses a threshold.', q: /CloudWatch alarm|\balarm\b/i },
    logs: { set: 'tw', name: 'CloudWatch Logs Insights', type: 'bin(1h)', term: 'Logs Insights: filter … | stats count(*) by bin(1h)', back: 'Queries your log lines: filter, count, group by time.', q: /Logs Insights|log group|CloudWatch Logs/i },
    xann: { set: 'tw', name: 'X-Ray annotation', type: 'annotation.order_id', term: 'X-Ray annotation (indexed): annotation.order_id = "1234"', back: 'A key-value on a trace segment, indexed: filter expressions can search by it.', q: /X-Ray|annotation|trace/i },
    xmeta: { set: 'tw', name: 'X-Ray metadata', term: 'X-Ray metadata (not indexed)', back: 'A key-value of any type on a segment, kept with the trace but not indexed: you can\'t search by it.', q: /X-Ray|metadata|trace/i },

    resv: { set: 'kk', name: 'Reserved concurrency', term: 'ReservedConcurrentExecutions', back: 'A floor and a ceiling for one function, carved from the account pool. No extra charge. Doesn\'t warm anything.', q: /reserved concurrency/i },
    prov: { set: 'kk', name: 'Provisioned concurrency', term: 'ProvisionedConcurrentExecutions, on a version or alias', back: 'Execution environments initialised ahead of time, so no cold-start wait. Charged.', q: /provisioned concurrency|cold start/i },
    walias: { set: 'kk', name: 'Weighted alias', type: 'AdditionalVersionWeights', term: 'Alias RoutingConfig: AdditionalVersionWeights', back: 'An alias pointing at two published versions, splitting traffic by weight.', q: /\balias(es)?\b|weighted/i },
    ver: { set: 'kk', name: 'Published version', term: 'PublishVersion → my-fn:3', back: 'A snapshot of code and settings that can\'t change once published.', q: /\$LATEST|PublishVersion|unqualified|Lambda[^.]{0,120}\bversions?\b|\bversions?\b[^.]{0,120}\b(Lambda|alias)/i },
    latest: { set: 'kk', name: '$LATEST', term: '$LATEST (the unqualified function ARN)', back: 'The unpublished, editable code. Changes with every edit.', q: /\$LATEST|PublishVersion|unqualified|Lambda[^.]{0,120}\bversions?\b|\bversions?\b[^.]{0,120}\b(Lambda|alias)/i }
  };
  T.pinsOf = set => Object.keys(T.PINS).filter(id => T.PINS[id].set === set);

  // ---- The clasp (Ladi's gesture audit, Nov 17: "Check the clasp"). When you call his pin, it flips to show three
  // of its real properties; you tap the one that decides this job, then the hammer comes down. Each pin has 3 to 5
  // true properties: [chip text, the needs it decides]. Which needs a property decides is written once per property,
  // not per pin and job: the chip for a pin on a job is the pin's first property that decides the job's deciding
  // need (the need it fails, or its first need when it holds; that comes from the `ok` lists above), and the other
  // two chips are properties that decide none of the job's needs. tools/table_check.js checks every pin and job
  // that can be called has one. Same AWS docs as the header; numbers here are the real ones. ----
  const CLASP = {
    sqs: [['One consumer takes each message', 'fan one'], ['Waits to be pulled, then deleted (kept 4 to 14 days)', 'wait replay'],
      ['Best-effort order', 'order'], ['No routing: hands out whatever arrives', 'route'], ['At-least-once: a copy can arrive twice', 'dedup']],
    fifo: [['One consumer takes each message', 'fan one'], ['Waits to be pulled, then deleted', 'wait replay'],
      ['In order within a message group', 'order'], ['Drops a duplicate within 5 minutes', 'dedup'], ['No routing: hands out whatever arrives', 'route']],
    sns: [['Every subscriber gets its own copy', 'fan one'], ['Pushes at once: nothing waits to be pulled', 'wait'],
      ['Standard topic: keeps nothing once pushed', 'replay'], ['A filter policy narrows what each subscriber gets', 'route'], ['Standard topic: best-effort order', 'order']],
    eb: [['Sends to every target (up to 5 a rule)', 'fan one'], ['An archive can replay past events', 'replay'],
      ['Its event pattern matches the event\'s fields', 'route'], ['Pushes to targets as events arrive', 'wait'], ['No order promise', 'order']],
    kds: [['Every consumer app reads every record', 'fan one route'], ['Keeps records 24 h by default, up to 365 days', 'replay'],
      ['In order within a shard (by partition key)', 'order'], ['Consumers read at their own pace', 'wait'], ['No deduplication: a resent record is stored twice', 'dedup']],

    enc: [['Takes up to 4,096 bytes, in one call', 'big small'], ['Its KMS key\'s material rotates (yearly, once enabled)', 'rotate keyrot'],
      ['The key itself never leaves KMS', ''], ['Only the same KMS key can decrypt it', ''],
      ['Stores nothing: it returns ciphertext', 'region free warn']],
    dkey: [['Encrypts large data outside KMS', 'big'], ['Leaves an encrypted key to keep beside the data', 'small'],
      ['Made under a KMS key that can rotate yearly', 'keyrot rotate'], ['Erase the plaintext copy after use', ''],
      ['Stores nothing: you keep the copies', 'region free warn']],
    sm: [['Rotates secrets on a schedule', 'rotate keyrot'], ['Replicates secrets to other Regions', 'region'], ['Charged per secret', 'free'],
      ['No expiration-warning policy', 'warn'], ['Stores secrets; doesn\'t encrypt your files', 'big small']],
    pss: [['Values up to 4 KB', 'big small'], ['Lives in one Region', 'region'], ['No additional charge', 'free'], ['Takes no parameter policies', 'warn'],
      ['No automatic rotation', 'rotate keyrot']],
    psa: [['Values up to 8 KB', 'big small'], ['Charged per parameter', 'free'], ['Takes Expiration and notification policies', 'warn'],
      ['No automatic rotation', 'rotate keyrot'], ['Lives in one Region', 'region']],

    canary: [['10% first, the other 90% five minutes later', 'lcan llin lall'], ['CodeDeploy for Lambda, not a Beanstalk policy', 'full fast noNew drop ebcan'],
      ['Can roll back on a CloudWatch alarm', ''], ['Runs hook functions before and after the shift', '']],
    linear: [['Another 10% every minute', 'lcan llin lall'], ['CodeDeploy for Lambda, not a Beanstalk policy', 'full fast noNew drop ebcan'],
      ['Can roll back on a CloudWatch alarm', ''], ['Runs hook functions before and after the shift', '']],
    allat: [['All traffic moves in one step', 'lcan llin lall'], ['CodeDeploy for Lambda, not a Beanstalk policy', 'full fast noNew drop ebcan'],
      ['Can roll back on a CloudWatch alarm', ''], ['Runs hook functions before and after the shift', '']],
    ebAll: [['Every instance at once: fastest, short outage', 'fast full ebcan'], ['Updates the instances you have, launches none', 'noNew drop'],
      ['A Beanstalk policy, not CodeDeploy for Lambda', 'lcan llin lall'], ['Set as the environment\'s DeploymentPolicy', '']],
    rolling: [['Batch by batch: capacity dips by a batch', 'full fast ebcan'], ['Updates the instances you have, launches none', 'noNew drop full'],
      ['A Beanstalk policy, not CodeDeploy for Lambda', 'lcan llin lall'], ['Batch size is a count or a percentage', ''], ['Set as the environment\'s DeploymentPolicy', '']],
    rollb: [['Launches an extra batch first: full capacity', 'full noNew fast'], ['The old instances are then updated in place', 'drop'],
      ['Moves batch by batch, with no traffic split', 'ebcan'], ['A Beanstalk policy, not CodeDeploy for Lambda', 'lcan llin lall'], ['Set as the environment\'s DeploymentPolicy', '']],
    immut: [['A fresh group in a separate Auto Scaling group', 'full noNew fast'], ['The old instances never change', 'drop'],
      ['No traffic percentage to evaluate', 'ebcan'], ['A Beanstalk policy, not CodeDeploy for Lambda', 'lcan llin lall'], ['Set as the environment\'s DeploymentPolicy', '']],
    split: [['New instances come up beside the old ones', 'full noNew fast'], ['A share of traffic for an evaluation time', 'ebcan'],
      ['Rolls back by sending traffic to the old ones', 'drop'], ['A Beanstalk policy, not CodeDeploy for Lambda', 'lcan llin lall'], ['Set as the environment\'s DeploymentPolicy', '']],

    trail: [['Records each AWS API call: who, what, when', 'who page slow query find'], ['Data events (like S3 reads) are off by default', 'read'],
      ['Event history keeps the last 90 days', 'who'], ['Viewing event history costs nothing', ''],
      ['Event history shows one Region at a time', '']],
    trailD: [['Logs S3 object reads (data events)', 'read'], ['Logs management calls too: who, what, when', 'who page slow query find'],
      ['Data events are charged', ''], ['Delivers its log files to an S3 bucket', '']],
    alarm: [['Watches one metric against a threshold', 'page who read slow query find'], ['Can notify through an SNS topic', 'page'],
      ['States: OK, ALARM, INSUFFICIENT_DATA', ''], ['Can trigger Auto Scaling or EC2 actions', '']],
    xann: [['Indexed: filter expressions can search it', 'find'], ['Part of a trace through your services', 'slow who read page query'],
      ['A string, number or Boolean value', ''], ['Up to 50 indexed per trace', '']],
    xmeta: [['Not indexed: filters can\'t search it', 'find'], ['Part of a trace through your services', 'slow who read page query'],
      ['Any type, objects and arrays too', ''], ['Kept under a namespace', '']],
    logs: [['Queries your app\'s log lines', 'query read find who'], ['Each service\'s log group sits apart', 'slow'],
      ['Answers when you run it, not on its own', 'page'], ['Charged per GB of logs scanned', '']],

    prov: [['Initialised ahead: no cold-start wait', 'cold'], ['Charged while it\'s configured', 'nofee'], ['Can still scale past it on demand', 'cap'],
      ['Set on a version or alias, not $LATEST', ''], ['Concurrency: how many, not which code', 'pct fixed edit']],
    resv: [['A floor and a ceiling for one function', 'cap'], ['No extra charge', 'nofee'], ['Warms nothing: each one still starts cold', 'cold'],
      ['Set it to 0 and every call is throttled', ''], ['Concurrency: how many, not which code', 'pct fixed edit']],
    walias: [['Splits traffic between two versions by weight', 'pct'], ['Points at published versions only', 'fixed edit'],
      ['Has its own ARN to call', ''], ['Repointed without changing its callers', ''], ['Warms and fences nothing', 'cold cap nofee']],
    ver: [['Can\'t change once published', 'fixed edit'], ['One version takes every call made to it', 'pct'],
      ['Numbered in order: my-fn:1, :2, :3', ''], ['Has its own qualified ARN', ''], ['Warms and fences nothing', 'cold cap nofee']],
    latest: [['Changes with every edit', 'fixed edit'], ['Takes every call made to it', 'pct'],
      ['Called by the unqualified function ARN', ''], ['Can\'t take provisioned concurrency', ''], ['Warms and fences nothing', 'cold cap nofee']]
  };
  Object.keys(CLASP).forEach(id => {
    T.PINS[id].props = CLASP[id].map(([t, d], k) => ({ id: id + '.' + k, t, d: d ? d.split(' ') : [] }));
  });
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619); return h >>> 0; };
  // The clasp for his pin on a job: { need, decide, chips (3 prop ids in shown order), holds }. salt fixes which two
  // of the other properties show and the order (no draw from the night's seed). null if the data has no answer.
  T.clasp = function (pin, job, salt) {
    const P = T.PINS[pin], test = T.test(pin, job);
    if (!P || !P.props) return null;
    const need = test.ok ? job.needs[0] : test.lines.find(l => !l.ok).need;
    const dec = P.props.find(p => p.d.includes(need));
    const other = P.props.filter(p => !job.needs.some(n => p.d.includes(n)));
    if (!dec || other.length < 2) return null;
    const key = pin + '|' + job.needs.join('+') + '|' + (salt == null ? '' : salt);
    const two = other.slice().sort((a, z) => hash(key + a.id) - hash(key + z.id)).slice(0, 2);
    const chips = [dec].concat(two).sort((a, z) => hash(key + '/' + a.id) - hash(key + '/' + z.id)).map(p => p.id);
    return { need, decide: dec.id, chips, holds: test.ok };
  };
  T.prop = id => { const p = T.PINS[id.split('.')[0]]; return p && p.props ? p.props.find(x => x.id === id) || null : null; };

  // ---- Needs. t: the short name on the felt. w: three wordings (one is picked a board, so a phrase can't be
  // memorised to a service). ok: the pins that do it. lure: the look-alikes Kagemaru reaches for. why[pin]: what the
  // test shows for that pin (every pin in the set has a line). The first line of each `why` is the scene. ----
  const N = T.NEEDS = {};
  const need = (id, set, t, w, ok, lure, why) => { N[id] = { id, set, t, w, ok, lure, why }; };

  // Dupli-Queue
  need('fan', 'dq', 'Every guild, every order', [
    'Three guilds each need their own copy of every order.',
    'The bakers, the carters and the till must all hear about each order.',
    'One order in, and every team that cares gets it.'
  ], ['sns', 'eb', 'kds'], ['sqs', 'fifo'], {
    sqs: 'One guild pulls the order and the queue hides it from the rest. Two guilds stand there with nothing.',
    fifo: 'Still a queue: one guild takes each order. The others never see it.',
    sns: 'The bell rings once and all three guilds get their own copy.',
    eb: 'The rule sends the order to all three targets (a rule takes up to 5).',
    kds: 'Each guild reads the whole stream on its own, so all three see every order.'
  });
  need('replay', 'dq', 'Replay yesterday', [
    'Play yesterday\'s orders again into the new ledger.',
    'The new auditor wants to re-read every order since yesterday morning.',
    'A bug ate yesterday\'s totals: run the same orders through again.'
  ], ['kds', 'eb'], ['sns', 'sqs'], {
    sqs: 'Each order was deleted from the queue once it was handled. There\'s nothing left to play again.',
    fifo: 'Handled orders were deleted. A queue isn\'t a history.',
    sns: 'A standard topic keeps nothing once it has pushed. Archive and replay is for FIFO topics only.',
    eb: 'The archive on the bus replays yesterday\'s events.',
    kds: 'The stream still holds them (24 hours by default), so the new reader starts from yesterday.'
  });
  need('order', 'dq', 'In order, per customer', [
    'Each customer\'s orders must be handled in the order they were placed.',
    'Deposit, then withdrawal, per account, never the other way round.',
    'For each shopper, first order in is first order out.'
  ], ['fifo', 'kds'], ['sqs', 'sns'], {
    sqs: 'Best-effort order: the withdrawal arrives before the deposit.',
    fifo: 'Each customer is a message group, and the group comes out in order.',
    sns: 'A standard topic doesn\'t promise order. Two orders land swapped.',
    eb: 'The bus doesn\'t promise order. Two orders land swapped.',
    kds: 'The customer is the partition key, so their records share a shard and read in sequence.'
  });
  need('route', 'dq', 'Sort by what\'s inside', [
    'Send each order to a guild by what\'s written inside it.',
    'Pie orders to the bakers, cart orders to the carters, by the order\'s own fields.',
    'Only orders over 100 gold go to the guard.'
  ], ['eb', 'sns'], ['sqs', 'kds'], {
    sqs: 'A queue hands out whatever arrives. It has no routing.',
    fifo: 'A queue hands out whatever arrives, in order. It doesn\'t sort.',
    sns: 'Each guild\'s filter policy takes only the orders that match it.',
    eb: 'Each rule\'s pattern matches the order\'s fields and sends it to the right guild.',
    kds: 'Every reader gets every record. The stream doesn\'t sort.'
  });
  need('wait', 'dq', 'Wait till the baker\'s ready', [
    'The night baker pulls orders whenever he\'s ready, and they wait until then.',
    'The worker is offline for an hour. Nothing may be lost meanwhile.',
    'Orders pile up at noon and the one clerk works through them at his own pace.'
  ], ['sqs', 'fifo', 'kds'], ['sns', 'eb'], {
    sqs: 'The orders wait in the queue until he pulls them.',
    fifo: 'They wait in the queue, in order, until he pulls them.',
    sns: 'The topic pushes the moment it rings. Nothing waits on a topic for him to be ready.',
    eb: 'The rule pushes to its target as the event arrives. It doesn\'t hold them for him to pull.',
    kds: 'They wait in the stream, and he reads from where he left off.'
  });
  need('one', 'dq', 'One baker per order', [
    'Each order goes to exactly one of the five bakers, then comes off the board.',
    'Share the work: whichever clerk is free takes the next job, and nobody does it twice.',
    'Five workers, one pile of jobs, each job done by one of them.'
  ], ['sqs', 'fifo'], ['sns', 'kds'], {
    sqs: 'A free baker pulls the next order, works it and deletes it.',
    fifo: 'A free baker pulls the next order and deletes it when done.',
    sns: 'All five bakers are subscribers, so all five get every order. Five pies.',
    eb: 'Every target of the rule gets the event. Five pies.',
    kds: 'Every reader gets every record, and it stays in the stream until retention ends. Five pies.'
  });
  need('dedup', 'dq', 'Drop the double-click', [
    'A shopper double-clicks: the second copy must be dropped.',
    'The till sends the same order twice in one minute. Bake it once.',
    'A retry sends an order again with the same ID. Only one may count.'
  ], ['fifo'], ['sqs', 'kds'], {
    sqs: 'At-least-once: both copies get baked.',
    fifo: 'Same deduplication ID inside 5 minutes: the second copy is dropped.',
    sns: 'A standard topic pushes both copies.',
    eb: 'Both events match the rule, and both go out.',
    kds: 'Both records go in the stream, and the reader sees two.'
  });

  // Keyring
  need('big', 'kr', 'Lock a 2 MB scroll', [
    'Encrypt a 2 MB scroll of guild accounts.',
    'The 5 MB map must be stored encrypted.',
    'Encrypt each 1 MB backup before it leaves the vault.'
  ], ['dkey'], ['enc', 'pss'], {
    enc: 'Encrypt takes 4 KB at most. The scroll won\'t go in the slot.',
    dkey: 'A data key locks the whole scroll, and its encrypted copy is kept beside it.',
    sm: 'Secrets Manager keeps secrets. It doesn\'t encrypt your files.',
    pss: 'A standard parameter holds 4 KB. The scroll won\'t fit, and storing isn\'t encrypting.',
    psa: 'An advanced parameter holds 8 KB. The scroll won\'t fit, and storing isn\'t encrypting.'
  });
  need('small', 'kr', 'Seal a small token, nothing else to keep', [
    'Encrypt a 1 KB token directly under the KMS key, with no second key to store.',
    'Seal a short password under the master key itself, and keep nothing beside it.',
    'One small value, sealed by the KMS key in one call.'
  ], ['enc'], ['dkey'], {
    enc: 'One Encrypt call seals the token under the KMS key. Nothing else to keep.',
    dkey: 'It works, but now there\'s an encrypted data key to store beside the token.',
    sm: 'Secrets Manager stores a secret. The job is to encrypt one under the key.',
    pss: 'A parameter stores a value. The job is to encrypt one under the key.',
    psa: 'A parameter stores a value. The job is to encrypt one under the key.'
  });
  need('rotate', 'kr', 'Change the password by itself', [
    'Change the vault\'s database password every 30 days, with nobody touching it.',
    'The inn\'s database password must rotate on a schedule automatically.',
    'Nobody remembers to change the password. Make it change itself monthly.'
  ], ['sm'], ['psa', 'enc'], {
    enc: 'KMS rotates its own key material, not your database password.',
    dkey: 'A data key encrypts data. It doesn\'t change a database password.',
    sm: 'Rotation runs on schedule and the database gets the new password.',
    pss: 'Parameter Store has no rotation. The password sits unchanged.',
    psa: 'Policies can expire or warn about a value, but nothing changes the password. AWS points rotation at Secrets Manager.'
  });
  need('region', 'kr', 'Same secret in a second Region', [
    'The same password must be readable in a second Region.',
    'The backup site across the sea needs the same secret, kept in step.',
    'Copy the secret to another Region and keep it updated there.'
  ], ['sm'], ['pss', 'psa'], {
    enc: 'Encrypt doesn\'t store a password anywhere.',
    dkey: 'A data key doesn\'t store a password anywhere.',
    sm: 'Replication keeps a copy of the secret in the second Region.',
    pss: 'A parameter lives in one Region. Nothing copies it over.',
    psa: 'Advanced or not, a parameter lives in one Region. Nothing copies it over.'
  });
  need('free', 'kr', '200 settings, no extra bill', [
    'Store 200 plain settings, and the bill must not go up.',
    'Feature flags for every stall, at no additional charge.',
    'A few hundred small config values, kept for free.'
  ], ['pss'], ['psa', 'sm'], {
    enc: 'KMS encrypts. It doesn\'t store settings.',
    dkey: 'A data key encrypts. It doesn\'t store settings.',
    sm: 'Secrets Manager charges per secret. The bill goes up.',
    pss: 'Standard parameters, no additional charge.',
    psa: 'Advanced parameters are charged. The bill goes up.'
  });
  need('warn', 'kr', 'Warn before it expires', [
    'Warn me a week before this key\'s value expires.',
    'Tell the team before the API token runs out.',
    'Delete this value on New Year\'s Day, and warn us first.'
  ], ['psa'], ['pss', 'sm'], {
    enc: 'KMS has no expiry warning for a stored value.',
    dkey: 'A data key has no expiry warning.',
    sm: 'Secrets Manager\'s answer is rotation. It has no expiry-warning policy.',
    pss: 'Standard parameters can\'t take policies.',
    psa: 'An Expiration policy plus an ExpirationNotification warns first.'
  });
  need('keyrot', 'kr', 'New key material yearly', [
    'The encryption key\'s material must renew every year by itself.',
    'The master key used for encryption must rotate yearly with no code change.',
    'Auditors want the key behind our encryption renewed each year, automatically.'
  ], ['enc', 'dkey'], ['sm', 'psa'], {
    enc: 'Turn on automatic rotation (EnableKeyRotation) and the KMS key\'s material renews every 365 days by default. Old data still decrypts.',
    dkey: 'The data keys come from a KMS key. With automatic rotation on, its material renews every 365 days by default.',
    sm: 'Secrets Manager rotates secrets, not a KMS key\'s material.',
    pss: 'Parameter Store has no rotation of any kind.',
    psa: 'Policies don\'t rotate anything, and a parameter isn\'t a KMS key.'
  });

  // Shift Change (needs say which platform: the Lambda recipe or the Beanstalk inn)
  const notLambda = 'That\'s a Beanstalk policy. A Lambda function shifts traffic through CodeDeploy and its alias.';
  const notBean = 'That\'s a CodeDeploy setting for Lambda. A Beanstalk environment has its own deployment policies.';
  const lam = (o) => Object.assign({ ebAll: notLambda, rolling: notLambda, rollb: notLambda, immut: notLambda, split: notLambda }, o);
  const bean = (o) => Object.assign({ canary: notBean, linear: notBean, allat: notBean }, o);
  need('lcan', 'sc', 'Lambda: 10%, wait, then all', [
    'Lambda: send a tenth of the calls to the new recipe, wait five minutes, then the rest.',
    'Lambda: try the new version on 10% for five minutes before everyone.',
    'Lambda: a small taste first, a five-minute wait, then the whole room.'
  ], ['canary'], ['linear', 'split'], lam({
    canary: '10% for five minutes, then the other 90% in one move.',
    linear: 'A tenth every minute: it creeps over in ten steps, never waiting five minutes.',
    allat: 'Everyone gets the new recipe at once. No taste first.'
  }));
  need('llin', 'sc', 'Lambda: a tenth each minute', [
    'Lambda: move calls over in equal steps, a tenth each minute.',
    'Lambda: shift traffic slowly and evenly until it\'s all on the new version.',
    'Lambda: ten small steps, one a minute.'
  ], ['linear'], ['canary', 'rolling'], lam({
    canary: 'One 10% step, then a jump to all of it. Two steps, not ten.',
    linear: 'Another 10% every minute until it\'s all moved.',
    allat: 'One step: all of it.'
  }));
  need('lall', 'sc', 'Lambda test stage: switch now', [
    'Lambda, test stage: switch every call to the new version at once.',
    'Lambda: nobody\'s using the dev stage. Move it all now.',
    'Lambda: no waiting, no steps, all traffic now.'
  ], ['allat'], ['canary', 'ebAll'], lam({
    canary: 'It waits five minutes on 10% first.',
    linear: 'It takes ten minutes of steps.',
    allat: 'All traffic moves at once.'
  }));
  need('full', 'sc', 'Beanstalk: full strength throughout', [
    'Beanstalk: keep full capacity serving the whole time.',
    'Beanstalk: the inn may not lose a single bed while the new version goes out.',
    'Beanstalk: no drop in serving capacity during the deploy.'
  ], ['rollb', 'immut', 'split'], ['rolling', 'ebAll'], bean({
    ebAll: 'Every instance restarts at once: a short outage.',
    rolling: 'Each batch goes out of service in turn, so capacity dips by a batch.',
    rollb: 'An extra batch launches first, so capacity stays full.',
    immut: 'A whole new group comes up beside the old one. Full strength throughout.',
    split: 'New instances come up beside the old ones and take a share. Full strength throughout.'
  }));
  need('fast', 'sc', 'Beanstalk dev box: fastest', [
    'Beanstalk dev box: the fastest deploy, and a short outage is fine.',
    'Beanstalk: it\'s only the test inn. Quickest way, downtime allowed.',
    'Beanstalk: speed over safety, nobody\'s watching this one.'
  ], ['ebAll'], ['rolling', 'allat'], bean({
    ebAll: 'Every instance at once: the quickest, with a short outage.',
    rolling: 'Batch by batch. Safer, slower.',
    rollb: 'An extra batch, then batch by batch. Slower still.',
    immut: 'A whole new group first. The slowest.',
    split: 'New instances plus an evaluation wait. Slow.'
  }));
  need('noNew', 'sc', 'Beanstalk: no extra instances', [
    'Beanstalk: the instance quota is full. Launch nothing new, a dip in capacity is fine.',
    'Beanstalk: you can\'t add a single server during the deploy.',
    'Beanstalk: update the servers you already have, no new ones.'
  ], ['rolling', 'ebAll'], ['rollb', 'immut'], bean({
    ebAll: 'It updates the instances you have, all at once. Nothing new.',
    rolling: 'It updates the instances you have, a batch at a time. Nothing new.',
    rollb: 'It launches an extra batch first. The quota says no.',
    immut: 'It launches a whole new group. The quota says no.',
    split: 'It launches new instances for the split. The quota says no.'
  }));
  need('drop', 'sc', 'Beanstalk: undo by throwing away', [
    'Beanstalk: if it goes wrong, roll back by throwing away the new instances. The old ones must never change.',
    'Beanstalk: the old servers stay untouched until the new ones prove healthy.',
    'Beanstalk: a bad deploy must leave the running servers exactly as they were.'
  ], ['immut', 'split'], ['rollb', 'rolling'], bean({
    ebAll: 'Every running instance was changed. Rolling back means deploying again.',
    rolling: 'The running instances were updated in place. Rolling back means deploying again.',
    rollb: 'Only the extra batch is new. The old instances are then updated in place.',
    immut: 'The new group is dropped and the old one never changed.',
    split: 'Traffic goes back to the old instances and the new ones are dropped.'
  }));
  need('ebcan', 'sc', 'Beanstalk: 10% of guests, then decide', [
    'Beanstalk: send 10% of guests to the new version for an evaluation window, then decide.',
    'Beanstalk: a canary test, a share of real traffic first.',
    'Beanstalk: let a fifth of the guests try it for 15 minutes.'
  ], ['split'], ['immut', 'canary'], bean({
    ebAll: 'Everyone gets it at once. No share, no window.',
    rolling: 'Batches go over, but there\'s no traffic percentage or evaluation window.',
    rollb: 'Batches go over, but there\'s no traffic percentage or evaluation window.',
    immut: 'The new group takes everyone once it\'s healthy. No percentage.',
    split: 'A set share of guests goes to the new instances for the evaluation time.'
  }));

  // Three Watchers
  need('who', 'tw', 'Who deleted the table?', [
    'Who deleted the orders table at 3 a.m.?',
    'Someone changed the bucket\'s policy last week. Who?',
    'Which user stopped the inn\'s server on Tuesday?'
  ], ['trail', 'trailD'], ['alarm', 'xann'], {
    trail: 'The event history has the call, the user and the time.',
    trailD: 'The trail logs management events too: the call, the user and the time.',
    alarm: 'The alarm shows a metric fell. It doesn\'t know who did it.',
    logs: 'Your app\'s log lines don\'t record calls made to AWS itself.',
    xann: 'A trace follows a request through your app. The delete call isn\'t in it.',
    xmeta: 'A trace follows a request through your app. The delete call isn\'t in it.'
  });
  need('read', 'tw', 'Who read the file?', [
    'Who downloaded the secret plans from the bucket?',
    'Which role read each object in the archive bucket?',
    'Log every read of the files in the vault bucket.'
  ], ['trailD'], ['trail', 'logs'], {
    trail: 'Reading an object is a data event, and those are off by default. The history is empty.',
    trailD: 'Data events are on, so each read is logged with who did it.',
    alarm: 'An alarm counts. It doesn\'t say who.',
    logs: 'Your app\'s log lines don\'t see reads made straight to the bucket.',
    xann: 'A trace covers your app\'s requests, not someone reading the bucket directly.',
    xmeta: 'A trace covers your app\'s requests, not someone reading the bucket directly.'
  });
  need('slow', 'tw', 'Which hop is slow?', [
    'The order page is slow. Which hop on its path is it?',
    'Find which service in the chain adds the two seconds.',
    'A request crosses five services. Show where its time goes.'
  ], ['xann', 'xmeta'], ['alarm', 'logs'], {
    trail: 'CloudTrail records API calls, not how long each hop took.',
    trailD: 'CloudTrail records API calls, not how long each hop took.',
    alarm: 'The alarm says it\'s slow. Not where.',
    logs: 'Each service\'s lines sit apart. Nothing joins them into one request\'s path.',
    xann: 'The trace and its service map show the slow hop.',
    xmeta: 'The trace and its service map show the slow hop.'
  });
  need('page', 'tw', 'Wake me on errors', [
    'Wake me when errors pass 5 a minute.',
    'Page the on-call when the error rate climbs.',
    'Ring the bell if the queue\'s backlog stays high for 10 minutes.'
  ], ['alarm'], ['logs', 'trail'], {
    trail: 'CloudTrail records calls. It doesn\'t page anyone on a threshold.',
    trailD: 'CloudTrail records calls. It doesn\'t page anyone on a threshold.',
    alarm: 'The metric crosses the threshold and the alarm notifies.',
    logs: 'A query answers when you run it. Nobody runs it at 3 a.m.',
    xann: 'Traces show requests. They don\'t page anyone.',
    xmeta: 'Traces show requests. They don\'t page anyone.'
  });
  need('find', 'tw', 'Find traces by order ID', [
    'Find every trace for order 1234.',
    'Search the traces for customer "Bram".',
    'Filter traces down to the ones for the Burning Peak stall.'
  ], ['xann'], ['xmeta', 'logs'], {
    trail: 'CloudTrail has API calls, not your request traces.',
    trailD: 'CloudTrail has API calls, not your request traces.',
    alarm: 'An alarm watches a number. It can\'t search traces.',
    logs: 'Logs Insights searches log lines, not traces.',
    xann: 'The order ID is an annotation, so a filter expression finds its traces.',
    xmeta: 'The order ID is in metadata, which isn\'t indexed. The filter finds nothing.'
  });
  need('query', 'tw', 'Count last night\'s errors', [
    'Search last night\'s app logs for "timeout" and count them by hour.',
    'How many "card declined" lines did the till write yesterday?',
    'Group the error lines by stall and show the top five.'
  ], ['logs'], ['alarm', 'xmeta'], {
    trail: 'CloudTrail has API calls, not your app\'s log lines.',
    trailD: 'CloudTrail has API calls, not your app\'s log lines.',
    alarm: 'An alarm watches a metric. It doesn\'t search lines.',
    logs: 'A Logs Insights query filters the lines and counts them by hour.',
    xann: 'Traces aren\'t your log lines.',
    xmeta: 'Traces aren\'t your log lines.'
  });

  // Kettles and Aliases
  need('cold', 'kk', 'No cold kettles at 9', [
    'No cold-start wait at the 9 a.m. rush.',
    'The first calls of the morning must be as quick as the rest.',
    'The kettles must already be hot when the doors open.'
  ], ['prov'], ['resv'], {
    resv: 'Reserved stools guarantee room, but each one still starts cold.',
    prov: 'The environments were initialised ahead of time. Hot from the first call.',
    walias: 'Routing between versions doesn\'t warm anything.',
    ver: 'A version is a snapshot. It doesn\'t warm anything.',
    latest: '$LATEST is just the editable code. It doesn\'t warm anything.'
  });
  need('cap', 'kk', 'Five stools, no more, no less', [
    'The report job must never take more than 5 from the shared pool, and must always get its 5.',
    'Keep the noisy function to 5 at most, and keep 5 for it.',
    'Fence off exactly 5 for the night clerk.'
  ], ['resv'], ['prov'], {
    resv: 'Reserved concurrency of 5: a floor and a ceiling.',
    prov: 'Provisioned concurrency keeps 5 warm, but doesn\'t stop it taking more.',
    walias: 'An alias routes traffic. It doesn\'t fence concurrency.',
    ver: 'A version doesn\'t fence concurrency.',
    latest: '$LATEST doesn\'t fence concurrency.'
  });
  need('nofee', 'kk', 'Keep room, pay nothing', [
    'Guarantee the function room in the pool without paying extra.',
    'Hold capacity back for checkout, at no extra charge.',
    'Make sure the till always has room, free.'
  ], ['resv'], ['prov'], {
    resv: 'Reserved concurrency costs nothing extra.',
    prov: 'Provisioned concurrency is charged.',
    walias: 'An alias doesn\'t hold capacity.',
    ver: 'A version doesn\'t hold capacity.',
    latest: '$LATEST doesn\'t hold capacity.'
  });
  need('pct', 'kk', '5% to the new recipe', [
    'Send 5% of calls to the new recipe.',
    'Let one guest in twenty try version 4.',
    'Split the traffic, a little to the new code, the rest to the old.'
  ], ['walias'], ['ver', 'latest'], {
    resv: 'Concurrency doesn\'t split traffic.',
    prov: 'Concurrency doesn\'t split traffic.',
    walias: 'The alias sends 5% to version 4 and 95% to version 3.',
    ver: 'One version takes every call.',
    latest: '$LATEST takes every call.'
  });
  need('fixed', 'kk', 'Run exactly what we tested', [
    'Prod must run exactly the code we tested, even after someone edits the function.',
    'Lock prod to the build the testers signed off.',
    'An edit in the console must not change what prod runs.'
  ], ['ver', 'walias'], ['latest'], {
    resv: 'Concurrency says how many, not which code.',
    prov: 'Concurrency says how many, not which code.',
    walias: 'This alias points at two published versions, and those can\'t change.',
    ver: 'A published version can\'t change. The edit doesn\'t touch it.',
    latest: '$LATEST is the edit. Prod changes with it.'
  });
  need('edit', 'kk', 'Try the edit right now', [
    'Run the edit you just saved, before publishing anything.',
    'Test the unpublished code in the console this minute.',
    'Call the newest code, the one nobody has published yet.'
  ], ['latest'], ['ver'], {
    resv: 'Concurrency says how many, not which code.',
    prov: 'Concurrency says how many, not which code.',
    walias: 'The alias points at published versions, not the unpublished edit.',
    ver: 'A published version is older than the edit.',
    latest: '$LATEST is the unpublished edit.'
  });
  T.needsOf = set => Object.keys(N).filter(id => N[id].set === set);

  // ---- The test: does this pin do this job? A job has one need (an edge) or two (a chalked square). ----
  T.holds = (pin, need) => N[need].ok.includes(pin);
  T.test = function (pin, job) {
    const lines = job.needs.map(n => ({ need: n, ok: T.holds(pin, n), line: N[n].why[pin] || (T.PINS[pin].name + ' isn\'t made for this.') }));
    return { ok: lines.every(l => l.ok), lines };
  };
  // Every pin that does a whole job.
  T.holders = job => Object.keys(T.PINS).filter(p => job.needs.every(n => T.holds(p, n)));

  // ---- Seeded randomness, kept in the night (mulberry32) ----
  T.rng = function (st) {
    return () => {
      st.seed = (st.seed + 0x6D2B79F5) >>> 0;
      let t = st.seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  const shuffle = (a, R) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---- The board ----
  T.LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  T.SQ = ['top-left', 'top-middle', 'top-right', 'left edge', 'centre', 'right edge', 'bottom-left', 'bottom-middle', 'bottom-right'];
  T.HARD = [4, 0, 8, 2, 6];            // centre and corners: two needs each, and they count HARDW at the final count
  T.HARDW = 2;
  T.HONEST = 0.45;                      // the share of his stock that's genuine (tuned in tools/duel_table_sim.js)
  T.HAND = 4;
  const cnt = (c, l, w) => l.filter(i => c[i] === w).length;

  // Two needs that one pin can do together, and that some other pin does only half of (a real look-alike).
  T.pairs = function (set) {
    const ns = T.needsOf(set), out = [];
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
      const job = { needs: [ns[i], ns[j]] }, h = T.holders(job);
      const half = T.pinsOf(set).filter(p => !h.includes(p) && (T.holds(p, ns[i]) || T.holds(p, ns[j])));
      if (h.length && half.length) out.push([ns[i], ns[j]]);
    }
    return out;
  };
  // The nine jobs. Night 1 is the lead set alone; after that the centre, two corners and two edges are the lead set,
  // the other two corners and two edges the partner set. Needs go round a shuffled list, so no need repeats until
  // the set's needs have all been used.
  T.jobs = function (lead, partner, R) {
    const sets = Array(9).fill(lead);
    if (partner) [2, 6, 5, 7].forEach(i => { sets[i] = partner; });
    const singles = {}, doubles = {};
    const nextSingle = set => { if (!singles[set] || !singles[set].length) singles[set] = shuffle(T.needsOf(set).slice(), R); return singles[set].pop(); };
    const nextDouble = set => { if (!doubles[set] || !doubles[set].length) doubles[set] = shuffle(T.pairs(set).slice(), R); return doubles[set].pop(); };
    return sets.map((set, i) => {
      const needs = T.HARD.includes(i) ? nextDouble(set) : [nextSingle(set)];
      return { set, needs, w: needs.map(() => Math.floor(R() * 3)) };
    });
  };
  // His stock: one pin dealt for each square at the start of the board, genuine with chance HONEST, otherwise a
  // look-alike (for a chalked square, a pin that does exactly one of its two needs). It's dealt before you play and
  // shown in his ledger afterwards: no roll at test time.
  T.stockFor = function (job, R, honest) {
    const h = T.holders(job);
    if (R() < honest && h.length) return { pin: h[Math.floor(R() * h.length)], real: true };
    let l;
    if (job.needs.length > 1) l = T.pinsOf(job.set).filter(p => !h.includes(p) && job.needs.some(n => T.holds(p, n)));
    else l = N[job.needs[0]].lure.filter(p => !h.includes(p));
    if (!l.length) l = T.pinsOf(job.set).filter(p => !h.includes(p));
    return { pin: l[Math.floor(R() * l.length)], real: false };
  };

  // His square: his winning square, else block your two-in-a-line, else a square that gives him two in a line, else
  // the square on the most lines he can still win. Ties break by the seed, rolled when the board changes.
  T.rule = function (c) {
    const empty = c.map((x, i) => (x ? -1 : i)).filter(i => i >= 0);
    if (!empty.length) return { step: 0, squares: [] };
    const on = (i, f) => T.LINES.some(l => l.includes(i) && f(l));
    const win = empty.filter(i => on(i, l => cnt(c, l, 'him') === 2 && cnt(c, l, 'me') === 0));
    if (win.length) return { step: 1, squares: win };
    const block = empty.filter(i => on(i, l => cnt(c, l, 'me') === 2 && cnt(c, l, 'him') === 0));
    if (block.length) return { step: 2, squares: block };
    const threat = empty.filter(i => on(i, l => cnt(c, l, 'him') === 1 && cnt(c, l, 'me') === 0));
    const live = i => T.LINES.filter(l => l.includes(i) && cnt(c, l, 'me') === 0).length;
    const pool = threat.length ? threat : empty, top = Math.max(...pool.map(live));
    return { step: threat.length ? 3 : 4, squares: pool.filter(i => live(i) === top) };
  };
  T.STEP = ['', 'his winning square', 'a square that blocks your two in a line', 'a square that gives him two in a line', 'the square on the most lines he can still win'];
  T.line = (c, w) => T.LINES.find(l => cnt(c, l, w) === 3) || null;

  // ---- A night: the state the screen and the simulator share ----
  // phase: pick → board → bill → (counter → board → bill → rack) → done
  // One new thing a night: 1 Dupli-Queue alone, one board · 2 a partner set mixed in, a pick of two rivals ·
  // 3 two boards, the counter-pick and the Counterfeit Rack · 4 your weakest set (by the bill) is always offered ·
  // 5 the house edge: after a won Cup he opens on the centre.
  T.newNight = function (o) {
    o = o || {};
    const n = o.night || 1;
    return {
      v: 2, n, seed: (o.seed == null ? 1 : o.seed) >>> 0, phase: 'pick', boards: [], score: [0, 0], b: null, rack: null,
      honest: o.honest == null ? T.HONEST : o.honest, owed: [], bill: null, log: [], taught: Object.assign({}, o.taught || {}),
      offers: null, counter: null, secs: 0, carry: (o.carry || []).slice(), edge: !!o.edge, weak: (o.weak || []).slice()
    };
  };
  T.boardsTonight = s => (s.n >= 3 ? 2 : 1);
  T.partnerFor = (s, lead) => (s.n === 1 ? null : T.SETS[lead].partner);
  // Two rivals to pick from: night 1 is Dupli-Queue (the set the Sorting Floor already taught); then two by seed.
  // From night 4 the first offer is the set your bill says you're weakest on (s.weak, weakest first).
  T.offers = function (s, not) {
    if (s.n === 1 && !s.boards.length) return ['dq'];
    const R = T.rng(s), pool = shuffle(T.RIVALS.filter(r => !(not || []).includes(r)), R);
    const weak = s.n >= 4 ? (s.weak || []).find(r => pool.includes(r)) : null;
    if (weak) return [weak].concat(pool.filter(r => r !== weak)).slice(0, 2);
    return pool.slice(0, 2);
  };
  T.startBoard = function (s, lead) {
    const R = T.rng(s), partner = T.partnerFor(s, lead);
    const jobs = T.jobs(lead, partner, R);
    const stock = jobs.map(j => T.stockFor(j, R, s.honest));
    const pins = shuffle(T.pinsOf(lead).concat(partner ? T.pinsOf(partner) : []), R);
    const b = {
      lead, partner, jobs, stock, cells: Array(9).fill(null), pins: Array(9).fill(null), state: Array(9).fill(null),
      deck: pins, disc: [], hand: [], open: -1, next: -1, turns: 0, res: null, tests: []
    };
    T.draw(b, R);
    s.b = b; s.phase = 'board';
    // The house edge (from night 5): after a won Cup he opens the night already holding the centre, genuine.
    if (s.n >= 5 && s.edge && !s.boards.length) {
      const h = T.holders(jobs[4]);
      b.stock[4] = { pin: h[0], real: true };
      b.cells[4] = 'him'; b.pins[4] = h[0]; b.state[4] = 'stood'; b.edge = 1;
    }
    T.hisMove(s);
    return b;
  };
  T.draw = function (b, R) {
    while (b.hand.length < T.HAND) {
      if (!b.deck.length) { if (!b.disc.length) break; b.deck = shuffle(b.disc.splice(0), R); }
      // Never two of the same pin in hand.
      const i = b.deck.findIndex(p => !b.hand.includes(p));
      if (i < 0) break;
      b.hand.push(b.deck.splice(i, 1)[0]);
    }
  };
  // His square for the shown hand: rolled once and kept until the board changes under it.
  T.nextSq = function (s, b) {
    const r = T.rule(b.cells);
    if (!r.squares.length) return (b.next = -1);
    if (!r.squares.includes(b.next)) b.next = r.squares[Math.floor(T.rng(s)() * r.squares.length)];
    return b.next;
  };
  // He lays his stock pin face up on his square. It stands as his piece unless you call it.
  T.hisMove = function (s) {
    const b = s.b, sq = T.nextSq(s, b);
    if (sq < 0) return -1;
    b.cells[sq] = 'him'; b.pins[sq] = b.stock[sq].pin; b.state[sq] = 'open'; b.open = sq; b.next = -1;
    return sq;
  };
  // Your move. act: { call: true, clasp, chips, salt } or { pin, sq }. clasp: the property id you tapped on his
  // flipped pin (T.clasp). Returns { kind, sq, pin, ok, test, real, clasp }.
  T.act = function (s, act) {
    const b = s.b, R = T.rng(s);
    let out;
    if (act.stand) {
      // Only when there's nowhere left to place: his last pin stands untested.
      if (b.open >= 0) b.state[b.open] = 'stood';
      b.open = -1; b.turns++;
      return { kind: 'stand' };
    }
    if (act.call) {
      const sq = b.open, pin = b.pins[sq], test = T.test(pin, b.jobs[sq]);
      if (!test.ok) { b.cells[sq] = 'me'; b.state[sq] = 'cracked'; }
      else b.state[sq] = 'held';
      out = { kind: 'call', sq, pin, ok: !test.ok, test, real: test.ok };
      // The clasp you picked before the hammer. A wrong pick on a fake puts the pin on the bill (last in line); a
      // wrong call is on it already.
      const cl = act.clasp ? T.clasp(pin, b.jobs[sq], act.salt) : null;
      if (cl) {
        out.clasp = { pick: act.clasp, decide: cl.decide, chips: act.chips || cl.chips, need: cl.need, right: act.clasp === cl.decide };
        if (!out.clasp.right && !test.ok) s.owed.push({ pin, job: b.jobs[sq], why: 'clasp' });
      }
      if (test.ok) {
        s.owed.push({ pin, job: b.jobs[sq], why: 'call' });
        // Calling an honest pin costs you: he helps himself to his next square as well (its pin stands, untested).
        b.open = -1;
        const x = T.nextSq(s, b);
        if (x >= 0 && !T.line(b.cells, 'him')) { b.cells[x] = 'him'; b.pins[x] = b.stock[x].pin; b.state[x] = 'stood'; b.next = -1; out.extra = x; }
      }
    } else {
      const { pin, sq } = act;
      if (b.cells[sq] || !b.hand.includes(pin)) return null;
      // His last pin stands: it was never called.
      if (b.open >= 0) b.state[b.open] = 'stood';
      const test = T.test(pin, b.jobs[sq]);
      b.pins[sq] = pin;
      if (test.ok) { b.cells[sq] = 'me'; b.state[sq] = 'mine'; }
      else { b.cells[sq] = 'him'; b.state[sq] = 'failed'; s.owed.push({ pin, job: b.jobs[sq], why: 'place' }); }
      b.hand.splice(b.hand.indexOf(pin), 1); b.disc.push(pin);
      T.draw(b, R);
      out = { kind: 'place', sq, pin, ok: test.ok, test };
    }
    b.open = -1; b.turns++;
    b.tests.push({ kind: out.kind, sq: out.sq, pin: out.pin, ok: out.ok, needs: b.jobs[out.sq].needs });
    s.log.push(Object.assign({ bi: s.boards.length, kind: out.kind, pin: out.pin, needs: b.jobs[out.sq].needs, ok: out.ok, set: b.jobs[out.sq].set },
      out.clasp ? { clasp: out.clasp.right ? 1 : 0 } : {}));
    return out;
  };
  // A line of his counts only once you've answered his last pin (you may still call it and break the line).
  T.decide = function (s) {
    const b = s.b, c = b.cells.slice();
    if (b.open >= 0) c[b.open] = null;
    if (T.line(c, 'him')) return 'him';
    if (T.line(b.cells, 'me')) return 'me';
    if (b.cells.every(Boolean) && b.open < 0) return T.count(b, 'me') > T.count(b, 'him') ? 'me' : 'him';
    return null;
  };
  T.count = (b, w) => b.cells.reduce((a, x, i) => a + (x === w ? (T.HARD.includes(i) ? T.HARDW : 1) : 0), 0);
  // After your move: decide, else his move, else decide again (a full board can end on his last pin only after
  // you've had the chance to call it).
  T.after = function (s) {
    let who = T.decide(s);
    if (!who && T.hisMove(s) < 0) who = T.decide(s) || (T.count(s.b, 'me') > T.count(s.b, 'him') ? 'me' : 'him');
    if (!who) who = T.decide(s);
    if (who) T.endBoard(s, who);
    return who;
  };
  // His stock that stood uncalled and was fake: shown cracked in his ledger after the board (information, no change).
  T.audit = b => b.cells.map((x, i) => (x === 'him' && b.state[i] === 'stood' && !b.stock[i].real && b.pins[i] === b.stock[i].pin ? i : -1)).filter(i => i >= 0);
  T.endBoard = function (s, who) {
    const b = s.b;
    if (b.open >= 0) b.state[b.open] = 'stood';
    b.res = who; b.byCount = !T.line(b.cells, who) ? 1 : 0;
    s.score[who === 'me' ? 0 : 1]++;
    const missed = T.audit(b);
    missed.forEach(i => s.owed.push({ pin: b.pins[i], job: b.jobs[i], why: 'stood' }));
    s.boards.push({ lead: b.lead, partner: b.partner, res: who, byCount: b.byCount, stood: missed.length,
      fakes: b.stock.filter(x => !x.real).length });
    s.phase = 'bill';
    s.bill = T.billFor(s);
    return who;
  };
  // The bill: up to 3 things owed (a wrong call first, then a failed pin, then a fake you let stand, then a missed clasp), and if fewer than
  // two are owed, one on a pin that held. Each becomes one bank question (picked by the pin's pattern).
  T.BILL = 3;
  T.billFor = function (s) {
    const bi = s.boards.length - 1, rank = { call: 0, place: 1, stood: 2, clasp: 3 };
    const owed = s.owed.splice(0).sort((a, z) => rank[a.why] - rank[z.why]);
    const items = [];
    const seen = new Set();
    owed.forEach(o => { if (items.length < T.BILL && !seen.has(o.pin)) { seen.add(o.pin); items.push({ pin: o.pin, needs: o.job.needs, why: o.why }); } });
    if (items.length < 2) {
      const held = s.log.filter(l => l.bi === bi && l.ok && !seen.has(l.pin));
      if (held.length) items.push({ pin: held[held.length - 1].pin, needs: held[held.length - 1].needs, why: 'held' });
    }
    return { items, i: 0, res: [] };
  };
  // One bill question answered: { ok, conf }. Returns the next phase once the bill is paid.
  T.paid = function (s, r) {
    const L = s.bill;
    L.res.push({ pin: L.items[L.i] && L.items[L.i].pin, ok: !!(r && r.ok), conf: r ? r.conf | 0 : 0 });
    L.i++;
    if (L.i < L.items.length) return 'bill';
    return T.afterBill(s);
  };
  T.afterBill = function (s) {
    if (T.boardsTonight(s) === 1 || s.score[0] === 2 || s.score[1] === 2) return (s.phase = 'done');
    if (s.boards.length === 2) { T.startRack(s); return s.phase; }
    s.counter = T.counter(s);
    return (s.phase = 'counter');
  };
  // The loser counter-picks: you pick from 2, or he picks the set you held least of.
  T.counter = function (s) {
    const last = s.boards[s.boards.length - 1];
    if (last.res === 'him') return { who: 'me', offers: T.offers(s, [last.lead]) };
    const rate = set => { const l = s.log.filter(x => x.set === set); return l.length ? l.filter(x => x.ok).length / l.length : 0.6; };
    const pool = T.RIVALS.filter(r => r !== last.lead).sort((a, z) => rate(a) - rate(z));
    return { who: 'him', pick: pool[0] };
  };
  // The Counterfeit Rack (at one board each): four jobs from tonight's sets, four of his pins at once, two of them
  // genuine. Mark each genuine or fake, then they test together. Three of four right wins the Cup. After minute 14,
  // one pin decides.
  T.startRack = function (s, sudden) {
    const R = T.rng(s), sets = s.boards.map(x => x.lead);
    const n = sudden || s.secs > 14 * 60 ? 1 : T.RACK, jobs = [];
    for (let k = 0; k < n; k++) {
      const set = sets[k % sets.length], ns = shuffle(T.needsOf(set).slice(), R);
      const need = ns.find(x => !jobs.some(j => j.needs[0] === x)) || ns[0];
      jobs.push({ set, needs: [need], w: [Math.floor(R() * 3)] });
    }
    // Exactly half genuine, so marking every pin one way can't reach the 3 of 4 that wins.
    const real = shuffle(jobs.map((j, i) => i < n / 2), R);
    const stock = n === 1 ? [T.stockFor(jobs[0], R, 0.5)] : jobs.map((j, i) => T.stockFor(j, () => (real[i] ? 0 : 0.99), real[i] ? 1 : 0));
    s.rack = { jobs, stock, marks: Array(n).fill(null), need: n === 1 ? 1 : n - 1, done: false, right: 0 };
    s.phase = 'rack';
    return s.rack;
  };
  T.RACK = 4;
  // marks: [true = genuine, false = fake]. Returns { right, won, tests }.
  T.settleRack = function (s, marks) {
    const K = s.rack;
    K.marks = marks.slice();
    const tests = K.jobs.map((j, i) => T.test(K.stock[i].pin, j));
    K.right = tests.filter((t, i) => t.ok === marks[i]).length;
    K.done = true;
    const won = K.right >= K.need;
    s.score[won ? 0 : 1]++;
    tests.forEach((t, i) => { if (t.ok !== marks[i]) s.carry.push({ pin: K.stock[i].pin, needs: K.jobs[i].needs }); });
    s.phase = 'done';
    return { right: K.right, won, tests };
  };
  T.cupWon = s => s.score[0] > s.score[1];

  // ---- Taught by first use (L9): one line from Kagemaru the first time each thing happens, once per save ----
  T.TEACH = {
    first: 'Each square is a job. Lay one of your pins on a job it really does, or call my last pin if you think it can\'t.',
    hold: 'It held. The job got done, so the square is yours.',
    fail: 'Cracked. That pin can\'t do that job, so I\'ll help myself to the square.',
    callFake: 'You called it, and it cracked. My fake, your square. How rude.',
    callReal: 'It held. Genuine stock. Calling an honest man costs you: I\'ll take another square for the insult.',
    stood: 'You let one of my fakes stand. It stays mine. My ledger will show you which.',
    chalk: 'The chalked squares carry two needs. Your pin must do both, and they count double at the end.',
    line: 'Three of mine in a line. Unless you think one of them is a fake.',
    clasp: 'Before my hammer, show me the clasp: the one thing about this pin that decides the job. The other two are true, and beside the point.'
  };
  T.teach = function (s, key) {
    if (s.taught[key]) return '';
    s.taught[key] = 1;
    return T.TEACH[key];
  };

  if (root && root.SD) root.SD.table = T;
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})(typeof window !== 'undefined' ? window : globalThis);
