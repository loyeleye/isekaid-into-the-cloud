// Checks js/aws-sim-ops.js, the operations rules shared through js/aws-sim.js, one documented AWS behaviour at a
// time (links in its header). Run from game/:  node tools/aws_ops_check.js
require('../js/aws-sim.js');
const AS = require('../js/aws-sim-ops.js');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
{ const b = AS.gateBucket(2, 1); const r = [AS.gateTake(b), AS.gateTake(b), AS.gateTake(b)]; check(r.join() === 'true,true,false', 'token bucket: the third request on a 2-token bucket gets a 429');
  AS.gateRefill(b); check(AS.gateTake(b) && !AS.gateTake(b), 'the bucket refills at its rate'); AS.gateRefill(b); AS.gateRefill(b); AS.gateRefill(b); check(b.tokens === 2, 'and never above its size'); }
check(AS.burstChangeable === false, 'the account-level burst is not customer-changeable');
check(AS.retryDelay(1, false, 'a') === 1 && AS.retryDelay(3, false, 'a') === 1, 'immediate retries come straight back');
check(AS.retryDelay(1, true, 'a') < AS.retryDelay(3, true, 'a'), 'backoff waits longer each attempt');
check(new Set(['a', 'b', 'c', 'd', 'e'].map(id => AS.retryDelay(2, true, id))).size > 1, 'jitter spreads callers apart');
check(AS.partitionOf('status', 7, 3) === 0 && AS.partitionOf('status', 8, 3) === 0, 'a status key puts every write on one partition');
check(new Set([0, 1, 2].map(n => AS.partitionOf('orderId', n, 3))).size === 3, 'a high-cardinality key spreads writes');
{ const w = Array.from({ length: 5 }, (_, i) => ({ id: 'w' + i, part: 0 })); const r = AS.writeTick(w, 3, 100);
  check(r.ok.length === 3 && r.hot.length === 2, 'over a partition\'s cap: ThrottlingException, however much table capacity is left');
  const r2 = AS.writeTick(w.map((x, i) => ({ id: x.id, part: i })), 3, 2); check(r2.over.length === 3, 'over the table\'s provisioned WCU: ProvisionedThroughputExceededException'); }
check(AS.kmsAllows('role', false), 'a key policy can grant a role directly');
check(!AS.kmsAllows('admins', true), 'an IAM Allow does nothing if the key policy doesn\'t let IAM decide');
check(AS.kmsAllows('iam', true) && !AS.kmsAllows('iam', false), 'with IAM enabled in the key policy, the role\'s own policy decides');
check(AS.visGuide(60, 0) === 360 && AS.visGuide(30, 5) === 185, 'visibility timeout guide: 6x the function timeout plus the batching window');
check(AS.pollCap(20, 10, true, 1) === 1 && AS.pollCap(20, 10, true, 6) === 6, 'FIFO: concurrency is capped by the number of message groups');
check(AS.pollCap(null, 10, false, 0) === 10 && AS.pollCap(3, 10, false, 0) === 3, 'reserved concurrency caps a standard queue\'s consumers');
check(!AS.provTargetOk('$LATEST') && AS.provTargetOk('live'), 'provisioned concurrency needs a version or alias, not $LATEST');
check(!AS.dlqTypeOk(true, false) && AS.dlqTypeOk(true, true) && AS.dlqTypeOk(false, false), 'a FIFO queue needs a FIFO DLQ');
check(AS.XRAY.throttle === 'purple' && AS.XRAY.fault === 'red' && AS.XRAY.error === 'yellow' && AS.XRAY.ok === 'green', 'trace map colours');
check(AS.xrayStatus({ fault: 1, throttle: 1 }) === 'fault' && AS.xrayStatus({ throttle: 1 }) === 'throttle' && AS.xrayStatus({}) === 'ok', 'a node shows its worst status');
check(AS.METRICS.queue.includes('ApproximateAgeOfOldestMessage') && AS.METRICS.store.includes('WriteThrottleEvents') && AS.METRICS.gate.includes('IntegrationLatency'), 'CloudWatch metric names');
console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
process.exit(fails.length ? 1 : 0);
