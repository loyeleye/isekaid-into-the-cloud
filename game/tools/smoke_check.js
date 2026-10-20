// Headless smoke test: boots the game, walks the title and town, then plays one whole dungeon run by clicking
// whatever is on screen (cards, map nodes, answers, Continue) until the run ends and you are back in town.
// Fails on any page error or console error. Run from game/:  node tools/smoke_check.js
// With --win every fight is won outright (as the debug panel's Win button does), so the boss's win scene and a
// cleared dungeon get checked too.
// Needs Playwright (preinstalled in cloud sessions; PLAYWRIGHT_BROWSERS_PATH points at Chromium there).
// Out of date since chapter 1: New game now opens chapter 1's overworld instead of the name form and the town, so
// this stops at the name form. tools/ch1_check.js plays the whole chapter 1 demo instead.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
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
  const page = await browser.newPage({ viewport: { width: 420, height: 860 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });

  // Title, new game, name, town.
  await page.click('#t-start');
  await page.click('#t-new');
  await page.fill('#nm', 'Smoke');
  await page.click('#nm-ok');
  await page.waitForSelector('#town [data-go="gate"]');
  await page.click('#town [data-go="gate"]');
  await page.click('[data-ch="1"]');

  // One whole run: act on whatever is showing until the run is over and the town is back.
  const WIN = process.argv.includes('--win');
  const seen = new Set(), last = [];
  let steps = 0;
  for (; steps < 4000; steps++) {
    const what = await page.evaluate(WIN => {
      const vis = el => el && !el.hidden && el.offsetParent !== null;
      const $ = s => document.querySelector(s);
      const click = el => { el.click(); return true; };
      const tag = s => { window.__seen = s; return s; };
      if (!window.SD.state.save.run && vis($('#screen-hub')) && $('#panel').hidden && $('#dialog').hidden) return 'done';
      if (!$('#dialog').hidden) { $('#dialog').click(); document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); return 'dialog'; }
      const p = $('#panel');
      if (!p.hidden) {
        const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
        let x;
        if ((x = b('#q-said'))) return click(x) && 'said';
        if ((x = p.querySelector('#q-num')) && !x.value) { x.value = '100'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'num'; }
        if ((x = p.querySelector('#q-text')) && !x.value) { x.value = 'It hides the message until it is deleted, so make processing idempotent.'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'text'; }
        if ((x = b('#q-confirm, #q-next, #pm-ok'))) return click(x) && 'next';
        // The confusion compass after a miss: pick a question for the notebook, which enables Continue.
        if (p.querySelector('[data-p]') && !p.querySelector('[data-p].on')) return click(p.querySelector('[data-p]')) && 'compass';
        const conf = b('.conf-b button');
        if (!conf && (x = b('.opts .opt:not(.on):not(.struck)'))) return click(x) && 'opt';
        if (conf) return click(conf) && 'conf';
        // Card rewards (they come with a Skip button); shop and deck cards are left alone.
        if (p.querySelector('#skip') && (x = b('.card'))) return click(x) && 'card';
        if ((x = b('.primary'))) return click(x) && 'primary';
        if ((x = b('.opts .opt'))) return click(x) && 'opt2';
        if ((x = b('#skip, .ghost'))) return click(x) && 'ghost';
        return 'panel-wait';
      }
      const run = $('#run');
      if (vis(run)) {
        const end = $('#end-turn');
        if (end) {
          const C = SD.run.api.combat();
          if (WIN && C && !C.over) { C.sev = 0; SD.run.api.win(); return 'win'; }
          const c = [...run.querySelectorAll('.hand .card')].find(c => !c.classList.contains('dim'));
          if (c) return click(c) && 'play';
          return click(end) && 'end-turn';
        }
        const n = run.querySelector('.node.can');
        if (n) return click(n) && 'node:' + n.className.split(' ')[1];
        return 'run-wait';
      }
      return 'wait';
    }, WIN);
    last.push(what); if (last.length > 12) last.shift();
    seen.add(what.replace(/^node:.*/, 'node'));
    if (what.startsWith('node:')) seen.add(what);
    if (what === 'done') break;
    await page.waitForTimeout(what.endsWith('wait') ? 120 : 40);
  }
  const sv = await page.evaluate(() => ({ loop: SD.state.save.loop, runs: SD.state.save.stats.runs, fights: SD.state.save.stats.fights, wins: SD.state.save.stats.wins }));
  await page.screenshot({ path: path.join(process.env.SMOKE_OUT || '/tmp', 'smoke-end.png') });
  await browser.close(); server.close();
  console.log('steps', steps, 'save', JSON.stringify(sv));
  console.log('saw', [...seen].sort().join(' '));
  if (steps >= 4000) errors.push('the run never finished; last actions: ' + last.join(' '));
  if (sv.runs !== 1 || sv.loop !== 2) errors.push('expected one finished run');
  if (WIN && sv.wins !== 1) errors.push('expected the run to be won');
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log('OK: booted, played one run to the end, back in town, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
