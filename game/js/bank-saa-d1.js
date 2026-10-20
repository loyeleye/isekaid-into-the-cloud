// Question bank batch: SAA-C03 Domain 1, Design Secure Architectures (tasks 1.1, 1.2, 1.3). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 1.1: Secure access to AWS resources
  { id: "saa-1-101", exam: "SAA", saa: "1.1", topic: "iam", type: "mc",
    q: "A platform team wants developers to create their own IAM roles for Lambda functions without waiting for the security team. A developer must never be able to create a role with more permissions than the company's approved maximum, even by attaching AdministratorAccess to it. Which solution meets these requirements?",
    opts: [
      "Allow iam:CreateRole only when the iam:PermissionsBoundary condition names the approved boundary, and deny removing boundaries.",
      "Let developers call iam:CreateRole and iam:AttachRolePolicy freely, and run a nightly AWS Config rule that reports any role with admin policies.",
      "Attach an SCP to the developers' account that denies iam:CreateRole for everyone, and let the security team create every role on request.",
      "Give developers a role that can only attach AWS managed policies, and rely on AWS to keep those managed policies to least privilege."
    ], a: 0,
    no: [null,
      "A nightly report finds an over-privileged role after it exists. It doesn't stop a developer from creating one.",
      "That blocks the self-service the platform team wants, and the security team stays a bottleneck.",
      "AWS managed policies include AdministratorAccess, so a developer could still create a role with full access."],
    why: "A permissions boundary caps the most a role can ever do: its effective permissions are the intersection of its identity policies and the boundary. Requiring the boundary on every role a developer creates makes delegation safe.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html"] },

  { id: "saa-1-102", exam: "SAA", saa: "1.1", topic: "organizations", type: "mc",
    q: "A company attaches an SCP to the root of its organization that denies deleting CloudTrail trails. Tests show the SCP stops users in every member account, but an engineer working in the management account was still able to delete a trail there. What should a solutions architect recommend?",
    opts: [
      "Run workloads and daily work in member accounts, and tightly limit who can sign in to the management account, which SCPs never restrict.",
      "Attach the same SCP directly to the management account as well, because SCPs attached to the root skip it until they are attached there.",
      "Turn on all features in the organization, because SCPs only reach the management account when all features are turned on.",
      "Change the SCP's Deny statement to an Allow list of approved actions, because SCPs only restrict the management account in allow-list form."
    ], a: 0,
    no: [null,
      "Attaching it directly changes nothing: SCPs don't affect users or roles in the management account wherever they are attached.",
      "All features are needed to use SCPs at all. They still don't apply to the management account.",
      "An allow-list SCP has the same scope as a deny-list SCP, and neither restricts the management account."],
    why: "SCPs affect only member accounts. They have no effect on users or roles in the management account, so AWS recommends keeping workloads out of it and limiting access to it.",
    doc: ["https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html", "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_best-practices_mgmt-acct.html"] },

  { id: "saa-1-103", exam: "SAA", saa: "1.1", topic: "controltower", type: "multi", hint: "Select TWO.",
    q: "A growing company wants a well-architected multi-account environment set up quickly: a log archive account, an audit account, governance controls applied to groups of accounts, and new team accounts that start with that same baseline without hand configuration. Which actions meet these requirements with the LEAST operational overhead? (Select TWO.)",
    items: [
      { t: "Set up an AWS Control Tower landing zone, which creates the shared accounts and applies controls to organizational units.", ok: true },
      { t: "Provision each new team account through Control Tower Account Factory so it is enrolled with the landing zone baseline.", ok: true },
      { t: "Create each new account by hand in AWS Organizations, then run a checklist that turns on CloudTrail and AWS Config in it.", ok: false, no: "It works, but every account means manual steps that drift over time. That is the overhead the company wants to avoid." },
      { t: "Write custom CloudFormation templates for the log archive and audit accounts and deploy them with a scheduled Lambda function.", ok: false, no: "This rebuilds by hand what Control Tower already sets up and maintains." },
      { t: "Create one large shared account for all teams, and separate the teams with IAM groups and resource tags in that account.", ok: false, no: "A single account gives up the isolation and per-account controls of a multi-account landing zone." }
    ],
    why: "AWS Control Tower builds a landing zone on AWS Organizations, with shared log archive and audit accounts and preventive and detective controls applied to OUs. Account Factory provisions new accounts that are enrolled in that baseline.",
    doc: ["https://docs.aws.amazon.com/controltower/latest/userguide/what-is-control-tower.html", "https://docs.aws.amazon.com/controltower/latest/userguide/account-factory.html"] },

  { id: "saa-1-104", exam: "SAA", saa: "1.1", topic: "iam", type: "multi", hint: "Select TWO.",
    q: "A startup runs everything in one standalone AWS account that is not part of an organization. An audit finds that the root user has an active access key used by a deployment script, and that the root user signs in with a password only. Which actions should a solutions architect take to secure the root user? (Select TWO.)",
    items: [
      { t: "Turn on MFA for the root user, and keep its sign-in for the few tasks that truly need root user credentials.", ok: true },
      { t: "Move the deployment script to an IAM role with only the permissions it needs, then delete the root user's access key.", ok: true },
      { t: "Attach an IAM policy to the root user that denies every action except billing, so a stolen password can do little harm.", ok: false, no: "You can't attach IAM policies to the root user. Its permissions can't be limited with identity policies." },
      { t: "Rotate the root user's access key every 90 days, and store it in AWS Secrets Manager for the deployment script to read.", ok: false, no: "Rotating keeps a root key in use. AWS advises against having root user access keys at all." },
      { t: "Share the root user's password with the whole operations team through a password manager so no one is ever locked out.", ok: false, no: "Spreading root credentials widens who can do anything in the account. Daily work belongs in roles with least privilege." }
    ],
    why: "AWS recommends securing root user sign-in with MFA and not creating access keys for the root user. Workloads should use roles with temporary credentials.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/root-user-best-practices.html"] },

  { id: "saa-1-105", exam: "SAA", saa: "1.1", topic: "iam", type: "mc",
    q: "A company hires a third-party monitoring vendor that runs its software in the vendor's own AWS account and serves many customers. The vendor needs read-only access to the company's CloudWatch metrics. The company must not create long-term credentials, and must guard against another vendor customer tricking the vendor into using this access. What should a solutions architect do?",
    opts: [
      "Create a role that trusts the vendor's account and requires a unique external ID, with a read-only CloudWatch policy.",
      "Create an IAM user with read-only CloudWatch access, and send the vendor its access key over an encrypted channel to store safely.",
      "Create a role that trusts the vendor's account with a read-only CloudWatch policy, and share the role ARN only with the vendor.",
      "Add the vendor's account to a resource-based policy on each CloudWatch metric so the vendor can read them without assuming a role."
    ], a: 0,
    no: [null,
      "An access key is a long-term credential, which the company has ruled out.",
      "Without an external ID, the vendor could be tricked by another of its customers into using this role, the confused deputy problem.",
      "CloudWatch metrics have no resource-based policies to add an account to, so cross-account access needs a role."],
    why: "A cross-account role gives the vendor temporary credentials. The external ID condition in the trust policy ties each role to one customer, which prevents the confused deputy problem.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html"] },

  { id: "saa-1-106", exam: "SAA", saa: "1.1", topic: "iam", type: "multi", hint: "Select TWO.",
    q: "An ETL job in account B reads items from a DynamoDB table in account B and writes the results to an S3 bucket in account A. The job must keep its account B permissions while it writes, so assuming a role in account A is not an option. Which steps together grant the access? (Select TWO.)",
    items: [
      { t: "Add a statement to the bucket policy in account A that allows s3:PutObject for the job's role ARN from account B.", ok: true },
      { t: "Add an identity policy to the job's role in account B that allows s3:PutObject on the bucket in account A.", ok: true },
      { t: "Create a role in account A with s3:PutObject, and have the job call sts:AssumeRole on it before it starts writing.", ok: false, no: "Assuming a role gives up the original permissions for that session, so the job would lose its DynamoDB access in account B." },
      { t: "Add the bucket in account A to an SCP attached to account B so that the job's role is granted access to it.", ok: false, no: "SCPs never grant permissions. They only limit what identity policies allow." },
      { t: "Turn on S3 Object Ownership for the bucket in account A so that the job's role can write to it without any policy.", ok: false, no: "Object Ownership decides who owns uploaded objects. It doesn't grant another account write access." }
    ],
    why: "With a resource-based policy, the principal keeps working in its own account. Cross-account access needs both sides: the bucket policy in account A must allow the role, and the role's identity policy in account B must allow the action.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html"] },

  { id: "saa-1-107", exam: "SAA", saa: "1.1", topic: "shared-responsibility", type: "multi", hint: "Select TWO.",
    q: "A company is moving an app to Amazon EC2 instances that run Linux. The security team is writing down which tasks it owns under the AWS shared responsibility model. Which tasks are the company's responsibility? (Select TWO.)",
    items: [
      { t: "Install security patches for the Linux guest operating system and the app's software packages on the instances.", ok: true },
      { t: "Configure the security groups attached to the instances so that only the needed ports are open to the right sources.", ok: true },
      { t: "Patch the hypervisor and the host operating system of the physical servers that run the EC2 instances.", ok: false, no: "AWS operates the host operating system and the virtualization layer for EC2." },
      { t: "Control physical access to the data centers and replace failed disks and servers in the underlying hardware.", ok: false, no: "Physical security and hardware are AWS's side of the model." },
      { t: "Maintain the global network that links the AWS Regions and Availability Zones the instances run in.", ok: false, no: "The infrastructure that runs AWS services, including its networking, is AWS's responsibility." }
    ],
    why: "For EC2, AWS manages everything from the host operating system and virtualization layer down to the facilities. The customer manages the guest operating system, its patches, the application and the security group configuration.",
    doc: ["https://docs.aws.amazon.com/whitepapers/latest/aws-risk-and-compliance/shared-responsibility-model.html"] },

  { id: "saa-1-108", exam: "SAA", saa: "1.1", topic: "iam", type: "mc",
    q: "Operators sign in to the AWS console as IAM users. Company policy says they may view EC2 resources at any time, but they must have authenticated with MFA in the current session before they can stop or terminate instances. Which solution meets these requirements?",
    opts: [
      "Allow the view actions, and allow StopInstances and TerminateInstances only when aws:MultiFactorAuthPresent is true.",
      "Allow every EC2 action, and add an SCP that requires MFA for the entire account whenever any operator signs in to the console.",
      "Turn on MFA for each operator's IAM user, which on its own makes AWS require MFA for the instance stop and terminate actions.",
      "Allow every EC2 action, and add a CloudTrail rule that alerts the team when an instance is stopped or terminated without MFA."
    ], a: 0,
    no: [null,
      "SCPs work on member accounts in an organization and don't enforce MFA at sign-in. A policy condition is what checks MFA per action.",
      "Assigning an MFA device doesn't make any action require it. A policy must check for MFA.",
      "An alert after the fact doesn't stop the action."],
    why: "MFA-protected API access works through policy conditions: the aws:MultiFactorAuthPresent key is true only when the session was authenticated with MFA, so the sensitive actions are allowed only then.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_configure-api-require.html"] },

  { id: "saa-1-109", exam: "SAA", saa: "1.1", topic: "iam", type: "multi", hint: "Select TWO.",
    q: "A company has dozens of projects, and new ones start every month. Engineers may manage only the Secrets Manager secrets of their own project. Today each project has its own role and policy, and every new secret means a policy update. The company wants access that scales as projects and secrets are added. Which actions meet these requirements? (Select TWO.)",
    items: [
      { t: "Tag each engineer's role session and each secret with a project tag, and keep those tags accurate as part of onboarding.", ok: true },
      { t: "Use one policy that allows the actions when aws:ResourceTag/project equals ${aws:PrincipalTag/project}.", ok: true },
      { t: "Create one IAM group per project, and add a new statement to each group's policy that names each secret's ARN.", ok: false, no: "That is the per-resource policy editing the company wants to stop." },
      { t: "Store all of the secrets in one secret per project, and give every engineer read access to all of those secrets.", ok: false, no: "Everyone could read every project's secrets, which breaks least privilege." },
      { t: "Attach an SCP that denies secretsmanager:* to every engineer who isn't on a list of approved projects.", ok: false, no: "SCPs set guardrails for accounts. They aren't a way to map each engineer to their own project's secrets." }
    ],
    why: "Attribute-based access control compares tags on the principal with tags on the resource. New projects and secrets only need the right tags, not new policies.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_attribute-based-access-control.html", "https://docs.aws.amazon.com/IAM/latest/UserGuide/tutorial_attribute-based-access-control.html"] },

  { id: "saa-1-110", exam: "SAA", saa: "1.1", topic: "iam", type: "mc",
    q: "A company with 60 accounts in AWS Organizations is worried that S3 buckets, KMS keys and IAM roles have been shared with AWS accounts outside the company over the years. It wants a continuous report of every resource that grants access to a principal outside the organization. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Create an IAM Access Analyzer external access analyzer with the organization as its zone of trust.",
      "Turn on Amazon Macie in every account, and review its findings about buckets that hold sensitive data shared outside.",
      "Write a Lambda function that reads every resource policy in every account each night and flags unknown account IDs.",
      "Turn on Amazon GuardDuty in every account, and filter its findings for API calls made by principals from outside."
    ], a: 0,
    no: [null,
      "Macie looks at S3 data and bucket settings. It doesn't cover KMS keys or IAM role trust policies.",
      "It could work, but it's custom code to write, run and keep up to date, against a managed feature.",
      "GuardDuty reports suspicious activity, not which policies grant access to outside principals."],
    why: "IAM Access Analyzer analyzes resource policies in its zone of trust and creates a finding for each resource that grants access to a principal outside that zone. It re-analyzes when policies change.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html"] },

  { id: "saa-1-111", exam: "SAA", saa: "1.1", topic: "s3", type: "mc",
    q: "A central S3 bucket holds shared reports that every account in the company's AWS organization must be able to read. The company adds new accounts every week and wants no bucket policy changes when it does, while accounts outside the organization must stay locked out. What should a solutions architect do?",
    opts: [
      "Add a bucket policy statement that allows s3:GetObject when the aws:PrincipalOrgID condition matches the organization ID.",
      "Add a bucket policy statement that lists every account ID, and update it with a script each time a new account is created.",
      "Make the bucket public with a bucket policy, and rely on the bucket's unguessable name to keep outside accounts away.",
      "Attach an SCP to the organization root that grants s3:GetObject on the bucket to every principal in every member account."
    ], a: 0,
    no: [null,
      "It works, but it means the per-account policy changes the company wants to avoid.",
      "A public bucket is readable by anyone. A hidden name isn't access control.",
      "SCPs don't grant access. The bucket policy still has to allow the other accounts."],
    why: "The aws:PrincipalOrgID condition key matches the organization ID of the calling principal, so one statement covers every current and future account in the organization.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html"] },

  { id: "saa-1-112", exam: "SAA", saa: "1.1", topic: "iam", type: "mc",
    q: "An IAM role in a member account has an identity policy that allows s3:*. The role also has a permissions boundary that allows only s3:GetObject and s3:PutObject, and an SCP on the account's OU denies s3:DeleteObject. Which S3 actions can the role perform on a bucket in the same account that has no bucket policy?",
    opts: [
      "Only s3:GetObject and s3:PutObject, because an action must be allowed by the identity policy, the boundary and the SCP.",
      "Every S3 action except s3:DeleteObject, because the identity policy allows s3:* and only the SCP denies anything.",
      "Every S3 action, because a permissions boundary and an SCP only take effect on roles that have no identity policy.",
      "Only s3:DeleteObject, because a Deny in an SCP turns into an Allow when the identity policy also allows the action."
    ], a: 0,
    no: [null,
      "This ignores the boundary. A boundary also limits what the identity policy can grant.",
      "Boundaries and SCPs always apply. They limit identity policies rather than replace them.",
      "An explicit deny always wins. It never becomes an allow."],
    why: "When a permissions boundary and an SCP are both present, the boundary, the SCP and the identity policy must all allow an action. The effective permissions are their intersection, so only GetObject and PutObject remain.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html", "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html"] },

  // Task 1.2: Secure workloads and applications
  { id: "saa-1-113", exam: "SAA", saa: "1.2", topic: "vpc", type: "multi", hint: "Select TWO.",
    q: "Instances in private subnets reach Amazon S3 through a gateway VPC endpoint. To prevent data exfiltration, the instances must not be able to write to buckets outside the company's account, and the company's sensitive bucket must reject any request that doesn't arrive through that endpoint. Which actions meet these requirements? (Select TWO.)",
    items: [
      { t: "Attach an endpoint policy to the gateway endpoint that allows access only to buckets owned by the company's account.", ok: true },
      { t: "Add a bucket policy to the sensitive bucket that denies all access unless aws:SourceVpce matches the endpoint's ID.", ok: true },
      { t: "Add an outbound security group rule on the instances that allows HTTPS only to the names of the company's buckets.", ok: false, no: "Security group rules match addresses, ports and prefix lists, never bucket names." },
      { t: "Add network ACL rules that deny the IP addresses of other companies' S3 buckets on the private subnets.", ok: false, no: "S3 buckets share Regional IP ranges, so addresses can't tell one company's bucket from another's." },
      { t: "Replace the gateway endpoint with an interface endpoint, because interface endpoints can only reach the owner's buckets.", ok: false, no: "Interface endpoints reach any bucket the policies allow. Limiting them still takes an endpoint policy." }
    ],
    why: "An endpoint policy controls what can be reached through the endpoint, which stops writes to outside buckets. A bucket policy with aws:SourceVpce makes the bucket deny requests that don't come through that endpoint.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies-vpc-endpoint.html"] },

  { id: "saa-1-114", exam: "SAA", saa: "1.2", topic: "privatelink", type: "mc",
    q: "A SaaS provider runs an API on EC2 instances in its own VPC. Hundreds of customers must call it from their own VPCs without the traffic crossing the internet. Many customer VPCs use the same CIDR range as the provider's VPC, and customers must not be able to reach anything else in the provider's network. Which solution meets these requirements?",
    opts: [
      "Put the API behind a Network Load Balancer, create a VPC endpoint service, and have each customer create an interface endpoint.",
      "Create a VPC peering connection from the provider's VPC to each customer VPC, and add routes to the API subnets on both sides.",
      "Attach every customer VPC to a shared transit gateway, and use transit gateway route tables to send customers to the API.",
      "Put the API behind a public Application Load Balancer, and allow only the customers' NAT gateway addresses in its security group."
    ], a: 0,
    no: [null,
      "Peering isn't possible between VPCs with overlapping CIDR blocks, and it opens a network path wider than one service.",
      "Overlapping CIDR ranges can't be routed through one transit gateway, and it joins whole networks, not one service.",
      "The traffic would cross the internet, which the requirement rules out."],
    why: "With AWS PrivateLink, consumers reach one service through an interface endpoint in their own VPC. Traffic is one-way to the service, and overlapping IP ranges don't matter.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-share-your-services.html", "https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/aws-privatelink.html"] },

  { id: "saa-1-115", exam: "SAA", saa: "1.2", topic: "shield", type: "mc",
    q: "An online retailer on CloudFront and an Application Load Balancer was hit by a large DDoS attack last holiday season. This year it wants DDoS experts it can call during an attack, help writing custom mitigations, and detailed attack visibility. The company already has the Business Support plan. Which solution meets these requirements?",
    opts: [
      "Subscribe to AWS Shield Advanced, protect the distribution and the load balancer, and give the Shield Response Team access.",
      "Rely on AWS Shield Standard, which already protects CloudFront and load balancers and includes a 24/7 response team at no charge.",
      "Attach an AWS WAF web ACL with rate-based rules to the distribution, and page the company's own on-call engineers during attacks.",
      "Turn on Amazon GuardDuty in the account so that its findings call in AWS DDoS specialists automatically during an attack."
    ], a: 0,
    no: [null,
      "Shield Standard is automatic and free, but it doesn't include access to the Shield Response Team.",
      "Rate-based rules help with request floods, but they don't provide outside DDoS experts or Shield's attack visibility.",
      "GuardDuty detects threats from logs. It doesn't engage a DDoS response team."],
    why: "Shield Advanced adds expanded DDoS protection and visibility for the resources you protect, and access to the Shield Response Team, which needs a Business or Enterprise Support plan.",
    doc: ["https://docs.aws.amazon.com/waf/latest/developerguide/ddos-advanced-summary-capabilities.html", "https://docs.aws.amazon.com/waf/latest/developerguide/ddos-srt-support.html"] },

  { id: "saa-1-116", exam: "SAA", saa: "1.2", topic: "network-firewall", type: "mc",
    q: "Instances in private subnets reach the internet through a NAT gateway. A new policy says they may connect only to an approved list of software update domains over HTTP and HTTPS, and the providers behind those domains change their IP addresses often. Which solution meets these requirements?",
    opts: [
      "Route outbound traffic through AWS Network Firewall with a stateful domain list rule group that allows only the approved domains.",
      "Add outbound security group rules that allow ports 80 and 443 only to the IP addresses that the approved domains resolve to today.",
      "Add outbound network ACL rules that allow ports 80 and 443 only to the IP addresses of the providers, and deny everything else.",
      "Attach an AWS WAF web ACL to the NAT gateway with a rule that allows requests only when the Host header matches the approved list."
    ], a: 0,
    no: [null,
      "Security groups match IP ranges, not domain names, so the rules break whenever the providers change addresses.",
      "Network ACLs also match only IP ranges, and keeping up with changing addresses is constant work.",
      "AWS WAF protects resources such as ALBs, CloudFront and API Gateway. It can't be attached to a NAT gateway."],
    why: "Network Firewall is a stateful firewall for VPC traffic. Its domain list rule groups match the HTTP host header or the TLS SNI, so they follow domain names rather than IP addresses.",
    doc: ["https://docs.aws.amazon.com/network-firewall/latest/developerguide/stateful-rule-groups-domain-names.html", "https://docs.aws.amazon.com/network-firewall/latest/developerguide/what-is-aws-network-firewall.html"] },

  { id: "saa-1-117", exam: "SAA", saa: "1.2", topic: "firewall-manager", type: "mc",
    q: "A company has 30 accounts in AWS Organizations, and teams create new Application Load Balancers every week. Security requires that every ALB in every account, including accounts added later, use a baseline set of AWS WAF rules. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Create an AWS Firewall Manager WAF policy scoped to Application Load Balancers across the organization.",
      "Deploy a web ACL to each account with CloudFormation StackSets, and ask every team to associate it with each new ALB they create.",
      "Subscribe each account to AWS Shield Advanced, which applies AWS WAF managed rules to every load balancer in the account for free.",
      "Attach an SCP to the organization root that requires every new Application Load Balancer to have a WAF web ACL associated with it."
    ], a: 0,
    no: [null,
      "Teams must remember to associate the web ACL with every new ALB, and any they miss stay unprotected.",
      "Shield Advanced covers WAF costs for protected resources, but it doesn't put a baseline rule set on every ALB by itself.",
      "SCPs can deny API calls, but they can't attach a web ACL, so every team still has to set it up."],
    why: "Firewall Manager applies security policies once across the organization and automatically protects new in-scope resources and new accounts. It requires AWS Organizations and AWS Config.",
    doc: ["https://docs.aws.amazon.com/waf/latest/developerguide/fms-chapter.html", "https://docs.aws.amazon.com/waf/latest/developerguide/fms-prereq.html"] },

  { id: "saa-1-118", exam: "SAA", saa: "1.2", topic: "guardduty", type: "multi", hint: "Select TWO.",
    q: "A company must find EC2 instances that talk to known malicious IP addresses, such as cryptocurrency mining pools, without installing agents on its instances. When this is found, the instance must be moved to a quarantine security group automatically, within minutes. Which combination of steps meets these requirements? (Select TWO.)",
    items: [
      { t: "Turn on Amazon GuardDuty, which analyzes VPC flow logs, DNS logs and CloudTrail events against threat intelligence.", ok: true },
      { t: "Create an EventBridge rule for GuardDuty findings that invokes a Lambda function to swap the instance's security group.", ok: true },
      { t: "Turn on Amazon Inspector so that it finds instances talking to malicious IP addresses and isolates them itself.", ok: false, no: "Inspector scans for software vulnerabilities and network exposure. It doesn't watch live traffic or isolate instances." },
      { t: "Turn on Amazon Macie for the account so that it watches instance traffic and reports connections to mining pools.", ok: false, no: "Macie finds sensitive data in S3. It doesn't analyze network traffic from instances." },
      { t: "Create an AWS Config rule that checks each instance's security group for open ports and quarantines it on a match.", ok: false, no: "Config evaluates resource settings. It can't see which addresses an instance is talking to." }
    ],
    why: "GuardDuty uses its foundational data sources (flow logs, DNS logs and CloudTrail events) with no agents, and it publishes findings to EventBridge, where a rule can trigger automated remediation.",
    doc: ["https://docs.aws.amazon.com/guardduty/latest/ug/what-is-guardduty.html", "https://docs.aws.amazon.com/guardduty/latest/ug/guardduty_findings_eventbridge.html"] },

  { id: "saa-1-119", exam: "SAA", saa: "1.2", topic: "inspector", type: "mc",
    q: "A company runs workloads on EC2 instances and stores container images in Amazon ECR. Security must know at all times which instances and images have known software vulnerabilities (CVEs), including ones disclosed after a resource was last checked, with the LEAST operational overhead. What should a solutions architect recommend?",
    opts: [
      "Turn on Amazon Inspector for EC2 and ECR, which discovers resources and rescans them as new vulnerabilities are published.",
      "Turn on Amazon GuardDuty for the account, and review its findings for instances and images that have vulnerable packages.",
      "Turn on AWS Config with managed rules that check each instance and image for software packages that have known CVEs.",
      "Run an open-source vulnerability scanner on a scheduled EC2 instance that logs in to each server and pulls each image."
    ], a: 0,
    no: [null,
      "GuardDuty finds active threats and suspicious behavior, not vulnerable software packages.",
      "Config records and evaluates resource configuration. It doesn't scan software for CVEs.",
      "It could work, but it is a self-managed tool with credentials to every server, far more work than a managed scanner."],
    why: "Amazon Inspector automatically discovers EC2 instances, ECR images and Lambda functions and continually scans them for software vulnerabilities and unintended network exposure.",
    doc: ["https://docs.aws.amazon.com/inspector/latest/user/what-is-inspector.html"] },

  { id: "saa-1-120", exam: "SAA", saa: "1.2", topic: "securityhub", type: "mc",
    q: "A company with 25 accounts uses GuardDuty, Inspector and Macie. The security team wants all of their findings in one place, plus automated checks of every account against the CIS AWS Foundations Benchmark and a security score per account. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Turn on AWS Security Hub with a delegated administrator account, and turn on the CIS AWS Foundations Benchmark standard.",
      "Turn on Amazon Detective in every account, and use its behavior graph to combine the findings of the other services.",
      "Send every service's findings to CloudWatch Logs, and build a CloudWatch dashboard per account with custom CIS checks.",
      "Use AWS Trusted Advisor in each account, and export its checks to a spreadsheet that maps them to the CIS benchmark."
    ], a: 0,
    no: [null,
      "Detective helps investigate a finding's root cause. It isn't a findings hub with compliance standards.",
      "It means building and maintaining your own CIS checks and dashboards, which is the overhead to avoid.",
      "Trusted Advisor checks aren't a CIS assessment, and a manual spreadsheet adds work."],
    why: "Security Hub collects findings from AWS security services across accounts and runs automated checks against standards such as the CIS AWS Foundations Benchmark and AWS Foundational Security Best Practices.",
    doc: ["https://docs.aws.amazon.com/securityhub/latest/userguide/what-is-securityhub.html"] },

  { id: "saa-1-121", exam: "SAA", saa: "1.2", topic: "detective", type: "mc",
    q: "GuardDuty reports that an IAM role made unusual API calls from an unfamiliar IP address. An analyst must find out what else that role and IP address did over the past few weeks, which resources were involved, and when the behavior started, using visualizations rather than building a log pipeline. Which service should the analyst use?",
    opts: [
      "Use Amazon Detective, which links the finding to a graph of related activity and shows how behavior changed over time.",
      "Use Amazon Inspector to scan the role's resources for vulnerabilities, and compare the scan results from week to week.",
      "Use AWS Security Hub to list the finding next to other findings, and read the role's activity from the findings list.",
      "Use AWS Config to view the role's configuration timeline, which shows each API call the role made and from which IP address."
    ], a: 0,
    no: [null,
      "Inspector scans for software vulnerabilities. It doesn't trace a principal's activity.",
      "Security Hub aggregates findings and checks. It doesn't reconstruct what a principal did between findings.",
      "Config tracks configuration changes, not every API call and its source IP address."],
    why: "Detective builds a behavior graph from logs such as CloudTrail and VPC flow logs and links it to GuardDuty findings, with visualizations that help find the root cause.",
    doc: ["https://docs.aws.amazon.com/detective/latest/userguide/what-is-detective.html"] },

  { id: "saa-1-122", exam: "SAA", saa: "1.2", topic: "secretsmanager", type: "multi", hint: "Select TWO.",
    q: "A database secret in Secrets Manager in account A is encrypted with the default aws/secretsmanager key. An app role in account B must read it, and already has an IAM policy that allows secretsmanager:GetSecretValue on the secret and kms:Decrypt on the key it will use. Which additional steps are required? (Select TWO.)",
    items: [
      { t: "Re-encrypt the secret with a customer managed KMS key whose key policy lets the role in account B decrypt.", ok: true },
      { t: "Attach a resource-based policy to the secret that allows the role in account B to call GetSecretValue.", ok: true },
      { t: "Edit the key policy of the aws/secretsmanager key so that the role in account B can decrypt with it.", ok: false, no: "AWS managed keys can't be used from another account, and their key policies can't be edited." },
      { t: "Replicate the secret to account B with Secrets Manager replication, then read the copy in account B.", ok: false, no: "Secret replication copies a secret to other Regions, not to other accounts." },
      { t: "Store the secret's value in a Parameter Store String parameter, and share the parameter with account B.", ok: false, no: "That takes the password out of its secret, drops rotation, and stores it as unencrypted plain text." }
    ],
    why: "Cross-account secret access needs a resource policy on the secret and permission to use its KMS key. The aws/secretsmanager key can't be used from another account, so the secret must use a customer managed key.",
    doc: ["https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_examples_cross.html"] },

  { id: "saa-1-123", exam: "SAA", saa: "1.2", topic: "vpc", type: "multi", hint: "Select TWO.",
    q: "App servers in private subnets must download operating system updates from the internet over IPv4. Nothing on the internet may be able to start a connection to the servers, and the company wants a managed service rather than an instance to patch. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create a public NAT gateway in a public subnet whose route table has a route to the internet gateway.", ok: true },
      { t: "Add a 0.0.0.0/0 route to the private subnets' route table that points to the NAT gateway.", ok: true },
      { t: "Create the NAT gateway in one of the private subnets, next to the app servers that use it.", ok: false, no: "A public NAT gateway must be in a public subnet so its own traffic can reach the internet gateway." },
      { t: "Add a 0.0.0.0/0 route to the private subnets' route table that points to the internet gateway.", ok: false, no: "That makes the subnets public, and servers without public IPs still couldn't use it." },
      { t: "Attach an egress-only internet gateway, and point the private subnets' default route to it.", ok: false, no: "An egress-only internet gateway carries IPv6 traffic only, and the updates use IPv4." }
    ],
    why: "Instances in a private subnet reach the internet through a public NAT gateway placed in a public subnet. The NAT gateway lets them start outbound connections but doesn't accept unsolicited inbound ones.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html"] },

  { id: "saa-1-124", exam: "SAA", saa: "1.2", topic: "vpc", type: "mc",
    q: "Web servers in a public subnet allow inbound HTTPS in their security group. The team adds a custom network ACL to the subnet with inbound rule 100 allowing TCP 443 from 0.0.0.0/0 and outbound rule 100 allowing TCP 443 to 0.0.0.0/0, each followed by the default deny. Clients can no longer load the site. What should a solutions architect change?",
    opts: [
      "Add an outbound network ACL rule that allows TCP ports 1024-65535 to 0.0.0.0/0 for the responses to clients.",
      "Add an outbound rule to the servers' security group that allows TCP ports 1024-65535 to 0.0.0.0/0 for responses.",
      "Add an inbound network ACL rule that allows TCP ports 1024-65535 from 0.0.0.0/0, numbered before rule 100.",
      "Move the inbound HTTPS rule to number 200, because lower-numbered network ACL rules are evaluated last."
    ], a: 0,
    no: [null,
      "Security groups are stateful, so response traffic is already allowed. The network ACL is what blocks it.",
      "Responses to clients leave the subnet, so they need an outbound rule, not an inbound one.",
      "Rules are evaluated from the lowest number up, and the order of these rules isn't the problem."],
    why: "Network ACLs are stateless, so return traffic needs its own rule. Responses go back to the client's ephemeral port, so the outbound rules must allow that port range.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html", "https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html"] },

  { id: "saa-1-125", exam: "SAA", saa: "1.2", topic: "directconnect", type: "mc",
    q: "A bank links its data center to a VPC with a 1 Gbps AWS Direct Connect connection. Auditors now require all traffic between the bank's on-premises router and the VPC to be encrypted end to end, while keeping Direct Connect's consistent performance. Which solution meets these requirements?",
    opts: [
      "Run an AWS Site-to-Site VPN connection to the VPC over the Direct Connect connection, so traffic travels in IPsec tunnels.",
      "Rely on Direct Connect itself, because traffic on a dedicated Direct Connect connection is encrypted in transit by default.",
      "Turn on MACsec for the connection, which encrypts traffic from the on-premises router all the way to the instances in the VPC.",
      "Replace Direct Connect with a Site-to-Site VPN over the internet, because a VPN can't use a Direct Connect connection."
    ], a: 0,
    no: [null,
      "Direct Connect doesn't encrypt traffic in transit by default.",
      "MACsec encrypts only the link between the bank's router and the Direct Connect location, and only on supported 10 Gbps or faster dedicated connections.",
      "A VPN can run over Direct Connect, and moving to the internet gives up the consistent performance the bank wants."],
    why: "Combining Direct Connect with Site-to-Site VPN gives an IPsec-encrypted private connection with Direct Connect's more consistent network experience.",
    doc: ["https://docs.aws.amazon.com/directconnect/latest/UserGuide/encryption-in-transit.html", "https://docs.aws.amazon.com/directconnect/latest/UserGuide/MACsec.html"] },

  { id: "saa-1-126", exam: "SAA", saa: "1.2", topic: "cognito", type: "mc",
    q: "A web app on EC2 instances behind an Application Load Balancer is opening to the public. Customers must sign in with their Google or Facebook accounts before any request reaches the app, and the development team doesn't want to write sign-in code in the app. Which solution meets these requirements with the LEAST development effort?",
    opts: [
      "Create a Cognito user pool federated with Google and Facebook, and add an authenticate-cognito action to the ALB listener rules.",
      "Create a Cognito identity pool for Google and Facebook, and give each signed-in customer IAM credentials to call the app.",
      "Put Amazon API Gateway in front of the ALB, and write a Lambda authorizer that checks Google and Facebook tokens.",
      "Create an IAM user for each customer, and require customers to sign the ALB requests with their access keys."
    ], a: 0,
    no: [null,
      "Identity pools hand out AWS credentials. The ALB doesn't sign users in with them, and the app would need sign-in code.",
      "It works, but it adds a service and custom authorizer code that the ALB's built-in authentication avoids.",
      "IAM users aren't for app customers, and ALBs don't check signed requests."],
    why: "An ALB can authenticate users itself with an authenticate-cognito action. The Cognito user pool handles social sign-in, and the ALB passes only authenticated requests to the targets.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-authenticate-users.html"] },

  { id: "saa-1-127", exam: "SAA", saa: "1.2", topic: "cloudfront", type: "multi", hint: "Select TWO.",
    q: "A company serves a static website from a private S3 bucket through a CloudFront distribution. Users must be able to read the files only through CloudFront, never straight from S3, and the bucket must stay private. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create an origin access control (OAC) and attach it to the S3 origin of the CloudFront distribution.", ok: true },
      { t: "Allow s3:GetObject in the bucket policy for cloudfront.amazonaws.com, with AWS:SourceArn set to the distribution.", ok: true },
      { t: "Turn off S3 Block Public Access and add a bucket policy that allows s3:GetObject for any principal.", ok: false, no: "That makes every file public on S3 too, which the company forbids." },
      { t: "Turn on static website hosting for the bucket, and point the CloudFront origin to the website endpoint.", ok: false, no: "Website endpoints only serve public content and don't support origin access control." },
      { t: "Generate presigned URLs for every file, and put those URLs into the pages that CloudFront serves.", ok: false, no: "Presigned URLs give direct S3 access to anyone who holds them, bypassing CloudFront." }
    ],
    why: "With OAC, CloudFront signs its requests to S3. A bucket policy that allows only the CloudFront service principal for that distribution keeps the bucket private and closes direct access.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html"] },

  { id: "saa-1-128", exam: "SAA", saa: "1.2", topic: "vpc", type: "mc",
    q: "On-premises servers upload files to Amazon S3 over a Site-to-Site VPN connection to a VPC. The company wants the uploads to use private IP addresses over the VPN and never reach S3's public endpoints. The VPC already has an S3 gateway endpoint for its own instances. What should a solutions architect do?",
    opts: [
      "Create an S3 interface endpoint in the VPC, and have the on-premises servers send requests to its endpoint DNS names.",
      "Add the S3 gateway endpoint to the virtual private gateway's route table so that on-premises traffic can use it.",
      "Turn on S3 Transfer Acceleration for the bucket so that on-premises uploads enter the AWS network at an edge location.",
      "Configure a public NAT gateway in the VPC, and route the on-premises S3 traffic through the VPN to the NAT gateway."
    ], a: 0,
    no: [null,
      "Gateway endpoints can't be reached from on-premises networks. They only serve traffic from inside the VPC.",
      "Transfer Acceleration still uses public endpoints over the internet.",
      "Traffic through a public NAT gateway goes to S3's public endpoints, which the company wants to avoid."],
    why: "An S3 interface endpoint has private IP addresses in the VPC, so on-premises apps can reach it over VPN or Direct Connect. Gateway endpoints don't allow access from on premises.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/privatelink-interface-endpoints.html", "https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html"] },

  // Task 1.3: Data security controls
  { id: "saa-1-129", exam: "SAA", saa: "1.3", topic: "rds", type: "mc",
    q: "A company's RDS for MySQL DB instance was created without encryption at rest. A new rule requires its data to be encrypted with a KMS key, and a short maintenance window is acceptable. How should a solutions architect get an encrypted database?",
    opts: [
      "Take a snapshot of the instance, copy it with encryption turned on, restore a new instance from the copy, and switch the app to it.",
      "Modify the existing instance, turn on encryption at rest in its settings, and apply the change during the next maintenance window.",
      "Create an encrypted read replica of the unencrypted instance, wait for it to catch up, and then promote it to a standalone instance.",
      "Restore the latest automated backup of the instance to a new instance, and choose to encrypt it with the KMS key during the restore."
    ], a: 0,
    no: [null,
      "Encryption can only be turned on when an instance is created. An existing unencrypted instance can't be modified to encrypt it.",
      "You can't have an encrypted read replica of an unencrypted DB instance.",
      "You can't restore an unencrypted backup or snapshot to an encrypted DB instance."],
    why: "A snapshot of an unencrypted instance can be copied as an encrypted snapshot, and a DB instance restored from that copy is encrypted.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Overview.Encryption.html", "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_CopySnapshot.html"] },

  { id: "saa-1-130", exam: "SAA", saa: "1.3", topic: "kms", type: "multi", hint: "Select TWO.",
    q: "A company stores contracts in S3. Its security team must control who can use the encryption key through the key's own policy, be able to disable the key at any time, and have the key material rotated automatically every year. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create a customer managed KMS key, and set it as the bucket's default encryption with SSE-KMS.", ok: true },
      { t: "Turn on automatic key rotation for the customer managed key, which rotates it every year by default.", ok: true },
      { t: "Use SSE-KMS with the AWS managed key aws/s3, and edit its key policy to name the users allowed.", ok: false, no: "You can't change the key policy of an AWS managed key, or disable it." },
      { t: "Use SSE-S3 for the bucket, and ask AWS Support to disable its keys whenever the company needs to.", ok: false, no: "SSE-S3 keys are managed by S3. The company gets no key policy and can't disable them." },
      { t: "Use SSE-C, and have every app send the company's own key with each upload and download request.", ok: false, no: "SSE-C keys live outside AWS, so there is no key policy to control use, and apps must manage the keys." }
    ],
    why: "Only a customer managed key gives the company its own key policy and the ability to disable the key. Automatic rotation generates new key material every year by default, and old data stays readable.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html", "https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html"] },

  { id: "saa-1-131", exam: "SAA", saa: "1.3", topic: "cloudhsm", type: "mc",
    q: "A payments app signs transactions with keys that regulators say must live in single-tenant hardware security modules that only the company's own crypto officers manage. The app calls the HSM directly through the industry-standard PKCS #11 library. Which solution meets these requirements?",
    opts: [
      "Create an AWS CloudHSM cluster whose users and keys the company's crypto officers manage, and use its PKCS #11 library.",
      "Create customer managed keys in AWS KMS with the default key store, and grant the app permission to use them for signing.",
      "Import the company's own key material into an AWS KMS key, and have the app call the KMS Sign API through the AWS SDK.",
      "Store the signing keys in AWS Secrets Manager with a customer managed KMS key, and have the app load them at startup."
    ], a: 0,
    no: [null,
      "Keys in the default KMS key store live in HSMs that AWS manages, and the app would call the KMS API rather than PKCS #11.",
      "Imported key material still lives in the AWS-managed KMS key store, and the app would call the KMS API.",
      "Keys in Secrets Manager are loaded into app memory, not kept inside an HSM."],
    why: "CloudHSM gives you single-tenant HSMs in a cluster that you control, with your own HSM users. Apps use its PKCS #11, JCE or OpenSSL libraries.",
    doc: ["https://docs.aws.amazon.com/cloudhsm/latest/userguide/introduction.html"] },

  { id: "saa-1-132", exam: "SAA", saa: "1.3", topic: "ebs", type: "multi", hint: "Select TWO.",
    q: "A company must make sure that every EBS volume created from now on in eu-west-1 is encrypted, even if an engineer forgets to choose encryption. One existing unencrypted data volume must also be encrypted. Which actions meet these requirements? (Select TWO.)",
    items: [
      { t: "Turn on EBS encryption by default for the account in eu-west-1 so that new volumes are always encrypted.", ok: true },
      { t: "Snapshot the existing volume, copy the snapshot with encryption on, create a volume from it and swap it in.", ok: true },
      { t: "Modify the existing volume in place, and turn on its encryption setting while it is still attached.", ok: false, no: "You can't directly encrypt an existing unencrypted volume." },
      { t: "Turn on encryption by default once in the global settings so that it covers volumes in every Region.", ok: false, no: "Encryption by default is a per-Region setting, not a global one." },
      { t: "Create an AWS Config rule that reports unencrypted volumes so engineers can encrypt them afterward.", ok: false, no: "A report finds unencrypted volumes after they exist. It doesn't make new volumes encrypted." }
    ],
    why: "EBS encryption by default is set per Region and forces encryption on new volumes, but it doesn't change existing ones. An unencrypted volume is encrypted by way of an encrypted snapshot copy and a new volume.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/encryption-by-default.html", "https://docs.aws.amazon.com/ebs/latest/userguide/ebs-encryption.html"] },

  { id: "saa-1-133", exam: "SAA", saa: "1.3", topic: "acm", type: "mc",
    q: "An Application Load Balancer uses a TLS certificate that the company bought from a third-party authority and imported into ACM. Last year the certificate expired unnoticed and the site went down. The company wants renewals to happen automatically from now on, with the LEAST operational overhead. What should a solutions architect do?",
    opts: [
      "Request a public certificate from ACM with DNS validation, keep the validation CNAME record in place, and use it on the ALB.",
      "Keep the imported certificate, and rely on ACM to renew it automatically before it expires, as it does for any certificate.",
      "Request a public certificate from ACM with email validation, which ACM renews with no action as long as it is in use.",
      "Install the certificate on each target instance instead, and set a cron job on each instance to replace it every year."
    ], a: 0,
    no: [null,
      "ACM doesn't provide managed renewal for imported certificates. The company must renew and re-import them.",
      "With email validation, renewal waits on someone approving an email. DNS validation is what renews automatically.",
      "That adds work on every instance, and the ALB still needs a certificate for its HTTPS listener."],
    why: "ACM renews its own certificates automatically when they use DNS validation and are in use with a service such as Elastic Load Balancing. Imported certificates are never renewed by ACM.",
    doc: ["https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html", "https://docs.aws.amazon.com/acm/latest/userguide/import-certificate.html"] },

  { id: "saa-1-134", exam: "SAA", saa: "1.3", topic: "s3", type: "mc",
    q: "A design team keeps project files in an S3 bucket. Files are sometimes deleted or overwritten by mistake. The company wants every earlier version to be recoverable, and permanently deleting a version must require the bucket owner's MFA code, but there is no fixed retention period. Which solution meets these requirements?",
    opts: [
      "Turn on S3 Versioning, and have the bucket owner turn on MFA Delete with the AWS CLI using the root user's MFA device.",
      "Turn on S3 Object Lock in compliance mode with a one-year retention period, and keep versioning turned on for the bucket.",
      "Turn on S3 Versioning, and add a lifecycle rule that permanently deletes noncurrent versions after 30 days automatically.",
      "Turn on S3 Cross-Region Replication to a second bucket, and let the team restore deleted files from the replica bucket."
    ], a: 0,
    no: [null,
      "Compliance mode forces a fixed retention period that no one can shorten, which the company doesn't want.",
      "Versions would be lost after 30 days, and MFA Delete can't be used with lifecycle configurations anyway.",
      "A replica can help recovery, but it adds no MFA control over permanently deleting versions."],
    why: "Versioning keeps every version of an object. MFA Delete adds MFA to permanently deleting a version or changing the versioning state; only the bucket owner (root user) can turn it on, through the CLI or API.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiFactorAuthenticationDelete.html"] },

  { id: "saa-1-135", exam: "SAA", saa: "1.3", topic: "s3", type: "mc",
    q: "A company has about 200 S3 buckets in one account, and engineers create new buckets every week. After a data leak, it must make sure that no bucket or object in the account, existing or future, can be made public through ACLs or bucket policies. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Turn on all four S3 Block Public Access settings at the account level, which override bucket and object permissions.",
      "Add a bucket policy that denies public access to each of the 200 buckets, and add it to every new bucket when it is created.",
      "Turn on an AWS Config rule that detects public buckets, with an automatic remediation that resets their permissions.",
      "Turn on Amazon Macie, which finds publicly accessible buckets and blocks public access to them as soon as it finds them."
    ], a: 0,
    no: [null,
      "It works for buckets that get the policy, but every new bucket depends on someone remembering.",
      "Detect and fix leaves a window when the bucket is public, and it is more to run than one setting.",
      "Macie reports on bucket security and sensitive data. It doesn't block public access itself."],
    why: "Account-level S3 Block Public Access applies to all current and future buckets in the account and overrides ACLs and policies that would grant public access.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-control-block-public-access.html"] },

  { id: "saa-1-136", exam: "SAA", saa: "1.3", topic: "s3", type: "mc",
    q: "A shared data lake bucket is used by a dozen teams and apps, each needing different prefixes and permissions. The bucket policy has grown huge and every change is risky. One analytics app must also be able to reach its data only from a specific VPC. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Create an S3 access point for each team or app with its own policy, and give the analytics app's access point a VPC network origin.",
      "Split the data into a dozen separate buckets, copy each team's prefixes into its own bucket, and write a bucket policy for each.",
      "Keep one bucket policy, and add an aws:SourceIp condition with the analytics VPC's private CIDR range for that app's statements.",
      "Give each team an IAM user with access keys scoped to its prefixes, and rotate the keys every 90 days with a scheduled script."
    ], a: 0,
    no: [null,
      "It works, but duplicating data and keeping copies in sync is far more work than access points.",
      "The single growing bucket policy is the problem to fix, and adding more conditions to it makes every change riskier.",
      "Long-term keys add risk and rotation work, and the VPC restriction still isn't met."],
    why: "Each access point has its own policy and network controls, which splits one large bucket policy into manageable pieces. An access point with a VPC network origin rejects requests that don't come from that VPC.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/access-points-vpc.html"] },

  { id: "saa-1-137", exam: "SAA", saa: "1.3", topic: "backup", type: "multi", hint: "Select TWO.",
    q: "A company backs up its RDS and EBS data with AWS Backup. After a ransomware scare, it must make sure no one, including a compromised administrator or the root user, can delete backups or shorten their retention, and a copy must survive even if the production account is taken over. Which actions meet these requirements? (Select TWO.)",
    items: [
      { t: "Apply AWS Backup Vault Lock in compliance mode to the vault, and let the grace time pass so the lock becomes immutable.", ok: true },
      { t: "Add a copy rule to the backup plan that copies each recovery point to a vault in a separate backup account in the organization.", ok: true },
      { t: "Apply AWS Backup Vault Lock in governance mode, so that only principals with the right IAM permissions can delete backups.", ok: false, no: "In governance mode, users with sufficient IAM permissions can still remove the lock, so a compromised admin could." },
      { t: "Turn on S3 Object Lock for the backup vault, because AWS Backup stores RDS and EBS backups as objects in the company's buckets.", ok: false, no: "Backups live in AWS Backup vaults, not in the company's S3 buckets, so S3 Object Lock doesn't protect them." },
      { t: "Turn on MFA for every administrator in the production account so that deleting a recovery point always asks for an MFA code.", ok: false, no: "MFA on users doesn't make the backup service require it, and it doesn't help if the account itself is taken over." }
    ],
    why: "A vault locked in compliance mode can't be changed or deleted by anyone, root user included, once its grace time ends. Copying backups to another account in the organization keeps a copy outside the production account.",
    doc: ["https://docs.aws.amazon.com/aws-backup/latest/devguide/vault-lock.html", "https://docs.aws.amazon.com/aws-backup/latest/devguide/create-cross-account-backup.html"] },

  { id: "saa-1-138", exam: "SAA", saa: "1.3", topic: "config", type: "mc",
    q: "A company with 40 accounts in AWS Organizations must continuously check that resources follow a set of controls mapped to PCI DSS, such as encrypted volumes and restricted SSH, with remediation actions where possible. The same rule set must be deployed to every account as one unit. Which solution meets these requirements?",
    opts: [
      "Deploy an AWS Config organization conformance pack from the PCI DSS best practices template, with remediation actions.",
      "Turn on AWS CloudTrail in every account, and run Athena queries each month to check the API calls against the PCI DSS controls.",
      "Turn on Amazon Inspector in every account, and treat its vulnerability findings as the record of compliance with the PCI DSS controls.",
      "Run AWS Trusted Advisor checks in each account, and email the security results to the compliance team every week for manual review."
    ], a: 0,
    no: [null,
      "CloudTrail records API calls. Monthly queries are not continuous evaluation of resource settings and offer no remediation.",
      "Inspector finds software vulnerabilities. It doesn't evaluate resource configurations against a control set.",
      "Trusted Advisor checks aren't mapped to PCI DSS controls, and manual review isn't continuous."],
    why: "A conformance pack packages AWS Config rules and remediation actions into one unit that can be deployed across an organization. AWS publishes sample templates mapped to frameworks such as PCI DSS.",
    doc: ["https://docs.aws.amazon.com/config/latest/developerguide/conformance-packs.html"] },

  { id: "saa-1-139", exam: "SAA", saa: "1.3", topic: "rds", type: "mc",
    q: "An existing RDS for PostgreSQL DB instance accepts both encrypted and unencrypted client connections. A new policy says every connection to the database must use TLS, and any client that tries to connect without it must be rejected by the database. What should a solutions architect do?",
    opts: [
      "Set rds.force_ssl to 1 in a custom DB parameter group, attach it to the instance, and reboot the instance if needed.",
      "Turn on encryption at rest for the instance with a KMS key, which also requires TLS for every new client connection.",
      "Set the require_secure_transport parameter to ON in the instance's parameter group, as for every RDS database engine.",
      "Change the instance's security group to allow only port 443, so that clients must connect over HTTPS to reach it."
    ], a: 0,
    no: [null,
      "Encryption at rest protects stored data. It doesn't control whether connections use TLS.",
      "require_secure_transport is the RDS for MySQL setting. PostgreSQL uses rds.force_ssl.",
      "PostgreSQL clients don't connect over HTTPS, and a port rule can't tell TLS from plain connections."],
    why: "With rds.force_ssl set to 1, RDS for PostgreSQL rejects connections that don't use SSL/TLS. It is set in a custom DB parameter group.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html"] },

  { id: "saa-1-140", exam: "SAA", saa: "1.3", topic: "kms", type: "multi", hint: "Select TWO.",
    q: "Account A shares an S3 bucket whose objects are encrypted with SSE-KMS using a customer managed key in account A. A role in account B is already allowed to read the objects by the bucket policy, but its GetObject calls fail with a KMS access denied error. Which changes are required? (Select TWO.)",
    items: [
      { t: "Update the key policy of the key in account A to allow kms:Decrypt for account B or its role.", ok: true },
      { t: "Add an IAM policy to the role in account B that allows kms:Decrypt on the key's ARN in account A.", ok: true },
      { t: "Add kms:Decrypt for the role in account B to the S3 bucket policy alongside s3:GetObject.", ok: false, no: "A bucket policy controls S3 actions on the bucket. Permission to use a KMS key comes from the key policy and IAM." },
      { t: "Switch the bucket's encryption to the AWS managed key aws/s3 so other accounts can use it freely.", ok: false, no: "AWS managed keys can't be used by other accounts, so this would make the problem permanent." },
      { t: "Turn on S3 Bucket Keys for the bucket so that the role in account B no longer needs to use the KMS key.", ok: false, no: "Bucket Keys cut the number of KMS requests. Reading the objects still needs permission to decrypt with the key." }
    ],
    why: "To use a KMS key from another account, the key policy must allow the external account, and IAM policies in that account must delegate the permission to its users or roles. Neither alone is enough.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html"] }
);
