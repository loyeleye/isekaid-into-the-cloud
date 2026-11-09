// Leave the expedition asks first (Ladi, 2026-11-09). Solo Deny Mines on a phone, to the third map: Leave opens the
// confirm with Keep going focused; Escape and a tap outside keep going (the expedition is still there); Leave the
// dungeon leaves (the mines hand back to the cave). Fails on any page error.
// Run from game/:  node tools/leave_check.js
const { chromium, devices } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
// The party check's stepper (one move on the tab), reused as is.
const src = fs.readFileSync(path.join(__dirname, 'mines_party_check.js'), 'utf8'), at = src.indexOf('function step');
const step = eval('(' + src.slice(at, src.indexOf('\n}\n', at) + 2) + ')');

(async () => {
  await new Promise(r => server.listen(0, r));
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
  const page = await ctx.newPage(), errors = [];
  const check = (ok, what) => { if (!ok) errors.push(what); };
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => { window.SD_TEST = 1; });
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.evaluate(() => {
    SD.state.save.c1 = { lead: 'kai', f: {}, deck: SD.starterDeck.map(id => ({ id, up: false })), pos: [16, 30] };
    SD.ch1m.enter = () => { window.__back = true; };
    SD.ch1m.mines('solo', () => { window.__done = 'won'; });
  });
  let maps = 0;
  for (let i = 0; i < 4000 && maps < 3; i++) {
    const ph = await page.evaluate(() => { const rd = document.querySelector('#run .rd'); return rd && document.querySelector('#dialog').hidden && document.querySelector('#panel').hidden ? rd.dataset.ph : null; });
    if (ph === 'map') { maps++; if (maps >= 3) break; }
    await page.evaluate(step); await page.waitForTimeout(30);
  }
  check(maps >= 3, 'never reached the third map');
  const state = () => page.evaluate(() => ({ ask: !!document.querySelector('#rd-confirm'), rd: !!document.querySelector('#run .rd'), back: !!window.__back, focus: document.activeElement && document.activeElement.className }));
  await page.click('#rd-leave');
  let s = await state();
  check(s.ask && /rdc-stay/.test(s.focus), 'Leave did not open the confirm with Keep going focused: ' + JSON.stringify(s));
  check(/starts again from floor 1/.test(await page.textContent('#rd-confirm')), 'the confirm does not say what leaving costs');
  await page.keyboard.press('Escape'); s = await state();
  check(!s.ask && s.rd && !s.back, 'Escape did not keep going: ' + JSON.stringify(s));
  await page.click('#rd-leave'); await page.waitForTimeout(350);
  await page.mouse.click(10, 10); s = await state();
  check(!s.ask && s.rd && !s.back, 'a tap outside did not keep going: ' + JSON.stringify(s));
  await page.click('#rd-leave'); await page.click('#rd-confirm .rdc-stay'); s = await state();
  check(!s.ask && s.rd && !s.back, 'Keep going did not keep going: ' + JSON.stringify(s));
  await page.click('#rd-leave'); await page.click('#rd-confirm .rdc-leave'); await page.waitForTimeout(500); s = await state();
  check(!s.ask && s.back, 'Leave the dungeon did not leave: ' + JSON.stringify(s));
  await browser.close(); server.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log('OK: Leave asks first; Escape, a tap outside and Keep going stay; Leave the dungeon leaves.');
})().catch(e => { console.error(e); process.exit(1); });
