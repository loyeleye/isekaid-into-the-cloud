// Headless check of the debug code (js/debug-gate.js) on a "public" host (127.0.0.2, which the gate doesn't count as
// local): the published demo (index.html?vector&ch2&demo) shows no 🐞 Debug button and no Debug start switch in the menu;
// five taps on the title's foot line open the code box, a wrong code is refused, and the right one reloads with the
// button showing; "Hide the debug tools" hides it again; ?debug=<code> in the link unlocks it too; a bare ?debug does
// nothing there; and on localhost the button is always there.
// Run from game/:  node tools/debug_gate_check.js   (DEBUG_CODE=nnnn to give the code; otherwise it's found from the gate's seal)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
// The code isn't written down in the repo: find the four digits that match the seal in js/debug-gate.js.
const GATE = fs.readFileSync(path.join(ROOT, 'js/debug-gate.js'), 'utf8');
const SALT = /for \(const ch of '([^']+)' \+ c\)/.exec(GATE)[1], SEAL = /seal\(c\) === '([^']+)'/.exec(GATE)[1];
const seal = c => { let x = 0x811c9dc5; for (const ch of SALT + c) { x ^= ch.charCodeAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(36); };
const CODE = process.env.DEBUG_CODE || [...Array(10000).keys()].map(n => String(n).padStart(4, '0')).find(c => seal(c) === SEAL);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const fail = [];
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fail.push(msg); };

(async () => {
  await new Promise(r => server.listen(0, '0.0.0.0', r));
  const port = server.address().port;
  const pub = q => `http://127.0.0.2:${port}/index.html?vector&ch2&demo${q || ''}`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const title = async () => {
    await page.waitForSelector('#t-start, #ds-new', { timeout: 30000 });
    if (await page.$('#t-start')) await page.click('#t-start');
    await page.waitForSelector('#ds-new', { timeout: 10000 });
    await page.waitForTimeout(300);
  };
  const bug = () => page.evaluate(() => !!document.querySelector('#ds-dbg'));
  const menuDebug = () => page.evaluate(() => { SD.main.menu(); const has = !!document.querySelector('#m-debug'); SD.ui.closePanel(); return has; });

  await page.goto(pub()); await title();
  ok(!(await bug()), 'public host: no Debug button before the code');
  ok(!(await menuDebug()), 'public host: no Debug start switch in the menu before the code');
  for (let i = 0; i < 5; i++) await page.click('.t-foot');
  ok(await page.evaluate(() => !!document.querySelector('#dg-code')), 'five taps on the foot line open the code box');
  await page.fill('#dg-code', '0000'); await page.click('#dg-form button[type=submit]');
  ok(/isn't it/.test(await page.textContent('#dg-msg')), 'a wrong code is refused');
  await page.fill('#dg-code', CODE);
  await Promise.all([page.waitForNavigation({ timeout: 10000 }), page.click('#dg-form button[type=submit]')]);
  await title();
  ok(await bug(), 'the right code reloads with the Debug button');
  ok(await menuDebug(), 'and the Debug start switch is in the menu');
  ok(await page.evaluate(() => !SD.debug), 'unlocking alone keeps the real save (debug start stays off)');
  await page.goto(pub()); await title();
  ok(await bug(), 'the code is remembered on the next visit');
  await page.click('#ds-dbg');
  ok(await page.evaluate(() => !!document.querySelector('#ds-lock')), 'the Debug menu offers Hide the debug tools');
  await Promise.all([page.waitForNavigation({ timeout: 10000 }), page.click('#ds-lock')]);
  await title();
  ok(!(await bug()), 'Hide the debug tools hides the button again');
  await page.goto(pub('&debug')); await title();
  ok(!(await bug()) && await page.evaluate(() => !SD.debug), 'a bare ?debug does nothing on a public host');
  await page.goto(pub('&debug=' + CODE)); await title();
  ok(await bug(), '?debug=<code> in the link unlocks the tools');
  await page.goto(pub('&debug=off')); await title();
  ok(!(await bug()), '?debug=off forgets the code');
  await page.goto(`http://localhost:${port}/index.html?vector&ch2&demo`); await title();
  ok(await bug(), 'localhost: the Debug button is always there');
  ok(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));

  await browser.close(); server.close();
  console.log(fail.length ? `\n${fail.length} failed` : '\nall passed');
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
