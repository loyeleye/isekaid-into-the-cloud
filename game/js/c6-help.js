// Chapter 6's "Huh???" lines (one per concept, js/c6-data.js) and "ELI5 🎮" lines (one per bank question the chapter
// asks, by id), in game and anime terms with as little AWS jargon as possible, plus the chapter's glossary words.
// An ELI5 or glossary word that another chapter already wrote is left alone.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  Object.assign(SD.huh, {
    regionsaz: 'A Region is a whole kingdom; its Availability Zones are separate castles in it, each with its own wells and walls. Lose one castle and the others carry on. Lose the kingdom, and only a copy in another kingdom saves you.',
    routing53: 'Route 53 is the signpost at the crossroads. It can always point one way, point to the backup when the main road\'s out, split travellers by percentage, send each to the nearest town, or pick by which country they came from.',
    health53: 'A health check is a scout who knocks on every door every 30 seconds and asks "are you really open?". If the door doesn\'t answer, or only pretends to, the signpost stops pointing there. Scouts can also listen to an alarm bell, or to other scouts.',
    drtiers: 'How much of your save can you lose (RPO), and how long can the game be offline (RTO)? Keep backups in a box (cheap, slow), keep a tiny flame lit (pilot light), keep a smaller copy running (warm standby), or run two full games at once (expensive, instant).',
    readiness: 'Awake isn\'t the same as ready. A shopkeeper who\'s still unpacking is alive but can\'t serve you yet, so the guard should wait before deciding the shop is broken, and only send customers once it says "open".',
    quotaalarm: 'Every account has a limit on how many lamps it can light in each kingdom. If your escape plan needs 400 lamps in the next kingdom, ask for the bigger limit there before the disaster, and ring a bell when you\'re getting close.',
    legacy: 'An old machine nobody can rewire: don\'t touch it. Have it move itself to healthy ground when its floor cracks, put a spare beside it, or keep a sleeping copy in another place that wakes up in minutes.',
    replicas: 'A scribe on the far shore copies every page you write, a little later. Some copy books (S3 replication), some copy every shelf and let both shores write (global tables), some copy the whole library in about a second (Aurora global database).',
    mesh: 'Peering is a bridge between two towns, and it goes nowhere else. A transit gateway is a big central square that every town has a road to. PrivateLink is a shop window set into their wall: you can buy through it, but nobody walks in.',
    hybrid6: 'Direct Connect is your own private road to the castle: steady, fast, and slow to build. Keep a hidden path (a VPN) beside it, so if a landslide cuts the road, travellers take the path without anyone telling them to.',
    edge6: 'CloudFront is a chain of corner shops that keep copies of what everyone keeps buying. The cache key is what the shop checks to decide two orders are the same. Global Accelerator is an express lane to the main shop, but it doesn\'t keep any copies.',
    costnet: 'Every bridge between castles has a toll, and so does the road out of the kingdom. The NAT gateway charges for every cart, so send storehouse carts through the free side door (gateway endpoint), and give every castle its own gate.',
    costtools: 'The receipt reader (Cost Explorer), the alarm that rings when you\'re about to overspend (Budgets), name labels on everything you own (tags), a bulk discount for promising to keep playing (Savings Plans), and advisers who point at what you\'re wasting.',
    stacksets: 'A StackSet is one blueprint that builds the same castle in every kingdom at once, and lets you change the size of the windows in one of them without drawing a second blueprint.',
    immutable: 'Don\'t patch the knight\'s armour on the battlefield. Forge a new suit, swap it on, and throw the old one away. Nothing drifts, and going back means putting the old suit on again.',
    mrkeys: 'A multi-Region key is the same magic key made twice, one in each kingdom, so a letter sealed in one can be opened in the other. Each copy keeps its own guest list, though.',
    keydelete: 'Throwing away a master key is so final that the game makes you wait a week or more. While you wait the key is frozen. You can still change your mind, but the key comes back switched off, and someone has to switch it on.',
    objlock: 'Locking a save file. Governance mode: a lock a guild master with the right badge can still pick. Compliance mode: a lock even the game master can\'t pick until its timer runs out. A legal hold: a lock with no timer, lifted only when the case is over.',
    awsbackup: 'One backup plan for the whole guild: which saves to keep, how often and how long, with copies sent to another account and another kingdom. Vault Lock makes the vault\'s rules unbreakable, even for the account owner, once its trial days pass.',
    lifecycle6: 'A timer on your files: move them to colder, cheaper shelves as they get old, and throw them out when nobody needs them. It can\'t throw out anything that\'s still locked.'
  });
  const E = {
    // Regions and Availability Zones
    'saa-1-202': 'Each account\'s map gives the castles different nicknames. To meet in the same castle, use its real ID, which is the same on everyone\'s map.',
    'saa-1-201': 'If the law says the treasure stays in this kingdom, build in this kingdom, and keep every copy and backup here too.',
    'saa-2-06': 'Two shops in one castle fall together. Put them in two castles, with a manager who replaces any that close and a gate that only sends customers to open ones.',
    'saa-2-02': 'A twin that takes over if the main castle falls (Multi-AZ), plus a reading copy for the report writers (a read replica), so they stop crowding the main desk.',
    'saa-2-131': 'When the database moves castles, the app keeps knocking on the old door. A doorman in front (RDS Proxy) holds the line and walks everyone to the new door.',
    'saa-2-122': 'Mark the big twin as first in line to take over, and the little report copy as last, so the castle never ends up run by the smallest one.',
    // Route 53 routing
    'saa-2-04': 'The signpost points to the main town while a scout says it\'s open. When the scout says it isn\'t, the signpost points to the backup town.',
    'saa-2-205': 'Give both towns the same name sign, then have the signpost point to the main one while it answers, and to the other when it doesn\'t.',
    'saa-2-117': 'One sign per town, and each traveller goes to the closest. Ask each sign to check its own town is open, so a closed one is skipped.',
    'saa-2-118': 'Send everyone from Europe to the European town, and everyone else, including travellers nobody can place, to the default town.',
    'saa-2-119': 'Give the signpost a list of up to eight open doors, each with its own scout, so it hands out several and skips any that are shut. No gatekeeper needed.',
    'saa-2-217': 'Send one traveller in ten to the new town and nine to the old, check both are open, and shift the numbers bit by bit.',
    'saa-2-218': 'Each traveller goes to the nearer town, but the big town gets a magnet (a bias) that pulls in the people living near the border.',
    'saa-4-230': 'A shortcut sign (an alias) to your own AWS shops costs nothing to read. A normal pointer sign (a CNAME) charges every time.',
    // Health checks
    'saa-2-850': 'A head scout who listens to three little scouts, and only says "open" while at least two of them do.',
    'dva-4-314': 'The scouts live outside the walls and can\'t reach a house with only an inside address. Have the house ring a bell (an alarm) instead, and let the scout listen to the bell.',
    'dva-4-401': 'The door only opens for partners and the office, so the scouts\' knocks are ignored. Put the scouts\' addresses on the guest list.',
    'saa-2-219': 'A house with no outside address: let a bell ring when it\'s sick (an alarm on its status check), and have the scout watch the bell.',
    'dva-4-120': 'Only wake the knight on duty when both bells ring at once: one big bell (a composite alarm) that rings only if the two little ones do.',
    'saa-2-563': 'When the game\'s own world has trouble, it posts a notice. Set a messenger (an EventBridge rule) to carry every notice straight to the team\'s horn.',
    'saa-2-306': 'One watchtower that sees trouble in all sixty castles, run by a trusted guard who doesn\'t need the king\'s throne room to do it.',
    // DR strategies
    'saa-2-03': 'Keep the treasure copied to the other kingdom all the time, and the blueprints ready to build the shops there. Losing minutes and rebuilding in hours: a pilot light.',
    'saa-2-121': 'A smaller copy of the shop already open in the other kingdom, so it can serve customers the moment you switch, then grow: warm standby.',
    'saa-2-120': 'A magic mirror (Elastic Disaster Recovery) that copies every old machine all the time, and only builds the full-size copies on the day you need them.',
    'saa-2-216': 'The same mirror for machines in one kingdom: copied to the next all day, small until the disaster, and you can practise waking them without disturbing anyone.',
    'saa-2-05': 'A library with a copy in other kingdoms that\'s about a second behind. People there read their own copy, and if the main library falls, one copy becomes the main one in minutes.',
    // Readiness
    'dva-4-124': 'The new shopkeeper needs three minutes to unpack. Give the guard a longer grace period, and have him ask "ready to serve?" instead of "awake?".',
    'dva-4-313': 'A worker who\'s awake but stuck. Give his own house a check that asks if he\'s really working, and some time to wake up before the check counts.',
    // Quota alarms
    'dva-4-122': 'Draw a meter of how much of the key-box limit you\'re using, as a percentage, and ring a bell at 80%.',
    'saa-2-129': 'The escape plan needs 400 lamps in the next kingdom, and the limit there was never raised. Ask for more there, and ring a bell before you hit the limit.',
    // Legacy
    'saa-2-130': 'An old licence that only works on this one machine. If the floor under it breaks, have it move itself to healthy ground with the same name and address.',
    'saa-2-305': 'When the game posts "this machine\'s floor is being retired", have a messenger catch the notice and tell a helper to stop and restart it on new ground.',
    // Replication
    'saa-2-123': 'Give the player-profile book a twin in Europe (a global table), so each side reads and writes its own copy, and both survive if one kingdom falls.',
    'saa-2-125': 'Both libraries must keep every edition (versioning), and the express scribe (Replication Time Control) promises almost every page arrives within 15 minutes.',
    'saa-2-851': 'Two shores change the same page a moment apart. The global table keeps whichever change came last, on both shores, and throws the other away.',
    'saa-2-852': 'The scribe only copies pages written after he was hired. To copy the old pages too, send a one-time batch job.',
    'saa-1-230': 'The scribe can only copy pages sealed with a key he\'s allowed to use. Tell him to copy them, give him the far shore\'s key, and let him use both keys.',
    'saa-4-439': 'The report copy lives across the sea, and every page is shipped over for a fee. Put the copy next to the readers instead.',
    'saa-2-124': 'A rewind button for the table: turn on point-in-time recovery and you can rebuild it as it was any second in the last few weeks.',
    // Transit Gateway, peering, PrivateLink
    'saa-3-119': 'Sixty towns with bridges between every pair is chaos. Build one central square (a transit gateway), share it, and give every town one road to it.',
    'saa-4-124': 'Two towns with heavy trade and nobody else to visit: one bridge between them (peering) is the cheapest way.',
    'saa-4-229': 'The central square charges per cart. For the two towns trading the most, build a bridge straight between them and update their road maps.',
    'saa-1-114': 'Only customers on the list can open a window to your shop, and you approve each new window before anything passes through it.',
    'saa-3-461': 'Two hundred towns, many with the same street names. A shop window in each of their walls (PrivateLink) works, and you can\'t climb through it into theirs.',
    // Direct Connect and VPN
    'saa-1-125': 'Your private road isn\'t sealed. Run a sealed tunnel (a VPN) along it, so everything on the road is locked and still fast.',
    'saa-3-121': 'A private road for steady traffic, and a hidden path beside it on the same gate, so travellers switch to the path by themselves if the road is cut.',
    'saa-4-125': 'Hauling that much for years on the bumpy public path costs a fortune. Build your own road (Direct Connect); it takes months, and then it\'s cheaper.',
    'saa-4-234': 'You need a road a little wider than 3.3 lanes. Buy the next size up, 5, and not the 10.',
    'saa-4-228': 'A small office, a good internet line, a week to do it: a sealed tunnel over the internet, not a private road.',
    // CloudFront, Global Accelerator, caching
    'saa-3-02': 'A game that uses fast messages, worldwide, with two fixed addresses to trust and a quick switch if a kingdom falls: the express lane (Global Accelerator).',
    'saa-3-220': 'Partners only trust a short, fixed list of doors. Give them the express lane\'s two fixed addresses, with a group of doors behind them in each kingdom.',
    'saa-3-462': 'Turn the dial on that kingdom\'s door group to 0 for repairs, then back up in steps of 25. People already inside stay inside.',
    'saa-3-221': 'Everyone keeps buying the same pages and photos. Corner shops (CloudFront) keep copies near them, and the main shop gets a rest.',
    'dva-4-215': 'Two shoppers asking for the same page with different tracking stickers are still asking for the same page. Only check the stickers that matter: page and size.',
    'dva-4-216': 'The shop sorts visitors into phone or desk for you. Keep the phone and desk copies apart, using only that label.',
    'dva-4-319': 'The corner shop was told to keep every copy at least an hour, so it ignores the price tag that says "one minute". Give the price pages their own shorter rule.',
    'saa-4-232': 'Only the language changes the page, so only check the language; and tell the corner shops to keep each copy for the whole day, not one minute.',
    // Data transfer costs
    'saa-1-03': 'The storehouse carts are paying the toll gate (the NAT) every day. Build a free side door (a gateway endpoint) and send them through it.',
    'saa-4-122': 'The image carts pay the toll gate every trip. Shop windows for the image registry, plus the free side door for the storehouse where the images really live.',
    'saa-4-126': 'Give every castle its own toll gate so nobody crosses between castles to reach one, and send the DynamoDB carts through the free side door.',
    'saa-4-235': 'To find who pays the toll between castles, get the full receipt, hour by hour and item by item, and search it.',
    'saa-4-127': 'Five crates a day hauled across the sea and back. Do the work next to the crates instead, in the same kingdom.',
    'saa-4-440': 'Swap the hand-built toll gate for a managed one, and keep the same address on it so the partners still recognise you.',
    // Cost tools
    'saa-4-04': 'A promise to spend the same each hour, on any kind of machine, gets the biggest discount and lets you swap machine types: a Compute Savings Plan.',
    'saa-4-115': 'Every item already wears a team label. Switch the label on in the treasury, then sort the receipt by it.',
    'saa-4-217': 'Switch the team label on, then give each team its own spending alarm that rings when their forecast passes 80%.',
    'saa-4-216': 'At the spending limit, one budget stops the practice machines, and another, from the treasury, forbids building new ones.',
    'saa-4-411': 'A spending limit that recalculates itself from the last six months, and an alarm at 110%.',
    'saa-4-226': 'An alarm that rings when less than 90% of the reserved rooms you paid for are actually used.',
    'saa-4-225': 'The adviser (Trusted Advisor) already has a checklist for idle databases, quiet disks and unused addresses, and sends it every week.',
    'saa-4-111': 'An adviser (Compute Optimizer) watches how hard each machine really works and suggests smaller ones, including the cheaper Graviton kind.',
    'saa-4-213': 'The same adviser for container tasks: it says how much CPU and memory each one really needs, and what you\'d save.',
    'saa-4-402': 'Switch on item-by-item, day-by-day detail for machines, then sort the receipt by item to find the expensive ones.',
    'saa-4-218': 'Let the guild\'s discounts be shared between all its accounts, so an unused discount in one pays for another.',
    'saa-4-108': 'A three-year reservation you can trade in for a different machine family later: Convertible Reserved Instances.',
    'saa-4-120': 'A reservation for this size that still counts when the database grows, because it applies across sizes in the same family.',
    // StackSets and immutable infrastructure
    'dva-3-853': 'One blueprint for both kingdoms, and for one kingdom you just write a different window size on its own copy (a parameter override).',
    'dva-3-132': 'One blueprint sent to every account in the guild, and to every new account that joins, automatically.',
    'saa-2-127': 'Forge a new suit of armour (an AMI), tell the barracks to use it, and swap the knights over a few at a time, never dropping below 90% on guard.',
    'dva-3-215': 'Build the new version in a fresh barracks beside the old one, and only swap if it works. A failure leaves the old one untouched.',
    'dva-3-206': 'Build a second, fresh army (blue/green), send everyone to it, and keep the old army standing by for a while so you can go back in minutes.',
    // Multi-Region keys
    'dva-2-854': 'The far shore\'s copy of the key has its own guest list. You\'re on the first one, not on this one.',
    'dva-2-207': 'Make the key a twin set: one in each kingdom with the same magic, so the far shore can open what the near shore sealed.',
    // Key deletion
    'dva-2-855': 'You stopped the key being thrown away, but it comes back switched off. Switch it on (EnableKey).',
    'dva-2-856': 'While the key waits to be thrown away, anyone who tries it gets turned away, and the log notes it. Ring a bell on those notes, so you can still change your mind.',
    // Object Lock
    'saa-1-857': 'Governance mode is a lock a guild master can pick, but only with the special lockpick (s3:BypassGovernanceRetention) and by saying so out loud (the bypass header).',
    // AWS Backup
    'saa-1-226': 'Unbreakable vault rules (Vault Lock, compliance mode): keep backups at least a year and at most seven, and a few trial days before the rule sets for ever.',
    'saa-1-137': 'Lock the vault so nobody, not even the owner, can throw backups away early, and send a copy to a separate account in case this one is taken over.',
    'saa-2-212': 'One backup plan: everything with the "daily" label, every day, kept 35 days, with a copy sent to the next kingdom.',
    'saa-2-213': 'The guild sets the backup plans for every account from the top, and the accounts can\'t change them. One watchtower sees every job.',
    'saa-4-222': 'Keep two weeks of rewind for the database itself, and one monthly backup for seven years with a backup plan. Stop the daily pile of manual copies.'
  };
  Object.keys(E).forEach(k => { if (!SD.eli5[k]) SD.eli5[k] = E[k]; });
  const has = t => SD.glossary.some(g => g[0] === t);
  [
    ['Availability Zone', /Availability Zones?|\bAZs?\b/, 'One or more data centers in a Region, with their own power and networking.'],
    ['RPO / RTO', /\bRPO\b|\bRTO\b/, 'RPO: how much data you can lose. RTO: how long you can be down.'],
    ['Pilot light', /pilot light/i, 'Disaster recovery with the data replicated and the core running, the rest ready to launch.'],
    ['Warm standby', /warm standby/i, 'Disaster recovery with a smaller full copy always running, scaled up on failover.'],
    ['Failover routing', /failover (routing|record)/i, 'Route 53 answers with the primary while it\'s healthy, else the secondary.'],
    ['Health check', /health check/i, 'A probe that keeps asking an endpoint whether it\'s working.'],
    ['Global table', /global table/i, 'A DynamoDB table with a replica in several Regions, each taking writes.'],
    ['Transit gateway', /transit gateway/i, 'A regional hub that routes between every VPC and network attached to it.'],
    ['VPC peering', /peering/i, 'A private link between two VPCs. It doesn\'t pass traffic on to a third.'],
    ['Global Accelerator', /Global Accelerator/i, 'Two static IP addresses that route users to the nearest healthy Region over the AWS network.'],
    ['Cache key', /cache key/i, 'What CloudFront uses to decide two requests want the same cached object.'],
    ['Object Lock', /Object Lock/i, 'Keeps an S3 object version from being deleted or overwritten, for a time or indefinitely.'],
    ['Vault Lock', /Vault Lock/i, 'Makes an AWS Backup vault\'s retention rules unchangeable.'],
    ['StackSet', /StackSets?/i, 'Deploys one CloudFormation template to many accounts and Regions at once.'],
    ['Multi-Region key', /multi-Region (primary )?key/i, 'Related KMS keys in different Regions with the same key ID and key material.'],
    ['Savings Plans', /Savings Plans?/i, 'A discount for committing to a steady amount of compute spend per hour.'],
    ['Cost allocation tag', /cost allocation tag/i, 'A tag turned on in billing, so costs can be grouped by it.']
  ].forEach(g => { if (!has(g[0])) SD.glossary.push(g); });
})();
