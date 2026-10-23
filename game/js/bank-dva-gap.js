// Question bank batch: gap fill for DVA-C02 topics an expert review found thin (session revocation, envelope
// encryption, optimistic locking, partial batch responses, SAM gradual deploys, X-Ray annotations and sampling,
// CodePipeline, composite alarms, function URLs, SnapStart, permissions boundaries, decoded authorization messages,
// SQS long polling, CodeDeploy hooks, Query and Scan paging, buildspecs, presigned URLs, CORS, CloudFormation change
// sets, drift and StackSets, Lambda concurrency, Elastic Beanstalk deployment policies, API Gateway caching and Lambda
// throttling). Same schema and rules as js/bank-dva.js, plus "Select THREE." multi questions with six items.
// Facts checked against the AWS docs in October 2026. The X-Ray SDKs and daemon are in maintenance mode (since
// Feb 25, 2026); no answer here marks the OpenTelemetry (ADOT) route as wrong.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // ---------------------------------------------------------------- Domain 1: Development with AWS Services

  // DynamoDB optimistic locking
  { id: "dva-1-901", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "Two copies of an inventory Lambda function each call GetItem on the same product, subtract the quantity they sold, and write the item back with PutItem. Some sales vanish from the count. The developer must detect a conflicting write without holding locks, and the table must stay a single-table design with no extra tables. What should the developer do?",
    opts: [
      "Add a numeric version attribute, write with a condition that the stored version equals the one that was read, and increment it in the same write.",
      "Read the product with a strongly consistent GetItem, so that each function always starts from the newest copy before writing it back.",
      "Write the new counts with BatchWriteItem, so that DynamoDB applies the puts from both functions together as one ordered request.",
      "Turn on DynamoDB Streams and have a third function compare each new image with the old image, rewriting any count that went wrong."
    ], a: 0,
    no: [null,
      "A strongly consistent read is newest at read time only. The other function can still write between this read and the PutItem, so one update is lost.",
      "BatchWriteItem doesn't support condition expressions, and a batch isn't ordered or atomic across callers, so lost updates still happen.",
      "Streams report a change after it is stored. The lost update has already happened, and repairing it later is slow and error-prone."],
    why: "Optimistic locking keeps a version number on the item. Each write carries a condition that the version still matches what was read and bumps the version, so the second writer gets ConditionalCheckFailedException instead of silently overwriting the first.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BestPractices_ImplementingVersionControl.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html"] },

  { id: "dva-1-902", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A Java service uses the AWS SDK for Java 2.x DynamoDB enhanced client with its default extensions. The Customer bean marks a numeric getter with @DynamoDbVersionAttribute. Process A reads customer 42 at version 7. Before A saves, process B reads the same item, changes it, and saves it. What happens when process A calls updateItem with its copy?",
    opts: [
      "The write is rejected with ConditionalCheckFailedException, because the stored version is now 8, and the item keeps B's changes.",
      "The write succeeds and replaces B's changes, because the client always sends the latest copy that this process holds in memory.",
      "The client merges the two copies attribute by attribute, keeping B's changes and adding A's, and then sets the version to 9.",
      "The call waits until B's lock on the item is released, then writes A's copy and sets the version attribute of the item to 9."
    ], a: 0,
    no: [null,
      "That is last-writer-wins, the problem the version attribute exists to prevent. The extension adds a version condition to every write.",
      "The enhanced client never merges copies. It sends A's item with a condition on version 7, which no longer matches.",
      "Optimistic locking holds no locks at all. Nothing waits; the conditional write simply fails when the version has moved."],
    why: "The enhanced client loads VersionedRecordExtension by default. It adds a condition to each write that the persisted version equals the version the application last read, and increments the version on success, so a stale copy fails with ConditionalCheckFailedException.",
    doc: ["https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/ddb-en-client-extensions.html"] },

  { id: "dva-1-903", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A booking service uses a version attribute and a condition expression on every UpdateItem. When it gets ConditionalCheckFailedException, it retries the same UpdateItem request, with the same expected version, using exponential backoff. Under load those retries never succeed. What should the developer change?",
    opts: [
      "Raise the table's provisioned write capacity, so that the retried writes stop being throttled and complete on their next attempt.",
      "Add full jitter to the exponential backoff, so that the competing writers stop retrying at the same moments as one another.",
      "On the exception, read the item again, reapply the change to the fresh copy, and retry the write with the newly read version.",
      "Drop the condition expression after three failed attempts, so that the update is always written in the end and is never lost."
    ], a: 2,
    no: [
      "The exception isn't throttling. The condition failed because the version moved, and more capacity doesn't change the stored version.",
      "Jitter spreads out retries, but each retry still expects the old version, which will never match again.",
      null,
      "Writing without the condition overwrites the other writer's change, which is exactly the lost update the lock prevents."],
    why: "A failed condition means someone else wrote first. Resending the same request can't succeed because the expected version is stale; the client must re-read, recompute from the current item, and try the conditional write again.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/BestPractices_ImplementingVersionControl.html", "https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/ddb-en-client-extensions.html"] },

  // SQS -> Lambda ReportBatchItemFailures
  { id: "dva-1-904", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A Lambda function reads an SQS standard queue with a batch size of 10. When one message in a batch is malformed, the function throws, and all 10 messages come back, so the nine good ones are processed again and customers get duplicate emails. The batch size must stay at 10 for throughput. What should the developer do?",
    opts: [
      "Set the queue's maxReceiveCount to 1 on its redrive policy, so that any batch that fails is moved straight to the dead-letter queue.",
      "Configure an on-failure destination on the function's asynchronous invocation settings, so that failed batches go to another queue.",
      "Change the queue to a FIFO queue, so that each message is delivered exactly once and none of the good messages are delivered again.",
      "Turn on ReportBatchItemFailures for the event source mapping and return the IDs of only the failed messages in batchItemFailures."
    ], a: 3,
    no: [
      "The whole batch, good messages included, would go to the dead-letter queue after one failure, and transient errors would never be retried.",
      "The event source mapping invokes the function synchronously, so the asynchronous invocation settings don't apply to it.",
      "FIFO exactly-once covers sending, not this case. A failed batch still returns its messages, and order rules make reprocessing stricter.",
      null],
    why: "With FunctionResponseTypes set to ReportBatchItemFailures, the function catches per-message errors and returns the failed message IDs. Lambda deletes the rest of the batch and makes only the failed messages visible again.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html"] },

  { id: "dva-1-905", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "After turning on ReportBatchItemFailures, a developer sees that whenever one message fails, every message in the batch still returns to the queue. The function returns { \"batchItemFailures\": [ { \"itemIdentifier\": record.receiptHandle } ] } for each failed record. What is wrong?",
    opts: [
      "The function must also call DeleteMessage itself for every message that it processed, before it returns the list of failures.",
      "The itemIdentifier must be the record's messageId. An identifier that matches no message makes Lambda fail the whole batch.",
      "The response must be returned as an HTTP 207 status code, so that Lambda can tell a partial success from a complete failure.",
      "The function must throw an exception after building the list, so that Lambda reads the list from the error that is returned."
    ], a: 1,
    no: [
      "With partial batch responses Lambda deletes the successful messages itself; the function only reports the failures.",
      null,
      "There is no HTTP status code in this response. Lambda reads the batchItemFailures list from the returned JSON.",
      "An exception makes Lambda treat the whole batch as failed, which is the behavior the developer is trying to stop."],
    why: "batchItemFailures must list message IDs as itemIdentifier values. Lambda treats an empty, null or unknown itemIdentifier, or invalid JSON, as a complete failure of the batch, so a receipt handle sends every message back.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html"] },

  { id: "dva-1-906", exam: "DVA", dva: "1.2", topic: "lambda", type: "multi", hint: "Select THREE.",
    q: "A developer turns on ReportBatchItemFailures for a Lambda function that reads an SQS FIFO queue. Which statements about how Lambda handles the function's response are true? (Select THREE.)",
    items: [
      { t: "If the function returns an empty batchItemFailures list, Lambda treats the whole batch as a success.", ok: true },
      { t: "If the function throws an unhandled exception, Lambda treats the entire batch as a failure.", ok: true },
      { t: "For a FIFO queue, the function should stop at the first failure and return it and every message after it.", ok: true },
      { t: "ReportBatchItemFailures must also be switched on in the redrive policy of the source queue.", ok: false, no: "It is a setting of the event source mapping (FunctionResponseTypes). The queue's redrive policy only sets maxReceiveCount and the dead-letter queue." },
      { t: "Lambda sends each failed message straight to the queue's dead-letter queue on the first failure.", ok: false, no: "Failed messages become visible again after the visibility timeout. They move to the dead-letter queue only after maxReceiveCount receives." },
      { t: "For a FIFO queue, the function should report only the failed message and go on with the rest.", ok: false, no: "Processing later messages in the same group after a failure breaks FIFO ordering. Return the failed one and all unprocessed ones." }
    ],
    why: "An empty or null list means complete success, and an exception means complete failure. With FIFO queues AWS says to stop at the first failure and return all failed and unprocessed messages, so the group's order is kept.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html"] },

  // Lambda function URLs
  { id: "dva-1-907", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A partner company calls one Lambda function as a webhook. The team doesn't need request validation, usage plans or custom domains, and wants the simplest HTTPS endpoint. Only one IAM role in the partner's AWS account may call it, using SigV4-signed requests. What should the developer set up?",
    opts: [
      "A function URL with the NONE auth type, and a shared API key that the function checks in a custom request header on every call.",
      "A function URL with the AWS_IAM auth type, plus a resource-based policy statement that allows the partner's role to invoke it.",
      "A function URL that uses an Amazon Cognito user pool authorizer, with a user pool account created for the partner's role.",
      "A function URL with the NONE auth type and a usage plan that limits the endpoint to the partner's account ID and source IP."
    ], a: 1,
    no: [
      "NONE means anyone with the URL can reach the function, and a hand-rolled shared secret isn't SigV4 or IAM authorization.",
      null,
      "Function URLs support only the AWS_IAM and NONE auth types. Cognito authorizers belong to API Gateway.",
      "Usage plans are an API Gateway REST API feature. Function URLs have no usage plans or API keys."],
    why: "With AWS_IAM, Lambda authorizes SigV4 requests against IAM. A caller in another account needs both an identity policy and a statement in the function's resource-based policy (lambda:InvokeFunctionUrl, and lambda:InvokeFunction limited to calls through the URL).",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html"] },

  { id: "dva-1-908", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A developer adds an AWS::Lambda::Url resource with AuthType NONE to a CloudFormation template for a public status page. The stack deploys, but every browser request to the URL gets 403 Forbidden. The function works when tested in the console. What is the most likely cause?",
    opts: [
      "The function needs a CORS configuration on the URL that allows the browser's origin before any request can reach the handler.",
      "Function URLs with the NONE auth type also need a TLS certificate from AWS Certificate Manager attached to the endpoint.",
      "The template has no resource-based policy that grants principal * lambda:InvokeFunctionUrl and lambda:InvokeFunction.",
      "The execution role is missing the lambda:InvokeFunctionUrl permission, which the function uses to accept calls from the internet."
    ], a: 2,
    no: [
      "Missing CORS headers make the browser block the page's script from reading the response. A plain visit to the URL would still work, not return 403.",
      "Lambda serves function URLs over HTTPS with its own certificate on the lambda-url domain. There is nothing to attach.",
      null,
      "The execution role is what the function uses to call other services. Who may call the function is set in its resource-based policy."],
    why: "Even with NONE, the function's resource-based policy must grant public access, or callers get 403. The console and AWS SAM add that policy automatically; with CloudFormation, the CLI or the API you add it yourself (AWS::Lambda::Permission statements).",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html"] },

  { id: "dva-1-909", exam: "DVA", dva: "1.2", topic: "lambda", type: "multi", hint: "Select THREE.",
    q: "A developer is deciding between a Lambda function URL and Amazon API Gateway for a small internal tool. Which statements about Lambda function URLs are true? (Select THREE.)",
    items: [
      { t: "A function URL can point to a function alias or to $LATEST, but not to a numbered version.", ok: true },
      { t: "CORS settings, such as allowed origins and methods, can be set on the function URL itself.", ok: true },
      { t: "The endpoint has the form https://<url-id>.lambda-url.<region>.on.aws and never changes.", ok: true },
      { t: "A function URL can use a Lambda authorizer to check a bearer token before the function runs.", ok: false, no: "Function URLs support only AWS_IAM and NONE. Token checks must happen in the function code, or you use API Gateway." },
      { t: "A function URL stops each request after 29 seconds, the same integration timeout as API Gateway.", ok: false, no: "A request through a function URL can run as long as the function's own timeout, up to 15 minutes." },
      { t: "A function URL supports API keys and usage plans for limiting how often each client may call.", ok: false, no: "API keys and usage plans are API Gateway features. To limit a function URL's rate, set reserved concurrency." }
    ],
    why: "Function URLs attach to an alias or $LATEST, use a fixed lambda-url.<region>.on.aws address, and carry their own CORS settings. They offer only IAM or no auth, and their throttling comes from the function's reserved concurrency.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html", "https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html"] },

  // SQS long polling
  { id: "dva-1-910", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc",
    q: "A worker on Amazon ECS calls ReceiveMessage in a tight loop on a queue that is often empty for minutes at a time. The SQS bill is dominated by empty receives, and the worker's CPU stays busy doing nothing. The worker must still pick up a new message within a second or two of its arrival. What should the developer do?",
    opts: [
      "Raise the queue's visibility timeout to 20 seconds, so that each receive call holds on to the queue for longer before returning.",
      "Set the queue's ReceiveMessageWaitTimeSeconds to 20, so that each receive waits for a message instead of returning at once.",
      "Set the queue's DelaySeconds to 20, so that the messages build up and each receive call comes back with a fuller batch of them.",
      "Add a 20-second sleep between receive calls in the worker, so that it makes fewer calls to the queue each hour while it is empty."
    ], a: 1,
    no: [
      "The visibility timeout hides messages after they are received. It has no effect on how long an empty receive waits.",
      null,
      "A delay queue holds every new message back for 20 seconds, which breaks the pick-up-within-seconds requirement.",
      "Sleeping cuts calls but a message arriving mid-sleep waits up to 20 seconds. Long polling returns as soon as one arrives."],
    why: "Long polling (a wait time from 1 to 20 seconds) lets ReceiveMessage wait until a message is available and return it at once, so empty responses and their cost drop without adding latency.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html"] },

  { id: "dva-1-911", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc",
    q: "A test sends three messages to a new SQS standard queue that has default settings, then immediately calls ReceiveMessage once with MaxNumberOfMessages set to 10. It gets back only one message, and sometimes none. No other consumer reads the queue. Why?",
    opts: [
      "The queue uses short polling, which asks only a sampled subset of SQS servers, so one call may not see every message there.",
      "Newly sent messages stay invisible for the queue's default 30-second visibility timeout before any consumer can receive them.",
      "SendMessage is eventually consistent, so new messages can't be received until SQS has replicated them to a second Region.",
      "Standard queues return at most one message for each call unless content-based deduplication is turned on for the queue."
    ], a: 0,
    no: [null,
      "The visibility timeout starts when a message is received, not when it is sent. New messages are visible at once unless a delay is set.",
      "SQS stores messages redundantly within one Region. It never waits on another Region before delivering.",
      "Content-based deduplication is a FIFO queue feature, and standard queues return up to 10 messages per call."],
    why: "Short polling, the default, samples a weighted random subset of servers and responds immediately, so it can return fewer messages or none. Long polling queries all servers and cuts these false empty responses.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html"] },

  { id: "dva-1-912", exam: "DVA", dva: "1.1", topic: "sqs", type: "multi", hint: "Select TWO.",
    q: "A developer wants consumers of an existing SQS queue to use long polling. Which actions turn long polling on? (Select TWO.)",
    items: [
      { t: "Set the ReceiveMessageWaitTimeSeconds attribute of the queue to a value from 1 to 20.", ok: true },
      { t: "Pass WaitTimeSeconds with a value from 1 to 20 on each ReceiveMessage call the consumer makes.", ok: true },
      { t: "Set the ReceiveMessage call's WaitTimeSeconds to 60, for a full minute of waiting per call.", ok: false, no: "The longest long-polling wait is 20 seconds; 60 is not a valid value." },
      { t: "Set the queue's VisibilityTimeout attribute to 20 seconds, so each receive holds longer.", ok: false, no: "The visibility timeout controls how long a received message stays hidden, not how long a receive waits." },
      { t: "Set MaxNumberOfMessages to 10 on each ReceiveMessage call, so each call returns more.", ok: false, no: "That raises how many messages one call can return, but the call still returns at once when the queue is empty." }
    ],
    why: "Long polling is on whenever the receive wait time is above 0: either the queue attribute ReceiveMessageWaitTimeSeconds or the WaitTimeSeconds request parameter. Short polling happens only when the call sets 0, or sets nothing and the queue attribute is 0. The maximum is 20 seconds.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html", "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html"] },

  // DynamoDB Query vs Scan and pagination
  { id: "dva-1-913", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "An order history page calls Query on a table with partition key customerId. For large customers the page shows only part of their orders, and the response includes a LastEvaluatedKey. The page must list every order for the customer. What should the developer do?",
    opts: [
      "Set Limit to 10,000 on the Query, so that DynamoDB returns all of the customer's orders together in a single response.",
      "Repeat the Query, passing each LastEvaluatedKey as ExclusiveStartKey, until a response comes back without a LastEvaluatedKey.",
      "Switch the call to Scan with a filter on customerId, because Scan reads every item in the table and so it misses none of them.",
      "Set ConsistentRead to true on the Query, so that orders still being replicated to other partitions are included in the result."
    ], a: 1,
    no: [
      "Each Query page stops at 1 MB of data read, whatever Limit says, so big result sets still come back in pages.",
      null,
      "Scan is also limited to 1 MB per page, and it reads the whole table, which costs far more than a Query on the key.",
      "Consistency doesn't cause missing pages. A LastEvaluatedKey means DynamoDB stopped at the 1 MB page limit."],
    why: "Query and Scan return at most 1 MB per call. A LastEvaluatedKey in the response means more results exist; pass it back as ExclusiveStartKey until it is absent (the SDK paginators do this loop for you).",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html"] },

  { id: "dva-1-914", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A table stores orders with partition key customerId and sort key orderDate (an ISO 8601 string). A report needs one customer's orders from March 2026, and the table holds 40 million items. Which call returns those orders while reading the least data?",
    opts: [
      "Query with a key condition on customerId alone and a FilterExpression of orderDate BETWEEN the first and last days of March.",
      "Scan with a FilterExpression of customerId equals the customer AND orderDate BETWEEN the first and last days of March 2026.",
      "BatchGetItem with one key for every day in March, using the customer's ID together with each day's date as the sort key.",
      "Query with a key condition of customerId equals the customer AND orderDate BETWEEN the first and last days of March 2026."
    ], a: 3,
    no: [
      "A filter can't use key attributes, and a filter runs after the read, so all of the customer's orders would be read anyway.",
      "Scan reads all 40 million items and filters afterward, paying for every item it reads.",
      "BatchGetItem needs exact keys. Orders whose orderDate includes a time won't match a bare date, and many days have no order at all.",
      null],
    why: "A key condition can match the partition key exactly and range over the sort key with BETWEEN, so DynamoDB reads only the matching items. Filter expressions run after the read, can't use key attributes, and don't reduce the capacity consumed.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html"] },

  { id: "dva-1-915", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "multi", hint: "Select TWO.",
    q: "A Query uses Limit 50 and a FilterExpression of status = 'OPEN'. It returns 12 items and a LastEvaluatedKey. Which statements explain this result? (Select TWO.)",
    items: [
      { t: "Limit caps how many items are read before the filter runs, so fewer than 50 can come back.", ok: true },
      { t: "The items the filter dropped were still read, so they consumed read capacity too.", ok: true },
      { t: "The LastEvaluatedKey shows that more than 50 items with status OPEN remain to be read.", ok: false, no: "It means only that DynamoDB stopped reading early. The next page may hold no OPEN items at all." },
      { t: "The filter runs before items are read, so the Query used capacity for only 12 items.", ok: false, no: "Filters run after the read and before results are returned, so all 50 evaluated items were charged." },
      { t: "Items are missing because the Query used eventually consistent reads by default.", ok: false, no: "Consistency affects how fresh items are, not how many come back. Limit and the filter explain the 12." }
    ],
    why: "Limit sets how many items DynamoDB evaluates per page, before filtering, and a filter only removes items after they are read and charged. So a page can return fewer items than Limit and still carry a LastEvaluatedKey.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.FilterExpression.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html"] },

  // S3 presigned URLs
  { id: "dva-1-916", exam: "DVA", dva: "1.1", topic: "s3", type: "mc",
    q: "A Lambda function uses the SDK to create presigned GET URLs for invoices with an expiry of 24 hours. Customers report that many links fail with an ExpiredToken error a few hours after they are emailed. The bucket policy and the function's permissions haven't changed. Why?",
    opts: [
      "The function signs with its execution role's temporary credentials, and a presigned URL stops working when those credentials expire.",
      "A presigned URL can be valid for at most one hour when it is created with an AWS SDK, so any longer expiry is reduced to an hour.",
      "The bucket's default encryption uses SSE-KMS, and objects encrypted with KMS keys can't be downloaded through presigned URLs.",
      "Each presigned URL works for only one download, so links that customers open a second time are rejected as expired tokens."
    ], a: 0,
    no: [null,
      "With SigV4 and IAM user credentials, SDK-created URLs can last up to 7 days. The hour-scale limit here comes from the role session.",
      "Presigned URLs work with SSE-KMS objects as long as the signer may use the key. The error is about an expired token.",
      "A presigned URL can be used many times until it expires. It isn't single-use."],
    why: "A presigned URL can't outlive the credentials that signed it. URLs signed with role credentials, such as a Lambda execution role, expire when the session's temporary credentials expire, even if a longer expiry was requested.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html"] },

  { id: "dva-1-917", exam: "DVA", dva: "1.1", topic: "s3", type: "mc",
    q: "A mobile app lets users upload profile photos of up to 5 MB. The photos must go straight to an S3 bucket without passing through the backend servers, and the app must not hold any AWS credentials. What should the backend do?",
    opts: [
      "Create a presigned GET URL for the photo's object key, and have the app send its PUT request with the photo to that URL.",
      "Add a bucket policy that allows s3:PutObject from any principal, limited to the uploads/ prefix of the bucket, for the app.",
      "Generate a presigned PUT URL for a specific object key with a short expiry, and have the app upload the photo to that URL.",
      "Create one IAM user for each app user, and send that user's access keys to the app over HTTPS when the user signs in."
    ], a: 2,
    no: [
      "The HTTP method is part of the signature. A URL signed for GET fails when it is used for a PUT.",
      "That makes the prefix writable by anyone on the internet, not just signed-in users of the app.",
      null,
      "Long-term keys on devices are a security risk and don't scale; the app must hold no credentials at all."],
    why: "A presigned PUT URL lets a holder upload one specific object until the URL expires, using the permissions of the principal that signed it. The client needs no AWS credentials, and the traffic goes straight to S3.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html"] },

  { id: "dva-1-918", exam: "DVA", dva: "1.1", topic: "s3", type: "multi", hint: "Select TWO.",
    q: "A developer documents how S3 presigned URLs behave for a support team. Which statements are true? (Select TWO.)",
    items: [
      { t: "A URL acts with the signer's permissions, so it fails once the signer loses s3:GetObject.", ok: true },
      { t: "A URL signed with IAM user keys and SigV4 through an SDK can be valid for up to 7 days.", ok: true },
      { t: "A presigned URL created in the S3 console can be set to last for up to 7 days.", ok: false, no: "In the S3 console the expiry can be set from 1 minute to 12 hours." },
      { t: "A presigned URL can be used for only one request, and S3 rejects any later use of it.", ok: false, no: "It can be used any number of times until it expires." },
      { t: "Anyone who uses the URL also needs IAM permissions of their own for the object it names.", ok: false, no: "The URL carries the signer's authorization, so the holder needs no AWS credentials." }
    ],
    why: "S3 evaluates a presigned request as the principal who signed it, at the time of the request. IAM user credentials with SigV4 allow up to 7 days, the console allows up to 12 hours, and temporary credentials cap the URL at their own lifetime.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html"] },

  // API Gateway CORS
  { id: "dva-1-919", exam: "DVA", dva: "1.1", topic: "apigateway", type: "mc",
    q: "A single-page app on https://app.example.com calls GET /items on an API Gateway REST API that uses a Lambda proxy integration. The developer chose Enable CORS in the console and redeployed the stage. The browser still blocks the response, saying the Access-Control-Allow-Origin header is missing. What should the developer do?",
    opts: [
      "Add an OPTIONS method to the /items resource with a mock integration that returns the CORS headers for the browser's preflight.",
      "Add a statement to the function's resource-based policy that allows requests that come from the https://app.example.com origin.",
      "Change the Lambda function to return an Access-Control-Allow-Origin header that names the app's origin in each response.",
      "Turn on binary media types for the API, so that API Gateway passes all of the response headers through to the browser unchanged."
    ], a: 2,
    no: [
      "Enable CORS already created that OPTIONS method. The missing header is on the GET response itself.",
      "A resource-based policy controls who may invoke the function. Browsers enforce CORS from response headers.",
      null,
      "Binary media types control how payloads are encoded; they don't add CORS headers."],
    why: "With a proxy integration, API Gateway returns the function's response as is, so the function must add Access-Control-Allow-Origin (and any other CORS headers) to its own responses. The console's Enable CORS only sets up the OPTIONS preflight and non-proxy responses.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html"] },

  { id: "dva-1-920", exam: "DVA", dva: "1.1", topic: "apigateway", type: "mc",
    q: "An HTTP API protects its routes with a JWT authorizer. Browser calls from another origin fail because the preflight OPTIONS request has no Authorization header and is rejected with 401. The team wants API Gateway, not a Lambda function, to answer preflight requests. What should the developer do?",
    opts: [
      "Add an OPTIONS route for each path and attach the same JWT authorizer to it, so that the preflight is checked like the other calls.",
      "Configure CORS on the HTTP API with the app's origin, methods and headers, so that API Gateway answers preflight requests itself.",
      "Return the CORS headers from the integration for every route, so that the backend answers OPTIONS requests with an allowed origin.",
      "Switch the JWT authorizer to a Lambda authorizer with a 0-second cache TTL, so that it lets OPTIONS requests through to the routes."
    ], a: 1,
    no: [
      "Browsers never send credentials on a preflight, so an authorizer on OPTIONS rejects it every time.",
      null,
      "That makes the backend answer preflights, which the team doesn't want. With CORS configured, API Gateway ignores backend CORS headers.",
      "Any authorizer on the preflight route still needs a token the browser won't send, and caching has nothing to do with it."],
    why: "When CORS is configured on an HTTP API, API Gateway answers preflight OPTIONS requests itself, even with no OPTIONS route, and adds the configured headers to responses. (With an authorized $default route, AWS suggests an unauthenticated OPTIONS /{proxy+} route.)",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html"] },

  { id: "dva-1-921", exam: "DVA", dva: "1.1", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A page on https://shop.example.com sends POST /orders to a REST API on another domain with Content-Type: application/json and an Authorization header, so the browser sends a preflight first. Which conditions must be met for the browser to let the call through? (Select TWO.)",
    items: [
      { t: "The OPTIONS response lists Content-Type and Authorization in Access-Control-Allow-Headers.", ok: true },
      { t: "The POST response carries an Access-Control-Allow-Origin value that allows the shop's origin.", ok: true },
      { t: "The execution role of the API allows the apigateway:OPTIONS action on every resource path.", ok: false, no: "CORS is enforced by the browser from response headers; no IAM action is involved." },
      { t: "The browser sends an Access-Control-Allow-Origin header along with its POST request.", ok: false, no: "Access-Control-Allow-Origin is a response header. The browser sends Origin." },
      { t: "The API uses an edge-optimized endpoint type, so that CloudFront handles CORS for it.", ok: false, no: "CORS works the same on Regional, edge-optimized and private endpoints." }
    ],
    why: "The preflight must say the method and headers are allowed (Access-Control-Allow-Methods and Access-Control-Allow-Headers), and the actual response must carry Access-Control-Allow-Origin matching the page's origin. Both are response headers checked by the browser.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html"] },

  // ---------------------------------------------------------------- Domain 2: Security

  // Revoking role sessions
  { id: "dva-2-901", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "A developer accidentally pasted temporary credentials from an AssumeRole session for the deploy-role role into a public chat. The session has 10 hours left. A CI pipeline assumes deploy-role fresh on every run and must keep working. What should the developer do to cut off the leaked credentials immediately?",
    opts: [
      "Use Revoke active sessions on deploy-role, which adds a policy denying everything to sessions issued before that moment.",
      "Rotate the access keys of the IAM user who assumed the role, so that the temporary credentials made from them stop working.",
      "Detach every permissions policy from deploy-role until the session's 10 hours have passed, then attach the policies again.",
      "Delete deploy-role and create it again under the same name, so that every session that was issued for the old role ends."
    ], a: 0,
    no: [null,
      "Temporary credentials are independent of the keys used to request them. They stay valid until they expire.",
      "That also blocks the pipeline's new sessions for 10 hours, which breaks the requirement.",
      "A recreated role is a new principal, so trust policies and resource policies that named the old one stop working, and it is far more disruptive than needed."],
    why: "Revoke active sessions attaches the AWSRevokeOlderSessions inline policy, which denies all actions when aws:TokenIssueTime is earlier than the revocation time. Sessions created afterward, like the pipeline's next run, aren't affected.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html"] },

  { id: "dva-2-902", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "A security script must revoke every session of a role that was issued before 2026-11-02T09:00:00Z, without touching sessions issued after that time. Which inline policy statement should the script attach to the role?",
    opts: [
      "Effect Deny, Action *, Resource *, Condition DateGreaterThan aws:TokenIssueTime 2026-11-02T09:00:00Z.",
      "Effect Deny, Action *, Resource *, Condition DateLessThan aws:CurrentTime 2026-11-02T09:00:00Z.",
      "Effect Deny, Action *, Resource *, Condition DateLessThan aws:TokenIssueTime 2026-11-02T09:00:00Z.",
      "Effect Deny, Action sts:AssumeRole, Resource *, Condition DateLessThan aws:TokenIssueTime 2026-11-02T09:00:00Z."
    ], a: 2,
    no: [
      "DateGreaterThan denies the sessions issued after the cutoff, the opposite of what is needed.",
      "aws:CurrentTime is the time of each request, so this denies every session until that time and then nothing at all.",
      null,
      "Denying sts:AssumeRole doesn't stop credentials already issued from calling other services."],
    why: "aws:TokenIssueTime is the time the temporary credentials were created. Denying all actions when it is earlier than the cutoff kills older sessions only; long-term IAM user keys have no token issue time and aren't affected.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html", "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html"] },

  { id: "dva-2-903", exam: "DVA", dva: "2.1", topic: "iam", type: "multi", hint: "Select THREE.",
    q: "An administrator chooses Revoke active sessions on a role that developers assume from the AWS CLI. Which statements about what happens are true? (Select THREE.)",
    items: [
      { t: "IAM attaches an inline policy named AWSRevokeOlderSessions to the role.", ok: true },
      { t: "Sessions that are created about 30 seconds or more after the revocation keep working.", ok: true },
      { t: "The administrator needs the iam:PutRolePolicy permission on the role to do this.", ok: true },
      { t: "The role's trust policy is changed, so no one can assume it until it is restored.", ok: false, no: "The trust policy isn't touched. New sessions can be created right away; only older ones are denied." },
      { t: "The same steps work on service-linked roles as well as on roles the account made.", ok: false, no: "You can't revoke sessions for a service-linked role." },
      { t: "The AWS CLI discards its cached credentials automatically for the revoked role.", ok: false, no: "The CLI caches credentials until they expire. Developers delete ~/.aws/cli/cache to force new ones." }
    ],
    why: "The console adds AWSRevokeOlderSessions (which needs iam:PutRolePolicy), denying sessions issued before about 30 seconds after the click, to cover propagation. It can't be used on service-linked roles, and cached CLI credentials must be cleared by hand.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_revoke-sessions.html"] },

  // KMS Encrypt limit and envelope encryption
  { id: "dva-2-904", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "A service encrypts uploaded PDF files of 1 to 20 MB by passing each file to the KMS Encrypt API with a symmetric KMS key. Every call fails with a validation error about the plaintext length. What should the developer do?",
    opts: [
      "Ask AWS Support to raise the Encrypt plaintext size quota for the account, so that whole files up to 20 MB fit in one request.",
      "Call GenerateDataKey, encrypt the file locally with the plaintext data key, and store the encrypted data key with the file.",
      "Split each file into 4 KB chunks and call Encrypt once for each chunk, storing the ciphertext chunks in order in the bucket.",
      "Create an asymmetric RSA_4096 KMS key and call Encrypt with it, because asymmetric keys accept much larger amounts of plaintext."
    ], a: 1,
    no: [
      "The 4,096-byte limit for symmetric Encrypt is fixed. It isn't a quota you can raise.",
      null,
      "It would work, but a 20 MB file means thousands of KMS calls, adding latency and cost and risking request-rate throttling.",
      "RSA_4096 accepts even less plaintext (about 446 to 470 bytes), not more."],
    why: "KMS Encrypt takes at most 4,096 bytes with a symmetric key. For larger data, use envelope encryption: GenerateDataKey returns a plaintext data key to encrypt locally and an encrypted copy to store, and the plaintext key is discarded after use.",
    doc: ["https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html", "https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html"] },

  { id: "dva-2-905", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "Files were encrypted with envelope encryption: each file was encrypted locally with a data key from GenerateDataKey, and the encrypted data key was stored in the file's metadata. A reader service must now decrypt a file. What should it do?",
    opts: [
      "Call GenerateDataKey again with the same KMS key ID, which returns the same data key that was used when the file was encrypted.",
      "Call ReEncrypt with the encrypted data key, which returns the plaintext data key so that the reader can decrypt the file locally.",
      "Send the encrypted file to KMS Decrypt with the KMS key ID, which returns the decrypted file contents directly to the service.",
      "Send the stored encrypted data key to KMS Decrypt, then use the plaintext key it returns to decrypt the file locally."
    ], a: 3,
    no: [
      "Each GenerateDataKey call returns a new random key; KMS doesn't store or reproduce data keys.",
      "ReEncrypt decrypts and re-encrypts ciphertext under another KMS key inside KMS. It never returns plaintext.",
      "KMS never saw the file and can't decrypt data that was encrypted locally; Decrypt also accepts only small ciphertexts.",
      null],
    why: "To reverse envelope encryption, the reader decrypts the small encrypted data key with KMS Decrypt, uses the returned plaintext key to decrypt the file locally, and then discards that key.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/kms-cryptography.html", "https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html"] },

  { id: "dva-2-906", exam: "DVA", dva: "2.2", topic: "kms", type: "multi", hint: "Select TWO.",
    q: "A developer is designing envelope encryption with AWS KMS data keys. Which statements are true? (Select TWO.)",
    items: [
      { t: "GenerateDataKey returns a plaintext copy of the key and a copy encrypted under the KMS key.", ok: true },
      { t: "GenerateDataKeyWithoutPlaintext suits a component that will only encrypt later, after Decrypt.", ok: true },
      { t: "KMS keeps each data key it makes, so the app can fetch the key again later by its key ID.", ok: false, no: "KMS doesn't store, manage or track data keys. The app stores the encrypted copy itself." },
      { t: "A data key can encrypt at most 4,096 bytes, the same size limit as the KMS Encrypt call.", ok: false, no: "The data key is used outside KMS, so it can encrypt data of any size. 4,096 bytes is the limit of Encrypt." },
      { t: "KMS rotates every data key once a year when automatic key rotation is turned on for the key.", ok: false, no: "Automatic rotation changes the KMS key's key material. Data keys are never rotated by KMS." }
    ],
    why: "GenerateDataKey hands back the key twice: plaintext to use now and encrypted to store. GenerateDataKeyWithoutPlaintext returns only the encrypted copy, for systems that encrypt later. KMS doesn't keep or rotate data keys.",
    doc: ["https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html", "https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyWithoutPlaintext.html"] },

  // IAM permissions boundaries
  { id: "dva-2-907", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "Developers in a standalone AWS account (not in AWS Organizations) must be able to create IAM roles for their own Lambda functions. No role they create may ever have more access than the DevBoundary managed policy allows, even if they attach AdministratorAccess to it. What should the administrator do?",
    opts: [
      "Attach DevBoundary as a permissions boundary on each developer's own IAM user, so that any roles those users create inherit it.",
      "Create a service control policy that matches DevBoundary, and attach it to the account so that it limits every new role there.",
      "Turn on IAM Access Analyzer policy validation, so that any role that is created with too many permissions is rejected at creation.",
      "Allow iam:CreateRole only with an iam:PermissionsBoundary condition that equals the DevBoundary ARN, and deny removing it."
    ], a: 3,
    no: [
      "A boundary on the developer limits the developer, not the roles they create. New roles get no boundary from their creator.",
      "SCPs need AWS Organizations, and this account is standalone.",
      "Access Analyzer validation reports findings on policies; it doesn't block role creation or cap permissions.",
      null],
    why: "A permissions boundary caps the maximum permissions of a role. Requiring iam:PermissionsBoundary on CreateRole (and denying DeleteRolePermissionsBoundary and changes to DevBoundary itself) lets developers create roles safely without risk of escalation.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html"] },

  { id: "dva-2-908", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "A role's identity-based policy allows s3:* and dynamodb:* on all resources. Its permissions boundary allows s3:GetObject and sqs:* on all resources. No other policies apply. What can a session of this role do?",
    opts: [
      "Only s3:GetObject, because effective permissions are the overlap of the identity policy and the permissions boundary.",
      "All S3, DynamoDB and SQS actions, because the role is allowed anything that either one of the two policies allows.",
      "s3:GetObject and all SQS actions, because the permissions boundary replaces the identity policy whenever one is set.",
      "Nothing at all, because a permissions boundary blocks every action that the identity-based policy grants on its own."
    ], a: 0,
    no: [null,
      "Boundaries never add permissions. Only actions that both policies allow are effective.",
      "sqs:* isn't in the identity policy, and a boundary can't grant anything by itself.",
      "Actions allowed by both policies still work. Here that is s3:GetObject."],
    why: "A permissions boundary sets the maximum. For an identity-based request, an action must be allowed by both the identity-based policy and the boundary (and not explicitly denied), so the effective set is their intersection.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html"] },

  { id: "dva-2-909", exam: "DVA", dva: "2.1", topic: "iam", type: "multi", hint: "Select TWO.",
    q: "A team lead is writing guidance on IAM permissions boundaries. Which statements are true? (Select TWO.)",
    items: [
      { t: "A permissions boundary never grants any permissions on its own.", ok: true },
      { t: "Boundaries can be set on IAM users and roles, but not on IAM groups.", ok: true },
      { t: "An Allow in a boundary overrides an explicit Deny in an identity policy.", ok: false, no: "An explicit Deny in any applicable policy always wins." },
      { t: "Removing a role's boundary also detaches its identity-based policies.", ok: false, no: "The identity policies stay attached; removing the boundary only lifts the cap." },
      { t: "A boundary is attached to resources such as buckets to cap their access.", ok: false, no: "Boundaries apply to IAM users and roles. Buckets use bucket policies." }
    ],
    why: "A boundary is a managed policy set on a user or role that limits the most its identity policies can grant. It grants nothing, can't override a Deny, and isn't available for groups or resources.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html"] },

  // ---------------------------------------------------------------- Domain 3: Deployment

  // SAM AutoPublishAlias + DeploymentPreference
  { id: "dva-3-901", exam: "DVA", dva: "3.4", topic: "sam", type: "mc",
    q: "A team deploys a Lambda function with AWS SAM. New versions must get 10% of traffic for 5 minutes, then all of it, and must roll back automatically if an error alarm fires during the shift. What should the developer add to the AWS::Serverless::Function resource?",
    opts: [
      "AutoPublishAlias: live with a DeploymentPreference of Type Linear10PercentEvery1Minute and the error alarm under Alarms.",
      "AutoPublishAlias: live with a DeploymentPreference of Type Canary10Percent5Minutes and the error alarm listed under Alarms.",
      "AutoPublishAlias: live with a DeploymentPreference of Type AllAtOnce and the error alarm listed under the Alarms property.",
      "A canary setting of 10 percent on the API Gateway stage, with a CloudWatch alarm whose action publishes a rollback request."
    ], a: 1,
    no: [
      "Linear10PercentEvery1Minute moves 10% more every minute for 10 minutes; it isn't 10% for 5 minutes and then the rest.",
      null,
      "AllAtOnce shifts all traffic at once, so there is no 10% stage in which an alarm could catch a problem.",
      "A stage canary splits API traffic, but nothing rolls the Lambda deployment back automatically when the alarm fires."],
    why: "AutoPublishAlias publishes a new version on each code change and points the alias at it; DeploymentPreference makes CodeDeploy shift the alias gradually. Canary10Percent5Minutes moves 10% first and the rest after 5 minutes, and an alarm in Alarms triggers rollback.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/automating-updates-to-serverless-apps.html"] },

  { id: "dva-3-902", exam: "DVA", dva: "3.4", topic: "sam", type: "mc",
    q: "A SAM template sets DeploymentPreference with a PreTraffic hook function. The hook runs its smoke tests and returns successfully, but each deployment sits at the BeforeAllowTraffic step and fails after about an hour. What is the hook function missing?",
    opts: [
      "A response object with statusCode 200 and a JSON body that reports Succeeded, which CodeDeploy reads to continue the deployment.",
      "A call to PutLifecycleEventHookExecutionStatus with the deployment ID, the hook execution ID from the event, and Succeeded.",
      "A message published to the deployment's SNS topic with the result, which CodeDeploy subscribes to while it waits on the hook.",
      "A custom CloudWatch metric named HookSucceeded with a value of 1, which CodeDeploy checks before it starts to shift traffic."
    ], a: 1,
    no: [
      "CodeDeploy doesn't read the hook's return value. It waits for an explicit status callback.",
      null,
      "CodeDeploy doesn't listen on SNS for hook results.",
      "CodeDeploy doesn't read custom metrics for hooks; alarms are a separate rollback trigger."],
    why: "A Lambda hook must call back CodeDeploy with PutLifecycleEventHookExecutionStatus, passing the DeploymentId and LifecycleEventHookExecutionId from its event and a status of Succeeded or Failed. Without that call, CodeDeploy fails the deployment after one hour.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html", "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/automating-updates-to-serverless-apps.html"] },

  { id: "dva-3-903", exam: "DVA", dva: "3.4", topic: "sam", type: "mc",
    q: "A function uses AutoPublishAlias: live and a Canary10Percent30Minutes deployment preference. A separate service calls the function by its plain name with the SDK. During the next deployment, that service hits the new code on every call right away, with no canary. Why?",
    opts: [
      "CodeDeploy shifts traffic only for callers that run in the same AWS Region as the CloudFormation stack that holds the function.",
      "A canary deployment applies only to callers that come through API Gateway, and SDK calls always reach the newest version.",
      "Calls without a qualifier invoke $LATEST, which already has the new code; CodeDeploy shifts only the live alias's weights.",
      "AutoPublishAlias publishes a new version only on the first deployment of the stack, so later deployments overwrite $LATEST."
    ], a: 2,
    no: [
      "Lambda versions and aliases are Regional, and the Region has nothing to do with this. The caller simply isn't using the alias.",
      "Any caller that invokes the alias, including SDK calls with the :live qualifier, gets the weighted split.",
      null,
      "AutoPublishAlias publishes a new version whenever the code changes, on every deployment."],
    why: "The gradual shift is done by changing the routing weights of the alias between the old and new versions. Callers must invoke the alias (for example function:live); an unqualified call runs $LATEST, which has the new code immediately.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/automating-updates-to-serverless-apps.html", "https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html"] },

  // CodePipeline stages, actions, approvals
  { id: "dva-3-904", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc",
    q: "A pipeline has Source, Build and Deploy-Prod stages. A release manager must review each change and sign off before it reaches production, and should get an email when a change is waiting. What should the developer add?",
    opts: [
      "A manual approval action at the end of the Build stage, configured with an SNS topic that the manager subscribes to by email.",
      "A disabled transition into Deploy-Prod, with an EventBridge rule that emails the manager whenever the Build stage succeeds.",
      "A CodeBuild test action at the end of Build that pauses and waits until a file named approved.txt is uploaded to the bucket.",
      "An approval setting on the CodeDeploy deployment group, so that deployments to the production instances wait for the manager."
    ], a: 0,
    no: [null,
      "This can pause the pipeline, but the manager's sign-off isn't recorded and anyone who can enable transitions can release.",
      "A build that idles until a file appears is fragile, costs build minutes, and times out; approvals are a built-in action.",
      "CodeDeploy deployment groups have no manager-approval setting."],
    why: "A manual approval action stops the pipeline until someone with codepipeline:PutApprovalResult approves or rejects it. It can publish to an SNS topic (email, SMS and more) and include a review URL and comments.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals.html"] },

  { id: "dva-3-905", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc",
    q: "A pipeline execution reached a manual approval action on a Friday. The approver was on leave and nobody acted on it. Eight days later, the team looks at the pipeline. What is the state of that execution?",
    opts: [
      "The approval is still waiting, because approval actions stay open until someone with permission approves or rejects them.",
      "The approval was approved automatically after 72 hours, and the change was deployed to the next stage of the pipeline.",
      "The execution was superseded and deleted, so no record of it remains in the pipeline's execution history to review.",
      "The approval failed after seven days with no response, so the stage failed and this execution didn't go any further."
    ], a: 3,
    no: [
      "Approvals don't wait forever. With no response in seven days the action fails.",
      "CodePipeline never approves automatically. A missing response counts as a failure.",
      "Failed executions stay in the history; the team can review them and retry the stage.",
      null],
    why: "If no one approves or rejects within seven days of the pipeline reaching the action, the result is the same as a failed action: the stage fails and the execution stops.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals.html"] },

  { id: "dva-3-906", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "multi", hint: "Select TWO.",
    q: "In one stage of a pipeline, a unit test action and a security scan action must run at the same time, and a deploy action must start only after both succeed. Which configuration choices achieve this? (Select TWO.)",
    items: [
      { t: "Give the unit test action and the scan action the same runOrder, such as 1.", ok: true },
      { t: "Give the deploy action a higher runOrder, such as 2, within the same stage.", ok: true },
      { t: "Give the test and scan actions runOrder 0, which marks actions as parallel.", ok: false, no: "runOrder must be a positive integer; zero isn't allowed. Equal values run in parallel." },
      { t: "Put the test, scan and deploy actions in three separate stages, one after another.", ok: false, no: "Stages run one after another, so the test and scan would no longer run at the same time." },
      { t: "Create two pipelines on the same source, one to test and one to scan.", ok: false, no: "Separate pipelines can't make a deploy wait for both results." }
    ],
    why: "Within a stage, actions with the same runOrder run in parallel, and actions with a higher runOrder start after the lower ones finish successfully. The default runOrder is 1, and it must be a positive integer.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/action-requirements.html"] },

  // CodeDeploy lifecycle hooks
  { id: "dva-3-907", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc",
    q: "A team uses CodeDeploy to shift traffic for a Lambda alias. They want a validation function to run integration tests against the new version before any production traffic moves to it. Which AppSpec hook should run the function?",
    opts: [
      "AfterInstall",
      "BeforeAllowTraffic",
      "ValidateService",
      "AfterAllowTestTraffic"
    ], a: 1,
    no: [
      "AfterInstall exists for EC2/on-premises and Amazon ECS deployments, not for Lambda.",
      null,
      "ValidateService is an EC2/on-premises hook that runs scripts on the instances.",
      "AfterAllowTestTraffic belongs to Amazon ECS blue/green deployments with a test listener."],
    why: "Lambda deployments have exactly two hooks: BeforeAllowTraffic, before traffic shifts to the new version, and AfterAllowTraffic, after all traffic has shifted. Each hook function reports back with PutLifecycleEventHookExecutionStatus.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html"] },

  { id: "dva-3-908", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc",
    q: "A developer is writing the hooks section of an AppSpec file for an Amazon ECS blue/green deployment. Which list contains exactly the lifecycle events that can run hook functions for ECS?",
    opts: [
      "ApplicationStop, BeforeInstall, AfterInstall, ApplicationStart, ValidateService",
      "BeforeInstall, AfterInstall, AfterAllowTestTraffic, BeforeAllowTraffic, AfterAllowTraffic",
      "BeforeAllowTraffic, AfterAllowTraffic",
      "BeforeInstall, Install, AfterAllowTestTraffic, AllowTraffic, AfterAllowTraffic"
    ], a: 1,
    no: [
      "These are EC2/on-premises hooks that run scripts on instances.",
      null,
      "These two alone are the Lambda deployment hooks.",
      "Install and AllowTraffic are steps CodeDeploy runs itself; they can't run hooks."],
    why: "ECS deployments offer five hooks: BeforeInstall, AfterInstall, AfterAllowTestTraffic, BeforeAllowTraffic and AfterAllowTraffic. Lambda has two (BeforeAllowTraffic, AfterAllowTraffic), and EC2/on-premises has the longer scriptable list.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html"] },

  { id: "dva-3-909", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "multi", hint: "Select THREE.",
    q: "An in-place CodeDeploy deployment to EC2 instances behind no load balancer needs scripts to stop the old app, back up files before new ones are copied, and check the app after it starts. Which lifecycle events in the AppSpec hooks section can run those scripts? (Select THREE.)",
    items: [
      { t: "ApplicationStop", ok: true },
      { t: "BeforeInstall", ok: true },
      { t: "ValidateService", ok: true },
      { t: "DownloadBundle", ok: false, no: "DownloadBundle is reserved for the CodeDeploy agent and can't run scripts." },
      { t: "Install", ok: false, no: "Install is reserved for the agent, which copies files as the AppSpec files section says." },
      { t: "AllowTraffic", ok: false, no: "AllowTraffic is reserved for CodeDeploy, and with no load balancer it doesn't run at all." }
    ],
    why: "On EC2/on-premises, ApplicationStop, BeforeInstall, AfterInstall, ApplicationStart and ValidateService run scripts (plus the traffic hooks when a load balancer is used). DownloadBundle, Install, BlockTraffic and AllowTraffic are reserved for CodeDeploy.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html"] },

  // CodeBuild buildspec
  { id: "dva-3-910", exam: "DVA", dva: "3.1", topic: "codebuild", type: "mc",
    q: "A CodeBuild project runs integration tests that need a database password stored in AWS Secrets Manager under prod/db with the JSON key password. The password must not appear in the buildspec, the repository or the project's plaintext settings. How should the buildspec get it?",
    opts: [
      "Under env, add an exported-variables entry of DB_PASSWORD, so that CodeBuild loads the secret into the build container.",
      "Under env, add a variables entry of DB_PASSWORD with the secret's ARN, and run the tests with the ARN as the password.",
      "Under env, add a secrets-manager entry that maps DB_PASSWORD to prod/db:password, and read it as an environment variable.",
      "Under phases, add an install command that runs git-credential-helper, so that the build can read the password from the repo."
    ], a: 2,
    no: [
      "exported-variables sends values out of the build to later pipeline actions; it doesn't load secrets in.",
      "A plain variable holds the literal ARN string, not the secret value.",
      null,
      "git-credential-helper passes Git credentials for source access; it has nothing to do with Secrets Manager."],
    why: "The buildspec env section has secrets-manager (secret-id:json-key:version-stage:version-id) and parameter-store mappings. CodeBuild fetches the values with the service role at run time and exposes them as environment variables.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html"] },

  { id: "dva-3-911", exam: "DVA", dva: "3.1", topic: "codebuild", type: "mc",
    q: "A buildspec for the standard Ubuntu image must select Node.js 20 before dependencies are installed, run the tests, and then zip the dist folder as the build output. Where does the runtime-versions setting belong?",
    opts: [
      "In the install phase, next to the commands that install the project's dependencies.",
      "In the pre_build phase, so that it runs just before the main build commands start.",
      "In the env section, as a variable that the build image reads before any phase runs.",
      "In the artifacts section, so that the zipped output is labeled with the runtime used."
    ], a: 0,
    no: [null,
      "runtime-versions is valid only in the install phase; pre_build is too late for it.",
      "The env section holds environment variables, not runtime selections.",
      "Artifacts list the output files; they don't pick a runtime."],
    why: "In buildspec version 0.2, runtime-versions goes under phases: install. The phases then run in order (install, pre_build, build, post_build), and the artifacts section names the output files.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html"] },

  { id: "dva-3-912", exam: "DVA", dva: "3.1", topic: "codebuild", type: "multi", hint: "Select THREE.",
    q: "A developer is reviewing a version 0.2 buildspec with the team. Which statements about buildspec files are true? (Select THREE.)",
    items: [
      { t: "artifacts files lists the output paths, relative to the source or base-directory.", ok: true },
      { t: "discard-paths: yes puts every artifact file at the top level of the output.", ok: true },
      { t: "cache paths can keep folders such as /root/.m2 between builds for reuse.", ok: true },
      { t: "Buildspec env values win over env values set when a build is started.", ok: false, no: "Values set in the start-build call win, then the project's settings; the buildspec's values come last." },
      { t: "The file must be named buildspec.yml at the repo root, and that name can't be changed.", ok: false, no: "A project can point to another file name or location, or hold the buildspec inline." },
      { t: "In version 0.1, every build command runs in one shared shell instance.", ok: false, no: "Version 0.1 runs each command in a separate shell; 0.2 runs them in the same one." }
    ],
    why: "The artifacts section picks output files (files, base-directory, discard-paths) and cache paths keep reusable folders. Environment values are overridden by the project and then by the start-build call, and only version 0.2 shares one shell across commands.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html"] },

  // CloudFormation change sets, drift detection, StackSets
  { id: "dva-3-913", exam: "DVA", dva: "3.4", topic: "cloudformation", type: "mc",
    q: "A developer changed the DBInstanceIdentifier property of an RDS instance in a production CloudFormation template. Before applying it, the team must know whether the update will replace the database. What should the developer do?",
    opts: [
      "Run validate-template on the new template and read its output to see which resources the update replaces.",
      "Run drift detection on the stack, which compares the new template with the stack's current resources.",
      "Create a change set for the stack and check the Replacement value for the database before executing it.",
      "Run update-stack with the --dry-run flag, which simulates the update without changing any resources."
    ], a: 2,
    no: [
      "validate-template checks syntax only; it doesn't compare the template with the running stack.",
      "Drift detection compares live resources with the template already deployed, not with a new one.",
      null,
      "CloudFormation update-stack has no dry-run option; change sets are its preview mechanism."],
    why: "A change set lists the actions CloudFormation will take for an update, including a Replacement value (True, False or Conditional) for each resource, and changes nothing until it is executed.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html"] },

  { id: "dva-3-914", exam: "DVA", dva: "3.4", topic: "cloudformation", type: "mc",
    q: "A Lambda function in a stack doesn't set Timeout, so it uses the default. An engineer raised its timeout in the console during an incident. Drift detection still reports the function as IN_SYNC. The team wants drift detection to catch this kind of change in future. What should they do?",
    opts: [
      "Run drift detection on every nested stack separately, because the console change was recorded in the function's nested stack.",
      "Set Timeout explicitly in the template, even to its default value, because drift detection checks only properties that are set.",
      "Turn on termination protection for the stack, so that changes made outside CloudFormation are blocked or reported as drift.",
      "Add a stack policy that denies Update:Modify on the function, so that drift detection begins to track all of its properties."
    ], a: 1,
    no: [
      "The function isn't in a nested stack here, and checking nested stacks doesn't change which properties are compared.",
      null,
      "Termination protection only stops the stack from being deleted.",
      "Stack policies guard against changes made by stack updates; they don't affect drift detection or console changes."],
    why: "CloudFormation compares only property values that are explicitly set in the template or parameters, not defaults. Setting Timeout explicitly, even to the default, makes later out-of-band changes show as MODIFIED.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html"] },

  { id: "dva-3-915", exam: "DVA", dva: "3.4", topic: "cloudformation", type: "multi", hint: "Select TWO.",
    q: "A platform team must deploy the same CloudFormation template (an audit IAM role) to every account in an AWS Organizations OU, in three Regions, including accounts added to the OU later. Which steps meet these requirements with the least ongoing effort? (Select TWO.)",
    items: [
      { t: "Create a StackSet with service-managed permissions that targets the OU and the three Regions.", ok: true },
      { t: "Turn on automatic deployment for the StackSet so new accounts in the OU get stack instances.", ok: true },
      { t: "Use self-managed permissions and create the execution role by hand in each new account.", ok: false, no: "This works for existing accounts, but automatic deployment to new accounts needs service-managed permissions." },
      { t: "Create one parent stack with a nested stack per account, passing each account ID as input.", ok: false, no: "Nested stacks deploy into the parent's account and Region; they can't target other accounts." },
      { t: "Export the role ARN from one stack and import it in each of the other accounts with Fn::ImportValue.", ok: false, no: "Exports are visible only within one account and Region, and importing doesn't create the role." }
    ],
    why: "StackSets deploy one template to many accounts and Regions. With service-managed permissions (through Organizations), a StackSet can target OUs and automatically deploy to accounts that join them later.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/what-is-cfnstacksets.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-manage-auto-deployment.html"] },

  // Elastic Beanstalk deployment policies
  { id: "dva-3-916", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc",
    q: "An Elastic Beanstalk web environment runs 8 instances behind a load balancer. Deployments must never reduce serving capacity, the team wants to keep extra instance cost low, and it is fine for old and new versions to serve traffic side by side for a while. Which deployment policy fits?",
    opts: [
      "Rolling, updating one batch of instances at a time",
      "Immutable, launching a full new set of instances",
      "Rolling with additional batch, adding one batch first",
      "All at once, updating every instance at the same time"
    ], a: 2,
    no: [
      "Rolling takes each batch out of service while it updates, which reduces capacity.",
      "Immutable keeps capacity but launches a full second set of 8 instances, which costs more than one extra batch.",
      null,
      "All at once takes every instance out of service at the same time, causing downtime."],
    why: "Rolling with additional batch launches one extra batch before taking any instances out of service, so capacity stays full while batches update; the extra batch is terminated at the end. Mixed versions serve during the rollout.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html"] },

  { id: "dva-3-917", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc",
    q: "A team wants Elastic Beanstalk to send 15% of client traffic to a new application version for 10 minutes, then move all traffic over if the new instances stay healthy, or move traffic back automatically if they don't. The environment uses an Application Load Balancer. Which deployment policy should they use?",
    opts: [
      "Immutable, with a health check threshold of Ok",
      "Rolling, with a fixed batch size of 15 percent",
      "Rolling with additional batch, at 15 percent",
      "Traffic splitting, with a 10-minute evaluation"
    ], a: 3,
    no: [
      "Immutable puts the new instances into service without a set traffic percentage or an evaluation period.",
      "A rolling batch updates instances in place, and the share of traffic isn't held at 15% for a set time.",
      "This keeps capacity but still updates batches in place, with no evaluation time or automatic traffic shift back.",
      null],
    why: "Traffic splitting launches a full new set of instances, sends the configured percentage of traffic to them for the evaluation time, then shifts everything over, or shifts back and terminates them if health checks fail. It needs an Application Load Balancer.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html"] },

  { id: "dva-3-918", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "multi", hint: "Select THREE.",
    q: "Which Elastic Beanstalk deployment policies keep the environment's full serving capacity for the whole deployment? (Select THREE.)",
    items: [
      { t: "Rolling with additional batch", ok: true },
      { t: "Immutable", ok: true },
      { t: "Traffic splitting", ok: true },
      { t: "All at once", ok: false, no: "Every instance is out of service at the same moment while it updates." },
      { t: "Rolling", ok: false, no: "Each batch is out of service while it updates, so capacity drops by one batch." },
      { t: "Rolling with a batch size of 100 percent", ok: false, no: "One batch holding every instance takes the whole environment out of service at once." }
    ],
    why: "Rolling with additional batch adds a batch first, and Immutable and Traffic splitting launch a full new set of instances alongside the old ones. All at once and Rolling take instances out of service during the update.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html"] },

  { id: "dva-3-919", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc",
    q: "A rolling deployment to an Elastic Beanstalk environment with 4 batches fails health checks in batch 3. What is the state of the environment, and how does the developer get back to the previous version?",
    opts: [
      "Elastic Beanstalk has rolled every batch back to the old version on its own, so the developer just fixes the code and deploys again.",
      "Every instance is running the new version, and the developer must restore the environment from its most recent saved configuration.",
      "Batches 1 and 2 run the new version while the rest run the old one; the developer deploys the last known good version again.",
      "The environment has been terminated and replaced, and the developer must create it again from the saved application version."
    ], a: 2,
    no: [
      "A failed rolling deployment doesn't roll back completed batches automatically.",
      "Batches after the failure never got the new version, and saved configurations hold settings, not code.",
      null,
      "A failed deployment doesn't terminate the environment."],
    why: "After a failed rolling deployment, completed batches keep the new version and pending batches keep the old one. To roll back, deploy a known good application version again; immutable deployments avoid this partial state.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html"] },

  // ---------------------------------------------------------------- Domain 4: Troubleshooting and Optimization

  // X-Ray annotations vs metadata
  { id: "dva-4-901", exam: "DVA", dva: "4.2", topic: "xray", type: "mc",
    q: "An instrumented checkout service records each request's customer tier (gold, silver or bronze). Support engineers need to find all traces for gold customers with a filter expression in the console. How should the developer record the tier on the segment?",
    opts: [
      "As metadata under a custom namespace, so that the tier value is stored with the full detail of each segment.",
      "As an annotation with the key tier, so that the value is indexed and can be used in a filter expression.",
      "As part of the segment name, such as checkout-gold, so that each tier shows up as its own service node.",
      "As an exception on a subsegment, so that the tier is recorded in the cause field of the segment document."
    ], a: 1,
    no: [
      "Metadata is stored but not indexed, so filter expressions can't search on it.",
      null,
      "That splits one service into fake nodes on the trace map and misuses the service name.",
      "Exceptions record errors. Logging data as a fake error would mark healthy requests as faults."],
    why: "Annotations are indexed key-value pairs (string, number or Boolean) for filter expressions and GetTraceSummaries, such as annotation.tier = \"gold\". Metadata holds any value type but isn't indexed.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html"] },

  { id: "dva-4-902", exam: "DVA", dva: "4.2", topic: "xray", type: "mc",
    q: "While debugging a pricing service, a developer wants each trace to carry the full pricing request, a nested JSON object with lists of line items. Nobody will search on it; engineers will only open it on individual traces. Where should it be recorded?",
    opts: [
      "As an annotation, which holds nested objects and lists and makes each field available as a separate filter.",
      "As metadata, which accepts values of any type, including objects and lists, and is stored without indexing.",
      "As the subsegment's http.request block, which stores whole request bodies as part of the segment document.",
      "As a new segment group in the console, which can store any JSON object for the traces that are in the group."
    ], a: 1,
    no: [
      "Annotation values must be strings, numbers or Booleans, and X-Ray indexes only up to 50 annotations per trace.",
      null,
      "The http block records request fields such as method, URL and status, not arbitrary bodies.",
      "Groups are saved filter expressions; they don't store data on traces."],
    why: "Use metadata for data you want stored on a trace but not searched: values can be any type, including objects and lists. Use annotations for the few simple values you need to filter on.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html"] },

  { id: "dva-4-903", exam: "DVA", dva: "4.2", topic: "xray", type: "multi", hint: "Select TWO.",
    q: "A developer is deciding what to record as X-Ray annotations and what to record as metadata. Which statements are true? (Select TWO.)",
    items: [
      { t: "X-Ray indexes up to 50 annotations per trace for use in filter expressions.", ok: true },
      { t: "Metadata values can be objects or lists, and they are stored but not indexed.", ok: true },
      { t: "Annotation values can be any JSON value, including nested objects and arrays.", ok: false, no: "Annotation values must be strings, numbers or Booleans." },
      { t: "Metadata keys can be searched with filter expressions such as metadata.k = 1.", ok: false, no: "Only annotations are indexed for filter expressions; metadata isn't searchable." },
      { t: "Annotations can be added to the root segment only, never to subsegments.", ok: false, no: "Both annotations and metadata can be added to any segment or subsegment." }
    ],
    why: "Annotations are simple, indexed key-value pairs (up to 50 indexed per trace) for searching and grouping. Metadata takes any value type and is only for viewing. Both can sit on segments or subsegments.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html"] },

  // X-Ray sampling rules
  { id: "dva-4-904", exam: "DVA", dva: "4.2", topic: "xray", type: "mc",
    q: "A service runs on 20 instances and reads sampling rules from the X-Ray service. For one afternoon, the team wants every PUT request to /checkout traced, with the default sampling for everything else, and without redeploying. What should the developer do?",
    opts: [
      "Add a local sampling rules JSON file with a rate of 1.0 for PUT /checkout to the app, and roll it out to all 20 instances.",
      "Create a sampling rule for HTTP method PUT and URL path /checkout*, a rate of 100%, and a priority number below the default.",
      "Change the default sampling rule's rate to 100%, so that every request on every path is traced for the rest of the afternoon.",
      "Create a sampling rule for PUT /checkout* with a rate of 100% and a priority of 10000, so that it is checked after the default."
    ], a: 1,
    no: [
      "Local rules need a redeploy, and each instance would sample on its own.",
      null,
      "That traces every request on every path, which costs far more than needed.",
      "Priority runs from 1 to 9999, and rules are checked in ascending order; the default rule always comes last."],
    why: "Rules defined in X-Ray apply without redeploying. Services evaluate rules in ascending priority order and use the first match, so a specific rule with a low priority number and a 100% rate catches only those requests.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-console-sampling.html"] },

  { id: "dva-4-905", exam: "DVA", dva: "4.2", topic: "xray", type: "mc",
    q: "Ten instances of a service each load the same local sampling rules file, which keeps the defaults of a 1-request-per-second reservoir and a 5% rate. The team expected about one trace per second at low traffic, but sees about ten. Why?",
    opts: [
      "With local rules, each instance applies its own reservoir, so the reservoirs of all ten instances add up together.",
      "The 5% fixed rate is applied before the reservoir, so every instance records far more requests than was planned.",
      "Local rules files ignore the reservoir setting entirely and trace the first ten requests in each second instead.",
      "X-Ray doubles the reservoir for each instance that joins, to make sure that small services are always traced."
    ], a: 0,
    no: [null,
      "The reservoir comes first; the rate applies only to requests beyond it.",
      "Local rules do use the reservoir; they just can't share it between instances.",
      "X-Ray has no such scaling. With rules in the service, it divides one reservoir into quotas."],
    why: "With local rules, each instance samples on its own, so the total reservoir grows with the number of instances. Rules defined in the X-Ray service share one reservoir, which X-Ray divides into quotas across instances.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-console-sampling.html"] },

  { id: "dva-4-906", exam: "DVA", dva: "4.2", topic: "xray", type: "mc",
    q: "Service A receives requests from users and calls Service B. The team created a sampling rule that traces 100% of requests to Service B, but almost no Service B traces appear, matching Service A's 5% default. What should they do to trace more of this workflow?",
    opts: [
      "Give the Service B rule a lower priority number, so that it takes effect before the decision that Service A has made.",
      "Remove the X-Amzn-Trace-Id header in Service B, so that Service B makes a new sampling decision for each request.",
      "Raise the reservoir of the Service B rule to 100 requests per second, so that more of the calls into B get traced.",
      "Apply the higher-rate sampling rule to Service A, the root service that makes the sampling decision for the trace."
    ], a: 3,
    no: [
      "Priority only orders rules within one service. B still follows the decision passed in from A.",
      "Dropping the header breaks the trace in two, so B's spans no longer join A's trace.",
      "A larger reservoir doesn't help, because B doesn't apply its own rules to requests A already decided on.",
      null],
    why: "X-Ray sampling is parent-based: the first instrumented service (the root) decides, and downstream services honor the decision in the trace header. Rules for a downstream service take effect only where no decision has been made yet.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-console-sampling.html"] },

  // CloudWatch composite alarms
  { id: "dva-4-907", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc",
    q: "An API has two CloudWatch alarms, High5xx and HighLatency, which other teams also use on their dashboards. On-call engineers should be paged only when both are in ALARM at the same time, and the existing alarms must not change. What should the developer create?",
    opts: [
      "An EventBridge rule that matches alarm state changes from both alarms and pages on-call when it sees events from each of them.",
      "A composite alarm with the rule ALARM(High5xx) AND ALARM(HighLatency) and an SNS action that pages the on-call engineers.",
      "An SNS subscription filter policy on the alarms' topic that delivers a message only when both alarms have published to it.",
      "A metric math alarm that adds the 5xx count to the latency average and alarms when the sum crosses the larger threshold."
    ], a: 1,
    no: [
      "A rule matches each event on its own; it can't tell that both alarms are in ALARM at the same moment.",
      null,
      "Filter policies check attributes of each message separately; they can't wait for two messages.",
      "Adding unrelated metrics gives a meaningless number and drops the two existing thresholds."],
    why: "A composite alarm watches the states of other alarms and combines them with AND, OR, NOT and AT_LEAST. Its actions run only when the rule is true, which cuts alarm noise without changing the underlying alarms.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html"] },

  { id: "dva-4-908", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc",
    q: "During deployments, an alarm named DeploymentInProgress is in ALARM, and the error rate briefly spikes, which pages on-call needlessly. The team wants a page when the HighErrors alarm fires, except while a deployment is running. Which composite alarm rule should they use?",
    opts: [
      "ALARM(HighErrors) OR NOT ALARM(DeploymentInProgress)",
      "ALARM(HighErrors) AND ALARM(DeploymentInProgress)",
      "ALARM(HighErrors) AND NOT ALARM(DeploymentInProgress)",
      "NOT ALARM(HighErrors) AND ALARM(DeploymentInProgress)"
    ], a: 2,
    no: [
      "With OR, the composite fires whenever no deployment is running, even with no errors.",
      "This pages only during deployments, the opposite of what is wanted.",
      null,
      "This fires during deployments when there are no errors, which is meaningless."],
    why: "ALARM(HighErrors) AND NOT ALARM(DeploymentInProgress) is true only when errors are high and no deployment is running, a pattern AWS documents for cutting noise during deployment windows.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html"] },

  { id: "dva-4-909", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc",
    q: "A developer builds a composite alarm from several health alarms for a fleet. When it goes into ALARM, one of the actions the team wants is not something a composite alarm can do. Which action must be set on a metric alarm instead?",
    opts: [
      "Publish a notification to an Amazon SNS topic",
      "Invoke a Lambda function to run a fix-up task",
      "Run an EC2 Auto Scaling policy to add capacity",
      "Create an OpsItem in Systems Manager OpsCenter"
    ], a: 2,
    no: [
      "Composite alarms can notify SNS topics.",
      "Composite alarms can invoke Lambda functions.",
      null,
      "Composite alarms can create OpsItems in OpsCenter."],
    why: "Composite alarms can only notify SNS topics, invoke Lambda functions, create OpsItems and create Incident Manager incidents. EC2 actions and Auto Scaling actions need a metric alarm.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarm-combining.html"] },

  // Lambda SnapStart
  { id: "dva-4-910", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc",
    q: "A Java 21 Lambda function behind an API takes about 6 seconds to start because its framework loads many classes during init. Traffic is spiky, with long idle periods, and the team doesn't want to pay for execution environments that sit ready while idle. What should the developer do?",
    opts: [
      "Configure provisioned concurrency on an alias, so that initialized environments are always waiting for the next spike.",
      "Turn on SnapStart for published versions, and point the API's integration at an alias that refers to a published version.",
      "Set reserved concurrency on the function, so that Lambda keeps the reserved environments initialized between requests.",
      "Raise the function's memory to the maximum, so that the 6-second init runs on more CPU and finishes in under a second."
    ], a: 1,
    no: [
      "Provisioned concurrency is billed while environments sit ready, which the team wants to avoid.",
      null,
      "Reserved concurrency guarantees and caps concurrency; it doesn't keep environments warm.",
      "More memory gives more CPU and may help some, but it won't turn seconds of class loading into a sub-second start."],
    why: "SnapStart initializes the function when a version is published and caches a snapshot, then resumes new environments from it. It needs published versions or aliases (not $LATEST), and for Java managed runtimes it adds no extra charge.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html"] },

  { id: "dva-4-911", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc",
    q: "After SnapStart is turned on for a Python 3.12 function, logs show different execution environments generating the same 'random' session tokens. The function seeds its random generator and creates a token prefix in global scope during init. What should the developer do?",
    opts: [
      "Move the unique values out of init: generate them in the handler or in an after-restore runtime hook for each environment.",
      "Raise the function's memory setting, so that Lambda creates a fresh snapshot for each environment as it scales out under load.",
      "Publish a new version each time the function scales out, so that every environment starts from a separate, new snapshot.",
      "Add reserved concurrency of 1, so that only one environment ever exists and the duplicated values can no longer appear."
    ], a: 0,
    no: [null,
      "Memory has no effect on snapshots; all environments of a version resume from the same one.",
      "Publishing versions on every scale-out is impractical, and each version still shares one snapshot across its environments.",
      "That hides the problem by throttling the function to one request at a time."],
    why: "With SnapStart, every environment resumes from one snapshot, so anything unique created during init (IDs, secrets, random seeds) is copied. Generate unique content after initialization, in the handler or a runtime hook that runs after restore.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/snapstart-uniqueness.html", "https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html"] },

  { id: "dva-4-912", exam: "DVA", dva: "4.3", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A developer tries to turn on SnapStart for a Java 21 function's published version. Which existing settings must be removed first, because SnapStart doesn't support them? (Select TWO.)",
    items: [
      { t: "Provisioned concurrency that is configured on the same version", ok: true },
      { t: "An Amazon EFS file system mounted to the function", ok: true },
      { t: "Ephemeral storage left at its default of 512 MB", ok: false, no: "Only ephemeral storage above 512 MB is unsupported; the default is fine." },
      { t: "An alias named live that points to a published version", ok: false, no: "SnapStart works on published versions and on aliases that point to them." },
      { t: "Active tracing that sends trace data to X-Ray", ok: false, no: "Tracing isn't in SnapStart's list of unsupported features." }
    ],
    why: "SnapStart doesn't support provisioned concurrency, Amazon EFS, Amazon S3 Files, or ephemeral storage greater than 512 MB, and it works only on published versions and aliases that point to them.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html"] },

  // sts decode-authorization-message
  { id: "dva-4-913", exam: "DVA", dva: "4.1", topic: "sts", type: "mc",
    q: "A deployment script calls RunInstances and gets UnauthorizedOperation with a long 'Encoded authorization failure message'. The developer needs to see which action, resource and condition values caused the denial. What should the developer do?",
    opts: [
      "Base64-decode the message locally with a standard tool, because the message is the JSON policy evaluation encoded as text.",
      "Paste the encoded message into the IAM policy simulator, which turns it into the list of policies that denied the request.",
      "Run aws sts decode-authorization-message with the encoded message, as a principal allowed sts:DecodeAuthorizationMessage.",
      "Look up the request in CloudTrail Lake by its request ID, which stores the decoded version of every encoded failure message."
    ], a: 2,
    no: [
      "The message is encoded because it can hold privileged details; it can't be read with a plain decode.",
      "The policy simulator tests policies you give it; it doesn't decode authorization messages.",
      null,
      "CloudTrail records the error code, but it doesn't store a decoded copy of the message."],
    why: "Some AWS operations return an encoded authorization message. STS DecodeAuthorizationMessage turns it into JSON showing whether an explicit deny or a missing allow caused it, plus the principal, action, resource and condition key values.",
    doc: ["https://docs.aws.amazon.com/STS/latest/APIReference/API_DecodeAuthorizationMessage.html"] },

  { id: "dva-4-914", exam: "DVA", dva: "4.1", topic: "sts", type: "mc",
    q: "A developer runs aws sts decode-authorization-message on an encoded failure from an EC2 call, and the command itself fails with AccessDenied. The developer's role can call EC2 and KMS freely. What permission does the role need?",
    opts: [
      "kms:Decrypt on the AWS managed key that encrypts the authorization messages",
      "sts:DecodeAuthorizationMessage, granted in an identity-based IAM policy",
      "iam:SimulatePrincipalPolicy on the role that made the original request",
      "ec2:DescribeInstances on the instance that was named in the failed call"
    ], a: 1,
    no: [
      "Decoding doesn't use a customer-visible KMS key; the only permission checked is the STS action.",
      null,
      "That permission is for the policy simulator, not for decoding messages.",
      "EC2 read permissions don't let anyone decode authorization messages."],
    why: "The message is encoded because it can reveal privileged information, so decoding requires the sts:DecodeAuthorizationMessage action to be allowed by an IAM policy.",
    doc: ["https://docs.aws.amazon.com/STS/latest/APIReference/API_DecodeAuthorizationMessage.html"] },

  { id: "dva-4-915", exam: "DVA", dva: "4.1", topic: "sts", type: "mc",
    q: "A launch call that attaches an instance profile fails with UnauthorizedOperation. The developer decodes the message and sees allowed false, explicitDeny false, action iam:PassRole, and the resource set to the ARN of the instance profile's role. What should be changed?",
    opts: [
      "Add an explicit Allow for ec2:RunInstances on all resources to the caller's identity policy.",
      "Add sts:AssumeRole for the role to the caller's policy, so the caller can act as that role.",
      "Remove the explicit Deny on iam:PassRole that is in the account's service control policy.",
      "Add an Allow for iam:PassRole on that role's ARN to the identity policy of the caller."
    ], a: 3,
    no: [
      "The denied action is iam:PassRole, not ec2:RunInstances, so more EC2 permissions won't help.",
      "Passing a role to EC2 needs iam:PassRole; the caller doesn't assume the role itself.",
      "explicitDeny is false, so the request failed for lack of an Allow, not because of a Deny.",
      null],
    why: "explicitDeny false means no policy allowed the action. Attaching a role to an instance needs iam:PassRole on that role, so the fix is an Allow for iam:PassRole on the role's ARN.",
    doc: ["https://docs.aws.amazon.com/STS/latest/APIReference/API_DecodeAuthorizationMessage.html", "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_passrole.html"] },

  // Provisioned vs reserved concurrency
  { id: "dva-4-916", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc",
    q: "A payment function must always be able to run 100 copies at once, even when other functions in the account spike and use up the shared concurrency. Occasional cold starts are acceptable, and the team wants the lowest cost. What should the developer configure?",
    opts: [
      "Provisioned concurrency of 100 on the function's live alias",
      "Reserved concurrency of 100 on the payment function itself",
      "A request to AWS Support to raise the account concurrency quota",
      "An SQS queue in front of the function with a batch size of 100"
    ], a: 1,
    no: [
      "Provisioned concurrency is billed while it sits ready, and the team accepts cold starts.",
      null,
      "A larger shared pool can still be drained by the other functions.",
      "A queue changes the invocation model and batch size doesn't guarantee concurrency."],
    why: "Reserved concurrency sets aside that much of the account's concurrency for one function, so no other function can use it, and it costs nothing extra. It also caps the function at that number.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html", "https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html"] },

  { id: "dva-4-917", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc",
    q: "A Lambda function writes to a legacy database that fails when more than 20 connections are open. Each function instance opens one connection. During spikes, the function scales past 20 and the database falls over. What should the developer configure?",
    opts: [
      "Provisioned concurrency of 20, so that only 20 environments are created for the function during a traffic spike.",
      "A function timeout of 20 seconds, so that each instance closes its connection sooner and frees it for the next request.",
      "Reserved concurrency of 20, so that the function can never run more than 20 instances, and so 20 connections, at once.",
      "Memory of 128 MB, so that each instance is too small to keep its database connection open while it waits for requests."
    ], a: 2,
    no: [
      "Provisioned concurrency is a floor of ready environments, not a ceiling; the function still scales past 20 on demand.",
      "A shorter timeout doesn't limit how many instances run at the same time.",
      null,
      "Memory size doesn't limit concurrency or connections."],
    why: "Reserved concurrency is both a guarantee and a maximum: the function never runs more than that many instances at once, which protects downstream resources such as database connections. Extra requests are throttled.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html"] },

  { id: "dva-4-918", exam: "DVA", dva: "4.3", topic: "lambda", type: "multi", hint: "Select THREE.",
    q: "A developer compares reserved concurrency and provisioned concurrency for a set of Lambda functions. Which statements are true? (Select THREE.)",
    items: [
      { t: "Configuring reserved concurrency for a function adds no extra charge.", ok: true },
      { t: "Provisioned concurrency is set on a version or alias, never on $LATEST.", ok: true },
      { t: "Setting a function's reserved concurrency to 0 throttles every request.", ok: true },
      { t: "Provisioned concurrency also caps the function's total concurrency.", ok: false, no: "Above the provisioned amount, the function scales on standard on-demand concurrency." },
      { t: "Reserved concurrency keeps environments initialized to avoid cold starts.", ok: false, no: "Reserved concurrency sets aside capacity; it doesn't pre-initialize anything." },
      { t: "Provisioned concurrency can be set higher than the reserved concurrency.", ok: false, no: "When both are set, provisioned concurrency can't exceed reserved concurrency." }
    ],
    why: "Reserved concurrency is free and works as both a floor and a ceiling (0 stops all invocations). Provisioned concurrency pre-initializes environments on a version or alias, is billed, can't exceed reserved concurrency, and doesn't cap scaling.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html", "https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html"] },

  // API Gateway cache keys and Lambda throttling
  { id: "dva-4-919", exam: "DVA", dva: "4.3", topic: "apigateway", type: "mc",
    q: "A REST API stage has caching turned on for GET /products, which takes a category query string. Users who ask for ?category=shoes sometimes get the list of hats that someone else asked for a moment earlier. What should the developer do?",
    opts: [
      "Lower the stage's cache TTL from 300 seconds to 30 seconds, so that each cached list is replaced sooner by the next request.",
      "Turn on cache encryption for the stage, so that each user's cached responses are kept apart from everyone else's responses.",
      "Add the category query string parameter to the method's cache keys, so that responses are cached for each category value.",
      "Flush the stage's cache after each deployment, so that responses built before the latest change are no longer returned."
    ], a: 2,
    no: [
      "A shorter TTL still serves the wrong category until it expires.",
      "Encryption protects cached data at rest; it doesn't change the cache key.",
      null,
      "Flushing clears the cache once, and the same collisions return as soon as it refills."],
    why: "API Gateway caches responses per cache key. Adding a method or integration parameter, such as a query string, to the cache keys makes it cache each value separately. Caching is a REST API feature.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html"] },

  { id: "dva-4-920", exam: "DVA", dva: "4.3", topic: "apigateway", type: "mc",
    q: "A team built a read-heavy catalog service on an API Gateway HTTP API in front of Lambda. They want API Gateway itself to cache responses for 5 minutes to reduce Lambda invocations, using built-in stage settings. What should the developer do?",
    opts: [
      "Set a cache TTL of 300 seconds in the HTTP API's route settings, then redeploy the stage so the setting takes effect.",
      "Turn on detailed CloudWatch metrics for the HTTP API stage, which also turns on response caching at the stage level.",
      "Build the API as a REST API instead, then provision a stage cache with a TTL of 300 seconds for the GET methods.",
      "Add a Lambda authorizer with a 300-second TTL to the routes, so that API Gateway caches the full backend response."
    ], a: 2,
    no: [
      "HTTP APIs have no response caching settings.",
      "Detailed metrics add per-route metrics; they don't cache anything.",
      null,
      "An authorizer TTL caches the authorizer's policy, not the backend's responses."],
    why: "API Gateway response caching (stage cache, TTL 300 seconds by default and up to 3600, GET methods by default) is available for REST APIs only, not HTTP APIs.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html"] },

  { id: "dva-4-921", exam: "DVA", dva: "4.3", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "During a sales spike, a backend calls a Lambda function synchronously with the SDK (RequestResponse) and some calls fail with TooManyRequestsException (HTTP 429). Which statements are true? (Select TWO.)",
    items: [
      { t: "The function hit its concurrency limit, either reserved or the account's unreserved pool.", ok: true },
      { t: "Lambda doesn't retry a throttled synchronous call; the caller must retry with backoff.", ok: true },
      { t: "Lambda queues throttled synchronous calls and retries them for up to 6 hours.", ok: false, no: "That retry queue is for asynchronous invocations. A synchronous caller just gets the 429." },
      { t: "A 429 means the request payload went over the 6 MB limit for a synchronous invocation.", ok: false, no: "An oversized payload is rejected with a different error (413, request too large)." },
      { t: "A 429 means the function's code ran past its configured timeout before it could respond.", ok: false, no: "A timeout is a function error reported in the response, not a throttle." }
    ],
    why: "TooManyRequestsException means no concurrency was available. For synchronous invocation, the error goes back to the caller, whose SDK may retry; raise reserved concurrency or the account quota, or smooth the load. Asynchronous events are instead retried by Lambda for up to 6 hours.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html", "https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html"] },

  { id: "dva-4-922", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc",
    q: "A Lambda function URL fronts a small API, and the function has reserved concurrency of 50. In a load test, clients start getting HTTP 429 once traffic climbs. The team wants to understand the limit before deciding whether to raise it. At what point does the function URL start returning 429?",
    opts: [
      "When more than 50 requests are in flight, or the rate goes over 500 requests per second, ten times the reserved concurrency.",
      "When the account's total concurrency quota across all functions is reached, regardless of the function's reserved setting.",
      "When requests go over 50 per second, because reserved concurrency sets the number of requests per second, not in flight.",
      "Only after the function's own timeout has passed for queued requests, which makes the URL hold them and then return 429."
    ], a: 0,
    no: [null,
      "Reserved concurrency is this function's own limit, so it throttles at 50 even when the account has room.",
      "Concurrency counts requests in flight at once, not requests per second.",
      "Function URLs don't queue requests until a timeout; throttled requests get 429 straight away."],
    why: "A function URL's throttling comes from reserved concurrency: it returns 429 when concurrency goes over the reserved value, and also when the request rate goes over 10 times that value per second.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html"] }
);
