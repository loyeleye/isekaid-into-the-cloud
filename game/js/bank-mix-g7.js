// Question bank batch (one build, Oct 25): more practice on the three tasks the coverage audit (tools/exam_check.js)
// found thinnest for each exam: SAA-C03 task 3.1 (high-performing and scalable storage), SAA-C03 task 3.4
// (high-performing and scalable network architectures) and DVA-C02 task 3.3 (automate deployment testing). Same schema
// and rules as js/bank-dva.js and js/bank-saa.js. Facts checked against the AWS docs in October 2026.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // ---------------------------------------------------------------- SAA-C03 task 3.1: storage that performs and scales

  // S3 Express One Zone
  { id: "saa-3-701", exam: "SAA", saa: "3.1", topic: "s3", type: "mc",
    q: "A machine learning team trains models on EC2 instances in one Availability Zone. Each epoch reads millions of small objects, and reads from S3 Standard add too much latency. The team needs object storage with single-digit millisecond access next to the instances. What should a solutions architect recommend?",
    opts: [
      "Turn on S3 Transfer Acceleration for the existing bucket, so the instances read the objects through the nearest edge location.",
      "Create an S3 Express One Zone directory bucket in the instances' Availability Zone and read the training data from it.",
      "Move the objects to S3 Intelligent-Tiering, so the objects read most often stay in the frequent access tier for the instances.",
      "Move the objects to S3 Standard-Infrequent Access, which serves each read from fewer storage nodes than S3 Standard does."
    ], a: 1,
    no: [
      "Transfer Acceleration speeds up long-distance transfers over the internet. It doesn't help instances in the same Region.",
      null,
      "Intelligent-Tiering saves money on objects with changing access patterns. Its frequent tier performs like S3 Standard.",
      "Standard-IA is cheaper storage for data read rarely, with a retrieval fee. It isn't faster than S3 Standard."],
    why: "S3 Express One Zone stores objects in directory buckets in a single Availability Zone you choose. Placed next to the compute, it gives consistent single-digit millisecond access for request-heavy workloads such as training.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-express-one-zone.html"] },

  // EBS Elastic Volumes
  { id: "saa-3-702", exam: "SAA", saa: "3.1", topic: "ebs", type: "mc",
    q: "A reporting database on EC2 uses one gp2 EBS volume. At month end it needs more IOPS than the volume's size gives it, and the company can't take the database offline to change storage. What should a solutions architect do?",
    opts: [
      "Snapshot the volume, create a gp3 volume with higher IOPS from the snapshot, and swap it in at the next maintenance window.",
      "Move the database's data files to the instance store volumes, which give the highest IOPS available to the instance.",
      "Modify the attached volume to gp3 with Elastic Volumes, setting the IOPS and throughput it needs, while in use.",
      "Attach four more gp2 volumes and stripe them with the existing volume into a RAID 0 array inside the operating system."
    ], a: 2,
    no: [
      "This works, but restoring and swapping volumes needs downtime, which the company can't take.",
      "Instance store data is lost when the instance stops or fails, so it can't hold a database's only copy.",
      null,
      "Rebuilding the disk layout as RAID 0 means moving the data, and it adds failure points to manage."],
    why: "Elastic Volumes changes a volume's type, size, IOPS and throughput while it's attached and in use. On gp3, IOPS and throughput are set separately from size, so the database gets the performance without a bigger volume.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modify-volume.html", "https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html"] },

  // FSx for Windows File Server
  { id: "saa-3-703", exam: "SAA", saa: "3.1", topic: "fsx", type: "mc",
    q: "A company moves a Windows application to EC2 instances in two Availability Zones. The instances share files over SMB, and users' access is controlled by Active Directory groups. The file storage must be fully managed and survive the loss of one Availability Zone. Which solution meets these requirements?",
    opts: [
      "Amazon EFS with a mount target in each Availability Zone, mounted on every Windows instance as a network drive.",
      "Amazon FSx for Lustre linked to an S3 bucket, mounted on every instance through its file system client.",
      "An Amazon S3 File Gateway on an EC2 instance, sharing an S3 bucket to the instances over SMB.",
      "A Multi-AZ Amazon FSx for Windows File Server file system joined to the company's Active Directory."
    ], a: 3,
    no: [
      "EFS serves NFS to Linux clients. Windows instances can't mount it.",
      "FSx for Lustre is a high-performance file system for Linux compute clusters, not SMB shares for Windows.",
      "A File Gateway is meant for on-premises access to S3, and one gateway instance is a single point of failure.",
      null],
    why: "FSx for Windows File Server is a managed Windows file server: SMB shares, NTFS permissions and Active Directory integration. A Multi-AZ file system keeps a standby in a second Availability Zone and fails over automatically.",
    doc: ["https://docs.aws.amazon.com/fsx/latest/WindowsGuide/what-is.html", "https://docs.aws.amazon.com/fsx/latest/WindowsGuide/high-availability-multiAZ.html"] },

  // EBS Multi-Attach
  { id: "saa-3-704", exam: "SAA", saa: "3.1", topic: "ebs", type: "mc",
    q: "A clustered application on three Nitro-based EC2 instances in one Availability Zone needs one shared block device that all three write to at the same time. The application uses a cluster-aware file system to coordinate the writes. Which storage meets this requirement?",
    opts: [
      "A gp3 EBS volume with Multi-Attach enabled, attached to all three instances.",
      "An io2 EBS volume with Multi-Attach enabled, attached to all three instances.",
      "An Amazon EFS file system mounted on all three instances over NFS.",
      "The instance store of the first instance, shared to the other two over iSCSI."
    ], a: 1,
    no: [
      "Multi-Attach is supported only on Provisioned IOPS SSD volumes (io1 and io2), not on gp3.",
      null,
      "EFS is shared file storage, not a block device, and the application needs a block device.",
      "Instance store disappears when that instance stops or fails, taking the whole cluster's data with it."],
    why: "EBS Multi-Attach lets one Provisioned IOPS SSD volume attach to several Nitro-based instances in the same Availability Zone. Each instance can read and write, so the application must coordinate writes, for example with a cluster-aware file system.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes-multi.html"] },

  // DataSync for hybrid storage
  { id: "saa-3-705", exam: "SAA", saa: "3.1", topic: "datasync", type: "mc",
    q: "A company is moving 200 TB of files from an on-premises NFS server to Amazon EFS over its Direct Connect link. Users keep changing files until cutover, so after the first copy only the changes should move each night, and every transfer must be verified. Which solution has the LEAST operational overhead?",
    opts: [
      "Order AWS Snowball Edge devices for the first copy, then run rsync from an EC2 instance each night for the changes.",
      "Deploy an Amazon S3 File Gateway on premises, copy the files to it, and have the gateway write them to Amazon EFS.",
      "Run a scheduled AWS DataSync task from an on-premises agent to the EFS file system, with data verification turned on.",
      "Mount the EFS file system on the NFS server over Direct Connect and copy the changed files with a nightly cron job."
    ], a: 2,
    no: [
      "Two separate tools and a self-run rsync job mean more to build, schedule and check by hand.",
      "An S3 File Gateway stores files as objects in S3. It doesn't write to Amazon EFS.",
      null,
      "A home-made copy job has no built-in verification, retries or reporting, so someone has to build and watch them."],
    why: "DataSync copies between on-premises storage and AWS storage services such as EFS through an agent. A task can run on a schedule, copies only what changed since the last run, and can verify the data it transferred.",
    doc: ["https://docs.aws.amazon.com/datasync/latest/userguide/what-is-datasync.html", "https://docs.aws.amazon.com/datasync/latest/userguide/configure-data-verification-options.html"] },

  // ---------------------------------------------------------------- SAA-C03 task 3.4: networks that perform and scale

  // Subnet tiers and routing
  { id: "saa-3-706", exam: "SAA", saa: "3.4", topic: "vpc", type: "multi", hint: "Select TWO.",
    q: "A three-tier web application runs in a VPC across two Availability Zones: an internet-facing Application Load Balancer, application instances and an RDS database. The application instances must download patches from the internet, and nothing on the internet may reach them or the database directly. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Place the load balancer in public subnets whose route table sends 0.0.0.0/0 to the VPC's internet gateway.", ok: true },
      { t: "Place the instances in private subnets whose route table sends 0.0.0.0/0 to a NAT gateway in a public subnet.", ok: true },
      { t: "Place the instances in public subnets without public IP addresses, using the internet gateway route for patches.", ok: false, no: "Without a public IP address an instance in a public subnet can't use the internet gateway at all." },
      { t: "Place the database in private subnets with a 0.0.0.0/0 route to the internet gateway for engine updates.", ok: false, no: "A route to an internet gateway makes those subnets public, and RDS applies engine updates without one." },
      { t: "Place the load balancer in private subnets with a route to the NAT gateway, so clients reach it through NAT.", ok: false, no: "A NAT gateway only lets traffic start from inside. An internet-facing load balancer needs public subnets." }
    ],
    why: "A public subnet is one whose route table has a route to an internet gateway. Put only the internet-facing load balancer there. Private subnets reach out through a NAT gateway, which allows connections started from inside and nothing started from the internet; the database tier needs no internet route at all.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html", "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html"] },

  // ALB path-based routing
  { id: "saa-3-707", exam: "SAA", saa: "3.4", topic: "elb", type: "mc",
    q: "A company serves www.example.com from one fleet of EC2 instances. It is splitting the site so that requests under /api/ go to a new fleet of containers on Amazon ECS while everything else stays on the instances. Clients must keep using the same domain name. Which solution meets these requirements?",
    opts: [
      "A Network Load Balancer with one listener on port 443 and a target group for each fleet, chosen by the request's path.",
      "Route 53 weighted records for www.example.com, sending the /api/ share of requests to the container fleet's address.",
      "An Application Load Balancer for each fleet, both listed in one Route 53 simple record for www.example.com.",
      "An Application Load Balancer with a listener rule for the path /api/* that forwards to the containers' target group."
    ], a: 3,
    no: [
      "A Network Load Balancer works at layer 4 and can't see HTTP paths.",
      "DNS answers with an address before any request is sent, so Route 53 can't route by path.",
      "A record with several values sends each client to a random load balancer, whatever the request's path.",
      null],
    why: "An Application Load Balancer reads each HTTP request, and its listener rules can forward by path or host header to different target groups. The rule for /api/* sends those requests to the containers, and the default action keeps the rest on the instances.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-listeners.html", "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-condition-types.html"] },

  // VPC IP addressing
  { id: "saa-3-708", exam: "SAA", saa: "3.4", topic: "vpc", type: "mc",
    q: "A VPC with the CIDR block 10.0.0.0/24 has run out of free IP addresses in its subnets as an Auto Scaling group grows. The company wants to keep the same VPC and its existing resources. What should a solutions architect do?",
    opts: [
      "Add a secondary IPv4 CIDR block to the VPC, then create new subnets in it for the group to launch into.",
      "Edit each subnet's CIDR block to a larger one, so that every existing subnet gains free addresses.",
      "Change the VPC's primary CIDR block to 10.0.0.0/16, which keeps the current addresses and adds more.",
      "Create a second VPC with the same CIDR block and peer it to the first, then launch the extra instances there."
    ], a: 0,
    no: [null,
      "A subnet's CIDR block can't be changed after it's created.",
      "A VPC's primary CIDR block can't be changed. You can only add secondary blocks.",
      "VPC peering doesn't work between VPCs with overlapping CIDR blocks."],
    why: "A VPC can have secondary IPv4 CIDR blocks added after it's created. New subnets in the added range give the group room to grow, while existing subnets and resources stay as they are.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html"] },

  // VPN as a backup for Direct Connect
  { id: "saa-3-709", exam: "SAA", saa: "3.4", topic: "directconnect", type: "mc",
    q: "A company connects its data center to a VPC through a single AWS Direct Connect connection. It needs a backup path if that connection fails, and can accept lower bandwidth while the backup is in use. Which solution is the MOST cost-effective?",
    opts: [
      "Order a second Direct Connect connection at another Direct Connect location and use it with the first one.",
      "Create an AWS Site-to-Site VPN connection to the same virtual private gateway and let BGP prefer Direct Connect.",
      "Peer the VPC with a second VPC in another Region that has its own internet gateway for on-premises traffic.",
      "Put an Amazon CloudFront distribution in front of the VPC's applications for on-premises users to use instead."
    ], a: 1,
    no: [
      "A second connection gives the most resilience, but it costs far more than a VPN when lower bandwidth is acceptable.",
      null,
      "Peering connects VPCs to each other. It gives the data center no new path into AWS.",
      "CloudFront caches web content for viewers. It isn't a private network path for the data center."],
    why: "A Site-to-Site VPN over the internet is a low-cost backup for Direct Connect. With both on the same gateway, BGP prefers the Direct Connect route while it's up and moves traffic to the VPN when it fails.",
    doc: ["https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html", "https://docs.aws.amazon.com/directconnect/latest/UserGuide/resiliency_toolkit.html"] },

  // NLB for TCP with static IPs
  { id: "saa-3-710", exam: "SAA", saa: "3.4", topic: "elb", type: "mc",
    q: "A game's servers on EC2 accept long-lived TCP connections on a custom port from millions of players. Partners' firewalls allow traffic only to fixed IP addresses, one per Availability Zone. Which load balancing solution meets these requirements?",
    opts: [
      "An Application Load Balancer with an Elastic IP address assigned in each subnet, forwarding to the game servers.",
      "A Gateway Load Balancer in each Availability Zone, sending the players' TCP traffic on to the game servers.",
      "A Network Load Balancer with an Elastic IP address assigned in each subnet, forwarding TCP to the game servers.",
      "An Amazon CloudFront distribution with the game servers as its origin, which gives partners its IP address ranges."
    ], a: 2,
    no: [
      "An Application Load Balancer handles HTTP and HTTPS, and it can't be given Elastic IP addresses.",
      "A Gateway Load Balancer sends traffic through security appliances such as firewalls. It isn't for serving an application.",
      null,
      "CloudFront serves HTTP and HTTPS, not raw TCP on a custom port, and its edge addresses aren't fixed per Availability Zone."],
    why: "A Network Load Balancer works at layer 4, handles millions of requests per second and long-lived TCP connections, and gives each enabled Availability Zone a static IP address, which can be an Elastic IP address you assign.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html", "https://docs.aws.amazon.com/elasticloadbalancing/latest/network/network-load-balancers.html"] },

  // ---------------------------------------------------------------- DVA-C02 task 3.3: automate deployment testing

  // CodeDeploy BeforeAllowTraffic hook
  { id: "dva-3-701", exam: "DVA", dva: "3.3", topic: "codedeploy", type: "mc",
    q: "CodeDeploy shifts traffic on a Lambda alias from version 4 to version 5. Before any traffic moves, a set of smoke tests must run against version 5, and the deployment must stop and roll back if they fail. What should the developer do?",
    opts: [
      "Add a CodeBuild action after the deploy action in the pipeline that runs the smoke tests and fails the pipeline if any fail.",
      "Add an on-failure destination to version 5 that sends failed invocations to an SQS queue for the team to review.",
      "Add a BeforeAllowTraffic hook to the AppSpec file that runs a Lambda function with the tests and reports pass or fail.",
      "Add a CloudWatch alarm on version 5's Errors metric to the deployment group, so CodeDeploy rolls back when it fires."
    ], a: 2,
    no: [
      "By the time a later pipeline action runs, CodeDeploy has already moved traffic to version 5.",
      "A destination records failed asynchronous invocations. It doesn't test anything or stop a deployment.",
      null,
      "An alarm reacts to errors from real traffic after it moves. It doesn't run tests before the shift."],
    why: "For Lambda deployments, the AppSpec file can name hook functions for BeforeAllowTraffic and AfterAllowTraffic. The hook runs the tests and reports Succeeded or Failed to CodeDeploy with PutLifecycleEventHookExecutionStatus; a failure stops the deployment and rolls it back.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html"] },

  // API Gateway canary release
  { id: "dva-3-702", exam: "DVA", dva: "3.3", topic: "apigateway", type: "mc",
    q: "A REST API in API Gateway has a prod stage. A developer wants 10% of prod requests to use a new deployment for a day, compare its metrics with the current one, and then move all traffic to it. Clients must keep calling the same stage URL. What should the developer do?",
    opts: [
      "Deploy the new version to a new stage named prod-v2 and share its invoke URL with 10% of the client applications.",
      "Turn on canary settings for the prod stage with 10% of traffic, deploy to the canary, then promote the canary.",
      "Attach a usage plan to the prod stage that sends 10% of each API key's quota to the latest deployment.",
      "Set a stage variable on prod to the new Lambda alias, so the new deployment receives a share of the requests."
    ], a: 1,
    no: [
      "A new stage has a different URL, and choosing which clients use it is manual work.",
      null,
      "Usage plans throttle and limit requests per API key. They don't split traffic between deployments.",
      "A stage variable sends all of the stage's requests to the value it holds. It doesn't split them."],
    why: "A canary release on a REST API stage sends a set percentage of requests to a new deployment while the rest use the current one. The canary's metrics and logs are kept separately, and promoting it makes the new deployment the stage's own.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/canary-release.html"] },

  // CodeBuild test reports
  { id: "dva-3-703", exam: "DVA", dva: "3.3", topic: "codebuild", type: "multi", hint: "Select TWO.",
    q: "A CodeBuild project runs a Java project's unit and integration tests, which write JUnit XML result files. The team wants each build's pass and fail counts, and their trend over time, in CodeBuild without building a dashboard. Which steps do this? (Select TWO.)",
    items: [
      { t: "Add a reports section to the buildspec that names the JUnit XML files and their file format.", ok: true },
      { t: "Make sure the build's service role is allowed to create report groups and add test reports to them.", ok: true },
      { t: "List the XML files in the buildspec's artifacts section, so CodeBuild publishes them as a test report.", ok: false, no: "Artifacts are uploaded to S3 as build output. CodeBuild doesn't read them as test results." },
      { t: "Turn on CodeGuru Reviewer for the repository, so it reports the test results on each pull request.", ok: false, no: "CodeGuru Reviewer comments on code quality and security. It doesn't run or report tests." },
      { t: "Send the build logs to CloudWatch Logs and turn on the project's test-report option in its log settings.", ok: false, no: "Logs hold the build's console output. There is no log setting that makes a test report." }
    ],
    why: "CodeBuild test reports come from the buildspec's reports section, which names result files in a supported format such as JUnit XML. CodeBuild adds each build's report to a report group, which shows pass rates and durations over time. The service role needs permission to create report groups and reports.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/test-reporting.html", "https://docs.aws.amazon.com/codebuild/latest/userguide/test-permissions.html"] },

  // CodePipeline test stage
  { id: "dva-3-704", exam: "DVA", dva: "3.3", topic: "codepipeline", type: "mc",
    q: "A pipeline in CodePipeline deploys an application to a staging environment and then to production. Integration tests must run against staging on every change, and a failure must stop the change from reaching production, with no one watching. What should the developer add?",
    opts: [
      "A manual approval action between the staging and production stages, so a tester checks staging before the change moves on.",
      "A test stage between staging and production with a CodeBuild action that runs the tests and fails when any test fails.",
      "An EventBridge rule that starts a CodeBuild test project when the production deployment succeeds, and notifies on failure.",
      "A CodeDeploy AfterInstall hook in the production deployment that runs the integration tests against the new production hosts."
    ], a: 1,
    no: [
      "A manual approval waits for a person, so it isn't automated testing.",
      null,
      "Testing after production has already been deployed can only report a failure, not prevent it.",
      "That tests production after the change reaches it, not staging before it."],
    why: "A pipeline runs its stages in order, and a failed action stops the run in that stage. A CodeBuild test action after the staging deploy runs the integration tests, and when it fails the change never reaches the production stage.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/concepts.html", "https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodeBuild.html"] },

  // Lambda alias weighted routing
  { id: "dva-3-705", exam: "DVA", dva: "3.3", topic: "lambda", type: "mc",
    q: "Clients call a Lambda function through its live alias, which points to version 7. Without setting up CodeDeploy, a developer wants 5% of those calls to run version 8 for a few hours to test it with real traffic, and to be able to undo that at once. What should the developer do?",
    opts: [
      "Point the live alias at version 8 and set version 8's reserved concurrency to 5% of the account's concurrency.",
      "Configure provisioned concurrency on version 8 for 5% of the function's traffic and keep the alias on version 7.",
      "Ask clients to call $LATEST for 5% of their requests, since $LATEST always runs the most recent code.",
      "Add version 8 to the live alias's routing configuration with a weight of 5%, and remove it to roll back."
    ], a: 3,
    no: [
      "Reserved concurrency caps how many copies can run at once. It doesn't split traffic between versions.",
      "Provisioned concurrency keeps environments warm. It doesn't send any traffic to a version.",
      "That changes every client, and $LATEST is unpublished code that can change under the test.",
      null],
    why: "A Lambda alias can route to two versions with weights. Adding version 8 at 5% sends that share of the alias's calls to it, and setting the weight back to 0 or removing it ends the test straight away. CodeDeploy automates the same weighted shift.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html"] }
);
