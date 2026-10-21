// Question bank batch: points chapter 3 (the Granaries) teaches that the bank had no question on: S3 minimum storage
// durations, S3 Glacier Deep Archive retrieval times, lifecycle transitions, request costs of tiny objects, write
// sharding with a calculated suffix, a global secondary index throttling its table, and RDS
// point-in-time restore. First written for the chapter's rooms and minigames, then reworded here without the story.
// Same schema and rules as js/bank-dva.js. AWS facts follow the current AWS documentation.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // SAA 4.1: Design cost-optimized storage solutions
  { id: "saa-4-700", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "A team uploads 2 TB of test exports to S3 Standard-IA each Monday and deletes them every Thursday, three days later. The bill shows far more storage charges than three days of 2 TB should cost. Why?",
    opts: [
      "Standard-IA bills each object for at least 30 days of storage, so an object deleted after 3 days is billed as if it stayed for 30.",
      "Standard-IA bills a retrieval fee on every object that is deleted, so each Thursday cleanup is charged as a full read of 2 TB of data.",
      "Standard-IA keeps a hidden copy of each deleted object for 30 days, and that copy is billed at the Standard rate until it expires.",
      "Standard-IA rounds every object up to 128 KB, so the exports are billed as if each one were several times larger than its real size."
    ], a: 0,
    no: [
      null,
      "Deleting an object isn't a retrieval. Retrieval fees apply to reads of the data, not to deletes.",
      "Without versioning, a delete removes the object. Nothing is kept behind and billed at another rate.",
      "Standard-IA does bill small objects as 128 KB, but these exports are large files. The surprise comes from the minimum duration."],
    why: "S3 Standard-IA has a minimum storage duration of 30 days: an object deleted, overwritten or moved earlier is charged for the rest of the 30 days. Short-lived data belongs in S3 Standard, which has no minimum duration.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html"] },

  { id: "saa-4-701", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "Compliance records are kept in S3 Glacier Deep Archive. An auditor asks for one record and is happy to wait until tomorrow, but the restore must be as cheap as possible. Which retrieval option fits, and about how long does it take?",
    opts: [
      "Expedited retrieval, which is the cheapest tier for Deep Archive and returns the object within about 5 minutes of the request.",
      "Bulk retrieval, which is the cheapest tier and typically returns an object from Deep Archive within about 48 hours of the request.",
      "Standard retrieval, which is the cheapest tier for Deep Archive and returns the object within about 1 minute of the request.",
      "No restore is needed, because Deep Archive serves GET requests directly, with a first-byte latency of a few milliseconds."
    ], a: 1,
    no: [
      "Expedited retrieval isn't available for Deep Archive, and where it exists it's the most expensive tier, not the cheapest.",
      null,
      "Standard retrieval from Deep Archive typically takes up to 12 hours, and it costs more than Bulk.",
      "Objects in Deep Archive must be restored before they can be read. Millisecond reads are S3 Glacier Instant Retrieval."],
    why: "S3 Glacier Deep Archive offers two retrieval tiers: Standard, typically within 12 hours, and Bulk, the cheapest, typically within 48 hours. The restore makes a temporary copy that can then be read.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/restoring-objects-retrieval-options.html"] },

  { id: "saa-4-702", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "New invoices in S3 are read often for 30 days, rarely for the next 60, almost never after that, and must be deleted after 7 years. Which lifecycle configuration costs least while keeping each stage readable when it is needed?",
    opts: [
      "Move objects to S3 Glacier Deep Archive on day 1, then restore each invoice with Expedited retrieval whenever someone needs to read it.",
      "Keep everything in S3 Standard for 7 years, and turn on S3 Transfer Acceleration so that the rare reads after 90 days stay inexpensive.",
      "Transition to S3 Standard-IA after 30 days, to S3 Glacier Deep Archive after 90 days, and expire the objects after 7 years.",
      "Transition to S3 One Zone-IA after 1 day, to S3 Standard after 90 days, and expire the objects after 7 years with a second rule."
    ], a: 2,
    no: [
      "The first month of frequent reads would each need a restore, and Expedited retrieval isn't offered for Deep Archive.",
      "Transfer Acceleration speeds up transfers over long distances. It doesn't make storage cheaper, and Standard is the costliest class to keep for years.",
      null,
      "Lifecycle rules can't move objects back up to S3 Standard, and objects must stay 30 days before moving to an IA class."],
    why: "Lifecycle transitions follow the access pattern: S3 Standard while reads are frequent, Standard-IA (allowed after at least 30 days) when they become rare, then Deep Archive for data that's almost never read, with an expiration action at the end of the retention period.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html"] },

  { id: "saa-4-703", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "A fleet of sensors writes each 1 KB reading to S3 as its own object, about 50 million objects a day. The PUT request charges are now many times the storage charges. Which change cuts the cost most?",
    opts: [
      "Write every reading to S3 Glacier Flexible Retrieval instead, because PUT requests to the archive classes are billed at a lower rate.",
      "Turn on S3 Intelligent-Tiering for the bucket, so the small readings move to cheaper tiers on their own after 30 days without access.",
      "Turn on S3 Transfer Acceleration for the bucket, so each PUT request reaches the bucket faster and is billed for less time.",
      "Buffer the readings and write them in batches as larger objects, for example through Amazon Data Firehose to S3."
    ], a: 3,
    no: [
      "PUT requests to the archive classes cost more per request than to S3 Standard, not less.",
      "Intelligent-Tiering doesn't move objects smaller than 128 KB, and it adds nothing to the request charges, which are the problem here.",
      "Transfer Acceleration adds a per-GB charge and doesn't change how many requests are billed.",
      null],
    why: "S3 charges per request. Millions of tiny objects make request charges dominate. Combining many small records into fewer, larger objects (Firehose buffers by size or time) cuts the number of PUTs by orders of magnitude.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html", "https://docs.aws.amazon.com/firehose/latest/dev/buffering-hints.html"] },

  // DVA 1.3: Use data stores in application development
  { id: "dva-1-700", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A DynamoDB table of ballots is throttled because every ballot for one election shares a partition key. The developer will shard the key with a suffix from 1 to 10, and the app must still fetch any single ballot quickly by its BallotId. How should the suffix be chosen?",
    opts: [
      "Pick a random suffix on every write, then read one ballot with a single GetItem call on any one of the ten sharded keys.",
      "Pick a random suffix on every write, then find one ballot by running a Scan with a filter expression on its BallotId value.",
      "Calculate the suffix from a hash of the BallotId, so the reader works out the same suffix and calls GetItem on one key.",
      "Use the same suffix for every ballot in an election, so that the ten partitions together share the writes for that election."
    ], a: 2,
    no: [
      "A random suffix means the ballot could be under any of the ten keys, so one GetItem on one of them usually misses.",
      "A Scan reads the whole table and pays for all of it. That's what the key design is meant to avoid.",
      null,
      "One suffix for everything is one partition key again, so the writes stay on one partition."],
    why: "A random suffix spreads writes well but makes single-item reads expensive, since the reader must try every shard. A calculated suffix, derived from something the reader knows such as a hash of the item's ID, spreads writes and still lets the reader compute the exact key.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html"] },

  // DVA 4.1: Assist in a root cause analysis
  { id: "dva-4-700", exam: "DVA", dva: "4.1", topic: "dynamodb", type: "mc",
    q: "A provisioned DynamoDB table has plenty of unused write capacity, yet PutItem calls on it are throttled. A global secondary index was added last week with 5 write capacity units, and its WriteThrottleEvents metric is high. What is happening?",
    opts: [
      "The table's own write capacity units are split evenly with each of its indexes, so the table now has only half of what it was given.",
      "Writes that change an indexed attribute must also be written to the index, and when the index is throttled the table's writes are too.",
      "Global secondary indexes always use strongly consistent writes, which cost twice as many write capacity units as the table's writes do.",
      "The index was created while the table was still in use, so DynamoDB throttles every write until the index is deleted and made again."
    ], a: 1,
    no: [
      "A global secondary index has its own provisioned throughput. It doesn't share or halve the table's.",
      null,
      "Index updates are applied asynchronously and reads from a GSI are eventually consistent. Writes have no consistency choice to pay for.",
      "An index can be added to a table that's in use. Once it's built, it works like any other; it doesn't need recreating."],
    why: "In provisioned mode a GSI has its own write capacity. If the index can't keep up, DynamoDB throttles writes to the base table that would update it. Give the index at least as much write capacity as the table, or use on-demand mode.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.ThroughputConsiderations.html"] },

  // SAA 2.2: Design highly available and/or fault-tolerant architectures
  { id: "saa-2-700", exam: "SAA", saa: "2.2", topic: "rds", type: "mc",
    q: "At 14:05 someone dropped an important table in an RDS for PostgreSQL database that has automated backups turned on. The team wants the data back exactly as it was at 14:00. What does a point-in-time restore do?",
    opts: [
      "It rewinds the existing DB instance in place to 14:00, keeping its endpoint, so the app needs no change once the restore has finished.",
      "It restores only the dropped table into the existing DB instance, using the transaction logs from just before 14:05 that day.",
      "It promotes the instance's Multi-AZ standby, which still holds the table as it was at 14:00 because it lags a few minutes behind.",
      "It creates a new DB instance with the data as it was at 14:00, and the team then points the app at the new instance's endpoint."
    ], a: 3,
    no: [
      "RDS never restores over the existing instance. A restore always creates a new one.",
      "A point-in-time restore brings back the whole database, as a new instance, not a single table into the old one.",
      "A Multi-AZ standby is replicated synchronously. It dropped the table at the same moment as the primary.",
      null],
    why: "With automated backups, RDS can restore to any second in the retention period, usually up to about five minutes ago. The restore always creates a new DB instance with a new endpoint; you then copy what you need or move the app over to it.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIT.html"] }
);
