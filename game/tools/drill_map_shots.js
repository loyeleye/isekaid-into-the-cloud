// Screenshots of the Fire Drill's night map at phone and desktop sizes, on night 2 partway through.
// Run from game/:  node tools/drill_map_shots.js OUT_DIR [full]    (full: fakes the 21-drill rows for layout)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..'), OUT = process.argv[2] || '.', FULL = process.argv[3] === 'full', N1 = process.argv[3] === 'night1';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const [name, vp, dsf] of [['phone', { width: 390, height: 844 }, 2], ['desktop', { width: 1440, height: 900 }, 1]]) {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: dsf });
    page.on('pageerror', e => console.log('pageerror', e.message));
    await page.clock.install({ time: new Date('2026-11-17T20:00:00') });
    await page.goto(url);
    await page.click('#t-start');
    await page.waitForSelector('#today-card:not([hidden])');
    await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); SD.modes.open(); });
    await page.click('[data-mode="drill"]');
    await page.waitForTimeout(400);
    await page.evaluate(([full, n1]) => {
      const D = SD.drill;
      if (full) {
        const add = (id, from, name) => { if (!D.DRILLS[id]) D.DRILLS[id] = Object.assign({}, D.DRILLS[from], { name }); };
        add('quota', 'storm', 'The Shared Key'); add('receipt', 'hot', 'The Wrong Receipt'); add('cache', 'hot', 'The Old Price');
        add('upload', 'badge', 'The Half Upload'); add('quiet', 'fuse', 'The Quiet Subscriber'); add('catch', 'poison', 'The Dropped Catch');
        D.ROWS.splice(0, D.ROWS.length, ['storm', 'cold', 'pass', 'quota'], ['hot', 'locked', 'shelf', 'receipt', 'cache'], ['badge', 'canary', 'vault', 'upload'], ['herd'], ['fuse', 'single', 'quiet'], ['poison', 'stampede', 'catch'], ['midnight']);
      }
      const s = SD.state.save.drill;
      if (n1) Object.assign(s, { night: 1, row: 3, phase: 'map', fresh: false, cutAt: '1:3',
        done: [{ drill: 'storm', clean: true, state: 'contained' }, { drill: 'hot', clean: false, state: 'contained' }, { drill: 'badge', clean: false, state: 'escalated' }] });
      else Object.assign(s, { night: 2, row: 2, phase: 'map', fresh: false, cutAt: '2:2',
        done: [{ drill: 'cold', clean: true, state: 'contained' }, { drill: 'locked', clean: false, state: 'contained' }] });
      SD.state.persist(); SD.drillUi.draw();
    }, [FULL, N1]);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `map-${name}${FULL ? '-full' : N1 ? '-night1' : ''}.png`) });
    await page.evaluate(() => { const w = document.querySelector('#panel .win-b'); w.scrollTop = 0; });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(OUT, `map-${name}${FULL ? '-full' : N1 ? '-night1' : ''}-top.png`) });
    const hs = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    console.log(name, 'hscroll', hs);
    await page.close();
  }
  await browser.close(); server.close();
})();
