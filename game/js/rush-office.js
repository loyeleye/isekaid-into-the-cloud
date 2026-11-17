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
    name: 'THE LOCKED DESK', title: 'the Locked Desk', locked: [], next: null, close: 72, clerk: 'papers', office: true, mira: 3, coins: 2,
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
})(typeof window !== 'undefined' ? window : globalThis);
