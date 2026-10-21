// Balance runs for chapter 1's Deny Mines (Ladi, Oct 21: the first dungeon should clear 80% to 100% of the time).
// Each run is a solo party of four bots, your own seat included, played by js/raid.js's own bots (70% of questions
// right, as the balance assumes), from a fresh chapter 1 deck with AdministratorAccess. Chapter 1 restarts a floor for free on a
// wipe (counted). TAPES=n instead starts each run with n Seymour Tapes, as chapters 2 on do: a wipe with none left loses.
// Run from game/:  N=24 P=4 node tools/mines_balance.js   (N runs, P at a time)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TAPES = process.env.TAPES == null ? -1 : +process.env.TAPES, N = +process.env.N || 24, P = +process.env.P || 4, LEADS = ['mira', 'kai', 'seoyeon', 'dutch'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// One step: close whatever the page itself shows (dialogue, a question for your seat), and watch the run.
function step() {
  const $ = s => document.querySelector(s), vis = el => el && !el.hidden && el.offsetParent !== null;
  const T = (SD.test || {}).raid, G = T && T.G(), W = window.__bal = window.__bal || { wipes: [], last: -1, sla: [] };
  if (G && G.ph !== 'lobby') {
    if (!W.paced) { W.paced = 1; T.pace(0.05); }
    const me = G.players[T.me()];
    if (me && !me.bot) me.bot = true;
    if (W.last < 0) W.last = G.tapeN;
    if (G.tapeN > W.last) { W.wipes.push(G.fl); W.last = G.tapeN; }
    if (G.ph === 'map' && W.fl !== G.fl) { W.fl = G.fl; W.sla.push(G.sla); }
  }
  if (G && G.ph === 'over') return { done: true, won: false, lostOn: G.fl, wipes: W.wipes, sla: W.sla, rooms: G.rooms };
  if (window.__done) return { done: true, won: true, wipes: W.wipes, sla: W.sla.concat(G ? G.sla : 0), rooms: G ? G.rooms : 0 };
  if (W.wipes.length > 6) return { done: true, won: false, wipes: W.wipes, sla: W.sla, rooms: G ? G.rooms : 0 };
  if (!$('#dialog').hidden) { $('#dialog').click(); return {}; }
  const p = $('#panel');
  if (!p.hidden) {
    const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
    let x;
    if ((x = b('#q-said'))) x.click();
    else if ((x = b('#q-confirm, #q-next'))) x.click();
    else if ((x = b('.ps-n'))) x.click();
    else if ((x = [...p.querySelectorAll('.ps-tg')].find(g => !g.querySelector('.on')))) x.querySelector('button').click();
    else if ((x = b('.conf-b button'))) x.click();
    else if ((x = b('.opts .opt:not(.on):not(.struck)'))) x.click();
    else if ((x = b('.primary'))) x.click();
    return {};
  }
  const back = $('#run #rd-back');
  if (back) back.click();
  return {};
}

async function run(browser, url, i) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.SD_TEST = 1; });
  await page.goto(url);
  const lead = LEADS[i % 4];
  await page.evaluate(([lead, TAPES]) => {
    if (TAPES >= 0) SD.ch1mines.tapes = TAPES;
    SD.state.save.c1 = { lead, f: {}, deck: SD.starterDeck.concat(lead === 'mira' ? 'bedside' : lead === 'kai' ? 'unmaking' : lead === 'seoyeon' ? 'peakstyle' : 'masterkey', 'adminaccess').map(id => ({ id, up: false })), pos: [16, 30] };
    SD.ch1m.enter = () => {};
    SD.ch1m.mines('solo', () => { window.__done = 'won'; });
  }, [lead, TAPES]);
  const t0 = Date.now();
  let r = {};
  while (!r.done && Date.now() - t0 < 15 * 60 * 1000) { r = await page.evaluate(step); if (!r.done) await page.waitForTimeout(60); }
  await ctx.close();
  return Object.assign({ lead, secs: Math.round((Date.now() - t0) / 1000), errors }, r);
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const out = [];
  let next = 0;
  await Promise.all(Array.from({ length: P }, async () => {
    while (next < N) {
      const i = next++;
      const r = await run(browser, url, i);
      out.push(r);
      console.log(`run ${i + 1}: ${r.lead}, ${r.done ? (!r.won ? `lost on floor ${r.lostOn + 1}` : r.wipes.length ? `${r.wipes.length} wipe(s) on floor ${r.wipes.map(f => f + 1).join(', ')}` : 'clean clear') : 'timed out'}, SLA at floor ends ${(r.sla || []).join('/')}, ${r.secs}s${r.errors.length ? ', errors: ' + r.errors.join('; ') : ''}`);
    }
  }));
  await browser.close(); server.close();
  const won = out.filter(r => r.done && r.won).length, clean = out.filter(r => r.won && !r.wipes.length).length, lost = f => out.filter(r => r.done && !r.won && r.lostOn === f).length;
  console.log(`\n${TAPES < 0 ? 'Free restarts' : `With ${TAPES} tape(s)`}: ${won}/${out.length} won (${Math.round(won / out.length * 100)}%), ${clean} without a wipe. Lost on floor 1: ${lost(0)}, on floor 2: ${lost(1)}.`);
  if (out.some(r => r.errors.length || !r.done)) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
