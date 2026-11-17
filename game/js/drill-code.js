// The Fire Drill's code desk (Ladi, Nov 17: "more like reading code to determine the solution", not picking from a
// list). A station shows the real file its settings live in: the function's SAM template, the state machine's
// definition, the subscription, the Gate's integration. The file is cut into blocks. Tap a block to open it: it lists
// the edits that block can take, each shown as the lines it would change (- old, + new). Picking one is the same change
// as placing the setting's card (js/drill-core.js), so the rules, costs and refusals don't change. A block nothing can
// change says so. Settings a desk's file doesn't hold stay under "Other settings".
// On five drills only, for variety (Ladi, Nov 17): The Dropped Catch, The Wrong Badge, The Quiet Subscriber, The
// Locked Vault and The Stampede Stream (PROTO). The rest keep their dials. Pure strings, no DOM.
(function (root) {
  const D = root.SD && root.SD.drill;
  if (!D) return;
  const X = {};
  const jl = a => a.map(x => JSON.stringify(x)).join(', ');

  // ---- Files: per station, the blocks, each { code(cfg) → text, edits: [card ids] } ----
  // A refused setting has nothing to set, so its preview shows the edit that AWS turns down.
  const PREVIEW = {
    catchfirst: c => { c.flow.catch = 'first'; },
    rawon: c => { c.topic.raw = true; }
  };
  const FILES = {
    // Kai: the function, as a SAM resource.
    fn: () => ({ file: 'template.yaml', lang: 'yaml', blocks: [
      { code: () => 'OrdersFn:\n  Type: AWS::Serverless::Function\n  Properties:\n    Handler: app.handler\n    Runtime: python3.13', edits: [] },
      { code: c => `    Timeout: ${c.fn.timeout}` + (c.fn.reserved != null ? `\n    ReservedConcurrentExecutions: ${c.fn.reserved}` : '')
          + (c.fn.prov ? `\n    AutoPublishAlias: live\n    ProvisionedConcurrencyConfig:\n      ProvisionedConcurrentExecutions: ${c.fn.prov}` : ''),
        edits: ['to30', 'to60', 'to120', 'reserved', 'prov'] },
      { code: c => '    Policies:\n' + (c.fn.admin ? '      - AdministratorAccess\n' : '') + '      - AWSLambdaBasicExecutionRole\n      - Statement:\n'
          + '          - Effect: Allow\n            Action:\n' + c.fn.iam.map(a => `              - ${a}`).join('\n')
          + `\n            Resource: ${c.fn.wide ? '\'*\'' : '!GetAtt OrdersTable.Arn'}`
          + (c.fn.kms ? '\n          - Effect: Allow\n            Action: kms:Decrypt\n            Resource: !GetAtt OrdersKey.Arn' : '')
          + (c.fn.invoke ? '\n          - Effect: Allow\n            Action: execute-api:Invoke\n            Resource: \'*\'' : ''),
        edits: ['ddbput', 'ddbstar', 'admin', 'rolekms', 'fninvoke'] }
    ] }),
    // Mira, on a state machine: the definition (Amazon States Language), Charge and what follows it.
    'queue:sfn': () => ({ file: 'orders.asl.json', lang: 'json', blocks: [
      { code: () => '"StartAt": "Charge",\n"States": {', edits: [] },
      { code: c => {
        const retry = { none: null,
          trans: '  "Retry": [{\n    "ErrorEquals": ["Lambda.TooManyRequestsException", "Lambda.ServiceException"],\n    "MaxAttempts": 3,\n    "BackoffRate": 2\n  }],',
          all: '  "Retry": [{\n    "ErrorEquals": ["States.ALL"],\n    "MaxAttempts": 3\n  }],' }[c.flow.retry];
        const decl = rp => `{\n    "ErrorEquals": ["CardDeclined"],\n    "Next": "ReleaseStock"${rp ? ',\n    "ResultPath": "$.error"' : ''}\n  }`;
        const cat = { none: null, norp: `  "Catch": [${decl(false)}],`, rp: `  "Catch": [${decl(true)}],`,
          first: '  "Catch": [{\n    "ErrorEquals": ["States.ALL"],\n    "Next": "Failed"\n  }, ' + decl(true).replace(/^\{/, '{') + '],' }[c.flow.catch];
        return ['"Charge": {', '  "Type": "Task",', '  "Resource": "arn:aws:states:::lambda:invoke",', '  "Parameters": {', '    "FunctionName": "orders-fn:live",', '    "Payload.$": "$"', '  },']
          .concat(retry ? [retry] : [], cat ? [cat] : [], ['  "Next": "Ship"', '},']).join('\n');
      }, edits: ['rnone', 'rtrans', 'rall', 'catchnone', 'catchno', 'catchrp', 'catchfirst'] },
      { code: () => '"ReleaseStock": {\n  "Type": "Task",\n  "Resource": "arn:aws:states:::lambda:invoke",\n  "Parameters": {\n    "FunctionName": "release-stock",\n    "Payload": { "orderId.$": "$.orderId" }\n  },\n  "Next": "Declined"\n},', edits: [] },
      { code: () => '"Ship": { "Type": "Succeed" },\n"Declined": { "Type": "Fail", "Error": "CardDeclined" },\n"Failed": { "Type": "Fail" }\n}', edits: [] }
    ] }),
    // Mira, on a topic: the shipping subscription.
    'queue:sns': () => ({ file: 'template.yaml', lang: 'yaml', blocks: [
      { code: () => 'ShippingSubscription:\n  Type: AWS::SNS::Subscription\n  Properties:\n    TopicArn: !Ref OrdersTopic', edits: [] },
      { code: c => '    Protocol: lambda\n    Endpoint: !GetAtt ShippingFn.Arn' + (c.topic.raw ? '\n    RawMessageDelivery: true' : '')
          + (c.topic.dlq ? '\n    RedrivePolicy:\n      deadLetterTargetArn: !GetAtt ShippingDlq.Arn' : ''), edits: ['rawon', 'subdlq'] },
      { code: c => (c.topic.filter ? `    FilterPolicyScope: ${c.topic.scope === 'body' ? 'MessageBody' : 'MessageAttributes'}\n    FilterPolicy:\n      order_type:\n        - ship` : '    # no FilterPolicy'),
        edits: ['scopebody', 'nofilter'] }
    ] }),
    // Seo-yeon, in front of a topic: the API's integration with SNS Publish (OpenAPI).
    'gate:sns': () => ({ file: 'openapi.yaml', lang: 'yaml', blocks: [
      { code: () => '/orders:\n  post:\n    x-amazon-apigateway-integration:\n      type: aws\n      httpMethod: POST\n      uri: arn:aws:apigateway:us-east-1:sns:action/Publish\n      credentials: !GetAtt ApiPublishRole.Arn', edits: [] },
      { code: c => '      requestParameters:\n        integration.request.querystring.TopicArn: "\'arn:aws:sns:us-east-1:123456789012:orders\'"\n        integration.request.querystring.Message: method.request.body'
          + (c.gate.snsattr ? '\n        integration.request.querystring.MessageAttributes.entry.1.Name: "\'order_type\'"\n        integration.request.querystring.MessageAttributes.entry.1.Value.DataType: "\'String\'"\n        integration.request.querystring.MessageAttributes.entry.1.Value.StringValue: method.request.body.order_type' : ''),
        edits: ['snsattr'] }
    ] })
  };
  // Kai, on The Locked Vault: the function's own code (Python), where the ledger password comes from.
  FILES['fn:secret'] = () => ({ file: 'app.py', lang: 'python', blocks: [
    { code: () => 'import json, os, urllib.request\nimport boto3, psycopg\n\nsm = boto3.client("secretsmanager")\nSECRET_ID = "ledger/orders_app"\n\ndef fetch_password():\n    s = sm.get_secret_value(SecretId=SECRET_ID)\n    return json.loads(s["SecretString"])["password"]\n\ndef connect(pw):\n    return psycopg.connect(host=os.environ["DB_HOST"],\n                           user="orders_app", password=pw)', edits: [] },
    { code: c => ({
      init: 'PASSWORD = fetch_password()\n\ndef get_password():\n    return PASSWORD',
      call: 'def get_password():\n    return fetch_password()',
      ttl: '# Parameters and Secrets extension, TTL 300 s\nURL = "http://localhost:2773/secretsmanager/get"\n\ndef get_password():\n    req = urllib.request.Request(\n        URL + "?secretId=" + SECRET_ID,\n        headers={"X-Aws-Parameters-Secrets-Token":\n                 os.environ["AWS_SESSION_TOKEN"]})\n    body = json.load(urllib.request.urlopen(req))\n    return json.loads(body["SecretString"])["password"]'
    }[c.fn.sec]), edits: ['secinit', 'secttl', 'seccall'] },
    { code: c => 'def handler(event, context):\n' + (c.fn.refetch
      ? '    try:\n        conn = connect(get_password())\n    except psycopg.OperationalError:\n        conn = connect(fetch_password())'
      : '    conn = connect(get_password())')
      + '\n    with conn:\n        conn.execute(\n            "INSERT INTO ledger VALUES (%s, %s)",\n            (event["orderId"], event["total"]))', edits: ['refetch'] }
  ] });
  // Dutch, on The Locked Vault: the secret's rotation schedule.
  FILES['store:secret'] = () => ({ file: 'template.yaml', lang: 'yaml', blocks: [
    { code: () => 'LedgerSecret:\n  Type: AWS::SecretsManager::Secret\n  Properties:\n    Name: ledger/orders_app\n    GenerateSecretString:\n      SecretStringTemplate: \'{"username": "orders_app"}\'\n      GenerateStringKey: password', edits: [] },
    { code: c => (c.store.rot === 'off' ? '# no RotationSchedule' : 'LedgerRotation:\n  Type: AWS::SecretsManager::RotationSchedule\n  Properties:\n    SecretId: !Ref LedgerSecret\n    HostedRotationLambda:\n      RotationType: '
        + (c.store.rot === 'alt' ? 'PostgreSQLMultiUser\n      MasterSecretArn: !Ref LedgerAdminSecret' : 'PostgreSQLSingleUser') + '\n    RotationRules:\n      AutomaticallyAfterDays: 30'),
      edits: ['rotsingle', 'rotalt', 'rotoff'] }
  ] });
  // Mira, on The Stampede Stream: the function's Kinesis trigger (its event source mapping, in SAM).
  FILES['queue:stream'] = () => ({ file: 'template.yaml', lang: 'yaml', blocks: [
    { code: c => `OrdersFn:\n  Type: AWS::Serverless::Function\n  Properties:\n    Events:\n      Orders:\n        Type: Kinesis\n        Properties:\n          Stream: !GetAtt OrdersStream.Arn\n          StartingPosition: TRIM_HORIZON\n          BatchSize: ${c.fn.batch}`, edits: [] },
    { code: c => (c.stream.bisect ? '          BisectBatchOnFunctionError: true\n' : '') + (c.stream.retries != null ? `          MaximumRetryAttempts: ${c.stream.retries}\n` : '') + '          ParallelizationFactor: 1',
      edits: ['bisect', 'retry2'] },
    { code: c => (c.stream.onfail ? '          DestinationConfig:\n            OnFailure:\n              Type: SQS\n              Destination: !GetAtt OrdersFailed.Arn' : '          # no DestinationConfig'), edits: ['onfail'] }
  ] });
  // Which desks show code in which drills (the prototype).
  const PROTO = { catch: { queue: 'queue:sfn', fn: 'fn' }, badge: { fn: 'fn' }, quiet: { queue: 'queue:sns', gate: 'gate:sns', fn: 'fn' },
    vault: { fn: 'fn:secret', store: 'store:secret' }, stampede: { queue: 'queue:stream' } };

  // The file for this drill's desk, with its blocks' edits narrowed to what the drill shows, or null.
  X.file = (drill, at) => {
    const key = PROTO[drill] && PROTO[drill][at];
    if (!key) return null;
    const f = FILES[key]();
    f.blocks.forEach(b => { b.edits = b.edits.filter(id => D.shown(drill, id)); });
    return f;
  };
  // The cards a desk's file holds (the rest stay under "Other settings").
  X.held = (drill, at) => { const f = X.file(drill, at); return f ? [].concat(...f.blocks.map(b => b.edits)) : []; };
  X.blockOf = (drill, at, id) => { const f = X.file(drill, at); return f ? f.blocks.findIndex(b => b.edits.includes(id)) : -1; };
  // An edit as the lines it changes: [['-', line] | ['+', line]].
  X.diff = (block, cfg, id) => {
    const after = D.clone(cfg);
    (PREVIEW[id] || D.CARDS[id].set)(after);
    const a = block.code(cfg).split('\n'), b = block.code(after).split('\n');
    // The common head and tail stay; the middle is the change.
    let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++;
    let j = 0; while (j < a.length - i && j < b.length - i && a[a.length - 1 - j] === b[b.length - 1 - j]) j++;
    // One line of context before the change, so a reader can see where it goes.
    return (i > 0 ? [[' ', a[i - 1]]] : []).concat(a.slice(i, a.length - j).map(l => ['-', l]), b.slice(i, b.length - j).map(l => ['+', l]));
  };
  X.PROTO = PROTO;
  root.SD.drillCode = X;
})(typeof window !== 'undefined' ? window : globalThis);
