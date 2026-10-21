// Chapter 1's climb up Mount Quota (design: "Chapter 1: the mountain trek", Oct 21): the trail's concepts and
// questions, Freya's AdministratorAccess card and its least-privilege questions, and their Huh??? and ELI5 lines.
// The mountain itself is in js/ch1-mountain.js and its words in js/ch1-trek-story.js.
// AWS facts follow the current AWS documentation (the IAM, STS, S3, Lambda and CloudTrail user guides). Every
// explanation is written fresh; no practice-exam questions or course material are copied.
(function () {
  const PAGE = {
    polanatomy: 'Every statement is a little sentence: Effect, Action, Resource, and an "only if". All of it has to match, darling, or none of it counts. xx F.',
    s3arn: 'The bucket and the things in it have different names. Listing is the bucket; reading is the things. Two lines, not one. xx F.',
    lambdaperm: 'A function wears its execution role to do things, and keeps a guest list for who may call it. Don\'t mix them up. xx F.'
  };
  Object.assign(SD.concepts, {
    polanatomy: {
      name: 'Policy Anatomy', zone: 1,
      gist: 'A policy is JSON: a Version ("2012-10-17") and one or more statements. Each statement has an Effect (Allow or Deny), an Action (such as s3:GetObject), a Resource (an ARN such as arn:aws:s3:::bucket/key) and an optional Condition; a resource-based policy also names a Principal. A statement applies only when every element matches, and * in an action or an ARN matches any run of characters.',
      page: PAGE.polanatomy
    },
    s3arn: {
      name: 'Bucket and Object ARNs', zone: 1,
      gist: 's3:ListBucket acts on the bucket, arn:aws:s3:::bucket. s3:GetObject, s3:PutObject and s3:DeleteObject act on objects, arn:aws:s3:::bucket/key, so a policy that lists and reads needs both ARNs. Without s3:ListBucket, a request for a key that doesn\'t exist gets 403 Access Denied instead of 404 Not Found.',
      page: PAGE.s3arn
    },
    lambdaperm: {
      name: 'Function Permissions', zone: 1,
      gist: 'A Lambda function has two sides. Its execution role is the role Lambda assumes to run your code, so it decides what the function can call (DynamoDB, S3, Parameter Store). Its resource-based policy decides who may invoke it, such as another account or a service like S3, with lambda:InvokeFunction.',
      page: PAGE.lambdaperm
    }
  });

  // ---------- Freya's card ----------
  // The real AWS managed policy AdministratorAccess is one statement: Allow, Action "*", Resource "*".
  // It replaces Freya's Blessing (old saves are moved over in js/ch1-mountain.js).
  SD.cards.adminaccess = {
    name: 'AdministratorAccess', cost: 0, kind: 'action', mit: 8, gain: 1, tags: ['allow', 'admin'],
    text: 'Allow * on *. Mitigate {mit} and gain 1 Capacity. Every play asks what would have been enough. The fine print says Principal: Freya.',
    art: 'bolt', rarity: 'rare', concept: 'iam', ch: 1, quest: true
  };

  // ---------- Questions ----------
  // Written for the trail, kept in the exam bank (js/bank-dva-trek.js): the puzzles' questions, and the least-privilege
  // questions AdministratorAccess asks when you play it (lp: true).
  const own = {
    'dva-2-601': { c: 'polanatomy' },
    'dva-2-602': { c: 'polanatomy' },
    'dva-2-603': { c: 's3arn' },
    'dva-2-604': { c: 'respolicy' },
    'dva-2-605': { c: 'conditions' },
    'dva-2-606': { c: 'roles' },
    'dva-2-607': { c: 'lambdaperm' },
    'dva-4-601': { c: 'cloudtrail' },
    'dva-2-608': { c: 'iam', lp: true },
    'dva-2-609': { c: 'iam', lp: true },
    'dva-2-610': { c: 'roles', lp: true },
    'dva-2-611': { c: 's3arn', lp: true },
    'dva-4-602': { c: 'cloudtrail', lp: true },
    'dva-2-612': { c: 'conditions', lp: true },
    'dva-2-613': { c: 'respolicy', lp: true },
    'dva-2-614': { c: 'lambdaperm', lp: true }
  };
  (SD.bank || []).forEach(b => { if (own[b.id]) SD.questions.push(Object.assign({}, b, own[b.id])); });
  // Others from the exam bank (js/bank-dva.js and the bank files index.html loads after it), adopted for the trail's
  // puzzles with a chapter 1 concept. js/ch1.js already adopts dva-2-13 (the locker's ListBucket question).
  const adopt = {
    'dva-2-102': 'polanatomy',
    'dva-2-105': 'respolicy', 'dva-2-140': 'respolicy',
    'dva-2-136': 'conditions', 'dva-2-106': 'conditions', 'dva-2-104': 'conditions',
    'dva-2-108': 'roles', 'dva-2-127': 'roles',
    'dva-2-112': 'lambdaperm', 'dva-2-113': 'lambdaperm', 'dva-2-134': 'lambdaperm', 'dva-1-204': 'lambdaperm',
    'dva-4-404': 'cloudtrail', 'dva-2-406': 'cloudtrail'
  };
  // Each puzzle asks one question picked at random from its pool, and another from the same pool if you miss it
  // (Ladi, Oct 21: so you read the question instead of remembering a sequence of answers).
  SD.ch1pools = {
    board: ['dva-2-601', 'dva-2-602', 'dva-2-102'],
    locker: ['dva-2-13', 'dva-2-603'],
    toll: ['dva-2-105', 'dva-2-604', 'dva-2-04', 'dva-2-140'],
    ledge: ['dva-2-605', 'dva-2-136', 'dva-2-106', 'dva-2-104', 'dva-2-10'],
    lift: ['dva-2-606', 'dva-2-108', 'dva-2-127', 'dva-2-16'],
    motor: ['dva-2-607', 'dva-2-112', 'dva-2-113', 'dva-2-134', 'dva-1-204'],
    logbook: ['dva-4-404', 'dva-4-601', 'dva-4-12', 'dva-2-406']
  };
  (SD.bank || []).forEach(b => { if (adopt[b.id] && !SD.questions.some(q => q.id === b.id)) SD.questions.push(Object.assign({}, b, { c: adopt[b.id] })); });

  // ---------- Huh??? and ELI5 ----------
  Object.assign(SD.huh, {
    polanatomy: 'A policy is a quest contract written in JSON. Each statement is one line of it: Effect (yes or no), Action (the move you may use, like s3:GetObject), Resource (what you may use it on) and an optional Condition (the "only if", like "only at night"). A contract pinned to a thing itself also names who it\'s for (the Principal). Every part has to match, or that line of the contract doesn\'t count. A * is a wildcard slot: it matches anything.',
    s3arn: 'An S3 bucket is a treasure chest, and each object is an item inside it. They have different names: the chest is arn:aws:s3:::chest, an item is arn:aws:s3:::chest/item. Reading the list on the lid (s3:ListBucket) is a move you use on the chest. Taking an item out (s3:GetObject) is a move you use on the item. If you can\'t read the lid, the chest won\'t even say whether an item exists: you get "access denied", never "not found".',
    lambdaperm: 'A Lambda function is a summoned familiar with two pieces of paper. Its execution role is the costume it wears while it works: that decides what the familiar may touch. Its resource-based policy is the summoning circle: that decides who is allowed to summon it. Mixing the two up is the classic mistake.'
  });
  Object.assign(SD.eli5, {
    'dva-2-601': 'The rule says: "You may take a map, but only through the guarded door." Sneaking in the side door (plain HTTP) means the rule just doesn\'t apply, and with no rule saying yes, the answer is no.',
    'dva-2-602': 'A star in a name is a blank anyone can fill in. "trail-maps/*" means "anything inside the trail-maps chest", however deep the folders go. It doesn\'t mean a different chest, and it doesn\'t let you do anything except what the slip says.',
    'dva-2-603': 'If you\'re not allowed to see the list, the chest won\'t even tell you whether the item exists. It just says "no", so nobody can go fishing for item names.',
    'dva-2-604': 'Inside your own kingdom, a sign on the shop saying "this adventurer may come in" is enough on its own, as long as nobody has written a flat "no".',
    'dva-2-605': 'The sign says "nobody crosses without the guarded rope (HTTPS)". With the rope you\'re past the sign, but you still need someone to have said you may cross.',
    'dva-2-606': 'The lift is a costume with a guest list. Its powers are fine, but your name isn\'t on the list. Write your name on the guest list (the trust policy), not on the powers.',
    'dva-2-607': 'The lift motor works while wearing its own costume (the execution role). It\'s the costume that needs permission to write in the log book.',
    'dva-4-601': 'Every camera clip has a name tag saying who did it: userIdentity. The other fields say which shop they visited, what they asked for and what they got back.',
    'dva-2-105': 'Borrowing from a shop in another kingdom takes two yeses: the shop\'s sign has to name your helper, and your helper\'s own badge has to allow the trip. Neither one alone opens the door.',
    'dva-2-136': 'The guard turns away badges stamped "NO MFA". Old long-term keys have no MFA stamp at all, so the guard never sees a NO and waves them through. Telling the guard "no stamp counts as NO" (the IfExists version) closes the gap.',
    'dva-2-108': 'Every costume has a longest loan time written on its tag, one hour unless someone changes it (up to 12). Asking for four hours on a one-hour costume gets a flat "no" until the tag is changed.',
    'dva-2-112': 'Calling a helper in another kingdom takes two yeses: the sign on the helper\'s door (its resource policy) has to name you, and your own badge has to allow the call.',
    'dva-4-404': 'The castle camera only films changes to settings unless you tell it to film the chests too (data events on a trail). The chest\'s own visitor book (server access logs) also writes down who took what.',
    'dva-2-102': 'It sounds like "all S3 moves except delete", but this spell says "every move in the whole game except delete". Pick the S3 skill tree first, then lock the one delete move separately.',
    'dva-2-140': 'Instead of listing every house on the street, the sign says "anyone whose address is on Workloads Road, or any lane off it". New houses on that road are covered without repainting the sign.',
    'dva-2-106': 'The door wants a badge stamped "used a second password". Your permanent key has no stamp, so trade it in at the guild desk with your MFA code. You get a temporary stamped badge, and the door opens.',
    'dva-2-104': 'The bouncer only admits people from one street address. Your app arrives through a secret tunnel that has no street address at all, so the sign has to name the tunnel (the VPC endpoint) instead.',
    'dva-2-127': 'Save a loadout once: which costume to wear, which badge to show, and where your MFA token is. After that the CLI equips it for you, asks for the code, and keeps it on until the timer runs out.',
    'dva-2-113': 'The sign said "the chest called Treasure may ring the bell". Chests can be destroyed and their names claimed by another player, so the sign should also say whose base the chest must be in.',
    'dva-2-134': 'Handing your familiar its costume (giving a Lambda function a role) is its own permission, iam:PassRole. You need permission to hand over that one costume, to that kind of familiar.',
    'dva-1-204': 'Give the familiar its own front door (a function URL) and set the lock to "show a signed badge" (AWS_IAM). No castle gate in front of it needed.',
    'dva-2-406': 'Three people wore the same costume, so the camera only sees the costume. Make each one write their own name on its collar (the role session name) when they put it on.',
    'dva-2-608': 'You borrowed the master key of the whole castle to open one drawer. A key to that one drawer would have done.',
    'dva-2-609': 'Your helper needed to write one line in one book. Give them a pen for that book, not the whole library.',
    'dva-2-610': 'All you did was put on one costume. Permission to put on that one costume is enough.',
    'dva-2-611': 'You only read the list on the chest\'s lid. Permission to read that list is all you needed.',
    'dva-4-602': 'You only rewatched the replay. One move, LookupEvents, is enough. This move can\'t be aimed at one replay, so the target stays a star.',
    'dva-2-612': 'Let them throw things out of the chest, but only when they showed the second password at the door.',
    'dva-2-613': 'Your king said "go anywhere", but the other kingdom\'s shop still had to put your name on its door.',
    'dva-2-614': 'The helper only reads one note on the notice board. Give them that one note, not the whole board.'
  });
})();
