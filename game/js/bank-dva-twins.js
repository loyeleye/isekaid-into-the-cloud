// Question bank batch: twins (anti-memorization PR 2, Nov 9). Each question tests the same rule as a question the
// chapters ask, in a scenario the player hasn't seen, so a missed question can come back on the Wall as a new one
// (js/qpick.js SD.qtwin, tools/twins.js). About half are flip twins: the same rule, but the scenario moves the right
// answer to the option the original taught you to avoid, so remembering the original's answer isn't enough.
// Every question carries `variant: true` (never held out for the Exam Hall's forms, tools/exam_heldout.js) and
// `twin: [id]`, the question it was written for. Same schema and rules as js/bank-dva.js; written fresh, and facts
// checked against the linked AWS docs in November 2026.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // ---------------------------------------------------------------- Domain 1: Development with AWS Services

  // FIFO message groups (twin of dva-1-04), flip: one group for everything
  { id: "dva-1-950", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc", variant: true, twin: ["dva-1-04"],
    q: "A shipping app sends each parcel's tracking events to an SQS FIFO queue, and every message uses the same MessageGroupId, \"parcels\". Each parcel's events arrive in order, but adding more consumers doesn't raise throughput at all. Each parcel's events must stay in order. What should the developer change?",
    opts: [
      "Switch to a standard queue, so that every new consumer can receive messages at the same time.",
      "Set each message's MessageDeduplicationId to the parcel ID, so each parcel's events are kept apart.",
      "Set each message's MessageGroupId to the parcel ID, so different parcels are processed in parallel.",
      "Raise the queue's visibility timeout, so each consumer holds its messages long enough to finish."
    ], a: 2,
    no: [
      "A standard queue scales, but it drops the ordering guarantee each parcel needs.",
      "The deduplication ID only stops duplicate sends within five minutes. It has nothing to do with order or parallelism.",
      null,
      "A longer timeout doesn't add parallelism. With one group, only one batch of it is in flight at a time."],
    why: "A FIFO queue keeps order within a message group, and while a group has messages in flight no other consumer gets that group's next ones. One group for everything means one consumer works at a time. A group per parcel keeps each parcel in order and lets parcels go in parallel.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html"] },

  // Visibility heartbeat (twin of dva-1-102)
  { id: "dva-1-951", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc", variant: true, twin: ["dva-1-102"],
    q: "Render workers pull jobs from an SQS queue. A job takes anywhere from 10 seconds to 25 minutes, so the queue's visibility timeout is 30 minutes. When a worker crashes, its job sits hidden for up to half an hour before another worker can pick it up. Which change gets a crashed worker's job retried soonest?",
    opts: [
      "Set a 2-minute visibility timeout, and have workers call ChangeMessageVisibility every minute while a job runs.",
      "Turn on long polling with a 20-second WaitTimeSeconds, so idle workers notice the waiting job sooner.",
      "Set a dead-letter queue with a maxReceiveCount of 1, so a job that a worker drops moves out of the main queue right away.",
      "Set DelaySeconds on the queue to 15 minutes, so each job is spread across fewer workers at a time."
    ], a: 0,
    no: [null,
      "Long polling cuts empty responses, but the job is still invisible until its 30-minute timeout runs out.",
      "The job would leave for the dead-letter queue after one failed receive and never be retried by a worker.",
      "Delay hides new messages before their first delivery. It does nothing for a job that a crashed worker held."],
    why: "ChangeMessageVisibility extends one received message's timeout using its receipt handle. Calling it regularly works as a heartbeat: a live worker keeps its job hidden, and a crashed worker's job reappears soon after its last extension.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ChangeMessageVisibility.html",
      "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html"] },

  // ResultPath (twin of dva-1-309), flip: on a Task's result, not a Catch
  { id: "dva-1-952", exam: "DVA", dva: "1.1", topic: "stepfunctions", type: "mc", variant: true, twin: ["dva-1-309"],
    q: "In a JSONPath state machine, a Task state calls a fraud-check Lambda function that returns {\"score\": 82}. The next Choice state must route on both the score and the orderId from the Task's input, but its input now holds only the score. What should the developer change on the Task state?",
    opts: [
      "Set OutputPath to \"$.orderId\", so that the order ID is passed on to the Choice state.",
      "Set InputPath to \"$\", so that the whole input is kept for the states that come after it.",
      "Set ResultSelector to {\"orderId.$\": \"$.orderId\"} so the order ID is copied into the task's own result.",
      "Set ResultPath to \"$.fraud\", so that the result is added to the input instead of replacing it."
    ], a: 3,
    no: [
      "OutputPath filters what leaves the state. It would keep the order ID and drop the score.",
      "InputPath controls what the task receives, and \"$\" is already the default. The result still replaces the input.",
      "ResultSelector reads from the task's result, which has no orderId, so it can't bring the input's fields back.",
      null],
    why: "ResultPath defaults to $, so a task's result replaces its whole input. Setting it to a field such as $.fraud adds the result there and keeps the original input, so the next state sees both.",
    doc: ["https://docs.aws.amazon.com/step-functions/latest/dg/input-output-resultpath.html"] },

  // Versions are immutable (twin of dva-1-208)
  { id: "dva-1-953", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc", variant: true, twin: ["dva-1-208"],
    q: "A Lambda function's live alias points at version 12. A developer uploads a bug fix with UpdateFunctionCode and tests it on $LATEST, where it works. A day later, customers calling the live alias still hit the bug. What should the developer do?",
    opts: [
      "Set the function's reserved concurrency to zero and back, so live requests start fresh environments.",
      "Publish a new version from $LATEST, which captures the fix, and update the live alias to point at it.",
      "Call UpdateFunctionCode again with the version 12 qualifier, so the fix replaces the code in that version.",
      "Wait for Lambda to recycle version 12's execution environments, which then load the newest uploaded code."
    ], a: 1,
    no: [
      "New environments still run version 12's code, because that's the version the alias points at.",
      null,
      "Published versions are immutable. Their code and most settings can't be changed, only replaced by a new version.",
      "Recycled environments load version 12 again. A version never picks up later uploads."],
    why: "Publishing a version freezes its code and most of its configuration. Changes to $LATEST reach callers of an alias only after a new version is published and the alias is moved to it.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html"] },

  // Visibility timeout vs Lambda timeout (twin of dva-1-212)
  { id: "dva-1-954", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc", variant: true, twin: ["dva-1-212"],
    q: "A Lambda function's timeout was raised from 20 seconds to 5 minutes, but the SQS queue it processes still has the default 30-second visibility timeout. Messages are often processed twice, by two invocations at once. Which visibility timeout does AWS recommend for the queue?",
    opts: [
      "At least 5 minutes, the same as the function's timeout, so a batch stays hidden while it runs.",
      "At least 30 minutes, six times the function's timeout, so batches stay hidden through retries.",
      "At least 10 minutes, twice the function's timeout, so one retry can finish before it reappears.",
      "Leave it at 30 seconds, and lower the event source mapping's batch size to one message instead."
    ], a: 1,
    no: [
      "Lambda requires at least this much, but it leaves no room to retry a throttled batch before its messages reappear.",
      null,
      "Twice the timeout is better than 30 seconds, but it's below what AWS recommends for throttling and retries.",
      "A smaller batch still takes minutes to process, so each message reappears long before it's done."],
    why: "AWS recommends a source queue visibility timeout of at least six times the function's timeout, so Lambda has time to retry a throttled batch before its messages become visible to other pollers.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html"] },

  // LSI vs GSI (twin of dva-1-08), flip: the table already exists
  { id: "dva-1-955", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc", variant: true, twin: ["dva-1-08"],
    q: "A Readings table in production has DeviceId as its partition key and Timestamp as its sort key, and holds two years of data. A new dashboard must list one device's readings sorted by Temperature. Eventually consistent reads are fine. Which solution needs the LEAST effort?",
    opts: [
      "Add a local secondary index with Temperature as its sort key, then query the index.",
      "Change the table's sort key from Timestamp to Temperature with an UpdateTable call.",
      "Add a global secondary index on DeviceId with Temperature as its sort key, then query it.",
      "Query all of the device's readings from the table, and sort them by Temperature in the app."
    ], a: 2,
    no: [
      "A local secondary index can only be defined when the table is created, not added to one that exists.",
      "A table's key schema can't be changed after it's created.",
      null,
      "It works for a few items, but it reads every reading the device has ever sent on each request."],
    why: "A global secondary index can be added to an existing table, and its partition key can match the table's. A local secondary index is the one that supports strongly consistent reads, but it has to be defined at table creation.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html",
      "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html"] },

  // Capacity units (twin of dva-1-228), flip: writes instead of reads
  { id: "dva-1-956", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc", variant: true, twin: ["dva-1-228"],
    q: "A sensor service writes 50 items per second to a DynamoDB table in provisioned capacity mode, using standard (non-transactional) PutItem calls. Each item is 2.5 KB. How many write capacity units does this traffic need?",
    opts: [
      "75 WCU: 2.5 KB rounds up to 3 units, which is halved to 1.5 for standard writes.",
      "125 WCU: 2.5 KB is 2.5 units per write, and 50 × 2.5 comes to exactly 125.",
      "300 WCU: 2.5 KB rounds up to 3 units, which is doubled to 6 for every write.",
      "150 WCU: 2.5 KB rounds up to 3 KB, or 3 units per write, and 50 × 3 = 150."
    ], a: 3,
    no: [
      "Halving applies to eventually consistent reads. Writes have no cheaper mode.",
      "Each item's size is rounded up to the next whole KB before counting units.",
      "Doubling applies to transactional writes, and these are standard PutItem calls.",
      null],
    why: "One write capacity unit is one write per second of an item up to 1 KB, rounded up per item, so a 2.5 KB item takes 3 units. Transactional writes cost twice that; there is no half-price write.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html"] },

  // DAX and consistency (twin of dva-1-240)
  { id: "dva-1-957", exam: "DVA", dva: "1.3", topic: "dax", type: "mc", variant: true, twin: ["dva-1-240"],
    q: "A store reads inventory through a DAX cluster. A separate warehouse service updates stock directly in DynamoDB, and the checkout step sometimes sees a count that is minutes old. Checkout must always read the latest count, while product pages can stay on the cache. What should the developer do?",
    opts: [
      "Set ConsistentRead to true on checkout's GetItem calls, so DAX passes them on to DynamoDB.",
      "Shorten the cluster's item cache TTL to one minute, so stale counts expire from the cache sooner.",
      "Add a second node to the DAX cluster, so each read is served from a node with fresher data.",
      "Switch checkout from GetItem to Query on the same key, so it reads the table instead of the cache."
    ], a: 0,
    no: [null,
      "A shorter TTL still serves counts up to a minute old, and it makes product pages miss the cache more often.",
      "Nodes replicate the same cache. More nodes add read capacity, not fresher data.",
      "DAX caches eventually consistent Query results too, in its query cache."],
    why: "DAX is eventually consistent, and writes made straight to DynamoDB don't update its cache. Strongly consistent reads go through DAX to DynamoDB uncached, so they always return the latest value.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.consistency.html"] },

  // ---------------------------------------------------------------- Domain 2: Security

  // External ID (twin of dva-2-107), flip: you are the customer
  { id: "dva-2-950", exam: "DVA", dva: "2.1", topic: "sts", type: "mc", variant: true, twin: ["dva-2-107"],
    q: "A company gives a third-party monitoring vendor access to its account through an IAM role. The vendor's AWS account serves many customers, and the company wants to stop another of the vendor's customers from tricking the vendor into using this role. The vendor has given the company a unique ID. What should the developer do?",
    opts: [
      "Create an IAM user for the vendor, and send them that user's access keys over an encrypted channel.",
      "Add an aws:SourceIp condition to the role's permissions policy that lists the vendor's office IP range.",
      "Require MFA in the role's trust policy, so every AssumeRole call must include a valid MFA code.",
      "Trust the vendor's account in the role, with an sts:ExternalId condition set to the ID they gave."
    ], a: 3,
    no: [
      "Long-term keys for a third party are what roles are meant to replace, and they do nothing about the confused deputy.",
      "The vendor's service calls from its own systems, not an office, and an IP check doesn't tell its customers apart.",
      "The vendor's automated service can't supply an MFA code on each call.",
      null],
    why: "The external ID is the guard against the confused deputy problem. The trust policy accepts AssumeRole only when the call carries this customer's ID, so the vendor can't be tricked into acting for someone else on this role.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html"] },

  // Which key type (twin of dva-2-201), flip: no control needed
  { id: "dva-2-951", exam: "DVA", dva: "2.2", topic: "kms", type: "mc", variant: true, twin: ["dva-2-201"],
    q: "A team stores public product images in a new S3 bucket. The only rule is that objects are encrypted at rest. Nobody needs to control the key, disable it or audit its use. Which solution meets this with the LEAST cost and operational overhead?",
    opts: [
      "Use SSE-KMS with a customer managed key, and write a key policy for the app's role.",
      "Use SSE-C, and have the app send its own encryption key with every upload request.",
      "Rely on SSE-S3, which S3 applies to every new object by default, with no extra setup.",
      "Encrypt each image in the app with the AWS Encryption SDK before the app uploads it."
    ], a: 2,
    no: [
      "It works, but it adds a key to manage and a KMS charge on requests that the rule doesn't ask for.",
      "SSE-C makes the team store and send its own keys, which is more work, not less.",
      null,
      "Client-side encryption means code in every reader and writer for a rule S3 already meets."],
    why: "Since January 2023, S3 encrypts every new object with SSE-S3 by default, at no extra cost. A customer managed KMS key is worth it when you must write the key policy, disable the key or audit its use.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-encryption-faq.html",
      "https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html"] },

  // Encryption context (twin of dva-2-203)
  { id: "dva-2-952", exam: "DVA", dva: "2.2", topic: "kms", type: "mc", variant: true, twin: ["dva-2-203"],
    q: "A multi-tenant app encrypts each tenant's files with data keys from KMS GenerateDataKey, all under one KMS key. The team wants a request for one tenant to be unable to decrypt another tenant's encrypted data key, and CloudTrail to show which tenant each Decrypt call was for. What should the developer do?",
    opts: [
      "Give each data key an alias named after its tenant, and call Decrypt with that alias.",
      "Pass the tenant ID as the encryption context on GenerateDataKey and on every Decrypt call.",
      "Store the tenant ID in each encrypted file's S3 object metadata, next to the encrypted data key.",
      "Rotate the KMS key every time a new tenant signs up, so each tenant's data keys come from a new one."
    ], a: 1,
    no: [
      "Aliases name KMS keys, not data keys, and an alias doesn't stop a decrypt for the wrong tenant.",
      null,
      "Metadata isn't checked by KMS, so it doesn't bind the data key to the tenant.",
      "Rotation keeps older key material for decrypting, and it doesn't separate tenants or log them."],
    why: "The encryption context is additional authenticated data bound to the ciphertext. Decrypt succeeds only with the same context, so another tenant's ID fails, and the context is recorded in CloudTrail for each call.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html"] },

  // Parameter Store or Secrets Manager (twin of dva-2-224), flip: rotation is required
  { id: "dva-2-953", exam: "DVA", dva: "2.3", topic: "secrets", type: "mc", variant: true, twin: ["dva-2-224"],
    q: "An app reads a partner's API key through the AWS SDK. Company policy now says the key must be stored encrypted and rotated automatically every 60 days by a Lambda function that calls the partner's key API. Which solution needs the LEAST custom code?",
    opts: [
      "Store the key in Secrets Manager, and turn on rotation every 60 days with a rotation Lambda function.",
      "Store the key as a standard SecureString parameter, and set a 60-day expiration policy on it.",
      "Store the key as a SecureString parameter, plus an EventBridge schedule that runs a function to replace it.",
      "Store the key in a Lambda environment variable, and turn on 60-day automatic rotation for the function's KMS key."
    ], a: 0,
    no: [null,
      "Parameter policies need the advanced tier, and an expiration policy deletes the parameter when it expires. Nothing makes a new key.",
      "It can work, but you build the schedule, versioning and failure handling that Secrets Manager rotation already gives you.",
      "Rotating a KMS key changes the key that encrypts the variable, not the partner's API key itself."],
    why: "Secrets Manager runs rotation on a schedule, calling a Lambda function through its create, set, test and finish steps and keeping versions with staging labels. Parameter Store is cheaper, but it has no built-in rotation.",
    doc: ["https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda.html",
      "https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html"] },

  // Caching secrets (twin of dva-2-226)
  { id: "dva-2-954", exam: "DVA", dva: "2.3", topic: "secrets", type: "mc", variant: true, twin: ["dva-2-226"],
    q: "A Python Lambda function calls GetSecretValue for a database password inside its handler, on every invocation. It runs about 500 times a minute, and the Secrets Manager bill is rising. Adding a layer is fine. Which solution cuts the API calls with the LEAST code?",
    opts: [
      "Copy the password into a plaintext environment variable when deploying, and read it from there on each call.",
      "Turn on provisioned concurrency, so the function keeps its execution environments warm between invocations.",
      "Raise the function's memory setting, so each GetSecretValue call returns faster and costs less to make.",
      "Add the AWS Parameters and Secrets Lambda Extension, and read the secret from its local endpoint."
    ], a: 3,
    no: [
      "A plaintext variable shows the password to anyone who can read the function's configuration, and it never sees a rotated value.",
      "Warm environments still run the handler, and the handler still calls GetSecretValue each time.",
      "Memory changes speed, not the number of calls, and Secrets Manager bills per call.",
      null],
    why: "The extension caches secrets in the execution environment and serves them over localhost (port 2773), refreshing after a time to live of 300 seconds by default. Most invocations then make no Secrets Manager call.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html"] },

  // ---------------------------------------------------------------- Domain 3: Deployment

  // Deployment configurations (twin of dva-3-201), flip: a built-in one fits
  { id: "dva-3-950", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc", variant: true, twin: ["dva-3-201"],
    q: "A CodeDeploy deployment group has 8 EC2 instances behind a load balancer. Each in-place release must finish as fast as possible while at least half of the instances stay in service. Which deployment configuration should the developer use?",
    opts: [
      "CodeDeployDefault.AllAtOnce, which deploys to every instance in one batch.",
      "CodeDeployDefault.OneAtATime, which deploys to one instance at a time.",
      "CodeDeployDefault.HalfAtATime, which keeps half of the instances healthy.",
      "A custom configuration with minimum healthy hosts set to FLEET_PERCENT 25."
    ], a: 2,
    no: [
      "All at once takes every instance out of service together.",
      "One at a time keeps the most instances up, but it takes 8 batches when 2 would meet the rule.",
      null,
      "25% would let 6 of the 8 instances go out of service at once, breaking the half rule."],
    why: "On EC2, a deployment configuration sets the minimum healthy hosts. HalfAtATime keeps at least 50% healthy and deploys to up to half at a time, so 8 instances take two batches of 4.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html"] },

  // Beanstalk deployment policies (twin of dva-3-214), flip: no live traffic to the new version early
  { id: "dva-3-951", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc", variant: true, twin: ["dva-3-214"],
    q: "An Elastic Beanstalk environment runs a busy web app. Each release must go onto brand-new instances, full capacity must stay up the whole time, and a failed release must leave the old instances untouched. The release should finish as soon as the new instances are healthy, with no timed evaluation period on a share of the traffic. Which deployment policy should the developer choose?",
    opts: [
      "Traffic splitting, which sends a set percentage of client traffic to the new instances first.",
      "Rolling with additional batch, which adds a new batch first and then updates the rest in batches.",
      "All at once, which deploys the new version to every existing instance in a single step.",
      "Immutable, which launches a full set of new instances in a temporary Auto Scaling group."
    ], a: 3,
    no: [
      "Traffic splitting also uses new instances, but it holds a share of traffic on them for an evaluation period first.",
      "Updated batches serve traffic while later ones are still old, and existing instances are changed in place.",
      "It changes the existing instances in place and takes the app down during the deployment.",
      null],
    why: "An immutable deployment launches the new version in a temporary Auto Scaling group behind the load balancer, one instance first and then a full set, serving alongside the old instances. When all of them pass health checks, Beanstalk moves them into the original group and terminates the old ones. If they fail, it terminates the new ones and the old instances are untouched.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html",
      "https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environmentmgmt-updates-immutable.html"] },

  // Change sets (twin of dva-3-128)
  { id: "dva-3-952", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc", variant: true, twin: ["dva-3-128"],
    q: "A stack holds a production RDS DB instance. A template change edits the instance's DBInstanceIdentifier. Before anything is touched, the team must see whether CloudFormation would replace the database, and someone must approve the update. Which approach meets these requirements?",
    opts: [
      "Run drift detection on the stack, and review the resources it reports as modified before updating.",
      "Create a change set from the new template, review the instance's Replacement value, then execute it.",
      "Run the new template through cfn-lint, and update the stack only if it reports no warnings at all.",
      "Add a stack policy that denies Update:Replace, then update the stack and read the events it logs."
    ], a: 1,
    no: [
      "Drift detection compares live resources with the current template, not with a proposed one.",
      null,
      "Linting checks the template's syntax and properties. It doesn't preview what an update would do.",
      "A stack policy can block the replacement, but it shows nothing in advance and leaves no approval step."],
    why: "A change set lists each change an update would make, including whether a resource will be replaced, and nothing changes until it's executed. Changing an RDS instance's DBInstanceIdentifier requires replacement.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html",
      "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbinstance.html"] },

  // SAM deployment preference types (twin of dva-3-01), flip: linear
  { id: "dva-3-953", exam: "DVA", dva: "3.4", topic: "sam", type: "mc", variant: true, twin: ["dva-3-01"],
    q: "A team deploys a Lambda function with AWS SAM. Each release must shift traffic to the new version in equal 10% steps, one step every 2 minutes, and roll back on its own if an error alarm goes off. What should the developer add to the function in the template?",
    opts: [
      "AutoPublishAlias, and a DeploymentPreference of Type Canary10Percent5Minutes with the alarm under Alarms.",
      "AutoPublishAlias, and a DeploymentPreference of Type AllAtOnce with the error alarm listed under Alarms.",
      "AutoPublishAlias, and a DeploymentPreference of Type Linear10PercentEvery2Minutes with the alarm under Alarms.",
      "A RoutingConfig on the alias with a 10% weight, plus a script that raises the weight every 2 minutes."
    ], a: 2,
    no: [
      "A canary shifts one 10% step, then the rest at once after 5 minutes. It isn't equal steps.",
      "All at once shifts everything in one step, so there are no steps for the alarm to stop.",
      null,
      "A hand-built script has to do what CodeDeploy already does, and it rolls back only if you write that too."],
    why: "SAM's DeploymentPreference shifts traffic on the alias through CodeDeploy. Linear types move equal steps at a fixed interval; canary types move one step and then the rest. The listed alarms trigger a rollback.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/automating-updates-to-serverless-apps.html"] },

  // ---------------------------------------------------------------- Domain 4: Troubleshooting and Optimization

  // X-Ray service map colors (twin of dva-4-107), flip: yellow, not purple
  { id: "dva-4-950", exam: "DVA", dva: "4.1", topic: "xray", type: "mc", variant: true, twin: ["dva-4-107"],
    q: "A checkout function is traced with AWS X-Ray. On the service map, the function's node is mostly green, but the node for a partner's payment API that it calls is outlined mostly in yellow. Which conclusion is correct?",
    opts: [
      "The partner API is throttling the function's requests, so the function needs to back off and retry them.",
      "The partner API is returning client errors (4xx), so the requests the function sends need checking.",
      "The partner API is failing with server faults (5xx), so the problem is on the partner's side.",
      "X-Ray sampled too few of the partner calls, so the color isn't a real measure of their status."
    ], a: 1,
    no: [
      "Throttling (429) shows as purple on the service map.",
      null,
      "Server faults show as red.",
      "Sampling sets how many requests are traced, not the colors of the ones that are."],
    why: "The X-Ray service map colors each node by its calls: green for success, yellow for client errors (4xx), red for server faults (5xx) and purple for throttling (429). Yellow points to bad or unauthorized requests from the caller.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-console-servicemap.html"] },

  // Hot partition keys (twin of dva-4-212)
  { id: "dva-4-951", exam: "DVA", dva: "4.3", topic: "dynamodb", type: "mc", variant: true, twin: ["dva-4-212"],
    q: "An IoT table in DynamoDB uses the date, such as 2026-11-09, as its partition key, so all of today's 4,000 writes per second go to one key. Writes are throttled even though the table has far more capacity than that. Reads always fetch one whole day. What should the developer do?",
    opts: [
      "Switch the table to on-demand capacity mode, so it scales to handle the day's write traffic.",
      "Raise the table's provisioned write capacity until the throttling stops during the busiest hours.",
      "Add a global secondary index on the date, so the writes are spread between the table and the index.",
      "Add a random suffix from 1 to 10 to the date in the partition key, and read all ten keys for a day."
    ], a: 3,
    no: [
      "On-demand raises the table's limits, not a partition's, and each partition still tops out at 1,000 write units per second.",
      "More table capacity doesn't lift the per-partition limit that one hot key runs into.",
      "An index keyed on the date has the same hot key, and a throttled index slows the table's writes.",
      null],
    why: "Each partition handles at most 1,000 write units per second. A suffix spreads one day's writes over ten keys, and so over several partitions; a reader queries the ten keys and combines them.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html"] },

  // Parallelization factor (twin of dva-4-210)
  { id: "dva-4-952", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc", variant: true, twin: ["dva-4-210"],
    q: "A Lambda function processes a DynamoDB stream to update search indexes. Each batch takes several seconds, the function falls further behind during busy hours, and changes to the same item must stay in order. The function isn't failing or throttled. What should the developer do?",
    opts: [
      "Raise the event source mapping's ParallelizationFactor, so each shard runs several batches at once.",
      "Set the stream view type to KEYS_ONLY, so each stream record carries less data for the function to read.",
      "Turn on BisectBatchOnFunctionError on the mapping, so that every batch is split into two smaller batches.",
      "Set reserved concurrency on the function, so that more copies of it can read the stream together at once."
    ], a: 0,
    no: [null,
      "A smaller record doesn't make the slow processing step faster, and the indexer would lose the new values.",
      "Bisecting happens only after a function error, and this function isn't failing.",
      "Reserved concurrency caps the function. The stream's shards still get one batch at a time each."],
    why: "The parallelization factor (1 to 10) lets Lambda process that many batches from each shard at once while keeping records with the same partition key in order. It works for DynamoDB streams as well as Kinesis.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/with-ddb.html"] },

  // Metrics from logs (twin of dva-4-03), flip: the code can't change
  { id: "dva-4-953", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc", variant: true, twin: ["dva-4-03"],
    q: "A legacy app on EC2 writes plain-text lines such as \"PAYMENT_FAILED order=812\" to a CloudWatch Logs log group. The team needs a CloudWatch alarm on how many payments fail per minute, and the app's code can't be changed. Which solution has the LEAST operational overhead?",
    opts: [
      "Change the app's logging to embedded metric format, so CloudWatch pulls the metric out of the log lines.",
      "Create a metric filter on the log group that matches PAYMENT_FAILED, then set the alarm on its metric.",
      "Add a PutMetricData call to the app each time a payment fails, and set the alarm on that metric.",
      "Stream the log group to a Lambda function that counts the lines and calls PutMetricData every minute."
    ], a: 1,
    no: [
      "Embedded metric format needs the app to write structured JSON, which means changing its code.",
      null,
      "That also changes the code, which the team can't do.",
      "It works, but it adds a function to run and maintain for what a metric filter does on its own."],
    why: "A metric filter turns matching log events into a CloudWatch metric with no code changes. Embedded metric format is the choice when you can change the code and want metrics with dimensions without extra API calls.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html",
      "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html"] },

  // ---------------------------------------------------------------- Batch 2 (Nov 16): twins for verified Development and
  // Troubleshooting questions that had none. Facts checked against the linked AWS docs on Nov 16, 2026 (js/verified.js).,

// Expiration on a current version (twin of dva-1-604), flip: the delete marker is the right answer this time
  { id: "dva-1-960", exam: "both", dva: "1.3", saa: "4.1", topic: "s3", type: "mc", variant: true, twin: ["dva-1-604"],
    q: "A versioned S3 bucket has a lifecycle rule with an Expiration action set to 30 days, and no other actions. A 40-day-old object has a single version, which isn't a delete marker. What does the rule do to that object?",
    opts: [
      "It adds a delete marker, so the old version becomes noncurrent and is still stored.",
      "It permanently deletes the object's only version, so the object can't be restored.",
      "It moves the object's version to S3 Glacier Flexible Retrieval for cheaper storage.",
      "It does nothing, because expiration only applies to versions that are noncurrent."
    ], a: 0,
    no: [null,
      "Permanent deletion is what NoncurrentVersionExpiration does to noncurrent versions. On a current version in a versioned bucket, Expiration adds a marker.",
      "Moving data between storage classes is a transition action. This rule has only an expiration action.",
      "It's the other way round: Expiration applies only to current versions, and NoncurrentVersionExpiration handles noncurrent ones."],
    why: "In a versioning-enabled bucket, Expiration on a current version adds a delete marker, and the old data stays as a noncurrent version that is still billed. Add NoncurrentVersionExpiration to remove those versions for good.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html",
      "https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html"] },

  // Visibility timeout shorter than the job (twin of dva-1-101)
  { id: "dva-1-961", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc", variant: true, twin: ["dva-1-101"],
    q: "Workers on EC2 poll an SQS standard queue that has the default visibility timeout. Each video thumbnail job takes about 90 seconds, and a worker deletes the message when it's done. Most jobs are being run by two or three workers. What should the developer do?",
    opts: [
      "Raise the queue's visibility timeout above 90 seconds, so each job stays hidden until it's deleted.",
      "Move to an SQS FIFO queue, whose exactly-once processing stops a job from being received twice.",
      "Replace the queue with an SNS topic that each worker subscribes to, so every job is pushed once.",
      "Send jobs to an EventBridge event bus instead, with a rule that delivers each job to one worker."
    ], a: 0,
    no: [null,
      "FIFO deduplication stops duplicate sends. A message that isn't deleted before its visibility timeout ends is still received again.",
      "SNS fans out, so every subscribed worker would get every job. It's for pushing one message to many subscribers.",
      "EventBridge pushes events to targets such as Lambda or SQS. EC2 workers can't pull from a bus, so the jobs would still need a queue."],
    why: "The visibility timeout, 30 seconds by default, starts when a worker receives a message. A 90-second job outlasts it, so the message reappears and another worker takes it. Set the timeout above the job time.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html"] },

  // Message timer vs delay queue (twin of dva-1-103), flip: a standard queue, so the per-message timer is right
  { id: "dva-1-962", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc", variant: true, twin: ["dva-1-103"],
    q: "An app sends order messages to an SQS standard queue. Pre-orders must stay hidden from consumers for 10 minutes after they are sent, while every other order must be available at once. Which approach meets this requirement?",
    opts: [
      "Set the queue's delivery delay attribute to 10 minutes, so new messages are hidden on arrival.",
      "Pass DelaySeconds=600 on the SendMessage calls for pre-orders, and no delay for other orders.",
      "Set the queue's visibility timeout to 10 minutes, so that each pre-order is hidden after sending.",
      "Move to a FIFO queue, and pass DelaySeconds=600 with a separate MessageGroupId for pre-orders."
    ], a: 1,
    no: [
      "A delay queue hides every new message, so normal orders would wait 10 minutes too. It suits a delay that applies to all messages.",
      null,
      "The visibility timeout starts when a message is received, not when it's sent. It stops two consumers working on one message.",
      "FIFO queues don't support timers on individual messages. Their delay can only be set for the whole queue."],
    why: "A message timer, set with DelaySeconds on SendMessage, hides one message for up to 15 minutes and overrides the queue's delay. Standard queues support it, while FIFO queues allow only a queue-wide delay.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-timers.html",
      "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html"] },

  // DLQ redrive needs an SQS source (twin of dva-1-105), flip: the source is Lambda, so your own script is the answer
  { id: "dva-1-963", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc", variant: true, twin: ["dva-1-105"],
    q: "A Lambda function invoked asynchronously by an app has an SQS standard queue as its dead-letter queue. A bug sent 2,000 events there, and the fix is now deployed. The team wants those events run through the fixed function. Which approach works?",
    opts: [
      "Start a DLQ redrive with StartMessageMoveTask and no destination, so events return to their source.",
      "Run a script that reads each message, invokes the function asynchronously with its body, then deletes it.",
      "Start StartMessageMoveTask with the function's ARN as DestinationArn, so the function gets each event.",
      "Raise the function's maximum retry attempts for asynchronous invocation, so Lambda retries the events."
    ], a: 1,
    no: [
      "Redrive only accepts dead-letter queues whose sources are SQS queues. Here the source is Lambda, so there's no queue to return to.",
      null,
      "The redrive destination must be an SQS queue of the same type. Redrive moves messages between queues.",
      "Retry settings apply to new events. Events already in the dead-letter queue have left Lambda's retry process."],
    why: "DLQ redrive works only for dead-letter queues fed by other SQS queues. Events that Lambda discarded after asynchronous invocations have to be read from the queue and sent to the function again by your own code.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_StartMessageMoveTask.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html"] },

  // Circuit breaker vs retry with backoff (twin of dva-1-141), flip: brief errors, so retries are right
  { id: "dva-1-964", exam: "both", dva: "1.1", saa: "2.1", topic: "resilience", type: "mc", variant: true, twin: ["dva-1-141"],
    q: "An order service calls a partner's pricing API, which throttles bursts and returns occasional errors that clear within a second or two. The API itself is rarely down. Orders fail whenever one call fails. What should the developer do?",
    opts: [
      "Add a circuit breaker that fails all pricing calls at once for 15 minutes after any error is seen.",
      "Retry failed calls a few times with exponential backoff and jitter, then return an error to the caller.",
      "Raise the timeout on each pricing call, so that the slow and throttled responses have time to arrive.",
      "Cache the first pricing error for each order, so that later calls for that order fail without waiting."
    ], a: 1,
    no: [
      "A circuit breaker suits long outages. Opening it on brief errors turns calls that would succeed on a retry into failures.",
      null,
      "Throttled calls fail quickly with an error. A longer timeout only helps calls that are slow, and nothing retries them.",
      "It makes a brief error permanent for that order. Failing fast is for outages that last, not errors that clear in a second."],
    why: "Retry with backoff handles transient errors such as throttling: each retry waits longer, and jitter spreads retries out. A circuit breaker is for a service that is down, where retries only add load.",
    doc: ["https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/retry-backoff.html",
      "https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html"] },

  // Long work goes behind a queue (twin of dva-1-144)
  { id: "dva-1-965", exam: "both", dva: "1.1", saa: "2.1", topic: "architecture", type: "mc", variant: true, twin: ["dva-1-144"],
    q: "Users upload videos through an API, and each transcode takes about 20 minutes. The API must reply within a second with a job ID, no job may be lost if a worker crashes, and a crashed worker's job must be picked up by another. Which design meets these requirements?",
    opts: [
      "The API saves a job record and sends the job to an SQS queue, and workers poll it and update the record.",
      "The API invokes a Lambda function synchronously with a long timeout, and returns the finished video.",
      "The API publishes each job to an SNS topic, which pushes the job to every worker's HTTP endpoint.",
      "The API writes each job to a Kinesis data stream, and a Lambda function transcodes each record it reads."
    ], a: 0,
    no: [null,
      "The caller waits for the whole transcode, far over a second, and a Lambda function can run for at most 15 minutes.",
      "SNS fans out, so every worker would transcode every video. It's for sending one message to many subscribers.",
      "Lambda stops at 15 minutes, so each transcode would time out. Kinesis suits ordered streams that several apps read."],
    why: "Long work goes behind a queue: the API stores the job and replies at once, and the queue holds it durably. A message that a crashed worker never deleted becomes visible again for another worker, and the client checks the job record later.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/concepts-event-driven-architectures.html",
      "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html"] },

  // Kinesis starting positions (twin of dva-1-219), flip: everything in the stream, so TRIM_HORIZON
  { id: "dva-1-966", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc", variant: true, twin: ["dva-1-219"],
    q: "A Kinesis data stream keeps data for 7 days. A team adds a new Lambda function that builds a search index, and the index must include every record the stream still holds, as well as new ones. Which starting position should its event source mapping use?",
    opts: [
      "AT_TIMESTAMP, with the starting position timestamp set to the moment the mapping is created.",
      "TRIM_HORIZON, which starts with the oldest record that is still in each shard of the stream.",
      "LATEST, which starts with the records that arrive in the stream after the mapping is created.",
      "LATEST, with MaximumRecordAgeInSeconds set high, so that records already in the stream are read."
    ], a: 1,
    no: [
      "A timestamp of now reads only new records. AT_TIMESTAMP is for starting at a chosen point, such as when a bug began.",
      null,
      "It skips everything already in the stream. LATEST suits consumers that only care about new data.",
      "Maximum record age only discards records that are too old. It never moves the starting point back."],
    why: "TRIM_HORIZON starts at the oldest untrimmed record in each shard, so a new consumer reads everything the stream still keeps. LATEST reads only new records, and AT_TIMESTAMP starts at a chosen time.",
    doc: ["https://docs.aws.amazon.com/kinesis/latest/APIReference/API_GetShardIterator.html",
      "https://docs.aws.amazon.com/lambda/latest/api/API_CreateEventSourceMapping.html"] },

  // Parallel scan parameters (twin of dva-1-222)
  { id: "dva-1-967", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc", variant: true, twin: ["dva-1-222"],
    q: "Four workers run a parallel scan of a DynamoDB table with Segment values 0 to 3, but each worker works out TotalSegments on its own, and they end up with different values. Some items are processed twice and some are skipped. What should the developer do?",
    opts: [
      "Give every worker the same TotalSegments value of 4, and keep each worker's own Segment from 0 to 3.",
      "Give every worker the same Segment value of 0, and keep each worker's own TotalSegments value as is.",
      "Give each worker its own Limit value, so that the four workers read pages of different sizes at once.",
      "Pass each worker the LastEvaluatedKey of the worker before it, so that each one starts where it ended."
    ], a: 0,
    no: [null,
      "Workers with the same Segment overlap. Each worker needs a different Segment within one shared TotalSegments.",
      "Limit caps how many items one Scan page evaluates. It doesn't split the table between workers.",
      "LastEvaluatedKey is for paging through one scan. Chaining it makes each worker wait on the one before, so nothing runs in parallel."],
    why: "DynamoDB assigns items to segments by hashing each item's partition key for a given TotalSegments. Every worker must use the same TotalSegments and a different Segment, so the segments cover the table once with no overlap.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html"] },

  // Projection expressions trim the response, not the capacity (twin of dva-1-223), flip: response size is the goal
  { id: "dva-1-968", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc", variant: true, twin: ["dva-1-223"],
    q: "A Lambda function runs a Query on a DynamoDB table by CategoryId and needs only each item's Name and Price. The items are large, and the function spends time parsing data it never uses. Read cost is fine. Which change trims the returned data with the LEAST effort and no new storage?",
    opts: [
      "Add a ProjectionExpression for Name and Price to the Query, so only those attributes are returned.",
      "Add a global secondary index that projects only Name and Price, and point the Query at that index.",
      "Add a FilterExpression on Name and Price, so that DynamoDB drops the other attributes from items.",
      "Set Select to COUNT on the Query, so that DynamoDB returns a summary of the items that it matched."
    ], a: 0,
    no: [null,
      "It works and also cuts read capacity, but it adds an index to build, store and pay writes for. It's for when read cost matters.",
      "Filter expressions keep or drop whole items after they're read. They never remove attributes.",
      "COUNT returns only how many items matched, not their attributes. It's for counting results."],
    why: "A projection expression returns only the named attributes, which shrinks the response. It doesn't lower read capacity, which is still based on full item size, so an index is the tool only when read cost is the problem.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html"] },

  // TTL needs epoch seconds (twin of dva-1-235)
  { id: "dva-1-969", exam: "both", dva: "1.3", saa: "4.3", topic: "dynamodb", type: "mc", variant: true, twin: ["dva-1-235"],
    q: "A Node.js app writes sessions to a DynamoDB table with expiresAt set to Date.now() + 86400000, stored as a Number. TTL is enabled on expiresAt, but sessions from weeks ago are still in the table. What should the developer change so that TTL deletes them?",
    opts: [
      "Write expiresAt as Math.floor(Date.now() / 1000) + 86400, so that the value is in epoch seconds.",
      "Write expiresAt as new Date(Date.now() + 86400000).toISOString(), a date string that is readable.",
      "Turn on DynamoDB Streams for the table, so that the TTL process can find the items that expired.",
      "Rename the attribute to ttl, since the TTL process only looks for an attribute that has that name."
    ], a: 0,
    no: [null,
      "TTL ignores items whose TTL attribute isn't a Number, so string dates never expire.",
      "Streams only record TTL deletions after they happen. They aren't needed for TTL to work.",
      "The TTL attribute can have any name. It's whichever attribute you choose when you enable TTL."],
    why: "Date.now() returns milliseconds, and TTL reads the value as seconds, so these sessions look set to expire tens of thousands of years from now. Epoch seconds as a Number let TTL delete them, typically within a few days.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html"] },

  // 400 KB item limit (twin of dva-1-241), flip: the data doesn't compress, so only S3 works
  { id: "dva-1-970", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc", variant: true, twin: ["dva-1-241"],
    q: "An app stores each property listing in a DynamoDB item, with a gallery of JPEG photos in a Binary attribute. Galleries now reach 3 MB, and PutItem fails with a ValidationException. JPEG data barely shrinks with gzip. Which approach lets the app keep storing the galleries?",
    opts: [
      "Gzip the gallery before writing it, and store the compressed bytes in the same Binary attribute.",
      "Upload each gallery to S3, and store the S3 object key in the item in place of the photo data.",
      "Split the gallery across several Binary attributes in the item, each kept under 400 KB in size.",
      "Write the listings with BatchWriteItem, which takes larger items than a single PutItem call does."
    ], a: 1,
    no: [
      "Compression helps data such as JSON text. Already-compressed JPEGs would stay far over the 400 KB item limit.",
      null,
      "The limit applies to the whole item, counting all of its attributes, so splitting within one item doesn't help.",
      "Batch writes have the same 400 KB item limit. BatchWriteItem saves round trips, not size."],
    why: "A DynamoDB item can't exceed 400 KB, counting all of its attributes. Compression works only when data shrinks enough; otherwise keep the data in S3 and store its object key in the item.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-use-s3-too.html"] },

