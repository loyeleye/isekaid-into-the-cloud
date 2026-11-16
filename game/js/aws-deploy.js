// Deployments, simulated: the AWS rules for shipping a new version of a running app, shared by the Renovation
// (Architect's Draft, js/reno-core.js) and, later, Monster Hunt's Canary Gremlin (agreed between the two design
// threads, Nov 16). Pure rules, no DOM and no randomness: the same street, plan and release always give the same run.
// Loads in the browser (SD.awsDeploy) and in Node (require). The request-path rules are js/aws-sim.js.
//
// Every rule below was checked against the current AWS docs on Nov 16, 2026. Game time is in ticks and the numbers are
// small; the comments give the real behaviour, and nothing here should teach a false rule.
//
// Elastic Beanstalk (a standard environment; the EKS-based Beanstalk Cluster has its own options and isn't modelled):
//   https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.deploy-existing-version.html (the policy table)
//   https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html
//   https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environmentmgmt-updates-immutable.html
//   https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.CNAMESwap.html
//   - All at once: the fastest; downtime while it deploys; a failed deployment means downtime; rollback is a manual
//     redeploy. Deploys to the existing instances.
//   - Rolling: batches (BatchSizeType Percentage or Fixed); "some instances serve requests with the old version ...
//     while instances in completed batches serve ... the new version"; less capacity while it runs. A batch that isn't
//     healthy in time fails the deployment: completed batches keep the new version, the rest keep the old; recovery is
//     another deployment of a known good version (manual redeploy).
//   - Rolling with additional batch: launches a new batch before taking any instance out of service, so capacity stays
//     full, and terminates the additional batch when done. A failure is minimal if the first batch fails.
//   - Immutable: a second, temporary Auto Scaling group; a single instance first, then the rest once it's healthy;
//     capacity doubles for a short time; rollback is terminating the temporary group.
//   - Traffic splitting: needs an Application Load Balancer. New instances in a temporary group; a percentage of client
//     traffic goes to them for the evaluation time, then all of it. A failure affects that percentage only; rollback
//     moves traffic back and terminates the new instances.
//   - Blue/green: a second environment, tested on its own URL, then Swap environment URLs (a CNAME swap). Don't
//     terminate the old environment until the DNS change has propagated: caches don't always honour the TTL.
//   - Ignore health check: "prevents a deployment from rolling back when a batch fails to become healthy".
//
// Lambda with CodeDeploy (an alias, two versions, a deployment configuration):
//   https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html
//   https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/automating-updates-to-serverless-apps.html
//   https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html
//   https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html
//   https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html
//   - Canary10Percent5/10/15/30Minutes: 10 percent, then the remaining 90 percent after the interval.
//     Linear10PercentEvery1/2/3/10Minute(s): 10 percent every interval. AllAtOnce: everything at once.
//   - Alarms: CloudWatch alarms on the deployment roll it back automatically to the last known good version.
//   - BeforeAllowTraffic runs before traffic shifts; AfterAllowTraffic after all of it has shifted. The hook function
//     reports Succeeded or Failed (PutLifecycleEventHookExecutionStatus), or the deployment fails after an hour.
//   - An alias points to at most two versions, both published (never $LATEST), with the same execution role and the same
//     dead-letter queue configuration. CodeDeploy needs a previously deployed version to shift traffic from.
//
// CloudFormation DeletionPolicy:
//   https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-deletionpolicy.html
//   - Delete is the default, except an AWS::RDS::DBInstance (without DBClusterIdentifier) and AWS::RDS::DBCluster,
//     whose default is Snapshot. Retain keeps the resource and its contents, and it keeps costing money. Snapshot takes
//     a snapshot and then deletes; it's supported only for some types (RDS, EC2 volumes, ElastiCache, Neptune,
//     DocumentDB, Redshift), not for a DynamoDB table, an S3 bucket or an EC2 instance.
(function (root) {
  const AD = {};

  // ======================= Elastic Beanstalk =======================
  // A street: { houses: N, demand: D residents a tick, gate: 'alb' | 'clb' }.
  // A plan: { policy, batch, ignoreHC, split (percent), evalT (ticks), wait (ticks before the old street goes) }.
  // A house: { id, env 'a' (live) | 'b' (the new street), v 'old' | 'new', st 'up' | 'scaf' | 'dark' | 'gone', rented }.
  // Each renovation takes a house one tick under scaffolding (a rented, newly launched house takes two); it's up (and
  // serving) the tick after, when its health check runs. In the bad run a new house fails that check: it serves one tick (those residents get soot) and then goes dark.
  AD.EB = ['allAtOnce', 'rolling', 'rollingBatch', 'immutable', 'split', 'blueGreen'];
  AD.EB_NAME = { allAtOnce: 'All at once', rolling: 'Rolling', rollingBatch: 'Rolling with additional batch', immutable: 'Immutable', split: 'Traffic splitting', blueGreen: 'Blue/green (swap URLs)' };
  AD.STRAGGLERS = 2;      // ticks after a CNAME swap that cached DNS still sends one resident a tick to the old street
  AD.LAUNCH = 2;          // a new instance takes two ticks (launch, then deploy); deploying onto a running one takes one
  const MAX_T = 40;

  AD.ebRefuse = function (street, plan) {
    if (!AD.EB.includes(plan.policy)) return 'That isn\'t a deployment policy.';
    if (plan.policy === 'split' && street.gate !== 'alb') return 'Traffic splitting needs an Application Load Balancer, and this gate is a Classic Load Balancer.';
    return null;
  };

  AD.ebRun = function (street, plan, bad) {
    const N = street.houses, D = street.demand;
    const b = Math.max(1, Math.min(N, plan.batch | 0 || 1));
    let nid = 0;
    const H = [];
    const add = (env, v, st, rented) => { const h = { id: nid++, env, v, st, rented: !!rented, upAt: 0 }; H.push(h); return h; };
    for (let i = 0; i < N; i++) add('a', 'old', 'up', false);
    const out = { ticks: [], turned: 0, soot: 0, lumber: 0, finish: null, failAt: null, recover: null, mixed: false, refused: AD.ebRefuse(street, plan) };
    if (out.refused) return out;

    // Scaffolding: a house started at tick t is under scaffolding for t and comes up at t + 1 as version v.
    const reno = (hs, t, v) => hs.forEach(h => { h.st = 'scaf'; h.v = v; h.upAt = t + 1; });
    const launch = (n, env, t, v) => { const hs = []; for (let i = 0; i < n; i++) { const h = add(env, v, 'scaf', true); h.upAt = t + AD.LAUNCH; hs.push(h); } return hs; };
    const kill = hs => hs.forEach(h => { h.st = 'gone'; });
    const live = env => H.filter(h => h.env === env && h.st !== 'gone');
    const healthy = hs => hs.length && hs.every(h => h.st === 'up' && h.upAt < tNow);
    let tNow = 0;

    // The controller: one small state machine per policy, stepped at the start of every tick.
    let route = [{ env: 'a', share: 1 }];
    const st = { phase: 'go', queue: [], cur: null, extra: [], fresh: [], redo: [] };
    const orig = H.slice();
    for (let i = 0; i < orig.length; i += b) st.queue.push(orig.slice(i, i + b));
    let failed = false, done = false, restored = false;

    // Manual redeploy of the last good version onto every dark house, in batches (all at once for All at once).
    function redeploy(t) {
      const dark = H.filter(h => h.st === 'dark' && !h.rented);
      if (!dark.length) return true;
      if (st.redo.some(h => h.st === 'scaf')) return false;
      const n = plan.policy === 'allAtOnce' ? dark.length : b;
      reno(dark.slice(0, n), t, 'old');
      return false;
    }

    function step(t) {
      const p = plan.policy;
      if (failed) {
        if (restored) return;
        // Policies with a fresh fleet roll back by dropping it; the others need a manual redeploy.
        if (p === 'immutable' || p === 'split' || p === 'blueGreen' || p === 'rollingBatch') {
          kill(H.filter(h => h.rented));
          route = [{ env: 'a', share: 1 }];
        }
        const darkOld = H.filter(h => h.st === 'dark' && !h.rented);
        if (!darkOld.length) { restored = true; return; }
        redeploy(t);
        return;
      }
      if (done) return;
      if (p === 'allAtOnce') {
        if (st.phase === 'go') { reno(orig, t, 'new'); st.phase = 'wait'; st.cur = orig; return; }
        if (healthy(st.cur)) { done = true; return; }
      }
      if (p === 'rolling' || p === 'rollingBatch') {
        if (st.phase === 'go' && p === 'rollingBatch') { st.extra = launch(b, 'a', t, 'new'); st.cur = st.extra; st.phase = 'wait'; return; }
        if (st.phase === 'go') st.phase = 'next';
        if (st.phase === 'wait') {
          const ok = healthy(st.cur);
          const broke = st.cur.some(h => h.st === 'dark');
          if (!ok && !(broke && plan.ignoreHC)) return;
          st.phase = 'next';
        }
        if (st.phase === 'next') {
          if (!st.queue.length) { kill(st.extra); done = true; return; }
          st.cur = st.queue.shift(); reno(st.cur, t, 'new'); st.phase = 'wait';
        }
      }
      if (p === 'immutable') {
        if (st.phase === 'go') { st.cur = launch(1, 'a', t, 'new'); st.extra = st.cur.slice(); st.phase = 'one'; return; }
        if (st.phase === 'one' && healthy(st.cur)) { st.cur = launch(N - 1, 'a', t, 'new'); st.extra = st.extra.concat(st.cur); st.phase = 'rest'; return; }
        if (st.phase === 'rest' && healthy(st.cur)) { kill(orig); st.extra.forEach(h => { h.rented = false; }); done = true; return; }
      }
      if (p === 'split') {
        const pct = Math.max(1, Math.min(99, plan.split || 10)) / 100, ev = Math.max(1, plan.evalT || 2);
        if (st.phase === 'go') { st.cur = launch(N, 'b', t, 'new'); st.phase = 'up'; return; }
        if (st.phase === 'up' && healthy(st.cur)) { st.phase = 'eval'; st.until = t + ev - 1; }
        if (st.phase === 'up' && st.cur.every(h => h.st === 'up')) { route = [{ env: 'a', share: 1 - pct }, { env: 'b', share: pct }]; return; }
        if (st.phase === 'eval') {
          route = [{ env: 'a', share: 1 - pct }, { env: 'b', share: pct }];
          if (t > st.until) { route = [{ env: 'b', share: 1 }]; kill(orig); st.cur.forEach(h => { h.rented = false; }); done = true; }
          return;
        }
      }
      if (p === 'blueGreen') {
        const wait = Math.max(0, plan.wait | 0);
        if (st.phase === 'go') { st.cur = launch(N, 'b', t, 'new'); st.phase = 'test'; return; }
        // You test the new street on its own URL first: nobody else walks it until the swap.
        if (st.phase === 'test' && healthy(st.cur)) { st.phase = 'swap'; st.swapAt = t; }
        if (st.phase === 'swap') {
          const since = t - st.swapAt;
          const strag = since < AD.STRAGGLERS ? Math.min(1, D) : 0;
          route = strag ? [{ env: 'b', share: (D - strag) / D }, { env: 'a', share: strag / D }] : [{ env: 'b', share: 1 }];
          if (since >= wait && live('a').length) { kill(orig); }
          if (since >= Math.max(wait, AD.STRAGGLERS)) { st.cur.forEach(h => { h.rented = false; }); done = true; }
          return;
        }
      }
    }

    for (let t = 1; t <= MAX_T; t++) {
      tNow = t;
      H.forEach(h => { if (h.st === 'scaf' && h.upAt <= t) h.st = 'up'; });
      step(t);
      H.forEach(h => { if (h.st === 'scaf' && h.upAt <= t) h.st = 'up'; });
      // Serve: each route group's share of the residents, spread evenly over its standing houses.
      let served = 0, turned = 0, soot = 0;
      const vers = new Set();
      // A share above 0 always sends someone; the biggest group takes whatever rounding leaves.
      const wants = route.map(x => (x.share > 0 && D > 0 ? Math.max(1, Math.round(D * x.share)) : 0));
      if (route.length) { const big = wants.indexOf(Math.max.apply(null, wants)); wants[big] = Math.max(0, D - wants.reduce((s, w, i) => s + (i === big ? 0 : w), 0)); }
      route.forEach((r, gi) => {
        const want = wants[gi];
        const ups = H.filter(h => h.env === r.env && h.st === 'up');
        const n = Math.min(want, ups.length);
        served += n; turned += want - n;
        // Spread evenly: each standing house takes its share, so the new ones get theirs.
        const nNew = ups.filter(h => h.v === 'new').length;
        const toNew = n && nNew ? Math.max(1, Math.round(n * nNew / ups.length)) : 0;
        if (toNew) vers.add('new');
        if (n - toNew > 0) vers.add('old');
        if (bad) soot += toNew;
      });
      if (vers.size > 1) out.mixed = true;
      out.turned += turned; out.soot += soot;
      out.lumber = Math.max(out.lumber, H.filter(h => h.rented && h.st !== 'gone').length);
      // Health checks: in the bad run, every new house that came up this tick fails and goes dark.
      let broke = 0;
      if (bad) H.forEach(h => { if (h.v === 'new' && h.st === 'up' && h.upAt === t) { h.st = 'dark'; broke++; } });
      if (broke && !failed && !(plan.ignoreHC && (plan.policy === 'rolling' || plan.policy === 'rollingBatch'))) { failed = true; out.failAt = t; }
      if (broke && plan.ignoreHC && !failed && (plan.policy === 'rolling' || plan.policy === 'rollingBatch') && done === false && !st.queue.length) { failed = true; out.failAt = t; }
      out.ticks.push({ t, served, turned, soot, houses: H.filter(h => h.st !== 'gone').map(h => ({ id: h.id, env: h.env, v: h.v, st: h.st, rented: h.rented })), route: route.map(r => ({ env: r.env, share: r.share })) });
      if (done && !out.finish) out.finish = t;
      // Ignoring health checks, a bad release rolls on to the end; then it has failed everywhere.
      if (bad && done && !failed && H.some(h => h.st === 'dark')) { failed = true; out.failAt = out.failAt || t; done = false; restored = false; }
      if (failed && !restored && t > out.failAt && H.every(h => h.st !== 'dark' || h.rented) && H.filter(h => h.env === 'a' && h.st === 'up' && h.v === 'old').length >= Math.min(N, D) && route.every(r => r.env === 'a')) {
        restored = true;
      }
      if (failed && restored && out.recover == null) out.recover = t - out.failAt;
      if ((done && !bad) || (failed && restored)) break;
    }
    if (bad && plan.policy === 'blueGreen') out.recover = 0;   // caught on its own URL: nobody had moved
    if (bad && !failed) out.recover = 0;          // nothing cracked where anyone lived (blue/green caught it in test)
    if (bad && failed && out.recover == null) out.recover = Infinity;
    if (!bad && !out.finish) out.finish = Infinity;
    return out;
  };

  // ======================= Lambda: an alias and CodeDeploy =======================
  // A function: { demand: walkers a tick (10, so one is 10%), first: true when no version has shipped yet }.
  // A plan: { cfg: 'canary' | 'linear' | 'all', wait (canary minutes), every (linear minutes), alarm, pre, post, publish }.
  // A release: 'good', 'test' (a crack a hook's test finds, like a missing permission) or 'load' (one that only shows
  // under real traffic). A tick is a minute.
  AD.CANARY = [5, 10, 15, 30];
  AD.LINEAR = [1, 2, 3, 10];
  AD.cfgName = p => (p.cfg === 'canary' ? `Canary10Percent${p.wait}Minutes` : p.cfg === 'linear' ? `Linear10PercentEvery${p.every}Minute${p.every === 1 ? '' : 's'}` : 'AllAtOnce');
  AD.lamRefuse = function (fn, plan) {
    if (!plan.publish) return 'The alias can\'t point to $LATEST. Publish a version first (that\'s what AutoPublishAlias does).';
    if (fn.first && plan.cfg !== 'all') return 'CodeDeploy needs a previous version to shift traffic from. Ship this one once, then shift the next.';
    if (plan.cfg === 'canary' && !AD.CANARY.includes(plan.wait)) return 'That isn\'t a predefined canary.';
    if (plan.cfg === 'linear' && !AD.LINEAR.includes(plan.every)) return 'That isn\'t a predefined linear configuration.';
    return null;
  };
  // The new version's weight at minute m after traffic starts (m = 0 is the first minute).
  AD.weight = function (plan, m) {
    if (plan.cfg === 'all') return 1;
    if (plan.cfg === 'canary') return m < plan.wait ? 0.1 : 1;
    return Math.min(1, 0.1 * (1 + Math.floor(m / plan.every)));
  };
  AD.lamRun = function (fn, plan, release) {
    const D = fn.demand || 10;
    const out = { ticks: [], soot: 0, finish: null, failAt: null, recover: null, refused: AD.lamRefuse(fn, plan), caughtBy: null };
    if (out.refused) return out;
    const bad = release && release !== 'good';
    let t = 0, m = 0, rolled = false;
    const tick = (w, note) => {
      t++;
      const nw = rolled ? 0 : Math.round(D * w);
      const soot = bad ? nw : 0;
      out.soot += soot;
      out.ticks.push({ t, w: rolled ? 0 : w, newWalkers: nw, soot, note: note || '' });
      return soot;
    };
    // BeforeAllowTraffic: one minute; a test crack fails it and nothing shifts.
    if (plan.pre) {
      tick(0, 'pre');
      if (release === 'test') { out.failAt = t; out.recover = 0; out.caughtBy = 'pre'; return out; }
    }
    for (let guard = 0; guard < 200; guard++) {
      const w = AD.weight(plan, m);
      const s = tick(w, 'shift');
      m++;
      if (s && plan.alarm && !rolled) { rolled = true; out.failAt = t; out.caughtBy = 'alarm'; tick(0, 'rollback'); out.recover = 1; return out; }
      if (w >= 1) break;
    }
    // AfterAllowTraffic: one minute after everything has shifted; a test crack fails it, and the deployment rolls back.
    if (plan.post) {
      const s = tick(1, 'post');
      if (release === 'test') { rolled = true; out.failAt = t; out.caughtBy = 'post'; tick(0, 'rollback'); out.recover = 1; return out; }
      if (s && plan.alarm) { rolled = true; out.failAt = t; out.caughtBy = 'alarm'; tick(0, 'rollback'); out.recover = 1; return out; }
    }
    if (!bad) { out.finish = t; return out; }
    // A crack nobody caught: everyone walks into it for as long as Seymour watches (two more minutes), and it stays.
    tick(1, 'stuck'); tick(1, 'stuck');
    out.failAt = null; out.recover = Infinity;
    return out;
  };

  // ======================= CloudFormation DeletionPolicy =======================
  // A stack: [{ id, type: 'ec2' | 'rds' | 'ddb' | 's3', name }]. A plan: { [id]: 'Delete' | 'Retain' | 'Snapshot' }
  // (missing = the default). Tearing the stack down gives each resource an outcome and a nightly cost in lumber:
  // retained resources keep running (2), snapshots are stored (1), deleted ones cost nothing and keep no data.
  AD.SNAPSHOT_OK = ['rds'];
  AD.TYPE_NAME = { ec2: 'EC2 instance', rds: 'RDS DB instance', ddb: 'DynamoDB table', s3: 'S3 bucket' };
  AD.cfnDefault = type => (type === 'rds' ? 'Snapshot' : 'Delete');
  AD.cfnRefuse = function (stack, plan) {
    for (const r of stack) {
      const p = plan[r.id] || AD.cfnDefault(r.type);
      if (p === 'Snapshot' && !AD.SNAPSHOT_OK.includes(r.type)) return `Snapshot isn't supported on ${r.name} (${AD.TYPE_NAME[r.type]}). Only some types take snapshots, such as RDS.`;
    }
    return null;
  };
  AD.cfnTeardown = function (stack, plan) {
    const out = { refused: AD.cfnRefuse(stack, plan), res: [], lumber: 0 };
    if (out.refused) return out;
    stack.forEach(r => {
      const p = plan[r.id] || AD.cfnDefault(r.type);
      const o = p === 'Retain' ? { kept: 'running', data: true, cost: 2 } : p === 'Snapshot' ? { kept: 'snapshot', data: true, cost: 1 } : { kept: null, data: false, cost: 0 };
      out.res.push(Object.assign({ id: r.id, type: r.type, policy: p, dflt: !plan[r.id] }, o));
      out.lumber += o.cost;
    });
    return out;
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = AD;
  if (root && root.SD) root.SD.awsDeploy = AD;
})(typeof window !== 'undefined' ? window : this);
