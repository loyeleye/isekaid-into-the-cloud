// Simulates every game mode with fixed policies before merging (design doc, build spec v4, "Simulate before merging").
// Each mode registered with a sim(policy, rng) hook (js/modes.js) plays whole sessions on its real state machine, with
// answers drawn by SD.modes.simAnswer: right with chance p, committed with a fixed confidence.
//   policies   conf: guess, think, sure (fixed) and honest (the button that pays best at p, for reference)
//              route: near or far (each mode's fixed route or detour policy)
//   accuracy   p = 0.45, 0.6 and 0.8
// It fails when one fixed conf or route policy has the best mean points at every accuracy (a calculation, not a choice),
// when any run goes over 20 minutes, or when map time is over 20% of a run.
// Time model: SD.modes.SIM_Q_SECS per question (reading, answer and verdict), SD.modes.SIM_MAP_SECS per map action.
// Run from game/:  node tools/modes_sim.js [runs per cell, default 40]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const RUNS = +process.argv[2] || 40;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };

(async () => {
  await new Promise(r => server.listen(0, r));
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.click('#t-start');
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.persist(); });

  const modes = await page.evaluate(() => SD.modes.list().filter(m => m.sim).map(m => m.id));
  check(modes.length > 0, 'at least one mode has a simulator hook (' + modes.join(', ') + ')');
  const P = [0.45, 0.6, 0.8], CONF = ['guess', 'think', 'sure'], ROUTE = ['near', 'far'];
  for (const id of modes) {
    const out = await page.evaluate(async ([id, P, CONF, ROUTE, RUNS]) => {
      const m = SD.modes.get(id);
      let seed = 12345;
      const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
      const cell = async policy => {
        const rs = [];
        for (let k = 0; k < RUNS; k++) rs.push(await m.sim(policy, rng));
        const mean = f => rs.reduce((a, r) => a + f(r), 0) / rs.length;
        return { pts: mean(r => r.pts), minutes: Math.max(...rs.map(r => r.minutes)), mapShare: Math.max(...rs.map(r => r.mapShare)), zero: mean(r => (r.zero ? 1 : 0)), qs: mean(r => r.questions) };
      };
      const res = { conf: {}, route: {}, honest: {} };
      for (const p of P) {
        res.conf[p] = {}; res.route[p] = {};
        for (const c of CONF) res.conf[p][c] = await cell({ p, conf: c, route: 'near' });
        for (const r of ROUTE) res.route[p][r] = await cell({ p, conf: 'honest', route: r });
        res.honest[p] = await cell({ p, conf: 'honest', route: 'near', picks: true });
      }
      return res;
    }, [id, P, CONF, ROUTE, RUNS]);
    console.log(`\n${id}: mean points per session (${RUNS} runs a cell)`);
    console.log('  p     ' + CONF.map(c => c.padStart(8)).join('') + '  honest' + ROUTE.map(r => ('  ' + r).padStart(8)).join('') + '  zero%  questions');
    for (const p of P) {
      const row = CONF.map(c => out.conf[p][c].pts.toFixed(1).padStart(8)).join('') + out.honest[p].pts.toFixed(1).padStart(8) + ROUTE.map(r => out.route[p][r].pts.toFixed(1).padStart(8)).join('');
      console.log(`  ${p.toFixed(2)}  ${row}  ${(out.route[p].near.zero * 100).toFixed(0).padStart(4)}%  ${out.honest[p].qs.toFixed(1)}`);
    }
    // A fixed policy that is best (by more than a tie) at every accuracy is a calculation, not a choice.
    const winner = (table, keys) => {
      const best = P.map(p => { const v = keys.map(k => table[p][k].pts), top = Math.max(...v); return keys.filter((k, i) => top - v[i] < 0.05 * Math.max(1, Math.abs(top))); });
      return keys.find(k => best.every(b => b.length === 1 && b[0] === k)) || null;
    };
    const wc = winner(out.conf, CONF), wr = winner(out.route, ROUTE);
    check(!wc, `${id}: no fixed confidence wins at every accuracy${wc ? ' (' + wc + ' does)' : ''}`);
    check(!wr, `${id}: no fixed route wins at every accuracy${wr ? ' (' + wr + ' does)' : ''}`);
    const all = P.flatMap(p => CONF.map(c => out.conf[p][c]).concat(ROUTE.map(r => out.route[p][r]), [out.honest[p]]));
    const maxMin = Math.max(...all.map(x => x.minutes)), maxMap = Math.max(...all.map(x => x.mapShare));
    check(maxMin <= 20, `${id}: every run fits in 20 minutes (longest ${maxMin.toFixed(1)})`);
    check(maxMap <= 0.2, `${id}: map time is at most 20% of a run (highest ${(maxMap * 100).toFixed(0)}%)`);
  }

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page errors');
  if (fails.length) { console.error(`\n${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('\nOK: every mode passes the policy simulation.');
})().catch(e => { console.error(e); process.exit(1); });
