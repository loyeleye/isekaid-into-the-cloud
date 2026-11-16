// Checks Incident Commander's Live shift: the rules (js/ic-live-core.js on js/aws-sim.js) in Node, then the screens
// (js/ic-live.js) at phone width (375px) in Chromium.
//   Rules: every incident's broken path misses its SLO; its reference fix meets it with all three stamps; every decoy
//   misses it; the other fixes that work are real ones; "turn everything" loses the smallest-change stamp; the
//   prediction's choices hold the true count; every knob has a teach line; every rule in aws-sim.js has a docs link.
//   Screens: the chooser on Incident Commander's start, the page and the machine, predict then commit, a part's
//   evidence and knobs, the first-use teach line (once), the run and its stamps, one more try, the debrief question on
//   the plain exam screen with the stakes, Stop for now and resume after a reload, and the end screen.
// Run from game/:  node tools/ic_live_check.js     SHOTS=dir saves screenshots.
const fs = require('fs'), path = require('path');
const AS = require('../js/aws-sim.js');
const L = require('../js/ic-live-core.js');
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const run = (x, k) => L.run(x, Object.assign(L.startKnobs(x), k || {}));

// ---- Rules ----
check(L.INCIDENTS.length === 3 && L.INCIDENTS.map(x => x.id).join() === 'launch,poison,twice', 'the first slice: launch night, the order that wouldn\'t die, charged twice');
L.INCIDENTS.forEach(x => {
  const r = L.REF[x.id];
  check(!run(x).slo, `${x.id}: the broken path misses its SLO`);
  const fix = run(x, r.fix);
  check(fix.slo && fix.stamps.small && fix.stamps.rule, `${x.id}: the reference fix meets the SLO with all three stamps (${fix.sloLine})`);
  r.decoys.forEach(d => check(!run(x, d).slo, `${x.id}: decoy ${JSON.stringify(d)} misses the SLO (${run(x, d).sloLine})`));
  (r.also || []).forEach(d => check(run(x, d).slo, `${x.id}: ${JSON.stringify(d)} also works, as it would on AWS`));
  // Every knob away from its start: more than two changes, so no smallest-change stamp.
  const all = {};
  Object.keys(x.knobs).forEach(id => { const v = x.knobs[id].values.map(o => o.v).filter(v => v !== x.knobs[id].start); all[id] = v[v.length - 1]; });
  if (Object.keys(all).length > L.MAX_CHANGES) check(!run(x, all).stamps.small, `${x.id}: turning every knob loses the smallest-change stamp`);
  const p = L.predictChoices(x);
  check(p.choices.length === 4 && p.choices.includes(p.truth) && new Set(p.choices).size === 4, `${x.id}: four prediction choices, one of them the true count (${p.truth})`);
  Object.keys(x.knobs).forEach(id => check(!!x.knobs[id].teach && x.knobs[id].values.some(v => v.v === x.knobs[id].start), `${x.id}: knob ${id} has a teach line and starts on one of its values`));
  x.parts.forEach(pt => check(!!x.evidence[pt], `${x.id}: ${pt} has evidence`));
});
// The concurrency maths: reserving fewer than the 4 it needs doesn't meet the SLO; reserving the pool starves the neighbour.
{
  const x = L.get('launch');
  check(!run(x, { reserve: 2 }).slo && run(x, { reserve: 4 }).slo, 'launch: 2 reserved is short, 4 (4 per 30 s x 30 s) is enough');
  check(!run(x, { reserve: 8 }).stamps.rule, 'launch: reserving 8 meets the SLO but isn\'t the documented setting (it starves reports-job)');
}
// The documented settings: maxReceiveCount of at least 5; visibility timeout of at least 6x the function timeout.
check(!run(L.get('poison'), { partial: 1, dlq: 3 }).stamps.rule && run(L.get('poison'), { partial: 1, dlq: 3 }).slo, 'poison: maxReceiveCount 3 works but isn\'t the recommended 5');
check(run(L.get('twice'), { vis: 60 }).slo && !run(L.get('twice'), { vis: 60 }).stamps.rule, 'twice: 60 s works tonight but isn\'t 6 x the 60 s function timeout');
{
  const src = fs.readFileSync(path.join(__dirname, '../js/aws-sim.js'), 'utf8');
  check((src.match(/https:\/\/docs\.aws\.amazon\.com\//g) || []).length >= 10, 'the shared rules cite the AWS docs');
}

// ---- Screens ----
(async () => {
  const { chromium } = require('playwright');
  const http = require('http');
  const ROOT = path.resolve(__dirname, '..');
  const SHOTS = process.env.SHOTS;
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.mp4': 'video/mp4' };
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'ic-live-' + name + '.png') }); };
  let noBeats = false;
  const boot = async () => {
    await page.goto(url);
    if (noBeats) await page.evaluate(() => { window.__iclNoBeats = true; });
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    await page.click('#t-start');
    await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.persist(); });
  };
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => { const b = el.getBoundingClientRect(); if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right)); });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.icLive || null)));
  const txt = sel => page.textContent(sel);
  const answer = (right, conf) => page.evaluate(async ([right, conf]) => {
    const p = document.querySelector('#panel'), q = SD.modes.current();
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const said = p.querySelector('#q-said'); if (said) { said.click(); await wait(10); }
    const tf = p.querySelector('#tf-idk'); if (tf) { tf.click(); await wait(10); }
    if (q.type === 'mc') p.querySelector(`[data-o="${right ? q.a : q.opts.findIndex((o, i) => i !== q.a)}"]`).click();
    else if (q.type === 'multi') q.items.forEach((it, i) => { if (right ? it.ok : !it.ok) p.querySelector(`[data-m="${i}"]`).click(); });
    await wait(10);
    p.querySelector(`[data-c="${conf}"]`).click();
    await wait(10);
    return q.id;
  }, [right, conf]);
  const debrief = async (right, conf) => {
    await page.waitForFunction(() => !!SD.modes.current() && document.querySelector('#panel [data-c]'), null, { timeout: 8000 });
    await answer(right, conf);
    await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
    if (await page.$('#q-next')) await page.click('#q-next');
  };
  const setKnob = async (part, knob, v) => {
    if (!await page.$(`[data-knob="${knob}"]`)) await page.click(`[data-part="${part}"]`);
    await page.click(`[data-knob="${knob}"][data-v="${v}"]`);
  };
  const predict = async (right, conf) => {
    const truth = await page.evaluate(() => SD.icLive.core.predictChoices(SD.icLive.core.INCIDENTS[SD.state.save.icLive.i]).truth);
    const pick = right ? truth : await page.evaluate(t => [...document.querySelectorAll('[data-pred]')].map(e => +e.dataset.pred).find(v => v !== t), truth);
    await page.click(`[data-pred="${pick}"]`);
    await page.click(`[data-conf="${conf}"]`);
    await skipPlay();
  };
  // The minute plays out after a prediction and after each run; Skip ends it, and Skip again moves on.
  const skipPlay = async () => {
    await page.waitForSelector('.icl-play');
    await page.click('#icl-skip');
    if (await page.evaluate(() => SD.state.save.icLive.phase === 'play')) await page.click('#icl-skip');
    await page.waitForFunction(() => SD.state.save.icLive.phase !== 'play');
  };
  const run = async () => { await page.click('#icl-run'); await skipPlay(); };

  await boot();
  await page.evaluate(() => SD.modes.open());
  await page.click('[data-mode="ic"]');
  check(!!await page.$('#ic-pager') && !!await page.$('#ic-live'), 'Incident Commander\'s start offers the pager board and the live shift');
  check(/Uptima/.test(await txt('#panel')), 'Uptima opens it');
  await noHScroll('chooser');
  await shot('chooser');
  await page.click('#ic-live');
  // The first beat: the interface pulls down and Uptima, standing in the room, says the page. A tap moves on.
  await page.waitForSelector('#icl-vn');
  check(await page.evaluate(() => document.body.classList.contains('icl-beat') && !!document.querySelector('#icl-scene .icl-upt .icl-uf')), 'a beat: the interface pulls down and Uptima stands in the room');
  check(/Live shift/.test(await txt('#icl-vn')), 'she opens the shift in the dialogue box');
  await shot('beat');
  const faces = await page.evaluate(() => new Promise(r => { const seen = new Set(), t0 = Date.now(); const iv = setInterval(() => { const f = document.querySelector('#icl-scene .icl-uf'); if (f) seen.add(f.src.replace(/.*uptima-face-|\.webp/g, '')); if (Date.now() - t0 > 1500) { clearInterval(iv); r([...seen]); } }, 40); }));
  check(faces.some(f => /talk/.test(f)), `her mouth moves while she talks (${faces.join(', ')})`);
  await page.click('#icl-vn');
  check(/Checkout is spinning/.test(await txt('#icl-vn')), 'then she reads the page');
  while (await page.$('#icl-vn')) await page.click('#icl-vn');
  await page.waitForSelector('.icl-machine');
  check(await page.evaluate(() => !document.body.classList.contains('icl-beat') && !document.querySelector('#icl-vn')), 'the interface comes back up after the last line');
  noBeats = true; await page.evaluate(() => { window.__iclNoBeats = true; });
  check(!/Step 1 of/.test(await txt('#panel')), 'no walkthrough screens: the live shift starts on the page');
  check(/Checkout is spinning/.test(await txt('.icl-page')), 'incident 1 is launch night, with its page');
  check(await page.$$eval('.icl-part', p => p.length) === 4, 'the machine shows the request path\'s four parts');
  check(!await page.$('.icl-ev') && !await page.$('[data-knob]'), 'before the prediction, no evidence and no knobs');
  check(!await page.$('[data-conf]'), 'confidence appears only after a number is picked');
  await noHScroll('page');
  await shot('page');
  // The art: each part is a thing in the camp beside its name; the pool is ten stools; the loop is playing.
  check(await page.$$eval('.icl-art', i => i.length) === 3 && await page.$$eval('.icl-part b', b => b.every(x => x.textContent.trim())), 'three parts have their camp art, and every part keeps its name');
  check(await page.$$eval('.icl-stool', i => i.length) === 10 && await page.$$eval('.icl-stool[src*="stool-reports"]', i => i.length) === 8, 'the pool is ten stools, eight taken by reports-job');
  check(await page.evaluate(() => SD.audio.loopName) === 'iclive', 'the live incident loop plays');

  // Predict wrong, Sure: the stake shows, then the minute runs and the machine says what happened.
  await predict(false, 2);
  let s = await st();
  check(s.phase === 'fix' && s.predOut && !s.predOut.ok && s.pts === -3, 'a wrong Sure prediction costs 3, and the fix screen opens');
  check(/You said .* it was 10/.test(await txt('.icl-verdict')) && !!await page.$('.icl-vs.no'), 'the verdict is a stamp with the true count');
  check(/429 × \d+/.test(await txt('.icl-machine')), 'the machine shows the throttles on orders-fn');
  check(await page.$$eval('[data-part="orders"] .icl-env.bounce img[src*="env-429"]', i => i.length) > 0, 'bounced envelopes at orders-fn show the 429s');
  check(await page.$eval('#icl-run', b => b.disabled), 'Run waits for a change');
  await noHScroll('fix');
  await shot('fix');

  // A part's evidence and knobs; the first knob turned teaches once.
  await page.click('[data-part="orders"]');
  check(/TooManyRequestsException \(429\)/.test(await txt('.icl-ev')), 'orders-fn\'s evidence names the 429');
  await setKnob('orders', 'reserve', 2);
  check(/floor and a ceiling/.test(await txt('.icl-teach')), 'the first turn of a knob teaches it in one line');
  await setKnob('orders', 'reserve', 2);
  check(!await page.$('.icl-teach'), 'and only once');
  await run();
  s = await st();
  check(s.phase === 'result' && !s.last.slo && !!await page.$('#icl-again'), 'reserving 2 misses the SLO, with one more try');
  await shot('result-red');
  await page.click('#icl-again');
  await setKnob('orders', 'reserve', 4);
  check(await page.$$eval('.icl-sb.res', b => b.length) === 4 && !!await page.$('.icl-knob.changed .icl-chg'), 'reserving 4 lights four stools on the knob, marked changed');
  check(await page.$$eval('.icl-cc i.on', i => i.length) === 1, 'the change counter shows one of two');
  // This one plays out in full: envelopes fly, the clock runs, and the lamp lights green.
  await page.click('#icl-run');
  await page.waitForSelector('.icl-play .icl-fly');
  check(await page.$$eval('.icl-play .icl-ph', e => e.length) === 4 && await page.$$eval('.icl-fly', e => e.length) > 0, 'the minute plays on the board: envelopes fly between its parts');
  check(await page.$$eval('.icl-play .icl-fly', f => f.every(e => { const v = parseFloat(e.style.getPropertyValue('--b')); return v > 0; })), 'each envelope heads for a part on the board');
  await page.waitForSelector('#icl-lamp.green', { timeout: 20000 });
  check(/SLO met/.test(await txt('#icl-lamp')), 'at the end of the minute the SLO lamp lights green');
  await page.waitForFunction(() => SD.state.save.icLive.phase === 'result', null, { timeout: 5000 });
  s = await st();
  check(s.last.slo && s.last.stamps.small && s.last.stamps.rule, 'reserving 4 meets the SLO with all three stamps');
  check(await page.$$eval('.icl-stool[src*="stool-orders"]', i => i.length) === 4 && await page.$$eval('.icl-stool[src*="stool-reports"]', i => i.length) === 6, 'four stools reserved for orders-fn leave reports-job six');
  check(/✓ SLO met/.test(await txt('.icl-slo')) && await page.$$eval('.icl-stamps li.on', l => l.length) === 3, 'the result shows the SLO and three stamps');
  await noHScroll('result');
  await shot('result');
  await page.click('#icl-on');
  await debrief(true, 1);
  s = await st();
  const d1 = s.log.find(l => l.kind === 'debrief');
  check(!!d1 && d1.ok && d1.pts === 2, 'the debrief asks a bank question with the stakes (Think so, right: +2)');
  check(s.i === 1 && s.phase === 'page', 'then the next page');

  // Stop and resume after a reload.
  await page.waitForSelector('.icl-machine');
  await page.click('#icl-stop');
  await boot();
  await page.evaluate(() => SD.modes.open());
  check(/Live shift · incident 2 of 3/.test(await txt('[data-mode="ic"]')), 'the picker offers the live shift to resume');
  await page.click('[data-mode="ic"]');
  check(/Resume the live shift/.test(await txt('#ic-live')), 'the chooser says Resume');
  await page.click('#ic-live');
  await page.waitForSelector('.icl-machine');
  check(/queue keeps growing/.test(await txt('.icl-page')), 'resumes on incident 2');

  // Incident 2: the order that wouldn't die.
  await predict(true, 0);
  await setKnob('worker', 'partial', 1);
  await setKnob('dlq', 'dlq', 5);
  await run();
  s = await st();
  check(s.last.slo && s.last.stamps.rule && /parked/.test(await txt('.icl-machine')), 'partial batch responses and a DLQ at 5: SLO met, the bad message parked');
  await page.click('#icl-on');
  await debrief(false, 0);

  // Incident 3: charged twice. One knob, the visibility timeout at 6x.
  await page.waitForSelector('.icl-machine');
  await predict(true, 1);
  await setKnob('queue', 'vis', 360);
  await run();
  s = await st();
  check(s.last.slo && s.last.stamps.rule, 'a visibility timeout of 360 s (6 x 60 s): SLO met, documented setting');
  await page.click('#icl-on');
  await debrief(true, 2);
  await page.waitForSelector('#icl-done');
  s = await st();
  check(s.phase === 'done' && s.stamps.length === 3, 'the shift ends after three incidents');
  check(/uptima-pose-yawn/.test(await page.$eval('#icl-scene .icl-ub', e => e.src).catch(() => '')), 'at dawn Uptima yawns (her pose swaps in)');
  check(/of 9 stamps/.test(await txt('.icl-total')), 'the end screen counts the stamps');
  check(/How sure you were/.test(await txt('#panel')) && !!await page.$('.md-pip'), 'calibration and Pip\'s line on the end screen');
  check(/XP/.test(await txt('.icl-total')), 'it pays once a day');
  await noHScroll('end');
  await shot('end');

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\nFAIL: ${fails.length} check(s) failed.` : '\nOK: the Live shift checks all pass, no errors.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
