// Question bank batch: DVA task 4.3 (optimize applications): Lambda concurrency, SnapStart, memory sizing, init code,
// SQS and Kinesis event sources, DynamoDB performance, API Gateway and CloudFront caching, ElastiCache, SNS filtering,
// S3 performance, usage plans, profiling and log analysis. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  { id: "dva-4-201", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc",
    q: "A Node.js Lambda function behind an API has almost no traffic at night, but every weekday at 08:00 requests jump sharply and the first users see cold-start delays of several seconds. Latency at the start of business hours must be low. Which solution is MOST cost-effective?",
    opts: [
      "Put provisioned concurrency on an alias, with Application Auto Scaling scheduled actions that raise it before 08:00 and lower it at night.",
      "Configure a fixed amount of provisioned concurrency on an alias, sized for the morning peak and kept in place around the clock, every day of the week.",
      "Turn on Lambda SnapStart for the function's published versions, and point the API at an alias for the latest version.",
      "Set reserved concurrency on the function equal to the morning peak, so the environments it needs are set aside ahead of time."
    ], a: 0,
    no: [null,
      "It removes the cold starts, but it pays for peak-sized capacity all night when there is almost no traffic.",
      "SnapStart supports Java, Python and .NET runtimes, not Node.js.",
      "Reserved concurrency only sets aside part of the account's concurrency. It doesn't initialize any environments ahead of time."],
    why: "Provisioned concurrency keeps environments initialized, and Application Auto Scaling can change it on a schedule for predictable traffic, so the company pays for it only around the peak.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html"] },

  { id: "dva-4-202", exam: "DVA", dva: "4.3", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Java 21 Lambda function built with a large framework takes about 6 seconds to initialize, and API Gateway calls it through $LATEST. The team wants sub-second startup in most cases without paying for environments that sit idle. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Turn on SnapStart for published versions of the function, then publish a new version of it.", ok: true },
      { t: "Point the API Gateway integration at an alias for that published version instead of at $LATEST.", ok: true },
      { t: "Turn on SnapStart and add provisioned concurrency to the same version to remove any remaining delay.", ok: false, no: "SnapStart doesn't support provisioned concurrency, and provisioned concurrency is the idle cost the team wants to avoid." },
      { t: "Raise the function's ephemeral storage to 2 GB, so the snapshot of the initialized environment fits.", ok: false, no: "SnapStart doesn't support ephemeral storage above 512 MB, and the snapshot doesn't live in /tmp." },
      { t: "Keep invoking $LATEST, since SnapStart takes a new snapshot each time the function's code is saved.", ok: false, no: "SnapStart can't be used on the unpublished $LATEST version. Snapshots are taken when a version is published." }
    ],
    why: "With SnapStart, Lambda initializes the function when a version is published and resumes new environments from a cached snapshot. Only published versions, and aliases that point to them, use it, and for Java there is no extra SnapStart charge.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html", "https://docs.aws.amazon.com/lambda/latest/dg/snapstart-activate.html"] },

  { id: "dva-4-203", exam: "DVA", dva: "4.3", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Region's Lambda concurrency quota is 1,000. A nightly batch function scales up quickly and uses most of it, and during that time the checkout function is throttled with 429 errors. Checkout must always have 200 executions available, and the fix must add no extra charges. Which actions should the developer take? (Select TWO.)",
    items: [
      { t: "Set reserved concurrency of 200 on the checkout function, so no other function can use that capacity.", ok: true },
      { t: "Set reserved concurrency on the batch function, so it can't scale past a fixed share of the quota.", ok: true },
      { t: "Set provisioned concurrency of 200 on an alias of the checkout function, and route traffic to it.", ok: false, no: "Provisioned concurrency is billed for as long as it is configured, which breaks the no-extra-charges rule." },
      { t: "Raise the checkout function's timeout, so throttled requests wait longer for capacity to free up.", ok: false, no: "Throttled requests are rejected before the function runs, so the timeout has no effect on them." },
      { t: "Set the batch function's asynchronous retry attempts to 0, so it makes fewer calls during the night.", ok: false, no: "Retries only happen after errors. The batch function's normal load still fills the account's concurrency." }
    ],
    why: "Reserved concurrency is free. On checkout it guarantees capacity that no other function can take; on the batch function it caps how far that function scales, which protects every other function too.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html", "https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html"] },

  { id: "dva-4-204", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc",
    q: "A Lambda function averages 300 ms per request. A launch is expected to bring 5,000 requests per second, and the account's Regional concurrency quota is 1,000 with no other functions running. What should the developer do before the launch to avoid throttling?",
    opts: [
      "Request a higher Lambda concurrent executions quota in Service Quotas, since the peak needs about 1,500 concurrent executions.",
      "Set reserved concurrency of 1,500 on the function, so that Lambda allows it to scale past the account's concurrency quota.",
      "Configure 1,500 units of provisioned concurrency on an alias, since provisioned capacity is not counted against the account quota.",
      "Raise the function's timeout to 1 second, so that each environment has enough time to work through more of the requests."
    ], a: 0,
    no: [null,
      "Reserved concurrency comes out of the account quota, and at most the unreserved amount minus 100 can be reserved.",
      "Provisioned concurrency also counts against the account's concurrency quota.",
      "The timeout caps how long a run may take. It doesn't let one environment handle requests in parallel."],
    why: "Concurrency is requests per second times average duration: 5,000 x 0.3 s = 1,500. That is above the 1,000 quota, so the quota must be raised first.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html"] },

  { id: "dva-4-205", exam: "DVA", dva: "4.3", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Lambda function configured with 1,024 MB of memory has run in production for two months, with thousands of invocations a day. The team wants to choose its memory setting from measured data rather than guesses, balancing cost and speed. Which approaches meet this goal? (Select TWO.)",
    items: [
      { t: "Opt in to AWS Compute Optimizer and review its memory recommendation for the function.", ok: true },
      { t: "Run the open-source AWS Lambda Power Tuning tool to invoke the function at several memory settings.", ok: true },
      { t: "Open the AWS X-Ray service map for the function and read the recommended memory size from it.", ok: false, no: "X-Ray shows latency and errors across services. It doesn't measure memory or recommend a size." },
      { t: "Search AWS CloudTrail for the function's Invoke events to see how much memory each run used.", ok: false, no: "CloudTrail records API calls such as configuration changes, not the resources a run used." },
      { t: "Turn on Amazon Inspector scanning for the function and apply the memory size finding it reports.", ok: false, no: "Inspector scans functions for software vulnerabilities. It doesn't size Lambda memory." }
    ],
    why: "Compute Optimizer recommends Lambda memory sizes from the last 14 days of metrics. Power Tuning runs the function at different memory settings through Step Functions and compares cost and duration.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html", "https://docs.aws.amazon.com/compute-optimizer/latest/ug/view-lambda-recommendations.html"] },

  { id: "dva-4-206", exam: "DVA", dva: "4.3", topic: "codeguru", type: "mc",
    q: "A Java service on Amazon ECS runs at high CPU, and the team suspects a few inefficient methods are to blame. They need to see which methods use the most CPU time under real production traffic, with low overhead, and get suggestions for fixes. What should the developer do?",
    opts: [
      "Add the Amazon CodeGuru Profiler agent to the service and review the flame graphs and recommendations it produces.",
      "Turn on Amazon Q Developer code reviews for the repository, so it flags inefficient code in each pull request.",
      "Turn on AWS X-Ray tracing in the service, and read the time spent by each method in the trace timeline.",
      "Turn on CloudWatch Container Insights for the cluster, and compare CPU utilization across the service's tasks."
    ], a: 0,
    no: [null,
      "Code review analyzes source code statically. It doesn't measure what uses CPU under production traffic.",
      "X-Ray traces requests across services and calls you instrument. It doesn't sample the CPU time of every method.",
      "Container Insights shows CPU per task or container, not which code is using it."],
    why: "CodeGuru Profiler samples a running application, shows where CPU time goes as flame graphs, and recommends ways to reduce it.",
    doc: ["https://docs.aws.amazon.com/codeguru/latest/profiler-ug/what-is-codeguru-profiler.html"] },

  { id: "dva-4-207", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc",
    q: "One Lambda function processes two SQS queues: a small orders queue and a bulk-import queue. When a large import arrives, the import queue's event source takes nearly all of the function's concurrency, and orders wait for minutes. Orders must keep flowing during imports. What should the developer do?",
    opts: [
      "Set maximum concurrency on the import queue's event source mapping, so it can use only part of the function's concurrency.",
      "Set reserved concurrency on the function, so that the import queue can never push the function past a fixed concurrency limit.",
      "Lower the batch size on the import queue's event source mapping, so that each invocation finishes more quickly.",
      "Raise the visibility timeout on the import queue, so its messages are handed to the function less often."
    ], a: 0,
    no: [null,
      "Reserved concurrency limits the whole function, so imports can still fill all of it and orders still wait.",
      "Smaller batches mean more invocations, and the import queue can still take every environment.",
      "Visibility timeout controls when a message can be received again. It doesn't limit how many the function processes at once."],
    why: "Maximum concurrency is a setting on each SQS event source mapping. It caps how many concurrent invocations that queue can drive, leaving the rest for the other queue.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html"] },

  { id: "dva-4-208", exam: "DVA", dva: "4.3", topic: "sqs", type: "multi", hint: "Select TWO.",
    q: "A producer sends each event to an SQS standard queue with its own SendMessage call, and consumers on EC2 call ReceiveMessage in a tight loop with no wait time, so most calls return nothing. The SQS bill has grown, and a delay of a few seconds is fine. Which changes will reduce the cost? (Select TWO.)",
    items: [
      { t: "Set the receive wait time to 20 seconds, so consumers use long polling and make fewer empty calls.", ok: true },
      { t: "Send and delete messages with SendMessageBatch and DeleteMessageBatch, up to 10 messages per call.", ok: true },
      { t: "Convert the queue to a FIFO queue, so each consumer receives fewer duplicate copies of each event.", ok: false, no: "FIFO requests cost more, and duplicates aren't what's driving the bill. The empty receives are." },
      { t: "Raise the queue's visibility timeout, so that consumers don't receive the same message again.", ok: false, no: "Visibility timeout affects redelivery of messages in flight, not the number of empty receive calls." },
      { t: "Set a delivery delay on the queue, so that messages build up before any consumer can see them.", ok: false, no: "Delayed messages just become visible later. Consumers that short poll keep making empty calls meanwhile." }
    ],
    why: "SQS charges per request. Long polling waits up to 20 seconds for messages instead of returning empty, and batch actions handle up to 10 messages per request.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-short-and-long-polling.html", "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-batch-api-actions.html"] },

  { id: "dva-4-209", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc",
    q: "A Lambda function reads an SQS standard queue that receives a steady trickle of messages. Logs show most invocations carry only one or two messages, and per-invocation overhead dominates the cost. Processing may be delayed by up to a minute. What should the developer change?",
    opts: [
      "Raise the batch size on the event source mapping, and set MaximumBatchingWindowInSeconds to 60.",
      "Set a 60-second delivery delay on the queue, so that messages build up there before Lambda polls them.",
      "Set ReceiveMessageWaitTimeSeconds on the queue to 20, so Lambda's pollers wait longer for messages.",
      "Raise the queue's visibility timeout to 60 seconds, so that Lambda gathers more messages into each batch."
    ], a: 0,
    no: [null,
      "Each message becomes visible 60 seconds after it was sent, so they still arrive one by one and Lambda invokes as soon as it finds them.",
      "Lambda's pollers already use long polling, and the function is still invoked as soon as messages are found.",
      "Visibility timeout only hides messages already received. It doesn't change how batches are formed."],
    why: "With a batching window, Lambda gathers records for up to that many seconds and invokes when the window ends, the batch size is reached, or the payload reaches 6 MB.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventsourcemapping.html"] },

  { id: "dva-4-210", exam: "DVA", dva: "4.3", topic: "kinesis", type: "mc",
    q: "A Lambda function processes a Kinesis data stream with four shards. Processing each batch is slow, the IteratorAge metric keeps rising, and the stream's write throughput is well within its shards' limits. Records with the same partition key must stay in order. What should the developer do without resharding the stream?",
    opts: [
      "Raise the ParallelizationFactor on the event source mapping, so Lambda processes several batches from each shard at once.",
      "Register the function as an enhanced fan-out consumer, so that it gets its own 2 MB per second of read throughput from every shard.",
      "Lower the batch size on the event source mapping to 1, so that each invocation of the function finishes faster.",
      "Set reserved concurrency on the function to 100, so that Lambda can run more copies of it for each shard."
    ], a: 0,
    no: [null,
      "Enhanced fan-out speeds up reading, but the bottleneck is processing, and it still runs one batch per shard at a time.",
      "Tiny batches add invocation overhead, and each shard still processes one batch at a time.",
      "Without a parallelization factor, Lambda runs one invocation per shard, so the extra concurrency goes unused."],
    why: "The parallelization factor (1 to 10) lets Lambda run that many concurrent batches per shard while keeping records with the same partition key in order.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html"] },

  { id: "dva-4-211", exam: "DVA", dva: "4.3", topic: "kinesis", type: "mc",
    q: "Five separate applications read the same Kinesis data stream with GetRecords. As each new application was added, all of them fell further behind and began to see read throttling, though writes are well within limits. Each application needs its own full read throughput without adding shards. What should the developer do?",
    opts: [
      "Register each application as an enhanced fan-out consumer, so records are pushed to it through SubscribeToShard.",
      "Raise the ParallelizationFactor for each of the applications, so that each one reads several batches from each shard at once.",
      "Have each application call GetRecords more often with a smaller limit, so its reads are spread more evenly.",
      "Put an SQS queue between the stream and each application, and have the applications read from the queues."
    ], a: 0,
    no: [null,
      "Parallelization factor is a Lambda event source setting that speeds up processing. Shared consumers still split the same read throughput.",
      "More frequent calls run into the per-shard read limits sooner.",
      "Something must still read the stream to fill the queues, and the stream's per-key ordering is lost."],
    why: "Shared consumers split 2 MB per second per shard between them. Each enhanced fan-out consumer gets its own 2 MB per second per shard, pushed over HTTP/2.",
    doc: ["https://docs.aws.amazon.com/streams/latest/dev/enhanced-consumers.html"] },

  { id: "dva-4-212", exam: "DVA", dva: "4.3", topic: "dynamodb", type: "mc",
    q: "A voting app stores one DynamoDB item per candidate and adds each vote to that item with UpdateItem. During a live show, about 3,000 votes per second go to one candidate, and those writes are throttled even though the table has plenty of total capacity. What should the developer do?",
    opts: [
      "Split each candidate's count across several items with a numeric suffix on the key, write to a random one, and add them up on read.",
      "Switch the table to on-demand capacity mode, so that DynamoDB scales up automatically to handle all of the writes to the popular candidate.",
      "Raise the table's provisioned write capacity to 5,000 WCU, so that the writes to the popular candidate are covered.",
      "Put DynamoDB Accelerator (DAX) in front of the table, so that the vote updates are absorbed by the DAX cluster."
    ], a: 0,
    no: [null,
      "On-demand still limits each partition to 1,000 write units per second, and one item lives on one partition.",
      "Table capacity isn't the limit. One partition can take at most 1,000 write units per second.",
      "DAX is a read cache. Writes go through to the table and still hit the same partition."],
    why: "Each partition supports at most 1,000 write units per second. Adding a suffix to the key spreads one hot key's writes over several partitions; reads then combine the shards.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html"] },

  { id: "dva-4-213", exam: "DVA", dva: "4.3", topic: "dynamodb", type: "mc",
    q: "A DynamoDB table holds 50 million support tickets. A dashboard finds the few hundred tickets marked for escalation by running a Scan with a FilterExpression every minute, which uses a large share of the table's read capacity. What should the developer do to cut the read cost?",
    opts: [
      "Add an Escalated attribute only to escalated tickets, create a global secondary index keyed on it, and query that index.",
      "Add a ProjectionExpression to the Scan, so that it returns only the few attributes the dashboard needs for each ticket.",
      "Keep the Scan, and lower its Limit parameter so that each request reads fewer items and uses fewer read capacity units.",
      "Change the FilterExpression to test a smaller attribute, so DynamoDB has less data to read to evaluate the filter."
    ], a: 0,
    no: [null,
      "Projection trims the response, but the Scan still reads, and is charged for, every item.",
      "A smaller page means more requests. The whole table is still read every minute.",
      "The filter runs after items are read, so the Scan consumes the same capacity whatever it tests."],
    why: "A global secondary index only holds items that have its key attribute, so it stays small (a sparse index). Querying it reads only the escalated tickets instead of scanning the table.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-indexes-general-sparse-indexes.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html"] },

  { id: "dva-4-214", exam: "DVA", dva: "4.3", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A REST API has caching turned on. Some clients send Cache-Control: max-age=0 on every request, which bypasses the cache and overloads the backend. Regular clients' requests must still succeed, and only an internal admin tool that signs requests with an IAM role should be able to refresh cache entries. What should the developer do? (Select TWO.)",
    items: [
      { t: "Require authorization for cache invalidation, and set unauthorized requests to ignore the Cache-Control header.", ok: true },
      { t: "Allow execute-api:InvalidateCache on the API's resources in the admin tool's IAM role policy.", ok: true },
      { t: "Lower the stage's cache TTL to 30 seconds, so cached entries refresh often enough that clients stop sending the header.", ok: false, no: "Clients that send the header still bypass the cache on every request." },
      { t: "Flush the stage cache every few minutes from a scheduled Lambda function instead of letting clients refresh it.", ok: false, no: "Flushing empties the whole cache, which sends even more traffic to the backend, and clients can still bypass it." },
      { t: "Add an AWS WAF rule that blocks any request carrying a Cache-Control header to the API stage.", ok: false, no: "Blocking fails the regular clients' requests and the admin tool's too." }
    ],
    why: "Without an InvalidateCache policy, any client can invalidate entries. Requiring authorization limits it to callers allowed execute-api:InvalidateCache, and the ignore option still serves other callers from the cache.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html"] },

  { id: "dva-4-215", exam: "DVA", dva: "4.3", topic: "cloudfront", type: "mc",
    q: "A CloudFront distribution serves product listing pages whose content depends only on the page and size query strings. Marketing adds tracking parameters to links, and new ones with unpredictable names appear every week, so the cache hit ratio is very low. The origin still needs page and size. What should the developer do?",
    opts: [
      "Use a cache policy that includes only the page and size query strings in the cache key.",
      "Use a cache policy that includes all query strings except the tracking parameters known today.",
      "Attach an origin request policy that forwards only page and size, and keep all query strings in the cache key.",
      "Use a cache policy that includes no query strings in the cache key, and keep the TTLs as they are."
    ], a: 0,
    no: [null,
      "Every new tracking parameter would be added to the cache key until someone updates the list.",
      "The cache policy decides the cache key, so the tracking parameters still split the cache.",
      "The origin would no longer receive page and size, so every request would get the same page."],
    why: "Values in the cache key are also sent to the origin. An include list keeps only the parameters that change the response, so other parameters don't split the cache.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cache-key-understand-cache-policy.html"] },

  { id: "dva-4-216", exam: "DVA", dva: "4.3", topic: "cloudfront", type: "mc",
    q: "An origin behind CloudFront returns a different HTML layout for phones and for desktops. The team wants each layout cached separately at the edge with a high cache hit ratio, and the origin must not have to parse User-Agent strings itself. What should the developer do?",
    opts: [
      "Add the CloudFront-Is-Mobile-Viewer and CloudFront-Is-Desktop-Viewer headers to the cache policy, and have the origin read them.",
      "Add the User-Agent header to the cache policy, so that each browser's own version of the page is cached separately at every edge location.",
      "Add the CloudFront-Is-Mobile-Viewer header to an origin request policy only, and leave the cache policy's headers unchanged.",
      "Enable Origin Shield in the Region closest to the origin, so that the two layouts are cached in a single central location."
    ], a: 0,
    no: [null,
      "There are thousands of User-Agent values, so the cache splits into many copies and the hit ratio falls.",
      "The origin sees the header, but the cache key doesn't vary by device, so phones can get the cached desktop layout.",
      "Origin Shield adds a caching layer, but the cache key still doesn't tell phones and desktops apart."],
    why: "CloudFront sets device-type headers from the User-Agent. Putting them in the cache policy adds them to the cache key, which gives a few variants instead of one per browser.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/adding-cloudfront-headers.html", "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-origin-requests.html"] },

  { id: "dva-4-217", exam: "DVA", dva: "4.3", topic: "cloudfront", type: "multi", hint: "Select TWO.",
    q: "A single-page app is served from S3 through CloudFront with a 24-hour TTL. After a release, users keep getting the old /js/app.js for up to a day. The team releases several times a week. Which approaches make users get the new file after a release? (Select TWO.)",
    items: [
      { t: "Give each release's file a versioned name, such as app.4f2c1.js, and update index.html to reference it.", ok: true },
      { t: "Create a CloudFront invalidation for the /js/app.js path as a step in each release's deployment.", ok: true },
      { t: "Turn on S3 Versioning for the bucket, so that CloudFront can tell when a new app.js is uploaded.", ok: false, no: "CloudFront serves its cached copy until it expires and doesn't check S3 for new versions." },
      { t: "Upload the new app.js with a Cache-Control: no-cache header, so that edge locations fetch it from S3 again.", ok: false, no: "The header applies only once the new object is fetched. Copies of the old object stay cached until they expire." },
      { t: "Enable Origin Shield on the S3 origin, so that the edge locations share one up-to-date cache layer.", ok: false, no: "Origin Shield reduces load on the origin. Edge locations still serve their cached old copy." }
    ],
    why: "An invalidation removes the file from edge caches, and a new file name is a new cache key. AWS recommends versioned names for frequent updates: they also beat browser and proxy caches and avoid invalidation charges.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html"] },

  { id: "dva-4-218", exam: "DVA", dva: "4.3", topic: "cloudfront", type: "mc",
    q: "A video service in us-east-1 sits behind CloudFront. Viewers are spread across many continents, and on a cache miss each regional edge cache asks the origin for the same segment, so origin load spikes during live events. The team wants to cut origin requests further without changing the origin. What should the developer do?",
    opts: [
      "Enable Origin Shield on the origin, and choose the AWS Region with the lowest latency to the origin.",
      "Add a second origin with an origin group, so that CloudFront fails over to it when the first is overloaded.",
      "Lower the TTLs in the cache policy, so that edge locations keep their cached copies of segments for less time.",
      "Turn on Amazon S3 Transfer Acceleration for the origin, so that requests from edge locations reach it faster."
    ], a: 0,
    no: [null,
      "Failover helps when the origin errors. It doesn't reduce how often edge caches ask the origin.",
      "Shorter TTLs cause more cache misses, which sends more requests to the origin.",
      "Transfer Acceleration speeds long-distance transfers to an S3 bucket. It doesn't reduce the number of requests."],
    why: "Origin Shield adds a central caching layer in front of the origin, so requests from all regional edge caches are combined and the origin sees far fewer of them.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html"] },

  { id: "dva-4-219", exam: "DVA", dva: "4.3", topic: "elasticache", type: "mc",
    q: "An app caches user profiles in ElastiCache with lazy loading and a 1-hour TTL. After users edit their profiles, they often see their old details for up to an hour. Profiles are read far more often than they are written, and reads must show a user's latest saved details. What should the developer do?",
    opts: [
      "Use write-through: each time a profile is saved, write it to the database and then put the new version in the cache.",
      "Keep lazy loading, and lower the TTL to 5 minutes, so stale profiles expire from the cache sooner after an edit.",
      "Keep lazy loading, and read profiles from the cache only when the database is slow, falling back to the database otherwise.",
      "Move the cache to a larger node type, so profiles are not evicted and the database is queried less often."
    ], a: 0,
    no: [null,
      "Users can still see stale details for up to 5 minutes, and the cache misses more often.",
      "Deciding per request by database speed still returns stale profiles on cache reads.",
      "A bigger node keeps entries longer, so stale profiles survive just as long."],
    why: "Lazy loading only refreshes an entry on a miss, so it can be stale until the TTL ends. Write-through updates the cache on every write, so cached data is never stale.",
    doc: ["https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html"] },

  { id: "dva-4-220", exam: "DVA", dva: "4.3", topic: "s3", type: "multi", hint: "Select TWO.",
    q: "A batch job on EC2 downloads 8 GB objects from an S3 bucket in the same Region, transforms them, and uploads 8 GB results to the same bucket. Each transfer uses a single request and is far slower than the instance's network bandwidth. Which changes will speed up the transfers? (Select TWO.)",
    items: [
      { t: "Download each object with several parallel GET requests, each for a different byte range of it.", ok: true },
      { t: "Upload each result as a multipart upload, sending several parts in parallel over separate connections.", ok: true },
      { t: "Turn on S3 Transfer Acceleration for the bucket, and use its accelerate endpoint for transfers.", ok: false, no: "Transfer Acceleration speeds up transfers over long distances. It doesn't help an instance in the same Region." },
      { t: "Store the objects in S3 Intelligent-Tiering, so the most-used objects move to a faster access tier.", ok: false, no: "Intelligent-Tiering lowers storage cost. Its tiers don't change transfer speed." },
      { t: "Turn on S3 Versioning for the bucket, so uploads of new results don't have to overwrite objects.", ok: false, no: "Versioning keeps old copies. It doesn't make transfers faster." }
    ],
    why: "One request uses one connection. Byte-range GETs and multipart uploads split a large object into parts that move in parallel, using more of the available bandwidth.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance-design-patterns.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html"] },

  { id: "dva-4-221", exam: "DVA", dva: "4.3", topic: "s3", type: "mc",
    q: "An ingestion service writes about 8,000 small objects per second to one S3 bucket, all under the key prefix incoming/. Since traffic grew, many PutObject calls fail with 503 Slow Down errors. Downstream readers can work with any key layout. What should the developer do?",
    opts: [
      "Spread the keys across several prefixes, such as a short hash before the name, and retry 503 errors with exponential backoff.",
      "Request a higher PUT request-rate quota for the bucket in Service Quotas, and keep writing every new object under the incoming/ prefix.",
      "Turn on S3 Transfer Acceleration for the bucket, so that the PutObject calls are handled through edge locations.",
      "Send every object with multipart upload, so that S3 spreads each object's parts over more of its storage partitions."
    ], a: 0,
    no: [null,
      "S3 request rates scale per prefix. Adding prefixes, not a quota request, raises the limit.",
      "Transfer Acceleration shortens long-distance transfers. It doesn't raise per-prefix request rates.",
      "Multipart upload turns each small object into more requests, which makes the 503 errors worse."],
    why: "S3 supports at least 3,500 PUT/COPY/POST/DELETE requests per second per partitioned prefix, so spreading writes over more prefixes scales throughput, and backoff handles 503s while S3 scales.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html"] },

  { id: "dva-4-222", exam: "DVA", dva: "4.3", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A company sells access to a REST API. Basic-tier partners may send up to 50 requests per second and 1 million requests a month, and premium partners up to 500 per second with no monthly cap. Each partner's limits must apply to that partner alone. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Create a usage plan per tier with its throttle and quota, add the stage, and add each partner's API key.", ok: true },
      { t: "Set API Key Required on the API's methods, so each request is identified by its x-api-key header.", ok: true },
      { t: "Set the stage's default throttling to 500 requests per second, so it covers the premium partners' limit.", ok: false, no: "Stage throttling is shared by every caller, so it can't give each partner its own limit." },
      { t: "Create a Cognito user pool group for each tier, so that API Gateway throttles each group to its limit.", ok: false, no: "Groups can drive authorization, but API Gateway doesn't throttle by Cognito group." },
      { t: "Set reserved concurrency on the backend Lambda function for each tier, so each tier gets its own limit.", ok: false, no: "Reserved concurrency applies to the whole function. It can't tell partners apart." }
    ],
    why: "Usage plans apply throttle and quota limits per API key. Methods must require an API key for API Gateway to match each request to its key and plan.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html"] },

  { id: "dva-4-223", exam: "DVA", dva: "4.3", topic: "sns", type: "mc",
    q: "A publisher sends JSON order events to an SNS topic with no message attributes, and the event type is a field in the JSON body. The publisher can't be changed. A developer adds the filter policy {\"eventType\": [\"refund\"]} to the refunds queue's subscription, and now the queue receives no messages at all. What should the developer do?",
    opts: [
      "Set the subscription's FilterPolicyScope attribute to MessageBody, so the policy is matched against the JSON body.",
      "Turn on raw message delivery for the subscription, so that SNS reads the fields of the JSON body as message attributes.",
      "Move the filter policy from the subscription to the topic, so that SNS applies it before the message fans out.",
      "Change the filter policy to {\"eventType\": [{\"exists\": true}]}, so that it matches any message with the field."
    ], a: 0,
    no: [null,
      "Raw message delivery only drops the SNS envelope from what the queue receives. Filtering still uses attributes.",
      "Filter policies belong to subscriptions. A topic has no filter policy.",
      "With the default scope the policy still checks message attributes, and these messages have none."],
    why: "The default filter policy scope is MessageAttributes. Setting FilterPolicyScope to MessageBody makes SNS match the policy against the message body instead.",
    doc: ["https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering-scope.html"] },

  { id: "dva-4-224", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc",
    q: "A team suspects many of its Lambda functions are set to far more memory than they use. They want each function's configured memory and the most it actually used over the past week, from data they already have, without adding extensions or turning on new features. What should the developer do?",
    opts: [
      "Run a CloudWatch Logs Insights query on the REPORT lines that compares @memorySize with max(@maxMemoryUsed).",
      "Turn on Lambda Insights for each function, and compare the memory utilization it reports with each setting.",
      "Read the MemoryUtilization metric that Lambda publishes to CloudWatch for every function by default.",
      "Search AWS CloudTrail for each function's Invoke events, and read the memory used recorded in each event."
    ], a: 0,
    no: [null,
      "Lambda Insights works, but it adds an extension layer, which the team ruled out.",
      "Lambda's default metrics don't include memory utilization.",
      "CloudTrail records API activity, not the resources each run used."],
    why: "Lambda writes a REPORT line for every invocation with the memory size and max memory used. Logs Insights exposes them as @memorySize and @maxMemoryUsed, so one query shows how much each function is over-provisioned.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-examples.html"] },

  { id: "dva-4-225", exam: "DVA", dva: "4.3", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Node.js Lambda function's REPORT lines show an Init Duration of about 4 seconds. The code loads the whole AWS SDK and an X-Ray SDK wrapper although it calls only DynamoDB, and it builds a large PDF library that only one rare request type uses. The team won't pay for pre-initialized environments. What should the developer do? (Select TWO.)",
    items: [
      { t: "Import only the DynamoDB client from the SDK instead of the whole SDK, to shrink what loads at startup.", ok: true },
      { t: "Load the PDF library lazily, the first time a request actually needs it, instead of at startup.", ok: true },
      { t: "Turn on Lambda SnapStart for the function's published versions, so environments start from a snapshot.", ok: false, no: "SnapStart supports Java, Python and .NET runtimes, not Node.js." },
      { t: "Move the libraries into a Lambda layer, since code loaded from a layer isn't counted in the Init phase.", ok: false, no: "Layer code is loaded the same way, and package size including layers still affects startup." },
      { t: "Raise the function's timeout, so that the long initialization no longer counts against each invocation.", ok: false, no: "The timeout doesn't make initialization faster, and the Init phase has its own limit." }
    ],
    why: "Init latency grows with the libraries loaded and the work done before the handler. Importing only the needed modules and lazily loading objects used on rare paths both cut it.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html", "https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html"] }
);
