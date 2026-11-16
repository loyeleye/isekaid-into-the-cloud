// Headless check of the Fire Drill (js/mode-drill.js on js/drill-core.js and js/aws-sim-ops.js) at phone width
// (375px): the picker, no walkthrough, the map with two bosses, the warm-up run, the trace map and its grey nodes, a
// station's metrics and settings, a refused setting, observing, a look-alike, the fix, the postmortem on a plain exam
// screen, resume after a reload, an escalation, a whole night and night 2's forks.
// Run from game/:  node tools/drill_check.js     SHOTS=dir saves screenshots.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'drill-' + name + '.png'), fullPage: false }); };
  const boot = async () => {
    await page.goto(url);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    await page.click('#t-start');
    await page.waitForSelector('#today-card:not([hidden])');
    await page.evaluate(() => { if (SD.drillBoard) SD.drillBoard.STEP_MS = 5; });
  };
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.drill)));
  const txt = sel => page.textContent(sel);
  // Answers the open question: right or wrong, with a confidence (as tools/pop_check.js does).
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

  const place = async id => { await page.evaluate(id => { const s = SD.state.save.drill; s.at = SD.drill.CARDS[id].at; SD.state.persist(); SD.drillUi.draw(); }, id); await page.click(`[data-card="${id}"]`); };
  // A run plays out on the board (js/drill-board.js); the checks run it fast and wait for the result.
  const settle = () => page.waitForFunction(() => !document.querySelector('#panel .db.playing') && !document.querySelector('#dr-skip'), null, { timeout: 15000 });
  const deploy = async () => { await page.click('#dr-deploy'); await settle(); };
  const postmortem = async (right, conf) => {
    await page.click('#dr-next');
    await page.click('#dr-ask');
    await page.waitForFunction(() => !!SD.modes.current() && document.querySelector('#panel [data-c]'));
    const plain = await page.evaluate(() => !document.querySelector('#panel .dr-trace, #panel .dr-pager, #panel .dr-station, #panel .db, #panel .db-chat'));
    const qid = await answer(right, conf);
    await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
    if (await page.$('#q-next')) await page.click('#q-next');
    await page.waitForFunction(() => ['map', 'end'].includes(SD.state.save.drill.phase));
    return { qid, plain };
  };

  await page.clock.install({ time: new Date('2026-11-17T20:00:00') });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  check(await page.evaluate(() => !!SD.modes.get('drill')), 'the Fire Drill is registered');
  check(await page.evaluate(() => typeof SD.awsSim.tick === 'function' && typeof SD.awsSim.kmsAllows === 'function'), 'the shared rules and the operations rules share one module');
  check(await page.evaluate(() => !!SD.raid && typeof SD.raid.play === 'function'), 'Multiplayer (the raid) is still there, untouched');
  await page.evaluate(() => SD.modes.open());
  check(/The Fire Drill/.test(await txt('#panel')) && /Host: Uptima/.test(await txt('[data-mode="drill"]')), 'the picker lists it, hosted by Uptima');
  await page.click('[data-mode="drill"]');
  check(!/Step 1 of/.test(await txt('#panel')), 'no walkthrough screens: it opens on the map');
  check(/Night 1/.test(await txt('#panel')) && await page.$$eval('.dr-row', r => r.every(x => x.querySelectorAll('.dr-door').length === 1)), 'night 1 is one path');
  check(await page.$$eval('.dr-door.boss', x => x.length) === 2, 'two bosses on the map');
  await noHScroll('map'); await shot('map');

  // ---- Retry Storm: the warm-up shows the fault ----
  await page.click('.dr-door.reach'); await settle();
  let s = await st();
  check(s.phase === 'drill' && s.drill.drill === 'storm' && s.drill.log.length === 1, 'the first door opens Retry Storm with its warm-up run');
  let t = await txt('#panel');
  check(/Warm-up run/.test(t) && /429 Too Many Requests/.test(await txt('.db-chat')), 'the warm-up run plays out, then Seo-yeon reports 429s in her bubble');
  check(await page.$$eval('.db-st', x => x.length) === 4 && await page.$$eval('.db-st.st-dark', x => x.length) === 3, 'the board: callers, Gate, Function and Store, untraced stations grey');
  check(await page.$$eval('.db-lead', x => x.length) === 3 && await page.$$eval('.db-pips i', x => x.length) > 0, 'the leads stand at their stations, and the Gate shows its token bucket');
  check(/bucket only refills/.test(t), 'the 429 is taught by its first use, in one line');
  check(/4XXError/.test(t) && /Count/.test(t), 'the Gate\'s station shows its real CloudWatch metrics');
  await noHScroll('warm-up'); await shot('warmup');
  await page.click('.db-st[data-at="fn"]');
  check(/The Function/.test(await txt('.dr-station')) && /ConcurrentExecutions/.test(await txt('.dr-station')), 'tapping a node opens that station\'s metrics and settings');
  // A refused setting teaches by refusal.
  await place('burst');
  check((await st()).drill.changes.length === 0 && /AWS won't take that one/.test(await txt('#panel')), 'raising the account burst is refused, and the refusal is the lesson');
  // Observe, then a look-alike: not contained, it costs budget.
  await place('gtrace'); await place('reserved');
  check(/2 changes/.test(await txt('#dr-deploy')), 'the deploy button counts the changes');
  await deploy();
  s = await st();
  check(s.drill.deploys === 1 && s.drill.state === 'read' && s.budget < 100, `a look-alike doesn't contain it, and the run costs budget (${s.budget}%)`);
  check(await page.$$eval('.db-st[data-at="gate"]', x => x[0].classList.contains('st-throttle')), 'with stage tracing on, the Gate shows purple: Throttle 429');
  await shot('traced');
  await place('backoff');
  await deploy();
  s = await st();
  check(s.drill.state === 'contained' && /Contained/.test(await txt('.dr-stamp')), 'backoff and jitter contains it, and the board is stamped Contained');
  await noHScroll('contained'); await shot('contained');
  const pm = await postmortem(true, 2);
  check(pm.plain, 'the postmortem is a plain exam screen: no map, pager or station while the stem is open');
  const okq = await page.evaluate(id => { const q = SD.exam.find(id); return SD.drill.DRILLS.storm.q.test([q.q].concat(q.opts || []).join(' ')); }, pm.qid);
  check(okq, 'the postmortem question is on the drill\'s cause');
  s = await st();
  check(s.phase === 'map' && s.row === 1 && s.done[0].state === 'contained', 'back on the map, one row up');

  // ---- Stop and resume ----
  await page.click('.dr-door.reach'); await settle();
  const before = await st();
  await page.click('#dr-stop');
  await page.evaluate(() => sessionStorage.setItem('keep', '1'));
  await boot();
  await page.evaluate(() => SD.modes.open());
  check(/Resume · Night 1/.test(await txt('[data-mode="drill"]')), 'the picker offers Resume');
  await page.click('[data-mode="drill"]');
  const after = await st();
  check(after.phase === 'drill' && after.drill.drill === before.drill.drill && after.budget === before.budget, 'resuming opens the same drill');

  // ---- The rest of the night: an escalation, then the intended fixes ----
  for (let i = 0; i < 3; i++) await deploy();
  s = await st();
  check(s.drill.state === 'escalated' && /What was broken/.test(await txt('#panel')), 'three deploys without the fix escalate, and the cause is revealed');
  await postmortem(false, 1);
  check((await page.evaluate(() => SD.state.save.drillKeep.carry.slice())).length >= 1, 'a missed postmortem carries a twin to next night');
  for (let guard = 0; guard < 6; guard++) {
    s = await st();
    if (s.phase === 'end' || s.phase === 'zero') break;
    await page.click('.dr-door.reach'); await settle();
    const id = (await st()).drill.drill;
    for (const c of await page.evaluate(id => SD.drill.DRILLS[id].fix[0], id)) await place(c);
    if (id === 'midnight') await shot('boss');
    await deploy();
    check((await st()).drill.state === 'contained', `${id}: the intended fix contains it on the first deploy`);
    await postmortem(true, 1);
  }
  s = await st();
  check(s.phase === 'end', `the night ends (${s.phase}, budget ${s.budget}%)`);
  const et = await txt('#panel');
  check(/Night 1:/.test(et) && /Why did that work\?/.test(et) && /Stop here/.test(et) && /How sure you were/.test(et), 'the end screen: the night, calibration, Pip\'s question and a clean stop');
  await noHScroll('end'); await shot('end');
  await page.click('#dr-done');
  await page.evaluate(() => SD.modes.open());
  await page.click('[data-mode="drill"]');
  check(/Night 2/.test(await txt('#panel')) && await page.$$eval('.dr-row', r => r.some(x => x.querySelectorAll('.dr-door').length === 2)), 'night 2 opens with forks');

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll Fire Drill checks pass.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
