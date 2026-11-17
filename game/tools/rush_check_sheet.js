// Headless check of the Rush's template card (js/rush-sheet.js, data in js/rush-learn.js and the claim files).
// The data: every piece of claims 1 to 6 (rush-core's TOOLS but the intern) has real lines, a blank that's on them,
// 3-4 choices with the right one, and an AWS docs link; every claim has its file; the pops are on real event names.
// In the browser, at desktop 1366x768 and phone 390x844, claims 1 to 6 (and claim 6's cellar):
//   - placing each piece on the belt writes its lines onto the sheet;
//   - the first-time blank shows only while building, and only once (in the run, and after a reload, from storage);
//     a right answer and a wrong one both move on (the wrong one shows the right word), and the room is never held;
//   - nothing overlaps the sheet: its card (desktop) or tab (phone) is clear of every label, counter, the belt, the
//     lever, the pieces' spots, the inset and Dutch's bubble; the phone's open card is clear of the lever and the belt;
//   - mid-wave: a piece placed now just writes its line (no blank), the waves keep running at full speed, and a pop
//     gets its real term;
//   - the sheet changes no rule: the same seed stepped with the sheet resolving every frame and without it ends the same.
// Claims 7 to 9 get a smoke test (their sheet draws, no errors), and claim 9's blueprint asks its blank in the row.
// Saves screenshots (building with the blank open, and mid-wave with a term) to the out dir.
// node tools/rush_check_sheet.js [outDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = process.argv[2] || '/tmp/rush-sheet-shots';
fs.mkdirSync(OUT, { recursive: true });
let fail = 0, okN = 0;
const bad = (...a) => { fail++; console.log('FAIL', ...a); };
const ok = (c, ...a) => { if (c) okN++; else bad(...a); };

