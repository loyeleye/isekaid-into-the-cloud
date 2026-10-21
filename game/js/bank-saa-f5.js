// Question bank batch: SAA coverage for AWS Data Exchange, Amazon AppFlow, Amazon MSK, Amazon MQ, Amazon Neptune,
// Amazon DocumentDB and Amazon Keyspaces. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Domain 2: Design Resilient Architectures
  { id: "saa-2-531", exam: "SAA", saa: "2.2", topic: "mq", type: "mc",
    q: "A company runs an Amazon MQ for ActiveMQ active/standby broker in one AWS Region. Its services exchange orders over JMS. A new disaster recovery rule says that if the whole Region fails, messaging must resume in a second Region with the messages already sent still available, without changing the services' messaging code or writing replication code. Which solution meets these requirements?",
    opts: [
      "Create a replica broker in the second Region with Amazon MQ cross-Region data replication, and fail over to it if the Region fails.",
      "Keep the active/standby broker on Amazon EFS storage, which already stores every message durably across several Availability Zones in the Region.",
      "Run a single-instance broker in the second Region, and add Route 53 failover records that send clients to it when the primary broker fails its health check.",
      "Replace the broker with Amazon SQS FIFO queues in both Regions, and have each service send every order to the queues in both Regions."
    ], a: 0,
    no: [null,
      "EFS storage protects against the loss of an Availability Zone, not a Region. A Region-wide failure still takes the broker and its messages down.",
      "Route 53 can move clients to the second broker, but nothing copies messages to it, so the messages already sent would be missing there.",
      "SQS uses a different API from JMS, so every service's messaging code would change, and the double sends are custom replication code."],
    why: "Amazon MQ for ActiveMQ cross-Region data replication (CRDR) asynchronously copies messages from an active/standby primary broker to an active/standby replica broker in another Region. A failover request through the Amazon MQ API promotes the replica, and clients keep using the same protocols.",
    doc: ["https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/crdr-for-active-mq.html"] },

  { id: "saa-2-532", exam: "SAA", saa: "2.2", topic: "documentdb", type: "multi", hint: "Select TWO.",
    q: "A company runs its product catalog on an Amazon DocumentDB instance-based cluster in eu-west-1. A new office in ap-southeast-1 needs local-latency reads of the catalog. The company also needs a disaster recovery plan for a Region-wide outage with an RPO measured in seconds and an RTO measured in minutes. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Turn the cluster into a DocumentDB global cluster with a secondary cluster in ap-southeast-1, and point the office's reads at it.", ok: true },
      { t: "If eu-west-1 has an outage, run a global cluster failover that promotes the ap-southeast-1 secondary cluster to primary.", ok: true },
      { t: "Add read replica instances to the eu-west-1 cluster in other Availability Zones, and send the office's reads to the reader endpoint.", ok: false, no: "Replicas in other Availability Zones stay in eu-west-1, so the office still reads across Regions and a Region outage takes them down too." },
      { t: "Copy the cluster's automated snapshots to ap-southeast-1 each night, and restore the newest one if eu-west-1 has an outage.", ok: false, no: "A nightly snapshot copy loses up to a day of writes, and a restore takes far longer than minutes. It fits a cheap backup-and-restore plan." },
      { t: "Create a second regional cluster in ap-southeast-1, and have the application write every catalog change to both clusters.", ok: false, no: "Dual writes from the application are custom replication that can drift apart, and they slow every write with a cross-Region call." }
    ],
    why: "A DocumentDB global cluster replicates from the primary Region to read-only secondary Regions using dedicated infrastructure, typically in under a second, so a secondary serves local reads. In a Region outage, a failover promotes a secondary cluster to primary within minutes, with an RPO typically measured in seconds.",
    doc: ["https://docs.aws.amazon.com/documentdb/latest/devguide/global-clusters.html", "https://docs.aws.amazon.com/documentdb/latest/devguide/global-clusters-disaster-recovery.html"] },

  { id: "saa-2-533", exam: "SAA", saa: "2.2", topic: "keyspaces", type: "mc",
    q: "A company stores customer orders in an Amazon Keyspaces (for Apache Cassandra) table. After a test script once wrote bad data into a production table, the company requires the ability to restore the table to any second within the last 30 days, even if someone drops the table. The protection must not slow the table down, and the team doesn't want to schedule backup jobs. Which solution meets these requirements?",
    opts: [
      "Turn on point-in-time recovery for the table, and restore it to a new table at the chosen timestamp when a bad write or a drop happens.",
      "Rely on the three copies that Amazon Keyspaces keeps across Availability Zones, and read the healthy copy when a bad write or a drop happens.",
      "Add the table to a multi-Region keyspace, so that a second Region always holds a copy of the data to recover from when a bad write happens.",
      "Run the cqlsh COPY TO command each night to export the table to CSV files, upload them to Amazon S3, and load the newest back with COPY FROM."
    ], a: 0,
    no: [null,
      "The copies in each Availability Zone receive every write and every drop too, so none of them holds the data from before the mistake.",
      "Multi-Region replication copies the bad writes and deletes to the other Region within about a second, so it protects against a Region failure, not bad data.",
      "Nightly exports can only go back to the last export, not to any second, and they are a scheduled backup job the team would have to run."],
    why: "Keyspaces point-in-time recovery keeps continuous backups, so a table can be restored to any second in the last 35 days, and a deleted table can be restored to just before its deletion. Restores go to a new table and have no performance impact on the base table.",
    doc: ["https://docs.aws.amazon.com/keyspaces/latest/devguide/PointInTimeRecovery.html", "https://docs.aws.amazon.com/keyspaces/latest/devguide/PointInTimeRecovery_HowItWorks.html"] },

  { id: "saa-2-534", exam: "SAA", saa: "2.2", topic: "keyspaces", type: "multi", hint: "Select TWO.",
    q: "A global gaming company uses Amazon Keyspaces (for Apache Cassandra) through CQL drivers in us-east-1. It is adding an application stack in eu-west-1, and players in each Region must read and write with single-digit millisecond latency. If one Region degrades, players must keep playing from the other Region with almost no downtime, and the team must not run Cassandra repairs or a database failover. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Store the tables in an Amazon Keyspaces multi-Region keyspace that replicates them to both us-east-1 and eu-west-1.", ok: true },
      { t: "Route players with Amazon Route 53 latency-based records that have health checks on each Region's application stack.", ok: true },
      { t: "Run a self-managed Cassandra cluster on EC2 with one data center in each Region, and schedule nodetool repair jobs.", ok: false, no: "Self-managed Cassandra adds the cluster management and repair work that the team must avoid. Keyspaces replicates and resolves conflicts itself." },
      { t: "Turn on point-in-time recovery, and restore the tables into eu-west-1 whenever us-east-1 becomes degraded.", ok: false, no: "Point-in-time recovery restores into the same Region and can take hours, so it gives neither local writes nor near-zero downtime." },
      { t: "Plan a runbook that promotes the eu-west-1 replica tables to writers when the us-east-1 tables become degraded.", ok: false, no: "Multi-Region keyspaces are active-active: every Region already takes writes, so there is no promotion or failover step to run." }
    ],
    why: "Keyspaces multi-Region replication is active-active: each Region reads and writes locally, and replication is asynchronous with last-writer-wins conflict resolution, typically within a second. If a Region degrades, Route 53 sends traffic to a healthy Region without promoting anything.",
    doc: ["https://docs.aws.amazon.com/keyspaces/latest/devguide/multiRegion-replication.html", "https://docs.aws.amazon.com/keyspaces/latest/devguide/multiRegion-replication_how-it-works.html"] },

  // Domain 3: Design High-Performing Architectures
  { id: "saa-3-531", exam: "SAA", saa: "3.5", topic: "dataexchange", type: "mc",
    q: "A financial analytics team uses Amazon Redshift Serverless. It is licensing market data from a provider that keeps the data in its own Amazon Redshift warehouse and updates it many times a day. Analysts must join the provider's tables with their own in SQL and always see the provider's latest data. The team doesn't want to build any extract, transform and load (ETL) pipeline or store copies. Which solution meets these requirements?",
    opts: [
      "Subscribe to the provider's AWS Data Exchange product that has a datashare for Amazon Redshift, and create a database from it.",
      "Set up a Redshift federated query to the provider's warehouse, and create an external schema that points at the provider's tables.",
      "Ask the provider to share a Redshift snapshot with the team's account each day, and restore the newest snapshot into the workgroup.",
      "Ask the provider to UNLOAD its tables to Amazon S3 every hour, and run COPY commands that load the new files into the workgroup."
    ], a: 0,
    no: [null,
      "Redshift federated queries reach RDS and Aurora PostgreSQL and MySQL databases, not another Redshift warehouse.",
      "A restored snapshot is a full copy that is a day old, so analysts would not see the provider's updates during the day.",
      "UNLOAD and COPY on a schedule is an ETL pipeline that stores copies, and the data is up to an hour old."],
    why: "With an AWS Data Exchange datashare for Amazon Redshift, subscribers get read-only access to the provider's tables and views and query them in place, without ETL, and see the latest data as soon as the provider updates it.",
    doc: ["https://docs.aws.amazon.com/data-exchange/latest/userguide/subscribing-to-Redshift-product.html"] },

  { id: "saa-3-532", exam: "SAA", saa: "3.5", topic: "dataexchange", type: "mc",
    q: "A company keeps a 400 TB dataset in an Amazon S3 bucket and adds to it every day. It has signed agreements to give three partner companies read access for 12 months from their own AWS accounts. The partners must see the latest objects without copies being made, access must end automatically when the agreements expire, and the data must not be listed for sale in AWS Marketplace. Which solution meets these requirements?",
    opts: [
      "Create an AWS Data Exchange data set with Amazon S3 data access on the bucket, and send each partner a data grant with an end date.",
      "Set up S3 Replication from the bucket to a bucket in each partner account, and remove the replication rules when the agreements expire.",
      "Generate presigned URLs for the objects that are valid for 12 months, and send the partners a new list of URLs each day as objects arrive.",
      "Publish the data set as an AWS Data Exchange product with a public offer, and set the subscription duration in the offer to 12 months."
    ], a: 0,
    no: [null,
      "Replication makes a copy of every object in each partner's bucket, and the partners would keep those copies after the agreements end.",
      "Presigned URLs signed with Signature Version 4 last at most 7 days, and a URL for each object every day is a delivery process the company must run.",
      "A public offer lists the product in the AWS Marketplace catalog, which the company must not do. Data grants share data without a listing."],
    why: "AWS Data Exchange for Amazon S3 shares direct access to a bucket or prefixes without copies: it provisions an S3 access point for read-only access. A data grant sends access to a specific AWS account and can carry an end date, after which access is revoked.",
    doc: ["https://docs.aws.amazon.com/data-exchange/latest/userguide/data-grant-publish-s3-data-access-product.html", "https://docs.aws.amazon.com/data-exchange/latest/userguide/creating-data-grants.html"] },

  { id: "saa-3-533", exam: "SAA", saa: "3.4", topic: "appflow", type: "mc",
    q: "A company copies customer records from Salesforce into Amazon S3 with an Amazon AppFlow flow every hour. A new security rule says the record data must move over AWS infrastructure and must never cross the public internet. The company's Salesforce account is enabled for AWS PrivateLink access. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Create a Salesforce connection in Amazon AppFlow with AWS PrivateLink enabled, and switch the flow to it so the flow runs as a private flow.",
      "Add a gateway VPC endpoint for Amazon S3 to the company's VPC, and update the bucket policy to accept writes only through that endpoint.",
      "Replace the flow with a Lambda function in private subnets that calls the Salesforce API through a NAT gateway and writes to Amazon S3.",
      "Set up an AWS Site-to-Site VPN connection to Salesforce's network, and route the AppFlow flow's traffic through the VPN tunnel."
    ], a: 0,
    no: [null,
      "AppFlow does not run inside the company's VPC, so an S3 gateway endpoint there does nothing for the flow, and the Salesforce side still uses public endpoints.",
      "A NAT gateway sends the Salesforce API calls out to the public internet, which breaks the rule, and the function is code to build and run.",
      "AppFlow is a managed service whose flows don't run through a customer's VPN tunnels. Private flows use AWS PrivateLink instead."],
    why: "Amazon AppFlow private flows use AWS PrivateLink for supported SaaS applications such as Salesforce. AppFlow creates the endpoint configuration itself, and the data transfer runs over VPC endpoints instead of the public internet.",
    doc: ["https://docs.aws.amazon.com/appflow/latest/userguide/private-flows.html", "https://docs.aws.amazon.com/appflow/latest/userguide/salesforce.html"] },

  { id: "saa-3-534", exam: "SAA", saa: "3.5", topic: "appflow", type: "multi", hint: "Select TWO.",
    q: "A support team wants every new or changed Salesforce Case record to land in an Amazon S3 data lake as soon as the change happens, rather than waiting for a timed run. Analysts query the data with Amazon Athena, and the team doesn't want to run or schedule AWS Glue crawlers to keep the table definitions current. Change data capture is enabled for Case in Salesforce. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create an Amazon AppFlow flow from Salesforce to Amazon S3 that is set to run on event for Case change events.", ok: true },
      { t: "Turn on the AWS Glue Data Catalog settings in the flow, so that AppFlow creates and updates the tables when it runs.", ok: true },
      { t: "Create an Amazon AppFlow flow from Salesforce to Amazon S3 that runs on schedule once a day with incremental transfer.", ok: false, no: "An incremental schedule only sends changed records, but they arrive at the next timed run, not as the change happens." },
      { t: "Point an AWS Glue crawler at the S3 prefix, and start it from an S3 event notification each time AppFlow writes a file.", ok: false, no: "This still runs a crawler on every write, which the team wants to avoid. AppFlow can write the catalog tables itself." },
      { t: "Create an Amazon Data Firehose stream with Salesforce as its source, and deliver the records to the data lake bucket.", ok: false, no: "Firehose takes records that producers send to it. It has no Salesforce source that reads change events." }
    ],
    why: "AppFlow event-triggered flows run when the source SaaS application raises a change event, and Salesforce Change Data Capture events are supported. Flows that write to S3 can register their output in the AWS Glue Data Catalog on each run, so Athena can query it without crawlers.",
    doc: ["https://docs.aws.amazon.com/appflow/latest/userguide/flow-triggers.html", "https://docs.aws.amazon.com/appflow/latest/userguide/flows-catalog.html"] },

  { id: "saa-3-535", exam: "SAA", saa: "3.3", topic: "documentdb", type: "mc",
    q: "A company is moving a sharded MongoDB cluster that holds hundreds of millions of user profiles to a managed AWS database. Peak traffic reaches millions of writes per second, more than any single writer instance can handle, and the data will grow to petabytes. The application must keep using the MongoDB API, and the team doesn't want to choose or patch instances. Which solution meets these requirements?",
    opts: [
      "Migrate to an Amazon DocumentDB elastic cluster, and shard the profile collections on a high-cardinality shard key.",
      "Migrate to a DocumentDB instance-based cluster on the largest instance class, with 15 replicas to spread the load.",
      "Migrate to a DocumentDB global cluster with secondary clusters in several Regions, writing to the nearest one.",
      "Migrate to Amazon Keyspaces (for Apache Cassandra) in on-demand mode, with each profile as a row keyed by user ID."
    ], a: 0,
    no: [null,
      "An instance-based cluster has one writer, and replicas only serve reads, so the write peak still exceeds what one instance can take.",
      "Secondary clusters in a global cluster are read-only. All writes still go to the single primary cluster.",
      "Keyspaces scales well but speaks CQL, not the MongoDB API, so the application's data access code would be rewritten."],
    why: "DocumentDB elastic clusters use hash-based sharding across up to 32 shards to support millions of reads and writes per second and petabytes of storage with the MongoDB API, and they remove the need to choose, manage or upgrade instances.",
    doc: ["https://docs.aws.amazon.com/documentdb/latest/devguide/docdb-using-elastic-clusters.html", "https://docs.aws.amazon.com/documentdb/latest/devguide/elastic-how-it-works.html"] },

  // Domain 4: Design Cost-Optimized Architectures
  { id: "saa-4-531", exam: "SAA", saa: "4.1", topic: "msk", type: "mc",
    q: "A company runs a provisioned Amazon MSK cluster with Standard brokers. Topics keep 7 days of events on broker storage. A new requirement says consumers must be able to replay 180 days of events in their original order with the existing Kafka consumer code. Most reads are of events from the last few hours. Which solution meets these requirements MOST cost-effectively?",
    opts: [
      "Turn on tiered storage for the cluster and topics, keep a few hours on broker storage, and set the topics' retention to 180 days.",
      "Raise the topics' retention to 180 days, and turn on storage auto scaling so the broker volumes grow as the extra data builds up.",
      "Add brokers to the cluster so the extra partitions and 180 days of retention fit across more broker volumes, then rebalance them.",
      "Change the topics' cleanup policy to compact, so the existing broker storage can hold 180 days of the events for each key."
    ], a: 0,
    no: [null,
      "This works, but it keeps 180 days of data on performance-optimized broker storage, which costs far more than the low-cost tier.",
      "More brokers add compute cost only to hold rarely read data, when tiered storage grows without adding brokers.",
      "Compaction keeps only the latest record for each key, so consumers could not replay every event in order."],
    why: "MSK tiered storage moves data past the local retention limit to a low-cost tier that needs no provisioning, and consumers read it with the same Kafka APIs in its original order. Recent data stays on the faster primary storage.",
    doc: ["https://docs.aws.amazon.com/msk/latest/developerguide/msk-tiered-storage.html"] },

  { id: "saa-4-532", exam: "SAA", saa: "4.3", topic: "neptune", type: "mc",
    q: "A company runs a knowledge graph on an Amazon Neptune cluster with one large provisioned writer instance. Each morning a two-hour job loads and updates millions of relationships, and for the rest of the day the cluster serves only light queries but must stay available. The company wants to cut database cost without manually resizing instances each day. Which solution meets these requirements MOST cost-effectively?",
    opts: [
      "Change the cluster's instances to Neptune Serverless, with a minimum capacity for the light queries and a maximum sized for the morning job.",
      "Add Neptune read replicas with Neptune auto-scaling, so that extra replicas are added during the morning job and removed after it ends.",
      "Stop the Neptune cluster on a schedule after the morning job finishes, and start it again before the next morning job begins.",
      "Move the cluster to a smaller burstable instance class, and let its CPU credits cover the morning job's load and update work."
    ], a: 0,
    no: [null,
      "The morning job is mostly writes, which go only to the writer. Replicas add cost and leave the large writer running all day.",
      "A stopped cluster can't serve the light queries during the day, and the cluster must stay available.",
      "A burstable instance runs out of CPU credits during a two-hour heavy load, so the job slows down badly."],
    why: "Neptune Serverless scales compute up and down in fine-grained Neptune Capacity Units based on demand, so the company pays for high capacity only during the morning job. Instances can be changed from provisioned to serverless without creating a new cluster.",
    doc: ["https://docs.aws.amazon.com/neptune/latest/userguide/neptune-serverless.html"] }
);
