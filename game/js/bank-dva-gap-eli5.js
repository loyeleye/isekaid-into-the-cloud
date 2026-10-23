// ELI5 lines (game and anime terms, plain words) for the gap-fill bank questions in js/bank-dva-gap.js.
// Loaded after js/eli5.js; a line already set there wins. See js/eli5.js for the style.
window.SD = window.SD || {};
SD.eli5 = SD.eli5 || {};
(function () {
  const E = {
    // DynamoDB optimistic locking
    'dva-1-901': 'Every save file gets a save number. You may only overwrite save 7 if it is still save 7; if a teammate already made save 8, the game says "someone saved first" instead of erasing their progress.',
    'dva-1-902': 'You loaded save 7, your friend loaded save 7 too and saved first, making save 8. When you try to save over 7, the game refuses. Nobody waits in line and nothing gets merged.',
    'dva-1-903': 'Your save was refused because a newer save exists. Pressing save again with the same old file never works; load the new save, redo your move, then save.',
    // SQS -> Lambda partial batch responses
    'dva-1-904': 'Ten quests in a bundle, one is cursed. Instead of throwing the whole bundle back on the board, hand in the nine you finished and name only the cursed one.',
    'dva-1-905': 'You have to name the bad quest by its quest ID. Name it by your claim ticket instead and the guild can\'t find it, so it throws the whole bundle back.',
    'dva-1-906': 'An empty "failed" list means all clear. Crashing means the whole bundle failed. In a single-file line, stop at the first stumble and hand back it and everyone behind it, so nobody skips ahead.',
    // Lambda function URLs
    'dva-1-907': 'Give the function its own front door with an ID scanner (AWS_IAM), then put the partner\'s guild badge on the door\'s guest list.',
    'dva-1-908': 'Even an "open to all" door needs a sign saying everyone may enter. The console hangs the sign for you; a CloudFormation build doesn\'t, so the bouncer says 403.',
    'dva-1-909': 'A function URL is a simple front door: it can be put on a nickname (alias) or the newest build, it has its own CORS rules, and its address never changes. No fancy bouncers, no 29-second kick-out, no ticket booths.',
    // SQS long polling
    'dva-1-910': 'Stop refreshing the quest board every millisecond. Stand at the board for up to 20 seconds and get handed the quest the moment it is posted.',
    'dva-1-911': 'A quick glance only checks some of the board\'s shelves, so you can miss a quest. Long polling checks every shelf.',
    'dva-1-912': 'Turn on "wait at the board" either as the board\'s house rule or by saying "I\'ll wait" each time you look. The longest you can wait is 20 seconds.',
    // DynamoDB Query/Scan and paging
    'dva-1-913': 'The loot list comes in pages of at most 1 MB. "LastEvaluatedKey" is the bookmark: hand it back to get the next page, and stop when there\'s no bookmark.',
    'dva-1-914': 'Ask the librarian for one player\'s shelf and only March\'s books (a key condition), instead of reading the whole library and throwing most books away.',
    'dva-1-915': 'Limit says "look at 50 books", then the filter throws out the closed ones. You still paid to look at all 50, and the bookmark only means "I stopped looking here."',
    // S3 presigned URLs
    'dva-1-916': 'A guest pass signed with a temporary badge dies when the badge expires, no matter what date you wrote on the pass.',
    'dva-1-917': 'Hand the player a one-time-style upload slip for one exact chest. They drop the item in directly, no keys of their own needed.',
    'dva-1-918': 'A guest pass carries the signer\'s powers: if the signer loses access, the pass stops working. Signed with long-term keys it can last up to a week, and it works many times until then.',
    // API Gateway CORS
    'dva-1-919': 'In passthrough mode the gatekeeper hands back exactly what the function says, so the function itself must write "this website is allowed" on every reply.',
    'dva-1-920': 'The browser\'s "may I?" knock never carries a badge. Let the HTTP API answer the knock itself with its CORS settings, so the badge checker never sees it.',
    'dva-1-921': 'The knock reply must say "those headers are fine", and the real reply must say "your website is allowed." Both are answers from the server, not things the browser brings.',
    // Revoking role sessions
    'dva-2-901': 'Hit the role\'s "cancel all old passes" button. Passes printed before now stop working; the CI bot just prints a fresh one on its next run.',
    'dva-2-902': 'The rule is "deny anyone whose pass was printed before 9:00." Printed-before is DateLessThan on the print time (aws:TokenIssueTime).',
    'dva-2-903': 'The button glues a "deny old passes" note (AWSRevokeOlderSessions) to the role, which needs permission to glue notes on. New passes work; system-owned roles can\'t be cancelled this way; and your CLI keeps its old pass until you delete its cache.',
    // KMS envelope encryption
    'dva-2-904': 'The vault spell only fits a 4 KB scroll. For a big chest, ask the vault for a spare key, lock the chest yourself, and keep the spare key locked in the vault\'s wrapping.',
    'dva-2-905': 'To open the chest, send the wrapped spare key to the vault, get it unwrapped, and unlock the chest yourself. The vault never sees the chest.',
    'dva-2-906': 'The vault gives you the spare key twice: loose to use now and wrapped to keep. It never stores spare keys, never rotates them, and a spare key can lock a chest of any size.',
    // Permissions boundaries
    'dva-2-907': 'Let developers craft new characters only if each one wears the level-cap amulet (DevBoundary). Even if they hand it god-mode gear, the amulet caps it.',
    'dva-2-908': 'You can only use powers that both your skill tree and your level cap allow. The overlap here is just reading S3 objects.',
    'dva-2-909': 'A level cap never gives powers, a ban still beats it, and it goes on characters (users and roles), not on parties or treasure chests.',
    // SAM gradual deployments
    'dva-3-901': 'Canary means: let 10% of players try the new patch for 5 minutes, then everyone. If the error alarm rings, roll the patch back automatically.',
    'dva-3-902': 'The tester has to report back to the referee ("passed" or "failed"). Just finishing silently leaves the referee waiting an hour, then it calls the match lost.',
    'dva-3-903': 'The slow rollout happens on the nickname (the live alias). Anyone who calls the function by its plain name walks straight into the newest build.',
    // CodePipeline
    'dva-3-904': 'Put a "boss must sign" checkpoint before the final dungeon, and have it ping the boss by email when someone is waiting.',
    'dva-3-905': 'A sign-off checkpoint waits seven days. Nobody signed, so the run failed at the checkpoint.',
    'dva-3-906': 'Same turn number means the two party members act together; a bigger number for the deploy means it acts after both finish.',
    // CodeDeploy hooks
    'dva-3-907': 'Lambda deploys have just two checkpoints: before traffic moves and after. Testing before any players arrive is BeforeAllowTraffic.',
    'dva-3-908': 'Container (ECS) deploys have five checkpoints, including one for the test portal: BeforeInstall, AfterInstall, AfterAllowTestTraffic, BeforeAllowTraffic, AfterAllowTraffic.',
    'dva-3-909': 'On servers you can run your own scripts at stop, before-install and validate. Downloading, installing and opening the gates are the game engine\'s own moves.',
    // CodeBuild buildspec
    'dva-3-910': 'Tell the build "fetch the password from the secret vault at run time" (secrets-manager in env), so it never sits in your notes.',
    'dva-3-911': 'Choose your character class (Node 20) in the install step, before you buy gear and fight.',
    'dva-3-912': 'The loot list says which files to keep, "discard paths" dumps them all in one bag, and cache keeps your gear between runs. Settings from the start button beat the notes file.',
    // CloudFormation
    'dva-3-913': 'A change set is a preview screen: it shows what the patch will do, including "this will destroy and rebuild your castle", before you press apply.',
    'dva-3-914': 'Drift check only compares stats you wrote down yourself. Write down the timeout, even at its default, and changes to it will show up.',
    'dva-3-915': 'A StackSet copies the same build to every guild hall in the region group, and auto-deploy adds it to new halls as they join.',
    // Elastic Beanstalk
    'dva-3-916': 'Bring one extra squad onto the field before swapping squads out, so you never fight short-handed, without paying for a whole second army.',
    'dva-3-917': 'Traffic splitting is a canary: send 15% of players to the new server for 10 minutes, then everyone, or send them all back if it breaks.',
    'dva-3-918': 'Extra-batch rolling, immutable and traffic splitting all keep the full squad on the field. All-at-once and plain rolling pull fighters off mid-battle.',
    'dva-3-919': 'Half the squads got the new gear before the failure; the rest still have the old. To undo, equip everyone with the last good gear again.',
    // X-Ray annotations and metadata
    'dva-4-901': 'Annotations are searchable tags on the replay ("tier: gold"). Metadata is a note stuck inside the replay that search can\'t see.',
    'dva-4-902': 'For a big bag of details you only read when you open a replay, use metadata. Annotations are small searchable tags.',
    'dva-4-903': 'Up to 50 searchable tags per replay, and tags are plain words, numbers or yes/no. Metadata can hold anything but can\'t be searched. Both can go on any part of the replay.',
    // X-Ray sampling
    'dva-4-904': 'Add a rule "record every PUT to checkout" with a small priority number so it is checked first. Rules live in X-Ray, so no redeploy.',
    'dva-4-905': 'Each of the ten servers had its own "first player each second" pass, so you got ten. Shared rules in X-Ray split one pass among them.',
    'dva-4-906': 'The first server in the chain decides whether to record the replay; everyone after just follows. Change the rule on Service A.',
    // CloudWatch composite alarms
    'dva-4-907': 'A combo alarm: only ring the pager when the error bell AND the slow bell ring together. The old bells stay as they are.',
    'dva-4-908': 'Ring when errors are high AND we are NOT in a planned deploy.',
    'dva-4-909': 'A combo alarm can send messages, call a function or open tickets, but it can\'t pull the "add more servers" lever. Only a metric alarm can.',
    // Lambda SnapStart
    'dva-4-910': 'SnapStart is a save state taken after the long loading screen. New players load the save state instead of watching the whole intro again, and nobody pays to keep idle players waiting.',
    'dva-4-911': 'Everyone loads the same save state, so a "random" number rolled before the save is the same for all. Roll it after loading instead.',
    'dva-4-912': 'Save states don\'t mix with always-warm summons (provisioned concurrency) or a mounted shared drive (EFS).',
    // STS decode-authorization-message
    'dva-4-913': 'The error is a sealed scroll. Only the decode spell, cast by someone allowed to cast it, opens it to show the action, target and rules that stopped you.',
    'dva-4-914': 'Opening the sealed scroll needs one specific spell permission: sts:DecodeAuthorizationMessage.',
    'dva-4-915': 'The scroll says "no rule let you hand your costume to the server" (iam:PassRole). Add that permission for that costume.',
    // Lambda concurrency
    'dva-4-916': 'Reserve 100 seats in the arena just for the payment team. Free to reserve, and nobody else can take them.',
    'dva-4-917': 'The old database only has 20 chairs. Cap the function at 20 copies (reserved concurrency) so nobody stands.',
    'dva-4-918': 'Reserved seats are free and also the max (0 seats closes the door). Warm summons (provisioned) cost money, live on a version or alias, and can\'t outnumber the reserved seats.',
    // API Gateway caching and 429 throttling
    'dva-4-919': 'The cache was keyed only on the path, so shoes and hats shared one slot. Add the category to the key.',
    'dva-4-920': 'Only the REST API gatekeeper has a built-in memory (cache). The HTTP API one doesn\'t.',
    'dva-4-921': '429 means "server full." For a direct call, Lambda tells you to try again; it\'s on you to retry with a short wait. Only background calls get retried for you.',
    'dva-4-922': 'With 50 reserved seats, the 51st player at once gets "server full", and so does anyone past 500 joins per second (ten per seat).'
  };
  Object.keys(E).forEach(k => { if (!SD.eli5[k]) SD.eli5[k] = E[k]; });
})();
