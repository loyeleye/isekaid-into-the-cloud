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
        if (el.closest('.rs-cam')) return;   // the street is a camera onto a wider world: it scrolls inside its own box
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
  // Sets the plan on screen: a policy/config card, then each knob value. The yard's DeletionPolicy is a tag picked up
  // from the tray and put on the resource (the tap-and-tap way; a real drag is checked on its own below).
  const setPlan = async o => {
    for (const [k, v] of Object.entries(o)) {
      if (k === 'policy') await page.click(`[data-pol="${v}"]`);
      else if (k === 'cfg') await page.click(`[data-cfg="${v}"]`);
      else if (k.startsWith('cfn:') && await page.$('[data-tok]')) await page.evaluate(([id, v]) => { document.querySelector(`[data-tok="${v}"]`).click(); document.querySelector(`[data-drop="${id}"]`).click(); }, [k.slice(4), v]);
      // Beanstalk Row's plan is set on the street: a tap on a house for the batch (the rope's sweep is checked with a
      // real mouse below), and a tap on a stop of a track (the health-check gauge, the gate's dial, the hourglass, the
      // demolition stake) for the rest.
      else if (k === 'batch' && await page.$('[data-house]')) await page.evaluate(v => document.querySelector(`[data-house="${v}"]`).click(), v);
      else if (await page.$(`[data-slide="${k}"]`)) await page.evaluate(([k, v]) => {
        const tr = document.querySelector(`[data-slide="${k}"]`), i = tr.dataset.stops.split(',').indexOf(String(v));
        if (String(tr.dataset.val) === String(v)) return;
        const st = tr.querySelector(`[data-stop="${i}"]`), r = st.getBoundingClientRect(), at = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 1, isPrimary: true };
        st.dispatchEvent(new PointerEvent('pointerdown', at)); window.dispatchEvent(new PointerEvent('pointerup', at));
      }, [k, v]);
      else await page.click(`[data-k="${k}"][data-v="${v}"]`);
      await page.waitForTimeout(30);
    }
  };
  const planNow = () => page.evaluate(() => { const s = SD.state.save.reno; return s.jobs[s.at].plan; });
  // A real mouse drag from one point to another (the page's own pointer events), held for a moment at the end.
  const drag = async (a, b, hold) => {
    await page.mouse.move(a.x, a.y); await page.mouse.down();
    await page.mouse.move(b.x, b.y, { steps: 10 }); if (hold) await hold();
    await page.mouse.up(); await page.waitForTimeout(150);
  };
  // The street is fixed behind the screen's boxes: scroll the boxes back down so the scene is in the open.
  const toScene = () => page.evaluate(() => { document.querySelectorAll('#panel .win-b').forEach(w => { w.scrollTop = 0; }); window.scrollTo(0, 0); });
  // Brings a world element into the camera's view (sideways only).
  const inCam = sel => page.evaluate(sel => { const c = document.querySelector('.rn-bleed .rs-cam'), el = document.querySelector(sel), r = el.getBoundingClientRect(), cr = c.getBoundingClientRect(); c.scrollLeft += r.left + r.width / 2 - (cr.left + cr.width / 2); }, sel);
  const mid = async sel => { const r = await (await page.$(sel)).boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; };
  // The template card's blanks: the first time a term shows up, it's written out in full before the plan runs.
  const writeBlanks = async () => { for (let i = 0; i < 8; i++) { const x = await page.$('.rn-blank:not(.ok)'); if (!x) break; await x.fill(await x.getAttribute('data-term')); await page.waitForTimeout(520); } };
  const runPlan = async () => { await writeBlanks(); await page.click('#rn-run'); };
  const renovate = async () => {
    await runPlan();
    if (await page.$('#rn-skip')) await page.click('#rn-skip');
    await page.waitForSelector('.rn-after:not([hidden])', { timeout: 5000 }).catch(() => {});
  };
  // Seymour's what-if (jobs 2 and 4): marks[i] true chalks ✓ (one tap), false ✗ (two taps); left out, every line ✓.
  const whatIf = async marks => {
    if (!(await page.$('#rn-wi-run'))) return null;
    if (marks === 'right') marks = await page.evaluate(() => { const s = SD.state.save.reno, j = s.jobs[s.at]; return SD.reno.inspect(SD.reno.job(j.id, j.seed), j.wiq).lines.map(l => l.ok); });
    const n = (await page.$$('[data-wi]')).length, locked = await page.$eval('#rn-wi-run', x => x.disabled);
    for (let i = 0; i < n; i++) { await page.click(`[data-wi="${i}"]`); if (marks && marks[i] === false) await page.click(`[data-wi="${i}"]`); }
    await page.click('#rn-wi-run');
    const out = await page.evaluate(() => { const s = SD.state.save.reno; return Object.assign({ text: document.querySelector('#panel').innerText }, s.jobs[s.at].wi); });
    out.locked = locked;
    await page.click('#rn-wi-on');
    return out;
  };
  const permit = async (right, conf, marks) => {
    await page.click('#rn-deb');
    permit.wi = await whatIf(marks);
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
  const edge = () => page.evaluate(() => { const w = document.querySelector('#panel .win').getBoundingClientRect(); return Math.round(w.left) === 0 && Math.round(w.width) === innerWidth; });
  check(await edge(), 'edge to edge: no window box, the sheet fills the screen\'s width');
  await noHScroll('board'); await shot('board');

  // ---- Job 1: the lunch rush (D = N). All at once turns people away; rolling with additional batch passes. ----
  await page.click('#rn-go');
  let t = await txt('#panel');
  check(/The slate/.test(t) && /Nobody turned away/.test(t) && await page.$$eval('.rs-house, .rn-h img', x => x.length) >= 4, 'the job shows the scroll, the slate and the street of houses');
  check(await page.$$eval('[data-pol]', x => x.length) === 3, 'the first job offers three policies (start narrow)');
  check(!/helps|correct|right choice/i.test(await txt('.rn-cards')), 'policy cards say what they set, never whether they help');
  await noHScroll('plan'); await shot('plan');
  await setPlan({ policy: 'allAtOnce' });
  await runPlan();
  check(await page.$$eval('.rn-run', x => x.length) === 2 && /cracked beam/.test(await txt('#panel')), 'Seymour runs it twice: a sound release and the cracked beam');
  await shot('running');
  if (await page.$('#rn-skip')) await page.click('#rn-skip');
  t = await txt('#panel');
  check(/✗ Nobody turned away/.test(t) && /turned away/.test(t) && !!(await page.$('#rn-again')), 'all at once fails the slate, with the gate\'s marks, and offers another plan');
  check(/Red mark on the gate/.test(t), 'the first turned-away resident is taught by one line');
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
  { // The rope: a real mouse pressed on house 1 and dragged along to house 2 ropes off a batch of 2.
    await setPlan({ policy: 'rolling', batch: 1 });
    await toScene(); await page.waitForTimeout(100);
    await page.evaluate(() => { const c = document.querySelector('.rn-bleed .rs-cam'), h = document.querySelector('[data-sweepi="1"]'); c.scrollLeft += h.getBoundingClientRect().left - c.getBoundingClientRect().left - 10; });
    const a = await mid('[data-sweepi="1"]'), r2 = await (await page.$('[data-sweepi="2"]')).boundingBox();
    let mark = 0;
    await drag(a, { x: Math.min(r2.x + r2.width / 2, 375 - 60), y: a.y }, async () => { mark = await page.$$eval('.rs-rb.rd-swept', x => x.length); });
    check(mark === 2 && (await planNow()).batch === 2 && /BatchSize: 2/.test(await txt('.rn-tpl')) && /BatchSize: 2/.test(await txt('.rn-wrote')), 'dragging a rope from house 1 to house 2 ropes off two houses as it goes, sets a batch of 2, and floats BatchSize: 2');
    check(await page.$$eval('.rs-batch b', x => x.map(b => b.textContent).slice(0, 4).join()) === '1,1,2,2' && /2 closed at a time/.test(await txt('.rs-ropetag')), 'on release the street regroups into batches of 2, and the rope says how many stay open');
    // The health-check gauge: a real drag from the gate down to the ground ignores it.
    await toScene(); await inCam('[data-slide="ignoreHC"]'); await page.waitForTimeout(100);
    const g = await mid('[data-slide="ignoreHC"] .rd-knob'), gb = await (await page.$('[data-slide="ignoreHC"]')).boundingBox();
    await drag(g, { x: g.x, y: gb.y + gb.height + 4 });
    check((await planNow()).ignoreHC === true && /IgnoreHealthCheck: true/.test(await txt('.rn-tpl')) && /ignored/.test(await txt('.rs-hc ~ .rs-tag, .rs-tag.warn')), 'dragging the health-check gauge off the gate sets IgnoreHealthCheck: true');
    check(!(await page.$('.rn-plaques[open]')) && !!(await page.$('.rn-plaques [data-k="batch"]')), 'Beanstalk Row\'s knob rows are folded away as "the same plaques as buttons"');
  }
  await setPlan({ policy: 'rolling', batch: 2, ignoreHC: 'false' });
  await renovate();
  check(!!(await page.$('#rn-deb')), 'rolling in batches of 2 passes the quiet ward');
  const p2 = await permit(false, 1, 'right');
  check(permit.wi && permit.wi.locked && /What if/i.test(permit.wi.text), 'the second job: Seymour\'s what-if changes your plan and waits for every line to be chalked');
  check(permit.wi && permit.wi.ok === true && /READ RIGHT/.test(permit.wi.text), 'chalking the what-if the way it really goes reads right');
  check(/SCAFFOLDING/.test(await txt('#panel')) && await page.evaluate(id => SD.draft.save().town[id].scaf && SD.draft.posterUp(id), p2.qid), 'a wrong permit answer: scaffolding, and the question on the Wall');
  await nextJob();
  // ---- Jobs 3 to 5 ----
  { // The gate's dial: the crowd re-divides while it slides, before it's let go.
    await setPlan({ policy: 'split', split: 10 });
    await toScene(); await inCam('[data-slide="split"]'); await page.waitForTimeout(100);
    const k = await mid('[data-slide="split"] .rd-knob'), e = await mid('[data-slide="split"] [data-stop="2"]');
    let live = -1;
    await drag(k, e, async () => { await page.waitForTimeout(60); live = await page.$$eval('.rs-cw.nw', x => x.length); });
    check(live === 10 && (await planNow()).split === 50 && /NewVersionPercent: 50/.test(await txt('.rn-tpl')) && /50% → new street/.test(await txt('.rs-splittag')), 'sliding the gate\'s dial to 50% sends half the crowd to the new street as it slides: NewVersionPercent: 50');
    await setPlan({ evalT: 4 });
    check((await planNow()).evalT === 4 && /EvaluationTime: 4/.test(await txt('.rn-tpl')), 'the hourglass by the new street sets EvaluationTime');
  }
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
  await runPlan();
  check(/\$LATEST/.test(await txt('.rn-refused')), 'a plan on $LATEST is refused, in the client\'s words');
  await setPlan({ publish: 'true' });
  await runPlan();
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
  check(/template\.yaml/.test(await txt('.rn-tpl')) && /DeletionPolicy:/.test(await txt('.rn-tpl')), 'the template card writes the plan the way AWS does');
  check(await page.$$eval('[data-tok]', x => x.length) === 3, 'the yard has a tray of three DeletionPolicy tags');
  { // A real drag: the Retain seal from the tray onto the first resource in view.
    const tok = await page.$('[data-tok="Retain"]'), drop = await page.$('[data-drop]'), id = await drop.getAttribute('data-drop');
    const tb = await tok.boundingBox(), db = await drop.boundingBox();
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2); await page.mouse.down();
    await page.mouse.move(db.x + db.width / 2, db.y + db.height / 2, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(200);
    check(await page.evaluate(id => { const s = SD.state.save.reno; return s.jobs[s.at].plan[id]; }, id) === 'Retain' && /DeletionPolicy: Retain/.test(await txt('.rn-wrote')), 'dragging the Retain seal onto a resource tags it, and the line it writes floats up over the yard');
    check(!!(await page.$('.rn-blank[data-term="Retain"]')), 'the first Retain is a blank on the card, to write out');
    await page.click('#rn-run'); await page.waitForTimeout(100);
    check((await st()).phase === 'plan' && !!(await page.$('.rn-tplwait')), 'Seymour won\'t run a plan with a blank on its card');
    const bl = await page.$('.rn-blank[data-term="Retain"]');
    await bl.fill('Retian'); await bl.press('Enter'); await bl.fill(''); await bl.press('Enter');
    check(await bl.getAttribute('placeholder') === 'Retain', 'two misses show the word faintly in the blank');
    await bl.fill('retain'); await page.waitForTimeout(520);
    check(await page.evaluate(() => !!SD.state.save.renoKeep.typed.Retain) && !(await page.$('.rn-blank[data-term="Retain"]')), 'written out once (any case), the word is learned for the save');
    await setPlan({ ['cfn:' + id]: 'Delete' });
  }
  await setPlan({ 'cfn:ledger': 'Snapshot' });
  await runPlan();
  check(/Snapshot isn't supported/.test(await txt('.rn-refused')), 'Snapshot on a DynamoDB table is refused');
  check(await play({ 'cfn:ledger': 'Retain' }, true), 'Retain keeps the ledger');
  await noHScroll('office'); await shot('office');

  // ---- A wide screen: still edge to edge, Seymour's two runs side by side ----
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.click('#rn-next'); if ((await st()).phase === 'board') await page.click('#rn-go');
  check(await edge(), 'edge to edge at 1280px');
  await page.click('[data-k="cfn:well"][data-v="Retain"]').catch(() => {});
  await runPlan(); if (await page.$('#rn-skip')) await page.click('#rn-skip');
  await page.evaluate(() => { const s = SD.state.save.reno; s.jobs[s.at].plans = []; });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => SD.state.save.reno && SD.renoUi.draw());
  await shot('wide');
  await page.setViewportSize({ width: 375, height: 667 });

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll Renovation screen checks passed.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
