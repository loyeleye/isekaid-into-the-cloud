// Headless check of topic drills (js/topic-drill.js, run by js/today.js) at phone width (375px): the picker with its
// verified counts and the "none verified yet" status; a drill before any question is verified, topped up and marked
// "Not verified yet"; one AWS docs link per URL after each answer; with a stand-in SD.verified, verified-only drills ask
// only verified questions and show the date, the quote and the caution; drill sizes; the presets' question counts.
// Run from game/:  node tools/topic_drill_check.js     SHOTS=dir saves screenshots.
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
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'topic-' + name + '.png') }); };
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


  await page.clock.install({ time: new Date('2026-11-16T12:00:00') });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });
  check(!!await page.$('#td-topic'), 'the Today card links to "Topic drill"');

  // ---- Presets ----
  const counts = await page.evaluate(() => SD.topicDrill.presets().map(p => [p.id, SD.topicDrill.counts(p).n]));
  console.log('     ' + counts.map(c => c.join(' ')).join(', '));
  check(counts.every(c => c[1] >= 5), 'every DVA-C02 preset has at least 5 questions');
  const scope = await page.evaluate(() => SD.topicDrill.base().filter(q => !SD.exam.inTrack(q) || SD.exam.isHeld(q) || q.type === 'explain').length);
  check(scope === 0, 'drills ask only reviewable questions on the chosen exam (none held out for the Exam Hall)');
  const d4 = await page.evaluate(() => SD.topicDrill.pool(SD.topicDrill.preset('pack-trouble')).every(q => SD.exam.domainOf(q) === 4));
  check(d4, 'the Troubleshooting pack is Domain 4 only');

  // ---- Before anything is verified ----
  await page.evaluate(() => { delete SD.verified; });
  await page.click('#td-topic');
  check(/No questions are verified yet/.test(await page.textContent('#panel')), 'with no verified data the picker says none are verified yet');
  check(await page.isChecked('#td-tv'), 'verified only is on by default');
  check(/none verified yet · \d+ questions/.test(await page.textContent('[data-tp="pack-trouble"]')), 'each topic shows its verified count and size');
  await noHScroll('topic picker');
  await shot('picker');
  await page.click('[data-tp="pack-trouble"]');
  await page.waitForSelector('#panel .win.quiz #td-stop');
  check(/1 \/ 10/.test(await page.textContent('.td-prog')), 'an empty verified pool still gives a full 10-question drill');
  check([...await page.$$eval('.sysnote', els => els.map(e => e.textContent))].some(t => /None of the .* questions are verified yet/.test(t)), 'the drill says it was topped up with unchecked questions');
  await answer(true, 1);
  check(!!await page.$('.q-src.un') && /Not verified yet/.test(await page.textContent('.q-src')), 'after an answer: "Not verified yet"');
  check(!!await page.$('#panel .why'), 'after an answer: the explanation');
  const links = await page.$$eval('.src-docs a', as => as.map(a => a.getAttribute('href')));
  const qd = await page.evaluate(() => SD.exam.find(SD.today.current().id).doc);
  check(links.length >= 1 && links.every(u => /^https:\/\/[^,\s]+$/.test(u)) && links.length === new Set([].concat(qd)).size, `one AWS docs link per URL (${links.length})`);
  await noHScroll('answer feedback');
  await shot('unverified');
  await page.click('#td-stop');

  // ---- With verified data (a stand-in for js/verified.js) ----
  const vid = await page.evaluate(() => {
    const qs = SD.topicDrill.pool(SD.topicDrill.preset('t-sfn')).slice(0, 6);
    SD.verified = {};
    qs.forEach((q, i) => { SD.verified[q.id] = { on: '2026-11-16', src: [{ url: 'https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html', quote: 'Test quote ' + i }], era: i === 0 ? 'Test caution' : undefined }; });
    return qs.map(q => q.id);
  });
  await page.click('#td-topic');
  check(/6 of \d+ DVA-C02 questions are verified/.test(await page.textContent('.td-vstat')), 'the picker counts verified questions');
  check(/6 verified/.test(await page.textContent('[data-tp="t-sfn"]')), 'the topic shows "6 verified"');
  await page.click('[data-tp="t-sfn"]');
  await page.waitForSelector('#panel .win.quiz #td-stop');
  const items = await page.evaluate(() => SD.today.current() && document.querySelector('.td-prog').textContent);
  check(/1 \/ 6/.test(items), 'verified only: a 6-question drill when only 6 are verified (' + items + ')');
  for (let i = 0; i < 6; i++) {
    const id = await answer(i % 2 === 0, 1);
    if (i === 0) {
      check(vid.includes(id), 'verified only asks verified questions');
      check(!!await page.$('.q-src.ok') && /Verified Nov 16, 2026/.test(await page.textContent('.q-src')), 'a verified question shows "Verified Nov 16, 2026"');
      check(/Test quote/.test(await page.textContent('.src-q')), 'and the sentence from the docs');
      await noHScroll('verified feedback');
      await shot('verified');
    }
    if (await page.evaluate(id => SD.verified[id].era, id)) check(/Test caution/.test(await page.textContent('.src-era')), 'the era caution shows');
    await next();
    await page.waitForTimeout(30);
  }
  check(/3 of 6 right/.test(await page.textContent('#panel')) && /6 of 6 verified/.test(await page.textContent('#panel')), 'the result shows the score and how many were verified');
  check(!!await page.$('#td-tagain') && !!await page.$('#td-tpick'), 'the result offers another round or another topic');

  // ---- Verified only off, size 20 ----
  await page.click('#td-tpick');
  await page.uncheck('#td-tv');
  await page.click('label.td-sz:has(input[value="20"])');
  await page.click('[data-tp="t-lambda"]');
  await page.waitForSelector('#panel .win.quiz #td-stop');
  check(/1 \/ 20/.test(await page.textContent('.td-prog')), 'verified only off, 20 questions: a 20-question drill');
  check(await page.evaluate(() => SD.state.save.topicPrefs.n === 20 && SD.state.save.topicPrefs.v === false), 'the choices are saved');
  const miss = await answer(false, 2);
  await next();
  await page.waitForTimeout(30);
  check(await page.evaluate(id => SD.state.save.wall.some(w => w.id === id), miss), 'a sure miss in a topic drill goes up on the wall');
  await page.click('#td-stop');

  // ---- Readiness board link ----
  await page.click('#td-ready');
  check(!!await page.$('#td-totopic'), 'the readiness board offers "Drill a topic instead"');

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page or console errors');
  if (fails.length) { console.error(`${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('OK: the topic drill checks all pass, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
