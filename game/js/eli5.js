// Plain-language help for people new to AWS, shown after every quiz answer (js/quiz.js).
// SD.eli5: per question id, the answer explained through a game or anime you may know ("ELI5 🎮").
// SD.huh: per concept, the whole idea in game terms, for "Huh???". Questions without an id (the ones chapters ask
//   inline) show their concept's line under ELI5 too, so every concept needs one.
// SD.glossary: jargon, defined in one line, shown under "Huh???" when a word appears in the question. The first 8
//   matches show, so AWS terms come first and the more specific of two overlapping terms comes before the other.
// Every concept and every question in SD.questions needs its entry here: `node tools/help_check.js` checks it.
// AWS facts follow the current AWS documentation (Lambda, SQS, SNS, EventBridge, Kinesis, IAM, STS, CloudTrail, S3).
// Write every line fresh; never copy practice-exam questions or course material.
window.SD = window.SD || {};

SD.eli5 = {
  // Lambda concurrency
  'q-lc1': 'The raid instance is full. The next players get "server full, try again later" (that\'s the 429 error), and it\'s on them to retry.',
  'q-lc2': 'If 200 players start a half-second speedrun every second, about 100 runs are always in progress at once: 200 × 0.5 = 100.',
  'q-lc3': 'A cold start is the summoning animation before your summon can act. Provisioned concurrency keeps summons already out on the field, so they act instantly. You pay for them while they stand there.',
  // SQS and dead-letter queues
  'q-sq1': 'You took a quest off the board, then rage-quit before turning it in. When its timer runs out, the quest lights back up on the board for someone else.',
  'q-sq2': 'The quest has to stay greyed out long enough for Lambda to try, get told "busy", and try again. The rule of thumb is six times Lambda\'s time limit: 6 × 60 = 360 seconds.',
  'q-dl1': 'Each failed attempt is a strike. Go past the strike limit and the quest moves to the cursed-quests shelf instead of back onto the board.',
  'q-dl2': 'A strict single-file line needs a strict single-file reject pile. FIFO goes with FIFO.',
  'q-dl3': 'One strike and you\'re out. A letter that stumbles once, even from plain bad luck, goes straight to lost-and-found.',
  // IAM
  'q-iam1': 'One guard says "come in", but you\'re on another guard\'s ban list. The ban wins, every time.',
  'q-iam2': 'A fresh level-1 character with no keys can\'t open any door. Nothing says yes, so the answer is no.',
  'q-iam3': 'Give the function its own job class (its execution role) with one skill: reading that table. Lambda switches it into that class every time it runs.',
  'dva-2-05': 'The error is a sealed scroll that explains why you were blocked. DecodeAuthorizationMessage is the spell that unseals it, and you need permission to cast it.',
  'dva-2-13': 'Looking at what\'s on a shelf and taking an item off it are two different permissions. Listing goes on the shelf itself (the bucket name alone); getting goes on the items (the bucket name ending in /*).',
  // Roles and temporary credentials
  'q-ro1': 'Switching job class hands you a temporary pass: an ID, a secret and a ticket that expires, like a buff with a timer.',
  'q-ro2': 'The buff wears off after an hour unless you ask for a longer one when you cast it. Ask for 4 hours (14,400 seconds), the most this class allows.',
  'q-ro3': 'The trust policy is the "who may switch into this class" list, here Lambda. What the class can actually do is on its other list.',
  'q-ro4': 'Every pass handed out before the alarm is cancelled. Passes handed out after it still work, so also patch the hole the thief came through.',
  'q-mask': 'You need a mask that lets you put it on AND has the power to open this gate. Either one alone is just a hat.',
  'dva-2-16': 'Throw away the spare key under the doormat and give the building (the server) its own badge. The SDK looks for keys before badges, so the old keys must go; then it finds the badge by itself, with no code change.',
  // Resource policies and conditions
  'q-rp1': 'The treasure chest in the other kingdom says "you may open me", but your own kingdom never let you leave. Across kingdoms, both sides have to say yes.',
  'dva-2-04': 'Borrowing a job class from another guild takes two yeses: their list says you may switch in, and your own guild lets you go and ask (sts:AssumeRole).',
  'q-cn1': 'You used your two-factor code at the front door, but your script snuck in the side door with an old permanent key. That key never carries the two-factor stamp, so the rule bounces it.',
  'dva-2-10': 'Hang a sign on the vault: "no entry unless you came through the encrypted tunnel". A Deny for unencrypted requests does exactly that, and a Deny beats every Allow.',
  // CloudTrail
  'q-ct1': 'The replay only recorded setting changes. Recording who opened which file is an extra you have to switch on first, and nobody did, so last week\'s peek was never recorded.',
  'dva-4-12': 'Watch the replay. The change shows up as UpdateFunctionConfiguration, with who did it and when, and replays of changes are kept for 90 days.',
  // FIFO queues and long polling
  'q-fi1': 'Give each family its own single-file line (a message group). Each line stays in order, the lines move side by side, and duplicates get bounced.',
  'q-fi2': 'Instead of shouting "anything yet?" every second, wait at the counter for up to 20 seconds. Fewer empty trips, and a smaller bill.',
  'q-fi3': 'The FIFO clerk remembers each ticket number for 5 minutes. The same ticket 30 seconds later gets a polite "got it, thanks", and is quietly not delivered again.',
  // Lambda reading from SQS
  'q-ls1': 'One party member trips and the whole party restarts the dungeon, including the nine who cleared their rooms.',
  'q-ls2': 'Turn on ReportBatchItemFailures and hand back a list of only the rooms you failed. Only those get replayed.',
  'q-ls3': 'Six times the function timeout: 6 × 30 = 180 seconds.',
  // SNS fan-out
  'q-sn1': 'A town crier shouts each order, and every guild has its own mailbox listening. If one guild is out, its letters wait in its own mailbox until it\'s back.',
  'q-sn2': 'Put the filter on shipping\'s own subscription: "only tell me about CA orders". The crier still tells everyone else everything.',
  'q-sn3': 'One guild\'s filter only covers that guild. The others still get the message if their own filters match.',
  // EventBridge
  'q-eb1': 'The bell only rings for "LetterSent". "LetterRead" is a different word, so the bell stays quiet.',
  'q-eb2': 'Set an alarm clock (EventBridge Scheduler) for six every morning that pokes the function. Nothing has to keep running in between.',
  // Kinesis and Firehose
  'q-ki1': 'The bell\'s ID picks its conveyor belt. It gets the same belt every time, so its readings stay in line.',
  'q-ki2': 'A delivery cart that fills up and drops batches at the archive on its own. You don\'t write any code to drive it.'
};

