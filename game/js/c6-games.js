// The minigames of chapter 6's overworld (js/c6-world.js). Each opens with a prediction you make before you see the
// answer, then lets you play it out ("predict, then play"). Four small engines, and the games built on them:
//   door   a knowledge gate: build the setting (an Object Lock rule) from chips, and try it on the gate
//   sort   put each thing where it belongs (requests on routing policies, threats on locks, twins by their
//          heartbeat, stores by how they replicate), then check; wrong rows say why and stay open
//   order  tap the steps in the order they happen (a StackSet to both shores, the Design Board's load test)
//   pick   find the lines that shouldn't be there (Chad's receipt), out of a longer list
// The world asks the typed questions and the bank questions itself. AWS facts follow the current AWS documentation
// (Route 53 routing policies and health checks, CloudFormation StackSets, S3 versioning, replication and Object Lock,
// DynamoDB global tables, Aurora Global Database, RDS read replicas, NAT gateway and data transfer pricing, gateway
// endpoints, Savings Plans, AWS Backup Vault Lock). Every explanation is written fresh.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const U = SD.ui, S = SD.state, AU = SD.audio, Q = SD.quiz;
  const G = SD.c6games = {};
  const esc = s => U.esc(s);

  const css = document.createElement('style');
  css.textContent = `
.g6 { text-align: left; }
.g6-rule { font: 12px/1.45 ui-monospace, monospace; color: #bfe6ff; background: #1c2a3a; border-radius: 6px; padding: 6px 8px; margin: 0 0 8px; white-space: pre-wrap; overflow-x: auto; }
.g6-note { min-height: 1.4em; margin: 8px 0 0; } .g6-note.ok { color: #1d7a43; } .g6-note.bad { color: #b02a3a; }
.g6-predict { border-left: 3px solid #2c6a8a; padding-left: 10px; margin-bottom: 10px; }
.g6-predict b { color: #2c6a8a; font-size: 12px; letter-spacing: .06em; }
.g6 .opts.col { display: flex; flex-direction: column; gap: 8px; } .g6 .opts.col .opt { text-align: left; min-height: 44px; }
.g6-field { margin: 8px 0; } .g6-field > b { display: block; font-size: 12px; color: #5a5468; letter-spacing: .04em; margin-bottom: 4px; }
.g6-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.g6-chips button { min-height: 44px; padding: 6px 10px; font: 13px ui-monospace, monospace; }
.g6-chips button.on, .g6-row button.on, .g6-line.on { background: var(--blue); color: #fff; }
.g6-row { display: flex; align-items: center; gap: 6px; margin: 8px 0; flex-wrap: wrap; padding: 6px 0; border-top: 1px solid rgba(255,255,255,.1); }
.g6-row > span { flex: 1 1 100%; font-size: 14px; }
.g6-row button { min-height: 44px; padding: 6px 10px; font-size: 13px; flex: 1 1 auto; }
.g6-row .why, .g6-lines .why { flex-basis: 100%; font-size: 12px; margin: 2px 0 0; } .g6 .why.ok { color: #1d7a43; } .g6 .why.bad { color: #b02a3a; }
.g6-row.done button { opacity: .55; }
.g6-steps { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
.g6-steps button { min-height: 44px; text-align: left; }
.g6-done { counter-reset: s; margin: 6px 0; padding-left: 0; list-style: none; }
.g6-done li { counter-increment: s; font-size: 13px; padding: 4px 0 4px 26px; position: relative; color: #1d4a2a; }
.g6-done li::before { content: counter(s); position: absolute; left: 0; top: 3px; width: 18px; height: 18px; border-radius: 9px; background: #2c6a8a; color: #fff; font: 700 11px/18px sans-serif; text-align: center; }
.g6-lines { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
.g6-line { min-height: 44px; text-align: left; font: 13px/1.35 ui-monospace, monospace; display: flex; justify-content: space-between; gap: 10px; }
.g6-line i { font-style: normal; color: #8a5a00; white-space: nowrap; } .g6-line.on i { color: #fff; }
.g6-line.gone { text-decoration: line-through; opacity: .6; }
.g6-count { font-size: 12px; color: #5a5468; }
`;
  document.head.appendChild(css);

  function note(b, text, ok) { const n = b.querySelector(':scope > .g6-note') || b.querySelector('.g6-note'); n.textContent = text; n.className = 'g6-note ' + (ok ? 'ok' : 'bad'); }
  const cont = (b, label) => new Promise(res => {
    const go = document.createElement('button'); go.className = 'primary'; go.id = 'g6-cont'; go.textContent = label || 'Continue';
    b.appendChild(go); go.focus(); go.onclick = () => { U.closePanel(); res(); };
  });
  // A prediction: pick one, see whether it was right and why. Resolves true if it was.
  function predict(b, p, concept) {
    return new Promise(res => {
      const box = document.createElement('div'); box.className = 'g6-predict';
      box.innerHTML = `<b>PREDICT FIRST</b><p>${esc(p.q)}</p><div class="opts col">${p.opts.map((o, i) => `<button class="opt" data-p="${i}">${esc(o.t)}</button>`).join('')}</div><p class="g6-note"></p>`;
      b.appendChild(box);
      box.querySelectorAll('[data-p]').forEach(el => el.onclick = () => {
        const o = p.opts[+el.dataset.p];
        box.querySelectorAll('[data-p]').forEach(x => { x.disabled = true; if (p.opts[+x.dataset.p].ok) x.classList.add('on'); });
        S.recordAnswer(concept, !!o.ok, 1, 15000);
        AU.sfx(o.ok ? 'right' : 'wrong');
        const n = box.querySelector('.g6-note');
        n.textContent = (o.ok ? 'Right. ' : (o.no || 'Not quite.') + ' ') + p.why; n.className = 'g6-note ' + (o.ok ? 'ok' : 'bad');
        setTimeout(() => res(!!o.ok), 300);
      });
    });
  }
  const shuffle = a => (Q && Q.shuffle ? Q.shuffle(a.slice()) : a.slice().sort(() => Math.random() - 0.5));
  const open = (o, cls) => {
    const b = U.panel(`<div class="g6"><p>${o.intro}</p>${o.rule ? `<div class="g6-rule">${esc(o.rule)}</div>` : ''}</div>`, { title: o.title, noClose: true, cls: cls || 'wide' });
    return b.querySelector('.g6');
  };

  // ---------- door: build the setting, try it on the gate ----------
  // o: { title, concept, intro, rule, predict, fields: [{ k, label, opts: [[value, text]] }], answer: { k: value },
  //      check(sel) -> null when right, else why it fails; done: what the open gate says }. Resolves { first, tries }.
  G.door = function (o) {
    S.seeConcept(o.concept);
    G.cur = { kind: 'door', o };
    return new Promise(async res => {
      const g = open(o);
      if (o.predict) await predict(g, o.predict, o.concept);
      const sel = {};
      const box = document.createElement('div');
      box.innerHTML = o.fields.map(f => `<div class="g6-field"><b>${esc(f.label)}</b><div class="g6-chips">${f.opts.map(([v, t]) => `<button class="ghost" data-f="${f.k}" data-v="${esc(v)}">${esc(t)}</button>`).join('')}</div></div>`).join('')
        + `<button class="primary" id="g6-try" disabled>${esc(o.go || 'Try the gate')}</button><p class="g6-note"></p>`;
      g.appendChild(box);
      const tryB = box.querySelector('#g6-try');
      box.querySelectorAll('[data-f]').forEach(el => el.onclick = () => {
        sel[el.dataset.f] = el.dataset.v;
        box.querySelectorAll(`[data-f="${el.dataset.f}"]`).forEach(x => x.classList.toggle('on', x === el));
        tryB.disabled = o.fields.some(f => !(f.k in sel));
      });
      let tries = 0;
      tryB.onclick = async () => {
        tries++;
        const why = o.check(Object.assign({}, sel));
        if (tries === 1) S.recordAnswer(o.concept, !why, 1, 20000);
        if (why) { note(box, why, false); AU.sfx('wrong'); return; }
        box.querySelectorAll('button').forEach(x => { x.disabled = true; });
        note(box, o.done, true); AU.sfx('gate');
        await cont(g, 'Through the gate');
        G.cur = null;
        res({ first: tries === 1, tries });
      };
    });
  };

  // ---------- sort: everything where it belongs ----------
  // o: { title, concept, intro, rule, predict, bins: [label], items: [{ t, bin, why }], go, done }
  // Resolves { first: how many rows were right on the first check, of: items.length }.
  G.sort = function (o) {
    S.seeConcept(o.concept);
    G.cur = { kind: 'sort', o };
    return new Promise(async res => {
      const order = shuffle(o.items.map((x, i) => i));
      const g = open(o);
      if (o.predict) await predict(g, o.predict, o.concept);
      const pick = {}, locked = {};
      const box = document.createElement('div');
      box.innerHTML = order.map(i => `<div class="g6-row" data-r="${i}"><span>${esc(o.items[i].t)}</span>${o.bins.map((l, v) => `<button class="ghost" data-i="${i}" data-v="${v}">${esc(l)}</button>`).join('')}<p class="why"></p></div>`).join('')
        + `<button class="primary" id="g6-go" disabled>${esc(o.go || 'Check')}</button><p class="g6-note"></p>`;
      g.appendChild(box);
      const go = box.querySelector('#g6-go');
      const ready = () => { go.disabled = o.items.some((x, i) => !(i in pick)); };
      box.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {
        const i = +el.dataset.i; if (locked[i]) return;
        pick[i] = +el.dataset.v;
        box.querySelectorAll(`[data-i="${i}"]`).forEach(x => x.classList.toggle('on', x === el));
        ready();
      });
      let first = null;
      go.onclick = async () => {
        let right = 0;
        o.items.forEach((x, i) => {
          if (locked[i]) { right++; return; }
          const row = box.querySelector(`[data-r="${i}"]`), w = row.querySelector('.why'), ok = pick[i] === x.bin;
          if (first === null) S.recordAnswer(o.concept, ok, 1, 8000);
          w.textContent = (ok ? '' : 'No: ') + x.why; w.className = 'why ' + (ok ? 'ok' : 'bad');
          if (ok) { right++; locked[i] = true; row.classList.add('done'); } else delete pick[i];
          row.querySelectorAll('button').forEach(y => { if (!ok) y.classList.remove('on'); });
        });
        if (first === null) first = right;
        ready();
        if (right < o.items.length) { note(box, `${right} of ${o.items.length} right. Fix the red ones and check again.`, false); AU.sfx('wrong'); return; }
        go.disabled = true;
        note(box, o.done || 'All of them, right.', true); AU.sfx('right');
        await cont(g);
        G.cur = null;
        res({ first, of: o.items.length });
      };
    });
  };

  // ---------- order: the steps, in the order they happen ----------
  // o: { title, concept, intro, predict, steps: [{ t, why, hint }] (in the right order), done }. Resolves { mistakes }.
  G.order = function (o) {
    S.seeConcept(o.concept);
    G.cur = { kind: 'order', o };
    return new Promise(async res => {
      const g = open(o);
      if (o.predict) await predict(g, o.predict, o.concept);
      const box = document.createElement('div');
      box.innerHTML = `<ol class="g6-done"></ol><div class="g6-steps">${shuffle(o.steps.map((x, i) => i)).map(i => `<button class="ghost" data-s="${i}">${esc(o.steps[i].t)}</button>`).join('')}</div><p class="g6-note"></p>`;
      g.appendChild(box);
      let next = 0, mistakes = 0;
      box.querySelectorAll('[data-s]').forEach(el => el.onclick = async () => {
        const i = +el.dataset.s;
        if (i !== next) { mistakes++; note(box, 'Not yet: ' + o.steps[next].hint, false); AU.sfx('wrong'); return; }
        const li = document.createElement('li'); li.textContent = o.steps[i].t + ' ' + o.steps[i].why;
        box.querySelector('.g6-done').appendChild(li); el.remove(); AU.sfx('card');
        next++;
        if (next < o.steps.length) { note(box, '', true); return; }
        S.recordAnswer(o.concept, mistakes === 0, 1, 20000);
        note(box, o.done, true); AU.sfx('right');
        await cont(g);
        G.cur = null;
        res({ mistakes });
      });
    });
  };

  // ---------- pick: the lines that shouldn't be there ----------
  // o: { title, concept, intro, predict, lines: [{ t, cost, bad, why }], need, done }. Tap exactly `need` lines and
  // check: the wrong picks say why and are put back. Resolves { first: right picks on the first check, of: need }.
  G.pick = function (o) {
    S.seeConcept(o.concept);
    G.cur = { kind: 'pick', o };
    return new Promise(async res => {
      const g = open(o);
      if (o.predict) await predict(g, o.predict, o.concept);
      const order = shuffle(o.lines.map((x, i) => i));
      const on = new Set(), found = new Set();
      const box = document.createElement('div');
      box.innerHTML = `<p class="g6-count"></p><div class="g6-lines">${order.map(i => `<button class="ghost g6-line" data-l="${i}"><span>${esc(o.lines[i].t)}</span><i>${esc(o.lines[i].cost || '')}</i></button><p class="why" data-w="${i}"></p>`).join('')}</div>`
        + `<button class="primary" id="g6-go" disabled>${esc(o.go || 'Strike them out')}</button><p class="g6-note"></p>`;
      g.appendChild(box);
      const go = box.querySelector('#g6-go'), count = box.querySelector('.g6-count');
      const ready = () => { count.textContent = `${on.size + found.size} of ${o.need} marked`; go.disabled = on.size + found.size !== o.need; };
      ready();
      box.querySelectorAll('[data-l]').forEach(el => el.onclick = () => {
        const i = +el.dataset.l; if (found.has(i)) return;
        if (on.has(i)) on.delete(i); else if (on.size + found.size < o.need) on.add(i);
        el.classList.toggle('on', on.has(i));
        ready();
      });
      let first = null;
      go.onclick = async () => {
        let right = 0;
        [...on].forEach(i => {
          const ok = !!o.lines[i].bad, wEl = box.querySelector(`[data-w="${i}"]`), el = box.querySelector(`[data-l="${i}"]`);
          if (first === null) S.recordAnswer(o.concept, ok, 1, 8000);
          wEl.textContent = (ok ? '' : 'Keep it: ') + o.lines[i].why; wEl.className = 'why ' + (ok ? 'ok' : 'bad');
          if (ok) { right++; found.add(i); el.classList.remove('on'); el.classList.add('gone'); el.disabled = true; } else el.classList.remove('on');
        });
        on.clear();
        if (first === null) first = right;
        ready();
        if (found.size < o.need) { note(box, `${found.size} of ${o.need} found. The others are still on the bill.`, false); AU.sfx('wrong'); return; }
        go.disabled = true;
        note(box, o.done, true); AU.sfx('right');
        await cont(g);
        G.cur = null;
        res({ first, of: o.need });
      };
    });
  };

  // ---------- The games ----------
  const P = (q, opts, why) => ({ q, opts: opts.map(([t, ok, no]) => ({ t, ok, no })), why });
  const I = (t, bin, why) => ({ t, bin, why });
  const DEF = G.DEF = {};

  // The near shore's hedge gate: which routing policy answers which request.
  DEF.route = {
    title: 'THE SIGNPOST · WHO ANSWERS?', concept: 'routing53', card: 'r6-failover',
    intro: 'The road to the Twin Stairs has a signpost that is really a <b>Route 53 record</b>: every traveller who asks the way gets one answer. The town wants six different things from it. Which <b>routing policy</b> does each one?',
    predict: P('A failover record has a primary and a secondary. What makes Route 53 stop answering with the primary?', [
      ['A health check on the primary failing', true], ['The record\'s TTL running out', false, 'The TTL only says how long a resolver may cache the answer.'], ['Someone editing the record by hand', false, 'That works, but it\'s exactly what failover routing saves you from.']],
      'Failover routing answers with the primary while its health check passes, and with the secondary once it fails. No hands needed.'),
    bins: ['Failover', 'Weighted', 'Latency', 'Geolocation', 'Geoproximity', 'Multivalue'],
    items: [I('If the near stair is down, send everyone to the far shore\'s', 0, 'Failover: active-passive, decided by the primary\'s health check.'),
      I('Send one traveller in ten to the new stair, to try it', 1, 'Weighted: each record gets a share, here 10 to 90. Canaries and blue/green.'),
      I('Send each traveller to whichever shore answers them fastest', 2, 'Latency: Route 53 picks the Region with the lowest latency to the user.'),
      I('Travellers from the far country must get the stair in their own language', 3, 'Geolocation: by the user\'s country or continent, whatever the distance.'),
      I('Send travellers by distance, and pull a few more toward the bigger stair', 4, 'Geoproximity: by distance, with a bias that grows or shrinks a Region\'s area.'),
      I('Hand back up to eight healthy stairs and let the traveller pick one', 5, 'Multivalue answer: up to eight healthy records, each with its own health check.')],
    done: 'The signpost answers six ways at once. Its twin on the far shore says the same thing, a moment later.'
  };
  // Camp: Ship It, one stack to both shores.
  DEF.ship = {
    title: 'SHIP IT · ONE STACK, TWO SHORES', concept: 'stacksets', card: 'r6-stackset',
    intro: 'The relay station has to stand on both shores, the far one smaller (it\'s the warm standby). One template, deployed once, with a different size on each side. Tap the steps in order.',
    predict: P('A StackSet uses service-managed permissions with AWS Organizations. What does that let it do that self-managed permissions can\'t?', [
      ['Deploy by itself to new accounts that join a target OU', true], ['Deploy to more than one Region', false, 'Both kinds deploy across Regions.'], ['Skip the template', false, 'There\'s always a template.']],
      'With service-managed permissions, StackSets creates the roles it needs, targets organizational units, and can deploy automatically to accounts added to them later.'),
    steps: [{ t: 'Write one template, with a parameter for everything that differs between the shores.', why: 'Here, InstanceCount and InstanceType.', hint: 'everything starts from one template.' },
      { t: 'Create the StackSet from that template, in the administrator account.', why: 'The StackSet is the template plus where it may go.', hint: 'the StackSet comes from the template.' },
      { t: 'Add stack instances: the camp\'s account, in both Regions, near shore first.', why: 'The Region order and failure tolerance are the operation\'s preferences.', hint: 'next, say where it goes.' },
      { t: 'Override the far shore\'s parameters: one small instance, a warm standby.', why: 'A parameter override belongs to that stack instance only.', hint: 'the far shore\'s difference comes once its stack instance exists.' },
      { t: 'Update the StackSet\'s template once.', why: 'Both shores get the change, and the far shore keeps its override.', hint: 'changes come last.' }],
    done: 'Shipped, once, to both shores. The far shore\'s relay is half the size and exactly the same.'
  };
  // Aigerim's quest: The Diary Nobody Can Burn, Two Shelves.
  DEF.shelves = {
    title: 'TWO SHELVES · THE DIARY NOBODY CAN BURN', concept: 'objlock', card: 'r6-comply',
    intro: 'Aigerim keeps her diary in a bucket with <b>versioning</b> on. "I can\'t delete any of them. I checked." Now she wants it safe from five things. Which lock stops which?',
    predict: P('Versioning is on. Aigerim deletes a page without naming a version. What happens?', [
      ['S3 adds a delete marker, and every old version is still there', true], ['The page is gone for good', false, 'Not with versioning on.'], ['S3 refuses the delete', false, 'It accepts it; it just doesn\'t destroy anything.']],
      'In a versioned bucket a plain DELETE only adds a delete marker. Removing a version for good needs its version ID, and Object Lock can stop even that.'),
    bins: ['Versioning', 'Cross-Region copy', 'Governance mode', 'Compliance mode', 'Legal hold'],
    items: [I('Someone writes nonsense over this week\'s page', 0, 'Versioning keeps the old version. Restore it.'),
      I('A fire takes the whole near shore, Region and all', 1, 'Only a copy in another Region survives losing the Region: replication, versioning on both buckets.'),
      I('A clerk deletes a page by mistake; two trusted admins should still be able to lift the lock', 2, 'Governance mode: only someone with s3:BypassGovernanceRetention, sending the bypass header, can lift it.'),
      I('An admin, root included, wants the diary gone before the date', 3, 'Compliance mode: nobody can shorten it or delete the version until the date. Not even root.'),
      I('Keep every page until the inquiry is over, and nobody knows when that is', 4, 'A legal hold has no date: it stays until someone with s3:PutObjectLegalHold takes it off.')],
    done: 'Five threats, five locks. "So it really can\'t burn," says Aigerim, and looks almost disappointed.'
  };
  // Mio's quest: Who's Really Listening? Heartbeats.
  DEF.beats = {
    title: 'HEARTBEATS · WHO\'S REALLY LISTENING?', concept: 'health53', card: 'r6-calc',
    intro: 'Mio has her ear to the jetty. "Six of them. Some of them are lying." Listen to each twin\'s health check, and say what it really tells you.',
    predict: P('A stair is up, and every page it serves says ERROR. Which health check still calls it healthy?', [
      ['A TCP check on its port', true], ['An HTTP check that needs a 2xx or 3xx', false, 'An error page comes back as 500, which fails it.'], ['An HTTP check with string matching', false, 'The string wouldn\'t be there.']],
      'A TCP check only proves a connection opens. It can\'t hear what the server says once it has.'),
    bins: ['Tells the truth', 'Says fine, but it\'s down', 'Says down, but it\'s fine'],
    items: [I('Checks /, a static page that answers 200 even when the database is gone', 1, 'The check passes, and every real request fails. Check a path that touches what the app needs.'),
      I('Checks /health, which tries the database and answers 503 if it can\'t reach it', 0, 'A deep check: it fails when the app really can\'t serve.'),
      I('A TCP check on port 443, while every request gets a 500', 1, 'The port opens, so TCP is happy. HTTP would have heard the 500.'),
      I('A calculated check: healthy while 2 of its 3 child checks are', 0, 'It combines the children, and one bad child can\'t fool it.'),
      I('An HTTPS check on a stair whose security group blocks Route 53\'s health checkers', 2, 'The checkers can\'t reach it, so it\'s marked unhealthy while it serves fine. Allow their IP ranges.'),
      I('A container killed by its load balancer\'s check while it\'s still warming up, with no grace period', 2, 'Alive but not ready yet. A health check grace period lets it finish starting.')],
    done: '"That one\'s honest. That one\'s scared. That one\'s pretending." Mio hands you her heartbeat. "And the man with the stall doesn\'t make any sound at all."'
  };
  // Chad's quest: Mirror Everything Premium, Chad's Receipt.
  DEF.receipt = {
    title: 'CHAD\'S RECEIPT · MIRROR EVERYTHING PREMIUM', concept: 'costnet', card: 'r6-gwend',
    intro: 'Chad the Consultant is selling Twinwater a third twin, and here\'s his invoice for the first two. Wen has circled nothing yet. <b>Find the five lines that shouldn\'t be there.</b>',
    predict: P('Private instances copy files to S3 in the same Region through a NAT gateway. What\'s the cheapest fix?', [
      ['A gateway endpoint for S3: no charge, and off the NAT', true], ['A bigger NAT gateway', false, 'Bigger costs the same per gigabyte, and more per hour.'], ['An interface endpoint for S3', false, 'That works, but it has an hourly and per-gigabyte charge. The gateway endpoint is free.']],
      'Gateway endpoints for S3 and DynamoDB cost nothing and sit in the route table, so that traffic never touches the NAT gateway\'s per-gigabyte charge.'),
    need: 5,
    lines: [{ t: 'NAT gateway data processing: 2 TB a day of S3 traffic', cost: '$90/day', bad: true, why: 'Same-Region S3 traffic can take a free gateway endpoint instead.' },
      { t: 'Cross-AZ transfer: every zone\'s instances use one NAT in AZ a', cost: '$41/day', bad: true, why: 'A NAT gateway in each AZ keeps each zone\'s traffic in its zone.' },
      { t: 'The test twin, full size, 24 hours a day', cost: '$212/day', bad: true, why: 'Nobody tests at night. Switch it off out of hours, or schedule it.' },
      { t: 'A third twin in a third Region, "for luck"', cost: '$1,400/mo', bad: true, why: 'Two Regions already meet the RPO and RTO. Luck isn\'t a requirement.' },
      { t: 'On-Demand price for the stair that has run every hour all year', cost: '$880/mo', bad: true, why: 'Steady use like this is what a Savings Plan is for: a commitment for a discount.' },
      { t: 'The warm standby in the second Region, at a quarter size', cost: '$310/mo', bad: false, why: 'That\'s the recovery plan. It meets the RTO.' },
      { t: 'S3 Replication Time Control on the diary bucket', cost: '$0.015/GB', bad: false, why: 'The diary\'s RPO is 15 minutes: RTC is what promises it.' },
      { t: 'Route 53 health checks on both stairs', cost: '$1/mo', bad: false, why: 'Failover needs them.' },
      { t: 'Data transfer in from the internet', cost: '$0.00', bad: false, why: 'Data in is free, and the line says so.' },
      { t: 'CloudFront in front of the far shore\'s pictures', cost: '$0.085/GB', bad: false, why: 'Cached at the edge, fewer gigabytes out of the origin.' }],
    done: 'Five lines struck. Wen tags every line that\'s left with who it belongs to. Chad says this is "a really exciting conversation".'
  };
  // The lake road's gate: how each store crosses to the far shore.
  DEF.lake = {
    title: 'THE LAKE ROAD · HOW DOES IT CROSS?', concept: 'replicas', card: 'r6-crr',
    intro: 'Every shop on the near shore keeps its twin\'s copy across the lake, and each crosses its own way. Match each one to how it\'s replicated.',
    predict: P('You turn on replication for a bucket that already holds a million objects. What happens to those?', [
      ['Nothing: replication copies new objects; old ones need S3 Batch Replication', true], ['They\'re all copied over the next day', false, 'A new rule copies only new objects.'], ['S3 refuses to turn it on', false, 'It turns on fine.']],
      'A replication rule copies objects written after it exists. For the ones already there, run S3 Batch Replication.'),
    bins: ['S3 replication', 'DynamoDB global table', 'Aurora global database', 'RDS read replica'],
    items: [I('The baker\'s pictures, copied to a bucket on the far shore, versioning on both sides', 0, 'Cross-Region Replication needs versioning on the source and the destination.'),
      I('99.99% of new objects across within 15 minutes, with an SLA', 0, 'S3 Replication Time Control.'),
      I('Both shores take orders, and the newest write wins', 1, 'Global tables are multi-active; in the default mode, last writer wins.'),
      I('Storage copied to up to ten secondary Regions, usually under a second behind', 2, 'An Aurora global database replicates at the storage layer.'),
      I('A MySQL copy on the far shore that can be promoted to stand on its own', 3, 'A cross-Region read replica is asynchronous, and can be promoted.')],
    done: 'Every shop has its copy, and every copy got there its own way. The lake road\'s gate lifts.'
  };
  // The Design Board, before Kagemaru: the load test.
  DEF.board = {
    title: 'DESIGN BOARD · TWINWATER, BUILT RIGHT', concept: 'drtiers', card: 'r6-copy',
    intro: 'Twinwater as it should have been built: a warm standby in a second Region, Route 53 failover with health checks, the database replicated, and backups copied to another account and locked. Now the board\'s load test runs. Tap what happens, in order.',
    predict: P('The RPO is 15 minutes and the RTO 30. Which strategy is the cheapest that meets both?', [
      ['Warm standby', true], ['Backup and restore', false, 'Restoring takes hours, and a nightly backup loses up to a day.'], ['Multi-site active/active', false, 'It meets them, at twice the price.']],
      'Pilot light might just make 30 minutes with practice; warm standby meets it with room to spare. Active/active is for an RTO near zero.'),
    steps: [{ t: 'The load test takes the near shore\'s Region down.', why: 'Everything in it goes dark at once.', hint: 'first something has to fail.' },
      { t: 'The primary\'s health check fails, three checks in a row.', why: 'Route 53 waits for its failure threshold.', hint: 'nothing moves until a health check notices.' },
      { t: 'Route 53 answers with the far shore\'s record.', why: 'Failover routing, and the far shore\'s database is promoted to take writes.', hint: 'once the check fails, the answer changes.' },
      { t: 'The warm standby scales out to take the whole town.', why: 'It was running all along, smaller.', hint: 'the travellers arrive at the far shore next.' },
      { t: 'An admin tries to delete the backups. The vault in the other account refuses.', why: 'Copied to another account, and locked.', hint: 'the last test is the backups.' }],
    done: 'RPO met, RTO met, no single zone, Region or account holds every copy, and it fits Chad\'s budget. Barely.'
  };
  // The Lock Room's door, before Expedition III.
  DEF.lock = {
    title: 'THE LOCK ROOM\'S DOOR · OBJECT LOCK', concept: 'objlock', card: 'r6-vaultlock',
    intro: 'The door to the Vault floors opens for a copy that\'s locked properly. Lock the party\'s copy of the evidence so <b>nobody can delete it for seven years</b>, not even whoever holds root.',
    predict: P('Object Lock is on for a bucket. Can you suspend its versioning?', [
      ['No: a bucket with Object Lock keeps versioning on', true], ['Yes, any time', false, 'Not once Object Lock is enabled.'], ['Yes, after the retention ends', false, 'Never, on that bucket.']],
      'Object Lock works on versions, so turning it on turns versioning on, and it can\'t be suspended after.'),
    fields: [{ k: 'ver', label: 'VERSIONING', opts: [['on', 'Enabled'], ['off', 'Off']] },
      { k: 'mode', label: 'MODE', opts: [['gov', 'Governance'], ['comp', 'Compliance'], ['hold', 'Legal hold only']] },
      { k: 'ret', label: 'RETAIN UNTIL', opts: [['1d', '1 day'], ['7y', '7 years'], ['none', 'No date']] }],
    answer: { ver: 'on', mode: 'comp', ret: '7y' },
    check: s => s.ver === 'off' ? 'Object Lock protects versions. With no versions, there\'s nothing to lock.'
      : s.mode === 'gov' ? 'Governance mode: anyone with s3:BypassGovernanceRetention can lift it. Root certainly can.'
      : s.mode === 'hold' ? 'A legal hold has no date, and anyone allowed s3:PutObjectLegalHold can take it off again.'
      : s.ret === '1d' ? 'Locked until tomorrow. Seven years, the door said.'
      : s.ret === 'none' ? 'Compliance mode needs a retain-until date. That date is the whole lock.' : null,
    done: 'Compliance mode, seven years. The door reads the date, and opens. Somewhere above, a man laughs at a lock that is ten thousand years long.'
  };
})();
