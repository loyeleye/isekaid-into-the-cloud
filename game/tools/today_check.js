// Headless check of the Today card (js/today.js) at phone width (375px): a fresh save's date prompt with New game
// still reachable; setting the date; a daily set answered through the normal quiz, stopped and resumed (also after a
// reload), paying XP; the done-for-today state and +10 more; a wall poster that comes down only after right answers on
// two different days (the clock is faked); Kyu's note against Uptima's card by story flag; the readiness board.
// Fails on any page error or console error, and on horizontal scroll at 375px.
// Run from game/:  node tools/today_check.js     SHOTS=dir saves screenshots.
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
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'today-' + name + '.png') }); };
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
    const p = document.querySelector('#panel'), q = SD.today.current();
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const said = p.querySelector('#q-said'); if (said) { said.click(); await wait(10); }
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

  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();

  // ---- A fresh save ----
  check(await state() === 'first', 'fresh save: the card asks for the exam date');
  check(await page.inputValue('#td-date-first') === '2026-11-30', 'the date input defaults to 2026-11-30');
  check(/Nov 30 · \d+ days?/.test(await page.textContent('#td-date')), 'the exam-date chip reads "Nov 30 · N days"');
  check(/—\sK\./.test(await page.textContent('.td-line')) && await page.$('.td-kyu'), 'before Uptima joins, Kyu leaves the card, signed "— K."');
  const reach = await page.evaluate(() => {
    const b = document.querySelector('#t-new'); if (!b) return 'no #t-new';
    b.scrollIntoView({ block: 'nearest' });
    const r = b.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return r.bottom <= innerHeight && (hit === b || b.contains(hit)) ? 'ok' : 'covered or off screen';
  });
  check(reach === 'ok', 'fresh save: New game is still reachable (' + reach + ')');
  await shot('fresh');
  await noHScroll('fresh save');

  // ---- Set the date: the baseline is offered ----
  await page.fill('#td-date-first', '2026-11-30');
  await page.click('#td-setdate');
  check(await page.evaluate(() => SD.state.save.examDate) === '2026-11-30', 'setting the date saves S.save.examDate');
  check(await page.textContent('.td-main') === 'Take the 33-question baseline', 'once the date is set, the main action is the 33-question baseline');
  await page.click('#td-base');
  await page.waitForTimeout(50);
  check(await page.evaluate(() => !!SD.examHall || [...document.querySelectorAll('.sysnote')].some(n => /coming soon/.test(n.textContent))), 'without the Exam Hall, the baseline says "Exam Hall coming soon"');

  // ---- A daily set: answer, stop, resume ----
  const xp0 = await totalXp();
  await page.click('#td-skip');
  await page.waitForSelector('#panel .win.quiz');
  check(await page.evaluate(() => SD.state.save.todaySet.items.length) === 15, 'the daily set has 15 questions at 375px');
  const mix = await page.evaluate(() => { const s = SD.state.save.todaySet; return { fresh: s.items.filter(i => i.fresh).length, task: s.items.filter(i => SD.exam.isTaskConcept(i.c)).length }; });
  check(mix.fresh === 5, `5 of them are never-answered task-concept questions (${mix.fresh})`);
  check(/1 \/ 15/.test(await page.textContent('.td-prog')), 'the quiz window shows the progress count "1 / 15"');
  await noHScroll('quiz window');
  const qids = [];
  for (let i = 0; i < 3; i++) { qids.push(await answer(true, 1)); await next(); await page.waitForSelector('#panel .win.quiz #td-stop'); }
  check(/4 \/ 15/.test(await page.textContent('.td-prog')), 'after three answers the count reads "4 / 15"');
  check(await page.evaluate(ids => ids.every(id => SD.state.save.qlog[id]), qids), 'answers record through the normal quiz (S.save.qlog)');
  await shot('quiz');
  await page.click('#td-stop');
  check(await page.evaluate(() => document.querySelector('#panel').hidden && SD.state.save.todaySet.i === 3), 'Stop for now closes the quiz and keeps 3 answered');
  check(await state() === 'resume' && /Resume · 3 \/ 15/.test(await page.textContent('.td-main')), 'the card offers "Resume · 3 / 15"');
  await shot('resume');
  // A reload keeps it.
  await page.evaluate(() => sessionStorage.setItem('keep', '1'));
  await boot();
  check(/Resume · 3 \/ 15/.test(await page.textContent('.td-main')), 'after a reload the card still resumes at 3 / 15');
  await page.click('#td-go');
  await page.waitForSelector('#panel .win.quiz');
  check(/4 \/ 15/.test(await page.textContent('.td-prog')), 'resuming carries on at question 4');
  // A sure miss goes up on the wall; stopping on the feedback screen still counts that answer.
  const missed = await answer(false, 2);
  await page.click('#td-stop');
  check(await page.evaluate(id => SD.state.save.todaySet.i === 4 && SD.state.save.wall.some(w => w.id === id), missed), 'a sure miss goes up on the wall, and Stop on its feedback still counts it');
  await page.click('#td-go');
  for (let i = 4; i < 15; i++) {
    await page.waitForSelector('#panel .win.quiz #td-stop');
    await answer(true, 1); await next();
  }
  await page.waitForSelector('#td-again');
  const xp1 = await totalXp();
  check(xp1 > xp0, `finishing the set pays XP (${xp0} -> ${xp1})`);
  check(await page.evaluate(() => SD.state.save.todayTapeDay === new Date().toDateString()), '14 of 15 (80%+) earns a tape and records today in S.save.todayTapeDay');
  await shot('result');
  await page.click('#td-done');
  check(await state() === 'done' && await page.textContent('.td-main') === '+10 more', 'done for today: the main action is "+10 more"');
  await shot('done');
  await noHScroll('done for today');
  // +10 more: no second pay or tape.
  const tapes = await page.evaluate(() => SD.tapes.count());
  await page.click('#td-more');
  await page.waitForSelector('#panel .win.quiz');
  check(/16 \/ 2\d/.test(await page.textContent('.td-prog')), '+10 more adds to the set');
  for (let i = 0; i < 40; i++) {
    await page.waitForSelector('#panel .win.quiz #td-stop, #td-again');
    if (await page.$('#td-again')) break;
    await answer(true, 1); await next();
  }
  const xp2 = await totalXp();
  check(await page.evaluate(() => SD.tapes.count()) === tapes, 'the extra questions pay no second tape');
  await page.click('#td-done');
  check(xp2 === xp1 || xp2 > xp1, 'XP never drops');

  // ---- The wall: two rights on different days ----
  await page.evaluate(() => { SD.state.save.wall = [{ id: 'dva-1-01', t: Date.now() - 3 * 86400000, rights: [] }]; SD.state.persist(); SD.today.render(); });
  await page.click('#td-wallb');
  check(/The only honest posters in the Cloud/.test(await page.textContent('#panel')), 'the wall\'s header reads "The only honest posters in the Cloud"');
  await shot('wall');
  await page.click('#td-wall-go');
  await page.waitForSelector('#panel .win.quiz');
  await answer(true, 1); await next();
  await page.waitForSelector('#td-done'); await page.click('#td-done');
  check(await page.evaluate(() => SD.state.save.wall.length === 1 && SD.state.save.wall[0].rights.length === 1), 'one right answer leaves the poster up');
  // Same day again: still up.
  await page.click('#td-wallb'); await page.click('#td-wall-go'); await page.waitForSelector('#panel .win.quiz');
  await answer(true, 1); await next(); await page.waitForSelector('#td-done'); await page.click('#td-done');
  check(await page.evaluate(() => SD.state.save.wall.length === 1), 'a second right answer on the same day leaves it up');
  // Tomorrow (the clock is faked).
  const now = await page.evaluate(() => Date.now());
  await page.clock.setFixedTime(new Date(now + 86400000 + 3600000));
  await page.click('#td-wallb'); await page.click('#td-wall-go'); await page.waitForSelector('#panel .win.quiz');
  await answer(true, 1); await next(); await page.waitForSelector('#td-done'); await page.click('#td-done');
  check(await page.evaluate(() => SD.state.save.wall.length === 0), 'a right answer on another day takes the poster down');

  // ---- Back after missed days, mock day, day before ----
  await page.evaluate(() => { SD.state.save.todaySet = null; SD.state.save.todayLast = new Date(Date.now() - 4 * 86400000).toDateString(); SD.today.render(); });
  check(await state() === 'back' && /today's set/i.test(await page.textContent('.td-line')), 'back after missed days: "start with today\'s set", no guilt');
  await page.evaluate(() => { SD.state.save.examDate = '2026-11-05'; SD.today.render(); });
  const mock = await page.evaluate(() => SD.today.mockDates().map(m => new Date(m.t).toDateString()));
  check(await state() === 'mock', `mock day when the suggested date has passed (${mock.join(', ')})`);
  await page.evaluate(() => { SD.state.save.examDate = '2026-11-30'; });
  check(JSON.stringify(await page.evaluate(() => SD.today.mockDates().map(m => new Date(m.t).toDateString()))) === JSON.stringify(['Mon Oct 26 2026', 'Sun Nov 15 2026', 'Tue Nov 24 2026']), 'a Nov 30 exam suggests mocks on Oct 26, Nov 15 and Nov 24');
  await page.evaluate(() => { const d = new Date(Date.now() + 86400000); SD.state.save.examDate = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); SD.today.render(); });
  check(await state() === 'eve' && /sleep beats cramming/i.test(await page.textContent('.td-line')), 'the day before the exam: a light review, "sleep beats cramming"');
  await page.evaluate(() => { SD.state.save.examDate = '2026-11-30'; SD.today.render(); });

  // ---- Uptima by flag ----
  await page.evaluate(() => { SD.state.save.flags.uptima = true; SD.today.render(); });
  check(!!await page.$('.td-uptima') && !/—\sK\./.test(await page.textContent('.td-line')), 'with the uptima flag, Uptima hosts the card');
  await page.evaluate(() => { const s = SD.state.save; s.todaySet = null; s.todayLast = new Date().toDateString(); const ids = Object.keys(SD.concepts).filter(id => SD.state.reviewable(id)).slice(0, 41); ids.forEach(id => { const c = SD.state.concept(id); c.seen = true; c.due = 1; }); SD.today.render(); });
  const pile = await page.textContent('.td-line'), plain = await page.textContent('.td-nums');
  check(/I had ten thousand years of these/.test(pile) || /prayers? waiting for an answer/.test(pile), 'Uptima\'s count reads as prayers (or the big-pile joke): ' + pile);
  check(/\d+ due/.test(plain), 'the plain numbers show alongside: ' + plain);
  await shot('uptima');
  await page.evaluate(() => { delete SD.state.save.flags.uptima; SD.state.save.c2x = { f: { uptima: true } }; SD.today.render(); });
  check(!!await page.$('.td-uptima'), 'chapter 2b\'s own uptima flag (S.save.c2x.f.uptima) counts too');
  await page.evaluate(() => { delete SD.state.save.c2x; SD.today.render(); });
  check(!!await page.$('.td-kyu'), 'without either flag it\'s Kyu\'s note again');

  // ---- Readiness board and a domain drill ----
  await page.click('#td-ready');
  check(/Reviews: what feels true · Mock: what is true/.test(await page.textContent('#panel')), 'the readiness board\'s header line');
  check(await page.$$eval('.td-dom', els => els.length) === 4 && /early read/.test(await page.textContent('#panel')), 'four domain rows, marked "early read" before 10 mock questions');
  check(/Seen \d+ of \d+ DVA questions/.test(await page.textContent('.td-seen')), 'the "seen X of N" meter');
  await shot('board');
  await noHScroll('readiness board');
  await page.click('.td-dom[data-d="2"]');
  await page.waitForSelector('#panel .win.quiz');
  check(/1 \/ 10/.test(await page.textContent('.td-prog')), 'tapping a domain starts a 10-question drill');
  check(await page.evaluate(() => SD.exam.conceptDomain(SD.today.current().c)) === 2, 'the drill asks that domain\'s concepts');
  await page.click('#td-stop');
  // The date chip opens the picker.
  await page.click('#td-date');
  check(!!await page.$('#td-date-in'), 'the exam-date chip opens the date picker');
  await page.click('#panel-x');

  // ---- 25 questions on a laptop ----
  await page.setViewportSize({ width: 1280, height: 800 });
  check(await page.evaluate(() => SD.today.size()) === 25, 'the set defaults to 25 questions at 900px and wider');
  await shot('laptop');

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page or console errors');
  if (fails.length) { console.error(`${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('OK: the Today card checks all pass, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
