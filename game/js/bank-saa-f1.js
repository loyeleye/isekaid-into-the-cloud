// Question bank batch: SAA cost tools and cost-aware design (consolidated billing, Cost Explorer, Data Exports, Budgets, Requester Pays, transfer and load methods, storage scaling, Outposts, load balancer choice, Aurora Serverless v2) plus Storage Gateway ingestion. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  { id: "saa-3-401", exam: "SAA", saa: "3.5", topic: "storagegateway", type: "multi", hint: "Select TWO.",
    q: "Lab instruments in a company's data center write each night's run, several hundred files, to an NFS share on an Amazon S3 File Gateway. A processing pipeline in AWS must start only after every file of the run is stored in the S3 bucket. Starting the pipeline on the first S3 object event has produced partial results. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "When the run finishes writing, call the NotifyWhenUploaded API for the gateway's file share.", ok: true },
      { t: "Start the pipeline from an EventBridge rule that matches the gateway's working file set upload event.", ok: true },
      { t: "Turn on S3 Event Notifications for ObjectCreated events, and start the pipeline from the first event of each run.", ok: false, no: "Each object raises its own event as the gateway uploads it in the background, so the first event arrives while most of the run is still uploading." },
      { t: "Set an automated cache refresh TTL on the file share, and start the pipeline when the cache refresh finishes.", ok: false, no: "Cache refresh updates the gateway's listing of objects already in S3. It doesn't track or wait for the gateway's own uploads." },
      { t: "Start the pipeline with an EventBridge Scheduler schedule two hours after the instruments usually finish.", ok: false, no: "The gateway uploads asynchronously, so a fixed time can still fire before a large run has reached S3, and it delays small runs." }
    ],
    why: "S3 File Gateway uploads files to S3 asynchronously. NotifyWhenUploaded asks the gateway to send an EventBridge event, carrying the same notification ID, once every file written to the share up to that call has been uploaded, so processing starts on a complete set.",
    doc: ["https://docs.aws.amazon.com/filegateway/latest/files3/monitoring-file-gateway.html", "https://docs.aws.amazon.com/storagegateway/latest/APIReference/API_NotifyWhenUploaded.html"] },

  { id: "saa-4-401", exam: "SAA", saa: "4.2", topic: "billing", type: "mc",
    q: "A company's 20 accounts share one consolidated bill through AWS Organizations, with Reserved Instance and Savings Plans discount sharing turned on. One member account belongs to a subsidiary that buys its own Reserved Instances. Its contract requires that its reservations benefit only its own account and that it never receive discounts from other accounts' purchases. The account must stay on the consolidated bill. What should a solutions architect do?",
    opts: [
      "In the management account, turn off Reserved Instance and Savings Plans discount sharing for that account.",
      "Move the subsidiary's account into its own OU, and attach an SCP that limits it to its own reservations.",
      "Have the subsidiary leave the organization, and pay for its usage under its own standalone account.",
      "Have the subsidiary buy zonal Reserved Instances, which apply only to instances in the purchasing account."
    ], a: 0,
    no: [null,
      "SCPs limit which API actions principals can call. They don't control how the billing system applies reservation discounts across accounts.",
      "A standalone account gets its own bill, which breaks the requirement to stay on the consolidated bill.",
      "Zonal reservations are still shared on a consolidated bill with matching instances in the same Availability Zone in other accounts, and the account would still receive others' discounts."],
    why: "The management account controls discount sharing for each account. With sharing turned off for an account, its reservations and Savings Plans apply only to its own usage and it receives no discounts from other accounts' commitments, while its charges stay on the consolidated bill.",
    doc: ["https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html", "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/consolidatedbilling-other.html"] },

  { id: "saa-4-402", exam: "SAA", saa: "4.2", topic: "costexplorer", type: "mc",
    q: "EC2 costs in one of a company's member accounts have jumped over the last few days, and the account runs about 400 instances. The FinOps team wants to see, in the Cost Explorer console, each instance's cost per day so that it can find the instances causing the jump. The team doesn't want to build reports, write queries or deploy anything. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Turn on resource-level data at daily granularity for EC2 in Cost Management preferences, then group Cost Explorer by Resource.",
      "Create a CUR 2.0 export with resource IDs in Data Exports, and query it with Amazon Athena to total each instance's daily cost.",
      "Group the Cost Explorer view by the Usage type dimension, which shows a separate cost line for each EC2 instance ID.",
      "Open AWS Compute Optimizer, and sort the account's EC2 instances by their actual daily cost over the last few days."
    ], a: 0,
    no: [null,
      "This gives per-instance costs, but it means setting up an export and writing SQL queries, which the team wants to avoid.",
      "Usage types describe kinds of usage, such as instance hours of one type in a Region, not individual instances.",
      "Compute Optimizer recommends instance types from utilization metrics. It doesn't report each instance's actual daily cost."],
    why: "Cost Explorer can show resource-level data at daily granularity for the past 14 days for the services you turn it on for. Grouping or filtering by Resource then shows the cost of each instance ID.",
    doc: ["https://docs.aws.amazon.com/cost-management/latest/userguide/ce-resource-daily.html"] },

  { id: "saa-4-403", exam: "SAA", saa: "4.2", topic: "billing", type: "mc",
    q: "A company runs workloads on AWS and two other cloud providers. Its FinOps team loads every provider's billing data into one data warehouse and has standardized on the FinOps Open Cost and Usage Specification (FOCUS) schema. It needs AWS cost and usage data for the whole organization delivered to S3 in that schema every day, without writing or running any transformation code. What should a solutions architect do?",
    opts: [
      "In the management account, create an AWS Data Exports standard export of a FOCUS with AWS columns table, delivered to S3.",
      "Create a CUR 2.0 export in Data Exports, and run a daily AWS Glue job that maps its columns to the FOCUS schema.",
      "Download the Cost Explorer data as a CSV file each day, and upload the file to the warehouse's S3 landing bucket.",
      "Create a legacy Cost and Usage Report in Parquet format, which uses the FOCUS column names for its line items."
    ], a: 0,
    no: [null,
      "This works, but the Glue job is transformation code that the team would have to write and maintain.",
      "This is a manual task every day, and Cost Explorer's CSV download doesn't follow the FOCUS schema.",
      "Legacy CUR uses its own AWS column names, such as lineItem/UnblendedCost, not the FOCUS schema."],
    why: "Data Exports offers FOCUS tables that hold cost and usage data in the open FOCUS schema plus a few AWS-specific columns, refreshed daily in S3. Created in the management account, the export covers the organization's accounts.",
    doc: ["https://docs.aws.amazon.com/cur/latest/userguide/what-is-data-exports.html", "https://docs.aws.amazon.com/cur/latest/userguide/table-dictionary-focus-1-2-aws.html"] },

  { id: "saa-4-404", exam: "SAA", saa: "4.2", topic: "billing", type: "multi", hint: "Select TWO.",
    q: "Six teams run their services on one shared Amazon ECS cluster of EC2 instances in a member account. Each service propagates its Team tag to its tasks, and Team is an active cost allocation tag. Finance must charge each team for its share of the cluster's instances, based on the CPU and memory its tasks use, in the company's monthly cost data. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "In the management account's Cost Management preferences, opt in to split cost allocation data for Amazon ECS.", ok: true },
      { t: "Create a CUR 2.0 export in Data Exports that includes split cost allocation data, and sum task costs by Team tag.", ok: true },
      { t: "Group Cost Explorer by the Team tag, which divides each container instance's cost among the tasks that ran on it.", ok: false, no: "Split cost allocation data isn't available in Cost Explorer, and the shared EC2 instances don't carry any one team's tag." },
      { t: "Tag each EC2 container instance with the Team tag of the team whose tasks use the most of its capacity.", ok: false, no: "Each instance's whole cost would go to one team, although several teams' tasks share it." },
      { t: "Use AWS Compute Optimizer to report each team's share of the cluster's EC2 cost from its tasks' utilization.", ok: false, no: "Compute Optimizer gives rightsizing recommendations. It doesn't allocate the cost of shared instances to teams." }
    ],
    why: "Split cost allocation data adds cost lines for each ECS task, based on the share of the instance's CPU and memory the task used and the instance's amortized cost. You opt in through Cost Management preferences and include it in a CUR 2.0 export, where the tasks' cost allocation tags group the costs by team.",
    doc: ["https://docs.aws.amazon.com/cur/latest/userguide/split-cost-allocation-data.html", "https://docs.aws.amazon.com/cur/latest/userguide/enabling-split-cost-allocation-data.html"] },

  { id: "saa-4-405", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "A company turned on Requester Pays for a bucket of research data so that partners pay for their own downloads. Each partner gets access by assuming an IAM role in the company's account that allows s3:GetObject, and partners add --request-payer requester to their commands. The company's bill still shows the partners' request and data transfer charges. What should a solutions architect do so that the partners pay?",
    opts: [
      "Grant each partner account read access in the bucket policy, and have partners download with their own credentials.",
      "Add a condition to the role's trust policy that requires the x-amz-request-payer header to be set on each S3 request.",
      "Move the partner role to a new member account in the company's organization, and have the partners assume it there.",
      "Turn on S3 Transfer Acceleration for the bucket, so that partners' downloads are billed to the partners' own accounts."
    ], a: 0,
    no: [null,
      "A trust policy controls who can assume the role, not S3 request headers. Requests made with the role are still billed to the account that owns it.",
      "Charges go to the account that owns the role, and that member account's charges are paid by the company on its consolidated bill.",
      "Transfer Acceleration speeds up long-distance transfers and adds its own charges. It doesn't change who pays for a request."],
    why: "With Requester Pays, the account whose credentials make the request pays. When a requester assumes an IAM role first, the account that owns the role is charged, so partners must use identities in their own accounts, allowed by the bucket policy.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/RequesterPaysBuckets.html"] },

  { id: "saa-4-406", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "A company in California must load 150 TB of archived sensor data from its data center into Amazon S3 for an analytics team that works only in eu-central-1. The data isn't needed in any US Region. The current plan uploads it to a bucket in us-west-1, the closest Region, and then copies it to eu-central-1 with S3 replication. The data center's 10 Gbps internet link is mostly idle, and the load can take two weeks. Which approach is MOST cost-effective?",
    opts: [
      "Upload the data over the internet link straight to a bucket in eu-central-1, with multipart uploads for the large files.",
      "Upload to the us-west-1 bucket, then copy the objects to eu-central-1 with S3 Batch Replication and delete the source copies.",
      "Turn on S3 Transfer Acceleration for a bucket in eu-central-1, and upload the files through the bucket's accelerate endpoint.",
      "Upload to the us-west-1 bucket, and have the analysts query the data there with Athena from the eu-central-1 Region."
    ], a: 0,
    no: [null,
      "Data copied between Regions is charged for transfer out of the source Region, and both copies are stored for a while.",
      "Acceleration adds a per-GB charge whenever it speeds up a long-distance upload, and the two-week window doesn't need the speed.",
      "Every query then reads data across Regions and pays inter-Region transfer charges, again and again."],
    why: "Data transferred in from the internet to AWS isn't charged, whichever Region it lands in. Uploading straight to the Region where the data is used avoids inter-Region transfer charges and paying to store a second copy.",
    doc: ["https://docs.aws.amazon.com/cur/latest/userguide/cur-data-transfers-charges.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/transfer-acceleration.html"] },

  { id: "saa-4-407", exam: "SAA", saa: "4.1", topic: "dynamodb", type: "mc",
    q: "A company must load 2 billion records of about 1 KB each from CSV files in an S3 bucket into a new DynamoDB table, once, before launch. The table must use on-demand capacity mode, and the load can take several hours. The current plan runs a fleet of EC2 workers that write the records with BatchWriteItem in batches of 25 items. Which approach is MOST cost-effective?",
    opts: [
      "Use DynamoDB import from S3 to create the table from the CSV files, with on-demand capacity mode set at creation.",
      "Keep the BatchWriteItem workers, because each batch of 25 items is billed as a single write request on the table.",
      "Use an AWS Glue job to read the CSV files and write the records to the on-demand table with its DynamoDB connector.",
      "Use an AWS DMS full-load task with the S3 bucket as the source endpoint and the on-demand table as the target."
    ], a: 0,
    no: [null,
      "DynamoDB processes each item in a batch as its own PutItem, so every item still consumes write request units.",
      "Glue writes are ordinary table writes that consume write request units, and the job adds Glue charges on top.",
      "DMS writes each record to the table, consuming write request units, and adds replication instance charges."],
    why: "Import from S3 creates a new table from CSV, DynamoDB JSON or Ion files without consuming write capacity. It's billed by the uncompressed size of the source data rather than per item written, which suits a large one-time load.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/S3DataImport.HowItWorks.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html"] },

  { id: "saa-4-408", exam: "SAA", saa: "4.1", topic: "aurora", type: "mc",
    q: "A reporting database on RDS for MySQL uses storage autoscaling. Each quarter, a load process grows the data from about 2 TiB to 8 TiB in staging tables, and the app drops those tables when the quarter closes. Allocated storage stays at 8 TiB all year, and the company pays for all of it. The company wants storage that grows on its own and bills only for the data actually stored, with MySQL compatibility. Which solution is MOST cost-effective?",
    opts: [
      "Migrate the database to an Aurora MySQL cluster, whose volume grows with the data and shrinks when tables are dropped.",
      "Keep RDS for MySQL, and lower the maximum storage threshold after each quarter so that the allocated storage shrinks.",
      "Move MySQL to EC2 with a gp3 EBS volume, and use Elastic Volumes to shrink the volume after each quarter closes.",
      "Keep RDS for MySQL, and turn off storage autoscaling after each quarter so that RDS releases the space it added."
    ], a: 0,
    no: [null,
      "The maximum storage threshold only caps how far autoscaling can grow storage. It doesn't reduce storage that's already allocated.",
      "Elastic Volumes can increase an EBS volume's size but can't decrease it.",
      "Turning off autoscaling only stops future growth. Storage that's already allocated stays allocated and billed."],
    why: "An Aurora cluster volume grows automatically as data is added, and when tables are dropped or truncated its allocated space decreases. Aurora bills only for the space the cluster volume uses.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html", "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.Autoscaling.html"] },

  { id: "saa-4-409", exam: "SAA", saa: "4.2", topic: "outposts", type: "mc",
    q: "A manufacturer runs line-control services on an AWS Outposts rack in its plant because they need single-digit millisecond latency to the factory machines. They use about 70 percent of the rack's ordered capacity. Once a month, a reporting job needs about five times the rack's compute for a few hours. The job's input may be copied to the cloud, and the job has no latency requirement. Which solution is MOST cost-effective?",
    opts: [
      "Run the monthly job on On-Demand EC2 instances in a subnet in the parent Region, in the same VPC as the Outpost subnet.",
      "Order more Outposts capacity sized for the monthly peak, and run the job on the extra servers when it is due each month.",
      "Add an EC2 Auto Scaling group in the Outpost subnet that launches extra instances on the rack when the job starts.",
      "Move the line-control services to the parent Region during the job, so that the whole rack is free to run the job."
    ], a: 0,
    no: [null,
      "Outposts capacity is paid for over the contract term, so the extra servers would sit idle but billed for most of each month.",
      "An Outpost has only the capacity that was ordered, so the rack can't add five times its compute on demand.",
      "The services need single-digit millisecond latency to the machines, which they lose while they run in the Region."],
    why: "An Outpost is a fixed pool of capacity priced by its configuration and contract term, while the Region scales on demand. A VPC extended to an Outpost also has Region subnets, so bursty work without latency needs can run in the Region and pay only for the hours it uses.",
    doc: ["https://docs.aws.amazon.com/outposts/latest/userguide/what-is-outposts.html", "https://docs.aws.amazon.com/outposts/latest/userguide/how-outposts-works.html"] },

  { id: "saa-4-410", exam: "SAA", saa: "4.2", topic: "elb", type: "multi", hint: "Select TWO.",
    q: "A web app runs on EC2 instances behind a Network Load Balancer. Because the NLB works at layer 4, the company also runs four EC2 instances with NGINX behind it that redirect HTTP to HTTPS, terminate TLS, and send /api/* and /images/* requests to two different instance groups. The company wants to lower costs and stop maintaining NGINX. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Replace the NLB and the NGINX instances with an Application Load Balancer, using an HTTPS listener with an ACM certificate.", ok: true },
      { t: "Add an HTTP listener with a redirect action to HTTPS, and HTTPS listener rules that forward each path to its own target group.", ok: true },
      { t: "Keep the NLB, add a TLS listener, and add NLB listener rules that forward /api/* and /images/* to separate target groups.", ok: false, no: "NLB listener rules can match only the source IP address type, not URL paths, and an NLB can't redirect HTTP to HTTPS." },
      { t: "Replace the NLB with a Gateway Load Balancer, and register the NGINX instances as its virtual appliance targets.", ok: false, no: "Gateway Load Balancer sends traffic through inspection appliances. The NGINX fleet would still be needed." },
      { t: "Keep the NLB and NGINX, and move the NGINX instances to Spot Instances in an Auto Scaling group to cut their cost.", ok: false, no: "NGINX would still have to be maintained, and Spot interruptions could take down the proxies that all traffic passes through." }
    ],
    why: "An Application Load Balancer works at layer 7: it terminates TLS with ACM certificates, redirects HTTP to HTTPS with a redirect action, and routes by URL path with listener rules. One ALB replaces both the NLB and the NGINX instances.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html", "https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-listeners.html"] },

  { id: "saa-4-411", exam: "SAA", saa: "4.2", topic: "budgets", type: "multi", hint: "Select TWO.",
    q: "A company's 40 product accounts grow their spend steadily as their products gain users. Finance set fixed AWS Budgets amounts for each account, but the amounts go stale within months. Finance wants each account's monthly budget recalculated automatically from its average monthly spend over the previous six months, and an email when actual spend passes 110 percent of it, without maintaining code. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create a cost budget for each account that uses the auto-adjusting method with a baseline of the last six months.", ok: true },
      { t: "Add an alert to each budget that emails finance when actual cost passes 110 percent of the budgeted amount.", ok: true },
      { t: "Create a cost budget for each account that uses the planned method, with a higher amount for each of the next 12 months.", ok: false, no: "Planned amounts are entered ahead of time, so they don't follow the accounts' actual spending." },
      { t: "Add an alert to each budget that emails finance when forecasted cost passes 110 percent of the budgeted amount.", ok: false, no: "A forecasted alert fires on predicted spend for the period, before actual spend reaches the threshold." },
      { t: "Schedule a Lambda function that reads six months of costs from Cost Explorer each month and updates every budget.", ok: false, no: "This works, but it's custom code that finance would have to maintain, which the requirement rules out." }
    ],
    why: "An auto-adjusting budget recalculates its amount at the start of each period from cost in a baseline time range you choose, such as the last six months. Alerts on actual cost then fire against the new amount.",
    doc: ["https://docs.aws.amazon.com/cost-management/latest/userguide/budget-methods.html", "https://docs.aws.amazon.com/cost-management/latest/userguide/create-cost-budget.html"] },

  { id: "saa-4-412", exam: "SAA", saa: "4.3", topic: "aurora", type: "mc",
    q: "A company has 30 development Aurora PostgreSQL clusters, each with one provisioned writer. Developers use each cluster for a few hours on unpredictable days, and most clusters sit idle for days at a time. A short wait while an idle database resumes is acceptable. The company wants to stop paying for idle compute without building any start or stop scheduling. Which solution is MOST cost-effective?",
    opts: [
      "Convert each writer to Aurora Serverless v2 with a minimum capacity of 0 ACUs, so that idle clusters pause.",
      "Convert each writer to Aurora Serverless v2, and set the minimum capacity to 0.5 ACUs so that idle clusters cost nothing.",
      "Stop each cluster every evening with an EventBridge Scheduler schedule, and start it again every weekday morning.",
      "Switch each cluster to the Aurora I/O-Optimized storage configuration so that idle clusters aren't charged for I/O."
    ], a: 0,
    no: [null,
      "With a minimum above 0 ACUs the instance never pauses, so it's billed for at least 0.5 ACU every hour, idle or not.",
      "Clusters would still run idle on the days nobody uses them, and this is the scheduling the company wants to avoid.",
      "I/O-Optimized removes per-request I/O charges, but idle provisioned instances are still billed for every hour."],
    why: "With a minimum capacity of 0 ACUs, Aurora Serverless v2 instances pause automatically after a set period with no connections and resume when a connection request arrives. No instance capacity is charged while an instance is paused.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html"] },

  { id: "saa-4-413", exam: "SAA", saa: "4.3", topic: "aurora", type: "multi", hint: "Select TWO.",
    q: "An order database runs on an Aurora PostgreSQL cluster whose writer is an Aurora Serverless v2 instance that scales between 2 and 64 ACUs through the day. After a failover, the new writer must handle the full load at once. Analysts also run reports a few hours a week that must not slow the writer, and the instance they use should scale down when idle. Which steps meet these requirements MOST cost-effectively? (Select TWO.)",
    items: [
      { t: "Add an Aurora Serverless v2 reader in promotion tier 0 or 1, so its capacity never drops below the writer's.", ok: true },
      { t: "Add an Aurora Serverless v2 reader in promotion tier 2 to 15, and point the reports at it with a custom endpoint.", ok: true },
      { t: "Add one Aurora Serverless v2 reader in promotion tier 15, and use it as both the failover target and the report instance.", ok: false, no: "A reader in tiers 2 to 15 scales on its own load, so it can be small when it's promoted and must scale up after a failover." },
      { t: "Raise the cluster's minimum capacity to 64 ACUs, so that any reader is large enough to take over the writer's load.", ok: false, no: "Every Serverless v2 instance would then be billed for at least 64 ACUs all day, including the report reader when idle." },
      { t: "Add a provisioned reader sized for the writer's 64-ACU peak in promotion tier 0, and run the reports on it too.", ok: false, no: "It is billed at peak size all day, and after a failover the reports would run on the new writer." }
    ],
    why: "Aurora Serverless v2 readers in promotion tiers 0 and 1 keep a minimum capacity equal to the writer's current capacity, so they can take over at full size. Readers in tiers 2 to 15 scale independently within the cluster's ACU range and shrink when idle.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html"] }
);
