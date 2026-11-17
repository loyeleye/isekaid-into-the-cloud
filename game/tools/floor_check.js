// Headless check of the Sorting Floor (js/mode-floor.js on js/floor-core.js and js/aws-sim.js) at phone width (375px):
// the picker and its own title card, no walkthrough screens, the map with the Hunch's door in view, the floor's
// chute / door / router / rack / desks, playing pieces and knobs, the lever, the first 429 taught by one line from
// Dutch, the debrief on the plain exam screen with the stakes, a proven card, the reward, stopping and resuming after a
// reload, and a whole night to the Hunch and the end screen.
// Run from game/:  node tools/floor_check.js     SHOTS=dir saves screenshots. W=1280 H=800 runs it at desktop width.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.mp4': 'video/mp4' };
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
  const page = await browser.newPage({ viewport: { width: +(process.env.W || 375), height: +(process.env.H || 667) } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'floor-' + name + '.png'), fullPage: false }); };
  const boot = async () => {
    await page.goto(url);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    await page.click('#t-start');
    await page.waitForSelector('#today-card:not([hidden])');
  };
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.floor)));
  const txt = sel => page.textContent(sel);
  // Answers the open question: right or wrong, with a confidence (as tools/pop_check.js does).
  const answer = (right, conf) => page.evaluate(async ([right, conf]) => {
    const p = document.querySelector('#panel'), q = SD.modes.current();
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const said = p.querySelector('#q-said'); if (said) { said.click(); await wait(10); }
    const tf = p.querySelector('#tf-idk'); if (tf) { tf.click(); await wait(10); }
    if (q.type === 'mc') p.querySelector(`[data-o="${right ? q.a : q.opts.findIndex((o, i) => i !== q.a)}"]`).click();
    else if (q.type === 'multi') q.items.forEach((it, i) => { if (right ? it.ok : !it.ok) p.querySelector(`[data-m="${i}"]`).click(); });
    await wait(10);
    p.querySelector(`[data-c="${conf}"]`).click();
    await wait(10);
    return q.id;
  }, [right, conf]);
  // Plays every playable hand card whose id is in ids, by clicking it on the floor.
  const playIds = async ids => {
    for (let guard = 0; guard < 8; guard++) {
      const h = await page.evaluate(ids => { const s = SD.state.save.floor, f = s.fight; for (let i = 0; i < f.hand.length; i++) if (ids.includes(s.deck[f.hand[i]].id) && !SD.floor.why(s, i)) return i; return -1; }, ids);
      if (h < 0) return;
      await page.click(`[data-h="${h}"]`);
    }
  };
  const finishClaim = async ids => {
    for (let guard = 0; guard < 14 && (await st()).phase === 'floor'; guard++) { await playIds(ids); await page.click('#fl-lever'); }
    // The last turn plays out on the floor; one button then opens the debrief.
    if (await page.$('#fl-on')) { lastTurn = true; await page.click('#fl-on'); }
  };
  let lastTurn = false;
  const proof = async (right, conf) => {
    await page.click('#fl-ask');
    await page.waitForFunction(() => !!SD.modes.current() && document.querySelector('#panel [data-c]'));
    const qid = await answer(right, conf);
    await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
    if (await page.$('#q-next')) await page.click('#q-next');
    await page.waitForFunction(() => ['reward', 'end'].includes(SD.state.save.floor.phase));
    return qid;
  };

  await page.clock.install({ time: new Date('2026-11-17T20:00:00') });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  // ---- Picker, card, first run ----
  check(await page.evaluate(() => !!SD.modes.get('floor')), 'the Sorting Floor is registered');
  check(await page.evaluate(() => SD.awsSim && SD.floor && typeof SD.awsSim.tick === 'function'), 'the shared rules module loads in the page');
  await page.evaluate(() => SD.modes.open());
  check(!(await page.$('[data-mode="floor"]')) && /Host: Dutch/.test(await txt('[data-mode="pop"]')), 'the picker lists the Lost and Found, hosted by Dutch, and not the floor on its own');
  await page.click('[data-mode="pop"]');
  check(/The Sorting Floor/.test(await txt('#lf-floor')) && !!(await page.$('#lf-heap')), 'its chooser offers the Sorting Floor and the heap (js/lf-hub.js)');
  await page.click('#lf-floor');
  check(!/Step 1 of/.test(await txt('#panel')), 'no walkthrough screens: it opens on the map');
  check(/Night 1/.test(await txt('#panel')) && !!(await page.$('.fl-boss')), 'the map shows Night 1 and the Hunch\'s door in view');
  check(await page.$$eval('.fl-row', r => r.every(x => x.querySelectorAll('.fl-door').length === 1)), 'night 1 is one path (one door a row)');
  await noHScroll('map'); await shot('map');

  // ---- The Rush: the first 429 teaches itself ----
  await page.click('.fl-door.reach');
  check((await st()).phase === 'floor', 'the first door opens the floor');
  const t = await txt('#panel');
  check(/The chute/.test(t) && /Door/.test(t) && /Router/.test(t) && /No rack/.test(t) && /Mira's desk/.test(t), 'the floor shows the chute, door, router, an empty rack spot and the desk');
  check(await page.$$eval('.fl-chute .fl-tk', x => x.length) === 8, 'the Rush puts 8 tickets on the chute');
  check(/Night Clerk/.test(t), 'the noisy neighbour sits on stools, in the scene');
  check(await page.$$eval('.fl-card', x => x.length) === 5, 'a hand of 5');
  await noHScroll('floor'); await shot('floor');
  await page.click('#fl-lever');
  await page.waitForTimeout(200);
  const moving = await page.evaluate(() => ({ ghosts: document.querySelectorAll('.fl-ghost').length, held: !!document.querySelector('#panel .fl-hold') }));
  check(moving.ghosts > 0 && moving.held, `the lever pull plays out on the board: tickets travel (${moving.ghosts} in flight) and the verdict waits for them`);
  await shot('flight');
  await page.waitForTimeout(2600);
  check(await page.evaluate(() => !document.querySelector('.fl-ghost') && !document.querySelector('#panel .fl-hold')), 'the playback ends and the verdict shows');
  const pud = await page.evaluate(() => { const p = document.querySelector('.fl-puddle'); return p && !p.classList.contains('dry') && /Spilled this claim/.test(p.textContent); });
  check(pud, 'the spill is a puddle on the floor');
  const r1 = await txt('.fl-result');
  check(/bounced \(429\)/.test(r1) && /Spilled/.test(r1), 'pulling with nothing played: tickets bounce with a 429 and spill');
  check(/Do the sums/.test(await txt('#panel')), 'Dutch teaches the 429 by its first use, in one line');
  const b1 = (await st()).budget;
  check(b1 < 100, `the budget jar went down (${b1}%)`);
  await shot('bounce');
  // A queue on the floor, then the rack appears with its timeout dial.
  await playIds(['stdq']);
  const hasQ = await page.evaluate(() => !!SD.state.save.floor.fight.world.queue);
  if (hasQ) {
    check(!!(await page.$('.fl-rack [data-vis]')) && !!(await page.$('[data-batch]')), 'with a queue: the rack\'s visibility dial and the desk\'s batch knob appear');
    await page.click('[data-vis="2"]');
    check((await st()).fight.world.queue.vis === 2, 'the dial turns');
  } else check(true, 'Standard Queue not in this hand (deterministic draw); skipping the dial check');
  // A card that can't be played says why on its face.
  const why = await page.$$eval('.fl-card .fl-why', x => x.map(e => e.textContent));
  check(why.every(w => w.length > 3), 'unplayable cards say why (' + (why.join(' | ') || 'none this hand') + ')');
  await finishClaim(['stdq', 'guard', 'patch', 'backoff']);
  check(lastTurn, 'the claim\'s last turn stays on the floor until you move on');
  check((await st()).phase === 'debrief', 'the Rush closes and the debrief opens');
  check(/Why did that work\?/.test(await txt('#panel')), 'the debrief asks "why did that work?"');
  await noHScroll('debrief'); await shot('debrief');

  // ---- The proof: a plain exam screen with the stakes ----
  await page.click('#fl-ask');
  await page.waitForFunction(() => !!SD.modes.current());
  const plain = await page.evaluate(() => !document.querySelector('#panel .fl-tk, #panel .fl-desk') && !!document.querySelector('#panel [data-c]'));
  check(plain, 'the proof is on its own screen: no tickets or desks while the stem is open');
  const qid = await answer(true, 2);
  const card = (await st()).fight ? await page.evaluate(() => SD.floor.debriefCard(SD.state.save.floor)) : null;
  const matches = await page.evaluate(([id, c]) => { const q = SD.exam.find(id), re = SD.floor.CARDS[c].q; return !!re && re.test([q.q].concat(q.opts || []).join(' ')); }, [qid, card]);
  check(matches, `the proof is about the piece that carried the claim (${card})`);
  if (await page.$('#q-next')) await page.click('#q-next');
  await page.waitForFunction(() => SD.state.save.floor.phase === 'reward');
  const s2 = await st();
  check(s2.deck.some(e => e.id === card && e.up), 'a right proof makes that card proven');
  check(/proven/.test(await txt('#panel')) && await page.$$eval('[data-take]', x => x.length) === 2, 'the reward screen offers 2 cards');
  await noHScroll('reward');
  await page.click('[data-take]');
  check((await st()).phase === 'map' && (await st()).row === 1, 'taking a card returns to the map, one row up');

  // ---- Stop and resume after a reload ----
  await page.click('.fl-door.reach');
  await page.click('#fl-lever');
  const before = await st();
  await page.click('#fl-stop');
  await page.evaluate(() => sessionStorage.setItem('keep', '1'));
  await boot();
  await page.evaluate(() => SD.modes.open());
  check(/Resume · Sorting Floor · Night 1/.test(await txt('[data-mode="pop"]')), 'the picker offers Resume');
  await page.click('[data-mode="pop"]'); await page.click('#lf-floor');   // the Lost and Found card's chooser (js/lf-hub.js)
  const after = await st();
  check(after.phase === 'floor' && after.fight.turn === before.fight.turn && after.budget === before.budget, 'resuming opens the same claim on the same turn');
  // Same world in, same events out after a reload.
  const same = await page.evaluate(([b]) => { const AS = SD.awsSim; const a = JSON.parse(JSON.stringify(b.fight.world)), c = JSON.parse(JSON.stringify(SD.state.save.floor.fight.world)); return JSON.stringify(AS.tick(a, [])) === JSON.stringify(AS.tick(c, [])); }, [before]);
  check(same, 'a reloaded floor behaves exactly as before');

  // ---- The rest of the night: a wrong proof carries a twin to the next night ----
  await finishClaim(['stdq', 'dlq', 'partial', 'guard', 'patch']);
  if ((await st()).phase === 'debrief') {
    await proof(false, 1);
    const k = await page.evaluate(() => SD.state.save.floorKeep.carry.slice());
    check(k.length >= 1, 'a missed proof goes on next night\'s list (twins rule)');
    await page.click('[data-take]');
  }
  for (let guard = 0; guard < 6; guard++) {
    const s = await st();
    if (s.phase === 'end' || s.phase === 'zero') break;
    if (s.phase === 'map') await page.click('.fl-door.reach');
    await finishClaim(['stdq', 'sns', 'filter', 'eb', 'dlq', 'condwrite', 'leastpriv', 'deny', 'reserve', 'partial', 'guard', 'patch', 'redrive']);
    const s3 = await st();
    if (s3.phase === 'debrief') await proof(true, 1);
    if ((await st()).phase === 'reward') await page.click('[data-take]');
  }
  const end = await st();
  check(['end', 'zero'].includes(end.phase), `the night ends (${end.phase}, budget ${end.budget}%)`);
  const et = await txt('#panel');
  check(/Night 1:/.test(et) && /Why did that work\?/.test(et) && /Stop here/.test(et), 'the end screen ends on the night, Pip\'s question and a clean stop');
  check(/How sure you were/.test(et), 'the end screen reads out calibration');
  await noHScroll('end'); await shot('end');
  await page.click('#fl-done');
  await page.evaluate(() => SD.modes.open());
  await page.click('[data-mode="pop"]'); await page.click('#lf-floor');   // the Lost and Found card's chooser (js/lf-hub.js)
  check(/Night 2/.test(await txt('#panel')) && await page.$$eval('.fl-row', r => r.some(x => x.querySelectorAll('.fl-door').length === 2)), 'night 2 opens with forks');

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll Sorting Floor checks pass.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
