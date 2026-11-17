// The Rush: the template card's data for claims 1 to 6 (and their cellar review rooms). js/rush-sheet.js draws it.
// Contract: project files game-modes/lost-and-found-real/real-game/v3/claims/learn/contract.md. Data only: nothing here
// changes a rule or a roll. Claims 7 to 9 add their own entries at the end of js/rush-office.js, rush-audit.js and
// rush-yard.js.
//
// Each claim's sheet is the SAM template.yaml of the room, written by the pieces the player places. Lines that follow
// the room (the reserved count, memory, the retry dial, the batch size and the Night Orders on the queue) are functions
// of the state, so the sheet always shows the setting now in force.
//
// Besides the contract's `at` (a line to insert after) and `lines`, an entry can give `blocks`: a list (or a function
// of the state returning one) of { at | in, head, replace, lines }, so one piece can write in two places (an SQS event on
// the function and the queue resource). `in` is a path of lines (a resource, then a key inside it) and the block goes
// at the end of that part; with `head`, under that key inside it (written once, whoever comes first). See
// js/rush-sheet.js resolve().
//
// Checked against the AWS docs on Nov 17, 2026:
//   SAM function (Handler, Runtime, MemorySize, Timeout, ReservedConcurrentExecutions, AutoPublishAlias,
//   ProvisionedConcurrencyConfig, Events, Policies, EventInvokeConfig):
//     https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
//   SQS event (Queue, BatchSize, FunctionResponseTypes: ReportBatchItemFailures):
//     https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-sqs.html
//   SNS event (Topic, FilterPolicy): https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-sns.html
//   EventInvokeConfig (DestinationConfig OnFailure Type/Destination, MaximumRetryAttempts 0-2):
//     https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-eventinvokeconfiguration.html
//   SQS queue (VisibilityTimeout, MessageRetentionPeriod 60-1209600, FifoQueue, ContentBasedDeduplication,
//   RedrivePolicy deadLetterTargetArn / maxReceiveCount): https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sqs-queue.html
//   SNS topic: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-sns-topic.html
//   SNS filter policies (message attributes by default): https://docs.aws.amazon.com/sns/latest/dg/sns-message-filtering.html
//   DynamoDB table (BillingMode PROVISIONED / PAY_PER_REQUEST, ProvisionedThroughput, KeySchema HASH,
//   TimeToLiveSpecification): https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dynamodb-table.html
//   Conditional writes (attribute_not_exists, ConditionalCheckFailedException):
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html
//   Write sharding: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html
//   Hot partitions (TableWriteKeyRangeThroughputExceeded):
//     https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/throttling-key-range-limit-exceeded-mitigation.html
//   SDK retries (retry_mode = standard: exponential backoff with jitter; max_attempts):
//     https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html
//   Invoke (InvocationType Event | RequestResponse | DryRun; 202 for Event): https://docs.aws.amazon.com/lambda/latest/api/API_Invoke.html
//   SAM policy templates (LambdaInvokePolicy): https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-template-list.html
//   Throttling (TooManyRequestsException, 429): https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html
//   Timeouts ("Task timed out after 6.00 seconds"): https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html
//   Async invocation, maximum event age and retries: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
//   SQS with Lambda (visibility timeout, at-least-once, batches): https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html
(function (root) {
  const SD = root.SD = root.SD || {};
  const RL = SD.rushLearn = SD.rushLearn || { files: {}, tools: {}, pops: {} };
  RL.files = RL.files || {}; RL.tools = RL.tools || {}; RL.pops = RL.pops || {};
  const core = () => SD.rushCore;

  // ---- The files ----
  const FN = (id, handler) => ['  ' + id + ':', '    Type: AWS::Serverless::Function', '    Properties:', '      Handler: ' + handler, '      Runtime: nodejs20.x'];
  const HEAD = ['Transform: AWS::Serverless-2016-10-31', 'Resources:'];
  const MIRA = FN('Mira', 'app.handler'), REPORTS = FN('Reports', 'reports.handler');
  // The Hot Shelf's table: the caller is the partition key. Provisioned, until the on-demand dial (one unit a cabinet).
  const VAULT = ['  Vault:', '    Type: AWS::DynamoDB::Table', '    Properties:', '      BillingMode: PROVISIONED', '      ProvisionedThroughput:', '        ReadCapacityUnits: 4', '        WriteCapacityUnits: 4',
    '      AttributeDefinitions:', '        - AttributeName: callerId', '          AttributeType: S', '      KeySchema:', '        - AttributeName: callerId', '          KeyType: HASH'];
  const file = base => ({ name: 'template.yaml', lang: 'yaml', base });
  Object.assign(RL.files, {
    rush: file(HEAD.concat(MIRA)),
    bell: file(HEAD.concat(MIRA, REPORTS)),
    double: file(HEAD.concat(MIRA)),
    slow: file(HEAD.concat(MIRA)),
    picky: file(HEAD.concat(MIRA, REPORTS)),
    hot: file(HEAD.concat(MIRA, VAULT)),
    // The cellar, as the review room of claims 6 and 7.
    review: file(HEAD.concat(MIRA)),
    review7: file(HEAD.concat(MIRA))
  });

  // ---- The pieces ----
  const P = ['  Mira:', '    Properties:'], RP = ['  Reports:', '    Properties:'];
  const sorter = S => S && S.claim === 'sorter';
  // The rack: an SQS queue and an SQS event on Mira. The Night Orders show on it: batch (BatchSize 2), fifo (a FIFO
  // queue with content-based deduplication), shelf (the retention period, 60 s being SQS's minimum), and the Slow
  // Courier's short visibility timeout (3 s, until the hourglass). In the New Sorter the platform's event is already in
  // the template, so the rack adds the queue itself.
  RL.tools.rack = {
    blocks: S => {
      if (sorter(S)) return [{ at: 'end', lines: ['  WaitingPlatform:', '    Type: AWS::SQS::Queue'] }];
      const o = S.orders || new Set(), props = [];
      if (S.visibility) props.push('      VisibilityTimeout: 3');
      if (o.has('fifo')) props.push('      FifoQueue: true', '      ContentBasedDeduplication: true');
      if (o.has('shelf')) props.push('      MessageRetentionPeriod: 60');
      return [
        { in: ['  Mira:'], head: '      Events:', lines: ['        FromRack:', '          Type: SQS', '          Properties:', '            Queue: !GetAtt Rack.Arn'].concat(o.has('batch') ? ['            BatchSize: 2'] : []) },
        { at: 'end', lines: ['  Rack:', '    Type: AWS::SQS::Queue'].concat(props.length ? ['    Properties:'].concat(props) : []) }
      ];
    },
    blank: 'SQS', choices: ['SQS', 'SNS', 'Kinesis', 'DynamoDB'],
    doc: 'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-sqs.html'
  };
  // The bolted stools: reserved concurrency (the count follows the room: what's Mira's).
  RL.tools.reserve = {
    blocks: S => [{ in: P, lines: ['      ReservedConcurrentExecutions: ' + (core() ? core().owners(S).filter(o => o === 'mira').length : 4)] }],
    blank: 'ReservedConcurrentExecutions', choices: ['ReservedConcurrentExecutions', 'ProvisionedConcurrencyConfig', 'MemorySize', 'Timeout'],
    doc: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html'
  };
  // The dead-letter bin: the queue's redrive policy (after 3 receives). Without the rack there's nothing to redrive
  // from yet, so it's just the queue.
  const redrive = to => ['      RedrivePolicy:', '        deadLetterTargetArn: !GetAtt ' + to + '.Arn', '        maxReceiveCount: 3'];
  RL.tools.bin = {
    blocks: S => {
      if (sorter(S)) return [{ in: ['  WaitingPlatform:'], head: '    Properties:', lines: redrive('Returns') }, { at: 'end', lines: ['  Returns:', '    Type: AWS::SQS::Queue'] }];
      const res = { at: 'end', lines: ['  Bin:', '    Type: AWS::SQS::Queue'] };
      return S.rack ? [{ in: ['  Rack:'], head: '    Properties:', lines: redrive('Bin') }, res] : [res, { at: 'end', lines: ['# no queue to redrive from yet'] }];
    },
    blank: 'RedrivePolicy', choices: ['RedrivePolicy', 'RedriveAllowPolicy', 'DeadLetterConfig', 'DestinationConfig'],
    doc: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html'
  };
  // The bell: an SNS topic, with Mira and Reports subscribed by an SNS event each.
  const ring = ['        Ring:', '          Type: SNS', '          Properties:', '            Topic: !Ref Bell'];
  RL.tools.bell = {
    blocks: [{ in: ['  Mira:'], head: '      Events:', lines: ring }, { in: ['  Reports:'], head: '      Events:', lines: ring }, { at: 'end', lines: ['  Bell:', '    Type: AWS::SNS::Topic'] }],
    blank: 'AWS::SNS::Topic', choices: ['AWS::SNS::Topic', 'AWS::SQS::Queue', 'AWS::Events::Rule', 'AWS::Kinesis::Stream'],
    doc: 'https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-sns.html'
  };
  // The ledger: a DynamoDB table, and the conditional write in Mira's code (a reserved word like "key" would need a
  // placeholder, so the key is ticketId).
  RL.tools.ledger = {
    blocks: [{ at: 'end', lines: ['  Ledger:', '    Type: AWS::DynamoDB::Table', '    Properties:', '      BillingMode: PAY_PER_REQUEST', '      AttributeDefinitions:', '        - AttributeName: ticketId',
      '          AttributeType: S', '      KeySchema:', '        - AttributeName: ticketId', '          KeyType: HASH'] },
    { at: 'end', lines: ['# app.js: PutItem with', '#   ConditionExpression:', "#   'attribute_not_exists(ticketId)'"] }],
    blank: 'attribute_not_exists', choices: ['attribute_not_exists', 'attribute_exists', 'attribute_type', 'begins_with'],
    doc: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ConditionExpressions.html'
  };
  // The hourglass: the Slow Courier's queue hides a taken message for 9 seconds instead of 3.
  RL.tools.hourglass = {
    blocks: S => S.rack ? [{ at: '      VisibilityTimeout: 3', replace: true, lines: ['      VisibilityTimeout: 9'] }] : [{ at: 'end', lines: ['# VisibilityTimeout: 9 (on the queue)'] }],
    blank: 'VisibilityTimeout', choices: ['VisibilityTimeout', 'MessageRetentionPeriod', 'DelaySeconds', 'ReceiveMessageWaitTimeSeconds'],
    doc: 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html'
  };
  // The stopwatch: the function's timeout (6 seconds, shorter than the queue's 9).
  RL.tools.stopwatch = {
    blocks: [{ in: P, lines: ['      Timeout: 6'] }],
    blank: 'Timeout', choices: ['Timeout', 'VisibilityTimeout', 'MaximumEventAgeInSeconds', 'EphemeralStorage'],
    doc: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html'
  };
  // The filter card: a filter policy on Reports' subscription (on the "kind" message attribute).
  RL.tools.filter = {
    blocks: [{ in: ['  Reports:', '        Ring:', '          Properties:'], lines: ['            FilterPolicy:', '              kind:', '                - refund'] }],
    blank: 'FilterPolicy', choices: ['FilterPolicy', 'RedrivePolicy', 'DeliveryPolicy', 'RawMessageDelivery'],
    doc: 'https://docs.aws.amazon.com/sns/latest/dg/sns-subscription-filter-policies.html'
  };
  // The suffix stamp: write sharding, a suffix calculated from the ticket on the busy caller's partition key.
  RL.tools.shard = {
    blocks: [{ at: 'end', lines: ['# app.js: write sharding, a', '# calculated suffix on the key:', "#   callerId: caller + '#' + n % 4"] }],
    blank: 'callerId', choices: ['callerId', 'ticketId', 'cabinet', 'createdAt'],
    doc: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-sharding.html'
  };
  // The on-demand dial: on-demand capacity mode instead of provisioned units.
  RL.tools.ondemand = {
    blocks: [{ at: '      BillingMode: PROVISIONED', replace: 4, lines: ['      BillingMode: PAY_PER_REQUEST'] }],
    blank: 'PAY_PER_REQUEST', choices: ['PAY_PER_REQUEST', 'PROVISIONED', 'ON_DEMAND', 'STANDARD_INFREQUENT_ACCESS'],
    doc: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html'
  };
  // The warm stool: provisioned concurrency on an alias (SAM publishes a version for it with AutoPublishAlias).
  RL.tools.warm = {
    blocks: [{ in: P, lines: ['      AutoPublishAlias: live', '      ProvisionedConcurrencyConfig:', '        ProvisionedConcurrentExecutions: ' + ((core() && core().T.warmN) || 1)] }],
    blank: 'ProvisionedConcurrencyConfig', choices: ['ProvisionedConcurrencyConfig', 'ReservedConcurrentExecutions', 'SnapStart', 'AutoPublishAlias'],
    doc: 'https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html'
  };
  // The jitter dial: the callers' SDK config. Standard retry mode backs off exponentially with jitter, 3 attempts.
  RL.tools.jitter = {
    lines: S => ["# callers' ~/.aws/config", '#   retry_mode = standard', '#   max_attempts = ' + (S.maxThrottles || 3)], at: 'end',
    blank: 'retry_mode', choices: ['retry_mode', 'max_attempts', 'duration_seconds', 'sts_regional_endpoints'],
    doc: 'https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html'
  };
  // The hand-off: Mira invokes Reports asynchronously (and needs permission to).
  RL.tools.handoff = {
    blocks: [{ in: P, lines: ['      Policies:', '        - LambdaInvokePolicy:', '            FunctionName: !Ref Reports'] },
      { at: 'end', lines: ['# app.js: InvokeCommand({', "#   FunctionName: 'Reports',", "#   InvocationType: 'Event' })"] }],
    blank: 'Event', choices: ['Event', 'RequestResponse', 'DryRun'],
    doc: 'https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html'
  };
  // Memory: CPU comes with it.
  RL.tools.memory = {
    blocks: S => [{ in: P, lines: ['      MemorySize: ' + (S.memory ? 256 : 128)] }],
    blank: 'MemorySize', choices: ['MemorySize', 'EphemeralStorage', 'Timeout', 'ReservedConcurrentExecutions'],
    doc: 'https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html'
  };
  // TTL on the ledger: DynamoDB deletes a key once its expiresAt (epoch seconds) has passed.
  RL.tools.ttl = {
    blocks: [{ in: ['  Ledger:', '    Properties:'], lines: ['      TimeToLiveSpecification:', '        AttributeName: expiresAt', '        Enabled: true'] }],
    blank: 'TimeToLiveSpecification', choices: ['TimeToLiveSpecification', 'StreamSpecification', 'PointInTimeRecoverySpecification', 'SSESpecification'],
    doc: 'https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html'
  };
  // Partial batch responses, on the SQS event.
  RL.tools.partial = {
    blocks: S => S.rack ? [{ in: ['  Mira:', '        FromRack:', '          Properties:'], lines: ['            FunctionResponseTypes:', '              - ReportBatchItemFailures'] }]
      : [{ at: 'end', lines: ['# FunctionResponseTypes:', '#   - ReportBatchItemFailures', '# (on the SQS event, once the rack is up)'] }],
    blank: 'ReportBatchItemFailures', choices: ['ReportBatchItemFailures', 'BisectBatchOnFunctionError', 'MaximumBatchingWindowInSeconds', 'FilterCriteria'],
    doc: 'https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html'
  };
  // The failure crate: an on-failure destination for Reports' async invocations (a queue).
  RL.tools.dest = {
    blocks: [{ in: RP, head: '      EventInvokeConfig:', lines: ['        DestinationConfig:', '          OnFailure:', '            Type: SQS', '            Destination: !GetAtt Crate.Arn'] },
      { at: 'end', lines: ['  Crate:', '    Type: AWS::SQS::Queue'] }],
    blank: 'OnFailure', choices: ['OnFailure', 'OnSuccess', 'DeadLetterConfig', 'RedrivePolicy'],
    doc: 'https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html'
  };
  // The retry dial: Reports' async retry attempts, as the dial stands now (0, 1 or 2).
  RL.tools.retries = {
    blocks: S => [{ in: RP, head: '      EventInvokeConfig:', lines: ['        MaximumRetryAttempts: ' + S.retryN] }],
    blank: 'MaximumRetryAttempts', choices: ['MaximumRetryAttempts', 'MaximumEventAgeInSeconds', 'maxReceiveCount', 'max_attempts'],
    doc: 'https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html'
  };
  // The intern is a game helper: no line.

  // ---- The real term on the pops (rush-core's event names) ----
  // A pop is a string, { text, line } (line: a bit of the sheet to light up), or a function of (event, room) returning
  // either, or nothing for no pop.
  Object.assign(RL.pops, {
    throttle: { text: 'TooManyRequestsException (429): no free concurrency', line: 'ReservedConcurrentExecutions' },
    hotThrottle: { text: 'Throttled: TableWriteKeyRangeThroughputExceeded', line: 'callerId' },
    writeFail: 'SDK retries used up: the PutItem fails',
    poisonFail: (e, S) => S && S.rack ? { text: 'Function error: the message returns after VisibilityTimeout', line: 'Rack:' } : 'Function error: the caller gets it back',
    binned: { text: 'maxReceiveCount reached: moved to the dead-letter queue', line: 'maxReceiveCount' },
    clog: 'No dead-letter queue: the poison message keeps coming back',
    twin: { text: 'At-least-once delivery: the same message again', line: 'Type: SQS' },
    reappear: { text: 'VisibilityTimeout ran out: the message is visible again', line: 'VisibilityTimeout' },
    timedOut: { text: 'Task timed out after 6.00 seconds', line: 'Timeout: 6' },
    dropped: { text: 'ConditionalCheckFailedException: duplicate dropped', line: 'attribute_not_exists' },
    spill: e => e && e.why === 'twice' ? 'Not idempotent: the same request was processed twice' : null,
    resend: 'Client retry after a timeout: the same request again',
    ring: { text: 'SNS Publish: each subscription gets its own copy', line: 'Type: SNS' },
    filtered: { text: 'FilterPolicy: no match, so no copy for Reports', line: 'FilterPolicy' },
    tossed: 'No FilterPolicy: Reports is invoked for every message',
    aged: e => !e || !e.want ? null : e.caught ? { text: 'MaximumEventAgeInSeconds passed: sent to the OnFailure destination', line: 'OnFailure' } : 'MaximumEventAgeInSeconds passed: the event is discarded',
    discarded: e => e && e.want ? { text: 'MaximumRetryAttempts used up: the event is discarded', line: 'MaximumRetryAttempts' } : null,
    crated: { text: 'OnFailure destination: the failed event is kept', line: 'OnFailure' },
    reportFail: { text: 'Async invocation failed: Lambda retries it', line: 'MaximumRetryAttempts' },
    dial: e => ({ text: 'MaximumRetryAttempts: ' + (e ? e.n : ''), line: 'MaximumRetryAttempts' }),
    replay: 'Redriven from the destination: Reports gets it again',
    handoff: { text: "InvocationType 'Event': queued, 202 Accepted", line: 'InvocationType' },
    cold: { text: 'Cold start: a new execution environment runs Init first', line: 'ProvisionedConcurrencyConfig' },
    herd: { text: 'Retries without jitter land together: a thundering herd', line: 'retry_mode' },
    expired: { text: 'MessageRetentionPeriod passed: the message is deleted', line: 'MessageRetentionPeriod' },
    dedup: { text: 'FIFO deduplication: the duplicate is dropped', line: 'ContentBasedDeduplication' },
    batchFail: { text: 'A failed batch: every message in it comes back', line: 'BatchSize' },
    partial: { text: 'batchItemFailures: only the failed message comes back', line: 'ReportBatchItemFailures' },
    stale: 'Eventually consistent read: it missed the latest write'
  });
  if (typeof module !== 'undefined') module.exports = RL;
})(typeof window !== 'undefined' ? window : globalThis);
