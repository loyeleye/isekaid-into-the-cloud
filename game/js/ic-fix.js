// Incident Commander's fix cards (Ladi, Nov 17: "Do these changes help build better associations?", and "type out the
// policy ourselves for the first time we see it"). After an incident's verdict, the camp shows what the fix does, in
// three parts: a painted picture of the mechanism, the exact AWS name or config line, and one sentence on what it
// does. The first time a config line's key token appears in a save, you type it into the line yourself (SD.typeOnce).
//   - A fix is matched from the right answer's own words (never the wrong options), per service. No match: no card,
//     just the verdict as before.
//   - `line` is real syntax: CloudFormation property names (AWS::Lambda::Function, AWS::SQS::Queue,
//     AWS::DynamoDB::Table, AWS::ApiGateway::Stage and ::Method), an SQS RedrivePolicy key, or a request header or
//     query parameter. Values are examples. `type: false` for an idea that has no config line (backoff, DAX).
//   - Facts in `does` were written fresh from the AWS docs (Lambda, SQS, DynamoDB, API Gateway and S3 developer
//     guides and the CloudFormation reference); limits named there are current as of Nov 2026.
// Pure data and matching: also loaded by tools/ic_fix_check.js under Node.
(function () {
  const root = typeof window !== 'undefined' ? window : globalThis;
  const SD = root.SD = root.SD || {};
  // pic: the painted prop (assets/img/ic/fix-<pic>.webp). node: which building it plays on.
  const FIXES = [
    // ---- Any service (first: when the fix is to retry, that is the fix) ----
    { id: 'backoff', node: '', pic: 'hourglass', re: /exponential backoff|jitter/i, name: 'Exponential backoff with jitter', type: false,
      line: 'exponential backoff with jitter', does: 'Each retry waits longer than the last, plus a random spread, so callers don\'t all retry at the same instant.' },
    // ---- SQS: the post ----
    { id: 'dlq', only: true, node: 'sqs', pic: 'crate', re: /dead[- ]letter|redrive|maxReceiveCount/i, name: 'Dead-letter queue (RedrivePolicy)',
      line: '"maxReceiveCount": 5', does: 'Each receive bumps the message\'s receive count. Past maxReceiveCount, SQS moves it to the dead-letter queue named in the redrive policy, out of everyone\'s way.' },
    { id: 'vis', node: 'sqs', pic: 'hourglass', re: /visibility timeout|VisibilityTimeout|ChangeMessageVisibility/i, name: 'Visibility timeout',
      line: 'VisibilityTimeout: 180', does: 'While one consumer works a message, SQS hides it for this many seconds. Too short, and it reappears and is worked twice. Default 30 s, maximum 12 hours.' },
    { id: 'longpoll', node: 'sqs', pic: 'bell', re: /long poll|WaitTimeSeconds/i, name: 'Long polling',
      line: 'ReceiveMessageWaitTimeSeconds: 20', does: 'A receive waits up to this many seconds (at most 20) for a message to arrive, instead of answering empty at once. Fewer empty receives, lower cost.' },
    { id: 'fifo', node: 'sqs', pic: 'envelopes', re: /\bFIFO\b|MessageGroupId|deduplication/i, name: 'FIFO queue',
      line: 'FifoQueue: true', does: 'Messages in the same message group come out in the order they went in, and a duplicate sent within the 5-minute deduplication interval is dropped.' },
    { id: 'delay', node: 'sqs', pic: 'hourglass', re: /delay queue|DelaySeconds|delay (?:each|every|new) message/i, name: 'Delay queue',
      line: 'DelaySeconds: 60', does: 'New messages stay invisible for this many seconds before any consumer can receive them. Maximum 15 minutes.' },
    { id: 'partial', node: 'sqs', pic: 'crate', re: /ReportBatchItemFailures|partial batch|batchItemFailures/i, name: 'Partial batch response',
      line: 'FunctionResponseTypes: [ReportBatchItemFailures]', does: 'The function reports which messages in the batch failed, so only those return to the queue instead of the whole batch.' },
    { id: 'batch', only: true, node: 'sqs', pic: 'envelopes', re: /\bbatch size\b|BatchSize|batching window/i, name: 'Event source batch size',
      line: 'BatchSize: 10', does: 'How many records Lambda hands the function in one invocation from the queue or stream.' },
    { id: 'receipt', node: 'sqs', pic: 'envelopes', re: /ReceiptHandle|receipt handle/i, name: 'Receipt handle',
      line: 'ReceiptHandle', does: 'DeleteMessage takes the receipt handle from the latest receive, not the message ID. Each receive hands out a new one.' },
    // ---- Lambda: the forge ----
    { id: 'reserved', node: 'lambda', pic: 'anvils', re: /reserved concurrency|ReservedConcurrentExecutions/i, name: 'Reserved concurrency',
      line: 'ReservedConcurrentExecutions: 50', does: 'Sets aside this many concurrent executions for the function, and caps it there. Past it, synchronous callers get a throttling error (429).' },
    { id: 'provisioned', node: 'lambda', pic: 'anvils', re: /provisioned concurrency|ProvisionedConcurren/i, name: 'Provisioned concurrency',
      line: 'ProvisionedConcurrentExecutions: 10', does: 'Keeps this many execution environments initialized ahead of time on a version or alias, so those requests skip the cold start.' },
    { id: 'memory', only: true, node: 'lambda', pic: 'coal', re: /\bmemory\b|MemorySize/i, name: 'Function memory',
      line: 'MemorySize: 1024', does: 'Memory from 128 MB to 10,240 MB, and CPU rises in proportion to it, so more memory can also make code run faster.' },
    { id: 'lambdatimeout', term: 'Timeout', only: true, node: 'lambda', pic: 'hourglass', re: /\btimeout\b/i, name: 'Function timeout',
      line: 'Timeout: 30', does: 'Lambda stops an invocation after this many seconds. Default 3 seconds, maximum 900 (15 minutes).' },
    { id: 'destination', node: 'lambda', pic: 'crate', re: /\bdestination\b|OnFailure/i, name: 'Destination on failure',
      line: 'DestinationConfig: { OnFailure: { Destination: arn } }', does: 'When an invocation fails all its retries, Lambda sends a record of it to this target, such as an SQS queue or SNS topic, instead of dropping it.' },
    { id: 'envvar', term: 'Environment', only: true, node: 'lambda', pic: 'scroll', re: /environment variable/i, name: 'Environment variables',
      line: 'Environment: { Variables: { TABLE: orders } }', does: 'Settings the code reads at run time, changed without a new deployment package.' },
    { id: 'lambdaxray', only: true, node: 'lambda', pic: 'lantern', re: /X-Ray|active tracing|TracingConfig/i, name: 'Active tracing (X-Ray)',
      line: 'TracingConfig: { Mode: Active }', does: 'Lambda samples incoming requests and sends traces to X-Ray, so the service map shows where time and errors go.' },
    { id: 'layer', term: 'Layers', only: true, node: 'lambda', pic: 'crate', re: /\blayer\b/i, name: 'Layers',
      line: 'Layers: [ layerVersionArn ]', does: 'A layer is a .zip that Lambda extracts under /opt. Python packages go in a python/ folder at the top of it.' },
    { id: 'vpce', node: 'lambda', pic: 'key', re: /VPC endpoint/i, name: 'VPC endpoint',
      line: 'VpcEndpointType: Gateway', does: 'Lets code in private subnets reach the service without the internet or a NAT gateway. S3 and DynamoDB have gateway endpoints; most others use interface endpoints.' },
    { id: 'vpc', only: true, node: 'lambda', pic: 'key', re: /\bVPC\b/i, name: 'VPC access',
      line: 'VpcConfig: { SubnetIds, SecurityGroupIds }', does: 'The function gets network interfaces in your subnets, so its role needs permission to create them (AWSLambdaVPCAccessExecutionRole).' },
    { id: 'filter', node: 'lambda', pic: 'glass', re: /filter criteria/i, name: 'Event filtering',
      line: 'FilterCriteria: { Filters: [ { Pattern } ] }', does: 'Lambda drops records that don\'t match the pattern before it invokes the function, so you don\'t pay for them.' },
    { id: 'furl', term: 'AWS_IAM', node: 'lambda', pic: 'pass', re: /function URL/i, name: 'Function URL',
      line: 'AuthType: AWS_IAM', does: 'A function URL is an HTTPS endpoint for one function. With AWS_IAM, callers sign their requests with SigV4; with NONE it is public, and the function must check callers itself.' },
    { id: 'snapstart', node: 'lambda', pic: 'candle', re: /SnapStart/i, name: 'SnapStart',
      line: 'SnapStart: { ApplyOn: PublishedVersions }', does: 'When you publish a version, Lambda snapshots the initialized environment and starts new ones from it, cutting cold starts. Published versions only.' },
    { id: 'alias', node: 'lambda', pic: 'anvils', re: /\balias\b|publish (?:a )?(?:new )?version/i, name: 'Versions and aliases',
      line: 'FunctionVersion: "3"', does: 'A published version is a frozen copy of code and settings. An alias points at one, so you move the pointer and the callers never change.' },
    // ---- API Gateway: the gate ----
    { id: 'throttle', only: true, node: 'apigw', pic: 'jar', re: /throttl|rate limit|burst limit|usage plan/i, name: 'Throttling (token bucket)',
      line: 'ThrottlingRateLimit: 100', does: 'The bucket refills at the rate limit and holds up to the burst limit. When it is empty, callers get 429 Too Many Requests.' },
    { id: 'apicache', only: true, node: 'apigw', pic: 'jars', re: /stage cache|cache key|provision a (?:stage )?cache|caching (?:on|off) |turns caching off|CacheClusterEnabled/i, name: 'Stage cache',
      line: 'CacheClusterEnabled: true', does: 'API Gateway answers repeat requests from the stage\'s cache for the TTL (default 300 seconds, maximum 3600) instead of calling the backend.' },
    { id: 'invalidate', term: 'max-age=0', node: 'apigw', pic: 'jars', re: /InvalidateCache|cache invalidation|max-age=0/i, name: 'Cache invalidation',
      line: 'Cache-Control: max-age=0', does: 'A client sends this header to skip the cached copy and refresh it. Require authorization (execute-api:InvalidateCache) so not just anyone can flush the cache.' },
    { id: 'authcache', node: 'apigw', pic: 'pass', re: /authori[sz]ation caching|authori[sz]er.{0,40}cach|cach.{0,40}authori[sz]er/i, name: 'Authorizer caching',
      line: 'AuthorizerResultTtlInSeconds: 300', does: 'API Gateway reuses the authorizer\'s policy for the same token for this many seconds (default 300, maximum 3600), without calling the authorizer again.' },
    { id: 'cors', term: 'Access-Control-Allow-Origin', node: 'apigw', pic: 'scroll', re: /\bCORS\b|Access-Control-Allow/i, name: 'CORS',
      line: 'Access-Control-Allow-Origin: https://app.example.com', does: 'The browser only lets a page on another origin read the response when this header names that origin (or *).' },
    { id: 'apitimeout', node: 'apigw', pic: 'hourglass', re: /29 seconds|integration timeout|TimeoutInMillis/i, name: 'Integration timeout',
      line: 'TimeoutInMillis: 29000', does: 'How long the gate waits for the backend before answering 504. Default 29 seconds for REST APIs.' },
    { id: 'stagevar', node: 'apigw', pic: 'scroll', re: /stage variable/i, name: 'Stage variables',
      line: '${stageVariables.alias}', does: 'Name-value pairs set per stage, used in the integration, so dev and prod stages can call different aliases or endpoints.' },
    { id: 'apixray', only: true, node: 'apigw', pic: 'lantern', re: /X-Ray/i, name: 'Stage tracing (X-Ray)',
      line: 'TracingEnabled: true', does: 'The stage sends traces to X-Ray, so a slow request shows which hop took the time.' },
    { id: 'asyncinvoke', term: 'X-Amz-Invocation-Type', node: 'apigw', pic: 'envelopes', re: /X-Amz-Invocation-Type/i, name: 'Asynchronous integration',
      line: "X-Amz-Invocation-Type: 'Event'", does: 'Lambda queues the event and answers at once, so the gate replies without waiting for the function to finish.' },
    // ---- DynamoDB: the ledger hall ----
    { id: 'contrib', node: 'ddb', pic: 'glass', re: /Contributor Insights/i, name: 'CloudWatch Contributor Insights',
      line: 'ContributorInsightsSpecification: { Enabled: true }', does: 'Graphs the most accessed and most throttled keys of a table or index, with no code to write.' },
    { id: 'pk', only: true, node: 'ddb', pic: 'shelves', re: /partition key|hot (?:partition|key)|high[- ]cardinality|write sharding|random suffix/i, name: 'Partition key',
      line: 'KeyType: HASH', does: 'DynamoDB spreads items across partitions by the partition key (the HASH key). Many distinct key values spread the load; one busy value heats one partition.' },
    { id: 'consistent', node: 'ddb', pic: 'glass', re: /strongly consistent|ConsistentRead/i, name: 'Strongly consistent read',
      line: 'ConsistentRead: true', does: 'The read reflects every write that succeeded before it, at twice the read capacity of an eventually consistent read.' },
    { id: 'dax', node: 'ddb', pic: 'jars', re: /\bDAX\b|DynamoDB Accelerator/i, name: 'DynamoDB Accelerator (DAX)', type: false,
      line: 'DAX cluster endpoint', does: 'An in-memory cache in front of the table for eventually consistent reads, with microsecond reads for read-heavy, repeated keys.' },
    { id: 'ttl', only: true, node: 'ddb', pic: 'candle', re: /\bTTL\b|time to live/i, name: 'Time to Live',
      line: 'TimeToLiveSpecification: { AttributeName: expiresAt, Enabled: true }', does: 'Items whose expiry attribute (epoch seconds) has passed are deleted in the background, typically within a few days, at no write cost.' },
    { id: 'condition', term: 'attribute_not_exists', node: 'ddb', pic: 'scroll', re: /condition(?:al)? (?:write|expression|update|put)|ConditionExpression|optimistic lock/i, name: 'Condition expression',
      line: 'ConditionExpression: "attribute_not_exists(pk)"', does: 'The write happens only if the condition holds; otherwise it fails with ConditionalCheckFailedException and nothing changes.' },
    { id: 'gsi', node: 'ddb', pic: 'shelves', re: /global secondary index|\bGSI\b/i, name: 'Global secondary index',
      line: 'GlobalSecondaryIndexes', does: 'A second key layout for the same items, with its own partition key, so you can Query by an attribute that isn\'t the table\'s key.' },
    { id: 'streams', term: 'NEW_AND_OLD_IMAGES', node: 'ddb', pic: 'envelopes', re: /DynamoDB Streams|StreamSpecification|StreamViewType/i, name: 'DynamoDB Streams',
      line: 'StreamViewType: NEW_AND_OLD_IMAGES', does: 'Every item change lands on the stream, kept 24 hours, with the item as it was and as it is now.' },
    { id: 'ondemand', term: 'PAY_PER_REQUEST', node: 'ddb', pic: 'shelves', re: /on-demand|PAY_PER_REQUEST/i, name: 'On-demand capacity',
      line: 'BillingMode: PAY_PER_REQUEST', does: 'You pay per request and the table scales to traffic with no read or write capacity to set.' },
    { id: 'unprocessed', node: 'ddb', pic: 'hourglass', re: /UnprocessedItems|UnprocessedKeys/i, name: 'Retry unprocessed items', type: false,
      line: 'UnprocessedItems', does: 'A batch call can succeed with part of its items left over. Send those again, with exponential backoff.' },
    { id: 'capacity', node: 'ddb', pic: 'shelves', re: /\bWCU\b|\bRCU\b|capacity units?\b/i, name: 'Capacity units', type: false,
      line: '1 WCU = 1 KB written/s · 1 RCU = 4 KB read/s', does: 'Writes round up to whole KB, reads to whole 4 KB. An eventually consistent read costs half a unit; a transaction costs double.' },
    { id: 'update', node: 'ddb', pic: 'scroll', re: /UpdateExpression|ADD expression/i, name: 'Update expression',
      line: 'UpdateExpression: "ADD Views :one"', does: 'Changes only the named attributes, in place and atomically, so a counter goes up without reading it first.' },
    { id: 'scan', node: 'ddb', pic: 'shelves', re: /TotalSegments|parallel scan/i, name: 'Parallel scan',
      line: 'TotalSegments: 4', does: 'Each worker scans its own Segment of the table at the same time, with the same TotalSegments.' },
    // ---- S3: the vault ----
    { id: 'lifecycle', node: 's3', pic: 'candle', re: /lifecycle|NoncurrentVersionExpiration|NoncurrentDays|days after the version became noncurrent/i, name: 'Lifecycle rule',
      line: 'NoncurrentVersionExpiration: { NoncurrentDays: 30 }', does: 'S3 deletes an old version this many days after a newer one replaced it, so versioning doesn\'t keep everything forever.' },
    { id: 'versioning', node: 's3', pic: 'shelves', re: /versioning|delete marker/i, name: 'Versioning',
      line: 'VersioningConfiguration: { Status: Enabled }', does: 'S3 keeps every version of a key. A plain delete only puts a delete marker on top; deleting the marker brings the object back.' },
    { id: 'presigned', term: 'X-Amz-Expires', node: 's3', pic: 'pass', re: /pre-?signed/i, name: 'Presigned URL',
      line: 'X-Amz-Expires=3600', does: 'The URL carries the signer\'s permission until it expires. With Signature Version 4 the longest is 7 days (604,800 seconds); after that S3 answers 403.' },
    { id: 'kms', term: 'aws:kms', only: true, node: 's3', pic: 'key', re: /SSE-KMS|\bKMS\b/i, name: 'Server-side encryption with KMS',
      line: 'x-amz-server-side-encryption: aws:kms', does: 'S3 encrypts the object with a KMS key, so reading it also needs kms:Decrypt on that key.' },
    { id: 'multipart', node: 's3', pic: 'crate', re: /multipart/i, name: 'Multipart upload', type: false,
      line: 'CreateMultipartUpload', does: 'Upload a large object in parts, in parallel, and retry only a failed part. Recommended from 100 MB; required above 5 GB in one PUT.' },
    { id: 'notify', term: 's3:ObjectCreated', node: 's3', pic: 'bell', re: /event notification|s3:ObjectCreated/i, name: 'Event notifications',
      line: '"Event": "s3:ObjectCreated:*"', does: 'S3 sends an event to Lambda, SQS, SNS or EventBridge when an object is created or removed.' },
    { id: 'bucketpolicy', term: 's3:GetObject', node: 's3', pic: 'scroll', re: /bucket policy/i, name: 'Bucket policy',
      line: '"Action": "s3:GetObject"', does: 'A resource policy on the bucket: who (Principal) may do what (Action) to which objects (Resource). An explicit Deny always wins.' },
  ];
  // The right answer's own words (mc: the right option; multi: the right ones).
  const rightText = q => {
    if (!q) return '';
    if (q.type === 'mc' || Array.isArray(q.opts)) {
      const a = Array.isArray(q.a) ? q.a : [q.a];
      return a.map(i => (q.opts || [])[i] || '').join(' ');
    }
    return (q.items || []).filter(i => i.ok).map(i => i.t).join(' ');
  };
  // The fix a question teaches, if any: the first entry the right answer names. `only` entries use words too common to
  // trust off their own service (timeout, memory, cache), so they count only on it.
  function fixOf(q, node) {
    const t = rightText(q);
    if (!t) return null;
    return FIXES.find(f => (!f.only || f.node === node) && f.re.test(t)) || null;
  }
  // Typing it out goes through the shared type-it-once (js/type-once.js, SD.typeOnce): only the key token of the
  // line, keyed by the token itself, so VisibilityTimeout typed here counts in every mode. `term` names the token where
  // the line has no CamelCase name to find (Timeout, X-Amz-Expires). Until that helper is loaded, a small stand-in with
  // the same rules keeps the step working (case, spaces and quotes ignored; two misses show it faintly).
  const fallback = {
    token: (line, prefer) => (prefer && String(line).includes(prefer) ? prefer : ((String(line).match(/\b[A-Za-z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b/) || [''])[0])),
    learned: t => { const sv = (root.SD.state && root.SD.state.save) || {}; const k = String(t).toLowerCase(); return !!((sv.typed || {})[k] || Object.keys(sv.icTyped || {}).some(x => x.toLowerCase() === k)); },
    mark: t => { const S = root.SD.state; if (!S || !S.save) return; (S.save.typed = S.save.typed || {})[String(t).toLowerCase()] = Date.now(); if (S.persist) S.persist(); },
    match: (a, b) => { const n = x => String(x || '').trim().replace(/^[`'"]+|[`'",]+$/g, '').replace(/\s+/g, '').toLowerCase(); return !!n(a) && n(a) === n(b); }
  };
  fallback.need = t => !!t && !fallback.learned(t);
  fallback.bind = function (inp, ans, o) {
    o = o || {}; let misses = 0, done = fallback.learned(ans);
    const check = () => {
      if (done || !inp.value.trim()) return;
      if (fallback.match(inp.value, ans)) { done = true; fallback.mark(ans); inp.classList.add('ok'); if (o.onOk) o.onOk(misses); return; }
      misses++; if (misses >= 2) { inp.value = ''; inp.placeholder = ans; inp.classList.add('faint'); }
      if (o.onMiss) o.onMiss(misses);
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    inp.addEventListener('blur', check);
    return { check, get done() { return done; }, get misses() { return misses; } };
  };
  const once = () => root.SD.typeOnce || fallback;
  const termOf = f => (f && f.type !== false ? f.term || once().token(f.line) : '');
  SD.icFix = { FIXES, fixOf, rightText, termOf, once, fallback };
})();
