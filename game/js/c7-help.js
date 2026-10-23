// Chapter 7's "Huh???" lines (one per concept, js/c7-data.js) and "ELI5 🎮" lines (one per bank question the chapter
// asks, by id), in game and anime terms with as little AWS jargon as possible, plus the chapter's glossary words.
// An ELI5 or glossary word that another chapter already wrote is left alone.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  Object.assign(SD.huh, {
    revoke: 'A stolen hall pass keeps working until the time printed on it. Revoking is a note on every door: "no pass printed before noon today". The thief\'s pass stops at once, and anyone who gets a new pass walks straight in.',
    sesspol: 'The guard reads the whole rulebook in one go. Any "NO" anywhere wins. Otherwise someone has to say yes, and every other page (the guild\'s limits, the boundary, the note you brought with you) can only cut the yes down, never add to it.',
    rootuser: 'The root user is the game\'s owner account. No in-game rule can stop it, so lock it with a second key (MFA), never make spare keys for it, and only log in as it for the handful of things only the owner can do.',
    sharedresp: 'AWS guards the castle: the walls, the floors, the wiring, the machines that run its own shops. You guard what you bring inside: your treasure, who holds the keys, which doors you leave open, and anything you build yourself.',
    compliance7: 'A referee (AWS Config) checks every one of your pieces against the rules all day, and can put the wrong ones back. AWS Artifact is the shelf where AWS keeps its own report cards from outside examiners, and the contracts you sign with it.',
    orgs: 'A guild of accounts. One head account pays the whole guild\'s bill, the others are members sorted into teams, and everything the guild buys counts as one big order, so the bulk discounts come sooner.',
    scps: 'The guild\'s house rules. They say the most any member account may ever do, even its owner, but they never hand anyone a permission. The guild\'s head account is the one place the house rules don\'t reach.',
    controltower: 'Control Tower builds the guild hall for you: a records room, an inspectors\' room, rules for each team, and a stamp that makes every new member account the same way. Identity Center is the one front door, with a second key, that sends each person to only the rooms they\'re allowed in.',
    leastpriv: 'Give every hero only the spells they actually cast. Access Analyzer watches what they really used, writes the short spell list for you, and points at the keys and roles nobody has touched in months.',
    ir7: 'Something\'s wrong in the dungeon. Stop it first (cancel the stolen passes, lock the room), then look (Detective draws who talked to whom, and when), then fix it. Security Hub is the one noticeboard where every alarm gets pinned.',
    sharing: 'Every team has its own house now, but some things are shared: a road everyone drives on (RAM), a shop of approved kits anyone can build from without knowing how (Service Catalog), a ledger of licences, and a checklist review for each house.'
  });
  const E = {
    // Revoking sessions
    'dva-2-870': 'Put up the note: "no pass printed before now works". The leaked passes stop, and the app just prints itself a new one.',
    'saa-1-873': 'Cancel the stolen passes first, and the fleet just prints new ones. Then read the logbook to see what the thief did and undo it.',
    // Session policies
    'dva-2-871': 'The role says "read and write". The note you brought says "read and delete". You only get what both say: read.',
    // The root user
    'saa-1-104': 'Put a second lock on the owner\'s account, and give the script its own small key instead of the owner\'s, then throw the owner\'s key away.',
    'saa-1-207': 'Take the owner\'s keys away from every member account, and let the guild\'s head account open a short owner session only when a door is jammed shut.',
    'saa-1-874': 'A few things only the owner can do. Making a bucket ask for a second key before anything is deleted forever is one of them.',
    // Shared responsibility
    'saa-1-107': 'AWS owns the castle and its machines. On your own server, the patches inside it and the doors you leave open are yours.',
    'saa-1-204': 'On RDS, AWS looks after the machine and the database software. Who gets an account inside the database, and who can reach its door, is still yours.',
    // Compliance
    'saa-1-138': 'A rule pack is a whole set of referees sent out together, to every account at once, and they put back what they can.',
    'saa-1-224': 'One scoreboard in the security room that shows every referee\'s results from every account and every kingdom.',
    'saa-1-222': 'Sign the guild-wide contract once from the head account, so new members are covered too, and pick up AWS\'s report card from the Artifact shelf.',
    'saa-1-467': 'Let them read the shelf\'s list, and take down only the SOC and PCI report cards. Nothing that signs or cancels a contract.',
    'saa-1-468': 'Ask the Artifact shelf to ring a bell for the officer whenever a report card or a signed contract changes.',
    // Organizations and consolidated billing
    'saa-4-208': 'Six separate shoppers each pay the small-order price. Join one guild, and the bill becomes one big order with the bulk price.',
    'saa-4-870': 'The guild\'s orders are added up as if one account made them all, so most of the 300 TB lands in the cheaper tiers.',
    'saa-4-401': 'The head account can tell one member "your discounts stay yours, and you don\'t get anyone else\'s", and it stays on the guild\'s bill.',
    // SCPs
    'saa-1-870': 'A guild house rule that says "no" to every account\'s owner. The roles keep working, and the head account is never bound by house rules anyway.',
    'saa-1-871': 'With a yes-list, every level from the guild down to the account has to say yes. One missing yes and the answer is no.',
    'saa-1-102': 'House rules never reach the guild\'s head account. So don\'t do daily work there, and keep its door almost shut.',
    'saa-1-01': 'One guild house rule: "no building outside these two kingdoms", with an exception for the services that live everywhere.',
    // Control Tower
    'saa-1-103': 'Let Control Tower build the guild hall, and stamp every new account with Account Factory so each starts the same way.',
    'saa-1-473': 'A proactive guard checks the blueprint before the building goes up, and refuses any bucket that wouldn\'t keep a visitor log.',
    'saa-1-474': 'Sign the old team up with Control Tower, and all 40 of its accounts get the hall\'s rules at once.',
    // Least privilege
    'saa-1-231': 'One watcher for the whole guild, pointing at every role, key and spell nobody has used in 90 days.',
    'saa-1-110': 'Draw a fence around the guild, and have the analyzer list everything that lets someone outside the fence in.',
    // Incident response
    'saa-1-212': 'Scan the disks for monsters without installing anything, and ask Detective for the map of who the instance talked to.',
    'saa-1-218': 'Make one account the alarm keeper for the guild, and set one rule there that turns the standard on everywhere, new accounts too.',
    'saa-1-465': 'A rule that marks every production alarm as critical the moment it\'s pinned up, and a bell that calls the fixer for the public-bucket alarm.',
    'saa-1-462': 'Turn Detective on for every account, and new ones automatically, then switch on its extra package that reads the clusters\' own logbooks.',
    // Sharing across accounts
    'saa-1-872': 'The network team owns the road and shares its lanes with the other teams, who park their own cars on it.',
    'saa-1-303': 'Share the shop of approved kits with the whole guild, so every change arrives by itself, and let each account choose who may shop.',
    'saa-1-302': 'Put the three blueprints in the kit shop with a builder who has the permissions, so developers can build without having them.',
    'saa-4-434': 'Write the 30 rules as your own checklist in the review tool, share it, and save a milestone each time a team fixes things.',
    'saa-4-437': 'Swap the instances to the "licence included" kind, so AWS charges for SQL Server by the hour, with nothing moved.',
    'saa-4-561': 'In the interns\' shop only, add a rule that the size box can say t3.micro or t3.small, and nothing else.'
  };
  Object.keys(E).forEach(k => { if (!SD.eli5[k]) SD.eli5[k] = E[k]; });
  const has = t => SD.glossary.some(g => g[0] === t);
  [
    ['SCP', /\bSCPs?\b|service control polic/i, 'An Organizations policy that sets the most a member account\'s users and roles can do. It grants nothing.'],
    ['Organizational unit', /\bOUs?\b|organizational units?/i, 'A group of accounts in an organization that policies can be attached to.'],
    ['Management account', /management account/i, 'The account that creates the organization and pays its bill. SCPs never restrict it.'],
    ['Consolidated billing', /consolidated bill/i, 'One bill for every account in an organization, with their usage added together for volume pricing.'],
    ['Session policy', /session polic/i, 'A policy passed when a role session starts. It can only narrow what the role allows.'],
    ['Control Tower', /Control Tower/i, 'Sets up and governs a multi-account landing zone with controls on OUs.'],
    ['Permission set', /permission sets?/i, 'An IAM Identity Center template of permissions, given to people in the accounts they\'re assigned to.'],
    ['AWS Config', /AWS Config|Config rules?|conformance pack/i, 'Records how resources are configured and checks them against rules.'],
    ['AWS Artifact', /AWS Artifact/i, 'Where AWS\'s own audit reports and agreements are downloaded and accepted.'],
    ['IAM Access Analyzer', /Access Analyzer/i, 'Finds external and unused access, and generates and validates policies.'],
    ['Security Hub', /Security Hub/i, 'Gathers security findings across accounts and checks them against standards.'],
    ['Amazon Detective', /\bDetective\b/, 'Builds a graph from logs and findings for investigating what happened.'],
    ['AWS RAM', /Resource Access Manager|\bRAM\b/, 'Shares resources such as subnets with other accounts or the organization.'],
    ['Service Catalog', /Service Catalog/i, 'Offers approved CloudFormation products, with constraints, to people who can\'t build them alone.']
  ].forEach(g => { if (!has(g[0])) SD.glossary.push(g); });
})();
