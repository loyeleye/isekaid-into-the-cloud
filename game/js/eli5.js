// Plain-language help for people new to AWS, shown after every quiz answer (js/quiz.js).
// SD.eli5: per question id, the answer explained through a game or anime you may know ("ELI5 🎮").
// SD.huh: per concept, the whole idea in game terms, for "Huh???". A question a chapter asks inline can carry its own
//   ELI5 line (q.eli5); one without shows its concept's line under ELI5 instead, so every concept needs one.
// ELI5 lines explain the answer through games and anime, with as few AWS terms as possible.
// SD.glossary: jargon, defined in one line, shown under "Huh???" when a word appears in the question. The first 8
//   matches show, so AWS terms come first and the more specific of two overlapping terms comes before the other.
// Every concept and every question in SD.questions needs its entry here: `node tools/help_check.js` checks it.
// AWS facts follow the current AWS documentation (Lambda, SQS, SNS, EventBridge, Kinesis, IAM, STS, CloudTrail, S3).
// Write every line fresh; never copy practice-exam questions or course material.
window.SD = window.SD || {};

SD.eli5 = {
  // Lambda concurrency
  'q-lc1': 'The arena only fits so many fighters. When it\'s full, the gatekeeper tells each new challenger "too many, come back later" (a 429 error), and it\'s up to them when to try again.',
  'q-lc2': 'If 200 players start a dungeon every second and each run lasts half a second, about 100 runs are going at any moment: 200 × 0.5 = 100.',
  'q-lc3': 'A cold start is a fighter waking up and putting on armour before the first swing. Provisioned concurrency keeps fighters awake and suited up, so the first hit lands at once. You pay for them while they wait.',
  // SQS and dead-letter queues
  'q-sq1': 'Taking a quest off the board only hides it for a while. If you faint before turning it in (deleting it), it pops back onto the board when the timer runs out, for you or anyone else.',
  'q-sq2': 'Hide the quest long enough for Lambda to try, get throttled and try again. Six times a 60-second timeout is 360 seconds.',
  'q-dl1': 'Every failed attempt adds a tally mark to the quest. Once the marks pass the limit (maxReceiveCount), it goes to the lost-and-found shelf instead of back on the board.',
  'q-dl2': 'A strict single-file line needs a strict single-file lost-and-found. FIFO goes with FIFO.',
  'q-dl3': 'One strike and you\'re out. A letter that stumbles once, even from plain bad luck, goes straight to lost-and-found.',
  // IAM
  'q-iam1': 'One guard waves you in, another holds up a big red NO. The red NO wins every time: an explicit Deny beats any Allow.',
  'q-iam2': 'A brand-new character with no permission slips can\'t open any door. No Allow means no.',
  'q-iam3': 'Give the function its own uniform (the execution role) with a badge for that one table. Lambda dresses it in that uniform every time it runs.',
  'dva-2-05': 'The error is a sealed letter explaining why the guard said no. STS DecodeAuthorizationMessage is the letter opener, and you need permission to use it.',
  'dva-2-13': 'Looking along the shelf (listing) and taking an item off it (getting) are different doors. ListBucket opens the shelf\'s door, the bucket ARN with no /*. GetObject opens the items\' doors, the ARN ending in /*.',
  // Roles and temporary credentials
  'q-ro1': 'Putting on the costume hands you a temporary pass: an ID, a secret and a session ticket that expires, like a day pass at a theme park.',
  'q-ro2': 'The day pass runs out after an hour unless you ask for a longer one at the gate. Ask for 4 hours (14,400 seconds), the longest this costume allows.',
  'q-ro3': 'The guest list on the costume only says who may wear it, here Lambda. What the wearer can do is written in the other policy.',
  'q-ro4': 'Every pass printed before the alarm is torn up. Passes printed after it still work, so lock the door the thief got in by too.',
  'q-mask': 'You need a mask whose guest list names you AND whose powers include opening this gate. A mask with only one of the two is just a hat.',
  'dva-2-16': 'Throw away the spare key under the doormat and give the building (the instance) a badge instead. The SDK checks for keys before badges, so the old keys have to go; then it finds the badge on its own.',
  // Resource policies and conditions
  'q-rp1': 'The chest in the other kingdom says "you may open me", but your own king never let you leave. Across kingdoms, both sides have to say yes.',
  'dva-2-04': 'Borrowing a costume from another guild takes two yeses: their guest list names you, and your own guild lets you go and put it on (sts:AssumeRole).',
  'q-cn1': 'You showed your MFA badge at the front door, but your script came in the side door with an old permanent key. That key never carries the badge, so the rule turns it away.',
  'dva-2-10': 'Hang a sign on the vault: "anyone who arrives unencrypted is turned away". A Deny when aws:SecureTransport is false does exactly that, and a Deny beats any Allow.',
  // CloudTrail
  'q-ct1': 'The security cameras only film the doors (management events) unless you paid to film the vault too (data events). Nobody did, so last week\'s read was never recorded.',
  'dva-4-12': 'Check the security camera log. Every settings change shows up as an UpdateFunctionConfiguration event, with who did it and when, kept for 90 days.',
  // FIFO queues and long polling
  'q-fi1': 'Give each family its own single-file line. Each line stays in order, all the lines move at the same time, and the clerk bounces anything sent twice. One line for the whole town would make everyone wait behind one slow family.',
  'q-fi2': 'Instead of shouting "anything yet?" every second, wait at the counter for up to 20 seconds. Fewer empty trips, and a smaller bill.',
  'q-fi3': 'The strict clerk remembers each ticket number for 5 minutes. The same ticket 30 seconds later gets a polite "got it, thanks", and isn\'t delivered again.',
  // Lambda reading from SQS
  'q-ls1': 'One party member trips and the whole party restarts the dungeon, all ten of them, including the nine who cleared their rooms. Nobody told the game which one fell.',
  'q-ls2': 'Instead of wiping the whole party, hand the game a list of only the members who fell. It keeps everyone else\'s clear and replays just those rooms. You switch that report on first, then fill in the list.',
  'q-ls3': 'Give the function time for six tries before the quest pops back on the board. Six tries at 30 seconds each is 180 seconds.',
  // SNS fan-out
  'q-sn1': 'A town crier shouts each order, and every guild has its own mailbox listening. If one guild is out, its letters wait in its own mailbox until it\'s back.',
  'q-sn2': 'Put the filter on shipping\'s own mailbox: "only tell me about CA orders". The crier still tells everyone else everything.',
  'q-sn3': 'One guild\'s filter only covers that guild. The others still get the message if their own filters match.',
  // EventBridge
  'q-eb1': 'The bell only rings for "LetterSent". "LetterRead" is a different word, so the bell stays quiet.',
  'q-eb2': 'Set an alarm clock for six every morning that pokes the function. Nothing has to stay awake in between. Queues, topics and streams carry messages, but none of them is a clock.',
  'dva-1-605': '"Starts with Order" works like typing the first letters into a search box: OrderPlaced, OrderShipped and any Order-something added in a later patch all show up. A list only finds the names you typed, and a star in a plain name is just a star.',
  'dva-1-110': 'It\'s a loot filter: only drops worth 1,000 gold or more go to the review pile. Use the "number at least" filter, inside the item\'s details where the price really sits. Typing ">= 1000" as text only finds an item literally named that.',
  // Kinesis and Firehose
  'q-ki1': 'Each bell always rides the same conveyor belt, picked by its ID. A belt keeps its items in order, so that bell\'s readings stay in line.',
  'q-ki2': 'A delivery cart that fills up and drops batches at the archive on its own. You don\'t write any code to drive it.',
  // S3 versioning, locks and lifecycle (the bank questions chapter 2's lost letters ask)
  'dva-1-244': 'Turn on save history, so an overwrite keeps the old save and a delete only puts a "deleted" sign on top. To roll back, load the old save and save it again as the newest, or pull the sign off. Logs and cold storage don\'t keep your old saves for you.',
  'dva-1-601': 'Deleting without naming a save erases nothing. The game sticks a "deleted" sign on top of the pile, so loading the file finds nothing, but every old save is still sitting under the sign.',
  'dva-1-602': 'To get the file back, throw away the "deleted" sign itself: delete the sign by name, and the save under it is the top save again. Writing an empty save on top would just leave you with a blank save.',
  'dva-1-603': 'Once save history is on, you can pause it but never uninstall it. While it\'s paused, new saves overwrite a single slot, and every old save you already have stays until you erase it.',
  'dva-1-604': 'It\'s a 30-day despawn timer on old saves. The clock starts when a newer save replaces one, and at zero the old save is gone for good. The save you\'re playing now isn\'t touched.',
  'saa-1-05': 'Compliance mode is a lock even the game master can\'t pick: nobody, not even the account owner, can erase or change the save until its timer runs out. Governance mode has a master key some admins hold, so it can\'t promise that.',
  'saa-1-134': 'Keep every save, and put a second lock on the "erase for good" button: only the account owner, with the code from their phone, can press it. There\'s no set timer here, so a timed lock doesn\'t fit, and a despawn timer would throw old saves away.',
  'saa-1-227': 'A legal hold is a pause button with no timer. The save can\'t be erased or overwritten until someone allowed to lift the hold lifts it. Timed locks either run out too soon, or can\'t be undone when the case ends.',
  'saa-4-01': 'Move the logs down the storage tiers as they cool off: the main bag for the first month, the side pouch for the rest of the year, then the deep vault until year 7, when they\'re thrown out. The deep vault takes hours to open, and a two-day wait is fine for an audit.',
  'saa-4-104': 'First open the world map that shows every chest in every base, to spot the ones stuffed with half-finished uploads and old saves. Then put cleanup timers on those chests: one throws out uploads abandoned partway, one erases old saves after a while.'
};

