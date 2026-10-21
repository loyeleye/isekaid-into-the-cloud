// Balance runs for chapter 2's Expedition I, the Sorting Floors (js/vec-ch2.js), modelled on tools/mines_balance.js.
// Each run is a solo party of four bots, your own seat included, played by js/raid.js's own bots (70% of questions
// right), from the chapter 2 deck with the act 1 world's three card upgrades and the Unread Letter curse (it lifts at
// Coo's quest, after the climb). Tapes are off: a wipe sends the party back to the start of its floor and the run goes
// on, counting wipes. A clear is both floors with no wipe.
// Run from game/:  N=24 P=4 node tools/c2_balance.js   (N runs, P at a time)
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const N = +process.env.N || 24, P = +process.env.P || 4, LEADS = ['mira', 'kai', 'seoyeon', 'dutch'];
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
  if (window.__done === 'won') return { done: true, won: true, wipes: W.wipes, sla: W.sla.concat(G ? G.sla : 0), rooms: G ? G.rooms : 0 };
  if (W.wipes.length > 6) return { done: true, won: false, wipes: W.wipes, sla: W.sla, rooms: G ? G.rooms : 0 };
  if (!$('#dialog').hidden) { $('#dialog').click(); return {}; }
  const p = $('#panel');
  if (!p.hidden) {
    const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
    let x;
    if ((x = p.querySelector('#q-num')) && !x.value) { x.value = '180'; x.dispatchEvent(new Event('input', { bubbles: true })); return {}; }
    if ((x = p.querySelector('#q-text')) && !x.value) { x.value = 'The queue hides the letter while one consumer works on it.'; x.dispatchEvent(new Event('input', { bubbles: true })); return {}; }
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
  page.on('console', m => { if (/warn|error/.test(m.type()) && !/Failed to load resource|AudioContext/.test(m.text())) errors.push(m.type() + ': ' + m.text().slice(0, 200)); });
  await page.addInitScript(() => { window.SD_TEST = 1; });
  await page.goto(url);
  await page.waitForFunction(() => window.SD && SD.vec && SD.vec.ch2 && SD.vec.ch2.sorting);
  const lead = LEADS[i % 4];
  await page.evaluate(lead => {
    const S = SD.state;
    S.save.c1 = { lead, f: { intro: true, cart: true, brief: true, done: true }, deck: SD.starterDeck.map(id => ({ id, up: false })), pos: null };
    S.save.flags.prologue = true; S.save.flags.ch1 = true;
    S.save.c2 = { f: { act1: true, cold: true }, dev: {}, bonus: { vistimeout: true, pattern: true, idem: true }, w: { x: {}, pos: [92, 21], letters: [], given: [], lens: true } };
    const play = SD.raid.play;
    SD.raid.play = (root, hub, code, o) => { delete o.tapes; return play(root, hub, code, o); };
    SD.vec.ch2.sorting('solo').then(won => { window.__done = won ? 'won' : 'lost'; });
  }, lead);
  const t0 = Date.now();
  let r = {};
  let crashed = false; page.on('crash', () => { crashed = true; });
  try {
    while (!r.done && Date.now() - t0 < (+process.env.MAXS || 900) * 1000) { r = await page.evaluate(step); if (!r.done) await page.waitForTimeout(60); }
  } catch (e) { if (!crashed) throw e; await ctx.close().catch(() => {}); return { lead, crashed: true, secs: Math.round((Date.now() - t0) / 1000), errors: [] }; }
  if (!r.done) r.stuck = await page.evaluate(() => { const T = SD.test.raid, G = T && T.G(), p = document.querySelector('#panel'); return JSON.stringify({ ph: G && G.ph, fl: G && G.fl, room: G && G.room && G.room.t, qs: G && G.qs && G.qs.length, panel: !p.hidden && p.textContent.slice(0, 160), dialog: !(document.querySelector('#dialog') || {}).hidden, vn: !!document.querySelector('#vn:not([hidden])'), done: window.__done || null, shown: (document.querySelector('.screen:not([hidden])') || {}).id, runTxt: (document.querySelector('#run') || {}).textContent.slice(0, 160), run: (document.querySelector('#run .rd') || {}).dataset }); }).catch(e => String(e));
  await ctx.close();
  return Object.assign({ lead, secs: Math.round((Date.now() - t0) / 1000), errors }, r);
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch2`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const out = [];
  let next = 0;
  await Promise.all(Array.from({ length: P }, async () => {
    while (next < N) {
      const i = next++;
      const r = await run(browser, url, i);
      out.push(r);
      console.log(`run ${i + 1}: ${r.lead}, ${r.crashed ? 'the browser tab crashed (not counted)' : r.done ? (r.wipes.length ? `${r.wipes.length} wipe(s) on floor ${r.wipes.map(f => f + 1).join(', ')}` : 'clean clear') : 'timed out'}, SLA at floor ends ${(r.sla || []).join('/')}, ${r.secs}s${r.errors.length ? ', errors: ' + r.errors.join('; ') : ''}${r.stuck ? ', stuck at ' + r.stuck : ''}`);
    }
  }));
  await browser.close(); server.close();
  const crashes = out.filter(r => r.crashed).length;
  out.splice(0, out.length, ...out.filter(r => !r.crashed));
  if (crashes) console.log(`${crashes} run(s) lost to a browser tab crash, not counted.`);
  const clean = out.filter(r => r.done && !r.wipes.length).length, f1 = out.filter(r => (r.wipes || []).includes(0)).length, f2 = out.filter(r => (r.wipes || []).includes(1)).length;
  console.log(`\n${clean}/${out.length} clean clears (${Math.round(clean / out.length * 100)}%). Runs with a wipe on floor 1: ${f1}, on floor 2: ${f2}.`);
  if (out.some(r => r.errors.length || !r.done)) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
