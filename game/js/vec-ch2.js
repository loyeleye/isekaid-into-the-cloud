// The vector proof of concept's chapter 2 slice, "The Mailroom": the cold open on a new moon, the edge and the tower,
// the scrap field where the camp begins (Coo and Elder Wren restored from old versions, Seymour's tape, the Free
// Cloud named), Thornwick's town floor and Freya's free offer, Expedition I (the Sorting Floors: Intake and Fan-out,
// two raid floors), then camp: Pip's question, the first Ship It, and Coo's quest, whose Plot Device lifts Nothing
// Arrives. It ends on a "to be continued" card. It opens from chapter 1's end card, which calls SD.chapterStart[2].
// The story follows the Story Bible's chapter 2. AWS facts follow the current AWS documentation (SQS, SNS,
// EventBridge, Kinesis, Amazon Data Firehose, Lambda's SQS event source, SAM); every question here is written fresh.
// Freya, after chapter 1's reveal, calls people "love"; she never says "sweetie".
(function () {
  const K = SD.vec;
  if (!K.on) return;
  const U = SD.ui, S = SD.state, R = SD.run, Q = SD.quiz, AU = SD.audio;
  const C2 = K.ch2 = {};
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const c2 = () => S.save.c2 || (S.save.c2 = { f: {}, dev: {} });
  const flag = k => !!c2().f[k];
  const setFlag = k => { c2().f[k] = true; S.persist(); };

  // ---------- Concepts ----------
  Object.assign(SD.concepts, {
    sqsfifo: { name: 'Standard and FIFO Queues, Long Polling', zone: 2,
      gist: 'A standard queue delivers at least once and only roughly in order. A FIFO queue keeps order within each message group ID and drops a repeat with the same deduplication ID sent within 5 minutes. A receive with WaitTimeSeconds set (up to 20 seconds) long-polls: it waits for messages instead of returning empty, and empty receives are still billed as requests.',
      page: 'A queue promises the letter arrives. Order and only-once are extra, and you have to ask. — Kyu' },
    lambdasqs: { name: 'Lambda Reading from SQS', zone: 2,
      gist: 'Lambda polls the queue and invokes the function with a batch. If the function throws, the whole batch becomes visible again after the visibility timeout. With ReportBatchItemFailures turned on, the function returns batchItemFailures listing the failed message IDs, and only those come back. Set the queue\'s visibility timeout to at least six times the function timeout, and make processing idempotent.',
      page: 'One bad letter shouldn\'t send nine good ones round again. Report the bad one. — Kyu' },
    snsfan: { name: 'SNS Fan-out and Filter Policies', zone: 2,
      gist: 'An SNS topic delivers a copy of each message to every subscription. Subscribing one SQS queue per consumer (fan-out) lets each work and retry at its own pace. A filter policy on a subscription matches message attributes (or, if scoped to it, the body), and a message that doesn\'t match isn\'t delivered to that subscriber.',
      page: 'A topic shouts. A queue each means everyone hears it in their own time. — Kyu' },
    eventbridge: { name: 'EventBridge Rules and Patterns', zone: 2,
      gist: 'An EventBridge rule sends an event to its targets only when the event matches the rule\'s event pattern, field for field. A pattern that names a value the events never carry matches nothing, and nothing is delivered. EventBridge Scheduler runs one-off or recurring schedules (cron or rate) that invoke a target without a server.',
      page: 'A rule only rings for what it was written to hear. — Kyu' },
    kinesis: { name: 'Kinesis Shards and Firehose', zone: 2,
      gist: 'A Kinesis data stream sends records with the same partition key to the same shard, and keeps order within a shard, not across the stream. Amazon Data Firehose needs no consumer code: it buffers records by size or time and delivers them in batches to destinations such as S3.',
      page: 'In order means in order on one shard. Choose the key that keeps a story together. — Kyu' },
    mqmsk: { name: 'Amazon MQ and Amazon MSK', zone: 2,
      gist: 'Amazon MQ is a managed broker (ActiveMQ or RabbitMQ) for systems that already speak standard protocols such as AMQP, MQTT, STOMP or OpenWire, so they move without rewriting. Amazon MSK runs Apache Kafka for teams already built on Kafka.',
      page: 'Old roads keep their own language. Give them a broker that speaks it. — Kyu' }
  });
  SD.concepts.sqs.zone = 2; SD.concepts.dlq.zone = 2;
  SD.links.push(
    { id: 'sqs-sqsfifo', a: 'sqs', b: 'sqsfifo', text: 'Visibility timeout and at-least-once delivery apply to both kinds of queue; FIFO adds order per group and deduplication.' },
    { id: 'lambdasqs-dlq', a: 'lambdasqs', b: 'dlq', text: 'Reported failures count toward maxReceiveCount like any other receive, so a letter that keeps failing still ends up in the dead-letter queue.' },
    { id: 'snsfan-sqs', a: 'snsfan', b: 'sqs', text: 'Fan-out is a topic with a queue subscribed per consumer: the topic copies, the queues buffer.' },
    { id: 'eventbridge-snsfan', a: 'eventbridge', b: 'snsfan', text: 'Both deliver one event to many targets; a rule\'s pattern and a subscription\'s filter policy both decide who gets what.' }
  );

  // ---------- Cards ----------
  Object.assign(SD.cards, {
    fifo: { name: 'FIFO Queue', cost: 1, kind: 'action', pow: 7, tags: ['fifo'], text: 'Order within each message group, and a repeat with the same deduplication ID inside 5 minutes is dropped.', art: 'cols', rarity: 'common', concept: 'sqsfifo', ch: 2 },
    longpoll: { name: 'Long Polling', cost: 1, kind: 'action', pow: 6, tags: ['longpoll'], text: 'Set WaitTimeSeconds (up to 20): a receive waits for letters instead of coming back empty.', art: 'clock', rarity: 'common', concept: 'sqsfifo', ch: 2 },
    subscribe: { name: 'Subscribe a Queue', cost: 1, kind: 'infra', pow: 5, tags: ['subscribe'], each: { any: 2 }, text: 'Infra. Each turn absorb 2 load. Each subscriber gets its own queue and its own copy, and works at its own pace.', art: 'cyl', rarity: 'common', concept: 'snsfan', ch: 2 },
    filterpol: { name: 'Filter Policy', cost: 1, kind: 'action', pow: 8, tags: ['filter'], text: 'A filter policy on the subscription: only messages whose attributes match reach this subscriber.', art: 'eye', rarity: 'common', concept: 'snsfan', ch: 2 },
    pattern: { name: 'Fix the Event Pattern', cost: 1, kind: 'action', pow: 7, tags: ['pattern'], text: 'Match the fields the events really carry. A rule only sends the events its pattern matches.', art: 'note', rarity: 'common', concept: 'eventbridge', ch: 2 },
    shardkey: { name: 'Partition Key', cost: 1, kind: 'action', pow: 7, tags: ['shard'], text: 'Same key, same shard: records stay in order within a shard, not across the stream.', art: 'key', rarity: 'common', concept: 'kinesis', ch: 2 },
    scale: { name: 'More Consumers', cost: 2, kind: 'infra', pow: 6, tags: ['scale'], each: { any: 3 }, text: 'Infra. Each turn absorb 3 load. More consumers drain the backlog; watch ApproximateAgeOfOldestMessage fall.', art: 'box', rarity: 'uncommon', concept: 'sqs', ch: 2 },
    jitter: { name: 'Backoff with Jitter', cost: 1, kind: 'action', pow: 7, tags: ['jitter'], text: 'Spread the retries out with random waits, so everyone stops waking at once.', art: 'clock', rarity: 'common', concept: 'sqs', ch: 2 },
    batchfail: { name: 'Report Batch Item Failures', cost: 1, kind: 'action', pow: 9, tags: ['partial'], text: 'Return only the failed letters\' IDs: the rest of the batch is deleted, and only the bad ones come back.', art: 'note', rarity: 'uncommon', concept: 'lambdasqs', ch: 2 }
  });
  ['dlq', 'vistimeout', 'idem', 'sqsbuffer'].forEach(id => { SD.cards[id].ch = 2; });
  SD.chapterCards = SD.chapterCards || {};
  SD.chapterCards[2] = ['scale', 'jitter', 'batchfail', 'sqsbuffer', 'fifo', 'longpoll', 'filterpol', 'subscribe'];

  // ---------- Incidents: the ways a message can fail ----------
  // The first game's example incidents step aside, so they never turn up as wrong answers in a diagnosis.
  ['throttle', 'coldstart', 'boomerang', 'poison'].forEach(id => { SD.enemies[id].ch = 99; });
  Object.assign(SD.enemies, {
    pill: { name: 'The Poison Pill', cause: 'A message that always fails, with no dead-letter queue to catch it', sev: 34, concept: 'dlq', tier: 1, sprite: 'poisonpill', ch: 2,
      flavor: 'A letter nobody can deliver. It comes back every turn, sorry every time.',
      symptom: 'One malformed letter makes the sorter throw. It goes back on the queue, is received again, fails again, and has been received 40 times. Nothing else gets sorted while it\'s in the batch.',
      weak: { dlq: 'A redrive policy moves it to a dead-letter queue once its receive count passes maxReceiveCount, where someone can look at it.', partial: 'Reporting only the failed letter lets the good ones in the batch be deleted.' },
      resist: { visibility: 'A longer visibility timeout only delays the next failure.' },
      pattern: [{ t: 'retry', n: 8 }, { t: 'write', n: 7 }, { t: 'retry', n: 10 }, { t: 'escalate' }] },
    visghost: { name: 'The Visibility Ghost', cause: 'The message reappears before the consumer finishes with it', sev: 32, concept: 'sqs', tier: 1, sprite: 'visghost', ch: 2,
      flavor: 'It turns up twice. Once while you\'re still dealing with it.',
      symptom: 'Sorting a letter takes 50 seconds and the queue\'s visibility timeout is 30. Halfway through, the same letter becomes visible again and a second clerk picks it up.',
      weak: { visibility: 'A visibility timeout longer than the work keeps the letter hidden until it\'s deleted.', idem: 'Standard queues deliver at least once, so idempotent sorting makes the second copy harmless.' },
      resist: { scale: 'More clerks still each take 50 seconds; the timeout still runs out mid-job.' },
      pattern: [{ t: 'retry', n: 8 }, { t: 'read', n: 7 }, { t: 'retry', n: 10 }, { t: 'escalate' }] },
    twins2: { name: 'Twins', cause: 'Standard queues deliver at least once, so repeats can happen', sev: 30, concept: 'sqsfifo', tier: 1, sprite: 'twins2', ch: 2,
      flavor: 'The same order, delivered twice. They both insist they\'re the real one.',
      symptom: 'A standard queue delivers order #4417 twice, and the bakery bakes two cakes. Nothing failed: at-least-once delivery means a repeat can happen.',
      weak: { idem: 'An idempotency key on each order turns the repeat into a no-op.', fifo: 'A FIFO queue drops a repeat with the same deduplication ID sent within 5 minutes.' },
      resist: { visibility: 'The repeat wasn\'t a timeout; a longer one doesn\'t stop it.' },
      pattern: [{ t: 'write', n: 8 }, { t: 'retry', n: 8 }, { t: 'escalate' }, { t: 'write', n: 10 }] },
    emptyclerk: { name: 'The Empty Clerk', cause: 'Short polling returns empty responses instead of waiting for messages', sev: 28, concept: 'sqsfifo', tier: 1, sprite: 'emptyclerk', ch: 2,
      flavor: 'He checks the tray. Empty. He checks the tray. Empty. Each check costs a bit.',
      symptom: 'A sorter calls ReceiveMessage in a tight loop. Nine calls in ten come back empty, and every one is billed as a request.',
      weak: { longpoll: 'Long polling (WaitTimeSeconds up to 20) waits for letters instead of returning empty.' },
      resist: { fifo: 'A FIFO queue answers an empty receive just as fast.', scale: 'More clerks polling an empty tray just costs more.' },
      pattern: [{ t: 'read', n: 7 }, { t: 'read', n: 8 }, { t: 'escalate' }, { t: 'read', n: 10 }] },
    backlog: { name: 'The Backlog', cause: 'Messages arrive faster than the consumers can process them', sev: 52, concept: 'sqs', tier: 2, sprite: 'backlog', ch: 2,
      flavor: 'She grows every turn by the age of her oldest letter.',
      symptom: 'ApproximateAgeOfOldestMessage has climbed for nine days. Letters arrive faster than one sorter can clear them, and nobody is watching the number.',
      weak: { scale: 'More consumers (or a higher maximum concurrency on the event source) drain the queue faster than it fills.', partial: 'Stop re-sorting good letters with every failure, and the queue drains faster.' },
      resist: { visibility: 'Hiding letters longer doesn\'t sort any of them.' },
      pattern: [{ t: 'burst', n: 10 }, { t: 'read', n: 9 }, { t: 'escalate' }, { t: 'burst', n: 13 }] },
    postmistress: { name: 'The Postmistress Without Post', cause: 'A standard queue doesn\'t keep order or drop duplicates', short: 'The Postmistress', sev: 64, concept: 'sqsfifo', tier: 9, boss: true, sprite: 'postmistress', ch: 2,
      flavor: 'A standard queue in a uniform. Her letters arrive out of order, and some arrive twice.',
      symptom: 'Every hit lands, but out of the order it was sent, and some land twice. Thornwick\'s replies make no sense: answers before questions.',
      weak: { fifo: 'A FIFO queue puts them in order, but only within one message group: give each conversation its own group ID.', idem: 'Idempotent handling makes the doubles count once.' },
      resist: { visibility: 'Order isn\'t a timing setting; a standard queue only tries its best.' },
      pattern: [{ t: 'retry', n: 9 }, { t: 'write', n: 10 }, { t: 'retry', n: 11 }, { t: 'escalate' }, { t: 'write', n: 12 }] },
    towncrier: { name: 'The Town Crier', cause: 'Competing consumers share one queue instead of an SNS fan-out', sev: 34, concept: 'snsfan', tier: 1, sprite: 'towncrier', ch: 2,
      flavor: 'HEAR YE. Everyone hears ye. Everyone, every time.',
      symptom: 'Three services share one queue. Each order is picked up by whichever service polls first, so billing gets some orders, shipping others, and email the rest.',
      weak: { subscribe: 'A topic with a queue subscribed per service gives each service its own copy.', filter: 'A filter policy keeps each subscriber to the messages meant for it.' },
      resist: { fifo: 'One queue, FIFO or not, still hands each message to one consumer.' },
      pattern: [{ t: 'burst', n: 9 }, { t: 'read', n: 8 }, { t: 'escalate' }, { t: 'burst', n: 11 }] },
    bellnoringer: { name: 'The Bell With No Ringer', cause: 'The EventBridge rule\'s event pattern doesn\'t match the events', sev: 30, concept: 'eventbridge', tier: 1, sprite: 'bellnoringer', ch: 2,
      flavor: 'The rope is pulled. The bell is fine. Nothing rings.',
      symptom: 'A rule should ring the bell for every OrderPlaced event, but its pattern says "detail-type": ["Order Placed"] and the events say "OrderPlaced". It has never matched once.',
      weak: { pattern: 'A rule matches only events whose fields match its pattern exactly. Fix the pattern and it rings.' },
      resist: { subscribe: 'More targets on a rule that matches nothing still receive nothing.', scale: 'There\'s no load to scale. There\'s no match.' },
      pattern: [{ t: 'read', n: 7 }, { t: 'write', n: 8 }, { t: 'escalate' }, { t: 'read', n: 9 }] },
    millrace: { name: 'The Millrace', cause: 'A random partition key spreads one sensor\'s records across shards', sev: 36, concept: 'kinesis', tier: 1, sprite: 'millrace', ch: 2,
      flavor: 'A stream that keeps perfect order. Per shard.',
      symptom: 'Each sensor\'s readings come out of a Kinesis stream in the wrong order. The producer sets a random partition key on every record.',
      weak: { shard: 'Use the sensor ID as the partition key: the same key goes to the same shard, and a shard keeps order.' },
      resist: { fifo: 'A stream has no FIFO switch; order comes from the partition key.' },
      pattern: [{ t: 'write', n: 9 }, { t: 'read', n: 8 }, { t: 'escalate' }, { t: 'write', n: 11 }] },
    herd: { name: 'Thundering Herd', cause: 'Every client retries on the same fixed timer, with no backoff or jitter', sev: 50, concept: 'sqs', tier: 2, sprite: 'herd', ch: 2,
      flavor: 'One letter drops in the tray. Every clerk in the building wakes up for it.',
      symptom: 'After an outage, every sorter retries on the same fixed one-second timer. They all hit the service at the same instant, it falls over, and they all retry again.',
      weak: { jitter: 'Exponential backoff with jitter spreads the retries out, so they stop arriving together.', longpoll: 'Clerks waiting on a long poll aren\'t hammering the queue in between.' },
      resist: { scale: 'More clerks make a bigger herd.' },
      pattern: [{ t: 'burst', n: 11 }, { t: 'retry', n: 10 }, { t: 'escalate' }, { t: 'burst', n: 14 }] },
    belfry: { name: 'The Belfry', cause: 'Every subscriber gets every message, with no filter policies', short: 'The Belfry', sev: 80, concept: 'snsfan', tier: 9, boss: true, sprite: 'belfry', ch: 2,
      flavor: 'One bell. Every subscriber hears it. Every subscriber gets hit.',
      symptom: 'One attack, copied to every subscriber on the topic: billing, shipping and the bell-ringer all get every message, even the ones meant for someone else.',
      weak: { filter: 'Filter policies make each copy reach only the subscriber it\'s addressed to.', subscribe: 'A queue per subscriber lets each absorb its copy at its own pace.' },
      resist: { fifo: 'Ordering the copies doesn\'t stop them all landing.', pattern: 'This is a topic\'s subscription, not an EventBridge rule; its filter is a filter policy.' },
      pattern: [{ t: 'burst', n: 10 }, { t: 'read', n: 11 }, { t: 'retry', n: 10 }, { t: 'escalate' }, { t: 'burst', n: 14 }, { t: 'read', n: 13 }] }
  });

  // ---------- Questions ----------
  SD.questions.push(
    { id: 'q-fi1', c: 'sqsfifo', type: 'mc', q: 'Thornwick\'s replies must reach each family in the order they were sent, and never twice. Which queue fits?',
      opts: ['A FIFO queue, with each family\'s ID as the message group ID', 'A standard queue with long polling turned on', 'A standard queue with a longer visibility timeout', 'A FIFO queue, with one message group ID for every family'], a: 0,
      no: [null, 'Long polling changes how receives wait, not delivery order or repeats.', 'Standard queues deliver at least once and only roughly in order, whatever the timeout.', 'That keeps order, but one group means one family\'s backlog holds up every other family.'],
      why: 'A FIFO queue keeps order within a message group and drops repeats with the same deduplication ID inside 5 minutes. A group per family keeps each family in order while families are processed side by side.' },
    { id: 'q-fi2', c: 'sqsfifo', type: 'mc', q: 'A sorter calls ReceiveMessage in a loop, and most calls come back empty. What cuts the empty receives?',
      opts: ['Long polling: a WaitTimeSeconds of up to 20 on each receive', 'A shorter visibility timeout, so received messages come back sooner', 'Switching to a FIFO queue, so receives return in order', 'A delay queue: DelaySeconds of up to 900 so messages wait first'], a: 0,
      no: [null, 'The visibility timeout only matters after a message is received.', 'A FIFO queue answers an empty receive just as quickly.', 'Delaying messages makes more receives come back empty, not fewer.'],
      why: 'Short polling returns at once, even with nothing to return, and each empty response is billed. A long poll waits up to 20 seconds for a message to arrive.' },
    { id: 'q-fi3', c: 'sqsfifo', type: 'mc', q: 'A FIFO queue gets the same letter twice, 30 seconds apart, with the same deduplication ID. What happens to the second?',
      opts: ['Accepted but not delivered: it\'s within the 5-minute window', 'Delivered as a second copy, in order right behind the first', 'Rejected with a duplicate-ID error that the sender must handle', 'Moved straight to the queue\'s dead-letter queue as a repeat'], a: 0,
      no: [null, 'Deduplication exists to stop exactly this repeat.', 'The send succeeds; SQS just doesn\'t deliver the duplicate.', 'Dead-letter queues hold messages that failed processing, not duplicates.'],
      why: 'A FIFO queue remembers each deduplication ID for 5 minutes. A send with an ID it has seen in that time succeeds but isn\'t delivered again.' },
    { id: 'q-ls1', c: 'lambdasqs', type: 'mc', q: 'A Lambda function reads SQS in batches of ten. Letter 7 fails and the function throws. Partial batch responses are off. Which letters come back?',
      opts: ['All ten, once the visibility timeout ends', 'Only letter 7, straight away', 'None: Lambda deletes the batch when the function returns', 'Letters 7 to 10, the ones after the failure'], a: 0,
      no: [null, 'Lambda can\'t tell which one failed unless the function reports it.', 'A failed batch is never deleted; that would lose letter 7.', 'Lambda doesn\'t know where in the batch the function stopped.'],
      why: 'When the function returns an error, the whole batch is treated as failed and becomes visible again after the visibility timeout, so nine good letters are processed again.' },
    { id: 'q-ls2', c: 'lambdasqs', type: 'mc', q: 'How does the function send back only the letters that failed?',
      opts: ['Turn on ReportBatchItemFailures, and list the failed IDs in batchItemFailures', 'Call DeleteMessage on the failed letters, then return without an error', 'Set the batch size to 1, so each failure returns only its own letter', 'Return an empty batchItemFailures list; Lambda reads the failures from the logs'], a: 0,
      no: [null, 'Deleting the failures throws them away; the good ones are the ones to delete.', 'That works, but it gives up batching, and costs more invocations, to solve a reporting problem.', 'Lambda reads only the response. An empty batchItemFailures list means every letter succeeded.'],
      why: 'With ReportBatchItemFailures in the event source mapping\'s FunctionResponseTypes, Lambda deletes every letter except those listed in batchItemFailures, which return after the visibility timeout.' },
    { id: 'q-ls3', c: 'lambdasqs', type: 'num', q: 'The sorting function\'s timeout is 30 seconds. What\'s the shortest visibility timeout AWS recommends for its queue, in seconds?', unit: 'seconds', lo: 180, hi: 200, ans: '180 (6 × 30)',
      why: 'AWS recommends a visibility timeout of at least six times the function timeout, so letters stay hidden while Lambda retries a throttled batch.' },
    { id: 'q-sn1', c: 'snsfan', type: 'mc', q: 'Every order must reach billing, shipping and the bell-ringer, and each must retry on its own. What design?',
      opts: ['An SNS topic with an SQS queue subscribed for each service', 'One SQS queue that all three services poll', 'One Lambda function that calls the three services in turn', 'A FIFO queue with one message group per service'], a: 0,
      no: [null, 'Each message in one queue goes to one consumer, so each service sees only some orders.', 'One failure stalls or repeats the others, and they can\'t work at their own pace.', 'Groups divide one queue\'s messages; they don\'t copy each message to everyone.'],
      why: 'Fan-out: the topic copies each message to every subscription, and a queue per service buffers its copy until that service is ready.' },
    { id: 'q-sn2', c: 'snsfan', type: 'mc', q: 'The shipping queue only needs orders whose country attribute is "CA". Where does that belong?',
      opts: ['A filter policy on shipping\'s subscription to the topic', 'A visibility timeout on the shipping queue', 'A second topic that only Canada publishes to', 'A dead-letter queue for the other countries\' orders'], a: 0,
      no: [null, 'The visibility timeout hides received messages; it doesn\'t choose which arrive.', 'That pushes routing onto every publisher; a filter policy does it at the subscription.', 'Orders for other countries aren\'t failures.'],
      why: 'A subscription\'s filter policy matches message attributes (or the body, when scoped to it). Shipping\'s queue then receives only the orders it matches.' },
    { id: 'q-sn3', c: 'snsfan', type: 'mc', q: 'A subscription has a filter policy, and a message doesn\'t match it. What happens?',
      opts: ['Only that subscriber skips it; the others get it if they match', 'SNS holds the message for that subscriber until the policy changes', 'The publish fails, and no subscriber gets the message at all', 'It\'s delivered anyway, with an attribute marking it unmatched'], a: 0,
      no: [null, 'SNS doesn\'t keep messages for later filter changes.', 'Filtering is per subscription. The publish succeeds.', 'An unmatched message isn\'t delivered to that subscription at all.'],
      why: 'Each subscription filters on its own. A message that doesn\'t match one subscription\'s policy is skipped for that subscription only.' },
    { id: 'q-eb1', c: 'eventbridge', type: 'mc', q: 'A rule\'s pattern is {"source": ["thornwick.post"], "detail-type": ["LetterSent"]}. An event comes in with that source and detail-type "LetterRead". What happens?',
      opts: ['The rule doesn\'t match, so its targets don\'t get the event', 'The rule matches, because the source field is the same in both', 'The event waits in the bus until a rule\'s pattern matches it', 'The event goes to the dead-letter queue on the rule\'s target'], a: 0,
      no: [null, 'Every field in the pattern has to match, not just one.', 'An event bus doesn\'t hold events for rules that might match later.', 'A target\'s dead-letter queue is for deliveries that failed, not events that never matched.'],
      why: 'A rule sends an event to its targets only if the event matches every field in the pattern.' },
    { id: 'q-eb2', c: 'eventbridge', type: 'mc', q: 'Marrow wants the bell rung by a function every morning at six, with no server to keep. What fits?',
      opts: ['EventBridge Scheduler, with a cron schedule that invokes the function', 'An SQS queue whose 6-hour delay releases a message to the function', 'An SNS topic that publishes to itself each morning to invoke the function', 'A Kinesis stream that gets one record a day, read by the function'], a: 0,
      no: [null, 'A queue\'s delay is at most 15 minutes, and it isn\'t a clock.', 'A topic only sends what someone publishes to it.', 'A stream carries records; it doesn\'t make them on a timetable.'],
      why: 'EventBridge Scheduler runs one-time or recurring schedules (cron or rate expressions) and invokes a target such as a Lambda function.' },
    { id: 'q-ki1', c: 'kinesis', type: 'mc', q: 'Each bell\'s readings must come out of a Kinesis stream in order. What decides that?',
      opts: ['The partition key: the bell\'s ID puts its records on one shard', 'The shard count: enough shards that each reading gets its own', 'The stream\'s FIFO mode, turned on when the stream is created', 'The consumer\'s batch window: a longer one keeps records in order'], a: 0,
      no: [null, 'More shards spread records out; order still only holds within each one.', 'Kinesis streams have no FIFO mode. Order comes from shards.', 'The batch window changes how many records arrive at once, not their order.'],
      why: 'Records with the same partition key go to the same shard, and each shard keeps its records in order.' },
    { id: 'q-ki2', c: 'kinesis', type: 'mc', q: 'Every letter must land in an S3 archive in batches, and nobody wants to write or run consumer code. What fits?',
      opts: ['Amazon Data Firehose, delivering to S3', 'An SNS topic with S3 subscribed', 'An SQS FIFO queue in front of the bucket', 'A Kinesis data stream with no consumers'], a: 0,
      no: [null, 'S3 isn\'t an SNS subscription type.', 'A queue still needs a consumer to move letters into the bucket.', 'Records in a stream with no consumer just expire.'],
      why: 'Firehose buffers incoming records by size or time and delivers them to destinations such as S3, with no consumer to write.' },
    { id: 'q-dl3', c: 'dlq', type: 'mc', q: 'A queue\'s maxReceiveCount is 1. A letter fails once. What happens next?',
      opts: ['It moves to the dead-letter queue instead of being tried again', 'It gets one more receive, then moves to the dead-letter queue', 'It stays in the source queue until its 4-day retention period ends', 'It\'s deleted, since SQS drops a message that fails too often'], a: 0,
      no: [null, 'A count of 1 allows one receive; the next would pass it.', 'The redrive policy moves it before retention matters.', 'SQS never deletes a message for failing.'],
      why: 'A message moves to the dead-letter queue when its receive count passes maxReceiveCount. At 1, a single failure is final, so one passing glitch sends a good letter to the dead-letter queue.' }
  );

  // ---------- The Plot Device and the curse ----------
  // Nothing Arrives (the quest system's 'echo' curse): in the floors, the Unread Letter card below, until Coo's Redrive Stamp.
  SD.curses.echo = { name: 'Nothing Arrives', text: 'An Unread Letter in every deck on the stair: the team loses SLA each turn it sits unread.', hint: 'Coo\'s quest, "At Least Once, At Most Twice", lifts it.' };
  const has = id => !!(S.save.c2 && S.save.c2.dev && S.save.c2.dev[id]);
  SD.quests = { list: [], has, curses: ch => (ch === 2 && !has('redrive') ? ['echo'] : []), devices: () => (has('redrive') ? ['redrive'] : []) };

  // ---------- The story ----------
  const T = C2.text = {
    cold: [
      ['bg', 'c2-wagon'], ['fx', 'dry'],
      ['narr', 'A memory, before anything bad happens. Bram\'s wagon on the night of a new moon. For a few hours, Mira is herself.'],
      ['show', 'bram', 'smile', 'right'], ['show', 'mira', 'warm', 'left'],
      ['bram', 'Stew. Onions in whole, the way you hate.', 'smile'],
      ['mira', 'The way I pretend to hate. Listen. The new letter.', 'warm'],
      ['narr', 'She reads it to him: to the mother of the third man on Bram\'s list.'],
      ['bram', 'I\'ll take it in the morning, love.', 'warm'],
      ['narr', 'He tucks it under the wagon seat.'],
      ['cg', 'c2-seat', 'in'], ['wait', 2600]
    ],
    edge: [
      ['hide', 'bram'], ['hide', 'mira'], ['bg', 'c2-edge'],
      ['narr', 'The edge of the Cloud, the night after the wipe. The floor just stops. Below it there\'s nothing at all.'],
      ['show', 'kai', 'anger', 'left'],
      ['kai', 'Somebody say it. We deleted her.', 'anger'],
      ['show', 'seoyeon', 'anger', 'right'],
      ['seoyeon', 'You played the card, Kai.', 'anger'],
      ['kai', 'Because every one of you said it was the only way.', 'grief'],
      ['hide', 'kai'], ['show', 'dutch', 'stone', 'left'],
      ['dutch', 'Nobody said anything. Freya did. Every one of us heard what we wanted to.', 'stone'],
      ['hide', 'seoyeon'], ['show', 'mira', 'tired', 'right'],
      ['mira', 'Enough. Sit down, all of you. Eat something. We\'ll...', 'tired'],
      ['narr', 'Mira holds them together for nearly an hour. Then she can\'t.'],
      ['narr', 'Dutch tips Freya\'s gift basket out on the ground. Four gifts, four notes, one hand. Each note quotes a prayer back to the person who prayed it.'],
      ['dutch', 'Same handwriting. Same person played all four of us.', 'anger'],
      ['mira', 'Then we stop blaming each other, and start on her.', 'cold']
    ],
    tower: [
      ['cg', 'c2-tower', 'up'],
      ['narr', 'At dawn they see it on the horizon. Freya has pulled the Regions she took into one stack over the capital: a hundred floors, with the four homelands\' lights inside.'],
      ['freya', 'Welcome to the Free Tier, everyone! Everything\'s free!'],
      ['kai', 'Everything\'s free. Great. I\'ve worked in places like that.']
    ],
    scrap: [
      ['hide', 'mira'], ['bg', 'c2-scrap'],
      ['narr', 'At the tower\'s foot is the field where Freya dumps everything she deletes. Houses, people, shop signs from Pingsby: all of it half there.'],
      ['show', 'dutch', 'neutral', 'center'],
      ['dutch', 'Pingsby\'s post office. And someone in it.', 'neutral'],
      ['hide', 'dutch'],
      ['act', 'versions', { who: 'coo', bucket: 'pingsby-town', key: 'post-office/postmaster-coo.json', q: 'Freya deleted him. How do you bring Coo back?' }],
      ['narr', 'Pingsby kept versioning on in every bucket. Seymour insisted. When Freya deleted Coo, S3 put a delete marker on top of him, and every older version stayed underneath.'],
      ['show', 'coo', 'shock', 'center'],
      ['coo', 'Coo! Delivered! At least once. Possibly twice. Did I miss anything?', 'smile'],
      ['narr', 'Freya never read Pingsby\'s settings. She doesn\'t read fine print.']
    ],
    bunker: [
      ['hide', 'coo'], ['bg', 'c2-bunker'],
      ['narr', 'In the middle of the field is a bunker with no handle on the outside.'],
      ['show', 'seymour', 'neutral', 'center'],
      ['seymour', 'Go away. I\'m offline. That\'s the whole point.'],
      ['seymour', 'I have one tape, made long before the end. Kyu\'s on it. I\'ve tested it: it restores.'],
      ['mira', 'Then restore her.'],
      ['seymour', 'No. Two reasons, in order. Freya holds root, and she\'d wipe her again by morning.'],
      ['seymour', 'And a copy anyone can delete is not a copy.'],
      ['dutch', 'So we take root back.'],
      ['seymour', 'And keep the tape where nobody can touch it. Yes. Close the hatch on your way out.']
    ],
    wren: [
      ['hide', 'seymour'], ['hide', 'mira'], ['hide', 'dutch'], ['bg', 'c2-scrap'],
      ['act', 'versions', { who: 'faithful', bucket: 'brookfall-shrine', key: 'faithful/elder-wren.json', q: 'One more under a delete marker. Freya deleted him for praying to Uptima.' }],
      ['show', 'faithful', 'tired', 'center'],
      ['narr', 'Elder Wren, whose faithful you beat at Brookfall. He looks at the four of you for a long time, and says nothing.']
    ],
    fire: [
      ['bg', 'c2-fire'],
      ['narr', 'That night, the first fire. A pigeon, an old man, and a bunker that doesn\'t open.'],
      ['show', 'coo', 'smile', 'left'],
      ['coo', 'We should call it something. Every post office has a name.', 'smile'],
      ['show', 'faithful', 'neutral', 'right'],
      ['faithful', 'Nobody here is on anyone\'s free tier. We\'re just free.'],
      ['coo', 'The Free Cloud! I\'ll need letterhead.', 'smile'],
      ['narr', 'The Free Cloud starts with a pigeon, an old man who won\'t forgive them yet, and a knight who won\'t open his door.']
    ],
    thornwick: [
      ['hide', 'coo'], ['hide', 'faithful'], ['hide', 'mira'], ['hide', 'dutch'], ['bg', 'c2-square'],
      ['narr', 'Thornwick, rebuilt as the tower\'s first floor: the village as it was, every morning, forever. People wait at the post box for replies that never come.'],
      ['show', 'marrow', 'neutral', 'center'],
      ['narr', 'The bell-ringer pulls the rope. The bell makes no sound.'],
      ['marrow', 'Every morning. You\'d think I\'d learn.', 'sad'],
      ['hide', 'marrow'], ['show', 'tilly', 'cold', 'center'],
      ['narr', 'Tilly walks the square in Inquisition grey with a pole-net, hunting the beast in the tower. She looks straight through Mira.'],
      ['tilly', 'Move along. There\'s a beast loose.', 'cold'],
      ['mira', 'Tilly...', 'grief'],
      ['hide', 'tilly'],
      ['cg', 'c2-postbox', 'in'],
      ['narr', 'Freya meets Mira at the silent post box. She doesn\'t come in person. She\'s on the poster, smiling.'],
      ['freya', 'Give me Thornwick\'s post, love, and every letter goes through. Tilly\'s too. It\'s free.'],
      ['narr', 'Mira doesn\'t answer.'],
      ['freya', 'Take your time. Everything here does.'],
      ['narr', 'Under the poster, in very small gold print: DELIVERY IS FREE. POSTAGE IS THORNWICK\'S GRANTS, PAYABLE FOREVER.'],
      ['dutch', 'Always read the small print. Hers especially.', 'stone'],
      ['hide', 'mira'], ['bg', 'c2-floors'],
      ['narr', 'Up the stair are the Sorting Floors: the halls where Thornwick\'s letters go to be processed, and never come out.']
    ],
    redeploy: [
      ['bg', 'c2-fire'],
      ['narr', 'That night, from the camp, they watch the floors they cleared grow back, one by one, on the stroke of midnight.'],
      ['narr', 'Kyu\'s runbook, in her handwriting: "The tower is redeployed from its template every midnight. A cleared floor stays cleared only when its template changes, and the change gets through the pipeline."'],
      ['show', 'pip', 'neutral', 'center'],
      ['pip', 'Excuse me. Sorry. Why did that work? Down there, I mean.', 'neutral']
    ],
    shipped: [
      ['bg', 'c2-floors'],
      ['narr', 'Midnight. The tower redeploys from its template, and this time the template is yours.'],
      ['narr', 'Floors 2 to 6 stay cleared. Somewhere above, a lift creaks open to floor 7.'],
      ['show', 'coo', 'smile', 'center'],
      ['coo', 'Shipped! Delivered! Exactly once, I think. I\'m counting.', 'smile']
    ]
  };
  // In the cutscene viewer (js/reel.js). Thornwick is two scenes: the square, and Freya at the post box after the
  // Unmake It talk. The explorable chapter 2 (js/c2-world.js) plays some of these and adds its own.
  const cut = K.cut2 = SD.reel.chapter('2', { before: () => { U.closePanel(); U.stage(null); } });
  const atPost = () => T.thornwick.findIndex(x => x[0] === 'cg');
  cut.def('cold', 'Bram\'s wagon', T.cold, { music: 'story', note: 'A memory: Mira and Bram, the night of a new moon.' });
  cut.def('edge', 'The edge of the Cloud', T.edge, { note: 'The night after the wipe, and Freya\'s basket. (The climb-only version.)' });
  cut.def('tower', 'The tower at dawn', T.tower);
  cut.def('scrap', 'The scrap field', T.scrap, { note: 'Where Freya dumps what she deletes. (The climb-only version.)' });
  cut.def('bunker', 'The bunker', T.bunker, { note: 'Sir Seymour Backups won\'t open the door. (The climb-only version.)' });
  cut.def('wren', 'Elder Wren', T.wren, { note: '(The climb-only version.)' });
  cut.def('fire', 'The first fire', T.fire);
  cut.def('thornwick', 'Thornwick', () => T.thornwick.slice(0, atPost()), { note: 'The silent bell, and Tilly. (The climb-only version.)' });
  cut.def('thornwick-post', 'Freya at the post box', () => T.thornwick.slice(atPost()), { note: '(The climb-only version.)' });
  cut.def('redeploy', 'Midnight: the floors grow back', T.redeploy);
  cut.def('shipped', 'Shipped', T.shipped, { note: 'The template is yours, and floors 2 to 6 stay cleared.' });
  // Pip's question after the expedition: the Belfry's answer, explained.
  const PIP_Q = { c: 'snsfan', type: 'mc', q: 'Pip: "Why did the Belfry\'s bells stop hitting all of us at once?"',
    opts: ['Each subscription got a filter policy, so each copy only reached the one it was for', 'The topic was switched to FIFO, so the copies came one at a time', 'We deleted the topic, so nothing was sent', 'The visibility timeout hid the copies until the fight was over'], a: 0,
    no: [null, 'Ordering copies doesn\'t stop each subscriber getting one.', 'We fixed the subscriptions; the topic still delivers.', 'Topics have no visibility timeout; that\'s a queue setting.'],
    why: 'A topic sends a copy to every subscription. A filter policy on each subscription decides which copies it accepts.',
      eli5: 'Every party member was getting every shout. Now each mailbox has its own filter, like a loot filter per player, so each one only picks up the messages meant for it.' };

  // ---------- Pair scenes ----------
  // The three the Story Bible names for chapter 2's act 1 (Relationships tab): Three, One, Four at the edge the first
  // night (Dutch and Seo-yeon, arc 6 scene 2); Unmake It in Thornwick after Tilly looks through Mira (Kai and Mira,
  // arc 5 scene 2); Sunlight on Thornwick's marsh path at noon (Mira and Seo-yeon, arc 4 scene 2). Short, skippable,
  // no choices. Your lead changes the angle: one of the pair plays their side with one inner line nobody else hears;
  // anyone else walks in partway through. A scene missed in the world comes back at the next camp.
  // Storyboards: /mnt/project-files/storyboard/ch2/01-three-one-four.md, 02-unmake-it.md, 03-sunlight.md.
  {
    const KK = K, N = KK.NIGHT, { p, c, e, r, g } = KK, S2 = KK.scenes;
    // The cart at the edge, the first night: its plank wall between two people, a lamp turned low.
    S2['c2-cart'] = KK.scene([
      KK.skyL('ct0', '#0a0a18', '#1c1a30'), KK.stars(1200, 700, 160, 41, 0.9),
      p('M0 760 C300 740 600 780 900 750 C1000 740 1100 760 1200 750 L1200 1200 L0 1200Z', '#18162a', N, 4),
      g(p('M-260 0 L260 0 L260 -300 L-260 -300Z', '#5a3e26', N, 5) + p('M-260 -100 h520 M-260 -200 h520', null, '#3e2a18', 5) + p('M-180 0 L-180 -300 M0 0 L0 -300 M180 0 L180 -300', null, '#4a3220', 4)
        + c(-200, 40, 70, '#3a2818', N, 5) + c(200, 40, 70, '#3a2818', N, 5) + c(-200, 40, 12, N) + c(200, 40, 12, N), 'translate(600 900)'),
      g(r(-14, -40, 28, 40, '#ffd27a', N, 3) + p('M-18 -40 h36 M0 -40 v-20', null, N, 3), 'translate(860 590)'), KK.glow('ctl', 860, 570, 260, '#ffb04a', 0.35),
      KK.gradeL('ctg', '#0a1030', '#100808', 0.25, 0.2), KK.vignette(1200, 1200, 0.75)
    ]);
    // Thornwick's marsh path at noon: reeds, a plank walk, the sun flat and white on the water.
    S2['c2-marsh'] = KK.scene([
      KK.skyL('mh0', '#bfe0f2', '#fff6dc'), c(860, 220, 110, '#fffbe8', null, null, 0.95), KK.glow('mhs', 860, 220, 520, '#ffffff', 0.7),
      p('M0 560 C200 540 400 560 600 548 C800 536 1000 556 1200 546 L1200 640 L0 640Z', '#8aa070', N, 3),
      p('M0 620 L1200 610 L1200 1200 L0 1200Z', '#9cc4cc'), p(Array.from({ length: 9 }, (_, i) => `M${80 + i * 130} ${700 + (i % 3) * 60} h${70 + (i % 2) * 40}`).join(' '), null, '#fffbe8', 6, 0.8),
      p('M380 1200 L520 640 L640 640 L760 1200Z', '#a8845a', N, 4) + p(Array.from({ length: 8 }, (_, i) => `M${520 - i * 18} ${700 + i * 70} h${120 + i * 36}`).join(' '), null, '#7a5a3a', 4),
      p(Array.from({ length: 26 }, (_, i) => { const x = (i * 97) % 1200, h = 140 + (i * 37) % 120, y = 1200 - (i % 4) * 30; return `M${x} ${y} Q${x - 10} ${y - h * 0.6} ${x + 6} ${y - h}`; }).join(' '), null, '#5a7040', 6),
      g(p('M-60 0 L-60 -60 L0 -100 L60 -60 L60 0Z', '#b8a088', N, 3) + p('M140 0 L140 -50 L190 -84 L240 -50 L240 0Z', '#a89078', N, 3), 'translate(150 560)'),
      KK.vignette(1200, 1200, 0.3)
    ]);
  }
  const PAIRS = {
    tof: { cut: 'three-one-four-cart', title: 'Three, One, Four', pair: ['dutch', 'seoyeon'], faces: ['stone', 'neutral'], bg: 'c2-cart', music: 'kyusad',
      full: [
        ['narr', 'Later. The others are asleep, or pretending. Dutch taps the cart wall out of habit: three, one, four. Then he stops. That\'s what Freya tapped, in Lina\'s voice. From the other side of the cart, Seo-yeon taps it back.'],
        ['seoyeon', 'What does it mean?', 'neutral'],
        ['dutch', 'Good night. Lina\'s. She said it was pi. I thought she meant pie.', 'stone'],
        ['seoyeon', 'It\'s the start of pi.', 'neutral'],
        ['dutch', 'Yeah. Says so in the diary.', 'neutral'],
        ['narr', 'The next night, he taps first.']],
      walk: 'You can\'t sleep. On either side of the cart\'s plank wall, two people can\'t either, and one of them has just tapped back.',
      camp: 'At the fire, Dutch taps the log he\'s sitting on without meaning to: three, one, four. Across the fire, Seo-yeon taps it back.',
      from: 1, inner: { dutch: [3, '(She tapped it back. Nobody has, since Lina.)'], seoyeon: [2, '(He doesn\'t know he does it. Neither did I, the first time.)'] } },
    unmake: { cut: 'unmake-it', title: 'Unmake It', pair: ['kai', 'mira'], faces: ['earnest', 'grief'], bg: 'c2-square', music: 'kyusad',
      full: [
        ['narr', 'Tilly walks on. Mira watches the grey coat until it turns the corner. Kai pulls off his glove and holds up the cracked hand.'],
        ['kai', 'One touch. I take it off you, and the kid looks at you and sees you.', 'earnest'],
        ['mira', 'You didn\'t ask me what I want. You told me what you want.', 'cold'],
        ['narr', 'He doesn\'t understand yet.'],
        ['mira', 'No, Kai.', 'tired'],
        ['narr', 'He keeps the glove on, and he\'s angry about it for a day.']],
      walk: 'You catch them up by the well. Kai has his glove off, and his cracked hand held up between them.',
      camp: 'At the fire, Kai turns his glove over and over. Then he pulls it off, and holds up the cracked hand to Mira.',
      from: 1, inner: { kai: [2, '(It would work. I know it would work.)'], mira: [3, '(She looked straight through me. Better that than knowing me.)'] } },
    sunlight: { cut: 'sunlight', title: 'Sunlight', pair: ['mira', 'seoyeon'], faces: ['warm', 'neutral'], bg: 'c2-marsh', music: 'town',
      full: [
        ['narr', 'The marsh path, at noon. The sun comes off the water all at once; Seo-yeon squints, and her eyes go red. Mira, whose own left eye is amber and slit, holds up a hand to shade her.'],
        ['mira', 'People look at the eye first. Let them. Then they look at your hands, and that\'s where you tell them who you are.', 'warm'],
        ['seoyeon', 'Your hand is a paw.', 'neutral'],
        ['mira', 'And I\'ve delivered six babies with it.', 'smile'],
        ['narr', 'Seo-yeon laughs out loud, once, and is appalled.']],
      walk: 'You find them on the marsh path in the noon glare: Mira\'s hand up against the sun, and Seo-yeon\'s red eyes in its shade.',
      camp: 'Noon, the next day, by the camp\'s water barrel. The sun comes off it all at once, and Seo-yeon squints, and her eyes go red. Mira holds up a hand to shade her.',
      from: 1, inner: { mira: [2, '(Don\'t fuss. She hates being fussed. Just the hand.)'], seoyeon: [3, '(Do not laugh. Namgung\'s daughter does not laugh in a marsh.)'] } }
  };
  C2.pairSeen = id => flag('pair-' + id);
  // where: 'camp' when it comes back at the next camp, else in its own place.
  function pairSteps(id, where) {
    const P = PAIRS[id], me = (S.save.c1 && S.save.c1.lead) || 'mira';
    const mine = P.pair.includes(me);
    let lines = mine ? P.full.slice() : [['narr', P.walk]].concat(P.full.slice(P.from));
    if (where === 'camp') lines[0] = ['narr', P.camp];
    // Six lines at most: the title heads the opening line, and your inner line follows your own spoken one.
    if (mine) {
      const [at, t] = P.inner[me];
      let k = -1; for (let i = Math.min(at, lines.length) - 1; i >= 0; i--) if (lines[i][0] === me) { k = i; break; }
      if (k >= 0) lines[k] = [me, lines[k][1] + ' ' + t, lines[k][2]]; else lines.splice(Math.min(at, lines.length), 0, [me, t, P.faces[P.pair.indexOf(me)]]);
    }
    lines[0] = [lines[0][0], P.title.toUpperCase() + ' · ' + lines[0][1]].concat(lines[0].slice(2));
    // At camp the opening line is told at the fire, so no cue opens the cutscene's stills: name it and start on its first.
    const stills = where === 'camp' ? [['cut', P.cut], ['cg', 'cut-' + P.cut + '-1']] : [];
    return [['bg', where === 'camp' ? 'c2-fire' : P.bg], ...stills, ['show', P.pair[0], P.faces[0], 'left'], ['show', P.pair[1], P.faces[1], 'right'], ...lines, ['hide', P.pair[0]], ['hide', P.pair[1]]];
  }
  Object.keys(PAIRS).forEach(id => cut.def('pair-' + id, 'Pair scene: ' + PAIRS[id].title, where => pairSteps(id, where),
    { music: PAIRS[id].music, alts: [['Where it happens', null], ['Caught up at camp', 'camp']] }));
  C2.pair = async function (id, where) {
    if (!PAIRS[id] || flag('pair-' + id)) return;
    await cut.play('pair-' + id, where);
    setFlag('pair-' + id);
  };
  C2.pairsMissed = async function () { for (const id of Object.keys(PAIRS)) if (!flag('pair-' + id)) await C2.pair(id, 'camp'); };

  // ---------- Moments you play in the visual novel ----------
  const esc = s => U.esc(s);
  const css = document.createElement('style');
  css.textContent = `
/* A toast slides under an open window rather than over its title (phone pass, 2026-10-21). */
body.c2-on:has(#panel:not([hidden])) #notes { z-index: 19; }
body.c2-on:has(#screen-world:not([hidden])) #notes { top: var(--c2-hud, 12px) !important; }
/* 44px to tap at phone size: the HUD buttons, the skip links (bigger hit area, same look), the floors' small buttons. */
body.c2-on #w-hud button { min-height: 44px; min-width: 44px; }
body.c2-on #dlg-skip { padding: 14px 12px; margin: -14px -12px; }
body.c2-on #vn .vn-skip { padding: 12px 10px; margin: -8px -6px; }
body.c2-floors .ps-tg button, body.c2-floors #rd-deck { min-height: 44px; }
#panel .g2-set button, #panel .sd-letters .opt { min-height: 44px; min-width: 44px; }
#vn .vn-panel.versions { text-align: left; }
.vv-h { font: 600 13px/1.5 ui-monospace, monospace; color: #b7b0cc; margin-bottom: 8px; }
.vv-h b { color: #7fd0ff; } .vv-h span { float: right; color: #7fe0a0; }
.vv-t { width: 100%; border-collapse: collapse; font: 13px ui-monospace, monospace; color: #e9e6f2; margin-bottom: 10px; }
.vv-t td { padding: 5px 6px; border-top: 1px solid rgba(255,255,255,.12); }
.vv-t tr.dm td { color: #ff8a9a; } .vv-t tr.gone td { text-decoration: line-through; opacity: .45; } .vv-t tr.cur td:first-child::after { content: " ← latest"; color: #7fe0a0; }
#vn .vn-opts.col { flex-direction: column; } #vn .vn-opts.col button { background: #2a2a40; text-align: left; }
#vn .vn-opts.col button[disabled] { opacity: .4; }
#stage .vstage { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.sd-letters { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 10px 0; }
.sd-letters .opt { padding: 10px 4px; min-height: 44px; text-align: center; font: 700 13px ui-monospace, monospace; }
.sd-letters .opt.bad { box-shadow: inset 0 0 0 3px #d63a3a; }
.opt.primary, .opt.primary:hover:not(:disabled) { background: var(--blue); color: #fff; }
.sd-resp { font: 12px/1.4 ui-monospace, monospace; background: #1d1b2a; color: #d9e6ff; padding: 8px 10px; border-radius: 8px; white-space: pre-wrap; margin-bottom: 12px; }
`;
  document.head.appendChild(css);
  SD.vn.acts.versions = async function (o, tools) {
    const now = '2026-10-19', rows = [['Delete marker', now + ' 23:58', '—', 'dm cur'], ['v3', '2026-09-30 08:12', '2.1 KB', ''], ['v2', '2026-07-02 17:40', '2.0 KB', ''], ['v1', '2025-11-11 09:03', '1.8 KB', '']];
    const opts = [['marker', 'Delete the delete marker, so the newest real version is current again'], ['blank', 'Upload a new, empty file over the top'], ['empty', 'Ask Freya nicely to undelete him']];
    const no = { blank: 'That makes a fourth version, empty, on top. Coo is still underneath, and now so is a blank.', empty: 'Freya doesn\'t undelete. Freya doesn\'t read settings either, which is the point.' };
    const p = tools.panel(`<div class="vv-h"><b>s3://${esc(o.bucket)}/</b>${esc(o.key)} <span>Versioning: Enabled</span></div>
      <table class="vv-t">${rows.map(r => `<tr class="${r[3]}"><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</table>
      <p class="vn-q">${esc(o.q)}</p><div class="vn-opts col">${opts.map(([k, t]) => `<button data-k="${k}">${esc(t)}</button>`).join('')}</div><p class="vn-note"></p>`, 'versions');
    const note = p.querySelector('.vn-note');
    await new Promise(done => p.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => {
      if (b.dataset.k !== 'marker') { b.disabled = true; note.textContent = no[b.dataset.k]; tools.sfx('wrong'); return; }
      p.querySelectorAll('[data-k]').forEach(x => { x.disabled = true; });
      const tr = p.querySelectorAll('.vv-t tr'); tr[0].className = 'gone'; tr[1].className = 'cur';
      note.textContent = 'DeleteObject with the marker\'s version ID removes the marker. A plain GET returns v3 again.'; tools.sfx('heal');
      done();
    })));
    await tools.sleep(1800);
    const go = document.createElement('button'); go.className = 'vn-hold'; go.textContent = 'Restore'; p.appendChild(go);
    await new Promise(done => go.addEventListener('click', done));
    tools.closePanel();
  };

  // The chapter's record for the rest of the game (its rank, boss and card unlocks, js/state.js chapterReached). Its
  // Expedition I is played on the raid engine below, not as a dungeon run.
  SD.chapters[2] = {
    name: 'the Sorting Floors', rank: 'E', boss: 'belfry', gate: 'UP THE STAIR TO THE SORTING FLOORS...',
    blurb: 'Expedition I: the halls where Thornwick\'s letters are processed, and never come out.',
    pools: { 1: ['pill', 'visghost'], 2: ['twins2', 'emptyclerk'], 3: ['towncrier', 'millrace'], elite: ['backlog', 'herd'] }
  };

  // ---------- The bosses' incident and Exam Twists ----------
  // The Belfry's incident (diagnose, fix, prevent) is worked over three of Kyu's runbook pages on Fan-out; both bosses
  // ask their Exam Twists at half Severity (js/raid.js, SD.twists).
  SD.bossDesign.belfry = {
    concepts: ['snsfan', 'sqs'],
    diagnose: {
      c: 'snsfan', type: 'multi',
      ev: 'SNS topic thornwick-post, last hour (CloudWatch, AWS/SNS)\n' +
        '  NumberOfMessagesPublished: 1,200\n  NumberOfNotificationsDelivered: 3,600\n' +
        '  NumberOfNotificationsFailed: 0\n  NumberOfNotificationsFilteredOut: 0\n' +
        'Subscriptions: billing-queue, shipping-queue, bell-queue (all SQS)\n' +
        'Each message has the attribute type: OrderPlaced, OrderPaid or OrderShipped.\n\n' +
        'bell-ringer  ERROR  no bell for type "OrderPaid"  (x412)',
      q: 'The bell-ringer is drowning, and billing and shipping are doing work that isn\'t theirs. What does the evidence show?',
      items: [
        { t: 'Every message is delivered to all three subscriptions', ok: true },
        { t: 'No subscription is filtering anything out yet', ok: true },
        { t: 'The bell-ringer gets orders that aren\'t meant for it', ok: true },
        { t: 'SNS is failing to deliver some of the messages', ok: false, no: 'NumberOfNotificationsFailed is 0. Every copy arrived; too many copies arrived.' },
        { t: 'The bell queue is full and turning messages away', ok: false, no: 'A standard queue has no limit on how many messages it stores, and nothing failed to deliver.' },
        { t: 'The messages are reaching the queues out of order', ok: false, no: 'Nothing here measures order, and order isn\'t the problem: every service gets every type.' }
      ],
      why: 'Three subscriptions times 1,200 publishes is 3,600 deliveries, so each message went to everyone. FilteredOut at 0 says nothing is being filtered: with no filter policy, a subscription gets every message on the topic.'
    },
    fix: {
      c: 'snsfan', type: 'mc',
      q: 'Billing wants OrderPlaced, shipping wants OrderPaid, and the bell rings for OrderShipped. What\'s the smallest correct change?',
      opts: ['A filter policy on each subscription, matching its own type', 'A topic for each type, with every publisher picking the right one', 'Have each service read every message and drop the ones it ignores', 'A topic access policy that denies each queue the other types'], a: 0,
      no: [null,
        'That works, but it pushes the routing onto every publisher and triples the topics. A filter policy routes where the message is delivered.',
        'That\'s what happens now: every service still receives and handles every message.',
        'A topic\'s access policy says who may publish or subscribe. It doesn\'t choose which messages a subscription gets.'],
      why: 'Set FilterPolicy on each subscription (SetSubscriptionAttributes), for example {"type": ["OrderShipped"]} on the bell queue\'s. SNS matches it against the message attributes, the default scope, and skips that subscription when it doesn\'t match. A change can take up to 15 minutes to take full effect.'
    },
    prevent: {
      c: 'snsfan', type: 'mc',
      q: 'What stops the next new subscription from getting every message again?',
      opts: ['Put each subscription\'s FilterPolicy in the SAM template', 'Add a dead-letter queue to every subscription on the topic', 'Turn on raw message delivery for every subscription', 'Switch the topic and all three queues over to FIFO'], a: 0,
      no: [null,
        'A subscription\'s dead-letter queue keeps messages SNS couldn\'t deliver. These were delivered fine, to the wrong place.',
        'Raw delivery drops the SNS envelope around each message. Every subscriber still gets every message.',
        'FIFO keeps order and drops duplicates. It doesn\'t decide who gets what.'],
      why: 'In a template, AWS::SNS::Subscription takes a FilterPolicy (and a FilterPolicyScope), so every subscription is reviewed and deployed with its filter, and none is added by hand without one.'
    },
    startCard: 'filterpol'
  };
  SD.twists.belfry = [
    { c: 'snsfan', change: 'The publisher stops setting message attributes. The type is now only a field in the JSON message body.',
      q: 'Which part of your fix still holds?',
      opts: ['The filter policies hold; set FilterPolicyScope to MessageBody', 'The filter policies hold as they are; SNS reads both places', 'Filter policies are out; only an EventBridge rule reads bodies', 'Move the filtering into each service\'s own code instead'], a: 0,
      no: [null,
        'The default scope is MessageAttributes. With no attributes on the messages, every policy would filter out every message.',
        'SNS can filter on the body too, once the subscription\'s scope says so.',
        'That brings the incident back: every service receives every message again.'],
      why: 'A subscription\'s FilterPolicyScope is MessageAttributes (the default) or MessageBody. Set it to MessageBody and the same {"type": [...]} policy matches the field in the body, as long as the body is well-formed JSON.' },
    { c: 'snsfan', change: 'An archive service joins the topic, and it must get every message of every type.',
      q: 'Which part of your fix still holds?',
      opts: ['Keep the three filter policies; give the archive\'s none at all', 'Remove all the filter policies so the archive can see everything', 'The archive needs its own topic: filtered and unfiltered can\'t mix', 'Give the archive a filter policy that matches the bell\'s type'], a: 0,
      no: [null,
        'Filtering is per subscription. Removing the others\' policies brings the original incident straight back.',
        'One topic can have filtered and unfiltered subscriptions side by side.',
        'That gives the archive only OrderShipped, not everything.'],
      why: 'Each subscription filters on its own. A subscription with no filter policy gets every message, which is what the archive wants, and the other three keep theirs.' }
  ];
  SD.twists.postmistress = [
    { c: 'sqsfifo', change: 'A Lambda function now reads the FIFO queue, and Thornwick\'s 50 families must be sorted side by side.',
      q: 'Which part of your answer still holds?',
      opts: ['FIFO holds; concurrency is capped by the number of group IDs', 'FIFO is out: Lambda can only read from standard queues', 'Order holds, but Lambda turns deduplication off for the queue', 'Use one message group ID, so Lambda can scale it out'], a: 0,
      no: [null,
        'Lambda reads FIFO queues, and keeps each message group in order.',
        'Deduplication happens in the queue when a letter is sent, before Lambda ever polls.',
        'One group means one family at a time: concurrency is capped by the number of group IDs.'],
      why: 'With a group ID per family, Lambda keeps each family\'s letters in order and can run up to 50 invocations at once: for a FIFO queue, concurrency is capped by the number of message group IDs (or by the maximum concurrency setting, if that\'s lower).' },
    { c: 'sqsfifo', change: 'A sender\'s retry can now arrive up to 10 minutes after the first copy, with the same deduplication ID.',
      q: 'Which part of your answer still holds?',
      opts: ['Order holds; a repeat after 5 minutes gets in, so add idempotency', 'FIFO still drops it: a deduplication ID is remembered for good', 'Raise the queue\'s deduplication interval to 15 minutes', 'Switch back to a standard queue, which drops repeats for longer'], a: 0,
      no: [null,
        'FIFO remembers a deduplication ID for 5 minutes only.',
        'The deduplication interval is fixed at 5 minutes. It can\'t be changed.',
        'Standard queues don\'t deduplicate at all: they deliver at least once.'],
      why: 'FIFO drops a repeat with the same deduplication ID only inside its 5-minute interval. A later repeat is delivered, so the handler should be idempotent too, for example by recording each letter\'s ID once it\'s handled.' }
  ];
  // ---------- Expedition I: The Sorting Floors ----------
  // On the Borderlands engine (js/raid.js), like chapter 1's Deny Mines (js/ch1-mines.js): two floors of nine rows,
  // each ending in its boss, alone with your three companions as bots or in a party (net.js prefix 's'). Here: the
  // floors' cards and curse, Kyu's runbook pages (the engine's Field Notes), the Sorting Tables (its Policy Sorts),
  // the events (Pip's among them), the expedition, and C2.sorting, which Thornwick's stair and the slice call.
  //   Floor 1, Intake: what a queue promises, visibility, long polling, FIFO groups and deduplication, dead letters.
  //     Boss: the Postmistress Without Post. Every path crosses the row where Pip is.
  //   Floor 2, Fan-out: topics and filter policies (the Belfry's incident, worked over three runbook pages), rules
  //     and patterns, shards. Boss: the Belfry. Both bosses ask their Exam Twists at half Severity (SD.twists).
  const ORDER = ['mira', 'kai', 'seoyeon', 'dutch'];
  let playing = false;   // true while the Sorting Floors are on screen: the mines step aside, rewards are chapter 2's
  Object.keys(SD.enemies).forEach(id => { if (SD.enemies[id].ch === 2) SD.enemies[id].raid = true; });
  // Nothing Arrives, as the raid's kind of curse: an unread letter in every deck until Coo's Redrive Stamp.
  SD.cards['c2-unread'] = { name: 'Unread Letter', cost: 1, kind: 'action', exhaust: true, rarity: 'basic', quest: true, curse: true, tags: [], art: 'note', held: { sla: 1, then: 1 },
    text: 'Curse: Nothing Arrives. Each end of turn it sits in your hand, the team loses 1 SLA. Read it (1 Capacity) to clear it for this fight.' };
  const SORT_CARDS = ['scale', 'jitter', 'batchfail', 'sqsbuffer', 'fifo', 'longpoll', 'filterpol', 'subscribe', 'pattern', 'shardkey'];
  // Each lead's deck: the floors' starter cards, their champion's three in place of two Hotfixes, the cards the act 1
  // world upgraded (S.save.c2.bonus), and the curse while it holds. Bots get the same, without your upgrades.
  const BASE = ['hotfix', 'hotfix', 'hotfix', 'hotfix', 'dlq', 'vistimeout', 'idem', 'longpoll', 'fifo', 'subscribe', 'filterpol', 'pattern', 'shardkey'];
  const deckFor = (champ, bot) => {
    const b = c2().bonus || {}, CH = SD.champions;
    const d = (CH && champ ? CH.deck(champ, BASE.slice()) : BASE.slice()).map(id => (!bot && b[id] ? id + '+' : id));
    if (!has('redrive')) d.push('c2-unread');
    return d;
  };

  // ---------- Kyu's runbook pages and the Sorting Tables ----------
  // The engine's Field Notes, in Kyu's hand: a worked example, step by step (from row 5 they stop halfway), then a
  // question on the same idea from the bank. The Belfry's three pages are its incident, worked: diagnose, fix, prevent.
  const KYU = { by: 'Kyu\'s Runbook', sign: '— K.', where: 'torn from Kyu\'s runbook and pinned to a sorting rack, in her handwriting' };
  const BD = SD.bossDesign.belfry;
  Object.assign(SD.fieldNotes, {
    'c2-retry': Object.assign({ title: 'Page 1: the letter that always fails', c: 'dlq',
      ev: 'Queue: thornwick-post   redrive policy: maxReceiveCount 3 → thornwick-post-dlq\nLetter #88 (malformed): received, failed · received, failed · received, failed',
      steps: [
        'The sorter receives #88. While it works, the letter is hidden from everyone else: that\'s the visibility timeout.',
        'The sorter throws, so it never deletes the letter. When the timeout runs out, #88 is visible again.',
        'Every receive adds one to its receive count. SQS never deletes a letter just for failing.',
        'Once its receive count would go past maxReceiveCount, SQS moves it to the dead-letter queue instead.',
        'Now someone can read #88, fix what\'s wrong, and redrive it back to the source queue.'] }, KYU),
    'c2-vis': Object.assign({ title: 'Page 2: hidden, not gone', c: 'sqs',
      ev: 'Visibility timeout: 30 seconds\nSorting one letter takes: 50 seconds',
      steps: [
        'A receive hands the letter to one sorter and hides it for the visibility timeout. It\'s still in the queue.',
        'The sorter has 30 seconds to finish and call DeleteMessage.',
        'The work takes 50, so at 30 the letter shows up again and a second sorter takes it.',
        'Two sorters, one letter. That\'s the Visibility Ghost.',
        'The fix: a timeout longer than the work (or ChangeMessageVisibility while you work), and sorting that shrugs off a repeat.'] }, KYU),
    'c2-poll': Object.assign({ title: 'Page 3: the empty tray', c: 'sqsfifo',
      ev: 'ReceiveMessage, WaitTimeSeconds 0:  9 calls in 10 come back empty\nReceiveMessage, WaitTimeSeconds 20: the call waits for a letter',
      steps: [
        'Short polling asks some of the queue\'s servers and answers at once, even with nothing to give.',
        'An empty answer is still a request, and requests are billed.',
        'Long polling (WaitTimeSeconds 1 to 20) asks all of them, and waits until a letter arrives or the time is up.',
        'Fewer empty answers, fewer requests, and letters picked up as soon as they land.',
        'Set it on each receive, or for the whole queue as ReceiveMessageWaitTimeSeconds.'] }, KYU),
    'c2-fifo': Object.assign({ title: 'Page 4: in order, and only once', c: 'sqsfifo',
      ev: 'FIFO queue: thornwick-replies.fifo\nGroup "marrow":   question 1, answer 1, question 2\nGroup "holloway": question 1, answer 1',
      steps: [
        'A FIFO queue keeps order within each message group ID, not across the whole queue.',
        'While one of a group\'s letters is out with a sorter, that group\'s next letters wait.',
        'Other groups carry on side by side, so give each conversation its own group.',
        'A send whose deduplication ID the queue has seen in the last 5 minutes is accepted, and not delivered again.',
        'Order and only-once cost something: a FIFO queue handles fewer letters a second than a standard one.'] }, KYU),
    'c2-batch': Object.assign({ title: 'Page 5: report the bad one', c: 'lambdasqs',
      ev: 'Event source mapping: batch size 10, FunctionResponseTypes ["ReportBatchItemFailures"]\nThe function returns: { "batchItemFailures": [ { "itemIdentifier": "msg-7" } ] }',
      steps: [
        'Lambda polls the queue and hands the function ten letters at once.',
        'If the function throws, the whole batch counts as failed: all ten come back after the visibility timeout.',
        'With ReportBatchItemFailures on, the function returns the IDs that failed instead.',
        'Lambda deletes the other nine. Only msg-7 comes back, and its failures still count toward maxReceiveCount.',
        'An empty batchItemFailures list means every letter worked.'] }, KYU),
    'c2-bf-diag': Object.assign({ title: 'The Belfry, 1 of 3: read the evidence', c: 'snsfan', ev: BD.diagnose.ev,
      steps: [
        'Count the copies: 1,200 published and 3,600 delivered. Each message went to all three subscriptions.',
        'Failed is 0: every copy arrived. This isn\'t a delivery problem.',
        'FilteredOut is 0: no subscription is filtering anything.',
        'The bell-ringer\'s errors are about types that were never meant for it.'],
      q: Object.assign({ eli5: 'Three mailboxes, and every letter goes into all three, so each box fills up with other people\'s post. Nothing got lost; too much arrived. Nobody has told any mailbox what it wants yet.' }, BD.diagnose) }, KYU),
    'c2-bf-fix': Object.assign({ title: 'The Belfry, 2 of 3: the smallest fix', c: 'snsfan',
      ev: 'Billing wants OrderPlaced. Shipping wants OrderPaid. The bell rings for OrderShipped.\nEvery message carries the attribute type.',
      steps: [
        'A topic copies every message to every subscription, unless the subscription says otherwise.',
        'A filter policy on a subscription says which messages it wants: by message attribute (the default) or by body.',
        'A message that doesn\'t match is skipped for that subscription only.',
        'So the routing goes where the copies are made, not into every publisher or every service.'],
      q: Object.assign({ eli5: 'Give each mailbox a sticky note that says what it wants, like a loot filter per player. The post still goes out once; each box only picks up its own kind.' }, BD.fix) }, KYU),
    'c2-bf-prev': Object.assign({ title: 'The Belfry, 3 of 3: keep it fixed', c: 'snsfan',
      ev: 'AWS::SNS::Subscription\n  Protocol: sqs\n  FilterPolicyScope: MessageAttributes\n  FilterPolicy: { "type": ["OrderShipped"] }',
      steps: [
        'A filter set by hand lasts until someone forgets it on the next subscription.',
        'In the template, every subscription is written down with its filter, reviewed, and deployed the same way each time.',
        'FilterPolicyScope says where to look: MessageAttributes, the default, or MessageBody.',
        'A change to a filter policy can take up to 15 minutes to take full effect.'],
      q: Object.assign({ eli5: 'Write the loot filters into the save file the server loads every night, so a new mailbox can\'t join without one.' }, BD.prevent) }, KYU),
    'c2-fan': Object.assign({ title: 'Page 6: a queue each', c: 'snsfan',
      ev: 'Topic: orders  →  billing-queue, shipping-queue, bell-queue (each SQS)',
      steps: [
        'Three services sharing one queue each get some of the messages: whoever polls first takes it.',
        'A topic sends a copy of each message to every subscription instead.',
        'Subscribe one queue per service, and each service has its own copy.',
        'Each queue holds its copies until its service is ready, and each service retries on its own.',
        'A slow service no longer holds up the others.'] }, KYU),
    'c2-shard': Object.assign({ title: 'Page 7: in order, per shard', c: 'kinesis',
      ev: 'Stream: bell-readings, 4 shards\nPartition key now:  a random ID on every record\nPartition key fixed: the bell\'s ID',
      steps: [
        'Kinesis hashes each record\'s partition key to choose its shard.',
        'Within a shard, records stay in the order they were written.',
        'Across shards there\'s no order at all.',
        'A random key scatters one bell\'s readings over all four shards, so they come out jumbled.',
        'The bell\'s ID as the key keeps each bell on one shard, in order, while the bells still spread across the stream.'] }, KYU),
    'c2-rule': Object.assign({ title: 'Page 8: what a rule hears', c: 'eventbridge',
      ev: 'Rule pattern: { "source": ["thornwick.post"], "detail-type": ["LetterSent"] }',
      steps: [
        'An event bus checks every event against every rule\'s pattern.',
        'Each field the pattern names must match one of its listed values. Fields it doesn\'t name don\'t matter.',
        'Values match exactly: "Letter Sent" is not "LetterSent".',
        'No match means no delivery, and no error either. The rule just stays quiet.',
        'For "ring at six every morning", the tool is EventBridge Scheduler, not a pattern.'] }, KYU)
  });
  // The Sorting Tables (the engine's Policy Sorts): predict how many of five get through, then sort them.
  const TABLE = { by: 'The Sorting Table' };
  Object.assign(SD.policySorts, {
    'c2-receive': Object.assign({ title: 'Three tries', c: 'dlq', what: 'letters', yes: 'Tried again', no: 'Dead-lettered',
      ev: 'Queue thornwick-post: redrive policy maxReceiveCount 3, to thornwick-post-dlq.\nEach letter below has just failed again. Which get another try?',
      reqs: [
        { t: 'Letter A: received once, failed', ok: true, why: 'A count of 1 is under 3. It\'s visible again once its visibility timeout ends.' },
        { t: 'Letter B: received 3 times, failed every time', ok: false, why: 'Its next receive would take the count past 3, so SQS moves it to the dead-letter queue instead.' },
        { t: 'Letter C: received twice, failed', ok: true, why: 'Two is under three: one more try.' },
        { t: 'Letter D: received 3 times, failed, and the sorter set its visibility to 0', ok: false, why: 'Visibility doesn\'t reset the count. It\'s visible at once, and the next receive moves it.' },
        { t: 'Letter E: received twice, failed, with 10 seconds of its visibility timeout left', ok: true, why: 'It comes back in 10 seconds, for its third and last try.' }] }, TABLE),
    'c2-dedup': Object.assign({ title: 'Only once', c: 'sqsfifo', what: 'sends', yes: 'Delivered', no: 'Not delivered',
      ev: 'FIFO queue replies.fifo: content-based deduplication off, deduplication scope the whole queue (the default).\n09:00:00  sent: group marrow, deduplication ID r-41',
      reqs: [
        { t: '09:01:00  group marrow, deduplication ID r-41', ok: false, why: 'The same ID inside 5 minutes: accepted, and not delivered again.' },
        { t: '09:01:30  group holloway, deduplication ID r-41', ok: false, why: 'Deduplication is across the whole queue by default, so another group\'s r-41 is still a repeat.' },
        { t: '09:02:00  group marrow, deduplication ID r-42', ok: true, why: 'A new ID. Delivered, in order behind marrow\'s first letter.' },
        { t: '09:06:00  group marrow, deduplication ID r-41', ok: true, why: 'Six minutes on, the 5-minute window has closed: r-41 is new again.' },
        { t: '09:03:00  group marrow, no deduplication ID', ok: false, why: 'With content-based deduplication off, a FIFO send needs a deduplication ID. This one is rejected with an error.' }] }, TABLE),
    'c2-filter': Object.assign({ title: 'The bell queue\'s filter', c: 'snsfan', what: 'messages', yes: 'Delivered', no: 'Filtered out',
      ev: 'Filter policy on the bell queue\'s subscription (scope: message attributes):\n{ "type": ["OrderShipped", "OrderReturned"], "village": ["thornwick"] }',
      reqs: [
        { t: 'type OrderShipped, village thornwick', ok: true, why: 'Both keys match: type is one of its two values, and the village is right.' },
        { t: 'type OrderShipped, village pingsby', ok: false, why: 'Every key in the policy has to match. village doesn\'t.' },
        { t: 'type OrderReturned, village thornwick, priority high', ok: true, why: 'Attributes the policy doesn\'t name don\'t matter.' },
        { t: 'type OrderShipped, no village attribute', ok: false, why: 'A key the policy names has to be on the message.' },
        { t: 'type ordershipped, village thornwick', ok: false, why: 'String matching is exact, capitals included.' }] }, TABLE),
    'c2-pattern': Object.assign({ title: 'Marrow\'s rule', c: 'eventbridge', what: 'events', yes: 'Matched', no: 'No match',
      ev: 'Rule pattern:\n{ "source": ["thornwick.bells"], "detail-type": ["BellRung"], "detail": { "tower": ["north", "chapel"] } }',
      reqs: [
        { t: 'source thornwick.bells, detail-type BellRung, detail.tower north', ok: true, why: 'Every field the pattern names matches.' },
        { t: 'source thornwick.bells, detail-type BellRung, detail.tower south', ok: false, why: 'south isn\'t one of the towers the pattern lists.' },
        { t: 'source thornwick.bells, detail-type BellRung, detail.tower chapel, detail.ringer marrow', ok: true, why: 'Extra fields don\'t stop a match.' },
        { t: 'source thornwick.post, detail-type BellRung, detail.tower north', ok: false, why: 'The source is different.' },
        { t: 'source thornwick.bells, detail-type Bell Rung, detail.tower north', ok: false, why: 'Values match exactly: "Bell Rung" isn\'t "BellRung".' }] }, TABLE)
  });

  // ---------- Events ----------
  // Pip's is the old event's three answers, each player choosing their own (per). Every path on Intake passes it.
  SD.expeditionEvents = Object.assign(SD.expeditionEvents || {}, {
    'c2-pip': { id: 'c2-pip', title: 'Pip in the Dead Letters', who: 'pip', per: true,
      text: 'In a sorting bin, under a drift of returned mail, is Pip: a small, polite packet who has never been answered and is very sorry to be a bother. "They tried me three times," he says, "and then they put me in here. Is that bad?"',
      choices: [
        { label: 'SQS deletes a letter after three failures, so you shouldn\'t exist', out: 'SQS never deletes a letter for failing. Only a DeleteMessage call, or the end of the retention period, removes one. Pip looks worried. The team loses 5 SLA.', fx: { sla: -5 } },
        { label: 'You\'re in a dead-letter queue: you failed past maxReceiveCount, so SQS set you aside for someone to look at', out: 'Pip: "Set aside. For someone to look at. Oh." Then, apologising: "They didn\'t even reset my clock when they moved me." Dutch: "Standard queue. Your age comes with you, so the dead-letter queue has to keep you longer than the queue you came from." Pip climbs into your satchel. You get a Dead-Letter Queue card.', fx: { card: 'dlq' } },
        { label: 'You\'re in a FIFO queue, waiting your turn', out: 'He isn\'t waiting his turn. He failed, more times than the redrive policy allows.', fx: {} }] },
    'c2-pigeon': { id: 'c2-pigeon', title: 'Coo\'s Lost Pigeon', who: null, per: true,
      text: 'A pigeon flies in a minute late with a sack of letters for the archive, then another a minute after that. A note in Coo\'s hand: "The archive takes them in batches, never one at a time, and never loses one. What does that remind you of?"',
      choices: [
        { label: 'An SNS topic with the archive subscribed', out: 'S3 isn\'t something a topic delivers to, and a topic doesn\'t batch.', fx: {} },
        { label: 'A Kinesis data stream with no consumer', out: 'With no consumer, the records sit in the stream until they expire. Nothing reaches the archive. The team loses 4 SLA.', fx: { sla: -4 } },
        { label: 'Amazon Data Firehose: it buffers records by size or time and delivers them to S3 in batches', out: '"A minute late, never lost. That\'s my girl." The pigeon looks smug. You gain 15 bits, and the team 4 SLA.', fx: { bits: 15, sla: 4 } }] },
    'c2-oldroad': { id: 'c2-oldroad', title: 'The Old Post Road', who: null, per: true,
      text: 'Two old routes still run into the Sorting Floors. One is the coaching inn\'s system, which speaks AMQP and STOMP and nothing else. The other is the river barges\' Kafka cluster. Neither wants rewriting.',
      choices: [
        { label: 'Amazon MQ for the inn\'s broker protocols, and Amazon MSK for the barges\' Kafka', out: 'Both roads keep their own language, and both connect. You gain 15 bits.', fx: { bits: 15 } },
        { label: 'Rewrite both to use SQS', out: 'That might be right one day. Today it\'s two rewrites nobody asked for. The team loses 3 SLA.', fx: { sla: -3 } },
        { label: 'Put both behind one SNS topic', out: 'SNS doesn\'t speak AMQP or Kafka\'s protocol to them.', fx: {} }] },
    'c2-sack': { id: 'c2-sack', title: 'A Sack of Returned Mail', who: null,
      text: 'A sack with RETURN TO SENDER stamped on it a hundred times. Somebody has to work out why it keeps coming back.',
      choices: [
        { label: 'Sort it properly', out: 'Right: each of you picks an uncommon card from the sack. Wrong: it spills on the team for 6 SLA.', fx: { ask: { c: 'snsfan', right: { card: 'uncommon' }, wrong: { sla: -6 } } } },
        { label: 'Tip it down the chute (10 bits each)', out: 'It comes back up the chute an hour later. Each of you gains 10 bits; the team loses 6 SLA.', fx: { bits: 10, sla: -6 } },
        { label: 'Leave it', out: 'You walk on. The sack sighs.', fx: {} }] }
  });

  // ---------- The expedition ----------
  SD.expeditions = (SD.expeditions || []).concat([{
    id: 'sortingfloors', name: 'The Sorting Floors', who: ORDER, opens: () => playing, sev: 0.85, dmg: 0.85,
    blurb: 'Expedition I: the halls where Thornwick\'s letters are processed, and never come out.',
    back: 'Back down to the Free Cloud',
    cafe: { title: 'The Franking Room', who: null, name: 'The franking room', text: 'A franking machine with a kettle on top, and cards on the counter with prices stamped on them.' },
    camp: { title: 'The Sorting Room', text: 'An empty sorting room with a kettle that works. Everyone sits on the mail sacks at once. Rest, or practise one of your cards.' },
    regroup: [{ who: null, text: 'One of Seymour\'s tapes whirrs, and the floor is back the way you found it.' }, { who: 'mate1', text: 'Up. All of us. Back to the top of the floor: we know what\'s in there now.' }],
    floors: [
      { name: 'Intake', gate: 'THE SORTING FLOORS · INTAKE', map: '2', beat: 'Where Thornwick\'s letters arrive, and go round, and round.',
        boss: 'postmistress', bossTitle: 'The Postmistress Without Post', fade: 4,
        plan: [['fight', 'notes', 'fight'], ['event', 'event', 'event'], ['fight', 'sort', 'notes'], ['elite', 'fight', 'cafe'], ['camp', 'notes', 'fight'], ['fight', 'sort', 'board'], ['notes', 'elite', 'fight'], ['fight', 'notes', 'sort'], ['camp', 'cafe', 'camp']],
        fights: ['pill', 'visghost', 'twins2', 'emptyclerk', { ids: ['pill', 'emptyclerk'] }, { ids: ['visghost', 'twins2'] }],
        elites: ['backlog'],
        notes: ['c2-retry', 'c2-vis', 'c2-poll', 'c2-fifo', 'c2-batch'],
        sorts: ['c2-receive', 'c2-dedup'],
        events: ['c2-pip'],
        intro: [
          { who: null, text: 'The Sorting Floors. Chutes from Thornwick pour letters into trays, and nothing ever leaves by the other side.' },
          { who: 'lead', text: 'Every letter Thornwick ever posted is somewhere in here.' },
          { who: 'mate1', text: 'Then we find out why none of them come out.' }],
        outro: [
          { who: null, text: 'The Postmistress puts her last letter in its right place, behind the one it answers, and sits down on a sack.' },
          { who: 'mate2', text: 'A group for every family. She only needed telling.' },
          { who: 'lead', text: 'Up. Something up there is ringing.' }] },
      { name: 'Fan-out', gate: 'THE SORTING FLOORS · FAN-OUT', map: '2', beat: 'A bell tower inside the tower, every rope tied to every bell.',
        boss: 'belfry', bossTitle: 'The Belfry', fade: 5,
        plan: [['fight', 'notes', 'fight'], ['notes', 'fight', 'sort'], ['fight', 'event', 'notes'], ['elite', 'notes', 'cafe'], ['camp', 'fight', 'event'], ['notes', 'sort', 'fight'], ['fight', 'elite', 'board'], ['event', 'notes', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['towncrier', 'bellnoringer', 'millrace', { ids: ['towncrier', 'bellnoringer'] }, { ids: ['millrace', 'emptyclerk'] }],
        elites: ['herd'],
        notes: ['c2-bf-diag', 'c2-bf-fix', 'c2-bf-prev', 'c2-fan', 'c2-shard', 'c2-rule'],
        sorts: ['c2-filter', 'c2-pattern'],
        events: ['c2-pigeon', 'c2-oldroad', 'c2-sack'],
        intro: [
          { who: null, text: 'Fan-out. A bell tower inside the tower, and every rope in it tied to every bell.' },
          { who: 'mate1', text: 'Every message, to everyone. That\'s not a post office. That\'s shouting.' },
          { who: 'lead', text: 'Then each of them gets a filter.' }],
        outro: [
          { who: null, text: 'The Belfry falls quiet. For the first time in years, each bell rings only for its own letters.' },
          { who: 'mate2', text: 'Listen. You can tell which one is which.' },
          { who: 'lead', text: 'Back down to camp, before it all grows back.' }] }
    ]
  }]);

  // ---------- Questions for the floors ----------
  // From the exam bank, filed under the floors' concepts, plus this file's own (SD.questions). Each runbook page,
  // Sorting Table, Whiteboard and event asks one of a concept's at random (SD.qpick).
  const adopt = {
    'dva-1-04': 'sqsfifo', 'dva-1-05': 'sqsfifo', 'saa-2-110': 'sqsfifo', 'dva-4-208': 'sqsfifo',
    'dva-1-101': 'sqs', 'dva-1-102': 'sqs', 'dva-1-106': 'sqs', 'saa-2-01': 'sqs',
    'dva-1-104': 'dlq', 'dva-1-105': 'dlq',
    'dva-1-109': 'snsfan', 'dva-1-20': 'snsfan', 'dva-4-08': 'snsfan', 'dva-4-317': 'snsfan', 'dva-4-223': 'snsfan',
    'dva-1-110': 'eventbridge', 'dva-1-112': 'eventbridge', 'dva-1-15': 'eventbridge', 'dva-3-118': 'eventbridge',
    'dva-1-120': 'kinesis', 'dva-1-123': 'kinesis', 'dva-1-06': 'kinesis', 'saa-4-204': 'kinesis',
    'saa-2-101': 'mqmsk', 'saa-3-125': 'mqmsk', 'saa-2-220': 'mqmsk', 'saa-3-234': 'mqmsk'
  };
  (SD.bank || []).forEach(b => { if (adopt[b.id] && !SD.questions.some(q => q.id === b.id)) SD.questions.push(Object.assign({}, b, { c: adopt[b.id] })); });
  const pickQ = c => SD.qpick(SD.questions.filter(q => q.c === c && q.id && !q.lp && q.type !== 'explain'), { c });
  // ELI5 lines for the bank questions the floors adopt that no other chapter explains yet.
  Object.assign(SD.eli5, {
    'dva-1-04': 'Give every account its own queue lane (a message group). Each lane stays in order, and different lanes are served by different clerks at the same time.',
    'dva-1-05': 'The queue remembers a ticket stamp for 5 minutes and ignores a second letter with the same stamp. Either stamp it yourself with the order\'s ID every time you resend, or let the queue stamp it from the letter\'s contents.',
    'dva-1-101': 'A clerk gets 30 seconds of "this is mine" by default, but the job takes 2 minutes, so the letter reappears and another clerk grabs it. Give each clerk more than 2 minutes of "mine".',
    'dva-1-102': 'Instead of reserving the table for 40 minutes, reserve it for a short while and keep saying "still here!" while you work. If you crash, the reservation runs out quickly and someone else picks it up.',
    'dva-1-106': 'Throwing a letter away needs the ticket from the latest time you picked it up (the receipt handle), not the letter\'s name tag. Show the right ticket and it\'s gone.',
    'saa-2-01': 'Put a mailbox between the shop and the slow kitchen. The shop drops orders in and stays quick; the kitchen takes them out as fast as it can, and none get lost in the rush.',
    'dva-1-104': 'Build a lost-and-found shelf of the same kind as the queue (a FIFO shelf for a FIFO queue), then tell the queue: after 5 failed tries, put it on that shelf.',
    'dva-1-105': 'The bug is fixed, so press the "send them all back" button: a redrive moves everything on the lost-and-found shelf back to the queue it came from.',
    'dva-1-109': 'Shout each price change once on an in-order loudspeaker (an SNS FIFO topic), give each service its own in-order mailbox, and keep each product in its own lane so its changes stay in order.',
    'dva-1-20': 'Ring one bell (an SNS topic) and give each service its own mailbox (an SQS queue) under it. Everyone gets a copy, a slow reader doesn\'t hold up the others, and letters wait in the box while a service is down.',
    'dva-4-08': 'The refunds mailbox gets every letter and bins 95 of each 100. Put a filter on its subscription so only refund letters are ever dropped in.',
    'dva-1-112': 'Stop phoning each team. Post one "order placed" notice on the event board, and let every team that cares pin up its own rule to be told. New teams join without the order team doing anything.',
    'dva-1-15': 'Set an alarm clock in the cloud (EventBridge Scheduler) for 02:00 every night that wakes the function. No server has to stay up waiting.',
    'dva-1-120': 'Everyone queued at one door because they all had the same ticket colour. Give each device its own colour (its ID as the key) and they spread over all eight doors.',
    'dva-1-123': 'Hand the entries in one at a time, and with each one say "this comes after that one" (the previous sequence number), so the stream can\'t shuffle them.',
    'dva-1-06': 'A stream is like a replay log: every reader can watch it on their own, each user\'s records stay in order when you key them by user, and yesterday\'s footage is still there to rewatch.',
    'saa-2-110': 'One FIFO pigeonhole per account: letters for the same account come out in the order they went in, and a copy posted a minute later is thrown away at the door.',
    'dva-4-208': 'Stop knocking on an empty post box over and over: bundle letters into one sack when you send them, and wait at the box a few seconds for the next one (long polling) instead of asking every instant.',
    'dva-4-317': 'A sorting rule on the fraud desk\'s mail slot: only letters marked eu, and then only if they\'re urgent or worth more than 1,000. Anything else never lands in their tray.',
    'dva-4-223': 'The label on the envelope is blank, but the letter inside says what it is: tell the sorter to read the letter itself (FilterPolicyScope MessageBody), not the envelope.',
    'dva-3-118': 'Before you nail a new bell rule to the tower, try it against a few sample letters at your desk (test-event-pattern) and see which ones would ring it.',
    'saa-4-204': 'Posting a billion postcards one by one costs a fortune in stamps: let a sorter (Firehose) bundle them into big parcels first, then deliver the parcels.',
    'saa-2-101': 'The town already speaks the old ActiveMQ post office\'s language: rent a managed one that speaks it too (Amazon MQ), with a standby office in another district if the first burns down.',
    'saa-3-125': 'Every courier already knows Kafka\'s routes: move into a managed Kafka (Amazon MSK) and just give them the new address.',
    'saa-2-220': 'The services already talk RabbitMQ: use Amazon MQ\'s RabbitMQ, run as a cluster across districts, so nobody has to learn a new way to post a letter.',
    'saa-3-234': 'Keep the Kafka couriers, skip guessing how many sorting halls to build: MSK Serverless grows and shrinks with the mail, and the couriers show their IAM badge at the door.'
  });

  // ---------- Playing it ----------
  // The floors' words in the story's voice: 'lead' is you, mate1 and mate2 your first two companions.
  const leadId = () => (S.save.c1 && S.save.c1.lead) || 'mira';
  function raidSay(list) {
    const me = leadId(), mates = ORDER.filter(x => x !== me);
    const who = w => (w === 'lead' ? me : w === 'mate1' ? mates[0] : w === 'mate2' ? mates[1] : w && SD.cast[w] ? w : 'narr');
    const lines = (list || []).filter(l => l && l.text).map(l => ({ s: who(l.who), t: String(l.text), e: l.e }));
    return lines.length ? U.dialog(lines) : Promise.resolve();
  }
  // While the floors are up: the mines leave the lobby's list, card rewards are this chapter's, the rooms are named
  // for Kyu's runbook and the Sorting Table, the leads are drawn in code, and the map is the floors' own (no tiles).
  let undress = null;
  function dress() {
    const CH = SD.champions, mines = (SD.expeditions || []).find(x => x.id === 'denymines');
    const was = { rewards: CH.rewards, sprite: CH.sprite, opens: mines && mines.opens, art: SD.dungeonArt, node: Object.assign({}, R.NODE) };
    CH.rewards = () => SORT_CARDS.slice();
    if (mines) mines.opens = () => false;
    R.NODE.notes = { l: 'Kyu\'s Runbook', g: 'notebook' };
    R.NODE.sort = { l: 'Sorting Table', g: 'scales' };
    SD.dungeonArt = null;
    CH.sprite = function (id, scale) {
      const c = CH.get(id), d = document.createElement('div');
      if (!c) return d;
      const h = c.h * scale, w = h * 0.4;
      d.className = 'champ-spr';
      d.style.cssText = `width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;background:url("${K.fig(id, 'neutral', 'full')}") center/contain no-repeat`;
      return d;
    };
    // The fight's fighters (js/raid.js artOf): a one-frame sheet, the figure in its idle row (the third).
    const keep = CH.list.map(c => ({ c, sheet: c.sheet, w: c.w, h: c.h, n: c.n }));
    CH.list.forEach(c => {
      const W = 30, H = 75, fig = K.fig(c.id, 'neutral', 'full');
      Object.assign(c, { w: W, h: H, n: 0, sheet: K.uri(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H * 3}" viewBox="0 0 ${W} ${H * 3}"><image href="${fig}" xlink:href="${fig}" x="0" y="${H * 2}" width="${W}" height="${H}"/></svg>`) });
    });
    document.body.classList.add('c2-floors');
    playing = true;
    // The floors' music, and the bosses' when a boss fight is on screen (the raid draws it as .combat.bossfight).
    let boss = false;
    AU.music('c2dungeon');
    const mo = new MutationObserver(() => { const b = !!document.querySelector('#run .combat.bossfight'); if (b !== boss) { boss = b; AU.music(b ? 'c2boss' : 'c2dungeon'); } });
    mo.observe(U.$('#run'), { childList: true, subtree: true });
    undress = () => {
      Object.assign(CH, { rewards: was.rewards, sprite: was.sprite });
      keep.forEach(k => Object.assign(k.c, { sheet: k.sheet, w: k.w, h: k.h, n: k.n }));
      if (mines) mines.opens = was.opens;
      SD.dungeonArt = was.art;
      delete R.NODE.notes; delete R.NODE.sort; Object.assign(R.NODE, was.node);
      document.body.classList.remove('c2-floors');
      mo.disconnect();
      playing = false; undress = null;
    };
  }
  const story = extra => Object.assign({ story: true, label: 'The Sorting Floors', xp: 'sortingfloors', champNames: true, deckFor, pickQ, say: raidSay, tapes: 2 }, extra);

  // A join screen: the open parties on the stair, and a box for a friend's code.
  function joinScreen(root, dir) {
    const net = SD.net;
    return new Promise(res => {
      let off = null;
      const draw = () => {
        const list = dir.tables().filter(t => net.cleanCode(t.code).length >= 4);
        root.innerHTML = `<div class="mi-card rd"><span class="mi-tag">The Sorting Floors</span><h2 style="margin:2px 0 6px">Join a party</h2>
          ${list.length ? `<ul class="mn-list">${list.map(t => `<li><b>${esc(t.nick || 'A party')}</b> <small class="muted">${t.players | 0}/${t.max | 0}${t.info ? ' · ' + esc(t.info) : ''}</small> <button class="mi-btn sm" type="button" data-code="${esc(net.cleanCode(t.code))}">Join</button></li>`).join('')}</ul>` : '<p class="muted">No open parties on the stair right now. Ask a friend for their code.</p>'}
          <label class="pt-lbl" for="sf-code">A friend's code<input id="sf-code" maxlength="6" autocomplete="off" autocapitalize="characters" placeholder="F7KQP"></label>
          <p class="muted small" id="sf-why" role="status"></p>
          <div class="row"><button class="primary" type="button" id="sf-go">Join</button><button class="ghost" type="button" id="sf-back">Back to the stair</button></div></div>`;
        root.querySelectorAll('[data-code]').forEach(b => { b.onclick = () => done(b.dataset.code); });
        root.querySelector('#sf-go').onclick = () => {
          const c = net.cleanCode(root.querySelector('#sf-code').value);
          if (c.length !== 5 || net.gameOf(c) !== 'sorting') { root.querySelector('#sf-why').textContent = 'Sorting Floors codes are 5 letters and start with F, like F7KQP.'; return; }
          done(c);
        };
        root.querySelector('#sf-back').onclick = () => done(null);
      };
      const done = c => { if (off) off(); res(c); };
      off = dir.onTables(() => draw()) || null;
      draw();
    });
  }

  // how: 'solo' (you and three bots), 'party' (form one; friends join with your code) or 'join'. Resolves true once
  // both floors are cleared, false if you left any other way.
  C2.sorting = async function (how) {
    const RD = SD.raid, net = SD.net, CH = SD.champions;
    SD.main.show('run');
    const root = U.$('#run');
    CH.setMine(leadId());
    if (!undress) dress();
    let won = false, hub = null, dir = null;
    const onEnd = r => { won = !!(r && r.won); };
    try {
      hub = await net.open();
      if (how === 'solo') {
        // Alone, you're your lead, not "Player 1" (unless you've named yourself in a party before).
        if (hub.setNick && !(hub.remembered && hub.remembered())) hub.setNick(SD.ch1story.leads[leadId()].name.split(' ')[0], true);
        await RD.play(root, hub, net.code('sorting'), story({ create: true, auto: { bots: ORDER.filter(x => x !== leadId()) }, onEnd }));
      } else {
        dir = await hub.directory('sorting');
        const create = how === 'party', code = create ? net.code('sorting') : await joinScreen(root, dir);
        if (code) {
          // The leader keeps the party on the stair's list while it waits in the party room, as the mines do.
          let status = null, last = '', hosting = false, listed = true;
          const beat = () => {
            const st = status ? status() : null;
            if (!st || !st.lead) { if (hosting) { hosting = false; last = ''; dir.unhost(); } return; }
            const info = { code, nick: hub.me.nick, players: st.players, max: st.max, open: !!(listed && st.open), champ: st.champ || null, info: net.clean(st.info, 48) };
            const j = JSON.stringify(info);
            if (j !== last) { last = j; hosting = true; dir.host(info); }
          };
          const poll = setInterval(beat, 1000);
          try {
            await RD.play(root, hub, code, story({ create, onEnd, status: f => { status = f; beat(); }, vis: { get: () => listed, set: v => { listed = !!v; beat(); } } }));
          } finally { clearInterval(poll); if (hosting) dir.unhost(); }
        }
      }
    } catch (e) {
      console.warn('Sorting Floors:', e);
    } finally {
      if (dir) dir.leave();
      if (undress) undress();
    }
    return won;
  };
  // Climb: solo with your three, or with friends. Resolves once you're back down, cleared or not.
  C2.climb = function (noBack) {
    return new Promise(res => {
      const net = !!(SD.net && SD.raid);
      const b = U.panel(`<p>Up the stair are the Sorting Floors: the halls where Thornwick's letters go to be processed, and never come out.</p>
        <p class="muted small">Expedition I: two raid floors, Intake and Fan-out, each with a boss. Fall, and one of Seymour's tapes puts you back at the start of the floor: two tapes a climb.</p>
        <div class="opts"><button class="opt primary" id="sf-solo"><b>Climb</b> · you and your three</button>
        ${net ? '<button class="opt" id="sf-party"><b>Form a party</b> · friends join with your code</button><button class="opt" id="sf-join"><b>Join a party</b> · with a friend\'s code</button>' : ''}</div>
        ${noBack ? '' : '<div class="row"><button class="ghost" id="sf-not">Not yet</button></div>'}`, { title: 'THE SORTING FLOORS', noClose: true });
      const go = how => async () => { U.closePanel(); c2().f.act1 = true; S.persist(); AU.music('story'); if (SD.c2world && SD.c2world.active) SD.c2world.halt(); const won = await C2.sorting(how); res(won); after(won); };
      b.querySelector('#sf-solo').onclick = go('solo');
      if (net) { b.querySelector('#sf-party').onclick = go('party'); b.querySelector('#sf-join').onclick = go('join'); }
      if (!noBack) b.querySelector('#sf-not').onclick = () => { U.closePanel(); res(null); };
    });
  };
  // Back down the stair: cleared, the camp; not, the Free Cloud's fire and another go.
  function after(won) {
    if (won) { setFlag('won'); afterExpedition(); } else lost();
  }

  // ---------- Playing it ----------
  const stageArt = id => `<img class="vstage" src="${K.scenes[id]}" alt="">`;
  U.stageDecor.c2fire = stageArt('c2-fire');
  U.stageDecor.c2office = stageArt('c2-office');
  const say = lines => U.dialog(lines.map(([s, t, e]) => ({ s, t, e })));
  Object.assign(SD.cast, {
    coo: { name: 'Postmaster Coo', title: 'Pingsby Post' }, pip: { name: 'Pip', title: 'A lost packet' },
    seymour: { name: 'Sir Seymour Backups', title: 'Offline' }, tilly: { name: 'Tilly', title: 'Inquisition novice' },
    marrow: { name: 'Goodwife Marrow', title: 'Thornwick\'s bell-ringer' }, hale: { name: 'Grand Inquisitor Hale', title: 'Thornwick' }
  });
  [['coo', 900], ['pip', 1300], ['seymour', 260], ['tilly', 1150], ['marrow', 520]].forEach(([w, hz]) => U.voice(w, hz));

  C2.start = async function () {
    document.body.classList.add('c2-on');
    c2(); S.persist();
    SD.ch1.halt(); U.closePanel(); U.stage(null);
    AU.music('story');
    if (!flag('act1')) {
      await cut.play(['cold', ['fx', 'black'], 'edge']);
      await C2.pair('tof');
      await cut.play(['tower', 'scrap', 'bunker']);
      await cut.play(['wren', 'fire', 'thornwick']);
      await C2.pair('unmake');
      await cut.play('thornwick-post');
      setFlag('act1');
    }
    if (!flag('won')) return C2.climb(true);
    camp();
  };
  async function lost() {
    U.stage('c2fire');
    await say([['coo', 'Back down the stair! Everyone in one piece? Mostly? Good. The floors will keep.', 'smile']]);
    const b = U.panel('<p>The Sorting Floors grew back at midnight, the way they always do. Climb again?</p><button class="primary" id="v2-again">Climb the stair</button>', { title: 'THE FREE CLOUD', noClose: true });
    b.querySelector('#v2-again').onclick = () => { U.closePanel(); U.stage(null); C2.climb(true); };
  }
  async function afterExpedition() {
    await C2.pairsMissed();
    U.stage(null);
    await cut.play('redeploy');
    U.stage('c2fire');
    await Q.ask(PIP_Q, { title: 'WHY DID THAT WORK?', context: 'Pip, after the expedition' });
    await say([['pip', 'Oh. A filter on each one. That\'s nice. I\'d like one of those.', 'happy'], ['dutch', 'So we change the template. And it gets through her pipeline, or it doesn\'t.', 'neutral'], ['coo', 'Ship it! And when you\'ve shipped it, I\'ve got a sorting desk that needs you.', 'smile']]);
    camp();
  }
  function camp() {
    U.stage('c2office');
    const f = c2().f, both = f.ship && f.quest;
    const btn = (id, label, done, primary) => `<button class="opt${primary ? ' primary' : ''}" id="${id}"${done ? ' disabled' : ''}>${label}${done ? ' ✓' : ''}</button>`;
    const b = U.panel(`<p>The Free Cloud's post office: Coo behind the counter, Pip at a desk of his own, Elder Wren by the fire talking to nobody. Seymour has opened a hatch for tapes.</p>
      ${SD.quests.curses(2).length ? '<p class="small"><b>☠ Nothing Arrives</b> still hangs over the Sorting Floors: an Unread Letter in every deck, costing the team SLA each turn it sits unread.</p>' : '<p class="small"><b>✉ Coo\'s Redrive Stamp</b>: Nothing Arrives is lifted.</p>'}
      <div class="opts">${btn('v2-ship', '<b>Ship It</b> · make the floors\' fix stick', f.ship, !f.ship)}
      ${btn('v2-quest', '<b>At Least Once, At Most Twice</b> · Coo\'s quest', f.quest, f.ship && !f.quest)}
      ${both ? '<button class="opt primary" id="v2-up"><b>Take the lift to floor 7</b></button>' : ''}</div>`, { title: 'CAMP · THE FREE CLOUD', noClose: true });
    const on = (id, fn) => { const el = b.querySelector('#' + id); if (el) el.onclick = () => { U.closePanel(); fn(); }; };
    on('v2-ship', shipIt); on('v2-quest', cooQuest); on('v2-up', lift);
  }

  // Ship It: the floors' fix as a SAM template, tested on the camp table, then deployed.
  async function shipIt() {
    await say([['coo', 'The tower redeploys from its template at midnight. So: we change the template. A function, a queue, and a dead-letter queue for the letters that won\'t go.', 'neutral']]);
    await Q.ask({ c: 'lambdasqs', type: 'multi', hint: 'Pick everything the template needs. Leave out what doesn\'t belong.',
      q: 'Ship It, step 1 of 3. Lay out the floors\' fix as a SAM template. What goes in it?',
      items: [
        { t: 'Transform: AWS::Serverless-2016-10-31 at the top', ok: true },
        { t: 'An AWS::Serverless::Function with an SQS event on the letters queue', ok: true },
        { t: 'The letters queue (AWS::SQS::Queue) with a RedrivePolicy: deadLetterTargetArn and maxReceiveCount', ok: true },
        { t: 'A second AWS::SQS::Queue to be the dead-letter queue', ok: true },
        { t: 'Access keys for the function, in its environment variables', ok: false, no: 'The function gets temporary credentials from its execution role. Keys in configuration leak.' },
        { t: 'An EC2 instance to poll the queue', ok: false, no: 'Lambda\'s event source mapping polls the queue for you.' }
      ],
      why: 'The SAM transform expands AWS::Serverless::Function into a function, its execution role and, from its SQS event, an event source mapping. The redrive policy sits on the source queue and points at the dead-letter queue.',
      eli5: 'The template is a build guide you hand the game: a header saying it\'s a SAM guide, the function, the letters queue, and a lost-and-found queue, with a rule on the letters queue that says "after this many fails, send it to lost-and-found". No keys taped inside, and no extra character standing around checking the queue, because Lambda does that for you.' }, { title: 'SHIP IT', context: 'Coo\'s counter · 1 of 3' });
    await Q.ask({ c: 'lambdasqs', type: 'order', q: 'Ship It, step 2 of 3. Put the steps in the order you\'d take them, from the camp table to the tower.',
      items: ['Run the unit test against the handler', 'sam build: stage the code and its dependencies', 'sam local invoke with a test SQS event', 'sam deploy: upload and deploy through a CloudFormation change set'],
      why: 'Unit tests run against the source. sam build stages the function and its dependencies in .aws-sam/build; sam local invoke runs the built function in a container with an event file (sam local generate-event sqs receive-message makes one); sam deploy uploads the artifacts and deploys the stack through a CloudFormation change set.',
      eli5: 'Like shipping a game patch: test the code on your own machine, pack it, play it once locally, then push it to the live servers. sam build packs it, sam local invoke is the local test run, and sam deploy goes live.' }, { title: 'SHIP IT', context: 'Coo\'s counter · 2 of 3' });
    await Q.ask({ c: 'dlq', type: 'mc', q: 'Ship It, step 3 of 3. The test letter is meant to fail every time, and maxReceiveCount is 3. What should the camp see once it\'s deployed?',
      opts: ['Three failed tries, then SQS moves the letter to the dead-letter queue', 'One failure, then the letter is deleted', 'The letter retried forever, every visibility timeout', 'The function\'s deployment rolled back'], a: 0,
      no: [null, 'SQS never deletes a letter for failing.', 'That\'s the floors as they were. The redrive policy is what stops it.', 'A letter failing isn\'t a failed deployment.'],
      why: 'Each receive without a delete counts. Once the count passes maxReceiveCount, the redrive policy moves the letter to the dead-letter queue.',
      eli5: 'Three strikes and you\'re out: the letter gets three tries, then goes to the lost-and-found shelf instead of looping forever.' }, { title: 'SHIP IT', context: 'Coo\'s counter · 3 of 3' });
    setFlag('ship');
    R.gainXp(40);
    U.system('SHIPPED', 'Floors 2 to 6 stay cleared at midnight. The lift opens to floor 7.', 'gold');
    U.stage(null);
    await cut.play('shipped');
    camp();
  }

  // Coo's quest, "At Least Once, At Most Twice": Lambda reading from SQS, and the Sorting Desk.
  async function cooQuest() {
    U.stage('c2office');
    await say([['coo', 'Every letter delivered at least once. That\'s my promise. At most twice is the hard part. Come and sort with me.', 'smile']]);
    await Q.ask(SD.questions.find(q => q.id === 'q-ls1'), { title: 'AT LEAST ONCE, AT MOST TWICE', context: 'Coo\'s sorting desk · 1 of 4' });
    await sortingDesk();
    await Q.ask(SD.questions.find(q => q.id === 'q-ls3'), { title: 'AT LEAST ONCE, AT MOST TWICE', context: 'Coo\'s sorting desk · 3 of 4' });
    await Q.ask({ c: 'lambdasqs', type: 'mc', q: 'A letter is delivered twice anyway, as standard queues sometimes do. What makes the second delivery harmless?',
      opts: ['An idempotency key: record each letter\'s ID once it\'s done, and skip any ID you\'ve seen', 'A longer visibility timeout', 'A bigger batch size', 'Deleting each letter as soon as it\'s received, before sorting it'], a: 0,
      no: [null, 'That makes a repeat rarer, not harmless.', 'Batch size doesn\'t change what a repeat does.', 'Then a crash mid-sort loses the letter for good.'],
      why: 'At-least-once delivery means a repeat can happen. Checking a stored idempotency key before acting turns the second delivery into a no-op.',
      eli5: 'It\'s a quest log that remembers which quests you\'ve turned in. When the same quest shows up again, the game sees it\'s already done and gives no double reward.' }, { title: 'AT LEAST ONCE, AT MOST TWICE', context: 'Coo\'s sorting desk · 4 of 4' });
    c2().dev.redrive = true; setFlag('quest');
    AU.sfx('right');
    U.system('PLOT DEVICE: COO\'S REDRIVE STAMP', 'Curse lifted: Nothing Arrives. No more Unread Letters in your deck on the stair.', 'gold');
    await say([['coo', 'Here. My redrive stamp. Anything that comes back to Thornwick from now on comes back to someone who reads it.', 'smile']]);
    camp();
  }
  // Predict, then sort: a batch of ten, two letters bounce. Report only those.
  function sortingDesk() {
    return new Promise(res => {
      const bad = new Set([3, 8]), on = new Set();
      const b = U.panel(`<p>A batch of ten letters from the queue. Letters <b>3</b> and <b>8</b> bounced. Tap the letters to report as failed, then return the response. Lambda deletes every letter you don't report.</p>
        <div class="sd-letters opts">${Array.from({ length: 10 }, (_, i) => `<button class="opt${bad.has(i + 1) ? ' bad' : ''}" data-i="${i + 1}">✉ ${i + 1}</button>`).join('')}</div>
        <div class="sd-resp" id="sd-resp"></div><button class="primary" id="sd-go">Return the response</button>`, { title: 'THE SORTING DESK', noClose: true });
      const resp = () => { b.querySelector('#sd-resp').textContent = JSON.stringify({ batchItemFailures: [...on].sort((a, c) => a - c).map(i => ({ itemIdentifier: 'msg-' + i })) }, null, 1); };
      resp();
      b.querySelectorAll('[data-i]').forEach(el => el.onclick = () => { const i = +el.dataset.i; if (on.has(i)) on.delete(i); else on.add(i); el.classList.toggle('on', on.has(i)); AU.sfx('card'); resp(); });
      b.querySelector('#sd-go').onclick = () => {
        const ok = on.size === 2 && [...bad].every(i => on.has(i));
        S.recordAnswer('lambdasqs', ok, 1, 15000);
        AU.sfx(ok ? 'right' : 'wrong');
        const out = ok ? 'Lambda deletes the eight that worked. Only 3 and 8 come back, after the visibility timeout, and each failure counts toward maxReceiveCount.'
          : on.size === 0 ? 'An empty batchItemFailures list means every letter succeeded, so Lambda deletes all ten, and letters 3 and 8 are lost.'
          : `You reported ${[...on].join(', ')}. Every reported letter comes back after the visibility timeout; every one you didn't report is deleted.`;
        const b2 = U.panel(`<div class="verdict ${ok ? 'ok' : 'bad'}">${ok ? 'SORTED!' : 'NOT QUITE'}</div><p>${esc(out)}</p><p class="why">${esc(SD.concepts.lambdasqs.gist)}</p><button class="primary" id="sd-ok">Continue</button>`, { title: 'THE SORTING DESK · 2 OF 4', noClose: true });
        b2.querySelector('#sd-ok').onclick = () => { U.closePanel(); res(ok); };
      };
    });
  }

  // The handover to part B (floors 7 to 20, js/c2x-*.js): the lift, and the card's button, start it when it's loaded.
  // Without it, the "to be continued" card stays the end.
  const partB = () => (SD.chapterStart && typeof SD.chapterStart['2b'] === 'function' ? SD.chapterStart['2b'] : null);
  function lift() {
    setFlag('done');
    const go = partB();
    if (go) { U.stage(null); return go(); }
    toBeContinued();
  }
  function toBeContinued() {
    setFlag('done');
    const go = partB();
    U.stage('c2fire');
    const b = U.panel(`<div class="verdict ok">TO BE CONTINUED</div>
      <p>The lift opens on floor 7: the Dead Letter Office, where the prayers go. Somewhere at the bottom of it, someone has been reading every one of them for ten thousand years, and never answered.</p>
      <p class="muted small">End of the vector demo: the opening, chapter 1, and the first slice of chapter 2 (Expedition I, the first Ship It and Coo's quest), every picture drawn in code.</p>
      <div class="row">${go ? '<button class="primary" id="v2-next">Continue to floor 7</button>' : ''}<button class="${go ? 'ghost' : 'primary'}" id="v2-end">Title</button><button class="ghost" id="v2-replay">Replay chapter 2</button></div>`, { title: 'CHAPTER 2 · THE MAILROOM', noClose: true });
    if (go) b.querySelector('#v2-next').onclick = () => { U.closePanel(); U.stage(null); go(); };
    b.querySelector('#v2-end').onclick = () => { U.closePanel(); U.stage(null); SD.main.title(); };
    b.querySelector('#v2-replay').onclick = () => { U.closePanel(); S.save.c2 = null; S.persist(); C2.start(); };
  }

  // Chapter 2's start, for chapter 1's end card (its #c1-next button) and anything else that hands over (conventions:
  // SD.chapterStart). C2.start is looked up when called, so in the world build it opens the act 1 world (js/c2-world.js).
  SD.chapterStart = SD.chapterStart || {};
  SD.chapterStart[2] = () => C2.start();

  K.install();
})();