SD.huh = {
  lambdaconc: 'Concurrency is how many copies of your function are fighting at the same moment. Work it out as requests per second times the seconds each one takes. Your account has a party cap per Region (1,000 by default, and you can ask for more). Past the cap, a synchronous caller is told "slow down" (a 429 error) and asynchronous events wait and are retried. Reserved concurrency saves seats for one function and caps it there; provisioned concurrency keeps fighters warmed up so nobody waits through a cold start.',
  sqs: 'An SQS queue is a quest board. Taking a quest (receiving a message) doesn\'t remove it; it hides it for the visibility timeout (30 seconds by default, up to 12 hours). Finish and delete it in time, or it pops back up for someone else. A standard queue now and then hands out the same quest twice, so doing it twice must be harmless. When Lambda reads the queue, make the timeout at least six times the function\'s timeout.',
  dlq: 'A dead-letter queue is the lost-and-found shelf. Each time a message is received and not deleted, its receive count goes up; once it passes maxReceiveCount, SQS moves it to the shelf instead of serving it again, so one cursed letter can\'t clog the board forever. The shelf has to be the same kind of queue (FIFO for FIFO), in the same account and Region.',
  iam: 'IAM is the castle guard reading permission slips. Every request starts as "no" (an implicit deny). An Allow in a policy that applies turns it into "yes", but one explicit Deny anywhere beats every Allow. Give code a role with only the slips it needs, never a permanent key.',
  roles: 'A role is a costume with a guest list. The trust policy is the guest list (who may put it on); the permissions policies say what the costume lets you do. Putting it on (AssumeRole) hands you temporary keys: an access key ID, a secret access key and a session token. They expire after 1 hour by default, and you can ask for anything from 15 minutes up to the role\'s maximum (1 to 12 hours). Revoking active sessions turns away every costume put on before that moment.',
  respolicy: 'A resource policy is a sign on the treasure chest itself saying who may open it. Inside one kingdom (account), either your own permission slip or the chest\'s sign is usually enough. In another kingdom you need both: your home kingdom has to let you do it, and the chest\'s sign has to name you.',
  conditions: 'A Condition is the fine print on a permission slip: "only if...". aws:SecureTransport is false for a request sent without encryption (plain HTTP), so "Deny when it\'s false" turns away anything not over HTTPS. aws:MultiFactorAuthPresent is only there on temporary credentials you got with an MFA code; requests signed with long-term access keys never carry it.',
  cloudtrail: 'CloudTrail is the castle\'s camera log for API calls: who did what, when, from where, and what happened. With no setup, event history keeps the last 90 days of management events, the changes to settings (like editing a function or a bucket policy). Data events, such as reading an object in S3, aren\'t filmed unless you set up a trail or event data store for them, and only from then on.',
  sqsfifo: 'A standard queue is a fast mail sorter that can deliver a letter twice and only roughly in order. A FIFO queue is a strict line: order is kept within each message group ID, and a repeat with the same deduplication ID inside 5 minutes is dropped. Long polling (WaitTimeSeconds, up to 20) waits at the counter for mail instead of asking "anything?" over and over, and every empty answer is still billed.',
  lambdasqs: 'Lambda checks the queue for you and hands your function a batch of messages, like a party taking a stack of quests at once. If the function throws, the whole batch comes back after the visibility timeout, the finished quests too. Turn on ReportBatchItemFailures and return batchItemFailures with the failed IDs, and only those come back. Set the visibility timeout to at least six times the function timeout, and make processing safe to repeat.',
  snsfan: 'An SNS topic is a town crier: every subscriber hears each message. Fan-out gives each service its own SQS queue subscribed to the topic, a mailbox per guild, so each one works and retries at its own pace. A filter policy on one subscription lets that subscriber hear only the messages that match (by message attributes, or by the body if you scope it to that); the other subscribers aren\'t affected.',
  eventbridge: 'An EventBridge rule is a bell that rings only for events that match its pattern, like a loot filter. Every field in the pattern has to match. A list matches any one of its values, "starts with" ({"prefix": ...}) also catches names nobody has made yet, and a value the events never carry means the bell never rings. EventBridge Scheduler is the alarm clock: one-time or repeating schedules that call a target, with no server to keep.',
  kinesis: 'A Kinesis data stream is a set of conveyor belts called shards. The partition key picks the belt: same key, same belt. Each belt keeps its records in order, but there\'s no order across belts. Amazon Data Firehose is the delivery cart: it collects records until a size or time limit and drops them off in batches at places like S3, with no consumer code to write.',
  mqmsk: 'Amazon MQ and Amazon MSK are for travellers who already speak another language. Amazon MQ runs a managed ActiveMQ or RabbitMQ broker for apps that use standard protocols (AMQP, MQTT, STOMP, OpenWire), so they move in without a rewrite. Amazon MSK runs Apache Kafka for teams already built on Kafka.',
  s3ver: 'Versioning turns a bucket into a save history: every save keeps the ones before it. A delete that doesn\'t name a save only sticks a "deleted" sign on top (a delete marker), so loading the file finds nothing while every save stays underneath. Pull the sign off, or copy an old save back on top, and it\'s back. A delete that names one save erases that save for good. Once versioning is on, you can pause it but never switch it off.',
  s3lock: 'These are locks on your saves. Object Lock puts a timer on a save, and until it runs out nobody can erase or change it. Governance mode is a lock a few admins hold a key to; compliance mode is a lock nobody can open, not even the account owner (the root user). A legal hold is a lock with no timer, which stays on until someone lifts it. MFA delete means erasing a save for good also needs the code from the account owner\'s phone.',
  s3life: 'A lifecycle rule is a timer on your files. It can move them to cheaper, slower storage as they get old, or erase old saves a set number of days after a newer save replaces them, and that erase is for good. To rescue an old save, copy it back on top: the copy becomes the newest save, and a timer for old saves leaves it alone.'
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
