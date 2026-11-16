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
      "https://docs.aws.amazon.com/lambda/latest/dg/snapstart-monitoring.html"] }
);
