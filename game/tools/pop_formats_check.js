// Headless check of The Lost and Found's question formats (js/mode-pop-formats.js, storyboard v7, nights 2 to 5) at
// phone width (375px): night 2 teaches spot the line on Burning Peak's Lost item (worked, then practice, inside the
// 13-check cap, never in a fight); the next Burning Peak claim opens with a spot item matching its stamped domain,
// stamped "SPOT THE LINE · <domain> · 2 steps · half if one's right" before you stake; a partly right answer lands
// at half the multiplier and costs half the wrong cost, with no Wall, logged apart from the hypothesis, and brings a
// verified bank question on its topic next night; no bank check tonight shares a format item's concept unless it's
// tagged. Night 5 opens a Thornwick claim with compare (right and Sure lands x1.25), leaves 1 in 4 bank checks
// unstamped, and the proof sheet has its formats line. The taper by date (one format check from Nov 27, none and all
// unstamped on Nov 28 and 29; night 5's 1 in 4 unstamped only from Dec 1, the rule freeze), and the simulator's own
// format accuracy and partial x0.5. No page errors.
// Run from game/:  node tools/pop_formats_check.js     SHOTS=dir saves screenshots.
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
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'popf-' + name + '.png'), fullPage: true }); };
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const pop = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.pop)));
  const txt = async sel => ((await page.textContent(sel)) || '').replace(/\s+/g, ' ');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  // Answers the format item on screen: how = 'right' | 'partial' | 'wrong', then a confidence and Continue.
  const answerFmt = (id, how, conf) => page.evaluate(async ([id, how, conf]) => {
    const it = SD.modes.fmtItem(id), p = document.querySelector('#panel');
    const w = ms => new Promise(r => setTimeout(r, ms));
    const click = async sel => { const el = p.querySelector(sel); if (!el) throw new Error('missing ' + sel); el.click(); await w(10); };
    if (it.type === 'spot') {
      await click(`[data-qf-line="${how === 'wrong' ? (it.bad + 1) % it.lines.length : it.bad}"]`);
      await click(`[data-qf-reason="${how === 'right' ? it.a : (it.a + 1) % it.reasons.length}"]`);
    } else if (it.type === 'compare') {
      for (let k = 0; k < 4 && !p.querySelector(`[data-qf-col="${it.a}"]`); k++) await click('#qf-next');
      await click(`[data-qf-col="${how === 'right' ? it.a : (it.a + 1) % it.cols.length}"]`);
      await click(`[data-qf-row="${it.key}"]`);
    } else if (it.type === 'predict') {
      await click(`[data-qf-opt="${how === 'right' ? it.a : (it.a + 1) % it.opts.length}"]`);
    } else if (it.type === 'seq') {
      const order = it.steps.map((_, i) => 's' + i);
      if (how !== 'right') order.reverse();
      for (const k of order) await click(`[data-qf-pool="${k}"]`);
    }
    await click('#qf-submit');
    await click(`[data-c="${conf}"]`);
    await click('#q-next');
    return it.type;
  }, [id, how, conf]);

  await page.clock.install({ time: new Date('2026-11-17T20:00:00') });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');
  await page.evaluate(() => {
    const s = SD.state.save;
    s.examTrack = 'DVA'; s.examDate = '2026-11-30'; s.todaySkip = true;
    s.modes = s.modes || { seen: {}, cal: SD.modes.newTally() }; s.modes.seen = s.modes.seen || {}; s.modes.seen.pop = Date.now();
    s.modes.popNights = 1;
    SD.state.persist();
  });
  check(await page.evaluate(() => !!(SD.pop && SD.pop.fx)), 'js/mode-pop-formats.js is loaded and hooked in');

  // ================= Night 2: compare and spot, taught on Lost items =================
  const n2 = await page.evaluate(() => {
    const s = SD.pop.newNight();
    s.map.rows = [[{ type: 'lost', home: 'peak' }], [{ type: 'claim', home: 'peak' }], [{ type: 'lost', home: 'thornwick' }], [{ type: 'claim', home: 'thornwick' }]];
    s.phase = 'map'; SD.state.persist(); SD.pop.draw();
    return { s: JSON.parse(JSON.stringify(s)), R: SD.pop.fx.rules(s) };
  });
  check(n2.s.night === 2 && n2.R.formats.join() === 'compare,spot' && n2.R.teach.join() === 'compare,spot', `night 2 adds compare and spot, taught tonight (rules: ${n2.R.formats.join(', ')})`);
  check(n2.s.rooms.length === 9 && n2.s.rooms.every(c => !c.fmt), 'night 2 opens with 9 bank room checks: no format before its practice item');
  check(n2.s.rooms.concat(n2.s.core).filter(c => c.stamped === false).length === 1, 'night 2 leaves only the third core proof unstamped');

  // Burning Peak's Lost item teaches spot the line.
  await page.click('[data-door="0"]');
  let s = await pop();
  check(s.phase === 'teach' && !s.fight, 'Burning Peak\'s Lost item teaches its format, off the fight');
  check(/LOST ITEM · Burning Peak/.test(await txt('#panel')) && /Seo-yeon wants it checked her way: Spot the line/.test(await txt('#panel')), 'the Lost item screen names Seo-yeon\'s format');
  check(/Walk me through one/.test(await txt('.pop-dock')), 'step 1 is the worked item');
  await noHScroll('teach, worked');
  await shot('teach');
  await page.click('#pop-teach');
  await page.waitForSelector('#panel .qf[data-qf-phase="worked"]');
  check(/New format: Spot the line/.test(await txt('#panel')), 'the worked item walks through spot the line');
  check(!await page.$('#panel .pop-stage') && !await page.$('#panel [data-c]'), 'the worked item is on its own screen, with nothing to stake or rate');
  await noHScroll('worked item');
  await shot('worked');
  await page.click('#qf-got');
  await page.waitForSelector('#pop-teach');
  check(/Try the practice one/.test(await txt('.pop-dock')) && /✓ Worked/.test(await txt('.pop-tsteps')), 'step 2 is the practice item');
  await page.click('#pop-teach');
  await page.waitForSelector('#panel .qf-hint');
  check(/Practice/.test(await txt('.qf-hint')) && /Hint:/.test(await txt('.qf-hint')), 'the practice item has one hint and isn\'t scored');
  await noHScroll('practice item');
  s = await pop();
  await answerFmt(s.fx.teach.list[0].practice, 'right', 1);
  await page.waitForSelector('.pop');
  s = await pop();
  check(s.phase === 'lost', 'after the practice item, the Lost item\'s own choice');
  check(s.fx.taught.spot === 2 && !s.fx.taught.compare, 'spot the line is taught; compare waits for Thornwick\'s Lost item');
  check(await page.evaluate(() => (SD.state.save.popFmtTaught || {}).spot === 2), 'taught formats are kept across nights');
  check(s.asked === 2 && s.rooms.length === 7, `the two teaching items take two room checks (asked ${s.asked}, ${s.rooms.length} room checks left)`);
  check(s.asked + s.rooms.length + s.core.length <= 13, 'inside the 13-check cap');
  check(s.fx.log.filter(l => l.teach).map(l => l.teach).join() === 'worked,practice', 'both teaching items are logged with the formats, not the bank');
  check(s.log.length === 0, 'teaching items are not in the bank log');
  await page.click('#pop-leave');

  // The Burning Peak claim opens with a spot item in its stamped domain.
  await page.click('[data-door="0"]');
  await page.waitForSelector('.pop-stage');
  s = await pop();
  const ck = s.rooms[0];
  check(!!ck.fmt && ck.fmt.type === 'spot', 'the claim\'s first check is Seo-yeon\'s spot the line');
  const itemDom = await page.evaluate(id => +String(SD.modes.fmtItem(id).task.dva)[0], ck.fmt.id);
  check(itemDom === ck.d, `the spot item matches the stamped domain (item task domain ${itemDom}, stamp ${ck.d})`);
  const stamp = await txt('.pop-stamp');
  check(/SEO-YEON'S CHECK SPOT THE LINE · (DEVELOPMENT|SECURITY|DEPLOYMENT|TROUBLESHOOTING) · 2 steps · half if one's right/.test(stamp), 'the stamp names the format: ' + stamp.trim());
  const fq = await page.evaluate(id => SD.modes.fmtItem(id).q, ck.fmt.id);
  check(!(await txt('#panel')).includes(fq.slice(0, 40)), 'the item is never on the stake screen');
  await page.click('.pop-what summary');
  check(!!await page.$('.pop-grid .pop-half') && /×0.5 \/ −\d+%/.test(await txt('.pop-half')), 'the stake grid has the half row: ' + (await txt('.pop-half')).trim());
  check(/Wall/.test(await txt('.pop-grid')), 'the grid shows a Sure miss on a format check goes on the Wall');
  await noHScroll('format stake');
  await shot('fstake');
  // No hint across formats: nothing planned tonight shares the item's concept unless tagged.
  const leak = await page.evaluate(() => { const s = SD.state.save.pop, X = SD.pop.fx; return s.rooms.concat(s.core).filter(c => !c.fmt && s.fx.covered.includes(X.bkey(SD.exam.find(c.q))) && !c.near && c.kind !== 'carry').length; });
  check(leak === 0, 'no bank check tonight tests a concept a format item covered (or it is tagged)');

  await page.click('#pop-all');
  s = await pop();
  const st = await page.evaluate(() => { const s = SD.state.save.pop; return SD.pop.stakeOf(s, s.fight.sel); });
  const sev0 = s.fight.sev, bud0 = s.budget, wall0 = await page.evaluate(() => (SD.state.save.wall || []).length);
  await page.click('#pop-open');
  await page.waitForSelector('#panel .qf-spot');
  check(!await page.$('#panel .pop-stage'), 'the spot item opens on its own screen');
  await noHScroll('spot item in a fight');
  await shot('fitem');
  await answerFmt(ck.fmt.id, 'partial', 1);
  await page.waitForSelector('.pop-since');
  s = await pop();
  const half = st.list.reduce((a, c) => a + Math.round(c.hit * 0.5), 0);
  check(/½ Partly right · Think so · ×0.5/.test(await txt('.pop-since')), 'partly right lands at half: ' + (await txt('.pop-since')).trim());
  check(s.fight.sev === Math.max(0, sev0 - half), `half the multiplier: Think so lands at ×0.5 (severity ${sev0} → ${s.fight.sev})`);
  check(s.budget === Math.max(0, bud0 - Math.round(st.total * 0.125)), `half the wrong cost: an eighth of the stake (${bud0}% → ${s.budget}%)`);
  check(await page.evaluate(n => (SD.state.save.wall || []).length === n, wall0), 'partly right goes on no Wall');
  const fl = s.fx.log.filter(l => !l.teach);
  check(fl.length === 1 && fl[0].result === 'partial' && fl[0].partial && fl[0].format === 'spot' && fl[0].domain === ck.d && fl[0].stake === st.list.length, 'the format check is logged apart: format, domain, stake, result, partial');
  check(!s.log.some(l => l.q === ck.fmt.id), 'and kept out of the bank log the hypothesis reads');
  const carry = s.carryNext.find(c => c.why === 'format');
  const carryOk = carry && await page.evaluate(([qid, fid]) => { const q = SD.exam.find(qid), it = SD.modes.fmtItem(fid); return SD.topicDrill.isVerified(q) && SD.pop.fx.bkey(q).split('|')[0] === SD.pop.fx.fkey(it).split('|')[0]; }, [carry.q, ck.fmt.id]);
  check(!!carryOk, 'the missed item brings a verified bank question on its topic next night');
  await noHScroll('partly right land');
  await shot('fland');

  // ================= Night 5: all four formats, 1 in 4 unstamped =================
  const n5 = await page.evaluate(() => {
    SD.state.save.modes.popNights = 4;
    SD.state.save.popFmtTaught = { compare: 2, spot: 2, predict: 3, seq: 3 };
    const s = SD.pop.newNight({ day: '2026-11-26' });
    s.map.rows = [[{ type: 'claim', home: 'thornwick' }], [{ type: 'claim', home: 'peak' }]];
    s.phase = 'map'; SD.state.persist(); SD.pop.draw();
    const bank = s.rooms.concat(s.core);
    return { night: s.night, R: SD.pop.fx.rules(s), un: bank.filter(c => c.stamped === false).length, n: bank.length };
  });
  check(n5.night === 5 && n5.R.formats.length === 4 && n5.R.maxFormats > 1, 'night 5 before Nov 27: all four formats');
  check(n5.un === 1, `night 5 before Dec 1 (the rule freeze): only the third core proof unstamped (${n5.un} of ${n5.n}); 1 in 4 from Dec 1 is checked with the taper`);
  await page.click('[data-door="0"]');
  await page.waitForSelector('.pop-stage');
  s = await pop();
  const c5 = s.rooms[0];
  check(c5.fmt && c5.fmt.type === 'compare' && c5.stamped !== false, 'a Thornwick claim opens with Mira\'s compare, stamped');
  check(/MIRA'S CHECK COMPARE · (DEVELOPMENT|SECURITY|DEPLOYMENT|TROUBLESHOOTING) · 2 steps · both must be right/.test(await txt('.pop-stamp')), 'the compare stamp: ' + (await txt('.pop-stamp')).trim());
  await noHScroll('night 5 stake');
  await page.click('#pop-all');
  const st5 = await page.evaluate(() => { const s = SD.state.save.pop; return SD.pop.stakeOf(s, s.fight.sel); });
  const sev5 = s.fight.sev;
  await page.click('#pop-open');
  await page.waitForSelector('#panel .qf-compare');
  await noHScroll('compare item');
  await shot('compare');
  await answerFmt(c5.fmt.id, 'right', 2);
  await page.waitForSelector('.pop-since');
  s = await pop();
  check(/✓ PROVEN · Sure · ×1.25/.test(await txt('.pop-since')), 'compare right and Sure lands PROVEN at ×1.25');
  check(s.fight.sev === Math.max(0, sev5 - st5.list.reduce((a, c) => a + Math.round(c.hit * 1.25), 0)), 'the staked hits landed at ×1.25');
  check(await page.evaluate(() => SD.state.save.modes.cal[2][1] === 0), 'format checks stay out of the bank calibration');
  // Sure and wrong on a format check: its bank question goes up on the Wall (a Think so miss doesn't).
  const sw = await page.evaluate(id => {
    const s = SD.state.save.pop, ck = { fmt: { id, type: 'compare', home: 'thornwick' }, d: 1 }, w = () => (SD.state.save.wall || []).length;
    const w0 = w(); SD.pop.fx.miss(s, ck, 1); const w1 = w(); const c1 = s.carryNext.length;
    SD.pop.fx.miss(s, ck, 2); const w2 = w(), top = (SD.state.save.wall || []).slice(-1)[0];
    return { think: w1 - w0, sure: w2 - w1, bank: !!(top && SD.exam.find(top.id)), v: SD.pop.fx.verdict({ ok: false, conf: 2, staked: 2, cost: 9 }), carried: c1 > 0 };
  }, c5.fmt.id);
  check(sw.think === 0 && sw.sure === 1 && sw.bank && sw.carried, `a Sure miss on a format check puts its bank question on the Wall (Think so: +${sw.think}, Sure: +${sw.sure})`);
  check(/BACKFIRE · Sure, and wrong · −9% budget · its bank question goes on the Wall/.test(sw.v), 'the Sure miss verdict says so: ' + sw.v);
  await noHScroll('night 5 land');
  // The proof sheet's formats line, and the hypothesis log.
  await page.evaluate(() => { const s = SD.state.save.pop; s.fight = null; SD.pop.finish(s, 'retreat'); SD.state.persist(); SD.pop.draw(); });
  check(/Formats: compare 1 of 1\./.test(await txt('#panel')), 'the proof sheet has one line on format results: ' + ((await txt('.pop-fline')) || '').trim());
  const hist = await page.evaluate(() => ({ h: SD.state.save.popHist || [], f: SD.state.save.popFmtHist || [] }));
  check(!hist.h.some(l => /^fmt-/.test(l.q)) && !hist.h.some(l => l.near), 'the hypothesis log has no format checks and no tagged bank checks');
  check(hist.f.some(l => l.format === 'compare' && l.result === 'right'), 'format checks keep their own log across nights');
  await noHScroll('proof sheet');
  await shot('sheet');
  await page.evaluate(() => SD.ui.closePanel());

  // ================= The taper, by date =================
  const taper = await page.evaluate(async () => {
    let seed = 99; const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const o = {};
    for (const day of ['2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29', '2026-11-30', '2026-12-01']) {
      let max = 0, any = 0;
      for (let k = 0; k < 30; k++) { const r = await SD.pop.sim({ p: 0.7, pf: 0.6, conf: 'honest', stake: 'all', route: 'near', night: 4, day }, rng); max = Math.max(max, r.formats.length); any += r.formats.length; }
      const s = SD.pop.newNight({ sim: true, night: 4, day }), bank = s.rooms.concat(s.core);
      o[day] = { max, any, un: bank.filter(c => c.stamped === false).length, n: bank.length, R: SD.pop.fx.rules(s) };
    }
    return o;
  });
  check(taper['2026-11-26'].max >= 2, `before Nov 27 a night can hold several format checks (up to ${taper['2026-11-26'].max})`);
  check(taper['2026-11-27'].max === 1 && taper['2026-11-27'].R.maxFormats === 1, `from Nov 27 one format check a night (at most ${taper['2026-11-27'].max})`);
  // The rule freeze (js/mode-pop.js): night 5's 1 in 4 unstamped waits for Dec 1, so before then only the third core proof is.
  check(taper['2026-11-27'].un === 1, `Nov 27, night 5 before the freeze lifts: only the third core proof unstamped (${taper['2026-11-27'].un} of ${taper['2026-11-27'].n})`);
  check(taper['2026-12-01'].un === 3 && taper['2026-12-01'].R.maxFormats === 1, `Dec 1, night 5: 1 in 4 bank checks unstamped (${taper['2026-12-01'].un} of ${taper['2026-12-01'].n}), one format check`);
  check(['2026-11-28', '2026-11-29'].every(d => taper[d].any === 0 && taper[d].un === taper[d].n), 'Nov 28 and 29: no format checks, every check unstamped');
  check(taper['2026-11-30'].R.maxFormats === 1 && taper['2026-11-30'].un < taper['2026-11-30'].n, 'Nov 30: one format check again, and not every check unstamped');

  // ================= The simulator: its own format accuracy, partly right at x0.5 =================
  const sim = await page.evaluate(async () => {
    let seed = 5; const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const run = async pol => { const rs = []; for (let k = 0; k < 60; k++) rs.push(await SD.pop.sim(pol, rng)); return rs.flatMap(r => r.formats); };
    const n1 = await run({ p: 0.6, conf: 'honest', stake: 'all', route: 'near', night: 0, day: '2026-11-20' });
    const lo = await run({ p: 0.8, pf: 0.2, conf: 'honest', stake: 'all', route: 'near', night: 3, day: '2026-11-20' });
    const hi = await run({ p: 0.2, pf: 0.9, conf: 'honest', stake: 'all', route: 'near', night: 3, day: '2026-11-20' });
    const rate = L => L.filter(l => l.result === 'right').length / Math.max(1, L.length);
    // Landing on the state machine: Sure, partly right; then an unscored round.
    const s = SD.pop.newNight({ sim: true, night: 4, day: '2026-11-20' }); s.phase = 'map';
    s.map.rows = [[{ type: 'claim', home: 'peak' }]];
    SD.pop.go(s, 0);
    const ck = SD.pop.peek(s), f = s.fight;
    f.sel = SD.pop.stakeAll(s);
    const stv = SD.pop.stakeOf(s, f.sel), sev = f.sev, bud = s.budget;
    SD.pop.lock(s);
    SD.pop.settle(s, { ok: false, conf: 2, pts: -3, scored: true, partial: 0.5 });
    const part = { fmt: ck.fmt && ck.fmt.type, sev: sev - f.sev, want: stv.list.reduce((a, c) => a + Math.round(c.hit * 0.625), 0), cost: bud - s.budget, wantCost: Math.round(stv.total * 0.375) };
    const s2 = SD.pop.newNight({ sim: true, night: 4, day: '2026-11-20' }); s2.phase = 'map'; s2.map.rows = [[{ type: 'claim', home: 'peak' }]];
    SD.pop.go(s2, 0); const f2 = s2.fight; f2.sel = SD.pop.stakeAll(s2); const sv2 = f2.sev, b2 = s2.budget;
    SD.pop.lock(s2); const out = SD.pop.settle(s2, { ok: true, conf: 2, pts: 0, scored: false });
    return { n1: n1.length, lo: rate(lo), hi: rate(hi), nlo: lo.length, partial: hi.concat(lo).some(l => l.result === 'partial'), part, unscored: { sev: sv2 - f2.sev, cost: b2 - s2.budget, guard: out.guard, ok: out.ok } };
  });
  check(sim.n1 === 0, 'the simulator\'s night 1 has no format checks');
  check(sim.nlo > 20 && sim.lo < 0.35 && sim.hi > 0.75, `format checks draw their own accuracy (pf 0.2: ${(sim.lo * 100).toFixed(0)}% right, pf 0.9: ${(sim.hi * 100).toFixed(0)}%)`);
  check(sim.partial, 'the simulator brings back partly right results');
  check(sim.part.fmt === 'spot' && sim.part.sev === sim.part.want && sim.part.cost === sim.part.wantCost, `partly right on Sure lands at ×0.625 and costs ⅜ of the stake (hit ${sim.part.sev}/${sim.part.want}, cost ${sim.part.cost}/${sim.part.wantCost})`);
  check(sim.unscored.sev === 0 && sim.unscored.cost === 0 && sim.unscored.guard === 0 && !sim.unscored.ok, 'an unscored round pays 0 and lands nothing');

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  check(!errors.length, 'no page errors');
  if (fails.length) { console.error(`${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('OK: The Lost and Found format checks all pass, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
