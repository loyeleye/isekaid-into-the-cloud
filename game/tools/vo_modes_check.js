#!/usr/bin/env node
// Checks the title games' voice lines (js/vo-modes.js; Ladi, Nov 16).
//   - Every mapped line's text is still in its game's source, word for word (a changed line goes quiet, so it's listed).
//   - Every file name is <who>-mg-<game>-<key>, unique, and either recorded (assets/audio/vo/<file>.mp3) or listed
//     as waiting to be recorded. STRICT=1 fails on any unrecorded line.
//   - In a browser, with stand-in audio for the unrecorded files: starting Look-Alike Cup and Incident Commander from
//     the title voices the host's opening line; a re-render that keeps the line doesn't replay it; closing the panel
//     stops it; sound effects off means no voice; a 404 goes quiet with no page error.
// Run from game/:  node tools/vo_modes_check.js
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
global.SD = {};
require(path.join(ROOT, 'js/vo-modes.js'));
const LINES = SD.voModes.LINES;
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };

const SRC = { duel: ['js/mode-duel.js', 'js/mode-table.js'], ic: 'js/mode-ic.js', pop: ['js/mode-pop.js', 'js/mode-pop-formats.js', 'js/mode-pop-rooms.js'], hunt: 'js/hunt.js', draft: 'js/draft.js', sprint: 'js/mode-sprint.js', drill: ['js/mode-drill.js', 'js/drill-core.js'], icl: ['js/ic-live.js', 'js/ic-live-core.js'], mp: 'js/raid.js', reno: 'js/mode-reno.js' };
const text = {};
Object.entries(SRC).forEach(([k, f]) => { text[k] = [].concat(f).map(x => fs.readFileSync(path.join(ROOT, x), 'utf8')).join('\n').replace(/\\'/g, '\'').replace(/\\"/g, '"'); });
const files = Object.values(LINES), keys = Object.keys(LINES);
check(new Set(files).size === files.length, `${files.length} lines, every file name unique`);
const stale = [], badName = [], unrec = [];
keys.forEach(k => {
  const f = LINES[k], m = /^([a-z]+)-mg-([a-z]+)-[a-z0-9-]+$/.exec(f), who = k.split('|')[0], t = k.slice(who.length + 1);
  if (!m || m[1] !== who || !SRC[m[2]]) { badName.push(f); return; }
  if (!text[m[2]].includes(t)) stale.push(`${f}: ${t}`);
  if (!fs.existsSync(path.join(ROOT, 'assets/audio/vo', f + '.mp3'))) unrec.push(f);
});
check(!badName.length, `every file is named <who>-mg-<game>-<key> ${badName.join(', ')}`);
check(!stale.length, 'every line is still in its game, word for word' + (stale.length ? '\n     ' + stale.join('\n     ') : ''));
const byWho = {};
unrec.forEach(f => { const w = f.split('-')[0]; byWho[w] = (byWho[w] || 0) + 1; });
console.log(`info ${files.length - unrec.length} of ${files.length} recorded` + (unrec.length ? `; waiting: ${Object.entries(byWho).map(([w, n]) => `${w} ${n}`).join(', ')}` : ''));
if (process.env.STRICT) check(!unrec.length, 'every line is recorded');

// ---- In the browser ----
const STAND_IN = fs.readdirSync(path.join(ROOT, 'assets/audio/vo')).find(f => /^kagemaru-.*\.mp3$/.test(f));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let file = path.join(ROOT, url.replace(/\/$/, '/index.html'));
  // Unrecorded title-game lines get a stand-in, except the one the check keeps missing on purpose.
  if (/\/assets\/audio\/vo\/[a-z]+-mg-.*\.mp3$/.test(url) && !fs.existsSync(file) && !/uptima-mg-ic-open/.test(url)) file = path.join(ROOT, 'assets/audio/vo', STAND_IN);
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  const { chromium } = require('playwright');
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 375, height: 740 } });
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  // Keep hold of every voice <audio>, to see what was asked to play and whether it was stopped.
  await page.addInitScript(() => {
    const A = window.Audio; window.__vo = [];
    window.Audio = function (src) { const e = new A(src); if (/\/vo\//.test(src)) window.__vo.push(e); return e; };
  });
  await page.goto(base);
  await page.waitForFunction(() => window.SD && SD.main && SD.voModes && document.querySelector('#t-start'), null, { timeout: 30000 });
  await page.evaluate(() => { const s = SD.state.save; s.flags.prologue = true; s.c1 = s.c1 || {}; s.c1.lead = s.c1.lead || 'kai'; s.todaySkip = true; SD.state.persist(); SD.audio.set('sfx', true); });
  await page.click('#t-start');
  await page.waitForSelector('.tg-card', { timeout: 5000 }).catch(() => {});
  const vo = () => page.evaluate(() => window.__vo.map(e => [e.src.split('/').pop().replace('.mp3', ''), e.paused]));
  const start = id => page.evaluate(i => { SD.ui.closePanel(); const m = SD.modes.list().find(x => x.id === i); m.start({}); }, id);

  // Look-Alike Cup: Kagemaru's walk-up line.
  await start('duel');
  await page.waitForTimeout(700);
  let v = await vo();
  const duelKey = await page.evaluate(() => { const el = document.querySelector('#panel [data-vo]'); return el && el.getAttribute('data-vo'); });
  check(!!duelKey && duelKey.startsWith('kagemaru|'), `Look-Alike Cup marks Kagemaru's line (${duelKey && duelKey.slice(0, 50)}…)`);
  check(v.length >= 1 && v[v.length - 1][0] === LINES[duelKey], `and voices it (${v.map(x => x[0]).join(', ')})`);
  // Re-render the same panel: no replay.
  const n0 = v.length;
  await page.evaluate(() => { const el = document.querySelector('#panel [data-vo]'); const c = el.cloneNode(true); el.replaceWith(c); });
  await page.waitForTimeout(300);
  check((await vo()).length === n0, 'a re-render that keeps the line doesn\'t replay it');
  // Closing stops it.
  await page.evaluate(() => SD.ui.closePanel());
  await page.waitForTimeout(300);
  v = await vo();
  check(v[v.length - 1][1] === true, 'closing the panel stops the line');

  // Incident Commander: its opening line has no file here (404), so it goes quiet with no error.
  await start('ic');
  await page.waitForTimeout(900);
  v = await vo();
  const icKey = await page.evaluate(() => { const el = document.querySelector('[data-vo^="uptima|"]'); return el && el.getAttribute('data-vo'); });
  check(!!icKey, `Incident Commander marks Uptima's line (${icKey && icKey.slice(0, 50)}…)`);
  check(v.some(x => x[0] === LINES[icKey]), 'and tries to voice it');
  check(!errs.length, 'a missing recording raises no page error ' + errs.join(' | '));

  // Sound effects off: nothing plays.
  await page.evaluate(() => { SD.ui.closePanel(); SD.audio.set('sfx', false); });
  const n1 = (await vo()).length;
  await start('duel');
  await page.waitForTimeout(600);
  check((await vo()).length === n1, 'with sound effects off, no voice');

  // Exam Sprint's gate: Lexi's spoken part only (no stage directions).
  await page.evaluate(() => { SD.ui.closePanel(); SD.audio.set('sfx', true); });
  await start('sprint');
  await page.waitForTimeout(700);
  const sp = await page.evaluate(() => [...document.querySelectorAll('.sp-host [data-vo]')].map(e => e.getAttribute('data-vo')));
  check(sp.length && sp.every(k => SD.voModes.LINES[k]), `Exam Sprint's gate lines are all mapped (${sp.length})`);

  check(!errs.length, 'no page errors ' + errs.join(' | '));
  await browser.close(); server.close();
  console.log(fails ? `${fails} failed` : 'all passed');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
