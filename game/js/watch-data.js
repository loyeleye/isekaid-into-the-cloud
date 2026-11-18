// The Night Watch's data (Ladi, Nov 17: "a completely different map with a completely different game loop", then
// "combine the 3"; storyboard: the Claude Doc "The Night Watch: new loop storyboard"). Domain 2, Security, only.
//   - FLOORS and ROOMS: the castle's thirteen rooms on four floors. Each is an AWS resource or a place the game uses.
//   - SLOTS: the things you set in the day. A lock on a room (a policy on a resource) or a key on a worker (an
//     identity policy). Each tile is one setting, with what it does at night:
//       ok     the narrow fix: the errand works and nobody else gets in
//       wide   works, but wider than it needs to be: fined at dawn (a star key, rotation off, logs off)
//       block  a worker is turned away: the errand fails
//       leak   a thief gets in, or something is overheard
//     Each tile's line is the one the game shows for it, written fresh from the AWS docs (links beside each rule in
//     js/aws-sim-ops.js and below).
//   - NIGHTS: nine. Each sets some slots to a starting (usually broken) tile; the day's job is to fix them. Night 9 is
//     the Long Night, with the raid (a later build).
// Docs behind the lines:
//   API Gateway authorizers and API keys: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html
//     https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html ("Don't use API keys
//     for authentication or authorization")
//   IAM authorization on a method: unsigned calls get 403 "Missing Authentication Token".
//     https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html
//   Trust policies, cross-account evaluation, KMS limits, Secrets Manager and env vars: see js/aws-sim-ops.js.
//   KMS key policies: https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html
//   Secrets Manager rotation: https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html
(function () {
  const W = SD.watchData = {};

  // ---- The castle: four floors joined by stairs (Ladi, Nov 17: a big keep with several floors), top to bottom ----
  W.FLOORS = [['towers', 'Towers'], ['upper', 'Upper floor'], ['ground', 'Ground floor'], ['cellars', 'Cellars']];
  W.ROOMS = {
    tower: { floor: 'towers', name: 'Watchtower', aws: 'Bought with pay', icon: '🗼' },
    lookout: { floor: 'towers', name: 'Lookout', aws: 'Raid preview', icon: '🔭' },
    captain: { floor: 'towers', name: 'Captain\'s room', aws: 'Dawn question', icon: '🎖️' },
    wardrobe: { floor: 'upper', name: 'Wardrobe', aws: 'IAM roles', icon: '🧥' },
    ledger: { floor: 'upper', name: 'Ledger room', aws: 'S3 · DynamoDB', icon: '📒' },
    bridge: { floor: 'upper', name: 'Bridge tower', aws: 'Cross-account', icon: '🌉' },
    gate: { floor: 'ground', name: 'Main gate', aws: 'API Gateway', icon: '🏰' },
    hall: { floor: 'ground', name: 'Great hall', aws: 'Lambda workers', icon: '🕯️' },
    post: { floor: 'ground', name: 'Post room', aws: 'Big payloads', icon: '✉️' },
    tavern: { floor: 'ground', name: 'Tavern', aws: 'CloudWatch Logs', icon: '🍺' },
    archive: { floor: 'cellars', name: 'Archive', aws: 'Secrets Manager · Parameter Store', icon: '📜' },
    strong: { floor: 'cellars', name: 'Strongroom', aws: 'AWS KMS', icon: '🔐' },
    barracks: { floor: 'cellars', name: 'Barracks', aws: 'Raid guards', icon: '🛡️' }
  };
  W.ORDER = Object.keys(W.ROOMS);

  // ---- What you set ----
  // kind: 'lock' sits on the room's door; 'key' is a worker's key ring (who, in the room they work in).
  W.SLOTS = {
    gate: { room: 'gate', kind: 'lock', task: '2.1', name: 'Gate guard', ask: 'Who checks passes at the gate?', tiles: {
      open: { label: 'No guard', icon: '🚪', res: 'leak', line: 'No authorizer on the method: anyone with the URL walks in, forged pass or not.' },
      apikey: { label: 'API key check', icon: '🏷️', res: 'leak', line: 'API keys are for usage plans. AWS says not to use them for authorization, so a copied key gets in.' },
      iam: { label: 'IAM signature', icon: '✍️', res: 'block', line: 'Visitors sign in with the user pool, not SigV4. Their calls get 403 Missing Authentication Token.' },
      pool: { label: 'User pool guard', icon: '💂', res: 'ok', line: 'A Cognito user pool authorizer checks each JWT. A forged pass gets 401 Unauthorized.' } } },
    badge: { room: 'hall', kind: 'key', who: 'Order clerk', task: '2.1', name: 'Order clerk\'s keys', ask: 'The order clerk writes new orders into the ledger. Which key?', tiles: {
      read: { label: 'Read ledger', icon: '👁️', res: 'block', line: 'AccessDeniedException: the clerk isn\'t authorized to perform dynamodb:PutItem on the orders table.' },
      other: { label: 'Write archive table', icon: '🗝️', res: 'block', line: 'PutItem is allowed on a different table\'s ARN. The orders table still answers AccessDeniedException.' },
      write: { label: 'Write ledger', icon: '🔑', res: 'ok', line: 'dynamodb:PutItem on the orders table\'s ARN, and nothing else.' },
      star: { label: 'Star key', icon: '⭐', res: 'wide', line: 'Action "*" on Resource "*": the errand works, and so would anything a thief does with this role.' } } },
    cloak: { room: 'wardrobe', kind: 'lock', task: '2.1', name: 'Ledger cloak\'s tag', ask: 'The ledger cloak is a role. Its tag (the trust policy) says who may wear it.', tiles: {
      fin: { label: 'Finance only', icon: '💼', res: 'block', line: 'AccessDenied: no role trust policy allows the sts:AssumeRole action for the order worker\'s role.' },
      fn: { label: 'Order worker', icon: '🧑‍🍳', res: 'ok', line: 'The trust policy names the order worker\'s role as Principal. It can wear the cloak, and nobody else can.' },
      star: { label: 'Anyone', icon: '🌍', res: 'leak', line: 'Principal "*" on a trust policy: anyone, from any account, can try the cloak on.' } } },
    bsign: { room: 'bridge', kind: 'lock', task: '2.1', name: 'Storehouse sign', ask: 'The neighbour\'s storehouse is in another account. Its sign is the bucket policy.', tiles: {
      none: { label: 'No sign', icon: '🚫', res: 'block', line: 'AccessDenied: across accounts, the bucket policy in the neighbour\'s account has to allow you too.' },
      role: { label: 'Names your role', icon: '📛', res: 'ok', line: 'The bucket policy names your clerk\'s role ARN for s3:GetObject. Both sides now allow.' },
      pub: { label: 'Anyone', icon: '🌍', res: 'leak', line: 'Principal "*" makes the storehouse public. Your clerk gets in, and so does everyone else.' } } },
    bkey: { room: 'bridge', kind: 'key', who: 'Bridge clerk', task: '2.1', name: 'Bridge clerk\'s keys', ask: 'Your side of the bridge: the clerk\'s own identity policy.', tiles: {
      none: { label: 'No key', icon: '✋', res: 'block', line: 'Your account\'s identity policy has to allow s3:GetObject on the neighbour\'s bucket too.' },
      get: { label: 'Read storehouse', icon: '🔑', res: 'ok', line: 's3:GetObject on arn:aws:s3:::neighbour-bucket/*, and nothing else.' },
      s3star: { label: 's3:* everywhere', icon: '⭐', res: 'wide', line: 's3:* on every bucket: the errand works, and the clerk could empty buckets too.' } } },
    drawer: { room: 'strong', kind: 'lock', task: '2.2', name: 'Strongroom rule', ask: 'The ledger pages are sealed with a KMS key. Its key policy says who may use it.', tiles: {
      none: { label: 'Owner only', icon: '🔒', res: 'block', line: 'AccessDeniedException: the key policy doesn\'t let the worker call kms:GenerateDataKey on this key.' },
      role: { label: 'Worker may use', icon: '🔑', res: 'ok', line: 'The key policy lets the worker\'s role call kms:GenerateDataKey and kms:Decrypt, and nothing more.' },
      star: { label: 'Anyone, anything', icon: '🌍', res: 'leak', line: 'kms:* for Principal "*": anyone can use the key, or change its policy.' } } },
    letter: { room: 'post', kind: 'lock', task: '2.2', name: 'Sealing big letters', ask: 'Some letters are 180 KB. How are they sealed?', tiles: {
      direct: { label: 'Strongroom slot', icon: '📮', res: 'block', line: 'KMS Encrypt takes at most 4,096 bytes. A 180 KB letter won\'t fit.' },
      env: { label: 'Data key, burn it', icon: '🔥', res: 'ok', line: 'GenerateDataKey: seal with the plaintext data key, erase it, and file the encrypted key with the letter.' },
      keep: { label: 'Data key, keep it', icon: '📎', res: 'leak', line: 'The plaintext data key is filed next to the letter. Whoever finds one has both.' },
      sse: { label: 'S3 seals it', icon: '🪣', res: 'ok', line: 'SSE-KMS: S3 does the envelope for you. PutObject needs kms:GenerateDataKey on the key.' } } },
    vault: { room: 'archive', kind: 'key', who: 'Order clerk', task: '2.3', name: 'Getting the password', ask: 'The archive changes the database password at midnight. How does the clerk get it?', tiles: {
      copy: { label: 'Copied at deploy', icon: '📋', res: 'block', line: 'At midnight the secret rotates. The copied password is stale, and the login fails.' },
      fetch: { label: 'Ask the archive', icon: '📜', res: 'ok', line: 'GetSecretValue on each errand, cached by the Parameters and Secrets extension (300 seconds by default).' },
      stop: { label: 'Stop rotation', icon: '⏸️', res: 'wide', line: 'Rotation off: it works, but the password never changes, so a leaked one stays good.' } } },
    pw: { room: 'hall', kind: 'lock', task: '2.3', name: 'Where the password lives', ask: 'The clerk needs the database password. Where is it kept?', tiles: {
      env: { label: 'Notice board', icon: '📌', res: 'leak', line: 'An environment variable: anyone who can view the function\'s settings reads it. AWS recommends Secrets Manager for credentials.' },
      sm: { label: 'Secrets Manager', icon: '📜', res: 'ok', line: 'GetSecretValue at run time, allowed on that one secret.' },
      ssm: { label: 'SecureString', icon: '🧾', res: 'ok', line: 'A Parameter Store SecureString: the clerk needs ssm:GetParameter and kms:Decrypt.' } } },
    logs: { room: 'tavern', kind: 'lock', task: '2.3', name: 'What the tavern hears', ask: 'Workers chat in the tavern. That chat is the log.', tiles: {
      raw: { label: 'Everything', icon: '🗣️', res: 'leak', line: 'The log line holds the customer\'s card number. Anyone who can read the logs has it.' },
      redact: { label: 'Masked', icon: '🤐', res: 'ok', line: 'PII is masked before it\'s logged: the order ID stays, the card number goes.' },
      off: { label: 'Silence', icon: '🔇', res: 'wide', line: 'No logs at all: nothing leaks, and nothing helps when the next errand fails.' } } }
  };

  // ---- The nights ----
  // set: [slot, starting tile]. open: rooms lit on the plan (the rest are dark). errands: who walks where tonight.
  // clues: tonight's gossip, [who, line] (the day walk shows them in the town in a later build). q: the debrief's match.
  const OPEN1 = ['gate', 'hall', 'ledger'];
  W.NIGHTS = [
    { id: 'pass', name: 'The Forged Pass', task: '2.1', open: OPEN1, set: [['gate', 'open']],
      errands: ['Visitors: gate → ledger, place orders'],
      clues: [['tess', 'A hooded one walked right through the gate last night, waving a pass he drew himself.'], ['postmaster', 'Real passes come from the castle\'s sign-in desk. They\'re signed. You can check them.'], ['bru', 'I\'ve posted a bounty on that pass forger. Whatever you put on the gate, real visitors still need to get through.']],
      q: /authoriz|cognito|user pool|jwt|api key/i },
    { id: 'badge', name: 'The Wrong Badge', task: '2.1', open: OPEN1, set: [['badge', 'read'], ['gate', 'apikey']],
      errands: ['Order clerk: hall → ledger, write orders', 'Visitors: gate → ledger'],
      clues: [['dutch', 'The order clerk came back from the ledger room with nothing written. Door wouldn\'t open for him.'], ['hobb', 'A key opens one door. A star key opens all of them. Guess which one thieves want.'], ['wen', 'Someone sold a copied gate tag at my café this morning. Paid in exact change.']],
      q: /least privilege|identity-based|IAM polic|AccessDenied/i },
    { id: 'cloak', name: 'The Borrowed Cloak', task: '2.1', open: OPEN1.concat('wardrobe'), set: [['cloak', 'fin'], ['badge', 'star']],
      errands: ['Order worker: wardrobe (ledger cloak) → ledger'],
      clues: [['tess', 'The order worker stood at the wardrobe all night. The cloak\'s tag only lets finance wear it.'], ['backups', 'Tags get copied. Somebody wrote "anyone" on a cloak once. Never again.'], ['kai', 'Someone handed the clerk a star key. Very generous. Very bad.']],
      q: /trust polic|assumerole|assume.?role|\bsts\b/i },
    { id: 'bucket', name: 'The Neighbour\'s Bucket', task: '2.1', open: OPEN1.concat('wardrobe', 'bridge'), set: [['bsign', 'none'], ['bkey', 'get']],
      errands: ['Bridge clerk: bridge → neighbour\'s storehouse, read'],
      clues: [['postmaster', 'The bridge clerk had the right key and still got turned back at the storehouse.'], ['hobb', 'Two locks on that bridge. Yours and theirs. Both have to say yes.'], ['lexi', 'Across accounts, both sides decide. Your policy and the bucket\'s. It\'s in every book I own.']],
      q: /cross.?account|bucket polic|resource.?based/i },
    { id: 'drawer', name: 'The Locked Drawer', task: '2.2', open: OPEN1.concat('wardrobe', 'bridge', 'strong'), set: [['drawer', 'none'], ['badge', 'other']],
      errands: ['Order clerk: hall → strongroom (borrow key) → ledger, seal and write'],
      clues: [['wen', 'The clerk waited at the strongroom till dawn. The key\'s owner never said he could use it.'], ['backups', 'A key policy decides who may use the key. Not the key ring. The key itself.'], ['dutch', 'And the clerk\'s been writing into the wrong table again. Check his keys.']],
      q: /key polic|\bkms\b|customer managed key/i },
    { id: 'letter', name: 'The Big Letter', task: '2.2', open: OPEN1.concat('wardrobe', 'bridge', 'strong', 'post'), set: [['letter', 'direct'], ['drawer', 'star']],
      errands: ['Post clerk: post room → strongroom → ledger, seal 180 KB letters'],
      clues: [['postmaster', 'The strongroom slot only takes thin letters. Four kilobytes. These are fat.'], ['lexi', 'Small key seals the letter. Big key seals the small key. Burn the copy you used.'], ['tess', 'Somebody wrote "anyone, anything" on the strongroom rule. I saw it.']],
      q: /envelope|data key|generatedatakey|client.?side encrypt/i },
    { id: 'vault', name: 'The Locked Vault', task: '2.3', open: OPEN1.concat('wardrobe', 'bridge', 'strong', 'post', 'archive'), set: [['vault', 'copy'], ['letter', 'keep']],
      errands: ['Order clerk: archive (password) → ledger, after midnight too'],
      clues: [['backups', 'The archive changes its lock at midnight. Every night. On schedule. Lovely.'], ['kai', 'The clerk copied the password on his first day. Still uses that copy.'], ['wen', 'Someone\'s been keeping the little letter keys in the same envelope as the letters.']],
      q: /rotat|secrets manager/i },
    { id: 'lips', name: 'Loose Lips', task: '2.3', open: OPEN1.concat('wardrobe', 'bridge', 'strong', 'post', 'archive', 'tavern'), set: [['pw', 'env'], ['logs', 'raw']],
      errands: ['Order clerk: hall → ledger, then a drink in the tavern'],
      clues: [['tess', 'The password\'s pinned on the great hall\'s notice board. For convenience.'], ['wen', 'The clerk reads customers\' card numbers out loud in the tavern. Every order.'], ['bru', 'The bounty on the eavesdropper says he drinks in the tavern. Every night. Listening.']],
      q: /environment variable|parameter store|securestring|\bpii\b|saniti[sz]|mask/i },
    { id: 'long', name: 'The Long Night', task: '2.1', boss: true, open: W.ORDER.filter(r => r !== 'lookout' && r !== 'captain' && r !== 'tower' && r !== 'barracks'), set: [['cloak', 'fin'], ['letter', 'direct'], ['gate', 'apikey'], ['logs', 'raw']],
      errands: ['Everyone, everywhere, all night', 'Then the raid'],
      clues: [['tess', 'The hooded ones are gathering. All of them. Tonight.'], ['hobb', 'Every lock you left wrong, they know about.'], ['dutch', 'Cloak, letters, gate, tavern. Check them all.']],
      q: /trust polic|envelope|data key|authoriz|saniti[sz]|pii/i }
  ];

  // Who says the gossip (the new three are Old Hobb, Tess and the Hooded Stranger; the rest are from earlier chapters).
  W.WHO = { tess: 'Tess the lamplighter', hobb: 'Old Hobb the locksmith', mira: 'Mira', bru: 'Bru', lexi: 'Lexi', stranger: 'The Hooded Stranger', postmaster: 'Pingsby\'s postmaster',
    backups: 'Sir S. Backups', wen: 'Grandma Wen', kai: 'Kai', dutch: 'Dutch', kagemaru: 'Kagemaru' };

  // ---- Pay (silver) ----
  W.PAY = { base: 20, ok: 10, wide: -5, breach: -5, debrief: 10 };

  // Score a plan: { slot: tile } -> per-slot results, candles and pay.
  W.score = function (night, plan) {
    const rows = night.set.map(([id]) => {
      const s = W.SLOTS[id], t = plan[id], tile = s.tiles[t];
      return { id, slot: s, tile: t, res: tile.res, line: tile.line };
    });
    const has = r => rows.some(x => x.res === r);
    const candles = [!has('block'), !has('leak'), !has('wide')];
    const pay = Math.max(0, W.PAY.base + rows.reduce((a, r) => a + (r.res === 'ok' ? W.PAY.ok : r.res === 'wide' ? W.PAY.wide : W.PAY.breach), 0));
    return { rows, candles, lit: candles.filter(Boolean).length, pay, breaches: rows.filter(r => r.res === 'block' || r.res === 'leak') };
  };
})();
