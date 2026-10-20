// Question bank: DVA-C02 (AWS Certified Developer - Associate).
//
// Story-neutral exam practice, kept apart from SD.questions until chapters exist: no characters, no plot. Questions
// follow the schema js/quiz.js reads (type mc: opts, a, no, why; type multi: items with ok, hint, why), plus tags:
//   exam  'DVA', 'SAA' or 'both'      dva / saa  the exam guide task, such as '1.2' (domain 1, task 2)
//   topic the main service or idea   doc        AWS documentation pages that back the answer
// Multiple-response items also carry a `no` line on each wrong item. A chapter adopts a question by adding a `c`
// (concept key) and copying it into SD.questions. Scope and style come from the project's research notes
// (research/aws-exam-topic-map.md and research/aws-exam-question-style.md). Every question is written fresh; check
// facts against the linked docs, and never copy practice-exam or course questions. `node tools/bank_check.js` checks it.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Domain 1: Development with AWS Services (32%)
  { id: "dva-1-01", exam: "DVA", dva: "1.2", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A developer attaches a Lambda function to two private subnets so it can query an RDS database. The database calls work, but the function's calls to Amazon SQS now time out. The subnets have no route to the internet. Which actions will let the function reach SQS? (Select TWO.)",
    items: [
      { t: "Create an interface VPC endpoint for Amazon SQS in the VPC, and allow HTTPS to it from the function's security group.", ok: true },
      { t: "Add a NAT gateway in a public subnet, and route the private subnets' 0.0.0.0/0 traffic to it.", ok: true },
      { t: "Move the function to a public subnet whose route table sends 0.0.0.0/0 to an internet gateway.", ok: false, no: "Lambda never gives a function a public IP address, so a public subnet gives it no internet path." },
      { t: "Add sqs:SendMessage for the queue to the function's execution role, then redeploy the function.", ok: false, no: "A missing permission fails fast with AccessDenied. A timeout means there is no network path." },
      { t: "Raise the function's timeout so the SQS calls have longer to complete before the function stops.", ok: false, no: "Waiting longer doesn't help when the packets have nowhere to go." }
    ],
    why: "A function attached to a VPC uses the VPC's routes. It reaches other AWS services through a VPC endpoint, or through a NAT gateway in a public subnet. Either one works.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html", "https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html"] },

  { id: "dva-1-02", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "An order service invokes a Lambda function asynchronously. The team wants every successful result sent to an SQS queue for billing, and every event that still fails after Lambda's retries sent to an SNS topic that pages the on-call developer. What should the developer configure?",
    opts: [
      "An on-success destination for the SQS queue and an on-failure destination for the SNS topic, on the function.",
      "A dead-letter queue that points at the SQS queue, plus code in the handler that publishes to the SNS topic when it catches an error.",
      "An event source mapping from the SQS queue to the function, plus a subscription from the SNS topic to the function's log group.",
      "Synchronous invocation instead, so the order service gets each result and forwards successes to SQS and failures to SNS itself."
    ], a: 0,
    no: [null,
      "A dead-letter queue only receives failed events, so it can't carry successful results, and a handler can't report a crash it doesn't survive.",
      "An event source mapping makes Lambda read from the queue, the opposite direction. Log groups don't deliver to SNS topics.",
      "It works, but it moves retries and routing into the order service when Lambda can route results itself."],
    why: "Destinations for asynchronous invocations send a record on success and on failure, including the request and the response. A dead-letter queue only keeps failed events.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html"] },

  { id: "dva-1-03", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A Lambda function reads an SQS standard queue in batches of 10. When one message in a batch fails validation, the function throws, and all 10 messages return to the queue and are processed again. The developer wants only the failed message to be retried. What should the developer do?",
    opts: [
      "Turn on ReportBatchItemFailures for the event source mapping, and return the failed message's ID in a batchItemFailures list in the response.",
      "Set the event source mapping's batch size to 1, so that each failure affects only one message, and leave the code as it is.",
      "Delete every message in the batch at the start of the handler, so none of them return to the queue when an exception is thrown.",
      "Configure a dead-letter queue in the function's asynchronous invocation settings, so the failed message is moved aside at once."
    ], a: 0,
    no: [null,
      "It works, but it multiplies invocations and gives up batching when Lambda can report partial failures.",
      "Deleting first means a crash loses the messages that were never processed.",
      "Asynchronous invocation settings don't apply to an event source mapping. For SQS, the dead-letter queue belongs in the source queue's redrive policy."],
    why: "With ReportBatchItemFailures on, the function returns the IDs of the messages that failed, and Lambda deletes the rest of the batch instead of returning all of it to the queue.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html"] },

  { id: "dva-1-04", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc",
    q: "A payments app sends account events to Amazon SQS. Events for the same account must be processed in the order they were sent, but events for different accounts should be processed in parallel by several consumers. Which design meets these requirements?",
    opts: [
      "Use a FIFO queue and set each message's MessageGroupId to the account ID.",
      "Use a FIFO queue and give every message the same MessageGroupId value.",
      "Use a standard queue and add a delay to each message based on its timestamp.",
      "Use one standard queue per consumer and send each event to a random queue."
    ], a: 0,
    no: [null,
      "One message group is delivered strictly in order, one batch at a time, so accounts could no longer be processed in parallel.",
      "Standard queues make a best effort at ordering but don't guarantee it, and delays don't change that.",
      "Random routing splits one account's events across consumers, which breaks their order."],
    why: "A FIFO queue keeps order within a message group and lets different groups be processed at the same time, so the account ID is the natural group.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-understanding-logic.html"] },

  { id: "dva-1-05", exam: "DVA", dva: "1.1", topic: "sqs", type: "multi", hint: "Select TWO.",
    q: "A producer sends orders to an SQS FIFO queue. When a network error makes it retry a SendMessage call, the same order sometimes appears in the queue twice. A retried message's body is identical to the original. Which actions prevent the duplicates? (Select TWO.)",
    items: [
      { t: "Turn on content-based deduplication, so SQS uses a SHA-256 hash of the body as the deduplication ID.", ok: true },
      { t: "Send a MessageDeduplicationId based on the order ID, and reuse the same value when the call is retried.", ok: true },
      { t: "Increase the queue's visibility timeout, so a consumer has longer to finish before others can see it.", ok: false, no: "The visibility timeout stops one message being received twice, not the same order being sent twice." },
      { t: "Set a different MessageGroupId on every retry, so that the copies of an order land in separate groups.", ok: false, no: "Groups control ordering. Separate groups only let the duplicates be processed in parallel." },
      { t: "Turn on long polling with a 20-second wait time, so consumers make fewer empty receive calls.", ok: false, no: "Long polling cuts empty receives. It has nothing to do with duplicate sends." }
    ],
    why: "A FIFO queue drops a message whose deduplication ID matches one sent in the previous 5 minutes. The ID comes from the producer, or from a hash of the body when content-based deduplication is on.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagededuplicationid-property.html"] },

  { id: "dva-1-06", exam: "both", dva: "1.1", saa: "3.5", topic: "kinesis", type: "mc",
    q: "A retailer collects clickstream records. A recommendations service and a fraud service must each read every record, records for one user must be read in order, and the team must be able to reprocess the previous day's records after fixing a bug. Which approach meets these requirements?",
    opts: [
      "Write the records to a Kinesis data stream keyed by user ID, and have each service read the stream on its own.",
      "Send the records to an SQS FIFO queue with the user ID as the message group ID, and have both services poll that queue.",
      "Publish the records to a standard SNS topic with one subscription per service, and have each service keep what it receives.",
      "Write the records to an SQS standard queue, and have each service delete only the messages that it has processed."
    ], a: 0,
    no: [null,
      "Each message goes to one consumer and is deleted once processed, so two services can't both read every record or replay them.",
      "A standard SNS topic pushes each message and doesn't store it, so the previous day's records can't be replayed from it.",
      "A message deleted by one consumer is gone for everyone, and standard queues don't guarantee order."],
    why: "A Kinesis data stream keeps records for its retention period (24 hours by default, and it can be extended), keeps order within a shard, and lets several consumers read the same records independently.",
    doc: ["https://docs.aws.amazon.com/streams/latest/dev/key-concepts.html"] },

  { id: "dva-1-07", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "An Orders table in DynamoDB has OrderId as its partition key and already holds millions of items. A new screen must list one customer's orders, newest first. What should the developer do?",
    opts: [
      "Add a global secondary index keyed on CustomerId with OrderDate as its sort key, and query it.",
      "Create a local secondary index with CustomerId as its sort key, and query it for the customer's orders.",
      "Scan the table with a FilterExpression on CustomerId, then sort the results by date in the application.",
      "Query the table with CustomerId in the KeyConditionExpression, then sort the results in the application."
    ], a: 0,
    no: [null,
      "A local secondary index keeps the table's partition key (OrderId), and it can only be created together with the table.",
      "A scan reads every item and consumes capacity for all of them, even the ones the filter drops.",
      "A query's key condition must use the partition key of the table or index being queried, and the table's is OrderId."],
    why: "A global secondary index can have a different partition key and can be added to an existing table, so it serves a new access pattern. Querying it with ScanIndexForward set to false returns the newest orders first.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html"] },

  { id: "dva-1-08", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A developer is designing a new DynamoDB table with DeviceId as the partition key and Timestamp as the sort key. The app must also fetch one device's readings sorted by Temperature, and those reads must be strongly consistent. What should the developer do?",
    opts: [
      "Define a local secondary index with Temperature as its sort key when creating the table.",
      "Add a global secondary index on DeviceId and Temperature after the table is created.",
      "Scan the table with ConsistentRead set to true and a FilterExpression on DeviceId, then sort the results.",
      "Make Temperature the table's sort key, and use a filter expression to order by time."
    ], a: 0,
    no: [null,
      "Global secondary indexes only support eventually consistent reads.",
      "A scan reads the whole table; the filter only trims what is returned, and nothing is sorted by Temperature.",
      "Filter expressions remove items, they don't sort them, so the time-ordered queries would break."],
    why: "A local secondary index shares the table's partition key, adds a different sort key, and supports strongly consistent reads. It has to be defined when the table is created, which fits a table being designed now.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html"] },

  { id: "dva-1-09", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "An app reads items of 6 KB each from a DynamoDB table in provisioned capacity mode, 100 times per second, using strongly consistent reads. How many read capacity units does this traffic need?",
    opts: ["100 RCUs", "150 RCUs", "200 RCUs", "300 RCUs"], a: 2,
    no: ["That would be right for items of 4 KB or less, or for eventually consistent reads of these items.",
      "Reads are counted in whole 4 KB units, so 6 KB rounds up to 8 KB rather than counting as 1.5 units.",
      null,
      "That counts each read as three units, but 6 KB rounds up to two 4 KB units."],
    why: "One RCU is one strongly consistent read per second of an item up to 4 KB. A 6 KB item rounds up to 8 KB, which is 2 RCUs per read, times 100 reads per second. Eventually consistent reads would need half that.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/provisioned-capacity-mode.html"] },

  { id: "dva-1-10", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "Two support agents sometimes edit the same customer record in DynamoDB at the same time, and the second save silently overwrites the first. The developer wants a save to fail if the item changed after the agent loaded it. What should the developer do?",
    opts: [
      "Keep a version number on the item, and save with a ConditionExpression that the version still matches the one the agent read.",
      "Use strongly consistent reads when agents load a record, so that each agent always starts from the latest version.",
      "Wrap each save in a TransactWriteItems call, so that the write is atomic and isolated from other writes to the table.",
      "Turn on DynamoDB Streams, and have a Lambda function undo any write that arrives within a second of another one."
    ], a: 0,
    no: [null,
      "A fresh read doesn't stop someone else from saving between that read and your write.",
      "A transaction with no condition still overwrites the other agent's save. Atomicity isn't the missing piece.",
      "That is custom, racy code for a problem one conditional write solves."],
    why: "Optimistic locking: the write succeeds only if the version is unchanged, and increments it. Otherwise it fails with ConditionalCheckFailedException, and the app can reload and try again.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html"] },

  { id: "dva-1-11", exam: "DVA", dva: "1.3", topic: "caching", type: "mc",
    q: "A developer puts an ElastiCache cache in front of a product database, using lazy loading. Which logic should getProduct(id) follow?",
    opts: [
      "Read id from the cache. On a hit, return it. On a miss, read the database, write the result to the cache with a TTL, and return it.",
      "Read id from the database, write the result to the cache with a TTL, and then return the value that is now in the cache.",
      "Read id from the cache. On a hit, return it. On a miss, return not found, and let a nightly job load the whole cache again.",
      "Read id from the cache. On a miss, write an empty entry with a TTL first so other callers wait, then read the database and return what it holds."
    ], a: 0,
    no: [null,
      "Every call still reads the database, so the cache saves nothing.",
      "Products added since the last nightly load look missing until the next night.",
      "The empty entry is never replaced with the real data, so later calls get an empty value until the TTL ends."],
    why: "Lazy loading (cache-aside) fills the cache only on a miss, so it holds what is actually requested. The TTL limits how stale an entry can get.",
    doc: ["https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html"] },

  { id: "dva-1-12", exam: "both", dva: "1.3", saa: "3.3", topic: "dynamodb", type: "mc",
    q: "A game's DynamoDB table serves the same leaderboard items thousands of times per second, and the team wants read latency in microseconds. They want the fewest changes to their existing DynamoDB code. What should the developer do?",
    opts: [
      "Put a DynamoDB Accelerator (DAX) cluster in front of the table, and switch the app to the DAX client with the same API calls.",
      "Add an ElastiCache for Redis cluster, and add code that checks Redis before every DynamoDB call and fills it on each miss, with a TTL.",
      "Switch the table to on-demand capacity mode, so that it scales to whatever read rate the leaderboard needs.",
      "Add read replicas of the table in the same Region, and spread the leaderboard reads across the replicas."
    ], a: 0,
    no: [null,
      "Redis works, but you write and maintain the cache logic, which is more change than DAX needs.",
      "On-demand prevents capacity throttling, but reads still take single-digit milliseconds, not microseconds.",
      "DynamoDB has no read replicas. Global tables replicate across Regions, for other reasons."],
    why: "DAX is an in-memory cache for DynamoDB that is API-compatible with it, so cached reads return in microseconds with minimal code changes.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html"] },

  { id: "dva-1-13", exam: "DVA", dva: "1.1", topic: "apigateway", type: "mc",
    q: "A REST API in Amazon API Gateway invokes a Lambda function that creates users. Many requests arrive without required fields, and each one still invokes the function, which returns an error. The team wants these requests rejected before Lambda runs, with the least development effort. What should the developer do?",
    opts: [
      "Define a model with a JSON schema for the request body, and turn on a request validator for the method.",
      "Add validation code at the top of the Lambda handler that returns HTTP 400 for incomplete bodies.",
      "Add a Lambda authorizer to the method that reads the body and rejects requests with missing fields.",
      "Attach an AWS WAF web ACL to the stage, with a custom rule that blocks any request body missing one of the required fields."
    ], a: 0,
    no: [null,
      "The function still runs, and is billed, for every bad request.",
      "Authorizers decide who may call. They don't receive the request body, and this is more code to write.",
      "WAF filters harmful traffic. Checking a body against a schema is what API Gateway's request validation does."],
    why: "API Gateway request validation checks parameters and the body against a model, and returns 400 without calling the integration.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-request-validation.html"] },

  { id: "dva-1-14", exam: "DVA", dva: "1.1", topic: "resilience", type: "multi", hint: "Select TWO.",
    q: "A Lambda function calls a third-party payments API that sometimes returns HTTP 503 for a few seconds when it is busy. The function retries straight away in a loop, and the API has started rate-limiting the whole account. Which changes should the developer make? (Select TWO.)",
    items: [
      { t: "Retry with exponential backoff and random jitter between attempts.", ok: true },
      { t: "Cap the attempts, and send requests that run out to a queue for later.", ok: true },
      { t: "Retry up to 50 times in a tight loop so the call succeeds the moment the API recovers.", ok: false, no: "That is what set off the rate limit. Immediate retries add load to a service that is already busy." },
      { t: "Raise the function's reserved concurrency so more calls reach the API at the same time.", ok: false, no: "More parallel calls add load to an overloaded service." },
      { t: "Retry every failed call exactly 5 seconds later, so all clients return after recovery.", ok: false, no: "A fixed delay brings every client back at the same moment. Jitter spreads them out." }
    ],
    why: "Exponential backoff spaces retries out, and jitter keeps clients from retrying in lockstep. A cap with a queue behind it stops endless retries from piling up, without losing the requests.",
    doc: ["https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html"] },

  { id: "dva-1-15", exam: "DVA", dva: "1.1", topic: "eventbridge", type: "mc",
    q: "A developer must run a Lambda function that archives old records every night at 02:00 UTC. The team doesn't want any servers to maintain. What should the developer do?",
    opts: [
      "Create an EventBridge Scheduler schedule with a cron expression for 02:00 UTC, targeting the function.",
      "Run a cron job on a small EC2 instance in an Auto Scaling group of one that calls the Lambda Invoke API at 02:00 UTC every night.",
      "Create a CloudWatch alarm that goes into the ALARM state at 02:00 UTC and invokes the function.",
      "Subscribe the function to an SQS delay queue with a 24-hour delay that sends a message to itself."
    ], a: 0,
    no: [null,
      "It works, but it adds an instance to patch and pay for, which the team wants to avoid.",
      "Alarms change state on metric thresholds, not on a clock.",
      "SQS delays go up to 15 minutes, not 24 hours."],
    why: "EventBridge Scheduler invokes targets on cron or rate schedules, with time zones and retries, and there is nothing to run in between.",
    doc: ["https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html"] },

  { id: "dva-1-16", exam: "both", dva: "1.1", saa: "2.1", topic: "stepfunctions", type: "mc",
    q: "An expense workflow must validate a claim, wait for a manager to approve it in a web app, which can take several days, and then pay it. Each step is a Lambda function. Which approach needs the least custom code?",
    opts: [
      "A Step Functions Standard workflow with a .waitForTaskToken task that resumes when the web app calls SendTaskSuccess.",
      "A Step Functions Express workflow with a loop that checks a DynamoDB table every hour until the claim is approved.",
      "One Lambda function that runs all three steps, and that sleeps in a loop, checking the database, until the approval appears there.",
      "The three functions chained by SQS queues, with the payment function re-queuing the claim until it is approved."
    ], a: 0,
    no: [null,
      "Express workflows run for at most five minutes, far short of several days.",
      "A function can't wait for days, and you would pay for all the waiting.",
      "That builds a hand-made state machine with polling that Step Functions already provides."],
    why: "Standard workflows can run for up to a year, and the callback pattern pauses a task until an outside system sends back its task token.",
    doc: ["https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html", "https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html"] },

  { id: "dva-1-17", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "Twelve Lambda functions in a project bundle the same 30 MB internal library, and every library update means repackaging all twelve. How should the developer share the library with the least repeated work?",
    opts: [
      "Publish the library as a Lambda layer, and add that layer version to each of the functions' configurations.",
      "Store the library in S3, and have each function download it to /tmp at the start of every invocation.",
      "Merge the twelve functions into a single function that decides what to do from a field in the event.",
      "Store the library in each function's environment variables as a base64-encoded string, and load it."
    ], a: 0,
    no: [null,
      "Downloading on every call adds latency and cost. A layer is extracted into the environment once.",
      "That swaps a packaging problem for one function with a single role, timeout and memory size for every job.",
      "Environment variables are limited to 4 KB in total, and they hold configuration, not code."],
    why: "A layer packages shared code once. Functions reference a layer version, so an update is one new layer version and a configuration change per function.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html"] },

  { id: "dva-1-18", exam: "both", dva: "1.2", saa: "2.2", topic: "rds", type: "mc",
    q: "During sales, hundreds of concurrent Lambda executions each open a connection to an RDS for MySQL database, and the database starts refusing connections with \"Too many connections\". The team wants a fix with minimal code changes. What should the developer do?",
    opts: [
      "Create an RDS Proxy for the database, and point the function's connection string at the proxy endpoint.",
      "Raise the function's memory so each execution finishes sooner and holds its connection for less time.",
      "Open the database connection inside the handler, and close it again at the end of every invocation so no connection is left idle.",
      "Add a read replica to the database, and send half of the function's connections to the replica."
    ], a: 0,
    no: [null,
      "Shorter runs help a little, but hundreds of executions still hold hundreds of connections at once.",
      "Connecting on every call adds latency and churn, and the peak number of connections stays the same.",
      "A replica takes only reads and has its own connection limit, so it halves the problem at best."],
    why: "RDS Proxy pools and shares database connections, so many function executions reuse a small number of them. The app only changes its endpoint.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.html"] },

  { id: "dva-1-19", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A developer adds an S3 event notification that should invoke a Lambda function when objects are created. Saving the configuration with the API fails with \"Unable to validate the following destination configurations\". What should the developer do?",
    opts: [
      "Add a resource-based policy statement that lets s3.amazonaws.com invoke the function for this bucket.",
      "Add s3:GetObject and s3:ListBucket on the bucket to the function's execution role, then save it again.",
      "Turn on S3 Versioning for the bucket, since event notifications need versioning before any Lambda destination can be validated and saved.",
      "Move the function into the VPC that holds the bucket's gateway endpoint, so that S3 can reach it."
    ], a: 0,
    no: [null,
      "The execution role controls what the function may do once it runs. It doesn't let S3 invoke it.",
      "Event notifications don't need versioning.",
      "S3 invokes the function through the Lambda service. VPC placement plays no part."],
    why: "S3 invokes the function through Lambda's API, so the function's resource-based policy must allow the S3 service principal, scoped to the bucket. The console adds it for you; the API and templates need it written out.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/grant-destinations-permissions-to-s3.html"] },

  { id: "dva-1-20", exam: "both", dva: "1.1", saa: "2.1", topic: "sns", type: "multi", hint: "Select TWO.",
    q: "When an order is placed, an inventory service, an email service and an analytics service must each process it on their own. A slow service must not hold up the others, and no service may miss orders while it is down. Which combination meets these requirements? (Select TWO.)",
    items: [
      { t: "Publish each order once to an Amazon SNS topic.", ok: true },
      { t: "Subscribe one SQS queue per service to the topic, and have each service read its own queue.", ok: true },
      { t: "Have the order service call the three services' APIs one after another, synchronously.", ok: false, no: "One slow or failed service then holds up the order for all of them, or loses it." },
      { t: "Send each order to a single SQS queue that all three services poll.", ok: false, no: "Each message goes to one consumer, so the services would split the orders instead of each getting all of them." },
      { t: "Write orders to a DynamoDB table that each service scans every minute.", ok: false, no: "Scans are slow and costly, and tracking what each service has processed falls to you." }
    ],
    why: "Fan-out from SNS to SQS gives each consumer its own durable copy. A queue holds messages while its consumer is slow or down, and the others carry on.",
    doc: ["https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html"] },

  // Domain 2: Security (26%)
  { id: "dva-2-01", exam: "both", dva: "2.1", saa: "1.2", topic: "cognito", type: "multi", hint: "Select TWO.",
    q: "A mobile app needs users to sign up and sign in with an email address, then upload photos straight to their own prefix in a private S3 bucket using short-lived AWS credentials, with no access keys in the app. Which components should the developer use? (Select TWO.)",
    items: [
      { t: "A Cognito user pool that handles sign-up and sign-in and issues each user's tokens.", ok: true },
      { t: "A Cognito identity pool that exchanges those tokens for temporary credentials from an IAM role.", ok: true },
      { t: "An IAM user for each app user, with access keys kept in the device's secure storage.", ok: false, no: "IAM users aren't for app end users, and long-term keys on devices are a leak waiting to happen." },
      { t: "A bucket policy that allows s3:PutObject from any principal with a verified email address.", ok: false, no: "Bucket policies match AWS principals and conditions. There is no email-address principal." },
      { t: "An API Gateway usage plan with an API key issued to each user, for their photo uploads.", ok: false, no: "API keys meter and throttle clients. They don't sign users in or give AWS credentials." }
    ],
    why: "A user pool is the user directory and issues JWTs. An identity pool trades those tokens for temporary credentials from an IAM role, whose policy can be limited to each user's own prefix.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/what-is-amazon-cognito.html"] },

  { id: "dva-2-02", exam: "DVA", dva: "2.1", topic: "apigateway", type: "mc",
    q: "A REST API uses a Cognito user pool authorizer. One method is configured with the OAuth scope orders/read, and clients that send the user's ID token in the Authorization header get 401 Unauthorized. What should the clients send instead?",
    opts: [
      "The access token issued by the user pool, which carries the scopes it was granted.",
      "The refresh token, so that API Gateway can request a new token for each call.",
      "The ID token, sent in an x-api-key header rather than the Authorization header.",
      "Temporary AWS credentials from an identity pool, with the request signed by SigV4."
    ], a: 0,
    no: [null,
      "Refresh tokens are only exchanged with Cognito for new tokens. APIs don't accept them.",
      "The x-api-key header carries usage plan API keys, not user tokens.",
      "SigV4-signed requests are for IAM authorization, not a Cognito user pool authorizer."],
    why: "When a method has OAuth scopes, the Cognito authorizer checks them in an access token. A method with no scopes accepts an ID token.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html"] },

  { id: "dva-2-03", exam: "DVA", dva: "2.1", topic: "apigateway", type: "mc",
    q: "A partner sends a custom token in a header and its tenant ID in a query string parameter. Before calling the backend, a REST API must check both against the company's own token service. Which authorizer should the developer use?",
    opts: [
      "A Lambda authorizer of the REQUEST type, which receives the request's headers and query string parameters.",
      "A Lambda authorizer of the TOKEN type, which receives the token header and the request's query string, with a token validation regex.",
      "A Cognito user pool authorizer pointed at a user pool that holds each of the partner's tenants.",
      "IAM authorization, with a resource policy on the API that allows the partner's tenant ID."
    ], a: 0,
    no: [null,
      "A TOKEN authorizer receives only the one token header, not query string parameters.",
      "It only accepts tokens issued by that user pool, not the company's own tokens.",
      "IAM authorization needs requests signed with SigV4 by AWS principals, not custom tokens."],
    why: "A REQUEST authorizer receives headers, query strings, stage variables and context, so it can check several parts of a request. A TOKEN authorizer receives one header.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html"] },

  { id: "dva-2-04", exam: "both", dva: "2.1", saa: "1.1", topic: "iam", type: "multi", hint: "Select TWO.",
    q: "An app in account A must read objects from an S3 bucket in account B by assuming a role in account B. Which changes are required? (Select TWO.)",
    items: [
      { t: "In account B, create a role with S3 read access whose trust policy names account A's app role.", ok: true },
      { t: "In account A, allow the app's role to call sts:AssumeRole on that role's ARN in account B.", ok: true },
      { t: "In account B, create an IAM user for the app and give its access keys to account A.", ok: false, no: "Long-term keys shared across accounts are exactly what roles replace." },
      { t: "In account A, add s3:GetObject on account B's bucket to the app role, and nothing else.", ok: false, no: "Account A can't grant access to account B's bucket alone. Account B has to allow it, here through the role." },
      { t: "In both accounts, turn on AWS CloudTrail so that STS can verify the cross-account call.", ok: false, no: "CloudTrail records calls. It plays no part in authorizing them." }
    ],
    why: "Cross-account role access needs both sides: account B's trust policy lets account A's principal assume the role, and account A's identity policy lets that principal call AssumeRole.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_aws-accounts.html"] },

  { id: "dva-2-05", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "A developer's script calls the EC2 RunInstances API and gets an UnauthorizedOperation error with a long encoded authorization failure message. How can the developer find out why the request was denied?",
    opts: [
      "Call STS DecodeAuthorizationMessage on the message with an identity allowed sts:DecodeAuthorizationMessage.",
      "Base64-decode the message locally and pretty-print it, since it is the denying policy document encoded for transport.",
      "Search CloudTrail Lake for the policy document that contains the encoded message as a string.",
      "Run the same call again with the --dry-run flag, which prints the statement that denied the call."
    ], a: 0,
    no: [null,
      "AWS encodes the message, and only STS can decode it.",
      "CloudTrail records the failed call, but it doesn't decode the message.",
      "--dry-run only checks whether the call would be allowed. It doesn't explain a denial."],
    why: "Some services return an encoded message when authorization fails. DecodeAuthorizationMessage turns it into JSON describing the request context and why it was denied.",
    doc: ["https://docs.aws.amazon.com/STS/latest/APIReference/API_DecodeAuthorizationMessage.html"] },

  { id: "dva-2-06", exam: "DVA", dva: "2.1", topic: "ecs", type: "mc",
    q: "An app on Amazon ECS with AWS Fargate must write objects to an S3 bucket. The task pulls its image and writes its logs, but the app's S3 calls fail with AccessDenied. Where should the developer grant s3:PutObject?",
    opts: [
      "In the task role named in the task definition, which the containers' code uses for AWS calls.",
      "In the task execution role, which ECS also uses to pull the image and send the task's logs.",
      "In the IAM instance role attached to the EC2 container instances in the cluster that runs the task's containers.",
      "In access keys that the container definition sets as environment variables for the app."
    ], a: 0,
    no: [null,
      "ECS uses the execution role to pull images, fetch secrets and send logs on your behalf, not for your app's calls.",
      "Fargate tasks don't run on your instances, and container code should use a task role anyway.",
      "Long-term keys in a task definition can leak. The task role supplies rotating credentials."],
    why: "ECS uses two roles: the task execution role for pulling images, fetching secrets and logging, and the task role for the application's own AWS calls.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html", "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html"] },

  { id: "dva-2-07", exam: "both", dva: "2.2", saa: "1.3", topic: "kms", type: "multi", hint: "Select TWO.",
    q: "An app encrypts 200 MB files with envelope encryption. It calls GenerateDataKey with a KMS key, encrypts each file locally, and stores the file in S3. Which steps belong in a correct design? (Select TWO.)",
    items: [
      { t: "Store the encrypted copy of the data key alongside each encrypted file.", ok: true },
      { t: "To decrypt, send the encrypted data key to KMS Decrypt and use the plaintext key it returns locally.", ok: true },
      { t: "Store the plaintext data key alongside each file, so that decryption needs no call to KMS.", ok: false, no: "A plaintext key stored beside the data defeats the encryption. Discard it once the file is encrypted." },
      { t: "Store only the KMS key ID, and call GenerateDataKey again with it when the file must be read.", ok: false, no: "Each call returns a new, different data key. KMS doesn't keep data keys, so the old one is gone." },
      { t: "To decrypt, send the whole encrypted file to KMS Decrypt with the key ID.", ok: false, no: "KMS Decrypt works on data keys and small ciphertexts made by KMS, not on files your app encrypted locally." }
    ],
    why: "GenerateDataKey returns a plaintext data key and the same key encrypted under the KMS key. The app encrypts with the plaintext key, discards it, and keeps the encrypted key with the data; KMS Decrypt recovers it when needed.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/data-keys.html"] },

  { id: "dva-2-08", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "A developer calls the KMS Encrypt API directly on a 1 MB JSON document, and the call fails with a validation error. What is the best fix?",
    opts: [
      "Use GenerateDataKey, and encrypt the document locally with the data key it returns.",
      "Split the document into 4 KB chunks, call Encrypt once for each chunk, and store the ciphertexts in order.",
      "Request a Service Quotas increase so that Encrypt accepts larger plaintext input.",
      "Compress the document with gzip, and then call Encrypt on the compressed bytes."
    ], a: 0,
    no: [null,
      "It works around the limit at the cost of hundreds of KMS calls per document, and their throttling.",
      "The 4 KB plaintext limit for Encrypt is fixed, not an adjustable quota.",
      "Compression may not get under 4 KB, and it won't for larger documents."],
    why: "Encrypt accepts at most 4,096 bytes of plaintext. Larger data uses a data key from GenerateDataKey (envelope encryption).",
    doc: ["https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html"] },

  { id: "dva-2-09", exam: "DVA", dva: "2.2", topic: "s3", type: "mc",
    q: "An app uploads millions of small objects a day to a bucket that uses SSE-KMS with a customer managed key, and uploads start failing with KMS throttling errors. The objects must stay encrypted with the same key. What should the developer do?",
    opts: [
      "Turn on S3 Bucket Keys for the bucket, so that S3 makes far fewer requests to KMS.",
      "Switch the bucket's default encryption to SSE-S3, so uploads stop calling KMS.",
      "Encrypt each object client-side with KMS Encrypt before uploading it to S3.",
      "Create a second customer managed key, and alternate uploads between the keys."
    ], a: 0,
    no: [null,
      "That removes the KMS calls but changes the key, which the requirement rules out.",
      "That makes at least as many KMS calls, now from the app.",
      "KMS request quotas are shared by the keys in an account and Region, and it breaks the single-key rule."],
    why: "With S3 Bucket Keys, S3 gets a short-lived bucket-level key from KMS and uses it for many objects, which cuts KMS requests and cost.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucket-key.html"] },

  { id: "dva-2-10", exam: "DVA", dva: "2.2", topic: "s3", type: "mc",
    q: "A security review requires that an S3 bucket reject every request that isn't sent over HTTPS. What should the developer add?",
    opts: [
      "A bucket policy statement that denies s3:* when the aws:SecureTransport key is false.",
      "Default encryption with SSE-KMS on the bucket, so every request is encrypted.",
      "A bucket policy statement that allows s3:* when aws:SecureTransport is true.",
      "A CORS rule on the bucket that lists only https:// origins as allowed origins."
    ], a: 0,
    no: [null,
      "Default encryption protects objects at rest. Requests can still arrive over plain HTTP.",
      "An Allow blocks nothing. Other policies could still allow HTTP requests.",
      "CORS tells browsers which web origins may call the bucket. It doesn't block HTTP requests from other clients."],
    why: "An explicit Deny when aws:SecureTransport is false refuses every request made without TLS, and a Deny overrides any Allow.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html"] },

  { id: "dva-2-11", exam: "both", dva: "2.3", saa: "1.2", topic: "secrets", type: "mc",
    q: "A Lambda function connects to an RDS database with a password. Company policy says the password must rotate automatically every 30 days and must not appear in code or configuration. Which approach needs the least effort?",
    opts: [
      "Store the credentials in Secrets Manager with automatic rotation turned on, and have the function read the secret with its role.",
      "Store the password as a Parameter Store SecureString, and have the function read it when its environment starts.",
      "Store the password in a Lambda environment variable encrypted with a customer managed KMS key, and update it with a script every 30 days.",
      "Embed the password in the deployment package, and redeploy the function with a new password every 30 days."
    ], a: 0,
    no: [null,
      "SecureString keeps it encrypted, but Parameter Store has no built-in rotation. You would write and schedule it yourself.",
      "You would own the rotation script, and the value sits in the function's configuration.",
      "That puts the password in code, and every rotation becomes a deployment."],
    why: "Secrets Manager stores credentials and rotates them on a schedule. For RDS it uses a rotation function that AWS provides, or managed rotation when RDS manages the master password. Code fetches the current value with its role.",
    doc: ["https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html"] },

  { id: "dva-2-12", exam: "DVA", dva: "2.3", topic: "dynamodb", type: "mc",
    q: "A mobile app lets users read and write their own items in a DynamoDB table directly, with credentials from a Cognito identity pool. The table's partition key is the user's Cognito identity ID. How should the developer stop users from reading each other's items?",
    opts: [
      "Add a dynamodb:LeadingKeys condition to the role's policy that matches ${cognito-identity.amazonaws.com:sub}.",
      "Have the app add a FilterExpression on the signed-in user's identity ID to every Query and Scan request that it sends to the table.",
      "Create one DynamoDB table per user, and grant each user's role access to its own table only.",
      "Write a resource-based policy on the table that lists every user's identity ID and their items."
    ], a: 0,
    no: [null,
      "The app runs on the user's device, so a user can remove the filter. The rule has to live in IAM.",
      "Table counts don't scale with users, and each new user means new infrastructure.",
      "A policy listing every user doesn't scale. One policy variable does the same job for all users."],
    why: "With the dynamodb:LeadingKeys condition and the identity pool's policy variable, each user's credentials only work on items whose partition key is their own identity ID.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html"] },

  { id: "dva-2-13", exam: "DVA", dva: "2.1", topic: "s3", type: "mc",
    q: "A role's policy allows s3:ListBucket and s3:GetObject on arn:aws:s3:::reports-bucket/*. The app can download objects, but listing the bucket fails with AccessDenied. What should the developer change?",
    opts: [
      "Grant s3:ListBucket on arn:aws:s3:::reports-bucket, and keep s3:GetObject on the bucket's /* ARN.",
      "Grant s3:ListBucket on arn:aws:s3:::reports-bucket/*/*, so nested prefixes are covered too.",
      "Replace both actions with s3:* on arn:aws:s3:::reports-bucket/*, so every action is covered.",
      "Add a bucket policy that allows s3:GetObject for the role on arn:aws:s3:::reports-bucket."
    ], a: 0,
    no: [null,
      "ListBucket acts on the bucket, so object ARNs, nested or not, never match it.",
      "Still the wrong resource for listing, and far broader than needed.",
      "GetObject already works. The missing permission is ListBucket on the bucket's ARN."],
    why: "ListBucket acts on the bucket resource (arn:aws:s3:::bucket), while object actions such as GetObject act on object resources (arn:aws:s3:::bucket/*).",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-policies-s3.html"] },

  { id: "dva-2-14", exam: "DVA", dva: "2.3", topic: "cloudwatch", type: "mc",
    q: "A Lambda function's logs sometimes contain customers' email addresses, which most engineers must not be able to read. The team wants this handled without changing every function's logging code. What should the developer do?",
    opts: [
      "Attach a CloudWatch Logs data protection policy to the log groups that masks email addresses.",
      "Encrypt the log groups with a customer managed KMS key, so the email addresses in them are protected at rest.",
      "Set the log groups' retention to one day, so that the email addresses are deleted quickly.",
      "Turn off logging for the functions, and use X-Ray traces for debugging from now on."
    ], a: 0,
    no: [null,
      "Encryption at rest protects stored data, but anyone allowed to read the log group still sees every address.",
      "The data is still exposed for a day. Retention limits how long, not who can read it.",
      "That throws away logs the team needs, and traces can carry the same data."],
    why: "A data protection policy detects sensitive data such as email addresses as log events are ingested and masks it wherever the logs are read. Only principals with logs:Unmask see the original values, and events ingested before the policy was attached stay unmasked.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/mask-sensitive-log-data.html"] },

  { id: "dva-2-15", exam: "DVA", dva: "2.2", topic: "acm", type: "mc",
    q: "A developer is adding the custom domain api.example.com to an edge-optimized REST API in eu-west-1. The ACM certificate for the domain, requested in eu-west-1, doesn't appear in the list of certificates to choose from. What should the developer do?",
    opts: [
      "Request or import a certificate for the domain in ACM in us-east-1, and use it for the custom domain.",
      "Wait up to 24 hours for ACM to copy the eu-west-1 certificate to all of CloudFront's edge locations, then refresh the list.",
      "Attach the eu-west-1 certificate to the API's default execute-api endpoint first, then to the domain.",
      "Issue a certificate for the domain from AWS Private CA in eu-west-1, and use that one instead."
    ], a: 0,
    no: [null,
      "ACM doesn't copy certificates between Regions. The certificate has to exist in us-east-1.",
      "The default endpoint uses a certificate managed by AWS. You can't attach your own to it.",
      "Browsers don't trust a private CA, and the Region problem remains."],
    why: "Edge-optimized APIs are served through CloudFront, which uses certificates from ACM in us-east-1. Regional APIs use a certificate in the API's own Region.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-edge-optimized-custom-domain-name.html"] },

  { id: "dva-2-16", exam: "DVA", dva: "2.1", topic: "iam", type: "multi", hint: "Select TWO.",
    q: "An app on EC2 reads from SQS with access keys kept in a credentials file on the instance. A security review asks for the keys to be removed, with no change to the app's AWS SDK calls. What should the developer do? (Select TWO.)",
    items: [
      { t: "Attach an IAM role with the SQS permissions to the instance, through an instance profile.", ok: true },
      { t: "Delete the access keys from the instance, so the SDK falls back to the instance profile.", ok: true },
      { t: "Move the access keys into environment variables, and delete the credentials file.", ok: false, no: "The same long-term keys are still on the instance, just somewhere else." },
      { t: "Encrypt the credentials file with a KMS key, and decrypt it when the app starts.", ok: false, no: "The keys are still long-term and still on the instance. A role removes them entirely." },
      { t: "Rotate the access keys every 90 days with a scheduled script on the instance.", ok: false, no: "Rotation narrows the window for a leaked key but keeps keys on the instance." }
    ],
    why: "The SDK's default credential chain picks up temporary credentials from the instance profile, so the code doesn't change. Keys left in the file or environment come earlier in the chain, so they have to go.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2.html", "https://docs.aws.amazon.com/sdkref/latest/guide/standardized-credentials.html"] },

  // Domain 3: Deployment (24%)
  { id: "dva-3-01", exam: "DVA", dva: "3.4", topic: "sam", type: "mc",
    q: "A team deploys a Lambda function with AWS SAM. Each release must send 10% of traffic to the new version for 5 minutes, then shift the rest, and roll back automatically if an error alarm goes off. What should the developer add to the function in the template?",
    opts: [
      "AutoPublishAlias, and a DeploymentPreference of Type Canary10Percent5Minutes with the error alarm under Alarms.",
      "AutoPublishAlias, and a DeploymentPreference of Type Linear10PercentEvery1Minute with the alarm under Alarms.",
      "A DeploymentPreference of Type AllAtOnce, with a PostTraffic hook that reverts the alias if the alarm fires.",
      "AutoPublishAlias only, then set the alias's routing weight to 10% by hand and move it back after 5 minutes."
    ], a: 0,
    no: [null,
      "Linear shifts 10% every minute in equal steps, not one 10% step followed by the rest.",
      "AllAtOnce shifts all traffic at once, and the hook would be rollback code you write yourself.",
      "That is manual work with no automatic rollback when the alarm fires."],
    why: "SAM's DeploymentPreference uses CodeDeploy to shift traffic on the alias. Canary types shift one percentage and then the rest, linear types shift in equal steps, and the alarms trigger a rollback.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/automating-updates-to-serverless-apps.html"] },

  { id: "dva-3-02", exam: "DVA", dva: "3.4", topic: "apigateway", type: "mc",
    q: "A team has one REST API with dev and prod stages, and one Lambda function with dev and prod aliases. Each stage must call its matching alias, with the least configuration. What should the developer do?",
    opts: [
      "Put ${stageVariables.alias} in the integration's function ARN, set alias per stage, and allow invokes of each alias.",
      "Create a separate copy of the API for each environment, with each copy pointing straight at one alias.",
      "Point both stages at $LATEST, and have the function read the stage name to decide which code to run.",
      "Point both stages at the prod alias, and use a mapping template on the dev stage to rewrite its requests so they carry a dev flag."
    ], a: 0,
    no: [null,
      "It works, but two APIs drift apart and double the configuration to maintain.",
      "$LATEST can't be pinned to tested code, so prod would run whatever was saved last.",
      "Mapping templates change the request. They can't change which version of the function runs."],
    why: "Stage variables let one API definition call a different backend per stage. Each alias also needs a resource-based permission that lets API Gateway invoke it.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/stage-variables.html"] },

  { id: "dva-3-03", exam: "DVA", dva: "3.4", topic: "apigateway", type: "mc",
    q: "A developer adds a new resource and method to a REST API in the console and tests it there successfully. Calls to the prod stage's URL for the new path return 403 with the message Missing Authentication Token. What should the developer do?",
    opts: [
      "Deploy the API to the prod stage, so that the stage picks up the new resource and method.",
      "Add an API key to the request, since new methods require one until they are deployed.",
      "Turn on IAM authorization for the method, and sign the requests to it with SigV4.",
      "Flush the stage's cache, so that the old version of the API is no longer served."
    ], a: 0,
    no: [null,
      "The message is misleading. API Gateway returns it for a path the stage doesn't have.",
      "Nothing in the method asks for authentication. The stage doesn't know the path yet.",
      "The cache stores responses, not the API's definition. The change needs a deployment."],
    why: "Changes to a REST API reach a stage only when you deploy them to it. API Gateway answers paths a stage doesn't have with 403 Missing Authentication Token.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-deployments.html"] },

  { id: "dva-3-04", exam: "DVA", dva: "3.3", topic: "lambda", type: "mc",
    q: "QA runs integration tests against a Lambda function while developers keep changing its code. QA needs the code under test to stay fixed until they approve the next build. What should the developer do?",
    opts: [
      "Publish a version for each build, and point a qa alias at it. QA always calls the alias.",
      "Have QA call $LATEST, and ask developers not to deploy while a test run is in progress.",
      "Copy the function under a new name for each build, and give QA the new function's name.",
      "Turn on code signing for the function, so that only code QA has approved can be deployed."
    ], a: 0,
    no: [null,
      "$LATEST changes with every update, so the code under test isn't fixed.",
      "It works, but each copy needs its own configuration and permissions. Versions do this natively.",
      "Code signing checks who built a package, not which build QA is testing."],
    why: "A published version is an immutable snapshot of code and configuration. An alias is a named pointer that moves to the next approved version without callers changing.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html"] },

  { id: "dva-3-05", exam: "DVA", dva: "3.1", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Lambda function needs about 1.5 GB of Python libraries and model files, more than a .zip deployment package and its layers can hold. Which approaches will work? (Select TWO.)",
    items: [
      { t: "Package the function as a container image, push it to Amazon ECR, and create the function from it.", ok: true },
      { t: "Keep the handler in the .zip, put the large libraries and model files on Amazon EFS, and mount it in the function.", ok: true },
      { t: "Split the libraries across five layers, so that each layer stays under the size limit for a .zip file.", ok: false, no: "The 250 MB unzipped limit covers the function and all of its layers together." },
      { t: "Upload the .zip package to S3 first and point the function at it, since S3 packages have no limit.", ok: false, no: "Deploying from S3 lifts the 50 MB direct upload limit, not the 250 MB unzipped one." },
      { t: "Raise the function's ephemeral storage to 10 GB, so that the larger package fits on deployment.", ok: false, no: "Ephemeral storage is /tmp space at run time. It doesn't change the package size limit." }
    ],
    why: "Container images for Lambda can be up to 10 GB. Large files can also live on an EFS file system the function mounts, keeping the package itself small.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html", "https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem.html"] },

  { id: "dva-3-06", exam: "DVA", dva: "3.4", topic: "cloudformation", type: "mc",
    q: "A CloudFormation template sets a Lambda function's code to a local folder, ./src. Creating the stack fails because the code isn't in S3. Which commands should the developer use instead?",
    opts: [
      "aws cloudformation package to upload ./src to S3 and rewrite the template, then aws cloudformation deploy.",
      "aws cloudformation validate-template to resolve the local path, then aws cloudformation create-stack.",
      "aws s3 sync ./src to a bucket, then aws cloudformation create-stack with the template unchanged.",
      "aws cloudformation create-change-set with the local template and --include-nested-stacks, then execute-change-set on the stack."
    ], a: 0,
    no: [null,
      "validate-template only checks the template's syntax. It uploads nothing.",
      "The template still points at ./src. Something has to rewrite it to the S3 location.",
      "A change set previews changes. The local path problem remains."],
    why: "package uploads the local artifacts a template refers to and writes a new template that points at their S3 locations. deploy then creates or updates the stack from it. sam build and sam deploy do the same for SAM projects.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-cli-package.html"] },

  { id: "dva-3-07", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc",
    q: "A network stack creates a VPC, and several app stacks owned by other teams need its subnet IDs. The values must come from the network stack, not be copied by hand into each template. What should the developer do?",
    opts: [
      "Export the subnet IDs from the network stack's Outputs, and use Fn::ImportValue in each app stack.",
      "Put the subnet IDs in the Default values of Parameters in each app stack's template.",
      "Add a Mappings section to each app stack that looks up the subnet IDs by Region.",
      "Nest the network stack inside each app stack as an AWS::CloudFormation::Stack resource, so every app stack creates the VPC it needs."
    ], a: 0,
    no: [null,
      "Someone has to copy the IDs into every template, and they go stale.",
      "Mappings are fixed values written in the template, still copied by hand.",
      "Each app stack would get its own separate VPC, not the shared one."],
    why: "An Output with an Export name can be read by other stacks in the same account and Region with Fn::ImportValue. While a stack imports it, the export can't be changed or deleted.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-exports.html"] },

  { id: "dva-3-08", exam: "DVA", dva: "3.4", topic: "cloudformation", type: "mc",
    q: "A CloudFormation template creates an IAM role with a fixed RoleName. Deploying it from a pipeline fails with InsufficientCapabilitiesException: Requires capabilities: [CAPABILITY_NAMED_IAM]. What should the developer do?",
    opts: [
      "Acknowledge CAPABILITY_NAMED_IAM each time you create or update the stack.",
      "Acknowledge CAPABILITY_AUTO_EXPAND when creating or updating the stack.",
      "Give the pipeline's role iam:PassRole on every role in the account.",
      "Remove RoleName, since a role without a custom name needs no capability."
    ], a: 0,
    no: [null,
      "AUTO_EXPAND is for templates that use macros, not for IAM resources.",
      "Missing permissions fail with an access error, not a capabilities error.",
      "Any IAM resource needs at least CAPABILITY_IAM. A custom name raises it to CAPABILITY_NAMED_IAM."],
    why: "Templates that create IAM resources need CAPABILITY_IAM, and those that give them custom names need CAPABILITY_NAMED_IAM, so whoever deploys acknowledges the change in permissions.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_CreateStack.html"] },

  { id: "dva-3-09", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc",
    q: "An Elastic Beanstalk environment runs 8 instances under steady load. During deployments, 8 instances must keep serving traffic at all times, but the team doesn't want to pay for a full second set of 8 during each release. Which deployment policy should they choose?",
    opts: ["Rolling with additional batch", "Rolling, with a batch size of 25%", "All at once", "Immutable, with a health check"], a: 0,
    no: [null,
      "Each batch is taken out of service while it updates, so fewer than 8 instances serve traffic.",
      "Every instance updates together, so the app is unavailable during the deployment.",
      "It keeps full capacity and rolls back cleanly, but it launches a full new set of instances, the cost the team wants to avoid."],
    why: "Rolling with additional batch launches one extra batch first, then updates the batches in turn, so full capacity stays in service at the cost of a single extra batch.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html"] },

  { id: "dva-3-10", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc",
    q: "A CodeDeploy deployment to EC2 instances must run a script that calls the app's health endpoint once the app has started, and fail the deployment if the check fails. In which appspec.yml lifecycle hook should the script run?",
    opts: ["BeforeInstall", "AfterInstall", "ApplicationStart", "ValidateService"], a: 3,
    no: ["It runs before the new revision's files are copied, so the new version isn't running yet.",
      "It runs after the files are copied but before the app is started.",
      "This hook starts the service. Checking that it works belongs in the next hook.",
      null],
    why: "ValidateService runs after ApplicationStart and exists to verify that the deployment worked; it is the last hook unless a load balancer adds the traffic hooks. A script that exits with an error fails the deployment.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html"] },

  { id: "dva-3-11", exam: "DVA", dva: "3.4", topic: "codebuild", type: "multi", hint: "Select TWO.",
    q: "A CodeBuild project needs a third-party API token while its tests run. The token must not be stored in the buildspec or anywhere in the repository. Which approaches meet the requirement? (Select TWO.)",
    items: [
      { t: "Store the token in Secrets Manager, and reference it in the buildspec's env secrets-manager section.", ok: true },
      { t: "Store the token as a SecureString in Parameter Store, and reference it in env parameter-store.", ok: true },
      { t: "Store the token as a plain environment variable in the buildspec's env variables section.", ok: false, no: "That writes the token into the buildspec, in source control." },
      { t: "Commit the token to the repository in an encrypted file, and decrypt it in the install phase.", ok: false, no: "The secret then lives in the repository, and you manage the decryption key too." },
      { t: "Pass the token as a command-line argument in the build phase, so it isn't kept in a file.", ok: false, no: "The argument is written in the buildspec, and it can show up in the build logs." }
    ],
    why: "CodeBuild fetches env secrets-manager and env parameter-store values at build time with the project's service role, so the token never sits in the buildspec.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html"] },

  { id: "dva-3-12", exam: "DVA", dva: "3.1", topic: "appconfig", type: "mc",
    q: "A team wants to switch on a new checkout feature gradually over an hour, and switch it off within minutes if errors rise, without redeploying the Lambda functions that read the setting. What should the developer use?",
    opts: [
      "An AWS AppConfig feature flag, deployed with a gradual deployment strategy and a CloudWatch alarm for rollback.",
      "A Lambda environment variable holding the flag, updated in each function whenever the rollout changes.",
      "A flag written in the code, released through a CodeDeploy canary deployment of each of the functions, with alarms for rollback.",
      "A Parameter Store parameter that every function reads at the start of each of its invocations."
    ], a: 0,
    no: [null,
      "Every change updates each function's configuration, with no gradual rollout or rollback on an alarm.",
      "Every flag change becomes a code deployment.",
      "It avoids redeploys, but has no gradual rollout or automatic rollback, and a read on every call adds latency."],
    why: "AppConfig deploys configuration separately from code, rolls it out by a deployment strategy, and rolls it back when a CloudWatch alarm goes off.",
    doc: ["https://docs.aws.amazon.com/appconfig/latest/userguide/what-is-appconfig.html"] },

  { id: "dva-3-13", exam: "DVA", dva: "3.2", topic: "sam", type: "mc",
    q: "A developer wants to test a SAM application's API and its Lambda functions on a laptop before deploying, by sending real HTTP requests to it. Which command should the developer use?",
    opts: [
      "sam local start-api, which runs the functions in local containers behind a local HTTP endpoint.",
      "sam deploy --guided, followed by tests against the dev stage URL that it prints out at the end.",
      "sam validate, which runs the template's functions against a set of sample requests.",
      "sam local generate-event apigateway aws-proxy, which serves the API on localhost."
    ], a: 0,
    no: [null,
      "That deploys to AWS, which the developer wants to avoid for now.",
      "validate checks the template. It runs nothing.",
      "generate-event prints a sample event payload. It doesn't serve an API."],
    why: "sam local start-api emulates the API locally and runs the functions in Docker containers. To test one function, sam local invoke takes an event file, which sam local generate-event can create.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-start-api.html"] },

  { id: "dva-3-14", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc",
    q: "A pipeline builds, tests and deploys to staging automatically. A release manager must approve each release before it reaches production, and production must only receive builds that passed staging. What should the developer add?",
    opts: [
      "A manual approval action in a stage between the staging deployment and the production deployment.",
      "A second pipeline for production, rebuilt from source, that the release manager starts by hand when a release is ready.",
      "An SNS notification to the release manager once each production deployment has finished.",
      "A CodeBuild action that waits 24 hours before the production deployment action starts."
    ], a: 0,
    no: [null,
      "A separate pipeline can build or deploy something other than what passed staging.",
      "Telling someone after the deployment isn't asking them before it.",
      "A timer isn't an approval. Nobody has to agree to anything."],
    why: "A manual approval action pauses the pipeline until someone approves or rejects it, and the same artifact that passed staging then continues to production.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals.html"] },

  // Domain 4: Troubleshooting and Optimization (18%)
  { id: "dva-4-01", exam: "DVA", dva: "4.2", topic: "xray", type: "mc",
    q: "A developer instruments an order service with AWS X-Ray and wants to find all traces for premium customers with X-Ray filter expressions. How should the code record the customer's tier?",
    opts: [
      "As an annotation on the segment, since annotations are indexed for use in filter expressions.",
      "As metadata on the segment, since metadata can hold any JSON object, including the tier.",
      "As a field in the function's log output, so CloudWatch Logs can link it to the trace.",
      "As a custom subsegment named after the tier, wrapped around each request's work."
    ], a: 0,
    no: [null,
      "Metadata is stored with the trace but not indexed, so filter expressions can't search it.",
      "Logs Insights searches logs. X-Ray filter expressions search trace data.",
      "Subsegments time a piece of work. Naming them after data isn't a way to search traces."],
    why: "Annotations are indexed key-value pairs you can use in filter expressions and groups. Metadata holds extra data you want to read in a trace but not search on.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html"] },

  { id: "dva-4-02", exam: "DVA", dva: "4.2", topic: "xray", type: "mc",
    q: "Active tracing is on for a Lambda function, and its execution role can write to X-Ray. Traces show the function's own segment, but not its calls to DynamoDB or to a partner's HTTPS API. What should the developer do?",
    opts: [
      "Instrument the AWS SDK client and the HTTP client in the code, with OpenTelemetry or the X-Ray SDK.",
      "Add the X-Ray daemon to the deployment package, and start it at the beginning of the handler.",
      "Turn on CloudTrail data events for the DynamoDB table, so that the function's calls are added to its X-Ray traces.",
      "Raise the X-Ray sampling rate to 100%, so that every part of every request is recorded."
    ], a: 0,
    no: [null,
      "Lambda already runs the X-Ray daemon when active tracing is on. The missing piece is in the code.",
      "CloudTrail records API calls for auditing. It doesn't add subsegments to traces.",
      "Sampling decides which requests are traced, not what a trace contains."],
    why: "Active tracing records the invocation itself. Downstream calls appear as subsegments only when the code's clients are instrumented.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html"] },

  { id: "dva-4-03", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc",
    q: "A Lambda function must publish a custom metric, OrdersPlaced, with a dimension for each payment method. The team wants to avoid adding PutMetricData calls, and their latency, to every invocation. What should the developer do?",
    opts: [
      "Log each value in CloudWatch embedded metric format, so CloudWatch extracts the metric from the logs.",
      "Call PutMetricData in the background after the handler has returned its response to the caller.",
      "Turn on Lambda Insights for the function, which publishes business metrics such as OrdersPlaced with their dimensions.",
      "Record each order as an X-Ray annotation, and graph the annotations as a CloudWatch metric."
    ], a: 0,
    no: [null,
      "Work left running after the handler returns may not finish before the environment is frozen, and the calls still happen.",
      "Lambda Insights reports system metrics such as memory and CPU use, not your business metrics.",
      "Annotations make traces searchable. They don't become CloudWatch metrics."],
    why: "Embedded metric format is structured JSON in log events. CloudWatch turns it into metrics with dimensions on its own, with no extra API calls from the function.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format.html"] },

  { id: "dva-4-04", exam: "DVA", dva: "4.1", topic: "cloudwatch", type: "mc",
    q: "A developer needs the 10 slowest invocations of a Lambda function over the past day, with their request IDs. The function logs to CloudWatch Logs. What is the quickest way to get them?",
    opts: [
      "Run a CloudWatch Logs Insights query on the REPORT lines, sorted by @duration descending, limited to 10.",
      "Download a day of log streams, and sort the REPORT lines on a laptop with a short script.",
      "Open the function's Duration metric in CloudWatch, and read the request IDs from its Maximum.",
      "Turn on CloudTrail data events for Lambda, and sort the function's Invoke events in event history by how long each one took."
    ], a: 0,
    no: [null,
      "It works, but it is slow and manual compared with one query.",
      "Metrics are numbers over time. They carry no request IDs.",
      "CloudTrail records who called an API, not how long each run of the function took."],
    why: "Logs Insights discovers fields in Lambda's REPORT lines, such as @duration and @requestId, so one query can sort and limit them.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-examples.html"] },

  { id: "dva-4-05", exam: "DVA", dva: "4.1", topic: "apigateway", type: "mc",
    q: "A REST API uses Lambda proxy integration. After a refactor, every call returns 502 Bad Gateway, although the function's logs show it runs successfully and returns an object holding its result. What is the most likely cause?",
    opts: [
      "The function no longer returns what proxy integration needs: a statusCode and a string body.",
      "The function takes longer to return than the API's integration timeout allows, so API Gateway gives up on the request.",
      "The API's usage plan is throttling the client, so API Gateway drops the function's response.",
      "The method's authorizer rejects the caller's token after the function has already run."
    ], a: 0,
    no: [null,
      "A timeout returns 504 Gateway Timeout, not 502.",
      "Throttling returns 429 Too Many Requests, and the function wouldn't run.",
      "Authorization happens before the integration, and its failures return 401 or 403."],
    why: "With proxy integration, API Gateway builds the HTTP response from the function's return value. It needs a statusCode and a body string (headers are optional); any other shape makes API Gateway return 502.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html"] },

  { id: "dva-4-06", exam: "DVA", dva: "4.3", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Lambda function writes to a legacy database that can handle at most 50 concurrent connections. During traffic spikes the function scales past that and the database fails. No write may be lost during a spike. What should the developer do? (Select TWO.)",
    items: [
      { t: "Set the function's reserved concurrency to 50, so it never runs more than 50 at once.", ok: true },
      { t: "Send writes to an SQS queue that the function consumes, so excess work waits in the queue.", ok: true },
      { t: "Set provisioned concurrency to 50, so that 50 execution environments are always ready.", ok: false, no: "Provisioned concurrency keeps environments ready. It doesn't cap how far the function scales." },
      { t: "Lower the function's timeout, so that each connection is released to the database sooner.", ok: false, no: "Shorter runs don't stop a spike from opening more than 50 connections at once." },
      { t: "Raise the function's memory, so that each write to the database finishes faster.", ok: false, no: "Faster runs help, but nothing stops the 51st execution from connecting." }
    ],
    why: "Reserved concurrency caps the function at 50. Requests beyond the cap are throttled, so a queue in front holds the extra writes until the function catches up. Setting maximum concurrency on the SQS event source to the same value stops the poller pulling more than the function can take.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html", "https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html"] },

  { id: "dva-4-07", exam: "both", dva: "4.3", saa: "3.2", topic: "lambda", type: "mc",
    q: "A CPU-bound Lambda function is set to 512 MB of memory, takes 8 seconds per run, and uses only 150 MB. The team wants it faster without raising costs much. What should the developer try first?",
    opts: [
      "Increase the memory setting and measure again, since Lambda allocates CPU in proportion to memory.",
      "Lower the memory to 192 MB, so that the setting matches what the function actually uses and each run costs less.",
      "Turn on provisioned concurrency, so that each invocation of the function runs faster.",
      "Raise the function's timeout, so that the function has more time to finish its work."
    ], a: 0,
    no: [null,
      "Less memory also means less CPU, so a CPU-bound function gets slower.",
      "Provisioned concurrency removes cold starts. It doesn't make the code itself run faster.",
      "The timeout only allows longer runs. It speeds nothing up."],
    why: "CPU scales with memory. A CPU-bound function often finishes so much sooner with more memory that its cost per run stays about the same, or drops.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html"] },

  { id: "dva-4-08", exam: "DVA", dva: "4.3", topic: "sns", type: "mc",
    q: "An SNS topic carries all order events to several SQS queues. The refunds service's Lambda function receives every event and throws away the 95% that aren't refunds. How should the developer cut this wasted work?",
    opts: [
      "Add a filter policy to the refunds queue's subscription that matches only refund events.",
      "Create a separate topic for refunds, and have the order service publish refund events to both topics.",
      "Have the refunds function delete non-refund messages from the queue before processing.",
      "Make the refunds queue a FIFO queue, so non-refund events are deduplicated away."
    ], a: 0,
    no: [null,
      "It works, but now the publisher has to know about each consumer, which a filter policy avoids.",
      "The function still receives every event and pays for it.",
      "Deduplication removes repeats of the same message, not other kinds of event."],
    why: "A subscription filter policy makes SNS deliver only the messages whose attributes or body match it, so unwanted events never reach the queue.",
    doc: ["https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html"] },

  { id: "dva-4-09", exam: "DVA", dva: "4.3", topic: "apigateway", type: "mc",
    q: "A REST API returns product descriptions in the language given by the Accept-Language header. After the team turns on caching for the stage, some users get descriptions in the wrong language. What should the developer do?",
    opts: [
      "Add Accept-Language as a cache key parameter on the method, so each language is cached separately.",
      "Turn off caching for the stage, and cache the descriptions by language in the Lambda function's memory instead.",
      "Lower the cache TTL to 1 second, so that wrong-language entries expire almost straight away.",
      "Have the clients send Cache-Control: max-age=0, so that every response they get is fresh."
    ], a: 0,
    no: [null,
      "That gives up API Gateway's cache when one setting fixes it.",
      "Users still get the wrong language, just for shorter stretches, and the cache barely helps.",
      "If the client is authorized, it only refreshes the shared entry with its own language, so other users can still get the wrong one."],
    why: "API Gateway builds the cache key from the request parameters you mark as cache keys. A header that changes the response must be one of them.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html"] },

  { id: "dva-4-10", exam: "DVA", dva: "4.3", topic: "dynamodb", type: "multi", hint: "Select TWO.",
    q: "An app that writes to a DynamoDB table in provisioned capacity mode gets ProvisionedThroughputExceededException during short, unpredictable bursts, although average use is well below capacity. Which actions should the developer take? (Select TWO.)",
    items: [
      { t: "Make sure throttled writes are retried with exponential backoff, as the AWS SDKs do by default.", ok: true },
      { t: "Switch the table to on-demand capacity mode, so it handles the bursts without capacity planning.", ok: true },
      { t: "Add a local secondary index to the table, so that writes are spread over more partitions.", ok: false, no: "Indexes add write work, and a local secondary index can only be created with the table." },
      { t: "Use strongly consistent reads, so that the table has more capacity left over for the writes.", ok: false, no: "Strongly consistent reads use more read capacity, not less, and reads aren't the problem." },
      { t: "Group the writes with BatchWriteItem, which doesn't count against the table's write capacity.", ok: false, no: "Batch writes use the same capacity as single writes, and throttled items come back as UnprocessedItems." }
    ],
    why: "Backoff smooths short bursts, and on-demand mode follows traffic, which suits unpredictable spikes. If one partition key were hot, the key design would need fixing instead.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html"] },

  { id: "dva-4-11", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc",
    q: "A Lambda function creates a new DynamoDB client and loads a 20 MB configuration file from S3 at the start of every invocation. Warm invocations still take 900 ms. What should the developer change first?",
    opts: [
      "Move the client creation and the file load outside the handler, so warm invocations reuse them.",
      "Turn on provisioned concurrency for the function, so that every invocation starts in a warm environment.",
      "Raise the function's timeout to 3 seconds, so slow invocations no longer risk failing.",
      "Increase the memory to the maximum, so the download from S3 finishes much faster."
    ], a: 0,
    no: [null,
      "Warm environments still run the handler, which repeats the work every time.",
      "A longer timeout allows slowness. It doesn't remove it.",
      "More memory may speed it up a little at a much higher price, and the work still repeats on every call."],
    why: "Code outside the handler runs once per execution environment, and what it creates (clients, connections, loaded files) is reused by later invocations in that environment.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html"] },

  { id: "dva-4-12", exam: "DVA", dva: "4.1", topic: "cloudtrail", type: "mc",
    q: "A Lambda function's environment variables were changed yesterday, and the function began failing. The team needs to know who made the change and when. Where should the developer look?",
    opts: [
      "CloudTrail event history, for an UpdateFunctionConfiguration event on the function.",
      "The function's CloudWatch Logs log group, which records every change made to the function's configuration.",
      "The function's X-Ray traces from around the time that the failures started.",
      "The function's CloudWatch metrics for Errors and Invocations over the last day."
    ], a: 0,
    no: [null,
      "Function logs hold what the code wrote, not changes to the function's settings.",
      "Traces show requests and their timing, not who changed a setting.",
      "Metrics show when the failures started, not who changed what."],
    why: "CloudTrail records management API calls with the caller's identity and the time (the event name is UpdateFunctionConfiguration20150331v2, and Lambda leaves the environment values out of the record). Event history keeps the last 90 days of management events.",
    doc: ["https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html"] },

  { id: "dva-4-13", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc",
    q: "A team wants to query its Lambda logs by fields such as orderId and level in CloudWatch Logs Insights, without writing parse commands in each query. What should the developer do?",
    opts: [
      "Set the function's log format to JSON, and log structured objects that include orderId and level.",
      "Start every log line with the order ID in square brackets, followed by the message.",
      "Export the logs to an S3 bucket every hour, and query the exported files with Amazon Athena.",
      "Turn on X-Ray tracing, so that each log line is linked to the request's orderId."
    ], a: 0,
    no: [null,
      "Plain-text prefixes still need a parse pattern in every query.",
      "That adds an export pipeline for something Logs Insights does directly with JSON logs.",
      "Traces don't add fields to log events."],
    why: "Logs Insights discovers the fields in JSON log events automatically. Lambda's JSON log format also adds fields such as level and requestId.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-logformat.html"] }
);
