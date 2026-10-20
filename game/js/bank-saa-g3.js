// Question bank batch: SAA-C03 Domain 3 gap fill (EMR, Amazon Quick, Lake Formation, DataSync, Storage Gateway, Glue, Batch, scaling metrics, Lambda memory, proxies, EBS, networking), tasks 3.1-3.5. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 3.1: high-performing and hybrid storage
  { id: "saa-3-201", exam: "SAA", saa: "3.1", topic: "storagegateway", type: "multi", hint: "Select TWO.",
    q: "A company has two sites whose servers mount block storage over iSCSI. At site A, a database must have low-latency access to its entire 8 TB dataset, with point-in-time backups kept in AWS. At site B, local disk is nearly full, most data is rarely read, and only recently used data needs local-speed access. Which solutions meet these requirements? (Select TWO.)",
    items: [
      { t: "At site A, deploy a Volume Gateway with stored volumes, so all data stays local and snapshots go to AWS.", ok: true },
      { t: "At site B, deploy a Volume Gateway with cached volumes, so data lives in AWS and hot data is cached locally.", ok: true },
      { t: "At site A, deploy an S3 File Gateway, and mount its NFS file share on the database server.", ok: false, no: "S3 File Gateway serves files over NFS or SMB, not iSCSI block volumes, and only a cache of the data is local." },
      { t: "At site B, deploy a Tape Gateway, and present its virtual tapes to the servers as their disks.", ok: false, no: "Tape Gateway presents a virtual tape library for backup software. Servers can't use tapes as live block storage." },
      { t: "At site A, deploy a Volume Gateway with cached volumes, and size the cache disk for the hot data.", ok: false, no: "Cached volumes keep the primary copy in S3 and only frequently used data locally, so the whole dataset wouldn't be local." }
    ],
    why: "Volume Gateway serves iSCSI volumes. Stored volumes keep the full dataset on premises for low-latency access and back up point-in-time snapshots to AWS. Cached volumes keep the data in S3 and retain only frequently accessed data locally, which cuts on-premises storage.",
    doc: ["https://docs.aws.amazon.com/storagegateway/latest/vgw/WhatIsStorageGateway.html"] },

  { id: "saa-3-202", exam: "SAA", saa: "3.1", topic: "storagegateway", type: "mc",
    q: "A branch office's Windows file server is out of disk space. Staff map a network drive over SMB and sign in with their Active Directory accounts. The company wants the files stored in Amazon S3, where its analytics tools can read them as objects, while recently used files still open at LAN speed in the branch. Which solution meets these requirements?",
    opts: [
      "Deploy an S3 File Gateway in the branch, join it to Active Directory, and create an SMB file share backed by an S3 bucket.",
      "Create an Amazon FSx for Windows File Server file system in the Region, and map it as a drive in the branch over the VPN.",
      "Deploy a Volume Gateway with cached volumes in the branch, and attach the iSCSI volume to the existing Windows file server.",
      "Install an AWS DataSync agent in the branch, and run an hourly task that copies the file server's share into an S3 bucket."
    ], a: 0,
    no: [null,
      "FSx stores files in its own file system, not as S3 objects, and every file open would cross the WAN with no local cache.",
      "Volume Gateway stores block volumes, so the files wouldn't appear in S3 as individual objects for the analytics tools.",
      "DataSync copies data on a schedule. It doesn't free space on the file server or give the branch a cloud-backed share."],
    why: "S3 File Gateway presents an SMB (or NFS) share that can authenticate users with Active Directory, stores each file as an object in S3, and keeps a local cache so recently used data is served with low latency.",
    doc: ["https://docs.aws.amazon.com/filegateway/latest/files3/what-is-file-s3.html", "https://docs.aws.amazon.com/filegateway/latest/files3/CreatingAnSMBFileShare.html"] },

  { id: "saa-3-203", exam: "SAA", saa: "3.1", topic: "ebs", type: "multi", hint: "Select TWO.",
    q: "A company runs a self-managed database on EC2. Its data volume must sustain 150,000 IOPS with consistent sub-millisecond latency, and the data must persist if the instance is stopped. Which steps should a solutions architect take to meet these requirements? (Select TWO.)",
    items: [
      { t: "Store the data on an io2 Block Express volume provisioned with 150,000 IOPS.", ok: true },
      { t: "Run the database on a Nitro-based instance type whose EBS limits exceed that IOPS rate.", ok: true },
      { t: "Store the data on a gp3 volume, and provision its maximum IOPS and throughput.", ok: false, no: "gp3's maximum IOPS per volume is well below 150,000, and it isn't built for sub-millisecond latency." },
      { t: "Store the data on NVMe instance store volumes that are striped together with RAID 0.", ok: false, no: "Instance store data is lost when the instance stops, which the requirement rules out." },
      { t: "Store the data on several st1 volumes that are striped together with RAID 0.", ok: false, no: "st1 is HDD storage tuned for large sequential throughput, not high random IOPS at low latency." }
    ],
    why: "io2 Block Express is the EBS type for workloads that need more than 80,000 IOPS and sub-millisecond latency, up to 256,000 IOPS on Nitro-based instances. An instance's EBS performance is also capped by its instance type, so the instance must support the rate.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-optimized.html"] },

  { id: "saa-3-204", exam: "SAA", saa: "3.1", topic: "ebs", type: "mc",
    q: "For each test run, a company launches database servers whose EBS volumes are created from a 2 TB snapshot. The first queries after launch are very slow while blocks are read for the first time, which skews the test results. The volumes must deliver their full provisioned performance as soon as they are created. What should a solutions architect do?",
    opts: [
      "Turn on fast snapshot restore for the snapshot in the Availability Zones where the volumes are created.",
      "Create the volumes as io2 volumes instead of gp3 volumes, with a higher number of provisioned IOPS.",
      "Raise the provisioned IOPS and throughput on the gp3 volumes created from the snapshot to their maximum.",
      "Copy the snapshot to the same Region with encryption turned on, and create the volumes from the copy."
    ], a: 0,
    no: [null,
      "Any volume type created from a snapshot loads blocks from S3 on first access, so io2 still has the first-read delay.",
      "More provisioned performance doesn't remove the latency of reading each block from the snapshot the first time.",
      "A copied snapshot is still a snapshot. Volumes created from it are initialized the same way on first read."],
    why: "Fast snapshot restore is enabled per snapshot and Availability Zone. Volumes created from it are fully initialized at creation and instantly deliver all of their provisioned performance, without first-access latency.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/ebs-fast-snapshot-restore.html"] },

  { id: "saa-3-205", exam: "SAA", saa: "3.1", topic: "efs", type: "mc",
    q: "A media team stores 200 GiB of project files on an Amazon EFS file system in Bursting throughput mode. A few times a day, render jobs read the files at high throughput for short periods, at unpredictable times. The file system has used all of its burst credits, and the jobs now run slowly. Which change is MOST cost-effective while restoring performance?",
    opts: [
      "Switch the file system to Elastic throughput mode, so throughput scales with each burst and is billed by use.",
      "Switch the file system to Provisioned throughput mode, sized for the peak throughput the render jobs reach.",
      "Write large dummy files to the file system so its baseline throughput and burst credits grow with its size.",
      "Recreate the file system in Max I/O performance mode, and copy the project files to the new file system."
    ], a: 0,
    no: [null,
      "Provisioned throughput bills for peak throughput all day, which is wasteful when the peaks are short and rare.",
      "Paying to store padding data to buy throughput costs more than paying for the throughput actually used.",
      "Max I/O is a previous-generation mode with higher latency, and it doesn't add throughput when credits run out."],
    why: "AWS recommends Elastic throughput for spiky or unpredictable workloads with a low average-to-peak ratio. It scales throughput up and down automatically and charges for the throughput used, while Provisioned suits steady, known requirements.",
    doc: ["https://docs.aws.amazon.com/efs/latest/ug/performance.html"] },

  // Task 3.2: high-performing and elastic compute
  { id: "saa-3-206", exam: "SAA", saa: "3.2", topic: "emr", type: "mc",
    q: "A company runs a persistent Amazon EMR cluster for Spark jobs, and intermediate data is kept in HDFS on the core nodes. Every afternoon, a burst of jobs needs about three times the usual compute for two hours. The company wants to add that capacity at the lowest cost without risking loss of HDFS data. What should a solutions architect do?",
    opts: [
      "Keep the primary and core nodes On-Demand, and add task nodes on Spot Instances for the afternoon burst.",
      "Move the core nodes to Spot Instances, and add more core nodes during the afternoon to absorb the burst.",
      "Add On-Demand core nodes for the afternoon burst, and then remove them again when the jobs have completed.",
      "Launch the entire cluster on Spot Instances, including the primary node, to get the lowest hourly price."
    ], a: 0,
    no: [null,
      "Core nodes store HDFS data, so a Spot interruption on a core node can lose data.",
      "This works, but On-Demand capacity costs more than Spot task nodes for a short, interruptible burst.",
      "Losing the primary or core nodes to Spot interruptions can end the cluster or lose HDFS data."],
    why: "Task nodes process data but store nothing in HDFS, so losing a Spot task node loses no data. EMR's guidance for long-running clusters is On-Demand primary and core nodes with Spot task nodes for extra capacity.",
    doc: ["https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-instances-guidelines.html"] },

  { id: "saa-3-207", exam: "SAA", saa: "3.2", topic: "batch", type: "mc",
    q: "A pharmaceutical company uses AWS Batch. Each night it must run the same containerized analysis against 5,000 input files, one file per run, with each run independent of the others. The team wants to submit the whole night's work as one unit and track it as one job. Which approach meets these requirements with the LEAST operational overhead?",
    opts: [
      "Submit one array job of size 5,000, and have each child job pick its file using AWS_BATCH_JOB_ARRAY_INDEX.",
      "Submit one multi-node parallel job with 5,000 nodes, and have the main node hand out the files to the others.",
      "Submit 5,000 separate jobs from a script, and tag every job with the date so the runs can be tracked together.",
      "Submit one job on the largest instance type, and have the container loop through all 5,000 files in sequence."
    ], a: 0,
    no: [null,
      "Multi-node parallel jobs are for one tightly coupled job across instances, such as MPI, not independent tasks.",
      "This works but means 5,000 submissions and custom tracking, which an array job does in one call.",
      "Processing the files one after another on one host gives up the parallelism Batch provides."],
    why: "An array job runs a collection of child jobs (2 to 10,000) that share one job definition, submitted with a single call and tracked through a parent job ID. Each child gets its index in AWS_BATCH_JOB_ARRAY_INDEX, so it can choose its own input.",
    doc: ["https://docs.aws.amazon.com/batch/latest/userguide/array_jobs.html"] },

  { id: "saa-3-208", exam: "SAA", saa: "3.2", topic: "batch", type: "multi", hint: "Select TWO.",
    q: "A company is moving two batch workloads to AWS Batch. The first is thousands of short jobs that each need 2 vCPUs and 4 GiB of memory and should start quickly, and the team doesn't want to pick instance types. The second is nightly model-training jobs that each need an NVIDIA GPU. Which choices meet these requirements? (Select TWO.)",
    items: [
      { t: "Run the short jobs in a Fargate compute environment, with vCPU and memory set in the job definition.", ok: true },
      { t: "Run the training jobs in a managed EC2 compute environment that allows GPU instance types.", ok: true },
      { t: "Run the training jobs in a Fargate compute environment, and request a GPU in the job definition.", ok: false, no: "AWS Batch recommends EC2 for jobs that need a GPU. Fargate compute environments don't provide GPUs." },
      { t: "Run the short jobs as one multi-node parallel job so they share a single group of instances.", ok: false, no: "Multi-node parallel jobs run one job across several instances. They don't suit thousands of small, independent jobs." },
      { t: "Run the short jobs in an unmanaged EC2 compute environment that the team scales on its own.", ok: false, no: "An unmanaged environment means choosing and scaling instances yourself, the opposite of what the team wants." }
    ],
    why: "With Fargate, Batch sizes compute to each job's requested vCPU and memory and starts jobs faster than launching new EC2 instances. AWS recommends EC2 compute environments when jobs need a GPU, more than 32 vCPUs or a custom AMI.",
    doc: ["https://docs.aws.amazon.com/batch/latest/userguide/when-to-use-fargate.html"] },

  { id: "saa-3-209", exam: "SAA", saa: "3.2", topic: "autoscaling", type: "mc",
    q: "A web app runs on EC2 instances in an Auto Scaling group behind an Application Load Balancer. Most of each request is spent waiting on downstream services, so CPU stays under 30 percent even when users see slow pages. Load tests show each instance stays fast up to about 200 requests per second. Traffic rises and falls at unpredictable times. Which scaling policy should a solutions architect use?",
    opts: [
      "A target tracking policy on the ALBRequestCountPerTarget metric, with a target value of 200.",
      "A target tracking policy on average CPU utilization, with the target value lowered to 20 percent.",
      "A target tracking policy on the load balancer's total RequestCount metric, with a target of 200.",
      "Scheduled scaling actions that add instances at the times when the busiest traffic usually starts."
    ], a: 0,
    no: [null,
      "CPU doesn't track how busy these instances are, so a lower CPU target still scales at the wrong times.",
      "The total request count doesn't fall as instances are added, so it isn't a valid utilization metric for target tracking.",
      "The traffic doesn't follow a schedule, so fixed scaling times would miss the surges."],
    why: "ALBRequestCountPerTarget is a predefined target tracking metric: the average requests per target in the group's target group. It rises and falls in proportion to the number of instances, so the group keeps each instance near the tested limit.",
    doc: ["https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html"] },

  { id: "saa-3-210", exam: "SAA", saa: "3.2", topic: "autoscaling", type: "multi", hint: "Select TWO.",
    q: "A game company runs match servers on EC2 instances in an Auto Scaling group. Each instance can host about 100 players. CPU and network use vary widely by game mode, so neither shows how full a server is. Player numbers surge at random times. The company wants the group to keep each instance at about 80 players. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Have each instance publish its current player count to CloudWatch as a custom metric.", ok: true },
      { t: "Create a target tracking policy on the group's average player count, with a target of 80.", ok: true },
      { t: "Create a target tracking policy on the total players across the fleet, with a target of 80.", ok: false, no: "Total players don't change when instances are added, so the metric can't steer capacity proportionally." },
      { t: "Create a target tracking policy on the predefined ASGAverageNetworkIn metric for the group.", ok: false, no: "The stem says network use varies by game mode, so it doesn't reflect how many players each server holds." },
      { t: "Add a predictive scaling policy that forecasts the number of players from past history.", ok: false, no: "Predictive scaling forecasts recurring patterns. Random surges give it nothing to learn." }
    ],
    why: "Target tracking accepts custom CloudWatch metrics when they describe how busy an instance is and change in proportion to the group size. An average per-instance player count does, so the group adds or removes instances to hold it near the target.",
    doc: ["https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html"] },

  { id: "saa-3-211", exam: "SAA", saa: "3.2", topic: "lambda", type: "mc",
    q: "A Lambda function set to 128 MB of memory sits behind an API. On each call it downloads a 40 MB file from an S3 bucket in the same Region, parses it, and returns a summary. Duration averages 9 seconds, mostly spent downloading, and users want faster responses. The function uses only 90 MB of memory. Which change is MOST likely to cut the response time?",
    opts: [
      "Raise the function's memory setting, because Lambda gives more CPU and network capacity as memory grows.",
      "Turn on provisioned concurrency for the function, so that its execution environments are already initialized.",
      "Turn on S3 Transfer Acceleration for the bucket, and download the file through the accelerated endpoint.",
      "Raise the function's ephemeral storage, so the downloaded file has more room in the /tmp directory."
    ], a: 0,
    no: [null,
      "Provisioned concurrency removes cold-start initialization. It doesn't speed up the download in each invocation.",
      "Transfer Acceleration helps clients far from the bucket's Region. This function already runs in the same Region.",
      "The file already fits in /tmp, and more scratch space doesn't make the download or parsing any faster."],
    why: "Memory is Lambda's main performance lever: CPU is allocated in proportion to memory, and AWS notes that a CPU-, network- or memory-bound function can speed up dramatically when its memory is raised, even if it doesn't use the extra memory.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html"] },

  { id: "saa-3-212", exam: "SAA", saa: "3.2", topic: "lambda", type: "mc",
    q: "A Lambda function is set to 1,024 MB of memory. It splits a large image into tiles and processes them on four parallel worker threads, but monitoring shows the threads take turns rather than running at the same time. The function must finish much faster, and the team wants to keep it on Lambda. What should a solutions architect recommend?",
    opts: [
      "Raise the memory well above 1,769 MB, since more memory gives the function more than one vCPU of CPU power.",
      "Raise the function's reserved concurrency, so that Lambda can run more copies of the function at the same time.",
      "Raise the function's timeout, so that the threads have more time to finish all of the tiles in each invocation.",
      "Turn on provisioned concurrency, so that each invocation starts on an execution environment that is warm."
    ], a: 0,
    no: [null,
      "Reserved concurrency affects how many invocations run at once, not the CPU available to threads inside one invocation.",
      "A longer timeout lets the function run longer but doesn't make the threads run any faster.",
      "Warm environments skip initialization, but the processing still runs on the same small CPU share."],
    why: "Lambda allocates CPU in proportion to memory, and at 1,769 MB a function has the equivalent of one vCPU. Below that, parallel threads share less than one vCPU; raising memory further gives them more CPU to run side by side.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html", "https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html"] },

  { id: "saa-3-213", exam: "SAA", saa: "3.2", topic: "ec2", type: "mc",
    q: "A pricing engine runs on a t3.xlarge instance in standard credit mode. It now runs at about 80 percent CPU around the clock. Its CPU credit balance has dropped to zero, CPU is held to the baseline, and calculations lag. The company needs consistent CPU performance at the lowest cost. What should a solutions architect do?",
    opts: [
      "Move to a fixed-performance instance type, such as a compute optimized C instance, sized for the load.",
      "Switch the t3.xlarge instance to unlimited mode, so that it can keep on bursting above its baseline CPU.",
      "Resize to a t3.2xlarge instance, so that it earns more CPU credits every hour than the current size.",
      "Turn on detailed monitoring, so that the CPU credit balance is reported every minute instead of five."
    ], a: 0,
    no: [null,
      "Unlimited mode charges for surplus credits. At a sustained high average, that costs more than a fixed-performance instance.",
      "Every T3 size has a baseline well below a sustained 80 percent, so the larger instance would also run out of credits.",
      "More frequent metrics show the problem sooner but give the instance no more CPU."],
    why: "Burstable instances suit workloads that usually run below their baseline. When average CPU stays above the breakeven point, a fixed-performance instance (such as M or C) delivers steady CPU for less than a burstable instance in unlimited mode.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/burstable-performance-instances-unlimited-mode-concepts.html"] },

  { id: "saa-3-214", exam: "SAA", saa: "3.2", topic: "ec2", type: "mc",
    q: "A company is deploying a 90-node Apache Cassandra cluster on EC2 in one Availability Zone. Cassandra must place each data replica on a different group of racks so that one hardware failure can't take out every copy, and it needs to know which rack group each node is in. Which solution meets these requirements?",
    opts: [
      "Launch the nodes into a partition placement group with three partitions, and map each partition to a Cassandra rack.",
      "Launch the nodes into a spread placement group, so that every node in the cluster sits on its own distinct rack.",
      "Launch the nodes into a cluster placement group, so that the nodes sit close together for low network latency.",
      "Launch the nodes into three Auto Scaling groups with 30 nodes each, and attach a different subnet to each group."
    ], a: 0,
    no: [null,
      "A spread placement group allows at most seven running instances per Availability Zone, far fewer than 90.",
      "Packing nodes together raises the chance that one hardware failure hits many replicas at once.",
      "Subnets in one AZ don't control rack placement, so replicas could still share hardware."],
    why: "Each partition in a partition placement group has its own racks with separate network and power, and EC2 shows which partition each instance is in. Topology-aware systems such as Cassandra, HDFS and HBase use that to place replicas apart.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-strategies.html"] },

  // Task 3.3: high-performing databases
  { id: "saa-3-215", exam: "SAA", saa: "3.3", topic: "rdsproxy", type: "multi", hint: "Select TWO.",
    q: "A serverless order API uses Lambda functions that connect to an Aurora MySQL cluster. During flash sales, thousands of concurrent invocations open connections, and the database rejects new ones. The security team also forbids database passwords in function code or environment variables. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create an RDS Proxy for the cluster that reads its database credentials from Secrets Manager.", ok: true },
      { t: "Have the functions connect to the proxy endpoint with IAM authentication, not a password.", ok: true },
      { t: "Raise max_connections in the cluster's parameter group so it accepts the new connections.", ok: false, no: "Each connection still costs database memory and CPU, and a surge can exceed any fixed limit." },
      { t: "Store the database password in an encrypted environment variable on each function.", ok: false, no: "The security team forbids passwords in environment variables, encrypted or not." },
      { t: "Add Aurora Replicas, and send the functions' writes to the cluster's reader endpoint.", ok: false, no: "Replicas serve reads only. Writes must go to the writer, and replicas don't pool connections." }
    ],
    why: "RDS Proxy pools and reuses database connections and queues or throttles client connections it can't serve, so surges don't overwhelm the database. Clients can authenticate to the proxy with IAM, and the proxy uses credentials from Secrets Manager.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy.html"] },

  { id: "saa-3-216", exam: "SAA", saa: "3.3", topic: "memorydb", type: "mc",
    q: "A new order-matching microservice keeps its state in Redis OSS data structures such as sorted sets and streams. It needs microsecond reads, and acknowledged writes must survive a node or Availability Zone failure, because this store will be the only copy of the data. The team doesn't want to run a separate database plus a cache. Which solution meets these requirements?",
    opts: [
      "Use Amazon MemoryDB as the service's primary database, with a replica in a second Availability Zone.",
      "Use an ElastiCache for Valkey cluster with Multi-AZ replicas as the only data store for the service.",
      "Use DynamoDB as the primary database, and put a DAX cluster in front of it for microsecond reads.",
      "Use Aurora PostgreSQL as the primary database, and cache the hot data in an ElastiCache cluster."
    ], a: 0,
    no: [null,
      "ElastiCache is designed to cache data held in a primary database, not to be the durable only copy of it.",
      "DAX and DynamoDB don't offer Redis data structures, so the service's data model would have to change.",
      "This is the separate database plus cache that the team wants to avoid running."],
    why: "MemoryDB is a durable, in-memory database compatible with Valkey and Redis OSS. It gives microsecond reads and stores data durably across AZs with a Multi-AZ transactional log, so it can replace a database-plus-cache design as the primary store.",
    doc: ["https://docs.aws.amazon.com/memorydb/latest/devguide/what-is-memorydb.html", "https://docs.aws.amazon.com/memorydb/latest/devguide/related-services-choose-between-memorydb-and-redis.html"] },

  { id: "saa-3-217", exam: "SAA", saa: "3.3", topic: "rds", type: "mc",
    q: "A company runs an ERP system on a self-managed Oracle Database server in its data center. The application relies heavily on Oracle PL/SQL packages, and the vendor won't support any change to the database engine. The company wants AWS to handle backups, patching and Multi-AZ failover. Which database should a solutions architect choose?",
    opts: [
      "Amazon RDS for Oracle, deployed as a Multi-AZ DB instance with automated backups turned on.",
      "Amazon Aurora PostgreSQL, after converting the PL/SQL packages with the AWS Schema Conversion Tool.",
      "Oracle Database on EC2 instances in two Availability Zones, with Oracle Data Guard for failover.",
      "Amazon DynamoDB, with the ERP tables remodeled as items that are looked up by their primary keys."
    ], a: 0,
    no: [null,
      "Aurora is compatible with MySQL and PostgreSQL only, so this changes the engine the vendor requires.",
      "This keeps Oracle, but the company would still run backups, patching and failover itself.",
      "DynamoDB is a NoSQL database, so it would mean rewriting the ERP system and changing the engine."],
    why: "RDS for Oracle runs the Oracle engine as a managed service, with automated backups, patching and Multi-AZ failover. Aurora supports only MySQL- and PostgreSQL-compatible engines.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Oracle.html", "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html"] },

  { id: "saa-3-218", exam: "SAA", saa: "3.3", topic: "databases", type: "multi", hint: "Select TWO.",
    q: "An online retailer is redesigning two data stores. Shopping carts are read and written by session ID only, and traffic jumps from hundreds to hundreds of thousands of requests per second during sales, with single-digit millisecond latency required. Orders need multi-table transactions and SQL joins for finance reports. Which choices meet these requirements? (Select TWO.)",
    items: [
      { t: "Store the carts in Amazon DynamoDB, with session ID as the table's partition key.", ok: true },
      { t: "Store the orders in Amazon Aurora, using SQL transactions and joins for the reports.", ok: true },
      { t: "Store the carts in Amazon Redshift, with session ID set as the table's sort key.", ok: false, no: "Redshift is a data warehouse for analytic queries, not millisecond key lookups at very high request rates." },
      { t: "Store the orders in DynamoDB, and build the finance reports with table scans.", ok: false, no: "DynamoDB has no SQL joins, and scanning whole tables for reports is slow and costly." },
      { t: "Store the carts in a single-AZ RDS for MySQL instance sized for the sale peak.", ok: false, no: "A fixed relational instance must be sized and paid for at peak and can't scale with the surge on its own." }
    ],
    why: "DynamoDB gives single-digit millisecond key-value access at virtually any scale, which fits carts looked up by one key. Aurora is a managed relational engine for transactions and joins across tables.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html", "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_AuroraOverview.html"] },

  { id: "saa-3-219", exam: "SAA", saa: "3.3", topic: "redshift", type: "mc",
    q: "A provisioned Redshift cluster uses DC2 nodes, which include local SSD storage. Query performance is fine, but data volume grows every month, and the company keeps adding nodes only to get more storage, paying for compute it doesn't need. All data must stay in Redshift tables. Which solution meets these requirements MOST cost-effectively?",
    opts: [
      "Migrate the cluster to RA3 nodes, which use managed storage that is billed apart from the compute nodes.",
      "Turn on concurrency scaling for the cluster, so that extra capacity is added only when queries queue.",
      "Unload the older tables to S3 as Parquet files, and query them as external tables with Redshift Spectrum.",
      "Use elastic resize to switch the cluster to larger DC2 nodes, which hold more SSD storage on each node."
    ], a: 0,
    no: [null,
      "Concurrency scaling adds compute for busy periods. It doesn't add storage to the main cluster.",
      "This moves data out of Redshift tables into S3, which the requirement rules out.",
      "Larger DC2 nodes still bundle compute with storage, so the company keeps paying for unneeded compute."],
    why: "RA3 (and the newer RG) nodes use Redshift managed storage, so compute and storage scale and are billed independently: you size nodes for performance and pay for the storage you use. AWS recommends RA3 when data is expected to grow.",
    doc: ["https://docs.aws.amazon.com/redshift/latest/mgmt/working-with-clusters.html"] },

  // Task 3.4: high-performing networks
  { id: "saa-3-220", exam: "SAA", saa: "3.4", topic: "globalaccelerator", type: "multi", hint: "Select TWO.",
    q: "A payments API runs behind Application Load Balancers in us-east-1 and eu-west-1. Partner firewalls allow outbound traffic only to a short, fixed list of IP addresses that rarely changes. If one Region fails, partners must reach the other within about a minute, with no reliance on clients refreshing cached DNS records. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create a standard accelerator in AWS Global Accelerator, and give partners its two static IPs.", ok: true },
      { t: "Add an endpoint group per Region with that Region's ALB as the endpoint, using health checks.", ok: true },
      { t: "Create a CloudFront distribution with both ALBs as origins in an origin group with failover.", ok: false, no: "CloudFront's edge IP addresses are many and change, so partners can't allow-list a short fixed set." },
      { t: "Create Route 53 failover records that point at each ALB, with health checks on both of them.", ok: false, no: "Failover depends on clients picking up new DNS answers, and ALB IP addresses change, so they can't be allow-listed." },
      { t: "Put a Network Load Balancer with Elastic IPs in each Region, and give partners those addresses.", ok: false, no: "Partners would still need DNS or their own logic to switch Regions, and they'd need to allow-list more addresses." }
    ],
    why: "Global Accelerator gives two static anycast IPs that stay with the accelerator. It routes to healthy endpoints in the nearest Region and reacts at once to health changes, so failover doesn't wait for DNS caches.",
    doc: ["https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html", "https://docs.aws.amazon.com/global-accelerator/latest/dg/introduction-how-it-works.html"] },

  { id: "saa-3-221", exam: "SAA", saa: "3.4", topic: "cloudfront", type: "mc",
    q: "A recipe site serves pages and photos from EC2 instances behind an Application Load Balancer in one Region. Users worldwide request the same popular pages and photos many times an hour, and the origin fleet keeps scaling out to handle repeat requests. The company wants faster page loads for distant users and much less load on the origin. Which solution meets these requirements?",
    opts: [
      "Put an Amazon CloudFront distribution in front of the ALB, with cache policies for the pages and photos.",
      "Put an AWS Global Accelerator standard accelerator in front of the ALB, with the ALB as its only endpoint.",
      "Deploy copies of the full stack in more Regions, and route users with Route 53 latency-based records.",
      "Turn on cross-zone load balancing on the ALB, and add more instances to the Auto Scaling group."
    ], a: 0,
    no: [null,
      "Global Accelerator speeds traffic over the AWS network but doesn't cache, so every request still reaches the origin.",
      "This lowers latency but runs and pays for a full stack in each Region, while repeat requests still hit an origin.",
      "This spreads load inside one Region but doesn't help distant users or cut repeat requests to the origin."],
    why: "CloudFront caches copies of content at edge locations near users, so repeat requests are served from the edge without reaching the origin. Global Accelerator improves the network path but serves no content from a cache.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html", "https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html"] },

  { id: "saa-3-222", exam: "SAA", saa: "3.4", topic: "vpc", type: "multi", hint: "Select TWO.",
    q: "A company is adding IPv6 to a dual-stack VPC. Instances in the private subnets must download packages from IPv6 sites on the internet, but nothing on the internet may start an IPv6 connection to them. Their IPv4 traffic already goes out through a NAT gateway. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create an egress-only internet gateway and attach it to the VPC.", ok: true },
      { t: "Add a ::/0 route to the egress-only gateway in the private route tables.", ok: true },
      { t: "Add a ::/0 route to the internet gateway in the private route tables.", ok: false, no: "An internet gateway route lets internet hosts start IPv6 connections to the instances, which isn't allowed." },
      { t: "Add a ::/0 route to the existing NAT gateway in the private route tables.", ok: false, no: "A NAT gateway provides outbound internet access for IPv4. Outbound-only IPv6 uses an egress-only internet gateway." },
      { t: "Add security group rules that deny all inbound IPv6 traffic from the internet.", ok: false, no: "Security groups have only allow rules, and they don't give the instances a route out." }
    ],
    why: "IPv6 addresses are globally unique, so they are public by default. An egress-only internet gateway allows outbound IPv6 traffic and blocks connections started from the internet; private subnets route ::/0 to it.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html"] },

  // Task 3.5: data ingestion and transformation
  { id: "saa-3-223", exam: "SAA", saa: "3.5", topic: "emr", type: "mc",
    q: "A data team has Apache Spark jobs and HiveQL scripts that run on a self-managed Hadoop cluster a few times a day, leaving it idle most of the time. The team wants to run the same jobs and scripts on AWS without changing them, without configuring or managing clusters, and without paying for idle capacity. Which solution meets these requirements?",
    opts: [
      "Create Amazon EMR Serverless applications for Spark and Hive, and submit the jobs and scripts to them.",
      "Create a long-running Amazon EMR cluster on EC2, and submit the jobs and scripts to it as cluster steps.",
      "Rewrite the jobs and scripts as AWS Glue ETL jobs, and start them from a scheduled Glue trigger.",
      "Rewrite the jobs and scripts as Amazon Athena SQL queries over the data, and run them on a schedule."
    ], a: 0,
    no: [null,
      "A long-running cluster has to be configured and managed, and it accrues charges while idle.",
      "Glue ETL jobs run Spark or Python scripts, not HiveQL, and the requirement is to avoid rewriting the code.",
      "Converting Spark jobs and HiveQL scripts to Athena queries is a rewrite the team wants to avoid."],
    why: "EMR Serverless runs open-source frameworks such as Spark and Hive without clusters to configure or operate. It provisions resources for each job and releases them when the job finishes, so nothing sits idle.",
    doc: ["https://docs.aws.amazon.com/emr/latest/EMR-Serverless-UserGuide/emr-serverless.html"] },

  { id: "saa-3-224", exam: "SAA", saa: "3.5", topic: "emr", type: "multi", hint: "Select TWO.",
    q: "A company runs a nightly Spark aggregation on an Amazon EMR cluster on EC2 that runs around the clock, though the job takes only three hours. The input and the aggregated output must outlast the cluster and be readable by Athena. The company wants to stop paying for the cluster outside the job. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Read the input from S3 and write the output to S3, using s3:// paths in the job.", ok: true },
      { t: "Launch a cluster each night that runs the job as a step and ends after the last step.", ok: true },
      { t: "Write the output to HDFS on the core nodes, and keep it there between the nightly runs.", ok: false, no: "HDFS is ephemeral storage that is reclaimed when the cluster ends, and Athena can't query it." },
      { t: "Turn on termination protection, so the cluster can't end before the output is written.", ok: false, no: "Termination protection keeps a cluster running, which is the cost the company wants to stop." },
      { t: "Keep the cluster running all day, and turn on managed scaling with a minimum of zero.", ok: false, no: "A running cluster always keeps at least its primary node, so it still costs money between jobs." }
    ],
    why: "A cluster set to end after its steps runs the job and terminates, so it is billed only while working. Because HDFS is reclaimed when a cluster ends, durable input and output belong in S3, where Athena can query them.",
    doc: ["https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-longrunning-transient.html", "https://docs.aws.amazon.com/emr/latest/ManagementGuide/emr-plan-file-systems.html"] },

  { id: "saa-3-225", exam: "SAA", saa: "3.5", topic: "glue", type: "mc",
    q: "Several Amazon EMR clusters run Hive and Spark jobs, and each keeps its own Hive metastore on the cluster, so table definitions disappear when a cluster ends. Analysts also want to query the same tables with Athena and Redshift Spectrum. The company wants one persistent, shared metastore without running a database for it. What should a solutions architect do?",
    opts: [
      "Configure every EMR cluster to use the AWS Glue Data Catalog as its Hive metastore, and query it from Athena.",
      "Run a Hive metastore on an Amazon RDS for MySQL instance, and point each EMR cluster at that database.",
      "Keep a metastore on each cluster, and export the table definitions to S3 before each cluster terminates.",
      "Store the table definitions in a DynamoDB table, and have each cluster load them during a bootstrap action."
    ], a: 0,
    no: [null,
      "This makes the metastore persistent, but the company would have to run and patch that database, which it wants to avoid.",
      "Per-cluster metastores stay separate, and exporting definitions by hand isn't a shared catalog.",
      "Hive, Athena and Spectrum don't read table definitions from DynamoDB, so this needs custom code throughout."],
    why: "EMR can use the Glue Data Catalog as its Hive metastore, which AWS recommends when you need a persistent metastore shared by clusters, services or accounts. Athena and Redshift Spectrum read the same catalog.",
    doc: ["https://docs.aws.amazon.com/emr/latest/ReleaseGuide/emr-hive-metastore-glue.html"] },

  { id: "saa-3-226", exam: "SAA", saa: "3.5", topic: "quick", type: "mc",
    q: "Business analysts want interactive BI dashboards over sales data in an S3 data lake that is queried through Athena. Hundreds of managers open the dashboards each morning, and every visual sends a new Athena query, so pages load slowly and per-query charges keep growing. The data changes once a night. The company wants a managed BI service. Which solution meets these requirements?",
    opts: [
      "Build the dashboards in Amazon Quick Sight, import the datasets into SPICE, and refresh them nightly.",
      "Build the dashboards in Amazon Quick Sight with direct query to Athena, and cache Athena results.",
      "Build the dashboards in Amazon Managed Grafana with the Athena data source on each dashboard.",
      "Load the sales data into Amazon OpenSearch Service, and build the dashboards in OpenSearch Dashboards."
    ], a: 0,
    no: [null,
      "Direct query still sends queries to Athena as users open visuals, so the page loads and query charges remain.",
      "Grafana is built for operational metrics, and each panel would still query Athena on every load.",
      "This adds a separate cluster to load and run, built for search and log analytics rather than BI on the lake."],
    why: "Quick Sight (formerly QuickSight, now part of Amazon Quick) can import data into SPICE, its in-memory engine. Visuals then load from SPICE without querying the source, and a per-query source like Athena is charged only when the dataset is created or refreshed.",
    doc: ["https://docs.aws.amazon.com/quick/latest/userguide/spice.html", "https://docs.aws.amazon.com/quick/latest/userguide/refreshing-imported-data.html"] },

  { id: "saa-3-227", exam: "SAA", saa: "3.5", topic: "quick", type: "multi", hint: "Select TWO.",
    q: "A SaaS company wants to embed one Amazon Quick Sight dashboard in its customer portal. Customers sign in to the portal, not to Quick, and the company doesn't want to register thousands of customer users in Quick. All customers share one dataset, and each customer must see only rows that carry its own customer ID. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Have the portal back end call GenerateEmbedUrlForAnonymousUser and embed the URL it returns.", ok: true },
      { t: "Add tag-based row-level security to the dataset, and pass each customer ID as a session tag.", ok: true },
      { t: "Turn on public access for the dashboard, and paste its 1-click embed code into the portal.", ok: false, no: "A static embed code can't pass a per-customer tag, so every visitor would see the same rows." },
      { t: "Register every customer user in Quick, and add user-based row-level security rules for them.", ok: false, no: "This works only by registering every customer user in Quick, which the company wants to avoid." },
      { t: "Create Lake Formation row filters by customer ID on the source tables that the dataset uses.", ok: false, no: "Anonymous viewers have no identity that Lake Formation could filter on, so every customer would get the same rows." }
    ],
    why: "The embedding API for anonymous users serves dashboards to people who aren't registered in Quick. Tag-based RLS rules filter rows by session tags the app passes when it generates the embed URL, so each customer sees only its own data.",
    doc: ["https://docs.aws.amazon.com/quick/latest/userguide/row-level-security.html", "https://docs.aws.amazon.com/quick/latest/userguide/embedded-analytics-dashboards-for-everyone.html"] },

  { id: "saa-3-228", exam: "SAA", saa: "3.5", topic: "quick", type: "mc",
    q: "A finance team uses Amazon Quick Sight Enterprise edition. It needs dashboards on live data in an RDS for PostgreSQL database that sits in private subnets with no public endpoint. Security policy says the database must never be reachable from the internet, and the team doesn't want to copy the data elsewhere. What should a solutions architect do?",
    opts: [
      "Create a VPC connection in Quick Sight to the database's VPC, and allow its security group on the database.",
      "Make the DB instance publicly accessible, and allow only Quick Sight's published IP range in its security group.",
      "Create an interface VPC endpoint for Quick in the database's VPC, and point the data source at the endpoint.",
      "Export the tables to S3 every night with a scheduled job, and build the dashboards on Athena queries instead."
    ], a: 0,
    no: [null,
      "Even with a narrow allow rule, the database would get a public endpoint, which the policy forbids.",
      "An interface endpoint lets clients in the VPC reach Quick privately. It doesn't let Quick open connections to the database.",
      "This copies the data and makes the dashboards a day old, and the team wants live data without copies."],
    why: "A Quick Sight VPC connection adds network interfaces in your VPC, so Quick can reach private databases, and even on-premises data, under your route tables, network ACLs and security groups, without public exposure.",
    doc: ["https://docs.aws.amazon.com/quick/latest/userguide/working-with-aws-vpc.html"] },

  { id: "saa-3-229", exam: "SAA", saa: "3.5", topic: "lakeformation", type: "mc",
    q: "A company's data lake has thousands of tables in the Glue Data Catalog, governed by Lake Formation. Granting access table by table has become unmanageable, and new tables arrive every week. Teams should get access by data domain and sensitivity, such as finance tables that aren't confidential. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Define LF-Tags for domain and sensitivity, tag the tables, and grant teams permissions on tag expressions.",
      "Keep granting named-resource permissions per table, and script a new grant whenever any new table is added.",
      "Write IAM policies with table ARNs for each team, and update the policies whenever a table is added.",
      "Split the data into one S3 bucket per domain, and control each team's reads with S3 bucket policies."
    ], a: 0,
    no: [null,
      "Named-resource grants per table are exactly the growing workload the company wants to escape.",
      "Listing table ARNs in IAM policies scales no better, and it ignores the Lake Formation permissions model.",
      "Bucket policies control objects, not catalog tables or columns, and the data would have to be reorganized."],
    why: "Lake Formation tag-based access control grants permissions on LF-Tag expressions. A new table tagged domain=finance and sensitivity=general is covered at once, and AWS recommends this method when there are many Data Catalog resources.",
    doc: ["https://docs.aws.amazon.com/lake-formation/latest/dg/tag-based-access-control.html"] },

  { id: "saa-3-230", exam: "SAA", saa: "3.5", topic: "lakeformation", type: "multi", hint: "Select TWO.",
    q: "A central data account governs an S3 data lake with Lake Formation. Analysts in a separate marketing account must query two tables with Athena from their own account, without the customer email column. The company doesn't want to copy data or metadata into the marketing account. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "In the data account, grant the marketing account SELECT on the tables, excluding the email column.", ok: true },
      { t: "In the marketing account, create resource links to the shared tables, and query them in Athena.", ok: true },
      { t: "Replicate the S3 prefixes to a marketing bucket, and crawl the copies into its own Data Catalog.", ok: false, no: "This copies both data and metadata, which the company doesn't want." },
      { t: "Add a bucket policy that gives the marketing account read access to the data lake's S3 prefixes.", ok: false, no: "Raw S3 access bypasses Lake Formation's column restriction, so analysts could read the email column." },
      { t: "Run a Glue crawler in the marketing account against the data account's bucket to build tables.", ok: false, no: "This duplicates the metadata and needs direct S3 access, with no column-level control." }
    ],
    why: "Lake Formation shares Data Catalog resources across accounts through AWS RAM, with column-level restrictions intact. Athena in the recipient account queries shared tables through resource links, without copying data or catalog entries.",
    doc: ["https://docs.aws.amazon.com/lake-formation/latest/dg/cross-account-permissions.html", "https://docs.aws.amazon.com/lake-formation/latest/dg/resource-links-about.html"] },

  { id: "saa-3-231", exam: "SAA", saa: "3.5", topic: "datasync", type: "mc",
    q: "A company is retiring an on-premises Hadoop cluster and building an S3 data lake. It must copy 300 TB from the cluster's HDFS to S3 over its Direct Connect link, then copy only new and changed files each night until cutover. The company doesn't want to write or maintain copy scripts. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Deploy an AWS DataSync agent near the cluster, and run a scheduled task from an HDFS location to S3.",
      "Run Hadoop DistCp jobs from the cluster to S3 each night, launched and tracked by in-house cron scripts.",
      "Deploy an S3 File Gateway on premises, and copy the HDFS files to its NFS share every night.",
      "Create an AWS Transfer Family SFTP server, and push the HDFS files to it with a nightly script."
    ], a: 0,
    no: [null,
      "DistCp can copy to S3, but scheduling, retries and tracking would be custom scripts to maintain.",
      "Files would have to be pulled out of HDFS and pushed through the gateway by a job someone has to write.",
      "SFTP uploads need a script to export and send each file, and they don't detect changed files on their own."],
    why: "DataSync supports HDFS as a source: an agent acts as an HDFS client, copies data to S3, transfers only changed data on later runs, verifies integrity and runs on a schedule.",
    doc: ["https://docs.aws.amazon.com/datasync/latest/userguide/create-hdfs-location.html", "https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html"] },

  { id: "saa-3-232", exam: "SAA", saa: "3.5", topic: "datasync", type: "mc",
    q: "A company acquired a startup whose 60 TB of event data sits in a Google Cloud Storage bucket. The data must move to an S3 bucket that feeds the company's data lake, and objects added to the source bucket during the next month must keep copying over. The team wants a managed AWS service rather than custom scripts. Which solution meets these requirements?",
    opts: [
      "Create an AWS DataSync task with a Google Cloud Storage source location and an S3 destination, run on a schedule.",
      "Set up S3 Replication on the destination bucket with the Google Cloud Storage bucket as its replication source.",
      "Create an AWS Transfer Family server, and have the startup push its objects to the server over SFTP each day.",
      "Deploy an S3 File Gateway VM in Google Cloud, and copy the objects through its NFS file share into the bucket."
    ], a: 0,
    no: [null,
      "S3 Replication copies objects between S3 buckets only. It can't read from another cloud's storage.",
      "This puts a daily export-and-upload job on the startup's side, which is the custom scripting the team wants to avoid.",
      "Someone would still have to script the copy from the bucket into the share, and the gateway isn't a migration tool."],
    why: "DataSync can transfer from other clouds' storage, including Google Cloud Storage, into S3. Scheduled task runs copy only what has changed, so new objects keep flowing until cutover.",
    doc: ["https://docs.aws.amazon.com/datasync/latest/userguide/tutorial_transfer-google-cloud-storage.html"] },

  { id: "saa-3-233", exam: "SAA", saa: "3.5", topic: "glue", type: "mc",
    q: "An AWS Glue ETL job runs every hour, reads JSON files that land in an S3 prefix, and writes Parquet to a curated bucket. Each run reprocesses every file in the prefix, so the run time keeps growing and the curated data has duplicates. Files are never changed after they land. What should a solutions architect do to fix this with the LEAST effort?",
    opts: [
      "Enable job bookmarks for the Glue job, so each run processes only the files added since the last run.",
      "Run a Glue crawler on the source prefix before each job run, so the job reads only the newest partitions.",
      "Add more workers to the Glue job, so that each hourly run finishes before the next one is due to start.",
      "Move each processed file to an archive prefix with an S3 Lifecycle rule that runs right after each job."
    ], a: 0,
    no: [null,
      "A crawler updates table definitions in the Data Catalog. It doesn't change which data the ETL job reads.",
      "More workers make each run faster, but every run still reprocesses all files and writes duplicates.",
      "Lifecycle rules change storage classes or expire objects. They can't move files to another prefix after each job."],
    why: "Job bookmarks keep state from earlier runs of a Glue job, so a rerun processes only new data and avoids duplicates in the target. They're supported for S3 sources in formats including JSON, CSV and Parquet.",
    doc: ["https://docs.aws.amazon.com/glue/latest/dg/monitor-continuations.html"] },

  { id: "saa-3-234", exam: "SAA", saa: "3.5", topic: "msk", type: "mc",
    q: "A company is building a new event pipeline. Its developers already use Apache Kafka client libraries and want to keep the Kafka APIs, and the clients can use IAM authentication. Traffic is spiky and hard to forecast, and the team doesn't want to choose broker sizes, plan storage or rebalance partitions. Which solution meets these requirements?",
    opts: [
      "Create an Amazon MSK Serverless cluster, and have the Kafka clients connect with IAM access control.",
      "Create a provisioned Amazon MSK cluster, and pick the broker size and storage for the expected peak.",
      "Create a Kinesis data stream in on-demand mode, and have the clients write to it with the Kafka API.",
      "Create an Amazon MQ broker for RabbitMQ, and point the producers and consumers at the broker endpoint."
    ], a: 0,
    no: [null,
      "Provisioned clusters need the broker sizing and storage planning the team wants to avoid.",
      "Kinesis Data Streams has its own API, so Kafka clients would have to be rewritten to use it.",
      "Amazon MQ runs ActiveMQ and RabbitMQ brokers, which don't speak the Kafka protocol."],
    why: "MSK Serverless runs Apache Kafka without managing or scaling cluster capacity: it provisions and scales capacity and manages partitions automatically, with throughput-based pricing. It requires IAM access control.",
    doc: ["https://docs.aws.amazon.com/msk/latest/developerguide/serverless.html"] },

  { id: "saa-3-235", exam: "SAA", saa: "3.5", topic: "firehose", type: "multi", hint: "Select TWO.",
    q: "A company's applications produce a steady stream of JSON audit events that must reach a third-party monitoring service's HTTPS ingestion endpoint in batches within a few minutes. If the endpoint is down longer than the retry window, no events may be lost. The company wants no servers or delivery code to maintain. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Send the events to an Amazon Data Firehose stream with an HTTP endpoint destination.", ok: true },
      { t: "Configure the Firehose stream to back up failed deliveries to an Amazon S3 bucket.", ok: true },
      { t: "Send the events to a Kinesis data stream, and point the vendor at the stream's ARN.", ok: false, no: "A data stream stores records for consumers to read. Something would still have to deliver them to the endpoint." },
      { t: "Queue the events in SQS, and have a Lambda function post each one to the endpoint.", ok: false, no: "This works but adds delivery code and retry handling to maintain, which the company wants to avoid." },
      { t: "Write the events to CloudWatch Logs, and export the log group to the endpoint daily.", ok: false, no: "CloudWatch Logs exports go to S3, not to HTTP endpoints, and daily is far too slow." }
    ],
    why: "Firehose buffers streaming data and delivers it to destinations including custom HTTP endpoints and supported third-party services, with no code. For HTTP endpoints you set an S3 bucket where data that fails delivery after retries is backed up.",
    doc: ["https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html", "https://docs.aws.amazon.com/firehose/latest/dev/retry.html"] }
);
