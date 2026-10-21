// Question bank batch: SAA-C03 Domain 3 (Design High-Performing Architectures), tasks 3.1-3.5. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 3.1: high-performing storage
  { id: "saa-3-101", exam: "SAA", saa: "3.1", topic: "ebs", type: "mc",
    q: "A log-processing application on EC2 reads several terabytes of log files from start to finish many times a day in large sequential reads. The data must stay on block storage attached to the instance, and it isn't the boot volume. Which EBS volume type is MOST cost-effective while giving high throughput?",
    opts: [
      "Throughput Optimized HDD (st1) volumes, sized for the throughput that the scans need.",
      "Cold HDD (sc1) volumes, because they have the lowest price per GiB of any EBS volume type.",
      "Provisioned IOPS SSD (io2) volumes, with enough IOPS provisioned to cover the read rate.",
      "General Purpose SSD (gp3) volumes, with extra throughput provisioned above the baseline."
    ], a: 0,
    no: [null,
      "sc1 is meant for infrequently accessed data and has a lower throughput limit than st1, so scans many times a day would run slower.",
      "io2 is priced for small, random, latency-sensitive I/O. Paying for IOPS is wasted on large sequential reads.",
      "gp3 would work, but SSD storage costs more per GiB than st1 for multi-terabyte sequential data."],
    why: "st1 is low-cost magnetic storage whose performance is defined by throughput, built for frequently accessed, large, sequential workloads such as log processing, ETL and data warehouses. It can't be a boot volume, which the stem rules out.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/hdd-vols.html"] },

  { id: "saa-3-102", exam: "SAA", saa: "3.1", topic: "ec2", type: "mc",
    q: "A video transcoding fleet writes large intermediate files to local disk while each job runs. The files are discarded at the end of the job, and a failed job is simply restarted from the source in S3. The company wants the highest disk I/O performance and no extra storage charges. Which storage should the instances use?",
    opts: [
      "NVMe instance store volumes on an instance type that includes them, used as scratch space.",
      "Provisioned IOPS SSD (io2) EBS volumes with the highest IOPS the instance type supports.",
      "An Amazon EFS file system in Elastic throughput mode, mounted on every instance in the transcoding fleet.",
      "An S3 bucket in the same Region, read and written through a file system mounted with a FUSE driver."
    ], a: 0,
    no: [null,
      "io2 performs well but is network-attached and billed separately, while the data is throwaway scratch.",
      "EFS is shared network storage that is billed per GB. The jobs don't need to share these files.",
      "S3 is object storage over the network, much slower than local disk for scratch I/O."],
    why: "Instance store disks are physically attached to the host, so they give very high I/O at no extra charge. They suit buffers, caches and scratch data that can be lost when the instance stops, which is the case here.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/InstanceStorage.html"] },

  { id: "saa-3-103", exam: "SAA", saa: "3.1", topic: "storagegateway", type: "multi", hint: "Select TWO.",
    q: "A company wants to use AWS storage from its data center for two workloads. Its backup software writes to a physical tape library over iSCSI, and the company wants to retire the tapes without changing that software. Separately, on-premises Linux servers write reports to an NFS share, and the files must land in S3 as objects for analytics. Which solutions meet these requirements? (Select TWO.)",
    items: [
      { t: "Deploy a Tape Gateway, and point the backup software at its virtual tape library.", ok: true },
      { t: "Deploy an S3 File Gateway, and mount its NFS file share on the Linux servers.", ok: true },
      { t: "Deploy a Volume Gateway with stored volumes, and point the backup software at it.", ok: false, no: "Volume Gateway presents iSCSI block volumes, not a tape library, so the backup software's tape jobs would have to change." },
      { t: "Deploy a Volume Gateway with cached volumes, and format them for the report share.", ok: false, no: "Cached volumes keep data in S3 as iSCSI block volumes, so the reports wouldn't appear in S3 as individual objects." },
      { t: "Install an AWS DataSync agent, and point the backup software at it as a tape target.", ok: false, no: "DataSync copies files and objects between storage systems. It doesn't present a virtual tape library." }
    ],
    why: "Tape Gateway exposes a virtual tape library as iSCSI devices, so existing backup software keeps working while tapes are stored in AWS. S3 File Gateway serves NFS or SMB shares and stores each file as an S3 object.",
    doc: ["https://docs.aws.amazon.com/storagegateway/latest/tgw/StorageGatewayConcepts.html", "https://docs.aws.amazon.com/filegateway/latest/files3/what-is-file-s3.html"] },

  { id: "saa-3-104", exam: "SAA", saa: "3.1", topic: "fsx", type: "mc",
    q: "A company runs NetApp storage on premises. Linux servers reach the data over NFS, Windows servers over SMB, and a database uses iSCSI LUNs from the same system. The company is moving these workloads to AWS, wants to replicate the data with SnapMirror, and doesn't want to change how its storage team manages the data. Which storage should a solutions architect choose?",
    opts: [
      "Amazon FSx for NetApp ONTAP, with SnapMirror replication from the on-premises system.",
      "Amazon FSx for Windows File Server for the shares, with EBS volumes for the database LUNs.",
      "Amazon FSx for OpenZFS for all three workloads, with snapshots copied from on premises.",
      "Amazon EFS for the Linux and Windows servers, with EBS Multi-Attach for the database LUNs."
    ], a: 0,
    no: [null,
      "FSx for Windows File Server serves SMB only, and none of these services support SnapMirror.",
      "FSx for OpenZFS serves data over NFS only, so it can't host the SMB shares or the iSCSI LUNs.",
      "EFS is an NFS file system, and SMB clients and SnapMirror replication aren't supported."],
    why: "FSx for NetApp ONTAP is managed ONTAP storage with NFS, SMB and iSCSI access to the same data, and it supports SnapMirror, so on-premises NetApp workloads move without changing applications or management tools.",
    doc: ["https://docs.aws.amazon.com/fsx/latest/ONTAPGuide/what-is-fsx-ontap.html"] },

  { id: "saa-3-105", exam: "SAA", saa: "3.1", topic: "s3", type: "multi", hint: "Select TWO.",
    q: "An analytics fleet of EC2 instances in the same Region as an S3 bucket reads multi-GB objects and writes millions of small result objects, all under a single prefix. The fleet now gets 503 Slow Down errors on writes, and each large download is limited by a single connection. Which changes improve performance the MOST? (Select TWO.)",
    items: [
      { t: "Spread the result objects across many prefixes so that requests scale out in parallel.", ok: true },
      { t: "Download each large object as several byte-range GET requests over parallel connections.", ok: true },
      { t: "Turn on S3 Transfer Acceleration for the bucket, and send all requests to its endpoint.", ok: false, no: "Transfer Acceleration helps clients that are far from the bucket's Region. This fleet is already in the same Region." },
      { t: "Move the result objects to the S3 Standard-IA storage class as soon as they are written.", ok: false, no: "Storage classes change cost and retrieval fees, not the request rate that a prefix supports." },
      { t: "Turn on S3 Versioning so that concurrent writes to the same key don't overwrite results.", ok: false, no: "Versioning keeps old versions of objects. It doesn't raise request rates or download throughput." }
    ],
    why: "S3 supports at least 3,500 writes and 5,500 reads per second per prefix, with no limit on prefixes, so spreading keys across prefixes scales writes. Byte-range fetches let one object download over many connections at once.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance-guidelines.html"] },

  // Task 3.2: high-performing and elastic compute
  { id: "saa-3-106", exam: "SAA", saa: "3.2", topic: "ec2", type: "multi", hint: "Select TWO.",
    q: "A research team runs a tightly coupled computational fluid dynamics simulation that uses MPI across 64 EC2 instances. The nodes exchange messages constantly, and run time is dominated by network latency between them. Availability across Availability Zones doesn't matter for this job. Which steps give the MOST performant design? (Select TWO.)",
    items: [
      { t: "Launch all of the instances into a cluster placement group in a single Availability Zone.", ok: true },
      { t: "Use instance types that support Elastic Fabric Adapter, and attach an EFA to each node.", ok: true },
      { t: "Launch the instances into a spread placement group so each one sits on distinct hardware.", ok: false, no: "Spread placement keeps a few critical instances apart to limit correlated failures. It doesn't cut latency between nodes." },
      { t: "Use a partition placement group with partitions spread over three Availability Zones.", ok: false, no: "Partitions isolate racks for workloads such as HDFS or Cassandra, and crossing AZs adds latency." },
      { t: "Put a Network Load Balancer in front of the nodes to spread the MPI traffic between them.", ok: false, no: "MPI nodes talk to each other directly. A load balancer adds a hop and doesn't lower latency." }
    ],
    why: "A cluster placement group packs instances close together in one AZ for low latency and high per-flow throughput. EFA gives lower, more consistent latency than TCP for HPC inter-node communication such as MPI.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/placement-strategies.html", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/efa.html"] },

  { id: "saa-3-107", exam: "SAA", saa: "3.2", topic: "autoscaling", type: "mc",
    q: "An internal web app runs in an Auto Scaling group with a target tracking policy on CPU. Every weekday at 8 AM, load climbs sharply, and because new instances take about 10 minutes to initialize, users see slow pages for the first 15 minutes. The daily pattern shifts gradually over the year, and the team doesn't want to keep editing schedules. What should a solutions architect do?",
    opts: [
      "Add a predictive scaling policy so capacity launches ahead of the forecast daily rise in load.",
      "Lower the target value of the CPU target tracking policy so that it scales out a bit earlier.",
      "Replace the target tracking policy with a step scaling policy that adds more instances per step.",
      "Create scheduled scaling actions that raise the minimum capacity shortly before 8 AM each weekday."
    ], a: 0,
    no: [null,
      "Target tracking still reacts after load arrives, so the 10-minute startup lag remains.",
      "Step scaling is also reactive. Bigger steps still start only after the alarm fires.",
      "This would work at first, but the schedule needs editing whenever the pattern drifts, which the team wants to avoid."],
    why: "Predictive scaling learns daily and weekly patterns from history and launches capacity before forecast load, which suits cyclical traffic and apps that take a long time to initialize. It updates its forecast as the pattern changes.",
    doc: ["https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-predictive-scaling.html"] },

  { id: "saa-3-108", exam: "SAA", saa: "3.2", topic: "autoscaling", type: "mc",
    q: "A data service runs in an Auto Scaling group. Each new instance takes about 12 minutes to boot because it writes a large reference dataset to disk before serving requests. Traffic bursts arrive at random times with no daily or weekly pattern. The company wants new capacity to serve much sooner after a scale-out, without paying for extra instances that are running idle. What should a solutions architect do?",
    opts: [
      "Add a warm pool to the group that keeps pre-initialized instances in the Stopped state.",
      "Add a predictive scaling policy so that the group launches instances ahead of the bursts.",
      "Raise the group's minimum capacity so that extra running instances can absorb each burst.",
      "Shorten the default instance warmup so new instances count toward capacity sooner."
    ], a: 0,
    no: [null,
      "Predictive scaling needs recurring patterns to forecast. Random bursts give it nothing to learn.",
      "This pays for idle running instances all the time, which the company wants to avoid.",
      "Warmup only controls when an instance's metrics count. It doesn't make the instance ready any faster."],
    why: "A warm pool holds instances that have already run their slow initialization. Kept Stopped, they cost only their volumes and Elastic IPs, and the group can bring them into service quickly when it scales out.",
    doc: ["https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html"] },

  { id: "saa-3-109", exam: "SAA", saa: "3.2", topic: "ec2", type: "mc",
    q: "A company runs an in-memory analytics engine on general purpose (M family) EC2 instances. CloudWatch agent metrics show memory use near 100 percent and heavy swapping to disk, while CPU utilization stays below 20 percent. Each node must hold a 300 GiB working set in RAM. Which change gives the BEST performance for this workload?",
    opts: [
      "Move to a memory optimized instance type, such as the R family, with enough RAM for the working set.",
      "Move to a compute optimized instance type, such as the C family, with the same number of vCPUs.",
      "Move to a storage optimized instance type, such as the I family, so swapping to local NVMe is faster.",
      "Keep the general purpose type, and attach a large Provisioned IOPS EBS volume as the swap space."
    ], a: 0,
    no: [null,
      "C instances have less memory per vCPU than M instances, so swapping would get worse while CPU sits idle.",
      "Faster local disks make swapping hurt less, but the working set still doesn't fit in RAM.",
      "Swap on EBS is still disk I/O over the network, far slower than reading the data from memory."],
    why: "Memory optimized instances are designed for workloads that process large data sets in memory. They offer more memory per vCPU than general purpose types, so the working set fits in RAM without paying for CPU the engine doesn't use.",
    doc: ["https://docs.aws.amazon.com/ec2/latest/instancetypes/mo.html", "https://docs.aws.amazon.com/ec2/latest/instancetypes/instance-types.html"] },

  { id: "saa-3-110", exam: "SAA", saa: "3.2", topic: "batch", type: "mc",
    q: "A risk team submits thousands of independent, containerized simulation jobs each night. The jobs need different amounts of CPU and memory, failed jobs must be retried, and Spot capacity should be used where possible. The team doesn't want to run or patch a job scheduler. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Submit the jobs to AWS Batch queues backed by a managed compute environment using Spot.",
      "Run an open-source HPC job scheduler on EC2 instances in an Auto Scaling group with Spot.",
      "Launch a long-running Amazon EMR cluster and submit each simulation as an EMR cluster step.",
      "Run the simulations as an Amazon ECS service whose desired task count is raised every night."
    ], a: 0,
    no: [null,
      "This works, but the team would install, patch and scale the scheduler, which they want to avoid.",
      "EMR is built for big data frameworks such as Spark and Hadoop, not for queuing thousands of independent container jobs.",
      "An ECS service keeps tasks running continuously. It has no job queue, per-job sizing or job retries."],
    why: "AWS Batch is a managed batch scheduler: jobs wait in queues, Batch provisions right-sized compute (including Spot) in managed compute environments, and job definitions can set retry strategies.",
    doc: ["https://docs.aws.amazon.com/batch/latest/userguide/what-is-batch.html", "https://docs.aws.amazon.com/batch/latest/userguide/array_jobs.html"] },

  { id: "saa-3-111", exam: "SAA", saa: "3.2", topic: "ecs", type: "mc",
    q: "A company runs its microservices on Amazon ECS with AWS Fargate. A new image-recognition service needs NVIDIA GPUs for inference, and the team wants to keep using ECS task definitions and services to deploy it. Which solution meets these requirements?",
    opts: [
      "Run the service on the EC2 launch type with GPU instances, and request GPUs in the task definition.",
      "Run the service on Fargate, and add a GPU resource requirement to the container's task definition.",
      "Run the service on a Fargate Spot capacity provider, and choose the largest available task size.",
      "Run the service on the EC2 launch type with compute-optimized C-family instances for the inference."
    ], a: 0,
    no: [null,
      "The gpu task definition parameter isn't valid for tasks that run on Fargate.",
      "Fargate Spot changes the price and interruption model. Larger Fargate tasks add CPU and memory, not GPUs.",
      "C-family instances have powerful CPUs but no GPUs, and the model needs NVIDIA GPUs."],
    why: "ECS schedules GPU workloads onto EC2 container instances with GPUs (such as G or P families) using the GPU-optimized AMI, and pins GPUs to containers that request them. Fargate doesn't accept the gpu parameter.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-gpu.html", "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-tasks-services.html"] },

  // Task 3.3: high-performing database solutions
  { id: "saa-3-112", exam: "SAA", saa: "3.3", topic: "redshift", type: "mc",
    q: "A provisioned Amazon Redshift cluster serves BI dashboards. For the first three days of each month, hundreds of analysts run reports at once, queries wait in the WLM queues, and dashboards slow down. The rest of the month the cluster is lightly used. The company wants consistently fast queries on the busy days without paying for a larger cluster all month. What should a solutions architect do?",
    opts: [
      "Turn on concurrency scaling for the WLM queues that the BI dashboards and reports use.",
      "Use elastic resize to double the cluster's node count, and leave the larger cluster running.",
      "Create Redshift read replicas in the same Region, and point the analysts' reports at them.",
      "Unload the busiest tables to S3, and query them through Redshift Spectrum external tables."
    ], a: 0,
    no: [null,
      "This pays for twice the nodes all month, which the company wants to avoid.",
      "Redshift has no read replica feature. Read replicas belong to RDS and Aurora.",
      "The queries would still wait in the same WLM queues, and scanning S3 is slower than reading local tables."],
    why: "With concurrency scaling, Redshift adds cluster capacity when queries would queue and sends eligible queries to it, giving consistently fast performance for thousands of concurrent users. You pay only while the concurrency-scaling clusters run queries.",
    doc: ["https://docs.aws.amazon.com/redshift/latest/dg/concurrency-scaling.html"] },

  { id: "saa-3-113", exam: "SAA", saa: "3.3", topic: "documentdb", type: "mc",
    q: "A content app runs on a self-managed MongoDB replica set on EC2. It stores articles as JSON documents and uses the MongoDB drivers and query API. The team spends too much time on backups, failover and scaling, and wants a managed database without rewriting the data access code. Which solution meets these requirements?",
    opts: [
      "Migrate the data to Amazon DocumentDB (with MongoDB compatibility), and point the app's drivers at it.",
      "Migrate the data to Amazon DynamoDB, with each article stored as an item in an on-demand table.",
      "Migrate the data to Amazon Keyspaces (for Apache Cassandra), with each article stored as a row.",
      "Move the replica set to larger EC2 instances, and script the backups and failover with cron jobs."
    ], a: 0,
    no: [null,
      "DynamoDB has its own API, so the MongoDB data access code would have to be rewritten.",
      "Keyspaces speaks CQL, the Cassandra query language, not the MongoDB API.",
      "The database stays self-managed, so the team still owns its backups, failover and scaling."],
    why: "DocumentDB is a fully managed, MongoDB-compatible document database. Apps keep the same code, drivers and tools they use with MongoDB, while DocumentDB handles automatic continuous backups, replicas and failover.",
    doc: ["https://docs.aws.amazon.com/documentdb/latest/devguide/what-is.html"] },

  { id: "saa-3-114", exam: "SAA", saa: "3.3", topic: "neptune", type: "mc",
    q: "A bank wants to flag fraud rings while a payment is being approved. It must follow links between accounts, devices, cards and addresses several hops deep and get an answer in milliseconds. The data has billions of these relationships. Which database should a solutions architect choose?",
    opts: [
      "Amazon Neptune, storing the entities and links as a graph queried with Gremlin or openCypher.",
      "Amazon Aurora MySQL, storing the links in a join table queried with recursive self-joins.",
      "Amazon Redshift, storing the links in fact tables and running the multi-hop queries in SQL.",
      "Amazon DocumentDB, storing each account as a document with its linked IDs in nested arrays."
    ], a: 0,
    no: [null,
      "Each extra hop adds another join, and recursive joins over billions of rows get too slow for an approval path.",
      "Redshift is a data warehouse for analytical queries, not millisecond lookups during a transaction.",
      "A document store needs a lookup per hop in application code, so deep link traversal stays slow."],
    why: "Neptune is a purpose-built graph database that stores billions of relationships and traverses highly connected data with millisecond latency. Fraud detection is one of its main use cases.",
    doc: ["https://docs.aws.amazon.com/neptune/latest/userguide/intro.html"] },

  { id: "saa-3-115", exam: "SAA", saa: "3.3", topic: "databases", type: "multi", hint: "Select TWO.",
    q: "A company is moving two workloads to managed AWS databases. One is an application that uses Apache Cassandra through CQL drivers, which must move without code changes or cluster management. The other stores readings that thousands of sensors send every few seconds and is queried for trends over time windows. Which choices meet these requirements? (Select TWO.)",
    items: [
      { t: "Move the Cassandra application to Amazon Keyspaces (for Apache Cassandra).", ok: true },
      { t: "Store the sensor readings in Amazon Timestream, a managed, purpose-built time-series database.", ok: true },
      { t: "Move the Cassandra application to Amazon DocumentDB using the existing drivers.", ok: false, no: "DocumentDB is compatible with MongoDB, not Cassandra, so the CQL code would have to change." },
      { t: "Run Cassandra on storage-optimized EC2 instances spread across three Availability Zones.", ok: false, no: "This works, but the company would manage the cluster itself, which the requirement rules out." },
      { t: "Store the sensor readings in Amazon Neptune, with one vertex for each sensor reading.", ok: false, no: "Neptune is a graph database for relationships. It isn't built for time-window aggregation of readings." }
    ],
    why: "Amazon Keyspaces is a managed, serverless Cassandra-compatible service that runs existing CQL code and drivers. Amazon Timestream is a managed, purpose-built time-series database for storing and analyzing high volumes of timestamped data such as sensor readings.",
    doc: ["https://docs.aws.amazon.com/keyspaces/latest/devguide/what-is-keyspaces.html", "https://docs.aws.amazon.com/timestream/latest/developerguide/what-is-timestream.html"] },

  { id: "saa-3-116", exam: "SAA", saa: "3.3", topic: "rds", type: "mc",
    q: "A write-heavy order system runs on RDS for PostgreSQL with a 300 GiB General Purpose SSD (gp2) volume. During long busy periods, write latency jumps after the volume's I/O burst balance runs out. The database needs consistently low I/O latency at a steady, known IOPS level. Which change meets this requirement?",
    opts: [
      "Change the DB instance's storage to Provisioned IOPS SSD storage, with the needed IOPS set.",
      "Add a read replica in the same Region, and send part of the application's traffic to it.",
      "Turn on Multi-AZ for the DB instance so that a standby shares the I/O load of the primary.",
      "Put an ElastiCache cluster in front of the database, and cache the results of order queries."
    ], a: 0,
    no: [null,
      "A read replica only serves reads. Every write still lands on the primary's volume.",
      "A Multi-AZ standby is for failover. It doesn't serve traffic or add I/O capacity.",
      "Caching cuts repeated reads, but the problem is write latency on the primary's storage."],
    why: "Provisioned IOPS SSD storage (io1 or io2 Block Express) is designed for I/O-intensive database workloads that need low I/O latency and consistent throughput, with no burst balance to run out.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html"] },

  { id: "saa-3-117", exam: "SAA", saa: "3.3", topic: "dynamodb", type: "mc",
    q: "A mobile game stores player profiles and game state that are always read and written by player ID, with no joins. Traffic grows from thousands to millions of requests per second around each new season, and every request needs single-digit millisecond latency. The team doesn't want to manage servers or plan database capacity. Which database fits best?",
    opts: [
      "Amazon DynamoDB, with the table in on-demand capacity mode and player ID as the partition key.",
      "Amazon Aurora MySQL, with several Aurora Replicas added to take the read traffic at launch time.",
      "Amazon RDS for MySQL, on the largest memory-optimized DB instance class that is available.",
      "Amazon DocumentDB, with instances added to the cluster ahead of each new season's launch."
    ], a: 0,
    no: [null,
      "Every write still goes through a single writer instance, and the team would size instances for each launch.",
      "One instance has a fixed ceiling, and the team would still plan and manage its capacity.",
      "DocumentDB is instance-based, so the team would plan and add capacity for each launch."],
    why: "DynamoDB is a serverless key-value and document database with consistent single-digit millisecond performance at any scale. On-demand mode scales with traffic and bills per request, with no capacity to plan.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html"] },

  // Task 3.4: high-performing and scalable network architectures
  { id: "saa-3-118", exam: "SAA", saa: "3.4", topic: "elb", type: "multi", hint: "Select TWO.",
    q: "A company must send all traffic entering and leaving its application VPC through a fleet of third-party firewall appliances from a vendor it already licenses. The appliances must scale out as traffic grows, and the application servers must not need any changes. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Deploy a Gateway Load Balancer in the appliance VPC, with the appliances registered as targets.", ok: true },
      { t: "Create Gateway Load Balancer endpoints and set them as the next hop in the subnet route tables.", ok: true },
      { t: "Deploy an Application Load Balancer in front of the appliances, and route traffic through it.", ok: false, no: "An ALB terminates HTTP and HTTPS requests. It can't pass all IP traffic transparently through appliances." },
      { t: "Replace the vendor appliances with AWS Network Firewall, and route the subnets through it.", ok: false, no: "Network Firewall is AWS's own managed firewall, but the company must use its licensed vendor appliances." },
      { t: "Attach an extra elastic network interface to every application server for the inspected traffic.", ok: false, no: "This changes every application server and does nothing to spread traffic across the appliances." }
    ],
    why: "A Gateway Load Balancer is a transparent layer 3 gateway that spreads IP traffic across virtual appliances using GENEVE. Gateway Load Balancer endpoints are placed in route tables as the next hop, so traffic passes through the appliances with no change to the servers.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/gateway/introduction.html"] },

  { id: "saa-3-119", exam: "SAA", saa: "3.4", topic: "transitgateway", type: "mc",
    q: "A company has 60 VPCs across many accounts in one Region, and its data center connects through Site-to-Site VPN. Most VPCs must reach each other and the data center, and the full mesh of VPC peering connections has become too hard to manage. Which design should a solutions architect use?",
    opts: [
      "Create a transit gateway, share it with AWS RAM, and attach every VPC and the VPN to it.",
      "Keep the full mesh of VPC peering connections, and manage the route tables with a script.",
      "Expose each VPC's workloads to the others as endpoint services through AWS PrivateLink.",
      "Build a transit VPC that runs self-managed VPN router instances on EC2 to link the VPCs."
    ], a: 0,
    no: [null,
      "Peering isn't transitive, so a full mesh needs a connection for every pair of VPCs, which is the problem today.",
      "PrivateLink exposes individual services one way. It doesn't give full network routing between VPCs and the data center.",
      "This works, but the company would run, patch and scale the router instances itself."],
    why: "A transit gateway is a regional hub that routes between attached VPCs and VPN or Direct Connect connections. It can be shared across accounts with AWS RAM, replacing a peering mesh with one attachment per VPC.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html", "https://docs.aws.amazon.com/vpc/latest/tgw/tgw-transit-gateways.html"] },

  { id: "saa-3-120", exam: "SAA", saa: "3.4", topic: "localzones", type: "mc",
    q: "A film studio in Los Angeles runs virtual workstations for its artists on EC2 in us-west-2. Artists connect over the studio's wired network, and the round trip to the Region makes interactive editing feel sluggish. The company wants the workstations as close to the artists as possible, still managed with standard EC2 and VPC tools. Which solution meets these requirements?",
    opts: [
      "Extend the VPC with a subnet in the Los Angeles Local Zone, and launch the workstations in that subnet.",
      "Put the workstations behind AWS Global Accelerator, and give the artists its two static IP addresses.",
      "Launch the workstations in an AWS Wavelength Zone in a telecom carrier's network in Los Angeles.",
      "Deliver the workstation sessions through a CloudFront distribution with edge locations in Los Angeles."
    ], a: 0,
    no: [null,
      "Global Accelerator improves the network path into AWS, but the workstations still run in the distant Region.",
      "Wavelength Zones sit inside carriers' 5G networks for mobile devices, not the studio's wired network.",
      "CloudFront caches and delivers web content. It doesn't run the EC2 workstations any closer to the artists."],
    why: "A Local Zone is an extension of a Region close to large population and industry centers, such as us-west-2-lax-1 for Los Angeles. You create a subnet there in the same VPC and launch instances near the users, for low-latency apps such as virtual workstations.",
    doc: ["https://docs.aws.amazon.com/local-zones/latest/ug/what-is-aws-local-zones.html", "https://docs.aws.amazon.com/local-zones/latest/ug/how-local-zones-work.html", "https://docs.aws.amazon.com/wavelength/latest/developerguide/what-is-wavelength.html"] },

  { id: "saa-3-121", exam: "SAA", saa: "3.4", topic: "directconnect", type: "multi", hint: "Select TWO.",
    q: "A company replicates large database volumes from its data center to a VPC all day. Replication over its internet VPN is slow and its latency varies, so the company wants a link with consistent bandwidth and latency. It also wants a low-cost backup path that takes over automatically if that link fails. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Order an AWS Direct Connect connection, and create a private virtual interface to the VPC.", ok: true },
      { t: "Keep a Site-to-Site VPN on the same virtual private gateway as the backup, using BGP routing.", ok: true },
      { t: "Add a second Site-to-Site VPN connection over the internet, and use both as the main link.", ok: false, no: "Both tunnels still ride the public internet, so bandwidth and latency stay inconsistent." },
      { t: "Set up AWS Client VPN on the database servers, and send the replication traffic over it.", ok: false, no: "Client VPN connects individual users' devices, and it still runs over the internet." },
      { t: "Turn on S3 Transfer Acceleration, and stage the replication files in an S3 bucket first.", ok: false, no: "Transfer Acceleration speeds uploads to S3 over long distances. It isn't a private link into the VPC." }
    ],
    why: "Direct Connect gives a dedicated private connection that bypasses the internet, for consistent performance. For the same prefix, the VPC prefers Direct Connect BGP routes over VPN routes, so the VPN carries traffic only if Direct Connect fails.",
    doc: ["https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html", "https://docs.aws.amazon.com/vpc/latest/userguide/route-tables-priority.html"] },

  { id: "saa-3-122", exam: "SAA", saa: "3.4", topic: "route53", type: "multi", hint: "Select TWO.",
    q: "A company connects its data center to a VPC over Direct Connect. On-premises servers must resolve names in a Route 53 private hosted zone associated with the VPC, and EC2 instances must resolve names in corp.internal, which only the on-premises DNS servers can answer. Internal names must not be published on the internet. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create a Route 53 Resolver inbound endpoint, and have on-premises DNS servers forward the zone's names to it.", ok: true },
      { t: "Create a Route 53 Resolver outbound endpoint and a forwarding rule for corp.internal, and associate it with the VPC.", ok: true },
      { t: "Copy the private hosted zone's records into a public hosted zone so that on-premises servers can resolve them.", ok: false, no: "A public hosted zone publishes the internal names on the internet, which the company forbids." },
      { t: "Associate the private hosted zone with the on-premises network through the Direct Connect virtual interface.", ok: false, no: "Private hosted zones can be associated only with VPCs, not with on-premises networks." },
      { t: "Create a Route 53 Resolver DNS Firewall rule group that allows corp.internal, and associate it with the VPC.", ok: false, no: "DNS Firewall filters outbound queries. It doesn't forward them to the on-premises DNS servers." }
    ],
    why: "An inbound Resolver endpoint accepts DNS queries from on premises into the VPC. An outbound endpoint plus a forwarding rule sends queries for chosen domains from the VPC to on-premises resolvers over Direct Connect or VPN.",
    doc: ["https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver.html"] },

  // Task 3.5: high-performing data ingestion and transformation
  { id: "saa-3-123", exam: "SAA", saa: "3.5", topic: "flink", type: "mc",
    q: "A retailer streams clickstream events into Amazon Kinesis Data Streams. It needs per-product view counts over 5-minute windows, updated continuously, to feed a live dashboard within seconds of each event. The company wants a managed service and doesn't want to run servers or clusters. Which solution meets these requirements?",
    opts: [
      "Run an Amazon Managed Service for Apache Flink application that reads the stream and computes the windows.",
      "Deliver the stream to S3 with Amazon Data Firehose, and run Athena queries over the files every 5 minutes.",
      "Run Spark Structured Streaming on a long-running Amazon EMR cluster that reads from the Kinesis stream.",
      "Run an AWS Glue crawler on the stream every minute, and query the Data Catalog table it builds with Athena."
    ], a: 0,
    no: [null,
      "Results would be minutes old: files land in batches and the queries run on a schedule, not as events arrive.",
      "This works, but the company would size, patch and pay for a cluster, which it wants to avoid.",
      "A crawler infers schemas for the Data Catalog. It doesn't aggregate stream data or update a dashboard."],
    why: "Managed Service for Apache Flink runs Flink applications for you, handling compute provisioning, scaling and checkpoints. Flink processes each event as it arrives, for time-series analytics and real-time dashboards.",
    doc: ["https://docs.aws.amazon.com/managed-flink/latest/java/what-is.html"] },

  { id: "saa-3-124", exam: "SAA", saa: "3.5", topic: "glue", type: "multi", hint: "Select TWO.",
    q: "Each night, partner systems drop large CSV files into a raw S3 bucket. The company needs the data converted to Parquet in a curated bucket, and the table definitions that Athena uses must stay current as new partitions and columns appear. The solution must be serverless with the LEAST operational overhead. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Run a scheduled AWS Glue ETL job that reads the CSV files and writes Parquet to the curated bucket.", ok: true },
      { t: "Run an AWS Glue crawler on the curated bucket after each job to update the Glue Data Catalog.", ok: true },
      { t: "Keep an Amazon EMR cluster running all the time, and submit a Spark step each night to convert files.", ok: false, no: "This works, but an always-on cluster is servers to size, patch and pay for, not a serverless design." },
      { t: "Create an AWS DataSync task that copies the raw bucket to the curated bucket in Parquet format.", ok: false, no: "DataSync copies files and objects as they are. It doesn't convert file formats." },
      { t: "Send each CSV file into Amazon Kinesis Data Streams, and let a consumer rewrite records as Parquet.", ok: false, no: "Kinesis is for continuous streams of records. Nightly batch files would need custom producer and consumer code." }
    ],
    why: "AWS Glue is serverless: an ETL job converts and writes the data, and a crawler infers schemas and partitions and updates the Data Catalog tables that Athena, EMR and Redshift Spectrum query.",
    doc: ["https://docs.aws.amazon.com/glue/latest/dg/what-is-glue.html", "https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html"] },

  { id: "saa-3-125", exam: "SAA", saa: "3.5", topic: "msk", type: "mc",
    q: "A company runs a self-managed Apache Kafka cluster on premises. Dozens of producer and consumer applications use the Kafka client APIs. The company is moving to AWS and wants a managed streaming service without rewriting any of these applications. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Create an Amazon MSK cluster, and point the applications at its bootstrap brokers.",
      "Create Amazon Kinesis Data Streams, and replace the Kafka clients with the Kinesis SDK.",
      "Create an Amazon MQ broker, and connect the producers and consumers to it with Kafka clients.",
      "Install Apache Kafka on EC2 instances in an Auto Scaling group spread across three AZs."
    ], a: 0,
    no: [null,
      "Kinesis has its own API, so every producer and consumer would have to be rewritten.",
      "Amazon MQ runs ActiveMQ and RabbitMQ brokers. It doesn't speak the Kafka protocol.",
      "This keeps Kafka, but the company would still patch, scale and repair the brokers itself."],
    why: "Amazon MSK runs Apache Kafka as a managed service, so existing Kafka producers and consumers work by changing only their broker connection settings.",
    doc: ["https://docs.aws.amazon.com/msk/latest/developerguide/what-is-msk.html"] },

  { id: "saa-3-126", exam: "SAA", saa: "3.5", topic: "redshift", type: "mc",
    q: "A Redshift cluster holds the last two years of sales data. Eight more years of history sit in S3 as Parquet files. Analysts occasionally need single SQL queries that join recent and historical data, and the company doesn't want to grow the cluster to store the history. Which solution meets these requirements?",
    opts: [
      "Define the S3 history as external tables with Redshift Spectrum, and join them in Redshift queries.",
      "Load all of the historical files into Redshift tables with COPY, and add nodes to hold the extra data.",
      "Query the history in Athena and the recent data in Redshift, then merge both results in a spreadsheet.",
      "Move the recent data out of Redshift into S3, and shut down the cluster to cut costs on storage."
    ], a: 0,
    no: [null,
      "This grows the cluster to store the history, which the company wants to avoid.",
      "The analysts need single SQL queries, and merging results by hand is slow and error-prone.",
      "This removes the warehouse that serves the frequent queries on recent data."],
    why: "Redshift Spectrum queries files in S3 through external tables without loading them, and those tables can be joined to local Redshift tables in one query.",
    doc: ["https://docs.aws.amazon.com/redshift/latest/dg/c-using-spectrum.html"] },

  { id: "saa-3-127", exam: "SAA", saa: "3.5", topic: "lakeformation", type: "mc",
    q: "A data lake in S3 is cataloged in the AWS Glue Data Catalog and queried with Athena by several teams. Most analysts must not see the salary columns in the HR tables, and regional analysts may see only rows for their own region. The company wants to manage these grants centrally without keeping copies of the data. Which solution meets these requirements?",
    opts: [
      "Register the data in AWS Lake Formation, and grant column permissions and row-level data filters.",
      "Write S3 bucket policies that allow each team to read only the objects that it is allowed to see.",
      "Run Glue jobs each night that write a filtered copy of each HR table for every team and region.",
      "Attach IAM policies that allow glue:GetTable on only the Data Catalog tables each team may use."
    ], a: 0,
    no: [null,
      "Bucket policies work on whole objects. They can't hide columns or rows inside a file.",
      "This keeps many copies of the data in sync, which the company wants to avoid.",
      "IAM grants on catalog tables work per table, not per column or row."],
    why: "Lake Formation adds its own grant-and-revoke permissions on Data Catalog resources, enforced at column, row and cell level across Athena, Redshift Spectrum, EMR, Glue and Amazon Quick.",
    doc: ["https://docs.aws.amazon.com/lake-formation/latest/dg/what-is-lake-formation.html"] },

  { id: "saa-3-128", exam: "SAA", saa: "3.5", topic: "datasync", type: "mc",
    q: "A company is moving 80 TB of files from an on-premises NFS server to Amazon EFS over an existing 10 Gbps Direct Connect link. File metadata must be preserved, transferred data must be checked for integrity, and changed files must keep syncing every few hours until cutover. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Deploy an AWS DataSync agent, and run a scheduled DataSync task from the NFS share to EFS.",
      "Deploy an S3 File Gateway, copy the files onto its share, and then load them into EFS from S3.",
      "Mount EFS on an on-premises server, and run rsync from a cron job every few hours until cutover.",
      "Set up AWS Transfer Family with SFTP, and have the on-premises servers upload files to EFS."
    ], a: 0,
    no: [null,
      "The gateway stores files in S3, so a second copy step into EFS would still be needed.",
      "This could work, but the team would script, monitor and verify the transfers itself.",
      "Transfer Family accepts uploads from SFTP clients. It doesn't sync changed files or verify transfers."],
    why: "DataSync copies data from NFS to EFS, keeps metadata, verifies integrity, transfers only changed data on later runs, and can run on a schedule.",
    doc: ["https://docs.aws.amazon.com/datasync/latest/userguide/how-datasync-transfer-works.html", "https://docs.aws.amazon.com/datasync/latest/userguide/task-scheduling.html"] }
);
