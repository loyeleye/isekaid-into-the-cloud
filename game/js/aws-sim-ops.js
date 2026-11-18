// Operations rules for the shared AWS simulation (js/aws-sim.js): what the Fire Drill (js/drill-core.js) needs on
// top of the request path. These are timing, access and telemetry rules: the API Gateway token bucket, DynamoDB
// partitions, KMS key policies, the SQS-to-Lambda timeout rule, FIFO and provisioned concurrency, and the "signals"
// (CloudWatch metric names and X-Ray trace map colours) that each event shows. They live in their own file so the two
// modes that extend aws-sim.js at the same time don't collide. They attach to the same object (SD.awsSim, or
// require('./aws-sim.js')). Pure: no DOM and no randomness.
//
// Every rule below was checked against the current AWS docs on Nov 16, 2026 (project files
// game-modes/multiplayer-real/design.md has the table). Game numbers are small, and the comments give the real ones.
//   - API Gateway throttling is a token bucket: a request takes a token, and with none left the client gets
//     429 Too Many Requests. The account level is 10,000 rps with a 5,000-request bucket per Region (2,500 and 1,250
//     in some Regions), and you can't raise the bucket. Usage plans with API keys throttle per client.
//     https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html
//     https://docs.aws.amazon.com/apigateway/latest/developerguide/limits.html
//   - DynamoDB: each partition serves at most 3,000 RCU and 1,000 WCU a second, so a low-cardinality key (status)
//     throttles however high the table's capacity is. A partition or on-demand throttle returns ThrottlingException;
//     going over a table's provisioned WCU returns ProvisionedThroughputExceededException.
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html
//   - KMS: every key has exactly one key policy, and no principal can use a key unless the key policy allows it.
//     IAM policies count only if the key policy allows the account (the default key policy does).
//     https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html
//   - Lambda and SQS: set the queue's visibility timeout to at least 6x the function timeout, plus
//     MaximumBatchingWindowInSeconds. A message whose timeout runs out before it's deleted is received again.
//     https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
//   - FIFO and Lambda: messages in one group go in order, one batch at a time, so concurrency is capped by the number of
//     message group IDs. https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html
//   - Provisioned concurrency keeps environments initialised, and it goes on a version or alias, never $LATEST.
//     Reserved concurrency doesn't initialise anything: a new environment can still cold start.
//     https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
//     https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html
//   - X-Ray trace map colours: green for OK, yellow for client errors (4xx), red for server faults (5xx), purple for
//     throttling (429). Lambda sends traces only with Active tracing, and API Gateway tracing is set per stage.
//     https://docs.aws.amazon.com/xray/latest/devguide/xray-console-servicemap.html
//     https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html
//     https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-xray.html
//   - CloudWatch metric names: API Gateway (4XXError, 5XXError, Count, Latency, IntegrationLatency), Lambda
//     (Invocations, Errors, Throttles, Duration, ConcurrentExecutions), SQS (NumberOfMessagesSent,
//     NumberOfMessagesReceived, NumberOfMessagesDeleted, ApproximateAgeOfOldestMessage,
//     ApproximateNumberOfMessagesVisible) and DynamoDB (ConsumedWriteCapacityUnits, WriteThrottleEvents).
//     https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html
//     https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
//     https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
//   - Contributor Insights for DynamoDB shows the most accessed and most throttled keys.
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/contributorinsights_HowItWorks.html
//   - CloudTrail records KMS calls such as Decrypt, and some denied calls too.
//     https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html
//   - IAM denies by default: a call needs an Allow for its action in the caller's identity policy (or a resource
//     policy). DynamoDB answers a denied call with AccessDeniedException, an HTTP 400.
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_access-denied.html
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html
//     https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonDynamoDBReadOnlyAccess.html
//   - With the Lambda proxy integration, a function error (output not in the proxy format) reaches the caller as
//     502 Bad Gateway. In X-Ray an Error is a 4xx, a Fault a 5xx and a Throttle a 429.
//     https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
//     https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html
//   - SAM's DeploymentPreference has CodeDeploy shift an alias to a new version: AllAtOnce, CanaryXPercentYMinutes
//     or LinearXPercentEveryYMinutes. Alarms roll the deployment back if one goes off while it runs, and a
//     PreTraffic hook that reports Failed rolls it back before any traffic moves.
//     https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/automating-updates-to-serverless-apps.html
//     https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html
//     https://docs.aws.amazon.com/codedeploy/latest/userguide/monitoring-create-alarms.html
//   - SDK retries use exponential backoff with jitter. https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
(function (root) {
  const AS = (root && root.SD && root.SD.awsSim) || (typeof require !== 'undefined' ? require('./aws-sim.js') : {});

  // ---- API Gateway: the token bucket ----
  AS.gateBucket = (burst, rate) => ({ burst, rate, tokens: burst });
  // Refill at the start of a tick (never above the bucket's size).
  AS.gateRefill = b => { b.tokens = Math.min(b.burst, b.tokens + b.rate); return b.tokens; };
  // One request: true if it got a token, false for a 429.
  AS.gateTake = b => { if (b.tokens >= 1) { b.tokens -= 1; return true; } return false; };
  // The account-level bucket isn't yours to change.
  AS.burstChangeable = false;

  // Retry timing for a throttled caller: immediate retries land on the very next tick; exponential backoff waits
  // 1, 2, then 4 ticks, plus a jitter of 0 or 1 tick from the request's own id (deterministic, so a plan replays).
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  AS.hash = hash;
  AS.retryDelay = (attempt, backoff, id) => (backoff ? Math.pow(2, Math.max(0, attempt - 1)) + (hash(id + ':' + attempt) % 2) : 1);

  // ---- DynamoDB: partitions ----
  // keyMode 'status': every order is PENDING, so one partition. Any other key (orderId, high cardinality, or status
  // plus a calculated suffix) spreads writes across the table's partitions; the game spreads them evenly by the
  // write's place in the tick (n), where real hashing is only roughly even.
  AS.partitionOf = (keyMode, n, parts) => (keyMode === 'status' ? 0 : n % Math.max(1, parts));
  // One tick's writes: [{ id, part }] against a per-partition cap and the table's provisioned WCU.
  // Returns { ok: [id], hot: [id] (ThrottlingException, a partition over its cap), over: [id] (over the table's WCU) }.
  AS.writeTick = function (writes, perPart, tableWcu) {
    const used = {}, out = { ok: [], hot: [], over: [] };
    let total = 0;
    writes.forEach(w => {
      if (total >= tableWcu) { out.over.push(w.id); return; }
      if ((used[w.part] | 0) >= perPart) { out.hot.push(w.id); return; }
      used[w.part] = (used[w.part] | 0) + 1; total++; out.ok.push(w.id);
    });
    return out;
  };

  // ---- KMS: the key policy decides ----
  // keyPolicy: 'admins' (names only the key's administrators), 'iam' (also has the statement that lets IAM policies
  // in this account grant access, as the default key policy does), 'role' (names the function's role as a user).
  // identity: the role's own IAM policy allows kms:Decrypt (AdministratorAccess counts as allowing it).
  AS.kmsAllows = (keyPolicy, identity) => keyPolicy === 'role' || (keyPolicy === 'iam' && !!identity);

  // ---- IAM: an action is allowed only if some Allow matches it ('*', 'service:*' or the action itself) ----
  AS.iamAllows = (allowed, action) => (allowed || []).some(a => a === '*' || a === action || (a.endsWith(':*') && action.startsWith(a.slice(0, -1))));

  // ---- CodeDeploy traffic shifting for a Lambda alias: the new version's share, s seconds after the shift starts ----
  // all: AllAtOnce. canary: Canary10Percent5Minutes. linear: Linear10PercentEvery1Minute.
  AS.shiftWeight = (type, s) => (type === 'canary' ? (s < 300 ? 0.1 : 1) : type === 'linear' ? Math.min(1, 0.1 * (1 + Math.floor(s / 60))) : 1);

  // ---- Lambda and SQS ----
  // The visibility timeout AWS recommends for a function timeout and batching window (seconds).
  AS.visGuide = (fnTimeout, windowS) => 6 * fnTimeout + (windowS | 0);
  // How many batches can be in flight: FIFO caps it at the number of message groups.
  AS.pollCap = (reserved, poolFree, fifo, groups) => Math.max(0, Math.min(reserved != null ? reserved : poolFree, fifo ? groups : Infinity));
  // Provisioned concurrency needs a version or an alias.
  AS.provTargetOk = target => target !== '$LATEST';
  // A FIFO queue's dead-letter queue must be FIFO too, and a standard queue's standard.
  AS.dlqTypeOk = (queueFifo, dlqFifo) => !!queueFifo === !!dlqFifo;
  // The Night Watch (js/mode-watch.js):
  //   - A role's trust policy is the resource-based policy that lists who may assume it. Naming the caller's role lets
  //     it in; naming the account (its root) hands the decision to IAM, so the caller's own policy must allow
  //     sts:AssumeRole; a role it doesn't name is denied, "because no role trust policy allows the sts:AssumeRole
  //     action". https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html
  //     https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_access-denied.html
  //     trust: 'fn' (names orders-fn-role), 'acct', 'star' (Principal "*"), 'fin' (only finance-fn-role).
  AS.trustAllows = (trust, identity) => trust === 'fn' || trust === 'star' || (trust === 'acct' && !!identity);
  //   - Across accounts both evaluations must allow: the identity policy in the caller's account and the resource
  //     policy in the account that owns the resource. https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html
  AS.crossAccountAllows = (identity, resource) => !!identity && !!resource;
  //   - KMS Encrypt takes at most 4,096 bytes of plaintext; larger data wants a data key (GenerateDataKey) or SSE-KMS,
  //     whose PutObject needs kms:GenerateDataKey. https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html
  //     https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html
  //     https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html
  AS.KMS_ENCRYPT_MAX = 4096;
  //   - Credentials: AWS recommends Secrets Manager over environment variables, which Lambda hands to the code in plain
  //     text. A SecureString needs ssm:GetParameter and kms:Decrypt; the Parameters and Secrets extension caches for
  //     300 s by default. https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
  //     https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars-encryption.html
  //     https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html
  //     https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html

  // ---- Signals ----
  AS.METRICS = {
    gate: ['Count', '4XXError', '5XXError', 'Latency', 'IntegrationLatency'],
    fn: ['Invocations', 'Errors', 'Throttles', 'Duration', 'ConcurrentExecutions'],
    queue: ['NumberOfMessagesSent', 'NumberOfMessagesReceived', 'NumberOfMessagesDeleted', 'ApproximateAgeOfOldestMessage', 'ApproximateNumberOfMessagesVisible'],
    store: ['ConsumedWriteCapacityUnits', 'WriteThrottleEvents']
  };
  // A trace map node's colour from its counts. When several happen, the worst shows: fault, then throttle, then error.
  AS.XRAY = { ok: 'green', error: 'yellow', fault: 'red', throttle: 'purple' };
  AS.xrayStatus = c => (c.fault ? 'fault' : c.throttle ? 'throttle' : c.error ? 'error' : 'ok');

  if (typeof module !== 'undefined' && module.exports) module.exports = AS;
  if (root && root.SD) root.SD.awsSim = AS;
})(typeof window !== 'undefined' ? window : globalThis);
