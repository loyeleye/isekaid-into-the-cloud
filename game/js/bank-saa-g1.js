// Question bank batch: SAA-C03 Domain 1 gap fill (Regions and data residency, shared responsibility, directory federation,
// GuardDuty, Macie and data classification, Artifact, Firewall Manager, Detective, Inspector, CloudHSM, Network Firewall,
// Shield Advanced, Client VPN, RAM, Config, Security Hub CSPM, Backup Vault Lock, Object Lock, plus a spread of 1.1-1.3 skills).
// Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 1.1: Secure access to AWS resources
  { id: "saa-1-201", exam: "SAA", saa: "1.1", topic: "regions", type: "mc",
    q: "A health-records startup is launching in a country where a law requires patient data to be stored only inside that country. AWS has a Region located in the country. Most users also live there. The company wants the app's data, including its backups and copies, to stay in the country. Which approach meets these requirements?",
    opts: [
      "Deploy in the Region located in the country after checking that it offers every service the app needs, and keep all data stores and backup copies in that Region.",
      "Deploy in the Region that offers the most AWS services, and encrypt all of the data with a customer managed KMS key so it stays protected wherever it is stored.",
      "Deploy in the Region located in the country, and add S3 Cross-Region Replication to a Region in a neighboring country so that a disaster recovery copy always exists.",
      "Deploy in the lowest-cost Region, and put a CloudFront distribution with geographic restrictions in front of the app so that only users in the country can reach it."
    ], a: 0,
    no: [null,
      "Encryption protects the data, but it doesn't change where the data is stored, and that Region is outside the country.",
      "Cross-Region Replication puts a copy of the data in another country, which the law forbids.",
      "Geographic restrictions control who can receive content. The data would still be stored in a Region outside the country."],
    why: "You choose the Region for each resource, and data such as S3 objects stays in the Region where you store it unless you move or replicate it. Picking the in-country Region, after confirming service availability, meets the residency rule and puts the app close to its users.",
    doc: ["https://docs.aws.amazon.com/global-infrastructure/latest/regions/aws-regions.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingBucket.html"] },

  { id: "saa-1-202", exam: "SAA", saa: "1.1", topic: "regions", type: "mc",
    q: "A company runs a database in account A and a latency-sensitive client fleet in account B, both in us-east-1. To avoid cross-AZ latency and data transfer charges, each client must run in the same physical Availability Zone as the database. Engineers in both accounts placed resources in us-east-1a, yet traffic is still crossing Availability Zones. What should a solutions architect do?",
    opts: [
      "Look up the AZ ID (such as use1-az2) of the database's subnet, and launch the clients in a subnet in account B whose Availability Zone has the same AZ ID.",
      "Give both VPCs the same CIDR block for their us-east-1a subnets, so that AWS places the two subnets in the same physical Availability Zone.",
      "Connect the two VPCs with VPC peering, which keeps traffic between subnets that share the same Availability Zone name inside one zone.",
      "Move the clients into a Local Zone in the same metropolitan area as us-east-1, so that they are closer to the database's Availability Zone."
    ], a: 0,
    no: [null,
      "A subnet's CIDR block has nothing to do with where AWS places it, and peered VPCs can't use overlapping CIDR blocks anyway.",
      "Peering connects the VPCs but doesn't change which physical zone each AZ name maps to in each account.",
      "A Local Zone is a separate location from the Region's Availability Zones, so this adds distance rather than removing the cross-AZ hop."],
    why: "AWS maps physical Availability Zones to AZ names randomly for each account, so us-east-1a in one account can be a different zone than us-east-1a in another. AZ IDs such as use1-az2 identify the same physical zone in every account.",
    doc: ["https://docs.aws.amazon.com/ram/latest/userguide/working-with-az-ids.html"] },

  { id: "saa-1-203", exam: "SAA", saa: "1.1", topic: "shared-responsibility", type: "mc",
    q: "A company runs dozens of Lambda functions. Some are .zip packages on a managed runtime with the default Auto runtime update mode, and others are deployed as container images built from an AWS base image. The security team must document which runtime patching tasks the company itself still owns. Which task belongs to the company?",
    opts: [
      "Rebuild the container image functions from the latest AWS base image and redeploy them regularly, so that they pick up new patches.",
      "Update the managed runtime of each .zip function every month, because Lambda doesn't apply runtime patches to functions that already exist.",
      "Patch the operating system of the execution environments for the .zip functions, as Lambda manages only the runtime.",
      "Nothing for either type, because Lambda automatically applies new runtime patches to container image functions as well as .zip functions."
    ], a: 0,
    no: [null,
      "In Auto mode, Lambda applies runtime updates to existing functions itself.",
      "AWS operates the execution environment and its operating system for managed runtimes.",
      "Lambda publishes patched base images, but it can't rebuild a container image function for you. That stays with the customer."],
    why: "For managed runtimes in Auto mode, Lambda both publishes and applies runtime patches. For container images, Lambda publishes updated base images, and the customer must rebuild and redeploy the function to pick them up.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/runtime-management-shared.html"] },

  { id: "saa-1-204", exam: "SAA", saa: "1.1", topic: "shared-responsibility", type: "multi", hint: "Select TWO.",
    q: "A company is moving its self-managed MySQL servers to Amazon RDS for MySQL. The security team is updating its responsibility matrix under the AWS shared responsibility model. Which tasks remain the company's responsibility after the move? (Select TWO.)",
    items: [
      { t: "Create the database users and grant each one only the privileges on schemas and tables that it needs.", ok: true },
      { t: "Configure the security groups on the DB instance so that only the application tier can connect to it.", ok: true },
      { t: "Sign in to the DB instance's host and install operating system security patches as soon as they are released.", ok: false, no: "RDS gives no shell access to the host. Amazon RDS applies operating system updates itself, in the maintenance window." },
      { t: "Replace failed disks and servers in the hardware that runs the DB instance and its attached storage volumes.", ok: false, no: "The underlying hardware is AWS's responsibility, and RDS performs hardware maintenance itself." },
      { t: "Install and configure the MySQL database software on the hosts that RDS provisions for the DB instance.", ok: false, no: "RDS installs and manages the database engine software as part of the managed service." }
    ],
    why: "With a managed database, AWS runs the hardware, host operating system and engine installation. The customer still controls who can reach the database (security groups) and what each database user may do.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.html", "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.Maintenance.html"] },

  { id: "saa-1-205", exam: "SAA", saa: "1.1", topic: "directory-service", type: "mc",
    q: "A company is moving a .NET app to EC2. Its servers and service accounts must live in a Microsoft Active Directory domain hosted in AWS, so that the app keeps running if the link to the data center fails. Employees must still sign in to the app with their existing on-premises AD accounts. The company doesn't want to run domain controllers itself. Which solution meets these requirements?",
    opts: [
      "Create an AWS Managed Microsoft AD directory for the app's domain, and set up a forest trust with the on-premises Active Directory.",
      "Create an AD Connector in the VPC, and join the app's servers to the on-premises domain through it so that employees keep their accounts.",
      "Create a Simple AD directory for the app's domain, and set up a trust between it and the on-premises Active Directory.",
      "Install Active Directory domain controllers on EC2 instances in two Availability Zones, and make them part of the on-premises forest."
    ], a: 0,
    no: [null,
      "AD Connector only redirects requests to the on-premises directory and caches nothing, so the domain would still live on premises.",
      "Simple AD doesn't support trust relationships with other domains.",
      "That works, but the company would run and patch its own domain controllers, which it wants to avoid."],
    why: "AWS Managed Microsoft AD runs a real AD domain on domain controllers that AWS manages across two Availability Zones. A forest trust with the on-premises AD lets existing users access resources in the AWS domain.",
    doc: ["https://docs.aws.amazon.com/directoryservice/latest/admin-guide/directory_microsoft_ad.html", "https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_setup_trust.html"] },

  { id: "saa-1-206", exam: "SAA", saa: "1.1", topic: "identity-center", type: "multi", hint: "Select TWO.",
    q: "A company with 30 accounts in AWS Organizations uses an external SAML 2.0 identity provider for its workforce. Employees must sign in once with that provider to reach the accounts they need. When HR adds someone to a group or removes them in the provider, the change must reach AWS without manual work. Which steps meet these requirements with the LEAST operational overhead? (Select TWO.)",
    items: [
      { t: "In IAM Identity Center, set the external identity provider as the identity source and exchange SAML metadata with it.", ok: true },
      { t: "Turn on automatic provisioning in IAM Identity Center, and configure the provider to sync users and groups over SCIM.", ok: true },
      { t: "Create an IAM SAML identity provider and federation roles in each of the 30 accounts, and keep group mappings in each one.", ok: false, no: "That repeats the setup in every account, and SAML alone doesn't sync users or groups into AWS." },
      { t: "Create an AD Connector that points to the external identity provider, and use it as the identity source in IAM Identity Center.", ok: false, no: "AD Connector proxies requests to a Microsoft Active Directory, not to a SAML identity provider." },
      { t: "Create an Amazon Cognito user pool federated with the provider, and give each group an IAM role in each of the 30 accounts.", ok: false, no: "Cognito user pools sign in users of your own applications, not the workforce into AWS accounts." }
    ],
    why: "SAML handles sign-in but can't be used to query the provider for users and groups. Turning on SCIM provisioning makes the provider push user and group changes into IAM Identity Center, where permission sets grant access to accounts.",
    doc: ["https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-identity-source-idp.html", "https://docs.aws.amazon.com/singlesignon/latest/userguide/provision-automatically.html"] },

  { id: "saa-1-207", exam: "SAA", saa: "1.1", topic: "iam", type: "mc",
    q: "A company has 200 member accounts in AWS Organizations, and the security team stores and rotates a root password and MFA device for each one. It wants to remove root user credentials from the member accounts and stop anyone from recovering them, while still being able to fix the occasional S3 bucket policy that locks out every principal. Which solution meets these requirements?",
    opts: [
      "Turn on centralized root access for member accounts in IAM, delete their root credentials, and use privileged root sessions from the management account when needed.",
      "Attach an SCP to every OU that denies all actions by the root user, and keep the root passwords and MFA devices in a locked safe for emergencies.",
      "Give the security team an IAM Identity Center permission set with AdministratorAccess in every account, and use it to fix locked bucket policies.",
      "Register a hardware MFA device for the root user of every member account, and rotate the root passwords with a scheduled Lambda function."
    ], a: 0,
    no: [null,
      "The SCP limits the root user, but the credentials still exist and still have to be stored and protected.",
      "A bucket policy that denies all principals blocks administrators too. Deleting it needs root-level access.",
      "This keeps 200 sets of root credentials in place, which is exactly what the company wants to get rid of."],
    why: "Centralized root access lets the management account or a delegated IAM administrator delete member accounts' root credentials and block their recovery. Short privileged sessions (sts:AssumeRoot) can still perform tasks such as deleting a misconfigured S3 bucket policy.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-enable-root-access.html", "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user-privileged-task.html"] },

  { id: "saa-1-208", exam: "SAA", saa: "1.1", topic: "iam", type: "mc",
    q: "A data pipeline's IAM role was given broad permissions on six services when it was built. The pipeline has run unchanged for three months, and CloudTrail logs every management and data event in the account. The security team wants a policy that grants only the actions the role has actually used, with the LEAST effort. What should a solutions architect do?",
    opts: [
      "Generate a policy from the role's CloudTrail activity with IAM Access Analyzer, and replace the broad one.",
      "Turn on AWS Config for IAM resources, and read the role's configuration history to see which actions it has called.",
      "Attach a permissions boundary that allows only read actions on the six services, and keep the broad policy in place.",
      "Use the IAM policy simulator to test every action of the six services against the role, and remove what it denies."
    ], a: 0,
    no: [null,
      "Config records how the role is configured over time, not which API calls the role made.",
      "A read-only boundary would break the pipeline's writes, and it doesn't tell anyone which actions are actually used.",
      "The simulator shows what a policy allows, not what the role really used, so it can't narrow anything down."],
    why: "IAM Access Analyzer policy generation reviews CloudTrail logs for a date range and builds a policy template with the services and actions the identity used, which you refine and attach.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-generation.html"] },

  { id: "saa-1-209", exam: "SAA", saa: "1.1", topic: "ram", type: "mc",
    q: "A company's network team must own and control the VPCs, route tables, network ACLs and gateways for every workload. App teams in separate accounts of the same organization must launch their own EC2 instances and RDS databases into those networks, with costs billed to their own accounts. The company also wants fewer VPCs to manage. Which solution meets these requirements?",
    opts: [
      "Create the VPCs in a network account, and share their subnets with the app accounts by using AWS RAM.",
      "Give each app account its own VPC, and connect every VPC to a central VPC in the network account with VPC peering.",
      "Create cross-account IAM roles in the network account that let app teams launch resources in its VPCs directly.",
      "Give each app account its own VPC, and attach all of them to a transit gateway owned by the network account."
    ], a: 0,
    no: [null,
      "Each app team would own and control its own VPC, and the number of VPCs grows with every account.",
      "The resources would belong to the network account, so they wouldn't be billed to the app teams' accounts.",
      "The app teams would still own their VPCs and route tables, and the VPC count doesn't go down."],
    why: "With VPC sharing, the owner shares subnets with participant accounts in its organization through AWS RAM. Participants create their own resources in those subnets, but they can't change route tables, network ACLs or gateways, which stay with the owner.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/vpc-sharing.html", "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-share-limitations.html"] },

  // Task 1.2: Secure workloads and applications
  { id: "saa-1-210", exam: "SAA", saa: "1.2", topic: "guardduty", type: "multi", hint: "Select TWO.",
    q: "Customers upload documents to an S3 bucket from a public web app. Downstream processing apps must never read an uploaded object until it has been scanned for malware and found clean. The company wants a managed scanner rather than antivirus software it runs itself. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Turn on GuardDuty Malware Protection for S3 for the bucket, with tagging of scanned objects turned on.", ok: true },
      { t: "Add a bucket policy that denies GetObject unless the object's GuardDutyMalwareScanStatus tag is NO_THREATS_FOUND.", ok: true },
      { t: "Turn on GuardDuty S3 Protection, so that it checks the content of each new object for malware as it arrives.", ok: false, no: "S3 Protection analyzes CloudTrail S3 data events for suspicious access. It doesn't scan object content." },
      { t: "Run an Amazon Macie sensitive data discovery job on the bucket every hour, and block objects that Macie flags.", ok: false, no: "Macie finds sensitive data such as personal information, not malware." },
      { t: "Turn on Amazon Inspector for the account, so that it scans each new S3 object for malware and known CVEs.", ok: false, no: "Inspector scans EC2 instances, container images and Lambda functions, not S3 objects." }
    ],
    why: "Malware Protection for S3 scans each newly uploaded object and can tag it with GuardDutyMalwareScanStatus. A bucket policy that uses the s3:ExistingObjectTag condition then keeps everyone else from reading objects until the tag shows no threats.",
    doc: ["https://docs.aws.amazon.com/guardduty/latest/ug/gdu-malware-protection-s3.html", "https://docs.aws.amazon.com/guardduty/latest/ug/tag-based-access-s3-malware-protection.html"] },

  { id: "saa-1-211", exam: "SAA", saa: "1.2", topic: "guardduty", type: "mc",
    q: "A company runs its services as Amazon ECS tasks on AWS Fargate, and GuardDuty is already on with its foundational data sources. The security team now must detect threats inside the running containers, such as a process starting a cryptocurrency miner or a shell opening an unexpected network connection, without managing agents itself. What should a solutions architect do?",
    opts: [
      "Turn on GuardDuty Runtime Monitoring for ECS on Fargate, and let GuardDuty manage the security agent automatically.",
      "Rely on GuardDuty's foundational data sources, because VPC flow logs show each process that runs inside a container.",
      "Turn on Amazon Inspector for the ECR repositories, so that it reports any malicious process started in a running task.",
      "Turn on Amazon Detective for the account, so that it records process and file activity inside each container task."
    ], a: 0,
    no: [null,
      "Flow logs, DNS logs and CloudTrail events show network and API activity, not processes or files inside a container.",
      "Inspector finds known vulnerabilities in images. It doesn't watch what running containers do.",
      "Detective helps investigate findings from data such as CloudTrail and flow logs. It doesn't collect runtime events inside containers."],
    why: "Runtime Monitoring adds a GuardDuty security agent that observes operating system, file and network events, such as process execution and command lines, for EKS, ECS on Fargate and EC2. For Fargate, GuardDuty manages the agent automatically.",
    doc: ["https://docs.aws.amazon.com/guardduty/latest/ug/runtime-monitoring.html"] },

  { id: "saa-1-212", exam: "SAA", saa: "1.2", topic: "detective", type: "multi", hint: "Select TWO.",
    q: "GuardDuty raises a finding that an EC2 instance is communicating with a known command-and-control server. The security team must find out whether malware is present on the instance's EBS volumes without installing agents, and must investigate which other hosts and IP addresses the instance talked to over the past weeks using visual summaries. Which actions meet these requirements? (Select TWO.)",
    items: [
      { t: "Use GuardDuty Malware Protection for EC2 to run an on-demand scan of the instance's attached EBS volumes, with no agent.", ok: true },
      { t: "Use Amazon Detective to review the instance's VPC flow volume and related findings in its behavior graph.", ok: true },
      { t: "Use Amazon Inspector to scan the instance, because its vulnerability findings report any malware files on the disks.", ok: false, no: "Inspector reports software vulnerabilities and network exposure, not malware on disk." },
      { t: "Use Amazon Macie to scan the instance's EBS volumes for malicious files and the IP addresses they connected to.", ok: false, no: "Macie analyzes S3 objects for sensitive data. It doesn't read EBS volumes or network activity." },
      { t: "Use the AWS Config timeline for the instance to see every host and IP address it connected to over the past weeks.", ok: false, no: "Config records resource configuration changes, not network connections." }
    ],
    why: "Malware Protection for EC2 scans snapshots of the instance's EBS volumes without an agent, on demand or automatically when GuardDuty finds signs of malware. Detective builds a behavior graph from sources such as VPC flow logs and links activity to GuardDuty findings for investigation.",
    doc: ["https://docs.aws.amazon.com/guardduty/latest/ug/malware-protection.html", "https://docs.aws.amazon.com/detective/latest/userguide/what-is-detective.html"] },

  { id: "saa-1-213", exam: "SAA", saa: "1.2", topic: "inspector", type: "mc",
    q: "A company deploys hundreds of Lambda functions as .zip packages. Security must be told when a function's third-party libraries have a known vulnerability, including CVEs published after deployment, and when the company's own code has flaws such as injection or hardcoded credentials. The solution must use a managed service with the LEAST operational overhead. What should a solutions architect recommend?",
    opts: [
      "Activate Amazon Inspector Lambda standard scanning and Lambda code scanning in all of the accounts.",
      "Turn on GuardDuty Lambda Protection, so it inspects function code and libraries for known vulnerabilities.",
      "Turn on Amazon ECR enhanced scanning, and rely on it to scan the Lambda functions' deployment packages.",
      "Turn on Security Hub CSPM's Foundational Security Best Practices standard to scan each function's code."
    ], a: 0,
    no: [null,
      "Lambda Protection monitors the functions' network activity for threats. It doesn't analyze code or packages.",
      "ECR scanning covers container images in ECR. Functions deployed as .zip packages aren't stored there.",
      "Security Hub CSPM controls check resource configuration, such as runtime settings, not the code inside functions."],
    why: "Inspector standard scanning checks function and layer dependencies for package vulnerabilities, rescanning when new CVEs arrive. Code scanning adds checks of custom code for flaws such as injection, data leaks and hardcoded credentials.",
    doc: ["https://docs.aws.amazon.com/inspector/latest/user/scanning-lambda.html", "https://docs.aws.amazon.com/inspector/latest/user/findings-types.html"] },

  { id: "saa-1-214", exam: "SAA", saa: "1.2", topic: "firewall-manager", type: "multi", hint: "Select TWO.",
    q: "A company has 80 accounts in AWS Organizations with all features turned on. Security groups that allow SSH from 0.0.0.0/0 keep appearing. The security team must find such rules in every account, including accounts added later, and fix them automatically from one central place. Which combination of steps meets these requirements? (Select TWO.)",
    items: [
      { t: "Turn on AWS Config in the member accounts, and designate a Firewall Manager administrator account for the organization.", ok: true },
      { t: "Create a Firewall Manager content audit security group policy that flags SSH open to any address, with auto remediation on.", ok: true },
      { t: "Turn on Amazon GuardDuty in every account, so that it removes security group rules that allow SSH from the internet.", ok: false, no: "GuardDuty reports threats. It doesn't audit or change security group rules." },
      { t: "Attach an SCP that denies ec2:AuthorizeSecurityGroupIngress, so that no account can add rules to its security groups.", ok: false, no: "That blocks every legitimate rule change, and it does nothing about the open rules that already exist." },
      { t: "Turn on AWS Trusted Advisor in every account, so that its security checks close the open SSH rules on their own.", ok: false, no: "Trusted Advisor can flag unrestricted ports, but it doesn't remediate them." }
    ],
    why: "Firewall Manager applies security policies across an organization, including new accounts, from one administrator account, and it needs AWS Config in the accounts it manages. A content audit security group policy finds noncompliant rules and can remediate them automatically.",
    doc: ["https://docs.aws.amazon.com/waf/latest/developerguide/fms-prereq.html", "https://docs.aws.amazon.com/waf/latest/developerguide/security-group-policies.html"] },

  { id: "saa-1-215", exam: "SAA", saa: "1.2", topic: "network-firewall", type: "mc",
    q: "A company connects 20 VPCs through a transit gateway. A new rule says all traffic between VPCs must pass through stateful intrusion prevention that uses Suricata-compatible signatures, managed in one place, with no firewall appliances for the company to patch. Which solution meets these requirements?",
    opts: [
      "Attach AWS Network Firewall to the transit gateway with stateful IPS rule groups, and route inter-VPC traffic through it.",
      "Attach an AWS WAF web ACL with the AWS managed rule groups to the transit gateway, so that every packet between VPCs is checked.",
      "Add network ACL rules in each of the 20 VPCs that deny the address ranges listed in the company's threat intelligence feeds.",
      "Turn on Amazon GuardDuty in every account, so that it drops packets between the VPCs that match known attack signatures."
    ], a: 0,
    no: [null,
      "AWS WAF protects HTTP resources such as ALBs, CloudFront and API Gateway. It can't attach to a transit gateway.",
      "Network ACLs filter by address and port. They can't inspect traffic against IPS signatures.",
      "GuardDuty detects threats from logs. It isn't inline, so it can't drop traffic."],
    why: "Network Firewall is a managed, stateful firewall and IPS that uses Suricata-compatible rules. It can be attached directly to a transit gateway, so traffic between attached VPCs is inspected in one place.",
    doc: ["https://docs.aws.amazon.com/network-firewall/latest/developerguide/what-is-aws-network-firewall.html", "https://docs.aws.amazon.com/network-firewall/latest/developerguide/tgw-firewall.html"] },

  { id: "saa-1-216", exam: "SAA", saa: "1.2", topic: "shield", type: "multi", hint: "Select TWO.",
    q: "An online store serves traffic through CloudFront and an Application Load Balancer. During a past DDoS attack, the extra CloudFront requests and load balancer capacity units produced a large bill. The company wants to be eligible to request credits for charges like these after any future attack. Which steps must be in place before an attack starts? (Select TWO.)",
    items: [
      { t: "Subscribe to AWS Shield Advanced, and add Shield Advanced protection to the CloudFront distribution and the ALB.", ok: true },
      { t: "Associate an AWS WAF web ACL with a rate-based rule in Block mode with the distribution and the load balancer.", ok: true },
      { t: "Rely on AWS Shield Standard, which already includes credits for scaling charges caused by DDoS attacks.", ok: false, no: "Shield Standard protects against common attacks at no charge, but cost protection is a Shield Advanced feature." },
      { t: "Add Shield Advanced protection to the resources as soon as the next attack is detected, then request credits.", ok: false, no: "Resources protected after an attack starts aren't eligible for cost protection for that attack." },
      { t: "Create an AWS Budgets alert on CloudFront and EC2 spending, so that AWS refunds charges above the budget.", ok: false, no: "Budgets alerts on spending. It doesn't make anyone eligible for credits." }
    ],
    why: "Shield Advanced cost protection covers charges such as CloudFront requests and ALB load balancer capacity units during an attack, but only for resources protected before it began. For CloudFront and ALB, a web ACL with a rate-based rule in Block mode is also required.",
    doc: ["https://docs.aws.amazon.com/waf/latest/developerguide/ddos-request-service-credit.html", "https://docs.aws.amazon.com/waf/latest/developerguide/ddos-advanced-summary-protected-resources.html"] },

  { id: "saa-1-217", exam: "SAA", saa: "1.2", topic: "client-vpn", type: "mc",
    q: "About 400 employees work from home and need laptop access to internal apps in private subnets of a VPC. They must sign in with the company's SAML 2.0 identity provider, and each group may reach only certain subnets: engineers the development VPC range, finance only its app subnet. The company wants a managed service with no VPN servers to run. Which solution meets these requirements?",
    opts: [
      "Create an AWS Client VPN endpoint with SAML federated authentication and an authorization rule per group.",
      "Create an AWS Site-to-Site VPN connection for each employee's home router, and use route tables to limit what each group reaches.",
      "Order an AWS Direct Connect hosted connection, and give employees access to the private subnets over that dedicated link.",
      "Launch a bastion host in a public subnet, and give each employee an SSH key pair for tunneling into the private subnets."
    ], a: 0,
    no: [null,
      "Site-to-Site VPN joins networks through a customer gateway device. It doesn't authenticate individual users with an identity provider.",
      "Direct Connect links a data center or office network, not hundreds of individual laptops at home.",
      "A bastion host is a server to run and patch, and SSH keys bypass the company's identity provider."],
    why: "Client VPN is a managed OpenVPN-based service for individual users. It supports SAML federated authentication, and authorization rules can grant each group from the identity provider access to specific network ranges.",
    doc: ["https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/what-is.html", "https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/cvpn-working-rules.html"] },

  { id: "saa-1-218", exam: "SAA", saa: "1.2", topic: "securityhub", type: "multi", hint: "Select TWO.",
    q: "A company has 60 accounts in AWS Organizations and runs workloads in four Regions. The security team wants the AWS Foundational Security Best Practices standard turned on in every account and Region automatically, including accounts created later, and wants to review all findings from one Region. Which steps meet these requirements with the LEAST operational overhead? (Select TWO.)",
    items: [
      { t: "Designate a delegated Security Hub CSPM administrator account for the organization in AWS Organizations.", ok: true },
      { t: "Use central configuration with a home Region, linked Regions and a policy that turns on the standard for every OU.", ok: true },
      { t: "Sign in to each account in each Region, turn on Security Hub CSPM, and invite the account to the security account.", ok: false, no: "That's 240 manual setups, and accounts created later wouldn't be covered automatically." },
      { t: "Create an AWS Config aggregator in the security account, so that it turns on the standard and collects all findings.", ok: false, no: "An aggregator gives a read-only view of Config data. It can't turn on Security Hub standards." },
      { t: "Turn on Amazon Detective in the security account, so that it collects Security Hub findings from every Region.", ok: false, no: "Detective is for investigating findings, not for enabling standards or aggregating them across Regions." }
    ],
    why: "Central configuration works from a delegated administrator account: configuration policies turn Security Hub CSPM and its standards on for accounts and OUs in the home Region and linked Regions, and findings from linked Regions are viewed in the home Region.",
    doc: ["https://docs.aws.amazon.com/securityhub/latest/userguide/central-configuration-intro.html", "https://docs.aws.amazon.com/securityhub/latest/userguide/finding-aggregation.html"] },

  { id: "saa-1-219", exam: "SAA", saa: "1.2", topic: "secretsmanager", type: "multi", hint: "Select TWO.",
    q: "A company's teams create Amazon RDS DB instances in many accounts. An audit found master user passwords in wiki pages and scripts. From now on, no person may ever choose or see a master password, it must be rotated automatically, and any attempt to create a DB instance that doesn't follow this rule must fail. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Turn on RDS management of the master user password in Secrets Manager for each DB instance, which rotates it automatically.", ok: true },
      { t: "Attach an SCP that denies creating DB instances when the rds:ManageMasterUserPassword condition key is false.", ok: true },
      { t: "Store each master password as a SecureString parameter in Parameter Store, and turn on its built-in rotation schedule.", ok: false, no: "Parameter Store has no built-in rotation, and a person still chooses the first password." },
      { t: "Encrypt the master passwords with a customer managed KMS key, and keep the ciphertext in the deployment scripts.", ok: false, no: "Someone still chooses and can decrypt the password, and nothing rotates it or blocks noncompliant instances." },
      { t: "Turn on IAM database authentication on each DB instance, which removes the master user password from the instance.", ok: false, no: "IAM database authentication adds token-based sign-in for users. The master user and its password still exist." }
    ],
    why: "When RDS manages the master user password, it generates it, stores it in Secrets Manager and rotates it (every 7 days by default), so no person needs to handle it. The rds:ManageMasterUserPassword condition key lets a policy reject creation requests that don't use this feature.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html"] },

  // Task 1.3: Data security controls
  { id: "saa-1-220", exam: "SAA", saa: "1.3", topic: "macie", type: "mc",
    q: "A company has 30 accounts in AWS Organizations and petabytes of data in thousands of S3 buckets, with new buckets created every week. The privacy team wants one always-current view, across all accounts, of which buckets are likely to hold sensitive data, with a sensitivity score per bucket, without paying to analyze every object. Which solution is the MOST cost-effective?",
    opts: [
      "Use a delegated Macie administrator account for the organization, and turn on automated sensitive data discovery.",
      "Run a Macie sensitive data discovery job each month in every account that analyzes every object in all of its S3 buckets.",
      "From the Macie administrator account, run a one-time job with a low sampling depth across all of the existing buckets.",
      "Turn on Macie in each account as a standalone account, with automated sensitive data discovery in each one."
    ], a: 0,
    no: [null,
      "Analyzing every object each month is far more expensive, and buckets created between runs go unchecked.",
      "A one-time job is a snapshot. Buckets and objects added later are never analyzed, so the view goes stale.",
      "Each standalone account sees only its own buckets, so the privacy team wouldn't get one view across the organization."],
    why: "Automated sensitive data discovery continually evaluates the S3 inventory, samples representative objects, and keeps a sensitivity score for each bucket across the organization. Full discovery jobs are for deeper analysis where it's needed.",
    doc: ["https://docs.aws.amazon.com/macie/latest/user/discovery-asdd.html"] },

  { id: "saa-1-221", exam: "SAA", saa: "1.3", topic: "data-classification", type: "multi", hint: "Select TWO.",
    q: "A company's data classification policy says any S3 object that contains personal data is Confidential and may be read only by the privacy team. Objects land in a shared bucket from many sources, and nobody tags them correctly at upload. Macie is already scanning the bucket. Which steps put the policy into effect automatically? (Select TWO.)",
    items: [
      { t: "Create an EventBridge rule for Macie sensitive data findings that invokes a Lambda function to tag each flagged object as Confidential.", ok: true },
      { t: "Add a bucket policy statement that denies GetObject on objects tagged Confidential to every principal except the privacy team's role.", ok: true },
      { t: "Turn on S3 Inventory for the bucket, and use the inventory report to tag each object according to the personal data it contains.", ok: false, no: "Inventory lists object metadata. It doesn't look inside objects to find personal data." },
      { t: "Create an AWS Config rule that inspects the content of each new object and tags it Confidential when personal data is found.", ok: false, no: "Config evaluates resource configurations, such as bucket settings, not the data inside objects." },
      { t: "Turn on GuardDuty S3 Protection, so that it tags objects with personal data and blocks reads from anyone but the privacy team.", ok: false, no: "S3 Protection detects suspicious access. It doesn't classify data or tag objects." }
    ],
    why: "Macie publishes sensitive data findings to EventBridge, where a rule can start automatic tagging. A bucket policy that uses the s3:ExistingObjectTag condition key then restricts access to objects by their classification tag.",
    doc: ["https://docs.aws.amazon.com/macie/latest/user/findings-monitor-events-eventbridge.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/tagging-and-policies.html"] },

  { id: "saa-1-222", exam: "SAA", saa: "1.3", topic: "artifact", type: "multi", hint: "Select TWO.",
    q: "A healthcare company with 40 accounts in AWS Organizations will store protected health information on AWS. Its lawyers say a Business Associate Addendum with AWS must cover every account, including accounts created later. Its auditors also want AWS's latest SOC 2 report to assess AWS's own controls. Which actions meet these requirements? (Select TWO.)",
    items: [
      { t: "From the management account, accept the BAA as an organization agreement in AWS Artifact.", ok: true },
      { t: "Download AWS's SOC 2 report from AWS Artifact, and give it to the auditors as an audit artifact.", ok: true },
      { t: "Accept the BAA in AWS Artifact separately in each of the 40 member accounts as account agreements.", ok: false, no: "Account agreements cover only the accounts that accept them. Accounts created later wouldn't be covered." },
      { t: "Deploy an AWS Config conformance pack for HIPAA, which signs the BAA for every account it runs in.", ok: false, no: "A conformance pack checks resource settings. It doesn't create a legal agreement with AWS." },
      { t: "Turn on Security Hub CSPM with the PCI DSS standard, and export its scores as AWS's SOC 2 report.", ok: false, no: "Security Hub scores the company's own resources. It isn't an independent audit of AWS's controls." }
    ],
    why: "AWS Artifact provides AWS compliance reports such as SOC and ISO reports on demand, and lets you accept agreements such as the BAA. An organization agreement accepted from the management account covers all current and future member accounts.",
    doc: ["https://docs.aws.amazon.com/artifact/latest/ug/what-is-aws-artifact.html", "https://docs.aws.amazon.com/artifact/latest/ug/managing-agreements.html"] },

  { id: "saa-1-223", exam: "SAA", saa: "1.3", topic: "cloudhsm", type: "mc",
    q: "A bank wants to keep using SSE-KMS for S3 and KMS encryption for EBS volumes, but regulators now require that the key material live in single-tenant HSMs that the bank controls in its own AWS account. Which solution meets these requirements while keeping the KMS integrations?",
    opts: [
      "Create an AWS CloudHSM cluster, connect it to a new AWS KMS CloudHSM key store, and create the bank's KMS keys in that key store.",
      "Create customer managed KMS keys with imported key material, and delete the bank's local copy after the import completes.",
      "Create customer managed KMS keys in the default key store, and turn on automatic rotation with a 90-day rotation period.",
      "Create an AWS CloudHSM cluster, and switch the S3 uploads and EBS volumes to SSE-C with keys exported from the cluster."
    ], a: 0,
    no: [null,
      "Imported key material is still held in the HSMs that KMS manages for all customers, not in the bank's own HSMs.",
      "Keys in the default key store live in HSMs that AWS manages, whatever the rotation period.",
      "EBS doesn't support SSE-C, and the bank would lose the KMS integrations it wants to keep."],
    why: "A CloudHSM key store keeps the key material of KMS keys in a CloudHSM cluster in your account, and cryptographic operations run in those HSMs. The keys still work with AWS services that integrate with KMS.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/keystore-cloudhsm.html"] },

  { id: "saa-1-224", exam: "SAA", saa: "1.3", topic: "config", type: "mc",
    q: "A company runs AWS Config with dozens of rules in all 50 accounts of its organization, across three Regions. Auditors in the security account want one read-only view of every account's resource inventory and rule compliance, without signing in to each account or Region. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Create an AWS Config organization aggregator in the security account that covers all accounts and Regions.",
      "Create an organization trail in AWS CloudTrail, and send all of the logs to an S3 bucket in the security account.",
      "Deliver every account's Config snapshots to one S3 bucket, and build Athena queries for inventory and compliance.",
      "Turn on Systems Manager Inventory in every account, and sync it to a resource data sync bucket in the security account."
    ], a: 0,
    no: [null,
      "CloudTrail records API calls, not the current inventory or the compliance status of Config rules.",
      "That can work, but the auditors would have to build and maintain the queries themselves.",
      "Systems Manager Inventory collects software and settings from managed instances, not all resources or Config rule results."],
    why: "A Config aggregator collects configuration and compliance data from multiple accounts and Regions, or a whole organization, into one account. It's a read-only view and has no extra charge.",
    doc: ["https://docs.aws.amazon.com/config/latest/developerguide/aggregate-data.html"] },

  { id: "saa-1-225", exam: "SAA", saa: "1.3", topic: "config", type: "mc",
    q: "A company's data protection policy requires versioning on every S3 bucket so that overwritten or deleted objects can be recovered. Engineers sometimes create buckets without it. The company wants noncompliant buckets fixed automatically within minutes of being detected, without writing or running custom code. What should a solutions architect do?",
    opts: [
      "Add the s3-bucket-versioning-enabled Config rule with automatic remediation by the AWS-ConfigureS3BucketVersioning runbook.",
      "Turn on GuardDuty S3 Protection, so that it turns on versioning for any bucket created without versioning.",
      "Turn on S3 Object Lock as the default for the account, so that every new bucket that engineers create has versioning turned on.",
      "Turn on AWS Trusted Advisor checks for the account, and have its security recommendations turn on versioning for each bucket."
    ], a: 0,
    no: [null,
      "GuardDuty detects threats. It doesn't change bucket settings.",
      "Object Lock is set per bucket, not as an account default, and it doesn't fix the existing buckets.",
      "Trusted Advisor gives recommendations. It doesn't remediate resources."],
    why: "AWS Config rules can have remediation actions that run Systems Manager Automation runbooks. With automatic remediation, a bucket that the managed rule marks noncompliant is fixed by the AWS-ConfigureS3BucketVersioning runbook without custom code.",
    doc: ["https://docs.aws.amazon.com/config/latest/developerguide/remediation.html", "https://docs.aws.amazon.com/systems-manager-automation-runbooks/latest/userguide/automation-aws-configures3bucketversioning.html"] },

  { id: "saa-1-226", exam: "SAA", saa: "1.3", topic: "backup", type: "mc",
    q: "A company's policy says backups must be kept at least 1 year and no more than 7 years, and any backup job set up with a shorter or longer retention must fail. Once in place, nobody, including the root user, may change the rule. The team wants a few days to test the setting before it becomes permanent. Which solution meets these requirements?",
    opts: [
      "Apply AWS Backup Vault Lock in compliance mode with minimum and maximum retention, and a grace time of several days.",
      "Apply AWS Backup Vault Lock in governance mode with minimum and maximum retention set, and remove it if the testing goes badly.",
      "Set the lifecycle in every backup plan to delete recovery points after 7 years, and allow only the backup team to edit the plans.",
      "Turn on S3 Object Lock in compliance mode on the backup vault, with a default retention period of 1 year for all recovery points."
    ], a: 0,
    no: [null,
      "Governance mode can be removed by users with sufficient IAM permissions, so the rule would never become fixed.",
      "Plans can still be edited, and nothing makes a job with the wrong retention fail.",
      "A backup vault isn't an S3 bucket, so S3 Object Lock settings don't apply to it."],
    why: "With minimum and maximum retention set, Vault Lock makes backup and copy jobs that don't conform fail. In compliance mode the lock can still be removed during its grace time (at least 72 hours), and after that nobody, AWS included, can change it.",
    doc: ["https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html"] },

  { id: "saa-1-227", exam: "SAA", saa: "1.3", topic: "s3", type: "mc",
    q: "A company is told to preserve a set of documents in an S3 bucket with Object Lock turned on until a lawsuit ends, and nobody knows when that will be. The documents must not be deleted or overwritten in the meantime, and the legal team must be able to release them as soon as the case closes. Which solution meets these requirements?",
    opts: [
      "Place an Object Lock legal hold on each document version, and give only the legal team the s3:PutObjectLegalHold permission.",
      "Apply compliance mode retention for 10 years to each document version, so that the documents are safe even if the case runs long.",
      "Apply governance mode retention for 1 year to each document version, and extend the retain-until date every year until the end.",
      "Turn on MFA Delete for the bucket, and give the MFA device for the bucket owner's root user to the legal team to hold."
    ], a: 0,
    no: [null,
      "Compliance mode retention can't be shortened or removed by anyone, so the documents couldn't be released when the case closes.",
      "This depends on someone extending the date on time. If a renewal is missed, the documents can be deleted.",
      "MFA Delete only adds an MFA check. The root user with the device can still delete the versions."],
    why: "A legal hold gives the same protection as a retention period but has no expiration date. It stays until someone with s3:PutObjectLegalHold removes it, independent of any retention period.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html"] },

  { id: "saa-1-228", exam: "SAA", saa: "1.3", topic: "kms", type: "mc",
    q: "A regulator requires the key material that protects a company's S3 and EBS data to be rotated every 180 days. Rotation must be automatic, the key ID and ARN that apps and policies use must not change, and the team must not have to re-encrypt any data. Which solution meets these requirements?",
    opts: [
      "Use a customer managed KMS key, and turn on automatic key rotation with a custom rotation period of 180 days.",
      "Use the AWS managed keys for S3 and EBS, and set each one's automatic key rotation period to 180 days.",
      "Create a new KMS key every 180 days with a scheduled Lambda function, and point the alias at the new key.",
      "Store the key in Secrets Manager, and turn on automatic rotation for the secret with a 180-day schedule."
    ], a: 0,
    no: [null,
      "AWS managed keys rotate every year, and you can't change their rotation settings.",
      "A new key has a new key ID and ARN, and policies or apps that use the old ID would break.",
      "Secrets Manager rotates secrets such as passwords. S3 and EBS encryption uses KMS keys."],
    why: "Customer managed keys accept a custom automatic rotation period of 90 to 2,560 days. Rotation adds new key material under the same key ID, and KMS keeps the old material to decrypt existing data, so nothing needs re-encrypting.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/rotating-keys-enable.html", "https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html"] },

  { id: "saa-1-229", exam: "SAA", saa: "1.3", topic: "kms", type: "mc",
    q: "Analysts read objects from an S3 bucket encrypted with SSE-KMS using a customer managed key in us-east-1. Security wants the analysts' role to be able to use the key only for S3 requests to the bucket, so that the role can't call KMS Decrypt directly on data copied out of other systems. Which key policy change meets this requirement?",
    opts: [
      "Allow kms:Decrypt for the role only when the kms:ViaService condition equals s3.us-east-1.amazonaws.com.",
      "Allow kms:Decrypt for the role only when the aws:SourceIp condition matches the office range.",
      "Allow kms:Decrypt for the role only when the aws:SecureTransport condition is true for the analysts' request.",
      "Allow kms:Decrypt for the role only when the kms:CallerAccount condition equals the bucket owner's account."
    ], a: 0,
    no: [null,
      "Requests that S3 makes on the role's behalf don't come from the corporate address range, and direct calls from the office would still be allowed.",
      "Direct calls to KMS also use TLS, so this doesn't stop the role from calling Decrypt itself.",
      "The role is in that account, so direct Decrypt calls would match the condition too."],
    why: "The kms:ViaService condition key limits use of a KMS key to requests that come from a named AWS service in a Region. The role can still read objects through S3, but its own direct calls to KMS are not allowed.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html"] },

  { id: "saa-1-230", exam: "SAA", saa: "1.3", topic: "s3", type: "mc",
    q: "A company replicates an S3 bucket in us-east-1 to a bucket in us-west-2 for disaster recovery. Objects encrypted with SSE-S3 replicate, but objects encrypted with SSE-KMS using a customer managed key never show up in the destination. Replicas must stay encrypted with a KMS key. What should a solutions architect do?",
    opts: [
      "Turn on replication of SSE-KMS objects in the rule, name a us-west-2 KMS key for replicas, and grant the replication role decrypt and encrypt on the keys.",
      "Change the destination bucket's default encryption to SSE-KMS with a us-west-2 key, so that S3 starts to replicate the source bucket's SSE-KMS objects.",
      "Turn on S3 Replication Time Control for the rule, so that every object, including the SSE-KMS objects, is replicated within 15 minutes of upload.",
      "Run an S3 Batch Replication job every night, so that the SSE-KMS objects the live replication rule skipped are copied to the destination bucket."
    ], a: 0,
    no: [null,
      "The destination's default encryption isn't used for replication, and it doesn't make S3 replicate SSE-KMS objects.",
      "Replication Time Control speeds up replication. It doesn't change which objects the rule includes.",
      "Batch Replication uses the same replication configuration, so the SSE-KMS objects would still be skipped."],
    why: "By default, S3 doesn't replicate objects encrypted with SSE-KMS. The replication rule must opt in to them and give a KMS key in the destination Region for the replicas, and the replication role needs kms:Decrypt on the source key and kms:Encrypt on the destination key.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-config-for-kms-objects.html"] }
);
