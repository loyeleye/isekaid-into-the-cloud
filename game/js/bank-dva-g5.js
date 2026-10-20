// Question bank batch: gap fill for DVA in-scope services tested the way a developer meets them (EKS, Aurora, EBS,
// Route 53, AWS WAF, CloudTrail, Systems Manager, Elastic Load Balancing, ElastiCache, CloudShell), plus thinly covered
// DVA skill items. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Domain 1: Development with AWS Services
  { id: "dva-1-401", exam: "both", dva: "1.3", saa: "2.2", topic: "aurora", type: "mc",
    q: "An order service connects to an Aurora MySQL cluster that has one writer and two Aurora Replicas. A developer configured the app with the instance endpoint of the instance that was the writer when the cluster was created. After a failover during maintenance, every write fails with a read-only error until someone edits the app's configuration. The app must keep writing after future failovers with no manual changes. What should the developer do?",
    opts: [
      "Point the app's write connections at the cluster endpoint, which Aurora always moves to the current primary instance.",
      "Point the app's write connections at the reader endpoint, which spreads connections across the instances in the cluster.",
      "Create a custom endpoint whose static member list holds the original writer instance, and point the app at that endpoint.",
      "Give the original writer instance failover priority tier 0, so that Aurora always promotes that same instance again."
    ], a: 0,
    no: [null,
      "The reader endpoint balances read-only connections across the Aurora Replicas, so writes sent through it fail.",
      "A custom endpoint whose only member is that instance still reaches it after it becomes a replica, so writes fail the same way.",
      "Promotion tiers only rank replicas for the next failover. The app would still be pinned to one instance, which is a replica after any failover."],
    why: "The cluster (writer) endpoint is a DNS name that Aurora points at the new primary after a failover. An instance endpoint always reaches one specific instance, whatever its current role.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.Endpoints.html"] },

  { id: "dva-1-402", exam: "DVA", dva: "1.1", topic: "cli", type: "multi", hint: "Select TWO.",
    q: "A cleanup script must print the IDs of every EBS volume in a Region that is unattached (in the available state) and larger than 100 GiB, as plain text, from one AWS CLI call. Which commands return exactly those IDs? (Select TWO.)",
    items: [
      { t: "aws ec2 describe-volumes --filters Name=status,Values=available --query 'Volumes[?Size > `100`].VolumeId' --output text", ok: true },
      { t: "aws ec2 describe-volumes --query 'Volumes[?State==`available` && Size > `100`].VolumeId' --output text", ok: true },
      { t: "aws ec2 describe-volumes --filters Name=status,Values=available Name=size,Values=100 --query 'Volumes[].VolumeId' --output text", ok: false, no: "Server-side filters match exact values, so the size filter returns only volumes of exactly 100 GiB." },
      { t: "aws ec2 describe-volumes --filters Name=status,Values=available --max-items 100 --query 'Volumes[].VolumeId' --output text", ok: false, no: "--max-items caps how many volumes the CLI returns; it says nothing about their size." },
      { t: "aws ec2 describe-volumes --query 'Volumes[?Size > `100`].VolumeId' --output text", ok: false, no: "This returns every volume over 100 GiB, including volumes that are attached to instances." }
    ],
    why: "--filters is applied by the service and matches exact values, while --query runs a JMESPath expression on the client that can compare numbers. Filtering the state on the server, or putting both conditions in the query, gives the right IDs, and --output text prints them plainly.",
    doc: ["https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html", "https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-volumes.html"] },

  { id: "dva-1-403", exam: "DVA", dva: "1.1", topic: "ebs", type: "mc",
    q: "A nightly backup script uses the AWS SDK to call CreateSnapshot on an EBS volume and then immediately calls CopySnapshot to copy the new snapshot to another Region. The copy call fails, and DescribeSnapshots shows the new snapshot still in the pending state. Snapshots of this volume take anywhere from minutes to over an hour. What should the developer change?",
    opts: [
      "After CreateSnapshot, use the SDK's snapshot completed waiter, which polls DescribeSnapshots, and call CopySnapshot when it returns.",
      "Add a fixed 60-second sleep between the CreateSnapshot call and the CopySnapshot call, and then run the script again.",
      "Call CreateSnapshot against the destination Region's endpoint, so that the snapshot is created in that Region directly.",
      "Use the volume available waiter on the source volume before calling CopySnapshot for the snapshot that was just created."
    ], a: 0,
    no: [null,
      "A fixed delay fails whenever a snapshot takes longer, and these can take over an hour.",
      "CreateSnapshot works on a volume in the Region where it is called, and the volume isn't in the destination Region.",
      "That waiter checks the volume's state, not the snapshot's, so it says nothing about whether the snapshot is completed."],
    why: "Snapshots are created asynchronously, and a snapshot can be copied only after it reaches the completed state. The snapshot completed waiter (aws ec2 wait snapshot-completed in the CLI) polls DescribeSnapshots until that happens.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/ebs-copy-snapshot.html", "https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/snapshot-completed.html"] },

  { id: "dva-1-404", exam: "DVA", dva: "1.1", topic: "cloudshell", type: "mc",
    q: "A developer keeps helper scripts in the home directory of AWS CloudShell and runs them with the AWS CLI while working in us-east-1. The next week, the developer opens CloudShell with the console set to eu-west-1, and the home directory is empty. Nobody deleted the scripts. What explains this, and how can the developer get the scripts back?",
    opts: [
      "Each Region has its own CloudShell home directory, so switch the console to us-east-1 and open CloudShell there.",
      "CloudShell keeps only the files in /tmp between sessions, so the scripts are gone and must be saved in /tmp from now on.",
      "CloudShell deletes home directory data after 7 days without use, so the scripts are gone and must be written again.",
      "The console role has no CloudShell permissions in eu-west-1, so add them to the role and then reopen CloudShell there."
    ], a: 0,
    no: [null,
      "It's the other way round: $HOME persists between sessions, and files outside it are lost when a session ends.",
      "Data in a Region's persistent storage is kept for 120 days after the last session there, and these scripts are a week old.",
      "Without permission, CloudShell wouldn't open at all. The home directory is empty because storage is kept per Region."],
    why: "CloudShell gives each user 1 GB of persistent storage in $HOME in each Region. Files saved in one Region's home directory are there only when CloudShell is opened in that Region.",
    doc: ["https://docs.aws.amazon.com/cloudshell/latest/userguide/limits.html"] },

  { id: "dva-1-405", exam: "DVA", dva: "1.3", topic: "aurora", type: "mc",
    q: "A checkout service writes each order to an Aurora MySQL cluster through the cluster endpoint, then immediately reads the order back to build the confirmation page. To offload the writer, a developer sent all SELECT queries to the reader endpoint. Now the confirmation page sometimes says the order doesn't exist, although the order is always there a moment later. What should the developer do?",
    opts: [
      "Send reads that must see the service's own new writes to the cluster endpoint, and keep other reads on the reader endpoint.",
      "Add two more Aurora Replicas to the cluster, so the reader endpoint has more instances to spread the confirmation reads over.",
      "Place the Aurora Replicas in the same Availability Zone as the writer, so that they apply each change before the next read.",
      "Wrap the INSERT and the SELECT in one transaction, and keep sending that transaction's SELECT to the reader endpoint."
    ], a: 0,
    no: [null,
      "More replicas add read capacity, but each one still lags the writer slightly, so a read right after a write can still miss it.",
      "Replica lag is small but never zero, wherever the replica runs, so a read right after a write can still miss the new row.",
      "A transaction lives on one connection to one instance. A SELECT sent over another connection to a replica isn't part of it."],
    why: "Aurora Replicas share the cluster's storage but apply the writer's changes asynchronously, usually well under 100 ms later. Reads that must see a write that just happened belong on the writer, through the cluster endpoint.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html", "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.Endpoints.html"] },

  { id: "dva-1-406", exam: "DVA", dva: "1.2", topic: "elasticache", type: "multi", hint: "Select TWO.",
    q: "A Lambda function that isn't attached to a VPC must read session data from an ElastiCache for Valkey cluster in private subnets. Every connection attempt to the cluster's primary endpoint times out. The function's execution role already has the permissions Lambda needs to create network interfaces. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Attach the function to private subnets in the cluster's VPC, and give the function its own security group.", ok: true },
      { t: "Add an inbound rule to the cluster's security group that allows the cache port from the function's security group.", ok: true },
      { t: "Add a NAT gateway to the cluster's VPC, so that the function can reach the cluster through the internet.", ok: false, no: "A NAT gateway gives private resources a way out. It gives nothing outside the VPC a way in to the cluster's private addresses." },
      { t: "Allow elasticache:Connect on the cluster in the execution role, and connect with an IAM authentication token.", ok: false, no: "That permission is for IAM authentication to the cache. A timeout means there's no network path, which no permission fixes." },
      { t: "Raise the function's timeout and memory, so it has more time and network bandwidth to finish connecting.", ok: false, no: "Packets that have no route never arrive, however long the function waits." }
    ],
    why: "An ElastiCache cluster has only private addresses in its VPC. A function reaches it by attaching to subnets in that VPC, and the cluster's security group must allow the cache port (6379 by default) from the function's security group.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html", "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Endpoints.html"] },

  { id: "dva-1-407", exam: "DVA", dva: "1.2", topic: "elb", type: "multi", hint: "Select TWO.",
    q: "A developer is putting a Lambda function behind an existing Application Load Balancer so that requests to /reports/* run the function. The function already returns responses in the format the load balancer expects. The team deploys everything with the AWS CLI, not the console. Which steps are required? (Select TWO.)",
    items: [
      { t: "Create a target group with the lambda target type, register the function's alias ARN, and add a /reports/* listener rule that forwards to it.", ok: true },
      { t: "Add a statement to the function's resource-based policy that allows elasticloadbalancing.amazonaws.com to call lambda:InvokeFunction.", ok: true },
      { t: "Create a target group with the ip target type, and register the private IP address of the function's network interface.", ok: false, no: "Lambda functions are registered in a target group of type lambda; a function's network interfaces don't accept HTTP requests." },
      { t: "Add an inbound rule to the function's security group that allows HTTP traffic from the load balancer's security group.", ok: false, no: "The load balancer invokes the function through the Lambda service, not over the network to it, so no security group rule is involved." },
      { t: "Allow elasticloadbalancing:RegisterTargets in the function's execution role, so that the load balancer can call the function.", ok: false, no: "The execution role covers what the function itself may do. The load balancer's right to invoke it comes from the function's resource-based policy." }
    ],
    why: "An ALB invokes a Lambda target directly. The function goes in a target group of type lambda (one function per group) behind a listener rule, and outside the console, lambda add-permission must grant elasticloadbalancing.amazonaws.com lambda:InvokeFunction.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/lambda-functions.html"] },

  { id: "dva-1-408", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "multi", hint: "Select TWO.",
    q: "A DynamoDB table stores events with DeviceId as the partition key and the event date as the sort key, saved as strings such as \"10/03/2026\". A Query with a BETWEEN condition from \"09/15/2026\" to \"10/15/2026\" also returns events from other years. Which ways of storing the sort key will make date-range queries return the right items? (Select TWO.)",
    items: [
      { t: "Store the date as an ISO 8601 string, such as \"2026-10-03T14:05:00Z\", so that string order matches time order.", ok: true },
      { t: "Store the date as a Number that holds Unix epoch seconds, and query with numeric BETWEEN bounds.", ok: true },
      { t: "Store the date as a map with day, month and year attributes, and query on the map's year attribute.", ok: false, no: "Key attributes must be a scalar string, number or binary value, so a map can't be the sort key." },
      { t: "Keep the MM/DD/YYYY strings, and add a FilterExpression that removes results whose year is wrong.", ok: false, no: "The filter runs after the key condition has read the items, so it uses capacity on wrong items, and ranges across years still fail." },
      { t: "Store the same date string as a Binary attribute, so DynamoDB compares the values as dates, not text.", ok: false, no: "Binary values are compared byte by byte, which gives the same wrong order as the MM/DD/YYYY string." }
    ],
    why: "DynamoDB has no date type, and it compares strings by their UTF-8 bytes. ISO 8601 strings (largest unit first) and epoch-second numbers both sort in time order, so range conditions on the sort key work.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html"] },

  { id: "dva-1-409", exam: "both", dva: "1.1", saa: "2.1", topic: "elb", type: "mc",
    q: "A legacy Java web app keeps each user's login session in server memory and sets its own JSESSIONID cookie, whose lifetime the app controls. It now runs on three EC2 instances behind an Application Load Balancer, and users are randomly logged out. The app can't be changed yet. Stickiness must be tied to the app's own session cookie, not to a cookie lifetime chosen on the load balancer. What should the developer configure?",
    opts: [
      "Application-based stickiness on the target group, with JSESSIONID as the application cookie name.",
      "Duration-based stickiness on the target group, with a load balancer cookie that lasts for one day.",
      "The least outstanding requests routing algorithm, so each request goes to the least busy instance.",
      "Cross-zone load balancing turned off, so that each user's requests stay in one Availability Zone."
    ], a: 0,
    no: [null,
      "Stickiness would follow an AWSALB cookie with a fixed duration set on the load balancer, not the app's own cookie.",
      "The algorithm still picks a target for each request, so a user's requests keep moving between instances.",
      "Users would still move between instances in a zone, and sticky sessions need cross-zone load balancing turned on."],
    why: "With application-based stickiness, the ALB issues an AWSALBAPP cookie tied to the named application cookie, so each user stays on one target. Duration-based stickiness uses an AWSALB cookie whose duration the load balancer sets.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html"] },

  { id: "dva-1-410", exam: "DVA", dva: "1.3", topic: "elasticache", type: "mc",
    q: "An app used a Valkey client in standalone mode with an ElastiCache cluster that had cluster mode disabled. The team moved to a cluster with cluster mode enabled and three shards, and pointed the same client at the node endpoint of one shard's primary. Now commands for many keys fail with MOVED errors. What should the developer do?",
    opts: [
      "Switch to a cluster-aware client that connects to the configuration endpoint and learns which node serves each hash slot.",
      "Point the existing client at a reader endpoint, so that its requests are spread evenly across all of the cluster's replica nodes.",
      "Raise the client's timeout and retry with exponential backoff, because MOVED errors mean the cluster is still being resharded.",
      "Put a hash tag such as {user} in every key, so that all keys hash to the shard behind the node endpoint the client uses."
    ], a: 0,
    no: [null,
      "The reader endpoint belongs to clusters with cluster mode disabled, and a client that ignores hash slots still sends keys to nodes that don't own them.",
      "Backoff helps with brief failures, but this client sends keys to the wrong node on every attempt.",
      "A hash tag puts keys in one slot, not necessarily one that this node owns, and forcing every key into one slot defeats sharding."],
    why: "With cluster mode enabled, keys are spread over hash slots across shards. A cluster-aware client uses the configuration endpoint to get the slot map and sends each command to the node that owns the key's slot; a MOVED reply means the node doesn't own it.",
    doc: ["https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Endpoints.html", "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/BestPractices.Clients.Redis.Discovery.html"] },

  // Domain 2: Security
  { id: "dva-2-401", exam: "DVA", dva: "2.1", topic: "eks", type: "multi", hint: "Select TWO.",
    q: "Pods of an order service on an Amazon EKS cluster with managed node groups call DynamoDB. Today they use the node IAM role, which every pod on the nodes shares. The team wants only these pods to get a role with DynamoDB access, using EKS Pod Identity. The cluster doesn't use EKS Auto Mode, and the pods run under the orders-sa service account. Which steps are required? (Select TWO.)",
    items: [
      { t: "Install the Amazon EKS Pod Identity Agent add-on on the cluster, so the nodes can hand role credentials to pods.", ok: true },
      { t: "Create a role that trusts pods.eks.amazonaws.com, and a Pod Identity association between it and orders-sa in its namespace.", ok: true },
      { t: "Create an IAM OIDC provider for the cluster, and annotate orders-sa with the role ARN in eks.amazonaws.com/role-arn.", ok: false, no: "Those are the steps for IAM roles for service accounts, a different feature. EKS Pod Identity doesn't use an OIDC provider." },
      { t: "Add the DynamoDB permissions to the node IAM role, since only the order service's pods call DynamoDB anyway.", ok: false, no: "Every pod on the nodes can use the node role's credentials, which is exactly what the team wants to stop." },
      { t: "Store an IAM user's access keys in a Kubernetes secret, and mount the secret into the order service's pods.", ok: false, no: "Long-lived keys in a secret must be rotated by hand, and removing them is the point of giving pods their own role." }
    ],
    why: "EKS Pod Identity needs the Pod Identity Agent on the nodes (Auto Mode clusters have it built in) and an association that maps a role to a service account in a namespace. The role's trust policy lets pods.eks.amazonaws.com call sts:AssumeRole and sts:TagSession, and SDKs in the pods pick up the credentials.",
    doc: ["https://docs.aws.amazon.com/eks/latest/userguide/pod-identities.html", "https://docs.aws.amazon.com/eks/latest/userguide/pod-id-role.html"] },

  { id: "dva-2-402", exam: "DVA", dva: "2.1", topic: "eks", type: "mc",
    q: "An EKS cluster in a workload account runs pods whose images are in a private Amazon ECR repository in a separate shared-services account. The node IAM role has the AmazonEC2ContainerRegistryPullOnly policy. Pods that use images from the workload account's own repositories start normally, but pods that use the shared repository fail with ImagePullBackOff and a 403 error. What should the developer do?",
    opts: [
      "Add a repository policy to the shared repository that allows the node IAM role to call ecr:BatchGetImage and ecr:GetDownloadUrlForLayer.",
      "Add ECR pull permissions to the role that the pods get through EKS Pod Identity, so that the pods can pull their own images.",
      "Attach the AmazonEC2ContainerRegistryReadOnly policy to the node IAM role in place of the PullOnly policy it has now.",
      "Turn on tag immutability for the shared repository, so the image tags that the pods reference can't change during a pull."
    ], a: 0,
    no: [null,
      "Images are pulled by the kubelet on each node with the node IAM role, not by the pod's own application role.",
      "The node role's identity policy already allows pulls. The repository in the other account must also allow this account's role.",
      "Tag immutability stops tags from being overwritten. It doesn't let anyone in another account pull images."],
    why: "A cross-account pull must be allowed on both sides: by the node role's IAM policy, which the PullOnly policy covers, and by a repository policy in the owning account that allows the node role to pull.",
    doc: ["https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_EKS.html", "https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policy-examples.html"] },

  { id: "dva-2-403", exam: "DVA", dva: "2.1", topic: "eks", type: "mc",
    q: "Pods in the payments namespace of an EKS cluster get an IAM role through IAM roles for service accounts (IRSA). The role's trust policy allows sts:AssumeRoleWithWebIdentity from the cluster's OIDC provider with only an aud condition set to sts.amazonaws.com. A review found that any service account annotated with the role's ARN, in any namespace, can assume it. Only payments-sa in payments may. What should the developer change?",
    opts: [
      "Add a StringEquals condition on the provider's sub key with the value system:serviceaccount:payments:payments-sa.",
      "Change the aud condition's value from sts.amazonaws.com to payments-sa, so only that service account's tokens match.",
      "Add a condition on aws:PrincipalTag/kubernetes-namespace equal to payments, so that only pods in that namespace match.",
      "Change the trust policy's principal to pods.eks.amazonaws.com, and keep the existing annotation on payments-sa."
    ], a: 0,
    no: [null,
      "The aud claim names the token's audience, which is sts.amazonaws.com for every service account, so no token would match.",
      "Those session tags come from EKS Pod Identity. IRSA tokens identify the service account in the sub claim.",
      "That principal is for EKS Pod Identity, which needs associations; IRSA tokens come from the OIDC provider, so they'd no longer match."],
    why: "With IRSA, a pod presents a service account token from the cluster's OIDC provider, whose sub claim is system:serviceaccount:<namespace>:<name>. A condition on that sub key in the trust policy limits the role to one service account.",
    doc: ["https://docs.aws.amazon.com/eks/latest/userguide/associate-service-account-role.html"] },

  { id: "dva-2-404", exam: "DVA", dva: "2.1", topic: "aurora", type: "multi", hint: "Select TWO.",
    q: "A Lambda function connects to an Aurora MySQL cluster with a password stored in its configuration. The security team wants the function to authenticate with IAM instead. IAM database authentication is already turned on for the cluster, and the database user app_user was created with the AWSAuthenticationPlugin. Which steps complete the change? (Select TWO.)",
    items: [
      { t: "Allow rds-db:connect in the execution role on arn:aws:rds-db:<region>:<account>:dbuser:<cluster resource ID>/app_user.", ok: true },
      { t: "Have the function generate an authentication token with the SDK's RDS signer and use it as the password on a TLS connection.", ok: true },
      { t: "Allow rds-db:connect in the execution role on an ARN that names the cluster, such as dbuser:orders-cluster/app_user.", ok: false, no: "The rds-db ARN uses the cluster's resource ID, such as cluster-ABCDEFGHIJKL01234, not its name, so this statement matches nothing." },
      { t: "Generate one authentication token at deployment time, and store it in an environment variable for every connection.", ok: false, no: "Each token is valid for only 15 minutes, so the function must generate tokens when it connects." },
      { t: "Allow secretsmanager:GetSecretValue in the execution role, so the database can fetch the role's password at sign-in.", ok: false, no: "IAM database authentication uses short-lived tokens signed with the role's credentials; no secret is involved." }
    ],
    why: "With IAM database authentication, the caller signs a token, valid for 15 minutes, with its own credentials and sends it as the password over SSL/TLS. Its IAM policy must allow rds-db:connect on the dbuser ARN that names the cluster resource ID and the database user.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.IAMDBAuth.html", "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/UsingWithRDS.IAMDBAuth.IAMPolicy.html"] },

  { id: "dva-2-405", exam: "DVA", dva: "2.1", topic: "cloudshell", type: "mc",
    q: "A developer on a locked-down company laptop can't install software and isn't allowed to create IAM access keys. The developer needs to run a few AWS CLI commands now, with the same permissions as the role used to sign in to the AWS Management Console. Which solution needs the LEAST setup?",
    opts: [
      "Open AWS CloudShell from the console, and run the commands with its preinstalled AWS CLI, which uses the console credentials.",
      "Run aws configure sso on the laptop, and sign in through IAM Identity Center to get temporary credentials for the CLI.",
      "Launch an EC2 instance with an instance profile for the same role, and connect to it to run the commands there.",
      "Create access keys for the developer's IAM user, and paste them into a browser-based terminal on a third-party site."
    ], a: 0,
    no: [null,
      "This needs the AWS CLI installed on the laptop, which the developer can't do.",
      "It works, but launching, securing and paying for an instance is far more setup than CloudShell.",
      "Creating access keys is forbidden, and pasting them into a third-party site exposes them."],
    why: "CloudShell is a browser-based shell launched from the console. It is pre-authenticated with the console sign-in credentials and has AWS CLI version 2 preinstalled, so there is nothing to install or configure.",
    doc: ["https://docs.aws.amazon.com/cloudshell/latest/userguide/welcome.html"] },

  { id: "dva-2-406", exam: "DVA", dva: "2.1", topic: "cloudtrail", type: "multi", hint: "Select TWO.",
    q: "Three batch apps on EC2, each with its own instance profile, call AssumeRole for the same ReportsRole before they call S3. In CloudTrail, every S3 call shows only ReportsRole, so the team can't tell which app made a given call. No long-term credentials may be added. Which changes will let the team tell the apps apart in each CloudTrail record? (Select TWO.)",
    items: [
      { t: "Have each app pass its own RoleSessionName, such as reports-billing, which appears in the assumed-role ARN of every call.", ok: true },
      { t: "Have each app set a SourceIdentity when it assumes the role, with sts:SetSourceIdentity allowed for the apps and the role.", ok: true },
      { t: "Add a different tag to ReportsRole for each app, so that CloudTrail records the matching tag with each call.", ok: false, no: "One role has one set of tags, shared by every session, so its tags can't tell the apps apart." },
      { t: "Turn on CloudTrail Insights for the trail, so that each recorded call is labeled with the app that made it.", ok: false, no: "Insights flags unusual API call rates and error rates; it doesn't identify callers." },
      { t: "Give each app an IAM user with its own access keys for S3, so each call shows a different user name.", ok: false, no: "That adds long-term credentials, which the rules forbid." }
    ],
    why: "A call made with assumed-role credentials is recorded with the assumed-role ARN, which ends in the role session name, and with any source identity set when the role was assumed. Distinct values per app make each call traceable.",
    doc: ["https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html", "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_control-access_monitor.html"] },

  { id: "dva-2-407", exam: "both", dva: "2.1", saa: "1.2", topic: "waf", type: "mc",
    q: "An Application Load Balancer gets all of its traffic through a third-party CDN, which puts each viewer's IP address in the X-Forwarded-For header. The team added an AWS WAF rate-based rule on the ALB that aggregates by source IP address, and it blocked the CDN's own addresses, cutting off every user. Each viewer's IP address must be rate limited on its own. What should the developer change?",
    opts: [
      "Make the rule aggregate on a forwarded IP from the X-Forwarded-For header, with a fallback behavior for malformed addresses.",
      "Raise the rule's request limit so that the CDN's addresses stay under it, and keep aggregating on the source IP address.",
      "Set the ALB's X-Forwarded-For processing mode to preserve, so that the header reaches the targets without the CDN address added.",
      "Add an IP set of the CDN's address ranges to a rule that allows those requests before the rate-based rule is evaluated."
    ], a: 0,
    no: [null,
      "The CDN's addresses carry every viewer's requests, so a limit high enough for them can never single out one abusive viewer.",
      "That attribute changes the header the ALB sends on to its targets. It doesn't change which address the rate-based rule counts.",
      "Allowing all CDN traffic would end the outage, but no viewer would be rate limited at all."],
    why: "When requests pass through proxies or a CDN, the source IP is the last proxy's address. A rate-based rule can aggregate on a forwarded IP read from a header such as X-Forwarded-For, which carries the viewer's address.",
    doc: ["https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-forwarded-ip-address.html", "https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-aggregation-options.html"] },

  { id: "dva-2-408", exam: "DVA", dva: "2.3", topic: "eks", type: "mc",
    q: "Services in a dozen namespaces of an EKS cluster share one IAM role through EKS Pod Identity associations. Each service must read and write only objects under its own namespace's prefix in a shared S3 bucket, such as s3://tenant-data/billing/ for the billing namespace. The team doesn't want a separate role or policy per namespace. What should the developer do?",
    opts: [
      "Allow the S3 actions on arn:aws:s3:::tenant-data/${aws:PrincipalTag/kubernetes-namespace}/* in the shared role's policy.",
      "Allow the S3 actions on arn:aws:s3:::tenant-data/${aws:username}/* in the shared role's policy, since sessions use the pod name.",
      "Tag the shared role with a namespace key, and allow the S3 actions only on the prefix that matches the role's namespace tag.",
      "Allow the S3 actions on the whole bucket, and have each service add its own namespace as a prefix to the keys it uses."
    ], a: 0,
    no: [null,
      "aws:username exists only for IAM users, not for role sessions, so the resource would never match.",
      "A role has one value per tag key, shared by every session, so all namespaces would get the same prefix.",
      "The services could still read and write every tenant's objects; the rule would rest on code, not on IAM."],
    why: "EKS Pod Identity adds session tags such as kubernetes-namespace, kubernetes-service-account and eks-cluster-name to each role session. A policy can use ${aws:PrincipalTag/kubernetes-namespace} so one role grants each namespace only its own prefix.",
    doc: ["https://docs.aws.amazon.com/eks/latest/userguide/pod-id-abac.html"] },

  // Domain 3: Deployment
  { id: "dva-3-401", exam: "both", dva: "3.1", saa: "4.1", topic: "ebs", type: "mc",
    q: "A CloudFormation template creates a 100 GiB EBS data volume for a self-managed database on EC2. Load tests show the database needs a steady 6,000 IOPS and 250 MiB/s of throughput, and the data will stay well under 100 GiB. Which volume definition meets these needs MOST cost-effectively?",
    opts: [
      "VolumeType gp3 with Size 100, Iops 6000 and Throughput 250, since gp3 performance is set separately from size.",
      "VolumeType gp2 with Size 2000, since a gp2 volume's baseline IOPS grows with its size at 3 IOPS per GiB.",
      "VolumeType io2 with Size 100 and Iops 6000, since only Provisioned IOPS volumes can hold a steady IOPS rate.",
      "VolumeType st1 with Size 500, since Throughput Optimized HDD volumes are built for high throughput at low cost."
    ], a: 0,
    no: [null,
      "It reaches 6,000 IOPS only by paying for 20 times the storage the data needs.",
      "io2 would work, but gp3 also gives steady provisioned IOPS and throughput, for less.",
      "HDD volumes suit large sequential I/O; their IOPS fall far short of a database's small random reads and writes."],
    why: "gp3 volumes have a baseline of 3,000 IOPS and 125 MiB/s at any size, and more IOPS and throughput can be provisioned apart from size, up to 500 IOPS per GiB and 0.25 MiB/s per provisioned IOPS.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-volume.html"] },

  { id: "dva-3-402", exam: "DVA", dva: "3.4", topic: "elb", type: "multi", hint: "Select TWO.",
    q: "Version 1 of a web app runs in target group TG-blue behind an Application Load Balancer. The team deployed version 2 to TG-green and wants the listener's default rule to send about 10% of new users to version 2. Once a user lands on a version, the user must keep getting that version, because the two versions store session data differently. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Change the default rule's forward action to include both target groups, with a weight of 90 for TG-blue and 10 for TG-green.", ok: true },
      { t: "Turn on target group stickiness for that forward action, so an AWSALBTG cookie keeps each user on the target group chosen first.", ok: true },
      { t: "Turn on application-based stickiness on both target groups, naming the app's session cookie, so users stay on one version.", ok: false, no: "Application-based stickiness doesn't work with weighted target groups. Target group stickiness on the rule is what pins the version." },
      { t: "Create two weighted alias records in Route 53 for the hostname, both pointing to the load balancer, with weights of 90 and 10.", ok: false, no: "Both records lead to the same load balancer, so the DNS weights can't choose a target group." },
      { t: "Turn on slow start mode for TG-green, so that it gets a small share of traffic that grows over time.", ok: false, no: "Slow start ramps up traffic to new targets within a target group; it doesn't split traffic between target groups or pin users." }
    ],
    why: "A forward action can spread requests across weighted target groups. Target group stickiness on that action adds an AWSALBTG cookie, so each user's later requests go to the target group the load balancer chose first.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html", "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html"] },

  { id: "dva-3-403", exam: "DVA", dva: "3.4", topic: "ssm", type: "mc",
    q: "A CloudFormation template deployed in six Regions uses a Mappings section of hard-coded AMI IDs, one per Region, for its EC2 launch template. The IDs go stale whenever a newer Amazon Linux 2023 AMI is released, and someone must look them up and edit the template. Each stack create or update must use the latest Amazon Linux 2023 AMI for its Region with no template edits. What should the developer do?",
    opts: [
      "Add a parameter of type AWS::SSM::Parameter::Value<AWS::EC2::Image::Id> that defaults to the public AL2023 AMI parameter, and use it.",
      "Add a parameter of type AWS::EC2::Image::Id with a default AMI ID, so that CloudFormation checks the ID exists in each Region.",
      "Replace the mapping with an ssm-secure dynamic reference to the public AL2023 AMI parameter in the launch template's ImageId.",
      "Keep the Mappings section, and give Fn::FindInMap a default value so that Regions missing from the map use a known AMI ID."
    ], a: 0,
    no: [null,
      "That type only validates an ID someone supplies; its default would still be one fixed ID from one Region.",
      "ssm-secure references resolve only SecureString parameters, and the public AMI parameters are plain String parameters.",
      "The IDs in the mapping still go stale and still need editing each time a new AMI is released."],
    why: "Systems Manager parameter types make CloudFormation read a Parameter Store value each time the stack is created or updated. AWS publishes public parameters under /aws/service/ami-amazon-linux-latest/ that always hold the latest Amazon Linux AMI ID for each Region.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-supplied-parameter-types.html", "https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-public-parameters-ami.html"] },

  { id: "dva-3-404", exam: "DVA", dva: "3.1", topic: "ssm", type: "multi", hint: "Select TWO.",
    q: "The same Lambda function code is deployed as separate dev and prod stacks in one account. Its settings live in Parameter Store, and it loads them all at startup with GetParametersByPath. The dev function must never be able to read prod values, and the code must be identical in both stacks. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Store the settings under /orders/dev/ and /orders/prod/, and have each stack pass its own path to the function in an environment variable.", ok: true },
      { t: "Allow each stack's execution role ssm:GetParametersByPath only on its own path, such as arn:aws:ssm:<region>:<account>:parameter/orders/dev.", ok: true },
      { t: "Allow both roles ssm:GetParametersByPath on /orders, and deny the dev role ssm:GetParameter* on each parameter under /orders/prod/.", ok: false, no: "GetParametersByPath is authorized against the requested path, so a dev call on /orders still returns the prod parameters despite those denies." },
      { t: "Keep one parameter per setting, and attach a dev label and a prod label to different versions of it for each stack to read.", ok: false, no: "Both labels belong to the same parameter, so IAM can't let the dev role read one label's value but not the other's." },
      { t: "Store all the settings in one JSON parameter with dev and prod sections, and have the function pick its section by environment.", ok: false, no: "Anyone who can read that parameter gets both sections, so the dev function could read prod values." }
    ],
    why: "GetParametersByPath is authorized against the path in the request, not against each parameter it returns. A hierarchy per environment, with each role allowed only its own path, keeps environments apart while the code just reads its path from configuration.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-retrieval-authorization.html", "https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-hierarchies.html"] },

  { id: "dva-3-405", exam: "DVA", dva: "3.4", topic: "elb", type: "mc",
    q: "An app on EC2 instances behind an Application Load Balancer is released with CodeDeploy in-place deployments, which deregister each instance from the target group, stop the app and install the new version. Users who upload large files, which takes up to 3 minutes, get 5xx errors during every release. The target group's deregistration delay is set to 20 seconds. What should the developer do?",
    opts: [
      "Raise the target group's deregistration delay above the slowest upload, so in-flight requests finish before the app stops.",
      "Turn on slow start mode for the target group, so instances get a growing share of requests after they are registered.",
      "Raise the load balancer's connection idle timeout, so that client connections stay open for longer while large uploads are in progress.",
      "Turn on duration-based stickiness, so that each user's upload keeps going to the same instance until it completes."
    ], a: 0,
    no: [null,
      "Slow start ramps up traffic to newly registered targets. It does nothing for requests on targets that are being removed.",
      "The idle timeout closes connections that carry no data. These uploads are cut because the target is removed after 20 seconds.",
      "Stickiness doesn't keep a deregistering target in service; the load balancer stops waiting for it once the delay is over."],
    why: "While a target deregisters, the load balancer sends it no new requests and waits up to the deregistration delay (300 seconds by default) for in-flight requests to finish. The deployment stops the app only after deregistration completes, so the delay must cover the slowest request.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html"] },

  { id: "dva-3-406", exam: "DVA", dva: "3.3", topic: "apigateway", type: "mc",
    q: "A team builds an HTTP API in API Gateway with a dev stage and a prod stage. Developers want every change to routes and integrations to go live on dev at once, without a separate deploy step. Prod must change only when the team deliberately deploys a tested configuration to it. What should the developer do?",
    opts: [
      "Enable automatic deployment on the dev stage only, and create a deployment for the prod stage when a release is approved.",
      "Enable automatic deployment on both stages, and use a stage variable on prod that points to the last tested backend.",
      "Serve both environments from one $default stage with automatic deployment, and add a /prod route prefix for production.",
      "Configure a canary on the prod stage that gets 0% of traffic, and promote the canary each time a tested change should reach prod."
    ], a: 0,
    no: [null,
      "With automatic deployment on prod, every API change would reach prod at once; a stage variable doesn't hold back route changes.",
      "One stage serves one deployment, so every change would reach production clients immediately.",
      "Canary release deployments are a REST API feature that HTTP APIs don't support."],
    why: "A deployment is a snapshot of an API's configuration, and each stage serves one deployment. With automatic deployment turned on, API Gateway deploys every change to that stage; a stage without it changes only when someone deploys to it.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-stages.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html"] },

  { id: "dva-3-407", exam: "DVA", dva: "3.2", topic: "elb", type: "mc",
    q: "A new version of a web app runs in a green target group behind the same Application Load Balancer as the live blue target group. Testers must try green through the production hostname before any customer is sent to it. They work from many locations with changing IP addresses, and their test tool can add a custom header to each request. What should the developer configure?",
    opts: [
      "A listener rule with an http-header condition on the test header that forwards to green, evaluated before the default rule.",
      "A listener rule with a source-ip condition for the testers' addresses that forwards matching requests to the green target group.",
      "A weighted forward action on the default rule that sends 1% of requests to green and the other 99% to blue.",
      "Registration of the green instances in the blue target group, with testers retrying until a green instance answers."
    ], a: 0,
    no: [null,
      "The testers' IP addresses keep changing, so an IP condition can't match them reliably.",
      "Weighted routing sends real customers to green before it has been tested.",
      "Customers would reach the untested instances too, and testers couldn't choose which version answers them."],
    why: "Listener rules are evaluated in priority order before the default rule. An http-header condition matches only requests that carry the test header, so testers reach green while every other request follows the default action to blue.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-condition-types.html", "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-rules.html"] },

  // Domain 4: Troubleshooting and Optimization
  { id: "dva-4-401", exam: "both", dva: "4.1", saa: "2.2", topic: "route53", type: "mc",
    q: "A partner API runs on EC2 instances with Elastic IP addresses in two Regions. Route 53 failover records use an HTTPS health check on the primary's /health path. The primary's security group allows port 443 only from partner and office IP ranges. The health check has reported the primary unhealthy ever since it was created, although /health returns 200 when called from the office. What should the developer do?",
    opts: [
      "Allow inbound HTTPS in the primary's security group from the IP ranges that Route 53 health checkers use.",
      "Change the health check from HTTPS to TCP on port 443, so that it no longer depends on the response from /health.",
      "Raise the health check's failure threshold and request interval, so occasional slow responses don't count as failures.",
      "Turn on Invert health check status, so that Route 53 treats the primary as healthy while the cause is investigated."
    ], a: 0,
    no: [null,
      "A TCP check still has to open a connection to port 443, which the security group blocks for the health checkers.",
      "The checks are blocked, not slow; spacing them out doesn't let them through.",
      "Inverting would report the primary healthy even when it really fails, which defeats failover."],
    why: "Route 53 health checkers send their requests over the internet from published IP ranges (ROUTE53_HEALTHCHECKS in ip-ranges.json). If a security group or firewall blocks those ranges, the endpoint is reported unhealthy even though it works.",
    doc: ["https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/route-53-ip-addresses.html", "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-determining-health-of-endpoints.html"] },

  { id: "dva-4-402", exam: "DVA", dva: "4.1", topic: "ebs", type: "mc",
    q: "A recovery script creates an EBS volume from a snapshot in us-east-1a and then calls AttachVolume for an instance that Auto Scaling just launched as a replacement. The call fails with InvalidVolume.ZoneMismatch, and the instance is in us-east-1b. What should the developer change in the script?",
    opts: [
      "Read the instance's Availability Zone first, and call CreateVolume from the snapshot in that same zone before attaching it.",
      "Call ModifyVolume on the new volume to move it to us-east-1b, wait for the modification to finish, and then attach it.",
      "Copy the snapshot to us-east-1b with CopySnapshot, and create the volume from that copy in the new zone.",
      "Enable Multi-Attach on the volume, so that instances in the other Availability Zones of the Region can attach the volume as well."
    ], a: 0,
    no: [null,
      "ModifyVolume changes a volume's size, type, IOPS or throughput, not its Availability Zone.",
      "Snapshots are Regional, so the original can already create a volume in any zone of the Region; a copy adds nothing.",
      "Multi-Attach lets instances in the same Availability Zone share an io1 or io2 volume; it never crosses zones."],
    why: "An EBS volume can be attached only to an instance in its own Availability Zone. A snapshot can create a volume in any zone of its Region, so the script should create the volume where the instance is.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/ebs-attaching-volume.html", "https://docs.aws.amazon.com/ec2/latest/devguide/errors-overview.html"] },

  { id: "dva-4-403", exam: "DVA", dva: "4.1", topic: "cloudshell", type: "mc",
    q: "A developer must check, from a web browser, whether a private ElastiCache cluster and an RDS for MySQL database accept connections from the app's private subnet. There is no bastion host, the developer can't install tools locally, and neither resource has a public endpoint. The test must come from the same network position as the app. What should the developer do?",
    opts: [
      "Create an AWS CloudShell VPC environment in the app's subnet with the app's security group, and test the connections from it.",
      "Open a standard AWS CloudShell session, and test both connections from it with the database and cache client tools.",
      "Run a test Lambda function that isn't attached to the VPC from the Lambda console, and log each connection's result.",
      "Use the RDS query editor to connect to both the database and the cache, and run a test command against each one."
    ], a: 0,
    no: [null,
      "A standard CloudShell environment runs outside the VPC, so it can't reach the private endpoints.",
      "A function outside the VPC has no path to private endpoints either, so it would only show timeouts.",
      "The query editor works only with Aurora clusters that have the Data API turned on, not RDS for MySQL or ElastiCache."],
    why: "A CloudShell VPC environment runs in a subnet you choose, with up to five security groups, so it reaches VPC resources the way the app does. Its storage is ephemeral and is deleted when the environment times out.",
    doc: ["https://docs.aws.amazon.com/cloudshell/latest/userguide/using-cshell-in-vpc.html", "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/query-editor.html"] },

  { id: "dva-4-404", exam: "DVA", dva: "4.1", topic: "cloudtrail", type: "multi", hint: "Select TWO.",
    q: "Objects keep disappearing from an S3 bucket. A developer searches CloudTrail Event history for DeleteObject calls on the bucket and finds none. The account's only trail logs management events. From now on, the team must record which principal deletes each object in the bucket. Which approaches will capture this? (Select TWO.)",
    items: [
      { t: "Add S3 data events for the bucket to a trail, which then records each object-level call, such as DeleteObject, with its userIdentity.", ok: true },
      { t: "Turn on S3 server access logging for the bucket, which records each request's operation, such as REST.DELETE.OBJECT, and its requester.", ok: true },
      { t: "Filter Event history by the bucket's resource name and the s3.amazonaws.com event source, and search further back in time.", ok: false, no: "Event history shows only management events, so object-level deletes never appear there." },
      { t: "Turn on AWS Config recording for S3 buckets, and review the bucket's configuration timeline after each deletion.", ok: false, no: "AWS Config records changes to the bucket's configuration, such as its policy, not individual object deletions." },
      { t: "Turn on S3 request metrics in CloudWatch for the bucket, and set an alarm on the DeleteRequests metric.", ok: false, no: "Request metrics count requests; they don't say who made them." }
    ],
    why: "S3 object-level calls such as DeleteObject are CloudTrail data events, which trails don't log by default and Event history never shows. Data events on a trail, or S3 server access logs, record each request with the identity that made it.",
    doc: ["https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/LogFormat.html"] },

  { id: "dva-4-405", exam: "DVA", dva: "4.3", topic: "elasticache", type: "mc",
    q: "A product service caches database query results in an ElastiCache for Memcached cluster of two nodes, using lazy loading with a 24-hour TTL. Since the catalog doubled in size, database load has climbed, and many items are missing from the cache minutes after they were cached. The cluster's Evictions metric rises steadily, while its CPU use stays low. What should the developer do?",
    opts: [
      "Add nodes to the cluster or move it to a larger node type, so that the cache has the memory to hold the items that are read often.",
      "Raise the TTL from 24 hours to 7 days, so that each item stays in the cache for longer before it has to be loaded again.",
      "Switch from lazy loading to write-through, so that every item is written to the cache whenever it is saved to the database.",
      "Move the cluster to a node type with more vCPUs and the same memory, so that each node can serve more requests per second."
    ], a: 0,
    no: [null,
      "Evictions remove items that haven't expired yet because memory is full, so a longer TTL keeps nothing in the cache any longer.",
      "Write-through also caches items that are never read, so memory would fill sooner and evictions would rise.",
      "CPU use is low, so CPU isn't the limit. More vCPUs with the same memory leave the evictions as they are."],
    why: "The Evictions metric counts items that hadn't expired but were removed to make room for new writes. When it passes the team's threshold, AWS recommends scaling the cluster up to a larger node type or out by adding nodes, so the items in use fit in memory.",
    doc: ["https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.Memcached.html", "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.WhichShouldIMonitor.html", "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html"] }
);
