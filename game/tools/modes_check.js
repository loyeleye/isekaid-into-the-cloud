// Headless check of the game modes shell (js/modes.js) at phone width (375px): the Play button once a mode registers,
// the mode picker, the shared stake table (and that always pressing Sure doesn't pay), SD.modes.ask's stakes, verdict,
// Wall and Stop for now, options as actions with the whole stem, own pools, the simulator hook, the calibration readout, the first-run walkthrough, and question picking (verified only, about
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
  check(!!await page.$('.tg-card'), 'the title has the games carousel (js/title-games.js), and the picker opens from the menu');
  await page.evaluate(() => SD.modes.open());
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

  // ---- Whole stem, options as actions (build spec v4: no clues, no hints before committing) ----
  const cq = await page.evaluate(() => SD.topicDrill.pool(SD.topicDrill.preset('pack-trouble')).find(q => q.type === 'mc' && /\bLEAST\b/.test(q.q)).id);
  await page.evaluate(id => { window.__mq = SD.exam.find(id); window.__r = null; SD.modes.ask(window.__mq, { title: 'TEST', act: { label: 'Apply a fix', icon: '🛠' } }).then(r => { window.__r = r; }); }, cq);
  await page.waitForSelector('#panel .win.quiz .opt.act');
  const sp = await page.evaluate(id => SD.modes.split(SD.exam.find(id)), cq);
  check(/LEAST/.test(sp.qual) && /\?$/.test(sp.ask), `split: the question line and its qualifier (${sp.qual})`);
  check((await page.textContent('.q-q')) === await page.evaluate(() => window.__mq.q), 'the whole stem shows, free to read');
  check(!await page.$('.clue, .whynot:not([hidden])'), 'no clues or hints before committing');
  check(/Apply a fix/.test(await page.textContent('.act-l')) && (await page.$$('.opt.act')).length >= 2, 'options are shown as full-width actions');
  await page.click('.opt.act');
  check(/^🛠 ✓ /.test((await page.textContent('.opt.act.on')).trim()), 'the chosen action is marked with a tick, not only colour');
  await noHScroll('actions');
  await shot('actions');
  await answer(true, 1); await next(); await page.waitForTimeout(30);
  check(await page.evaluate(() => window.__r && window.__r.ok === true && window.__r.pts === 2), 'an action answer resolves like any other');

  // ---- Own pools and the simulator hook ----
  const own = await page.evaluate(() => { const r = SD.modes.pick({ match: q => q.topic === 'lambda', n: 8 }); return [r.items.length, r.items.filter(it => !it.other).every(it => SD.exam.find(it.q).topic === 'lambda'), r.items.filter(it => it.other).every(it => SD.exam.find(it.q).topic !== 'lambda'), r.items.filter(it => it.other).length]; });
  check(own[0] === 8 && own[1] && own[2] && own[3] === 2, `pick({ match }): a mode's own pool, with 1 in 4 from elsewhere (${own[3]} of ${own[0]})`);
  const sa = await page.evaluate(() => { let x = 0.3; const rng = () => (x = (x * 9301 + 49297) % 233280 / 233280); const q = SD.exam.find('dva-4-01'); const before = JSON.stringify(SD.state.save.qlog || {}); const r = [0.45, 0.6, 0.9].map(p => SD.modes.simAnswer(q, { p, conf: 'honest' }, rng).conf); return [r, before === JSON.stringify(SD.state.save.qlog || {}), document.querySelector('#panel').hidden]; });
  check(JSON.stringify(sa[0]) === '[0,1,2]' && sa[1] && sa[2], 'simAnswer: honest confidence follows p, records nothing and opens nothing');

  // ---- Question formats inside a mode (SD.modes.askFormat, js/qformats.js) ----
  check(await page.evaluate(() => !!SD.qf && !SD.qf.has('spot') && SD.fmtItems.length > 100), 'the formats engine loads but stays off outside a mode (has() is false)');
  const spot = await page.evaluate(() => { SD.qf.resetExposure(); window.__fr = null; const it = SD.fmtItems.find(i => i.type === 'spot'); SD.modes.askFormat(it, { title: 'TEST' }).then(r => { window.__fr = r; }); return it.id; });
  await page.waitForSelector('#panel .qf');
  check(!!await page.$('#qf-got'), 'a mode can ask a format item on the default profile; the first of a format is worked through');
  await page.click('#qf-got'); await page.waitForTimeout(30);
  check(await page.evaluate(() => window.__fr && window.__fr.scored === false && window.__fr.pts === 0 && window.__fr.fmt), 'an unscored round pays 0');
  const pred = await page.evaluate(() => { SD.qf.exposure('predict').known = true; window.__fr = null; window.__ft = SD.modes.newTally(); const it = SD.fmtItems.find(i => i.type === 'predict'); SD.modes.askFormat(it, { title: 'TEST', tally: window.__ft }).then(r => { window.__fr = r; }); return [it.id, it.a]; });
  await page.waitForSelector('#panel .qf');
  await page.click(`[data-qf-opt="${pred[1]}"]`); await page.click('#qf-submit');
  check(/✓\+3/.test(await page.textContent('[data-c="2"]')) && /wrong −3/.test(await page.getAttribute('[data-c="2"]', 'aria-label')), 'the shared stakes show under the format\'s confidence buttons');
  await shot('format-stakes');
  await noHScroll('format item');
  await page.click('[data-c="2"]'); await page.click('#q-next'); await page.waitForTimeout(30);
  check(await page.evaluate(() => window.__fr && window.__fr.ok === true && window.__fr.pts === 3 && window.__ft[2][1] === 1), 'a scored item pays from the stake table and counts in calibration');
  const rec = await page.evaluate(([a, b]) => {
    const r7 = SD.qf.recent(7), later = SD.qf.recent(7, Date.now() + 8 * 864e5);
    const picks = Array.from({ length: 30 }, () => SD.modes.pickFormat({ types: ['spot', 'predict'] }).id);
    return [r7.has(a) && r7.has(b), !later.has(a), picks.every(id => id !== a && id !== b), !!SD.state.save.fmtAsked[a]];
  }, [spot, pred[0]]);
  check(rec[0] && rec[3], 'every item asked is stamped in the shared "recently asked" record (saved)');
  check(rec[2], 'pickFormat skips items any mode asked in the last 7 days');
  check(rec[1], 'and the window is 7 days');
  // Compare with several deciding rows (keys[]): any of them is right.
  const cmp = await page.evaluate(() => {
    SD.qf.exposure('compare').known = true; window.__fr = null;
    const base = SD.fmtItems.find(i => i.type === 'compare' && !i.keys), other = base.rows.findIndex((r, i) => i !== base.key);
    const it = Object.assign({}, base, { id: 'test-keys', keys: [base.key, other] });
    SD.modes.askFormat(it, { title: 'TEST', bands: true }).then(r => { window.__fr = r; });
    return [it.a, other, SD.qf.keysOf(it).length, SD.qf.keysOf(base).length];
  });
  await page.waitForSelector('#panel .qf');
  await page.click(`[data-qf-col="${cmp[0]}"]`); await page.click(`[data-qf-row="${cmp[1]}"]`); await page.click('#qf-submit'); await page.click('[data-c="1"]');
  check(/Deciding rows \(any one is right\)/.test(await page.textContent('#panel')), 'compare lists every deciding row in its feedback');
  await page.click('#q-next'); await page.waitForTimeout(30);
  check(cmp[2] === 2 && cmp[3] === 1 && await page.evaluate(() => window.__fr && window.__fr.ok === true), 'compare: a second deciding row counts as right (keys[]), and items with one key still work');

  // Compare options for modes: colFirst, the phone row bands, gradeOn 'col', feedback off, a note, practice,
  // mode 'scored' and shuffleCols.
  const c1 = await page.evaluate(() => {
    SD.qf.resetExposure(); window.__fr = null;
    const it = SD.fmtItems.find(i => i.id === 'fmt-compare-01');
    SD.modes.askFormat(it, { title: 'TEST', mode: 'scored', colFirst: true, gradeOn: 'col', feedback: false }).then(r => { window.__fr = r; });
    return [it.a, it.rows.findIndex((r, i) => !SD.qf.keysOf(it).includes(i))];
  });
  await page.waitForSelector('#panel .qf');
  check(!await page.$('#qf-got') && !await page.$('.qf-hint'), 'mode "scored" skips the worked and hint rounds, even for a new format');
  check(!await page.$('.qf-bands, .qf-cmp-grid, .qf-card') && (await page.$$('.qf-cols [data-qf-col]')).length === 3, 'colFirst: only the stem and the column names before a pick');
  await page.click(`[data-qf-col="${c1[0]}"]`);
  check(await page.$$eval('.qf-bands .qf-band:not(.qf-band-head)', b => b.length === 4 && b.every(x => x.querySelectorAll('.qf-band-c').length === 3)), 'after the pick, a phone shows each row as a band with its three cells side by side');
  check(!await page.$('.qf-bands [data-qf-col]'), 'and the column pick holds once the table shows');
  await noHScroll('compare bands');
  await shot('compare-bands');
  await page.click(`[data-qf-row="${c1[1]}"]`); await page.click('#qf-submit'); await page.click('[data-c="2"]'); await page.waitForTimeout(30);
  const cr1 = await page.evaluate(() => [window.__fr, document.querySelector('#panel').hidden]);
  check(cr1[1] && cr1[0] && cr1[0].ok === true && cr1[0].pts === 3 && cr1[0].col.ok === true && cr1[0].row.ok === false && cr1[0].row.pick === c1[1], 'gradeOn "col": the column is graded and staked, the row is reported apart, and feedback: false skips the feedback screen');
  await page.evaluate(() => { window.__fr = null; const it = SD.fmtItems.find(i => i.id === 'fmt-compare-01'); SD.modes.askFormat(it, { title: 'TEST', mode: 'scored', practice: true, note: 'Duel note line.', bands: true }).then(r => { window.__fr = r; }); });
  await page.waitForSelector('#panel .qf');
  check(!!await page.$('.qf-hint .qf-practice') && !await page.$('.qf-hint-t'), 'practice: true shows the Practice label, with no hint round');
  check(!await page.$('.qf-car') && (await page.$$('.qf-band-head [data-qf-col]')).length === 3, 'bands: true replaces the swipe cards on a phone, with the column picks on the band header');
  await page.click('.qf-band-head [data-qf-col="0"]');
  await page.click('[data-qf-row="2"]'); await page.click('#qf-submit'); await page.click('[data-c="1"]');
  check(/Duel note line\./.test(await page.textContent('#panel .qf-note')), 'opts.note adds one line to the feedback screen');
  await page.click('#q-next'); await page.waitForTimeout(30);
  check(await page.evaluate(() => window.__fr && window.__fr.scored === false && window.__fr.pts === 0), 'and a practice item is never scored');
  const sh = await page.evaluate(() => {
    const it = SD.fmtItems.find(i => i.id === 'fmt-compare-10'); const orders = new Set(); let same = true;
    for (let n = 0; n < 40; n++) { const s = SD.qf.shuffleCompare(it); orders.add(s.cols.join('|')); same = same && s.cols[s.a] === it.cols[it.a] && s.cells.every((r, ri) => r.every((c, ci) => c === it.cells[ri][s.colMap[ci]])) && (s.no || []).every((w, ci) => w === (it.no || [])[s.colMap[ci]]); }
    return [orders.size, same];
  });
  check(sh[0] > 1 && sh[1], `shuffleCols: columns come in new orders (${sh[0]} seen) with answer, cells and "why not" lines moved with them`);
  const k5 = await page.evaluate(() => ['01', '03', '10', '20', '21'].map(n => SD.qf.keysOf(SD.fmtItems.find(i => i.id === 'fmt-compare-' + n)).join(',')).join(' '));
  check(k5 === '2,0 1,2 1,0,2 0,1,2 1,0,2', 'the Duel\'s deciding rows are on items 01, 03, 10, 20 and 21 (' + k5 + ')');

  // confidenceBefore 'col': rate the column before the table opens; the row step then submits with that rating.
  await page.evaluate(() => { window.__fr = null; const it = SD.fmtItems.find(i => i.id === 'fmt-compare-01'); SD.modes.askFormat(it, { title: 'TEST', mode: 'scored', colFirst: true, confidenceBefore: 'col', gradeOn: 'col' }).then(r => { window.__fr = r; }); });
  await page.waitForSelector('#panel .qf');
  const wrongCol = await page.evaluate(() => (SD.fmtItems.find(i => i.id === 'fmt-compare-01').a + 1) % 3);
  await page.click(`[data-qf-col="${wrongCol}"]`);
  check(!!await page.$('[data-c="2"]') && !await page.$('.qf-bands, .qf-cmp-grid') && /✗−3/.test(await page.textContent('[data-c="2"]')), 'confidenceBefore "col": the stake buttons come right after the column pick, before the table opens');
  await page.click('#qf-recol');
  check((await page.$$('.qf-cols [data-qf-col]')).length === 3, 'and the column can still change until it is rated');
  await page.click(`[data-qf-col="${wrongCol}"]`); await page.click('[data-c="2"]');
  check(!!await page.$('.qf-bands') && !await page.$('[data-c]') && /you said Sure/.test(await page.textContent('.qf-pickline')), 'once rated, the table opens for the row, and the rating holds');
  check(await page.$$eval('.qf-band-head .qf-band-h', h => h.map(x => x.textContent.trim()).join('|')) === 'SQS|SNS|EventBridge', 'the band header is a strip of short labels');
  check(await page.$eval('.qf-band-head', e => getComputedStyle(e).position === 'sticky' && getComputedStyle(e.parentElement).overflow !== 'hidden'), 'and it is sticky over the bands');
  await page.click('[data-qf-row="0"]'); await page.click('#qf-submit');
  check(!await page.$('[data-c]') && /NOT QUITE|PARTLY/.test(await page.textContent('#panel .verdict')), 'Submit on the row goes straight to feedback with the earlier rating (no second rating)');
  await page.click('#q-next'); await page.waitForTimeout(30);
  check(await page.evaluate(() => window.__fr && window.__fr.ok === false && window.__fr.conf === 2 && window.__fr.pts === -3), 'a wrong column rated Sure before the table costs the Sure stake');
  // rowStep false: the name-only reading state.
  await page.evaluate(() => { window.__fr = null; const it = SD.fmtItems.find(i => i.id === 'fmt-compare-12'); SD.modes.askFormat(it, { title: 'TEST', mode: 'scored', colFirst: true, rowStep: false }).then(r => { window.__fr = r; }); });
  await page.waitForSelector('#panel .qf');
  const a12 = await page.evaluate(() => SD.fmtItems.find(i => i.id === 'fmt-compare-12').a);
  await page.click(`[data-qf-col="${a12}"]`);
  check(!await page.$('.qf-bands, [data-qf-row]') && !await page.$('#qf-submit[disabled]'), 'rowStep false with colFirst: names only, no table and no row to pick, and Submit is ready');
  await page.click('#qf-submit'); await page.click('[data-c="1"]');
  check(!!await page.$('#panel .qf-bands'), 'the table shows in the feedback');
  await page.click('#q-next'); await page.waitForTimeout(30);
  check(await page.evaluate(() => window.__fr && window.__fr.ok === true && window.__fr.pts === 2 && window.__fr.col.ok && !window.__fr.row), 'and the column alone is graded, with no row reported');
  const shs = await page.evaluate(() => { const it = SD.fmtItems.find(i => i.id === 'fmt-compare-21'); let ok = true; for (let n = 0; n < 20; n++) { const s = SD.qf.shuffleCompare(it); ok = ok && s.short.every((l, ci) => l === it.short[s.colMap[ci]]); } return [ok, SD.fmtItems.filter(i => i.type === 'compare').every(i => Array.isArray(i.short) && i.short.length === i.cols.length && i.short.every(l => l && l.length <= 15))]; });
  check(shs[0] && shs[1], 'every compare item has a short label per column (15 characters or fewer), and they move with shuffled columns');

  // ---- Calibration ----
  const cal = await page.evaluate(() => { const t = { 0: [1, 4], 1: [3, 5], 2: [2, 5] }; const d = document.createElement('div'); d.innerHTML = SD.modes.calibHtml(t); return [[...d.querySelectorAll('tr')].map(tr => [...tr.children].map(x => x.textContent.trim()).join(' ')).join(' | '), SD.modes.points(t)]; });
  check(/Sure 2 of 5 right \(40%\) ↓ Too sure/.test(cal[0]), 'calibration: Sure at 40% reads "Too sure" in words');
  check(/Think so 3 of 5 right \(60%\) ✓ On target/.test(cal[0]) && /Guess 1 of 4 right \(25%\) ✓ On target/.test(cal[0]), 'calibration: in-band buttons read "On target"');
  check(cal[1] === 1 + 0 + 3 * 2 - 2 + 2 * 3 - 3 * 3, 'calibration points add up (' + cal[1] + ')');
  const all = await page.evaluate(() => SD.state.save.modes.cal[2]);
  check(all && all[1] === 4 && all[0] === 2, 'answers through SD.modes.ask and scored format items add to the all-modes calibration (' + JSON.stringify(all) + ')');

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
