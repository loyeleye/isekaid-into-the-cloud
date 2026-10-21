// Chapter 2, part 2's Huh??? lines (one per concept in js/c2x-data.js), ELI5 lines (one per question it asks, in game
// terms with as little AWS jargon as possible) and glossary terms.
(function () {
  if (!SD.vec || !SD.vec.on) return;
  Object.assign(SD.huh, {
    lambdacfg: 'A clerk\'s stats. Memory is his stamina bar and his speed together: give him more and he also gets more CPU, so a slow, number-crunching clerk gets faster. Timeout is how long he may work on one letter before the game ends his turn. Concurrency is how many copies of him can be at desks at once.',
    lambdaasync: 'Who\'s holding the letter when it fails? If you handed it over and waited (synchronous), it comes straight back to you. If you dropped it in his tray and left (asynchronous), the game retries it twice for you, then sends it to a lost-and-found you chose, or throws it away. If he reads from a queue or a stream, the queue keeps it.',
    lambdapack: 'A layer is a shared toolbox on the shelf: every clerk can borrow it instead of packing his own. Each new toolbox is a new version, and a clerk keeps using the one he was handed until you give him the new one.',
    kinesislambda: 'A stream is a conveyor belt split into lanes. Each lane is read in order, so one jammed parcel stops its whole lane. Split the batch until the jammed one is alone, cap the retries, and set the jam aside on a shelf so the lane moves again.',
    apigw: 'The front gate of your castle. It can check the form before anyone inside sees it (bad form: 400), turn away people who knock too often (429), and translate what visitors say into what the people inside understand.',
    stepfn: 'A quest chain run by a quest-giver who never forgets: each step is a task, and for each one you say which failures to try again (and how long to wait) and which to catch and send to another step, like a "you failed, go see the healer" branch.',
    orchestration: 'A party with a raid leader calling every move (orchestration) or a party where everyone reacts to what they see (choreography). The leader makes one fight easy to follow and fix; reacting makes it easy to add new players, but each one cleans up their own mistakes.',
    sqsalarm: 'A bell on the mailbox. The game tells you every minute how many letters are waiting and how old the oldest one is; set a bell to ring when the lost-and-found isn\'t empty, or when a letter has waited too long, and then add more readers.',
    dlqredrive: 'The lost-and-found shelf for letters that fail too many times. You choose how many tries a letter gets before it goes there. Once you\'ve fixed the problem, redrive sends every letter on the shelf back to the mailbox to be read again.',
    logsinsights: 'A search box for your game\'s logs that speaks in steps: pick the columns, keep only the matching lines, count or average them, sort, and keep the top few. It works best when every log line is written like a filled-in form (JSON).',
    datatrail: 'The castle\'s security camera. By default it records who changed the locks (management events). Recording every time someone opens a chest or reads a letter (data events) is a separate, pricier camera you have to switch on.',
    coupling: 'Two party members tied together fall together. Put a mailbox between them and each can work at their own pace. If someone isn\'t answering, don\'t all shout again at once: wait a bit longer each time, at random, and if they keep failing, stop calling for a while (a circuit breaker).',
    transfer: 'A ferry that partners can sail their own boats to, the way they always have, and everything they unload lands straight in your storehouse. You don\'t run the dock yourself.',
    ebarchive: 'A replay recorder on the event bus. If you turned it on, you can play back any stretch of the evening and send those events to the rules you choose. It only records from the moment you switched it on.',
    msgattr: 'Every letter gets a postmark when it\'s posted (SentTimestamp), and a tally of how many times it\'s been picked up. Picking it up again adds to the tally, but never changes the postmark.'
  });
  Object.assign(SD.eli5, {
    // lambdacfg
    'dva-4-102': 'The clerk\'s turn ends at 3 seconds, but the partner takes up to 6 to answer. Give him a longer turn than the slowest answer, and make his own phone call give up a little before his turn ends.',
    'dva-4-07': 'The clerk is slow because he\'s thinking hard, not because he\'s out of pockets. More memory also buys more brain (CPU), so turn it up and time him again.',
    'dva-4-201': 'Everyone logs in at 8 a.m. and the first players wait while servers warm up. Pre-warm a set of clerks just before 8, and let them go home at night.',
    'dva-4-224': 'Every clerk already writes a receipt after each job saying how much memory he had and how much he used. Search those receipts and compare the two numbers.',
    'dva-4-101': 'The clerk is capped at a fixed number of copies, and the rush needs more. Raise his cap.',
    // lambdaasync
    'dva-1-02': 'Two trays on the clerk\'s desk: finished jobs go to the billing tray, and jobs that still fail after the retries go to the tray that wakes the on-call player.',
    'dva-1-203': 'Retrying a card payment can charge someone twice. Tell the game not to retry this one at all, and keep a record of what failed instead.',
    'dva-1-216': 'When a quest fails for good, send a report with the original request and the error to the guild\'s noticeboard (the custom event bus), where the existing rules already pick it up.',
    'dva-1-214': 'Drop the job in the tray and walk away (an async invoke), and say where the game should put jobs that still fail after its retries.',
    // lambdapack
    'dva-1-17': 'Twelve clerks each carry the same heavy toolbox. Put one toolbox on the shared shelf (a layer) and let each clerk borrow it.',
    'dva-1-218': 'The toolbox opened, but the tools weren\'t in the drawer Python looks in. Put them in a python/ drawer and hand out the new box.',
    'dva-1-209': 'The clerk\'s job card still says "lambda_function.handle", but the file is now called app. Change the card to app.handle.',
    // kinesislambda
    'dva-1-201': 'One jammed parcel stops its whole conveyor lane. Split the batch until the jammed one is alone, stop retrying it after a few tries, and put a note about it on a shelf.',
    'dva-1-219': 'The stream still has a week of parcels. Start a new reader at 14:00 yesterday, when the bug began, and read everything since.',
    'dva-4-210': 'The lane is slow, not full. Let the reader work on several batches from each lane at once; parcels for the same key still stay in order.',
    'dva-1-123': 'To be sure entries go in exactly in order, send them one at a time and tell each one which entry it must come after.',
    // apigw
    'dva-1-13': 'Check the form at the gate: give the gatekeeper the form\'s rules, and he turns away any form with missing boxes before anyone inside has to read it.',
    'dva-1-128': 'Visitors speak JSON and the old castle only understands XML. Put a translator at the gate (a mapping template) that rewrites each request.',
    'dva-1-301': 'The old service says "all fine" (200) while handing you an error. Have the gate\'s translator check the reply, and change the status to 400 when it\'s an error.',
    'dva-1-303': 'The gate says "bad form" but not which box. Change the gate\'s "bad form" reply to include the details of what failed.',
    'dva-1-129': 'The clerk shouts "NotFound!", but the gate still says 200. Teach the gate to hear "NotFound" in the error and answer 404.',
    // stepfn
    'dva-1-115': 'For the "come back later" error, try again up to four times, waiting longer each time. For anything still failing, branch to the "tell someone" step.',
    'dva-1-116': 'A long quest that waits days for an approval, and a payment that must happen exactly once, both need the slow-and-careful quest type (Standard), not the fast one.',
    'dva-1-309': 'When the catch fires, the error replaces your whole quest log, so the next step forgets the order. Tell it to write the error into a new slot instead.',
    'dva-1-310': 'Thousands of players retry at exactly the same moments. Add randomness to each wait, and cap how long a wait can grow.',
    // orchestration
    'dva-1-308': 'Without a raid leader, every player must handle their own retries and clean-up, and following one order takes a shared tag in everyone\'s logs.',
    'saa-2-109': 'Four clerks passing a parcel hand to hand lose it when one stumbles. Give the job to a quest-giver who retries with waits and calls for help when it fails.',
    'dva-1-112': 'Stop phoning every team yourself. Shout "order placed!" on the noticeboard (an event bus), and let each team pin up its own rule.',
    'dva-1-20': 'Post each order once to a loudspeaker (SNS), and give each service its own mailbox (an SQS queue) under it, so a slow one only slows itself.',
    // sqsalarm
    'saa-2-102': 'Add workers by how many jobs each worker has waiting, not by how busy their CPUs look.',
    'dva-4-115': 'To hear the bell within 30 seconds, the counter has to report more often than once a minute, and the bell has to check it more often too.',
    'dva-4-674': 'Letters moved to the lost-and-found by the rules don\'t count as "sent" there. Watch how many letters are sitting on the shelf, and ring if it\'s more than zero.',
    'dva-4-676': 'Stalled readers look calm. Watch how long the oldest letter has been waiting, and ring when it passes the 15-minute promise.',
    // dlqredrive
    'dva-1-105': 'The bug is fixed. Press "send them home" on the lost-and-found shelf (a redrive) and the letters go back to the mailbox.',
    'dva-1-212': 'The letter becomes visible again while the clerk is still stuck waiting for a desk. Hide it for at least six times the clerk\'s turn.',
    'dva-1-104': 'A strict-order mailbox needs a strict-order lost-and-found too: make a second FIFO queue and send letters there after five failed tries.',
    'dva-1-672': 'One strike and you\'re out is too harsh when the partner sometimes hiccups. Give each letter a few tries before the lost-and-found.',
    // logsinsights
    'dva-4-04': 'Every clerk writes a receipt with how long the job took. Search the receipts, sort by time, slowest first, and keep ten.',
    'dva-4-13': 'Write each log line as a filled-in form (JSON) with orderId and level as boxes, and the search box can use the boxes directly.',
    // datatrail
    'dva-4-673': 'The camera only records who changes the locks. Switch on the one that records every letter picked up or thrown away (data events).',
    // coupling
    'dva-1-141': 'When the payment shop is closed, stop queueing outside it. A circuit breaker says "closed, try later" at once, and checks again after a while.',
    'dva-1-14': 'Don\'t hammer the busy shop\'s door. Wait longer each time, at a random moment, give up after a few tries, and leave the rest in a queue for later.',
    'dva-1-142': 'Give each payment a ticket number, and have the shop keep the receipt for each ticket. A retry with the same ticket just gets the same receipt.',
    'saa-2-01': 'Let the website drop orders in a mailbox and carry on. The kitchen cooks them at its own pace, and nothing is lost.',
    // transfer
    'saa-2-104': 'Open a managed ferry dock (Transfer Family SFTP) that unloads straight into the storehouse, and give each partner\'s key to the dock. Partners change nothing.',
    'saa-2-221': 'Partners only sail to docks they know the address of. Give the dock fixed addresses (Elastic IPs) inside your harbour, and a guard who only lets their boats in.',
    'saa-2-677': 'Partners still sign in with passwords. Let the managed dock ask your own guest list, through a small helper function, whether each password is right.',
    // ebarchive
    'dva-1-113': 'The bus recorded everything. Play back just those six hours, and send them only to the rule you fixed.',
    'dva-1-675': 'There\'s nothing to replay because nobody pressed record. Switch on the recorder (an archive) now, set to keep 30 days.',
    // msgattr
    'dva-1-670': 'Read the postmark (SentTimestamp). Picking a letter up again changes its tally, never its postmark.',
    'dva-1-106': 'To throw a letter away you need the slip from the latest time you picked it up (the ReceiptHandle), not the letter\'s name.',
    'dva-1-671': 'Ask the mailbox to tell you each letter\'s pick-up tally (ApproximateReceiveCount) when you collect it.',
    // sqsfifo
    'dva-1-04': 'A strict-order mailbox, with one lane per account: each account\'s letters stay in order, and different accounts are read side by side.',
    'dva-1-05': 'Give the mailbox a way to spot a resent letter: a fingerprint of its contents, or an ID you reuse when you resend.',
    'saa-2-110': 'A strict-order mailbox, one lane per account, with duplicate-spotting on: in order, and only once.'
  });
  SD.glossary.push(
    ['Destination', /\bdestination\b/i, 'Where Lambda sends a record of an async event once it has succeeded or finally failed: a queue, topic, function, bus or bucket.'],
    ['Layer', /\bLambda layers?\b|\ba layer\b/i, 'A shared .zip of libraries or tools that Lambda functions can use, mounted under /opt.'],
    ['Iterator age', /IteratorAge/, 'How far behind the newest record a stream\'s reader is.'],
    ['Request validator', /request validator/i, 'An API Gateway setting that checks a request against a model before calling the backend.'],
    ['Mapping template', /mapping template/i, 'A small script in API Gateway that rewrites a request or response as it passes.'],
    ['Circuit breaker', /circuit breaker/i, 'Code that stops calling a failing service for a while and fails fast instead.'],
    ['Jitter', /\bjitter/i, 'A random amount added to a wait, so that many retries don\'t all land at once.'],
    ['Redrive', /\bredrive\b/i, 'Moving messages from a dead-letter queue back to a queue to be processed again.'],
    ['SentTimestamp', /SentTimestamp/, 'The time SQS accepted a message, in epoch milliseconds. It never changes.'],
    ['Data events', /data events?/i, 'CloudTrail records of calls on the data itself, such as reading an object or a message. Off by default.'],
    ['Transfer Family', /Transfer Family/, 'Managed SFTP, FTPS, FTP and AS2 servers that store files in S3 or EFS.']
  );
})();
