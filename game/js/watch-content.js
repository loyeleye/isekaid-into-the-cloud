// The Night Watch's words: breaches, Mira's morning review, quest scripts, gossip and the dusk briefings.
// Shapes: js/watch-schema.md (window.WATCH_CONTENT). Design: the Claude Doc "The Night Watch: new loop storyboard".
// Content only: the engine (js/mode-watch*.js) reads this and runs with placeholders for anything missing.
//
// Rules this file keeps:
//   - Short lines. Ladi doesn't want big text boxes: a bubble is one or two short sentences.
//   - Every AWS fact is checked against current AWS documentation, and every question is written fresh.
//   - Exactly one best choice per fix screen and per question.
//   - Names follow the story bible. Bram (Mira's late husband) is never reused.
//
// Docs behind the facts (checked Nov 18, 2026):
//   Cognito JWT checks (signature, exp, iss, client_id/aud, token_use):
//     https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
//   Identity pools (IdP token -> temporary AWS credentials): https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-identity.html
//   Access keys and roles: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html
//   Last-used keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_RotateAccessKey
//   SigV4 (signed parts valid 15 minutes; temporary credentials send X-Amz-Security-Token):
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html
//     https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-authenticating-requests.html
//   Trust policies and ExternalId: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html
//   STS session length (15 minutes up to the role's maximum, 1 hour by default): https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
//   Policy evaluation (explicit deny wins; cross-account needs both sides):
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html
//   DynamoDB LeadingKeys: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html
//   Cognito groups claim: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html
//   Lambda function URL auth (AWS_IAM or NONE): https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
//   Lambda execution roles: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
//   Lambda env var encryption: https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars-encryption.html
//   S3 default encryption (SSE-S3 on all new objects since Jan 5, 2023) and aws:SecureTransport:
//     https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-encryption-faq.html
//     https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html
//   Client-side vs server-side: https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingClientSideEncryption.html
//     https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/introduction.html
//   KMS: Encrypt takes up to 4,096 bytes; GenerateDataKey; key policies; cross-account (key policy + IAM policy, key ARN);
//     rotation (customer managed: off by default, 90 to 2,560 days, 365 by default; AWS managed: every year, can't change;
//     old key material is kept so old ciphertext still decrypts); deletion waits 7 to 30 days:
//     https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html
//     https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
//     https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html
//     https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html
//   ACM managed renewal (not for imported certificates) and AWS Private CA:
//     https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html
//     https://docs.aws.amazon.com/acm/latest/userguide/import-certificate.html
//     https://docs.aws.amazon.com/privateca/latest/userguide/PcaWelcome.html
//   EC2 key pairs (AWS keeps only the public key): https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
//   Secrets Manager rotation and the Lambda extension cache (300 seconds by default):
//     https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html
//     https://docs.aws.amazon.com/secretsmanager/latest/userguide/retrieving-secrets_lambda.html
//   Parameter Store SecureString (no built-in rotation): https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html
//   CloudWatch Logs data protection (masking; logs:Unmask to see values): https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/mask-sensitive-log-data.html
//   CloudTrail data events are off by default: https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html
//   S3 presigned URLs (up to 7 days with SigV4, shorter with temporary credentials): https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html
//   Macie finds sensitive data in S3: https://docs.aws.amazon.com/macie/latest/user/data-classification.html
//   Multi-tenant isolation with session tags (ABAC): https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html
//
// Extra fields beyond the schema (the engine may ignore them):
//   breaches[].built   the step 1 slot in js/watch-data.js this breach replaces (same lesson, now a fix screen)
//   breaches[].area    night 9 only: which of the eight areas it belongs to; night 9 has a pool, pick about one per area
//   breaches[].tell    the one AWS-style line shown when you inspect it
//   quests[].reward.floor / .permanent / .extra   which floor a seal-floor covers, whether it lasts, a tip-off or free item
//   quests[].needs     capstones: { ward: 4 }; their lines are in quests[].lines instead of an ask
//   gossip[].kind      'tip' | 'clue' | 'lead' | 'weather' | 'chad' | 'suspect' | 'alibi' | 'hot'
//   gossip[].suspect   for suspect and alibi lines; gossip[].hot: the area a day-9 'hot' line names
(function () {
  const C = window.WATCH_CONTENT = { version: 1 };

  // ================================================================================================================
  // BREACHES. Nights 1 to 8: twenty in all (the nine from step 1, now fix screens, and eleven new ones).
  // ================================================================================================================
  C.breaches = [
    // ---- Night 1: The Forged Pass ----
    { id: 'gate-forged-pass', night: 1, skill: '2.1.2', fix: 'badge-desk', built: 'gate',
      where: { floor: 'ground', room: 'gate' },
      title: 'The gate checks no wristband',
      story: 'A hooded figure strolls through the gate waving a pass he drew himself. Nobody checked it.',
      tell: 'Authorization: NONE on POST /orders',
      choices: [
        { text: 'Check visitors carry an API key', best: false,
          why: 'API keys are for usage plans and throttling. AWS says not to use them to decide who gets in.' },
        { text: 'Make visitors sign with IAM keys', best: false,
          why: 'Visitors sign in through the user pool and have no IAM keys. Their calls would all be refused.' },
        { text: 'A user pool guard checks each signed wristband', best: true,
          why: 'A Cognito user pool authorizer checks the token\'s signature and expiry. A forged one gets 401.' },
        { text: 'Hand out one shared gate password', best: false,
          why: 'Everyone knows a shared password, thieves included, and you can\'t tell who used it.' }
      ], raid: 'Forgers' },

    // ---- Night 2: The Wrong Badge ----
    { id: 'clerk-keys-too-wide', night: 2, skill: '2.1.6', fix: 'door', built: 'badge',
      where: { floor: 'upper', room: 'ledger' },
      title: 'The order clerk\'s keys open too much',
      story: 'The new order clerk only writes orders. His ring holds a star key that opens every door.',
      tell: 'Action: "*"  Resource: "*"',
      choices: [
        { text: 'Write access to every table', best: false,
          why: 'Works, but wider than his job. A thief could rewrite any ledger in the castle.' },
        { text: 'One key: write orders, orders ledger only', best: true,
          why: 'Least privilege: dynamodb:PutItem on that one table\'s ARN. The errand works and nothing else opens.' },
        { text: 'Keep the star key, he\'s trustworthy', best: false,
          why: 'Too loose. Whoever steals his role gets every door too.' },
        { text: 'A read-only key for the ledger', best: false,
          why: 'Too tight. He can look but can\'t write the order. AccessDeniedException.' }
      ], raid: 'Key Copiers' },

    { id: 'lookout-guest-pass', night: 2, skill: '2.1.1', fix: 'badge-desk',
      where: { floor: 'towers', room: 'lookout' },
      title: 'Travellers want a guest pass',
      story: 'Town-hall travellers want the lookout. Someone is handing them the castle\'s own keys.',
      tell: 'aws_access_key_id = AKIA... (shared with 40 visitors)',
      choices: [
        { text: 'Swap the town-hall ID for a short guest pass', best: true,
          why: 'A Cognito identity pool trades the sign-in token for temporary AWS credentials from a narrow role.' },
        { text: 'Give each traveller a copy of the castle keys', best: false,
          why: 'Long-lived keys handed out to strangers. You can never take them all back.' },
        { text: 'Make an IAM user for every traveller', best: false,
          why: 'It works, but you\'d run thousands of users by hand. Federation exists so you don\'t.' },
        { text: 'Let anyone up without a pass', best: false,
          why: 'No sign-in at all: the hooded one walks up with everyone else.' }
      ], raid: 'Gatecrashers' },

    // ---- Night 3: The Borrowed Cloak ----
    { id: 'wardrobe-cloak-tag', night: 3, skill: '2.1.5', fix: 'door', built: 'cloak',
      where: { floor: 'upper', room: 'wardrobe' },
      title: 'The ledger cloak\'s tag',
      story: 'The order worker needs the ledger cloak. Its tag says only finance may wear it.',
      tell: 'AccessDenied: not authorized to perform sts:AssumeRole',
      choices: [
        { text: 'The tag says anyone may wear it', best: false,
          why: 'Principal "*" lets any account try the cloak on. Far too loose.' },
        { text: 'Give the worker a copy of finance\'s keys', best: false,
          why: 'Sharing long-lived keys skips the cloak entirely. Use the role, not the keys.' },
        { text: 'Leave the tag as finance only', best: false,
          why: 'Too tight. The worker is still turned away at the wardrobe.' },
        { text: 'The tag names the order worker\'s role', best: true,
          why: 'The trust policy lists that role as Principal. It can assume the cloak, and nobody else can.' }
      ], raid: 'Cloak Thieves' },

    { id: 'ledger-laptop-keys', night: 3, skill: '2.1.3', fix: 'badge-desk',
      where: { floor: 'upper', room: 'ledger' },
      title: 'Keys that never expire',
      story: 'A clerk\'s laptop holds castle keys from two years ago. They still work.',
      tell: 'Access key age: 731 days. Last rotated: never.',
      choices: [
        { text: 'Hide the keys in a different folder', best: false,
          why: 'Moving the file doesn\'t change what it is. Whoever takes the laptop takes the keys.' },
        { text: 'Paste the root user\'s keys instead', best: false,
          why: 'Root keys can do anything and can\'t be limited. AWS says don\'t create them at all.' },
        { text: 'Sign in through Identity Center for short sessions', best: true,
          why: 'IAM Identity Center hands the laptop temporary credentials that expire. No keys sit on disk.' },
        { text: 'Rotate the keys once a year', best: false,
          why: 'Better than never, but they\'re still long-lived keys on a laptop that can walk off.' }
      ], raid: 'Key Hoarders' },

    // ---- Night 4: The Neighbour's Bucket ----
    { id: 'bridge-both-signs', night: 4, skill: '2.1.6', fix: 'door', built: 'bsign',
      where: { floor: 'upper', room: 'bridge-tower' },
      title: 'The storehouse needs both signs',
      story: 'The bridge clerk has the right key, yet the neighbour\'s storehouse still turns her back.',
      tell: 'AccessDenied: s3:GetObject (bucket in another account)',
      choices: [
        { text: 'Copy their crates into your castle nightly', best: false,
          why: 'It dodges the question and doubles the data to guard. The fix is the policy on their side.' },
        { text: 'The neighbour\'s sign names your clerk\'s role', best: true,
          why: 'Across accounts both sides must allow: your identity policy and their bucket policy.' },
        { text: 'The neighbour makes the storehouse public', best: false,
          why: 'Principal "*" lets your clerk in, and every passer-by too.' },
        { text: 'Give your clerk s3:* on everything', best: false,
          why: 'Your side was already fine. Without their sign she\'s still refused, and now she\'s over-keyed.' }
      ], raid: 'Bridge Raiders' },

    { id: 'hall-shared-pass', night: 4, skill: '2.1.8', fix: 'door',
      where: { floor: 'ground', room: 'hall' },
      title: 'Great-hall workers share one pass',
      story: 'The hall\'s workers pass orders room to room. They all wear the same master pass.',
      tell: 'All 6 functions: role/hall-master-role',
      choices: [
        { text: 'Each worker gets its own role with only its doors', best: true,
          why: 'One execution role per function, each allowed only the calls it makes. One leak opens one door.' },
        { text: 'Keep one pass, but change it monthly', best: false,
          why: 'Still one pass for everyone. Steal it once and you have every worker\'s doors for a month.' },
        { text: 'Workers send the shared password in each message', best: false,
          why: 'Now the secret travels with every order. Anyone who reads one message has it.' },
        { text: 'Drop the passes, the hall is inside the walls', best: false,
          why: 'Inside isn\'t safe by default. Each call between services should still prove who\'s calling.' }
      ], raid: 'Pass Sharers' },

    // ---- Night 5: The Locked Drawer ----
    { id: 'strongroom-key-rule', night: 5, skill: '2.2.4', fix: 'door', built: 'drawer',
      where: { floor: 'cellars', room: 'strongroom' },
      title: 'The strongroom\'s key rule',
      story: 'The order clerk waits at the strongroom all night. The master key\'s rule never names him.',
      tell: 'AccessDeniedException: kms:GenerateDataKey',
      choices: [
        { text: 'The key rule lets anyone do anything', best: false,
          why: 'kms:* for Principal "*": anyone could use the key, or rewrite its rule.' },
        { text: 'Give him kms:* in his own key ring only', best: false,
          why: 'If the key policy doesn\'t allow it, or delegate to IAM, his own policy alone isn\'t enough.' },
        { text: 'Let him carry the master key out', best: false,
          why: 'KMS keys never leave the strongroom. You send data in; the key stays.' },
        { text: 'The key rule lets his role encrypt and decrypt', best: true,
          why: 'The key policy allows his role kms:GenerateDataKey and kms:Decrypt on this key. Nothing more.' }
      ], raid: 'Key Grabbers' },

    { id: 'ledger-own-drawer', night: 5, skill: '2.1.7', fix: 'door',
      where: { floor: 'upper', room: 'ledger' },
      title: 'Each clerk only their own drawer',
      story: 'All the clerks\' records share one big cabinet. Any clerk can pull any drawer.',
      tell: 'dynamodb:Query  Resource: table/clerk-records (no condition)',
      choices: [
        { text: 'Trust the app to filter what it shows', best: false,
          why: 'The data still comes back. A bug or a crafted call shows someone else\'s drawer.' },
        { text: 'Lock the whole cabinet', best: false,
          why: 'Too tight. Nobody can reach even their own records.' },
        { text: 'Only rows whose key starts with your own ID', best: true,
          why: 'A dynamodb:LeadingKeys condition matches the partition key to the caller\'s ID. Fine-grained, per row.' },
        { text: 'A separate cabinet for every clerk', best: false,
          why: 'One table per clerk works, but it doesn\'t scale and is a pain to run. One condition does it.' }
      ], raid: 'Drawer Pickers' },

    { id: 'barracks-merchant-crates', night: 5, skill: '2.3.6', fix: 'door',
      where: { floor: 'cellars', room: 'barracks' },
      title: 'Merchants\' crates in one store',
      story: 'Twelve merchants rent space in the old barracks. Every merchant\'s key opens every crate.',
      tell: 's3:GetObject  Resource: arn:aws:s3:::castle-store/*',
      choices: [
        { text: 'One merchant at a time may enter', best: false,
          why: 'Takes turns, still sees everything. Isolation is about what, not when.' },
        { text: 'Each key opens only crates under its own name', best: true,
          why: 'Tag each session with the tenant and allow only its own prefix, like ${aws:PrincipalTag/tenant}/*.' },
        { text: 'Write a key rule for each merchant by hand', best: false,
          why: 'It works for twelve. At a thousand it breaks. One tag-based rule covers every tenant.' },
        { text: 'Paint names on the crates and trust people', best: false,
          why: 'A label isn\'t a lock. Every key still opens every crate.' }
      ], raid: 'Crate Snoops' },

    { id: 'post-chest-or-carriage', night: 5, skill: '2.2.1', fix: 'sealing-bench',
      where: { floor: 'ground', room: 'post-room' },
      title: 'Sealed chest, open cart',
      story: 'The letters sleep in a locked chest. But the cart that carries them up the hill is open to the road.',
      tell: 'Request over http:// accepted',
      choices: [
        { text: 'Keep the chest sealed and only accept closed carriages', best: true,
          why: 'Encrypt at rest and in transit: a bucket policy denies any request where aws:SecureTransport is false.' },
        { text: 'The chest is sealed, so the road doesn\'t matter', best: false,
          why: 'At rest covers the store, not the road. Without TLS anyone on the way can read it.' },
        { text: 'Close the carriage, leave the chest open', best: false,
          why: 'In transit covers the road only. Once it lands, anyone in the room reads it.' },
        { text: 'Send letters in pieces down different roads', best: false,
          why: 'Splitting isn\'t encrypting. Each piece is still readable.' }
      ], raid: 'Road Readers' },

    // ---- Night 6: The Big Letter ----
    { id: 'post-big-letter', night: 6, skill: '2.2.4', fix: 'sealing-bench', built: 'letter',
      where: { floor: 'ground', room: 'post-room' },
      title: 'A 180 KB letter',
      story: 'The strongroom slot only takes thin letters. Tonight\'s are thick.',
      tell: 'KMS Encrypt: input too large (max 4,096 bytes)',
      choices: [
        { text: 'Push it through the slot anyway', best: false,
          why: 'KMS Encrypt takes at most 4 KB. A 180 KB letter is refused.' },
        { text: 'Keep the plain data key next to the letter', best: false,
          why: 'Whoever finds the letter finds the key. Keep only the encrypted copy.' },
        { text: 'Cut it into 4 KB strips for the slot', best: false,
          why: 'Slow, costly and fiddly. Data keys exist so big things never go to KMS at all.' },
        { text: 'Seal it with a data key, then seal the data key', best: true,
          why: 'Envelope encryption: GenerateDataKey, encrypt with the plaintext key, erase it, keep the sealed copy.' }
      ], raid: 'Letter Openers' },

    { id: 'captain-seal-first', night: 6, skill: '2.2.3', fix: 'sealing-bench',
      where: { floor: 'towers', room: 'captain' },
      title: 'Seal it before the courier, or after?',
      story: 'The Captain\'s orders must stay secret even from the couriers who carry them.',
      tell: 'Courier role: s3:GetObject allowed, kms:Decrypt allowed',
      choices: [
        { text: 'Pick a courier who can\'t read', best: false,
          why: 'Trusting the carrier isn\'t a control. The next carrier might read just fine.' },
        { text: 'Seal it in the Captain\'s room before it leaves', best: true,
          why: 'Client-side encryption: the courier only ever holds ciphertext. Only the reader\'s key opens it.' },
        { text: 'Let the post room seal it on arrival', best: false,
          why: 'Server-side encryption protects it at rest, but the courier and the post room saw it plain.' }
      ], raid: 'Couriers\' Friends' },

    // ---- Night 7: The Locked Vault ----
    { id: 'archive-midnight-lock', night: 7, skill: '2.3.3', fix: 'hiding-spot', built: 'vault',
      where: { floor: 'cellars', room: 'archive' },
      title: 'The midnight vault',
      story: 'The archive changes the ledger password at midnight. The clerk copied it on his first day.',
      tell: 'Login failed: password authentication failed for user "clerk"',
      choices: [
        { text: 'Keep it in a plain String parameter', best: false,
          why: 'Not encrypted, and Parameter Store won\'t rotate it for you.' },
        { text: 'Ask the archive each errand, with a short cache', best: true,
          why: 'Call GetSecretValue at run time. Secrets Manager rotates it; the cache refreshes every few minutes.' },
        { text: 'Stop the archive changing it', best: false,
          why: 'It works, but a leaked password stays good forever.' },
        { text: 'Write the new one on his sleeve each night', best: false,
          why: 'Now the secret is in plain sight, and still goes stale between copies.' }
      ], raid: 'Vault Crackers' },

    { id: 'bridge-neighbour-crates', night: 7, skill: '2.2.6', fix: 'sealing-bench',
      where: { floor: 'upper', room: 'bridge-tower' },
      title: 'The neighbour\'s sealed crates',
      story: 'The neighbour must open crates you sealed. Their clerk gets "access denied" at the strongroom.',
      tell: 'AccessDeniedException: kms:Decrypt (key in account 1111...)',
      choices: [
        { text: 'Your key rule allows them, and their policy allows it too', best: true,
          why: 'Cross-account KMS: your key policy names their account, and their IAM policy allows the key\'s ARN.' },
        { text: 'Seal them with the castle\'s AWS managed key', best: false,
          why: 'You can\'t edit an AWS managed key\'s policy, so you can\'t share it. Use a customer managed key.' },
        { text: 'Send the unsealed crates over the bridge', best: false,
          why: 'Gives up encryption to dodge a policy. Fix the policy instead.' },
        { text: 'Only change their IAM policy', best: false,
          why: 'Half the job. Your key policy must allow their account too.' }
      ], raid: 'Bridge Raiders' },

    { id: 'strongroom-tumblers', night: 7, skill: '2.2.7', fix: 'sealing-bench',
      where: { floor: 'cellars', room: 'strongroom' },
      title: 'The master key\'s tumblers',
      story: 'The master key has never changed. The clerks fear changing it will lock out old letters.',
      tell: 'KeyRotationEnabled: false (customer managed key)',
      choices: [
        { text: 'Make a new key and re-seal everything by hand', best: false,
          why: 'Works, but costly and easy to get wrong. Automatic rotation does it with no re-encryption.' },
        { text: 'Leave it, rotation breaks old letters', best: false,
          why: 'It doesn\'t. Same key ID, old material kept. Old letters open fine.' },
        { text: 'Delete the key, make a new one', best: false,
          why: 'Everything sealed with the deleted key is lost for good.' },
        { text: 'Turn on automatic rotation; old letters still open', best: true,
          why: 'KMS keeps the old key material, so old data decrypts. You pick the period, 365 days by default.' }
      ], raid: 'Tumbler Pickers' },

    { id: 'archive-scroll-sort', night: 7, skill: '2.3.1', fix: 'hiding-spot',
      where: { floor: 'cellars', room: 'archive' },
      title: 'Sorting the archive scrolls',
      story: 'Three scrolls on one shelf: the town\'s names and addresses, the healer\'s records, and the menu.',
      tell: 'Bucket: castle-archive  Classification: none',
      choices: [
        { text: 'Lock all three the same way', best: false,
          why: 'Safe, but you can\'t tell what matters. Classifying first tells you where the effort goes.' },
        { text: 'Lock nothing, it\'s the castle\'s own cellar', best: false,
          why: 'Inside the walls isn\'t a control. PII and PHI still need protecting.' },
        { text: 'Lock names and the healer\'s records; leave the menu', best: true,
          why: 'Names and addresses are PII; health records are PHI. Both need protecting. The menu is public.' },
        { text: 'Lock only the healer\'s records', best: false,
          why: 'Names and addresses are personal data too.' }
      ], raid: 'Scroll Thieves' },

    // ---- Night 8: Loose Lips ----
    { id: 'hall-coat-password', night: 8, skill: '2.3.2', fix: 'hiding-spot', built: 'pw',
      where: { floor: 'ground', room: 'hall' },
      title: 'The password on the clerk\'s coat',
      story: 'The database password is pinned to the clerk\'s coat for everyone to read.',
      tell: 'Environment: DB_PASSWORD=wh1skers (plain text)',
      choices: [
        { text: 'Keep it in Secrets Manager and fetch it at run time', best: true,
          why: 'The function asks for it when it runs. Nobody who views its settings sees it.' },
        { text: 'Seal the coat tag with the castle\'s own key', best: false,
          why: 'Env vars encrypted with a KMS key are better than plain text, but a password belongs in a secret store.' },
        { text: 'Write it inside the worker\'s code', best: false,
          why: 'Worse: now it\'s in every copy of the code too.' }
      ], raid: 'Eavesdroppers' },

    { id: 'tavern-log', night: 8, skill: '2.3.4', fix: 'hiding-spot', built: 'logs',
      where: { floor: 'ground', room: 'tavern' },
      title: 'The tavern\'s log',
      story: 'Workers read card numbers aloud in the tavern. The log book writes every word down.',
      tell: 'INFO order 812 paid with card 4111 1111 1111 1111',
      choices: [
        { text: 'Only let the captain read the log', best: false,
          why: 'Fewer readers, same secret written down. Don\'t log what you don\'t need.' },
        { text: 'Mask anything that looks like a card number', best: true,
          why: 'A CloudWatch Logs data protection policy masks it. Only someone with logs:Unmask sees it.' },
        { text: 'Turn the logs off', best: false,
          why: 'Nothing leaks, and nothing helps you when the next order fails.' }
      ], raid: 'Eavesdroppers' },

    { id: 'ledger-notice-numbers', night: 8, skill: '2.3.5', fix: 'hiding-spot',
      where: { floor: 'upper', room: 'ledger' },
      title: 'Notices showing whole account numbers',
      story: 'The ledger room\'s notice board lists who paid, with every account number in full.',
      tell: 'GET /notices -> "acct": "8204551930127734"',
      choices: [
        { text: 'Encrypt the board', best: false,
          why: 'Readers decrypt to read it, so they still see every digit.' },
        { text: 'Take the notice board down', best: false,
          why: 'Too tight. People do need to check who paid.' },
        { text: 'Write the numbers smaller', best: false,
          why: 'Small print is still print.' },
        { text: 'Keep the full number in the ledger, show the last four', best: true,
          why: 'Mask in the app before display. People who only need to recognise it get ****7734.' }
      ], raid: 'Number Collectors' },

    // ================================================================================================================
    // The Long Night (night 9): a pool of new breaches, about one per area is used. Town levels have a fixed door,
    // badge desk and sealing bench; hiding spots are sparkles at a random spot. These reach the skills that were only
    // day quests (2.1.4, 2.2.2, 2.2.5), so night 9 covers all 21.
    // ================================================================================================================
    // ---- West Road (Bru) ----
    { id: 'n9-far-gate-deny', night: 9, area: 'west-road', skill: '2.1.6', fix: 'door',
      where: { level: 'west-road', spot: 'far-gate' },
      title: 'The far gate after dark',
      story: 'The far gate\'s sign says "carts allowed", so carts roll through all night. They should stop at dark.',
      tell: 'Effect: Allow  (no condition)',
      choices: [
        { text: 'Add a second sign: deny carts after dark', best: true,
          why: 'An explicit deny beats any allow. After dark carts are refused, whatever else says yes.' },
        { text: 'Add a sign: allow carts only by day', best: false,
          why: 'Allows add up. Another allow doesn\'t cancel the first one. Only a deny takes away.' },
        { text: 'Take the allow sign down at dusk by hand', best: false,
          why: 'Works until someone forgets. A deny with a time condition never forgets.' }
      ] },
    { id: 'n9-coach-house-seal', night: 9, area: 'west-road', skill: '2.1.1', fix: 'badge-desk',
      where: { level: 'west-road', spot: 'coach-house' },
      title: 'A pass from a town we never trusted',
      story: 'A rider shows a pass sealed by a town Pingsby never agreed to trust.',
      tell: 'Identity provider: unknown issuer',
      choices: [
        { text: 'Let him in if he knows a Pingsby name', best: false,
          why: 'Knowing a name proves nothing.' },
        { text: 'Accept only passes from towns we set up as trusted', best: true,
          why: 'Federation trusts the identity providers you configure. Tokens from any other issuer are refused.' },
        { text: 'Any seal is fine if it looks official', best: false,
          why: 'Anyone can make a seal. What matters is whose it is.' }
      ] },
    { id: 'n9-shrine-crest', night: 9, area: 'west-road', skill: '2.2.2', fix: 'sealing-bench',
      where: { level: 'west-road', spot: 'shrine' },
      title: 'The shrine\'s crest ran out',
      story: 'The shrine\'s offering box shows a crest that ran out last week. Pilgrims see a warning.',
      tell: 'Certificate status: EXPIRED (imported)',
      choices: [
        { text: 'Tell pilgrims to click past the warning', best: false,
          why: 'Teaching people to ignore warnings is how the forged crest gets in next.' },
        { text: 'Turn off the crest and use plain post', best: false,
          why: 'Without TLS anyone on the road reads the offerings.' },
        { text: 'Use a crest from the crest office that renews itself', best: true,
          why: 'ACM renews certificates it issued. Imported ones you have to renew and re-import yourself.' }
      ] },
    // ---- Main Street (Mira) ----
    { id: 'n9-cafe-back-door', night: 9, area: 'main-street', skill: '2.3.6', fix: 'door',
      where: { level: 'main-street', spot: 'cafe-back-door' },
      title: 'Suppliers in the wrong pantry',
      story: 'Wen\'s three suppliers share the café\'s back pantry. The miller\'s key opens the butcher\'s shelf.',
      tell: 'Condition: none (all suppliers, all shelves)',
      choices: [
        { text: 'Each supplier\'s key matches their own shelf\'s tag', best: true,
          why: 'Tag each session with the tenant and compare it to the resource\'s tag. One rule, every tenant.' },
        { text: 'Give every supplier the same key', best: false,
          why: 'That\'s the problem you started with.' },
        { text: 'Ask suppliers to stay on their own shelf', best: false,
          why: 'A request isn\'t a lock.' }
      ] },
    { id: 'n9-stall-stale-token', night: 9, area: 'main-street', skill: '2.1.2', fix: 'badge-desk',
      where: { level: 'main-street', spot: 'kagemaru-stall' },
      title: 'Credit on a stale token',
      story: 'Kagemaru\'s stall gives credit to anyone with a wristband. Nobody checks the date on it.',
      tell: 'exp: three days ago -> 200 OK',
      choices: [
        { text: 'Check the name printed on it', best: false,
          why: 'Anyone can print a name. The signature is the proof.' },
        { text: 'Check the signature, expiry, issuer and client', best: true,
          why: 'A token is only good if it\'s signed by your pool, not expired, from your issuer, for your app.' },
        { text: 'Check only that it\'s signed', best: false,
          why: 'A real token from last week is still signed. Check expiry too.' }
      ] },
    { id: 'n9-hobb-private-key', night: 9, area: 'main-street', skill: '2.2.5', fix: 'sealing-bench',
      where: { level: 'main-street', spot: 'key-cabinet' },
      title: 'The private half on a hook',
      story: 'Old Hobb\'s cabinet has a key pair hanging by the door. Both halves.',
      tell: 'workshop.pem: permissions 0644, readable by all',
      choices: [
        { text: 'Hang both, the cabinet is locked', best: false,
          why: 'Anyone who opens the cabinet can now be you.' },
        { text: 'Hang the private half, keep the public', best: false,
          why: 'Backwards. The public half is the one meant to be shared.' },
        { text: 'Keep the private half on you; only the public half hangs', best: true,
          why: 'The server needs only the public key. The private key stays with its owner, locked down.' }
      ] },
    // ---- Hill Road (Coo) ----
    { id: 'n9-library-archive', night: 9, area: 'hill-road', skill: '2.1.7', fix: 'door',
      where: { level: 'hill-road', spot: 'library-archive' },
      title: 'The archive room lets everyone in',
      story: 'Lexi\'s archive room is for scholars only. Tonight it opens for any signed-in reader.',
      tell: 'Authorizer: valid token -> allow (no group check)',
      choices: [
        { text: 'Open only for readers in the scholars group', best: true,
          why: 'Check the cognito:groups claim in the token, or map the group to its own role.' },
        { text: 'Any signed-in reader is fine', best: false,
          why: 'Signed in proves who you are, not what you may open.' },
        { text: 'Lexi checks faces at the door', best: false,
          why: 'She can\'t stand there all night. Let the token say it.' }
      ] },
    { id: 'n9-post-stale-signature', night: 9, area: 'hill-road', skill: '2.1.4', fix: 'badge-desk',
      where: { level: 'hill-road', spot: 'post-counter' },
      title: 'A parcel signed yesterday',
      story: 'Someone hands Coo a parcel slip signed yesterday, copied off a real one.',
      tell: 'X-Amz-Date: yesterday 14:02 -> accepted',
      choices: [
        { text: 'Make people sign slips by hand', best: false,
          why: 'A copy of a hand signature is still a signature. Check when it was made.' },
        { text: 'Refuse signatures older than 15 minutes', best: true,
          why: 'SigV4 signatures are only good near their timestamp, which stops a copied request being replayed.' },
        { text: 'Accept any slip with a real signature', best: false,
          why: 'A copied slip has a real signature. The timestamp is what stops replays.' }
      ] },
    { id: 'n9-seymour-tapes', night: 9, area: 'hill-road', skill: '2.2.1', fix: 'sealing-bench',
      where: { level: 'hill-road', spot: 'bunker' },
      title: 'Whose key seals the tapes?',
      story: 'Seymour\'s tapes are sealed, but he can\'t say who opened them or stop anyone.',
      tell: 'Encryption: SSE-S3 (Amazon S3 managed keys)',
      choices: [
        { text: 'Leave it, S3 already seals them', best: false,
          why: 'It does, but with keys you can\'t limit or audit per user. He wants a say.' },
        { text: 'Store them unsealed in a locked bunker', best: false,
          why: 'One lock, no seal. Whoever gets in reads everything.' },
        { text: 'Seal them with his own KMS key and its own rule', best: true,
          why: 'SSE-KMS with a customer managed key: its key policy decides who decrypts, and CloudTrail logs every use.' }
      ] },
    // ---- Far Lane (Kagemaru) ----
    { id: 'n9-town-gate-hardcoded', night: 9, area: 'far-lane', skill: '2.1.3', fix: 'door',
      where: { level: 'far-lane', spot: 'town-gate' },
      title: 'Keys nailed to the gatepost',
      story: 'The river gate\'s worker opens it with access keys carved right into its code.',
      tell: 'const AWS_SECRET_ACCESS_KEY = "wJal..."',
      choices: [
        { text: 'Give the worker a role; the SDK picks up its credentials', best: true,
          why: 'Code running on AWS gets temporary credentials from its role. No keys in the code at all.' },
        { text: 'Move the keys into a config file', best: false,
          why: 'Still long-lived keys, now in a different file.' },
        { text: 'Rotate the carved keys every week', best: false,
          why: 'Better than never, still keys in code. Use the role.' }
      ] },
    { id: 'n9-dock-external-id', night: 9, area: 'far-lane', skill: '2.1.5', fix: 'badge-desk',
      where: { level: 'far-lane', spot: 'harbourmaster' },
      title: 'The barge company\'s cloak',
      story: 'A barge company wears a cloak to unload at Odu\'s dock. Their other customers could ask to wear it too.',
      tell: 'Trust policy: Principal barge-co account, no condition',
      choices: [
        { text: 'Trust anyone from any account', best: false,
          why: 'Principal "*" on a trust policy is an open door.' },
        { text: 'The tag also asks for a secret word only you and they share', best: true,
          why: 'An sts:ExternalId condition stops the company being tricked into using your cloak for someone else.' },
        { text: 'Give the company an IAM user\'s keys instead', best: false,
          why: 'Long-lived keys held by an outsider. A role is the right tool.' }
      ] },
    { id: 'n9-granary-delete-key', night: 9, area: 'far-lane', skill: '2.2.4', fix: 'sealing-bench',
      where: { level: 'far-lane', spot: 'granary' },
      title: 'The granary\'s old key',
      story: 'The granary wants to throw away an old master key. Last year\'s sacks are still sealed with it.',
      tell: 'ScheduleKeyDeletion requested: PendingWindowInDays 7',
      choices: [
        { text: 'Delete it today, it\'s old', best: false,
          why: 'Data sealed with a deleted key can never be opened again.' },
        { text: 'Hand it to Odu to keep at the dock', best: false,
          why: 'KMS keys never leave KMS. Nobody can carry one off.' },
        { text: 'Disable it first and wait to see who complains', best: true,
          why: 'A disabled key can be turned back on. Deleted, every sack it sealed is lost. Deletion waits 7 to 30 days.' }
      ] },
    // ---- Hiding spots: one sparkle per level, at a random spot ----
    { id: 'n9-sparkle-west', night: 9, area: 'west-road', skill: '2.3.3', fix: 'hiding-spot',
      where: { level: 'west-road' },
      title: 'A password on a milestone',
      story: 'Someone chalked the coach house\'s ledger password on a milestone.',
      tell: 'Plaintext secret in a shared place',
      choices: [
        { text: 'Move it to Secrets Manager and change it', best: true,
          why: 'Once seen, a secret is spent. Rotate it, and keep the new one in a secret store.' },
        { text: 'Rub it off and keep the same password', best: false,
          why: 'Anyone who read it still has it. Change it.' },
        { text: 'Chalk it smaller', best: false,
          why: 'Still chalk. Still readable.' }
      ] },
    { id: 'n9-sparkle-main', night: 9, area: 'main-street', skill: '2.3.5', fix: 'hiding-spot',
      where: { level: 'main-street' },
      title: 'A receipt in the gutter',
      story: 'A café receipt in the gutter shows a full account number.',
      tell: 'Receipt: acct 8204551930127734',
      choices: [
        { text: 'Stop giving receipts', best: false,
          why: 'Too tight. People need receipts. Mask them.' },
        { text: 'Print only the last four digits', best: true,
          why: 'Mask before it\'s shown or printed. The full number stays in the ledger.' },
        { text: 'Print it in faint ink', best: false,
          why: 'Faint is still readable.' }
      ] },
    { id: 'n9-sparkle-hill', night: 9, area: 'hill-road', skill: '2.3.1', fix: 'hiding-spot',
      where: { level: 'hill-road' },
      title: 'A dropped satchel',
      story: 'A satchel by the library: a patient\'s note, a list of addresses and a bus timetable.',
      tell: 'Unclassified data found',
      choices: [
        { text: 'Protect only the patient\'s note', best: false,
          why: 'A list of addresses is personal data too.' },
        { text: 'Leave it, it\'s just paper', best: false,
          why: 'Paper with PII and PHI on it still needs protecting.' },
        { text: 'Protect the note and the addresses; the timetable is public', best: true,
          why: 'Health notes are PHI and addresses are PII. Public timetables need no lock.' }
      ] },
    { id: 'n9-sparkle-far', night: 9, area: 'far-lane', skill: '2.3.2', fix: 'hiding-spot',
      where: { level: 'far-lane' },
      title: 'A code on a crane\'s tag',
      story: 'The dock crane\'s automaton carries the warehouse code on a plain tag.',
      tell: 'Environment: WAREHOUSE_CODE=4471 (plain text)',
      choices: [
        { text: 'Seal the tag with a key only the crane may use', best: true,
          why: 'Encrypt the environment variable with a customer managed KMS key that only its role can decrypt.' },
        { text: 'Leave it, tags are private', best: false,
          why: 'Anyone who can view the function\'s settings reads plain env vars.' },
        { text: 'Paint over it', best: false,
          why: 'Hiding isn\'t sealing.' }
      ] },
    // ---- The castle's four floors: one new breach each ----
    { id: 'n9-towers-dispatch', night: 9, area: 'towers', skill: '2.2.3', fix: 'sealing-bench',
      where: { floor: 'towers', room: 'watchtower' },
      title: 'The watchtower\'s reports',
      story: 'The watchtower sends reports to the Captain through three couriers. Each could read them.',
      tell: 'Encryption: server-side only',
      choices: [
        { text: 'Use fewer couriers', best: false,
          why: 'Fewer readers is still readers.' },
        { text: 'Seal each report in the tower before it goes', best: true,
          why: 'Client-side encryption: only ciphertext ever leaves. The couriers carry it blind.' },
        { text: 'Let the Captain\'s room seal it when it lands', best: false,
          why: 'Server-side seals it at rest. Three couriers already read it.' }
      ] },
    { id: 'n9-upper-tenant-tags', night: 9, area: 'upper', skill: '2.3.6', fix: 'door',
      where: { floor: 'upper', room: 'ledger' },
      title: 'The guilds\' ledgers mix',
      story: 'The masons\' clerk can read the weavers\' pages in the shared ledger.',
      tell: 'Query: no tenant condition',
      choices: [
        { text: 'Trust clerks not to look', best: false,
          why: 'Not looking isn\'t a control.' },
        { text: 'Give each guild a copy of the whole ledger', best: false,
          why: 'Now every guild has every page.' },
        { text: 'Each clerk sees only rows that start with their guild', best: true,
          why: 'Make the tenant the partition key and allow only matching LeadingKeys.' }
      ] },
    { id: 'n9-ground-open-url', night: 9, area: 'ground', skill: '2.1.8', fix: 'door',
      where: { floor: 'ground', room: 'hall' },
      title: 'A worker with an open window',
      story: 'One great-hall worker takes orders through a window anyone can shout into.',
      tell: 'Function URL AuthType: NONE',
      choices: [
        { text: 'Make callers sign with IAM; allow only the hall\'s roles', best: true,
          why: 'AuthType AWS_IAM: callers sign with SigV4, and policies say which roles may invoke it.' },
        { text: 'Keep it open but hide the address', best: false,
          why: 'A secret address isn\'t authentication. It leaks.' },
        { text: 'Put a shared password in the URL', best: false,
          why: 'A password in a URL ends up in every log that sees it.' }
      ] },
    { id: 'n9-cellars-plain-param', night: 9, area: 'cellars', skill: '2.3.3', fix: 'hiding-spot',
      where: { floor: 'cellars', room: 'archive' },
      title: 'The barrel-room password',
      story: 'The barrel-room password is kept in the archive as plain writing.',
      tell: 'Parameter type: String',
      choices: [
        { text: 'Copy it into every worker\'s code', best: false,
          why: 'Now it\'s in plain text in many places.' },
        { text: 'Make it a SecureString sealed with KMS', best: true,
          why: 'A SecureString is encrypted with a KMS key. Readers need ssm:GetParameter and kms:Decrypt.' },
        { text: 'Rename it to something boring', best: false,
          why: 'A boring name is still plain text.' }
      ] }
  ];

  // ================================================================================================================
  // MIRA'S MORNING REVIEW. Two fresh questions per skill. `day` is the first morning it can come up: the day after
  // the skill's first breach or quest. Mira also re-asks breach and quest questions you've met; these widen the pool.
  // ================================================================================================================
  C.reviews = [
    // ---- 2.1.1 Federated access ----
    { id: 'r-2-1-1-a', skill: '2.1.1', day: 3,
      q: 'A mobile app\'s users sign in with a social login. The app must then upload to S3. What gives them AWS credentials?',
      choices: ['An IAM user per person', 'An API key in the app', 'The root user\'s keys', 'A Cognito identity pool'], answer: 3,
      why: 'An identity pool trades the sign-in token for temporary credentials from a role you choose.' },
    { id: 'r-2-1-1-b', skill: '2.1.1', day: 3,
      q: 'Staff already sign in to a company directory. They need the AWS console without new passwords. Best fit?',
      choices: ['Share one IAM user', 'Federate the directory with IAM Identity Center', 'Make IAM users with the same passwords', 'Email them access keys'], answer: 1,
      why: 'Federation lets the existing identity provider vouch for them. AWS hands out short sessions in return.' },
    // ---- 2.1.2 Bearer tokens ----
    { id: 'r-2-1-2-a', skill: '2.1.2', day: 2,
      q: 'An API should accept only users signed in to your Cognito user pool. Least effort?',
      choices: ['A resource policy allowing everyone', 'A Lambda authorizer that calls a database', 'A Cognito user pool authorizer on the API', 'An API key per user'], answer: 2,
      why: 'API Gateway checks the user pool\'s tokens itself. No code to write.' },
    { id: 'r-2-1-2-b', skill: '2.1.2', day: 2,
      q: 'Your own code checks a Cognito access token. Which check is NOT needed?',
      choices: ['client_id is your app', 'The user\'s password', 'Signature against the pool\'s public keys', 'exp is in the future'], answer: 1,
      why: 'A token stands in for the password. Check signature, expiry, issuer, client and token_use.' },
    // ---- 2.1.3 Programmatic access ----
    { id: 'r-2-1-3-a', skill: '2.1.3', day: 4,
      q: 'A developer\'s laptop has two-year-old access keys in its config. Best change?',
      choices: ['Sign in with IAM Identity Center for temporary sessions', 'Move the file to another folder', 'Use the root user\'s keys', 'Rotate them yearly'], answer: 0,
      why: 'Short-lived sessions mean nothing long-lived sits on the laptop.' },
    { id: 'r-2-1-3-b', skill: '2.1.3', day: 4,
      q: 'An old automation account is retired. Its access keys still exist. First safe step?',
      choices: ['Delete the account at once', 'Make the keys inactive, then delete them', 'Leave them in case', 'Share them with the new team'], answer: 1,
      why: 'Deactivating is reversible, so you can see if anything breaks before you delete.' },
    // ---- 2.1.4 Authenticated calls ----
    { id: 'r-2-1-4-a', skill: '2.1.4', day: 3,
      q: 'A script signs its own HTTP calls to AWS. Calls fail after its clock drifts by 20 minutes. Why?',
      choices: ['TLS failed', 'The key expired', 'SigV4 signatures are only accepted near their timestamp', 'The region is wrong'], answer: 2,
      why: 'Signed requests must reach AWS within 15 minutes of their timestamp. Sync the clock.' },
    { id: 'r-2-1-4-b', skill: '2.1.4', day: 6,
      q: 'Calls signed with an assumed role\'s keys get rejected as invalid. What\'s usually missing?',
      choices: ['An API key', 'The root user ID', 'The session token', 'The account password'], answer: 2,
      why: 'Temporary credentials have three parts. The session token goes in X-Amz-Security-Token.' },
    // ---- 2.1.5 Assume a role ----
    { id: 'r-2-1-5-a', skill: '2.1.5', day: 4,
      q: 'A role\'s permissions are right, but the caller gets "not authorized to perform sts:AssumeRole". Fix?',
      choices: ['Give the role AdministratorAccess', 'Make the role public', 'Create access keys for the role', 'Add the caller to the role\'s trust policy'], answer: 3,
      why: 'The trust policy decides who may assume the role. Permissions decide what it can do after.' },
    { id: 'r-2-1-5-b', skill: '2.1.5', day: 4,
      q: 'A partner company assumes a role in your account. How do you stop them being tricked into using it for someone else?',
      choices: ['Require an sts:ExternalId in the trust policy', 'Give them an IAM user', 'Use a longer session', 'Turn on MFA for your root user'], answer: 0,
      why: 'An ExternalId condition guards against the confused deputy problem with third parties.' },
    // ---- 2.1.6 Permissions for principals ----
    { id: 'r-2-1-6-a', skill: '2.1.6', day: 3,
      q: 'A function writes to one DynamoDB table. Which policy follows least privilege?',
      choices: ['AdministratorAccess', 'dynamodb:* on *', 'dynamodb:PutItem on that table\'s ARN', 'dynamodb:PutItem on *'], answer: 2,
      why: 'One action, one resource. Nothing it doesn\'t need.' },
    { id: 'r-2-1-6-b', skill: '2.1.6', day: 5,
      q: 'A role in account A reads a bucket in account B. Account A\'s policy allows it. It still fails. Why?',
      choices: ['The role needs root', 'Buckets must be public to share', 'B\'s bucket policy doesn\'t allow the role', 'S3 can\'t share across accounts'], answer: 2,
      why: 'Across accounts, both sides must allow: the identity policy and the resource policy.' },
    // ---- 2.1.7 Fine-grained authorization ----
    { id: 'r-2-1-7-a', skill: '2.1.7', day: 5,
      q: 'Users must read only DynamoDB items whose partition key is their own user ID. How?',
      choices: ['A table per user', 'Filter in the browser', 'A scan with a filter', 'A dynamodb:LeadingKeys condition'], answer: 3,
      why: 'LeadingKeys compares the partition key with the caller\'s identity on every request.' },
    { id: 'r-2-1-7-b', skill: '2.1.7', day: 6,
      q: 'Only "editors" in your user pool may call DELETE on the API. Simplest signal to check?',
      choices: ['The cognito:groups claim in the token', 'The user\'s email domain', 'The caller\'s IP address', 'A header the client sets'], answer: 0,
      why: 'Put editors in a group. The group shows up in their tokens and can map to its own role.' },
    // ---- 2.1.8 Cross-service authentication ----
    { id: 'r-2-1-8-a', skill: '2.1.8', day: 3,
      q: 'Five Lambda functions share one execution role with wide rights. Best change?',
      choices: ['Move them into one function', 'One role per function with only its own calls', 'Rotate the shared role monthly', 'Put a password in each event'], answer: 1,
      why: 'Separate roles mean a bug or leak in one function can\'t reach the others\' resources.' },
    { id: 'r-2-1-8-b', skill: '2.1.8', day: 5,
      q: 'One service calls another\'s Lambda function URL. Only that service may call it. Setting?',
      choices: ['A shared API key in the query string', 'A public URL behind a long name', 'AuthType NONE with a secret path', 'AuthType AWS_IAM and allow only the caller\'s role'], answer: 3,
      why: 'With AWS_IAM, callers must sign with SigV4, and policy decides which roles may invoke.' },
    // ---- 2.2.1 At rest and in transit ----
    { id: 'r-2-2-1-a', skill: '2.2.1', day: 6,
      q: 'A bucket must refuse any request not sent over HTTPS. What does that?',
      choices: ['Turn on versioning', 'Default SSE-S3 encryption', 'Block public access', 'Deny when aws:SecureTransport is false'], answer: 3,
      why: 'A bucket policy deny on aws:SecureTransport "false" stops plain HTTP. That\'s in transit.' },
    { id: 'r-2-2-1-b', skill: '2.2.1', day: 6,
      q: 'You need to control who can decrypt S3 objects and log each use of the key. Which encryption?',
      choices: ['SSE-S3', 'SSE-KMS with a customer managed key', 'No encryption, use IAM only', 'Base64 encoding'], answer: 1,
      why: 'A customer managed key has its own key policy, and every use is logged in CloudTrail.' },
    // ---- 2.2.2 Certificate management ----
    { id: 'r-2-2-2-a', skill: '2.2.2', day: 4,
      q: 'Internal services need TLS certificates that only your own machines trust. Which service?',
      choices: ['Secrets Manager', 'AWS Private CA', 'A public ACM certificate', 'A self-signed certificate per service'], answer: 1,
      why: 'AWS Private CA issues private certificates trusted by clients that trust your CA.' },
    { id: 'r-2-2-2-b', skill: '2.2.2', day: 7,
      q: 'A load balancer\'s certificate expired. ACM renews its others. Likely cause?',
      choices: ['The bucket was public', 'The key was rotated', 'It was imported into ACM', 'ACM never renews anything'], answer: 2,
      why: 'ACM doesn\'t renew imported certificates. You renew and re-import them yourself.' },
    // ---- 2.2.3 Client-side vs server-side ----
    { id: 'r-2-2-3-a', skill: '2.2.3', day: 5,
      q: 'Data must never be readable by AWS or anyone on the way, even for a moment. Which approach?',
      choices: ['SSE-S3', 'SSE-KMS', 'HTTPS only', 'Client-side encryption before upload'], answer: 3,
      why: 'Client-side means only ciphertext leaves your hands. Server-side encrypts after it arrives.' },
    { id: 'r-2-2-3-b', skill: '2.2.3', day: 7,
      q: 'You want S3 to encrypt objects for you with no code changes. Which kind is that?',
      choices: ['Server-side encryption', 'Client-side encryption', 'Envelope encryption done by hand', 'Hashing'], answer: 0,
      why: 'Server-side: S3 encrypts on write and decrypts on read for callers who are allowed.' },
    // ---- 2.2.4 Keys to encrypt and decrypt ----
    { id: 'r-2-2-4-a', skill: '2.2.4', day: 6,
      q: 'You must encrypt a 2 MB file with KMS. Which call starts it?',
      choices: ['Decrypt', 'GenerateDataKey', 'Encrypt with the file as input', 'CreateKey for every file'], answer: 1,
      why: 'KMS Encrypt takes 4 KB at most. Use a data key: encrypt locally, keep only its encrypted copy.' },
    { id: 'r-2-2-4-b', skill: '2.2.4', day: 6,
      q: 'A role has kms:Decrypt in its IAM policy, but the key policy neither names it nor trusts IAM. Result?',
      choices: ['It works only in the console', 'It works for 1 hour', 'AccessDeniedException', 'It works'], answer: 2,
      why: 'A key policy must allow the call, directly or by delegating to IAM. IAM alone isn\'t enough.' },
    // ---- 2.2.5 Dev certificates and SSH keys ----
    { id: 'r-2-2-5-a', skill: '2.2.5', day: 3,
      q: 'You make an SSH key pair for a dev EC2 instance. What does the instance keep?',
      choices: ['The private key', 'Both halves', 'Neither', 'The public key'], answer: 3,
      why: 'The instance holds the public key. You keep the private key, and AWS doesn\'t store it.' },
    { id: 'r-2-2-5-b', skill: '2.2.5', day: 6,
      q: 'A dev needs HTTPS on a local test server today. Fine for testing?',
      choices: ['A self-signed certificate', 'The production certificate\'s private key', 'Turning TLS off in production', 'A public CA certificate for localhost'], answer: 0,
      why: 'Self-signed is fine for local testing. Browsers won\'t trust it, which is why it never goes live.' },
    // ---- 2.2.6 Across accounts ----
    { id: 'r-2-2-6-a', skill: '2.2.6', day: 8,
      q: 'Account B must decrypt data sealed with your KMS key. What\'s needed?',
      choices: ['Copy the key to B', 'Your key policy allows B, and B\'s IAM policy allows the key', 'Only B\'s IAM policy', 'An AWS managed key'], answer: 1,
      why: 'Both sides must allow. Use a customer managed key, since you can\'t edit an AWS managed key\'s policy.' },
    { id: 'r-2-2-6-b', skill: '2.2.6', day: 8,
      q: 'In account B\'s IAM policy, how do you name a KMS key that lives in your account?',
      choices: ['By its description', 'By its creation date', 'By its key ARN', 'By its alias name'], answer: 2,
      why: 'IAM policy statements identify KMS keys by key ARN, not alias.' },
    // ---- 2.2.7 Key rotation ----
    { id: 'r-2-2-7-a', skill: '2.2.7', day: 7,
      q: 'You turn on automatic rotation for a customer managed key. Data sealed last year?',
      choices: ['Must be re-encrypted first', 'Is lost', 'Needs the old key ID', 'Still decrypts'], answer: 3,
      why: 'KMS keeps the old key material under the same key ID, so old data still opens.' },
    { id: 'r-2-2-7-b', skill: '2.2.7', day: 8,
      q: 'Which statement about AWS managed keys is true?',
      choices: ['They rotate every year and you can\'t change it', 'Rotation is off until you turn it on', 'You set the period from 90 days', 'They never rotate'], answer: 0,
      why: 'AWS managed keys rotate yearly. Customer managed keys are off by default and you choose the period.' },
    // ---- 2.3.1 Data classification ----
    { id: 'r-2-3-1-a', skill: '2.3.1', day: 4,
      q: 'Which of these is PHI?',
      choices: ['A public press release', 'A patient\'s diagnosis', 'A product price list', 'A bus timetable'], answer: 1,
      why: 'Protected health information is health data tied to a person.' },
    { id: 'r-2-3-1-b', skill: '2.3.1', day: 8,
      q: 'You must find which S3 buckets hold personal data. Which service helps most?',
      choices: ['AWS Shield', 'Amazon Route 53', 'Amazon Macie', 'Amazon Inspector'], answer: 2,
      why: 'Macie scans S3 objects for sensitive data such as names, addresses and card numbers.' },
    // ---- 2.3.2 Encrypted environment variables ----
    { id: 'r-2-3-2-a', skill: '2.3.2', day: 3,
      q: 'A Lambda env var holds an API token. Only this function should be able to read it. Best of these?',
      choices: ['Leave it as plain text', 'Base64 encode it', 'Put it in the function name', 'Encrypt it with a customer managed KMS key only its role can use'], answer: 3,
      why: 'Lambda encrypts env vars at rest anyway. A customer managed key lets you limit who can decrypt.' },
    { id: 'r-2-3-2-b', skill: '2.3.2', day: 9,
      q: 'Anyone with lambda:GetFunctionConfiguration can read plain env vars. What stops that for a password?',
      choices: ['Keep it in Secrets Manager and fetch it at run time', 'Use a longer variable name', 'Turn off logging', 'Use a bigger memory size'], answer: 0,
      why: 'A secret store keeps it out of the function\'s settings entirely.' },
    // ---- 2.3.3 Secret management services ----
    { id: 'r-2-3-3-a', skill: '2.3.3', day: 3,
      q: 'A database password must change every 30 days without code changes. Which service?',
      choices: ['A text file in S3', 'Secrets Manager with rotation', 'Parameter Store String', 'An env var'], answer: 1,
      why: 'Secrets Manager rotates on a schedule. Apps fetching it each time get the new value.' },
    { id: 'r-2-3-3-b', skill: '2.3.3', day: 8,
      q: 'You need an encrypted config value. No rotation needed, lowest cost. Which?',
      choices: ['A KMS key', 'DynamoDB', 'Parameter Store SecureString', 'Secrets Manager'], answer: 2,
      why: 'A standard SecureString is encrypted with KMS and has no storage charge. It just doesn\'t rotate itself.' },
    // ---- 2.3.4 Sanitizing sensitive data ----
    { id: 'r-2-3-4-a', skill: '2.3.4', day: 7,
      q: 'Card numbers keep showing up in CloudWatch Logs. Least effort to hide them?',
      choices: ['Turn off logging', 'Delete the logs daily', 'Make the logs public', 'A data protection policy on the log group'], answer: 3,
      why: 'Data protection policies mask matching data as it\'s ingested. logs:Unmask is needed to see it.' },
    { id: 'r-2-3-4-b', skill: '2.3.4', day: 9,
      q: 'A function logs the whole request body for debugging. What\'s the safest habit?',
      choices: ['Log IDs, not secrets or personal data', 'Log everything at DEBUG level', 'Log to a public bucket', 'Only log on weekends'], answer: 0,
      why: 'Sanitize before you log. What\'s never written down can\'t leak.' },
    // ---- 2.3.5 Masking in the application ----
    { id: 'r-2-3-5-a', skill: '2.3.5', day: 5,
      q: 'A support screen must help agents spot an account without exposing it. Show?',
      choices: ['Nothing at all', 'Only the last four digits', 'The full number', 'The number encrypted'], answer: 1,
      why: 'Masking keeps it recognisable but useless to a thief. The full value stays in the backend.' },
    { id: 'r-2-3-5-b', skill: '2.3.5', day: 9,
      q: 'Where should masking for a web page happen?',
      choices: ['After the page loads', 'Nowhere, use HTTPS', 'In the backend, before the data is sent', 'In the browser with CSS'], answer: 2,
      why: 'Hide it before it leaves the server. Anything sent to the browser can be read.' },
    // ---- 2.3.6 Multi-tenant data access ----
    { id: 'r-2-3-6-a', skill: '2.3.6', day: 3,
      q: 'Tenants share one S3 bucket under their own prefix. Scalable way to keep them apart?',
      choices: ['A bucket policy line per tenant', 'Trust the app', 'One bucket for all with no prefix', 'Allow ${aws:PrincipalTag/tenant}/* from session tags'], answer: 3,
      why: 'Attribute-based access control: one rule, and the tag decides which prefix each session may touch.' },
    { id: 'r-2-3-6-b', skill: '2.3.6', day: 6,
      q: 'In a shared DynamoDB table, what makes per-tenant isolation easy to enforce?',
      choices: ['Tenant ID as the partition key, checked with LeadingKeys', 'A random partition key', 'One global secondary index', 'Scanning with a filter'], answer: 0,
      why: 'If every item starts with the tenant ID, a LeadingKeys condition keeps each tenant to its own items.' }
  ];

  // ================================================================================================================
  // QUESTS. Every quest named in the storyboard. A step is: walk to a person or spot, then talk (say) or answer (ask).
  // A step whose `who` isn't the giver is a referral (storyboard "Relationships"): help.high is the extra line a
  // warm, trusting helper adds; help.low is the review asked first when trust is low; help.deny is the line when
  // their tie to the giver is cool.
  // Spots used: base-camp, forge, bakery, cafe, kagemaru-stall, lock-shop, first-fork (Main Street); post-office,
  // library, bounty-board, doug-flat, bunker (Hill Road); far-gate, lookout-ruin, shrine, coach-house, castle-gate
  // (West Road); well, granary, dock, cottage, town-gate, chute-mouth (Far Lane).
  // ================================================================================================================
  C.quests = [
    // ---------------------------------------------- Trust quests -------------------------------------------------
    { id: 'coo-bounced-letters', giver: 'coo', kind: 'trust', opens: 2, closes: 4, skill: '2.1.4',
      reward: { silver: 20, heart: true, unlock: null, extra: 'tip-off' },
      steps: [
        { at: { level: 'hill-road', who: 'coo' }, say: [['coo', 'Coo. Eleven letters bounced today. Eleven.'],
          ['coo', 'The castle only takes letters with a fresh signature.'], ['seoyeon', 'Show me the pile.']] },
        { at: { level: 'hill-road', spot: 'post-office' }, ask: {
          q: 'SigV4 (Signature Version 4). Which request to the castle API does AWS accept?',
          choices: ['A request signed by someone else\'s key, with your name in it', 'A request signed with your own secret key two minutes ago', 'A copy of a request you signed yesterday', 'An unsigned request sent over HTTPS'], answer: 1,
          why: 'SigV4: the signature must be yours and recent. Copies and old ones are turned away.' } },
        { at: { level: 'hill-road', who: 'coo' }, say: [['coo', 'Coo-ah. Delivered, at least once. As promised.'],
          ['coo', 'The SDK signs for you, you know. Most people never see it.']] }
      ], clue: null },

    { id: 'coo-letters-bridge', giver: 'coo', kind: 'trust', opens: 5, closes: 7, skill: '2.1.4',
      reward: { silver: 20, heart: true, unlock: null, extra: 'tip-off' },
      steps: [
        { at: { level: 'hill-road', who: 'coo' }, say: [['coo', 'The bridge clerk signs with a borrowed cloak. Still bounces.'],
          ['seoyeon', 'A borrowed cloak comes with three things, not two.']] },
        { at: { level: 'hill-road', spot: 'post-office' }, ask: {
          q: 'Temporary credentials from STS. A request is signed with the access key ID and secret access key, and still gets InvalidClientTokenId. What\'s missing?',
          choices: ['Your IAM user password', 'A longer request body', 'The session token (X-Amz-Security-Token)', 'A second signature'], answer: 2,
          why: 'Temporary credentials are a key ID, a secret and a session token. Send the token too.' } },
        { at: { level: 'hill-road', who: 'coo' }, say: [['coo', 'Three parts. I\'ll stamp it on the counter. Coo.']] }
      ], clue: null },

    { id: 'bru-crest-office', giver: 'bru', kind: 'trust', opens: 3, closes: 5, skill: '2.2.2',
      reward: { silver: 20, heart: true, unlock: null, extra: 'tip-off' },
      steps: [
        { at: { level: 'hill-road', who: 'bru' }, say: [['bru', '¡Mira! The Guild\'s boards should trust each other.'],
          ['bru', 'Without paying the town hall for its public crest every time. Ay, no.']] },
        { at: { level: 'hill-road', spot: 'bounty-board' }, ask: {
          q: 'TLS certificates. Only the Guild\'s own internal services need to trust these certificates. Where should they come from?',
          choices: ['A public ACM certificate', 'A self-signed certificate made on each server', 'No certificate: use plain HTTP inside', 'AWS Private CA'], answer: 3,
          why: 'Private CA issues private certificates. Only machines that trust your CA trust them.' } },
        { at: { level: 'hill-road', who: 'bru' }, say: [['bru', '*stamp* Crest office open! For the public site, ACM. For us, private.']] }
      ], clue: null },

    { id: 'bru-crest-expired', giver: 'bru', kind: 'trust', opens: 6, closes: 8, skill: '2.2.2',
      reward: { silver: 20, heart: true, unlock: null, extra: 'tip-off' },
      steps: [
        { at: { level: 'hill-road', who: 'bru' }, say: [['bru', 'EHHH?! One board\'s crest ran out. The others renew themselves!'],
          ['seoyeon', 'Where did that one come from?'], ['bru', '...A man in the next town. We brought it in.']] },
        { at: { level: 'hill-road', spot: 'bounty-board' }, ask: {
          q: 'AWS Certificate Manager. A certificate in ACM expired instead of renewing. Why?',
          choices: ['It was imported, and ACM doesn\'t renew imported certificates', 'ACM never renews certificates', 'The load balancer using it was stopped', 'Certificates in ACM never expire'], answer: 0,
          why: 'ACM renews certificates it issued. Imported ones you renew and re-import yourself.' } },
        { at: { level: 'hill-road', who: 'bru' }, say: [['bru', 'I\'ll put it on the board. In red. With string.']] }
      ], clue: null },

    { id: 'hobb-key-pair', giver: 'hobb', kind: 'trust', opens: 2, closes: 5, skill: '2.2.5',
      reward: { silver: 20, heart: true, unlock: 'seal-floor', floor: 'cellars' },
      steps: [
        { at: { level: 'main-street', who: 'hobb' }, say: [['hobb', 'Apprentice needs a practice key pair. For the workshop door.'],
          ['hobb', 'Two halves. One goes on the door. One doesn\'t.']] },
        { at: { level: 'main-street', spot: 'lock-shop' }, ask: {
          q: 'EC2 key pairs (public-key cryptography). Which half goes on the instance?',
          choices: ['Neither: you type the key in at login', 'The public key', 'The private key', 'Both halves'], answer: 1,
          why: 'The door keeps the public key. The private key stays with whoever opens it.' } },
        { at: { level: 'main-street', who: 'hobb' }, say: [['hobb', 'Hm. Right first go. Cellars won\'t bother you tonight.']] }
      ], clue: null },

    { id: 'hobb-practice-crest', giver: 'hobb', kind: 'trust', opens: 5, closes: 8, skill: '2.2.5',
      reward: { silver: 20, heart: true, unlock: 'seal-floor', floor: 'cellars' },
      steps: [
        { at: { level: 'main-street', who: 'hobb' }, say: [['hobb', 'New gate in the workshop. Wants a crest to test against.'],
          ['hobb', 'Made one myself. Drew it with a nail.']] },
        { at: { level: 'main-street', spot: 'lock-shop' }, ask: {
          q: 'Self-signed certificates. Where is a self-signed certificate fine to use?',
          choices: ['On every public site', 'On a production login page', 'In a test environment only', 'Nowhere, ever'], answer: 2,
          why: 'Self-signed is fine for testing. Nobody else trusts it, so it never goes on the real gate.' } },
        { at: { level: 'main-street', who: 'hobb' }, say: [['hobb', 'Crest\'ll hold.']] }
      ], clue: null },

    { id: 'mira-recipes', giver: 'mira', kind: 'trust', opens: 2, closes: 4, skill: '2.3.3',
      reward: { silver: 20, heart: true, unlock: null, extra: 'free-lantern' },
      steps: [
        { at: { level: 'main-street', who: 'mira' }, say: [['mira', 'Hold still. Look at the recipe card.'],
          ['mira', 'The cellar password. Written on it. Everyone reads that card.']] },
        { at: { level: 'main-street', who: 'wen' }, say: [['wen', 'A strongbox, dear. The cook asks it each time. Never copies it out.']],
          help: { high: 'And it can change its own lock later. Mira will like that.', low: 'r-2-3-3-a',
            deny: 'Not today, dear. Mira and I had words about the soup.' } },
        { at: { level: 'main-street', spot: 'base-camp' }, ask: {
          q: 'Secrets in code. A database password is written in the app\'s source code. Where should it live?',
          choices: ['In the code, but in a comment', 'In the developer\'s head only', 'In a public config file', 'In Secrets Manager (or a Parameter Store SecureString), fetched at run time'], answer: 3,
          why: 'Secrets Manager or a SecureString: out of code and config, fetched when needed.' } },
        { at: { level: 'main-street', who: 'mira' }, say: [['mira', 'Good. That\'s how you clean a wound.']] }
      ], clue: null },

    { id: 'mira-lock-changes', giver: 'mira', kind: 'trust', opens: 6, closes: 8, skill: '2.3.3',
      reward: { silver: 20, heart: true, unlock: null, extra: 'free-lantern' },
      steps: [
        { at: { level: 'main-street', who: 'mira' }, say: [['mira', 'The strongbox has kept one combination for a week.'],
          ['mira', 'A wound you never clean festers.']] },
        { at: { level: 'main-street', spot: 'base-camp' }, ask: {
          q: 'Secrets Manager rotation. The database password now rotates every 30 days. How does the app keep working?',
          choices: ['It fetches the current secret from Secrets Manager when it needs it', 'Someone pastes each new password into the code', 'It keeps using the first password', 'Rotation is turned off for that app'], answer: 0,
          why: 'Secrets Manager rotates on a schedule. Apps that fetch it every time always have the new one.' } },
        { at: { level: 'main-street', who: 'mira' }, say: [['mira', 'There. It\'ll heal itself now. I like that in a lock.']] }
      ], clue: null },

    { id: 'lexi-which-stamp', giver: 'lexi', kind: 'trust', opens: 2, closes: 4, skill: '2.1.2',
      reward: { silver: 20, heart: true, unlock: 'seal-floor', floor: 'towers' },
      steps: [
        { at: { level: 'hill-road', who: 'lexi' }, say: [['lexi', 'Behold. The reader\'s card. Three stamps of power.'],
          ['lexi', 'Who you are. What you may borrow. And one for renewing.'], ['lexi', 'Which does the desk check? Choose wisely.']] },
        { at: { level: 'hill-road', spot: 'library' }, ask: {
          q: 'Cognito tokens. An API receives a Cognito access token. What should it check?',
          choices: ['Only that a token is present', 'The signature, expiry, issuer, and that it was issued for this app\'s client ID', 'Only the user\'s email address in the ID token', 'That the refresh token is the newest'], answer: 1,
          why: 'Check the access token: signature, expiry, issuer, and that it was issued for your app.' } },
        { at: { level: 'hill-road', who: 'lexi' }, say: [['lexi', 'The Eye of Total Recall approves.'], ['lexi', '...That was genuinely good. Thank you.']] }
      ], clue: null },

    { id: 'lexi-own-pages', giver: 'lexi', kind: 'trust', opens: 4, closes: 6, skill: '2.1.7',
      reward: { silver: 20, heart: true, unlock: 'seal-floor', floor: 'towers' },
      steps: [
        { at: { level: 'hill-road', who: 'lexi' }, say: [['lexi', 'The Great Catalogue. Every reader\'s loans, one tome.'],
          ['lexi', 'A reader peeked at another\'s rows. Unforgivable.']] },
        { at: { level: 'hill-road', who: 'doug' }, say: [['doug', 'Kevin read every row once. Fast. Nothing told him which were his.']],
          help: { high: 'If each row started with the reader\'s name, he\'d have been stuck. Just saying.', low: 'r-2-1-7-a',
            deny: 'Lexi banned my crawlers. I\'m not helping the Index.' } },
        { at: { level: 'hill-road', spot: 'library' }, ask: {
          q: 'DynamoDB fine-grained access. Each user may read only items whose partition key is their own user ID. How?',
          choices: ['Filter the other items out in the app\'s screen', 'Deny all reads on the table', 'An IAM condition on dynamodb:LeadingKeys matching the caller\'s ID', 'A separate table per user'], answer: 2,
          why: 'dynamodb:LeadingKeys matches the partition key to the caller. Per row, one rule.' } },
        { at: { level: 'hill-road', who: 'lexi' }, say: [['lexi', 'Sealed. The Catalogue keeps its secrets now.']] }
      ], clue: null },

    { id: 'kai-night-cloak', giver: 'kai', kind: 'trust', opens: 3, closes: 5, skill: '2.1.5',
      reward: { silver: 20, heart: true, unlock: 'back-stair' },
      steps: [
        { at: { level: 'main-street', who: 'kai' }, say: [['kai', 'The night clerk wants his own copy of the cloak\'s key. Forever.'],
          ['kai', 'Yes, chef. Great idea. Tell him, would you?']] },
        { at: { level: 'main-street', spot: 'base-camp' }, ask: {
          q: 'IAM roles and STS. A night clerk needs access only during the shift. What should they do instead of keeping a copied access key?',
          choices: ['Keep the copied key, and rotate it monthly', 'Use the day clerk\'s access key', 'Get an IAM user with no expiry', 'Assume a role each shift and use the temporary credentials, which expire'], answer: 3,
          why: 'Assume the role each time. STS hands out credentials that expire.' } },
        { at: { level: 'main-street', who: 'kai' }, say: [['kai', 'Fine. I\'ll show you the back stair. Don\'t tell anyone I was nice.']] }
      ], clue: null },

    { id: 'kai-sealed-default', giver: 'kai', kind: 'trust', opens: 5, closes: 7, skill: '2.2.1',
      reward: { silver: 20, heart: true, unlock: 'seal-floor', floor: 'upper' },
      steps: [
        { at: { level: 'main-street', who: 'kai' }, say: [['kai', 'Ledger pages get sealed as they\'re filed. Good.'],
          ['kai', 'One came up the hill on an open cart. Not good.']] },
        { at: { level: 'main-street', spot: 'base-camp' }, ask: {
          q: 'Encryption in transit for S3. Objects are encrypted at rest. How do you refuse plain HTTP requests?',
          choices: ['A bucket policy that denies requests when aws:SecureTransport is false', 'Encrypt the objects twice', 'Turn on versioning', 'Make the bucket public'], answer: 0,
          why: 'At rest is the shelf; in transit is the road. A bucket policy deny refuses plain HTTP.' } },
        { at: { level: 'main-street', who: 'kai' }, say: [['kai', 'Closed carriages only. I\'ll keep the upper floor quiet tonight.']] }
      ], clue: null },

    { id: 'dutch-own-pass', giver: 'dutch', kind: 'trust', opens: 2, closes: 4, skill: '2.1.8',
      reward: { silver: 20, heart: true, unlock: 'cellar-stair' },
      steps: [
        { at: { level: 'main-street', who: 'dutch' }, say: [['dutch', 'Hall workers share one master pass. Kid, you know what I think.'],
          ['dutch', 'Ask Hobb how he\'d cut them.']] },
        { at: { level: 'main-street', who: 'hobb' }, say: [['hobb', 'One key per hand. Each opens what that hand needs. Nothing more.']],
          help: { high: 'Tell Kane his key ring\'s too heavy too.', low: 'r-2-1-8-a', deny: 'Kane can come ask me himself.' } },
        { at: { level: 'main-street', spot: 'base-camp' }, ask: {
          q: 'Service-to-service authorization. Several Lambda functions call each other\'s APIs. What should each have?',
          choices: ['No permissions: they\'re in the same account', 'Its own execution role, allowing only the calls it makes', 'One shared admin role', 'The shared admin role under a new name'], answer: 1,
          why: 'One role per service. If one leaks, it opens only that worker\'s doors.' } },
        { at: { level: 'main-street', who: 'dutch' }, say: [['dutch', 'Good. There\'s a stair down to the cellars. Near side. It\'s yours.']] }
      ], clue: null },

    { id: 'dutch-loose-talk', giver: 'dutch', kind: 'trust', opens: 6, closes: 8, skill: '2.3.4',
      reward: { silver: 20, heart: true, unlock: 'seal-floor', floor: 'ground' },
      steps: [
        { at: { level: 'main-street', who: 'dutch' }, say: [['dutch', 'Tavern\'s log book catches every word. Card numbers too.'],
          ['dutch', 'Records with gaps are bad. Records with secrets are worse.']] },
        { at: { level: 'main-street', spot: 'base-camp' }, ask: {
          q: 'CloudWatch Logs data protection. Logs must be kept, but card numbers must not show. Least work?',
          choices: ['Delete log streams each morning', 'Only let one person read the logs', 'A data protection policy on the log group that masks them as they\'re ingested', 'Turn logging off'], answer: 2,
          why: 'CloudWatch Logs data protection masks matching data on the way in.' } },
        { at: { level: 'main-street', who: 'dutch' }, say: [['dutch', 'Bless you. That was a long one. Ground floor\'s quiet tonight.']] }
      ], clue: null },

    { id: 'kagemaru-upriver', giver: 'kagemaru', kind: 'trust', opens: 4, closes: 6, skill: '2.2.6',
      reward: { silver: 20, heart: true, unlock: null, extra: 'free-lantern' },
      steps: [
        { at: { level: 'main-street', who: 'kagemaru' }, say: [['kagemaru', 'A buyer upriver. Another town. My crates, sealed.'],
          ['kagemaru', 'He can\'t open them. Ah ha ha. Such a pity.']] },
        { at: { level: 'far-lane', who: 'odu' }, say: [['odu', 'Seen his barge! His own harbour has to say yes too, you know.']],
          help: { high: 'And use the key\'s full address, not its nickname. Their clerks are fussy.', low: 'r-2-2-6-a',
            deny: 'Not today. That hood still owes me for rope.' } },
        { at: { level: 'main-street', spot: 'kagemaru-stall' }, ask: {
          q: 'Cross-account KMS. Another account must decrypt data encrypted with your KMS key. What\'s needed?',
          choices: ['Only an IAM policy in their account', 'Only your key policy', 'Send the data unencrypted', 'Your key policy allows their account, and their IAM policy allows the KMS actions too'], answer: 3,
          why: 'Cross-account KMS: your key policy and their IAM policy must both allow it.' } },
        { at: { level: 'main-street', who: 'kagemaru' }, say: [['kagemaru', 'Paid in full. How disappointing for everyone else.']] }
      ], clue: null },

    { id: 'kagemaru-prices', giver: 'kagemaru', kind: 'trust', opens: 6, closes: 8, skill: '2.3.4',
      reward: { silver: 20, heart: true, unlock: null, extra: 'free-lantern' },
      steps: [
        { at: { level: 'main-street', who: 'kagemaru' }, say: [['kagemaru', 'My price list shows who owes me. Whole account numbers.'],
          ['kagemaru', 'Customers find it... unsettling.']] },
        { at: { level: 'main-street', spot: 'kagemaru-stall' }, ask: {
          q: 'Sanitizing sensitive data. A web page lists customers\' card numbers. What should it show?',
          choices: ['Only the last four digits', 'The full number', 'The number encrypted on screen', 'The customer\'s home address instead'], answer: 0,
          why: 'Sanitize what\'s shown. The full number stays in the ledger.' } },
        { at: { level: 'main-street', who: 'kagemaru' }, say: [['kagemaru', 'Discreet. Like me. Ah ha ha.']] }
      ], clue: null },

    // ------------------------------------------------ Capstones -------------------------------------------------
    // Open after the watcher's second quest, at ward level 4. No question: their two quests were the lessons.
    { id: 'hobb-last-lock', giver: 'hobb', kind: 'capstone', opens: 6, closes: 8, skill: null, needs: { ward: 4 },
      reward: { silver: 50, heart: false, unlock: 'seal-floor', floor: 'cellars', permanent: true },
      lines: {
        trust: ['Crest\'ll hold. ... I\'m down in those cellars every night anyway, fixing drains nobody thanks me for.',
          'Could keep an eye on things. Could. A lock only opens for the right key, though.', 'Do me another good turn and we\'ll talk.'],
        pay: ['Crest\'ll hold. ... Could keep watch on the cellars for you.', 'Old man\'s got to eat, though. Fifty silver doesn\'t fix a drain.'],
        yes: ['Crest\'ll hold. ... Tell you what. Cellars are mine from tonight.', 'You\'ve done right by me, and I don\'t forget a key once it\'s cut.', 'Go mind the rest.'],
        captain: 'Cellars to Old Hobb. Signed.',
        nightly: 'Everything\'s good down here. Don\'t you worry about the cellars. I\'ve got \'em.'
      }, steps: [], clue: null },
    { id: 'lexi-capstone', giver: 'lexi', kind: 'capstone', opens: 6, closes: 8, skill: null, needs: { ward: 4 },
      reward: { silver: 50, heart: false, unlock: 'seal-floor', floor: 'towers', permanent: true },
      lines: {
        trust: ['The towers call to me. But the seal is not yet ready.', 'Help me once more. Then we\'ll speak of it.'],
        pay: ['I would guard the towers. Even sorcerers pay rent.'],
        yes: ['The towers are the quietest reading room in Pingsby, and I\'m up there anyway.', 'Consider them catalogued.'],
        captain: 'Towers to the librarian. Signed.',
        nightly: 'Towers: catalogued. Nothing out of place. Go.'
      }, steps: [], clue: null },
    { id: 'kai-capstone', giver: 'kai', kind: 'capstone', opens: 6, closes: 8, skill: null, needs: { ward: 4 },
      reward: { silver: 50, heart: false, unlock: 'seal-floor', floor: 'upper', permanent: true },
      lines: {
        duty: ['Upper floor? I\'d love to. But I\'m cooking the harvest feast that night.', 'Get somebody on my line and we\'ll talk.'],
        trust: ['Upper floor? Maybe. Do one more thing for me first.'],
        pay: ['I\'ve worked worse night shifts. Never for free.'],
        yes: ['I\'ve worked worse night shifts for less. Upper floor\'s mine.', 'Anything moves up there, I\'ll tell it exactly what I think of it.'],
        captain: 'Upper floor to Mercer. Signed.',
        nightly: 'Upper floor\'s clean. Cleaner than any kitchen I got fired from.'
      }, steps: [], clue: null },
    { id: 'dutch-capstone', giver: 'dutch', kind: 'capstone', opens: 6, closes: 8, skill: null, needs: { ward: 4 },
      reward: { silver: 50, heart: false, unlock: 'seal-floor', floor: 'ground', permanent: true },
      lines: {
        duty: ['Ground floor. Can\'t, kid. I\'m riding down to the feast with the Captain that night.', 'Find me a stand-in first.'],
        trust: ['Ground floor. I\'m thinking about it. Prove me right once more.'],
        pay: ['I walk halls for pay, kid. That\'s the job.'],
        yes: ['Spent half my life walking halls at night with a ring of keys.', 'Ground floor\'s mine. Nobody gets past me twice.'],
        captain: 'Ground floor to Kane. Signed.',
        nightly: 'Ground floor\'s quiet. Keep moving.'
      }, steps: [], clue: null },

    // ------------------------------------------- Fast travel and the hoist ---------------------------------------
    { id: 'seymour-second-copy', giver: 'seymour', kind: 'fast-travel', opens: 3, closes: 6, skill: '2.3.3',
      reward: { silver: 30, heart: false, unlock: 'tunnel' },
      steps: [
        { at: { level: 'hill-road', spot: 'bunker' }, say: [['seymour', 'NOT HOME. — S.'], ['seoyeon', 'There is a second note.'],
          ['seymour', 'IF YOU MUST: POST OFFICE. PIGEONHOLE 3. (AND 3, AND 3.) — S.']] },
        { at: { level: 'hill-road', who: 'coo' }, say: [['coo', 'Pigeonhole 3. He left three notes. All say "THE WELL".']],
          help: { high: 'He tapes things inside the shaft. Look up, not down.', low: 'r-2-3-3-b', deny: 'Coo. I don\'t deliver his notes to just anyone.' } },
        { at: { level: 'far-lane', spot: 'well' }, say: [['seoyeon', 'Taped inside the shaft: the bunker\'s combination.'],
          ['seoyeon', 'Where anyone could read it.']] },
        { at: { level: 'far-lane', spot: 'well' }, ask: {
          q: 'Secrets management. Where should a database password used by a script be kept?',
          choices: ['Written in the script next to the command', 'In Secrets Manager, fetched by the script when it runs', 'In a sticky note on the server', 'Split across three config files'], answer: 1,
          why: 'A secret store, like Secrets Manager. Never written down by the door it opens.' } },
        { at: { level: 'hill-road', spot: 'bunker' }, say: [['seymour', 'HALT. Understood. Understood. Understood. — S.'],
          ['seymour', 'TUNNEL OPEN. BOTH WAYS. TELL NO ONE (EXCEPT YOU). — S.']] }
      ],
      clue: '02:10. Tried the hatch. Didn\'t knock. Didn\'t breathe. Hummed. — S.' },

    { id: 'fennel-clear-chute', giver: 'fennel', kind: 'fast-travel', opens: 4, closes: 7, skill: '2.2.3',
      reward: { silver: 30, heart: false, unlock: 'chute' },
      steps: [
        { at: { level: 'far-lane', who: 'fennel' }, say: [['fennel', 'The old chute. Jammed.'], ['fennel', 'My sacks came down it opened. Every time.']] },
        { at: { level: 'far-lane', who: 'odu' }, say: [['odu', 'Thieves wait at the chute\'s mouth! Seen \'em from the dock.']],
          help: { high: 'Whatever goes down that chute, seal it at the top. Trust me.', low: 'r-2-2-3-a', deny: 'Fennel never waves back. Ask her yourself.' } },
        { at: { level: 'west-road', spot: 'lookout-ruin' }, say: [['seoyeon', 'Cleared. A sack is ready to go down.']] },
        { at: { level: 'west-road', spot: 'lookout-ruin' }, ask: {
          q: 'Client-side vs server-side encryption. Data must be protected before it leaves the app, all the way into S3. When do you encrypt?',
          choices: ['Halfway, at a proxy', 'Never: send it faster', 'Client-side, in the app before upload', 'Server-side only, when S3 stores it'], answer: 2,
          why: 'Client-side: sealed before it leaves, so it\'s safe on the way. Sealing on arrival is server-side.' } },
        { at: { level: 'far-lane', who: 'fennel' }, say: [['fennel', 'Thank you.'], ['fennel', 'It goes down only. Mind the landing.']] }
      ],
      clue: 'The hooded one walks the same pace every night, to the step. Never stops for water, never stops for fruit. Nobody walks like that.' },

    { id: 'captain-hoist-key', giver: 'captain', kind: 'shortcut', opens: 5, closes: 7, skill: '2.1.6',
      reward: { silver: 30, heart: false, unlock: 'hoist' },
      steps: [
        { at: { floor: 'towers', room: 'captain' }, say: [['captain', 'The old supply hoist. Chained since before my time.'],
          ['captain', 'Its key ring decides where each rider may stop.']] },
        { at: { floor: 'cellars', room: 'barracks' }, ask: {
          q: 'Identity-based policies and least privilege. The watch needs every floor; the kitchen boy needs the cellars and ground. Which policies are right?',
          choices: ['Both: every floor', 'Both: the towers only', 'Watch: every floor. Boy: none', 'Watch: every floor. Boy: cellars and ground'], answer: 3,
          why: 'An identity policy lists exactly what each principal may do. Nobody gets more than their job.' } },
        { at: { floor: 'towers', room: 'captain' }, say: [['captain', 'Chains off. One bell tick a ride. Use it well, warden.']] }
      ], clue: null },

    // ---------------------------------------------- Small quests ------------------------------------------------
    { id: 'wen-tabs', giver: 'wen', kind: 'small', opens: 2, closes: 4, skill: '2.3.6', reward: { silver: 10 },
      steps: [
        { at: { level: 'main-street', who: 'wen' }, say: [['wen', 'Every tab\'s pinned on one wall, dear. Anyone reads anyone\'s.'],
          ['wen', 'That big one\'s for "consulting lunches". Never paid.']] },
        { at: { level: 'main-street', spot: 'cafe' }, ask: {
          q: 'Multi-tenant data. Each customer\'s records are in one shared table. How should access work?',
          choices: ['Each tenant\'s items under their own key, and a policy that lets each tenant read only their own', 'Everyone reads the whole table', 'Make the table smaller', 'Delete the records nightly'], answer: 0,
          why: 'Multi-tenant: each tenant sees only the rows under their own key.' } },
        { at: { level: 'main-street', who: 'wen' }, say: [['wen', 'Lovely. A lunch box each.']] }
      ] },
    { id: 'wen-delivery-key', giver: 'wen', kind: 'small', opens: 5, closes: 7, skill: '2.1.5', reward: { silver: 10, gossip: 'g-wen-delivery' },
      steps: [
        { at: { level: 'main-street', who: 'wen' }, say: [['wen', 'The bread boy wants his own back-door key. Forever, he says.']] },
        { at: { level: 'main-street', spot: 'cafe' }, ask: {
          q: 'Temporary access. A delivery service needs access only on delivery mornings. What should it get?',
          choices: ['No access: it can call support', 'A role it assumes for temporary credentials that expire', 'A copy of the owner\'s access keys', 'An IAM user with admin access'], answer: 1,
          why: 'Temporary credentials: access that expires when the job is done.' } },
        { at: { level: 'main-street', who: 'wen' }, say: [['wen', 'Mornings only. He\'ll live.']] }
      ] },
    { id: 'ayo-one-key', giver: 'ayo', kind: 'small', opens: 3, closes: 5, skill: '2.1.6', reward: { silver: 10 },
      steps: [
        { at: { level: 'main-street', who: 'ayo' }, say: [['ayo', 'HA! My apprentices share one forge key. They fight over it.']] },
        { at: { level: 'main-street', spot: 'forge' }, ask: {
          q: 'Least privilege. Each apprentice service writes only to its own S3 prefix. What should each get?',
          choices: ['The owner\'s credentials', 'Write access to the whole bucket', 'A policy that allows writes only to its own prefix', 'A copy of the bucket\'s root credentials'], answer: 2,
          why: 'Least privilege: each principal gets only what its job needs.' } },
        { at: { level: 'main-street', who: 'ayo' }, say: [['ayo', 'One anvil, one key. My grandmother would say so. She didn\'t, but she would.']] }
      ] },
    { id: 'ayo-quartermaster-crate', giver: 'ayo', kind: 'small', opens: 6, closes: 8, skill: '2.2.4', reward: { silver: 10, gossip: 'g-ayo-crate' },
      steps: [
        { at: { level: 'main-street', who: 'ayo' }, say: [['ayo', 'Blades for the castle quartermaster. Only he may open the crate.']] },
        { at: { level: 'main-street', who: 'kagemaru' }, say: [['kagemaru', 'A crate with a lock that knows its owner. A fine purchase.']],
          help: { high: 'The lock\'s rule names him. Not his friends. Him.', low: 'r-2-2-4-b', deny: 'Not for sale. Not to you, today.' } },
        { at: { level: 'main-street', spot: 'forge' }, ask: {
          q: 'KMS key policies. Only one role should be able to decrypt with this KMS key. How?',
          choices: ['Hide the encrypted data', 'Encrypt with a key anyone can use', 'Put the role\'s name in the object\'s tags', 'A key policy that allows kms:Decrypt only for that role'], answer: 3,
          why: 'A key policy decides who may use the key to decrypt.' } },
        { at: { level: 'main-street', who: 'ayo' }, say: [['ayo', 'HA! Sealed like a promise.']] }
      ] },
    { id: 'aigerim-pages', giver: 'aigerim', kind: 'small', opens: 3, closes: 4, skill: '2.3.1', reward: { silver: 10, gossip: 'g-aigerim-pages' },
      steps: [
        { at: { level: 'main-street', who: 'aigerim' }, say: [['aigerim', 'My pages blew away at 09:14. I counted.'],
          ['aigerim', 'Would you gather them? Please?']] },
        { at: { level: 'main-street', spot: 'first-fork' }, ask: {
          q: 'Data classification. A diary holds everyone\'s home addresses, a patient\'s health notes, and the weather. Which are sensitive?',
          choices: ['The addresses (PII) and the health notes (PHI)', 'Only the health notes', 'All three', 'None of it'], answer: 0,
          why: 'Addresses are PII. The healer\'s notes are PHI. The weather is public.' } },
        { at: { level: 'main-street', who: 'aigerim' }, say: [['aigerim', 'You read them so carefully. I wrote that down.']] }
      ] },
    { id: 'aigerim-one-page', giver: 'aigerim', kind: 'small', opens: 5, closes: 7, skill: '2.1.6', reward: { silver: 10 },
      steps: [
        { at: { level: 'main-street', who: 'aigerim' }, say: [['aigerim', 'A friend in another town wants to read one page. Only one.']] },
        { at: { level: 'main-street', who: 'kagemaru' }, say: [['kagemaru', 'A pass that runs out. I sell those. Rarely to diarists.']],
          help: { high: 'An hour is plenty. Less is better.', low: 'r-2-1-6-a', deny: 'She writes down everything I say. No.' } },
        { at: { level: 'main-street', spot: 'first-fork' }, ask: {
          q: 'S3 presigned URLs. How do you share one private object for one hour?',
          choices: ['Copy the whole bucket to the person', 'A presigned URL for that object that expires in an hour', 'Make the bucket public', 'Give them your access keys'], answer: 1,
          why: 'An S3 presigned URL grants one object for a set time, using the signer\'s permissions.' } },
        { at: { level: 'main-street', who: 'aigerim' }, say: [['aigerim', 'One hour. I\'ll note when it ends.']] }
      ] },
    { id: 'doug-retire', giver: 'doug', kind: 'small', opens: 3, closes: 5, skill: '2.1.3', reward: { silver: 10, gossip: 'g-doug-laptop' },
      steps: [
        { at: { level: 'hill-road', who: 'doug' }, say: [['doug', 'I\'m retiring an old bot account. Totally legit. Unplugged it.']] },
        { at: { level: 'main-street', who: 'hobb' }, say: [['hobb', 'Unplugged a door\'s not locked a door.']],
          help: { high: 'Switch the keys off. Then wait. Then throw them away.', low: 'r-2-1-3-b', deny: 'Doug\'s keys? I don\'t touch Doug\'s keys.' } },
        { at: { level: 'hill-road', spot: 'doug-flat' }, ask: {
          q: 'IAM access keys. A retired bot\'s IAM user is no longer used. What else should you do?',
          choices: ['Rename the user', 'Write the keys down for later', 'Deactivate its access keys, check nothing breaks, then delete them', 'Nothing: unused keys can\'t be used'], answer: 2,
          why: 'Keys work from anywhere. Deactivate, check nothing breaks, then delete.' } },
        { at: { level: 'hill-road', who: 'doug' }, say: [['doug', 'Huh. I\'d have left them on. Don\'t tell Kevin.']] }
      ] },
    { id: 'doug-heartbeats', giver: 'doug', kind: 'small', opens: 6, closes: 8, skill: '2.1.3', reward: { silver: 10, gossip: 'g-doug-heartbeat' },
      steps: [
        { at: { level: 'hill-road', who: 'doug' }, say: [['doug', 'Bru\'s board shows me in two places at once. I\'m only in one. Probably.']] },
        { at: { level: 'hill-road', who: 'bru' }, say: [['bru', 'Two heartbeats for Doug. Ay, no. One\'s in the castle.']],
          help: { high: 'His keys show when they were last used. Look there.', low: 'r-2-1-3-a', deny: 'Doug\'s row is always wrong. I\'m not helping him fix it.' } },
        { at: { level: 'hill-road', spot: 'doug-flat' }, ask: {
          q: 'IAM access keys. Something is still calling AWS with one of Doug\'s keys. How do you find which?',
          choices: ['Guess', 'Create a new key', 'Turn off the account', 'Check each access key\'s last-used date and service'], answer: 3,
          why: 'IAM shows when and where each access key was last used.' } },
        { at: { level: 'hill-road', who: 'doug' }, say: [['doug', 'One of them was used last night. I didn\'t use it last night.']] }
      ] },
    { id: 'tess-lamp-code', giver: 'tess', kind: 'small', opens: 2, closes: 4, skill: '2.3.2', reward: { silver: 10 },
      steps: [
        { at: { level: 'main-street', who: 'tess' }, say: [['tess', 'My lamp automaton carries the lamp store code on its arm! On a tag!'],
          ['tess', 'Anyone who stops it can read it! Anyone!']] },
        { at: { level: 'main-street', spot: 'first-fork' }, ask: {
          q: 'Lambda environment variables. A store code sits in a Lambda environment variable. How do you protect it?',
          choices: ['Encrypt it with a customer managed KMS key that only the function\'s role can decrypt', 'Write it backwards', 'Rename the variable', 'Leave it: environment variables are private'], answer: 0,
          why: 'Encrypt the env var with a customer managed KMS key only its role can decrypt.' } },
        { at: { level: 'main-street', who: 'tess' }, say: [['tess', 'Sealed! The safest lamp in the WHOLE kingdom.']] }
      ] },
    { id: 'tess-3am-lamp', giver: 'tess', kind: 'small', opens: 6, closes: 8, skill: '2.1.6', reward: { silver: 10, gossip: 'g-tess-lamp' },
      steps: [
        { at: { level: 'main-street', who: 'tess' }, say: [['tess', 'One lamp lit at three in the morning! Not by me! I\'d remember!']] },
        { at: { level: 'far-lane', who: 'fennel' }, say: [['fennel', 'I saw it lit. Didn\'t see the hand.']],
          help: { high: 'Next time, have the store write down who opens it.', low: 'r-2-1-6-a', deny: 'Her lamps keep me up. Ask someone else.' } },
        { at: { level: 'main-street', spot: 'first-fork' }, ask: {
          q: 'CloudTrail data events. Next time, how will you know who read objects in the bucket?',
          choices: ['Hide the objects', 'Turn on CloudTrail data events for the bucket', 'Ask around', 'Turn on versioning'], answer: 1,
          why: 'CloudTrail records who did what. Object reads are data events, which you turn on.' } },
        { at: { level: 'main-street', who: 'tess' }, say: [['tess', 'A record! Of EVERYONE!']] }
      ] },
    { id: 'pell-guest-list', giver: 'pell', kind: 'small', opens: 3, closes: 5, skill: '2.1.2', reward: { silver: 10 },
      steps: [
        { at: { level: 'west-road', who: 'pell' }, say: [['captain', 'No more shared passwords at my gate.'],
          ['pell', 'You heard the Captain. Problem is, I\'ve only got the one password.']] },
        { at: { level: 'west-road', spot: 'castle-gate' }, ask: {
          q: 'Bearer tokens. The gate API uses one shared password for every visitor. What should it check instead?',
          choices: ['A password that changes daily', 'Nothing: it knows the IP addresses', 'Each caller\'s own signed, expiring token', 'The same password, longer'], answer: 2,
          why: 'Bearer tokens: each visitor carries their own signed, expiring token.' } },
        { at: { level: 'west-road', who: 'pell' }, say: [['pell', 'By the book. I like a book.']] }
      ] },
    { id: 'pell-afternoon-leave', giver: 'pell', kind: 'small', opens: 6, closes: 8, skill: '2.1.5', reward: { silver: 10, gossip: 'g-pell-leave' },
      steps: [
        { at: { level: 'west-road', who: 'pell' }, say: [['pell', 'A messenger needs through this afternoon. Only this afternoon.']] },
        { at: { level: 'west-road', spot: 'castle-gate' }, ask: {
          q: 'STS temporary credentials. A worker needs access until sundown. What do you give them?',
          choices: ['An access key for the year', 'Pell\'s own access key', 'An access key with no expiry', 'Temporary credentials that expire at sundown'], answer: 3,
          why: 'Temporary credentials from STS last a set time, then stop working.' } },
        { at: { level: 'west-road', who: 'pell' }, say: [['pell', 'Sundown. Not a minute after.']] }
      ] },
    { id: 'hollis-whose-seal', giver: 'hollis', kind: 'small', opens: 4, closes: 6, skill: '2.1.1', reward: { silver: 10 },
      steps: [
        { at: { level: 'west-road', who: 'hollis' }, say: [['hollis', 'Traveller\'s pass. Another town\'s seal. Counted it twice.'],
          ['hollis', 'Still don\'t know if it\'s good.']] },
        { at: { level: 'west-road', spot: 'coach-house' }, ask: {
          q: 'Identity federation. A token arrives from an outside identity provider. What should the app check?',
          choices: ['That it\'s from a provider you trust, and its audience is your app', 'Only the user\'s display name', 'How old the token looks', 'That it\'s formatted neatly'], answer: 0,
          why: 'Federation: trust only your configured identity providers, and check the token is meant for you.' } },
        { at: { level: 'west-road', who: 'hollis' }, say: [['hollis', 'Two checks. I like two. Counted.']] }
      ] },
    { id: 'hollis-mailbag', giver: 'hollis', kind: 'small', opens: 6, closes: 8, skill: '2.2.1', reward: { silver: 10 },
      steps: [
        { at: { level: 'west-road', who: 'hollis' }, say: [['hollis', 'Coach carries the post. Bag\'s open on the road. Open in the store.']] },
        { at: { level: 'hill-road', who: 'coo' }, say: [['coo', 'I receive that bag. I\'d like it sealed both ways. Coo.']],
          help: { high: 'Closed carriage on the road, locked chest in my store. Both.', low: 'r-2-2-1-a', deny: 'Coo. Hollis can bring his own questions.' } },
        { at: { level: 'west-road', spot: 'coach-house' }, ask: {
          q: 'Encryption in transit and at rest. Data must be safe on the network and in storage. What do you need?',
          choices: ['A bigger instance', 'TLS in transit and encryption at rest', 'Only encryption at rest', 'Only TLS in transit'], answer: 1,
          why: 'TLS covers the road. Encryption at rest covers the store. You need both.' } },
        { at: { level: 'west-road', who: 'hollis' }, say: [['hollis', 'Sealed twice. Counted twice.']] }
      ] },
    { id: 'odu-manifest', giver: 'odu', kind: 'small', opens: 4, closes: 6, skill: '2.3.5', reward: { silver: 10 },
      steps: [
        { at: { level: 'far-lane', who: 'odu' }, say: [['odu', 'My notice board shows every crate\'s owner and account number! Whole thing!'],
          ['odu', 'Very popular board. Too popular.']] },
        { at: { level: 'far-lane', spot: 'dock' }, ask: {
          q: 'Masking sensitive data. A dashboard shows owners\' card numbers. What should it show?',
          choices: ['Nothing about owners', 'The number backwards', 'The last four digits; the full number stays in the database', 'The full number'], answer: 2,
          why: 'Mask in the application before display. The record keeps the full value.' } },
        { at: { level: 'far-lane', who: 'odu' }, say: [['odu', 'Still popular. Less useful to thieves. Perfect!']] }
      ] },
    { id: 'odu-lock-change', giver: 'odu', kind: 'small', opens: 6, closes: 8, skill: '2.2.7', reward: { silver: 10, gossip: 'g-odu-lock' },
      steps: [
        { at: { level: 'far-lane', who: 'odu' }, say: [['odu', 'A merchant asks: does the warehouse lock change by itself?'],
          ['odu', 'The dock\'s own key, or hers?']] },
        { at: { level: 'far-lane', spot: 'dock' }, ask: {
          q: 'KMS key rotation. Which is true?',
          choices: ['Neither AWS managed nor customer managed keys rotate', 'Both rotate monthly', 'Rotation makes old ciphertext unreadable', 'AWS managed keys rotate every year; customer managed keys only if you turn rotation on'], answer: 3,
          why: 'AWS managed keys rotate every year. Customer managed keys rotate only if enabled, on a period you pick.' } },
        { at: { level: 'far-lane', who: 'odu' }, say: [['odu', 'And old crates still open! I\'ll tell everyone. Everyone!']] }
      ] }
  ];

  // ================================================================================================================
  // GOSSIP. Day by day. kind: tip (where tonight's breach is, in everyday words), clue (the Stranger), lead (quests
  // opening or closing), weather, chad (his daily pitch, which names that night's breach), suspect / alibi (days 7
  // and 8), hot (day 9: the engine shows the lines for the two hottest areas). Two people saying the same tip makes
  // it solid. reward: true lines are only heard as a quest's reward. trust: 40 lines are only shared at that trust.
  // ================================================================================================================
  const g = (id, day, who, where, line, x) => Object.assign({ id, day, who, where, line, clue: false, herring: false }, x || {});
  const tip = { kind: 'tip' }, lead = { kind: 'lead' }, clue = { kind: 'clue', clue: true }, herring = { kind: 'clue', herring: true };
  const chad = { kind: 'chad' };
  C.gossip = [
    // ---- Day 1: the tutorial walk, clear ----
    g('g-1-tess-gate', 1, 'tess', 'main-street', 'Hooded one walked straight through the castle gate! Waved a pass he drew himself!', tip),
    g('g-1-pell-gate', 1, 'pell', 'west-road', 'Nobody checks passes at the castle gate. Nobody. I\'ve said so.', tip),
    g('g-1-mira-start', 1, 'mira', 'main-street', 'Listen first, then lock. Gossip goes in your notebook by itself.', lead),
    g('g-1-coo-passes', 1, 'coo', 'hill-road', 'Real passes are signed. Signed things can be checked. Coo.', tip),
    g('g-1-tess-habit', 1, 'tess', 'main-street', 'And he never carried a lantern. Not one!', clue),
    g('g-1-kagemaru-free', 1, 'kagemaru', 'main-street', 'A lantern post, free. First one always is. Ah ha ha.', lead),
    g('g-1-chad', 1, 'chad', 'main-street', 'Today\'s package: Gate Synergy. Passes are a mindset. Checking them is a journey.', chad),

    // ---- Day 2: clear ----
    g('g-2-dutch-clerk', 2, 'dutch', 'main-street', 'New order clerk has a star key. Opens every door. He only writes orders.', tip),
    g('g-2-hobb-star', 2, 'hobb', 'main-street', 'A star key\'s not a key. It\'s an invitation.', tip),
    g('g-2-lexi-travellers', 2, 'lexi', 'hill-road', 'Travellers signed in at the town hall want the lookout. Someone gave them castle keys.', tip),
    g('g-2-pell-travellers', 2, 'pell', 'west-road', 'Forty visitors up the lookout yesterday. All on the same key. Same key!', tip),
    g('g-2-coo-lead', 2, 'coo', 'hill-road', 'Eleven letters bounced today. I could use a hand. Coo.', lead),
    g('g-2-hobb-lead', 2, 'hobb', 'main-street', 'Apprentice needs a key pair. If you\'ve a minute.', lead),
    g('g-2-mira-lead', 2, 'mira', 'main-street', 'Someone wrote the cellar password on my recipe card. I want words with them.', lead),
    g('g-2-wen-lead', 2, 'wen', 'main-street', 'My tab wall\'s a disgrace, dear. Come by.', lead),
    g('g-2-tess-lead', 2, 'tess', 'main-street', 'My lamp automaton has the store code on its arm! On its ARM!', lead),
    g('g-2-ayo-habit', 2, 'ayo', 'main-street', 'Saw the hooded one pass the forge. Didn\'t look at the fire. Everyone looks at the fire.', clue),
    g('g-2-wen-habit', 2, 'wen', 'main-street', 'Never once bought a bun. Walks past my window every night, dear. Never hungry.', clue),
    g('g-2-tess-ghost', 2, 'tess', 'main-street', 'There\'s a ghost on the bridge! A real one! Probably!', herring),
    g('g-2-chad', 2, 'chad', 'west-road', 'Sergeant, picture this: Keys-as-a-Service. Fewer keys. Narrower keys. Badges for tourists. Disruptive.', chad),

    // ---- Day 3: windy ----
    g('g-3-wind-aigerim', 3, 'aigerim', 'main-street', 'My pages! The wind took them at 09:14!', Object.assign({ weather: 'wind' }, lead)),
    g('g-3-wind-tess', 3, 'tess', 'main-street', 'Blew out six lamps! Six! I\'m relighting the whole street!', { kind: 'weather', weather: 'wind' }),
    g('g-3-wind-odu', 3, 'odu', 'far-lane', 'Washing\'s flapping like flags down here. Birds are flying low.', { kind: 'weather', weather: 'wind' }),
    g('g-3-kai-cloak', 3, 'kai', 'main-street', 'Order worker stood at the wardrobe all night. Cloak\'s tag says finance only.', tip),
    g('g-3-dutch-cloak', 3, 'dutch', 'main-street', 'That ledger cloak. Its tag turns away the one man who needs it.', tip),
    g('g-3-lexi-laptop', 3, 'lexi', 'hill-road', 'A clerk\'s laptop holds keys older than my eyepatch. They still open things.', tip),
    g('g-3-hollis-laptop', 3, 'hollis', 'west-road', 'Keys two years old. Counted the days. Never changed once.', tip),
    g('g-3-doug-kevin', 3, 'doug', 'hill-road', 'Kevin\'s retired. I\'m retiring his old account too. His keys never expired. Is that bad?', clue),
    g('g-3-bru-kevin', 3, 'bru', 'hill-road', 'Doug\'s row on my board is stale again. It always is. Ay.', clue),
    g('g-3-pell-habit', 3, 'pell', 'west-road', 'Hooded one passed my post at the same minute two nights running. To the minute.', clue),
    g('g-3-bru-lead', 3, 'bru', 'hill-road', '¡Mira! The Guild needs its own crest office. I need help. Always.', lead),
    g('g-3-kai-lead', 3, 'kai', 'main-street', 'Night clerk wants to keep the cloak\'s key forever. Talk to him before I do.', lead),
    g('g-3-seymour-lead', 3, 'seymour', 'hill-road', 'NOT HOME. — S.', lead),
    g('g-3-tess-quarrel', 3, 'tess', 'main-street', 'The wind tipped Mira\'s soup into Wen\'s doorway! They are NOT speaking!',
      { kind: 'lead', tie: { a: 'wen', b: 'mira', to: 'cool' } }),
    g('g-3-chad', 3, 'chad', 'hill-road', 'Cloak Optimization, folks. Wrong tags, old laptops, keys from 2024. I fix all three. Invoice to follow.', chad),

    // ---- Day 4: clear (the fog comes at night) ----
    g('g-4-coo-bridge', 4, 'coo', 'hill-road', 'The bridge clerk had the right key. The neighbour\'s storehouse still sent her back.', tip),
    g('g-4-hobb-bridge', 4, 'hobb', 'main-street', 'Two locks on that bridge. Yours and theirs. Both have to say yes.', tip),
    g('g-4-dutch-hall', 4, 'dutch', 'main-street', 'Hall workers all wear one master pass. One. Steal it once, you\'re everyone.', tip),
    g('g-4-wen-hall', 4, 'wen', 'main-street', 'The hall\'s workers lend each other one pass, dear. Like one spoon for six bowls.', tip),
    g('g-4-coo-close', 4, 'coo', 'hill-road', 'Last day for the bounced letters. After today, they go to the Dead Letter Box. Coo.', lead),
    g('g-4-aigerim-close', 4, 'aigerim', 'main-street', 'Three pages still missing. Today, or never. I wrote that down.', lead),
    g('g-4-fennel-lead', 4, 'fennel', 'far-lane', 'The old chute\'s jammed.', lead),
    g('g-4-kagemaru-lead', 4, 'kagemaru', 'main-street', 'A buyer upriver can\'t open my crates. How tragic. Interested?', lead),
    g('g-4-odu-habit', 4, 'odu', 'far-lane', 'Hooded one crossed the dock at midnight. Didn\'t look at the river. Who doesn\'t look at the river?', clue),
    g('g-4-tess-habit', 4, 'tess', 'main-street', 'It doesn\'t sleep! I\'m out all night and it\'s out all night!', clue),
    g('g-4-aigerim-habit', 4, 'aigerim', 'main-street', 'It passed my yurt at 03:00. And 03:00. And 03:00.', clue),
    g('g-4-doug-herring', 4, 'doug', 'hill-road', 'It\'s probably Seymour. He never comes out. Suspicious.', herring),
    g('g-4-chad', 4, 'chad', 'far-lane', 'Bridge Alignment! Two signs, one vision. And every worker their own pass, for a small fee per pass.', chad),

    // ---- Day 5: rain ----
    g('g-5-pell-fog', 5, 'pell', 'west-road', 'Saw the hooded figure in the fog last night. No lantern. Didn\'t need one.', clue),
    g('g-5-rain-wen', 5, 'wen', 'main-street', 'Free tea under the awning, dear. Rain\'s for gossip.', { kind: 'weather', weather: 'rain' }),
    g('g-5-rain-kagemaru', 5, 'kagemaru', 'main-street', 'My stall\'s under the café awning today. Closer to the gossip. Ah ha ha.', { kind: 'weather', weather: 'rain' }),
    g('g-5-rain-odu', 5, 'odu', 'far-lane', 'River\'s running high! Tied every boat twice!', { kind: 'weather', weather: 'rain' }),
    g('g-5-tess-tea', 5, 'tess', 'main-street', 'Kagemaru and Aigerim shared Wen\'s tea! Under one awning! She wrote down how he holds his cup!',
      { kind: 'lead', weather: 'rain', tie: { a: 'kagemaru', b: 'aigerim', to: 'warm' } }),
    g('g-5-hobb-strong', 5, 'hobb', 'main-street', 'Clerk waited at the strongroom all night. The key\'s rule never named him.', tip),
    g('g-5-mira-strong', 5, 'mira', 'main-street', 'The strongroom key won\'t let the clerk use it. Not his fault.', tip),
    g('g-5-lexi-drawer', 5, 'lexi', 'hill-road', 'In the ledger room, any clerk can open any clerk\'s drawer. Barbaric.', tip),
    g('g-5-kai-drawer', 5, 'kai', 'main-street', 'One cabinet. Every clerk\'s records. Every clerk\'s nose in them.', tip),
    g('g-5-odu-crates', 5, 'odu', 'far-lane', 'Twelve merchants store crates in the old barracks. Every key opens every crate!', tip),
    g('g-5-kagemaru-crates', 5, 'kagemaru', 'main-street', 'My crate in the barracks was opened. Not by me. Rude.', tip),
    g('g-5-hollis-cart', 5, 'hollis', 'west-road', 'Post cart goes up the hill open to the road. Letters sealed in the chest, open on the way.', tip),
    g('g-5-coo-cart', 5, 'coo', 'hill-road', 'Locked chest. Open cart. One without the other is half a delivery.', tip),
    g('g-5-bru-crunch', 5, 'bru', 'hill-road', 'Four quests open today! Crest office closes after today. Ay, no, choose!', lead),
    g('g-5-hobb-close', 5, 'hobb', 'main-street', 'Key pair\'s last day. Crest after that.', lead),
    g('g-5-captain-lead', 5, 'pell', 'west-road', 'Captain wants the old hoist looked at. Chained since before me.', lead),
    g('g-5-tess-names', 5, 'tess', 'main-street', 'It\'s Old Hobb! He made the locks. He kept copies. Obviously!', { kind: 'suspect', suspect: 'hobb' }),
    g('g-5-ayo-names', 5, 'ayo', 'main-street', 'Hobb? HA! Hobb can\'t sit still past nine. I\'d say the hooded stall man.', { kind: 'suspect', suspect: 'kagemaru' }),
    g('g-5-chad', 5, 'chad', 'main-street', 'Rainy-day bundle: Key Rule Wellness, Drawer Isolation, Crate Tenancy and Carriage Closure. Four for one!', chad),

    // ---- Day 6: clear (the storm comes at night) ----
    g('g-6-coo-letter', 6, 'coo', 'hill-road', 'Letters for the strongroom are thick tonight. The slot takes 4 KB. These aren\'t 4 KB. Coo.', tip),
    g('g-6-lexi-letter', 6, 'lexi', 'hill-road', 'Small key seals the letter. Big key seals the small key. It is written.', tip),
    g('g-6-pell-orders', 6, 'pell', 'west-road', 'Captain\'s orders go out by courier. Courier reads them. Not by the book.', tip),
    g('g-6-hollis-orders', 6, 'hollis', 'west-road', 'Couriers stop at my coach house and read the Captain\'s orders. Out loud. Twice.', tip),
    g('g-6-mira-lead', 6, 'mira', 'main-street', 'The strongbox hasn\'t changed its combination all week.', lead),
    g('g-6-bru-lead', 6, 'bru', 'hill-road', 'EHHH?! A crest ran out on one of the boards!', lead),
    g('g-6-dutch-lead', 6, 'dutch', 'main-street', 'Tavern log\'s writing down card numbers. Come see.', lead),
    g('g-6-doug-lead', 6, 'doug', 'hill-road', 'Bru\'s board says I\'m in two places. I\'m in one. Help?', lead),
    g('g-6-tess-book', 6, 'tess', 'main-street', 'Doug returned a library book ON TIME. Lexi nearly fainted! They\'re friends now! For today!',
      { kind: 'lead', tie: { a: 'doug', b: 'lexi', to: 'warm' } }),
    g('g-6-wen-names', 6, 'wen', 'main-street', 'Tess is out every night, dear. Just saying what I see.', { kind: 'suspect', suspect: 'tess' }),
    g('g-6-pell-names', 6, 'pell', 'west-road', 'That Doug. His bot\'s name is on Bru\'s board, in the castle. Explain that.', { kind: 'suspect', suspect: 'doug' }),
    g('g-6-kai-names', 6, 'kai', 'main-street', 'Aigerim knows where everyone was. Every night. That\'s not normal, that\'s homework.', { kind: 'suspect', suspect: 'aigerim' }),
    g('g-6-chad', 6, 'chad', 'west-road', 'Sergeant! Envelope Strategy. Big letters, small keys. And seal before the courier. Thought leadership.', chad),

    // ---- Day 7: morning mist ----
    g('g-7-mist-odu', 7, 'odu', 'far-lane', 'Can\'t see the river! Mist till noon. Fennel\'s stayed in.', { kind: 'weather', weather: 'mist' }),
    g('g-7-mist-wen', 7, 'wen', 'main-street', 'Who was out in that storm, dear? Someone was. I heard boots.', Object.assign({ weather: 'mist' }, clue)),
    g('g-7-mist-tess', 7, 'tess', 'main-street', 'Lightning showed it on the hill road! Hood up! Not even wet!', Object.assign({ weather: 'mist' }, clue)),
    g('g-7-kai-vault', 7, 'kai', 'main-street', 'Clerk copied the archive password on day one. Archive changes it at midnight.', tip),
    g('g-7-seymour-vault', 7, 'seymour', 'hill-road', 'ARCHIVE LOCK CHANGES AT MIDNIGHT. CLERK STILL USES OLD ONE. (AND OLD ONE.) — S.', tip),
    g('g-7-kagemaru-neighbour', 7, 'kagemaru', 'main-street', 'The neighbour\'s clerk can\'t open your crates. Your key rule forgot them.', tip),
    g('g-7-hobb-tumblers', 7, 'hobb', 'main-street', 'Master key\'s tumblers never changed. Clerks think changing them locks old letters. It doesn\'t.', tip),
    g('g-7-lexi-scrolls', 7, 'lexi', 'hill-road', 'The archive keeps names, the healer\'s records and the menu on one shelf. Unsorted.', tip),
    g('g-7-mira-scrolls', 7, 'mira', 'main-street', 'My healer\'s notes are in the castle archive. Next to the menu. Lovely.', tip),
    g('g-7-tess-oil', 7, 'tess', 'main-street', 'I took Fennel lamp oil in the mist! She said thank you! Out loud!',
      { kind: 'lead', weather: 'mist', tie: { a: 'fennel', b: 'tess', to: 'warm' } }),
    g('g-7-coo-close', 7, 'coo', 'hill-road', 'Letters from the bridge: last day. Coo.', lead),
    // Whodunit: every suspect has a clue against them and an alibi you confirm by going to look.
    g('g-7-s-kagemaru', 7, 'pell', 'west-road', 'Hooded, no face, laughs at trouble. Who else would it be?', { kind: 'suspect', suspect: 'kagemaru' }),
    g('g-7-s-doug', 7, 'bru', 'hill-road', 'Kevin\'s heartbeat shows up in the castle. Kevin is Doug\'s.', { kind: 'suspect', suspect: 'doug' }),
    g('g-7-s-hobb', 7, 'tess', 'main-street', 'Hobb made the locks and kept copies. Copies!', { kind: 'suspect', suspect: 'hobb' }),
    g('g-7-s-tess', 7, 'hollis', 'west-road', 'The lamplighter\'s out every night. Counted her rounds. Every night.', { kind: 'suspect', suspect: 'tess' }),
    g('g-7-s-aigerim', 7, 'kai', 'main-street', 'Aigerim\'s diary knows where everyone was. So where was she?', { kind: 'suspect', suspect: 'aigerim' }),
    g('g-7-a-kagemaru', 7, 'kagemaru', 'main-street', 'My ledger. Sales all night, every night, in my own hand. Read it.',
      { kind: 'alibi', suspect: 'kagemaru', spot: 'kagemaru-stall' }),
    g('g-7-a-hobb', 7, 'coo', 'hill-road', 'Hobb\'s repair letters: cellar drains, every night this week. Signed and timed. Coo.',
      { kind: 'alibi', suspect: 'hobb', spot: 'post-office' }),
    g('g-7-chad', 7, 'chad', 'main-street', 'Vault Transformation: midnight passwords, shared crates, rotating tumblers, sorted scrolls. Ask me how.', chad),

    // ---- Day 8: clear ----
    g('g-8-tess-coat', 8, 'tess', 'main-street', 'The database password is pinned to the clerk\'s coat! For convenience!', tip),
    g('g-8-dutch-coat', 8, 'dutch', 'main-street', 'Clerk\'s coat has the password on it. Big letters.', tip),
    g('g-8-wen-tavern', 8, 'wen', 'main-street', 'The clerk reads card numbers aloud in the tavern, dear. And the log writes them down.', tip),
    g('g-8-bru-tavern', 8, 'bru', 'hill-road', 'The eavesdropper drinks in the tavern. Every night. Listening.', tip),
    g('g-8-odu-notices', 8, 'odu', 'far-lane', 'Castle\'s notice board shows whole account numbers. Mine used to. Not any more!', tip),
    g('g-8-coo-notices', 8, 'coo', 'hill-road', 'The ledger room posts full account numbers. All sixteen digits. Coo-ah.', tip),
    g('g-8-bru-close', 8, 'bru', 'hill-road', 'Last day for the expired crest! Last day!', lead),
    g('g-8-hobb-close', 8, 'hobb', 'main-street', 'Practice crest\'s last day.', lead),
    g('g-8-tess-bru', 8, 'tess', 'main-street', 'Bru walked Doug home after closing! Talked for an hour! About heartbeats!',
      { kind: 'lead', tie: { a: 'bru', b: 'doug', to: 'warm' } }),
    g('g-8-a-doug', 8, 'doug', 'hill-road', 'Kevin\'s laptop? Sold it. To a very confident man in a blazer. Cheap.',
      { kind: 'alibi', suspect: 'doug', spot: 'doug-flat', clue: true }),
    g('g-8-a-tess', 8, 'lexi', 'hill-road', 'The hill road lamps were lit on schedule. One by one. I watched from the library.',
      { kind: 'alibi', suspect: 'tess', spot: 'library' }),
    g('g-8-a-aigerim', 8, 'aigerim', 'main-street', 'I was home. I wrote. And it walked past at 03:00 exactly. Every night. Here.',
      { kind: 'alibi', suspect: 'aigerim', spot: 'first-fork', clue: true }),
    g('g-8-s-chad', 8, 'wen', 'main-street', 'That young man in the blue pullover always knows what breaks next. Funny, that.', { kind: 'suspect', suspect: 'chad', clue: true }),
    g('g-8-chad', 8, 'chad', 'hill-road', 'Loose Lips Remediation: coat passwords, chatty logs, long numbers. Very specific. No reason.', chad),

    // ---- Day 9: the Long Night, clear, full moon ----
    g('g-9-mira', 9, 'mira', 'main-street', 'Tonight it all comes back. Say who you think it is, at my fire, if you like.', lead),
    g('g-9-pell', 9, 'pell', 'west-road', 'Whole town\'s in it tonight. The ends of the roads too.', lead),
    g('g-9-hot-west', 9, 'bru', 'hill-road', 'Something\'s waiting out on the West Road. My board\'s gone quiet there.', { kind: 'hot', hot: 'west-road' }),
    g('g-9-hot-main', 9, 'wen', 'main-street', 'Main Street\'s restless, dear. The café back door\'s been rattling.', { kind: 'hot', hot: 'main-street' }),
    g('g-9-hot-hill', 9, 'coo', 'hill-road', 'Hill Road. Three odd parcels today. Coo.', { kind: 'hot', hot: 'hill-road' }),
    g('g-9-hot-far', 9, 'odu', 'far-lane', 'Far Lane\'s too quiet! Out by the river gate. Mark my words!', { kind: 'hot', hot: 'far-lane' }),
    g('g-9-hot-towers', 9, 'lexi', 'hill-road', 'The towers. The lookout\'s logbook has a page torn out.', { kind: 'hot', hot: 'towers' }),
    g('g-9-hot-upper', 9, 'kai', 'main-street', 'Upper floor. Ledger room. Something stinks, and it\'s not my cooking.', { kind: 'hot', hot: 'upper' }),
    g('g-9-hot-ground', 9, 'dutch', 'main-street', 'Ground floor. Gate crew\'s jumpy. Watch the hall.', { kind: 'hot', hot: 'ground' }),
    g('g-9-hot-cellars', 9, 'hobb', 'main-street', 'Cellars. Drains are talking. Drains don\'t talk.', { kind: 'hot', hot: 'cellars' }),
    g('g-9-fennel', 9, 'fennel', 'far-lane', 'Same pace tonight, I\'d bet. To the step.', clue),

    // ---- Shared at trust 40 (once each, from the day shown) ----
    g('g-t-mira', 2, 'mira', 'main-street', 'I don\'t sleep much. The hooded one doesn\'t either. I\'d know.', Object.assign({ trust: 40 }, clue)),
    g('g-t-coo', 3, 'coo', 'hill-road', 'Kevin used to deliver Doug\'s post. He hummed. Coo.', Object.assign({ trust: 40 }, clue)),
    g('g-t-bru', 4, 'bru', 'hill-road', 'I check the doors myself after closing. Some nights a door\'s already been tried.', Object.assign({ trust: 40 }, clue)),
    g('g-t-hobb', 3, 'hobb', 'main-street', 'Copies of castle locks? I keep the moulds, not the keys. Keys go to the Captain.', { trust: 40, kind: 'alibi', suspect: 'hobb' }),
    g('g-t-kagemaru', 4, 'kagemaru', 'main-street', 'A man in a blazer asked what my locks cost. Then what yours did.', Object.assign({ trust: 40 }, clue)),
    g('g-t-lexi', 3, 'lexi', 'hill-road', 'Kevin borrowed every book once, in a minute. Returned none. Doug paid the fine.', Object.assign({ trust: 40 }, clue)),
    g('g-t-kai', 4, 'kai', 'main-street', 'Bread boy says the hooded one never steps in puddles. Steps around them. Every one.', Object.assign({ trust: 40 }, clue)),
    g('g-t-dutch', 5, 'dutch', 'main-street', 'Walks like a man reading a list. Guilty people don\'t walk like that. Machines do.', Object.assign({ trust: 40 }, clue)),
    g('g-t-pell', 2, 'pell', 'west-road', 'Captain says if the night watch lasts the week, she gets a key. Don\'t tell her I said.', { trust: 40, kind: 'lead' }),
    g('g-t-wen', 3, 'wen', 'main-street', 'Biggest tab on my wall says "consulting lunches". Never paid, dear. Not once.', { trust: 40, kind: 'lead' }),
    g('g-t-odu', 5, 'odu', 'far-lane', 'A blazer took a barge out at dawn. Came back at dusk. Paid in exact change!', Object.assign({ trust: 40 }, clue)),

    // ---- Quest rewards (heard when the quest is done) ----
    g('g-wen-delivery', 5, 'wen', 'main-street', 'The bread boy says the back door was tried at two. He was asleep. So who?', Object.assign({ reward: true }, clue)),
    g('g-ayo-crate', 6, 'ayo', 'main-street', 'The quartermaster says a crate was opened last week with a key from before his time.', Object.assign({ reward: true }, clue)),
    g('g-aigerim-pages', 3, 'aigerim', 'main-street', 'Page 214: "03:00. The hooded one. Again. Not a footstep out of place."', Object.assign({ reward: true }, clue)),
    g('g-doug-laptop', 3, 'doug', 'hill-road', 'Kevin\'s retirement laptop isn\'t on its blanket. I... might have sold it.', Object.assign({ reward: true }, clue)),
    g('g-doug-heartbeat', 6, 'doug', 'hill-road', 'One of Kevin\'s old keys was used last night. From the castle.', Object.assign({ reward: true }, clue)),
    g('g-tess-lamp', 6, 'tess', 'main-street', 'Whoever lit that lamp at three didn\'t use a match. It just... came on.', Object.assign({ reward: true }, clue)),
    g('g-pell-leave', 6, 'pell', 'west-road', 'Messenger said a man in a blazer paid him to carry a sealed note to the hill.', Object.assign({ reward: true }, clue)),
    g('g-odu-lock', 6, 'odu', 'far-lane', 'Someone asked me which castle locks never change. I said ask the castle!', Object.assign({ reward: true }, clue))
  ];

  // ================================================================================================================
  // DUSK BRIEFINGS. Sergeant Pell at the gate, setting the night's first locks.
  // ================================================================================================================
  C.dusk = [
    { night: 1, who: 'pell', lines: ['Evening, warden. Floor plan.', 'An empty lock slot means no. Nobody\'s allowed unless something says so.',
      'Tonight, just the gate. Let\'s set it together.'] },
    { night: 2, who: 'pell', lines: ['Two floors tonight. Keys and badges.', 'Hint button\'s there if you want it. No shame.'] },
    { night: 3, who: 'pell', lines: ['No more hints. Normal fines.', 'One retry per fix. Miss twice and it waits till dawn.'] },
    { night: 4, who: 'pell', lines: ['Fog coming in. Windows\'ll go grey.', 'The bridge, tonight. Two signs.'] },
    { night: 5, who: 'pell', lines: ['Busy one. Four breaches.', 'Ten minutes on the bell from tonight. Use them.'] },
    { night: 6, who: 'pell', lines: ['Storm tonight. Lightning shows what the dark hides.', 'Letters. Big ones.'] },
    { night: 7, who: 'pell', lines: ['Cellars and the bridge.', 'Keys, crates and the archive.'] },
    { night: 8, who: 'pell', lines: ['Last ordinary night.', 'Listen for loose talk.'] },
    { night: 9, who: 'pell', lines: ['Full moon. Clear sky.', 'Everything you missed is back, and the town\'s in it too.', 'Twelve bells. Go.'] }
  ];

  // PELL IS VERY TALL (Ladi, Nov 18: a running joke). Everyone remarks on it once; Pell always answers deadpan.
  // meet: Seo-yeon's first dusk at the gate. chad: Chad's pitch at the gate on dusk 2. quips: the first time you talk
  // to each person from day 2, they say their line; Pell answers it at the next dusk.
  // Chad's clothes (Ladi, Nov 18): a navy quarter zip and a light blue shirt, nothing like anything in town, so folk
  // would suspect him at once unless they had a story for it. Their story: he came from another world, like the hero
  // of legend who saved Kyu. The truth comes out in the best ending: Freya brought him over, and he came for the money.
  // Each person says theirs once: [from day, line]. They start on day 6, when the town begins suspecting each other
  // (Ladi, Nov 18: a whole town talking about Chad on day 1 was itself suspicious). Chad's is his own version. He just shares a name
  // with chapter 6's older consultant (Ladi, Nov 18), and Wen, who remembers that one, notices.
  C.chadIsekai = {
    tess: [6, 'The young man in the soft blue pullover? Fell out of the sky, they say! Like the hero in the old stories. The one who saved Kyu!'],
    wen: [7, 'That pullover isn\'t wool, dear. Folk say he came from another world, like the hero who saved Kyu. And he\'s called Chad! Another one! The last Chad sold us a mega-region.'],
    bru: [8, 'Another world, they say. Like the old hero. That one fought monsters, though. This one fights for a meeting.'],
    ayo: [7, 'Says he\'s a hero from another world. The last one carried a sword. This one carries slides.'],
    hobb: [8, 'Hero from another world, is he? Never met a hero who asked for his fee up front.'],
    coo: [6, 'He tried to post a letter to "the cloud". Coo. The hero from the stories at least knew the address.'],
    lexi: [7, 'In the old books the hero arrives in a flash of light. This one arrived asking where to charge his laptop.'],
    mira: [8, 'That boy in the blue pullover? They say he came from another world. He looks like he hasn\'t eaten. I\'ll send him soup.'],
    chad: [7, 'Yes, another world. Chosen, basically. Like the legend guy. And no relation to the other Chad. Anyway, I\'m doing a little consulting while I\'m here.']
  };

  C.pellTall = {
    meet: [['seoyeon', '(She looks up. Then further up.)'], ['pell', 'Yes. Everyone does that. Evening, warden.']],
    chad: [
      ['chad', 'Sergeant! Big man. Big vision. Let me size you up. Literally. Ha!'],
      ['pell', 'No.'],
      ['chad', 'Hear me out: Height-as-a-Service. We rent you to the castle as a lookout tower. Monthly billing.'],
      ['pell', 'The castle has a lookout tower.'],
      ['chad', 'A tower that salutes, though. Synergy at elevation. Lighthouse franchise. Think about it.'],
      ['pell', 'I thought about it.'],
      ['chad', 'And?'],
      ['pell', 'No.'],
      ['chad', 'Respect. Circling back.']],
    quips: {
      kai: ['I cooked for Pell once. Had to serve it on the top shelf.', 'Kai put my supper on a shelf. I ate it.'],
      dutch: ['Pell\'s the only man I\'ve ever saluted upwards.', 'Dutch salutes fine. Slightly upwards.'],
      ayo: ['Pell walked past the forge and the smoke had to go round him.', 'The smoke and I have an arrangement.'],
      coo: ['Pell is the only one who can reach the top pigeonholes. Coo.', 'Coo wants the top shelf read again. Tell Coo no.'],
      bru: ['I\'ve put Pell on the bounty board as a landmark.', 'I have been a landmark before.'],
      kagemaru: ['For the sergeant, a special: an extra-long lantern pole. Ah ha ha. No discount.', 'I do not need a pole.'],
      lexi: ['Pell\'s in the Index under "Tall, see also: Sergeant".', 'Correct filing.'],
      hobb: ['Cut Pell a key once. He held it up to the light. I never saw it again.', 'It was up there. Hobb could not see.'],
      wen: ['I bake Pell\'s buns twice the size, dear. It\'s only proportional.', 'They are normal buns.'],
      aigerim: ['Diary, 09:14: Sergeant Pell ducked under the clock tower. The CLOCK TOWER.', 'I did not duck. The clock leaned.'],
      doug: ['Pell looked into my flat through the upstairs window. From the street.', 'The curtains were open.'],
      tess: ['I have to tip my head ALL the way back to gossip at him! All the way!', 'Tess talks to my belt buckle. It has heard plenty.'],
      hollis: ['Pell rode in my coach once. Knees up by his ears the whole way.', 'It was a small coach.'],
      odu: ['Pell waded out for a barge rope. River came up to his knees. Mine would be my chin.', 'Wet knees. Fine.'],
      fennel: ['Pell picks my top apples. I don\'t even get the ladder out.', 'Fennel pays in apples. Good apples.'],
      seymour: ['Pell\'s height is a security risk. Visible from three streets. I\'ve written to someone.', 'Seymour writes to someone every week.']
    }
  };

  // Day 1's walk with the clock stopped: Mira introduces each thing as you reach it (storyboard "Night 1").
  // Day 1: Mira walks Seo-yeon in, a step behind her, "just in case". She mothers by reflex but isn't pushy, and
  // Seo-yeon stays polite (story bible, Arc 4). Ladi, Nov 18: a humor beat that also explains why her lines pop up.
  C.tutorial = [
    { at: 'base-camp', who: 'mira', lines: [   // Mira sets the scene (Ladi, Nov 18): the watch, the patrols, why you're here
      ['mira', 'There she is. Our new night warden.'],
      ['seoyeon', 'Good morning, Mistress Holloway.'],
      ['mira', 'Someone\'s been getting into the castle at night. Doors tried, keys copied, letters opened. Gone by morning.'],
      ['mira', 'So the Captain wants a warden on the night watch. That\'s you, love.'],
      ['mira', 'Your days are ten minutes of daylight. Walk the town and listen. People notice things.'],
      ['mira', 'At dusk Pell meets you at the castle gate. At night you patrol the floors and fix whatever the intruder tried.'],
      ['seoyeon', 'Understood.'],
      ['mira', 'First day, so I\'ll come with you. Just in case.'],
      ['seoyeon', 'Thank you. I\'ll be fine.'],
      ['mira', 'I know, love. Just in case. Arrows to walk.']] },
    { at: 'first-fork', who: 'mira', lines: [
      ['mira', 'That\'s Tess by the fork. Tap her and listen. Whatever you hear goes in your notebook by itself.'],
      ['mira', 'Don\'t believe all of it. Do believe some of it.']] },
    { at: 'first-fork', who: 'mira', lines: [
      ['mira', 'Up at a fork climbs a path, down comes back.'],
      ['seoyeon', 'I saw the sign.'],
      ['mira', 'So you did.']] },
    { at: 'kagemaru-stall', who: 'mira', lines: [
      ['mira', 'That\'s Kagemaru\'s stall. Your first lantern post is free. Don\'t let him tell you otherwise.'],
      ['kagemaru', 'I am standing right here, Mira.']] },
    { at: 'post-office', who: 'mira', lines: [   // Coo's marker is real: Coo has a day-1 lesson (js/watch-town.js minis)
      ['mira', 'See the marker over Coo? It means someone has something for you.'],
      ['mira', 'Today it\'s lessons. A few folk want to show you how they keep things safe. Five silver each.'],
      ['coo', 'Coo. Mine is about seals.'],
      ['seoyeon', 'You arranged this.'],
      ['mira', 'I asked around. Real work starts tomorrow.']] },
    { at: 'castle-gate', who: 'mira', lines: [
      ['mira', 'This is where I stop. Pell takes it from here. Come by my fire in the morning, love. I\'ll keep the soup on.'],
      ['seoyeon', 'Thank you. For coming.'],
      ['mira', 'Just in case.'],
      ['mira', 'One more thing. The bells call you up here at dusk. If you\'ve done all you can before then, walk to this gate and go up early.'],
      ['mira', 'He\'s tall, love. Try not to stare. Everyone stares.'],
      ['pell', 'She stared.'],
      ['pell', 'She told me about you four times this morning. Four.']] }
  ];

  // ================================================================================================================
  // TIES. How each person feels about others (one-way), drafted from the story bible. Anyone unlisted is neutral.
  // Two or three warm, at most one cool. Chad and Kevin have none: nobody is pointed at them.
  // ================================================================================================================
  C.ties = {   // from the main game, shortly after its finale (Ladi, Nov 18). No spoilers: nothing names why.
    seoyeon: { warm: ['mira', 'kai', 'dutch'] },                          // her party: family by choice
    mira: { warm: ['seoyeon', 'kai', 'dutch'], cool: ['kagemaru'] },        // the party uses him and never trusts him
    kai: { warm: ['seoyeon', 'mira', 'dutch', 'wen'], cool: ['kagemaru'] }, // Wen and Kai ran the market together
    dutch: { warm: ['mira', 'kai', 'seoyeon', 'hobb'], cool: ['kagemaru'] },
    coo: { warm: ['bru', 'seymour', 'hollis'] },                          // the post office and the quest board, side by side
    bru: { warm: ['coo', 'wen', 'tess'], cool: ['doug'] },                // Kevin once refreshed her board ten thousand times a minute
    lexi: { warm: ['seymour', 'coo'], cool: ['doug'] },                   // she banned his crawlers from the Index
    hobb: { warm: ['dutch', 'ayo', 'odu'], cool: ['doug'] },
    pell: { warm: ['captain', 'hollis', 'bru'] },
    wen: { warm: ['kai', 'seymour', 'ayo'] },                             // Seymour keeps her ledger thrice-copied
    ayo: { warm: ['wen', 'hobb', 'doug'] },                              // he gets a man who hates doing things twice
    aigerim: { warm: ['seoyeon', 'wen'], cool: ['kagemaru'] },            // a card peddler, and the other card dealer
    doug: { warm: ['ayo', 'wen'], cool: ['lexi'] },
    tess: { warm: ['pell', 'ayo', 'bru'], cool: ['aigerim'] },            // the diary logs every lamp she lights
    hollis: { warm: ['coo', 'pell', 'odu'] },
    odu: { warm: ['hobb', 'fennel', 'hollis'] },
    fennel: { warm: ['odu', 'mira'], cool: ['tess'] },                    // the lamps keep her up
    seymour: { warm: ['wen', 'lexi', 'coo'] },
    captain: { warm: ['pell', 'dutch'] }
  };
})();