// DAX caches DynamoDB reads with no cache code (twin of dva-1-242), flip: DAX is now the answer, not ElastiCache
  { id: "dva-1-971", exam: "both", dva: "1.3", saa: "3.3", topic: "caching", type: "mc", variant: true, twin: ["dva-1-242"],
    q: "A game's profile service reads the same few thousand player items from DynamoDB with GetItem, millions of times an hour. Reads take a few milliseconds and must drop to microseconds. Slightly stale data is fine, and the team won't write any caching logic of its own. What should the developer do?",
    opts: [
      "Add a DAX cluster, swap the DynamoDB client for the DAX client, and keep the GetItem calls eventually consistent.",
      "Add ElastiCache for Valkey, and have the code check it first, then load each missing item into it with a TTL.",
      "Add a DAX cluster, and set ConsistentRead to true on each GetItem so the items that DAX caches are never stale.",
      "Switch the table to on-demand capacity mode, so that its read throughput scales as the GetItem traffic grows."
    ], a: 0,
    no: [null,
      "This is the cache-aside logic the team won't write. ElastiCache suits values the app builds itself.",
      "DAX passes strongly consistent reads straight to DynamoDB and doesn't cache them, so nothing gets faster.",
      "On-demand mode handles changing traffic, but each read still takes milliseconds from the table."],
    why: "DAX is API-compatible with DynamoDB, so the app keeps its GetItem calls and DAX caches the eventually consistent responses in microseconds. ElastiCache needs the app to manage the cache, which is worth it only for results DynamoDB never returns as such.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html",
      "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.consistency.html"] },

  // Retrier MaxDelaySeconds caps backoff (twin of dva-1-310), jitter alone doesn't cap waits
  { id: "dva-1-972", exam: "DVA", dva: "1.1", topic: "stepfunctions", type: "mc", variant: true, twin: ["dva-1-310"],
    q: "A Task state's retrier uses IntervalSeconds 1, BackoffRate 2 and MaxAttempts 10 for a throttled API. By the last attempts, executions wait over 4 minutes between tries. No wait may exceed 20 seconds, and all 10 attempts must still happen. What should the developer change?",
    opts: [
      "Add MaxDelaySeconds set to 20 to the retrier, so the waits stop growing once they reach 20 seconds.",
      "Add JitterStrategy set to FULL to the retrier, so each wait becomes a random time below the computed one.",
      "Set TimeoutSeconds to 20 on the Task state, so no single wait between its retry attempts can last longer.",
      "Lower MaxAttempts to 5 in the retrier, so the backoff ends before the waits grow beyond 20 seconds."
    ], a: 0,
    no: [null,
      "Jitter spreads out retries from many executions, but a wait can still reach the full computed interval.",
      "TimeoutSeconds limits how long one attempt of the task may run. It doesn't change the wait between attempts.",
      "The waits would stay short, but the requirement is to keep all 10 attempts."],
    why: "BackoffRate doubles each wait, so late retries wait minutes. MaxDelaySeconds sets the maximum a retry interval can grow to, while the number of attempts stays the same. Jitter randomizes waits but doesn't cap them.",
    doc: ["https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html"] },

  // New shard iterator from a saved sequence number (twin of dva-1-318), flip: AT, not AFTER, the sequence number
  { id: "dva-1-973", exam: "DVA", dva: "1.1", topic: "kinesis", type: "mc", variant: true, twin: ["dva-1-318"],
    q: "A custom consumer reads one Kinesis shard with GetRecords. Before it starts on each record, it saves that record's sequence number. It crashed partway through a record and restarted 20 minutes later. It must begin with that unfinished record and miss nothing after it. What should it do?",
    opts: [
      "Call GetShardIterator with AT_SEQUENCE_NUMBER and the saved sequence number, then call GetRecords.",
      "Call GetShardIterator with AFTER_SEQUENCE_NUMBER and the saved sequence number, then call GetRecords.",
      "Call GetRecords with the NextShardIterator that it saved before the crash, to continue where it stopped.",
      "Call GetShardIterator with AT_TIMESTAMP set to the time of the crash, then call GetRecords from there."
    ], a: 0,
    no: [null,
      "AFTER starts right after the saved record, so the unfinished record would be skipped. It suits a record already done.",
      "A shard iterator expires 5 minutes after it is returned, so a 20-minute-old one fails.",
      "The unfinished record and any that followed it before the crash arrived earlier, so they'd be skipped."],
    why: "Shard iterators expire after 5 minutes, so a restarted consumer needs a new one. AT_SEQUENCE_NUMBER starts at the saved record itself, and AFTER_SEQUENCE_NUMBER starts just past it, so pick by whether that record was finished.",
    doc: ["https://docs.aws.amazon.com/kinesis/latest/APIReference/API_GetShardIterator.html"] },

  // Paging ends only when LastEvaluatedKey is absent (twin of dva-1-324)
  { id: "dva-1-974", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc", variant: true, twin: ["dva-1-324"],
    q: "A search page pages through a DynamoDB Query with Limit set to 25 and a FilterExpression. The code stops asking for pages once a response holds fewer than 25 items, and users say some matching items never appear. When should the code stop asking for more pages?",
    opts: [
      "When a response has no LastEvaluatedKey, passing each one as the next ExclusiveStartKey until then.",
      "When a response's Count is 0, since an empty page means that no matching items are left to read at all.",
      "When a response's Count is below its ScannedCount, which shows the filter has removed the rest.",
      "Never: run one Scan with the same filter instead, since a Scan reads the whole table in one call."
    ], a: 0,
    no: [null,
      "Limit counts items read before the filter, so a page can hold no matches while later pages do.",
      "That only shows the filter dropped some items on this page. ScannedCount is items read, Count is items kept.",
      "A Scan also stops at 1 MB or the Limit, so it pages too, and it reads every item in the table."],
    why: "Query applies Limit and the 1 MB page cap to the items it reads before the filter, so a short or empty page says nothing about what remains. Only a response without LastEvaluatedKey marks the end.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html",
      "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html"] },

  // IAM DB auth token is checked only at connect (twin of dva-1-328), flip: open connections are fine as they are
  { id: "dva-1-975", exam: "DVA", dva: "1.3", topic: "rds", type: "mc", variant: true, twin: ["dva-1-328"],
    q: "A service opens a pool of long-lived connections to RDS for MySQL at startup, each using an IAM authentication token, and opens extra connections under load. A reviewer says every connection will drop when its token expires after 15 minutes. What is true?",
    opts: [
      "Open connections stay up, since the token is only checked at login, but each new connection needs a fresh token.",
      "Each connection drops when its token expires, so the pool must close and reopen every connection every 14 minutes.",
      "The token stays valid as long as the instance role's credentials do, so every connection can reuse it for hours.",
      "Store the startup token in Secrets Manager with rotation turned on, so each new connection reads a valid token."
    ], a: 0,
    no: [null,
      "The token isn't rechecked during a session, so reopening the pool only adds churn.",
      "Every token has its own 15-minute lifetime, whatever credentials signed it.",
      "Secrets Manager rotates stored credentials. A token is generated in code on demand, so there's nothing to store."],
    why: "An IAM authentication token lasts 15 minutes and is only used to log in, so an established session isn't affected when it expires. A connection opened later needs a token generated just before it.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html",
      "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.html"] },

  // Long polling cuts empty receives (twin of dva-1-911)
  { id: "dva-1-976", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc", variant: true, twin: ["dva-1-911"],
    q: "A worker calls ReceiveMessage in a tight loop on an SQS standard queue with default settings. Messages arrive only a few times an hour, so nearly every call comes back empty, and those calls make up most of the queue's bill. What should the developer do?",
    opts: [
      "Set the queue's ReceiveMessageWaitTimeSeconds to 20, so each call waits for a message before it returns.",
      "Move the messages to a Kinesis data stream, whose GetRecords calls wait until a new record arrives.",
      "Set the queue's DelaySeconds to 15 minutes, so that messages are grouped before the worker reads them.",
      "Set MaxNumberOfMessages to 10 on each call, so that every single call can return up to 10 messages at once."
    ], a: 0,
    no: [null,
      "GetRecords returns an empty result at once when no records are there. Kinesis suits ordered, replayable streams.",
      "A delay hides each new message for that long. It doesn't batch messages or stop empty calls.",
      "This helps when messages are waiting, but calls on an empty queue still return nothing."],
    why: "Short polling, the default, answers at once even when no messages are found. Long polling waits up to 20 seconds for a message, which cuts empty and false empty responses and the cost of those calls.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html",
      "https://docs.aws.amazon.com/kinesis/latest/APIReference/API_GetRecords.html"] },

  // Presigned URL is tied to its HTTP method (twin of dva-1-917), flip: a download, so GET is right and PUT is wrong
  { id: "dva-1-977", exam: "DVA", dva: "1.1", topic: "s3", type: "mc", variant: true, twin: ["dva-1-917"],
    q: "Invoices are stored in a private S3 bucket. A signed-in user of a web app must be able to download their own invoice PDF straight from S3 for the next hour. The browser holds no AWS credentials, and the bucket must stay private. What should the backend do?",
    opts: [
      "Generate a presigned GET URL for that invoice's object key with a one-hour expiry, and return it to the browser.",
      "Generate a presigned PUT URL for that invoice's object key with a one-hour expiry, and return it to the browser.",
      "Add a bucket policy that allows s3:GetObject for any principal on the invoices/ prefix, and return the object URL.",
      "Turn on S3 Transfer Acceleration for the bucket, and return the accelerate endpoint URL for the invoice object."
    ], a: 0,
    no: [null,
      "The HTTP method is part of what is signed, so a PUT URL can't be used to download. PUT URLs are for uploads.",
      "That makes every invoice readable by anyone on the internet, and the bucket would no longer be private.",
      "Transfer Acceleration speeds up long-distance transfers. A request to it still needs permission to read."],
    why: "A presigned URL grants time-limited access to one object for the method it was signed with, using the signer's permissions. A GET URL lets the browser download the invoice without credentials or a bucket policy change.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html",
      "https://docs.aws.amazon.com/AmazonS3/latest/userguide/ShareObjectPreSignedURL.html"] },

  // FIFO dedup needs the same ID on retries (twin of dva-1-05), flip: the body changes, so content-based dedup fails
  { id: "dva-1-978", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc", variant: true, twin: ["dva-1-05"],
    q: "A producer sends payments to an SQS FIFO queue with content-based deduplication turned on. Each message body includes a sentAt timestamp that is set on every attempt. When a SendMessage call is retried after a timeout, the payment sometimes appears twice. What should the developer do?",
    opts: [
      "Set MessageDeduplicationId to the payment ID, and send that same value again on every retry of the call.",
      "Keep content-based deduplication on, and raise the queue's visibility timeout to 15 minutes for consumers.",
      "Set MessageGroupId to the payment ID, so that all the copies of one payment land in the same message group.",
      "Send the payments to a Kinesis data stream with the payment ID as each record's partition key instead."
    ], a: 0,
    no: [null,
      "The body hash differs whenever sentAt changes. The visibility timeout stops a received message going to two consumers.",
      "A message group keeps its messages in order. Copies in one group are still delivered as separate messages.",
      "Kinesis doesn't drop repeated records, and producer retries are a known source of duplicates there."],
    why: "Content-based deduplication hashes the message body, so a retry whose body changed gets a new ID and is accepted. A deduplication ID from the payment itself stays the same on each retry, and SQS drops repeats within 5 minutes.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html",
      "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html"] },

  // Queue vs stream for consumers (twin of dva-1-06), flip: workers share the work, so a queue beats a stream
  { id: "dva-1-979", exam: "both", dva: "1.1", saa: "3.5", topic: "kinesis", type: "mc", variant: true, twin: ["dva-1-06"],
    q: "Twenty identical EC2 workers render thumbnails. Each upload should be rendered once, by whichever worker is free, and a slow job mustn't hold up others. Order doesn't matter, and nothing needs replaying later. Which approach meets these requirements?",
    opts: [
      "Send each job to an SQS standard queue, and have each worker poll it and delete the jobs it finishes.",
      "Write each job to a Kinesis data stream, and run each worker as its own consumer application of it.",
      "Publish each job to an SNS standard topic, and subscribe every worker's HTTPS endpoint to the topic.",
      "Put each job on an EventBridge event bus, and add a rule that lists the workers as its targets."
    ], a: 0,
    no: [null,
      "Every consumer application reads every record, so each job would be rendered 20 times. Streams suit replay and ordered reads.",
      "SNS pushes a copy of every message to every subscriber, so each worker would render every job.",
      "A rule sends each matching event to every one of its targets, so the job would be done more than once."],
    why: "A queue hands each message to one consumer and hides it from others while it's processed, so workers split the work. Streams, topics and event rules give every consumer its own copy.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html",
      "https://docs.aws.amazon.com/streams/latest/dev/key-concepts.html"] },

  // Jitter breaks up synchronized retries (twin of dva-1-14)
  { id: "dva-1-980", exam: "DVA", dva: "1.1", topic: "resilience", type: "mc", variant: true, twin: ["dva-1-14"],
    q: "Hundreds of Lambda functions call an inventory API, each with its own retry code that waits 1, 2, 4 and then 8 seconds. After a short API outage, the retries arrive in synchronized waves that knock the API over again. What should the developer add?",
    opts: [
      "Random jitter, so each function waits a random time between zero and its current backoff delay.",
      "A larger base delay of 2 seconds, so that the waves of retries are spread further apart in time.",
      "A fixed wait of 5 seconds before every retry, so that the retry timing is the same for each call.",
      "Provisioned concurrency for each function, so the retries run without any cold-start delays."
    ], a: 0,
    no: [null,
      "Every function still waits the same amounts, so the waves stay synchronized, just further apart.",
      "Identical fixed waits bring every function back at the same moment, which is the problem.",
      "Provisioned concurrency cuts cold starts for latency-sensitive functions. It doesn't change retry timing."],
    why: "Clients that fail together and back off by the same schedule retry together. Jitter randomizes each wait across the backoff window, so the API sees a steady trickle instead of spikes.",
    doc: ["https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html"] },

  // Timing a job per item (twin of dva-1-15), flip: within 15 minutes, so the SQS delay is the answer
  { id: "dva-1-981", exam: "DVA", dva: "1.1", topic: "eventbridge", type: "mc", variant: true, twin: ["dva-1-15"],
    q: "When a shopper abandons a cart, a Lambda function must check that cart about 10 minutes later. Thousands of carts are abandoned each hour, each on its own clock. The team wants no servers. What should the developer do?",
    opts: [
      "Send an SQS message with DelaySeconds set to 600 for each cart, and have the function consume the queue.",
      "Create an EventBridge Scheduler rate schedule of 10 minutes, and have it invoke the function each time.",
      "Publish each cart to an SNS topic whose delivery retry policy waits 10 minutes before delivering it.",
      "Create a CloudWatch alarm with a 10-minute period on the cart metric, and have it invoke the function."
    ], a: 0,
    no: [null,
      "A recurring schedule runs on one shared clock, so a cart could be checked anywhere from 0 to 10 minutes later.",
      "A delivery retry policy only spaces out retries after a failed delivery. The first delivery happens at once.",
      "An alarm acts when a metric crosses a threshold, not once for each cart at its own time."],
    why: "An SQS message timer hides one message for up to 15 minutes, so each cart's message becomes visible 10 minutes after it was sent. Longer or recurring times are a job for EventBridge Scheduler.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-timers.html",
      "https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html"] },

// Counting arrivals on a queue fed by SendMessage (twin of dva-4-674), flip: NumberOfMessagesSent is right when messages are sent directly
  { id: "dva-4-960", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc", variant: true, twin: ["dva-4-674"],
    q: "An order service catches payments that fail validation and calls SendMessage to put each one on a failed-payments queue. A cleanup job drains that queue every few seconds. The team wants an alarm when more than 20 failed payments arrive in 5 minutes. Which alarm should the developer use?",
    opts: [
      "An alarm on the queue's NumberOfMessagesSent metric, using the Sum statistic over 5 minutes, above 20.",
      "An alarm on the queue's ApproximateNumberOfMessagesVisible metric, firing when it is above 20.",
      "An alarm on the queue's ApproximateAgeOfOldestMessage metric, firing when it is above 300 seconds.",
      "An alarm on the queue's NumberOfEmptyReceives metric, firing when it drops below its usual level."
    ], a: 0,
    no: [null,
      "Visible messages are a snapshot of what's waiting, and the fast cleanup keeps it near zero. It's the metric for a redrive DLQ.",
      "The cleanup drains the queue in seconds, so no message waits long. Age shows a stalled consumer, not how many arrived.",
      "Empty receives count polls that found nothing. They track consumer polling, not how many failed payments came in."],
    why: "NumberOfMessagesSent counts every message added with SendMessage or SendMessageBatch, including direct sends to a DLQ, so its Sum per period counts arrivals. Only messages moved there by a redrive policy are left out. The visible count is a snapshot that a fast drain keeps near zero.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html"] },

  // Alarm on wait time, not backlog size (twin of dva-4-676)
  { id: "dva-4-961", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc", variant: true, twin: ["dva-4-676"],
    q: "A Lambda function handles refund requests from an SQS queue through an event source mapping. Each request must be handled within 10 minutes of arriving. Traffic swings from 10 to 5,000 messages an hour, so the backlog's size doesn't show whether anyone is late. Which alarm best catches a missed 10-minute goal?",
    opts: [
      "An alarm on the function's Errors metric, firing when it rises above zero in any 10-minute period.",
      "An alarm on the queue's ApproximateNumberOfMessagesVisible, firing when it is above 1,000.",
      "An alarm on the queue's ApproximateAgeOfOldestMessage, firing when it is above 600 seconds.",
      "An alarm on the GetRecords.IteratorAgeMilliseconds metric, firing when it is above 600,000 ms."
    ], a: 2,
    no: [
      "Errors counts failed runs. A stalled or throttled consumer can fall behind without a single error.",
      "A big backlog at peak may still be on time, and a small one at night may be late. A count isn't a wait time.",
      null,
      "Iterator age is the Kinesis Data Streams metric for how far a reader lags. An SQS queue doesn't publish it."],
    why: "ApproximateAgeOfOldestMessage is how long the oldest unprocessed message has waited, so it measures the goal itself, whatever the traffic. An alarm at 600 seconds fires as soon as any request has waited 10 minutes.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html",
      "https://docs.aws.amazon.com/streams/latest/dev/monitoring-with-cloudwatch.html"] },

  // Event history for a recent event in one account (twin of dva-4-802), flip: the simple built-in tool wins
  { id: "dva-4-962", exam: "DVA", dva: "4.1", topic: "cloudtrail", type: "mc", variant: true, twin: ["dva-4-802"],
    q: "A developer must find out who deleted a DynamoDB table in us-east-1 yesterday. The account has never had a CloudTrail trail or a CloudTrail Lake event data store. Which approach needs the LEAST effort?",
    opts: [
      "Create a CloudTrail Lake event data store, then query it with SQL for the DeleteTable event.",
      "Search the CloudTrail event history in us-east-1, with a filter on the DeleteTable event name.",
      "Run a CloudWatch Logs Insights query for DeleteTable on the account's CloudTrail log group.",
      "Create an Athena table over the account's CloudTrail log files in S3, then query it for DeleteTable."
    ], a: 1,
    no: [
      "Lake suits SQL over years of events or many accounts, but a store must be set up and paid for first.",
      null,
      "With no trail sending events to CloudWatch Logs, there's no log group to query. That needs a trail set up beforehand.",
      "With no trail, no log files were ever delivered to S3. Athena suits long-term queries over a trail's logs."],
    why: "CloudTrail event history is on by default and keeps the past 90 days of management events in each Region, at no charge. DeleteTable is a management event, so yesterday's deletion is already there to search by event name.",
    doc: ["https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html",
      "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-lake.html"] },

  // Timeouts from slow work in the function (twin of dva-4-102), flip: memory is the fix
  { id: "dva-4-963", exam: "DVA", dva: "4.1", topic: "lambda", type: "mc", variant: true, twin: ["dva-4-102"],
    q: "A Lambda function resizes images and must answer within 3 seconds, its timeout. It has 128 MB of memory and makes no network calls. Many runs end with Task timed out after 3.00 seconds. REPORT lines show about 90 MB used and no init duration on most runs, and Throttles is zero. What should the developer do?",
    opts: [
      "Raise the function's memory setting, which also gives it more CPU, so each resize finishes sooner.",
      "Raise the function's timeout to 10 seconds, so that each resize has more time to finish its work.",
      "Configure provisioned concurrency on an alias, so that requests skip the cold start before each resize.",
      "Raise the function's reserved concurrency, so that more of the resizes can run at the same time."
    ], a: 0,
    no: [null,
      "The caller needs an answer within 3 seconds, so a longer timeout only moves the failure. It suits a slow but acceptable downstream call.",
      "Most runs show no init duration, so cold starts aren't the delay. Provisioned concurrency cuts startup latency.",
      "Throttles is zero, so runs aren't waiting for concurrency. Running more at once doesn't make each one faster."],
    why: "Lambda gives a function CPU in proportion to its memory, so CPU-heavy work at 128 MB runs slowly even when memory use looks fine. More memory makes each resize faster and keeps it inside the 3-second limit. A longer timeout fits a slow downstream call, not slow work in the function.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html"] },

  // 504 from the connection timeout, not the idle timeout (twin of dva-4-103), flip: raising the idle timeout is the trap
  { id: "dva-4-964", exam: "DVA", dva: "4.1", topic: "elb", type: "mc", variant: true, twin: ["dva-4-103"],
    q: "An ALB's target group sends traffic to port 8443 on its instances, and health checks use port 80. All targets are healthy, yet every request fails with HTTP 504 about 10 seconds after it arrives, and the app's logs show no requests at all. The load balancer uses default settings. What should the developer do?",
    opts: [
      "Raise the load balancer's connection idle timeout to 120 seconds, so slow responses arrive in time.",
      "Allow port 8443 from the load balancer's security group in the security group of the instances.",
      "Raise the target group's health check timeout and interval, so targets stay in service for longer.",
      "Raise the target group's deregistration delay, so that the load balancer waits longer for targets."
    ], a: 1,
    no: [
      "The idle timeout (60 seconds by default) covers a target that's slow to answer. Here the connection never opens.",
      null,
      "The targets are already healthy. Health check settings decide when a target is taken out, not whether traffic reaches it.",
      "Deregistration delay only applies while a target is being removed. It doesn't help a new connection open."],
    why: "A 504 after about 10 seconds, with nothing in the app's logs, means the load balancer couldn't open a connection before its 10-second connection timeout. Health checks on port 80 pass, so the instances' security group most likely allows only that port from the load balancer.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html"] },

  // High-resolution alarms need a high-resolution custom metric (twin of dva-4-115)
  { id: "dva-4-965", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc", variant: true, twin: ["dva-4-115"],
    q: "A game server on EC2 must page the team within 30 seconds when its CPU stays above 90%. Detailed monitoring is on, but the alarm on the instance's CPUUtilization metric fires only after a minute or more. What should the developer do?",
    opts: [
      "Have the CloudWatch agent collect CPU every 10 seconds, then alarm on it with a 10-second period.",
      "Keep the alarm on CPUUtilization with a 60-second period, and set it to 1 out of 1 datapoints.",
      "Add a target tracking scaling policy at 90% CPU, which pages the team as soon as it scales out.",
      "Publish CPU with PutMetricData every 10 seconds, leaving its StorageResolution at the default."
    ], a: 0,
    no: [null,
      "With a 60-second period, a breach still needs a minute of data. Detailed monitoring sends CPU in 1-minute periods.",
      "Target tracking adds or removes instances to hold a metric near a target. It scales; it doesn't page anyone.",
      "The default StorageResolution is 60, so CloudWatch stores it at 1-minute resolution however often it's sent."],
    why: "Only high-resolution metrics support alarms with a 10- or 30-second period, and high resolution is available only for custom metrics. The CloudWatch agent collects a metric as high resolution when its collection interval is below 60 seconds.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html",
      "https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricDatum.html"] },

  // X-Ray group on an annotation for an alarm (twin of dva-4-118)
  { id: "dva-4-966", exam: "DVA", dva: "4.2", topic: "xray", type: "mc", variant: true, twin: ["dva-4-118"],
    q: "A checkout service already records an X-Ray annotation, tier, set to \"premium\" or \"basic\". The team wants a CloudWatch alarm when more than 20 premium checkout traces end in a fault within 5 minutes, without changing or deploying any code. What should the developer do?",
    opts: [
      "Create a sampling rule for checkout with a 100% fixed rate, then alarm on its sampled request count.",
      "Create an X-Ray group filtered on annotation[tier] = \"premium\" AND fault, then alarm on its metric.",
      "Create a CloudWatch alarm directly on the tier annotation, firing when premium faults pass 20.",
      "Publish premium faults from the service with PutMetricData, then alarm when the count passes 20."
    ], a: 1,
    no: [
      "Sampling decides which requests get traced. Its counts include every sampled request, not only premium faults.",
      null,
      "Annotations index traces so they can be searched. They aren't CloudWatch metrics, so there's nothing to alarm on.",
      "That works, but it means changing and redeploying the service, which the team ruled out."],
    why: "An X-Ray group is defined by a filter expression, which can combine an annotation's value with keywords such as fault. X-Ray publishes the count of matching traces to CloudWatch every minute, so an alarm can watch premium faults with no code change.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-console-groups.html",
      "https://docs.aws.amazon.com/xray/latest/devguide/xray-console-filters.html"] },

  // Synthetic tests when there's no traffic (twin of dva-4-125)
  { id: "dva-4-967", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc", variant: true, twin: ["dva-4-125"],
    q: "A public REST API gets almost no traffic overnight, and twice a broken deploy went unnoticed until morning. The team wants a write call and a read call made against the API every 5 minutes, all night, with an alarm on failure, for the LEAST development effort. What should the developer do?",
    opts: [
      "Add the CloudWatch RUM web client to the app, and alarm on the JavaScript errors that it reports.",
      "Create a CloudWatch Synthetics canary from the API canary blueprint on a schedule, with an alarm.",
      "Alarm on the API stage's 5XXError metric in CloudWatch, firing whenever it rises above zero at night.",
      "Turn on X-Ray tracing for the API stage, then alarm on the faults that the trace map shows for it."
    ], a: 1,
    no: [
      "RUM collects data from real users' sessions. With no users overnight, it has nothing to report.",
      null,
      "That metric only counts real requests. With no overnight traffic, a broken API would still show zero.",
      "Tracing records real requests as they happen, so with no overnight traffic it sees no faults."],
    why: "A Synthetics canary is a script that runs on a schedule, as often as once per minute, so it tests the API even when nobody is using it. The API canary blueprint tests a REST API's read and write functions, and its metrics can drive an alarm.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html",
      "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries_Blueprints.html"] },

  // Concurrency math, then find the real cap (twin of dva-4-204), flip: the quota is fine and reserved concurrency is the fix
  { id: "dva-4-968", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc", variant: true, twin: ["dva-4-204"],
    q: "A Lambda function averages 200 ms per request and peaks at 2,000 requests per second. The Regional concurrency quota is 1,000, and other functions use about 100 at peak. The function has reserved concurrency of 250, and it throttles at every peak. What should the developer do?",
    opts: [
      "Request a higher Lambda concurrent executions quota in Service Quotas before the next peak.",
      "Raise the function's reserved concurrency to about 500, since the peak needs about 400.",
      "Add provisioned concurrency of 250 on an alias, on top of the function's reserved 250.",
      "Raise the function's timeout, so that requests at the peak wait instead of being throttled."
    ], a: 1,
    no: [
      "The peak needs about 400 at once, well within 1,000. The function's own reserved concurrency of 250 caps it.",
      null,
      "Provisioned concurrency pre-starts environments to cut cold starts. The reserved 250 still caps the function.",
      "The timeout caps how long a run may take. A throttled request is turned away before it starts running."],
    why: "Concurrency is requests per second times average duration: 2,000 x 0.2 s = 400. Reserved concurrency is both the floor and the ceiling for one function, so at 250 it throttles even though the account has room to spare.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html"] },

  // Enhanced fan-out is for reads, not writes (twin of dva-4-211), flip: adding shards is the fix
  { id: "dva-4-969", exam: "DVA", dva: "4.3", topic: "kinesis", type: "mc", variant: true, twin: ["dva-4-211"],
    q: "Producers write to a Kinesis data stream with 4 shards. At peak, PutRecords calls get ProvisionedThroughputExceededException and WriteProvisionedThroughputExceeded rises. Partition keys are spread evenly, and the two consumers read without any throttling. What should the developer do?",
    opts: [
      "Register both consumers for enhanced fan-out, so each one gets its own throughput per shard.",
      "Raise the shard count with UpdateShardCount, since each shard accepts a fixed rate of writes.",
      "Send the records to an SNS topic instead, and subscribe each consumer's SQS queue to it.",
      "Raise the stream's retention period, so records can wait longer before they're written."
    ], a: 1,
    no: [
      "Enhanced fan-out adds read throughput for each consumer. The throttling here is on writes, which it doesn't change.",
      null,
      "SNS fans out messages to subscribers, but it keeps no ordered, replayable stream for consumers to read at their own pace.",
      "Retention sets how long written records stay readable. It doesn't change how fast a shard accepts writes."],
    why: "Each shard accepts up to 1 MB or 1,000 records per second of writes. With keys already spread evenly, more shards is the way to take more writes. Enhanced fan-out only raises read throughput, and only for consumers.",
    doc: ["https://docs.aws.amazon.com/streams/latest/dev/service-sizes-and-limits.html",
      "https://docs.aws.amazon.com/streams/latest/dev/enhanced-consumers.html"] },

  // Who may invalidate the cache, and what others get (twin of dva-4-214), flip: unauthorized callers must fail, not be ignored
  { id: "dva-4-970", exam: "DVA", dva: "4.3", topic: "apigateway", type: "multi", hint: "Select TWO.", variant: true, twin: ["dva-4-214"],
    q: "A REST API has caching turned on. A pricing partner that signs requests with an IAM role must be able to refresh cached entries with Cache-Control: max-age=0. Any other client that sends that header must get an error, so its team notices and stops. What should the developer do? (Select TWO.)",
    items: [
      { t: "Require authorization for cache invalidation, and set unauthorized requests to fail with a 403 status code.", ok: true },
      { t: "Allow execute-api:InvalidateCache on the API's resources in the pricing partner's IAM role policy.", ok: true },
      { t: "Require authorization for cache invalidation, and set unauthorized requests to ignore the Cache-Control header.", ok: false,
        no: "Other clients would then be served from the cache with no error, so nobody would notice." },
      { t: "Allow execute-api:Invoke on the API's resources in the partner's IAM role policy, which covers the cache too.", ok: false,
        no: "Invoke lets a caller call the API. Refreshing a cache entry needs execute-api:InvalidateCache." },
      { t: "Turn off caching for the method the partner calls, so that every request goes straight to the backend.", ok: false,
        no: "Every call to that method then hits the backend, and no client that sends the header gets an error." }
    ],
    why: "Requiring authorization limits cache invalidation to callers allowed execute-api:InvalidateCache. For everyone else, the unauthorized request handling setting decides what happens: fail with 403, or ignore the header with or without a warning. Only failing gives an error.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html"] },

