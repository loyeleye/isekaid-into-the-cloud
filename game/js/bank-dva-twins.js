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
      "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html"] }
);
