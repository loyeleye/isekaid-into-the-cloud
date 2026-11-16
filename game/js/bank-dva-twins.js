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
      "Add a custom:company_id attribute, set it at sign-up, and give the app client read access to it.",
      "Add a pre token generation Lambda trigger that looks up the company and adds it to each ID token.",
      "Pass the company ID in ValidationData at sign-up, so Cognito saves it and adds it to the ID token.",
      "Add a resource server with a scope per company, and have the app ask for its company's scope."
    ], a: 0,
    no: [null,
      "It works, but it's a function and extra code for a value that never changes. A custom attribute reaches the ID token by itself.",
      "ValidationData is temporary input for the pre sign-up trigger. Cognito doesn't save it as an attribute or put it in tokens.",
      "Scopes say what a client may access, the client picks them, and they go in access tokens. They aren't per-user data."],
    why: "Custom attributes are stored with the user and written into the ID token for app clients that can read them. A pre token generation trigger is for values that live elsewhere or change often.",
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
    q: "A developer wants to debug locally with exactly the permissions of a Lambda function's execution role, running CLI commands as that role. The developer's policy already allows iam:PassRole on the role, and the role's trust policy names only lambda.amazonaws.com. What else is needed?",
    opts: [
      "Add the developer's principal to the role's trust policy, allow sts:AssumeRole on the role, and call assume-role.",
      "Add an iam:PassedToService condition of lambda.amazonaws.com to the developer's existing iam:PassRole statement.",
      "Allow lambda:InvokeFunction on the function, so the developer's CLI calls run under the function's execution role.",
      "Attach the execution role's permissions policy to the developer's IAM user too, then remove it later."
    ], a: 0,
    no: [null,
      "That limits which service the role can be passed to. Passing hands a role to a service and never gives the developer its credentials.",
      "Invoking runs the function's code with its role. The developer's own CLI calls still use the developer's credentials.",
      "The developer keeps their own permissions as well, so it isn't the role's exact set. Assuming the role swaps them out."],
    why: "iam:PassRole lets a user hand a role to a service, which then assumes it. To use a role's permissions yourself, the role's trust policy must trust you, your policy must allow sts:AssumeRole on it, and you call AssumeRole.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_permissions-to-switch.html",
      "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_passrole.html"] },

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
      "Listener rules route requests but don't verify signatures, and a load balancer is the infrastructure the team wanted to avoid."],
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
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/python-image.html"] }
);
