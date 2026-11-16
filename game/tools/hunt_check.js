// Headless check of Monster Hunt (js/hunt.js) at phone width (375px), without the shared modes shell: the Today card's
// link, Bru's bounty board (a scene in the street: 3 monsters, oldest first, different topics, Kyu's note, a poster up close, battle it first), the first-run walkthrough, Track
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
  // Between battles: pick the next monster (the first one not yet battled).
  const follow = async () => { await page.waitForSelector('[data-mon]'); await page.click('[data-mon]'); await page.waitForTimeout(40); };
  // The health bar on the question window: "HP n/m".
  const hp = () => page.evaluate(() => { const e = document.querySelector('#panel .hn-hp.hn-inq'); return e ? e.getAttribute('aria-label').replace(/^.*health /, '') : null; });
  // After a miss: the retry on a twin, answered right.
  const retry = async () => {
    const has = await page.evaluate(() => { const h = SD.state.save.hunt, m = h.mons[h.i]; return !!(m && m.retry); });
    if (has) { await page.waitForSelector('#panel .win.quiz', { timeout: 3000 }).catch(async () => { console.log('PANEL:', (await page.textContent('#panel')).slice(0, 300), errors); }); await answer(true, 1); await next(); }
    return has;
  };
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
      if (SD.huntCore && SD.huntCore.TOPICS[q.topic]) return;   // board topics battle on a board: tools/hunt_board_check.js
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
  // The bank-question battle first: faded items are put aside here and tested on their own below.
  await page.evaluate(() => { window.__faded = SD.fmtItems.filter(x => x.type === 'faded'); SD.fmtItems = SD.fmtItems.filter(x => x.type !== 'faded'); });
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
  const faces = await page.evaluate(() => [...document.querySelectorAll('.hn-mon')].map(el => {
    const img = el.querySelector('.hn-por img');
    return { wanted: /WANTED/.test(el.querySelector('.hn-wh').textContent), src: img && img.getAttribute('src'), alt: img && img.getAttribute('alt'), hidden: img && img.getAttribute('aria-hidden'), w: img && img.naturalWidth };
  }));
  check(faces.every(f => f.wanted && /^assets\/img\/(monsters|hunt)\/[a-z]+\.webp$/.test(f.src) && f.alt === '' && f.hidden === 'true'), 'each poster reads WANTED, with a portrait that screen readers skip');
  await page.waitForTimeout(300);
  check(await page.evaluate(() => [...document.querySelectorAll('.hn-mon .hn-por img')].every(i => i.complete && i.naturalWidth > 0)), 'every portrait loads');
  check(await page.evaluate(() => {
    const f = SD.hunt._faceOf, a = { name: 'SQS · task 1.1' };
    const sqs = Object.keys(SD.twins).find(k => (SD.exam.find(k) || {}).topic === 'sqs'), iam = Object.keys(SD.twins).find(k => (SD.exam.find(k) || {}).topic === 'iam');
    return f({ id: sqs, name: 'x' }) === 'assets/img/hunt/poison.webp' && f({ id: iam, name: 'x' }) === 'assets/img/hunt/warden.webp' && f(a) === f({ name: a.name }) && /monsters\//.test(f(a));
  }), 'a board topic\'s poster shows its board monster, any other a bestiary face picked by its name');
  await noHScroll('bounty board');
  await shot('board');
  // The board is a scene (js/hunt-street.js): a notice board in the night street, Bru beside it talking in a live
  // bubble, a lantern per monster under it, and each poster a button that shows it up close.
  const scene = await page.evaluate(() => {
    const r = document.querySelector('#panel .hu'), say = r && r.querySelector('.hs-say');
    return { art: !!(r && r.querySelector('.hu-stand img.hu-art[src*="notice-board"]')), bru: !!(r && r.querySelector('.hs-bru .hs-body')),
      say: !!say && say.getAttribute('aria-live') === 'polite' && !say.hidden && /Each poster on your Wall/.test(say.textContent),
      taps: [...document.querySelectorAll('.hn-mon button.hu-tap')].filter(b => /^Wanted: /.test(b.getAttribute('aria-label') || '')).length,
      lamps: document.querySelectorAll('.hu-lamps .hu-lamp').length };
  });
  check(scene.art && scene.bru && scene.say, 'the bounty board stands in the street, with Bru beside it and her line in a live speech bubble');
  check(scene.taps === 3 && scene.lamps === 3, 'each poster is a named button, and a lantern hangs for each monster');
  await page.click('[data-post="0"]');
  const zoom = await page.evaluate(() => { const z = document.querySelector('.hu-zoom'); return { open: !z.hidden, txt: z.textContent, back: !!z.querySelector('#hn-zback'), go: !!z.querySelector('#hn-zgo'), focus: z.contains(document.activeElement) }; });
  check(zoom.open && /Track.*Fight.*Pin it down/.test(zoom.txt) && zoom.back && zoom.go && zoom.focus, 'a poster up close: its steps, Battle this one first, and Back to the board');
  await noHScroll('a poster up close');
  await page.click('#hn-zback');
  check(await page.evaluate(() => document.querySelector('.hu-zoom').hidden && document.activeElement && document.activeElement.dataset.post === '0'), 'Back to the board closes it and returns focus to the poster');

  // ---- First run walkthrough ----
  await page.click('#hn-go');
  await page.waitForSelector(WN);
  check(/Here's one of yours/.test(await page.textContent('#panel')) && !!await page.$('.hn-opt'), 'walkthrough screen 1 shows a real question');
  await noHScroll('walkthrough');
  await shot('walk1');
  await page.click(WN); await page.click(WN);
  check(/Captured/.test(await page.textContent('#panel')) && /Wounded/.test(await page.textContent('#panel')), 'walkthrough screen 3 explains the outcomes');
  await page.click(WN);
  await page.waitForSelector('[data-mon]');
  check((await page.$$('.hn-bt')).length === 3 && (await page.$$('[data-mon]')).length === 3, 'the battle picker: three monsters, each one a battle you can choose');
  check((await page.$$('.hn-bt .hn-pipd.on')).length === 3 + 3 + 3, 'each monster starts at full health: three pips');
  check(!await page.$('#panel .q-q'), 'the picker never shares a screen with a question');
  check(await page.evaluate(() => !SD.state.save.hunt.forks && SD.state.save.hunt.stamina == null), 'no forks and no stamina');
  await noHScroll('picker');
  await shot('pick');
  await follow();
  await page.waitForSelector('#panel .win.quiz ' + STOP);

  // ---- Monster 1: Track, Fight, Pin, all right, captured (yesterday's right + today = two days) ----
  check(await step() === 'track', 'the hunt starts with Track');
  check(await hp() === '3 of 3', 'Track shows the monster\'s health bar: 3 of 3');
  check(!!await page.$('#tf-in'), 'Track: Type it first, options hidden');
  check(!!await page.$('#tf-idk'), 'Track: "I don\'t know yet" is in view');
  await noHScroll('track');
  await shot('track');
  const t1 = await answer(true, 2);
  check(await page.evaluate(([p, t]) => SD.twins[p].includes(t), [posters[0], t1]), 'Track asks a twin, not the poster\'s own question');
  check(!!await page.$('.q-src'), 'the verdict shows the verified source block');
  await noHScroll('verdict');
  await next();
  check(await step() === 'fight', 'then Fight');
  check(await hp() === '2 of 3', 'a right Track lands a hit: 2 of 3');
  const f1 = await answer(true, 1);
  check(f1 !== t1 && await page.evaluate(([p, f]) => SD.twins[p].includes(f) || (f === p && SD.twins[p].length === 1), [posters[0], f1]), 'Fight asks a second twin, or the original when there is only one');
  await next();
  check(await step() === 'pin', 'then Pin it down');
  check(await hp() === '1 of 3', 'Pin it down shows the bar too: 1 of 3');
  check(/Why doesn't this fit here\?/.test(await page.textContent('#panel')) && (await page.$$('#panel [data-pr]')).length === 3, 'Pin it down: one option, three reasons');
  const pinOk = await page.evaluate(([f]) => {   // Pin is built from the Track question
    const h = SD.state.save.hunt, p = h.mons[0].pin, q = SD.exam.find(f);
    const i = q.opts.indexOf(p.opt);
    return i >= 0 && i !== q.a && q.no[i] === p.reasons[p.a] && p.reasons.every(r => SD.bank.some(x => (Array.isArray(x.no) && x.no.includes(r)) || (Array.isArray(x.items) && x.items.some(it => it.no === r))));
  }, [t1]);
  check(pinOk, 'Pin comes from the Track question: the right reason is that wrong option\'s own "why not" line, and every reason is existing bank text');
  await noHScroll('pin it down');
  await shot('pin');
  const pv = await pin(true, 2);
  check(/PINNED IT!/.test(pv) && /\+3 pts/.test(pv), 'Pin verdict: one line, with the stake (+3 for a right Sure)');
  check(await page.evaluate(id => !SD.state.save.wall.some(w => w.id === id), posters[0]), 'captured: the poster comes down');
  check(await page.evaluate(() => SD.state.save.bestiary.length === 1 && !!SD.state.save.bestiary[0].lesson), 'and it goes into the bestiary with its lesson');
  check(await page.evaluate(() => SD.state.save.hunt.mons[0].out === 'captured'), 'outcome: captured');

  // ---- Monster 2: Track missed, a retry on another twin, escaped ----
  await follow();
  check(/Captured/.test(await page.evaluate(() => SD.state.save.hunt.since)), 'the picker says what happened since your last move');
  const t2 = await answer(false, 0); await next();
  const r2 = await page.evaluate(() => { const h = SD.state.save.hunt; return h.mons[h.i].retry; });
  const canRetry = await page.evaluate(([p, t]) => { const h = SD.state.save.hunt, m = h.mons[h.i], used = new Set([p, t].concat(Object.values(m.qs))); return (SD.twins[t] || []).concat(SD.twins[p] || [], [p]).some(id => !used.has(id) && SD.exam.allowed(SD.exam.find(id))); }, [posters[1], t2]);
  check(canRetry ? !!r2 && r2 !== t2 : !r2, `a miss: a retry straight away on a different question (${canRetry ? 'one exists' : 'none left for this idea, so none'})`);
  if (r2) { await page.waitForSelector('#panel .win.quiz'); check(/hit back/.test(await page.textContent('#panel .q-ctx')) && await hp() === '3 of 3', 'a miss: it hits back, and its health stays'); }
  await retry();
  const f2 = await answer(true, 1); await next();
  await pin(true, 1);
  const m2 = await page.evaluate(id => ({ out: SD.state.save.hunt.mons[1].out, mon: SD.state.save.huntMon[id], up: SD.state.save.wall.find(w => w.id === id) }), posters[1]);
  check(m2.out === 'escaped', 'a miss: escaped');
  check(m2.up && m2.up.rights.length === 0, 'its rights reset, as on the Wall');
  check(m2.mon && m2.mon.twins.includes(t2), 'it remembers the twins it was hunted with, for different ones next time');

  // ---- Monster 3: Stop for now on Fight, resume on the same encounter, then wounded ----
  await follow();
  await answer(true, 1); await next();
  check(await step() === 'fight', 'monster 3 at Fight');
  const fq = await page.evaluate(() => SD.hunt.live().q.id);
  await page.click(STOP);
  check(await page.evaluate(() => document.querySelector('#panel').hidden), 'Stop for now closes the hunt');
  check(await page.evaluate(() => { const h = SD.state.save.hunt; return h.i === 2 && h.mons[2].k === 1; }), 'the hunt is saved on monster 3, Fight');
  await page.reload();
  await page.click('#t-start');
  await page.evaluate(() => { window.__faded = SD.fmtItems.filter(x => x.type === 'faded'); SD.fmtItems = SD.fmtItems.filter(x => x.type !== 'faded'); });
  await page.waitForSelector('#today-card:not([hidden])');
  if (SHELL) check(/Resume · battling/.test(await page.evaluate(() => SD.modes.get('hunt').status())), 'after a reload the mode picker offers to resume');
  else check(/resume/.test(await page.textContent('#td-hunt')), 'after a reload the Today card offers to resume');
  await openHunt();
  check(/Resume the hunt · 2 of 3 battled/.test(await page.textContent('#hn-go')), 'the board says Resume the hunt · 2 of 3 battled');
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
  check(!/stamina/.test(res), 'results: no stamina points');
  check(/\+20 XP · \+5 shards/.test(res) && await page.evaluate(() => SD.state.save.modes.paid.hunt === new Date().toDateString()), 'results: pays XP and shards once a day, marked where the shared shell marks it');
  check(/Pip: "Sorry to be a bother\. Why did that work\?"/.test(res), 'Pip gets the last word');
  await noHScroll('results');
  await shot('results');

  // ---- Same day: nothing hunted today comes back; only the fourth poster is up ----
  await page.click('#hn-board');
  check(await page.evaluate(() => JSON.stringify(SD.hunt.board().map(w => w.id))) === JSON.stringify([posters[3]]), 'same day: only the unhunted poster is on the board');
  await page.click('#hn-go');
  await follow();
  await page.waitForSelector('#panel .win.quiz ' + STOP);
  for (let k = 0; k < 3 && await step() !== 'pin'; k++) { await answer(true, 1); await next(); }
  await pin(true, 1);
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
  await page.waitForSelector('[data-mon]');
  const h2 = await hunt();
  const wm = h2.mons.find(m => m.id === posters[2]), em = h2.mons.find(m => m.id === posters[1]);
  check(wm && wm.steps[0] !== 'track', 'the wounded monster comes back without Track');
  const twinsOf1 = await page.evaluate(id => SD.twins[id].length, posters[1]);
  check(em && (twinsOf1 < 2 || em.qs.track !== t2), 'the escaped monster is tracked with a different twin (' + twinsOf1 + ' twins)');
  // You choose the order: battle the second monster first. The wounded one shows Track's pip already gone.
  await page.waitForSelector('[data-mon="1"]');
  const wi = h2.mons.indexOf(h2.mons.find(m => m.id === posters[2]));
  check((await page.$$(`.hn-bt:nth-child(${wi + 1}) .hn-pipd.on`)).length === 2, 'the wounded monster comes back with 2 of 3 pips');
  await noHScroll('picker, next day');
  await shot('pick2');
  await page.click('[data-mon="1"]');
  await page.waitForSelector('#panel .win.quiz ' + STOP);
  check(await page.evaluate(() => SD.state.save.hunt.i === 1 && SD.hunt.live().m === SD.state.save.hunt.mons[1]), 'you pick which monster to battle next');
  await page.evaluate(() => SD.hunt.stop());

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
  await follow();
  await page.waitForSelector('#panel .win.quiz ' + STOP);
  check(await hp() === '2 of 2', 'a wild monster has two pips');
  const wq = await page.evaluate(() => SD.hunt.live().q);
  check(await page.evaluate(id => !(SD.state.save.qlog || {})[id] && SD.topicDrill.pool(SD.topicDrill.preset('t-sfn')).some(q => q.id === id), wq.id), 'a wild monster asks an unseen question on its sighting\'s topic');
  await answer(false, 0); await next();
  await retry();
  await pin(true, 0);
  check(await page.evaluate(id => SD.state.save.wall.some(w => w.id === id), wq.id), 'a wild miss goes up on the Wall');
  await page.evaluate(() => SD.hunt.stop());

  // ---- Fight as a faded worked example ----
  await page.evaluate(() => SD.ui.closePanel());
  const fp = await page.evaluate(() => {
    SD.fmtItems = SD.fmtItems.concat(window.__faded);
    const topics = new Set(window.__faded.filter(x => x.tracks.some(t => /^DVA/.test(t))).map(x => x.topic));
    const ok = id => { const q = SD.exam.find(id); return q && q.type === 'mc' && SD.exam.allowed(q) && !SD.exam.offTrack(q); };
    const id = Object.keys(SD.twins).find(k => ok(k) && topics.has(SD.exam.find(k).topic) && !(SD.huntCore && SD.huntCore.TOPICS[SD.exam.find(k).topic]) && SD.twins[k].filter(ok).length >= 2);
    const s = SD.state.save;
    s.wall = [{ id, t: Date.now() - 86400000 * 5, rights: [] }]; s.huntMon = {}; s.hunt = null; s.sightings = [];
    if (s.fg && s.fg.fmt) delete s.fg.fmt.faded;
    SD.state.persist();
    return { id, topic: SD.exam.find(id).topic };
  });
  check(!!fp.id, 'a poster on a topic with faded examples (' + fp.id + ', ' + fp.topic + ')');
  await page.evaluate(() => SD.hunt.start());
  await follow();
  const fm = await page.evaluate(() => { const m = SD.state.save.hunt.mons[0]; return { faded: m.qs.faded, n: m.fadeN }; });
  check(!!fm.faded && fm.n >= 1, 'a first battle\'s Fight is a faded example on the poster\'s topic, with one pip per blank (' + fm.faded + ', ' + fm.n + ')');
  check(await hp() === '4 of 4', 'the health bar counts one pip per blank step: 4');
  await answer(true, 1); await next();
  // The first faded example is worked through (not scored); the bank twin is then the Fight.
  await page.waitForSelector('#qf-got');
  check(await hp() === '3 of 4', 'the health bar shows on the faded example too');
  await page.click('#qf-got');
  await page.waitForSelector('#panel .win.quiz ' + STOP);
  check(await step() === 'fight' && await page.evaluate(() => SD.hunt.live().q && SD.hunt.live().q.id === SD.state.save.hunt.mons[0].qs.fight), 'while the format is new, the bank twin is asked as the Fight');
  await page.click(STOP);
  // Once the format is known it's scored: fill one blank right and one wrong.
  await page.evaluate(() => { const h = SD.state.save.hunt, m = h.mons[0]; delete m.fadedDone; SD.state.save.fg.fmt.faded = { n: 5, last: [true, true], known: true, lastMode: 'scored' }; SD.state.persist(); });
  await page.evaluate(() => SD.hunt.start());
  await page.waitForSelector('[data-qf-fill]');
  await noHScroll('faded example');
  check((await page.$$('#panel .win-h .td-stop')).length === 1, 'one Stop for now on the faded example');
  await shot('faded');
  await page.evaluate(() => {
    const it = SD.fmtItems.find(x => x.id === SD.state.save.hunt.mons[0].qs.faded);
    const blanks = [...new Set([...document.querySelectorAll('#panel [data-qf-fill]')].map(b => +b.dataset.qfFill.split(':')[0]))];
    blanks.forEach((i, k) => {
      const want = k === 0 ? it.steps[i].opts.indexOf(it.steps[i].t) : it.steps[i].opts.findIndex(o => o !== it.steps[i].t);
      document.querySelector(`#panel [data-qf-fill="${i}:${want}"]`).click();
    });
  });
  await page.click('#qf-submit');
  await page.click('#panel [data-c="1"]');
  await page.waitForSelector('#q-next');
  await page.click('#q-next');
  await page.waitForTimeout(60);
  const fr = await page.evaluate(() => { const m = SD.state.save.hunt.mons[0]; return { res: m.res.fight, retry: m.retry, fight: m.qs.fight }; });
  check(fr.res && fr.res.hits === 1 && fr.res.ok === 0, 'one step right, one wrong: one hit lands, and it counts as a miss');
  check(await page.evaluate(() => SD.hunt._hpOf(SD.state.save.hunt.mons[0])) === 2, 'health goes from 3 to 2');
  check(fr.retry === fr.fight, 'a faded miss is followed by the retry on the bank twin');
  await page.waitForSelector('#panel .win.quiz ' + STOP);
  check(/hit back/.test(await page.textContent('#panel .q-ctx')), 'and it hits back');
  await page.click(STOP);

  // ---- Verified first ----
  const vf = await page.evaluate(() => {
    const ok = q => q && SD.exam.allowed(q) && !SD.exam.offTrack(q) && q.type !== 'explain';
    const id = Object.keys(SD.twins).find(k => ok(SD.exam.find(k)) && !(SD.huntCore && SD.huntCore.TOPICS[SD.exam.find(k).topic]) && SD.twins[k].map(x => SD.exam.find(x)).filter(ok).length >= 2);
    const tw = id ? SD.twins[id].filter(x => ok(SD.exam.find(x))) : [];
    return { id, want: tw[1] };
  });
  check(!!vf.id, 'found a poster with two twins for the verified-first check');
  const vpick = await page.evaluate(vf => {
    const keep = SD.verified; SD.verified = { [vf.want]: { on: '2026-11-16', src: [] } };
    const out = new Set();
    for (let i = 0; i < 8; i++) { SD.state.save.wall = [{ id: vf.id, t: 1, rights: [] }]; SD.state.save.huntMon = {}; SD.state.save.hunt = null; SD.state.save.sightings = []; out.add(SD.hunt._newHunt().mons[0].qs.track); }
    SD.verified = keep; SD.state.save.hunt = null;
    return [...out];
  }, vf);
  check(vpick.length === 1 && vpick[0] === vf.want, 'Track picks a verified twin over an unverified one');

  // ---- Simulation hook ----
  const simr = await page.evaluate(async () => {
    const out = {};
    let seed = 7; const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    for (const route of ['near', 'far']) for (const p of [0.45, 0.8]) {
      let pts = 0, max = 0, share = 0; const N = 2000;
      for (let k = 0; k < N; k++) { const r = await SD.hunt.sim({ p, conf: 'honest', route }, rng); pts += r.pts; max = Math.max(max, r.minutes); share = Math.max(share, r.mapShare); }
      out[route + p] = { pts: +(pts / N).toFixed(1), max: +max.toFixed(1), share: +share.toFixed(3) };
    }
    return out;
  });
  console.log('     sim (honest confidence): ' + JSON.stringify(simr));
  check(Object.values(simr).every(r => r.max <= 20 && r.share <= 0.2), 'simulated hunts stay under 20 minutes with under 20% of the time on the map');
  check([0.45, 0.8].every(p => Math.abs(simr['near' + p].pts - simr['far' + p].pts) <= 0.05 * Math.max(1, Math.abs(simr['near' + p].pts))), 'battle order is a tie: the choice that scores is confidence, not order');

  // ---- The retry after a miss ----
  const rt = await page.evaluate(() => {
    const ok = id => { const q = SD.exam.find(id); return q && SD.exam.allowed(q); };
    const p = Object.keys(SD.twins).find(k => ok(k) && SD.twins[k].filter(ok).length >= 3);
    const tw = SD.twins[p].filter(ok), m = { id: p, qs: { track: tw[0], fight: tw[1] } };
    const r = SD.hunt._retryTwin(m, SD.exam.find(tw[0]));
    return { p, r, used: [p, tw[0], tw[1]] };
  });
  check(!!rt.r && !rt.used.includes(rt.r), 'a missed question\'s retry is a twin not asked yet, never the same question (' + rt.p + ' → ' + rt.r + ')');

  // ---- Battle a poster first, from the board ----
  await page.evaluate(ps => { const s = SD.state.save; s.wall = ps.slice(0, 3).map((id, i) => ({ id, t: Date.now() - (9 - i) * 86400000, rights: [] })); s.huntMon = {}; s.hunt = null; s.sightings = []; SD.state.persist(); SD.hunt.open(); }, posters);
  await page.click('[data-post="1"]');
  await page.click('#hn-zgo');
  await page.waitForSelector('#panel .win.quiz ' + STOP);
  check(await page.evaluate(id => { const h = SD.state.save.hunt; return h.i === 1 && h.phase === 'mon' && h.mons[1].id === id && SD.hunt.live().m === h.mons[1]; }, posters[1]), 'Battle this one first: the hunt starts on the poster you tapped, as a pick in the picker does');
  await page.evaluate(() => SD.hunt.stop());

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
