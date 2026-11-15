// Headless check of Incident Commander (js/mode-ic.js) at phone width (375px): the Play button and picker, the first-run
// walkthrough on a real incident, the pager board (symptom, qualifier, clocks in words), Say it first and the scenario
// repeated in the quiz window, the shared stakes, clocks ticking per answer, a timeout costing budget and coming back
// next wave, a wrong answer staying open, saving after every incident and resuming, the config shop (verified
// questions only, the corrected trade-offs), the results screen, and an early end at 0% with the backlog carried over.
// Run from game/:  node tools/ic_check.js     SHOTS=dir saves screenshots.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
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
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'ic-' + name + '.png') }); };
  const boot = async () => {
    await page.goto(url);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    await page.click('#t-start');
    await page.waitForSelector('#today-card:not([hidden])');
  };
  // Nothing wider than the phone: the page, the title screen, and every element of the card and any open window.
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      const t = document.querySelector('#screen-title'), ox = getComputedStyle(t).overflowX;
      if (!t.hidden && t.scrollWidth > t.clientWidth && ox !== 'hidden' && ox !== 'clip') bad.push('title ' + t.scrollWidth);
      document.querySelectorAll('#today-card *, #panel:not([hidden]) .win *').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const state = () => page.evaluate(() => document.querySelector('#today-card').dataset.state);
  const totalXp = () => page.evaluate(() => { const s = SD.state.save; let t = s.xp; for (let l = 1; l < s.level; l++) t += SD.state.xpFor(l); return t; });
  // Answers the question on screen: right (from the question SD.today is asking) or wrong, with a confidence.
  const answer = (right, conf) => page.evaluate(async ([right, conf]) => {
    const p = document.querySelector('#panel'), q = SD.modes.current();
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const said = p.querySelector('#q-said'); if (said) { said.click(); await wait(10); }
    const tf = p.querySelector('#tf-idk'); if (tf) { tf.click(); await wait(10); }
    if (q.type === 'mc') {
      const want = right ? q.a : q.opts.findIndex((o, i) => i !== q.a);
      p.querySelector(`[data-o="${want}"]`).click();
    } else if (q.type === 'multi') {
      q.items.forEach((it, i) => { if (right ? it.ok : !it.ok) p.querySelector(`[data-m="${i}"]`).click(); });
    } else if (q.type === 'num') {
      const inp = p.querySelector('#q-num'); inp.value = right ? q.lo : q.hi + 1e6; inp.dispatchEvent(new Event('input'));
    } else if (q.type === 'order') {
      for (let i = 0; i < q.items.length; i++) { p.querySelector(`[data-ord="${right ? i : q.items.length - 1 - i}"]`).click(); await wait(5); }
    }
    await wait(10);
    p.querySelector(`[data-c="${conf}"]`).click();
    await wait(10);
    return q.id;
  }, [right, conf]);


  const next = () => page.click('#q-next');
  const ic = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.ic)));
  const txt = sel => page.textContent(sel);

  await page.clock.install({ time: new Date('2026-11-17T20:00:00') });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  // ---- Picker and first run ----
  check(!!await page.$('#td-play'), 'the Today card has a Play button');
  await page.click('#td-play');
  check(/Incident Commander/.test(await txt('#panel')), 'the picker lists Incident Commander');
  await page.click('[data-mode="ic"]');
  check(/Step 1 of 3/.test(await txt('#panel')), 'the first run opens the 3-step walkthrough');
  const s0 = await ic();
  const firstQ = await page.evaluate(id => SD.ic.split(SD.exam.find(id)).ask, s0.board[0].q);
  check((await txt('.md-walk')).includes(firstQ.slice(0, 60)), 'step 1 shows a real incident from the first wave');
  check(/Kyu held the Cloud's pager/.test(await txt('.md-walk')), 'Uptima is the secondary pager (Story Bible)');
  await noHScroll('walkthrough');
  await shot('walk');
  await page.click('#md-next'); await page.click('#md-next'); await page.click('#md-next');
  await page.waitForSelector('.ic-board');

  // ---- The board ----
  check(s0.board.length === 2 && s0.wave === 1, 'wave 1 lands 2 incidents');
  check(s0.queue.length + s0.board.length === 14, 'a shift holds 14 incidents (' + (s0.queue.length + s0.board.length) + ')');
  const other = s0.queue.concat(s0.board).filter(x => x.other).length;
  check(other >= 3 && other <= 4, `about 1 in 4 incidents come from other topics (${other})`);
  const cards = await page.$$eval('.ic-card', els => els.map(e => e.textContent.replace(/\s+/g, ' ')));
  check(cards.every(c => /SEV-\d/.test(c) && /\d ticks? left/.test(c)), 'each card shows its severity and ticks left in words');
  check(s0.board.every(b => b.clock >= 3 && b.clock <= 5), 'clocks start at 3 to 5 ticks');
  await noHScroll('board');
  await shot('board');
  // Qualifiers: every pack question whose question line asks for MOST or LEAST keeps it on its card.
  const qual = await page.evaluate(() => {
    const pool = SD.topicDrill.pool(SD.topicDrill.preset('pack-trouble'));
    const withQ = pool.filter(q => /\b(MOST|LEAST)\b/.test(q.q.split(/(?<=[.?!])\s+(?=[A-Z0-9"'(])/).slice(-1)[0]));
    return [withQ.length, withQ.filter(q => /^(MOST|LEAST)\b/.test(SD.ic.split(q).qual)).length];
  });
  check(qual[0] > 0 && qual[1] === qual[0], `the MOST/LEAST qualifier is pulled onto the card (${qual[1]} of ${qual[0]})`);
  check(cards.every(c => /clues? to read|Asks for|\?/.test(c)), 'each card shows the question line, and the scenario as clues to read');

  // ---- Work an incident: right and Sure ----
  const c1 = s0.board[1].clock;
  await page.click('[data-inc="0"]');
  await page.waitForSelector('#panel .win.quiz');
  const sp0 = await page.evaluate(() => SD.ic.split(SD.modes.current()));
  check(await page.$$eval('.clue[data-cl]', b => b.length) === sp0.items.length, `the scenario's ${sp0.items.length} clues start closed in the quiz window`);
  check((await txt('.q-q')) === sp0.ask, 'the question line stays visible');
  check((await page.$$('.opt.act')).length >= 2 && /Apply a fix/.test(await txt('.act-l')), 'the options are fixes to apply');
  if (sp0.items.length) await page.click('[data-cl="0"]');
  check(!!await page.$('#md-stop'), 'the quiz window keeps Stop for now');
  await noHScroll('incident quiz');
  await answer(true, 2);
  await shot('verdict');
  check(/Sure, right: \+3/.test(await txt('.verdict-row')), 'the verdict shows the shared stakes');
  await next();
  await page.waitForSelector('.ic-board');
  let s1 = await ic();
  check(s1.pts === 3 && s1.board.length === 1 && s1.log.length === 1 && s1.log[0].ok === 1, 'right: the incident is resolved and pays +3');
  check(s1.board[0].clock === c1 - 1, 'the answer ticked the other incident by one');
  check(s1.budget === 100, 'the budget stays capped at 100%');
  check(JSON.stringify(s1.log[0].ev) === JSON.stringify([[sp0.items.length ? 1 : 0, sp0.items.length, 1]]), 'the log records how many clues were open before the fix (' + JSON.stringify(s1.log[0].ev) + ')');

  // ---- Wrong: it stays open (as its twin) or goes to the next wave ----
  const before = s1.board[0];
  await page.click('[data-inc="0"]');
  await answer(false, 1);
  await next();
  await page.waitForTimeout(40);
  let s2 = await ic();
  const stayed = s2.board.length === 1 && s2.board[0].orig === before.orig && s2.board[0].q !== before.q;
  const carried = s2.carry.some(x => x.orig === before.orig) || (s2.wave === 2 && s2.board.some(b => b.orig === before.orig));
  check(stayed || carried, `wrong: the incident stays open (${stayed ? 'as its twin' : 'handed to the next wave'})`);
  check(s2.pts === 2, 'Think so and wrong costs 1 point');
  // Resolve what's left of wave 1.
  const clear = async (conf) => {
    for (let k = 0; k < 6; k++) {
      const st = await ic();
      if (st.phase !== 'board' || !st.board.length) break;
      if (!await page.$('[data-inc="0"]')) break;
      await page.click('[data-inc="0"]'); await answer(true, conf == null ? 1 : conf); await next(); await page.waitForTimeout(40);
    }
  };
  if (stayed) await clear();

  // ---- The shop after wave 1 ----
  let s3 = await ic();
  check(s3.phase === 'shop', 'after wave 1 the config shop opens (verified questions have landed)');
  const shop = (await txt('#panel')).replace(/\s+/g, ' ');
  check(/also caps it there, so above the cap it throttles/.test(shop), 'shop: reserved concurrency also caps (corrected fact)');
  check(/REST APIs only; HTTP APIs have no cache/.test(shop), 'shop: the API Gateway cache is REST-only (corrected fact)');
  check(/Speeds up eventually consistent reads. Strongly consistent reads and writes go through/.test(shop), 'shop: DAX speeds up eventually consistent reads only (corrected fact)');
  check(/DAX.*Closed: no verified question on it yet/.test(shop), 'shop: a fix with no verified question stays closed');
  await noHScroll('shop');
  await shot('shop');
  const fq = await page.evaluate(() => SD.ic.FIXES.map(f => [f.id, SD.ic.fixQuestions(f).every(q => SD.topicDrill.isVerified(q)), SD.ic.fixQuestions(f).length]));
  check(fq.every(x => x[1]), 'shop questions are verified only (' + fq.map(x => x[0] + ' ' + x[2]).join(', ') + ')');
  check(s3.pts >= 3 || !await page.$('[data-fix]'), 'under 3 points no fix can be bought');
  await page.evaluate(() => { SD.state.save.ic.pts = 5; SD.state.persist(); SD.ic.board(); });
  s3 = await ic();
  const buyable = await page.$('[data-fix]');
  check(!!buyable, 'with 3 points a fix can be bought');
  const fid = await buyable.getAttribute('data-fix');
  await buyable.click();
  await page.waitForSelector('#panel .win.quiz');
  const sq = await page.evaluate(() => SD.modes.current().id);
  check(await page.evaluate(([id, f]) => SD.topicDrill.isVerified(SD.exam.find(id)) && SD.ic.FIXES.find(x => x.id === f).about(SD.exam.find(id)), [sq, fid]), 'buying asks a verified question about that feature');
  await answer(true, 1);
  await next();
  await page.waitForSelector('.ic-board');
  let s4 = await ic();
  check(s4.fixes.includes(fid) && s4.pts === s3.pts + 2 - 3, `right: the fix is installed for 3 points (${s3.pts} → ${s4.pts})`);
  check(s4.wave === 2 && s4.board.length >= 3 || s4.board.length >= 3, 'wave 2 lands');

  // ---- A timeout: costs budget and comes back next wave ----
  await page.evaluate(() => { const s = SD.state.save.ic; s.board.forEach((b, i) => { if (i) b.clock = 1; }); SD.state.persist(); SD.ic.board(); });
  const s5 = await ic();
  check(/SEV-1/.test(await txt('.ic-board')), 'a card at one tick reads SEV-1');
  await page.click('[data-inc="0"]'); await answer(true, 1); await next(); await page.waitForTimeout(60);
  const s6 = await ic();
  const timedOut = s5.board.length - 1;
  check(s6.budget === s5.budget - 20 * timedOut, `a timeout costs 20% budget each (${s5.budget}% → ${s6.budget}%)`);
  check(s6.carry.length === timedOut || s6.wave === s5.wave + 1, 'timed-out incidents go to the next wave, not skipped');

  // ---- Saved after every incident: reload and resume ----
  await page.evaluate(() => sessionStorage.setItem('keep', '1'));
  await page.reload();
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');
  await page.click('#td-play');
  check(/Resume · wave \d of 5/.test(await txt('[data-mode="ic"]')), 'after a reload the picker offers Resume with the wave');
  await page.click('[data-mode="ic"]');
  await page.waitForSelector('.ic-board, .ic-fix');
  const s7 = await ic();
  check(JSON.stringify(s7.board) === JSON.stringify(s6.board) && s7.pts === s6.pts, 'resuming lands on the same board');

  // ---- Play the shift out ----
  for (let k = 0; k < 40; k++) {
    const st = await ic();
    if (st.phase === 'done') break;
    if (st.phase === 'shop') { await page.click('#ic-skip'); await page.waitForTimeout(30); continue; }
    await page.click('[data-inc="0"]'); await answer(true, 1); await next(); await page.waitForTimeout(40);
  }
  const s8 = await ic();
  check(s8.phase === 'done', 'the shift ends after wave 5');
  check(s8.log.length === 14, `every incident was worked (${s8.log.length} logged, ${s8.left || 0} left over, ${s8.queue.length} never landed)`);
  const res = (await txt('#panel')).replace(/\s+/g, ' ');
  check(/incidents resolved/.test(res) && /Points: [+−±]\d+/.test(res), 'results: incidents resolved and points');
  check(await page.$$eval('.ic-log li', l => l.length) === s8.log.length, 'results: every incident\'s fix in one line');
  check(/Think so \d+ of \d+ right/.test(await page.$$eval('.md-calt tr', t => t.map(r => [...r.children].map(c => c.textContent).join(' ')).join(' | '))), 'results: the calibration readout');
  check(/Why did that work/.test(res), 'results: Pip asks why it worked');
  check(/Investigate or act/.test(res) && /clues before your fixes/.test(res), 'results: investigate or act, from the clue log');
  check(/\+20 XP · \+5 shards/.test(res), 'results: the shift pays XP and shards');
  await noHScroll('results');
  await shot('results');

  // ---- Budget at 0 ends early, and what's open starts the next shift ----
  await page.click('#ic-again');
  await page.waitForSelector('.ic-board');
  await page.evaluate(() => { SD.state.save.ic.budget = 10; SD.state.persist(); SD.ic.board(); });
  const open = (await ic()).board.map(b => b.q);
  await page.click('[data-inc="0"]'); await answer(false, 2); await next(); await page.waitForTimeout(60);
  const s9 = await ic();
  check(s9.phase === 'done' && s9.zero, 'a Sure miss at 10% budget ends the shift at 0%');
  check(/Kyu never woke me/.test(await txt('#panel')), 'Uptima wakes up at 0%');
  check(!/\+20 XP/.test(await txt('#panel')), 'the second shift today pays nothing more');
  const back = await page.evaluate(() => SD.state.save.icBacklog.map(x => x.q));
  check(back.length >= 1, `the open incidents wait for the next shift (${back.length})`);
  await page.click('#ic-again');
  await page.waitForSelector('.ic-board');
  const s10 = await ic();
  check(back.every(id => s10.board.concat(s10.queue).some(x => x.q === id)), 'the next shift starts with them');
  const missQ = await page.evaluate(() => SD.state.save.wall.map(w => w.id));
  check(missQ.length >= 1, 'the Sure miss went up on the Wall');

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page or console errors');
  if (fails.length) { console.error(`${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('OK: the Incident Commander checks all pass, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
