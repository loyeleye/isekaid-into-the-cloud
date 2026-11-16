// Headless check of The Lost and Found (js/mode-pop.js, storyboard v7, night 1) at phone width (375px): the picker,
// the first-run walkthrough on a real check, the arrival, the narrow map (rows of 1, 2, 2, 3, then the Hunch), the
// stake taught over turns (turn 1 Stake all or none only, then card by card), the stamp naming only the domain, the
// question on its own screen with the whole stem, the shared stakes, landing at x0.75 / x1 / x1.25, a Sure miss
// costing three quarters of the stake and going on the Wall, unstaked cards played small, claims cleared with a
// reward and a find, Lost items and the break room asking nothing, stopping with the stake locked and resuming after
// a reload, the Hunch with loose and core proofs, 0% with retreat or escalate, the proof sheet and the ledger.
// Run from game/:  node tools/pop_check.js     SHOTS=dir saves screenshots. W=1280 H=800 runs it at desktop width.
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
  const page = await browser.newPage({ viewport: { width: +(process.env.W || 375), height: +(process.env.H || 667) } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'pop-' + name + '.png') }); };
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


  const next = () => page.click('#q-next');
  const pop = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.pop)));
  const txt = sel => page.textContent(sel);
  const phase = async () => (await pop()).phase;

  await page.clock.install({ time: new Date('2026-11-17T20:00:00') });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  // ---- Picker and first run ----
  await page.evaluate(() => SD.modes.open());
  check(/The Lost and Found/.test(await txt('#panel')), 'the picker lists The Lost and Found');
  check(/Host: Dutch/.test(await txt('[data-mode="pop"]')), 'its host is Dutch');
  await page.click('[data-mode="pop"]');
  check(/Step 1 of 3/.test(await txt('#panel')), 'the first run opens the 3-step walkthrough');
  const s0 = await pop();
  const firstAsk = await page.evaluate(id => SD.modes.split(SD.exam.find(id)).ask, s0.rooms[0].q);
  check((await txt('.md-walk')).includes(firstAsk.slice(0, 40)), 'step 1 shows a real check from tonight');
  await noHScroll('walkthrough');
  await page.click('#md-next'); await page.click('#md-next'); await page.click('#md-next');

  // ---- The night's checks ----
  const all0 = s0.rooms.concat(s0.core);
  check(s0.rooms.length === 9 && s0.core.length === 3, `a night is 9 room checks and 3 core proofs (${s0.rooms.length} + ${s0.core.length})`);
  const doms = all0.reduce((a, c) => { a[c.d] = (a[c.d] | 0) + 1; return a; }, {});
  check([1, 2, 3, 4].every(d => doms[d] >= 1) && Object.values(doms).reduce((a, b) => a + b, 0) === 12, 'every domain is in the night (' + JSON.stringify(doms) + ')');
  check(new Set(all0.map(c => c.q)).size === 12, 'no question repeats in a night');
  const ex = await page.evaluate(ids => ids.every(id => ['mc', 'multi'].includes(SD.exam.find(id).type)), all0.map(c => c.q));
  check(ex, 'every check is an exam-style bank question');
  const ver = await page.evaluate(ids => ids.filter(id => SD.topicDrill.isVerified(SD.exam.find(id))).length, all0.map(c => c.q));
  check(ver === 12, `every check is verified against AWS docs (${ver} of 12)`);
  check(s0.core[2].stamped === false, 'the third core proof is unstamped (never seen)');

  // ---- Arrive ----
  check(/Freya:/.test(await txt('#panel')) && /That's a claim/.test(await txt('#panel')), 'night 1 opens with Freya\'s speaker and Dutch');
  check(!!await page.$('.pop-sky .pop-hunch'), 'the Hunch looms (silhouette until its art is made)');
  await noHScroll('arrive');
  await shot('arrive');
  await page.click('#pop-in');

  // ---- The map ----
  const rows = (await pop()).map.rows.map(r => r.length);
  check(JSON.stringify(rows) === '[1,2,2,3]', 'night 1 is narrow: rows of 1, 2, 2, 3 (' + rows.join(', ') + ')');
  check(await page.$$eval('.pop-door.reach', d => d.length) === 1, 'only the first door is open');
  check(await page.$$eval('.pop-door.fog', d => d.length) === 5, 'rows further on are fogged');
  check(/Claim · Thornwick/.test(await txt('.pop-door.reach')), 'the first room is a Thornwick claim');
  check(!!await page.$('#pop-hunch[disabled]'), 'the Hunch is at the top, not yet open');
  await noHScroll('map');
  await shot('map');
  await page.click('[data-door="0"]');

  // ---- Turn 1: the stake, taught ----
  await page.waitForSelector('.pop-stage');
  let s = await pop();
  check(s.phase === 'stake' && s.fight.kind === 'claim' && s.fight.hand.length === 4, 'a claim deals a hand of 4');
  check(/Bog Post/.test(await txt('.pop-stage')) && /hits \d/.test(await txt('.pop-stage')), 'the claim says its intent out loud');
  check(await page.$$eval('.pop-card[disabled]', c => c.length) === 4, 'turn 1: cards are locked, only Stake all or Stake none');
  check(/● Stake all/.test(await txt('.pop-quick')), 'Stake all is preselected');
  const stamp = await txt('.pop-stamp');
  check(/DEVELOPMENT|SECURITY|DEPLOYMENT|TROUBLESHOOTING/.test(stamp), 'the stamp names the domain: ' + stamp.replace(/\s+/g, ' ').trim());
  const stem0 = await page.evaluate(id => SD.exam.find(id).q, s.rooms[0].q);
  check(!(await txt('#panel')).includes(stem0.slice(0, 40)), 'the question is never on the stake screen');
  check(/Right: up to/.test(await txt('.pop-sum')) && /Wrong: up to −\d+% budget/.test(await txt('.pop-sum')), 'the stake line says what it can win and lose');
  await noHScroll('stake');
  await shot('stake');
  const st1 = await page.evaluate(() => { const s = SD.state.save.pop; return SD.pop.stakeOf(s, s.fight.sel); });
  const sev0 = s.fight.sev;
  await page.click('#pop-open');
  await page.waitForSelector('#panel .win.quiz');
  check(!await page.$('#panel .pop-stage') && !await page.$('#panel .pop-map'), 'the question opens on its own screen');
  check((await txt('.q-q')) === await page.evaluate(() => SD.modes.current().q), 'the whole stem shows');
  check(!!await page.$('#md-stop'), 'the question keeps Stop for now');
  await noHScroll('question');
  await shot('question');
  await answer(true, 2);
  check(/Sure, right: \+3/.test(await txt('.verdict-row')), 'the verdict shows the shared stakes');
  await next();
  await page.waitForSelector('.pop-since');
  s = await pop();
  check(/PROVEN · Sure · ×1.25/.test(await txt('.pop-since')), 'Sure and right lands PROVEN at ×1.25');
  check(s.fight.sev === Math.max(0, sev0 - st1.list.reduce((a, c) => a + Math.round(c.hit * 1.25), 0)), `the staked hits landed at ×1.25 (severity ${sev0} → ${s.fight.sev})`);
  check(s.fight.guard === st1.list.reduce((a, c) => a + Math.round(c.guard * 1.25), 0), 'the staked guards went up at ×1.25');
  check(s.pts === 3 && s.budget === 100, 'right: +3 points and no budget lost');
  await noHScroll('land');
  await shot('land');
  const b0 = s.budget, g0 = s.fight.guard, hit0 = await page.evaluate(() => SD.pop.intent(SD.state.save.pop));
  // Any capacity left plays small.
  const bas = await page.$('[data-bas][data-k="guard"]');
  if (bas) { await bas.click(); check((await pop()).fight.guard === g0 + 3, 'an unstaked card plays as Guard 3'); }
  const g1 = (await pop()).fight.guard;
  await page.click('#pop-end');
  s = await pop();
  check(s.budget === Math.max(0, b0 - Math.max(0, hit0 - g1)), `the claim hit ${hit0} against Guard ${g1} (budget ${b0}% → ${s.budget}%)`);

  // ---- Turn 2: card by card, a Sure miss ----
  if (s.phase === 'stake') {
    check(await page.$$eval('.pop-card[disabled]', c => c.length) === 0, 'turn 2: cards toggle one by one');
    await page.click('#pop-none');
    await page.click('[data-card="0"]');
    s = await pop();
    check(s.fight.sel.length === 1 && s.fight.sel[0] === 0, 'tapping a card stakes it');
    const st2 = await page.evaluate(() => { const s = SD.state.save.pop; return SD.pop.stakeOf(s, s.fight.sel); });
    const wall0 = await page.evaluate(() => (SD.state.save.wall || []).length);
    const bud = s.budget;
    await page.click('#pop-open');
    await page.waitForSelector('#panel .win.quiz');
    await answer(false, 2);
    await next();
    await page.waitForSelector('.pop-since');
    s = await pop();
    check(/BACKFIRE/.test(await txt('.pop-since')), 'Sure and wrong: BACKFIRE');
    check(s.budget === Math.max(0, bud - Math.round(st2.total * 0.75)), `it costs three quarters of the stake (${bud}% → ${s.budget}%)`);
    check(await page.evaluate(n => (SD.state.save.wall || []).length > n, wall0), 'and goes on the Wall');
    check(s.pts === 0, 'a Sure miss costs 3 points');
    check(s.carryNext.length >= 1 || s.rooms.some(c => c.kind === 'practice'), 'the missed idea comes back (a twin, or the question, next night)');
    check(/next to mine/.test(await txt('#panel')), 'Dutch owns his own miss, not a glare');
    await page.click('#pop-end');
  }

  // ---- Stop with the stake locked; reload; resume ----
  for (let k = 0; k < 6 && (await phase()) !== 'stake'; k++) {
    const ph = await phase();
    if (ph === 'reward') await page.click('[data-take]');
    else if (ph === 'map') await page.click('[data-door]');
    else if (ph === 'lost') await page.click('#pop-leave');
    else if (ph === 'break') await page.click('#pop-rest');
    else if (ph === 'zero') await page.click('#pop-esc');
    else if (ph === 'land') await page.click('#pop-end');
  }
  if ((await phase()) === 'stake') {
    await page.click('#pop-open');
    await page.waitForSelector('#md-stop');
    await page.click('#md-stop');
    const sl = await pop();
    check(sl.phase === 'locked' && sl.fight.check, 'Stop for now before answering keeps the stake locked');
    await page.evaluate(() => sessionStorage.setItem('keep', '1'));
    await page.reload();
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    await page.click('#t-start');
    await page.waitForSelector('#today-card:not([hidden])');
    await page.evaluate(() => SD.modes.open());
    check(/Resume · \d+ of \d+ checks · Budget \d+%/.test(await txt('[data-mode="pop"]')), 'after a reload the picker offers Resume: ' + (await txt('[data-mode="pop"]')).replace(/\s+/g, ' ').trim().slice(-50));
    await page.click('[data-mode="pop"]');
    await page.waitForSelector('.pop');
    check(/Your stake is locked/.test(await txt('#panel')) && /still sealed/.test(await txt('#panel')), 'resume shows the locked stake, never the question');
    await noHScroll('resume');
    await shot('resume');
    const rq = (await pop()).fight.check.q;
    await page.click('#pop-open');
    await page.waitForSelector('#panel .win.quiz');
    check(await page.evaluate(() => SD.modes.current().id) === rq, 'opening it asks the same sealed check');
    await answer(true, 1);
    await next();
    await page.waitForSelector('.pop-since');
  }

  // ---- Play the night out: rooms, then the Hunch ----
  const seen = new Set();
  let shots = new Set(), right = true;
  for (let k = 0; k < 120; k++) {
    const st = await pop();
    if (st.phase === 'sheet') break;
    seen.add(st.phase + (st.fight ? ':' + st.fight.kind : ''));
    if (st.phase === 'map') {
      if (!shots.has('map2')) { shots.add('map2'); await noHScroll('map, later'); }
      const hb = await page.$('#pop-climb');
      if (hb) { await hb.click(); continue; }
      // Visit a Lost item or a break room when one is open.
      const doors = await page.$$eval('[data-door]', d => d.map(x => [x.dataset.door, x.textContent]));
      const pref = doors.find(d => /Lost item|Break/.test(d[1])) || doors[0];
      await page.click(`[data-door="${pref[0]}"]`);
      continue;
    }
    if (st.phase === 'reward') {
      check(/CLAIM CLEARED/.test(await txt('#panel')), 'a cleared claim offers its homeland\'s cards');
      if (!shots.has('reward')) { shots.add('reward'); await noHScroll('reward'); await shot('reward'); }
      await page.click('[data-take]'); continue;
    }
    if (st.phase === 'lost') {
      check(!await page.$('.q-q'), 'a Lost item asks no question');
      if (!shots.has('lost')) { shots.add('lost'); await noHScroll('lost item'); await shot('lost'); }
      await page.click('#pop-fix'); await page.click('[data-up="0"]'); continue;
    }
    if (st.phase === 'break') {
      if (!shots.has('break')) { shots.add('break'); await noHScroll('break room'); await shot('break'); }
      await page.click('#pop-rest'); continue;
    }
    if (st.phase === 'zero') {
      check(/Retreat/.test(await txt('#panel')) && /Escalate/.test(await txt('#panel')), 'at 0%: retreat or escalate');
      await page.click('#pop-esc'); continue;
    }
    if (st.phase === 'land') { await page.click('#pop-end'); continue; }
    if (st.phase === 'stake' || st.phase === 'locked') {
      if (st.fight.kind === 'hunch' && !shots.has('hunch')) { shots.add('hunch'); await noHScroll('the Hunch'); await shot('hunch'); check(/Trust me/.test(await txt('.pop-stage')), 'the Hunch says "Trust me"'); }
      await page.click('#pop-open');
      await page.waitForSelector('#panel .win.quiz');
      await answer(right, 1); right = !right || st.fight.kind === 'hunch';
      await next();
      await page.waitForSelector('.pop');
      continue;
    }
  }
  const sN = await pop();
  check(seen.has('stake:hunch'), 'the night reaches the Hunch');
  check(sN.phase === 'sheet' && ['won', 'lost', 'retreat'].includes(sN.how), 'the night ends on the proof sheet (' + sN.how + ')');
  check(sN.asked >= 10 && sN.asked <= 13, `a night asks 12 or so checks, 13 at most (${sN.asked})`);
  const sheet = (await txt('#panel')).replace(/\s+/g, ' ');
  check(/Night score: .*held .*cleared .*points/.test(sheet), 'the sheet scores proofs held, claims cleared and points');
  check(/Study: tomorrow's topic drill is/.test(sheet) && /Exam habit/.test(sheet), 'one study step and one exam habit');
  check(/\+20 XP · \+5 shards/.test(sheet), 'the night pays XP and shards once a day');
  check(/Why did that work/.test(sheet), 'Pip asks why it worked');
  if (sN.how === 'won') check(/Pffffbbbt/.test(sheet), 'the Hunch deflates');
  await noHScroll('proof sheet');
  await shot('sheet');
  await page.click('#pop-ledger');
  check(/THE LEDGER · \d+ of 12/.test(await txt('#panel')), 'the ledger holds 12 finds');
  const found = await page.evaluate(() => Object.keys(SD.state.save.popLedger || {}).length);
  check(found >= 1, `tonight's finds are in the ledger (${found})`);
  await noHScroll('ledger');
  await shot('ledger');
  await page.click('#pop-lback');
  await page.click('#pop-done');
  check(await page.evaluate(() => SD.state.save.modes.popNights) === 1, 'one night counted');
  const carry = await page.evaluate(() => (SD.state.save.popCarry || []).map(c => c.q));

  // ---- Night 2: carried-over checks open in the first 5 ----
  const s2 = await page.evaluate(() => { const s = SD.pop.newNight(); return JSON.parse(JSON.stringify(s)); });
  check(s2.night === 2, 'the next night is night 2');
  const first5 = s2.rooms.slice(0, 5).filter(c => c.kind === 'carry').length;
  check(first5 === Math.min(3, carry.length), `missed ideas come back: ${first5} in the first 5 checks (of ${carry.length} carried)`);
  check(s2.rooms.length + s2.core.length === 12, 'night 2 is 12 checks too');

  // ---- 0% on the state machine: escalate sets min(20%, what you came in with) and the Hunch hits 3 harder ----
  const z = await page.evaluate(() => {
    const s = SD.pop.newNight({ sim: true }); s.phase = 'map';
    SD.pop.go(s, 0); s.entry = 60; s.budget = 0; s.phase = 'zero';
    const h0 = 14 + 3 * 0;
    SD.pop.escalate(s);
    const t = SD.pop.newNight({ sim: true }); t.map.row = 3; t.esc = 1; SD.pop.startHunch(t);
    return [s.budget, s.esc, SD.pop.hunchHit(t), t.fight.looseWaiting];
  });
  check(z[0] === 20 && z[1] === 1, `escalate: back in at 20% (${z[0]}%)`);
  check(z[2] === 14 + 3 * z[3] + 3, `the Hunch hits 14, +3 per loose proof, +3 per escalation (${z[2]} with ${z[3]} loose)`);

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page or console errors');
  if (fails.length) { console.error(`${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('OK: The Lost and Found checks all pass, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
