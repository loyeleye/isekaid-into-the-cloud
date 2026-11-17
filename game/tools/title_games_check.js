// Headless check of the games carousel on the title (js/title-games.js; Ladi Nov 16, start menu review): at 375x740,
// the iPhone SE (375x667) and landscape (740x375), on the plain title and the live page's demo title, on a fresh save
// and a returning one.
//   - Nothing on the press-start screen; after it, one row of cards: the story first, every game mode, Multiplayer.
//   - A fresh save's story card is New game; a returning save's is Continue (the #ds-go/#t-go hook js/quicksave.js uses).
//   - The old Game modes button and the Today card's ▶ Play link are gone; the picker panel is titled GAME MODES.
//   - Tapping a mode card starts that mode with no errors and remembers it; the next title opens on that card.
//   - The ☰ button on the title opens the menu, which has How to play and, with a save, Start the story over.
//   - Nothing wider than the screen, card buttons at least 44px tall in portrait, no "About about".
// Run from game/:  node tools/title_games_check.js     SHOTS=dir saves screenshots.
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };
const RETURNING = () => { const s = SD.state.save; s.flags.prologue = true; s.c1 = s.c1 || {}; s.c1.lead = s.c1.lead || 'kai'; s.c3 = s.c3 || {}; SD.exam.setDate('2026-11-30'); s.todaySkip = true; SD.state.persist(); };

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  const open = async (vp, demo, save) => {
    const page = await browser.newPage({ viewport: vp });
    page.errs = [];
    page.on('pageerror', e => page.errs.push(e.message));
    if (demo) await page.addInitScript(() => { window.SD_VECTOR = window.SD_CH2 = window.SD_DEMO = true; });
    await page.goto(base);
    await page.waitForFunction(() => window.SD && SD.main && document.querySelector('#t-start'), null, { timeout: 30000 });
    await page.waitForTimeout(300);
    if (save) await page.evaluate(RETURNING);
    return page;
  };
  for (const demo of [false, true]) for (const save of [false, true]) {
    const tag = `${demo ? 'demo' : 'plain'} title, ${save ? 'returning' : 'fresh'} save`;
    const page = await open({ width: 375, height: 740 }, demo, save);
    check(!(await page.$('.tg-card')), `${tag}: no cards on the press-start screen`);
    await page.click('#t-start');
    await page.waitForSelector('.tg-card', { timeout: 5000 }).catch(() => {});
    const games = await page.$$eval('.tg-card', cs => cs.map(c => c.dataset.game));
    const modes = await page.evaluate(() => SD.modes.list().filter(m => !m.folded).map(m => m.id));   // folded modes open from another card (js/lf-hub.js)
    check(games[0] === 'story', `${tag}: the story card comes first (${games.join(', ')})`);
    check(modes.every(id => games.includes(id)), `${tag}: every game mode has a card (${modes.length})`);
    check(games[games.length - 1] === 'mp' || !(await page.evaluate(() => SD.mp && SD.mp.available())), `${tag}: Multiplayer is the last card`);
    const story = await page.$eval('.tg-card[data-game="story"] .tg-go', b => [b.id, b.textContent.trim()]);
    if (save) check(['ds-go', 't-go'].includes(story[0]) && /Continue|Resume/.test(story[1]), `${tag}: the story card continues the save (${story.join(' ')})`);
    else check(['ds-new', 't-new'].includes(story[0]) && /New game/i.test(story[1]), `${tag}: the story card is New game (${story.join(' ')})`);
    check(!(await page.$('#t-modes')) && !(await page.$('#td-play')), `${tag}: no Game modes button and no ▶ Play link`);
    check(!(await page.$('#title-actions > button:not(.tg-arrow)')), `${tag}: no loose buttons left under the cards`);
    const helpOut = await page.$eval('#t-help', b => !b.closest('[hidden]')).catch(() => false);
    check(save ? !helpOut : helpOut, `${tag}: How to play ${save ? 'moves to ☰' : 'stays under the cards'}`);
    const wide = await page.evaluate(() => (() => { const t = document.querySelector('#screen-title'), ox = getComputedStyle(t).overflowX; return [document.documentElement.scrollWidth, ox === 'hidden' || ox === 'clip' ? 0 : t.scrollWidth].filter(w => w > innerWidth); })());
    check(!wide.length, `${tag}: nothing wider than 375px ${wide.join(' ')}`);
    const short = await page.$$eval('.tg-go', bs => bs.map(b => Math.round(b.getBoundingClientRect().height)).filter(h => h < 44));
    check(!short.length, `${tag}: card buttons at least 44px tall ${short.join(' ')}`);
    check(!/about about/i.test(await page.textContent('#title-actions')), `${tag}: no "About about"`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `title-games-${demo ? 'demo' : 'plain'}-${save ? 'returning' : 'fresh'}.png`) });
    // The ☰ menu from the title.
    await page.click('#t-menu');
    await page.waitForTimeout(200);
    check(/MENU/.test(await page.textContent('#panel .win-h')), `${tag}: ☰ opens the menu`);
    check(!!(await page.$('#m-help')), `${tag}: the menu has How to play`);
    check(save ? !!(await page.$('#m-new')) : !(await page.$('#m-new')), `${tag}: Start the story over ${save ? 'is' : 'is not'} in the menu`);
    await page.click('#m-help');
    await page.waitForTimeout(200);
    check(/HOW TO PLAY/i.test(await page.textContent('#panel .win-h')), `${tag}: the menu's How to play opens it`);
    await page.evaluate(() => SD.ui.closePanel());
    // The picker panel's name.
    await page.evaluate(() => SD.modes.open());
    check(/GAME MODES/.test(await page.textContent('#panel .win-h')), `${tag}: the picker panel is titled GAME MODES`);
    check(!/about about/i.test(await page.textContent('#panel')), `${tag}: no "About about" in the picker`);
    await page.evaluate(() => SD.ui.closePanel());
    // Play a mode from its card (the last mode, so the carousel has to scroll to it).
    const last = modes[modes.length - 1];
    await page.$eval(`.tg-card[data-game="${last}"]`, c => c.scrollIntoView({ inline: 'start' }));
    await page.click(`.tg-card[data-game="${last}"] .tg-go`);
    await page.waitForTimeout(800);
    check(!page.errs.length, `${tag}: ${last} starts from its card without errors ${page.errs.join(' | ')}`);
    check(await page.evaluate(() => SD.state.save.lastGame) === last, `${tag}: the card remembers ${last}`);
    await page.evaluate(() => { SD.ui.closePanel(); SD.main.title(); });
    await page.waitForTimeout(400);
    check(await page.$eval('.tg-card.on', c => c.dataset.game).catch(() => '') === last, `${tag}: the next title opens on ${last}`);
    await page.close();
  }
  // Small and landscape phones on the live page's title with a save.
  for (const [vp, name] of [[{ width: 375, height: 667 }, 'iPhone SE'], [{ width: 740, height: 375 }, 'landscape']]) {
    const page = await open(vp, true, true);
    await page.click('#t-start');
    await page.waitForSelector('.tg-card', { timeout: 5000 }).catch(() => {});
    const wide = await page.evaluate(() => (() => { const t = document.querySelector('#screen-title'), ox = getComputedStyle(t).overflowX; return [document.documentElement.scrollWidth, ox === 'hidden' || ox === 'clip' ? 0 : t.scrollWidth].filter(w => w > innerWidth); })());
    check(!wide.length, `${name}: nothing wider than the screen ${wide.join(' ')}`);
    const reach = await page.evaluate(() => { const t = document.querySelector('#screen-title'), b = document.querySelector('.tg-card.on .tg-go').getBoundingClientRect(); return b.bottom - t.getBoundingClientRect().top <= t.scrollHeight; });
    check(reach, `${name}: the centred card's button can be reached`);
    const mb = await page.$eval('#t-menu', b => b.getBoundingClientRect()), lg = await page.$eval('#screen-title .logo', l => l.getBoundingClientRect()).catch(() => null);
    if (name !== 'landscape' && lg) check(mb.bottom <= lg.top + 4 || mb.right <= lg.left, `${name}: the ☰ button doesn't sit on the logo`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `title-games-${name.replace(/\W+/g, '-').toLowerCase()}.png`) });
    check(!page.errs.length, `${name}: no errors ${page.errs.join(' | ')}`);
    await page.close();
  }
  await browser.close();
  server.close();
  console.log(fails ? `${fails} FAILED` : 'All title games checks passed');
  process.exit(fails ? 1 : 0);
})();