// Shared limit vs per-client limit (twin of dva-4-222), flip: one limit for every caller, so stage/method throttling is right
  { id: "dva-4-971", exam: "DVA", dva: "4.3", topic: "apigateway", type: "mc", variant: true, twin: ["dva-4-222"],
    q: "A public REST API has no API keys. Its GET /reports method calls a legacy reporting server that fails above 20 requests per second in total, from all callers together. The API's other methods must keep their current limits. What should the developer do?",
    opts: [
      "Create a usage plan with a 20 requests per second throttle, require API keys on GET /reports, and give each caller a key.",
      "Ask AWS Support to lower the account's Regional throttle to 20 requests per second, so no API can send the server more.",
      "Set a method-level throttle of 20 requests per second for GET /reports in the stage, leaving other methods as they are.",
      "Attach a resource policy to the API that allows at most 20 requests per second to the GET /reports method from anyone."
    ], a: 2,
    no: [
      "Usage plan limits apply per API key, so many callers with 20 each could still send the server far more in total.",
      "Account limits cover every API in the Region, so all the other methods would be held to 20 as well.",
      null,
      "Resource policies allow or deny callers by identity, IP or VPC. They don't set request rates."],
    why: "Stage and method throttling limits are shared by every caller of that method, which is what protects a fragile backend. Usage plans with API keys are for giving each client its own limit, which this API doesn't need.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html"] },

  // What runs at init vs in the handler (twin of dva-4-225), flip: move setup INTO init instead of deferring it
  { id: "dva-4-972", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc", variant: true, twin: ["dva-4-225"],
    q: "A Python Lambda function serves every request with the same boto3 DynamoDB client and the same 30 MB lookup file from S3. Its cold starts are short, but every warm invocation still takes about 700 ms, because the handler creates the client and downloads the file each time. What should the developer do?",
    opts: [
      "Turn on SnapStart for the function's published versions, so each environment resumes from a cached snapshot.",
      "Create the client and load the file in code outside the handler, so warm invocations reuse both of them.",
      "Configure provisioned concurrency on an alias, so that initialized environments are waiting for requests.",
      "Move the lookup file into a Lambda layer, so that it is already unpacked for the handler on each request."
    ], a: 1,
    no: [
      "SnapStart speeds up initialization. The slow work here runs in the handler on every warm invocation.",
      null,
      "Provisioned concurrency removes cold starts, but each request would still rebuild the client and fetch the file.",
      "A layer could ship the file, but the handler would still create a new client on every request."],
    why: "Objects created outside the handler stay initialized while the environment is reused. Work every request needs belongs there, once per environment. Lazy loading is for objects only a rare request uses.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html"] },

  // Logs become alarms through metrics (twin of dva-4-310)
  { id: "dva-4-973", exam: "DVA", dva: "4.2", topic: "observability", type: "mc", variant: true, twin: ["dva-4-310"],
    q: "A payments Lambda function already writes a JSON log line to CloudWatch Logs for each payment, with status set to \"DECLINED\" when a card is declined. The team must be paged within minutes when more than 25 payments are declined in 5 minutes, without changing the code. What should the developer do?",
    opts: [
      "Add a subscription filter that streams the log group to Data Firehose, which delivers the log lines to an S3 bucket.",
      "Turn on CloudTrail Insights for the account, so that it flags unusual spikes in the function's declined payments.",
      "Create an EventBridge rule that matches log lines with a DECLINED status and sends each one to an SNS topic.",
      "Create a metric filter on the log group that counts DECLINED lines, and set a CloudWatch alarm on that metric."
    ], a: 3,
    no: [
      "That archives the logs for later analysis, but nothing counts declines or pages anyone.",
      "CloudTrail Insights watches for unusual AWS API call activity, not the contents of an app's own logs.",
      "EventBridge receives events from services and apps, not each line written to a log group, and it can't count over 5 minutes.",
      null],
    why: "A metric filter turns matching log events into a CloudWatch metric as they arrive, and an alarm on that metric can notify when a threshold is crossed. The logs stay the detailed record, and the metric drives the alert.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html"] },

  // Minimum TTL overrides a small max-age (twin of dva-4-319), flip: raise the minimum TTL instead of lowering it
  { id: "dva-4-974", exam: "both", dva: "4.3", saa: "4.4", topic: "cloudfront", type: "mc", variant: true, twin: ["dva-4-319"],
    q: "A CloudFront behavior for /images/* uses a cache policy with a minimum TTL of 0, a default TTL of 86400 and a maximum TTL of one year. The origin, which the team can't change, sends Cache-Control: max-age=5 on images, so CloudFront keeps requesting them. Images should stay in CloudFront for at least a day. What should the developer do?",
    opts: [
      "Raise the policy's default TTL to one week, so CloudFront keeps every image well beyond the origin's five seconds.",
      "Raise the policy's minimum TTL to 86400 seconds, so CloudFront keeps each image a day despite the max-age of 5.",
      "Have the site's pages request images with Cache-Control: max-age=86400, so CloudFront keeps them for a day.",
      "Lower the policy's maximum TTL to 86400 seconds, so CloudFront caches each image for exactly one day at most."
    ], a: 1,
    no: [
      "The default TTL applies only when the origin sends no max-age. Here max-age=5 wins.",
      null,
      "CloudFront ignores Cache-Control headers in viewer requests, so this changes nothing at the edge.",
      "The maximum TTL only caps a long max-age. A max-age of 5 is already below it, so images still expire after 5 seconds."],
    why: "When an object's max-age is below the minimum TTL, CloudFront caches it for the minimum TTL. Raising the minimum TTL on the images behavior makes CloudFront keep them a day while browsers still follow the origin's max-age.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html"] },

  // Reading target_processing_time (twin of dva-4-321), flip: -1 and 504 mean the idle timeout is the fix
  { id: "dva-4-975", exam: "DVA", dva: "4.3", topic: "elb", type: "mc", variant: true, twin: ["dva-4-321"],
    q: "Behind an Application Load Balancer with default settings, a /export endpoint builds a file for about 90 seconds before sending any response. Clients get HTTP 504 after about a minute. Access logs for those requests show target_processing_time of -1 and elb_status_code 504. The export can't be made faster yet. What should the developer do?",
    opts: [
      "Raise the load balancer's connection idle timeout above 90 seconds, so it waits for the export's response headers.",
      "Turn on sticky sessions for the target group, so that each client keeps returning to the target building its file.",
      "Raise the target group's deregistration delay to 120 seconds, so the target keeps its connection open for longer.",
      "Put a CloudFront distribution in front of the load balancer, so that clients wait at the edge for the export file."
    ], a: 0,
    no: [
      null,
      "Stickiness only picks which target serves a client. The 60-second idle timeout still cuts the request.",
      "Deregistration delay only lets in-flight requests finish when a target is being removed. It doesn't change the idle timeout.",
      "CloudFront adds its own origin timeout in front, and the load balancer would still cut the request at 60 seconds."],
    why: "target_processing_time is -1 when the target doesn't respond before the idle timeout, which defaults to 60 seconds. A 504 with -1 on a long but healthy request means the idle timeout is too short for it.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html",
      "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html"] },

  // Custom spans time your own code (twin of dva-4-322)
  { id: "dva-4-976", exam: "DVA", dva: "4.3", topic: "observability", type: "mc", variant: true, twin: ["dva-4-322"],
    q: "A Node.js Lambda function behind API Gateway uses the ADOT layer. Its traces show the function's span and two short DynamoDB spans, yet requests take 3 seconds. In between, the handler validates the cart, applies discount rules and renders a receipt. How can the team see how long each of these steps takes?",
    opts: [
      "Add an attribute to the function's span naming the steps, and filter traces in the X-Ray console by that attribute.",
      "Create a sampling rule that traces 100% of requests, so that every slow request appears with its full detail.",
      "Start a child span with the OpenTelemetry tracer around each step, and compare the span durations in the trace.",
      "Turn on execution logging for the API Gateway stage, and compare the integration latency for each request."
    ], a: 2,
    no: [
      "Attributes add searchable data to a span. They don't time anything, so the steps still share one span.",
      "Sampling decides how many requests are traced, not how much detail each trace has.",
      null,
      "Integration latency is the time for the whole Lambda call, not for the steps inside it."],
    why: "Each span has its own start and end timestamps. Library instrumentation covers calls such as AWS SDK requests, so the time spent in your own code shows up only when you wrap it in spans of your own.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-migration.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/nodejs-tracing.html"] },

  // Rightsizing to valid Fargate pairs (twin of dva-4-323)
  { id: "dva-4-977", exam: "both", dva: "4.3", saa: "4.2", topic: "ecs", type: "mc", variant: true, twin: ["dva-4-323"],
    q: "A Fargate (Linux) task runs at 0.5 vCPU and 1 GB, and tasks are being stopped for running out of memory. Container Insights shows peaks of 0.15 vCPU and 0.95 GB. The team wants the cheapest task size that keeps at least 30% headroom over both peaks. Which task size should the developer choose?",
    opts: [
      "0.5 vCPU and 2 GB of memory, which keeps the current CPU and doubles the memory to stop the tasks running out.",
      "0.25 vCPU and 1 GB of memory, which keeps the memory as it is and cuts the CPU to what the task actually uses.",
      "0.25 vCPU and 3 GB of memory, which gives the memory peak the most room while it cuts the CPU in half.",
      "0.25 vCPU and 2 GB of memory, which keeps the CPU peak at 60% and the memory peak at under half the limit."
    ], a: 3,
    no: [
      "It keeps the headroom, but 0.25 vCPU with 2 GB also keeps it and costs less.",
      "The 0.95 GB peak would use 95% of 1 GB, so tasks would keep running out of memory.",
      "Fargate doesn't accept that pair. At 0.25 vCPU, memory can be 512 MB, 1 GB or 2 GB.",
      null],
    why: "Fargate accepts only certain CPU and memory pairs. Memory needs at least 0.95 / 0.7, about 1.4 GB, so 2 GB. CPU needs about 0.21 vCPU, and 0.25 vCPU with 2 GB is a valid pair, the cheapest that fits.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html",
      "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights.html"] },

  // Reading cache metrics to pick a scaling fix (twin of dva-4-405), flip: CPU is the limit, so more vCPUs is right
  { id: "dva-4-978", exam: "DVA", dva: "4.3", topic: "elasticache", type: "mc", variant: true, twin: ["dva-4-405"],
    q: "A session service uses an ElastiCache for Memcached cluster of two nodes with lazy loading. After a marketing launch, cache response times have climbed. The cluster's CPUUtilization stays near 95%, while its Evictions metric is zero and plenty of memory is free. What should the developer do?",
    opts: [
      "Move to a node type with more memory and the same vCPUs, so that each node can hold more sessions at once.",
      "Move to a node type with more vCPUs, or add nodes, so that the cluster has the CPU to serve all the requests.",
      "Raise the TTL on session items, so that fewer of them expire and have to be written back into the cache.",
      "Switch from lazy loading to write-through, so that sessions are already cached before the app reads them."
    ], a: 1,
    no: [
      "Evictions are zero and memory is free, so memory isn't the limit. The same vCPUs stay overloaded.",
      null,
      "A longer TTL changes how long items stay, not how much CPU each request needs.",
      "Write-through adds a cache write on every save, which puts more load on the busy CPUs."],
    why: "Memcached is multi-threaded, so its CPUUtilization can run up to about 90%. Past that, AWS recommends a larger node type or more nodes. Evictions near zero show memory has room, so the fix is CPU, not memory.",
    doc: ["https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.WhichShouldIMonitor.html",
      "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/CacheMetrics.Memcached.html"] },

  // Parent-based sampling (twin of dva-4-906), flip: requests with no upstream decision, so the downstream rule is right
  { id: "dva-4-979", exam: "DVA", dva: "4.2", topic: "xray", type: "mc", variant: true, twin: ["dva-4-906"],
    q: "An Inventory service is called by the instrumented Orders service, which samples 5% of requests, and by a nightly batch script that has no tracing at all. The team wants every batch request to Inventory traced, without tracing more of the Orders traffic. What should they do?",
    opts: [
      "Raise the sampling rate of the rule that applies to the Orders service to 100%, so it traces all calls to Inventory.",
      "Have Inventory strip the X-Amzn-Trace-Id header from every request, so that it makes its own decision for each one.",
      "Add a rule that matches the Inventory service and the batch script's path at 100%, since those requests arrive undecided.",
      "Lower the priority number of the default rule, so it runs before any other rule and traces everything that arrives."
    ], a: 2,
    no: [
      "The batch script doesn't go through Orders, and this would trace far more of the Orders traffic.",
      "Stripping the header breaks Orders traces in two, and the batch requests have no header to strip anyway.",
      null,
      "The default rule always runs last, and its rate would apply only to requests no other rule matches."],
    why: "X-Ray sampling is parent-based. A service honors a decision made upstream, and its own rules apply only to requests that arrive with no decision. The batch requests come in untraced, so Inventory's own rule decides for them.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-console-sampling.html"] },

  // SnapStart vs provisioned concurrency (twin of dva-4-910), flip: Node.js, so provisioned concurrency is right
  { id: "dva-4-980", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc", variant: true, twin: ["dva-4-910"],
    q: "A Node.js 24 Lambda function behind an API takes about 3 seconds to cold start, even after trimming its init code. At 9 AM each weekday, traffic jumps to about 50 concurrent requests. The team has budget to pay for environments that wait ready during business hours. What should the developer do?",
    opts: [
      "Configure provisioned concurrency on an alias, scheduled to about 50 during business hours, and point the API at it.",
      "Turn on SnapStart for the function's published versions, and point the API's integration at an alias of a version.",
      "Set reserved concurrency of 50 on the function, so that Lambda keeps 50 environments initialized through the day.",
      "Invoke the function from an EventBridge schedule every five minutes, so that its environments never go cold."
    ], a: 0,
    no: [
      null,
      "SnapStart doesn't support Node.js runtimes. It works with Java, Python and .NET.",
      "Reserved concurrency sets aside and caps concurrency. It doesn't keep any environments initialized.",
      "A ping keeps about one environment warm, not the 50 the morning spike needs."],
    why: "Provisioned concurrency keeps pre-initialized environments ready, for an extra charge, and it can be scheduled for busy hours. SnapStart would avoid that charge, but it isn't available for Node.js.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html"] },

  // What SnapStart doesn't support (twin of dva-4-912)
  { id: "dva-4-981", exam: "DVA", dva: "4.3", topic: "lambda", type: "multi", hint: "Select TWO.", variant: true, twin: ["dva-4-912"],
    q: "A Python 3.13 function uses 4 GB of ephemeral storage for scratch files, and API Gateway invokes its unqualified ARN. It also has active X-Ray tracing and reserved concurrency of 20. What must the developer change before SnapStart can speed up its cold starts? (Select TWO.)",
    items: [
      { t: "Lower its ephemeral storage from 4 GB to 512 MB or less", ok: true },
      { t: "Invoke a published version or an alias that points to one", ok: true },
      { t: "Turn off active tracing, since snapshots can't send trace data", ok: false,
        no: "X-Ray can trace SnapStart functions, so tracing can stay on." },
      { t: "Remove its reserved concurrency of 20 from the function", ok: false,
        no: "Reserved concurrency isn't on SnapStart's unsupported list. Provisioned concurrency is." },
      { t: "Move it to Node.js, the runtime that SnapStart supports", ok: false,
        no: "SnapStart supports Python 3.12 and later, Java and .NET, not Node.js." }
    ],
    why: "SnapStart doesn't support provisioned concurrency, Amazon EFS, Amazon S3 Files, or ephemeral storage above 512 MB, and it works only on published versions and aliases that point to them, never $LATEST.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/snapstart-monitoring.html"] },

  // ---------------------------------------------------------------- Batch 3 (Nov 16): twins for Security (2.1), Deployment
  // (3.2, 3.3) and task 1.2 questions that had none. Facts checked against the linked AWS docs on Nov 16, 2026 (js/verified.js).,

// Role chaining one-hour cap (twin of dva-2-755), flip: the fix is to stop chaining, not to change the maximum
  { id: "dva-2-955", exam: "DVA", dva: "2.1", topic: "sts", type: "mc", variant: true, twin: ["dva-2-755"],
    q: "A nightly report uses an IAM user's keys to assume RoleA, then uses RoleA's session to assume RoleB with DurationSeconds set to 10800. RoleB's maximum session duration is 4 hours. The second call fails. Which change gets the report a 3-hour RoleB session?",
    opts: [
      "Trust the IAM user in RoleB's trust policy, and have the user's own keys call AssumeRole on RoleB directly instead.",
      "Raise RoleB's maximum session duration to 12 hours, so that the chained request falls well inside the limit.",
      "Raise RoleA's maximum session duration to 4 hours, so that RoleB's chained session can inherit that limit.",
      "Ask for DurationSeconds of 10800 on the first call for RoleA, so the unused time carries over into RoleB."
    ], a: 0,
    no: [null,
      "Role chaining caps a chained session at one hour whatever the role's maximum says, so a higher setting doesn't help.",
      "RoleA's setting covers RoleA's own sessions. A session made from RoleA's credentials is still chained and capped at one hour.",
      "Each AssumeRole call sets its own duration. RoleB's chained call still can't ask for more than one hour."],
    why: "Assuming a role with another role's credentials is role chaining, which caps the new session at one hour regardless of the role's maximum. Assuming RoleB straight from the IAM user's long-term keys isn't chaining, so the call can ask for up to RoleB's 4-hour maximum.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html",
      "https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html"] },

  // JWT authorizer 403 means valid token, missing scope (twin of dva-2-756)
  { id: "dva-2-956", exam: "DVA", dva: "2.1", topic: "apigateway", type: "mc", variant: true, twin: ["dva-2-756"],
    q: "An HTTP API's /orders route uses a JWT authorizer for a Cognito user pool and requires the scope orders/write. A mobile app's calls to /orders all get 403 Forbidden. Its calls to other routes on the same authorizer, which require no scopes, succeed with the same token. What is the most likely cause?",
    opts: [
      "The access token is valid, but the app client never requested orders/write, so the token lacks that scope.",
      "The access token has expired, so the authorizer rejects it now that the token's exp claim is in the past.",
      "The access token came from a second user pool, so its issuer doesn't match the one the authorizer expects.",
      "The app sends the token in a custom header, so the authorizer can't find it in the configured identity source."
    ], a: 0,
    no: [null,
      "An expired token fails validation and gets 401 Unauthorized, and it would fail on the other routes too.",
      "A token from the wrong issuer fails validation, which gives 401 Unauthorized on every route, not 403 on one.",
      "With no token in the identity source the request gets 401 Unauthorized, and the other routes would fail as well."],
    why: "The JWT authorizer validates the token first, and a missing or invalid token gets 401 Unauthorized. A token that passes validation but carries none of the route's required scopes gets 403 Forbidden. The same token works on routes without scopes, so only the scope is missing.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html",
      "https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigatewayv2_authorizers-readme.html"] },

  // Revoke active sessions denies only older credentials (twin of dva-2-870)
  { id: "dva-2-957", exam: "DVA", dva: "2.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-870"],
    q: "An admin chose Revoke active sessions on a role an hour ago, after some of its credentials leaked. The app's new sessions of the role work fine, but a developer's CLI profile for the same role still gets AccessDenied on every call. What should the developer do?",
    opts: [
      "Delete the CLI's cached credentials, so its next call assumes the role again and gets a brand new session.",
      "Detach the AWSRevokeOlderSessions policy from the role, so the developer's existing session is allowed again.",
      "Wait for the revoke to wear off, since it blocks every session of the role for the role's maximum duration.",
      "Add an Allow for the developer's calls to the role's trust policy, so that it overrides the revoke's deny."
    ], a: 0,
    no: [null,
      "It would unblock the developer, but it also lets the leaked credentials back in, since that policy is what blocks them.",
      "The revoke denies only credentials issued before it. Sessions started afterward work at once, as the app shows.",
      "A trust policy only controls who can assume the role, and an explicit deny beats any allow anyway."],
    why: "Revoking active sessions attaches AWSRevokeOlderSessions, which denies requests signed with credentials issued before the revoke time. The CLI caches role credentials until they expire, so it keeps using its old, revoked session until the cache is cleared.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html"] },

  // Session policy is an intersection, so a broad one narrows nothing (twin of dva-2-871)
  { id: "dva-2-958", exam: "DVA", dva: "2.1", topic: "sts", type: "mc", variant: true, twin: ["dva-2-871"],
    q: "A role's identity policy allows dynamodb:GetItem and dynamodb:PutItem on the Orders table. A job assumes the role and passes a session policy that allows dynamodb:* on Orders. No resource policy names the session. Which actions on Orders can the session perform?",
    opts: [
      "Only GetItem and PutItem, since a session gets just what both the role's policy and the session policy allow.",
      "Every DynamoDB action on Orders, since the session policy's dynamodb:* is added to the role's own permissions.",
      "None of them, since a session policy broader than the role's policy is rejected and the session gets nothing.",
      "Only the read actions in dynamodb:*, since a session policy can grant reads but must leave writes to the role."
    ], a: 0,
    no: [null,
      "A session policy never grants anything. It only limits what the role's identity-based policies already allow.",
      "AssumeRole accepts a broad session policy. It just doesn't widen anything, so the role's own limits still apply.",
      "Session policies have no read and write split. The session gets the overlap, which here includes PutItem."],
    why: "A session's permissions are the intersection of the role's identity-based policies and the session policy. A wildcard session policy narrows nothing and adds nothing, so the session keeps exactly GetItem and PutItem.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html#policies_session",
      "https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html"] },

  // Permissions boundary needs an identity policy too (twin of dva-2-101), flip: the boundary already allows it
  { id: "dva-2-959", exam: "DVA", dva: "2.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-101"],
    q: "A build role's permissions boundary allows s3:*, dynamodb:* and sqs:*. Its only identity policy allows s3:* and dynamodb:*. A new step calls sqs:SendMessage and gets AccessDenied. No SCP or resource policy is involved. What should the developer change so the call succeeds?",
    opts: [
      "Add sqs:SendMessage to the role's identity policy, since the boundary only caps what that policy grants.",
      "List sqs:SendMessage in the boundary by name, since a wildcard in a boundary doesn't cover newer actions.",
      "Remove the permissions boundary from the role, since a boundary blocks every service it names with a wildcard.",
      "Add an Allow for sqs:SendMessage to the role's trust policy, so the step can use it once it assumes the role."
    ], a: 0,
    no: [null,
      "sqs:* already covers SendMessage. The boundary isn't what's missing. No identity policy grants the action.",
      "Without the boundary, the identity policy still doesn't allow SQS, so the call is still denied.",
      "A trust policy only says who can assume the role. It doesn't grant actions to the role's sessions."],
    why: "A permissions boundary grants nothing by itself. It sets the most the identity-based policies can grant, so an action must be allowed by both. Here the boundary allows SQS, but no identity policy does.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html"] },

  // NotAction with Allow matches everything unlisted (twin of dva-2-102), flip: NotAction is right once Resource scopes it
  { id: "dva-2-960", exam: "DVA", dva: "2.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-102"],
    q: "A developer wants a role to perform any Amazon S3 action on buckets and objects except s3:DeleteObject, and nothing in any other service, using a single policy statement. Which statement does that?",
    opts: [
      "Effect Allow, NotAction s3:DeleteObject, and Resource arn:aws:s3:::* so only S3 resources are in scope.",
      "Effect Allow, NotAction s3:DeleteObject, and Resource * so that every bucket and object is covered.",
      "Effect Deny, NotAction s3:DeleteObject, and Resource * so every other S3 action is left open to the role.",
      "Effect Allow, Action s3:*, and Resource arn:aws:s3:::* since DeleteObject needs its own Allow to work."
    ], a: 0,
    no: [null,
      "With Resource *, NotAction matches every action in every service except the one listed, so the role gets far more than S3.",
      "Deny with NotAction denies every action except DeleteObject and grants nothing. It's for blocking, not allowing.",
      "s3:* includes s3:DeleteObject, so this lets the role delete objects too."],
    why: "NotAction matches every action except those listed, and the Resource element decides which services apply. With Resource arn:aws:s3:::* only S3 actions apply, so the role gets every S3 action except DeleteObject and nothing elsewhere.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_notaction.html"] },

  // Identity pool sub as a policy variable (twin of dva-2-103), DynamoDB instead of S3
  { id: "dva-2-961", exam: "DVA", dva: "2.1", topic: "cognito", type: "mc", variant: true, twin: ["dva-2-103"],
    q: "A mobile app gets AWS credentials from a Cognito identity pool's authenticated role. A DynamoDB table's partition key, UserId, holds each user's identity ID. With one shared role, each user may read and write only their own items. Which condition belongs in the role's policy?",
    opts: [
      "ForAllValues:StringEquals on dynamodb:LeadingKeys, set to ${cognito-identity.amazonaws.com:sub}",
      "ForAllValues:StringEquals on dynamodb:LeadingKeys, set to ${aws:username} for the signed-in user",
      "ForAllValues:StringEquals on dynamodb:Attributes, set to ${cognito-identity.amazonaws.com:sub}",
      "ForAllValues:StringEquals on dynamodb:LeadingKeys, set to the identity pool's own ID for the app"
    ], a: 0,
    no: [null,
      "aws:username is set only for IAM users. Identity pool users come in through a role, so it doesn't resolve for them.",
      "dynamodb:Attributes lists the attributes a request touches, not which items. It's for hiding columns, not rows.",
      "The pool ID is the same for every user and isn't any item's key, so it can't tell one user's items from another's."],
    why: "The identity pool sets cognito-identity.amazonaws.com:sub to each user's identity ID, and a policy can use it as a variable. dynamodb:LeadingKeys checks the partition key of the items a request touches, so each user reaches only items keyed by their own ID.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/iam-roles.html",
      "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html"] },

  // aws:SourceIp and the path traffic takes (twin of dva-2-104), flip: no endpoint, so the NAT's Elastic IP is right
  { id: "dva-2-962", exam: "DVA", dva: "2.1", topic: "s3", type: "mc", variant: true, twin: ["dva-2-104"],
    q: "A bucket policy denies all S3 actions unless aws:SourceIp is in the office's public range. An app on EC2 in a private subnet reaches S3 through a public NAT gateway, and the VPC has no S3 endpoint. The app's calls are denied, though its role allows them. What should the developer change?",
    opts: [
      "Add the NAT gateway's Elastic IP address to the aws:SourceIp list in the bucket policy's deny condition.",
      "Add the private subnet's CIDR range to the aws:SourceIp list, so the instance's own address matches it.",
      "Add an aws:SourceVpce exception for the VPC's endpoint ID, so the deny skips calls made from the VPC.",
      "Add the instance's private IP address as a condition in the role's policy, so the role's allow wins out."
    ], a: 0,
    no: [null,
      "S3 sees the NAT gateway's public address, not the private one, and aws:SourceIp only works with public ranges.",
      "aws:SourceVpce is only in the request when it comes through a VPC endpoint. This VPC has none to match.",
      "The bucket policy's explicit deny still applies, and no allow in the role's policy can override an explicit deny."],
    why: "Without a VPC endpoint, the app's requests leave through the public NAT gateway, which maps them to its Elastic IP address. That public address is what S3 sees as aws:SourceIp, so adding it to the allowed range lets the calls through.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html",
      "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html"] },

  // MFA needs an STS call that carries the code (twin of dva-2-106), flip: mfa_serial is right in a role profile
  { id: "dva-2-963", exam: "DVA", dva: "2.1", topic: "sts", type: "mc", variant: true, twin: ["dva-2-106"],
    q: "A role's trust policy lets a developer's IAM user assume it only when aws:MultiFactorAuthPresent is true. The developer has a virtual MFA device and wants ordinary CLI commands with a profile to use the role, typing the code when asked. Which setup works?",
    opts: [
      "A profile with role_arn, source_profile set to the user's profile, and mfa_serial set to the MFA device ARN.",
      "The user's own profile with mfa_serial added next to its access keys, and no role_arn in that profile.",
      "A profile with role_arn and source_profile, and aws sts get-caller-identity run with the MFA code first.",
      "A profile with role_arn and source_profile, using access keys created after a console sign-in with MFA."
    ], a: 0,
    no: [null,
      "Without role_arn the profile never assumes the role, and long-term access keys on their own never carry MFA context.",
      "GetCallerIdentity takes no MFA code. Without mfa_serial the CLI's AssumeRole call has no MFA, so it's denied.",
      "Access keys never carry MFA context, however they were created. The AssumeRole call still has no MFA in it."],
    why: "With mfa_serial in a role profile, the CLI prompts for the one-time code and sends it with its AssumeRole call, so the trust policy's MFA condition is met. Long-term access keys alone never satisfy it.",
    doc: ["https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html",
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_configure-api-require.html"] },

  // MaxSessionDuration is a ceiling, DurationSeconds defaults to an hour (twin of dva-2-108), flip: the maximum is already high enough
  { id: "dva-2-964", exam: "DVA", dva: "2.1", topic: "sts", type: "mc", variant: true, twin: ["dva-2-108"],
    q: "A role's maximum session duration was raised to 6 hours for a 4-hour export job. The job's code still calls AssumeRole without DurationSeconds, and its credentials expire after about an hour, partway through the run. What should the developer change?",
    opts: [
      "Pass DurationSeconds of at least 14400 in the AssumeRole call, which the 6-hour maximum allows.",
      "Raise the role's maximum session duration to 12 hours, so each session lasts that long by default.",
      "Call AssumeRole again from the first session, so that the second session adds an hour to the run.",
      "Recreate the role, since a raised maximum applies only to roles that were created with that setting."
    ], a: 0,
    no: [null,
      "The maximum only caps what a call can ask for. A call without DurationSeconds still gets one hour.",
      "That's role chaining, which caps the chained session at one hour, so the job still runs out of time.",
      "A new maximum applies the next time the role is assumed. The session is short because the call asks for no duration."],
    why: "A role's maximum session duration is only a ceiling on what AssumeRole can request. DurationSeconds defaults to 3600 seconds, so the job must ask for the longer session itself.",
    doc: ["https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html",
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_update-role-settings.html"] },

  // SigV4 timestamps and clock skew (twin of dva-2-110), clock ahead instead of behind
  { id: "dva-2-965", exam: "DVA", dva: "2.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-110"],
    q: "Edge devices sign their own SigV4 requests to an API Gateway REST API that uses IAM authorization. After a power cut, one device's requests all fail with 403 and the message Signature not yet current: date is still later than date. Other devices work. What is the most likely cause?",
    opts: [
      "The device's clock came back set ahead after the outage, so its signed timestamps are in the future.",
      "The device puts us-west-2 in its credential scope, while the API it calls is deployed only in us-east-1.",
      "The device's role lost execute-api:Invoke on the method, and the denial shows up as a date error.",
      "The device's temporary credentials expired in the outage, so its access key now looks future-dated."
    ], a: 0,
    no: [null,
      "A wrong Region in the scope gives a Credential should be scoped to a valid Region error, not a date error.",
      "Permissions are checked apart from the signature. This message is about the request's timestamp, not the role.",
      "Expired credentials don't make a request's date look like the future. This message means the signed date is ahead."],
    why: "SigV4 checks the request's timestamp against AWS's clock. A timestamp in the future gives Signature not yet current, and one too far in the past gives Signature expired. Syncing the device's clock, for example with NTP, fixes both.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-troubleshooting.html",
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html"] },

// Cross-account invoke needs the caller's identity policy too (twin of dva-2-112)
  { id: "dva-2-966", exam: "DVA", dva: "2.1", topic: "lambda", type: "mc", variant: true, twin: ["dva-2-112"],
    q: "A role in account B calls Invoke on a Lambda function in account A and gets AccessDeniedException. The function's resource-based policy already allows lambda:InvokeFunction for that role's ARN. The role's only policy allows DynamoDB actions on its tables. What should be done?",
    opts: [
      "In account B, add lambda:InvokeFunction on the function's ARN to the role's identity-based policy.",
      "In account A, add a second resource policy statement that names account B's root as the principal.",
      "In account A, add account B's role to the trust policy of the function's own execution role.",
      "In account B, add the function's ARN as a trusted principal in the trust policy of the caller role."
    ], a: 0,
    no: [null,
      "Account A has already granted access. A wider resource policy can't make up for account B's own policy not allowing the call.",
      "The execution role is what the function runs as. Trusting account B there lets B assume it, not invoke the function.",
      "A trust policy says who may assume the role. The function never assumes it; the role needs a permissions policy allowing the call."],
    why: "A cross-account call needs two yeses: the resource-based policy in the function's account, and an identity-based policy on the caller in its own account. Here only the function's side allows it.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/permissions-function-cross-account.html"] },

  // Source account only matters when the source ARN has no account ID (twin of dva-2-113), flip: SNS, so --source-arn alone is enough
  { id: "dva-2-967", exam: "DVA", dva: "2.1", topic: "lambda", type: "mc", variant: true, twin: ["dva-2-113"],
    q: "A developer lets an SNS topic invoke a Lambda function with aws lambda add-permission, principal sns.amazonaws.com and --source-arn set to the topic's ARN. A reviewer, recalling the advice for S3 triggers, asks for --source-account too. Is it needed, and why?",
    opts: [
      "No. The topic's ARN contains the owner's account ID, so --source-arn alone ties the grant to that account.",
      "Yes. Topic ARNs leave out the account ID like bucket ARNs, so another account could reuse a deleted topic's name.",
      "Yes. Without it, SNS invokes the function using the topic owner's role instead of the function's execution role.",
      "No. With SNS as the principal, the statement allows every topic in every account, whatever --source-arn says."
    ], a: 0,
    no: [null,
      "SNS topic ARNs include the account ID. It's S3 bucket ARNs that leave it out, which is why S3 grants add the account check.",
      "A resource-based policy only controls who may invoke. The function always runs with its own execution role.",
      "--source-arn adds an aws:SourceArn condition, so only that topic can invoke. The principal alone isn't the whole statement."],
    why: "aws:SourceAccount closes a gap for sources whose ARN has no account ID, such as S3 buckets, where a deleted name can be taken by another account. A topic ARN names its account, so the source ARN already pins it.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/permissions-function-services.html",
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html"] },

  // Pre sign-up can deny a sign-up before the user exists (twin of dva-2-117)
  { id: "dva-2-968", exam: "DVA", dva: "2.1", topic: "cognito", type: "mc", variant: true, twin: ["dva-2-117"],
    q: "A game's closed beta uses a Cognito user pool. The app sends each player's invite code in ValidationData with SignUp. Sign-up must fail unless the code is in a DynamoDB table of valid codes, so no account ever exists without one. What should the developer do?",
    opts: [
      "Add a pre sign-up Lambda trigger that looks up the code from validationData and throws an error if it's missing.",
      "Add a post confirmation Lambda trigger that looks up the code and deletes the new user if it isn't in the table.",
      "Add a pre authentication Lambda trigger that checks the code at each sign-in and denies players who have none.",
      "Add a define auth challenge Lambda trigger that asks each player for the invite code as a custom challenge."
    ], a: 0,
    no: [null,
      "Post confirmation runs after the account is created and confirmed, so codeless accounts exist for a while. It's for follow-up work like welcome emails.",
      "Pre authentication runs at sign-in, after the account already exists. It's for blocking or logging sign-in attempts.",
      "Custom auth challenges run during sign-in, not sign-up, so accounts are still created without a code."],
    why: "The pre sign-up trigger runs before Cognito creates the user, and ValidationData is passed to it for exactly this kind of check. Throwing an error refuses the sign-up.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html"] },

  // Pre token generation is only for claims Cognito can't supply itself (twin of dva-2-118), flip: a fixed value, so a custom attribute beats the trigger
  { id: "dva-2-969", exam: "DVA", dva: "2.1", topic: "cognito", type: "mc", variant: true, twin: ["dva-2-118"],
    q: "In a Cognito user pool, each user picks a company at sign-up, and it never changes. The backend reads the company ID from the ID token. The developer wants no Lambda functions and the least custom code. What should the developer do?",
    opts: [
      "Add an immutable custom:company_id attribute that the app client can write at sign-up and read.",
      "Add a pre token generation Lambda trigger that looks up the company and adds it to each ID token.",
      "Pass the company ID in ValidationData at sign-up, so Cognito saves it and adds it to the ID token.",
      "Add a resource server with a scope per company, and have the app ask for its company's scope."
    ], a: 0,
    no: [null,
      "It works, but it's a function and extra code for a value that never changes. A custom attribute reaches the ID token by itself.",
      "ValidationData is temporary input for the pre sign-up trigger. Cognito doesn't save it as an attribute or put it in tokens.",
      "Scopes say what a client may access, the client picks them, and they go in access tokens. They aren't per-user data."],
    why: "Custom attributes are stored with the user and written into the ID token for app clients that can read them. Making it immutable means it can be set only once, when the user is created, so users can't change it later. A pre token generation trigger is for values that live elsewhere or change often.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-id-token.html",
      "https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html",
      "https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html"] },

  // Validate a Cognito JWT: claims must tie it to your pool and client (twin of dva-2-119)
  { id: "dva-2-970", exam: "DVA", dva: "2.1", topic: "cognito", type: "multi", variant: true, twin: ["dva-2-119"], hint: "Select TWO.",
    q: "A service validates Cognito access tokens like this: read iss from the token, download that issuer's /.well-known/jwks.json, verify the signature by kid, then check token_use and exp. A tester gets in with a token from their own user pool. Which checks must be added? (Select TWO.)",
    items: [
      { t: "Check that iss is your own user pool's URL, and take signing keys only from that pool's JWKS.", ok: true },
      { t: "Check that the client_id claim is your app's client ID before you trust any other claim.", ok: true },
      { t: "Check that the header's kid matches a key at the JWKS URL named by the token's own iss.", ok: false,
        no: "The code already does this. The tester's pool publishes keys that match its own tokens, so it proves nothing about the issuer." },
      { t: "Check that the header's alg is RS256, so tokens signed with other pools' HMAC secrets fail.", ok: false,
        no: "Every user pool signs with RS256, so the tester's token passes too. The alg doesn't show which pool issued it." },
      { t: "Check that the aud claim is your app client's ID, as it must be in every Cognito token.", ok: false,
        no: "Access tokens carry the app client in client_id. The aud claim is in ID tokens." }
    ],
    why: "A valid signature only proves some user pool signed the token. The issuer must be your pool, the keys must come from your pool's JWKS, and the app client claim must be your app.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html"] },

  // The refresh token's lifetime is the session's lifetime (twin of dva-2-120), flip: shorten the refresh token instead of lengthening it
  { id: "dva-2-971", exam: "DVA", dva: "2.1", topic: "cognito", type: "mc", variant: true, twin: ["dva-2-120"],
    q: "A banking app signs users in to a Cognito user pool with the SDK's InitiateAuth and keeps them signed in with the refresh token. Compliance now says users must enter their password again at least every 12 hours, even when active. What should the developer do?",
    opts: [
      "Set the app client's refresh token expiration to 12 hours, so the app can't get new tokens after that.",
      "Set the app client's ID and access token expiration to 12 hours, so users must sign in again after that.",
      "Turn on refresh token rotation, so each refresh returns a new refresh token that lasts 12 hours at most.",
      "Add a pre authentication trigger that denies users whose last password sign-in was over 12 hours ago."
    ], a: 0,
    no: [null,
      "The refresh token still lasts 30 days by default and keeps getting new tokens without the password.",
      "Rotation swaps the refresh token on use, but the session still lasts as long as the first one (30 days by default).",
      "Pre authentication doesn't run when a session is renewed with a refresh token. It's for checks at sign-in."],
    why: "As long as the refresh token is valid, the app can get new ID and access tokens without the password. Its lifetime, set per app client from 60 minutes to 10 years, is how long a user stays signed in.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-refresh-token.html",
      "https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-authentication.html"] },

  // Group roles need Choose role from token in the identity pool (twin of dva-2-121)
  { id: "dva-2-972", exam: "DVA", dva: "2.1", topic: "cognito", type: "mc", variant: true, twin: ["dva-2-121"],
    q: "A user pool's admins group has AdminRole assigned, and the app trades ID tokens for identity pool credentials. Admins' ID tokens include cognito:preferred_role, yet everyone, admins too, gets the identity pool's default authenticated role. What should the developer change?",
    opts: [
      "Set the identity pool's authenticated role selection to choose the role from the token.",
      "Attach AdminRole's permissions policies to the admins group, so its members get them.",
      "Add the admins to an IAM group that has AdminRole's policies, so their calls get them.",
      "Set the admins group's precedence to 0, so its role becomes each admin user's preferred role."
    ], a: 0,
    no: [null,
      "User pool groups aren't IAM groups and can't hold policies. A group can only reference an IAM role.",
      "IAM groups hold IAM users. Identity pool users get whichever role the identity pool picks for them.",
      "The claim is already set. Precedence picks among a user's groups, but the identity pool still ignores the claim."],
    why: "Assigning a role to a group puts it in the user's tokens, but the identity pool uses it only when its authenticated role selection is set to choose the role from the token.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/role-based-access-control.html"] },

  // Identity pools are for AWS credentials, not for your own API (twin of dva-2-122), flip: the user pool alone is right
  { id: "dva-2-973", exam: "both", dva: "2.1", saa: "1.2", topic: "cognito", type: "mc", variant: true, twin: ["dva-2-122"],
    q: "A notes app signs users in with a Cognito user pool. Its only backend is an API Gateway REST API with a Cognito user pool authorizer, and the app never calls other AWS services directly. A teammate wants to add an identity pool as well. What's the simplest setup that works?",
    opts: [
      "Use only the user pool, and send each user's token to the API in the Authorization header.",
      "Add an identity pool, and sign each API request with its temporary credentials using SigV4.",
      "Add an identity pool with guest access, so users can call the API before they sign in at all.",
      "Create an IAM user per app user, and sign each API request with that IAM user's access keys."
    ], a: 0,
    no: [null,
      "Identity pool credentials are for AWS services or IAM-authorized APIs. A user pool authorizer checks tokens, not SigV4 signatures.",
      "Guest access hands AWS credentials to users who aren't signed in. The authorizer doesn't accept them, and nothing here needs guests.",
      "It puts long-term keys on devices, and the user pool authorizer accepts only user pool tokens anyway."],
    why: "A user pool authorizer checks user pool tokens itself. An identity pool is needed only when the app must call AWS services with AWS credentials, which this app never does.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html",
      "https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html"] },

  // Client type follows where the code runs (twin of dva-2-123), flip: a server can keep a secret, so confidential client
  { id: "dva-2-974", exam: "DVA", dva: "2.1", topic: "cognito", type: "mc", variant: true, twin: ["dva-2-123"],
    q: "A server-rendered web app runs on ECS. Users sign in through Cognito managed login, and only the server ever handles their tokens. The server can read a secret from Secrets Manager at startup. Which app client setup is MOST secure?",
    opts: [
      "A confidential app client with a client secret kept on the server, using the authorization code grant.",
      "A public app client with no client secret, using the implicit grant to return the tokens in the redirect URL.",
      "A confidential app client with the client credentials grant, so the server gets tokens for each user.",
      "A public app client with no client secret, using the authorization code grant without adding PKCE."
    ], a: 0,
    no: [null,
      "The implicit grant is a legacy grant that shows tokens to the browser in the redirect URL and returns no refresh token.",
      "Client credentials is machine-to-machine access with no user, so it can't sign users in at all.",
      "With no secret and no PKCE, anyone who intercepts the code can redeem it. A server that can hold a secret should use one."],
    why: "A server with trusted resources is a confidential client and can prove itself with a client secret when it redeems the code. The authorization code grant keeps tokens off the browser and includes a refresh token.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html",
      "https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints-oauth-grants.html"] },

  // CLI role profiles: name the role and where the source credentials come from (twin of dva-2-127), flip: on EC2, credential_source is right
  { id: "dva-2-975", exam: "DVA", dva: "2.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-127"],
    q: "A nightly script on an EC2 instance runs AWS CLI commands. The instance profile's role may assume ReportRole in another account. The CLI should switch to ReportRole automatically, with no access keys stored on the instance. What should the developer add to ~/.aws/config?",
    opts: [
      "A profile with role_arn set to ReportRole and credential_source set to Ec2InstanceMetadata.",
      "A profile with role_arn set to ReportRole and credential_source set to Environment.",
      "A profile with aws_access_key_id set to ReportRole's ARN, so the CLI signs as that role.",
      "A profile with role_arn set to ReportRole and mfa_serial set to the instance's own ID."
    ], a: 0,
    no: [null,
      "Environment reads source keys from environment variables, which this instance doesn't have. It's for keys exported in the shell.",
      "That setting holds an access key ID, not a role ARN. Role settings go in role_arn in a role profile.",
      "mfa_serial names an MFA device so a person can type a code. A script can't answer the prompt, and an instance isn't an MFA device."],
    why: "A role profile names the role and where the credentials that assume it come from. On EC2, Ec2InstanceMetadata uses the instance profile's role as the source, so no keys are stored.",
    doc: ["https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html"] },

  // Scopes on the method make the authorizer check access tokens (twin of dva-2-129)
  { id: "dva-2-976", exam: "DVA", dva: "2.1", topic: "cognito", type: "mc", variant: true, twin: ["dva-2-129"],
    q: "A partner's batch job gets access tokens with scope reports/read from a Cognito user pool through the client credentials grant. GET /reports uses a Cognito user pool authorizer with no OAuth scopes set, and testing shows any web user's ID token can read the reports too. Only reports/read tokens should pass. What should the developer do?",
    opts: [
      "Add reports/read as an OAuth scope on the method, so the authorizer checks access tokens for it.",
      "Require an API key on the method, and give the partner a key in a usage plan for the API's stage.",
      "Add an API resource policy that allows execute-api:Invoke only for the partner's app client ID.",
      "Set the authorizer's token source to a custom header, so the web app's Authorization header is ignored."
    ], a: 0,
    no: [null,
      "API keys meter and throttle callers. They don't authorize them, and ID tokens would still pass the authorizer.",
      "Resource policies match IAM principals, IP ranges or VPCs, not Cognito app clients, so they can't tell the tokens apart.",
      "The token source only says where to read the token. A valid ID token sent in that header still passes."],
    why: "With no OAuth scopes on a method, a Cognito authorizer treats the token as an identity token. With scopes set, it treats it as an access token and passes it only if one of its scopes matches.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-enable-cognito-user-pool.html",
      "https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints-oauth-grants.html"] },

