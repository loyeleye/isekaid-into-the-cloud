// Chapter 3, the Granaries: its concepts (zone 3), the bank questions it asks filed under them, and each one's Huh???
// and ELI5 lines, plus the glossary terms its questions use. The chapter's own files (js/c3-*.js) ask from these
// pools with SD.qpick; js/c3-raid.js's rooms ask by concept.
// AWS facts follow the current AWS documentation (S3 storage classes and lifecycle, EFS, EBS, FSx, Storage Gateway,
// DataSync, DMS, DynamoDB, DAX, ElastiCache, RDS, Aurora, RDS Proxy, Lambda versions and aliases). Every line here is
// written fresh.
(function () {
  if (!window.SD || !SD.concepts) return;

  // ---------- Concepts ----------
  Object.assign(SD.concepts, {
    s3class: { name: 'S3 Storage Classes and Lifecycle', zone: 3,
      gist: 'S3 Standard is for data read often. Standard-IA and One Zone-IA cost less to store but charge per GB read, bill at least 30 days and at least 128 KB an object. Glacier Instant Retrieval reads in milliseconds (90-day minimum); Glacier Flexible Retrieval needs a restore of minutes to hours (90 days); Glacier Deep Archive is cheapest, with restores of up to 12 hours (Standard) or 48 hours (Bulk) and a 180-day minimum. Intelligent-Tiering moves objects between tiers by their access, with no retrieval fees. Lifecycle rules transition objects down the classes and expire them. Requester Pays makes whoever downloads pay for the requests and the data out. Every request is billed, so millions of tiny objects cost more in PUTs than in storage.',
      page: 'Grain you eat today goes on the shelf. Grain for the winter goes in the cellar. Grain for your grandchildren goes in the ice. — Kyu, page 4' },
    storetype: { name: 'Object, File and Block: S3, EFS, EBS, FSx', zone: 3,
      gist: 'S3 stores objects by key over HTTP, without limit. EFS is a managed NFS file system that many Linux instances, containers and functions can mount at once, across Availability Zones, and it grows and shrinks on its own. EBS is a block volume attached to one instance in one AZ (Multi-Attach aside): gp3 sets IOPS and throughput apart from size, io2 guarantees high IOPS, st1 and sc1 are cheap HDDs for big sequential reads. FSx runs a ready-made file system: Windows File Server (SMB and Active Directory), Lustre (HPC, linked to S3), NetApp ONTAP and OpenZFS.',
      page: 'A sack you hand over the counter. A shelf the whole street can reach. A barrel on one cart. — Kyu' },
    datamove: { name: 'Storage Gateway, DataSync and DMS', zone: 3,
      gist: 'Storage Gateway lets on-premises servers use AWS storage through local protocols: an S3 File Gateway (NFS or SMB shares backed by S3 objects), FSx File Gateway, Volume Gateway (iSCSI, cached or stored volumes) and Tape Gateway (a virtual tape library). DataSync copies files online between NFS, SMB, HDFS, other clouds and S3, EFS or FSx, keeping metadata, checking integrity and running on a schedule. AWS DMS migrates databases with little downtime, keeping changes flowing (CDC); the Schema Conversion Tool converts a schema to a different engine.',
      page: 'Move the harvest on the night road, and check every sack at the other end. — Kyu' },
    ddbkey: { name: 'Partition Keys, Capacity and Throttling', zone: 3,
      gist: 'DynamoDB spreads items across partitions by the partition key. One key gets at most about 3,000 reads and 1,000 writes a second, so a key that takes most of the traffic (a hot key) throttles while the table has capacity left. Pick a key with many values used evenly, or shard a hot one with a suffix: random spreads writes, calculated (from something the reader knows) also lets a reader find one item. Adaptive capacity shifts throughput toward busy partitions but can\'t beat the per-key limit. On-demand mode bills per request and suits unknown or spiky traffic; provisioned mode with auto scaling is cheaper for steady traffic. CloudWatch Contributor Insights shows the hottest keys.',
      page: 'Spread across everyone, nobody gets throttled. — Hana, in the margin' },
    ddbindex: { name: 'GSIs, LSIs, Query and Scan', zone: 3,
      gist: 'A Query reads one partition key\'s items, narrowed by a sort key condition (=, <, BETWEEN, begins_with), and pays only for what it reads. A Scan reads the whole table; a filter expression throws items away after they are read and paid for. A global secondary index has its own keys and throughput, can be added any time, and is eventually consistent; if it can\'t keep up, it throttles the table\'s writes. A local secondary index shares the table\'s partition key with a different sort key, supports strong reads, and must be made when the table is. Projections choose which attributes an index copies. Results come in pages: pass LastEvaluatedKey back as ExclusiveStartKey.',
      page: 'Ask for the shelf, not the whole granary. — Kyu, page 5' },
    ddbwrite: { name: 'Consistency, Conditional Writes and Transactions', zone: 3,
      gist: 'Reads are eventually consistent by default (half the cost) and may miss a write made a moment ago; ConsistentRead returns the latest, on the table and LSIs only. A read unit is one strong read a second of up to 4 KB; a write unit, one write of up to 1 KB. A condition expression makes a write fail unless the item is as expected: attribute_not_exists for create-only, a version number for optimistic locking. UpdateItem changes single attributes, and SET x = x + 1 or ADD counts without a read. TransactWriteItems does up to 100 actions all or nothing. Batch writes can return UnprocessedItems to retry.',
      page: 'Write only if nobody wrote since you looked. — Kyu' },
    ddbstream: { name: 'TTL, Streams and the 400 KB Limit', zone: 3,
      gist: 'Time to Live deletes items whose Number attribute (epoch seconds) is in the past, in the background, typically within a few days, and uses no write capacity, so reads should still filter expired items. DynamoDB Streams keeps each item change for 24 hours, in order per item; its view type decides what a record holds: KEYS_ONLY, NEW_IMAGE, OLD_IMAGE or NEW_AND_OLD_IMAGES, and only a record written after the stream is on exists. Lambda reads a stream through an event source mapping with filters, retries and bisecting. An item can be at most 400 KB: compress it, or keep the big part in S3.',
      page: 'The ledger remembers what it was, for a day, if you asked it to. — Kyu' },
    caching: { name: 'Caching: DAX and ElastiCache', zone: 3,
      gist: 'Lazy loading (cache-aside) reads the cache first and, on a miss, reads the database and fills the cache: only what is asked for gets cached, but a fresh item can be stale until its TTL. Write-through updates the cache on every write: always fresh, but it caches things nobody reads. A TTL bounds staleness either way. DAX is an in-memory cache for DynamoDB with the same API and microsecond reads; strongly consistent reads go straight through it. ElastiCache runs Valkey, Redis OSS (replicas, failover, sorted sets) or Memcached (simple, multithreaded, no replication). Evictions mean the cache is too small.',
      page: 'Keep warm what they ask for. Throw out what\'s gone cold. — Grandma Wen' },
    rdsaurora: { name: 'RDS and Aurora: Failover, Replicas and Proxies', zone: 3,
      gist: 'A Multi-AZ deployment keeps a synchronous standby in another AZ for automatic failover; the standby of a Multi-AZ DB instance serves no reads. Read replicas take reads, replicate asynchronously and so lag. Aurora has a cluster endpoint (the writer), a reader endpoint (spread over replicas) and storage that grows on its own; Aurora Serverless v2 scales capacity with load. RDS Proxy pools connections, so a storm of Lambda functions doesn\'t exhaust the database, and makes failovers quicker. Automated backups allow point-in-time restore, which always creates a new instance.',
      page: 'The choir sings a beat behind the cantor. Ask the cantor what was just sung. — Sir Aurelian' },
    purpose: { name: 'Purpose-Built Databases', zone: 3,
      gist: 'Pick the engine by the shape of the questions: relational (RDS, Aurora) for joins and transactions; key-value (DynamoDB) for single-digit-millisecond lookups at any scale; document (DocumentDB, MongoDB-compatible); wide-column (Keyspaces, Cassandra-compatible); graph (Neptune) for links several hops deep; time series (Timestream); in-memory (ElastiCache, MemoryDB as a durable primary); search (OpenSearch) for full text; warehouse (Redshift) for analytics. DMS and the Schema Conversion Tool move data between them.',
      page: 'A family tree isn\'t a ledger. Don\'t keep it in rows. — the Archivist\'s margin' },
    lambdaver: { name: 'Lambda Versions and Aliases', zone: 3,
      gist: 'Publishing a version freezes the function\'s code and configuration under a number; $LATEST is the only one you can change. An alias is a named pointer to a version (never $LATEST with weights), so callers use the alias and you move it, or split traffic between two versions with AdditionalVersionWeights. SAM\'s AutoPublishAlias publishes and moves an alias on each deploy, with DeploymentPreference for canary or linear shifts and PreTraffic and PostTraffic hooks. API Gateway stage variables can pick the alias per stage.',
      page: 'live points at 3 until 4 has been tasted. — Kai, on the kitchen whiteboard' }
  });
  SD.links.push(
    { id: 'ddbkey-kinesis', a: 'ddbkey', b: 'kinesis', text: 'A DynamoDB partition key and a Kinesis partition key do the same job: they decide where a record goes, so one hot value overloads one place.' },
    { id: 'ddbstream-lambdasqs', a: 'ddbstream', b: 'lambdasqs', text: 'Lambda reads a DynamoDB stream with an event source mapping, as it reads a queue, with batches, retries and filters.' },
    { id: 'caching-ddbwrite', a: 'caching', b: 'ddbwrite', text: 'A cache is eventually consistent by nature: a strongly consistent read has to skip it.' },
    { id: 's3class-s3life', a: 's3class', b: 's3life', text: 'The same lifecycle rules that expire old versions move current objects down the storage classes.' },
    { id: 'rdsaurora-lambdaconc', a: 'rdsaurora', b: 'lambdaconc', text: 'Every concurrent Lambda execution may open its own database connection; RDS Proxy shares a few among them.' },
    { id: 'lambdaver-lambdaconc', a: 'lambdaver', b: 'lambdaconc', text: 'Provisioned concurrency is set on a version or an alias, never on $LATEST.' }
  );

  // ---------- Questions ----------
  // Bank questions filed under the chapter's concepts. Rooms, events, Field Notes and collectibles pick from these.
  const POOLS = SD.c3pools = {
    s3class: ['saa-4-700', 'saa-4-701', 'saa-4-702', 'saa-4-703', 'saa-4-102', 'saa-4-02'],
    storetype: ['saa-3-01', 'saa-2-126', 'saa-3-06', 'saa-2-132', 'saa-3-104', 'dva-1-321', 'saa-3-101', 'dva-3-401'],
    datamove: ['saa-3-103', 'saa-3-202', 'saa-3-201', 'saa-3-128', 'saa-4-107'],
    ddbkey: ['dva-1-220', 'dva-4-212', 'dva-1-325', 'dva-4-106', 'dva-4-10', 'saa-4-117', 'saa-4-05', 'dva-1-700'],
    ddbindex: ['dva-1-07', 'dva-1-08', 'dva-1-222', 'dva-1-223', 'dva-1-224', 'dva-4-213', 'dva-1-324', 'dva-4-700', 'dva-1-237'],
    ddbwrite: ['dva-1-229', 'dva-1-230', 'dva-1-231', 'dva-1-234', 'dva-1-10', 'dva-1-225', 'dva-1-228', 'dva-1-232'],
    ddbstream: ['dva-1-235', 'dva-1-236', 'dva-1-241', 'dva-1-213', 'dva-1-201'],
    caching: ['dva-1-11', 'dva-1-12', 'dva-1-240', 'dva-4-219', 'dva-1-319', 'dva-1-238', 'saa-2-113', 'saa-3-05', 'dva-4-405', 'dva-1-242'],
    rdsaurora: ['dva-1-18', 'dva-1-405', 'dva-1-401', 'saa-2-02', 'saa-2-131', 'saa-2-112', 'saa-4-118', 'saa-3-215', 'saa-2-700'],
    purpose: ['dva-1-243', 'saa-3-114', 'saa-3-113', 'saa-3-115', 'saa-3-218', 'saa-3-112', 'saa-3-216'],
    lambdaver: ['dva-1-208', 'dva-3-211', 'dva-3-210', 'dva-3-02'],
    lambdaconc: ['dva-4-203', 'dva-4-204', 'dva-4-101']
  };
  Object.keys(POOLS).forEach(c => POOLS[c].forEach(id => {
    const b = (SD.bank || []).find(q => q.id === id);
    if (b && !SD.questions.some(q => q.id === id)) SD.questions.push(Object.assign({}, b, { c }));
  }));

  // ---------- Huh??? ----------
  Object.assign(SD.huh, {
    s3class: 'Storage classes are rooms in a granary. The front shelf costs the most but you grab things instantly. The cellar is cheaper, but every trip down costs a coin and you pay for at least a month of space. The ice house is cheapest of all, but it takes half a day (or two) to thaw a sack out. Lifecycle rules are the farmhand who moves sacks down the rooms as they go cold, and throws them out when they\'re too old.',
    storetype: 'Three ways to keep stuff. A sack (S3 object): hand it over the counter by its label, as many as you like. A shelf (EFS or FSx): everyone in the street can reach in at once. A barrel (EBS): bolted to one cart, fast, but only that cart can use it.',
    datamove: 'Moving house for data. Storage Gateway is a magic doorway in your old house that opens onto the cloud granary, so your old tools keep working. DataSync is the moving van that copies everything, checks every box, and comes back each night for what changed. DMS moves a whole database while it\'s still being used, and the Schema Conversion Tool translates it if the new house speaks another language.',
    ddbkey: 'A DynamoDB table is a bakery with many counters, and the partition key decides which counter you queue at. If everyone uses the same key, one counter has a line round the block (it\'s throttled) while the others are empty. Give everyone their own key, or split the busy one into ten counters with a number on the end, and the line disappears.',
    ddbindex: 'A Query is asking the librarian for one shelf: fast, and you only pay for that shelf. A Scan is reading every book in the library to find the three you wanted, and paying for all of them. An index is a second catalogue sorted another way, so a new question can be a Query too. A local index has to be printed with the library; a global one can be added later.',
    ddbwrite: 'Eventually consistent reads are a save file that might be a few seconds behind; a strong read waits for the newest one. A conditional write is a rule on the save slot: "only overwrite if nobody saved since I loaded." If someone did, your save bounces, and you load again instead of wiping their progress. A transaction is a trade window: both sides happen, or neither does.',
    ddbstream: 'TTL is an expiry date on a potion: the game clears expired potions out of your bag eventually, not on the dot, and it\'s free. A stream is the replay log of every change, kept for a day, and you choose how much each entry shows: only which item, the new one, the old one, or both. Nothing is in the replay from before you hit record. And no single item may weigh more than 400 KB.',
    caching: 'A cache is the bread on the counter, so the baker doesn\'t go to the oven every time. Lazy loading only puts bread on the counter when someone asks; write-through puts every fresh loaf out as it\'s baked. A TTL is the "sell by" time. DAX is a counter built for DynamoDB; ElastiCache is a general one. If you ask for bread straight from the oven (a strong read), the counter can\'t help.',
    rdsaurora: 'Multi-AZ is a stunt double standing by in another town: if the star falls over, the double steps in, but the double doesn\'t perform otherwise. Read replicas are backup singers who repeat the song a beat later, so they can take requests but may be slightly behind. RDS Proxy is a host at the door who seats a crowd at a few tables instead of letting everyone build their own. A point-in-time restore builds a brand-new copy of the database as it was at that moment.',
    purpose: 'Use the right tool for the quest. A ledger (relational) for sums and joins, a key-value chest (DynamoDB) for "give me item 42 now", a family tree (graph, Neptune) for "who knows who knows who", a search index (OpenSearch) for "find every page with this word", and a warehouse (Redshift) for big end-of-month reports.',
    lambdaver: 'A version is a saved game you can\'t change. $LATEST is the save you\'re still playing. An alias is a bookmark like "live" or "test" that points at one saved game, so the players use the bookmark and you just move it when the new save is ready, or send a few players to the new one first.'
  });

  // ---------- ELI5 ----------
  Object.assign(SD.eli5, {
    'saa-4-700': 'The cellar charges every sack for a full month, even if you take it out after three days. Stuff you throw out within days belongs on the front shelf, which charges by the day.',
    'saa-4-701': 'The ice house thaws a sack in two speeds: by tomorrow (Standard, half a day) or the cheap slow way (Bulk, up to two days). If you can wait, the slow way costs least.',
    'saa-4-702': 'Front shelf while people read it, cellar when they only sometimes do, ice house when nobody does, then out with it after seven years. Sacks only move down, never back up.',
    'saa-4-703': 'Every trip to the granary door costs a coin. Fifty million one-grain trips cost far more than the grain. Fill a whole sack first, then make one trip.',
    'saa-4-102': 'Turn on the auto-sorter\'s deep-freeze room: anything nobody touched for six months slides into the cheapest ice, and it comes back when someone asks, within the wait you agreed to.',
    'saa-4-02': 'Get the self-sorting shelf. It moves each item to the cheap shelf when nobody reads it and back when someone does, and it never charges you for fetching.',
    'saa-3-01': 'Every server needs to read and write the same files at once and the space should grow by itself: that\'s the shared shelf the whole street can reach, EFS.',
    'saa-2-126': 'Use the shared shelf that\'s built across every town (the Regional kind), and put a door to it in each town, so losing one town doesn\'t lose the shelf.',
    'saa-3-06': 'Hundreds of racers need the same track at full speed, and the map is in the granary: use the speed-run file system (FSx for Lustre) hooked straight to that S3 bucket.',
    'saa-2-132': 'A Windows team share that signs in with the castle\'s roster and survives a town going down: the managed Windows file server, in its two-town (Multi-AZ) version.',
    'saa-3-104': 'They already speak NetApp at home and copy with its own tool. Rent the same machine in the cloud (FSx for NetApp ONTAP) and keep copying the way they always have.',
    'dva-1-321': 'Give the containers a shared shelf with a door that checks their badge (IAM) and a locked tunnel (encryption in transit), and open the shelf\'s door port, 2049, in the firewall.',
    'saa-3-101': 'Reading huge logs start to finish is a long straight road, not a maze. The cheap hard-disk barrel built for long straight reads (st1) does it best for the price.',
    'dva-3-401': 'The new barrel type (gp3) lets you buy speed separately from size, so a small barrel can still be fast. No need to buy a huge one just for speed.',
    'saa-3-103': 'Two magic doorways: one that pretends to be a tape library for the old backup machine, and one that pretends to be a file share but drops every file into the granary as an object.',
    'saa-3-202': 'Put a doorway (S3 File Gateway) in the branch: staff see a normal shared drive that remembers their badges, recent files open fast from the local copy, and everything lands in S3.',
    'saa-3-201': 'Site A keeps the whole barrel at home and sends copies up (stored volumes). Site B keeps only what it used lately at home and the rest in the cloud (cached volumes).',
    'saa-3-128': 'Hire the moving van that copies every box with its labels, checks nothing broke, and comes back every few hours for what changed: DataSync.',
    'saa-4-107': 'The road is empty at night and you have a month, so drive the van every night, and drop the boxes straight into the deepest, cheapest ice.',
    'dva-1-220': 'Everyone queued at one counter. Either split the busy counter into twenty with a number on the end, or give every vote its own counter and keep the contest as a label on it.',
    'dva-4-212': 'One candidate\'s counter is swamped. Make ten copies of the counter, drop each vote on a random one, and add the ten up when you count.',
    'dva-1-325': 'Each sensor gets its own counter (its ID as the key), and its readings are lined up by time, so "this sensor, last hour" is one quick ask.',
    'dva-4-106': 'Turn on the game\'s heat map of who queues where (Contributor Insights), and it shows you which counters are swamped.',
    'dva-4-10': 'For sudden rushes, keep retrying politely with growing waits, and switch to pay-per-customer mode, which opens counters as the rush arrives.',
    'saa-4-117': 'The crowd is the same size every day. Book the counters ahead (provisioned, with a little auto scaling), and buy a season pass (reserved capacity) for the steady part.',
    'saa-4-05': 'Nobody knows when the crowds will come and most days it\'s empty: pay per customer (on-demand), not for counters standing idle.',
    'dva-1-700': 'If you drop each ballot on a random counter, finding one ballot means checking all ten. Work out the counter from the ballot\'s own number instead, and you know exactly where to look.',
    'dva-4-700': 'The side ledger has its own small clerk. When he can\'t keep up, the main counter has to wait for him too: give him at least as many hands as the counter.',
    'dva-1-07': 'The library is sorted by order number, but you want one customer\'s orders by date. Print a second catalogue sorted by customer and date (a global index), and ask that one.',
    'dva-1-08': 'You need a second sort order for the same device, and fresh-off-the-press reads. That\'s a local index, and it must be printed when the library is built.',
    'dva-1-222': 'One reader takes nine hours. Send several readers at once, each given its own section of the library (parallel Scan segments).',
    'dva-1-223': 'Print a slim catalogue that only copies the name and price, and read that instead of hauling every heavy book off the shelf.',
    'dva-1-224': 'You can only ask "starts with" or "between", not "contains", about the sort label. Ask for labels starting with ORDER#2026-10, or between October and November.',
    'dva-4-213': 'Stop reading fifty million tickets to find a few hundred. Put a sticker only on the escalated ones, catalogue just the stickers, and ask the catalogue.',
    'dva-1-324': 'The answer comes in pages. Each page ends with a bookmark; hand the bookmark back to get the next page, until there\'s no bookmark.',
    'dva-1-237': 'Make a catalogue by status and ask that, and add a rule that forbids any request that would read the whole library.',
    'dva-1-229': 'Add a rule to the save: "only create this name if nobody has it yet". The second player\'s save bounces instead of erasing the first.',
    'dva-1-230': 'Don\'t read the score, add one in your head and write it back. Tell the game "add 1 to the score" and it does it for everyone in order.',
    'dva-1-231': 'Replacing the whole character sheet to change one stat wipes the rest. Edit just the one stat instead.',
    'dva-1-234': 'A trade window: take points from one, give to the other, with a check that the giver has enough. Both happen or neither does.',
    'dva-1-10': 'Write the save\'s version number on it. When you save, the game checks the number still matches what you loaded; if someone saved since, yours bounces.',
    'dva-1-225': 'The second catalogue is a moment behind, and it can\'t do fresh reads. Fetch the brand-new order fresh from the main shelf and add it to the list yourself.',
    'dva-1-228': 'Reads are counted in 4 KB scoops: 9 KB needs 3 scoops, and a not-quite-fresh read costs half, so 1.5 per read, times 120 reads a second.',
    'dva-1-232': 'A batch can come back "done, except these". Look at the leftovers and send them again, waiting a little longer each time.',
    'dva-1-235': 'Write each session\'s expiry time on it as a number, and switch on the game\'s auto-cleaner (TTL) pointed at that number. It clears them for free.',
    'dva-1-236': 'The replay log only recorded which item changed. Start a new log that records both the before and after pictures, and point the function at it.',
    'dva-1-241': 'An item can\'t weigh more than 400 KB. Squash it smaller (gzip), or keep the big thing in the granary (S3) and just its label in the table.',
    'dva-1-213': 'Tell the doorman to only wake the function for changes where the order became SHIPPED, instead of waking it for every change.',
    'dva-1-201': 'When a batch keeps failing, cut it in half until you find the bad apple, limit the retries, and send the bad one to a lost-and-found list.',
    'dva-1-11': 'Check the counter first. If the bread is there, hand it over. If not, bake it, put a loaf on the counter with a sell-by time, and hand it over.',
    'dva-1-12': 'Bolt a super-fast counter built for DynamoDB (DAX) in front, and keep asking in the same words. The answers come back in microseconds.',
    'dva-1-240': 'When you insist on bread straight from the oven (a strong read), the counter waves you through to the oven. It can\'t make that faster.',
    'dva-4-219': 'People see old profiles because the counter only refreshes when the old loaf goes stale. Put the fresh loaf on the counter every time a profile is saved.',
    'dva-1-319': 'If the counter is empty, bake and put a loaf out (lazy loading), and give every loaf a sell-by time so ones nobody wants get thrown out.',
    'dva-1-238': 'A leaderboard is a sorted list, and Redis-style caches have sorted lists built in. Add a copy in a second town that takes over if the first fails.',
    'saa-2-113': 'The answer can be five minutes old, so keep it on the counter for five minutes. Every page load in between is instant.',
    'saa-3-05': 'The same questions come thousands of times and the answers rarely change. Keep the answers on the counter, so the kitchen stops cooking the same dish.',
    'dva-4-405': 'Loaves are being thrown out to make room before anyone eats them. The counter is too small: get a bigger counter or more of them.',
    'dva-1-242': 'Cook each list once, keep it on the counter for ten minutes, and check the counter before cooking again.',
    'dva-1-18': 'Hundreds of functions each build their own table at the database. Put a host (RDS Proxy) at the door who seats them all at a few shared tables.',
    'dva-1-405': 'The backup singers are a beat behind. When you need to hear what you just sang, ask the lead singer (the cluster endpoint).',
    'dva-1-401': 'Use the "whoever is lead singer now" address (the cluster endpoint), which always follows the lead, instead of one singer\'s own name.',
    'saa-2-02': 'Get a stunt double in another town for failover (Multi-AZ), and a backup singer for the report crowd (a read replica). The double doesn\'t take requests.',
    'saa-2-131': 'Put the host at the door (RDS Proxy): when the star swaps with the stunt double, the host keeps the guests seated, so the app barely notices.',
    'saa-2-112': 'Hire and send home backup singers as the crowd grows and shrinks, and send the dashboard to the "any backup singer" address so it never needs to know which.',
    'saa-4-118': 'Swap the giant always-on server for one that grows and shrinks with the crowd (Aurora Serverless v2), so you stop paying for the peak all day.',
    'saa-3-215': 'The host at the door (RDS Proxy) keeps the password in the vault (Secrets Manager), and the functions show their badge (IAM) instead of knowing any password.',
    'saa-2-700': 'Rewinding builds a brand-new copy of the database as it was at 14:00. The old one isn\'t touched; you point the app at the new copy.',
    'dva-1-243': 'People want to search with typos and get the best match first. Keep a search index (OpenSearch) in sync with the table automatically, and search that.',
    'saa-3-114': 'Fraud rings are friends of friends of friends. That\'s a family tree, so use the database built for trees (Neptune).',
    'saa-3-113': 'They already speak MongoDB. Move to the managed database that speaks it too (DocumentDB), and the code keeps working.',
    'saa-3-115': 'The Cassandra app moves to the managed Cassandra (Keyspaces), and the sensor readings over time go to the database built for time (Timestream).',
    'saa-3-218': 'Carts are "give me cart X, fast, for millions": a key-value chest (DynamoDB). Orders need sums and joins: a ledger (Aurora).',
    'saa-3-112': 'Three busy days a month: let the warehouse call in extra helpers just for the rush (concurrency scaling), instead of hiring a bigger crew all month.',
    'saa-3-216': 'It needs Redis speed but must be the only, lasting copy: use the in-memory database that keeps its data safe (MemoryDB), not a cache.',
    'dva-1-208': 'You changed the save you\'re still playing, but the live bookmark points at an old saved game. Save a new version and move the bookmark to it.',
    'dva-3-211': 'A bookmark can\'t split players onto the unsaved game. Save the new code as version 7, then send 5% of players there.',
    'dva-3-210': 'Add a test before players move (PreTraffic) and another after they all have (PostTraffic). If either fails, the deploy rolls back.',
    'dva-3-02': 'Write "use the alias named in this stage\'s note" into the door, write dev or prod on each stage\'s note, and let each alias be called.',
    'dva-4-203': 'Reserve 200 seats for checkout that nobody else may take, and cap the batch job so it can\'t grab them all. Reserving seats costs nothing.',
    'dva-4-204': '5,000 requests a second that each take 0.3 s need about 1,500 seats at once, and you have 1,000. Ask for more seats before the launch.',
    'dva-4-101': 'The function itself was capped at 20 seats. Raise its own cap, since the account has plenty to spare.'
  });

  // ---------- Glossary ----------
  SD.glossary.push(
    ['Standard-IA', /Standard-IA|Infrequent Access/, 'An S3 class for data read rarely: cheaper to store, charged per GB read, and billed for at least 30 days.'],
    ['Glacier Deep Archive', /Deep Archive/, 'The cheapest S3 class: objects must be restored first, in up to 12 hours (Standard) or 48 (Bulk).'],
    ['Intelligent-Tiering', /Intelligent-Tiering/, 'An S3 class that moves each object between access tiers by how often it is read, with no retrieval fees.'],
    ['lifecycle rule', /lifecycle/i, 'An S3 rule that moves objects to cheaper classes, or deletes them, after a number of days.'],
    ['Requester Pays', /Requester Pays/, 'A bucket setting: whoever downloads pays for the requests and data transfer, not the bucket owner.'],
    ['EFS', /\bEFS\b/, 'Amazon EFS: a managed NFS file system many machines can mount at once; it grows on its own.'],
    ['EBS', /\bEBS\b/, 'Amazon EBS: a block volume, a virtual disk, attached to one EC2 instance in one Availability Zone.'],
    ['FSx', /\bFSx\b/, 'Amazon FSx: managed Windows File Server, Lustre, NetApp ONTAP or OpenZFS file systems.'],
    ['Storage Gateway', /Gateway\b/, 'AWS Storage Gateway: on-premises file, volume or tape interfaces backed by AWS storage.'],
    ['DataSync', /DataSync/, 'AWS DataSync: an online service that copies files between storage systems and AWS, with checks.'],
    ['partition key', /partition key/i, 'The DynamoDB attribute that decides which partition an item lives in. Queries name one value of it.'],
    ['sort key', /sort key/i, 'The second part of a DynamoDB key: it orders items within one partition key and allows range conditions.'],
    ['global secondary index', /global secondary index|\bGSI\b/i, 'A DynamoDB index with its own keys and throughput, which can be added any time; reads are eventually consistent.'],
    ['local secondary index', /local secondary index|\bLSI\b/i, 'A DynamoDB index with the table\'s partition key and another sort key; made only with the table.'],
    ['Scan', /\bScan\b/, 'A DynamoDB read of every item in a table or index, paid for in full, whatever a filter throws away.'],
    ['ConditionExpression', /ConditionExpression|condition expression/i, 'A test on a DynamoDB write: the write happens only if the item matches it.'],
    ['TTL', /\bTTL\b|Time to Live/, 'Time to live: how long something may be kept. In DynamoDB, an expiry attribute that deletes items in the background.'],
    ['DAX', /\bDAX\b/, 'DynamoDB Accelerator: an in-memory cache in front of DynamoDB with the same API and microsecond reads.'],
    ['RDS Proxy', /RDS Proxy|\bproxy\b/, 'A managed connection pool for RDS and Aurora, so many clients share few database connections.'],
    ['read replica', /read replica|Aurora Replica/i, 'A copy of a database, updated asynchronously, that serves reads and may lag behind the writer.'],
    ['Multi-AZ', /Multi-AZ/, 'A deployment with a standby copy in another Availability Zone that takes over automatically on failure.'],
    ['alias', /\balias\b/i, 'A Lambda alias: a named pointer to one function version (or two, with traffic weights).']
  );
})();
