// Chapter 6, the Mirror Floors (floors 81 to 99): everything the raid engine (js/raid.js) plays, as data. The concepts
// with their links, the new cards (what the overworld's minigames hand you, and the floors' rewards), the curses of
// these floors and the Plot Devices that lift them, the enemies (their art is in js/c6-art.js), the Field Notes and
// Policy Sorts, the events, and three expeditions:
//   The Twin Stairs (Easy, 2 floors)   the Near Shore (the Doubled Watchman), the Far Shore (the Lighthouse Keeper)
//   The Relay (Medium, 3)              the Copy Room (the Split Brain), the Bridges (the Bridge Toll), the Sealed Twin
//                                      (the Keeper's Shadow)
//   The Vault (Hard, 4)                the Ledger of Copies (the Archivist Twins), the Lock Room (the Lock Smiths), the
//                                      Clock Room (the Deletion Window), the Keeper's Room (Kagemaru)
// One floor per boss the Story Bible names (Ladi, Oct 21). Every floor here has a twin: each boss comes with its twin
// from across the lake (a bossPack add), and the Failover curse heals whoever you're fighting while it sits in a hand.
// The overworld and story are js/c6-world.js; the Huh??? and ELI5 lines js/c6-help.js. AWS facts follow the current
// AWS documentation (Route 53, the disaster recovery whitepaper, S3 replication and Object Lock, DynamoDB global tables,
// Aurora Global Database, Transit Gateway, PrivateLink, Direct Connect, CloudFront, Global Accelerator, AWS Backup,
// KMS, CloudFormation StackSets, Cost Explorer and Budgets). Every explanation is written fresh.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const D = SD.c6data = {};

  // ---------- Concepts ----------
  const C = (name, gist, page) => ({ name, zone: 6, gist, page });
  Object.assign(SD.concepts, {
    regionsaz: C('Regions and Availability Zones', 'A Region is a separate geographic area; each has three or more Availability Zones, groups of data centers with their own power and networking, close enough for fast links. Spreading across AZs (Multi-AZ, Auto Scaling over several subnets) survives a data center failing; only a second Region survives losing the whole Region. AZ names like us-east-1a are shuffled per account; the AZ ID (use1-az2) is the same everywhere. Data stays in the Region you put it in unless you copy it out.', 'A stair in one zone falls with that zone. — Kyu, page 9'),
    routing53: C('Route 53 Routing Policies', 'Route 53 answers each DNS query by the record\'s routing policy: simple (one answer), failover (primary while healthy, else secondary), weighted (by percentage, for canaries and blue/green), latency (the Region with the lowest latency to the user), geolocation (by the user\'s country or continent), geoproximity (by distance, with a bias), multivalue answer (up to eight healthy records) and IP-based. Alias records point at AWS resources for free and can evaluate the target\'s health.', 'Every question gets one answer. Choose who answers. — Mio'),
    health53: C('Health Checks', 'A Route 53 health check probes an endpoint (HTTP, HTTPS or TCP) from checkers around the world, so the endpoint must allow their IP ranges; a calculated health check combines child checks with a threshold; an alarm-based one follows a CloudWatch alarm, which is how private resources are checked. A load balancer\'s target group checks its own targets. Composite alarms combine alarms with AND and OR. When AWS itself is sick, the AWS Health Dashboard says so, and its events reach EventBridge.', 'Some of them say they\'re fine. They\'re not. — Mio'),
    drtiers: C('Disaster Recovery: RPO and RTO', 'RPO is how much data you can lose, measured back from the failure to the last good copy; RTO is how long you can be down. The strategies, cheapest and slowest first: backup and restore (hours), pilot light (the data replicated, the core running, servers ready to launch: tens of minutes), warm standby (a smaller full copy always running, scaled up on failover: minutes), and multi-site active/active (both serving: near zero). Pick the cheapest that meets both numbers, and test it.', 'Ask what you can lose and how long you can wait. Then pay for exactly that. — the Lighthouse Keeper'),
    readiness: C('Liveness, Readiness and Grace Periods', 'A process can be alive but not ready: still loading, warming a cache, waiting on a database. A load balancer\'s health check path should answer 200 only when the app can really serve; ECS uses a health check grace period, and a container health check has a startPeriod, so slow starters aren\'t killed while they warm up. A liveness check that only proves the process runs lets a stuck worker live forever.', 'Awake isn\'t the same as ready. — the Readiness Probe'),
    quotaalarm: C('Service Quotas and Alarms on Them', 'Every account has quotas per Region: vCPUs, API request rates, and more. A recovery plan that launches in a second Region needs the quotas raised there too, before the disaster. Service Quotas shows usage, and CloudWatch can alarm on it, for example with the SERVICE_QUOTA() function over the AWS/Usage metrics.', 'The lighthouse had a lamp. Nobody had asked for the oil. — the Old Lighthouse'),
    legacy: C('Reliability for Apps You Can\'t Change', 'An old app can be made reliable without touching its code: EC2 automatic recovery (or an alarm with the recover action) moves it to healthy hardware with the same instance ID and IP; an Auto Scaling group of one replaces it; a load balancer in front hides one bad server; EventBridge rules on AWS Health events can run an Automation runbook. AWS Elastic Disaster Recovery replicates whole servers continuously to a cheap staging area and launches them on demand.', 'Don\'t fix the lighthouse. Put a second lamp beside it. — the Old Lighthouse'),
    replicas: C('Replication Across Regions', 'S3 Cross-Region Replication needs versioning on both buckets, copies new objects asynchronously (existing ones need S3 Batch Replication), and with Replication Time Control copies 99.99% of objects within 15 minutes under an SLA. DynamoDB global tables are multi-active: every Region writes, and in the default mode last writer wins. An Aurora global database replicates storage to up to ten secondary Regions with typically under a second of lag, and can be failed over in minutes. RDS cross-Region read replicas are asynchronous and can be promoted.', 'Two copies. Test them. — Kyu, page 10'),
    mesh: C('Transit Gateway, Peering and PrivateLink', 'VPC peering joins two VPCs and is not transitive: A peered to B and B to C doesn\'t make A reach C. A transit gateway is a regional hub that routes between every attached VPC, VPN and Direct Connect gateway, and charges for each attachment and for every gigabyte it processes, so two VPCs with huge traffic between them can be cheaper peered directly. PrivateLink offers one service to other VPCs through interface endpoints, without opening either network, and works even when their CIDR ranges overlap.', 'Three towns, three bridges, and none of them goes through the middle. — the Peering Tangle'),
    hybrid6: C('Direct Connect, and a VPN Behind It', 'Direct Connect is a private line from your data center to AWS with consistent bandwidth and latency; it takes weeks to set up and comes in fixed speeds (dedicated 1, 10, 100 or 400 Gbps; hosted from 50 Mbps), so you buy the smallest that carries the load. One line is one point of failure: keep a Site-to-Site VPN on the same virtual private gateway or transit gateway as a cheap backup, and BGP fails over to it. Direct Connect isn\'t encrypted by itself; run a VPN over it, or use MACsec, if it must be.', 'A private road, and a hidden path beside it in case the road floods. — the Long Cable'),
    edge6: C('CloudFront, Global Accelerator and the Cache Key', 'CloudFront caches HTTP content at edge locations close to users; its cache key decides what counts as the same object, so include only the query strings, headers and cookies that really change the response, and pass the rest to the origin with an origin request policy. Global Accelerator gives two static anycast IP addresses that carry TCP and UDP over the AWS network to the nearest healthy Regional endpoint, with fast failover and traffic dials, but caches nothing.', 'Keep the one thing that matters in the key, and nothing else. — the Edge'),
    costnet: C('What Data Transfer Costs', 'Data in from the internet is free; data out to it is charged per gigabyte. Traffic between AZs costs in both directions, and between Regions more. A NAT gateway charges by the hour and per gigabyte processed, so S3 and DynamoDB traffic should take a free gateway endpoint instead, and each AZ should use its own NAT gateway. Moving compute next to its data, peering instead of a transit gateway for one heavy pair, and CloudFront in front of the origin all cut the bill.', 'Every crossing between zones has a toll. Count them. — the Bridge Toll'),
    costtools: C('Cost Tools: Explorer, Budgets, Tags, Savings Plans', 'Cost Explorer shows and forecasts spend, grouped by service, account or cost allocation tag (tags must be activated in the management account). AWS Budgets alerts on actual or forecast cost and usage, and its actions can apply policies or stop instances. The Cost and Usage Report (CUR 2.0 in Data Exports) has every line, by the hour. Savings Plans and Reserved Instances trade a commitment for a discount; Compute Savings Plans follow you across instance families, Fargate and Lambda. Trusted Advisor and Compute Optimizer find waste and oversized resources.', 'Find the lines on the receipt that shouldn\'t be there. — Wen'),
    stacksets: C('CloudFormation StackSets', 'A StackSet deploys one CloudFormation template as stack instances across many accounts and Regions in one operation. Each stack instance can override parameter values, so the same template can run a different size or config per Region. With service-managed permissions it targets AWS Organizations OUs and can deploy automatically to accounts that join later.', 'One stack, two shores, and the twins are told apart by their parameters. — Ship It'),
    immutable: C('Immutable Infrastructure', 'Servers aren\'t patched in place: each change is a new image (an AMI or a container image), rolled out by replacing instances, for example with an Auto Scaling group instance refresh or an immutable deployment, and rolled back by going to the old image. Nothing drifts, because nothing is changed by hand.', 'He was never patched. He was replaced. — the Immutable'),
    mrkeys: C('Multi-Region KMS Keys', 'A multi-Region key is a set of related KMS keys in different Regions with the same key ID and key material, so data encrypted in one Region can be decrypted in another without calling back. Each replica has its own key policy, grants, aliases and enabled state. They stay in their Regions: nothing is copied across but the key material, by KMS itself.', 'The same key, twice, and each one keeps its own guest list. — the Keeper\'s Shadow'),
    keydelete: C('Deleting, and Not Deleting, a KMS Key', 'Deleting a KMS key destroys its key material, and everything encrypted under it becomes unrecoverable, so KMS makes you wait 7 to 30 days (30 by default). During the wait the key is Pending deletion and can\'t be used; any attempt is recorded in CloudTrail, and an alarm on those errors warns you. kms:CancelKeyDeletion stops it, and leaves the key Disabled: someone must call EnableKey before it works again. Disabling a key is the reversible way to stop its use.', 'A deletion has a window. In the window, someone can still say no. — the Deletion Window'),
    objlock: C('S3 Object Lock and Versioning', 'Object Lock (on a versioned bucket) protects object versions from deletion or overwrite. Governance mode can be bypassed by users with s3:BypassGovernanceRetention who send the bypass header; compliance mode can\'t be shortened or removed by anyone, root included, until the retain-until date. A legal hold has no date and stays until someone with s3:PutObjectLegalHold removes it. A plain DELETE on a locked object still works: it only adds a delete marker, and the locked version stays.', 'Nobody can delete it before the date. Not even the one who locked it. — Aigerim'),
    awsbackup: C('AWS Backup and Vault Lock', 'AWS Backup runs backup plans (schedules, retention, lifecycle to cold storage) across EBS, RDS, DynamoDB, EFS, S3 and more, chosen by tag, and can copy recovery points to another Region or another account. Organizations backup policies apply plans to every account in an OU. Vault Lock in compliance mode, after its grace time (at least 3 days), stops anyone, root included, from deleting recovery points early or changing the retention rules; governance mode can be removed with permission.', 'A copy no one has restored is a guess. — Seymour'),
    lifecycle6: C('Lifecycle and Retention Rules', 'S3 lifecycle rules move objects to cheaper storage classes as they age and expire them when they\'re no longer needed: current versions, noncurrent versions (NoncurrentVersionExpiration) and incomplete multipart uploads. A lifecycle rule can\'t delete a version that Object Lock still protects. Decide how long backups and logs are kept, and write the rule before the bill does it for you.', 'The rule that would have aged the vault out. — the Lock Room')
  });
  SD.links.push(
    { id: 'regionsaz-routing53', a: 'regionsaz', b: 'routing53', text: 'Multi-AZ survives a zone; Route 53 failover or latency routing between Regions survives a Region.' },
    { id: 'routing53-health53', a: 'routing53', b: 'health53', text: 'A failover, weighted or multivalue record only skips an endpoint if a health check (or the alias target\'s health) says it\'s down.' },
    { id: 'health53-readiness', a: 'health53', b: 'readiness', text: 'A health check is only as honest as the path it calls: check readiness, not just that the process is alive.' },
    { id: 'drtiers-replicas', a: 'drtiers', b: 'replicas', text: 'Your RPO is set by how the data is copied: a nightly backup loses up to a day, asynchronous replication loses seconds.' },
    { id: 'drtiers-quotaalarm', a: 'drtiers', b: 'quotaalarm', text: 'Pilot light and warm standby both launch capacity on the worst day: raise the quotas in the recovery Region first.' },
    { id: 'drtiers-legacy', a: 'drtiers', b: 'legacy', text: 'Elastic Disaster Recovery is pilot light for whole servers you can\'t rebuild: replicated all the time, launched only when needed.' },
    { id: 'replicas-objlock', a: 'replicas', b: 'objlock', text: 'Replication needs versioning on both buckets, and so does Object Lock: the locks don\'t follow by themselves, so set them on the destination too.' },
    { id: 'mesh-hybrid6', a: 'mesh', b: 'hybrid6', text: 'A transit gateway is where a Direct Connect gateway and a VPN backup meet every VPC at once.' },
    { id: 'mesh-costnet', a: 'mesh', b: 'costnet', text: 'A transit gateway charges for every gigabyte it processes; peering doesn\'t, so one huge pair is cheaper peered.' },
    { id: 'edge6-costnet', a: 'edge6', b: 'costnet', text: 'Every cache hit at the edge is one less trip to the origin, and one less gigabyte out of it.' },
    { id: 'costnet-costtools', a: 'costnet', b: 'costtools', text: 'Data transfer hides in the bill as usage types; the Cost and Usage Report and cost allocation tags find who\'s paying it.' },
    { id: 'stacksets-immutable', a: 'stacksets', b: 'immutable', text: 'Both twins built from the same template and the same image, so neither drifts from the other.' },
    { id: 'mrkeys-keydelete', a: 'mrkeys', b: 'keydelete', text: 'Scheduling a primary multi-Region key for deletion waits until its replicas are gone: each key in the set is deleted on its own.' },
    { id: 'keydelete-cloudtrail', a: 'keydelete', b: 'cloudtrail', text: 'Every call refused because a key is pending deletion is in CloudTrail, and so is every CancelKeyDeletion that wasn\'t made.' },
    { id: 'objlock-awsbackup', a: 'objlock', b: 'awsbackup', text: 'Object Lock keeps objects; Vault Lock keeps recovery points. Both have a compliance mode nobody can undo.' },
    { id: 'objlock-lifecycle6', a: 'objlock', b: 'lifecycle6', text: 'A lifecycle rule can move a locked version to a colder class, but it can\'t expire it until the lock ends.' },
    { id: 'objlock-s3lock', a: 'objlock', b: 's3lock', text: 'Aigerim\'s diary is the Mailroom\'s lock, read closely: governance can be bypassed, compliance can\'t, and a legal hold has no date.' }
  );

  // ---------- Cards ----------
  // ch: 6 keeps them in this chapter's rewards. What the overworld teaches turns up in your deck (js/c6-world.js).
  const card = (name, cost, o) => Object.assign({ name, cost, kind: 'action', ch: 6, rarity: 'common', tags: [] }, o);
  Object.assign(SD.cards, {
    // The Twin Stairs
    'r6-multiaz':   card('Multi-AZ', 1, { pow: 8, tags: ['multiaz'], art: 'globe', concept: 'regionsaz', text: 'The stair in two Availability Zones at once. A zone falls, and the other carries on.' }),
    'r6-failover':  card('Failover Record', 1, { pow: 8, tags: ['failover'], art: 'undo', concept: 'routing53', text: 'Primary while it\'s healthy, secondary the moment it isn\'t.' }),
    'r6-health':    card('Health Check', 1, { pow: 7, reveal: true, tags: ['health'], art: 'eye', concept: 'health53', text: 'Reveal weaknesses. Checkers from around the world ask "are you up?", every 30 seconds.' }),
    'r6-calc':      card('Calculated Check', 2, { pow: 11, tags: ['health', 'calc'], art: 'eye', rarity: 'uncommon', concept: 'health53', text: 'Healthy only while 2 of its 3 child checks are. It can\'t be fooled by one liar.' }),
    'r6-weighted':  card('Weighted Record', 1, { pow: 7, draw: 1, tags: ['weighted'], art: 'trace', concept: 'routing53', text: 'Draw 1. Send 10% to the new twin and watch it before you send the rest.' }),
    'r6-latency':   card('Latency Routing', 1, { pow: 8, tags: ['latency'], art: 'globe', concept: 'routing53', text: 'Each traveller to the shore that answers them fastest.' }),
    'r6-pilot':     card('Pilot Light', 1, { pow: 7, abs: { any: 3 }, tags: ['pilot'], art: 'clock', concept: 'drtiers', text: 'Absorb {any}. The data replicated, the core lit, the rest ready to launch.' }),
    'r6-warm':      card('Warm Standby', 2, { kind: 'infra', each: { any: 3 }, pow: 6, tags: ['warm'], art: 'clock', concept: 'drtiers', text: 'Infra. Each turn absorb 3 load. A smaller twin, always running, scaled up on the day.' }),
    'r6-active':    card('Active-Active', 2, { pow: 12, mit: 3, tags: ['active', 'latency'], art: 'globe', rarity: 'uncommon', concept: 'drtiers', text: 'Mitigate {mit}. Both shores serving, all the time. Near-zero RTO, double the bill.' }),
    'r6-restore':   card('Backup and Restore', 0, { pow: 6, exhaust: true, tags: ['restore'], art: 'box', concept: 'drtiers', text: 'Exhaust. Cheap to keep, slow to bring back. Hours, not minutes.' }),
    'r6-ready':     card('Readiness Probe', 1, { mit: 6, tags: ['ready', 'health'], art: 'eye', concept: 'readiness', text: 'Mitigate {mit}. Healthy means ready to serve, not just awake.' }),
    'r6-quota':     card('Quota Alarm', 1, { pow: 7, draw: 1, tags: ['quota'], art: 'note', concept: 'quotaalarm', text: 'Draw 1. Raise the quota in the recovery Region now, and alarm at 80%.' }),
    'r6-drs':       card('Elastic Disaster Recovery', 2, { pow: 11, tags: ['drs', 'pilot'], art: 'undo', rarity: 'uncommon', concept: 'legacy', text: 'Whole servers replicated to a cheap staging area, launched in minutes on the day.' }),
    'r6-asg':       card('Auto Scaling Group', 1, { pow: 8, tags: ['asg', 'multiaz'], art: 'gate', concept: 'legacy', text: 'One server or forty, across zones. A bad one is replaced, not nursed.' }),
    // The Relay
    'r6-crr':       card('Cross-Region Replication', 1, { pow: 8, tags: ['crr'], art: 'trace', concept: 'replicas', text: 'Versioning on both buckets, then every new object copied to the far shore.' }),
    'r6-rtc':       card('Replication Time Control', 2, { pow: 11, mit: 2, tags: ['crr', 'rtc'], art: 'clock', rarity: 'uncommon', concept: 'replicas', text: 'Mitigate {mit}. 99.99% of objects across in 15 minutes, with an SLA and the metrics to prove it.' }),
    'r6-gtable':    card('Global Table', 1, { pow: 9, tags: ['gtable'], art: 'box', concept: 'replicas', text: 'Every shore writes. When two write at once, the last writer wins.' }),
    'r6-gdb':       card('Aurora Global Database', 2, { pow: 12, tags: ['gdb'], art: 'box', rarity: 'uncommon', concept: 'replicas', text: 'Storage copied to the far Region in about a second. Fail over in minutes.' }),
    'r6-readrep':   card('Read Replica', 1, { pow: 7, abs: { any: 3 }, tags: ['readrep'], art: 'trace', concept: 'replicas', text: 'Absorb {any}. A copy for the readers, near where they read.' }),
    'r6-tgw':       card('Transit Gateway', 2, { kind: 'infra', each: { any: 2 }, pow: 7, tags: ['tgw'], art: 'globe', concept: 'mesh', text: 'Infra. Each turn absorb 2 load. One hub, every town attached, every route through the middle.' }),
    'r6-peer':      card('VPC Peering', 1, { pow: 8, tags: ['peer'], art: 'trace', concept: 'mesh', text: 'Two towns, one bridge, no toll per gigabyte. It doesn\'t go any further.' }),
    'r6-plink':     card('PrivateLink', 1, { pow: 9, tags: ['plink'], art: 'key', concept: 'mesh', text: 'Offer one service through an endpoint in their town. Neither wall opens.' }),
    'r6-dxvpn':     card('Direct Connect + VPN', 2, { pow: 11, abs: { any: 3 }, tags: ['dx', 'vpn'], art: 'lock', rarity: 'uncommon', concept: 'hybrid6', text: 'Absorb {any}. A private line, and a VPN beside it that BGP falls back to.' }),
    'r6-cf':        card('CloudFront', 1, { pow: 8, tags: ['cf'], art: 'globe', concept: 'edge6', text: 'Cached at the edge, near the traveller. The origin never hears about most of them.' }),
    'r6-cachekey':  card('One Header in the Key', 1, { pow: 7, draw: 1, tags: ['cachekey', 'cf'], art: 'note', concept: 'edge6', text: 'Draw 1. The cache key holds the one header that changes the page, and nothing else.' }),
    'r6-ga':        card('Global Accelerator', 1, { pow: 8, tags: ['ga'], art: 'globe', concept: 'edge6', text: 'Two static IPs, the nearest healthy Region, over AWS\'s own roads. Caches nothing.' }),
    'r6-gwend':     card('Gateway Endpoint', 1, { pow: 9, tags: ['endpoint'], art: 'key', concept: 'costnet', text: 'S3 and DynamoDB through the route table, free, and off the NAT\'s meter.' }),
    'r6-natperaz':  card('A NAT in Every Zone', 2, { pow: 11, mit: 2, tags: ['natperaz', 'multiaz'], art: 'globe', rarity: 'uncommon', concept: 'costnet', text: 'Mitigate {mit}. Each zone\'s traffic stays in its zone: no cross-AZ toll, no shared failure.' }),
    'r6-immutable': card('Replace, Don\'t Patch', 1, { pow: 9, tags: ['immutable'], art: 'undo', concept: 'immutable', text: 'A new image, an instance refresh, and the old servers gone. Nothing drifts.' }),
    'r6-stackset':  card('StackSet', 2, { pow: 10, tags: ['stacksets', 'immutable'], art: 'box', rarity: 'uncommon', concept: 'stacksets', text: 'One template to both shores at once, with a parameter override for each.' }),
    'r6-mrk':       card('Multi-Region Key', 1, { pow: 9, tags: ['mrk'], art: 'key', concept: 'mrkeys', text: 'The same key material on the far shore, with its own key policy.' }),
    // The Vault
    'r6-plan':      card('Backup Plan', 1, { pow: 8, tags: ['backup', 'tags'], art: 'box', concept: 'awsbackup', text: 'Every resource tagged backup=daily, every day, kept 35 days.' }),
    'r6-copy':      card('Copy to Another Account', 2, { pow: 11, mit: 2, tags: ['backup', 'copy'], art: 'trace', rarity: 'uncommon', concept: 'awsbackup', text: 'Mitigate {mit}. A copy in a vault the production account can\'t touch.' }),
    'r6-snap':      card('Snapshot Every Hour', 1, { pow: 8, tags: ['snap'], art: 'clock', concept: 'awsbackup', text: 'An RPO of an hour costs an hour\'s worth of snapshots. Choose it on purpose.' }),
    'r6-test':      card('Test the Restore', 1, { pow: 7, reveal: true, tags: ['test', 'restore'], art: 'eye', concept: 'awsbackup', text: 'Reveal weaknesses. Restore it somewhere else and check it. Two copies: test them.' }),
    'r6-vaultlock': card('Vault Lock', 2, { kind: 'infra', each: { any: 3 }, pow: 6, tags: ['vaultlock', 'compliance'], art: 'lock', rarity: 'uncommon', concept: 'awsbackup', text: 'Infra. Each turn absorb 3 load. After the grace time, nobody shortens a thing. Root included.' }),
    'r6-comply':    card('Compliance Mode', 1, { pow: 9, tags: ['compliance'], art: 'lock', concept: 'objlock', text: 'Locked until the date. Nobody can lift it, not even the one who set it.' }),
    'r6-govern':    card('Governance Mode', 1, { pow: 7, draw: 1, tags: ['governance'], art: 'lock', concept: 'objlock', text: 'Draw 1. Locked, unless you hold s3:BypassGovernanceRetention and say so.' }),
    'r6-hold':      card('Legal Hold', 0, { pow: 6, exhaust: true, tags: ['legalhold'], art: 'note', concept: 'objlock', text: 'Exhaust. No date. It stays until someone allowed to lifts it.' }),
    'r6-lifecycle': card('Lifecycle Rule', 1, { pow: 7, abs: { any: 3 }, tags: ['lifecycle'], art: 'clock', concept: 'lifecycle6', text: 'Absorb {any}. Colder storage as it ages, and gone when it\'s no longer needed.' }),
    'r6-cancel':    card('Cancel Deletion', 1, { pow: 10, tags: ['cancel'], art: 'undo', concept: 'keydelete', text: 'kms:CancelKeyDeletion, inside the window. The key lives, disabled.' }),
    'r6-enable':    card('EnableKey', 1, { pow: 8, draw: 1, tags: ['enable', 'cancel'], art: 'key', concept: 'keydelete', text: 'Draw 1. A key saved from deletion comes back disabled. Turn it on.' }),
    'r6-tags':      card('Cost Allocation Tags', 1, { pow: 7, draw: 1, tags: ['tags'], art: 'note', concept: 'costtools', text: 'Draw 1. Activated in the management account, so every line on the bill has a name.' }),
    'r6-budget':    card('Budget Alert', 1, { mit: 6, tags: ['budget'], art: 'eye', concept: 'costtools', text: 'Mitigate {mit}. An email at 80% of the forecast, before the month is gone.' }),
    'r6-savings':   card('Savings Plan', 2, { kind: 'infra', each: { any: 2 }, pow: 7, tags: ['savings'], art: 'coin', concept: 'costtools', text: 'Infra. Each turn absorb 2 load. Commit to the steady spend, and pay less for it.' }),
    // The Plot Devices, the boon and the stall (quests, js/c6-world.js).
    'r6-heartbeat': card('Mio\'s Heartbeat', 0, { pow: 8, reveal: true, tags: ['health', 'calc'], art: 'eye', rarity: 'rare', quest: true, concept: 'health53', text: 'Reveal weaknesses. Failover is lifted. "That one\'s pretending. I can hear it."' }),
    'r6-diary':     card('Aigerim\'s Second Diary', 1, { mit: 6, abs: { any: 6 }, tags: ['crr', 'compliance', 'backup'], art: 'note', rarity: 'rare', quest: true, concept: 'objlock', text: 'Mitigate {mit}, absorb {any}. Replication Lag is lifted. "I can\'t delete any of them. I checked."' }),
    'r6-receipt':   card('Chad\'s Receipt', 0, { draw: 2, gain: 1, exhaust: true, tags: ['budget', 'tags'], art: 'coin', rarity: 'rare', quest: true, concept: 'costtools', text: 'Exhaust. Draw 2, +1 Capacity. Five lines crossed out, in red, by Wen.' }),
    'r6-markdown':  card('Marked Down', 0, { pow: 13, selfDmg: 3, tags: ['failover', 'crr', 'backup'], art: 'coin', rarity: 'rare', quest: true, concept: 'drtiers', text: 'The team loses 3 SLA. Exactly what you needed, from the stall on the jetty. Ah ha ha.' }),
    'r6-stone':     card('A Stone With One Side', 1, { pow: 12, mit: 4, draw: 1, tags: ['health', 'compliance', 'cancel'], art: 'box', rarity: 'rare', quest: true, concept: 'drtiers', text: 'Mitigate {mit}, draw 1. From Twinwater\'s lake, after the twins stopped answering.' })
  });
  // The curses of these floors (the Story Bible): Failover (twins come back stronger) and Replication Lag (the party's
  // help lands a turn late). Here each is a card in every deck until its Plot Device lifts it.
  const curse = (name, cost, o, text) => Object.assign({ name, cost, kind: 'action', exhaust: true, rarity: 'basic', quest: true, curse: true, tags: [], art: 'lock', text, ch: 6 }, o);
  SD.cards['r6-failcurse'] = curse('Failover', 1, { held: { sev: 4 } }, 'The twin across the lake is still healthy. Fail it too, for 1 Capacity (exhaust). Each end of turn it\'s still in your hand, the incident gains 4 Severity: it failed over. Mio\'s Heartbeat lifts it.');
  SD.cards['r6-lag'] = curse('Replication Lag', 1, { onDraw: { tax: 1 } }, 'Drawn: your first card this turn costs 1 more, a turn behind the far shore. Then it\'s gone. Aigerim\'s Second Diary lifts it.');
  D.CARDS = { stairs: ['r6-multiaz', 'r6-failover', 'r6-health', 'r6-calc', 'r6-weighted', 'r6-latency', 'r6-pilot', 'r6-warm', 'r6-active', 'r6-restore', 'r6-ready', 'r6-quota', 'r6-drs', 'r6-asg'],
    relay: ['r6-crr', 'r6-rtc', 'r6-gtable', 'r6-gdb', 'r6-readrep', 'r6-tgw', 'r6-peer', 'r6-plink', 'r6-dxvpn', 'r6-cf', 'r6-cachekey', 'r6-ga', 'r6-gwend', 'r6-natperaz', 'r6-immutable', 'r6-stackset', 'r6-mrk'],
    vault: ['r6-plan', 'r6-copy', 'r6-snap', 'r6-test', 'r6-vaultlock', 'r6-comply', 'r6-govern', 'r6-hold', 'r6-lifecycle', 'r6-cancel', 'r6-enable', 'r6-tags', 'r6-budget', 'r6-savings'] };

  // ---------- Enemies ----------
  // F(id, name, short, cause, sev, concept, tier, flavor, symptom, weak, resist, pattern, more)
  const r = n => ({ t: 'read', n }), w = n => ({ t: 'write', n }), b = n => ({ t: 'burst', n }), up = u => (u ? { t: 'escalate', up: u } : { t: 'escalate' });
  const pin = (card, lvl, to, name) => ({ t: 'give', card, lvl, to, name });
  const E = {};
  const F = (id, name, short, cause, sev, concept, tier, flavor, symptom, weak, resist, pattern, more) => {
    E[id] = Object.assign({ name, short, cause, sev, concept, tier, sprite: 'r6-' + id, flavor, symptom, weak, resist, pattern, ch: 6, raid: true }, tier === 2 ? { elite: true } : tier === 3 ? { boss: true } : {}, more);
  };
  // Floor 1, the Near Shore
  F('oneaz', 'The One AZ', 'One AZ', 'A whole stair built in one Availability Zone', 28, 'regionsaz', 1, 'Every step of him is in the same zone. He\'s very proud of how close they are.',
    'Every instance and the database sit in one AZ. A power fault in that zone takes the whole stair down.',
    { multiaz: 'Spread it over two or more AZs: Multi-AZ for the database, subnets in several zones for the rest.', asg: 'An Auto Scaling group across several zones\' subnets rebuilds what a zone takes.' },
    { failover: 'Failover to where? Both records point into the same zone.' }, [r(6), w(6), b(7)]);
  F('standby', 'The Standby Twin', 'Standby Twin', 'A secondary that only wakes when the primary is declared dead', 26, 'routing53', 1, 'He sleeps on the far shore with one eye open. Nobody has told him the primary\'s gone.',
    'The primary Region is down, but its failover record has no health check, so Route 53 keeps answering with it.',
    { failover: 'Failover routing: the secondary answers once the primary is unhealthy.', health: 'A health check on the primary is what tells Route 53 it\'s dead.' },
    { weighted: 'A weight sends some traffic to him anyway, sick primary or not.' }, [r(6), r(7), b(7)]);
  F('coin', 'The Weighted Coin', 'Weighted Coin', 'A weighted record sending 90% one way, to the slow shore', 28, 'routing53', 1, 'Heads, the near shore. Heads again. Heads, nine times in ten.',
    'Weights of 90 and 10 send most European users to us-east-1 and most Americans the same way. Everyone is slow.',
    { latency: 'Latency routing: each user to the Region that answers them fastest.', weighted: 'Weights are for canaries and slow migrations. Set them on purpose.' },
    { failover: 'Nothing is down. It\'s just in the wrong place.' }, [w(6), r(7), up()]);
  F('liar', 'The Liar\'s Heartbeat', 'Liar\'s Heartbeat', 'A health check that passes while the stair is down', 46, 'health53', 2, 'He answers "fine" every 30 seconds. He has answered "fine" for three hours.',
    'The health check calls /ping, which the web server answers even though the database behind it is gone. Route 53 never fails over.',
    { health: 'Check a path that touches what matters: a deep health check, or a string match on the answer.', calc: 'A calculated health check over the parts: healthy only when enough of them are.' },
    { multiaz: 'More zones don\'t help when the check can\'t see the failure.' }, [r(9), w(10), up(), b(11)]);
  F('watchman', 'The Doubled Watchman', 'Watchman', 'Fails over to his twin unless the party fails his health check first', 80, 'health53', 3, 'Knock him down and his twin across the lake steps forward, unless you\'ve already told the world he\'s down.',
    'Primary and secondary records with health checks that only check that the server answers, so failover flaps between two broken twins.',
    { health: 'A health check that tests what users need: then Route 53 knows which twin is really up.', failover: 'Primary and secondary, decided by health, not by hope.', calc: 'Combine the checks: healthy only when the parts are.' },
    { weighted: 'Splitting traffic between two broken twins splits nothing.' }, [r(10), w(11), b(13), up(3), w(12)]);
  F('watchtwin', 'The Watchman\'s Twin', 'Watch Twin', 'The secondary, across the lake, healthy on paper', 30, 'routing53', 1, 'The same face, a moment late.', 'He steps in whenever his brother falls.',
    { failover: 'Fail him over too, in the same turn.', health: 'His check is as shallow as his brother\'s.' }, { weighted: 'He doesn\'t care about weights.' }, [r(8), w(8)]);
  // Floor 2, the Far Shore
  F('pilot', 'Pilot Light', 'Pilot Light', 'A twin with only its core running, and no plan for the rest', 28, 'drtiers', 1, 'A flame in a dark house. Somebody has to light the other rooms.',
    'The database replicates to us-west-2, but nobody has scripted launching the app servers there. Recovery takes all afternoon.',
    { pilot: 'Keep the core replicated and the rest ready: AMIs, templates, scripts, tested.', asg: 'An Auto Scaling group at zero, ready to scale out on the day.' },
    { active: 'Running everything twice is a different, dearer strategy.' }, [r(6), w(7), b(7)]);
  F('warm', 'Warm Standby', 'Warm Standby', 'A smaller twin, always on, that nobody has ever scaled up', 28, 'drtiers', 1, 'Half the size of his brother, and a little hurt about it.',
    'A scaled-down copy runs in the second Region, but its Auto Scaling maximum is 2 and the quota there was never raised.',
    { warm: 'A warm standby is always on and serving a little; scale it up on failover.', asg: 'Let its Auto Scaling group grow to full size.', quota: 'And raise the quotas there before the day.' },
    { restore: 'Restoring from backup is far slower than scaling what\'s already running.' }, [w(6), r(7), up()]);
  F('active', 'Active-Active', 'Active-Active', 'Two full twins, both serving, and the bill for both', 30, 'drtiers', 1, 'Both shores at once. He never sleeps, and he never stops charging.',
    'Both Regions take traffic; writes go to both. RTO near zero, and twice the cost of one Region.',
    { active: 'Multi-site active/active: both serve, and either can carry it all.', latency: 'Route each user to the shore that\'s nearest.', health: 'Health checks pull a sick shore out of the answers.' },
    { pilot: 'You can\'t turn a twin that\'s already serving into a pilot light mid-fight.' }, [r(7), w(7), b(8)]);
  F('restorer', 'Backup and Restore', 'Restore', 'Slow to come back, cheap to keep', 48, 'drtiers', 2, 'He keeps everything in boxes, and he\'ll unpack it for you. Eventually.',
    'Nightly snapshots copied to another Region. Recovery means restoring, launching and testing everything: about six hours, and up to a day of data lost.',
    { restore: 'For an RPO of hours and an RTO of a day, he\'s the right choice, and the cheapest.', drs: 'Need it faster for whole servers? Elastic Disaster Recovery replicates them continuously.' },
    { active: 'Paying for active/active to protect a reporting tool is how budgets die.' }, [r(9), r(10), up(), b(11)]);
  F('keeper', 'The Lighthouse Keeper', 'Keeper', 'Asks for an RPO and an RTO, and picks his strategy to match', 84, 'drtiers', 3, 'Tell him what you can lose and how long you can wait. He lights exactly that many lamps.',
    'Each turn he changes the requirement: a day of data and a day of downtime; then minutes; then seconds.',
    { pilot: 'Minutes of data, tens of minutes down: pilot light.', warm: 'Seconds of data, minutes down: warm standby.', active: 'Near zero for both: active/active.', restore: 'Hours for both: backup and restore.' },
    { multiaz: 'Another zone in the same Region doesn\'t survive losing the Region.' }, [r(11), w(12), b(13), up(3), r(13)]);
  F('keepertwin', 'The Keeper\'s Lamp', 'Keeper\'s Lamp', 'The lighthouse\'s twin lamp, on the far shore', 30, 'drtiers', 1, 'It lights when he does.', 'It shines whatever the Keeper asks.',
    { warm: 'Keep it warm, not blazing.', pilot: 'A pilot light is enough for a lamp.' }, { multiaz: 'It\'s in another Region already.' }, [r(8), b(8)]);
  // Floor 3, the Copy Room
  F('lag', 'Lag', 'Lag', 'A replica that\'s a second behind, or an hour', 28, 'replicas', 1, 'He always says what you said. Just a little later.',
    'Objects replicate to the far Region with no time target. Most arrive in seconds; some take hours, and nobody can tell which.',
    { rtc: 'Replication Time Control: 99.99% within 15 minutes, with metrics on how far behind it is.', crr: 'Replication with versioning on both buckets, monitored.', readrep: 'Readers who can\'t bear lag read the primary.' },
    { multiaz: 'Another zone doesn\'t make the far Region any closer.' }, [r(6), w(7), b(7)]);
  F('lastwriter', 'Last Writer Wins', 'Last Writer', 'Overwrites a twin\'s change made a moment earlier', 28, 'replicas', 1, 'Two shores write at once. He keeps whichever was later, and throws the other in the lake.',
    'A global table takes the same item\'s update in two Regions within a second. One of the updates silently disappears.',
    { gtable: 'Global tables settle it by last writer wins: route each item\'s writes to one Region, or design for it.' },
    { crr: 'S3 replication has nothing to do with a table\'s items.' }, [w(7), w(7), up()]);
  F('xread', 'The Cross-Region Read', 'Cross-Region Read', 'Every read crosses the lake to the primary', 28, 'replicas', 1, 'He rows across for every question, and rows back with the answer.',
    'Readers in Europe query a database in us-east-1 for every page. Pages take a second; the transfer bill grows.',
    { readrep: 'A read replica in the readers\' Region.', gdb: 'An Aurora global database: local reads in each secondary Region.' },
    { cf: 'CloudFront can\'t cache your database queries.' }, [r(7), r(7), b(8)]);
  F('gtable', 'The Global Table', 'Global Table', 'A table that writes on every shore, if you let it', 48, 'replicas', 2, 'He lives in four Regions at once and remembers everything, eventually.',
    'Players in two Regions must write their own profiles locally with single-digit-millisecond latency, and survive a Region\'s loss.',
    { gtable: 'Make the table a global table: a replica in each Region, multi-active.', gdb: 'For relational data, a global database is the same idea, with one writer.' },
    { readrep: 'A read replica can\'t take the writes.' }, [w(9), r(10), up(), b(11)]);
  F('splitbrain', 'The Split Brain', 'Split Brain', 'Two leaders after the lake road floods', 86, 'replicas', 3, 'When the road floods, both shores decide they\'re in charge. Both start writing.',
    'The link between Regions fails. Each side promotes its own database and takes writes; when the link returns, they disagree.',
    { gdb: 'An Aurora global database has one writer; a managed failover promotes one secondary, cleanly.', gtable: 'A global table is built to take writes everywhere, and settles conflicts by last writer.', health: 'One authority decides which side is primary, from health checks.' },
    { active: 'Two active writers with no conflict rule is the split brain.' }, [w(11), w(12), b(14), up(3), r(13)]);
  F('splittwin', 'The Other Leader', 'Other Leader', 'The far shore\'s database, promoted on its own', 32, 'replicas', 1, 'He was sure he was primary too.', 'He writes as if nobody else does.',
    { gdb: 'Demote him: one writer.', failover: 'One failover, decided once.' }, { active: 'More active writers is the problem.' }, [w(8), r(8)]);
  // Floor 4, the Bridges
  F('tangle', 'The Peering Tangle', 'Peering Tangle', 'Three towns peered in pairs that can\'t route through each other', 28, 'mesh', 1, 'A peered to B, B peered to C. A has never once reached C.',
    'VPC A peers with B, and B with C. Traffic from A to C is dropped: peering isn\'t transitive.',
    { tgw: 'A transit gateway: attach all three, and route through the hub.', peer: 'Or peer A with C directly, if that\'s all you need.' },
    { allow: 'No permission makes a peering connection transitive.' }, [r(6), w(7), b(7)]);
  F('hub', 'The Hub', 'Hub', 'Everything through the transit gateway, including one enormous pair', 28, 'mesh', 1, 'He likes being in the middle. He charges for it.',
    'Two VPCs exchange 500 TB a month through the transit gateway. Its data processing charge is most of the network bill.',
    { peer: 'Peer that one pair directly: no per-gigabyte processing charge.', tgw: 'Keep the hub for everything else.' },
    { ga: 'Global Accelerator is for users on the internet, not VPC to VPC.' }, [w(6), r(7), up()]);
  F('privpath', 'The Private Path', 'Private Path', 'A service offered to another town without opening its walls', 26, 'mesh', 1, 'He wants to sell you one thing. Through the wall. Without a door.',
    'A SaaS team must let 200 customer VPCs call one API privately. Many use the same CIDR range, so peering is impossible.',
    { plink: 'An endpoint service behind a Network Load Balancer, and an interface endpoint in each customer VPC.' },
    { peer: 'Peering overlapping CIDR ranges doesn\'t work, and opens the whole town.' }, [r(7), b(7), r(6)]);
  F('natbill', 'The NAT Bill', 'NAT Bill', 'All S3 traffic paying the NAT gateway by the gigabyte', 28, 'costnet', 1, 'He counts every cart, and charges four and a half cents for each gigabyte.',
    'Private instances copy terabytes to S3 in the same Region through a NAT gateway in another zone.',
    { endpoint: 'A gateway endpoint for S3: free, and off the NAT\'s meter.', natperaz: 'And a NAT gateway in each zone, so nothing crosses zones to reach one.' },
    { tgw: 'A transit gateway adds its own meter.' }, [w(7), w(6), b(8)]);
  F('longcable', 'The Long Cable', 'Long Cable', 'One private line, and nothing behind it if it\'s cut', 48, 'hybrid6', 2, 'A cable all the way from the old town. A fisherman\'s anchor away from silence.',
    'The data center reaches AWS over one Direct Connect connection. A backhoe cuts it, and everything stops.',
    { vpn: 'A Site-to-Site VPN on the same gateway as a backup; BGP fails over to it.', dx: 'Direct Connect for steady bandwidth, sized for the load, with a second path.' },
    { peer: 'Peering connects VPCs, not data centers.' }, [r(9), w(10), up(), b(11)]);
  F('toll', 'The Bridge Toll', 'Bridge Toll', 'Charges for every crossing between zones and Regions', 86, 'costnet', 3, 'He stands on every bridge at once. He charges going and coming back.',
    'Cross-AZ traffic to a shared NAT, S3 traffic through it, inter-Region reads and uncached downloads: the bill doubles every month.',
    { endpoint: 'Gateway endpoints take S3 and DynamoDB off the toll.', natperaz: 'A NAT per zone: nobody crosses a zone to reach it.', cf: 'Cache at the edge: fewer gigabytes out of the origin.', peer: 'Peer the heavy pair instead of paying the hub.' },
    { ga: 'Global Accelerator charges its own premium per gigabyte.', tgw: 'Another hub is another toll booth.' }, [r(11), w(12), b(13), up(3), w(13)]);
  F('tolltwin', 'The Toll Keeper\'s Twin', 'Toll Twin', 'The same toll, on the far bridge', 32, 'costnet', 1, 'He charges for the way back.', 'Inter-Region transfer, both ways.',
    { endpoint: 'Keep it inside: endpoints.', peer: 'Peer, don\'t hub.' }, { ga: 'More premium bandwidth.' }, [w(8), r(8)]);
  // Floor 5, the Sealed Twin
  F('drift', 'The Drifted Twin', 'Drifted Twin', 'Twins configured by hand, no longer the same', 30, 'stacksets', 1, 'He used to look exactly like his brother. Somebody gave him a haircut.',
    'The near shore\'s stack was edited in the console. The far shore\'s wasn\'t. Failover goes to a twin that\'s different.',
    { stacksets: 'One template to both Regions as a StackSet, with parameter overrides where they must differ.', immutable: 'Change nothing by hand: redeploy.' },
    { allow: 'Permissions can\'t make two stacks match.' }, [r(7), w(7), up()]);
  F('onekey', 'The One-Region Key', 'One-Region Key', 'The data crossed the lake; its key didn\'t', 30, 'mrkeys', 1, 'He holds the only key, and he lives on the near shore.',
    'Encrypted records replicate to eu-west-1, but the KMS key that encrypted them exists only in us-east-1, which is down.',
    { mrk: 'A multi-Region key: the same key material in both Regions, so the far shore can decrypt.' },
    { crr: 'The data is already there. It\'s the key that isn\'t.' }, [r(8), b(8), r(7)]);
  F('immutablee', 'The Immutable', 'The Immutable', 'A server that\'s replaced, never patched, guarding one that was patched by hand', 50, 'immutable', 2, 'He was never patched. He was replaced. He won\'t let anyone touch him with a wrench.',
    'A fleet patched by logging in to each instance has drifted apart. Every release, something different breaks on each one.',
    { immutable: 'Bake a new image and replace the fleet with an instance refresh.', stacksets: 'And the same template on both shores.' },
    { allow: 'Logging in with more permissions is how it drifted.' }, [w(10), r(10), up(), b(12)]);
  F('shadow', 'The Keeper\'s Shadow', 'Keeper\'s Shadow', 'Keeps a copy of everything, sealed with a key you can\'t reach', 88, 'mrkeys', 3, 'Something on the far shore keeps a copy of everything you\'ve done. It grins.',
    'The far shore\'s copy is encrypted under a key whose replica has its own key policy, and the policy doesn\'t name you.',
    { mrk: 'A replica of the key, with a key policy that lets you decrypt there.', immutable: 'Rebuild the far shore from the image, not by hand.', stacksets: 'One template, both shores.' },
    { crr: 'Copying the data again doesn\'t give you its key.', allow: 'Your IAM Allow doesn\'t open a key whose policy doesn\'t let it count.' }, [r(12), w(12), b(14), up(3), r(14)]);
  F('shadowtwin', 'The Shadow\'s Reflection', 'Reflection', 'The shadow\'s twin, in the water', 32, 'mrkeys', 1, 'It moves when the shadow does.', 'A replica key, with its own policy.',
    { mrk: 'Its policy is separate. Write it.' }, { crr: 'Data isn\'t the problem.' }, [r(8), w(8)]);
  // Floor 6, the Ledger of Copies
  F('unlabelled', 'The Unlabelled Copy', 'Unlabelled', 'A backup nobody can find, of nobody knows what', 30, 'awsbackup', 1, 'He\'s a copy of something. He\'s very sure of that.',
    'Hundreds of snapshots with no tags. Nobody knows which belong to what, how long to keep them, or which are safe to delete.',
    { tags: 'Tag the resources and choose them for backup plans by tag.', backup: 'A backup plan with retention: copies made and expired by rule.' },
    { lifecycle: 'A lifecycle rule can\'t tell which untagged copy matters.' }, [r(7), w(7), b(8)]);
  F('untested', 'The Copy Nobody Tested', 'Untested', 'A backup that has never once been restored', 30, 'awsbackup', 1, 'He has never been restored. He\'s fairly sure it would go fine.',
    'Nightly backups for two years. The first real restore fails: the database was being written to mid-snapshot, and the app needs a key nobody kept.',
    { test: 'Restore it regularly somewhere else, and check it works. Restore testing can schedule it.', restore: 'A restore you\'ve practised is the only kind you can count on.' },
    { backup: 'Another copy you\'ve never restored is another guess.' }, [r(7), r(8), up()]);
  F('snapfreq', 'Snapshot Frequency', 'Snapshot Frequency', 'Decides how much you lose', 50, 'awsbackup', 2, 'Once a day, he says. Or once an hour. It\'s your data.',
    'Snapshots run nightly, but the business can lose at most an hour of orders. The last failure lost twenty-two hours.',
    { snap: 'Back up at least as often as the RPO: hourly, or continuous backups for point-in-time recovery.', backup: 'A backup plan with a rule that matches the RPO.' },
    { lifecycle: 'Moving old copies to cold storage doesn\'t make new ones more often.' }, [w(10), r(10), up(), b(12)]);
  F('archivists', 'The Archivist Twins', 'Archivists', 'Two keepers of every copy, on both shores, who must fall together', 88, 'awsbackup', 3, 'One keeps the near shore\'s copies, one the far\'s. Each says the other has the good one.',
    'Backups live in the same account and Region as production. One compromised admin, or one lost Region, takes them all.',
    { copy: 'Copy recovery points to a vault in another account, and another Region.', backup: 'One backup plan, with its copy rules, for everything tagged.', test: 'Then restore from the copy, to prove it.', snap: 'And as often as the RPO says.' },
    { lifecycle: 'Aging the copies out isn\'t protecting them.' }, [r(12), w(12), b(14), up(3), w(14)]);
  F('archtwin', 'The Far Archivist', 'Far Archivist', 'The other twin, with the other copies', 34, 'awsbackup', 1, 'She has the far shore\'s boxes.', 'Her copies are in the same account as his.',
    { copy: 'Another account, another Region.', backup: 'The same plan, copied.' }, { lifecycle: 'Not the point.' }, [w(9), r(8)]);
  // Floor 7, the Lock Room
  F('governance', 'Governance Mode', 'Governance', 'A lock a privileged admin can lift', 30, 'objlock', 1, 'Locked, he says, unless you\'re important. He thinks you might be.',
    'The backups are under Object Lock in governance mode. A stolen admin role with s3:BypassGovernanceRetention deletes them all.',
    { compliance: 'Compliance mode: nobody can shorten or lift it, root included.', vaultlock: 'For AWS Backup, Vault Lock in compliance mode.' },
    { governance: 'More governance is more bypassable lock.' }, [r(7), w(7), b(8)]);
  F('compliance', 'Compliance Mode', 'Compliance', 'A lock nobody can lift, set by mistake', 30, 'objlock', 1, 'He\'s locked a test file for ten years. He can\'t help it either.',
    'A test upload was locked in compliance mode for ten years. Nobody, root included, can delete it before then.',
    { governance: 'Try retention in governance mode first, where a privileged admin can undo a mistake.', lifecycle: 'It can\'t be deleted, but a lifecycle rule can still move it to cheaper storage while it waits.' },
    { compliance: 'More compliance mode is the problem, not the fix.', admin: 'Root can\'t lift compliance mode either.' }, [w(7), r(7), up()]);
  F('legalhold', 'Legal Hold', 'Legal Hold', 'A hold with no date on it at all', 28, 'objlock', 1, 'Nobody knows when he ends. Not even him.',
    'Documents in a lawsuit must be kept until the case closes, a date nobody knows. Retention periods need a date.',
    { legalhold: 'A legal hold: no date, removed by someone with s3:PutObjectLegalHold when the case ends.' },
    { lifecycle: 'A lifecycle rule can\'t expire a version under a hold.' }, [r(7), b(7), r(6)]);
  F('lifecycler', 'The Lifecycle Rule', 'Lifecycle Rule', 'A rule that would have aged the vault out', 50, 'lifecycle6', 2, 'He was only meant to save money. He was going to save it by deleting everything after 90 days.',
    'A lifecycle rule expires noncurrent versions after 90 days, and the legal team needs them for seven years.',
    { compliance: 'Lock what must be kept: Object Lock stops even a lifecycle rule from expiring a locked version.', vaultlock: 'Vault Lock sets a minimum retention nobody can shorten.', lifecycle: 'And fix the rule to match the policy: transition, then expire after seven years.' },
    { governance: 'Governance doesn\'t stop a bad rule written by someone allowed to bypass it.' }, [w(10), r(10), up(), b(12)]);
  F('smiths', 'The Lock Smiths', 'Lock Smiths', 'Two smiths who argue about which lock to fit, and fit both', 90, 'objlock', 3, 'One fits locks anyone important can open. The other fits locks nobody can.',
    'Every vault needs the right lock: governance where admins must be able to fix mistakes, compliance where nobody may, a hold where there\'s no date.',
    { compliance: 'Compliance mode for what nobody may touch.', governance: 'Governance mode where a privileged admin must be able to.', legalhold: 'A legal hold where there\'s no date.', vaultlock: 'Vault Lock for the backups themselves.' },
    { admin: 'Root can\'t pick a compliance lock.', allow: 'An Allow doesn\'t open a lock.' }, [r(12), w(13), b(14), up(3), w(14)]);
  F('smithtwin', 'The Other Smith', 'Other Smith', 'The twin smith, on the far shore', 34, 'objlock', 1, 'He fits the other lock.', 'Whatever his brother fitted, he fitted the opposite.',
    { compliance: 'The lock nobody lifts.', governance: 'The lock an admin can.' }, { admin: 'No key opens his.' }, [w(9), r(9)]);
  // Floor 8, the Clock Room
  F('pending', 'Pending Deletion', 'Pending Deletion', 'A key counting down to the end of its window', 52, 'keydelete', 2, 'He ticks. Every turn he ticks louder.',
    'A KMS key is scheduled for deletion with days left. Every app that tries to use it now fails, and nobody has noticed.',
    { cancel: 'kms:CancelKeyDeletion, before the window closes.', enable: 'Then EnableKey: a cancelled deletion leaves it disabled.' },
    { rotate: 'Rotating a key doesn\'t stop its deletion.' }, [r(10), w(10), up(), b(12)]);
  F('window', 'The Deletion Window', 'Deletion Window', 'The last days of a key\'s waiting period', 92, 'keydelete', 3, 'Seven to thirty days, he says. You\'re on the last one.',
    'Kyu\'s second copy is encrypted under a key in its waiting period. When the window closes, the key material is destroyed, and the copy with it.',
    { cancel: 'Cancel the deletion inside the window.', enable: 'And it comes back disabled: someone has to enable it.', mrk: 'Deleting a primary waits for its replicas too.' },
    { rotate: 'Rotation never stopped a deletion.', backup: 'A backup of encrypted data is no use without the key.' }, [r(13), w(13), b(15), up(3), w(15)]);
  F('windowtwin', 'The Countdown\'s Echo', 'Countdown', 'The window\'s twin: the replica key\'s own countdown', 34, 'keydelete', 1, 'Tick. Tock.', 'The replica key, scheduled too.',
    { cancel: 'Cancel this one as well.' }, { rotate: 'Rotation won\'t save it.' }, [r(9), w(9)]);
  // Floor 9, the Keeper's Room: Kagemaru, and the mirror across the lake with your lead's face.
  F('kagemaru', 'Kagemaru', 'Kagemaru', 'Freya\'s Champion since 1984. Every hit on him fails over to his twin across the lake unless both are hit', 98, 'keydelete', 3, 'Under the hood: a shadow, and a grin. "I\'m on everyone\'s side. That\'s what makes it so funny."',
    'He holds Freya\'s backup, locked in compliance mode for ten thousand years, and Seymour\'s tape. He pins gifts into your hands that turn on whoever plays them.',
    { cancel: 'The deletion he could have cancelled, and didn\'t.', compliance: 'Nobody can delete what\'s in his vault before its date. Not even him.', health: 'Fail his twin and him in the same turn.', active: 'Seconds of data lost and minutes down: you know what that costs now.' },
    { allow: 'He sells permissions. He isn\'t moved by them.', admin: 'He\'s seen every key in the band. Freya\'s too.', weighted: 'He\'s already on every side.' },
    [r(13), pin('debt', 2, 'random', 'A pin, marked down'), w(14), b(16), up(3), pin('page', 2, 'least', 'A gift, on the house'), w(15)], { denies: ['adminaccess'] });
  const MIRROR = { mira: ['Mira, the List Finished', 'The list is finished. Every name crossed out, in a hand very like hers.'],
    kai: ['Kai, Hana in a Jar', 'A jar on a shelf, and a glow in it that looks like a person.'],
    seoyeon: ['Seo-yeon, at the Head of the Cult', 'The Cult\'s army behind her, very politely.'],
    dutch: ['Dutch, in the Polished Badge', 'The badge shines. He asks you to sit.'] };
  Object.keys(MIRROR).forEach(id => F('mir' + id, MIRROR[id][0], 'Mirror', 'Your lead, as they\'d be if they\'d stayed with Freya, fighting from across the lake', 40, 'drtiers', 1, MIRROR[id][1],
    'Kagemaru\'s twin is your own reflection. Every hit you land on him, the reflection heals, unless you hit it too.',
    { health: 'Fail the reflection in the same turn.', failover: 'Take the twin down with him.', compliance: 'What\'s locked stays locked. Even for a reflection.' },
    { weighted: 'Half of you is still you.' }, [r(9), w(9), b(10)], { mirror: id }));
  Object.assign(SD.enemies, E);

  // ---------- Field Notes and Policy Sorts ----------
  Object.assign(SD.fieldNotes, {
    r6page9: { title: 'Kyu\'s page 9: health checks and failover', c: 'routing53',
      ev: 'api.twinwater.example   failover, primary   -> ALB in us-east-1   (health check hc-1: HTTPS /deep, every 30 s)\napi.twinwater.example   failover, secondary -> ALB in us-west-2\nhc-1: 3 checks failed in a row at 04:12',
      steps: [
        'Route 53 checkers around the world call /deep on the primary every 30 seconds.',
        '/deep touches the database too, so a dead database fails the check, not just a dead web server.',
        'Three failures in a row and hc-1 is unhealthy.',
        'The primary record is attached to hc-1, so Route 53 stops answering with it.',
        'It answers with the secondary instead: us-west-2 gets the traffic.',
        'When hc-1 passes again, the primary comes back. A failover record needs a health check; a weighted or latency one only skips endpoints that have one too.'] },
    r6dr: { title: 'RPO and RTO, worked', c: 'drtiers',
      ev: 'Last good backup: 12:00\nRegion lost:      15:10\nRestore takes 45 min; launching and checking the app 15 min more',
      steps: [
        'RPO is measured back from the failure to the last good copy: 12:00 to 15:10.',
        'That\'s 3 hours 10 minutes of data that could be lost: an RPO of 190 minutes.',
        'RTO is how long until users are served again: 45 + 15 = 60 minutes.',
        'To lose less, copy more often or continuously: replication, not nightly backups.',
        'To be down for less, keep more running in the second Region: pilot light, then warm standby.',
        'Choose the cheapest strategy that meets both numbers, then test it.'] },
    r6page10: { title: 'Kyu\'s page 10: which store copies how', c: 'replicas',
      ev: 'S3 bucket, DynamoDB table, Aurora MySQL cluster, RDS for PostgreSQL instance\nAll in us-east-1, all needed in eu-west-1 if us-east-1 is lost',
      steps: [
        'S3: versioning on both buckets, a replication rule, Replication Time Control for a 15-minute target. Existing objects: Batch Replication.',
        'DynamoDB: add a replica Region to make it a global table. Every Region writes; last writer wins.',
        'Aurora: a global database, storage copied in about a second, one writer, failover in minutes.',
        'RDS: a cross-Region read replica, asynchronous, promoted if the primary\'s Region is lost.',
        'Encrypted with KMS? The far Region needs a key too: a multi-Region key or its own.',
        'Then fail over once on purpose, to prove it works.'] },
    r6edge: { title: 'The Edge: one header in the cache key', c: 'edge6',
      ev: 'GET /menu   headers: Accept-Language: ja, User-Agent: (300 kinds), Cookie: session=..., X-Twin: near\nThe page changes only with Accept-Language.',
      steps: [
        'CloudFront looks things up by the cache key: by default, the host and path.',
        'Put every header in the key and every visitor gets their own copy: a cache hit ratio near zero.',
        'The page changes only with the language, so only Accept-Language goes in the cache policy.',
        'Cookies and other headers the origin still needs go in an origin request policy instead: forwarded, not keyed.',
        'Now every Japanese visitor shares one cached copy.',
        'Global Accelerator would have routed them faster, but cached nothing.'] },
    r6bill: { title: 'The toll on the bridge, counted', c: 'costnet',
      ev: 'Private instances -> NAT gateway (AZ a) -> S3, same Region: 2 TB a day\nInstances in AZs b and c reach that NAT across zones\nNAT data processing: $0.045 per GB (us-east-1)',
      steps: [
        '2 TB a day is about 2,000 GB, and the NAT charges for every one: about $90 a day, $2,700 a month.',
        'The instances in zones b and c also pay cross-AZ transfer to reach it, both ways.',
        'An S3 gateway endpoint is free, and in the route table: S3 traffic stops going through the NAT at all.',
        'A NAT gateway in each zone keeps the rest of the traffic in its own zone.',
        'Cost Explorer, grouped by usage type, shows NatGateway-Bytes falling the next day.',
        'Tag the gateways, so the next bill says whose they are.'] },
    r6lock: { title: 'Locks, and who can open them', c: 'objlock',
      ev: 'Bucket with versioning and Object Lock\nv1: governance, retain until 2027-01-01\nv2: compliance, retain until 2033-01-01\nv3: legal hold ON',
      steps: [
        'DELETE with no version ID: S3 adds a delete marker. Every locked version stays where it is.',
        'Deleting v1 needs s3:BypassGovernanceRetention and the bypass header. Without both, refused.',
        'Deleting v2 before 2033: refused for everyone, root included. Compliance mode can\'t be shortened.',
        'Deleting v3: refused until someone with s3:PutObjectLegalHold turns the hold off.',
        'A lifecycle rule can move them to colder storage, but it can\'t expire a locked version.',
        'Vault Lock does the same for AWS Backup\'s recovery points.'] },
    r6clock: { title: 'The Deletion Window', c: 'keydelete',
      ev: 'ScheduleKeyDeletion  key 1234abcd   PendingWindowInDays: 7\nDecrypt              key 1234abcd   KMSInvalidStateException (pending deletion)',
      steps: [
        'A key scheduled for deletion waits 7 to 30 days. This one: 7.',
        'Pending deletion, it can\'t be used. Every Decrypt now fails, and CloudTrail records each failure.',
        'A metric filter on those failures and an alarm would have warned somebody on day one.',
        'Inside the window, kms:CancelKeyDeletion stops it.',
        'The key comes back Disabled, not Enabled. Someone allowed to must call EnableKey.',
        'When the window closes, the key material is destroyed. Nothing encrypted under it can be read again.'] }
  });
  Object.assign(SD.policySorts, {
    r6lockdel: { title: 'Who can delete from the vault?', c: 'objlock',
      ev: 'Bucket with versioning and Object Lock\nv1: governance, 90 days left\nv2: compliance, 7 years left\nv3: no retention, legal hold ON',
      reqs: [
        { t: 'DELETE the key with no version ID, as the app role', ok: true, why: 'Allowed: it only adds a delete marker. The locked versions stay.' },
        { t: 'DELETE v1 as an admin with s3:BypassGovernanceRetention, sending the bypass header', ok: true, why: 'Allowed: governance mode lets exactly that through.' },
        { t: 'DELETE v2 as the root user', ok: false, why: 'Denied: compliance mode can\'t be lifted by anyone, root included, until the date.' },
        { t: 'DELETE v3 as an admin with full S3 permissions', ok: false, why: 'Denied: the legal hold stays until it\'s removed with s3:PutObjectLegalHold.' },
        { t: 'DELETE v1 as an admin with the bypass permission, but no bypass header', ok: false, why: 'Denied: governance mode needs the header as well as the permission.' }] },
    r6keyuse: { title: 'Which key calls work?', c: 'keydelete',
      ev: 'mrk-1 primary, us-east-1: key policy allows app-role\nmrk-1 replica, eu-west-1: key policy allows admins only\nkey-2: deletion cancelled an hour ago, not enabled since',
      reqs: [
        { t: 'app-role calls Decrypt with mrk-1 in us-east-1', ok: true, why: 'Allowed: the primary\'s key policy names it.' },
        { t: 'app-role calls Decrypt with the mrk-1 replica in eu-west-1', ok: false, why: 'Denied: the replica has its own key policy, and it names admins only.' },
        { t: 'app-role calls Decrypt with key-2', ok: false, why: 'Refused: a cancelled deletion leaves the key Disabled until EnableKey.' },
        { t: 'An admin calls EnableKey on key-2', ok: true, why: 'Allowed: that\'s how a saved key comes back.' },
        { t: 'An admin calls DescribeKey on key-2 while it\'s still disabled', ok: true, why: 'Allowed: a disabled key can still be described; it just can\'t encrypt or decrypt.' }] },
    r6vault: { title: 'Vault Lock, after the grace time', c: 'awsbackup',
      ev: 'Backup vault: Vault Lock, compliance mode, min retention 1 year, max 7 years, grace time over\nbackup-admin role: backup:* on the vault',
      reqs: [
        { t: 'A backup job with a retention of 3 years', ok: true, why: 'Allowed: inside the vault\'s minimum and maximum.' },
        { t: 'backup-admin deletes a recovery point that is 2 months old', ok: false, why: 'Denied: the vault\'s minimum retention is a year, and compliance mode binds everyone.' },
        { t: 'The root user removes the Vault Lock', ok: false, why: 'Denied: after the grace time, a compliance-mode lock is permanent.' },
        { t: 'A backup job with a retention of 30 days', ok: false, why: 'Refused: shorter than the vault\'s minimum retention, so the job fails.' },
        { t: 'A copy rule copies each recovery point to a vault in another account', ok: true, why: 'Allowed: copying out doesn\'t shorten anything, and protects against losing the account.' }] },
    r6mesh: { title: 'Which connections get through?', c: 'mesh',
      ev: 'VPC A peered with VPC B; VPC B peered with VPC C\nVPC D and VPC E attached to transit gateway tgw-1, routes in place\nService S in VPC P, offered through PrivateLink to VPC Q',
      reqs: [
        { t: 'An instance in A connects to one in B', ok: true, why: 'Allowed: they\'re peered, with routes.' },
        { t: 'An instance in A connects to one in C, through B', ok: false, why: 'Dropped: VPC peering isn\'t transitive.' },
        { t: 'An instance in D connects to one in E', ok: true, why: 'Allowed: a transit gateway routes between its attachments.' },
        { t: 'An app in Q calls service S through its interface endpoint', ok: true, why: 'Allowed: that\'s what the endpoint is for.' },
        { t: 'Service S opens a connection into VPC Q', ok: false, why: 'No: PrivateLink only lets the consumer start connections to the service, never the other way.' }] }
  });

  // ---------- Events ----------
  Object.assign(SD.expeditionEvents, {
    r6mioear: { id: 'r6mioear', title: 'Mio\'s Ear', who: null, text: 'Mio is sitting on a step with her ear against the wall. "That one\'s pretending," she whispers, pointing at a stair that says it\'s fine.',
      choices: [
        { label: 'Ask her which health check would catch it', out: 'Right: each of you takes a Health Check. Wrong: the stair you trusted gives way, and the team loses 6 SLA.', fx: { ask: { c: 'health53', right: { card: 'r6-health' }, wrong: { sla: -6 } } } },
        { label: 'Share your snack with her', out: 'She eats it in two bites. "You can go up that one. It\'s honest." The team recovers 10 SLA.', fx: { sla: 10 } }] },
    r6probe: { id: 'r6probe', title: 'The Readiness Probe', who: null, text: 'A container sits on the far shore\'s steps, wide awake, warming up its cache. Every 10 seconds something checks on it, decides it\'s dead, and replaces it.',
      choices: [
        { label: 'Work out why it keeps being killed', out: 'Right: each of you takes a Readiness Probe. Wrong: it\'s replaced again, and the team loses 6 SLA.', fx: { ask: { c: 'readiness', right: { card: 'r6-ready' }, wrong: { sla: -6 } } } },
        { label: 'Let it warm up in peace', out: 'Three minutes later it serves you tea. The team recovers 8 SLA.', fx: { sla: 8 } }] },
    r6lighthouse: { id: 'r6lighthouse', title: 'The Old Lighthouse', who: null, text: 'An old lighthouse whose lamp can\'t be rewired: its maker is long gone. When the lamp\'s hardware fails, the whole shore goes dark.',
      choices: [
        { label: 'Make it reliable without touching it', out: 'Right: one of you refactors a card. Wrong: the lamp fails while you argue, and the team loses 6 SLA.', fx: { ask: { c: 'legacy', right: { upgrade: 1, who: 'one' }, wrong: { sla: -6 } } } },
        { label: 'Leave a coin for the keeper', out: 'Each of you pays 10 bits. The keeper leaves you each a card from his box.', fx: { cost: 10, card: 'common' } }] },
    r6quota: { id: 'r6quota', title: 'The Oil Store', who: null, text: 'The far shore\'s oil store: a sign says "400 lamps on the day". The shelf holds oil for 32.',
      choices: [
        { label: 'Work out what to raise before the day', out: 'Right: each of you takes a Quota Alarm. Wrong: the lamps run dry, and the team loses 6 SLA.', fx: { ask: { c: 'quotaalarm', right: { card: 'r6-quota' }, wrong: { sla: -6 } } } },
        { label: 'Fill your own lamps', out: 'Each of you gains 15 bits\' worth of oil.', fx: { bits: 15 } }] },
    r6edgev: { id: 'r6edgev', title: 'The Edge', who: null, text: 'A café at the end of the bridge serves the same menu to everyone, but writes a new copy for every traveller whose hat is different. The kitchen can\'t keep up.',
      choices: [
        { label: 'Decide what goes in the cache key', out: 'Right: each of you takes One Header in the Key. Wrong: the kitchen floods, and the team loses 6 SLA.', fx: { ask: { c: 'edge6', right: { card: 'r6-cachekey' }, wrong: { sla: -6 } } } },
        { label: 'Have the menu of the day', out: 'It\'s cached, and it\'s very good. The team recovers 10 SLA.', fx: { sla: 10 } }] },
    r6kyukey: { id: 'r6kyukey', title: 'The Key for Kyu\'s Copy', who: null, text: 'A ledger on the Sealed Twin\'s wall: "Copy 2 of Kyu. Encrypted. Key scheduled for deletion by F." The window has days left.',
      choices: [
        { label: 'Work out what could still save it', out: 'Right: each of you takes Cancel Deletion. Wrong: the ledger page crumbles, and the team loses 6 SLA.', fx: { ask: { c: 'keydelete', right: { card: 'r6-cancel' }, wrong: { sla: -6 } } } },
        { label: 'Copy down the key ID', out: 'You write it on your hand. Each of you gains 15 bits.', fx: { bits: 15 } }] },
    r6files: { id: 'r6files', title: 'The Applicants\' Files', who: null, text: 'A box of Bru\'s prayer logs, from the Mailroom: who read the four prayers the night Freya chose them. Two readers. One of them an hour after her.',
      choices: [
        { label: 'Work out what kind of record shows a read', out: 'Right: each of you gains 20 bits and the team 8 SLA. Wrong: the team loses 6 SLA.', fx: { ask: { c: 'cloudtrail', right: { bits: 20, sla: 8 }, wrong: { sla: -6 } } } },
        { label: 'Keep the box for the confrontation', out: 'Your lead tucks it under one arm.', fx: {} }] },
    r6stall: { id: 'r6stall', title: 'Kagemaru\'s Stall', who: 'kagemaru', per: true, text: 'A stall, here, inside the vault. Kagemaru waves a glove. "Everything marked down, my friends. You\'ll want it all for the last floors. Ah ha ha."',
      choices: [
        { label: 'Trade your AdministratorAccess for something you need', out: 'AdministratorAccess goes over the counter. Back come Compliance Mode and Test the Restore. "Least privilege! How grown up."', fx: { trade: { give: 'adminaccess', get: ['r6-comply', 'r6-test'] } } },
        { label: 'Buy something marked down (15 bits)', out: 'It\'s exactly what you needed. That\'s what worries you.', fx: { cost: 15, card: 'uncommon' } },
        { label: 'Walk past', out: '"Next time, then." He giggles.', fx: {} }] }
  });

  // ---------- Questions ----------
  // The bank questions each concept asks (js/qpick.js picks one at random), the chapter's ELI5 lines in js/c6-help.js.
  D.Q = {
    regionsaz: ['saa-1-202', 'saa-1-201', 'saa-2-06', 'saa-2-02', 'saa-2-131', 'saa-2-122'],
    routing53: ['saa-2-04', 'saa-2-205', 'saa-2-117', 'saa-2-118', 'saa-2-119', 'saa-2-217', 'saa-2-218', 'saa-4-230'],
    health53: ['saa-2-850', 'dva-4-314', 'dva-4-401', 'saa-2-219', 'dva-4-120', 'saa-2-563', 'saa-2-306'],
    drtiers: ['saa-2-03', 'saa-2-121', 'saa-2-120', 'saa-2-05'],
    readiness: ['dva-4-124', 'dva-4-313'],
    quotaalarm: ['dva-4-122', 'saa-2-129'],
    legacy: ['saa-2-130', 'saa-2-305', 'saa-2-216'],
    replicas: ['saa-2-123', 'saa-2-125', 'saa-2-851', 'saa-2-852', 'saa-1-230', 'saa-4-439', 'saa-2-124'],
    mesh: ['saa-3-119', 'saa-4-124', 'saa-4-229', 'saa-1-114', 'saa-3-461'],
    hybrid6: ['saa-1-125', 'saa-3-121', 'saa-4-125', 'saa-4-234', 'saa-4-228'],
    edge6: ['saa-3-02', 'saa-3-220', 'saa-3-462', 'saa-3-221', 'dva-4-215', 'dva-4-216', 'dva-4-319', 'saa-4-232'],
    costnet: ['saa-1-03', 'saa-4-122', 'saa-4-126', 'saa-4-235', 'saa-4-127', 'saa-4-440'],
    costtools: ['saa-4-04', 'saa-4-115', 'saa-4-217', 'saa-4-216', 'saa-4-411', 'saa-4-226', 'saa-4-225', 'saa-4-111', 'saa-4-213', 'saa-4-402', 'saa-4-218', 'saa-4-108', 'saa-4-120'],
    stacksets: ['dva-3-853', 'dva-3-132'],
    immutable: ['saa-2-127', 'dva-3-215', 'dva-3-206'],
    mrkeys: ['dva-2-854', 'dva-2-207'],
    keydelete: ['dva-2-855', 'dva-2-856'],
    objlock: ['saa-1-857', 'saa-1-05', 'saa-1-227', 'saa-1-134', 'dva-1-603'],
    awsbackup: ['saa-1-226', 'saa-1-137', 'saa-2-212', 'saa-2-213', 'saa-4-222'],
    lifecycle6: ['saa-4-01', 'dva-1-604', 'saa-4-104']
  };
  Object.keys(D.Q).forEach(c => D.Q[c].forEach(id => {
    const q = (SD.bank || []).find(x => x.id === id);
    if (q && !SD.questions.some(x => x.id === id)) SD.questions.push(Object.assign({}, q, { c }));
  }));
  // One of a concept's questions (or, for an earlier chapter's concept, one of its own), at random.
  D.pickQ = c => (D.Q[c] ? SD.qpick(D.Q[c], { c }) : SD.qpick(SD.questions.filter(q => q.c === c && q.id && !q.lp && q.type !== 'explain')));

  // ---------- The expeditions ----------
  const intro = (...l) => l.map(([who, text]) => ({ who, text }));
  const XP = (id, name, blurb, back, floors, more) => Object.assign({ id, name, who: ['mira', 'kai', 'seoyeon', 'dutch'], opens: () => !!(SD.c6world && SD.c6world.on), sev: 0.85, dmg: 0.85, blurb, back,
    cafe: { title: 'A Lakeside Café', who: null, name: 'The lakeside café', text: 'A café with a twin across the water. When you order, the far one\'s waiter writes it down too, a moment later.' },
    camp: { title: 'A Jetty to Rest On', text: 'A jetty over still water. Sit for a minute, or sharpen one of your cards on the boards. Each of you chooses one.' },
    tapeLine: [{ who: 'lead', text: 'Seymour\'s tape. We\'re back on our feet. Again, and better.' }], floors }, more);
  const fl = o => Object.assign({ map: '6' }, o);
  const ROW = {
    a: [['fight', 'notes', 'fight'], ['event', 'fight', 'sort'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'board'], ['camp', 'event', 'fight'], ['fight', 'elite', 'notes'], ['sort', 'fight', 'board'], ['fight', 'event', 'fight'], ['camp', 'cafe', 'camp']],
    b: [['fight', 'notes', 'fight'], ['notes', 'fight', 'event'], ['fight', 'board', 'notes'], ['elite', 'cafe', 'fight'], ['camp', 'fight', 'event'], ['fight', 'notes', 'board'], ['event', 'elite', 'fight'], ['fight', 'board', 'fight'], ['camp', 'cafe', 'camp']],
    // The Keeper's Room: no incidents, only the evidence and the stall, then him.
    keep: [['event', 'notes', 'event'], ['board', 'sort', 'board'], ['notes', 'event', 'notes'], ['cafe', 'board', 'camp'], ['event', 'notes', 'sort'], ['board', 'event', 'board'], ['notes', 'sort', 'notes'], ['event', 'board', 'event'], ['camp', 'cafe', 'camp']]
  };
  SD.expeditions = (SD.expeditions || []).concat([
    XP('r6stairs', 'The Twin Stairs', 'Floors 82 to 86: a stair down each shore of the lake, every flight with a twin. The Near Shore, then the Far Shore.', 'Back to the jetty', [
      fl({ name: 'The Near Shore', gate: 'THE TWIN STAIRS · THE NEAR SHORE', beat: 'Twins that wake when their brothers fall, and a heartbeat that lies.', boss: 'watchman', bossTitle: 'The Doubled Watchman', bossPack: { ids: ['watchman', 'watchtwin'] }, fade: 5,
        plan: ROW.a, fights: ['oneaz', 'standby', 'coin', { ids: ['oneaz', 'standby'] }, { ids: ['coin', 'standby'] }], elites: ['liar'],
        notes: ['r6page9', 'r6dr'], sorts: ['r6mesh'], events: ['r6mioear', 'r6quota', 'r6lighthouse'],
        intro: intro([null, 'The Near Shore: a stair down the water\'s edge. Every flight has a twin across the lake, and every twin moves a moment after its brother.'], ['lead', { mira: 'Kyu\'s page nine, love. Health checks first.', kai: 'Kyu left a page on this. Nine.', seoyeon: 'Page nine. Read it before you trust any of them.', dutch: 'Page nine. Kyu wrote it for exactly this.' }], ['mate1', 'Which of them is actually standing?']),
        outro: intro([null, 'The Watchman and his twin fall in the same breath. For a moment, both shores are quiet.'], ['mate2', 'He only went down when we told the world he was down.'], ['lead', 'That\'s what a health check is for.']) }),
      fl({ name: 'The Far Shore', gate: 'THE TWIN STAIRS · THE FAR SHORE', beat: 'Pilot lights, warm twins and old lighthouses: how much to keep running, and what it costs.', boss: 'keeper', bossTitle: 'The Lighthouse Keeper', bossPack: { ids: ['keeper', 'keepertwin'] }, fade: 4,
        plan: ROW.b, fights: ['pilot', 'warm', 'active', { ids: ['pilot', 'warm'] }, { ids: ['active', 'pilot'] }], elites: ['restorer'],
        notes: ['r6dr', 'r6page9'], sorts: ['r6mesh'], events: ['r6probe', 'r6lighthouse', 'r6quota'],
        intro: intro(['c6', 'keeper'], [null, 'The Far Shore, where everything the near shore does is kept twice: some of it burning, some of it banked, some of it in boxes.'], ['mate1', 'How much of it has to be running?'], ['lead', 'Depends what we can lose. And how long we can wait.']),
        outro: intro([null, 'The Lighthouse Keeper trims his lamp to exactly what you asked for, and not one candle more.'], ['lead', 'Pay for exactly what you need. Then test it.'], ['mate2', 'Mio said she\'d meet us at camp.']) })
      // Balance (Ladi, 2026-10-21: a gentle rise across the chapter): just under the 0.85 default, the easiest (near 70% clean).
    ], { sev: 0.84, dmg: 0.84 }),
    XP('r6relay', 'The Relay', 'Floors 87 to 93: where everything on one shore is copied to the other. The Copy Room, the Bridges, and the Sealed Twin.', 'Back to the jetty', [
      fl({ name: 'The Copy Room', gate: 'THE RELAY · THE COPY ROOM', beat: 'Every store copies itself to the far shore, each in its own way, and each a little late.', boss: 'splitbrain', bossTitle: 'The Split Brain', bossPack: { ids: ['splitbrain', 'splittwin'] }, fade: 0,
        plan: ROW.a, fights: ['lag', 'lastwriter', 'xread', { ids: ['lag', 'xread'] }, { ids: ['lastwriter', 'lag'] }], elites: ['gtable'],
        notes: ['r6page10'], sorts: ['r6keyuse'], events: ['r6mioear', 'r6edgev', 'r6quota'],
        intro: intro([null, 'The Copy Room: shelves on both shores, and clerks copying every page from one to the other. Some of them are behind.'], ['lead', 'Kyu\'s page ten. It\'s blank. She left it for us to write.'], ['mate1', 'Then we write it.']),
        outro: intro([null, 'The two leaders shake hands, and one of them steps down. The lake road is open again.'], ['mate2', 'One writer. Decided once.']) }),
      fl({ name: 'The Bridges', gate: 'THE RELAY · THE BRIDGES', beat: 'Towns joined in pairs, hubs that charge by the cart, private paths, and one long cable.', boss: 'toll', bossTitle: 'The Bridge Toll', bossPack: { ids: ['toll', 'tolltwin'] }, fade: 3,
        plan: ROW.b, fights: ['tangle', 'hub', 'privpath', 'natbill', { ids: ['tangle', 'natbill'] }], elites: ['longcable'],
        notes: ['r6edge', 'r6bill'], sorts: ['r6mesh'], events: ['r6edgev', 'r6quota', 'r6lighthouse'],
        intro: intro([null, 'The Bridges: every town on the lake joined to every other, some through a hub in the middle, all of them with a toll booth.'], ['mate2', 'Chad would love this place.'], ['lead', 'Count the crossings.']),
        outro: intro([null, 'The Bridge Toll closes his booth. Most of the carts never needed to cross at all.'], ['lead', 'Most of what we paid for was crossing a bridge we didn\'t need.']) }),
      fl({ name: 'The Sealed Twin', gate: 'THE RELAY · THE SEALED TWIN', beat: 'Echoes of the whole band, twins rebuilt from the same image, and a key that lives on one shore.', boss: 'shadow', bossTitle: 'The Keeper\'s Shadow', bossPack: { ids: ['shadow', 'shadowtwin'] }, fade: 3,
        // Balance (2026-10-21): the Shadow at 92% Severity. His floor wiped about half the bots, more than any Vault floor.
        bossSev: 0.92,
        plan: ROW.a, fights: ['drift', 'onekey', { ids: ['oneaz', 'lag'] }, { ids: ['coin', 'tangle'] }, { ids: ['drift', 'natbill'] }], elites: ['immutablee'],
        notes: ['r6page10', 'r6clock'], sorts: ['r6keyuse'], events: ['r6kyukey', 'r6edgev', 'r6mioear'],
        intro: intro([null, 'The Sealed Twin: a copy of the whole band, every floor you\'ve climbed, sealed in glass. Something in it grins at you.'], ['mate1', 'Everything we fought. Again.'], ['lead', 'And something that\'s been watching.']),
        outro: intro([null, 'The Shadow goes back into the water, grinning. On the far shore, a ledger: "Copy 2 of Kyu. Key scheduled for deletion."'], ['lead', 'Two copies.'], ['mate2', 'Seymour\'s bunker. Now.']) })
      // Balance (2026-10-21): a touch under 0.85 and 0.88, with the Shadow softened above: the middle of the rise.
    ], { sev: 0.84, dmg: 0.87 }),
    XP('r6vault', 'The Vault', 'Floors 94 to 99: Kagemaru\'s vault. The Ledger of Copies, the Lock Room, the Clock Room, and the Keeper\'s Room.', 'Out to the jetty', [
      fl({ name: 'The Ledger of Copies', gate: 'THE VAULT · THE LEDGER OF COPIES', beat: 'Copies with no labels, copies nobody tested, and who read the four prayers that night.', boss: 'archivists', bossTitle: 'The Archivist Twins', bossPack: { ids: ['archivists', 'archtwin'] }, fade: 4,
        plan: ROW.a, fights: ['unlabelled', 'untested', { ids: ['unlabelled', 'untested'] }, { ids: ['untested', 'lag'] }, 'drift'], elites: ['snapfreq'],
        notes: ['r6dr', 'r6lock'], sorts: ['r6vault'], events: ['r6files', 'r6stall', 'r6mioear'],
        intro: intro([null, 'The Ledger of Copies: every backup Kagemaru ever kept, on shelves to the ceiling, none of them labelled.'], ['lead', 'He keeps everything.'], ['mate1', 'Because he can sell it.']),
        outro: intro([null, 'The Archivist Twins fall together, each still blaming the other.'], ['mate2', 'Bru\'s logs. Someone read the prayers an hour after Freya did.']) }),
      fl({ name: 'The Lock Room', gate: 'THE VAULT · THE LOCK ROOM', beat: 'Locks an admin can lift, locks nobody can, and holds with no date at all.', boss: 'smiths', bossTitle: 'The Lock Smiths', bossPack: { ids: ['smiths', 'smithtwin'] }, fade: 3,
        plan: ROW.b, fights: ['governance', 'compliance', 'legalhold', { ids: ['governance', 'legalhold'] }, { ids: ['compliance', 'unlabelled'] }], elites: ['lifecycler'],
        notes: ['r6lock'], sorts: ['r6lockdel', 'r6vault'], events: ['r6stall', 'r6mioear', 'r6files'],
        intro: intro([null, 'The Lock Room: a door for every vault, and on each one a lock. Some open for anyone important. Some don\'t open for anyone.'], ['lead', 'Aigerim\'s diary had all of these.'], ['mate2', 'Which ones open for Freya?']),
        outro: intro([null, 'The Lock Smiths put their tools down. Behind them, a door with no lock at all, and a clock on it.'], ['lead', 'The Clock Room.']) }),
      fl({ name: 'The Clock Room', gate: 'THE VAULT · THE CLOCK ROOM', beat: 'A key counting down, and the copy of Kyu it holds.', boss: 'window', bossTitle: 'The Deletion Window', bossPack: { ids: ['window', 'windowtwin'] }, fade: 2,
        plan: ROW.a, fights: [{ ids: ['onekey', 'compliance'] }, { ids: ['lastwriter', 'untested'] }, { ids: ['standby', 'governance'] }, 'drift', { ids: ['natbill', 'legalhold'] }], elites: ['pending'],
        notes: ['r6clock'], sorts: ['r6keyuse'], events: ['r6kyukey', 'r6stall', 'r6files'],
        intro: intro(['c6', 'clock'], [null, 'The Clock Room. On the far wall, the key for Kyu\'s second copy, and a countdown above it with one day left.'], ['lead', 'Inside the window. We can still cancel it.']),
        outro: intro(['c6', 'saved']) }),
      fl({ name: 'The Keeper\'s Room', gate: 'THE VAULT · THE KEEPER\'S ROOM', beat: 'No incidents. Only the evidence, the stall, and him.', boss: 'kagemaru', bossTitle: 'Kagemaru', bossPack: { ids: ['kagemaru', 'mirmira'] }, fade: 0,
        plan: ROW.keep, fights: ['drift'], elites: ['pending'],
        notes: ['r6dr', 'r6lock', 'r6clock'], sorts: ['r6lockdel', 'r6keyuse', 'r6vault'], events: ['r6stall', 'r6files', 'r6kyukey'],
        intro: intro(['c6', 'confront'], [null, 'Twinwater\'s people line both shores to watch. Across the lake, in the water where Kagemaru\'s twin should be, your own reflection steps up.'], ['lead', 'That\'s me.']),
        outro: intro(['c6', 'after']) })
      // Balance (2026-10-21): up from 0.88 and 0.9 to the chapter's hardest, about half clean (0.97 and 1.01 was a third).
    ], { sev: 0.94, dmg: 0.97 })
  ]);
  // A { who: 'c6' } line is a cue for js/c6-world.js, not a line: 'keeper' asks the Lighthouse Keeper's RPO and RTO,
  // 'clock' and 'saved' play the Clock Room, 'confront' the evidence before Kagemaru, and 'after' what he does next.
})();