// Externalized app authorization with Cedar (twin of dva-2-130)
  { id: "dva-2-977", exam: "DVA", dva: "2.1", topic: "verifiedpermissions", type: "mc", variant: true, twin: ["dva-2-130"],
    q: "A project-tracking app signs users in with a Cognito user pool. Each customer's admins set rules such as \"managers can approve invoices under $5,000 for their own team\", and the rules change weekly. The product team wants the rules kept out of the code, with an allow or deny answer per request. What should the developer do?",
    opts: [
      "Store the rules as Cedar policies in a Verified Permissions policy store, and ask it for a decision on each request.",
      "Map users to IAM roles with Cognito identity pool rules, and write the approval rules as IAM policies on those roles.",
      "Attach an API Gateway resource policy to the API that lists which users may approve invoices up to each amount.",
      "Define a custom OAuth scope for each approval limit in the user pool, and check scopes in the API's Cognito authorizer."
    ], a: 0,
    no: [null,
      "IAM policies control access to AWS resources. Invoices are app records, and rules like \"own team\" can't be written as IAM policies.",
      "Resource policies control which accounts, IP addresses or VPCs can call the API. They can't check invoice amounts or teams.",
      "Scopes say which API operations a token may call. They can't check each invoice's team or amount."],
    why: "Verified Permissions is a managed authorization service for apps you build. The rules live as Cedar policies outside the code, and the app asks whether each request is allowed or denied.",
    doc: ["https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/what-is-avp.html"] },

  // Console-made EC2 roles come with an instance profile (twin of dva-2-131), flip: the role's name already works as the profile name
  { id: "dva-2-978", exam: "DVA", dva: "2.1", topic: "ec2", type: "mc", variant: true, twin: ["dva-2-131"],
    q: "A developer created the AppRole role in the IAM console, choosing EC2 as the trusted service. A script now launches instances with aws ec2 run-instances and must give them AppRole. A teammate says the script must first create an instance profile. Which option needs the LEAST effort?",
    opts: [
      "Pass --iam-instance-profile Name=AppRole, since the console already made an instance profile with that name.",
      "Run create-instance-profile and add-role-to-instance-profile in the script before calling run-instances.",
      "Pass --iam-instance-profile Arn= with the role's ARN, since the option accepts either a role or a profile.",
      "Run sts assume-role for AppRole in the instance's user data, and write the keys to the default credentials file."
    ], a: 0,
    no: [null,
      "Not needed here. The console already made an AppRole instance profile holding the role; this step is for roles made with the CLI or API.",
      "The Arn field takes the instance profile's ARN, not the role's ARN.",
      "The instance has no credentials to call assume-role with, and the role trusts only EC2. EC2 gets a role through an instance profile."],
    why: "When you create a role for EC2 in the console, it also creates an instance profile with the same name, so that name works wherever EC2 asks for a profile. Only roles made with the CLI or API need the profile created by hand.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html",
      "https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_IamInstanceProfileSpecification.html"] },

  // Certificates from your CA to temporary credentials outside AWS (twin of dva-2-133)
  { id: "dva-2-979", exam: "both", dva: "2.1", saa: "1.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-133"],
    q: "An analytics service runs in containers at another cloud provider and writes to DynamoDB with IAM user access keys kept in environment variables. Each container already gets a certificate from the team's AWS Private CA. The team wants short-lived AWS credentials and no stored keys. What should a developer do?",
    opts: [
      "Use the AWS Private CA as an IAM Roles Anywhere trust anchor, add a profile with a role, and run the credential helper.",
      "Create an IAM SAML identity provider from the CA certificate, and call AssumeRoleWithSAML with each container's certificate.",
      "Create a Cognito identity pool with guest access, and have each container get temporary credentials from it on startup.",
      "Create one IAM user per container, and call sts get-session-token with its access keys to get short-lived credentials."
    ], a: 0,
    no: [null,
      "A SAML provider trusts signed SAML assertions from an identity provider, not X.509 certificates presented by a workload.",
      "Guest access gives credentials to anyone who asks, with no proof of identity. Identity pools are for app users.",
      "Each container would still store long-term access keys to call GetSessionToken, which the team wants to remove."],
    why: "IAM Roles Anywhere trusts a CA you register as a trust anchor, such as an AWS Private CA. Workloads outside AWS present certificates from it and get temporary credentials for the role named in a profile.",
    doc: ["https://docs.aws.amazon.com/rolesanywhere/latest/userguide/introduction.html"] },

  // Passing a role vs assuming it (twin of dva-2-134), flip: the developer needs the role's credentials, so sts:AssumeRole is right
  { id: "dva-2-980", exam: "DVA", dva: "2.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-134"],
    q: "A developer wants to debug locally with exactly the permissions of a Lambda function's execution role, running CLI commands as that role. The developer's policy already allows iam:PassRole on the role, and the role's trust policy names only lambda.amazonaws.com. What should the developer do?",
    opts: [
      "Add the developer's IAM user to the role's trust policy, then call assume-role on it to get its credentials.",
      "Add an iam:PassedToService condition of lambda.amazonaws.com to the developer's existing iam:PassRole statement.",
      "Allow lambda:InvokeFunction on the function, so the developer's CLI calls run under the function's execution role.",
      "Attach the execution role's permissions policy to the developer's IAM user too, then remove it later."
    ], a: 0,
    no: [null,
      "That limits which service the role can be passed to. Passing hands a role to a service and never gives the developer its credentials.",
      "Invoking runs the function's code with its role. The developer's own CLI calls still use the developer's credentials.",
      "The developer keeps their own permissions as well, so it isn't the role's exact set. Assuming the role swaps them out."],
    why: "iam:PassRole lets a user hand a role to a service, which then assumes it. To use a role's permissions yourself, the role's trust policy must trust you and you call AssumeRole. In the same account, a trust policy that names your user is enough; if it trusts the whole account instead, your own policy must also allow sts:AssumeRole.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_permissions-to-switch.html",
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_passrole.html",
      "https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html"] },

  // The boundary must be in the create request, CloudFormation version (twin of dva-2-135)
  { id: "dva-2-981", exam: "DVA", dva: "2.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-135"],
    q: "Developers deploy CloudFormation stacks with their own credentials. Their policy allows iam:CreateRole only when iam:PermissionsBoundary equals the DevBoundary policy ARN. A stack that defines an AWS::IAM::Role fails with AccessDenied on CreateRole. What should the developer change in the template?",
    opts: [
      "Set the role's PermissionsBoundary property to the DevBoundary policy's ARN.",
      "Add the DevBoundary policy ARN to the role's ManagedPolicyArns property.",
      "Name the DevBoundary policy ARN in the role's AssumeRolePolicyDocument.",
      "Add a stack policy that names DevBoundary for every resource in the stack."
    ], a: 0,
    no: [null,
      "ManagedPolicyArns attaches it as a permissions policy, not a boundary, so the request still sets no boundary.",
      "The trust policy says who can assume the role. It can't set a permissions boundary.",
      "A stack policy controls which resources a stack update may change. It doesn't set boundaries on roles."],
    why: "The iam:PermissionsBoundary condition checks the boundary set in the CreateRole request. In a template, the role's PermissionsBoundary property puts that ARN in the request, so the condition matches.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-iam-role.html",
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html"] },

  // Missing MFA key and IfExists (twin of dva-2-136), flip: in an Allow, plain Bool is the safe operator
  { id: "dva-2-982", exam: "DVA", dva: "2.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-136"],
    q: "A policy should allow ec2:TerminateInstances only for MFA-authenticated requests. Its Allow statement uses BoolIfExists with aws:MultiFactorAuthPresent true. Users can still terminate instances from the CLI with their long-term access keys and no MFA. What should the developer change?",
    opts: [
      "Change the operator to Bool, so requests that lack the key, like long-term key requests, don't match the Allow.",
      "Change the value to false, because the operator's result is reversed for requests signed with long-term keys.",
      "Change the operator to Null with the value true, so the Allow matches only when an MFA device is registered.",
      "Keep the Allow as it is, and add a Deny statement for the action with Bool aws:MultiFactorAuthPresent false."
    ], a: 0,
    no: [null,
      "Operators aren't reversed for any credential type. With false, the Allow would match the requests without MFA instead.",
      "Null tests whether the key is in the request, not whether a device is registered. Null true matches exactly the long-term key requests.",
      "A Bool Deny doesn't match requests that lack the key, so long-term key requests still get through the Allow."],
    why: "aws:MultiFactorAuthPresent is missing from requests signed with long-term keys. BoolIfExists treats a missing key as a match, so the Allow lets them in. With Bool, a missing key doesn't match, so only MFA requests are allowed.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html"] },

  // The sub claim decides which repo and branch can deploy (twin of dva-2-139)
  { id: "dva-2-983", exam: "both", dva: "2.1", saa: "1.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-139"],
    q: "A role trusts GitHub's OIDC provider for AssumeRoleWithWebIdentity, with aud equal to sts.amazonaws.com and a StringLike sub condition of repo:acme/*. A review finds that every repository in the acme organization can deploy to production. Only the main branch of acme/payments should. What should the developer change?",
    opts: [
      "Change the sub condition to StringEquals repo:acme/payments:ref:refs/heads/main in the role's trust policy.",
      "Change the aud condition to repo:acme/payments, so the role accepts only tokens issued for that repository.",
      "Set the sub condition to *, and limit which repositories may deploy in the role's permissions policy instead.",
      "Add an aws:SourceIp condition with GitHub's hosted runner ranges, so only the payments workflow can match it."
    ], a: 0,
    no: [null,
      "The aud claim names the token's audience, sts.amazonaws.com. The repository and branch are in the sub claim.",
      "IAM rejects a sub value that is only a wildcard. Permissions policies say what the role can do, not who can assume it.",
      "Hosted runner addresses are shared by all GitHub users, so they can't tell one repository or branch from another."],
    why: "The sub claim of a GitHub OIDC token names the repository and the ref, such as repo:org/repo:ref:refs/heads/main. Matching it exactly in the role's trust policy limits the role to that repository's main branch.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html"] },

  // Whole organization vs one OU (twin of dva-2-140), flip: the whole organization, so aws:PrincipalOrgID is right
  { id: "dva-2-984", exam: "both", dva: "2.1", saa: "1.1", topic: "s3", type: "mc", variant: true, twin: ["dva-2-140"],
    q: "A shared artifacts bucket must allow s3:GetObject to principals in every account of the company's organization, across all of its OUs, and to nobody outside it. Accounts are added and closed often, and the team doesn't want to edit the bucket policy when that happens. What should the developer put in the bucket policy?",
    opts: [
      "An Allow for Principal * with a condition that aws:PrincipalOrgID equals the organization's ID.",
      "An Allow for Principal * with aws:PrincipalOrgPaths matching the Production OU's path and a wildcard.",
      "An Allow for Principal * with a condition that aws:ResourceOrgID equals the organization's ID.",
      "An Allow for Principal * with a condition that aws:SourceOrgID equals the organization's ID."
    ], a: 0,
    no: [null,
      "That covers only accounts under the Production OU and its child OUs, not the rest of the organization.",
      "aws:ResourceOrgID checks the bucket's organization, which is always yours, so callers from outside would match too.",
      "aws:SourceOrgID applies only to requests made by AWS service principals, such as a service delivering logs."],
    why: "aws:PrincipalOrgID is the organization of the caller's account. Matching the organization's ID allows every member account, including new ones, with no policy edits. aws:PrincipalOrgPaths is for limiting access to particular OUs.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html"] },

  // Content rules vs rate-based rules in a web ACL (twin of dva-2-316), flip: clean requests from a few IPs, so a rate-based rule is right
  { id: "dva-2-985", exam: "DVA", dva: "2.1", topic: "waf", type: "mc", variant: true, twin: ["dva-2-316"],
    q: "A public Regional REST API has an AWS WAF web ACL on its stage with the AWS managed SQL database rule group. A scraper now sends thousands of well-formed GET requests a minute from a handful of IP addresses, overloading the backend. Other clients must not be slowed. What should the developer do?",
    opts: [
      "Add a rate-based rule to the web ACL that blocks any client IP above a set request count per 5 minutes.",
      "Add the AWS managed core rule set to the web ACL, so the scraper's requests are inspected and blocked.",
      "Lower the stage's default method throttling rate, so the API returns 429 errors once traffic gets too high.",
      "Add a request validator to each method, so requests missing their required query parameters are rejected."
    ], a: 0,
    no: [null,
      "Managed content rules look for exploits such as bad inputs or injection. The scraper's requests are well formed, so they pass.",
      "Stage throttling limits all callers together, so regular users get 429 errors too while the scraper keeps sending.",
      "Validators check that required parameters or a body are present. The scraper's requests already include them."],
    why: "A rate-based rule counts requests from each client IP over a trailing window and blocks an IP that goes over the limit, so only the flooding addresses are stopped. Content rules can't spot well-formed requests.",
    doc: ["https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based.html",
      "https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-aws-waf.html"] },

  // IsAuthorized vs IsAuthorizedWithToken (twin of dva-2-317), flip: no JWT, so plain IsAuthorized is right
  { id: "dva-2-986", exam: "DVA", dva: "2.1", topic: "verifiedpermissions", type: "mc", variant: true, twin: ["dva-2-317"],
    q: "A clinic's scheduling app keeps its rules as Cedar policies in Amazon Verified Permissions. Staff sign in through an older session system that issues opaque session IDs, not JWTs, and the backend looks up each user's ID and role in its own database. How should the backend ask for each authorization decision?",
    opts: [
      "Call IsAuthorized with the user as the principal, passing the user and its role group in the entities list.",
      "Add the session system as the policy store's identity source, and call IsAuthorizedWithToken with the session ID.",
      "Call IsAuthorizedWithToken with the session ID in the accessToken field, and the user's role in the context.",
      "Put a Cognito user pool authorizer on the API, and have it evaluate the Cedar policies on each request."
    ], a: 0,
    no: [null,
      "An identity source must be a Cognito user pool or an OIDC provider. A custom session system can't be one.",
      "IsAuthorizedWithToken takes a JWT from a configured identity source. An opaque session ID can't be validated or mapped.",
      "A Cognito authorizer validates user pool tokens and scopes. It can't evaluate Cedar policies, and these users have no such tokens."],
    why: "IsAuthorizedWithToken fits when a JWT from a Cognito user pool or OIDC identity source names the principal. Without one, the app builds the principal itself and calls IsAuthorized, passing the user and its groups as entities.",
    doc: ["https://docs.aws.amazon.com/verifiedpermissions/latest/apireference/API_IsAuthorized.html",
      "https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/identity-sources.html"] },

  // Federate into the user pool and map to a mutable attribute (twin of dva-2-321)
  { id: "dva-2-987", exam: "DVA", dva: "2.1", topic: "cognito", type: "mc", variant: true, twin: ["dva-2-321"],
    q: "A partner portal's API uses a Cognito user pool authorizer. Partner staff must sign in with the partner's OpenID Connect provider, and the backend needs each user's partner_tier claim from that provider as a claim in the user pool tokens. What should the developer do?",
    opts: [
      "Add the OIDC provider to the user pool, and map partner_tier to a new mutable custom:tier attribute.",
      "Add the OIDC provider to the user pool, and map partner_tier to a new immutable custom:tier attribute.",
      "Add the provider to a Cognito identity pool, and send the AWS credentials it returns to the API.",
      "Create an IAM OIDC identity provider for it, and call AssumeRoleWithWebIdentity with each user's token."
    ], a: 0,
    no: [null,
      "Mapped custom attributes must be mutable. When the provider sends a value for a mapped immutable attribute, sign-in fails.",
      "Identity pools hand out AWS credentials, not user pool tokens, so the API's Cognito authorizer rejects them.",
      "AssumeRoleWithWebIdentity returns temporary AWS credentials, not user pool tokens the Cognito authorizer accepts."],
    why: "A user pool can federate with an OIDC provider and issue its own tokens to federated users. Attribute mapping copies the provider's claims into user pool attributes, and a mapped custom attribute must be mutable.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-oidc-idp.html",
      "https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-specifying-attribute-mapping.html"] },

// Expired Identity Center sign-in is renewed by signing in again (twin of dva-2-322)
  { id: "dva-2-988", exam: "both", dva: "2.1", saa: "1.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-322"],
    q: "A developer set up an IAM Identity Center profile with aws configure sso last week, and her SDK scripts ran fine. This morning every call fails with an error saying her SSO session has expired. Security still allows no long-term keys on laptops. What should she do?",
    opts: [
      "Run aws sso login for the profile to sign in again, then rerun the scripts unchanged.",
      "Run aws configure with a new IAM user access key pair, so the scripts stop expiring.",
      "Call aws sts get-session-token, and paste its output into the ~/.aws/credentials file.",
      "Raise the role's maximum session duration in IAM, so cached role credentials last longer."
    ], a: 0,
    no: [null,
      "Access keys are long-term credentials, which security has banned from laptops. aws configure is for setting up keys and a Region.",
      "GetSessionToken returns temporary credentials for an IAM user. It doesn't renew an expired Identity Center sign-in.",
      "The CLI already renews role credentials while the Identity Center sign-in lasts. Once the sign-in expires, only signing in again helps."],
    why: "While the Identity Center sign-in is valid, the CLI and SDKs renew short-lived role credentials on their own. When the sign-in itself expires, aws sso login renews it, and the scripts keep reading the same profile.",
    doc: ["https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html"] },

  // BatchIsAuthorized needs a shared principal or resource (twin of dva-2-329)
  { id: "dva-2-989", exam: "DVA", dva: "2.1", topic: "verifiedpermissions", type: "mc", variant: true, twin: ["dva-2-329"],
    q: "A document app uses Amazon Verified Permissions. Its share dialog lists 20 teammates and greys out anyone who can't edit the open document, calling IsAuthorized once per teammate, which is slow. The team wants one call and the same Cedar policies. What should the developer do?",
    opts: [
      "Call BatchIsAuthorized once, with one edit request per teammate for the open document.",
      "Call BatchIsAuthorized once, with an edit request for each teammate on each document they own.",
      "Call IsAuthorized once with the team's group as principal, and apply it to every teammate.",
      "Cache each teammate's decision in the browser's local storage, and reuse it on later opens."
    ], a: 0,
    no: [null,
      "Batched requests must share the principal or the resource. Many teammates on many documents share neither, so it isn't evaluated.",
      "One decision for the group doesn't cover Cedar policies that permit or forbid one teammate by name.",
      "Decisions cached on the client can go stale or be changed by the user, so they can't be trusted."],
    why: "BatchIsAuthorized evaluates up to 30 requests in one call, as long as the principal or the resource is the same in all of them. Here the resource is the open document, and each request names a different teammate.",
    doc: ["https://docs.aws.amazon.com/verifiedpermissions/latest/apireference/API_BatchIsAuthorized.html"] },

  // Source IP vs forwarded IP for a rate-based rule (twin of dva-2-407), flip: no proxy, so the source IP is right
  { id: "dva-2-990", exam: "both", dva: "2.1", saa: "1.2", topic: "waf", type: "mc", variant: true, twin: ["dva-2-407"],
    q: "Clients reach an Application Load Balancer directly, with no CDN or proxy in front. Its AWS WAF rate-based rule aggregates on a forwarded IP from X-Forwarded-For. A scraper sends a random X-Forwarded-For value with each request and is never rate limited. What should the developer change?",
    opts: [
      "Make the rule aggregate on the source IP address, the address that connects to the ALB.",
      "Set the forwarded IP fallback behavior to match, so malformed header addresses are counted.",
      "Set the ALB's X-Forwarded-For processing mode to remove, so the header never reaches targets.",
      "Lower the rule's request limit, so each forwarded address is blocked after fewer requests."
    ], a: 0,
    no: [null,
      "Random addresses are still well formed, so the fallback never applies. It only decides how a malformed header is treated.",
      "That attribute changes the header the ALB sends on to its targets. It doesn't change which address the rate-based rule counts.",
      "Each request carries a new forged address, so every one counts as a new client however low the limit is."],
    why: "The source IP is the address that actually connected to the ALB. A header is just text the client sends, and attackers can alter it to slip past AWS WAF. A forwarded IP only helps behind a proxy that sets the header.",
    doc: ["https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-forwarded-ip-address.html",
      "https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-aggregation-options.html"] },

  // A statement applies only when its Condition matches (twin of dva-2-601), flip: the Condition is on a Deny, so the request is allowed
  { id: "dva-2-991", exam: "DVA", dva: "2.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-601"],
    ev: "[\n  {\n    \"Effect\": \"Allow\",\n    \"Action\": \"s3:GetObject\",\n    \"Resource\": \"arn:aws:s3:::trail-maps/*\"\n  },\n  {\n    \"Effect\": \"Deny\",\n    \"Action\": \"s3:*\",\n    \"Resource\": \"arn:aws:s3:::trail-maps/*\",\n    \"Condition\": { \"Bool\": { \"aws:SecureTransport\": \"false\" } }\n  }\n]",
    q: "These two statements are the only ones that apply. A user downloads arn:aws:s3:::trail-maps/summit.png over HTTPS. What happens?",
    opts: [
      "Allowed, because the Deny's Condition is false over HTTPS",
      "Denied, because an explicit Deny always overrides an Allow",
      "Denied, because the Deny's s3:* includes s3:GetObject",
      "Allowed, because Allow statements are evaluated first"
    ], a: 0,
    no: [null,
      "A Deny overrides an Allow only when it applies, and this one applies only to requests sent without TLS.",
      "The action matches, but a statement applies only when its Condition matches too, and over HTTPS it doesn't.",
      "Statement order doesn't matter. Every statement is checked, and any Deny that applies wins."],
    why: "A statement applies only when every element matches, the Condition included. Over HTTPS aws:SecureTransport is true, so the Deny never applies and the Allow grants the download.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html",
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html"] },

  // A trailing * in an object ARN spans slashes (twin of dva-2-602)
  { id: "dva-2-992", exam: "DVA", dva: "2.1", topic: "s3", type: "mc", variant: true, twin: ["dva-2-602"],
    q: "A statement allows s3:GetObject on arn:aws:s3:::trail-maps/routes/*. Which request does it allow?",
    opts: [
      "Getting trail-maps/routes/2026/east/ridge.png",
      "Getting trail-maps/routes.png at the top level",
      "Listing the keys under trail-maps/routes/",
      "Getting an object in the trail-routes bucket"
    ], a: 0,
    no: [null,
      "routes.png has no slash after routes, so it doesn't match the routes/ prefix that the ARN names.",
      "Listing keys is s3:ListBucket on the bucket's ARN, even when you list only one prefix.",
      "The ARN names the trail-maps bucket, so an object in any other bucket never matches."],
    why: "The * at the end of the ARN matches any run of characters, slashes included, so routes/* covers keys at any depth under routes/. Everything before the * still has to match exactly.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_resource.html"] },

  // Missing key: 404 with ListBucket, 403 without (twin of dva-2-603), flip: the role can list, so 404
  { id: "dva-2-993", exam: "DVA", dva: "2.1", topic: "s3", type: "mc", variant: true, twin: ["dva-2-603"],
    q: "A role has s3:GetObject on arn:aws:s3:::trail-locker/* and s3:ListBucket on arn:aws:s3:::trail-locker. It requests trail-locker/rope.txt, which doesn't exist. What does S3 return?",
    opts: [
      "404 Not Found, because the role may list the bucket",
      "403 Access Denied, to hide whether the key exists",
      "400 Bad Request, because the key isn't in the bucket",
      "200 OK with an empty body and a zero content length"
    ], a: 0,
    no: [null,
      "S3 hides a missing key behind 403 only from callers without s3:ListBucket. This role can list, so it gets the plain answer.",
      "400 is for a malformed request. A key that doesn't exist is still a well-formed one.",
      "S3 never makes up an empty object. A missing key is an error."],
    why: "With s3:ListBucket on the bucket, the caller could list the keys anyway, so S3 says plainly that the key is missing: 404 Not Found. Without it, S3 returns 403 so it doesn't reveal what exists.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html"] },

  // Who may assume a role: trust policy plus, across accounts, the caller's own policy (twin of dva-2-606), flip: the trust policy is fine, the caller's policy is missing
  { id: "dva-2-994", exam: "DVA", dva: "2.1", topic: "sts", type: "mc", variant: true, twin: ["dva-2-606"],
    ev: "An error occurred (AccessDenied) when calling the AssumeRole operation: User: arn:aws:sts::111122223333:assumed-role/hiker/kai is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::444455556666:role/cable-lift",
    q: "The cable-lift role in account 444455556666 has a trust policy naming account 111122223333 as its Principal. Kai's hiker role in 111122223333 has no policy that mentions sts:AssumeRole. What should change?",
    opts: [
      "Allow sts:AssumeRole on the cable-lift ARN in the hiker role's policy",
      "Name the hiker role as the Principal in cable-lift's trust policy",
      "Add sts:AssumeRole to the cable-lift role's own permissions policy",
      "Call GetSessionToken first, and then retry the same AssumeRole call"
    ], a: 0,
    no: [null,
      "The trust policy already lets the account in. Across accounts, the caller's own policy must also allow the call, whatever the trust policy names.",
      "Cable-lift's permissions say what it can do once assumed. Who may assume it is set by its trust policy and the caller's policy.",
      "GetSessionToken returns temporary credentials for an IAM user. It doesn't add any permission to call AssumeRole."],
    why: "Trusting an account lets that account decide which of its users and roles may assume the role. Its admin must still allow sts:AssumeRole on the role's ARN in the caller's own policy, since both accounts must allow the request.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_permissions-to-switch.html",
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html"] },

  // Least privilege: one action on one resource (twin of dva-2-608)
  { id: "dva-2-995", exam: "DVA", dva: "2.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-608"],
    q: "Your script used AdministratorAccess only to write items with PutItem to the Trails table in us-west-2, account 111122223333. Which statement would have been enough?",
    opts: [
      "Allow dynamodb:PutItem on arn:aws:dynamodb:us-west-2:111122223333:table/Trails",
      "Allow dynamodb:* on arn:aws:dynamodb:us-west-2:111122223333:table/Trails",
      "Allow dynamodb:PutItem on arn:aws:dynamodb:us-west-2:111122223333:table/*",
      "Allow dynamodb:PutItem on arn:aws:dynamodb:us-west-2:111122223333:table/Trails/index/*"
    ], a: 0,
    no: [null,
      "The right table, but every DynamoDB action on it, DeleteTable included.",
      "The right action, but on every table in that account and Region.",
      "That ARN covers the table's indexes, which you query. PutItem writes to the table itself."],
    why: "Least privilege: the one action the script used, on the one table it used it on. A table's ARN ends in table/ followed by the table's name.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html",
      "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/using-identity-based-policies.html"] },

  // PassRole vs AssumeRole (twin of dva-2-610), flip: handing a role to Lambda, so PassRole is right
  { id: "dva-2-996", exam: "DVA", dva: "2.1", topic: "sts", type: "mc", variant: true, twin: ["dva-2-610"],
    q: "Your deploy script used AdministratorAccess only to create a Lambda function that runs as the existing lift-worker role. Besides lambda:CreateFunction, what is the narrowest extra Allow?",
    opts: [
      "iam:PassRole on the lift-worker role's ARN",
      "sts:AssumeRole on the lift-worker role's ARN",
      "iam:PassRole on every role, Resource \"*\"",
      "iam:CreateRole on the lift-worker role's ARN"
    ], a: 0,
    no: [null,
      "Lambda assumes the execution role itself. AssumeRole is for taking on a role yourself, and the script never does.",
      "The right action, but it would let the script hand any role, admin roles included, to a service.",
      "CreateRole makes a new role. This one already exists, and the script only hands it to Lambda."],
    why: "Handing a role to a service, such as a Lambda function's execution role, needs iam:PassRole, and the narrowest Resource is that role's ARN. The service then assumes the role, not your script.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_passrole.html"] },

  // MFA condition key (twin of dva-2-612), flip: an existing broad Allow means only a Deny works
  { id: "dva-2-997", exam: "DVA", dva: "2.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-612"],
    q: "A role's existing policy allows s3:* on trail-maps/*, and it must stay as it is. Which statement, in a new policy for the role, makes deletes there need MFA?",
    opts: [
      "Deny s3:DeleteObject on trail-maps/* if BoolIfExists aws:MultiFactorAuthPresent is false",
      "Allow s3:DeleteObject on trail-maps/* if Bool aws:MultiFactorAuthPresent is true",
      "Deny s3:DeleteObject on trail-maps/* if BoolIfExists aws:MultiFactorAuthPresent is true",
      "Deny s3:DeleteObject on trail-maps/* if BoolIfExists aws:SecureTransport is false"
    ], a: 0,
    no: [null,
      "Allows only add access. The existing s3:* still allows deletes without MFA, so nothing is blocked.",
      "That refuses the sessions that did use MFA, and still lets role sessions without MFA delete.",
      "That blocks deletes sent over plain HTTP. It says nothing about MFA."],
    why: "Allows add up, so a new Allow can't take away what s3:* grants. Only a Deny can. BoolIfExists with false also catches requests made with long-term keys, where the MFA key is missing.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html",
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html"] },

  // Only STS decodes an authorization message, for callers allowed to (twin of dva-2-05)
  { id: "dva-2-998", exam: "DVA", dva: "2.1", topic: "iam", type: "mc", variant: true, twin: ["dva-2-05"],
    q: "A developer passes an encoded authorization failure message from EC2 to aws sts decode-authorization-message. That call fails with AccessDenied for sts:DecodeAuthorizationMessage. How can the developer find out why the original call was denied?",
    opts: [
      "Have an admin allow sts:DecodeAuthorizationMessage for the developer's identity, then retry.",
      "Decrypt the message with KMS Decrypt, using the AWS managed key that EC2 encrypted it with.",
      "Base64-decode the message locally, since STS only blocks decoding through its own API call.",
      "Add sts:DecodeAuthorizationMessage to the trust policy of the role the developer is using."
    ], a: 0,
    no: [null,
      "KMS Decrypt is for data encrypted under KMS keys. This message is decoded only by STS, for callers it allows.",
      "The message is encoded so callers can't read its privileged details. Only STS can decode it.",
      "A trust policy only says who may assume the role. Permission to call STS actions goes in a permissions policy."],
    why: "The message is encoded because it can hold details the caller shouldn't see. STS decodes it only for an identity whose IAM policy allows sts:DecodeAuthorizationMessage, and the result shows why the call was denied.",
    doc: ["https://docs.aws.amazon.com/STS/latest/APIReference/API_DecodeAuthorizationMessage.html"] },

// One env-vars entry for every function (twin of dva-3-111)
  { id: "dva-3-960", exam: "DVA", dva: "3.2", topic: "sam", type: "mc", variant: true, twin: ["dva-3-111"],
    q: "A SAM template sets STAGE to prod for all eight functions under Globals, in Environment Variables. To run the API on a laptop with sam local start-api, the developer wants every function to see STAGE as local, from one setting rather than eight, without editing the template. What should the developer do?",
    opts: [
      "Write an env-vars JSON file with STAGE under a top-level Parameters object, and pass it with --env-vars.",
      "Pass --parameter-overrides STAGE=local, so that the Globals value is replaced like a template parameter.",
      "Write an env-vars JSON file with STAGE under each of the eight functions' logical IDs, and pass it with --env-vars.",
      "Set STAGE=local under [default.deploy.parameters] in samconfig.toml, so local runs read the value there."
    ], a: 0,
    no: [null,
      "--parameter-overrides sets values in the template's Parameters section. STAGE is an environment variable set in Globals.",
      "It works, but it's eight entries to keep in step. A Parameters object sets the value for every function at once.",
      "The deploy section holds default options for sam deploy. It doesn't change environment variables in local runs."],
    why: "--env-vars overrides the template's environment variables in local runs of invoke and start-api. In the JSON file, a top-level Parameters object applies to every function, and an entry under a function's logical ID wins for that function.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-invoke.html"] },

  // start-api for HTTP callers (twin of dva-3-112), flip: start-api is right when the caller speaks HTTP to API routes
  { id: "dva-3-961", exam: "DVA", dva: "3.2", topic: "sam", type: "mc", variant: true, twin: ["dva-3-112"],
    q: "A web app on a laptop calls a SAM application's REST API routes, such as GET /orders, with fetch. The developer wants those calls to reach the template's functions running locally, without deploying anything, changing only the app's base URL. What should the developer do?",
    opts: [
      "Run sam local start-api, and set the app's base URL to the HTTP server it prints, such as http://127.0.0.1:3000.",
      "Run sam local start-lambda, and set the app's base URL to the endpoint it prints, such as http://127.0.0.1:3001.",
      "Run sam local generate-event apigateway aws-proxy for each route, and pass each event to sam local invoke.",
      "Run sam sync --watch to a dev stack, and set the app's base URL to that stack's API Gateway endpoint URL."
    ], a: 0,
    no: [null,
      "start-lambda emulates the Lambda Invoke API for the AWS CLI and SDKs. It doesn't serve the template's API routes over HTTP.",
      "That runs one function per event from the command line. It doesn't give the app an HTTP server to call.",
      "That deploys the functions and the API to the cloud, which the developer wants to avoid."],
    why: "sam local start-api runs a local HTTP server that serves the template's API routes and runs each route's function on the machine. sam local start-lambda is the one for callers that use the Lambda Invoke API through an SDK or the CLI.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-start-api.html",
      "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-start-lambda.html"] },

  // sam logs with --filter and --start-time (twin of dva-3-114)
  { id: "dva-3-962", exam: "DVA", dva: "3.2", topic: "sam", type: "mc", variant: true, twin: ["dva-3-114"],
    q: "Some requests to the deployed PaymentFunction in the SAM stack payments-prod failed in the past hour. From the terminal, the developer wants to see only that function's log lines containing \"Timeout\" from that hour, without looking up its log group name. What should the developer do?",
    opts: [
      "Run sam logs -n PaymentFunction --stack-name payments-prod with --filter Timeout and --start-time '60mins ago'.",
      "Run sam logs -n PaymentFunction --stack-name payments-prod with --include-traces, so only failed requests print.",
      "Run sam remote invoke PaymentFunction with --stack-name payments-prod, so the past hour's failed requests replay.",
      "Run sam local invoke PaymentFunction with --debug, so the deployed function's logs from that hour are printed."
    ], a: 0,
    no: [null,
      "--include-traces adds X-Ray traces to the output. It doesn't filter log lines by their text.",
      "remote invoke sends one new event to the deployed function. It doesn't replay or search past requests.",
      "sam local invoke runs a local copy of the function, and --debug prints SAM CLI debug messages, not deployed logs."],
    why: "sam logs finds a function's logs from its logical ID and stack name. --filter keeps only events that match a term or a CloudWatch Logs pattern, and --start-time sets how far back to look, which defaults to 10 minutes ago.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-logs.html"] },

  // test-event-pattern only checks matching (twin of dva-3-118), flip: a real put-events test is right when delivery is in question
  { id: "dva-3-963", exam: "DVA", dva: "3.2", topic: "eventbridge", type: "mc", variant: true, twin: ["dva-3-118"],
    q: "An EventBridge rule on a custom bus should send order events to a Lambda function. test-event-pattern returns true for the rule's pattern and a saved sample event, but in dev the function never runs. The developer wants to test the whole path with that sample: matching, delivery and permissions. What should the developer do?",
    opts: [
      "Call aws events test-event-pattern again with the sample event, and compare the result with the rule's pattern.",
      "Send the sample to the custom bus with put-events, then check the rule's FailedInvocations metric and function logs.",
      "Run sam local invoke on the function with the sample event as --event, and check the function's printed output.",
      "Publish the sample to an SNS topic that the function subscribes to, and then check the function's own logs."
    ], a: 1,
    no: [
      "test-event-pattern only checks whether an event matches a pattern. It never delivers to a target or checks permissions.",
      null,
      "That runs the function's code locally. It skips the rule, the delivery and the function's resource-based policy.",
      "SNS delivers to its own subscribers. That bypasses the EventBridge rule, so it tests a different path."],
    why: "TestEventPattern evaluates a pattern against an event without sending anything, so it can't find delivery problems. PutEvents sends a real event to the bus to be matched to rules, and the rule's metrics, such as FailedInvocations, show whether delivery to the target failed.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_TestEventPattern.html",
      "https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutEvents.html",
      "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-monitoring.html"] },

  // Rollback triggers watch alarms after the update (twin of dva-3-124)
  { id: "dva-3-964", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc", variant: true, twin: ["dva-3-124"],
    q: "A stack holds an Auto Scaling group of web servers behind an Application Load Balancer. A CloudWatch alarm watches the load balancer's target 5XX count. If the alarm fires during an update or in the 30 minutes after it deploys, CloudFormation must undo the whole update, with no custom code. What should the developer do?",
    opts: [
      "Pass the alarm's ARN as a rollback trigger, with a 30-minute monitoring time, in the update's rollback configuration.",
      "Add an UpdatePolicy with AutoScalingRollingUpdate and WaitOnResourceSignals, and a 30-minute PauseTime on the group.",
      "Leave rollback on failure turned on for the update, so CloudFormation reverts the stack when the alarm goes to ALARM.",
      "Add an alarm action that calls cancel-update-stack, so CloudFormation cancels the update as soon as the alarm fires."
    ], a: 0,
    no: [null,
      "Rolling updates wait for instance signals while instances are replaced. They don't watch the alarm after the update finishes.",
      "Rollback on failure reverts when a resource fails to create or update. It doesn't watch CloudWatch alarms.",
      "Alarm actions can't call CloudFormation directly, and cancel works only while the update is in progress, not after it."],
    why: "Rollback triggers make CloudFormation watch the listed CloudWatch alarms during a create or update, and for the monitoring time after all resources are deployed. If any alarm goes to ALARM, CloudFormation rolls back the entire stack operation.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-rollback-triggers.html"] },

  // Cancel vs continue rollback (twin of dva-3-129), flip: the update is still in progress, so cancel is right
  { id: "dva-3-965", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc", variant: true, twin: ["dva-3-129"],
    q: "A developer started a stack update that replaces a fleet's launch template, then noticed it uses the wrong AMI. The stack is still in UPDATE_IN_PROGRESS. The developer wants to stop the update now and return the stack to its configuration from before the update. What should the developer do?",
    opts: [
      "Run cancel-update-stack, so CloudFormation stops the update and rolls the stack back to its earlier settings.",
      "Run continue-update-rollback, so CloudFormation stops the update and rolls back the resources it has changed.",
      "Run update-stack again with the previous template, so CloudFormation replaces the in-progress update with it.",
      "Turn on termination protection for the stack, so CloudFormation halts the update before it changes more resources."
    ], a: 0,
    no: [null,
      "continue-update-rollback is for a stack stuck in UPDATE_ROLLBACK_FAILED. It doesn't stop an update that's still running.",
      "A stack can't take a new update while one is in progress. Updating again with old settings works after it finishes.",
      "Termination protection only stops the stack from being deleted. It has no effect on an update that's running."],
    why: "cancel-update-stack works only while the stack is in UPDATE_IN_PROGRESS, and rolls the stack back to the configuration it had before the update. continue-update-rollback is for a rollback that has already failed.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-update-cancel.html",
      "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-continueupdaterollback.html"] },

  // UpdateReplacePolicy covers replacement (twin of dva-3-130), flip: Snapshot is right here, on an RDS instance being replaced
  { id: "dva-3-966", exam: "both", dva: "3.3", saa: "1.3", topic: "cloudformation", type: "mc", variant: true, twin: ["dva-3-130"],
    q: "A stack's AWS::RDS::DBInstance has DeletionPolicy: Snapshot. A change to its Engine property will make CloudFormation replace the instance with a new one. The team wants a snapshot of the old instance's data, and doesn't want the old instance left running. Which setting on the resource meets these requirements?",
    opts: [
      "UpdateReplacePolicy: Snapshot, so CloudFormation takes a snapshot of the old instance before deleting it.",
      "UpdateReplacePolicy: Retain, so CloudFormation keeps the old instance and its data once the new one is up.",
      "DeletionPolicy: Retain in place of Snapshot, so the old instance is kept when the update replaces it.",
      "A stack policy that denies Update:Replace on the instance, so CloudFormation snapshots it instead of replacing it."
    ], a: 0,
    no: [null,
      "Retain keeps the old instance running, and billing, outside the stack, which the team doesn't want.",
      "DeletionPolicy applies when a stack or resource is deleted, not when an update replaces the resource.",
      "A stack policy can block the replacement, which makes the update fail. It never takes a snapshot."],
    why: "DeletionPolicy, including the Snapshot already set, doesn't apply to resources replaced during a stack update. UpdateReplacePolicy does, and its Snapshot option backs up the old DB instance before CloudFormation deletes it.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatereplacepolicy.html",
      "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html"] },

  // Cross-stack reference shares one deployed stack (twin of dva-3-131), flip: share one VPC, so export/import is right, not nesting
  { id: "dva-3-967", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc", variant: true, twin: ["dva-3-131"],
    q: "A network team runs one stack that creates a shared VPC and its subnets. Ten application stacks in the same account and Region must launch into those subnets, and must not create a VPC of their own. The application templates shouldn't hard-code subnet IDs. What should the developer do?",
    opts: [
      "Include the network template in each application template as a nested AWS::CloudFormation::Stack resource.",
      "Export the subnet IDs from the network stack's Outputs, and read them in each application with Fn::ImportValue.",
      "Deploy the network template with a StackSet to the account and Region, and have each application target it.",
      "Reference the network stack's subnet resources with Fn::GetAtt in each application, using their logical IDs."
    ], a: 1,
    no: [
      "A nested stack is created inside each parent, so every application would build its own copy of the VPC.",
      null,
      "StackSets deploy one template across accounts and Regions. They don't pass one stack's values into other stacks.",
      "Fn::GetAtt reads attributes of resources in the same template. It can't reach another stack's resources."],
    why: "A cross-stack reference shares one deployed stack's resources: the network stack exports output values, and other stacks in the same Region import them with Fn::ImportValue. Nested stacks reuse a template, so each parent gets its own copy.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/walkthrough-crossstackref.html",
      "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-nested-stacks.html"] },

  // Service-managed StackSet to an OU with auto deployment (twin of dva-3-132)
  { id: "dva-3-968", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc", variant: true, twin: ["dva-3-132"],
    q: "A security team must deploy a template that creates an AWS Config rule to every account in the organization's Workloads OU, in us-east-1 and eu-west-1. Accounts moved into that OU later must get it automatically, with no IAM roles created in each account by hand. What should the developer do?",
    opts: [
      "Create a StackSet with service-managed permissions targeting the Workloads OU in both Regions, with automatic deployment.",
      "Create a StackSet with self-managed permissions, and add each Workloads account and both Regions as its targets.",
      "Deploy the template from the management account as a nested stack, with one child stack per account and Region.",
      "Attach a service control policy to the Workloads OU that allows config:PutConfigRule in both Regions for each account."
    ], a: 0,
    no: [null,
      "Self-managed permissions need roles set up in every target account, and accounts added later aren't covered automatically.",
      "Nested stacks are created in the same account and Region as their parent stack.",
      "SCPs set limits on what accounts can do. They never grant permissions or create resources."],
    why: "With service-managed permissions, StackSets deploys to accounts managed by AWS Organizations and creates the roles it needs. Automatic deployment adds stack instances to accounts added to a target OU, and can delete or retain them when accounts leave.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-concepts.html",
      "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-manage-auto-deployment.html",
      "https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html"] },

