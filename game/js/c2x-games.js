// The minigames of chapter 2, part 2 (js/c2x-world.js). Each opens with a prediction (a question you answer before
// you see it play out), then lets you play it, the learning design's "predict, then play":
//   bench    floor 7, the clerk's bench: size a clerk's memory and timeout from what Lambda Insights shows
//   logs     camp, Bru's quest "Who Reads the Prayers?": build a Logs Insights query from blocks
//   design   camp, the Design Board: draw Thornwick's post as it should have been, then say why the alarm is there
//   archive  floor 13, the Inquisition's event archive: replay the evening of the tower to the right rule
//   ledger   floor 13, the river gate: read the ferry ledger the way a FIFO queue delivers it
//   report   floor 13, Hale's dispatch desk: which attribute says when the report was first sent, and how early
// Each resolves with true when it was played right the first time. AWS facts follow the current AWS documentation
// (Lambda memory and CPU, Lambda Insights; CloudWatch Logs Insights; SNS, SQS and CloudWatch alarms; EventBridge
// archive and replay; SQS FIFO and message system attributes). Every question here is written fresh.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const U = SD.ui, S = SD.state, AU = SD.audio, Q = SD.quiz;
  const G = SD.c2xgames = {};
  const esc = s => U.esc(s);

  const css = document.createElement('style');
  css.textContent = `
.x2 { text-align: left; }
.x2-h { font: 600 12px/1.5 ui-monospace, monospace; color: #b7b0cc; margin: 6px 0; word-break: break-word; }
.x2-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0 10px; }
.x2-row .opt { min-height: 44px; flex: 1 1 28%; min-width: 84px; }
.x2 .opt.on { outline: 3px solid #ffd24a; }
.x2-out { font: 600 12px/1.5 ui-monospace, monospace; background: #120f1c; color: #e8e4f4; border-radius: 8px; padding: 8px 10px; margin: 8px 0; white-space: pre-wrap; word-break: break-word; }
.x2-out .bad { color: #ff8a7a; } .x2-out .ok { color: #8ae0a0; }
.x2-lbl { font-weight: 700; font-size: 13px; margin-top: 6px; }
.x2-tog { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 44px; border-bottom: 1px solid rgba(255,255,255,.08); }
.x2-tog span { flex: 1; }
`;
  document.head.appendChild(css);

  // A prediction: one question before the play. Resolves with whether it was right.
  const predict = (q, title, ctx) => Q.ask(Object.assign({ type: 'mc' }, q), { title, context: ctx || 'Predict first' }).then(r => !!(r && r.ok));
  const verdict = (ok, title, body, why) => new Promise(res => {
    AU.sfx(ok ? 'right' : 'wrong');
    const b = U.panel(`<div class="verdict ${ok ? 'ok' : 'bad'}">${ok ? 'RIGHT!' : 'NOT QUITE'}</div><p>${body}</p>${why ? `<p class="why">${esc(why)}</p>` : ''}<button class="primary" id="x2-ok">Continue</button>`, { title, noClose: true });
    b.querySelector('#x2-ok').onclick = () => { U.closePanel(); res(); };
  });
  // Chips you pick one of, in rows: rows = [[key, label, [options]]]; returns the panel and a getter for the picks.
  function chips(b, picks) {
    b.querySelectorAll('[data-k]').forEach(el => el.onclick = () => {
      const k = el.dataset.k;
      picks[k] = el.dataset.v;
      b.querySelectorAll(`[data-k="${k}"]`).forEach(o => o.classList.toggle('on', o === el));
      AU.sfx('card');
    });
  }
  const row = (k, opts) => `<div class="x2-row">${opts.map(([v, label]) => `<button class="opt" type="button" data-k="${k}" data-v="${esc(v)}">${esc(label)}</button>`).join('')}</div>`;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- The clerk's bench ----------
  // A CPU-bound, single-threaded sort: 24 s at 128 MB, faster in proportion to memory up to one vCPU (1,769 MB).
  G.bench = async function () {
    await predict({ c: 'lambdacfg', q: 'The Night Shift\'s clerk sorts a sack of letters in 24 seconds at 128 MB, and uses 90 MB of it. The sort is pure arithmetic, on one thread. Give him 1,024 MB. About how long does the sort take now?',
      opts: ['About 3 seconds: more memory brings more CPU', 'Still 24 seconds: he wasn\'t short of memory', 'About 12 seconds: memory only helps half as much', 'Longer: more memory takes longer to start'], a: 0,
      no: [null, 'Lambda gives CPU in proportion to memory, so memory he doesn\'t use still buys speed.', 'Up to one vCPU, CPU grows in step with memory.', 'Start-up isn\'t what\'s slow here.'],
      why: 'Lambda allocates CPU in proportion to memory, so eight times the memory gives a CPU-bound sort about eight times the CPU: 24 s becomes about 3 s, for about the same cost (memory times duration).',
      eli5: 'In this game, the memory slider is also the speed slider. Max it out to one full CPU and a number-crunching clerk gets that much faster, even if he never fills his pockets.' }, 'THE CLERK\'S BENCH');
    let first = null;
    for (;;) {
      const ok = await new Promise(res => {
        const picks = {};
        const b = U.panel(`<div class="x2"><p>A clerk on the bench. The night's sacks must each be sorted in <b>5 seconds or less</b>, and the clerk must never time out. Lambda Insights, from last night:</p>
          <div class="x2-out">memory: 128 MB   max used: 90 MB   CPU: 100%   duration: 24.0 s   timeout: 3 s</div>
          <div class="x2-lbl">Memory</div>${row('mem', [['128', '128 MB'], ['512', '512 MB'], ['1024', '1,024 MB'], ['1769', '1,769 MB'], ['3008', '3,008 MB']])}
          <div class="x2-lbl">Timeout</div>${row('to', [['3', '3 s'], ['10', '10 s'], ['900', '900 s']])}
          <button class="primary" id="xb-run">Run a sack</button></div>`, { title: 'THE CLERK\'S BENCH', noClose: true });
        chips(b, picks);
        b.querySelector('#xb-run').onclick = () => {
          if (!picks.mem || !picks.to) return;
          const mem = +picks.mem, to = +picks.to, dur = Math.round(24 * 128 / Math.min(mem, 1769) * 10) / 10, cost = Math.round(mem * dur / (128 * 24) * 100);
          const timedOut = dur >= to, slow = dur > 5, waste = mem > 1769, lazy = to > 60;
          const good = !timedOut && !slow && !waste && !lazy;
          U.closePanel();
          const lines = [`duration: ${timedOut ? to.toFixed(1) + ' s  <span class="bad">Task timed out</span>' : dur.toFixed(1) + ' s'}   cost: ${cost}% of last night`,
            timedOut ? '<span class="bad">The run took longer than the timeout.</span>' : '',
            slow && !timedOut ? '<span class="bad">Slower than the 5-second promise.</span>' : '',
            waste ? '<span class="bad">Past 1,769 MB a single-threaded sort gets no faster: you pay for cores it can\'t use.</span>' : '',
            lazy ? '<span class="bad">A 900-second timeout lets a stuck clerk burn 15 minutes before anyone hears about it. Keep it a margin above the real work.</span>' : '',
            good ? '<span class="ok">Sorted in time, with room to spare, for about what 128 MB cost.</span>' : ''].filter(Boolean).join('\n');
          S.recordAnswer('lambdacfg', good, 1, 20000);
          verdict(good, 'THE CLERK\'S BENCH', `<div class="x2-out">${lines}</div>`, good ? 'Memory buys CPU up to one vCPU at 1,769 MB; the timeout sits above the slowest run, not far above it.' : 'Try again: read the CPU, not the memory used.').then(() => res(good));
        };
      });
      if (first === null) first = ok;
      if (ok) break;
    }
    return first;
  };

  // ---------- Ask the Logs ----------
  // The prayer desk's JSON log lines; the query is built from four blocks.
  const PRAYER_LOG = [
    { t: '02:41:07', id: 'mira-0001', reader: 'Freya', action: 'read' },
    { t: '02:41:09', id: 'mira-0001', reader: 'Freya', action: 'archived' },
    { t: '03:02:55', id: 'tilly-0444', reader: 'Freya', action: 'read' },
    { t: '09:15:00', id: 'mira-0001', reader: 'Bru', action: 'logged' },
    { t: '01:00:00', id: 'anselm-0007', reader: 'Freya', action: 'read' }
  ];
  G.logs = async function () {
    await predict({ c: 'logsinsights', q: 'Bru\'s desk writes every log line as JSON, like {"prayerId": "mira-0001", "reader": "Freya", "action": "read"}. What must you do before Logs Insights can filter on reader?',
      opts: ['Nothing: it discovers the fields in JSON log lines', 'Write a parse command for every query', 'Create a metric filter for the reader field', 'Export the logs to S3 and query them in Athena'], a: 0,
      no: [null, 'Parse is for unstructured lines. JSON fields are found for you.', 'A metric filter makes a metric; it isn\'t needed to query.', 'Logs Insights queries the log group where it is.'],
      why: 'CloudWatch Logs Insights discovers fields in JSON log events automatically, so structured logging means you can filter, sort and aggregate by them with no parse step.',
      eli5: 'If every log line is a filled-in form, the search box can already see every box. Messy free-text lines are the ones you have to cut up yourself.' }, 'WHO READS THE PRAYERS?');
    let first = null;
    const BLOCKS = [
      ['f', 'fields', [['0', 'fields @timestamp, reader, prayerId'], ['1', 'fields @message'], ['2', 'fields reader']]],
      ['w', 'filter', [['0', 'filter prayerId = "mira-0001"'], ['1', 'filter reader = "Freya"'], ['2', 'filter action = "logged"']]],
      ['s', 'then', [['0', 'sort @timestamp asc'], ['1', 'stats count(*) by reader'], ['2', 'sort @timestamp desc']]],
      ['l', 'limit', [['0', 'limit 1'], ['1', 'limit 20']]]
    ];
    for (;;) {
      const ok = await new Promise(res => {
        const picks = {};
        const b = U.panel(`<div class="x2"><p>Bru's question: <b>who first read Mira's prayer, and when?</b> Build the query from four blocks, then run it on the prayer desk's log group.</p>
          ${BLOCKS.map(([k, label, opts]) => `<div class="x2-lbl">${label}</div>${row(k, shuffle(opts))}`).join('')}
          <button class="primary" id="xl-run">Run the query</button></div>`, { title: 'ASK THE LOGS', noClose: true });
        chips(b, picks);
        b.querySelector('#xl-run').onclick = () => {
          if (BLOCKS.some(([k]) => picks[k] == null)) return;
          let rows = PRAYER_LOG.slice();
          if (picks.w === '0') rows = rows.filter(r => r.id === 'mira-0001'); else if (picks.w === '1') rows = rows.filter(r => r.reader === 'Freya'); else rows = rows.filter(r => r.action === 'logged');
          let out;
          if (picks.s === '1') {
            const n = {}; rows.forEach(r => { n[r.reader] = (n[r.reader] || 0) + 1; });
            out = Object.entries(n).map(([k, v]) => `reader: ${k}   count: ${v}`);
          } else {
            rows.sort((a, c) => (picks.s === '0' ? 1 : -1) * a.t.localeCompare(c.t));
            out = rows.map(r => picks.f === '1' ? `@message: {"prayerId":"${r.id}","reader":"${r.reader}","action":"${r.action}"}` : picks.f === '2' ? `reader: ${r.reader}` : `@timestamp: ${r.t}   reader: ${r.reader}   prayerId: ${r.id}`);
          }
          if (picks.l === '0') out = out.slice(0, 1);
          const good = picks.f === '0' && picks.w === '0' && picks.s === '0' && picks.l === '0';
          const q = BLOCKS.map(([k, , opts]) => opts.find(o => o[0] === picks[k])[1]).join('\n| ');
          S.recordAnswer('logsinsights', good, 1, 20000);
          U.closePanel();
          verdict(good, 'ASK THE LOGS', `<div class="x2-out">${esc(q)}</div><div class="x2-out">${esc(out.join('\n') || '(no results)')}</div>${good ? 'Freya read it at 02:41:07 on the night of the tower. Two seconds later she archived it.' : 'That answers a question, but not Bru\'s: the first reader of mira-0001, and when.'}`,
            good ? 'fields picks the columns, filter keeps one prayer, sort @timestamp asc puts the first read first, and limit 1 keeps only it.' : '').then(() => res(good));
        };
      });
      if (first === null) first = ok;
      if (ok) break;
    }
    return first;
  };

  // ---------- The Design Board ----------
  const DESIGN = [
    ['topic', 'One SNS topic for Thornwick\'s post', true],
    ['qeach', 'One SQS queue per village, each subscribed to the topic', true],
    ['shared', 'One shared queue that every village polls', false],
    ['dlq', 'A dead-letter queue on every village\'s queue', true],
    ['alarm', 'An alarm on each dead-letter queue that pages a person', true],
    ['idem', 'Idempotent consumers: a repeat letter is delivered once', true],
    ['direct', 'The post box invokes each village\'s consumer function directly', false]
  ];
  G.design = async function () {
    await predict({ c: 'snsfan', q: 'Thornwick\'s post goes to a topic, with a queue per village. Brookfall\'s consumer is down for a whole day. What happens to Thornwick\'s own letters?',
      opts: ['Nothing: they wait in Thornwick\'s own queue and arrive as usual', 'They pile up behind Brookfall\'s and arrive tomorrow', 'The topic stops publishing until Brookfall is back', 'They go to Brookfall\'s dead-letter queue'], a: 0,
      no: [null, 'Each village has its own queue; nobody waits behind anyone.', 'The topic delivers to every subscription independently.', 'A dead-letter queue only takes messages its own queue gave up on.'],
      why: 'With fan-out, each subscriber has its own queue, so a slow or broken consumer only fills its own queue. The others keep working.',
      eli5: 'Every village has its own mailbox under the loudspeaker. If Brookfall\'s postman is off sick, only Brookfall\'s box fills up.' }, 'THE DESIGN BOARD');
    let first = null;
    for (;;) {
      const ok = await new Promise(res => {
        const on = {};
        const b = U.panel(`<div class="x2"><p>Draw Thornwick's post as it should have been. Switch on what belongs on the board, and leave off what doesn't. The board checks that every queue has a DLQ, that something watches each DLQ, and that nothing calls a consumer directly.</p>
          ${DESIGN.map(([k, label]) => `<div class="x2-tog"><span>${esc(label)}</span><button class="opt" type="button" data-d="${k}" aria-pressed="false">Off</button></div>`).join('')}
          <button class="primary" id="xd-go">Check the board</button></div>`, { title: 'THE DESIGN BOARD', noClose: true });
        b.querySelectorAll('[data-d]').forEach(el => el.onclick = () => { const k = el.dataset.d; on[k] = !on[k]; el.textContent = on[k] ? 'On' : 'Off'; el.classList.toggle('on', on[k]); el.setAttribute('aria-pressed', String(on[k])); AU.sfx('card'); });
        b.querySelector('#xd-go').onclick = () => {
          const miss = DESIGN.filter(([k, , want]) => !!on[k] !== want);
          const why = { topic: 'Without a topic, the post box has to know every village.', qeach: 'Each village needs its own queue, so a slow one only slows itself.', shared: 'A shared queue means one slow village holds up the others.', dlq: 'A queue with no DLQ retries a bad letter forever.', alarm: 'A DLQ nobody watches is the Prayer Vault again.', idem: 'Queues deliver at least once; a repeat must be harmless.', direct: 'Calling consumers directly couples the post box to every one of them.' };
          const good = !miss.length;
          S.recordAnswer('snsfan', good, 1, 20000);
          U.closePanel();
          verdict(good, 'THE DESIGN BOARD', good ? 'Every queue has a DLQ, every DLQ has someone watching it, and nothing calls a consumer directly.' : `<ul>${miss.map(([k]) => `<li>${esc(why[k])}</li>`).join('')}</ul>`).then(() => res(good));
        };
      });
      if (first === null) first = ok;
      if (ok) break;
    }
    const r = await Q.ask({ c: 'sqsalarm', type: 'mc', q: 'The interviewer taps the alarm on Brookfall\'s dead-letter queue. "Why is this here? The DLQ already keeps the failed letters."',
      opts: ['Keeping them isn\'t reading them: the alarm makes sure a person knows something failed', 'It retries the failed letters automatically', 'It stops the topic from publishing more letters', 'It deletes letters older than the retention period'], a: 0,
      no: [null, 'An alarm notifies; it doesn\'t move messages. A redrive does that.', 'Alarms don\'t throttle publishers.', 'Retention does that on its own.'],
      why: 'A dead-letter queue only holds what failed. Without an alarm on its depth, it fills quietly, as the Prayer Vault did for ten thousand years. The alarm turns "kept" into "someone is looking".',
      eli5: 'The lost-and-found shelf only stores things. The bell on it is what makes someone walk over and look.' }, { title: 'THE DESIGN BOARD', context: 'The interviewer' });
    return first && !!(r && r.ok);
  };

  // ---------- The Inquisition's event archive ----------
  const ARCHIVE = [
    ['17:55', 'BellRung', '{ "tower": "square" }'],
    ['18:40', 'OrderIssued', '{ "from": "Hale", "to": "the Seven", "post": "the tower stair", "note": "the door stays open" }'],
    ['19:10', 'Sighted', '{ "who": "Bram Holloway", "where": "the tower door" }'],
    ['20:30', 'Sighted', '{ "who": "the beast", "where": "the stair" }'],
    ['22:15', 'Curfew', '{}']
  ];
  G.archive = async function () {
    await predict({ c: 'ebarchive', q: 'The Inquisition\'s bus has had an archive since long before the night of the tower. You replay that evening. Where do the replayed events go?',
      opts: ['Back onto the bus, to every rule or only the rules you name', 'Straight into a CloudWatch log group', 'Only to the rules that existed that evening', 'Nowhere: a replay only lists them'], a: 0,
      no: [null, 'A replay sends events to the bus, not to logs.', 'You can replay to rules made since; you choose which.', 'A replay really sends them, which is why the choice of rules matters.'],
      why: 'A replay sends archived events from a time window back to the event bus, to all its rules or only those you list, and each replayed event carries a replay-name field.',
      eli5: 'It\'s a recording of the evening played back onto the noticeboard. You choose which listeners hear the replay.' }, 'THE EVENT ARCHIVE');
    let first = null;
    for (;;) {
      const ok = await new Promise(res => {
        const picks = {};
        const b = U.panel(`<div class="x2"><p>The archive of the Inquisition's bus. Replay the evening of the tower, a year ago, to see what it carried at dusk, before Bram arrived. Choose a window and where the replay goes.</p>
          <div class="x2-lbl">From</div>${row('from', [['16', '16:00'], ['19', '19:00'], ['21', '21:00']])}
          <div class="x2-lbl">To</div>${row('to', [['19', '19:00'], ['20', '20:00'], ['23', '23:00']])}
          <div class="x2-lbl">Send the replay to</div>${row('rule', [['new', 'Only a new rule, "evidence"'], ['all', 'Every rule on the bus']])}
          <button class="primary" id="xa-go">Start the replay</button></div>`, { title: 'THE EVENT ARCHIVE', noClose: true });
        chips(b, picks);
        b.querySelector('#xa-go').onclick = () => {
          if (!picks.from || !picks.to || !picks.rule) return;
          const lo = +picks.from, hi = +picks.to;
          const got = ARCHIVE.filter(([t]) => { const h = +t.slice(0, 2) + +t.slice(3) / 60; return h >= lo && h < hi; });
          const order = got.some(e => e[1] === 'OrderIssued') && got.some(e => e[1] === 'Sighted' && /Bram/.test(e[2]));
          const good = lo < hi && order && picks.rule === 'new';
          const lines = lo >= hi ? ['(the window ends before it starts)'] : got.length ? got.map(([t, type, d]) => `${t}  ${type}  ${d}`) : ['(nothing in that window)'];
          let note = good ? 'There it is: Hale\'s order at 18:40, half an hour before Bram reached the door. His men were waiting.' : '';
          if (picks.rule === 'all') note = '<span class="bad">Every rule on the bus heard it again: the Inquisition\'s bells all rang, and Hale\'s men know someone is in the archive.</span> Send a replay only to the rule you made for it.';
          else if (!order && lo < hi) note = 'That window doesn\'t show the order and Bram\'s arrival together.';
          S.recordAnswer('ebarchive', good, 1, 20000);
          U.closePanel();
          verdict(good, 'THE EVENT ARCHIVE', `<div class="x2-out">${esc(lines.join('\n'))}</div>${note}`).then(() => res(good));
        };
      });
      if (first === null) first = ok;
      if (ok) break;
    }
    return first;
  };

  // ---------- The ferry ledger ----------
  const LEDGER = [
    { g: 'stair', n: 50, t: '02:05 the beast reaches the stair' },
    { g: 'river', n: 101, t: '01:50 boarded: a novice, asleep, carried' },
    { g: 'stair', n: 51, t: '02:40 the beast still on the stair' },
    { g: 'river', n: 103, t: '02:20 landed at the far bank' },
    { g: 'river', n: 102, t: '02:00 crossed the river gate' }
  ];
  G.ledger = async function () {
    await predict({ c: 'sqsfifo', q: 'The ferry ledger is a FIFO queue. The river gate\'s crossings use message group "river"; the stair\'s watch uses group "stair". What does the queue promise about their order?',
      opts: ['Each group in the order it was sent; nothing about one group against the other', 'Everything in the order it was sent, across both groups', 'Nothing at all: FIFO only removes duplicates', 'Each group in order, but only if there\'s one reader'], a: 0,
      no: [null, 'Order holds within a message group only.', 'FIFO keeps order within each group as well as deduplicating.', 'Order within a group holds however many readers there are.'],
      why: 'A FIFO queue delivers the messages of each message group in the order they were sent, and different groups can be read in parallel, so their relative order isn\'t guaranteed.',
      eli5: 'Each lane of the mailbox is strictly in order. Two lanes side by side make no promise about which one\'s letter comes first.' }, 'THE FERRY LEDGER');
    let first = null;
    for (;;) {
      const ok = await new Promise(res => {
        const seq = [];
        const b = U.panel(`<div class="x2"><p>The ledger, as it was written to the queue. Tap the <b>river</b> group's crossings in the order a FIFO reader receives them.</p>
          <div class="opts">${LEDGER.map((e, i) => `<button class="opt" type="button" data-l="${i}">[${e.g}] #${e.n} ${esc(e.t)}</button>`).join('')}</div>
          <div class="x2-out" id="xf-seq">(nothing yet)</div><div class="row"><button class="primary" id="xf-go">Read it back</button><button class="ghost" id="xf-reset">Start over</button></div></div>`, { title: 'THE FERRY LEDGER', noClose: true });
        const draw = () => { b.querySelector('#xf-seq').textContent = seq.map(i => `#${LEDGER[i].n} ${LEDGER[i].t}`).join('\n') || '(nothing yet)'; b.querySelectorAll('[data-l]').forEach(el => el.classList.toggle('on', seq.includes(+el.dataset.l))); };
        b.querySelectorAll('[data-l]').forEach(el => el.onclick = () => { const i = +el.dataset.l; if (!seq.includes(i)) seq.push(i); AU.sfx('card'); draw(); });
        b.querySelector('#xf-reset').onclick = () => { seq.length = 0; draw(); };
        b.querySelector('#xf-go').onclick = () => {
          const want = [1, 4, 3];
          const good = seq.length === 3 && seq.every((v, i) => v === want[i]);
          const strayStair = seq.some(i => LEDGER[i].g !== 'river');
          S.recordAnswer('sqsfifo', good, 1, 20000);
          U.closePanel();
          verdict(good, 'THE FERRY LEDGER', good ? 'Boarded at 01:50, across at 02:00, landed at 02:20, in order, in one group. And the stair\'s own group says the beast was there from 02:05 to 02:40. She was carried out while it was still on the stair.'
            : strayStair ? 'Only the river group\'s messages are the crossing. The stair\'s are another group.' : 'Within a group, a FIFO reader gets the messages in the order they were sent: follow the sequence numbers.').then(() => res(good));
        };
      });
      if (first === null) first = ok;
      if (ok) break;
    }
    return first;
  };

  // ---------- Hale's report ----------
  G.report = async function () {
    await predict({ c: 'msgattr', q: 'Hale\'s report of the night, "The beast killed Bram Holloway", has been received 41 times by everyone who ever asked about it. Which of its timestamps still says when it was first posted?',
      opts: ['SentTimestamp', 'ApproximateFirstReceiveTimestamp', 'The time of the latest receive', 'ApproximateReceiveCount'], a: 0,
      no: [null, 'That\'s when someone first received it, not when it was sent.', 'That changes with every receive.', 'That\'s a count, not a time.'],
      why: 'SQS sets SentTimestamp when it accepts a message, and no receive ever changes it.',
      eli5: 'The postmark is stamped when the letter is posted. Opening it again doesn\'t change the date on it.' }, 'HALE\'S REPORT');
    const r = await Q.ask({ c: 'msgattr', type: 'num', q: 'The report\'s SentTimestamp reads 02:30. The watch on the stair logged the fight\'s end at 02:50. How many minutes before the fight ended was Hale\'s report written?', lo: 20, hi: 20, ans: '20', unit: 'minutes',
      why: '02:50 minus 02:30 is 20 minutes. He wrote the story before it happened.',
      eli5: 'The letter saying who won was posted twenty minutes before the match ended.' }, { title: 'HALE\'S REPORT', context: 'Typed answer' });
    return !!(r && r.ok);
  };
})();