// ---- The data, in node ----
global.window = undefined;
const R = require('../js/rush-core.js');
require('../js/rush-learn.js');
const LN = globalThis.SD.rushLearn;
const val = (v, ...a) => (typeof v === 'function' ? v(...a) : v);
const CLAIMS16 = ['rush', 'bell', 'double', 'slow', 'picky', 'hot'];
for (const c of CLAIMS16.concat(['review'])) ok(LN.files[c] && LN.files[c].name && (val(LN.files[c].base, {}) || []).length, 'no file for', c);
for (const t of Object.keys(R.TOOLS)) {
  if (R.TOOLS[t].where || ['intern'].includes(t)) continue; // claim 8's buys have their own data; the intern has no line
  const d = LN.tools[t];
  if (!d) { bad('no data for', t); continue; }
  ok(d.blank && Array.isArray(d.choices) && d.choices.length >= 3 && d.choices.length <= 4 && d.choices.includes(d.blank), t, 'choices', d.choices);
  ok(/^https:\/\/docs\.aws\.amazon\.com\//.test(d.doc || ''), t, 'doc link', d.doc);
  // The blank is on its lines in at least one claim's room where the piece is on the belt.
  let found = false;
  for (const c of CLAIMS16) {
    const S = R.create(3, c, ['batch', 'herd', 'cold']); S.coins = 20;
    if (!S.belt.includes(t) && !S[t]) continue;
    for (const pre of [[], ['rack']]) {
      const S2 = R.create(3, c, ['batch', 'herd', 'cold']); S2.coins = 20; pre.forEach(p => R.place(S2, p)); R.place(S2, t);
      const bl = d.blocks ? val(d.blocks, S2) : [{ at: d.at, lines: d.lines }];
      if (bl.some(b => (val(b.lines, S2) || []).some(l => l.includes(d.blank)))) found = true;
    }
  }
  ok(found, t, 'blank not on its lines in any claim');
}
const EVENTS = new Set(fs.readFileSync(path.join(ROOT, 'js/rush-core.js'), 'utf8').match(/ev\((?:S|M), '(\w+)'/g).map(s => s.match(/'(\w+)'/)[1]));
for (const k of Object.keys(LN.pops)) if (!k.includes(':')) ok(EVENTS.has(k), 'pop on an event rush-core never sends:', k);

// ---- In the browser ----
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.css': 'text/css' };
const srv = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
});
const hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
// The lines a piece wrote, as the data says for the room as it stands.
const expectLines = (pg, t) => pg.evaluate(t => {
  const d = SD.rushLearn.tools[t], S = SD_RUSH.view === 'review' ? SD_RUSH.S.review : SD_RUSH.S, v = (x, ...a) => (typeof x === 'function' ? x(...a) : x);
  const bl = d.blocks ? v(d.blocks, S) : [{ at: d.at, lines: d.lines }];
  return bl.flatMap(b => v(b.lines, S) || []);
}, t);
const sheetLines = pg => pg.evaluate(() => SD.rushSheet.lines());
const dbg = pg => pg.evaluate(() => SD.rushSheet.debug());
// What's drawn in the room this frame (stage px): labels, counters, the sheet itself.
async function drawnBoxes(pg) {
  return pg.evaluate(() => new Promise(res => {
    const out = []; SD.rushSheet.rec = (kind, t, r) => out.push({ kind, t, r: r.slice() });
    requestAnimationFrame(() => requestAnimationFrame(() => { SD.rushSheet.rec = null; res(out); }));
  }));
}
async function clearOf(pg, name, tag) {
  const boxes = await drawnBoxes(pg);
  // Everything the card or the tab must stay clear of, in stage px.
  const extra = await pg.evaluate(() => {
    const out = [], xf = SD.rushSheet._h();
    const L = xf.L, S = xf.S;
    const b = xf.beltRect(); out.push({ kind: 'belt', r: b });
    if (L.lever) out.push({ kind: 'lever', r: [L.lever.x - L.lever.r * .6, L.lever.y - L.lever.r * .8, L.lever.r * 1.2, L.lever.r * 1.6] });
    for (const t of S.belt) { let r = null; try { r = xf.spot(t); } catch (e) { r = null; } if (r) out.push({ kind: 'spot', t, r }); }
    if (L.inset) out.push({ kind: 'inset', r: L.inset.r });
    if (xf.say) out.push({ kind: 'bubble', r: xf.say });
    if (L.tank) out.push({ kind: 'tank', r: [L.tank.x - 60, L.tank.y - L.tank.h, 120, L.tank.h] });
    if (L.desk && L.desk.h) out.push({ kind: 'desk', r: [L.desk.x - L.desk.h * .7, L.desk.y - L.desk.h, L.desk.h * 1.4, L.desk.h] });
    return out;
  });
  const mine = k => k === 'sheet' || k === 'sheet-tab' || k === 'sheet-open', me = boxes.filter(b => mine(b.kind));
  ok(me.some(b => b.kind !== 'sheet-open'), name, tag, 'no sheet or tab drawn');
  // The phone's open card is over the room on purpose (while building), but never over the lever, the belt or Dutch.
  const said = new Set();
  for (const m of me) for (const o of boxes.filter(b => !mine(b.kind)).concat(extra)) if (hit(m.r, o.r) && (m.kind !== 'sheet-open' || ['belt', 'lever', 'bubble'].includes(o.kind)) && !said.has(m.kind + o.kind + o.t) && said.add(m.kind + o.kind + o.t)) bad(name, tag, m.kind, 'overlaps', o.kind, o.t || '', JSON.stringify(o.r.map(Math.round)), 'sheet', JSON.stringify(m.r.map(Math.round)));
}
async function answerBlank(pg, how) {
  const d = await dbg(pg); if (!d.blank) return null;
  const typed = await pg.$('#sheet-ui .sh-panel input');
  if (typed && how === 'choice') { await pg.click('#sheet-ui .sh-more'); await pg.waitForTimeout(50); }
  if (typed && how !== 'choice') {
    // Typed: two misses get another go (the second shows the answer faintly); the third moves on.
    for (let i = 0; i < (how === 'right' ? 1 : 3); i++) { const inp = await pg.$('#sheet-ui .sh-panel input'); if (!inp) break; await inp.fill(how === 'right' ? d.blank.token : 'nope'); await inp.press('Enter'); await pg.waitForTimeout(60);
      if (how !== 'right' && i === 1) ok(await pg.evaluate(() => { const x = document.querySelector('#sheet-ui .sh-panel input'); return !!(x && x.placeholder); }), 'no faint answer after two misses'); }
  }
  else {
    const pick = how === 'wrong' ? d.blank.choices.find(x => x !== d.blank.token) : d.blank.token;
    const btns = await pg.$$('#sheet-ui .sh-ch button');
    for (const b of btns) if ((await b.textContent()) === pick) { await b.click(); break; }
  }
  await pg.waitForTimeout(80);
  return (await dbg(pg)).blank;
}
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port, browser = await chromium.launch();
  const VPS = [['desktop', { viewport: { width: 1366, height: 768 } }], ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]];
  for (const [name, vp] of VPS) {
    const ctx = await browser.newContext(Object.assign({ deviceScaleFactor: 2 }, vp));
    const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    const open = async (claim, orders) => { await pg.goto(`http://127.0.0.1:${port}/rush.html?seed=7&claim=${claim}&orders=${orders || 'cold'}`); await pg.waitForTimeout(500); };
    await open('rush'); await pg.evaluate(() => SD.rushSheet.forget());
    const seenBlank = new Set();
    let shotBlank = false, shotWave = false;
    for (const claim of CLAIMS16) {
      await open(claim, claim === 'picky' ? 'batch' : 'cold');
      const rooms = claim === 'hot' ? ['main', 'review'] : ['main'];
      for (const room of rooms) {
        if (room === 'review') { await pg.evaluate(() => SD_RUSH.switchRoom()); await pg.waitForTimeout(150); }
        await pg.waitForTimeout(250);
        await clearOf(pg, name, claim + '/' + room + ' building');
        const belt = await pg.evaluate(() => (SD_RUSH.view === 'review' ? SD_RUSH.S.review : SD_RUSH.S).belt.slice());
        for (const t of belt) {
          if (!(await pg.evaluate(t => !!SD.rushLearn.tools[t] && !(SD_RUSH.view === 'review' ? SD_RUSH.S.review : SD_RUSH.S).locked.includes(t), t))) continue;
                    await pg.evaluate(t => { SD_RUSH.S.coins = 20; SD_RUSH.place(t); }, t);
          await pg.waitForTimeout(120);
          const placed = await pg.evaluate(t => !!(SD_RUSH.view === 'review' ? SD_RUSH.S.review : SD_RUSH.S)[t], t);
          if (!placed) { bad(name, claim, t, 'did not place'); continue; }
          const want = await expectLines(pg, t), now = await sheetLines(pg);
          ok(want.length && want.every(l => now.includes(l)), name, claim, t, 'lines not on the sheet', want.filter(l => !now.includes(l)));
          // Its first-time blank, once.
          const d = await dbg(pg), first = !seenBlank.has(t);
          const asked = (d.blank && d.blank.t === t) || d.queued.includes(t);
          if (first) {
            ok(asked, name, claim, t, 'no blank the first time');
            if (d.blank && d.blank.t === t) {
              if (!shotBlank && (claim === 'slow' || claim === 'rush') && t !== 'rack') { await pg.waitForTimeout(250); await pg.screenshot({ path: `${OUT}/${name}-building-blank.png` }); shotBlank = true; }
              const how = seenBlank.size % 3 === 1 ? 'wrong' : seenBlank.size % 3 === 2 ? 'choice' : 'right';
              const res = await answerBlank(pg, how);
              ok(res && res.state === (how === 'wrong' ? 'wrong' : 'right'), name, claim, t, 'answer', how, JSON.stringify(res));
              if (how === 'wrong') {
                const dw = await dbg(pg);
                ok(dw.blankShown === dw.blank.token, name, claim, t, 'wrong answer: the right word is not shown on the sheet', dw.blankShown);
              }
              await pg.waitForTimeout(how === 'wrong' ? 1900 : 1000);
              const after = await dbg(pg);
              ok(!after.blank || after.blank.t !== t, name, claim, t, 'blank did not move on');
            }
            seenBlank.add(t);
          } else ok(!asked, name, claim, t, 'blank asked again');
          // Let any other queued blank go by.
          for (let i = 0; i < 6 && (await dbg(pg)).blank; i++) { const b = await dbg(pg); if (b.blank.state === 'ask') await answerBlank(pg, 'right'); await pg.waitForTimeout(1000); if (b.blank) seenBlank.add(b.blank.t); }
        }
        await clearOf(pg, name, claim + '/' + room + ' built');
      }
      // The lever: no blank while the night runs, and the night runs at full speed.
      await pg.evaluate(() => SD_RUSH.start());
      const t0 = await pg.evaluate(() => SD_RUSH.S.time); await pg.waitForTimeout(1500);
      const t1 = await pg.evaluate(() => SD_RUSH.S.time), dd = await dbg(pg);
      ok(t1 - t0 > 1.0 || (await pg.evaluate(() => !!(SD_RUSH.S.over || document.getElementById('q').classList.contains('on')))), name, claim, 'night did not run', t1 - t0);
      ok(!dd.blank && !dd.queued.length, name, claim, 'blank while the night runs');
      ok(!(await pg.evaluate(() => { const p = document.querySelector('#sheet-ui .sh-panel'); return p && p.style.display !== 'none'; })), name, claim, 'blank panel shown mid-wave');
    }
    // Remembered across runs (storage): a reload, then the same piece asks nothing.
    await open('rush');
    await pg.evaluate(() => { SD_RUSH.S.coins = 20; SD_RUSH.place('rack'); }); await pg.waitForTimeout(150);
    ok(!(await dbg(pg)).blank, name, 'rack asked again after a reload');
    // Mid-wave: forget everything, pull the lever, then place: the line goes on, no blank, and the room never waits.
    await open('rush');
    await pg.evaluate(() => SD.rushSheet.forget());
    await pg.evaluate(() => SD_RUSH.start()); await pg.waitForTimeout(2500);
    const ta = await pg.evaluate(() => SD_RUSH.S.time);
    await pg.evaluate(() => { SD_RUSH.S.coins = 20; SD_RUSH.place('reserve'); }); await pg.waitForTimeout(1000);
    const tb = await pg.evaluate(() => SD_RUSH.S.time), dm = await dbg(pg);
    ok(!dm.blank && !dm.queued.length, name, 'blank mid-wave');
    ok((await sheetLines(pg)).some(l => /ReservedConcurrentExecutions: 4/.test(l)), name, 'mid-wave placement wrote no line');
    ok(tb - ta > .75, name, 'the room waited for the sheet', tb - ta);
    // A pop gets its real term (no rack: callers get 429s).
    let term = null;
    for (let i = 0; i < 40 && !term; i++) { await pg.waitForTimeout(150); const d = await dbg(pg); term = d.terms.find(x => /TooManyRequestsException|At-least-once|maxReceiveCount|Function error/.test(x.text)); }
    ok(term, name, 'no real term on a pop mid-wave');
    if (term && !shotWave) { await pg.screenshot({ path: `${OUT}/${name}-wave-pop.png` }); shotWave = true; }
    // An open blank when the lever is pulled: it fills in and the night starts at once.
    await open('slow'); await pg.evaluate(() => SD.rushSheet.forget());
    await pg.evaluate(() => { SD_RUSH.S.coins = 20; SD_RUSH.place('hourglass'); }); await pg.waitForTimeout(150);
    ok((await dbg(pg)).blank, name, 'slow: hourglass blank expected');
    await pg.evaluate(() => SD_RUSH.start()); await pg.waitForTimeout(800);
    ok(!(await dbg(pg)).blank && (await pg.evaluate(() => SD_RUSH.S.time)) > .5, name, 'lever with an open blank: still open or the room waited');
    ok((await sheetLines(pg)).includes('      VisibilityTimeout: 9'), name, 'hourglass line missing after the lever');
    // Rules untouched: one seed stepped twice, once with the sheet resolving every frame.
    const same = await pg.evaluate(() => {
      const R = SD.rushCore, run = sheet => { const S = R.create(11, 'slow', ['cold']); S.coins = 9; ['hourglass', 'stopwatch', 'bin'].forEach(t => R.place(S, t)); R.start(S);
        for (let i = 0; i < 3000 && !S.over; i++) { R.step(S, 0.05); if (sheet) SD.rushSheet.lines(S); } return JSON.stringify([S.handled, S.spill, S.time, S.nextId, S.reappeared, S.timedOut, S.binned, S.over]); };
      return [run(false), run(true)];
    });
    ok(same[0] === same[1], name, 'the sheet changed the rules', same);
    // Claims 7 to 9: their sheets draw.
    for (const c of ['locked', 'audit', 'sorter']) {
      await open(c); await pg.waitForTimeout(300);
      const d = await dbg(pg);
      ok(d.lines.length > 3 || c === 'sorter', name, c, 'no sheet lines');
      if (c === 'sorter') {
        // The blueprint asks a row's blank before ticking it, then ticks it.
        await pg.evaluate(() => SD.rushSheet.forget());
        const row = await pg.$('.bp-line[data-t="rack"]');
        if (row) {
          await row.click(); await pg.waitForTimeout(100);
          ok(await pg.$('.bp-ask'), name, 'sorter: no blank in the blueprint row');
          const btn = await pg.$('.bp-ask .sh-more'); if (btn) await btn.click();
          const tok = await pg.evaluate(() => SD.rushLearn.tools.rack.blank);
          for (const b of await pg.$$('.bp-ask .sh-ch button')) if ((await b.textContent()) === tok) { await b.click(); break; }
          await pg.waitForTimeout(900);
          ok(await pg.evaluate(() => document.querySelector('.bp-line[data-t="rack"]').getAttribute('aria-pressed') === 'true'), name, 'sorter: row not ticked after its blank');
          await row.click(); await pg.waitForTimeout(50); await row.click(); await pg.waitForTimeout(50);
          ok(!(await pg.$('.bp-ask')), name, 'sorter: blank asked twice');
        } else bad(name, 'sorter: no blueprint');
      }
    }
    const hscroll = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok(!hscroll, name, 'horizontal scroll');
    ok(!errs.length, name, 'page errors', errs);
    await ctx.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? `${fail} failed, ${okN} ok` : `all ${okN} checks ok`);
  process.exit(fail ? 1 : 0);
})();
