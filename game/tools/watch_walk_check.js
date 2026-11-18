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

  const hs = await ev(() => document.documentElement.scrollWidth <= innerWidth);
  check(hs, 'no horizontal scroll at 375px');
  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} failed` : '\nall ok'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