SD.huh = {
  lambdaconc: 'Think of a Lambda function as a summon, like a Naruto shadow clone: each request gets its own clone, and concurrency is how many clones are out at once. To guess it, multiply how many requests arrive each second by how many seconds each clone stays out. Your account has a clone limit per region (1,000 to start, and you can ask for more). Past the limit, a caller who is waiting gets "too busy, try again" (a 429 error), and a job dropped off to run later waits and is retried. Reserved concurrency books clone slots for one function, and caps it there. Provisioned concurrency keeps clones already summoned, so nobody waits through the summoning animation (a cold start).',
  sqs: 'An SQS queue is the guild\'s quest board. Grabbing a quest doesn\'t tear it off; it greys it out for a while (the visibility timeout: 30 seconds unless you change it, 12 hours at most). Turn the quest in (delete it) before the timer ends, or it lights up again for the next adventurer. Now and then the board hands the same quest to two people, so finishing it twice has to be harmless. When Lambda is the one taking quests, set the timer to at least six times Lambda\'s time limit.',
  dlq: 'A dead-letter queue is the guild\'s cursed-quests shelf. Every time someone takes a quest and doesn\'t turn it in, it gets a strike. Too many strikes (more than maxReceiveCount) and it moves to the shelf instead of back onto the board, so one impossible quest can\'t waste everyone\'s time forever. The shelf has to match its board: a strict single-file (FIFO) board needs a FIFO shelf, in the same account and region.',
  iam: 'IAM is the bouncer at every door in AWS. Everyone starts on "no". A permission that says Allow gets you in, but a Deny anywhere beats every Allow, like a ban no VIP pass can override. Give your code only the passes it needs, through a role, never a permanent key.',
  roles: 'A role is a job class you can switch into, like a job change in Final Fantasy. It has two lists: who may switch into it (the trust policy), and what the class can do (its permissions). Switching in gives you a pass that wears off like a timed buff: 1 hour by default, and you can ask for anything from 15 minutes up to the role\'s own limit (1 to 12 hours). If a pass is stolen, revoking sessions cancels every pass handed out before that moment.',
  respolicy: 'Some doors carry their own guest list, like a guild hall that posts who may enter (an S3 bucket policy is one). Inside your own account, either your pass or the door\'s list letting you in is usually enough. Another account is another kingdom: your home kingdom has to let you go, AND the door over there has to have your name on its list.',
  conditions: 'Conditions are the "only if..." small print on a pass, like a dungeon door that only opens at night. One common rule is "only if the connection is encrypted", which turns away anyone on plain HTTP. Another is "only if you used your two-factor code (MFA)". That stamp is only on short-term passes you got by entering the code; a script using a permanent key never has it, even if you logged in with MFA earlier.',
  cloudtrail: 'CloudTrail is the replay for your account: who did what, when, and from where. Out of the box it keeps 90 days of setting changes, like someone editing a function or a bucket\'s permissions. Everyday reads of your data, like someone opening a file in S3, aren\'t recorded unless you switched that recording on beforehand, and it only records from then on.',
  sqsfifo: 'A standard queue is a fast mail sorter that can deliver a letter twice and only roughly in order. A FIFO queue is a strict line: order is kept within each message group ID, and a repeat with the same deduplication ID inside 5 minutes is dropped. Long polling (WaitTimeSeconds, up to 20) waits at the counter for mail instead of asking "anything?" over and over, and every empty answer is still billed.',
  lambdasqs: 'Lambda checks the queue for you and hands your function a batch of messages, like a party taking a stack of quests at once. If the function throws, the whole batch comes back after the visibility timeout, the finished quests too. Turn on ReportBatchItemFailures and return batchItemFailures with the failed IDs, and only those come back. Set the visibility timeout to at least six times the function timeout, and make processing safe to repeat.',
  snsfan: 'An SNS topic is a town crier: every subscriber hears each message. Fan-out gives each service its own SQS queue subscribed to the topic, a mailbox per guild, so each one works and retries at its own pace. A filter policy on one subscription lets that subscriber hear only the messages that match (by message attributes, or by the body if you scope it to that); the other subscribers aren\'t affected.',
  eventbridge: 'An EventBridge rule is a bell that rings only for events that match its pattern, every field of it. Name a value the events never carry, and the bell never rings. EventBridge Scheduler is the alarm clock: one-time or repeating schedules (cron or rate) that call a target, with no server to keep.',
  kinesis: 'A Kinesis data stream is a set of conveyor belts called shards. The partition key picks the belt: same key, same belt. Each belt keeps its records in order, but there\'s no order across belts. Amazon Data Firehose is the delivery cart: it collects records until a size or time limit and drops them off in batches at places like S3, with no consumer code to write.',
  mqmsk: 'Amazon MQ and Amazon MSK are for travellers who already speak another language. Amazon MQ runs a managed ActiveMQ or RabbitMQ broker for apps that use standard protocols (AMQP, MQTT, STOMP, OpenWire), so they move in without a rewrite. Amazon MSK runs Apache Kafka for teams already built on Kafka.',
  s3ver: 'Versioning turns a bucket into a save-slot history: every write keeps the old save. A delete with no version ID only sticks a "deleted" sign (a delete marker) on top, so a normal GET says 404 while every save stays underneath. Peel the sign off, or copy an old save back on top, and it\'s back. A delete that names a version ID erases that save for good. Once versioning is on, it can be suspended but never switched off again.',
  s3lock: 'These decide who can still erase a save. Object Lock freezes a version until its retain-until date: governance mode lets people with s3:BypassGovernanceRetention through, compliance mode lets nobody through, the root user included. MFA delete makes permanent deletes need the root user\'s MFA code, which stops everyone but the root user. A bucket policy can always be changed by the root user. The only other copy nobody can delete is one nobody can reach.',
  s3life: 'A lifecycle rule is a countdown timer on old saves. NoncurrentVersionExpiration erases a version a set number of days after it stops being the current one, and that erase is permanent. To rescue an old version, copy it back on top: the copy is a new current version, and a rule about noncurrent versions leaves it alone.'
};

