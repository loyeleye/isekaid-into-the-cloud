// Question bank batch: "at least 3" round, mix f6. Elastic Beanstalk, ECR, Systems Manager, OpenSearch, AWS Health
// Dashboard, Managed Grafana, Managed Service for Prometheus, Service Catalog, AWS Transform MGN, Transfer Family,
// Serverless Application Repository, Wavelength, Device Farm, Amplify, EKS Distro and Amazon Q Developer.
// Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // SAA Domain 1
  { id: "saa-1-561", exam: "SAA", saa: "1.2", topic: "ssm", type: "mc",
    q: "A company has 300 Linux EC2 instances and 80 Linux servers in its data center. Security requires that all of them get OS security patches every weekend, with a compliance report that shows which machines are missing patches. Staff must not log in to machines to patch them, and the company wants one AWS service for both environments. Which solution meets these requirements?",
    opts: [
      "Register the data center servers with a Systems Manager hybrid activation, and patch all nodes on a schedule with Patch Manager.",
      "Turn on Amazon Inspector for the EC2 instances and the data center servers, and have it install the missing patches it finds each weekend.",
      "Build a new AMI with EC2 Image Builder every weekend, and roll it out to the EC2 instances and to the data center servers in turn.",
      "Add an AWS Config rule that checks each machine for missing patches, and send the noncompliant machines to staff to update each week."
    ], a: 0,
    no: [null,
      "Inspector finds software vulnerabilities and reports them. It doesn't install patches.",
      "An AMI launches new EC2 instances. It can't patch the servers already running in the data center.",
      "Config can flag noncompliance, but staff would still patch by hand, which the company ruled out."],
    why: "A hybrid activation registers on-premises servers with Systems Manager as managed nodes alongside EC2 instances. Patch Manager then scans for and installs patches against a patch baseline on a schedule, and reports patch compliance for every node.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/userguide/activations.html", "https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager.html"] },

  { id: "saa-1-562", exam: "SAA", saa: "1.2", topic: "amplify", type: "multi", hint: "Select TWO.",
    q: "A Next.js app with server-side rendering is hosted on AWS Amplify Hosting. Security requires blocking SQL injection attempts and all requests from two countries. The app's server-side code must also read objects from a private S3 bucket without using long-lived access keys. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create an AWS WAF web ACL in the Global (CloudFront) Region with the needed rules, and associate it with the Amplify app.", ok: true },
      { t: "Create an IAM role that Amplify can assume, with read access to the bucket, and add it to the app as its SSR Compute role.", ok: true },
      { t: "Create an AWS WAF web ACL in the app's own Region with the needed rules, and associate it with the Amplify app.", ok: false, no: "Amplify accepts only web ACLs created in the Global (CloudFront) Region. Regional web ACLs aren't compatible with it." },
      { t: "Create an IAM user with read access to the bucket, and store its access keys as secret environment variables on the app.", ok: false, no: "That relies on long-lived access keys, which the requirement rules out." },
      { t: "Add network ACL rules that deny the two countries' IP ranges to the subnets where the app's server-side code runs.", ok: false, no: "Amplify Hosting doesn't run the app in the company's subnets, and network ACLs can't inspect requests for SQL injection." }
    ],
    why: "Amplify's firewall support associates a web ACL from the Global (CloudFront) Region with the app, and AWS WAF rules can block SQL injection and filter by country of origin. An SSR Compute role gives the server-side code temporary credentials from an IAM role instead of stored keys.",
    doc: ["https://docs.aws.amazon.com/amplify/latest/userguide/amplify-waf-configuration.html", "https://docs.aws.amazon.com/amplify/latest/userguide/amplify-SSR-compute-role.html"] },

  { id: "saa-1-563", exam: "SAA", saa: "1.1", topic: "eks", type: "multi", hint: "Select TWO.",
    q: "A company plans to run Amazon EKS Distro on its own servers in its data center for an internal platform. Before approving the design, the architecture review board wants the company's responsibilities and the benefits recorded correctly. Which statements about this design are correct? (Select TWO.)",
    items: [
      { t: "The company runs, upgrades and backs up the Kubernetes control plane components, such as etcd and the API server, itself.", ok: true },
      { t: "The clusters run the same Kubernetes versions and dependencies that Amazon EKS deploys, with security patches built by AWS.", ok: true },
      { t: "The company's AWS Support plan covers the clusters, so AWS Support engineers can help troubleshoot problems in them.", ok: false, no: "EKS Distro deployments aren't covered by AWS Support plans." },
      { t: "The clusters appear in the Amazon EKS console automatically, where the company can upgrade them with a single action.", ok: false, no: "EKS Distro clusters aren't EKS clusters. The EKS Connector can show a cluster in the console, but only for viewing." },
      { t: "AWS runs the control plane in an AWS Region and charges an hourly fee per cluster, in the same way as for Amazon EKS.", ok: false, no: "That describes Amazon EKS. With EKS Distro there is no AWS-managed control plane." }
    ],
    why: "EKS Distro is the Kubernetes distribution that Amazon EKS uses, with extended security patching, for customers to install and run themselves. AWS doesn't operate those clusters, and EKS Distro deployments aren't covered by AWS Support plans.",
    doc: ["https://docs.aws.amazon.com/eks/latest/userguide/eks-deployment-options.html"] },

  // SAA Domain 2
  { id: "saa-2-561", exam: "SAA", saa: "2.1", topic: "beanstalk", type: "mc",
    q: "A company runs a Java web app as a WAR file on Tomcat servers in its data center. It wants to move the app to AWS quickly, without code changes or containerizing it. AWS must provision the load balancer and Auto Scaling, monitor health and apply platform patches in a weekly maintenance window, but the team must keep access to the EC2 instances. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Deploy the WAR file to a load-balanced Elastic Beanstalk environment on the Tomcat platform, with managed platform updates turned on.",
      "Rewrite the request handlers as Lambda functions behind Amazon API Gateway, and package the shared libraries as Lambda layers.",
      "Build a container image of Tomcat and the WAR file, and run it as an Amazon ECS service on AWS Fargate behind an Application Load Balancer.",
      "Write CloudFormation templates for EC2 instances in an Auto Scaling group behind an ALB, and patch the instances with cron scripts."
    ], a: 0,
    no: [null,
      "That means rewriting the app, which the company ruled out.",
      "That means containerizing the app, and Fargate gives no access to the underlying instances.",
      "That works, but the team would build and maintain the templates and the patching itself, which is far more overhead."],
    why: "Elastic Beanstalk provisions the EC2 instances, load balancing, Auto Scaling and health monitoring for a WAR file on its Tomcat platform, and managed platform updates apply new platform versions in a scheduled maintenance window. The instances stay in the company's account.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/Welcome.html", "https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environment-platform-update-managed.html"] },

  { id: "saa-2-562", exam: "SAA", saa: "2.2", topic: "ecr", type: "multi", hint: "Select TWO.",
    q: "A company runs containers on Amazon ECS in a production account in us-east-1. Its disaster recovery plan uses a separate DR account in us-west-2. Every image pushed to the production Amazon ECR registry must be copied automatically to the DR account's registry in us-west-2, so that recovery doesn't depend on reaching us-east-1. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "In the production account's registry settings, add a replication rule whose destination is us-west-2 in the DR account.", ok: true },
      { t: "In the DR account, add a registry permissions policy that allows the production account ecr:ReplicateImage and ecr:CreateRepository.", ok: true },
      { t: "In the DR account, add a pull through cache rule whose upstream registry is the production account's Amazon ECR registry.", ok: false, no: "A pull through cache copies an image only when it is first pulled, so images nobody has pulled would be missing if us-east-1 is unavailable." },
      { t: "Add a repository policy to each production repository that grants the DR account ecr:BatchGetImage and ecr:GetDownloadUrlForLayer.", ok: false, no: "That lets the DR account pull from us-east-1, but it copies nothing, so recovery would still depend on us-east-1." },
      { t: "Create an interface VPC endpoint for Amazon ECR in the DR account's VPC in us-west-2, and pull the images through it.", ok: false, no: "An endpoint gives private network access to ECR. It doesn't copy any images to us-west-2." }
    ],
    why: "ECR private registry replication copies images to other Regions and accounts as they are pushed. For cross-account replication, the destination registry's permissions policy must allow the source account to replicate images, and to create repositories unless they already exist.",
    doc: ["https://docs.aws.amazon.com/AmazonECR/latest/userguide/replication.html", "https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache.html"] },

  { id: "saa-2-563", exam: "SAA", saa: "2.2", topic: "health", type: "mc",
    q: "Operations staff check the AWS Health Dashboard by hand and sometimes miss events, such as scheduled maintenance, that affect the company's own resources. The company wants each new AWS Health event for its account sent automatically to an SNS topic that pages the team. The account has the AWS Basic Support plan, and the company won't change its plan. Which solution meets these requirements?",
    opts: [
      "Create an Amazon EventBridge rule that matches events from the aws.health source, and set the SNS topic as the rule's target.",
      "Run a scheduled Lambda function that calls the AWS Health API's DescribeEvents operation and publishes new events to the topic.",
      "Create a CloudTrail trail and an EventBridge rule that matches AWS Health API calls, and send the matching records to the topic.",
      "Turn on the AWS Trusted Advisor weekly email for the account, and forward each email to the SNS topic's subscribers."
    ], a: 0,
    no: [null,
      "The AWS Health API needs a Business-level or higher AWS Support plan, which the company doesn't have.",
      "CloudTrail records API calls made in the account. Health events aren't API calls, so the trail wouldn't capture them.",
      "Trusted Advisor checks the account against best practices. It doesn't report AWS Health events."],
    why: "AWS Health sends events to Amazon EventBridge at no additional cost for every customer, and an EventBridge rule can route them to an SNS topic. The AWS Health API, by contrast, requires a higher AWS Support plan.",
    doc: ["https://docs.aws.amazon.com/health/latest/ug/cloudwatch-events-health.html", "https://docs.aws.amazon.com/health/latest/ug/what-is-aws-health.html"] },

  { id: "saa-2-564", exam: "SAA", saa: "2.2", topic: "prometheus", type: "mc",
    q: "A company sends Prometheus metrics from its Amazon EKS clusters to an Amazon Managed Service for Prometheus workspace. Today a Prometheus server in each cluster scrapes the metrics and forwards them with remote_write, and the team must patch and scale those servers. The team wants to stop running any collector in the clusters, and the scraped metrics must not cross the public internet. Which solution meets these requirements?",
    opts: [
      "Create an AWS managed collector (scraper) for each cluster that writes to the workspace, and remove the Prometheus servers.",
      "Replace the Prometheus servers with AWS Distro for OpenTelemetry collectors deployed as a DaemonSet, and send the metrics to the workspace.",
      "Turn on CloudWatch Container Insights for the clusters, and build dashboards on the metrics it stores in CloudWatch instead of the workspace.",
      "Expose each cluster's /metrics endpoints through a public Network Load Balancer, and have the workspace pull the metrics on a schedule."
    ], a: 0,
    no: [null,
      "ADOT collectors are still agents in the cluster that the team must deploy, scale and update.",
      "That moves the metrics out of the Prometheus workspace, and Container Insights still runs an agent in each cluster.",
      "A workspace doesn't scrape endpoints by itself, and a public load balancer would send the metrics across the internet."],
    why: "A managed collector is an agentless scraper that Amazon Managed Service for Prometheus runs for you. It reaches the cluster through network interfaces in the cluster's subnets and writes to the workspace through a VPC endpoint, so the scraped data never travels on the public internet.",
    doc: ["https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-collector.html", "https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-collector-how-to.html"] },

  { id: "saa-2-565", exam: "SAA", saa: "2.1", topic: "transfer", type: "multi", hint: "Select TWO.",
    q: "A distributor exchanges EDI documents with large retail partners that require the AS2 protocol with signed receipts (MDNs). Partners send purchase orders to the distributor, and the distributor sends invoices back to each partner's own AS2 server. Received files must land in Amazon S3, and the company doesn't want to run any servers. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create an AWS Transfer Family AS2 server with S3 storage, with profiles, certificates and an agreement for each partner.", ok: true },
      { t: "Create an AWS Transfer Family AS2 connector for each partner, and use it to send the invoice files to that partner's AS2 server.", ok: true },
      { t: "Create an AWS Transfer Family server with the SFTP protocol, and give each partner an SSH key to upload its purchase orders.", ok: false, no: "The partners require AS2 with signed receipts. SFTP is a different protocol." },
      { t: "Create an Amazon MQ broker, and have the partners send their purchase orders to a queue on it from their AS2 software.", ok: false, no: "Amazon MQ speaks message broker protocols such as AMQP and MQTT, not AS2." },
      { t: "Create an AWS DataSync task for each partner that copies files between the partner's AS2 server and the S3 bucket on a schedule.", ok: false, no: "DataSync copies data between storage systems such as NFS, SMB, HDFS and object storage. It doesn't speak AS2." }
    ],
    why: "Transfer Family supports AS2: an AS2-enabled server receives messages into S3 under an agreement that combines the server, the local and partner profiles and their certificates. Sending files to a partner's external AS2 server requires a connector.",
    doc: ["https://docs.aws.amazon.com/transfer/latest/userguide/create-b2b-server.html"] },

  { id: "saa-2-566", exam: "SAA", saa: "2.1", topic: "sar", type: "mc",
    q: "Six product teams each copy the same alerting component, an SNS topic plus a Lambda function and its IAM role, into their own AWS SAM templates, so every bug fix must be made six times. A platform team wants to maintain the component in one place, let each team include a chosen version of it in that team's own stack, and keep it private to the company's organization. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Publish the component to the AWS Serverless Application Repository, share it with the organization, and nest it in each team's template.",
      "Package the function's code as a Lambda layer shared with the organization, and have each team reference a layer version from its own function.",
      "Deploy the component to every team's account with CloudFormation StackSets, and have each team's stack import the topic ARN as an exported value.",
      "Add the component as an AWS Service Catalog product in a portfolio shared with the organization, and have each team launch it as needed."
    ], a: 0,
    no: [null,
      "A layer shares code and libraries only. The SNS topic and the IAM role would still be copied into every template.",
      "StackSets deploys the component as separate stacks that the platform team updates for everyone at once. Teams can't include a chosen version in their own stacks.",
      "A Service Catalog product is launched as its own provisioned product, not included as part of each team's SAM stack."],
    why: "An AWS::Serverless::Application resource nests an application from the Serverless Application Repository by its ApplicationId and SemanticVersion, so each team's stack deploys the version it pins. Applications can be shared privately with an AWS organization.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-template-nested-applications.html", "https://docs.aws.amazon.com/serverlessrepo/latest/devguide/serverlessrepo-how-to-publish.html"] },

  { id: "saa-2-567", exam: "SAA", saa: "2.1", topic: "amplify", type: "mc",
    q: "A marketing team's static website is built by the company's existing on-premises CI system, which uploads the built files to an Amazon S3 bucket. The site must be served over HTTPS through a global CDN on a custom domain, and it must be password-protected until launch day. The team doesn't want to connect a Git repository or configure a CDN itself. Which solution requires the LEAST effort?",
    opts: [
      "Deploy the site to AWS Amplify Hosting from the S3 bucket, connect the custom domain, and turn on password protection until launch.",
      "Turn on S3 static website hosting for the bucket, point the custom domain at the website endpoint, and limit access with a bucket policy.",
      "Create a CloudFront distribution with origin access control for the bucket, an ACM certificate and a Lambda@Edge function that checks a password.",
      "Copy the files to an Amazon Lightsail instance running a web server, and put a Lightsail distribution with a certificate in front of it."
    ], a: 0,
    no: [null,
      "S3 website endpoints don't support HTTPS, aren't a CDN, and have no user name and password protection.",
      "That meets the requirements, but the team would configure the CDN and write the password check itself, which it wanted to avoid.",
      "That adds a server to manage, and password protection would still have to be built on it."],
    why: "Amplify Hosting can deploy a static site straight from an S3 general purpose bucket in the same account. It serves the site through its CloudFront-based CDN with HTTPS, connects a custom domain, and has built-in password protection.",
    doc: ["https://docs.aws.amazon.com/amplify/latest/userguide/deploy-website-from-s3.html"] },

  { id: "saa-2-568", exam: "SAA", saa: "2.1", topic: "eks", type: "mc",
    q: "A company runs Amazon EKS on AWS, plus self-managed Kubernetes clusters on its own servers and in another cloud provider that it builds with kubeadm and its own automation. It wants every cluster to run the same tested Kubernetes builds and versions that Amazon EKS uses, including security patches, while it keeps its kubeadm automation and manages the clusters itself. Which solution meets these requirements?",
    opts: [
      "Build the self-managed clusters from Amazon EKS Distro, installing its Kubernetes binaries and images with the existing kubeadm automation.",
      "Join the servers in both locations to an Amazon EKS cluster in an AWS Region as Amazon EKS Hybrid Nodes, managed from the EKS console.",
      "Replace the kubeadm automation with Amazon EKS Anywhere, and use its cluster lifecycle tooling to create the clusters in both locations.",
      "Register every self-managed cluster with the Amazon EKS Connector so that each cluster runs the same versions as the Amazon EKS clusters."
    ], a: 0,
    no: [null,
      "Hybrid Nodes aren't supported on another cloud's infrastructure, and AWS would run the control plane instead of the company's own tooling.",
      "EKS Anywhere brings its own cluster lifecycle tooling, but the company must keep its kubeadm automation.",
      "The EKS Connector only shows a cluster in the EKS console. It doesn't install or change the cluster's Kubernetes version."],
    why: "Amazon EKS Distro is the AWS distribution of the Kubernetes components that power Amazon EKS. Customers install it with their own choice of tooling on infrastructure they manage, and they operate and upgrade those clusters themselves.",
    doc: ["https://docs.aws.amazon.com/eks/latest/userguide/eks-deployment-options.html", "https://docs.aws.amazon.com/eks/latest/userguide/hybrid-nodes-overview.html"] },

  { id: "saa-2-569", exam: "SAA", saa: "2.1", topic: "eks", type: "mc",
    q: "A company is considering Amazon EKS Distro to run Kubernetes on 200 servers in its data center, where the workloads must stay. Its operations team is small and doesn't want to run, upgrade or back up the Kubernetes control plane. The data center has a reliable AWS Direct Connect link to a VPC. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Create an Amazon EKS cluster in the Region, and join the data center servers to it as EKS Hybrid Nodes over Direct Connect.",
      "Install Amazon EKS Distro on the servers with kubeadm, and run three control plane nodes with etcd on dedicated servers for availability.",
      "Deploy Amazon EKS Anywhere on the servers, and buy an EKS Anywhere Enterprise Subscription so that AWS takes over the cluster lifecycle.",
      "Create an Amazon EKS cluster with managed node groups in the Region, and register the data center servers with the EKS Connector."
    ], a: 0,
    no: [null,
      "With EKS Distro the company runs and upgrades the control plane itself, which the team wants to avoid.",
      "EKS Anywhere is customer-managed. The subscription adds support and add-ons, but the company still runs the cluster lifecycle.",
      "Managed node groups run on EC2 in AWS, and the EKS Connector registers whole clusters for viewing. It doesn't add servers as nodes."],
    why: "With EKS Hybrid Nodes, AWS manages the EKS control plane in the Region, and the company's on-premises servers join the cluster as nodes over a private connection such as Direct Connect. Hybrid Nodes need a reliable connection to AWS, which the company has.",
    doc: ["https://docs.aws.amazon.com/eks/latest/userguide/hybrid-nodes-overview.html", "https://docs.aws.amazon.com/eks/latest/userguide/eks-deployment-options.html"] },

  // SAA Domain 3
  { id: "saa-3-561", exam: "SAA", saa: "3.4", topic: "mgn", type: "mc",
    q: "A company is migrating 60 servers to AWS with AWS Transform MGN (formerly AWS Application Migration Service). Its security policy says replicated disk data must not travel over the public internet. The data center already has an AWS Direct Connect connection to the target VPC. What should a solutions architect do?",
    opts: [
      "Use a staging area subnet reachable over Direct Connect, and select Use private IP for data replication in the replication template.",
      "Keep the default replication settings, because MGN always encrypts replicated data in transit between the source servers and AWS.",
      "Set up a Site-to-Site VPN connection over the internet to the staging area subnet, and keep the default data routing setting.",
      "Turn on bandwidth throttling in the replication template so that replication traffic is limited to the capacity of the Direct Connect link."
    ], a: 0,
    no: [null,
      "The data is encrypted, but by default it still travels over the public internet to the replication servers' public IP addresses.",
      "A VPN rides over the internet, and with the default setting the data would still go to the replication servers' public IP addresses.",
      "Throttling limits how fast data is sent. It doesn't change the path, which stays the public internet by default."],
    why: "By default, MGN sends replicated data, encrypted, over the internet to the replication servers' public IPs. The Use private IP option routes it to the staging area subnet over an existing private connection such as Direct Connect, a VPN or VPC peering.",
    doc: ["https://docs.aws.amazon.com/mgn/latest/ug/replication-server-settings.html"] },

  { id: "saa-3-562", exam: "SAA", saa: "3.4", topic: "wavelength", type: "multi", hint: "Select TWO.",
    q: "A company has opted in to a carrier's AWS Wavelength Zone and launched a game server in a new subnet there, in its existing VPC. Phones on the carrier's 5G network must be able to connect to the game server, and the server must reach the internet to download updates. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Attach a carrier gateway to the VPC, and add a 0.0.0.0/0 route to it in the Wavelength subnet's route table.", ok: true },
      { t: "Allocate a Carrier IP address from the Wavelength Zone's network border group, and associate it with the game server.", ok: true },
      { t: "Add a 0.0.0.0/0 route to the VPC's internet gateway in the Wavelength subnet's route table.", ok: false, no: "Wavelength subnets reach the carrier network and the internet through a carrier gateway, not an internet gateway." },
      { t: "Allocate an Elastic IP address from the parent Region's public address pool, and associate it with the game server.", ok: false, no: "A Wavelength instance needs a Carrier IP address from the Wavelength Zone's network border group." },
      { t: "Create a NAT gateway in the Wavelength subnet, and route the subnet's 0.0.0.0/0 traffic to the NAT gateway.", ok: false, no: "A NAT gateway allows only outbound connections, so phones couldn't start connections to the game server." }
    ],
    why: "A carrier gateway carries inbound traffic from the carrier network and outbound traffic to the carrier network and the internet. It translates the instance's private address to a Carrier IP address allocated from the zone's network border group.",
    doc: ["https://docs.aws.amazon.com/wavelength/latest/developerguide/carrier-gateways.html", "https://docs.aws.amazon.com/wavelength/latest/developerguide/how-wavelengths-work.html"] },

  { id: "saa-3-563", exam: "SAA", saa: "3.4", topic: "wavelength", type: "mc",
    q: "A company runs real-time video analytics for drones that connect over one carrier's 5G network in two cities, whose Wavelength Zones share a parent Region. The analytics servers must run inside the carrier's network for the lowest latency, and they write results to an Amazon RDS for PostgreSQL database that must stay in the parent Region. The company wants the simplest network design. Which solution meets these requirements?",
    opts: [
      "Use one VPC with subnets in both cities' Wavelength Zones and in the Region's AZs, so the servers reach RDS through the VPC's local route.",
      "Run the analytics servers in subnets in the two cities' AWS Local Zones, and keep the RDS database in subnets in the Region's AZs.",
      "Create a separate VPC for each Wavelength Zone, and connect each one to the database's VPC in the Region through a transit gateway.",
      "Install an AWS Outposts rack in an office in each city, run the analytics servers on the racks, and keep RDS in the parent Region."
    ], a: 0,
    no: [null,
      "Local Zones put AWS compute near metro areas, not inside the carrier's 5G network.",
      "That adds VPCs and a transit gateway to manage. One VPC that spans the Wavelength Zones and the Region already connects them.",
      "Outposts racks sit in the company's own sites, not inside the carrier's 5G network."],
    why: "A Wavelength Zone is a logical extension of its parent Region. A VPC can have subnets in Wavelength Zones and Availability Zones, and the VPC's local route connects them, so servers at the carrier edge reach a database in the Region with no extra networking.",
    doc: ["https://docs.aws.amazon.com/wavelength/latest/developerguide/how-wavelengths-work.html", "https://docs.aws.amazon.com/wavelength/latest/developerguide/what-is-wavelength.html"] },

  { id: "saa-3-564", exam: "SAA", saa: "3.2", topic: "amplify", type: "mc",
    q: "A startup is building a Next.js web app that uses server-side rendering and static pages. Each commit to the main branch of its Git repository must build and deploy the app, and the app must be served through a global CDN on a custom domain with HTTPS. The two-person team doesn't want to manage servers, containers or a build pipeline. Which solution meets these requirements?",
    opts: [
      "Connect the repository to AWS Amplify Hosting, which builds each commit, runs the SSR pages and serves the app through its CDN.",
      "Export the app as static files, and host them in an S3 bucket behind a CloudFront distribution that uses an ACM certificate.",
      "Package the app as a container image, run it on Amazon ECS with AWS Fargate behind an ALB, and deploy it with CodePipeline.",
      "Deploy the app to an Elastic Beanstalk Node.js environment, put CloudFront in front of it, and deploy commits with the EB CLI."
    ], a: 0,
    no: [null,
      "A static export drops the server-side rendering that the app needs.",
      "That works, but the team would manage container images, an ECS service and a pipeline, which it wants to avoid.",
      "Beanstalk runs EC2 instances for the app, and someone must deploy each commit with the EB CLI."],
    why: "Amplify Hosting gives a Git-based workflow with continuous deployment and supports SSR frameworks such as Next.js. It deploys the app to the AWS global CDN and can connect a custom domain with a managed certificate.",
    doc: ["https://docs.aws.amazon.com/amplify/latest/userguide/welcome.html", "https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html"] },

  { id: "saa-3-565", exam: "SAA", saa: "3.4", topic: "grafana", type: "mc",
    q: "A company builds its dashboards in an Amazon Managed Grafana workspace. It now wants to add an Amazon OpenSearch Service domain as a data source. The domain runs in private subnets of a VPC with no public endpoint, and it must stay that way. Which solution lets the workspace query the domain?",
    opts: [
      "Configure a VPC connection for the workspace, with private subnets in each AZ of the domain's VPC and a security group the domain allows.",
      "Create an interface VPC endpoint for Amazon Managed Grafana in the domain's VPC, and then add the domain as a data source in the workspace.",
      "Turn on public access for the domain, and allow only the Managed Grafana workspace's IP addresses in the domain's access policy.",
      "Set the workspace's network access control to allow only the domain's VPC, and then add the domain as a data source in the workspace."
    ], a: 0,
    no: [null,
      "An interface endpoint lets clients in the VPC reach Grafana's APIs or workspace. It doesn't give the workspace a path to the domain.",
      "That gives the domain a public endpoint, which the company ruled out.",
      "Network access control limits who can reach the workspace. It doesn't let the workspace reach data sources in a VPC."],
    why: "By default a Managed Grafana workspace reaches data sources over the internet. Connecting the workspace to a VPC, with subnets and security groups, sends its traffic through that VPC so it can query private data sources.",
    doc: ["https://docs.aws.amazon.com/grafana/latest/userguide/AMG-configure-vpc.html", "https://docs.aws.amazon.com/grafana/latest/userguide/VPC-endpoints.html"] },

  { id: "saa-3-566", exam: "SAA", saa: "3.4", topic: "devicefarm", type: "multi", hint: "Select TWO.",
    q: "A company tests its mobile app on private devices in AWS Device Farm. The tests must call a staging API that runs in private subnets of a VPC in us-east-1 and has no internet-facing endpoint. The API must stay private. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Configure VPC-ENI connectivity for the Device Farm project, using a subnet and a security group in a VPC in us-west-2.", ok: true },
      { t: "Connect the us-west-2 VPC to the API's VPC in us-east-1 with VPC peering or a transit gateway, and update the route tables.", ok: true },
      { t: "Create the Device Farm project in us-east-1 so that the private devices run in the same Region as the staging API.", ok: false, no: "Device Farm is available only in us-west-2." },
      { t: "Put the API behind an internet-facing ALB, and allow only Device Farm's published IP address ranges in its security group.", ok: false, no: "That gives the API an internet-facing endpoint, which the company ruled out." },
      { t: "Create a gateway VPC endpoint for Device Farm in the API's VPC in us-east-1, and add it to the subnets' route tables.", ok: false, no: "Gateway endpoints exist only for S3 and DynamoDB, and they let a VPC reach those services, not let devices into the VPC." }
    ],
    why: "VPC-ENI, available on private devices, places network interfaces for Device Farm's devices and host machines in a subnet of a VPC in us-west-2. Resources in another Region are reached by connecting that VPC to theirs, for example with peering or a transit gateway.",
    doc: ["https://docs.aws.amazon.com/devicefarm/latest/developerguide/vpc-eni.html"] },

  // SAA Domain 4
  { id: "saa-4-561", exam: "SAA", saa: "4.2", topic: "servicecatalog", type: "mc",
    q: "A company shares one AWS Service Catalog product, an EC2 environment whose template has an InstanceType parameter, in two portfolios. Interns launch it from one portfolio and must be able to choose only t3.micro or t3.small. Data scientists launch the same product from the other portfolio and need larger instance types. The template must not be changed. What should a solutions architect do?",
    opts: [
      "Add a template constraint in the interns' portfolio that limits the InstanceType parameter to t3.micro and t3.small.",
      "Add a tag update constraint to the product in the interns' portfolio that blocks changes to the instance type after launch.",
      "Attach an SCP to the account that denies ec2:RunInstances unless the instance type is t3.micro or t3.small.",
      "Add AllowedValues of t3.micro and t3.small to the InstanceType parameter, and publish it as a new product version."
    ], a: 0,
    no: [null,
      "Tag update constraints control whether users can change tags on a provisioned product. They don't limit parameter values.",
      "An SCP applies to the whole account, so it would also block the data scientists' larger instances.",
      "That changes the template, and because both portfolios share the product, it would limit the data scientists too."],
    why: "A template constraint narrows the allowed values of a product's template parameters, and it applies only in the portfolio where it is added. The same product in another portfolio keeps the full set of values.",
    doc: ["https://docs.aws.amazon.com/servicecatalog/latest/adminguide/catalogs_constraints_template-constraints.html"] },

  { id: "saa-4-562", exam: "SAA", saa: "4.2", topic: "devicefarm", type: "mc",
    q: "Customers report that a mobile app freezes on one older Android phone model, but only when the phone is turned to landscape in a certain city. The company doesn't own that model. A support engineer must reproduce the bug by hand, this week, on a real device of that model, without buying one. Which solution meets these requirements MOST cost-effectively?",
    opts: [
      "Start an AWS Device Farm remote access session on that model, install the app, and rotate the device and mock its location from the browser.",
      "Run the app in an Android emulator on an EC2 instance set up to match the model, and repeat the steps through a remote desktop session.",
      "Schedule an AWS Device Farm automated test run with the built-in fuzz test on that model, and then read the logs that the run produces.",
      "Give the engineer an Amazon WorkSpaces desktop with an Android development environment, and test the app there on a virtual device."
    ], a: 0,
    no: [null,
      "An emulator isn't the real device, and the bug may depend on that model's hardware.",
      "A fuzz test sends random input. It can't follow the exact manual steps needed to reproduce the bug.",
      "WorkSpaces provides virtual desktops, not real phones."],
    why: "A Device Farm remote access session lets you interact with a real, physical device through a web browser in real time, including changing its orientation and mocking its location, so a bug can be reproduced by hand without owning the device.",
    doc: ["https://docs.aws.amazon.com/devicefarm/latest/developerguide/remote-access.html"] },

  // DVA Domain 1
  { id: "dva-1-501", exam: "both", dva: "1.3", saa: "3.5", topic: "opensearch", type: "mc",
    q: "A company's microservices emit JSON log events. Support engineers need to search the free-text error messages across all services, with results ranked by relevance and fuzzy matching on misspelled terms, and they want interactive dashboards of error trends. New events must be searchable within a few minutes, and the team doesn't want to write or run its own delivery code. Which solution meets these requirements?",
    opts: [
      "Send the events to an Amazon Data Firehose stream that delivers them to an Amazon OpenSearch Service domain, and use OpenSearch Dashboards.",
      "Send the events to a Firehose stream that writes Parquet files to Amazon S3, and query the files with Amazon Athena from a dashboard tool.",
      "Write each event to a DynamoDB table keyed by service and timestamp, and run Scan calls with a contains() filter on the message text.",
      "Write the events to Kinesis Data Streams, and run SQL queries over them with Amazon Managed Service for Apache Flink when engineers search."
    ], a: 0,
    no: [null,
      "Athena runs SQL over files in S3. It has no full-text index, relevance ranking or fuzzy matching.",
      "A Scan reads the whole table for every search, and a contains() filter can't rank results or match misspellings.",
      "Flink processes records as they stream through. It isn't an index that engineers can search on demand by relevance."],
    why: "OpenSearch Service keeps an inverted index built for full-text search, relevance scoring and fuzzy queries, and OpenSearch Dashboards visualizes the same data. Firehose delivers the stream to the domain without custom code.",
    doc: ["https://docs.aws.amazon.com/opensearch-service/latest/developerguide/integrations-fh.html", "https://docs.aws.amazon.com/firehose/latest/dev/create-destination.html"] },

  { id: "dva-1-502", exam: "DVA", dva: "1.1", topic: "qdeveloper", type: "mc",
    q: "A developer is about to create a VPC, subnets, security groups and an EC2 instance by hand in the AWS Management Console to try out a design. If it works, the team wants the same steps as AWS CLI commands for a script, and as an AWS CDK app in Python, without writing either from scratch. What should the developer do?",
    opts: [
      "Record the console session with Amazon Q Developer Console-to-Code, and generate the CLI commands and CDK Python code from it.",
      "Use the CloudFormation IaC generator to scan the new resources into a template, then convert the template into CLI commands for the script.",
      "Look up the API calls in the CloudTrail event history after the session, then use them as the basis for the CLI script and the CDK app.",
      "Capture the resources with the AWS Config configuration recorder, then generate the CLI script and the CDK app from the configuration items."
    ], a: 0,
    no: [null,
      "The IaC generator creates CloudFormation templates from existing resources. It doesn't produce AWS CLI commands.",
      "CloudTrail lists the API calls that were made, but the developer would still write the CLI script and the CDK code by hand.",
      "AWS Config records resource configurations for auditing and compliance. It doesn't generate CLI commands or CDK code."],
    why: "Console-to-Code, a feature of Amazon Q Developer, records actions in supported consoles such as Amazon VPC and Amazon EC2, then uses generative AI to suggest the equivalent AWS CLI commands and infrastructure as code, including CDK Python and CloudFormation.",
    doc: ["https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/console-to-code.html"] },

  // DVA Domain 3
  { id: "dva-3-501", exam: "both", dva: "3.1", saa: "2.1", topic: "sar", type: "multi", hint: "Select TWO.",
    q: "A company wants to publish an open-source serverless application, defined in an AWS SAM template, to the AWS Serverless Application Repository so that any AWS customer can find it and deploy it into their own account. The developer has packaged the template and code into an S3 bucket that blocks all public access. Which steps are required before the application can be shared publicly? (Select TWO.)",
    items: [
      { t: "Add a bucket policy that lets the serverlessrepo.amazonaws.com service principal read the packaged artifacts in the bucket.", ok: true },
      { t: "Set a license and a semantic version on the application, because public sharing needs both of those properties.", ok: true },
      { t: "Turn off Block Public Access on the bucket, and make the packaged artifacts readable by everyone on the internet.", ok: false, no: "The service reads the artifacts through a bucket policy for its service principal. The objects don't need to be public." },
      { t: "List the application as a free product in AWS Marketplace, and link the Marketplace listing to the application.", ok: false, no: "Public sharing is a setting in the Serverless Application Repository itself. AWS Marketplace isn't involved." },
      { t: "Add a resource-based policy to each Lambda function in the template that allows lambda:InvokeFunction from any account.", ok: false, no: "Consumers deploy their own copies of the functions, so they never need to invoke the publisher's functions." }
    ],
    why: "Publishing reads the packaged artifacts through a bucket policy that grants serverlessrepo.amazonaws.com read access. A private application needs no license, but an application can't be shared publicly until it has both a license and a semantic version.",
    doc: ["https://docs.aws.amazon.com/serverlessrepo/latest/devguide/serverlessrepo-how-to-publish.html"] },

  { id: "dva-3-502", exam: "DVA", dva: "3.3", topic: "qdeveloper", type: "multi", hint: "Select TWO.",
    q: "A developer uses the Amazon Q Developer extension in Visual Studio Code. A pricing module has no unit tests, and the team wants a first set of tests for its calculateDiscount function before the code goes through the deployment pipeline. Which actions will have Amazon Q generate the tests? (Select TWO.)",
    items: [
      { t: "Highlight the function, right-click it, and choose Amazon Q and then Generate tests from the context menu.", ok: true },
      { t: "Ask Amazon Q in the chat panel to generate unit test cases for the calculateDiscount function.", ok: true },
      { t: "Highlight the function, right-click it, and choose Amazon Q and then Refactor from the context menu.", ok: false, no: "Refactor improves the readability or efficiency of the selected code. It doesn't write tests." },
      { t: "Record the steps in the AWS console with Console-to-Code, and generate a test file from the recording.", ok: false, no: "Console-to-Code turns console actions into CLI commands and infrastructure code, not unit tests." },
      { t: "Turn on CodeBuild test reports in the buildspec, so that each build writes tests for untested functions.", ok: false, no: "Test reports collect results from tests that already exist. CodeBuild doesn't write new tests." }
    ],
    why: "In the IDE, Amazon Q Developer creates unit tests for selected code through the Generate tests option, or when asked in chat. The developer reviews the generated tests before adding them to the code base.",
    doc: ["https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/explain-update-code.html", "https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/q-in-IDE-chat.html"] },

  // DVA Domain 4
  { id: "dva-4-501", exam: "DVA", dva: "4.1", topic: "qdeveloper", type: "mc",
    q: "A developer gets an error in the AWS Lambda console while adding an SQS trigger to a function. The developer wants an explanation of the error's likely cause and step-by-step instructions to fix it, generated inside the console, without opening a support case. The developer's IAM role already allows the Amazon Q troubleshooting actions. What should the developer do?",
    opts: [
      "Choose the Diagnose with Amazon Q button in the error message, and follow the resolution steps that Amazon Q Developer provides.",
      "Search the CloudTrail event history for the failed API call, and read its error code to work out which permission is missing.",
      "Run IAM Access Analyzer policy generation on the function's execution role to build a policy from the role's recent activity.",
      "Open AWS Trusted Advisor, and review its checks for the function to find the configuration problem that caused the error."
    ], a: 0,
    no: [null,
      "CloudTrail shows the call and its error code, but it doesn't explain the cause or give steps to fix it.",
      "Policy generation builds a policy from CloudTrail activity over a period of time. It doesn't diagnose an error in the console.",
      "Trusted Advisor checks an account against best practices. It doesn't diagnose a specific console error."],
    why: "When Amazon Q Developer can help with a console error, the error message shows a Diagnose with Amazon Q button. Amazon Q explains the error and gives steps to resolve it, for common errors in consoles such as Lambda, EC2, ECS, S3 and Step Functions.",
    doc: ["https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/diagnose-console-errors.html"] }
);
