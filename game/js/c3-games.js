// The minigames of chapter 3's overworld (js/c3-world.js). Each one opens with a prediction you make before you
// see the answer, then lets you play it out ("predict, then play"); some ask for a typed number or explanation.
//   receipts   the cold open: Hana sorts Kai's receipts into drawer, shoebox, attic and shredder (storage classes)
//   gate       the granary gate: four kinds of grain, four storage classes, and a minimum stay (knowledge gate)
//   thaw       the Cold Stores yard: a sack frozen in Deep Archive, and how long it takes to come back
//   breadLine  Doug and Kevin: pick a partition key for the barrier's ration ledger, predict its heat, watch Kevin
//   cacheRush  Wen: be the cache in front of the ration office, then decide which reads may come from it
//   shipIt     the camp terminal: versions, aliases, and a SAM stack that goes to test first (fewer hints)
//   register   the bottom of the Abyss: model the Saints' table so every question is a Query
//   echoes     Sir Aurelian: route the cathedral's requests to the writer or a replica
//   board      the Design Board: draw Halcyon's ration office, load-test it, answer the interviewer
//   evidence   the gallery: three proofs against Selvaria
//   why        after an expedition: Pip's "why did that work?", typed in your own words
//   page       a page of Hana's speech: one quick question from the chapter's bank
// AWS facts follow the current AWS documentation. Every question here is written fresh.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const U = SD.ui, S = SD.state, AU = SD.audio, Q = SD.quiz;
  const G = SD.c3games = {};
  const esc = s => U.esc(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  const css = document.createElement('style');
  css.textContent = `
.g3 .bins { display: flex; gap: 6px; flex-wrap: wrap; }
.g3 .bins button { min-height: 44px; padding: 6px 10px; font-size: 13px; }
.g3 .bins button.on { background: var(--blue); color: #fff; }
.g3 .row3 { border-top: 1px solid rgba(255,255,255,.12); padding: 8px 0; }
.g3 .row3 > span { display: block; margin-bottom: 6px; }
.g3 .why3 { font-size: 12px; margin: 6px 0 0; } .g3 .why3.ok { color: #7fe0a0; } .g3 .why3.bad { color: #ff9aa8; }
.g3-heat { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; align-items: end; height: 96px; margin: 10px 0 4px; padding: 0 2px; }
.g3-heat i { display: block; background: #7fe0a0; border-radius: 3px 3px 0 0; height: 4%; transition: height .5s, background .5s; }
.g3-heat i.hot { background: #ff6a5a; } .g3-heat i.warm { background: #ffd24a; }
.g3-heatl { display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px; font: 10px ui-monospace, monospace; color: #b7b0cc; text-align: center; }
.g3-kev { font: 12px/1.4 ui-monospace, monospace; background: #1d1b2a; color: #d9e6ff; padding: 6px 8px; border-radius: 8px; min-height: 2.8em; white-space: pre-wrap; }
.g3-ord { display: flex; flex-direction: column; gap: 6px; } .g3-ord .opt { text-align: left; min-height: 44px; }
.g3-ord .opt.done { opacity: .5; } .g3-seq { font: 12px/1.5 ui-monospace, monospace; color: #7fe0a0; margin: 6px 0; white-space: pre-wrap; }
.g3-shelf { display: flex; gap: 6px; margin: 6px 0; } .g3-shelf span { flex: 1; text-align: center; padding: 6px 2px; border-radius: 6px; background: #3a2e28; color: #ffe0b0; font: 12px ui-monospace, monospace; min-height: 1.6em; }
.g3-board { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin: 8px 0; }
.g3-board .cell { background: #24303a; border-radius: 8px; padding: 6px 8px; font-size: 12px; color: #e8f0f8; min-height: 44px; }
.g3-board .cell b { display: block; color: #ffd24a; font-size: 11px; letter-spacing: .05em; }
.g3-board .cell.ok { box-shadow: inset 0 0 0 2px #7fe0a0; } .g3-board .cell.bad { box-shadow: inset 0 0 0 2px #ff6a7a; }
.g3 .opt { min-height: 44px; }
.g3 .g2-predict b { color: #6e4700; }
/* Phone pass: the panels are parchment, so the feedback lines and labels need dark ink to be read at arm's length. */
.g3 .why3.ok, .g3 .g2-note.ok, .g3-seq { color: #17582d; } .g3 .why3.bad { color: #a3242f; }
.g3 .why3 { font-size: 13px; font-weight: 600; }
.g3 .row3 { border-top-color: rgba(43,35,64,.18); }
.g3-heatl { font-size: 12px; color: #4a4458; }
.g3-board .cell b { font-size: 12px; }
/* After a pick, the right answer stays solid with a green edge, so you can see which it was. */
.g3 .opt.on:disabled { opacity: 1; box-shadow: inset 0 0 0 2px #2c8a4b, 0 3px 0 rgba(43,35,64,.5); }
.g3 p.small { font-size: 13px; }
.g3 .bins { display: grid; grid-template-columns: repeat(auto-fit, minmax(68px, 1fr)); } .g3 .bins button { padding: 6px 4px; font-family: var(--f-body); font-variant: normal; text-transform: none; letter-spacing: 0; font-weight: 700; font-size: 14px; }
#stage .g3-back { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; image-rendering: pixelated; }
`;
  document.head.appendChild(css);

  function note(el, text, ok) { const n = el.querySelector('.g2-note'); if (!n) return; n.textContent = text; n.className = 'g2-note ' + (ok ? 'ok' : 'bad'); seen(n); }
  // Feedback for a tap can land below the fold on a phone: scroll it into view.
  const seen = el => { if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' }); };
  const cont = (b, label) => new Promise(res => {
    const go = document.createElement('button'); go.className = 'primary'; go.textContent = label || 'Continue';
    b.appendChild(go); go.focus(); go.onclick = () => { U.closePanel(); res(); };
  });
  // A cutscene backdrop behind a minigame (the stage, js/ui.js), so it doesn't sit over the last screen.
  G.backdrop = id => { U.stageDecor = U.stageDecor || {}; const src = K.scenes && K.scenes[id]; if (!src) return; U.stageDecor['g3-' + id] = `<img class="g3-back" src="${src}" alt="">`; U.stage('g3-' + id); };
  const panel = (title, html) => U.panel(`<div class="g2 g3">${html}</div>`, { title, noClose: true, cls: 'wide' }).querySelector('.g3');
  // A prediction: pick one, see whether it was right and why. Resolves true if it was.
  function predict(b, p, concept) {
    return new Promise(res => {
      const box = document.createElement('div'); box.className = 'g2-predict';
      box.innerHTML = `<b>PREDICT FIRST</b><p>${esc(p.q)}</p><div class="opts col">${Q.shuffle(p.opts.map((o, i) => i)).map(i => `<button class="opt" data-p="${i}">${esc(p.opts[i].t)}</button>`).join('')}</div><p class="g2-note"></p>`;
      b.appendChild(box);
      box.querySelectorAll('[data-p]').forEach(el => el.onclick = () => {
        const o = p.opts[+el.dataset.p];
        box.querySelectorAll('[data-p]').forEach(x => { x.disabled = true; if (p.opts[+x.dataset.p].ok) x.classList.add('on'); });
        S.recordAnswer(concept, !!o.ok, 1, 15000);
        AU.sfx(o.ok ? 'right' : 'wrong');
        note(box, (o.ok ? 'Right. ' : (o.no || 'Not quite.') + ' ') + p.why, !!o.ok);
        res(!!o.ok);
      });
    });
  }
  // One question with options: a wrong pick is struck out with why, and you try again. Resolves true if the first
  // pick was right.
  function pick(b, s, concept) {
    return new Promise(res => {
      const box = document.createElement('div');
      box.innerHTML = `<p class="vn-q"><b>${esc(s.q)}</b></p><div class="opts col">${Q.shuffle(s.opts.map((x, i) => i)).map(i => `<button class="opt" data-o="${i}">${esc(s.opts[i].t)}</button>`).join('')}</div><p class="g2-note"></p>`;
      b.appendChild(box);
      box.scrollIntoView && box.scrollIntoView({ block: 'nearest' });
      let first = null;
      box.querySelectorAll('[data-o]').forEach(el => el.onclick = () => {
        const x = s.opts[+el.dataset.o];
        if (first === null) { first = !!x.ok; S.recordAnswer(concept, first, 1, 15000); }
        if (!x.ok) { el.disabled = true; note(box, x.no, false); AU.sfx('wrong'); return; }
        box.querySelectorAll('[data-o]').forEach(y => { y.disabled = true; });
        el.classList.add('on');
        note(box, x.out || s.out || 'Right.', true); AU.sfx('right');
        res(first);
      });
    });
  }
  // Sort each row into one of the bins; resolves the number right first time. Wrong rows show why and stay open.
  function sort(b, s, concept) {
    return new Promise(res => {
      const order = Q.shuffle(s.rows.map((r, i) => i));
      const box = document.createElement('div');
      box.innerHTML = `<p class="vn-q"><b>${esc(s.q)}</b></p>${order.map(i => `<div class="row3" data-r="${i}"><span>${esc(s.rows[i].t)}</span><div class="bins">${s.bins.map((n, j) => `<button class="ghost" data-i="${i}" data-v="${j}">${esc(n)}</button>`).join('')}</div><p class="why3"></p></div>`).join('')}<p class="g2-note"></p>`;
      b.appendChild(box);
      const done = {}; let right = 0;
      box.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {
        const i = +el.dataset.i, r = s.rows[i], v = +el.dataset.v, row = box.querySelector(`[data-r="${i}"]`), why = row.querySelector('.why3');
        if (done[i]) return;
        const ok = v === r.v;
        if (done[i] === undefined) { if (ok) right++; S.recordAnswer(concept, ok, 1, 8000); }
        if (!ok) { done[i] = false; el.disabled = true; why.textContent = r.no || r.why; why.className = 'why3 bad'; seen(why); AU.sfx('wrong'); return; }
        done[i] = true;
        row.querySelectorAll('button').forEach(x => { x.disabled = true; x.classList.toggle('on', x === el); });
        why.textContent = r.why; why.className = 'why3 ok'; seen(why); AU.sfx('right');
        if (Object.values(done).filter(Boolean).length === s.rows.length) { note(box, s.out || `${right} of ${s.rows.length} right first time.`, right >= s.rows.length - 1); res(right); }
      });
    });
  }
  // Tap the steps in the right order; a wrong tap says why and doesn't count. Resolves the number of wrong taps.
  function order(b, s, concept) {
    return new Promise(res => {
      const sh = Q.shuffle(s.steps.map((x, i) => i));
      const box = document.createElement('div');
      box.innerHTML = `<p class="vn-q"><b>${esc(s.q)}</b></p><pre class="g3-seq"></pre><div class="g3-ord">${sh.map(i => `<button class="opt" data-s="${i}">${esc(s.steps[i].t)}</button>`).join('')}</div><p class="g2-note"></p>`;
      b.appendChild(box);
      let next = 0, miss = 0;
      const seq = box.querySelector('.g3-seq');
      box.querySelectorAll('[data-s]').forEach(el => el.onclick = () => {
        const i = +el.dataset.s;
        if (i !== next) { miss++; note(box, s.steps[i].early || s.hint || 'Not yet. What has to be true before that?', false); AU.sfx('wrong'); return; }
        next++; el.disabled = true; el.classList.add('done'); AU.sfx('ok');
        seq.textContent += `${next}. ${s.steps[i].t}\n`;
        note(box, s.steps[i].why || '', true);
        if (next === s.steps.length) { S.recordAnswer(concept, miss <= 1, 1, 20000); res(miss); }
      });
    });
  }
  // A typed number, on the quiz's own screen (so it's recorded and gets its ELI5).
  const num = (q, title) => Q.ask(Object.assign({ type: 'num' }, q), { title: title || 'WORK IT OUT' });

  // ---------- The cold open: Hana and the receipts ----------
  G.receipts = async function () {
    S.seeConcept('s3class');
    const b = panel('TAX SEASON', `<p>Kai's kitchen table, our world, a year and a half ago. A shoebox of receipts, and Hana with a pen behind her ear. "Four piles, idiot. Where does each one go?"</p>`);
    const p = await predict(b, { q: 'Hana: "The bills you\'ll check every week go in the drawer. Where do the ones the taxman might ask for, once, in seven years, go?"',
      opts: [{ t: 'The attic: cheap to keep, slow to get back, and that\'s fine', ok: true }, { t: 'The drawer, so they\'re always to hand', no: 'The drawer is the most expensive space in the flat. You\'d be paying for "to hand" every day for seven years.' }, { t: 'The shredder: nobody will ever ask', no: 'Somebody always asks. That\'s why you keep them.' }],
      why: 'Where something lives should follow how often you need it and how fast. S3 works the same way: S3 Standard for what\'s read often, the Glacier classes for what\'s kept for years and rarely read.' }, 's3class');
    const n = await sort(b, { q: 'Sort the shoebox.', bins: ['Drawer', 'Shoebox', 'Attic', 'Shred'],
      rows: [{ t: 'This month\'s gas bill', v: 0, why: 'Read every week: the drawer (S3 Standard).' },
        { t: 'Last year\'s payslips: the bank wants them maybe once', v: 1, why: 'Rarely read, but wanted at once when they are: the shoebox (Standard-IA).' },
        { t: 'Receipts for the tax years before last', v: 2, why: 'Kept for years, almost never read, a day\'s wait is fine: the attic (Glacier Deep Archive).' },
        { t: 'A receipt from 2016, past its seven years', v: 3, why: 'Past its retention period: expire it (a lifecycle rule\'s expiration).' }],
      out: 'Hana: "Look at that. A system. You could run a restaurant like this." Kai: "I have run a restaurant." "Into the ground, boss."' }, 's3class');
    await cont(b, 'Floss, apparently');
    return { ok: p && n >= 3 };
  };

  // ---------- The granary gate ----------
  G.gate = async function () {
    S.seeConcept('s3class');
    const b = panel('THE GRANARY GATE', `<p>A gatekeeper with a slate. "Nobody goes into the stores who can't tell grain from grain. Four sacks. Where do they go?"</p>`);
    await predict(b, { q: 'A sack of seed corn, needed once a year at planting, and needed in minutes when it is. Which class?',
      opts: [{ t: 'S3 Glacier Instant Retrieval: rarely read, but read in milliseconds', ok: true }, { t: 'S3 Glacier Deep Archive: the cheapest', no: 'Deep Archive is cheapest to keep, but a restore takes up to 12 hours (48 for Bulk). Planting won\'t wait.' }, { t: 'S3 Standard: it\'s important', no: 'Important isn\'t the same as often read. Standard costs the most to keep, every month.' }],
      why: 'Glacier Instant Retrieval is for data read about once a quarter that must come back at once. You pay more per read and less to store it.' }, 's3class');
    const n = await sort(b, { q: 'Shelve the rest.', bins: ['Standard', 'Standard-IA', 'Deep Archive', 'Intelligent-Tiering'],
      rows: [{ t: 'Today\'s bread flour: the bakers draw on it all day', v: 0, why: 'Read constantly: S3 Standard has no retrieval fee and no minimum stay.' },
        { t: 'The winter reserve: drawn on a few times a year, at once when it is', v: 1, why: 'Infrequent but immediate: Standard-IA, with its 30-day minimum and retrieval fee.' },
        { t: 'The founding harvest, kept by law, never touched', v: 2, why: 'Kept for years, almost never read: Deep Archive.' },
        { t: 'A new grain nobody knows the demand for yet', v: 3, why: 'Unknown access pattern: Intelligent-Tiering moves it between tiers for a small monitoring fee per object.' }] }, 's3class');
    const r = await num({ c: 's3class', q: 'One last thing. A sack goes into Standard-IA and is moved out after 3 days. For how many days of storage is it billed?', unit: 'days', lo: 30, hi: 30, ans: '30 days',
      why: 'Standard-IA (and One Zone-IA) bill a minimum of 30 days. Moving or deleting an object earlier still costs the rest of the 30.',
      eli5: 'It\'s an inn that charges a month\'s rent the moment you check in. Leave after three nights and you\'ve still paid for thirty.' }, 'THE GATEKEEPER');
    return { ok: n >= 3 && !!(r && r.ok) };
  };

  // ---------- The Cold Stores yard: a frozen sack ----------
  G.thaw = async function () {
    S.seeConcept('s3class');
    const b = panel('A FROZEN SACK', `<p>A sack sealed in ice, tagged <b>DEEP ARCHIVE · founding grain</b>. A clerk wants one handful for the cathedral by tomorrow, and wants it cheap.</p>`);
    await predict(b, { q: 'Can the clerk just open the sack and take a handful?',
      opts: [{ t: 'No: it has to be restored first, and the restore makes a temporary copy', ok: true }, { t: 'Yes: Deep Archive reads come back in milliseconds', no: 'That\'s Glacier Instant Retrieval. Deep Archive objects must be restored before they can be read.' }, { t: 'No: it has to be copied to a new bucket', no: 'A restore is a request on the object itself, not a copy to another bucket.' }],
      why: 'An object in Deep Archive can\'t be read until you restore it. The restore makes a temporary readable copy for the number of days you ask for.' }, 's3class');
    const ok1 = await pick(b, { q: 'By tomorrow, as cheap as possible. Which retrieval tier?', opts: [
      { t: 'Bulk: the cheapest, typically within 48 hours', no: 'Cheapest, but 48 hours misses tomorrow.' },
      { t: 'Standard: typically within 12 hours', ok: true, out: 'Standard retrieval from Deep Archive comes back within 12 hours. Bulk is cheaper but takes up to 48.' },
      { t: 'Expedited: a few minutes', no: 'Deep Archive doesn\'t offer Expedited retrieval. That\'s Glacier Flexible Retrieval.' }] }, 's3class');
    await cont(b, 'Thaw it');
    const r = await num({ c: 's3class', q: 'Within how many hours does a Standard retrieval from S3 Glacier Deep Archive typically complete?', unit: 'hours', lo: 12, hi: 12, ans: '12 hours',
      why: 'Deep Archive: Standard retrieval typically within 12 hours, Bulk within 48. Its minimum storage duration is 180 days.',
      eli5: 'The deepest freezer in the stores. Ask for something and the porters go down overnight: half a day if you pay normal rates, two days if you let them bring it with the bulk run.' }, 'THE CLERK');
    return { ok: ok1 && !!(r && r.ok) };
  };

  // ---------- Doug and Kevin: the Bread Line ----------
  // The ration ledger's partition key, and Kevin hitting it. Each key's heat over ten partitions.
  G.breadLine = async function () {
    S.seeConcept('ddbkey');
    const b = panel('THE BREAD LINE', `<p>Doug: "Kevin's been throttled again. He's the ration office's bot: every citizen asks him for their ration, every morning, and he writes it to the barrier's ledger." Kevin: "THROTTLED." Doug: "He says that a lot."</p>
      <div class="g3-heat">${'<i></i>'.repeat(10)}</div><div class="g3-heatl">${Array.from({ length: 10 }, (_, i) => `<span>P${i + 1}</span>`).join('')}</div><pre class="g3-kev">Kevin: READY.</pre>`);
    const bars = [...b.querySelectorAll('.g3-heat i')], kev = b.querySelector('.g3-kev');
    const heat = async (dist, text) => {
      const mx = Math.max(...dist);
      bars.forEach((el, i) => { const v = dist[i] / mx; el.style.height = Math.max(4, v * 100) + '%'; el.className = v > 0.8 && mx > 30 ? 'hot' : v > 0.5 && mx > 30 ? 'warm' : ''; });
      kev.textContent = text; AU.sfx(mx > 30 ? 'hurt' : 'ok'); await wait(700);
    };
    const KEYS = {
      day: { t: 'The date: "2026-10-21"', dist: [100, 0, 0, 0, 0, 0, 0, 0, 0, 0], kev: 'Kevin: THROTTLED. THROTTLED. Every ration today is one key. One partition takes all of it.' },
      saint: { t: 'The Saint: "SAINT#12"', dist: [0, 0, 0, 0, 0, 100, 0, 0, 0, 0], kev: 'Kevin: THROTTLED. Every write lands on one girl\'s key. That\'s the barrier, Doug.' },
      ward: { t: 'The ward: one of 6 wards', dist: [34, 0, 22, 0, 18, 0, 0, 26, 0, 0], kev: 'Kevin: THROTTLED (SOMETIMES). Six keys, and the big ward runs hot.' },
      citizen: { t: 'The citizen\'s ID: one of 100,000', dist: [10, 11, 9, 10, 10, 11, 9, 10, 10, 10], kev: 'Kevin: OK. OK. OK. OK. Doug, is this what OK feels like?' }
    };
    const p = await predict(b, { q: 'Kevin writes 100,000 rations every morning. Which key spreads them most evenly across partitions?',
      opts: [{ t: KEYS.citizen.t, ok: true }, { t: KEYS.day.t, no: 'Every write that morning has the same date, so every write goes to one partition.' }, { t: KEYS.ward.t, no: 'Six values is better than one, but it\'s still few, and the wards aren\'t the same size.' }],
      why: 'A partition key with many distinct values, used about evenly, spreads reads and writes across partitions. Each partition has its own limit (about 1,000 writes a second), so one hot key is throttled however much capacity the table has.' }, 'ddbkey');
    // Then watch Kevin hit each key, ending with the one you'd ship.
    const box = document.createElement('div');
    box.innerHTML = '<p class="vn-q"><b>Try a key and watch Kevin hit it. Ship the one that keeps him OK.</b></p><div class="opts col">' + Object.keys(KEYS).map(k => `<button class="opt" data-k="${k}">${esc(KEYS[k].t)}</button>`).join('') + '</div><p class="g2-note"></p>';
    b.appendChild(box);
    const tried = new Set();
    await new Promise(res => box.querySelectorAll('[data-k]').forEach(el => el.onclick = async () => {
      const k = el.dataset.k; tried.add(k); box.querySelectorAll('[data-k]').forEach(x => x.disabled = true);
      await heat(KEYS[k].dist, KEYS[k].kev);
      if (k === 'citizen') { note(box, 'Shipped. A hundred thousand keys, each a little warm, none hot.', true); return res(); }
      note(box, 'Kevin is throttled. Try another key.', false);
      box.querySelectorAll('[data-k]').forEach(x => { x.disabled = tried.has(x.dataset.k); });
    }));
    const s1 = await pick(b, { q: 'The Saint\'s Day tally still has to land on one key: "TALLY#SAINTSDAY". Doug shards it as TALLY#SAINTSDAY#1 to #10. The cathedral reads one citizen\'s tally by ID. How should each write pick its suffix?', opts: [
      { t: 'From a hash of the citizen\'s ID, so a reader can work out the same suffix', ok: true, out: 'A calculated suffix spreads the writes and still lets a reader go straight to one shard.' },
      { t: 'At random, every write', no: 'That spreads the writes too, but then reading one citizen\'s tally means asking all ten shards.' },
      { t: 'Always #1, to keep it simple', no: 'One suffix is one key again: back to one hot partition.' }] }, 'ddbkey');
    const s2 = await pick(b, { q: 'Next month Kevin is throttled again, and nobody knows which key. What finds it?', opts: [
      { t: 'CloudWatch Contributor Insights for DynamoDB: the most-accessed and most-throttled keys', ok: true, out: 'Contributor Insights shows the table\'s most accessed and most throttled partition keys, so the hot one stands out.' },
      { t: 'A Scan of the table, counting', no: 'A Scan reads every item, costs capacity, and tells you what\'s stored, not what\'s being hit.' },
      { t: 'Turn on DynamoDB Streams and read them by hand', no: 'A stream shows changes, not throttling, and only for writes.' }] }, 'ddbkey');
    const s3 = await pick(b, { q: 'The ledger takes the same, predictable load every morning, all year. Which capacity mode is cheaper?', opts: [
      { t: 'Provisioned, with auto scaling', ok: true, out: 'For steady, predictable traffic provisioned capacity with auto scaling usually costs less. On-demand earns its price on spiky or unknown traffic.' },
      { t: 'On-demand, always', no: 'On-demand is simplest and follows spikes, but for steady load you pay more per request than provisioned would cost.' },
      { t: 'Whichever has more burst capacity', no: 'Burst capacity is a short buffer of unused capacity, not a pricing choice.' }] }, 'ddbkey');
    await cont(b, 'Kevin: OK');
    return { ok: p && s1 && s2 && s3 };
  };

  // ---------- Wen: Cache Rush, again ----------
  G.cacheRush = async function () {
    S.seeConcept('caching');
    const b = panel('CACHE RUSH, AGAIN', `<p>Wen: "Same as the old days, dear. You're the shelf in front of the ration office. If it's on the shelf, hand it over. If it isn't, go to the granary and put a copy on the shelf on the way back."</p><div class="g3-shelf"><span></span><span></span><span></span></div>`);
    const p = await predict(b, { q: 'Wen\'s way: look on the shelf first, fetch from the granary on a miss and shelve a copy. What\'s it called?',
      opts: [{ t: 'Cache-aside (lazy loading)', ok: true }, { t: 'Write-through', no: 'Write-through updates the cache every time you write the database, whether anyone asks or not.' }, { t: 'A read replica', no: 'A replica is a second copy of the whole database, not a shelf of what was asked for.' }],
      why: 'Cache-aside: the app checks the cache, and on a miss reads the database and fills the cache. Only what\'s asked for gets cached, and a miss costs one extra trip.' }, 'caching');
    const n = await sort(b, { q: 'The morning rush. Which may Wen hand over from the shelf?', bins: ['From the shelf', 'From the granary'],
      rows: [{ t: 'Today\'s bread price, asked a thousand times an hour', v: 0, why: 'Read often, changes rarely: exactly what a cache is for.' },
        { t: 'A citizen\'s ration balance, the moment after he collected', v: 1, why: 'He needs to see his own write. A cached copy could still show the old balance.' },
        { t: 'The list of tomorrow\'s bakers, with a 5-minute TTL', v: 0, why: 'A TTL bounds how stale it can be. Five minutes is fine for tomorrow.' },
        { t: 'Whether the granary has grain left, for a sale', v: 1, why: 'Selling what you don\'t have is worse than a slow answer: read the source.' }] }, 'caching');
    const s1 = await pick(b, { q: 'The ration ledger is a DynamoDB table, read in microseconds by thousands. Which cache sits in front of it with almost no code change?', opts: [
      { t: 'DAX: an API-compatible, write-through cache for DynamoDB', ok: true, out: 'DAX speaks the DynamoDB API, so the app swaps its client and gets microsecond reads.' },
      { t: 'ElastiCache for Memcached', no: 'That works, but the app has to do the caching itself: cache-aside code around every read.' },
      { t: 'CloudFront', no: 'CloudFront caches HTTP responses at the edge, not DynamoDB items.' }] }, 'caching');
    const s2 = await pick(b, { q: 'Wen needs sorted leaderboards of who baked most, and the shelf must survive a node failing. Which engine?', opts: [
      { t: 'ElastiCache for Valkey or Redis OSS: sorted sets, replication and failover', ok: true, out: 'Redis OSS and Valkey have data structures like sorted sets, replicas and automatic failover. Memcached is simpler and multithreaded, with none of those.' },
      { t: 'ElastiCache for Memcached', no: 'Memcached is a simple key-value cache: no sorted sets, no replication.' },
      { t: 'DAX', no: 'DAX caches DynamoDB items and queries. It has no leaderboards.' }] }, 'caching');
    const s3 = await pick(b, { q: 'The first loaf of the morning is always slow: the ration function wakes cold. What warms the oven?', opts: [
      { t: 'Provisioned concurrency on the function\'s alias', ok: true, out: 'Provisioned concurrency keeps execution environments initialized and ready, so the first requests skip the cold start.' },
      { t: 'Reserved concurrency', no: 'Reserved concurrency caps and guarantees how many can run. It doesn\'t keep any warm.' },
      { t: 'More memory and a longer timeout', no: 'More memory can speed the start up a little, but it still starts cold.' }] }, 'caching');
    b.querySelectorAll('.g3-shelf span').forEach((el, i) => { el.textContent = ['bread price', 'bakers', 'warm oven'][i]; });
    await cont(b, 'Warm the oven');
    return { ok: p && n >= 3 && s1 && s2 && s3 };
  };

  // ---------- The camp terminal: Ship It ----------
  G.shipIt = async function () {
    S.seeConcept('lambdaver');
    const b = panel('SHIP IT', `<p>The granary function. Its alias <b>live</b> points at version 3. Version 4 fixes the grate's lift. Fewer hints this time: Pip is busy.</p>
      <pre class="g2-log" style="height:auto">granary-fn  $LATEST (edited)\n  versions: 1, 2, 3\n  aliases:  live → 3</pre>`);
    const p = await predict(b, { q: 'You publish version 4. Can you still change its code?',
      opts: [{ t: 'No: a published version is immutable; you change $LATEST and publish again', ok: true }, { t: 'Yes, until an alias points at it', no: 'Versions are immutable from the moment they\'re published.' }, { t: 'Yes, but only its environment variables', no: 'A version\'s code and configuration are both locked.' }],
      why: 'Publishing takes a snapshot of $LATEST\'s code and settings as a numbered version that never changes. Aliases are the movable part.' }, 'lambdaver');
    const m1 = await order(b, { q: 'Ship version 4 without breaking the grate for anyone.', hint: 'Not yet.',
      steps: [{ t: 'Publish version 4 from $LATEST', why: 'Version 4 now exists, and nothing points at it.' },
        { t: 'Point a test alias at version 4', why: 'test → 4. live still → 3.' },
        { t: 'Run the grate\'s tests against the test alias', why: 'They pass.' },
        { t: 'Move live from version 3 to version 4', why: 'live → 4. Anyone calling granary-fn:live gets the fix; nobody saw a broken one.' }] }, 'lambdaver');
    const m2 = await order(b, { q: 'Now the same change as a SAM stack: the function, its alias and the grate\'s queue.', hint: 'Not yet.',
      steps: [{ t: 'sam build', why: 'Built.' }, { t: 'sam deploy to the test stack, with the test environment\'s parameters', why: 'The test stack has its own table and its own queue, named by its own parameters.' },
        { t: 'Check the test stack works', why: 'It does.' }, { t: 'sam deploy to the live stack, with the live parameters', why: 'Same template, different parameters: the live stack gets exactly what was tested.' }] }, 'lambdaver');
    const s = await pick(b, { q: 'Doug wants only 10% of grate calls on version 4 for an hour first. How?', opts: [
      { t: 'A weighted alias: live points at 3 with 10% routed to 4', ok: true, out: 'An alias can split traffic between two versions by weight. That\'s how a canary works under SAM\'s DeploymentPreference too.' },
      { t: 'Two functions and a coin', no: 'One alias can do it: a routing configuration with a weight on the second version.' },
      { t: 'Point live at $LATEST', no: '$LATEST changes whenever someone edits it. live should point at a tested, published version.' }] }, 'lambdaver');
    await cont(b, 'Ship it');
    return { ok: p && m1 <= 1 && m2 <= 1 && s };
  };

  // ---------- The bottom of the Abyss: the Saints' Register ----------
  G.register = async function () {
    S.seeConcept('ddbindex');
    const b = panel('THE SAINTS\' REGISTER', `<p>Scratched on the wall at the bottom of the Abyss: every Saint, the night she was crowned, the night she burned out, the Hero who drew from her. Mother Ash: "The cathedral asks it three questions. Make every one a Query, boy, or you'll be reading the whole wall."</p>`);
    const p = await predict(b, { q: 'The register\'s table: partition key Saint, sort key Night. "Every night Saint Seven was drawn from, newest first." Query or Scan?',
      opts: [{ t: 'Query: one partition key, sorted by the sort key, read backwards', ok: true }, { t: 'Scan with a filter on Saint', no: 'A Scan reads the whole table and filters afterwards; you pay for every item read, not just the ones kept.' }, { t: 'GetItem', no: 'GetItem fetches one item by its full key. This wants every night for one Saint.' }],
      why: 'A Query reads one partition key\'s items in sort-key order, forwards or backwards (ScanIndexForward false). A Scan reads everything and a filter only throws items away after you\'ve paid to read them.' }, 'ddbindex');
    const s1 = await pick(b, { q: '"Every Saint a given Hero drew from." The Hero isn\'t in the key. What makes it a Query?', opts: [
      { t: 'A global secondary index with Hero as its partition key', ok: true, out: 'A GSI can have any partition key, can be added at any time, and has its own capacity. Its reads are eventually consistent.' },
      { t: 'A local secondary index with Hero as its partition key', no: 'An LSI keeps the table\'s partition key; only the sort key changes. And it has to be made when the table is.' },
      { t: 'A Scan with FilterExpression Hero = :h', no: 'Still a Scan: every item is read and paid for.' }] }, 'ddbindex');
    const s2 = await pick(b, { q: '"One Saint\'s nights, sorted by how much was drawn." Same Saint, different order. The table already exists.', opts: [
      { t: 'A GSI on Saint and Drawn, because an LSI can only be made with the table', ok: true, out: 'An LSI (same partition key, another sort key) would fit, but LSIs are made when the table is created. Now, it has to be a GSI.' },
      { t: 'Add an LSI on Saint and Drawn', no: 'LSIs can only be created with the table. This one is three hundred years old.' },
      { t: 'Sort the Query\'s results in the app', no: 'That works for a small result, but the question was how to make the order a Query.' }] }, 'ddbindex');
    const s3 = await pick(b, { q: 'The index only needs Saint, Hero and Night. What should it project?', opts: [
      { t: 'Just those attributes (INCLUDE), so the index stays small and cheap', ok: true, out: 'Projecting only what the query needs keeps index storage and writes down. ALL copies every attribute.' },
      { t: 'ALL attributes, to be safe', no: 'ALL works, but every write to the table copies the whole item into the index too, and you pay for that.' },
      { t: 'Nothing: the index looks the rest up in the table for free', no: 'A GSI can\'t fetch unprojected attributes from the table; you\'d need another read.' }] }, 'ddbindex');
    await cont(b, 'Ash: "Not bad. For a cook."');
    return { ok: p && s1 && s2 && s3 };
  };

  // ---------- Sir Aurelian: Echoes ----------
  G.echoes = async function () {
    S.seeConcept('rdsaurora');
    const b = panel('ECHOES', `<p>Sir Aurelian, without his armour, in the dark by the fire: "The cathedral's records are an Aurora cluster. One writer, two replicas in the choir loft. They sing a beat behind. Route each request, and tell me which ones hear an old verse."</p>`);
    const p = await predict(b, { q: 'A clerk writes a Saint\'s record and reads it straight back through the reader endpoint. What does he see?',
      opts: [{ t: 'Possibly the old version: replicas lag the writer a little', ok: true }, { t: 'Always the new version: Aurora replicas are synchronous', no: 'Aurora replicas share the storage, so lag is usually milliseconds, but it isn\'t zero.' }, { t: 'An error: replicas can\'t be read', no: 'Read replicas exist to be read. It\'s the Multi-AZ standby of an RDS instance that can\'t be.' }],
      why: 'Replicas apply the writer\'s changes asynchronously. Aurora\'s lag is usually under 100 milliseconds, RDS read replicas\' can be seconds or more. Read-your-own-write goes to the writer.' }, 'rdsaurora');
    const n = await sort(b, { q: 'Route the cathedral\'s requests.', bins: ['Writer', 'A replica'],
      rows: [{ t: 'Record tonight\'s Drawing', v: 0, why: 'Writes only go to the writer.' },
        { t: 'The choir\'s hymn list for next month', v: 1, why: 'Read-heavy and fine a beat behind: a replica takes the load off the writer.' },
        { t: 'Show the clerk the record he just wrote', v: 0, why: 'He must see his own write. A replica may not have it yet.' },
        { t: 'A historian\'s report on three hundred years of Saints', v: 1, why: 'A long read that shouldn\'t slow the writer down.' }] }, 'rdsaurora');
    const s1 = await pick(b, { q: 'A hundred functions each open a connection to the cathedral\'s database on Saint\'s Day, and it runs out. What fixes it?', opts: [
      { t: 'RDS Proxy: it pools and shares connections', ok: true, out: 'RDS Proxy keeps a pool of database connections and shares them among many short-lived function invocations.' },
      { t: 'A read replica', no: 'A replica takes reads off the writer, but every function still opens its own connection.' },
      { t: 'Multi-AZ', no: 'Multi-AZ is for failover. The standby takes no connections.' }] }, 'rdsaurora');
    const s2 = await pick(b, { q: 'The writer\'s Availability Zone goes dark. What keeps the records writable?', opts: [
      { t: 'Failover: a replica (Aurora) or the Multi-AZ standby (RDS) is promoted', ok: true, out: 'Aurora promotes a replica to writer, usually within about 30 seconds; an RDS Multi-AZ instance fails over to its standby. The endpoint stays the same.' },
      { t: 'Point-in-time restore', no: 'A restore makes a new instance from backups. It\'s for mistakes, not outages, and it takes much longer.' },
      { t: 'Nothing: wait for the zone', no: 'That\'s exactly what Multi-AZ and replicas are for.' }] }, 'rdsaurora');
    await cont(b, 'Aurelian: "Thank you."');
    return { ok: p && n >= 3 && s1 && s2 };
  };

  // ---------- The Design Board ----------
  G.board = async function () {
    S.seeConcept('caching'); S.seeConcept('ddbkey');
    const CELLS = [
      { k: 'reads', b: 'READS', q: 'Ten thousand citizens read today\'s ration every morning.', opts: [{ t: 'Through a cache (DAX)', ok: true }, { t: 'Straight to the table, strongly consistent', no: 'Every read at full price, and twice the capacity of an eventually consistent one.' }] },
      { k: 'writes', b: 'WRITES', q: 'Each citizen collects once a day.', opts: [{ t: 'Partition key: citizen ID', ok: true }, { t: 'Partition key: the Saint', no: 'One key for everyone: the barrier\'s mistake, as a table.' }] },
      { k: 'find', b: 'QUESTIONS', q: '"Every ration a ward took this week."', opts: [{ t: 'A GSI on ward and date, then Query', ok: true }, { t: 'Scan the table, filter by ward', no: 'Nothing scans on Saint\'s Day.' }] },
      { k: 'rel', b: 'RECORDS', q: 'The ration function writes to the cathedral\'s relational records.', opts: [{ t: 'Through RDS Proxy', ok: true }, { t: 'A new connection each call', no: 'A hundred functions, a hundred connections, and the database falls over.' }] }
    ];
    const b = panel('THE DESIGN BOARD', `<p>Pip: "Draw Halcyon's ration office. Then we load-test it with Saint's Day." Kai: "Fine. But I'm drawing it, not taking it apart."</p><div class="g3-board">${CELLS.map(c => `<div class="cell" data-c="${c.k}"><b>${c.b}</b><span>?</span></div>`).join('')}</div>`);
    let first = 0;
    for (const c of CELLS) {
      const ok = await pick(b, { q: c.q, opts: c.opts.map(o => Object.assign({ out: 'On the board.' }, o)) }, c.k === 'rel' ? 'rdsaurora' : c.k === 'reads' ? 'caching' : c.k === 'find' ? 'ddbindex' : 'ddbkey');
      if (ok) first++;
      const cell = b.querySelector(`[data-c="${c.k}"]`); cell.querySelector('span').textContent = c.opts.find(o => o.ok).t;
    }
    // The load test.
    const lt = document.createElement('div'); lt.innerHTML = '<p class="vn-q"><b>Load test</b></p><pre class="g3-kev"></pre>'; b.appendChild(lt);
    const out = lt.querySelector('pre');
    for (const [k, line] of [['reads', 'Saint\'s Day: 40× reads. DAX answers most; the table barely notices.'], ['writes', 'A hot key: one ward collects at once. A hundred thousand citizen IDs spread it: no partition throttles.'], ['rel', 'A lost replica: Aurora promotes another; the proxy keeps the functions\' connections while it does.']]) {
      out.textContent += (out.textContent ? '\n' : '') + '✓ ' + line; b.querySelector(`[data-c="${k}"]`).classList.add('ok'); AU.sfx('ok'); await wait(600);
    }
    // The interviewer.
    const s = await pick(b, { q: 'The interviewer taps the cache: "And a strongly consistent read? What does DAX do with it?"', opts: [
      { t: 'Passes it through to DynamoDB; it isn\'t served from or stored in the cache', ok: true, out: 'DAX serves eventually consistent reads. A strongly consistent read goes straight to DynamoDB, and the result isn\'t cached.' },
      { t: 'Serves it from the cache, which is always up to date', no: 'DAX is write-through for writes made through it, but a cached item can still be stale. Strong reads skip it.' },
      { t: 'Rejects it with an error', no: 'DAX accepts it and forwards it to the table.' }] }, 'caching');
    await cont(b, 'Pin it to the board');
    return { ok: first >= 3 && s };
  };

  // ---------- The gallery: three proofs ----------
  G.evidence = async function (o) {
    o = o || {};
    S.seeConcept('ddbstream'); S.seeConcept('rdsaurora'); S.seeConcept('ddbwrite');
    const b = panel('THE CONFRONTATION', `<p>Selvaria, at the rail, Noor beside her: "Show them, then. The Saint agreed. The city needed a stronger barrier for the winter. If the records say otherwise, read them out."</p>`);
    let right = 0;
    const proof = async (s, c, line) => {
      if (await pick(b, s, c)) right++;
      const n = document.createElement('p'); n.className = 'muted small'; n.textContent = line; b.appendChild(n);
      AU.sfx('heal'); if (o.onProof) o.onProof(right); await wait(400);
    };
    await proof({ q: '1. The order. Selvaria\'s order to Aurelian was overwritten the next morning. What shows the item as it was before the change?', opts: [
      { t: 'The ledger\'s stream, NEW_AND_OLD_IMAGES view type', ok: true, out: 'Every change, with the item before and after, kept for 24 hours. Someone turned it on. The old order: "The Saint has agreed."' },
      { t: 'A Scan of the ledger table as it is today', no: 'A Scan reads the table as it is now. The old order isn\'t in it any more.' },
      { t: 'The ledger\'s stream, KEYS_ONLY view type', no: 'KEYS_ONLY records which item changed, not what it said.' }] }, 'ddbstream', 'A part of the nave goes quiet, and takes its grants back.');
    await proof({ q: '2. The founding texts. They were deleted, the night Hana read them. What brings them back, and where?', opts: [
      { t: 'Point-in-time restore to a new DB instance, as of the day before', ok: true, out: 'The cathedral\'s backups ran every five minutes, faithfully. The restore is a new instance; the texts are in it.' },
      { t: 'Point-in-time restore over the existing instance, as of that night', no: 'RDS never restores in place. A restore always makes a new instance.' },
      { t: 'Fail over to the Multi-AZ standby, which still has them', no: 'The standby is synchronous: it deleted them in the same instant.' }] }, 'rdsaurora', 'Another part of the nave stands, and gives back what it was given.');
    await proof({ q: '3. The consent record. Version 7, written by Hana\'s role: no. Version 9, written by the regent\'s: the Drawing. What would have stopped the second write?', opts: [
      { t: 'A conditional write on the version she last read', ok: true, out: 'Optimistic locking. The regent\'s write would have failed with ConditionalCheckFailed: the record had changed since she read it. It had. Hana had said no.' },
      { t: 'A strongly consistent read of the record first', no: 'That would have shown her Hana\'s no. It wouldn\'t have stopped her writing over it.' },
      { t: 'A TTL on the record, so old versions expire', no: 'TTL deletes items, eventually. It doesn\'t guard a write.' }] }, 'ddbwrite', 'Sir Aurelian takes off his gauntlet and holds it up so the city can read the names.');
    await cont(b, 'One more thing');
    const r = await num({ c: 'ddbstream', q: 'For how many hours does a DynamoDB stream keep each record?', unit: 'hours', lo: 24, hi: 24, ans: '24 hours',
      why: 'Stream records are kept for 24 hours. Whatever reads them, a Lambda function or a Kinesis adapter, has a day to do it.',
      eli5: 'The ledger\'s echo lasts one day. Ask it what changed this morning and it remembers; ask about last week and it\'s gone quiet.' }, 'ONE MORE THING');
    return { ok: right === 3 && !!(r && r.ok), right };
  };

  // ---------- Pip: why did that work? ----------
  const WHY = {
    cold: { c: 's3class', q: 'Explain, the way you would to an interviewer, how you\'d choose between S3 Standard, Standard-IA and Glacier Deep Archive for a store of records.',
      points: [{ t: 'Match the class to how often it\'s read', keys: ['how often', 'access pattern', 'frequen', 'rarely', 'infrequent'], ex: ['it depends how often people read it', 'hot data in standard, cold data in glacier'] },
        { t: 'Retrieval: IA is immediate but charged; Deep Archive takes hours', keys: ['retriev', 'restore', 'hours', '12', '48', 'fee'], ex: ['deep archive has to be restored first', 'you pay to get things out of IA'] },
        { t: 'Minimum storage durations', keys: ['minimum', '30 days', '180 days', 'thirty'], ex: ['you pay for at least a month in IA', 'deleting early still costs'] },
        { t: 'Lifecycle rules move and expire it', keys: ['lifecycle', 'transition', 'expir'], ex: ['a rule moves it down over time', 'delete it automatically after seven years'] }],
      model: 'Pick by access pattern: S3 Standard for data read often, Standard-IA for data read rarely but needed immediately, with a retrieval fee and a 30-day minimum, and Deep Archive for data kept for years that can wait 12 to 48 hours for a restore, with a 180-day minimum. A lifecycle rule moves objects down as they age and expires them at the end of retention.',
      eli5: 'Drawer, shoebox, attic. How often you open it decides where it goes, the attic takes a day to climb into, and each place charges a minimum stay.' },
    abyss: { c: 'ddbkey', q: 'Explain why a DynamoDB table with plenty of capacity can still be throttled, and what you\'d do about it.',
      points: [{ t: 'One partition key gets most of the traffic (a hot key)', keys: ['hot', 'one key', 'same key', 'one partition', 'single partition'], ex: ['everyone writes to the same key', 'all the traffic lands on one partition'] },
        { t: 'Each partition has its own limit', keys: ['per partition', 'partition limit', '1,?000', '3,?000', 'each partition'], ex: ['a partition can only take so many writes a second', 'table capacity is split across partitions'] },
        { t: 'Use a high-cardinality key, or shard the hot one', keys: ['cardinality', 'shard', 'suffix', 'spread', 'distinct'], ex: ['add a suffix to spread the key', 'choose a key with lots of values'] },
        { t: 'Find it with Contributor Insights', keys: ['contributor insights', 'contributor'], ex: ['look at which keys are hottest in CloudWatch'] }],
      model: 'Capacity is spread across partitions, and each partition has its own limit of about 3,000 reads and 1,000 writes a second, so a hot key throttles even when the table has capacity to spare. Find the hot key with CloudWatch Contributor Insights, then choose a key with many evenly used values, or shard the hot one with a suffix (calculated, if you need to read single items back).',
      eli5: 'Ten checkout lanes and everyone queues at lane one. The shop has room; one lane doesn\'t. Give everyone a ticket number so they spread out.' },
    cathedral: { c: 'ddbwrite', q: 'Explain how optimistic locking with a conditional write stops two writers from overwriting each other in DynamoDB.',
      points: [{ t: 'Each item carries a version number', keys: ['version'], ex: ['keep a counter on the item', 'a version attribute'] },
        { t: 'The write is conditional on the version you read', keys: ['condition', 'conditionexpression', 'only if', 'expected'], ex: ['only write if the version hasn\'t changed', 'put a condition on the update'] },
        { t: 'If someone wrote first, the write fails', keys: ['fail', 'conditionalcheckfailed', 'reject', 'error'], ex: ['the second write gets an error', 'DynamoDB refuses it'] },
        { t: 'Then re-read and retry (or stop)', keys: ['re-?read', 'retry', 'try again', 'read again'], ex: ['read the new version and decide again'] }],
      model: 'Each item has a version attribute. A writer reads the item, then writes with a ConditionExpression that the version is still the one it read, and increments it. If someone else wrote in between, the condition fails with ConditionalCheckFailedException, so the writer re-reads and decides again instead of silently overwriting.',
      eli5: 'You may only hand in the form if the page number on it is the one you were given. If someone handed in a newer page first, the clerk sends yours back to read again.' }
  };
  G.why = function (id) {
    const q = WHY[id]; if (!q) return Promise.resolve(null);
    return Q.ask(Object.assign({ type: 'explain', id: 'g3-why-' + id }, q), { title: 'PIP: WHY DID THAT WORK?' });
  };

  // ---------- A page of Hana's speech ----------
  // pool: a concept from js/c3-help.js's SD.c3pools. One question from the bank, recorded like any other.
  G.page = function (pool, title) {
    const ids = (SD.c3pools && SD.c3pools[pool]) || [];
    const qs = SD.questions.filter(q => ids.includes(q.id));
    const q = SD.qpick ? SD.qpick(qs) : qs[0];
    if (!q) return Promise.resolve(null);
    return Q.ask(q, { title: title || 'A PAGE OF HANA\'S SPEECH', context: 'In the margin, in Hana\'s hand' });
  };
})();
