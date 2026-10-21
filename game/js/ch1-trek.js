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
  // t-: the trail's puzzles. lp-: the least-privilege questions AdministratorAccess asks when you play it (lp: true).
  const Qs = [
    // Coldstart's notice board
    { id: 't-anat1', c: 'polanatomy', type: 'mc', ev: '{\n  "Effect": "Allow",\n  "Action": "s3:GetObject",\n  "Resource": "arn:aws:s3:::trail-maps/*",\n  "Condition": { "Bool": { "aws:SecureTransport": "true" } }\n}',
      q: 'The trail rules on the notice board are this one statement, and nothing else applies. A hiker downloads arn:aws:s3:::trail-maps/summit.png over plain HTTP. What happens?',
      opts: ['Denied, because the Condition is false over plain HTTP', 'Allowed, because the Action and Resource both match', 'Allowed, because a Condition only adds request logging', 'Denied, because GetObject also needs s3:ListBucket'], a: 0,
      no: [null, 'They match, but a statement applies only when every element matches, the Condition included.', 'A Condition decides whether the statement applies at all. Logging API calls is CloudTrail\'s job.', 's3:ListBucket is for listing keys. Downloading a key you name needs only s3:GetObject.'],
      why: 'A statement applies only when every element matches: Action, Resource and Condition. Over plain HTTP aws:SecureTransport is false, so this Allow never applies and the request falls back to the implicit deny.' },
    { id: 't-anat2', c: 'polanatomy', type: 'mc', q: 'A statement allows s3:GetObject on arn:aws:s3:::trail-maps/*. Which request does it allow?',
      opts: ['Getting trail-maps/routes/north.png', 'Getting an object in trail-maps-backup', 'Listing the keys in the trail-maps bucket', 'Deleting trail-maps/routes/north.png'], a: 0,
      no: [null, 'The ARN names the trail-maps bucket followed by a slash, so a different bucket never matches.', 'Listing is s3:ListBucket on the bucket ARN, a different action on a different resource.', 'The statement names only s3:GetObject. Deleting is s3:DeleteObject.'],
      why: 'In an ARN, * matches any run of characters, slashes included, so bucket/* covers every key at any depth. It doesn\'t widen the action, and it doesn\'t match another bucket or the bucket itself.' },
    // The ranger's locker
    { id: 't-locker2', c: 's3arn', type: 'mc', q: 'Your role has s3:GetObject on trail-locker/* but no s3:ListBucket. You ask for trail-locker/rope.txt, which doesn\'t exist. What does S3 return?',
      opts: ['403 Access Denied, without saying if it exists', '404 Not Found, the same answer as with ListBucket', '400 Bad Request, because the key is invalid', '200 OK with an empty object body'], a: 0,
      no: [null, 'S3 answers 404 for a missing key only to a caller who has s3:ListBucket on the bucket.', '400 is for a malformed request. A key that doesn\'t exist is still a well-formed one.', 'S3 never makes up an empty object. A missing key is an error.'],
      why: 'Without s3:ListBucket, S3 won\'t tell you whether a key exists, so a missing key comes back 403 Access Denied. With ListBucket it comes back 404 Not Found.' },
    // The toll hut
    { id: 't-toll2', c: 'respolicy', type: 'mc', q: 'Now the toll hut bucket is in your own account. Its bucket policy allows your role s3:GetObject, and your role\'s own policies don\'t mention the bucket. What happens?',
      opts: ['Allowed: in one account, either policy\'s Allow is enough', 'Denied: the role\'s identity policy must allow it too', 'Denied: a bucket policy can only name whole accounts, not roles', 'Allowed, but only once the role is assumed with MFA'], a: 0,
      no: [null, 'That rule is for requests across accounts. Within one account the bucket policy\'s Allow is enough here.', 'A bucket policy can name a single role or user as its Principal, not only an account.', 'Nothing here asks for MFA. That would take a Condition on aws:MultiFactorAuthPresent.'],
      why: 'Within one account, an Allow in either the identity policy or the resource policy is usually enough, as long as nothing explicitly denies it.' },
    // The windy ledge
    { id: 't-ledge1', c: 'conditions', type: 'mc', ev: '{\n  "Effect": "Deny",\n  "Principal": "*",\n  "Action": "s3:*",\n  "Resource": ["arn:aws:s3:::ledge", "arn:aws:s3:::ledge/*"],\n  "Condition": { "Bool": { "aws:SecureTransport": "false" } }\n}',
      q: 'The ledge\'s bucket policy has this statement. Which request gets through?',
      opts: ['An HTTPS GetObject from a role that\'s allowed it', 'An HTTP GetObject from a role that\'s allowed s3:*', 'An HTTP GetObject signed by the account root user', 'An HTTPS GetObject from a role with no Allow at all'], a: 0,
      no: [null, 'Over HTTP aws:SecureTransport is false, so the Deny applies, and an explicit Deny beats any Allow.', 'An explicit Deny in a bucket policy applies to the root user too. Root can only get past it by deleting the policy.', 'HTTPS avoids the Deny, but nothing allows the request, so the implicit deny stands.'],
      why: 'Two things must be true: no explicit Deny applies (HTTPS makes aws:SecureTransport true, so this one doesn\'t), and some policy allows the action.' },
    // The cable lift
    { id: 't-lift1', c: 'roles', type: 'mc', ev: 'An error occurred (AccessDenied) when calling the AssumeRole operation: User: arn:aws:sts::111122223333:assumed-role/hiker/kai is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::111122223333:role/cable-lift',
      q: 'The cable lift is a role in your account. Its permissions policy has everything the lift needs, and its trust policy names only the ranger\'s role. What do you change?',
      opts: ['Add your role as a Principal in the lift role\'s trust policy', 'Add sts:AssumeRole to the lift role\'s own permissions policy', 'Attach the lift role\'s permissions policy to your role', 'Call GetSessionToken first, then retry the AssumeRole'], a: 0,
      no: [null, 'The lift\'s permissions say what the lift can do once worn. Who may put it on is the trust policy\'s job.', 'That gives your own role the lift\'s powers instead of letting you assume it, the opposite of least privilege.', 'GetSessionToken returns temporary credentials for yourself. It doesn\'t change who a role trusts.'],
      why: 'The trust policy decides who may assume a role, and its permissions policies decide what the role can do. Here the trust policy doesn\'t name you, so AssumeRole is denied however much the role allows.' },
    // The lift operator
    { id: 't-op1', c: 'lambdaperm', type: 'mc', ev: 'AccessDeniedException: User: arn:aws:sts::111122223333:assumed-role/lift-motor-role/lift-motor is not authorized to perform: dynamodb:PutItem on resource: arn:aws:dynamodb:us-east-1:111122223333:table/lift-log',
      q: 'The lift motor is a Lambda function. Its code writes to the lift-log table and fails like this. Where does the missing permission go?',
      opts: ['An Allow for dynamodb:PutItem in its execution role', 'An Allow in the function\'s resource-based policy', 'An environment variable holding the ranger\'s access keys', 'A trust policy on the table naming the function'], a: 0,
      no: [null, 'That policy decides who may invoke the function, not what the function may call.', 'Keys in environment variables are long-term secrets in config, and the execution role already gives the code temporary credentials.', 'Trust policies belong to roles and say who may assume them. A table has none.'],
      why: 'The function runs with its execution role\'s temporary credentials, so what it may call (here dynamodb:PutItem on that table) belongs in the execution role\'s permissions.' },
    // The ranger's logbook
    { id: 't-log2', c: 'cloudtrail', type: 'mc', q: 'In a CloudTrail record of an AssumeRole call, which field tells you who made the call?',
      opts: ['userIdentity', 'eventSource', 'requestParameters', 'responseElements'], a: 0,
      no: [null, 'eventSource is the service that was called, such as sts.amazonaws.com.', 'requestParameters holds what was asked for, such as the role ARN and session name.', 'responseElements holds what came back, such as the new credentials\' expiry.'],
      why: 'userIdentity names the caller: its type, ARN, account and, for a role session, the role behind it.' },

    // AdministratorAccess: what would have been enough?
    { id: 'lp-get', c: 'iam', lp: true, type: 'mc', q: 'You used AdministratorAccess to read one object, trail-maps/summit.png. Which statement would have been enough?',
      opts: ['Allow s3:GetObject on arn:aws:s3:::trail-maps/summit.png', 'Allow s3:* on arn:aws:s3:::trail-maps/summit.png', 'Allow s3:GetObject on arn:aws:s3:::*', 'Allow s3:GetObject on the bucket, arn:aws:s3:::trail-maps'], a: 0,
      no: [null, 'The right resource, but every S3 action on it, deletes included.', 'The right action, but on every bucket and object in every account it can reach.', 'That is the bucket\'s ARN. GetObject acts on objects, bucket/key.'],
      why: 'Least privilege: the one action you used, on the one resource you used it on.' },
    { id: 'lp-put', c: 'iam', lp: true, type: 'mc', q: 'AdministratorAccess let your Lambda function write one item to the camp-roster table. What is the least privilege it needs?',
      opts: ['Allow dynamodb:PutItem on that table\'s ARN', 'Allow dynamodb:* on that table\'s ARN', 'Allow dynamodb:PutItem with Resource "*"', 'Attach AmazonDynamoDBFullAccess to the role'], a: 0,
      no: [null, 'Every DynamoDB action on the table, including deleting it.', 'PutItem on every table the account has.', 'An AWS managed policy for all of DynamoDB: convenient, and far wider than one write.'],
      why: 'One action, dynamodb:PutItem, on one table\'s ARN, in the function\'s execution role.' },
    { id: 'lp-assume', c: 'roles', lp: true, type: 'mc', q: 'Your code used AdministratorAccess only to assume the lift role. What is the narrowest Allow?',
      opts: ['sts:AssumeRole on the lift role\'s ARN', 'sts:AssumeRole with Resource "*"', 'iam:PassRole on the lift role\'s ARN', 'sts:GetSessionToken on the lift role\'s ARN'], a: 0,
      no: [null, 'The right action, but it would let you try every role whose trust policy names you.', 'PassRole lets you hand a role to a service, such as a Lambda function. It doesn\'t let you assume it.', 'GetSessionToken returns credentials for yourself and takes no role.'],
      why: 'Assuming a role is sts:AssumeRole, and the Resource is that role\'s ARN. The role\'s trust policy still has to name you.' },
    { id: 'lp-list', c: 's3arn', lp: true, type: 'mc', q: 'You used AdministratorAccess to list the keys in trail-locker. What is the narrowest Allow?',
      opts: ['s3:ListBucket on arn:aws:s3:::trail-locker', 's3:ListBucket on arn:aws:s3:::trail-locker/*', 's3:GetObject on arn:aws:s3:::trail-locker/*', 's3:ListAllMyBuckets with Resource "*"'], a: 0,
      no: [null, 'ListBucket acts on the bucket ARN, so an object ARN never matches it.', 'That reads objects. It doesn\'t list them.', 'That lists your buckets, not the keys inside one.'],
      why: 'Listing a bucket\'s keys is s3:ListBucket on the bucket ARN, without /*.' },
    { id: 'lp-trail', c: 'cloudtrail', lp: true, type: 'mc', q: 'AdministratorAccess let you search CloudTrail event history (LookupEvents). What is the narrowest Allow?',
      opts: ['cloudtrail:LookupEvents with Resource "*"', 'cloudtrail:* with Resource "*"', 'cloudtrail:GetTrail on the trail\'s ARN', 'logs:GetLogEvents on the trail\'s log group'], a: 0,
      no: [null, 'Every CloudTrail action, including deleting and stopping trails.', 'GetTrail describes one trail\'s settings. It doesn\'t search events.', 'That reads CloudWatch Logs, which a trail may also send to. Event history isn\'t there.'],
      why: 'LookupEvents doesn\'t support resource-level permissions, so its Resource is "*". Narrow the action instead.' },
    { id: 'lp-mfa', c: 'conditions', lp: true, type: 'mc', q: 'A role should delete trail-maps objects only when the session was signed in with MFA. Which statement does that?',
      opts: ['Allow s3:DeleteObject on trail-maps/* if aws:MultiFactorAuthPresent is true', 'Allow s3:DeleteObject on trail-maps/* if aws:SecureTransport is true', 'Allow s3:* on trail-maps/* if aws:MultiFactorAuthPresent is true', 'Deny s3:DeleteObject on trail-maps/* if aws:MultiFactorAuthPresent is true'], a: 0,
      no: [null, 'That checks for HTTPS, not MFA.', 'MFA is checked, but every S3 action is allowed, not only deletes.', 'That refuses exactly the sessions you wanted to allow.'],
      why: 'Allow only the action you need, with a Condition that is true only for sessions whose credentials were obtained with MFA.' },
    { id: 'lp-xacct', c: 'respolicy', lp: true, type: 'mc', q: 'AdministratorAccess in your account let you read a bucket in the Ranger account. What else made the read work?',
      opts: ['The Ranger bucket\'s policy allowing your role', 'Nothing else: Action "*" covers other accounts', 'Your role\'s trust policy naming the Ranger account', 'A Ranger SCP that allows your account\'s calls'], a: 0,
      no: [null, 'Your policies speak only for your account. The Ranger account has to allow you too.', 'A trust policy says who may assume your role. It doesn\'t open another account\'s bucket.', 'SCPs only cap what accounts in an organization can do. They never grant anything.'],
      why: 'Across accounts both sides must allow: your identity policy (here AdministratorAccess) and the bucket policy in the other account.' },
    { id: 'lp-param', c: 'lambdaperm', lp: true, type: 'mc', q: 'The lift function\'s execution role had AdministratorAccess, and the function only reads /lift/speed from Parameter Store. What is the narrowest Allow?',
      opts: ['ssm:GetParameter on that parameter\'s ARN', 'ssm:* on that parameter\'s ARN', 'ssm:GetParameter with Resource "*"', 'secretsmanager:GetSecretValue on its ARN'], a: 0,
      no: [null, 'Every Systems Manager action on it, including overwriting it.', 'The right action, on every parameter in the account.', 'That reads Secrets Manager secrets. Parameter Store is part of Systems Manager.'],
      why: 'Reading one parameter is ssm:GetParameter on arn:aws:ssm:region:account:parameter/lift/speed. A SecureString encrypted with a customer managed key also needs kms:Decrypt on that key.' }
  ];
  SD.questions.push(...Qs);
  // From the exam bank (js/bank-dva.js and the three bank files index.html loads after it), adopted for the trail's puzzles with a chapter 1 concept. js/ch1.js already
  // adopts dva-2-13 (the locker's ListBucket question).
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
    board: ['t-anat1', 't-anat2', 'dva-2-102'],
    locker: ['dva-2-13', 't-locker2'],
    toll: ['dva-2-105', 't-toll2', 'dva-2-04', 'dva-2-140'],
    ledge: ['t-ledge1', 'dva-2-136', 'dva-2-106', 'dva-2-104', 'dva-2-10'],
    lift: ['t-lift1', 'dva-2-108', 'dva-2-127', 'dva-2-16'],
    motor: ['t-op1', 'dva-2-112', 'dva-2-113', 'dva-2-134', 'dva-1-204'],
    logbook: ['dva-4-404', 't-log2', 'dva-4-12', 'dva-2-406']
  };
  (SD.bank || []).forEach(b => { if (adopt[b.id] && !SD.questions.some(q => q.id === b.id)) SD.questions.push(Object.assign({}, b, { c: adopt[b.id] })); });

  // ---------- Huh??? and ELI5 ----------
  Object.assign(SD.huh, {
    polanatomy: 'A policy is a permission slip written in JSON. Each statement is one sentence: Effect (yes or no), Action (what you may do, like s3:GetObject), Resource (what you may do it to, named by an ARN) and an optional Condition (the "only if"). A slip on a thing itself also says who it\'s for (the Principal). The whole sentence has to match the request, or that statement doesn\'t count. A * is a wildcard: it matches any run of letters.',
    s3arn: 'An S3 bucket is a treasure chest, and each object is an item inside it. They have different names: the chest is arn:aws:s3:::chest, an item is arn:aws:s3:::chest/item. Looking at the list of items (s3:ListBucket) is something you do to the chest. Taking an item out (s3:GetObject) is something you do to the item. A slip that only names the items lets you take things out blind, and asking for an item that isn\'t there gets "access denied" instead of "not found".',
    lambdaperm: 'A Lambda function is a hired adventurer with two pieces of paper. Its execution role is the costume it wears while it works: it decides what the function may touch (a table, a bucket, a parameter). Its resource-based policy is the sign on its door: it decides who may hire it (call lambda:InvokeFunction), such as another account or S3. Mixing them up is the classic mistake.'
  });
  Object.assign(SD.eli5, {
    't-anat1': 'The rule says: "You may take a map, but only through the guarded door." Sneaking in the side door (plain HTTP) means the rule just doesn\'t apply, and with no rule saying yes, the answer is no.',
    't-anat2': 'A star in a name is a blank anyone can fill in. "trail-maps/*" means "anything inside the trail-maps chest", however deep the folders go. It doesn\'t mean a different chest, and it doesn\'t let you do anything except what the slip says.',
    't-locker2': 'If you\'re not allowed to see the list, the chest won\'t even tell you whether the item exists. It just says "no", so nobody can go fishing for item names.',
    't-toll2': 'Inside your own kingdom, a sign on the shop saying "this adventurer may come in" is enough on its own, as long as nobody has written a flat "no".',
    't-ledge1': 'The sign says "nobody crosses without the guarded rope (HTTPS)". With the rope you\'re past the sign, but you still need someone to have said you may cross.',
    't-lift1': 'The lift is a costume with a guest list. Its powers are fine, but your name isn\'t on the list. Write your name on the guest list (the trust policy), not on the powers.',
    't-op1': 'The lift motor works while wearing its own costume (the execution role). It\'s the costume that needs permission to write in the log book.',
    't-log2': 'Every camera clip has a name tag saying who did it: userIdentity. The other fields say which shop they visited, what they asked for and what they got back.',
    'dva-2-105': 'Borrowing from a shop in another kingdom takes two yeses: the shop\'s sign has to name your helper, and your helper\'s own badge has to allow the trip. Neither one alone opens the door.',
    'dva-2-136': 'The guard stops badges that say "NO MFA". Old-style keys have no MFA line at all, so the guard never reads NO and waves them through. "IfExists" tells the guard to stop badges with no line too.',
    'dva-2-108': 'Every costume has a longest loan time written on its tag, one hour unless someone changes it (up to 12). Asking for four hours on a one-hour costume gets a flat "no" until the tag is changed.',
    'dva-2-112': 'Calling a helper in another kingdom takes two yeses: the sign on the helper\'s door (its resource policy) has to name you, and your own badge has to allow the call.',
    'dva-4-404': 'The castle camera only films changes to settings unless you tell it to film the chests too (data events on a trail). The chest\'s own visitor book (server access logs) also writes down who took what.',
    'dva-2-102': '"Everything except deleting" sounds small, but NotAction with Allow means every action in every shop in the kingdom except that one. Name the shop (s3:*) and say no to deleting separately.',
    'dva-2-140': 'Instead of listing every house on the street, the sign says "anyone whose address is on Workloads Road, or any lane off it". New houses on that road are covered without repainting the sign.',
    'dva-2-106': 'The MFA rule wants a badge stamped "showed the second password". Your old key has no stamp, so trade it in at the desk (GetSessionToken or AssumeRole) with your code, and you get a stamped badge for a while.',
    'dva-2-104': 'The bouncer only lets in people from the office\'s street address. The app comes in by the private tunnel, which has no street address at all, so the sign has to name the tunnel (the VPC endpoint) instead.',
    'dva-2-127': 'Tell the CLI once which costume to put on, with which badge, and where your MFA token is. After that it puts the costume on for you, asks for the code, and keeps it on until it expires.',
    'dva-2-113': 'The sign on the helper\'s door said "the chest called Treasure may ring". Chests can be thrown away and their names reused by someone else, so also write down whose house the chest must belong to.',
    'dva-2-134': 'Handing your helper a costume to wear (a role for a Lambda function) is its own permission, iam:PassRole. You need a slip that lets you hand over that one costume, to that kind of helper.',
    'dva-1-204': 'Give the helper its own front door (a function URL) and set the lock to "show your signed badge" (AWS_IAM). No gatehouse in front needed.',
    'dva-2-406': 'Three people wore the same costume, so the camera only sees the costume. Make each one write their own name on its collar (the role session name) when they put it on.',
    'lp-get': 'You borrowed the master key of the whole castle to open one drawer. A key to that one drawer would have done.',
    'lp-put': 'Your helper needed to write one line in one book. Give them a pen for that book, not the whole library.',
    'lp-assume': 'All you did was put on one costume. Permission to put on that one costume is enough.',
    'lp-list': 'You only read the list on the chest\'s lid. Permission to read that list is all you needed.',
    'lp-trail': 'You only flipped through the camera\'s history. That one action is enough; this kind of search can\'t be limited to one camera, so the "what" stays a star.',
    'lp-mfa': 'Let them throw things out of the chest, but only when they showed the second password at the door.',
    'lp-xacct': 'Your king said "go anywhere", but the other kingdom\'s shop still had to put your name on its door.',
    'lp-param': 'The helper only reads one note on the notice board. Give them that one note, not the whole board.'
  });
})();
