// The minigames of chapter 5's overworld (js/c5-world.js). Each opens with a prediction you make before you see the
// answer, then lets you play it out ("predict, then play"). Three small engines, the games built on them, and two of
// the chapter's own:
//   door    build a setting from chips and try it (the workshop gate's purchase options, Cron's deployment configs,
//           Pella's cheapest query)
//   sort    put each thing where it belongs, then check; wrong rows say why and stay open (which metric to scale on,
//           what the wards record, Spot the Drift, Fewer Machines, Cron's four nights)
//   order   tap the steps in the order they happen (Ship It as a pipeline, the Design Board)
//   cipher  Lina's Voice: type the key word to her cipher
//   shift   the Observatory's traffic bar: 10, 25, 50, 75, 100%, one right answer a step; a wrong one trips the alarm
//           and rolls the deployment back a step
// The world asks the typed questions and the bank questions itself. AWS facts follow the current AWS documentation
// (EC2 purchase options, Auto Scaling policies, CloudTrail management and data events, CloudFormation change sets and
// drift detection, ECS, Fargate and Lambda limits, CodePipeline, CodeBuild and CodeDeploy, Lambda aliases and traffic
// shifting, Athena pricing, partitions and Parquet, CloudWatch alarms, X-Ray). Every explanation is written fresh.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const U = SD.ui, S = SD.state, AU = SD.audio, Q = SD.quiz;
  const G = SD.c5games = {};
  const esc = s => U.esc(s);

  const css = document.createElement('style');
  css.textContent = `
.g5 { text-align: left; }
.g5-rule { font: 12px/1.45 ui-monospace, monospace; color: #c8ffd8; background: #1e2a26; border-radius: 6px; padding: 6px 8px; margin: 0 0 8px; white-space: pre-wrap; overflow-x: auto; }
.g5-note { min-height: 1.4em; margin: 8px 0 0; } .g5-note.ok { color: #1f6e3a; } .g5-note.bad { color: #a3192e; }
.g5-predict { border-left: 3px solid #c8901a; padding-left: 10px; margin-bottom: 10px; }
.g5-predict b { color: #8a5a00; font-size: 12px; letter-spacing: .06em; }
.g5 .opts.col { display: flex; flex-direction: column; gap: 8px; } .g5 .opts.col .opt { text-align: left; min-height: 44px; }
.g5-field { margin: 8px 0; } .g5-field > b { display: block; font-size: 12px; color: #5a5070; letter-spacing: .04em; margin-bottom: 4px; }
.g5-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.g5-chips button { min-height: 44px; padding: 6px 10px; font: 13px ui-monospace, monospace; }
.g5-chips button.on, .g5-row button.on { background: var(--blue); color: #fff; }
.g5-row { display: flex; align-items: center; gap: 6px; margin: 8px 0; flex-wrap: wrap; padding: 6px 0; border-top: 1px solid rgba(255,255,255,.1); }
.g5-row > span { flex: 1 1 100%; font-size: 14px; }
.g5-row button { min-height: 44px; padding: 6px 10px; font-size: 13px; flex: 1 1 auto; }
.g5-row .why { flex-basis: 100%; font-size: 12px; margin: 2px 0 0; } .g5-row .why.ok { color: #1f6e3a; } .g5-row .why.bad { color: #a3192e; }
.g5-row.done button { opacity: .55; }
.g5-steps { display: flex; flex-direction: column; gap: 6px; margin: 8px 0; }
.g5-steps button { min-height: 44px; text-align: left; }
.g5-steps button, .g5-row button, .g5 .opts .opt { font-family: var(--f-body); font-variant: normal; text-transform: none; letter-spacing: 0; font-weight: 600; font-size: 14px; line-height: 1.35; }
.g5-done { counter-reset: s; margin: 6px 0; padding-left: 0; list-style: none; }
.g5-done li { counter-increment: s; font-size: 13px; padding: 4px 0 4px 26px; position: relative; color: #1e3a28; }
.g5-done li::before { content: counter(s); position: absolute; left: 0; top: 3px; width: 18px; height: 18px; border-radius: 9px; background: #2c8a4b; color: #fff; font: 700 11px/18px sans-serif; text-align: center; }
.g5-cipher { font: 15px/1.6 ui-monospace, monospace; color: #e8dcff; background: #221c30; border-radius: 6px; padding: 8px 10px; margin: 0 0 8px; word-break: break-word; }
.g5-type { display: flex; gap: 8px; flex-wrap: wrap; } .g5-type input { flex: 1 1 160px; min-height: 44px; font: 18px ui-monospace, monospace; letter-spacing: .2em; text-transform: uppercase; padding: 0 10px; border-radius: 8px; border: 2px solid #5a4a8a; background: #14101f; color: #fff; }
.g5-type button { min-height: 44px; }
.g5-bar { display: flex; gap: 4px; margin: 6px 0 10px; } .g5-bar i { flex: 1; height: 22px; border-radius: 4px; background: #2a2436; font: 700 11px/22px sans-serif; color: #8a84a4; text-align: center; font-style: normal; }
.g5-bar i.on { background: #3bd16f; color: #0e2a18; } .g5-bar i.back { background: #d63a3a; color: #fff; }
`;
  document.head.appendChild(css);

  function note(b, text, ok) { const n = b.querySelector(':scope > .g5-note') || b.querySelector('.g5-note'); n.textContent = text; n.className = 'g5-note ' + (ok ? 'ok' : 'bad'); }
  const cont = (b, label) => new Promise(res => {
    const go = document.createElement('button'); go.className = 'primary'; go.id = 'g5-cont'; go.textContent = label || 'Continue';
    b.appendChild(go); go.focus(); go.onclick = () => { U.closePanel(); res(); };
  });
  // A prediction: pick one, see whether it was right and why. Resolves true if it was.
  function predict(b, p, concept) {
    return new Promise(res => {
      const box = document.createElement('div'); box.className = 'g5-predict';
      box.innerHTML = `<b>PREDICT FIRST</b><p>${esc(p.q)}</p><div class="opts col">${p.opts.map((o, i) => `<button class="opt" data-p="${i}">${esc(o.t)}</button>`).join('')}</div><p class="g5-note"></p>`;
      b.appendChild(box);
      box.querySelectorAll('[data-p]').forEach(el => el.onclick = () => {
        const o = p.opts[+el.dataset.p];
        box.querySelectorAll('[data-p]').forEach(x => { x.disabled = true; if (p.opts[+x.dataset.p].ok) x.classList.add('on'); });
        S.recordAnswer(concept, !!o.ok, 1, 15000);
        AU.sfx(o.ok ? 'right' : 'wrong');
        const n = box.querySelector('.g5-note');
        n.textContent = (o.ok ? 'Right. ' : (o.no || 'Not quite.') + ' ') + p.why; n.className = 'g5-note ' + (o.ok ? 'ok' : 'bad');
        setTimeout(() => res(!!o.ok), 300);
      });
    });
  }
  const shuffle = a => (Q && Q.shuffle ? Q.shuffle(a.slice()) : a.slice().sort(() => Math.random() - 0.5));

  // ---------- door: build a setting, try it ----------
  // o: { title, concept, intro, rule, predict, fields: [{ k, label, opts: [[value, text]] }], answer: { k: value },
  //      check(sel) -> null when right, else why it fails; done; go (the button) }. Resolves { first, tries }.
  G.door = function (o) {
    S.seeConcept(o.concept);
    G.cur = { kind: 'door', o };
    return new Promise(async res => {
      const b = U.panel(`<div class="g5"><p>${o.intro}</p>${o.rule ? `<div class="g5-rule">${esc(o.rule)}</div>` : ''}</div>`, { title: o.title, noClose: true, cls: 'wide' });
      const g = b.querySelector('.g5');
      if (o.predict) await predict(g, o.predict, o.concept);
      const sel = {};
      const box = document.createElement('div');
      box.innerHTML = o.fields.map(f => `<div class="g5-field"><b>${esc(f.label)}</b><div class="g5-chips">${f.opts.map(([v, t]) => `<button class="ghost" data-f="${f.k}" data-v="${esc(v)}">${esc(t)}</button>`).join('')}</div></div>`).join('')
        + `<button class="primary" id="g5-try" disabled>${esc(o.go || 'Try it')}</button><p class="g5-note"></p>`;
      g.appendChild(box);
      const tryB = box.querySelector('#g5-try');
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
        note(box, typeof o.done === 'function' ? o.done(sel) : o.done, true); AU.sfx('x-lock');
        await cont(g, o.through || 'Continue');
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
      const b = U.panel(`<div class="g5"><p>${o.intro}</p>${o.rule ? `<div class="g5-rule">${esc(o.rule)}</div>` : ''}</div>`, { title: o.title, noClose: true, cls: 'wide' });
      const g = b.querySelector('.g5');
      if (o.predict) await predict(g, o.predict, o.concept);
      const pick = {}, locked = {};
      const box = document.createElement('div');
      box.innerHTML = order.map(i => `<div class="g5-row" data-r="${i}"><span>${esc(o.items[i].t)}</span>${o.bins.map((l, v) => `<button class="ghost" data-i="${i}" data-v="${v}">${esc(l)}</button>`).join('')}<p class="why"></p></div>`).join('')
        + `<button class="primary" id="g5-go" disabled>${esc(o.go || 'Check')}</button><p class="g5-note"></p>`;
      g.appendChild(box);
      const go = box.querySelector('#g5-go');
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
      const b = U.panel(`<div class="g5"><p>${o.intro}</p></div>`, { title: o.title, noClose: true, cls: 'wide' });
      const g = b.querySelector('.g5');
      if (o.predict) await predict(g, o.predict, o.concept);
      const box = document.createElement('div');
      box.innerHTML = `<ol class="g5-done"></ol><div class="g5-steps">${shuffle(o.steps.map((x, i) => i)).map(i => `<button class="ghost" data-s="${i}">${esc(o.steps[i].t)}</button>`).join('')}</div><p class="g5-note"></p>`;
      g.appendChild(box);
      let next = 0, mistakes = 0;
      box.querySelectorAll('[data-s]').forEach(el => el.onclick = async () => {
        const i = +el.dataset.s;
        if (i !== next) { mistakes++; note(box, 'Not yet: ' + o.steps[next].hint, false); AU.sfx('wrong'); return; }
        const li = document.createElement('li'); li.textContent = o.steps[i].t + ' ' + o.steps[i].why;
        box.querySelector('.g5-done').appendChild(li); el.remove(); AU.sfx('card');
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

  // ---------- cipher: Lina's key word ----------
  // o: { title, intro, text (the enciphered line), key, hints: [..], done }. Resolves { tries }.
  // Lina's cipher is a Vigenere on top of her father's: each letter is shifted on by the key word's letter.
  const vig = (s, key) => { let j = 0; return s.toUpperCase().replace(/[A-Z]/g, ch => { const k = key.charCodeAt(j++ % key.length) - 65; return String.fromCharCode((ch.charCodeAt(0) - 65 + k) % 26 + 65); }); };
  G.vig = vig;
  G.cipher = function (o) {
    G.cur = { kind: 'cipher', o };
    return new Promise(res => {
      const b = U.panel(`<div class="g5"><p>${o.intro}</p><div class="g5-cipher" id="g5-ct">${esc(vig(o.text, o.key))}</div>
        <label class="muted small" for="g5-key">The key word</label><div class="g5-type"><input id="g5-key" maxlength="12" autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="primary" id="g5-try">Try the key</button></div><p class="g5-note"></p></div>`, { title: o.title, noClose: true, cls: 'wide' });
      const g = b.querySelector('.g5'), inp = b.querySelector('#g5-key');
      let tries = 0;
      const go = async () => {
        const k = String(inp.value || '').trim().toUpperCase().replace(/[^A-Z]/g, '');
        if (!k) return;
        tries++;
        if (k !== o.key) {
          AU.sfx('wrong');
          note(g, `With "${k}" the page still reads as nonsense. ${o.hints[Math.min(tries - 1, o.hints.length - 1)]}`, false);
          return;
        }
        AU.sfx('x-page');
        b.querySelector('#g5-ct').textContent = o.text;
        inp.disabled = true; b.querySelector('#g5-try').disabled = true;
        note(g, o.done, true);
        await cont(g, 'Read the pages');
        G.cur = null;
        res({ tries });
      };
      b.querySelector('#g5-try').onclick = go;
      inp.onkeydown = e => { if (e.key === 'Enter') go(); };
      setTimeout(() => { try { inp.focus(); } catch (e) {} }, 50);
    });
  };

  // ---------- shift: the traffic bar ----------
  // o: { title, intro, qs: [{ q, opts, a, why }], steps: [10, 25, 50, 75, 100], done }. One right answer moves the
  // bar a step; a wrong one trips the alarm and rolls it back a step, and that question comes round again.
  // Resolves { wrong }.
  G.shift = function (o) {
    G.cur = { kind: 'shift', o };
    return new Promise(res => {
      const steps = o.steps || [10, 25, 50, 75, 100];
      const b = U.panel(`<div class="g5"><p>${o.intro}</p><div class="g5-bar">${steps.map(s => `<i>${s}%</i>`).join('')}</div><div id="g5-q"></div><p class="g5-note"></p></div>`, { title: o.title, noClose: true, cls: 'wide' });
      const g = b.querySelector('.g5');
      let at = 0, wrong = 0;
      const queue = o.qs.map((q, i) => i);
      const bar = back => b.querySelectorAll('.g5-bar i').forEach((el, i) => { el.className = i < at ? 'on' : back && i === at ? 'back' : ''; });
      const ask = () => {
        const i = queue[0], q = o.qs[i];
        G.cur.q = q;
        const box = b.querySelector('#g5-q');
        box.innerHTML = `<p><b>${esc(steps[at] + '%')}:</b> ${esc(q.q)}</p><div class="opts col">${q.opts.map((t, k) => `<button class="opt" data-k="${k}">${esc(t)}</button>`).join('')}</div>`;
        box.querySelectorAll('[data-k]').forEach(el => el.onclick = async () => {
          const ok = +el.dataset.k === q.a;
          S.recordAnswer(q.c || 'shifting', ok, 1, 20000);
          box.querySelectorAll('[data-k]').forEach(x => { x.disabled = true; });
          queue.shift();
          if (ok) { at++; AU.sfx('x-lever'); note(g, 'Right. ' + q.why, true); bar(); }
          else { wrong++; queue.push(i); AU.sfx('x-barrier'); note(g, 'The alarm trips: the deployment rolls back a step. ' + q.why, false); at = Math.max(0, at - 1); bar(true); }
          if (at >= steps.length) { box.innerHTML = ''; note(g, o.done, true); await cont(g); G.cur = null; return res({ wrong }); }
          setTimeout(ask, 900);
        });
      };
      bar(); ask();
    });
  };

  // ---------- The games ----------
  const P = (q, opts, why) => ({ q, opts: opts.map(([t, ok, no]) => ({ t, ok, no })), why });
  const I = (t, bin, why) => ({ t, bin, why });
  const DEF = G.DEF = {};

  // The Workshops' gate: three of the forge's jobs, and how to pay for each.
  DEF.buy = {
    title: 'THE WORKSHOP GATE · WHICH WAY TO PAY', concept: 'ec2buy', card: 'x5-savings',
    intro: 'The gate into the Workshops is a ledger with three of the forge\'s machines on it, and a blank where each one\'s payment goes. Fill in the cheapest way to pay that still does the job.',
    rule: 'A  the furnace controller   steady, 24/7, the next 3 years, never interrupted\nB  the night renders         3 hours a night, checkpoints, done by morning\nC  a test bench              a few hours a week, at random, can\'t be stopped mid-test',
    predict: P('Spot capacity can be taken back. How much warning does an instance get?', [
      ['Two minutes', true], ['Thirty seconds', false, 'Longer than that.'], ['None at all', false, 'There is a notice.']],
      'A Spot interruption notice comes two minutes before the instance is stopped, hibernated or terminated. Work that checkpoints can live with that.'),
    fields: [{ k: 'a', label: 'A · THE FURNACE CONTROLLER', opts: [['od', 'On-Demand'], ['ri', '3-year Savings Plan or RI'], ['spot', 'Spot']] },
      { k: 'b', label: 'B · THE NIGHT RENDERS', opts: [['od', 'On-Demand'], ['ri', '3-year Savings Plan or RI'], ['spot', 'Spot']] },
      { k: 'c', label: 'C · THE TEST BENCH', opts: [['od', 'On-Demand'], ['ri', '3-year Savings Plan or RI'], ['spot', 'Spot']] }],
    answer: { a: 'ri', b: 'spot', c: 'od' },
    check: s => s.a === 'spot' ? 'The furnace controller can\'t be interrupted, and Spot can be taken back with two minutes\' notice.'
      : s.a === 'od' ? 'It runs all day for three years: a commitment (a Savings Plan or Reserved Instances) costs far less than On-Demand for that.'
      : s.b === 'ri' ? 'Three hours a night is a lot of idle commitment. The renders checkpoint, so they can use the bargain bin.'
      : s.b === 'od' ? 'It works, but the renders checkpoint and only need to finish by morning: Spot is much cheaper.'
      : s.c === 'spot' ? 'The test bench can\'t be stopped mid-test, so it shouldn\'t be on capacity that can be reclaimed.'
      : s.c === 'ri' ? 'A few random hours a week: a three-year commitment would mostly pay for nothing.' : null,
    done: 'Committed for the steady one, Spot for the work that can pause, On-Demand for the odd jobs. The ledger closes, and the gate with it swings open.',
    through: 'Into the Workshops'
  };
  // The Forge's door: scale on what?
  DEF.metric = {
    title: 'KYU\'S PAGE 8 · SCALE ON WHAT?', concept: 'scaling', card: 'x5-target',
    intro: 'A page of Kyu\'s is nailed to the forge door: <i>Scale out, not up. Then ask: scale on WHAT?</i> Below it, four of the forge\'s fleets. Pick the signal each one should grow and shrink on.',
    predict: P('A target tracking policy holds a metric near a target. What does it do when the metric goes over?', [
      ['Adds capacity until the metric comes back to the target', true], ['Sends an alarm and waits for a person', false, 'It acts by itself.'], ['Makes each instance bigger', false, 'Auto Scaling adds instances; it doesn\'t resize them.']],
      'Target tracking works like a thermostat: it creates the alarms itself and adds or removes instances to keep the metric near the target.'),
    bins: ['Average CPU', 'Requests per target', 'Queue backlog per instance', 'Predictive or scheduled'],
    items: [I('Bellows golems that do heavy maths for every order', 0, 'The work is the CPU: average CPU tracks the load.'),
      I('Gatekeepers that mostly wait on the archive behind them', 1, 'Their CPU stays low while they wait. ALBRequestCountPerTarget rises with the visitors.'),
      I('Workers pulling sword orders off a queue', 2, 'Backlog per instance: visible messages divided by running workers, against what one can clear in time.'),
      I('A fleet that\'s swamped at 8 every morning and takes 10 minutes to boot', 3, 'Predictive scaling (or a scheduled action) launches capacity before the rush arrives.')],
    done: 'Each fleet scales on what it\'s actually short of. Kyu\'s page has a last line, underlined twice: "Out. Not up."'
  };
  // The janitor's closet door: what the wards record.
  DEF.trail = {
    title: 'THE CLOSET DOOR · WHAT THE WARDS RECORD', concept: 'trailproof', card: 'x5-dataevents',
    intro: 'The closet door has the Arcanum\'s ward record pinned to it: one trail, default settings, to an S3 bucket. Lina wrote that the wards logged every door and not one page read. Which of these would the trail have recorded?',
    rule: 'trail: arcanum-wards\n  management events: read and write\n  data events:       (none)\n  delivers to:       s3://arcanum-ward-records',
    predict: P('Which kind of CloudTrail event does a trail record with no extra setup?', [
      ['Management events: calls that create, change or delete resources', true], ['Data events: reads and writes inside a resource', false, 'Those are off until you add them.'], ['Every API call of every kind', false, 'Data events cost extra and are off by default.']],
      'Trails and event history record management events by default. Data events, such as S3 GetObject or a Lambda Invoke, must be added to a trail or event data store.'),
    bins: ['Recorded', 'Not recorded'],
    items: [I('A professor changes the archive bucket\'s policy (PutBucketPolicy)', 0, 'A management event: recorded by default.'),
      I('Someone reads a page from the archive bucket (GetObject)', 1, 'A data event, and this trail has none configured.'),
      I('A new staff user is created (CreateUser)', 0, 'IAM calls are management events.'),
      I('A page is written into the bucket (PutObject)', 1, 'Object-level writes are data events too.'),
      I('A ward function is invoked (Lambda Invoke)', 1, 'Lambda Invoke is a data event.'),
      I('A sealed record is decrypted (KMS Decrypt)', 0, 'KMS calls are management events, recorded by default.')],
    done: 'Every door, and not one page read. Lina knew it, so she turned a ward on herself. The closet door clicks open.'
  };
  // Ship It, as a pipeline.
  DEF.ship = {
    title: 'SHIP IT · THE FIRST REAL PIPELINE', concept: 'cicd', card: 'x5-pipeline',
    intro: 'Until now the party has shipped fixes by hand at the camp table. Tonight the fix goes through a pipeline. Tap the stages in the order a change goes through them.',
    predict: P('What does a pipeline\'s manual approval action do to what\'s shipped?', [
      ['Pauses the pipeline, then sends on the same artifact that passed the earlier stages', true], ['Rebuilds the code once someone approves', false, 'Nothing is rebuilt: the tested artifact goes on.'], ['Emails the code to the approver', false, 'It can notify an SNS topic with a link to review; the code stays in the pipeline.']],
      'A manual approval stops the run until someone approves or rejects it. The artifact that passed testing is the one that continues.'),
    steps: [{ t: 'Source: a commit to the main branch starts the pipeline.', why: 'The source action hands the commit on as an artifact.', hint: 'everything starts with a change in the source.' },
      { t: 'Build: CodeBuild follows the buildspec and runs the unit tests.', why: 'Install, build, test, then the artifact.', hint: 'the code has to be built and tested first.' },
      { t: 'Test: deploy to the test stage and run the integration tests.', why: 'Against a real test environment, with the outside calls mocked.', hint: 'test it deployed, before anyone approves it.' },
      { t: 'Approve: a manual approval, with a link to the test results.', why: 'A person says yes to this very artifact.', hint: 'someone signs off before production.' },
      { t: 'Deploy: CodeDeploy shifts production to the new version.', why: 'Nobody touches the deploy by hand.', hint: 'production comes last.' }],
    done: 'For the first time the deploy runs without anyone touching it. Kai watches it go green and says nothing, which for Kai is a speech.'
  };
  // Ayo's quest: Spot the Drift.
  DEF.drift = {
    title: 'EVERY BENT SWORD · SPOT THE DRIFT', concept: 'iac', card: 'x5-changeset',
    intro: 'Ayo spreads the Arcanum\'s template on his anvil beside what\'s actually standing tonight. "Before I touch anything, tell me what a change will do." For each change, predict what CloudFormation will do.',
    predict: P('You create a change set for a stack. What has changed in your resources when it\'s ready?', [
      ['Nothing: it\'s a preview until you execute it', true], ['The resources are updated, and you can roll back', false, 'Nothing changes until you execute it.'], ['Only resources marked for replacement are created', false, 'Nothing is created.']],
      'A change set lists what an update would add, modify or replace, including whether each resource would be replaced. Nothing happens until you execute it.'),
    bins: ['Modify in place', 'Replace it', 'Drift: changed by hand'],
    items: [I('The template changes the sword table\'s TableName', 1, 'Changing a DynamoDB table\'s name replaces the table: a new, empty one.'),
      I('The template raises a function\'s MemorySize', 0, 'Lambda memory updates the function in place.'),
      I('The template changes an instance\'s ImageId', 1, 'A new AMI means a new EC2 instance.'),
      I('Someone added an inbound rule to the forge\'s security group in the console', 2, 'A change outside CloudFormation: drift detection reports it as MODIFIED.'),
      I('The template changes a bucket\'s Tags', 0, 'Tags update in place, with no interruption.'),
      I('The template changes a bucket\'s BucketName', 1, 'A bucket can\'t be renamed: CloudFormation creates a new one.')],
    done: 'Ayo grunts, which is approval. "Read the change set before you swing. That\'s the post-mortem I write before the sword bends."'
  };
  // Kaito's quest: Fewer Machines.
  DEF.machines = {
    title: 'KAITO\'S FIFTY-TWO MACHINES · FEWER MACHINES', concept: 'containers', card: 'x5-fargate',
    intro: 'Kaito\'s assembly line was fifty-two services. Seven are left once the duplicates are gone, and he\'s on a budget now. Put each where it costs least and still works.',
    predict: P('How long can one Lambda invocation run, at most?', [
      ['15 minutes', true], ['5 minutes', false, 'That was the limit long ago.'], ['As long as it needs', false, 'There\'s a hard limit.']],
      'A Lambda function times out after at most 900 seconds, 15 minutes. Longer work belongs in a container or on an instance.'),
    bins: ['Lambda', 'Fargate', 'EC2', 'Remove it'],
    items: [I('A job that runs for two seconds once an hour', 0, 'Pay for two seconds an hour, not a machine that waits.'),
      I('A steady containerized API that the team doesn\'t want to patch servers for', 1, 'Fargate runs the same container with no servers to manage.'),
      I('A nightly batch container that runs for about 40 minutes', 1, 'Too long for Lambda\'s 15 minutes; a Fargate task runs it and stops.'),
      I('A physics service that needs a GPU, all day', 2, 'Fargate offers no GPUs; an accelerated EC2 instance does.'),
      I('A service whose only job is to check that the health-check service is up', 3, 'The load balancer\'s health checks already do this.'),
      I('A thumbnail maker triggered by each upload, a second each', 0, 'Short, event-driven, and idle most of the time.'),
      I('A second copy of the orders service, "just in case"', 3, 'Run more tasks of one service instead, across AZs.')],
    done: 'Seven machines where there were fifty-two, and the bill is a fraction. Kaito insists he was about to do exactly this.'
  };
  // Kaito's quest, part two: the two roles.
  DEF.roles = {
    title: 'KAITO\'S FIFTY-TWO MACHINES · TWO ROLES', concept: 'containers', card: 'x5-taskrole',
    intro: 'The orders task must pull its image from ECR, send its logs, read its password from Secrets Manager when it starts, and call the payments queue in SQS from its code. Which role needs which permission?',
    bins: ['Task execution role', 'Task role'],
    items: [I('Pull the image from the private ECR repository', 0, 'ECS pulls the image before the app runs: the execution role.'),
      I('Send the container\'s logs to CloudWatch Logs with the awslogs driver', 0, 'The log driver uses the execution role.'),
      I('Fetch the password named in the task definition\'s secrets section', 0, 'ECS injects it before start, with the execution role.'),
      I('Send a message to the payments queue from the app\'s code', 1, 'The app\'s own AWS calls use the task role\'s credentials.')],
    done: 'The canteen\'s badge and the app\'s badge, each with only what it needs. One service can call another because its task role says so.'
  };
  // Cron's quest: The Night the Clock Stopped, part one.
  DEF.night = {
    title: 'CRON\'S NIGHT, AGAIN · FOUR MIDNIGHT JOBS', concept: 'deploycfg', card: 'x5-hooks',
    intro: 'Cron has four midnight jobs, each a Lambda function released through CodeDeploy. "Pa always did them all at once, at midnight." Choose a deployment configuration for each.',
    rule: '1  the bell ringer      every student hears it; a bad release must reach few of them\n2  the lamp lighter      must reach everyone in steady steps, done within a quarter hour\n3  the night porter      an internal job nobody calls until morning\n4  the gate keeper       a bad release must be caught on a slice, but it must be fully out in 10 minutes',
    fields: [{ k: 'a', label: '1 · THE BELL RINGER', opts: [['canary', 'Canary10Percent5Minutes'], ['linear', 'Linear10PercentEvery1Minute'], ['all', 'AllAtOnce']] },
      { k: 'b', label: '2 · THE LAMP LIGHTER', opts: [['canary', 'Canary10Percent5Minutes'], ['linear', 'Linear10PercentEvery1Minute'], ['all', 'AllAtOnce']] },
      { k: 'c', label: '3 · THE NIGHT PORTER', opts: [['canary', 'Canary10Percent5Minutes'], ['linear', 'Linear10PercentEvery1Minute'], ['all', 'AllAtOnce']] },
      { k: 'd', label: '4 · THE GATE KEEPER', opts: [['canary', 'Canary10Percent5Minutes'], ['linear', 'Linear10PercentEvery10Minutes'], ['all', 'AllAtOnce']] }],
    answer: { a: 'canary', b: 'linear', c: 'all', d: 'canary' },
    check: s => s.a === 'all' ? 'All at once sends every student the bad bell together. A canary tries it on 10% first.'
      : s.b === 'canary' ? 'A canary moves 10%, waits, then moves the rest at once. The lamp lighter wants equal, steady steps.'
      : s.b === 'all' ? 'One jump, not steady steps.'
      : s.c !== 'all' ? 'Nobody calls the porter until morning, so there\'s no live traffic to protect: all at once is fine.'
      : s.d === 'linear' ? 'Ten percent every ten minutes takes about an hour and a half to finish. Too slow for this one.'
      : s.d === 'all' ? 'The gate keeper needs a slice first.'
      : s.a === 'linear' ? 'Linear reaches everyone in steps, but the first step is already a tenth of the students for a minute, and then more each minute. A canary holds at 10% while the alarm watches.' : null,
    done: 'Canary for the bell, linear for the lamps, all at once for the porter, a canary for the gate. Cron writes them down in his father\'s almanac, in pencil.'
  };
  // Cron's quest, part two: watch four nights.
  DEF.nights = {
    title: 'CRON\'S NIGHT, AGAIN · FOUR NIGHTS', concept: 'deploycfg', card: 'x5-rollback',
    intro: 'Each deployment group has an alarm on the new version\'s errors, and automatic rollback on alarm. Watch four nights. What does CodeDeploy do on each?',
    bins: ['Ships to everyone', 'Rolls back on its own', 'Rolls back a good release'],
    items: [I('Night 1: a good release on the bell ringer. The errors stay flat.', 0, 'The canary holds for 5 minutes, the alarm stays OK, and the rest shifts.'),
      I('Night 2: a bad release on the bell ringer. Errors climb during the canary.', 1, 'The alarm goes into ALARM, the deployment stops, and the alias points back at the old version.'),
      I('Night 3: a slow release on the lamp lighter. Each step is healthy.', 0, 'Ten steps of 10%, one a minute: slow, but every step passes.'),
      I('Night 4: a good release on the gate keeper, but the alarm\'s threshold is one error in five minutes.', 2, 'A threshold that a single normal error crosses is a flaky alarm: set it above the normal error rate.')],
    done: 'Four nights, and only one of them needed Cron awake. The clock in the tower ticks on. Cron looks at his watch, and for the first time, he doesn\'t wind it.'
  };
  // Pella's quest: The Cheapest Question.
  const TB = { csv: 2.0, gz: 0.5, pq: 0.25 };
  DEF.cheapest = {
    title: 'TWO HUNDRED YEARS · THE CHEAPEST QUESTION', concept: 'datalake', card: 'x5-parquet',
    intro: 'Pella has two hundred years of trial records in S3: 2 TB of CSV. Her question: <i>how many students were drained in each of the last ten years?</i> Athena charges by the data each query scans, about $5 a terabyte. Make the question as cheap as you can.',
    predict: P('Why does a columnar format such as Parquet make Athena cheaper?', [
      ['A query reads only the columns it asks for, compressed', true], ['Athena gives a discount for Parquet', false, 'The price per terabyte is the same; the terabytes are fewer.'], ['Parquet files are cached forever', false, 'Nothing to do with caching.']],
      'Athena bills for the bytes it scans. Parquet stores each column apart and compressed, so a query that needs three columns reads three.'),
    fields: [{ k: 'fmt', label: 'FORMAT', opts: [['csv', 'CSV, as is'], ['gz', 'CSV, gzipped'], ['pq', 'Parquet']] },
      { k: 'part', label: 'LAYOUT IN S3', opts: [['flat', 'One folder'], ['year', 'Partitioned by year']] },
      { k: 'cols', label: 'THE QUERY', opts: [['star', 'SELECT *'], ['need', 'SELECT year, outcome ... WHERE year >= 2016']] }],
    answer: { fmt: 'pq', part: 'year', cols: 'need' },
    check: s => {
      let tb = TB[s.fmt];
      if (s.part === 'year' && s.cols === 'need') tb *= 10 / 200;
      if (s.fmt === 'pq' && s.cols === 'need') tb *= 0.1;
      const cost = '$' + (tb * 5).toFixed(tb * 5 < 0.1 ? 3 : 2);
      if (s.fmt !== 'pq') return `This scans about ${tb.toFixed(2)} TB, ${cost} a question. ${s.fmt === 'csv' ? 'Plain CSV: every column of every row it touches is read.' : 'Gzip shrinks it, but every column of every row it touches is still read.'} A columnar format reads only the columns asked for.`;
      if (s.part !== 'year') return `About ${tb.toFixed(3)} TB, ${cost}. Better, but every year is scanned to find the last ten. Partition by year, so the WHERE skips the rest.`;
      if (s.cols !== 'need') return `About ${tb.toFixed(3)} TB, ${cost}. SELECT * reads every column and every year; ask only for what you need, and filter on the partition.`;
      return null;
    },
    done: s => 'Parquet, partitioned by year, two columns, ten years: about 0.001 TB, half a cent. Pella reads the result twice. "The drain is two hundred years old. Every year, the same few names spared."',
    go: 'Run the query'
  };
  // The Design Board: Iris's floor, the safe pipeline.
  DEF.board = {
    title: 'DESIGN BOARD · THE SAFE PIPELINE', concept: 'shifting', card: 'x5-canary',
    intro: 'Before Iris: draw the safe pipeline for her floor. Tap the boxes in the order a change goes through them.',
    steps: [{ t: 'A commit starts the pipeline.', why: 'Nothing ships that isn\'t in source control.', hint: 'it starts with a commit.' },
      { t: 'A build stage runs the unit tests.', why: 'CodeBuild, with a buildspec.', hint: 'build and unit-test it first.' },
      { t: 'Deploy to a test alias, and run an integration test with the outside call mocked.', why: 'A real deployment, a fake payment API.', hint: 'it must be tested deployed before anyone approves it.' },
      { t: 'A manual approval.', why: 'A person signs off on this artifact.', hint: 'a person approves it before live.' },
      { t: 'A canary shift on the live alias, with an alarm on the new version\'s errors that rolls it back.', why: 'Ten percent first; if the alarm fires, everyone goes back.', hint: 'then it goes live, a slice at a time.' },
      { t: 'Tracing on, so the next bug can be found.', why: 'X-Ray on the stage and the functions.', hint: 'last: make the next bug findable.' }],
    done: 'The board checks out: nothing reaches live without the alarm, and the deploy role can only deploy.'
  };
  // The Observatory's traffic bar (the 'shift' cue after the last floor).
  DEF.shift = {
    title: 'THE OBSERVATORY · 23:50 TO MIDNIGHT',
    intro: 'Move the floor from Freya\'s version to yours before midnight: the same Arcanum, every ward recording everyone, staff included. Each step holds while Iris attacks. A wrong answer trips the alarm and rolls the deployment back a step.',
    qs: [{ c: 'shifting', q: 'Your new version must take 10% of the live alias\'s traffic, wait, then everything. Which kind of configuration is that?', opts: ['Canary', 'Linear', 'All at once'], a: 0,
        why: 'A canary shifts one slice, waits, then shifts the rest. Linear moves equal steps; all at once moves everything together.' },
      { c: 'shifting', q: 'Which alarm should trigger the rollback?', opts: ['Errors on the alias for the new version', 'The account\'s total Lambda errors', 'The function\'s duration in the old version'], a: 0,
        why: 'Watch the new version\'s own errors through the alias: the whole account\'s errors would hide it, and the old version tells you nothing.' },
      { c: 'shifting', q: 'When is blue/green the wrong choice?', opts: ['When a schema change in the shared database is one the old version can\'t read', 'When you want a quick rollback', 'When there\'s a load balancer'], a: 0,
        why: 'Both versions run against the same data during and after the shift. A change the old one can\'t read makes rolling back break.' },
      { c: 'shifting', q: 'Without CodeDeploy, how do you send 5% of an alias\'s traffic to new code?', opts: ['Publish it as a version and set the alias\'s additional version weight to 0.05', 'Point the alias at $LATEST with a 5% weight', 'Create a second function'], a: 0,
        why: 'A weighted alias splits traffic between two published versions; $LATEST can\'t be one of them.' },
      { c: 'appcfg', q: 'A feature flag turns on badly at 50%. What brings it back without a code deploy?', opts: ['AppConfig\'s rollback on a CloudWatch alarm', 'Redeploying the function', 'Deleting the configuration profile'], a: 0,
        why: 'AppConfig rolls a deployment back when an alarm on its deployment fires, without touching the code.' },
      { c: 'deploycfg', q: 'A BeforeAllowTraffic hook\'s tests pass. What must the hook do so the shift goes on?', opts: ['Call PutLifecycleEventHookExecutionStatus with Succeeded', 'Return 200', 'Nothing'], a: 0,
        why: 'The hook reports its result to CodeDeploy; until it does, the deployment waits, and then fails.' }],
    done: '100%. Her version is gone. Every ward records everyone now, staff included. Somewhere above, the clock\'s hands come together.'
  };
  // The Lina's Voice cipher.
  DEF.cipher = {
    title: 'LINA\'S VOICE · THE LAST PAGES',
    intro: 'The diary\'s last pages are in a cipher Dutch can\'t read: Lina built her own on top of his, with a key word. Each letter is shifted on by the next letter of the key. Seo-yeon has heard him say one word a hundred times.',
    text: 'I TURNED ON THE WARD ON THE STAFF STAIR. DONT TELL HIM I SAID HE WOULD BE GOOD AT THIS',
    key: 'WOBBLE',
    hints: ['"Sit. No, the other chair..."', 'The one that does what? Six letters.', 'It starts with W and ends with E.'],
    done: 'WOBBLE. From the chair he makes everyone sit in. The page reads itself.'
  };
})();
