// The minigames of chapter 7's camp (js/c7-world.js), on chapter 6's four engines (js/c6-games.js: door, sort, order,
// pick), each opening with a prediction you make before you see the answer:
//   lift     the tower lift's controller runs as a role Freya still has sessions for: write the revoke policy
//   whose    Elder Wren's question, whose job is it: each task to AWS or to you, on EC2, RDS, Lambda and S3
//   book     Bru's board: the camp's requests through every policy at once, allowed, denied or never allowed
//   board    the Design Board, after the climb: the Cloud as Uptima will run it, set up in order
// The roof's three drafts of Gary's Deny are the world's own scene. AWS facts follow the current AWS documentation
// (revoking IAM role sessions, policy evaluation logic, the shared responsibility model, AWS Organizations, Control
// Tower, IAM Identity Center, AWS RAM, the Well-Architected Tool). Every explanation is written fresh.
(function () {
  const K = SD.vec, G6 = SD.c6games;
  if (!K || !K.on || !G6) return;
  const G = SD.c7games = { door: G6.door, sort: G6.sort, order: G6.order, pick: G6.pick };
  const P = (q, opts, why) => ({ q, opts: opts.map(([t, ok, no]) => ({ t, ok, no })), why });
  const I = (t, bin, why) => ({ t, bin, why });
  const DEF = G.DEF = {};

  // The lift to floor 100. Its controller assumes freya-everything, and Freya opened sessions on it long ago.
  DEF.lift = {
    title: 'THE TOWER LIFT · REVOKE THE SESSIONS', concept: 'revoke', card: 'r7-revoke',
    intro: 'The lift to floor 100 is run by a controller that assumes the role <b>freya-everything</b>. Freya still holds sessions on that role, some of them years old, and the controller must keep working. Build the policy that <b>Revoke active sessions</b> attaches to the role, and try it on the lift.',
    rule: 'Role: freya-everything   MaxSessionDuration: 12 hours\nThe controller asks for fresh credentials every hour.\nnow = 2026-10-23T21:00:00Z',
    predict: P('Revoking a role\'s active sessions: what happens to the controller, which uses the same role?', [
      ['It\'s refused until it fetches fresh credentials, which then work', true],
      ['It stops working until somebody deletes and recreates the role', false, 'The role isn\'t deleted. Only older sessions are denied.'],
      ['Nothing changes for anyone until the old sessions expire by themselves', false, 'The deny applies from the next request, whatever the session\'s expiry.']],
      'The revoke policy denies requests signed with credentials issued before the moment you revoked, the controller\'s current ones included. Once it assumes the role again, its new credentials aren\'t matched.'),
    fields: [{ k: 'eff', label: 'EFFECT', opts: [['deny', 'Deny'], ['allow', 'Allow']] },
      { k: 'act', label: 'ACTION', opts: [['all', '"*"'], ['sts', '"sts:AssumeRole"'], ['s3', '"s3:*"']] },
      { k: 'cond', label: 'CONDITION', opts: [['tok', 'DateLessThan aws:TokenIssueTime now'], ['cur', 'DateLessThan aws:CurrentTime now'], ['mfa', 'Bool aws:MultiFactorAuthPresent false']] }],
    answer: { eff: 'deny', act: 'all', cond: 'tok' },
    check: s => s.eff === 'allow' ? 'An Allow can only add to what the sessions can do. Stopping them takes an explicit Deny.'
      : s.act === 'sts' ? 'Old sessions don\'t need to assume the role again: they already have it. Deny every action they could take.'
      : s.act === 's3' ? 'Freya\'s sessions can do far more than S3 with this role. Deny "*".'
      : s.cond === 'cur' ? 'aws:CurrentTime is earlier than now for nobody: that denies nothing today. The condition is when each token was issued.'
      : s.cond === 'mfa' ? 'That denies every session without MFA, the controller\'s included. The lift stops.' : null,
    done: 'Deny "*" when aws:TokenIssueTime is earlier than now. Every one of Freya\'s sessions on the lift is refused at once; the controller asks for new credentials, gets them, and the lift hums.'
  };
  // Elder Wren at the fire: whose job is it?
  DEF.whose = {
    title: 'ELDER WREN · WHOSE JOB IS IT?', concept: 'sharedresp', card: 'r7-shared',
    intro: 'Elder Wren has a question for the camp before anyone climbs. "When the Cloud runs your things for you, which parts are still yours?" Under the <b>shared responsibility model</b>, put each task where it belongs.',
    predict: P('The camp moves its database from EC2 to Amazon RDS. Who patches the database engine now?', [
      ['AWS, in the maintenance window', true], ['The camp, from a shell on the host', false, 'RDS gives no shell on its hosts.'], ['Nobody: managed databases don\'t need patching', false, 'They do. AWS does it, on a schedule you choose.']],
      'On RDS, AWS manages the host operating system and the database engine software, and applies updates in the maintenance window. Users, grants and network access stay yours.'),
    bins: ['AWS', 'The camp'],
    items: [I('Patching the guest operating system on the camp\'s EC2 instances', 1, 'On EC2 the operating system inside the instance is the customer\'s.'),
      I('The hypervisor and the physical servers under EC2', 0, 'AWS runs the host, the virtualization layer and the hardware.'),
      I('The security groups on the camp\'s instances', 1, 'Who can reach your instances is your configuration, on every service.'),
      I('Patching the database engine on Amazon RDS', 0, 'A managed service: AWS applies engine and OS updates in the maintenance window.'),
      I('Which database users exist on RDS, and what each can read', 1, 'Database users and their privileges are the customer\'s, even on a managed service.'),
      I('The runtime and servers that run the camp\'s Lambda functions', 0, 'With Lambda, AWS runs the operating system and the runtime.'),
      I('Who the camp\'s S3 bucket policies let read the prayers', 1, 'Your data, and who can get to it, are always yours.')],
    done: '"So it\'s always someone\'s job," says Wren. "Good. I was worried it was nobody\'s."'
  };
  // Bru's board: the camp's requests, each read against every policy that applies.
  DEF.book = {
    title: 'BRU\'S BOARD · THE WHOLE BOOK AT ONCE', concept: 'sesspol', card: 'r7-evalorder',
    intro: 'Bru has pinned up six requests from the camp, each with every policy that applies to it. For each one: is it <b>allowed</b>, stopped by an <b>explicit deny</b>, or never allowed at all (the <b>implicit deny</b>)?',
    rule: 'Every role: identity policy allows s3:* on lexi-library\nThe account\'s SCP denies s3:DeleteBucket\nOne role, scribe, has a boundary allowing s3:GetObject and s3:PutObject',
    predict: P('A request is allowed by the role\'s identity policy and explicitly denied by a bucket policy. What\'s the answer?', [
      ['Denied: an explicit Deny anywhere wins', true], ['Allowed: identity policies are read first', false, 'There\'s no "first" that beats a Deny.'], ['It depends which policy was written last', false, 'Order of writing never matters.']],
      'Every applicable policy is evaluated together. An explicit Deny in any of them ends it; otherwise something must allow it, and every limit (SCP, boundary, session policy) must too.'),
    bins: ['Allowed', 'Explicit deny', 'Implicit deny'],
    items: [I('Bru\'s role calls s3:GetObject on lexi-library', 0, 'The identity policy allows it, and nothing denies it.'),
      I('Bru\'s role calls s3:DeleteBucket on lexi-library', 1, 'The SCP denies it, and a Deny beats the identity policy\'s s3:*.'),
      I('Bru\'s role calls dynamodb:GetItem', 2, 'Nothing allows it at all. No Allow: the implicit deny.'),
      I('scribe calls s3:ListBucket on lexi-library', 2, 'The identity policy allows it, but the boundary doesn\'t. A boundary only cuts, so it was never allowed.'),
      I('scribe calls s3:PutObject on lexi-library', 0, 'Allowed by the identity policy and inside the boundary.'),
      I('Bru\'s role, in a session whose session policy allows only s3:GetObject, calls s3:PutObject', 2, 'The session gets only what both the role and its session policy allow: never allowed, not denied.')],
    done: 'Bru writes the order at the top of the board in big letters: DENY? THEN THE LIMITS. THEN AN ALLOW. Then he underlines it twice.'
  };
  // The Design Board, the morning after: the Cloud, run properly.
  DEF.board = {
    title: 'DESIGN BOARD · THE CLOUD, RUN PROPERLY', concept: 'controltower', card: 'r7-tower',
    intro: 'Uptima won\'t take the throne back. She\'s drawing how the Cloud will run instead, from the camp\'s fire, so nobody can ever take all of it again. Tap the steps in order.',
    predict: P('Each band gets its own member account. Why is that better than one big account with an IAM group per band?', [
      ['An account is a hard boundary: its resources, limits and SCPs are its own', true],
      ['It\'s cheaper, because every member account gets its own free tier', false, 'Accounts in an organization share one bill; that\'s not why.'],
      ['IAM groups can\'t hold enough users for a whole band of the camp', false, 'Group size isn\'t the point. Isolation is.']],
      'Separate accounts isolate workloads by default: one band\'s mistake, or one stolen credential, stays inside one account, and policies can be set per account and per OU.'),
    steps: [{ t: 'Give each band its own member account in the organization, grouped into OUs.', why: 'Thornwick, Halcyon, the Sealed Floors, the Arcanum and Twinwater, each with its own boundary.', hint: 'everything else hangs off the accounts.' },
      { t: 'Set up a Control Tower landing zone over them: a log archive account, an audit account, and controls on every OU.', why: 'Preventive controls are SCPs or RCPs, detective ones are Config rules, proactive ones check templates before they deploy.', hint: 'the guardrails go on the OUs once the accounts are in them.' },
      { t: 'Sign everyone in through IAM Identity Center, with MFA, and a permission set for each account they work in.', why: 'Short-lived role credentials, never IAM users. Nobody holds root.', hint: 'people come in once the accounts and their guardrails exist.' },
      { t: 'Share the camp\'s network with every band\'s account through AWS RAM.', why: 'One VPC owned by the camp; each band launches into its shared subnets.', hint: 'shared things come after there are accounts to share with.' },
      { t: 'Once a season, review each band\'s workload with the Well-Architected Tool, and save a milestone.', why: 'So everyone can see whether it\'s getting better.', hint: 'the review is the last thing, and then it repeats.' }],
    done: 'The board, finished: five accounts, controls on each, one front door with a second key, one shared road, and a review every season.'
  };
})();
