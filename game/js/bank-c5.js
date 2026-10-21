// Question bank batch: points chapter 5 teaches that the bank had no question on (CloudTrail data events, log file
// integrity validation, CloudTrail Lake, the 90-day event history, S3 server access logs next to data events, a
// service integration that fails between two services, linear traffic shifting, the alarm a rollback watches, and
// when blue/green is the wrong choice). Written for the chapter, then worded here without the story. Same schema
// and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 4.2: Instrument code for observability
  { id: "dva-4-800", exam: "DVA", dva: "4.2", topic: "cloudtrail", type: "mc",
    q: "An account has one CloudTrail trail with the default settings, delivering to an S3 bucket. An auditor asks for a record of every IAM principal that downloaded objects from a bucket of contracts last month. The trail's log files show the bucket's PutBucketPolicy calls but no GetObject calls at all. Why?",
    opts: [
      "GetObject is a data event, and a trail records data events only when you add them to its configuration.",
      "GetObject calls are recorded only in the Region's event history, and they're kept there for 90 days.",
      "The contracts bucket needs object versioning turned on before CloudTrail can record calls on its objects.",
      "GetObject calls are recorded only when the request is signed with long-term IAM user access keys."
    ], a: 0,
    no: [
      null,
      "Event history holds management events only. Object reads never appear in it.",
      "Versioning has nothing to do with logging. Data events are recorded on unversioned buckets too.",
      "CloudTrail records calls made with any credentials, roles included, once data events are on."],
    why: "Trails record management events, such as PutBucketPolicy, by default. Object-level calls such as GetObject and PutObject are data events, which are off by default, cost extra, and must be added to a trail or event data store.",
    doc: ["https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html", "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-management-events-with-cloudtrail.html"] },

  { id: "dva-4-801", exam: "DVA", dva: "4.2", topic: "cloudtrail", type: "mc",
    q: "A security team must be able to prove that no CloudTrail log file in its trail's S3 bucket was changed or deleted after CloudTrail delivered it, using a check that the team can run at any time. What should a developer set up?",
    opts: [
      "Turn on S3 Object Lock in governance mode on the bucket, and compare object ETags against a saved list each week.",
      "Turn on log file integrity validation for the trail, and check the files with aws cloudtrail validate-logs.",
      "Turn on S3 server access logging for the bucket, and search those logs for any DeleteObject or PutObject.",
      "Encrypt the log files with SSE-KMS, and check the key's usage in CloudTrail for any unexpected Decrypt calls."
    ], a: 1,
    no: [
      "Object Lock can stop deletions, but governance mode can be bypassed, and ETags prove nothing about who wrote the file.",
      null,
      "Access logs are delivered on a best-effort basis, so a missing entry proves nothing either way.",
      "Encryption keeps the files private. It doesn't show whether one was replaced or removed."],
    why: "With log file integrity validation on, CloudTrail delivers an hourly digest file that holds a SHA-256 hash of each log file and is signed with SHA-256 with RSA. validate-logs checks the chain of digests and reports any file that was modified or deleted.",
    doc: ["https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-intro.html", "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-log-file-validation-cli.html"] },

  // Task 4.1: Assist in a root cause analysis
  { id: "dva-4-802", exam: "DVA", dva: "4.1", topic: "cloudtrail", type: "mc",
    q: "Investigators need to run SQL queries over two years of CloudTrail events from every account in an organization, such as which roles called DeleteTable in a given month, without building an Athena table over S3 or managing partitions. What should a developer set up?",
    opts: [
      "A CloudWatch Logs log group for each account's trail, searched with a Logs Insights query in each account.",
      "The CloudTrail event history in each account, with its results exported to CSV and then joined by hand.",
      "A CloudTrail Lake event data store for the organization, with a retention long enough, queried with SQL.",
      "An EventBridge rule in each account that copies every API call into a DynamoDB table for later queries."
    ], a: 2,
    no: [
      "That works one account at a time, and it means keeping log groups and their retention in every account.",
      "Event history keeps 90 days of management events, one account and Region at a time.",
      null,
      "That's a store you'd have to build, run and query yourself, and DynamoDB doesn't run SQL over the events."],
    why: "CloudTrail Lake collects events into event data stores, which can cover a whole organization and keep events for years, and runs SQL queries over them directly, with no tables or partitions to manage.",
    doc: ["https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-lake.html", "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/query-create-edit-query.html"] },

  { id: "dva-4-803", exam: "DVA", dva: "4.1", topic: "cloudtrail", type: "mc",
    q: "A log group that a team relied on was deleted about four months ago. The account has never had a CloudTrail trail or event data store. A developer is asked to find out who deleted it. What will the developer find?",
    opts: [
      "The DeleteLogGroup event in the Region's event history, because management events are kept there for a year.",
      "The DeleteLogGroup event in CloudWatch Logs itself, because each log group's deletion is logged into its parent.",
      "The event in AWS Config's history, because every account records its resource changes in Config by default.",
      "No record of it: event history only shows the last 90 days, so the account needs a trail for anything older."
    ], a: 3,
    no: [
      "Event history keeps 90 days of management events, not a year.",
      "Log groups have no parent that records their deletion. CloudTrail is the record.",
      "AWS Config records only what a configuration recorder was set up to record, and it isn't on by default.",
      null],
    why: "Every account gets 90 days of management events in CloudTrail event history with no setup. Anything older is kept only by a trail, which delivers to S3, or by a CloudTrail Lake event data store.",
    doc: ["https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html", "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-create-and-update-a-trail.html"] },

  { id: "dva-4-804", exam: "DVA", dva: "4.2", topic: "s3", type: "mc",
    q: "A team must know which IAM principal read each object in a sensitive S3 bucket, with each record available within minutes and delivered every time, so an alarm can fire on reads by unexpected roles. Which logging option meets this?",
    opts: [
      "S3 server access logs written to a separate logging bucket, scanned by a scheduled Lambda function.",
      "CloudTrail data events for the bucket on a trail, sent on to CloudWatch Logs with a metric filter.",
      "S3 Storage Lens with advanced metrics, and a CloudWatch alarm on its activity metrics for the bucket.",
      "S3 Event Notifications for object reads, sent to an SNS topic that emails the security team each time."
    ], a: 1,
    no: [
      "Server access logs are delivered on a best-effort basis, usually within a few hours, so some records can be late or missing.",
      null,
      "Storage Lens reports aggregate usage and activity, not who read which object.",
      "S3 Event Notifications cover writes, deletes, restores and similar events, not reads."],
    why: "CloudTrail data events record object-level calls with the caller's identity and are delivered reliably, typically within minutes. A trail can send them to CloudWatch Logs, where a metric filter and an alarm can watch for unexpected readers.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/logging-with-S3.html", "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/send-cloudtrail-events-to-cloudwatch-logs.html"] },

  { id: "dva-4-805", exam: "DVA", dva: "4.2", topic: "s3", type: "mc",
    q: "A media site wants a cheap, detailed record of every request to its public S3 bucket, with the HTTP status, the bytes sent and the referrer, to build a weekly traffic report. A few hours of delay, or an occasional missing record, is acceptable. Which option is the MOST cost-effective?",
    opts: [
      "CloudTrail data events for the bucket on a trail, queried with Athena once a week for the report.",
      "A CloudTrail Lake event data store for the bucket's data events, queried with SQL each week.",
      "S3 server access logging on the bucket, delivered to another bucket and queried with Athena.",
      "S3 Event Notifications for every request, sent to Amazon Data Firehose and stored as files in S3."
    ], a: 2,
    no: [
      "That works, but CloudTrail charges for every data event, and a busy public bucket has a great many of them.",
      "Lake charges to ingest and store each event, which adds up quickly for a busy public bucket.",
      null,
      "S3 Event Notifications don't fire on reads, and they carry none of the request details the report needs."],
    why: "Server access logs record each request, including the status, bytes sent and referrer, and cost nothing beyond the storage of the log files. They're delivered on a best-effort basis, which a weekly report can tolerate.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/logging-with-S3.html"] },

  { id: "dva-4-806", exam: "DVA", dva: "4.1", topic: "s3", type: "mc",
    q: "A developer turned on S3 server access logging for a bucket and chose the same bucket as the destination, under the prefix logs/. The bucket's object count and storage bill now keep growing even when no one uses the app. What should the developer change?",
    opts: [
      "Add a lifecycle rule that deletes objects under logs/ after one day, and keep the bucket as its own target.",
      "Turn on log file integrity validation, so S3 stops writing a log record for its own log file deliveries.",
      "Turn logging off and use CloudTrail management events, which also record each object a client reads.",
      "Send the logs to a separate destination bucket in the same Region, with no logging turned on for it."
    ], a: 3,
    no: [
      "That hides the growth for a day at a time, but every log delivery still writes new log records about itself.",
      "Integrity validation is a CloudTrail feature. It has no effect on S3 server access logs.",
      "Management events don't include object reads. Those are data events.",
      null],
    why: "Each log file S3 writes into the source bucket is itself a request that gets logged, so logs beget more logs. AWS recommends a separate destination bucket, in the same Region and account, that doesn't log to itself.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-server-access-logging.html"] },

  { id: "dva-4-807", exam: "DVA", dva: "4.1", topic: "eventbridge", type: "mc",
    q: "An EventBridge rule matches order events and targets a Lambda function created with the CLI. Matching events are published, but the function never runs, and its log group has no new entries. Where should the developer look to find why the deliveries fail?",
    opts: [
      "The rule's FailedInvocations metric in CloudWatch, plus a dead-letter queue on the target to keep each failed event with its error.",
      "The function's Errors and Throttles metrics in CloudWatch, plus the function's own asynchronous on-failure destination.",
      "The event bus's resource-based policy, plus a CloudTrail data event trail on the function to record each invoke call.",
      "The X-Ray service map for the event bus, plus active tracing on the function so the failed calls show up as faults."
    ], a: 0,
    no: [
      null,
      "Those count invocations that reached the function. These events never got that far.",
      "The bus policy controls who may put events on the bus, not whether a target can be reached.",
      "A delivery that fails before the function starts leaves no trace in the function's own segments."],
    why: "When EventBridge can't deliver to a target, for example because the function's resource-based policy doesn't let events.amazonaws.com invoke it, the rule's FailedInvocations metric rises. An SQS dead-letter queue on the target keeps each failed event with ERROR_CODE and ERROR_MESSAGE attributes.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html", "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring.html"] },

  // Task 3.4: Deploy code by using AWS CI/CD services
  { id: "dva-3-808", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc",
    q: "A team releases a Lambda function through CodeDeploy on its live alias. Each release must move traffic to the new version in equal steps of 10 percent, one step every minute, until all traffic is on it. Which deployment configuration should the team use?",
    opts: [
      "CodeDeployDefault.LambdaCanary10Percent5Minutes",
      "CodeDeployDefault.LambdaLinear10PercentEvery1Minute",
      "CodeDeployDefault.LambdaAllAtOnce, with a 1-minute wait",
      "CodeDeployDefault.LambdaCanary10Percent10Minutes"
    ], a: 1,
    no: [
      "A canary moves 10 percent, waits 5 minutes, then moves the other 90 percent in one go.",
      null,
      "All at once moves every request to the new version immediately. There are no steps to wait between.",
      "Another canary: one 10 percent step, a 10-minute wait, then the rest at once."],
    why: "Linear configurations move traffic in equal increments with the same wait between each, so LambdaLinear10PercentEvery1Minute reaches 100 percent in ten steps. Canary configurations move one slice first and then everything else.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html", "https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html"] },

  { id: "dva-3-809", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc",
    q: "A CodeDeploy canary deployment shifts 10 percent of a Lambda alias's traffic to a new version, and must roll back on its own if that version misbehaves during the wait. Which CloudWatch alarm should the deployment watch?",
    opts: [
      "An alarm on the account's total ConcurrentExecutions, set just below the account's concurrency quota.",
      "An alarm on the function's Invocations count for the alias, set to fire when traffic drops below normal.",
      "An alarm on the function's Errors for the alias and the new version, set to fire above a normal error rate.",
      "An alarm on the Duration of the old version, set to fire when the old version starts running more slowly."
    ], a: 2,
    no: [
      "That warns about running out of concurrency for the whole account, not about whether the new code works.",
      "A drop in invocations says callers went quiet. It doesn't say the new version is failing them.",
      null,
      "The old version isn't what's being tested. The alarm must watch the new one."],
    why: "CodeDeploy stops and rolls back a deployment when one of its alarms goes into ALARM. Invoked through an alias, Lambda publishes metrics with the alias as the Resource dimension and the ExecutedVersion, so an Errors alarm can watch the new version as it takes traffic.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html", "https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html"] },

  { id: "dva-3-810", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc",
    q: "A team wants blue/green releases for a web app on EC2, so the old fleet stays ready for a quick rollback. The next release renames a column in the one shared database, and the old version's code can't read the renamed column. What is the problem with a plain blue/green release here?",
    opts: [
      "Blue/green deployments can't be used with apps that keep any of their data in a relational database at all.",
      "CodeDeploy can't create a replacement fleet when the instances run in an EC2 Auto Scaling group at all.",
      "The green fleet can't receive traffic until the database is copied to a second, separate green database.",
      "Rolling back to blue would break: blue's code can't read the schema green changed in the shared database."
    ], a: 3,
    no: [
      "Blue/green works with databases. The trouble is only a schema change that the two versions can't share.",
      "CodeDeploy blue/green can copy an Auto Scaling group to build the replacement fleet.",
      "Both fleets normally share one database. That's why its schema has to suit both versions.",
      null],
    why: "During and after a blue/green shift both versions run against the same data, so a schema change must stay readable by the old version, for example by adding the new column first and removing the old one in a later release. Otherwise the quick rollback that blue/green promises no longer works.",
    doc: ["https://docs.aws.amazon.com/whitepapers/latest/blue-green-deployments/best-practices-for-managing-data-synchronization-and-schema-changes.html", "https://docs.aws.amazon.com/codedeploy/latest/userguide/welcome.html"] }
);
