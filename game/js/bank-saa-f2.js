// Question bank batch: SAA "at least 3" round, part f2: database proxies and read replicas for cost, NAT gateway vs
// NAT instance cost, shared vs per-AZ NAT, throttling, bandwidth sizing, and the services AWS Trusted Advisor,
// AWS Well-Architected Tool, AWS License Manager and AWS Auto Scaling (scaling plans). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Domain 3: Design High-Performing Architectures
  { id: "saa-3-431", exam: "SAA", saa: "3.2", topic: "autoscaling", type: "mc",
    q: "A company created an AWS Auto Scaling scaling plan years ago and uses it only for predictive scaling of one EC2 Auto Scaling group. The team now wants to build the load metric from a metric math aggregation of several custom metrics, and to keep the forecast's history across blue/green deployments that replace the group. What should a solutions architect do?",
    opts: [
      "Create a predictive scaling policy directly on the Auto Scaling group, review its forecast, and then delete the scaling plan.",
      "Change the scaling plan to a custom scaling strategy, and enter the custom metrics as the plan's predictive load metric.",
      "Replace the scaling plan with recurring scheduled actions on the Auto Scaling group that copy the plan's most recent forecast.",
      "Register the Auto Scaling group with Application Auto Scaling, and add a predictive scaling policy for it in that service."
    ],
    a: 0,
    no: [null,
      "A scaling plan's custom strategy lets you pick a metric and target, but metric aggregations and keeping history across blue/green deployments come only with predictive scaling policies set on the group itself.",
      "Fixed scheduled actions stop following the load as it changes, and they don't build a load metric from several custom metrics.",
      "EC2 Auto Scaling groups are scaled by Amazon EC2 Auto Scaling. Application Auto Scaling handles other resources, such as ECS services and DynamoDB tables."],
    why: "AWS strongly recommends that teams who use a scaling plan only for predictive scaling set predictive scaling policies directly on the Auto Scaling group, which add features such as metric aggregations and keeping historical data across blue/green deployments. AWS's migration guide says to create the policies and review their forecasts before deleting the plan.",
    doc: ["https://docs.aws.amazon.com/autoscaling/plans/userguide/what-is-a-scaling-plan.html", "https://docs.aws.amazon.com/autoscaling/plans/userguide/migrate-scaling-plan.html"] },

  { id: "saa-3-432", exam: "SAA", saa: "3.2", topic: "autoscaling", type: "multi", hint: "Select TWO.",
    q: "One CloudFormation stack defines an order app's Auto Scaling group, its ECS cluster and service, and two provisioned DynamoDB tables. None of them scale today. The company wants all of them to scale from one place: the group and the ECS service at 60 percent average CPU, and the tables at 60 percent of their provisioned capacity. Which steps meet these requirements with the LEAST operational overhead? (Select TWO.)",
    items: [
      { t: "Create an AWS Auto Scaling scaling plan that finds the app's scalable resources by searching its CloudFormation stack.", ok: true },
      { t: "In the plan, choose a custom scaling strategy for each resource type, with a target utilization value of 60 percent.", ok: true },
      { t: "In the plan, choose the Optimize for cost strategy for every resource type, so each one is kept at 60 percent.", ok: false, no: "Optimize for cost keeps utilization at 70 percent, not 60. The preset strategies use 40, 50 and 70 percent." },
      { t: "Create the plan by searching on a shared app=orders tag, so the plan finds every resource that carries the tag.", ok: false, no: "Tag search finds Auto Scaling groups, DynamoDB tables and indexes, and Aurora clusters, not ECS services, so the service would be left out." },
      { t: "Turn on predictive scaling for every resource in the plan, so the tables and the ECS service scale ahead of daily peaks.", ok: false, no: "In a scaling plan, predictive scaling applies only to Auto Scaling groups. The other resources use dynamic scaling." }
    ],
    why: "A scaling plan can discover every scalable resource in a CloudFormation stack, including an ECS service when its cluster is in the same stack, and set target tracking for all of them at once. A custom strategy lets you set your own target value when the preset ones (40, 50 or 70 percent) don't fit.",
    doc: ["https://docs.aws.amazon.com/autoscaling/plans/userguide/gs-select-application.html", "https://docs.aws.amazon.com/autoscaling/plans/userguide/gs-configure-scaling-plan.html"] },

  // Domain 4: Design Cost-Optimized Architectures
  { id: "saa-4-431", exam: "SAA", saa: "4.2", topic: "autoscaling", type: "mc",
    q: "A company's test environment has Auto Scaling groups, provisioned DynamoDB tables and Aurora clusters spread across dozens of CloudFormation stacks, all tagged env=test. Each is sized for peak load and runs mostly idle. Test workloads can tolerate little spare capacity, so the company wants each resource kept near 70 percent utilization. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Create an AWS Auto Scaling scaling plan that finds the resources by the env=test tag, and choose the Optimize for cost strategy.",
      "Create an AWS Auto Scaling scaling plan that searches one of the CloudFormation stacks, and choose the Optimize for availability strategy.",
      "Opt in to AWS Compute Optimizer, and have each team resize its own resources whenever new recommendations appear.",
      "Open each service's console, and create a separate target tracking policy at 70 percent for every resource one by one."
    ],
    a: 0,
    no: [null,
      "A stack search finds only the resources in that one stack, and Optimize for availability keeps utilization at 40 percent, which wastes capacity here.",
      "Compute Optimizer gives rightsizing recommendations. It doesn't scale anything, and acting on them by hand is ongoing work.",
      "This works, but setting up and maintaining dozens of policies by hand is far more effort than one scaling plan."],
    why: "A scaling plan can find related Auto Scaling groups, DynamoDB tables and Aurora clusters by tag, across stacks, and configure scaling for all of them together. The Optimize for cost strategy keeps each resource at about 70 percent utilization.",
    doc: ["https://docs.aws.amazon.com/autoscaling/plans/userguide/gs-select-application.html", "https://docs.aws.amazon.com/autoscaling/plans/userguide/gs-configure-scaling-plan.html"] },

  { id: "saa-4-432", exam: "SAA", saa: "4.2", topic: "trustedadvisor", type: "multi", hint: "Select TWO.",
    q: "A company has 120 accounts in AWS Organizations with all features enabled, and every account has a support plan that includes the full set of Trusted Advisor checks. Finance wants one report from the management account that lists the Trusted Advisor cost optimization and fault tolerance check results for the accounts in its finance OU. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "In the management account's Trusted Advisor console, turn on organizational view, which enables trusted access with Organizations.", ok: true },
      { t: "Create an organizational view report filtered to the cost optimization and fault tolerance categories and the finance OU.", ok: true },
      { t: "Create an AWS Config aggregator in the management account, and run an advanced query across all accounts for idle resources.", ok: false, no: "A Config aggregator collects resource configurations and rule compliance. It doesn't contain Trusted Advisor check results." },
      { t: "Opt in the organization to AWS Compute Optimizer, and export its rightsizing recommendations for every member account to S3.", ok: false, no: "Compute Optimizer covers rightsizing only. It doesn't report Trusted Advisor checks or fault tolerance checks such as backups and Multi-AZ." },
      { t: "Turn on AWS Security Hub CSPM with a delegated administrator, and filter its findings by the cost and fault tolerance categories.", ok: false, no: "Security Hub CSPM gathers security findings and controls. It doesn't report Trusted Advisor cost optimization or fault tolerance checks." }
    ],
    why: "Trusted Advisor organizational view, turned on from the management account, aggregates check results for all member accounts. Its reports can be filtered by Region, check category, checks, resource status and OU.",
    doc: ["https://docs.aws.amazon.com/awssupport/latest/user/organizational-view.html"] },

  { id: "saa-4-433", exam: "SAA", saa: "4.1", topic: "trustedadvisor", type: "multi", hint: "Select TWO.",
    q: "A company's workloads run in ap-southeast-2, and its support plan includes all Trusted Advisor checks. The FinOps team wants a message in its Slack channel whenever a refresh of the Trusted Advisor Underutilized Amazon EBS volumes check reports a warning, so that it can delete or resize those volumes. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create an EventBridge rule in us-east-1 that matches Trusted Advisor Check Item Refresh Status events for that check with the WARN status.", ok: true },
      { t: "Set the rule's target to a Lambda function that posts the check details from each event to the team's Slack channel.", ok: true },
      { t: "Create the EventBridge rule in ap-southeast-2, where the volumes are, so that it receives that Region's Trusted Advisor events.", ok: false, no: "Trusted Advisor is a global service and emits all of its events to EventBridge in US East (N. Virginia) only." },
      { t: "Create a CloudTrail trail with a CloudWatch Logs metric filter that matches the check's results, and alarm on the metric.", ok: false, no: "CloudTrail records API calls. Trusted Advisor check results aren't API calls, so the trail never contains them." },
      { t: "Create an AWS Budgets cost budget for Amazon EBS that sends an alert to the team when EBS spend passes its forecast.", ok: false, no: "A budget alerts on spend. It doesn't know which volumes are underutilized, so it doesn't tell the team what to fix." }
    ],
    why: "EventBridge receives an event when a Trusted Advisor check item's status changes, and a rule can match a specific check and status, such as WARN. Because Trusted Advisor is global, its events arrive only in us-east-1, so the rule must be created there.",
    doc: ["https://docs.aws.amazon.com/awssupport/latest/user/cloudwatch-events-ta.html"] },

  { id: "saa-4-434", exam: "SAA", saa: "4.2", topic: "wellarchitected", type: "multi", hint: "Select TWO.",
    q: "A company's cloud center of excellence has 30 internal cost rules, such as every non-production workload having a documented shutdown schedule and an owner who reviews its commitment coverage each quarter. Teams in 50 accounts in one OU must review their workloads against these rules and the AWS Well-Architected Framework, and leadership wants to see each workload's progress over time. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create a custom lens in the AWS Well-Architected Tool with the rules as questions and best practices, publish it, and share it with the OU.", ok: true },
      { t: "Have each team define its workload in the tool, apply the Framework lens and the custom lens, and save a milestone after each round of fixes.", ok: true },
      { t: "Deploy an AWS Config conformance pack to the OU with a rule for each of the 30 cost rules, and report its compliance score.", ok: false, no: "Config rules evaluate resource settings. They can't tell whether a schedule is documented or whether an owner holds quarterly reviews." },
      { t: "Turn on Trusted Advisor organizational view, and have teams answer the 30 rules in the notes field of its cost checks.", ok: false, no: "Trusted Advisor runs a fixed set of AWS checks. It can't hold custom review questions or track a workload's answers over time." },
      { t: "Enable AWS Control Tower proactive controls on the OU that block CloudFormation resources breaking any of the cost rules.", ok: false, no: "Proactive controls check resources before CloudFormation deploys them. They don't review documented processes or record progress." }
    ],
    why: "A custom lens holds your own pillars, questions and best practices, and can be shared with accounts, an organization or OUs. Workloads apply it alongside AWS lenses, and milestones record each workload's state so progress can be compared over time.",
    doc: ["https://docs.aws.amazon.com/wellarchitected/latest/userguide/lenses-custom.html", "https://docs.aws.amazon.com/wellarchitected/latest/userguide/milestones.html"] },

  { id: "saa-4-435", exam: "SAA", saa: "4.2", topic: "wellarchitected", type: "mc",
    q: "A company reviews 40 workloads a year in the AWS Well-Architected Tool. All of them run in the same landing zone, so many cost optimization and operational excellence questions, such as how tagging and billing are managed, get the same answers every time. Teams in many accounts want each new review to start with those answers already filled in. Which solution meets these requirements with the LEAST effort?",
    opts: [
      "Create a review template with the shared answers, share it with the organization, and have teams define new workloads from it.",
      "Create a profile that describes the landing zone's business context, and attach it to each new workload as teams define it.",
      "Create a custom lens that restates the shared questions, share it with the organization, and apply it to every new workload.",
      "Save a milestone of one fully answered workload, and have each team copy the answers from that milestone's report into its own review."
    ],
    a: 0,
    no: [null,
      "A profile prioritizes which questions matter most for the business. It doesn't pre-fill any answers.",
      "A custom lens adds its own questions, which still start unanswered in each workload, and the Framework questions stay unanswered too.",
      "A milestone records one workload's state at a point in time. Copying its answers by hand is the manual work the teams want to avoid."],
    why: "Review templates hold pre-filled answers and notes for Framework and custom lens questions. They can be shared with accounts, an organization or OUs in the same Region, and a new workload defined from a template starts with those answers in place.",
    doc: ["https://docs.aws.amazon.com/wellarchitected/latest/userguide/review-templates.html", "https://docs.aws.amazon.com/wellarchitected/latest/userguide/define-workload-from-template.html"] },

  { id: "saa-4-436", exam: "SAA", saa: "4.2", topic: "licensemanager", type: "multi", hint: "Select TWO.",
    q: "A company moves Windows Server workloads to EC2 using its own per-core licenses, which its license terms allow only on dedicated physical servers whose cores it can count. Today an admin allocates Dedicated Hosts by hand, and idle hosts are often left running. The company wants hosts allocated and released automatically and core usage tracked. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create a self-managed license in AWS License Manager counted by cores, and associate it with the Windows Server AMI.", ok: true },
      { t: "Create a License Manager host resource group with that license and automatic host allocation and release, and launch into it.", ok: true },
      { t: "Launch the instances as Dedicated Instances, which run on single-tenant hardware without needing any Dedicated Hosts to be managed.", ok: false, no: "Dedicated Instances give no visibility of sockets or physical cores, so per-core licenses can't be counted on them." },
      { t: "Launch the instances from AWS-provided Windows Server AMIs with default tenancy, and stop the instances when idle.", ok: false, no: "AWS-provided Windows AMIs include the Windows license in the price, so the company would pay again for licenses it owns." },
      { t: "Place the instances in a cluster placement group, so EC2 keeps them on as few physical servers as possible.", ok: false, no: "A cluster placement group packs instances for low latency. It gives no dedicated hardware or core counts for licensing." }
    ],
    why: "Dedicated Hosts expose sockets and physical cores for per-core BYOL. A License Manager host resource group launches instances onto hosts that EC2 allocates and releases automatically, and the core-based self-managed license tracks usage.",
    doc: ["https://docs.aws.amazon.com/license-manager/latest/userguide/host-resource-groups.html", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-overview.html"] },

  { id: "saa-4-437", exam: "SAA", saa: "4.2", topic: "licensemanager", type: "mc",
    q: "Twenty EC2 instances launched from AWS-provided Windows Server AMIs run SQL Server Standard, which the company installed from its own media under a license agreement that expires next month. The company won't renew the agreement and wants to pay for SQL Server as it goes on the same instances, without relaunching them or migrating any data. What should a solutions architect do?",
    opts: [
      "Stop each instance, and use AWS License Manager license type conversion to change SQL Server to license included.",
      "Launch new instances from AWS-provided SQL Server Standard AMIs, and migrate each database to them with native backups.",
      "Remove the self-managed license that tracks the instances' SQL Server usage from License Manager, and keep them running.",
      "Move the instances to Dedicated Hosts in a License Manager host resource group, so that SQL Server licensing is covered by AWS."
    ],
    a: 0,
    no: [null,
      "This changes the licensing but means relaunching the instances and migrating the data, which the company wants to avoid.",
      "A self-managed license only tracks usage. Removing it doesn't change how the instances are billed or license SQL Server.",
      "Dedicated Hosts are for bringing your own licenses. They don't make AWS supply the SQL Server license."],
    why: "License Manager license type conversion switches stopped instances between BYOL and AWS-provided licensing without redeploying them. Instances from an AWS-provided Windows AMI that run SQL Server from your own media can convert SQL Server to license included.",
    doc: ["https://docs.aws.amazon.com/license-manager/latest/userguide/license-conversion.html", "https://docs.aws.amazon.com/license-manager/latest/userguide/conversion-types-windows.html"] },

  { id: "saa-4-438", exam: "SAA", saa: "4.3", topic: "rdsproxy", type: "mc",
    q: "An app on RDS for PostgreSQL was given an RDS Proxy so the company could move to a smaller instance class. The DB connection count barely fell, and the proxy's DatabaseConnectionsCurrentlySessionPinned metric is close to the total. Every client connection runs the same SET statements for search_path and statement_timeout before its first query. Which change will let the company downsize with the LEAST code change?",
    opts: [
      "Put the SET statements in the proxy's initialization query, and remove them from the app so that sessions are no longer pinned.",
      "Add a session pinning filter to the proxy that exempts SET statements, so the proxy stops pinning those sessions.",
      "Raise the proxy's MaxConnectionsPercent setting to 100, so the proxy can open more database connections for the pinned sessions.",
      "Add a read replica to the database, and point a read-only proxy endpoint at it so the pinned sessions are spread across two instances."
    ],
    a: 0,
    no: [null,
      "Session pinning filters are available only for the MySQL engine family. For PostgreSQL, SET commands always pin the session.",
      "This allows more database connections, not fewer. Pinned sessions still can't share connections, so the instance can't shrink.",
      "This adds a second instance to pay for and leaves the sessions pinned, so it raises cost instead of cutting it."],
    why: "RDS Proxy pins a session when it sees state changes such as PostgreSQL SET commands, which stops connection reuse. Identical setup statements can move into the proxy's initialization query, which runs on every new database connection, so client sessions multiplex again.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy-pinning.html"] },

  { id: "saa-4-439", exam: "SAA", saa: "4.3", topic: "rds", type: "mc",
    q: "An RDS for MySQL database runs in us-east-1. To keep heavy reporting queries off the primary, the team created a read replica in us-west-2, though the analysts and their tools are in us-east-1 and there is no disaster recovery requirement. Reports may lag the primary by a few minutes. Replication data transfer is now a large part of the bill. Which solution is MOST cost-effective?",
    opts: [
      "Create a read replica in us-east-1, point the reporting tools at it, and delete the replica in us-west-2.",
      "Convert the primary to a Multi-AZ DB instance deployment, and point the reporting tools at its standby instance.",
      "Restore a snapshot to a new reporting DB instance in us-east-1 each night, and delete the replica in us-west-2.",
      "Migrate the database to an Aurora global database, and run the reports on the secondary cluster in us-west-2."
    ],
    a: 0,
    no: [null,
      "The standby in a Multi-AZ DB instance deployment can't serve reads, so the reports would still have nowhere to run.",
      "Nightly restores leave the reports up to a day old, far more than the few minutes of lag that is allowed.",
      "A global database still sends every change across Regions, so the cross-Region transfer cost remains, and it adds cost."],
    why: "Amazon RDS doesn't charge for data transferred to replicate between a source DB instance and a read replica in the same Region. Cross-Region replication incurs data transfer charges for every change, so a same-Region replica meets the need at lower cost.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html", "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.XRgn.html"] },

  { id: "saa-4-440", exam: "SAA", saa: "4.4", topic: "vpc", type: "multi", hint: "Select TWO.",
    q: "A company runs a NAT instance in a public subnet for its private subnets. Partners allowlist the NAT instance's Elastic IP address. Traffic has grown, the team spends hours patching the instance and maintaining a failover script, and it has resized the instance twice. The company wants to stop managing NAT servers, and partners must keep seeing the same source IP address. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Disassociate the Elastic IP address from the NAT instance, and create a public NAT gateway in a public subnet with that address.", ok: true },
      { t: "Change the private subnets' 0.0.0.0/0 route to target the NAT gateway, and then terminate the NAT instance.", ok: true },
      { t: "Create a public NAT gateway with a new Elastic IP address in the public subnet, and ask each partner to add the new address to its allowlist.", ok: false, no: "This changes the source IP address that partners see, which the company must avoid." },
      { t: "Replace the NAT instance with an egress-only internet gateway, and route the private subnets' outbound traffic to it.", ok: false, no: "An egress-only internet gateway handles IPv6 traffic only. It can't give IPv4 instances an outbound path or keep the Elastic IP address." },
      { t: "Move the NAT instance into an Auto Scaling group of one, so that it is replaced automatically if it fails.", ok: false, no: "The company would still patch, size and run a NAT server, which is the work it wants to stop." }
    ],
    why: "A NAT gateway is managed by AWS, scales up to 100 Gbps and needs no patching. To keep the same public address, disassociate the Elastic IP address from the NAT instance, associate it with the new NAT gateway at creation, and then switch the route.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-comparison.html"] },

  { id: "saa-4-441", exam: "SAA", saa: "4.4", topic: "vpc", type: "mc",
    q: "A nightly batch system in private subnets of one Availability Zone sends about 200 TB a month to a partner's IPv4-only endpoint on the internet through a NAT gateway. NAT data processing charges are now the largest line on the network bill. Jobs retry automatically if the outbound path is down for a few minutes, and the team is willing to run and patch instances. Which solution is MOST cost-effective?",
    opts: [
      "Run a NAT instance in a public subnet on an instance type with enough baseline bandwidth, and route the subnets' outbound traffic to it.",
      "Create a second NAT gateway in the same Availability Zone, and split the private subnets' outbound routes between the two gateways.",
      "Create a gateway VPC endpoint for the partner's service, and add it to the route tables of the private subnets that send the data.",
      "Create an egress-only internet gateway, and route the private subnets' outbound traffic to the partner through it instead."
    ],
    a: 0,
    no: [null,
      "Every NAT gateway charges for each gigabyte it processes, so splitting the traffic leaves the processing charges the same.",
      "Gateway endpoints exist only for S3 and DynamoDB. A partner's endpoint on the internet can't be reached through one.",
      "An egress-only internet gateway carries IPv6 traffic only, and the partner's endpoint accepts IPv4 only."],
    why: "A NAT gateway is billed per hour and per gigabyte processed, while a NAT instance is billed only as an EC2 instance of the chosen type and size. With 200 TB a month and outages the jobs can tolerate, a NAT instance removes the processing charge. Internet data transfer out is charged either way.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-comparison.html", "https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html"] },

  { id: "saa-4-442", exam: "SAA", saa: "4.4", topic: "vpc", type: "mc",
    q: "A production VPC has private subnets in three Availability Zones, with a zonal NAT gateway in a public subnet in each AZ and a route table per AZ that keeps traffic in its own AZ. The team adds AZs often and keeps forgetting the extra NAT gateway and routes, which sends traffic across AZs. It wants outbound IPv4 access that stays highly available and in-zone with the least to manage. What should a solutions architect do?",
    opts: [
      "Create a regional NAT gateway for the VPC, point every private subnet's default route at it, and delete the zonal NAT gateways.",
      "Keep one zonal NAT gateway in the first AZ, point every private subnet's default route at it, and delete the other two NAT gateways.",
      "Replace the NAT gateways with NAT instances in an Auto Scaling group that spans all of the AZs in the VPC.",
      "Create a private NAT gateway in each AZ, and point each private subnet's default route at the one in its own AZ."
    ],
    a: 0,
    no: [null,
      "One zonal NAT gateway is a single point of failure for every AZ, and traffic from the other AZs would cross AZs and add charges.",
      "NAT instances add patching, sizing and failover work, which is more to manage, not less.",
      "A private NAT gateway can't be used for internet access. It is for connecting to other VPCs or on-premises networks."],
    why: "A regional NAT gateway uses one NAT gateway ID for all AZs, needs no public subnet, and expands and contracts across AZs with the workloads to keep zonal affinity and high availability. A single shared zonal NAT gateway saves money only where an AZ outage and cross-AZ charges are acceptable.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html", "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html"] },

  { id: "saa-4-443", exam: "SAA", saa: "4.4", topic: "apigateway", type: "mc",
    q: "A public REST API in API Gateway has a prod stage, and clients don't use API keys. Its POST /exports method starts an expensive query job, and a few clients call it in loops, driving up cost. The company wants POST /exports held to about 5 requests per second across all clients, while every other method keeps the stage's current limits. What should a solutions architect do?",
    opts: [
      "Add a method-level throttling override on the prod stage for POST /exports, with a rate of 5 requests per second and a small burst.",
      "Lower the prod stage's default throttling rate to 5 requests per second, with a small burst, so the export method is slowed down.",
      "Create a usage plan with a method throttle of 5 requests per second for POST /exports, and associate the prod stage with it.",
      "Turn on API caching for the prod stage, so repeated POST /exports requests are answered from the cache instead of the backend."
    ],
    a: 0,
    no: [null,
      "The stage default applies to every method, so all other methods would be limited to 5 requests per second too.",
      "Usage plan throttles apply per client API key. Clients here send no API keys, so the plan's limits wouldn't apply to them.",
      "API Gateway caches only GET methods by default, and a cached reply wouldn't start the export job that each client asked for."],
    why: "API Gateway applies per-method throttling limits set on a stage across all clients of that method, and they can differ from the stage's defaults for other methods. Usage plan limits apply only to clients identified by API keys.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html"] },

  { id: "saa-4-444", exam: "SAA", saa: "4.4", topic: "datasync", type: "mc",
    q: "A company is copying 60 TB from an office NAS to S3 with an AWS DataSync task over its 1 Gbps internet link. During business hours the transfer fills the link and staff video calls fail. The company won't pay for more bandwidth. DataSync must use no more than about 300 Mbps during the day and may use the whole link at night, without restarting the copy. What should a solutions architect do?",
    opts: [
      "Set a bandwidth limit on the task, and change the running task execution's limit each morning and evening with UpdateTaskExecution.",
      "Turn on S3 Transfer Acceleration for the destination bucket, so DataSync finishes each file sooner and holds the link for less time.",
      "Add include and exclude filters to the task, so that only small files are copied during the day and large files are copied at night.",
      "Deploy a second DataSync agent on the same network, and split the copy into two tasks that each run on their own agent."
    ],
    a: 0,
    no: [null,
      "Transfer Acceleration speeds up long-distance transfers to S3. It doesn't cap how much of the office link the transfer uses.",
      "Filters choose which files are copied. Small files can still fill the link, and switching filters means running new task executions.",
      "A second agent adds parallel throughput, which uses more of the link, not less."],
    why: "DataSync tasks take a bandwidth limit (BytesPerSecond) when they are created, updated or started. The limit of a running or queued execution can be changed with UpdateTaskExecution and takes effect within about 60 seconds.",
    doc: ["https://docs.aws.amazon.com/datasync/latest/userguide/configure-bandwidth.html"] },

  { id: "saa-4-445", exam: "SAA", saa: "4.4", topic: "ec2", type: "mc",
    q: "A log forwarder runs on a c6i.large instance, whose network performance is listed as up to 12.5 Gbps. Each night it must send a steady 2 Gbps to an OpenSearch domain in the same VPC for three hours. Throughput is fine for the first several minutes, then drops below 1 Gbps while CPU stays low. The company wants the cheapest fix. What should a solutions architect do?",
    opts: [
      "Move to the smallest instance type whose baseline network bandwidth is at least 2 Gbps, found with describe-instance-types.",
      "Attach a second elastic network interface to the instance, and spread the forwarder's connections across both of the interfaces.",
      "Turn on ENA Express for the instance, so its traffic to the OpenSearch domain can use up to 25 Gbps of bandwidth.",
      "Launch the instance in a cluster placement group, so its single-flow traffic can reach up to 10 Gbps of bandwidth."
    ],
    a: 0,
    no: [null,
      "Bandwidth belongs to the instance, not to each interface, so a second interface on this instance doesn't add any.",
      "ENA Express works only between supported EC2 instances in the same Availability Zone, and it doesn't raise the baseline.",
      "A cluster placement group helps traffic between instances in the group. It doesn't change this instance's baseline bandwidth."],
    why: "Instances listed as \"up to\" a bandwidth have a lower baseline and burst above it with network I/O credits, usually for 5 to 60 minutes. A sustained rate must fit the baseline bandwidth, which describe-instance-types shows as BaselineBandwidthInGbps.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-network-bandwidth.html"] }
);
