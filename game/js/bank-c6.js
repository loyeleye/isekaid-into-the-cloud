// Question bank batch: points chapter 6 (the Mirror Floors) teaches that the bank had no question on: Route 53
// calculated health checks, DynamoDB global tables' conflict rule, S3 Batch Replication for objects that were there
// before the rule, StackSets parameter overrides per Region, multi-Region KMS keys' separate key policies, what a
// cancelled key deletion leaves behind, an alarm on a key pending deletion, and bypassing Object Lock's governance
// mode. Written for the chapter's minigames, then worded here without the story. Same schema and rules as
// js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // SAA Task 2.2: Design highly available and/or fault-tolerant architectures
  { id: "saa-2-850", exam: "SAA", saa: "2.2", topic: "route53", type: "mc",
    q: "A web tier depends on three components, each with its own Route 53 health check. The company wants its primary failover record to count as healthy only while at least two of the three components are healthy, and to fail over to the secondary Region otherwise. What should a solutions architect do?",
    opts: [
      "Create a calculated health check that watches the three child health checks with a threshold of 2, and use it on the record.",
      "Attach all three health checks to the primary failover record, and set the record's own healthy threshold to 2 of 3 checks.",
      "Create a CloudWatch composite alarm that needs any two of the three alarms, and point an endpoint health check at it.",
      "Create three primary failover records, one for each component, so that Route 53 keeps routing while two of them answer."
    ], a: 0,
    no: [
      null,
      "A record has one health check, and a record has no threshold of its own. Combining checks is what a calculated health check is for.",
      "An endpoint health check probes an IP address or domain name, not an alarm. Route 53's own way to combine health checks is a calculated health check.",
      "A failover routing policy allows one primary and one secondary record with the same name. Three primaries is not a valid configuration."],
    why: "A calculated health check is healthy while at least the number of child health checks you choose are healthy. Associated with the primary failover record, it makes Route 53 fail over when fewer than two of the three components pass.",
    doc: ["https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-types.html", "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-complex-configs.html"] },

  { id: "saa-2-851", exam: "SAA", saa: "2.2", topic: "dynamodb", type: "mc",
    q: "A DynamoDB global table with the default multi-Region eventual consistency has replicas in us-east-1 and eu-west-1. A player's profile item is updated in us-east-1, and less than a second later the same item is updated in eu-west-1 before the first change arrives there. What does the item look like in both Regions once replication catches up?",
    opts: [
      "Each Region keeps its own update, and the two replicas stay different until someone resolves the conflict by hand in one of them.",
      "Both Regions hold the update with the later timestamp, because global tables resolve conflicts by last writer wins.",
      "Both Regions hold the us-east-1 update, because the Region where the table was first created always wins.",
      "The second write fails with a ConditionalCheckFailedException, because the item was already being replicated."
    ], a: 1,
    no: [
      "Global tables never leave replicas apart for good. Every replica converges on the same version of the item.",
      null,
      "A global table has no primary Region. Every replica takes writes, and none of them is preferred.",
      "In eventual consistency mode both writes succeed locally. The conflict is settled afterwards, during replication."],
    why: "In multi-Region eventual consistency mode, a global table settles concurrent updates to the same item with last writer wins: the write with the latest timestamp replaces the other in every replica.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html"] },

  { id: "saa-2-852", exam: "SAA", saa: "2.2", topic: "s3", type: "mc",
    q: "A company turned on versioning for an S3 bucket that already held 40 million objects, and added a replication rule to a bucket in another Region. New uploads now appear in the destination, but none of the older objects do. The company needs a full copy for disaster recovery. What should a solutions architect do?",
    opts: [
      "Turn on S3 Replication Time Control for the rule, which also copies the existing objects within 15 minutes.",
      "Delete the replication rule and create it again, so that S3 rescans the whole bucket when the rule is saved.",
      "Run an S3 Batch Replication job for the existing objects, and leave the replication rule on for new uploads.",
      "Change the destination bucket's storage class to S3 Standard, because replicas into other storage classes are skipped."
    ], a: 2,
    no: [
      "Replication Time Control puts a 15-minute target and metrics on new objects. It doesn't reach back to objects that were there before.",
      "A live replication rule only ever copies objects written after it exists, however many times you save it.",
      null,
      "Replicas can be stored in another storage class. The storage class has nothing to do with old objects being missed."],
    why: "Live replication copies objects uploaded after the rule is in place. Objects that already existed, or that failed to replicate, are copied on demand with S3 Batch Replication.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/s3-batch-replication-batch.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-what-is-isnot-replicated.html"] },

  // SAA Task 1.3: Determine appropriate data security controls
  { id: "saa-1-857", exam: "SAA", saa: "1.3", topic: "s3", type: "mc",
    q: "An S3 bucket uses Object Lock in governance mode with a 90-day default retention. A test file was uploaded by mistake, and an administrator must permanently delete its version now, before the retention period ends. What does the administrator need?",
    opts: [
      "Nothing extra, because governance mode only blocks users that don't have the s3:DeleteObject permission.",
      "The root user's credentials, because only the account root user can remove a version under any retention.",
      "A support case, because only AWS can lift the retention, and only after the bucket owner proves who they are.",
      "The s3:BypassGovernanceRetention permission, and a delete request that sends the bypass governance header."
    ], a: 3,
    no: [
      "s3:DeleteObject isn't enough while retention is in force. Governance mode needs a special permission to get past it.",
      "Root needs the bypass permission and header too. And in compliance mode, not even root can remove the version.",
      "Nobody at AWS lifts retention for you. Governance mode is designed to be bypassed by your own privileged users.",
      null],
    why: "Governance mode protects a version from most users, but a user with s3:BypassGovernanceRetention can delete it or shorten its retention by sending x-amz-bypass-governance-retention:true. Compliance mode allows no such bypass for anyone.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-managing.html"] },

  // DVA Task 3.4: Deploy code by using AWS CI/CD services
  { id: "dva-3-853", exam: "DVA", dva: "3.4", topic: "cloudformation", type: "mc",
    q: "A developer deploys one CloudFormation template to us-east-1 and eu-west-1 in the same account with a StackSet. The template has an InstanceType parameter, and eu-west-1 must run a smaller instance type than us-east-1. Both Regions must keep using the same template. What should the developer do?",
    opts: [
      "Override the InstanceType parameter on the eu-west-1 stack instance, and keep the StackSet's default value for us-east-1.",
      "Make a second StackSet from a copy of the template with the smaller type written in, and deploy that one to eu-west-1 only.",
      "Add an AWS::Region condition in the template that rewrites the parameter's default value when the stack is in eu-west-1.",
      "Deploy the StackSet with the default value, then change the instance type in the eu-west-1 stack outside CloudFormation."
    ], a: 0,
    no: [
      null,
      "That works, but it leaves two copies of the template to keep in step, which is what the requirement rules out.",
      "A condition can't change a parameter's value. You could choose a value with a mapping, but parameter overrides are the StackSets way and need no template change.",
      "Changing a stack's resource outside CloudFormation causes drift, and the next StackSet update puts the old value back."],
    why: "A StackSet holds default parameter values, and each stack instance can override any of them. One template, one StackSet, with a different value in the Regions or accounts that need it.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stackinstances-override.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/what-is-cfnstacksets.html"] },

  // DVA Task 2.2: Implement encryption by using AWS services
  { id: "dva-2-854", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "A multi-Region primary KMS key in us-east-1 has a replica key in eu-west-1. An app role is allowed to decrypt by the primary key's key policy, and decrypts fine in us-east-1. In eu-west-1, the same role gets AccessDeniedException when it calls Decrypt on the replica. What is the cause?",
    opts: [
      "The replica holds different key material, so ciphertext from the primary must be re-encrypted before it can be used.",
      "The replica has its own key policy, separate from the primary's, and that policy doesn't allow the role to decrypt.",
      "Replica keys only accept Decrypt requests that are sent to the primary key's Region endpoint in us-east-1.",
      "The replica stays disabled until the primary key is rotated for the first time after the replica was created."
    ], a: 1,
    no: [
      "Related multi-Region keys share the same key material and key ID, so the replica can decrypt what the primary encrypted.",
      null,
      "The point of a replica is that it works in its own Region, with no call back to the primary's Region.",
      "A replica is created enabled. Rotation isn't needed for it to work."],
    why: "Multi-Region keys share their key ID, key material, key spec and rotation, but each one has its own key policy, grants, aliases and tags. The replica's key policy must allow the role as well.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html", "https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-auth.html"] },

  { id: "dva-2-855", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "A developer scheduled a customer managed KMS key for deletion by mistake, then cancelled the deletion with CancelKeyDeletion during the waiting period. The app that uses the key still fails when it calls Decrypt. What else must the developer do?",
    opts: [
      "Wait for the old waiting period to end, because the key can't be used again until that original date has passed.",
      "Import the original key material again, because cancelling a deletion clears the key material from KMS.",
      "Re-encrypt the data under a new key, because a key that was ever scheduled for deletion is marked unsafe.",
      "Enable the key with EnableKey, because a key whose deletion is cancelled is left in the Disabled state."
    ], a: 3,
    no: [
      "Cancelling ends the waiting period at once. What's left is the key's state.",
      "Cancelling keeps the key and its key material exactly as they were. Importing material only applies to keys with imported material that was deleted.",
      "There's no such mark. Once enabled, the key works as before and decrypts everything it encrypted.",
      null],
    why: "When you cancel a key's scheduled deletion, the key comes back in the Disabled state, not Enabled. Until someone with kms:EnableKey turns it back on, every cryptographic call with it fails.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys-scheduling-key-deletion.html", "https://docs.aws.amazon.com/kms/latest/developerguide/enabling-keys.html"] },

  { id: "dva-2-856", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "A team believes an old customer managed KMS key is unused, and schedules it for deletion with a 30-day waiting period. Before it's gone for good, the team wants to be warned if any application still tries to use the key, so it can cancel in time. What should the team set up?",
    opts: [
      "A CloudWatch alarm on the key's KeyUsage metric in the AWS/KMS namespace, which counts every call made with the key.",
      "An EventBridge rule on the KMS ScheduleKeyDeletion event, which fires again each day of the waiting period.",
      "A CloudTrail trail to CloudWatch Logs, a metric filter for calls refused as pending deletion, and an alarm on it.",
      "An AWS Config rule that marks the key noncompliant whenever an application's IAM role names the key in a policy."
    ], a: 2,
    no: [
      "AWS/KMS has no metric that counts each key's calls. The refused calls are recorded in CloudTrail.",
      "ScheduleKeyDeletion is logged once, when it happens. It tells you nothing about who still uses the key.",
      null,
      "A policy naming the key doesn't mean anything still calls it. And Config doesn't see the calls themselves."],
    why: "A key pending deletion can't be used, and each attempt is recorded in CloudTrail with an error. Send the trail to CloudWatch Logs, filter for those errors, and alarm on the metric, so you can cancel the deletion while there's still time.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys-creating-cloudwatch-alarm.html", "https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html"] }
);
