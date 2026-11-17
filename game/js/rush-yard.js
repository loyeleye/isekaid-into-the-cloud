// The Rush, claim 9: the New Sorter (the freight yard). Rules only, no drawing, so tools/rush_sim_yard.js can run them
// headless; js/rush.js draws them (its "claim 9" blocks). Loaded after js/rush-core.js, which calls in here through
// a few small hooks (create, spawn, the walk to a bay, finishWork, the bin, step) when a claim has `yard: true`.
// Design: project files game-modes/lost-and-found-real/real-game/v3/claims/claim-9/design.md.
//
// The AWS behind each rule (DVA-C02), checked against the docs listed in the design (section 3) on Nov 17, 2026:
//   - Waybills are requests. Four work bays are the function's concurrency, shared by every version.
//   - A crate is a new code package. When its change set executes, the crate opens into a sorter with a number on its
//     plate and a wax seal: AutoPublishAlias publishing an immutable, numbered Lambda version. A sealed sorter can't be
//     fixed; the next crate replaces it.
//   - The LIVE points are the alias `live`. Its dial is the weighted routing config: at most two versions, picked at
//     random per waybill, so at low traffic the split is rough. Routing happens each time a waybill is taken (off the
//     platform too), so a canary error off the platform is usually done by the old version next time.
//   - The departure board (board) is DeploymentPreference.Type: Canary10Percent5Minutes, Linear10PercentEvery1Minute or
//     AllAtOnce. One game second stands for one real minute. Without the board you turn the dial yourself (a manual
//     update-alias with AdditionalVersionWeights), and there's no CodeDeploy deployment at all.
//   - The alarm wire (wire) is DeploymentPreference.Alarms: a CloudWatch alarm that goes off at the first error it
//     watches (SAM's own example: ErrorMetricGreaterThanZero). It only acts while a deployment is running: then
//     CodeDeploy stops it and rolls back. It watches the alias (every version) or, flipped, only the new version
//     (the ExecutedVersion dimension). An alarm counts errors, not reasons.
//   - The test track (tests) is Hooks.PreTraffic and Hooks.PostTraffic (Lambda's BeforeAllowTraffic and
//     AfterAllowTraffic). Pre sends a plain test waybill before any traffic shifts; post sends a plain and a gold one
//     after. A failed hook stops the deployment and rolls it back. Hooks belong to the deployment, so they need the
//     board (DeploymentPreference) too, and they still run when the deployment is forced to AllAtOnce.
//   - The weighbridge office (manifest) is a CloudFormation change set: each crate stops there and shows what it will
//     change, Replacement True or False, before you execute it (or delete it: send it back). A change set doesn't
//     promise the update will work. Without it, crates execute as they arrive (sam deploy --no-confirm-changeset).
//   - A Snag crate's stack update fails, and CloudFormation rolls the stack back to the last stable state.
//   - Slot 4 renames the waiting platform: Replacement True, a new queue with the old one deleted, and every waybill on
//     it goes with it.
//   - The red reverse lever is a manual rollback: point the alias back at the previous version. Free, any time.
//   - One deployment at a time: CodeDeploy allows one deployment per deployment group (not adjustable), and an alias
//     holds two versions at most. A hotfix that arrives mid-rollout waits, or you stop the rollout with rollback
//     (StopDeployment, or cancelling the stack update) and then deploy it, with a canary or forced to AllAtOnce
//     (a deployment can override its configuration).
//   - A rollback is a new deployment with a new ID.
//   - Night Orders: the parcel depot (Elastic Beanstalk deployment policies) and express mode (CloudFormation express
//     mode: faster stack updates, rollback off, so a failed update stays half-built until Retry or Roll back).
(function (root) {
  const SD = root.SD = root.SD || {};
  const R = SD.rushCore;
  if (!R) return;
  // Times in seconds (a game second is a real minute on the board).
  const YT = {
    // The old sorter and a good new one: how long a waybill takes at a bay (plus the walk to it).
    v1: 1.1, vNew: 0.5,
    stack: 2, express: 0.5, pre: 3, post: 2, canary: 7.5, canaryW: 0.1, linear: 1.5, linearW: 0.1,
    card: 6, office: 2, follow: 4, shipGrace: 4, train: 1.6, mast: 2, fixRollback: 3,
    shiftLeft: 1.5, burst: 10, burstSecs: 3, form2: 0.3, rushed: 0.25, burstRefund: 0.35
  };
  // The claim. Waves from the design (section 7), 6 seconds apart. Four bays, all Mira's.
  R.CLAIMS.sorter = {
    name: 'THE NEW SORTER', title: 'the New Sorter', locked: [], next: null, close: 72, clerk: 'papers', mira: 4,
    yard: true, cap: 14, grant: 3, gap: 6, resend: 0.15,
    belt: ['rack', 'bin', 'ledger', 'board', 'wire', 'tests', 'manifest'],
    waves: [
      { n: 24, secs: 10, poison: 0, refund: 0.30 },
      { n: 30, secs: 10, poison: 1, refund: 0.30 },
      { n: 34, secs: 11, poison: 1, refund: 0.40 },
      { n: 40, secs: 12, poison: 1, refund: 0.35 }
    ]
  };
  // The cellar behind the yard's side door, as review: claim 6's cellar on the yard's clock.
  R.CLAIMS.yardCellar = {
    name: 'THE CELLAR', title: 'the cellar', locked: [], next: null, close: 72, clerk: 'papers', gap: 6,
    belt: ['rack', 'reserve', 'bin', 'intern'],
    waves: [
      { n: 8, secs: 10, poison: 0, ask: 1 },
      { n: 10, secs: 10, poison: 0, ask: 1 },
      { n: 10, secs: 11, poison: 0, ask: 2 },
      { n: 12, secs: 12, poison: 1, ask: 2 }
    ]
  };
  R.CLAIMS.sorter.review = 'yardCellar';
  Object.assign(R.TOOLS, {
    board: { name: 'Departure board', aws: 'CodeDeploy deployment preference', cost: 1 },
    wire: { name: 'Alarm wire', aws: 'Deployment alarms (auto rollback)', cost: 1, needs: 'board', yardUpkeep: 'wave' },
    tests: { name: 'Test track', aws: 'Pre- and post-traffic hooks', cost: 1, needs: 'board', yardUpkeep: 'crate' },
    manifest: { name: 'Manifest', aws: 'CloudFormation change set', cost: 1 }
  });
  // Night Orders offered before claim 9 only (js/rush.js filters them out of the other claims' picks).
  for (const o of ['depot', 'express']) if (!R.ORDERS.includes(o)) R.ORDERS.push(o);
  const KINDS = ['cracked', 'bent', 'snag'];
  const DEPOT = { all: 0, rolling: 0, additional: 1, immutable: 1, split: 1 };
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const L = () => R.lib;
  const ev = (S, type, data) => L().ev(S, type, data);
  const purse = S => S.parent || S;
  // ---- Set-up: called at the end of rush-core's create() ----
  function init(S, C) {
    const yr = rng(((S.seed >>> 0) * 2654435761 + 97) >>> 0);
    S.yard = true; S.yrand = yr; S.cap = C.cap || S.cap; S.coins += C.grant || 0;
    // The two middle crates: two of cracked, bent and snag, in a seeded order.
    const ks = KINDS.slice(); for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(yr() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]]; }
    // Each wave's window: when it starts and when its last waybill is due (ship coins are judged a little after).
    const win = []; let t = 0.4; for (const w of C.waves) { win.push([t, t + w.secs]); t += w.secs + (C.gap || R.T.gap); }
    S.versions = [null, { n: 1, kind: 'good', speed: YT.v1, fixed: false, old: true }];
    S.alias = { cur: 1, next: null, w: 0 };
    S.cfg = 'canary'; S.watch = 'live'; S.testsOn = true; S.wireOn = true;
    Object.assign(S, { shipped: 0, falseAlarms: 0, rollbacks: 0, replaced: 0, incident: 0, busyTaps: 0, hotfixChoice: '', snags: 0, sentBack: 0, stopped: 0, hooksFailed: 0, testsPaid: 0, wirePaid: 0, yardErrors: 0, depotCoins: 0, depotLost: 0 });
    S.y = {
      win, crates: [
        { slot: 1, kind: 'good', wave: 1 },
        { slot: 2, kind: ks[0], wave: 2 },
        { slot: 3, kind: ks[1], wave: 3 },
        { slot: 4, kind: 'good', wave: 4, rebuild: true }
      ],
      wave: 0, train: null, queue: [], held: null, dep: null, prev: [], depN: 100, amends: [], mastRed: 0,
      hf: { state: 'pending', rushed: yr() < YT.rushed, at: 0, deadline: 0, choice: '', followAt: 0, wave: 0 },
      form2: false, broken: null, fixAt: 0, depot: S.orders.has('depot') ? { policy: 'all', waves: {}, bench: 'v1', badUntil: 0 } : null
    };
    S.y.crates.forEach(c => { c.shipBy = shipBy(S, c.wave); });
  }
  // Between waves: this wave's waybills are all in, and the next wave isn't due for a few seconds.
  function gapNow(S) {
    const w = S.y.win, i = Math.max(0, S.wave - 1), next = w[i + 1];
    return S.time >= w[i][1] && (!next || next[0] - S.time > YT.stack + 0.5);
  }
  // When a wave's crate is judged for its ship coin: by the end of its wave (the last wave's, at closing).
  function shipBy(S, w) { return w >= S.y.win.length ? S.close : S.y.win[w - 1][1] + YT.shipGrace; }
  // A hotfix has till the next wave's first waybill (the last wave's, till closing).
  function hotShipBy(S, w) { return w >= S.y.win.length ? S.close : S.y.win[w][0]; }
  // A debug seed option (?fresh in rush.html): the second crate is good. Or set the two middle crates for the sim.
  function setCrates(S, kinds) { kinds.forEach((k, i) => { if (S.y.crates[i + 1]) S.y.crates[i + 1].kind = k; }); }
  // ---- Hooks from rush-core ----
  function onSpawn(S, k) {
    // New refund forms after the hotfix is announced: 30% of gold waybills carry a blue corner.
    // They come in over the counter: the caller waits for the answer (a synchronous call), so they skip the platform,
    // and an error goes straight back to the caller, a lost request.
    if (S.y.form2 && k.refund && !k.twin && S.yrand() < YT.form2) { k.form2 = true; k.sync = true; }
  }
  // The counter: a caller standing at the window waits for the answer (a synchronous invoke). LIVE picks the version
  // as usual, and an error goes straight back to the caller: no platform, no retry, a lost request.
  function counter(S, k) { k.ver = pickVersion(S); k.from = 'counter'; L().go(k, 'counter', S.versions[k.ver].speed); }
  function counterStep(S) {
    for (const k of S.tickets) {
      if (k.phase !== 'counter' || k.t < k.dur) continue;
      if (fails(S, k)) L().go(k, 'splat', R.T.splat); else L().go(k, 'done', R.T.done);
    }
  }
  // The weighted alias: the new version gets its share at random, waybill by waybill.
  function pickVersion(S) { const a = S.alias; return a.next && S.yrand() < a.w ? a.next : a.cur; }
  // A waybill reaches a bay: route it through LIVE, and it takes as long as that version does.
  function route(S, k, w) { k.ver = pickVersion(S); const v = S.versions[k.ver]; return v.speed * (w / R.T.work); }
  function fails(S, k) {
    const v = S.versions[k.ver || S.alias.cur];
    const bad = !!(k.poison || v.kind === 'cracked' || (v.kind === 'bent' && k.refund) || (k.form2 && !v.fixed));
    k.err = bad;
    if (!bad) return false;
    S.yardErrors++;
    if (k.form2 && !v.fixed && !k.poison) S.incident++;
    ev(S, 'yardError', { id: k.id, ver: k.ver, poison: !!k.poison, form2: !!k.form2, refund: !!k.refund });
    alarm(S, k.ver, k);
    return true;
  }
  // The alarm wire: at the first error it watches, while a deployment runs, the deployment stops and rolls back.
  function watching(S) { const d = S.y.dep; return !!(S.wire && S.wireOn && d && d.cfg !== 'hand' && ['pre', 'shift', 'post'].includes(d.phase)); }
  function alarm(S, ver, k) {
    if (!watching(S)) return;
    if (S.watch === 'new' && ver !== S.y.dep.v) return;
    S.y.mastRed = YT.mast;
    rollback(S, 'alarm', { poison: !!(k && k.poison), form2: !!(k && k.form2) });
  }
  // ---- The deployment group ----
  function groupBusy(S) {
    const d = S.y.dep;
    if (!d) return false;
    if (d.cfg === 'hand' && d.phase === 'shift' && S.alias.w <= 0) return false;
    return true;
  }
  function shiftLeft(S) {
    const d = S.y.dep; if (!d || d.phase !== 'shift') return 0;
    if (d.cfg === 'canary') return YT.canary - d.t;
    if (d.cfg === 'linear') return (1 / YT.linearW - 1) * YT.linear - d.t;
    if (d.cfg === 'hand') return S.alias.w > 0 && S.alias.w < 1 ? 99 : 0;
    return 0;
  }
  function crateWave(S) { return S.wave || 1; }
  // Start a crate's deployment: its change set executes (the stack update), then publish, hooks, shift.
  function begin(S, crate, cfg) {
    const Y = S.y;
    Y.dep = { crate, v: 0, phase: 'stack', t: 0, cfg: cfg || (S.board ? S.cfg : 'hand'), id: 'd-' + (++Y.depN) };
    ev(S, 'stack', { slot: crate.slot, hotfix: !!crate.hotfix, cfg: Y.dep.cfg });
    // Replacement: True. The update swaps in a new platform and deletes the old one, with everything waiting on it.
    if (crate.rebuild && !crate.replacedDone && S.rack) {
      crate.replacedDone = true;
      const lost = S.queue.slice(); S.queue = [];
      for (const id of lost) { const k = S.tickets.find(x => x.id === id); if (k) { L().remove(S, k); S.replaced++; L().lose1(S, k, 'replaced'); if (purse(S).over) return; } }
      ev(S, 'replaced', { n: lost.length });
    }
  }
  // A crate that's ready to go: deploy now if the group is free, otherwise it waits its turn (a pipeline would).
  function offerCrate(S, crate) {
    if (groupBusy(S) || S.y.dep) { if (S.y.dep && !groupBusy(S)) supersede(S); else { S.y.queue.push(crate); return; } }
    begin(S, crate);
  }
  // The hand dial is at 0 with a version waiting: a newer crate takes its place (the old one stays sealed on its spur).
  function supersede(S) { const d = S.y.dep; S.alias.next = null; S.alias.w = 0; S.y.dep = null; ev(S, 'superseded', { v: d.v }); }
  function nextQueued(S) {
    if (S.y.dep || !S.y.queue.length) return;
    const c = S.y.queue.shift();
    begin(S, c, c.forceCfg);
  }
  function publish(S, d) {
    const c = d.crate, n = S.versions.length;
    const kind = c.hotfix ? (c.kind === 'cracked' ? 'cracked' : 'good') : c.kind;
    S.versions.push({ n, kind, speed: YT.vNew, fixed: !!c.hotfix || S.versions.some(v => v && v.fixed), hotfix: !!c.hotfix, slot: c.slot });
    d.v = n; c.v = n;
    ev(S, 'publish', { v: n, slot: c.slot, hotfix: !!c.hotfix });
  }
  function finish(S) {
    const Y = S.y, d = Y.dep;
    Y.prev.push(S.alias.cur); S.alias.cur = d.v; S.alias.next = null; S.alias.w = 0; Y.dep = null; d.crate.wentLive = true;
    ev(S, 'deployed', { v: d.v, slot: d.crate.slot, hotfix: !!d.crate.hotfix, cfg: d.cfg });
    if (d.crate.hotfix && S.versions[d.v].kind === 'good') Y.hf.state = 'done';
    // A forced deployment is over before the signal could watch it.
    if (d.cfg === 'all') ev(S, 'noWindow', { v: d.v });
    nextQueued(S);
  }
  // Roll back the running deployment: LIVE goes back to the current version. why: alarm, hook, lever, stopped, dial.
  function rollback(S, why, info) {
    const Y = S.y, d = Y.dep;
    if (!d) return false;
    const v = d.v && S.versions[d.v];
    S.alias.next = null; S.alias.w = 0; Y.dep = null; S.rollbacks++;
    if (why === 'hook') S.hooksFailed++;
    const good = v && v.kind === 'good';
    if (why === 'alarm' && good) S.falseAlarms++;
    ev(S, 'rollback', Object.assign({ why, v: d.v, slot: d.crate.slot, hotfix: !!d.crate.hotfix, good, dep: 'd-' + (++Y.depN) }, info || {}));
    // A rushed hotfix that's caught: a hotfix for the hotfix follows.
    if (d.crate.hotfix && v && v.kind === 'cracked') { Y.hf.followAt = S.time + YT.follow; Y.hf.state = 'follow'; }
    // A good hotfix stopped by the alarm (a poison waybill on LIVE): the pipeline sends it again.
    else if (d.crate.hotfix && why === 'alarm' && !d.crate.again) { const c = Object.assign({}, d.crate, { again: true, v: 0 }); Y.queue.unshift(c); }
    if (why !== 'stopped') nextQueued(S);
    return true;
  }
  // ---- Per-step clock, called from rush-core's step() after the spawns ----
  function tick(S, dt) {
    const Y = S.y;
    Y.mastRed = Math.max(0, Y.mastRed - dt);
    if (S.wave !== Y.wave) { Y.wave = S.wave; onWave(S, S.wave); }
    // The train: the crate rolls in, then stops at the office (manifest) or executes.
    if (Y.train) { Y.train.t += dt; if (Y.train.t >= YT.train) { const c = Y.train.crate; Y.train = null; arrive(S, c); } }
    // Mid-claim blueprint changes: each is a small stack update that takes a couple of seconds.
    for (const a of Y.amends.slice()) if (S.time >= a.at) { Y.amends = Y.amends.filter(x => x !== a); S[a.tool] = true; S.placed.push(a.tool); if (a.tool === 'wire') S.wireOn = true; ev(S, 'place', { tool: a.tool, amend: true }); }
    // The office: a crate held for "when the platform's empty" goes when it is.
    if (Y.held && Y.held.when === 'empty' && S.time >= Y.held.readyAt && (gapNow(S) || S.wave >= Y.win.length) && (!S.rack || !S.queue.length) && !groupBusy(S)) { const c = Y.held.crate; Y.held = null; ev(S, 'execute', { slot: c.slot, when: 'empty' }); offerCrate(S, c); }
    if (Y.held && Y.held.when === 'now' && S.time >= Y.held.readyAt) { const c = Y.held.crate; Y.held = null; ev(S, 'execute', { slot: c.slot, when: 'now' }); offerCrate(S, c); }
    // Express mode's half-built yard, put back by a rollback.
    if (Y.broken && Y.fixAt && S.time >= Y.fixAt) { S[Y.broken] = true; ev(S, 'stackFixed', { piece: Y.broken, how: 'rollback' }); Y.broken = null; Y.fixAt = 0; }
    counterStep(S);
    step(S, dt);
    hotfixStep(S);
    // Between waves: the weighbridge inspector comes round with a card (js/rush.js shows it).
    for (let i = 0; i < Y.win.length - 1; i++) if (!Y['gap' + i] && S.time >= Y.win[i][1] + 1) { Y['gap' + i] = true; ev(S, 'yardGap', { wave: i + 1 }); }
    // Ship coins: a crate that's fully live a little after its wave's last waybill.
    for (const c of Y.crates.concat(Y.extra || [])) if (!c.judged && c.shipBy && S.time >= c.shipBy) judge(S, c);
  }
  function step(S, dt) {
    const Y = S.y, d = Y.dep;
    if (!d) return;
    d.t += dt;
    if (d.phase === 'stack') {
      if (d.t < (S.orders.has('express') ? YT.express : YT.stack)) return;
      const c = d.crate;
      if (c.kind === 'snag' && !c.hotfix) {
        Y.dep = null; S.snags++;
        if (S.orders.has('express')) {
          // Rollback is off: the piece it broke stays broken until Retry or Roll back.
          const piece = ['rack', 'bin', 'ledger'].find(p => S[p]) || null;
          if (piece) { S[piece] = false; Y.broken = piece; }
          ev(S, 'updateFailed', { piece, slot: c.slot });
        } else ev(S, 'stackRollback', { slot: c.slot });
        nextQueued(S); return;
      }
      publish(S, d);
      depotDeploy(S, d);
      // Hooks need paying for (a hook run is a paid invocation): no coin, no test.
      if (S.tests && S.testsOn && d.cfg !== 'hand') {
        if (purse(S).coins >= 1) { purse(S).coins--; S.testsPaid++; d.hooked = true; d.phase = 'pre'; d.t = 0; ev(S, 'hook', { stage: 'pre', v: d.v }); return; }
        ev(S, 'testsSkipped', { v: d.v });
      }
      startShift(S, d); return;
    }
    if (d.phase === 'pre') {
      if (d.t < YT.pre) return;
      // The pre-traffic test sends a plain waybill: only a cracked sorter fails it.
      if (S.versions[d.v].kind === 'cracked') { ev(S, 'hookResult', { stage: 'pre', ok: false, v: d.v }); rollback(S, 'hook'); return; }
      ev(S, 'hookResult', { stage: 'pre', ok: true, v: d.v });
      startShift(S, d); return;
    }
    if (d.phase === 'shift') {
      const a = S.alias;
      if (d.cfg === 'canary') a.w = d.t < YT.canary ? YT.canaryW : 1;
      else if (d.cfg === 'linear') a.w = Math.min(1, YT.linearW * (Math.floor(d.t / YT.linear) + 1));
      else if (d.cfg === 'all') a.w = 1;
      if (a.w >= 1) endShift(S, d);
      return;
    }
    if (d.phase === 'post') {
      if (d.t < YT.post) return;
      // The post-traffic test sends a plain and a gold waybill: cracked or bent fails it.
      const v = S.versions[d.v];
      if (v.kind === 'cracked' || v.kind === 'bent') { ev(S, 'hookResult', { stage: 'post', ok: false, v: d.v }); rollback(S, 'hook'); return; }
      ev(S, 'hookResult', { stage: 'post', ok: true, v: d.v });
      finish(S);
    }
  }
  function startShift(S, d) {
    d.phase = 'shift'; d.t = 0; S.alias.next = d.v; S.alias.w = d.cfg === 'all' ? 1 : d.cfg === 'hand' ? 0 : YT.canaryW;
    ev(S, 'shift', { v: d.v, cfg: d.cfg });
    if (d.cfg === 'all') endShift(S, d);
  }
  function endShift(S, d) {
    // Post-traffic runs when this deployment paid for its tests (one coin covers both hooks).
    if (d.hooked) { d.phase = 'post'; d.t = 0; S.alias.w = 1; ev(S, 'hook', { stage: 'post', v: d.v }); return; }
    finish(S);
  }
  // ---- Waves: crates, upkeep, ship coins ----
  function onWave(S, w) {
    const Y = S.y;
    // The alarm wire bills from wave 2. No coin: it goes dark until there is one.
    if (w >= 2 && S.wire) {
      if (purse(S).coins >= 1) { purse(S).coins--; S.wirePaid++; S.upkeepPaid++; if (!S.wireOn) ev(S, 'wireBack'); S.wireOn = true; ev(S, 'upkeep', { n: 1, tool: 'wire' }); }
      else if (S.wireOn) { S.wireOn = false; ev(S, 'wireDark'); }
    }
    if (Y.depot) depotWave(S, w);
    const c = Y.crates.find(x => x.wave === w);
    if (c) { Y.train = { crate: c, t: 0 }; ev(S, 'train', { slot: c.slot }); }
  }
  function arrive(S, c) {
    const Y = S.y;
    ev(S, 'crate', { slot: c.slot, hotfix: !!c.hotfix });
    if (S.manifest && !c.hotfix) { Y.held = { crate: c, readyAt: S.time + YT.office, when: '' }; ev(S, 'held', { slot: c.slot }); return; }
    offerCrate(S, c);
  }
  // A crate's ship coin: it's the current version (fully live) by the time its wave is judged.
  function judge(S, c) {
    c.judged = true;
    const v = c.v && S.versions[c.v];
    // Live: it went live, and LIVE hasn't been rolled back past it (a newer version on top still carries it).
    const live = !!(v && c.wentLive && S.alias.cur >= c.v);
    if (live && v.kind === 'good') { purse(S).coins++; S.shipped++; ev(S, 'ship', { slot: c.slot, v: c.v, hotfix: !!c.hotfix }); }
  }
  // At the end of the claim: anything not judged yet is judged now (the sim and js/rush.js call this).
  function settle(S) {
    const Y = S.y; if (!Y) return;
    // The mail's all done before the shutters: with no traffic left, a deployment that's past its stack update runs out.
    if (S.over === 'win' && Y.dep && ['pre', 'shift', 'post'].includes(Y.dep.phase) && !Y.settled) { Y.settled = true; finish(S); }
    for (const c of Y.crates.concat(Y.extra || [])) if (!c.judged && c.shipBy) judge(S, c); if (Y.depot) depotWave(S, 99); }
  // ---- The hotfix ----
  function hotfixStep(S) {
    const Y = S.y, H = Y.hf;
    if (H.state === 'pending' && S.wave >= 2) {
      const [a, b] = Y.win[S.wave - 1] || [0, 0];
      const open = Y.dep && Y.dep.phase === 'shift' && shiftLeft(S) >= YT.shiftLeft;
      const fallback = S.wave === 4 && S.time >= a + (b - a) * 0.6;
      if ((open && S.time > (a + b) / 2) || fallback) fireHotfix(S);
    }
    if (H.state === 'card' && S.time >= H.deadline) choose(S, 'wait', true);
    if (H.state === 'follow' && H.followAt && S.time >= H.followAt) {
      H.followAt = 0; H.state = 'chosen';
      const c = { slot: 'H2', kind: 'good', hotfix: true, follow: true, wave: S.wave, shipBy: hotShipBy(S, S.wave) };
      if (c.shipBy < S.time + 1) c.shipBy = S.time + 8;
      (Y.extra = Y.extra || []).push(c);
      ev(S, 'followUp');
      offerCrate(S, c);
    }
  }
  function fireHotfix(S) {
    const Y = S.y, H = Y.hf;
    H.state = 'card'; H.at = S.time; H.deadline = S.time + YT.card; H.wave = S.wave; Y.form2 = true;
    // The 9 o'clock post: ten more waybills over three seconds.
    for (let i = 0; i < YT.burst; i++) S.spawns.push({ t: S.time + 0.15 + (i / YT.burst) * YT.burstSecs + S.yrand() * 0.1, wave: S.wave, poison: false, refund: S.yrand() < YT.burstRefund, key: 'h' + i, group: i % 3 });
    S.spawns.sort((p, q) => p.t - q.t); S.allSpawned = false;
    const inFlight = S.tickets.filter(k => !k.quiz && k.phase !== 'done').length + S.queue.length;
    H.inFlight = inFlight;
    ev(S, 'hotfix', { busy: groupBusy(S), left: shiftLeft(S), inFlight, v: Y.dep ? Y.dep.v : 0 });
  }
  // The choice card: wait for the rollout, stop it and canary the hotfix, or stop it and force the hotfix all at once.
  function choose(S, choice, auto) {
    const Y = S.y, H = Y.hf;
    if (H.state !== 'card') return 'no';
    H.state = 'chosen'; H.choice = choice; S.hotfixChoice = choice + (auto ? ' (auto)' : '');
    const w = H.wave || S.wave;
    const c = { slot: 'H', kind: H.rushed ? 'cracked' : 'good', hotfix: true, wave: w, shipBy: hotShipBy(S, w) };
    if (c.shipBy < S.time + 1) c.shipBy = S.time + 8;
    (Y.extra = Y.extra || []).push(c);
    const busy = groupBusy(S);
    ev(S, 'choice', { choice, auto: !!auto, busy });
    if (choice === 'wait') {
      if (busy) { Y.queue.unshift(c); ev(S, 'parked'); } else { if (Y.dep) supersede(S); begin(S, c); }
      return '';
    }
    if (busy) { const d = Y.dep; S.stopped++; rollback(S, 'stopped'); d.crate.stopped = true; }
    else if (Y.dep) supersede(S);
    // The hotfix goes first, ahead of anything waiting.
    begin(S, c, choice === 'force' ? 'all' : undefined);
    return '';
  }
  // ---- The player's controls ----
  // Before the whistle: tick the blueprint's lines and sam deploy builds them all at once (one stack).
  function blueprint(S, tools) {
    const out = {};
    for (const t of tools) out[t] = R.place(S, t);
    ev(S, 'deploy', { tools: tools.filter(t => out[t] === '') });
    return out;
  }
  // After the whistle: a blueprint change applies as a small stack update, two seconds later.
  function amend(S, tool) {
    if (!S.started) return R.place(S, tool);
    const why = R.canPlace(S, tool);
    if (why) return why;
    if (S.y.amends.some(a => a.tool === tool)) return 'placed';
    purse(S).coins -= R.costOf(S, tool);
    S.y.amends.push({ tool, at: S.time + YT.stack });
    ev(S, 'amend', { tool });
    return '';
  }
  // The office: execute the held crate's change set now, when the platform is empty, or send it back (delete it).
  function execute(S, when) {
    const Y = S.y;
    if (when === 'hotfix') {
      // Dragging the hotfix onto the points.
      if (Y.hf.state !== 'card' && !Y.queue.some(c => c.hotfix)) return 'no';
      if (groupBusy(S)) { S.busyTaps++; ev(S, 'busy'); return 'busy'; }
      if (Y.hf.state === 'card') return choose(S, 'wait');
      const c = Y.queue.find(x => x.hotfix); Y.queue = Y.queue.filter(x => x !== c); begin(S, c); return '';
    }
    if (!Y.held) return 'no';
    Y.held.when = when === 'empty' ? 'empty' : 'now';
    if (Y.held.when === 'now' && groupBusy(S) && S.time >= Y.held.readyAt) { S.busyTaps++; ev(S, 'busy'); }
    return '';
  }
  function sendBack(S) {
    const Y = S.y; if (!Y.held) return 'no';
    const c = Y.held.crate; Y.held = null; c.sentBack = true; S.sentBack++; ev(S, 'sentBack', { slot: c.slot });
    return '';
  }
  // The hand dial (no board): set the new version's share in tenths. 0 takes it off; 100% makes it current.
  function dial(S, w) {
    const d = S.y.dep;
    if (!d || d.cfg !== 'hand' || d.phase !== 'shift') return 'no';
    w = Math.max(0, Math.min(1, Math.round(w * 10) / 10));
    S.alias.w = w; ev(S, 'dial', { w, v: d.v });
    if (w >= 1) finish(S);
    return '';
  }
  // The red reverse lever: LIVE back to the previous version. Mid-shift it rolls the shift back.
  function lever(S) {
    const Y = S.y;
    if (S.over || !S.started) return 'no';
    if (Y.dep && Y.dep.phase !== 'stack' && Y.dep.phase !== 'pre') { rollback(S, 'lever'); return ''; }
    if (!Y.prev.length) return 'no';
    const was = S.alias.cur, v = S.versions[was];
    S.alias.cur = Y.prev.pop(); S.rollbacks++;
    ev(S, 'rollback', { why: 'lever', v: was, good: v.kind === 'good', dep: 'd-' + (++Y.depN), after: true });
    if (v.hotfix && v.kind === 'cracked' && Y.hf.state !== 'follow' && !Y.hf.followed) { Y.hf.followed = true; Y.hf.followAt = S.time + YT.follow; Y.hf.state = 'follow'; }
    return '';
  }
  const CARDS_CYCLE = ['canary', 'linear', 'all'];
  function setCard(S, cfg) { S.cfg = cfg || CARDS_CYCLE[(CARDS_CYCLE.indexOf(S.cfg) + 1) % 3]; ev(S, 'card', { cfg: S.cfg }); return ''; }
  function setAlarm(S, watch) { S.watch = watch || (S.watch === 'live' ? 'new' : 'live'); ev(S, 'watch', { watch: S.watch }); return ''; }
  function setTests(S, on) { S.testsOn = on == null ? !S.testsOn : !!on; ev(S, 'tests', { on: S.testsOn }); return ''; }
  // Express mode: a half-built yard. Retry (a coin, straight away) or roll back (free, three seconds).
  function fixStack(S, how) {
    const Y = S.y; if (!Y.broken || Y.fixAt) return 'no';
    if (how === 'retry') { if (purse(S).coins < 1) return 'coins'; purse(S).coins--; S[Y.broken] = true; ev(S, 'stackFixed', { piece: Y.broken, how }); Y.broken = null; return ''; }
    Y.fixAt = S.time + YT.fixRollback; ev(S, 'stackFixing', { piece: Y.broken }); return '';
  }
  // ---- The parcel depot (Night Order): Elastic Beanstalk deployment policies on four rented benches ----
  function setDepot(S, policy) { if (S.y.depot && DEPOT[policy] != null && !S.started) { S.y.depot.policy = policy; ev(S, 'depotPolicy', { policy }); } return ''; }
  // Each crate the sorter publishes goes onto the depot's benches too, with the chosen policy.
  function depotDeploy(S, d) {
    const D = S.y.depot; if (!D || d.crate.hotfix) return;
    let p = D.policy;
    if (DEPOT[p]) { if (purse(S).coins >= 1) purse(S).coins--; else { p = 'rolling'; ev(S, 'depotPoor'); } }
    const kind = S.versions[d.v].kind, wv = S.wave, rec = D.waves[wv] = D.waves[wv] || { lost: 0, bounced: 0, deployed: 0 };
    rec.deployed++; rec.policy = p;
    if (p === 'all') rec.bounced++;
    if (p === 'rolling') rec.bounced++;
    // A bad version on the benches: only Immutable (a fresh set, thrown away) and Traffic splitting protect them.
    let lost = 0;
    if (kind === 'cracked' || kind === 'bent') {
      if (p === 'immutable') lost = 0;
      else if (p === 'split') lost = S.yrand() < 0.3 ? 1 : 0;
      else lost = kind === 'cracked' ? 2 : 1;
    }
    rec.lost += lost; D.bench = lost ? 'bad' : 'v' + d.v;
    ev(S, 'depot', { policy: p, kind, lost, v: d.v });
    for (let i = 0; i < lost; i++) { S.depotLost++; L().lose1(S, { id: -1 }, 'depot'); if (purse(S).over) return; }
  }
  // At each wave's start, the last wave's depot is judged: no bounces and no losses pays a coin.
  function depotWave(S, w) {
    const D = S.y.depot;
    for (let i = 1; i < Math.min(w, 5); i++) {
      if (D.waves[i] && D.waves[i].judged) continue;
      const r = D.waves[i] = D.waves[i] || { lost: 0, bounced: 0, deployed: 0 };
      r.judged = true;
      if (!r.lost && !r.bounced) { purse(S).coins++; S.depotCoins++; ev(S, 'depotCoin', { wave: i }); }
    }
  }
  // ---- What the manifest slip shows for a crate: the change set, one line per resource ----
  function slip(c) {
    const lines = [
      { act: 'Modify', id: 'SorterFunction', type: 'AWS::Lambda::Function', rep: 'False' },
      { act: 'Add', id: 'SorterVersion', type: 'AWS::Lambda::Version', rep: '' },
      { act: 'Modify', id: 'SorterAliaslive', type: 'AWS::Lambda::Alias', rep: 'False' }
    ];
    if (c.rebuild) lines.push({ act: 'Modify', id: 'WaitingPlatform', type: 'AWS::SQS::Queue', rep: 'True' });
    if (c.kind === 'snag') lines.push({ act: 'Add', id: 'ReturnsWagonPolicy', type: 'AWS::SQS::QueuePolicy', rep: '' });
    return lines;
  }
  // ---- Inspection cards: read a short piece of real config and tap the line that's wrong (kind 'line'), or pick the
  // fix (kind 'fix'). Written for this game from the AWS docs in the design's section 3; the answer is `answer` (a
  // line index) or the first option. Kept short enough to read at 390 px wide. ----
  const CARDS = [
    { id: 'sorter.k0', kind: 'line', file: 'template.yaml', q: 'Each code change should reach a tenth of the traffic first, and roll back by itself if errors show. Instead every deploy goes straight to 100%. Tap the line to change.',
      lines: ['Sorter:', '  Type: AWS::Serverless::Function', '  Properties:', '    CodeUri: sorter/', '    Handler: app.handler', '    Runtime: nodejs20.x', '    AutoPublishAlias: live', '    DeploymentPreference:', '      Type: AllAtOnce', '      Alarms:', '        - !Ref NewVersionErrors'],
      answer: 8, fix: 'Type: Canary10Percent5Minutes',
      why: 'AllAtOnce shifts all the traffic at once, and the deployment is over before the alarm sees a thing. Canary10Percent5Minutes sends 10% for five minutes, then the rest, and the listed alarm can roll it back while only a tenth is exposed.' },
    { id: 'sorter.k1', kind: 'fix', file: 'template.yaml', q: 'SAM rejects this function: its DeploymentPreference needs a property it hasn\'t got. Which line goes under Properties?',
      lines: ['Sorter:', '  Type: AWS::Serverless::Function', '  Properties:', '    CodeUri: sorter/', '    Handler: app.handler', '    Runtime: nodejs20.x', '    DeploymentPreference:', '      Type: Canary10Percent5Minutes'],
      opts: ['AutoPublishAlias: live', 'Tracing: Active', 'ReservedConcurrentExecutions: 4', 'Timeout: 30'],
      why: 'Gradual deployments shift an alias between versions, so SAM needs AutoPublishAlias: it publishes a new version when the code changes and points the alias at it. CodeDeploy then shifts that alias.' },
    { id: 'sorter.k2', kind: 'line', file: 'appspec.yaml', q: 'This AppSpec file for a Lambda deployment is rejected. Tap the line that\'s wrong.',
      lines: ['version: 0.0', 'Resources:', '  - Sorter:', '      Type: AWS::Lambda::Function', '      Properties:', '        Name: sorter', '        Alias: live', '        CurrentVersion: "4"', '        TargetVersion: "5"', 'Hooks:', '  - BeforeInstall: CheckSorter', '  - AfterAllowTraffic: SmokeTest'],
      answer: 10, fix: '- BeforeAllowTraffic: CheckSorter',
      why: 'A Lambda deployment has two lifecycle hooks: BeforeAllowTraffic and AfterAllowTraffic. BeforeInstall belongs to EC2 and on-premises deployments.' },
    { id: 'sorter.k3', kind: 'line', file: 'change set', q: 'Six waybills are waiting on the platform. Which change in this change set would lose them? Tap it.',
      lines: ['Action  Resource          Replace', 'Modify  Sorter            False', 'Add     SorterVersion5    -', 'Modify  SorterAliaslive   False', 'Modify  WaitingPlatform   True', 'Add     NewVersionErrors  -'],
      answer: 4, fix: 'Execute it when the platform is empty',
      why: 'Replacement True means CloudFormation creates a new queue and deletes the old one, and the messages on the old one go with it. Renaming an SQS queue needs a replacement.' },
    { id: 'sorter.k4', kind: 'line', file: 'terminal', q: 'Lambda rejects this command to send 10% of LIVE\'s traffic to version 5. Tap the line that\'s wrong.',
      lines: ['aws lambda update-alias \\', '  --function-name sorter \\', '  --name live \\', '  --function-version \'$LATEST\' \\', '  --routing-config \\', '  \'AdditionalVersionWeights={"5"=0.1}\''],
      answer: 3, fix: "--function-version 4",
      why: 'A weighted alias splits traffic between two published versions. It can\'t point to $LATEST, and both versions need the same execution role and dead-letter setup.' },
    { id: 'sorter.k5', kind: 'fix', file: 'template.yaml', q: 'This alarm keeps rolling back good releases, because an old bug makes a few errors on every version. What should go under Dimensions so it only watches the new version?',
      lines: ['NewVersionErrors:', '  Type: AWS::CloudWatch::Alarm', '  Properties:', '    Namespace: AWS/Lambda', '    MetricName: Errors', '    Dimensions:', '      - Name: Resource', '        Value: !Sub "${Sorter}:live"', '      - Name: FunctionName', '        Value: !Ref Sorter', '    Statistic: Sum', '    Period: 60', '    EvaluationPeriods: 1', '    Threshold: 0', '    ComparisonOperator: GreaterThanThreshold'],
      opts: ['- Name: ExecutedVersion\n  Value: !GetAtt Sorter.Version.Version', 'Threshold: 5', 'MetricName: Throttles', 'Period: 300'],
      why: 'Lambda records which version ran each call through an alias, in the ExecutedVersion dimension. An alarm on the new version\'s errors ignores a bug the old version has too. A higher threshold would also let real failures through.' },
    { id: 'sorter.k6', kind: 'fix', file: 'pre-traffic hook', q: 'This PreTraffic hook\'s checks all pass, but every deployment waits about an hour and then fails. What\'s missing?',
      lines: ['exports.handler = async (event) => {', '  const ok = await checkSorter();', '  console.log(\'checks passed\', ok);', '  return ok;', '};'],
      opts: ['A call to PutLifecycleEventHookExecutionStatus with status Succeeded', 'A longer function timeout', 'An AfterAllowTraffic hook as well', 'AutoPublishAlias on the hook function'],
      why: 'A hook has to report back to CodeDeploy with PutLifecycleEventHookExecutionStatus, using the deployment and execution IDs from the event. If CodeDeploy hears nothing within an hour, the deployment fails.' }
  ];
  // Is this the right answer? kind 'line': i is the line tapped; kind 'fix': i is the option (0 is the answer).
  function cardRight(card, i) { return card.kind === 'line' ? i === card.answer : i === 0; }
  SD.rushYard = {
    YT, KINDS, DEPOT, init, setCrates, onSpawn, route, fails, counter, tick, settle, groupBusy, shiftLeft, watching, pickVersion, slip,
    blueprint, amend, execute, sendBack, dial, lever, setCard, setAlarm, setTests, choose, fixStack, setDepot, crateWave, CARDS, cardRight
  };
  if (typeof module !== 'undefined') module.exports = SD.rushYard;
})(typeof window !== 'undefined' ? window : globalThis);
