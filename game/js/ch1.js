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
      name: 'The Locked Cart', sev: 22, concept: 'iam', tier: 0, sprite: 'c1door', tutorial: true, ch: 1,
      flavor: 'Your kit is in there. So is breakfast.',
      symptom: 'Every call you make returns AccessDenied. Nothing anywhere allows you anything yet.',
      weak: { allow: 'Everything starts implicitly denied. An Allow for the action is what opens it.' },
      resist: {},
      pattern: [{ t: 'read', n: 3 }, { t: 'read', n: 4 }, { t: 'write', n: 4 }]
    },
    faithful: {
      name: 'Uptima\'s Faithful', sev: 40, concept: 'respolicy', tier: 1, sprite: 'c1faithful', ch: 1,
      flavor: 'Brookfall still prays to her. They don\'t like the look of you.',
      symptom: 'Your role in Freya\'s account is allowed to call shrine:Enter, but the shrine belongs to Uptima\'s account and its resource policy names nobody from outside. AccessDenied.',
      weak: {
        resource: 'Across accounts both sides must allow: the shrine\'s own resource policy has to name your role as well.',
        assume: 'A role in the shrine\'s account whose trust policy names you lets you act inside that account.',
        unmake: 'Kai strips the blessing off the shrine\'s door. He feels every prayer in it.'
      },
      resist: { allow: 'Your own account\'s Allow is only half of it. The shrine\'s account has to allow the call too.' },
      pattern: [{ t: 'read', n: 8 }, { t: 'write', n: 9 }, { t: 'escalate' }, { t: 'read', n: 11 }]
    },
    wrongmask: {
      name: 'The Wrong Mask', sev: 38, concept: 'roles', tier: 1, sprite: 'c1mask', ch: 1,
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
      name: 'The Session Warden', sev: 40, concept: 'roles', tier: 1, sprite: 'c1warden', ch: 1,
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
      name: 'The Two-Factor Sentinel', sev: 56, concept: 'conditions', tier: 2, sprite: 'c1sentinel', ch: 1,
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
      name: 'Uptima, Goddess of the Cloud', short: 'Uptima', sev: 90, concept: 'roles', tier: 9, boss: true, sprite: 'uptimaboss', ch: 1,
      deep: ['q-ro4', 'q-ro2'],
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
      name: 'Kyu, the Explicit Deny', short: 'Kyu', sev: 60, concept: 'iam', tier: 9, boss: true, sprite: 'kyuboss', ch: 1,
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

  // ---------- Boss steps ----------
  // Before the sanctum, Freya talks you through it, and she's right every time.
  SD.bossDesign.uptimaboss = {
    concepts: ['roles', 'respolicy'],
    req: {
      c: 'roles', q: 'Step 1, Requirements. Freya, in your ear: "To reach her keys you need a mask her temple trusts. What does that take?"',
      items: [
        { t: 'A role in her account whose trust policy names the brigade\'s role', ok: true },
        { t: 'An Allow in our own account for sts:AssumeRole on that role', ok: true },
        { t: 'Her root user\'s password', ok: false, no: 'Never needed: a role hands out exactly what it allows, and nobody should be using root for this.' },
        { t: 'An IAM user in her account, with its access keys copied to us', ok: false, no: 'Long-term keys passed between accounts are exactly what roles replace.' },
        { t: 'A bigger Allow in our own account, and nothing on her side', ok: false, no: 'Across accounts, her side has to allow the call too.' }
      ],
      why: 'Assuming a role in another account takes both sides: the role\'s trust policy names the caller, and the caller\'s own account allows sts:AssumeRole on the role\'s ARN.'
    },
    est: {
      c: 'roles', q: 'Step 2, Estimation. The job in the sanctum takes 3 hours, and the role\'s maximum session duration is 4 hours. What DurationSeconds covers the job without asking for more than it needs?',
      unit: 'seconds', lo: 10800, hi: 11400, ans: '10,800 (3 × 3,600)',
      why: 'DurationSeconds is in seconds, from 900 up to the role\'s maximum session duration (which can be 1 to 12 hours, and is 1 hour by default). Without it the session lasts 1 hour, and a chained role session is capped at 1 hour whatever you ask.'
    },
    design: {
      c: 'roles', q: 'Step 3, Design. Freya: "When she sees the mask she\'ll revoke its active sessions. What does that actually do?"',
      opts: ['Denies sessions issued before now; a fresh AssumeRole still works', 'Deletes the role and its trust policy, so nobody can assume it again', 'Rotates the role\'s long-term access keys, so old signed requests fail', 'Ends console sessions only; sessions from the API and CLI keep working'], a: 0,
      no: [null, 'The role stays. Revoking attaches a Deny to it; it doesn\'t delete anything.', 'Roles have no long-term access keys. They only ever hand out temporary credentials.', 'It applies to every session of that role, however the role was assumed.'],
      why: 'Revoking active sessions attaches an inline policy (AWSRevokeOlderSessions) that denies every action to sessions whose aws:TokenIssueTime is earlier than the revoke. Anyone the trust policy still names can assume the role again and get working credentials, so a real lockout also fixes the trust policy.'
    },
    startCard: 'reassume',
    go: 'Now get past her. When she revokes your session, put on a fresh one.'
  };

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
    { id: 'q-mask', c: 'roles', type: 'mc', q: 'Four masks hang at the temple gate, each a role. The gate opens for temple:OpenGate. Which one can Freya\'s brigade put on and open the gate with?',
      opts: ['Trust names the brigade\'s role; its policy allows temple:OpenGate', 'Trust names the temple\'s acolytes; its policy allows temple:*', 'Trust names the brigade\'s role; it has no permissions policy', 'Trust names the brigade\'s role; its policy denies temple:Open*'], a: 0,
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
  // Backgrounds and stills from the cutscene shot list. Until each one is painted (src set), the player shows a
  // tinted placeholder, and the sprites stand in with the pixel art.
  SD.vn.addScenes({
    m1: { src: 'assets/img/vn/m1.webp', label: 'The top of the tower stair, night', tint: ['#5a2a1c', '#0b0606'] },
    m2: { src: 'assets/img/vn/m2.webp', label: 'Mira holding Bram on the steps', tint: ['#6b1f1f', '#0a0505'] },
    m3: { label: 'Her cottage, the new moon', tint: ['#2a3550', '#06070c'] },
    k1: { label: 'The cathedral, a wall of gold light', tint: ['#8a6a2a', '#100c06'] },
    k2: { label: 'Kai\'s hand on the barrier, Hana inside', tint: ['#b08a3a', '#120d05'] },
    k3: { label: 'The cathedral steps that night', tint: ['#3a3020', '#050505'] },
    s1: { label: 'The Murim Alliance\'s duel hall', tint: ['#6a2a24', '#0a0606'] },
    s2: { label: 'The one second', tint: ['#7a2030', '#0a0406'] },
    s3: { label: 'A training yard at dawn, in mist', tint: ['#5a6070', '#101218'] },
    d1: { label: 'A cell at night, one slit of moonlight', tint: ['#2a3a5a', '#040508'] },
    d2: { label: 'Dutch\'s fist on the wall, Lina\'s diary', tint: ['#3a3a52', '#050508'] },
    d3: { label: 'Flowers on an empty infirmary bed', tint: ['#5a5560', '#0a0a0c'] }
  });
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
