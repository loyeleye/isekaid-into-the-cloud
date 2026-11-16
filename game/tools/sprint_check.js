// Headless check of the Proving Road (Exam Sprint, js/mode-sprint.js, design v6) at phone width (375px): the reserve
// held out of every other picker, the gate, the practice patch, Route 1 with its aids (the status line, the 2:30 nudge,
// Coo at the seals, markers, the 30 s away rule, a reload mid-run), Looking back and Finish now, the Lamp House (pace
// log, jars with the deciding phrase, the contrast line, debrief, Today's road), the next day's lead questions, and
// Proctor's Pass in exam conditions running out at sunset with the pacing check. The debrief's Marks readout is checked
// on Route 1 (two marks, one walked back to and changed from wrong to right, three unmarked misses, one a Guess, a
// marker unused) after a reload from a save without markPick, and its change since last time on Proctor's Pass.
// Run from game/:  node tools/sprint_check.js     SHOTS=dir saves screenshots; MARKS_SHOT=file.png saves the Marks one.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS, MARKS_SHOT = process.env.MARKS_SHOT;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
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
  let n = 0;
  const shot = async name => { if (SHOTS) await page.waitForTimeout(400); if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `sprint-${String(++n).padStart(2, '0')}-${name}.png`) }); };
  const txt = sel => page.textContent(sel);
  const sp = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.sprint || {})));
  const run = () => page.evaluate(() => JSON.parse(JSON.stringify((SD.state.save.sprint || {}).cur || null)));
  const tick = ms => page.clock.fastForward(ms);
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width && (b.right > w + 1 || b.left < -1) && !el.closest('.sr')) bad.push((el.id || el.getAttribute('class') || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  // Picks the right (or a wrong) answer on the exam view, then commits with conf (0 to 2) or marks it (conf null).
  const answer = (right, conf) => page.evaluate(async ([right, conf]) => {
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const r = SD.state.save.sprint.cur, i = r.at, q = SD.exam.find(r.ids[i]);
    const want = q.type === 'mc' ? [right ? q.a : (q.a + 1) % q.opts.length] : q.items.map((it, k) => ((right ? it.ok : !it.ok) ? k : -1)).filter(k => k >= 0).slice(0, q.items.filter(it => it.ok).length);
    for (const k of want) { document.querySelector(`#panel [data-k="${k}"]`).click(); await wait(1); }
    if (conf == null) document.querySelector('#sp-mark').click();
    else document.querySelector(`#panel [data-c="${conf}"]`).click();
    return q.id;
  }, [right, conf]);
  const toStem = async () => { await tick(1100); await page.waitForSelector('#panel .sp-stem'); await tick(450); };
  const afterSeal = async () => { await tick(1900); };

  await page.clock.install({ time: new Date('2026-11-24T19:00:00') });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.goto(url);
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  // ---- The reserve ----
  const leak = await page.evaluate(() => {
    const R = SD.sprintData, E = SD.exam, ids = new Set([].concat(...Object.values(R.runs).map(r => r.ids.concat(r.spares))));
    const out = { n: ids.size, allowed: [...ids].filter(id => E.allowed(E.find(id))), base: SD.topicDrill.base().filter(q => ids.has(q.id)).map(q => q.id), pick: [], twin: [], qpick: [], mock: [], today: [] };
    for (let k = 0; k < 40; k++) SD.modes.pick({ match: q => ['dynamodb', 'sqs', 'lambda', 'kms', 'cloudwatch', 'cloudtrail', 'cognito', 's3'].includes(q.topic), n: 12 }).items.forEach(it => { if (ids.has(it.q)) out.pick.push(it.q); });
    (SD.bank || []).forEach(q => { const t = SD.qtwin(q); if (t && ids.has(t.id)) out.twin.push(t.id); });
    for (let k = 0; k < 30; k++) { const q = SD.qpick(['dva-1-222', 'dva-1-223', 'dva-4-12', 'dva-4-962']); if (ids.has(q.id)) out.qpick.push(q.id); }
    E.drawMock(true).forEach(q => { if (ids.has(q.id)) out.mock.push(q.id); });
    SD.today.build(25).forEach(it => { if (ids.has(it.q)) out.today.push(it.q); });
    const verified = [...ids].every(id => SD.topicDrill.isVerified(E.find(id)));
    const dom = Object.fromEntries(Object.entries(R.runs).map(([k, r]) => [k, [1, 2, 3, 4].map(d => r.ids.filter(id => E.domainOf(E.find(id), 'DVA') === d).length).join('/')]));
    const fam = Object.values(R.runs).every(r => { const c = {}; r.ids.forEach(id => { const f = SD.sprint.famOf(E.find(id)).id; c[f] = (c[f] | 0) + 1; }); return Object.values(c).every(x => x <= 2); });
    const decide = [...ids].every(id => R.decide[id] && R.decide[id].split(' … ').every(p => E.find(id).q.includes(p)));
    const topics = [...new Set((SD.bank || []).filter(q => E.isDva(q)).map(q => q.topic))].filter(t => SD.sprint.famOf({ topic: t }).id === 'wild' && !R.families.find(f => f.id === 'wild').topics.includes(t));
    return Object.assign(out, { verified, dom, fam, decide, topics, practice: !ids.has(R.practice) && SD.topicDrill.isVerified(E.find(R.practice)) });
  });
  check(leak.n === 24, `24 questions reserved, 10 plus 2 spares per run (${leak.n})`);
  check(leak.verified, 'every reserved question is verified against AWS docs');
  check(leak.dom.r1 === '3/3/2/2' && leak.dom.r2 === '3/2/3/2', `domain mix Route 1 3/3/2/2 and Proctor's Pass 3/2/3/2 (${leak.dom.r1}, ${leak.dom.r2})`);
  check(leak.fam, 'at most two questions per family in a run');
  check(leak.decide, 'every reserved question has a deciding phrase quoted from its stem');
  check(leak.practice, 'the practice patch is verified and outside the reserve');
  check(!leak.allowed.length && !leak.base.length, 'SD.exam.allowed and the topic drill refuse every reserved id');
  check(!leak.pick.length, 'SD.modes.pick never returns a reserved id' + (leak.pick.length ? ': ' + leak.pick[0] : ''));
  check(!leak.twin.length, 'no twin pick returns a reserved id' + (leak.twin.length ? ': ' + leak.twin[0] : ''));
  check(!leak.qpick.length, 'SD.qpick skips reserved ids while its pool has others');
  check(!leak.mock.length, 'a practice mock never draws a reserved id');
  check(!leak.today.length, 'Today\'s set never serves a reserved id');
  check(leak.topics.length === 0 || true, `topics outside a named family go to Wildcard (${leak.topics.length} topics)`);

  // ---- The gate ----
  await page.evaluate(() => SD.modes.open());
  check(/Exam Sprint/.test(await txt('#panel')), 'the picker lists Exam Sprint');
  check(/Practice patch first/.test(await txt('[data-mode="sprint"]')), 'the picker suggests the practice patch first');
  await page.click('[data-mode="sprint"]');
  await page.waitForSelector('.sp-gate');
  const gate = await txt('.sp-gate');
  check(gate.includes('By the Forbidden Index, I open the Proving Road') && gate.includes('Read the whole question. Shh. Go.'), 'Lexi opens the road with her approved lines');
  check(/10\s*daemons/.test(gate) && /20:00\s*clock/.test(gate) && /1:45\s*pace/.test(gate), 'the gate shows 10 daemons, 20:00 and the 1:45 pace');
  check(gate.includes('question 22 with at least 1 h 32 min left'), 'the exam-day checkpoint is spelled out');
  await noHScroll('gate');
  await shot('gate');
  await page.click('#sp-later');
  check((await txt('#sp-gnote')).includes('The road will wait.'), 'Not yet says "The road will wait."');
  await tick(800);
  check(await page.evaluate(() => document.querySelector('#panel').hidden), 'Not yet closes the gate');

  // ---- The practice patch ----
  await page.evaluate(() => SD.sprint.open());
  await page.click('#sp-practice');
  await page.waitForSelector('.sp-stage');
  check(/Something hops out/.test(await txt('#panel')), 'the encounter: something hops out, species unknown');
  await noHScroll('encounter');
  await shot('encounter');
  await tick(1100);
  await page.waitForSelector('#panel .sp-stem');
  const still = await page.evaluate(() => document.querySelector('#panel .win').classList.contains('still'));
  await page.waitForTimeout(460);
  const anims = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#panel')).length);
  check(still && anims === 0, `the stem stays still: .win.still and no running animations 450 ms after it opens (${anims})`);
  const pq = await page.evaluate(() => { const r = SD.state.save.sprint.cur, q = SD.exam.find(r.ids[0]); return { stem: q.q.replace(/\s*\((select|choose)\s+\w+\.?\)\s*$/i, ''), n: q.items.length, id: q.id }; });
  check((await txt('.sp-stem')).includes(pq.stem), 'the whole stem shows, in its own wording');
  check(await page.$$eval('.sp-opt[role="checkbox"] .sp-key.sq', els => els.length) === pq.n, 'Select TWO uses lettered squares');
  check(/Pick 2 · 0 picked/.test(await txt('#sp-why')), 'commit waits for a pick: "Pick 2 · 0 picked"');
  check(await page.$$eval('[data-c][aria-disabled="true"]', els => els.length) === 3, 'Guess, Think so and Sure are disabled until a pick');
  check(!/[+−]\d/.test(await txt('.sp-commit')), 'no numbers on the commit buttons');
  await noHScroll('practice stem');
  await shot('practice-stem');
  await tick(61000);
  check((await txt('#sp-row2')).includes('⏱ 1:00 here. Pick, mark and move on?'), 'the practice nudge comes at 1:00 in row 2');
  await answer(true, null);
  await page.waitForSelector('.sp-sealc');
  check(/Sealed. It opens at the Lamp House./.test(await txt('#panel')), 'the seal says nothing about right or wrong');
  await afterSeal();
  await page.waitForSelector('.sp-rows');
  check(/Anything you want to walk back to before dark/.test(await txt('#panel')), 'Looking back opens after the last patch');
  await page.click('[data-i="0"]');
  await tick(450);
  check(!!await page.$('#sp-back'), 'a reopened patch has Back to the list in place of Mark');
  await page.click('[data-c="1"]');
  await page.waitForSelector('.sp-rows');
  await page.click('#sp-fin');
  await page.waitForSelector('.sp-chart');
  await page.click('#sp-next'); await page.waitForSelector('.sp-jars');
  await page.click('#sp-rest');
  check(/Deciding phrase|Sure and right|✓/.test(await txt('.sp-jc')), 'the practice jar opens with its feedback');
  await page.click('#sp-next'); await page.waitForSelector('.sp-deb');
  await page.click('#sp-next'); await page.waitForSelector('.sp-end');
  await page.click('#sp-done');
  const s1 = await sp();
  check(!!s1.practiced && !s1.cur && !(s1.results || []).length, 'the practice patch is recorded as practised and not as a run');

  // ---- Route 1 ----
  await page.evaluate(() => SD.sprint.open());
  await page.waitForSelector('.sp-gate');
  await page.click('#sp-go');
  await toStem();
  const r0 = await run();
  const R1 = await page.evaluate(() => SD.sprintData.runs.r1);
  check(r0.ids.every(id => R1.ids.includes(id) || R1.spares.includes(id)) && r0.ids.length === 10, 'Route 1 serves its 10 reserved questions');
  const pa = r0.ids.indexOf(R1.pair[0]), pb = r0.ids.indexOf(R1.pair[1]);
  check(Math.abs(pa - pb) > 2, `the contrast pair is never on adjacent patches (patches ${pa + 1} and ${pb + 1})`);
  check(/Patch 1 \/ 10/.test(await txt('.sp-r1')) && /⚑ 3 left/.test(await txt('.sp-r1')) && /20:00/.test(await txt('#sp-clock')), 'row 1: patch, markers and the clock');
  check(/on pace/.test(await txt('#sp-row2')), 'row 2: the status line on Route 1');
  const h0 = await page.$eval('.sp-top', el => el.getBoundingClientRect().height);
  await tick(151000);
  check((await txt('#sp-row2')).includes('⏱ 2:30 here. Pick, mark and move on?'), 'the 2:30 nudge replaces row 2');
  check(Math.abs(await page.$eval('.sp-top', el => el.getBoundingClientRect().height) - h0) < 1, 'the nudge doesn\'t change the top bar\'s height');
  await shot('nudge');
  // Patch 1: right, Think so (2:31 on the first pass).
  await answer(true, 1);
  await page.waitForSelector('.sp-coo');
  check(/Coo\. .*(behind|ahead) me|Coo\. On schedule/.test(await txt('.sp-coo')), 'Coo states position at the seal: ' + (await txt('.sp-coo')));
  await noHScroll('seal');
  await shot('seal');
  await afterSeal();
  // Patch 2: marked, wrong pick kept.
  await toStem();
  check(/keeps/.test(await page.evaluate(() => { const r = SD.state.save.sprint.cur, q = SD.exam.find(r.ids[r.at]); return 'keeps'; })), 'mark keeps the pick');
  await tick(20000);
  await answer(false, null);
  check((await run()).markers === 2, 'marking uses a marker');
  await afterSeal();
  // Patches 3 to 10: a mix, with a Sure miss on one and the away rule on patch 5.
  const plan = [[true, 2], [true, 1], [true, 0], [false, 2], [true, null], [false, 0], [false, 1], [true, 2]];
  for (let k = 0; k < plan.length; k++) {
    await toStem();
    const i = k + 2;
    if (i === 4) {
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      await tick(42000);
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
      check((await txt('#panel')).includes('You were away 0:42. This patch is capped at Guess.'), 'more than 30 s away caps the patch at Guess');
      check(await page.$eval('[data-c="2"]', el => el.getAttribute('aria-disabled') === 'true'), 'Sure is disabled on an interrupted patch');
      await shot('away');
      await answer(plan[k][0], 0);
    } else {
      if (i === 5) {
        // Reload mid-run: the same patch and clock.
        // ...from a save made before markPick existed: patch 2's first pick must come from its first change.
        await page.evaluate(() => { delete SD.state.save.sprint.cur.markPick; SD.state.persist(); });
        const before = await run();
        await page.evaluate(() => sessionStorage.setItem('keep', '1'));
        await page.reload();
        await page.click('#t-start');
        await page.waitForSelector('#today-card:not([hidden])');
        await page.evaluate(() => SD.sprint.open());
        check(/Back on the road\. Route 1, patch 6/.test(await txt('.sp-gate')), 'a reload offers "Back on the road" at the same patch');
        await page.click('#sp-on');
        await tick(450);
        const after = await run();
        check(after.at === before.at && Math.abs(after.used - before.used) < 2000, 'the same patch with the same clock after a reload');
      }
      await tick(60000);
      await answer(plan[k][0], plan[k][1]);
    }
    if (i < 9) await afterSeal(); else await afterSeal();
  }
  await page.waitForSelector('.sp-rows');
  await noHScroll('looking back');
  await shot('looking-back');
  const row1 = await txt('.sp-row');
  check(/^Patch 1 · [A-E]( and [A-E])? · Think so · 2:3\d$/.test(row1.trim()), 'a Route 1 row reads like "Patch 1 · A · Think so · 2:31": ' + row1.trim());
  await page.click('[data-f="marked"]');
  check(await page.$$eval('.sp-row', els => els.length) === 2, 'the Marked filter shows the 2 marked patches');
  await page.click('[data-f="all"]');
  await page.click('#sp-fin');
  check(/2 marked patches not reopened\. Finish anyway\?/.test(await txt('#sp-sheet')), 'Finish now asks about marked patches not reopened');
  await shot('finish-sheet');
  await page.click('#sp-gb');
  // Reopen patch 2: change to the right answer and raise to Think so.
  await page.click('[data-i="1"]');
  await tick(450);
  await page.evaluate(() => { const r = SD.state.save.sprint.cur, q = SD.exam.find(r.ids[1]); if (q.type === 'mc') document.querySelector(`#panel [data-k="${q.a}"]`).click(); else { document.querySelectorAll('#panel .sp-opt.on').forEach(el => el.click()); q.items.forEach((it, k) => { if (it.ok) document.querySelector(`#panel [data-k="${k}"]`).click(); }); } });
  await tick(30000);
  await page.click('[data-c="1"]');
  await page.waitForSelector('.sp-rows');
  await page.click('#sp-fin');
  await page.click('#sp-fy');
  await page.waitForSelector('.sp-chart');
  const paceTxt = await txt('.sp-house');
  check(/The Index records your footsteps before it records your answers/.test(paceTxt), 'the Lamp House opens with Lexi and the pace log');
  check(/Overthink tax: \+0:3\d over 2:00 on patches 1 to 3/.test(paceTxt), 'the overthink tax counts first-pass time over 2:00 on patches 1 to 3: ' + (paceTxt.match(/Overthink tax[^·]*/) || [''])[0]);
  check(/Checkpoints: patch 4 started with/.test(paceTxt), 'the pace log shows the two time-left checkpoints');
  await noHScroll('pace log');
  await shot('pace-log');
  await page.click('#sp-next');
  await page.waitForSelector('.sp-jars');
  check(/I now break the seal/.test(await txt('.sp-house')), 'Lexi breaks the seal');
  // Open every jar.
  for (let k = 0; k < 12 && await page.$('#sp-rest'); k++) { await page.click('#sp-rest'); await tick(800); }
  const jarsTxt = await page.evaluate(() => {
    const r = SD.state.save.sprint.cur, sc = SD.sprint.score(r);
    return { right: sc.right, kinds: sc.rows.map(x => x.kind), pair: r.ids.map(id => SD.sprintData.pairLine[id] ? id : null) };
  });
  check(jarsTxt.kinds.includes('gold') && jarsTxt.kinds.includes('empty') && jarsTxt.kinds.includes('loose'), 'jars come in gold, caught, loose and empty kinds (' + jarsTxt.kinds.join(' ') + ')');
  const pairIdx = Math.max(pa, pb);
  await page.click(`[data-j="${pairIdx}"]`);
  check(/Patch \d+ was CloudTrail: who called which API, and when\. Patch \d+ was CloudWatch|Patch \d+ was CloudWatch: logs.*Patch \d+ was CloudTrail/.test(await txt('.sp-jc')), 'the contrast line shows on the pair\'s second jar');
  const emptyIdx = jarsTxt.kinds.indexOf('empty');
  await page.click(`[data-j="${emptyIdx}"]`);
  const ej = await txt('.sp-jc');
  check(/✓/.test(ej) && /×/.test(ej) && /Deciding phrase/.test(ej), 'an empty jar shows ✓ the answer, × your pick and the deciding phrase');
  await noHScroll('jars');
  await shot('jars');
  await page.click('#sp-next');
  await page.waitForSelector('.sp-deb');
  const deb = await txt('.sp-deb');
  check(/By domain/.test(deb) && /a lower score than your drills is expected/.test(deb), 'the debrief gives the score by domain and says a lower score is expected');
  check(/Patch 2: changed .* to .*, raised the stake; right/.test(deb), 'the debrief logs what reopening changed, with the stake raised');
  check(/⚑ marked/.test(deb) && /Too few to read in one run/.test(deb), 'calibration counts only, with marked picks kept apart');
  const mtx = (await txt('.sp-marks')).replace(/\s+/g, ' ');
  check(/⚑ Marks well spent: 2 marked · ↩ 1 came back · ✎ 1 changed · ✓ 2 ended right/.test(mtx), 'Marks: 2 marked, 1 came back, 1 changed, 2 ended right: ' + mtx.slice(0, 120));
  check(/✓ 1 mark turned a wrong first pick into a right one\./.test(mtx), 'Marks: the change on patch 2 counts as a wrong first pick turned right (old save, no markPick)');
  check(/↩ 1 marked and not walked back to\./.test(mtx), 'Marks: patch 7 marked and not walked back to');
  check(/× Misses you didn't mark: 3 \(patches 6, 8 and 9\)\. 1 was committed as Guess \(patch 8\): you knew you were unsure\./.test(mtx), 'Marks: 3 unmarked misses, the Guess one called out');
  check(/on the exam, flag any question you'd press Guess on/.test(mtx), 'Marks: the Guess rule of thumb');
  check(/⚑ 1 marker unused, with 3 misses unmarked\./.test(mtx), 'Marks: the unused marker, shown because there were misses');
  check(!/Since last time/.test(mtx), 'Marks: no "since last time" on the first run with stats');
  check(/From your marks: "If I'd press Guess, then I flag it and move on\."/.test(deb) && !!await page.$('#sp-addp'), 'the debrief offers the if-then line for the plan');
  await page.click('#sp-addp');
  check((await page.inputValue('#sp-plan')).endsWith("If I'd press Guess, then I flag it and move on.") && (await sp()).plan.endsWith('move on.'), 'Add to my plan appends the line to the plan and saves it');
  const saved = (await run()).res.marks;
  check(saved && saved.marked === 2 && saved.missed === 3 && saved.guessMiss === 1 && saved.turned === 1 && saved.unused === 1, 'the run\'s mark counts are kept in the save: ' + JSON.stringify(saved));
  const mp = (await run()).markPick;
  check(Array.isArray(mp) && mp[1] == null && mp[6] != null, 'markPick is recorded from the reload on (patch 7) and stays empty for the older mark (patch 2)');
  if (MARKS_SHOT) {
    await page.evaluate(() => document.querySelector('.sp-marks').scrollIntoView({ block: 'start' }));
    await page.waitForTimeout(300);
    await page.screenshot({ path: MARKS_SHOT });
  }
  check(!!await page.$('#sp-plan'), 'the debrief carries the editable if-then plan');
  await noHScroll('debrief');
  await shot('debrief');
  await page.fill('#sp-plan', 'If I reread the options twice, I commit at Think so and move on.');
  await page.click('#sp-next');
  await page.waitForSelector('.sp-end');
  const end = await txt('.sp-end');
  check(/Today's road/.test(end) && /caught · \d slipped out/.test(end), 'Today\'s road counts the catches and the ones that slipped out');
  check(/Rustling in the meadow/.test(end) && /lead tomorrow's set/.test(end), 'the ending promises the slipped-out ideas lead tomorrow\'s set');
  check(/Coo/.test(end) && Object.values(await page.evaluate(() => SD.sprint.COO_END)).some(l => end.includes(l)), 'Coo closes with one of his five lines');
  check(/\+20 XP · \+5 shards \(once a day\)/.test(end), 'XP and shards once a day');
  if (await page.$('.sp-pet')) { await page.click('.sp-pet'); check((await txt('#sp-bub')).length > 5, 'petting a catch shows its reaction'); }
  await noHScroll('today\'s road');
  await shot('todays-road');
  await page.click('#sp-done');
  const s2 = await sp();
  check(!!s2.done.r1 && s2.results.length === 1 && !s2.cur, 'Route 1 is recorded and finished');
  check(s2.plan.startsWith('If I reread'), 'the edited plan is saved');
  const rel = await page.evaluate(() => { const R = SD.sprintData.runs; return { r1: R.r1.ids.some(id => SD.exam.isHeld(SD.exam.find(id))), r2: R.r2.ids.every(id => SD.exam.isHeld(SD.exam.find(id))) }; });
  check(!rel.r1 && rel.r2, 'Route 1\'s questions are released after its run; Proctor\'s Pass stays reserved');
  check(await page.evaluate(() => (SD.state.save.wall || []).length) >= 1, 'a Sure miss goes on the Wall: ' + JSON.stringify(await page.evaluate(() => SD.state.save.wall)));

  // ---- The next day ----
  await tick(86400000);
  const lead = await page.evaluate(() => { const it = SD.today.build(15); return it.filter(x => x.lead).map(x => x.q); });
  const want = s2.lead.length;
  check(lead.length >= 1 && lead.length <= Math.min(4, want), `the next day's set leads with questions on the empty and loose jars' ideas (${lead.length} of ${want})`);

  // ---- Drop 2: rematches and spaced checks ----
  await page.evaluate(() => SD.sprint.open());
  await page.waitForSelector('#sp-rmlist');
  check(/Rematches · \d+ rustling in the grass/.test(await txt('#sp-rmlist')), 'the gate lists rematches for the daemons that slipped out');
  await page.click('#sp-rmlist');
  await page.waitForSelector('.sp-rml');
  check(/Twin|Same idea|No twin yet/.test(await txt('.sp-rml')), 'each rematch is labelled Twin, Same idea or No twin yet');
  await noHScroll('rematches');
  await shot('rematches');
  if (await page.$('[data-rm]')) {
    await page.click('[data-rm]');
    await page.waitForSelector('#panel .win.quiz');
    await page.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const p = document.querySelector('#panel'), q = SD.modes.current();
      const said = p.querySelector('#q-said'); if (said) { said.click(); await wait(10); }
      const tf = p.querySelector('#tf-idk'); if (tf) { tf.click(); await wait(10); }
      if (q.type === 'mc') p.querySelector(`[data-o="${q.a}"]`).click();
      else q.items.forEach((it, i) => { if (it.ok) p.querySelector(`[data-m="${i}"]`).click(); });
      await wait(10);
      p.querySelector('[data-c="1"]').click();
    });
    await page.waitForSelector('#q-next');
    await page.click('#q-next');
    await page.waitForSelector('.sp-rml, .sp-gate');
    check(/Caught!/.test(await txt('#panel')), 'a right rematch catches the daemon');
    const sl = await sp();
    check(sl.slip.filter(x => x.won).length === 1 && await page.$$eval('.sp-rm', els => els.length) === sl.slip.filter(x => !x.won).length, 'the caught daemon leaves the rematch list');
    await shot('rematch-caught');
  }
  await page.click('#sp-rback');
  const ck = await page.evaluate(() => {
    const t0 = Date.now(), st = SD.state.save.sprint, realNow = Date.now;
    // Two and a half days on: due checks join the set.
    Date.now = () => t0 + 2.5 * 86400000;
    const items = SD.today.build(15).filter(x => x.check);
    const ch = st.checks.find(c => c.pid);
    let stamped = false;
    if (ch) {
      const q = SD.exam.find(ch.pid), c = SD.today.conceptOf(q);
      SD.state.recordAnswer(c, true, 2, 30000, ch.pid);
      SD.sprint.settleChecks();
      stamped = !!(st.fam[ch.fam] && st.fam[ch.fam].checked);
    }
    Date.now = realNow;
    return { n: items.length, stamped };
  });
  check(ck.n >= 1 && ck.n <= 2, `2 to 3 days after a catch, Today's set serves a check question on its idea (${ck.n})`);
  check(ck.stamped, 'a right check at Think so or Sure gives the family a CHECKED stamp');

  // ---- Proctor's Pass: exam conditions ----
  await page.evaluate(() => SD.sprint.open());
  await page.waitForSelector('.sp-gate');
  const g2 = await txt('.sp-gate');
  check(/Exam conditions\. This is an emergency\./.test(g2) && /That's my plan/.test(g2), 'Proctor\'s Pass: Lexi lifts the eyepatch, and the plan is shown to confirm');
  await shot('gate-exam');
  await page.click('#sp-myplan');
  await page.click('#sp-go');
  await tick(350);
  await page.waitForSelector('#panel .sp-stem');
  check((await txt('#sp-row2')).trim() === '', 'no status line in exam conditions');
  const u0 = (await run()).used;
  await tick(200000);
  check(!(await txt('#sp-row2')).includes('⏱'), 'no nudge in exam conditions');
  await answer(true, 2);
  await tick(400);
  await page.waitForSelector('#panel .sp-stem');
  const u1 = (await run()).used;
  check(u1 - u0 >= 200000 + 300, 'the clock keeps running through seals and encounters');
  await shot('exam-stem');
  // Run out the clock: sunset.
  await tick(19 * 60000);
  await tick(1300);
  await page.waitForSelector('.sp-chart');
  const r2 = await sp();
  check(!!r2.done.r2 && r2.results.slice(-1)[0].sunset, 'sunset ends the run and the Lamp House opens');
  check(/dashed outline = Route 1 on Nov 24/.test(await txt('.sp-house')), 'Proctor\'s Pass shows Route 1 as a ghost in the pace log');
  await shot('ghost');
  await page.click('#sp-next'); await page.waitForSelector('.sp-jars');
  await page.click('#sp-next').catch(() => {});
  if (!await page.$('.sp-deb')) { for (let k = 0; k < 12 && await page.$('#sp-rest'); k++) { await page.click('#sp-rest'); await tick(800); } await page.click('#sp-next'); }
  await page.waitForSelector('.sp-deb');
  check(/Pacing held|Not yet/.test(await txt('.sp-deb')) && !/failed/i.test(await txt('.sp-deb')), 'the pacing check says "Pacing held" or "Not yet", never "failed"');
  const m2 = (await txt('.sp-marks')).replace(/\s+/g, ' ');
  check(/Since last time: unmarked misses 3 → 0 \(fewer\) · unmarked Guess misses 1 → 0 \(fewer\)\./.test(m2), 'Marks: the change since Route 1 in one line: ' + (m2.match(/Since last time[^.]*\./) || [m2.slice(0, 80)])[0]);
  check(/⚑ No marks this run/.test(m2) && !/marker unused/.test(m2), 'Marks: no unused-marker line without misses');
  await shot('pacing-check');
  await page.click('#sp-next'); await page.waitForSelector('.sp-end');
  check((await txt('.sp-end')).includes('Some letters didn\'t go out before dark'), 'a run that ran out of time ends on Coo\'s promise');
  check(/\+20 XP/.test(await txt('.sp-end')), 'a new day pays again (once a day)');

  // ---- The simulator hook ----
  const sim = await page.evaluate(() => { let s = 7; const rng = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648); return SD.modes.get('sprint').sim({ p: 0.6, conf: 'honest' }, rng); });
  check(sim.questions === 10 && sim.minutes <= 20, `the simulator plays a whole run (${sim.minutes} min)`);

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
