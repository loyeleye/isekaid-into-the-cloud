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
    { id: 't-locker1', c: 's3arn', type: 'mc', ev: 'aws s3 ls s3://trail-locker\nAn error occurred (AccessDenied) when calling the ListObjectsV2 operation: Access Denied',
      q: 'Your role allows s3:GetObject on arn:aws:s3:::trail-locker/*, but listing the locker fails. What is the smallest fix?',
      opts: ['Allow s3:ListBucket on arn:aws:s3:::trail-locker', 'Allow s3:ListBucket on arn:aws:s3:::trail-locker/*', 'Allow s3:* on arn:aws:s3:::trail-locker/*', 'Change the Resource to arn:aws:s3:::*'], a: 0,
      no: [null, 'ListBucket acts on the bucket, so a Resource ending in /* (the objects) never matches it.', 'Far wider than needed, and still only on the objects, so listing the bucket stays denied.', 'A wider Resource adds no action. Listing still needs s3:ListBucket, and now you can read every bucket.'],
      why: 'Listing is the s3:ListBucket action on the bucket ARN, with no /*. Reading is s3:GetObject on the object ARNs, bucket/*. A locker you can both list and open needs both.' },
    { id: 't-locker2', c: 's3arn', type: 'mc', q: 'Your role has s3:GetObject on trail-locker/* but no s3:ListBucket. You ask for trail-locker/rope.txt, which doesn\'t exist. What does S3 return?',
      opts: ['403 Access Denied, without saying if it exists', '404 Not Found, the same answer as with ListBucket', '400 Bad Request, because the key is invalid', '200 OK with an empty object body'], a: 0,
      no: [null, 'S3 answers 404 for a missing key only to a caller who has s3:ListBucket on the bucket.', '400 is for a malformed request. A key that doesn\'t exist is still a well-formed one.', 'S3 never makes up an empty object. A missing key is an error.'],
      why: 'Without s3:ListBucket, S3 won\'t tell you whether a key exists, so a missing key comes back 403 Access Denied. With ListBucket it comes back 404 Not Found.' },
    // The toll hut
    { id: 't-toll1', c: 'respolicy', type: 'mc', q: 'The toll hut is an S3 bucket in the Ranger account. Its bucket policy allows your role, in your own account, s3:GetObject. Your role\'s policies don\'t mention the bucket. What happens?',
      opts: ['Denied: across accounts your account must allow it too', 'Allowed: the bucket policy names your role directly', 'Allowed: resource policies override identity policies', 'Denied: a bucket policy can\'t name a role in another account'], a: 0,
      no: [null, 'That would be enough in one account. Across accounts, the caller\'s own policies must also allow the call.', 'Neither overrides the other. An explicit Deny in either wins, and across accounts both must allow.', 'It can. A bucket policy\'s Principal can be an account, a role or a user in another account.'],
      why: 'Across accounts, two accounts each have to say yes: the resource\'s policy must allow the caller, and the caller\'s own identity policies must allow the action on that resource.' },
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
    { id: 't-ledge2', c: 'conditions', type: 'mc', q: 'A policy allows s3:DeleteObject, and another statement denies it with "Bool": { "aws:MultiFactorAuthPresent": "false" }. A script signs its delete with an IAM user\'s long-term access keys. What happens?',
      opts: ['Allowed: the key is missing, so Bool doesn\'t match', 'Denied: a missing MFA key counts as false for Bool', 'Denied: long-term keys can never delete S3 objects', 'Allowed only if the user owns a virtual MFA device'], a: 0,
      no: [null, 'A condition on a key the request doesn\'t carry doesn\'t match, so the Deny is skipped. BoolIfExists would catch it.', 'Long-term keys can delete if a policy allows it. The trouble here is only the missing key.', 'Owning a device changes nothing. Only credentials obtained with an MFA code carry the key.'],
      why: 'Long-term access keys never carry aws:MultiFactorAuthPresent, and a Bool condition on a missing key doesn\'t match, so this Deny never applies. "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" } denies both cases.' },
    // The cable lift
    { id: 't-lift1', c: 'roles', type: 'mc', ev: 'An error occurred (AccessDenied) when calling the AssumeRole operation: User: arn:aws:sts::111122223333:assumed-role/hiker/kai is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::111122223333:role/cable-lift',
      q: 'The cable lift is a role in your account. Its permissions policy has everything the lift needs, and its trust policy names only the ranger\'s role. What do you change?',
      opts: ['Add your role as a Principal in the lift role\'s trust policy', 'Add sts:AssumeRole to the lift role\'s own permissions policy', 'Attach the lift role\'s permissions policy to your role', 'Call GetSessionToken first, then retry the AssumeRole'], a: 0,
      no: [null, 'The lift\'s permissions say what the lift can do once worn. Who may put it on is the trust policy\'s job.', 'That gives your own role the lift\'s powers instead of letting you assume it, the opposite of least privilege.', 'GetSessionToken returns temporary credentials for yourself. It doesn\'t change who a role trusts.'],
      why: 'The trust policy decides who may assume a role, and its permissions policies decide what the role can do. Here the trust policy doesn\'t name you, so AssumeRole is denied however much the role allows.' },
    { id: 't-lift2', c: 'roles', type: 'mc', q: 'You call AssumeRole on the lift role without DurationSeconds. When do the temporary credentials expire?',
      opts: ['One hour after the AssumeRole call', 'Fifteen minutes after the call', 'At the role\'s maximum session duration', 'When the role\'s permissions next change'], a: 0,
      no: [null, '15 minutes is the shortest you can ask for with DurationSeconds, not the default.', 'The maximum (1 to 12 hours) is the most you can ask for. You have to ask for it.', 'Changing the policies changes what the session may do. The credentials keep their expiry.'],
      why: 'AssumeRole credentials last 1 hour by default. DurationSeconds can ask for anything from 15 minutes up to the role\'s maximum session duration.' },
    // The lift operator
    { id: 't-op1', c: 'lambdaperm', type: 'mc', ev: 'AccessDeniedException: User: arn:aws:sts::111122223333:assumed-role/lift-motor-role/lift-motor is not authorized to perform: dynamodb:PutItem on resource: arn:aws:dynamodb:us-east-1:111122223333:table/lift-log',
      q: 'The lift motor is a Lambda function. Its code writes to the lift-log table and fails like this. Where does the missing permission go?',
      opts: ['An Allow for dynamodb:PutItem in its execution role', 'An Allow in the function\'s resource-based policy', 'An environment variable holding the ranger\'s access keys', 'A trust policy on the table naming the function'], a: 0,
      no: [null, 'That policy decides who may invoke the function, not what the function may call.', 'Keys in environment variables are long-term secrets in config, and the execution role already gives the code temporary credentials.', 'Trust policies belong to roles and say who may assume them. A table has none.'],
      why: 'The function runs with its execution role\'s temporary credentials, so what it may call (here dynamodb:PutItem on that table) belongs in the execution role\'s permissions.' },
    { id: 't-op2', c: 'lambdaperm', type: 'mc', q: 'The ranger\'s other account needs to invoke the lift function directly. On the function\'s side, what lets it?',
      opts: ['A resource-based policy statement allowing lambda:InvokeFunction', 'A statement in the function\'s execution role allowing invoke', 'A Lambda layer that holds the other account\'s ID', 'An environment variable that lists the account IDs allowed to call'], a: 0,
      no: [null, 'The execution role says what the function can call, not who may call the function.', 'A layer packages code and libraries for the function. It grants no permissions.', 'Lambda doesn\'t read environment variables when it decides who may invoke the function.'],
      why: 'Who may invoke a function lives in its resource-based policy (lambda:AddPermission adds a statement). Across accounts, the caller\'s own policies must also allow lambda:InvokeFunction.' },
    // The ranger's logbook
    { id: 't-log1', c: 'cloudtrail', type: 'mc', q: 'Someone deleted the rope from the rope-bridge bucket last night (a DeleteObject). The account has no trails, and CloudTrail event history shows nothing. Why?',
      opts: ['S3 object calls are data events, which need a trail', 'Event history only keeps the last 24 hours of events', 'DeleteObject is a management event, kept in S3 logs', 'CloudTrail records reads, but it never records deletes'], a: 0,
      no: [null, 'Event history keeps 90 days of management events.', 'DeleteObject on an object is a data event. S3 server access logs are a separate feature you turn on.', 'CloudTrail records writes and reads alike, for the event types it was asked to record.'],
      why: 'Calls on objects (GetObject, PutObject, DeleteObject) are data events. Event history shows only management events, so data events are recorded only by a trail or event data store set up to record them, from then on.' },
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

  // ---------- Huh??? and ELI5 ----------
  Object.assign(SD.huh, {
    polanatomy: 'A policy is a permission slip written in JSON. Each statement is one sentence: Effect (yes or no), Action (what you may do, like s3:GetObject), Resource (what you may do it to, named by an ARN) and an optional Condition (the "only if"). A slip on a thing itself also says who it\'s for (the Principal). The whole sentence has to match the request, or that statement doesn\'t count. A * is a wildcard: it matches any run of letters.',
    s3arn: 'An S3 bucket is a treasure chest, and each object is an item inside it. They have different names: the chest is arn:aws:s3:::chest, an item is arn:aws:s3:::chest/item. Looking at the list of items (s3:ListBucket) is something you do to the chest. Taking an item out (s3:GetObject) is something you do to the item. A slip that only names the items lets you take things out blind, and asking for an item that isn\'t there gets "access denied" instead of "not found".',
    lambdaperm: 'A Lambda function is a hired adventurer with two pieces of paper. Its execution role is the costume it wears while it works: it decides what the function may touch (a table, a bucket, a parameter). Its resource-based policy is the sign on its door: it decides who may hire it (call lambda:InvokeFunction), such as another account or S3. Mixing them up is the classic mistake.'
  });
  Object.assign(SD.eli5, {
    't-anat1': 'The rule says: "You may take a map, but only through the guarded door." Sneaking in the side door (plain HTTP) means the rule just doesn\'t apply, and with no rule saying yes, the answer is no.',
    't-anat2': 'A star in a name is a blank anyone can fill in. "trail-maps/*" means "anything inside the trail-maps chest", however deep the folders go. It doesn\'t mean a different chest, and it doesn\'t let you do anything except what the slip says.',
    't-locker1': 'You were allowed to take items out of the chest, but not to look at the list. Looking at the list is something you do to the chest itself, so the slip has to name the chest, not its contents.',
    't-locker2': 'If you\'re not allowed to see the list, the chest won\'t even tell you whether the item exists. It just says "no", so nobody can go fishing for item names.',
    't-toll1': 'Visiting another kingdom\'s shop takes two yeses: the shop has to let you in, and your own king has to let you go. The shop\'s sign said yes; your king never did.',
    't-toll2': 'Inside your own kingdom, a sign on the shop saying "this adventurer may come in" is enough on its own, as long as nobody has written a flat "no".',
    't-ledge1': 'The sign says "nobody crosses without the guarded rope (HTTPS)". With the rope you\'re past the sign, but you still need someone to have said you may cross.',
    't-ledge2': 'The rule says "stop anyone whose badge says NO MFA". An old-style key has no MFA line on it at all, so the guard never finds the word NO and waves it through. "IfExists" tells the guard to stop badges with no line too.',
    't-lift1': 'The lift is a costume with a guest list. Its powers are fine, but your name isn\'t on the list. Write your name on the guest list (the trust policy), not on the powers.',
    't-lift2': 'Borrowed costumes come back after an hour unless you ask for a different time when you put them on: as little as 15 minutes, or up to the costume\'s own limit.',
    't-op1': 'The lift motor works while wearing its own costume (the execution role). It\'s the costume that needs permission to write in the log book.',
    't-op2': 'The sign on the motor\'s door says who may push its button. The other account gets added to that sign.',
    't-log1': 'The security camera films changes to the castle\'s settings by default. Picking up or throwing away an item in a chest is a "data event", and the camera only films those if you set it up to, before it happens.',
    't-log2': 'Every camera clip has a name tag saying who did it: userIdentity. The other fields say which shop they visited, what they asked for and what they got back.',
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
