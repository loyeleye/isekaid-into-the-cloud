// Question bank batch: SAA-C03 Domain 4 gap fill (cost tools, storage auto scaling, batching, Outposts, NAT, DNS, throttling, bandwidth). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 4.1: cost-optimized storage
  { id: "saa-4-201", exam: "SAA", saa: "4.1", topic: "rds", type: "mc",
    q: "A company is launching a new RDS for PostgreSQL DB instance for an app whose data will start at 200 GiB and grow at an unpredictable rate. On older instances the team allocated 4 TiB up front to be safe and pays for space that sits empty. The database must stay on RDS for PostgreSQL and must never run out of space. Which solution is MOST cost-effective?",
    opts: [
      "Allocate about 250 GiB, and turn on storage autoscaling with a maximum storage threshold.",
      "Allocate 4 TiB, then turn on storage autoscaling so RDS shrinks the volume to fit the data.",
      "Allocate about 250 GiB, and add a CloudWatch alarm on FreeStorageSpace that emails the team.",
      "Allocate about 250 GiB on magnetic storage, and increase the allocation by hand when needed."
    ], a: 0,
    no: [null,
      "Storage autoscaling only grows storage. Allocated RDS storage can't be reduced, so the 4 TiB stays on the bill.",
      "An email still needs someone to resize the storage in time, so the database can run out of space at night.",
      "Magnetic storage is a previous-generation type, and manual increases still risk running out of space."],
    why: "With storage autoscaling, RDS adds storage when free space runs low, up to the maximum storage threshold you set, with no downtime. You start small and pay for more only as the data grows.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.Autoscaling.html"] },

  { id: "saa-4-202", exam: "SAA", saa: "4.1", topic: "efs", type: "multi", hint: "Select TWO.",
    q: "A team's shared Linux file share runs on an EC2 NFS server with a 20 TiB EBS volume that was sized for growth, but it holds only 6 TiB today. Growth is unpredictable, and most files are rarely opened once they are a month old. The company wants to pay only for the data it stores and stop planning capacity. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Move the files to an Amazon EFS file system, which grows and shrinks as files are added and removed.", ok: true },
      { t: "Turn on EFS lifecycle management to move files not accessed for 30 days to the EFS Infrequent Access class.", ok: true },
      { t: "Use EBS Elastic Volumes to shrink the 20 TiB volume to 7 TiB, and grow it again when it starts to fill.", ok: false, no: "Elastic Volumes can increase a volume's size but never decrease it." },
      { t: "Move the files to an FSx for Lustre file system on SSD storage, sized at the smallest capacity that holds 6 TiB.", ok: false, no: "SSD storage on FSx for Lustre is provisioned up front and can be increased but never decreased, so capacity still needs planning." },
      { t: "Switch the EFS file system to Provisioned throughput, so that storage is billed only for the throughput it uses.", ok: false, no: "Provisioned throughput adds a charge for throughput. It doesn't change how stored data is billed." }
    ],
    why: "EFS is fully elastic: it grows and shrinks automatically, and you pay for the data stored, with no capacity to provision. Lifecycle management moves files that haven't been read for a set period, 30 days by default, to the cheaper Infrequent Access class.",
    doc: ["https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html", "https://docs.aws.amazon.com/efs/latest/ug/lifecycle-management-efs.html"] },

  { id: "saa-4-203", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "A system writes about 50 million log files a month to S3 Standard, each around 8 KB. The logs must be kept for 10 years for audits, are almost never read, and a retrieval time of 48 hours is acceptable. A cost review shows that per-object charges would outweigh the storage savings of any archive plan. Which solution is MOST cost-effective?",
    opts: [
      "Combine each day's logs into a few large compressed archive files, and store those archives in S3 Glacier Deep Archive.",
      "Add a lifecycle rule that transitions each log object to S3 Glacier Deep Archive 30 days after it is written.",
      "Store each new log object in S3 Intelligent-Tiering, so that S3 moves it to cheaper tiers automatically over time.",
      "Store each new log object in S3 Standard-IA, and expire each object with a lifecycle rule after 10 years."
    ], a: 0,
    no: [null,
      "Every object transitioned is a billed request, and each archived object also carries about 40 KB of extra metadata storage, more than the 8 KB log itself.",
      "Objects smaller than 128 KB aren't monitored or eligible for auto-tiering, so they always stay in Intelligent-Tiering's Frequent Access tier.",
      "Standard-IA bills every object as at least 128 KB, so 8 KB files cost far more than their size."],
    why: "Archive classes charge per transition request, and Glacier Flexible Retrieval and Deep Archive add 40 KB of storage per object for index and metadata. For small objects, AWS suggests considering aggregating them into fewer large ones before archiving them.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html"] },

  { id: "saa-4-204", exam: "SAA", saa: "4.1", topic: "firehose", type: "mc",
    q: "Thousands of IoT devices send readings to a Lambda function that writes each reading of about 1 KB to S3 as its own object, billions of PUT requests a month. S3 request charges are now higher than storage charges, and Athena queries over millions of tiny files run slowly. Readings may land in S3 a few minutes late. Which change lowers costs the MOST?",
    opts: [
      "Send the readings to Amazon Data Firehose, and let it buffer them into larger objects before delivering them to S3.",
      "Keep one object per reading, but enable S3 Transfer Acceleration on the bucket to speed up each of the PUT requests.",
      "Keep one object per reading, but write each one to S3 Express One Zone, then copy objects to S3 Standard each night.",
      "Send each reading to an SQS queue, and have a second function poll the queue and write each message to S3 separately."
    ], a: 0,
    no: [null,
      "Transfer Acceleration adds a per-GB charge and does nothing about the number of PUT requests.",
      "There are still billions of tiny objects and requests, plus a nightly copy that adds more requests.",
      "The queue adds its own request charges, and every reading still becomes its own S3 object."],
    why: "Firehose buffers incoming records up to a size or time limit and delivers them as one object, so many readings become one PUT request. Fewer, larger files also make Athena scans faster and cheaper.",
    doc: ["https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html"] },

  { id: "saa-4-205", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "A company enabled Requester Pays on a bucket that it shares with partner accounts through its bucket policy, so that partners pay for their own downloads. Since then, every download the partners make with the AWS CLI fails with 403 Access Denied, although the bucket policy hasn't changed. The company must not pay for the partners' downloads. What should the partners do?",
    opts: [
      "Add the --request-payer requester option to their CLI commands to accept the request charges.",
      "Download the objects through anonymous HTTPS requests to the bucket's public object URLs instead.",
      "Assume an IAM role in the company's account that has read access, and download the objects with it.",
      "Ask the company to grant each partner account READ access to the objects through object ACLs too."
    ], a: 0,
    no: [null,
      "Requester Pays buckets don't accept anonymous requests, so there is nobody to bill.",
      "When a requester uses a role owned by the bucket owner's account, that account is charged, so the company would pay.",
      "The bucket policy already grants access. The requests fail because they don't accept the charges."],
    why: "Requests to a Requester Pays bucket must show that the requester accepts the charges, through the x-amz-request-payer header or the CLI's --request-payer option. Without it, S3 returns 403 Forbidden.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/ObjectsinRequesterPaysBuckets.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/RequesterPaysBuckets.html"] },

  { id: "saa-4-206", exam: "SAA", saa: "4.1", topic: "ebs", type: "mc",
    q: "A vendor app on one EC2 instance keeps 12 TiB of scanned contracts on a gp3 data volume, and the vendor requires the data to stay on an attached block volume. The app reads large files from start to finish only a few times a month, and slower reads are acceptable. The boot volume is a 50 GiB gp3 volume. Which change lowers storage cost the MOST?",
    opts: [
      "Change the data volume to Cold HDD (sc1) with Elastic Volumes, and keep the boot volume on gp3.",
      "Change the data volume to Throughput Optimized HDD (st1), and leave the boot volume on gp3.",
      "Change both the data volume and the boot volume to Cold HDD (sc1) with Elastic Volumes.",
      "Move the data to S3 Glacier Instant Retrieval, and have the app read the files from there."
    ], a: 0,
    no: [null,
      "st1 works, but it is built for frequently accessed data and costs more than sc1.",
      "HDD volume types can't be used as boot volumes.",
      "The vendor requires the data on an attached block volume, which S3 is not."],
    why: "Cold HDD (sc1) is the lowest-cost EBS type, made for large sequential reads of infrequently accessed data. Neither HDD type can be a boot volume, so the boot volume stays on SSD.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/hdd-vols.html", "https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volume-types.html"] },

  { id: "saa-4-207", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "A company must copy 3 TB of finished video files once from its office to an S3 bucket in a nearby Region. The office's 1 Gbps internet link is mostly idle, the copy can take a few days, and no further transfers are planned. The files only need to be protected with TLS in transit. Which approach is MOST cost-effective?",
    opts: [
      "Upload the files with the AWS CLI's s3 commands over the existing internet link, letting the CLI use multipart uploads for large files.",
      "Turn on S3 Transfer Acceleration for the bucket, and upload the files through the bucket's accelerate endpoint with the CLI.",
      "Order a 1 Gbps dedicated Direct Connect connection, and copy the files to the bucket over a public virtual interface.",
      "Create a Site-to-Site VPN connection to a VPC, and copy the files through it to the bucket by using an S3 gateway endpoint."
    ], a: 0,
    no: [null,
      "Acceleration can add a data transfer charge, and the copy has no deadline that needs it.",
      "A dedicated connection takes weeks to set up and adds port-hour charges for a one-time copy.",
      "The VPN adds hourly charges and gains nothing here, and a gateway endpoint can't be reached from on premises through a VPN."],
    why: "AWS doesn't charge for data transferred from the internet into AWS, so a plain upload costs only the S3 requests and storage. The CLI splits large files into multipart uploads automatically.",
    doc: ["https://docs.aws.amazon.com/cur/latest/userguide/cur-data-transfers-charges.html", "https://docs.aws.amazon.com/cli/latest/userguide/cli-services-s3-commands.html"] },

  { id: "saa-4-208", exam: "SAA", saa: "4.1", topic: "billing", type: "mc",
    q: "A company runs six standalone AWS accounts that are not in any organization. Each account stores about 300 TB in S3 Standard, and the data is read constantly, so it must stay in S3 Standard. Finance wants one invoice and lower per-GB storage rates, without moving any data between accounts. What should a solutions architect do?",
    opts: [
      "Create an organization in AWS Organizations, and invite the six accounts to join it as members.",
      "Copy all the data into buckets in one account, so its S3 usage reaches the lower-priced tiers.",
      "Buy a three-year Savings Plan in each account to cover the account's S3 Standard storage.",
      "Turn on Requester Pays for each account's buckets, so readers pay part of the storage costs."
    ], a: 0,
    no: [null,
      "This also combines usage, but it means moving 1.8 PB of data, which the company wants to avoid.",
      "Savings Plans cover compute usage, not S3 storage.",
      "Requester Pays shifts request and download charges to the requester. The bucket owner still pays for storage."],
    why: "Consolidated billing gives one bill and treats all accounts in the organization as one account for tiered pricing. Their combined S3 usage reaches the lower-priced tiers sooner.",
    doc: ["https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/consolidated-billing.html", "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/con-bill-blended-rates.html"] },

  // Task 4.2: cost-optimized compute
  { id: "saa-4-209", exam: "SAA", saa: "4.2", topic: "outposts", type: "mc",
    q: "A manufacturer runs control software that must exchange data with machines on its factory floor within a few milliseconds and must keep running in the plant. The company wants to run it on EC2 and RDS with the same APIs, console and tools it uses in its AWS Region, and it does not want to buy or maintain the server hardware itself. Which solution meets these requirements?",
    opts: [
      "Install an AWS Outposts rack in the plant, and run EC2 and RDS in an Outpost subnet.",
      "Run the software on EC2 and RDS in the AWS Local Zone that is closest to the plant's metropolitan area.",
      "Buy servers for the plant, and run the software there as containers with Amazon ECS Anywhere.",
      "Run the software on VMware Cloud on AWS, and connect the plant to it over AWS Direct Connect."
    ], a: 0,
    no: [null,
      "A Local Zone is an AWS site near a city, not inside the plant, so the software doesn't run on site.",
      "The company would buy and maintain the hardware, and ECS Anywhere doesn't run EC2 instances or RDS.",
      "VMware Cloud on AWS runs in AWS data centers, so the software would not run in the plant."],
    why: "An Outpost is AWS-owned and AWS-managed capacity installed at the customer's site. It runs EC2, EBS, ECS and RDS locally for low latency and local processing, managed with the same APIs and tools as the Region.",
    doc: ["https://docs.aws.amazon.com/outposts/latest/userguide/what-is-outposts.html"] },

  { id: "saa-4-210", exam: "SAA", saa: "4.2", topic: "outposts", type: "mc",
    q: "A hospital must keep patient images inside its own building by regulation. It wants to process the images on EC2 and store them as S3 objects, using the same S3 APIs as its cloud apps, and it wants AWS to deliver, install and maintain the hardware. Which solution meets these requirements?",
    opts: [
      "Install an AWS Outposts rack in the hospital, and store the images in S3 on Outposts.",
      "Store the images in S3 in a Local Zone near the hospital, and process them on EC2 in that zone.",
      "Install an S3 File Gateway on premises, and write the images to its file shares for processing.",
      "Run MinIO on servers the hospital owns, and point the apps at it with the S3-compatible API."
    ], a: 0,
    no: [null,
      "A Local Zone is an AWS facility outside the hospital, so the images would leave the building.",
      "File Gateway stores the objects in S3 in an AWS Region and keeps only a local cache.",
      "The hospital would own and maintain the hardware, and the software isn't an AWS service."],
    why: "S3 on Outposts keeps object data on the Outpost at the customer's site to meet data residency needs, and AWS installs and maintains the rack. EC2 instances in the Outpost subnet can process the data locally.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/s3-outposts/S3onOutposts.html", "https://docs.aws.amazon.com/outposts/latest/userguide/what-is-outposts.html"] },

  { id: "saa-4-211", exam: "SAA", saa: "4.2", topic: "ec2", type: "mc",
    q: "A Java cache service runs on c6i.4xlarge instances (16 vCPUs, 32 GiB). Monitoring shows memory steady at about 26 GiB, while CPU use never goes above 3 vCPUs' worth. The service needs at least 32 GiB of memory and will keep running around the clock. Which instance type is the MOST cost-effective replacement?",
    opts: [
      "r6i.xlarge, a memory-optimized size with 4 vCPUs and 32 GiB of memory.",
      "c6i.2xlarge, a compute-optimized size with 8 vCPUs and 16 GiB of memory.",
      "m6i.2xlarge, a general purpose size with 8 vCPUs and 32 GiB of memory.",
      "r6i.2xlarge, a memory-optimized size with 8 vCPUs and 64 GiB of memory."
    ], a: 0,
    no: [null,
      "16 GiB is less than the 26 GiB the service uses.",
      "It works, but it pays for twice the vCPUs the service needs to get the same memory.",
      "It doubles both vCPUs and memory beyond what the service needs."],
    why: "The workload is memory-bound, so the right family is the one with the most memory per vCPU. An r6i.xlarge gives the needed 32 GiB with 4 vCPUs, the smallest size that fits.",
    doc: ["https://docs.aws.amazon.com/ec2/latest/instancetypes/mo.html", "https://docs.aws.amazon.com/ec2/latest/instancetypes/co.html"] },

  { id: "saa-4-212", exam: "SAA", saa: "4.2", topic: "ecs", type: "multi", hint: "Select TWO.",
    q: "An Amazon ECS cluster runs many services on an Auto Scaling group of 20 EC2 instances that stays at a fixed size. The services use a task placement strategy that spreads tasks across instances, and on average only 35 percent of the cluster's reserved CPU and memory is in use. The company wants to cut costs and keep running on EC2. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Change the services' placement strategy to binpack on memory, so tasks fill instances before new ones are used.", ok: true },
      { t: "Attach the Auto Scaling group as a capacity provider with managed scaling, so ECS adds and removes instances.", ok: true },
      { t: "Change the placement strategy to spread on instance ID, so tasks are spread evenly over every instance.", ok: false, no: "Spreading over every instance keeps all of them partly used, which is the waste the company wants to remove." },
      { t: "Raise each task definition's CPU and memory reservations, so that the cluster's reported usage goes up.", ok: false, no: "Bigger reservations waste more capacity per task and need more instances, not fewer." },
      { t: "Change the placement strategy to random, so ECS can choose any instance that has room for each new task.", ok: false, no: "Random placement doesn't try to minimize the number of instances in use." }
    ],
    why: "The binpack strategy places tasks to leave the least unused CPU or memory, which minimizes the number of instances in use. Capacity provider managed scaling then scales the Auto Scaling group in and out to match what the tasks need.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-placement-strategies.html", "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/cluster-auto-scaling.html"] },

  { id: "saa-4-213", exam: "SAA", saa: "4.2", topic: "computeoptimizer", type: "mc",
    q: "A company runs about 150 Amazon ECS services on AWS Fargate. Developers set each task's CPU and memory when the services were built and never revisited them, and the company suspects many tasks are larger than needed. It wants per-service recommendations for task CPU and memory size based on actual use, with estimated savings, and no tooling to build. What should a solutions architect do?",
    opts: [
      "Opt in to AWS Compute Optimizer, and review its recommendations for Amazon ECS services on Fargate.",
      "Use Cost Explorer Savings Plans recommendations to find the tasks that are oversized and resize them.",
      "Turn on Container Insights, and write a Lambda function that compares the reserved and used resources.",
      "Move the services to Fargate Spot, which runs each task on capacity sized to what the task actually uses."
    ], a: 0,
    no: [null,
      "Savings Plans recommendations size a commitment to current spend. They don't rightsize task sizes.",
      "Container Insights shows the metrics, but the company would build and maintain the comparison itself.",
      "Fargate Spot lowers the price of interruptible tasks. It doesn't change their CPU and memory size."],
    why: "Compute Optimizer analyzes utilization of ECS services on Fargate and recommends task and container CPU and memory sizes, with the estimated monthly savings of each change.",
    doc: ["https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-ecs-recommendations.html", "https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html"] },

  { id: "saa-4-214", exam: "SAA", saa: "4.2", topic: "lambda", type: "mc",
    q: "A company runs dozens of high-volume Lambda functions written in Python with pure-Python dependencies, deployed as .zip packages on the x86_64 architecture. Finance wants lower compute costs, but the company won't sign any usage commitment, and the function logic must not change. Which solution meets these requirements?",
    opts: [
      "Switch the functions to the arm64 architecture (AWS Graviton2) after testing them on it.",
      "Purchase a Compute Savings Plan that covers the functions' current hourly spend for a one-year term.",
      "Repackage each function as a container image in Amazon ECR instead of as a .zip file package.",
      "Set reserved concurrency on each function to cap how many copies of it can run at the same time."
    ], a: 0,
    no: [null,
      "A Savings Plan is a usage commitment, which the company won't make.",
      "Lambda bills requests and compute time the same way for either package type, and ECR adds storage charges.",
      "Reserved concurrency caps scaling and throttles requests. It doesn't lower the price of each invocation."],
    why: "Lambda functions on arm64 (Graviton2) can get significantly better price performance than on x86_64. Pure-Python code generally runs on either architecture without changes, but it should be tested first.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/foundation-arch.html"] },

  { id: "saa-4-215", exam: "SAA", saa: "4.2", topic: "elb", type: "mc",
    q: "A company runs 15 small internal HTTPS web apps, each on its own EC2 instances behind its own Application Load Balancer. Each app has its own host name under example.com and gets little traffic, so the load balancers' hourly charges are now a large share of the bill. Which change reduces costs the MOST while keeping HTTPS and the host names?",
    opts: [
      "Use one ALB with a host-header listener rule for each app, and add every app's certificate to its HTTPS listener.",
      "Replace each ALB with a Network Load Balancer, and pass the TLS traffic through to each app's own instances.",
      "Use one Network Load Balancer with a TLS listener, and route each host name to its app's instances by SNI.",
      "Use one Gateway Load Balancer for all the apps, and route each HTTPS request to the app's instances by host."
    ], a: 0,
    no: [null,
      "There would still be 15 load balancers, each billed for every hour it runs.",
      "A Network Load Balancer works at layer 4 and can't route requests by host name.",
      "A Gateway Load Balancer sends traffic to inspection appliances. It doesn't route web requests by host."],
    why: "An ALB supports up to 100 rules by default and can route on the host header, and its HTTPS listener can hold several certificates chosen by SNI. One ALB can serve all the apps, removing 14 load balancers' charges.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-condition-types.html", "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-limits.html"] },

  { id: "saa-4-216", exam: "SAA", saa: "4.2", topic: "budgets", type: "multi", hint: "Select TWO.",
    q: "A sandbox member account in a company's organization must stay under $5,000 a month. When actual spend reaches that amount, the account's tagged development EC2 instances must be stopped and no one may launch new EC2 instances in it, without any custom code. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "In the sandbox account, create a cost budget with an action that stops the development EC2 instances at the threshold.", ok: true },
      { t: "In the management account, create a budget for the sandbox account with an action that applies a deny SCP to it.", ok: true },
      { t: "In the management account, create a budget with an action that stops the EC2 instances in the sandbox account.", ok: false, no: "A management account can apply an SCP to another account, but it can't target EC2 or RDS instances in another account." },
      { t: "Create a CloudWatch billing alarm on EstimatedCharges for the account, and send it to an SNS email topic.", ok: false, no: "An email only notifies people. Nothing stops the instances or blocks launches." },
      { t: "Turn on AWS Cost Anomaly Detection for the account, with an alert subscription for the team that owns it.", ok: false, no: "Anomaly Detection alerts on unusual spend. It takes no action on resources." }
    ],
    why: "Budget actions run automatically or after approval when a threshold is reached. They can apply an IAM policy or an SCP, or stop specific EC2 or RDS instances in the budget's own account.",
    doc: ["https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-controls.html"] },

  { id: "saa-4-217", exam: "SAA", saa: "4.2", topic: "budgets", type: "multi", hint: "Select TWO.",
    q: "Five teams share the member accounts of a company's organization, and every resource carries a Team tag that no one has used for billing yet. Each team must get an email when its own forecasted monthly spend passes 80 percent of its limit. Which steps meet this requirement with the LEAST effort? (Select TWO.)",
    items: [
      { t: "In the management account, activate Team as a user-defined cost allocation tag.", ok: true },
      { t: "Create one AWS Budgets cost budget per team, filtered on its Team tag value, with a forecasted alert at 80 percent.", ok: true },
      { t: "Create one CloudWatch billing alarm per team on EstimatedCharges, filtered by a Team tag dimension.", ok: false, no: "Billing metrics only have dimensions such as service and linked account, not tags." },
      { t: "Create one AWS Budgets cost budget per member account, with an actual-spend alert at 80 percent.", ok: false, no: "Teams share the accounts, so per-account budgets don't track each team's spend, and the alert isn't forecast-based." },
      { t: "Save a Cost Explorer report grouped by the Team tag, and have each team check it once a week.", ok: false, no: "A saved report doesn't send alerts, and a weekly check can miss the threshold." }
    ],
    why: "Tags must be activated as cost allocation tags in the management account before billing tools can use them. A budget can then filter on a tag value and alert on forecasted spend.",
    doc: ["https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-create-filters.html", "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/activating-tags.html"] },

  { id: "saa-4-218", exam: "SAA", saa: "4.2", topic: "savingsplans", type: "mc",
    q: "A company's 12 accounts are in one organization. Each team bought a Compute Savings Plan in its own account, but workloads often move between accounts, so some plans go partly unused while other accounts pay On-Demand rates. The management account has turned discount sharing off for all accounts. Which change will lower costs with the LEAST effort?",
    opts: [
      "Turn on Reserved Instance and Savings Plans discount sharing for the accounts in the management account's billing preferences.",
      "Buy additional Compute Savings Plans in each account that is paying On-Demand rates, sized to that account's usage.",
      "Move every workload into the accounts that own Savings Plans so that each plan's commitment is fully used again.",
      "Create a Savings Plans utilization budget for each account that alerts its team when utilization falls under 90 percent."
    ], a: 0,
    no: [null,
      "This adds commitments while existing ones stay unused.",
      "It could work, but moving workloads between accounts is a large migration.",
      "An alert reports the waste but doesn't apply the unused commitment anywhere."],
    why: "With sharing turned on, a Savings Plan applies first to its owner account's usage and then to eligible usage in other accounts in the organization. The management account controls sharing.",
    doc: ["https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ri-turn-off.html", "https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-applying.html"] },

  { id: "saa-4-219", exam: "SAA", saa: "4.2", topic: "costexplorer", type: "multi", hint: "Select TWO.",
    q: "A company runs hundreds of On-Demand EC2 instances across its accounts and plans to buy a Compute Savings Plan. Engineers believe many instances are oversized, and finance doesn't want to commit to spend that will disappear once they are resized. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "First use AWS Compute Optimizer recommendations to rightsize the oversized instances.", ok: true },
      { t: "Once usage settles, buy the commitment that Cost Explorer's Savings Plans recommendations suggest.", ok: true },
      { t: "Buy a Savings Plan that covers today's On-Demand spend now, and rightsize the instances afterward.", ok: false, no: "The commitment would be sized to the waste that rightsizing removes, and it can't be lowered later." },
      { t: "Size the Savings Plan commitment with AWS Pricing Calculator, using the instance types that run today.", ok: false, no: "Pricing Calculator estimates from what you enter. It doesn't analyze actual usage or rightsize anything." },
      { t: "Create a Savings Plans coverage budget, and buy enough commitment for the budget to report full coverage.", ok: false, no: "A coverage budget reports how much usage is covered. It doesn't recommend a commitment or rightsize instances." }
    ],
    why: "Compute Optimizer recommends smaller instance types based on utilization. Cost Explorer then recommends a Savings Plans commitment from recent usage, so rightsizing first keeps the commitment from paying for waste.",
    doc: ["https://docs.aws.amazon.com/compute-optimizer/latest/ug/what-is-compute-optimizer.html", "https://docs.aws.amazon.com/savingsplans/latest/userguide/sp-recommendations.html"] },

  // Task 4.3: cost-optimized databases
  { id: "saa-4-220", exam: "SAA", saa: "4.3", topic: "dynamodb", type: "mc",
    q: "A DynamoDB table in on-demand mode serves an app with unpredictable traffic, so it must stay in on-demand mode. Last month a faulty batch job wrote to the table at a huge rate for hours and caused a large bill. The company wants a hard ceiling on the table's throughput, and so on its request costs, that is well above normal peaks. What should a solutions architect do?",
    opts: [
      "Set a maximum on-demand throughput for the table's write and read request units.",
      "Purchase DynamoDB reserved capacity sized to the table's normal peak traffic.",
      "Create an AWS Budgets cost budget for DynamoDB that emails the team at 80 percent.",
      "Put a DAX cluster in front of the table to absorb the batch job's high request rate."
    ], a: 0,
    no: [null,
      "Reserved capacity applies only to provisioned capacity tables, not to on-demand mode.",
      "An email arrives after the spend has happened and doesn't limit the table.",
      "DAX caches reads. Writes pass through to the table, so the write costs stay."],
    why: "On-demand tables can have an optional maximum read and write throughput. Requests above it are throttled, which keeps usage and costs bounded while the table keeps on-demand scaling below the limit.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode-max-throughput.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/reserved-capacity.html"] },

  { id: "saa-4-221", exam: "SAA", saa: "4.3", topic: "rds", type: "mc",
    q: "Thousands of short Lambda invocations each open and close a connection to an RDS for MySQL DB instance. The company moved the database to a much larger instance class only because the old one ran out of memory under the connection churn, and CPU use is now under 15 percent. It wants to return to a smaller class without changing the function code beyond its database endpoint. What should a solutions architect do?",
    opts: [
      "Put an RDS Proxy in front of the database, point the functions at the proxy endpoint, and then scale the instance down.",
      "Add a read replica, send half of the functions to the replica's endpoint, and then scale the primary instance down.",
      "Scale the instance down, and raise the max_connections parameter in its DB parameter group to accept more clients.",
      "Put an ElastiCache cluster in front of the database, and scale the instance down after the cache has warmed up."
    ], a: 0,
    no: [null,
      "The functions that write still open a connection per invocation, and a replica is a second instance to pay for.",
      "Allowing more connections on a smaller class makes the out-of-memory problem worse.",
      "Caching needs code changes and doesn't reduce the connections that writes open."],
    why: "RDS Proxy keeps a pool of long-lived connections and shares them among clients, avoiding the memory and CPU overhead of opening a connection per request. That lets a smaller instance class handle the same app.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html", "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-planning.html"] },

  { id: "saa-4-222", exam: "SAA", saa: "4.3", topic: "backup", type: "multi", hint: "Select TWO.",
    q: "A company must be able to restore its RDS for MySQL database to any point in the last 14 days, and must keep one restorable backup per month for 7 years. Today a script takes a manual snapshot every day and never deletes any, and snapshot storage costs keep growing. Which steps meet the requirements at the lowest cost? (Select TWO.)",
    items: [
      { t: "Set the DB instance's automated backup retention period to 14 days for point-in-time recovery.", ok: true },
      { t: "Create an AWS Backup plan with a monthly rule that keeps each backup for 7 years, and stop the daily script.", ok: true },
      { t: "Set the DB instance's automated backup retention period to 7 years so it covers both requirements.", ok: false, no: "Automated backups can be kept for at most 35 days." },
      { t: "Export a snapshot to S3 each month, and transition the exported files to S3 Glacier Deep Archive.", ok: false, no: "Exported snapshot data is Parquet for analysis. It can't be restored to a new DB instance." },
      { t: "Keep the daily snapshots, and copy each one to a second Region so that it is stored at a lower rate.", ok: false, no: "Copies add storage and transfer charges, and nothing deletes the old snapshots." }
    ],
    why: "Automated backups give point-in-time recovery within their retention period of up to 35 days. An AWS Backup plan creates the monthly backups and deletes each one when its retention ends, so old snapshots no longer pile up.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.BackupRetention.html", "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ExportSnapshot.html"] },

  { id: "saa-4-223", exam: "SAA", saa: "4.3", topic: "ebs", type: "multi", hint: "Select TWO.",
    q: "A self-managed database on EC2 stores its data on EBS volumes. Its recovery point objective is 24 hours, and restores are never needed from more than two weeks back. A cron script snapshots the volumes every hour and never deletes any snapshot, and snapshot charges keep rising. Which steps reduce snapshot costs while meeting these requirements? (Select TWO.)",
    items: [
      { t: "Replace the script with an Amazon Data Lifecycle Manager policy that takes snapshots once every 24 hours.", ok: true },
      { t: "Give the policy count-based retention of 14 snapshots, and delete the older snapshots the script made.", ok: true },
      { t: "Move every daily snapshot to the EBS Snapshots Archive tier as soon as the policy has created it.", ok: false, no: "Archived snapshots become full copies with a 90-day minimum and take hours to restore. The tier is for long-term retention." },
      { t: "Keep only the newest snapshot, because each EBS snapshot is a full copy of all of the volume's data.", ok: false, no: "Snapshots are incremental, and keeping only one breaks the two-week restore window." },
      { t: "Turn on fast snapshot restore for every new snapshot, so that each one can be restored more quickly.", ok: false, no: "Fast snapshot restore adds a charge for every hour it is enabled. It raises costs." }
    ],
    why: "Snapshot frequency should match the RPO, and retention should match how far back restores are needed. Data Lifecycle Manager creates snapshots on a schedule and deletes the oldest when the retention count is reached.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-ami-policy.html", "https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-archive.html"] },

  { id: "saa-4-224", exam: "SAA", saa: "4.3", topic: "dms", type: "multi", hint: "Select TWO.",
    q: "A company wants to stop paying for commercial database licenses by moving its on-premises Oracle database to Aurora PostgreSQL. The schema includes stored procedures, and the cutover may cause only a few minutes of downtime. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Use DMS Schema Conversion to convert the schema and code, and fix by hand what its assessment flags.", ok: true },
      { t: "Run an AWS DMS task that does a full load and then replicates ongoing changes until the cutover.", ok: true },
      { t: "Use AWS Application Migration Service to rehost the Oracle server on EC2 with its data intact.", ok: false, no: "This moves the server as it is, so the database stays Oracle and so do its license costs." },
      { t: "Export the database with Oracle Data Pump, and import the dump file into Aurora PostgreSQL.", ok: false, no: "A Data Pump dump can be imported only into Oracle, not into PostgreSQL." },
      { t: "Copy the Oracle data files to S3 with DataSync, and attach them to the new Aurora cluster.", ok: false, no: "Aurora PostgreSQL can't use Oracle data files. The data must be migrated, not copied as files." }
    ],
    why: "DMS Schema Conversion converts schemas and code objects to the target engine but doesn't move data. A DMS task then copies the data and replicates changes, so the source stays in use until a short cutover.",
    doc: ["https://docs.aws.amazon.com/dms/latest/userguide/CHAP_SchemaConversion.html", "https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html"] },

  { id: "saa-4-225", exam: "SAA", saa: "4.3", topic: "trustedadvisor", type: "mc",
    q: "A company with Enterprise Support wants a weekly list, without writing any code, of three kinds of waste: RDS DB instances that have had no connection for 7 days, EBS volumes with very low activity, and Elastic IP addresses that aren't associated with a running instance. Which solution meets these requirements?",
    opts: [
      "Use the Trusted Advisor cost optimization checks, which cover all three, with its weekly email.",
      "Review the rightsizing recommendations in Cost Explorer, which list idle resources of every type in the account.",
      "Turn on AWS Config with managed rules for these three cases, and send the rule results to the team each week.",
      "Search CloudTrail for the last API call on each resource, and list those that had no calls in the past week."
    ], a: 0,
    no: [null,
      "Cost Explorer rightsizing recommendations cover EC2 instances, not RDS connections or Elastic IP addresses.",
      "Config rules evaluate configuration. They can't tell whether a DB instance has had connections.",
      "CloudTrail records management API calls, not database connections or volume I/O, and this needs custom work."],
    why: "Trusted Advisor's cost optimization category includes checks for idle RDS DB instances, underutilized EBS volumes and unassociated Elastic IP addresses. With Enterprise Support, all checks are available and refresh automatically.",
    doc: ["https://docs.aws.amazon.com/awssupport/latest/user/cost-optimization-checks.html", "https://docs.aws.amazon.com/awssupport/latest/user/trusted-advisor.html"] },

  { id: "saa-4-226", exam: "SAA", saa: "4.3", topic: "budgets", type: "mc",
    q: "A company bought RDS reserved DB instances for its production databases. Teams sometimes change a database's instance class or engine, and the matching reservation then goes unused without anyone noticing. Finance wants an alert when less than 90 percent of the reserved hours it pays for are actually used. What should a solutions architect set up?",
    opts: [
      "An AWS Budgets RI utilization budget for Amazon RDS, with an alert threshold at 90 percent.",
      "An AWS Budgets RI coverage budget for Amazon RDS, with an alert threshold at 90 percent.",
      "An AWS Budgets cost budget for Amazon RDS, with an alert at 90 percent of last month's spend.",
      "A CloudWatch alarm on each DB instance's CPUUtilization metric for when it drops below 10 percent."
    ], a: 0,
    no: [null,
      "Coverage measures how much of the running usage reservations cover, not how much of the reservations are used.",
      "A spend budget doesn't show whether the reservations already paid for are being used.",
      "CPU use says nothing about whether a running instance matches a reservation."],
    why: "An RI utilization budget alerts when the share of purchased reservation hours that are used falls below a threshold. A coverage budget answers the opposite question: how much of the usage is covered.",
    doc: ["https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html"] },

  // Task 4.4: cost-optimized networks
  { id: "saa-4-227", exam: "SAA", saa: "4.4", topic: "vpc", type: "multi", hint: "Select TWO.",
    q: "A development VPC in one Availability Zone has a few instances in a private subnet that download a few GB of updates a month from the internet. Outbound access may stop if an instance fails, and the team is willing to manage a server. The instances must stay in the private subnet. Which steps give outbound IPv4 access at the lowest cost? (Select TWO.)",
    items: [
      { t: "Launch a small NAT instance from a NAT AMI you build on Amazon Linux 2023 in a public subnet, and disable its source/destination check.", ok: true },
      { t: "In the private subnet's route table, point the 0.0.0.0/0 route at the NAT instance's network interface.", ok: true },
      { t: "Launch the NAT instance in the private subnet next to the other instances, and disable its source/destination check.", ok: false, no: "A NAT instance needs internet access, so it must be in a public subnet with a public IP address." },
      { t: "In the private subnet's route table, point the 0.0.0.0/0 route directly at the VPC's internet gateway.", ok: false, no: "That makes the subnet public, and instances without public IP addresses still can't reach the internet." },
      { t: "Create an egress-only internet gateway, and point the private subnet's 0.0.0.0/0 route at it.", ok: false, no: "An egress-only internet gateway carries only IPv6 traffic." }
    ],
    why: "A NAT gateway is billed per hour and per GB processed, while a NAT instance is billed like any EC2 instance, with no data processing charge. For a light, non-critical workload, a small NAT instance in a public subnet with source/destination checks off, plus a route to it, is cheapest.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-comparison.html", "https://docs.aws.amazon.com/vpc/latest/userguide/work-with-nat-instances.html"] },

  { id: "saa-4-228", exam: "SAA", saa: "4.4", topic: "vpn", type: "mc",
    q: "A branch office sends about 1 TB a month to applications in a VPC and needs private, encrypted connectivity to it within one week. The office already has a reliable 500 Mbps internet connection, and throughput varies with the internet path. Which solution is MOST cost-effective?",
    opts: [
      "Create a Site-to-Site VPN connection between the office router and a virtual private gateway.",
      "Order a 1 Gbps dedicated AWS Direct Connect connection from the office to a Direct Connect location.",
      "Order a hosted Direct Connect connection through a partner, and run an IPsec VPN over it to the VPC.",
      "Set up an AWS Client VPN endpoint, and install the VPN client on each server in the branch office."
    ], a: 0,
    no: [null,
      "A dedicated connection takes longer than a week to set up, adds port-hour charges, and isn't encrypted by default.",
      "It meets the needs, but adds port-hour charges and partner lead time that 1 TB a month doesn't justify.",
      "Client VPN is for individual users' devices and is billed per endpoint and per connection."],
    why: "A Site-to-Site VPN uses the office's existing internet link, is encrypted with IPsec, and can be set up in hours. Direct Connect fits large, steady volumes or consistent performance needs.",
    doc: ["https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html", "https://docs.aws.amazon.com/directconnect/latest/UserGuide/encryption-in-transit.html"] },

  { id: "saa-4-229", exam: "SAA", saa: "4.4", topic: "transitgateway", type: "multi", hint: "Select TWO.",
    q: "A company connects 40 VPCs and its on-premises network through a transit gateway. Two of the VPCs, in the same Region, exchange about 500 TB a month, and transit gateway data processing charges for that traffic dominate the network bill. All other traffic must keep using the transit gateway. Which steps reduce costs the MOST? (Select TWO.)",
    items: [
      { t: "Create a VPC peering connection between the two VPCs, and accept the request from the other VPC.", ok: true },
      { t: "In both VPCs' route tables, add a route to the other VPC's CIDR range through the peering connection.", ok: true },
      { t: "Replace the transit gateway with a full mesh of VPC peering connections between all 40 VPCs.", ok: false, no: "That needs 780 connections, and peering can't carry the other VPCs' traffic to on premises." },
      { t: "Expose the services in one VPC through an endpoint service, and reach them through PrivateLink endpoints.", ok: false, no: "Interface endpoints add hourly and per-GB processing charges of their own." },
      { t: "Attach the two VPCs to a second transit gateway that only connects the two of them.", ok: false, no: "Traffic through any transit gateway is still charged per GB processed." }
    ],
    why: "VPC peering adds no transit gateway processing charge: traffic is free within an AZ and billed at standard in-Region rates across AZs, and AWS calls peering the lowest-cost option for VPC-to-VPC traffic. A route to the other VPC's CIDR is more specific than the summary route to the transit gateway, so only that traffic moves to the peering connection.",
    doc: ["https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/vpc-peering.html", "https://docs.aws.amazon.com/vpc/latest/userguide/route-tables-priority.html"] },

  { id: "saa-4-230", exam: "SAA", saa: "4.4", topic: "route53", type: "mc",
    q: "A public hosted zone in Route 53 answers hundreds of millions of queries a month. Most are for www.example.com and api.example.com, which are CNAME records that point to a CloudFront distribution and an Application Load Balancer. The company wants to lower its Route 53 query charges without changing where traffic goes. What should a solutions architect do?",
    opts: [
      "Replace the two CNAME records with alias records that point to the distribution and the ALB.",
      "Point each CNAME record at another record in the same hosted zone, which then points to the resource.",
      "Move both records into a private hosted zone, which isn't billed for the DNS queries that it answers.",
      "Create a Route 53 Resolver inbound endpoint, and have clients send their DNS queries to it instead."
    ], a: 0,
    no: [null,
      "A CNAME to another record in a Route 53 zone is charged as two queries, so costs go up.",
      "Public clients on the internet can't resolve records in a private hosted zone.",
      "Inbound endpoints serve queries from connected networks, add their own charges and can't serve the public."],
    why: "Route 53 doesn't charge for alias queries to AWS resources such as CloudFront distributions and load balancers, but it charges for every CNAME query.",
    doc: ["https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-choosing-alias-non-alias.html"] },

  { id: "saa-4-231", exam: "SAA", saa: "4.4", topic: "route53", type: "mc",
    q: "A company has 30 VPCs in several accounts, all connected to its data center. Each VPC has its own Route 53 Resolver outbound endpoint and forwarding rules to resolve on-premises names, and the endpoint charges keep growing. All VPCs can reach a shared services VPC in the same Region. Which solution reduces costs with the LEAST effort?",
    opts: [
      "Keep one outbound endpoint in the shared services VPC, share its rules through AWS RAM, and delete the rest.",
      "Replace each outbound endpoint with a DNS forwarder on a small EC2 instance in each VPC, and point DHCP options at it.",
      "Keep the endpoints, but delete the forwarding rules, and resolve on-premises names with records in public hosted zones.",
      "Replace each outbound endpoint with an inbound endpoint, so the data center sends its DNS answers into each VPC."
    ], a: 0,
    no: [null,
      "Thirty forwarder servers to patch and keep available is more work, and they still cost money.",
      "Publishing internal names in public zones exposes them to the internet and keeps every endpoint's charge.",
      "Inbound endpoints answer queries that come from on premises. They don't forward VPC queries out."],
    why: "One outbound endpoint can serve many VPCs: its forwarding rules are shared with other accounts through AWS RAM and associated with their VPCs. Each VPC doesn't need its own endpoint.",
    doc: ["https://docs.aws.amazon.com/whitepapers/latest/hybrid-cloud-dns-options-for-vpc/route-53-resolver-endpoints-and-forwarding-rules.html", "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resolver-rules-managing.html"] },

  { id: "saa-4-232", exam: "SAA", saa: "4.4", topic: "cloudfront", type: "multi", hint: "Select TWO.",
    q: "A CloudFront distribution serves product pages and images from an ALB origin. The content changes once a day, but CloudFront's cache hit ratio is low and origin traffic is high. The cache key includes all query strings, cookies and many headers, though only the lang query parameter changes the content, and the origin sends Cache-Control max-age=60. Which changes will cut origin fetches the MOST? (Select TWO.)",
    items: [
      { t: "Use a cache policy whose cache key includes only the lang query parameter, with no cookies or headers.", ok: true },
      { t: "Have the origin send a longer Cache-Control max-age that matches the daily rate of change.", ok: true },
      { t: "Set the distribution's default TTL to 0, so CloudFront checks with the origin on every request.", ok: false, no: "A lower TTL can only make CloudFront go back to the origin as often or more often, never less." },
      { t: "Put AWS Global Accelerator in front of the ALB, so CloudFront reaches the origin over the AWS network.", ok: false, no: "It can speed up the origin path, but every cache miss still reaches the origin." },
      { t: "Add an origin group with a second ALB in another Region as the failover origin for the distribution.", ok: false, no: "An origin group handles failover. It doesn't make CloudFront fetch any less." }
    ],
    why: "Every value in the cache key splits the cache, so including only what changes the response raises the hit ratio. A longer max-age keeps objects cached longer, so CloudFront asks the origin less often.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-hit-ratio.html"] },

  { id: "saa-4-233", exam: "SAA", saa: "4.4", topic: "waf", type: "mc",
    q: "A public product search API on API Gateway (REST) calls Lambda and an OpenSearch domain, and anyone may use it without signing in. Scraper bots from a few hundred IP addresses each send thousands of requests a minute, driving up Lambda and backend costs, while real users each send only a few. Which solution cuts the scrapers' traffic without affecting real users?",
    opts: [
      "Attach an AWS WAF web ACL to the stage with a rate-based rule that blocks IPs over a set rate.",
      "Create a usage plan with a low rate limit, and embed one API key for it in the public web app's code.",
      "Lower the stage's default method throttling rate limit to the request rate that is normal for real users.",
      "Set reserved concurrency on the Lambda function to cap how many copies of it can run at any one time."
    ], a: 0,
    no: [null,
      "One shared key gives every user the same limit together, and anyone can copy it from the app.",
      "Stage throttling limits all clients together, so real users are throttled along with the bots.",
      "Capping concurrency throttles real users' requests as well once the bots fill it."],
    why: "A WAF rate-based rule counts requests per IP address and blocks addresses that go over the limit, before the requests reach the API's backend. Clients below the limit are unaffected.",
    doc: ["https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html"] },

  { id: "saa-4-234", exam: "SAA", saa: "4.4", topic: "directconnect", type: "mc",
    q: "Each night, a company must copy 9 TB from its data center to AWS within a 6-hour window, which needs a little over 3.3 Gbps of throughput. It will order a hosted Direct Connect connection through a partner and wants to pay for no more port capacity than it needs. Which hosted connection speed should it order?",
    opts: [
      "A 5 Gbps hosted connection, the smallest offered speed above the needed rate.",
      "A 2 Gbps hosted connection, sized to the average throughput over a full 24-hour day.",
      "A 1 Gbps hosted connection, with the copy compressed to make up the difference.",
      "A 10 Gbps hosted connection, to leave room for traffic to double in a few years."
    ], a: 0,
    no: [null,
      "Spread over a day, 2 Gbps is enough, but the copy must finish inside the 6-hour window.",
      "Compression can't be counted on to cut the data by more than two thirds.",
      "It works, but it pays for twice the capacity that is needed today."],
    why: "9 TB is 72 terabits, and 72 Tb over 21,600 seconds is about 3.3 Gbps. Hosted connections come in set speeds, including 2, 5 and 10 Gbps, so 5 Gbps is the smallest that fits the window.",
    doc: ["https://docs.aws.amazon.com/directconnect/latest/UserGuide/hosted_connection.html", "https://docs.aws.amazon.com/directconnect/latest/UserGuide/Welcome.html"] },

  { id: "saa-4-235", exam: "SAA", saa: "4.4", topic: "billing", type: "multi", hint: "Select TWO.",
    q: "Inter-AZ data transfer charges are rising across a company's organization, and finance must find which resources cause them, by account and by Team cost allocation tag. Analysts want to query hourly, resource-level data with SQL and keep it for several years. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "In the management account, create a CUR 2.0 export in AWS Data Exports with hourly granularity and resource IDs, delivered to S3.", ok: true },
      { t: "Query the export with Amazon Athena, filtering on usage types that end in DataTransfer-Regional-Bytes.", ok: true },
      { t: "In Cost Explorer, group costs by resource at hourly granularity, and save the report as a monthly view.", ok: false, no: "Cost Explorer keeps resource-level data for only the past 14 days, and hourly resource-level data only for EC2 instances." },
      { t: "Turn on VPC Flow Logs in every VPC, and estimate each resource's charges from the bytes in the logs.", ok: false, no: "Flow logs record traffic, not charges, and they add their own costs." },
      { t: "Create an AWS Budgets usage budget for data transfer in each account, with an alert on actual usage.", ok: false, no: "A budget alerts on totals. It doesn't show which resources cause the charges." }
    ],
    why: "CUR 2.0 in Data Exports delivers detailed cost and usage line items to S3, with optional hourly granularity, resource IDs and cost allocation tag columns. Athena queries it with SQL, and inter-AZ transfer shows as the DataTransfer-Regional-Bytes usage type.",
    doc: ["https://docs.aws.amazon.com/cur/latest/userguide/dataexports-create-standard.html", "https://docs.aws.amazon.com/cur/latest/userguide/cur-data-transfers-charges.html"] }
);
