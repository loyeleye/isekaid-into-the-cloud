// Headless check of the Renovation, Architect's Draft as a real game (js/mode-reno.js on js/reno-core.js and
// js/aws-deploy.js) at phone width (375px): its card in the picker, night 1's five jobs with the Grand Opening in view,
// the scroll, slate and street, policy cards and knobs, a refused plan, Seymour's two runs, a failed plan and a second
// plan, the permit question on the plain exam screen with the stakes, the building in the Quarter, stopping and
// resuming after a reload, the whole night to the end screen, and nights 2 and 3 (the bridge and the Blueprint Office).
// Run from game/:  node tools/floor_check.js     SHOTS=dir saves screenshots.
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
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'reno-' + name + '.png'), fullPage: false }); };
  const boot = async () => {
    await page.goto(url);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    await page.click('#t-start');
    await page.waitForSelector('#today-card:not([hidden])');
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

  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.reno)));
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
  // Sets the plan through the knobs on screen: a policy/config card, then each knob value.
  const setPlan = async o => {
    for (const [k, v] of Object.entries(o)) {
      if (k === 'policy') await page.click(`[data-pol="${v}"]`);
      else if (k === 'cfg') await page.click(`[data-cfg="${v}"]`);
      else await page.click(`[data-k="${k}"][data-v="${v}"]`);
    }
  };
  const renovate = async () => {
    await page.click('#rn-run');
    if (await page.$('#rn-skip')) await page.click('#rn-skip');
    await page.waitForSelector('.rn-after:not([hidden])', { timeout: 5000 }).catch(() => {});
  };
  const permit = async (right, conf) => {
    await page.click('#rn-deb');
    await page.click('#rn-ask');
    await page.waitForFunction(() => !!SD.modes.current() && document.querySelector('#panel [data-c]'), null, { timeout: 5000 });
    const plain = await page.evaluate(() => !document.querySelector('#panel .rn-street, #panel .rn-bridge'));
    const qid = await answer(right, conf);
    await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
    if (await page.$('#q-next')) await page.click('#q-next');
    await page.waitForFunction(() => SD.state.save.reno.phase === 'after');
    return { qid, plain };
  };
  const nextJob = async () => { await page.click('#rn-next'); if ((await st()).phase === 'board') await page.click('#rn-go'); };
  // Plays the open job with the plan given, then the permit.
  const play = async (plan, right) => { await setPlan(plan); await renovate(); const ok = !!(await page.$('#rn-deb')); if (ok) await permit(right, 1); return ok; };

  await page.clock.install({ time: new Date('2026-11-17T20:00:00') });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  check(await page.evaluate(() => !!(SD.awsDeploy && SD.reno && SD.renoUi)), 'the deployment rules, jobs and screen load in the page');
  await page.evaluate(() => SD.modes.open());
  check(/Renovate Pingsby/.test(await txt('[data-mode="draft"]')), 'Architect\'s Draft in the picker is now the Renovation');
  await page.click('[data-mode="draft"]');
  check(!/Step 1 of/.test(await txt('#panel')), 'no walkthrough screens: it opens on the night\'s jobs');
  check(await page.$$eval('.rn-job', x => x.length) === 5 && /Grand Opening/.test(await txt('.rn-jobs')), 'night 1: five jobs, the Grand Opening in view');
  await noHScroll('board'); await shot('board');

  // ---- Job 1: the lunch rush (D = N). All at once turns people away; rolling with additional batch passes. ----
  await page.click('#rn-go');
  let t = await txt('#panel');
  check(/The slate/.test(t) && /Nobody turned away/.test(t) && await page.$$eval('.rn-h img', x => x.length) >= 4, 'the job shows the scroll, the slate and the street of houses');
  check(await page.$$eval('[data-pol]', x => x.length) === 3, 'the first job offers three policies (start narrow)');
  check(!/helps|correct|right choice/i.test(await txt('.rn-cards')), 'policy cards say what they set, never whether they help');
  await noHScroll('plan'); await shot('plan');
  await setPlan({ policy: 'allAtOnce' });
  await page.click('#rn-run');
  check(await page.$$eval('.rn-run', x => x.length) === 2 && /cracked beam/.test(await txt('#panel')), 'Seymour runs it twice: a sound release and the cracked beam');
  await shot('running');
  if (await page.$('#rn-skip')) await page.click('#rn-skip');
  t = await txt('#panel');
  check(/✗ Nobody turned away/.test(t) && /turned away/.test(t) && !!(await page.$('#rn-again')), 'all at once fails the slate, with the gate\'s marks, and offers another plan');
  check(/red mark on the gate/.test(t), 'the first turned-away resident is taught by one line');
  await noHScroll('inspect'); await shot('inspect-fail');
  await page.click('#rn-again');
  await setPlan({ policy: 'rollingBatch', batch: 1 });
  await renovate();
  check(!!(await page.$('#rn-deb')) && /SEYMOUR SIGNS/.test(await txt('#panel')), 'rolling with an additional batch of 1 passes, and Seymour signs');
  const p1 = await permit(true, 2);
  check(p1.plain, 'the permit question is on its own screen: no street while the stem is open');
  const q1 = await page.evaluate(id => SD.exam.find(id), p1.qid);
  check(/Beanstalk/i.test([q1.q].concat(q1.opts || [], (q1.items || []).map(i => i.t)).join(' ')), 'the permit question is about Elastic Beanstalk');
  check(/IT STANDS/.test(await txt('#panel')), 'a right permit answer: the building stands');
  check(await page.evaluate(id => !!SD.draft.save().town[id] && !SD.draft.save().town[id].scaf && SD.draft.save().town[id].plot != null, p1.qid), 'the building is in Pingsby\'s Quarter, on a plot');
  await shot('stands');

  // ---- Stop and resume after a reload ----
  await nextJob();
  await page.evaluate(() => { SD.state.persist(); sessionStorage.setItem('keep', '1'); });
  await page.reload(); await page.addStyleTag({ content: '*{animation-duration:1ms!important;transition-duration:1ms!important}' });
  await page.click('#t-start').catch(() => {}); await page.waitForSelector('#today-card:not([hidden])').catch(() => {});
  check(/job 2 of 5/.test(await page.evaluate(() => SD.modes.get('draft').status())), 'the picker line resumes at job 2 after a reload');
  await page.evaluate(() => SD.modes.get('draft').start());
  if ((await st()).phase === 'board') await page.click('#rn-go');

  // ---- Job 2: the quiet ward (lumber 0): a wrong permit answer leaves scaffolding ----
  check(await page.$$eval('[data-pol]', x => x.length) === 4, 'the second job adds a fourth policy');
  await setPlan({ policy: 'rolling', batch: 2, ignoreHC: 'false' });
  await renovate();
  check(!!(await page.$('#rn-deb')), 'rolling in batches of 2 passes the quiet ward');
  const p2 = await permit(false, 1);
  check(/SCAFFOLDING/.test(await txt('#panel')) && await page.evaluate(id => SD.draft.save().town[id].scaf && SD.draft.posterUp(id), p2.qid), 'a wrong permit answer: scaffolding, and the question on the Wall');
  await nextJob();
  // ---- Jobs 3 to 5 ----
  check(await play({ policy: 'allAtOnce' }, true), 'the test office: all at once passes');
  await nextJob();
  await setPlan({ policy: 'rolling', batch: 1, ignoreHC: 'true' });
  await renovate();
  check(/✗/.test(await txt('.rn-slate')), 'ignoring health checks fails the gatehouse (the crack rolls on)');
  await page.click('#rn-again');
  check(await play({ policy: 'rolling', batch: 1, ignoreHC: 'false' }, true), 'the gatehouse: rolling, batch 1, health checks on, passes');
  await nextJob();
  check(await play({ policy: 'rollingBatch', batch: 2, ignoreHC: 'false' }, true), 'the Grand Opening: rolling with additional batch of 2 passes');
  await page.click('#rn-next');
  t = await txt('#panel');
  check((await st()).phase === 'end' && /Jobs signed/.test(t) && /opens/.test(t), 'the night ends on the Grand Opening');
  await noHScroll('end'); await shot('end');
  await page.click('#rn-done');

  // ---- Night 2: the Shrine Bridge ----
  await page.evaluate(() => SD.modes.get('draft').start());
  check((await st()).night === 2 && /Shrine Bridge opens/.test(await txt('#panel')), 'night 2 opens the Shrine Bridge');
  await page.click('#rn-go');
  await setPlan({ cfg: 'canary' });
  await page.click('#rn-run');
  check(/\$LATEST/.test(await txt('.rn-refused')), 'a plan on $LATEST is refused, in the client\'s words');
  await setPlan({ publish: 'true' });
  await page.click('#rn-run');
  check(/previous version/.test(await txt('.rn-refused')), 'a gradual shift on a brand-new function is refused');
  check(await play({ cfg: 'all' }, true), 'the first bell: all at once passes');
  await nextJob();
  await noHScroll('bridge-plan'); await shot('bridge-plan');
  await setPlan({ cfg: 'canary', wait: 5, alarm: 'false' });
  await renovate();
  check(/✗/.test(await txt('.rn-slate')) && /signpost kept pointing/.test(await txt('#panel')), 'a canary with no alarm: the crack takes all the traffic, taught in one line');
  await shot('bridge-stuck');
  await page.click('#rn-again');
  check(await play({ cfg: 'canary', wait: 5, alarm: 'true' }, true), 'canary 10% for 5 minutes with an alarm passes the lunchtime rush');
  await noHScroll('bridge-after');
  for (const plan of [{ policy: 'blueGreen', wait: 2 }, { cfg: 'all', alarm: 'false', pre: 'true' }, { cfg: 'canary', wait: 5, alarm: 'true', pre: 'false' }]) { await nextJob(); check(await play(plan, true), 'night 2 job passes: ' + JSON.stringify(plan)); }
  await page.click('#rn-next'); await page.click('#rn-done');

  // ---- Night 3: the Blueprint Office ----
  await page.evaluate(() => SD.modes.get('draft').start());
  await page.click('#rn-go');
  check(/DeletionPolicy/.test(await txt('#panel')) && /Snapshot/.test(await txt('#panel')), 'night 3 opens the Blueprint Office with DeletionPolicy knobs');
  await setPlan({ 'cfn:ledger': 'Snapshot' });
  await page.click('#rn-run');
  check(/Snapshot isn't supported/.test(await txt('.rn-refused')), 'Snapshot on a DynamoDB table is refused');
  check(await play({ 'cfn:ledger': 'Retain' }, true), 'Retain keeps the ledger');
  await noHScroll('office'); await shot('office');

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll Renovation screen checks passed.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
