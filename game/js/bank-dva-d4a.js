// Question bank batch: DVA-C02 tasks 4.1 (root cause analysis) and 4.2 (instrumenting for observability). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 4.1: Root cause analysis
  { id: "dva-4-101", exam: "DVA", dva: "4.1", topic: "lambda", type: "mc",
    q: "Clients that invoke a Lambda function synchronously through the SDK get TooManyRequestsException errors with the reason ReservedFunctionConcurrentInvocationLimitExceeded at peak times. In CloudWatch, the Throttles metric rises at those times, Errors stays flat, and ConcurrentExecutions levels off at 20. The account has plenty of unreserved concurrency. What should the developer do?",
    opts: [
      "Raise the reserved concurrency set on the function, so it can run more copies at once before Lambda rejects new requests.",
      "Request an increase to the account's concurrent executions quota in Service Quotas, so the Region allows more copies to run.",
      "Configure provisioned concurrency of 20 on an alias, so that warm environments are ready before each peak period begins.",
      "Raise the function's timeout and memory, so each invocation finishes sooner and the errors stop appearing in the Errors metric."
    ], a: 0,
    no: [null,
      "The reason names the function-level limit, and the account still has headroom. A bigger account quota leaves the function's cap at 20.",
      "Provisioned concurrency removes cold starts. It doesn't lift the function's reserved concurrency cap, so requests above 20 are still rejected.",
      "Throttled requests never run, so they aren't function errors. Timeout and memory don't change how many copies may run at once."],
    why: "Reserved concurrency is both a guarantee and a ceiling for one function. When it is reached, Lambda rejects synchronous requests with TooManyRequestsException and counts them in Throttles, not in Errors or Invocations.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html", "https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html"] },

  { id: "dva-4-102", exam: "DVA", dva: "4.1", topic: "lambda", type: "mc",
    q: "A Lambda function with the default 3-second timeout calls a partner's HTTPS API. The function's Errors metric spikes each afternoon. Its logs show Task timed out after 3.00 seconds for the failed runs, the REPORT lines show low memory use, and Throttles is zero. X-Ray traces show the partner call sometimes takes 5 seconds. What should the developer do?",
    opts: [
      "Raise the function's timeout above the partner call's longest expected latency, and set the HTTP client's own timeout below it.",
      "Raise the function's reserved concurrency, so that the afternoon traffic no longer waits for a free execution environment.",
      "Raise the function's memory setting, so that the runtime has more room to hold the partner's responses during the call.",
      "Turn on automatic retries in the HTTP client, so that each slow partner call is attempted again before the invocation ends."
    ], a: 0,
    no: [null,
      "Throttles is zero, so nothing waits for concurrency. The runs fail because they hit the 3-second limit.",
      "The REPORT lines show low memory use, so memory isn't the limit. Time is.",
      "Retrying a slow call inside a 3-second limit only uses the time up faster."],
    why: "Task timed out means the invocation ran into its configured timeout, and Lambda counts it in Errors. The timeout must cover the slowest downstream call, with the client's own timeout set lower so the code can handle a slow call itself.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html", "https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-invocation.html"] },

  { id: "dva-4-103", exam: "DVA", dva: "4.1", topic: "elb", type: "mc",
    q: "An Application Load Balancer fronts EC2 instances that run a reporting app. Requests to the /export path fail with HTTP 504 after about 60 seconds, and the HTTPCode_ELB_504_Count metric rises. The app's own logs show each export finishes after about 75 seconds with a 200 response. The load balancer uses default settings. What should the developer do?",
    opts: [
      "Raise the load balancer's connection idle timeout above the longest export time, or make exports run in the background.",
      "Raise the target group's deregistration delay, so that the load balancer waits longer before it closes connections to targets.",
      "Raise the target group's health check timeout and interval, so that slow exports don't mark the instances as unhealthy.",
      "Turn on sticky sessions for the target group, so that every request from one client reaches the instance that holds its export."
    ], a: 0,
    no: [null,
      "Deregistration delay only applies while a target is being removed. It doesn't change how long an active request may sit idle.",
      "The 504 comes from the request timing out, not from health checks. The instances stay healthy and in service.",
      "Stickiness picks which target gets a request. The export still runs past the idle timeout."],
    why: "The ALB returns 504 when the target doesn't respond before the idle timeout, which is 60 seconds by default. A longer idle timeout, or an asynchronous export, lets the response arrive in time.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html", "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html"] },

  { id: "dva-4-104", exam: "DVA", dva: "4.1", topic: "cloudwatch", type: "multi", hint: "Select TWO.",
    q: "A payment service on EC2 already sends its application log to a CloudWatch Logs log group. Each declined card writes a line containing PAYMENT_DECLINED. The team wants an email when more than 20 declines happen within 5 minutes, without changing the application. Which combination of steps meets these requirements with the LEAST operational overhead? (Select TWO.)",
    items: [
      { t: "Create a metric filter on the log group with the pattern PAYMENT_DECLINED that publishes a value of 1 to a custom metric for each match.", ok: true },
      { t: "Create a CloudWatch alarm on that custom metric with the Sum statistic, a 5-minute period and a threshold of 20, notifying an SNS topic.", ok: true },
      { t: "Save a CloudWatch Logs Insights query that counts PAYMENT_DECLINED lines in 5-minute bins, and add it to a CloudWatch dashboard.", ok: false, no: "A dashboard widget shows the count when someone looks. It sends no email." },
      { t: "Create an EventBridge rule whose event pattern matches log lines that contain PAYMENT_DECLINED, with an SNS topic as the target.", ok: false, no: "CloudWatch Logs doesn't send each log line to EventBridge, so the rule never matches anything." },
      { t: "Add a subscription filter that sends matching lines to a Lambda function, which counts them and calls PutMetricData each minute.", ok: false, no: "It works, but it adds code to write and run where a metric filter does the counting for free." }
    ],
    why: "A metric filter turns matching log events into a CloudWatch metric as they arrive, with no code. An alarm on the metric's Sum over 5 minutes then notifies SNS. Metric filters count only events logged after they are created.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/MonitoringLogData.html"] },

  { id: "dva-4-105", exam: "DVA", dva: "4.1", topic: "cloudwatch", type: "mc",
    q: "A security team wants every log event that contains ACCESS_DENIED in an application's log group passed, within a few minutes of being written, to a Lambda function that opens a ticket with the full log line. Other events in the log group must not invoke the function. Which solution meets these requirements?",
    opts: [
      "Create a subscription filter on the log group with an ACCESS_DENIED filter pattern, and make the Lambda function its destination.",
      "Create a metric filter on the log group with an ACCESS_DENIED pattern, and an alarm on its metric that invokes the Lambda function.",
      "Run a CloudWatch Logs export task to Amazon S3 each hour, and add an S3 event notification that invokes the Lambda function.",
      "Create a Contributor Insights rule on the log group that ranks ACCESS_DENIED events, and send the rule's report to the function."
    ], a: 0,
    no: [null,
      "A metric filter keeps only a count. The alarm can't hand the function the log lines that matched.",
      "Export tasks are batch jobs that can take hours to finish, which misses the few-minutes requirement.",
      "Contributor Insights reports top contributors as time series. It doesn't deliver individual log events to a function."],
    why: "A subscription filter delivers matching log events from CloudWatch Logs to Lambda, Kinesis Data Streams or Data Firehose soon after they are ingested, usually within three minutes. The filter pattern keeps other events out.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Subscriptions.html"] },

  { id: "dva-4-106", exam: "DVA", dva: "4.1", topic: "dynamodb", type: "mc",
    q: "A DynamoDB table in provisioned mode returns throttling errors to an app, yet its consumed capacity metrics stay far below the table's provisioned capacity. The developer suspects a few partition key values receive most of the traffic and needs to know which ones. Which solution meets this requirement with the LEAST operational overhead?",
    opts: [
      "Turn on CloudWatch Contributor Insights for the table, and read its graphs of the most accessed and most throttled keys.",
      "Turn on DynamoDB Streams, and write a Lambda function that counts each partition key value it sees in the stream records.",
      "Graph the table's ThrottledRequests metric by its Operation dimension, and compare the counts for each type of request.",
      "Place a DynamoDB Accelerator (DAX) cluster in front of the table, and read the cluster's metrics for cache hits and misses."
    ], a: 0,
    no: [null,
      "It is custom code to build and run, and streams carry only writes, so throttled reads and rejected requests never show up.",
      "That metric splits throttling by API operation, not by key, so it can't name the hot partition key values.",
      "DAX may soften read hot spots, but its metrics don't say which keys are hot, and it doesn't help throttled writes."],
    why: "CloudWatch Contributor Insights for DynamoDB shows the most accessed and most throttled partition and sort keys of a table or GSI, with no code to write.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights_HowItWorks.html"] },

  { id: "dva-4-107", exam: "DVA", dva: "4.1", topic: "xray", type: "mc",
    q: "An order API is traced with AWS X-Ray. During a sale, the X-Ray service map shows the API Gateway and Lambda nodes mostly green, while the node for the DynamoDB table the function writes to is outlined mostly in purple. Which conclusion and next step are correct?",
    opts: [
      "DynamoDB is throttling the function's writes with 429 errors, so add table capacity and make sure the SDK retries with backoff.",
      "DynamoDB is returning 500-series server faults, so open an AWS Support case and wait for the service to recover before retrying.",
      "The function is sending malformed requests that get 400-series client errors, so fix the item shape that the code writes.",
      "Lambda is throttling the function's invocations, so raise the function's reserved concurrency before the next sale begins."
    ], a: 0,
    no: [null,
      "Red marks server faults (5xx). Purple marks throttling.",
      "Yellow marks client errors (4xx). Purple means the requests were throttled.",
      "The Lambda node is green, and the purple is on the DynamoDB node, so the throttling happens at the table."],
    why: "The X-Ray service map colors each node by its calls: green for success, red for server faults (5xx), yellow for client errors (4xx), and purple for throttling (429).",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-console-servicemap.html", "https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html"] },

  { id: "dva-4-108", exam: "DVA", dva: "4.1", topic: "cloudformation", type: "multi", hint: "Select TWO.",
    q: "A developer's create-stack operation fails and ends in ROLLBACK_COMPLETE, so the EC2 instance and other resources it created are gone. The developer must find the root cause and wants to inspect the failed resources on the next attempt instead of losing them to rollback. Which actions should the developer take? (Select TWO.)",
    items: [
      { t: "Read the stack's events, find the earliest event with a CREATE_FAILED status, and read the status reason recorded on it.", ok: true },
      { t: "Run create-stack again with the --disable-rollback option, so resources that succeed are kept and failed ones stay for inspection.", ok: true },
      { t: "Read the status reason on the final ROLLBACK_COMPLETE event, which repeats the service error that started the rollback.", ok: false, no: "The last event only reports that the rollback finished. The cause is on the first failure event." },
      { t: "Apply a stack policy that denies Update:Delete on all resources, so the next rollback can't remove the failed instance.", ok: false, no: "Stack policies guard resources during stack updates. They don't stop a failed create from rolling back." },
      { t: "Run validate-template on the template, which reports the resource that failed and the error the service returned for it.", ok: false, no: "validate-template only checks template syntax. It doesn't create resources or see service errors." }
    ],
    why: "The status reason on the first failed event holds the service's error. Later failures are often knock-on cancellations. Disabling rollback (OnFailure DO_NOTHING) preserves provisioned resources so the failure can be inspected and retried.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/troubleshooting.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stack-failure-options.html"] },

  { id: "dva-4-109", exam: "DVA", dva: "4.1", topic: "codedeploy", type: "mc",
    q: "A CodeDeploy deployment to Amazon Linux EC2 instances fails at the AfterInstall lifecycle event. The console reports only that the hook's script failed with exit code 1. The developer needs the full standard output and error that the script printed on one instance. Where should the developer look?",
    opts: [
      "In the scripts.log file under /opt/codedeploy-agent/deployment-root/ for that deployment group and deployment ID on the instance.",
      "In the CloudWatch Logs log group that CodeDeploy creates automatically for each deployment group when its first deployment runs.",
      "In the AWS CloudTrail event history, in the CreateDeployment event that started the deployment and recorded its later results.",
      "In the EventBridge event for the failed deployment, whose detail field carries the output from each lifecycle hook that ran."
    ], a: 0,
    no: [null,
      "CodeDeploy doesn't send instance logs to CloudWatch Logs by itself. That needs the CloudWatch agent set up to ship them.",
      "CloudTrail records API calls such as CreateDeployment, not what a script printed on an instance.",
      "Deployment state-change events say the deployment failed, not what the hook script printed."],
    why: "The CodeDeploy agent writes each hook script's output to scripts.log in /opt/codedeploy-agent/deployment-root/<deployment-group-ID>/<deployment-ID>/logs on the instance, which is where a ScriptFailed error is diagnosed.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-view-logs.html"] },

  { id: "dva-4-110", exam: "DVA", dva: "4.1", topic: "ecs", type: "mc",
    q: "An ECS service on Fargate keeps replacing its tasks. In the console, the stopped tasks show the reason OutOfMemoryError: Container killed due to memory usage. CPU use stays below 30% until each task stops, and the app's logs show no errors before then. What should the developer do?",
    opts: [
      "Raise the memory in the task definition, at the task level and for the container, then update the service to the new revision.",
      "Raise the CPU units in the task definition, so the container finishes its work faster and frees memory before it runs out.",
      "Add an ECS service auto scaling policy on memory use, so more tasks share the load when memory use rises across the service.",
      "Raise the task's ephemeral storage, so the container can spill data to disk instead of holding it in memory as it runs."
    ], a: 0,
    no: [null,
      "CPU use is low, so CPU isn't the limit. Each container still has too little memory for its work.",
      "More tasks may lower the load on each one, but every task still has the same memory limit and can still be killed.",
      "Ephemeral storage is disk space. It doesn't change the memory limit that killed the container."],
    why: "This stopped reason means processes in the container used more memory than the task definition allows. Giving the task and container more memory in a new revision fixes it.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/out-of-memory.html", "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/stopped-task-errors.html"] },

  { id: "dva-4-111", exam: "DVA", dva: "4.1", topic: "s3", type: "multi", hint: "Select TWO.",
    q: "A batch job writes about 8,000 small objects per second to one S3 bucket, all under the key prefix uploads/2026-10-20/. The job starts getting HTTP 503 Slow Down responses, and some writes fail after the job's single retry. Which actions should the developer take to resolve this? (Select TWO.)",
    items: [
      { t: "Spread the object keys across several prefixes, for example by adding a short hash before the date, so each prefix gets fewer requests.", ok: true },
      { t: "Retry the failed requests with exponential backoff and jitter, as the AWS SDKs' standard retry mode does by default.", ok: true },
      { t: "Turn on S3 Transfer Acceleration for the bucket, and send the writes to the bucket's accelerate endpoint from the job.", ok: false, no: "Acceleration speeds up long-distance transfers. It doesn't raise the request rate a prefix supports." },
      { t: "Request a higher S3 request-rate quota for the bucket in Service Quotas, then wait for it to be approved.", ok: false, no: "S3 has no request-rate quota to raise. It scales per prefix, so more prefixes give more throughput." },
      { t: "Upload each small object with multipart upload, so its parts spread over more S3 servers and partitions.", ok: false, no: "Multipart upload adds requests per object, which makes the request rate higher, not lower." }
    ],
    why: "S3 supports at least 3,500 writes per second per partitioned prefix and returns 503 Slow Down while it scales. Spreading keys over more prefixes raises the ceiling, and backoff with jitter rides out the scaling period.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance-design-patterns.html"] },

  { id: "dva-4-112", exam: "DVA", dva: "4.1", topic: "s3", type: "mc",
    q: "A Lambda function reads reports from an S3 bucket. Last week the bucket's default encryption changed from SSE-S3 to SSE-KMS with a customer managed key, whose key policy lets IAM policies in the account grant access. The function still reads older reports, but GetObject on new reports fails with AccessDenied. What should the developer do?",
    opts: [
      "Add kms:Decrypt on the customer managed key to the policy on the function's execution role, in the same account.",
      "Add kms:GenerateDataKey on the customer managed key to the policy on the function's execution role, in the same account.",
      "Turn on S3 Bucket Keys for the bucket, so S3 uses a bucket-level key and calls AWS KMS less often for each object.",
      "Add a bucket policy statement that grants s3:GetObject on the bucket's objects to the function's execution role."
    ], a: 0,
    no: [null,
      "GenerateDataKey is needed to write SSE-KMS objects. Reading them needs kms:Decrypt.",
      "Bucket Keys cut KMS request costs. They don't grant the role use of the key.",
      "S3 access already works, as the older reports show. The missing permission is on the KMS key."],
    why: "Reading an SSE-KMS object needs kms:Decrypt on its key as well as s3:GetObject. Older SSE-S3 objects need no KMS permission, which is why only new reports fail.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/troubleshoot-403-errors.html"] },

  { id: "dva-4-113", exam: "DVA", dva: "4.1", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A developer must see why a REST API returns intermittent 500 errors, including what API Gateway did with each request. The API is deployed to a prod stage in a new AWS account, and no API in that account or Region has ever written logs to CloudWatch. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Create an IAM role that API Gateway can assume, with the AmazonAPIGatewayPushToCloudWatchLogs policy, and set it as the CloudWatch log role ARN in API Gateway's settings.", ok: true },
      { t: "Edit the prod stage's logs and tracing settings, and set the CloudWatch Logs execution logging level to Errors and info logs.", ok: true },
      { t: "Attach the AmazonAPIGatewayPushToCloudWatchLogs policy to the execution role of the Lambda function behind the API.", ok: false, no: "The function's role covers the function's own logs. API Gateway writes its logs through the role set in its account settings." },
      { t: "Turn on detailed CloudWatch metrics for the prod stage, so that each method reports its own 5XXError and Latency.", ok: false, no: "Detailed metrics count errors per method. They don't record what happened to each request." },
      { t: "Create the API-Gateway-Execution-Logs log group for the API and stage by hand, so that API Gateway has a place to write.", ok: false, no: "API Gateway creates and manages this log group itself. Creating it doesn't give API Gateway permission to write." }
    ],
    why: "Execution logging needs an account-level CloudWatch role ARN, set once per Region, and a logging level on the stage. API Gateway then writes its processing steps and errors to its own log group.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-execution-logging.html"] },

  // Task 4.2: Instrument code for observability
  { id: "dva-4-114", exam: "DVA", dva: "4.2", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Python Lambda function writes many DEBUG and INFO lines with the runtime's standard logging module, and the code never sets a log level. In production the team wants only WARN and higher sent to CloudWatch Logs, and wants to turn DEBUG back on later without redeploying code. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Set the function's log format to JSON in its logging configuration.", ok: true },
      { t: "Set the function's application log level to WARN in its logging configuration.", ok: true },
      { t: "Set the function's system log level to WARN in its logging configuration.", ok: false, no: "The system log level filters the platform's own lines, such as START and REPORT, not the code's DEBUG and INFO lines." },
      { t: "Set the retention of the function's log group to one day.", ok: false, no: "Retention deletes old logs. Every line is still sent and stored until then." },
      { t: "Add a subscription filter on the log group that matches WARN.", ok: false, no: "A subscription filter forwards matching events elsewhere. All lines are still written to the log group." }
    ],
    why: "Lambda's log-level filtering works with the JSON log format. With the application log level at WARN, Lambda doesn't send INFO or DEBUG output to CloudWatch Logs, and the level can be changed later in configuration.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-log-level.html"] },

  { id: "dva-4-115", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "multi", hint: "Select TWO.",
    q: "A worker on EC2 publishes a custom metric, QueueBacklog, with PutMetricData every few seconds. The team must be alerted within about 30 seconds when the backlog passes 1,000. Today the alarm fires only after a minute or more. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Publish QueueBacklog with StorageResolution set to 1, so CloudWatch stores it as a high-resolution metric.", ok: true },
      { t: "Create the alarm on QueueBacklog with a period of 10 seconds, which makes it a high-resolution alarm.", ok: true },
      { t: "Turn on detailed monitoring for the EC2 instance, so that its metrics are sent to CloudWatch every second.", ok: false, no: "Detailed monitoring sends the instance's own EC2 metrics each minute. It doesn't change a custom metric." },
      { t: "Keep a 60-second alarm period, and set the alarm to 1 out of 1 datapoints so it fires on the first breach.", ok: false, no: "With a 60-second period, a breach still needs a full minute of data before it can be evaluated." },
      { t: "Publish QueueBacklog with the Unit set to Seconds, so CloudWatch keeps its data points at one-second steps.", ok: false, no: "The unit only labels the values. Resolution is set by StorageResolution." }
    ],
    why: "A custom metric published with StorageResolution 1 is kept at one-second granularity, and only such metrics support alarms with a 10- or 30-second period.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html", "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html"] },

  { id: "dva-4-116", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "multi", hint: "Select TWO.",
    q: "A team runs a Java app on Amazon Linux EC2 instances. They need memory and disk space use in CloudWatch, and the app's own log file at /var/log/app/app.log in CloudWatch Logs. The default EC2 metrics don't include memory or disk space. Which steps meet these requirements MOST securely? (Select TWO.)",
    items: [
      { t: "Install the CloudWatch agent, with a configuration file that collects mem_used_percent and disk_used_percent and the app.log file.", ok: true },
      { t: "Attach an instance profile whose IAM role has the CloudWatchAgentServerPolicy managed policy to each of the instances.", ok: true },
      { t: "Turn on detailed monitoring for each instance, so that EC2 reports memory and disk use along with CPU each minute.", ok: false, no: "Detailed monitoring sends the same EC2 metrics more often. EC2 still can't see memory or disk use inside the instance." },
      { t: "Store an IAM user's access keys in the agent's credentials file on each instance, so the agent can call CloudWatch.", ok: false, no: "Long-lived keys on disk are less secure than an instance role, which gives temporary credentials." },
      { t: "Create a CloudTrail trail with CloudWatch Logs delivery, so that the instances' activity reaches CloudWatch Logs.", ok: false, no: "CloudTrail records AWS API calls. It doesn't read memory, disk or an app's log file." }
    ],
    why: "Memory and disk use are inside the guest OS, so the CloudWatch agent collects them along with log files. An instance role with CloudWatchAgentServerPolicy lets it publish without stored keys.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Install-CloudWatch-Agent.html", "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/prerequisites.html"] },

  { id: "dva-4-117", exam: "DVA", dva: "4.2", topic: "xray", type: "mc",
    q: "A busy API is instrumented with the X-Ray SDK, which reads sampling rules from the X-Ray service. Too few traces include the /checkout path to debug a rare error, while health checks fill the rest of the budget. The team wants more /checkout traces now, without redeploying code. What should the developer do?",
    opts: [
      "Create an X-Ray sampling rule for the /checkout URL path with a higher fixed rate and a higher priority than the default rule.",
      "Add a local sampling rules file to the application that samples every /checkout request, then restart the app's instances.",
      "Create an X-Ray group with a filter expression for the /checkout URL path, so that more of its requests are kept in traces.",
      "Add an annotation for the URL path to each segment in the code, so that X-Ray can choose /checkout requests when sampling."
    ], a: 0,
    no: [null,
      "Local rules live with the code, so changing them needs a redeploy, which the team wants to avoid.",
      "Groups filter traces that were already recorded. They don't change which requests get sampled.",
      "It needs a code change, and annotations are for searching traces later, not for choosing what to sample."],
    why: "Sampling rules set in X-Ray apply to every SDK that reads rules from the service, with no deployment. Rules are checked in order of priority, and a rule can match on URL path, host, method and service.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-console-sampling.html"] },

  { id: "dva-4-118", exam: "DVA", dva: "4.2", topic: "xray", type: "mc",
    q: "A team traces its services with AWS X-Ray. They want a CloudWatch alarm that fires when the number of checkout traces taking longer than 3 seconds goes over 50 in a 5-minute period. They don't want to write or deploy code to count the traces. What should the developer do?",
    opts: [
      "Create an X-Ray group with a filter expression for slow checkout traces, then create an alarm on the trace count metric that the group publishes.",
      "Create an X-Ray sampling rule for checkout requests with a reservoir of 50, then create an alarm on the sampling rule's metrics in CloudWatch.",
      "Add an annotation for checkout latency in the code, then create a CloudWatch alarm on the annotation's value for each of the traces.",
      "Create a metric filter on the service's log group that matches trace IDs, then alarm when the count of matching log lines is over 50."
    ], a: 0,
    no: [null,
      "A reservoir sets how many requests are traced each second. It doesn't count slow traces.",
      "Annotations make traces searchable. They aren't CloudWatch metrics, and adding one means a code change.",
      "Log lines don't say which traces were slow, so the count wouldn't measure what the team asked for."],
    why: "An X-Ray group is defined by a filter expression, such as service(\"checkout\") AND responsetime > 3. X-Ray publishes the number of matching traces to CloudWatch every minute, so an alarm can watch it.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-console-groups.html"] },

  { id: "dva-4-119", exam: "DVA", dva: "4.2", topic: "xray", type: "mc",
    q: "A team is adding distributed tracing to containerized services on ECS. They want to instrument the code once, send traces to AWS X-Ray and metrics to CloudWatch, and be able to send the same data to another backend later without instrumenting again. They also want to avoid tools that AWS has put in maintenance mode. Which approach should the developer use?",
    opts: [
      "Instrument the services with AWS Distro for OpenTelemetry, and run the ADOT Collector as a sidecar that exports to X-Ray and CloudWatch.",
      "Instrument the services with the X-Ray SDK, and run the X-Ray daemon as a sidecar container that relays segments to the X-Ray API.",
      "Turn on CloudTrail data events for the services' AWS calls, and use CloudTrail Lake queries to rebuild each request path from them.",
      "Write every request's timings as embedded metric format logs, and build a CloudWatch dashboard that shows each service's latency."
    ], a: 0,
    no: [null,
      "The X-Ray SDKs and daemon entered maintenance mode in February 2026, and they tie the instrumentation to X-Ray.",
      "CloudTrail records AWS API calls, not traces of requests through the services' own code.",
      "EMF produces metrics from logs. It gives no traces, so requests can't be followed across services."],
    why: "ADOT is AWS's distribution of OpenTelemetry. Code is instrumented once with open APIs, and the collector can export traces to X-Ray and metrics to CloudWatch or to other backends.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-instrumenting-your-app.html"] },

  { id: "dva-4-120", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc",
    q: "An on-call developer is paged by two separate CloudWatch alarms for a web API, one on p99 latency and one on the 5XX error count. Either one alone is usually harmless, so the team wants a page only when both are in ALARM at the same time. What should the developer do?",
    opts: [
      "Create a composite alarm whose rule is ALARM(latency) AND ALARM(errors), give it the SNS action, and remove the actions from both child alarms.",
      "Raise datapoints to alarm on both alarms, so that each one needs more breaching periods in a row before it sends its page to the SNS topic.",
      "Send both alarms to one SNS topic, and add a subscription filter policy that delivers a message only when both alarms report ALARM.",
      "Replace both alarms with anomaly detection alarms, so that each one learns the API's normal pattern and pages only on unusual values."
    ], a: 0,
    no: [null,
      "The alarms still page separately. Neither one knows the other's state.",
      "A filter policy checks one message at a time, so it can't tell whether another alarm is also in ALARM.",
      "Each anomaly alarm still pages on its own, not only when both conditions hold."],
    why: "A composite alarm combines other alarms' states with AND, OR and NOT. Putting the action only on the composite means one page when both conditions hold, and less alarm noise.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create_Composite_Alarm.html"] },

  { id: "dva-4-121", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc",
    q: "A Lambda function calls PutMetricData for a custom metric, PaymentFailures, only when a payment fails. An alarm fires when the metric's Sum is above 5 in a 5-minute period. On quiet days the alarm sits in INSUFFICIENT_DATA, which the team's dashboard treats as a problem. Failures should still put it in ALARM. What should the developer change?",
    opts: [
      "Set the alarm's treatment of missing data to notBreaching, so periods with no data points count as within the threshold.",
      "Set the alarm's treatment of missing data to breaching, so periods with no data points move the alarm into the ALARM state.",
      "Set the alarm's treatment of missing data to ignore, so the alarm keeps whatever state it had before the data stopped arriving.",
      "Raise the alarm's period to one hour, so that each period is more likely to contain at least one PaymentFailures data point."
    ], a: 0,
    no: [null,
      "No data here means no failures, so treating it as breaching would page the team on every quiet period.",
      "Ignore keeps the current state, so an alarm that starts out in INSUFFICIENT_DATA can stay there on quiet days.",
      "A longer period delays real alerts and still leaves quiet hours with no data."],
    why: "For a metric that is only reported when an error happens, missing data means good news. notBreaching treats those periods as OK, while real failures still breach. The default treatment, missing, gives INSUFFICIENT_DATA.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html"] },

  { id: "dva-4-122", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc",
    q: "An app makes heavy use of AWS KMS for envelope encryption. During a launch it hit a KMS request-rate quota and was throttled. The team wants an alarm when KMS usage passes 80% of that quota, and a graph of usage as a percentage on a dashboard. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Graph the KMS usage metric in the AWS/Usage namespace with the expression m1/SERVICE_QUOTA(m1)*100, and create an alarm on it at 80.",
      "Create a metric filter on a CloudTrail log group that counts KMS API events, and alarm when the count passes 80% of the quota value.",
      "Write a scheduled Lambda function that calls the Service Quotas API each minute and publishes the usage percentage with PutMetricData.",
      "Turn on AWS Config with a managed rule that compares KMS usage with the quota, and alarm on the count of the rule's noncompliant results."
    ], a: 0,
    no: [null,
      "It works, but it needs a trail sending to CloudWatch Logs and a quota number written by hand, where usage metrics already exist.",
      "It is custom code to build and run when CloudWatch already has the usage metric and a quota function.",
      "AWS Config checks resource settings. It doesn't track API request rates against quotas."],
    why: "Services such as KMS publish usage metrics in the AWS/Usage namespace. The SERVICE_QUOTA() metric math function returns the quota, so usage as a percentage can be graphed and alarmed on directly.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Quotas-Visualize-Alarms.html", "https://docs.aws.amazon.com/servicequotas/latest/userguide/configure-cloudwatch.html"] },

  { id: "dva-4-123", exam: "DVA", dva: "4.2", topic: "codedeploy", type: "multi", hint: "Select TWO.",
    q: "A team deploys a Lambda function with CodeDeploy. Developers want an email each time a deployment in the deployment group succeeds or fails, without changing the application code. Which solutions will meet these requirements? (Select TWO.)",
    items: [
      { t: "Create an EventBridge rule that matches CodeDeploy Deployment State-change Notification events for successful and failed deployments, with an SNS topic as its target.", ok: true },
      { t: "Add a trigger to the deployment group for the deployment success and deployment failure events that publishes to an SNS topic.", ok: true },
      { t: "Add CloudWatch alarms to the deployment group's alarm configuration, so CodeDeploy sends an alarm notification at the end of each deployment.", ok: false, no: "Alarms in a deployment group stop or roll back a deployment when they fire. They don't report each deployment's result." },
      { t: "Create a CloudTrail trail with SNS notifications turned on, so the team is emailed whenever a CodeDeploy API call is logged.", ok: false, no: "CloudTrail's SNS notice fires when a log file is delivered, not when a deployment ends." },
      { t: "Add an AfterAllowTraffic hook function to the AppSpec file that publishes to an SNS topic when it runs.", ok: false, no: "The hook runs only when the deployment gets that far, so failed deployments send nothing." }
    ],
    why: "CodeDeploy sends deployment state changes to EventBridge, where a rule can route them to SNS. A deployment group trigger can also publish deployment and instance events straight to an SNS topic.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/monitoring-cloudwatch-events.html", "https://docs.aws.amazon.com/codedeploy/latest/userguide/monitoring-sns-event-notifications-create-trigger.html"] },

  { id: "dva-4-124", exam: "DVA", dva: "4.2", topic: "ecs", type: "multi", hint: "Select TWO.",
    q: "An ECS service runs behind an Application Load Balancer. Each new task needs about 3 minutes to load a cache before it can serve requests, but its web server answers on / within seconds. ECS keeps stopping new tasks for failed health checks, and some early requests get errors. Which changes should the developer make? (Select TWO.)",
    items: [
      { t: "Set the service's health check grace period to longer than the warm-up time, so early failed checks don't cause ECS to stop new tasks.", ok: true },
      { t: "Point the target group's health check at a readiness path that returns 200 only after the cache has finished loading.", ok: true },
      { t: "Raise the target group's deregistration delay, so new tasks have more time to load the cache before they get any traffic.", ok: false, no: "Deregistration delay applies when a target is being removed. It doesn't hold traffic back from a new task." },
      { t: "Raise the container's stopTimeout, so that ECS waits longer before it force-kills a task that has failed its health checks.", ok: false, no: "stopTimeout is the wait between the stop signal and a forced kill. The task is still stopped." },
      { t: "Keep the health check on /, and lower the healthy threshold so that new tasks register as healthy as soon as possible.", ok: false, no: "Tasks would get traffic before the cache is loaded, which is exactly what causes the early errors." }
    ],
    why: "The grace period makes the ECS scheduler ignore load balancer and container health checks for a set time after a task starts. A readiness endpoint keeps the ALB from routing to a task until it can serve.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_definition_parameters.html", "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html"] },

  { id: "dva-4-125", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc",
    q: "A web app is used mostly during business hours. Twice this month its sign-in page broke overnight, and the team learned of it only when customers complained in the morning. They want the sign-in flow tested from a browser every 5 minutes, all day, with screenshots when a step fails, and with the LEAST development effort. What should the developer do?",
    opts: [
      "Create a CloudWatch Synthetics canary from the GUI workflow blueprint that signs in on a schedule, and alarm on its success metric.",
      "Create a Route 53 health check on the sign-in page's URL with string matching, and alarm on the health check's status metric.",
      "Turn on X-Ray active tracing for the app, and alarm when the service map shows faults on the sign-in service's node.",
      "Schedule a Lambda function with EventBridge Scheduler that runs a headless browser the team packages and maintains itself."
    ], a: 0,
    no: [null,
      "A health check requests one URL. It can't fill in a form, click through a sign-in, or take screenshots.",
      "Tracing only sees real requests, so it can't detect a broken page overnight when no one is using it.",
      "It works, but it means building and maintaining what a canary already provides."],
    why: "CloudWatch Synthetics canaries are scheduled scripts that follow the same steps as a user, so they find problems even with no customer traffic. They record screenshots and publish metrics that alarms can watch.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Synthetics_Canaries.html"] }
);
