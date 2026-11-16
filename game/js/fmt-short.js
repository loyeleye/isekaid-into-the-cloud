// fmt-short.js: short column labels for compare items (item.short), for the sticky header strip over the phone row
// bands (SD.qf.ask with bands or colFirst). Kept apart from the item files so item text edits don't touch them.
// Each label is a few characters of the column's own name; the full name stays on the button's label.
window.SD = window.SD || {};
(function () {
  const SHORT = {
    'fmt-compare-01': ['SQS', 'SNS', 'EventBridge'],
    'fmt-compare-02': ['IAM auth', 'Cognito', 'Lambda auth'],
    'fmt-compare-03': ['SQS Std', 'SQS FIFO', 'Kinesis'],
    'fmt-compare-04': ['SQS Std', 'SQS FIFO', 'Kinesis'],
    'fmt-compare-05': ['User pool', 'Identity pool', 'Both pools'],
    'fmt-compare-06': ['Secrets Mgr', 'Param Store', 'Env var'],
    'fmt-compare-07': ['Secrets Mgr', 'Param Store', 'Env var'],
    'fmt-compare-08': ['All at once', 'Canary', 'Linear'],
    'fmt-compare-09': ['All at once', 'Canary', 'Linear'],
    'fmt-compare-10': ['All at once', 'Rolling', 'Immutable'],
    'fmt-compare-11': ['Rolling + batch', 'Immutable', 'Traffic split'],
    'fmt-compare-12': ['GetItem', 'Query', 'Scan'],
    'fmt-compare-13': ['AWS key', 'Customer key', 'String param'],
    'fmt-compare-14': ['DAX', 'ElastiCache', 'CloudFront'],
    'fmt-compare-15': ['LSI', 'GSI', 'New table'],
    'fmt-compare-16': ['LSI', 'GSI', 'New table'],
    'fmt-compare-17': ['SSE-S3', 'SSE-KMS', 'Client-side'],
    'fmt-compare-18': ['REST', 'HTTP', 'WebSocket'],
    'fmt-compare-19': ['REST', 'HTTP', 'WebSocket'],
    'fmt-compare-20': ['Standard', 'Express', 'SQS chain'],
    'fmt-compare-21': ['Logs Insights', 'X-Ray', 'CloudTrail'],
    'fmt-compare-22': ['On-failure', 'DLQ', 'Retries'],
    'fmt-compare-23': ['Standard-IA', 'One Zone-IA', 'Glacier Flex'],
    'fmt-compare-24': ['EBS', 'EFS', 'FSx Windows'],
    'fmt-compare-25': ['Multi-AZ', 'Read replica', 'Aurora Global']
  };
  (SD.fmtItems || []).forEach(it => { if (SHORT[it.id]) it.short = SHORT[it.id].slice(); });
  SD.fmtShort = SHORT;
})();