// [term, matcher, plain definition]
SD.glossary = [
  // Lambda
  ['Lambda', /\bLambda\b/, 'AWS runs your function when something calls it, with no server for you to keep.'],
  ['Concurrency', /\bconcurren/i, 'How many copies of a function are running at the same moment.'],
  ['Cold start', /\bcold starts?\b/i, 'The extra wait when Lambda sets up a fresh environment before it can run your code.'],
  ['Execution role', /\bexecution role/i, 'The role Lambda assumes to give your function its permissions.'],
  ['Synchronous / asynchronous', /\b(a?synchronous(ly)?)\b/i, 'Synchronous: the caller waits for the answer. Asynchronous: the caller hands the event over and moves on.'],
  ['Throttling', /\bthrottl|(?<![\d,.])\b429\b(?![,.]\d)/i, 'Being told "too many, slow down", HTTP status 429.'],
  // Queues and events
  ['Visibility timeout', /\bvisibility timeout\b/i, 'How long a received message stays hidden before it can be delivered again.'],
  ['Dead-letter queue', /\bdead-letter|\bDLQ\b/i, 'A side queue that catches messages that keep failing.'],
  ['maxReceiveCount', /maxReceiveCount/, 'How many times a message may be received before it moves to the dead-letter queue.'],
  ['Message group ID', /\bmessage group/i, 'The lane a FIFO message belongs to; order is kept within each lane.'],
  ['Deduplication ID', /\bdeduplication/i, 'A tag a FIFO queue uses to spot and drop a repeat sent within 5 minutes.'],
  ['FIFO', /\bFIFO\b/, 'First in, first out: a queue that keeps order and drops duplicates.'],
  ['Long polling', /\b(long poll\w*|WaitTimeSeconds)\b/i, 'Waiting up to 20 seconds for a message instead of returning empty right away.'],
  ['SQS', /\bSQS\b/, 'Amazon Simple Queue Service: a managed waiting line for messages.'],
  ['Batch', /\bbatch(es)?\b/i, 'A group of things handled together in one go: messages, records, or a job\'s worth of work.'],
  ['Filter policy', /\bfilter polic/i, 'A rule on one subscription that lets through only the messages that match.'],
  ['SNS', /\bSNS\b/, 'Amazon Simple Notification Service: a topic that pushes a copy of each message to every subscriber.'],
  ['Topic / subscription', /\b(topics?|subscri\w*)\b/i, 'A topic is a channel; a subscription is one listener (a queue, a function, an email address) attached to it.'],
  ['Event pattern', /\b(event )?patterns?\b/i, 'The shape an event must match, field by field, for an EventBridge rule to send it on.'],
  ['EventBridge', /\bEventBridge\b/, 'An event router: rules match events by pattern and send them to targets, and Scheduler runs things on a timetable.'],
  ['Cron / rate', /\b(cron|rate expression)\b/i, 'Schedule expressions: cron for "every day at 6:00", rate for "every 5 minutes".'],
  ['Partition key', /\bpartition key/i, 'The value that decides which shard a record goes to.'],
  ['Shard', /\bshards?\b/i, 'One lane of a Kinesis data stream; records in a shard stay in order.'],
  ['Kinesis', /\bKinesis\b/, 'Amazon Kinesis Data Streams: a stream split into shards that keeps records in order per shard.'],
  ['Firehose', /\bFirehose\b/, 'Amazon Data Firehose: collects records and delivers them in batches to places like S3, with no consumer code.'],
  ['Amazon MQ / MSK', /\b(Amazon MQ|MSK|ActiveMQ|RabbitMQ|Kafka)\b/, 'Managed message brokers: Amazon MQ runs ActiveMQ or RabbitMQ, Amazon MSK runs Apache Kafka.'],
  // IAM
  ['Trust policy', /\btrust polic/i, 'The part of a role that says who may assume it.'],
  ['Instance profile', /\binstance profile/i, 'The holder that gives an EC2 instance a role.'],
  ['Explicit / implicit deny', /\b(deny|denies|denied)\b/i, 'Implicit deny: no policy allowed it. Explicit Deny: a policy said no, which beats every Allow.'],
  ['Resource-based policy', /\b(resource-based|resource polic|bucket polic)/i, 'A policy attached to the thing itself, like a bucket, naming who may use it.'],
  ['Policy', /\bpolic(y|ies)\b/i, 'A JSON document of Allow and Deny statements.'],
  ['Role', /\broles?\b/i, 'An identity that anyone its trust policy names can assume, to get temporary credentials.'],
  ['STS / AssumeRole', /\b(STS|AssumeRole|sts:\w+)\b/, 'The AWS Security Token Service hands out temporary credentials, for example when you assume a role.'],
  ['Session token', /\b(session tokens?|temporary (security )?credentials|ExpiredToken)\b/i, 'Temporary credentials are an access key ID, a secret access key and a session token, and they stop working when they expire.'],
  ['Access keys', /\baccess keys?\b/i, 'A long-term key pair for signing API calls. A role\'s temporary credentials are safer.'],
  ['Principal', /\bprincipals?\b/i, 'Who is making the request: a user, a role or a service.'],
  ['ARN', /\bARNs?\b|arn:aws/, 'Amazon Resource Name: the full address of one AWS resource.'],
  ['Condition key', /\b(conditions?|aws:\w+)\b/i, 'Fine print in a policy, such as "only over HTTPS" or "only with MFA".'],
  ['MFA', /\bMFA\b|MultiFactor/, 'Multi-factor authentication: a code from a device on top of a password.'],
  ['HTTPS / TLS', /\b(HTTPS|TLS|SecureTransport)\b/, 'Encrypted web traffic. Plain HTTP isn\'t encrypted.'],
  ['IAM', /\bIAM\b/, 'AWS Identity and Access Management: who can do what in an AWS account.'],
  ['Account', /\b(cross-)?accounts?\b/i, 'One AWS account, with its own resources and permissions. Crossing accounts needs both sides to agree.'],
  ['CloudTrail', /\bCloudTrail\b/, 'The log of API calls made in your account.'],
  ['Management / data events', /\b(management|data) events?\b/i, 'Management events change settings; data events touch the data itself, like reading an S3 object.'],
  // S3
  ['Delete marker', /\bdelete markers?\b/i, 'A placeholder that hides an object in a versioned bucket without erasing it.'],
  ['Object Lock', /\bObject Lock\b|\b(governance|compliance) mode\b/i, 'Stops a version being deleted or overwritten until a retain-until date.'],
  ['MFA delete', /\bMFA delete\b/i, 'A bucket setting that makes permanent deletes need the root user\'s MFA code.'],
  ['Lifecycle rule', /\blifecycle\b|Noncurrent/i, 'A rule that moves or deletes objects, or old versions, after a number of days.'],
  ['Versioning', /\bversion(s|ing|ed)?\b/i, 'With versioning on, each write to an S3 object keeps a new version instead of replacing the old one.'],
  ['S3 / bucket', /\b(S3|buckets?)\b/, 'Amazon S3 stores files (objects) in containers called buckets.'],
  ['Root user', /\broot\b/i, 'The account\'s original, all-powerful sign-in.'],
  // Networking and tools
  ['VPC / subnet', /\b(VPC|subnets?)\b/, 'Your private network in AWS, split into subnets.'],
  ['Endpoint', /\bendpoints?\b/i, 'The address a service is reached at. A VPC endpoint reaches it privately, without the internet.'],
  ['SDK', /\bSDKs?\b/, 'The library your code uses to call AWS.'],
  ['SAM / template', /\b(SAM|templates?)\b/, 'An AWS SAM template describes your app\'s resources in a file, so they deploy the same way every time.'],
  // General
  ['Idempotent', /\bidempoten/i, 'Doing it twice has the same effect as doing it once.'],
  ['Request', /\brequests?\b/i, 'One message asking a server for something, like pressing a button that asks the game for data.'],
  ['API', /\bAPIs?\b/, 'The menu of commands other programs can send a service.'],
  ['HTTP status code', /(?<![\d,.])\b(200|403|404|429|500|503)\b(?![,.]\d)/, 'A number a server sends back: 200 OK, 403 not allowed, 404 not found, 429 slow down, 500 or 503 the server is in trouble.'],
  ['Latency', /\blatency\b/i, 'Lag: how long you wait for an answer.'],
  ['Queue', /\bqueues?\b/i, 'A waiting line for jobs.'],
  ['Consumer / producer', /\b(consumers?|producers?)\b/i, 'Producers put messages in; consumers take them out and do the work.'],
  ['Backoff', /\bbackoff\b/i, 'Waiting longer between each retry.'],
  ['Presigned URL', /\bpresigned\b/i, 'A link with a built-in, time-limited permission slip to upload or download one file.'],
  ['Metadata', /\bmetadata\b/i, 'Data about data: a file\'s name, size and owner, not its contents.']
];
