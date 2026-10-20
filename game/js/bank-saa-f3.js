// Question bank batch: SAA security, governance and edge-network services brought to at least three questions each
// (CloudHSM, Detective, Firewall Manager, Network Firewall, Security Hub CSPM, Shield, Artifact, Directory Service,
// Client VPN, Control Tower, PrivateLink, Global Accelerator). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Domain 1: Design Secure Architectures
  { id: "saa-1-461", exam: "SAA", saa: "1.3", topic: "cloudhsm", type: "mc",
    q: "A company signs documents with keys held in an AWS CloudHSM cluster that has one HSM in one Availability Zone. The signing service must keep working if an Availability Zone fails, and keys generated during normal operation must not be lost if a single HSM fails before the next backup. Which solution meets these requirements?",
    opts: [
      "Add HSMs to the cluster so it has at least three, each in a different Availability Zone, and let the client SDK spread requests across them.",
      "Copy the cluster's backups to a second Region every day, and restore a new cluster from the latest copy when an outage occurs.",
      "Create a second, separate CloudHSM cluster in another Availability Zone, and have the app switch to it when the first one fails.",
      "Move the signing keys to AWS KMS multi-Region keys, and call the replica key in another Region if the primary Region fails."
    ], a: 0,
    no: [null,
      "Restoring from a backup takes time and loses keys created since that backup, so it's recovery, not availability.",
      "HSMs synchronize keys only within one cluster. A separate cluster wouldn't have the keys created in the first one.",
      "KMS keys live in multi-tenant AWS-managed HSMs, not in the single-tenant HSMs the company chose CloudHSM for."],
    why: "HSMs in one CloudHSM cluster synchronize keys and users, and spreading them across Availability Zones gives redundancy. AWS recommends at least three HSMs in different Availability Zones when newly generated keys must be durable.",
    doc: ["https://docs.aws.amazon.com/cloudhsm/latest/userguide/bp-cluster-management.html", "https://docs.aws.amazon.com/cloudhsm/latest/userguide/clusters.html"] },

  { id: "saa-1-462", exam: "SAA", saa: "1.2", topic: "detective", type: "multi", hint: "Select TWO.",
    q: "A company has 40 accounts in AWS Organizations and runs many Amazon EKS clusters in one Region. A security account has been the delegated Amazon Detective administrator since 2021, but only some accounts are enabled in its behavior graph, and the graph holds no EKS data. Analysts in a security account must investigate GuardDuty findings across every account, including accounts created later, and must see Kubernetes user activity in the clusters. The team doesn't want to turn on or store any extra logs itself. Which steps meet these requirements with the LEAST operational overhead? (Select TWO.)",
    items: [
      { t: "In the security account, enable all organization accounts in the behavior graph, and turn on auto-enable for new accounts.", ok: true },
      { t: "In the organization behavior graph, start the optional Amazon Detective source package for Amazon EKS audit logs.", ok: true },
      { t: "Invite each member account to the behavior graph by email address, and have an administrator in each account accept the invitation.", ok: false, no: "Invitations work, but accounts created later wouldn't join on their own, and each one needs a manual acceptance." },
      { t: "Turn on EKS control plane audit logging in every cluster, and send the logs to a central S3 bucket that Athena can query.", ok: false, no: "That's the log pipeline the team wants to avoid, and Athena queries don't give the linked investigation view." },
      { t: "Create VPC flow logs and an organization trail in every account, and point both of them at the Detective behavior graph.", ok: false, no: "Detective reads CloudTrail and flow log data through its own independent streams. You don't create or point logs at it." }
    ],
    why: "The Detective administrator account can enable the existing organization accounts and turn on auto-enable for accounts added later. The EKS audit logs package is on by default only for behavior graphs created after July 2022, so this older graph needs it started; it lets Detective ingest EKS user activity without anyone turning on or storing those logs.",
    doc: ["https://docs.aws.amazon.com/detective/latest/userguide/accounts-orgs-members-autoenable.html", "https://docs.aws.amazon.com/detective/latest/userguide/detective-source-data-about.html"] },

  { id: "saa-1-463", exam: "SAA", saa: "1.2", topic: "firewallmanager", type: "mc",
    q: "A company has 50 accounts in AWS Organizations, and application teams create new VPCs often. Security requires that every VPC in every account, including accounts and VPCs added later, filter traffic with AWS Network Firewall using the same central rule groups, and teams must not be able to skip it. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Create a Firewall Manager Network Firewall policy with the distributed model and the central rule groups for the organization.",
      "Use CloudFormation StackSets with automatic deployment to create a Network Firewall firewall in each account's existing VPCs.",
      "Create an AWS Firewall Manager AWS WAF policy with the central rules, and scope it to every VPC across the organization.",
      "Turn on an AWS Config rule that flags VPCs without a Network Firewall firewall, and ask each team to add one within a week."
    ], a: 0,
    no: [null,
      "Automatic deployment covers new accounts, not VPCs that teams create later, and teams could still change or delete the stacks' resources.",
      "AWS WAF protects web resources such as ALBs and CloudFront. A WAF policy can't attach to or filter a VPC.",
      "A Config rule only reports noncompliance. It leaves VPCs unprotected until someone acts."],
    why: "A Firewall Manager Network Firewall policy with the distributed model creates a firewall and firewall endpoints in each in-scope VPC across the organization's accounts, using rule groups from the administrator account, and applies to new accounts and VPCs as they appear.",
    doc: ["https://docs.aws.amazon.com/waf/latest/developerguide/network-firewall-policies.html", "https://docs.aws.amazon.com/waf/latest/developerguide/fms-prereq.html"] },

  { id: "saa-1-464", exam: "SAA", saa: "1.2", topic: "networkfirewall", type: "multi", hint: "Select TWO.",
    q: "Web servers with public IP addresses run in a public subnet whose route table sends 0.0.0.0/0 to the internet gateway. A solutions architect has created an AWS Network Firewall firewall with its endpoint in a separate firewall subnet, whose route table sends 0.0.0.0/0 to the internet gateway. All traffic between the web servers and the internet must now pass through the firewall in both directions. Which routing changes should the architect make? (Select TWO.)",
    items: [
      { t: "Associate a route table with the internet gateway that sends traffic for the web subnet's CIDR range to the firewall endpoint.", ok: true },
      { t: "In the web subnet's route table, change the 0.0.0.0/0 route so it points to the firewall endpoint instead of the gateway.", ok: true },
      { t: "Move the firewall endpoint into the web servers' own subnet, so all traffic reaches the firewall before it reaches them.", ok: false, no: "A firewall endpoint can't filter traffic going into or out of its own subnet, so firewall subnets should hold only firewall endpoints." },
      { t: "In the firewall subnet's route table, change the 0.0.0.0/0 route so that it points back to the firewall endpoint itself.", ok: false, no: "That would loop inspected traffic back into the firewall. The firewall subnet must send internet traffic to the gateway." },
      { t: "Add network ACL rules to the web subnet that forward all inbound and outbound internet traffic to the firewall endpoint.", ok: false, no: "Network ACLs only allow or deny traffic. They can't forward it anywhere; route tables do that." }
    ],
    why: "Network Firewall inspects only traffic that route tables send to its endpoint. An internet gateway route table (edge association) sends inbound traffic for the web subnet to the endpoint, and the web subnet's default route sends outbound traffic there, so both directions are inspected.",
    doc: ["https://docs.aws.amazon.com/network-firewall/latest/developerguide/arch-single-zone-igw.html", "https://docs.aws.amazon.com/network-firewall/latest/developerguide/vpc-config-subnets.html"] },

  { id: "saa-1-465", exam: "SAA", saa: "1.2", topic: "securityhub", type: "multi", hint: "Select TWO.",
    q: "A company uses AWS Security Hub CSPM with a delegated administrator account. Analysts are buried in findings. Findings from production accounts must have their severity raised to CRITICAL as they arrive, and when the control that checks S3 Block Public Access fails, a Lambda function must fix the bucket with no analyst action. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "In the administrator account, create a Security Hub CSPM automation rule that matches the production account IDs and sets severity to CRITICAL.", ok: true },
      { t: "Create an EventBridge rule for Security Hub Findings - Imported events that match the failed control, with the Lambda function as its target.", ok: true },
      { t: "Create a Security Hub CSPM custom action, and have analysts choose it on each failed finding to send the finding to the Lambda function.", ok: false, no: "Custom actions send only findings that someone selects in the console, so they need analyst action." },
      { t: "Create a Security Hub CSPM insight that groups production findings, so that their severity is shown as CRITICAL in the console.", ok: false, no: "An insight is a saved grouping and filter of findings. It doesn't change any finding's severity." },
      { t: "Create an AWS Config aggregator in the administrator account that raises severity and invokes the function for failed findings.", ok: false, no: "An aggregator only collects Config data for viewing. It can't edit Security Hub findings or invoke functions." }
    ],
    why: "Automation rules update findings that match their criteria (such as account ID) as Security Hub CSPM ingests them. Security Hub CSPM also sends every new and updated finding to EventBridge as a Security Hub Findings - Imported event, which a rule can route to Lambda for automatic remediation.",
    doc: ["https://docs.aws.amazon.com/securityhub/latest/userguide/automation-rules.html", "https://docs.aws.amazon.com/securityhub/latest/userguide/securityhub-cwe-integration-types.html"] },

  { id: "saa-1-466", exam: "SAA", saa: "1.2", topic: "shield", type: "mc",
    q: "A UDP game service runs on EC2 instances in a public subnet, each with an Elastic IP address and no load balancer. The subnet's network ACL blocks traffic the game never uses, but large volumetric attacks overwhelm the instances' network capacity before those rules can help. The company wants its network ACL rules enforced at the edge of the AWS network during an attack. Which solution meets these requirements?",
    opts: [
      "Subscribe to AWS Shield Advanced, and add protection for the Elastic IP addresses attached to the game servers.",
      "Rely on AWS Shield Standard, which is already active for every AWS customer and applies to Elastic IP addresses automatically.",
      "Create an AWS WAF web ACL with rate-based rules and the blocked ranges, and associate it with each of the game server instances.",
      "Route all game traffic through AWS Network Firewall endpoints in the VPC with stateless rules that copy the network ACL rules."
    ], a: 0,
    no: [null,
      "Shield Standard defends against common attacks at no cost, but it doesn't copy the subnet's network ACL rules to the AWS border.",
      "AWS WAF can't be associated with EC2 instances, and it inspects web requests, not raw UDP game traffic.",
      "The firewall runs inside the VPC, so a flood larger than the VPC path can handle still arrives before the rules apply."],
    why: "When Shield Advanced protects an Elastic IP address, it replicates the network ACL of the attached subnet into its mitigations and, during an attack, applies those rules at the AWS network border, which can absorb far more traffic than the instance or VPC.",
    doc: ["https://docs.aws.amazon.com/waf/latest/developerguide/ddos-protections-ec2-nlb.html", "https://docs.aws.amazon.com/waf/latest/developerguide/ddos-event-mitigation-logic-adv-eip.html"] },

  { id: "saa-1-467", exam: "SAA", saa: "1.1", topic: "artifact", type: "mc",
    q: "A company's compliance analysts use IAM roles to get AWS compliance reports from AWS Artifact. They may download only the AWS SOC and PCI reports. They must not download other reports, and they must not accept or terminate any agreement with AWS. Which solution meets these requirements?",
    opts: [
      "Allow ListReports, and allow GetReportMetadata, GetReport and GetTermForReport only where artifact:ReportSeries is SOC or PCI.",
      "Attach the AWS managed policy AWSArtifactReportsReadOnlyAccess to the analysts' role, which grants read-only access to Artifact reports.",
      "Allow the actions ListAgreements, GetAgreement and AcceptNdaForAgreement, which let a role read and download Artifact documents.",
      "Download the SOC and PCI reports once a year, and store them in an S3 bucket whose bucket policy lets only the analysts' role read them."
    ], a: 0,
    no: [null,
      "That managed policy lets the role download every report, not just SOC and PCI.",
      "Those are agreement actions. They don't download reports, and they let the role act on agreements.",
      "Reports would go stale between copies, and the stem says analysts get the reports from AWS Artifact."],
    why: "AWS Artifact supports fine-grained report permissions. The report actions can be limited with the artifact:ReportSeries and artifact:ReportCategory condition keys, so a role can download only the report series it needs, with no agreement actions.",
    doc: ["https://docs.aws.amazon.com/artifact/latest/ug/example-iam-policies.html", "https://docs.aws.amazon.com/artifact/latest/ug/using-condition-keys.html"] },

  { id: "saa-1-468", exam: "SAA", saa: "1.3", topic: "artifact", type: "mc",
    q: "A company's compliance officer maps the company's controls to AWS's SOC and ISO reports and must know as soon as AWS publishes a new version of a report, or updates an agreement the company accepted, so the mapping is never out of date. No one wants to check the console by hand. Which solution meets these requirements?",
    opts: [
      "Choose notification hubs in AWS User Notifications, then create an AWS Artifact notification configuration for the officer.",
      "Create a CloudTrail trail and a metric filter on Artifact GetReport events, with an alarm that emails the compliance officer.",
      "Turn on AWS Config in the account, and add a managed rule that reports when the AWS Artifact reports change in any Region.",
      "Turn on the AWS Trusted Advisor security checks, and have weekly Trusted Advisor emails sent to the compliance officer."
    ], a: 0,
    no: [null,
      "CloudTrail records API calls made in the account, such as someone downloading a report, not AWS publishing a new one.",
      "AWS Config tracks the configuration of the company's own resources. It doesn't track AWS's compliance reports.",
      "Trusted Advisor checks the company's own resources against best practices. It doesn't track new versions of AWS reports or agreements."],
    why: "AWS Artifact can send email notifications about updates to reports and agreements. It delivers them through AWS User Notifications, so notification hubs must be selected there before an Artifact notification configuration names the recipients.",
    doc: ["https://docs.aws.amazon.com/artifact/latest/ug/managing-notifications.html"] },

  { id: "saa-1-469", exam: "SAA", saa: "1.1", topic: "directoryservice", type: "mc",
    q: "A company is rolling out Amazon WorkSpaces in one VPC. Employees must sign in with their existing on-premises Active Directory accounts, and their existing RADIUS-based MFA must apply. Security forbids storing or caching any directory data in AWS, and the team doesn't want to run domain controllers in the cloud. Which solution meets these requirements?",
    opts: [
      "Create an AD Connector in the WorkSpaces VPC for the on-premises domain, and turn on MFA with the RADIUS servers.",
      "Create an AWS Managed Microsoft AD directory for WorkSpaces, and set up a forest trust from it to the on-premises Active Directory.",
      "Launch Windows domain controllers on EC2 in the VPC, join them to the on-premises domain, and point WorkSpaces at them.",
      "Create an Amazon Cognito user pool that federates with the on-premises Active Directory, and use it to sign users in to WorkSpaces."
    ], a: 0,
    no: [null,
      "Managed Microsoft AD is a separate directory hosted in AWS, which breaks the rule against keeping directory data in AWS.",
      "Those domain controllers would hold a replica of the directory in AWS, and the team would have to run and patch them.",
      "WorkSpaces can't use a Cognito user pool for sign-in. Cognito user pools sign users in to web and mobile apps."],
    why: "AD Connector is a directory gateway that redirects requests to the on-premises Active Directory without caching anything in the cloud. It supports WorkSpaces in the same VPC and can enforce MFA through existing RADIUS servers.",
    doc: ["https://docs.aws.amazon.com/directoryservice/latest/admin-guide/directory_ad_connector.html", "https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ad_connector_mfa.html"] },

  { id: "saa-1-470", exam: "SAA", saa: "1.1", topic: "directoryservice", type: "multi", hint: "Select TWO.",
    q: "An AWS Managed Microsoft AD directory runs in a shared services account that is not the organization's management account. Twelve application accounts, each with its own VPC in the same Region, must seamlessly join new Windows EC2 instances to that domain. The company doesn't want a separate directory in each account. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Connect each application VPC to the directory's VPC with a transit gateway, and allow Active Directory traffic between them.", ok: true },
      { t: "Share the directory with each application account using the handshake method, and accept the invitation in each account.", ok: true },
      { t: "Create an AD Connector for the directory in the shared services account, and share the AD Connector with every application account.", ok: false, no: "An AD Connector can't be shared with other AWS accounts. Directory sharing is a Managed Microsoft AD feature." },
      { t: "Turn on Multi-Region replication for the directory, and add each application account as a replica location for the domain.", ok: false, no: "Multi-Region replication copies a directory to other Regions in the same account, not to other accounts." },
      { t: "Create a Managed Microsoft AD directory in each application account, and set up a two-way forest trust with the shared directory.", ok: false, no: "That adds the twelve separate directories the company wants to avoid, each to pay for and manage." }
    ],
    why: "Directory sharing creates a shared directory in each consumer account that EC2 uses for seamless domain join. The handshake method, used when the directory isn't in the management account, needs each consumer to accept, and network connectivity between the VPCs is a prerequisite.",
    doc: ["https://docs.aws.amazon.com/directoryservice/latest/admin-guide/ms_ad_directory_sharing.html"] },

  { id: "saa-1-471", exam: "SAA", saa: "1.2", topic: "clientvpn", type: "mc",
    q: "Remote employees connect to a VPC (10.20.0.0/16) through an AWS Client VPN endpoint that uses the default settings. All their internet traffic, including video calls, now goes through the tunnel and out of AWS, so browsing is slow and data transfer charges are high. Only traffic for the VPC needs the tunnel. Which solution is MOST cost-effective?",
    opts: [
      "Turn on split-tunnel on the Client VPN endpoint, so only traffic for the endpoint's routes goes through the tunnel.",
      "Remove the authorization rule for 0.0.0.0/0 from the Client VPN endpoint, while keeping the rule that gives access to 10.20.0.0/16.",
      "Add interface VPC endpoints for the AWS services the employees use, so their traffic to those services stays off the NAT gateway.",
      "Replace the Client VPN endpoint with a Site-to-Site VPN connection to each employee's home router, routing only 10.20.0.0/16."
    ], a: 0,
    no: [null,
      "Without split-tunnel, clients still send all traffic into the tunnel, so their internet traffic would be dropped instead of going local.",
      "Most of the traffic is to the internet, such as video calls, not to AWS services, so it would still go through the tunnel.",
      "Site-to-Site VPN connects networks with gateway devices, and a connection per home would cost far more to run."],
    why: "By default a Client VPN endpoint sends all client traffic through the tunnel. With split-tunnel, only the routes in the endpoint's route table are pushed to the device, so only VPC traffic uses the tunnel, which also cuts data transfer out of AWS.",
    doc: ["https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/split-tunnel-vpn.html"] },

  { id: "saa-1-472", exam: "SAA", saa: "1.2", topic: "clientvpn", type: "multi", hint: "Select TWO.",
    q: "An AWS Client VPN endpoint with split-tunnel turned on is associated with a subnet in VPC A. VPC A is peered with VPC B, and instances in the two VPCs can already reach each other. Connected users can reach VPC A, but not a database in VPC B, whose security group already allows the endpoint's security group. Users must keep their internet traffic local. Which steps will give users access to VPC B? (Select TWO.)",
    items: [
      { t: "Add a route to the Client VPN endpoint's route table for VPC B's CIDR range, with the associated subnet in VPC A as the target.", ok: true },
      { t: "Add an authorization rule to the Client VPN endpoint that gives users access to VPC B's CIDR range as a destination network.", ok: true },
      { t: "Associate a subnet in VPC B with the same Client VPN endpoint as a second target network, so traffic can enter VPC B directly.", ok: false, no: "All subnets associated with a Client VPN endpoint must be in the same VPC." },
      { t: "Add a route in VPC B's route tables for the client CIDR range that points to the peering connection with VPC A.", ok: false, no: "Client VPN translates client addresses to its network interface in VPC A, so VPC B already routes replies over the peering." },
      { t: "Create a second Client VPN endpoint associated with VPC B, and have users connect to both endpoints at the same time.", ok: false, no: "That doubles the endpoints to run and pay for, and it's unnecessary since one endpoint can route to the peered VPC." }
    ],
    why: "With split-tunnel, clients only get routes that are in the endpoint's route table, so VPC B's range needs a route through the associated subnet, and an authorization rule must allow users to reach that destination. Peering then carries the traffic on to VPC B.",
    doc: ["https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/how-it-works.html", "https://docs.aws.amazon.com/vpn/latest/clientvpn-admin/what-is-best-practices.html"] },

  { id: "saa-1-473", exam: "SAA", saa: "1.1", topic: "controltower", type: "mc",
    q: "A company governs its accounts with AWS Control Tower, and teams deploy everything with CloudFormation. Security now requires that every S3 bucket have server access logging configured. A template that would create a bucket without it must fail before the bucket exists, rather than being reported afterward. Which solution meets these requirements?",
    opts: [
      "Turn on the Control Tower proactive control that requires S3 server access logging on the OUs, using CloudFormation hooks.",
      "Turn on a Control Tower detective control for S3 server access logging on the OUs, which checks the buckets with AWS Config rules.",
      "Attach an SCP to the OUs that denies s3:CreateBucket requests, unless they include a condition key that turns server access logging on.",
      "Add an AWS Config rule with automatic remediation that turns on server access logging for any bucket where the setting is missing."
    ], a: 0,
    no: [null,
      "Detective controls use AWS Config to find noncompliant resources after they are created, not before.",
      "Server access logging is set by a separate API call after the bucket exists, so a CreateBucket condition can't require it.",
      "Remediation runs after the bucket exists, so the noncompliant bucket is still created first."],
    why: "Control Tower proactive controls are implemented with CloudFormation hooks. They check resources in a template before provisioning, and noncompliant resources are not provisioned. Preventive controls use SCPs and RCPs, and detective controls use AWS Config rules.",
    doc: ["https://docs.aws.amazon.com/controltower/latest/userguide/how-controls-work.html", "https://docs.aws.amazon.com/controltower/latest/controlreference/s3-rules.html"] },

  { id: "saa-1-474", exam: "SAA", saa: "1.1", topic: "controltower", type: "mc",
    q: "A company has just set up an AWS Control Tower landing zone in its existing organization. An OU named Legacy holds 40 accounts that were created years ago and run production workloads. All of them must get the landing zone's baseline and the controls that are turned on for that OU. Which solution meets these requirements with the LEAST operational effort?",
    opts: [
      "Register the Legacy OU with AWS Control Tower, so that its member accounts are enrolled in the landing zone.",
      "Create 40 new accounts through Account Factory, and migrate each production workload from its old account into one of the new accounts.",
      "Attach the same SCPs that the landing zone uses to the Legacy OU in AWS Organizations, leaving the accounts outside Control Tower.",
      "Deploy the landing zone's AWS Config rules to the 40 accounts with CloudFormation StackSets, and review their findings each week."
    ], a: 0,
    no: [null,
      "Moving 40 production workloads is a large migration when the existing accounts can be enrolled in place.",
      "SCPs alone leave out the baseline resources and detective controls, and Control Tower wouldn't govern the accounts.",
      "Copying some rules by hand isn't enrollment, and it misses the baseline and the preventive controls."],
    why: "Registering an existing OU extends Control Tower governance to it: its member accounts are enrolled into the landing zone, receive the baseline, and get the controls enabled on the OU. It's the efficient way to bring many existing accounts in at once.",
    doc: ["https://docs.aws.amazon.com/controltower/latest/userguide/importing-existing.html"] },

  // Domain 3: Design High-Performing Architectures
  { id: "saa-3-461", exam: "SAA", saa: "3.4", topic: "privatelink", type: "mc",
    q: "A SaaS company runs an analytics API behind a Network Load Balancer in its VPC. About 200 customer VPCs in other AWS accounts must call the API privately, without traversing the internet. Many customers use 10.0.0.0/16, the same CIDR range as the company's VPC, and the company's VPC must not be able to open connections into any customer VPC. Which solution meets these requirements?",
    opts: [
      "Publish the NLB as a VPC endpoint service, and have each customer create an interface VPC endpoint to it in their own VPC.",
      "Create a VPC peering connection with each customer VPC, and add routes to the API's subnets in both sides' route tables.",
      "Attach every customer VPC to a shared transit gateway, and use transit gateway route tables to reach the API's subnets.",
      "Make the NLB internet-facing, and restrict access to customer IP ranges with security group rules on the load balancer."
    ], a: 0,
    no: [null,
      "Peering doesn't work between VPCs with overlapping CIDR ranges, and it allows traffic to start from either side.",
      "Routing can't tell apart VPCs that use the same CIDR range, and attachments would open routed access in both directions.",
      "An internet-facing NLB sends the traffic over the internet, which the company must avoid."],
    why: "With AWS PrivateLink, the consumer reaches the service through an interface endpoint's network interfaces in its own VPC, so overlapping CIDR ranges don't matter, and connections can only be started from the consumer side toward the service.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-share-your-services.html", "https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/aws-privatelink.html"] },

  { id: "saa-3-462", exam: "SAA", saa: "3.4", topic: "globalaccelerator", type: "mc",
    q: "A trading API uses an AWS Global Accelerator standard accelerator with endpoint groups in us-east-1 and eu-west-1. The team must take us-east-1 out of service for a maintenance window and then bring it back gradually, in steps of 25 percent. Clients connect to the accelerator's static IP addresses, and connections already open should not be cut. Which solution meets these requirements?",
    opts: [
      "Set the us-east-1 endpoint group's traffic dial to 0 for the maintenance, then raise it to 25, 50, 75 and 100 percent.",
      "Use Route 53 weighted records for each Region's load balancer, and lower the us-east-1 weight before raising it in steps.",
      "Delete the us-east-1 endpoint group for the maintenance window, then recreate it with the same load balancer afterward.",
      "Remove the load balancer from the us-east-1 endpoint group, then add it back with a weight of 25 and raise the weight in steps."
    ], a: 0,
    no: [null,
      "Clients use the accelerator's static IPs, not DNS names that point at each Region, so weighted records wouldn't change their traffic.",
      "Recreating the group brings back all of the Region's traffic at once, with no gradual steps.",
      "Weights split traffic among endpoints within one group. With a single endpoint, any weight gets all of the group's traffic."],
    why: "Each endpoint group has a traffic dial that sets the percentage of its traffic it accepts, and the rest goes to other endpoint groups. Changes apply to new connections only, so existing connections aren't terminated.",
    doc: ["https://docs.aws.amazon.com/global-accelerator/latest/dg/about-endpoint-groups-traffic-dial.html"] }
);
