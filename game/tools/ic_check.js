// Headless check of Incident Commander (js/mode-ic.js, build spec v4 with the Nov 16 review's fixes) at phone width
// (375px). Shift 1, the board: the picker and walkthrough, 3 waves of 4 Domain 1 and 4 incidents with clocks of 2, 3
// or 4 and page costs of 10, 15 or 25%, each card's symptom sentence, the whole stem free in the question (never on the
// board's screen), the shared stakes, every answer ticking the other clocks, a twin retry, a timeout costing its card's
// page cost and returning next wave, save and resume, the closing major incident, results opening on the best fix with
// Done first, and an unforced run that can time out. Shift 2, the request-path map (version B): 2 bank incidents and 1
// format check a wave on three nodes (Predict on Lambda, Spot the line elsewhere) through the formats engine, walking at
// a tick, Map as list, at most 4 map actions per question, a missed check shortening its node's next incident, a page
// spreading upstream, the runbook detour, routes that differ, saving after every map action. Shift 3: Dutch, Coo and
// Bru. Then 0% with "Retry this wave".
// Run from game/:  node tools/ic_check.js     SHOTS=dir saves screenshots.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
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
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'ic-' + name + '.png') }); };
  const boot = async () => {
    await page.goto(url);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    await page.click('#t-start');
    await page.waitForSelector('#today-card:not([hidden])');
  };
  // Nothing wider than the phone: the page, the title screen, and every element of the card and any open window.
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      const t = document.querySelector('#screen-title'), ox = getComputedStyle(t).overflowX;
      if (!t.hidden && t.scrollWidth > t.clientWidth && ox !== 'hidden' && ox !== 'clip') bad.push('title ' + t.scrollWidth);
      document.querySelectorAll('#today-card *, #panel:not([hidden]) .win *').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const state = () => page.evaluate(() => document.querySelector('#today-card').dataset.state);
  const totalXp = () => page.evaluate(() => { const s = SD.state.save; let t = s.xp; for (let l = 1; l < s.level; l++) t += SD.state.xpFor(l); return t; });
  // Answers the question on screen: right (from the question SD.today is asking) or wrong, with a confidence.
  const answer = (right, conf) => page.evaluate(async ([right, conf]) => {
    const p = document.querySelector('#panel'), q = SD.modes.current();
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const said = p.querySelector('#q-said'); if (said) { said.click(); await wait(10); }
    const tf = p.querySelector('#tf-idk'); if (tf) { tf.click(); await wait(10); }
    if (q.type === 'mc') {
      const want = right ? q.a : q.opts.findIndex((o, i) => i !== q.a);
      p.querySelector(`[data-o="${want}"]`).click();
    } else if (q.type === 'multi') {
      q.items.forEach((it, i) => { if (right ? it.ok : !it.ok) p.querySelector(`[data-m="${i}"]`).click(); });
    } else if (q.type === 'num') {
      const inp = p.querySelector('#q-num'); inp.value = right ? q.lo : q.hi + 1e6; inp.dispatchEvent(new Event('input'));
    } else if (q.type === 'order') {
      for (let i = 0; i < q.items.length; i++) { p.querySelector(`[data-ord="${right ? i : q.items.length - 1 - i}"]`).click(); await wait(5); }
    }
    await wait(10);
    p.querySelector(`[data-c="${conf}"]`).click();
    await wait(10);
    return q.id;
  }, [right, conf]);


  // After a verdict, a settled incident shows its fix (js/ic-fix.js); the first sighting of a config line wants it typed.
  let fixes = 0, typedFix = 0;
  const pastFix = async () => {
    if (!await page.$('#ic-fixgo')) return;
    fixes++;
    const inp = await page.$('#ic-type');
    if (inp) { typedFix++; const term = await page.evaluate(() => { const id = document.querySelector('.ic-fix').dataset.fix; return SD.icFix.termOf(SD.icFix.FIXES.find(f => f.id === id)); }); await inp.fill(term.toLowerCase()); }
    await page.click('#ic-fixgo'); await page.waitForTimeout(20);
  };
  const next = async () => { await page.click('#q-next'); await page.waitForTimeout(30); await pastFix(); };
  const ic = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.ic)));
  const txt = sel => page.textContent(sel);
  const work = async (i, ok, conf) => { await page.click(`[data-inc="${i}"]`); await page.waitForSelector('#panel .win.quiz'); await answer(ok, conf); await next(); await page.waitForTimeout(40); };

  await page.clock.install({ time: new Date('2026-11-17T20:00:00') });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });
  const workable = st => st.board.map((b, i) => [b, i]).filter(([b]) => !st.map || (b.found && b.at === st.at)).map(x => x[1]);

  // ---- Picker and first run ----
  check(!!await page.$('.tg-card'), 'the title has the games carousel (js/title-games.js)');
  await page.evaluate(() => SD.modes.open());
  check(/Incident Commander/.test(await txt('#panel')), 'the picker lists Incident Commander');
  await page.click('[data-mode="ic"]');
  await page.click('#ic-pager');
  check(/Step 1 of 3/.test(await txt('#panel')), 'the first run opens the 3-step walkthrough');
  const s0 = await ic();
  check(!s0.map && !s0.picksOn, 'shift 1 is the board alone: no map, no picks (one new rule per night)');
  const firstSym = await page.evaluate(id => SD.ic.symptom(SD.exam.find(id)), s0.board[0].q);
  check((await txt('.md-walk')).includes(firstSym.slice(0, 50)), 'step 1 shows a real incident\'s symptom from the first wave');
  check(/Kyu held the Cloud's pager/.test(await txt('.md-walk')), 'Uptima is the secondary pager (Story Bible)');
  await noHScroll('walkthrough');
  await shot('walk');
  await page.click('#md-next'); await page.click('#md-next'); await page.click('#md-next');
  await page.waitForSelector('.ic-board');

  // ---- The shift and the board ----
  check(s0.board.length === 4 && s0.wave === 1, 'wave 1 lands 4 incidents');
  check(s0.queue.length + s0.board.length === 12, 'a shift holds 12 incidents over 3 waves (' + (s0.queue.length + s0.board.length) + ')');
  const all0 = s0.queue.concat(s0.board);
  const other = all0.filter(x => x.other).length;
  check(other === 3, `1 in 4 incidents are due from other topics (${other})`);
  const own = await page.evaluate(ids => ids.map(id => { const q = SD.exam.find(id); return [SD.exam.domainOf(q), q.topic, !!SD.ic.nodeOf(q), SD.ic.hasSymptom(q)]; }), all0.filter(x => !x.other).map(x => x.q));
  check(own.every(x => [1, 4].includes(x[0]) && x[2]), 'the rest are Domain 1 and 4 questions on request-path services (' + [...new Set(own.map(x => x[1]))].join(', ') + ')');
  check(own.some(x => x[0] === 1), 'Development (Domain 1) questions are in the shift');
  check(own.every(x => x[3]), `stems with a symptom come first (${own.filter(x => x[3]).length} of ${own.length})`);
  check(s0.board.every(b => [2, 3, 4].includes(b.clock)), 'clocks start at 2, 3 or 4 ticks (' + s0.board.map(b => b.clock).join(', ') + ')');
  check(s0.board.every(b => [10, 15, 25].includes(b.cost)), 'each card has a page cost of 10, 15 or 25% (' + s0.board.map(b => b.cost).join(', ') + ')');
  const cards = await page.$$eval('.ic-card', els => els.map(e => e.textContent.replace(/\s+/g, ' ')));
  check(cards.every(c => /SEV-\d · pages −\d+%/.test(c) && /\d ticks? left/.test(c)), 'each card shows its severity, page cost and ticks left in words');
  const syms = await page.evaluate(() => SD.state.save.ic.board.map(b => SD.ic.symptom(SD.exam.find(b.q))));
  check(syms.every(x => cards.some(c => c.includes(x.replace(/\s+/g, ' ').slice(0, 40)))), 'each card shows its symptom sentence');
  check(syms.some(x => x !== '' && !/\?$/.test(x)), 'the symptom is a scenario sentence, not only the ask line');
  await noHScroll('board');
  await shot('board');
  const qual = await page.evaluate(() => {
    const pool = SD.topicDrill.base().filter(SD.ic.match);
    const withQ = pool.filter(q => /\b(MOST|LEAST)\b/.test(q.q.split(/(?<=[.?!])\s+(?=[A-Z0-9"'(])/).slice(-1)[0]));
    return [withQ.length, withQ.filter(q => /^(MOST|LEAST)\b/.test(SD.modes.split(q).qual)).length, pool.length];
  });
  check(qual[0] > 0 && qual[1] === qual[0], `the MOST/LEAST qualifier shows on the card (${qual[1]} of ${qual[0]}; pool ${qual[2]})`);

  // ---- Work an incident: the whole stem, right and Sure ----
  // Give every clock room so this part tests ticking, not timeouts.
  await page.evaluate(() => { SD.state.save.ic.board.forEach(b => { b.clock = b.max = 4; }); SD.state.persist(); SD.ic.board(); });
  const others0 = (await ic()).board.slice(1).map(b => b.clock);
  await page.click('[data-inc="0"]');
  await page.waitForSelector('#panel .win.quiz');
  const isMc = await page.evaluate(() => SD.modes.current().type === 'mc');
  check(!isMc || !!await page.$('#q-said'), 'Say it first: name the cause before the fixes show');
  check(!await page.$('.ic-board'), 'the board and the question never share the screen');
  const stem = await page.evaluate(() => SD.modes.current().q);
  check((await txt('.q-q')) === stem, 'the whole stem shows, free to read');
  check(!!await page.$('#md-stop'), 'the quiz window keeps Stop for now');
  await noHScroll('incident quiz');
  await answer(true, 2);
  await shot('verdict');
  check(/Sure, right: \+3/.test(await txt('.verdict-row')), 'the verdict shows the shared stakes');
  await next();
  await page.waitForSelector('.ic-board');
  let s1 = await ic();
  check(s1.pts === 3 && s1.board.length === 3 && s1.log[0].ok === 1, 'right: the incident is resolved and pays +3');
  check(JSON.stringify(s1.board.map(b => b.clock)) === JSON.stringify(others0.map(c => c - 1)), 'the answer ticked every other clock by one');
  check(s1.budget === 100, 'a right answer leaves the budget alone (budget is only for survival)');
  check(/Since your last answer: .*resolved/.test(await txt('.ic-since')), 'the board says what changed since your last answer');

  // ---- Wrong: a retry on its twin, or missed ----
  const before = s1.board[0];
  await work(0, false, 1);
  let s2 = await ic();
  const twin = s2.board.find(b => b.orig === before.orig);
  check(twin ? twin.q !== before.q : s2.log.some(l => l.orig === before.orig && !l.ok), `wrong: ${twin ? 'it stays open as its twin, never the same question' : 'no twin, so it is logged as missed'}`);
  check(s2.pts === 2, 'Think so and wrong costs 1 point');

  // ---- A timeout: its page cost, back next wave as its twin ----
  await page.evaluate(() => { const s = SD.state.save.ic; s.board.forEach((b, i) => { if (i) b.clock = 1; }); SD.state.persist(); SD.ic.board(); });
  const s5 = await ic();
  if (s5.board.length > 1) {
    await work(0, true, 1);
    const s6 = await ic();
    const paged = s5.board.slice(1), cost = paged.reduce((a, b) => a + b.cost, 0);
    check(s6.budget === Math.max(0, s5.budget - cost), `a timeout costs its card's page cost (${s5.budget}% − ${paged.map(b => b.cost).join(' − ')} → ${s6.budget}%)`);
    const back = s6.carry.concat(s6.board);
    check(paged.every(p => back.some(b => b.orig === p.orig)), 'timed-out incidents come back next wave, not skipped');
    // Same question only when it has no twin that's free this shift (a twin already on the board or in the log is skipped).
    const tw = await page.evaluate(([paged, back, s5]) => { const used = s5.log.map(x => x.q).concat(s5.board.map(x => x.q), s5.queue.map(x => x.q), s5.carry.map(x => x.q), s5.seen || []);
      return paged.every(p => { const b = back.find(x => x.orig === p.orig); return b && (b.q !== p.q || !SD.qtwin(SD.exam.find(p.q), { avoid: used.concat(p.q) })); }); }, [paged, back, s5]);
    check(tw, 'and come back as their twin where one exists');
    if (s6.phase === 'zero') await page.click('#ic-retry');
  }

  // ---- Saved after every answer: reload and resume ----
  const s6b = await ic();
  await page.evaluate(() => sessionStorage.setItem('keep', '1'));
  await page.reload();
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');
  await page.evaluate(() => SD.modes.open());
  check(/Resume · wave \d of 4/.test(await txt('[data-mode="ic"]')), 'after a reload the picker offers Resume with the wave');
  await page.click('[data-mode="ic"]');
  await page.click('#ic-pager');
  await page.waitForSelector('.ic-board');
  const s7 = await ic();
  check(JSON.stringify(s7.board) === JSON.stringify(s6b.board) && s7.pts === s6b.pts, 'resuming lands on the same board');

  // ---- Play the shift out: a miss on wave 2 so the major incident has something to bring back ----
  let sawPick = false, majorSeen = null, missed = false;
  for (let k = 0; k < 60; k++) {
    const st = await ic();
    if (st.phase === 'done') break;
    if (st.phase === 'pick') { sawPick = true; await page.click('[data-pick="coo"]'); continue; }
    if (st.phase === 'zero') { await page.click('#ic-retry'); continue; }
    if (st.wave === 4 && !majorSeen) { majorSeen = st; await shot('major'); check(/Major incident/.test(await txt('.ic-hud')), 'the last wave is the major incident'); }
    const miss = st.wave === 2 && !missed;
    if (miss) missed = true;
    await page.evaluate(() => { SD.state.save.ic.board.forEach(b => { b.clock = Math.max(b.clock, 6); }); SD.state.persist(); SD.ic.board(); });
    await work(0, !miss, 1);
  }
  const s8 = await ic();
  check(!sawPick, 'the first shift has no between-wave picks (one new rule per night)');
  check(s8.phase === 'done' && s8.wave === 4, 'the shift ends after the major incident (wave 4)');
  check(!!majorSeen && majorSeen.board.length >= 1 && majorSeen.board.length <= 3 && majorSeen.board.every(b => b.major || s8.log.some(l => l.orig === b.orig)), `the major incident brings back tonight's misses and twins (${majorSeen ? majorSeen.board.map(b => b.major || 'timed out').join(', ') : 'none'})`);
  check(s8.log.length >= 10 && !s8.board.length && !s8.carry.length, `every incident that landed was worked (${s8.log.length}; ${s8.queue.length} never landed, as timeouts took their slots)`);
  const res = (await txt('#panel')).replace(/\s+/g, ' ');
  check(/Your best fix tonight/.test(await txt('.ic-best')), 'results open on your best fix');
  check(/incidents resolved/.test(res) && /Points: [+−±]\d+/.test(res), 'results: incidents resolved and points');
  check(/Next shift: /.test(res), 'results: one thing to do differently');
  check(await page.$$eval('.ic-log li', l => l.length) === s8.log.length, 'results: every incident\'s fix in one line');
  check(/Think so \d+ of \d+ right/.test(await page.$$eval('.md-calt tr', t => t.map(r => [...r.children].map(c => c.textContent).join(' ')).join(' | '))), 'results: the calibration readout');
  check(/Why did that work/.test(res), 'results: Pip asks why it worked');
  check(/\+20 XP · \+5 shards/.test(res), 'results: the shift pays XP and shards');
  check(await page.evaluate(() => document.querySelector('#ic-done').classList.contains('primary') && !document.querySelector('#ic-again').classList.contains('primary')), 'Done is the main button, not New shift');
  const stats = await page.evaluate(() => SD.state.save.modes.icStats.slice(-1)[0]);
  check(stats && stats.rp[1] + stats.other[1] === s8.log.length && stats.ranks.length === s8.answers, 'the shift logs request-path and other-topic accuracy and the clock rank of each pick (hypothesis)');
  await noHScroll('results');
  await shot('results');

  // ---- Unforced play can time out: the clocks bite ----
  const sim = await page.evaluate(async () => {
    let seed = 99; const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const out = { board: [], map: [] };
    for (const map of [false, true]) for (let k = 0; k < 20; k++) out[map ? 'map' : 'board'].push(await SD.ic.sim({ p: 0.6, conf: 'honest', route: 'near', map }, rng));
    const f = rs => [rs.filter(r => r.timeouts).length, rs.filter(r => r.zero).length, rs.length];
    return [f(out.board), f(out.map)];
  });
  check(sim[0][0] >= 10 && sim[0][1] <= 5, `board: honest play at 60% times out in most shifts and rarely hits 0% (${sim[0][0]} and ${sim[0][1]} of ${sim[0][2]})`);
  check(sim[1][0] >= 10 && sim[1][1] <= 5, `map: the same (${sim[1][0]} and ${sim[1][1]} of ${sim[1][2]})`);
  // The route is a real choice: staying near and taking the detours differ by at least 10% somewhere.
  const routes = await page.evaluate(async () => {
    let seed = 41; const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const out = [];
    for (const p of [0.45, 0.6, 0.8]) {
      const m = {};
      for (const route of ['near', 'far']) { let t = 0, bu = 0; for (let k = 0; k < 40; k++) { const r = await SD.ic.sim({ p, conf: 'honest', route }, rng); t += r.pts; bu += r.budget; } m[route] = t / 40; m[route + 'B'] = bu / 40; }
      const d = (a, b) => Math.abs(a - b) / Math.max(1, Math.abs(a), Math.abs(b));
      out.push([p, m.near, m.far, Math.max(d(m.near, m.far), d(m.nearB, m.farB)), m.nearB, m.farB]);
    }
    return out;
  });
  // The outcome is points or the error budget left: the detour mostly trades budget, the stakes trade points.
  check(routes.some(r => r[3] >= 0.1), 'map: near and far routes move the outcome by 10% or more (points, budget: ' + routes.map(r => `${r[0]}: ${r[1].toFixed(1)} vs ${r[2].toFixed(1)}, ${r[4].toFixed(0)}% vs ${r[5].toFixed(0)}%`).join('; ') + ')');

  // ---- Second shift: the request-path map (version B: 2 incidents and 1 format check a wave, no lenses) ----
  await page.click('#ic-again');
  check(/Step 1 of 1/.test(await txt('#panel')) && /request path/.test(await txt('.md-walk')), 'the map\'s first night opens with its own walkthrough screen');
  await shot('map-walk');
  await page.click('#md-next');
  await page.waitForSelector('.ic-board');
  let m0 = await ic();
  check(m0.map && !m0.picksOn, 'shift 2 adds the map, and no picks yet');
  check(await page.$$eval('.ic-node', n => n.length) === 6 && /API Gateway/.test(await txt('.ic-map')) && /Runbook shelf/.test(await txt('.ic-map')), 'the map shows the request path and the runbook shelf');
  check(!await page.$('[data-look], .ic-lens'), 'no lenses (version B)');
  check(m0.at === 'apigw' && /📍 You are here/.test(await page.$eval('.ic-node.here', e => e.getAttribute('aria-label'))), 'you start at API Gateway, and the map says so in words');
  const fm = m0.board.filter(b => b.fmt), bk = m0.board.filter(b => !b.fmt);
  check(fm.length === 1 && bk.length === 2, `each wave is 2 bank incidents and 1 format check (${bk.length} and ${fm.length})`);
  check(new Set(m0.board.map(b => b.at)).size === 3, 'on three different nodes (' + m0.board.map(b => b.at).join(', ') + ')');
  const fItem = await page.evaluate(id => { const it = SD.modes.fmtItem(id); return it && [it.type, SD.ic.nodeOf(it) && SD.ic.nodeOf(it).id]; }, fm[0].q);
  check(fItem && fItem[1] === fm[0].at && fItem[0] === (fm[0].at === 'lambda' ? 'predict' : 'spot'), `the check fits its node: Predict on Lambda, Spot the line elsewhere (${fItem && fItem.join(' at ')})`);
  check(bk.every(b => b.clock >= 4 && b.clock <= 6) && fm[0].clock >= 5 && fm[0].clock <= 7, 'map clocks start 2 longer, and a check 1 more (' + m0.board.map(b => b.clock).join(', ') + ')');
  const norm = await page.evaluate(() => [SD.ic.nodeOf({ topic: 'api gateway' }), SD.ic.nodeOf({ topic: 'apigateway' }), SD.ic.nodeOf({ topic: 'API-Gateway' })].map(n => n && n.id));
  check(norm.every(x => x === 'apigw'), 'topic keys are normalised ("api gateway" and "apigateway" are one node)');
  const spots = await page.evaluate(() => ['apigw', 'lambda', 'ddb', 'sqs', 's3'].map(n => n + ' ' + SD.ic.fmtFor(n).length));
  check(spots.every(x => +x.split(' ')[1] > 0), 'every node has format items (' + spots.join(', ') + ')');
  const fc = await page.$$eval('.ic-card', els => els.map(e => e.textContent.replace(/\s+/g, ' ')));
  check(fc.some(c => /(Predict|Spot the line) · a check of its own/.test(c)), 'the check is a card of its own, named by its format');
  const far0 = m0.board.find(b => b.at !== 'apigw');
  await page.$eval(`[data-inc="${m0.board.indexOf(far0)}"]`, e => e.click()); await page.waitForTimeout(30);
  check(!await page.$('#panel .win.quiz') && !!await page.$('.ic-board'), 'a card you are not standing at does not open');
  await noHScroll('map');
  await shot('map');
  await page.click('#ic-view');
  check(!!await page.$('.ic-list') && !await page.$('.ic-map') && /API Gateway/.test(await txt('.ic-list')) && /you are here/.test(await txt('.ic-list')), 'Map as list shows every node and state in words');
  await noHScroll('map as list');
  await shot('map-list');
  await page.click('#ic-view');
  // Walk one step: a tick on every clock, and it's saved.
  await page.evaluate(() => { SD.state.save.ic.board.forEach(b => { b.clock = b.max = 7; }); SD.state.persist(); SD.ic.board(); });
  const pre = await ic();
  await page.click('[data-walk="lambda"]');
  const m2 = await ic();
  check(m2.at === 'lambda' && m2.board.every((b, i) => b.clock === pre.board[i].clock - 1) && m2.acts === 1, 'walking one step moves you, costs a tick on every clock, and counts as a map action');
  check(/Since your last move: /.test(await txt('.ic-since')), 'the board says what changed since your last move');
  check(await page.evaluate(() => { const k = Object.keys(localStorage).find(x => /save/i.test(x)); return !k || /"at":"lambda"/.test(localStorage.getItem(k)); }), 'the map action is saved');
  // The format check through the board: stand on its node and open it. The first one of a format is worked through.
  await page.evaluate(() => { const s = SD.state.save.ic, f = s.board.find(b => b.fmt); s.at = f.at; SD.state.persist(); SD.ic.board(); });
  const fi = (await ic()).board.findIndex(b => b.fmt), pts0 = (await ic()).pts, n0 = (await ic()).answers;
  await page.click(`[data-inc="${fi}"]`);
  await page.waitForSelector('#panel .qf');
  check(!await page.$('.ic-board'), 'the check opens on its own screen, not over the map');
  await noHScroll('format check');
  await shot('format');
  if (await page.$('#qf-got')) {
    await page.click('#qf-got'); await page.waitForTimeout(40);
    const m3 = await ic();
    check(m3.pts === pts0 && m3.answers === n0 + 1 && !m3.board.some(b => b.fmt), 'a worked example clears the check without points (the formats engine\'s introduction)');
  }
  // A scored check, answered right and Sure: +3 from the shared stake table, and it counts toward calibration.
  const fmScore = await page.evaluate(async () => {
    const s = SD.state.save.ic; SD.qf.exposure('spot').known = true; SD.qf.exposure('predict').known = true;
    const node = s.at === 'lambda' ? 'lambda' : 's3', it = SD.ic.fmtFor(node).slice(-1)[0];
    s.board.push({ q: it.id, orig: it.id, at: s.at = node, fmt: 1, clock: 7, max: 7, cost: 10, tries: 0, timeouts: 0, other: 0 });
    SD.state.persist(); SD.ic.board();
    return [s.board.length - 1, it.type, it.type === 'spot' ? [it.bad, it.a] : [it.a], (s.tally[2] || [0, 0])[1], s.pts];
  });
  await page.click(`[data-inc="${fmScore[0]}"]`);
  await page.waitForSelector('#panel .qf');
  if (fmScore[1] === 'spot') { await page.click(`[data-qf-line="${fmScore[2][0]}"]`); await page.click(`[data-qf-reason="${fmScore[2][1]}"]`); }
  else await page.click(`[data-qf-opt="${fmScore[2][0]}"]`);
  await page.click('#qf-submit');
  await page.click('[data-c="2"]');
  await page.waitForSelector('#q-next'); await page.click('#q-next'); await page.waitForTimeout(40);
  const m4 = await ic();
  check(m4.pts === fmScore[4] + 3 && m4.tally[2][1] === fmScore[3] + 1, `a scored check pays from the shared stakes and counts in calibration (+${m4.pts - fmScore[4]})`);
  // A missed check: no twin, and that node's next bank incident arrives a tick shorter.
  const debt = await page.evaluate(() => {
    const s = JSON.parse(JSON.stringify(SD.state.save.ic)); s.sim = true; s.perks = {};
    const it = SD.ic.fmtFor('sqs')[0];
    const f = { q: it.id, orig: it.id, at: 'sqs', fmt: 1, clock: 9, max: 9, cost: 10, tries: 0, timeouts: 0, other: 0 };
    s.board = [f]; SD.ic.settle(s, f, { ok: false, conf: 1, pts: -1, scored: true });
    const after = [s.board.length, !!s.debt.sqs];
    s.board = []; s.carry = []; s.wave = 1; s.runbook = 0;
    const home = SD.ic.homeOf, q = s.queue.find(x => home(x.q) === 'sqs') || { q: SD.topicDrill.base().find(x => SD.ic.nodeOf(x) && SD.ic.nodeOf(x).id === 'sqs').id };
    s.queue = [q].concat(s.queue.filter(x => x !== q));
    let seed = 3; SD.ic.land(s, () => ((seed = (seed * 9301 + 49297) % 233280) / 233280));
    const b = s.board.find(x => !x.fmt && x.at === 'sqs');
    return after.concat([b && b.shaken, b && b.clock, !s.debt.sqs]);
  });
  check(debt[0] === 0 && debt[1], 'a missed check is gone (no twin) and marks its node');
  check(debt[2] === 1 && debt[3] <= 5 && debt[4], `that node's next bank incident arrives a tick shorter (${debt[3]} ticks)`);
  // The cap: 4 map actions per question. Walking stays open only when nothing here can be worked.
  const cap4 = await page.evaluate(() => {
    const s = JSON.parse(JSON.stringify(SD.state.save.ic)); s.sim = true; s.acts = 4; s.phase = 'board';
    s.board = [{ q: 'x', at: s.at, clock: 5, cost: 10 }];
    const a = SD.ic.canAct(s, 'walk');
    s.board = [{ q: 'x', at: s.at === 'ddb' ? 'sqs' : 'ddb', clock: 5, cost: 10 }];
    return [a, SD.ic.canAct(s, 'walk')];
  });
  check(!cap4[0] && cap4[1], 'at most 4 map actions per question (walking stays open only when nothing here can be worked)');
  // A page spreads upstream: the caller's clocks drop a tick too.
  const spread = await page.evaluate(() => {
    const s = JSON.parse(JSON.stringify(SD.state.save.ic)); s.sim = true; s.perks = {}; s.budget = 100; s.map = true;
    const qs = SD.topicDrill.base().filter(SD.ic.match).slice(0, 3).map(q => q.id);
    const mk = (o, q, at, clock) => ({ q, orig: o, at, clock, max: clock, cost: 10, tries: 0, timeouts: 0, other: 0 });
    const w = mk('x-w', qs[0], 'apigw', 5), dn = mk('x-dn', qs[1], 'ddb', 1), up = mk('x-up', qs[2], 'lambda', 4);
    s.board = [w, dn, up]; s.at = 'apigw';
    SD.ic.settle(s, w, { ok: true, conf: 1, pts: 2 });
    return [s.board.find(x => x.orig === 'x-up').clock, /upstream to Lambda/.test(s.since), s.budget];
  });
  check(spread[0] === 2 && spread[1] && spread[2] === 90, `a page spreads upstream to its caller: −1 tick there (Lambda ${spread[0]}, budget ${spread[2]}%)`);
  // The runbook detour: it shows where the next wave lands and gives its clocks 3 more ticks.
  const rb = await page.evaluate(() => {
    const s = JSON.parse(JSON.stringify(SD.state.save.ic)); s.sim = true; s.acts = 0; s.at = 'apigw'; s.wave = 1; s.debt = {};
    s.board.forEach(b => { b.clock = 9; });
    const ok = SD.ic.walk(s, 'runbook'), where = SD.ic.nextLanding(s);
    s.board = []; s.carry = [];
    SD.ic.next(s);
    return [ok, where.join(' '), s.board.map(b => b.at).join(' '), s.board.map(b => b.clock - (b.fmt ? 1 : 0))];
  });
  check(rb[0] && rb[1].length > 0 && rb[1] === rb[2] && rb[3].every(c => c >= 7 && c <= 9), `the runbook shows where the next wave lands (${rb[1]}), and it lands there with 3 more ticks (${rb[3].join(', ')})`);

  // Finish shift 2 quickly on the state machine, then the last answer through the board.
  await page.evaluate(() => {
    const s = SD.state.save.ic; s.queue = []; s.carry = []; s.wave = 4; s.log.forEach(l => { l.ok = 1; });
    s.board = s.board.slice(0, 1); s.board[0].at = s.at; s.board[0].found = true; s.board[0].clock = 5; SD.state.persist(); SD.ic.board();
  });
  await work(0, true, 1);
  check((await ic()).phase === 'done', 'shift 2 ends');

  // ---- Third shift: between-wave picks ----
  await page.click('#ic-again');
  await page.waitForSelector('.ic-board');
  check((await ic()).picksOn, 'from the third shift, between-wave picks are on');
  await page.evaluate(() => { const s = SD.state.save.ic; s.board = s.board.slice(0, 1); s.board[0].at = s.at; s.board[0].found = true; s.board[0].clock = 5; SD.state.persist(); SD.ic.board(); });
  await work(0, true, 1);
  check((await ic()).phase === 'pick' && /Dutch/.test(await txt('#panel')) && /Coo/.test(await txt('#panel')) && /Bru/.test(await txt('#panel')), 'after wave 1: one free pick from Dutch, Coo or Bru');
  await noHScroll('pick');
  await shot('pick');
  await page.click('[data-pick="dutch"]');
  await page.waitForSelector('.ic-board');
  const d0 = (await ic()).board[1].clock;
  await page.click('[data-dutch="1"]');
  check((await ic()).board[1].clock === d0 + 2 && !await page.$('[data-dutch]'), 'Dutch: +2 ticks on the clock you choose, once');
  // Coo and Bru, on the state machine directly.
  const perks = await page.evaluate(() => {
    const s = JSON.parse(JSON.stringify(SD.state.save.ic)); s.sim = true;
    s.perks = { coo: 1 }; s.budget = 100; s.board.forEach((b, i) => { b.clock = i ? 1 : 5; b.at = 'ddb'; });
    const costs = s.board.slice(1).map(b => b.cost); SD.ic.settle(s, s.board[0], { ok: true, conf: 1, pts: 2 });
    const coo = s.budget;
    const t = JSON.parse(JSON.stringify(SD.state.save.ic)); t.sim = true; t.perks = { bru: 1 }; t.acts = 0; t.at = 'apigw'; t.board.forEach(b => { b.clock = 6; });
    SD.ic.walk(t, 'lambda'); const free = t.board.map(b => b.clock); SD.ic.walk(t, 'apigw');
    return [costs, coo, free.every(c => c === 6), t.board.every(b => b.clock === 5)];
  });
  check(perks[1] === 100 - Math.ceil(perks[0][0] / 2) - perks[0].slice(1).reduce((a, b) => a + b, 0), `Coo: the next timeout costs half (${perks[1]}%)`);
  check(perks[2] && perks[3], 'Bru: one free step each wave, then steps tick again');
  // The shift's retry cap: with none left, a miss is logged as missed even when a twin exists.
  const cap = await page.evaluate(() => {
    const s = JSON.parse(JSON.stringify(SD.state.save.ic)); s.sim = true; s.perks = {}; s.reruns = 2;
    s.board.forEach(b => { b.clock = 9; b.tries = 0; }); const n = s.board.length, q0 = s.board[0].q;
    SD.ic.settle(s, s.board[0], { ok: false, conf: 0, pts: 0 });
    return [s.board.length === n - 1, !s.board.some(b => b.q === q0)];
  });
  check(cap[0] && cap[1], 'with the shift\'s 2 retries used, a miss goes to the major incident');
  check(/Retries left/.test(await txt('.ic-hud')), 'the HUD shows the retries left');

  // ---- 0%: retry the wave in one tap, or end ----
  const toZero = () => page.evaluate(() => { const s = SD.state.save.ic; s.budget = 5; s.board[0].at = s.at; s.board[0].found = true; SD.state.persist(); SD.ic.board(); });
  await toZero();
  await work(0, false, 2);
  check((await ic()).phase === 'zero' && /Retry this wave/.test(await txt('#panel')), 'a Sure miss at 5% stops the shift at 0% with "Retry this wave"');
  check(/Kyu never woke me/.test(await txt('#panel')), 'Uptima wakes up at 0%');
  const logged = (await ic()).log.length;
  await page.click('#ic-retry');
  const r1 = await ic();
  check(r1.phase === 'board' && r1.budget > 0 && r1.board.length === r1.waveStart.board.length && r1.log.length === logged, 'retry restarts the wave and keeps the answers logged');
  await toZero();
  await work(0, false, 2);
  await page.click('#ic-end');
  const s9 = await ic();
  check(s9.phase === 'done' && s9.zero, 'End the shift: results at 0%');
  check(!/\+20 XP/.test(await txt('#panel')), 'a later shift today pays nothing more');
  const back = await page.evaluate(() => SD.state.save.icBacklog.map(x => x.q));
  check(back.length >= 1, `the open incidents wait for the next shift (${back.length})`);
  await page.click('#ic-again');
  await page.waitForSelector('.ic-board');
  const s10 = await ic();
  check(back.slice(0, 4).every(id => s10.board.concat(s10.queue).some(x => x.q === id)), 'the next shift starts with them');
  check(await page.evaluate(() => SD.state.save.wall.length >= 1), 'Sure misses went up on the Wall');

  // ---- The fix card (js/ic-fix.js): picture, exact line, and the first sighting typed out ----
  check(fixes > 0 && typedFix > 0, `settled incidents showed their fix (${fixes}), and first sightings asked to be typed (${typedFix})`);
  const fx = await page.evaluate(() => {
    const F = SD.icFix, q = SD.exam.find('dva-1-104'), f = F.fixOf(q, 'sqs');
    const twinFree = SD.icFix.FIXES.every(x => x.line && x.does && x.name && x.pic);
    const T = F.once(), term = F.termOf(f), before = T.need(term);
    return { id: f && f.id, term, typed: T.match(' MaxReceiveCount ', term), wrongTerm: T.match('maxReceive', term), learned: before && !T.need(term) || before, wrong: F.fixOf({ type: 'mc', opts: ['Raise the visibility timeout', 'Add a dead-letter queue'], a: 0 }, 'sqs').id, twinFree, shared: !!SD.typeOnce || F.once() === F.fallback };
  });
  check(fx.id === 'dlq' && fx.term === 'maxReceiveCount' && fx.typed && !fx.wrongTerm && fx.wrong === 'vis' && fx.twinFree && fx.shared, 'a fix comes from the right answer only, its key token is what you type (case and spaces ignored, the shared rule), and every fix has a picture, a line and what it does');
  check(await page.evaluate(() => Object.keys(SD.state.save.typed || {}).length > 0), 'typed tokens land in the shared store (S.save.typed), so they count in every mode');
  const fixShot = await page.evaluate(async () => {
    const s = SD.state.save.ic, q = SD.exam.find('dva-1-104');
    const inc = { q: q.id, at: 'sqs', fmt: 0 };
    const f = SD.ic.fixFor(inc, q);
    return !!f;
  });
  check(fixShot, 'the fix is found for a bank incident and never for a format check');

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page or console errors');
  if (fails.length) { console.error(`${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('OK: the Incident Commander checks all pass, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
