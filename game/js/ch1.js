// Chapter 1, "Freya's Brigade": the content. Who you are and what you may do (IAM): implicit deny, Allow and
// explicit Deny, roles and their trust policies, temporary credentials from STS and how long they last, revoking a
// role's sessions, resource policies across accounts, condition keys (MFA, HTTPS), and CloudTrail.
// The overworld, the scenes and the dungeon's hooks are in js/ch1-world.js; the vector art in js/ch1-art.js.
// AWS facts follow the current AWS documentation (the IAM, STS and CloudTrail user guides). Every explanation is
// written fresh; no practice-exam questions or course material are copied.
(function () {
  // The first game's example dungeon (js/content.js) moves out of chapter 1's way: its Lambda and SQS concepts
  // belong to Mira's chapter, and its incidents stop turning up as wrong answers in chapter 1's diagnoses.
  ['lambdaconc', 'sqs', 'dlq'].forEach(id => { SD.concepts[id].zone = 2; });
  ['throttle', 'coldstart', 'boomerang', 'poison', 'denywarden'].forEach(id => { SD.enemies[id].ch = 2; });

  // Freya writes the cheat sheet in this chapter, and every line of it is true.
  const PAGE = {
    iam: 'Everything starts denied. An Allow opens one door; a Deny closes it for good, whoever else says yes. xx F.',
    roles: 'A role is a mask: anyone its trust policy names can put it on, and STS hands back keys that expire. Lovely and tidy. xx F.',
    respolicy: 'Other people\'s things have their own rules. Across accounts, both sides have to say yes. xx F.',
    conditions: 'Conditions are the "only if" in a policy: only with MFA, only over HTTPS. Read them, they\'re short. xx F.',
    cloudtrail: 'CloudTrail writes down who did what, and when. Not everything. Only what you asked it to. xx F.'
  };
  SD.concepts.iam.page = PAGE.iam;
  Object.assign(SD.concepts, {
    roles: {
      name: 'Roles and Temporary Credentials', zone: 1,
      gist: 'A role has two policies: its trust policy says which principals may assume it, and its permissions policies say what it can do. AssumeRole returns temporary credentials (an access key ID, a secret access key and a session token) that expire: by default after 1 hour, and DurationSeconds can ask for 15 minutes up to the role\'s maximum session duration (1 to 12 hours). Role chaining is capped at 1 hour. Revoking a role\'s active sessions denies every session issued before that moment.',
      page: PAGE.roles
    },
    respolicy: {
      name: 'Resource Policies Across Accounts', zone: 1,
      gist: 'A resource-based policy sits on the resource (an S3 bucket policy, a role\'s trust policy) and names who may use it. Within one account an Allow in either the identity policy or the resource policy is usually enough. Across accounts both are needed: the caller\'s own account must allow the call, and the resource\'s account must allow that caller.',
      page: PAGE.respolicy
    },
    conditions: {
      name: 'Condition Keys: MFA and HTTPS', zone: 1,
      gist: 'A Condition block limits when a statement applies. aws:SecureTransport is false for a request sent without TLS, so a Deny when it is false refuses plain HTTP. aws:MultiFactorAuthPresent is true only for temporary credentials obtained with MFA (GetSessionToken or AssumeRole with an MFA code); requests signed with long-term access keys don\'t carry it at all.',
      page: PAGE.conditions
    },
    cloudtrail: {
      name: 'CloudTrail', zone: 1,
      gist: 'CloudTrail records API calls: who made them, when, from where and what came back. Event history keeps the last 90 days of management events (changes such as UpdateFunctionConfiguration or PutBucketPolicy) with no setup. Data events, such as reading an S3 object, are not recorded unless a trail or event data store turns them on.',
      page: PAGE.cloudtrail
    }
  });
  SD.links.push(
    { id: 'iam-roles', a: 'iam', b: 'roles', text: 'A role\'s permissions are evaluated like any other policy: implicit deny, then Allows, and any explicit Deny wins.' },
    { id: 'roles-respolicy', a: 'roles', b: 'respolicy', text: 'A role\'s trust policy is a resource-based policy: it sits on the role and names who may assume it.' },
    { id: 'iam-conditions', a: 'iam', b: 'conditions', text: 'A Deny with a condition (no MFA, no TLS) overrides every Allow whenever the condition matches.' },
    { id: 'roles-cloudtrail', a: 'roles', b: 'cloudtrail', text: 'Every AssumeRole call is a CloudTrail management event, so you can see who put on which mask.' },
    { id: 'respolicy-iam', a: 'respolicy', b: 'iam', text: 'Across accounts, an implicit deny on either side is enough to refuse the call.' }
  );

  // ---------- Cards ----------
  Object.assign(SD.cards, {
    allowstmt:   { name: 'Allow Statement', cost: 1, kind: 'action', pow: 6, tags: ['allow'], text: 'Add an Allow for exactly this action on exactly this resource. It lifts the implicit deny, and nothing else.', art: 'open', rarity: 'basic', concept: 'iam', ch: 1 },
    assumerole:  { name: 'AssumeRole', cost: 1, kind: 'action', pow: 7, tags: ['assume'], text: 'Put on the mask: STS returns temporary credentials (a key ID, a secret key and a session token) that expire.', art: 'key', rarity: 'basic', concept: 'roles', ch: 1 },
    trustpol:    { name: 'Fix the Trust Policy', cost: 1, kind: 'action', pow: 7, tags: ['trust'], text: 'Name the caller as a Principal in the role\'s trust policy, which decides who may assume the role.', art: 'note', rarity: 'common', concept: 'roles', ch: 1 },
    respol:      { name: 'Resource Policy', cost: 1, kind: 'action', pow: 7, tags: ['resource'], text: 'Grant access on the resource itself, naming a principal from another account. Across accounts both sides must allow.', art: 'gate', rarity: 'common', concept: 'respolicy', ch: 1 },
    sessionlen:  { name: 'Set the Session Length', cost: 1, kind: 'infra', pow: 5, tags: ['expiry'], each: { any: 2 }, text: 'Infra. Each turn absorb 2 load. Ask for a DurationSeconds that covers the job, up to the role\'s maximum session duration.', art: 'clock', rarity: 'common', concept: 'roles', ch: 1 },
    mfasession:  { name: 'MFA Session', cost: 1, kind: 'action', pow: 7, tags: ['mfa'], text: 'Get temporary credentials with an MFA code, so aws:MultiFactorAuthPresent is true on every request they sign.', art: 'lock', rarity: 'common', concept: 'conditions', ch: 1 },
    httpsonly:   { name: 'HTTPS Only', cost: 1, kind: 'action', abs: { any: 5 }, pow: 4, tags: ['tls'], text: 'Absorb {any} load. Send every request over TLS, so aws:SecureTransport is true.', art: 'globe', rarity: 'common', concept: 'conditions', ch: 1 },
    decodemsg:   { name: 'Decode the Message', cost: 1, kind: 'action', reveal: true, draw: 1, text: 'Reveal this incident\'s weaknesses and draw 1. sts:DecodeAuthorizationMessage says why a request was denied.', art: 'eye', rarity: 'common', concept: 'iam', ch: 1 },
    readtrail:   { name: 'Read the Trail', cost: 1, kind: 'action', mit: 4, reveal: true, text: 'Mitigate {mit} and reveal every weakness. CloudTrail says who called what, and when.', art: 'trace', rarity: 'uncommon', concept: 'cloudtrail', ch: 1 },
    reassume:    { name: 'Fresh Session', cost: 1, kind: 'action', pow: 8, tags: ['fresh'], text: 'AssumeRole again. A revoke only denies sessions issued before it, so new credentials work.', art: 'undo', rarity: 'uncommon', concept: 'roles', ch: 1 },
    // Freya's gift on the first morning, and the fine print nobody reads.
    blessing:    { name: 'Freya\'s Blessing', cost: 0, kind: 'action', mit: 5, gain: 1, exhaust: true, tags: ['allow'], text: 'Allow * on *. Mitigate {mit} and gain 1 Capacity. Exhaust. The fine print says Principal: Freya.', art: 'bolt', rarity: 'rare', concept: 'iam', ch: 1, quest: true },
    // Each lead's own card, added to the deck you start with (js/ch1-world.js).
    bedside:     { name: 'Bedside Manner', cost: 1, kind: 'action', abs: { any: 7 }, mit: 3, text: 'Absorb {any} load and mitigate {mit}. "Hold still. I\'ve had my hand in worse than you."', art: 'pulse', rarity: 'rare', ch: 1, quest: true },
    unmaking:    { name: 'Unmaking', cost: 1, kind: 'action', pow: 10, tags: ['unmake'], selfDmg: 2, text: 'Kai\'s hand undoes a blessing: it hits hard where one props the incident up. He feels it: lose 2 SLA.', art: 'eraser', rarity: 'rare', ch: 1, quest: true },
    peakstyle:   { name: 'Burning Peak Style', cost: 2, kind: 'action', mit: 14, text: 'Mitigate {mit}. Every master in the Alliance can name it on sight.', art: 'bolt2', rarity: 'rare', ch: 1, quest: true },
    masterkey:   { name: 'Master Key', cost: 1, kind: 'action', reveal: true, draw: 2, text: 'Reveal the incident\'s weaknesses and draw 2. Every room in the Arcanum, on one ring.', art: 'key', rarity: 'rare', ch: 1, quest: true },
    // The last night: what the four do to Kyu.
    deletestmt:  { name: 'Delete the Statement', cost: 0, kind: 'action', mit: 999, exhaust: true, text: 'Freya\'s gift. Remove the Deny from the policy. It can\'t be put back.', art: 'aistop', rarity: 'rare', ch: 1, quest: true }
  });
  SD.cards.finddeny.ch = 1; SD.cards.leastpriv.ch = 1;
  // The deck chapter 1 starts from, before your lead's own card goes in.
  SD.starterDeck = ['hotfix', 'hotfix', 'hotfix', 'hotfix', 'allowstmt', 'allowstmt', 'assumerole', 'assumerole', 'decodemsg'];
  SD.cardUnlocks = { 1: ['trustpol', 'respol', 'sessionlen', 'mfasession', 'httpsonly', 'leastpriv', 'reassume'], 2: ['finddeny', 'readtrail'] };
  // The example's cards stay out of chapter 1's rewards.
  ['bigmem', 'sqsbuffer', 'reserved', 'provisioned', 'vistimeout', 'idem', 'dlq'].forEach(id => { SD.cards[id].ch = 2; });

  // ---------- Incidents ----------
  // Vector foes for the two that have no generated art (js/ch1-art.js draws them), and Uptima and Kyu from the first
  // game's PixelLab art.
  Object.assign(SD.enemies, {
    lockeddoor: {
      name: 'The Locked Cart', cause: 'Nothing allows the action yet, so it is implicitly denied', sev: 22, concept: 'iam', tier: 0, sprite: 'c1door', tutorial: true, ch: 1,
      flavor: 'Your kit is in there. So is breakfast.',
      symptom: 'Every call you make returns AccessDenied. Nothing anywhere allows you anything yet.',
      weak: { allow: 'Everything starts implicitly denied. An Allow for the action is what opens it.' },
      resist: {},
      pattern: [{ t: 'read', n: 3 }, { t: 'read', n: 4 }, { t: 'write', n: 4 }]
    },
    faithful: {
      name: 'Uptima\'s Faithful', cause: 'The other account\'s bucket policy doesn\'t allow your role', sev: 40, concept: 'respolicy', tier: 1, sprite: 'c1faithful', ch: 1,
      flavor: 'Brookfall still prays to her. They don\'t like the look of you.',
      symptom: 'Your role in Freya\'s account has an identity policy that allows s3:GetObject on the shrine\'s prayer bucket. The bucket belongs to Uptima\'s account, and its bucket policy names nobody from outside. AccessDenied.',
      weak: {
        resource: 'Across accounts both sides must allow: the bucket policy has to grant your role too, not just your own identity policy.',
        assume: 'Assume a role in Uptima\'s account whose trust policy names you. Then you are a principal of that account, and its own policies decide.',
        unmake: 'Kai strips the blessing off the shrine\'s door. He feels every prayer in it.'
      },
      resist: { allow: 'Your own identity policy already allows it. Cross-account, the bucket owner has to allow the call as well.' },
      pattern: [{ t: 'read', n: 8 }, { t: 'write', n: 9 }, { t: 'escalate' }, { t: 'read', n: 11 }]
    },
    wrongmask: {
      name: 'The Wrong Mask', cause: 'The role\'s trust policy doesn\'t name you as a principal', sev: 38, concept: 'roles', tier: 1, sprite: 'c1mask', ch: 1,
      flavor: 'It fits perfectly. It just isn\'t yours.',
      symptom: 'sts:AssumeRole fails with AccessDenied. The role allows everything you need, but its trust policy names only the temple\'s acolytes.',
      weak: {
        trust: 'The trust policy decides who may assume a role. Naming the caller as a Principal is what lets them in.',
        resource: 'A trust policy is the role\'s resource-based policy, and across accounts it has to name the caller.'
      },
      resist: {
        assume: 'Calling AssumeRole again gets the same AccessDenied: the trust policy hasn\'t changed.',
        allow: 'More permissions on the role don\'t help when you can\'t put the role on.'
      },
      pattern: [{ t: 'read', n: 9 }, { t: 'burst', n: 10 }, { t: 'read', n: 11 }, { t: 'escalate' }]
    },
    warden: {
      name: 'The Session Warden', cause: 'The session got the default one-hour duration', sev: 40, concept: 'roles', tier: 1, sprite: 'c1warden', ch: 1,
      flavor: 'It counts every second you\'ve been wearing that mask.',
      symptom: 'A three-hour job that assumed a role fails after one hour with ExpiredToken. It asked STS for no particular duration, so the session got the default.',
      weak: {
        expiry: 'Ask for a DurationSeconds that covers the job (here 10,800 seconds), up to the role\'s maximum session duration.',
        fresh: 'Assume the role again before the old credentials expire, and the job carries on with new ones.'
      },
      resist: { allow: 'ExpiredToken isn\'t a permissions problem. No Allow brings an expired session back.' },
      pattern: [{ t: 'write', n: 9 }, { t: 'read', n: 10 }, { t: 'escalate' }, { t: 'write', n: 12 }]
    },
    sentinel: {
      name: 'The Two-Factor Sentinel', cause: 'Deny statements require MFA and HTTPS, and the requests have neither', sev: 56, concept: 'conditions', tier: 2, sprite: 'c1sentinel', ch: 1,
      flavor: 'It asks for two things, and you brought one.',
      symptom: 'The vault policy denies every request unless aws:MultiFactorAuthPresent is true, and denies any request sent without TLS. The scripts sign with long-term access keys over plain HTTP.',
      weak: {
        mfa: 'Temporary credentials obtained with an MFA code carry aws:MultiFactorAuthPresent = true, so the first Deny stops matching.',
        tls: 'Over HTTPS, aws:SecureTransport is true and the second Deny no longer applies.'
      },
      resist: { allow: 'Both are explicit Denies with conditions. Adding Allows changes nothing while the conditions match.' },
      pattern: [{ t: 'read', n: 11 }, { t: 'write', n: 12 }, { t: 'burst', n: 12 }, { t: 'escalate' }, { t: 'read', n: 14 }]
    },
    uptimaboss: {
      name: 'Uptima, Goddess of the Cloud', cause: 'Revoking a role\'s sessions denies credentials issued before the revoke', short: 'Uptima', sev: 90, concept: 'roles', tier: 9, boss: true, sprite: 'uptimaboss', ch: 1,
      flavor: 'She reads the logs first. She is very proud of that.',
      symptom: 'Every time she sees your borrowed mask, she revokes its active sessions, and every request signed with the old credentials fails.',
      weak: {
        fresh: 'A revoke denies sessions issued before it. Credentials from a new AssumeRole aren\'t covered.',
        trust: 'Her temple\'s trust policy names the brigade. While it does, she can revoke sessions but not stop new ones.'
      },
      resist: { allow: 'Her revoke is an explicit Deny on old sessions. More Allows lose to it.', unmake: 'Uptima has no blessings left on her. She gave them all away years ago, mostly to herself.' },
      pattern: [{ t: 'read', n: 10 }, { t: 'revoke', n: 10 }, { t: 'write', n: 12 }, { t: 'escalate' }, { t: 'revoke', n: 14 }, { t: 'read', n: 15 }]
    },
    kyu: {
      name: 'Kyu, the Explicit Deny', cause: 'An explicit Deny overrides every Allow', short: 'Kyu', sev: 60, concept: 'iam', tier: 9, boss: true, sprite: 'kyuboss', ch: 1,
      flavor: 'She has said no to everything for ten thousand years. This is the one she means.',
      symptom: 'One statement in the temple\'s policy denies Freya\'s brigade every action on the vault, and an explicit Deny beats every Allow.',
      weak: { deny: 'An explicit Deny can only be found and removed. Nothing you add gets past it.', unmake: 'Kai\'s hand strips her blessings so the statement can be reached.' },
      resist: { allow: 'An explicit Deny overrides every Allow, Freya\'s included.' },
      pattern: [{ t: 'no' }, { t: 'no' }, { t: 'no' }]
    }
  });
  SD.intentText.revoke = i => `Revokes active sessions: ${i.n} unless your session is fresh`;
  SD.intentText.no = () => '"No."';

  SD.enemyPools[1] = ['wrongmask', 'warden'];
  SD.enemyPools.elite = ['sentinel'];
  SD.chapters[1] = {
    name: 'the Temple of Uptime', rank: 'E', boss: 'uptimaboss', pools: { 1: ['wrongmask', 'warden'], 2: ['wrongmask', 'warden'], 3: ['warden'], elite: ['sentinel'] },
    gate: 'ENTERING THE TEMPLE OF UPTIME...', blurb: 'Uptima\'s temple, and the keys to everyone\'s backups.',
    hooks: {}   // filled in by js/ch1-world.js
  };

  // ---------- Boss steps: incident response (js/run.js R.incident) ----------
  // In the sanctum, Freya talks you through it, and she's right every time. The evidence is what the brigade's job
  // would really see: the S3 error and the CloudTrail event for Uptima's revoke.
  SD.bossDesign.uptimaboss = {
    concepts: ['roles', 'respolicy'],
    diagnose: {
      c: 'roles', type: 'mc',
      ev: 'brigade-job, 02:15:31Z  GetObject uptima-vault/keys/backups.key\n' +
        'AccessDenied: User: arn:aws:sts::111122223333:assumed-role/TempleMask/brigade-job is not authorized to perform: ' +
        's3:GetObject on resource: "arn:aws:s3:::uptima-vault/keys/backups.key" with an explicit deny in an identity-based policy\n\n' +
        'CloudTrail, 02:14:07Z\n  eventSource: iam.amazonaws.com\n  eventName: PutRolePolicy\n' +
        '  requestParameters: { roleName: TempleMask, policyName: AWSRevokeOlderSessions }\n\n' +
        'The job assumed TempleMask at 01:40:12Z.',
      q: 'Freya, in your ear: "Here\'s the job\'s last call, and what she did a minute before it. What\'s actually wrong?"',
      opts: ['Her revoke denies every session from before 02:14, ours too', 'The session hit its one-hour default duration and expired', 'Her trust policy has stopped naming the brigade\'s role', 'The mask\'s own policy never allowed s3:GetObject on the vault'], a: 0,
      no: [null,
        'An expired session fails with ExpiredToken, not an explicit deny. And it was issued at 01:40, so an hour hadn\'t passed.',
        'The trust policy is only checked when you call AssumeRole, and this call was signed with a session you already had. Her event changed a permissions policy; a trust policy change would be UpdateAssumeRolePolicy.',
        'A missing Allow reads "because no identity-based policy allows". This one says explicit deny, and the job read the vault fine until 02:14.'],
      why: 'Revoke active sessions attaches an inline policy, AWSRevokeOlderSessions, with PutRolePolicy. It denies every action when aws:TokenIssueTime is earlier than the revoke (plus about 30 seconds, while the change spreads). The job\'s session dates from 01:40, so everything it signs is denied.'
    },
    fix: {
      c: 'roles', type: 'mc',
      q: 'Freya: "Right. What\'s the smallest change that gets the job reading again?"',
      opts: ['Call sts:AssumeRole again and sign with the new session', 'Retry the denied calls with exponential backoff and jitter', 'Add an Allow for s3:GetObject to the brigade\'s own role', 'Delete AWSRevokeOlderSessions from the TempleMask role'], a: 0,
      no: [null,
        'Backoff is for throttling. Every retry is signed by the same denied session, so every retry is denied.',
        'The call is made as her TempleMask role, not as the brigade\'s role, and an explicit Deny beats any Allow anyway.',
        'That takes iam:DeleteRolePolicy on her role, which the mask doesn\'t have. You don\'t need to undo her revoke, only to be newer than it.'],
      why: 'The Deny only matches sessions issued before the revoke. A new AssumeRole, made more than about 30 seconds after it, returns credentials with a later aws:TokenIssueTime, so the Deny stops matching. Her trust policy still names the brigade, so the call works. Clear any cached credentials first: the AWS CLI keeps them until they expire.'
    },
    prevent: {
      c: 'roles', type: 'mc',
      q: 'Freya: "She\'ll do it again, you know. What tells us the moment she does?"',
      opts: ['A metric filter on the job\'s logs for AccessDenied, with an alarm', 'An EventBridge rule in our account for her PutRolePolicy calls', 'An AWS Config rule in our account that watches her TempleMask role', 'A DurationSeconds of 43,200, so our session outlasts her revoke'], a: 0,
      no: [null,
        'Her IAM calls are recorded in her account, and their events go to her default event bus, not ours.',
        'AWS Config records resources in the account and Region it runs in. Her role isn\'t one of ours.',
        'A revoke denies every older session at once, however long it was meant to last. And a chained role session can\'t ask for more than an hour.'],
      why: 'From our side, the job\'s own logs are what we can see. A CloudWatch Logs metric filter counts the explicit-deny lines, and an alarm on that metric tells us within minutes, so the job puts on a fresh mask straight away.'
    },
    startCard: 'reassume',
    go: 'Now get past her. When she revokes your session, put on a fresh one.'
  };
  // Her Exam Twists (js/run.js examTwist): the same revoke with one thing changed.
  SD.twists.uptimaboss = [
    { c: 'roles', change: 'The job still has 3 hours of work, and TempleMask\'s maximum session duration is 4 hours. You assume it from the brigade\'s role session: that\'s role chaining.',
      q: 'Which part of your fix still holds?',
      opts: ['The fresh AssumeRole holds, but each session lasts an hour at most', 'Ask for a DurationSeconds of 10,800, since her role allows 4 hours', 'None of it: a chained session can\'t get past a revoke', 'Ask her to raise the role\'s maximum session duration to 12 hours'], a: 0,
      no: [null,
        'Role chaining caps a session at one hour. STS fails the call if DurationSeconds is over 3,600.',
        'The revoke checks when a session was issued, not how it was made. A new chained session is newer, so it works.',
        'The role\'s maximum doesn\'t apply to chained sessions. They\'re capped at one hour whatever it says.'],
      why: 'A new session still gets past the revoke. Role chaining only limits how long it lasts: one hour, so the job assumes the mask again every hour, and again whenever she revokes.' },
    { c: 'roles', change: 'She revokes the sessions, and she also takes the brigade\'s role out of TempleMask\'s trust policy.',
      q: 'Which part of your answer still holds?',
      opts: ['The diagnosis holds, but a fresh AssumeRole now fails too', 'All of it: a fresh AssumeRole still gets past the revoke', 'The trust change lifts the revoke, so the old session works', 'Only console sign-ins fail; AssumeRole from the CLI still works'], a: 0,
      no: [null,
        'AssumeRole checks the trust policy. If it no longer names you, the call is denied before any session exists.',
        'They\'re separate. The revoke still denies every older session, and the trust policy now stops new ones.',
        'The trust policy applies to every AssumeRole call, whether it comes from the console, the CLI or an SDK.'],
      why: 'Revoking stops old sessions; the trust policy decides who can start a new one. With both changed, the brigade is locked out. That pair is the real lockout after a leak: revoke the sessions, then fix who can assume the role.' },
    { c: 'respolicy', change: 'Our own account takes away the brigade\'s Allow for sts:AssumeRole on TempleMask. Her trust policy still names the brigade.',
      q: 'Which part of your answer still holds?',
      opts: ['The diagnosis holds; the fresh AssumeRole fails on our side now', 'All of it: her trust policy alone is enough to assume the role', 'None of it: without that Allow, her revoke can\'t be diagnosed', 'The old session works again, since our own policy changed'], a: 0,
      no: [null,
        'Across accounts both sides must allow it: her trust policy names us, and our own policy must allow sts:AssumeRole on the role.',
        'The error and her PutRolePolicy event still say what happened. Our Allow only matters for the next AssumeRole.',
        'The revoke is on her role and still denies the old session. Nothing in our account can lift her Deny.'],
      why: 'Assuming a role in another account takes both sides: the role\'s trust policy names the caller, and the caller\'s own account allows sts:AssumeRole on the role\'s ARN. Take either away and the fresh session never comes.' }
  ];

  // ---------- Questions ----------
  // The example's IAM questions stay; these join them. Six are adopted from the exam bank (js/bank-dva.js).
  SD.questions.push(
    { id: 'q-ro1', c: 'roles', type: 'mc', q: 'An app calls sts:AssumeRole and it succeeds. What does it get back?',
      opts: ['An access key ID, a secret access key and a session token that expire', 'A new IAM user whose access keys last until someone deletes them', 'A signed URL the app can open once to reach the role\'s resources', 'The role\'s permissions policy, which the app sends with each request'], a: 0,
      no: [null, 'Roles never create users or long-term keys. That\'s the point of them.', 'Presigned URLs are an S3 feature for sharing one object, not what STS returns.', 'Policies stay in IAM. The app signs requests with credentials, and IAM looks the policies up.'],
      why: 'STS returns temporary security credentials: an access key ID, a secret access key, a session token and an expiration time. Requests signed with them act as the role until they expire.' },
    { id: 'q-ro2', c: 'roles', type: 'mc', q: 'A batch job assumes a role without setting DurationSeconds and fails with ExpiredToken after an hour. The role\'s maximum session duration is 4 hours. What should the job do?',
      opts: ['Pass a DurationSeconds that covers the run, up to 14,400 seconds', 'Set DurationSeconds to 43,200, the largest value STS accepts for any role', 'Attach AdministratorAccess so the session is allowed to run longer', 'Switch to an IAM user\'s access keys, which never expire on their own'], a: 0,
      no: [null, 'STS refuses a duration above the role\'s own maximum, here 4 hours.', 'Permissions have nothing to do with how long credentials last.', 'Long-term keys trade an expiry problem for a security one. Roles exist to avoid them.'],
      why: 'Without DurationSeconds a session lasts 1 hour. The job can ask for 900 seconds up to the role\'s maximum session duration, which an administrator sets between 1 and 12 hours.' },
    { id: 'q-ro3', c: 'roles', type: 'mc', q: 'A role has a permissions policy that allows s3:GetObject on a bucket, and a trust policy that names the Lambda service. What does the trust policy decide?',
      opts: ['Who may assume the role: here, Lambda functions', 'Which S3 objects the role may read once assumed', 'How long the role\'s sessions last before expiring', 'Which Regions the role\'s permissions apply in'], a: 0,
      no: [null, 'That\'s the permissions policy\'s job. The trust policy only names who can put the role on.', 'Session length comes from DurationSeconds and the role\'s maximum session duration.', 'Neither policy here mentions Regions, and the trust policy never limits what the role can do.'],
      why: 'Every role has a trust policy (who may assume it) and permissions policies (what it can do once assumed). A function\'s execution role trusts lambda.amazonaws.com.' },
    { id: 'q-ro4', c: 'roles', type: 'mc', q: 'A role\'s temporary credentials leaked an hour ago. An administrator chooses Revoke active sessions on the role. What happens next?',
      opts: ['Sessions issued before the revoke are denied; new ones still work', 'The role is deleted along with every session it ever issued', 'Every session is denied until the administrator removes the revoke', 'Only the session that leaked is denied, matched by its key ID'], a: 0,
      no: [null, 'Nothing is deleted. IAM attaches an inline policy that denies older sessions.', 'Sessions issued after the revoke time aren\'t covered by its Deny.', 'It can\'t pick out one session: it denies every session issued before the revoke time.'],
      why: 'Revoking attaches AWSRevokeOlderSessions, a Deny for sessions whose aws:TokenIssueTime is earlier than the revoke. Whoever leaked the keys can still get new ones if they can still assume the role, so fix how they got in too.' },
    { id: 'q-rp1', c: 'respolicy', type: 'mc', q: 'An S3 bucket in account B has a bucket policy that allows a role in account A to read it. The role\'s own policy in account A allows nothing. What happens when the role reads an object?',
      opts: ['Denied: across accounts the role\'s own account must allow it too', 'Allowed: the bucket owner\'s policy is the only one that counts', 'Allowed: resource policies override identity policies', 'Denied: bucket policies can\'t name roles from other accounts'], a: 0,
      no: [null, 'Both accounts are checked. Account A hasn\'t allowed the call, so it\'s implicitly denied there.', 'Neither kind of policy overrides the other. Across accounts, both must allow.', 'They can: naming a principal from another account is exactly what bucket policies are for.'],
      why: 'Within one account an Allow in either policy is usually enough. Across accounts, the caller\'s identity policy and the resource\'s policy must both allow the request.' },
    { id: 'q-cn1', c: 'conditions', type: 'mc', q: 'A policy denies every action when aws:MultiFactorAuthPresent is false (using BoolIfExists). A user signed in with MFA runs a script that signs requests with the user\'s long-term access keys. What happens?',
      opts: ['Denied: requests signed with long-term keys never carry MFA', 'Allowed: the user signed in with MFA earlier today', 'Allowed: the condition only applies in the AWS console', 'Denied only for requests sent outside the user\'s home Region'], a: 0,
      no: [null, 'MFA is a property of the credentials that sign the request, not of the person.', 'The condition applies to API calls too, which is where it matters most.', 'IAM users have no home Region, and the condition doesn\'t look at Regions.'],
      why: 'aws:MultiFactorAuthPresent is present only for temporary credentials obtained with MFA. With BoolIfExists, a missing key counts as no MFA, so the script must first get MFA session credentials (GetSessionToken with an MFA code).' },
    { id: 'q-ct1', c: 'cloudtrail', type: 'mc', q: 'Someone read a confidential object in an S3 bucket last week. The account has no trail, only CloudTrail\'s default event history. What can the team find?',
      opts: ['Nothing: object reads are data events, which event history doesn\'t keep', 'The GetObject call, with the caller and the time, in event history', 'The read, but only if the bucket policy was changed afterwards', 'Everything, but only after asking AWS Support to restore the logs'], a: 0,
      no: [null, 'Event history holds management events only. GetObject is a data event.', 'Changing the bucket policy is its own management event. It doesn\'t bring back reads that weren\'t recorded.', 'Events that were never recorded can\'t be restored by anyone.'],
      why: 'Event history keeps 90 days of management events with no setup. Data events, such as S3 object reads, are recorded only by a trail or event data store configured for them, and only from then on.' },
    { id: 'q-mask', c: 'roles', type: 'mc', q: 'Four masks hang at the temple gate, each a role. The gate is a Lambda function in the temple\'s account, and it opens for lambda:InvokeFunction. Which one can Freya\'s brigade put on and open the gate with?',
      opts: ['Trust names the brigade\'s role; its policy allows lambda:InvokeFunction', 'Trust names the temple\'s acolytes; its policy allows lambda:*', 'Trust names the brigade\'s role; it has no permissions policy', 'Trust names the brigade\'s role; its policy denies lambda:Invoke*'], a: 0,
      no: [null, 'You can\'t put it on: its trust policy doesn\'t name you, however much it allows.', 'You can put it on, but it allows nothing, so the gate stays implicitly denied.', 'You can put it on, and its own Deny refuses the gate.'],
      why: 'The trust policy decides who may assume a role, and its permissions decide what the role can then do. You need both: a trust policy that names you and an Allow for the action, with no Deny.' }
  );
  // Adopted from the exam bank: the same questions, with a chapter 1 concept.
  const adopt = { 'dva-2-04': 'respolicy', 'dva-2-05': 'iam', 'dva-2-10': 'conditions', 'dva-2-13': 'iam', 'dva-2-16': 'roles', 'dva-4-12': 'cloudtrail' };
  SD.adopted = adopt;
  (SD.bank || []).forEach(b => { if (adopt[b.id]) SD.questions.push(Object.assign({}, b, { c: adopt[b.id] })); });

  // ---------- Events ----------
  SD.events.forEach(ev => { if (ev.ch === 1) ev.ch = 2; });
  SD.events.push({
    id: 'c1-logroom', ch: 1, title: 'The Log Room', concept: 'cloudtrail',
    text: 'Shelves of scrolls, every one a CloudTrail record. Dutch: "Somebody read the vault ledger last night. Find me who." The event history shows who changed the vault\'s policy last month, and nothing at all about anyone reading the ledger.',
    choices: [
      { label: 'Nobody recorded it: reading an object is a data event, and they\'re off unless a trail turns them on', good: true, out: 'Dutch, quietly: "The wards logged who changed the rooms. Not who read the pages in them." He writes it down.', effect: { card: 'readtrail', xp: 15 } },
      { label: 'Search event history again: it keeps every API call for 90 days', good: false, out: 'Event history keeps 90 days of management events. Reading an object is a data event, and it never had them.', effect: { sla: -6 } },
      { label: 'Read the ledger\'s CloudWatch metrics for the night', good: false, out: 'Metrics say how many requests came in, not who made them.', effect: {} }
    ]
  });

  // ---------- Cast ----------
  Object.assign(SD.cast, {
    mira: { name: 'Mira', title: 'Healer', hue: 95, hair: 'ponytail', eye: '#e0a030' },
    kai: { name: 'Kai', title: 'Line Cook', hue: 40, hair: 'spiky', eye: '#5a3b2e' },
    seoyeon: { name: 'Seo-yeon', title: 'Burning Peak', hue: 350, hair: 'witch', eye: '#c03030' },
    dutch: { name: 'Dutch', title: 'Night Janitor', hue: 220, hair: 'none', eye: '#5a3b2e' },
    freya: { name: 'Freya', title: 'Goddess of the Free Tier', hue: 130, hair: 'goddess', eye: '#36d86b' },
    kyu: { name: 'Kyu', title: 'Uptima\'s Apprentice', hue: 270, hair: 'witch', eye: '#8a6cff' },
    faithful: { name: 'Elder Wren', title: 'Brookfall Shrine', hue: 200, hair: 'bun', eye: '#5a4bd6' }
  });
  SD.cast.dutch.hair = 'slick';
  // The ones they lost, who only appear in the prologues (and in Freya's borrowed voices).
  Object.assign(SD.cast, {
    bram: { name: 'Bram', title: 'Mira\'s husband' },
    hana: { name: 'Hana', title: 'Saint of Halcyon' },
    jin: { name: 'Jin', title: 'Burning Peak' },
    lina: { name: 'Lina', title: 'Dutch\'s daughter' }
  });
  [['bram', 300], ['hana', 1100], ['jin', 620], ['lina', 1200]].forEach(([w, hz]) => SD.ui.voice(w, hz));

  // ---------- The prologues' visual-novel art (js/vn.js) ----------
  // The painted stills from the backstory storyboard, one per shot. The c stills repeat the shot before them with
  // Freya standing where the borrowed face stood, for the glitch cut.
  const STILL = {
    m1: 'The top of the tower stair, night', m2: 'Mira holding Bram on the steps', m2b: 'Her hand on his chest, the light going out',
    m2c: 'Mira praying over him', m3: 'Her cottage kitchen, the new moon', m3a: 'Bram in the doorway', m3c: 'Freya in the doorway',
    k1: 'The cathedral square, the morning after', k2: 'Kai\'s hand on the barrier, Hana inside', k2b: 'Hana in the gold',
    k2c: 'Kai on his knees at the barrier', k3: 'The alley that night, in the rain', k3a: 'Hana under the lantern', k3c: 'Freya under the lantern',
    s1: 'The Murim Alliance\'s duel hall', s2: 'The one second', s2b: 'The knife in her sleeve', s2c: 'Jin\'s sword on the floor',
    s3: 'A training yard at dawn, in mist', s3a: 'Jin at the post', s3c: 'Freya at the post',
    d1: 'A cell at night, one slit of moonlight', d2: 'Dutch\'s fist on the wall', d3: 'Lina in the infirmary, the academy\'s flowers',
    d1b: 'Lina in the cell', d1c: 'Freya in the cell'
  };
  // What a phone held upright keeps in frame (js/vn.js, focus), as a percentage across the still; the rest are
  // centred. Each c still shares its shot's focus, so the glitch cut only changes the person.
  const FOCUS = { m1: 40, m2: 45, m2b: 48, m2c: 48, m3: 34, m3a: 55, m3c: 55, k1: 52, k2: 70, k2b: 48, k2c: 66, k3: 70,
    k3a: 47, k3c: 47, s2: 22, s2b: 36, s2c: 45, s3: 22, s3a: 72, s3c: 72, d1: 40, d1b: 45, d1c: 45, d2: 42, d3: 36 };
  // Freya comes to Mira in a dream (the Story Bible), so her kitchen shots play through a dream haze.
  const DREAM = ['m3', 'm3a', 'm3c'];
  SD.vn.addScenes(Object.fromEntries(Object.entries(STILL).map(([id, label]) => [id, { src: 'assets/img/vn/' + id + '.webp', label,
    dream: DREAM.includes(id), focus: FOCUS[id] === undefined ? undefined : FOCUS[id] + '% 50%' }])));
  // Faces to paint: Mira desperate, grief, cold; Kai shock, grief, anger; Seo-yeon frozen, grief, anger; Dutch stone,
  // grief, anger; Freya smile, cold. Each painted face goes in faces: { face: src }.
  const stand = src => ({ stand: src, pixel: true, faces: {} });
  SD.vn.addSprites({
    mira: { faces: { grief: 'assets/img/vn/mira-grief.webp' } },
    kai: stand('assets/img/lead/kai.webp'),
    seoyeon: stand('assets/img/lead/seoyeon.webp'),
    dutch: stand('assets/img/lead/dutch.webp'),
    freya: { faces: { smile: 'assets/img/vn/freya-smile.webp' } },
    bram: { tint: '#5a4a3a' }, hana: { tint: '#b08a3a' }, jin: { tint: '#6a2a2a' }, lina: { tint: '#7a6a9a' }
  });
  SD.art.addPainted('mira', ['neutral'], true);
  SD.art.addPainted('kai', ['neutral'], true);
  SD.art.addPainted('seoyeon', ['neutral'], true);
  SD.art.addPainted('dutch', ['neutral'], true);
  SD.art.addPainted('freya', ['neutral', 'virus', 'promoter'], true);
  // The prologue's dream, Uptima's sanctum and the edge of the Cloud play under drifting storm cloud (index.html's .pcl).
  ['dream', 'sanctum', 'edge'].forEach(k => { SD.ui.stageDecor[k] = '<div class="pcl far"></div><div class="pcl mid"></div><div class="pcl near"></div>'; });
  SD.art.addPainted('kyu', ['neutral', 'angry', 'confused', 'happy', 'laugh', 'smug']);
  [['mira', 520], ['kai', 760], ['seoyeon', 980], ['dutch', 240], ['freya', 860], ['kyu', 700], ['faithful', 420]].forEach(([w, hz]) => SD.ui.voice(w, hz));
  SD.art.addFoe('kyuboss', { col: '#b9a3ff', anim: 'float', src: 'assets/img/monsters/kyuboss.webp' });
  SD.art.addFoe('uptimaboss', { col: '#ffd9a0', anim: 'float', src: 'assets/img/monsters/uptimaboss.webp' });
})();
