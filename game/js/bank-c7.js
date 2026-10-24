// Question bank batch: points chapter 7 (Root) teaches that the bank had no question on: revoking a role's active
// sessions, session policies passed when assuming a role, an SCP that binds a member account's root user, an
// allow-list SCP strategy, what a resource share in AWS RAM lets another account do, the first moves when temporary
// credentials leak, consolidated billing's volume tiers, and which tasks only the root user can do. Written for the
// chapter's floors, then worded here without the story. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // DVA Task 2.1: Implement authentication and/or authorization for applications and AWS services
  { id: "dva-2-870", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "An app's temporary credentials for an IAM role were pasted into a public chat by mistake. The sessions were issued two hours ago and last up to 12 hours. The app itself must keep working, with new sessions of the same role. What is the fastest way to stop the leaked credentials from working?",
    opts: [
      "Use the role's Revoke active sessions action, which denies every request signed with credentials issued before that moment.",
      "Lower the role's maximum session duration to one hour, so the sessions that were issued two hours ago expire at once.",
      "Detach every policy from the role, wait for the leaked sessions to fail, then attach the same policies to the role again.",
      "Delete the role and create a new role with the same name and policies, so the old sessions no longer match any role."
    ], a: 0,
    no: [
      null,
      "The maximum session duration applies when a session is requested. Sessions already issued keep the duration they were given.",
      "That stops the app as well while the policies are off, and the leaked sessions work again the moment they are back.",
      "Deleting the role does cut off its old sessions, but the app's calls fail while the role is gone, so the app stops working too."],
    why: "Revoking a role's active sessions attaches an inline policy, AWSRevokeOlderSessions, that denies all actions when aws:TokenIssueTime is earlier than the revoke time. Credentials issued later, including the app's next ones, are unaffected.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html"] },

  { id: "dva-2-871", exam: "DVA", dva: "2.1", topic: "sts", type: "mc",
    q: "A batch job assumes a role whose identity policy allows s3:GetObject and s3:PutObject on a bucket. For one step, the job passes a session policy in the AssumeRole call that allows s3:GetObject and s3:DeleteObject on the same bucket. No resource policy names the session. Which actions can that session perform?",
    opts: [
      "Only s3:GetObject, because a session can do only what both the role's policies and the session policy allow.",
      "s3:GetObject, s3:PutObject and s3:DeleteObject, because a session policy adds to the role's own permissions.",
      "s3:GetObject and s3:DeleteObject, because a session policy replaces the role's identity policy for that session.",
      "None of them, because a session policy that names an action the role lacks makes the whole AssumeRole call fail."
    ], a: 0,
    no: [
      null,
      "A session policy never grants anything. It can only limit what the role's identity-based policies already allow.",
      "It doesn't replace them. The session's permissions are where the two overlap.",
      "AssumeRole accepts the session policy. The action the role lacks is simply not available in the session."],
    why: "Session policies passed with AssumeRole limit the session to the intersection of the role's identity-based policies and the session policy. s3:DeleteObject isn't in the role's policy, and s3:PutObject isn't in the session policy, so only s3:GetObject is left.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html#policies_session", "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html"] },

  // SAA Task 1.1: Design secure access to AWS resources
  { id: "saa-1-870", exam: "SAA", saa: "1.1", topic: "organizations", type: "mc",
    q: "A company's security policy says the root user of every member account in its organization must not be able to do anything at all, while IAM roles in those accounts keep working. The management account must be unaffected. Which solution meets these requirements?",
    opts: [
      "Attach an SCP to the organization root that denies all actions when aws:PrincipalArn matches arn:aws:iam::*:root.",
      "In each member account, attach an IAM policy to the root user that denies all actions on all resources.",
      "Attach an SCP to the organization root that denies all actions, and attach FullAWSAccess to every IAM role.",
      "Turn on MFA for each member account's root user, and store the MFA devices in a locked office safe."
    ], a: 0,
    no: [
      null,
      "IAM policies can't be attached to the root user, and nothing written in IAM inside an account restricts that account's own root.",
      "An SCP's Deny wins over any Allow in IAM, so every role in the member accounts would be stopped too.",
      "MFA makes the root user harder to steal. It doesn't stop the root user from acting once someone signs in."],
    why: "SCPs apply to every principal in a member account, the root user included, and never to the management account. A Deny with the aws:PrincipalArn condition arn:aws:iam::*:root stops only the root users.",
    doc: ["https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html", "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_examples_general.html"] },

  { id: "saa-1-871", exam: "SAA", saa: "1.1", topic: "organizations", type: "mc",
    q: "A company moves to an allow-list strategy: it detaches FullAWSAccess from its organization and writes SCPs that allow only approved services. It attaches an SCP allowing EC2 and S3 to the Workloads OU, but users in a member account under that OU now get AccessDenied for every EC2 and S3 call, even with AdministratorAccess. What is the cause?",
    opts: [
      "An Allow is also needed at the organization root and on the account itself, at every level down the path.",
      "SCPs can only deny actions, so an allow-list SCP is ignored and nothing is allowed until FullAWSAccess returns.",
      "AdministratorAccess is an AWS managed policy, and AWS managed policies are not evaluated under an SCP.",
      "The users must sign out and in again, because SCP changes only reach sessions that start after the change."
    ], a: 0,
    no: [
      null,
      "SCPs can contain Allow statements; that's how an allow list works. They set the most an account can do without granting anything.",
      "Any identity policy is evaluated with the SCPs. The SCPs just cap what it can grant.",
      "SCP changes apply to requests as they arrive. Signing in again doesn't change the result."],
    why: "With an allow list, an action is available to an account only if an SCP allows it at every level from the organization root, through each OU on the path, to the account itself. Detaching FullAWSAccess at the root or the account removes that Allow.",
    doc: ["https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_evaluation.html", "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps_strategies.html"] },

  { id: "saa-1-872", exam: "SAA", saa: "1.1", topic: "ram", type: "mc",
    q: "A network team owns a VPC in a central account of its organization. Application teams in four other member accounts must launch EC2 instances into the VPC's private subnets, while the network team alone keeps managing route tables, NAT gateways and the VPC itself. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Share the private subnets with the four accounts using AWS Resource Access Manager, with sharing turned on for the organization.",
      "Create a VPC in each of the four accounts and connect each one to the central VPC with its own VPC peering connection.",
      "Give each application team an IAM role in the central account, so that its instances are launched there for it.",
      "Copy the VPC into the four accounts with a CloudFormation StackSet, and keep the copies the same with drift detection."
    ], a: 0,
    no: [
      null,
      "Peering connects separate VPCs, each with its own subnets, routes and NAT. It doesn't let one account launch into another's subnets.",
      "Then the instances live in the central account, and the teams lose their own accounts' boundaries and bills.",
      "Four copies are four VPCs to manage. The network team would own nothing the teams launch into."],
    why: "AWS RAM shares subnets with other accounts in the organization. In a shared VPC, participants launch their own resources into the shared subnets, and the owner keeps control of the VPC, its route tables and its gateways.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/vpc-sharing.html", "https://docs.aws.amazon.com/ram/latest/userguide/getting-started-sharing.html"] },

  { id: "saa-1-873", exam: "SAA", saa: "1.1", topic: "iam", type: "mc",
    q: "GuardDuty reports that a role's temporary credentials are being used from an IP address outside AWS that the company has never used, to list S3 buckets in every Region. The role is used by a fleet of instances that must keep running. What should the security team do first?",
    opts: [
      "Revoke the role's active sessions, then use CloudTrail to find what those credentials did and undo it.",
      "Turn on Amazon Detective for the account, and wait for its behavior graph before changing anything.",
      "Delete the role at once, then rebuild it from the latest CloudFormation template later in the day.",
      "Lower the role's maximum session duration, so that the stolen credentials will expire sooner than before."
    ], a: 0,
    no: [
      null,
      "Detective helps the investigation, but turning it on doesn't contain anything, and a new behavior graph starts from the data it collects.",
      "Deleting the role stops the fleet too, and the attacker's actions so far are still unknown and still in place.",
      "The maximum applies to new sessions. The stolen ones keep the duration they were issued with."],
    why: "Contain first: revoking active sessions denies requests signed with credentials issued before now, while the fleet gets fresh credentials. Then CloudTrail shows what the stolen credentials did, so it can be undone.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html", "https://docs.aws.amazon.com/guardduty/latest/ug/compromised-creds.html"] },

  { id: "saa-1-874", exam: "SAA", saa: "1.1", topic: "iam", type: "mc",
    q: "A company runs one standalone AWS account with no organization. Its administrators all use IAM roles with full access. Which task can still be done only by signing in as the account's root user?",
    opts: [
      "Turn on MFA delete for an S3 bucket that holds the company's audit logs.",
      "Create a new IAM role that the administrators can assume in an emergency.",
      "Turn on a CloudTrail trail that logs every Region to an S3 bucket.",
      "Attach an AWS managed policy to an IAM group of read-only auditors."
    ], a: 0,
    no: [
      null,
      "An IAM principal with iam:CreateRole can do it. Nothing about it needs the root user.",
      "Any principal with the CloudTrail and S3 permissions can create a trail.",
      "Managing IAM groups and their policies is ordinary IAM work for an administrator."],
    why: "A few tasks need root user credentials, such as configuring MFA delete on an S3 bucket, closing the account and changing the root user's own email or password. In a standalone account no IAM policy can restrict the root user, so it should have MFA and be used only for those tasks.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_root-user.html#root-user-tasks", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiFactorAuthenticationDelete.html"] },

  // SAA Task 4.1: Design cost-optimized storage solutions
  { id: "saa-4-870", exam: "SAA", saa: "4.1", topic: "billing", type: "mc",
    q: "Five accounts in a company's organization each store 60 TB in S3 Standard in the same Region. S3 Standard's price per GB falls after the first 50 TB a month. How does consolidated billing price this storage?",
    opts: [
      "As 300 TB in one account: the usage is added up across the organization, so most of it reaches the lower tiers.",
      "As five separate 60 TB accounts: tiers are counted per account, so each one pays the top rate for its first 50 TB.",
      "At the lowest tier for all of it, because accounts in an organization always get the cheapest published rate.",
      "At the top rate for all of it, because volume tiers apply only to the management account's own usage."
    ], a: 0,
    no: [
      null,
      "That's how it works for standalone accounts. In an organization, consolidated billing treats all the accounts as one for volume pricing.",
      "There's no automatic cheapest rate. The combined usage moves through the tiers like one account's would.",
      "The management account pays the bill, but every member account's usage counts toward the tiers."],
    why: "Consolidated billing combines the usage of every account in the organization, so volume pricing tiers such as S3's are reached sooner and the whole organization pays less per GB than the accounts would apart.",
    doc: ["https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/consolidated-billing.html", "https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/useconsolidatedbilling-discounts.html"] }
);
