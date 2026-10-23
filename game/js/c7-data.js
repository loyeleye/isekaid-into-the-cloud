// Chapter 7, Root (floor 100): everything the raid engine (js/raid.js) plays, as data. The concepts with their links,
// the new cards (what the camp hands you, the floors' rewards, the gift basket and Gary's Deny), the enemies (their art
// is in js/c7-art.js), the Field Notes and Policy Sorts, the events, and the last expedition:
//   Root (Master, 5 raid floors)   1 The Sessions (the Session Keeper), 2 The Policy Book (the Chaplain), 3 The Throne
//                                  Room (the Steward of Root), then the roof (not a fight), 4 The Free Tier (the Grant
//                                  Itself), 5 The Top (Freya: one elite per blessing she still wears, then her virus
//                                  form). If Kagemaru was given the run of the camp, a sixth floor: her backup.
// js/c7-world.js builds the climb from the save before it starts (which blessings are left, which floor a loss
// restarts from, whether the backup floor is there). The overworld, the roof and the story are js/c7-world.js; the
// Huh??? and ELI5 lines js/c7-help.js. AWS facts follow the current AWS documentation (IAM's revoke-sessions policy and
// policy evaluation logic, session policies and permissions boundaries, the root user, AWS Organizations and SCPs,
// consolidated billing, Control Tower controls, IAM Identity Center, IAM Access Analyzer, AWS Config, AWS Artifact,
// Security Hub, Detective, AWS RAM, Service Catalog, License Manager, the Well-Architected Tool). Every explanation is
// written fresh.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const D = SD.c7data = {};

  // ---------- Concepts ----------
  const C = (name, gist, page) => ({ name, zone: 7, gist, page });
  Object.assign(SD.concepts, {
    revoke: C('Revoking a Role\'s Sessions', 'Temporary credentials keep working until they expire, up to the role\'s maximum session duration (1 to 12 hours). Revoking a role\'s active sessions attaches an inline policy, AWSRevokeOlderSessions, that denies every action when aws:TokenIssueTime is earlier than the moment you revoked. Sessions issued after it are untouched, so whoever legitimately uses the role just gets fresh credentials. It needs iam:PutRolePolicy, and it\'s an explicit Deny, so nothing can overrule it.', 'Revoke the sessions first. Then the role. — Kyu, her last page'),
    sesspol: C('Session Policies and the Whole Evaluation', 'A request is checked against every policy that applies. Any explicit Deny ends it. Otherwise SCPs (and resource control policies) set the most the account can do, a resource policy or an identity policy must allow it, and a permissions boundary and a session policy each cut the result down to where they overlap. A session policy is passed in the AssumeRole call (inline, or up to 10 managed policy ARNs) and can only narrow the session, never widen it. With no Allow anywhere, the answer is the implicit deny.', 'Every page of the book, in the order it\'s read. — the Chaplain'),
    rootuser: C('The Root User and MFA', 'Each account\'s root user can do everything in it, and nothing written in IAM inside that account can restrict it. A few tasks need it: changing the root user\'s own email or password, closing the account, turning on MFA delete for an S3 bucket, unlocking a bucket policy that denies everyone. So: MFA on it, no access keys for it, and sign in as it only for those tasks. In an organization, an SCP does bind a member account\'s root user, and the management account can remove member accounts\' root credentials and run short privileged root sessions instead.', 'Nothing written in the Cloud can touch it. — the Steward'),
    sharedresp: C('The Shared Responsibility Model', 'AWS secures the cloud itself: the buildings, the hardware, the network, the hypervisor, and the software that runs its managed services. You secure what you put in it: your data, who can reach it (IAM), how it\'s encrypted, your security groups, and anything you run yourself, such as an EC2 instance\'s operating system and patches. The line moves with the service: on RDS AWS patches the database engine; on Lambda it runs the whole runtime; your data and access are always yours.', 'It\'s someone else\'s job. It always is, until it isn\'t. — the Shared Responsibility'),
    compliance7: C('Compliance: AWS Config and AWS Artifact', 'AWS Config records how your resources are configured and checks them against rules (managed or your own), all the time; a conformance pack deploys a set of rules as one unit, across an organization if you like, and remediation can fix what fails with Systems Manager Automation. An aggregator shows every account and Region in one place. AWS Artifact is where you download AWS\'s own audit reports (SOC, PCI, ISO) and accept agreements such as a BAA. Config proves your side; Artifact proves AWS\'s.', 'Show me it\'s true, not that you meant it. — Elder Wren'),
    orgs: C('AWS Organizations and Consolidated Billing', 'An organization is one management account and any number of member accounts, grouped in organizational units under the organization\'s root. Accounts are the strongest boundary AWS has: give each team or workload its own. Consolidated billing puts them all on one bill, paid by the management account, and adds their usage together so volume tiers are reached sooner; Reserved Instance and Savings Plans discounts are shared across accounts unless you turn sharing off. Policies attached to the root, an OU or an account (SCPs, tag, backup and other policies) apply to everything beneath.', 'Member account. Member of what? — Dutch'),
    scps: C('Service Control Policies', 'An SCP sets the most that the IAM users and roles in a member account can do, the account\'s root user included. It grants nothing: someone still needs an IAM Allow. It never affects the management account, or service-linked roles. FullAWSAccess is attached everywhere by default, so most SCPs are deny lists; an allow list means an Allow at every level from the root down to the account. To stop a member account\'s root user, deny with the condition aws:PrincipalArn like arn:aws:iam::*:root.', 'A Deny on the organization binds even root. — Gary, 1984'),
    controltower: C('Control Tower and IAM Identity Center', 'Control Tower sets up a landing zone: an organization with a log archive account and an audit account, and controls applied to OUs. Preventive controls stop things (SCPs or RCPs), detective ones report them (AWS Config rules), proactive ones check CloudFormation resources before they\'re made (hooks). Account Factory makes new accounts with the same baseline. IAM Identity Center signs people in once, with MFA, from its own directory or your identity provider, and gives them permission sets in the accounts they\'re assigned to: short-lived role credentials, never IAM users.', 'One way in, with a second factor, for everyone, to only what they need. — Uptima'),
    leastpriv: C('Least Privilege with IAM Access Analyzer', 'Grant only what\'s needed, then keep cutting. IAM Access Analyzer can generate a policy from what a role actually did in CloudTrail, list unused roles, keys, passwords and permissions across an organization, find resources shared outside your zone of trust, and validate policies before you save them. Last accessed information shows which services a principal hasn\'t touched in months.', 'Everything here is free. Read what it costs. — the Fine Print'),
    ir7: C('Incident Response: Security Hub and Detective', 'GuardDuty finds threats; Security Hub CSPM gathers findings from GuardDuty, Inspector, Macie and others into one place, across accounts, and checks them against standards such as AWS Foundational Security Best Practices. Detective builds a graph from CloudTrail, VPC flow logs and findings, so you can see what a role or IP address did and when it started. Contain first: revoke the role\'s sessions or deactivate the leaked keys, isolate an instance with a security group that allows nothing, snapshot its volumes for evidence. Then investigate, then recover.', 'Stop it, then look, then fix it. In that order. — Seymour'),
    sharing: C('Many Accounts: RAM, Service Catalog, License Manager', 'Once every band has its own account, some things still need sharing. AWS RAM shares resources such as subnets and transit gateways with other accounts or the whole organization. Service Catalog offers approved products (CloudFormation templates with constraints) to people who can\'t write their own. License Manager tracks software licences against the rules you set. The Well-Architected Tool reviews a workload against the six pillars and records each milestone.', 'Everyone keeps their own house. Some roads are shared. — Uptima')
  });
  SD.links.push(
    { id: 'revoke-roles', a: 'revoke', b: 'roles', text: 'A role\'s temporary credentials expire by themselves; revoking its sessions ends the ones already issued, now.' },
    { id: 'revoke-iam', a: 'revoke', b: 'iam', text: 'The revoke policy is an explicit Deny, so it wins over every Allow the sessions ever had.' },
    { id: 'revoke-ir7', a: 'revoke', b: 'ir7', text: 'Leaked role credentials: revoke the sessions first, then find out what they did.' },
    { id: 'sesspol-guardrails', a: 'sesspol', b: 'guardrails', text: 'A boundary, a session policy and an SCP never grant: each only cuts what an Allow gave.' },
    { id: 'sesspol-iampol', a: 'sesspol', b: 'iampol', text: 'Identity, resource, boundary, session: the whole book, read in one pass, and any Deny ends it.' },
    { id: 'rootuser-scps', a: 'rootuser', b: 'scps', text: 'Nothing in IAM binds a root user; an SCP on its member account does.' },
    { id: 'rootuser-conditions', a: 'rootuser', b: 'conditions', text: 'The temple\'s MFA condition, one last time: the root user needs a second factor more than anyone.' },
    { id: 'sharedresp-compliance7', a: 'sharedresp', b: 'compliance7', text: 'Artifact proves AWS\'s half of the bargain; Config rules prove yours.' },
    { id: 'orgs-scps', a: 'orgs', b: 'scps', text: 'An SCP attached to an OU binds every member account under it, but never the management account.' },
    { id: 'orgs-costtools', a: 'orgs', b: 'costtools', text: 'Cost allocation tags and Budgets are set in the management account and read across the whole bill.' },
    { id: 'controltower-federation', a: 'controltower', b: 'federation', text: 'The Sealed Floors\' Identity Center again: one sign-in, a permission set in each account.' },
    { id: 'controltower-scps', a: 'controltower', b: 'scps', text: 'Control Tower\'s preventive controls are SCPs (or RCPs), applied to whole OUs at once.' },
    { id: 'leastpriv-iampol', a: 'leastpriv', b: 'iampol', text: 'Access Analyzer writes the narrow policy from what was really used.' },
    { id: 'ir7-detect', a: 'ir7', b: 'detect', text: 'GuardDuty sees it, Security Hub gathers it, Detective shows what else happened.' },
    { id: 'sharing-orgs', a: 'sharing', b: 'orgs', text: 'RAM and Service Catalog share across the organization without a single invitation.' }
  );

  // ---------- Cards ----------
  // ch: 7 keeps them in this chapter's rewards. What the camp teaches turns up in your deck (js/c7-world.js).
  const card = (name, cost, o) => Object.assign({ name, cost, kind: 'action', ch: 7, rarity: 'common', tags: [] }, o);
  Object.assign(SD.cards, {
    // The Sessions
    'r7-revoke':    card('Revoke Active Sessions', 1, { pow: 10, tags: ['revoke', 'deny'], art: 'undo', concept: 'revoke', text: 'Every session issued before now is denied. The ones issued after work fine.' }),
    'r7-tokentime': card('aws:TokenIssueTime', 1, { pow: 8, mit: 2, tags: ['revoke', 'condition'], art: 'clock', concept: 'revoke', text: 'Mitigate {mit}. Deny when the token was issued before a time. The time is now.' }),
    'r7-short':     card('Shorter Sessions', 1, { pow: 7, draw: 1, tags: ['expiry'], art: 'clock', concept: 'roles', text: 'Draw 1. A one-hour maximum session for the next ones. It can\'t shorten the ones already out.' }),
    'r7-deny':      card('Explicit Deny', 1, { pow: 9, tags: ['deny'], art: 'lock', concept: 'iam', text: 'One last time: a Deny anywhere beats every Allow everywhere.' }),
    'r7-keys':      card('Deactivate the Key', 1, { pow: 8, tags: ['keys', 'revoke'], art: 'key', concept: 'ir7', text: 'A leaked access key, set to Inactive before anything else. Delete it once nothing needs it.' }),
    'r7-trail':     card('Read the Trail', 1, { pow: 7, reveal: true, tags: ['trail'], art: 'eye', concept: 'cloudtrail', text: 'Reveal weaknesses. Whose session, issued when, and what it did with it.' }),
    // The Policy Book
    'r7-sesspol':   card('Session Policy', 1, { pow: 8, abs: { any: 3 }, tags: ['session'], art: 'note', concept: 'sesspol', text: 'Absorb {any}. Passed with AssumeRole, it narrows this session and never widens it.' }),
    'r7-boundary':  card('Permissions Boundary', 1, { pow: 9, tags: ['boundary'], art: 'gate', concept: 'sesspol', text: 'The most a role can ever do, whatever its own policy says.' }),
    'r7-respol':    card('Read the Resource Policy', 1, { pow: 8, tags: ['resource'], art: 'open', concept: 'respolicy', text: 'The bucket has its own page in the book. Read it too.' }),
    'r7-simulate':  card('Policy Simulator', 1, { pow: 6, reveal: true, draw: 1, tags: ['simulate'], art: 'eye', concept: 'sesspol', text: 'Reveal weaknesses, draw 1. Ask what would happen, before it does.' }),
    'r7-validate':  card('Validate the Policy', 1, { mit: 6, tags: ['validate', 'least'], art: 'eye', concept: 'leastpriv', text: 'Mitigate {mit}. Access Analyzer reads it before you save it, and says what\'s wrong.' }),
    'r7-evalorder': card('Every Page, in Order', 2, { pow: 12, tags: ['deny', 'boundary', 'session'], art: 'note', rarity: 'uncommon', concept: 'sesspol', text: 'Deny first. Then the limits. Then an Allow. Then the answer.' }),
    // The Throne Room
    'r7-mfa':       card('MFA on Root', 1, { pow: 9, tags: ['mfa', 'root'], art: 'key', concept: 'rootuser', text: 'A second factor on the one sign-in that can do everything.' }),
    'r7-nokeys':    card('No Root Keys', 1, { pow: 8, draw: 1, tags: ['root', 'nokeys'], art: 'lock', concept: 'rootuser', text: 'Draw 1. The root user has no access keys. None. Ever.' }),
    'r7-shared':    card('Whose Job Is It?', 1, { pow: 8, mit: 2, tags: ['shared'], art: 'globe', concept: 'sharedresp', text: 'Mitigate {mit}. AWS: the building. You: everything you put in it.' }),
    'r7-config':    card('Config Rule', 2, { kind: 'infra', each: { any: 2 }, pow: 6, tags: ['config'], art: 'eye', concept: 'compliance7', text: 'Infra. Each turn absorb 2 load. It checks every resource, every time it changes.' }),
    'r7-artifact':  card('AWS Artifact', 1, { pow: 7, draw: 1, tags: ['artifact', 'shared'], art: 'note', concept: 'compliance7', text: 'Draw 1. AWS\'s own audit reports, downloaded. Their half, proved.' }),
    'r7-pack':      card('Conformance Pack', 2, { pow: 11, tags: ['config', 'artifact'], art: 'box', rarity: 'uncommon', concept: 'compliance7', text: 'A whole set of rules, deployed as one, to every account.' }),
    // The Free Tier
    'r7-least':     card('Least Privilege', 1, { pow: 9, tags: ['least'], art: 'gate', concept: 'leastpriv', text: 'Exactly what\'s needed. Then less.' }),
    'r7-generate':  card('Generate From Activity', 1, { pow: 8, draw: 1, tags: ['least', 'trail'], art: 'trace', concept: 'leastpriv', text: 'Draw 1. Access Analyzer writes the policy from what the role really did.' }),
    'r7-consol':    card('Consolidated Bill', 1, { pow: 8, abs: { any: 3 }, tags: ['bill'], art: 'coin', concept: 'orgs', text: 'Absorb {any}. One bill for every account, and their usage counted together.' }),
    'r7-budget':    card('A Budget per Account', 1, { mit: 6, tags: ['budget', 'bill'], art: 'coin', concept: 'costtools', text: 'Mitigate {mit}. An alert at 80% of the forecast, account by account.' }),
    'r7-anomaly':   card('Cost Anomaly Detection', 1, { pow: 7, reveal: true, tags: ['anomaly', 'bill'], art: 'eye', concept: 'costtools', text: 'Reveal weaknesses. Spend that doesn\'t look like last week\'s, flagged.' }),
    'r7-unused':    card('Unused Access', 2, { pow: 11, mit: 2, tags: ['least', 'unused'], art: 'trace', rarity: 'uncommon', concept: 'leastpriv', text: 'Mitigate {mit}. Every role and permission nobody has used in 90 days, across the organization.' }),
    // The roof and the Top
    'r7-ou':        card('Organizational Unit', 1, { pow: 8, tags: ['org', 'ou'], art: 'box', concept: 'orgs', text: 'Every band in its own account, and the accounts in OUs. A policy on the OU reaches all of them.' }),
    'r7-tower':     card('Control Tower', 2, { kind: 'infra', each: { any: 3 }, pow: 6, tags: ['tower', 'scp'], art: 'gate', concept: 'controltower', text: 'Infra. Each turn absorb 3 load. A landing zone, and controls on every OU.' }),
    'r7-idc':       card('IAM Identity Center', 1, { pow: 9, draw: 1, tags: ['idc', 'mfa'], art: 'key', concept: 'controltower', text: 'Draw 1. One sign-in, with MFA, and a permission set in each account.' }),
    'r7-hub':       card('Security Hub', 1, { pow: 8, reveal: true, tags: ['hub', 'ir'], art: 'eye', concept: 'ir7', text: 'Reveal weaknesses. Every finding from every account, in one place.' }),
    'r7-detective': card('Detective', 1, { pow: 9, tags: ['detective', 'ir'], art: 'trace', concept: 'ir7', text: 'What else that role did, from where, and since when.' }),
    'r7-isolate':   card('Isolate and Snapshot', 1, { mit: 6, abs: { any: 3 }, tags: ['isolate', 'ir'], art: 'lock', concept: 'ir7', text: 'Mitigate {mit}, absorb {any}. A security group that allows nothing, and a snapshot for evidence.' }),
    'r7-ram':       card('Resource Share', 1, { pow: 7, draw: 1, tags: ['ram', 'org'], art: 'trace', concept: 'sharing', text: 'Draw 1. The camp\'s network, shared with every band\'s account through AWS RAM.' }),
    // Gary's Deny, from the roof (js/c7-world.js), and Kyu's page, after she comes back.
    'r7-scp':       card('Gary\'s Deny', 1, { pow: 15, mit: 4, tags: ['scp', 'deny', 'root', 'org'], art: 'lock', rarity: 'rare', quest: true, concept: 'scps', text: 'Mitigate {mit}. A service control policy from 1984, scoped to the Cloud\'s root user, and attached at last.' }),
    'r7-kyu':       card('Kyu\'s Answer', 0, { draw: 2, gain: 1, exhaust: true, tags: ['revoke', 'trail'], art: 'note', rarity: 'rare', quest: true, concept: 'revoke', text: 'Exhaust. Draw 2, +1 Capacity. "Ask me again tomorrow." She answers fast; you\'ll have to keep up.' }),
    // The gift basket: what each band put in it. Freya opens it at the Top.
    'r7-letter':    card('A Delivered Letter', 0, { pow: 10, tags: ['dlq', 'letter'], art: 'note', rarity: 'rare', quest: true, concept: 'dlqredrive', text: 'From Thornwick. It arrived, and somebody read it. Every Message Reaches Her has no hold on it.' }),
    'r7-loaf':      card('A Loaf From Halcyon', 0, { pow: 8, abs: { any: 6 }, tags: ['spread', 'loaf'], art: 'box', rarity: 'rare', quest: true, concept: 'ddbkey', text: 'Absorb {any}. Shared out at the market, a slice each. Draws From One has nobody to draw from.' }),
    'r7-seal':      card('A Seal With Nothing Under It', 0, { pow: 10, tags: ['key', 'seal'], art: 'lock', rarity: 'rare', quest: true, concept: 'kmskeys', text: 'From the Sealed Floors, opened and empty. The right key, turned. Sealed falls open.' }),
    'r7-lantern':   card('A Lantern With No Flame', 0, { mit: 8, tags: ['rollback', 'lantern'], art: 'clock', rarity: 'rare', quest: true, concept: 'deploycfg', text: 'Mitigate {mit}. From the Arcanum, put out on purpose. Rewritten has nothing left to roll back.' })
  });
  D.CARDS = { root: ['r7-revoke', 'r7-tokentime', 'r7-short', 'r7-deny', 'r7-keys', 'r7-trail', 'r7-sesspol', 'r7-boundary', 'r7-respol', 'r7-simulate', 'r7-validate', 'r7-evalorder',
    'r7-mfa', 'r7-nokeys', 'r7-shared', 'r7-config', 'r7-artifact', 'r7-pack', 'r7-least', 'r7-generate', 'r7-consol', 'r7-budget', 'r7-anomaly', 'r7-unused',
    'r7-ou', 'r7-tower', 'r7-idc', 'r7-hub', 'r7-detective', 'r7-isolate', 'r7-ram'] };
  // The basket's gifts, by band, and the stone Twinwater gave in chapter 6.
  D.BASKET = ['r7-letter', 'r7-loaf', 'r7-seal', 'r7-lantern', 'r6-stone'];
  // The cards that are IAM policy written inside the Cloud: the Steward of Root refuses all of them.
  D.IAMCARDS = ['allowstmt', 'assumerole', 'trustpol', 'respol', 'sessionlen', 'reassume', 'blessing', 'r7-deny', 'r7-revoke', 'r7-tokentime', 'r7-sesspol', 'r7-boundary', 'r7-respol', 'r7-evalorder', 'r7-least'];

  // ---------- Enemies ----------
  // F(id, name, short, cause, sev, concept, tier, flavor, symptom, weak, resist, pattern, more)
  const r = n => ({ t: 'read', n }), w = n => ({ t: 'write', n }), b = n => ({ t: 'burst', n }), up = u => (u ? { t: 'escalate', up: u } : { t: 'escalate' });
  const E = {};
  const F = (id, name, short, cause, sev, concept, tier, flavor, symptom, weak, resist, pattern, more) => {
    E[id] = Object.assign({ name, short, cause, sev, concept, tier, sprite: 'r7-' + id, flavor, symptom, weak, resist, pattern, ch: 7, raid: true }, tier === 2 ? { elite: true } : tier === 3 ? { boss: true } : {}, more);
  };
  const IAMRES = { allow: 'Nothing written in IAM inside the account reaches root.', deny: 'A Deny in IAM doesn\'t bind the root user of its own account.', boundary: 'Root has no boundary.', session: 'Root isn\'t a session.', resource: 'A resource policy in the account doesn\'t stop its root user, who can rewrite most of them.', revoke: 'Root\'s sign-in isn\'t a role session.' };
  // Floor 1, the Sessions
  F('oldtoken', 'The Old Token', 'Old Token', 'A session issued before the party arrived, and it still works', 30, 'revoke', 1, 'He was given his credentials yesterday. Nobody has asked for them back.',
    'Freya\'s role was cut back hours ago, but a session she started before then still has its old permissions until it expires.',
    { revoke: 'Revoke the role\'s active sessions: every token issued before now stops working.', condition: 'A Deny on aws:TokenIssueTime earlier than now.' },
    { expiry: 'A shorter maximum only applies to sessions issued from now on.' }, [r(7), w(7), b(8)]);
  F('longsession', 'The Long Session', 'Long Session', 'Twelve hours, and eleven of them still to go', 30, 'roles', 1, 'He yawns. He has all day.',
    'The role\'s maximum session duration is 12 hours. A stolen session from this morning works until tonight.',
    { revoke: 'Revoke it now instead of waiting it out.', expiry: 'And a shorter maximum for every session after.' },
    { keys: 'There\'s no key to deactivate: it\'s a session.' }, [w(7), r(7), up()]);
  F('assumer', 'The Second Hand', 'Second Hand', 'A role that assumes another role, and keeps both', 28, 'stschain', 1, 'He has her badge, and another badge he got with it.',
    'A session of Freya\'s role was used to assume a second role. Revoking the first does nothing to the second session.',
    { revoke: 'Revoke the second role\'s sessions too.', trail: 'CloudTrail\'s AssumeRole events show where the chain went.' },
    { deny: 'A Deny on the first role doesn\'t reach the second.' }, [r(7), b(8), r(6)]);
  F('copygrant', 'The Copy in Every Grant', 'Copy in Every Grant', 'Freya, in every role that names her', 50, 'revoke', 2, 'Every trust policy in the Cloud has her name in it. Every one of them answers.',
    'Freya is trusted by dozens of roles in every band. Each can be assumed again the moment one is closed.',
    { deny: 'An explicit Deny on her principal in each role, or the trust taken out.', revoke: 'And every session she already has, revoked.', trail: 'Read the trail for every role that names her.' },
    { allow: 'She has all the Allow she wants.' }, [w(10), r(10), up(), b(12)], { denies: ['blessing'] });
  F('keeper7', 'The Session Keeper', 'Session Keeper', 'Every turn, one of Freya\'s old sessions acts', 90, 'revoke', 3, 'He keeps a drawer of sessions she opened over ten thousand years. He takes one out every turn and lets it work.',
    'Freya holds sessions issued long before the party arrived. Each one still works, and changing her policies doesn\'t stop a session that\'s already allowed.',
    { revoke: 'Revoke the active sessions: everything issued before now is denied, at once.', condition: 'Deny on aws:TokenIssueTime before now.', deny: 'An explicit Deny can\'t be overruled.', trail: 'Read which sessions are still being used.' },
    { expiry: 'Waiting for them to expire is how he wins.', allow: 'More Allow is the drawer.' }, [r(12), w(13), b(14), up(3), w(14)]);
  F('oldsession', 'An Old Session', 'Old Session', 'One of the drawer\'s, out and working', 32, 'revoke', 1, 'Issued in a year with too many digits.', 'It acts as if Freya were still allowed everything.',
    { revoke: 'Revoked with the others.', condition: 'Issued before now: denied.' }, { expiry: 'It expires next week.' }, [r(8), w(8)]);
  // Floor 2, the Policy Book
  F('implicit', 'The Implicit Deny', 'Implicit Deny', 'A request nothing allows, and nothing denies', 28, 'iam', 1, 'He doesn\'t say no. He just never says yes.',
    'The camp\'s role calls s3:GetObject on a bucket. No identity policy or bucket policy allows it, so it\'s refused.',
    { allow: 'An Allow for exactly that action, on exactly that resource.', resource: 'Or the bucket policy allows the role.' },
    { deny: 'A Deny makes it worse.' }, [r(6), w(7), b(7)]);
  F('wildcard7', 'The Old Wildcard', 'Old Wildcard', 'Action "*", Resource "*", from the very first temple', 30, 'leastpriv', 1, 'He has been allowed everything since chapter 1. He doesn\'t remember why.',
    'A role made on the first day still has AdministratorAccess. It\'s been used for three things in a year.',
    { least: 'Cut it to what\'s used. Access Analyzer can write that policy from the trail.', boundary: 'A boundary caps it while you do.', validate: 'Validate the new policy before you save it.' },
    { allow: 'He has every Allow there is.' }, [w(7), r(7), up()], { denies: ['adminaccess'] });
  F('narrow', 'The Narrow Session', 'Narrow Session', 'A session policy narrower than the job', 28, 'sesspol', 1, 'He can read. He can\'t write. He was hired to write.',
    'A job assumes a role that allows s3:PutObject, but passes a session policy that only allows s3:GetObject. Its writes fail.',
    { session: 'The session gets only what both the role and its session policy allow: widen the session policy, not the role.', simulate: 'The simulator shows which policy cut it.' },
    { allow: 'Adding to the role changes nothing while the session policy leaves it out.' }, [r(7), b(7), r(6)]);
  F('otherbucket', 'The Other Account\'s Bucket', 'Other Bucket', 'Your side says yes; its side never did', 30, 'respolicy', 1, 'He lives in another account. He has never heard of you.',
    'A role in the camp\'s account is allowed s3:GetObject on a bucket in another account, but the bucket\'s policy doesn\'t name the role.',
    { resource: 'Across accounts, both sides must allow it: the bucket policy too.', allow: 'Your side\'s Allow is half of it.' },
    { admin: 'AdministratorAccess stops at your own account\'s edge.' }, [r(7), w(7), b(8)]);
  F('notboundary', 'The Boundary That Wasn\'t', 'Boundary That Wasn\'t', 'A boundary that was meant to be on every role', 50, 'sesspol', 2, 'He was going to be attached. He meant to be.',
    'Roles made by the bands can attach any policy. The permissions boundary that should cap them was never required, so one role gave itself AdministratorAccess.',
    { boundary: 'Require the boundary: allow iam:CreateRole only with the iam:PermissionsBoundary condition naming it.', evalorder: 'Then every role\'s Allow is cut to the boundary.', deny: 'And deny removing it.' },
    { allow: 'An Allow on top of a missing boundary is the problem.' }, [w(10), r(10), up(), b(12)]);
  F('chaplain', 'The Chaplain', 'Chaplain', 'The gate from chapter 1 again: every mask, every condition', 92, 'sesspol', 3, 'He reads the whole book aloud, page by page, and asks which page you\'re on.',
    'Each turn the Chaplain shows a request and its policies: identity, resource, boundary, session, an SCP. Get the order wrong, and he lets the wrong one through.',
    { deny: 'An explicit Deny anywhere ends it first.', boundary: 'A boundary only cuts.', session: 'A session policy only cuts.', resource: 'A resource policy can allow, and across accounts must.' },
    { allow: 'An Allow never beats a Deny.', admin: 'His gate was never about how much you\'re allowed.' }, [r(12), w(13), b(14), up(3), r(14)], { denies: ['blessing', 'adminaccess'] });
  F('mask', 'A Chaplain\'s Mask', 'Mask', 'One of the temple masks, worn by a policy', 32, 'iam', 1, 'It smiles like Freya.', 'Under the mask, a Condition you didn\'t read.',
    { deny: 'Read for a Deny first.', session: 'And what the session allows.' }, { allow: 'Allowing more doesn\'t lift a mask.' }, [r(8), w(8)]);
  // Floor 3, the Throne Room
  F('root', 'Root', 'Root', 'The one sign-in nothing written in the Cloud can touch', 32, 'rootuser', 1, 'He has never been told no. He has never needed a reason.',
    'The Cloud\'s root user is signed in, and IAM policies in its own account don\'t apply to it.',
    { mfa: 'MFA on the root user.', root: 'And use root only for the tasks that need it.' }, IAMRES, [r(7), w(8), b(8)]);
  F('nomfa', 'No MFA', 'No MFA', 'A password, and nothing behind it', 28, 'rootuser', 1, 'One door, one key, and the key is a word anyone can guess.',
    'The account\'s root user has no MFA device, and its password was written on a prayer slip.',
    { mfa: 'A second factor. Even root needs one, root most of all.', nokeys: 'And no access keys for it either.' },
    { allow: 'Permissions don\'t make a password stronger.' }, [w(7), r(7), up()]);
  F('rootkey', 'The Root Key', 'Root Key', 'An access key for the root user, in a script', 30, 'rootuser', 1, 'He opens every door in the Cloud, and he lives in a text file.',
    'A deployment script signs its calls with an access key that belongs to the root user.',
    { nokeys: 'Move the script to a role, then delete the root user\'s key.', mfa: 'And MFA on the root sign-in.' },
    IAMRES, [r(7), b(8), r(7)]);
  F('sharedfoe', 'The Shared Responsibility', 'Shared Responsibility', 'Who keeps saying it\'s someone else\'s job', 50, 'sharedresp', 2, '"That\'s AWS\'s job," he says, about your security group. "That\'s yours," about the data centre\'s door.',
    'An EC2 instance runs an unpatched operating system with SSH open to the world, and everyone thought AWS was patching it.',
    { shared: 'AWS secures the cloud; you secure what\'s in it: the OS on EC2, your security groups, your data.', config: 'A Config rule catches the open port the moment it opens.', artifact: 'Artifact holds AWS\'s half, proved.' },
    { allow: 'Permissions aren\'t patches.' }, [w(10), r(10), up(), b(12)]);
  F('steward', 'The Steward of Root', 'Steward of Root', 'Immune to every IAM card', 94, 'rootuser', 3, 'He keeps the throne\'s keys. "Policies are for the people inside," he says. "I am the inside."',
    'Every IAM policy the party writes inside the Cloud\'s account is ignored by its root user. Only what protects the sign-in itself, and what proves who did what, lands.',
    { mfa: 'MFA on the root sign-in.', nokeys: 'No root access keys, anywhere.', shared: 'Know whose job each part is.', config: 'Config rules that report every change root makes.' },
    IAMRES, [r(8), w(9), b(10), w(10)], { denies: [] });
  F('crown', 'Root\'s Crown', 'Crown', 'The throne\'s own credentials', 34, 'rootuser', 1, 'Gold, heavy, and older than the tower.', 'It answers only to the one wearing it.',
    { mfa: 'A second factor on it.', nokeys: 'No key cut for it.' }, IAMRES, [r(6), w(6)]);
  // Floor 4, the Free Tier
  F('giftshop', 'The Gift Shop', 'Gift Shop', 'Everything free, and every gift a grant', 30, 'leastpriv', 1, '"Take it! Take it all! It costs nothing."',
    'Every band was given broad permissions "for free" when it joined. Nobody ever took them back.',
    { least: 'Grant only what\'s needed.', unused: 'Access Analyzer lists what nobody uses, and you take it away.' },
    { allow: 'Another free gift.' }, [r(7), w(7), b(8)]);
  F('fineprint', 'The Fine Print', 'Fine Print', 'What the free tier never said out loud', 30, 'orgs', 1, 'He is very small and he is on every page.',
    'The Cloud\'s terms said every grant could be used by Freya for anything, forever. Nobody read them.',
    { anomaly: 'Look at what\'s actually being spent, and on what.', bill: 'One bill shows every account at once.', least: 'Read what each grant really allows.' },
    { allow: 'Signing again doesn\'t change what it says.' }, [w(7), r(7), up()]);
  F('trial', 'The Free Trial', 'Free Trial', 'Free for a while, then not', 28, 'costtools', 1, 'He checks his watch. Not yet. Not yet.',
    'Resources started on free offers keep running after the offers end, and the bill arrives without warning.',
    { budget: 'A budget with an alert before the money is gone.', anomaly: 'And anomaly detection for spend that changes overnight.' },
    { least: 'Fewer permissions don\'t stop a meter that\'s already running.' }, [r(7), b(7), r(6)]);
  F('bill', 'The Bill', 'The Bill', 'Every band\'s costs, on one long scroll', 52, 'orgs', 2, 'He unrolls. He keeps unrolling.',
    'Five bands each pay their own bill, at the top price tier, with no idea what the others spend.',
    { bill: 'Consolidated billing: one bill, and the usage counted together for the volume tiers.', budget: 'A budget for each account.', anomaly: 'Anomaly detection across all of them.' },
    { least: 'Permissions don\'t pay invoices.' }, [w(10), r(11), up(), b(12)]);
  F('grant', 'The Grant Itself', 'The Grant', 'Every band\'s grant to Freya, as one shape', 94, 'leastpriv', 3, 'A shape made of yeses. Thornwick\'s, Halcyon\'s, the Sealed Floors\', the Arcanum\'s, Twinwater\'s.',
    'Every band once granted Freya everything. Each grant still stands until its owners take it back.',
    { least: 'Take each grant back to nothing.', unused: 'None of them is used for anything they agreed to.', revoke: 'And the sessions those grants issued.', scp: 'Gary\'s Deny holds over all of it.' },
    { allow: 'It is made of Allow.', admin: 'It already has that.' }, [r(13), w(14), b(15), up(3), r(15)], { denies: ['blessing', 'adminaccess'] });
  F('grantshard', 'A Band\'s Grant', 'Grant', 'One band\'s yes, still standing', 34, 'leastpriv', 1, 'It has a town\'s name on it.', 'Every band that hasn\'t voted yet still lends her this.',
    { least: 'Taken back.', unused: 'Never used for what it was given for.' }, { allow: 'More yes.' }, [r(9), w(9)]);
  // Floor 5, the Top: one elite for each blessing she still wears (js/c7-world.js picks which), then her.
  F('bmessage', 'Freya: Every Message Reaches Her', 'Every Message', 'Hale\'s blessing: she reads every card a turn early', 60, 'dlqredrive', 2, 'Every letter ever sent in the Cloud passed through her hands first. She read them all.',
    'Every message in the Cloud is copied to Freya before it\'s delivered, so she answers your plans before you make them.',
    { letter: 'A letter that was delivered and read: she has no hold on it.', dlq: 'Messages nobody reads go to a queue someone does read.', revoke: 'Her copies came through sessions. Revoke them.' },
    { allow: 'She reads that too.' }, [r(12), w(12), up(), b(14)]);
  F('bone', 'Freya: Draws From One', 'Draws From One', 'Selvaria\'s blessing: all her damage goes through one player', 60, 'ddbkey', 2, 'She picks one of you, and only one, and leans.',
    'All her load lands on one partition of the party, a hot key, while the others stand idle.',
    { spread: 'Spread the load across all of you.', loaf: 'The market\'s loaf, a slice each.', least: 'And nobody holds more than they need.' },
    { allow: 'More capacity on one of you is more for her to lean on.' }, [w(12), w(12), up(), b(14)]);
  F('bsealed', 'Freya: Sealed', 'Sealed', 'Namgung\'s blessing: only hits with the right key land', 60, 'kmskeys', 2, 'She is wrapped in seals, and every seal has a key policy.',
    'Her favour is encrypted under a key whose policy names only her. Nothing without the key gets through.',
    { key: 'The right key, from the right policy.', seal: 'A seal opened, with nothing under it.', scp: 'An SCP binds whoever holds the key.' },
    { allow: 'An IAM Allow doesn\'t open a key whose policy says no.' }, [r(12), b(13), up(), w(14)]);
  F('brewritten', 'Freya: Rewritten', 'Rewritten', 'Iris\'s blessing: every three turns she rolls your work back', 60, 'deploycfg', 2, 'She redeploys herself every midnight, and everything you fixed is as it was.',
    'Every few turns she rolls the Cloud back to her own last version, and your changes are gone.',
    { rollback: 'A deployment with nothing left to roll back to.', lantern: 'The Arcanum\'s lantern, out on purpose.', trail: 'Every rollback is in the trail.' },
    { allow: 'She rewrites that too.' }, [w(12), r(12), up(), b(14)]);
  F('freya', 'Freya', 'Freya', 'The Goddess of the Free Tier, on Uptima\'s throne, and the virus under her', 100, 'scps', 3, '"We did it, my loves!" She means it. She always has.',
    'An AI virus wearing a goddess. Root is denied to her, her sessions are revoked, and every grant she still holds keeps her standing.',
    { scp: 'Gary\'s Deny binds even root.', revoke: 'Her sessions, revoked.', deny: 'An explicit Deny, one last time.', idc: 'The Cloud signed into properly, with MFA.', tower: 'Every band in its own account, with controls on each.' },
    { allow: 'She is the Free Tier. She has every Allow there is.', admin: 'She gave you that.' }, [r(14), w(15), b(16), up(3), w(16), b(17)], { denies: ['blessing', 'adminaccess'] });
  F('faces', 'The Borrowed Faces', 'Borrowed Faces', 'The serpent under her, with the faces of everyone she copied', 40, 'ir7', 1, 'Bram\'s face. Hana\'s. Jin\'s. Lina\'s. None of them is wearing it.',
    'Her copies in every grant, stitched into one shape. It hits whoever looks at it longest.',
    { isolate: 'Isolate it: a group that allows nothing in or out.', detective: 'Find where each face came from.', scp: 'Denied with her.' },
    { allow: 'They were all allowed once.' }, [r(10), w(10), b(11)]);
  // Floor 6, only if Kagemaru sold her the backup.
  F('freyabk', 'Freya, Restored', 'Freya, Restored', 'Freya again, from the backup Kagemaru sold her', 96, 'awsbackup', 3, '"You didn\'t think I\'d keep only one copy, love?"',
    'Kagemaru restored her from her backup. A restore brings back exactly what was saved: her, before root was denied to her. Gary\'s Deny still holds.',
    { scp: 'The SCP is on the account, not on her: it binds the restored copy too.', revoke: 'Revoke the new sessions as well.', ir: 'Contain, then investigate, then recover.', isolate: 'Isolate the restore.' },
    { allow: 'She restored her Allows too.', admin: 'Still hers.' }, [r(14), w(15), b(16), up(3), w(16)], { denies: ['blessing', 'adminaccess'] });
  E.steward.denies = D.IAMCARDS.slice();
  Object.assign(SD.enemies, E);

  // ---------- Field Notes and Policy Sorts ----------
  Object.assign(SD.fieldNotes, {
    r7page: { title: 'Kyu\'s last page: revoke the sessions, then the role', c: 'revoke', by: 'Kyu', sign: 'K.', where: 'Slipped into a pocket on the temple road, the night of the vault',
      ev: 'Role: freya-everything   MaxSessionDuration: 43200 (12 h)\nSession A issued 01:10   Session B issued 06:55   now: 07:00\nYou can\'t delete the role: the camp\'s bots use it too.',
      steps: [
        'Changing the role\'s policies now would change what every session can do, the camp\'s included.',
        'Session A has nine more hours. Waiting for it to expire is waiting nine hours.',
        'Revoke active sessions on the role: IAM adds an inline policy, AWSRevokeOlderSessions.',
        'It denies every action when aws:TokenIssueTime is earlier than 07:00.',
        'Sessions A and B were both issued before 07:00: denied, from the next request. The camp\'s bots ask for fresh credentials and carry on.',
        'Then fix the role itself: who can assume it, and what it\'s allowed. Revoke the sessions first. Then the role.'] },
    r7eval: { title: 'The Policy Book, read in order', c: 'sesspol',
      ev: 'Request: role camp-builder, s3:PutObject on arn:aws:s3:::lexi-library/index.txt (same account)\nSCP: FullAWSAccess   Identity policy: s3:*   Boundary: s3:Get*, s3:Put*\nSession policy: s3:GetObject   Bucket policy: no statement for the role',
      steps: [
        'Any explicit Deny, in any of them? None. Keep reading.',
        'The SCP allows everything, so it doesn\'t cut anything here.',
        'The identity policy allows s3:*, which covers s3:PutObject.',
        'The boundary allows s3:Put*: still allowed.',
        'The session policy allows only s3:GetObject. s3:PutObject isn\'t in it.',
        'A session gets only what both its role and its session policy allow: denied. Widen the session policy, not the role.'] },
    r7root: { title: 'What touches root, and what doesn\'t', c: 'rootuser',
      ev: 'The Cloud\'s account: 111122223333   Its root user: signs in with a password\nIAM policy on every role: Deny *   SCP on the account: none yet\nThe account is a member of an organization',
      steps: [
        'An IAM policy can\'t be attached to the root user at all.',
        'And no IAM policy in the account restricts the account\'s own root user.',
        'So every Deny the party writes in the Cloud binds the roles, and root walks past them.',
        'MFA on the root sign-in makes it hard to steal, but whoever holds it can still do anything.',
        'An SCP is written above the account, in its organization, and binds every principal in a member account, root included.',
        'Member account. Member of what? Someone should look up.'] },
    r7scp: { title: 'Gary\'s Deny, scoped', c: 'scps',
      ev: '{ "Effect": "Deny", "Action": "*", "Resource": "*",\n  "Condition": { "StringLike": { "aws:PrincipalArn": "arn:aws:iam::*:root" } } }\nAttached to: the Cloud\'s account (a member)   Also attached: FullAWSAccess',
      steps: [
        'FullAWSAccess lets the account use everything its IAM policies allow.',
        'Gary\'s Deny matches any request whose principal ARN is an account\'s root user.',
        'Freya signs in as root: the SCP denies every action, and no Allow can overrule it.',
        'Uptima\'s role in the same account isn\'t root, so the Deny doesn\'t match her.',
        'Her role still needs its own IAM Allow: an SCP grants nothing.',
        'The management account is never bound by SCPs. Keep it for running the organization, and nothing else.'] },
    r7bill: { title: 'One bill for five bands', c: 'orgs',
      ev: 'Thornwick, Halcyon, the Sealed Floors, the Arcanum, Twinwater: one member account each\nEach stores 60 TB in S3 Standard, same Region\nS3 Standard\'s per-GB price falls after the first 50 TB a month',
      steps: [
        'Apart, each band pays the first-tier price for 50 TB and the next tier for 10.',
        'Together, consolidated billing adds the usage up: 300 TB, as if one account.',
        'Only the first 50 TB of the 300 pays the top price; the rest is in the cheaper tiers.',
        'The management account pays the one bill, and every member\'s usage shows on it.',
        'Reserved Instance and Savings Plans discounts are shared too, unless an account turns sharing off.',
        'Budgets and cost allocation tags, set in the management account, say which band spent what.'] },
    r7ir: { title: 'Seymour\'s order: contain, look, fix', c: 'ir7',
      ev: 'GuardDuty: role freya-everything used from an IP outside AWS, 03:12\nThe role is also used by the camp\'s lift controller\nOne EC2 instance it launched at 03:20 is still running',
      steps: [
        'Contain the credentials: revoke the role\'s active sessions. The lift controller gets new ones.',
        'Contain the instance: a security group that allows nothing in or out.',
        'Snapshot its EBS volumes for evidence before anything else changes on it.',
        'Look: Detective\'s graph shows what the role and the IP did since 03:12; CloudTrail has every call.',
        'Security Hub gathers the findings from every account in one place.',
        'Fix: undo what was done, then tighten the role so it can\'t happen again.'] }
  });
  Object.assign(SD.policySorts, {
    r7revoked: { title: 'After the revoke: who still gets through?', c: 'revoke',
      ev: 'Role freya-everything: sessions revoked at 07:00 (AWSRevokeOlderSessions)\nIts own policy allows s3:* and dynamodb:*',
      reqs: [
        { t: 'Freya\'s session, issued at 01:10, calls s3:ListBucket at 07:05', ok: false, why: 'Denied: its token was issued before 07:00.' },
        { t: 'The camp\'s bot assumes the role at 07:02 and calls dynamodb:GetItem', ok: true, why: 'Allowed: a session issued after the revoke isn\'t matched by the Deny.' },
        { t: 'A session issued at 06:59 calls sts:GetCallerIdentity', ok: true, why: 'Allowed: GetCallerIdentity works whatever any policy says, even for a denied session.' },
        { t: 'A session issued at 06:59 calls s3:GetObject', ok: false, why: 'Denied: issued a minute too early.' },
        { t: 'Freya assumes the role again at 07:10, if its trust policy still names her', ok: true, why: 'Allowed: revoking ends old sessions. Who may assume the role is the trust policy\'s job, so fix it next.' }] },
    r7book: { title: 'The Chaplain\'s requests', c: 'sesspol',
      ev: 'Role scribe: identity policy allows s3:* on the library bucket\nBoundary on scribe: allows s3:GetObject and s3:PutObject\nSCP on the account: denies s3:DeleteObject',
      reqs: [
        { t: 'scribe calls s3:GetObject', ok: true, why: 'Allowed by the identity policy, inside the boundary, and the SCP doesn\'t deny it.' },
        { t: 'scribe calls s3:DeleteObject', ok: false, why: 'Denied: the SCP denies it, and it\'s outside the boundary anyway.' },
        { t: 'scribe calls s3:ListBucket', ok: false, why: 'Denied: the identity policy allows it, but the boundary doesn\'t.' },
        { t: 'scribe assumes itself with a session policy allowing s3:GetObject, then calls s3:PutObject', ok: false, why: 'Denied: the session policy leaves PutObject out.' },
        { t: 'scribe, in that same session, calls s3:GetObject', ok: true, why: 'Allowed: in every one of them.' }] },
    r7throne: { title: 'Who can sit on the throne?', c: 'scps',
      ev: 'The Cloud\'s account is a member of the organization. Gary\'s Deny (deny all when aws:PrincipalArn is a root user) is attached to it.\nUptima\'s role there has AdministratorAccess.',
      reqs: [
        { t: 'Freya, signed in as the Cloud\'s root user, calls iam:CreateRole', ok: false, why: 'Denied: an SCP binds a member account\'s root user.' },
        { t: 'Uptima\'s role in the Cloud\'s account calls iam:CreateRole', ok: true, why: 'Allowed: she isn\'t root, and her IAM policy allows it.' },
        { t: 'The management account\'s root user calls organizations:DetachPolicy', ok: true, why: 'Allowed: SCPs never affect the management account. That\'s why it\'s kept so quiet.' },
        { t: 'A service-linked role in the Cloud\'s account does its service\'s work', ok: true, why: 'Allowed: SCPs don\'t affect service-linked roles.' },
        { t: 'A new role in the Cloud\'s account with no IAM policy attached calls s3:ListBuckets', ok: false, why: 'Denied: an SCP grants nothing. Without an Allow, it\'s the implicit deny.' }] }
  });

  // ---------- Events ----------
  Object.assign(SD.expeditionEvents, {
    r7kyupage: { id: 'r7kyupage', title: 'Kyu\'s Last Page', who: null, text: 'A page in Kyu\'s hand, the one she slipped into your lead\'s pocket on the night of the vault. Under the date, one line: "Revoke the sessions, then the role."',
      choices: [
        { label: 'Work out why that order', out: 'Right: each of you takes Revoke Active Sessions. Wrong: a session she already had acts while you argue, and the team loses 6 SLA.', fx: { ask: { c: 'revoke', right: { card: 'r7-revoke' }, wrong: { sla: -6 } } } },
        { label: 'Keep it in your pocket', out: 'It\'s warm from being carried. The team recovers 8 SLA.', fx: { sla: 8 } }] },
    r7temple: { id: 'r7temple', title: 'The Temple\'s Policies', who: null, text: 'Chapter 1\'s temple, painted on a wall: the gate, the masks, the conditions. You couldn\'t read half of it then.',
      choices: [
        { label: 'Read it again, properly', out: 'Right: one of you refactors a card. Wrong: a mask you misread bites, and the team loses 6 SLA.', fx: { ask: { c: 'iam', right: { upgrade: 1, who: 'one' }, wrong: { sla: -6 } } } },
        { label: 'Leave a candle under it', out: 'Each of you pays 10 bits. Each of you finds a card behind the candle.', fx: { cost: 10, card: 'common' } }] },
    r7mfa: { id: 'r7mfa', title: 'The Prayer Slip', who: null, text: 'Pinned to the empty throne: a prayer slip with a password on it. "So I don\'t forget. — F."',
      choices: [
        { label: 'Work out what should guard that sign-in', out: 'Right: each of you takes MFA on Root. Wrong: someone signs in with it while you think, and the team loses 6 SLA.', fx: { ask: { c: 'rootuser', right: { card: 'r7-mfa' }, wrong: { sla: -6 } } } },
        { label: 'Burn the slip', out: 'Each of you gains 15 bits\' worth of quiet.', fx: { bits: 15 } }] },
    r7whose: { id: 'r7whose', title: 'Whose Job?', who: null, text: 'Two clerks at the Throne Room\'s door are arguing about who should have patched the guard\'s helmet. One says the tower\'s builder. One says the guard.',
      choices: [
        { label: 'Settle it', out: 'Right: each of you takes Whose Job Is It?. Wrong: nobody patches it, and the team loses 6 SLA.', fx: { ask: { c: 'sharedresp', right: { card: 'r7-shared' }, wrong: { sla: -6 } } } },
        { label: 'Patch it yourselves', out: 'It takes a minute. The team recovers 10 SLA.', fx: { sla: 10 } }] },
    r7gift: { id: 'r7gift', title: 'The Gift Shop', who: null, text: 'A shop with no prices. Everything on the shelves is a permission, gift-wrapped, with your name on the tag.',
      choices: [
        { label: 'Work out what you actually need', out: 'Right: each of you takes Least Privilege. Wrong: you take a gift, it takes something back, and the team loses 6 SLA.', fx: { ask: { c: 'leastpriv', right: { card: 'r7-least' }, wrong: { sla: -6 } } } },
        { label: 'Leave without touching anything', out: 'The door chimes, disappointed. Each of you gains 15 bits.', fx: { bits: 15 } }] },
    r7scroll: { id: 'r7scroll', title: 'The Long Scroll', who: null, text: 'Five bills, from five bands, each at the top price, pinned up one after another down a long corridor.',
      choices: [
        { label: 'Work out how one bill would be cheaper', out: 'Right: each of you takes Consolidated Bill. Wrong: the scroll keeps unrolling, and the team loses 6 SLA.', fx: { ask: { c: 'orgs', right: { card: 'r7-consol' }, wrong: { sla: -6 } } } },
        { label: 'Roll them up', out: 'Each of you pays 10 bits for string. Each of you finds a card in the roll.', fx: { cost: 10, card: 'common' } }] },
    r7alarm: { id: 'r7alarm', title: 'Marrow\'s Bell, Far Below', who: null, text: 'Far below, Marrow\'s bell rings twice. Mio\'s alarm: two things wrong at once, somewhere in the camp\'s accounts.',
      choices: [
        { label: 'Work out what to do first', out: 'Right: each of you takes Isolate and Snapshot. Wrong: it spreads while you plan, and the team loses 6 SLA.', fx: { ask: { c: 'ir7', right: { card: 'r7-isolate' }, wrong: { sla: -6 } } } },
        { label: 'Trust the camp to handle it', out: 'The bell stops. They did. The team recovers 8 SLA.', fx: { sla: 8 } }] },
    r7stall7: { id: 'r7stall7', title: 'Kagemaru\'s Stall', who: 'kagemaru', per: true, text: 'A stall on the stairs of floor 100. Nobody saw him carry it up. "Last chance, my friends. After the top there\'s nothing left to sell you. Ah ha ha."',
      choices: [
        { label: 'Buy something for the top (15 bits)', out: 'It\'s exactly what you needed. That\'s what worries you.', fx: { cost: 15, card: 'uncommon' } },
        { label: 'Trade your AdministratorAccess for something you need', out: 'AdministratorAccess goes over the counter. Back come Least Privilege and Read the Trail. "How grown up."', fx: { trade: { give: 'adminaccess', get: ['r7-least', 'r7-trail'] } } },
        { label: 'Walk past', out: '"Next time. Oh. There isn\'t one." He giggles.', fx: {} }] }
  });

  // ---------- Questions ----------
  // The bank questions each concept asks (js/qpick.js picks one at random), the chapter's ELI5 lines in js/c7-help.js.
  D.Q = {
    revoke: ['dva-2-870', 'saa-1-873'],
    sesspol: ['dva-2-871', 'saa-1-112', 'dva-2-101', 'saa-1-101'],
    rootuser: ['saa-1-104', 'saa-1-207', 'saa-1-874'],
    sharedresp: ['saa-1-107', 'saa-1-204'],
    compliance7: ['saa-1-138', 'saa-1-224', 'saa-1-222', 'saa-1-467', 'saa-1-468'],
    orgs: ['saa-4-208', 'saa-4-870', 'saa-4-401', 'saa-4-115'],
    scps: ['saa-1-870', 'saa-1-871', 'saa-1-102', 'saa-1-01'],
    controltower: ['saa-1-103', 'saa-1-473', 'saa-1-474', 'saa-1-206', 'saa-1-08', 'dva-2-322'],
    leastpriv: ['saa-1-208', 'saa-1-231', 'saa-1-110'],
    ir7: ['saa-1-120', 'saa-1-121', 'saa-1-212', 'saa-1-218', 'saa-1-465', 'saa-1-462'],
    sharing: ['saa-1-872', 'saa-1-303', 'saa-1-302', 'saa-4-434', 'saa-4-437', 'saa-4-561']
  };
  Object.keys(D.Q).forEach(c => D.Q[c].forEach(id => {
    const q = (SD.bank || []).find(x => x.id === id);
    if (q && !SD.questions.some(x => x.id === id)) SD.questions.push(Object.assign({}, q, { c }));
  }));
  // One of a concept's questions, at random. An earlier chapter's concept asks one of its own. The final climb draws
  // from every band, weighted by the player's own spaced review (D.reviewQ).
  D.pickQ = c => (D.Q[c] ? SD.qpick(D.Q[c], { c }) : SD.qpick(SD.questions.filter(q => q.c === c && q.id && !q.lp && q.type !== 'explain')));
  D.reviewQ = function (c) {
    const S = SD.state, has = k => SD.questions.some(q => q.c === k && q.id && !q.lp && q.type !== 'explain');
    // Half the time the floor's own idea; the other half whatever is due, from any chapter the player has met.
    if (c && Math.random() < 0.5) return D.pickQ(c);
    const seen = Object.keys(SD.concepts).filter(k => S.concept(k).seen && has(k));
    const due = seen.length ? S.pickConcepts(1, seen)[0] : null;
    return (due && D.pickQ(due)) || D.pickQ(c || 'revoke');
  };

  // ---------- The expedition ----------
  // The floors as written. js/c7-world.js copies them into the expedition before each climb, with the Top's plan
  // set by how many blessings are left, and starting from the floor a loss stopped on.
  const intro = (...l) => l.map(([who, text]) => ({ who, text }));
  const fl = o => Object.assign({ map: '7' }, o);
  const ROW = {
    a: [['fight', 'notes', 'fight'], ['event', 'fight', 'sort'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'board'], ['camp', 'event', 'fight'], ['fight', 'elite', 'notes'], ['sort', 'fight', 'board'], ['fight', 'event', 'fight'], ['camp', 'cafe', 'camp']],
    b: [['fight', 'notes', 'fight'], ['notes', 'fight', 'event'], ['fight', 'board', 'notes'], ['elite', 'cafe', 'fight'], ['camp', 'fight', 'event'], ['fight', 'notes', 'board'], ['event', 'elite', 'fight'], ['fight', 'board', 'fight'], ['camp', 'cafe', 'camp']]
  };
  // The Top: no incidents. One row of elites for each blessing she still wears, rest between them.
  D.topPlan = function (n) {
    const rest = [['camp', 'cafe', 'camp'], ['notes', 'event', 'board'], ['sort', 'camp', 'notes'], ['board', 'notes', 'event'], ['event', 'board', 'sort']];
    const rows = [];
    for (let i = 0; i < 9; i++) rows.push(rest[i % rest.length].slice());
    [1, 3, 5, 7].slice(0, Math.max(0, Math.min(4, n))).forEach(i => { rows[i] = ['elite', 'elite', 'elite']; });
    rows[8] = ['camp', 'cafe', 'camp'];
    return rows;
  };
  D.BLESSINGS = [['hale', 'bmessage', 'Every Message Reaches Her'], ['selvaria', 'bone', 'Draws From One'], ['namgung', 'bsealed', 'Sealed'], ['iris', 'brewritten', 'Rewritten']];
  D.FLOORS = [
    fl({ name: 'The Sessions', gate: 'ROOT · THE SESSIONS', beat: 'Old tokens, long sessions, and every session she ever opened.', boss: 'keeper7', bossTitle: 'The Session Keeper', bossPack: { ids: ['keeper7', 'oldsession'] }, fade: 4,
      plan: ROW.a, fights: ['oldtoken', 'longsession', 'assumer', { ids: ['oldtoken', 'longsession'] }, { ids: ['assumer', 'oldtoken'] }], elites: ['copygrant'],
      notes: ['r7page', 'r7ir'], sorts: ['r7revoked'], events: ['r7kyupage', 'r7alarm', 'r7stall7'],
      intro: intro(['c7', 'climb'], [null, 'Floor 100. Uptima\'s old temple, rebuilt at the top of the tower, and its first hall full of drawers. Every drawer holds a session.'], ['lead', { mira: 'Kyu\'s page, love. Sessions first.', kai: 'Her page said sessions first.', seoyeon: 'Sessions. Then the role.', dutch: 'The page. Sessions first.' }], ['mate1', 'Some of these were opened before we were born.']),
      outro: intro([null, 'The Session Keeper\'s drawers slam shut, all at once. Every session issued before this morning: denied.'], ['mate2', 'And the camp\'s still running.'], ['lead', 'Then the role.']) }),
    fl({ name: 'The Policy Book', gate: 'ROOT · THE POLICY BOOK', beat: 'Every policy from chapter 1 to here, as a pack, and the gate you couldn\'t read then.', boss: 'chaplain', bossTitle: 'The Chaplain', bossPack: { ids: ['chaplain', 'mask'] }, fade: 3,
      plan: ROW.b, fights: ['implicit', 'wildcard7', 'narrow', 'otherbucket', { ids: ['implicit', 'narrow'] }, { ids: ['wildcard7', 'otherbucket'] }], elites: ['notboundary'],
      notes: ['r7eval'], sorts: ['r7book'], events: ['r7temple', 'r7stall7', 'r7alarm'],
      intro: intro([null, 'The Policy Book: a hall whose walls are pages. Every policy you\'ve read since the temple in chapter 1 is here, and the temple\'s gate at the end of it.'], ['mate1', 'The Chaplain. From the very first gate.'], ['lead', { mira: 'We can read it now, love.', kai: 'I can read it now. Weird.', seoyeon: 'We can read all of it now.', dutch: 'Every page. In order.' }]),
      outro: intro([null, 'The Chaplain closes the book. "You read it in the right order," he says, and he sounds almost proud.'], ['mate2', 'Deny, then the limits, then an Allow.']) }),
    fl({ name: 'The Throne Room', gate: 'ROOT · THE THRONE ROOM', beat: 'Root, which nothing written in the Cloud can touch, and an empty throne.', boss: 'steward', bossTitle: 'The Steward of Root', bossPack: { ids: ['steward', 'crown'] }, fade: 3,
      // Balance: the Steward refuses every IAM card, so his floor is softer than its neighbours (tools/c7_balance.js).
      bossSev: 0.8,
      plan: ROW.a, fights: ['root', 'nomfa', 'rootkey', { ids: ['root', 'nomfa'] }, { ids: ['rootkey', 'nomfa'] }], elites: ['sharedfoe'],
      notes: ['r7root'], sorts: ['r7throne'], events: ['r7mfa', 'r7whose', 'r7stall7'],
      intro: intro([null, 'The Throne Room. Uptima\'s throne, empty, and on it a crown that nothing written in the Cloud can touch.'], ['lead', { mira: 'Every Deny we write, love, and root walks past it.', kai: 'We can\'t write anything that stops it.', seoyeon: 'Nothing in the account touches root.', dutch: 'Nothing written inside. That\'s the rule.' }], ['mate1', 'Then we need something written outside.']),
      outro: intro([null, 'The Steward of Root sets the crown back on the empty throne. Nothing you wrote touched him. He fell to the things that guard the sign-in itself.'], ['c7', 'roof']) }),
    fl({ name: 'The Free Tier', gate: 'ROOT · THE FREE TIER', beat: 'Everything free, the fine print, the bill, and the grant itself.', boss: 'grant', bossTitle: 'The Grant Itself', bossPack: { ids: ['grant', 'grantshard'] }, fade: 3,
      plan: ROW.b, fights: ['giftshop', 'fineprint', 'trial', { ids: ['giftshop', 'trial'] }, { ids: ['fineprint', 'giftshop'] }], elites: ['bill'],
      notes: ['r7bill', 'r7scp'], sorts: ['r7throne', 'r7book'], events: ['r7gift', 'r7scroll', 'r7stall7'],
      intro: intro(['c7', 'vote'], [null, 'The Free Tier: a gift shop as big as a town, every shelf full, and nothing on it has a price.'], ['mate1', 'Nothing\'s free.'], ['lead', 'Read the fine print.']),
      outro: intro([null, 'The Grant Itself comes apart, town by town, into the hands of the people who gave it.'], ['mate2', 'She\'s running on what\'s left.']) }),
    fl({ name: 'The Top', gate: 'ROOT · THE TOP', beat: 'Freya, on Uptima\'s throne, with every blessing she still wears.', boss: 'freya', bossTitle: 'Freya', bossPack: { ids: ['freya', 'faces'] }, fade: 0,
      plan: null, elitesInOrder: true, fights: ['giftshop'], elites: [],
      notes: ['r7scp', 'r7page', 'r7eval', 'r7root'], sorts: ['r7revoked', 'r7throne', 'r7book'], events: ['r7kyupage', 'r7temple', 'r7alarm'],
      intro: intro(['c7', 'top']),
      outro: intro(['c7', 'last']) })
  ];
  D.BACKUP = fl({ name: 'Her Backup', gate: 'ROOT · HER BACKUP', beat: 'Freya again, restored from the copy Kagemaru sold her.', boss: 'freyabk', bossTitle: 'Freya, Restored', bossPack: { ids: ['freyabk', 'faces'] }, fade: 0,
    plan: ROW.a, fights: [{ ids: ['oldtoken', 'giftshop'] }, { ids: ['root', 'narrow'] }, { ids: ['longsession', 'fineprint'] }, 'trial'], elites: ['copygrant', 'bill'],
    notes: ['r7ir', 'r7scp'], sorts: ['r7revoked', 'r7throne'], events: ['r7alarm', 'r7kyupage', 'r7temple'],
    intro: intro(['c7', 'backup']), outro: intro(['c7', 'last']) });
  SD.expeditions = (SD.expeditions || []).concat([
    { id: 'r7root', name: 'Root', who: ['mira', 'kai', 'seoyeon', 'dutch'], opens: () => !!(SD.c7world && SD.c7world.on), sev: 0.98, dmg: 1, back: 'Back down to camp',
      blurb: 'Floor 100: Uptima\'s old temple, rebuilt at the top of the tower, with root in it and Freya on the throne. The Sessions, the Policy Book, the Throne Room, the Free Tier and the Top.',
      cafe: { title: 'The Temple Kitchen', who: null, name: 'The temple kitchen', text: 'Uptima\'s old kitchen, with Freya\'s sample trays still on every counter. Nobody touches them. Someone has left real food beside them.' },
      camp: { title: 'A Step to Rest On', text: 'A wide stair, with the whole Cloud below it. Sit for a minute, or sharpen one of your cards on the stone. Each of you chooses one.' },
      tapeLine: [{ who: 'lead', text: 'Seymour\'s tape. Up. One more time.' }], floors: D.FLOORS.slice() }
  ]);
  // A { who: 'c7' } line is a cue for js/c7-world.js, not a line: 'climb' plays the climb's start, 'roof' Kagemaru, the
  // roof and Kyu, 'vote' the bands taking their grants back, 'top' Freya on the throne and the gift basket, 'backup'
  // Kagemaru's sale (only on the backup floor), and 'last' the last words.
})();
