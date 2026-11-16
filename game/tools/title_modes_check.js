// Headless check that the game modes are reachable from the start menu at phone width (375px), Ladi Nov 16: on a
// fresh save, after PRESS START, a Game modes button sits with New game, Multiplayer and How to play (before How to
// play), on the plain title and the demo title (the live page's flags), and opens the picker with every registered mode. The ☰ menu
// has Game modes too. A mode starts from it with no exam date set. Nothing on the title is wider than the phone.
// Run from game/:  node tools/title_modes_check.js     SHOTS=dir saves screenshots.
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

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch();
  for (const q of ['', '?demo']) {
    const page = await browser.newPage({ viewport: { width: 375, height: 740 } });
    // The live page's flags (tools/artifact_page.py), so the demo pass builds the title the way the artifact does.
    if (q) await page.addInitScript(() => { window.SD_VECTOR = window.SD_CH2 = window.SD_DEMO = true; });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(base + q);
    await page.waitForFunction(() => window.SD && SD.main && document.querySelector('#t-start'), null, { timeout: 30000 });
    const tag = q ? 'demo title' : 'title';
    check(!(await page.$('#t-modes')), `${tag}: no Game modes button on the press-start screen`);
    await page.click('#t-start');
    await page.waitForSelector('#t-modes', { timeout: 5000 }).catch(() => {});
    const ids = await page.$$eval('#title-actions button', bs => bs.map(b => b.id));
    const n = await page.evaluate(() => SD.modes.list().length);
    check(n >= 1, `${tag}: ${n} modes registered`);
    if (q) check(ids.includes('ds-new'), `${tag}: the demo title's own New game (ds-new)`);
    check(ids.includes('t-modes'), `${tag}: Game modes on the title (${ids.join(', ')})`);
    check(ids.indexOf('t-modes') < ids.indexOf('t-help'), `${tag}: Game modes comes before How to play`);
    check(await page.evaluate(() => SD.today.state() === 'first'), `${tag}: a fresh save (no exam date) still gets it`);
    const wide = await page.evaluate(() => { const t = document.querySelector('#screen-title'); return [document.documentElement.scrollWidth, ...[...document.querySelectorAll('#title-actions button')].map(b => Math.ceil(b.getBoundingClientRect().right))].filter(w => w > innerWidth); });
    check(!wide.length, `${tag}: nothing wider than 375px ${wide.join(' ')}`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `title-modes${q ? '-demo' : ''}.png`) });
    await page.click('#t-modes');
    await page.waitForTimeout(300);
    const rows = await page.$$eval('#panel [data-mode]', bs => bs.length);
    check(await page.textContent('#panel .win-h') === 'PLAY' || /PLAY/.test(await page.textContent('#panel .win-h')), `${tag}: Game modes opens the PLAY picker`);
    check(rows === n, `${tag}: the picker lists all ${n} modes (${rows})`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `title-modes-picker${q ? '-demo' : ''}.png`) });
    // A mode starts with no exam date (the first registered one), and the picker can be closed back to the title.
    const first = await page.evaluate(() => SD.modes.list()[0].name);
    await page.click('#panel [data-mode]');
    await page.waitForTimeout(800);
    check(!errs.length, `${tag}: ${first} starts on a fresh save without errors ${errs.join(' | ')}`);
    await page.evaluate(() => SD.ui.closePanel());
    // The ☰ menu.
    await page.evaluate(() => SD.main.menu());
    check(!!(await page.$('#m-modes')), `${tag}: the ☰ menu has Game modes`);
    await page.click('#m-modes');
    await page.waitForTimeout(300);
    check(/PLAY/.test(await page.textContent('#panel .win-h')), `${tag}: the menu's Game modes opens the picker`);
    await page.close();
  }
  await browser.close();
  server.close();
  console.log(fails ? `${fails} FAILED` : 'All title modes checks passed');
  process.exit(fails ? 1 : 0);
})();
