// Question bank batch: SAA-C03 Domain 4 (Design Cost-Optimized Architectures), tasks 4.1-4.4 plus cost tools. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 4.1: cost-optimized storage
  { id: "saa-4-101", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "An image service writes about 2 million thumbnails a day to S3, each around 40 KB. A thumbnail is read many times on its first day, rarely after that, and must be deleted 60 days after it is written. Which storage approach is MOST cost-effective?",
    opts: [
      "Keep the thumbnails in S3 Standard, and add a lifecycle rule that expires each object 60 days after it is created.",
      "Write the thumbnails to S3 Standard, with a lifecycle rule that moves them to S3 Standard-IA after 30 days and expires them at 60 days.",
      "Write the thumbnails straight to S3 One Zone-IA, and add a lifecycle rule that expires each object 60 days after it is created.",
      "Write the thumbnails to S3 Standard, with a lifecycle rule that moves them to S3 Glacier Instant Retrieval after 30 days and expires them at 60."
    ], a: 0,
    no: [null,
      "Standard-IA bills every object as at least 128 KB, so 40 KB thumbnails cost more there. By default, lifecycle doesn't even move objects under 128 KB.",
      "One Zone-IA also bills each object as 128 KB and charges for every GB retrieved, which hurts on the busy first day.",
      "Glacier Instant Retrieval bills objects as at least 128 KB and has a 90-day minimum duration, so deleting at day 60 is billed to day 90."],
    why: "Standard-IA, One Zone-IA and Glacier Instant Retrieval bill objects smaller than 128 KB as 128 KB and have minimum storage durations. For small, short-lived objects, S3 Standard with an expiration rule is cheapest.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html"] },

  { id: "saa-4-102", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "A research group keeps 400 TB of files, most larger than 1 MB, in S3 Intelligent-Tiering. Many files go untouched for more than six months, yet any of them can suddenly be needed again and then stay in use for weeks. Analysts accept a wait of up to 12 hours, but only for files unused for six months or more. Which change lowers storage costs the MOST while meeting these needs?",
    opts: [
      "Add an Intelligent-Tiering archive configuration that activates the Deep Archive Access tier after 180 days without access.",
      "Add a lifecycle rule that transitions every object to the S3 Glacier Deep Archive storage class 180 days after it was created.",
      "Add a lifecycle rule that transitions every object to the S3 One Zone-IA storage class 180 days after it was created.",
      "Add an Intelligent-Tiering archive configuration that activates the Archive Access tier after 90 days without access."
    ], a: 0,
    no: [null,
      "Lifecycle acts on age, not on use, so files still in use at six months get archived anyway, and every revived file needs restores with retrieval charges.",
      "One Zone-IA costs far more than an archive tier, charges for each GB retrieved, and keeps the data in a single AZ.",
      "Files unused for only 90 days would need a restore of hours, but analysts accept waits only for files unused for six months."],
    why: "With the Deep Archive Access tier active, Intelligent-Tiering moves objects that haven't been accessed for at least 180 days (configurable) to its lowest-cost tier, with standard restores within 12 hours. A restored object returns to the Frequent Access tier, and Intelligent-Tiering has no retrieval fees.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-managing.html"] },

  { id: "saa-4-103", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "A company shares a 50 TB geospatial dataset in an S3 bucket with partner companies, all of which have their own AWS accounts. Partners download large parts of it every month, and the company's data transfer bill keeps growing. The company wants the partners to pay for their own downloads, while it keeps paying for storage. What should a solutions architect do?",
    opts: [
      "Turn on Requester Pays for the bucket, and have partners send authenticated requests that accept the charges.",
      "Put a CloudFront distribution in front of the bucket, and give each partner the distribution's domain name to use.",
      "Generate presigned URLs for each partner's downloads, and set each URL to expire after seven days.",
      "Move the dataset to S3 One Zone-IA, and grant the partner accounts read access in the bucket policy."
    ], a: 0,
    no: [null,
      "CloudFront bills its delivery charges to the account that owns the distribution, which is the company.",
      "A presigned URL only grants access. The bucket owner still pays for the requests and the data transferred.",
      "A cheaper storage class doesn't move the download charges, and One Zone-IA adds a fee for every GB retrieved."],
    why: "In a Requester Pays bucket, the requester pays for requests and data downloaded, and the bucket owner pays for storage. Requests must be authenticated and must accept the charges (x-amz-request-payer), so anonymous access isn't allowed.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/RequesterPaysBuckets.html"] },

  { id: "saa-4-104", exam: "SAA", saa: "4.1", topic: "s3", type: "multi", hint: "Select TWO.",
    q: "A company has more than 300 S3 buckets across the accounts in its organization. The S3 bill keeps rising even though the amount of current data is flat. The team suspects abandoned multipart uploads and old object versions in versioned buckets, and wants to find and remove this waste across the organization. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Use an S3 Storage Lens dashboard for the organization to find buckets with incomplete multipart upload bytes and noncurrent version bytes.", ok: true },
      { t: "Add lifecycle rules to those buckets that use the AbortIncompleteMultipartUpload and NoncurrentVersionExpiration actions.", ok: true },
      { t: "Make S3 Intelligent-Tiering the storage class for all new uploads, so that unused data is tiered down.", ok: false, no: "Tiering lowers the price of data that is kept. It doesn't remove unfinished upload parts or old versions." },
      { t: "Disable S3 Versioning on the versioned buckets, so that their old object versions are removed.", ok: false, no: "Versioning can only be suspended, and suspending it keeps every existing version." },
      { t: "Turn on S3 server access logging for every bucket, and review the logs each month for waste.", ok: false, no: "Access logs list requests, not the bytes held by unfinished uploads or old versions, and reading them is slow manual work." }
    ],
    why: "Storage Lens aggregates storage metrics across an organization, including incomplete multipart upload bytes and noncurrent version bytes. Lifecycle rules then abort old incomplete uploads and expire noncurrent versions automatically.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage_lens.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpu-abort-incomplete-mpu-lifecycle-config.html"] },

  { id: "saa-4-105", exam: "SAA", saa: "4.1", topic: "ebs", type: "multi", hint: "Select TWO.",
    q: "A company runs 400 EC2 instances whose boot and data volumes are all gp2, and most volumes need no more than 3,000 IOPS. A review also found dozens of volumes in the available state that no instance has used for months; their data must stay recoverable. Which actions reduce EBS costs without downtime? (Select TWO.)",
    items: [
      { t: "Change the gp2 volumes to gp3 with Elastic Volumes while they stay attached and in use.", ok: true },
      { t: "Take a snapshot of each unattached volume, and then delete the volumes.", ok: true },
      { t: "Change the boot volumes to Throughput Optimized HDD (st1), which costs less per GiB.", ok: false, no: "st1 and sc1 volumes can't be boot volumes, and HDD suits large sequential I/O, not random access." },
      { t: "Detach the data volumes each night, and attach them again each morning.", ok: false, no: "A detached volume is still billed for its storage, and detaching interrupts the apps." },
      { t: "Change the gp2 volumes to io2 so that each volume's IOPS can be set exactly.", ok: false, no: "io2 is built for high, sustained IOPS and costs more than gp3 for these modest needs." }
    ],
    why: "gp3 costs up to 20 percent less per GiB than gp2 and includes 3,000 IOPS at any size, and Elastic Volumes changes the type without detaching. Unattached volumes are billed until they are deleted, and a snapshot keeps the data recoverable.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html", "https://docs.aws.amazon.com/ebs/latest/userguide/ebs-detaching-volume.html"] },

  { id: "saa-4-106", exam: "SAA", saa: "4.1", topic: "ebs", type: "mc",
    q: "When a project ends, a company takes a final EBS snapshot of each of the project's volumes and must keep it for 5 years. These snapshots are almost never restored, and when one is needed, waiting up to three days is acceptable. Which solution is MOST cost-effective?",
    opts: [
      "Move each end-of-project snapshot to the EBS Snapshots Archive tier, and restore it to the standard tier when needed.",
      "Keep the snapshots in the EBS Snapshot standard tier, and add a Recycle Bin retention rule that keeps them for 5 years.",
      "Add a lifecycle rule to the S3 bucket that holds the snapshots, moving them to S3 Glacier Deep Archive.",
      "Keep each project's EBS volume detached from any instance, and delete the volume when five years have passed."
    ], a: 0,
    no: [null,
      "Recycle Bin protects against accidental deletion. The snapshots still pay standard-tier prices for 5 years.",
      "EBS snapshots aren't kept in a bucket you can see or manage, so S3 lifecycle rules can't reach them.",
      "A detached volume is still billed for all of its provisioned storage, far more than an archived snapshot."],
    why: "Snapshots Archive costs up to 75 percent less for snapshots kept 90 days or longer. Restoring one to the standard tier can take up to 72 hours, and archived snapshots are full copies rather than incremental ones.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive.html", "https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive-considerations.html"] },

  { id: "saa-4-107", exam: "SAA", saa: "4.1", topic: "datasync", type: "mc",
    q: "A company must move 40 TB of finished project files from an on-premises NFS server to AWS to free up the server. The files must be kept for 10 years and are rarely needed; a retrieval within 48 hours is fine. The site's 1 Gbps internet connection is mostly idle at night, and the move must finish within a month. Which solution is MOST cost-effective?",
    opts: [
      "Run an AWS DataSync task each night over the existing connection that writes the files straight to the S3 Glacier Deep Archive storage class.",
      "Run an AWS DataSync task each night that writes the files to S3 Standard, with a lifecycle rule to Glacier Deep Archive after 30 days.",
      "Order an AWS Direct Connect dedicated connection, and copy the files over it to S3 Glacier Deep Archive once the link is ready.",
      "Upload the files each night with the AWS CLI through an S3 Transfer Acceleration endpoint into S3 Glacier Deep Archive."
    ], a: 0,
    no: [null,
      "It works, but it pays a month of Standard prices on 40 TB that nobody reads.",
      "Port-hour charges and weeks of lead time buy nothing for a one-time copy that the existing link can finish in days.",
      "Transfer Acceleration can add data transfer charges and helps long-distance uploads, and hand-built CLI scripts lack DataSync's checks and scheduling."],
    why: "DataSync copies NFS data over the network with integrity checks and can write straight to a Glacier storage class, so the data spends no time in a pricier class. At 1 Gbps, 40 TB takes roughly 90 hours of transfer, well within a month of nights.",
    doc: ["https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html"] },

  // Task 4.2: cost-optimized compute
  { id: "saa-4-108", exam: "SAA", saa: "4.2", topic: "ec2", type: "mc",
    q: "A company will run a fleet of EC2 instances around the clock for the next three years for a production service that can't be interrupted. During that time it plans to move the fleet to a newer instance family and may switch its operating system. Finance wants the largest discount that still allows those changes. Which purchasing option should the company choose?",
    opts: [
      "Buy 3-year Convertible Reserved Instances, and exchange them for the new instance family and platform when the fleet changes.",
      "Buy 3-year Standard Reserved Instances, and modify them to match the new instance family and platform later when the fleet changes.",
      "Run the fleet on Spot Instances spread across several instance families and Availability Zones for the three years.",
      "Run the fleet On-Demand, and create On-Demand Capacity Reservations for the instance types that the fleet uses."
    ], a: 0,
    no: [null,
      "Standard RIs can't be exchanged, and modifying one only changes attributes such as the AZ, scope or size within the same family.",
      "Spot Instances can be reclaimed, which a production service that can't be interrupted can't accept.",
      "Capacity Reservations are billed at the On-Demand rate. They hold capacity but give no discount."],
    why: "Convertible RIs give a smaller discount than Standard RIs, but they can be exchanged during the term for RIs with a different instance family, instance type, platform, scope or tenancy.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/reserved-instances-types.html", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ri-modifying.html"] },

  { id: "saa-4-109", exam: "SAA", saa: "4.2", topic: "spot", type: "multi", hint: "Select TWO.",
    q: "A company runs CI build jobs on an EC2 Fleet of Spot Instances that uses the lowest-price allocation strategy and a single instance type. Builds are often interrupted and must restart, which delays releases. The company wants fewer interruptions while it keeps paying Spot prices. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Change the fleet's Spot allocation strategy to price-capacity-optimized.", ok: true },
      { t: "Let the fleet choose from many suitable instance types across all Availability Zones.", ok: true },
      { t: "Set a maximum Spot price just above the current Spot price for the instance type.", ok: false, no: "A low maximum price adds another reason to lose instances when the price rises. It doesn't keep capacity." },
      { t: "Keep the lowest-price strategy, and set the number of Spot pools to use to one.", ok: false, no: "Drawing from the single cheapest pool concentrates the fleet where interruptions are most likely." },
      { t: "Move the fleet to On-Demand Instances, keeping the same single instance type.", ok: false, no: "That ends interruptions, but it gives up the Spot discount the company wants to keep." }
    ],
    why: "Price-capacity-optimized picks the Spot pools least likely to be interrupted and then the cheapest of those, and more instance types and AZs give it more pools to choose from. AWS doesn't recommend lowest price, which has the highest interruption risk.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-fleet-allocation-strategy.html", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/spot-best-practices.html"] },

  { id: "saa-4-110", exam: "SAA", saa: "4.2", topic: "ec2", type: "mc",
    q: "A company is moving Windows Server and SQL Server workloads to EC2. It has existing licenses that are counted per socket and per physical core, and the license terms require it to track the physical servers its software runs on. Which option lets the company use these licenses at the lowest cost?",
    opts: [
      "Run the instances on EC2 Dedicated Hosts, and use each host's socket and core counts for license reporting.",
      "Run the instances as Dedicated Instances, which run on hardware that isn't shared with other accounts.",
      "Run the instances with default tenancy from AWS-provided AMIs that include the Windows and SQL Server licenses.",
      "Run the instances with default tenancy, and enter the company's existing license keys on each instance."
    ], a: 0,
    no: [null,
      "Dedicated Instances give no visibility of sockets, cores or host IDs, so per-core licenses can't be tracked.",
      "License-included instances charge again for licenses the company already owns.",
      "Shared hardware gives no socket or core visibility, which these license terms require."],
    why: "Dedicated Hosts are physical servers for one account that show their sockets and physical cores and can keep instances on the same host, so per-socket and per-core licenses can be brought along. Dedicated Instances give no such visibility.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-overview.html"] },

  { id: "saa-4-111", exam: "SAA", saa: "4.2", topic: "computeoptimizer", type: "mc",
    q: "A company runs several hundred EC2 instances of many types for its Java services. It suspects many are oversized and wants per-instance rightsizing recommendations based on actual use, including the price impact of moving each workload to AWS Graviton-based instances. Which solution meets these requirements with the LEAST effort?",
    opts: [
      "Opt in to AWS Compute Optimizer, and review its EC2 recommendations with the Graviton CPU architecture preference.",
      "Build CloudWatch dashboards of each instance's CPU use, and pick smaller and Graviton-based types by hand.",
      "Turn on the AWS Config desired-instance-type managed rule, and then resize every instance that it marks as noncompliant.",
      "Use the Savings Plans recommendations in Cost Explorer, and buy a plan that covers the current hourly spend."
    ], a: 0,
    no: [null,
      "It's slow manual analysis across hundreds of instances, and CPU alone misses memory and network needs.",
      "That rule only checks instances against a list of types you supply. It doesn't analyze use or recommend sizes.",
      "A Savings Plan discounts the current spend. It doesn't resize oversized instances."],
    why: "Compute Optimizer analyzes utilization metrics to find over-provisioned instances and recommend instance types, and its Graviton (aws-arm64) preference shows the price and performance impact of moving to Graviton.",
    doc: ["https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-ec2-recommendations.html"] },

  { id: "saa-4-112", exam: "SAA", saa: "4.2", topic: "ec2", type: "mc",
    q: "An analytics app runs on one Linux EC2 instance with 64 GiB of memory. At startup it spends 40 minutes loading data into an in-memory cache before it is useful. Analysts use it only on weekdays from 9 AM to 6 PM, and they want it ready within minutes each morning. Which solution is MOST cost-effective?",
    opts: [
      "Launch the instance with hibernation enabled and an encrypted EBS root volume, hibernate it each evening, and start it each morning.",
      "Stop the instance each evening and start it each morning, and let the app rebuild its in-memory cache after each start.",
      "Buy a one-year Reserved Instance for the instance type, and leave the instance running every day and night.",
      "Keep the cache on the instance store volume of a storage optimized instance type, and stop the instance each evening."
    ], a: 0,
    no: [null,
      "A normal stop clears memory, so analysts would wait 40 minutes every morning.",
      "It still pays for every night and weekend hour that nobody uses.",
      "Instance store data is lost when the instance stops, so the cache would have to be rebuilt anyway."],
    why: "Hibernation saves RAM to the encrypted EBS root volume and reloads it on start, so the app resumes with its cache. A hibernated instance in the stopped state has no instance usage charges, only EBS storage.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/Hibernate.html", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/hibernating-prerequisites.html"] },

  { id: "saa-4-113", exam: "SAA", saa: "4.2", topic: "autoscaling", type: "multi", hint: "Select TWO.",
    q: "A test environment runs its web tier in an EC2 Auto Scaling group with a minimum of four instances, and its database on a Single-AZ RDS for MySQL DB instance. Testers use it only on weekdays from 8 AM to 6 PM. The company wants to stop paying for idle compute outside those hours, with no manual steps. Which actions should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Add recurring scheduled actions that set the group's capacity to zero each weekday evening and back to four each weekday morning.", ok: true },
      { t: "Use EventBridge Scheduler to stop the DB instance each weekday evening and start it each weekday morning.", ok: true },
      { t: "Buy Reserved Instances for the four web instances and a reserved DB instance for the database.", ok: false, no: "Reservations bill for every hour of the term, including the nights and weekends nobody uses." },
      { t: "Add a target tracking policy on CPU use so that the group scales in when the testers go home.", ok: false, no: "Target tracking never takes the group below its minimum of four instances." },
      { t: "Convert the DB instance to Multi-AZ, so that the standby serves testers while the primary is off.", ok: false, no: "A standby serves no traffic, and Multi-AZ adds the cost of a second instance." }
    ],
    why: "Scheduled actions set an Auto Scaling group's desired, minimum and maximum capacity at set times. A stopped RDS DB instance isn't charged for instance hours, only storage and backups, and it restarts on its own only after 7 days, longer than a weekend.",
    doc: ["https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-scheduled-scaling.html", "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html"] },

  { id: "saa-4-114", exam: "SAA", saa: "4.2", topic: "lambda", type: "mc",
    q: "A company resizes uploaded profile photos on an m5.large EC2 instance that runs day and night. Photos arrive in an S3 bucket, about 3,000 a day, and each resize takes about 2 seconds. The company wants to cut the cost of this processing and stop managing a server. Which solution is MOST cost-effective?",
    opts: [
      "Have S3 event notifications invoke a Lambda function that resizes each photo as soon as it is uploaded.",
      "Run the resizing code as an ECS service on Fargate, with one task kept running at all times for new uploads.",
      "Move the resizing code to a t3.micro instance that runs day and night, and buy a Reserved Instance for it.",
      "Move the resizing code to Spot Instances in an Auto Scaling group with a minimum size of one instance."
    ], a: 0,
    no: [null,
      "A task that never stops pays for 24 hours of capacity a day to do under 2 hours of work.",
      "It still leaves a server to patch and manage, which the company wants to stop doing.",
      "There are still servers to manage, and a Spot Instance can be reclaimed while photos wait."],
    why: "Lambda runs only when S3 sends an event and bills for requests and the compute time used, so about 100 minutes of work a day costs far less than an always-on server, with nothing to patch.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html", "https://docs.aws.amazon.com/lambda/latest/dg/welcome.html"] },

  { id: "saa-4-115", exam: "SAA", saa: "4.2", topic: "billing", type: "multi", hint: "Select TWO.",
    q: "Several teams share the member accounts of a company's organization in AWS Organizations, and finance needs each month's AWS costs broken down by team. Every resource already carries a Team tag. Which steps meet this requirement? (Select TWO.)",
    items: [
      { t: "In the organization's management account, activate Team as a user-defined cost allocation tag.", ok: true },
      { t: "Once the tag is active, use Cost Explorer to group the monthly costs by the Team tag.", ok: true },
      { t: "Activate Team as a cost allocation tag separately in each member account's Billing console.", ok: false, no: "Only the management account, or an account outside any organization, can manage cost allocation tags." },
      { t: "Turn on CloudTrail in every account, and count each team's API calls to divide the bill.", ok: false, no: "CloudTrail records who called which API. It doesn't record what resources cost." },
      { t: "Create one AWS Budgets cost budget for the organization, with an alert at 80 percent.", ok: false, no: "One overall budget alerts on total spend. It doesn't divide the costs by team." }
    ],
    why: "Tags don't appear in billing tools until they are activated as cost allocation tags, which is done in the management account. After that, Cost Explorer and the Cost and Usage Report can group costs by the tag.",
    doc: ["https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/cost-alloc-tags.html", "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html"] },

  // Task 4.3: cost-optimized databases
  { id: "saa-4-116", exam: "SAA", saa: "4.3", topic: "dynamodb", type: "mc",
    q: "A DynamoDB table holds 30 TB of order history that customers can still look up in the app with single-digit millisecond reads. Most orders are rarely read after a few months, and storage is now about 80 percent of the table's cost. The company wants to cut costs without changing the application. What should a solutions architect do?",
    opts: [
      "Change the table's class to DynamoDB Standard-Infrequent Access (Standard-IA).",
      "Switch the table from provisioned capacity to on-demand capacity mode.",
      "Purchase DynamoDB reserved capacity for the table's reads and writes.",
      "Export orders older than 90 days to S3 Glacier, and delete them from the table."
    ], a: 0,
    no: [null,
      "On-demand changes how reads and writes are billed. It does nothing for storage, which is most of the cost.",
      "Reserved capacity discounts throughput, not storage, and storage is most of the cost here.",
      "Customers could no longer look up old orders in milliseconds, and the app would need changes."],
    why: "Standard-IA suits tables where storage is about half the cost or more: storage costs about 60 percent less, and reads and writes cost more. The table class can be changed in place, with no change to the application.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.TableClasses.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/CostOptimization_TableClass.html"] },

  { id: "saa-4-117", exam: "SAA", saa: "4.3", topic: "dynamodb", type: "multi", hint: "Select TWO.",
    q: "A DynamoDB table in the Standard table class was created in on-demand mode for a new app. A year later its traffic is steady and predictable, about 4,000 writes and 10,000 reads per second around the clock, with small daily swings. Which actions will lower its cost the MOST while still serving this traffic? (Select TWO.)",
    items: [
      { t: "Switch the table to provisioned capacity mode, with auto scaling to follow the small daily swings.", ok: true },
      { t: "Purchase DynamoDB reserved capacity for the steady baseline of read and write capacity units.", ok: true },
      { t: "Change the table class to Standard-IA, so that reads and writes cost less.", ok: false, no: "Standard-IA lowers storage prices but raises read and write prices, and this table's cost is throughput." },
      { t: "Put a DynamoDB Accelerator (DAX) cluster in front of the table to absorb the writes.", ok: false, no: "DAX caches reads. Writes still go through to the table, and the cluster adds node costs." },
      { t: "Turn the table into a global table with a replica in a second Region.", ok: false, no: "A replica adds replicated writes and storage in another Region, which raises costs." }
    ],
    why: "Provisioned capacity costs less than on-demand for steady, predictable traffic, and auto scaling tracks small swings. Reserved capacity, for provisioned tables in the Standard table class, discounts the committed baseline further.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/reserved-capacity.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/provisioned-capacity-mode.html"] },

  { id: "saa-4-118", exam: "SAA", saa: "4.3", topic: "aurora", type: "mc",
    q: "An internal reporting app uses an Aurora MySQL cluster on a large provisioned instance class sized for its peaks. The load is light most of the day but jumps several times a day, at unpredictable times, to 10 to 20 minutes of heavy reads and writes. The company wants to stop paying for peak capacity all day without changing the application. What should a solutions architect do?",
    opts: [
      "Convert the cluster's DB instances to Aurora Serverless v2, with a capacity range that covers the light load and the peaks.",
      "Buy reserved DB instances for the current instance class, so that the peak-sized cluster costs less for every single hour it runs.",
      "Move the writer to a small instance class, and add Aurora Replicas with Aurora Auto Scaling for the peaks.",
      "Migrate the data to DynamoDB in on-demand mode, so that the company pays only for each request made."
    ], a: 0,
    no: [null,
      "A discount on capacity that sits idle most of the day still pays for that idle capacity.",
      "Replicas take only reads, so the heavy writes would overload the small writer.",
      "Moving from MySQL to DynamoDB means rewriting the application's data access."],
    why: "Aurora Serverless v2 adds and removes capacity in half-ACU steps as load changes, for reads and writes alike, so the cluster pays for peak capacity only while a peak lasts. It is meant for variable, spiky workloads and stays MySQL-compatible.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html"] },

  { id: "saa-4-119", exam: "SAA", saa: "4.3", topic: "rds", type: "mc",
    q: "A company uses a large RDS for PostgreSQL DB instance only for a one-week performance test at the end of each quarter. The rest of the time nobody uses it, but its data must be kept for the next test. Which solution is MOST cost-effective?",
    opts: [
      "After each test, take a manual snapshot and delete the DB instance, then restore a new one from it before the next test.",
      "Stop the DB instance after each test, and start it again just before the next quarter's test begins.",
      "Buy a three-year reserved DB instance for the instance class, and keep the DB instance running at all times.",
      "Scale the DB instance to the smallest instance class between tests, and scale it back up before each one."
    ], a: 0,
    no: [null,
      "RDS starts a stopped DB instance again by itself after 7 days, so it would run for most of the quarter.",
      "The reservation pays for every hour, though the database is used about one week in thirteen.",
      "The smallest class still bills every hour of the idle weeks, along with all of the provisioned storage."],
    why: "Between tests, only the snapshot's storage is billed. Stopping suits short breaks, because RDS starts a stopped DB instance again automatically after 7 days.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_StopInstance.html"] },

  { id: "saa-4-120", exam: "SAA", saa: "4.3", topic: "rds", type: "mc",
    q: "A production RDS for PostgreSQL database runs around the clock on a db.r6g.xlarge Multi-AZ DB instance, must keep its Multi-AZ failover, and will be needed for at least three more years. The team expects to scale it to db.r6g.2xlarge in the second year. Which purchasing approach gives a discount that keeps applying after the scale-up?",
    opts: [
      "Buy 3-year reserved DB instances for db.r6g.xlarge Multi-AZ, which apply across sizes, and reserve the added capacity later.",
      "Buy a 3-year Compute Savings Plan for the database's current hourly spend, which applies to any instance size.",
      "Convert the DB instance to Single-AZ, and buy 3-year Single-AZ reserved DB instances for db.r6g.xlarge.",
      "Buy 3-year reserved DB instances for db.r7g.xlarge, the newer class type, so that the reservation stays current over the term."
    ], a: 0,
    no: [null,
      "Compute Savings Plans cover EC2, Fargate and Lambda usage, not RDS DB instances.",
      "Production would lose its standby in another AZ and its automatic failover, which it must keep.",
      "A reservation applies only within its class type, so db.r7g reservations don't cover db.r6g instances."],
    why: "Size-flexible reserved DB instances for RDS for PostgreSQL apply across sizes in the same class type and Region, measured in normalized units, so the xlarge reservation covers half of a 2xlarge. More reservations can be bought for the rest.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithReservedDBInstances.html", "https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html"] },

  { id: "saa-4-121", exam: "SAA", saa: "4.3", topic: "athena", type: "multi", hint: "Select TWO.",
    q: "A company stores 200 TB of IoT sensor readings in S3 as CSV files and queries them with Athena. Most queries select a few columns from the last 7 days, yet each one scans almost the whole dataset, and Athena costs are high. Which changes will reduce query costs the MOST? (Select TWO.)",
    items: [
      { t: "Convert the data to compressed Apache Parquet, so queries read only the columns they need.", ok: true },
      { t: "Partition the data by date in S3, and filter on the date partition in queries.", ok: true },
      { t: "Load the data into a provisioned Amazon Redshift cluster that runs around the clock.", ok: false, no: "A cluster that runs all the time for occasional queries costs more and adds a warehouse to manage." },
      { t: "Move the CSV files to S3 Standard-IA, which costs less to store the data.", ok: false, no: "The storage class doesn't change how many bytes Athena scans, and Standard-IA adds a retrieval fee on every scan." },
      { t: "Split the data into many smaller CSV files, so that Athena reads them in parallel.", ok: false, no: "Small files add overhead, and every CSV row is still read in full, so the bytes scanned don't drop." }
    ],
    why: "Athena charges by the data it scans. Compressed, columnar Parquet lets it read only the needed columns and skip blocks, and date partitions let it skip data outside the range.",
    doc: ["https://docs.aws.amazon.com/athena/latest/ug/columnar-storage.html", "https://docs.aws.amazon.com/athena/latest/ug/partitions.html"] },

  // Task 4.4: cost-optimized networking
  { id: "saa-4-122", exam: "SAA", saa: "4.4", topic: "vpc", type: "multi", hint: "Select TWO.",
    q: "ECS tasks on Fargate in private subnets pull large container images from Amazon ECR in the same Region many times a day. All of this traffic goes through a NAT gateway, and its data processing charges are high. The tasks must stay in private subnets. Which steps let the image pulls bypass the NAT gateway? (Select TWO.)",
    items: [
      { t: "Create interface VPC endpoints for ecr.api and ecr.dkr, with private DNS enabled.", ok: true },
      { t: "Create an S3 gateway endpoint, and add it to the private subnets' route tables.", ok: true },
      { t: "Replace the NAT gateway with a NAT instance on a large EC2 instance type.", ok: false, no: "Pulls still pass through NAT, now on an instance the team must manage and scale." },
      { t: "Create an ECR pull through cache rule for the repositories that hold the images.", ok: false, no: "Pull through cache copies images from upstream registries. It doesn't change how tasks reach ECR." },
      { t: "Turn on ECR replication to copy the images to a second Region.", ok: false, no: "The images are already in the tasks' Region, and replication adds storage without removing the NAT path." }
    ],
    why: "Fargate tasks get the image manifest from ECR's endpoints and the image layers from S3. ECR interface endpoints and an S3 gateway endpoint, which has no extra charge, keep both inside the VPC with no NAT processing.",
    doc: ["https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html", "https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html"] },

  { id: "saa-4-123", exam: "SAA", saa: "4.4", topic: "cloudfront", type: "multi", hint: "Select TWO.",
    q: "A software company serves large installer downloads to users worldwide from EC2 instances behind an Application Load Balancer in one Region. Data transfer out and the instance fleet are its biggest costs, and the same few files are downloaded millions of times. Which steps will reduce these costs the MOST? (Select TWO.)",
    items: [
      { t: "Move the installers to an S3 bucket, and stop serving them from the EC2 instances.", ok: true },
      { t: "Serve the installers through a CloudFront distribution with the bucket as its origin and long cache TTLs.", ok: true },
      { t: "Put AWS Global Accelerator in front of the load balancer, so users connect at a nearby edge.", ok: false, no: "Global Accelerator speeds up the network path but caches nothing, and it adds its own charges." },
      { t: "Turn on S3 Transfer Acceleration for the bucket, and give users the accelerated endpoint.", ok: false, no: "Transfer Acceleration can add data transfer charges, and it caches nothing." },
      { t: "Replicate the bucket to four more Regions, and route users with latency-based DNS records.", ok: false, no: "Each copy adds storage and replication charges, and every download still pays full data transfer out." }
    ],
    why: "CloudFront serves cached copies from edge locations, so the origin is rarely asked for the files, and with an AWS origin only CloudFront's transfer to viewers is billed. Moving the files to S3 lets the EC2 fleet shrink.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html", "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/ConfiguringCaching.html"] },

  { id: "saa-4-124", exam: "SAA", saa: "4.4", topic: "vpc", type: "mc",
    q: "Two VPCs in the same Region and account exchange about 200 TB of data a month between their applications. They don't need to reach any other network, and no new VPCs are planned. The company wants the lowest cost for this connection. Which solution meets these requirements?",
    opts: [
      "Create a VPC peering connection between the two VPCs, and add routes to each other's CIDR ranges.",
      "Attach both VPCs to a transit gateway, and add routes in each VPC that point to the transit gateway.",
      "Expose each VPC's applications to the other through AWS PrivateLink endpoint services and NLBs.",
      "Run a software VPN on EC2 instances in each VPC, and tunnel the traffic between the two VPCs."
    ], a: 0,
    no: [null,
      "A transit gateway charges for each attachment hour and each GB it processes, about 200 TB a month here.",
      "PrivateLink charges for endpoint hours and each GB processed, and it adds load balancers to run.",
      "The instances, their bandwidth limits and their upkeep cost more than peering, which has no hourly charge."],
    why: "VPC peering has no hourly charge. Traffic over it that stays within an AZ is free, and traffic across AZs pays standard in-Region data transfer. AWS calls peering the lowest-cost option for connecting a few VPCs.",
    doc: ["https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/vpc-peering.html", "https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html"] },

  { id: "saa-4-125", exam: "SAA", saa: "4.4", topic: "directconnect", type: "mc",
    q: "A company replicates about 150 TB a month from AWS to its on-premises data center over AWS Site-to-Site VPN. Throughput varies, and data transfer charges are high. This replication will continue for years, and a setup time of a few months is acceptable. Which solution is MOST cost-effective over time?",
    opts: [
      "Order an AWS Direct Connect dedicated connection, and send the replication traffic over a private virtual interface.",
      "Add more VPN tunnels on a transit gateway with ECMP routing, and spread the replication traffic across them.",
      "Turn on acceleration for the Site-to-Site VPN connection, so that its traffic rides the AWS global network.",
      "Send the replication through an S3 bucket with Transfer Acceleration, and download it at the data center."
    ], a: 0,
    no: [null,
      "More tunnels add throughput, but the traffic still pays the same data transfer out rates as today.",
      "Acceleration routes the tunnels through Global Accelerator for steadier performance. It adds accelerator and premium data transfer charges instead of lowering them.",
      "Transfer Acceleration can add data transfer charges, and the data still crosses the internet."],
    why: "Direct Connect bills port hours and outbound data transfer at Direct Connect rates, which can reduce network costs and give more consistent throughput than internet-based links. For large, steady volumes over years, that outweighs the port cost.",
    doc: ["https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html", "https://docs.aws.amazon.com/whitepapers/latest/aws-vpc-connectivity-options/aws-direct-connect.html"] },

  { id: "saa-4-126", exam: "SAA", saa: "4.4", topic: "vpc", type: "multi", hint: "Select TWO.",
    q: "An IPv4-only VPC has private subnets in three Availability Zones and a single NAT gateway in AZ A. Instances in all three AZs send large volumes of outbound traffic, mostly to DynamoDB tables in the same Region and the rest to third-party APIs on the internet. Cross-AZ data transfer and NAT processing charges are high, and the instances must stay in all three AZs. Which steps will reduce these costs? (Select TWO.)",
    items: [
      { t: "Create a NAT gateway in each AZ, and point each private subnet's default route to the NAT gateway in its own AZ.", ok: true },
      { t: "Create a DynamoDB gateway endpoint, and associate it with the route tables of all the private subnets.", ok: true },
      { t: "Replace the NAT gateway with a NAT instance in AZ A that is sized for the current traffic volume.", ok: false, no: "Traffic from the other two AZs still crosses AZs to reach it, and the instance must now be managed and scaled." },
      { t: "Add an egress-only internet gateway, and route the private subnets' outbound traffic through it.", ok: false, no: "An egress-only internet gateway handles only IPv6 traffic, and these instances use IPv4." },
      { t: "Send the outbound traffic through a transit gateway to a shared egress VPC with one NAT gateway.", ok: false, no: "This adds transit gateway attachment and per-GB processing charges, and traffic still crosses AZs to one NAT gateway." }
    ],
    why: "Traffic to a NAT gateway in another AZ pays cross-AZ data transfer, so AWS advises a NAT gateway in each AZ with resources. A gateway endpoint for DynamoDB has no extra charge and takes that traffic off the NAT gateway entirely.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html", "https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html"] },

  { id: "saa-4-127", exam: "SAA", saa: "4.4", topic: "s3", type: "mc",
    q: "A company's EC2 instances in us-east-1 run daily jobs that read about 5 TB from an S3 bucket in eu-west-1 several times a day. The bucket and the instances are in the same AWS account. The jobs have no Region requirement, and their results are small. Inter-Region data transfer is now the largest line on the bill. Which solution is MOST cost-effective?",
    opts: [
      "Run the jobs on EC2 instances in eu-west-1, in the same Region as the bucket that holds the data.",
      "Turn on S3 Transfer Acceleration for the bucket, and have the jobs read through its accelerated endpoint.",
      "Create an S3 gateway endpoint in the us-east-1 VPC, and add it to the route tables of the instances' subnets.",
      "Turn on Requester Pays for the bucket, so that the account that reads the data pays for the downloads."
    ], a: 0,
    no: [null,
      "Transfer Acceleration adds its own per-GB fee on top of the transfer, and the data still leaves eu-west-1.",
      "A gateway endpoint carries traffic only to S3 in its own Region, so reads from a bucket in eu-west-1 don't use it.",
      "The reader and the bucket owner are the same account, so Requester Pays only moves the same charge within the bill."],
    why: "Data sent between Regions is billed per GB out of the source Region every time it is read. Running the jobs in the bucket's Region removes that transfer, and only the small results need to move.",
    doc: ["https://docs.aws.amazon.com/cur/latest/userguide/cur-data-transfers-charges.html", "https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html"] },

  // Task 4.2 and 4.3: compute and database
  { id: "saa-4-128", exam: "SAA", saa: "4.2", topic: "fargate", type: "mc",
    q: "A company runs queue workers as an Amazon ECS service on AWS Fargate. Each task processes messages from an SQS queue and can be stopped at any time, because unfinished messages return to the queue after the visibility timeout. The workload's size will change a lot over the next year, so the company won't commit to a usage level, and it doesn't want to manage EC2 instances or rewrite the workers. Which solution is MOST cost-effective?",
    opts: [
      "Add the FARGATE_SPOT capacity provider to the cluster, and run the service's tasks on it through a capacity provider strategy.",
      "Buy a 1-year Compute Savings Plan that covers the service's current hourly Fargate spend, and keep running on Fargate.",
      "Move the service to an Auto Scaling group of EC2 Spot Instances that are registered as ECS container instances.",
      "Rewrite the workers as Lambda functions with an SQS event source, and set provisioned concurrency for the peak load."
    ], a: 0,
    no: [null,
      "A Savings Plan needs a 1-year or 3-year commitment to an hourly spend, which the company won't make.",
      "The company would have to manage the EC2 instances, their AMIs and their scaling, which it doesn't want.",
      "It means rewriting the workers, and provisioned concurrency is billed for the configured capacity even when idle."],
    why: "Fargate Spot runs interruption-tolerant ECS tasks on spare capacity at a discount to the Fargate price, with a two-minute warning before a task is stopped. It needs no commitment and no instances to manage.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/fargate-capacity-providers.html", "https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html"] },

  { id: "saa-4-129", exam: "SAA", saa: "4.3", topic: "aurora", type: "mc",
    q: "An order system runs on an Aurora PostgreSQL cluster that uses the Aurora Standard storage configuration. Traffic is steady and write-heavy, and cost reports show that read and write I/O charges are about 60 percent of the cluster's monthly bill. The company wants lower, more predictable database costs without changing the application or the instance sizes. Which solution meets these requirements?",
    opts: [
      "Switch the cluster to the Aurora I/O-Optimized storage configuration, which has no charge per I/O request.",
      "Move the cluster's storage to Provisioned IOPS SSD (io2) volumes that are sized for the cluster's peak I/O rate.",
      "Buy 1-year reserved DB instances for the cluster's writer and reader instances, and keep the current storage setup.",
      "Add an Aurora Replica, and send part of the read traffic to the cluster's reader endpoint to spread the I/O load."
    ], a: 0,
    no: [null,
      "Aurora stores data in its own shared cluster volume, so EBS volume types like io2 can't be chosen for it.",
      "Reserved instances discount instance hours only, so the I/O charges that make up most of the bill stay the same.",
      "A replica adds another billed instance, its reads from cluster storage are still charged per I/O, and the app must change endpoints."],
    why: "With Aurora I/O-Optimized you pay for instances and storage with no per-request I/O charges. AWS calls it the best choice when I/O is 25 percent or more of total Aurora spending, and switching from Standard needs no downtime on non-NVMe-based instances.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html"] }
);
