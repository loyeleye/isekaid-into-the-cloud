// Question bank batch: SAA-C03 Domain 2 gap fill (X-Ray visibility, API Gateway in resilient designs, multi-tier, RDS Proxy, legacy apps, AWS Backup, MGN, DRS, Route 53, Amazon MQ, Transfer Family, containers, scaling, quotas). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 2.2: X-Ray and tracing for visibility
  { id: "saa-2-201", exam: "both", saa: "2.2", dva: "4.1", topic: "xray", type: "mc",
    q: "A REST API in Amazon API Gateway invokes a Lambda function. Some requests take over 5 seconds, and the team can't tell whether the time is spent in API Gateway, in Lambda starting a new execution environment, or in the function's own code. The team needs a per-request timeline across these parts without changing the function's code. Which solution meets these requirements?",
    opts: [
      "Turn on X-Ray tracing for the API stage and active tracing for the function, then read the traces of slow requests.",
      "Turn on CloudTrail data events for the function, and compare each invoke event's time with the API's request times.",
      "Create a CloudWatch Synthetics canary that calls the API every minute, and graph the response times that it records.",
      "Attach the function to a VPC, turn on VPC Flow Logs for its subnets, and match the flow records to slow requests."
    ], a: 0,
    no: [null,
      "CloudTrail records who called which API and when, not how long each part of the system spent on a request.",
      "A canary measures total response time from outside, so it can't split the time between API Gateway, start-up and code.",
      "Flow logs show network connections, not how long API Gateway or the function spent working on a request."],
    why: "With tracing on the stage and active tracing on the function, each sampled request produces a trace with an API Gateway segment and Lambda segments, including an Init subsegment for cold starts. The slow part is visible without code changes.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-services-apigateway.html", "https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html"] },

  { id: "saa-2-202", exam: "SAA", saa: "2.2", topic: "xray", type: "mc",
    q: "An order flow runs from API Gateway to a Lambda function that sends each order to an Amazon SQS queue, and a second Lambda function processes the queue. When an order is slow, engineers search two sets of logs by hand and can't see how long orders wait in the queue. They want one connected view of each request, including the time spent in the queue, without writing log-parsing code. Which solution meets these requirements?",
    opts: [
      "Turn on X-Ray tracing for the stage and both functions, and view the linked traces in the trace map.",
      "Add the order ID to every log line, and write CloudWatch Logs Insights queries that join both functions' log groups.",
      "Turn on CloudTrail data events for the queue, and match each SendMessage event to the second function's invocations.",
      "Graph the queue's ApproximateAgeOfOldestMessage metric on a dashboard next to each function's Duration metric."
    ], a: 0,
    no: [null,
      "That is the hand-written log work the engineers want to avoid, and it still gives no timed, connected view of each hop.",
      "CloudTrail records API calls for auditing; it doesn't link them into a per-request trace or show how long a message waited.",
      "These metrics are aggregates over all messages, so they can't show the path or timing of one particular order."],
    why: "SQS carries the X-Ray trace header with each message, and X-Ray automatically links traces from the message producer to traces from the Lambda consumer. The trace map shows the SQS-to-consumer edge with a histogram of how old events were when consumers received them.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-tracelinking.html", "https://docs.aws.amazon.com/xray/latest/devguide/xray-services-sqs.html"] },

  { id: "saa-2-203", exam: "SAA", saa: "2.2", topic: "xray", type: "multi", hint: "Select TWO.",
    q: "A company runs Java microservices on Amazon EC2 instances and already runs the CloudWatch agent on every instance for metrics and logs. It now needs distributed traces in AWS X-Ray to find which service slows requests down. It wants to avoid instrumentation libraries that are in maintenance mode, and to keep the number of agents it manages low. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Instrument the services with the AWS Distro for OpenTelemetry Java agent, so they emit OpenTelemetry traces.", ok: true },
      { t: "Add a traces section to the existing CloudWatch agent configuration, so it collects the traces and sends them to X-Ray.", ok: true },
      { t: "Install the X-Ray daemon on each instance, and instrument the services with the AWS X-Ray SDK for Java.", ok: false, no: "The X-Ray SDKs and daemon are in maintenance mode, and the daemon is one more agent to run on every instance." },
      { t: "Turn on a CloudTrail trail for the account, and query each service's request times with CloudTrail Lake.", ok: false, no: "CloudTrail records AWS API activity, not requests that pass between the company's own services." },
      { t: "Turn on EC2 detailed monitoring, and compare 1-minute CPU and network metrics to find the slowest service.", ok: false, no: "Instance metrics show load, not where a single request spends its time as it moves across services." }
    ],
    why: "AWS recommends OpenTelemetry for X-Ray instrumentation now that the X-Ray SDKs and daemon are in maintenance mode. Current versions of the CloudWatch agent can collect OpenTelemetry traces and send them to X-Ray, so no separate collector is needed.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-instrumenting-your-app.html", "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html"] },

  // Task 2.1 / 2.2: API Gateway in resilient designs
  { id: "saa-2-204", exam: "SAA", saa: "2.1", topic: "apigateway", type: "mc",
    q: "A REST API in API Gateway in us-east-1 is called mostly by the company's own services on EC2 instances in us-east-1, at a high and steady rate. One partner in the same city also calls it over the internet. The API was created with the default endpoint type, and the team wants to cut the connection overhead on each call. Which solution meets these requirements?",
    opts: [
      "Change the API's endpoint type to Regional, so clients in the Region connect to it without going through CloudFront.",
      "Change the API's endpoint type to private, and have every client call it through an interface VPC endpoint in a VPC.",
      "Keep the edge-optimized endpoint, and turn on API caching on the stage so repeated calls are answered faster.",
      "Put an AWS Global Accelerator in front of the edge-optimized API, so traffic enters the AWS network sooner."
    ], a: 0,
    no: [null,
      "A private API can be reached only from VPCs through interface endpoints, so the partner on the internet couldn't call it.",
      "Caching helps only repeated identical reads, and every call from the Region still goes through a CloudFront edge first.",
      "Global Accelerator endpoints are load balancers, EC2 instances and Elastic IP addresses, not API Gateway APIs."],
    why: "Edge-optimized, the default for REST APIs, routes requests through the nearest CloudFront point of presence, which helps clients spread around the world. A Regional endpoint is meant for clients in the same Region, such as EC2 instances there, and reduces connection overhead.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-endpoint-types.html"] },

  { id: "saa-2-205", exam: "SAA", saa: "2.2", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A company deploys the same REST API with API Gateway in us-east-1 and us-west-2. Clients must keep calling https://api.example.com, and if the us-east-1 API stops responding, Route 53 must send clients to us-west-2 automatically. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Make both APIs Regional, and create the Regional custom domain api.example.com in each Region with that Region's ACM certificate.", ok: true },
      { t: "Create failover alias records for api.example.com that point to each Region's custom domain, with a health check on the primary.", ok: true },
      { t: "Make both APIs edge-optimized, and create the edge-optimized custom domain api.example.com for the API in each Region.", ok: false, no: "An edge-optimized custom domain name applies across all Regions; serving one name from an API in each Region uses Regional custom domains." },
      { t: "Request one ACM certificate in us-east-1, and attach it to the Regional custom domains in both of the Regions.", ok: false, no: "A Regional custom domain needs an ACM certificate in the same Region as the API, so us-west-2 needs its own." },
      { t: "Create an AWS Global Accelerator with an endpoint group in each Region that points to that Region's API.", ok: false, no: "Global Accelerator endpoints are load balancers, EC2 instances and Elastic IP addresses; an API Gateway API can't be one." }
    ],
    why: "A Regional API deployed in several Regions can have the same custom domain name in each, using a certificate from that Region. Route 53 failover records with a health check on the primary move the name to the secondary Region when the primary fails.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-endpoint-types.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html"] },

  { id: "saa-2-206", exam: "SAA", saa: "2.2", topic: "apigateway", type: "mc",
    q: "One AWS account hosts a public catalog API and a checkout API, both REST APIs in API Gateway in the same Region. When scrapers flood the catalog API, checkout calls start failing with 429 Too Many Requests errors, although the checkout backend is idle. The company wants checkout to keep working during catalog floods. What should a solutions architect do?",
    opts: [
      "Set stage-level throttling on the catalog API's stage, well below the account-level limit for the Region.",
      "Set reserved concurrency on the checkout API's Lambda function, so that capacity is always left for checkout.",
      "Turn on API caching on the checkout API's stage, so that fewer of its requests have to reach the backend.",
      "Create a usage plan for the checkout API with a high rate limit, and give each checkout client an API key."
    ], a: 0,
    no: [null,
      "The 429 errors come from API Gateway throttling before Lambda is invoked, so reserving function concurrency doesn't help.",
      "The backend isn't the bottleneck; checkout requests are throttled by the account-level limit that both APIs share.",
      "Usage plan limits can't exceed the account-level limit and don't reserve any of it, so catalog floods still use it up."],
    why: "API Gateway throttles the steady-state rate and burst across all APIs in an account per Region, so one busy API can starve the others. A stage-level throttle on the catalog API caps its share and leaves room for checkout.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html"] },

  // Task 2.1: multi-tier designs
  { id: "saa-2-207", exam: "SAA", saa: "2.1", topic: "elb", type: "multi", hint: "Select TWO.",
    q: "In a three-tier app, web servers in public subnets call application servers in private subnets using a hard-coded list of IP addresses. When an application server fails, requests sent to it fail until someone edits the list, and the application tier can't scale out. The application tier must stay private. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Run the application servers in an Auto Scaling group that spans private subnets in at least two Availability Zones.", ok: true },
      { t: "Put an internal Application Load Balancer in front of the application tier, and point the web servers at its DNS name.", ok: true },
      { t: "Put an internet-facing Application Load Balancer in front of the application tier, in the public subnets.", ok: false, no: "An internet-facing load balancer exposes the application tier to the internet, which breaks the requirement to keep it private." },
      { t: "Assign an Elastic IP address to each application server, and update the web servers' list with those addresses.", ok: false, no: "The list still has to be edited by hand for every new or failed server, so nothing scales or fails over on its own." },
      { t: "Move the application tier to one larger EC2 instance type, and turn on EC2 automatic recovery for it.", ok: false, no: "One instance is still a single point of failure in one AZ, and scaling up has a ceiling." }
    ],
    why: "An internal load balancer has only private IP addresses and sends the web tier's requests to healthy application servers. With an Auto Scaling group attached, servers are added, replaced and registered automatically, so each tier scales on its own.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/userguide/how-elastic-load-balancing-works.html", "https://docs.aws.amazon.com/autoscaling/ec2/userguide/autoscaling-load-balancer.html"] },

  { id: "saa-2-208", exam: "SAA", saa: "2.1", topic: "serverless", type: "mc",
    q: "A company is rebuilding a three-tier web app whose traffic is close to zero at night and spikes during the day. Each tier must scale on its own, the company doesn't want to manage servers or choose instance sizes for any tier, and compute should cost little while the app is idle. Which architecture meets these requirements?",
    opts: [
      "Serve the front end from S3 through CloudFront, run the logic in Lambda behind API Gateway, and keep data in DynamoDB.",
      "Serve the front end from S3 through CloudFront, run the logic on Elastic Beanstalk, and keep data in Aurora MySQL.",
      "Serve the front end and the logic from EC2 instances in an Auto Scaling group, and keep data in RDS Multi-AZ.",
      "Serve the front end from S3 through CloudFront, run the logic as ECS tasks on EC2 capacity, and keep data in DynamoDB."
    ], a: 0,
    no: [null,
      "Elastic Beanstalk runs EC2 instances, and provisioned Aurora uses DB instances, so the company still picks instance sizes.",
      "Instances and DB instances must be sized and managed, and they keep running and costing money at night.",
      "ECS on EC2 capacity means sizing and managing the cluster's EC2 instances, which the company wants to avoid."],
    why: "S3 with CloudFront, API Gateway with Lambda, and DynamoDB are managed services that scale each tier separately with no servers to size. Lambda and API Gateway charge per request, so idle periods cost little.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/welcome.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html"] },

  // Task 2.2: RDS Proxy, legacy apps
  { id: "saa-2-209", exam: "SAA", saa: "2.2", topic: "rds", type: "multi", hint: "Select TWO.",
    q: "A Lambda-based API uses an Aurora MySQL cluster with one writer and two Aurora Replicas. During traffic spikes, thousands of new connections hit the writer, which runs out of connections while the replicas sit almost idle. The team wants connections pooled and read-only queries sent to the replicas, changing only the endpoints in its configuration. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Create an RDS Proxy for the cluster, and point the functions' read/write connections at the proxy's default endpoint.", ok: true },
      { t: "Add a read-only endpoint to the proxy, and point the functions' read-only connections at that proxy endpoint.", ok: true },
      { t: "Point the functions' read-only connections straight at the cluster's reader endpoint, with no proxy in between.", ok: false, no: "Reads move to the replicas, but each spike still opens thousands of unpooled connections to them." },
      { t: "Modify the writer to a larger DB instance class, so that its max_connections value is higher during spikes.", ok: false, no: "A bigger writer raises the ceiling but doesn't pool connections or move any reads to the replicas." },
      { t: "Add an ElastiCache cluster, and have the functions cache query results before they connect to the database.", ok: false, no: "Caching needs code changes and does nothing for the storm of new connections that writes still cause." }
    ],
    why: "RDS Proxy keeps a pool of database connections and shares them among many short-lived Lambda connections. Its default endpoint sends traffic to the writer, and a read-only proxy endpoint spreads read queries across the Aurora Replicas.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-endpoints.html", "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy.html"] },

  { id: "saa-2-210", exam: "SAA", saa: "2.2", topic: "efs", type: "multi", hint: "Select TWO.",
    q: "A legacy web app runs on one EC2 instance in one Availability Zone and saves user uploads under /var/app/uploads on its EBS volume. It keeps no other state on the instance. The vendor no longer supports the app, so its code can't be changed. The company wants the app to survive the loss of an instance or of an Availability Zone. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Run the app from an AMI in an Auto Scaling group across two Availability Zones, behind an Application Load Balancer.", ok: true },
      { t: "Create an Amazon EFS file system, and mount it at /var/app/uploads on every instance when the instance launches.", ok: true },
      { t: "Attach one io2 EBS volume to all of the instances with Multi-Attach, and mount it at /var/app/uploads on each.", ok: false, no: "Multi-Attach works only for instances in the same Availability Zone, and it needs a cluster-aware file system." },
      { t: "Move the app to a larger instance type, and turn on EC2 automatic recovery for that one instance.", ok: false, no: "One instance in one AZ is still a single point of failure, and recovery doesn't help when the AZ is lost." },
      { t: "Change the app to write uploads to an S3 bucket, and serve the uploaded files from the bucket through CloudFront.", ok: false, no: "This needs a code change, which the company can't make." }
    ],
    why: "Copies of the app behind a load balancer in a multi-AZ Auto Scaling group remove the single instance. EFS is a shared NFS file system that every instance mounts at the same path, so uploads are visible everywhere without code changes.",
    doc: ["https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html", "https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes-multi.html"] },

  { id: "saa-2-211", exam: "SAA", saa: "2.1", topic: "elb", type: "mc",
    q: "A vendor web app keeps each user's login session in the memory of the server that signed the user in, and the app doesn't set its own session cookie. The company is moving it from one EC2 instance to three instances behind an Application Load Balancer, and it can't change the app. Users must not be signed out as they click through the site. What should a solutions architect do?",
    opts: [
      "Turn on duration-based stickiness on the target group, so a load balancer cookie keeps each user on one instance.",
      "Change the target group's routing algorithm to least outstanding requests, so users go to the least busy instance.",
      "Raise the target group's deregistration delay, so that instances keep their sessions longer while serving requests.",
      "Store the sessions in an ElastiCache for Redis cluster that all three instances read from and write to."
    ], a: 0,
    no: [null,
      "This algorithm still picks a target for each request by load, so one user's requests keep moving between instances.",
      "Deregistration delay only lets in-flight requests finish on a target being removed; it doesn't tie users to targets.",
      "An external session store is the better long-term design, but it requires changing the app, which isn't allowed."],
    why: "Sticky sessions bind a user's session to one target. Duration-based stickiness uses a cookie that the load balancer generates (AWSALB), so it works for apps that don't issue their own session cookie.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html"] },

  // Task 2.2: backups, migration and disaster recovery
  { id: "saa-2-212", exam: "SAA", saa: "2.2", topic: "backup", type: "mc",
    q: "A company protects EBS volumes, RDS databases, EFS file systems and DynamoDB tables in us-east-1 with a mix of scripts and per-service settings. It wants one central policy that backs up every resource tagged backup=daily each day, keeps each backup for 35 days, and keeps a copy in us-west-2 in case us-east-1 is lost. Which solution meets these requirements?",
    opts: [
      "Create an AWS Backup plan with a daily rule, tag-based resource assignment, and a copy action to a us-west-2 vault.",
      "Create Amazon Data Lifecycle Manager policies that target the backup=daily tag, each with a cross-Region copy rule to us-west-2.",
      "Turn on point-in-time recovery for the tables, and replicate the RDS automated backups to us-west-2.",
      "Turn on S3 Cross-Region Replication for the buckets in which AWS services store their snapshots and backups."
    ], a: 0,
    no: [null,
      "Data Lifecycle Manager manages only EBS snapshots and EBS-backed AMIs, so the RDS, EFS and DynamoDB data isn't covered.",
      "These are separate per-service settings, they leave out EBS and EFS, and DynamoDB point-in-time recovery stays in the table's Region.",
      "Snapshots and backups aren't kept in buckets that the company can configure, so there's nothing to replicate."],
    why: "An AWS Backup plan sets the backup frequency and retention, selects resources by tag across supported services, and can copy each recovery point to a vault in another Region automatically.",
    doc: ["https://docs.aws.amazon.com/aws-backup/latest/devguide/cross-region-backup.html", "https://docs.aws.amazon.com/ebs/latest/userguide/snapshot-lifecycle.html"] },

  { id: "saa-2-213", exam: "SAA", saa: "2.2", topic: "backup", type: "mc",
    q: "A company has 60 accounts in AWS Organizations. Tagged resources, including RDS databases and DynamoDB tables, must be backed up daily in production accounts and weekly in development accounts. Administrators in member accounts must not be able to change or remove these backup plans, and a central team wants one place to monitor backup jobs in all accounts. Which solution meets these requirements?",
    opts: [
      "Turn on AWS Backup cross-account management, and attach backup policies to the production and development OUs.",
      "Deploy an AWS Backup plan to every account with CloudFormation StackSets from the organization's management account.",
      "Create an AWS Config rule in every account that flags resources without a recent backup, and alert the central team.",
      "Create Amazon Data Lifecycle Manager policies in every account that target the tagged resources on each schedule."
    ], a: 0,
    no: [null,
      "Plans created in each account this way can still be edited or deleted by that account's administrators.",
      "A Config rule only detects missing backups; it doesn't create or enforce any backup schedule.",
      "Data Lifecycle Manager covers only EBS snapshots and EBS-backed AMIs, so the databases and tables wouldn't be backed up."],
    why: "Backup policies attached to OUs give each account an effective backup plan that appears there as an immutable plan: member accounts can view it but not change it. Cross-account management also lets the central team monitor backup jobs across all accounts.",
    doc: ["https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_backup.html", "https://docs.aws.amazon.com/aws-backup/latest/devguide/manage-cross-account.html"] },

  { id: "saa-2-214", exam: "SAA", saa: "2.2", topic: "mgn", type: "mc",
    q: "A company must move 150 Windows and Linux servers, a mix of physical machines and VMware virtual machines, from its data center to Amazon EC2. The applications can't be changed, each cutover may cause only minutes of downtime, and every server must be test-launched on AWS before its cutover. Which solution meets these requirements?",
    opts: [
      "Use AWS Application Migration Service for continuous replication, launch test instances, then cutover instances.",
      "Export each virtual machine as an image, import the images with VM Import/Export as AMIs, and launch instances from them.",
      "Use AWS DMS with ongoing replication to copy each server to EC2, and then switch DNS to the new servers at cutover.",
      "Use AWS DataSync to copy each server's files to Amazon EFS, and mount them on new EC2 instances at cutover."
    ], a: 0,
    no: [null,
      "Image import is a one-time copy with no continuous replication, so cutover downtime is long, and it doesn't cover the physical servers.",
      "DMS migrates databases, not whole servers with their operating systems and installed applications.",
      "DataSync copies files, not bootable servers, so every application would have to be reinstalled on the new instances."],
    why: "Application Migration Service (now named AWS Transform MGN) replicates source servers continuously at the block level and converts them to run natively on EC2. You launch test instances first and cutover instances last, so cutover windows are typically minutes.",
    doc: ["https://docs.aws.amazon.com/mgn/latest/ug/what-is-mgn.html", "https://docs.aws.amazon.com/mgn/latest/ug/quick-start-guide-gs.html"] },

  { id: "saa-2-215", exam: "SAA", saa: "2.2", topic: "mgn", type: "multi", hint: "Select TWO.",
    q: "A company is moving a three-tier app to AWS. The two application servers must move as they are, with nothing reinstalled. The 2 TB Oracle database must move to Amazon RDS for Oracle, so that AWS manages backups and Multi-AZ failover. The app can be offline for only a few minutes during the switch. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Replicate the application servers with AWS Application Migration Service, and launch them on EC2 at cutover.", ok: true },
      { t: "Use AWS DMS with a full load and ongoing replication into RDS for Oracle, and switch to it at cutover.", ok: true },
      { t: "Replicate the database server with AWS Application Migration Service, and launch it as an RDS for Oracle DB instance.", ok: false, no: "Application Migration Service launches EC2 instances, not RDS DB instances." },
      { t: "Export the database with Oracle Data Pump during the switch, upload the files to S3, and import them into RDS.", ok: false, no: "A one-time export and import of 2 TB keeps the app offline for far longer than a few minutes." },
      { t: "Build new application servers from fresh AMIs, and copy the app's files onto them with AWS DataSync.", ok: false, no: "That means reinstalling and configuring the servers, which the company wants to avoid." }
    ],
    why: "Application Migration Service rehosts whole servers onto EC2 with continuous replication. DMS loads the existing data and then applies ongoing changes (change data capture), so RDS stays in sync until the short cutover.",
    doc: ["https://docs.aws.amazon.com/mgn/latest/ug/what-is-mgn.html", "https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html"] },

  { id: "saa-2-216", exam: "SAA", saa: "2.2", topic: "drs", type: "mc",
    q: "A company runs several applications on EC2 instances in us-east-1, including a self-managed SQL Server database on EC2. It needs recovery in us-east-2 with continuous replication and a recovery time of minutes, but it doesn't want to run full-size servers in us-east-2 until a disaster. It must also run recovery drills without disrupting production. Which solution meets these requirements MOST cost-effectively?",
    opts: [
      "Use AWS Elastic Disaster Recovery to replicate the instances to us-east-2, and launch recovery instances for drills or failover.",
      "Use AWS Backup to copy hourly EC2 backups to us-east-2, and restore instances from the latest copy after a disaster.",
      "Run a full-size copy of every instance in us-east-2, and replicate the database with SQL Server Always On.",
      "Copy AMIs of the instances to us-east-2 every night, and launch them from a CloudFormation template after a disaster."
    ], a: 0,
    no: [null,
      "Hourly copies aren't continuous replication and can lose up to an hour of data, and restoring every instance takes longer.",
      "This meets the recovery goals but keeps full-size servers running all the time, which the company wants to avoid.",
      "Nightly AMIs can lose up to a day of data, far from continuous replication."],
    why: "Elastic Disaster Recovery replicates EC2-hosted applications and databases at the block level into a low-cost staging area in another Region, launches full recovery instances within minutes, and supports non-disruptive drills and cross-Region failback.",
    doc: ["https://docs.aws.amazon.com/drs/latest/userguide/failback-failover-region-region.html", "https://docs.aws.amazon.com/drs/latest/userguide/what-is-drs.html"] },

  // Task 2.2: Route 53 routing and health checks
  { id: "saa-2-217", exam: "SAA", saa: "2.2", topic: "route53", type: "multi", hint: "Select TWO.",
    q: "A company rebuilt its web app on a new stack behind a second Application Load Balancer in the same Region. It wants Route 53 to send 10 percent of the users of www.example.com to the new stack, raise that share step by step, and stop sending users to a stack whenever its load balancer has no healthy targets. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Create two weighted alias records for www.example.com, one for each load balancer, with weights of 90 and 10.", ok: true },
      { t: "Set Evaluate Target Health to Yes on both weighted alias records, and raise the new stack's weight over time.", ok: true },
      { t: "Create a failover primary record for the old load balancer and a failover secondary record for the new one.", ok: false, no: "Failover routing sends all traffic to one record at a time, so it can't split users by percentage." },
      { t: "Create a latency record for each load balancer, and add instances to the new stack to lower its latency.", ok: false, no: "Latency routing chooses by network latency to a Region, not by a share of traffic, and both stacks are in one Region." },
      { t: "Create one multivalue answer record that lists both load balancers' IP addresses, with a health check on each.", ok: false, no: "Multivalue answers return healthy addresses at random with no set share, and load balancer IP addresses change." }
    ],
    why: "Weighted records send traffic in proportion to each record's weight out of the total, so 90 and 10 sends about 10 percent to the new stack, and changing the weights shifts traffic gradually. With Evaluate Target Health, Route 53 skips an alias record whose load balancer has no healthy targets.",
    doc: ["https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html", "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-values-weighted-alias.html"] },

  { id: "saa-2-218", exam: "SAA", saa: "2.2", topic: "route53", type: "mc",
    q: "A company serves users worldwide from deployments in us-east-1 and eu-west-1, and Route 53 sends each user to the closer one. The us-east-1 deployment has much more capacity, so the company wants it to also serve users who live near the edge of the area that eu-west-1 serves. It doesn't want to maintain lists of countries for this. Which Route 53 configuration meets these requirements?",
    opts: [
      "Use geoproximity routing with a record for each Region, and give the us-east-1 record a positive bias value.",
      "Use latency routing with a record for each Region, and add instances in us-east-1 so that it answers faster.",
      "Use weighted routing with a record for each Region, with a weight of 70 for us-east-1 and 30 for eu-west-1.",
      "Use geolocation routing with a record for each country, and move border countries to us-east-1 as needed."
    ], a: 0,
    no: [null,
      "Latency routing follows measured network latency between users and Regions, which adding instances doesn't change.",
      "Weights ignore where users are, so some users right next to eu-west-1 would be sent across the ocean.",
      "Geolocation works from fixed country and continent lists, which is the list upkeep the company wants to avoid."],
    why: "Geoproximity routing sends users to the nearest resource by geographic distance. A positive bias expands the area a resource serves and shrinks its neighbors' areas, so users near the boundary move to the larger deployment.",
    doc: ["https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geoproximity.html"] },

  { id: "saa-2-219", exam: "SAA", saa: "2.2", topic: "route53", type: "mc",
    q: "An internal service runs on a primary EC2 instance and a standby EC2 instance in different Availability Zones. Clients find it through failover records in a Route 53 private hosted zone. The instances have only private IP addresses, and company policy forbids public IP addresses on them. Route 53 must fail over to the standby when the primary's status checks fail. What should a solutions architect do?",
    opts: [
      "Create a CloudWatch alarm on the primary's StatusCheckFailed metric, and a Route 53 health check that monitors the alarm.",
      "Create a Route 53 endpoint health check that tests the primary's private IP address on the service's port.",
      "Set Evaluate Target Health to Yes on the primary failover record, which is an A record with the instance's IP.",
      "Create a calculated health check for the primary that combines the results of the instance's two status checks."
    ], a: 0,
    no: [null,
      "Route 53 health checkers run outside the VPC, so they can't reach an instance by its private IP address.",
      "Evaluate Target Health applies to alias records, and an instance's IP address can't be an alias target.",
      "A calculated health check combines other Route 53 health checks; it can't read EC2 status checks directly."],
    why: "For instances that have only private IP addresses, Route 53 can base a health check on the data stream of a CloudWatch alarm, such as one on StatusCheckFailed. The primary failover record uses that health check to decide when to answer with the standby.",
    doc: ["https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-private-hosted-zones.html", "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-types.html"] },

  // Task 2.1: managed services, containers, scaling
  { id: "saa-2-220", exam: "SAA", saa: "2.1", topic: "mq", type: "mc",
    q: "A company's services exchange messages through a self-managed RabbitMQ server, using AMQP 0-9-1 client libraries. The company is moving them to AWS and wants a managed broker that keeps working if an Availability Zone fails, without rewriting the services' messaging code. Which solution meets these requirements?",
    opts: [
      "Create an Amazon MQ for RabbitMQ cluster deployment, and point the services at the broker's endpoint.",
      "Create an Amazon MQ for RabbitMQ single-instance broker, and point the services at the broker's endpoint.",
      "Create an Amazon SQS queue for each RabbitMQ queue, and send and receive messages with the SQS API.",
      "Create an Amazon MSK cluster across three Availability Zones, and map each RabbitMQ queue to a Kafka topic."
    ], a: 0,
    no: [null,
      "A single-instance broker runs in one Availability Zone, so an AZ failure takes the broker down.",
      "SQS has its own API, so every service's messaging code would have to be rewritten.",
      "MSK speaks the Kafka protocol, not AMQP, so the services would need new client code."],
    why: "Amazon MQ runs managed RabbitMQ brokers that accept AMQP 0-9-1 connections. A cluster deployment is three broker nodes spread across multiple Availability Zones behind one endpoint, so it keeps serving if one AZ fails.",
    doc: ["https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/rabbitmq-broker-architecture.html"] },

  { id: "saa-2-221", exam: "SAA", saa: "2.1", topic: "transfer", type: "mc",
    q: "Partners upload files over SFTP to a company's Amazon S3 data lake. Each partner's firewall allows outbound connections only to IP addresses it has approved, and the company must accept connections only from the partners' known IP ranges. The service must keep working if an Availability Zone fails, and the company doesn't want to manage servers. Which solution meets these requirements?",
    opts: [
      "Create a Transfer Family SFTP server with an internet-facing VPC endpoint in two AZs, Elastic IPs, and a security group.",
      "Create a Transfer Family SFTP server with a publicly accessible endpoint, and attach a security group for partner ranges.",
      "Run an SFTP server on an EC2 instance with an Elastic IP address, and sync its upload folder to S3 every few minutes.",
      "Give each partner presigned S3 URLs, and add a bucket policy that allows uploads only from the partners' IP ranges."
    ], a: 0,
    no: [null,
      "Public endpoints can't restrict traffic with security groups, so the company couldn't limit access to partner ranges.",
      "A single instance is a server to manage, and it fails along with its Availability Zone.",
      "Partners connect with SFTP clients, which can't upload through presigned S3 URLs."],
    why: "A VPC-hosted, internet-facing Transfer Family endpoint takes an Elastic IP address in each chosen subnet, which partners can allow in their firewalls, and its security groups admit only allowed source addresses. Subnets in up to three AZs keep it available.",
    doc: ["https://docs.aws.amazon.com/transfer/latest/userguide/create-server-in-vpc.html", "https://docs.aws.amazon.com/transfer/latest/userguide/create-server-sftp.html"] },

  { id: "saa-2-222", exam: "SAA", saa: "2.1", topic: "rds", type: "mc",
    q: "An order database on RDS for PostgreSQL runs above 90 percent CPU during the day, and Performance Insights shows that the load comes from INSERT and UPDATE statements. Two read replicas already serve all of the reporting queries. The company needs more capacity for writes within a week, with no application changes. Which solution meets these requirements?",
    opts: [
      "Modify the DB instance to a larger instance class with more vCPUs, and apply the change in a maintenance window.",
      "Add a third read replica, and point part of the application's database traffic at the new replica's endpoint.",
      "Convert the DB instance to a Multi-AZ deployment, so that the standby instance shares the write workload.",
      "Add an ElastiCache cluster in front of the database, and cache the results of the most frequent queries."
    ], a: 0,
    no: [null,
      "Read replicas accept only read-only connections, so they can't take any of the INSERT and UPDATE load.",
      "The standby in a Multi-AZ DB instance deployment is for failover and doesn't serve the application's traffic.",
      "Caching offloads repeated reads, not writes, and it needs application changes."],
    why: "All writes go to the primary, so scaling out with replicas can't relieve a write-bound database. Scaling up to a larger instance class adds CPU and memory without application changes.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.DBInstance.Modifying.html", "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html"] },

  { id: "saa-2-223", exam: "SAA", saa: "2.1", topic: "ecs", type: "mc",
    q: "A company is moving a Linux content-management app into containers on Amazon ECS with AWS Fargate. The app reads and writes media files in a local directory, and several tasks spread across two Availability Zones must see the same files. The files must survive when tasks are replaced, and the app's code can't change. Which solution meets these requirements?",
    opts: [
      "Create an Amazon EFS file system, and add it as a volume in the task definition, mounted at the media directory.",
      "Raise each task's ephemeral storage to 200 GiB, and mount it at the app's media directory in the task definition.",
      "Configure the service to attach an Amazon EBS volume to each task, and mount it at the app's media directory.",
      "Change the app to store its media files in an S3 bucket, and grant the task role access to that bucket."
    ], a: 0,
    no: [null,
      "Ephemeral storage belongs to a single task and is deleted when the task stops, so tasks can't share it.",
      "ECS attaches one EBS volume per task, so each task would see only its own files.",
      "This needs code changes, which aren't allowed."],
    why: "Fargate tasks on platform version 1.4.0 or later can mount EFS volumes, and many tasks in different Availability Zones can use the same file system at once, so the files are shared and persist after tasks are replaced.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html", "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ebs-volumes.html"] },

  // Task 2.2: container resilience
  { id: "saa-2-224", exam: "SAA", saa: "2.2", topic: "ecs", type: "mc",
    q: "An Amazon ECS service runs 9 tasks on EC2 container instances from an Auto Scaling group that spans three Availability Zones. To save money, the service's placement strategy was changed to binpack on memory. During an Availability Zone outage, most tasks stopped at once because they had been packed onto instances in that zone. The company wants tasks balanced across zones while still using instances efficiently. What should a solutions architect do?",
    opts: [
      "Set the placement strategy to spread on attribute:ecs.availability-zone first, followed by binpack on memory.",
      "Add a distinctInstance placement constraint, so that no two of the service's tasks share an instance.",
      "Change the placement strategy to random, so that tasks land on instances in different zones by chance.",
      "Raise the service's desired count to 18 tasks, and keep the binpack on memory placement strategy."
    ], a: 0,
    no: [null,
      "Putting each task on its own instance uses more instances, and it still doesn't balance tasks across zones.",
      "Random placement doesn't guarantee an even spread across Availability Zones.",
      "Binpack still fills as few instances as possible, so many tasks can end up in one zone again."],
    why: "Placement strategies are applied in order: spreading on the Availability Zone attribute balances tasks across zones, and binpack within each zone keeps instance use low. Services spread across zones by default, and binpack alone had replaced that.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-placement-strategies.html"] },

  { id: "saa-2-225", exam: "SAA", saa: "2.2", topic: "eks", type: "multi", hint: "Select TWO.",
    q: "A company runs a web app on Amazon EKS. Its only managed node group was created with subnets in a single Availability Zone, and the app's Deployment runs 6 replicas. An outage in that zone took the app down. The company wants the app to keep serving if any one Availability Zone fails. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Create a managed node group with subnets in three Availability Zones, and move the workloads onto it.", ok: true },
      { t: "Add a topology spread constraint on topology.kubernetes.io/zone to the Deployment's pod template.", ok: true },
      { t: "Create a second EKS control plane in another Availability Zone, and register the nodes with both.", ok: false, no: "EKS already runs the control plane across multiple AZs; the outage hit the worker nodes." },
      { t: "Raise the Deployment to 12 replicas, so that enough pods remain running if some of them fail.", ok: false, no: "Every node is in one zone, so all 12 replicas would still go down with it." },
      { t: "Add a Horizontal Pod Autoscaler that scales the Deployment based on average CPU utilization.", ok: false, no: "The autoscaler changes how many pods run, not where they run, so they'd still sit in one zone." }
    ],
    why: "A managed node group's Auto Scaling group spans the subnets you give it, so nodes exist in every zone. A topology spread constraint on the zone key then tells the scheduler to spread the replicas across those zones.",
    doc: ["https://docs.aws.amazon.com/eks/latest/userguide/managed-node-groups.html", "https://docs.aws.amazon.com/eks/latest/best-practices/data-plane.html"] }
);
