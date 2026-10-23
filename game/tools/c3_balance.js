// Difficulty runs for chapter 3's expeditions (conventions, "Difficulty simulations"): N bot runs of each, the clear
// rate per floor and overall. Each run is a solo party of four bots, your own seat included, played by js/raid.js's
// own bots (70% of questions right), from the standalone chapter 3 deck, with the camp's upgrades a player would have
// by then (none for the Cold Stores; Hana's Sum, Wen's Warm Oven, A Day a Year and Aurelian's Gauntlet after). Story
// mode restarts a floor after a wipe, so the run goes on and counts wipes per floor: a clear is every floor with none,
// which is the win rate with no tapes.
// Run from game/:  N=12 P=4 EXP=cold,abyss,cathedral,regent node tools/c3_balance.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const N = +process.env.N || 12, P = +process.env.P || 4, LEADS = ['mira', 'kai', 'seoyeon', 'dutch'];
const EXPS = (process.env.EXP || 'cold,abyss,cathedral,regent').split(',');
const DEV = { cold: {}, abyss: { sum: true, oven: true }, cathedral: { sum: true, oven: true, dayayear: true, gauntlet: true }, regent: { sum: true, oven: true, dayayear: true, gauntlet: true } };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// One step: close whatever the page itself shows (dialogue, a question, the gallery's proofs), and watch the run.
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
  if (window.__done) return { done: true, won: true, wipes: W.wipes, sla: W.sla.concat(G ? G.sla : 0), rooms: G ? G.rooms : 0 };
  if (W.wipes.length > 12) return { done: true, won: false, wipes: W.wipes, sla: W.sla, rooms: G ? G.rooms : 0 };
  if (!$('#dialog').hidden) { $('#dialog').click(); return {}; }
  const p = $('#panel');
  if (!p.hidden) {
    const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
    let x;
    if ((x = p.querySelector('#q-num')) && !x.value) { x.value = '24'; x.dispatchEvent(new Event('input', { bubbles: true })); }
    else if ((x = b('#q-said'))) x.click();
    else if ((x = b('#q-confirm, #q-next'))) x.click();
    else if ((x = b('.ps-n'))) x.click();
    else if ((x = [...p.querySelectorAll('.ps-tg')].find(g => !g.querySelector('.on')))) x.querySelector('button').click();
    else if ((x = b('.conf-b button'))) x.click();
    else if ((x = b('.g2-predict [data-p]'))) x.click();
    else if ((x = b('.opts .opt:not(.on):not(.struck)'))) x.click();
    else if ((x = b('.primary'))) x.click();
    return {};
  }
  const back = $('#run #rd-back');
  if (back) back.click();
  return {};
}

async function run(browser, url, exp, i) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.SD_TEST = 1; });
  await page.goto(url);
  const lead = LEADS[i % 4];
  // ACC: how often the bots answer right (SD.raid.botAcc, default 0.7); DMG: every enemy's load (SD.raid.dmgX).
  await page.evaluate(([a, d]) => { if (a != null) SD.raid.botAcc = a; if (d != null) SD.raid.dmgX = d; }, [process.env.ACC != null ? +process.env.ACC : null, process.env.DMG != null ? +process.env.DMG : null]);
  await page.evaluate(([lead, exp, dev]) => {
    SD.state.save.c1 = { lead, f: { done: true }, deck: SD.starterDeck.map(id => ({ id, up: false })), pos: null };
    SD.state.save.c3 = { lead, f: {}, dev, w: { x: { cold: true }, pos: null, pages: [] } };
    SD.c3raid.play(exp, 'solo').then(r => { window.__done = r.won ? 'won' : 'lost'; });
  }, [lead, exp, DEV[exp]]);
  const t0 = Date.now();
  let r = {};
  while (!r.done && Date.now() - t0 < 20 * 60 * 1000) { r = await page.evaluate(step); if (!r.done) await page.waitForTimeout(60); }
  await ctx.close();
  return Object.assign({ lead, secs: Math.round((Date.now() - t0) / 1000), errors }, r);
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  let bad = false;
  for (const exp of EXPS) {
    const out = [];
    let next = 0;
    await Promise.all(Array.from({ length: P }, async () => {
      while (next < N) {
        const i = next++;
        const r = await run(browser, url, exp, i);
        out.push(r);
        console.log(`${exp} run ${i + 1}: ${r.lead}, ${r.done ? (r.wipes.length ? `${r.wipes.length} wipe(s) on floor ${r.wipes.map(f => f + 1).join(', ')}` : 'clean clear') : 'timed out'}, SLA at floor ends ${(r.sla || []).join('/')}, ${r.secs}s${r.errors.length ? ', errors: ' + r.errors.join('; ') : ''}`);
      }
    }));
    const floors = Math.max(...out.map(r => (r.sla || []).length - 1), 1);
    const clean = out.filter(r => r.done && !r.wipes.length).length;
    const per = Array.from({ length: floors }, (_, f) => `floor ${f + 1}: ${Math.round(out.filter(r => !(r.wipes || []).includes(f)).length / out.length * 100)}% without a wipe`);
    console.log(`\n${exp}: ${clean}/${out.length} clean clears (${Math.round(clean / out.length * 100)}%). ${per.join(', ')}.\n`);
    if (out.some(r => r.errors.length || !r.done)) bad = true;
  }
  await browser.close(); server.close();
  if (bad) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