// Bootstrap each account and Region (twin of dva-3-133): a second Region in an already bootstrapped account
  { id: "dva-3-969", exam: "DVA", dva: "3.3", topic: "cdk", type: "mc", variant: true, twin: ["dva-3-133"],
    q: "A CDK app with Lambda code assets has deployed to account 111122223333 in eu-west-1 for months. The team adds a stack for the same account in us-east-1. cdk synth works, but cdk deploy of the new stack fails because it can't find the CDK's asset bucket and deploy roles. What should the developer do?",
    opts: [
      "Run cdk bootstrap aws://111122223333/us-east-1 once, so that Region gets its own asset bucket and roles.",
      "Run cdk bootstrap again in eu-west-1 with --force, so the existing bootstrap stack covers the whole account.",
      "Run cdk synth with the --all option, so the new stack's assets are written to the eu-west-1 asset bucket.",
      "Run cdk init in us-east-1, so the CDK creates the deployment resources the new stack needs in that Region."
    ], a: 0,
    no: [null,
      "--force only redeploys the bootstrap stack in eu-west-1. Bootstrap resources serve one account and Region.",
      "synth writes templates and assets locally to cdk.out. It doesn't create anything in an account.",
      "cdk init starts a new CDK project from a template. It doesn't prepare an account or Region."],
    why: "A CDK environment is one account plus one Region, and environments are independent. Each one must be bootstrapped before stacks can deploy there, so a new Region needs its own cdk bootstrap even when the account already has one.",
    doc: ["https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html",
      "https://docs.aws.amazon.com/cdk/v2/guide/environments.html"] },

  // Usage plans throttle per API key (twin of dva-3-302), flip: clients do send keys, so the usage plan is right
  { id: "dva-3-970", exam: "DVA", dva: "3.2", topic: "apigateway", type: "mc", variant: true, twin: ["dva-3-302"],
    q: "A REST API's prod stage serves two partners, and its methods already require API keys. Each partner sends its own key. Partner A must be held to 50 requests per second and Partner B to 200, on the same methods. Other stages and APIs must not be affected. What should the developer do?",
    opts: [
      "Create two usage plans for the prod stage with rates of 50 and 200, and add each partner's key to its plan.",
      "Turn on stage-level throttling at 50 for prod, and add method-level throttling at 200 on the methods B calls.",
      "Set reserved concurrency on the backend Lambda function to 250, so the partners share that capacity.",
      "Ask AWS Support to set the account-level throttling limit in the Region to 200 requests per second."
    ], a: 0,
    no: [null,
      "Stage and method throttles apply to every caller of those methods, so they can't tell Partner A from Partner B.",
      "Concurrency caps the whole function for all callers. It can't give each partner its own rate.",
      "The account-level limit covers every API and stage in the Region, and it can't tell partners apart."],
    why: "Usage plans use API keys to identify clients, so a plan's throttle applies per key. Stage and method throttling are the right tool when callers send no keys, but they treat all callers alike.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html",
      "https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html"] },

  // DependsOn when a Ref isn't enough (twin of dva-3-304)
  { id: "dva-3-971", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc", variant: true, twin: ["dva-3-304"],
    q: "A template declares a VPC, an InternetGateway, a VPCGatewayAttachment, a route table, and an AWS::EC2::Route whose GatewayId is a Ref to the gateway. Creating the stack sometimes fails at the route, because the gateway isn't attached to the VPC yet. What should the developer do?",
    opts: [
      "Add a DependsOn attribute to the Route that names the VPCGatewayAttachment, so it is created after it.",
      "Change the route's GatewayId to a Fn::GetAtt of the gateway's ID, so the route waits for the gateway.",
      "Add a CreationPolicy with a 5-minute timeout to the attachment, so the route waits until it is attached.",
      "Set an UpdateReplacePolicy of Retain on the Route, so it isn't rolled back when the gateway attaches late."
    ], a: 0,
    no: [null,
      "GetAtt still ties the route only to the gateway, which can exist before the attachment does.",
      "CreationPolicy waits for success signals from resources such as EC2 instances. It doesn't order other resources.",
      "UpdateReplacePolicy decides what happens to an old resource on replacement. It doesn't change creation order."],
    why: "CloudFormation creates resources in parallel unless something links them. The Ref links the route to the gateway, not to the attachment, so routes through an internet gateway need DependsOn on the VPC gateway attachment.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-dependson.html"] },

  // Caching is set per stage, overridable per method (twin of dva-3-305), flip: turning caching off is right here
  { id: "dva-3-972", exam: "DVA", dva: "3.3", topic: "apigateway", type: "mc", variant: true, twin: ["dva-3-305"],
    q: "A REST API's prod stage has a cache, with default method-level caching on and a 300-second TTL. GET /stock must now always return live counts, while every other GET method keeps its cache. What should the developer do?",
    opts: [
      "Add a method override that turns caching off for GET /stock, and keep the stage's cache and default settings.",
      "Turn off the prod stage's cache, and add an ElastiCache cluster that the other GET methods' backends use.",
      "Schedule a Lambda function that flushes the prod stage's whole cache every 30 seconds for the stock counts.",
      "Add the item ID to GET /stock as a cache key parameter, so that each item's count is cached on its own."
    ], a: 0,
    no: [null,
      "It works, but it adds a cluster and cache code to replace a cache the stage already has.",
      "Counts are still up to 30 seconds old, and every flush also wipes the other methods' entries.",
      "Cache keys decide which responses are stored apart. Each item's count would still be cached."],
    why: "Stage caching sets the default for the stage's GET methods, and a method override can turn caching on or off, or change the TTL, for one method. The stage keeps its cache for everything else.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html"] },

  // Amplify variable for all branches plus a branch override (twin of dva-3-312)
  { id: "dva-3-973", exam: "DVA", dva: "3.3", topic: "amplify", type: "mc", variant: true, twin: ["dva-3-312"],
    q: "An Amplify Hosting app uses branch auto-detection, so each new feature/* branch gets its own build. Feature builds must call the dev API and only main must call the production API, through the API_URL build variable. New branches appear daily. What should the developer do with the LEAST effort?",
    opts: [
      "Set API_URL for all branches to the dev URL, and add a variable override on main with the production URL.",
      "Add API_URL with the dev URL to each feature branch's settings in the console as soon as Amplify connects it.",
      "Create a second Amplify app for the main branch, and set API_URL in that app to the production URL instead.",
      "Add a rewrite rule to each feature branch that sends the site's production API requests to the dev API."
    ], a: 0,
    no: [null,
      "It works, but someone must add it by hand for every new branch, every day.",
      "It works, but it duplicates the app and its settings, which is more work than one override.",
      "Rewrite rules change paths the hosted site serves. They don't change which API the built app calls."],
    why: "Amplify applies environment variables to all branches by default, so auto-detected branches get the dev value with no extra step. A variable override gives main its own value.",
    doc: ["https://docs.aws.amazon.com/amplify/latest/userguide/setting-env-vars.html"] },

  // Optimistic locking with a revision check (twin of dva-3-323), flip: the alias is what changes, so RevisionId is right
  { id: "dva-3-974", exam: "DVA", dva: "3.3", topic: "lambda", type: "mc", variant: true, twin: ["dva-3-323"],
    q: "Two release pipelines can both move a Lambda function's live alias. Each calls GetAlias, checks which version live points at, runs checks, then calls UpdateAlias with its own new version. If the other pipeline moved the alias in the meantime, the update must fail instead. What should the developer do?",
    opts: [
      "Pass the RevisionId from GetAlias to UpdateAlias, so the alias moves only if nobody changed it since.",
      "Pass the new code's CodeSha256 to PublishVersion, so the version is published only if the code matches.",
      "Set the function's reserved concurrency to 0 during the checks, so the other pipeline can't move the alias.",
      "Give the live alias a 50/50 weighted routing config, so both pipelines' versions are served if they collide."
    ], a: 0,
    no: [null,
      "That guards the version's code against other uploads. It doesn't stop the alias being moved twice.",
      "Reserved concurrency throttles invocations. It doesn't block alias updates, and it stops live traffic.",
      "Weighted routing is for gradual shifts between two versions. It doesn't detect a conflicting update."],
    why: "UpdateAlias takes an optional RevisionId and updates only if the alias still has that revision. Each pipeline gets the ID from its own GetAlias call, so a change by the other pipeline makes the update fail.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/api/API_UpdateAlias.html"] },

  // Retag in ECR with put-image (twin of dva-3-324)
  { id: "dva-3-975", exam: "DVA", dva: "3.3", topic: "ecr", type: "mc", variant: true, twin: ["dva-3-324"],
    q: "A release step runs in a CodeBuild project with no Docker daemon. It must give the ECR image tagged rc-7 a second tag, prod, in the same repository, so the deploy stage can find it. What should the developer do?",
    opts: [
      "Get the image manifest with aws ecr batch-get-image, then call aws ecr put-image with it and --image-tag prod.",
      "Call aws ecr tag-resource on the repository with a tag of prod, so the deploy stage can find the image by it.",
      "Add a replication rule to the repository that copies the rc-7 image into the same repository tagged prod.",
      "Turn on tag immutability for the repository, so the rc-7 tag is locked and ECR adds the prod tag to that image."
    ], a: 0,
    no: [null,
      "tag-resource adds AWS resource tags to the repository for billing and access control. It doesn't tag images.",
      "Replication copies images to other Regions or accounts. It can't add a tag in the same repository.",
      "Tag immutability stops tags from being overwritten. It never adds tags."],
    why: "ECR can retag an existing image by putting its manifest again with a new tag, without Docker pulling or pushing anything. The image's layers stay where they are.",
    doc: ["https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-retag.html",
      "https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_TagResource.html"] },

  // L1 constructs cover every CloudFormation resource (twin of dva-3-326), flip: with no L2, the Cfn class is right
  { id: "dva-3-976", exam: "DVA", dva: "3.3", topic: "cdk", type: "mc", variant: true, twin: ["dva-3-326"],
    q: "A CDK app needs a resource type that CloudFormation supports, but the CDK library has no L2 construct for it yet. The team wants it in the same stack as their L2 resources, defined in code and deployed with cdk deploy. What should the developer do?",
    opts: [
      "Use the generated L1 construct for that resource type, whose name starts with Cfn, and set its properties.",
      "Create an L2 construct for a related service, and set the resource up through its node.defaultChild.",
      "Write the resource in a separate template, and paste it into the files in cdk.out after each cdk synth.",
      "Add the resource's type and properties to the stack as tags, so that CloudFormation creates it from them."
    ], a: 0,
    no: [null,
      "defaultChild is the L1 of that L2's own resource. It can't turn into a different resource type.",
      "cdk deploy synthesizes again and overwrites cdk.out, so the pasted resource is lost.",
      "Tags are key-value labels on resources. They don't define resources."],
    why: "L1 constructs are generated from the CloudFormation resource specification, so every CloudFormation resource has one, named Cfn plus the resource. With no L2 yet, the L1 is the way to define it in code.",
    doc: ["https://docs.aws.amazon.com/cdk/v2/guide/constructs.html"] },

  // Event shape depends on the integration (twin of dva-3-328), flip: moving from 2.0 back to the REST proxy shape
  { id: "dva-3-977", exam: "DVA", dva: "3.3", topic: "apigateway", type: "mc", variant: true, twin: ["dva-3-328"],
    q: "A Lambda function was written for an HTTP API with payload format 2.0, and reads event.rawPath and event.requestContext.http.method. The team moves it behind a REST API method with Lambda proxy integration, to use usage plans. Now both fields are undefined. What should the developer do?",
    opts: [
      "Read event.path and event.httpMethod in the function, and replace its test events with REST proxy events.",
      "Turn off Lambda proxy integration on the method, so API Gateway passes the request on to it unchanged.",
      "Move the function to the newest version of its runtime, so it reads REST API events with 2.0 field names.",
      "Set a stage variable named payloadFormatVersion to 2.0 on the stage, so events arrive in the 2.0 shape."
    ], a: 0,
    no: [null,
      "Without proxy integration, the function gets what a mapping template builds, by default just the body.",
      "The runtime doesn't change the event API Gateway sends.",
      "Stage variables are values the API's settings can read. Payload format versions belong to HTTP API integrations."],
    why: "A REST API proxy integration sends the event shape that HTTP APIs call 1.0, with path and httpMethod at the top. Format 2.0, with rawPath and requestContext.http.method, is a setting of HTTP API Lambda integrations.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html",
      "https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html"] },

// ALB rule conditions for pre-release testing (twin of dva-3-407), flip: fixed office IP and no custom headers, so source-ip wins
  { id: "dva-3-978", exam: "DVA", dva: "3.2", topic: "elb", type: "mc", variant: true, twin: ["dva-3-407"],
    q: "A green target group sits behind the same ALB listener as the live blue one. QA must try green through the production hostname before customers reach it. QA works only from the office, whose traffic leaves through one fixed NAT address, and their browsers can't add custom headers. What should the developer configure?",
    opts: [
      "A listener rule with an http-header condition on an X-Test header that forwards to green, ahead of the default rule.",
      "A listener rule with a source-ip condition for the office's NAT address that forwards to green, ahead of the default rule.",
      "A listener rule with a host-header condition for green.example.com that forwards matching requests to green.",
      "A weighted forward action on the default rule that sends 5% of all requests to green and the other 95% to blue."
    ], a: 1,
    no: [
      "Header conditions suit clients that can set headers. QA's browsers can't, so no request would match.",
      null,
      "Host conditions route by hostname, but QA must use the production hostname, not a separate one.",
      "Weighted routing is for gradual rollouts. It sends real customers to green before QA has tested it."],
    why: "Listener rules are checked in priority order and the default rule comes last. A source-ip condition matches requests from the listed CIDR blocks, so a fixed office address can reach green while everyone else follows the default rule to blue.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-condition-types.html",
      "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-rules.html"] },

  // Generated sample events for local invoke (twin of dva-3-930)
  { id: "dva-3-979", exam: "DVA", dva: "3.2", topic: "sam", type: "mc", variant: true, twin: ["dva-3-930"],
    q: "A Lambda function cleans up thumbnails when an object is deleted from an S3 bucket. The developer wants to run it on their laptop with a realistic delete event for one particular key, before deploying any changes. What should they do with the SAM CLI?",
    opts: [
      "Run sam local generate-event s3 delete, edit the object key in the output file, then run sam local invoke with --event.",
      "Run sam local start-lambda, then delete the object from the real bucket so S3 sends the event to the local endpoint.",
      "Run sam remote invoke with the function's logical ID and an event file, which runs the function in a local container.",
      "Run sam local start-api, then send the delete event to the local endpoint as the body of an HTTP POST request."
    ], a: 0,
    no: [
      null,
      "start-lambda serves the Lambda API to SDK and CLI callers on your machine. A real bucket can't send events to it.",
      "remote invoke calls the function already deployed in the cloud, which hasn't got the new changes.",
      "start-api serves the template's API routes. An HTTP body isn't an S3 event, and this function has no API route."],
    why: "sam local generate-event prints sample events shaped like the ones the service really sends, and the file can be edited, for example to set the object key. sam local invoke then runs the function once in a local container with that event.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-generate-event.html",
      "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-invoke.html"] },

  // Local Lambda endpoint for SDK callers (twin of dva-3-931), flip: start-lambda is right this time
  { id: "dva-3-980", exam: "DVA", dva: "3.2", topic: "sam", type: "mc", variant: true, twin: ["dva-3-931"],
    q: "Integration tests call three functions from a SAM template with the AWS SDK's Lambda invoke method. The developer wants the tests to run those functions on their laptop, using the local code, without deploying. What should they run before starting the tests?",
    opts: [
      "sam local start-api, then point the tests' HTTP client at the local routes it prints for each of the three functions.",
      "sam local start-lambda, then set the SDK Lambda client's endpoint to the local address that the command prints.",
      "sam local invoke for each function, which keeps the three functions listening for SDK calls until it is stopped.",
      "sam sync --watch, which runs the three functions on the developer's laptop and reloads them on each file change."
    ], a: 1,
    no: [
      "start-api serves the template's API routes to HTTP clients and browsers. The tests call the Lambda Invoke API instead.",
      null,
      "sam local invoke runs one function once with one event and exits. It doesn't listen for SDK calls.",
      "sam sync deploys changes to a stack in the cloud. It doesn't run anything locally."],
    why: "sam local start-lambda starts a local endpoint that emulates the Lambda service, so the AWS CLI and SDKs can invoke template functions on the developer's machine once their endpoint is set to it. start-api is the one for HTTP routes.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-start-lambda.html",
      "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-start-api.html"] },

  // Unit tests with mocks vs tests in the cloud (twin of dva-3-932), flip: deploying a test stack is right this time
  { id: "dva-3-981", exam: "DVA", dva: "3.2", topic: "testing", type: "mc", variant: true, twin: ["dva-3-932"],
    q: "A function's unit tests mock every SDK call, and they all pass. After each release, the function fails in the cloud with AccessDenied errors, because its execution role is missing permissions. The pipeline must catch this before code reaches production. What should the developer add?",
    opts: [
      "More SDK mocks that return AccessDenied errors, so that the unit tests also cover the permission error paths.",
      "A step that runs each function with sam local invoke, so the code runs in a container like the Lambda runtime.",
      "A stage that deploys the stack to a test account and runs integration tests against its real resources there.",
      "X-Ray active tracing on the function, so that missing permissions are reported to the team before each release."
    ], a: 2,
    no: [
      "Mocks test the code's error handling, but they can't tell whether the real role allows a call.",
      "A local container runs the code on the build machine, not under the deployed execution role, so role gaps stay hidden.",
      null,
      "X-Ray traces real invocations after they happen. It doesn't check a role's permissions ahead of a release."],
    why: "Mocks keep unit tests fast, but they never touch real security policies. Tests in the cloud run the deployed code with its real role and services, so CI should run them on a test environment before promoting the code.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/testing-guide.html"] },

  // DynamoDB local for offline integration tests (twin of dva-3-937)
  { id: "dva-3-982", exam: "DVA", dva: "3.2", topic: "dynamodb", type: "mc", variant: true, twin: ["dva-3-937"],
    q: "Integration tests query a DynamoDB table and its global secondary index. The CI runners have no network route to AWS, and every test run must start with an empty table that no one else uses. What should the tests run against?",
    opts: [
      "A table that sam local start-api creates in a local container from the template's AWS::DynamoDB::Table resource.",
      "An on-demand table in a separate test account, which the test suite deletes and creates again before each run.",
      "A mocked DynamoDB client that answers each of the tests' Query calls with matching items from a JSON file.",
      "DynamoDB local in a Docker container started by the job, with the SDK client's endpoint set to the container."
    ], a: 3,
    no: [
      "start-api runs functions behind local API routes. It doesn't emulate DynamoDB or create the template's tables.",
      "A real table needs a network route to AWS and credentials, and these runners have neither.",
      "A mock returns canned items, so the real key conditions and index behaviour are never tested.",
      null],
    why: "DynamoDB local is a downloadable version of DynamoDB, available as a Docker image, that supports the same API. Apps work with it by changing only the endpoint, and the credentials it gets don't have to be real.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html",
      "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.UsageNotes.html"] },

  // Invoking a deployed function directly (twin of dva-3-938)
  { id: "dva-3-983", exam: "DVA", dva: "3.2", topic: "lambda", type: "mc", variant: true, twin: ["dva-3-938"],
    q: "A function in a deployed SAM stack named orders-dev is normally triggered by an EventBridge rule that isn't set up yet. From a terminal, a developer wants to send the deployed function a saved event and see its response and logs. What should they run?",
    opts: [
      "sam local invoke with the function's logical ID and --event, which sends the saved event to the deployed function.",
      "sam local start-lambda, then call the function by name with the AWS CLI so the request reaches the orders-dev stack.",
      "aws events put-events with the saved event, so that EventBridge delivers it straight to the deployed function.",
      "sam remote invoke with the function's logical ID, --stack-name orders-dev and --event-file set to the saved event."
    ], a: 3,
    no: [
      "sam local invoke runs a local copy of the function in a container. It never calls the deployed one.",
      "start-lambda's endpoint runs function code on the developer's machine, not in the Lambda service.",
      "EventBridge delivers events only to targets of rules that match them, and there's no rule yet.",
      null],
    why: "sam remote invoke calls resources already deployed in the cloud. It finds the function by logical ID in the named stack, takes the event from --event or --event-file, and prints the response and the logs.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-remote-invoke.html",
      "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-start-lambda.html"] },

  // Stack outputs for values created at deploy time (twin of dva-3-939)
  { id: "dva-3-984", exam: "DVA", dva: "3.2", topic: "testing", type: "mc", variant: true, twin: ["dva-3-939"],
    q: "After sam deploy, a CI job builds a single-page web app that needs the stack's API endpoint URL. The URL is generated during deployment and changes whenever the stack is replaced. How should the job get the current URL?",
    opts: [
      "Call Fn::ImportValue from the web app's build script, so it imports the URL from the deployed stack's exports.",
      "Read the URL from samconfig.toml, where sam deploy writes the endpoint addresses of the resources it creates.",
      "Give the API a fixed Name property in the template, so that its endpoint URL stays the same on every deployment.",
      "Declare the URL as a stack output, then read it after the deploy with sam list stack-outputs or describe-stacks."
    ], a: 3,
    no: [
      "Fn::ImportValue is a template function for cross-stack references. A build script can't call it.",
      "samconfig.toml holds the options sam commands run with, such as the stack name. Deploy results aren't written there.",
      "The Name is a label. The endpoint URL contains an ID that API Gateway generates for each new API.",
      null],
    why: "An Outputs value can hold anything the stack creates, such as an API URL built with intrinsic functions. describe-stacks and sam list stack-outputs return it from the stack as it is now, so the build always gets the live address.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html",
      "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-list-stack-outputs.html",
      "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-importvalue.html"] },

  // Exports share one resource, nested stacks reuse a template (twin of dva-3-07), flip: nested stack is right this time
  { id: "dva-3-985", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc", variant: true, twin: ["dva-3-07"],
    q: "Every app stack at a company needs its own Application Load Balancer, all set up the same way. Today the load balancer resources are pasted into each app template, so every fix must be made many times. What should the developer do?",
    opts: [
      "Create one load balancer in a shared stack, export its ARN, and read it with Fn::ImportValue in each app stack.",
      "Move the load balancer into its own template, and add it to each app stack as an AWS::CloudFormation::Stack resource.",
      "Put the load balancer settings in a Mappings section, and copy that section into each of the app templates.",
      "Put the load balancer settings in Parameters with Default values, and set those defaults in each app template."
    ], a: 1,
    no: [
      "Exports share one existing resource between stacks. Every app would use the same load balancer, not its own.",
      null,
      "Mappings are fixed lookup values in a template. The section would still be copied and fixed in every template.",
      "Parameters take values at deploy time. The resources and defaults would still be repeated in every template."],
    why: "Nested stacks turn a common piece, such as a load balancer setup, into a dedicated template that other templates include with AWS::CloudFormation::Stack. Each parent gets its own copy, and a fix is made once.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-nested-stacks.html",
      "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-exports.html"] },

  // Amazon Q Developer IDE actions (twin of dva-3-502), flip: Refactor is right this time
  { id: "dva-3-986", exam: "DVA", dva: "3.3", topic: "qdeveloper", type: "mc", variant: true, twin: ["dva-3-502"],
    q: "In VS Code with Amazon Q Developer, a developer has a long function full of nested if statements. It works and is well tested, but reviewers can't follow it. They want Amazon Q to suggest an easier-to-read version they can insert. After highlighting the function and right-clicking, what should they choose?",
    opts: [
      "Amazon Q and then Explain, which rewrites the function so that it is easier for reviewers to read.",
      "Amazon Q and then Generate tests, which rewrites the function so each branch can be tested alone.",
      "Amazon Q and then Refactor, which suggests a more readable version that can be inserted in the file.",
      "Amazon Q and then Fix, which rewrites the function's nested branches to be shorter and more readable."
    ], a: 2,
    no: [
      "Explain describes the code in natural language. It doesn't produce new code to insert.",
      "Generate tests writes unit tests for the selected code. It doesn't change the function itself.",
      null,
      "Fix is for debugging code that has a bug. This function already works, and readability is the goal."],
    why: "Amazon Q Developer's code actions each do one job: Explain describes, Fix debugs, Generate tests writes unit tests, Optimize targets performance and Refactor improves readability or efficiency. Generated code can be inserted straight into the file.",
    doc: ["https://docs.aws.amazon.com/amazonq/latest/qdeveloper-ug/explain-update-code.html"] },

