// The vector proof of concept's chapter 2 slice, "The Mailroom": the cold open on a new moon, the edge and the tower,
// the scrap field where the camp begins (Coo and Elder Wren restored from old versions, Seymour's tape, the Free
// Cloud named), Thornwick's town floor and Freya's free offer, Expedition I (the Sorting Floors: Intake and Fan-out,
// two raid floors), then camp: Pip's question, the first Ship It, and Coo's quest, whose Plot Device lifts Nothing
// Arrives. It ends on a "to be continued" card. It opens from chapter 1's end card (js/ch1-world.js W1.onEndCard).
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
  // Nothing Arrives: retries hit 40% harder (the engine's 'echo' curse) until Coo's Redrive Stamp lifts it.
  SD.curses.echo = { name: 'Nothing Arrives', text: 'Retries hit 40% harder and leave the halls stale.', hint: 'Coo\'s quest, "At Least Once, At Most Twice", lifts it.' };
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
  // Pip's question after the expedition: the Belfry's answer, explained.
  const PIP_Q = { c: 'snsfan', type: 'mc', q: 'Pip: "Why did the Belfry\'s bells stop hitting all of us at once?"',
    opts: ['Each subscription got a filter policy, so each copy only reached the one it was for', 'The topic was switched to FIFO, so the copies came one at a time', 'We deleted the topic, so nothing was sent', 'The visibility timeout hid the copies until the fight was over'], a: 0,
    no: [null, 'Ordering copies doesn\'t stop each subscriber getting one.', 'We fixed the subscriptions; the topic still delivers.', 'Topics have no visibility timeout; that\'s a queue setting.'],
    why: 'A topic sends a copy to every subscription. A filter policy on each subscription decides which copies it accepts.' };

  // ---------- Moments you play in the visual novel ----------
  const esc = s => U.esc(s);
  const css = document.createElement('style');
  css.textContent = `
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
.sd-letters .opt { padding: 10px 4px; text-align: center; font: 700 13px ui-monospace, monospace; }
.sd-letters .opt.bad { box-shadow: inset 0 0 0 3px #d63a3a; }
.opt.primary, .opt.primary:hover:not(:disabled) { background: var(--blue); color: #fff; }
.sd-resp { font: 12px/1.4 ui-monospace, monospace; background: #1d1b2a; color: #d9e6ff; padding: 8px 10px; border-radius: 8px; white-space: pre-wrap; }
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

  // ---------- Expedition I: The Sorting Floors ----------
  R.NODE.fboss = { l: 'Floor Boss', g: 'crowned-skull' };
  const EVENTS = {
    pip: { title: 'Pip in the Dead Letters', concept: 'dlq',
      text: 'In a sorting bin on the first floor, under a drift of returned mail, is Pip: a small, polite packet who has never been answered and is very sorry to be a bother. "They tried me three times," he says, "and then they put me in here. Is that bad?"',
      choices: [
        { label: 'You\'re in a dead-letter queue: you failed past maxReceiveCount, so SQS set you aside for someone to look at', good: true, out: 'Pip: "Set aside. For someone to look at. Oh." He climbs into your satchel. He\'ll be at camp from now on.', effect: { card: 'dlq', xp: 15 } },
        { label: 'SQS deletes a letter after three failures, so you shouldn\'t exist', good: false, out: 'SQS never deletes a letter for failing. Only a DeleteMessage call, or the retention period running out, removes one.', effect: { sla: -5 } },
        { label: 'You\'re in a FIFO queue, so you\'re waiting your turn', good: false, out: 'He\'s not waiting his turn. He failed, more times than the redrive policy allows.', effect: {} }
      ] },
    runbook: { title: 'Kyu\'s Runbook, Page 1', concept: 'lambdasqs',
      text: 'A page in Kyu\'s handwriting, pinned to a sorting desk: a worked example. "A function reads ten letters at a time. One is malformed. Every batch fails, and the nine good ones go round again." Underneath, she\'s left a blank for the fix.',
      choices: [
        { label: 'Turn on partial batch responses and report only the bad letter; a redrive policy parks it after maxReceiveCount', good: true, out: 'The nine good letters are deleted. The bad one comes back alone, and after a few tries the redrive policy takes it to the dead-letter queue.', effect: { card: 'batchfail', xp: 15 } },
        { label: 'Catch the error and return success, so the batch is deleted', good: false, out: 'The batch is deleted, the bad letter with it, and nobody ever finds out what was wrong with it.', effect: { sla: -6 } },
        { label: 'Raise the batch size, so the bad letter is a smaller share', good: false, out: 'Now a hundred good letters go round again instead of nine.', effect: { sla: -4 } }
      ] },
    pigeon: { title: 'Coo\'s Lost Pigeon', concept: 'kinesis',
      text: 'A pigeon flies in a minute late with a sack of letters for the archive, then another a minute after that. Coo: "The archive takes them in batches, never one at a time, and never loses one. What does that remind you of?"',
      choices: [
        { label: 'Amazon Data Firehose: it buffers records by size or time and delivers them to S3 in batches', good: true, out: 'Coo: "A minute late, never lost. That\'s my girl." The pigeon looks smug.', effect: { xp: 15, sla: 5 } },
        { label: 'An SNS topic with the archive subscribed', good: false, out: 'S3 isn\'t something a topic can deliver to, and a topic doesn\'t batch.', effect: {} },
        { label: 'A Kinesis data stream with no consumer', good: false, out: 'With no consumer, the records sit in the stream until they expire. Nothing reaches the archive.', effect: { sla: -4 } }
      ] },
    oldroad: { title: 'The Old Post Road', concept: 'mqmsk',
      text: 'Two old routes still run into the Sorting Floors. One is the coaching inn\'s system, which speaks AMQP and STOMP and nothing else. The other is the river barges\' Kafka cluster. Neither wants rewriting.',
      choices: [
        { label: 'Amazon MQ for the inn\'s broker protocols, and Amazon MSK for the barges\' Kafka', good: true, out: 'Both roads keep their own language, and both connect.', effect: { xp: 15 } },
        { label: 'Rewrite both to use SQS', good: false, out: 'That might be right one day. Today it\'s two rewrites nobody asked for.', effect: { sla: -3 } },
        { label: 'Put both behind one SNS topic', good: false, out: 'SNS doesn\'t speak AMQP or Kafka\'s protocol to them.', effect: {} }
      ] }
  };
  function event(id, done) {
    const run = S.save.run, ev = EVENTS[id];
    S.seeConcept(ev.concept);
    const order = Q.shuffle(ev.choices.map((c, i) => i));
    const b = U.panel(`<p>${esc(ev.text)}</p><div class="opts">${order.map(i => `<button class="opt" data-c="${i}">${esc(ev.choices[i].label)}</button>`).join('')}</div>`, { title: ev.title.toUpperCase(), noClose: true });
    b.querySelectorAll('[data-c]').forEach(el => el.onclick = () => {
      const ch = ev.choices[+el.dataset.c], e = ch.effect;
      S.recordAnswer(ev.concept, ch.good, 1, 15000);
      if (e.sla) run.sla = Math.max(1, Math.min(S.maxSla(), run.sla + e.sla));
      if (e.card) run.deck.push({ id: e.card, up: false });
      if (e.xp) R.gainXp(e.xp);
      if (id === 'pip') setFlag('pip');
      S.persist(); AU.sfx(ch.good ? 'right' : 'wrong');
      const fx = [e.sla ? `${e.sla > 0 ? '+' : ''}${e.sla} SLA` : '', e.card ? `New card: ${SD.cards[e.card].name}` : '', e.xp ? `+${e.xp} XP` : ''].filter(Boolean).join(' · ');
      const b2 = U.panel(`<div class="verdict ${ch.good ? 'ok' : 'bad'}">${ch.good ? 'GOOD CALL!' : 'HMM...'}</div><p>${esc(ch.out)}</p>${fx ? `<p class="muted">${esc(fx)}</p>` : ''}<p class="why">${esc(SD.concepts[ev.concept].gist)}</p><button class="primary" id="ev-ok">Continue</button>`, { title: ev.title.toUpperCase(), noClose: true });
      b2.querySelector('#ev-ok').onclick = () => { U.closePanel(); done(); };
    });
  }
  function sortingRoom(done) {
    const run = S.save.run, heal = Math.round(S.maxSla() * 0.3);
    const b = U.panel(`<p>An empty sorting room with a kettle that works. Everyone sits on the mail sacks at once.</p>
      <div class="opts"><button class="opt" id="sr-rest"><b>Rest</b> · Mira patches everyone up: recover ${heal} SLA</button>
      <button class="opt" id="sr-up"><b>Practise</b> · upgrade a card (+3 to its numbers)</button></div>`, { title: 'THE SORTING ROOM', noClose: true });
    b.querySelector('#sr-rest').onclick = () => { run.sla = Math.min(S.maxSla(), run.sla + heal); AU.sfx('heal'); S.persist(); U.closePanel(); done(); };
    b.querySelector('#sr-up').onclick = () => R.api.pickCard('Upgrade which card?', c => { c.up = true; S.persist(); U.closePanel(); U.system('CARD UPGRADED', esc(SD.cards[c.id].name) + '+'); done(); }, () => sortingRoom(done), c => !c.up && SD.cards[c.id].rarity);
  }
  const floorOf = id => (+String(id).split('-')[0] < 3 ? 1 : 2);   // floor 1 ends with the Postmistress on row 3
  SD.chapters[2] = {
    name: 'the Sorting Floors', rank: 'E', boss: 'belfry', gate: 'UP THE STAIR TO THE SORTING FLOORS...',
    blurb: 'Expedition I: the halls where Thornwick\'s letters are processed, and never come out.',
    pools: { 1: ['pill', 'visghost'], 2: ['twins2', 'emptyclerk'], 3: ['towncrier', 'millrace'], elite: ['backlog', 'herd'] },
    hooks: {
      start(run) {
        const lead = S.save.c1 && S.save.c1.lead;
        run.deck = ['hotfix', 'hotfix', 'hotfix', 'hotfix', SD.ch1story.leads[lead] ? SD.ch1story.leads[lead].card : 'hotfix', 'dlq', 'vistimeout', 'idem', 'longpoll', 'fifo', 'subscribe', 'filterpol', 'pattern', 'shardkey'].map(id => ({ id, up: false }));
        const N = (id, type, next, x) => Object.assign({ id, f: +id.split('-')[0], lane: +id.split('-')[1], type, next }, x || {});
        run.map = { floors: [
          [N('0-0', 'fight', ['1-0', '1-1'], { eid: 'pill' }), N('0-2', 'fight', ['1-1', '1-2'], { eid: 'emptyclerk' })],
          [N('1-0', 'event', ['2-0'], { ev: 'pip' }), N('1-1', 'fight', ['2-0', '2-2'], { eid: 'twins2' }), N('1-2', 'fight', ['2-2'], { eid: 'visghost' })],
          [N('2-0', 'elite', ['3-1'], { eid: 'backlog' }), N('2-2', 'event', ['3-1'], { ev: 'runbook' })],
          [N('3-1', 'fboss', ['4-0', '4-1', '4-2'], { eid: 'postmistress' })],
          [N('4-0', 'fight', ['5-0'], { eid: 'towncrier' }), N('4-1', 'event', ['5-0', '5-2'], { ev: 'oldroad' }), N('4-2', 'fight', ['5-2'], { eid: 'bellnoringer' })],
          [N('5-0', 'event', ['6-0', '6-2'], { ev: 'pigeon' }), N('5-2', 'fight', ['6-2'], { eid: 'millrace' })],
          [N('6-0', 'elite', ['7-1'], { eid: 'herd' }), N('6-2', 'camp', ['7-1'])],
          [N('7-1', 'boss', [])]
        ] };
        SD.ch1.dress();
      },
      hud(run) { const f = run.pos ? floorOf(run.pos) : 1; return `<span class="hud-chip">Raid floor ${f}: ${f === 1 ? 'Intake' : 'Fan-out'}</span>`; },
      node(n, done) {
        if (n.type === 'fboss') {
          U.system('[FLOOR BOSS] THE POSTMISTRESS', 'A standard queue: her hits arrive out of order, and some arrive twice. A FIFO card puts them in order, but only within one message group.', 'gold');
          R.api.fight(n.eid, { boss: true }, () => { U.system('RAID FLOOR 1 CLEARED', 'Intake is quiet. Up the stair: Fan-out.', 'gold'); done(); });
          return true;
        }
        if (n.eid) { R.api.fight(n.eid, { diagnose: true, elite: n.type === 'elite' }, done); return true; }
        if (n.ev) { event(n.ev, done); return true; }
        if (n.type === 'camp') { sortingRoom(done); return true; }
        return false;
      },
      boss() {
        belfry();
        return true;
      },
      end(won) {
        S.save.run = null; S.persist();
        if (won) { setFlag('won'); afterExpedition(); return true; }
        lost();
        return true;
      }
    }
  };

  // ---------- The bosses' incidents (js/run.js R.incident) and Exam Twists (examTwist) ----------
  // The Belfry, the floors' last boss, is worked as an incident first: diagnose, fix, prevent. The Postmistress, the
  // floor boss on the way, has only her twists.
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
  async function belfry() {
    AU.music('boss');
    const buffs = { sevScale: 1, bonusEnergy: 0, startCard: null };
    SD.bossDesign.belfry.concepts.forEach(c => S.seeConcept(c));
    const ok = await R.incident('belfry', buffs);
    S.save.run.boss = ok;
    S.persist();
    U.system('[BOSS] THE BELFRY', 'One attack, copied to every subscriber. Filter policies make each copy reach only the one it\'s addressed to.', 'gold');
    R.api.fight('belfry', { boss: true, reveal: !!(ok.diagnose || ok.prevent), sevScale: buffs.sevScale, bonusEnergy: buffs.bonusEnergy, startCard: buffs.startCard }, () => R.api.endRun(true));
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
    c2(); S.persist();
    SD.ch1.halt(); U.closePanel(); U.stage(null);
    AU.music('story');
    if (!flag('act1')) {
      await SD.vn.play([...T.cold, ['fx', 'black'], ...T.edge, ...T.tower, ...T.scrap, ...T.bunker, ...T.wren, ...T.fire, ...T.thornwick]);
      setFlag('act1');
    }
    if (!flag('won')) return R.start(2);
    camp();
  };
  async function lost() {
    U.stage('c2fire');
    await say([['coo', 'Back down the stair! Everyone in one piece? Mostly? Good. The floors will keep.', 'smile']]);
    const b = U.panel('<p>The Sorting Floors grew back at midnight, the way they always do. Climb again?</p><button class="primary" id="v2-again">Climb the stair</button>', { title: 'THE FREE CLOUD', noClose: true });
    b.querySelector('#v2-again').onclick = () => { U.closePanel(); U.stage(null); R.start(2); };
  }
  async function afterExpedition() {
    U.stage(null);
    await SD.vn.play(T.redeploy);
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
      ${SD.quests.curses(2).length ? '<p class="small"><b>☠ Nothing Arrives</b> still hangs over the Sorting Floors: retries hit 40% harder.</p>' : '<p class="small"><b>✉ Coo\'s Redrive Stamp</b>: Nothing Arrives is lifted.</p>'}
      <div class="opts">${btn('v2-ship', '<b>Ship It</b> · make the floors\' fix stick', f.ship, !f.ship)}
      ${btn('v2-quest', '<b>At Least Once, At Most Twice</b> · Coo\'s quest', f.quest, f.ship && !f.quest)}
      ${both ? '<button class="opt primary" id="v2-up"><b>Take the lift to floor 7</b></button>' : ''}</div>`, { title: 'CAMP · THE FREE CLOUD', noClose: true });
    const on = (id, fn) => { const el = b.querySelector('#' + id); if (el) el.onclick = () => { U.closePanel(); fn(); }; };
    on('v2-ship', shipIt); on('v2-quest', cooQuest); on('v2-up', toBeContinued);
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
      why: 'The SAM transform expands AWS::Serverless::Function into a function, its execution role and, from its SQS event, an event source mapping. The redrive policy sits on the source queue and points at the dead-letter queue.' }, { title: 'SHIP IT', context: 'Coo\'s counter · 1 of 3' });
    await Q.ask({ c: 'lambdasqs', type: 'order', q: 'Ship It, step 2 of 3. Put the steps in the order you\'d take them, from the camp table to the tower.',
      items: ['Run the unit test against the handler', 'sam build: stage the code and its dependencies', 'sam local invoke with a test SQS event', 'sam deploy: upload and deploy through a CloudFormation change set'],
      why: 'Unit tests run against the source. sam build stages the function and its dependencies in .aws-sam/build; sam local invoke runs the built function in a container with an event file (sam local generate-event sqs receive-message makes one); sam deploy uploads the artifacts and deploys the stack through a CloudFormation change set.' }, { title: 'SHIP IT', context: 'Coo\'s counter · 2 of 3' });
    await Q.ask({ c: 'dlq', type: 'mc', q: 'Ship It, step 3 of 3. The test letter is meant to fail every time, and maxReceiveCount is 3. What should the camp see once it\'s deployed?',
      opts: ['Three failed tries, then SQS moves the letter to the dead-letter queue', 'One failure, then the letter is deleted', 'The letter retried forever, every visibility timeout', 'The function\'s deployment rolled back'], a: 0,
      no: [null, 'SQS never deletes a letter for failing.', 'That\'s the floors as they were. The redrive policy is what stops it.', 'A letter failing isn\'t a failed deployment.'],
      why: 'Each receive without a delete counts. Once the count passes maxReceiveCount, the redrive policy moves the letter to the dead-letter queue.' }, { title: 'SHIP IT', context: 'Coo\'s counter · 3 of 3' });
    setFlag('ship');
    R.gainXp(40);
    U.system('SHIPPED', 'Floors 2 to 6 stay cleared at midnight. The lift opens to floor 7.', 'gold');
    U.stage(null);
    await SD.vn.play(T.shipped);
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
      why: 'At-least-once delivery means a repeat can happen. Checking a stored idempotency key before acting turns the second delivery into a no-op.' }, { title: 'AT LEAST ONCE, AT MOST TWICE', context: 'Coo\'s sorting desk · 4 of 4' });
    c2().dev.redrive = true; setFlag('quest');
    AU.sfx('right');
    U.system('PLOT DEVICE: COO\'S REDRIVE STAMP', 'Curse lifted: Nothing Arrives. Retries in the Sorting Floors are back to normal.', 'gold');
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

  function toBeContinued() {
    setFlag('done');
    U.stage('c2fire');
    const b = U.panel(`<div class="verdict ok">TO BE CONTINUED</div>
      <p>The lift opens on floor 7: the Dead Letter Office, where the prayers go. Somewhere at the bottom of it, someone has been reading every one of them for ten thousand years, and never answered.</p>
      <p class="muted small">End of the vector demo: the opening, chapter 1, and the first slice of chapter 2 (Expedition I, the first Ship It and Coo's quest), every picture drawn in code.</p>
      <div class="row"><button class="primary" id="v2-end">Title</button><button class="ghost" id="v2-replay">Replay chapter 2</button></div>`, { title: 'CHAPTER 2 · THE MAILROOM', noClose: true });
    b.querySelector('#v2-end').onclick = () => { U.closePanel(); U.stage(null); SD.main.title(); };
    b.querySelector('#v2-replay').onclick = () => { U.closePanel(); S.save.c2 = null; S.persist(); C2.start(); };
  }

  // Chapter 1's end card opens the slice.
  K.installs.push(() => {
    SD.ch1.onEndCard = b => {
      const p = b.querySelector('p'); if (p) p.textContent = 'Thanks for playing. In this vector build, chapter 2 opens here: the night after the wipe, the scrap field, and the first expedition up Freya\'s tower.';
      const go = document.createElement('button'); go.className = 'primary'; go.id = 'v2-go'; go.textContent = 'Play the chapter 2 slice';
      const row = b.querySelector('.row'); row.insertBefore(go, row.firstChild);
      const again = b.querySelector('#c1-again'); again.classList.remove('primary'); again.classList.add('ghost');
      go.onclick = () => C2.start();
    };
  });

  K.install();
})();
