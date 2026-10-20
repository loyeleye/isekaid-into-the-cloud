// Question bank: SAA-C03 (AWS Certified Solutions Architect - Associate). Same schema and rules as js/bank-dva.js.
// SAA questions ask which design fits the constraints; shared ground (exam 'both') lives in bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Domain 1: Design Secure Architectures (30%)
  { id: "saa-1-01", exam: "SAA", saa: "1.1", topic: "organizations", type: "mc",
    q: "A company with dozens of member accounts in AWS Organizations must make sure that no one in those accounts, account administrators included, can create resources outside eu-west-1 and eu-central-1. Which solution meets this requirement with the LEAST operational overhead?",
    opts: [
      "Attach an SCP to the organization root that denies requests when aws:RequestedRegion is neither Region, exempting global services.",
      "Attach an IAM policy that denies the other Regions to every user and role in every member account, and add it to each new one.",
      "Turn on AWS Config in each account with a rule that flags any resource created outside the two approved Regions.",
      "Send CloudTrail events to an alerting rule that notifies the security team when something is created in another Region."
    ], a: 0,
    no: [null,
      "Administrators can detach a policy in their own account, and covering every new principal is constant work.",
      "Config detects resources after they exist. It doesn't prevent anyone from creating them.",
      "An alert after the fact isn't a guardrail."],
    why: "An SCP sets the maximum permissions for every principal in the member accounts it applies to, administrators and root users included, and it is managed once for the whole organization. SCPs don't apply to the management account.",
    doc: ["https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html", "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_examples.html"] },

  { id: "saa-1-02", exam: "SAA", saa: "1.2", topic: "vpc", type: "mc",
    q: "A UDP game server fleet runs in public subnets behind a Network Load Balancer that preserves client IP addresses. A handful of IP addresses are flooding the servers with junk traffic. How should a solutions architect block those addresses?",
    opts: [
      "Add inbound deny rules for the addresses to the subnets' network ACL, numbered lower than the allow rules.",
      "Add inbound deny rules for the addresses to the security group that is attached to the game server instances.",
      "Attach an AWS WAF web ACL with an IP set match rule for the addresses to the Network Load Balancer.",
      "Remove the internet gateway route from the public subnets' route table until the flood of traffic stops."
    ], a: 0,
    no: [null,
      "Security groups only have allow rules. They can't deny a particular address.",
      "AWS WAF can't be attached to a Network Load Balancer, and it inspects web requests, not UDP game traffic.",
      "That cuts off every player, not just the attackers."],
    why: "Network ACLs are stateless filters at the subnet level with numbered allow and deny rules, evaluated from the lowest number, so they can block specific addresses.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html"] },

  { id: "saa-1-03", exam: "SAA", saa: "1.2", topic: "vpc", type: "mc",
    q: "Instances in private subnets copy several terabytes a day to and from S3 buckets in the same Region through a NAT gateway. The security team wants this traffic off the internet path, and finance wants the NAT gateway's data processing charges gone. What should a solutions architect do?",
    opts: [
      "Create an S3 gateway endpoint in the VPC, and add it to the private subnets' route tables.",
      "Move the instances into public subnets, and give each of them an Elastic IP address.",
      "Replace the NAT gateway with a NAT instance, which has no per-GB processing charge.",
      "Turn on S3 Transfer Acceleration for the buckets, and use the accelerate endpoint."
    ], a: 0,
    no: [null,
      "The traffic would then go over the internet path the security team wants to avoid.",
      "Traffic still takes the internet path, and the team now has an instance to run and patch.",
      "Transfer Acceleration speeds long-distance transfers through edge locations, adds a charge, and still uses public endpoints."],
    why: "A gateway endpoint sends S3 traffic from the VPC privately, with no hourly or data processing charge. DynamoDB has the same kind of endpoint.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html"] },

  { id: "saa-1-04", exam: "SAA", saa: "1.2", topic: "vpc", type: "mc",
    q: "Web servers in an Auto Scaling group sit behind an Application Load Balancer, and a MySQL database runs in private subnets. The database must accept connections only from the web servers, whose IP addresses change as instances are replaced. How should the database's security group be configured?",
    opts: [
      "Allow TCP 3306 inbound with the web servers' security group as the source.",
      "Allow TCP 3306 inbound from the VPC's whole CIDR block as the source range.",
      "Allow TCP 3306 inbound with the load balancer's security group as the source.",
      "Allow TCP 3306 inbound from the web servers' current IPs, updated on each scaling event."
    ], a: 0,
    no: [null,
      "Every resource in the VPC could then reach the database.",
      "The load balancer forwards web traffic to the web servers. Database connections come from the web servers.",
      "It needs automation for every change, and connections fail in the gaps between updates."],
    why: "A security group rule can name another security group as its source, so it covers whichever instances carry that group, whatever their addresses.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html"] },

  { id: "saa-1-05", exam: "SAA", saa: "1.3", topic: "s3", type: "mc",
    q: "A financial firm must keep trade records in S3 for 7 years in a form that no user, including the root user, can delete or overwrite during that time. Which solution meets this requirement?",
    opts: [
      "Turn on S3 Object Lock in compliance mode with a 7-year retention period.",
      "Turn on S3 Object Lock in governance mode with a 7-year retention period.",
      "Turn on S3 Versioning with MFA Delete, and require MFA for every delete request.",
      "Add a lifecycle rule that moves the records to S3 Glacier Deep Archive after 30 days."
    ], a: 0,
    no: [null,
      "In governance mode, users with the s3:BypassGovernanceRetention permission can delete locked objects.",
      "MFA Delete makes deletion harder, but the root user with its MFA device can still delete.",
      "A storage class changes what storage costs, not who can delete it."],
    why: "In compliance mode, no user, including the root user, can delete a locked object version or shorten its retention period until it expires.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html"] },

  { id: "saa-1-06", exam: "SAA", saa: "1.2", topic: "waf", type: "mc",
    q: "A public web app behind an Application Load Balancer is under a credential-stuffing attack: thousands of login attempts a minute from many IP addresses, each sending a few hundred requests. The company wants a managed way to block abusive sources and common web exploits. What should a solutions architect do?",
    opts: [
      "Attach an AWS WAF web ACL to the ALB with a rate-based rule and AWS managed rule groups.",
      "Add deny rules for each attacking IP address to the network ACLs of the load balancer's subnets.",
      "Turn on Amazon GuardDuty for the account so that it finds and blocks the attacking IP addresses.",
      "Move the Application Load Balancer into private subnets so it is no longer reachable from the internet."
    ], a: 0,
    no: [null,
      "Thousands of changing addresses won't fit in a network ACL's rule limit, and network ACLs can't see HTTP requests.",
      "GuardDuty detects threats and reports findings. It doesn't block requests by itself.",
      "Real users could no longer reach the public app either."],
    why: "AWS WAF inspects HTTP requests at the ALB. Rate-based rules block sources that go over a request rate, and managed rule groups cover common exploits such as SQL injection.",
    doc: ["https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html"] },

  { id: "saa-1-07", exam: "SAA", saa: "1.3", topic: "macie", type: "mc",
    q: "A company has hundreds of S3 buckets left over from years of projects. It must find out which buckets hold personal data such as passport numbers. Which service should a solutions architect use?",
    opts: ["Amazon Macie", "Amazon GuardDuty", "Amazon Inspector", "AWS Config"], a: 0,
    no: [null,
      "GuardDuty watches for threats such as unusual API activity, not the content of objects.",
      "Inspector scans workloads such as EC2 instances and container images for vulnerabilities.",
      "Config records resource settings, such as whether a bucket is public, not what is inside objects."],
    why: "Macie discovers sensitive data such as personal information in S3 with managed and custom data identifiers, and reports findings for each bucket and object.",
    doc: ["https://docs.aws.amazon.com/macie/latest/user/what-is-macie.html"] },

  { id: "saa-1-08", exam: "SAA", saa: "1.1", topic: "iam", type: "mc",
    q: "A company with 40 AWS accounts wants employees to sign in with the existing corporate identity provider and get role-based access to the accounts they need, without creating IAM users. What should a solutions architect use?",
    opts: [
      "IAM Identity Center connected to the corporate identity provider, with permission sets assigned per account.",
      "An IAM user for each employee in a central account, plus cross-account roles in the other 39 accounts for them to assume.",
      "Amazon Cognito user pools federated with the corporate identity provider for each of the 40 accounts.",
      "Service control policies in AWS Organizations that grant each employee access to their own accounts."
    ], a: 0,
    no: [null,
      "That creates the IAM users the company wants to avoid, with long-term passwords and keys.",
      "Cognito signs in users of your applications, not the workforce into AWS accounts.",
      "SCPs only limit permissions. They never grant access."],
    why: "IAM Identity Center federates with an external identity provider and turns permission sets into roles in each account, so people sign in once and get temporary credentials.",
    doc: ["https://docs.aws.amazon.com/singlesignon/latest/userguide/what-is.html"] },

  // Domain 2: Design Resilient Architectures (26%)
  { id: "saa-2-01", exam: "both", dva: "1.1", saa: "2.1", topic: "sqs", type: "mc",
    q: "An order website writes directly to a backend that processes orders slowly. During promotions the backend falls behind, and the website times out and loses orders. The company wants the website to stay responsive and keep every order. What should a solutions architect do?",
    opts: [
      "Have the website send orders to an SQS queue, and have the backend consume the queue at its own pace.",
      "Put the website's servers in an Auto Scaling group behind the load balancer, scaling on CPU use.",
      "Put a CloudFront distribution in front of the website, so that its responses are cached at edge locations near users.",
      "Move the backend's database to a larger instance type, so that it handles each order more quickly."
    ], a: 0,
    no: [null,
      "The website isn't the bottleneck. More web servers send the backend even more work.",
      "Each order is a unique write, so caching doesn't help it.",
      "It may help for a while, but the next promotion that outgrows the instance fails the same way."],
    why: "A queue decouples the tiers: the website answers as soon as the order is queued, and the queue holds it durably until the backend catches up. The backend can scale on the queue's depth.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html"] },

  { id: "saa-2-02", exam: "SAA", saa: "2.2", topic: "rds", type: "multi", hint: "Select TWO.",
    q: "A reporting workload on an RDS for PostgreSQL DB instance slows down the main app. The company also needs automatic failover if the primary's Availability Zone fails. Which steps meet both requirements? (Select TWO.)",
    items: [
      { t: "Convert the DB instance to a Multi-AZ deployment.", ok: true },
      { t: "Create a read replica, and point the reporting workload at its endpoint.", ok: true },
      { t: "Point the reporting workload at the Multi-AZ standby instance.", ok: false, no: "In a Multi-AZ DB instance deployment, the standby serves no traffic. It only takes over on failover." },
      { t: "Take hourly snapshots, and restore one for each reporting run.", ok: false, no: "Restores are slow and manual, and they give no failover." },
      { t: "Move the DB instance to a larger instance class in the same AZ.", ok: false, no: "More capacity eases the load but leaves the single-AZ failure risk." }
    ],
    why: "Multi-AZ keeps a synchronous standby in another AZ for automatic failover. A read replica is an asynchronous copy that takes read traffic off the primary.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html", "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html"] },

  { id: "saa-2-03", exam: "SAA", saa: "2.2", topic: "dr", type: "mc",
    q: "A company needs disaster recovery in a second Region for an app on EC2 with an Aurora MySQL database. The recovery point objective is a few minutes, the recovery time objective is a few hours, and the company wants the lowest cost that meets both. Which strategy fits best?",
    opts: [
      "Pilot light: replicate the database to the second Region continuously, and keep AMIs ready to launch the app servers.",
      "Backup and restore: copy nightly snapshots to the second Region, and restore them when a disaster happens.",
      "Warm standby: run a scaled-down but fully working copy of the whole stack in the second Region at all times.",
      "Multi-site active/active: serve production traffic from both Regions at once, with data replicated between them continuously."
    ], a: 0,
    no: [null,
      "Nightly backups mean up to a day of lost data, far more than a few minutes.",
      "It meets both objectives, but it costs more than an RTO of hours requires.",
      "Near-zero downtime at the highest cost, far beyond what is asked."],
    why: "Pilot light keeps data live in the recovery Region, which meets an RPO of minutes, and starts compute only during a disaster, which fits an RTO of hours at low cost.",
    doc: ["https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html"] },

  { id: "saa-2-04", exam: "SAA", saa: "2.2", topic: "route53", type: "mc",
    q: "A company runs its web app in us-east-1 with a standby copy in us-west-2. Users must be sent to us-west-2 automatically if the primary endpoint stops responding. What should a solutions architect configure?",
    opts: [
      "Route 53 failover routing, with a health check on the primary record.",
      "Route 53 latency-based routing between the two Regions, with no health checks.",
      "Route 53 simple routing, with both Regions' addresses as values in one record.",
      "A CloudFront distribution that has the us-east-1 endpoint as its only origin."
    ], a: 0,
    no: [null,
      "Latency routing sends users to the closest Region, and without health checks it keeps sending them to a failed one.",
      "Simple routing returns all the values in random order and checks none of them.",
      "With a single origin, CloudFront has nothing to fail over to."],
    why: "Failover routing answers with the primary record while its health check passes, and with the secondary when it fails.",
    doc: ["https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-failover.html"] },

  { id: "saa-2-05", exam: "SAA", saa: "2.2", topic: "aurora", type: "mc",
    q: "A global company runs a relational app on Aurora MySQL in one Region. It needs low-latency local reads in two other Regions, and if the primary Region fails, recovery with about a second of data loss and about a minute of downtime. What should a solutions architect use?",
    opts: [
      "An Aurora global database, with read-only secondary clusters in the other two Regions.",
      "Cross-Region automated backups, restored in another Region when the primary fails.",
      "More Aurora Replicas in other Availability Zones of the primary Region's cluster.",
      "DynamoDB global tables in all three Regions, with the app rewritten to use them."
    ], a: 0,
    no: [null,
      "A restore takes far longer than a minute, and recent writes are lost.",
      "Everything stays in one Region, so a Regional failure takes it all down, and reads elsewhere stay slow.",
      "It replicates across Regions, but only after a rewrite the scenario doesn't need."],
    why: "An Aurora global database replicates to read-only secondary clusters in other Regions, typically in under a second, and a secondary can be promoted to take writes in about a minute.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html"] },

  { id: "saa-2-06", exam: "SAA", saa: "2.2", topic: "autoscaling", type: "multi", hint: "Select TWO.",
    q: "A web app runs on two EC2 instances in one Availability Zone behind an Application Load Balancer. The company wants it to survive the loss of an Availability Zone and to replace failed instances automatically. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Run the instances in an Auto Scaling group that spans subnets in at least two Availability Zones.", ok: true },
      { t: "Enable the load balancer in those same Availability Zones, and use its health checks for the group.", ok: true },
      { t: "Add two more instances in new subnets that are in the same Availability Zone as the others.", ok: false, no: "Subnets in one AZ all fail together with that AZ." },
      { t: "Attach an Elastic IP address to each instance, so that it can move to another Availability Zone.", ok: false, no: "An Elastic IP address doesn't recover a failed instance or zone. It is only an address." },
      { t: "Create AMIs of the instances every day, and copy them to another Region for safekeeping.", ok: false, no: "Backups help a later recovery, not automatic replacement of failed instances." }
    ],
    why: "An Auto Scaling group across AZs replaces failed instances and launches capacity in the remaining zones. The ALB, enabled in those AZs, sends traffic only to healthy targets.",
    doc: ["https://docs.aws.amazon.com/autoscaling/ec2/userguide/auto-scaling-benefits.html", "https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-health-checks.html"] },

  { id: "saa-2-07", exam: "both", dva: "1.1", saa: "2.1", topic: "caching", type: "mc",
    q: "A web app keeps user sessions in each EC2 instance's memory. When Auto Scaling removes an instance, its users are logged out. The company wants scaling to be invisible to users. What should a solutions architect do?",
    opts: [
      "Store the sessions in ElastiCache or DynamoDB, so that any instance can read any user's session.",
      "Turn on sticky sessions at the load balancer, so each user stays on the same instance.",
      "Turn off scale-in for the group, so that instances holding sessions are never removed.",
      "Store each session on the instance's own EBS volume, so that it survives the app restarting."
    ], a: 0,
    no: [null,
      "Users are still logged out when their instance is removed.",
      "That pays for peak capacity all the time, and sessions are still lost when an instance fails.",
      "The volume belongs to one instance, so other instances can't read those sessions."],
    why: "Keeping session state outside the instances makes the web tier stateless, so any instance can serve any request and instances can come and go.",
    doc: ["https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/elasticache-use-cases.html"] },

  // Domain 3: Design High-Performing Architectures (24%)
  { id: "saa-3-01", exam: "SAA", saa: "3.1", topic: "efs", type: "mc",
    q: "A content management system runs on Linux EC2 instances in three Availability Zones. Every instance must read and write the same files at the same time, and storage should grow on its own. Which storage should a solutions architect use?",
    opts: [
      "Amazon EFS, mounted on every instance.",
      "One EBS volume with Multi-Attach, attached to every instance.",
      "Instance store volumes, kept in sync between instances by a cron job.",
      "An S3 bucket, copied to each instance's disk by a script every minute."
    ], a: 0,
    no: [null,
      "Multi-Attach works only within one Availability Zone and needs a cluster-aware file system.",
      "Instance store data is lost when an instance stops, and syncing by cron is fragile.",
      "Copies drift between runs, and writes on one instance don't reach the others."],
    why: "EFS is a managed NFS file system that many instances in different AZs can mount at once, and it grows and shrinks automatically.",
    doc: ["https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html"] },

  { id: "saa-3-02", exam: "SAA", saa: "3.4", topic: "globalaccelerator", type: "mc",
    q: "A multiplayer game uses UDP and runs in three Regions. Players around the world need the lowest possible latency, two static IP addresses to allow-list, and fast failover to another Region. Which service fits best?",
    opts: [
      "AWS Global Accelerator, with endpoint groups in the three Regions.",
      "Amazon CloudFront, with the game servers in each Region as its origins.",
      "Route 53 latency-based routing to a Network Load Balancer in each Region.",
      "An Application Load Balancer in each Region, each with Elastic IP addresses."
    ], a: 0,
    no: [null,
      "CloudFront delivers HTTP and HTTPS content. It doesn't carry the game's UDP traffic.",
      "DNS answers are cached by clients, so failover is slower, and players get no fixed IP addresses.",
      "ALBs handle HTTP and HTTPS, not UDP, and they don't take Elastic IP addresses."],
    why: "Global Accelerator provides two static anycast IP addresses, carries TCP and UDP over the AWS network from the nearest edge location, and shifts traffic between Regions quickly.",
    doc: ["https://docs.aws.amazon.com/global-accelerator/latest/dg/what-is-global-accelerator.html"] },

  { id: "saa-3-03", exam: "SAA", saa: "3.5", topic: "firehose", type: "mc",
    q: "A company wants to collect streaming application logs in S3 in Parquet format and query them with SQL, with the LEAST operational overhead. What should a solutions architect do?",
    opts: [
      "Deliver the logs with Amazon Data Firehose, converting them to Parquet in S3, and query them with Athena.",
      "Run a Kafka cluster on EC2 that writes the logs to S3, and query them with Presto on an EMR cluster.",
      "Load the logs into an RDS for PostgreSQL database, and run SQL queries against it directly.",
      "Write the logs to a Kinesis data stream, and query the stream's shards directly with Athena."
    ], a: 0,
    no: [null,
      "It works, but it means running and patching two clusters.",
      "A relational database is a costly, poor fit for large volumes of append-only logs.",
      "Athena queries data stored in S3, not records in a stream."],
    why: "Firehose is a managed delivery service that can convert records to Parquet before writing them to S3, and Athena queries S3 with SQL with nothing to run.",
    doc: ["https://docs.aws.amazon.com/firehose/latest/dev/record-format-conversion.html"] },

  { id: "saa-3-04", exam: "SAA", saa: "3.2", topic: "fargate", type: "mc",
    q: "A company runs a containerized API at a steady load on EC2 instances it manages itself. It wants to stop managing servers, without changing the API's code or container images. Which compute option fits best?",
    opts: [
      "Run the existing containers on Amazon ECS with AWS Fargate.",
      "Rewrite the API as Lambda functions behind Amazon API Gateway.",
      "Run the containers on ECS with an Auto Scaling group of EC2 instances.",
      "Run the containers as AWS Batch jobs on Spot Instances."
    ], a: 0,
    no: [null,
      "A rewrite is exactly what the company wants to avoid.",
      "That keeps the instances the company wants to stop managing.",
      "Batch runs queued jobs, not a steady API, and Spot capacity can be taken back mid-request."],
    why: "Fargate runs containers without servers to provision or patch, so the existing images run as they are.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html"] },

  { id: "saa-3-05", exam: "SAA", saa: "3.3", topic: "caching", type: "mc",
    q: "An e-commerce site's RDS for MySQL database is overloaded by the same product-catalog queries, repeated thousands of times a minute. Product data changes a few times a day. Which change reduces the load on the database the most?",
    opts: [
      "Cache the query results in ElastiCache with a TTL, and read the cache first.",
      "Convert the database to a Multi-AZ deployment with a standby in another AZ.",
      "Move the database's storage to Provisioned IOPS SSD for faster disk access.",
      "Turn on Performance Insights to find the heaviest queries on the database."
    ], a: 0,
    no: [null,
      "A Multi-AZ standby is for failover. It doesn't take any reads.",
      "Faster storage helps I/O, but the same queries still run thousands of times.",
      "It shows which queries are heavy, but it doesn't reduce them."],
    why: "Repeated reads of slowly changing data suit a cache. Most requests are answered from memory, and the database only sees the misses.",
    doc: ["https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html"] },

  { id: "saa-3-06", exam: "SAA", saa: "3.1", topic: "fsx", type: "mc",
    q: "A genomics team runs a high-performance computing job on hundreds of Linux instances that need a shared file system with sub-millisecond latency and very high throughput. The input data lives in S3. Which storage should they use?",
    opts: [
      "Amazon FSx for Lustre, linked to the S3 bucket.",
      "Amazon FSx for Windows File Server, mounted over SMB.",
      "Amazon EFS, mounted on every instance in the job.",
      "The S3 bucket itself, read by each instance directly."
    ], a: 0,
    no: [null,
      "It serves SMB file shares for Windows workloads, not Linux HPC jobs.",
      "EFS is general-purpose shared storage. FSx for Lustre is built for HPC throughput and links to S3 directly.",
      "S3 is object storage, not a shared POSIX file system with sub-millisecond latency."],
    why: "FSx for Lustre is a high-performance parallel file system for HPC and machine learning, and it can load from and export to a linked S3 bucket.",
    doc: ["https://docs.aws.amazon.com/fsx/latest/LustreGuide/what-is.html"] },

  { id: "saa-3-07", exam: "SAA", saa: "3.1", topic: "s3", type: "multi", hint: "Select TWO.",
    q: "Users around the world upload video files of several GB to an S3 bucket in us-east-1. Uploads from Asia are slow and sometimes fail partway through. Which actions improve upload speed and reliability? (Select TWO.)",
    items: [
      { t: "Turn on S3 Transfer Acceleration, and have clients use the bucket's accelerate endpoint.", ok: true },
      { t: "Use multipart upload, so parts go in parallel and a failed part can be retried on its own.", ok: true },
      { t: "Move the uploaded objects to the S3 One Zone-IA storage class as they arrive.", ok: false, no: "Storage classes change cost and resilience, not upload speed." },
      { t: "Request a higher S3 request rate quota for the bucket through Service Quotas.", ok: false, no: "The problem is distance and very large single uploads, not the request rate." },
      { t: "Turn on S3 Versioning for the bucket, so that a failed upload can be resumed.", ok: false, no: "Versioning keeps earlier versions of objects. It doesn't resume uploads." }
    ],
    why: "Transfer Acceleration routes uploads through the nearest edge location and over the AWS network. Multipart upload splits big files into parts that upload in parallel and retry on their own.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/transfer-acceleration.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html"] },

  // Domain 4: Design Cost-Optimized Architectures (20%)
  { id: "saa-4-01", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "A company stores application logs in S3. Logs are read often for 30 days, rarely for the rest of the first year, and must be kept for 7 years for audits, where waiting up to 48 hours for a retrieval is acceptable. Which solution is MOST cost-effective?",
    opts: [
      "A lifecycle rule: Standard-IA after 30 days, Glacier Deep Archive after a year, deletion after 7 years.",
      "Keep every log in S3 Standard for the whole 7 years, and have a lifecycle rule delete each log when it reaches 7 years old.",
      "A lifecycle rule that moves every log to S3 Glacier Deep Archive one day after it is written to S3.",
      "A lifecycle rule that moves logs to S3 One Zone-IA after 30 days and keeps them there for 7 years."
    ], a: 0,
    no: [null,
      "Simple, but it pays Standard prices for years of data that is rarely read.",
      "Logs read often in their first 30 days would need slow retrievals, paid for each time.",
      "One Zone-IA costs far more than Deep Archive for six years of archive, and it keeps the audit data in a single AZ."],
    why: "Standard-IA suits rare reads that still need millisecond access. Deep Archive is the lowest-cost class, with standard retrievals within 12 hours, which fits a 48-hour audit window.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-transition-general-considerations.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html"] },

  { id: "saa-4-02", exam: "SAA", saa: "4.1", topic: "s3", type: "mc",
    q: "A media company stores millions of images with unpredictable access: some go untouched for months, then become popular overnight. It wants lower storage costs with no retrieval fees and no access analysis to maintain. Which storage class should it use?",
    opts: ["S3 Intelligent-Tiering", "S3 Standard-IA", "S3 Glacier Flexible Retrieval", "S3 One Zone-IA"], a: 0,
    no: [null,
      "Standard-IA charges for each GB retrieved, which hurts when images suddenly become popular.",
      "Retrievals take minutes to hours, too slow for images users are waiting for.",
      "It charges retrieval fees, and it keeps the only copy in one Availability Zone."],
    why: "Intelligent-Tiering moves objects between access tiers based on use, for a small monitoring charge per object, with no retrieval fees.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering-overview.html"] },

  { id: "saa-4-03", exam: "SAA", saa: "4.2", topic: "ec2", type: "mc",
    q: "A company runs nightly image-rendering jobs that take 3 hours and can resume from checkpoints if they are interrupted. The jobs only need to finish before morning. Which EC2 purchasing option is MOST cost-effective?",
    opts: ["Spot Instances", "On-Demand Instances", "Reserved Instances for 3 years", "Dedicated Hosts"], a: 0,
    no: [null,
      "It works, but it pays full price for work that can tolerate interruptions.",
      "A commitment for every hour of every day, for work that runs 3 hours a night.",
      "Meant for licensing or compliance needs, at the highest price."],
    why: "Spot Instances use spare capacity at a large discount and can be reclaimed with a two-minute warning, which flexible, checkpointed batch work can absorb.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using-spot-instances.html"] },

  { id: "saa-4-04", exam: "SAA", saa: "4.2", topic: "savingsplans", type: "mc",
    q: "A company runs a steady 24/7 base of compute across EC2 instances of several families, Fargate and Lambda, and expects to change instance types over the next 3 years. Which option gives the biggest discount while allowing those changes?",
    opts: [
      "A Compute Savings Plan for the steady hourly spend.",
      "Standard Reserved Instances for the current instance types.",
      "Spot Instances for the whole of the steady base load.",
      "An EC2 Instance Savings Plan for the current instance family."
    ], a: 0,
    no: [null,
      "They can't cover Fargate or Lambda, and they are tied to instance attributes the company plans to change.",
      "Spot capacity can be taken back, which a steady 24/7 base can't absorb.",
      "It is tied to one instance family in one Region, and it doesn't cover Fargate or Lambda."],
    why: "A Compute Savings Plan applies to EC2 in any family, size and Region, as well as to Fargate and Lambda, in exchange for a committed spend per hour.",
    doc: ["https://docs.aws.amazon.com/savingsplans/latest/userguide/what-is-savings-plans.html"] },

  { id: "saa-4-05", exam: "both", dva: "1.3", saa: "4.3", topic: "dynamodb", type: "mc",
    q: "A new app's DynamoDB table will see unpredictable traffic: near zero most days, with sudden spikes during marketing campaigns. The team has no usage history to plan from. Which capacity choice is MOST cost-effective?",
    opts: [
      "On-demand capacity mode, paying for each request.",
      "Provisioned capacity sized for the highest expected spike.",
      "Provisioned capacity with a year of reserved capacity.",
      "Provisioned capacity sized for average traffic, with no auto scaling."
    ], a: 0,
    no: [null,
      "It pays for peak capacity every hour, and that capacity sits idle most of the time.",
      "A commitment needs a steady, known baseline, which this table doesn't have.",
      "The sudden spikes would be throttled."],
    why: "On-demand mode charges per request and follows traffic, which suits new or unpredictable workloads. Provisioned capacity with auto scaling is cheaper for steady, predictable traffic.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html"] },

  { id: "saa-4-06", exam: "SAA", saa: "4.4", topic: "vpc", type: "mc",
    q: "A development VPC spans three Availability Zones, with a NAT gateway in each. The developers can live without outbound internet access if one AZ fails, and the company wants to cut costs. What should a solutions architect do?",
    opts: [
      "Keep one NAT gateway, and route every private subnet's outbound internet traffic to it.",
      "Attach an internet gateway to each private subnet in place of its NAT gateway.",
      "Peer the VPC with the production VPC, and send traffic through its NAT gateways.",
      "Keep all three NAT gateways, and stop them each evening outside office hours."
    ], a: 0,
    no: [null,
      "Instances without public IP addresses can't use an internet gateway, and the subnets would no longer be private.",
      "VPC peering doesn't carry traffic out through another VPC's NAT gateway.",
      "NAT gateways can't be stopped, only deleted and created again."],
    why: "One NAT gateway removes two sets of hourly charges, at the cost of depending on one AZ and some cross-AZ data charges, a fair trade for development. Production should keep one per AZ.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html"] }
);