// Tumbling window state on a DynamoDB stream (twin of dva-1-202)
  { id: "dva-1-982", exam: "both", dva: "1.2", saa: "3.5", topic: "lambda", type: "mc", variant: true, twin: ["dva-1-202"],
    q: "A Lambda function reads the DynamoDB stream of a Votes table. For each shard it must report how many votes were cast in every 5-minute period. The team doesn't want a separate table or cache to hold the counts between invocations. What should the developer do?",
    opts: [
      "Set TumblingWindowInSeconds to 300 on the mapping, return the count as state, and report it on the final invoke.",
      "Set MaximumBatchingWindowInSeconds to 300 on the mapping, so each invocation receives five minutes of records.",
      "Keep a running count in a variable outside the handler, and report it once five minutes pass since the last one.",
      "Set the stream view type to NEW_AND_OLD_IMAGES, so that each record carries the earlier count for adding up."
    ], a: 0,
    no: [null,
      "A batching window only caps how long Lambda waits to fill a batch. A full batch can end it early, so it isn't a fixed period.",
      "Execution environments can be recycled or run side by side, so a count kept in memory can be lost or split.",
      "Images show an item before and after one change. They don't add up records across invocations or keep state."],
    why: "With a tumbling window, Lambda passes each invocation the state returned by the previous one in the same window, so the count carries over without a database. When isFinalInvokeForWindow is true the window is complete, and that is where the function reports.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-windows.html"] },

  // Function URL auth types (twin of dva-1-204), flip: the caller can't sign SigV4, so NONE plus a check in code
  { id: "dva-1-983", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc", variant: true, twin: ["dva-1-204"],
    q: "A payment vendor sends webhooks to a Lambda function over HTTPS. The vendor has no AWS credentials and can't sign requests with SigV4; it adds an HMAC signature header made with a shared secret instead. The team doesn't want to build or run an API in front of the function. What should the developer do?",
    opts: [
      "Create a function URL with the AWS_IAM auth type, and grant the vendor's webhook sender permission to invoke it.",
      "Create a function URL with the NONE auth type, and have the function check the vendor's HMAC header on each call.",
      "Add a function URL to published version 3 of the function, so that the vendor always calls one fixed version.",
      "Put an Application Load Balancer in front of the function, with a listener rule that checks each HMAC header."
    ], a: 1,
    no: [
      "AWS_IAM accepts only SigV4-signed requests from IAM principals, so every call from a sender without AWS credentials is rejected.",
      null,
      "A function URL can point only at $LATEST or an alias, not a numbered version, and this adds no authentication.",
      "Listener rules match on fields such as headers and paths, but they can't verify a signature, so the function would still have to."],
    why: "A caller that can't sign with SigV4 can't use the AWS_IAM auth type. With NONE, Lambda does no authentication of its own, so the function's code verifies the vendor's signature before it acts on the call.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html"] },

  // Handler setting is file.export (twin of dva-1-209)
  { id: "dva-1-984", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc", variant: true, twin: ["dva-1-209"],
    q: "A Node.js Lambda function's handler setting is index.handler. A developer refactors index.mjs so it exports the entry point as export const main = async (event) => {...}, then uploads the new .zip package. Every invocation now fails because the runtime can't find the handler. What should the developer do?",
    opts: [
      "Change the function's handler setting to index.main, which names the file and the exported function.",
      "Move the code into a Lambda layer, so that the runtime can find the module that it fails to load.",
      "Change the function's runtime to a newer Node.js version, which finds any exported function itself.",
      "Set a HANDLER environment variable to main, which tells the runtime which export it should call."
    ], a: 0,
    no: [null,
      "The file loads fine. The runtime asks it for an export named handler, and a layer doesn't change that.",
      "Every Node.js runtime calls the export named in the handler setting.",
      "The runtime reads the handler from the function's configuration, not from a variable like this."],
    why: "The Node.js handler setting is the file name and the exported function's name, separated by a dot. After the rename, index.handler points at an export that no longer exists, so the setting must become index.main.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html"] },

  // S3 trigger loop, broken with a key filter (twin of dva-1-210)
  { id: "dva-1-985", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc", variant: true, twin: ["dva-1-210"],
    q: "An S3 notification for all object-created events invokes a Lambda function. For each uploaded .csv file, the function uses PutObject to write a .json summary next to it under the same prefix, and the team needs both kept side by side. The function keeps triggering itself. Which change stops the loop?",
    opts: [
      "Add a .csv suffix filter to the notification, so that the function's .json summaries send no events.",
      "Change the notification's event type to s3:ObjectCreated:Put, so only direct uploads send events.",
      "Set the function's reserved concurrency to 1, so that only one copy of the function runs at a time.",
      "Add an on-failure destination to the function, so repeated events are moved aside after retries."
    ], a: 0,
    no: [null,
      "The function writes its summaries with PutObject too, so they still match this event type and invoke it again.",
      "The loop just runs one invocation at a time, and real uploads queue up behind it.",
      "A destination only receives failed events. These invocations succeed, and every summary is a new event."],
    why: "The function's own .json writes match the notification, so each one fires a new event. A suffix filter limits the notification to keys ending in .csv, so the summaries can share the prefix without invoking the function.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html",
      "https://docs.aws.amazon.com/AmazonS3/latest/userguide/notification-how-to-filtering.html"] },

  // Event filtering on the mapping, Kinesis data key (twin of dva-1-213)
  { id: "dva-1-986", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc", variant: true, twin: ["dva-1-213"],
    q: "A Lambda function reads a Kinesis data stream of JSON clickstream events through an event source mapping. It only acts on events whose eventType is \"purchase\" and returns early for the other 95%. The developer wants to stop these wasted invocations without changing the producers. What should the developer do?",
    opts: [
      "Add filter criteria to the event source mapping that match records whose data has eventType purchase.",
      "Lower the event source mapping's batch size to 1, so each invocation handles one event and ends sooner.",
      "Register the function as an enhanced fan-out consumer, so it reads only the records it needs per shard.",
      "Add an SNS subscription filter policy on eventType, so only purchase events reach the function's mapping."
    ], a: 0,
    no: [null,
      "Smaller batches mean more invocations, not fewer, and every other event still reaches the function.",
      "Enhanced fan-out gives a consumer its own read throughput per shard. It still reads every record.",
      "SNS filter policies belong on subscriptions to an SNS topic. A Kinesis stream isn't a topic, so there's nothing to attach one to."],
    why: "Event filtering on the event source mapping drops records that match no pattern before Lambda invokes the function. For Kinesis, patterns match fields inside the JSON in the data key.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis-filtering.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html"] },

  // Extensions vs log subscriptions (twin of dva-1-215), flip: functions can't be changed, so a subscription filter
  { id: "dva-1-987", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc", variant: true, twin: ["dva-1-215"],
    q: "A security team must forward every Lambda function's logs to a third-party monitoring service with an HTTPS endpoint. The functions belong to other teams, and the security team may not change any function's code or configuration. The logs already reach CloudWatch Logs. What should the developer do?",
    opts: [
      "Add the vendor's Lambda extension to each function as a layer, so it sends logs from inside each environment.",
      "Add a subscription filter to the log groups that sends logs to a Firehose stream with the vendor's HTTP endpoint.",
      "Subscribe to each function's logs through the Lambda Telemetry API from a collector that runs on an EC2 instance.",
      "Turn on X-Ray active tracing for each function, and grant the vendor's account permission to read the traces."
    ], a: 1,
    no: [
      "Adding a layer changes each function's configuration, which the security team isn't allowed to do.",
      null,
      "The Telemetry API serves extensions inside a function's execution environment, not collectors outside it.",
      "Tracing is a function setting too, and X-Ray holds request traces, not the log lines the vendor needs."],
    why: "A subscription filter sends a log group's events to another service soon after they arrive, and Firehose can deliver them to an HTTP endpoint, without touching any function. An extension would run inside each environment, but it has to be added to every function as a layer.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Subscriptions.html",
      "https://docs.aws.amazon.com/firehose/latest/dev/what-is-this-service.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/telemetry-api.html"] },

  // Base64 on the record data (twin of dva-1-317), flip: Firehose transformation output must be encoded
  { id: "dva-1-988", exam: "DVA", dva: "1.2", topic: "kinesis", type: "mc", variant: true, twin: ["dva-1-317"],
    q: "A Firehose stream invokes a Python Lambda function to transform records. The function base64-decodes each record's data, adds a field, and returns {recordId, result: \"Ok\", data: json.dumps(item)}. Firehose treats every record as a transformation failure. What should the developer do?",
    opts: [
      "Base64-encode the transformed JSON before putting it in data, which is the format Firehose expects back.",
      "Return the records as a plain JSON array without recordId, so that Firehose matches them up in order.",
      "Grant the function's role kms:Decrypt for the stream's key, so it reads the data before transforming it.",
      "Set result to \"Dropped\" for each record, so that Firehose delivers the transformed data without checks."
    ], a: 0,
    no: [null,
      "Each returned record must carry the recordId it came with. A missing or mismatched ID is itself a transformation failure.",
      "The function already decodes and reads the data. What fails is the format of what it returns.",
      "Dropped tells Firehose the record was dropped on purpose, so the transformed data would never be delivered."],
    why: "Every record a transformation function returns needs its recordId, a result and a data payload that is base64-encoded. Plain JSON in data makes Firehose reject the record as a failed transformation.",
    doc: ["https://docs.aws.amazon.com/firehose/latest/dev/data-transformation-status-model.html"] },

  // EFS writes need IAM and POSIX permission (twin of dva-1-330), flip: IAM is fine, the directory owner is wrong
  { id: "dva-1-989", exam: "DVA", dva: "1.2", topic: "efs", type: "mc", variant: true, twin: ["dva-1-330"],
    q: "A Lambda function mounts EFS through an access point that enforces POSIX user 1001. Its root directory, /reports, was made earlier by root on an EC2 instance, owned by root with mode 755. The execution role has ClientMount and ClientWrite. Reads work, but writes fail with permission denied. What should the developer do?",
    opts: [
      "Add elasticfilesystem:ClientRootAccess to the execution role, so that the function writes as root.",
      "From an instance that mounts the file system as root, make user 1001 the owner of /reports.",
      "Increase the function's ephemeral storage, so it has room to write files before they reach EFS.",
      "Change the function's local mount path from /mnt/reports to /tmp, which every function can write."
    ], a: 1,
    no: [
      "The access point makes every request as user 1001. ClientRootAccess only matters for requests made as root.",
      null,
      "Ephemeral storage is the function's own /tmp space. It doesn't change permissions on the EFS mount.",
      "Lambda's local mount path must start with /mnt/, and moving it wouldn't change who owns the directory."],
    why: "The role already allows writes, so the denial comes from POSIX permissions: EFS checks user 1001 against a directory that root owns with mode 755. Only root can change an owner, so root makes 1001 the owner.",
    doc: ["https://docs.aws.amazon.com/efs/latest/ug/accessing-fs-nfs-permissions.html",
      "https://docs.aws.amazon.com/efs/latest/ug/efs-access-points.html"] },

  // itemIdentifier per event source (twin of dva-1-905), flip: streams use the sequence number, not a message ID
  { id: "dva-1-990", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc", variant: true, twin: ["dva-1-905"],
    q: "A Python Lambda function reads a Kinesis data stream with ReportBatchItemFailures on. The code came from an SQS function, so for a failed record it returns record.get(\"messageId\") as the itemIdentifier. That value is null, and Lambda retries the whole batch. What should the function return as the itemIdentifier?",
    opts: [
      "The record's kinesis.sequenceNumber, which Lambda uses as the checkpoint for retrying the batch.",
      "The record's kinesis.partitionKey, which Lambda uses to find the shard holding the failed record.",
      "The record's receiptHandle, which Lambda uses to put just that one record back to be retried.",
      "The record's eventSourceARN, which Lambda uses to tell which stream the failed record came from."
    ], a: 0,
    no: [null,
      "A partition key is shared by many records and picks their shard. It doesn't identify one record.",
      "Receipt handles belong to SQS messages. Kinesis records don't have one, and a record can't go back on a stream.",
      "The ARN is the same for every record in the batch, so it can't point at the record that failed."],
    why: "For Kinesis and DynamoDB streams, batchItemFailures lists sequence numbers. Lambda checkpoints at the lowest one returned and retries from there, so the records before it aren't processed again.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-batchfailurereporting.html"] },

  // Runtime interface emulator for local tests (twin of dva-1-332), flip: a non-AWS base image needs the emulator added
  { id: "dva-1-991", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc", variant: true, twin: ["dva-1-332"],
    q: "A developer builds a Python Lambda container image from the official python:3.12 image and installs awslambdaric, the runtime interface client. Before pushing to ECR, on a laptop with only Docker, docker run -p 9000:8080 starts it, but POSTs to localhost:9000/2015-03-31/functions/function/invocations fail. What should the developer do?",
    opts: [
      "Run the image the same way again, since every Lambda container image has the emulator for local tests.",
      "Download the runtime interface emulator, mount it into the container, and run it as the entrypoint.",
      "Push the image to Amazon ECR, create a function from it, and send it the test events with aws lambda invoke.",
      "Set the image's CMD to lambda_function.handler, so the client knows which function to run for each POST."
    ], a: 1,
    no: [
      "Only AWS base images ship with the emulator. This image has just the runtime interface client that was installed.",
      null,
      "That tests the function in AWS, but the developer wants to test the image on the laptop before pushing it.",
      "The client already takes the handler from CMD. Nothing serves the local endpoint until the emulator runs."],
    why: "AWS base images include the runtime interface emulator, but an image built on another base has only the runtime interface client. Running the emulator, built into the image or mounted from the laptop, provides the local endpoint that the event JSON is posted to.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/python-image.html"] },

  // ---------------------------------------------------------------- Batch 4 (Nov 16): twins for Security (2.2, 2.3) and
  // Deployment (3.1, 3.4) questions that had none. Facts checked against the linked AWS docs on Nov 16, 2026 (js/verified.js).
  // SSE-C presigned URLs need the key headers (twin of dva-2-758)
  { id: "dva-2-450", exam: "DVA", dva: "2.2", topic: "s3", type: "mc", variant: true, twin: ["dva-2-758"],
    q: "A support tool creates presigned GET URLs for objects stored with SSE-C, and staff paste them into a browser. S3 rejects the requests, though the URLs are unexpired, correctly signed and use HTTPS. What should the developer do?",
    opts: [
      "Fetch each object in code with its presigned URL, and send the SSE-C algorithm, key and key MD5 headers too.",
      "Give the signing role kms:Decrypt on the bucket's KMS key, so that S3 can decrypt objects for the URLs.",
      "Create the URLs with a longer expiry time, so that S3 has time to load each object's stored key first.",
      "Turn on SSE-S3 default encryption for the bucket, so the existing objects can be read without a key."
    ], a: 0,
    no: [null,
      "SSE-C doesn't use KMS. S3 decrypts only with the key sent in the request headers. kms:Decrypt matters for SSE-KMS objects.",
      "S3 doesn't store SSE-C keys, only a salted HMAC to check them. Expiry only limits how long a URL stays valid.",
      "Default encryption doesn't change objects already in the bucket. Objects stored with SSE-C still need their key on every GET."],
    why: "S3 keeps no copy of an SSE-C key, so every GET must carry the key in the SSE-C headers. A browser can't add those headers to a pasted URL, so presigned URLs for SSE-C objects work only from code.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/specifying-s3-c-encryption.html",
      "https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-bucket-encryption.html"] },

  // Multi-Region keys are enabled and disabled one by one (twin of dva-2-854)
  { id: "dva-2-451", exam: "DVA", dva: "2.2", topic: "kms", type: "mc", variant: true, twin: ["dva-2-854"],
    q: "After an incident, an admin disables a multi-Region primary KMS key in us-east-1. An hour later, an app in eu-west-1 still decrypts data with the key's replica there. All use of the key must stop in both Regions now. What should the admin do?",
    opts: [
      "Disable the replica key in eu-west-1 as well, since each related multi-Region key is enabled or disabled on its own.",
      "Wait for KMS to copy the disabled state to the replica, which it does at the primary key's next automatic rotation.",
      "Remove the eu-west-1 app's role from the primary key's key policy, since the replica is governed by that same policy.",
      "Schedule the primary key for deletion, since deleting a primary key also deletes each of its replica keys with it."
    ], a: 0,
    no: [null,
      "Rotation is shared between related keys, but key state isn't. Each key is enabled or disabled separately.",
      "Each multi-Region key has its own key policy. The replica's policy, not the primary's, controls access in eu-west-1.",
      "KMS won't delete a primary key until all its replicas are deleted, so this does nothing to stop the replica now."],
    why: "Related multi-Region keys share key material, key ID and rotation, but each one is managed on its own: its key policy, grants, aliases and whether it's enabled. Disabling the primary leaves the replica enabled, so it must be disabled too.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html"] },

  // Cancel, then enable (twin of dva-2-855), flip: EnableKey alone is now the trap
  { id: "dva-2-452", exam: "DVA", dva: "2.2", topic: "kms", type: "mc", variant: true, twin: ["dva-2-855"],
    q: "A developer scheduled a customer managed KMS key for deletion by mistake, and the key is still in its waiting period. Apps that use the key now fail. What must the developer do so the apps can decrypt with the key again?",
    opts: [
      "Call EnableKey on the key, which ends the pending deletion and sets the key state back to Enabled.",
      "Call CancelKeyDeletion on the key and then call EnableKey, since a cancelled key is left Disabled.",
      "Call CancelKeyDeletion on the key only, which puts it back in the state it had before it was scheduled.",
      "Create a new key and import the old key's material into it, since a pending key can't be brought back."
    ], a: 1,
    no: [
      "A key pending deletion can't be enabled: EnableKey fails with KMSInvalidStateException. The deletion must be cancelled first.",
      null,
      "Cancelling always leaves the key Disabled, whatever its state was before. It needs EnableKey before it can be used.",
      "A key can be recovered while it's pending deletion, by cancelling. Importing material is for keys created without key material."],
    why: "A key pending deletion can't be used or enabled until its deletion is cancelled. CancelKeyDeletion then leaves the key Disabled, so EnableKey is needed as well before the apps can use it.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys-cancelling-key-deletion.html",
      "https://docs.aws.amazon.com/kms/latest/developerguide/key-state.html"] },

  // Grant token for a brand-new grant (twin of dva-2-204)
  { id: "dva-2-453", exam: "DVA", dva: "2.2", topic: "kms", type: "mc", variant: true, twin: ["dva-2-204"],
    q: "An orchestrator calls CreateGrant to let a job's role call Decrypt on a KMS key, then starts the job at once. The job's first Decrypt call sometimes fails with AccessDeniedException, and the same call works a minute later. It must work on the first try. What should the developer change?",
    opts: [
      "Pass the grant token that CreateGrant returns to the job, and send it in GrantTokens on each Decrypt call.",
      "Have the job call ListGrants on the key first, and send the grant token it finds in its own Decrypt calls.",
      "Pass the grant ID that CreateGrant returns to the job, and send it as the KeyId on each of its Decrypt calls.",
      "Name the job's role as the grant's retiring principal, so that the grant applies to the role straight away."
    ], a: 0,
    no: [null,
      "CreateGrant is the only operation that returns a grant token. ListGrants returns grant IDs, which are for managing grants.",
      "KeyId names the KMS key. A grant ID identifies the grant for retiring or revoking it, not for using its permissions.",
      "A retiring principal is only allowed to retire the grant. It does nothing about how fast a new grant takes effect."],
    why: "Grants are eventually consistent, so a brand-new grant can briefly be unknown to parts of KMS. Sending the grant token from CreateGrant lets the grantee use the grant's permissions immediately.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/using-grant-token.html",
      "https://docs.aws.amazon.com/kms/latest/developerguide/grants.html"] },

  // ReEncrypt has its own permissions (twin of dva-2-205)
  { id: "dva-2-454", exam: "DVA", dva: "2.2", topic: "kms", type: "mc", variant: true, twin: ["dva-2-205"],
    q: "A migration script calls ReEncrypt to move stored ciphertexts from KMS key A to key B. Its role is allowed kms:Decrypt on key A and kms:Encrypt on key B, yet every call fails with AccessDeniedException. What should the developer change?",
    opts: [
      "Allow the role kms:ReEncryptFrom on key A and kms:ReEncryptTo on key B, in each key's key policy.",
      "Allow the role kms:Decrypt on key B as well, so that KMS can check the new ciphertext it returns.",
      "Allow the role kms:GenerateDataKey on key B, so KMS can make a new data key for each ciphertext.",
      "Allow the role kms:CreateGrant on key A, so KMS can pass each ciphertext on to key B for the role."
    ], a: 0,
    no: [null,
      "ReEncrypt checks only kms:ReEncryptFrom and kms:ReEncryptTo. kms:Decrypt is for Decrypt calls, which return plaintext to the caller.",
      "GenerateDataKey makes new data keys for envelope encryption. ReEncrypt doesn't use it; it needs its own two permissions.",
      "CreateGrant lets the role give others permissions on key A. It doesn't stand in for the permissions ReEncrypt checks."],
    why: "ReEncrypt decrypts and re-encrypts inside KMS, and it has its own permissions: kms:ReEncryptFrom on the source key and kms:ReEncryptTo on the destination key. Decrypt and Encrypt permissions don't cover it.",
    doc: ["https://docs.aws.amazon.com/kms/latest/APIReference/API_ReEncrypt.html"] },

  // Single-Region keys can't become multi-Region (twin of dva-2-207), flip: re-encrypting is now required
  { id: "dva-2-455", exam: "DVA", dva: "2.2", topic: "kms", type: "mc", variant: true, twin: ["dva-2-207"],
    q: "Records in us-east-1 are encrypted under an existing single-Region KMS key and copied to eu-west-1. During a us-east-1 outage, the eu-west-1 app must decrypt them without calling KMS in us-east-1. What should the developer do?",
    opts: [
      "Call ReplicateKey on the existing key to make a replica in eu-west-1, and decrypt the records with it.",
      "Set the existing key's MultiRegion property to true, then replicate it so eu-west-1 can decrypt them.",
      "Create a multi-Region primary key with an eu-west-1 replica, and re-encrypt the records under it.",
      "Create a grant on the existing key for the eu-west-1 app's role, so it can decrypt from either Region."
    ], a: 2,
    no: [
      "ReplicateKey works only on a multi-Region primary key. An existing single-Region key can't be replicated.",
      "The multi-Region property is set when a key is created. It can't be changed on an existing key.",
      null,
      "A grant adds permission, but the key still lives only in us-east-1, so every call goes to the Region that's down."],
    why: "A single-Region key can't be converted to a multi-Region key or replicated. To move existing data into a multi-Region setup, you create a new multi-Region key, replicate it, and re-encrypt the data under it. Then either Region can decrypt locally.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html",
      "https://docs.aws.amazon.com/kms/latest/APIReference/API_ReplicateKey.html"] },

  // Data key caching with thresholds (twin of dva-2-209)
  { id: "dva-2-456", exam: "DVA", dva: "2.2", topic: "kms", type: "mc", variant: true, twin: ["dva-2-209"],
    q: "A Lambda function uses the AWS Encryption SDK to encrypt each order event before writing it to DynamoDB, with a new data key per event. At peak, GenerateDataKey calls get ThrottlingException. Security allows each data key to protect up to 500 events within 5 minutes. What should the developer do?",
    opts: [
      "Use a caching cryptographic materials manager with a local cache, a 5-minute maximum age and a 500-message limit.",
      "Turn on an S3 Bucket Key for the function's KMS key, so KMS reuses one key to make the data keys for many events.",
      "Keep one data key in Secrets Manager, and have each invocation fetch it and encrypt that invocation's events with it.",
      "Create a second KMS key and send half the GenerateDataKey calls to it, so that each key gets its own request quota."
    ], a: 0,
    no: [null,
      "S3 Bucket Keys cut KMS calls for SSE-KMS objects in S3. They're a bucket setting and do nothing for events written to DynamoDB.",
      "That stores one plaintext data key indefinitely, with no age or message limits, and moves the request load to Secrets Manager.",
      "The quota for cryptographic operations is shared by all symmetric keys in the account and Region, so a second key adds none."],
    why: "Data key caching lets the Encryption SDK reuse a data key within thresholds you set, such as maximum age and maximum messages encrypted. Fewer GenerateDataKey calls mean lower cost and less throttling.",
    doc: ["https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/thresholds.html",
      "https://docs.aws.amazon.com/kms/latest/developerguide/requests-per-second.html"] },

  // Verify in KMS when checks must be logged (twin of dva-2-210), flip: the public key download is now the trap
  { id: "dva-2-457", exam: "DVA", dva: "2.2", topic: "kms", type: "mc", variant: true, twin: ["dva-2-210"],
    q: "An internal service on AWS must check signatures that another service made with an asymmetric SIGN_VERIFY KMS key. Auditors require a CloudTrail record of every check, and access to verify must be controlled by the key policy. How should the service check each signature?",
    opts: [
      "Call the KMS Verify operation with the key ID, the message, the signature and the signing algorithm.",
      "Call GetPublicKey once, cache the public key, and verify each signature locally with a crypto library.",
      "Call the KMS VerifyMac operation with the key ID and the signature, so that each check is logged.",
      "Call the KMS Decrypt operation on the signature, and compare its output with a hash of the message."
    ], a: 0,
    no: [null,
      "Local checks aren't logged in CloudTrail, and the key policy can't control them. They suit verifiers that can't call KMS.",
      "VerifyMac checks HMAC tags made with a GENERATE_VERIFY_MAC key. Signatures from a SIGN_VERIFY key are checked with Verify.",
      "Decrypt needs a key with ENCRYPT_DECRYPT key usage. A SIGN_VERIFY key works only for signing and verifying."],
    why: "Verify runs inside KMS, so each check is logged in CloudTrail, and key policy and IAM policy decide who may verify. Downloading the public key is the choice when verifiers can't call KMS.",
    doc: ["https://docs.aws.amazon.com/kms/latest/APIReference/API_Verify.html"] },

  // ACM renews only certificates in use (twin of dva-2-211), flip: the CNAME is fine this time
  { id: "dva-2-458", exam: "DVA", dva: "2.2", topic: "acm", type: "mc", variant: true, twin: ["dva-2-211"],
    q: "A public ACM certificate validated by DNS was taken off an ALB during a migration. It hasn't been attached to anything or exported since, and its validation CNAME record is still in the public zone. ACM didn't renew it at its renewal check. What is the most likely cause?",
    opts: [
      "It isn't in use by any AWS service, which ACM checks before it renews a DNS-validated certificate.",
      "The CNAME record must be deleted and added again before each renewal, so that ACM sees it as new.",
      "ACM renews only certificates that are imported into it, so an issued one must be requested again.",
      "ACM switches to email validation for certificates not in use, and nobody approved the renewal email."
    ], a: 0,
    no: [null,
      "ACM checks that the existing record is present and resolvable. Leaving it in place is what lets renewal work.",
      "It's the other way round: imported certificates aren't eligible for managed renewal, and ACM-issued ones are.",
      "ACM re-validates with the method chosen when the certificate was issued, here DNS. It doesn't switch to email."],
    why: "At renewal, ACM renews a DNS-validated certificate only if it's in use by an AWS service and every validation CNAME record is still in public DNS. Here the record is fine, but nothing uses the certificate.",
    doc: ["https://docs.aws.amazon.com/acm/latest/userguide/dns-renewal-validation.html",
      "https://docs.aws.amazon.com/acm/latest/userguide/renew-publicly-trusted.html",
      "https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html"] },

  // Require one KMS key with the key ID condition (twin of dva-2-212)
  { id: "dva-2-459", exam: "DVA", dva: "2.2", topic: "s3", type: "mc", variant: true, twin: ["dva-2-212"],
    q: "A bucket must hold only objects encrypted with one customer managed KMS key. Its policy denies s3:PutObject when s3:x-amz-server-side-encryption isn't aws:kms. Uploads that name a different KMS key, or the AWS managed key, still succeed. What should the developer change?",
    opts: [
      "Deny s3:PutObject when s3:x-amz-server-side-encryption-aws-kms-key-id isn't the required key's full ARN.",
      "Set the bucket's default encryption to the required key, so that S3 uses that key for every upload.",
      "Turn on an S3 Bucket Key for the bucket, so every object's data key is made from the required key.",
      "Deny s3:PutObject when the KMS key ID header is Null, so every upload has to name a KMS key itself."
    ], a: 0,
    no: [null,
      "Default encryption applies only when a request has no encryption headers. A request that names another key still gets that key.",
      "A Bucket Key lowers the cost of KMS requests for SSE-KMS. It doesn't stop a request from naming a different key.",
      "That only checks that some key ID is sent. An upload that names any other KMS key still passes."],
    why: "The s3:x-amz-server-side-encryption-aws-kms-key-id condition key checks which KMS key S3 will use, and S3 denies the upload unless it matches the key ARN in the policy. Checking for aws:kms alone accepts any KMS key.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html",
      "https://docs.aws.amazon.com/AmazonS3/latest/userguide/default-bucket-encryption.html"] },

  // DSSE-KMS by request header (twin of dva-2-213)
  { id: "dva-2-460", exam: "both", dva: "2.2", saa: "1.3", topic: "s3", type: "mc", variant: true, twin: ["dva-2-213"],
    q: "A data team's upload tool sends each PutObject with x-amz-server-side-encryption set to aws:kms and a customer managed key ID. An auditor says the files now need two independent layers of encryption at rest, applied by S3 with that same key. What should the developer change?",
    opts: [
      "Set the x-amz-server-side-encryption header to aws:kms:dsse, and keep the same customer managed key ID.",
      "Add x-amz-server-side-encryption-bucket-key-enabled set to true, so a bucket-level key adds a layer.",
      "Also send SSE-C headers with a key the tool generates, so S3 encrypts with both that key and KMS.",
      "Turn on S3 Object Lock in compliance mode, so that the encrypted files can't be overwritten or deleted."
    ], a: 0,
    no: [null,
      "Bucket Keys cut the cost of SSE-KMS requests. They add no layer, and DSSE-KMS doesn't support them.",
      "S3 can't apply two types of server-side encryption to one object. SSE-C is for keys you send with every request.",
      "Object Lock gives write-once-read-many retention. It doesn't change how many encryption layers protect a file."],
    why: "DSSE-KMS is requested with the header value aws:kms:dsse and uses a KMS key to apply two independent layers of AES-256 encryption, where standard SSE-KMS applies one.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/specifying-dsse-encryption.html",
      "https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingDSSEncryption.html"] },

  // Client-side encryption with a key kept outside KMS (twin of dva-2-215)
  { id: "dva-2-461", exam: "DVA", dva: "2.2", topic: "s3", type: "mc", variant: true, twin: ["dva-2-215"],
    q: "An on-premises Java backup tool uploads archives to S3. A new rule says AWS must never receive the archives in plaintext, and the key that protects them must stay on premises, so it can't be placed in KMS. What should the developer do?",
    opts: [
      "Use the Amazon S3 Encryption Client with a Raw AES-GCM wrapping key, so archives are encrypted before upload.",
      "Upload with SSE-C, sending the company's 256-bit key with each request, so S3 never stores the key itself.",
      "Import the company's key material into a KMS key, and upload the archives with SSE-KMS using that key.",
      "Upload with DSSE-KMS and a customer managed key, so that two independent layers of encryption protect each archive."
    ], a: 0,
    no: [null,
      "With SSE-C, S3 receives the plaintext and the key and encrypts the data itself. SSE-C is for server-side encryption with your own key.",
      "This puts the key in KMS, which the rule forbids, and S3 still receives the plaintext to encrypt it.",
      "Both layers are applied by S3 after it receives the plaintext. DSSE-KMS is for multilayer encryption at rest."],
    why: "Client-side encryption encrypts each object locally with a unique data key, so S3 only ever receives ciphertext. The S3 Encryption Client can wrap the data keys with a Raw AES-GCM key you hold yourself instead of a KMS key.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingClientSideEncryption.html",
      "https://docs.aws.amazon.com/amazon-s3-encryption-client/latest/developerguide/concepts.html"] },

  // Switch an existing table's key type (twin of dva-2-216), flip: the AWS managed key is now the answer
  { id: "dva-2-462", exam: "DVA", dva: "2.2", topic: "dynamodb", type: "mc", variant: true, twin: ["dva-2-216"],
    q: "A DynamoDB table uses the default AWS owned key. Auditors now need to see each use of the table's key in CloudTrail. The team doesn't need to edit the key's policy, wants no monthly key fee, and can't take the table offline. Which solution needs the LEAST effort?",
    opts: [
      "Switch the table's encryption to a customer managed KMS key that the team creates for this table.",
      "Switch the table's encryption to the AWS managed key aws/dynamodb, which is kept in the account.",
      "Create a new table encrypted with aws/dynamodb, copy every item into it, and point the app at it.",
      "Turn on CloudTrail data events for the table, so that every read and write on it is logged."
    ], a: 1,
    no: [
      "Its use shows in CloudTrail too, but a customer managed key has a monthly fee. It's for when you must control the key policy.",
      null,
      "The key type can be switched on the existing table at any time, so recreating it is extra work.",
      "Data events log calls to the table. An AWS owned key's use still can't be audited in your CloudTrail."],
    why: "DynamoDB lets you switch an existing table between key types at any time. An AWS managed key sits in your account, its use can be audited in CloudTrail, and it has no monthly fee. An AWS owned key's use can't be audited.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EncryptionAtRest.html",
      "https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html"] },

  // Public vs private certificates (twin of dva-2-220), flip: browsers must trust it, so a public ACM certificate
  { id: "dva-2-463", exam: "both", dva: "2.2", saa: "1.3", topic: "acm", type: "mc", variant: true, twin: ["dva-2-220"],
    q: "A customer-facing web app runs behind an Application Load Balancer at shop.example.com, with DNS in Route 53. Customers' browsers must trust the certificate, and the team wants renewals to happen with no manual steps. Which solution meets these requirements?",
    opts: [
      "Request a private certificate through ACM from an AWS Private CA, and attach it to the HTTPS listener.",
      "Request a public ACM certificate with email validation, and attach it to the load balancer's listener.",
      "Request a public ACM certificate with DNS validation, keep its CNAME record, and attach it to the listener.",
      "Buy a certificate from a public CA, import it into ACM, and attach it to the load balancer's HTTPS listener."
    ], a: 2,
    no: [
      "Private certificates are trusted only where the CA's root is installed, so browsers reject them. Private CA is for internal services.",
      "Renewing an email-validated certificate needs the domain owner to act on an email, so it isn't hands-off.",
      null,
      "Browsers trust it, but ACM doesn't renew imported certificates. Someone must get and reimport each renewal."],
    why: "Public ACM certificates are trusted by browsers. With DNS validation, ACM renews the certificate automatically as long as it's in use and its CNAME record stays in place.",
    doc: ["https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html",
      "https://docs.aws.amazon.com/acm/latest/userguide/renew-private-cert.html"] },

  // Session Manager in a subnet without internet (twin of dva-2-301)
  { id: "dva-2-464", exam: "DVA", dva: "2.2", topic: "ssm", type: "mc", variant: true, twin: ["dva-2-301"],
    q: "EC2 instances in a private subnet with no internet or NAT route must be reached with Session Manager. They have an instance profile with AmazonSSMManagedInstanceCore and a current SSM Agent, but they never show up as managed nodes. What should the developer do?",
    opts: [
      "Create interface endpoints for ssm, ssmmessages and ec2messages, with a security group allowing HTTPS from the subnet.",
      "Create a gateway endpoint for Systems Manager, and add it to the subnet's route table so the agent can reach it.",
      "Allow inbound HTTPS on the instances' security group from Systems Manager, so the service can reach each agent.",
      "Turn on Default Host Management Configuration, so Systems Manager can manage the instances without the profile."
    ], a: 0,
    no: [null,
      "Gateway endpoints exist only for Amazon S3 and DynamoDB. Systems Manager is reached through interface endpoints.",
      "SSM Agent opens every connection outbound, so no inbound rule is needed. The agent still has no path to the service.",
      "It replaces instance profiles, and the profile is already in place. The agent still has no network path to the service."],
    why: "SSM Agent initiates all connections to Systems Manager over HTTPS. Without internet or NAT access, the subnet needs interface VPC endpoints for ssm, ssmmessages and ec2messages, and the endpoints' security group must allow port 443 from the instances.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html",
      "https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html"] },

  // Reimport needs the existing ARN (twin of dva-2-324)
  { id: "dva-2-465", exam: "DVA", dva: "2.2", topic: "acm", type: "mc", variant: true, twin: ["dva-2-324"],
    q: "An imported ACM certificate from a third-party authority is attached to an ALB listener and expires next week. A developer runs import-certificate with the renewed certificate's files, and it returns a new ARN. The listener still serves the old certificate and must not be edited. What should the developer do?",
    opts: [
      "Run import-certificate again with --certificate-arn set to the old certificate's ARN, replacing it in place.",
      "Delete the old imported certificate, so the listener moves to the newest certificate for the same domain.",
      "Call RenewCertificate on the old certificate, so ACM pulls the renewed one from the third-party authority.",
      "Wait for the old certificate to expire, after which ACM moves the listener to the newer import for the domain."
    ], a: 0,
    no: [null,
      "ACM won't delete a certificate that another service is using, and a listener doesn't switch certificates on its own.",
      "ACM has no managed renewal for imported certificates. RenewCertificate is for eligible certificates that ACM issued.",
      "ACM doesn't move associations between certificates. An import without the ARN is a separate, unattached certificate."],
    why: "To renew an imported certificate, you reimport it with the existing certificate's ARN. That replaces it while keeping its ARN and service associations, so the listener serves the renewed certificate. Leaving the ARN out imports a new certificate.",
    doc: ["https://docs.aws.amazon.com/acm/latest/userguide/import-reimport.html",
      "https://docs.aws.amazon.com/acm/latest/APIReference/API_ImportCertificate.html"] },

  // Everything cross-account secret access needs (twin of dva-2-328)
  { id: "dva-2-466", exam: "DVA", dva: "2.2", topic: "secrets", type: "mc", variant: true, twin: ["dva-2-328"],
    q: "A Lambda function in account B must read a database secret owned by account A in the same Region, using its own execution role without assuming a role in account A. Which setup lets the function read the secret?",
    opts: [
      "A customer managed key that allows the role, a resource policy and role policy that allow it, and the full ARN as SecretId.",
      "A customer managed key that allows the role, a resource policy and role policy that allow it, and the name as SecretId.",
      "The aws/secretsmanager key, a resource policy and role policy that allow the role, and the full ARN as SecretId.",
      "A customer managed key that allows the role, only a role policy that allows the secret, and the full ARN as SecretId."
    ], a: 0,
    no: [null,
      "To read a secret from another account, GetSecretValue must be given its ARN. A name is for secrets in the caller's own account.",
      "The AWS managed key can't be used for cross-account access, so decryption would fail. It suits same-account secrets.",
      "Cross-account access must be allowed in both a resource policy on the secret and an identity policy."],
    why: "Cross-account access to a secret needs a resource policy on the secret and an identity policy that both allow it, a customer managed key whose key policy lets the identity decrypt, and the secret's ARN as SecretId.",
    doc: ["https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_examples_cross.html",
      "https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html"] },

  // Regional custom domain certificate (twin of dva-2-15), flip: us-east-1 is now the wrong Region
  { id: "dva-2-467", exam: "DVA", dva: "2.2", topic: "acm", type: "mc", variant: true, twin: ["dva-2-15"],
    q: "A developer adds the custom domain api.example.com to a Regional REST API in eu-west-1 that public clients call. Out of habit, the ACM certificate was requested in us-east-1, and it doesn't appear in the list. The API must stay Regional. What should the developer do?",
    opts: [
      "Request or import a certificate for api.example.com in ACM in eu-west-1, and choose it for the domain.",
      "Wait for ACM to copy the us-east-1 certificate to eu-west-1, which it does for API Gateway domains.",
      "Issue a private certificate for the domain from AWS Private CA in eu-west-1, and choose that instead.",
      "Attach the us-east-1 certificate to the API's default execute-api endpoint, then add the domain again."
    ], a: 0,
    no: [null,
      "ACM certificates are Regional resources and aren't copied between Regions. Only edge-optimized domains use us-east-1.",
      "Public clients don't trust a private CA. Private certificates are for internal clients that trust the CA's root.",
      "The default endpoint uses a certificate managed by AWS. You can't attach your own certificate to it."],
    why: "A Regional custom domain needs an ACM certificate in the same Region as the API. Only edge-optimized custom domains, which are served through CloudFront, need a certificate in us-east-1.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html",
      "https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-edge-optimized-custom-domain-name.html"] },

  // GetParameters vs GetParametersByPath (twin of dva-2-222), flip: named parameters across hierarchies
  { id: "dva-2-468", exam: "DVA", dva: "2.3", topic: "ssm", type: "mc", variant: true, twin: ["dva-2-222"],
    q: "At startup, a Lambda function needs exactly three SecureString parameters from different hierarchies: /shared/db/password, /billing/prod/api-key and /auth/prod/signing-key. Its role already allows reading them and kms:Decrypt on their key. The developer wants a single API call. Which call should the function make?",
    opts: [
      "Call GetParametersByPath with Path /billing/prod, and set Recursive and WithDecryption to true.",
      "Call GetParameters with the three names in Names, and set WithDecryption to true in the request.",
      "Call GetParameters with the three names in Names, and set WithDecryption to false in the request.",
      "Call Secrets Manager BatchGetSecretValue with the three parameter names in its SecretIdList."
    ], a: 1,
    no: [
      "It returns only parameters under /billing/prod, so the other two hierarchies are missed. It's for loading one hierarchy.",
      null,
      "Without decryption, SecureString values come back encrypted. False suits callers that don't need the plaintext.",
      "BatchGetSecretValue reads Secrets Manager secrets. These values are Parameter Store parameters, not secrets."],
    why: "GetParameters takes a list of exact names, wherever they sit, and WithDecryption returns SecureString values in plaintext. GetParametersByPath is for every parameter under one hierarchy.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParameters.html",
      "https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParametersByPath.html"] },

  // Labels only help selector reads (twin of dva-2-223), flip: the app reads the latest version, so moving a label does nothing
  { id: "dva-2-469", exam: "DVA", dva: "2.3", topic: "ssm", type: "mc", variant: true, twin: ["dva-2-223"],
    q: "An app reads the parameter /app/limits by its name alone, with no version or label. A bad value was just saved as version 8, and version 7 was the last good one. The team must roll back in seconds without changing the app's code or configuration. What should the developer do?",
    opts: [
      "Attach a live label to version 7, so that the app's requests for /app/limits resolve to the good value.",
      "Save version 7's value again with PutParameter and Overwrite, so it becomes version 9, the latest one.",
      "Delete version 8 of the parameter, so that Parameter Store serves version 7 as the latest version again.",
      "Attach an Expiration policy that runs right away, so that version 8 is removed from the parameter's history."
    ], a: 1,
    no: [
      "A label matters only when the request names it, as in name:label. A request by name alone gets the latest version.",
      null,
      "DeleteParameter removes the whole parameter, not one version, so the app would get no value at all.",
      "An Expiration policy deletes the whole parameter, not one version, and it needs the advanced tier."],
    why: "A request that names no version or label gets the latest version. Saving the good value again with Overwrite makes a new latest version. Labels help only apps that read name:label.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-versions.html",
      "https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-labels.html"] },

  // Staging labels in a rotation function's test step (twin of dva-2-227), flip: here the call with no stage is the wrong one, and AWSPENDING is right
  { id: "dva-2-470", exam: "DVA", dva: "2.3", topic: "secrets", type: "mc", variant: true, twin: ["dva-2-227"],
    q: "A developer writes a custom Secrets Manager rotation function for a partner API key. In its testSecret step, the function calls GetSecretValue with no VersionStage and tries the key it gets back. Rotations always pass this test, even when the new key turns out to be broken. What should the testSecret step do instead?",
    opts: [
      "Call GetSecretValue with VersionStage set to AWSPENDING, and test that new key against the partner API.",
      "Keep calling GetSecretValue with no VersionStage, but retry the test three times before it passes.",
      "Call GetSecretValue with VersionStage set to AWSPREVIOUS, and compare the new key with the old one.",
      "Move the AWSCURRENT label to the new version first, then test it with a GetSecretValue call with no stage."
    ], a: 0,
    no: [null,
      "With no stage the call returns AWSCURRENT, the old key that still works, so every retry tests the wrong key.",
      "AWSPREVIOUS is an older version kept as the last known good one. Testing it says nothing about the new key.",
      "Moving AWSCURRENT is the finishSecret step. Doing it first hands apps an untested key before the test can catch it."],
    why: "During rotation the new value is stored under the AWSPENDING label, and testSecret is the step that tests that version. A call with no stage returns AWSCURRENT, which stays on the old value until finishSecret moves the label.",
    doc: ["https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotate-secrets_lambda-functions.html",
      "https://docs.aws.amazon.com/secretsmanager/latest/userguide/whats-in-a-secret.html"] },

  // Default at-rest encryption vs encryption helpers (twin of dva-2-229), flip: the default AWS managed key is the right answer
  { id: "dva-2-471", exam: "DVA", dva: "2.3", topic: "lambda", type: "mc", variant: true, twin: ["dva-2-229"],
    q: "A Lambda function keeps a log level and a public endpoint URL in environment variables. An audit now requires every function's environment variables to be encrypted at rest with AWS KMS. The values aren't secret, so engineers may still read them in the console. Which approach needs the LEAST effort?",
    opts: [
      "Keep Lambda's default encryption at rest with the AWS managed key, which already meets the rule.",
      "Enable the console encryption helpers with a customer managed key, and decrypt the values in code.",
      "Set a customer managed key for encryption at rest, and grant the engineers kms:Decrypt on that key.",
      "Move the values to Parameter Store SecureString parameters, and read them when the function starts."
    ], a: 0,
    no: [null,
      "Helpers add client-side encryption for values that must stay hidden, plus decrypt code and a permission this audit doesn't need.",
      "It works, but a customer managed key adds KMS charges and key permissions. It's for teams that must control the key.",
      "It works, but it means code changes and new parameters. SecureString is for secrets kept outside the function."],
    why: "Lambda always encrypts environment variables at rest with a KMS key, by default an AWS managed key that needs no setup, permissions or charges. Customer managed keys and encryption helpers are for controlling the key or hiding values from console users.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars-encryption.html"] },

  // Custom data identifier keywords (twin of dva-2-230)
  { id: "dva-2-472", exam: "both", dva: "2.3", saa: "1.2", topic: "macie", type: "mc", variant: true, twin: ["dva-2-230"],
    q: "A retailer's CSV exports in S3 hold 8-digit loyalty card numbers in a column named loyalty_card. Other columns, such as order_id, also hold 8-digit numbers, which aren't sensitive. The team wants Amazon Macie to report only the loyalty card numbers. What should the developer do?",
    opts: [
      "Create a custom data identifier with an 8-digit regex and the keyword loyalty_card, and use it in a job.",
      "Create a custom data identifier with an 8-digit regex and the ignore word order_id, and use it in a job.",
      "Create an allow list with a regular expression for 8-digit numbers, and add that list to the job.",
      "Run a discovery job with Macie's recommended managed data identifiers, which already find card numbers."
    ], a: 0,
    no: [null,
      "An ignore word drops a match only when the matched text contains it. Order IDs are plain digits, so they'd still be reported.",
      "An allow list tells Macie to ignore matching text, so it would hide the loyalty card numbers as well.",
      "Managed identifiers cover standard types such as payment card numbers. A company's own format needs a custom identifier."],
    why: "A custom data identifier pairs a regex with optional keywords. In CSV files, Macie reports a match when a keyword is in the name of the column that holds it, so the loyalty_card keyword keeps the order IDs out of the results.",
    doc: ["https://docs.aws.amazon.com/macie/latest/user/cdis-options.html",
      "https://docs.aws.amazon.com/macie/latest/user/custom-data-identifiers.html"] },

  // Session tags + PrincipalTag for tenant isolation, on DynamoDB (twin of dva-2-232)
  { id: "dva-2-473", exam: "DVA", dva: "2.3", topic: "iam", type: "multi", hint: "Select TWO.", variant: true, twin: ["dva-2-232"],
    q: "A SaaS service keeps every tenant's items in one DynamoDB table whose partition key is TenantId. For each request, a broker assumes one shared IAM role on the calling tenant's behalf. IAM itself must stop a request from touching another tenant's items, with no new roles or policies per tenant. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Have the broker pass the tenant ID as a session tag on AssumeRole, and allow sts:TagSession in the trust policy.", ok: true },
      { t: "Allow GetItem, PutItem and Query only when dynamodb:LeadingKeys matches ${aws:PrincipalTag/tenant}.", ok: true },
      { t: "Tag the DynamoDB table with each tenant's ID, and add aws:ResourceTag conditions to the shared role's policy.", ok: false,
        no: "Tags apply to the whole table, not to its items, so they can't separate tenants who share one table." },
      { t: "Keep full table access for the role, and add a FilterExpression on TenantId to every Query the service runs.", ok: false,
        no: "Isolation would rest on app code alone, and a filter is applied after items are read. IAM wouldn't stop anything." },
      { t: "Add a statement for each tenant to the table's resource-based policy that names that tenant's TenantId value.", ok: false,
        no: "That means a policy change for every new tenant, which the requirement rules out." }
    ],
    why: "Session tags carry the tenant ID into the role session as a principal tag. A ForAllValues:StringEquals condition on dynamodb:LeadingKeys, the partition key, set to ${aws:PrincipalTag/tenant} limits each session to its own tenant's items, so one role and one policy cover every tenant.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html",
      "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html"] },

  // secretsmanager dynamic reference with a JSON key (twin of dva-2-234)
  { id: "dva-2-474", exam: "DVA", dva: "2.3", topic: "cloudformation", type: "mc", variant: true, twin: ["dva-2-234"],
    q: "A CloudFormation template creates an ElastiCache replication group. Its AuthToken must come from an existing Secrets Manager secret named cache-auth, which holds JSON with a token key and will be rotated later. The token must never appear in the template, its parameters or stack outputs. How should the developer set AuthToken?",
    opts: [
      "Set AuthToken to {{resolve:secretsmanager:cache-auth:SecretString:token}} in the resource.",
      "Set AuthToken to {{resolve:ssm-secure:cache-auth}}, so that CloudFormation reads the secure value.",
      "Add a NoEcho parameter whose Default is the token, and set AuthToken with a Ref to that parameter.",
      "Export the token as an output of the stack that made the secret, and read it with Fn::ImportValue."
    ], a: 0,
    no: [null,
      "ssm-secure reads Parameter Store SecureString parameters. The token is in a Secrets Manager secret, which needs the secretsmanager reference.",
      "NoEcho masks the value in CloudFormation's responses, but a Default puts the plaintext token in the template itself.",
      "Output values are stored and shown in plain text. Exports are for sharing values such as resource IDs between stacks."],
    why: "A secretsmanager dynamic reference makes CloudFormation fetch the value at deploy time, and its json-key segment picks one field of the JSON. The resolved value isn't kept in logs, and a reference with no version uses AWSCURRENT, which suits rotation.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-secretsmanager.html",
      "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm-secure-strings.html"] },

  // Standard vs advanced tier (twin of dva-2-235), flip: the value fits and needs no policies, so the standard tier wins
  { id: "dva-2-475", exam: "DVA", dva: "2.3", topic: "ssm", type: "mc", variant: true, twin: ["dva-2-235"],
    q: "An app needs a 2 KB database connection string stored encrypted in Parameter Store. It needs no parameter policies and no sharing with other accounts. A teammate says encrypted values need the advanced tier. Which option is the MOST cost-effective?",
    opts: [
      "Create it as a standard-tier SecureString parameter, since the standard tier supports SecureString.",
      "Create it as an advanced-tier SecureString parameter, since standard-tier values can't be encrypted.",
      "Create it as a standard-tier String parameter, and limit who can read it with an IAM policy instead.",
      "Store it as a Secrets Manager secret, and read it through the Parameter Store reference path in code."
    ], a: 0,
    no: [null,
      "The standard tier supports SecureString. Advanced parameters cost extra and are for larger values, policies or sharing.",
      "A String parameter stores the value unencrypted, and the requirement is that it be stored encrypted.",
      "A secret has its own monthly charge, and Secrets Manager is for features such as rotation that this value doesn't need."],
    why: "The standard tier has no additional charge, holds values up to 4 KB and supports every data type except url, json and jsonc, so a 2 KB SecureString fits. The advanced tier is for values up to 8 KB, parameter policies and sharing, and charges apply.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html"] },

  // Single user vs alternating users (twin of dva-2-307), flip: an interactive user, where single user is what AWS recommends
  { id: "dva-2-476", exam: "DVA", dva: "2.3", topic: "secrets", type: "mc", variant: true, twin: ["dva-2-307"],
    q: "A data analyst signs in to an RDS for PostgreSQL database by hand, using credentials kept in a Secrets Manager secret. Security now wants the analyst's password rotated every 30 days. A teammate suggests alternating users so the analyst's open sessions survive rotation. Which approach does AWS recommend here?",
    opts: [
      "Single user rotation, which AWS recommends for interactive users and which keeps open connections.",
      "Alternating users rotation, with a superuser secret so the function can clone the analyst's user.",
      "Turn on automatic rotation for the KMS key that encrypts the secret, so the password is renewed.",
      "Store the password as a Parameter Store SecureString with an Expiration policy set to 30 days."
    ], a: 0,
    no: [null,
      "Alternating users suits apps that need high availability. AWS recommends single user for interactive users, and open connections stay up either way.",
      "Rotating the KMS key changes the key that encrypts the secret, not the database password inside it.",
      "An Expiration policy deletes the parameter when the time comes. It never changes the database password."],
    why: "AWS recommends single user rotation for one-time or interactive users, and open database connections aren't dropped when the secret rotates. Alternating users is for apps that need high availability, and it needs a superuser secret to create the clone.",
    doc: ["https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotation-strategy.html",
      "https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-policies.html"] },

  // Sampling vs full analysis (twin of dva-2-309), flip: every object must be checked, so a full job beats automated discovery
  { id: "dva-2-477", exam: "DVA", dva: "2.3", topic: "macie", type: "mc", variant: true, twin: ["dva-2-309"],
    q: "Before a company shares one S3 bucket of support-ticket exports with a contractor, legal wants a one-time report of every object in it that holds personal data, such as names and phone numbers. Macie isn't analyzing the bucket yet. Which solution meets this requirement?",
    opts: [
      "Run a one-time Macie sensitive data discovery job on the bucket with a sampling depth of 100%.",
      "Turn on Macie automated sensitive data discovery, and then read the bucket's sensitivity score.",
      "Run a one-time Macie sensitive data discovery job on the bucket with a sampling depth of 20%.",
      "Turn on Amazon GuardDuty S3 Protection, and list the objects named in its findings for the bucket."
    ], a: 0,
    no: [null,
      "Automated discovery samples representative objects across buckets. It's for a broad, ongoing view, not a report on every object.",
      "Macie would analyze only about a fifth of the objects, picked at random, so objects with personal data could be missed.",
      "GuardDuty S3 Protection looks for threats such as data exfiltration. It doesn't inspect objects for personal data."],
    why: "A discovery job can run once, and its sampling depth sets the percentage of eligible objects it analyzes, so 100% covers them all. Automated discovery samples representative objects, which suits broad visibility rather than a full report.",
    doc: ["https://docs.aws.amazon.com/macie/latest/user/discovery-jobs-scope.html",
      "https://docs.aws.amazon.com/macie/latest/user/discovery-asdd.html"] },

  // WriteAttributes default on a second app client (twin of dva-2-315)
  { id: "dva-2-478", exam: "DVA", dva: "2.3", topic: "cognito", type: "mc", variant: true, twin: ["dva-2-315"],
    q: "A user pool has two app clients. The web client's WriteAttributes leave out custom:role, which the backend reads from tokens to grant admin rights. The mobile client was created without setting WriteAttributes. A tester used a mobile token to call UpdateUserAttributes and became an admin. What should the developer do?",
    opts: [
      "Set WriteAttributes on the mobile client to only the attributes users may edit, leaving out custom:role.",
      "Remove custom:role from the mobile client's ReadAttributes, so mobile tokens no longer carry the claim.",
      "Turn on attribute verification for custom:role, so a changed value only counts once it is confirmed.",
      "Shorten the mobile client's refresh token expiration, so a changed value lasts only until that token expires."
    ], a: 0,
    no: [null,
      "Read access doesn't limit writes, and attributes are shared, so the new value still shows up in the web client's tokens.",
      "Only email and phone_number can be verified. Verification proves contact details, not who may change a value.",
      "The change is saved on the user's profile, so every new token carries it. Refresh token lifetime only limits sessions."],
    why: "An app client with no WriteAttributes set can write every standard and custom attribute, and attributes are shared across the pool's clients. An attribute used for authorization must be left out of every client's WriteAttributes and set only through admin APIs.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html"] },

  // Suppression rule vs allow list (twin of dva-2-330), flip: findings must be kept, so a suppression rule is right
  { id: "dva-2-479", exam: "DVA", dva: "2.3", topic: "macie", type: "mc", variant: true, twin: ["dva-2-330"],
    q: "Macie jobs keep reporting names and phone numbers in an S3 bucket that holds the company's published staff directory. Security has reviewed these findings and wants future ones for that bucket archived automatically. Macie must keep analyzing the bucket, and the findings must still be kept for audits. What should the developer do?",
    opts: [
      "Create a Macie suppression rule that matches that bucket and those sensitive data types.",
      "Create a Macie allow list of the directory's names and numbers, and add it to the jobs.",
      "Remove the name and phone number managed data identifiers from the jobs for that bucket.",
      "Exclude the directory bucket from the jobs, and run a separate job on it once a year."
    ], a: 0,
    no: [null,
      "Macie would stop reporting the matching text, so no findings would exist for audits. Allow lists suit text you never want reported.",
      "Macie would stop looking for names and phone numbers there, so no new findings would be created to keep.",
      "Macie would stop analyzing the bucket for most of the year, which the requirement rules out."],
    why: "A suppression rule archives matching findings automatically. Macie still generates them and keeps them until they expire, while an allow list stops Macie from reporting the matching data at all.",
    doc: ["https://docs.aws.amazon.com/macie/latest/user/findings-suppression.html",
      "https://docs.aws.amazon.com/macie/latest/user/allow-lists.html"] },

  // A moved tag doesn't reach a deployed image function (twin of dva-3-106), flip: the tag moved by accident, so "nothing changes" is the right outcome
  { id: "dva-3-450", exam: "DVA", dva: "3.1", topic: "lambda", type: "mc", variant: true, twin: ["dva-3-106"],
    q: "A Lambda function was created from the container image tagged billing:prod in Amazon ECR. While testing, a developer accidentally pushes a broken build with the prod tag. Nobody has updated the function since. What happens to the function?",
    opts: [
      "It keeps running the original image, because Lambda stored that image's digest when the code was set.",
      "New execution environments start the broken build, because Lambda pulls the prod tag at each cold start.",
      "$LATEST picks up the broken build at its next daily refresh, while published versions keep the original.",
      "It fails until the tag is fixed, because its stored digest no longer matches the prod tag in Amazon ECR."
    ], a: 0,
    no: [null,
      "Lambda doesn't look the tag up again at cold starts. Every environment runs the digest it resolved at deployment.",
      "There is no periodic refresh from ECR. $LATEST changes only when its code is updated.",
      "The function never checks that its digest still matches the tag. It runs the image it was given."],
    why: "For an image function, Lambda resolves the tag to an image digest when the code is set and keeps that digest. A tag that moves later doesn't change the function, but the next code update that names billing:prod would deploy the broken build, so the tag should be fixed first.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/api/API_UpdateFunctionCode.html"] },

  // gp3 performance is set apart from size (twin of dva-3-401)
  { id: "dva-3-451", exam: "both", dva: "3.1", saa: "4.1", topic: "ebs", type: "mc", variant: true, twin: ["dva-3-401"],
    q: "A database on EC2 uses a 500 GiB gp2 volume holding 300 GiB of data. It needs a steady 5,000 IOPS, but the volume's baseline is 1,500 IOPS and its burst credits keep running out. The volume must stay attached and online. Which change meets the need MOST cost-effectively?",
    opts: [
      "Grow the gp2 volume to 1,700 GiB with Elastic Volumes, so its baseline rises to 5,100 IOPS.",
      "Change the volume type to io2 with 5,000 provisioned IOPS, using Elastic Volumes while attached.",
      "Change the volume type to gp3 with 5,000 IOPS, using Elastic Volumes while it stays attached.",
      "Change the volume type to st1 with Elastic Volumes, since HDD volumes don't depend on burst credits."
    ], a: 2,
    no: [
      "It works, but it buys 1,200 GiB of storage the data doesn't need just to reach the IOPS.",
      "io2 also gives steady IOPS, but at a higher price than gp3 for the same 5,000 IOPS.",
      null,
      "Throughput Optimized HDD suits large sequential reads. A database's small random I/O needs SSD IOPS."],
    why: "gp2 IOPS grow with size at 3 IOPS per GiB, so more IOPS means more storage. gp3 includes 3,000 IOPS at any size and lets you provision more apart from size, and Elastic Volumes can change gp2 to gp3 without detaching the volume.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html",
      "https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modify-volume.html"] },

  // A path call is authorized against the path (twin of dva-3-404), flip: here a deny is the fix, as long as it covers the ancestor paths
  { id: "dva-3-452", exam: "DVA", dva: "3.1", topic: "ssm", type: "mc", variant: true, twin: ["dva-3-404"],
    q: "A dev role has an AWS managed policy that allows ssm:GetParameter* on every parameter, and the team can't change that policy. Prod settings are String parameters under /prod/. The dev role must not read any prod value by any Parameter Store call. What should the developer add to the role?",
    opts: [
      "A deny of ssm:GetParameter* on /prod/*, which covers all four retrieval actions on every prod parameter.",
      "A deny of ssm:GetParametersByPath on the /prod path, since that is the one call authorized against a path.",
      "A deny of kms:Decrypt on the aws/ssm key, so the dev role can't decrypt any value it reads under /prod/.",
      "A deny of ssm:GetParameter* on /prod/*, plus ssm:GetParametersByPath denied on the paths /prod and /."
    ], a: 3,
    no: [
      "A path call on /prod or / is authorized against that path, not the prod ARNs, so it still returns every prod value.",
      "GetParameter on a single prod name stays open, and a path call on the root path / still returns everything under /prod.",
      "kms:Decrypt matters only for SecureString values. These are String parameters, which come back as plain text.",
      null],
    why: "Each retrieval action is authorized on its own, and GetParametersByPath is checked against the requested path, not the parameters it returns. Hiding /prod values from a broad allow means denying every GetParameter action on them and the path call on each ancestor path.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-retrieval-authorization.html",
      "https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-restrict-parameter-access.html"] },

  // 250 MB unzipped covers code plus layers (twin of dva-3-921), flip: it fits, so a layer is right and an image isn't needed
  { id: "dva-3-453", exam: "DVA", dva: "3.1", topic: "lambda", type: "mc", variant: true, twin: ["dva-3-921"],
    q: "Six Python Lambda functions each bundle the same 140 MB (unzipped) data library, and each function's own code is under 5 MB. Updating the library means rebuilding all six packages. The team wants to keep .zip deployments and maintain the library in one place. What should the developer do?",
    opts: [
      "Package each function as a container image with the library, and push the images to Amazon ECR.",
      "Publish the library as a Lambda layer, and add that layer version to each of the six functions.",
      "Upload the library to an S3 bucket once, and point each function's code at that same S3 object.",
      "Set each function's ephemeral storage to 1 GB, and copy the library to a shared /tmp folder once."
    ], a: 1,
    no: [
      "Images would work for size, but the team wants to keep .zip deployments, and each image still carries its own copy.",
      null,
      "S3 is only a route for uploading a package. Each function still gets its own copy, holding its code too.",
      "/tmp belongs to one execution environment and starts empty, so functions can't share files there."],
    why: "A layer is a .zip archive that any number of functions can use, so the library is updated once and attached by version. Each function's code plus its layers must stay within 250 MB unzipped, and 140 MB plus 5 MB fits easily.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html"] },

  // Native code must match the function's platform (twin of dva-3-926), flip: changing the architecture is now the fix
  { id: "dva-3-454", exam: "DVA", dva: "3.1", topic: "sam", type: "mc", variant: true, twin: ["dva-3-926"],
    q: "A CI pipeline runs sam build on an arm64 (Graviton) Amazon Linux runner for a Python function with compiled C extensions. The template sets the function's Architectures to x86_64, and the deployed function fails at import loading the extension. The team wants to keep the runner and build steps as they are. What should the developer change?",
    opts: [
      "Raise the function's memory to 2,048 MB, so it has room to load the compiled extension at start-up.",
      "Set the function's Architectures to arm64, so it runs on the platform the extensions were built for.",
      "Move the library into a Lambda layer, so Lambda prepares it for the function's x86_64 architecture.",
      "Change the Runtime to a newer Python version, whose runtime loads extensions built on other CPUs."
    ], a: 1,
    no: [
      "Memory doesn't change the CPU type. Code built for arm64 won't load on x86_64 at any memory size.",
      null,
      "Lambda extracts a layer into /opt as it is. Arm64 binaries in a layer fail the same way on x86_64.",
      "Every Python runtime still runs on the function's chosen architecture. A newer version can't load arm64 code on x86_64."],
    why: "A function's code, including compiled dependencies, must match the function's instruction set architecture. Binaries built on an arm64 Linux host load on an arm64 function, so changing the architecture fixes the mismatch without changing the build.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/foundation-arch.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html"] },

  // Immutable tags (twin of dva-3-928), flip: immutability blocks the push, and that's correct, so ship a new tag
  { id: "dva-3-455", exam: "DVA", dva: "3.1", topic: "ecr", type: "mc", variant: true, twin: ["dva-3-928"],
    q: "An ECR repository has tag immutability turned on. The pipeline released api:2.3.0 last week. Now a rebuilt image with a bug fix fails to push as api:2.3.0 with ImageTagAlreadyExistsException. A release tag must never point to a different image. What should the team do?",
    opts: [
      "Switch the repository to MUTABLE for this push, then turn immutability back on once 2.3.0 has moved.",
      "Delete the old 2.3.0 image with BatchDeleteImage, then push the rebuilt image with the same tag again.",
      "Push the rebuilt image as api:2.3.0 to a replica repository in another Region where the tag is free.",
      "Tag the rebuilt image as a new release such as api:2.3.1, push it, and deploy that tag instead."
    ], a: 3,
    no: [
      "The push would succeed, but 2.3.0 would then point to a different image, which the rule forbids.",
      "Deleting frees the tag, but 2.3.0 then names a different image than the one released last week.",
      "Replication copies images between Regions. The same tag naming different images per Region breaks the rule.",
      null],
    why: "With tag immutability on, ECR rejects a push that reuses an existing tag. The error is the setting doing its job: a fix ships under a new tag, so 2.3.0 always means the image that was first released.",
    doc: ["https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html"] },

  // Leave out what the runtime already provides (twin of dva-3-929)
  { id: "dva-3-456", exam: "DVA", dva: "3.1", topic: "lambda", type: "mc", variant: true, twin: ["dva-3-929"],
    q: "A Node.js 20 Lambda function is built by sam build with BuildMethod esbuild. Its bundle is 6 MB, mostly @aws-sdk/client-dynamodb and the packages it pulls in. The team is happy to use the SDK version the runtime includes. Which change makes the bundle smaller?",
    opts: [
      "Set Minify to true in BuildProperties, so esbuild trims the unused SDK code from the bundle.",
      "List @aws-sdk/* under External in BuildProperties, so esbuild leaves the SDK out of the bundle.",
      "Set Format to esm in BuildProperties, so the runtime loads the SDK modules instead of the bundle.",
      "Set SourcesContent to false in BuildProperties, so the SDK's source isn't copied into the bundle."
    ], a: 1,
    no: [
      "Minify is already true by default for esbuild in SAM, so this changes nothing.",
      null,
      "Format only sets the output module style. The SDK code is bundled either way.",
      "SourcesContent only affects what goes into a source map file, not the bundled code."],
    why: "All supported Node.js runtimes include version 3 of the AWS SDK for JavaScript. Marking it External tells esbuild not to bundle it, so the function loads the runtime's copy and ships only its own code.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-build-typescript.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/nodejs-package.html"] },

  // Sharing an SAR application (twin of dva-3-501), flip: shared privately, so no license is needed
  { id: "dva-3-457", exam: "both", dva: "3.1", saa: "2.1", topic: "sar", type: "multi", hint: "Select TWO.", variant: true, twin: ["dva-3-501"],
    q: "A platform team publishes an internal serverless application to the AWS Serverless Application Repository. Only accounts in the company's AWS Organization may deploy it. The application has no license, and its packaged artifacts sit in an S3 bucket that blocks all public access. Which steps are required? (Select TWO.)",
    items: [
      { t: "Add a bucket policy that lets serverlessrepo.amazonaws.com get the packaged objects, limited to the team's own account.", ok: true },
      { t: "Share the application privately with the company's AWS Organization, in the application policy on its Sharing tab.", ok: true },
      { t: "Set a LicenseUrl and a SemanticVersion, then share the application publicly so that every organization account sees it.", ok: false,
        no: "Public sharing opens it to every AWS customer. A license is needed only for public sharing, not for sharing privately." },
      { t: "Create an AWS RAM resource share for the application, and associate the organization with that resource share.", ok: false,
        no: "RAM shares resources such as subnets. An SAR application is shared through its own application policy." },
      { t: "Turn off Block Public Access on the bucket, and make the packaged artifacts readable by everyone on the internet.", ok: false,
        no: "The service reads the artifacts through a bucket policy for its principal. Public objects would only add risk." }
    ],
    why: "Publishing needs a bucket policy that grants the service read access to the artifacts. Applications start private, and an application policy can share one with specific accounts or an organization. A license and semantic version are required only to share publicly.",
    doc: ["https://docs.aws.amazon.com/serverlessrepo/latest/devguide/serverlessrepo-how-to-publish.html"] },

  // Linear vs canary (twin of dva-3-808), flip: one slice then the rest is now what's wanted, on ECS
  { id: "dva-3-458", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc", variant: true, twin: ["dva-3-808"],
    q: "A team uses CodeDeploy blue/green deployments for an Amazon ECS service. Each release must send 10 percent of production traffic to the new task set, hold there for 15 minutes while alarms watch it, and then move the rest in one step. Which deployment configuration should the team use?",
    opts: [
      "CodeDeployDefault.ECSLinear10PercentEvery3Minutes",
      "CodeDeployDefault.ECSAllAtOnce, with a 15-minute wait",
      "CodeDeployDefault.ECSCanary10Percent15Minutes",
      "CodeDeployDefault.ECSLinear10PercentEvery1Minutes"
    ], a: 2,
    no: [
      "Linear keeps moving 10 percent every three minutes. It never holds at one slice for 15 minutes.",
      "All at once moves every request to the new task set at the start, so nothing is tested on a slice.",
      null,
      "Another linear option: ten equal steps a minute apart, with no long hold at 10 percent."],
    why: "A canary configuration moves one slice of traffic, waits, then moves the rest at once, so ECSCanary10Percent15Minutes holds 10 percent for 15 minutes. Linear configurations move equal slices with the same wait between each.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html"] },

  // Alarm on the new version during the shift (twin of dva-3-809), flip: the risk is latency, so Errors is the wrong metric
  { id: "dva-3-459", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc", variant: true, twin: ["dva-3-809"],
    q: "A CodeDeploy canary deployment shifts 10 percent of a Lambda alias's traffic to a new version. Past bad releases didn't fail; their responses just got much slower. The deployment must roll back on its own if the new version slows down while it serves real traffic. What should the team set up?",
    opts: [
      "An alarm on Errors for the alias, which the deployment group watches to fire above the normal rate.",
      "An alarm on Duration for the alias and new version, which the deployment group watches for slowness.",
      "A BeforeAllowTraffic hook function that times a few test calls to the new version before the shift.",
      "An AfterAllowTraffic hook function that times calls to the alias and fails the deployment if they lag."
    ], a: 1,
    no: [
      "Slow responses that still succeed don't count as errors, so this alarm stays quiet.",
      null,
      "That hook runs before any real traffic reaches the new version, so it can't watch it during the canary wait.",
      "That hook runs only after all traffic has shifted, too late to catch the problem on the 10 percent slice."],
    why: "CodeDeploy stops and rolls back a deployment when an alarm it watches crosses its threshold. Duration measures how long the code takes per event, and the ExecutedVersion dimension splits an alias's metrics by version, so the alarm can watch the new version alone.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html",
      "https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-view.html"] },

  // Backward-compatible schema change keeps blue/green rollback (twin of dva-3-810)
  { id: "dva-3-460", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc", variant: true, twin: ["dva-3-810"],
    q: "A shop's EC2 app is released with CodeDeploy blue/green, and both fleets use one shared RDS database. The next release must replace the phone column with a new contact_phone column. If the release goes wrong, traffic must be able to move back to the blue fleet. Which approach keeps that rollback safe?",
    opts: [
      "Add contact_phone and keep phone for now, so both versions can run; drop phone in a later release.",
      "Rename phone to contact_phone in green's AfterInstall hook, so the change lands right before traffic moves.",
      "Copy the database to a new green database at deploy time, and point only the green fleet at that copy.",
      "Turn on automatic rollback on alarm thresholds, so CodeDeploy reverts the database when errors rise."
    ], a: 0,
    no: [null,
      "Blue still reads phone. Once it's renamed, moving traffic back to blue breaks the old code.",
      "Orders written to the copy after the switch are missing from blue's database, so a rollback loses data.",
      "A rollback redeploys an earlier app revision. It doesn't undo changes made to the database."],
    why: "Blue and green share the database during and after the switch, so each schema change must work for both versions. Adding the new column first and removing the old one in a later release keeps the old version working, so moving traffic back stays safe.",
    doc: ["https://docs.aws.amazon.com/whitepapers/latest/blue-green-deployments/best-practices-for-managing-data-synchronization-and-schema-changes.html",
      "https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html"] },

  // Overridden StackSet parameters keep their value on updates (twin of dva-3-853), flip: remove the override
  { id: "dva-3-461", exam: "DVA", dva: "3.4", topic: "cloudformation", type: "mc", variant: true, twin: ["dva-3-853"],
    q: "A StackSet deploys one template to five Regions. Last year the eu-west-1 stack instance got an override of InstanceType=t3.small. The team has now updated the StackSet's InstanceType value to t3.large for every Region, but eu-west-1 still runs t3.small. From now on, eu-west-1 must follow the StackSet's value. What should the developer do?",
    opts: [
      "Override InstanceType on the eu-west-1 stack instance again, this time with the new t3.large value.",
      "Run drift detection on the StackSet, then resolve the drift reported for the eu-west-1 stack instance.",
      "Set eu-west-1's InstanceType back to the StackSet value, which removes the override, and update it.",
      "Update the StackSet again with t3.large and select every Region, so that eu-west-1 is included too."
    ], a: 2,
    no: [
      "It fixes today's value, but eu-west-1 still has an override, so the next StackSet change would skip it again.",
      "Drift detection finds changes made outside CloudFormation. An override is part of the StackSet, so it isn't drift.",
      null,
      "Overridden values aren't updated by StackSet updates, however many Regions are selected."],
    why: "Each stack instance can override a StackSet parameter, and that override is kept through later StackSet updates. To make a stack follow the StackSet's value again, set its parameter back to the StackSet value, which removes the override when the stacks are updated.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stackinstances-override.html"] },

  // Rollback on failure vs on alarm (twin of dva-3-202), flip: the failure is the trigger, no alarm needed
  { id: "dva-3-462", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc", variant: true, twin: ["dva-3-202"],
    q: "A CodeDeploy in-place deployment's ValidateService script runs health checks and exits with an error when they fail, which fails the deployment. When that happens, the instances must go back to the last working revision without anyone acting. There's no CloudWatch alarm for the app. What should the developer configure?",
    opts: [
      "Turn on the deployment group's automatic rollback option to roll back when a deployment fails.",
      "Use CodeDeployDefault.OneAtATime, so the failed revision only ever reaches one of the instances.",
      "Raise the minimum healthy hosts value, so CodeDeploy restores the instances that become unhealthy.",
      "Deploy with ignoreApplicationStopFailures, so the next deployment starts from the last good revision."
    ], a: 0,
    no: [null,
      "One at a time limits how far a bad revision spreads, but nothing redeploys the last working one.",
      "Minimum healthy hosts only decides when CodeDeploy fails a deployment. It doesn't restore anything.",
      "That flag only lets a deployment carry on when the old ApplicationStop script fails. It redeploys nothing."],
    why: "Rollback on deployment failure needs no alarm: when a hook script fails the deployment, CodeDeploy redeploys the last known good revision as a new deployment. Alarm-based rollback is for problems that don't fail the deployment on their own.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html",
      "https://docs.aws.amazon.com/codedeploy/latest/userguide/instances-health.html"] },

  // fileExistsBehavior (twin of dva-3-203), flip: RETAIN is right
  { id: "dva-3-463", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc", variant: true, twin: ["dva-3-203"],
    q: "Each EC2 instance has a hand-edited settings.conf in the app folder, placed before CodeDeploy was used. The revision ships a default settings.conf for new instances. The first deployment fails because the file already exists. Existing instances must keep their own copy, and new ones must get the default. What should the developer do?",
    opts: [
      "Create the deployment with the file exists behavior set to OVERWRITE, so the revision's copy is installed.",
      "Create the deployment with the file exists behavior set to RETAIN, so the copy on each instance is kept.",
      "Add a BeforeInstall script that deletes settings.conf, so the revision's copy can then be installed.",
      "Add settings.conf to the permissions section of the appspec.yml, so the agent leaves the file alone."
    ], a: 1,
    no: [
      "OVERWRITE replaces each instance's own settings with the default, which loses the hand-edited copies.",
      null,
      "Deleting the file clears the error, but the hand-edited settings are lost and replaced by the default.",
      "The permissions section sets owners and modes on installed files. It doesn't decide how existing files are handled."],
    why: "A file in a target location that the last deployment didn't install fails the deployment by default (DISALLOW). RETAIN keeps the file already on the instance, while an instance without the file gets the revision's copy as usual.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_CreateDeployment.html",
      "https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html"] },

  // ApplicationStop runs the previous revision's script (twin of dva-3-204)
  { id: "dva-3-464", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc", variant: true, twin: ["dva-3-204"],
    q: "Revision 8 adds a step to the ApplicationStop script that drains a job queue before the app stops. Revision 8 deploys over revision 7 and succeeds, but the queue was never drained during that deployment. The step works when run by hand. Why didn't it run?",
    opts: [
      "ApplicationStop ran revision 7's script; revision 8's version first runs in the deployment after this one.",
      "ApplicationStop only runs in the first deployment to an instance, before any revision has been installed.",
      "ApplicationStop is skipped in in-place deployments and only runs for blue/green deployments to instances.",
      "A hook entry without a timeout value is skipped, so the ApplicationStop script needs a timeout set on it."
    ], a: 0,
    no: [null,
      "It's the reverse: ApplicationStop doesn't run on the first deployment, since there's no earlier AppSpec file yet.",
      "In-place deployments run ApplicationStop. It's the first event of every deployment after the first.",
      "The timeout is optional and defaults to 3600 seconds. Leaving it out doesn't skip the script."],
    why: "ApplicationStop happens before the new revision is even downloaded, so the agent uses the AppSpec file and scripts of the last successful revision. A change to the stop script takes effect one deployment later.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html",
      "https://docs.aws.amazon.com/codedeploy/latest/userguide/troubleshooting-deployments.html"] },

  // Instance profile reads the revision (twin of dva-3-205)
  { id: "dva-3-465", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc", variant: true, twin: ["dva-3-205"],
    q: "New EC2 instances run the CodeDeploy agent, which picks up deployments. Each deployment then fails in the DownloadBundle event with an S3 access denied error for the revision bucket. The instances' instance profile role only allows writing to CloudWatch Logs. What should the developer do?",
    opts: [
      "Give the CodeDeploy service role s3:Get* and s3:List* on the revision bucket, so CodeDeploy can copy it.",
      "Add a bucket policy that lets the codedeploy.amazonaws.com service principal read the revision bucket.",
      "Open inbound port 443 in the instances' security group, so CodeDeploy can push the revision to them.",
      "Add s3:Get* and s3:List* on the revision bucket to the role in the instances' instance profile."
    ], a: 3,
    no: [
      "The service role is what CodeDeploy itself uses. The agent on each instance downloads the bundle with the instance's role.",
      "The download is made by the agent with the instance's credentials, not by the CodeDeploy service.",
      "The agent polls CodeDeploy over outbound HTTPS, and it's already getting deployments. Nothing connects in.",
      null],
    why: "On EC2, the CodeDeploy agent itself downloads the revision from S3 during DownloadBundle, using the role in the instance profile. If that role can't read the bucket, the agent gets the deployment but can't fetch the files.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/getting-started-create-iam-instance-profile.html",
      "https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html"] },

  // Blue/green is for EC2 only (twin of dva-3-206), flip: on-premises means in-place
  { id: "dva-3-466", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc", variant: true, twin: ["dva-3-206"],
    q: "An app runs on 8 on-premises servers registered with CodeDeploy. The team likes how blue/green works for their EC2 apps and wants releases here that never leave fewer than half of the servers serving, finishing as fast as possible within that limit. Which deployment setup works for these servers?",
    opts: [
      "A blue/green deployment group that names a second set of on-premises servers by tag as the green fleet.",
      "An in-place deployment group using CodeDeployDefault.HalfAtATime, which updates up to 4 of the 8 servers at once.",
      "An in-place deployment group using CodeDeployDefault.AllAtOnce, with rollback on deployment failure.",
      "An in-place group using CodeDeployDefault.LambdaCanary10Percent5Minutes, to update 10% of servers first."
    ], a: 1,
    no: [
      "On the EC2/On-Premises platform, blue/green works with EC2 instances only, so on-premises servers must use in-place.",
      null,
      "AllAtOnce updates as many servers as it can at the same time, so far fewer than half may be serving.",
      "Lambda configurations shift traffic between function versions. They can't be used for server deployments."],
    why: "Blue/green on the EC2/On-Premises platform needs EC2 instances, so on-premises servers get in-place deployments. HalfAtATime updates up to half the servers at a time, the quickest predefined setting that keeps half serving.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/welcome.html",
      "https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html"] },

  // Hook must be allowed to report its status (twin of dva-3-207)
  { id: "dva-3-467", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc", variant: true, twin: ["dva-3-207"],
    q: "An ECS blue/green deployment runs an AfterAllowTestTraffic Lambda hook. The function's tests pass, and it then calls PutLifecycleEventHookExecutionStatus, which returns an AccessDeniedException. The deployment waits at that event and fails after an hour. What should the developer do?",
    opts: [
      "Add codedeploy:PutLifecycleEventHookExecutionStatus to the CodeDeploy service role for the ECS service.",
      "Add lambda:InvokeFunction for CodeDeploy to the hook function's resource-based policy for the deployment.",
      "Add codedeploy:PutLifecycleEventHookExecutionStatus to the hook function's own Lambda execution role.",
      "Move the tests to a BeforeAllowTraffic hook, which completes as soon as the function returns its result."
    ], a: 2,
    no: [
      "The function makes the call, using its execution role. The CodeDeploy service role isn't used for it.",
      "CodeDeploy already invoked the function, since its tests ran. The failing call is the one the function makes.",
      null,
      "Every Lambda hook has to report its result with the same call, so it would be denied there too."],
    why: "A Lambda hook reports Succeeded or Failed by calling PutLifecycleEventHookExecutionStatus with its own execution role, so that role needs the permission. If CodeDeploy isn't told within one hour, the deployment fails.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/tutorial-ecs-with-hooks-create-hooks.html",
      "https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html"] },

  // ECS blue/green with a Network Load Balancer (twin of dva-3-209), flip: NLB is kept, so all-at-once
  { id: "dva-3-468", exam: "DVA", dva: "3.4", topic: "ecs", type: "mc", variant: true, twin: ["dva-3-209"],
    q: "A Fargate service uses the CODE_DEPLOY deployment controller behind a Network Load Balancer, with two target groups. The team's deployment config, ECSCanary10Percent5Minutes, isn't supported for it. The load balancer must stay, and releases must still be CodeDeploy blue/green. Which deployment configuration should the developer use?",
    opts: [
      "CodeDeployDefault.ECSLinear10PercentEvery1Minutes, to move traffic in small steps instead.",
      "CodeDeployDefault.ECSAllAtOnce, to move all of the traffic to the new task set in a single step.",
      "CodeDeployDefault.AllAtOnce, the predefined all-at-once setting for blue/green deployments.",
      "CodeDeployDefault.LambdaCanary10Percent5Minutes, to keep the same 10% canary shift timing."
    ], a: 1,
    no: [
      "Linear shifting isn't supported with a Network Load Balancer either. It needs an Application Load Balancer.",
      null,
      "That one is for the EC2/On-Premises platform. ECS deployments use the configurations starting with ECS.",
      "Lambda configurations shift traffic between function versions. They can't be used for an ECS service."],
    why: "With a Network Load Balancer, CodeDeploy blue/green for ECS supports only CodeDeployDefault.ECSAllAtOnce. Canary and linear shifting for ECS need an Application Load Balancer.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-bluegreen.html",
      "https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html"] },

  // SAM Alarms vs Hooks (twin of dva-3-210), flip: Alarms is right
  { id: "dva-3-469", exam: "DVA", dva: "3.4", topic: "sam", type: "mc", variant: true, twin: ["dva-3-210"],
    q: "A SAM function uses AutoPublishAlias and a Canary10Percent10Minutes DeploymentPreference. If the new version's Errors metric climbs while it serves its 10% of traffic, the deployment must roll back on its own before the rest of the traffic moves. What should the developer add?",
    opts: [
      "A PostTraffic hook under DeploymentPreference Hooks, with a function that checks the new version's errors.",
      "A CloudWatch alarm on the new version's errors, listed under the DeploymentPreference Alarms property.",
      "A PreTraffic hook under DeploymentPreference Hooks, with a function that runs a smoke test on the version.",
      "An AWS::Lambda::EventInvokeConfig on the alias, with an on-failure destination for the failed requests."
    ], a: 1,
    no: [
      "PostTraffic runs after all traffic has moved, too late to stop the shift during the canary.",
      null,
      "PreTraffic runs once before any traffic moves, so it can't see errors from real requests during the canary.",
      "Destinations receive results of asynchronous invocations. They don't watch metrics or roll anything back."],
    why: "CloudWatch alarms listed under DeploymentPreference Alarms roll the deployment back when they go off during it, including partway through a canary. Hooks run tests before the shift starts and after it ends.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/automating-updates-to-serverless-apps.html"] },

  // Image must be in ECR in the function's Region (twin of dva-3-212)
  { id: "dva-3-470", exam: "DVA", dva: "3.4", topic: "lambda", type: "mc", variant: true, twin: ["dva-3-212"],
    q: "A developer builds a Lambda container image from the AWS base image for Python and pushes it to a private ECR repository in us-east-1. The same function must now also run in eu-west-1, but creating it there from the us-east-1 image URI fails. What should the developer do?",
    opts: [
      "Replicate the image to an ECR repository in eu-west-1, and create the function from that image's URI.",
      "Add a repository policy in us-east-1 that lets the Lambda service in eu-west-1 pull the image from it.",
      "Add the runtime interface client to the image, rebuild it, and push it again to the us-east-1 repository.",
      "Rebuild it as one multi-architecture image, so that Lambda in any Region can run the same image tag."
    ], a: 0,
    no: [null,
      "Permissions don't help here. Lambda only creates functions from an ECR repository in the function's own Region.",
      "AWS base images already include a runtime interface client. Adding one changes nothing about the Region problem.",
      "Lambda doesn't support multi-architecture images, and architecture has nothing to do with which Region can pull it."],
    why: "Lambda pulls a function's image from an Amazon ECR repository in the same Region as the function, though it can be in another account. ECR can replicate images across Regions, so a copy in eu-west-1 works. The AWS base image already has the runtime interface client.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/images-create.html",
      "https://docs.aws.amazon.com/AmazonECR/latest/userguide/replication.html"] },

  // In place vs blue/green for platform updates (twin of dva-3-216), flip: a patch in the same branch, so no new environment
  { id: "dva-3-471", exam: "both", dva: "3.4", saa: "2.2", topic: "beanstalk", type: "mc", variant: true, twin: ["dva-3-216"],
    q: "A Node.js app runs on an Elastic Beanstalk environment. AWS has released a new patch version in the environment's current platform branch. The team wants this patch, and every later one, applied automatically with no downtime and the least ongoing work. What should the developer do?",
    opts: [
      "Turn on managed platform updates with the update level set to patch, in a weekly maintenance window.",
      "For each patch, launch a new environment on it, deploy and test there, then swap the environment URLs.",
      "For each patch, choose Rebuild environment, so that every instance is replaced on the new platform version.",
      "Set the deployment policy to Immutable, so the newest platform patch is installed with each app deployment."
    ], a: 0,
    no: [null,
      "Blue/green suits a move to a different platform branch. Within a branch, managed updates do this with no manual work.",
      "Rebuilding terminates all of the environment's resources and replaces them, so the app goes down. It's for repairing broken environments.",
      "A deployment policy controls how app versions roll out. It doesn't move the environment to a new platform version."],
    why: "Managed platform updates apply patch, or minor and patch, versions within the current branch during a weekly window, using immutable updates with no downtime. A move to a different branch, which can be incompatible, is where AWS recommends a new environment and a URL swap.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environment-platform-update-managed.html",
      "https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.platform.upgrade.html"] },

  // container_commands on every instance (twin of dva-3-217), flip: leader_only is the wrong choice here
  { id: "dva-3-472", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc", variant: true, twin: ["dva-3-217"],
    q: "An Elastic Beanstalk web app runs on four instances behind a load balancer. On every deployment, each instance must compile the new version's stylesheets into the app's public folder after the source is extracted and before the new version is deployed. What should the developer add to a file in .ebextensions?",
    opts: [
      "A container_commands entry that runs the compile step, with no leader_only setting.",
      "A container_commands entry that runs the compile step, with leader_only set to true.",
      "A commands entry that runs the compile step in the app's folder on every instance.",
      "An option_settings entry that sets the compile command as an environment property."
    ], a: 0,
    no: [null,
      "leader_only runs the command on one instance only, so the other three would deploy without the compiled files.",
      "The commands key runs before the source bundle is extracted, so the new version's files aren't there yet.",
      "An environment property only holds a value. Nothing runs it during the deployment."],
    why: "container_commands run in the staging directory after the source is extracted and before it's deployed, and changes made there ship with the version. Without leader_only they run on every instance; leader_only is for one-off steps like a schema migration.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/customize-containers-ec2.html"] },

  // Platform hook stages (twin of dva-3-218)
  { id: "dva-3-473", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc", variant: true, twin: ["dva-3-218"],
    q: "An app runs on an Elastic Beanstalk Amazon Linux 2023 platform. On each app deployment, a script must edit a file in the new version's staging directory after the platform sets up the app and web server, but before they are deployed to their final location. Where should the script go?",
    opts: [
      "In .platform/hooks/predeploy, as an executable file that starts with a #! line.",
      "In .platform/hooks/postdeploy, as an executable file that starts with a #! line.",
      "In .platform/hooks/prebuild, as an executable file that starts with a #! line.",
      "In .platform/confighooks/predeploy, as an executable file with a #! line."
    ], a: 0,
    no: [null,
      "postdeploy runs last, after the app and proxy server are already deployed, so it's too late for the staging directory.",
      "prebuild runs right after the bundle is extracted, before the platform sets up the app and web server.",
      "confighooks run only on configuration deployments, such as an environment property change, not when a new source bundle is deployed."],
    why: "Hooks in .platform/hooks run on application deployments in order: prebuild after the bundle is extracted, predeploy after the app and web server are set up but before they're deployed, and postdeploy last. prebuild and predeploy run in the staging directory.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.hooks.html"] },

  // Once per environment vs once per instance (twin of dva-3-219), flip: the job must run on every instance, so not cron.yaml
  { id: "dva-3-474", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc", variant: true, twin: ["dva-3-219"],
    q: "An Elastic Beanstalk worker environment runs three instances. Each instance writes scratch files to its own local disk. Every hour, every instance must delete its own scratch files that are older than one hour. What should the developer do?",
    opts: [
      "Add an .ebextensions files entry that writes a cron file to /etc/cron.d on each instance, running the cleanup hourly.",
      "Add a cron.yaml file with an hourly task whose url is /cleanup, so the worker daemon POSTs the cleanup job to the app.",
      "Add a container_commands entry with leader_only set to true that schedules the hourly cleanup on the leader instance.",
      "Create an EventBridge Scheduler schedule that sends one cleanup message to the worker environment's queue each hour."
    ], a: 0,
    no: [null,
      "A periodic task is queued once per run by one leader instance, so only the instance that receives it cleans its disk.",
      "Leader-only commands run on one instance, and only during environment creation and deployments.",
      "Each SQS message is processed by one instance, so the other two disks never get cleaned. Scheduler fits jobs that run once per schedule."],
    why: "cron.yaml makes one queue message per scheduled run, so the job runs once for the whole environment. Files created with .ebextensions are set up on every instance as it is provisioned or updated, so a cron file there runs on each instance.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features-managing-env-tiers.html",
      "https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/customize-containers-ec2.html"] },

  // minimumHealthyPercent and maximumPercent (twin of dva-3-220), flip: no extra tasks allowed, so the lower floor is right
  { id: "dva-3-475", exam: "DVA", dva: "3.4", topic: "ecs", type: "mc", variant: true, twin: ["dva-3-220"],
    q: "An ECS service with the rolling update deployment type runs 4 tasks. A licence allows at most 4 copies of the app to run at any time, even during a deployment. Running on only 2 tasks for a few minutes is fine. Which deployment setup meets this?",
    opts: [
      "Set minimumHealthyPercent to 50 and maximumPercent to 100 in the deployment configuration.",
      "Set minimumHealthyPercent to 100 and maximumPercent to 200 in the deployment configuration.",
      "Switch to a blue/green deployment, so the new version comes up beside the old one before traffic moves.",
      "Turn on the deployment circuit breaker with rollback, so failed new tasks are stopped and rolled back."
    ], a: 0,
    no: [null,
      "A ceiling of 200 percent lets ECS start 4 new tasks before stopping the old ones, so 8 copies could run.",
      "Blue/green runs a full new set of tasks beside the old set, so 8 copies would run during the switch.",
      "The circuit breaker detects failed deployments and rolls back. It doesn't cap how many tasks run at once."],
    why: "maximumPercent is the ceiling on running tasks as a percent of the desired count, so 100 means never more than 4. minimumHealthyPercent is the floor, so 50 lets ECS stop 2 old tasks before it starts 2 new ones.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html"] },

  // Event-based change detection for an S3 source (twin of dva-3-222), flip: polling is off, so the EventBridge rule is the fix
  { id: "dva-3-476", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc", variant: true, twin: ["dva-3-222"],
    q: "A pipeline defined in CloudFormation has an S3 source action on a versioned bucket, with PollForSourceChanges set to false. Uploads to the bucket never start the pipeline. The team wants event-based change detection, not polling. What should the developer do?",
    opts: [
      "Turn on EventBridge for the bucket, then add an Object Created rule targeting the pipeline, via a role that can start it.",
      "Add an S3 event notification for Object Created events to the bucket, with the pipeline's ARN as its destination.",
      "Have the bucket's event notifications publish to an SNS topic, and subscribe the pipeline to that topic so uploads start it.",
      "Remove PollForSourceChanges from the action and also add an EventBridge rule, so both methods catch uploads."
    ], a: 0,
    no: [null,
      "S3 notifications go only to SNS, SQS, Lambda or EventBridge. A pipeline isn't a valid destination.",
      "A pipeline can't subscribe to an SNS topic. SNS delivers to subscribers such as SQS queues, Lambda functions or HTTPS endpoints.",
      "Leaving PollForSourceChanges out turns polling back on, so each upload would start two executions."],
    why: "With PollForSourceChanges set to false, nothing detects uploads until there is an EventBridge rule for the bucket's events, with the pipeline as target and a role that allows codepipeline:StartPipelineExecution.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/create-S3-source-events-cli.html",
      "https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-S3.html"] },

  // Cross-Region artifact store and key (twin of dva-3-223)
  { id: "dva-3-477", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc", variant: true, twin: ["dva-3-223"],
    q: "A pipeline in us-west-2 encrypts its artifacts with a customer managed KMS key, which security policy requires for every artifact store. A developer uses the CLI to add a Lambda invoke action in ap-southeast-2. What should the ap-southeast-2 entry in artifactStores use?",
    opts: [
      "A bucket in ap-southeast-2 in the pipeline's account, with a customer managed key created in ap-southeast-2 in that account.",
      "A bucket in ap-southeast-2 in the pipeline's account, with the existing us-west-2 key's ARN set as its encryptionKey id.",
      "No new entry: turn on S3 Cross-Region Replication from the us-west-2 artifact bucket to a bucket in ap-southeast-2.",
      "No new entry: set the action's region field, and CodePipeline reads the input artifacts from the us-west-2 store."
    ], a: 0,
    no: [null,
      "The encryption key must be in the same Region as the cross-Region action, not the pipeline's Region.",
      "CodePipeline copies artifacts between Regions itself, but only into an artifact store declared for that Region.",
      "A cross-Region action needs an artifact bucket in its own Region, declared in artifactStores."],
    why: "Each Region with an action needs its own artifact bucket and encryption key, both in that Region and in the pipeline's account. CodePipeline then copies the action's input artifacts there.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/actions-create-cross-region.html"] },

  // Cross-account action role (twin of dva-3-224)
  { id: "dva-3-478", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc", variant: true, twin: ["dva-3-224"],
    q: "A pipeline in a tools account deploys with CodeDeploy into a production account. Artifacts use a customer managed KMS key shared with production, and the bucket policy lets production read them. The deploy action still fails, because it runs as the tools account's pipeline service role. What should the developer do?",
    opts: [
      "Create a production role trusting the service role, with deploy and artifact access; let the service role assume it; set it as roleArn.",
      "Allow the CodeDeploy actions on production's application and deployment group ARNs in the pipeline service role's identity policy.",
      "Store a production IAM user's access keys in Secrets Manager, and reference that secret in the deploy action's configuration.",
      "Allow sts:AssumeRole on a production role in the pipeline service role's policy, and leave the deploy action's settings as they are."
    ], a: 0,
    no: [null,
      "A tools account policy alone can't grant access to production's resources, and CodeDeploy has no resource-based policies to grant it there.",
      "Actions don't sign in with stored keys. Secrets Manager holds secrets for code to fetch; a cross-account action uses its roleArn.",
      "Without roleArn set on the action, it still runs as the tools account's service role and never uses the production role."],
    why: "A cross-account action runs as a role in the other account. That role trusts the pipeline's service role, the service role's policy allows assuming it, and the action names it in roleArn.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-create-cross-account.html",
      "https://docs.aws.amazon.com/codedeploy/latest/userguide/security_iam_service-with-iam.html"] },

  // Variable namespaces (twin of dva-3-225), flip: the value is an implicit variable, so the codepipeline namespace is right
  { id: "dva-3-479", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc", variant: true, twin: ["dva-3-225"],
    q: "A pipeline has an S3 source action with the namespace SourceVariables, then a CloudFormation deploy action, and no build stage. The deploy action's parameter overrides must include the ID of the current pipeline execution, so each stack update can be traced to its run. What should the developer reference?",
    opts: [
      "#{codepipeline.PipelineExecutionId}, from the reserved namespace that each execution provides.",
      "#{SourceVariables.PipelineExecutionId}, from the namespace that the S3 source action outputs.",
      "#{variables.ExecutionId}, a pipeline-level variable declared with a default value at creation.",
      "#{SourceVariables.VersionId}, since the object version of each new upload is unique to its run."
    ], a: 0,
    no: [null,
      "The S3 source action outputs only ETag and VersionId. The execution ID lives in the codepipeline namespace.",
      "Pipeline-level values come from the definition or whoever starts the run, and neither knows the new execution's ID.",
      "VersionId identifies the S3 object version. Releasing the same upload again reuses it, so it doesn't identify the run."],
    why: "The codepipeline namespace is reserved for the implicit variables every execution has, such as PipelineExecutionId. Action namespaces hold only what that action outputs, which for S3 is ETag and VersionId.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/reference-variables.html"] },

  // Push trigger filters, here on file paths (twin of dva-3-226)
  { id: "dva-3-480", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc", variant: true, twin: ["dva-3-226"],
    q: "A V2 pipeline builds a monorepo from GitHub through a CodeConnections connection, and it runs on every push to main. It must now start only for pushes to main that change files under services/payments/. What should the developer do?",
    opts: [
      "Edit the push trigger to include branch main and the file path services/payments/**, so other pushes are ignored.",
      "Set the source action's BranchName to main/services/payments, so only changes under that folder start a run.",
      "Add a first-stage CodeBuild action that fails the run whenever a commit changes no files under services/payments/.",
      "Move the pipeline to the V1 type, whose change detection compares a commit's file paths before a run starts."
    ], a: 0,
    no: [null,
      "BranchName names a single branch. It can't hold a folder, and it doesn't filter on file paths.",
      "The pipeline still starts on every push, and unrelated pushes show up as failed runs. A trigger filter stops them from starting.",
      "V1 pipelines don't support triggers or filters. Filtering on branches, tags or file paths is a V2 feature."],
    why: "In V2 pipelines, a push trigger can filter on branches, file paths or Git tags, and several filters can be combined in one trigger. Including main and the payments path starts runs only for those pushes.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-filter.html",
      "https://docs.aws.amazon.com/codepipeline/latest/userguide/pipeline-types-planning.html"] },

  // Retry vs rollback on stage failure (twin of dva-3-227), flip: a transient failure, so retry is right and rollback is wrong
  { id: "dva-3-481", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc", variant: true, twin: ["dva-3-227"],
    q: "A V2 pipeline's Deploy stage updates an ECS service. Now and then the deploy action fails on a brief throttling error, and an engineer reruns it by hand and it succeeds. The team wants that second try of the new release to happen once, automatically. What should the developer configure?",
    opts: [
      "Automatic rollback on stage failure for the Deploy stage, so it reruns with the last successful execution's artifacts.",
      "Automatic retry on stage failure for the Deploy stage, with the retry mode set to retry only the failed actions.",
      "A manual approval action before the deploy action, so that someone confirms the dependency is healthy first.",
      "Automatic rollback on failure for the Source stage, so the pipeline fetches the commit again and reruns every stage."
    ], a: 1,
    no: [
      "Rollback redeploys the previous release. Here the new release only needs a second try.",
      null,
      "An approval pauses the run before the deploy. It can't rerun the deploy action after it fails.",
      "A source stage can't be rolled back, and rerunning the whole pipeline isn't what the team asked for."],
    why: "V2 pipelines can retry a failed stage automatically, once, either all of its actions or only the failed ones. Rollback is for returning to the last good release, not for giving a new release a second try.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/stage-retry.html",
      "https://docs.aws.amazon.com/codepipeline/latest/userguide/stage-rollback-auto.html"] },

  // VPC builds reach the internet through NAT, not an internet gateway (twin of dva-3-228)
  { id: "dva-3-482", exam: "DVA", dva: "3.4", topic: "codebuild", type: "mc", variant: true, twin: ["dva-3-228"],
    q: "A CodeBuild project was given VPC settings so its tests can reach an ElastiCache cluster. It uses a public subnet whose route table sends 0.0.0.0/0 to an internet gateway. The tests reach the cache, but npm install now times out on the public registry. What should the developer do?",
    opts: [
      "Move the build to private subnets whose 0.0.0.0/0 route goes to a NAT gateway in a public subnet.",
      "Attach an Elastic IP address to the network interface that CodeBuild creates in the public subnet.",
      "Remove the project's VPC settings, so that the build uses CodeBuild's default network to reach npm.",
      "Add an inbound HTTPS rule from 0.0.0.0/0 to the build's security group, so registry replies get in."
    ], a: 0,
    no: [null,
      "CodeBuild doesn't support Elastic IPs on its network interfaces. A NAT gateway's Elastic IP is how VPC builds get a fixed address.",
      "Without VPC settings, builds can't reach resources inside the VPC, so the cache tests would fail.",
      "AWS advises allowing no inbound traffic to builds. The problem is the way out: the build has no public IP to use the internet gateway."],
    why: "CodeBuild's network interfaces in a VPC get no public IP address, so an internet gateway route doesn't work for them. Private subnets that route through a NAT gateway give the build internet access while it still reaches the cache.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/vpc-support.html"] },

  // Local vs S3 cache (twin of dva-3-229), flip: frequent builds of Docker images, so the local cache is right
  { id: "dva-3-483", exam: "DVA", dva: "3.4", topic: "codebuild", type: "mc", variant: true, twin: ["dva-3-229"],
    q: "A CodeBuild project on a Linux image, not in a VPC, builds a large Docker image on every commit, dozens of times an hour. Each build pulls and rebuilds the same base layers. The team wants the fastest reuse of those layers between builds. What should the developer do?",
    opts: [
      "Configure an Amazon S3 cache on the project, and list the folder that holds the Dockerfile under cache paths.",
      "Configure a local cache with Docker layer cache mode, and run the project's builds in privileged mode.",
      "Configure a local cache with source cache mode, so that later builds pull only the commits that changed.",
      "Choose a larger compute type for the project, so that the base layers download and build faster."
    ], a: 1,
    no: [
      "That saves files from the source folder, not image layers. An S3 cache suits dependency files and builds that run less often.",
      null,
      "Source cache keeps Git metadata, so only the source download gets faster. The image layers are still rebuilt.",
      "More CPU and memory still pull and rebuild the same layers on every build."],
    why: "A local cache sits on the build host and is available right away, which suits frequent builds. Docker layer cache mode keeps existing image layers there, and it requires privileged mode.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/caching-local.html",
      "https://docs.aws.amazon.com/codebuild/latest/userguide/build-caching.html"] },

  // Docker daemon vs ECR login (twin of dva-3-231), flip: the build works and the push fails, so the ECR login is right
  { id: "dva-3-484", exam: "DVA", dva: "3.4", topic: "codebuild", type: "mc", variant: true, twin: ["dva-3-231"],
    q: "A CodeBuild project builds a Docker image, and docker build succeeds. The next command, docker push to an ECR repository in the same account and Region, fails with: no basic auth credentials. The buildspec has no login step. What should the developer do?",
    opts: [
      "Turn on privileged mode in the project's environment settings, so that Docker can reach the ECR registry.",
      "Allow ecr:GetAuthorizationToken and the ECR upload and PutImage actions, then run docker login first.",
      "Install Docker in the install phase of the buildspec, so that the push uses a fresh Docker client.",
      "Turn on the local Docker layer cache, so that layers already on the host don't need to be pushed."
    ], a: 1,
    no: [
      "docker build already ran, so the daemon works. Privileged mode lets Docker run in the build; it doesn't sign in to ECR.",
      null,
      "docker build already worked, so Docker isn't the problem. The push has no credentials for the registry.",
      "A layer cache speeds up builds. It doesn't give docker push any credentials for the registry."],
    why: "Pushing to ECR needs an authorization token from GetAuthorizationToken, passed to docker login (aws ecr get-login-password does this), and the service role needs the layer upload and PutImage permissions. Without a login, Docker has no credentials for the registry.",
    doc: ["https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html",
      "https://docs.aws.amazon.com/codebuild/latest/userguide/sample-docker.html"] },

  // Branch autodetection on patterns (twin of dva-3-234)
  { id: "dva-3-485", exam: "DVA", dva: "3.4", topic: "amplify", type: "mc", variant: true, twin: ["dva-3-234"],
    q: "An app on Amplify Hosting is connected to a private GitHub repository. Every new branch whose name starts with feature or hotfix must deploy to its own URL once it's pushed, without anyone adding it in the console, and those deployments must be password protected. What should the developer do?",
    opts: [
      "Turn on branch autodetection with the patterns feature*, hotfix*, and turn on autodetection access control.",
      "Turn on web previews for pull requests on main, and set a password on the main branch's access control.",
      "Add each new branch on the Branch settings page when it's pushed, and set a password on each branch added.",
      "Create a Deploy without Git app for each branch, and upload each branch's zipped build output to it."
    ], a: 0,
    no: [null,
      "Previews deploy pull requests, not branches, so a pushed branch with no pull request isn't deployed.",
      "It works, but someone has to add every branch in the console, which the team ruled out.",
      "Manual deploys aren't connected to Git, so pushing a branch deploys nothing. They suit sites with no repository."],
    why: "Branch autodetection connects new branches that match its patterns and deploys each to its own URL. Autodetection access control password protects the branches it creates.",
    doc: ["https://docs.aws.amazon.com/amplify/latest/userguide/pattern-based-feature-branch-deployments.html",
      "https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html"] },

  // Synth vs diff (twin of dva-3-310), flip: templates as files for a scanner, so synth is right
  { id: "dva-3-486", exam: "DVA", dva: "3.4", topic: "cdk", type: "mc", variant: true, twin: ["dva-3-310"],
    q: "A security scanner reads CloudFormation templates. A new CDK app with three stacks has never been deployed. Before the first deployment, a CI step must give the scanner each stack's template as a file, without deploying anything. Which command should the CI step run?",
    opts: [
      "cdk synth, which writes a cloud assembly with each stack's template to the cdk.out folder.",
      "cdk diff, which compares each stack in the app with the stack that is deployed in the account.",
      "cdk watch, which deploys each stack and deploys it again whenever a file in the app changes.",
      "cdk bootstrap, which deploys the CDKToolkit stack that stores templates and assets for deploys."
    ], a: 0,
    no: [null,
      "It reports differences against deployed stacks, and none are deployed. Producing template files is what synth is for.",
      "It deploys, which the CI step must not do. It's for fast feedback while developing.",
      "Bootstrapping prepares an account for deployments. It doesn't produce the app's own templates."],
    why: "cdk synth synthesizes the app into a cloud assembly, which includes a CloudFormation template for each stack. With several stacks it writes them to cdk.out, and nothing is deployed.",
    doc: ["https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-synth.html"] },

  // Cached context (twin of dva-3-311), flip: the cached value must be refreshed on purpose, so resetting it is right
  { id: "dva-3-487", exam: "DVA", dva: "3.4", topic: "cdk", type: "mc", variant: true, twin: ["dva-3-311"],
    q: "A CDK app uses Vpc.fromLookup, and its cdk.context.json is committed, so every build produces the same template. The network team has added subnets to the VPC on purpose, but synthesis still uses the old subnet list. The app must pick up the new subnets and stay repeatable. What should the developer do?",
    opts: [
      "Run cdk context --reset on the VPC lookup's key, run cdk synth, and commit the updated cdk.context.json.",
      "Delete the local cdk.out folder and run cdk synth again, so that the templates are synthesized from scratch.",
      "Add cdk.context.json to .gitignore, so that every pipeline build looks up the VPC's current subnets.",
      "Run cdk bootstrap again in the account, so that the CDK records the VPC's current subnet details."
    ], a: 0,
    no: [null,
      "cdk.out holds synthesized output. Cached lookups live in cdk.context.json, so the old subnets come back.",
      "The new subnets appear, but builds then look the VPC up each time and can drift again.",
      "Bootstrapping deploys the CDK's own S3 bucket and ECR repository. It doesn't touch cached context."],
    why: "Lookup results are cached in cdk.context.json. Resetting a cached key makes the next synth look it up again, and committing the updated file keeps every build the same.",
    doc: ["https://docs.aws.amazon.com/cdk/v2/guide/context.html",
      "https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-context.html"] },

  // Who may approve: PutApprovalResult on the approver (twin of dva-3-320)
  { id: "dva-3-488", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc", variant: true, twin: ["dva-3-320"],
    q: "A pipeline pauses at a manual approval action, and its SNS email reaches the release managers. A manager signs in to the console with the ReleaseManager role and chooses Approve, but gets an AccessDenied error. Only that role may approve this action. What should the developer do?",
    opts: [
      "Allow codepipeline:PutApprovalResult on the action's ARN, and read access to the pipeline, in the ReleaseManager role.",
      "Allow codepipeline:PutApprovalResult in the pipeline's service role, which CodePipeline uses to run every action.",
      "Allow codepipeline:StartPipelineExecution in the ReleaseManager role, so that a manager can restart the run.",
      "Allow sns:Publish on the approval topic in the ReleaseManager role, so that a manager can reply to approve."
    ], a: 0,
    no: [null,
      "The service role is what CodePipeline uses to run the pipeline. The manager acts with the ReleaseManager role's permissions.",
      "That starts a new execution. It doesn't approve or reject the one that is paused.",
      "Replying to the email doesn't approve anything. sns:Publish lets a principal send messages to a topic."],
    why: "Approving or rejecting is done with the approver's own permissions: codepipeline:PutApprovalResult, which can be scoped to one action's ARN, plus permission to view the pipeline. The AWSCodePipelineApproverAccess managed policy grants this for every pipeline.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-iam-permissions.html",
      "https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals.html"] },

  // CloudFormation action modes: update now, keep failed stacks (twin of dva-3-321), flip: no review, so CREATE_UPDATE is right
  { id: "dva-3-489", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc", variant: true, twin: ["dva-3-321"],
    q: "A pipeline's test stage deploys a CloudFormation stack with one CloudFormation action. On every commit the test stack must be created or updated right away, with no review. If an update leaves the stack in a failed state, it must be kept, not deleted, so the team can debug it. Which action mode should the action use?",
    opts: [
      "CREATE_UPDATE, which creates the stack if it's missing and updates it in place when it already exists.",
      "CHANGE_SET_REPLACE, which builds a change set from the new template for the stack on each commit.",
      "CHANGE_SET_EXECUTE, which applies the latest set of template changes to the stack on each commit.",
      "REPLACE_ON_FAILURE, which creates the stack if it's missing and updates it if it isn't failed."
    ], a: 0,
    no: [null,
      "It only creates the change set, and the stack isn't changed until a CHANGE_SET_EXECUTE action runs. That pair is for review gates.",
      "It runs a change set that already exists, so it needs a CHANGE_SET_REPLACE action before it. Alone it has nothing to apply.",
      "When the stack is in a failed state, this mode deletes it and creates a new one, losing what the team wanted to debug."],
    why: "CREATE_UPDATE changes the stack in one step, and unlike REPLACE_ON_FAILURE it never deletes and replaces a failed stack. Change set modes split an update in two, which pays off when someone reviews the change set before it runs.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CloudFormation.html"] },

  // A stage runs a deployment snapshot (twin of dva-3-322), flip: the fix is in the API, so a new deployment is right
  { id: "dva-3-490", exam: "DVA", dva: "3.4", topic: "apigateway", type: "mc", variant: true, twin: ["dva-3-322"],
    q: "A developer fixed a broken mapping template on a REST API's POST /orders method in the API Gateway console and saved it. Calls to the prod stage still use the broken template. What should the developer do so prod serves the fix?",
    opts: [
      "Create a new deployment of the API and associate it with the prod stage, so prod's snapshot has the fix.",
      "On prod's Deployment history tab, choose the most recent deployment and choose Change active deployment.",
      "Flush the prod stage's API cache, so that the next requests to prod go through the saved mapping template.",
      "Run aws apigateway put-rest-api in merge mode with the API's exported definition, so prod picks up the fix."
    ], a: 0,
    no: [null,
      "Every existing deployment is a snapshot taken before the fix. Change active deployment is for rolling a stage back to one of them.",
      "The cache only stores responses. Prod still runs its old deployment, so new requests still use the broken template.",
      "put-rest-api updates the API's definition, which already has the fix. A stage only sees it after a new deployment."],
    why: "A stage points at a deployment, a snapshot of the API taken when it was deployed. Changes to methods, integrations or mapping templates reach a stage only when the API is redeployed to it.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-deploy-api.html",
      "https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-deployments.html"] },

  // sam pipeline bootstrap runs per stage (twin of dva-3-329)
  { id: "dva-3-491", exam: "DVA", dva: "3.4", topic: "sam", type: "mc", variant: true, twin: ["dva-3-329"],
    q: "A developer runs sam pipeline init to build a pipeline with a staging stage and a prod stage, each in its own AWS account. It asks for each stage's pipeline execution role, CloudFormation execution role and artifact bucket, and none of them exist yet. What should the developer do first?",
    opts: [
      "Run sam pipeline bootstrap once for each stage, using that stage's account credentials and Region.",
      "Run sam pipeline bootstrap once in the staging account, since the roles it creates serve every stage.",
      "Run sam deploy --guided once in each account, so that SAM creates the roles and a bucket in each one.",
      "Run cdk bootstrap in both accounts, so that the pipeline can use the CDK's staging bucket and roles."
    ], a: 0,
    no: [null,
      "Bootstrap must run for each deployment stage. It creates resources in the account it runs against, so prod would have none.",
      "sam deploy --guided deploys the app and saves its settings. It doesn't create a stage's pipeline and CloudFormation execution roles.",
      "cdk bootstrap prepares an account for CDK deploys. A SAM pipeline expects the resources that sam pipeline bootstrap creates."],
    why: "sam pipeline bootstrap creates one stage's pipeline credentials, CloudFormation execution role and artifact bucket in the account it runs against. It must run for every stage before sam pipeline init, which then writes a two-stage pipeline configuration.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-pipeline-bootstrap.html",
      "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-generating-example-ci-cd.html"] },

  // Version lifecycle policy (twin of dva-3-330), flip: no audit need, so deleting the source bundles is right
  { id: "dva-3-492", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc", variant: true, twin: ["dva-3-330"],
    q: "A pipeline creates an Elastic Beanstalk application version on every merge, and the account is close to the application version quota. The team only rolls back to versions from the last 60 days, nobody needs old source bundles, and the S3 bill for them keeps growing. What should the developer do?",
    opts: [
      "Set an application version lifecycle policy with a maximum age of 60 days, and keep the source bundles in S3.",
      "Set an application version lifecycle policy with a maximum age of 60 days, and delete the source bundles from S3.",
      "Add an S3 Lifecycle rule to the Elastic Beanstalk bucket that expires source bundles once they are 60 days old.",
      "Turn on S3 Intelligent-Tiering for the Elastic Beanstalk bucket, so that old bundles move to cheaper tiers."
    ], a: 1,
    no: [
      "It fixes the quota, but the bundles stay in S3 and the bill keeps growing. Keeping bundles is for audit or recovery needs.",
      null,
      "Elastic Beanstalk still tracks the versions, so the quota is still reached. S3 Lifecycle rules only manage the bucket's objects.",
      "It lowers storage cost but deletes nothing, so every version still counts toward the quota."],
    why: "A lifecycle policy deletes application versions past a set age or count, but never one an environment is using. By default it leaves each deleted version's source bundle in S3, and it can delete the bundle too to save space.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/applications-lifecycle.html",
      "https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/applications-versions.html"] },

  // Target group stickiness for weighted groups (twin of dva-3-402)
  { id: "dva-3-493", exam: "DVA", dva: "3.4", topic: "elb", type: "mc", variant: true, twin: ["dva-3-402"],
    q: "An ALB listener's default rule forwards to TG-v1 with weight 80 and TG-v2 with weight 20. Both target groups have duration-based stickiness turned on. Users still switch between v1 and v2 during a session, which empties their carts. What should the developer do?",
    opts: [
      "Turn on target group stickiness in the rule's forward action, so an AWSALBTG cookie pins each user's target group.",
      "Switch both target groups to application-based stickiness, naming the app's own session cookie in each one.",
      "Raise the stickiness duration on both target groups to 7 days, so their AWSALB cookies last whole sessions.",
      "Set both target groups' routing algorithm to weighted random, so the 80/20 split is made per user instead."
    ], a: 0,
    no: [null,
      "Application-based stickiness doesn't work with weighted target groups. It's for pinning users to one target inside a group.",
      "Target-level cookies pin a target inside a group. Without target group stickiness, the rule can still pick the other group.",
      "Weighted random spreads requests across targets inside one group, and it can't be used with sticky sessions."],
    why: "Weights split requests between target groups, and target-level stickiness alone doesn't hold a user to one group. Target group stickiness on the forward action adds an AWSALBTG cookie, and requests that carry it go back to the same target group.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html",
      "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html"] },

  // ssm dynamic reference resolves the latest public AMI (twin of dva-3-403)
  { id: "dva-3-494", exam: "DVA", dva: "3.4", topic: "ssm", type: "mc", variant: true, twin: ["dva-3-403"],
    q: "A CloudFormation launch template hard-codes an Amazon Linux 2023 AMI ID, and the stack runs in four Regions. The team wants each stack create or update to pick up the latest AL2023 AMI for its Region, written inline in ImageId with no new template parameters. What should ImageId hold?",
    opts: [
      "An ssm dynamic reference to the public AL2023 AMI parameter, with no version number given.",
      "An ssm-secure dynamic reference to the public AL2023 AMI parameter, so its value is protected.",
      "An ssm dynamic reference to the public AL2023 AMI parameter, pinned to version 1 of the parameter.",
      "A secretsmanager dynamic reference to the public AL2023 AMI parameter's name under /aws/service/."
    ], a: 0,
    no: [null,
      "ssm-secure reads SecureString parameters and doesn't support public parameters. An AMI ID isn't secret, so ssm fits.",
      "A version number pins the value, so every stack keeps getting that one old AMI. Leaving it out gets the latest.",
      "Public AMI parameters live in Parameter Store, not Secrets Manager. secretsmanager references are for secrets such as passwords."],
    why: "An ssm dynamic reference without a version makes CloudFormation use the parameter's latest value whenever the stack is created or updated. The public parameters under /aws/service/ami-amazon-linux-latest/ hold each Region's latest Amazon Linux AMI ID.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm.html",
      "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm-secure-strings.html"] },

  // Deregistration delay sized to requests (twin of dva-3-405), flip: lower the delay instead of raising it
  { id: "dva-3-495", exam: "DVA", dva: "3.4", topic: "elb", type: "mc", variant: true, twin: ["dva-3-405"],
    q: "A CodeDeploy in-place deployment behind an Application Load Balancer is slow: each instance spends 5 minutes in the BlockTraffic step, its target shown as draining. The target group has default settings, and every request the app serves finishes within 2 seconds. What should the developer do to speed up releases safely?",
    opts: [
      "Lower the target group's deregistration delay to about 30 seconds, still well above the slowest request.",
      "Lower the target group's slow start duration, so that instances get their full share of requests sooner.",
      "Set the target group's healthy threshold count to 2, so that instances pass health checks and rejoin sooner.",
      "Set the routing algorithm to least outstanding requests, so that draining targets are sent fewer requests."
    ], a: 0,
    no: [null,
      "Slow start ramps up traffic to newly registered targets. It doesn't change how long a deregistering target drains.",
      "Health check settings decide when a target counts as healthy. The 5-minute wait is the draining target's deregistration delay.",
      "A draining target gets no new requests anyway. The wait comes from the deregistration delay, not the routing choice."],
    why: "A deregistering target gets no new requests, and the load balancer waits up to the deregistration delay, 300 seconds by default, for in-flight ones to finish. With 2-second requests, a much shorter delay keeps releases fast and still safe.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-target-group-attributes.html",
      "https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html"] },

  // Capabilities match what the template does (twin of dva-3-08), flip: a transform, so AUTO_EXPAND is right
  { id: "dva-3-496", exam: "DVA", dva: "3.4", topic: "cloudformation", type: "mc", variant: true, twin: ["dva-3-08"],
    q: "A template uses the AWS::Include transform to pull in a shared snippet from S3 that defines an SNS topic and an SQS queue. It creates no IAM resources. Running aws cloudformation create-stack fails with InsufficientCapabilitiesException: Requires capabilities: [CAPABILITY_AUTO_EXPAND]. What should the developer do?",
    opts: [
      "Acknowledge CAPABILITY_AUTO_EXPAND on create-stack, since the template uses a transform.",
      "Acknowledge CAPABILITY_NAMED_IAM on create-stack, since it also covers lower capabilities.",
      "Give the caller s3:GetObject on the snippet, so that CloudFormation is able to read it.",
      "Add a stack policy that allows Update:* on every resource the included snippet defines."
    ], a: 0,
    no: [null,
      "NAMED_IAM acknowledges IAM resources with custom names. It doesn't cover macros, and this template has no IAM resources.",
      "The error names a missing capability, not a missing permission. s3:GetObject lets a caller read objects.",
      "Stack policies protect resources from changes during updates. They don't acknowledge what a transform does."],
    why: "AWS::Include and AWS::Serverless are macros hosted by CloudFormation. Creating a stack straight from a template with macros, without reviewing a change set first, needs CAPABILITY_AUTO_EXPAND.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_CreateStack.html"] },

  // Secrets Manager values in a buildspec, with a JSON key (twin of dva-3-11)
  { id: "dva-3-497", exam: "DVA", dva: "3.4", topic: "codebuild", type: "mc", variant: true, twin: ["dva-3-11"],
    q: "A Secrets Manager secret named vendor-creds holds JSON with two keys, username and apiToken. A CodeBuild build needs only the apiToken value, in an API_TOKEN variable, and the value must not appear in the buildspec, the repository or the project's settings. Which buildspec setting does this?",
    opts: [
      "Under env secrets-manager, map API_TOKEN to \"vendor-creds:apiToken\" for the build.",
      "Under env parameter-store, map API_TOKEN to \"vendor-creds:apiToken\" for the build.",
      "Under env variables, set API_TOKEN to the token encrypted with the project's KMS key.",
      "Under env exported-variables, list API_TOKEN so that CodeBuild loads it from vendor-creds."
    ], a: 0,
    no: [null,
      "parameter-store reads a Parameter Store parameter by its name. It doesn't take a Secrets Manager secret ID and JSON key.",
      "The ciphertext then sits in the buildspec, and CodeBuild doesn't decrypt env values. The project's KMS key encrypts build output.",
      "exported-variables passes a build's variables on to later pipeline stages. It doesn't fetch anything from Secrets Manager."],
    why: "env secrets-manager takes the secret's name or ARN plus an optional JSON key, and CodeBuild fetches the value at build time, so it never sits in the buildspec. Without the key it gets the whole secret text. The project's service role must be allowed to read the secret.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html"] }
);
