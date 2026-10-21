// The Deny Mines (design: "Chapter 1: the mountain trek", Oct 21): the cave on the way up Mount Quota, chapter 1's
// Borderlands dungeon. Two floors of nine rows, each with its boss, played on the Borderlands engine (js/raid.js) alone
// with your three companions as bots, or in a party with friends who join with your code.
//   Floor 1, the Galleries: reading policies, bucket and object ARNs, guardrails (permissions boundaries and SCPs),
//     where keys come from. Field Notes rooms teach by worked example; from row 5 Freya's notes stop halfway.
//   Floor 2, the Trust Vaults: role trust, cross-account access with an ExternalId, debugging AccessDenied, key
//     policies. Policy Sort rooms ask you to predict, then sort.
// Here: the four leads as champions, the new cards, the enemies (their art is js/ch1-mines-art.js), the expedition,
// the Field Notes and Policy Sorts, the new concepts with their Huh??? and ELI5 lines, and SD.ch1m.mines, which the
// cave mouth in js/ch1-mountain.js calls.
// AWS facts follow the current AWS documentation (the IAM, STS, KMS and SDK reference guides). Every explanation is
// written fresh; no practice-exam questions or course material are copied.
(function () {
  const S = SD.state, U = SD.ui;
  const ORDER = ['mira', 'kai', 'seoyeon', 'dutch'];
  const c1 = () => (S && S.save && S.save.c1) || null;
  const lead = () => (c1() && c1().lead) || null;

  // ---------- Concepts ----------
  const PAGE = {
    guardrails: 'A boundary or an SCP is a fence, not a door. It never lets you in; it only says how far in anyone may go. xx F.',
    credchain: 'Your code takes the first keys it finds, in order. Leave old ones lying about and it will use those. xx F.',
    xacct: 'Lending a role to someone from outside? Make them say the password only you two know. xx F.',
    authdebug: 'AccessDenied always has a reason. Decode it, then look for the policy that said no. xx F.'
  };
  Object.assign(SD.concepts, {
    guardrails: {
      name: 'Guardrails: Boundaries and SCPs', zone: 1,
      gist: 'A permissions boundary is a managed policy set on a user or role that caps the most its identity-based policies can grant. A service control policy (SCP) in AWS Organizations caps what principals in member accounts can do. Neither grants anything: an action needs an Allow in an identity or resource policy and must also be allowed by every boundary and SCP that applies. An explicit Deny in any of them wins. SCPs don\'t affect the organization\'s management account.',
      page: PAGE.guardrails
    },
    credchain: {
      name: 'Where Keys Come From', zone: 1,
      gist: 'The AWS SDKs and CLI look for credentials in a fixed order and use the first they find: credentials set in code, then environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN), then the shared config and credentials files (~/.aws, including IAM Identity Center profiles), then container credentials (an ECS task role), then the EC2 instance profile. Old keys in the environment win over the role. Prefer roles and short-lived credentials to long-term access keys.',
      page: PAGE.credchain
    },
    xacct: {
      name: 'Cross-Account Roles and ExternalId', zone: 1,
      gist: 'To let another account in, create a role whose trust policy names that account or principal, and have the caller\'s own policy allow sts:AssumeRole on it. A third party that serves many customers should be made to pass an ExternalId: the trust policy requires it with a StringEquals condition on sts:ExternalId, which stops the confused deputy problem, where someone tricks the vendor into using its access to your account on their behalf.',
      page: PAGE.xacct
    },
    authdebug: {
      name: 'Debugging AccessDenied', zone: 1,
      gist: 'An AccessDenied error usually names the principal, the action, the resource and, when it can, the kind of policy that refused (an explicit deny in an SCP, no identity-based policy allows it). An encoded authorization message is decoded with sts:DecodeAuthorizationMessage. The IAM policy simulator tests policies without making the call, and CloudTrail records the errorCode of denied calls. A KMS key has its own key policy: unless it lets the account\'s IAM policies count, an IAM Allow alone can\'t use the key.',
      page: PAGE.authdebug
    }
  });
  SD.links.push(
    { id: 'guardrails-iam', a: 'guardrails', b: 'iam', text: 'A boundary or an SCP only takes away: an action still needs an Allow in an identity or resource policy.' },
    { id: 'credchain-roles', a: 'credchain', b: 'roles', text: 'An instance profile or task role hands the SDK temporary credentials, but only if nothing earlier in the chain answers first.' },
    { id: 'xacct-respolicy', a: 'xacct', b: 'respolicy', text: 'A role\'s trust policy is the resource policy for cross-account access: both it and the caller\'s own policy must allow AssumeRole.' },
    { id: 'authdebug-cloudtrail', a: 'authdebug', b: 'cloudtrail', text: 'CloudTrail records denied calls too, with an errorCode such as AccessDenied, so you can see which call failed and who made it.' }
  );

  // ---------- Cards ----------
  // What the mines teach, found in its card rewards (SD.champions.rewards) and from Freya's trade on floor 2.
  Object.assign(SD.cards, {
    splitarn:  { name: 'Split the ARNs', cost: 1, kind: 'action', pow: 7, tags: ['arn'], art: 'note', rarity: 'common', concept: 's3arn', ch: 1, text: 'Two statements, two ARNs: s3:ListBucket on the bucket, s3:GetObject on bucket/*. Each action meets the resource it acts on.' },
    defchain:  { name: 'Default Credential Chain', cost: 1, kind: 'infra', pow: 5, each: { any: 2 }, tags: ['chain'], art: 'key', rarity: 'common', concept: 'credchain', ch: 1, text: 'Infra. Each turn absorb 2 load. The SDK takes the first keys it finds: environment, shared files, container, instance profile.' },
    readbound: { name: 'Read the Boundary', cost: 1, kind: 'action', pow: 8, tags: ['boundary'], art: 'gate', rarity: 'uncommon', concept: 'guardrails', ch: 1, text: 'A permissions boundary only caps; it never grants. What you can do is the overlap of the boundary and your policies.' },
    extid:     { name: 'Require an ExternalId', cost: 2, kind: 'action', pow: 11, tags: ['externalid'], art: 'lock', rarity: 'uncommon', concept: 'xacct', ch: 1, text: 'The trust policy requires sts:ExternalId, so a deputy acting for someone else can\'t put on your role.' }
  });
  const MINE_CARDS = ['splitarn', 'defchain', 'readbound', 'extid'];
  // Freya's AdministratorAccess in the mines: every play asks a least-privilege question (lp, js/ch1-trek.js). Fast
  // and right, +1 Capacity more; wrong, the team pays 3 SLA for the blast radius.
  Object.assign(SD.cards.adminaccess, {
    ask: { c: ['iam', 'roles', 's3arn', 'cloudtrail', 'conditions', 'respolicy', 'lambdaperm'], who: 'self', lp: true },
    speed: { fast: { gain: 1 }, steady: { abs: { any: 3 } }, slow: {} },
    wrong: { selfDmg: 3 }
  });

  // ---------- Champions ----------
  // The four leads, for the Borderlands party room (js/party.js) and the engine (js/raid.js). Each brings their own
  // card and two more, in place of two Hotfixes.
  const ROSTER = [
    ['mira', 'Mira', 'Keeps the party standing', 109, 154, 'bedside', [
      ['triage', { name: 'Field Triage', cost: 1, kind: 'action', abs: { any: 6 }, draw: 1, art: 'pulse', text: 'Absorb {any} load. Draw 1. "Worst first. You, sit. You, breathe."' }],
      ['splint', { name: 'Splint and Carry On', cost: 2, kind: 'action', mit: 12, art: 'pulse', text: 'Mitigate {mit}. She has splinted a dragon. It said thank you.' }]]],
    ['kai', 'Kai', 'Undoes what props it up', 84, 138, 'unmaking', [
      ['revoke', { name: 'Revoke Older Sessions', cost: 1, kind: 'action', pow: 8, tags: ['revoke'], art: 'eraser', text: 'Deny everything for sessions issued before now. Old keys stop working; fresh ones don\'t.' }],
      ['unpick', { name: 'Unpick the Grant', cost: 0, kind: 'action', vuln: 1, selfDmg: 1, exhaust: true, art: 'eraser', text: 'This turn the enemy takes 50% more mitigation. The team loses 1 SLA. Exhaust. He pulls one thread.' }]]],
    ['seoyeon', 'Seo-yeon', 'Hits hardest', 107, 145, 'peakstyle', [
      ['summit', { name: 'Summit Strike', cost: 1, kind: 'action', mit: 8, art: 'bolt2', text: 'Mitigate {mit}. From the top of the mountain, down.' }],
      ['ember', { name: 'Ember Step', cost: 0, kind: 'action', gain: 1, exhaust: true, art: 'bolt2', text: '+1 Capacity. Exhaust. One step, and she\'s already there.' }]]],
    ['dutch', 'Dutch', 'Knows every door', 118, 155, 'masterkey', [
      ['mop', { name: 'Mop Up', cost: 1, kind: 'action', abs: { any: 8 }, art: 'key', text: 'Absorb {any} load. Somebody has to, and it\'s always him.' }],
      ['rounds', { name: 'Night Rounds', cost: 1, kind: 'action', mit: 4, reveal: true, draw: 1, art: 'key', text: 'Mitigate {mit}. Reveal the enemy\'s weaknesses. Draw 1. He has tried every door at 3 a.m.' }]]]
  ];
  const CH = SD.champions = {};
  const KEY = 'sd-mines-champ';
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };
  const BY = {};
  CH.regions = ['Freya\'s Brigade'];
  CH.cards = {};
  CH.list = ROSTER.map(([id, name, style, w, h, own, sig]) => {
    const c = { id, name, short: name, region: CH.regions[0], how: '', style, w, h, img: `assets/img/lead/${id}.webp` };
    BY[id] = c;
    CH.cards[id] = [own].concat(sig.map(([k, d]) => {
      const cid = 'sig-' + id + '-' + k;
      SD.cards[cid] = Object.assign({ rarity: 'rare', quest: true, champ: id, tags: [], ch: 1 }, d);
      return cid;
    }));
    return c;
  });
  CH.get = id => BY[id] || null;
  CH.unlocked = id => !!BY[id];
  CH.bossConflict = () => false;
  CH.mine = () => { const v = store.get(KEY); return BY[v] ? v : null; };
  CH.setMine = id => { if (BY[id]) store.set(KEY, id); };
  CH.rewards = () => MINE_CARDS.slice();
  CH.swapNote = who => `In the Deny Mines they replace two Hotfixes in ${who} deck (your own card isn't doubled).`;
  // A lead's standing art, scaled. It's one frame, so it never animates.
  CH.sprite = function (id, scale) {
    const c = BY[id], d = document.createElement('div');
    if (!c) return d;
    const w = c.w * scale, h = c.h * scale;
    d.className = 'champ-spr';
    d.style.cssText = `width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;background-image:url(${c.img});background-size:100% 100%;image-rendering:auto`;
    return d;
  };
  // base minus one copy of each signature card it already holds and two Hotfixes, with the three in front.
  CH.deck = function (id, base) {
    const deck = (base || SD.starterDeck || []).slice(), sig = CH.cards[id];
    if (!sig) return deck;
    sig.concat('hotfix', 'hotfix').forEach(c => { const j = deck.indexOf(c); if (j >= 0) deck.splice(j, 1); });
    return sig.concat(deck);
  };
  // Your chapter 1 deck (refactored cards come in plain), or the starter deck for a bot or a fresh save.
  const deckFor = (champ, bot) => {
    const d = !bot && c1() && Array.isArray(c1().deck) && c1().deck.length ? c1().deck.map(c => c.id) : (SD.starterDeck || []).slice();
    return CH.deck(champ, d);
  };

  // ---------- Enemies ----------
  // raid: only the mines fight them. denies: cards this enemy's policies explicitly deny (js/raid.js).
  const F = (o) => Object.assign({ ch: 1, raid: true, resist: {} }, o);
  Object.assign(SD.enemies, {
    // Floor 1, the Galleries
    denybat: F({ name: 'Implicit Deny Bat', short: 'Deny Bat', cause: 'Nothing allows the call, so it is implicitly denied', sev: 26, concept: 'iam', tier: 1, sprite: 'm1bat',
      flavor: 'It doesn\'t say no. It just never says yes.',
      symptom: 'Every call returns AccessDenied, and no policy anywhere mentions the action.',
      weak: { allow: 'An Allow for exactly this action on exactly this resource lifts the implicit deny.', leastpriv: 'A scoped role that allows just this call is all it takes.' },
      resist: { deny: 'There is no Deny to find. Nothing allows it, which is a different problem.' },
      pattern: [{ t: 'read', n: 5 }, { t: 'read', n: 6 }, { t: 'burst', n: 7 }] }),
    wildslime: F({ name: 'Wildcard Slime', short: 'Slime', cause: 'Action "*" grants far more than the job needs', sev: 30, concept: 'polanatomy', tier: 1, sprite: 'm1slime',
      flavor: 'It fits into every action. That\'s the problem.',
      symptom: 'A policy for a log reader says "Action": "*". The reader just deleted a table.',
      weak: { arn: 'Name the actions and resources the job uses. The star has nowhere to grow.', leastpriv: 'Least privilege: exactly the actions the code calls, nothing else.' },
      resist: { allow: 'Another Allow on top of "*" changes nothing. It is already allowed everything.' },
      pattern: [{ t: 'write', n: 6 }, { t: 'read', n: 7 }, { t: 'escalate' }, { t: 'write', n: 8 }] }),
    mimic: F({ name: 'Bucket Mimic', short: 'Mimic', cause: 's3:ListBucket is granted on bucket/* instead of the bucket', sev: 30, concept: 's3arn', tier: 1, sprite: 'm1mimic',
      flavor: 'It looks like the bucket. It\'s the things in it.',
      symptom: 'Downloads work, but listing the bucket returns AccessDenied. The policy grants s3:ListBucket on arn:aws:s3:::ore-carts/*.',
      weak: { arn: 'ListBucket acts on the bucket ARN, arn:aws:s3:::ore-carts, not on its objects.', resource: 'Fix the resource the action points at, and it lists.' },
      resist: { allow: 'An Allow on the wrong ARN never matches, however many you add.' },
      pattern: [{ t: 'read', n: 7 }, { t: 'burst', n: 8 }, { t: 'read', n: 7 }] }),
    keygoblin: F({ name: 'Leaky Key Goblin', short: 'Key Goblin', cause: 'Old access keys in the environment win over the role', sev: 28, concept: 'credchain', tier: 1, sprite: 'm1goblin',
      flavor: 'It found your keys in a shell script from 2019.',
      symptom: 'The instance role allows the call, but the error names an old IAM user. AWS_ACCESS_KEY_ID is set in the startup script.',
      weak: { chain: 'The SDK checks environment variables before the instance profile. Remove the old keys and the chain reaches the role.', fresh: 'Short-lived credentials from a role, instead of keys that never expire.', assume: 'Work as a role: its keys expire on their own.' },
      resist: { allow: 'The role already allows it. The SDK just isn\'t using the role.' },
      pattern: [{ t: 'read', n: 6 }, { t: 'write', n: 7 }, { t: 'burst', n: 8 }] }),
    boundarywall: F({ name: 'The Boundary Wall', short: 'Boundary Wall', cause: 'A permissions boundary caps the role below what its policy allows', sev: 46, concept: 'guardrails', tier: 2, elite: true, sprite: 'm1wall',
      flavor: 'You have AdministratorAccess. The wall has the final say.',
      symptom: 'The role has AdministratorAccess, but its permissions boundary allows only s3:GetObject. Everything else is denied.',
      weak: { boundary: 'What a role can do is the overlap of its policies and its boundary. Ask for what the boundary allows.', deny: 'Find which policy said no: here, the boundary.', leastpriv: 'A role scoped inside the boundary works first time.' },
      resist: { allow: 'More Allows don\'t lift a boundary. It caps them.', admin: 'AdministratorAccess is capped like everything else.' },
      denies: ['adminaccess'],
      pattern: [{ t: 'read', n: 9 }, { t: 'write', n: 10 }, { t: 'escalate' }, { t: 'burst', n: 11 }] }),
    asterisk: F({ name: 'The Great Asterisk', short: 'Asterisk', cause: 'Allow * on *, everywhere, for everyone', sev: 78, concept: 'guardrails', tier: 3, boss: true, sprite: 'm1asterisk',
      flavor: 'It was a temporary policy. In 2017.',
      symptom: 'Every role in the galleries has Allow * on *. An SCP denies the dangerous actions, and nobody knows which ones are which any more.',
      weak: { deny: 'An explicit Deny in an SCP or a policy beats every Allow, even *.', leastpriv: 'Replace * with what each role really calls.', boundary: 'A boundary caps * down to what you meant.' },
      resist: { allow: 'Allowing more doesn\'t help against Allow *.', admin: 'AdministratorAccess is the Asterisk\'s own policy. It only feeds it.' },
      denies: ['adminaccess'],
      pattern: [{ t: 'write', n: 10 }, { t: 'read', n: 11 }, { t: 'burst', n: 13 }, { t: 'escalate', up: 3 }, { t: 'write', n: 12 }] }),
    // Floor 2, the Trust Vaults
    untrusted: F({ name: 'The Untrusted', short: 'Untrusted', cause: 'The role\'s trust policy doesn\'t name the caller', sev: 32, concept: 'roles', tier: 1, sprite: 'm2untrusted',
      flavor: 'It isn\'t on the list. Neither are you.',
      symptom: 'sts:AssumeRole fails with AccessDenied. The role\'s trust policy names a different account.',
      weak: { trust: 'Name the caller in the trust policy: it decides who may assume the role.', resource: 'A trust policy is the role\'s resource policy. Across accounts, it must name you.' },
      resist: { assume: 'Calling AssumeRole again gets the same answer.' },
      pattern: [{ t: 'read', n: 7 }, { t: 'burst', n: 8 }, { t: 'read', n: 8 }] }),
    sessionwraith: F({ name: 'Session Wraith', short: 'Wraith', cause: 'A leaked session is still valid until it expires', sev: 32, concept: 'roles', tier: 1, sprite: 'm2wraith',
      flavor: 'It was issued at 08:30. It plans to stay until 20:30.',
      symptom: 'Someone copied a role session\'s credentials. They work for hours, until the session expires.',
      weak: { revoke: 'Revoke older sessions: a Deny on every session issued before now.', fresh: 'New sessions are issued after the revoke, so they still work.', expiry: 'Shorter sessions leave less time for a leaked one.' },
      resist: { allow: 'The leaked session already has every Allow it needs.' },
      pattern: [{ t: 'read', n: 7 }, { t: 'write', n: 8 }, { t: 'burst', n: 8 }] }),
    chainserpent: F({ name: 'Chain Serpent', short: 'Serpent', cause: 'The SDK found keys in a file before it reached the task role', sev: 30, concept: 'credchain', tier: 1, sprite: 'm2serpent',
      flavor: 'It bites whoever comes first in the chain.',
      symptom: 'A container baked with an old ~/.aws/credentials file calls S3 as a long-deleted user instead of its task role.',
      weak: { chain: 'Shared credential files come before container credentials. Take the file out of the image.', assume: 'Let the task role hand out short-lived keys.' },
      resist: { trust: 'The task role\'s trust policy is fine. The SDK never asks for it.' },
      pattern: [{ t: 'write', n: 7 }, { t: 'read', n: 7 }, { t: 'escalate' }] }),
    twokeytroll: F({ name: 'Two-Key Troll', short: 'Troll', cause: 'Across accounts, only one side allows the call', sev: 34, concept: 'respolicy', tier: 1, sprite: 'm2troll',
      flavor: 'It has two locks. You brought one key.',
      symptom: 'A role in account B can read a bucket in account A according to its own policy, but the bucket policy in A names nobody from B.',
      weak: { resource: 'The bucket\'s policy in account A must allow the role too.', assume: 'Assume a role in account A instead, and A\'s own policies decide.' },
      resist: { allow: 'Your side already allows it. The other side has to say yes as well.' },
      pattern: [{ t: 'read', n: 8 }, { t: 'write', n: 8 }, { t: 'burst', n: 9 }] }),
    errorsprite: F({ name: 'Encoded Error Sprite', short: 'Error Sprite', cause: 'The denial\'s reason is hidden in an encoded message', sev: 28, concept: 'authdebug', tier: 1, sprite: 'm2sprite',
      flavor: 'It knows exactly why. It just won\'t say it in plain text.',
      symptom: 'RunInstances fails with UnauthorizedOperation and a long encoded authorization message.',
      weak: { deny: 'Decode it with sts:DecodeAuthorizationMessage and find the policy that said no.', arn: 'The decoded message names the exact action and resource. Match them.' },
      resist: { allow: 'Guessing at Allows before reading the reason rarely lands.' },
      pattern: [{ t: 'burst', n: 7 }, { t: 'read', n: 7 }, { t: 'write', n: 8 }] }),
    keykeeper: F({ name: 'The Key Keeper', short: 'Key Keeper', cause: 'The KMS key policy doesn\'t let IAM policies count', sev: 48, concept: 'authdebug', tier: 2, elite: true, sprite: 'm2keeper',
      flavor: 'Your IAM policy says yes. The key never asked IAM.',
      symptom: 'The role\'s policy allows kms:Decrypt, but the key policy lists only its administrators. Decrypt fails with AccessDeniedException.',
      weak: { resource: 'The key policy is the key\'s own resource policy: name the role there, or let the account\'s IAM policies count.', deny: 'Read the error: the refusal came from the key policy.' },
      resist: { allow: 'An IAM Allow doesn\'t count until the key policy lets it.', admin: 'Even AdministratorAccess can\'t use a key whose policy doesn\'t trust the account.' },
      denies: ['adminaccess'],
      pattern: [{ t: 'read', n: 10 }, { t: 'write', n: 10 }, { t: 'escalate' }, { t: 'burst', n: 12 }] }),
    deputy: F({ name: 'The Confused Deputy', short: 'Deputy', cause: 'A vendor\'s role can be used for the wrong customer, with no ExternalId', sev: 84, concept: 'xacct', tier: 3, boss: true, sprite: 'm2deputy',
      flavor: 'He has keys to every vault, and he does whatever the last person asked.',
      symptom: 'A vendor assumes roles in its customers\' accounts. Any customer can give it the ARN of your role, and it will happily assume it for them.',
      weak: { externalid: 'Require a unique ExternalId in the trust policy. The deputy only gets in when he says your customer\'s ID.', trust: 'A trust policy that names exactly who may assume the role, and on what condition.' },
      resist: { assume: 'He can already assume the role. That\'s the trouble.', admin: 'More power for a confused deputy is the worst idea in the mine.' },
      pattern: [{ t: 'read', n: 11 }, { t: 'write', n: 12 }, { t: 'burst', n: 13 }, { t: 'escalate', up: 3 }, { t: 'write', n: 13 }] })
  });

  // ---------- Field Notes and Policy Sorts ----------
  // A note's question is picked at random from the bank on its concept (js/qpick.js).
  SD.fieldNotes = {
    evalorder: { title: 'How a request is judged', c: 'iam', steps: [
      'Every request starts out denied. That\'s the implicit deny.',
      'Gather every policy that applies: identity policies, the resource\'s own policy, permissions boundaries, SCPs.',
      'Does any explicit Deny match the request? Then it\'s denied, and nothing else matters.',
      'Do the guardrails (any SCP, any boundary) allow the action too? If one doesn\'t, it stays denied.',
      'Is there an Allow in an identity or resource policy? Then it gets through.',
      'No Allow anywhere: still the implicit deny from step one.'] },
    statement: { title: 'Reading one statement', c: 'polanatomy',
      ev: '{\n  "Effect": "Allow",\n  "Action": "s3:GetObject",\n  "Resource": "arn:aws:s3:::ore-maps/*",\n  "Condition": { "Bool": { "aws:SecureTransport": "true" } }\n}',
      steps: [
        'Effect: Allow. If it applies, it lets the request through.',
        'Action: only s3:GetObject. Listing or deleting isn\'t in it.',
        'Resource: any object in ore-maps. The star matches any key, slashes included.',
        'Condition: only over HTTPS. Over plain HTTP the statement doesn\'t apply at all.',
        'All four have to match, or the statement does nothing.'] },
    bucketarn: { title: 'The bucket and the things in it', c: 's3arn',
      ev: 's3:ListBucket   ->  arn:aws:s3:::ore-carts\ns3:GetObject    ->  arn:aws:s3:::ore-carts/*',
      steps: [
        'Listing the keys is an action on the bucket: arn:aws:s3:::ore-carts.',
        'Reading, writing and deleting are actions on objects: arn:aws:s3:::ore-carts/*.',
        'A policy that lists and reads needs both ARNs, usually as two statements.',
        'Without s3:ListBucket, asking for a missing key gets 403, not 404, so nobody can go fishing for key names.'] },
    boundary: { title: 'A fence, not a door', c: 'guardrails',
      ev: 'Identity policy:      Allow s3:*  on *\nPermissions boundary: Allow s3:GetObject, s3:PutObject on *',
      steps: [
        'The identity policy says the role may do anything in S3.',
        'The boundary says the most it may ever do is GetObject and PutObject.',
        'What the role can do is the overlap: GetObject and PutObject.',
        'The boundary grants nothing by itself. Take away the identity policy and the role can do nothing.',
        'An SCP works the same way for a whole account, and it doesn\'t touch the organization\'s management account.'] },
    chain: { title: 'Where your keys come from', c: 'credchain', steps: [
      'Credentials you set in code come first.',
      'Then environment variables: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and AWS_SESSION_TOKEN.',
      'Then the shared files in ~/.aws, including sign-in profiles for IAM Identity Center.',
      'Then container credentials, such as an ECS task role.',
      'Then the EC2 instance profile.',
      'The first one found wins, so old keys left in the environment beat the role every time.'] },
    mfa: { title: 'The MFA gate', c: 'conditions',
      ev: '{\n  "Effect": "Deny",\n  "Action": "s3:DeleteObject",\n  "Resource": "*",\n  "Condition": { "BoolIfExists": { "aws:MultiFactorAuthPresent": "false" } }\n}',
      steps: [
        'A Deny that applies when MFA isn\'t present.',
        'Temporary credentials from an MFA sign-in carry aws:MultiFactorAuthPresent = true, so the Deny doesn\'t match.',
        'Long-term access keys don\'t carry the key at all.',
        'With plain Bool, a missing key never matches, so those keys would slip through.',
        'BoolIfExists treats a missing key as a match, so they\'re denied too.'] }
  };
  SD.policySorts = {
    maps: { title: 'The surveyor\'s role', c: 'polanatomy',
      ev: 'The role\'s only policy (same account, no bucket policy):\n[\n  { "Effect": "Allow", "Action": ["s3:GetObject", "s3:PutObject"], "Resource": "arn:aws:s3:::ore-maps/*" },\n  { "Effect": "Allow", "Action": "s3:ListBucket", "Resource": "arn:aws:s3:::ore-maps" },\n  { "Effect": "Deny", "Action": "s3:DeleteObject", "Resource": "*" }\n]',
      reqs: [
        { t: 'GetObject on ore-maps/north.png', ok: true, why: 'GetObject on an object in ore-maps: the first statement matches.' },
        { t: 'ListBucket on ore-maps', ok: true, why: 'ListBucket on the bucket ARN: the second statement matches.' },
        { t: 'DeleteObject on ore-maps/old.png', ok: false, why: 'The explicit Deny matches, and a Deny beats every Allow.' },
        { t: 'GetObject on ore-maps-backup/north.png', ok: false, why: 'A different bucket. Nothing allows it, so the implicit deny stands.' },
        { t: 'PutObject on ore-maps/routes/new.png', ok: true, why: 'The star matches any key, slashes included.' }] },
    boundary: { title: 'The capped builder', c: 'guardrails',
      ev: 'Identity policy:      Allow s3:* and dynamodb:* on *\nPermissions boundary: Allow s3:GetObject, s3:PutObject and sqs:SendMessage on *\nNo SCPs, no resource policies.',
      reqs: [
        { t: 's3:GetObject', ok: true, why: 'Both the identity policy and the boundary allow it.' },
        { t: 's3:DeleteObject', ok: false, why: 'The identity policy allows it, but the boundary doesn\'t.' },
        { t: 'sqs:SendMessage', ok: false, why: 'The boundary allows it, but a boundary grants nothing. No identity policy allows it.' },
        { t: 'dynamodb:PutItem', ok: false, why: 'Outside the boundary.' },
        { t: 's3:PutObject', ok: true, why: 'Inside both.' }] },
    trust: { title: 'The vendor\'s door', c: 'xacct',
      ev: 'Trust policy of a role in account 111122223333:\n{\n  "Effect": "Allow",\n  "Principal": { "AWS": "arn:aws:iam::444455556666:root" },\n  "Action": "sts:AssumeRole",\n  "Condition": { "StringEquals": { "sts:ExternalId": "mine-7731" } }\n}\nEvery caller\'s own policy allows sts:AssumeRole on this role.',
      reqs: [
        { t: 'A role in 444455556666 calls AssumeRole with ExternalId mine-7731', ok: true, why: 'The account is trusted, the ExternalId matches, and the caller\'s own policy allows the call.' },
        { t: 'A role in 444455556666 calls AssumeRole with no ExternalId', ok: false, why: 'The condition needs sts:ExternalId to equal mine-7731. Missing doesn\'t match.' },
        { t: 'A role in 444455556666 calls AssumeRole with ExternalId mine-0000', ok: false, why: 'The wrong ID. That\'s exactly what stops a confused deputy.' },
        { t: 'A user in 999988887777 calls AssumeRole with ExternalId mine-7731', ok: false, why: 'That account isn\'t in the trust policy, whatever ID it sends.' },
        { t: 'A user in 444455556666 calls AssumeRole with ExternalId mine-7731', ok: true, why: 'Trusting the account root trusts any principal in it whose own policy allows the call.' }] },
    keyvault: { title: 'The vault key', c: 'authdebug',
      ev: 'KMS key policy (account 111122223333): lets the account\'s IAM policies grant access to the key.\nRole vault-reader: identity policy allows kms:Decrypt on this key.\nRole vault-writer: identity policy allows s3:PutObject only.',
      reqs: [
        { t: 'vault-reader calls kms:Decrypt', ok: true, why: 'The key policy lets IAM policies count, and vault-reader\'s allows Decrypt.' },
        { t: 'vault-writer calls kms:Decrypt', ok: false, why: 'No IAM policy allows it for vault-writer.' },
        { t: 'vault-reader calls kms:ScheduleKeyDeletion', ok: false, why: 'Its identity policy allows only Decrypt.' },
        { t: 'An admin role in account 444455556666 calls kms:Decrypt', ok: false, why: 'The key policy trusts only its own account. Another account\'s AdministratorAccess doesn\'t reach it.' },
        { t: 'vault-writer uploads to an SSE-KMS bucket, so S3 asks for kms:GenerateDataKey', ok: false, why: 'A KMS-encrypted upload needs kms:GenerateDataKey for the caller as well as s3:PutObject.' }] },
    revoke: { title: 'Revoked at nine', c: 'roles',
      ev: 'At 09:00 the role\'s sessions were revoked. Its new inline policy:\n{\n  "Effect": "Deny", "Action": "*", "Resource": "*",\n  "Condition": { "DateLessThan": { "aws:TokenIssueTime": "09:00 today" } }\n}\nThe role\'s other policy allows s3:GetObject on the ore bucket.',
      reqs: [
        { t: 'A session issued at 08:30 reads an ore object', ok: false, why: 'Issued before 09:00, so the Deny matches.' },
        { t: 'A session issued at 09:15 reads an ore object', ok: true, why: 'Issued after the revoke: the Deny doesn\'t match and the Allow does.' },
        { t: 'A session issued at 08:59 reads an ore object', ok: false, why: 'One minute too early. Still denied.' },
        { t: 'A session issued at 10:00 deletes an ore object', ok: false, why: 'The revoke doesn\'t touch it, but nothing allows DeleteObject.' },
        { t: 'The miner assumes the role again at 09:05 with their own keys, then reads an ore object', ok: true, why: 'A fresh session, issued after the revoke.' }] }
  };

  // ---------- Questions ----------
  // From the exam bank, filed under the mines' concepts. Each Policy Sort, Field Notes room, whiteboard and event asks
  // one of a concept's at random.
  const adopt = {
    'dva-2-101': 'guardrails', 'dva-2-135': 'guardrails', 'saa-1-112': 'guardrails', 'saa-1-101': 'guardrails',
    'dva-2-109': 'credchain', 'dva-2-322': 'credchain', 'dva-2-06': 'credchain', 'dva-2-131': 'credchain',
    'dva-2-107': 'xacct', 'saa-1-105': 'xacct', 'dva-2-208': 'xacct', 'dva-2-328': 'xacct',
    'dva-2-05': 'authdebug', 'dva-2-116': 'authdebug', 'dva-2-214': 'authdebug', 'dva-4-112': 'authdebug'
  };
  (SD.bank || []).forEach(b => { if (adopt[b.id] && !SD.questions.some(q => q.id === b.id)) SD.questions.push(Object.assign({}, b, { c: adopt[b.id] })); });
  const pickQ = c => SD.qpick(SD.questions.filter(q => q.c === c && q.id && !q.lp && q.type !== 'explain'));

  // ---------- Huh??? and ELI5 ----------
  Object.assign(SD.huh, {
    guardrails: 'A permissions boundary is a level cap. Your gear (your policies) might say you can do anything, but the cap says how far you can ever go, and you get whichever is lower. An SCP is the same cap for a whole guild (an AWS account). Neither one gives you any moves on its own: they only take away.',
    credchain: 'Your code checks its pockets in a fixed order for a key: first what you handed it, then the backpack (environment variables), then the bag at home (~/.aws files), then the key the castle lends it (a container or instance role). It uses the first key it finds, even if it\'s an old one you forgot about.',
    xacct: 'Lending your castle\'s costume (a role) to a mercenary from another guild: your door has to name their guild, and their own guild has to let them go. If the mercenary works for lots of people, make them say a secret password only you two know (the ExternalId), so nobody else can send them in.',
    authdebug: 'AccessDenied is a boss with a hidden weakness. The error message is the scan: it says who you are, what you tried and, often, which rule said no. Some errors come in code (an encoded message) that STS can translate. A KMS key is its own boss with its own rulebook (the key policy).'
  });
  Object.assign(SD.eli5, {
    'dva-2-101': 'Your gear says "every skill", but your level cap only covers chest and table skills. The new skill has to be under the cap too, so raise the cap, not the gear.',
    'dva-2-135': 'The rule says you may make new costumes, but only if you stitch the official level cap onto them. Make the costume again, with the cap attached.',
    'saa-1-112': 'Three gates, and you need a yes from all three: your gear, your level cap and the guild\'s rulebook. Only the moves all three allow are left.',
    'saa-1-101': 'Let players craft their own costumes, but every costume must come with the official level cap sewn in, and nobody may unpick it.',
    'dva-2-109': 'Your character checks the backpack before asking the castle for a key. Old keys in the backpack get used every time. Empty the backpack and the castle\'s key gets used.',
    'dva-2-322': 'Stop carrying a permanent key around. Log in at the guild desk each day instead, and get a key that expires.',
    'dva-2-06': 'The delivery crew that brings your container its stuff wears one costume; your app inside wears another. The app\'s costume is the one that needs the chest permission.',
    'dva-2-131': 'A server can\'t wear a costume directly: it needs a hanger (an instance profile) to hold it. The console makes the hanger for you; on the command line you make it yourself.',
    'dva-2-107': 'Each customer gave the mercenary their own secret password. Use the right customer\'s password at their door.',
    'saa-1-105': 'Lend the mercenary a read-only costume, with a password only you two know, so another customer can\'t send them to your castle.',
    'dva-2-208': 'Borrowing a magic key from another guild takes two yeses: the key\'s own rulebook must name your guild, and your guild must let your helper use it.',
    'dva-2-328': 'Both doors already say yes. You just called the chest by its nickname, and in another guild\'s castle you have to use its full address.',
    'dva-2-05': 'The refusal came in a secret code. Ask STS to translate it, and it tells you exactly which rule said no.',
    'dva-2-116': 'The magic key has its own rulebook, and it lists only its keepers. Either write your helper\'s name in it, or let the castle\'s usual rules count for this key.',
    'dva-2-214': 'The new items are locked with a magic key. Taking one out needs permission to use that key too, not just the chest.',
    'dva-4-112': 'Since last week, every item going in has to be sealed with the magic key. Your helper needs permission to make a seal (GenerateDataKey), not just to drop things in.'
  });

  // ---------- The expedition ----------
  const plan = rows => rows;
  SD.expeditions = (SD.expeditions || []).concat([{
    id: 'denymines', name: 'The Deny Mines', who: ORDER, opens: () => true, sev: 0.85, dmg: 0.85,
    blurb: 'Straight through Mount Quota: two floors of old IAM mistakes, then out onto the upper trail.',
    back: 'Out onto the upper trail',
    cafe: { title: 'The Miners\' Canteen', who: null, name: 'The canteen', text: 'An old canteen with an honesty box. The kettle is still warm, and somebody has left cards on the counter with prices in chalk.' },
    camp: { title: 'The Lamp Room', text: 'A dry room full of miners\' lamps. Sit down for a minute, or use the bench to tune one of your cards. Each of you chooses one.' },
    regroup: [{ who: 'mate1', text: 'Everyone up? Good. Back to where this floor started. We know what\'s down there now.' }],
    floors: [
      { name: 'The Galleries', gate: 'THE DENY MINES · THE GALLERIES', map: '1', beat: 'Old policies, wildcards and keys nobody remembers leaving.',
        boss: 'asterisk', bossTitle: 'The Great Asterisk', fade: 4,
        plan: plan([['fight', 'notes', 'fight'], ['notes', 'fight', 'sort'], ['fight', 'event', 'notes'], ['elite', 'notes', 'cafe'], ['camp', 'fight', 'notes'], ['notes', 'sort', 'fight'], ['fight', 'elite', 'board'], ['event', 'notes', 'fight'], ['camp', 'cafe', 'camp']]),
        fights: ['denybat', 'wildslime', 'mimic', 'keygoblin', { ids: ['denybat', 'wildslime'] }, { ids: ['mimic', 'denybat'] }],
        elites: ['boundarywall'],
        notes: ['evalorder', 'statement', 'bucketarn', 'boundary', 'chain', 'mfa'],
        sorts: ['maps', 'boundary'],
        events: ['oldcart', 'carepack', 'wildsign'],
        intro: [
          { who: null, text: 'The Deny Mines. Rails run into the dark, and every cart is chalked with the same word: DENIED.' },
          { who: 'lead', text: 'Freya said to read the notes on the walls. She wrote them.' },
          { who: 'mate1', text: 'She also said "only two floors, darling". Let\'s see.' }],
        outro: [
          { who: null, text: 'The Great Asterisk shrinks to a small, embarrassed full stop.' },
          { who: 'mate2', text: 'Allow star on star. In a mine. Somebody should be ashamed.' },
          { who: 'lead', text: 'Down we go. The vaults are next.' }] },
      { name: 'The Trust Vaults', gate: 'THE DENY MINES · THE TRUST VAULTS', map: '1', beat: 'Doors that ask who you are, who sent you, and whether both sides agree.',
        boss: 'deputy', bossTitle: 'The Confused Deputy',
        plan: plan([['fight', 'fight', 'sort'], ['fight', 'event', 'board'], ['sort', 'cafe', 'fight'], ['elite', 'fight', 'board'], ['camp', 'sort', 'event'], ['fight', 'elite', 'cafe'], ['event', 'fight', 'board'], ['sort', 'fight', 'board'], ['camp', 'cafe', 'camp']]),
        fights: ['untrusted', 'sessionwraith', 'chainserpent', 'twokeytroll', 'errorsprite', { ids: ['untrusted', 'chainserpent'] }],
        elites: ['keykeeper'],
        sorts: ['trust', 'keyvault', 'revoke'],
        events: ['freyatrade', 'deputydoor', 'lostsession'],
        intro: [
          { who: null, text: 'Below the galleries, the mine turns into vaults: heavy doors, each with a list of names on it.' },
          { who: 'mate1', text: 'Every door here wants to know who sent us.' },
          { who: 'lead', text: 'Then we\'d better be able to say.' }],
        outro: [
          { who: null, text: 'The Confused Deputy sits down, takes off his hat, and asks who he was working for. Nobody knows.' },
          { who: 'mate2', text: 'Light. Up there. That\'s the upper trail.' },
          { who: 'lead', text: 'Out we go.' }] }
    ]
  }]);
  SD.expeditionEvents = Object.assign(SD.expeditionEvents || {}, {
    oldcart: { id: 'oldcart', title: 'An Old Mine Cart', who: null,
      text: 'A cart full of old access keys, each with a chalk label: DO NOT USE. Some of the labels have been rubbed out by thumbs.',
      choices: [
        { label: 'Rotate them out, properly', out: 'Someone has to explain where keys should come from instead. Right: a Default Credential Chain card for each of you.', fx: { ask: { c: 'credchain', right: { card: 'defchain' }, wrong: { sla: -6 } } } },
        { label: 'Pocket a few. They might be useful', out: 'Long-term keys never expire on their own. Each of you gains 25 bits; the team loses 8 SLA when the goblins smell them.', fx: { bits: 25, sla: -8 } },
        { label: 'Leave the cart alone', out: 'You walk on. The cart squeaks behind you.', fx: {} }] },
    carepack: { id: 'carepack', title: 'Freya\'s Care Package', who: null,
      text: 'A crate with a ribbon on it, and a note: "Eat something. Then pick one. xx F."',
      choices: [
        { label: 'Flask of tea', out: 'Hot and far too sweet. The team recovers 12 SLA.', fx: { sla: 12 } },
        { label: 'A stack of cards', out: 'Each of you picks a common card.', fx: { card: 'common' } },
        { label: 'Her sharpening stone', out: 'One of you refactors a card.', fx: { upgrade: 1, who: 'one' } }] },
    wildsign: { id: 'wildsign', title: 'The Wildcard Sign', who: null,
      text: 'A sign nailed over a side tunnel: "Action: *". The tunnel behind it hums.',
      choices: [
        { label: 'Read it carefully before going in', out: 'Right: each of you picks an uncommon card from the tunnel. Wrong: it bites the team for 6 SLA.', fx: { ask: { c: 'polanatomy', right: { card: 'uncommon' }, wrong: { sla: -6 } } } },
        { label: 'Scrub it out (15 bits each)', out: 'Each of you pays 15 bits and removes a card you no longer need.', fx: { cost: 15, remove: 1 } },
        { label: 'Walk past', out: 'You don\'t go in. Nobody regrets it.', fx: {} }] },
    freyatrade: { id: 'freyatrade', title: 'A Voice in the Pipe', who: 'freya', per: true,
      text: 'Freya\'s voice comes down an old speaking pipe: "Darling, that AdministratorAccess of mine must be heavy down there. Swap it for two little ones that only open what you need?"',
      choices: [
        { label: 'Trade it for two scoped cards', out: 'AdministratorAccess goes up the pipe. Down come Require an ExternalId and Read the Boundary. "Least privilege. I\'m so proud."', fx: { trade: { give: 'adminaccess', get: ['extid', 'readbound'] } } },
        { label: 'Keep it', out: '"Suit yourself. Read the fine print."', fx: {} }] },
    deputydoor: { id: 'deputydoor', title: 'The Deputy\'s Door', who: null,
      text: 'A vault door with a brass plate: "Vendors welcome. State which customer you act for."',
      choices: [
        { label: 'Work out what the plate is for', out: 'Right: each of you gains 20 bits from the vendor\'s tip jar. Wrong: the door slams on the team for 6 SLA.', fx: { ask: { c: 'xacct', right: { bits: 20 }, wrong: { sla: -6 } } } },
        { label: 'Knock and wait', out: 'Nobody answers. You rest by the door: the team recovers 6 SLA.', fx: { sla: 6 } }] },
    lostsession: { id: 'lostsession', title: 'A Session on the Floor', who: null,
      text: 'Someone dropped a role session\'s credentials here. They still work. For a few more hours.',
      choices: [
        { label: 'Figure out how to kill it', out: 'Right: one of you refactors a card. Wrong: whoever finds it next costs the team 6 SLA.', fx: { ask: { c: 'roles', right: { upgrade: 1, who: 'one' }, wrong: { sla: -6 } } } },
        { label: 'Leave it for the wraiths', out: 'Each of you gains 10 bits from the pockets next to it, and feels slightly bad.', fx: { bits: 10 } }] }
  });

  // ---------- Playing it ----------
  // The mines' words in the story's voice: 'lead' is you, mate1 and mate2 your first two companions.
  function say(list) {
    const me = lead(), mates = ORDER.filter(x => x !== me);
    const who = w => (w === 'mate1' ? mates[0] : w === 'mate2' ? mates[1] : w || 'narr');
    return SD.ch1m && SD.ch1m.say ? SD.ch1m.say(list.map(l => [who(l.who), l.text, l.e])) : Promise.resolve();
  }
  const story = extra => Object.assign({
    story: true, label: 'Borderlands', xp: 'denymines', champNames: true, deckFor, pickQ, say,
    onMiss: q => { if (q && q.c && SD.ch1m && SD.ch1m.miss) SD.ch1m.miss(q.c); }
  }, extra);

  // A join screen: the open parties at the cave, and a box for a friend's code.
  function joinScreen(root, dir) {
    const esc = U.esc, net = SD.net;
    return new Promise(res => {
      let off = null;
      const draw = () => {
        const list = dir.tables().filter(t => net.cleanCode(t.code).length >= 4);
        root.innerHTML = `<div class="mi-card rd"><span class="mi-tag">Borderlands · The Deny Mines</span><h2 style="margin:2px 0 6px">Join a party</h2>
          ${list.length ? `<ul class="mn-list">${list.map(t => `<li><b>${esc(t.nick || 'A party')}</b> <small class="muted">${t.players | 0}/${t.max | 0}${t.info ? ' · ' + esc(t.info) : ''}</small> <button class="mi-btn sm" type="button" data-code="${esc(net.cleanCode(t.code))}">Join</button></li>`).join('')}</ul>` : '<p class="muted">No open parties right now. Ask a friend for their code.</p>'}
          <label class="pt-lbl" for="mn-code">A friend's code<input id="mn-code" maxlength="6" autocomplete="off" placeholder="M7KQP"></label>
          <p class="muted small" id="mn-why" role="status"></p>
          <div class="row"><button class="primary" type="button" id="mn-go">Join</button><button class="ghost" type="button" id="mn-back">Back to the cave</button></div></div>`;
        root.querySelectorAll('[data-code]').forEach(b => { b.onclick = () => done(b.dataset.code); });
        root.querySelector('#mn-go').onclick = () => {
          const c = net.cleanCode(root.querySelector('#mn-code').value);
          if (c.length !== 5 || net.gameOf(c) !== 'mines') { root.querySelector('#mn-why').textContent = 'Mines codes are 5 letters and start with M, like M7KQP.'; return; }
          done(c);
        };
        root.querySelector('#mn-back').onclick = () => done(null);
      };
      const done = c => { if (off) off(); res(c); };
      off = dir.onTables(() => draw()) || null;
      draw();
    });
  }

  // From the cave mouth (js/ch1-mountain.js): how is 'solo', 'party' or 'join'. onDone runs once the mines are cleared;
  // leaving them any other way puts you back at the cave mouth.
  async function mines(how, onDone) {
    const RD = SD.raid, net = SD.net, M = SD.ch1m;
    SD.main.show('run');
    const root = U.$('#run');
    if (lead()) CH.setMine(lead());
    let won = false;
    const onEnd = r => { won = !!(r && r.won); };
    const back = () => { M.enter(); if (M.debug && M.debug.place) M.debug.place(16, 30); };
    let hub = null, dir = null;
    try {
      hub = await net.open();
      if (how === 'solo') {
        await RD.play(root, hub, net.code('mines'), story({ create: true, auto: { bots: ORDER.filter(x => x !== lead()) }, onEnd }));
      } else {
        dir = await hub.directory('mines');
        let code = null, create = how === 'party';
        if (create) code = net.code('mines');
        else code = await joinScreen(root, dir);
        if (code) {
          // The leader keeps the party on the cave's list while it waits in the party room (as the Guild Hall does).
          let status = null, last = '', hosting = false, listed = true;
          const beat = () => {
            const st = status ? status() : null;
            if (!st || !st.lead) { if (hosting) { hosting = false; last = ''; dir.unhost(); } return; }
            const info = { code, nick: hub.me.nick, players: st.players, max: st.max, open: !!(listed && st.open), champ: st.champ || null, info: net.clean(st.info, 48) };
            const j = JSON.stringify(info);
            if (j !== last) { last = j; hosting = true; dir.host(info); }
          };
          const poll = setInterval(beat, 1000);
          try {
            await RD.play(root, hub, code, story({ create, onEnd, status: f => { status = f; beat(); }, vis: { get: () => listed, set: v => { listed = !!v; beat(); } } }));
          } finally { clearInterval(poll); if (hosting) dir.unhost(); }
        }
      }
    } catch (e) {
      console.warn('Deny Mines:', e);
    } finally {
      if (dir) dir.leave();
    }
    if (won) onDone(); else back();
  }
  if (SD.ch1m) SD.ch1m.mines = mines;
  // The cave's lobby offers a party once the networking is here (js/net.js, js/party.js, js/raid.js).
  SD.ch1mines = { party: !!SD.net, deckFor, pickQ };
})();
