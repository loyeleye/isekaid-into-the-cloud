// The Night Watch: the living town (Ladi, Nov 18). Where people go during the day, what they say when there's no news,
// what they tell a friend, what they say to each other, the small jobs, and the lessons they show you.
// Adds to window.WATCH_CONTENT (js/watch-content.js loads first). Engine: js/mode-watch-walk.js, js/watch-schedule.js.
//
// Rules this file keeps (same as watch-content.js):
//   - Short lines: one or two short sentences a bubble.
//   - Every AWS fact matches current AWS documentation, and every question is written fresh. Docs checked Nov 18, 2026:
//       Policy evaluation (implicit deny, explicit allow, explicit deny wins):
//         https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html
//       Identity-based vs resource-based policies (Principal): https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_identity-vs-resource.html
//       SigV4: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html
//       S3 presigned URLs (up to 7 days with SigV4; temporary credentials end them sooner): https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
//       EC2 key pairs (AWS stores the public key only): https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
//       Secrets Manager rotation and the Lambda extension: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html
//         https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets_lambda.html
//       AssumeRole (15 minutes to the role's maximum, 1 hour by default): https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
//       Lambda execution roles: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
//       KMS Encrypt (up to 4,096 bytes) and GenerateDataKey: https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html
//         https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html
//       S3 default encryption (SSE-S3 on new objects since Jan 5, 2023) and SSE-KMS: https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-encryption-faq.html
//         https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html
//       Cognito user pools and identity pools: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html
//       IAM access keys (two per user; rotate; last used): https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
//       CloudTrail event history (90 days, management events) and data events (off by default):
//         https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html
//         https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html
//       Macie: https://docs.aws.amazon.com/macie/latest/user/data-classification.html
//       Parameter Store SecureString: https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
//       aws:SecureTransport: https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html
//       Lambda function URL auth (AWS_IAM or NONE): https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
(function () {
  const C = window.WATCH_CONTENT = window.WATCH_CONTENT || { version: 1 };

  // ================================================================================================================
  // SCHEDULES. [from, place]: from runs 0 to 1 across the ten-minute day; place is a town spot, or { at, dx } beside
  // one. The first entry is home (where the day starts). days: a day's own plan. rain: wet days (rain or mist).
  // People walk between roads by the forks and ramps, so a plan on another road means a walk you can watch.
  // ================================================================================================================
  const S = (at, dx) => (dx ? { at, dx } : at);
  C.schedule = {
    mira: { plan: [[0, S('base-camp')], [0.45, S('bakery', 20)], [0.6, S('base-camp')]] },
    kai: { plan: [[0, S('base-camp', -74)], [0.3, S('cafe', -70)], [0.6, S('base-camp', -74)]] },
    dutch: { plan: [[0, S('base-camp', -114)], [0.25, S('lock-shop', -70)], [0.55, S('forge', -60)], [0.8, S('base-camp', -114)]] },
    ayo: { plan: [[0, S('base-camp', -154)], [0.1, S('forge')], [0.85, S('base-camp', -154)]] },
    tess: { plan: [[0, S('fork-main-up')], [0.3, S('cafe', 60)], [0.5, S('post-office', -60)], [0.75, S('fork-main-up')]] },
    wen: { plan: [[0, S('cafe')], [0.7, S('base-camp', 60)], [0.85, S('cafe')]], days: { 3: [[0, S('cafe')]] } },   // day 3: not speaking to Mira
    kagemaru: { plan: [[0, S('stall')], [0.4, S('dock', -60)], [0.65, S('stall')]], rain: [[0, S('cafe', -74)]] },   // rain: under the café awning
    hobb: { plan: [[0, S('lock-shop')], [0.5, S('forge', 50)], [0.7, S('lock-shop')]] },
    coo: { plan: [[0, S('post-office')], [0.2, S('bounty-board', -60)], [0.35, S('doug-flat', -50)], [0.5, S('post-office')], [0.75, S('coach-house', -60)], [0.9, S('post-office')]] },
    lexi: { plan: [[0, S('library')], [0.6, S('post-office', 60)], [0.75, S('library')]] },
    bru: { plan: [[0, S('bounty-board')], [0.45, S('cafe', -30)], [0.6, S('bounty-board')]] },
    doug: { plan: [[0, S('doug-flat')], [0.3, S('bounty-board', 60)], [0.5, S('library', -50)], [0.7, S('doug-flat')]] },
    seymour: { plan: [[0, S('bunker')], [0.4, S('library', 70)], [0.6, S('bunker')]] },
    hollis: { plan: [[0, S('coach-house')], [0.35, S('town-gate', 60)], [0.7, S('coach-house')]] },
    odu: { plan: [[0, S('dock')], [0.5, S('granary', -60)], [0.7, S('dock')]] },
    fennel: { plan: [[0, S('cottage')], [0.3, S('stall', 60)], [0.55, S('cottage')]] },
    aigerim: { plan: [[0, S('bakery', 60)], [0.3, S('library', 40)], [0.6, S('forge', -60)], [0.8, S('bakery', 60)]] },   // her yurt is by the bakery
    // Chad pitches wherever his gossip says he is that day.
    chad: { plan: [[0, S('cafe', -120)]], days: {
      2: [[0, S('coach-house', 70)]], 3: [[0, S('bounty-board', 70)]], 4: [[0, S('dock', 70)]],
      6: [[0, S('coach-house', 70)]], 8: [[0, S('bounty-board', 70)]] } }
  };

  // ================================================================================================================
  // EVERYDAY LINES. When someone has no news today, they say one of these instead of "evening soon": their own story,
  // their trade, or a security idea in their words. Picked by day, so each day is different.
  // ================================================================================================================
  C.lines = {
    mira: ['Eat something before your shift. Locks don\'t fix themselves on an empty stomach.',
      'Kai\'s cooking tonight. Dutch is pretending he isn\'t hungry. Come and watch.',
      'Listen first, then lock. Half of this job is knowing what you\'re guarding.'],
    kai: ['Every station in my kitchen has its own knives. Nobody borrows. That\'s how nobody bleeds.',
      'Up at dawn? Me too. Forms, then onions.',
      'A cook who gives everyone the walk-in key loses the walk-in.'],
    dutch: ['Give a crew one job and one key. Never the ring.',
      'I log every crate in and out. The day you skip the log is the day it matters.',
      'Sit. No, not that chair. That one wobbles.'],
    ayo: ['A blade is only as good as the one who holds the key to the rack. Ha!',
      'My apprentices each get their own hammer. Don\'t make it weird.',
      'Heat, hammer, quench. Then lock the forge. Every night.'],
    tess: ['I light every lamp on Main Street! I see EVERYTHING. Mostly cats.',
      'A lamp left burning after closing? Someone\'s up to something! Or forgot.',
      'If it\'s not written down, it\'s gossip. I love gossip. Don\'t trust it.'],
    wen: ['I remember my regulars, dear. The rest I let go. Least recently used.',
      'My late husband wrote everything down twice. I should have listened.',
      'A recipe on the wall is a recipe for everyone. Mine are in the safe.'],
    kagemaru: ['First one\'s always free. That\'s how you know it\'s a business. Ah ha ha.',
      'Tickets that expire sell better. Urgency, warden.',
      'I sell locks AND lockpicks. Balance.'],
    hobb: ['Cut a key for a job, not for a person. People change jobs.',
      'A lock with no key is a wall. A lock with a hundred keys is a door.',
      'I keep the padlocks on the counter and the keys in my pocket. Think on that.'],
    coo: ['Every letter numbered. Every repeat ignored. Coo.',
      'A seal tells me who sent it and that nobody opened it. Coo. That\'s all a seal is for.',
      'Three letters to "undefined" today. Undefined never writes back.'],
    lexi: ['The Forbidden Index has two columns: who may read, and what. The strongest columns.',
      'A locked book is still a book. A book anyone can read is a pamphlet.',
      'I wear the eyepatch so my other eye watches the stacks. Obviously.'],
    bru: ['Ay, no. Three more requests and I still don\'t know who half of them are.',
      'Brújula. Compass. I always know where everyone is. Except Doug.',
      'Show me a crest, I tell you who you are. Show me a pass, I tell you where you can go.'],
    doug: ['Kevin\'s retired. Mostly. He still sends heartbeats. I think.',
      'I\'m working on a new bot. It asks before it knocks.',
      'Turns out an old key nobody uses is still a key. Who knew. Lexi knew.'],
    seymour: ['Three copies. Tested. In three places. Anything less is a wish.',
      'I have written to someone about the gate. Again.',
      'A sealed coach for anything that leaves the bunker. Always.'],
    hollis: ['Every passenger shows a ticket. Every coach checks it. Two different jobs.',
      'My coach has a list of who may ride. Your pass has a list of coaches. Both have to agree.',
      'Forty years on the West Road. The road never changes. The faces do.'],
    odu: ['Every crate gets a look before it leaves the dock. Never know what\'s inside.',
      'River\'s honest. People write the manifests.',
      'Fennel\'s apples ride free. Don\'t tell Kagemaru.'],
    fennel: ['The lamps keep me up. The apples don\'t mind.',
      'Some things want changing every season. Passwords, for one. Hives, for another.',
      'I keep the cellar key in a jar of honey. Nobody puts their hand in honey.'],
    aigerim: ['Diary, today: the warden walked past. I wrote it down. I write everything down.',
      'I can\'t delete any of my pages. I checked. Isn\'t that lovely?',
      'If someone did something and nobody wrote it down, did they? Yes. That\'s the scary part.'],
    chad: ['Have you considered: security, but as a vibe?',
      'Love that for you. Circle back after dusk?',
      'I don\'t do details. I do directions. Northwest, mostly.']
  };

  // ================================================================================================================
  // SECRETS. At trust 40 (a friend), each person tells you one thing about themselves, once.
  // ================================================================================================================
  C.secrets = {
    mira: [['mira', 'I walked you in on day one because I was nervous, love. Not you. Me.'], ['mira', 'Don\'t tell Dutch. He had money on it.']],
    kai: [['kai', 'I\'m teaching the baker\'s boy knife work. He\'s hopeless.'], ['kai', 'Don\'t tell him I\'m proud of him.']],
    dutch: [['dutch', 'On your watch nights I sleep across the castle doorway. Old habit.'], ['dutch', 'Don\'t mention it. Kid.']],
    ayo: [['ayo', 'I was one anvil once. One man. Somebody taught me to take on help.'], ['ayo', 'Best lesson I ever had. Worst week of my life.']],
    tess: [['tess', 'I don\'t really see EVERYTHING.'], ['tess', 'I just say it so people tell me the rest!']],
    wen: [['wen', 'My husband lost one notebook in a flood. Only one. The one he never copied.'], ['wen', 'Seymour keeps my second notebook now. Don\'t tell him I said thank you.']],
    hobb: [['hobb', 'I cut a key for the wrong man once. Twenty years ago.'], ['hobb', 'Every key since, I ask what it\'s for. Every one.']],
    coo: [['coo', 'Coo. I opened a letter once. Just one.'], ['coo', 'I put a new seal on it. I think about it every day.']],
    lexi: [['lexi', 'The eye under the patch is perfectly fine.'], ['lexi', 'You may know that. You may not tell Doug.']],
    bru: [['bru', 'I keep a row on the board for myself. It\'s always empty.'], ['bru', 'Someday I\'ll take a quest. Ay. Someday.']],
    doug: [['doug', 'Kevin wasn\'t just a bot. He was the only one who answered my messages.'], ['doug', 'Rate limited. But he answered.']],
    seymour: [['seymour', 'I have a backup of the Captain\'s speech. In case he forgets it.'], ['seymour', 'He did, once. I mouthed it from the back.']],
    hollis: [['hollis', 'I let a man ride once with no ticket. Rain was terrible.'], ['hollis', 'He stole the mailbag. I check tickets in the rain now.']],
    odu: [['odu', 'I can\'t swim.'], ['odu', 'Forty years on the river. Never needed to. Don\'t start.']],
    fennel: [['fennel', 'Tess and I were close once. Before the lamps.'], ['fennel', 'I miss her. Don\'t tell her that. She\'ll tell everyone.']],
    aigerim: [['aigerim', 'Page one says: "Today I will be normal." Then page two.'], ['aigerim', 'Anyway, I wrote you down as a friend. In ink.']],
    chad: [['chad', 'Off the record? I don\'t actually know what a castle does.'], ['chad', 'But I\'m learning. From you. Don\'t invoice me.']]
  };

  // ================================================================================================================
  // MEETUPS. When two people's plans bring them together and you walk by, you overhear them. It tells you how they
  // feel about each other (shown in your Town book), and tie: changes it for today.
  // ================================================================================================================
  C.meetups = [
    { a: 'kai', b: 'wen', tie: 'warm', lines: [['wen', 'Kai, dear. You\'re thin. Sit.'], ['kai', 'I\'m a cook, Wen. I\'m supposed to feed you.'], ['wen', 'Then feed me gossip.']] },
    { a: 'dutch', b: 'hobb', tie: 'warm', lines: [['dutch', 'One key per crew, Hobb. Four crews, four keys.'], ['hobb', 'And what\'s each one for?'], ['dutch', 'You always ask.'], ['hobb', 'I always will.']] },
    { a: 'hobb', b: 'ayo', lines: [['hobb', 'Twelve blanks, Ayo. Plain ones.'], ['ayo', 'Plain! For the man who cuts the finest keys in town. Ha!']] },
    { a: 'tess', b: 'coo', lines: [['tess', 'Coo! Who wrote to the castle today? Who? WHO?'], ['coo', 'Coo. Sealed letters are sealed, Tess.'], ['tess', 'That\'s the WORST thing about them!']] },
    { a: 'wen', b: 'mira', tie: 'warm', lines: [['wen', 'Buns for your fire, Mira.'], ['mira', 'You spoil us.'], ['wen', 'Somebody has to. You\'re all bones.']] },
    { a: 'bru', b: 'kai', lines: [['bru', 'Kai! Lunch. Something with no paperwork in it.'], ['kai', 'Rice. Rice has no paperwork.']] },
    { a: 'doug', b: 'bru', tie: 'cool', lines: [['doug', 'Is my row updated? Kevin\'s row?'], ['bru', 'Ay, Doug. Your row is always stale. Because you never tell me anything.']] },
    { a: 'coo', b: 'hollis', tie: 'warm', lines: [['coo', 'Mailbag for the coach, Hollis. Coo.'], ['hollis', 'Ticket?'], ['coo', 'I\'m a pigeon.'], ['hollis', 'Rules are rules.']] },
    { a: 'seymour', b: 'lexi', tie: 'warm', lines: [['seymour', 'Copy of the Index, page forty. For safekeeping.'], ['lexi', 'The Index cannot be copied. It can be honoured.'], ['seymour', 'I honoured it three times.']] },
    { a: 'doug', b: 'lexi', tie: 'cool', lines: [['doug', 'Can I borrow the Index? Just look?'], ['lexi', 'Your crawlers looked. Ten thousand times a minute.'], ['doug', 'That was Kevin.']] },
    { a: 'kagemaru', b: 'odu', lines: [['kagemaru', 'The usual crates, Odu.'], ['odu', 'Opened and checked. Like always.'], ['kagemaru', 'You never trust me.'], ['odu', 'I trust the checking.']] },
    { a: 'fennel', b: 'kagemaru', lines: [['fennel', 'A basket of apples for a lantern wick.'], ['kagemaru', 'Two baskets. The wick is premium.']] },
    { a: 'aigerim', b: 'ayo', lines: [['aigerim', 'Ayo, what time did you light the forge?'], ['ayo', 'Why do you need to know?'], ['aigerim', 'For the diary.']] },
    { a: 'tess', b: 'wen', lines: [['tess', 'Wen! Who bought six buns at dawn?'], ['wen', 'A regular, dear. I forget the rest on purpose.']] },
    { a: 'chad', b: 'bru', lines: [['chad', 'Bru! Quick pitch: the bounty board, but on a blockchain.'], ['bru', 'EHHH?!']] }
  ];

  // ================================================================================================================
  // LESSONS (demos). Anyone without a job for you can show you one security idea, picture by picture. Tiles are
  // [icon, label, state]: state '' plain, 'ok' green, 'no' crossed out, 'new' just arrived, 'dim' faded.
  // ================================================================================================================
  C.demos = {
    mira: { title: 'The watch\'s three questions', frames: [
      { say: ['mira', 'Every door in the castle asks three things.'], tiles: [['🪪', 'Who are you?', ''], ['📜', 'What may you do?', 'dim'], ['📖', 'Written down?', 'dim']] },
      { say: ['mira', 'First, who you are. A real name on a real pass. That\'s authentication.'], tiles: [['🪪', 'Who are you?', 'ok'], ['📜', 'What may you do?', 'dim'], ['📖', 'Written down?', 'dim']] },
      { say: ['mira', 'Then what that name may do. A real baker still can\'t open the armoury. That\'s authorization.'], tiles: [['🪪', 'Baker', 'ok'], ['📜', 'Armoury?', 'no'], ['📖', 'Written down?', 'dim']] },
      { say: ['mira', 'And it all goes in the book, so tomorrow we know who tried what.'], tiles: [['🪪', 'Baker', 'ok'], ['📜', 'Armoury?', 'no'], ['📖', 'Logged', 'new']] }] },
    tess: { title: 'If nobody said yes, it\'s no', frames: [
      { say: ['tess', 'Watch! Here\'s a door with a rule on it: "Bakers may READ the menu."'], tiles: [['📜', 'Allow: read menu', 'ok']] },
      { say: ['tess', 'A baker reads the menu. Fine!'], tiles: [['📜', 'Allow: read menu', 'ok'], ['🧑‍🍳', 'Read menu', 'ok']] },
      { say: ['tess', 'Now the baker tries to WRITE on it. Nobody said yes to that!'], tiles: [['📜', 'Allow: read menu', 'ok'], ['🧑‍🍳', 'Write menu', 'no']] },
      { say: ['tess', 'So it\'s no! In AWS that\'s an implicit deny: anything not allowed is denied.'], tiles: [['📜', 'Allow: read menu', 'ok'], ['🚫', 'Not allowed = denied', 'new']] }] },
    coo: { title: 'What a seal proves', frames: [
      { say: ['coo', 'Coo. A letter, and my secret stamp.'], tiles: [['✉️', 'Letter', ''], ['🔏', 'Secret stamp', 'dim']] },
      { say: ['coo', 'The seal is made from the letter AND the stamp. The stamp never leaves my desk.'], tiles: [['✉️', 'Letter', ''], ['➕', '', 'dim'], ['🔏', 'Secret stamp', ''], ['🟥', 'Seal', 'new']] },
      { say: ['coo', 'Change one word, and the seal no longer matches. Coo. Caught.'], tiles: [['✉️', 'Letter (changed)', 'no'], ['🟥', 'Seal', 'no']] },
      { say: ['coo', 'AWS signs each request the same way: Signature Version 4. The secret key signs, but it\'s never sent.'], tiles: [['📨', 'Request', 'ok'], ['🔑', 'Secret key stays home', 'ok'], ['🟥', 'Signature', 'new']] }] },
    hobb: { title: 'Padlocks out, keys in', frames: [
      { say: ['hobb', 'A key pair. Two halves, made together.'], tiles: [['🔓', 'Public key', ''], ['🗝️', 'Private key', '']] },
      { say: ['hobb', 'The padlock half you hand to anyone. Let them lock what they like.'], tiles: [['🔓', 'Public: give away', 'ok'], ['🗝️', 'Private', 'dim']] },
      { say: ['hobb', 'Only the private half opens it. That one never leaves your pocket.'], tiles: [['🔒', 'Locked box', ''], ['🗝️', 'Private: only you', 'ok']] },
      { say: ['hobb', 'An EC2 key pair works so: AWS keeps only the public half. Lose your private half and nobody can cut you another.'], tiles: [['☁️', 'AWS: public key', 'ok'], ['🗝️', 'You: private key', 'ok'], ['❓', 'Lost? No copy', 'no']] }] },
    kagemaru: { title: 'A ticket that expires', frames: [
      { say: ['kagemaru', 'My storeroom is locked. You want ONE lantern from it. Ah ha.'], tiles: [['🔒', 'Storeroom', ''], ['🏮', 'One lantern', 'dim']] },
      { say: ['kagemaru', 'I write you a ticket: this lantern only, good till noon. Signed by me.'], tiles: [['🎟️', 'Ticket: one lantern, till noon', 'new']] },
      { say: ['kagemaru', 'You get the lantern. Nothing else. After noon, the ticket is paper.'], tiles: [['🎟️', 'Ticket', 'ok'], ['🏮', 'Lantern', 'ok'], ['🕛', 'After noon', 'no']] },
      { say: ['kagemaru', 'S3 calls it a presigned URL: one object, my permission, an expiry. Free advice. First one\'s always free.'], tiles: [['🔗', 'Presigned URL', 'ok'], ['📦', 'One object', 'ok'], ['⏳', 'Expires', 'ok']] }] },
    wen: { title: 'The recipe in the safe', frames: [
      { say: ['wen', 'My oven needs the secret recipe every morning, dear.'], tiles: [['🔥', 'Oven', ''], ['📜', 'Recipe', '']] },
      { say: ['wen', 'Pin it on the wall and every customer reads it.'], tiles: [['🧱', 'On the wall', 'no'], ['👀', 'Everyone sees', 'no']] },
      { say: ['wen', 'So it lives in the safe, and the oven asks the safe each time. When I change it, the oven gets the new one.'], tiles: [['🔥', 'Oven asks', 'ok'], ['🔐', 'Safe', 'ok'], ['🔄', 'Changed? New one', 'new']] },
      { say: ['wen', 'That\'s AWS Secrets Manager. Your code fetches the password at run time, and the secret can rotate on a schedule.'], tiles: [['λ', 'Code fetches it', 'ok'], ['🔐', 'Secrets Manager', 'ok'], ['🔄', 'Rotation', 'ok']] }] },
    kai: { title: 'A cloak on a hook', frames: [
      { say: ['kai', 'The night clerk needs the ledger room. Only on shift.'], tiles: [['🧑', 'Clerk', ''], ['📒', 'Ledger room', 'dim']] },
      { say: ['kai', 'So there\'s a cloak on a hook. Put it on, and the doors know you as "ledger keeper".'], tiles: [['🧥', 'Role: ledger keeper', 'new'], ['📒', 'Ledger room', 'ok']] },
      { say: ['kai', 'The cloak fades on its own. An hour, by default. Then it\'s back on the hook.'], tiles: [['🧥', 'Role', 'ok'], ['⏳', '1 hour', 'ok'], ['🪝', 'Back on the hook', 'new']] },
      { say: ['kai', 'In AWS that\'s assuming a role. STS hands you temporary credentials: a key ID, a secret and a session token.'], tiles: [['🆔', 'Access key ID', 'ok'], ['🔑', 'Secret', 'ok'], ['🎫', 'Session token', 'ok']] }] },
    dutch: { title: 'One pass per crew', frames: [
      { say: ['dutch', 'Four crews. One pass that opens every cellar door.'], tiles: [['👷', 'Crew A', ''], ['👷', 'Crew B', ''], ['🎫', 'One pass: every door', 'no']] },
      { say: ['dutch', 'Lose that pass and you lose the cellars.'], tiles: [['🎫', 'Lost pass', 'no'], ['🚪', 'Every door open', 'no']] },
      { say: ['dutch', 'So each crew gets its own pass, for its own doors.'], tiles: [['👷', 'A: wine', 'ok'], ['👷', 'B: grain', 'ok'], ['👷', 'C: oil', 'ok']] },
      { say: ['dutch', 'Same for Lambda. Each function gets its own execution role with only what it uses. Least privilege.'], tiles: [['λ', 'Function A: its role', 'ok'], ['λ', 'Function B: its role', 'ok']] }] },
    ayo: { title: 'A key for the key', frames: [
      { say: ['ayo', 'The master key never leaves my vault. Too precious. Ha!'], tiles: [['🏛️', 'Master key: stays', 'ok']] },
      { say: ['ayo', 'So for each crate, I make a small key, and lock the crate with it.'], tiles: [['🗝️', 'Small key', 'new'], ['📦', 'Crate locked', 'ok']] },
      { say: ['ayo', 'Then the master key locks the small key. I tie the locked small key to the crate and throw the bare one away.'], tiles: [['📦', 'Crate', 'ok'], ['🔒', 'Locked small key', 'ok'], ['🗑️', 'Bare key gone', 'new']] },
      { say: ['ayo', 'KMS calls it envelope encryption. GenerateDataKey gives you both: the bare data key and its locked copy.'], tiles: [['🔑', 'Plaintext data key', ''], ['🔒', 'Encrypted data key', 'ok'], ['☁️', 'KMS key stays in KMS', 'ok']] }] },
    lexi: { title: 'Locked shelves, and who opened them', frames: [
      { say: ['lexi', 'Every new book in S3 is locked at rest already. Amazon keeps that key. SSE-S3.'], tiles: [['📚', 'New books', 'ok'], ['🔐', 'SSE-S3', 'ok']] },
      { say: ['lexi', 'But the Forbidden Shelf? I want my own key, and my own rules for who may use it.'], tiles: [['📕', 'Forbidden Shelf', ''], ['🗝️', 'My KMS key', 'new']] },
      { say: ['lexi', 'With SSE-KMS, every use of the key is a KMS call, and CloudTrail writes each one down.'], tiles: [['📕', 'Read', 'ok'], ['🗝️', 'KMS Decrypt', 'ok'], ['📖', 'CloudTrail', 'new']] }] },
    bru: { title: 'Two desks', frames: [
      { say: ['bru', 'Desk one: who are you? Show me your name, I give you a crest. Ay, so many crests.'], tiles: [['🧑', 'Adventurer', ''], ['🛡️', 'Crest (token)', 'new']] },
      { say: ['bru', 'That desk is a Cognito user pool. It signs people in and hands out tokens.'], tiles: [['👥', 'User pool', 'ok'], ['🛡️', 'ID and access tokens', 'ok']] },
      { say: ['bru', 'Desk two: show me your crest and I give you a pass into the castle stores. A pass that expires.'], tiles: [['🛡️', 'Crest', 'ok'], ['🎫', 'Temporary AWS pass', 'new']] },
      { say: ['bru', 'That one\'s an identity pool. Token in, temporary AWS credentials out.'], tiles: [['🪪', 'Identity pool', 'ok'], ['🔑', 'Temporary credentials', 'ok']] }] },
    doug: { title: 'Retiring Kevin\'s keys', frames: [
      { say: ['doug', 'Kevin had a key. Two years old. Never changed.'], tiles: [['🔑', 'Old key: 2 years', 'no']] },
      { say: ['doug', 'You can have two keys at once. So first, make a new one.'], tiles: [['🔑', 'Old key', ''], ['🔑', 'New key', 'new']] },
      { say: ['doug', 'Move everything to the new key. Then switch the old one off, not out. Check its "last used" date.'], tiles: [['🔑', 'New key: in use', 'ok'], ['⏸️', 'Old key: inactive', 'dim'], ['📅', 'Last used?', '']] },
      { say: ['doug', 'Nothing broke? Then delete it. That\'s rotating an access key. Kevin approves. Probably.'], tiles: [['🔑', 'New key', 'ok'], ['🗑️', 'Old key deleted', 'new']] }] },
    seymour: { title: 'Sealed coaches only', frames: [
      { say: ['seymour', 'The bunker\'s records may travel. In a sealed coach. Never an open cart.'], tiles: [['🛒', 'Open cart', 'no'], ['🚌', 'Sealed coach', 'ok']] },
      { say: ['seymour', 'So the bunker door has a rule: no seal, no exit.'], tiles: [['🚪', 'Not sealed?', 'no'], ['📜', 'Deny', 'new']] },
      { say: ['seymour', 'For S3: a bucket policy that denies any request where aws:SecureTransport is false. HTTPS only.'], tiles: [['🔒', 'HTTPS', 'ok'], ['🔓', 'HTTP', 'no'], ['📜', 'Deny if SecureTransport false', 'ok']] }] },
    hollis: { title: 'Ticket, and the coach\'s list', frames: [
      { say: ['hollis', 'Your pass says which coaches you may ride. That\'s yours. Carried on you.'], tiles: [['🎫', 'Your pass', 'ok']] },
      { say: ['hollis', 'My coach has its own list: who may ride, by name.'], tiles: [['🚌', 'Coach list: names', 'new']] },
      { say: ['hollis', 'A policy on a person or role is identity-based. A policy on the thing itself, like a bucket, is resource-based. It names a Principal.'], tiles: [['🎫', 'Identity-based', 'ok'], ['🚌', 'Resource-based: Principal', 'ok']] },
      { say: ['hollis', 'From another town, both must agree. Your pass and my list.'], tiles: [['🎫', 'Pass: yes', 'ok'], ['🚌', 'List: yes', 'ok'], ['✅', 'Ride', 'new']] }] },
    odu: { title: 'What\'s in the crates', frames: [
      { say: ['odu', 'Hundreds of crates on the dock. Some have letters in them with names and coin numbers.'], tiles: [['📦', 'Crate', ''], ['📦', 'Crate', ''], ['📦', 'Crate?', '']] },
      { say: ['odu', 'I can\'t open every one. So I get a sniffer that checks them for me.'], tiles: [['🐕', 'Sniffer', 'new'], ['📦', 'Names found', 'no'], ['📦', 'Clean', 'ok']] },
      { say: ['odu', 'Amazon Macie does that for S3: it finds sensitive data like names and card numbers in your buckets.'], tiles: [['🪣', 'S3 buckets', ''], ['🔍', 'Macie', 'ok'], ['⚠️', 'Sensitive data found', 'new']] }] },
    fennel: { title: 'Jar or hive', frames: [
      { say: ['fennel', 'Two places to keep a secret. A jar of honey, or a hive.'], tiles: [['🍯', 'Jar', ''], ['🐝', 'Hive', '']] },
      { say: ['fennel', 'The jar keeps it sealed. Parameter Store SecureString: encrypted with KMS. But nobody changes it for you.'], tiles: [['🍯', 'SecureString', 'ok'], ['🔄', 'Rotation', 'no']] },
      { say: ['fennel', 'The hive changes with the seasons on its own. Secrets Manager can rotate a secret on a schedule.'], tiles: [['🐝', 'Secrets Manager', 'ok'], ['🔄', 'Rotation', 'ok']] }] },
    aigerim: { title: 'The diary that can\'t forget', frames: [
      { say: ['aigerim', 'Every time someone changes something in the castle, I write it down. Who, what, when.'], tiles: [['📖', 'Who · What · When', 'ok']] },
      { say: ['aigerim', 'CloudTrail keeps these changes, management events, for 90 days in its event history. Without asking.'], tiles: [['📖', 'Management events', 'ok'], ['📅', '90 days', 'ok']] },
      { say: ['aigerim', 'But who READ a book on a shelf? That\'s a data event. Off unless you turn it on.'], tiles: [['📕', 'Object read', 'dim'], ['❓', 'Data events: off', 'no']] },
      { say: ['aigerim', 'So turn them on for what matters. I did. For you. Ehehe.'], tiles: [['📕', 'Object read', 'ok'], ['📖', 'Data events: on', 'new']] }] },
    chad: { title: 'Spot the mistake (Chad\'s pitch)', frames: [
      { say: ['chad', 'Big idea: the castle\'s API, open to everyone. No login. Zero friction!'], tiles: [['🌐', 'Anyone', ''], ['λ', 'Function URL: NONE', 'no']] },
      { say: ['seoyeon', 'With auth type NONE, anyone on the internet can call it.'], tiles: [['🌐', 'Anyone calls it', 'no']] },
      { say: ['seoyeon', 'Use AWS_IAM, and only signed requests from someone allowed to invoke it get in.'], tiles: [['🔏', 'Signed request', 'ok'], ['λ', 'Function URL: AWS_IAM', 'ok']] },
      { say: ['chad', 'Love that. Friction, but premium.'], tiles: [['λ', 'AWS_IAM', 'ok']] }] }
  };

  // How each day-1 lesson opens. Everyone knows Seo-yeon already, just not well: a plain hello, warmer from Mira.
  C.lessonHello = {
    mira: 'Sit a minute, love. Let me show you something.',
    tess: 'Seo-yeon! Hi! Got a minute? I want to show you a thing!',
    coo: 'Hello, warden. Coo. Have you a moment for seals?',
    hobb: 'Morning, Seo-yeon. Got a minute? Something I show every apprentice.',
    kagemaru: 'Seo-yeon. A free sample, today only. Ah ha. It\'s advice.'
  };

  // ================================================================================================================
  // SMALL JOBS (mini quests). One question in the Night Watch's question box. Day 1 jobs teach first: the lesson
  // plays, then the question, and a wrong pick just explains and lets you try again. From day 2 it's one try.
  // Shape: { id, who, opens, closes, silver, teach, demo, q, opts (4, first right), a: 0, no: [null, why each is wrong], why }.
  // ================================================================================================================
  C.minis = [
    // ---- Day 1: lessons (teach, then a question the lesson just answered) ----
    { id: 'm-mira-three', who: 'mira', opens: 1, closes: 1, silver: 5, teach: true, demo: 'mira',
      q: 'A visitor shows a real pass with their real name. Pell lets them through the gate. What has Pell checked so far?',
      opts: ['Who they are. That\'s authentication. What they may do inside is a separate check.',
        'What they may do inside. A real pass means they may go anywhere.',
        'Nothing. Passes only matter at night.',
        'Both who they are and every door they may open, in one step.'], a: 0,
      no: [null, 'A real name doesn\'t say which doors it may open. That\'s authorization, a separate check.',
        'The gate checks passes day and night.', 'Knowing who someone is doesn\'t tell you what they\'re allowed to do.'],
      why: 'Authentication proves who you are. Authorization decides what that identity may do. AWS does both on every request.' },
    { id: 'm-tess-deny', who: 'tess', opens: 1, closes: 1, silver: 5, teach: true, demo: 'tess',
      q: 'A role\'s only policy allows s3:GetObject on one bucket. It calls s3:PutObject on that bucket. What happens?',
      opts: ['Denied. Nothing allows PutObject, so the implicit deny applies.',
        'Allowed, because the role can already read the bucket.',
        'Allowed, but the action is logged as a warning.',
        'Denied only if someone wrote an explicit Deny for PutObject.'], a: 0,
      no: [null, 'Reading and writing are separate actions. Allowing one says nothing about the other.',
        'There\'s no allow-with-warning. A request is allowed or denied.',
        'No explicit Deny is needed. Without an Allow, a request is already denied.'],
      why: 'Every request starts denied. Only an explicit Allow opens it, and an explicit Deny beats any Allow.' },
    { id: 'm-coo-seal', who: 'coo', opens: 1, closes: 1, silver: 5, teach: true, demo: 'coo',
      q: 'Someone copies a signed request to S3 and changes the bucket name in it. Why does AWS reject it?',
      opts: ['The signature was computed over the request, so a changed request no longer matches it.',
        'AWS rejects every request that\'s sent twice.',
        'The secret access key was in the request, and changing it breaks the key.',
        'Bucket names can\'t appear in signed requests.'], a: 0,
      no: [null, 'The check is that the signature matches the request, not that it\'s the first copy.',
        'The secret key is never sent. It\'s used to compute the signature.',
        'The bucket is part of what gets signed.'],
      why: 'Signature Version 4 signs the request\'s contents with a key derived from your secret key. Change the request and the signature no longer matches.' },
    { id: 'm-hobb-pair', who: 'hobb', opens: 1, closes: 1, silver: 5, teach: true, demo: 'hobb',
      q: 'You create an EC2 key pair. Which half does AWS keep?',
      opts: ['The public key. You keep the private key, and AWS has no copy of it.',
        'The private key, so it can send it again if you lose it.',
        'Both halves, encrypted with KMS.',
        'Neither. EC2 key pairs aren\'t stored anywhere.'], a: 0,
      no: [null, 'AWS doesn\'t keep your private key, so it can\'t give it back.',
        'Only the public key is stored.', 'The public key is stored and put on the instance.'],
      why: 'With an EC2 key pair, AWS stores the public key and you store the private key. Lose the private key and you need a new pair.' },
    { id: 'm-kagemaru-ticket', who: 'kagemaru', opens: 1, closes: 1, silver: 5, teach: true, demo: 'kagemaru',
      q: 'A customer needs to download one private file from S3 for the next hour, without an AWS account. What do you give them?',
      opts: ['A presigned URL for that object that expires in an hour.',
        'Your access keys, to delete after an hour.',
        'Make the bucket public for an hour.',
        'An IAM user with read access to the whole bucket.'], a: 0,
      no: [null, 'Your keys would open everything you can open, until someone remembers to delete them.',
        'Public means everyone, for every object, while it lasts.',
        'An IAM user is a lasting identity with more access than one file.'],
      why: 'A presigned URL lets the holder do one action on one object with the signer\'s permission, until it expires.' },

    // ---- Days 2 to 8: quick jobs, one try ----
    { id: 'm-wen-safe', who: 'wen', opens: 2, closes: 3, silver: 5, demo: 'wen',
      q: 'A Lambda function needs a database password that changes every month. Where should it get it?',
      opts: ['From Secrets Manager at run time, with rotation turned on for the secret.',
        'From a constant in the function\'s code, updated each month.',
        'From a plain environment variable typed in by hand.',
        'From a text file in a public S3 bucket.'], a: 0,
      no: [null, 'A password in code is visible to anyone who reads the code, and needs a deploy to change.',
        'A hand-typed variable won\'t change itself when the password does.',
        'A public bucket shares it with everyone.'],
      why: 'Secrets Manager stores the secret, rotates it on a schedule, and your code asks for the current value when it runs.' },
    { id: 'm-dutch-pass', who: 'dutch', opens: 5, closes: 6, silver: 5, demo: 'dutch',
      q: 'Two Lambda functions: one reads a table, one writes to a queue. How should their permissions be set up?',
      opts: ['A separate execution role for each, each allowing only its own action and resource.',
        'One shared role that allows both, so they stay in sync.',
        'No role. Lambda functions can reach any service in the account.',
        'One role with AdministratorAccess for both, to avoid errors.'], a: 0,
      no: [null, 'A shared role gives each function the other\'s access too.',
        'A function has only the permissions its execution role grants.',
        'Admin access is far more than either function needs.'],
      why: 'Least privilege: give each function its own execution role with only the actions and resources it uses.' },
    { id: 'm-kai-cloak', who: 'kai', opens: 2, closes: 2, silver: 5, demo: 'kai',
      q: 'You call AssumeRole and don\'t ask for a duration. How long are the credentials good for?',
      opts: ['One hour, the default.', 'Fifteen minutes, always.', 'Until you call AssumeRole again.', 'Twelve hours, the most a role allows.'], a: 0,
      no: [null, 'Fifteen minutes is the shortest you can ask for, not the default.',
        'They expire on their own, whether you call again or not.',
        'A role can be set to allow up to 12 hours, but the default is one.'],
      why: 'AssumeRole credentials last one hour unless you ask otherwise, from 15 minutes up to the role\'s maximum session duration.' },
    { id: 'm-ayo-envelope', who: 'ayo', opens: 2, closes: 2, silver: 5, demo: 'ayo',
      q: 'You need to encrypt a 50 MB file with a KMS key. How?',
      opts: ['Call GenerateDataKey, encrypt the file with the plaintext data key, store the encrypted data key with it, and discard the plaintext key.',
        'Send the whole file to KMS Encrypt.',
        'Export the KMS key and encrypt the file with it locally.',
        'Split the file into 50 parts and call Encrypt on each one.'], a: 0,
      no: [null, 'KMS Encrypt takes at most 4 KB of data.',
        'KMS keys never leave KMS unencrypted.',
        'Each call still takes at most 4 KB, so that would take thousands of calls. Envelope encryption is how big data is done.'],
      why: 'Envelope encryption: KMS gives you a data key, you encrypt locally, and only the encrypted data key is stored.' },
    { id: 'm-lexi-who-read', who: 'lexi', opens: 4, closes: 5, silver: 5, demo: 'lexi',
      q: 'You need a record each time anyone decrypts objects in one S3 bucket with your key. Which encryption should the bucket use?',
      opts: ['SSE-KMS with a customer managed key, so each use of the key is a KMS call that CloudTrail records.',
        'SSE-S3, since it\'s on by default.',
        'No encryption, and S3 server access logs instead.',
        'Client-side encryption with a key stored in the bucket.'], a: 0,
      no: [null, 'With SSE-S3, Amazon S3 manages the key, so there\'s no KMS call of yours to record.',
        'Unencrypted data doesn\'t meet the need to control the key.',
        'A key stored next to the data protects nothing.'],
      why: 'With SSE-KMS, S3 calls KMS to use your key, and CloudTrail logs those KMS calls.' },
    { id: 'm-bru-desks', who: 'bru', opens: 2, closes: 2, silver: 5, demo: 'bru',
      q: 'Signed-in app users need to upload files straight to S3 from their phones. What gives them AWS credentials?',
      opts: ['A Cognito identity pool, which trades their sign-in token for temporary AWS credentials.',
        'The user pool\'s ID token, sent as the S3 password.',
        'An IAM user for each app user.',
        'One access key built into the app.'], a: 0,
      no: [null, 'A user pool token proves who they are, but S3 needs AWS credentials.',
        'Thousands of IAM users is unmanageable and long-lived.',
        'A key built into an app can be pulled out by anyone.'],
      why: 'User pools sign people in. Identity pools exchange that sign-in for temporary, limited AWS credentials.' },
    { id: 'm-doug-two', who: 'doug', opens: 2, closes: 2, silver: 5, demo: 'doug',
      q: 'How many access keys can one IAM user have at the same time?',
      opts: ['Two, so you can rotate without downtime.', 'One.', 'Five.', 'As many as you like.'], a: 0,
      no: [null, 'A second key is allowed, which is what makes rotation smooth.',
        'The limit is two.', 'The limit is two.'],
      why: 'An IAM user can have two access keys. Create the new one, move over, deactivate the old one, then delete it.' },
    { id: 'm-seymour-https', who: 'seymour', opens: 7, closes: 8, silver: 5, demo: 'seymour',
      q: 'How do you make an S3 bucket refuse requests that aren\'t sent over HTTPS?',
      opts: ['A bucket policy that denies requests when aws:SecureTransport is false.',
        'Turn on default encryption.',
        'Block public access.',
        'Enable versioning.'], a: 0,
      no: [null, 'Default encryption protects data at rest, not in transit.',
        'That stops public access, not plain HTTP.',
        'Versioning keeps old copies. It doesn\'t affect the connection.'],
      why: 'aws:SecureTransport is false for plain HTTP requests, so a Deny on that condition makes the bucket HTTPS only.' },
    { id: 'm-hollis-principal', who: 'hollis', opens: 2, closes: 3, silver: 5, demo: 'hollis',
      q: 'Which kind of policy has a Principal element naming who it applies to?',
      opts: ['A resource-based policy, such as an S3 bucket policy.',
        'An identity-based policy attached to a role.',
        'An identity-based policy attached to a user.',
        'Every policy has one.'], a: 0,
      no: [null, 'An identity-based policy applies to whoever it\'s attached to, so it has no Principal.',
        'Same: it applies to the user it\'s attached to.',
        'Only resource-based policies (and role trust policies) name a Principal.'],
      why: 'Resource-based policies are attached to a resource and say who may use it in a Principal element.' },
    { id: 'm-odu-macie', who: 'odu', opens: 3, closes: 3, silver: 5, demo: 'odu',
      q: 'You need to find which of 200 S3 buckets hold names and card numbers. Which service?',
      opts: ['Amazon Macie.', 'AWS KMS.', 'Amazon Cognito.', 'AWS Secrets Manager.'], a: 0,
      no: [null, 'KMS manages keys. It doesn\'t look inside your data.', 'Cognito signs users in.', 'Secrets Manager stores secrets you give it.'],
      why: 'Macie scans S3 for sensitive data such as personal information and financial data, and reports what it finds.' },
    { id: 'm-fennel-rotate', who: 'fennel', opens: 2, closes: 3, silver: 5, demo: 'fennel',
      q: 'A database password must change every 30 days without anyone doing it by hand. Where should it live?',
      opts: ['Secrets Manager, with rotation scheduled every 30 days.',
        'Parameter Store SecureString, which rotates on its own.',
        'A KMS key, which rotates yearly.',
        'An environment variable.'], a: 0,
      no: [null, 'SecureString is encrypted, but Parameter Store has no built-in rotation.',
        'KMS key rotation changes the key material, not your password.',
        'Nothing changes an environment variable for you.'],
      why: 'Secrets Manager can rotate a secret on a schedule. Parameter Store SecureString encrypts it but doesn\'t rotate it.' },
    { id: 'm-aigerim-data', who: 'aigerim', opens: 6, closes: 7, silver: 5, demo: 'aigerim',
      q: 'Someone read an object in S3 last night, and CloudTrail shows nothing. Why?',
      opts: ['S3 object reads are data events, and data events aren\'t logged unless you turn them on.',
        'CloudTrail is off by default.',
        'CloudTrail only logs failed requests.',
        'S3 isn\'t supported by CloudTrail.'], a: 0,
      no: [null, 'Management events show in event history without setup.',
        'CloudTrail logs successful requests too.',
        'S3 is supported, as management and data events.'],
      why: 'Reads like GetObject are data events. They cost extra and are off until you add them to a trail.' },
    { id: 'm-chad-url', who: 'chad', opens: 3, closes: 4, silver: 5, demo: 'chad',
      q: 'Chad set a Lambda function URL\'s auth type to NONE. Only your own services should call it. What should change?',
      opts: ['Set the auth type to AWS_IAM, so callers must sign requests and be allowed to invoke it.',
        'Keep NONE but don\'t share the URL.',
        'Put the URL behind a longer name.',
        'Keep NONE and add an access key to the URL.'], a: 0,
      no: [null, 'A secret URL is still public. Anyone who finds it can call it.',
        'A longer name is still public.',
        'Keys in a URL leak, and NONE ignores them anyway.'],
      why: 'With AWS_IAM, Lambda checks the caller\'s signed request and their permission to invoke the function URL.' }
  ];

  // ---- The harvest feast (Ladi, Nov 18): what keeps Mira, Kai and Dutch from watching on the ninth night ----
  // Her party doesn't take her silver. Each has a job at the feast: find someone they trust to cover it, and they're
  // free. Checked against the AWS docs: KMS grants (docs.aws.amazon.com/kms/latest/developerguide/grants.html),
  // Cognito identity pool guest access (cognito/latest/developerguide/identity-pools.html), IAM condition keys
  // aws:SourceIp and aws:CurrentTime (IAM/latest/UserGuide/reference_policies_condition-keys.html).
  C.quests = (C.quests || []).concat([
    // Each asks their own question first, then sends you to a cover who wants something before saying yes (Ladi, Nov 18).
    { id: 'mira-feast-tent', giver: 'mira', kind: 'duty', opens: 3, closes: 8, skill: '2.2.4', reward: { silver: 0, heart: false, free: true },
      lines: { offer: ['The ninth night? I\'d love to. But it\'s the harvest moon.',
        'Half the town eats at Kai\'s feast, and the other half ends up in my sick tent. Somebody has to sit with them.'] },
      steps: [
        { at: { who: 'mira' }, say: [['mira', 'If I hand my tent to someone, I hand them my medicine chest too. For one night only.'], ['mira', 'Tell me how you\'d do that.']] },
        { at: { who: 'mira' }, ask: {
          q: 'KMS key policies. A job needs to decrypt with your KMS key for one night, then lose access. You don\'t want to edit the key policy. What fits?',
          choices: ['A grant for the job\'s role, retired afterwards', 'Add the role to the key policy, remove it later', 'Export the key material and hand it to the job', 'Allow kms:Decrypt in the role\'s IAM policy only'], answer: 0,
          why: 'A grant lets a principal use a KMS key without changing the key policy, and you retire or revoke it when the job is done. An IAM policy alone only works if the key policy already delegates to IAM, and KMS keys never leave KMS unencrypted.' } },
        { at: { who: 'mira' }, say: [['mira', 'That\'s it exactly. Fennel knows her herbs better than I do.'], ['mira', 'If she\'d take the tent for one night, I\'m yours. Tell her I asked.']] },
        { at: { level: 'far-lane', who: 'fennel' }, proof: false, help: { high: 'Mira\'s tent? Of course.' },
          say: [['fennel', 'Mira\'s tent? I\'d do it. But not without my herb satchel.'], ['fennel', 'I left it up by the old lookout on the West Road. These knees aren\'t climbing up there again.']] },
        { at: { level: 'west-road', spot: 'lookout-ruin' }, say: [['seoyeon', 'Under the fallen stones: a satchel that smells of chamomile.']] },
        { at: { level: 'far-lane', who: 'fennel' }, say: [['fennel', 'My satchel! Chamomile for everyone, then.'], ['fennel', 'Tell Mira the tent\'s mine for the night.']] },
        { at: { who: 'mira' }, say: [['mira', 'She said yes? Then on the ninth night I\'m on Main Street.'], ['mira', 'Thank you, Seo-yeon.']] }
      ], clue: null },
    { id: 'kai-feast-line', giver: 'kai', kind: 'duty', opens: 3, closes: 8, skill: '2.1.2', reward: { silver: 0, heart: false, free: true },
      lines: { offer: ['Ninth night? That\'s the harvest feast. I\'m cooking for the whole town.', 'Can\'t walk out of a kitchen mid-service, Seo-yeon. Not even for you.'] },
      steps: [
        { at: { who: 'kai' }, say: [['kai', 'Guests want to put their feast pictures somewhere. Nobody\'s making an account to do it.'], ['kai', 'You\'re the security one. How?']] },
        { at: { who: 'kai' }, ask: {
          q: 'Cognito identity pools. Feast guests should upload photos to one S3 folder without making an account. What fits?',
          choices: ['An identity pool guest role, for that folder only', 'An access key in the page, limited to that folder', 'A user pool with guest sign-in for uploads', 'A presigned upload URL that never expires'], answer: 0,
          why: 'An identity pool can give guests temporary AWS credentials through its unauthenticated role, so keep that role to the one action and folder. A key in the page works for anybody and never expires, and a presigned URL lasts at most 7 days.' } },
        { at: { who: 'kai' }, say: [['kai', 'Huh. Fine. Wen could run my line. She fed this market before I could hold a knife.'], ['kai', 'She won\'t like being asked. Ask her anyway.']] },
        { at: { who: 'wen' }, proof: false, help: { high: 'For Kai? Anything, dear.' },
          say: [['wen', 'Run Kai\'s line? I might. But a kitchen that night means strangers with keys.'], ['wen', 'Show me you\'d hand out the right ones, dear.']] },
        { at: { who: 'wen' }, keys: [
          { title: 'The night cook', say: 'The night cook cooks from the menu. Nothing else. Which keys?', ok: 'Just what the job needs.',
            items: [['Read the menu', true, ''], ['Open the walk-in', true, ''], ['Open the till', false, 'The cook never takes money: no till key.'],
              ['Change the rota', false, 'Changing the rota is the head cook\'s job.'], ['Order stock', false, 'Ordering spends the kitchen\'s money: not a cook\'s key.']] },
          { title: 'The dishwasher', say: 'And the dishwasher, who only washes up?', ok: 'One job, one key.',
            items: [['Open the scullery', true, ''], ['Open the walk-in', false, 'Washing up never needs the walk-in.'], ['Read the menu', false, 'A dishwasher doesn\'t need the menu.'],
              ['Open the till', false, 'Nobody washing up needs the till.']] }] },
        { at: { who: 'wen' }, say: [['wen', 'Every key for its job and no more. That\'s my kitchen.'], ['wen', 'Tell Kai to leave his recipes and stay out of my way.']] },
        { at: { who: 'kai' }, say: [['kai', 'She said that? She\'s right.'], ['kai', 'Ninth night, I\'m on the upper floor. Save me a plate.']] }
      ], clue: null },
    { id: 'dutch-feast-walk', giver: 'dutch', kind: 'duty', opens: 3, closes: 8, skill: '2.1.6', reward: { silver: 0, heart: false, free: true },
      lines: { offer: ['Ninth night, the Captain goes down to the feast by boat. Somebody rides along, there and back.', 'That\'s been me. I don\'t hand it to just anyone.'] },
      steps: [
        { at: { who: 'dutch' }, say: [['dutch', 'Whoever rides along gets the Captain\'s gate key for the night. Only the night.'], ['dutch', 'Tell me how you\'d make sure of that.']] },
        { at: { who: 'dutch' }, ask: {
          q: 'IAM policy conditions. A stand-in may use the gate\'s permissions only from the castle network, and only tonight. What fits?',
          choices: ['An Allow with aws:SourceIp and aws:CurrentTime conditions', 'A separate access key that someone deletes in the morning', 'The same Allow, with CloudTrail watching for misuse', 'An Allow with aws:SourceIp, removed by hand at dawn'], answer: 0,
          why: 'Condition keys narrow an Allow: aws:SourceIp checks where the request came from, and DateGreaterThan and DateLessThan on aws:CurrentTime set the window. A key or an Allow someone must remember to remove keeps working if they forget, and CloudTrail only tells you afterwards.' } },
        { at: { who: 'dutch' }, say: [['dutch', 'Good. Odu, down at the river dock. Hobb swears by him, and Hobb doesn\'t swear by anybody.'], ['dutch', 'If Odu takes the Captain down, the ground floor\'s mine.']] },
        { at: { who: 'odu' }, proof: false, help: { high: 'For the Captain? Gladly.' },
          say: [['odu', 'Row the Captain to the feast? Gladly. On an empty stomach? No.'], ['odu', 'Bring me one of Wen\'s meat pies and you\'ve got your boatman.']] },
        { at: { who: 'wen' }, say: [['wen', 'A meat pie for Odu? He always wants the burnt one.']], buy: { item: 'a meat pie', cost: 5 } },
        { at: { who: 'odu' }, say: [['odu', 'Burnt. Perfect.'], ['odu', 'Tell Dutch I\'ll bring the Captain home safe.']] },
        { at: { who: 'dutch' }, say: [['dutch', 'Odu said yes. Good.'], ['dutch', 'Ground floor on the ninth night. Nobody gets past me.']] }
      ], clue: null }
  ]);
})();
