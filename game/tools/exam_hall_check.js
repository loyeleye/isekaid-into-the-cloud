// Headless check of the Exam Hall (js/exam-hall.js) on a 375 x 812 phone: open the half mock, answer some questions
// (taps and keys), reload and resume them, finish it and check the mock record, the wall and the next form. Then a
// timed-out form A auto-submits on resume, and an abandoned form B is recorded unfinished. No console errors and no
// sideways scroll on any screen; say it first set to every question doesn't hide the options.
// Run from game/:  node tools/exam_hall_check.js   SHOTS=dir saves a screenshot of each screen.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const fail = [];
const check = (ok, msg) => { if (!ok) fail.push(msg); };

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch2&demo`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  await page.addInitScript(() => { window.SD_TEST = 1; });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });

  const load = async () => {
    await page.goto(url);
    await page.waitForFunction(() => window.SD && SD.examHall && SD.state && SD.state.save, null, { timeout: 30000 });
  };
  const open = form => page.evaluate(f => { window._xh = SD.examHall.open(f).then(m => (window._xhDone = m || 'null')); }, form);
  let shot = 0;
  const look = async name => {
    const w = await page.evaluate(() => {
      const b = document.querySelector('#panel .win-b');
      return { page: document.documentElement.scrollWidth - innerWidth, panel: b ? b.scrollWidth - b.clientWidth : 0 };
    });
    check(w.page <= 0, `${name}: page scrolls sideways by ${w.page}px`);
    check(w.panel <= 0, `${name}: exam window scrolls sideways by ${w.panel}px`);
    if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, `${String(++shot).padStart(2, '0')}-${name}.png`) }); }
  };
  const save = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save)));

  await load();
  // Say it first on every question must not apply in the hall.
  await page.evaluate(() => { SD.state.save.sayFirst = 'all'; SD.state.persist(); });

  // ---- Half mock: intro ----
  await open('half');
  await page.waitForSelector('#xh-start');
  const intro = await page.textContent('#panel .win-b');
  check(/33/.test(intro) && /65 minutes/.test(intro) && /720/.test(intro), 'intro lacks count, time or pass line: ' + intro.slice(0, 200));
  await look('intro');
  await page.click('#xh-start');
  await page.waitForSelector('.xh-opt');
  check(!(await page.$('#q-said')), 'say it first showed in the hall');
  check(!(await page.$('.conf-b')), 'confidence buttons showed in the hall');
  const head = await page.textContent('.xh-top');
  check(/Q 1 \/ 33/.test(head), 'header: ' + head);
  check(/\d+:\d\d/.test(await page.textContent('#xh-clock')), 'no clock');
  const small = await page.evaluate(() => [...document.querySelectorAll('.xh-opt, .xh-foot button, #xh-flag')].filter(b => b.offsetHeight < 44).map(b => b.textContent.slice(0, 20) + ' ' + b.offsetHeight));
  check(!small.length, 'tap targets under 44px: ' + small.join(', '));
  await look('question');

  // Answer five: taps for the first three, keys for the next two; a flag on Q2. No feedback anywhere.
  const pickFirst = async () => {
    const multi = await page.evaluate(() => !!document.querySelector('.xh-opt[role="checkbox"]'));
    if (multi) {
      const n = await page.evaluate(() => +/\(Choose (\d)\)/.exec(document.querySelector('.xh-stem').textContent)[1]);
      const opts = await page.$$('.xh-opt');
      for (let k = 0; k < opts.length; k++) await page.click(`.xh-opt >> nth=${k}`);
      const on = await page.$$eval('.xh-opt.on', x => x.length);
      check(on === n, `multi allowed ${on} picks with (Choose ${n})`);
    } else await page.click('.xh-opt >> nth=0');
  };
  for (let i = 0; i < 3; i++) {
    await pickFirst();
    check(!(await page.$('.verdict, .why, .qr-o')), 'feedback showed before submitting');
    if (i === 1) await page.click('#xh-flag');
    await page.click('#xh-next');
  }
  for (let i = 0; i < 2; i++) {
    await page.keyboard.press('2');
    await page.keyboard.press('ArrowRight');
  }
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('f');
  let sv = await save();
  const p1 = sv.examInProgress;
  check(p1 && p1.form === 'half' && p1.ids.length === 33, 'no saved half mock in progress');
  const got = p1 ? p1.ans.filter(a => a != null).length : 0;
  check(got === 5, `saved ${got} answers, expected 5`);
  check(p1 && p1.flags[1] && p1.flags[4], 'flags not saved on Q2 and Q5');
  check(p1 && p1.at === 4, 'saved position ' + (p1 && p1.at));
  check(sv.stats.answered === 0, 'mock answers reached spaced review stats');
  // Changing an answer sticks.
  await page.click('#xh-back');
  const before = (await save()).examInProgress.ans[3];
  await page.keyboard.press('3');
  const after = (await save()).examInProgress.ans[3];
  check(JSON.stringify(before) !== JSON.stringify(after), 'changing an answer did not save');

  // The grid shows answered, flagged and empty, and jumps.
  await page.click('#xh-grid');
  await page.waitForSelector('.xh-tile');
  const tiles = await page.$$eval('.xh-tile', t => t.map(x => x.className));
  // A multiple response question counts as answered only with all its picks made.
  const full = await page.evaluate(() => { const p = SD.state.save.examInProgress; return p.ids.filter((id, i) => { const q = SD.exam.find(id), a = p.ans[i]; return q.type === 'multi' ? a && a.length === q.items.filter(x => x.ok).length : a != null; }).length; });
  check(tiles.length === 33, 'grid tiles: ' + tiles.length);
  check(tiles.filter(c => /\bdone\b/.test(c)).length === full && full >= 3 && tiles.filter(c => /flagged/.test(c)).length === 2, 'grid states: ' + tiles.slice(0, 6).join(' | '));
  await look('grid');
  await page.click('.xh-tile >> nth=10');
  check(/Q 11 \/ 33/.test(await page.textContent('.xh-top')), 'grid did not jump to Q11');

  // ---- Reload and resume ----
  const ms0 = (await save()).examInProgress.ms;
  await load();
  sv = await save();
  check(sv.examInProgress && sv.examInProgress.ans.filter(a => a != null).length === 5, 'answers lost on reload');
  await page.waitForTimeout(1500);
  check((await save()).examInProgress.ms === sv.examInProgress.ms, 'clock ran while the hall was closed');
  await open('half');
  await page.waitForSelector('#xh-resume');
  check(/5 of 33 answered/.test(await page.textContent('#panel .win-b')), 'resume offer text');
  await look('resume');
  await page.click('#xh-resume');
  await page.waitForSelector('.xh-opt');
  check(/Q 11 \/ 33/.test(await page.textContent('.xh-top')), 'resume did not return to Q11');
  await page.click('#xh-grid');
  const tiles2 = await page.$$eval('.xh-tile', t => t.map(x => x.className));
  check(tiles2.filter(c => /\bdone\b/.test(c)).length === full && tiles2.filter(c => /flagged/.test(c)).length === 2, 'grid after resume: ' + tiles2.slice(0, 6).join(' | '));
  await page.click('.xh-tile >> nth=0');
  check((await page.$$('.xh-opt.on')).length > 0, 'Q1 answer not shown after resume');
  check(ms0 >= 0, 'elapsed not saved');

  // ---- Finish: review, submit, confirm ----
  await page.evaluate(() => SD.examHall._debugAnswerAll(0.7));
  await page.waitForSelector('#xh-submit');
  await look('review');
  await page.click('#xh-submit');
  await page.waitForSelector('#xh-yes');
  await page.click('#xh-yes');
  await page.waitForSelector('.xh-score');
  const res = await page.textContent('#panel .win-b');
  check(/estimate/i.test(res), 'result lacks "estimate"');
  check(/\d+ of \d+ \(\d+%\)/.test(res), 'result lacks domain lines');
  check(/early read/.test(res), 'half mock domains not marked early read');
  check(/Time used/.test(res), 'result lacks time used');
  check((await page.$$('.xh-item')).length === 33, 'review list is not every question');
  await look('result');
  await page.click('.xh-item.bad summary');
  await look('result-open');
  await page.click('#xh-done');
  await page.waitForFunction(() => window._xhDone);
  const rec = await page.evaluate(() => window._xhDone);
  check(rec && rec.form === 'half' && rec.done === true && rec.ids.length === 33 && rec.n === 33, 'returned record: ' + JSON.stringify(rec).slice(0, 200));
  sv = await save();
  const last = await page.evaluate(() => SD.exam.lastMock());
  check(last && last.form === 'half' && last.done === true, 'lastMock: ' + JSON.stringify(last).slice(0, 120));
  check(last && last.right === 23 && last.score === 697, `right ${last && last.right}, score ${last && last.score} (23 of 33 should be 697)`);
  check(!sv.examInProgress, 'examInProgress left after submitting');
  check(await page.evaluate(() => SD.exam.nextForm()) === 'A', 'next form is not A');
  const wall = sv.wall || [];
  check(wall.length === 10 && new Set(wall.map(w => w.id)).size === wall.length && wall.every(w => Array.isArray(w.rights) && w.t), 'wall: ' + wall.length + ' entries');
  check(await page.evaluate(() => SD.exam.heldOut().size) === 130, 'half mock ids not released from held out');
  check(sv.stats.answered === 0, 'mock answers reached spaced review stats');

  // ---- Form A times out on resume ----
  await open();
  await page.waitForSelector('#xh-start');
  check(/form A/.test(await page.textContent('#panel .win-b')) && /130 minutes/.test(await page.textContent('#panel .win-b')), 'form A intro');
  await page.click('#xh-start');
  await page.waitForSelector('.xh-opt');
  await page.click('.xh-opt >> nth=0');
  // Leaving the page saves the real elapsed time (pagehide), so set the clock near the end after the reload.
  await load();
  await page.evaluate(() => { SD.state.save.examInProgress.ms = 130 * 60000 - 1500; SD.state.persist(); });
  await open();
  await page.click('#xh-resume');
  await page.waitForSelector('.xh-score', { timeout: 6000 }).catch(() => fail.push('form A did not auto-submit at time out'));
  check(/Time ran out/.test(await page.textContent('#panel .win-b')), 'time out note missing');
  await page.click('#xh-done');
  const a = await page.evaluate(() => SD.exam.lastMock());
  check(a && a.form === 'A' && a.done && a.timedOut && a.n === 65, 'form A record: ' + JSON.stringify(a).slice(0, 120));
  check(await page.evaluate(() => SD.exam.nextForm()) === 'B', 'next form is not B');

  // ---- Form B abandoned ----
  await open();
  await page.click('#xh-start');
  await page.waitForSelector('.xh-opt');
  await page.click('.xh-opt >> nth=0');
  await load();
  await open();
  await page.click('#xh-abandon');
  await page.waitForSelector('#xh-start');
  await page.click('#xh-later');
  const ms = await page.evaluate(() => SD.exam.mocks());
  const b = ms[ms.length - 1];
  check(b && b.form === 'B' && b.done === false && b.ids.length === 65, 'abandoned B: ' + JSON.stringify(b).slice(0, 120));
  check(await page.evaluate(() => SD.exam.nextForm()) === 'B' && !(await save()).examInProgress, 'abandon left B taken or a save in progress');
  check(await page.evaluate(() => window._xhDone) === 'null', 'leaving did not resolve null');

  errors.forEach(e => fail.push(e));
  console.log(ms.map(m => `${m.form}: ${m.right}/${m.n} ${m.done ? 'done' : 'unfinished'}${m.score ? ' ' + m.score : ''}`).join(', '));
  await browser.close(); server.close();
  if (fail.length) { console.log('FAIL\n  ' + fail.join('\n  ')); process.exit(1); }
  console.log('Exam Hall check passed.');
})().catch(e => { console.error(e); process.exit(1); });
