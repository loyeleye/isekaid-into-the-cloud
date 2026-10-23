// Chapter 3's dungeons on the Borderlands engine (js/raid.js), as data: the cards the Granaries teach, every enemy,
// the Field Notes (Kyu's runbook pages 4 and 5 among them, fading from row 5), the Sorts, the events, and four
// expeditions, one floor per boss the Story Bible names:
//   The Cold Stores (floors 22-26, Easy)   1 The Grain Floors (the Quartermaster), 2 Sacks, Shelves and Barrels
//                                          (the Granary Keeper). Grandma Wen is found in her pantry at the end.
//   The Abyss (floors 27-32, Medium)       3 The Hot Chamber (the Single Saint), 4 The Index Caves (the Catalogue),
//                                          5 The Well (the Sinkhole). Mother Ash waits below, in js/c3-world.js.
//   The Cathedral (floors 33-40, Hard)     6 The Choir (the Precentor), 7 The Burnt Library (the Archivist),
//                                          8 The Gallery Stair (Sir Aurelian's Shadow), 9 The Gallery (Selvaria,
//                                          fought as a hot partition, after the confrontation's three proofs).
//   The Regent's Sum (the reckoning, Hard) 1 The Vault Stair (the Old Ledger), 2 The Undelivered (the Prayer
//                                          Backlog), 3 The Winter Sum, 4 The Vault (Selvaria again): the band's
//                                          ideas mixed with chapter 2's.
// The band's two curses are live until camp lifts them: The Drinking Barrier (every hit 40% stronger, the shared SLA
// standing in for the frontmost player) and Cold Grain (a Cold Grain card in every deck: the turn it's drawn, your
// first card costs 1 more). SD.c3raid.play(id, how, onDone) runs one; js/c3-world.js calls it.
// AWS facts follow the current AWS documentation. Every explanation is written fresh.
(function () {
  const S = SD.state, U = SD.ui;
  if (!SD.champions || !SD.raid) return;
  const ORDER = ['mira', 'kai', 'seoyeon', 'dutch'];
  const c3 = () => (S.save && S.save.c3) || null;
  const lead = () => (c3() && c3().lead) || (S.save && S.save.c1 && S.save.c1.lead) || 'kai';
  const dev = k => !!(c3() && c3().dev && c3().dev[k]);
  const R3 = SD.c3raid = { active: null };

  // ---------- Intents the engine knows but the base game never named ----------
  Object.assign(SD.intentText, Object.assign({
    hot: i => `Hot key ${i.n}: one partition takes it all`,
    scan: i => `Scan ${i.n}: reads every item`,
    race: i => `Race ${i.n}: two writers, one item`,
    collide: i => `Collision ${i.n}: two claims at once`
  }, SD.intentText));

  // ---------- Cards ----------
  const C = (o) => Object.assign({ ch: 3, kind: 'action', rarity: 'common', tags: [] }, o);
  Object.assign(SD.cards, {
    'g-rightclass': C({ name: 'Right Storage Class', cost: 1, pow: 8, tags: ['class'], art: 'box', concept: 's3class', text: 'Match the class to how often the grain is read: Standard for daily, IA for monthly, Deep Archive for once in a decade.' }),
    'g-lifecycle': C({ name: 'Lifecycle Rule', cost: 1, pow: 6, tags: ['lifecycle', 'class'], cob: 2, art: 'clock', concept: 's3class', text: 'Move it down the classes as it goes cold, then expire it. 2 Stale off at close of business.' }),
    'g-batch': C({ name: 'Batch the Uploads', cost: 1, pow: 7, tags: ['batch'], art: 'box', concept: 's3class', text: 'A sack of grain, not a million grains: fewer, larger objects, a fraction of the requests.' }),
    'g-reqpays': C({ name: 'Requester Pays', cost: 0, pow: 4, tags: ['requester'], draw: 1, art: 'note', concept: 's3class', text: 'Whoever carts the grain away pays for the carting. Draw 1.' }),
    'g-efs': C({ name: 'Mount EFS', cost: 1, kind: 'infra', pow: 5, each: { any: 2 }, tags: ['file'], art: 'cyl', concept: 'storetype', text: 'Infra. Each turn absorb 2 load. One shelf, every cart in every AZ reaching in at once, growing as it fills.' }),
    'g-io2': C({ name: 'Provisioned IOPS', cost: 2, pow: 10, tags: ['block', 'iops'], art: 'bolt2', rarity: 'uncommon', concept: 'storetype', text: 'An io2 volume: the IOPS you ask for, every second, for the barrel that can\'t wait.' }),
    'g-gateway': C({ name: 'Storage Gateway', cost: 1, pow: 7, tags: ['gateway', 'datasync'], art: 'gate', concept: 'datamove', text: 'The farm keeps its old doors; behind them, the grain lands in S3.' }),
    'g-shard': C({ name: 'Write Sharding', cost: 1, kind: 'infra', pow: 6, each: { write: 3 }, tags: ['shard'], art: 'cols', concept: 'ddbkey', text: 'Infra. Each turn absorb 3 write load. A suffix on the hot key: ten partitions share what one couldn\'t.' }),
    'g-highcard': C({ name: 'High-Cardinality Key', cost: 1, pow: 8, tags: ['highcard', 'shard'], art: 'key', concept: 'ddbkey', text: 'A key with many values, used evenly: every counter gets its share of the queue.' }),
    'g-ondemand': C({ name: 'On-Demand Capacity', cost: 1, abs: { any: 7 }, tags: ['ondemand'], art: 'pulse', concept: 'ddbkey', text: 'Absorb {any} load. Pay per request, and the table follows the spike. It can\'t lift one key past its own limit.' }),
    'g-query': C({ name: 'Query, Not Scan', cost: 1, pow: 8, tags: ['query', 'index'], art: 'eye', concept: 'ddbindex', text: 'Name the partition key, narrow by the sort key, and pay only for what you read.' }),
    'g-gsi': C({ name: 'Add a GSI', cost: 1, kind: 'infra', pow: 5, each: { read: 2 }, tags: ['index', 'gsi'], art: 'cols', concept: 'ddbindex', text: 'Infra. Each turn absorb 2 read load; Scan hits land at a quarter. A second catalogue, keyed for the new question.' }),
    'g-project': C({ name: 'Project Only What You Need', cost: 0, pow: 5, abs: { read: 3 }, tags: ['project'], art: 'note', concept: 'ddbindex', text: 'Absorb {read} read load. The index copies two attributes, not the whole 30 KB item.' }),
    'g-paginate': C({ name: 'Follow LastEvaluatedKey', cost: 1, pow: 6, draw: 1, tags: ['paginate'], art: 'note', concept: 'ddbindex', text: 'Hand back the bookmark until there isn\'t one. Draw 1.' }),
    'g-strong': C({ name: 'Strongly Consistent Read', cost: 1, pow: 7, tags: ['strong'], art: 'eye', concept: 'ddbwrite', text: 'ConsistentRead: true. The latest write, every time, for twice the read units.' }),
    'g-condition': C({ name: 'Conditional Write', cost: 1, pow: 9, tags: ['condition', 'version'], art: 'lock', rarity: 'uncommon', concept: 'ddbwrite', text: 'Write only if the version is still the one you read. The second clerk\'s write bounces.' }),
    'g-transact': C({ name: 'TransactWriteItems', cost: 2, pow: 11, tags: ['transact', 'condition'], art: 'lock', rarity: 'uncommon', concept: 'ddbwrite', text: 'All of it or none of it, with a condition on every step.' }),
    'g-ttl': C({ name: 'Time to Live', cost: 1, pow: 6, cob: 3, tags: ['ttl'], art: 'clock', concept: 'ddbstream', text: 'An epoch-seconds expiry, cleared in the background for free. 3 Stale off at close of business.' }),
    'g-stream': C({ name: 'New and Old Images', cost: 1, pow: 6, reveal: true, tags: ['stream'], art: 'eye', concept: 'ddbstream', text: 'Reveal the enemy\'s weaknesses. The stream keeps the item before and after every change, for 24 hours.' }),
    'g-s3ptr': C({ name: 'Keep It in S3', cost: 1, pow: 8, tags: ['s3pointer'], art: 'box', concept: 'ddbstream', text: 'Over 400 KB? The report goes in S3; the item keeps its key.' }),
    'g-cacheaside': C({ name: 'Cache-Aside', cost: 1, kind: 'infra', pow: 5, each: { cache: 3 }, tags: ['cache', 'cdn'], art: 'cyl', concept: 'caching', text: 'Infra. Each turn absorb 3 cache load; hot hits land lighter. Check the shelf, bake on a miss, keep it with a TTL.' }),
    'g-dax': C({ name: 'DAX', cost: 2, kind: 'infra', pow: 7, each: { cache: 3, read: 2 }, tags: ['dax', 'cache', 'cdn'], art: 'cyl', rarity: 'uncommon', concept: 'caching', text: 'Infra. Each turn absorb 3 cache and 2 read load. Microsecond reads for DynamoDB, same API. Strong reads go straight through.' }),
    'g-replica': C({ name: 'Read Replica', cost: 1, kind: 'infra', pow: 5, each: { replica: 3 }, tags: ['replica'], art: 'cyl', concept: 'rdsaurora', text: 'Infra. Each turn absorb 3 replica load. The choir takes the reads, a beat behind.' }),
    'g-writer': C({ name: 'Ask the Writer', cost: 1, pow: 7, tags: ['writer', 'strong'], art: 'eye', concept: 'rdsaurora', text: 'Reads that must see your own write go to the cluster endpoint.' }),
    'g-multiaz': C({ name: 'Multi-AZ Failover', cost: 1, pow: 6, abs: { any: 3 }, tags: ['multiaz'], art: 'pulse', concept: 'rdsaurora', text: 'Absorb {any} load. A standby in another AZ steps in. It takes no reads while it waits.' }),
    'g-proxy': C({ name: 'RDS Proxy', cost: 1, pow: 9, tags: ['proxy'], art: 'gate', rarity: 'uncommon', concept: 'rdsaurora', text: 'A host at the door: a hundred functions, a handful of connections.' }),
    'g-pitr': C({ name: 'Point-in-Time Restore', cost: 2, pow: 11, tags: ['pitr'], art: 'clock', rarity: 'uncommon', concept: 'rdsaurora', text: 'Any second in the retention window, restored as a new DB instance.' }),
    'g-search': C({ name: 'OpenSearch Index', cost: 1, kind: 'infra', pow: 5, each: { read: 2 }, tags: ['search'], art: 'eye', concept: 'purpose', text: 'Infra. Each turn absorb 2 read load; Scan hits land lighter. Every word, indexed, ranked.' }),
    'g-engine': C({ name: 'Purpose-Built Engine', cost: 1, pow: 9, tags: ['engine', 'graph'], art: 'cols', concept: 'purpose', text: 'A family tree in a graph, sums in a ledger, readings in a time series. The question picks the database.' }),
    'g-alias': C({ name: 'Shift the Alias', cost: 1, pow: 6, prewarm: 1, tags: ['alias'], art: 'note', concept: 'lambdaver', text: 'live points at a tested version, not $LATEST. Pre-Warmed 1.' }),
    'g-hanasum': C({ name: 'Hana\'s Sum', cost: 1, pow: 9, tags: ['shard', 'highcard'], art: 'note', rarity: 'rare', concept: 'ddbkey',
      ask: { c: ['ddbkey', 'ddbindex', 'ddbwrite', 'ddbstream'], who: 'self' }, speed: { fast: { crit: 1.6 }, steady: { crit: 1.3 }, slow: {} }, wrong: { selfDmg: 2 },
      text: 'Answer a question on DynamoDB: fast and right, this hits 60% harder. A day a year, from everyone.' }),
    // Kai's card this chapter, and its upgrade (A Day a Year) once Mother Ash has told him what the sum means.
    'g-share': C({ name: 'Share the Load', cost: 1, abs: { any: 10 }, exhaust: true, quest: true, rarity: 'rare', champ: 'kai', art: 'pulse', text: 'Absorb {any} load. Exhaust. A hit meant for one, spread across the party.' }),
    'g-dayayear': C({ name: 'A Day a Year', cost: 1, all: true, mit: 6, abs: { any: 14 }, pow: 6, tags: ['dayayear', 'shard', 'highcard'], exhaust: true, quest: true, rarity: 'rare', champ: 'kai', art: 'pulse',
      text: 'Absorb {any} load and Mitigate {mit} on every enemy. Exhaust. The hit is spread across the party and every citizen on the field: the adds become part of the key space.' }),
    // Sir Aurelian's boon, once he has helped (js/c3-world.js): once a fight, one player's hit split across the party.
    'g-gauntlet': C({ name: 'Aurelian\'s Gauntlet', cost: 0, abs: { any: 8 }, exhaust: true, quest: true, rarity: 'rare', art: 'pulse', text: 'Absorb {any} load. Exhaust. Once a fight, the hit meant for one is split across the party. Twelve names inside it.' }),
    // The curse, while the camp hasn't lifted it.
    'g-coldgrain': { name: 'Cold Grain', cost: 0, kind: 'action', unplayable: true, curse: true, quest: true, rarity: 'basic', tags: [], art: 'spider-web', onDraw: { tax: 1 }, ch: 3,
      text: 'Curse. The turn you draw it, your first card costs 1 more. Wen\'s Warm Oven lifts it.' }
  });
  const REWARDS = ['g-rightclass', 'g-lifecycle', 'g-batch', 'g-reqpays', 'g-efs', 'g-io2', 'g-gateway', 'g-shard', 'g-highcard', 'g-ondemand', 'g-query', 'g-gsi', 'g-project',
    'g-paginate', 'g-strong', 'g-condition', 'g-transact', 'g-ttl', 'g-stream', 'g-s3ptr', 'g-cacheaside', 'g-dax', 'g-replica', 'g-writer', 'g-multiaz', 'g-proxy', 'g-pitr',
    'g-search', 'g-engine', 'g-alias', 'g-hanasum'];
  // Each expedition's cards are its own floors' teaching, so rewards come from what this expedition is about.
  const XPCARDS = {
    cold: ['g-rightclass', 'g-lifecycle', 'g-batch', 'g-reqpays', 'g-efs', 'g-io2', 'g-gateway', 'g-cacheaside'],
    abyss: ['g-shard', 'g-highcard', 'g-ondemand', 'g-query', 'g-gsi', 'g-project', 'g-paginate', 'g-strong', 'g-condition', 'g-transact', 'g-ttl', 'g-stream', 'g-s3ptr', 'g-hanasum'],
    cathedral: ['g-replica', 'g-writer', 'g-multiaz', 'g-proxy', 'g-pitr', 'g-search', 'g-engine', 'g-condition', 'g-stream', 'g-dax', 'g-hanasum'],
    regent: REWARDS
  };
  R3.cards = REWARDS;
  // A standalone chapter 3 starts with chapter 1's deck and the Mailroom's cards it would have won by now.
  R3.startDeck = () => (SD.starterDeck || []).filter((c, i) => i !== 0 && i !== 4).concat('dlq', 'idem', 'g-rightclass', 'g-query').filter(id => SD.cards[id]);

  // ---------- Enemies ----------
  const F = (o) => Object.assign({ ch: 3, raid: true, resist: {} }, o);
  Object.assign(SD.enemies, {
    // Floor 1, the Grain Floors
    'g-hoarder': F({ name: 'The Hoarder', short: 'Hoarder', cause: 'Everything kept in S3 Standard, forever', sev: 28, concept: 's3class', tier: 1, sprite: 'g-hoarder', flavor: 'He might need it. He never does.',
      symptom: 'Ten years of grain receipts in S3 Standard. Nobody has read one since the first month.',
      weak: { class: 'Move what nobody reads to Standard-IA or an archive class.', lifecycle: 'A lifecycle rule moves it down as it goes cold.' }, resist: { requester: 'Requester Pays changes who pays for downloads. Nobody downloads these.' },
      pattern: [{ t: 'read', n: 6 }, { t: 'write', n: 6 }, { t: 'burst', n: 7 }] }),
    'g-frostbite': F({ name: 'Frostbite', short: 'Frostbite', cause: 'Grain sealed in Deep Archive takes half a day to come back', sev: 28, concept: 's3class', tier: 1, sprite: 'g-frostbite', flavor: 'It\'s in there. It\'ll be out by morning.',
      symptom: 'The kitchen needs flour by noon. It\'s in S3 Glacier Deep Archive, and a Standard restore takes up to 12 hours.',
      weak: { class: 'Data you may need in minutes belongs in Glacier Instant Retrieval or an IA class, not Deep Archive.', lifecycle: 'Only send to Deep Archive what can wait days.' }, resist: { batch: 'Batching doesn\'t thaw anything faster.' },
      pattern: [{ t: 'read', n: 7 }, { t: 'read', n: 6 }, { t: 'escalate' }] }),
    'g-rot': F({ name: 'Rot', short: 'Rot', cause: 'A store with no lifecycle rule', sev: 26, concept: 's3class', tier: 1, sprite: 'g-rot', flavor: 'It grows. Quietly. Monthly.',
      symptom: 'Temporary export files from 2019, still there, still billed.',
      weak: { lifecycle: 'An expiration rule deletes what\'s past its use.', class: 'At least move it somewhere cheap.' }, resist: { batch: 'Fewer files rotting is still rot.' },
      pattern: [{ t: 'write', n: 6 }, { t: 'burst', n: 6 }, { t: 'write', n: 7 }] }),
    'g-thousand': F({ name: 'The Thousand Sacks', short: 'Thousand Sacks', cause: 'A harvest uploaded one grain at a time, charged per request', sev: 30, concept: 's3class', tier: 1, sprite: 'g-thousand', flavor: 'Each grain, its own PUT.',
      symptom: 'Fifty million 1 KB objects a day. The PUT charges are ten times the storage.',
      weak: { batch: 'Buffer the readings and write fewer, larger objects.' }, resist: { class: 'A cheaper class costs more per request, not less.', lifecycle: 'Moving tiny objects costs a transition request each.' },
      pattern: [{ t: 'burst', n: 7 }, { t: 'write', n: 6 }, { t: 'burst', n: 8 }] }),
    'g-minstay': F({ name: 'The Minimum Stay', short: 'Minimum Stay', cause: 'Billed for thirty days on grain moved after three', sev: 46, concept: 's3class', tier: 2, elite: true, sprite: 'g-minstay', flavor: 'Thirty days. It says so in the small print. Everything here does.',
      symptom: 'Weekly exports go to Standard-IA on Monday and are deleted on Thursday. Each is billed for 30 days.',
      weak: { class: 'Short-lived data stays in S3 Standard, which has no minimum duration.', lifecycle: 'Transition only what will stay at least 30 days.' }, resist: { requester: 'It isn\'t the downloads. It\'s the stay.' },
      pattern: [{ t: 'read', n: 9 }, { t: 'write', n: 10 }, { t: 'escalate' }, { t: 'burst', n: 10 }] }),
    'g-quartermaster': F({ name: 'The Quartermaster', short: 'Quartermaster', cause: 'Every store in the wrong class for how it is read', sev: 76, concept: 's3class', tier: 3, boss: true, sprite: 'g-quartermaster',
      flavor: 'He shifts the stores every turn. He has never once asked who eats from them.',
      symptom: 'Daily bread in Deep Archive, the founding seed in Standard, the winter stores nowhere at all. His stores shift class each turn.',
      weak: { class: 'Play the class that matches the access pattern, and his hits shrink.', lifecycle: 'A lifecycle rule follows the pattern for him.', batch: 'Fewer, larger sacks: fewer requests to bill.' }, resist: { file: 'Grain in sacks isn\'t a shared file system.', block: 'A barrel won\'t hold a granary.' },
      pattern: [{ t: 'read', n: 10 }, { t: 'write', n: 10 }, { t: 'burst', n: 12 }, { t: 'escalate', up: 3 }, { t: 'read', n: 11 }] }),
    // Floor 2, Sacks, Shelves and Barrels
    'g-sack': F({ name: 'The Sack', short: 'Sack', cause: 'Objects, by key, over HTTP', sev: 26, concept: 'storetype', tier: 1, sprite: 'g-sack', flavor: 'It isn\'t a disk. Stop mounting it.',
      symptom: 'A team tries to run a database on files in S3, rewriting a whole object for every row change.',
      weak: { class: 'Objects belong in S3, whole: put and get, by key.', block: 'A database wants a block volume.' }, resist: { file: 'S3 isn\'t a POSIX file system.' },
      pattern: [{ t: 'read', n: 6 }, { t: 'write', n: 7 }, { t: 'read', n: 6 }] }),
    'g-shelf': F({ name: 'The Shelf', short: 'Shelf', cause: 'Many servers need the same files at once', sev: 28, concept: 'storetype', tier: 1, sprite: 'g-shelf', flavor: 'Everyone reaches in. Nobody waits.',
      symptom: 'Web servers in three AZs each keep their own copy of the uploads, and they never match.',
      weak: { file: 'One EFS file system, mounted by all of them, in every AZ.' }, resist: { block: 'An EBS volume is one cart\'s barrel, in one AZ.' },
      pattern: [{ t: 'read', n: 7 }, { t: 'write', n: 6 }, { t: 'burst', n: 7 }] }),
    'g-barrel': F({ name: 'The Barrel', short: 'Barrel', cause: 'A block volume one cart holds at a time', sev: 28, concept: 'storetype', tier: 1, sprite: 'g-barrel', flavor: 'Bolted to one cart. Proud of it.',
      symptom: 'A self-managed database on EC2 needs low-latency block storage for its data files.',
      weak: { block: 'An EBS volume: gp3 for most, io2 when the IOPS must be guaranteed.', iops: 'Set the IOPS the database needs.' }, resist: { file: 'A database\'s data files want a block device, not NFS.' },
      pattern: [{ t: 'write', n: 7 }, { t: 'read', n: 6 }, { t: 'write', n: 7 }] }),
    'g-outerfarms': F({ name: 'The Outer Farms', short: 'Outer Farms', cause: 'A store that lives half outside the walls', sev: 30, concept: 'datamove', tier: 1, sprite: 'g-outerfarms', flavor: 'Half in the data centre, half in the cloud, all confused.',
      symptom: 'A farm\'s file server is full; its staff map a drive over SMB and won\'t change how they work.',
      weak: { gateway: 'An S3 File Gateway: the same share at the farm, with the files landing in S3.', datasync: 'Or move the harvest once, online, with DataSync.' }, resist: { block: 'A bigger local disk only delays it.' },
      pattern: [{ t: 'read', n: 6 }, { t: 'burst', n: 8 }, { t: 'write', n: 7 }] }),
    'g-hotbarrel': F({ name: 'The Hot Barrel', short: 'Hot Barrel', cause: 'A volume that needs its IOPS guaranteed', sev: 48, concept: 'storetype', tier: 2, elite: true, sprite: 'g-hotbarrel', flavor: 'Sixty-four thousand a second. Not sixty-three.',
      symptom: 'An order database stalls at peak: its gp2 volume ran out of burst credits.',
      weak: { iops: 'Provisioned IOPS (io2), or gp3 with the IOPS set, sized to the peak.', block: 'Keep it on block storage, and give it what it needs.' }, resist: { file: 'A shared file system won\'t fix one database\'s latency.', class: 'S3 storage classes don\'t apply to a volume.' },
      pattern: [{ t: 'write', n: 10 }, { t: 'burst', n: 11 }, { t: 'escalate' }, { t: 'write', n: 11 }] }),
    'g-keeper': F({ name: 'The Granary Keeper', short: 'Granary Keeper', cause: 'Four kinds of grain, one kind of store', sev: 80, concept: 'storetype', tier: 3, boss: true, sprite: 'g-keeper',
      flavor: 'He asks for the right store for four kinds of grain. He has asked every party that came down here. None of them knew.',
      symptom: 'Seed objects, a shared recipe book, the bakery\'s own database and the outer farms\' backups, all in one store.',
      weak: { class: 'Objects in S3, in the class that fits.', file: 'The shared book on EFS.', block: 'The database on EBS.', gateway: 'The farms through Storage Gateway.' }, resist: { requester: 'Who pays for downloads isn\'t his question.' },
      pattern: [{ t: 'read', n: 10 }, { t: 'write', n: 11 }, { t: 'burst', n: 12 }, { t: 'escalate', up: 3 }, { t: 'write', n: 12 }] }),
    // Floor 3, the Hot Chamber
    'g-hotkey': F({ name: 'The Hot Key', short: 'Hot Key', cause: 'Every write funnelled through one partition key', sev: 30, concept: 'ddbkey', tier: 1, sprite: 'g-hotkey', flavor: 'PK = "SAINT". All of it. Always.',
      symptom: 'Every ration write uses the same partition key, and that one partition throttles while the table sits idle.',
      weak: { shard: 'Add a suffix: the writes spread over ten partitions.', highcard: 'Key by each citizen, not by the Saint.' }, resist: { ondemand: 'On-demand can\'t lift one key past its own limit.', cache: 'A cache doesn\'t take writes.' },
      pattern: [{ t: 'hot', n: 7 }, { t: 'write', n: 7 }, { t: 'hot', n: 8 }] }),
    'g-ptexceeded': F({ name: 'ProvisionedThroughputExceeded', short: 'Throughput Exceeded', cause: 'More requests than the provisioned capacity', sev: 30, concept: 'ddbkey', tier: 1, sprite: 'g-ptexceeded', flavor: 'It throttles whoever plays most.',
      symptom: 'Short bursts above the provisioned write capacity return ProvisionedThroughputExceededException.',
      weak: { ondemand: 'On-demand mode follows the spikes.', shard: 'Spread the writes so no partition is the bottleneck.' }, resist: { strong: 'Stronger reads cost more capacity, not less.' },
      pattern: [{ t: 'burst', n: 8 }, { t: 'write', n: 7 }, { t: 'burst', n: 8 }] }),
    'g-burst': F({ name: 'The Burst', short: 'Burst', cause: 'Saved-up capacity spent in one go', sev: 28, concept: 'ddbkey', tier: 1, sprite: 'g-burst', flavor: 'It saved five minutes of capacity. It spends it in five seconds.',
      symptom: 'The table survives spikes for a while on burst capacity, then throttles hard.',
      weak: { ondemand: 'Let the table pay per request for spikes you can\'t predict.', highcard: 'Even traffic doesn\'t need to burst.' }, resist: { cache: 'The spike is writes.' },
      pattern: [{ t: 'read', n: 6 }, { t: 'burst', n: 9 }, { t: 'write', n: 6 }] }),
    'g-writeshard': F({ name: 'The Write Shard', short: 'Write Shard', cause: 'Split into ten with a suffix, and now nobody can find one', sev: 48, concept: 'ddbkey', tier: 2, elite: true, sprite: 'g-writeshard', flavor: 'SAINT#1 to SAINT#10. Which one is yours?',
      symptom: 'A random suffix spread the writes, but reading one ration now means ten GetItems.',
      weak: { highcard: 'A calculated suffix (a hash of the ID) tells the reader which shard to read.', query: 'Query each shard in parallel, and merge.' }, resist: { shard: 'More random shards make the reads worse.' },
      pattern: [{ t: 'hot', n: 9 }, { t: 'read', n: 10 }, { t: 'escalate' }, { t: 'write', n: 11 }] }),
    'g-singlesaint': F({ name: 'The Single Saint', short: 'Single Saint', cause: 'All its power from one partition', sev: 80, concept: 'ddbkey', tier: 3, boss: true, sprite: 'g-singlesaint',
      flavor: 'It shines. It shines because one girl is underneath it.',
      symptom: 'Three hundred years of writes on one key. The partition is at its limit every night, and the rest of the table is empty.',
      weak: { shard: 'Spread the key.', highcard: 'Everyone their own key: a day a year each.', dayayear: 'Spread across everyone, nobody gets throttled.' }, resist: { ondemand: 'Capacity mode doesn\'t move a hot key.', cache: 'Caching reads doesn\'t spread writes.' },
      pattern: [{ t: 'hot', n: 11 }, { t: 'write', n: 11 }, { t: 'hot', n: 12 }, { t: 'escalate', up: 3 }, { t: 'hot', n: 13 }] }),
    // Floor 4, the Index Caves
    'g-scan': F({ name: 'The Scan', short: 'Scan', cause: 'Reads every item, every time', sev: 30, concept: 'ddbindex', tier: 1, sprite: 'g-scan', flavor: 'It costs the team by the size of the table.',
      symptom: 'A dashboard runs a Scan of fifty million items every minute to find a few hundred.',
      weak: { query: 'Query by key, and pay only for what you read.', index: 'A GSI on the attribute makes it a Query.' }, resist: { project: 'A smaller projection still reads every item in a Scan.' },
      pattern: [{ t: 'scan', n: 8 }, { t: 'read', n: 6 }, { t: 'scan', n: 9 }] }),
    'g-filter': F({ name: 'The Filter', short: 'Filter', cause: 'Reads everything, then throws most of it away', sev: 28, concept: 'ddbindex', tier: 1, sprite: 'g-filter', flavor: 'Read ten thousand. Kept three. Billed ten thousand.',
      symptom: 'A Query with a FilterExpression returns three items and consumes the capacity of ten thousand.',
      weak: { index: 'Put the filtered attribute in a key, so the condition is a key condition.', query: 'A key condition narrows before the read; a filter, after.' }, resist: { paginate: 'Paging through waste is still waste.' },
      pattern: [{ t: 'scan', n: 7 }, { t: 'read', n: 7 }, { t: 'burst', n: 7 }] }),
    'g-lateindex': F({ name: 'The Late Index', short: 'Late Index', cause: 'A GSI that throttles and backs up the table\'s writes', sev: 30, concept: 'ddbindex', tier: 1, sprite: 'g-lateindex', flavor: 'Five write units. For a table that does five hundred.',
      symptom: 'The table has spare write capacity, yet PutItem throttles: its new GSI can\'t keep up.',
      weak: { gsi: 'Give the index as much write capacity as the table, or use on-demand.', ondemand: 'On-demand indexes scale with the table.' }, resist: { query: 'Reads aren\'t the problem.' },
      pattern: [{ t: 'write', n: 8 }, { t: 'write', n: 7 }, { t: 'escalate' }] }),
    'g-secondsort': F({ name: 'The Second Sort', short: 'Second Sort', cause: 'An LSI that was never made, because it had to exist when the table did', sev: 48, concept: 'ddbindex', tier: 2, elite: true, sprite: 'g-secondsort', flavor: 'It would have been so useful. It was never born.',
      symptom: 'The table needs one key\'s items by another sort key, with strongly consistent reads. LSIs can only be made with the table.',
      weak: { index: 'Recreate the table with the LSI, or use a GSI and accept eventual reads.', gsi: 'A GSI can be added any time; it just can\'t read strongly.' }, resist: { strong: 'A GSI won\'t do strong reads, whatever you set.' },
      pattern: [{ t: 'read', n: 10 }, { t: 'scan', n: 10 }, { t: 'escalate' }, { t: 'read', n: 11 }] }),
    'g-catalogue': F({ name: 'The Catalogue', short: 'Catalogue', cause: 'A new question every turn, and only a Scan to answer it', sev: 80, concept: 'ddbindex', tier: 3, boss: true, sprite: 'g-catalogue',
      flavor: 'It changes what it asks every turn. A Query with the right index lands; a Scan always costs.',
      symptom: 'The cathedral asks the Saints\' table six questions, and the table was keyed for one of them.',
      weak: { query: 'Model the table so every question is a Query.', index: 'An index per access pattern.', gsi: 'A GSI for the question nobody planned.', project: 'Project what the screen shows.' }, resist: { strong: 'Strong reads don\'t answer the wrong question.', cache: 'Caching a Scan only hides its cost.' },
      pattern: [{ t: 'scan', n: 11 }, { t: 'read', n: 11 }, { t: 'scan', n: 12 }, { t: 'escalate', up: 3 }, { t: 'scan', n: 13 }] }),
    // Floor 5, the Well
    'g-staleread': F({ name: 'Stale Read', short: 'Stale Read', cause: 'An eventually consistent read just after a write', sev: 28, concept: 'ddbwrite', tier: 1, sprite: 'g-staleread', flavor: 'It reads version six. Version seven landed a moment ago.',
      symptom: 'An order is saved, and the confirmation page, reading a moment later, says it doesn\'t exist.',
      weak: { strong: 'A strongly consistent read returns the latest write.', writer: 'Read your own write from where it was written.' }, resist: { cache: 'A cache is staler still.' },
      pattern: [{ t: 'read', n: 7 }, { t: 'read', n: 7 }, { t: 'burst', n: 7 }] }),
    'g-doublewriter': F({ name: 'The Double Writer', short: 'Double Writer', cause: 'Two clerks overwriting each other\'s work', sev: 30, concept: 'ddbwrite', tier: 1, sprite: 'g-doublewriter', flavor: 'Last write wins. Nobody else does.',
      symptom: 'Two clerks load the same record, both save, and the first clerk\'s change is silently lost.',
      weak: { condition: 'Save with a condition on the version number: the second save fails and reloads.', version: 'Optimistic locking: a version attribute that every write checks and bumps.', transact: 'A transaction with a condition.' }, resist: { strong: 'Reading strongly doesn\'t stop a later overwrite.' },
      pattern: [{ t: 'race', n: 7 }, { t: 'write', n: 7 }, { t: 'race', n: 8 }] }),
    'g-ghost400': F({ name: 'The 400 KB Ghost', short: '400 KB Ghost', cause: 'An item too big to store', sev: 28, concept: 'ddbstream', tier: 1, sprite: 'g-ghost400', flavor: 'Four hundred and twelve kilobytes. So close.',
      symptom: 'PutItem fails with ValidationException: the item is over the 400 KB limit.',
      weak: { s3pointer: 'Keep the big part in S3 and its key in the item.' }, resist: { ondemand: 'More capacity doesn\'t raise the item size limit.' },
      pattern: [{ t: 'write', n: 7 }, { t: 'burst', n: 7 }, { t: 'write', n: 7 }] }),
    'g-expiry': F({ name: 'Expiry', short: 'Expiry', cause: 'Items deleted by TTL in the background, not on the dot', sev: 46, concept: 'ddbstream', tier: 2, elite: true, sprite: 'g-expiry', flavor: 'It will come for them. Eventually. Within a few days.',
      symptom: 'Sessions marked to expire at midnight still turn up in queries at ten past.',
      weak: { ttl: 'TTL deletes in the background: filter out expired items in your reads too.', stream: 'TTL deletes appear in the stream, so you can archive them.' }, resist: { condition: 'A condition on writes doesn\'t hurry a TTL delete.' },
      pattern: [{ t: 'read', n: 9 }, { t: 'write', n: 10 }, { t: 'escalate' }, { t: 'burst', n: 10 }] }),
    'g-sinkhole': F({ name: 'The Sinkhole', short: 'Sinkhole', cause: 'An endless transaction of overwrites', sev: 82, concept: 'ddbwrite', tier: 3, boss: true, sprite: 'g-sinkhole',
      flavor: 'Every clerk writes, every write is lost, and the well gets deeper.',
      symptom: 'A balance moves between two items in two writes; one fails half the time, and concurrent writers overwrite each other.',
      weak: { condition: 'Conditional writes and a version attribute stop the overwrites.', transact: 'TransactWriteItems: both or neither, each with its condition.', version: 'Check the version you read.' }, resist: { strong: 'Reading strongly doesn\'t make two writes one.', ondemand: 'Capacity isn\'t the problem.' },
      pattern: [{ t: 'race', n: 11 }, { t: 'write', n: 11 }, { t: 'race', n: 12 }, { t: 'escalate', up: 3 }, { t: 'race', n: 13 }] }),
    // Floor 6, the Choir
    'g-replicalag': F({ name: 'Replica Lag', short: 'Replica Lag', cause: 'A choir a beat behind', sev: 32, concept: 'rdsaurora', tier: 1, sprite: 'g-replicalag', flavor: 'It sings what you sang a second ago.',
      symptom: 'Writes go to the writer, reads to a replica, and a user can\'t see the order they just placed.',
      weak: { writer: 'Read-your-own-write goes to the cluster endpoint.', strong: 'Where the latest matters, read from the writer.' }, resist: { replica: 'Another replica lags too.' },
      pattern: [{ t: 'read', n: 8 }, { t: 'read', n: 8 }, { t: 'burst', n: 8 }] }),
    'g-connstorm': F({ name: 'Connection Storm', short: 'Connection Storm', cause: 'A hundred functions each opening a connection', sev: 32, concept: 'rdsaurora', tier: 1, sprite: 'g-connstorm', flavor: 'Too many connections. It says so in the log, a hundred times.',
      symptom: 'During a rush, Lambda scales to hundreds of executions and the database refuses connections.',
      weak: { proxy: 'RDS Proxy pools the connections.' }, resist: { replica: 'Replicas don\'t pool connections.', multiaz: 'A standby doesn\'t take connections at all.' },
      pattern: [{ t: 'burst', n: 9 }, { t: 'write', n: 8 }, { t: 'burst', n: 9 }] }),
    'g-standby': F({ name: 'The Standby', short: 'Standby', cause: 'There for failover, and can\'t be read from', sev: 50, concept: 'rdsaurora', tier: 2, elite: true, sprite: 'g-standby', flavor: 'It waits. It is very good at waiting.',
      symptom: 'A team points its reports at the Multi-AZ standby. It isn\'t readable; they need a read replica.',
      weak: { replica: 'Reports go to a read replica.', multiaz: 'Keep the standby for failover.' }, resist: { writer: 'Sending reports to the writer is what slowed it down.' },
      pattern: [{ t: 'read', n: 10 }, { t: 'read', n: 11 }, { t: 'escalate' }, { t: 'burst', n: 12 }] }),
    'g-precentor': F({ name: 'The Precentor', short: 'Precentor', cause: 'One writer for the whole choir, and the choir lags', sev: 84, concept: 'rdsaurora', tier: 3, boss: true, sprite: 'g-precentor',
      flavor: 'He leads the choir. Every voice waits on his.',
      symptom: 'One writer takes every read and write; a failover breaks every connection; the replicas serve stale reads to the wrong requests.',
      weak: { replica: 'Reads that can lag go to replicas.', writer: 'Reads that can\'t, to the writer.', proxy: 'A proxy holds the connections through a failover.', multiaz: 'A standby takes over if he falls.' }, resist: { cache: 'Caching his voice makes it staler.' },
      pattern: [{ t: 'read', n: 11 }, { t: 'write', n: 12 }, { t: 'burst', n: 13 }, { t: 'escalate', up: 3 }, { t: 'write', n: 13 }] }),
    // Floor 7, the Burnt Library
    'g-grate': F({ name: 'The Grate', short: 'Grate', cause: 'Where the founding texts were burned', sev: 32, concept: 'rdsaurora', tier: 1, sprite: 'g-grate', flavor: 'Ash, and the smell of a decision.',
      symptom: 'Someone dropped the founding texts\' table at 14:05. Automated backups are on.',
      weak: { pitr: 'Restore to 14:04, as a new instance, and copy the texts back.' }, resist: { replica: 'The replicas dropped it too.', multiaz: 'The standby burned at the same moment.' },
      pattern: [{ t: 'write', n: 8 }, { t: 'burst', n: 9 }, { t: 'read', n: 8 }] }),
    'g-fulltext': F({ name: 'The Full-Text Ghost', short: 'Full-Text Ghost', cause: 'Only found by searching every word', sev: 32, concept: 'purpose', tier: 1, sprite: 'g-fulltext', flavor: 'LIKE \'%saint%\'. On every row. Forever.',
      symptom: 'Searching descriptions with LIKE scans every row and ranks nothing.',
      weak: { search: 'An OpenSearch index: every word, ranked, typos forgiven.', engine: 'Search wants a search engine.' }, resist: { index: 'A B-tree index doesn\'t help a leading wildcard.' },
      pattern: [{ t: 'scan', n: 9 }, { t: 'read', n: 8 }, { t: 'scan', n: 9 }] }),
    'g-wrongengine': F({ name: 'The Wrong Engine', short: 'Wrong Engine', cause: 'A graph of Saints\' families stored as rows', sev: 50, concept: 'purpose', tier: 2, elite: true, sprite: 'g-wrongengine', flavor: 'Seven joins to find a cousin.',
      symptom: 'Finding who is related to whom, four hops out, takes a join per hop and minutes per question.',
      weak: { engine: 'A graph database (Neptune) follows the links directly.', graph: 'Store relationships as edges.' }, resist: { index: 'More indexes don\'t make a tree out of rows.', replica: 'More copies of the wrong shape.' },
      pattern: [{ t: 'scan', n: 10 }, { t: 'read', n: 11 }, { t: 'escalate' }, { t: 'scan', n: 12 }] }),
    'g-archivist': F({ name: 'The Archivist', short: 'Archivist', cause: 'The texts burned, the catalogue in the wrong engine, and no plan to move it', sev: 86, concept: 'purpose', tier: 3, boss: true, sprite: 'g-archivist',
      flavor: 'He kept every record. He kept them in the wrong place.',
      symptom: 'The library\'s families in rows, its words in LIKE queries, its burned texts gone, and a migration nobody has started.',
      weak: { pitr: 'Point-in-time restore to the day before.', engine: 'Each record in the engine its questions need.', search: 'Full text in OpenSearch.', gateway: 'Move it with DMS, converting the schema with SCT.' }, resist: { cache: 'You can\'t cache your way out of the wrong engine.' },
      pattern: [{ t: 'scan', n: 12 }, { t: 'write', n: 12 }, { t: 'burst', n: 13 }, { t: 'escalate', up: 3 }, { t: 'scan', n: 13 }] }),
    // Floor 8, the Gallery Stair
    'g-twelfthbell': F({ name: 'The Twelfth Bell', short: 'Twelfth Bell', cause: 'The Drawing, rung on the hour, every night', sev: 52, concept: 'ddbwrite', tier: 2, elite: true, sprite: 'g-twelfthbell', flavor: 'Twelve strokes. Twelve girls.',
      symptom: 'The Drawing order is written again every night with no condition, over whatever was there.',
      weak: { condition: 'A condition on the version: the night\'s write fails if consent changed.', version: 'Check the version first.' }, resist: { strong: 'Reading strongly doesn\'t stop the bell.' },
      pattern: [{ t: 'race', n: 11 }, { t: 'burst', n: 11 }, { t: 'escalate' }, { t: 'race', n: 12 }] }),
    'g-shadow': F({ name: 'Sir Aurelian\'s Shadow', short: 'Aurelian\'s Shadow', cause: 'The Hero\'s Drawing, without the Hero', sev: 86, concept: 'ddbwrite', tier: 3, boss: true, sprite: 'g-shadow',
      flavor: 'Aurelian refused tonight. His shadow didn\'t.',
      symptom: 'Version 7 of Hana\'s consent record says no. Version 9, the Drawing order, was written over it with no condition on the write.',
      weak: { condition: 'A conditional write on the version number would have stopped version 9.', version: 'Optimistic locking: the write names the version it expects.', transact: 'A transaction that checks consent before the Drawing.' }, resist: { replica: 'The shadow doesn\'t care who reads it.', cache: 'Nothing to cache: it writes.' },
      pattern: [{ t: 'race', n: 12 }, { t: 'write', n: 12 }, { t: 'race', n: 13 }, { t: 'escalate', up: 3 }, { t: 'burst', n: 14 }] }),
    // Floor 9, the Gallery
    'g-selvaria': F({ name: 'Princess Selvaria', short: 'Selvaria', cause: 'All her power drawn through the twelfth Saint: one hot partition', sev: 92, concept: 'ddbkey', tier: 3, boss: true, sprite: 'g-selvaria',
      flavor: 'She denies nothing. She explains.',
      symptom: 'Every hit the party lands goes through Noor\'s partition first. One key carries the whole city.',
      weak: { dayayear: 'A day a year, from everyone: the hit spread across the whole key space.', shard: 'Spread the key.', highcard: 'Every citizen their own key.', condition: 'The consent record\'s version, checked.' },
      resist: { ondemand: 'Capacity mode doesn\'t cool a hot key.', cache: 'You can\'t cache your way out of a hot partition.', strong: 'Reading her more carefully changes nothing.' },
      pattern: [{ t: 'hot', n: 12 }, { t: 'hot', n: 12 }, { t: 'burst', n: 13 }, { t: 'escalate', up: 3 }, { t: 'hot', n: 14 }] }),
    'g-noorpart': F({ name: 'Noor\'s Partition', short: 'Noor', cause: 'The twelfth Saint\'s key, taking everyone\'s load', sev: 30, concept: 'ddbkey', tier: 1, add: true, sprite: 'g-noorpart', flavor: 'She smiles anyway. That\'s what Saints do.',
      symptom: 'One partition key, NOOR, takes every write the city makes.',
      weak: { dayayear: 'Spread across everyone, nobody gets throttled.', shard: 'Take the load off one key.', highcard: 'Give the city its own keys.' }, resist: { ondemand: 'More capacity, same girl.' },
      pattern: [{ t: 'hot', n: 6 }, { t: 'read', n: 5 }] }),
    'g-citizen': F({ name: 'A Citizen of Halcyon', short: 'Citizen', cause: 'A day a year that was never asked for', sev: 24, concept: 'ddbkey', tier: 1, add: true, sprite: 'g-citizen', flavor: 'Part of the key space, if anyone asked.',
      symptom: 'A hundred thousand keys that never take a write.',
      weak: { dayayear: 'Asked, at last.', highcard: 'A key of their own.' }, resist: {},
      pattern: [{ t: 'read', n: 5 }, { t: 'write', n: 5 }] }),
    // The reckoning
    'g-backlog': F({ name: 'The Prayer Backlog', short: 'Backlog', cause: 'Three hundred and sixty-five copies of one prayer, never delivered', sev: 86, concept: 'sqs', tier: 3, boss: true, sprite: 'g-backlog',
      flavor: 'One a night, for a year. Every one of them says the same thing.',
      symptom: 'The same message, redelivered and never deleted, in a queue nobody drains.',
      weak: { dlq: 'Park the failures where someone reads them.', idem: 'A repeat should be a no-op.', partial: 'Report which ones failed; don\'t retry the lot.', scale: 'More consumers drain it faster.' }, resist: { cache: 'A cached prayer is still undelivered.', visibility: 'Hiding it longer doesn\'t deliver it.' },
      pattern: [{ t: 'retry', n: 12 }, { t: 'burst', n: 12 }, { t: 'retry', n: 13 }, { t: 'escalate', up: 3 }, { t: 'burst', n: 14 }] }),
    'g-winter': F({ name: 'The Winter Sum', short: 'Winter Sum', cause: 'Saint\'s Day traffic on a table sized for an ordinary night', sev: 86, concept: 'ddbkey', tier: 3, boss: true, sprite: 'g-winter',
      flavor: 'Selvaria\'s forecast for the winter, written on the wall in her clear hand. It is correct.',
      symptom: 'A spike ten times the usual load, on one key, against provisioned capacity.',
      weak: { ondemand: 'Pay per request for the spike nobody can size.', shard: 'Spread the key.', highcard: 'Everyone\'s day, not one girl\'s.', dayayear: 'A day a year, from everyone.' }, resist: { strong: 'Strong reads cost twice the capacity.', scan: 'Reading everything makes it worse.' },
      pattern: [{ t: 'hot', n: 12 }, { t: 'burst', n: 13 }, { t: 'hot', n: 13 }, { t: 'escalate', up: 3 }, { t: 'burst', n: 15 }] }),
    'g-ledger': F({ name: 'The Old Ledger', short: 'Old Ledger', cause: 'Three hundred years of records on one key, and queues nobody drained', sev: 88, concept: 'ddbindex', tier: 3, boss: true, sprite: 'g-ledger',
      flavor: 'Selvaria\'s own books. Every sum in them is right.',
      symptom: 'The vault\'s ledger is one partition, read by Scan, fed by a queue whose failures nobody looks at.',
      weak: { query: 'Query by key, not Scan.', index: 'Index it for the questions the city asks.', shard: 'Spread the key.', dlq: 'Send the failures somewhere someone reads.' }, resist: { cache: 'Caching the old sums keeps them old.' },
      pattern: [{ t: 'scan', n: 12 }, { t: 'retry', n: 12 }, { t: 'hot', n: 13 }, { t: 'escalate', up: 3 }, { t: 'scan', n: 14 }] }),
    'g-regent': F({ name: 'Selvaria, the Regent\'s Sum', short: 'Selvaria', cause: 'She would do it again, for the math', sev: 96, concept: 'ddbkey', tier: 3, boss: true, sprite: 'g-selvaria',
      flavor: 'Still honest. Still sure.',
      symptom: 'The last of the old records, and the woman who kept them, drawing on one key one last time.',
      weak: { dayayear: 'Make her do the sum in front of the city.', shard: 'Spread it.', highcard: 'Everyone their own key.', condition: 'Every write checked.', idem: 'Every redelivered order done once.' }, resist: { ondemand: 'Capacity doesn\'t cool a hot key.', cache: 'No.' },
      pattern: [{ t: 'hot', n: 13 }, { t: 'retry', n: 13 }, { t: 'burst', n: 14 }, { t: 'escalate', up: 3 }, { t: 'hot', n: 15 }] })
  });

  // ---------- Field Notes and Sorts ----------
  // Kyu's runbook pages 4 and 5 are worked examples; from a floor's `fade` row on, the last steps are yours.
  Object.assign(SD.fieldNotes, {
    'g-classes': { title: 'Kyu\'s page 4: a store for every grain', c: 's3class',
      ev: 'Bread (read daily)          -> S3 Standard\nWinter stores (read monthly)  -> S3 Standard-IA\nSeed vault (read yearly, now) -> Glacier Instant Retrieval\nFounding grain (never, legal) -> Glacier Deep Archive',
      steps: ['Ask how often the grain is read, and how fast it must come back.', 'Daily reads: Standard. No minimum stay, no fee per read.', 'Monthly: Standard-IA. Cheaper to keep, a fee per GB read, and at least 30 days billed.',
        'Yearly but needed at once: Glacier Instant Retrieval, read in milliseconds, 90 days minimum.', 'Kept for the law and never read: Deep Archive, restored in up to 12 hours (Standard) or 48 (Bulk).', 'Then a lifecycle rule moves each sack down the list as it cools, and expires it at the end.'] },
    'g-mindur': { title: 'The minimum stay', c: 's3class',
      ev: 'Standard-IA: 30 days   Glacier Instant: 90 days   Glacier Flexible: 90 days   Deep Archive: 180 days',
      steps: ['Every class below Standard bills a minimum number of days.', 'Delete or move an object early, and you pay for the rest of its minimum.', 'So grain that lives three days stays in Standard.', 'IA classes also bill each object as at least 128 KB: tiny objects belong elsewhere.'] },
    'g-ofb': { title: 'Sacks, shelves and barrels', c: 'storetype', steps: ['Object storage (S3): whole objects by key, over HTTP, without limit. Not a disk.', 'File storage (EFS, FSx): a shared file system many machines mount at once.',
      'EFS is NFS for Linux, across AZs, and grows by itself. FSx brings Windows (SMB, AD), Lustre (HPC, linked to S3), NetApp ONTAP or OpenZFS.', 'Block storage (EBS): a virtual disk for one instance, in one AZ.',
      'gp3 for most volumes, io2 when IOPS must be guaranteed, st1 for big sequential reads, sc1 for cold data.'] },
    'g-movers': { title: 'Bringing in the outer farms', c: 'datamove', steps: ['Keep the farm\'s own tools: Storage Gateway. An S3 File Gateway turns NFS or SMB shares into S3 objects.', 'Volume Gateway serves iSCSI disks: cached (most in AWS) or stored (all on site, snapshots in AWS).',
      'Tape Gateway pretends to be a tape library for old backup software.', 'Move a harvest once, online: DataSync, with checks and schedules.', 'Move a database while it\'s in use: DMS, and the Schema Conversion Tool if the engine changes.'] },
    'g-pkey': { title: 'Kyu\'s page 5: choosing a partition key', c: 'ddbkey',
      ev: 'Ration ledger: 100,000 citizens, one write each per day, read by citizen.',
      steps: ['List how the table is read and written: here, by citizen.', 'A key with many values (CitizenId) spreads writes; a key with few (City, or the Saint) piles them up.', 'Each partition key gets at most about 1,000 writes a second, however much the table has.',
        'If one value must stay hot, shard it: KEY#1 to KEY#10. Random spreads writes; calculated lets a reader find the item.', 'So the ledger\'s key is CitizenId, and nobody is throttled.'] },
    'g-rcu': { title: 'Counting capacity', c: 'ddbkey', steps: ['A read unit is one strongly consistent read per second of an item up to 4 KB.', 'An eventually consistent read costs half; a transactional read, double.',
      'A write unit is one write per second of up to 1 KB; a transactional write, double.', 'Round each item up: a 9 KB strong read is 3 units, eventual 1.5.', 'Steady traffic is cheapest provisioned with auto scaling; spikes you can\'t predict, on-demand.'] },
    'g-gsilsi': { title: 'Two kinds of index', c: 'ddbindex', steps: ['A GSI has its own partition and sort key, and its own throughput.', 'It can be added or removed any time, and its reads are eventually consistent.',
      'A LSI keeps the table\'s partition key with a different sort key, and supports strong reads.', 'A LSI must be created with the table; it can\'t be added later.', 'Either one copies only the attributes you project.'] },
    'g-queryscan': { title: 'Query or Scan', c: 'ddbindex',
      ev: 'Query: KeyConditionExpression "SaintId = :s AND begins_with(SK, :d)"\nScan: FilterExpression "Status = :open"',
      steps: ['A Query reads one partition key\'s items, narrowed by the sort key, and you pay for what it read.', 'A Scan reads every item in the table.', 'A filter expression runs after the read: the items it drops were still paid for.',
        'Results come one page at a time: pass LastEvaluatedKey back as ExclusiveStartKey.', 'If a question needs a Scan, it needs an index.'] },
    'g-optlock': { title: 'Two clerks, one record', c: 'ddbwrite',
      ev: 'UpdateItem ... ConditionExpression "Version = :v"  UpdateExpression "SET ... , Version = :v + 1"',
      steps: ['Each clerk reads the record and its version: 7.', 'The first saves with the condition Version = 7, and bumps it to 8.', 'The second also says Version = 7. It\'s 8 now: ConditionalCheckFailedException.',
        'The second clerk reloads and tries again. Nothing is lost.', 'For two items at once, TransactWriteItems: every condition holds, or nothing is written.'] },
    'g-ledger': { title: 'The ledger\'s memory', c: 'ddbstream',
      ev: 'StreamViewType: NEW_AND_OLD_IMAGES   (also KEYS_ONLY, NEW_IMAGE, OLD_IMAGE)',
      steps: ['A DynamoDB stream records every change to an item, in order, for 24 hours.', 'Its view type decides what each record holds.', 'NEW_AND_OLD_IMAGES keeps the item as it was before the change and after it.',
        'A record only exists if the stream was on when the change happened.', 'A Lambda function reads it through an event source mapping, and can filter for the changes it wants.'] },
    'g-ttl': { title: 'Expiry', c: 'ddbstream', steps: ['TTL reads a Number attribute: the expiry time in epoch seconds.', 'After that time, DynamoDB deletes the item in the background, typically within a few days.',
      'The deletes use no write capacity.', 'Until then the item can still be read, so filter expired items out.', 'Each TTL delete appears in the stream, so it can be archived.'] },
    'g-replicas': { title: 'The choir and the cantor', c: 'rdsaurora', steps: ['Multi-AZ keeps a standby in another AZ, updated synchronously, for failover. It takes no reads.', 'Read replicas take reads, updated asynchronously, so they lag.',
      'Aurora: the cluster endpoint always points at the writer; the reader endpoint spreads over the replicas.', 'Reads that must see your own write go to the writer.', 'Aurora Serverless v2 scales capacity up and down with the load.'] },
    'g-proxy': { title: 'A hundred functions, one door', c: 'rdsaurora', steps: ['Each Lambda execution may open its own connection.', 'A rush scales to hundreds of executions, and the database runs out of connections.',
      'RDS Proxy keeps a pool of connections and shares them out.', 'It can read the credentials from Secrets Manager and let functions sign in with IAM.', 'Through a failover, it holds the clients while the new writer takes over.'] },
    'g-pitr': { title: 'Restoring the founding texts', c: 'rdsaurora', steps: ['Automated backups keep daily snapshots and the transaction logs.', 'Point-in-time restore picks any second in the retention period, up to about five minutes ago.',
      'It always restores to a new DB instance, with a new endpoint.', 'Copy the texts back, or move the app to the new instance.', 'A replica or a standby can\'t help: they burned with the original.'] },
    'g-engines': { title: 'A shelf for every question', c: 'purpose', steps: ['Joins and transactions: relational, RDS or Aurora.', 'One key, any scale, milliseconds: DynamoDB.', 'Families and links: a graph, Neptune.',
      'Every word, ranked: OpenSearch.', 'Readings over time: Timestream. Big reports: Redshift.', 'Moving between them: DMS, with the Schema Conversion Tool when the engine changes.'] },
    'g-alias': { title: 'live and test', c: 'lambdaver',
      ev: 'live -> 3        test -> 4        $LATEST (editable)',
      steps: ['Publish freezes $LATEST as a numbered version: 4.', 'Point the test alias at 4, and test it.', 'Move live to 4, or send it a share first with AdditionalVersionWeights.',
        'Callers name the alias, never a number, so nothing else changes.', 'In SAM, AutoPublishAlias does it on each deploy, and DeploymentPreference shifts the traffic.'] }
  });
  // Sorts: five requests or choices; Allowed means it works, Denied that it fails, throttles or costs.
  Object.assign(SD.policySorts, {
    'g-classes': { title: 'The Quartermaster\'s stores', c: 's3class',
      ev: 'Allowed: the class fits how the grain is used. Denied: it costs more than it should, or comes back too slowly.',
      reqs: [
        { t: 'Daily bread in S3 Standard', ok: true, why: 'Read every day: Standard has no retrieval fee and no minimum stay.' },
        { t: 'Weekly exports, deleted after 3 days, in Standard-IA', ok: false, why: 'Standard-IA bills 30 days minimum: three days costs thirty.' },
        { t: 'Legal records read once a decade in Glacier Deep Archive', ok: true, why: 'Cheapest storage, and a restore of hours is fine.' },
        { t: 'Menu photos needed in milliseconds, read yearly, in Glacier Flexible Retrieval', ok: false, why: 'Flexible Retrieval needs a restore first. Glacier Instant Retrieval reads in milliseconds.' },
        { t: 'Unknown, changing access in Intelligent-Tiering', ok: true, why: 'It moves objects between tiers by their access, with no retrieval fees.' }] },
    'g-stores': { title: 'The Granary Keeper\'s four grains', c: 'storetype',
      ev: 'Allowed: the right store for the job. Denied: the wrong kind of storage.',
      reqs: [
        { t: 'Shared recipe files read and written by twenty Linux servers in three AZs, on EFS', ok: true, why: 'EFS is a shared NFS file system across AZs.' },
        { t: 'A self-managed database\'s data files on S3', ok: false, why: 'S3 is object storage; a database wants a block volume (EBS).' },
        { t: 'A Windows share joined to Active Directory on FSx for Windows File Server', ok: true, why: 'SMB and AD, managed.' },
        { t: 'One EBS volume mounted by servers in two AZs', ok: false, why: 'An EBS volume lives in one AZ. Shared files across AZs is EFS.' },
        { t: 'An HPC job reading S3 data at very high throughput through FSx for Lustre', ok: true, why: 'Lustre is built for it, and links to the bucket.' }] },
    'g-throttle': { title: 'The ration ledger at dusk', c: 'ddbkey',
      ev: 'Table: 4,000 WCU provisioned, plenty spare. Each partition key: about 1,000 writes a second at most.\nAllowed: the writes get through. Denied: they throttle.',
      reqs: [
        { t: '3,000 writes a second, all with partition key SAINT', ok: false, why: 'One key, three times its limit: throttled, whatever the table has.' },
        { t: '3,000 writes a second spread over 100,000 CitizenIds', ok: true, why: 'Thousands of keys, each well under its limit.' },
        { t: '3,000 writes a second to SAINT#1 to SAINT#10, a random suffix each', ok: true, why: 'About 300 a key: under the limit.' },
        { t: '3,000 writes a second to SAINT, after switching the table to on-demand', ok: false, why: 'On-demand changes the table\'s capacity, not one key\'s limit.' },
        { t: '500 writes a second to SAINT', ok: true, why: 'Under one key\'s limit.' }] },
    'g-register': { title: 'The Saints\' Register', c: 'ddbindex',
      ev: 'Table Saints: PK SaintId, SK Night. GSI ByStatus: PK Status, SK Crowned.\nAllowed: it can be a Query. Denied: it needs a Scan.',
      reqs: [
        { t: 'Every night of Saint 12, in order', ok: true, why: 'PK SaintId = 12, sorted by Night.' },
        { t: 'Every Saint with Status BURNT_OUT', ok: true, why: 'The ByStatus GSI: Status = BURNT_OUT.' },
        { t: 'Every Saint whose name contains "Hana"', ok: false, why: 'contains() can only filter, after a Scan. Search needs a search index.' },
        { t: 'Saint 7\'s nights in her first year', ok: true, why: 'PK SaintId = 7, SK BETWEEN two dates.' },
        { t: 'Every Saint crowned by Selvaria herself', ok: false, why: 'No key or index holds CrownedBy. As modelled, that\'s a Scan.' }] },
    'g-writes': { title: 'Two clerks at the Well', c: 'ddbwrite',
      ev: 'Item: Ration#7, Version = 7. Each write has ConditionExpression "Version = :v".\nAllowed: the write lands. Denied: ConditionalCheckFailedException.',
      reqs: [
        { t: 'Clerk A writes with :v = 7 (and bumps it to 8)', ok: true, why: 'The version matches.' },
        { t: 'Clerk B, who also read version 7, writes with :v = 7 next', ok: false, why: 'It\'s version 8 now. Clerk B reloads.' },
        { t: 'Clerk B reloads and writes with :v = 8', ok: true, why: 'Matches again.' },
        { t: 'A PutItem with no condition at all', ok: true, why: 'It lands, over whatever was there. That\'s the danger.' },
        { t: 'A create with attribute_not_exists(PK) for Ration#7', ok: false, why: 'The item exists, so a create-only write fails.' }] },
    'g-reads': { title: 'Who hears the latest verse', c: 'rdsaurora',
      ev: 'Aurora: one writer, two replicas (lag ~20 ms). A write has just landed.\nAllowed: the read sees it. Denied: it may not.',
      reqs: [
        { t: 'A read through the cluster endpoint, right after', ok: true, why: 'The cluster endpoint is the writer.' },
        { t: 'A read through the reader endpoint, right after', ok: false, why: 'A replica may be a beat behind.' },
        { t: 'A read from the Multi-AZ standby of an RDS instance', ok: false, why: 'The standby of a Multi-AZ DB instance serves no reads.' },
        { t: 'A read through the reader endpoint, a minute later', ok: true, why: 'Lag is usually milliseconds; a minute on, it has caught up.' },
        { t: 'A read through RDS Proxy\'s read/write endpoint, right after', ok: true, why: 'It routes to the writer.' }] }
  });

  // ---------- Events ----------
  const askFx = (c, right, wrong) => ({ ask: { c, right, wrong: wrong || { sla: -6 } } });
  Object.assign(SD.expeditionEvents, {
    'g-kyu4': { id: 'g-kyu4', title: 'Kyu\'s Page 4', who: null, text: 'A page of Kyu\'s runbook pinned to a sack: storage classes, worked out in her small, furious hand. The last line is smudged.',
      choices: [{ label: 'Finish the page', out: 'Right: each of you takes a Right Storage Class card. Wrong: the sack splits, 6 SLA.', fx: askFx('s3class', { card: 'g-rightclass' }) },
        { label: 'Pocket it for later', out: 'Kyu would be cross. Each of you gains 10 bits.', fx: { bits: 10 } }] },
    'g-toll': { id: 'g-toll', title: 'The Merchant\'s Toll', who: null, text: 'A merchant carts grain out of the stores on the city\'s coin. "Toll? Never heard of it."',
      choices: [{ label: 'Make him pay for the carting', out: 'Right: Requester Pays, and 20 bits each. Wrong: he talks his way past, 6 SLA.', fx: askFx('s3class', { bits: 20 }) },
        { label: 'Wave him through', out: 'The stores pay for his cart. The team loses 4 SLA.', fx: { sla: -4 } }] },
    'g-pantry': { id: 'g-pantry', title: 'Wen\'s Pantry', who: null, text: 'Warm bread, somewhere down the hall, and a shelf of whatever was asked for last. Someone is humming 1987\'s hits.',
      choices: [{ label: 'Ask what she keeps, and why', out: 'Right: she feeds the team, 14 SLA. Wrong: stale buns, 4 SLA.', fx: askFx('caching', { sla: 14 }, { sla: -4 }) },
        { label: 'Take a bun and go', out: 'The team recovers 6 SLA.', fx: { sla: 6 } }] },
    'g-farmcart': { id: 'g-farmcart', title: 'A Cart from the Outer Farms', who: null, text: 'A cart of grain from beyond the walls, its driver lost: the farm\'s file server is full and its staff won\'t change their shares.',
      choices: [{ label: 'Show him the way in', out: 'Right: each of you takes a Storage Gateway card. Wrong: the cart tips, 6 SLA.', fx: askFx('datamove', { card: 'g-gateway' }) },
        { label: 'Buy a sack off him (15 bits)', out: 'Each of you pays 15 bits and removes a card you don\'t need.', fx: { cost: 15, remove: 1 } }] },
    'g-kyu5': { id: 'g-kyu5', title: 'Kyu\'s Page 5', who: null, text: 'Another page, half burnt: choosing a partition key. The worked example stops a step short.',
      choices: [{ label: 'Finish it', out: 'Right: each of you takes a High-Cardinality Key. Wrong: 6 SLA.', fx: askFx('ddbkey', { card: 'g-highcard' }) },
        { label: 'Leave it for whoever comes next', out: 'Someone will need it. Each of you gains 10 bits.', fx: { bits: 10 } }] },
    'g-register': { id: 'g-register', title: 'The Saints\' Register', who: null, text: 'The cathedral\'s register of every Saint, scratched into the cave wall, keyed by nobody knows what.',
      choices: [{ label: 'Model it so every question is a Query', out: 'Right: one of you refactors a card. Wrong: a Scan of the whole wall, 6 SLA.', fx: askFx('ddbindex', { upgrade: 1, who: 'one' }) },
        { label: 'Read the whole wall', out: 'It takes all night. The team loses 5 SLA, and each of you gains 15 bits for the names.', fx: { sla: -5, bits: 15 } }] },
    'g-ledgermem': { id: 'g-ledgermem', title: 'The Ledger\'s Memory', who: null, text: 'A well that echoes every change, before and after, for exactly one day.',
      choices: [{ label: 'Listen to what it kept', out: 'Right: each of you takes a New and Old Images card. Wrong: the echo fades, 6 SLA.', fx: askFx('ddbstream', { card: 'g-stream' }) },
        { label: 'Drink from it', out: 'Cold and clear. The team recovers 8 SLA.', fx: { sla: 8 } }] },
    'g-saint7': { id: 'g-saint7', title: 'A Burnt-Out Candle', who: null, text: 'Seven candles on a ledge, one still warm. A note: "Insult it until it makes a mistake. Love, Seven."',
      choices: [{ label: 'Insult the dark', out: 'It makes a mistake. Each of you picks an uncommon card.', fx: { card: 'uncommon' } },
        { label: 'Light the candle again', out: 'The team recovers 10 SLA.', fx: { sla: 10 } }] },
    'g-choir': { id: 'g-choir', title: 'The Choir Loft', who: null, text: 'The choir sings a beat behind the cantor, and the congregation sings whichever it heard.',
      choices: [{ label: 'Work out who to listen to', out: 'Right: each of you takes Ask the Writer. Wrong: you sing the wrong verse, 6 SLA.', fx: askFx('rdsaurora', { card: 'g-writer' }) },
        { label: 'Sing along anyway', out: 'Badly. Each of you gains 10 bits from the collection plate.', fx: { bits: 10 } }] },
    'g-founding': { id: 'g-founding', title: 'The Founding Grate', who: null, text: 'The grate where the founding texts were burned. The cathedral\'s backups are still running, every five minutes, faithfully.',
      choices: [{ label: 'Restore them', out: 'Right: one of you refactors a card. Wrong: you restore over the wrong day, 6 SLA.', fx: askFx('rdsaurora', { upgrade: 1, who: 'one' }) },
        { label: 'Sift the ash for pages', out: 'Each of you gains 15 bits.', fx: { bits: 15 } }] },
    'g-engines': { id: 'g-engines', title: 'The Catalogue Room', who: null, text: 'A family tree of every Saint, stored as a stack of ledgers. Someone has started to draw lines between them by hand.',
      choices: [{ label: 'Find each its proper engine', out: 'Right: each of you takes a Purpose-Built Engine. Wrong: 6 SLA.', fx: askFx('purpose', { card: 'g-engine' }) },
        { label: 'Leave the lines', out: 'Each of you gains 10 bits.', fx: { bits: 10 } }] },
    'g-names': { id: 'g-names', title: 'The Gauntlet\'s Names', who: null, text: 'A gauntlet left on a step, eleven names scratched inside it, and a twelfth begun: N, O.',
      choices: [{ label: 'Leave it where he\'ll find it', out: 'The team recovers 12 SLA, and nobody speaks for a while.', fx: { sla: 12 } },
        { label: 'Read the versions on the consent records beside it', out: 'Right: each of you takes a Conditional Write. Wrong: 6 SLA.', fx: askFx('ddbwrite', { card: 'g-condition' }) }] },
    'g-freyagift': { id: 'g-freyagift', title: 'A Warm Jar', who: 'freya', per: true, text: 'A jar of gold light on the stair, warm to the touch. A tag: "For the climb, love. Free. xx F."',
      choices: [{ label: 'Take it', out: 'Warmth floods back: the team recovers 20 SLA. Something heavy goes into your deck too.', fx: { sla: 20, curse: 'st-techdebt2' } },
        { label: 'Leave it', out: '"Suit yourself, love."', fx: {} }] },
    'g-echo': { id: 'g-echo', title: 'An Echo from the Mailroom', who: null, text: 'A dead letter, blown all the way up from floor 7. It has been redelivered four times.',
      choices: [{ label: 'Make sure it\'s handled once', out: 'Right: each of you gains 20 bits. Wrong: it comes round again, 6 SLA.', fx: askFx('lambdasqs', { bits: 20 }) },
        { label: 'Put it in the dead-letter queue', out: 'Someone will read it. The team recovers 6 SLA.', fx: { sla: 6 } }] }
  });

  // ---------- The expeditions ----------
  // Their difficulty: the band's curse (The Drinking Barrier, lifted by Hana's Sum) puts 40% on every hit.
  // Balance (Ladi, 2026-10-21: each expedition harder than the one before, about 85% clean clears over the chapter):
  // dmg was 0.62, 0.85, 0.88 and 0.9, and the Abyss's sev 0.85. The Cold Stores 0.66 and the Abyss 1.05 (sev 0.9),
  // which had been the easiest; the Cathedral 0.82, the Regent's Sum 1, the last and hardest.
  const barrier = () => (dev('sum') ? 1 : 1.4);
  const xp = (id, base, o) => Object.assign({ id, who: ORDER, opens: () => R3.active === id, sev: base.sev,
    get dmg() { return Math.min(2, base.dmg * barrier()); } }, o);
  const camp = { title: 'A Warm Corner', text: 'A corner out of the cold, with a stove somebody left lit. Sit for a minute, or use the bench to tune one of your cards. Each of you chooses one.' };
  const cafe = { title: 'Cache Café (pop-up)', who: null, name: 'The pop-up café', text: 'A trestle table with a hand-painted sign: CACHE CAFÉ. Keepsakes on rank shelves, prices in chalk.' };
  const floor = (o) => Object.assign({ map: '3' }, o);
  SD.expeditions = (SD.expeditions || []).concat([
    xp('cold', { sev: 0.8, dmg: 0.66 }, { name: 'The Cold Stores', blurb: 'Floors 22 to 26: the Granaries, where Freya keeps everything she owns. Two floors of grain kept wrong.', back: 'Back up to Halcyon', cafe, camp,
      tapeLine: [{ who: 'mate1', text: 'Up. Same fight, and now we know how it hits.' }],
      floors: [
        floor({ name: 'The Grain Floors', gate: 'THE COLD STORES · THE GRAIN FLOORS', beat: 'Every sack in the wrong room.', boss: 'g-quartermaster', bossTitle: 'The Quartermaster', fade: 5,
          plan: [['fight', 'notes', 'fight'], ['notes', 'fight', 'event'], ['fight', 'sort', 'notes'], ['elite', 'notes', 'cafe'], ['camp', 'fight', 'notes'], ['notes', 'event', 'fight'], ['fight', 'elite', 'board'], ['sort', 'notes', 'fight'], ['camp', 'cafe', 'camp']],
          fights: ['g-hoarder', 'g-frostbite', 'g-rot', 'g-thousand', { ids: ['g-hoarder', 'g-rot'] }, { ids: ['g-frostbite', 'g-thousand'] }], elites: ['g-minstay'],
          notes: ['g-classes', 'g-mindur'], sorts: ['g-classes'], events: ['g-kyu4', 'g-toll'],
          intro: [{ who: null, text: 'The Cold Stores. Grain to the ceiling, in rooms that get colder the deeper you go. Every sack has a price chalked on it.' },
            { who: 'kai', text: 'She keeps everything she owns down here. Everything. Like a dragon with a spreadsheet.' }, { who: 'mate1', text: 'Then we read the spreadsheet.' }],
          outro: [{ who: null, text: 'The Quartermaster sits down on a sack of Deep Archive barley and starts, for the first time, to ask who eats from it.' },
            { who: 'lead', text: 'Further down. Something down there smells like bread.' }] }),
        floor({ name: 'Sacks, Shelves and Barrels', gate: 'THE COLD STORES · SACKS, SHELVES AND BARRELS', beat: 'Objects, files and blocks, and the farms outside the walls.', boss: 'g-keeper', bossTitle: 'The Granary Keeper', fade: 5,
          plan: [['fight', 'fight', 'notes'], ['fight', 'event', 'sort'], ['notes', 'cafe', 'fight'], ['elite', 'fight', 'notes'], ['camp', 'sort', 'event'], ['fight', 'elite', 'cafe'], ['event', 'fight', 'notes'], ['sort', 'fight', 'board'], ['camp', 'cafe', 'camp']],
          fights: ['g-sack', 'g-shelf', 'g-barrel', 'g-outerfarms', { ids: ['g-sack', 'g-shelf', 'g-barrel'] }, { ids: ['g-shelf', 'g-barrel'] }], elites: ['g-hotbarrel'],
          notes: ['g-ofb', 'g-movers'], sorts: ['g-stores'], events: ['g-pantry', 'g-farmcart'],
          intro: [{ who: null, text: 'Below the grain: a hall of sacks, a wall of shelves everyone can reach, and barrels chained to their own carts.' }, { who: 'mate2', text: 'Three kinds of store. Three kinds of trouble.' }],
          outro: [{ who: null, text: 'Behind the Granary Keeper, a pantry door, and a small old woman in an apron, humming, serving whatever was asked for last.' },
            { who: 'wen', text: 'Oh! Customers! Sit, sit. I only keep what\'s asked for, dear, and nobody has asked for anything in ever so long.' },
            { who: 'kai', text: '...Grandma Wen?' }, { who: 'wen', text: 'Is it Tuesday? Gary comes on Tuesdays. Well. He did.' }] })
      ] }),
    xp('abyss', { sev: 0.9, dmg: 1.05 }, { name: 'The Abyss', blurb: 'Floors 27 to 32: under Halcyon, where burnt-out Saints are thrown. Its chambers are a table\'s partitions.', back: 'Down to the bottom', cafe, camp,
      tapeLine: [{ who: 'kai', text: 'Get up. I did a year down here. You can do a floor.' }],
      floors: [
        floor({ name: 'The Hot Chamber', gate: 'THE ABYSS · THE HOT CHAMBER', beat: 'One partition doing all the work.', boss: 'g-singlesaint', bossTitle: 'The Single Saint', fade: 5,
          plan: [['fight', 'notes', 'fight'], ['sort', 'fight', 'event'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'notes'], ['camp', 'event', 'fight'], ['notes', 'fight', 'sort'], ['fight', 'elite', 'board'], ['event', 'notes', 'fight'], ['camp', 'cafe', 'camp']],
          fights: ['g-hotkey', 'g-ptexceeded', 'g-burst', { ids: ['g-hotkey', 'g-burst'] }, { ids: ['g-ptexceeded', 'g-hotkey'] }], elites: ['g-writeshard'],
          notes: ['g-pkey', 'g-rcu'], sorts: ['g-throttle'], events: ['g-kyu5', 'g-saint7'],
          intro: [{ who: null, text: 'The Abyss. Warm air from below, and a chamber where every sound goes to one wall.' }, { who: 'kai', text: 'I know this place. Everything down here piles onto one thing until it breaks.' },
            { who: null, text: 'From somewhere far below, an old woman\'s voice, like a coach at a prize fight:' }, { who: 'ash', text: 'Weak! Insult its partition key!' }],
          outro: [{ who: null, text: 'The Single Saint flickers, and goes out. The chamber cools all at once.' }, { who: 'mate1', text: 'It was one key. All of it.' }] }),
        floor({ name: 'The Index Caves', gate: 'THE ABYSS · THE INDEX CAVES', beat: 'Questions, and whether they cost a Query or a Scan.', boss: 'g-catalogue', bossTitle: 'The Catalogue', fade: 4,
          plan: [['fight', 'fight', 'notes'], ['notes', 'event', 'sort'], ['fight', 'cafe', 'notes'], ['elite', 'fight', 'sort'], ['camp', 'notes', 'event'], ['fight', 'elite', 'cafe'], ['notes', 'fight', 'board'], ['sort', 'fight', 'notes'], ['camp', 'cafe', 'camp']],
          fights: ['g-scan', 'g-filter', 'g-lateindex', { ids: ['g-scan', 'g-filter'] }, { ids: ['g-lateindex', 'g-scan'] }], elites: ['g-secondsort'],
          notes: ['g-gsilsi', 'g-queryscan'], sorts: ['g-register'], events: ['g-register', 'g-echo'],
          intro: [{ who: null, text: 'Caves lined with names, filed by nothing anyone remembers.' }, { who: 'mate2', text: 'Every question down here reads the whole wall.' },
            { who: 'ash', text: 'That one Scans, boy! Call it expensive. It hates that.' }, { who: 'kai', text: '...She\'s alive.' }],
          outro: [{ who: null, text: 'The Catalogue closes, for once, on a question it could answer.' }, { who: 'lead', text: 'Down. The Well\'s next.' }] }),
        floor({ name: 'The Well', gate: 'THE ABYSS · THE WELL', beat: 'Writes that overwrite, reads that lag, items that expire whenever they like.', boss: 'g-sinkhole', bossTitle: 'The Sinkhole', fade: 4,
          plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'sort'], ['notes', 'fight', 'cafe'], ['elite', 'notes', 'fight'], ['camp', 'event', 'sort'], ['fight', 'notes', 'elite'], ['fight', 'board', 'event'], ['notes', 'fight', 'sort'], ['camp', 'cafe', 'camp']],
          fights: ['g-staleread', 'g-doublewriter', 'g-ghost400', { ids: ['g-staleread', 'g-doublewriter'] }, { ids: ['g-ghost400', 'g-staleread'] }], elites: ['g-expiry'],
          notes: ['g-optlock', 'g-ledger', 'g-ttl'], sorts: ['g-writes'], events: ['g-ledgermem', 'g-saint7'],
          intro: [{ who: null, text: 'The Well: a round shaft of clerks\' desks, every clerk writing over the one before.' }, { who: 'kai', text: 'Mother Ash is at the bottom of this. If she\'s still anywhere.' }],
          outro: [{ who: null, text: 'The Sinkhole fills. At the bottom of the Well there\'s a ledge, eleven candles, and somebody cackling.' }] })
      ] }),
    xp('cathedral', { sev: 0.9, dmg: 0.82 }, { name: 'The Cathedral', blurb: 'Floors 33 to 40: up through the choir, the burnt library and the gallery stair to Selvaria.', back: 'Back down to Halcyon', cafe, camp,
      tapeLine: [{ who: 'mate1', text: 'Again. Right here on the stair.' }],
      floors: [
        floor({ name: 'The Choir', gate: 'THE CATHEDRAL · THE CHOIR', beat: 'One writer, many voices, all a beat behind.', boss: 'g-precentor', bossTitle: 'The Precentor', fade: 4,
          plan: [['fight', 'notes', 'fight'], ['sort', 'fight', 'event'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'notes'], ['camp', 'sort', 'fight'], ['notes', 'elite', 'event'], ['fight', 'board', 'fight'], ['event', 'notes', 'fight'], ['camp', 'cafe', 'camp']],
          fights: ['g-replicalag', 'g-connstorm', { ids: ['g-replicalag', 'g-connstorm'] }, { ids: ['g-staleread', 'g-replicalag'] }], elites: ['g-standby'],
          notes: ['g-replicas', 'g-proxy'], sorts: ['g-reads'], events: ['g-choir', 'g-echo'],
          intro: [{ who: null, text: 'The cathedral\'s choir: a hundred voices singing a beat behind one man.' }, { who: 'kai', text: 'The records are up here. All of them. She keeps everything, remember.' }],
          outro: [{ who: null, text: 'In the Precentor\'s ledger, the cathedral\'s stream: every change for the last day, before and after.' },
            { who: 'dutch', text: 'Here. Selvaria\'s order to Aurelian, the night before Saint\'s Day. Overwritten next morning. The stream kept the old image.' }, { who: 'kai', text: 'Keep it. Keep all of it.' }] }),
        floor({ name: 'The Burnt Library', gate: 'THE CATHEDRAL · THE BURNT LIBRARY', beat: 'What was burned, what was kept in the wrong place, and how to get it back.', boss: 'g-archivist', bossTitle: 'The Archivist', fade: 4,
          plan: [['fight', 'fight', 'notes'], ['event', 'notes', 'sort'], ['fight', 'cafe', 'fight'], ['elite', 'notes', 'event'], ['camp', 'fight', 'notes'], ['fight', 'elite', 'cafe'], ['notes', 'fight', 'board'], ['event', 'fight', 'notes'], ['camp', 'cafe', 'camp']],
          fights: ['g-grate', 'g-fulltext', { ids: ['g-grate', 'g-fulltext'] }, { ids: ['g-fulltext', 'g-scan'] }], elites: ['g-wrongengine'],
          notes: ['g-pitr', 'g-engines'], sorts: ['g-stores'], events: ['g-founding', 'g-engines'],
          intro: [{ who: null, text: 'The library. A grate full of ash where the founding texts were burned, and shelves of everything else, kept in the wrong engine.' }],
          outro: [{ who: null, text: 'The Archivist hands over a restore, made from the cathedral\'s own backups: the founding texts, as they were the day before they burned.' },
            { who: 'kai', text: 'A day a year from everyone. It says it right there. It always said it.' }] }),
        floor({ name: 'The Gallery Stair', gate: 'THE CATHEDRAL · THE GALLERY STAIR', beat: 'The Drawing, without the Hero.', boss: 'g-shadow', bossTitle: 'Sir Aurelian\'s Shadow', fade: 3,
          plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'sort'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'event'], ['camp', 'notes', 'fight'], ['fight', 'elite', 'sort'], ['event', 'board', 'fight'], ['fight', 'notes', 'elite'], ['camp', 'cafe', 'camp']],
          // Mixed echoes from the band (and one from the Mailroom), as the last floors before a band's boss always are.
          fights: [{ ids: ['g-hotkey', 'g-staleread'] }, { ids: ['g-scan', 'g-doublewriter'] }, { ids: ['g-replicalag', 'g-hoarder'] }, { ids: ['g-connstorm', 'g-ghost400'] }, 'g-doublewriter'], elites: ['g-twelfthbell'],
          notes: ['g-optlock', 'g-alias'], sorts: ['g-writes'], events: ['g-names', 'g-freyagift'],
          intro: [{ who: null, text: 'The stair to the gallery, and at every landing a bell that rings the Drawing.' }, { who: 'mira', text: 'Aurelian isn\'t here tonight. He refused.' }],
          outro: [{ who: null, text: 'At the top of the stair, two versions of one record. Version 7, written by Hana\'s role: no. Version 9, written by the regent\'s: the Drawing. No condition on the write.' },
            { who: 'kai', text: '...She said no.' }] }),
        floor({ name: 'The Gallery', gate: 'THE CATHEDRAL · THE GALLERY', beat: 'Selvaria, Noor beside her, and the city below in the nave.', boss: 'g-selvaria', bossTitle: 'Princess Selvaria', bossSev: 1.05,
          bossPack: { ids: ['g-selvaria', 'g-noorpart', 'g-citizen'] }, debuff: { kind: 'brittle', n: 2 },
          plan: [['notes', 'event', 'camp'], ['sort', 'notes', 'cafe'], ['event', 'board', 'notes'], ['camp', 'notes', 'sort'], ['notes', 'cafe', 'board'], ['event', 'sort', 'notes'], ['board', 'notes', 'camp'], ['notes', 'event', 'sort'], ['camp', 'cafe', 'camp']],
          notes: ['g-pkey', 'g-optlock', 'g-ledger', 'g-pitr'], sorts: ['g-throttle', 'g-writes'], events: ['g-names', 'g-ledgermem'],
          intro: [{ who: null, text: 'The gallery. Selvaria at the rail, Noor beside her in a borrowed dress, and the whole city below in the nave, looking up.', evidence: true },
            { who: 'selvaria', text: 'Come up, then. Bring whatever you found. I\'ll tell you whether it adds up.' }],
          outro: [{ who: null, text: 'Selvaria doesn\'t run. She walks, up the tower, and Freya\'s blessing carries her.' }, { who: 'noor', text: 'Is it... is it over? Can I sit down?' }] })
      ] }),
    xp('regent', { sev: 0.95, dmg: 1 }, { name: 'The Regent\'s Sum', blurb: 'The reckoning: the Granaries\' vault, the last of the old records, and Selvaria, still honest.', back: 'Back to camp', cafe, camp,
      tapeLine: [{ who: 'kai', text: 'Up. She\'d do it again. So would I.' }],
      floors: [
        floor({ name: 'The Vault Stair', gate: 'THE REGENT\'S SUM · THE VAULT STAIR', beat: 'The band\'s ideas, mixed with the Mailroom\'s.', boss: 'g-ledger', bossTitle: 'The Old Ledger', fade: 3,
          plan: [['fight', 'notes', 'fight'], ['sort', 'fight', 'event'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'sort'], ['camp', 'event', 'fight'], ['notes', 'elite', 'fight'], ['fight', 'board', 'sort'], ['event', 'notes', 'fight'], ['camp', 'cafe', 'camp']],
          fights: [{ ids: ['g-hotkey', 'g-scan'] }, { ids: ['g-doublewriter', 'g-replicalag'] }, { ids: ['g-thousand', 'g-ghost400'] }, 'g-connstorm', 'g-filter'], elites: ['g-writeshard', 'g-standby'],
          notes: ['g-pkey', 'g-queryscan', 'g-classes'], sorts: ['g-throttle', 'g-register', 'g-reads'], events: ['g-echo', 'g-ledgermem', 'g-register'],
          intro: [{ who: null, text: 'The Granaries\' vault. Selvaria has gone down with the last of the old records.' }, { who: 'kai', text: 'She kept the books. Of course she kept the books.' }],
          outro: [{ who: null, text: 'The Old Ledger falls open. Every sum in it is right.' }] }),
        floor({ name: 'The Undelivered', gate: 'THE REGENT\'S SUM · THE UNDELIVERED', beat: 'The Mailroom\'s echoes: every prayer Halcyon sent, and none that arrived.', boss: 'g-backlog', bossTitle: 'The Prayer Backlog', fade: 3,
          plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'sort'], ['fight', 'cafe', 'notes'], ['elite', 'fight', 'event'], ['camp', 'notes', 'fight'], ['fight', 'elite', 'sort'], ['notes', 'fight', 'board'], ['fight', 'event', 'fight'], ['camp', 'cafe', 'camp']],
          fights: [{ ids: ['visghost', 'g-staleread'] }, { ids: ['twins2', 'g-doublewriter'] }, { ids: ['pill', 'g-expiry'] }, 'millrace', { ids: ['g-hotkey', 'emptyclerk'] }], elites: ['herd', 'backlog'],
          notes: ['g-ledger', 'g-optlock', 'g-ttl'], sorts: ['g-writes', 'g-reads'], events: ['g-echo', 'g-saint7'],
          intro: [{ who: null, text: 'Below the vault, a sorting room. Every prayer Halcyon ever sent is stacked here, in the order it came.' }, { who: 'mate1', text: 'This is the Mailroom\'s. Freya kept a branch office.' }],
          outro: [{ who: null, text: 'The backlog drains. Three hundred and sixty-five copies of one prayer go where someone can read them.' }, { who: 'kai', text: 'Every night. I said it every night.' }] }),
        floor({ name: 'The Winter Sum', gate: 'THE REGENT\'S SUM · THE WINTER SUM', beat: 'Selvaria\'s forecast: Saint\'s Day traffic, on one key.', boss: 'g-winter', bossTitle: 'The Winter Sum', fade: 3,
          plan: [['fight', 'sort', 'fight'], ['notes', 'fight', 'event'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'sort'], ['camp', 'event', 'fight'], ['fight', 'elite', 'notes'], ['sort', 'fight', 'board'], ['fight', 'notes', 'event'], ['camp', 'cafe', 'camp']],
          fights: [{ ids: ['g-burst', 'towncrier'] }, { ids: ['g-ptexceeded', 'g-hotkey'] }, 'g-connstorm', { ids: ['g-scan', 'bellnoringer'] }, 'g-replicalag'], elites: ['g-hotbarrel', 'g-writeshard'],
          notes: ['g-pkey', 'g-rcu', 'g-proxy'], sorts: ['g-throttle', 'g-stores'], events: ['g-kyu5', 'g-choir'],
          intro: [{ who: null, text: 'A hall with the winter written on its wall: every night\'s load, and the night it breaks.' }, { who: 'selvaria', text: 'Read it, if you like. It\'s right. It was always right.' }],
          outro: [{ who: null, text: 'The sum on the wall still works. It just doesn\'t need one girl any more.' }] }),
        floor({ name: 'The Vault', gate: 'THE REGENT\'S SUM · THE VAULT', beat: 'The sum, done in front of the city.', boss: 'g-regent', bossTitle: 'Selvaria, the Regent\'s Sum', bossSev: 1.05,
          bossPack: { ids: ['g-regent', 'g-citizen', 'g-citizen'] },
          plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'sort'], ['fight', 'cafe', 'notes'], ['elite', 'fight', 'event'], ['camp', 'notes', 'fight'], ['fight', 'elite', 'cafe'], ['sort', 'fight', 'board'], ['fight', 'notes', 'event'], ['camp', 'cafe', 'camp']],
          fights: [{ ids: ['g-staleread', 'g-sack'] }, { ids: ['g-lateindex', 'g-hotkey'] }, { ids: ['g-grate', 'g-burst'] }, 'g-ptexceeded', 'g-expiry'], elites: ['g-twelfthbell', 'g-secondsort'],
          notes: ['g-optlock', 'g-ttl', 'g-replicas', 'g-alias'], sorts: ['g-writes', 'g-classes'], events: ['g-echo', 'g-names'],
          intro: [{ who: 'selvaria', text: 'You\'ve come to unmake me. Go on. The sum still works.' }, { who: 'kai', text: 'No. You\'re going to do it. Out loud. In front of them.' }],
          outro: [{ who: null, text: 'Selvaria does the sum in front of the city, on the slate, in her clear hand. Then she gives her day first.' }, { who: 'kai', text: 'There. Was that so hard?' }, { who: 'selvaria', text: 'Yes.' }] })
      ] })
  ]);

  // ---------- Playing it ----------
  const pickQ = c => SD.qpick(SD.questions.filter(q => q.c === c && q.id && !q.lp && q.type !== 'explain'));
  // Each player's deck: the chapter's own (S.save.c3.deck), else the standalone start; Kai's card of the chapter, and
  // the Cold Grain curse while it holds.
  function deckFor(champ, bot) {
    const own = !bot && c3() && Array.isArray(c3().deck) && c3().deck.length ? c3().deck.slice() : R3.startDeck();
    const d = SD.champions.deck(champ, own);
    if (champ === 'kai') d.unshift(dev('dayayear') ? 'g-dayayear' : 'g-share');
    if (dev('gauntlet') && !bot) d.unshift('g-gauntlet');
    if (!dev('oven')) d.push('g-coldgrain');
    return d.filter(id => SD.cards[id]);
  }
  // While one of these runs, a champion's reward cards are the expedition's own.
  const rewards = SD.champions.rewards;
  SD.champions.rewards = function (champ) { return R3.active ? (XPCARDS[R3.active] || REWARDS).slice() : rewards(champ); };
  let speaker = null;
  // Who says a line: 'lead' is you, mate1 and mate2 your first two companions, anyone else by id. A line with
  // `evidence` is the confrontation: js/c3-world.js's three proofs, before the fight.
  async function say(list) {
    const me = lead(), mates = ORDER.filter(x => x !== me);
    const who = w => (w === 'lead' ? me : w === 'mate1' ? mates[0] : w === 'mate2' ? mates[1] : w || 'narr');
    for (const l of list) {
      if (l.evidence && R3.evidence) { await U.dialog([{ s: 'narr', t: l.text }]); await R3.evidence(); continue; }
      await U.dialog([{ s: who(l.who), t: l.text, e: l.e }]);
    }
  }
  R3.say = say;
  // id: an expedition above; how: 'solo', 'party' or 'join'. Resolves { won } once the player leaves the dungeon.
  R3.play = async function (id, how) {
    const RD = SD.raid, net = SD.net;
    SD.main.show('run');
    const root = U.$('#run');
    SD.champions.setMine(lead());
    R3.active = id;
    // The engine draws the map's floor and room icons from the painted dungeon art when it's loaded; this chapter is
    // vector only, so hide it for the run (its glyphs and plain floor stand in) and put it back after.
    const painted = SD.dungeonArt; SD.dungeonArt = null;
    // The fight stage's backdrop is the painted battle art too (js/raid.js); in vector mode a stylesheet puts the
    // expedition's own scene over it (a PixelLab still, centred so the fire stays between the fighters), so the
    // battle file is never fetched. A stylesheet's url() isn't rewritten by the published page's image pack, hence assetUrl.
    const K = SD.vec, BACK = { cold: 'c3-kitchen', abyss: 'c3-abyss', cathedral: 'c3-gallery', regent: 'c3-gallery' };
    const vsrc = K && K.scenes && K.scenes[BACK[id]], vurl = vsrc && SD.assetUrl ? SD.assetUrl(vsrc) : vsrc;
    const vback = K && K.on && vsrc ? document.head.appendChild(Object.assign(document.createElement('style'), {
      textContent: `.rd-stage{background-image:url("${vurl}") !important;background-size:cover !important;background-position:center bottom !important}` })) : null;
    let won = false, hub = null, dir = null;
    const onEnd = r => { won = !!(r && r.won); };
    const story = extra => Object.assign({ story: true, label: 'Borderlands', xp: id, champNames: true, deckFor, pickQ, say,
      onMiss: q => { if (q && q.c && R3.onMiss) R3.onMiss(q.c); } }, SD.tapes.forRaid(3), extra);
    try {
      hub = await net.open();
      if (how === 'solo') await RD.play(root, hub, net.code('granaries'), story({ create: true, auto: { bots: ORDER.filter(x => x !== lead()) }, onEnd }));
      else {
        dir = await hub.directory('granaries');
        const create = how === 'party';
        const code = create ? net.code('granaries') : await R3.join(root, dir);
        if (code) {
          let status = null, last = '', hosting = false, listed = true;
          const beat = () => {
            const st = status ? status() : null;
            if (!st || !st.lead) { if (hosting) { hosting = false; last = ''; dir.unhost(); } return; }
            const info = { code, nick: hub.me.nick, players: st.players, max: st.max, open: !!(listed && st.open), champ: st.champ || null, info: net.clean(st.info, 48) };
            const j = JSON.stringify(info);
            if (j !== last) { last = j; hosting = true; dir.host(info); }
          };
          const poll = setInterval(beat, 1000);
          try { await RD.play(root, hub, code, story({ create, onEnd, status: f => { status = f; beat(); }, vis: { get: () => listed, set: v => { listed = !!v; beat(); } } })); }
          finally { clearInterval(poll); if (hosting) dir.unhost(); }
        }
      }
    } catch (e) { console.warn('Granaries:', e); }
    finally { if (dir) dir.leave(); R3.active = null; SD.dungeonArt = painted; if (vback) vback.remove(); }
    return { won };
  };
  // A friend's party: the open ones at this door, and a box for a code.
  R3.join = function (root, dir) {
    const esc = U.esc, net = SD.net;
    return new Promise(res => {
      let off = null;
      const done = c => { if (off) off(); res(c); };
      const draw = () => {
        const list = dir.tables().filter(t => net.cleanCode(t.code).length >= 4);
        root.innerHTML = `<div class="mi-card rd"><span class="mi-tag">Borderlands · The Granaries</span><h2 style="margin:2px 0 6px">Join a party</h2>
          ${list.length ? `<ul class="mn-list">${list.map(t => `<li><b>${esc(t.nick || 'A party')}</b> <small class="muted">${t.players | 0}/${t.max | 0}${t.info ? ' · ' + esc(t.info) : ''}</small> <button class="mi-btn sm" type="button" data-code="${esc(net.cleanCode(t.code))}">Join</button></li>`).join('')}</ul>` : '<p class="muted">No open parties right now. Ask a friend for their code.</p>'}
          <label class="pt-lbl" for="g3-code">A friend's code<input id="g3-code" maxlength="6" autocomplete="off" placeholder="G7KQP"></label>
          <p class="muted small" id="g3-why" role="status"></p>
          <div class="row"><button class="primary" type="button" id="g3-go">Join</button><button class="ghost" type="button" id="g3-back">Back</button></div></div>`;
        root.querySelectorAll('[data-code]').forEach(b => { b.onclick = () => done(b.dataset.code); });
        root.querySelector('#g3-go').onclick = () => {
          const c = net.cleanCode(root.querySelector('#g3-code').value);
          if (c.length !== 5 || net.gameOf(c) !== 'granaries') { root.querySelector('#g3-why').textContent = 'Granaries codes are 5 letters and start with G, like G7KQP.'; return; }
          done(c);
        };
        root.querySelector('#g3-back').onclick = () => done(null);
      };
      off = dir.onTables(() => draw()) || null;
      draw();
    });
  };
})();
