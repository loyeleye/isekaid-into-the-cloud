// Simulates The Lost and Found (js/mode-pop.js) on its real state machine, the storyboard v7 pass conditions:
//   - the Hunch doesn't check out on about 43%, 65% and 90% of nights at 45%, 60% and 80% (each within 20 points)
//   - stake none loses to stake all on the night score at 80%, and is within 10% of it at 60%
//   - stake all on Sure loses points at 45%
//   - no fixed route (claims first, other rooms first) wins the night score at every accuracy
//   - honest play at 60% retreats on at most 30% of nights; every night fits in 20 minutes
// Nights 2, 3 and 4 (js/mode-pop-rooms.js: keys and vaults, the Big Claim and the Postmortem, the cat, modifiers
// and home turf) are run too: each must fit in 20 minutes, keep stake none behind stake all at 80%, keep stake all on
// Sure behind honest confidence at 45%, keep honest play at 60% retreating on at most 30% of nights, and not let any
// fixed route (claims first, other rooms first, the same homeland every time) win at every accuracy. The route test
// is on nights 1 to 4 pooled (night 1's own line is reported). The 'plan' route reads the map (keys to vaults, checks
// kept for the Big Claim, the cat caught) and is what hands out relics, the Postmortem and Big Claim clears.
// Run from game/:  node tools/pop_sim.js [nights per cell, default 200]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const RUNS = +process.argv[2] || 200;
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
  const P = [0.45, 0.6, 0.8];
  const out = await page.evaluate(async ([P, RUNS]) => {
    let seed = 777;
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const cell = async policy => {
      const rs = [];
      for (let k = 0; k < RUNS; k++) rs.push(await SD.pop.sim(policy, rng));
      const mean = f => rs.reduce((a, r) => a + f(r), 0) / rs.length;
      return { pts: mean(r => r.pts), score: mean(r => r.score), won: mean(r => (r.won ? 1 : 0)), retreat: mean(r => (r.how === 'retreat' ? 1 : 0)), held: mean(r => r.held), cleared: mean(r => r.cleared), qs: mean(r => r.questions), maxMin: Math.max(...rs.map(r => r.minutes)), meanMin: mean(r => r.minutes),
        relics: mean(r => r.relics | 0), pm: mean(r => r.pm | 0), big: mean(r => r.big | 0), caught: mean(r => (r.cat === 'caught' ? 1 : 0)), skipped: mean(r => r.skipped | 0) };
    };
    const res = {};
    for (const p of P) {
      res[p] = {
        honest: await cell({ p, conf: 'honest', route: 'near', stake: 'all' }),
        none: await cell({ p, conf: 'honest', route: 'near', stake: 'none' }),
        sure: await cell({ p, conf: 'sure', route: 'near', stake: 'all' }),
        far: await cell({ p, conf: 'honest', route: 'far', stake: 'all' }),
        esc: await cell({ p, conf: 'honest', route: 'near', stake: 'all', escalate: true })
      };
    }
    // Nights 2 to 4 (policy.night counts the nights before).
    for (const n of [2, 3, 4]) for (const p of P) {
      res[n + ':' + p] = {
        honest: await cell({ p, conf: 'honest', route: 'near', stake: 'all', night: n - 1 }),
        none: await cell({ p, conf: 'honest', route: 'near', stake: 'none', night: n - 1 }),
        sure: await cell({ p, conf: 'sure', route: 'near', stake: 'all', night: n - 1 }),
        far: await cell({ p, conf: 'honest', route: 'far', stake: 'all', night: n - 1 }),
        home: await cell({ p, conf: 'honest', route: 'home', home: 'thornwick', stake: 'all', night: n - 1 }),
        plan: await cell({ p, conf: 'honest', route: 'plan', stake: 'all', night: n - 1 })
      };
    }
    for (const p of P) res['1:' + p] = Object.assign({ home: await cell({ p, conf: 'honest', route: 'home', home: 'thornwick', stake: 'all' }) }, res[p]);
    return res;
  }, [P, RUNS]);
  console.log(`pop: ${RUNS} nights a cell`);
  console.log('  p     policy   score    pts   won%  retreat%  held  cleared  checks  minutes(mean/max)');
  for (const p of P) for (const k of ['honest', 'none', 'sure', 'far', 'esc']) {
    const c = out[p][k];
    console.log(`  ${p.toFixed(2)}  ${k.padEnd(7)}${c.score.toFixed(1).padStart(7)}${c.pts.toFixed(1).padStart(7)}${(c.won * 100).toFixed(0).padStart(6)}%${(c.retreat * 100).toFixed(0).padStart(8)}%${c.held.toFixed(2).padStart(7)}${c.cleared.toFixed(2).padStart(8)}${c.qs.toFixed(1).padStart(8)}   ${c.meanMin.toFixed(1)}/${c.maxMin.toFixed(1)}`);
  }
  const target = { 0.45: 0.43, 0.6: 0.65, 0.8: 0.9 };
  for (const p of P) check(Math.abs(out[p].honest.won - target[p]) <= 0.2, `the Hunch doesn't check out on ${(out[p].honest.won * 100).toFixed(0)}% of nights at ${p} (target about ${target[p] * 100}%)`);
  check(out[0.8].none.score < out[0.8].honest.score, 'stake none loses to stake all at 80%');
  check(out[0.6].none.score >= out[0.6].honest.score * 0.9 - 1 || out[0.6].none.score < out[0.6].honest.score, 'stake none is within 10% of stake all at 60%, or below it');
  check(out[0.45].sure.pts < out[0.45].honest.pts, 'stake all on Sure loses points to honest confidence at 45%');
  const routeWin = ['honest', 'far'].find(k => P.every(p => out[p][k].score > out[p][k === 'honest' ? 'far' : 'honest'].score * 1.05));
  console.log(`  night 1 alone: ${routeWin ? (routeWin === 'honest' ? 'claims first' : 'other rooms first') + ' wins at every accuracy' : 'no fixed route wins at every accuracy'}`);
  check(out[0.6].honest.retreat <= 0.3, `honest play at 60% retreats on ${(out[0.6].honest.retreat * 100).toFixed(0)}% of nights (at most 30%)`);
  // Nights 2 to 4.
  const N = [2, 3, 4];
  console.log('\n  night p     policy   score    pts   won%  retreat%  held  cleared  checks  minutes   relics  postmortem  big  cat  shortcut');
  for (const n of N) for (const p of P) for (const k of ['honest', 'none', 'sure', 'far', 'home', 'plan']) {
    const c = out[n + ':' + p][k];
    console.log(`  ${n}     ${p.toFixed(2)}  ${k.padEnd(7)}${c.score.toFixed(1).padStart(7)}${c.pts.toFixed(1).padStart(7)}${(c.won * 100).toFixed(0).padStart(6)}%${(c.retreat * 100).toFixed(0).padStart(8)}%${c.held.toFixed(2).padStart(7)}${c.cleared.toFixed(2).padStart(8)}${c.qs.toFixed(1).padStart(8)}   ${c.meanMin.toFixed(1)}/${c.maxMin.toFixed(1)}${c.relics.toFixed(2).padStart(8)}${c.pm.toFixed(2).padStart(10)}${c.big.toFixed(2).padStart(7)}${c.caught.toFixed(2).padStart(5)}${c.skipped.toFixed(2).padStart(6)}`);
  }
  for (const n of N) {
    const o = p => out[n + ':' + p];
    check(o(0.8).none.score < o(0.8).honest.score, `night ${n}: stake none loses to stake all at 80%`);
    check(o(0.45).sure.pts < o(0.45).honest.pts, `night ${n}: stake all on Sure loses points to honest confidence at 45%`);
    check(o(0.6).honest.retreat <= 0.3, `night ${n}: honest play at 60% retreats on ${(o(0.6).honest.retreat * 100).toFixed(0)}% of nights (at most 30%)`);
    check(o(0.45).honest.won < o(0.8).honest.won, `night ${n}: the Hunch checks out less as accuracy rises (${(o(0.45).honest.won * 100).toFixed(0)}% → ${(o(0.8).honest.won * 100).toFixed(0)}% held)`);
  }
  check(N.some(n => P.some(p => out[n + ':' + p].plan.relics > 0)), 'vaults or the cat hand out relics');
  check([3, 4].every(n => P.some(p => out[n + ':' + p].plan.big > 0)), 'the Big Claim gets cleared on nights 3 and 4');
  check([3, 4].some(n => P.some(p => out[n + ':' + p].plan.pm > 0)), 'the records vault hands out the Postmortem');
  check(P.some(p => out['4:' + p].plan.caught > 0), 'the cat gets caught on night 4');
  console.log('  reading the map (plan) against claims first: ' + N.map(n => `night ${n} ` + P.map(p => (out[n + ':' + p].plan.score - out[n + ':' + p].honest.score).toFixed(1)).join(' / ')).join(', ') + ' (score difference at 45 / 60 / 80%)');
  // Routes, the five nights pooled: claims first ('honest'), other rooms first ('far'), the same homeland ('home').
  const pool = (p, k) => [1, 2, 3, 4].reduce((a, n) => a + out[n + ':' + p][k].score, 0) / 4;
  const routes = ['honest', 'far', 'home'], rname = { honest: 'claims first', far: 'other rooms first', home: 'the same homeland' };
  const win = routes.find(k => P.every(p => routes.every(j => j === k || pool(p, k) > pool(p, j) * 1.05)));
  check(!win, `no fixed route wins the night score at every accuracy, nights 1 to 4 pooled${win ? ' (' + rname[win] + ' does)' : ''}: ` + P.map(p => routes.map(k => rname[k] + ' ' + pool(p, k).toFixed(1)).join(', ') + ' at ' + p).join('; '));
  const maxMin = Math.max(...Object.values(out).flatMap(c => Object.values(c).map(x => x.maxMin)));
  check(maxMin <= 20, `every night fits in 20 minutes (longest ${maxMin.toFixed(1)})`);
  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page errors');
  if (fails.length) { console.error(`\n${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('\nOK: The Lost and Found passes its simulation.');
})().catch(e => { console.error(e); process.exit(1); });
