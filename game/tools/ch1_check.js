// Headless playthrough of the chapter 1 demo: title, choosing a lead, the prologue, every camp scene, Freya's
// briefing, the road, Kyu's bridge, Brookfall's fight, the temple gate, the dungeon, Uptima, Kyu and the ending.
// The story's steps are taken through the world's own talk and door handlers (SD.ch1.debug.scene()); everything
// else (dialogue, questions, cards, map nodes) is clicked as it appears. Fails on any page error or console error.
// Run from game/:  node tools/ch1_check.js [mira|kai|seoyeon|dutch] [--win]   (--win wins every fight outright
// except Kyu's, whose steps are always played). SHOTS=dir saves screenshots of the main moments.
const { chromium } = require('playwright');
const ch1Step = require('./ch1_step');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEAD = ['mira', 'kai', 'seoyeon', 'dutch'].find(l => process.argv.includes(l)) || 'mira';
const WIN = process.argv.includes('--win');
const SHOTS = process.env.SHOTS;
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
  const page = await browser.newPage({ viewport: { width: Number(process.env.W || 420), height: Number(process.env.H || 860) } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  // The Borderlands engine's test hook (SD.test.raid, js/raid.js) for the Deny Mines.
  await page.addInitScript(() => { window.SD_TEST = 1; });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.click('#t-new');
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };

  const seen = new Set(), last = [], shotsTaken = new Set();
  let steps = 0;
  for (; steps < 30000; steps++) {
    const what = await page.evaluate(ch1Step, [WIN, LEAD]);
    last.push(what); if (last.length > 16) last.shift();
    if (process.env.TRACE && steps % 200 === 0) console.log(steps, last.slice(-6).join(' '));
    seen.add(what.replace(/^(node|dialog|play|scene|mines:play|mines:node|mines-wait|mines:back):.*/, '$1'));
    if (/^story:|^node:|^play:|^mines:node:|^mines:play:/.test(what)) seen.add(what);
    // Screenshots of the main moments, once each.
    // (Typing runs on a timer, so each shot waits for the line to finish and the portraits to load.)
    const key = { 'lead-wait': 'lead-select', 'climb:cart': 'coldstart', 'climb:locker': 'locker', 'climb:ledge': 'ledge', 'climb:lift': 'lift', 'climb:summit': 'summit', 'story:cart': 'camp', 'story:kyu': 'road', 'story:wren': 'brookfall', 'story:gate': 'temple' }[what]
      || (/^scene:/.test(what) && what.replace(':', '-'));
    if (key && !shotsTaken.has(key)) { shotsTaken.add(key); await page.waitForTimeout(1500); await shot(key); }
    if (/^play:(lockeddoor|uptimaboss|kyu)$/.test(what) && !shotsTaken.has(what)) { shotsTaken.add(what); await page.waitForTimeout(600); await shot(what.replace(':', '-')); }
    if (what === 'done') { await page.waitForTimeout(600); await shot('end'); break; }
    await page.waitForTimeout(/wait$/.test(what) ? 120 : 30);
  }
  const sv = await page.evaluate(() => ({ lead: SD.state.save.c1 && SD.state.save.c1.lead, flags: SD.state.save.c1 && SD.state.save.c1.f, level: SD.state.save.level, deck: SD.state.save.c1 && SD.state.save.c1.deck.length }));
  await browser.close(); server.close();
  console.log('steps', steps, JSON.stringify(sv));
  console.log('saw', [...seen].sort().join(' '));
  if (steps >= 30000) errors.push('the demo never finished; last actions: ' + last.join(' '));
  const need = ['m_board', 'm_locker', 'm_toll', 'm_ledge', 'm_mines', 'm_lift', 'm_op', 'm_log', 'm_rest1', 'm_rest2', 'm_rest3', 'summit', 'intro', 'cart', 'brief', 'board', 'tavern', 'kyu', 'shrine', 'guilty', 'gate', 'done'];
  const missing = need.filter(k => !sv.flags || !sv.flags[k]);
  if (missing.length) errors.push('story flags never set: ' + missing.join(', '));
  const scenes = ['wrongchair', 'notshopping', 'stew', 'salt', 'getup', 'suspect'].filter(k => !sv.flags || !sv.flags['s_' + k]);
  if (scenes.length) errors.push('camp scenes never played: ' + scenes.join(', '));
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`OK: played the chapter 1 demo as ${LEAD} from the title to the end card, no errors.`);
})().catch(e => { console.error(e); process.exit(1); });
