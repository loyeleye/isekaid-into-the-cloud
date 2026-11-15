// Headless check of Incident Commander (js/mode-ic.js, build spec v4) at phone width (375px): the Play button and
// picker, the first-run walkthrough on a real incident, 4 waves of Domain 1 and 4 incidents on the request path with
// clocks of 5, 7 or 9, the whole stem free in the question (never on the board's screen), the shared stakes, every
// answer ticking the other clocks, a wrong answer retried as its twin, a 15% timeout returning next wave, saving and
// resuming, results with one thing to do differently, Dutch, Coo and Bru from the second shift, and 0% with "Retry
// this wave".
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
  const work = async (i, ok, conf) => { await page.click(`[data-inc="${i}"]`); await page.waitForSelector('#panel .win.quiz'); await answer(ok, conf); await next(); await page.waitForTimeout(40); };

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
  const firstAsk = await page.evaluate(id => SD.modes.split(SD.exam.find(id)).ask, s0.board[0].q);
  check((await txt('.md-walk')).includes(firstAsk.slice(0, 50)), 'step 1 shows a real incident from the first wave');
  check(/Kyu held the Cloud's pager/.test(await txt('.md-walk')), 'Uptima is the secondary pager (Story Bible)');
  await noHScroll('walkthrough');
  await shot('walk');
  await page.click('#md-next'); await page.click('#md-next'); await page.click('#md-next');
  await page.waitForSelector('.ic-board');

  // ---- The shift and the board ----
  check(s0.board.length === 3 && s0.wave === 1, 'wave 1 lands 3 incidents');
  check(s0.queue.length + s0.board.length === 12, 'a shift holds 12 incidents over 4 waves (' + (s0.queue.length + s0.board.length) + ')');
  const all0 = s0.queue.concat(s0.board);
  const other = all0.filter(x => x.other).length;
  check(other === 3, `1 in 4 incidents are due from other topics (${other})`);
  const own = await page.evaluate(ids => ids.map(id => { const q = SD.exam.find(id); return [SD.exam.domainOf(q), q.topic, !!SD.ic.nodeOf(q)]; }), all0.filter(x => !x.other).map(x => x.q));
  check(own.every(x => [1, 4].includes(x[0]) && x[2]), 'the rest are Domain 1 and 4 questions on request-path services (' + [...new Set(own.map(x => x[1]))].join(', ') + ')');
  check(own.some(x => x[0] === 1), 'Development (Domain 1) questions are in the shift');
  check(s0.board.every(b => [5, 7, 9].includes(b.clock)), 'clocks start at 5, 7 or 9 ticks (' + s0.board.map(b => b.clock).join(', ') + ')');
  const cards = await page.$$eval('.ic-card', els => els.map(e => e.textContent.replace(/\s+/g, ' ')));
  check(cards.every(c => /SEV-\d/.test(c) && /\d ticks? left/.test(c)), 'each card shows its severity and ticks left in words');
  check(cards.every(c => /API Gateway|Lambda|DynamoDB|SQS|S3|[A-Z]{2,}/.test(c)), 'each card names its service');
  await noHScroll('board');
  await shot('board');
  const qual = await page.evaluate(() => {
    const pool = SD.topicDrill.base().filter(SD.ic.match);
    const withQ = pool.filter(q => /\b(MOST|LEAST)\b/.test(q.q.split(/(?<=[.?!])\s+(?=[A-Z0-9"'(])/).slice(-1)[0]));
    return [withQ.length, withQ.filter(q => /^(MOST|LEAST)\b/.test(SD.modes.split(q).qual)).length, pool.length];
  });
  check(qual[0] > 0 && qual[1] === qual[0], `the MOST/LEAST qualifier shows on the card (${qual[1]} of ${qual[0]}; pool ${qual[2]})`);

  // ---- Work an incident: the whole stem, right and Sure ----
  const others0 = s0.board.slice(1).map(b => b.clock);
  await page.click('[data-inc="0"]');
  await page.waitForSelector('#panel .win.quiz');
  const isMc = await page.evaluate(() => SD.modes.current().type === 'mc');
  check(!isMc || !!await page.$('#q-said'), 'Say it first: name the cause before the fixes show');
  check(!await page.$('.ic-board'), 'the board and the question never share the screen');
  const stem = await page.evaluate(() => SD.modes.current().q);
  check((await txt('.q-q')) === stem, 'the whole stem shows, free to read');
  check(!!await page.$('#md-stop'), 'the quiz window keeps Stop for now');
  await noHScroll('incident quiz');
  await answer(true, 2);
  await shot('verdict');
  check(/Sure, right: \+3/.test(await txt('.verdict-row')), 'the verdict shows the shared stakes');
  await next();
  await page.waitForSelector('.ic-board');
  let s1 = await ic();
  check(s1.pts === 3 && s1.board.length === 2 && s1.log[0].ok === 1, 'right: the incident is resolved and pays +3');
  check(JSON.stringify(s1.board.map(b => b.clock)) === JSON.stringify(others0.map(c => c - 1)), 'the answer ticked every other clock by one');
  check(s1.budget === 100, 'a right answer leaves the budget alone (budget is only for survival)');
  check(/Since your last answer: .*resolved/.test(await txt('.ic-since')), 'the board says what changed since your last answer');

  // ---- Wrong: a retry on its twin, or missed ----
  const before = s1.board[0];
  await work(0, false, 1);
  let s2 = await ic();
  const twin = s2.board.find(b => b.orig === before.orig);
  check(twin ? twin.q !== before.q : s2.log.some(l => l.orig === before.orig && !l.ok), `wrong: ${twin ? 'it stays open as its twin, never the same question' : 'no twin, so it is logged as missed'}`);
  check(s2.pts === 2, 'Think so and wrong costs 1 point');

  // ---- A timeout: 15%, back next wave as its twin ----
  await page.evaluate(() => { const s = SD.state.save.ic; s.board.forEach((b, i) => { if (i) b.clock = 1; }); SD.state.persist(); SD.ic.board(); });
  const s5 = await ic();
  if (s5.board.length > 1) {
    check(/SEV-1/.test(await txt('.ic-board')), 'a card at one tick reads SEV-1');
    await work(0, true, 1);
    const s6 = await ic();
    const n = s5.board.length - 1;
    check(s6.budget === 100 - 15 * n, `a timeout costs 15% of the budget each (100% → ${s6.budget}%)`);
    const paged = s5.board.slice(1);
    const back = s6.carry.concat(s6.board);
    check(paged.every(p => back.some(b => b.orig === p.orig)), 'timed-out incidents come back next wave, not skipped');
    const tw = await page.evaluate(([paged, back]) => paged.every(p => { const b = back.find(x => x.orig === p.orig); return b && (b.q !== p.q || !SD.qtwin(SD.exam.find(p.q))); }), [paged, back]);
    check(tw, 'and come back as their twin where one exists');
  }

  // ---- Saved after every answer: reload and resume ----
  const s6b = await ic();
  await page.evaluate(() => sessionStorage.setItem('keep', '1'));
  await page.reload();
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');
  await page.click('#td-play');
  check(/Resume · wave \d of 4/.test(await txt('[data-mode="ic"]')), 'after a reload the picker offers Resume with the wave');
  await page.click('[data-mode="ic"]');
  await page.waitForSelector('.ic-board');
  const s7 = await ic();
  check(JSON.stringify(s7.board) === JSON.stringify(s6b.board) && s7.pts === s6b.pts, 'resuming lands on the same board');

  // ---- Play the shift out (first shift: no between-wave picks) ----
  let sawPick = false;
  for (let k = 0; k < 40; k++) {
    const st = await ic();
    if (st.phase === 'done') break;
    if (st.phase === 'pick') { sawPick = true; await page.click('[data-pick="coo"]'); continue; }
    if (st.phase === 'zero') { await page.click('#ic-retry'); continue; }
    await work(0, true, 1);
  }
  const s8 = await ic();
  check(!sawPick, 'the first shift has no between-wave picks (one new rule per night)');
  check(s8.phase === 'done' && s8.wave >= 4, 'the shift ends after wave 4');
  check(s8.log.length === 12, `every incident was worked (${s8.log.length})`);
  const res = (await txt('#panel')).replace(/\s+/g, ' ');
  check(/incidents resolved/.test(res) && /Points: [+−±]\d+/.test(res), 'results: incidents resolved and points');
  check(/Next shift: /.test(res), 'results: one thing to do differently');
  check(await page.$$eval('.ic-log li', l => l.length) === s8.log.length, 'results: every incident\'s fix in one line');
  check(/Think so \d+ of \d+ right/.test(await page.$$eval('.md-calt tr', t => t.map(r => [...r.children].map(c => c.textContent).join(' ')).join(' | '))), 'results: the calibration readout');
  check(/Why did that work/.test(res), 'results: Pip asks why it worked');
  check(/\+20 XP · \+5 shards/.test(res), 'results: the shift pays XP and shards');
  await noHScroll('results');
  await shot('results');

  // ---- Second shift: between-wave picks ----
  await page.click('#ic-again');
  await page.waitForSelector('.ic-board');
  check((await ic()).picksOn, 'from the second shift, between-wave picks are on');
  for (let k = 0; k < 6; k++) { const st = await ic(); if (st.phase !== 'board' || st.wave > 1) break; await work(0, true, 1); }
  check((await ic()).phase === 'pick' && /Dutch/.test(await txt('#panel')) && /Coo/.test(await txt('#panel')) && /Bru/.test(await txt('#panel')), 'after wave 1: one free pick from Dutch, Coo or Bru');
  await noHScroll('pick');
  await shot('pick');
  await page.click('[data-pick="dutch"]');
  await page.waitForSelector('.ic-board');
  const d0 = (await ic()).board[1].clock;
  await page.click('[data-dutch="1"]');
  check((await ic()).board[1].clock === d0 + 2 && !await page.$('[data-dutch]'), 'Dutch: +2 ticks on the clock you choose, once');
  // Coo and Bru, on the state machine directly.
  const perks = await page.evaluate(() => {
    const s = JSON.parse(JSON.stringify(SD.state.save.ic)); s.sim = true;
    s.perks = { coo: 1 }; s.budget = 100; s.board.forEach((b, i) => { b.clock = i ? 1 : 5; });
    const n = s.board.length - 1; SD.ic.settle(s, s.board[0], { ok: true, conf: 1, pts: 2 });
    const coo = s.budget;
    const t = JSON.parse(JSON.stringify(SD.state.save.ic)); t.sim = true; t.perks = { bru: 1 };
    const c0 = t.board.slice(1).map(b => b.clock); SD.ic.settle(t, t.board[0], { ok: true, conf: 1, pts: 2 });
    return [n, coo, JSON.stringify(c0) === JSON.stringify(t.board.map(b => b.clock))];
  });
  check(perks[1] === 100 - Math.ceil(15 / 2) - 15 * (perks[0] - 1), `Coo: the next timeout costs half (${perks[1]}%)`);
  check(perks[2], 'Bru: the next answer ticks no other clock');

  // ---- 0%: retry the wave in one tap, or end ----
  await page.evaluate(() => { SD.state.save.ic.budget = 5; SD.state.persist(); SD.ic.board(); });
  const pre = await ic();
  await work(0, false, 2);
  check((await ic()).phase === 'zero' && /Retry this wave/.test(await txt('#panel')), 'a Sure miss at 5% stops the shift at 0% with "Retry this wave"');
  check(/Kyu never woke me/.test(await txt('#panel')), 'Uptima wakes up at 0%');
  const logged = (await ic()).log.length;
  await page.click('#ic-retry');
  const r1 = await ic();
  check(r1.phase === 'board' && r1.budget > 0 && r1.board.length === r1.waveStart.board.length && r1.log.length === logged, 'retry restarts the wave and keeps the answers logged');
  await page.evaluate(() => { SD.state.save.ic.budget = 5; SD.state.persist(); SD.ic.board(); });
  await work(0, false, 2);
  await page.click('#ic-end');
  const s9 = await ic();
  check(s9.phase === 'done' && s9.zero, 'End the shift: results at 0%');
  check(!/\+20 XP/.test(await txt('#panel')), 'the second shift today pays nothing more');
  const back = await page.evaluate(() => SD.state.save.icBacklog.map(x => x.q));
  check(back.length >= 1, `the open incidents wait for the next shift (${back.length})`);
  await page.click('#ic-again');
  await page.waitForSelector('.ic-board');
  const s10 = await ic();
  check(back.every(id => s10.board.concat(s10.queue).some(x => x.q === id)), 'the next shift starts with them');
  check(await page.evaluate(() => SD.state.save.wall.length >= 1), 'Sure misses went up on the Wall');

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page or console errors');
  if (fails.length) { console.error(`${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('OK: the Incident Commander checks all pass, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
