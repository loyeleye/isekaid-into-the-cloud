// The Rush, claim 7: the Locked Desk (the postmaster's office upstairs). Rules only, no drawing, so
// tools/rush_sim_office.js can run them headless; js/rush.js draws them. Loaded after js/rush-core.js, which hands the
// office's main room to step() below (S.office) and calls init() and placed(). The cellar runs alongside as the review
// room (CLAIMS.review7), stepped by rush-core as in claim 6. Design: project files real-game/v3/claims/claim-7/design.md.
//
// The AWS behind each rule (DVA-C02, Domain 2: Security), kept true to the docs:
//   - The latch is the request check. Every ticket is denied unless something allows it (an implicit deny, grey), and
//     an explicit deny beats any allow, the star included (red). Within one account an Allow in Mira's own policy is
//     enough. Riverside, another account, needs both sides: its own badge already allows the drop-off, and our
//     cabinet's sign (the bucket policy) has to name Riverside too. Street tickets carry no credentials at all, so only
//     a sign that says Anyone (Principal "*") lets them in
//     (https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html,
//     https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html).
//   - The keyring is an IAM user's long-term access keys, pasted into Mira's function. A copy works until the keys are
//     rotated or deleted (shredded). The badge is the function's execution role: Lambda hands Mira temporary credentials
//     from it on every invoke, so a copied badge stops working on its own (6 s here). Buying the badge doesn't delete
//     the old keys (https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html,
//     https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html).
//   - The stamps are the policy's actions: what the job needs and nothing more. Fewer and honest work is refused; more
//     and the Alibi's tickets get through. Tight stamps also limit what a leaked copy can do.
//   - The key box is a KMS key. Encrypt takes at most 4,096 bytes, so a parcel doesn't fit the slot. The data-key pad
//     is GenerateDataKey: a plain key to seal with locally, then erase, and the same key sealed under the KMS key, kept
//     with the parcel. Encrypt, Decrypt and GenerateDataKey share a per-second request quota; over it KMS throttles and
//     the SDK retries with backoff (https://docs.aws.amazon.com/kms/latest/APIReference/API_Encrypt.html,
//     https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html,
//     https://docs.aws.amazon.com/kms/latest/developerguide/requests-per-second.html).
//   - The key tin is data key caching in the AWS Encryption SDK: one data key serves several tickets, so fewer calls.
//     A cached key sits in Mira's function, so a forged ticket that runs there takes it too
//     (https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/data-key-caching.html).
//   - The combination is a database password. The sticky note is an environment variable in plain sight. The parameter
//     drawer is a Parameter Store SecureString: hidden, free, but no rotation. The safe is Secrets Manager with automatic
//     rotation by a Lambda rotation function on a schedule, billed per secret
//     (https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotating-secrets.html,
//     https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html).
//   - Night Orders: visitors is STS AssumeRole (Riverside assumes a role whose trust policy names it, and works as us
//     until the session ends); deny is an explicit Deny statement on emptying drawers.
(function (root) {
  const SD = root.SD = root.SD || {};
  const R = SD.rushCore || (typeof require !== 'undefined' ? require('./rush-core.js') : null);
  const I = R.internal;
  const T = {
    slot: 0.7, latch: 0.35, book: 0.6, walk: 0.35, done: 0.6, shred: 0.6, direct: 0.9, tooBig: 0.5,
    // How long Mira's work takes at a seat, by ticket.
    post: 1.2, parcel: 1.6, lookup: 0.8, forged: 1.0, chore: 1.0,
    // The key box: calls a second, the SDK's backoff and tries; the key tin's uses per data key.
    boxRate: 2, boxWin: 1, backoff: [0.6, 1.4], boxTries: 3, tinUses: 4,
    // Copies: a badge copy's life (the session), thieves per copy (a range: some nights she sends more) and the gap
    // between them, how long rotating the keyring takes.
    // Lambda refreshes Mira's role credentials every session s, so a copied badge works until the end of the current one.
    session: 6, thiefFirst: 1, thiefGap: 1.8, thiefMax: [2, 5], rotateKeys: 4,
    // The combination: aged out after comboLeak s; the safe rotates every safeEvery s and borrows a seat for safeHold;
    // a hand rotation takes a seat for rotate s. Combination thieves: the first comes comboFirst s after a leak, then
    // one every noteGap s while it's on the note (anyone can read it) or agedGap s once it has aged out (only the Alibi).
    comboLeak: 18, safeEvery: 12, safeHold: 0.5, rotate: 2, comboFirst: 2, agedFirst: 4, noteGap: 14, agedGap: 30,
    // Visitors: a visitor badge lasts this long. The intern on 'topics' is wrong this often on unsolved questions.
    visitorBadge: 10, internWrongWide: 0.45,
    // Seconds between waves upstairs (the cellar's waves are spaced the same), and Mira's seats.
    gap: 8, seats: 3,
    // Night to night: the Alibi picks Mira's pocket pickDelay[0] to [0]+[1] s into the wave, and every gap between its
    // visits (thieves, combination thieves) varies by jitter either way. Forged and street counts vary by one each way.
    pickDelay: [0.5, 3], jitter: 0.4,
    // What each mistake costs in the tank: a street walk-in, a combination theft.
    streetHarm: 1, comboHarm: 2, forgedHarm: 2,
    // The key tin's security threshold: a cached data key is thrown away tinAge s after it was made (the Encryption SDK's
    // max age). A pickpocket while the tin is warm takes the cached key too: if it has sealed two or more tickets (that's
    // the reuse, what one leak exposes beyond the one ticket in hand), tinPick lost.
    tinAge: 1, tinPick: 1,
    // A mid-wave change to the stamps goes live this many s later.
    deploy: 3
  };
  const STAMPS = ['seal', 'file', 'read', 'payroll', 'empty', 'star'];
  // What each ticket needs stamped.
  const NEEDS = { post: ['seal', 'file'], clerk: ['seal', 'file'], lookup: ['read'], chore: ['empty'] };
  const HONEST = new Set(['post', 'clerk', 'lookup', 'chore']);
  R.CLAIMS.locked = {
    name: 'THE LOCKED DESK', title: 'the Locked Desk', locked: [], next: 'audit', close: 72, clerk: 'papers', office: true, mira: 3, coins: 2,
    belt: ['badge', 'pad', 'cache', 'param', 'safe', 'waiter'], review: 'review7',
    // parcel: share of Mira's and Riverside's tickets that are over 4 KB. clerk, lookup: shares of the wave. forged,
    // street: counts. pick: the Alibi picks Mira's pocket early in the wave. Forged and street vary by one each way. ask: review letters that land on the desk.
    waves: [
      { n: 10, secs: 5, poison: 0, parcel: 0, clerk: 0.2, lookup: 0, forged: 0, street: 0, ask: 0 },
      { n: 14, secs: 5, poison: 0, parcel: 0.2, clerk: 0.2, lookup: 0, forged: 2, street: 1, pick: true, ask: 1 },
      { n: 14, secs: 5, poison: 0, parcel: 0.2, clerk: 0.15, lookup: 0.25, forged: 2, street: 2, ask: 2 },
      { n: 22, secs: 6, poison: 0, parcel: 0.25, clerk: 0.2, lookup: 0.15, forged: 3, street: 2, pick: true, ask: 2 }
    ]
  };
  // The cellar as claim 7's review room: more review questions than claim 6, poison from wave 2.
  R.CLAIMS.review7 = {
    name: 'THE CELLAR', title: 'the cellar', locked: [], next: null, close: 72, clerk: 'papers',
    belt: ['rack', 'reserve', 'bin', 'intern'],
    waves: [
      { n: 8, secs: 4, poison: 0, ask: 3 },
      { n: 10, secs: 4, poison: 1, ask: 4 },
      { n: 10, secs: 5, poison: 2, ask: 5 },
      { n: 14, secs: 6, poison: 2, ask: 5 }
    ]
  };
  Object.assign(R.TOOLS, {
    badge: { name: 'Badge', aws: 'Lambda execution role (temporary credentials)', cost: 1 },
    pad: { name: 'Data-key pad', aws: 'KMS GenerateDataKey (envelope encryption)', cost: 1 },
    cache: { name: 'Key tin', aws: 'Data key caching (Encryption SDK)', cost: 1 },
    param: { name: 'Parameter drawer', aws: 'Parameter Store SecureString', cost: 0 },
    safe: { name: 'Safe', aws: 'Secrets Manager with automatic rotation', cost: 1, upkeep: 1 },
    waiter: { name: 'Dumbwaiter', aws: 'Review helper: the intern works both rooms', cost: 1, upkeep: 1 }
  });
  // The office's Night Orders. js/rush.js only offers them before this claim.
  for (const o of ['visitors', 'deny']) if (!R.ORDERS.includes(o)) R.ORDERS.push(o);
  const OFFICE_ORDERS = ['visitors', 'deny'];

  function init(S, C) {
    const orders = S.orders;
    Object.assign(S, {
      office: true, seat: Array.from({ length: T.seats }, () => ({ k: null, until: 0, why: '' })), holds: [],
      keyringLive: true, keyGen: 1, keyRotateAt: 0, copies: [], stamps: new Set(['star']), sign: orders.has('visitors') ? 'office' : 'anyone',
      secret: 'note', comboAt: 0, comboLeaked: false, leakAt: 0, nextCombo: Infinity, comboGap: T.noteGap,
      box: [], tinLeft: 0, tinAt: 0, pickAt: Infinity, stampsNext: null, deployAt: 0, internScope: 'solved', deny: orders.has('deny'), visitors: orders.has('visitors'), visitorUntil: -1,
      safeLapsed: false, waiterLapsed: false, waiterAt: 0, lastSpawnT: 0,
      // Counters.
      grey: 0, red: 0, greens: 0, thieves: 0, thiefSpill: 0, forgedDone: 0, streetIn: 0, comboThefts: 0, tooBig: 0, boxThrottles: 0, boxLost: 0,
      rotations: 0, keyRotations: 0, safeRotations: 0, shredded: 0, refused: 0, honestShred: 0, cacheLeaks: 0, bookVisits: 0, picks: 0, upkeepMissed: 0, seals: 0, keyCalls: 0
    });
    // The orders' upside: a coin each.
    for (const o of OFFICE_ORDERS) if (orders.has(o)) S.coins++;
    // Space the waves out (both rooms), so there's time to change the badge between them.
    const shift = sp => { sp.t += (sp.wave - 1) * (T.gap - R.T.gap); };
    S.spawns.forEach(shift); if (S.review) S.review.spawns.forEach(shift);
    // Each wave's tickets get a kind: the Alibi's never come first.
    C.waves.forEach((w, wi) => {
      const list = S.spawns.filter(sp => sp.wave === wi + 1 && !sp.quiz), n = list.length;
      const kinds = [];
      const vary = c => (c ? Math.max(0, c - 1 + Math.floor(S.rand() * 3)) : 0);
      const nf = vary(w.forged), ns = vary(w.street);
      for (let i = 0; i < nf; i++) kinds.push('forged');
      for (let i = 0; i < ns; i++) kinds.push('street');
      for (let i = 0; i < Math.round(n * (w.clerk || 0)); i++) kinds.push('clerk');
      for (let i = 0; i < Math.round(n * (w.lookup || 0)); i++) kinds.push('lookup');
      if (S.deny && wi >= 2) kinds.push('chore');
      while (kinds.length < n) kinds.push('post');
      for (let i = kinds.length - 1; i > 0; i--) { const j = Math.floor(S.rand() * (i + 1)); [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
      for (let i = 0; i < 2 && i < n; i++) if (!HONEST.has(kinds[i]) || kinds[i] === 'chore') { const j = kinds.findIndex((x, x2) => x2 >= 2 && (x === 'post' || x === 'clerk')); if (j > 0) [kinds[i], kinds[j]] = [kinds[j], kinds[i]]; }
      let f = 0;
      list.forEach((sp, i) => {
        sp.kind = kinds[i];
        sp.big = (sp.kind === 'post' || sp.kind === 'clerk') && S.rand() < (w.parcel || 0);
        if (sp.kind === 'forged') sp.want = f++ % 2 ? 'empty' : 'payroll';
        if (sp.kind === 'chore') sp.want = 'empty';
      });
    });
    S.lastSpawnT = S.spawns.length ? S.spawns[S.spawns.length - 1].t : 0;
  }

  // ---- The latch: 'allow', 'implicit' (grey) or 'explicit' (red). Pure: it reads S, changes nothing. ----
  function copyLive(S, c) { return !!c && (c.cred === 'keyring' ? S.keyringLive && c.gen === S.keyGen : S.time < c.until); }
  // What a thief can do with Mira's stamps: 2 with the star, Empty or payroll, 1 with job stamps only.
  // Under the deny notice, emptying is refused, so the worst it can do is read the payroll.
  function thiefHarm(S) {
    const st = S.stamps, star = st.has('star');
    if (!S.deny && (star || st.has('empty'))) return { want: 'empty', n: 2 };
    if (star || st.has('payroll')) return { want: 'payroll', n: 2 };
    if (st.has('read') || st.has('file') || st.has('seal')) return { want: 'read', n: 1 };
    return { want: 'read', n: 0 };
  }
  function needs(k) { return k.kind === 'forged' ? [k.want] : NEEDS[k.kind] || []; }
  function latch(S, k) {
    const want = k.kind === 'thief' ? thiefHarm(S).want : k.want;
    if (S.deny && want === 'empty') return 'explicit';
    if (k.kind === 'street') return S.sign === 'anyone' ? 'allow' : 'implicit';
    // Riverside's own badge allows the drop-off; our sign has to allow Riverside too (or they sign the book and work as us).
    // (A sign that says Anyone lets Riverside in too, along with everyone else.)
    if (k.kind === 'clerk') return S.visitors || S.sign === 'riverside' || S.sign === 'anyone' ? 'allow' : 'implicit';
    if (k.kind === 'thief') return copyLive(S, k.copy) && thiefHarm(S).n ? 'allow' : 'implicit';
    if (S.stamps.has('star')) return 'allow';
    return needs(k).every(s => S.stamps.has(s)) ? 'allow' : 'implicit';
  }
  // Stamps change at once between waves (and before the key is turned). Mid-wave a change is a deploy: it goes live
  // T.deploy s later, and the old policy works till then (canEdit says which).
  function canEdit(S) {
    if (!S.started) return true;
    if (S.over) return false;
    const next = S.spawns.find(sp => !sp.quiz);
    return !next || next.wave !== S.wave;
  }

  // ---- Seats ----
  const seatFree = (S, i) => S.seat[i].k == null && S.time >= S.seat[i].until;
  function freeSeat(S) { for (let i = 0; i < S.seat.length; i++) if (seatFree(S, i)) return i; return -1; }
  // Take a seat for a while (a rotation): now if one's free, or the next one that frees.
  function holdSeat(S, secs, why) {
    const i = freeSeat(S);
    if (i >= 0) { S.seat[i].until = S.time + secs; S.seat[i].why = why; I.ev(S, 'hold', { seat: i, why, secs }); return; }
    S.holds.push({ secs, why });
  }

  // ---- The key box ----
  function boxCall(S, k) {
    if (S.cache && S.tinLeft > 0 && S.time - S.tinAt >= T.tinAge) S.tinLeft = 0; // aged out
    if (S.cache && S.tinLeft > 0) { S.tinLeft--; I.ev(S, 'tin', { id: k.id, left: S.tinLeft }); return true; }
    S.box = S.box.filter(t => S.time - t < T.boxWin);
    if (S.box.length < T.boxRate) {
      S.box.push(S.time); S.keyCalls++;
      if (S.cache) { S.tinLeft = T.tinUses - 1; S.tinAt = S.time; }
      I.ev(S, 'box', { id: k.id, kind: k.big ? 'datakey' : k.kind === 'lookup' ? 'decrypt' : 'encrypt' });
      return true;
    }
    return false;
  }
  const tinWarm = S => !!S.cache && S.tinLeft > 0 && S.time - S.tinAt < T.tinAge;
  // A gap between the Alibi's visits, varied a little night to night.
  const jit = (S, secs) => secs * (1 - T.jitter + 2 * T.jitter * S.rand());
  function spill(S, k, n, why) { for (let i = 0; i < n; i++) { I.lose1(S, k, why); if (I.purse(S).over) return; } }

  // ---- Credentials and secrets: the player's free knobs ----
  function setStamp(S, name, on) {
    if (!STAMPS.includes(name)) return 'unknown';
    if (S.over) return 'over';
    if (!canEdit(S)) {
      if (!S.stampsNext) S.stampsNext = new Set(S.stamps);
      if (on) S.stampsNext.add(name); else S.stampsNext.delete(name);
      S.deployAt = S.time + T.deploy; I.ev(S, 'stamp', { name, on: !!on, deploy: T.deploy });
      return 'deploy';
    }
    // Between waves a pending deploy lands at once, with this change on top.
    if (S.stampsNext) { S.stamps = S.stampsNext; S.stampsNext = null; }
    if (on) S.stamps.add(name); else S.stamps.delete(name);
    I.ev(S, 'stamp', { name, on: !!on });
    return '';
  }
  // The stamps as they'll be once any deploy is done (what the badge card shows).
  const stampsView = S => S.stampsNext || S.stamps;
  const SIGNS = ['anyone', 'office', 'riverside'];
  function setSign(S, v) {
    if (S.visitors) return 'screwed';
    if (!SIGNS.includes(v)) return 'unknown';
    S.sign = v; I.ev(S, 'sign', { v }); return '';
  }
  // Delete the access key. Not before the badge is on, or Mira has nothing to work with.
  function shred(S) {
    if (!S.keyringLive) return 'gone';
    if (!S.badge) return 'nocred';
    S.keyringLive = false; I.ev(S, 'shredKeys'); return '';
  }
  // New keys for the keyring: make a new key, put it in Mira's function, then deactivate the old one. It takes Mira off
  // a seat while she updates it, and the old keys (and copies of them) work until it's done.
  function rotateKeys(S) {
    if (!S.keyringLive) return 'gone';
    if (S.keyRotateAt) return 'busy';
    S.keyRotateAt = S.time + T.rotateKeys; S.keyRotations++; holdSeat(S, T.rotateKeys, 'keys'); I.ev(S, 'rotateKeys'); return '';
  }
  // A new combination by hand (the drawer, or a safe whose upkeep lapsed).
  function rotate(S) {
    if (S.secret === 'note') return 'note';
    if (S.secret === 'safe' && !S.safeLapsed) return 'auto';
    S.comboAt = S.time; S.comboLeaked = false; S.nextCombo = Infinity; S.rotations++;
    holdSeat(S, T.rotate, 'combo'); I.ev(S, 'rotate', { by: 'hand' }); return '';
  }
  function setInternScope(S, v) { const M = I.purse(S); if (v !== 'solved' && v !== 'topics') return 'unknown'; M.internScope = v; I.ev(M, 'scope', { v }); return ''; }
  // A placed buy (called from rush-core's place()).
  function placed(S, tool) {
    if (tool === 'badge') { S.stamps = new Set(['star']); S.stampsNext = null; I.ev(S, 'badgeOn'); }
    if (tool === 'param' && S.secret !== 'safe') { S.secret = 'param'; S.comboAt = S.time; S.comboLeaked = false; S.nextCombo = Infinity; }
    if (tool === 'safe') { S.secret = 'safe'; S.comboAt = S.time; S.comboLeaked = false; S.nextCombo = Infinity; }
    if (tool === 'cache') S.tinLeft = 0;
    if (tool === 'waiter') S.waiterAt = S.time;
  }
  function leak(S, why) {
    if (S.comboLeaked) return;
    S.comboLeaked = true; S.leakAt = S.time; S.comboGap = why === 'note' ? T.noteGap : T.agedGap; S.nextCombo = S.time + jit(S, why === 'note' ? T.comboFirst : T.agedFirst);
    I.ev(S, 'comboLeak', { why });
  }
  const comboAge = S => S.time - S.comboAt;
  // The intern on 'topics' also takes an unsolved question whose topic (the claim before the dot in its id) has a solved one.
  function wide(S, q) {
    const M = I.purse(S);
    if (M.internScope !== 'topics' || q == null) return false;
    const topic = String(q).split('.')[0];
    if (topic === String(q)) return false;
    for (const r of M.book.values()) if (r.solved && String(r.id).split('.')[0] === topic) return true;
    return false;
  }

  // ---- Tickets ----
  function spawn(S, sp) {
    if (sp.quiz) {
      const q = { id: S.nextId++, key: sp.key, wave: sp.wave, quiz: true, qn: sp.qn, poison: false, desk: 'mira', throttles: 0, receives: 0, stool: null, from: 'slot', phase: 'slide', t: 0, dur: T.slot };
      S.tickets.push(q); return q;
    }
    const k = { id: S.nextId++, kind: sp.kind, big: !!sp.big, want: sp.want || '', wave: sp.wave, copy: sp.copy || null, poison: false, seatI: null, bt: 0, phase: 'slide', t: 0, dur: T.slot };
    S.tickets.push(k); return k;
  }
  function go(k, phase, dur) { k.phase = phase; k.t = 0; k.dur = dur; }
  function leaveSeat(S, k) { if (k.seatI != null) { S.seat[k.seatI].k = null; k.seatI = null; } }
  function startWork(S, k) {
    if (k.big && !S.pad && (k.kind === 'post' || k.kind === 'clerk')) { go(k, 'tooBig', T.tooBig); I.ev(S, 'tooBigTry', { id: k.id }); return; }
    if (k.kind === 'forged' || k.kind === 'chore') { go(k, 'work', T[k.kind]); return; }
    if (!boxCall(S, k)) { throttle(S, k); return; }
    go(k, 'work', k.kind === 'lookup' ? T.lookup : k.big ? T.parcel : T.post);
  }
  function throttle(S, k) {
    k.bt++; S.boxThrottles++; I.ev(S, 'boxThrottle', { id: k.id, n: k.bt });
    if (k.bt >= T.boxTries) { leaveSeat(S, k); S.boxLost++; go(k, 'shred', T.shred); k.lost = 'box'; spill(S, k, 1, 'box'); return; }
    go(k, 'retry', T.backoff[k.bt - 1] || 1.4);
  }
  function finishLatch(S, k) {
    const res = latch(S, k);
    k.res = res;
    if (res !== 'allow') {
      if (res === 'explicit') S.red++; else S.grey++;
      I.ev(S, 'latch', { id: k.id, res, kind: k.kind });
      go(k, 'shred', T.shred); S.shredded++;
      if (HONEST.has(k.kind)) {
        S.honestShred++; if (k.kind === 'clerk') S.refused++;
        spill(S, k, 1, k.kind === 'clerk' ? 'refused' : res === 'explicit' ? 'denied' : 'grey');
      }
      return;
    }
    S.greens++; I.ev(S, 'latch', { id: k.id, res, kind: k.kind });
    // The Alibi's own tickets go straight for the cabinet with what they got.
    if (k.kind === 'thief') { const h = thiefHarm(S); k.harm = h.n; k.want = h.want; go(k, 'direct', T.direct); return; }
    if (k.kind === 'street') { go(k, 'direct', T.direct); return; }
    go(k, 'tray', 0); k.trayAt = S.time;
  }
  function finish(S, k) {
    leaveSeat(S, k);
    if (k.kind === 'forged') {
      S.forgedDone++;
      const warm = tinWarm(S);
      I.ev(S, 'forgedDone', { id: k.id, want: k.want, warm });
      if (warm) { S.cacheLeaks++; S.tinLeft = 0; }
      go(k, 'shred', 0.01); k.gone = true;
      spill(S, k, T.forgedHarm + (warm ? 2 : 0), 'forged');
      return;
    }
    if (k.kind !== 'lookup') S.seals++;
    go(k, 'done', T.done);
  }

  function step(S, dt) {
    if (!S.started || S.over) return;
    if (S.review) { R.step(S.review, dt); if (S.over) return; }
    S.time += dt;
    const tt = S.time, C = R.CLAIMS[S.claim];
    // Waves: the bonus coin at wave 3, upkeep at waves 3 and 4, the Alibi at the window, the note read at wave 2.
    while (S.spawns.length && S.spawns[0].t <= tt) {
      const sp = S.spawns.shift();
      if (sp.wave !== S.wave) {
        S.wave = sp.wave; I.ev(S, 'wave', { wave: sp.wave });
        if (sp.wave === 3 && !S.bonusGiven) { S.bonusGiven = true; S.coins++; I.ev(S, 'coin'); }
        if (sp.wave >= 3) for (const t of S.placed) if (R.TOOLS[t].upkeep) {
          if (S.coins >= R.TOOLS[t].upkeep) { S.coins -= R.TOOLS[t].upkeep; S.upkeepPaid += R.TOOLS[t].upkeep; S.bills++; S[t + 'Lapsed'] = false; I.ev(S, 'upkeep', { n: R.TOOLS[t].upkeep, tool: t }); }
          else { S[t + 'Lapsed'] = true; S.upkeepMissed++; I.ev(S, 'upkeepMissed', { tool: t }); }
        }
        if (sp.wave === 2 && S.secret === 'note') leak(S, 'note');
        const w = C.waves[sp.wave - 1];
        if (w && w.pick) S.pickAt = tt + T.pickDelay[0] + S.rand() * T.pickDelay[1];
      }
      spawn(S, sp);
    }
    // The Alibi picks Mira's pocket: a copy of whatever she works with, and the key tin's cached key if it's warm.
    if (tt >= S.pickAt) {
      S.pickAt = Infinity;
      const cred = S.keyringLive ? 'keyring' : 'badge', tin = tinWarm(S) && T.tinUses - S.tinLeft >= 2; // reuse: 2+ sealed with it
      S.copies.push({ cred, at: tt, gen: S.keyGen, until: (Math.floor(tt / T.session) + 1) * T.session, n: 0, max: T.thiefMax[0] + Math.floor(S.rand() * (T.thiefMax[1] - T.thiefMax[0] + 1)), next: tt + jit(S, T.thiefFirst), said: false });
      S.picks++; I.ev(S, 'pickpocket', { cred, tin });
      if (tin) { S.cacheLeaks++; S.tinLeft = 0; I.ev(S, 'tinPicked'); spill(S, { id: -1 }, T.tinPick, 'tin'); if (I.purse(S).over) return; }
    }
    if (!S.spawns.length) S.allSpawned = true;
    if (S.stampsNext && tt >= S.deployAt) { S.stamps = S.stampsNext; S.stampsNext = null; I.ev(S, 'deployed'); }
    if (S.keyRotateAt && tt >= S.keyRotateAt) { S.keyRotateAt = 0; S.keyGen++; I.ev(S, 'keysRotated'); }
    // While a copy works, the Alibi sends a thief every couple of seconds.
    const late = S.allSpawned && tt > S.lastSpawnT + 4;
    for (const c of S.copies) {
      const live = copyLive(S, c);
      if (!live && !c.said) { c.said = true; I.ev(S, 'copyDead', { cred: c.cred, n: c.n }); }
      if (live && !late && c.n < c.max && tt >= c.next) { c.n++; c.next += jit(S, T.thiefGap); S.thieves++; spawn(S, { kind: 'thief', copy: c, wave: S.wave }); I.ev(S, 'thief', { cred: c.cred }); }
    }
    // The combination: aging, the safe's rotation, and thieves once it's out.
    if (S.secret === 'param' || (S.secret === 'safe' && S.safeLapsed)) { if (comboAge(S) >= T.comboLeak) leak(S, 'aged'); }
    else if (S.secret === 'safe' && comboAge(S) >= T.safeEvery) {
      S.comboAt = tt; S.comboLeaked = false; S.nextCombo = Infinity; S.safeRotations++;
      holdSeat(S, T.safeHold, 'safe');
      // Single-user rotation: a ticket mid-way may be refused once by the database and retry.
      const busy = S.tickets.find(k => k.phase === 'work' && !k.quiz && k.kind !== 'forged');
      if (busy) { busy.dur += 0.4; I.ev(S, 'rotRetry', { id: busy.id }); }
      I.ev(S, 'rotate', { by: 'safe' });
    }
    if (S.comboLeaked && !late && tt >= S.nextCombo) {
      S.nextCombo += jit(S, S.comboGap); S.comboThefts++;
      const k = spawn(S, { kind: 'combo', wave: S.wave }); go(k, 'combo', T.direct); I.ev(S, 'comboThief', { id: k.id });
    }
    // Seat holds (rotations) waiting for a free seat go first.
    while (S.holds.length && freeSeat(S) >= 0) { const h = S.holds.shift(), i = freeSeat(S); S.seat[i].until = tt + h.secs; S.seat[i].why = h.why; I.ev(S, 'hold', { seat: i, why: h.why, secs: h.secs }); }
    // Advance every ticket.
    for (const k of S.tickets.slice()) {
      if (k.quiz) {
        if (k.phase === 'slide' && (k.t += dt) >= k.dur) { k.q = S.qpool.length ? S.qpool[k.qn % S.qpool.length] : null; k.askAt = tt; go(k, 'ask', 0); S.asks.push(k.id); S.asked++; I.ev(S, 'ask', { id: k.id, q: k.q }); }
        else if (k.phase === 'done' && (k.t += dt) >= k.dur) { S.reviewed++; I.remove(S, k); }
        else if (k.phase !== 'slide' && k.phase !== 'done') k.t += dt;
        continue;
      }
      k.t += dt;
      if (k.phase === 'tray' || k.t < k.dur) continue;
      switch (k.phase) {
        case 'slide':
          go(k, 'latch', T.latch);
          // Visitors: Riverside signs the book for a badge that lasts a while (AssumeRole), and stops again once it's run out.
          if (k.kind === 'clerk' && S.visitors && S.time >= S.visitorUntil) { k.dur += T.book; S.visitorUntil = tt + T.book + T.visitorBadge; S.bookVisits++; I.ev(S, 'book', { id: k.id }); }
          break;
        case 'latch': finishLatch(S, k); break;
        case 'walk': startWork(S, k); break;
        case 'retry': if (boxCall(S, k)) go(k, 'work', k.kind === 'lookup' ? T.lookup : k.big ? T.parcel : T.post); else throttle(S, k); break;
        case 'work': finish(S, k); break;
        case 'tooBig': leaveSeat(S, k); S.tooBig++; go(k, 'shred', T.shred); k.lost = 'tooBig'; I.ev(S, 'tooBig', { id: k.id }); spill(S, k, 1, 'tooBig'); break;
        case 'done': S.handled++; I.remove(S, k); I.ev(S, 'handled', { id: k.id, desk: 'mira' }); break;
        case 'shred': I.remove(S, k); break;
        case 'direct':
          I.remove(S, k);
          if (k.kind === 'street') { S.streetIn++; I.ev(S, 'streetIn', { id: k.id }); spill(S, k, T.streetHarm, 'street'); }
          else { S.thiefSpill += k.harm; I.ev(S, 'thiefDone', { id: k.id, n: k.harm, want: k.want }); spill(S, k, k.harm, 'thief'); }
          break;
        case 'combo': I.remove(S, k); I.ev(S, 'comboDone', { id: k.id }); spill(S, k, T.comboHarm, 'combo'); break;
      }
      if (I.purse(S).over) return;
    }
    // Tickets waiting in the tray take free seats, oldest first.
    for (const k of S.tickets.filter(x => x.phase === 'tray').sort((a, b) => a.trayAt - b.trayAt)) {
      const i = freeSeat(S); if (i < 0) break;
      S.seat[i].k = k.id; k.seatI = i; go(k, 'walk', T.walk);
    }
    // Review letters on the desk. The intern takes them only by the dumbwaiter.
    const V = S.review;
    S.intern = !!(V && V.intern && S.waiter && !S.waiterLapsed);
    S.internAt = Math.max(V && V.internAt || 0, S.waiterAt || 0);
    if (S.asked || S.tickets.some(k => k.quiz)) I.reviewStep(S);
    if (I.purse(S).over) return;
    // Closing time.
    if (S.close && tt >= S.close) {
      const left = S.tickets.slice(); I.ev(S, 'close', { n: left.length });
      for (const k of left) { I.remove(S, k); I.lose1(S, k, 'closed'); if (S.over) return; }
      S.over = 'win'; I.ev(S, 'win'); return;
    }
    if (S.allSpawned && late && !S.tickets.length && (!V || V.over)) { S.over = 'win'; I.ev(S, 'win'); }
  }
  SD.rushOffice = { T, STAMPS, NEEDS, SIGNS, OFFICE_ORDERS, init, step, latch, needs, thiefHarm, copyLive, canEdit, setStamp, stampsView, setSign, shred, rotateKeys, rotate, setInternScope, placed, wide, comboAge, seatFree };
  if (typeof module !== 'undefined') module.exports = SD.rushOffice;

  // ---- The template card (js/rush-sheet.js draws it; contract: project files real-game/v3/claims/learn/contract.md) ----
  // Claim 7's sheet is one template.yaml: the badge (execution role), the keyring (an IAM user's access key), Mira's
  // stamps (the policy), the key box (a KMS key), the cabinet and its sign (bucket and bucket policy) and the strongroom
  // (an RDS database whose master password is the combination). The base has a comment line for each piece; a piece's
  // lines go in under its comment. Lines that follow the room (stamps, sign, keyring, the combination) are functions of
  // the state, so the sheet always shows what's set now. Entries marked setting: true aren't bought: they're the room's
  // own settings, on the sheet from the start. Data only: nothing here changes a rule or a roll.
  if (typeof SD !== 'undefined') {
    const LN = SD.rushLearn = SD.rushLearn || { files: {}, tools: {}, pops: {} };
    LN.files.locked = { name: 'template.yaml', lang: 'yaml', base: [
      'Resources:',
      "  # Mira's badge",
      "  # Mira's keyring",
      "  # Mira's stamps",
      '  KeyBox:',
      '    Type: AWS::KMS::Key',
      '  Cabinet:',
      '    Type: AWS::S3::Bucket',
      '  # the cabinet sign',
      '  Strongroom:',
      '    Type: AWS::RDS::DBInstance',
      '    Properties:',
      '      Engine: postgres',
      '      DBInstanceClass: db.t4g.micro',
      "      AllocatedStorage: '20'",
      '      MasterUsername: postmaster'
    ] };
    const RIVERSIDE = "'222233334444'"; // Riverside's account (an example ID)
    const L7 = (o) => Object.assign({ claims: ['locked'] }, o);

    // The badge: Lambda's execution role. Lambda assumes it for Mira on every invoke (the trust policy's
    // sts:AssumeRole), so she holds short-lived credentials, not keys.
    // https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-role.html
    LN.tools.badge = L7({ at: "  # Mira's badge", lines: [
      '  MiraRole:',
      '    Type: AWS::IAM::Role',
      '    Properties:',
      '      AssumeRolePolicyDocument:',
      "        Version: '2012-10-17'",
      '        Statement:',
      '        - Effect: Allow',
      '          Principal:',
      '            Service: lambda.amazonaws.com',
      '          Action: sts:AssumeRole'
    ], blank: 'sts:AssumeRole', choices: ['sts:AssumeRole', 'sts:GetSessionToken', 'sts:AssumeRoleWithWebIdentity', 'iam:PassRole'],
    doc: 'https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html' });

    // The keyring: an IAM user with a long-term access key pasted into Mira's function. Gone once shredded (the key
    // deleted). https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-accesskey.html
    LN.tools['locked:keyring'] = L7({ setting: true, at: "  # Mira's keyring", lines: S => (S.keyringLive ? [
      '  MiraUser:',
      '    Type: AWS::IAM::User',
      '  MiraKey:',
      '    Type: AWS::IAM::AccessKey',
      '    Properties:',
      '      UserName: !Ref MiraUser',
      '      Status: Active'
    ] : ['  # (access key deleted)']), blank: 'AWS::IAM::AccessKey', choices: ['AWS::IAM::AccessKey', 'AWS::IAM::User', 'AWS::IAM::Role', 'AWS::IAM::InstanceProfile'],
    doc: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html' });

    // Mira's stamps: the policy's actions, on the role (and on the old user while its key lives, since buying the badge
    // doesn't delete the keys). seal is kms:Encrypt (plus kms:GenerateDataKey once the pad is in), file s3:PutObject,
    // read s3:GetObject (and kms:Decrypt to open what was sealed), payroll s3:GetObject on the payroll prefix, empty
    // s3:DeleteObject, the star "*". The deny order adds an explicit Deny on emptying.
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-iam-policy.html
    // https://docs.aws.amazon.com/service-authorization/latest/reference/list_awskeymanagementservice.html
    // https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
    const stmt = (eff, acts, res) => ['        - Effect: ' + eff, '          Action:'].concat(acts.map(a => '          - ' + a), ['          Resource: ' + res]);
    LN.tools['locked:stamps'] = L7({ setting: true, at: "  # Mira's stamps", lines: S => {
      const st = SD.rushOffice.stampsView(S), out = ['  MiraStamps:', '    Type: AWS::IAM::Policy', '    Properties:', '      PolicyName: stamps'];
      if (S.badge) out.push('      Roles: [!Ref MiraRole]');
      if (S.keyringLive) out.push('      Users: [!Ref MiraUser]');
      out.push('      PolicyDocument:', "        Version: '2012-10-17'", '        Statement:');
      if (st.has('star')) out.push(...stmt('Allow', ["'*'"], "'*'"));
      else {
        const kms = [], box = [];
        if (st.has('seal')) kms.push('kms:Encrypt'), S.pad && kms.push('kms:GenerateDataKey');
        if (st.has('read')) kms.push('kms:Decrypt');
        if (st.has('file')) box.push('s3:PutObject');
        if (st.has('read')) box.push('s3:GetObject');
        if (kms.length) out.push(...stmt('Allow', kms, '!GetAtt KeyBox.Arn'));
        if (box.length) out.push(...stmt('Allow', box, '!Sub ${Cabinet.Arn}/parcels/*'));
        if (st.has('payroll')) out.push(...stmt('Allow', ['s3:GetObject'], '!Sub ${Cabinet.Arn}/payroll/*'));
        if (st.has('empty')) out.push(...stmt('Allow', ['s3:DeleteObject'], '!Sub ${Cabinet.Arn}/*'));
        if (!kms.length && !box.length && !st.has('payroll') && !st.has('empty')) out.push('          []');
      }
      if (S.deny) out.push(...stmt('Deny', ['s3:DeleteObject'], "'*'"));
      return out;
    }, blank: 's3:PutObject', choices: ['s3:PutObject', 's3:GetObject', 's3:DeleteObject', 's3:ListBucket'],
    doc: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_action.html' });

    // The latch: how a request is judged. Everything is denied unless a policy allows it (implicit deny, grey); an
    // explicit Deny beats any Allow (red). https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html
    LN.tools['locked:latch'] = L7({ setting: true, at: 'end', lines: [
      '# The latch: no Allow means an',
      '# implicit deny; an explicit Deny',
      '# beats any Allow.'
    ], blank: 'Deny', choices: ['Deny', 'Allow', 'NotAction', 'Condition'],
    doc: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic_policy-eval-denyallow.html' });

    // The cabinet's sign: the bucket policy's Principal. Anyone is "*" (anonymous requests too); this office is our own
    // account (a bare account ID is allowed in Principal); Riverside adds the other account, which also needs its own
    // badge to allow the call (cross-account takes both sides). The visitors order instead has Riverside sign the book:
    // a role in our account whose trust policy names Riverside, assumed with sts:AssumeRole.
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-s3-bucketpolicy.html
    // https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html
    // https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html
    LN.tools['locked:sign'] = L7({ setting: true, at: '  # the cabinet sign', lines: S => {
      const out = ['  CabinetSign:', '    Type: AWS::S3::BucketPolicy', '    Properties:', '      Bucket: !Ref Cabinet', '      PolicyDocument:', "        Version: '2012-10-17'", '        Statement:', '        - Effect: Allow'];
      if (S.sign === 'anyone') out.push("          Principal: '*'", '          Action: s3:GetObject');
      else if (S.sign === 'riverside') out.push('          Principal:', '            AWS:', '            - !Ref AWS::AccountId', '            - ' + RIVERSIDE + '  # Riverside', '          Action: s3:PutObject');
      else out.push('          Principal:', '            AWS: !Ref AWS::AccountId', '          Action: s3:PutObject');
      out.push('          Resource: !Sub ${Cabinet.Arn}/*');
      if (S.visitors) out.push('  VisitorsBook:', '    Type: AWS::IAM::Role', '    Properties:', '      AssumeRolePolicyDocument:', "        Version: '2012-10-17'", '        Statement:', '        - Effect: Allow', '          Principal:', '            AWS: ' + RIVERSIDE, '          Action: sts:AssumeRole');
      return out;
    }, blank: 'Principal', choices: ['Principal', 'NotPrincipal', 'Condition', 'Resource'],
    doc: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_principal.html' });

    // The data-key pad: envelope encryption. GenerateDataKey returns the key in plain text (seal with it, then erase it)
    // and the same key encrypted under the KMS key (kept with the parcel). Encrypt alone takes at most 4,096 bytes.
    // https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html
    LN.tools.pad = L7({ at: '    Type: AWS::KMS::Key', lines: [
      '    # pad: kms:GenerateDataKey',
      '    #   KeySpec: AES_256',
      '    #   -> Plaintext, CiphertextBlob'
    ], blank: 'kms:GenerateDataKey', choices: ['kms:GenerateDataKey', 'kms:Encrypt', 'kms:GenerateRandom', 'kms:ReEncryptTo'],
    doc: 'https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKey.html' });

    // The key tin: data key caching in the AWS Encryption SDK (Python names). One data key serves several tickets until
    // it ages out (max_age) or hits its use limit.
    // https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/data-key-caching.html
    // https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/thresholds.html
    LN.tools.cache = L7({ at: 'end', lines: [
      '# tin: AWS Encryption SDK cache',
      '# CachingCryptoMaterialsManager(',
      '#   max_age=' + T.tinAge + ',',
      '#   max_messages_encrypted=' + T.tinUses + ')'
    ], blank: 'max_age', choices: ['max_age', 'max_messages_encrypted', 'max_bytes_encrypted', 'capacity'],
    doc: 'https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/thresholds.html' });

    // The combination: the database's master password. On the sticky note it's plain text in the template. The
    // drawer is a Parameter Store SecureString, read with an ssm-secure dynamic reference (CloudFormation can read one
    // but can't create one). The safe is Secrets Manager: RDS keeps the password there and rotates it on a schedule.
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm-secure-strings.html
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ssm-parameter.html
    // https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html
    LN.tools['locked:secret'] = L7({ setting: true, at: '      MasterUsername: postmaster', lines: S => (S.secret === 'note' ? [
      '      # sticky note: plain text',
      '      MasterUserPassword: Postmaster1'
    ] : []), blank: 'MasterUserPassword', choices: ['MasterUserPassword', 'MasterUsername', 'MasterUserSecret', 'DBName'],
    doc: 'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-rds-dbinstance.html' });
    LN.tools.param = L7({ at: '      MasterUsername: postmaster', lines: S => (S.secret === 'param' ? [
      '      # Parameter Store SecureString',
      '      MasterUserPassword:',
      "        '{{resolve:ssm-secure:combo}}'"
    ] : []), blank: 'SecureString', choices: ['SecureString', 'String', 'StringList', 'SecretString'],
    doc: 'https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html' });
    LN.tools.safe = L7({ at: '      MasterUsername: postmaster', lines: S => (S.secret === 'safe' ? [
      '      # Secrets Manager, rotated',
      '      ManageMasterUserPassword: true'
    ] : []), blank: 'ManageMasterUserPassword', choices: ['ManageMasterUserPassword', 'MasterUserPassword', 'EnableIAMDatabaseAuthentication', 'StorageEncrypted'],
    doc: 'https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-secrets-manager.html' });
    // The dumbwaiter is a helper (it brings the cellar's checks up): no line.

    // The real term on each event's pop. ('deployed' also means a deploy in claim 9, so it's claim-scoped.)
    // https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_general.html#troubleshoot_general_eventual-consistency
    // https://docs.aws.amazon.com/kms/latest/developerguide/requests-per-second.html
    Object.assign(LN.pops, {
      latch: 'Policy evaluation: no Allow is an implicit deny; an explicit Deny wins',
      pickpocket: 'Access key copied: a long-term key works for whoever holds it',
      thief: 'An old access key used: it works until rotated or deleted',
      copyDead: 'Role credentials expired: the copied session token stops working',
      thiefDone: 'Leaked credentials: the copy could do whatever the policy allows',
      forgedDone: 'Least privilege missed: an action the job never needed was allowed',
      streetIn: 'Principal "*": an anonymous request got into the bucket',
      tooBig: 'kms:Encrypt takes at most 4 KB: envelope-encrypt with GenerateDataKey',
      boxThrottle: 'ThrottlingException: over the KMS requests-per-second quota, retry with backoff',
      tinPicked: 'Cached data key exposed: one data key served several messages',
      comboLeak: 'Secret exposed: a plain-text or unrotated password was read',
      comboDone: 'Database breached with the leaked password',
      rotate: 'Secret rotated: the old password stops working',
      shredKeys: 'Access key deleted: every copy of it stops working',
      rotateKeys: 'New access key created: the old one works until it is deactivated',
      keysRotated: 'Old access key deactivated: its copies stop working',
      'locked:deployed': 'Policy updated: IAM changes take a moment to reach every request',
      book: 'sts:AssumeRole: Riverside works as our role until its session ends',
      badgeOn: 'Execution role: Lambda gives Mira temporary credentials on each invoke'
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
