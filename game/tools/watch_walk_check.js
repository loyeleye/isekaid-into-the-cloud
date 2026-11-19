// Headless check of the walkable Night Watch (js/mode-watch-walk.js) at phone width: day 1 walk, talking, a quest with
// a referral (both trust bars, a cool tie that denies), dusk at Pell's gate, the castle at night, stairs, a fix
// screen, dawn pay, Mira's review on day 2, and the shortcut unlocks. Run from game/: node tools/watch_walk_check.js
// SHOTS=dir saves screenshots.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res);
});
const fails = []; const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
(async () => {
  await new Promise(r => server.listen(0, r));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push(m.text()); });
  await page.addInitScript(() => { window.SD_NO_TYPING = 1; try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.click('#t-start'); await page.waitForSelector('#today-card:not([hidden])');
  const shot = async n => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'walk-' + n + '.png') }); };
  const ev = (f, a) => page.evaluate(f, a);
  const tp = (scene, x) => page.evaluate(([s, x]) => { const st = SD.watchWalk.run.st; st.scene = s; st.x = x; }, [scene, x]);
  const use = () => page.evaluate(() => SD.watchWalk.view.press('use'));
  const btn = async sel => { await page.waitForSelector('.ww-o:not([hidden]) ' + sel); await page.click('.ww-o:not([hidden]) ' + sel); await page.waitForTimeout(120); };
  const card = () => page.evaluate(() => { const o = document.querySelector('.ww-o:not([hidden])'); return o ? o.textContent : ''; });

  check(await ev(() => SD.modes.list().some(m => m.id === 'watch-walk')), 'the walkable mode is registered');
  check(await ev(() => !!(window.WATCH_CONTENT && window.WATCH_CONTENT.breaches)), 'the content file loads');
  await ev(() => { window.__C = window.WATCH_CONTENT; window.WATCH_CONTENT = null; });   // first, the placeholder path
  await ev(() => { SD.state.save.watch3 = null; SD.watchWalk.walk('day'); });
  await page.waitForSelector('.wv-c'); await page.waitForTimeout(200);
  check(await ev(() => SD.watchWalk.run.st.scene === 'main-street'), 'day 1 starts on Main Street');
  const ppl = await ev(() => Object.keys(SD.watchWalk.people('day', 1)).sort().join());
  check(ppl === 'far-lane,hill-road,main-street,west-road', 'people stand on all four town levels');
  check(await ev(() => !(SD.watchWalk.people('day', 1)['west-road'] || []).some(p => p.who === 'pell')), 'Pell only waits at the gate at dusk');
  check(await ev(() => (SD.watchWalk.people('day', 5)['main-street'] || []).some(p => p.who === 'kagemaru' && p.x === 1960)), 'rain on day 5 moves Kagemaru under the café awning');
  check(await ev(() => !(SD.watchWalk.people('day', 7)['far-lane'] || []).some(p => p.who === 'fennel')), 'mist on day 7 keeps Fennel indoors');
  await shot('day');

  // Talk to Mira: gossip line, clock pauses.
  await tp('main-street', 560 + 34); await use(); await page.waitForTimeout(150);
  check((await card()).includes('Mira'), 'talking to Mira opens her line');
  check(await ev(() => SD.watchWalk.busy), 'the clock pauses while talking');
  await shot('talk');
  check(!/Hire|ninth night|Ward level/.test(await card()), 'day 1: no hiring or ninth-night talk before Mira explains it');
  await page.evaluate(() => document.activeElement && document.activeElement.blur()); await page.keyboard.press('Enter'); await page.waitForTimeout(150);
  check(!(await card()), 'Enter closes a message');
  check(await ev(() => SD.watchBonds.trust(SD.watchWalk.sv().bonds, 'mira')) === 82, 'the first chat of the day adds 2 trust');

  // Quests: jump to day 3 for Kai's referral quest (fallback quests).
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 3; w.bonds.day = 3; SD.watchWalk.walk('day'); });
  await page.waitForTimeout(150);
  await tp('main-street', 560 - 40); await use(); await page.waitForTimeout(150);
  check((await card()).includes('Help'), 'Kai offers his quest');
  await btn('[data-a=yes]'); await page.waitForTimeout(150);
  await btn('[data-a=n]');
  check(await ev(() => SD.watchWalk.sv().quests['kai-night-cloak'].step === 1), 'the first step finishes and points to Hobb');
  // Cool tie: Hobb dislikes Kai today -> deny.
  await ev(() => { window.WATCH_CONTENT = { ties: { hobb: { warm: ['odu'], cool: ['kai'] }, odu: { warm: ['hobb', 'kai'] } } }; });
  await ev(() => SD.watchBonds.add(SD.watchWalk.sv().bonds, 'odu', 20));
  await tp('main-street', 2760 + 34); await use(); await page.waitForTimeout(150);
  const deny = await card();
  check(/being nice won't change it/.test(deny) && /But Odu gets on with both/.test(deny), 'a cool tie denies the referral and names who could vouch');
  await shot('deny');
  await btn('[data-a=d]');
  // Warm tie -> both bars and Pell's line on the first referral.
  await ev(() => { window.WATCH_CONTENT.ties.hobb = { warm: ['kai'] }; });
  await use(); await page.waitForTimeout(150);
  const ref = await card();
  check(/Trusts you/.test(ref) && /Trusts the sender/.test(ref) && /both doors/.test(ref), 'a warm referral shows both trust bars and Pell\'s rule');
  await shot('referral');
  await btn('[data-a=d]'); await btn('[data-a=n]');
  check(await ev(() => SD.watchWalk.sv().quests['kai-night-cloak'].step === 2), 'Hobb\'s step done');
  await ev(() => { window.WATCH_CONTENT = null; SD.watchWalk.sv().bonds.trust.kai = 50; });   // under 80: no second try
  await tp('main-street', 520); await use(); await page.waitForTimeout(150);
  await btn('[data-i="1"]');   // wrong answer ends the try (trust under 80)
  check(await ev(() => SD.watchWalk.sv().quests['kai-night-cloak'].step === 2), 'a wrong answer keeps the quest on its question');
  await btn('[data-a=d]');
  await use(); await page.waitForTimeout(150); await btn('[data-i="0"]'); await btn('[data-a=d]'); await btn('[data-a=n]'); await btn('[data-a=d]');
  const w = await ev(() => SD.watchWalk.sv());
  check(w.quests['kai-night-cloak'].done && w.unlocks['back-stair'] && w.silver === 20 && w.hearts.kai, 'the quest pays 20 silver, a heart and the back stair');

  // Dusk and night.
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 1; SD.watchWalk.walk('dusk'); });
  await page.waitForTimeout(150);
  await btn('[data-a=n]');
  await tp('west-road', 3280); await use(); await page.waitForTimeout(250);
  check(await ev(() => SD.watchWalk.run.phase === 'night' && SD.watchWalk.run.st.scene === 'castle:ground'), 'Pell\'s gate leads into the castle at night');
  await btn('[data-a=n]');
  const b = await ev(() => SD.watchWalk.run.list.map(x => [x.scene, x.x, x.choices.length]));
  check(b.length === 1 && b[0][0] === 'castle:ground', 'night 1 has one breach on the ground floor');
  await shot('night');
  await tp('castle:ground', b[0][1]); await use(); await page.waitForTimeout(150);
  await shot('fix');
  const wrong = await ev(() => { const x = SD.watchWalk.run.list[0]; return x.choices.findIndex(c => !c.best); });
  await btn(`[data-i="${wrong}"]`);
  check(/One more try/.test(await card()), 'a wrong fix gets another try');
  const best = await ev(() => SD.watchWalk.run.list[0].choices.findIndex(c => c.best));
  await btn(`[data-i="${best}"]`); await btn('[data-a=d]'); await btn('[data-a=n]');
  await page.waitForSelector('#ww-next');
  const w2 = await ev(() => SD.watchWalk.sv());
  check(w2.day === 2 && w2.silver === 20 + 55, `dawn pays 45 base + 10 for the fix (${w2.silver - 20})`);
  await shot('dawn');
  check(await ev(() => (SD.watchWalk.sv().news || []).some(n => n.id === 'night-1')), 'a night\'s break-ins become town news at dawn');
  await page.click('#ww-next'); await page.waitForTimeout(250);
  check(await ev(() => SD.watchWalk.sv().reviewed === 2), 'day 2\'s morning review is marked as done');
  const s0 = await ev(() => SD.watchWalk.sv().silver);
  await ev(() => SD.watchWalk.morning()); await page.waitForTimeout(250);
  check(await ev(() => SD.watchWalk.run && SD.watchWalk.run.phase === 'day' && !/Mira's review/.test(document.body.textContent)) && await ev(() => SD.watchWalk.sv().silver) === s0, 'coming back the same morning skips the review (no second pay)');

  // Stairs and the back stair at night.
  await ev(() => SD.watchWalk.walk('night', { scene: 'castle:upper', x: SD.watchWorld.linkX(SD.watchWorld.LINKS.find(l => l.id === 'back-stair'), 'upper') }));
  await page.waitForTimeout(150);
  await ev(() => document.querySelector('.ww-o:not([hidden]) button') && document.querySelector('.ww-o:not([hidden]) button').click());
  await ev(() => SD.watchWalk.view.press('up')); await page.waitForTimeout(100);
  check(await ev(() => SD.watchWalk.run.st.scene === 'castle:towers'), 'the back stair goes from the upper floor to the towers');

  // Hiring, ward levels and the Long Night.
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 4; w.silver = 200; SD.watchWalk.walk('day'); });
  await page.waitForTimeout(150);
  await tp('main-street', 2400 + 34); await use(); await page.waitForTimeout(150);
  await btn('[data-a=h]');
  const k = await ev(() => { const w = SD.watchWalk.sv(); return [w.silver, w.hires.kagemaru, SD.watchWalk.ward('kagemaru')]; });
  check(k[0] === 150 && k[1] === 1 && k[2] === 1, `hiring Kagemaru costs 50 and gives ward level 1 (${k})`);
  const n9 = await ev(() => {
    const w = SD.watchWalk.sv(); w.day = 9; w.missed = {}; w.retry = null;
    SD.watchWalk.breaches(2).forEach(b => { w.missed[b.id] = 1; });              // missed both night-2 breaches
    w.hires = { dutch: 2, hobb: 2, kagemaru: 1, bru: 2 }; w.hearts = { dutch: 1, kai: 1 };
    SD.watchBonds.add(w.bonds, 'dutch', 60);
    w.wardNoFree = SD.watchWalk.ward('dutch');   // hires and trust don't count for the party
    w.freed = { dutch: 1 }; w.helped = { dutch: 2 };
    return SD.watchWalk.breaches(9).map(b => b.scene);
  });
  check(n9.length === 6 && n9.filter(s => s.startsWith('castle')).length === 2 && n9.slice(2).every(s => !s.startsWith('castle')), `the Long Night brings back the missed breaches and adds town ones (${n9.join(', ')})`);
  check(await ev(() => SD.watchWalk.sv().wardNoFree) === 0, 'Dutch stays at ward 0 until someone covers his feast job, whatever you pay or how much he trusts you');
  check(await ev(() => SD.watchWalk.ward('dutch')) === 4, 'a covered feast job (2) and both his quests (2) make Dutch ward level 4');
  await ev(() => SD.watchWalk.walk('dusk')); await page.waitForTimeout(150); await btn('[data-a=n]');
  check(await ev(() => !!SD.watchWalk.sv().retry), 'the Long Night saves a retry point at dusk');
  await tp('west-road', 3280); await use(); await page.waitForTimeout(250); await btn('[data-a=n]');
  const r9 = await ev(() => { const r = SD.watchWalk.run; return { ground: r.ward['castle:ground'], wardFixed: Object.values(r.fixed).filter(v => v === 'ward').length }; });
  check(r9.ground === 4 && r9.wardFixed >= 2, `Dutch at level 4 clears the ground floor before you arrive (${JSON.stringify(r9)})`);
  await tp('castle:ground', await ev(() => SD.watchWorld.scene('castle:ground').spots.find(v => v.id === 'castle-exit').x)); await use(); await page.waitForTimeout(150);
  check(await ev(() => SD.watchWalk.run.st.scene === 'west-road'), 'on the Long Night the castle gate leads back to town');
  await shot('long-night');
  await ev(() => SD.watchWalk.dawn()); await page.waitForSelector('.ww-end');
  const end = await page.textContent('.ww-end');
  check(/Long Morning|Fall of the Watch/.test(end), 'an ending plays by how many got through: ' + end);
  check(await ev(() => SD.watchWalk.endingFor(0).id === 'lanterns' && SD.watchWalk.endingFor(3).id === 'morning' && SD.watchWalk.endingFor(4).id === 'fall'), 'ending thresholds: 0, 1-3, 4+');
  await shot('ending');
  await page.click('#ww-retry'); await page.waitForTimeout(200);
  const rt = await ev(() => { const w = SD.watchWalk.sv(); return [w.day, Object.keys(w.missed).length, SD.watchWalk.run.phase, w.hires.dutch]; });
  check(rt[0] === 9 && rt[1] >= 2 && rt[2] === 'dusk' && rt[3] === 2, `retry returns to that dusk with watchers kept (${rt})`);

  // ---- With the real content (js/watch-content.js) ----
  const cc = await ev(() => {
    const C = window.WATCH_CONTENT = window.__C, WW = SD.watchWorld, bad = [];
    const people = new Set(['seoyeon', 'mira', 'coo', 'bru', 'kagemaru', 'lexi', 'kai', 'dutch', 'hobb', 'pell', 'wen', 'ayo', 'aigerim', 'doug', 'tess', 'hollis', 'odu', 'fennel', 'seymour', 'chad', 'kevin', 'captain']);
    C.breaches.forEach(b => {
      if (b.choices.filter(c => c.best).length !== 1) bad.push(b.id + ': best count');
      if (b.where.spot && !WW.spot(b.where.level, b.where.spot)) bad.push(b.id + ': spot ' + b.where.spot);
      if (b.where.room && !(WW.CASTLE[b.where.floor] || { rooms: [] }).rooms.some(r => r[0] === b.where.room)) bad.push(b.id + ': room ' + b.where.room);
    });
    C.quests.forEach(q => {
      if (!people.has(q.giver)) bad.push(q.id + ': giver');
      q.steps.forEach((t, i) => {
        if (t.at && t.at.who && !people.has(t.at.who)) bad.push(q.id + ' step ' + i + ': who ' + t.at.who);
        if (t.at && t.at.spot && !WW.spot(t.at.level, t.at.spot)) bad.push(q.id + ' step ' + i + ': spot ' + t.at.spot);
        if (t.ask && !(t.ask.answer >= 0 && t.ask.answer < t.ask.choices.length)) bad.push(q.id + ': answer');
        if (t.help && t.help.low && !C.reviews.some(r => r.id === t.help.low)) bad.push(q.id + ': help.low ' + t.help.low);
      });
    });
    (C.tutorial || []).forEach(t => { if (!WW.spot(null, t.at)) bad.push('tutorial spot ' + t.at); });
    Object.keys(C.ties || {}).forEach(k => { if (!people.has(k)) bad.push('ties ' + k); });
    const w = SD.watchWalk.sv(); w.missed = {};
    const n9 = SD.watchWalk.breaches(9), perNight = [1, 2, 3, 4, 5, 6, 7, 8].map(n => SD.watchWalk.breaches(n).length);
    return { bad, n9: n9.length, areas: new Set(n9.map(b => b.scene)).size, perNight };
  });
  check(!cc.bad.length, 'every content breach, quest step, spot, person, review link and tutorial stop resolves in the engine' + (cc.bad.length ? ': ' + cc.bad.slice(0, 8).join('; ') : ''));
  check(cc.n9 === 8 && cc.areas === 8, `the Long Night picks one new breach per area from the pool (${cc.n9} in ${cc.areas} areas)`);
  check(cc.perNight.every(n => n >= 1), 'every night 1-8 has at least one breach: ' + cc.perNight.join(','));
  // Sealing: Hobb's key-pair quest seals the cellars for that night.
  const seal = await ev(() => { const w = SD.watchWalk.sv(); w.sealed = { cellars: 5 };
    const C = window.WATCH_CONTENT, n5 = C.breaches.filter(b => b.night === 5 && b.where.floor === 'cellars').length;
    return [n5, SD.watchWalk.breaches(5).filter(b => b.scene === 'castle:cellars').length]; });
  check(seal[1] === 0, `a sealed floor has no breaches that night (cellars had ${seal[0]})`);
  // Day 1 tutorial: Mira's first line plays at the start.
  await ev(() => { SD.state.save.watch3 = null; SD.watchWalk.walk('day'); }); await page.waitForTimeout(300);
  check(/night warden/.test(await card()), 'day 1 opens with Mira setting the scene');
  check(await ev(() => SD.watchWalk.view.follower && SD.watchWalk.view.follower.who === 'mira'), 'Mira follows Seo-yeon on day 1');
  let intro = ''; while (await page.$('.ww-o:not([hidden]) [data-a=n]')) { intro += await card(); await btn('[data-a=n]'); }
  check(/night watch/.test(intro) && /patrol/.test(intro) && /castle gate/.test(intro), 'Mira explains the night watch, the patrols and the castle gate');
  await tp('main-street', 760); await page.waitForTimeout(200);
  check(/Tess/.test(await card()), 'the walkthrough\'s next stop plays at the fork');
  await shot('tutorial');
  await btn('[data-a=n]');
  const clear = async () => { while (await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]'); };
  await clear();
  // Arrows point the way to Mira's next stop: along the road, then up the fork when it's on another road.
  await tp('main-street', 1000); await page.waitForTimeout(200);
  check(await ev(() => { const g = SD.watchWalk.view.guide; return g && g.scene === 'main-street' && g.x === 2400; }), 'an arrow points to Kagemaru\'s stall, the next stop');
  await tp('main-street', 2400); await page.waitForTimeout(200); await clear();
  await tp('main-street', 1600); await page.waitForTimeout(200);
  check(await ev(() => { const g = SD.watchWalk.view.guide; return g && g.x === 760 && g.dir === 'up'; }), 'for the post office on Hill Road, the arrow points up the fork');
  await shot('tutorial-arrow');
  await page.waitForTimeout(400);
  check(await ev(() => SD.watchWalk.view.marks.some(m => m.scene === 'hill-road' && /Lesson/.test(m.text))), 'Coo\'s lesson marker is up as soon as Mira heads for the post office');
  await tp('hill-road', 1440); await page.waitForTimeout(200);
  check(/marker over Coo/.test(await card()), 'Mira explains markers at Coo\'s post office');
  await shot('tutorial-coo'); await clear();
  // Leaving and coming back keeps the time left and the tutorial step (Ladi, Nov 18: no fresh 10 minutes).
  await ev(() => { SD.watchWalk.run.keep(); SD.watchWalk.sv().at.left = 125; SD.state.persist && SD.state.persist(); SD.modes.list().find(m => m.id === 'watch-walk').start(); });
  await page.waitForTimeout(300);
  const back = await ev(() => [document.querySelector('#ww-top').textContent, SD.watchWalk.run.phase, SD.watchWalk.run.tut, !!SD.watchWalk.view.follower]);
  check(/Day 1 · 2:0/.test(back[0]) && back[1] === 'day' && back[2] === 5 && back[3], `coming back resumes the day with its time left and Mira's walk (${back})`);
  await tp('hill-road', 1700); await ev(() => { SD.watchWalk.run.keep(); SD.modes.list().find(m => m.id === 'watch-walk').start(); }); await page.waitForTimeout(250);
  check(await ev(() => SD.watchWalk.run.st.scene === 'hill-road' && Math.abs(SD.watchWalk.run.st.x - 1700) < 2), 'coming back puts you where you stood, not at base camp');
  // The castle gate ends the day early; Mira says so at her last stop.
  await tp('west-road', 3280); await page.waitForTimeout(200);
  let gate = ''; while (await page.$('.ww-o:not([hidden]) [data-a=n]')) { gate += await card(); await btn('[data-a=n]'); }
  check(/go up early/.test(gate), 'Mira explains going up early at the castle gate');
  await use(); await page.waitForTimeout(150);
  check(/Head up to the castle now/.test(await card()), 'using the gate by day asks before ending the day');
  await btn('[data-a=y]'); await page.waitForTimeout(200);
  check(await ev(() => SD.watchWalk.run.phase === 'dusk'), 'ending the day early goes to dusk');
  await clear();
  // ---- The living town (Ladi, Nov 18) ----
  const town = await ev(() => {
    const C = window.WATCH_CONTENT, WW = SD.watchWorld, bad = [];
    Object.keys(C.schedule).forEach(who => { const s = C.schedule[who]; [s.plan].concat(Object.values(s.days || {}), s.rain ? [s.rain] : []).forEach(pl => pl.forEach(([f, p]) => { if (!SD.watchSchedule.resolve(WW, p)) bad.push(who + ' ' + JSON.stringify(p)); if (f < 0 || f > 1) bad.push(who + ' from ' + f); })); });
    C.minis.forEach(m => { if (m.opts.length !== 4 || m.a !== 0 || (m.no || []).length !== 4 || !m.why || (m.demo && !C.demos[m.demo]) || m.opens > m.closes) bad.push('mini ' + m.id); });
    Object.keys(C.demos).forEach(k => C.demos[k].frames.forEach((f, i) => { if (!f.say || !f.tiles || !f.tiles.length) bad.push('demo ' + k + ' ' + i); }));
    C.meetups.forEach(m => { if (!C.schedule[m.a] || !C.schedule[m.b]) bad.push('meetup ' + m.a + '|' + m.b); });
    const day1 = C.minis.filter(m => m.opens === 1);
    return { bad, day1: day1.length, teach: day1.every(m => m.teach && m.demo), lines: Object.keys(C.lines).length, secrets: Object.keys(C.secrets).length };
  });
  check(!town.bad.length, 'every schedule place, small job, lesson and meetup resolves' + (town.bad.length ? ': ' + town.bad.slice(0, 6).join('; ') : ''));
  check(town.day1 >= 4 && town.teach, `day 1 has ${town.day1} lessons, each teaching before it asks`);
  check(town.lines >= 18 && town.secrets >= 17, 'everyone has everyday lines and a secret');
  // A day-1 lesson: the pictures, then the question; a wrong pick explains and lets you try again.
  await ev(() => { SD.state.save.watch3 = null; SD.watchWalk.walk('day'); }); await page.waitForTimeout(200); await clear();
  await ev(() => { const r = SD.watchWalk.run; r.tut = 99; r.escort = false; SD.watchWalk.view.set('follow', null); });
  const s1 = await ev(() => SD.watchWalk.sv().silver);
  await tp('main-street', 2794); await use(); await page.waitForTimeout(150);
  check(/Show me/.test(await card()), 'Hobb offers a day-1 lesson');
  await btn('[data-a=y]');
  check(await ev(() => document.querySelectorAll('.ww-o:not([hidden]) .ww-tile').length) >= 2, 'the lesson shows pictures (tiles), not just text');
  await shot('lesson');
  while (await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]');
  check(/Practice/.test(await card()) && await ev(() => !!document.querySelector('.ww-o:not([hidden]) .ww-conf')), 'then the question box, with how-sure buttons');
  await btn('[data-i="1"]'); await btn('[data-c="1"]');
  check(/Try another/.test(await card()), 'a wrong pick on day 1 explains and lets you try again');
  await btn('[data-i="0"]'); await btn('[data-c="2"]');
  check(/Right/.test(await card()) && await ev(() => SD.watchWalk.sv().silver) === s1 + 5, 'the right answer pays 5 silver');
  await shot('lesson-done'); await btn('[data-a=d]');
  // Day 2: people walk their plans, up and down the ramps.
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 2; w.bonds.day = 2; w.at = null; SD.watchWalk.walk('day'); }); await page.waitForTimeout(200);
  await clear();
  check(await ev(() => ['aigerim', 'chad'].every(p => SD.watchWalk.run.walkers.some(v => v.who === p))), 'Aigerim and Chad are out in town now');
  await ev(() => SD.watchWalk.clock(180)); await page.waitForTimeout(2500);
  const tess = await ev(() => { const v = SD.watchWalk.run.walkers.find(x => x.who === 'tess'); return [v.scene, !!v.ramp, Math.round(v.x)]; });
  check(tess[1] || tess[0] === 'hill-road', `at midday Tess heads up to the post office by the ramp (${tess})`);
  await ev(() => SD.watchWalk.snapTown());
  check(await ev(() => { const v = SD.watchWalk.run.walkers.find(x => x.who === 'tess'); return v.scene === 'hill-road' && Math.abs(v.x - 1414) < 3; }), 'and arrives on Hill Road');
  // Talking: an everyday line instead of "evening soon", and a lesson button.
  await ev(() => { SD.watchWalk.clock(354); SD.watchWalk.snapTown(); });
  await tp('far-lane', 2554); await use(); await page.waitForTimeout(150);
  const odu = await card();
  check(!/Evening soon/.test(odu) && /💡/.test(odu), 'Odu says something of his own and offers a lesson: ' + odu.slice(0, 60));
  await btn('[data-a=l]'); check(await ev(() => document.querySelectorAll('.ww-o:not([hidden]) .ww-tile').length) >= 2, 'his lesson plays');
  while (await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]');
  // Overheard: Kai and Wen at the café around midday.
  await ev(() => { SD.watchWalk.clock(216); SD.watchWalk.snapTown(); });
  await tp('main-street', 2000); await page.waitForTimeout(500);
  check(/overhears/.test(await card()), 'walking past two friends, you overhear them: ' + (await card()).slice(0, 50));
  await clear();
  check(await ev(() => Object.keys(SD.watchWalk.sv().known || {}).length >= 1), 'the Town book learns who likes whom');
  await page.click('#ww-book'); await page.waitForTimeout(150);
  check(/Town book/.test(await card()) && /acquaintance|friend/.test(await card()), 'the Town book lists trust steps');
  const order = await ev(() => [...document.querySelectorAll('.ww-o:not([hidden]) .ww-who b')].map(b => b.textContent));
  check(order.length > 3 && order.join('|') === order.slice().sort((x, y) => x.replace(/^(Grandma|Old|The) /, '').localeCompare(y.replace(/^(Grandma|Old|The) /, ''))).join('|'), `the Town book is in alphabetical order (${order.join(', ')})`);
  await shot('town-book'); await btn('[data-a=x]');
  // Rain indoors (Ladi, Nov 19): on day 5 (rain) people wait inside buildings; knock to pick who to talk to.
  await clear();
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 5; w.bonds.day = 5; w.at = null; SD.watchWalk.walk('day'); }); await page.waitForTimeout(200); await clear();
  await ev(() => SD.watchWalk.snapTown()); await page.waitForTimeout(100);
  const ind = await ev(() => { const r = SD.watchWalk.run; return { indoor: r.indoor, seen: Object.values(r.ppl).flat().map(v => v.who), sey: r.walkers.find(v => v.who === 'seymour') }; });
  const rooms = Object.keys(ind.indoor || {});
  check(rooms.length >= 3 && rooms.every(k => ind.indoor[k].every(w => !ind.seen.includes(w))), `on a rain day people wait indoors, out of sight (${rooms.map(k => k + ':' + ind.indoor[k].join('+')).join(', ')})`);
  check(ind.sey && !ind.sey.inside, 'Seymour stays out in the rain');
  const multi = rooms.find(k => ind.indoor[k].length > 1) || rooms[0];
  const sp = await ev(id => { const s = SD.watchWorld.spot(null, id); return [s.level, s.x]; }, multi);
  await tp(sp[0], sp[1]); await use(); await page.waitForTimeout(150);
  const kn = await ev(() => [...document.querySelectorAll('.ww-o:not([hidden]) [data-w]')].map(b => b.dataset.w));
  check(kn.length === ind.indoor[multi].length && /knock/.test(await card()), `knocking at the ${multi} lists everyone inside (${kn.join(', ')})`);
  await btn('[data-w]'); await page.waitForTimeout(150);
  check(!(await page.$('.ww-o:not([hidden]) [data-w]')) && (await card()).length > 0, 'picking someone talks to them');
  await clear(); while (await page.$('.ww-o:not([hidden]) [data-a=x]')) await btn('[data-a=x]');
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 2; w.bonds.day = 2; SD.watchWalk.walk('day'); }); await page.waitForTimeout(200); await clear();
  // Running jokes: at most two people a day on the same topic, and only when they've no business for you.
  const quips = await ev(async () => {
    const W = SD.watchWalk, w = W.sv(); w.metPell = 1; w.pellq = {}; w.topicDay = {};
    const said = [];
    for (const p of ['dutch', 'ayo', 'coo', 'bru', 'lexi', 'wen', 'doug']) {
      if (W.workFor(p)) continue;
      W.talk(p); await new Promise(r => setTimeout(r, 120));
      const t = (document.querySelector('.ww-o:not([hidden])') || {}).textContent || '';
      if (/Pell/.test(t)) said.push(p);
      while (document.querySelector('.ww-o:not([hidden]) [data-a=n]')) { document.querySelector('.ww-o:not([hidden]) [data-a=n]').click(); await new Promise(r => setTimeout(r, 120)); }
      const x = document.querySelector('.ww-o:not([hidden]) [data-a=x]'); if (x) x.click(); await new Promise(r => setTimeout(r, 120));
    }
    return said;
  });
  check(quips.length <= 2, `only two people joke about Pell the same day (${quips})`);
  // Town news travels person to person, by who meets whom.
  const news = await ev(async () => {
    const W = SD.watchWalk, r0 = Math.random; Math.random = () => 0;
    W.addNews('t-tries', W.sv().day, 'someone tried the castle three times last night', null, false, ['kagemaru']);
    W.spread('kagemaru', 'odu'); W.spread('odu', 'fennel'); W.spread('fennel', 'hollis');
    Math.random = r0;
    const k = W.sv().knows['t-tries'];
    return [k.odu, k.fennel, W.newsFor('odu'), W.newsFor('fennel'), W.newsFor('hollis'), W.newsFor('odu')];
  });
  check(news[0] === 'kagemaru' && news[1] === 'odu', 'news passes from Kagemaru to Odu to Fennel when they meet');
  check(/^Kagemaru/.test(news[2]) && /tried the castle three times/.test(news[2]) && /Odu/.test(news[3]), 'they tell you in their own words, naming who told them: ' + news[2]);
  check(news[4] === null && news[5] === null, 'at most two people bring up the same news a day, and nobody tells you twice');
  // Trust steps and secrets.
  await ev(() => { const w = SD.watchWalk.sv(); w.bonds.trust.ayo = 39; w.bonds.chatted.ayo = 0; SD.watchWalk.snapTown(); });
  const ay = await ev(() => { const v = SD.watchWalk.run.walkers.find(x => x.who === 'ayo'); return [v.scene, v.x]; });
  await tp(ay[0], ay[1]); await use(); await page.waitForTimeout(200);
  check(await ev(() => /now counts you as a friend/.test((document.querySelector('.ww-toast') || {}).textContent || '')), 'crossing 40 trust is announced');
  await clear(); if (await page.$('.ww-o:not([hidden]) [data-a=x]')) await btn('[data-a=x]');
  await ev(() => { const w = SD.watchWalk.sv(); w.bonds.chatted.ayo = 2; (w.minis = w.minis || {})['m-ayo-envelope'] = 'ok'; }); await use(); await page.waitForTimeout(150);
  check(/lowers their voice/.test(await card()), 'a friend tells you a secret');
  await clear(); if (await page.$('.ww-o:not([hidden]) [data-a=x]')) await btn('[data-a=x]');

  // Capstone: Hobb at ward 4 takes the cellars.
  const cap = await ev(() => { const w = SD.watchWalk.sv(); w.day = 6; w.hires = { hobb: 2 }; w.hearts = { hobb: 1 }; SD.watchBonds.add(w.bonds, 'hobb', 60);
    ['hobb-key-pair', 'hobb-practice-crest'].forEach(id => { w.quests[id] = { step: 99, done: true }; }); SD.watchWalk.walk('day'); return SD.watchWalk.ward('hobb'); });
  await page.waitForTimeout(200);
  await tp('main-street', 2760 + 34); await use(); await page.waitForTimeout(150);
  for (let i = 0; i < 10; i++) { if (await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]'); }   // one-time asides (Chad's story, a friend's secret) can come first
  if (await page.$('.ww-o:not([hidden]) [data-a=d]')) await btn('[data-a=d]');
  const capW = await ev(() => { const w = SD.watchWalk.sv(); return [w.quests['hobb-last-lock'] && w.quests['hobb-last-lock'].done, w.sealed && w.sealed.cellars]; });
  check(cap === 4 && capW[0] && capW[1] === 'all', `Hobb's capstone at ward 4 seals the cellars for good (${capW})`);

  // The shop.
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 3; w.silver = 100; w.hires = { kagemaru: 2 }; w.unlocks = {}; w.toldHire = 1; SD.watchWalk.walk('day'); });
  await page.waitForTimeout(200);
  await tp('main-street', 2400 + 34); await use(); await page.waitForTimeout(150);
  while (!(await page.$('.ww-o:not([hidden]) [data-a=s]')) && await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]');   // a gossip line can come first
  await btn('[data-a=s]'); await btn('[data-b=tools]'); await btn('[data-b=outpost]'); await btn('[data-b=post]'); await btn('[data-p="far-lane"]');
  const sh = await ev(() => { const w = SD.watchWalk.sv(); return [w.silver, w.tools, w.unlocks.outpost, w.posts['far-lane']]; });
  check(sh[0] === 100 - 10 - 60 - 15 && sh[1] === 1 && sh[2] && sh[3], `the shop sells tools, an outpost and a lantern post (${sh})`);
  await btn('[data-a=x]');
  // Timed questions past day 1 (Ladi, Nov 18): 90s to think, then the clock runs; Kagemaru's watches add 25s and 35s.
  await ev(() => { const w = SD.watchWalk.sv(); w.watchUp = 0; w.toldQ = 0; SD.watchWalk.clock(300); SD.watchWalk.choose('Test', { q: 'Q?', choices: ['a', 'b'], answer: 0, why: '' }, 0); });
  await page.waitForTimeout(150);
  const qt = await ev(() => { const r = SD.watchWalk.run; return [r.q && Math.round(r.q.left), (document.querySelector('.ww-qt') || {}).textContent || '', /From today/.test(document.querySelector('.ww-o:not([hidden])').textContent)]; });
  check(qt[0] >= 89 && qt[0] <= 90 && /to think/.test(qt[1]) && qt[2], `a day-3 question gives 90 seconds to think, shown on the question (${qt})`);
  await ev(() => { SD.watchWalk.run.q.left = 0; }); await page.waitForTimeout(1200);
  const qc = await ev(() => [SD.watchWalk.clock(), (document.querySelector('.ww-qt') || {}).textContent || '']);
  check(qc[0] < 299.5 && qc[0] > 297 && /clock is running/.test(qc[1]), `after the grace, the open question eats the day clock (${qc})`);
  await btn('[data-i="0"]'); await btn('[data-a=d]');
  const qe = await ev(() => { const c = SD.watchWalk.clock(); return [SD.watchWalk.run.q, c]; }); await page.waitForTimeout(300);
  check(qe[0] === null && qe[1] < qc[0] - 49 && qe[1] > qc[0] - 52, `answering stops the question timer and the answer takes 50s of the day (${qc[0]} -> ${qe[1]})`);
  await ev(() => { const w = SD.watchWalk.sv(); w.silver = 100; delete w.quests['kagemaru-upriver']; delete w.quests['kagemaru-prices']; });
  await tp('main-street', 2400 + 34); await use(); await page.waitForTimeout(150);
  while (!(await page.$('.ww-o:not([hidden]) [data-a=s]')) && await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]');
  await btn('[data-a=s]'); await btn('[data-b=watch1]');
  const pw = await ev(() => { const b = document.querySelector('.ww-o:not([hidden]) [data-b=watch2]'); return [SD.watchWalk.qGrace(), !!b && b.disabled]; });
  check(pw[0] === 115 && pw[1], `the first pocket watch adds 25s, and the second waits for a job for Kagemaru (${pw})`);
  await ev(() => { SD.watchWalk.sv().quests['kagemaru-upriver'] = { step: 99, done: true }; }); await btn('[data-a=x]');
  await use(); await page.waitForTimeout(150);
  while (!(await page.$('.ww-o:not([hidden]) [data-a=s]')) && await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]');
  await btn('[data-a=s]'); await btn('[data-b=watch2]');
  check(await ev(() => SD.watchWalk.qGrace()) === 150, 'both watches make 2:30 a question');
  await btn('[data-a=x]');
  // Running out of day between a big job's two questions: keep the place, go to dusk.
  await ev(() => { const w = SD.watchWalk.sv(); w.quests['fennel-clear-chute'] = { step: 3, done: false }; SD.watchWalk.walk('day'); });
  await page.waitForTimeout(200);
  await ev(() => { SD.watchWalk.clock(20); const q = SD.watchWalk.quests().find(q => q.id === 'fennel-clear-chute'); SD.watchWalk.step(q); });
  await page.waitForTimeout(150);
  await btn('[data-i="2"]'); await btn('[data-a=d]'); await page.waitForTimeout(150);
  const dk = await ev(() => [SD.watchWalk.sv().quests['fennel-clear-chute'].step, document.querySelector('.ww-o:not([hidden])') ? document.querySelector('.ww-o:not([hidden])').textContent : '']);
  check(dk[0] === 4 && /tomorrow/.test(dk[1]), `out of daylight after the first question, she saves her place for tomorrow (${dk[0]})`);
  while (await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]');
  await page.waitForTimeout(300);
  check(await ev(() => SD.watchWalk.run && SD.watchWalk.run.phase === 'dusk'), 'then the day ends at dusk');
  while (await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]');
  const dz = await ev(() => { const r = SD.watchWalk.run, f = SD.watchWorld.scene('west-road').spots.find(v => v.id === 'fork-west-down'); r.st.x = f.x; SD.watchWalk.view.press('down'); return r.st.scene; });
  await page.waitForTimeout(200);
  check(dz === 'west-road' && await ev(() => SD.watchWalk.run.st.scene === 'west-road' && /shutting up/.test(document.querySelector('.ww-o:not([hidden])') ? document.querySelector('.ww-o:not([hidden])').textContent : '')), 'at dusk the way down the hill is closed, and Pell says so');
  while (await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]');
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 3; SD.watchWalk.walk('day'); }); await page.waitForTimeout(200);
  // Her party doesn't take silver: their feast job is what keeps them away (Ladi, Nov 18).
  await ev(() => { const w = SD.watchWalk.sv(); w.freed = {}; w.quests['kai-night-cloak'] = { step: 99, done: true }; delete w.quests['kai-feast-line']; SD.watchWalk.talk('kai'); });
  await page.waitForTimeout(150);
  for (let i = 0; i < 10 && !(await page.$('.ww-o:not([hidden]) [data-a=yes]')); i++) { if (await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]'); else break; }
  const duty = await ev(() => { const o = document.querySelector('.ww-o:not([hidden])'); return { text: o ? o.textContent : '', hire: !!(o && o.querySelector('[data-a=h]')), yes: !!(o && o.querySelector('[data-a=yes]')) }; });
  check(duty.yes && !duty.hire && /harvest feast/.test(duty.text), `Kai offers his feast job instead of a Hire button (${duty.text.slice(0, 90)})`);
  await btn('[data-a=yes]');
  check(await ev(() => SD.watchWalk.sv().quests['kai-feast-line'].step >= 0 && SD.watchWalk.ward('kai') === 0), 'until Wen covers the feast, Kai is at ward 0');
  for (let i = 0; i < 6 && await page.$('.ww-o:not([hidden]) [data-a=n]'); i++) await btn('[data-a=n]');
  const kq = await ev(() => (document.querySelector('.ww-o:not([hidden])') || {}).textContent || '');
  check(/Kai's question/.test(kq) && /Cognito/.test(kq), `Kai asks his own question first (${kq.slice(0, 50)})`);
  await btn('[data-i="0"]'); await btn('[data-a=d]');
  for (let i = 0; i < 6 && await page.$('.ww-o:not([hidden]) [data-a=n]'); i++) await btn('[data-a=n]');
  await ev(() => SD.watchWalk.talk('wen')); await page.waitForTimeout(150);
  const pick = await ev(() => [...document.querySelectorAll('.ww-o:not([hidden]) [data-o]')].map(b => b.textContent));
  check(pick.length >= 2 && pick.some(t => /^Carry on: the harvest feast/.test(t)), `with two things to do, Wen lets you pick (${pick.join(' / ')})`);
  await ev(() => [...document.querySelectorAll('.ww-o:not([hidden]) [data-o]')].find(b => /^Carry on/.test(b.textContent)).click()); await page.waitForTimeout(250);
  const wen = await ev(() => { const o = document.querySelector('.ww-o:not([hidden])'); return [SD.watchWalk.sv().quests['kai-feast-line'].step, o ? o.textContent : '']; });
  check(wen[0] === 3 && /Kai/.test(wen[1]), `then he sends you to Wen to cover his feast job (${wen[0]}: ${wen[1].slice(0, 60)})`);
  if (await page.$('.ww-o:not([hidden]) [data-a=d]')) await btn('[data-a=d]');
  for (let i = 0; i < 6 && await page.$('.ww-o:not([hidden]) [data-a=n]'); i++) await btn('[data-a=n]');
  // Wen's keys minigame: a wrong hand-out explains, the right one moves on.
  await btn('[data-k="2"]'); await btn('[data-a=g]');
  const kw = await ev(() => document.querySelector('.ww-o:not([hidden])').textContent);
  check(/till/.test(kw) && /Not quite/.test(kw), 'handing the night cook the till key is explained, not accepted');
  await btn('[data-k="2"]'); await btn('[data-k="0"]'); await btn('[data-k="1"]'); await btn('[data-a=g]');
  await btn('[data-k="0"]'); await btn('[data-a=g]');
  for (let i = 0; i < 6 && await page.$('.ww-o:not([hidden]) [data-a=n]'); i++) await btn('[data-a=n]');
  check(await ev(() => SD.watchWalk.sv().quests['kai-feast-line'].step) === 6, 'Wen agrees once the keys are right, and you report back to Kai');
  await ev(() => SD.watchWalk.talk('wen')); await page.waitForTimeout(150);
  if (await page.$('.ww-o:not([hidden]) [data-o]')) await ev(() => [...document.querySelectorAll('.ww-o:not([hidden]) [data-o]')].find(b => /^Carry on/.test(b.textContent) || true).click()), await page.waitForTimeout(200);
  check(await ev(() => !/question|Prove/.test((document.querySelector('.ww-o:not([hidden])') || {}).textContent || '')), 'Wen never asks for proof twice');
  while (await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]');
  if (await page.$('.ww-o:not([hidden]) [data-a=x]')) await btn('[data-a=x]');
  await ev(() => { const w = SD.watchWalk.sv(); w.quests['kai-feast-line'] = { step: 99, done: true }; w.freed = { kai: 1 }; w.helped = { kai: 1 }; });
  check(await ev(() => SD.watchWalk.ward('kai')) === 3, 'freed, with one of his quests done, Kai is at ward 3');
  await ev(() => SD.watchWalk.walk('dusk')); await page.waitForTimeout(150);
  while (await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]');   // Pell's dusk lines
  await tp('main-street', 1335); await use(); await page.waitForTimeout(250);
  check(await ev(() => SD.watchWalk.run.phase === 'night' && SD.watchWalk.run.st.scene === 'castle:ground'), 'at dusk the outpost door leads into the castle');

  const hs = await ev(() => document.documentElement.scrollWidth <= innerWidth);
  check(hs, 'no horizontal scroll at 375px');
  // Climbing a ramp in the stacked town (Ladi hit a frozen sky mid-climb, Nov 18).
  await ev(() => { SD.watchView.forceStacked = true; const w = SD.watchWalk.sv(); w.day = 2; SD.watchWalk.walk('day'); }); await page.waitForTimeout(200);
  await ev(() => { const st = SD.watchWalk.run.st, f = SD.watchWorld.spot('main-street', 'fork-main-up'); st.scene = 'main-street'; st.x = f.x; });
  await ev(() => SD.watchWalk.view.press('up')); await page.waitForTimeout(250);
  const midClimb = await ev(() => !!SD.watchWalk.view.ramp); await page.waitForTimeout(3000);
  check(midClimb && await ev(() => SD.watchWalk.run.st.scene === 'hill-road' && !SD.watchWalk.view.ramp), 'a ramp climb in the stacked town arrives on the road above');
  await ev(() => { SD.watchView.forceStacked = false; });
  // Night fuses (Ladi, Nov 18): break-ins turn up across the night and get through if not fixed in time.
  while (await page.$('.ww-o:not([hidden]) [data-a]')) { const b = await page.$('.ww-o:not([hidden]) [data-a=n]') || await page.$('.ww-o:not([hidden]) [data-a=d]') || await page.$('.ww-o:not([hidden]) [data-a=x]'); if (!b) break; await b.click(); await page.waitForTimeout(120); }
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 4; w.at = null; w.fixed = {}; SD.watchWalk.walk('night'); });
  await page.waitForTimeout(400);
  const f0 = await ev(() => [SD.watchWalk.clock(), (SD.watchWalk.view.marks || []).length, SD.watchWalk.run.list.map(x => x.at + '/' + x.fuse).join(',')]);
  check(f0[0] <= 360 && f0[1] === 0, `a night is 6 minutes and starts quiet: break-ins come later (${f0})`);
  await ev(() => { const r = SD.watchWalk.run, x = r.list.slice().sort((a, b) => a.at - b.at)[0]; r.st.scene = x.scene; r.st.x = x.x + 100; SD.watchWalk.clock(360 - 16); }); await page.waitForTimeout(500);   // close enough to see it
  const f1 = await ev(() => [(SD.watchWalk.view.marks || []).map(m => m.text), (document.querySelector('.ww-toast') || {}).textContent || '']);
  check(f1[0].length >= 1 && /⏳ 1:5/.test(f1[0][0]) && /Somewhere/.test(f1[1]) && !/floor/.test(f1[1]), `the first break-in rings in, without saying where, and shows its fuse (${f1})`);
  await ev(() => SD.watchWalk.clock(360 - 140)); await page.waitForTimeout(500);
  const f2 = await ev(() => { const r = SD.watchWalk.run, x = r.list[0]; return [r.locked[x.id], r.list.filter(v => v.at <= 140 && !r.locked[v.id]).length, (document.querySelector('.ww-toast') || {}).textContent || '']; });
  check(f2[0] === 'gone' && /got through|ootsteps|lookout|cleaned out|snatches|lifts|lantern/.test(f2[2]) && f2[1] >= 1, `when its fuse runs out it gets through, and the next one is up (${f2})`);
  // Kagemaru's GuardDuty bell: for one night, the floor of every break-in and every fuse, from anywhere.
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 4; w.at = null; w.fixed = {}; w.guard = 4; SD.watchWalk.walk('night'); });
  await page.waitForTimeout(300);
  await ev(() => { const r = SD.watchWalk.run; r.st.scene = 'castle:towers'; SD.watchWalk.clock(360 - 16); }); await page.waitForTimeout(500);
  const gdt = await ev(() => [(document.querySelector('.ww-toast') || {}).textContent || '', (document.querySelector('.ww-top') || document.body).textContent]);
  check(/GuardDuty: .*, on the /.test(gdt[0]) && /🔔 [\w ]+ 1:5/.test(gdt[1]), `the GuardDuty bell names the floor and shows the fuse from another floor (${gdt[0]} | ${gdt[1]})`);
  // Search (Ladi, Nov 19): a break-in shows from across the floor, but with the lantern out only up close, and a
  // forged one reads "All clear" until she's on it.
  const near = await ev(async () => { const r = SD.watchWalk.run, x = r.list.find(v => !v.at || v.at <= 20), st = r.st, wait = ms => new Promise(z => setTimeout(z, ms));
    const mk = () => (SD.watchWalk.view.marks || []).find(m => m.scene === x.scene && m.x === x.x);
    st.scene = x.scene; st.x = x.x > 700 ? 40 : 1280; await wait(500); const far = !!mk();
    r.dark = 15; await wait(400); const dark = !!mk(); r.dark = 0;
    x.forged = 1; await wait(400); const forged = (mk() || {}).text; st.x = x.x + 20; await wait(400); const close = (mk() || {}).text; x.forged = 0;
    return [far, !dark, forged === '✓ All clear', close !== '✓ All clear']; });
  check(near.every(Boolean), `a break-in shows from across the floor, not with the lantern out, and a forged one reads all clear from afar (${near})`);
  // Intruders (Ladi, Nov 18): 5-10s after a lock gives, someone walks in through it and prowls until you fix it.
  const intr = await ev(async () => { const r = SD.watchWalk.run, w = SD.watchWalk.sv(), x = r.list[0], st = r.st, out = []; x.kind = 'pickpocket';
    const wait = ms => new Promise(z => setTimeout(z, ms)); SD.watchWalk.clock(360 - x.at - 1); await wait(400);
    out.push(!(r.inside || {})[x.id]);                                  // not yet
    (SD.watchWalk.run.gate = 0, SD.watchWalk.clock(360 - x.at - x.inAt - 1)); await wait(500);
    const p = (r.inside || {})[x.id]; out.push(!!p && (r.ppl[p.scene] || []).includes(p) && p.who === 'intruder-pickpocket');
    w.tools = 1; w.silver = 50; st.scene = p.scene; p.cool = 0; st.x = p.x + 20; p.tx = p.x; st.moving = false; await wait(400);
    out.push(w.tools === 0 && w.silver === 50);                         // a spare tool goes first
    p.cool = 0; p.scene = st.scene; p.x = st.x; await wait(400); out.push(w.silver === 40);  // then 10 silver
    w.silver = 20; p.cool = 0; p.scene = st.scene; p.x = st.x; await wait(400); out.push(w.silver === 20 && /last 20 silver/.test((document.querySelector('.ww-toast') || {}).textContent));   // never her last 20 (Ladi, Nov 19)
    r.fixed[x.id] = 1; await wait(500); out.push(!Object.values(r.ppl).some(a => a.includes(p)));
    out.push(Math.abs(p.x - x.x) > 1 || p.scene !== x.scene);
    return out; });
  check(intr.every(Boolean), `an intruder walks in after the bell, steals a tool, then silver, and leaves when it's fixed, and didn't start at its break-in (${intr})`);
  // Kinds (Ladi, Nov 18): a snuffer douses the lantern, a spiller's puddle slows her, a jailer ends the night.
  const kinds = await ev(async () => { const r = SD.watchWalk.run, w = SD.watchWalk.sv(), st = r.st, out = [], wait = ms => new Promise(z => setTimeout(z, ms));
    const spawn = async (x, kind) => { x.kind = kind; r.admit(x); };
    const a = r.list[2]; await spawn(a, 'snuffer'); await wait(200); const ps = r.inside[a.id]; st.scene = ps.scene; ps.cool = 0; ps.x = st.x; ps.tx = ps.x; await wait(400);
    out.push(r.dark > 0); r.fixed[a.id] = 1; r.dark = 0; await wait(300);
    r.puddles = [{ scene: st.scene, x: st.x, life: 30 }]; await wait(300); out.push(st.slow === 0.4);
    r.puddles = []; await wait(1600); out.push(st.slow === 1);
    return out; });
  check(kinds.every(Boolean), `a snuffer blows out the lantern, and a puddle slows her down for a moment (${kinds})`);
  // Hiding (Ladi, Nov 18): up at a doorway tucks her in; prowlers pass; left or right brings her out.
  const tk1 = await ev(async () => { const r = SD.watchWalk.run, w = SD.watchWalk.sv(), st = r.st, out = [], wait = ms => new Promise(z => setTimeout(z, ms));
    const d = SD.watchWorld.scene('castle:ground').spots.find(v => v.kind === 'door'); st.scene = 'castle:ground'; st.x = d.x + 5;
    SD.watchWalk.view.press('up'); await wait(100); out.push(st.tucked === true && st.scene === 'castle:ground');
    const x = r.list.find(v => !r.fixed[v.id] && !(r.inside || {})[v.id]); x.kind = 'pickpocket';
    const p = r.admit(x); w.tools = 1; if (p) { p.scene = st.scene; p.x = st.x; p.tx = p.x; p.cool = 0; } await wait(400); out.push(!!p && w.tools === 1);
    if (p) { p.x = 1200; p.tx = 1200; } return out; });
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(150); await page.keyboard.up('ArrowRight');
  const tk2 = await ev(() => !SD.watchWalk.run.st.tucked);
  check(tk1.every(Boolean) && tk2, `up at a doorway hides her from a prowler, and stepping right brings her out (${tk1},${tk2})`);
  // Feast staff and the impersonator (Ladi, Nov 18).
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 5; w.at = null; w.fixed = {}; w.guard = 0; SD.watchWalk.walk('night'); }); await page.waitForTimeout(400);
  const imp = await ev(async () => { const r = SD.watchWalk.run, w = SD.watchWalk.sv(), st = r.st, out = [], wait = ms => new Promise(z => setTimeout(z, ms));
    out.push((r.staff || []).length >= 1 && r.staff.every(p => p.carry && p.who === 'staff'));
    (r.prowl || []).slice().forEach(p => { p.scene = 'castle:towers'; p.x = 1200; p.tx = 1200; });   // out of the way
    const x = r.list.find(v => !r.fixed[v.id] && !r.locked[v.id] && !(r.inside || {})[v.id]); if (!x) return 'no free break-in';
    x.kind = 'impersonator'; (r.prowl || []).forEach(p => { if (p !== null) p.of = p.of; }); const before = (r.prowl || []).length;
    r.prowl = (r.prowl || []).slice(0, 2); (SD.watchWalk.run.gate = 0, SD.watchWalk.clock(Math.min(SD.watchWalk.clock(), 360 - x.at - x.inAt - 1))); await wait(500);
    const p = r.inside[x.id] || r.admit(x); if (!p) return 'not spawned ' + before;
    out.push(p.who === 'staff' && !p.carry && !p.tag);
    r.prowl = [p]; r.gate = 9999; r.dark = 0;   // just this one, lantern lit
    w.silver = 40; w.tools = 0; st.scene = p.scene; st.tucked = false; st.x = p.x + 200; p.tx = p.x; p.cool = 0; p.state = 'loot'; p.loot = 99; p.exit = null; await wait(300); out.push(p.mask === true);   // too far to tell
    st.x = p.x + 70; await wait(80); out.push(p.mask === false && p.tag === 'Impersonator');   // before it grabs, bolts and hops a stair (and masks up again)
    await wait(900); out.push(w.silver === 25);
    return out; });
  check(Array.isArray(imp) && imp.every(Boolean), `staff carry trays on their round; an impersonator looks like staff with empty hands, drops the act up close and lifts 15 silver (${imp})`);
  const writ = await ev(async () => { const r = SD.watchWalk.run, w = SD.watchWalk.sv(), st = r.st, wait = ms => new Promise(z => setTimeout(z, ms));
    const p = (r.prowl || [])[0]; if (!p) return 'none'; w.writs = 1; p.cool = 99; p.state = 'loot'; p.loot = 99; p.exit = null; await wait(100);
    const clearX = [...Array(30).keys()].map(i => 150 + i * 45).find(xx => !r.list.some(v => v.scene === p.scene && Math.abs(v.x - xx) < 130));   // away from any break-in
    p.x = clearX; p.tx = clearX; st.scene = p.scene; st.x = p.x + 10;
    if (p.mask) { p.mask = false; p.who = 'intruder-impersonator'; }
    SD.watchWalk.view.press('use'); await wait(200); const said = (document.querySelector('.ww-o:not([hidden])') || {}).textContent || '';
    return [w.writs === 0, !(r.prowl || []).includes(p), /Revoking/.test(said), !r.fixed[p.of]]; });
  check(Array.isArray(writ) && writ.every(Boolean), `Revoke active sessions removes an intruder but leaves its break-in open (${writ})`);
  while (await page.$('.ww-o:not([hidden]) [data-a]')) { const b = await page.$('.ww-o:not([hidden]) [data-a=n]') || await page.$('.ww-o:not([hidden]) [data-a=d]') || await page.$('.ww-o:not([hidden]) [data-a=x]'); if (!b) break; await b.click(); await page.waitForTimeout(150); }
  // The door queue (Ladi, Nov 18): a backlog comes in one at a time, 5s apart, and a writ holds the door for 10s.
  const qd = await ev(async () => { const w = SD.watchWalk.sv(); w.day = 8; w.at = null; w.fixed = {}; w.guard = 0; SD.watchWalk.walk('night');
    const wait = ms => new Promise(z => setTimeout(z, ms)); await wait(300); const r = SD.watchWalk.run, out = [];
    r.list.forEach(x => { x.at = 15; x.inAt = 5; x.fuse = 999; });
    SD.watchWalk.clock(360 - 25); await wait(1500); out.push((r.prowl || []).length === 1);   // one, then 5s for the next
    SD.watchWalk.clock(360 - 40); await wait(400); out.push(r.prowl.length === 2);
    SD.watchWalk.clock(360 - 46); await wait(400); out.push(r.prowl.length === 3);
    SD.watchWalk.clock(360 - 60); await wait(400); out.push(r.prowl.length === 3);         // capped at 3
    r.fixed[r.prowl[0].of] = 1; await wait(400); out.push(r.prowl.length === 2);
    SD.watchWalk.clock(360 - 62); await wait(400); out.push(r.prowl.length === 2);         // 2s after: still waiting
    SD.watchWalk.clock(360 - 66); await wait(400); out.push(r.prowl.length === 3);         // 5s after: next one in
    return out; });
  check(qd.every(Boolean), `intruders queue at the door: one at a time, 5s apart, at most 3 inside (${qd})`);
  const cap3 = await ev(() => (SD.watchWalk.run.prowl || []).length <= 3);
  check(cap3, 'never more than 3 intruders inside at once');
  const roamed = await ev(async () => { const r = SD.watchWalk.run, x = r.list[1], st = r.st;
    st.scene = 'bridge'; st.x = 880; (SD.watchWalk.run.gate = 0, SD.watchWalk.clock(360 - x.at - x.inAt - 1)); await new Promise(z => setTimeout(z, 400));
    const p = r.inside[x.id] || (r.prowl || [])[0]; if (!p) return 'none'; p.sp = 700; p.goal = { scene: p.scene === 'castle:cellars' ? 'castle:towers' : 'castle:cellars', x: 600, name: 'Archive' }; p.state = 'go'; p.exit = null; p.tx = p.x; const seen = new Set([p.scene]), states = new Set();
    for (let i = 0; i < 40; i++) { await new Promise(z => setTimeout(z, 100)); seen.add(p.scene); states.add(p.state); }
    return [...seen].length + ' floors, ' + [...states].join('/'); });
  check(/^[2-9] floors/.test(roamed) && /loot|go/.test(roamed), `an intruder heads for a room to rob and takes the stairs (${roamed})`);
  const jail = await ev(async () => { const w = SD.watchWalk.sv(); w.day = 6; w.at = null; w.fixed = {}; w.guard = 0; SD.watchWalk.walk('night');
    await new Promise(z => setTimeout(z, 300)); const r = SD.watchWalk.run, st = r.st, x = r.list[2];
    (SD.watchWalk.run.gate = 0, SD.watchWalk.clock(360 - x.at - x.inAt - 1)); await new Promise(z => setTimeout(z, 400));
    const p = r.inside[x.id] || r.admit(x); if (!p) return 'none'; st.scene = p.scene; p.cool = 0; p.facing = 1; st.x = p.x + 30; p.tx = p.x; st.moving = true;
    await new Promise(z => setTimeout(z, 400)); return [p.kind, r.over, (document.querySelector('.ww-o:not([hidden])') || {}).textContent || '']; });
  check(jail[0] === 'jailer' && jail[1] === 1 && /closet/.test(jail[2]), `from night 6 a jailer can lock her in a closet, which ends the night (${jail})`);
  while (await page.$('.ww-o:not([hidden]) [data-a]')) { const b = await page.$('.ww-o:not([hidden]) [data-a=n]') || await page.$('.ww-o:not([hidden]) [data-a=d]') || await page.$('.ww-o:not([hidden]) [data-a=x]'); if (!b) break; await b.click(); await page.waitForTimeout(150); }
  // The rest of the kinds (Ladi, Nov 18: every section of the security domain has one).
  const NK = `(() => { const r = SD.watchWalk.run, w = SD.watchWalk.sv(), st = r.st, wait = ms => new Promise(z => setTimeout(z, ms));
    const clear = () => { r.prowl = []; r.inside = {}; r.out = {}; r.gate = 9999; r.calm = 0; r.dark = 0; st.tucked = false; };
    const free = (not) => r.list.find(v => !r.fixed[v.id] && !r.locked[v.id] && /^castle:/.test(v.scene) && !(not || []).includes(v));
    const spawn = (x, kind) => { x.kind = kind; x.fuse = 999; const p = r.admit(x); p.cool = 0; return p; };
    const to = (p, scene, x) => { p.scene = scene; p.x = x; p.tx = x; p.exit = null; };
    const gone = () => 360 - SD.watchWalk.clock();
    return { r, w, st, wait, clear, free, spawn, to, gone }; })()`;
  const nk = await ev(async NK => { const w0 = SD.watchWalk.sv(); w0.day = 8; w0.at = null; w0.fixed = {}; w0.guard = 0; SD.watchWalk.walk('night');
    await new Promise(z => setTimeout(z, 300)); const { r, w, st, wait, clear, free, spawn, to, gone } = eval(NK), out = {};
    r.list.forEach(x => { x.at = 0; x.inAt = 9999; x.fuse = 999; }); SD.watchWalk.clock(300); clear(); st.scene = 'castle:towers'; st.x = 200;
    let x = free(), p = spawn(x, 'forger'); const fv = r.list.find(v => v.id === p.goal.forge); to(p, p.goal.scene, p.goal.x); await wait(300);
    out.forger = !!fv && fv.forged === 1; clear();
    x = free(); const v = free([x]); r.fixed[v.id] = 1; r.lastFix = { id: v.id, t: gone(), scene: v.scene, x: v.x }; p = spawn(x, 'replayer'); await wait(200);
    const aimed = p.goal.replay === v.id; to(p, v.scene, v.x); await wait(300); out.replayer = aimed && !r.fixed[v.id]; clear();
    x = free(); p = spawn(x, 'escalator'); p.state = 'loot'; p.loot = 0.01; p.goal = { scene: p.scene, x: p.x, name: 'Hall' }; await wait(250); out.escalator = p.lvl === 1; clear();
    x = free(); p = spawn(x, 'rummager'); const rv = free([x]); to(p, rv.scene, rv.x); const f0 = rv.fuse; p.state = 'loot'; p.loot = 0.01; p.goal = { scene: p.scene, x: p.x, name: 'Hall' };
    await wait(250); out.rummager = rv.fuse === f0 - 10; clear();
    x = free(); p = spawn(x, 'exfiltrator'); p.state = 'go'; st.scene = p.scene; st.x = p.x + 20; const s0 = w.silver || 0; await wait(250);
    out.exfiltrator = !r.prowl.includes(p) && r.out[x.id] === 1 && w.silver === s0 + 10; clear(); st.x = 200; st.scene = 'castle:towers';
    x = free(); p = spawn(x, 'secrethunter'); p.state = 'go'; st.scene = p.scene; st.x = p.x + 30; r.half = 0; await wait(300); out.secrethunter = r.half === 1; clear();
    x = free(); p = spawn(x, 'eavesdropper'); const y = free([x]), q = spawn(y, 'pickpocket'); to(q, 'castle:cellars', 1300); q.cool = 99;
    to(p, 'castle:towers', 400); p.state = 'lurk'; p.lurkT = 30; p.cool = 0; st.scene = 'castle:towers'; st.x = 500; await wait(250);
    out.eavesdropper = q.goal && q.goal.name === 'warden'; clear(); st.x = 200;
    return out; }, NK);
  check(Object.values(nk).every(Boolean) && Object.keys(nk).length === 7, `forger, replayer, escalator, rummager, exfiltrator, secret-hunter and eavesdropper each do their thing (${JSON.stringify(nk)})`);
  // The turncloak (2.1.5, 2.2.6): over the bridge, a cloak at the wardrobe, 45s of a real pass, then back to renew.
  const tc = await ev(async NK => { const { r, w, st, wait, clear, free, spawn, to } = eval(NK), out = [];
    clear(); st.scene = 'castle:towers'; st.x = 200; const x = free(), p = spawn(x, 'turncloak');
    out.push(p.scene === 'bridge' && p.goal.renew === 1 && !(p.sess > 0));
    to(p, 'castle:upper', p.goal.x); p.state = 'go'; await wait(300); out.push(p.state === 'renew');
    p.loot = 0.01; await wait(250); out.push(p.sess > 40 && p.who === 'intruder-turncloak' && /⏳/.test(p.tag));
    p.state = 'loot'; p.loot = 99; st.scene = p.scene; st.x = p.x + 10; w.writs = 0; SD.watchWalk.view.press('use'); await wait(200);
    out.push(/checks out/.test((document.querySelector('.ww-o:not([hidden])') || {}).textContent || '') && r.prowl.includes(p));
    return out; }, NK);
  while (await page.$('.ww-o:not([hidden]) [data-a]')) { const b = await page.$('.ww-o:not([hidden]) [data-a=n]') || await page.$('.ww-o:not([hidden]) [data-a=d]') || await page.$('.ww-o:not([hidden]) [data-a=x]'); if (!b) break; await b.click(); await page.waitForTimeout(150); }
  const tc2 = await ev(async NK => { const { r, w, st, wait, clear, free, spawn } = eval(NK), out = [];
    const p = r.prowl[0]; if (!p) return ['none']; st.x = p.x + 300; await wait(2300);   // past the calm after talking
    r.fixed[p.of] = 1; await wait(1200); out.push(r.prowl.includes(p) && p.lame === 1);    // a fixed trust policy leaves the live session
    p.sess = 0.05; await wait(300); out.push(!r.prowl.includes(p));                         // and it can't renew
    clear(); const x = free(), q = spawn(x, 'turncloak'); q.sess = 0; q.state = 'go'; st.scene = q.scene; st.x = q.x + 20; const s0 = w.silver || 0; await wait(250);
    out.push(!r.prowl.includes(q) && w.silver === s0 + 10);                                 // caught between sessions
    return out; }, NK);
  check(tc.every(Boolean) && tc2.every(Boolean), `a turncloak crosses the bridge, takes a cloak, checks out while it lasts, outlasts a fix, and can be caught between sessions (${tc}; ${tc2})`);
  // The Long Night: each intruder is its break-in's section kind or a random one, with at most 2 jailers.
  const ln = await ev(async () => { const w = SD.watchWalk.sv(); w.day = 9; w.at = null; w.fixed = {}; w.guard = 0; SD.watchWalk.walk('night');
    await new Promise(z => setTimeout(z, 300)); const r = SD.watchWalk.run;
    const ks = r.list.map((x, i) => (x.kind = r.kindFor(x, i)));
    return [ks.length, ks.filter((k, i) => k === r.tie[r.list[i].skill]).length, ks.filter(k => k === 'jailer').length, new Set(ks).size]; });
  check(ln[1] >= 3 && ln[1] < ln[0] && ln[2] <= 2 && ln[3] >= 5, `on the Long Night, some intruders match their break-in's section and the rest are mixed (${ln[1]} of ${ln[0]} tied, ${ln[2]} jailers, ${ln[3]} kinds)`);
  await ev(() => { SD.watchWalk.run.gate = 9999; SD.watchWalk.run.prowl = []; SD.watchWalk.run.inside = {}; });
  const toKage = () => ev(() => { const r = SD.watchWalk.run; for (const sc in r.ppl) { const p = r.ppl[sc].find(v => v.who === 'kagemaru'); if (p) { r.st.scene = sc; r.st.x = p.x; return; } } });
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 4; w.guard = 0; w.guardTrial = 0; w.silver = 100; SD.watchWalk.walk('day'); }); await page.waitForTimeout(200);
  await toKage(); await use(); await page.waitForTimeout(150);
  const toShop = async () => { for (let i = 0; i < 12 && !(await page.$('.ww-o:not([hidden]) [data-a=s]')); i++) {
    const b = await page.$('.ww-o:not([hidden]) [data-a=n]') || await page.$('.ww-o:not([hidden]) [data-a=no]') || await page.$('.ww-o:not([hidden]) [data-a=x]');
    if (b) { await b.click(); await page.waitForTimeout(150); } else { await use(); await page.waitForTimeout(150); } } };
  await ev(() => { ['kagemaru-upriver', 'kagemaru-prices'].forEach(id => { SD.watchWalk.sv().quests[id] = { step: 99, done: true }; }); });
  await toShop(); await btn('[data-a=s]'); await btn('[data-b=guard]');
  const g1 = await ev(() => [SD.watchWalk.sv().silver, SD.watchWalk.sv().guard]);
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 7; w.guard = 0; }); await btn('[data-a=x]'); await toKage(); await use(); await page.waitForTimeout(150);
  await toShop(); await btn('[data-a=s]'); const due = await ev(() => SD.watchWalk.breaches(7).length); await btn('[data-b=guard]');
  const g2 = await ev(() => SD.watchWalk.sv().silver);
  check(g1[0] === 100 && g1[1] === 4 && g2 === 100 - 8 * due, `GuardDuty's first night is a free trial, then 8 silver per break-in due (${g1}, ${g2}, ${due} due)`);
  await btn('[data-a=x]');
  check(await ev(() => { const w = SD.watchWalk.sv(); w.day = 9; const ok = !SD.watchWalk.shopItems().some(it => it.id === 'guard'); w.day = 4; return ok; }), 'no GuardDuty bell for the Long Night');
  // Archway rooms (HD floors, Nov 19): walking in opens the room's painting; a break-in there is fixed in the same popup.
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 4; w.at = null; w.fixed = {}; w.guard = 0; SD.watchWalk.walk('night'); }); await page.waitForTimeout(300);
  const pop = await ev(async () => { const r = SD.watchWalk.run, st = r.st, wait = ms => new Promise(z => setTimeout(z, ms)), out = [];
    r.gate = 9999; r.prowl = []; r.inside = {}; r.list.forEach(x => { x.at = 9999; });
    const d = SD.watchWorld.scene('castle:upper').spots.find(v => v.id === 'door-wardrobe'); st.scene = 'castle:upper'; st.x = d.x;
    SD.watchWalk.view.press('use'); await wait(150); let o = document.querySelector('.ww-o:not([hidden])');
    out.push(!!(o && o.querySelector('.ww-room') && /Wardrobe/.test(o.textContent)));
    const b = o && o.querySelector('[data-a=d]'); if (b) b.click(); await wait(200);
    const x = r.list.find(v => v.scene !== 'bridge' && /^castle:(cellars|upper|towers)$/.test(v.scene)); if (!x) return out.concat('no archway break-in');
    x.at = 0; x.inAt = 0; st.scene = x.scene; st.x = x.x; await wait(200); SD.watchWalk.view.press('use'); await wait(150);
    o = document.querySelector('.ww-o:not([hidden])'); out.push(!!(o && o.querySelector('.ww-room') && o.querySelector('[data-i]')));
    return out; });
  check(pop.every(v => v === true), `walking into an archway room opens its painting, and its break-in is fixed in the same popup (${pop})`);
  while (await page.$('.ww-o:not([hidden]) [data-a]')) { const b = await page.$('.ww-o:not([hidden]) [data-a=n]') || await page.$('.ww-o:not([hidden]) [data-a=d]') || await page.$('.ww-o:not([hidden]) [data-a=x]'); if (!b) break; await b.click(); await page.waitForTimeout(150); }
  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} failed` : '\nall ok'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
