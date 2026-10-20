// Question bank batch: DVA task 1.1 (develop code for applications hosted on AWS): architectural patterns, fault-tolerant
// code, API Gateway transformations and API types, SQS, SNS, EventBridge, Step Functions, Kinesis and Firehose, SDK and CLI
// usage, AppSync. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // SQS
  { id: "dva-1-101", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc",
    q: "A worker on EC2 receives messages from an SQS standard queue that uses the default settings. Each message takes about 2 minutes to process, and the worker deletes it when it finishes. The team finds that many messages are processed two or three times by different workers. Processing time is steady. What should the developer do?",
    opts: [
      "Set the queue's visibility timeout to longer than the 2 minutes a worker needs to process and delete a message.",
      "Set the queue's receive message wait time to 20 seconds, so that workers use long polling instead of short polling.",
      "Set a delivery delay of 2 minutes on the queue, so that each message stays hidden until a worker is ready for it.",
      "Set the queue's message retention period to 2 minutes, so a message is removed once its processing time has passed."
    ], a: 0,
    no: [null,
      "Long polling cuts empty receives. It doesn't stop a message from reappearing while a worker is still busy with it.",
      "A delivery delay hides a message before its first receive. After a worker receives it, the visibility timeout still applies.",
      "Retention deletes messages whether or not they were processed, so messages would be lost."],
    why: "The visibility timeout, 30 seconds by default, hides a message after it is received. If the worker hasn't deleted it when the timeout ends, the message becomes visible and another worker gets it.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html"] },

  { id: "dva-1-102", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc",
    q: "Workers process video jobs from an SQS queue. Most jobs finish in under a minute, but a few take up to 40 minutes, and nobody can tell in advance which. The team doesn't want a crashed worker's job to stay hidden for 40 minutes before another worker retries it. What should the developer do?",
    opts: [
      "Keep a short visibility timeout, and have the worker call ChangeMessageVisibility every few minutes while the job runs.",
      "Set the queue's visibility timeout to 12 hours, so that even the longest job is finished well before its message can reappear.",
      "Send each job with a 15-minute message timer, so that workers get extra time before the visibility timeout begins to count.",
      "Set the queue's visibility timeout to 0, so that every job is visible to all workers at once and the fastest worker wins it."
    ], a: 0,
    no: [null,
      "Every job then works, but a crashed worker's job stays hidden for 12 hours before anyone retries it.",
      "A message timer only delays the first delivery. It doesn't extend the time a worker has after receiving the job.",
      "Every worker would receive and process the same job, which multiplies the work instead of sharing it."],
    why: "ChangeMessageVisibility extends the timeout for one received message, using its receipt handle. A worker that keeps extending it acts as a heartbeat, and a crashed worker's job reappears soon after the last extension.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ChangeMessageVisibility.html", "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html"] },

  { id: "dva-1-103", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc",
    q: "An app sends order messages to an SQS FIFO queue. A downstream system needs 60 seconds after each order is sent before it can be processed. The developer passes DelaySeconds=60 on each SendMessage call, and the call fails. Every order needs the same delay. What should the developer do?",
    opts: [
      "Remove DelaySeconds from the calls, and set the queue's own delivery delay attribute to 60 seconds instead.",
      "Set the queue's visibility timeout to 60 seconds, so each new order is hidden for a minute after it is sent.",
      "Keep DelaySeconds on each call, and add a MessageGroupId that is unique to each order so the timers apply.",
      "Set the queue's receive message wait time to 60 seconds, so that consumers wait a minute before receiving."
    ], a: 0,
    no: [null,
      "The visibility timeout starts when a message is received, not when it is sent.",
      "FIFO queues don't support timers on individual messages, whatever the group ID.",
      "Long polling waits at most 20 seconds, and it returns messages as soon as they are available."],
    why: "FIFO queues don't support per-message timers, but a delay queue setting on the queue hides every new message for up to 15 minutes after it is sent.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html", "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-timers.html"] },

  { id: "dva-1-104", exam: "DVA", dva: "1.1", topic: "sqs", type: "multi", hint: "Select TWO.",
    q: "A consumer reads an SQS FIFO queue. One malformed message fails every time it is processed, and the messages behind it in the same message group are stuck. The team wants such a message set aside after 5 failed attempts so it can be examined later. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Create a second FIFO queue in the same account and Region to act as the dead-letter queue.", ok: true },
      { t: "Set a redrive policy on the source queue with the new queue's ARN and a maxReceiveCount of 5.", ok: true },
      { t: "Create a standard queue as the dead-letter queue, so that malformed messages lose their ordering.", ok: false, no: "A dead-letter queue must be the same type as its source queue, so a FIFO queue needs a FIFO dead-letter queue." },
      { t: "Set a redrive policy on the new queue that names the source queue and a maxReceiveCount of 5.", ok: false, no: "The redrive policy with maxReceiveCount belongs on the source queue. The dead-letter queue only has an optional redrive allow policy." },
      { t: "Set the source queue's retention period to 5 minutes, so that stuck messages expire on their own.", ok: false, no: "Expired messages are deleted, not kept for examination, and healthy messages would expire too." }
    ],
    why: "A redrive policy on the source queue moves a message to the dead-letter queue after it has been received maxReceiveCount times without being deleted. The dead-letter queue must match the source queue's type, account and Region.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html", "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue.html"] },

  { id: "dva-1-105", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc",
    q: "A bug in a consumer sent 3,000 messages from an SQS standard queue to its dead-letter queue. The bug is now fixed and deployed. The team wants those messages processed by the normal consumer, with the least custom code. What should the developer do?",
    opts: [
      "Start a dead-letter queue redrive, in the console or with StartMessageMoveTask, back to the source queue.",
      "Point the consumer at the dead-letter queue as well, and have it read both queues until the dead-letter queue is empty.",
      "Write a script that receives each message from the dead-letter queue, sends it to the source queue, then deletes it.",
      "Remove the redrive policy from the source queue, so that the messages in the dead-letter queue return to it on their own."
    ], a: 0,
    no: [null,
      "It works, but it means changing and redeploying the consumer, and then changing it back.",
      "It works, but it is custom code for something SQS does for you.",
      "Removing the policy only stops future moves. Messages already in the dead-letter queue stay there."],
    why: "Dead-letter queue redrive moves messages from a dead-letter queue back to their source queue, or to another queue of the same type, and the StartMessageMoveTask API does the same from code.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-configure-dead-letter-queue-redrive.html"] },

  { id: "dva-1-106", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc",
    q: "A consumer receives a message from SQS, processes it, and then calls DeleteMessage with the message's MessageId. The call fails, and the message is processed again after the visibility timeout. What should the developer change?",
    opts: [
      "Pass the ReceiptHandle from the most recent receive of the message to DeleteMessage instead of the MessageId.",
      "Call PurgeQueue after each message is processed, so the message is removed from the queue along with any copies.",
      "Call ChangeMessageVisibility with a timeout of 0 after processing, so that SQS knows the message is finished.",
      "Pass the MessageDeduplicationId to DeleteMessage, since that is the identifier SQS uses to recognize a message."
    ], a: 0,
    no: [null,
      "PurgeQueue deletes every message in the queue, including ones no consumer has processed yet.",
      "A visibility timeout of 0 makes the message visible again at once, so it is processed again even sooner.",
      "Deduplication IDs only exist on FIFO queues and are used when sending. DeleteMessage takes a receipt handle."],
    why: "Deleting or changing the visibility of a message needs the receipt handle from receiving it, not the message ID. Each receive returns a new handle, and the latest one must be used.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-queue-message-identifiers.html"] },

  // SNS
  { id: "dva-1-107", exam: "DVA", dva: "1.1", topic: "sns", type: "multi", hint: "Select TWO.",
    q: "A developer subscribes an SQS queue to an SNS topic in the same account using the API. The queue uses SSE-KMS with a customer managed key. Messages published to the topic never arrive in the queue. Which changes are needed? (Select TWO.)",
    items: [
      { t: "Add a queue policy that allows sns.amazonaws.com to call sqs:SendMessage, with aws:SourceArn set to the topic.", ok: true },
      { t: "Add a statement to the KMS key policy that allows sns.amazonaws.com to use kms:GenerateDataKey* and kms:Decrypt.", ok: true },
      { t: "Turn on raw message delivery for the subscription, so the messages are small enough for the encrypted queue.", ok: false, no: "Raw delivery only strips the SNS JSON envelope. It changes nothing about permissions." },
      { t: "Add sqs:ReceiveMessage on the queue to the role of the app that publishes to the topic, then publish again.", ok: false, no: "SNS delivers to the queue with its own service principal, so the publisher's permissions to read the queue don't matter." },
      { t: "Change the queue to a FIFO queue, since only FIFO queues can be subscribed to an SNS topic with encryption.", ok: false, no: "Standard queues can subscribe to standard topics whether or not the queue is encrypted. The missing piece is permission." }
    ],
    why: "SNS needs the queue's resource policy to allow it to send messages. When the queue is encrypted, SNS also needs the customer managed key's policy to allow GenerateDataKey and Decrypt.",
    doc: ["https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html", "https://docs.aws.amazon.com/sns/latest/dg/sns-enable-encryption-for-topic-sqs-queue-subscriptions.html"] },

  { id: "dva-1-108", exam: "DVA", dva: "1.1", topic: "sns", type: "mc",
    q: "An SQS queue is subscribed to an SNS topic. The consumer was written to parse each message body as the order JSON that the publisher sent, but it fails because each body is a JSON document with fields such as Type, MessageId, TopicArn and Message. What is the simplest fix?",
    opts: [
      "Turn on raw message delivery for the subscription by setting its RawMessageDelivery attribute to true.",
      "Add a subscription filter policy that keeps only the Message field of each notification sent to the queue.",
      "Publish to the topic with a MessageStructure of json, so the same order JSON is sent to every protocol.",
      "Have the publisher send its orders straight to the queue as well, and ignore the copies that come from SNS."
    ], a: 0,
    no: [null,
      "Filter policies decide whether a subscription gets a message. They don't reshape the message.",
      "MessageStructure json lets you send different text per protocol. SQS subscribers still get the SNS envelope.",
      "That doubles every message and couples the publisher to the queue, defeating the topic."],
    why: "With raw message delivery on, SNS strips its metadata and sends the published message to the SQS queue as it is.",
    doc: ["https://docs.aws.amazon.com/sns/latest/dg/sns-large-payload-raw-message-delivery.html"] },

  { id: "dva-1-109", exam: "both", dva: "1.1", saa: "2.1", topic: "sns", type: "mc",
    q: "A pricing service publishes price changes for thousands of products. Three separate services must each receive every change, and each must apply the changes for any one product in exactly the order they were published, with no duplicates. Changes for different products can be handled in parallel. Which design meets these requirements?",
    opts: [
      "Publish to an SNS FIFO topic with the product ID as the message group ID, and subscribe one SQS FIFO queue per service.",
      "Publish to an SNS FIFO topic with the product ID as the message group ID, and subscribe one SQS standard queue per service.",
      "Publish to an SNS standard topic with the product ID as a message attribute, and subscribe one SQS FIFO queue per service.",
      "Send to one SQS FIFO queue with the product ID as the message group ID, and have all three services poll that queue."
    ], a: 0,
    no: [null,
      "Standard queues don't keep the order or exactly-once delivery that the FIFO topic provides, and message groups aren't passed to them.",
      "A standard topic doesn't guarantee the order of delivery or rule out duplicates, so FIFO queues behind it can't restore them.",
      "Each message goes to only one consumer, so the three services would split the changes instead of each getting all of them."],
    why: "An SNS FIFO topic delivers each message once, in order within its message group, to every subscribed SQS FIFO queue, and different groups are delivered in parallel.",
    doc: ["https://docs.aws.amazon.com/sns/latest/dg/fifo-message-grouping.html", "https://docs.aws.amazon.com/sns/latest/dg/fifo-topic-message-ordering.html"] },

  // EventBridge
  { id: "dva-1-110", exam: "DVA", dva: "1.1", topic: "eventbridge", type: "mc",
    q: "An order service sends events to EventBridge with source \"com.shop.orders\", detail-type \"OrderPlaced\", and a numeric field detail.total. A rule must send only orders with a total of 1,000 or more to a review queue. Which event pattern should the developer use?",
    opts: [
      "{\"source\": [\"com.shop.orders\"], \"detail-type\": [\"OrderPlaced\"], \"detail\": {\"total\": [{\"numeric\": [\">=\", 1000]}]}}",
      "{\"source\": [\"com.shop.orders\"], \"detail-type\": [\"OrderPlaced\"], \"detail\": {\"total\": [\">= 1000\"]}}",
      "{\"source\": [\"com.shop.orders\"], \"detail-type\": [\"OrderPlaced\"], \"total\": [{\"numeric\": [\">=\", 1000]}]}",
      "{\"source\": [\"com.shop.orders\"], \"detail-type\": [\"OrderPlaced\"], \"detail\": {\"total\": [1000]}}"
    ], a: 0,
    no: [null,
      "That is an exact match on the string \">= 1000\", which a numeric total never equals.",
      "total sits inside detail in the event, so a top-level total field never matches.",
      "A plain value is an exact match, so only orders of exactly 1,000 would be sent."],
    why: "Event patterns mirror the event's structure, and numeric matching uses a numeric operator inside the field's array, here under detail.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html", "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html"] },

  { id: "dva-1-111", exam: "DVA", dva: "1.1", topic: "eventbridge", type: "mc",
    q: "An EventBridge rule sends EC2 state-change events to an SNS topic that emails the operations team. The team wants each email to read like \"Instance i-0abc is now stopped\" instead of the full event JSON. The developer wants no code to maintain. What should the developer do?",
    opts: [
      "Add an input transformer to the rule's target, mapping the instance ID and state to variables used in a template.",
      "Change the target's input to part of the matched event, with the path $.detail.state, so that only the state is sent.",
      "Add a filter policy to the topic's email subscription that keeps only the instance ID and state from the event.",
      "Add a Lambda function as the rule's target that formats the sentence and publishes it to the topic for the team."
    ], a: 0,
    no: [null,
      "That sends only the state value, without the instance ID or the sentence around it.",
      "Filter policies decide which messages a subscription gets. They don't rewrite the message.",
      "It works, but it adds a function to write and maintain, which the team wants to avoid."],
    why: "An input transformer pulls values out of the event with JSON paths and places them into a template, so the target receives custom text instead of the original event.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-transform-target-input.html"] },

  { id: "dva-1-112", exam: "both", dva: "1.1", saa: "2.1", topic: "eventbridge", type: "mc",
    q: "After each order, an order service calls a shipping service's API directly. Now a loyalty team and an analytics team also need every order, and more teams will follow. The order team doesn't want to change its code for each new consumer, and a slow consumer must not slow down orders. What should the developer do?",
    opts: [
      "Have the order service send an OrderPlaced event to an EventBridge event bus, and let each team add its own rule and target.",
      "Have the order service call each team's API on its own thread, so all of the calls run in parallel instead of one after another.",
      "Have the order service send each order to one SQS queue, and let the shipping, loyalty and analytics services poll that queue.",
      "Have the order service write each order to a DynamoDB table, and let each team scan the table for new orders every minute."
    ], a: 0,
    no: [null,
      "The order service still changes for each new consumer, and it still waits on every call.",
      "Each message goes to one consumer, so the services would split the orders instead of each getting all of them.",
      "Scans are slow and costly, and each team must track which orders it has already handled."],
    why: "Publishing events to a bus decouples the producer from its consumers. Each consumer adds a rule that matches the events it needs, and EventBridge delivers to the targets asynchronously, so the producer never changes.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-bus.html", "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-putevents.html"] },

  { id: "dva-1-113", exam: "DVA", dva: "1.1", topic: "eventbridge", type: "mc",
    q: "A Lambda function targeted by an EventBridge rule had a bug for 6 hours. It ran without errors but wrote wrong results. The bug is fixed. The event bus has had an archive of all events since it was created. Other rules on the bus must not see the events again. What should the developer do?",
    opts: [
      "Start a replay from the archive for the 6-hour window, and send the replayed events only to the fixed rule.",
      "Redrive the function's asynchronous invocations for the window from its on-failure destination.",
      "Look up the events for the window in CloudTrail, and invoke the function again once for each event found.",
      "Turn on a dead-letter queue for the rule's target, then use a DLQ redrive to send the events to the function."
    ], a: 0,
    no: [null,
      "The invocations succeeded, so no failure records were kept.",
      "CloudTrail records API calls, not your custom events, and this is manual work the archive does for you.",
      "A target's dead-letter queue only holds events that EventBridge failed to deliver. These were delivered."],
    why: "EventBridge replays archived events from a chosen time window to the bus that received them, and a replay can be limited to specific rules.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-archive.html", "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-replay-archived-event.html"] },

  { id: "dva-1-114", exam: "both", dva: "1.1", saa: "2.1", topic: "eventbridge", type: "mc",
    q: "Orders arrive in an SQS queue. Only orders whose priority field is \"high\" should start a Step Functions workflow, and each must first be enriched with customer details from an internal HTTP API. The team wants to avoid writing integration code. Which solution meets these requirements?",
    opts: [
      "Create an EventBridge pipe with the queue as source, a filter on priority, the API as enrichment, and the workflow as target.",
      "Add a Lambda event source mapping on the queue with a filter on priority, and code that calls the API and starts the workflow.",
      "Subscribe the queue to an SNS topic with a filter policy on priority, and point the topic at the Step Functions workflow.",
      "Create an EventBridge rule on the default bus that matches messages from the queue with a high priority, targeting the workflow."
    ], a: 0,
    no: [null,
      "It works, but the function is integration code the team must write and maintain.",
      "A queue can be a subscriber of a topic, not a publisher to one, and Step Functions isn't an SNS subscription type.",
      "SQS doesn't send each message to an event bus, so the rule never sees the orders."],
    why: "EventBridge Pipes connect one source to one target, with optional filtering and enrichment in between, so no glue code is needed.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-pipes.html"] },

  // Step Functions
  { id: "dva-1-115", exam: "DVA", dva: "1.1", topic: "stepfunctions", type: "multi", hint: "Select TWO.",
    q: "A Task state calls a Lambda function that sometimes throws RateLimited, which passes on its own after a short wait, and sometimes throws InvalidOrder, which never succeeds on a retry. RateLimited must be retried up to 4 times with growing waits. Any error that remains must go to a NotifyFailure state. Which should the developer add to the Task state? (Select TWO.)",
    items: [
      { t: "A Retry field with ErrorEquals [\"RateLimited\"], IntervalSeconds 2, MaxAttempts 4 and BackoffRate 2.", ok: true },
      { t: "A Catch field with ErrorEquals [\"States.ALL\"] and Next set to \"NotifyFailure\".", ok: true },
      { t: "A Retry field with ErrorEquals [\"States.ALL\"], IntervalSeconds 2, MaxAttempts 4 and BackoffRate 2.", ok: false, no: "That also retries InvalidOrder four times, which can never succeed and only delays the failure." },
      { t: "A Choice state after the task that checks $.errorType and goes to NotifyFailure when it is set.", ok: false, no: "An uncaught error fails the execution. It never reaches the next state as data." },
      { t: "A TimeoutSeconds of 4 on the task, so that each failed attempt ends quickly and the next one starts.", ok: false, no: "A timeout limits how long the task runs. It doesn't retry or route errors." }
    ],
    why: "Retriers match error names and retry with IntervalSeconds growing by BackoffRate. When retries run out, or no retrier matches, the Catch field routes the error to a fallback state.",
    doc: ["https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html"] },

  { id: "dva-1-116", exam: "both", dva: "1.1", saa: "2.1", topic: "stepfunctions", type: "multi", hint: "Select TWO.",
    q: "A team is choosing between Standard and Express workflows for a new Step Functions state machine that handles customer orders. Which requirements mean the team must choose a Standard workflow? (Select TWO.)",
    items: [
      { t: "One step pauses for up to three days until a manager's app sends back a task token.", ok: true },
      { t: "One step charges a customer's card and must run exactly once per execution, never skipped or repeated.", ok: true },
      { t: "Each execution must log the input and output of every state to CloudWatch Logs.", ok: false, no: "Both workflow types can send execution logs to CloudWatch Logs." },
      { t: "Executions are started by an EventBridge rule whenever a new order event arrives.", ok: false, no: "Both workflow types can be started by EventBridge and other event sources." },
      { t: "Each execution finishes within about 30 seconds and calls only DynamoDB and Lambda.", ok: false, no: "Short executions with these integrations fit either type." }
    ],
    why: "Standard workflows run for up to a year with exactly-once execution and support the callback (.waitForTaskToken) pattern. Express workflows run for at most five minutes, use at-least-once (asynchronous) or at-most-once (synchronous) execution, and don't support callbacks.",
    doc: ["https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html"] },

  { id: "dva-1-117", exam: "DVA", dva: "1.1", topic: "stepfunctions", type: "mc",
    q: "A state machine receives an order with an array of up to 30 line items. Each item must be checked by calling a partner's API through a Lambda function, and the partner allows at most 5 concurrent calls. The checks should run in parallel within that limit. What should the developer use?",
    opts: [
      "A Map state over the items array with MaxConcurrency set to 5, whose iteration runs the Lambda task.",
      "A Parallel state with 30 branches, one per item, each running the Lambda task on its own line item.",
      "A Map state over the items array with MaxConcurrency set to 0, so that every item is checked at once.",
      "A Choice state that loops back to the Lambda task once per item, keeping a counter in the state's output."
    ], a: 0,
    no: [null,
      "Parallel branches are fixed when the state machine is written, not one per item at run time, and nothing would keep the calls to 5.",
      "0 means no limit, so all 30 calls could hit the partner at once.",
      "A loop works one item at a time, so it gives up the parallelism and needs more states."],
    why: "A Map state runs the same steps for each item of an array, and MaxConcurrency caps how many iterations run at the same time.",
    doc: ["https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html"] },

  { id: "dva-1-118", exam: "DVA", dva: "1.1", topic: "stepfunctions", type: "mc",
    q: "A nightly job must validate each row of a 2 GB CSV file in S3, about 5 million rows, by calling a Lambda function, running thousands of validations at a time. The team wants Step Functions to handle the fan-out and retries. Which approach should the developer use?",
    opts: [
      "A Standard workflow with a Distributed Map state that reads the CSV file from S3 with an ItemReader and batches the rows.",
      "A Standard workflow with an Inline Map state, after a Lambda step that loads the whole CSV file into the state's input.",
      "An Express workflow with a Distributed Map state that reads the CSV file from S3 with an ItemReader and batches the rows.",
      "A Standard workflow with a Parallel state whose branches each read one part of the CSV file and validate its rows."
    ], a: 0,
    no: [null,
      "Inline Map runs at most 40 iterations at once and takes a JSON array from the state's input, and a 2 GB file far exceeds the payload size limit.",
      "Express workflows don't support Distributed Map, and they run for at most five minutes.",
      "Branches are fixed in the definition, and each branch would need its own code to read and loop over rows."],
    why: "Distributed Map reads items straight from S3, including CSV files, and runs each iteration or batch as a child workflow, with up to 10,000 running in parallel.",
    doc: ["https://docs.aws.amazon.com/step-functions/latest/dg/state-map-distributed.html", "https://docs.aws.amazon.com/step-functions/latest/dg/state-map.html"] },

  { id: "dva-1-119", exam: "both", dva: "1.1", saa: "2.1", topic: "stepfunctions", type: "multi", hint: "Select TWO.",
    q: "Placing an order calls an order service, an inventory service and a payment service, each with its own database. If payment fails, the stock reservation and the order must be undone. The team also wants one place to see how far each order got. Which combination meets these requirements? (Select TWO.)",
    items: [
      { t: "A Step Functions Standard workflow that calls the three services in order as an orchestrator.", ok: true },
      { t: "Catch fields that send a failed step to compensating steps that undo the steps already done.", ok: true },
      { t: "Each service publishes events to EventBridge, and the next service reacts to them with no coordinator.", ok: false, no: "Choreography can work, but no single place then shows how far each order got." },
      { t: "One database transaction that spans the three services' databases, rolled back if payment fails.", ok: false, no: "With a database per service there is no single transaction across them. That is why a saga is needed." },
      { t: "An SNS topic that fans each order out to the three services at once, in parallel.", ok: false, no: "Parallel delivery can't stop payment running when an earlier step failed, or undo the others." }
    ],
    why: "In the saga orchestration pattern, a central orchestrator such as a Step Functions Standard workflow runs each local transaction in order and runs compensating transactions when a step fails. The execution history shows each order's progress.",
    doc: ["https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-orchestration.html", "https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-choreography.html"] },

  // Kinesis and Firehose
  { id: "dva-1-120", exam: "DVA", dva: "1.1", topic: "kinesis", type: "mc",
    q: "A producer writes sensor readings from 20,000 devices to a Kinesis data stream with 8 shards, using the partition key \"sensor-data\" for every record. Writes fail with ProvisionedThroughputExceededException, although total traffic is well under the capacity of 8 shards. What should the developer do?",
    opts: [
      "Use the device ID as the partition key, so records spread across all the shards in the stream.",
      "Double the number of shards in the stream, so that the stream has twice the total write capacity.",
      "Register the consumers for enhanced fan-out, so each consumer gets its own read throughput per shard.",
      "Send the records with PutRecords instead of PutRecord, so that fewer requests reach the stream."
    ], a: 0,
    no: [null,
      "One partition key always maps to one shard, so the extra shards would sit idle.",
      "Enhanced fan-out adds read throughput. The writes are what are being throttled.",
      "Per-shard limits count records and bytes, and every record still goes to the same shard."],
    why: "Kinesis hashes the partition key to pick a shard. A single key sends every record to one shard and hits its write limit, while a high-cardinality key spreads the load.",
    doc: ["https://docs.aws.amazon.com/streams/latest/dev/key-concepts.html", "https://docs.aws.amazon.com/streams/latest/dev/troubleshooting-producers.html"] },

  { id: "dva-1-121", exam: "both", dva: "1.1", saa: "3.5", topic: "kinesis", type: "multi", hint: "Select TWO.",
    q: "A provisioned Kinesis data stream has 4 shards. Traffic has doubled, and writes are now throttled on all four shards about equally. Partition keys are customer IDs and are well spread. Which actions will let the stream take the new load? (Select TWO.)",
    items: [
      { t: "Call UpdateShardCount to raise the stream to 8 shards, so it has twice the write capacity.", ok: true },
      { t: "Switch the stream to on-demand capacity mode, so Kinesis manages the shards for the load.", ok: true },
      { t: "Change the partition key to a random value, so records are spread more evenly across shards.", ok: false, no: "The load is already even. Every shard is full, so spreading it differently doesn't add capacity." },
      { t: "Register the consumers for enhanced fan-out, so each of them gets more throughput per shard.", ok: false, no: "Enhanced fan-out raises read throughput. The writes are the bottleneck." },
      { t: "Raise the stream's retention period, so throttled records can be kept and written again later.", ok: false, no: "Retention controls how long stored records stay readable. Throttled records were never stored." }
    ],
    why: "Each shard takes up to 1 MB or 1,000 records per second of writes, so a provisioned stream needs more shards for more load. On-demand mode scales the shards automatically.",
    doc: ["https://docs.aws.amazon.com/kinesis/latest/APIReference/API_UpdateShardCount.html", "https://docs.aws.amazon.com/streams/latest/dev/how-do-i-size-a-stream.html"] },

  { id: "dva-1-122", exam: "DVA", dva: "1.1", topic: "kinesis", type: "mc",
    q: "A KCL consumer application reads a provisioned Kinesis data stream with 4 shards. Because the application keeps falling behind as traffic grows, the team scaled it from 4 to 8 EC2 workers, but throughput didn't change. Four workers are idle, and the other four are at full CPU. What should the developer do?",
    opts: [
      "Increase the stream's shard count to 8, so that each of the 8 workers can hold a lease on a shard.",
      "Add 8 more workers to the application, so that the busy workers can hand part of their load to them.",
      "Give the idle workers a different application name, so that they start reading the stream on their own.",
      "Raise the write capacity of the KCL lease table in DynamoDB, so that the idle workers can claim leases."
    ], a: 0,
    no: [null,
      "Each shard is leased to one worker at a time, so more workers stay idle while there are only 4 shards.",
      "A new application name means a new lease table, so those workers process every record again instead of sharing the work.",
      "The lease table isn't the limit. There are only 4 shards to lease."],
    why: "KCL binds each shard to one worker through a lease in its DynamoDB lease table. Parallelism is limited by the number of shards, so more shards let more workers share the processing.",
    doc: ["https://docs.aws.amazon.com/streams/latest/dev/kcl-concepts.html", "https://docs.aws.amazon.com/kinesis/latest/APIReference/API_UpdateShardCount.html"] },

  { id: "dva-1-123", exam: "DVA", dva: "1.1", topic: "kinesis", type: "mc",
    q: "A producer writes ledger entries for one account to a Kinesis data stream, all with the account ID as the partition key. The consumer must see each account's entries in strictly increasing order, the same order the producer wrote them. How should the producer write the records?",
    opts: [
      "Call PutRecord for each entry in turn, setting SequenceNumberForOrdering to the sequence number of the previous entry.",
      "Call PutRecords with the entries sorted in the request array, so Kinesis stores them in the order they appear there.",
      "Call PutRecord for each entry with a random ExplicitHashKey, so each entry lands on a shard with spare capacity.",
      "Call PutRecords from several threads at once, each with a different part of the entries, to write them faster."
    ], a: 0,
    no: [null,
      "PutRecords keeps going after a failed record, so it doesn't guarantee the order of the records in a request.",
      "Random hash keys spread one account's entries across shards, and order is only kept within a shard.",
      "Parallel writers interleave the entries, so their order on the stream isn't the order they were produced."],
    why: "Sequence numbers are ordered within a shard. Writing serially with PutRecord and passing the previous record's sequence number as SequenceNumberForOrdering guarantees strictly increasing sequence numbers for the same partition key.",
    doc: ["https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecord.html", "https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecords.html"] },

  { id: "dva-1-124", exam: "DVA", dva: "1.1", topic: "kinesis", type: "multi", hint: "Select TWO.",
    q: "A producer sends records to a Kinesis data stream with PutRecords in batches of 500. The calls return HTTP 200, yet some records never reach the consumers. The developer finds that the responses sometimes show a FailedRecordCount above zero. Which changes will stop records from being lost? (Select TWO.)",
    items: [
      { t: "Check each result entry, and resend only the records whose entries have an ErrorCode, with backoff.", ok: true },
      { t: "Write the records with the Kinesis Producer Library, which puts failed records back in its buffer to retry.", ok: true },
      { t: "Resend the whole batch whenever FailedRecordCount is above zero, so that every record is written again.", ok: false, no: "The records that succeeded are written again, so consumers get duplicates." },
      { t: "Raise the stream's retention period, so that records which failed are kept long enough to be read.", ok: false, no: "Failed records were never stored, so retention can't keep them." },
      { t: "Register the consumers for enhanced fan-out, so that they can read the records that failed to write.", ok: false, no: "Enhanced fan-out changes how consumers read. A record that failed to write isn't in the stream to read." }
    ],
    why: "A PutRecords call can partly succeed. The response lists a result for each record in request order, with an ErrorCode on each failed one, and the producer must resend those. The KPL does this retrying for you.",
    doc: ["https://docs.aws.amazon.com/kinesis/latest/APIReference/API_PutRecords.html", "https://docs.aws.amazon.com/streams/latest/dev/kinesis-producer-adv-retries-rate-limiting.html"] },

  { id: "dva-1-125", exam: "DVA", dva: "1.1", topic: "kinesis", type: "multi", hint: "Select TWO.",
    q: "A consumer reads payment records from a Kinesis data stream and adds each amount to a customer's balance. After worker restarts and producer retries on network timeouts, some payments are counted twice. No record may be lost. Which changes should the developer make? (Select TWO.)",
    items: [
      { t: "Have the producer put a unique payment ID in each record, the same on every retry of that payment.", ok: true },
      { t: "Have the consumer record each payment ID with a conditional write, and skip IDs it has already applied.", ok: true },
      { t: "Have the consumer checkpoint each record before processing it, so a restart never reads it again.", ok: false, no: "A crash after the checkpoint but before processing loses that record, which isn't allowed." },
      { t: "Set SequenceNumberForOrdering on each PutRecord call, so that a retried record replaces the first copy.", ok: false, no: "It orders records. A retried record still gets its own sequence number, so both copies are stored." },
      { t: "Switch the producer from PutRecord to PutRecords, so that each payment is written in a single call.", ok: false, no: "Batching doesn't stop a timed-out call from being retried, or a consumer from re-reading after a restart." }
    ],
    why: "Kinesis delivers duplicates from producer retries and from consumers restarting at the last checkpoint. A unique ID in each record lets the consumer process idempotently and skip what it has already applied.",
    doc: ["https://docs.aws.amazon.com/streams/latest/dev/kinesis-record-processor-duplicates.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html"] },

  { id: "dva-1-126", exam: "DVA", dva: "1.1", topic: "firehose", type: "mc",
    q: "A Firehose stream delivers log records to S3 and uses a Lambda function to transform them. Some records are health-check pings that must not reach S3, and they must not show up as failures in the processing-failed folder either. How should the function handle each ping record in its response?",
    opts: [
      "Return the record with its original recordId and a result of Dropped.",
      "Return the record with its original recordId and a result of ProcessingFailed.",
      "Throw an exception when the batch contains a ping, so Firehose skips that record.",
      "Return the record with a new recordId, so that Firehose doesn't match it to any input."
    ], a: 0,
    no: [null,
      "ProcessingFailed records are treated as failures and written to the processing-failed folder.",
      "A failed invocation fails the whole batch, not just the pings, and those records are counted as failures.",
      "A recordId that doesn't match the original is treated as a transformation failure."],
    why: "Each record the function returns needs the original recordId, a result and base64 data. Firehose treats Ok and Dropped as success and doesn't deliver Dropped records.",
    doc: ["https://docs.aws.amazon.com/firehose/latest/dev/data-transformation-status-model.html", "https://docs.aws.amazon.com/firehose/latest/dev/data-transformation-failure-handling.html"] },

  { id: "dva-1-127", exam: "both", dva: "1.1", saa: "3.5", topic: "kinesis", type: "multi", hint: "Select TWO.",
    q: "IoT devices send readings that must be stored in S3 as compressed files for queries in Athena. An anomaly detector, a Lambda function, must also react to each reading within seconds. The company wants the LEAST operational overhead. Which combination meets these requirements? (Select TWO.)",
    items: [
      { t: "Send the readings to a Kinesis data stream, with the anomaly function reading it through an event source mapping.", ok: true },
      { t: "Create a Firehose stream with the data stream as its source, delivering compressed files to the S3 bucket.", ok: true },
      { t: "Run a KCL application on EC2 that reads the data stream, compresses the readings and writes the files to S3.", ok: false, no: "It works, but it is servers and code to run when Firehose delivers to S3 without either." },
      { t: "Create an EventBridge rule that matches each reading and sends it straight to the S3 bucket as an object.", ok: false, no: "S3 isn't an EventBridge target, and one object per reading would make Athena queries slow and costly." },
      { t: "Write each reading to a DynamoDB table, and use its TTL setting to move old readings into the S3 bucket.", ok: false, no: "TTL deletes expired items. It doesn't export them to S3." }
    ],
    why: "A data stream lets several consumers read the same records, such as a Lambda function and a Firehose stream. Firehose buffers, compresses and delivers the records to S3 with no code.",
    doc: ["https://docs.aws.amazon.com/firehose/latest/dev/basic-deliver.html", "https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html"] },

  // API Gateway
  { id: "dva-1-128", exam: "DVA", dva: "1.1", topic: "apigateway", type: "mc",
    q: "A REST API must put a JSON interface in front of a legacy HTTP service that only accepts an XML body with different field names. Clients will send JSON, and neither the clients nor the legacy service can change. What should the developer configure?",
    opts: [
      "An HTTP custom integration with a mapping template for application/json in the integration request that writes the XML body.",
      "An HTTP proxy integration with parameter mappings in the integration request that rename each JSON field to its XML name.",
      "A request validator with a JSON schema model for the method, so that API Gateway converts valid bodies to XML for the backend.",
      "An HTTP proxy integration with a Lambda authorizer on the method that rewrites the body into XML before the request is sent."
    ], a: 0,
    no: [null,
      "Parameter mapping changes paths, query strings and headers, not the payload, and proxy integrations pass the body through as it is.",
      "Validation checks a body against a model. It doesn't transform it.",
      "Authorizers return an allow or deny policy. They can't rewrite the request body."],
    why: "In a non-proxy integration, a VTL mapping template chosen by the request's Content-Type can build an entirely different integration request body.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-data-transformations.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-integration-types.html"] },

  { id: "dva-1-129", exam: "DVA", dva: "1.1", topic: "apigateway", type: "mc",
    q: "A REST API method uses a Lambda custom (non-proxy) integration. When an order isn't found, the function raises an error with the message \"NotFound: order 123\", but clients receive HTTP 200 with the error JSON in the body. The team wants clients to receive 404. What should the developer do?",
    opts: [
      "Add a 404 method response, and an integration response for 404 with the Lambda error regex NotFound.*.",
      "Change the function to return an object with a statusCode of 404, keeping the custom integration as it is.",
      "Customize the RESOURCE_NOT_FOUND gateway response so that it returns a 404 status code to the client.",
      "Add a request validator to the method, so that requests for orders that don't exist are rejected with 404."
    ], a: 0,
    no: [null,
      "With a custom integration, the function's return value becomes the body of a 200 response, so the statusCode field is only data.",
      "Gateway responses cover errors API Gateway generates itself, not errors returned by the integration.",
      "A validator checks the request's shape. It can't know whether an order exists."],
    why: "For custom integrations, API Gateway matches a Lambda error's errorMessage against each integration response's selection pattern and returns that response's status code, which needs a matching method response.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/handle-errors-in-lambda-integration.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-integration-settings-integration-response.html"] },

  { id: "dva-1-130", exam: "DVA", dva: "1.1", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A single-page app on https://app.example.com calls POST /orders on a REST API at a different domain, sending a JSON body. The method uses Lambda proxy integration. The browser blocks the calls with a CORS error. Which changes are needed? (Select TWO.)",
    items: [
      { t: "Enable CORS on the /orders resource, which adds an OPTIONS method for the preflight, and redeploy the API.", ok: true },
      { t: "Change the function to return an Access-Control-Allow-Origin header for the app's origin in its response.", ok: true },
      { t: "Add a CORS configuration to the S3 bucket that hosts the app, allowing POST from the API's domain.", ok: false, no: "CORS is enforced on the server being called, here the API. The bucket's CORS rules apply to requests to the bucket." },
      { t: "Add a resource-based policy to the function that allows calls from the app's origin.", ok: false, no: "Resource policies control which AWS principals may invoke the function. Browsers check CORS headers." },
      { t: "Require an API key on the method, and have the app send it in the x-api-key header.", ok: false, no: "API keys meter clients. They add a custom header and don't satisfy the CORS check." }
    ],
    why: "A JSON POST is a non-simple request, so the browser first sends a preflight OPTIONS request. With a proxy integration there is no integration response to add headers to, so the backend must return Access-Control-Allow-Origin itself.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-cors-console.html"] },

  { id: "dva-1-131", exam: "DVA", dva: "1.1", topic: "apigateway", type: "mc",
    q: "A REST API's methods return CORS headers, and successful calls from the web app work. But when the Lambda authorizer denies a request, the browser reports a CORS error, and the app's code can't read the 403 status to show a sign-in prompt. What should the developer do?",
    opts: [
      "Add an Access-Control-Allow-Origin header to the DEFAULT_4XX gateway response, then redeploy the API.",
      "Change the authorizer to return an Access-Control-Allow-Origin header along with its deny policy.",
      "Turn off authorizer caching, so the authorizer runs again and adds the CORS headers on every request.",
      "Add a 403 integration response with the CORS header to each method, using a selection pattern of 403."
    ], a: 0,
    no: [null,
      "An authorizer returns a principal and a policy. API Gateway builds the denied response itself.",
      "Caching decides how often the authorizer runs, not which headers the denied response has.",
      "A denied request never reaches the integration, so integration responses aren't used."],
    why: "When API Gateway rejects a request itself, it returns a gateway response, not an integration response. Adding the CORS header to the gateway response lets the browser pass the error to the app.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-gatewayResponse-definition.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/supported-gateway-response-types.html"] },

  { id: "dva-1-132", exam: "DVA", dva: "1.1", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A team wants to move a REST API to an HTTP API to lower costs. Which of the API's current requirements would block the move, since HTTP APIs don't support them? (Select TWO.)",
    items: [
      { t: "Partners get API keys and usage plans, with their own request quotas and throttling.", ok: true },
      { t: "An AWS WAF web ACL attached to the API blocks SQL injection attempts.", ok: true },
      { t: "Requests carry JWTs issued by a Cognito user pool, which must be validated.", ok: false, no: "HTTP APIs validate JWTs natively with a JWT authorizer, which works with Cognito." },
      { t: "Each route invokes a Lambda function through a proxy integration.", ok: false, no: "Both API types support Lambda proxy integrations." },
      { t: "The API is served on a custom domain name with an ACM certificate.", ok: false, no: "Both API types support custom domain names." }
    ],
    why: "HTTP APIs have fewer features at a lower price. API keys, per-client usage plans, AWS WAF, caching, request validation and request body transformation need a REST API.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html"] },

  { id: "dva-1-133", exam: "DVA", dva: "1.1", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A live auction site must push each new bid to every browser watching an item within a second. Browsers must not poll. The backend runs on Lambda. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Create a WebSocket API whose $connect and $disconnect routes save and remove connection IDs in DynamoDB.", ok: true },
      { t: "When a bid arrives, have a function send it to each saved connection ID with the @connections API.", ok: true },
      { t: "Create a REST API with caching on GET /bids and a 1-second TTL, so the browsers' requests are cheap.", ok: false, no: "The browsers would still poll, which the requirement rules out." },
      { t: "Subscribe each browser to an SNS topic for the item, and publish every bid to that topic.", ok: false, no: "SNS can't deliver to a browser page. It pushes to endpoints such as queues, functions, HTTPS servers and email." },
      { t: "Keep the connection IDs in a global variable in the function, so that every invocation can reach them.", ok: false, no: "Each execution environment has its own memory, and environments come and go, so the list wouldn't be shared or kept." }
    ],
    why: "A WebSocket API keeps a two-way connection open. The backend tracks connection IDs and sends messages to clients by posting to the @connections API with those IDs.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-overview.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-how-to-call-websocket-api-connections.html"] },

  { id: "dva-1-134", exam: "both", dva: "1.1", saa: "2.1", topic: "apigateway", type: "mc",
    q: "Partners send bursts of webhook events to an HTTPS endpoint. Each event must be put in an SQS queue for later processing. The team doesn't want to maintain any function code, and wants the LEAST operational overhead. What should the developer do?",
    opts: [
      "Create an HTTP API route with an SQS-SendMessage integration, using an IAM role that can send to the queue.",
      "Create an HTTP API route with a Lambda integration whose function sends each event body to the queue.",
      "Create a REST API, and set the queue as the stage's access log destination so that each request lands there.",
      "Create a REST API with a usage plan whose throttling settings hold excess requests in the queue for later."
    ], a: 0,
    no: [null,
      "It works, but it adds a function to write and maintain, which the team wants to avoid.",
      "Access logs go to CloudWatch Logs or Firehose, not SQS, and they record request metadata, not the events.",
      "Throttling rejects excess requests with 429. It doesn't queue them."],
    why: "API Gateway can call AWS service actions directly. HTTP APIs offer first-class integrations such as SQS-SendMessage, which send the request to the queue with no code.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-aws-services.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-aws-services-reference.html"] },

  { id: "dva-1-135", exam: "DVA", dva: "1.1", topic: "apigateway", type: "mc",
    q: "A REST API method uses a Lambda custom (non-proxy) integration to start a data export that runs for several minutes, longer than the API's integration timeout. Clients only need to know that the export was accepted. What should the developer do with the fewest changes?",
    opts: [
      "Add an X-Amz-Invocation-Type header with the static value 'Event' to the integration request.",
      "Raise the function's timeout to its maximum, so that the export can finish before the API gives up.",
      "Add an on-success destination to the function, so that its result is sent back to the waiting client.",
      "Turn on caching for the method, so that the export's result is returned from the cache on later calls."
    ], a: 0,
    no: [null,
      "API Gateway still waits for the function, so the request times out first.",
      "Destinations only apply to asynchronous invocations, and they send records to AWS services, not to HTTP clients.",
      "The first call still waits for the whole export and times out, so there is nothing to cache."],
    why: "With the header set to Event, API Gateway invokes the function asynchronously and responds at once, while the function keeps running.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-integration-async.html"] },

  // SDK and CLI
  { id: "dva-1-136", exam: "DVA", dva: "1.1", topic: "sdk", type: "multi", hint: "Select TWO.",
    q: "A script calls the S3 ListObjectsV2 API once to count the objects in a bucket. It always reports 1,000, but the bucket holds about 250,000 objects. Which changes will make the script count every object? (Select TWO.)",
    items: [
      { t: "Use the SDK's paginator for ListObjectsV2, and add up the objects from every page it returns.", ok: true },
      { t: "While IsTruncated is true, call again with NextContinuationToken passed as ContinuationToken.", ok: true },
      { t: "Set MaxKeys to 250000 on the request, so that all of the objects come back in one response.", ok: false, no: "A response never holds more than 1,000 keys, whatever MaxKeys is set to." },
      { t: "Switch to the older ListObjects API, which returns every object in the bucket in one call.", ok: false, no: "ListObjects also returns at most 1,000 objects per call." },
      { t: "Add a Delimiter of / to the request, so the objects are grouped and fit into one response.", ok: false, no: "A delimiter groups keys into common prefixes. It hides objects rather than counting them." }
    ],
    why: "ListObjectsV2 returns up to 1,000 keys per call. IsTruncated and NextContinuationToken tell the caller to fetch the next page, and SDK paginators run that loop for you.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html", "https://docs.aws.amazon.com/boto3/latest/guide/paginators.html"] },

  { id: "dva-1-137", exam: "DVA", dva: "1.1", topic: "sdk", type: "mc",
    q: "A setup script calls CreateTable for a DynamoDB table and then immediately writes seed items with PutItem. The writes fail with ResourceNotFoundException, though the table appears in the console a few seconds later. What should the developer do with the least code?",
    opts: [
      "Use the SDK's TableExists waiter after CreateTable, which polls DescribeTable until the table is ACTIVE.",
      "Wrap PutItem in a loop that retries forever on any error, with no delay between the attempts.",
      "Call DescribeTable once after CreateTable, and start writing as soon as it returns the table's details.",
      "Add a ConditionExpression to each PutItem call, so that DynamoDB waits until the table can take writes."
    ], a: 0,
    no: [null,
      "Endless retries without delay waste calls and hide real errors.",
      "DescribeTable returns at once with a status of CREATING, and reads and writes need the table to be ACTIVE.",
      "A condition expression tests the item's attributes. It doesn't wait for the table."],
    why: "CreateTable returns while the table is CREATING, and reads and writes only work once it is ACTIVE. SDK waiters poll a describe call until the resource reaches the state you need.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html", "https://docs.aws.amazon.com/boto3/latest/guide/clients.html"] },

  { id: "dva-1-138", exam: "DVA", dva: "1.1", topic: "cli", type: "mc",
    q: "A nightly job runs aws s3api list-objects-v2 on a bucket with millions of objects and needs the full list. The command sometimes fails with a timed-out error partway through. What should the developer change?",
    opts: [
      "Add --page-size 100, so each call to S3 asks for fewer items while the CLI still returns the full list.",
      "Add --max-items 100, so the CLI asks for fewer items in total and finishes before the timeout is hit.",
      "Add --no-paginate, so the CLI makes only one call to S3 instead of many separate calls in sequence.",
      "Add --query with a filter, so S3 sends back less data for each of the calls that the CLI makes to it."
    ], a: 0,
    no: [null,
      "--max-items stops after 100 items, so the job no longer gets the full list.",
      "With --no-paginate the CLI returns only the first page, at most 1,000 objects.",
      "--query filters the output on the client side, after S3 has already sent the data."],
    why: "--page-size makes the CLI request fewer items per API call, which gives each call a better chance of finishing in time. The CLI still pages through to the full list.",
    doc: ["https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-pagination.html"] },

  { id: "dva-1-139", exam: "DVA", dva: "1.1", topic: "cli", type: "mc",
    q: "A script processes the objects in a large bucket 500 at a time with the AWS CLI. Each run must handle the next 500 objects, starting where the previous run stopped. What should the script do?",
    opts: [
      "Run the command with --max-items 500, save the NextToken it prints, and pass it as --starting-token on the next run.",
      "Run the command with --page-size 500, so that each run prints the next 500 objects after the previous run's.",
      "Run the command with --no-paginate on every run, so the CLI returns one page and moves to the next on each run.",
      "Run the command with --query that slices the first 500 objects, and delete each object once it has been handled."
    ], a: 0,
    no: [null,
      "--page-size only changes how many items each API call fetches. The output is still the whole list.",
      "--no-paginate always returns the first page, so every run gets the same objects.",
      "Deleting the bucket's objects isn't part of the job, and the CLI still fetches the whole list before slicing it."],
    why: "--max-items limits the output and prints a NextToken when more items remain. Passing that token as --starting-token resumes the listing from that point.",
    doc: ["https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-pagination.html"] },

  { id: "dva-1-140", exam: "DVA", dva: "1.1", topic: "cli", type: "mc",
    q: "Before a release, a developer wants to confirm that a deployment role has permission to launch EC2 instances with a given configuration, without launching any instance or paying for one. What should the developer do?",
    opts: [
      "Run aws ec2 run-instances with the configuration and --dry-run, and check for a DryRunOperation response.",
      "Run aws ec2 run-instances with the configuration and --max-items 0, so the command checks but launches nothing.",
      "Run aws ec2 describe-instances with the role, since its success shows that run-instances will be allowed as well.",
      "Launch the instance with the configuration and terminate it at once, since a short run is billed for nothing."
    ], a: 0,
    no: [null,
      "--max-items limits output for list commands. It doesn't stop run-instances from launching.",
      "Permission to describe instances says nothing about permission to launch them.",
      "It launches an instance, which the developer wants to avoid, and billed time is charged."],
    why: "With --dry-run, EC2 checks permissions without making the request. It returns DryRunOperation if the call would be allowed, and UnauthorizedOperation if not.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_RunInstances.html", "https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html"] },

  // Patterns and fault tolerance
  { id: "dva-1-141", exam: "both", dva: "1.1", saa: "2.1", topic: "resilience", type: "mc",
    q: "An order service calls a payment service synchronously. When the payment service goes down, sometimes for 15 minutes, every order request waits through timeouts and retries, threads run out, and the whole site slows down. The team wants calls to fail fast during an outage and to resume on their own once the payment service recovers. What should the developer do?",
    opts: [
      "Add a circuit breaker that records failures in a shared store, fails calls at once while open, and retries after it expires.",
      "Raise the number of retries for each payment call, with exponential backoff, so more calls succeed during the outage.",
      "Raise the timeout for each payment call, so that slow responses from the payment service are less likely to fail.",
      "Add more order service instances behind the load balancer, so that there are more threads to hold the waiting calls."
    ], a: 0,
    no: [null,
      "More retries mean more waiting and more load on a service that is down, which is what exhausts the threads.",
      "Longer timeouts make each request hold its thread even longer during the outage.",
      "The new instances fill up with waiting calls too, and the outage still slows every order."],
    why: "A circuit breaker opens after repeated failures and returns an immediate error instead of calling the failing service. After a set time it lets a call through, and closes again when calls succeed.",
    doc: ["https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/circuit-breaker.html"] },

  { id: "dva-1-142", exam: "DVA", dva: "1.1", topic: "resilience", type: "multi", hint: "Select TWO.",
    q: "A mobile app calls POST /payments. When the network drops before the response arrives, the app retries, and the backend sometimes charges the customer twice. Payments must not be lost and must not be charged twice. Which changes should the developer make? (Select TWO.)",
    items: [
      { t: "Have the app create an idempotency key for each payment, and send the same key on every retry of it.", ok: true },
      { t: "Have the backend save the key with a conditional write, and return the saved result if the key exists.", ok: true },
      { t: "Turn off retries in the app, so that each payment request is only ever sent to the backend once.", ok: false, no: "A payment whose request was lost on the network would then never be made." },
      { t: "Have the app create a new idempotency key for every attempt, so the backend can tell the retries apart.", ok: false, no: "A new key on each retry makes every retry look like a new payment, which is the bug." },
      { t: "Raise the backend function's timeout, so that the app always receives a response to its first request.", ok: false, no: "Network drops happen whatever the timeout, so retries, and duplicates, would continue." }
    ],
    why: "An idempotency key identifies one logical operation across retries. A conditional write such as attribute_not_exists stores the first attempt only, so repeats return the first result instead of charging again.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html"] },

  { id: "dva-1-143", exam: "DVA", dva: "1.1", topic: "lambda", type: "mc",
    q: "A Lambda function behind an API counts votes by adding to a dictionary declared outside the handler, and returns the totals. Under load, different callers see different totals, and the totals sometimes drop back to zero. What should the developer do?",
    opts: [
      "Store the totals in a DynamoDB table, and add each vote with an UpdateItem call that uses an ADD expression.",
      "Turn on provisioned concurrency, so that the execution environments holding the totals are kept running.",
      "Set the function's reserved concurrency to 1, so that a single execution environment holds all the totals.",
      "Write the totals to a file in /tmp after each vote, so that they survive between invocations of the function."
    ], a: 0,
    no: [null,
      "Each environment still keeps its own totals, and environments are still replaced from time to time.",
      "Lambda still replaces environments every few hours, losing the totals, and one environment caps throughput.",
      "Each environment has its own /tmp, which goes away when the environment does."],
    why: "Lambda runs many execution environments and recycles them, so state kept in memory or /tmp isn't shared or durable. An atomic counter in DynamoDB keeps one total for every caller.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html"] },

  { id: "dva-1-144", exam: "both", dva: "1.1", saa: "2.1", topic: "architecture", type: "multi", hint: "Select TWO.",
    q: "Users request a report from an API, and building it takes about 10 minutes. The API must answer within a second, the report must not be lost if the user closes the app, and the app must be able to fetch it later. Which combination meets these requirements? (Select TWO.)",
    items: [
      { t: "The API saves a job record, sends the job to an SQS queue, and returns 202 with the job ID at once.", ok: true },
      { t: "A worker builds the report from the queue, stores it in S3 and marks the job record as complete.", ok: true },
      { t: "The API starts a synchronous Express workflow that builds the report and returns it in the response.", ok: false, no: "Express workflows run for at most five minutes, and the caller would wait far longer than a second." },
      { t: "The API keeps the request open and streams progress messages until the report is ready to return.", ok: false, no: "The user waits the full 10 minutes, and the report is lost if the app is closed." },
      { t: "The API turns on caching, so that a second request for the same report is answered within a second.", ok: false, no: "The first request still has to wait for the whole build, and a cache doesn't keep reports durably." }
    ],
    why: "Long work is made asynchronous: the API accepts the job, a queue holds it durably, a worker does it, and the client checks the job's status or result later.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/concepts-event-driven-architectures.html", "https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html"] },

  // AppSync
  { id: "dva-1-145", exam: "DVA", dva: "1.1", topic: "appsync", type: "multi", hint: "Select TWO.",
    q: "A mobile screen needs data from a DynamoDB table and from a partner's public REST service in one request, fetching only the fields it shows. It must also update live when another user changes an item through the app. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Create an AppSync GraphQL API with resolvers on a DynamoDB data source and an HTTP data source.", ok: true },
      { t: "Add a subscription to the schema with @aws_subscribe on the mutation that changes an item.", ok: true },
      { t: "Turn on DynamoDB Streams on the table, so that AppSync subscriptions fire on each direct write.", ok: false, no: "AppSync subscriptions are triggered by mutations through the API. Writes made straight to the table don't trigger them." },
      { t: "Create a REST API in API Gateway with caching, and have the app poll it every second.", ok: false, no: "Polling isn't a live update, and REST endpoints return fixed shapes rather than the fields asked for." },
      { t: "Create a Lambda function that queries both sources, and have the app call it every few seconds.", ok: false, no: "Polling isn't a live update, and the function returns the same fields whatever the screen needs." }
    ],
    why: "AppSync resolves one GraphQL query across several data sources, returning only the requested fields. Subscriptions run over WebSockets and fire when a listed mutation runs.",
    doc: ["https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html", "https://docs.aws.amazon.com/appsync/latest/devguide/data-source-components.html"] }
);
