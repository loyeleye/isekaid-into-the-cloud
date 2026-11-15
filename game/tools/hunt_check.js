// Headless check of Monster Hunt (js/hunt.js) at phone width (375px), without the shared modes shell: the Today card's
// link, Bru's bounty board (3 monsters, oldest first, different topics, Kyu's note), the first-run walkthrough, Track
// (Type it first), Fight (a twin), Pin it down (existing "why not" lines only), captured / escaped / wounded by the
// Wall's rule, Stop for now and resume on the same encounter, results (calibration, pay once a day, Pip), the bestiary,
// spacing (nothing hunted today comes back today; wounded skips Track; escaped gets a different twin), sightings (topic
// only, wild monsters ask unseen questions, a wild miss goes on the Wall, none from Nov 28) and verified-first twins.
// Run from game/:  node tools/hunt_check.js     SHOTS=dir saves screenshots.
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
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.waitForTimeout(500); if (SHOTS) await page.evaluate(() => document.querySelectorAll('.sysnote').forEach(e => e.remove())); if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'hunt-' + name + '.png') }); };
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

  // Answers the quiz question on screen, right or wrong, with a confidence (0 Guess, 1 Think so, 2 Sure).
  const answer = (right, conf) => page.evaluate(async ([right, conf]) => {
    const p = document.querySelector('#panel'), q = SD.hunt.live().q;
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const said = p.querySelector('#q-said'); if (said) { said.click(); await wait(10); }
    const tf = p.querySelector('#tf-idk'); if (tf) { tf.click(); await wait(10); }
    if (q.type === 'mc') {
      const want = right ? q.a : q.opts.findIndex((o, i) => i !== q.a);
      document.querySelector(`#panel [data-o="${want}"]`).click();
    } else if (q.type === 'multi') {
      q.items.forEach((it, i) => { if (right ? it.ok : !it.ok) document.querySelector(`#panel [data-m="${i}"]`).click(); });
    }
    await wait(10);
    document.querySelector(`#panel [data-c="${conf}"]`).click();
    await wait(10);
    return q.id;
  }, [right, conf]);
  const next = async () => { await page.click('#q-next'); await page.waitForTimeout(40); };
  const pin = async (right, conf) => {
    await page.waitForSelector('#panel [data-pr]');
    const a = await page.evaluate(() => { const h = SD.state.save.hunt; return h.mons[h.i].pin.a; });
    await page.click(`#panel [data-pr="${right ? a : (a + 1) % 3}"]`);
    await page.click(`#panel [data-pc="${conf}"]`);
    const txt = await page.textContent('#panel');
    await page.click('#hn-pnext');
    await page.waitForTimeout(40);
    return txt;
  };
  const hunt = () => page.evaluate(() => SD.state.save.hunt);
  const step = () => page.evaluate(() => { const h = SD.state.save.hunt; const m = h && h.mons[h.i]; return m ? m.steps[m.k] : null; });

  await page.clock.install({ time: new Date('2026-11-16T12:00:00') });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('hunt-check')) { localStorage.clear(); sessionStorage.setItem('hunt-check', '1'); } } catch (e) { /* ignore */ } });
  await boot();
  // Four posters on four topics, each with a twin; the oldest already has a right answer from yesterday.
  const posters = await page.evaluate(() => {
    const s = SD.state.save;
    s.examTrack = 'DVA'; s.examDate = '2026-11-30'; s.todaySkip = true;
    const seen = new Set(), out = [];
    Object.keys(SD.twins).forEach(id => {
      const q = SD.exam.find(id);
      if (out.length >= 4 || !q || q.type !== 'mc' || !SD.exam.allowed(q) || seen.has(q.topic) || SD.recall.codey(q.opts)) return;
      const tw = SD.twins[id].map(SD.exam.find).filter(x => x && SD.exam.allowed(x));
      if (!tw.length || tw.some(x => x.type !== 'mc')) return;
      // Avoid a poster that is a twin of another poster: each must stand for its own idea.
      if (out.some(o => SD.twins[o].includes(id) || SD.twins[id].includes(o))) return;
      seen.add(q.topic); out.push(id);
    });
    const day = 86400000, now = Date.now();
    s.wall = out.map((id, i) => ({ id, t: now - (10 - i) * day, rights: i === 0 ? [{ t: now - day, q: SD.twins[id][0] }] : [] }));
    SD.state.persist(); SD.today.render();
    return out;
  });
  check(posters.length === 4, 'four test posters on four topics (' + posters.join(', ') + ')');
  const SHELL = await page.evaluate(() => !!(SD.modes && SD.modes.ask));
  const WN = SHELL ? '#md-next' : '#hn-wnext', STOP = SHELL ? '#md-stop' : '#hn-stop';
  console.log('     shared modes shell: ' + (SHELL ? 'loaded' : 'not loaded, hunt.js uses its own copy'));
  const openHunt = async () => { if (SHELL) await page.evaluate(() => SD.hunt.open()); else await page.click('#td-hunt'); };
  if (SHELL) check(await page.evaluate(() => !!SD.modes.get('hunt')), 'Monster Hunt is registered with the mode picker');
  else check(!!await page.$('#td-hunt'), 'without the shared Play button, the Today card links to Monster Hunt');
  await openHunt();
  const board = await page.textContent('#panel');
  check(/Two copies\. Test them\. — K\./.test(board), 'Kyu\'s note is pinned above the board');
  check(/Each poster on your Wall is a monster/.test(board), 'first run: the one-line explanation on the board');
  check((await page.$$('.hn-mon')).length === 3, 'the board shows 3 monsters');
  const ids = await page.evaluate(() => SD.hunt.board().map(w => w.id));
  check(JSON.stringify(ids) === JSON.stringify(posters.slice(0, 3)), 'oldest first');
  check(await page.evaluate(ids => new Set(ids.map(id => SD.exam.find(id).topic)).size === 3, ids), 'from three different topics');
  check(/Track.*Fight.*Pin it down/.test(await page.textContent('.hn-mon')), 'each monster shows its three steps');
  await noHScroll('bounty board');
  await shot('board');

  // ---- First run walkthrough ----
  await page.click('#hn-go');
  await page.waitForSelector(WN);
  check(/Here's one of yours/.test(await page.textContent('#panel')) && !!await page.$('.hn-opt'), 'walkthrough screen 1 shows a real question');
  await noHScroll('walkthrough');
  await shot('walk1');
  await page.click(WN); await page.click(WN);
  check(/Captured/.test(await page.textContent('#panel')) && /Wounded/.test(await page.textContent('#panel')), 'walkthrough screen 3 explains the outcomes');
  await page.click(WN);
  await page.waitForSelector('#panel .win.quiz ' + STOP);

  // ---- Monster 1: Track, Fight, Pin, all right, captured (yesterday's right + today = two days) ----
  check(await step() === 'track', 'the hunt starts with Track');
  check(!!await page.$('#tf-in'), 'Track: Type it first, options hidden');
  check(!!await page.$('#tf-idk'), 'Track: "I don\'t know yet" is in view');
  await noHScroll('track');
  await shot('track');
  const t1 = await answer(true, 2);
  check(t1 === posters[0], 'Track asks the poster\'s own question');
  check(!!await page.$('.q-src'), 'the verdict shows the verified source block');
  await noHScroll('verdict');
  await next();
  check(await step() === 'fight', 'then Fight');
  const f1 = await answer(true, 1);
  check(await page.evaluate(([p, f]) => SD.twins[p].includes(f), [posters[0], f1]), 'Fight asks a twin');
  await next();
  check(await step() === 'pin', 'then Pin it down');
  check(/Why doesn't this fit here\?/.test(await page.textContent('#panel')) && (await page.$$('#panel [data-pr]')).length === 3, 'Pin it down: one option, three reasons');
  const pinOk = await page.evaluate(([f]) => {
    const h = SD.state.save.hunt, p = h.mons[0].pin, q = SD.exam.find(f);
    const i = q.opts.indexOf(p.opt);
    return i >= 0 && i !== q.a && q.no[i] === p.reasons[p.a] && p.reasons.every(r => SD.bank.some(x => Array.isArray(x.no) && x.no.includes(r)));
  }, [f1]);
  check(pinOk, 'the right reason is that wrong option\'s own "why not" line, and every reason is existing bank text');
  await noHScroll('pin it down');
  await shot('pin');
  const pv = await pin(true, 2);
  check(/PINNED IT!/.test(pv) && /\+3 pts/.test(pv), 'Pin verdict: one line, with the stake (+3 for a right Sure)');
  check(await page.evaluate(id => !SD.state.save.wall.some(w => w.id === id), posters[0]), 'captured: the poster comes down');
  check(await page.evaluate(() => SD.state.save.bestiary.length === 1 && !!SD.state.save.bestiary[0].lesson), 'and it goes into the bestiary with its lesson');
  check(await page.evaluate(() => SD.state.save.hunt.mons[0].out === 'captured'), 'outcome: captured');

  // ---- Monster 2: Track missed, escaped ----
  await answer(false, 0); await next();
  const f2 = await answer(true, 1); await next();
  await pin(true, 1);
  const m2 = await page.evaluate(id => ({ out: SD.state.save.hunt.mons[1].out, mon: SD.state.save.huntMon[id], up: SD.state.save.wall.find(w => w.id === id) }), posters[1]);
  check(m2.out === 'escaped', 'a miss: escaped');
  check(m2.up && m2.up.rights.length === 0, 'its rights reset, as on the Wall');
  check(m2.mon && m2.mon.twins.includes(f2), 'it remembers the twin it fought, for a different one next time');

  // ---- Monster 3: Stop for now on Fight, resume on the same encounter, then wounded ----
  await answer(true, 1); await next();
  check(await step() === 'fight', 'monster 3 at Fight');
  const fq = await page.evaluate(() => SD.hunt.live().q.id);
  await page.click(STOP);
  check(await page.evaluate(() => document.querySelector('#panel').hidden), 'Stop for now closes the hunt');
  check(await page.evaluate(() => { const h = SD.state.save.hunt; return h.i === 2 && h.mons[2].k === 1; }), 'the hunt is saved on monster 3, Fight');
  await page.reload();
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');
  if (SHELL) check(/Resume · monster 3 of 3/.test(await page.evaluate(() => SD.modes.get('hunt').status())), 'after a reload the mode picker offers to resume');
  else check(/resume/.test(await page.textContent('#td-hunt')), 'after a reload the Today card offers to resume');
  await openHunt();
  check(/Resume · monster 3 of 3/.test(await page.textContent('#hn-go')), 'the board says Resume · monster 3 of 3');
  await page.click('#hn-go');
  await page.waitForSelector('#panel .win.quiz ' + STOP);
  check(await page.evaluate(() => SD.hunt.live().q.id) === fq, 'resume lands on the same encounter');
  await answer(true, 1); await next();
  await pin(false, 0);
  check(await page.evaluate(() => SD.state.save.hunt.mons[2].out === 'wounded'), 'right today but not two days: wounded');
  await page.waitForSelector('.hn-results');
  const res = await page.textContent('#panel');
  check(/✓\s*.*Captured/.test(res) && /Escaped · back next hunt/.test(res) && /Wounded · back tomorrow/.test(res), 'results: each outcome as a word and a shape');
  check(/How sure you were/.test(res) && /Sure\s*:?\s*2 of 2 right/.test(res), 'results: the calibration readout');
  check(/\+20 XP · \+5 shards/.test(res) && await page.evaluate(() => SD.state.save.modes.paid.hunt === new Date().toDateString()), 'results: pays XP and shards once a day, marked where the shared shell marks it');
  check(/Pip: "Sorry to be a bother\. Why did that work\?"/.test(res), 'Pip gets the last word');
  await noHScroll('results');
  await shot('results');

  // ---- Same day: nothing hunted today comes back; only the fourth poster is up ----
  await page.click('#hn-board');
  check(await page.evaluate(() => JSON.stringify(SD.hunt.board().map(w => w.id))) === JSON.stringify([posters[3]]), 'same day: only the unhunted poster is on the board');
  await page.click('#hn-go');
  await page.waitForSelector('#panel .win.quiz ' + STOP);
  await answer(true, 1); await next(); await answer(true, 1); await next(); await pin(true, 1);
  await page.waitForSelector('.hn-results');
  check(/Today's pay is already taken/.test(await page.textContent('#panel')), 'a second hunt the same day doesn\'t pay again');

  // ---- Bestiary: Pip's question ----
  await page.click('#hn-board');
  await page.click('#hn-book');
  check(/Why did that work\?/.test(await page.textContent('#panel')), 'each bestiary card ends with Pip\'s question');
  await page.fill('.hn-whyf input', 'An on-failure destination keeps the event after retries.');
  await page.click('.hn-whyf button');
  check(await page.evaluate(() => /on-failure/.test(SD.state.save.bestiary[0].why)), 'the answer to Pip is saved on the card');
  await noHScroll('bestiary');
  await shot('bestiary');

  // ---- Next day: the wounded one skips Track; the escaped one fights a different twin when it has one ----
  await page.evaluate(() => SD.ui.closePanel());
  await page.clock.setSystemTime(new Date('2026-11-17T12:00:00'));
  await page.evaluate(() => { SD.state.save.hunt = null; SD.hunt.open(); });
  await page.click('#hn-go');
  await page.waitForSelector('#panel .win.quiz');
  const h2 = await hunt();
  const wm = h2.mons.find(m => m.id === posters[2]), em = h2.mons.find(m => m.id === posters[1]);
  check(wm && wm.steps[0] !== 'track', 'the wounded monster comes back without Track');
  const twinsOf1 = await page.evaluate(id => SD.twins[id].length, posters[1]);
  check(em && (twinsOf1 < 2 || em.qs.fight !== f2), 'the escaped monster fights a different twin (' + twinsOf1 + ' twins)');
  await page.click(STOP);

  // ---- Sightings ----
  await page.evaluate(() => { SD.state.save.hunt = null; SD.state.save.wall = []; SD.hunt.open(); });
  check(/board is clear/.test(await page.textContent('#panel')), 'an empty Wall: Bru says the board is clear');
  await page.click('#hn-sight');
  await page.click('[data-sp="t-sfn"]');
  await page.click('[data-sp="t-sfn"]');
  check(await page.evaluate(() => SD.state.save.sightings.length === 0), 'tapping a topic again takes the sighting back');
  await page.click('[data-sp="t-sfn"]');
  await page.click('[data-sp="t-s3"]');
  check(await page.evaluate(() => SD.state.save.sightings.length === 2 && SD.state.save.sightings.every(s => Object.keys(s).sort().join() === 'done,p,t,test')), 'a sighting logs only the topic and the test');
  await noHScroll('sightings');
  await shot('sightings');
  await page.click('#hn-sdone');
  check((await page.$$('.hn-mon')).length === 2 && /SIGHTED/.test(await page.textContent('#panel')), 'each sighting is a wild monster on the board');
  await page.click('#hn-go');
  await page.waitForSelector('#panel .win.quiz ' + STOP);
  const wq = await page.evaluate(() => SD.hunt.live().q);
  check(await page.evaluate(id => !(SD.state.save.qlog || {})[id] && SD.topicDrill.pool(SD.topicDrill.preset('t-sfn')).some(q => q.id === id), wq.id), 'a wild monster asks an unseen question on its topic');
  await answer(false, 0); await next();
  await pin(true, 0);
  check(await page.evaluate(id => SD.state.save.wall.some(w => w.id === id), wq.id), 'a wild miss goes up on the Wall');
  await page.evaluate(() => SD.hunt.stop());

  // ---- Verified first ----
  const vf = await page.evaluate(() => {
    const ok = q => q && SD.exam.allowed(q) && !SD.exam.offTrack(q) && q.type !== 'explain';
    const id = Object.keys(SD.twins).find(k => ok(SD.exam.find(k)) && SD.twins[k].map(x => SD.exam.find(x)).filter(ok).length >= 2);
    const tw = id ? SD.twins[id].filter(x => ok(SD.exam.find(x))) : [];
    return { id, want: tw[1] };
  });
  check(!!vf.id, 'found a poster with two twins for the verified-first check');
  const vpick = await page.evaluate(vf => {
    const keep = SD.verified; SD.verified = { [vf.want]: { on: '2026-11-16', src: [] } };
    const out = new Set();
    for (let i = 0; i < 8; i++) { SD.state.save.wall = [{ id: vf.id, t: 1, rights: [] }]; SD.state.save.huntMon = {}; SD.state.save.hunt = null; SD.state.save.sightings = []; out.add(SD.hunt._newHunt().mons[0].qs.fight); }
    SD.verified = keep; SD.state.save.hunt = null;
    return [...out];
  }, vf);
  check(vpick.length === 1 && vpick[0] === vf.want, 'Fight picks a verified twin over an unverified one');

  // ---- Clue log ----
  const cl = await page.evaluate(() => {
    const h = { clues: [0, 0] }, n = (SD.state.save.huntLog || []).length;
    SD.hunt._logClues(h, { id: 'dva-1-02' }, { ok: true, conf: 1, clues: { opened: [0, 2], total: 3 } });
    SD.hunt._logClues(h, { id: 'dva-1-04' }, { ok: false, conf: 0 });
    const log = SD.state.save.huntLog;
    return { h: h.clues, grew: log.length - n, last: log[log.length - 1] };
  });
  check(cl.grew === 1 && cl.h.join() === '2,3' && cl.last.q === 'dva-1-02' && cl.last.opened.join() === '0,2' && cl.last.total === 3, 'the clue log records which clues were open per answer, and skips answers without clues');

  // ---- No sightings in the last days ----
  await page.clock.setSystemTime(new Date('2026-11-28T12:00:00'));
  await page.evaluate(() => SD.hunt.open());
  check(!await page.$('#hn-sight'), 'from Nov 28 there are no sightings (review only)');

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page or console errors');
  if (fails.length) { console.error(`${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('OK: the Monster Hunt checks all pass, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
