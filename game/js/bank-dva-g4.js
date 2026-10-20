// Question bank batch: DVA domain 4 gap fill: embedded metric format, Application Signals and Contributor Insights,
// bootstrap and integration failures, logging vs monitoring vs observability, structured logs and log levels,
// deployment alerts, container and Route 53 health checks, OpenTelemetry/ADOT tracing, SNS filter logic, API Gateway
// and CloudFront caching, in-function caching, profiling, sizing and log-based performance analysis.
// Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 4.1: Root cause analysis
  { id: "dva-4-301", exam: "DVA", dva: "4.1", topic: "cloudwatch", type: "mc",
    q: "A Lambda function logs each checkout in CloudWatch embedded metric format, with the metric CheckoutLatency and the dimension set [\"PaymentMethod\", \"RequestId\"], so that slow requests can be found later by ID. The custom metrics bill has grown sharply, and graphs per payment method are hard to build. The request ID must stay searchable in the logs. What should the developer do?",
    opts: [
      "Keep RequestId as a top-level member of each log event, but remove it from the dimension set so that only PaymentMethod is a dimension.",
      "Set StorageResolution to 60 for CheckoutLatency, so CloudWatch stores one data point a minute for each request ID instead of one a second.",
      "Replace the embedded metric format logs with PutMetricData calls that send PaymentMethod and RequestId as the metric's two dimensions.",
      "Create a metric filter on the log group that extracts CheckoutLatency with RequestId as its dimension, and stop writing EMF log events."
    ], a: 0,
    no: [null,
      "Resolution doesn't change the count of metrics. Each request ID is still its own metric.",
      "The same dimensions create the same number of metrics, and the function now waits on API calls too.",
      "A request ID dimension still makes a new metric for each request, just through a different feature."],
    why: "Every unique combination of values in a dimension set becomes its own custom metric, so a request ID dimension creates one metric per request. Root members that no dimension set references stay in the log event, where Logs Insights can still search them.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html"] },

  { id: "dva-4-302", exam: "DVA", dva: "4.1", topic: "cloudwatch", type: "multi", hint: "Select TWO.",
    q: "A Java service runs as an ECS task on Fargate in awsvpc network mode. It records metrics with the CloudWatch embedded metric format client library, which sends EMF events to the endpoint named in AWS_EMF_AGENT_ENDPOINT. The team wants the metrics in CloudWatch without adding PutMetricData calls. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Add a CloudWatch agent sidecar container to the task, with an agent configuration whose logs section turns on emf collection.", ok: true },
      { t: "Set AWS_EMF_AGENT_ENDPOINT on the app container to tcp://127.0.0.1:25888, the port where the agent listens for EMF events.", ok: true },
      { t: "Run the X-Ray daemon as a sidecar, and point AWS_EMF_AGENT_ENDPOINT at its UDP port 2000 so that it relays the events.", ok: false, no: "The X-Ray daemon relays trace segments to X-Ray. It doesn't accept EMF events or publish metrics." },
      { t: "Turn on Container Insights for the cluster, so that it reads the library's EMF events and publishes them as custom metrics.", ok: false, no: "Container Insights collects the tasks' own performance data. It doesn't receive the app's EMF events." },
      { t: "Add cloudwatch:PutMetricData to the task execution role, which the library uses to publish each metric that it records.", ok: false, no: "The library sends events to the agent, which writes them to CloudWatch Logs. The task execution role is for pulling images and sending container logs." }
    ],
    why: "Outside Lambda, EMF events reach CloudWatch Logs through the CloudWatch agent or the PutLogEvents API, and CloudWatch extracts the metrics from the logs. In awsvpc mode the sidecar agent is reached over localhost on its EMF port, 25888 by default.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Generation_CloudWatch_Agent.html", "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Generation.html"] },

  { id: "dva-4-303", exam: "both", dva: "4.1", saa: "2.2", topic: "cloudwatch", type: "mc",
    q: "A company runs Java and Python services on Amazon ECS and EC2. Operations wants each service's call volume, latency, faults and errors by operation, a map of which services call which, and tracking of a 99.9% availability goal for the checkout operation with alerts when the error budget burns too fast. The team won't write custom metrics code or build dashboards by hand. Which solution meets these requirements?",
    opts: [
      "Enable CloudWatch Application Signals with the CloudWatch agent and auto-instrumentation, then create an SLO for the checkout operation.",
      "Turn on Container Insights for the ECS cluster and the CloudWatch agent on the instances, then alarm on each service's CPU and memory use.",
      "Create a CloudWatch Synthetics canary that calls the checkout endpoint every minute, and alarm when its success rate falls below 99.9%.",
      "Instrument every service with the X-Ray SDK, then build a CloudWatch dashboard from the X-Ray service map and the trace counts it shows."
    ], a: 0,
    no: [null,
      "These are infrastructure metrics. They give no per-operation latency or faults, no service map and no SLO tracking.",
      "A canary measures its own test calls to one endpoint, not real traffic to every service, and gives no service map.",
      "The X-Ray SDK is in maintenance mode, and a hand-built dashboard is the work the team wants to avoid."],
    why: "Application Signals collects standard application metrics and traces from instrumented services, discovers the application map, and lets you create SLOs with attainment, error budget and burn rate alarms, without custom code or dashboards.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Application-Monitoring-Sections.html", "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-ServiceLevelObjectives.html"] },

  { id: "dva-4-304", exam: "DVA", dva: "4.1", topic: "cloudwatch", type: "multi", hint: "Select TWO.",
    q: "A REST service writes one JSON log line per request to CloudWatch Logs, with fields such as clientId, path and status. A few partners' bad requests cause floods of server errors. The team wants a continuously updated graph of the 10 clients causing the most 5XX responses, and an alarm when any single client causes more than 500 of them in 5 minutes. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Create a Contributor Insights rule on the log group that filters on a status of 500 or higher and uses clientId as the contributor key.", ok: true },
      { t: "Create an alarm on the INSIGHT_RULE_METRIC math function for that rule, using its MaxContributorValue metric with a threshold of 500.", ok: true },
      { t: "Create a metric filter that matches a status of 500 or higher, and alarm when the filter's Sum is above 500 in a 5-minute period.", ok: false, no: "It counts errors from all clients together, so one noisy client can't be told apart from many." },
      { t: "Save a Logs Insights query that counts 5XX lines by clientId, and run it from the console whenever the error rate looks high.", ok: false, no: "A query run by hand gives no continuous ranking and can't raise an alarm on its own." },
      { t: "Turn on detailed CloudWatch metrics for the API stage, and alarm on the 5XXError metric for each of the API's methods.", ok: false, no: "Detailed metrics split errors by method and resource, not by client." }
    ],
    why: "Contributor Insights rules evaluate structured log events as they arrive and rank contributors by the keys you choose. INSIGHT_RULE_METRIC exposes the rule's data, such as MaxContributorValue, so it can be graphed and alarmed on.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContributorInsights.html", "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContributorInsights-GraphReportData.html"] },

  { id: "dva-4-305", exam: "DVA", dva: "4.1", topic: "cloudformation", type: "multi", hint: "Select TWO.",
    q: "A CloudFormation template launches an EC2 instance with a CreationPolicy, and the instance's user data runs cfn-init and then cfn-signal. Stack creation fails because CloudFormation never receives the success signal, and the rollback deletes the instance. The stack events say only that the signal wasn't received. Which actions will let the developer find out why the bootstrap failed? (Select TWO.)",
    items: [
      { t: "Create the stack again with rollback on failure turned off, then connect to the instance and read /var/log/cfn-init.log and /var/log/cloud-init.log.", ok: true },
      { t: "Have the bootstrap send /var/log/cfn-init.log and /var/log/cloud-init.log to CloudWatch Logs early on, so the logs survive the rollback.", ok: true },
      { t: "Raise the Timeout in the CreationPolicy to its maximum, so the bootstrap has much longer to finish before CloudFormation gives up on it.", ok: false, no: "If the script failed, more waiting only delays the same failure and still shows no cause." },
      { t: "Look up the instance's RunInstances event in CloudTrail, which records the output that the user data script printed while it ran.", ok: false, no: "CloudTrail records API calls such as the launch itself, not what scripts print on the instance." },
      { t: "Run validate-template on the template, which runs the cfn-init metadata in a test and reports the step that failed and why.", ok: false, no: "validate-template checks the template's syntax only. It runs nothing on an instance." }
    ],
    why: "Bootstrap errors go to the cfn-init and cloud-init logs on the instance, not to stack events. Turning off rollback keeps the instance so the logs can be read, and publishing the logs to CloudWatch keeps them even after the instance is deleted.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/troubleshooting.html"] },

  { id: "dva-4-306", exam: "DVA", dva: "4.1", topic: "eventbridge", type: "mc",
    q: "An order service calls PutEvents with EventBusName set to a custom bus named orders, and every response shows a FailedEntryCount of 0. A developer created a rule with put-rule, passing only a name and an event pattern that matches the events, and added a Lambda function as its target. The function never runs, and the rule's TriggeredRules metric has no data. What should the developer do?",
    opts: [
      "Create the rule again with put-rule and the --event-bus-name orders option, then add the Lambda function as the rule's target.",
      "Add a statement to the function's resource-based policy that allows events.amazonaws.com to invoke it for this rule.",
      "Attach an SQS dead-letter queue to the rule's target, so that any events EventBridge fails to deliver can be inspected there later.",
      "Add the orders bus's ARN to the resources field of the rule's event pattern, so that events from that bus will match it."
    ], a: 0,
    no: [null,
      "A missing permission shows up as failed invocations after the rule matches. This rule has never matched an event.",
      "A DLQ holds events that matched but couldn't be delivered. No event has matched this rule.",
      "The resources field matches the event's own resources list. A rule only sees events on the bus it belongs to."],
    why: "Each rule belongs to one event bus, and put-rule uses the default bus when no bus is named. Events sent to the orders bus are matched only against rules on that bus.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_PutRule.html", "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-troubleshooting.html"] },

  { id: "dva-4-307", exam: "DVA", dva: "4.1", topic: "apigateway", type: "mc",
    q: "A REST API uses a Lambda TOKEN authorizer that validates a JWT by calling the identity provider, and its authorization caching TTL is 0. Clients reuse each token for an hour, and the authorizer's policy covers all methods. CloudWatch shows the API's Latency averaging 900 ms while IntegrationLatency averages 120 ms, and the backend function's Duration is low. What should the developer do to cut latency?",
    opts: [
      "Turn on authorization caching for the authorizer with a TTL such as 300 seconds, keyed on the token in the Authorization header.",
      "Configure provisioned concurrency on the backend function's alias, so that its requests no longer wait for cold starts to finish.",
      "Turn on API caching for the stage, so that responses are served from the cache instead of calling the backend function each time.",
      "Raise the API's integration timeout and the backend function's memory, so that slow requests finish within the time allowed."
    ], a: 0,
    no: [null,
      "IntegrationLatency and Duration are already low. The time is spent before the integration is called.",
      "It saves at most the 120 ms backend call, so most of the delay stays.",
      "Nothing is timing out, and the backend function isn't the slow part."],
    why: "Latency is IntegrationLatency plus API Gateway's own overhead, and a Lambda authorizer runs in that overhead. With caching on, API Gateway reuses the authorizer's policy for the same token until the TTL ends; a TTL of 0 calls the authorizer on every request.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/configure-api-gateway-lambda-authorization.html"] },

  { id: "dva-4-308", exam: "DVA", dva: "4.1", topic: "cloudwatch", type: "mc",
    q: "A developer must report a Lambda function's 99th percentile duration for every 5-minute interval of the past day, using CloudWatch Logs Insights on the function's log group. The function logs in the default text format. Which query returns this?",
    opts: [
      "filter @type = \"REPORT\" | stats pct(@duration, 99) by bin(5m)",
      "filter @type = \"REPORT\" | stats max(@duration) by bin(5m)",
      "filter @type = \"REPORT\" | sort @duration desc | limit 99",
      "filter @type = \"START\" | stats pct(@duration, 99) by bin(5m)"
    ], a: 0,
    no: [null,
      "max returns the single slowest invocation in each interval, not the 99th percentile.",
      "This lists the 99 slowest invocations of the day, with no 5-minute intervals.",
      "START lines carry no duration. Lambda reports @duration on the REPORT line."],
    why: "Logs Insights discovers @type and @duration in Lambda's REPORT lines. pct(field, 99) returns the 99th percentile, and grouping by bin(5m) gives one value per 5-minute interval.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-Stats.html", "https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-examples.html"] },

  // Task 4.2: Instrument code for observability
  { id: "dva-4-309", exam: "DVA", dva: "4.2", topic: "observability", type: "multi", hint: "Select TWO.",
    q: "A company runs six microservices. Each has CloudWatch alarms on its error rate and latency and writes plain-text logs to its own log group. When checkout slows, the alarms fire, but engineers spend hours lining up timestamps across six log groups to learn which call made a given request slow. Which changes will let them explain a slow request instead of only detecting it? (Select TWO.)",
    items: [
      { t: "Instrument the services with OpenTelemetry through ADOT, and propagate the trace context on every call so one trace follows a request across services.", ok: true },
      { t: "Write structured JSON logs that include the current request's trace ID, so each request's log lines can be found from its trace.", ok: true },
      { t: "Add more alarms with tighter thresholds on each service's latency and errors, so that every slowdown is detected sooner.", ok: false, no: "Alarms on known metrics are monitoring. They say that something is slow, not where a request spent its time." },
      { t: "Raise the retention of all six log groups to ten years, so that engineers have more history to compare during incidents.", ok: false, no: "Keeping more data doesn't connect one request's events across services." },
      { t: "Build a CloudWatch dashboard that shows all six services' latency and error metrics side by side on a single page.", ok: false, no: "Aggregated metrics on one page still don't show the path or timing of a single request." }
    ],
    why: "Monitoring watches known signals and alerts on them. Observability lets the telemetry answer new questions about the system: metrics, logs and traces are its pillars, and propagated trace context plus trace IDs in logs tie them together for each request.",
    doc: ["https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_observability_application_telemetry.html", "https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_observability_dist_trace.html"] },

  { id: "dva-4-310", exam: "DVA", dva: "4.2", topic: "observability", type: "mc",
    q: "A developer gets two requirements for an order service on Lambda. First, keep a detailed record of how each order was processed, for one year, for audits and later debugging. Second, notify the on-call team within minutes when more than 2% of orders fail. Which approach meets both requirements?",
    opts: [
      "Write a structured log event for each order to CloudWatch Logs with one-year retention, and publish a failure-rate metric with a CloudWatch alarm on it.",
      "Turn on active tracing and keep each order's X-Ray trace as its record, and create an X-Ray sampling rule that notifies the team when orders fail.",
      "Create a CloudTrail trail that records each order the function handles, and have it send an email each time it delivers a new log file.",
      "Write a log event for each order to CloudWatch Logs with one-year retention, and run a Logs Insights failure-rate query every morning."
    ], a: 0,
    no: [null,
      "X-Ray keeps trace data for 30 days, and sampling rules only choose which requests to trace. They don't send notifications.",
      "CloudTrail records AWS API calls, not the app's own orders, and its notices say nothing about failure rates.",
      "The logs meet the record requirement, but a daily query can't notify anyone within minutes."],
    why: "Logs are the detailed record of individual events. Monitoring turns measurements into metrics and alarms that act on known conditions. The service needs both: logs for the audit record, and a metric with an alarm for the 2% threshold.",
    doc: ["https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_observability_application_telemetry.html", "https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html"] },

  { id: "dva-4-311", exam: "DVA", dva: "4.2", topic: "lambda", type: "mc",
    q: "A Python Lambda function writes its logs with print(json.dumps({\"level\": \"ERROR\", \"msg\": ...})). The function uses the JSON log format, and its application log level was just set to WARN to drop INFO and DEBUG lines. Since then, the ERROR lines are missing from CloudWatch Logs too. The INFO and DEBUG filtering must stay. What should the developer do?",
    opts: [
      "Add a timestamp key to each JSON log object with the current time in RFC 3339 format, and keep the level key in each object.",
      "Set the function's system log level to DEBUG, so that the platform sends every log line whatever its level key says.",
      "Change the function's log format to Text, so that Lambda writes each JSON object to the log group exactly as it was printed.",
      "Write the error lines to stderr instead of stdout, so that Lambda records them as errors and lets them all past the level filter."
    ], a: 0,
    no: [null,
      "The system log level filters Lambda's own platform lines, not the function's output.",
      "Log-level filtering works only with the JSON format, so the INFO and DEBUG lines would come back too.",
      "Lambda reads the level key of JSON output from stdout and stderr alike."],
    why: "For JSON output that doesn't come from a supported logging method, Lambda reads each object's level key. If the object has no valid RFC 3339 timestamp, Lambda assigns it the level INFO, so a WARN filter drops it.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-log-level.html", "https://docs.aws.amazon.com/lambda/latest/dg/python-logging.html"] },

  { id: "dva-4-312", exam: "DVA", dva: "4.2", topic: "cloudformation", type: "mc",
    q: "A team updates several CloudFormation stacks many times a day. Developers want one email when each stack update finishes, saying whether it completed or rolled back, and no email for each resource that changes. They don't want to write code. What should the developer do?",
    opts: [
      "Create an EventBridge rule for Stack Status Change events with status UPDATE_COMPLETE or UPDATE_ROLLBACK_COMPLETE, targeting an SNS topic.",
      "Set an SNS topic in each stack's notification options, and subscribe the developers' email addresses to that topic so they hear of updates.",
      "Create an EventBridge rule for the UpdateStack API calls that CloudTrail records for CloudFormation, with an SNS topic as its target.",
      "Add a rollback trigger with a CloudWatch alarm to each stack, so that CloudFormation notifies the team whenever an update ends."
    ], a: 0,
    no: [null,
      "Stack notifications send a message for each stack event, including every resource's status changes.",
      "UpdateStack is called when the update starts, so the email would arrive before the result is known.",
      "Rollback triggers roll back an update when an alarm fires during it. They don't report results."],
    why: "CloudFormation sends a CloudFormation Stack Status Change event to the default event bus each time a stack's status changes. A rule that matches only the final statuses sends one message per update.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/eventbridge-integration.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/event-detail-stack-status-change.html"] },

  { id: "dva-4-313", exam: "DVA", dva: "4.2", topic: "ecs", type: "multi", hint: "Select TWO.",
    q: "An ECS service on Fargate runs a queue worker with no load balancer. Sometimes the worker's process keeps running but stops processing, and ECS never replaces the task. The image's Dockerfile has a HEALTHCHECK instruction, and the worker serves a local /health endpoint. The worker takes about 90 seconds to start. Which changes will let ECS replace stuck tasks? (Select TWO.)",
    items: [
      { t: "Add a healthCheck to the container definition in the task definition, with a CMD-SHELL command that calls /health on localhost.", ok: true },
      { t: "Set the health check's startPeriod to about 120 seconds, so failures during the worker's startup don't count against its retries.", ok: true },
      { t: "Rely on the image's HEALTHCHECK instruction, and mark the worker container as essential so that ECS acts on its result.", ok: false, no: "ECS doesn't monitor health checks embedded in an image unless they are defined in the container definition." },
      { t: "Raise the container's stopTimeout to 120 seconds, so that ECS waits longer before it treats a stuck worker as unhealthy.", ok: false, no: "stopTimeout is the wait between the stop signal and a forced kill. It has nothing to do with health." },
      { t: "Put the worker behind a target group and set a health check grace period, since only load balancer checks can stop tasks.", ok: false, no: "Container health checks work without a load balancer, and an unhealthy essential container makes the task unhealthy." }
    ],
    why: "ECS runs only health checks defined in the container definition. An UNHEALTHY essential container makes the task UNHEALTHY, so the service replaces it, and startPeriod gives a slow-starting container time before failures count.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/healthcheck.html", "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html"] },

  { id: "dva-4-314", exam: "DVA", dva: "4.2", topic: "route53", type: "mc",
    q: "An internal API runs on two EC2 instances in different subnets, with private IP addresses only. Clients resolve its name through Route 53 failover records in a private hosted zone. The developer creates an HTTP health check on the primary instance's private IP address, but it always reports unhealthy, though the API works. Which solution will make failover work?",
    opts: [
      "Publish a CloudWatch metric for the API's health with an alarm on it, and attach a health check that monitors the alarm to the primary record.",
      "Allow the Route 53 health checker IP address ranges in the primary instance's security group, and keep checking the instance's private IP address.",
      "Create a calculated health check that monitors the endpoint health check, and attach the calculated health check to the primary record.",
      "Turn on Evaluate target health on the primary failover record, so that Route 53 checks the instance from inside the VPC instead."
    ], a: 0,
    no: [null,
      "Route 53 health checkers are outside the VPC and can't reach a private IP address in it.",
      "A calculated check only combines other checks' results, and the check it watches still can't reach the instance.",
      "Evaluate target health is a setting of alias records for resources such as load balancers, not a check of an instance's IP."],
    why: "Route 53 health checkers run outside the VPC. For instances with only private IPs, create a CloudWatch alarm on a health metric and a health check based on the alarm's data stream, which Route 53 can evaluate without reaching the instance.",
    doc: ["https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-private-hosted-zones.html", "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-types.html"] },

  { id: "dva-4-315", exam: "DVA", dva: "4.2", topic: "xray", type: "mc",
    q: "A team moved a service from the X-Ray SDK to OpenTelemetry with AWS Distro for OpenTelemetry, exporting traces to X-Ray. The code sets a span attribute named customer_tier on each request. In the X-Ray console, a filter expression on annotation.customer_tier returns no traces, although the value appears in each segment's metadata. What should the developer do?",
    opts: [
      "Add customer_tier to the aws.xray.annotations attribute list, so that X-Ray converts this attribute to an indexed annotation.",
      "Record customer_tier as OpenTelemetry baggage instead of a span attribute, so that X-Ray indexes it along with each trace.",
      "Create an X-Ray sampling rule that matches customer_tier, so that the traces that carry it are kept and indexed for filter searches.",
      "Create an X-Ray group whose filter expression is metadata.customer_tier, and search the group's traces for each tier."
    ], a: 0,
    no: [null,
      "Baggage carries values between services. It doesn't turn them into X-Ray annotations.",
      "Sampling rules decide which requests are traced. They don't index attributes.",
      "Metadata isn't indexed, so filter expressions and groups can't search it."],
    why: "When OpenTelemetry spans are sent to X-Ray, span attributes become metadata by default, and metadata isn't indexed. Attributes whose keys are listed in aws.xray.annotations become annotations, which filter expressions can search.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-migration.html", "https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html"] },

  { id: "dva-4-316", exam: "both", dva: "4.2", saa: "2.2", topic: "xray", type: "multi", hint: "Select TWO.",
    q: "An app on EC2 instances is traced with the X-Ray SDK and the X-Ray daemon, and the CloudWatch agent already sends the instances' metrics and logs. The team must move off tools that AWS has put in maintenance mode, keep sending traces to X-Ray, and run as few agents on each instance as possible. Which steps should the team take? (Select TWO.)",
    items: [
      { t: "Replace the X-Ray SDK instrumentation in the app with OpenTelemetry instrumentation from AWS Distro for OpenTelemetry.", ok: true },
      { t: "Stop the X-Ray daemon, and add a traces section to the CloudWatch agent's configuration so the agent sends traces to X-Ray.", ok: true },
      { t: "Upgrade the X-Ray daemon to its latest release, and keep it running on each instance next to the CloudWatch agent.", ok: false, no: "The daemon is in maintenance mode, and this keeps two agents on each instance." },
      { t: "Install the ADOT Collector next to the X-Ray daemon and the CloudWatch agent, and send every trace through the collector.", ok: false, no: "It keeps the daemon and adds a third agent, where the CloudWatch agent can already receive traces." },
      { t: "Turn on detailed monitoring for the instances, so that EC2 sends a trace of each request to X-Ray every minute.", ok: false, no: "Detailed monitoring sends instance metrics every minute. EC2 doesn't trace application requests." }
    ],
    why: "The X-Ray SDKs and daemon entered maintenance mode in February 2026, and AWS recommends OpenTelemetry. CloudWatch agent 1.300025.0 and later can receive OpenTelemetry and X-Ray traces and send them to X-Ray, so one agent covers metrics, logs and traces.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-migration.html", "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html"] },

  // Task 4.3: Optimize applications
  { id: "dva-4-317", exam: "DVA", dva: "4.3", topic: "sns", type: "mc",
    q: "Order events are published to an SNS topic with the message attributes region (String), priority (String) and amount (Number). A fraud team's SQS subscription must receive only the events where region is eu and either priority is high or amount is greater than 1000. Which subscription filter policy meets this requirement?",
    opts: [
      "{\"region\": [\"eu\"], \"$or\": [{\"priority\": [\"high\"]}, {\"amount\": [{\"numeric\": [\">\", 1000]}]}]}",
      "{\"region\": [\"eu\"], \"priority\": [\"high\"], \"amount\": [{\"numeric\": [\">\", 1000]}]}",
      "{\"region\": [\"eu\"], \"priority\": [\"high\", {\"numeric\": [\">\", 1000]}]}",
      "{\"$or\": [{\"region\": [\"eu\"]}, {\"priority\": [\"high\"]}, {\"amount\": [{\"numeric\": [\">\", 1000]}]}]}"
    ], a: 0,
    no: [null,
      "Separate keys are joined with AND, so an event would need both high priority and an amount over 1000.",
      "Values in one array are ORed for that one attribute, so the numeric test is applied to priority, not to amount.",
      "This matches any one of the three conditions, so high-priority events from every region get through."],
    why: "Keys in a filter policy are ANDed, the values in one key's array are ORed, and the $or operator ORs whole groups of keys. Region AND (priority OR amount) needs region at the top level and the other two inside $or.",
    doc: ["https://docs.aws.amazon.com/sns/latest/dg/and-or-logic.html", "https://docs.aws.amazon.com/sns/latest/dg/numeric-value-matching.html"] },

  { id: "dva-4-318", exam: "DVA", dva: "4.3", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A REST API has caching turned on for its prod stage with the default settings. GET /products?category=shoes&page=2 sometimes returns the first page of a different category. GET /stock/live must always reach the backend, while every other GET method should stay cached. Which changes meet these requirements? (Select TWO.)",
    items: [
      { t: "Add the category and page query string parameters as cache key parameters on the GET /products method.", ok: true },
      { t: "Add a method override for GET /stock/live in the stage settings that turns caching off for that method only.", ok: true },
      { t: "Set the stage's cache TTL to 0 seconds, so that no response is ever served from a stale cache entry.", ok: false, no: "A TTL of 0 turns caching off for the whole stage, not only for /stock/live." },
      { t: "Turn on encryption of cache data for GET /products, so that each category's responses are stored apart.", ok: false, no: "Encryption protects cached data. It doesn't change the cache key." },
      { t: "Have clients send Cache-Control: max-age=0 on GET /stock/live, so that those requests skip the stage cache.", ok: false, no: "It relies on every client, and the stage's invalidation settings may ignore or reject the header. A method override fixes it on the server." }
    ],
    why: "API Gateway caches GET responses by a cache key built only from the parameters marked as cache keys, so unlisted query strings share one entry. A method override can turn caching off, or change the TTL, for a single method.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html"] },

  { id: "dva-4-319", exam: "both", dva: "4.3", saa: "4.4", topic: "cloudfront", type: "mc",
    q: "A CloudFront distribution serves a site from one cache behavior whose cache policy has a minimum TTL of 3600 seconds, a default TTL of 86400 and a maximum TTL of one year. The origin now sends Cache-Control: max-age=60 on /api/prices/* responses, yet viewers see prices up to an hour old. All other content must keep its current caching. What should the developer do?",
    opts: [
      "Add a cache behavior for /api/prices/* with a cache policy whose minimum TTL is 0, so CloudFront honors the origin's max-age of 60.",
      "Lower the maximum TTL in the existing cache policy to 60 seconds, so that no object stays in any of the edge caches for longer than a minute.",
      "Have browsers send Cache-Control: no-cache with each price request, so that CloudFront fetches a fresh copy from the origin.",
      "Have the origin also send an Expires header one minute ahead on price responses, so that CloudFront expires them sooner."
    ], a: 0,
    no: [null,
      "That caps every object at 60 seconds and changes caching for all the other content.",
      "CloudFront ignores Cache-Control and Pragma headers in viewer requests.",
      "CloudFront uses max-age when both are present, and the minimum TTL of 3600 still applies."],
    why: "When an object's max-age is below the minimum TTL, CloudFront caches it for the minimum TTL. A separate behavior for the price path with a minimum TTL of 0 lets the 60-second max-age apply there and leaves the rest unchanged.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html"] },

  { id: "dva-4-320", exam: "DVA", dva: "4.3", topic: "lambda", type: "mc",
    q: "A Lambda function processes messages from an SQS queue and calls a partner's API for currency exchange rates on every invocation. The partner has started rate-limiting these calls. Rates change every 10 minutes, and values up to 5 minutes old are acceptable. The team wants a fix that adds no infrastructure or cost. What should the developer do?",
    opts: [
      "Keep the rates in a variable declared outside the handler, with the time they were fetched, and fetch again only when older than 5 minutes.",
      "Store the rates in an ElastiCache cluster with a 5-minute TTL, and read them from the cluster before calling the partner's API.",
      "Configure provisioned concurrency for the function, so that its execution environments stay initialized between invocations.",
      "Turn on API Gateway caching with a 5-minute TTL for the partner's API, so repeated calls are answered from the cache instead."
    ], a: 0,
    no: [null,
      "It works, but it adds a cluster to run and pay for, which the team ruled out.",
      "Warm environments still call the partner on every invocation unless the code caches the rates.",
      "API Gateway caches responses of APIs that run in API Gateway. It can't cache a partner's API that the function calls directly."],
    why: "Code outside the handler runs once per execution environment, and its variables persist across the invocations that environment handles. A cached value with its fetch time cuts calls to the partner while keeping staleness under 5 minutes.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html"] },

  { id: "dva-4-321", exam: "DVA", dva: "4.3", topic: "elb", type: "mc",
    q: "Users report that some pages of a web app behind an Application Load Balancer are slow. The team queries the load balancer's access logs with Athena. For slow /search requests, request_processing_time and response_processing_time are about 0.001 seconds, and target_processing_time is about 4 seconds. Which conclusion and next step are correct?",
    opts: [
      "The time is spent in the targets handling /search, so the developer should profile and optimize the search code or the services it calls.",
      "The load balancer is queuing /search requests, so the developer should move the app behind a Network Load Balancer for lower latency.",
      "Responses are slow to reach clients over the internet, so the developer should put a CloudFront distribution in front of the load balancer.",
      "The load balancer's idle timeout is too short for /search, so the developer should raise it so that connections stay open for longer."
    ], a: 0,
    no: [null,
      "request_processing_time is near zero, so requests reach the targets without waiting at the load balancer.",
      "target_processing_time ends when the target starts sending response headers, so the 4 seconds pass before any response leaves.",
      "Nothing is timing out. The requests complete, just slowly."],
    why: "target_processing_time runs from when the load balancer sends a request to a target until the target starts sending response headers. When it holds nearly all the time, the target's own processing is the bottleneck.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html"] },

  { id: "dva-4-322", exam: "DVA", dva: "4.3", topic: "observability", type: "mc",
    q: "A Python Lambda function instrumented with OpenTelemetry through the ADOT Lambda layer takes about 2.5 seconds per request. Its trace shows the function's span and a span for the final S3 PutObject call, which takes 80 ms. The handler also parses the input, runs a scoring step and builds a report, and the team must find which of these uses the time. What should the developer do?",
    opts: [
      "Wrap the parsing, scoring and report steps in custom spans with the OpenTelemetry tracer, and compare their durations in the trace.",
      "Turn on Lambda Insights for the function, and compare the CPU, memory and network use that it reports for each invocation.",
      "Run a Logs Insights query on the function's REPORT lines, and sort the invocations by their @duration and @billedDuration.",
      "Double the function's memory, and compare the new duration with the old to see which of the steps benefits from more CPU."
    ], a: 0,
    no: [null,
      "Lambda Insights reports resource use per invocation, not how long each step in the code takes.",
      "REPORT lines give each invocation's total time, not the time of each step.",
      "That speeds up or slows down the whole function at once, so it can't show which step is slow."],
    why: "Automatic instrumentation creates spans for the invocation and for library calls such as AWS SDK requests, but not for your own code. Custom spans around sections of the handler show each section's duration in the trace.",
    doc: ["https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-migration.html", "https://docs.aws.amazon.com/lambda/latest/dg/python-tracing.html"] },

  { id: "dva-4-323", exam: "both", dva: "4.3", saa: "4.2", topic: "ecs", type: "mc",
    q: "An ECS service on Fargate (Linux) uses a task size of 2 vCPU and 8 GB. Container Insights shows that over the past month each task peaked at 20% CPU (0.4 vCPU) and 1.4 GB of memory. The team wants to cut cost but keep at least 30% headroom over both peaks. Which task size should the developer choose?",
    opts: [
      "1 vCPU and 2 GB of memory, which keeps both the CPU peak and the memory peak at or under 70% of the task's size.",
      "0.5 vCPU and 2 GB of memory, which costs less and still keeps the memory peak well under the task's memory limit.",
      "1 vCPU and 1 GB of memory, which matches the CPU that is needed and keeps the memory setting as small as possible.",
      "2 vCPU and 4 GB of memory, which keeps the current CPU and halves the memory to cut the cost of running each task."
    ], a: 0,
    no: [null,
      "The CPU peak of 0.4 vCPU would use 80% of 0.5 vCPU, leaving only 20% headroom.",
      "1 GB is below the 1.4 GB peak, and a 1 vCPU Fargate task needs at least 2 GB.",
      "It keeps the headroom but costs more than 1 vCPU with 2 GB, which also keeps it."],
    why: "Container Insights reports each task's actual CPU and memory use, and Fargate accepts only certain CPU and memory pairs. 1 vCPU with 2 GB is a valid pair that keeps both peaks at or below 70%.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/ContainerInsights.html", "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_definition_parameters.html"] },

  { id: "dva-4-324", exam: "DVA", dva: "4.3", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Lambda function's live alias has 50 units of provisioned concurrency. Traffic rises and falls through the day with no fixed pattern. At peaks, ProvisionedConcurrencySpilloverInvocations climbs and users see cold starts, while at quiet times ProvisionedConcurrencyUtilization stays low. The team wants provisioned concurrency to follow demand automatically. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Register the live alias as an Application Auto Scaling scalable target with the lambda:function:ProvisionedConcurrency dimension.", ok: true },
      { t: "Attach a target tracking policy to the target that keeps LambdaProvisionedConcurrencyUtilization near a value such as 0.7.", ok: true },
      { t: "Add scheduled scaling actions that raise provisioned concurrency each morning and lower it again each evening.", ok: false, no: "Schedules suit predictable patterns. This traffic has none, so unplanned peaks would still spill over." },
      { t: "Raise the function's reserved concurrency, so that more execution environments are kept initialized for the peaks.", ok: false, no: "Reserved concurrency sets a cap and a guarantee, but it doesn't initialize environments in advance." },
      { t: "Register $LATEST as the scalable target instead of the alias, so that every newly published version is covered.", ok: false, no: "Provisioned concurrency can't be used with $LATEST." }
    ],
    why: "Spillover counts invocations that ran on standard concurrency because all provisioned concurrency was busy. Application Auto Scaling target tracking adds and removes provisioned concurrency on the alias to keep utilization near the target.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html", "https://docs.aws.amazon.com/lambda/latest/dg/monitoring-concurrency.html"] },

  { id: "dva-4-325", exam: "DVA", dva: "4.3", topic: "dynamodb", type: "mc",
    q: "An app runs six kinds of Query against a DynamoDB table and its two global secondary indexes, and the consumed read capacity is far higher than expected. The developer must find which of the app's query types uses the most capacity, and how much of that is spent on the table and on each index. What should the developer do?",
    opts: [
      "Set ReturnConsumedCapacity to INDEXES on each Query, and log the returned ConsumedCapacity together with the name of the query type.",
      "Set ReturnConsumedCapacity to TOTAL on each Query, and log the returned ConsumedCapacity together with the name of the query type.",
      "Turn on CloudWatch Contributor Insights for the table and both of its indexes, and read the graphs of the most accessed partition keys.",
      "Graph ConsumedReadCapacityUnits for the table and for each index, using the metric's GlobalSecondaryIndexName dimension."
    ], a: 0,
    no: [null,
      "TOTAL returns only the operation's overall figure, without the split by table and index.",
      "Contributor Insights ranks partition and sort keys, not the app's query types.",
      "That splits capacity by index, but not by which part of the app sent the queries."],
    why: "With ReturnConsumedCapacity set to INDEXES, each response includes the capacity the operation used in total and on each table and index it touched. Logging it with the query type shows where the capacity goes.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html"] }
);
