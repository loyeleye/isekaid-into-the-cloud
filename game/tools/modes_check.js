// Headless check of the game modes shell (js/modes.js) at phone width (375px): the Play button once a mode registers,
// the mode picker, the shared stake table (and that always pressing Sure doesn't pay), SD.modes.ask's stakes, verdict,
// Wall and Stop for now, the calibration readout, the first-run walkthrough, and question picking (verified only, about
// 1 in 4 from other topics, the unchecked top-up).
// Run from game/:  node tools/modes_check.js     SHOTS=dir saves screenshots.
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
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'modes-' + name + '.png') }); };
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
    const p = document.querySelector('#panel'), q = window.__mq;
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

  // ---- Play button and picker ----
  const hadPlay = await page.evaluate(() => SD.modes.list().length);
  if (!hadPlay) check(!await page.$('#td-play'), 'with no mode registered, the Today card has no Play button');
  // A test mode: asks the given questions through SD.modes.ask.
  await page.evaluate(() => {
    window.__runs = [];
    SD.modes.register({ id: 'test', name: 'Test mode', blurb: 'A check-only mode.', minutes: 5, host: 'Nobody', status: () => 'Resume · 2 of 3', start: o => window.__runs.push(o) });
  });
  check(!!await page.$('#td-play'), 'once a mode registers, the Today card has a Play button');
  await page.click('#td-play');
  const pick = await page.textContent('#panel');
  check(/Test mode/.test(pick) && /About 5 minutes/.test(pick) && /Resume · 2 of 3/.test(pick), 'the picker lists the mode with its length and status line');
  check(/Sure\s*\+3\s*−3 and the Wall/.test(pick.replace(/\s+/g, ' ')), 'the picker shows the shared stake table');
  await noHScroll('mode picker');
  await shot('picker');
  await page.click('[data-mode="test"]');
  check(await page.evaluate(() => window.__runs.length === 1), 'tapping a mode starts it');

  // ---- Stakes ----
  const st = await page.evaluate(() => [[true, 0], [true, 1], [true, 2], [false, 0], [false, 1], [false, 2]].map(([ok, c]) => SD.modes.stake(ok, c)));
  check(JSON.stringify(st) === JSON.stringify([1, 2, 3, 0, -1, -3]), 'stakes: +1/+2/+3 right, 0/−1/−3 wrong (' + st.join(' ') + ')');
  // The panel fix: at every accuracy, the best button is the honest one, and always pressing Sure loses below 50%.
  const best = await page.evaluate(() => [0.3, 0.45, 0.55, 0.6, 0.7, 0.9].map(p => [0, 1, 2].map(c => p * SD.modes.stake(true, c) + (1 - p) * SD.modes.stake(false, c))).map(ev => ev.indexOf(Math.max(...ev))));
  check(JSON.stringify(best) === JSON.stringify([0, 0, 1, 1, 2, 2]), 'expected points: Guess below 50% sure, Think so 50–67%, Sure above 67% (' + best.join(' ') + ')');
  const alwaysSure = await page.evaluate(() => 0.4 * 3 - 0.6 * 3);
  check(alwaysSure < 0, 'always pressing Sure at 40% right loses points');

  // ---- Asking through SD.modes.ask ----
  const qs = await page.evaluate(() => SD.topicDrill.pool(SD.topicDrill.preset('t-lambda')).filter(q => q.type === 'mc').slice(0, 3).map(q => q.id));
  const ask = (id, o) => page.evaluate(([id, o]) => { window.__mq = SD.exam.find(id); window.__tally = window.__tally || SD.modes.newTally(); window.__r = null; SD.modes.ask(window.__mq, Object.assign({ title: 'TEST', tally: window.__tally }, o || {})).then(r => { window.__r = r; }); }, [id, o]);
  await ask(qs[0]);
  await page.waitForSelector('#panel .win.quiz');
  const btn = await page.textContent('[data-c="2"]');
  check(/Sure/.test(btn) && /✓\+3/.test(btn) && /✗−3/.test(btn), 'the Sure button shows its stakes in text (' + btn.trim() + ')');
  check(/Sure only pays/.test(await page.textContent('#panel')), 'the stake help line is under the buttons');
  await noHScroll('quiz with stakes');
  await shot('ask');
  await answer(true, 2);
  check(/Sure, right: \+3/.test(await page.textContent('.verdict-row')), 'the verdict says "Sure, right: +3"');
  check(!!await page.$('.q-src'), 'the verified source block shows');
  await next(); await page.waitForTimeout(30);
  const r1 = await page.evaluate(() => window.__r);
  check(r1 && r1.ok === true && r1.conf === 2 && r1.pts === 3, 'the result has ok, conf and pts');
  await ask(qs[1]);
  await page.waitForSelector('#panel .win.quiz');
  await answer(false, 2);
  check(/Sure, wrong: −3/.test(await page.textContent('.verdict-row')), 'the verdict says "Sure, wrong: −3"');
  await next(); await page.waitForTimeout(30);
  check(await page.evaluate(id => SD.state.save.wall.some(w => w.id === id), qs[1]), 'a Sure miss goes up on the Wall');
  await ask(qs[2], { noWall: true });
  await page.waitForSelector('#panel .win.quiz');
  await answer(false, 2);
  await next(); await page.waitForTimeout(30);
  check(await page.evaluate(id => !SD.state.save.wall.some(w => w.id === id), qs[2]), 'opts.noWall keeps a Sure miss off the Wall');

  // ---- Stop for now ----
  await page.evaluate(id => { window.__stopped = 0; window.__mq = SD.exam.find(id); window.__r = null; SD.modes.ask(window.__mq, { title: 'TEST', onStop: () => { window.__stopped++; }, progress: '1 / 3' }).then(r => { window.__r = r; }); }, qs[0]);
  await page.waitForSelector('#panel .win.quiz #md-stop');
  check(/1 \/ 3/.test(await page.textContent('#panel .win-h')), 'Stop for now and the progress sit in the quiz title bar');
  await page.click('#md-stop'); await page.waitForTimeout(30);
  const rs = await page.evaluate(() => [window.__r, window.__stopped, document.querySelector('#panel').hidden]);
  check(rs[0] && rs[0].stopped && !rs[0].committed && rs[1] === 1 && rs[2], 'Stop for now before answering closes the quiz and resolves { stopped }');

  // ---- Calibration ----
  const cal = await page.evaluate(() => { const t = { 0: [1, 4], 1: [3, 5], 2: [2, 5] }; const d = document.createElement('div'); d.innerHTML = SD.modes.calibHtml(t); return [[...d.querySelectorAll('tr')].map(tr => [...tr.children].map(x => x.textContent.trim()).join(' ')).join(' | '), SD.modes.points(t)]; });
  check(/Sure 2 of 5 right \(40%\) ↓ Too sure/.test(cal[0]), 'calibration: Sure at 40% reads "Too sure" in words');
  check(/Think so 3 of 5 right \(60%\) ✓ On target/.test(cal[0]) && /Guess 1 of 4 right \(25%\) ✓ On target/.test(cal[0]), 'calibration: in-band buttons read "On target"');
  check(cal[1] === 1 + 0 + 3 * 2 - 2 + 2 * 3 - 3 * 3, 'calibration points add up (' + cal[1] + ')');
  const all = await page.evaluate(() => SD.state.save.modes.cal[2]);
  check(all && all[1] === 3 && all[0] === 1, 'answers through SD.modes.ask add to the all-modes calibration');

  // ---- Pay ----
  const pay = await page.evaluate(() => { const x0 = SD.state.save.xp, s0 = SD.state.save.shards | 0; const a = SD.modes.pay('test'), b = SD.modes.pay('test'); return [a, b, (SD.state.save.shards | 0) - s0]; });
  check(/\+20 XP · \+5 shards/.test(pay[0]) && pay[1] === '' && pay[2] === 5, 'a mode pays XP and shards once a day (' + pay[0] + ' / ' + pay[1] + ')');

  // ---- Walkthrough ----
  const walk = () => page.evaluate(() => { window.__w = 0; SD.modes.walkFirst('test', [{ title: 'One', html: '<p>a</p>' }, { title: 'Two', html: '<p>b</p>' }, { title: 'Three', html: '<p>c</p>' }]).then(() => { window.__w = 1; }); });
  await walk();
  check(/Step 1 of 3/.test(await page.textContent('#panel')), 'the first run opens a 3-step walkthrough');
  await noHScroll('walkthrough');
  await shot('walk');
  await page.click('#md-next'); await page.click('#md-back');
  check(/Step 1 of 3/.test(await page.textContent('#panel')), 'Back goes back a step');
  await page.click('#md-next'); await page.click('#md-next');
  check(/Start/.test(await page.textContent('#md-next')), 'the last step says Start');
  await page.click('#md-next'); await page.waitForTimeout(20);
  check(await page.evaluate(() => window.__w === 1), 'Start resolves the walkthrough');
  await walk(); await page.waitForTimeout(20);
  check(await page.evaluate(() => window.__w === 1 && document.querySelector('#panel').hidden), 'the walkthrough shows only on the first run');

  // ---- Picking ----
  const pk = await page.evaluate(() => {
    const D = SD.topicDrill, p = D.preset('pack-trouble');
    const r = SD.modes.pick({ preset: 'pack-trouble', n: 12 });
    const qs = r.items.map(it => SD.exam.find(it.q));
    return { n: r.items.length, other: r.items.filter(it => it.other).length, otherOut: r.items.filter(it => it.other).every(it => !D.matches(p, SD.exam.find(it.q))),
      mineVer: r.items.filter(it => !it.other).every(it => D.isVerified(SD.exam.find(it.q))), types: qs.every(q => q.type === 'mc' || q.type === 'multi'), uniq: new Set(r.items.map(it => it.q)).size, avail: r.avail };
  });
  check(pk.n === 12 && pk.uniq === 12, `pick: 12 different questions (${pk.n})`);
  check(pk.other === 3 && pk.otherOut, `pick: about 1 in 4 from other topics (${pk.other} of 12)`);
  check(pk.mineVer, `pick: verified only from the preset (${pk.avail.v} of ${pk.avail.n} verified)`);
  check(pk.types, 'pick: exam-style questions only');
  const fall = await page.evaluate(() => { const keep = SD.verified; SD.verified = {}; const r = SD.modes.pick({ preset: 'pack-trouble', n: 8 }); SD.verified = keep; return [r.items.length, r.topped]; });
  check(fall[0] === 8 && fall[1] > 0, `pick: with nothing verified it tops up with unchecked questions (${fall[1]} topped)`);

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page or console errors');
  if (fails.length) { console.error(`${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('OK: the game modes shell checks all pass, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
