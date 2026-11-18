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
  const ev = f => page.evaluate(f);
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
  check(/Ward level 0 of 4/.test(await card()) && /Hire · 50/.test(await card()), 'Mira is a watcher: her ward level and the hire button show');
  await btn('[data-a=x]');
  check(await ev(() => SD.watchBonds.trust(SD.watchWalk.sv().bonds, 'mira')) === 42, 'the first chat of the day adds 2 trust');

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
  check(/explicit deny/.test(deny) && /Odu could vouch/.test(deny), 'a cool tie denies the referral and names who could vouch');
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
  await ev(() => { window.WATCH_CONTENT = null; });
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
  check(w2.day === 2 && w2.silver === 20 + 30, `dawn pays 20 base + 10 for the fix (${w2.silver - 20})`);
  await shot('dawn');

  // Stairs and the back stair at night.
  await ev(() => SD.watchWalk.walk('night', { scene: 'castle:upper', x: 1450 }));
  await page.waitForTimeout(150);
  await ev(() => document.querySelector('.ww-o:not([hidden]) button') && document.querySelector('.ww-o:not([hidden]) button').click());
  await ev(() => SD.watchWalk.view.press('up')); await page.waitForTimeout(100);
  check(await ev(() => SD.watchWalk.run.st.scene === 'castle:towers'), 'the back stair goes from the upper floor to the towers once unlocked');

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
    return SD.watchWalk.breaches(9).map(b => b.scene);
  });
  check(n9.length === 6 && n9.filter(s => s.startsWith('castle')).length === 2 && n9.slice(2).every(s => !s.startsWith('castle')), `the Long Night brings back the missed breaches and adds town ones (${n9.join(', ')})`);
  check(await ev(() => SD.watchWalk.ward('dutch')) === 4, 'paid 2 + a heart + trust 60 makes ward level 4');
  await ev(() => SD.watchWalk.walk('dusk')); await page.waitForTimeout(150); await btn('[data-a=n]');
  check(await ev(() => !!SD.watchWalk.sv().retry), 'the Long Night saves a retry point at dusk');
  await tp('west-road', 3280); await use(); await page.waitForTimeout(250); await btn('[data-a=n]');
  const r9 = await ev(() => { const r = SD.watchWalk.run; return { ground: r.ward['castle:ground'], wardFixed: Object.values(r.fixed).filter(v => v === 'ward').length }; });
  check(r9.ground === 4 && r9.wardFixed >= 2, `Dutch at level 4 clears the ground floor before you arrive (${JSON.stringify(r9)})`);
  await tp('castle:ground', 40); await use(); await page.waitForTimeout(150);
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
  check(/Arrows to move/.test(await card()), 'day 1 opens with Mira\'s walkthrough');
  await btn('[data-a=n]');
  await tp('main-street', 760); await page.waitForTimeout(200);
  check(/Tess/.test(await card()), 'the walkthrough\'s next stop plays at the fork');
  await shot('tutorial');
  await btn('[data-a=n]');
  // Capstone: Hobb at ward 4 takes the cellars.
  const cap = await ev(() => { const w = SD.watchWalk.sv(); w.day = 6; w.hires = { hobb: 2 }; w.hearts = { hobb: 1 }; SD.watchBonds.add(w.bonds, 'hobb', 60);
    ['hobb-key-pair', 'hobb-practice-crest'].forEach(id => { w.quests[id] = { step: 99, done: true }; }); SD.watchWalk.walk('day'); return SD.watchWalk.ward('hobb'); });
  await page.waitForTimeout(200);
  await tp('main-street', 2760 + 34); await use(); await page.waitForTimeout(150);
  for (let i = 0; i < 3; i++) { if (await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]'); }
  if (await page.$('.ww-o:not([hidden]) [data-a=d]')) await btn('[data-a=d]');
  const capW = await ev(() => { const w = SD.watchWalk.sv(); return [w.quests['hobb-last-lock'] && w.quests['hobb-last-lock'].done, w.sealed && w.sealed.cellars]; });
  check(cap === 4 && capW[0] && capW[1] === 'all', `Hobb's capstone at ward 4 seals the cellars for good (${capW})`);

  // The shop.
  await ev(() => { const w = SD.watchWalk.sv(); w.day = 3; w.silver = 100; w.hires = { kagemaru: 2 }; w.unlocks = {}; SD.watchWalk.walk('day'); });
  await page.waitForTimeout(200);
  await tp('main-street', 2400 + 34); await use(); await page.waitForTimeout(150);
  await btn('[data-a=s]'); await btn('[data-b=tools]'); await btn('[data-b=outpost]'); await btn('[data-b=post]'); await btn('[data-p="far-lane"]');
  const sh = await ev(() => { const w = SD.watchWalk.sv(); return [w.silver, w.tools, w.unlocks.outpost, w.posts['far-lane']]; });
  check(sh[0] === 100 - 10 - 60 - 15 && sh[1] === 1 && sh[2] && sh[3], `the shop sells tools, an outpost and a lantern post (${sh})`);
  await btn('[data-a=x]');
  await ev(() => SD.watchWalk.walk('dusk')); await page.waitForTimeout(150);
  while (await page.$('.ww-o:not([hidden]) [data-a=n]')) await btn('[data-a=n]');   // Pell's dusk lines
  await tp('main-street', 1300); await use(); await page.waitForTimeout(250);
  check(await ev(() => SD.watchWalk.run.phase === 'night' && SD.watchWalk.run.st.scene === 'castle:ground'), 'at dusk the outpost door leads into the castle');

  const hs = await ev(() => document.documentElement.scrollWidth <= innerWidth);
  check(hs, 'no horizontal scroll at 375px');
  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} failed` : '\nall ok'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
