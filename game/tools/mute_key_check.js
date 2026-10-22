#!/usr/bin/env node
// Checks the mute key (js/main.js, js/audio.js): V mutes everything, anywhere, quizzes and dialogue included, and
// pressed again brings back what was on before (music only, sound effects only, or both). If everything was already
// muted, V turns it all on. Typing v in a text field just types. Run from game/:  node tools/mute_key_check.js
// Needs Playwright (preinstalled in cloud sessions; PLAYWRIGHT_BROWSERS_PATH points at Chromium there).
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
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  // Voice lines are <audio> elements of their own; keep hold of them to see whether V silences one mid-line.
  await page.addInitScript(() => { const A = window.Audio; window.__vo = []; window.Audio = function (src) { const e = new A(src); if (/\/vo\//.test(src)) window.__vo.push(e); return e; }; });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let fail = 0;
  const check = (ok, msg) => { if (ok) console.log('ok   ' + msg); else { fail++; console.log('FAIL ' + msg); } };
  const snd = () => page.evaluate(() => (SD.audio.prefs.music ? 'M' : '-') + (SD.audio.prefs.sfx ? 'S' : '-'));
  const setSnd = (music, sfx) => page.evaluate(([m, s]) => { SD.audio.set('music', m); SD.audio.set('sfx', s); }, [music, sfx]);
  const boot = async () => { await page.waitForFunction(() => window.SD && SD.main && SD.audio); };

  await page.goto(url); await boot();
  await page.click('#t-start');

  await setSnd(true, true);
  await page.keyboard.press('v');
  check(await snd() === '--', 'V mutes everything');
  check(await page.textContent('#t-snd') === '🔇', 'the title speaker button shows it');
  await page.keyboard.press('Shift+V');
  check(await snd() === 'MS', 'V again (Shift+V too) brings both back');

  await setSnd(true, false);
  await page.keyboard.press('v'); check(await snd() === '--', 'music only: V mutes it');
  await page.keyboard.press('v'); check(await snd() === 'M-', 'and V brings back music only');
  await setSnd(false, true);
  await page.keyboard.press('v'); await page.keyboard.press('v');
  check(await snd() === '-S', 'sound effects only: V twice brings back sound effects only');

  await setSnd(false, false);
  await page.keyboard.press('v'); check(await snd() === 'MS', 'already all muted: V turns everything on');
  await setSnd(true, false);
  await page.keyboard.press('v'); await setSnd(false, false);
  await page.keyboard.press('v'); check(await snd() === 'MS', 'muting by hand after V: V turns everything on, not the old setting');

  await setSnd(false, true); await page.keyboard.press('v');
  await page.reload(); await boot();
  await page.keyboard.press('v'); check(await snd() === '-S', 'what V brings back survives a reload');

  await setSnd(true, true);
  await page.evaluate(() => { SD.quiz.ask(SD.questions.find(q => q.type === 'mc')); });
  await page.waitForFunction(() => !document.querySelector('#panel').hidden);
  await page.keyboard.press('v');
  check(await snd() === '--', 'V mutes with a quiz question open');
  await page.keyboard.press('v');
  await page.evaluate(() => SD.ui.closePanel());

  await page.evaluate(() => { SD.ui.dialog([{ s: 'narr', t: 'Testing.' }]); });
  await page.waitForFunction(() => !document.querySelector('#dialog').hidden);
  await page.keyboard.press('v');
  check(await snd() === '--', 'V mutes while someone is talking');
  await page.keyboard.press('v');
  for (let i = 0; i < 5 && await page.evaluate(() => !document.querySelector('#dialog').hidden); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(150); }

  await page.evaluate(() => SD.audio.voice('bram-kettle'));
  const vo = () => page.evaluate(() => { const e = __vo[__vo.length - 1]; return e && !e.paused && !e.muted; });
  check(await vo(), 'a voice line plays');
  await page.keyboard.press('v');
  check(!await vo(), 'V silences a voice line already playing');
  await page.keyboard.press('v');
  check(await vo(), 'and V again brings it back');
  await page.evaluate(() => SD.audio.set('sfx', false));
  check(!await vo(), 'so does switching sound effects off by hand');
  await page.evaluate(() => { SD.audio.set('sfx', true); SD.audio.voice(null); });

  await page.evaluate(() => SD.ui.panel('<input id="t-in"><textarea id="t-ta"></textarea><input type="checkbox" id="t-cb">', { title: 'TEST' }));
  await page.focus('#t-in'); await page.keyboard.press('v');
  check(await page.inputValue('#t-in') === 'v' && await snd() === 'MS', 'typing v in a text field types, and mutes nothing');
  await page.focus('#t-ta'); await page.keyboard.press('v');
  check(await page.inputValue('#t-ta') === 'v' && await snd() === 'MS', 'same in a typed answer box');
  await page.focus('#t-cb'); await page.keyboard.press('v');
  check(await snd() === '--', 'a focused checkbox does not swallow V');
  await page.keyboard.press('v');
  await page.evaluate(() => { document.activeElement.blur(); SD.ui.closePanel(); });

  await page.keyboard.press('Control+v');
  check(await snd() === 'MS', 'Ctrl+V (paste) is left alone');

  await page.evaluate(() => SD.main.menu());
  await page.keyboard.press('v');
  check(/Music: <b>Off/.test(await page.innerHTML('#panel')), 'the open menu updates its Music line');
  await page.keyboard.press('v');

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fail ? `${fail} failed` : 'all passed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
