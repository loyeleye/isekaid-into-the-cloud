// Headless check of the Counterfeit Table (js/mode-table.js on js/duel-core.js), the Look-Alike Cup's new rules, at
// phone width (375px): the picker opens it, night 1 is Dupli-Queue only with no walkthrough, the felt shows nine jobs,
// his open pin and your four pins; placing and calling run a test with its lines; the board ends in his ledger and
// the bill on the plain exam screen; stopping and resuming after a reload; and night 3's two boards and the
// Counterfeit Rack, through to the end screen. "Check the clasp": every pin and job that can be called has a deciding
// property and two beside-the-point ones (data, before the browser); calling turns his pin over to three chips, a
// wrong pick shows the one that decided it and a right one says so, and the test runs after either.
// Run from game/:  node tools/table_check.js     SHOTS=dir saves screenshots.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };

// ---- The clasp's data: every pin his stock can put on a job (genuine or fake, as T.stockFor deals them) ----
{
  const T = require('../js/duel-core.js'), bad = [], props = [];
  let n = 0;
  Object.keys(T.PINS).forEach(p => {
    const P = T.PINS[p];
    if (!P.props || P.props.length < 3 || P.props.length > 5) props.push(p + ' has ' + (P.props ? P.props.length : 0) + ' properties');
    (P.props || []).forEach(x => { if (!x.t || x.t.length > 56) props.push(x.id + ' text'); x.d.forEach(nd => { if (!T.NEEDS[nd]) props.push(x.id + ' names ' + nd); }); });
  });
  Object.keys(T.SETS).forEach(set => {
    T.needsOf(set).map(x => [x]).concat(T.pairs(set)).forEach(needs => {
      const job = { set, needs }, h = T.holders(job);
      let l = needs.length > 1 ? T.pinsOf(set).filter(p => !h.includes(p) && needs.some(x => T.holds(p, x))) : T.NEEDS[needs[0]].lure.filter(p => !h.includes(p));
      if (!l.length) l = T.pinsOf(set).filter(p => !h.includes(p));
      h.concat(l).forEach(p => [0, 1, 2].forEach(salt => {
        n++;
        const c = T.clasp(p, job, salt), test = T.test(p, job);
        const want = test.ok ? needs[0] : test.lines.find(x => !x.ok).need;
        const ok = c && c.chips.length === 3 && new Set(c.chips).size === 3 && c.chips.includes(c.decide) && c.need === want && T.prop(c.decide).d.includes(want) &&
          c.chips.filter(id => id !== c.decide).every(id => T.prop(id).d.every(x => !needs.includes(x)));
        if (!ok) bad.push(p + ' on ' + needs.join('+'));
      }));
    });
  });
  check(!props.length, `every pin has 3 to 5 clasp properties with short chip text${props.length ? ': ' + props.slice(0, 5).join(', ') : ''}`);
  check(!bad.length, `every pin and job that can be called (${n / 3} pairings) has a deciding chip and two beside the point${bad.length ? ': ' + [...new Set(bad)].slice(0, 6).join('; ') : ''}`);
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'table-' + name + '.png'), fullPage: true }); };
  const boot = async () => {
    await page.goto(url);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    await page.click('#t-start');
    await page.waitForSelector('#today-card:not([hidden])');
  };
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
  // Edge to edge, like Monster Hunt: the window fills the width, sits flush under the mode bar and reaches the bottom.
  const fills = async where => {
    const r = await page.evaluate(() => {
      document.getAnimations().forEach(a => { try { a.finish(); } catch (e) { /* endless */ } });   // the window's zoom-in, mid-flight under the fake clock
      const w = document.querySelector('#panel .win').getBoundingClientRect(), bar = document.querySelector('#mode-bar').getBoundingClientRect();
      return { staged: document.body.dataset.stage, wide: w.width / innerWidth, top: w.top - bar.bottom, bottom: innerHeight - w.bottom };
    });
    check(r.staged === 'duel' && r.wide > .99 && Math.abs(r.top) < 2 && Math.abs(r.bottom) < 2, `the table fills the screen edge to edge (${where}: ${JSON.stringify(r)})`);
  };
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.table.night)));
  const txt = sel => page.textContent(sel);
  const answer = (right, conf) => page.evaluate(async ([right, conf]) => {
    const p = document.querySelector('#panel'), q = SD.modes.current();
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const said = p.querySelector('#q-said'); if (said) { said.click(); await wait(30); }
    const tf = p.querySelector('#tf-idk'); if (tf) { tf.click(); await wait(10); }
    if (q.type === 'mc') p.querySelector(`[data-o="${right ? q.a : q.opts.findIndex((o, i) => i !== q.a)}"]`).click();
    else if (q.type === 'multi') q.items.forEach((it, i) => { if (right ? it.ok : !it.ok) p.querySelector(`[data-m="${i}"]`).click(); });
    await wait(10);
    p.querySelector(`[data-c="${conf}"]`).click();
    await wait(10);
    return q.id;
  }, [right, conf]);
  // One move that knows the rules: call a fake, else place a pin that holds on the best open square, else call.
  const smartMove = async () => {
    const m = await page.evaluate(() => {
      const T = SD.table, b = SD.state.save.table.night.b;
      if (b.open >= 0 && !T.test(b.pins[b.open], b.jobs[b.open]).ok) return { call: 1 };
      for (const i of [4, 0, 2, 6, 8, 1, 3, 5, 7]) if (!b.cells[i]) { const p = b.hand.find(x => T.test(x, b.jobs[i]).ok); if (p) return { pin: p, sq: i }; }
      return b.open >= 0 ? { call: 1 } : { stand: 1 };
    });
    if (m.call) {
      await page.click('#ct-call');
      // The clasp: tap the property that decides it (the rules know which).
      const id = await page.evaluate(() => { const b = SD.state.save.table.night.b, el = document.querySelector('[data-chip]'); return el ? SD.table.clasp(b.pins[b.open], b.jobs[b.open], b.turns + ':' + b.open).decide : null; });
      if (id) await page.click(`[data-chip="${id}"]`);
    } else if (m.stand) await page.click('#ct-stand');
    else { await page.click(`[data-pin="${m.pin}"]`); await page.click(`[data-sq="${m.sq}"]`); await page.click('#ct-place'); }
    if (await page.$('#ct-next')) await page.click('#ct-next');
    return m;
  };
  const playBoard = async () => { for (let g = 0; g < 14 && (await st()).phase === 'board'; g++) await smartMove(); };
  const payBill = async right => {
    await page.click('#ct-bill');
    for (let g = 0; g < 6 && (await st()).phase === 'bill'; g++) {
      await page.click('#ct-pay');
      await page.waitForFunction(() => (!!SD.modes.current() && document.querySelector('#panel [data-c], #panel #q-said, #panel #tf-idk')) || SD.state.save.table.night.phase !== 'bill' || document.querySelector('#ct-pay'));
      if (await page.$('#panel [data-c], #panel #q-said, #panel #tf-idk')) {
        await answer(right, 1);
        await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
        if (await page.$('#q-next')) await page.click('#q-next');
      }
      await page.waitForFunction(() => document.querySelector('#ct-pay, #ct-done, #ct-test, [data-rival], #ct-go'));
    }
  };

  await page.clock.install({ time: new Date('2026-11-17T20:00:00') });
  await page.addInitScript(() => { window.SD_NO_TYPING = 1; });   // the typing step has its own check
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  // ---- Night 1 ----
  check(await page.evaluate(() => !!SD.table && !!SD.duelTable), 'the table\'s rules and screen load');
  await page.evaluate(() => SD.modes.open());
  check(/every square is a job/i.test(await txt('[data-mode="duel"]')), 'the picker describes the new Cup');
  await page.click('[data-mode="duel"]');
  let t = await txt('#panel');
  check(!/Step 1 of/.test(t), 'no walkthrough screens');
  check(/Each square is a job/.test(t) && /Dupli-Queue/.test(t) && (await page.$$('[data-rival]')).length === 1, 'night 1: Kagemaru\'s first line, Dupli-Queue only');
  await noHScroll('pick'); await shot('pick');
  await page.click('[data-rival="dq"]');
  let s = await st();
  check(s.phase === 'board' && s.b.jobs.every(j => j.set === 'dq'), 'board 1: nine Dupli-Queue jobs');
  check((await page.$$('.ct-sq')).length === 9 && (await page.$$('.ct-hpin')).length === 4, 'the felt has 9 squares and you hold 4 pins');
  const scene = await page.evaluate(() => {
    const k = document.querySelector('.ct-world .w-kage'), u = document.querySelector('.w-bubble'), w = document.querySelector('.ct-world');
    return { kage: k ? Math.round(k.getBoundingClientRect().height) : 0, bubble: !!u && /Kagemaru/.test(u.textContent), world: w ? Math.round(w.getBoundingClientRect().height / innerHeight * 100) : 0 };
  });
  check(scene.kage >= 150 && scene.bubble && scene.world >= 85, `the table is a scene: Kagemaru large behind the counter, his line in a bubble (${JSON.stringify(scene)})`);
  await fills('375px board');
  check(s.b.open >= 0 && !!(await page.$('.ct-sq.open')) && !!(await page.$('#ct-call')), 'his pin lies face up on his square, and you can call it');
  check(/HOLDS|CRACKS/.test(t) === false && /Tap a square|Pick a pin/.test(await txt('#panel')), 'a hint, not a verdict, before you act');
  await noHScroll('table'); await shot('table');
  // Read a job, then place a pin that holds.
  const m = await page.evaluate(() => { const T = SD.table, b = SD.state.save.table.night.b; for (const i of [4, 0, 2, 6, 8, 1, 3, 5, 7]) if (!b.cells[i]) { const p = b.hand.find(x => T.test(x, b.jobs[i]).ok); if (p) return { pin: p, sq: i }; } return null; });
  if (m) {
    await page.click(`[data-sq="${m.sq}"]`);
    check(await page.$eval('.ct-slip', el => el.querySelectorAll('.ct-need').length >= 1), 'tapping a square shows its job in full');
    await page.click(`[data-pin="${m.pin}"]`);
    await page.click('#ct-place');
    t = await txt('#panel');
    check(/The test/.test(t) && /HOLDS/.test(t) && /It held/.test(t), 'placing runs the test, and its first use teaches one line');
    check(!!(await page.$('.ct-bench .ct-tok')) && !!(await page.$('.ct-bench .ct-bpin')), 'the test plays on a bench: the job\'s slip runs into the pin');
    await page.waitForSelector('.ct-bench.done', { timeout: 8000 }).catch(() => {});
    check(!!(await page.$('.ct-bench.done')) && /✓|✕/.test(await txt('.ct-cap')), 'the bench ends on the stamp and the one line that decided it');
    await noHScroll('test'); await fills('test'); await shot('test');
    await page.click('#ct-next');
  } else check(false, 'a pin in hand holds somewhere');
  // ---- Check the clasp: call his pin, it turns over to three chips; a wrong pick, then (next call) a right one ----
  const claspAt = () => page.evaluate(() => { const b = SD.state.save.table.night.b; return b.open >= 0 ? SD.table.clasp(b.pins[b.open], b.jobs[b.open], b.turns + ':' + b.open) : null; });
  const callWith = async (right, keys) => {
    const c = await claspAt();
    if (!c) return null;
    await page.click('#ct-call');
    const shown = await page.$$eval('[data-chip]', els => els.map(e => e.dataset.chip));
    const pick = right ? c.decide : c.chips.find(id => id !== c.decide);
    return { c, shown, pick, focus: await page.evaluate(() => document.activeElement && document.activeElement.dataset.chip || ''), flip: !!(await page.$('.ct-flipin .ct-front img')) && !!(await page.$('.ct-back')), keys };
  };
  let cl = (await st()).phase === 'board' ? await callWith(false) : null;
  if (cl) {
    check(cl.flip && cl.shown.length === 3 && cl.shown.includes(cl.c.decide) && /decides/.test(await txt('.ct-clq')), `calling turns his pin over to three property chips, one of them the deciding one (${cl.shown.join(', ')})`);
    check(cl.focus === cl.shown[0], 'the first chip has keyboard focus');
    check(!(await page.$('.ct-bench')) && !(await page.$('#ct-next')), 'the hammer waits for the clasp (no test yet)');
    check(/Before my hammer/.test(await txt('#panel')), 'the clasp\'s first use teaches one line');
    await noHScroll('clasp'); await fills('clasp'); await shot('clasp');
    // "Don't call it" goes back to the table, and the call is still there.
    await page.click('#ct-unclasp');
    check(!!(await page.$('#ct-call')) && (await st()).b.open >= 0, '"Don\'t call it" goes back to the table with his pin still open');
    await page.click('#ct-call');
    await page.click(`[data-chip="${cl.pick}"]`);
    t = await txt('#panel');
    check(/The test/.test(t) && !!(await page.$('.ct-bench')) && !!(await page.$('.ct-clres.wrong .ct-chip.decide')) && !!(await page.$('.ct-clres.wrong .ct-chip.pick:not(.decide)')),
      'a wrong pick shows the chip that decided it, and the test still runs');
    check(await page.$eval('.ct-clres .ct-chip.decide', (el, d) => el.textContent.includes(d), (await page.evaluate(id => SD.table.prop(id).t, cl.c.decide))), 'the deciding chip is the one the rules give');
    check(!!(await page.$('.ct-term code')), 'the real AWS term sits under the verdict');
    await page.waitForSelector('.ct-bench.done', { timeout: 8000 }).catch(() => {});
    check(!!(await page.$('.ct-bench.done')), 'the bench still ends on its stamp after the clasp');
    const lg = (await st()).log.slice(-1)[0];
    check(lg.kind === 'call' && lg.clasp === 0, 'the missed clasp is logged');
    await noHScroll('clasp wrong'); await shot('clasp-wrong');
    await page.click('#ct-next');
  } else check(false, 'his pin is open to call after your first move');
  cl = (await st()).phase === 'board' ? await callWith(true, true) : null;
  if (cl) {
    await page.focus(`[data-chip="${cl.pick}"]`); await page.keyboard.press('Enter');
    check(!!(await page.$('.ct-clres.right .ct-chip.decide.pick')) && /You found the clasp/.test(await txt('#panel')) && !!(await page.$('.ct-bench')),
      'a right pick (by keyboard) says you found the clasp, and the test runs');
    await page.waitForSelector('.ct-bench.done', { timeout: 8000 }).catch(() => {});
    await shot('clasp-right');
    await page.click('#ct-next');
  }
  await playBoard();
  s = await st();
  check(s.phase === 'bill' && /His ledger/.test(await txt('#panel')), 'the board ends in his ledger');
  await noHScroll('ledger'); await fills('ledger'); await shot('ledger');
  // Stop and resume mid-bill.
  await page.evaluate(() => sessionStorage.setItem('keep', '1'));
  await page.reload();
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');
  await page.evaluate(() => SD.modes.open());
  check(/Resume · night 1/.test(await txt('[data-mode="duel"]')), 'after a reload the picker offers Resume');
  await page.click('[data-mode="duel"]');
  check(/HIS BILL/.test(await txt('#panel')) && !!(await page.$('#ct-pay')), 'resume reopens the bill');
  await noHScroll('bill'); await fills('bill'); await shot('bill');
  await page.click('#ct-pay');
  await page.waitForFunction(() => !!SD.modes.current() && document.querySelector('#panel [data-c], #panel #q-said, #panel #tf-idk'));
  check(!(await page.$('#panel .ct-felt')), 'the bill question is the plain exam screen');
  await answer(true, 1);
  await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
  if (await page.$('#q-next')) await page.click('#q-next');
  await page.waitForFunction(() => document.querySelector('#ct-pay, #ct-done'));
  for (let g = 0; g < 4 && await page.$('#ct-pay'); g++) {
    await page.click('#ct-pay');
    await page.waitForFunction(() => !!SD.modes.current() && document.querySelector('#panel [data-c], #panel #q-said, #panel #tf-idk'));
    await answer(false, 0);
    await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
    if (await page.$('#q-next')) await page.click('#q-next');
    await page.waitForFunction(() => document.querySelector('#ct-pay, #ct-done'));
  }
  s = await st();
  check(s.phase === 'done' && /HIS LEDGER/.test(await txt('#panel')), 'one board on night 1, then the end screen');
  check(await page.evaluate(() => { const r = SD.state.save.table.rec.dq; return !!r && r[3] >= 1; }), 'the bill is recorded per set (the hypothesis\'s number)');
  await noHScroll('end'); await fills('end'); await shot('end');
  await page.click('#ct-done');
  await page.evaluate(() => sessionStorage.removeItem('keep'));

  // ---- Night 3: two boards, then the Rack ----
  await page.evaluate(() => { SD.state.save.table.nights = 2; SD.state.persist(); });
  await page.evaluate(() => SD.modes.open());
  await page.click('[data-mode="duel"]');
  check((await page.$$('[data-rival]')).length === 2 && /Two boards/.test(await txt('#panel')), 'night 3: two rivals to pick, two boards and the Rack');
  await page.click('[data-rival]');
  s = await st();
  check(!!s.b.partner && s.b.jobs.some(j => j.set === s.b.partner), 'from night 2, a board mixes in its partner set');
  await playBoard(); await payBill(true);
  // Board 2: force a 1–1 so the Rack opens.
  if ((await st()).phase === 'counter') {
    if (await page.$('#ct-go')) await page.click('#ct-go'); else await page.click('[data-rival]');
    await page.evaluate(() => { const s = SD.state.save.table.night; s.score = [0, 0]; s.boards[0].res = 'me'; s.score[0] = 1; SD.state.persist(); });
    await playBoard();
    await page.evaluate(() => { const s = SD.state.save.table.night; s.score = [1, 1]; s.boards[1].res = 'him'; SD.state.persist(); });
    await payBill(true);
  }
  s = await st();
  if (s.phase === 'rack') {
    check(/THE COUNTERFEIT RACK/.test(await txt('#panel')) && (await page.$$('.ct-rk')).length === 4, 'the Rack: four of his pins to mark');
    check(await page.$eval('#ct-test', b => b.disabled), 'the Rack tests only once every pin is marked');
    await noHScroll('rack'); await fills('rack'); await shot('rack');
    const truth = await page.evaluate(() => { const K = SD.state.save.table.night.rack; return K.jobs.map((j, i) => SD.table.test(K.stock[i].pin, j).ok); });
    // Tap-then-tap for the first pin, and a real drag onto the tray or the bin for the rest.
    await page.click('[data-rk="0"]');
    check(/Drop it on the tray or in the bin/.test(await txt('#panel')), 'tapping a pin on the rack shows its job');
    await page.click(`.ct-zbtn[data-zone="${truth[0] ? 1 : 0}"]`);
    for (let i = 1; i < truth.length; i++) {
      const from = await page.$eval(`[data-rk="${i}"]`, el => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
      const to = await page.$eval(`.ct-zone[data-zone="${truth[i] ? 1 : 0}"] .ct-zimg`, el => { const r = el.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
      if (process.env.DBG) console.log('drag', i, from, to, await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && (e.className || e.tagName); }, from));
      await page.mouse.move(from[0], from[1]); await page.mouse.down();
      await page.mouse.move((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, { steps: 4 }); await page.mouse.move(to[0], to[1], { steps: 4 }); await page.mouse.up();
    }
    check(await page.evaluate(n => document.querySelectorAll('.ct-zone .ct-rk').length === n, truth.length), 'every pin dragged off the rack lands in the tray or the bin');
    await shot('rack-sorted');
    await page.click('#ct-test');
    await page.waitForSelector('#ct-done', { timeout: 8000 });
    check(/The Rack: 4 of 4 right/.test(await txt('#panel')) && /tin cup is yours/.test(await txt('#panel')), 'marking the truth wins the Cup on the Rack');
    await shot('rack-end');
  } else check(s.phase === 'done', 'night 3 ended on a 2–0 (the Rack only at 1–1)');
  await noHScroll('night 3 end');

  // ---- Desktop width: still edge to edge, with the felt on the left and the slip, hand and actions beside it ----
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => { try { sessionStorage.removeItem('keep'); } catch (e) { /* ignore */ } });
  await boot();
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });
  await page.evaluate(() => SD.modes.open());
  await page.click('[data-mode="duel"]');
  await page.click('[data-rival]');
  await page.waitForSelector('.ct-play');
  await fills('1280px board');
  const lay = await page.evaluate(() => {
    const f = document.querySelector('.ct-board').getBoundingClientRect(), d = document.querySelector('.ct-side').getBoundingClientRect(), q = document.querySelector('.ct-sq').getBoundingClientRect();
    return { side: d.left >= f.right - 1 && d.top < f.bottom, sq: Math.round(q.width) };
  });
  check(lay.side && lay.sq >= 110, `at 1280px the felt and the hand sit side by side with big squares (${JSON.stringify(lay)})`);
  if (await page.$('#ct-call')) {
    await page.click('#ct-call');
    check((await page.$$('[data-chip]')).length === 3 && await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'at 1280px the clasp shows three chips, no horizontal scroll');
    await shot('desktop-clasp');
    await page.click('#ct-unclasp');
  }
  check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal scroll at 1280px');
  await shot('desktop');

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page or console errors');
  if (fails.length) { console.error(`${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('OK: the Counterfeit Table checks all pass, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
