// Question bank batch: DVA task 1.2 (Lambda configuration, triggers and event source mappings) and task 1.3 (DynamoDB,
// caching, S3 and OpenSearch as data stores). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 1.2: Lambda
  { id: "dva-1-201", exam: "DVA", dva: "1.2", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Lambda function processes a DynamoDB stream through an event source mapping with default settings. One malformed record makes the function throw, and for hours no newer records from that shard are processed while Lambda retries the same batch. The team wants the bad record set aside so processing continues, and a record of what failed. Which actions should the developer take? (Select TWO.)",
    items: [
      { t: "Turn on BisectBatchOnFunctionError, so that a failing batch is split in half to isolate the bad record.", ok: true },
      { t: "Set MaximumRetryAttempts on the event source mapping, and add an SQS queue as its on-failure destination.", ok: true },
      { t: "Configure a dead-letter queue in the function's asynchronous invocation settings, and leave the mapping as it is.", ok: false, no: "Asynchronous invocation settings don't apply to records that an event source mapping reads from a stream." },
      { t: "Raise the event source mapping's batch size, so the bad record is retried along with more good records.", ok: false, no: "A bigger batch still fails as a whole, and the shard stays blocked until the records expire." },
      { t: "Raise the function's timeout, so that each retry of the failing batch has more time to complete its work.", ok: false, no: "The record fails because it is malformed, not because the function runs out of time." }
    ],
    why: "By default a stream event source mapping retries a failing batch until its records expire, which blocks the shard. Bisecting isolates the bad record, and a retry limit with an on-failure destination discards it after a few tries and sends details of the failed batch to the queue.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-dynamodb-errors.html"] },

  { id: "dva-1-202", exam: "both", dva: "1.2", saa: "3.5", topic: "lambda", type: "mc",
    q: "A Lambda function reads a Kinesis data stream of payment events. For each shard it must publish the count and total value of payments in every 1-minute period, in near real time. The team doesn't want to run a database or cache just to hold running totals between invocations. What should the developer do?",
    opts: [
      "Set TumblingWindowInSeconds to 60 on the mapping, return running totals as state, and publish them on the final invoke.",
      "Set MaximumBatchingWindowInSeconds to 60 on the mapping, so that each invocation receives exactly one minute of records.",
      "Keep the running totals in global variables outside the handler, and publish them once a minute has passed since the last.",
      "Register the function as an enhanced fan-out consumer, so that Lambda groups each shard's records into 1-minute batches."
    ], a: 0,
    no: [null,
      "A batching window is only the longest Lambda waits to fill a batch. Size limits can end a batch early, so one invocation isn't one minute.",
      "Execution environments can be recycled or run side by side, so totals held in memory can be lost or split.",
      "Enhanced fan-out gives the consumer dedicated read throughput. It doesn't group records by time or keep state."],
    why: "With a tumbling window, Lambda passes each invocation the state returned by the previous invocation for the same window, so totals carry across invocations without a database. The last invocation of a window has isFinalInvokeForWindow set, and that is where the function publishes.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-windows.html"] },

  { id: "dva-1-203", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "An S3 event notification invokes a Lambda function asynchronously for each uploaded invoice, and the function charges the customer's card. When the function times out after the charge went through, Lambda runs it again and the customer is charged twice. Until the code is made idempotent, failed events must not be retried, and they must be kept for review. What should the developer do?",
    opts: [
      "Set Retry attempts to 0 in the function's asynchronous invocation settings, and add an on-failure destination for the events.",
      "Set MaximumRetryAttempts to 0 on the function's event source mapping for the bucket, and add a dead-letter queue to the bucket.",
      "Set the function's reserved concurrency to 1, so that only one copy of the function can run and retry a charge at any time.",
      "Raise the function's memory and timeout, so that it never times out and Lambda never has a reason to retry the event again."
    ], a: 0,
    no: [null,
      "S3 notifications invoke the function directly, so there is no event source mapping, and buckets don't have dead-letter queues.",
      "Retries still happen, just one at a time, and a reserved concurrency of 1 slows every upload.",
      "It lowers the chance of a timeout but doesn't stop retries after other errors, and nothing keeps the failed events."],
    why: "For asynchronous invocations Lambda retries function errors twice by default. Setting retry attempts to 0 stops the retries, and an on-failure destination keeps a record of each event that fails.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-configuring.html", "https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html"] },

  { id: "dva-1-204", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A reporting service that runs under an IAM role in the same account needs to call a Lambda function over HTTPS. Every request must be authenticated with Signature Version 4, and the team doesn't want to build or run an API in front of the function. What should the developer do?",
    opts: [
      "Create a function URL with the AWS_IAM auth type, and let the service's role invoke the function through it.",
      "Create a function URL with the NONE auth type, and have the service send an API key in a header to the URL.",
      "Add a function URL to published version 3 of the function, so that the service always calls one fixed version.",
      "Put an Application Load Balancer in front of the function, with a listener rule that checks each SigV4 signature."
    ], a: 0,
    no: [null,
      "NONE does no authentication, and function URLs have no API keys. Any check would have to be written into the code.",
      "A function URL can point only at $LATEST or an alias, not a numbered version, and this does nothing for authentication.",
      "Listener rules don't verify SigV4 signatures, and a load balancer is the extra infrastructure the team wanted to avoid."],
    why: "A function URL gives a function its own HTTPS endpoint. With the AWS_IAM auth type, Lambda authenticates SigV4-signed requests and checks the caller's IAM permissions together with the function's resource-based policy.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html", "https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html"] },

  { id: "dva-1-206", exam: "both", dva: "1.2", saa: "3.1", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "Hundreds of concurrent invocations of a Lambda function must read and update the same 30 GB set of reference files, and changes made by one invocation must be visible to the others. The function already runs in two private subnets in different Availability Zones. Which actions should the developer take? (Select TWO.)",
    items: [
      { t: "Create an Amazon EFS file system with a mount target in each of the two subnets, and allow NFS port 2049 between the security groups.", ok: true },
      { t: "Add a file system configuration to the function that uses an EFS access point and a local mount path under /mnt.", ok: true },
      { t: "Raise the function's ephemeral storage to its maximum, and copy the reference files into /tmp at the start of each invocation.", ok: false, no: "/tmp is private to each execution environment, so one invocation's changes are invisible to the others, and 30 GB doesn't fit." },
      { t: "Package the reference files in a Lambda layer, and attach the layer so that every invocation can open the files.", ok: false, no: "Layers are read-only and size-limited, so invocations can't update the files." },
      { t: "Turn on SnapStart, so that the files loaded during initialization are shared by all of the execution environments.", ok: false, no: "SnapStart resumes environments from a snapshot. It doesn't share later writes, and it doesn't support EFS." }
    ],
    why: "EFS gives every execution environment the same file system, so writes are shared. The function connects through an access point and needs a mount target in each Availability Zone it uses, with NFS traffic allowed.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem-efs.html"] },

  { id: "dva-1-208", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A Lambda function's production alias points at version 5. A developer changes the TABLE_NAME environment variable in the console on $LATEST and saves it, but production requests still use the old table name hours later. What should the developer do?",
    opts: [
      "Publish a new version from $LATEST, which captures the new variable, and point the production alias at it.",
      "Edit the environment variable directly on version 5, so that the production alias picks up the value at once.",
      "Wait for the running execution environments to be recycled, after which version 5 reads the new value.",
      "Invoke the function with InvocationType DryRun, which reloads the configuration of every alias it has."
    ], a: 0,
    no: [null,
      "A published version's environment variables are immutable, so version 5 can't be edited.",
      "Version 5 keeps its own snapshot of the configuration, however often its environments are replaced.",
      "DryRun only validates parameters and permissions. It doesn't run or reload anything."],
    why: "Publishing a version freezes its code and configuration, environment variables included. A change to $LATEST reaches an alias only after a new version is published and the alias is moved to it.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html"] },

  { id: "dva-1-209", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A developer renames a Python function's file from lambda_function.py to app.py, keeps the function def handle(event, context), and uploads the new .zip package. Every invocation now fails with Runtime.ImportModuleError: Unable to import module 'lambda_function'. What should the developer do?",
    opts: [
      "Change the function's handler setting to app.handle, which names the file and the function to run.",
      "Move the dependencies into a Lambda layer, so that the runtime can find the module it can't import.",
      "Change the function's runtime to a newer Python version, which finds handler files by any name.",
      "Set a HANDLER environment variable to app.py, which tells the runtime which file it should load."
    ], a: 0,
    no: [null,
      "The missing module is the handler file itself, not a dependency, so a layer doesn't help.",
      "Every Python runtime loads the file named in the handler setting.",
      "The runtime reads the handler from the function's configuration, not from a variable like this."],
    why: "The Python handler setting is the file name and the function name, here app.handle. The function still asks for lambda_function because the setting wasn't updated after the rename.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/python-handler.html", "https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-deployment.html"] },

  { id: "dva-1-210", exam: "DVA", dva: "1.2", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "An S3 event notification on a bucket invokes a Lambda function for every object created. The function writes a resized copy of each image back to the same bucket, and costs spike as the function keeps triggering itself. Which changes stop the loop? (Select TWO.)",
    items: [
      { t: "Write the resized images to a separate bucket that has no event notification for this function.", ok: true },
      { t: "Filter the notification on the incoming/ prefix, and write the resized images under a resized/ prefix.", ok: true },
      { t: "Set the function's reserved concurrency to 1, so that only one copy of the function runs at a time.", ok: false, no: "The loop carries on one invocation at a time, and real uploads queue up behind it." },
      { t: "Add a dead-letter queue to the function, so repeated events are moved aside after two retries.", ok: false, no: "The invocations succeed, so nothing reaches a dead-letter queue. Each new object is a new event." },
      { t: "Turn on S3 Versioning on the bucket, so the resized copies are stored as new versions of each image.", ok: false, no: "A new version is still an object-created event, so the function is invoked again." }
    ],
    why: "The function's own writes match the notification, so each output fires a new event. Writing to another bucket, or under a prefix the notification doesn't match, breaks the cycle.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html", "https://docs.aws.amazon.com/lambda/latest/dg/invocation-recursion.html"] },

  { id: "dva-1-212", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A Lambda function with a 2-minute timeout reads an SQS queue whose visibility timeout is also 2 minutes. When the function is throttled during bursts, some messages are processed twice, and others reach the dead-letter queue without ever failing in the function. What should the developer change?",
    opts: [
      "Set the queue's visibility timeout to at least six times the function's timeout, so batches survive throttling.",
      "Lower the function's timeout to 20 seconds, so that each batch finishes well inside the queue's visibility timeout.",
      "Turn on ReportBatchItemFailures, so that only the messages that failed in each batch return to the queue.",
      "Raise the redrive policy's maxReceiveCount to 1,000, so that messages are almost never moved to the dead-letter queue."
    ], a: 0,
    no: [null,
      "The function may need its full 2 minutes, and a shorter timeout doesn't cover the time a batch waits while throttled.",
      "It helps with partial failures, but these messages didn't fail. They became visible again while waiting.",
      "It hides one symptom and still lets messages be processed twice."],
    why: "AWS recommends a source queue visibility timeout of at least six times the function's timeout, so Lambda has time to retry a throttled batch before its messages become visible to other pollers.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html"] },

  { id: "dva-1-213", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A Lambda function is triggered by the DynamoDB stream of an Orders table but only acts when an item's Status attribute becomes SHIPPED. Today it is invoked for every change and returns early for over 90% of them. The developer wants to stop these wasted invocations without changing the table. What should the developer do?",
    opts: [
      "Add filter criteria to the event source mapping that match records whose NewImage has Status SHIPPED.",
      "Change the stream view type to KEYS_ONLY, so that each record is smaller and the early return costs less.",
      "Lower the event source mapping's batch size to 1, so that each invocation handles one change and ends sooner.",
      "Add a ConditionExpression to the table's writes, so that only SHIPPED updates are written to the stream."
    ], a: 0,
    no: [null,
      "Every change still invokes the function, and without the new image the function can't see Status at all.",
      "Smaller batches mean more invocations, not fewer.",
      "A condition decides whether a write happens at all, not whether it reaches the stream, and the table must not change."],
    why: "Event filtering on the event source mapping drops records that don't match a pattern before Lambda invokes the function. DynamoDB patterns match fields under the dynamodb key, such as NewImage.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/with-ddb-filtering.html", "https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html"] },

  { id: "dva-1-214", exam: "DVA", dva: "1.2", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A nightly script calls a Lambda function that runs for about 4 minutes. The script must return as soon as the call is accepted instead of holding a connection open, and any run that still fails after Lambda's automatic retries must be recorded in an SQS queue with its error details. Which actions should the developer take? (Select TWO.)",
    items: [
      { t: "Call the Invoke API with InvocationType set to Event, so that Lambda queues the request and returns at once.", ok: true },
      { t: "Configure an on-failure destination on the function that sends records of failed invocations to the SQS queue.", ok: true },
      { t: "Call the Invoke API with InvocationType set to DryRun, so the script doesn't wait for the function to finish.", ok: false, no: "DryRun only validates parameters and permissions. The function doesn't run at all." },
      { t: "Call the Invoke API with InvocationType set to RequestResponse, and set a 1-second timeout in the client.", ok: false, no: "A synchronous call gets no automatic retries from Lambda and leaves no failure record." },
      { t: "Add an event source mapping from the SQS queue to the function, so that failed runs are written to the queue.", ok: false, no: "An event source mapping makes Lambda read from a queue. It doesn't write failures to one." }
    ],
    why: "An Event invocation is asynchronous: Lambda queues the event, returns at once, and retries function errors. Once retries are used up, an on-failure destination receives a record with the request and the error details.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html", "https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html"] },

  { id: "dva-1-215", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A security team requires every Lambda function to send its logs and telemetry to a third-party monitoring service. The developers don't want to add the vendor's code to any handler, and the collector must run alongside each function inside its execution environment. What should the developer do?",
    opts: [
      "Add the vendor's Lambda extension to each function as a layer, so it runs as its own process in the environment.",
      "Add a CloudWatch Logs subscription filter to each log group that streams logs through Firehose to the vendor.",
      "Turn on X-Ray active tracing for each function, and grant the vendor's account permission to read the traces.",
      "Wrap each function in a Step Functions state machine whose final state sends the function's output to the vendor."
    ], a: 0,
    no: [null,
      "It forwards logs after they leave the function, outside the execution environment, and misses the platform telemetry.",
      "Tracing sends segments to X-Ray. It doesn't deliver logs and telemetry to a third party.",
      "It adds a workflow around every function and still runs outside the execution environment."],
    why: "Extensions are packaged as layers and run as separate processes in the execution environment. They can receive logs and telemetry through the Telemetry API without any change to the handler code.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/lambda-extensions.html"] },

  { id: "dva-1-216", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "An app invokes a Lambda function asynchronously. When an event fails all of Lambda's retries, the team wants a record that includes the original event and the error details sent to a custom EventBridge event bus, where existing rules route it to the right team. What should the developer configure?",
    opts: [
      "An on-failure destination on the function that sends records to the custom event bus.",
      "A dead-letter queue on the function that sends failed events to the custom event bus.",
      "An SNS topic as the function's dead-letter queue, with the event bus subscribed to it.",
      "An on-success destination on the function that sends records to the custom event bus."
    ], a: 0,
    no: [null,
      "A dead-letter queue must be an SQS queue or SNS topic, and it gets the event without the invocation record a destination sends.",
      "An event bus isn't a supported SNS subscription endpoint, so the records never reach the bus.",
      "On-success records cover only successful invocations, so failed events would never reach the bus."],
    why: "Destinations can be an SQS queue, SNS topic, S3 bucket (on failure only), Lambda function or EventBridge event bus, and their records include the request and the response. A dead-letter queue is limited to SQS or SNS and holds only the event.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html"] },

  { id: "dva-1-217", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A developer adds VPC subnets and a security group to an existing Lambda function so it can reach a private database. Saving the configuration fails with an error saying the execution role does not have permissions to call CreateNetworkInterface on EC2. What should the developer do?",
    opts: [
      "Attach the AWSLambdaVPCAccessExecutionRole managed policy to the function's execution role, then save again.",
      "Add an inbound rule to the database's security group that allows traffic from the function's security group.",
      "Add a statement to the function's resource-based policy that allows ec2.amazonaws.com to invoke the function.",
      "Grant the developer's own IAM user ec2:CreateNetworkInterface, since Lambda acts with the caller's permissions."
    ], a: 0,
    no: [null,
      "The database will need that rule later, but this error is about the role creating network interfaces.",
      "A resource-based policy controls who can invoke the function, not what the function's role can do in EC2.",
      "Lambda creates the network interfaces with the execution role, which is the role the error names."],
    why: "Lambda creates the function's network interfaces in the VPC using the execution role. The AWSLambdaVPCAccessExecutionRole policy grants ec2:CreateNetworkInterface and the related describe, assign and delete actions.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html"] },

  { id: "dva-1-218", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A developer zips a folder of Python packages with the packages at the top level (requests/, pydantic/ and so on), publishes it as a Lambda layer, and adds the layer to a Python function. The function's imports now fail with No module named 'requests', although the layer is attached. What should the developer do?",
    opts: [
      "Rebuild the layer .zip with the packages under a top-level python/ folder, publish a new layer version, and attach it.",
      "Change the function's handler setting to /opt/requests, so that the runtime loads the package from the layer's folder.",
      "Raise the function's ephemeral storage, so that Lambda has enough room to extract the layer's packages into /tmp.",
      "Move the layer to the top of the function's layer order, so that its packages load before the function's own code."
    ], a: 0,
    no: [null,
      "The handler names the function's own entry point, not where its libraries live.",
      "Layers are extracted to /opt, not /tmp, and they did extract. The packages just aren't on the import path.",
      "Layer order only decides which files win when paths clash. The packages still aren't on the import path."],
    why: "Lambda extracts layers into /opt, and the Python runtime adds /opt/python and its site-packages folder to the import path. Packages at the root of the .zip land directly in /opt, which isn't on the path.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/packaging-layers.html"] },

  { id: "dva-1-219", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A bug in a Lambda consumer corrupted the results for records written to a Kinesis data stream since 14:00 yesterday. The stream keeps data for 7 days. After fixing the code, the developer creates a new event source mapping that must reprocess records from 14:00 yesterday onward, and none earlier. Which starting position should the developer use?",
    opts: [
      "AT_TIMESTAMP, with the starting position timestamp set to 14:00 yesterday.",
      "TRIM_HORIZON, which starts with the oldest record that is still in the stream.",
      "LATEST, which starts with the records that arrive after the mapping is created.",
      "LATEST, with a MaximumRecordAgeInSeconds that reaches back to 14:00 yesterday."
    ], a: 0,
    no: [null,
      "It reprocesses all 7 days, including records the bug never touched.",
      "It skips every record already in the stream, including the corrupted ones.",
      "Maximum record age discards old records. It never moves the starting point back."],
    why: "AT_TIMESTAMP starts reading at the first record written at or after the given time. TRIM_HORIZON starts at the oldest record in the stream, and LATEST at new records only.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-create.html"] },

  // Task 1.3: data stores
  { id: "dva-1-220", exam: "both", dva: "1.3", saa: "3.3", topic: "dynamodb", type: "multi", hint: "Select TWO.",
    q: "A voting app stores each vote in a DynamoDB table with the contest ID as the partition key and the vote ID as the sort key. During a live final, millions of votes a minute go to one contest, and writes are throttled although the table is far below its capacity. Which changes will spread the writes? (Select TWO.)",
    items: [
      { t: "Append a calculated suffix from 0 to 19 to the contest ID, and add up the shards when the results are read.", ok: true },
      { t: "Make the vote ID the partition key, keep the contest ID as an attribute, and total votes from a stream.", ok: true },
      { t: "Switch the table to provisioned mode, and set its write capacity well above the peak rate of incoming votes.", ok: false, no: "Table capacity doesn't lift the limit of a single partition, about 1,000 write units per second." },
      { t: "Add a global secondary index with the contest ID as its partition key, to take part of the write load.", ok: false, no: "Every vote still goes to one key in the table, and the index would have the same hot key." },
      { t: "Group the votes with BatchWriteItem, so that 25 votes in a batch cost the same capacity as one single write.", ok: false, no: "Each item in a batch uses its own write capacity, so batching doesn't cut the load on the partition." }
    ],
    why: "Each partition serves up to 1,000 write units per second, and all items with one partition key value start on one partition. Sharding the key, or choosing a high-cardinality key, spreads the writes across many partitions.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html"] },

  { id: "dva-1-222", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A batch job must read every item in a 200 GB DynamoDB table and send each one to a validation service. Its single-threaded Scan loop takes 9 hours, but the job must finish within 2 hours. The table has plenty of unused read capacity. What should the developer do?",
    opts: [
      "Run several workers, each calling Scan with the same TotalSegments value and its own Segment number.",
      "Run several workers, each calling the same Scan request with a different value for the Limit parameter.",
      "Switch the Scan to strongly consistent reads, so that each page of results returns twice as many items.",
      "Switch the table to on-demand capacity mode, so that the single Scan loop can consume reads faster."
    ], a: 0,
    no: [null,
      "Every worker would read the table from the start, so they would repeat work instead of splitting it.",
      "Strongly consistent reads use twice the capacity per item. They don't return more items per page.",
      "Capacity isn't the limit. One sequential loop can only fetch one page at a time."],
    why: "A parallel scan divides the table into TotalSegments segments, and each worker scans only the segment named by its Segment value, so the segments are read at the same time.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html"] },

  { id: "dva-1-223", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A product list screen runs a Query on a DynamoDB table by CategoryId and shows only each product's Name and Price. The items average 30 KB because they hold long descriptions, so the screen uses a lot of read capacity. Its reads are already eventually consistent. Which change cuts the read capacity used by this screen?",
    opts: [
      "Add a global secondary index keyed like the table that projects only Name and Price, and query it.",
      "Add a ProjectionExpression for Name and Price to the Query, so that only those two attributes are read.",
      "Add a FilterExpression that drops the description attribute from each item before the items are returned.",
      "Set Select to SPECIFIC_ATTRIBUTES on the Query, so that DynamoDB reads only the attributes that are named."
    ], a: 0,
    no: [null,
      "A projection expression trims the response, but capacity is still charged on the full item size.",
      "Filter expressions remove whole items, not attributes, and they run after the items are read.",
      "That is another way of asking for a projection. Capacity is still based on the full item size."],
    why: "Read capacity depends on the size of the items read. An index that projects only the needed attributes holds small items, so querying it reads far less data than querying the table.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html"] },

  { id: "dva-1-224", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "multi", hint: "Select TWO.",
    q: "A DynamoDB table uses CustomerId as the partition key and sort keys such as ORDER#2026-10-14#8812. To get one customer's October 2026 orders, a developer calls Query with the key condition CustomerId = :c AND contains(SK, :month) and gets a ValidationException. Which key conditions would return those orders? (Select TWO.)",
    items: [
      { t: "CustomerId = :c AND begins_with(SK, :p), with :p set to ORDER#2026-10", ok: true },
      { t: "CustomerId = :c AND SK BETWEEN :a AND :b, with :a set to ORDER#2026-10 and :b to ORDER#2026-11", ok: true },
      { t: "CustomerId = :c AND SK = :p, with :p set to ORDER#2026-10, since equality matches a key prefix", ok: false, no: "Equality matches only a sort key that is exactly ORDER#2026-10." },
      { t: "contains(SK, :month) alone, with the CustomerId condition moved into a FilterExpression", ok: false, no: "A key condition must test the partition key for equality, and contains() isn't allowed in one." },
      { t: "CustomerId = :c AND SK IN (:d1, :d2, ...), with one value for each day of the month", ok: false, no: "IN isn't a supported operator in a key condition expression." }
    ],
    why: "A sort key condition can use =, <, <=, >, >=, BETWEEN or begins_with, but not contains. Because the date sits in a fixed position in the key, a prefix or a range selects one month.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html"] },

  { id: "dva-1-225", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "An app writes a new order to a DynamoDB table keyed on OrderId, then immediately queries a global secondary index on CustomerId to show the customer's orders. Sometimes the new order is missing from the list. Setting ConsistentRead to true on the index query returns a ValidationException. What should the developer do?",
    opts: [
      "Read the new order with a strongly consistent GetItem on the base table, and merge it into the list.",
      "Add a local secondary index on CustomerId to the existing table, and query it with ConsistentRead.",
      "Raise the index's write capacity, so that the index is updated synchronously with the base table.",
      "Write the order with TransactWriteItems, so that the index is updated inside the same transaction."
    ], a: 0,
    no: [null,
      "A local secondary index can only be created with the table and must share its partition key, OrderId.",
      "Enough capacity prevents index throttling, but index updates stay asynchronous.",
      "Transactions can't be performed using indexes, and changes still propagate to the index afterwards."],
    why: "Global secondary indexes are updated asynchronously and support only eventually consistent reads. A strongly consistent read of the item from the base table sees the write at once.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html"] },

  { id: "dva-1-226", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "An app writes 40 items per second to a DynamoDB table in provisioned capacity mode. Each item is 2.5 KB, and the writes are standard PutItem calls, not transactions. How many write capacity units does this traffic need?",
    opts: [
      "120 WCU, because each 2.5 KB write rounds up to 3 KB and uses 3 write units.",
      "100 WCU, because 40 writes of 2.5 KB each add up to 100 KB of data per second.",
      "40 WCU, because one write unit covers any single write of an item up to 4 KB.",
      "240 WCU, because each write needs 2 write units for every KB, after rounding up."
    ], a: 0,
    no: [null,
      "Each write is rounded up to the next 1 KB on its own, so sizes can't be added before rounding.",
      "4 KB is the size of a read unit. Write units cover 1 KB.",
      "Two units per KB applies to transactional writes, not standard ones."],
    why: "One WCU is one write per second of up to 1 KB, and each item is rounded up to the next KB. 2.5 KB rounds to 3 KB, so 40 writes need 40 × 3 = 120 WCU.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html"] },

  { id: "dva-1-227", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A payments service calls TransactWriteItems 50 times per second. Each transaction writes two items: a balance item of 1.5 KB and a ledger item of 0.5 KB. How many write capacity units do these transactions need?",
    opts: [
      "300 WCU: the items round up to 2 KB and 1 KB, which is 3 units, and transactions double that.",
      "100 WCU: the two items add up to 2 KB, so each transaction uses 2 units for both of its writes.",
      "150 WCU: the items round up to 2 KB and 1 KB, and transactions cost the same as standard writes.",
      "200 WCU: the two items add up to 2 KB, and transactions double that to 4 units per transaction."
    ], a: 0,
    no: [null,
      "Items are rounded up one by one, and transactional writes cost twice as much as standard writes.",
      "Transactional writes use 2 write units per KB, twice a standard write.",
      "Each item is rounded up separately, so the 0.5 KB ledger item still counts as a full 1 KB."],
    why: "Each item is rounded up to the next 1 KB on its own: 2 KB plus 1 KB is 3 WCU. Transactional writes cost twice as much, so 6 WCU per transaction times 50 is 300 WCU.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html"] },

  { id: "dva-1-228", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A catalog service reads 120 items per second from a DynamoDB table in provisioned capacity mode, using eventually consistent GetItem calls. Each item is 9 KB. How many read capacity units does this traffic need?",
    opts: [
      "180 RCU: 9 KB rounds up to 12 KB, or 3 units, which is halved to 1.5 for eventual reads.",
      "135 RCU: 9 KB is 2.25 units of 4 KB each, which is then halved for eventual consistency.",
      "360 RCU: 9 KB rounds up to 12 KB, which is 3 units for each read that the service makes.",
      "120 RCU: one eventually consistent read unit covers any single item of up to 16 KB in size."
    ], a: 0,
    no: [null,
      "Item sizes are rounded up to the next 4 KB first, so 9 KB counts as 12 KB.",
      "That is the strongly consistent figure. Eventually consistent reads cost half.",
      "One eventually consistent read of up to 4 KB costs half a unit, so 9 KB costs 1.5 units."],
    why: "Reads are measured in 4 KB units, rounded up per item, so a 9 KB item is 3 units strongly consistent or 1.5 eventually consistent. 120 × 1.5 = 180 RCU.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html"] },

  { id: "dva-1-229", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A sign-up service stores users in a DynamoDB table whose partition key is Username. When two people pick the same name at the same moment, both sign-ups succeed and the second PutItem silently replaces the first user. The second sign-up must fail instead. What should the developer do?",
    opts: [
      "Add ConditionExpression attribute_not_exists(Username) to the PutItem, and handle ConditionalCheckFailedException.",
      "Call GetItem for the username first, and only call PutItem when no item with that username is returned.",
      "Turn on DynamoDB Streams, and have a Lambda function delete the second item whenever a duplicate appears.",
      "Write sign-ups with BatchWriteItem, since each put in a batch fails when an item with that key already exists."
    ], a: 0,
    no: [null,
      "Both requests can pass the check before either one writes, so the race remains.",
      "The second write has already replaced the first user, so there is no duplicate left to find.",
      "Batch puts overwrite existing items, and BatchWriteItem doesn't support condition expressions."],
    why: "A condition expression is checked atomically with the write. attribute_not_exists on the key attribute makes PutItem fail when an item with that key already exists.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html"] },

  { id: "dva-1-230", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "multi", hint: "Select TWO.",
    q: "A Lambda function counts page views in a DynamoDB item that has a numeric Views attribute. It reads the item, adds 1 to Views in code, and writes the item back with PutItem. Under load the count ends up lower than the real number of views. Which UpdateItem calls fix the lost updates without reading the item first? (Select TWO.)",
    items: [
      { t: "UpdateItem with UpdateExpression SET Views = Views + :one, where :one is the number 1", ok: true },
      { t: "UpdateItem with UpdateExpression ADD Views :one, where :one is the number 1", ok: true },
      { t: "UpdateItem with UpdateExpression SET Views = :n, where :n is the value read plus 1", ok: false, no: "It still writes a value computed from an earlier read, so concurrent updates overwrite each other." },
      { t: "UpdateItem with UpdateExpression SET Views = list_append(Views, :one), :one being [1]", ok: false, no: "list_append works on lists, not numbers, so it can't increment a counter." },
      { t: "UpdateItem with UpdateExpression REMOVE Views, then a PutItem with the new count", ok: false, no: "Two separate calls leave a gap where other updates are lost, and REMOVE deletes the counter." }
    ],
    why: "SET with an arithmetic expression, or ADD on a number, increments the value on the server, so concurrent updates are applied in order and none are lost. These atomic counters aren't idempotent, so a retried call counts twice.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html"] },

  { id: "dva-1-231", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A profile service changes a user's email by calling PutItem with the user's key and the new Email attribute. Afterward, the user's other attributes, such as DisplayName and Preferences, are gone. The developer must change Email while leaving every other attribute as it was. What should the developer do?",
    opts: [
      "Call UpdateItem with the key and UpdateExpression SET Email = :e, which changes only that attribute.",
      "Call PutItem with ReturnValues set to ALL_OLD, so that DynamoDB keeps the attributes that weren't sent.",
      "Call BatchWriteItem with a PutRequest for the item, which merges the new attributes into the old item.",
      "Call PutItem with ConditionExpression attribute_exists(Email), so only the Email attribute is replaced."
    ], a: 0,
    no: [null,
      "ALL_OLD returns the replaced item in the response, but the item is still replaced.",
      "A batch put replaces the whole item, just like PutItem.",
      "A condition decides whether the write happens. A successful PutItem still replaces the whole item."],
    why: "PutItem replaces the entire item with the attributes sent. UpdateItem edits only the attributes named in its update expression and keeps the rest.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html"] },

  { id: "dva-1-232", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A data loader writes records to DynamoDB in BatchWriteItem calls of 25 items. Every call returns HTTP 200, yet some records are missing from the table, mostly ones written during busy periods. What should the developer do?",
    opts: [
      "Check each response's UnprocessedItems, and resend those items with exponential backoff until none remain.",
      "Lower each batch to 10 items, since BatchWriteItem drops any items over its per-call limit when busy.",
      "Set ReturnConsumedCapacity to TOTAL on each call, so that DynamoDB writes every item before it returns.",
      "Add a ConditionExpression of attribute_not_exists to each put, so that a failed put raises an exception."
    ], a: 0,
    no: [null,
      "25 items is within the limit, and smaller batches can still come back with unprocessed items under load.",
      "It only reports the capacity used. It doesn't change which items get written.",
      "BatchWriteItem doesn't support condition expressions."],
    why: "BatchWriteItem isn't atomic. Writes that are throttled or fail internally are returned in UnprocessedItems inside a successful response, and AWS recommends resending them with exponential backoff.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchWriteItem.html"] },

  { id: "dva-1-233", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "multi", hint: "Select TWO.",
    q: "A cart page must load 60 products from a DynamoDB table by their ProductId partition keys, in as few requests as possible and without reading any other items. Which actions should the developer take? (Select TWO.)",
    items: [
      { t: "Send all 60 keys in one BatchGetItem request, which accepts up to 100 keys per call.", ok: true },
      { t: "Resend any keys returned in UnprocessedKeys, with exponential backoff, until none remain.", ok: true },
      { t: "Send one Query with the key condition ProductId IN (:p1, :p2, ...) listing all 60 keys.", ok: false, no: "A key condition supports only equality on the partition key, not IN." },
      { t: "Send one Scan with a FilterExpression of ProductId IN (:p1, :p2, ...) for all 60 keys.", ok: false, no: "It returns the right items, but only after reading every item in the table." },
      { t: "Send all 60 keys in one TransactGetItems request, so the read costs less than single reads.", ok: false, no: "Transactional reads cost twice as much as standard reads, not less." }
    ],
    why: "BatchGetItem reads up to 100 items by key in one call. When the response would pass 16 MB or reads are throttled, it returns the rest in UnprocessedKeys for the client to retry.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html"] },

  { id: "dva-1-234", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A loyalty app moves points between two members' items in a DynamoDB table. The sender's balance must be at least the amount moved, and the debit and the credit must both happen or neither may happen. What should the developer do?",
    opts: [
      "Call TransactWriteItems with two Update actions, and put the balance check in the debit's ConditionExpression.",
      "Call BatchWriteItem with both updated items, after checking the sender's balance with a GetItem call.",
      "Call UpdateItem twice, with the balance check on the debit, and undo the debit if the credit call fails.",
      "Call TransactGetItems for both items, then write both with PutItem if the sender has enough points."
    ], a: 0,
    no: [null,
      "A batch isn't atomic and can't carry conditions, so one write can succeed without the other.",
      "A crash between the calls leaves the points debited but never credited.",
      "The reads are consistent, but the writes after them are separate and can interleave with other transfers."],
    why: "TransactWriteItems applies all of its actions or none of them, and a condition that fails cancels the whole transaction.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html"] },

  { id: "dva-1-235", exam: "both", dva: "1.3", saa: "4.3", topic: "dynamodb", type: "multi", hint: "Select TWO.",
    q: "A web app keeps login sessions in a DynamoDB table. Sessions expire 24 hours after they are created, and the app already ignores expired sessions when it reads them. Expired items must then be deleted automatically, without a scheduled cleanup job and without using write capacity. Which actions should the developer take? (Select TWO.)",
    items: [
      { t: "Store each session's expiry time in a Number attribute, as Unix epoch time in seconds.", ok: true },
      { t: "Enable Time to Live on the table, and name that expiry attribute as its TTL attribute.", ok: true },
      { t: "Store each session's expiry time as an ISO 8601 string, such as 2026-10-21T09:00:00Z.", ok: false, no: "TTL ignores items whose TTL attribute isn't a Number." },
      { t: "Store each session's expiry time in a Number attribute, as Unix epoch time in milliseconds.", ok: false, no: "TTL reads the value as seconds, so these items wouldn't expire for thousands of years." },
      { t: "Run an EventBridge Scheduler job every hour that scans for expired sessions and deletes them.", ok: false, no: "It works, but it is the scheduled job the team wants to avoid, and its deletes use write capacity." }
    ],
    why: "TTL deletes items whose TTL attribute holds an epoch-seconds Number in the past, typically within a few days, without consuming write throughput. Until then the item can still be read, so apps check the expiry time themselves.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-before-you-start.html"] },

  { id: "dva-1-236", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "multi", hint: "Select TWO.",
    q: "A DynamoDB table has a stream with the KEYS_ONLY view type, and a Lambda function reads it. A new audit feature needs every change's item as it was before and after the change. Which actions should the developer take? (Select TWO.)",
    items: [
      { t: "Disable the stream, then enable a new stream on the table with the NEW_AND_OLD_IMAGES view type.", ok: true },
      { t: "Create an event source mapping for the function on the new stream, using the table's LatestStreamArn.", ok: true },
      { t: "Call UpdateTable to change the existing stream's StreamViewType to NEW_AND_OLD_IMAGES in place.", ok: false, no: "A stream's view type can't be edited once the stream is set up." },
      { t: "Keep KEYS_ONLY, and have the function call GetItem with each key to get the before and after images.", ok: false, no: "GetItem returns only the item as it is now, so the before image is lost." },
      { t: "Switch the stream to the NEW_IMAGE view type, which also carries the old values in a separate field.", ok: false, no: "NEW_IMAGE holds only the item after the change." }
    ],
    why: "NEW_AND_OLD_IMAGES writes the item before and after each change. A stream's view type can't be changed, so the table needs a new stream, which gets a new ARN for the function to read.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html"] },

  { id: "dva-1-237", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "multi", hint: "Select TWO.",
    q: "A developer runs SELECT * FROM Orders WHERE Status = 'OPEN' with PartiQL ExecuteStatement against a DynamoDB table whose partition key is OrderId. It works, but it uses a large share of the table's read capacity each time. The lookup must stop reading the whole table, and any future SELECT that would scan the full table must be rejected. Which actions should the developer take? (Select TWO.)",
    items: [
      { t: "Create a global secondary index keyed on Status, and select from it as \"Orders\".\"StatusIndex\".", ok: true },
      { t: "Add an IAM policy that denies dynamodb:PartiQLSelect when dynamodb:FullTableScan is true.", ok: true },
      { t: "Rewrite the statement as SELECT OrderId, Status FROM Orders, so fewer attributes are read.", ok: false, no: "Naming attributes trims the response, but the statement still scans every item." },
      { t: "Pass the Status condition in a FilterExpression parameter on the ExecuteStatement call.", ok: false, no: "ExecuteStatement has no FilterExpression parameter, and a filter wouldn't cut the items read anyway." },
      { t: "Add a local secondary index on Status to the existing table, and select from that index.", ok: false, no: "Local secondary indexes can only be created along with the table." }
    ],
    why: "A PartiQL SELECT without an equality or IN condition on the partition key becomes a full table scan. Selecting from an index keyed on the attribute avoids the scan, and the dynamodb:FullTableScan condition key lets IAM block scanning statements.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-reference.select.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ql-iam.html"] },

  { id: "dva-1-238", exam: "both", dva: "1.3", saa: "3.3", topic: "elasticache", type: "mc",
    q: "A gaming company needs an in-memory data store for a global leaderboard that returns the top 100 players by score in milliseconds. The data must be replicated to a second Availability Zone with automatic failover. Which solution meets these requirements?",
    opts: [
      "ElastiCache for Valkey or Redis OSS with a replica in a second AZ, keeping scores in a sorted set.",
      "ElastiCache for Memcached with nodes in two AZs, keeping each player's score under its own cache key.",
      "DynamoDB Accelerator (DAX) in front of a scores table, running a Scan sorted by score on each request.",
      "An RDS for MySQL Multi-AZ instance with an index on the score, and an ORDER BY query on each request."
    ], a: 0,
    no: [null,
      "Memcached has no replication, automatic failover or sorted sets, so ranking would fall to the app.",
      "DAX caches DynamoDB reads, and a Scan doesn't return items sorted by an attribute.",
      "RDS isn't an in-memory store, and a Multi-AZ standby doesn't serve reads."],
    why: "Valkey and Redis OSS offer sorted sets, which keep members ranked by score, and replication groups with automatic failover across AZs. Memcached offers neither.",
    doc: ["https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/SelectEngine.html"] },

  { id: "dva-1-239", exam: "both", dva: "1.3", saa: "3.1", topic: "s3", type: "multi", hint: "Select TWO.",
    q: "An app stores millions of photos in an S3 bucket under keys such as photos/<uuid>.jpg. A new screen must list one user's photos from a given month within milliseconds, but listing the bucket and reading each object's metadata takes minutes. Which actions together meet the requirement? (Select TWO.)",
    items: [
      { t: "Store each photo's metadata in a DynamoDB table keyed on UserId, with the date as sort key and the S3 key.", ok: true },
      { t: "Query that table by UserId with a sort key condition for the month, then fetch the photos by their stored S3 keys.", ok: true },
      { t: "Call ListObjectsV2 with the user ID as the Prefix parameter, since S3 can match keys on any part of the name.", ok: false, no: "A prefix matches only the start of a key, and these keys start with photos/ and a random UUID." },
      { t: "Add object tags for UserId and month to each photo, then call ListObjectsV2 with a filter on those two tags.", ok: false, no: "ListObjectsV2 can't filter by tags, so the app would still have to check every object." },
      { t: "Turn on S3 Inventory, and search its latest report for the user's photos each time the new screen loads.", ok: false, no: "Inventory reports arrive daily or weekly, so they are stale and far too slow to search per request." }
    ],
    why: "S3 finds objects only by key or key prefix. Keeping searchable metadata in a DynamoDB table, keyed the way the app looks things up, turns the lookup into a fast Query that returns the S3 keys.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html"] },

  { id: "dva-1-240", exam: "DVA", dva: "1.3", topic: "dax", type: "mc",
    q: "A team puts a DAX cluster in front of a DynamoDB table and switches the app to the DAX client. Most reads become much faster, but one service that calls GetItem with ConsistentRead set to true sees no improvement at all. What explains this?",
    opts: [
      "DAX passes strongly consistent reads on to DynamoDB and doesn't cache the results.",
      "DAX caches only Query and Scan results, so every GetItem call goes to DynamoDB directly.",
      "The DAX item cache TTL is too short, so these items expire before they are read again.",
      "The DAX cluster has too few nodes, so strongly consistent reads overflow to DynamoDB."
    ], a: 0,
    no: [null,
      "DAX has an item cache for GetItem and BatchGetItem as well as a query cache.",
      "Strongly consistent results are never cached, so the TTL has no effect on them.",
      "Node count affects capacity, not how DAX handles consistent reads."],
    why: "DAX is eventually consistent. It forwards strongly consistent reads and TransactGetItems to DynamoDB and returns the results without caching them, so those calls get no speedup.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.consistency.html"] },

  { id: "dva-1-241", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "multi", hint: "Select TWO.",
    q: "An app serializes customer reports to JSON and stores each one in an attribute of a DynamoDB item. Some reports have grown to 700 KB, and PutItem now fails with a ValidationException about the item size. The JSON compresses to about 90 KB with gzip. Which approaches let the app keep storing these reports? (Select TWO.)",
    items: [
      { t: "Compress the JSON with gzip, and store the result in a Binary attribute of the item.", ok: true },
      { t: "Store the JSON as an object in S3, and keep the object's key in the DynamoDB item.", ok: true },
      { t: "Request a service quota increase that raises the table's maximum item size to 1 MB.", ok: false, no: "The 400 KB item size limit can't be raised." },
      { t: "Store the JSON in a Map attribute instead of a String, since maps don't count toward size.", ok: false, no: "Every attribute type counts toward the item size." },
      { t: "Write the reports with BatchWriteItem, which accepts larger items than PutItem does.", ok: false, no: "Items in a batch have the same 400 KB limit." }
    ],
    why: "A DynamoDB item can't be larger than 400 KB. Compressing large attributes, or keeping them in S3 with a pointer in the item, are the documented ways to store bigger data.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-use-s3-too.html"] },

  { id: "dva-1-242", exam: "both", dva: "1.3", saa: "3.3", topic: "caching", type: "mc",
    q: "An app on DynamoDB builds each user's recommendations list by running several Query calls and combining the results with heavy computation in code. The same lists are requested many times an hour and may be up to 10 minutes old. The team wants to stop repeating the computation. What should the developer do?",
    opts: [
      "Store each computed list in ElastiCache for Valkey or Redis OSS with a 10-minute TTL, and check it before computing.",
      "Put a DAX cluster in front of the table, so that each combined recommendations list is cached once it is computed.",
      "Switch the Query calls to strongly consistent reads, so that each computation runs faster on fresher source data.",
      "Turn on DynamoDB auto scaling for the table, so that the Query calls behind each computation are never throttled."
    ], a: 0,
    no: [null,
      "DAX caches DynamoDB responses such as items and query results. It can't cache a result the app computes itself.",
      "Strongly consistent reads cost more and don't remove the computation.",
      "More capacity doesn't save the computation that runs on every request."],
    why: "DAX caches DynamoDB API calls, so the app's own computed result would still be rebuilt every time. ElastiCache stores any value the app puts in it, and a TTL bounds how stale a list can get.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.html", "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html"] },

  { id: "dva-1-243", exam: "both", dva: "1.3", saa: "3.3", topic: "opensearch", type: "mc",
    q: "A store keeps its product catalog in DynamoDB. Customers now need full-text search over product descriptions, with relevance ranking and tolerance for typos, and results must reflect catalog changes within seconds. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Use the DynamoDB zero-ETL integration to keep an Amazon OpenSearch Service index in sync, and search it.",
      "Add a global secondary index on the description attribute, and Query it with the words the customer typed.",
      "Scan the table with a FilterExpression that uses contains() on the description for each search request.",
      "Export the table to S3 every hour, and run Athena queries with LIKE patterns against the exported data."
    ], a: 0,
    no: [null,
      "Key conditions match whole values or prefixes, with no relevance ranking or typo tolerance.",
      "It reads the whole table for every search, and contains() matches exact substrings without ranking.",
      "Results would be up to an hour old, and LIKE gives no relevance ranking or typo tolerance."],
    why: "OpenSearch Service is built for full-text search with relevance scoring and fuzzy matching. The zero-ETL integration uses OpenSearch Ingestion and DynamoDB Streams to sync the table into an index in near real time, with no pipeline code to run.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/OpenSearchIngestionForDynamoDB.html"] },

  { id: "dva-1-244", exam: "DVA", dva: "1.3", topic: "s3", type: "multi", hint: "Select TWO.",
    q: "An app stores customer settings as JSON objects in an S3 bucket and overwrites each object on every save. After a bug overwrote and deleted several objects, the team couldn't get the earlier contents back. They want to be able to restore any earlier copy of an object in the future. Which actions should the developer take? (Select TWO.)",
    items: [
      { t: "Enable S3 Versioning on the bucket, so that overwrites and deletes keep the earlier versions.", ok: true },
      { t: "To restore an object, copy the wanted version over the current one, or remove its delete marker.", ok: true },
      { t: "Add a lifecycle rule that moves objects to S3 Glacier Flexible Retrieval after one day as a backup.", ok: false, no: "A transition moves the current object. It doesn't keep a copy from before an overwrite." },
      { t: "Turn on server access logging, so that the bucket keeps a record of every PUT with its object data.", ok: false, no: "Access logs record requests, not the contents of the objects." },
      { t: "Use multipart upload for every save, so that S3 keeps each part as a separate copy to recover from.", ok: false, no: "Parts are combined into one object when the upload completes, and the old contents are still replaced." }
    ],
    why: "With versioning on, an overwrite adds a new version and a simple delete adds a delete marker, so earlier versions remain. Copying an older version back, or deleting the marker, restores the object.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManagingDelMarkers.html"] }
);
