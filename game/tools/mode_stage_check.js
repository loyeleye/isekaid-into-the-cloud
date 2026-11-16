// Headless check of the full-screen mode stage (js/mode-stage.js; Ladi, Nov 16) at 375x667 and 1280x800: every mode
// started from the title's games carousel leaves the title for its own stage (its card loop as the setting, the top
// bar with Home, the mode's name and sound), its window fills the stage with no horizontal scroll, Home leaves the
// way the window's own ✕ does and brings the title back, and a mode can be started again after.
// Run from game/:  node tools/mode_stage_check.js     SHOTS=dir saves screenshots.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  for (const [w, h] of [[375, 667], [1280, 800]]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    await page.click('#t-start');
    await page.waitForSelector('.tg-card');
    const ids = await page.evaluate(() => SD.modes.list().map(m => m.id));
    check(ids.length >= 6, `${w}px: ${ids.length} modes registered`);
    for (const id of ids) {
      await page.evaluate(id => { const c = [...document.querySelectorAll('.tg-card')].find(c => c.dataset.game === id); c.querySelector('.tg-go').click(); }, id);
      await page.waitForSelector('#mode-bar:not([hidden])', { timeout: 5000 }).catch(() => {});
      // Measure once the window has finished popping in: mid-animation it is scaled, so it reads short and over the bar.
      await page.evaluate(() => { const w = document.querySelector('#panel:not([hidden]) .win'); return w && Promise.all(w.getAnimations().filter(a => a.effect && a.effect.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); });
      const s = await page.evaluate(() => {
        const st = document.querySelector('#mode-stage'), bar = document.querySelector('#mode-bar'), win = document.querySelector('#panel:not([hidden]) .win');
        const wr = win && win.getBoundingClientRect(), br = bar.getBoundingClientRect();
        const wide = [...document.querySelectorAll('#panel .win *, #mode-bar *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).length;
        const top = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
        return { active: SD.modeStage.active(), stage: !st.hidden, name: bar.querySelector('#ms-name').textContent,
          setting: getComputedStyle(st.querySelector('.ms-bg')).backgroundImage + ' ' + ((st.querySelector('.ms-bg img') || {}).currentSrc || ''), underBar: wr ? wr.top >= br.bottom - 1 : false,
          tall: wr ? wr.height / innerHeight : 0, wide, titleCovered: !document.querySelector('#screen-title').contains(top),
          home: !!document.querySelector('#ms-home') };
      });
      const name = await page.evaluate(id => SD.modes.get(id).name, id);
      check(s.active === id && s.stage && s.name === name, `${w}px ${id}: the stage opens with the mode's name in the top bar`);
      check(/cards\/\w+\.webp|stage\/[\w-]+\.webp/.test(s.setting), `${w}px ${id}: its own setting (card loop or painted plate) fills the screen (${s.setting.slice(-30)})`);
      check(s.underBar && s.tall > .5 && s.titleCovered, `${w}px ${id}: the window fills the stage under the bar and the title is gone (${Math.round(s.tall * 100)}% tall${s.underBar ? '' : ', overlaps the bar'}${s.titleCovered ? '' : ', title shows'})`);
      check(!s.wide, `${w}px ${id}: no horizontal scroll`);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `stage-${id}-${w}.png`) });
      await page.click('#ms-home');
      await page.waitForTimeout(700);
      const back = await page.evaluate(() => ({ active: SD.modeStage.active(), bar: document.querySelector('#mode-bar').hidden, panel: document.querySelector('#panel').hidden,
        cls: document.body.classList.contains('in-mode') }));
      check(!back.active && back.bar && back.panel && !back.cls, `${w}px ${id}: Home leaves and the title is back`);
    }
    // Mid-question, Home is Stop for now.
    await page.evaluate(() => { SD.modeStage.enter(SD.modes.get('ic')); SD.modes.ask((it => typeof it.q === 'string' ? SD.exam.find(it.q) : it.q)(SD.modes.pick({ n: 1 }).items[0]), { onStop: () => { window.__stopped = 1; SD.ui.closePanel(); } }); });
    await page.waitForSelector('#md-stop');
    await page.click('#ms-home');
    await page.waitForTimeout(700);
    check(await page.evaluate(() => window.__stopped === 1 && !SD.modeStage.active()), `${w}px: mid-question, Home is Stop for now and leaves`);
    check(!errors.length, `${w}px: no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
    await page.close();
  }
  await browser.close(); server.close();
  console.log(fails.length ? `${fails.length} FAILED` : 'all passed');
  process.exit(fails.length ? 1 : 0);
})();
