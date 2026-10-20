// Question bank batch: DVA tasks 1.1-1.3 gap fill (API Gateway transformations and validation, Step Functions error
// handling, AppSync, Athena and Aurora/RDS from code, OpenSearch, ElastiCache patterns, EFS, Kinesis code details,
// serialization, fault-tolerant calls, choreography). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  { id: "dva-1-301", exam: "DVA", dva: "1.1", topic: "apigateway", type: "mc",
    q: "A REST API method uses an HTTP custom (non-proxy) integration with a legacy inventory service. When a lookup fails, the service still returns HTTP 200 with a body such as {\"error\": \"SKU not found\"}. Clients must receive HTTP 400 in that case, and the legacy service cannot be changed. What should the developer do?",
    opts: [
      "In the integration response mapping template, set $context.responseOverride.status to 400 if the body has an error.",
      "Add an integration response with the selection pattern .*error.* that maps the backend's response to a 400 method response.",
      "Turn on a request validator with a model for the method, so that lookups that will fail are rejected with 400 first.",
      "Change the integration to HTTP proxy, so that API Gateway passes the error from the legacy service back to the client."
    ], a: 0,
    no: [null,
      "For HTTP back ends, the selection pattern is matched against the backend's status code, which is always 200 here, not against the body.",
      "Request validation checks the shape of the incoming request. It can't know that a well-formed SKU doesn't exist in the inventory.",
      "A proxy integration passes the backend's own 200 status through unchanged, so clients would still get 200."
    ],
    why: "A mapping template can override the response status code with $context.responseOverride.status, based on anything in the integration response body. This is how a REST API fixes a backend that reports errors with HTTP 200.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-override-request-response-parameters.html", "https://docs.aws.amazon.com/apigateway/latest/api/API_IntegrationResponse.html"] },

  { id: "dva-1-302", exam: "DVA", dva: "1.1", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A REST API's GET /reports method uses a Lambda integration. Every call must include a from query string parameter and an X-Tenant-Id header, and today the function runs and fails when either is missing. The team wants API Gateway to reject such requests with HTTP 400 before Lambda is invoked, without writing code. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "In the method request, add the from query string parameter and the X-Tenant-Id header, and mark both as required.", ok: true },
      { t: "Set the method's request validator to one that validates query string parameters and headers, then redeploy the API.", ok: true },
      { t: "Add a JSON schema model for the request body with from and X-Tenant-Id as required properties of the model.", ok: false, no: "A body model checks the request payload. A GET request's query string and headers aren't part of the body." },
      { t: "Add a usage plan with an API key requirement, so that calls without the expected header are refused by the stage.", ok: false, no: "Usage plans meter and throttle API keys. They don't check whether other headers or parameters are present." },
      { t: "Map the parameter and header into the integration request, so that API Gateway fails the call when either is null.", ok: false, no: "Parameter mapping passes values through. A missing value doesn't make API Gateway reject the request." }
    ],
    why: "Basic request validation checks that required URI, query string and header parameters are present. The parameters must be marked required in the method request, and the method must use a validator that validates parameters; failures get a 400 without invoking the integration.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-request-validation.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-validation-set-up.html"] },

  { id: "dva-1-303", exam: "DVA", dva: "1.1", topic: "apigateway", type: "mc",
    q: "A REST API validates POST /orders bodies against a JSON schema model. When validation fails, mobile clients receive only {\"message\": \"Invalid request body\"} and can't tell users which field to fix. The team wants the details of each validation failure in the response, without invoking the backend for bad requests. What should the developer do?",
    opts: [
      "Customize the BAD_REQUEST_BODY gateway response to include $context.error.validationErrorString, and redeploy.",
      "Turn off the request validator, and have the backend Lambda function validate the body and return the field-level errors.",
      "Enable CloudWatch execution logging on the stage, and have the clients read the validation details from the logs.",
      "Add an integration response for 400 with a mapping template that copies the validation errors into the response body."
    ], a: 0,
    no: [null,
      "This would work, but every bad request would then invoke the backend, which the team wants to avoid.",
      "Execution logs do record the reason, but clients can't read the API's CloudWatch logs, and they need the details in the response.",
      "A request that fails validation never reaches the integration, so no integration response is ever applied to it."
    ],
    why: "A failed body validation returns the BAD_REQUEST_BODY gateway response. Its response template can use $context.error.validationErrorString, which holds the detailed validation message.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/supported-gateway-response-types.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-mapping-template-reference.html"] },

  { id: "dva-1-304", exam: "DVA", dva: "1.1", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A REST API method with Lambda proxy integration must return PNG thumbnails that browsers display directly. The function reads the image bytes from S3. Clients currently receive a garbled text body instead of a valid image. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Have the function base64-encode the image bytes in body and set isBase64Encoded to true in its response.", ok: true },
      { t: "Add image/png, or */* for browsers, to the API's binary media types, and then redeploy the API to its stage.", ok: true },
      { t: "Set contentHandling to CONVERT_TO_TEXT on the integration response, so the image passes through as text.", ok: false, no: "CONVERT_TO_TEXT turns a binary payload into a base64 string, which is the opposite of what the browser needs." },
      { t: "Have the function return the image bytes decoded as a UTF-8 string in body, with Content-Type set to image/png.", ok: false, no: "Arbitrary bytes don't survive as a UTF-8 string in the JSON response. Binary data must be base64-encoded." },
      { t: "Turn on payload compression for the API with a minimum compression size of 0, so binary bodies keep their bytes.", ok: false, no: "Compression shrinks responses for clients that accept it. It doesn't make API Gateway treat a body as binary." }
    ],
    why: "With a Lambda proxy integration, the function must return binary data base64-encoded with isBase64Encoded set to true. API Gateway decodes it to raw bytes only for content types listed in the API's binaryMediaTypes.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-payload-encodings.html"] },

  { id: "dva-1-305", exam: "DVA", dva: "1.1", topic: "apigateway", type: "mc",
    q: "An HTTP API routes requests to a private backend through an HTTP proxy integration. The backend team wants every request to carry an X-Request-Id header set to API Gateway's request ID, and it must never receive the X-Debug header that some clients send. The team doesn't want to add a Lambda function. What should the developer do?",
    opts: [
      "Add parameter mappings to the integration: append:header.X-Request-Id with $context.requestId, and remove:header.X-Debug.",
      "Add a request mapping template to the integration that writes X-Request-Id from $context.requestId and drops X-Debug.",
      "Attach a Lambda authorizer that adds X-Request-Id to the request and strips X-Debug before the request is forwarded.",
      "Define a stage variable named requestId, and reference it in the route's settings so it is sent to the backend as a header."
    ], a: 0,
    no: [null,
      "Mapping templates are a REST API feature. HTTP APIs don't support request body transformation and use parameter mapping instead.",
      "An authorizer returns an allow or deny decision and context. It can't edit the request's headers, and it would add a function anyway.",
      "A stage variable holds a fixed value per stage, not a different ID for each request, and it can't remove a client's header."
    ],
    why: "HTTP APIs transform requests with parameter mapping. An integration can append, overwrite or remove headers and query strings, using values such as $context.requestId, with no code.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-parameter-mapping.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html"] },

  { id: "dva-1-306", exam: "DVA", dva: "1.1", topic: "sdk", type: "mc",
    q: "A batch loader on EC2 uses one AWS SDK client to write millions of items to a single DynamoDB table as fast as it can. It hits frequent throttling, and many writes fail after the SDK's retries run out. The developer wants the SDK itself to lower the rate at which it sends new requests whenever throttling occurs, without writing rate-limiting code. What should the developer do?",
    opts: [
      "Set the client's retry mode to adaptive, which adds a client-side rate limiter that slows requests after throttling.",
      "Keep the standard retry mode, and raise max attempts to 10 so each throttled write is retried more times before it fails.",
      "Set the client's retry mode to legacy, so that the SDK uses its original retry behavior for throttling errors from the table.",
      "Set max attempts to 1, and catch each throttling exception in the loader's code to send the item again right away."
    ], a: 0,
    no: [null,
      "More attempts give each write more chances, but the SDK still sends new requests at full speed, so throttling continues.",
      "Legacy mode exists for backward compatibility. It has no client-side rate limiter and keeps retrying at full rate.",
      "Max attempts of 1 turns off the SDK's retries, and resending at once without backoff makes the throttling worse."
    ],
    why: "The SDKs' adaptive retry mode includes everything in standard mode plus a client-side rate limiter that tracks throttling and slows the client's requests, including first attempts. It suits a client that targets one resource and expects throttling.",
    doc: ["https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html"] },

  { id: "dva-1-307", exam: "both", dva: "1.1", saa: "2.1", topic: "eventbridge", type: "mc",
    q: "Order events arrive on an EventBridge event bus. Each event must be POSTed to a partner's HTTPS webhook with an API key header. The partner accepts at most 20 requests per second, failed calls should be retried, and events that still can't be delivered must be kept for review. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Add a rule whose target is an API destination with an API key connection and a rate limit of 20 per second, plus a DLQ.",
      "Add a rule that targets a Lambda function with reserved concurrency of 20, which calls the webhook and retries errors in code.",
      "Add a rule that sends events to an SQS queue, and run a worker on EC2 that reads the queue and calls the webhook 20 times a second.",
      "Add a rule that targets an API Gateway REST API, with a usage plan that throttles the API to 20 requests per second."
    ], a: 0,
    no: [null,
      "Concurrency caps simultaneous calls, not calls per second, and the team would have to write and run the calling and retry code.",
      "This can work, but it means building, patching and scaling a worker fleet, which is far more overhead than a managed target.",
      "A usage plan throttles callers of that API by rejecting excess requests. It doesn't deliver events to the partner's webhook."
    ],
    why: "EventBridge API destinations call HTTP endpoints directly. The connection stores the authorization (here an API key), the destination sets an invocation rate limit, and the target's retry policy and dead-letter queue handle failures.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-api-destinations.html"] },

  { id: "dva-1-308", exam: "both", dva: "1.1", saa: "2.1", topic: "architecture", type: "multi", hint: "Select TWO.",
    q: "An order saga is run today by a Step Functions orchestrator that calls the order, inventory and payment services. The team plans to replace it with choreography: each service will publish events to an EventBridge bus and react to the others' events. Which new responsibilities will the team take on with this change? (Select TWO.)",
    items: [
      { t: "Each service must handle its own retries, timeouts and compensating actions when it sees a failure event.", ok: true },
      { t: "Following one order end to end gets harder, so services need shared correlation IDs in their logs and traces.", ok: true },
      { t: "The bus becomes the central controller of the saga, so the team must define each order's steps on the bus.", ok: false, no: "An event bus only routes events. In choreography no component controls the sequence; each service decides what to do." },
      { t: "Each time a new service subscribes to order events, the order service's code must change to call it as well.", ok: false, no: "That is what choreography removes. New consumers add their own rules, and the publisher doesn't change." },
      { t: "Because services react only to events, their handlers no longer need to be idempotent against repeats.", ok: false, no: "Saga participants must still be idempotent, because events and retries can make a step run more than once." }
    ],
    why: "In saga choreography there's no orchestrator, so timeouts, retries and compensation move into each participant, and end-to-end monitoring is harder than with orchestration. Participants must also stay idempotent.",
    doc: ["https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/saga-choreography.html"] },

  { id: "dva-1-309", exam: "DVA", dva: "1.1", topic: "stepfunctions", type: "mc",
    q: "A Task state in a JSONPath state machine charges a card. Its Catch field sends States.ALL to a NotifyFailure state. NotifyFailure needs the orderId and customerEmail from the Task's input, but its input contains only the Error and Cause fields, so the notification fails. What should the developer change?",
    opts: [
      "Set ResultPath to \"$.error\" in the catcher, so that the error output is added to the original input instead of replacing it.",
      "Set InputPath on the NotifyFailure state to \"$.orderId\", so that it selects the order ID from the original input.",
      "Add a ResultSelector to the Task state that keeps orderId and customerEmail in the state's output when it fails.",
      "Set OutputPath on the Task state to \"$\", so that the full state input is passed on to the catcher's Next state."
    ], a: 0,
    no: [null,
      "By the time NotifyFailure runs, the catcher has already replaced its input with the error, so there is no orderId to select.",
      "ResultSelector shapes a successful task result. It isn't applied to the error output that a catcher passes on.",
      "OutputPath filters the output of a successful state. A caught error goes through the catcher's own ResultPath."
    ],
    why: "A catcher's ResultPath defaults to $, so the error output replaces the whole state input. Setting ResultPath to a field such as $.error adds the error to the original input, keeping both for the next state.",
    doc: ["https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html"] },

  { id: "dva-1-310", exam: "DVA", dva: "1.1", topic: "stepfunctions", type: "multi", hint: "Select TWO.",
    q: "Thousands of Step Functions executions start together each hour, and each calls a partner API that throttles them. The Task's retrier uses IntervalSeconds 2, BackoffRate 2 and MaxAttempts 8. Logs show the executions retrying at the same moments, which keeps the API overloaded, and late retries waiting several minutes. Retries must be spread out, and no wait may exceed 30 seconds. Which changes meet these requirements? (Select TWO.)",
    items: [
      { t: "Add JitterStrategy set to FULL to the retrier, so each wait is randomized between zero and the computed interval.", ok: true },
      { t: "Add MaxDelaySeconds set to 30 to the retrier, so the backoff stops growing once the wait reaches 30 seconds.", ok: true },
      { t: "Raise BackoffRate to 3, so that each execution's waits grow faster and the retries move further apart in time.", ok: false, no: "Every execution would still compute the same waits and retry together, and the waits would grow longer, not shorter." },
      { t: "Add a Wait state of 10 seconds before the Task, so that each execution pauses once before calling the partner.", ok: false, no: "A fixed wait delays all executions by the same amount, so they still call and retry at the same moments." },
      { t: "Set MaxConcurrency to 20 on the Task state, so that no more than 20 of the executions call the partner at once.", ok: false, no: "MaxConcurrency is a Map state field for its own iterations. It can't limit separate executions of a Task state." }
    ],
    why: "Retriers support JitterStrategy FULL, which randomizes each retry interval to spread out simultaneous retries, and MaxDelaySeconds, which caps the exponential backoff interval.",
    doc: ["https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html"] },

  { id: "dva-1-311", exam: "DVA", dva: "1.1", topic: "stepfunctions", type: "mc",
    q: "A Task state uses .waitForTaskToken to send work to an external worker, with TimeoutSeconds set to 3600. Its Catch field has one catcher with ErrorEquals [\"States.TaskFailed\"] that goes to an AlertOps state. When a worker crashes and never returns the token, the execution fails after an hour instead of going to AlertOps. What should the developer change?",
    opts: [
      "Add States.Timeout to the catcher's ErrorEquals, as States.TaskFailed doesn't match timeouts.",
      "Add a Retry field for States.TaskFailed with MaxAttempts 3, so the timed-out task is retried first.",
      "Add ResultPath \"$.error\" to the catcher, so that the timeout's error output is kept with the input.",
      "Replace the callback task with a Lambda function task that runs the worker's job in the same state."
    ], a: 0,
    no: [null,
      "A retrier for States.TaskFailed doesn't match a timeout either, and retrying won't revive a crashed worker.",
      "ResultPath decides what the catcher passes to AlertOps. It doesn't change which errors the catcher matches.",
      "That rewrites the design around a short-lived function. The problem is only which errors the catcher matches."
    ],
    why: "A Task that runs longer than TimeoutSeconds fails with States.Timeout. States.TaskFailed matches any known error except States.Timeout, so the catcher must list States.Timeout (or States.ALL, last) to handle it.",
    doc: ["https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html"] },

  { id: "dva-1-312", exam: "DVA", dva: "1.1", topic: "stepfunctions", type: "mc",
    q: "A Standard workflow must run a container on ECS Fargate that exports a large dataset, and move to the next state only after the container's task has stopped. Today a Lambda function starts the task, and a loop of Wait, a second Lambda function that calls DescribeTasks, and Choice states polls it. The container's code cannot be changed. How can the developer remove the polling loop with the least code?",
    opts: [
      "Use a Task state with the resource arn:aws:states:::ecs:runTask.sync, which starts the ECS task and waits for it to stop.",
      "Use a Task state with the resource arn:aws:states:::ecs:runTask, which returns after the ECS task completes.",
      "Use a Task state with arn:aws:states:::ecs:runTask.waitForTaskToken, and pass the token to the container.",
      "Move the export to an Express workflow that calls arn:aws:states:::ecs:runTask.sync and waits for it to finish."
    ], a: 0,
    no: [null,
      "The Request Response pattern moves on as soon as RunTask returns, while the container is still starting.",
      "A callback needs the container to call SendTaskSuccess with the token, which requires changing its code.",
      "Express workflows support only the Request Response pattern, not .sync, and the workflow is Standard anyway."
    ],
    why: "The Run a Job (.sync) integration pattern makes Step Functions start the ECS task and wait for it to complete before moving on, with no polling code.",
    doc: ["https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html", "https://docs.aws.amazon.com/step-functions/latest/dg/connect-ecs.html"] },

  { id: "dva-1-313", exam: "DVA", dva: "1.1", topic: "appsync", type: "multi", hint: "Select TWO.",
    q: "An AppSync GraphQL API uses Amazon Cognito user pools as its default authorization mode. A public website must now call the listProducts query, which returns Product objects, without users signing in. All mutations must still require a signed-in user pool user. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Add API_KEY as an additional authorization mode on the API, and create an API key for the website to send.", ok: true },
      { t: "Mark the listProducts query and the Product type with both @aws_api_key and @aws_cognito_user_pools.", ok: true },
      { t: "Make API_KEY the default authorization mode, and add the @aws_auth directive to each mutation in the schema.", ok: false, no: "@aws_auth can't be used along with additional authorization modes, and changing the default opens every unmarked field to the key." },
      { t: "Set the user pool configuration's default action to ALLOW, so that requests without a token can run queries.", ok: false, no: "The default action applies to signed-in user pool users. A request without a valid token still fails." },
      { t: "Put the GraphQL API behind an API Gateway usage plan, and give the website an API key from the usage plan.", ok: false, no: "AppSync doesn't use API Gateway usage plans. An API Gateway key isn't an AppSync authorization mode." }
    ],
    why: "AppSync can use several authorization modes at once. Fields and types without a directive use the default mode, and directives such as @aws_api_key open specific fields and types to an additional mode.",
    doc: ["https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html"] },

  { id: "dva-1-314", exam: "DVA", dva: "1.1", topic: "appsync", type: "mc",
    q: "In an AppSync API, the addComment mutation must first send the comment text to an internal moderation service over HTTP, reject the mutation if the service flags it, and otherwise save the comment to a DynamoDB table. The team wants no Lambda functions in this path. What should the developer configure for addComment?",
    opts: [
      "A pipeline resolver with two functions: one on an HTTP data source for moderation, then one on the DynamoDB data source.",
      "A unit resolver on the HTTP data source for moderation whose response handler then writes the comment to the DynamoDB table.",
      "A unit resolver on a NONE data source whose request handler calls the moderation service and then writes to DynamoDB itself.",
      "A subscription on addComment that sends each new comment to the moderation service, then deletes flagged ones afterward."
    ], a: 0,
    no: [null,
      "A unit resolver runs against one data source, so its handlers can't also send a request to a second data source.",
      "A NONE data source only passes data through locally. It can't call an HTTP service or write to a table.",
      "Subscriptions push changes to clients. Saving first and deleting later would let flagged comments be stored and seen."
    ],
    why: "Pipeline resolvers run a sequence of AppSync functions, each against its own data source, for one field. A function can call util.error to stop the pipeline, such as when moderation flags the comment.",
    doc: ["https://docs.aws.amazon.com/appsync/latest/devguide/pipeline-resolvers-js.html", "https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-overview-js.html"] },

  { id: "dva-1-315", exam: "DVA", dva: "1.1", topic: "athena", type: "multi", hint: "Select TWO.",
    q: "A Lambda function runs an Athena query by calling StartQueryExecution and then immediately calls GetQueryResults with the returned query execution ID. The call often fails with an InvalidRequestException because the query hasn't finished, and when it succeeds, reports with 5,000 rows show only the first 1,000. Which changes should the developer make? (Select TWO.)",
    items: [
      { t: "Call GetQueryExecution until the query's state is SUCCEEDED, FAILED or CANCELLED before reading any results.", ok: true },
      { t: "Call GetQueryResults in a loop, passing each response's NextToken, until a response comes back without one.", ok: true },
      { t: "Set MaxResults to 10000 in GetQueryResults, so that every row of a large report comes back in a single response.", ok: false, no: "MaxResults accepts at most 1,000 rows per call, so larger results still need pagination." },
      { t: "Pass a ClientRequestToken to StartQueryExecution, so that the call waits until the query has finished running.", ok: false, no: "ClientRequestToken makes the start request idempotent. StartQueryExecution still returns at once." },
      { t: "Turn on result reuse in StartQueryExecution, so the call returns the rows of the query directly in its response.", ok: false, no: "Result reuse lets a repeated query reuse earlier results. Rows are still read with GetQueryResults." }
    ],
    why: "Athena runs queries asynchronously: StartQueryExecution returns an ID, and the query moves through QUEUED and RUNNING to a final state that GetQueryExecution reports. GetQueryResults then returns at most 1,000 rows per page, with NextToken for the rest.",
    doc: ["https://docs.aws.amazon.com/athena/latest/APIReference/API_GetQueryResults.html", "https://docs.aws.amazon.com/athena/latest/APIReference/API_QueryExecutionStatus.html"] },

  { id: "dva-1-316", exam: "DVA", dva: "1.1", topic: "athena", type: "multi", hint: "Select TWO.",
    q: "A developer's code calls StartQueryExecution for Athena in a Region where the account has never used Athena, with no workgroup set. The call fails with an error saying that no output location was provided. Queries run fine from the console, where the developer set a query result location in the console's settings. Which changes will let the code's queries run? (Select TWO.)",
    items: [
      { t: "Pass ResultConfiguration with an OutputLocation in a writable S3 bucket in each StartQueryExecution call.", ok: true },
      { t: "Pass WorkGroup naming a workgroup that sets a query result location and overrides client-side settings.", ok: true },
      { t: "Pass QueryExecutionContext with the database name, so that Athena writes the results under that database.", ok: false, no: "QueryExecutionContext sets the database and catalog the query reads. It doesn't say where results are written." },
      { t: "Pass a ClientRequestToken in each call, so that Athena can store the results of each query by that token.", ok: false, no: "ClientRequestToken only makes a start request idempotent. It has nothing to do with the result location." },
      { t: "Keep relying on the location set in the console's settings, and grant the code's role access to that bucket.", ok: false, no: "The console setting applies only to the console. Calls through the API or drivers don't use it." }
    ],
    why: "Athena now needs a query result location from the client (ResultConfiguration.OutputLocation) or from a workgroup that overrides client-side settings. The console's location setting doesn't apply to API calls.",
    doc: ["https://docs.aws.amazon.com/athena/latest/ug/query-results-specify-location.html", "https://docs.aws.amazon.com/athena/latest/APIReference/API_StartQueryExecution.html"] },

  { id: "dva-1-317", exam: "DVA", dva: "1.2", topic: "kinesis", type: "mc",
    q: "A producer writes JSON order events to a Kinesis data stream with PutRecord. A Python Lambda function reads the stream through an event source mapping and calls json.loads(record[\"kinesis\"][\"data\"]) on each record, which fails with a JSON decode error on every record. The stream uses server-side encryption. What should the developer do?",
    opts: [
      "Base64-decode the record's data field first, and then parse the decoded bytes as JSON in the function's code.",
      "Have the producer base64-encode each JSON event before PutRecord, so the function receives text that it can parse.",
      "Grant the function's role kms:Decrypt for the stream's key, and decrypt the data field before parsing it as JSON.",
      "Add a filter on data to the event source mapping, so that Lambda only passes on records that contain valid JSON."
    ], a: 0,
    no: [null,
      "The event already base64-encodes the record data, so encoding it at the producer would only add a second layer to undo.",
      "Kinesis decrypts records for authorized readers before Lambda gets them. The field is base64 text, not ciphertext.",
      "The events are valid JSON; the filter would not fix the parsing, which still needs the data decoded first."
    ],
    why: "In the Kinesis event that Lambda passes to a function, each record's data field is base64-encoded. The function must decode it before parsing the payload.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis.html", "https://docs.aws.amazon.com/lambda/latest/dg/with-kinesis-example.html"] },

  { id: "dva-1-318", exam: "DVA", dva: "1.1", topic: "kinesis", type: "mc",
    q: "A custom consumer reads one shard of a Kinesis data stream with GetRecords, always passing the NextShardIterator from the previous call. Some batches take about 8 minutes to process, and the next GetRecords call after such a batch fails with ExpiredIteratorException. The consumer must continue right after the last record it processed, with no gaps and no rereading. What should the developer do?",
    opts: [
      "Get a new iterator with AFTER_SEQUENCE_NUMBER and the last processed record's sequence number.",
      "Call GetShardIterator with TRIM_HORIZON, then skip each record whose sequence number was already processed.",
      "Call GetShardIterator with LATEST, so the consumer starts again from the newest records arriving in the shard.",
      "Raise the stream's data retention period, so that the shard iterators the consumer holds stay valid for longer."
    ], a: 0,
    no: [null,
      "This rereads the shard from its oldest record, which wastes reads and time even if duplicates are skipped.",
      "LATEST skips every record that arrived while the batch was being processed, which leaves a gap.",
      "Retention controls how long records are kept. A shard iterator still expires 5 minutes after it is returned."
    ],
    why: "A shard iterator expires 5 minutes after it is returned. After a long pause, the consumer gets a fresh iterator positioned AFTER_SEQUENCE_NUMBER of the last record it processed.",
    doc: ["https://docs.aws.amazon.com/kinesis/latest/APIReference/API_GetShardIterator.html", "https://docs.aws.amazon.com/kinesis/latest/APIReference/API_GetRecords.html"] },

  { id: "dva-1-319", exam: "DVA", dva: "1.3", topic: "elasticache", type: "multi", hint: "Select TWO.",
    q: "An app updates ElastiCache with a write-through strategy: every database write also sets the item in the cache, and reads use only the cache. After a node was replaced, reads for items that hadn't changed since then returned not found. The cache is also filling with items that are written often but rarely read. Which changes fix both problems? (Select TWO.)",
    items: [
      { t: "On a cache miss, read the item from the database, store it in the cache, and return it, as lazy loading does.", ok: true },
      { t: "Set a time to live on each item that the write path and the read path put in the cache, such as 300 seconds.", ok: true },
      { t: "Switch the cluster to the Memcached engine, which copies all of its data to a new node when a node is replaced.", ok: false, no: "Memcached doesn't replicate data, so a replaced node starts empty there too." },
      { t: "Write each item to the cache before writing it to the database, so that the cache is always populated first.", ok: false, no: "The order of the writes doesn't matter. A replaced node still starts empty, and every write still adds an item." },
      { t: "Scale the cluster up to a larger node type, so that the rarely read items are less likely to be evicted.", ok: false, no: "More memory keeps more unread data around. It neither refills a new node nor removes the waste." }
    ],
    why: "Write-through alone leaves data missing on a new node and fills the cache with items that are never read. Adding lazy loading for misses and a TTL on every write combines the strengths of both strategies.",
    doc: ["https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html"] },

  { id: "dva-1-320", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A Lambda function runs in private subnets so it can reach an internal service, and it must also write to a DynamoDB table in the same Region. The subnets have no route to the internet, and the security team won't allow one. Calls to DynamoDB time out. Which solution is MOST cost-effective?",
    opts: [
      "Create a gateway VPC endpoint for DynamoDB, and associate it with the route tables used by the function's private subnets.",
      "Create an interface VPC endpoint for DynamoDB, and configure the SDK client to use the endpoint's DNS name.",
      "Add a NAT gateway in a public subnet, and route the private subnets' internet traffic through the NAT gateway.",
      "Move the function to public subnets whose route tables send 0.0.0.0/0 to the VPC's internet gateway."
    ], a: 0,
    no: [null,
      "This also keeps traffic private, but interface endpoints have hourly and data charges, while gateway endpoints are free.",
      "A NAT gateway gives the subnets an internet route, which isn't allowed, and it adds hourly and data charges.",
      "Lambda functions don't get public IP addresses, so public subnets give them no internet path at all."
    ],
    why: "A gateway endpoint for DynamoDB is a route table target that reaches DynamoDB over the AWS network with no internet gateway or NAT device, at no extra charge.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-ddb.html"] },

  { id: "dva-1-321", exam: "DVA", dva: "1.3", topic: "efs", type: "multi", hint: "Select TWO.",
    q: "Several ECS tasks on Fargate (platform version 1.4.0) must read and write the same files, and the files must survive when tasks stop. The team created an EFS file system with mount targets in the tasks' subnets and an access point. Access must use the task IAM role and be encrypted in transit. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Add an EFS volume to the task definition with the access point, transit encryption and IAM on, and mount it.", ok: true },
      { t: "Allow inbound NFS on TCP port 2049 to the mount targets' security group from the tasks' security group.", ok: true },
      { t: "Add a bind mount volume to the task definition, with the shared directory as its host path on each task.", ok: false, no: "A bind mount on Fargate uses the task's own ephemeral storage. It isn't shared between tasks and is lost when they stop." },
      { t: "Give the task execution role elasticfilesystem:ClientMount, since it's the role ECS uses to mount the file system.", ok: false, no: "With IAM authorization on, ECS mounts with the task IAM role. The execution role pulls images and writes logs." },
      { t: "Install amazon-efs-utils in the container image, and run the mount command from the container's entry point.", ok: false, no: "Fargate mounts EFS volumes from the task definition. Containers don't run their own mount commands." }
    ],
    why: "ECS mounts EFS through a task definition volume with efsVolumeConfiguration plus a container mountPoints entry; IAM authorization and access points require transit encryption. The mount targets must accept NFS (port 2049) from the tasks.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/specify-efs-config.html", "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/efs-volumes.html"] },

  { id: "dva-1-322", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A DynamoDB table stores each user's settings as one String attribute holding serialized JSON. To change one setting, the app reads the item, parses the JSON, edits it and writes it back, and concurrent edits to different settings overwrite each other. Each setting change must be one request that doesn't read the item first. What should the developer do?",
    opts: [
      "Store settings as a Map attribute, and change a setting with UpdateItem and SET settings.theme = :t.",
      "Store settings as a String Set attribute, and change one setting with UpdateItem and an ADD on the set.",
      "Store settings as gzip-compressed JSON in a Binary attribute, and overwrite it with each PutItem call.",
      "Keep the JSON string, and add a version attribute that each PutItem checks in a ConditionExpression."
    ], a: 0,
    no: [null,
      "A set holds unique scalar values with no names, so it can't hold name-value settings.",
      "Compression doesn't help: the app must still read, edit and rewrite the whole value on every change.",
      "This stops lost updates, but each change still needs a read first and a retry when the version is stale."
    ],
    why: "A Map is DynamoDB's native document type for JSON-like objects. An update expression can set one nested attribute through its document path in a single request, leaving the others untouched.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.NamingRulesDataTypes.html"] },

  { id: "dva-1-323", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "A Node.js service uses the AWS SDK for JavaScript v3 DynamoDBClient and calls PutItemCommand with Item: { orderId: \"o-17\", total: 42, items: [...] }. The call fails because the item isn't in the format the API expects. The developer wants to keep passing plain JavaScript objects, with total stored as a Number. What should the developer do?",
    opts: [
      "Wrap the client in DynamoDBDocumentClient from @aws-sdk/lib-dynamodb, and call its PutCommand with the object.",
      "Pass JSON.stringify(item) as the Item parameter, so that the client sends the object as one serialized document.",
      "Write each attribute with the S type descriptor, such as { total: { S: \"42\" } }, and convert the values in code.",
      "Run a PartiQL INSERT with ExecuteStatement, passing the object's values as plain Parameters in the same order."
    ], a: 0,
    no: [null,
      "The low-level API needs a map of typed attribute values, not a JSON string, so the call still fails.",
      "This is accepted, but it stores total as a String instead of a Number and means hand-writing descriptors.",
      "ExecuteStatement's Parameters are also typed attribute values, so plain values still need marshalling."
    ],
    why: "The low-level DynamoDB API needs each value wrapped with a data type descriptor. The document client marshalls native JavaScript types into those attribute values and back.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.SDKs.Interfaces.html", "https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_dynamodb_code_examples.html"] },

  { id: "dva-1-324", exam: "DVA", dva: "1.3", topic: "dynamodb", type: "mc",
    q: "An app calls Query on a customer's orders with Limit set to 50 and a FilterExpression that keeps only orders with status SHIPPED. Some calls return far fewer than 50 orders, some return none, yet the customer has hundreds of shipped orders. Every response includes a LastEvaluatedKey. What should the developer do to show all of the matching orders?",
    opts: [
      "Keep calling Query with ExclusiveStartKey set to each LastEvaluatedKey until a response no longer includes one.",
      "Remove the Limit parameter, so that one Query call returns every matching order in its response.",
      "Switch from Query to a Scan with the same FilterExpression, which applies the filter before the limit.",
      "Set ConsistentRead to true on the Query, so that the filter sees every item that has been written."
    ], a: 0,
    no: [null,
      "A Query still stops at 1 MB of items read, so a large result is still split across pages.",
      "Scan applies Limit and the 1 MB cap before the filter too, and it reads the whole table besides.",
      "Consistency doesn't change paging. The limit counts items read, before the filter removes any."
    ],
    why: "Query applies Limit and the 1 MB page size to the items it reads before the FilterExpression runs, so a page can hold few or no matches. The app must keep paging with LastEvaluatedKey until it is absent.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.Pagination.html"] },

  { id: "dva-1-325", exam: "both", dva: "1.3", saa: "3.3", topic: "dynamodb", type: "mc",
    q: "A new DynamoDB table will store readings from 40,000 sensors that belong to 6 customers. Each sensor sends a reading every 10 seconds, all day. The app's main read is one sensor's readings over a time range. Writes must spread evenly across partitions. Which primary key should the developer choose?",
    opts: [
      "Partition key SensorId and sort key Timestamp, then query one sensor with a sort key range condition.",
      "Partition key CustomerId and sort key SensorId#Timestamp, then query by customer and a key prefix.",
      "Partition key Date (one value per day) and sort key SensorId#Timestamp, then query each day's partition.",
      "Partition key ReadingId (a random UUID) with no sort key, then filter one sensor's readings with Scan."
    ], a: 0,
    no: [null,
      "Six customer values concentrate every write on a few partition key values, which makes hot partitions.",
      "Every write on a given day goes to the same partition key value, which is the classic hot key.",
      "Random keys spread writes well, but finding one sensor's readings means scanning the whole table."
    ],
    why: "The partition key should have many distinct values that are accessed evenly; 40,000 sensors writing at similar rates fit that. A Timestamp sort key lets one Query read a sensor's time range.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-uniform-load.html"] },

  { id: "dva-1-326", exam: "DVA", dva: "1.3", topic: "opensearch", type: "multi", hint: "Select TWO.",
    q: "A Lambda function indexes product documents into an Amazon OpenSearch Service domain that has a public endpoint. Fine-grained access control is off, and the domain access policy allows only specific IAM roles. The function sends plain HTTPS POST requests to the domain endpoint with an HTTP library, and every request fails with HTTP 403. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Sign each request with Signature Version 4, using the credentials of the function's execution role.", ok: true },
      { t: "Add the execution role to the domain access policy with es:ESHttpPost and es:ESHttpPut on the domain/*.", ok: true },
      { t: "Index documents with the SDK's OpenSearch Service configuration client, which signs its calls for you.", ok: false, no: "The configuration API manages domains, such as instance types. Documents go to the domain endpoint." },
      { t: "Send the domain's master user name and password with each request as HTTP basic authentication.", ok: false, no: "A master user and basic auth belong to fine-grained access control, which this domain doesn't use." },
      { t: "Create an API key for the domain, and send it in an x-api-key header with each request to the domain.", ok: false, no: "OpenSearch Service domains don't use API keys. A policy naming IAM roles needs signed requests." }
    ],
    why: "When a domain access policy names IAM principals, requests to the OpenSearch APIs must be signed with SigV4, and the policy must allow that principal the es:ESHttp* actions it uses.",
    doc: ["https://docs.aws.amazon.com/opensearch-service/latest/developerguide/ac.html", "https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-signing-service-requests.html"] },

  { id: "dva-1-327", exam: "DVA", dva: "1.3", topic: "aurora", type: "mc",
    q: "Several Lambda functions that are not attached to a VPC must run SQL against an Aurora PostgreSQL cluster. The team doesn't want to add VPC networking to the functions, bundle a database driver, manage connection pools, or keep database credentials in code. Which solution needs the LEAST development effort?",
    opts: [
      "Enable the RDS Data API on the cluster, keep its credentials in Secrets Manager, and call ExecuteStatement.",
      "Create an RDS Proxy for the cluster, and connect to its endpoint through the PostgreSQL driver in each function.",
      "Turn on IAM database authentication, and connect through the driver with a token from the RDS signer.",
      "Use Athena federated queries with a PostgreSQL connector, and call StartQueryExecution from each function."
    ], a: 0,
    no: [null,
      "A proxy still needs a database driver and functions attached to the VPC to reach its endpoint.",
      "IAM tokens remove stored passwords, but the functions still need a driver and a network path into the VPC.",
      "This adds a connector function and an asynchronous query API, and it isn't meant for the app's transactional SQL."
    ],
    why: "The RDS Data API gives Aurora an HTTPS endpoint for SQL. Callers pass the cluster ARN and a Secrets Manager secret ARN, with no driver, persistent connection or VPC access needed.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/data-api.html", "https://docs.aws.amazon.com/rdsdataservice/latest/APIReference/API_ExecuteStatement.html"] },

  { id: "dva-1-328", exam: "DVA", dva: "1.3", topic: "rds", type: "mc",
    q: "A service on EC2 connects to RDS for MySQL with IAM database authentication. At startup it generates one authentication token and uses it as the password for every connection its pool opens. Existing connections keep working, but new connections opened about 15 minutes after startup fail with access denied. What should the developer do?",
    opts: [
      "Generate a new authentication token just before opening each new database connection.",
      "Add rds-db:connect for the database user's resource ARN to the instance profile's role.",
      "Open the pool's connections without SSL, so that the database stops validating the token.",
      "Store the token in Secrets Manager, and turn on automatic rotation for it every 15 minutes."
    ], a: 0,
    no: [null,
      "The first connections succeeded, so the permission is in place. The token itself has expired.",
      "IAM authentication requires SSL/TLS, and turning it off doesn't extend a token's lifetime.",
      "Secrets Manager rotation is for stored credentials. Tokens are generated locally on demand."
    ],
    why: "An IAM database authentication token has a lifetime of 15 minutes. It is only checked when a connection opens, so code must generate a fresh token for each new connection.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.html", "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.IAMPolicy.html"] },

  { id: "dva-1-329", exam: "DVA", dva: "1.3", topic: "elasticache", type: "mc",
    q: "A team moves a Lambda function's cache from a node-based ElastiCache for Redis OSS cluster that had in-transit encryption off to an ElastiCache Serverless cache. The function uses the same client code with the new endpoint, and its security group rules allow the cache ports, but every connection attempt now fails. What should the developer do?",
    opts: [
      "Turn on TLS in the cache client's configuration, using a client that supports TLS and cluster mode.",
      "Turn off in-transit encryption on the serverless cache, so it accepts the client's plain connections.",
      "Add a NAT gateway for the function's subnets, so the function can reach the serverless cache endpoint.",
      "Raise the function's timeout and memory, so the client has more time to finish each connection attempt."
    ], a: 0,
    no: [null,
      "In-transit encryption is always on for serverless caches and can't be turned off.",
      "The cache endpoint is inside the VPC, so no internet path is needed to reach it.",
      "The handshake fails because the client isn't using TLS, not because it runs out of time."
    ],
    why: "Every ElastiCache Serverless cache has in-transit encryption enabled and runs in cluster mode, so it works only with clients that connect over TLS.",
    doc: ["https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/in-transit-encryption.html", "https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.corecomponents.html"] },

  { id: "dva-1-330", exam: "DVA", dva: "1.2", topic: "efs", type: "mc",
    q: "A Lambda function mounts an EFS file system through an access point whose root directory is owned by the access point's POSIX user. The file system has a file system policy that requires IAM authorization. The function's execution role grants elasticfilesystem:ClientMount. The function reads files fine, but every write fails. What should the developer do?",
    opts: [
      "Add elasticfilesystem:ClientWrite to the execution role, which the role needs for read/write access.",
      "Change the function's file system configuration from read-only mode to read/write mode, and save it.",
      "Change the access point's POSIX user ID to 0, so the function writes to the directory as the root user.",
      "Increase the function's ephemeral storage, so it has space to write files before they are copied to EFS."
    ], a: 0,
    no: [null,
      "Lambda's file system configuration has only the access point ARN and a mount path; there's no mode setting.",
      "The function's POSIX user already owns the directory. Writes fail on the missing IAM permission.",
      "Ephemeral storage is the function's /tmp space. It has nothing to do with writing to the EFS mount."
    ],
    why: "When an EFS file system has a file system policy, a Lambda function's execution role needs elasticfilesystem:ClientMount to mount and elasticfilesystem:ClientWrite to write; ClientWrite isn't needed for read-only access.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-filesystem-efs.html"] }
);
