// Topic drills (Nov 15): pick a topic, a commonly confused pair or a pack, get 10, 15 or 20 bank questions on it, with
// the explanation, the AWS docs links and the question's verified record after each answer (js/today.js runs them,
// js/quiz.js opts.source shows the source block).
// Verified: a question counts as verified when SD.verified[id] exists. That file (js/verified.js) comes from the
// accuracy check against current AWS docs: { on: 'YYYY-MM-DD', src: [{ url, quote }], era: 'optional caution' }.
// Until it lands, or on a topic it hasn't reached, verified-only can't fill a drill on its own, so the drill says how
// many are verified and tops up with unchecked questions, each marked "Not verified yet" (SD.topicDrill.build).
(function () {
  const D = SD.topicDrill = {};
  const E = () => SD.exam;
  D.SIZES = [10, 15, 20];
  D.MIN_VERIFIED = 5;   // verified-only with fewer than this on a topic: top up with unchecked questions, marked

  // Presets for DVA-C02. topics: the bank's topic tags. and: only those of them whose text matches. or: any question
  // on the exam whose text matches, whatever its tag. dom: only that exam domain.
  D.PRESETS = {
    DVA: [
      { id: 'pack-trouble', group: 'Packs', name: 'Troubleshooting pack', note: 'Domain 4: logs, metrics, traces, throttling, 4xx and 5xx', dom: 4 },
      { id: 'pack-limits', group: 'Packs', name: 'Numbers and limits', note: 'Questions that state a number, a default or a quota', or: /\b\d[\d,.]*\s?(?:ms|milliseconds?|seconds?|minutes?|hours?|days?|KB|KiB|MB|MiB|GB|GiB|TB|RCUs?|WCUs?|retries|requests|percent)\b|\d\s?%|\b(?:default|quota|maximum|minimum|limit)\b/i },
      { id: 'pair-cognito', group: 'Commonly confused', name: 'Cognito user pools vs identity pools', topics: ['cognito'], or: /\b(?:user pool|identity pool)s?\b/i },
      { id: 'pair-secrets', group: 'Commonly confused', name: 'Secrets Manager vs Parameter Store', topics: ['secrets'], or: /Secrets Manager|Parameter Store|SecureString/ },
      { id: 'pair-msg', group: 'Commonly confused', name: 'SQS vs SNS vs EventBridge', topics: ['sqs', 'sns', 'eventbridge'] },
      { id: 'pair-gsi', group: 'Commonly confused', name: 'DynamoDB GSI vs LSI', or: /\b(?:GSI|LSI|global secondary index|local secondary index)/i },
      { id: 'pair-conc', group: 'Commonly confused', name: 'Reserved vs provisioned concurrency', or: /\b(?:reserved|provisioned) concurrency\b/i },
      { id: 'pair-deploy', group: 'Commonly confused', name: 'Canary vs linear vs all-at-once', or: /\b(?:canary|linear|all[- ]at[- ]once|blue\/green|immutable|rolling)\b/i },
      { id: 'pair-kms', group: 'Commonly confused', name: 'KMS keys and envelope encryption', topics: ['kms'] },
      { id: 't-lambda', group: 'Topics', name: 'Lambda', topics: ['lambda'] },
      { id: 't-apigw', group: 'Topics', name: 'API Gateway', topics: ['apigateway'] },
      { id: 't-ddb', group: 'Topics', name: 'DynamoDB', topics: ['dynamodb', 'dax'] },
      { id: 't-ddbmath', group: 'Topics', name: 'DynamoDB capacity math', or: /\b(?:RCU|WCU|read capacity unit|write capacity unit)s?\b/i },
      { id: 't-s3', group: 'Topics', name: 'S3', topics: ['s3'] },
      { id: 't-stream', group: 'Topics', name: 'Kinesis and Firehose', topics: ['kinesis', 'firehose'] },
      { id: 't-sfn', group: 'Topics', name: 'Step Functions', topics: ['stepfunctions'], or: /Step Functions/ },
      { id: 't-iam', group: 'Topics', name: 'IAM and STS', topics: ['iam', 'sts'] },
      { id: 't-cache', group: 'Topics', name: 'Caching', topics: ['elasticache', 'dax', 'caching', 'cloudfront'] },
      { id: 't-iac', group: 'Topics', name: 'CloudFormation, SAM and CDK', topics: ['cloudformation', 'sam', 'cdk'] },
      { id: 't-cicd', group: 'Topics', name: 'CodeBuild, CodeDeploy, CodePipeline', topics: ['codebuild', 'codedeploy', 'codepipeline', 'codeartifact'] },
      { id: 't-eb', group: 'Topics', name: 'Elastic Beanstalk', topics: ['beanstalk'] },
      { id: 't-ctr', group: 'Topics', name: 'Containers: ECS, ECR, EKS', topics: ['ecs', 'ecr', 'eks'] },
      { id: 't-cw', group: 'Topics', name: 'CloudWatch', topics: ['cloudwatch', 'observability'] },
      { id: 't-xray', group: 'Topics', name: 'X-Ray and tracing', topics: ['xray'], or: /X-Ray|OpenTelemetry|ADOT/ },
      { id: 't-trail', group: 'Topics', name: 'CloudTrail', topics: ['cloudtrail'] },
      { id: 'd1', group: 'Domains', name: 'Domain 1', dom: 1 },
      { id: 'd2', group: 'Domains', name: 'Domain 2', dom: 2 },
      { id: 'd3', group: 'Domains', name: 'Domain 3', dom: 3 },
      { id: 'd4', group: 'Domains', name: 'Domain 4', dom: 4 }
    ],
    SAA: [
      { id: 'd1', group: 'Domains', name: 'Domain 1', dom: 1 },
      { id: 'd2', group: 'Domains', name: 'Domain 2', dom: 2 },
      { id: 'd3', group: 'Domains', name: 'Domain 3', dom: 3 },
      { id: 'd4', group: 'Domains', name: 'Domain 4', dom: 4 }
    ]
  };
  D.presets = () => (D.PRESETS[E().track()] || D.PRESETS.DVA).map(p => p.dom && !p.topics && !p.or && p.group === 'Domains'
    ? Object.assign({}, p, { name: `Domain ${p.dom}: ${E().DOMAINS[p.dom]}` }) : p);
  D.preset = id => D.presets().find(p => p.id === id) || null;

  D.verified = () => SD.verified || {};
  D.isVerified = q => !!(q && q.id && D.verified()[q.id]);
  D.record = q => (q && q.id && D.verified()[q.id]) || null;

  const text = q => [q.q, q.ev, q.why].concat(q.opts || [], (q.items || []).map(i => i.t)).filter(Boolean).join(' ');
  // Bank questions a drill may ask on the chosen exam: on the exam (out-of-scope topics already drop out in js/exam.js),
  // not held out for the Exam Hall, not typed answers.
  D.base = () => (SD.bank || []).filter(q => q.id && q.type !== 'explain' && E().inTrack(q) && !E().isHeld(q) && E().allowed(q));
  D.matches = function (p, q) {
    if (p.dom && E().domainOf(q) !== p.dom) return false;
    const tagged = p.topics && p.topics.includes(q.topic);
    if (p.topics && !p.or) return !!tagged;
    if (p.or) return !!tagged || p.or.test(text(q));
    return true;
  };
  D.pool = p => (p ? D.base().filter(q => D.matches(p, q)) : []);
  D.counts = function (p) {
    const all = D.pool(p);
    return { n: all.length, v: all.filter(D.isVerified).length };
  };

  // Never asked first, then the one asked longest ago, with a little shuffle so two drills differ.
  const DAY = 86400000;
  function order(list) {
    const log = (SD.state.save && SD.state.save.qlog) || {};
    const t = q => (log[q.id] ? log[q.id][0] : 0) + Math.random() * DAY;
    return list.map(q => [t(q), q]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  }
  // A drill: { items: [{ q: id }], n, verified, topped }. With verified-only, up to n verified questions; when the topic
  // has fewer than MIN_VERIFIED, it tops up with unchecked ones (topped > 0) so it's never empty.
  D.build = function (p, n, verifiedOnly) {
    const all = D.pool(p), ver = all.filter(D.isVerified);
    let picks;
    let topped = 0;
    if (!verifiedOnly) picks = order(all).slice(0, n);
    else if (ver.length >= D.MIN_VERIFIED) picks = order(ver).slice(0, n);
    else {
      const rest = order(all.filter(q => !D.isVerified(q))).slice(0, Math.max(0, n - ver.length));
      topped = rest.length;
      picks = order(ver).concat(rest);
    }
    const items = SD.quiz.shuffle(picks.map(q => ({ q: q.id })));
    return { items, n: items.length, verified: items.filter(it => D.isVerified(E().find(it.q))).length, topped, avail: { n: all.length, v: ver.length } };
  };

  // The AWS docs a question cites: its verified sources first, then its own doc links, one URL each.
  D.docs = function (q) {
    const own = SD.exam && SD.exam.docs ? SD.exam.docs(q) : [].concat(q.doc || []);
    const rec = D.record(q), src = rec && Array.isArray(rec.src) ? rec.src.map(s => s && s.url) : [];
    const urls = src.concat(own).flatMap(u => String(u || '').split(/[\s,]+/)).filter(u => /^https:\/\//.test(u));
    return [...new Set(urls)];
  };
  D.docLabel = u => {
    const m = /^https:\/\/docs\.aws\.amazon\.com\/([^/]+)\//.exec(u);
    const page = u.replace(/[?#].*$/, '').replace(/\.html$/, '').split('/').filter(Boolean).slice(-1)[0] || u;
    return (m ? m[1].replace(/[-_]/g, ' ') + ': ' : '') + page.replace(/[-_]/g, ' ');
  };
})();
