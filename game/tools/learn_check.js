// Headless check of "learn the idea, not the item" at 375px (js/quiz.js Type it first, js/recall.js, js/today.js
// the Wall's twins and WANTED posters, js/state.js new vs repeat accuracy, js/main.js menu rows).
// Run from game/:  node tools/learn_check.js     SHOTS=dir saves screenshots.
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
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'learn-' + name + '.png') }); };
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
    const p = document.querySelector('#panel'), q = SD.today.current();
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


  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();
  await page.fill('#td-date-first', '2026-11-30');
  await page.click('#td-setdate');
  const wait = ms => page.waitForTimeout(ms);
  const panelText = () => page.textContent('#panel');

  // ---- The wall asks a twin, typed first ----
  await page.evaluate(() => { SD.state.save.wall = [{ id: 'dva-1-01', t: Date.now() - 3 * 86400000, rights: [] }, { id: 'dva-1-238', t: Date.now() - 2 * 86400000, rights: [] }]; SD.state.persist(); SD.today.render(); });
  check(await page.evaluate(() => SD.today.hasTwin('dva-1-01') && !SD.today.hasTwin('dva-1-238')), 'dva-1-01 has a twin (js/twins-data.js) and dva-1-238 has none');
  await page.evaluate(() => SD.today.wallPanel()); await wait(30);
  const wt = await panelText();
  check(/WANTED/.test(wt) && /needs a twin/.test(wt), 'posters read WANTED, and the one without a twin says "needs a twin"');
  check(await page.evaluate(() => [...document.querySelectorAll('.td-orig')].every(d => !d.open)), 'the question behind each poster stays folded');
  await noHScroll('wall');
  await shot('wall');
  await page.click('#td-wall-go');
  await page.waitForSelector('#panel .win.quiz');
  const first = await page.evaluate(() => ({ id: SD.today.current().id, ctx: document.querySelector('#panel .q-ctx').textContent, tf: !!document.querySelector('#tf-in'), opts: document.querySelectorAll('#panel [data-o]').length }));
  check(['dva-1-320', 'dva-1-754'].includes(first.id), `the poster comes back as a twin, not itself (${first.id})`);
  check(/Same idea, a question you haven't seen/.test(first.ctx), 'the drill says it\'s the same idea, a new question');
  check(first.tf && first.opts === 0, 'Type it first: a text box and no options yet');
  check(await page.evaluate(() => (document.activeElement && document.activeElement.id === 'tf-in') === matchMedia('(pointer: fine)').matches), 'the box takes focus only with a mouse, never on a touch screen');
  await noHScroll('type it first');
  await shot('type-first');
  // Type the right option's own words, then pick it.
  await page.evaluate(() => { const q = SD.today.current(); document.querySelector('#tf-in').value = q.opts[q.a]; });
  await page.click('#tf-go');
  await wait(30);
  check(await page.evaluate(() => document.querySelectorAll('#panel [data-o]').length === 4 && /You wrote/.test(document.querySelector('.tf-said').textContent)), 'Show options reveals the options with your words above them');
  await page.evaluate(async () => { const q = SD.today.current(); document.querySelector(`[data-o="${q.a}"]`).click(); await new Promise(r => setTimeout(r, 20)); document.querySelector('[data-c="1"]').click(); });
  await wait(50);
  check(/From memory/.test(await page.textContent('.verdict-row')), 'typing the right answer then picking it: "From memory"');
  await shot('from-memory');
  await next();
  check(await page.evaluate(() => { const r = SD.state.save.wall.find(w => w.id === 'dva-1-01').rights; return r.length === 1 && ['dva-1-320', 'dva-1-754'].includes(r[0].q); }), 'a right twin counts toward its poster, logged under the twin\'s id');
  // The poster without a twin: the question itself, typed first; "I don't know yet", then right.
  await page.waitForSelector('#panel #tf-idk');
  check(await page.evaluate(() => SD.today.current().id) === 'dva-1-238', 'a poster without a twin asks its own question');
  await page.click('#tf-idk');
  await page.evaluate(async () => { const q = SD.today.current(); document.querySelector(`[data-o="${q.a}"]`).click(); await new Promise(r => setTimeout(r, 20)); document.querySelector('[data-c="2"]').click(); });
  await wait(50);
  check(/From the options/.test(await page.textContent('.verdict-row')), '"I don\'t know yet" then a right pick: "From the options"');
  const box = await page.evaluate(() => SD.state.save.concepts[SD.today.current().c] && SD.state.save.concepts[SD.today.current().c].box);
  check(box <= 1, `recognised, not recalled: the review box doesn't climb past 1 (${box})`);
  await next();
  await wait(50);
  check(/From memory/.test(await panelText()) && /1 of 2 you typed first/.test(await panelText()), 'the set summary counts "From memory 1 of 2"');
  await page.click('#td-done');

  // Two different questions on two days take the twin poster down; the same question twice doesn't.
  const now = await page.evaluate(() => Date.now());
  await page.clock.setFixedTime(new Date(now + 86400000 + 3600000));
  await page.evaluate(() => { const w = SD.state.save.wall.find(x => x.id === 'dva-1-01'); w.rights = [{ t: Date.now() - 86400000, q: 'dva-1-320' }]; });
  check(await page.evaluate(() => { SD.today.wallNote('dva-1-320', true, 'dva-1-01'); return SD.state.save.wall.some(w => w.id === 'dva-1-01'); }), 'the same question right on a second day leaves the poster up');
  check(await page.evaluate(() => { SD.today.wallNote('dva-1-754', true, 'dva-1-01'); return !SD.state.save.wall.some(w => w.id === 'dva-1-01'); }), 'a different twin right on another day takes it down');
  check(await page.evaluate(() => { SD.today.wallAdd('dva-1-320'); SD.today.wallAdd('dva-1-754'); return SD.state.save.wall.filter(w => ['dva-1-320', 'dva-1-754', 'dva-1-01'].includes(w.id)).length; }) === 1, 'missing two twins puts up one poster for the idea, not two');

  // ---- Type it first in a daily set: only on a question you missed ----
  const tfOn = await page.evaluate(() => {
    const q = Object.assign({}, SD.bank.find(x => x.id === 'dva-1-04'), { c: 'x11' });
    SD.state.save.qlog['dva-1-04'] = [Date.now() - 86400000, 0];
    const missed = SD.quiz.ask(q, { title: 'TODAY\'S SET' }); const a = !!document.querySelector('#tf-in'); SD.ui.closePanel();
    SD.state.save.qlog['dva-1-04'] = [Date.now() - 86400000, 1];
    SD.quiz.ask(q, { title: 'TODAY\'S SET' }); const b = !!document.querySelector('#tf-in'); SD.ui.closePanel();
    const code = Object.assign({}, SD.bank.find(x => x.id === 'dva-1-110'), { c: 'x11' }); SD.state.save.qlog['dva-1-110'] = [1, 0];
    SD.quiz.ask(code, { title: 'TODAY\'S SET' }); const c = !!document.querySelector('#tf-in'); SD.ui.closePanel();
    return { a, b, c };
  });
  check(tfOn.a && !tfOn.b, 'Type it first shows on a question you missed last time, not on one you got right');
  check(!tfOn.c, 'never on a question whose options are JSON or code');

  // Can't tell: asked whether the words meant the right answer.
  await page.evaluate(() => { const q = Object.assign({}, SD.bank.find(x => x.id === 'dva-1-04'), { c: 'x11' }); SD.state.save.qlog['dva-1-04'] = [1, 0]; window.__r = SD.quiz.ask(q, { title: 'TODAY\'S SET' }); });
  await page.fill('#tf-in', 'zebra kayak');
  await page.click('#tf-go');
  await page.evaluate(async () => { document.querySelector('[data-o="0"]').click(); await new Promise(r => setTimeout(r, 20)); document.querySelector('[data-c="1"]').click(); });
  await wait(50);
  check(/Can't tell/.test(await page.textContent('.verdict-row')) && await page.$('[data-rc="0"]'), 'words that match nothing: "Can\'t tell", and it asks if they meant the right answer');
  await page.click('[data-rc="0"]');
  check(/from the options/i.test(await page.textContent('#rc-done')), '"No" counts it as from the options');
  // Why not this one, on a right answer you meant.
  check(await page.$('details.whynot') !== null, 'a right Think-so answer has a folded "Why not this one?" card');
  const wn = await page.evaluate(() => { const d = document.querySelector('details.whynot'); const opt = d.querySelector('.wn-opt').textContent; return { open: d.open, inOthers: [...document.querySelectorAll('.nots li b')].some(b => b.textContent === opt) }; });
  check(!wn.open && !wn.inOthers, 'it starts folded, and its option\'s reason isn\'t in "Why not the others"');
  await page.click('details.whynot summary'); await page.click('#wn-rev'); await page.click('[data-wn="0"]');
  check(await page.evaluate(() => SD.state.save.openQs.some(p => /^Why doesn't/.test(p))), '"I didn\'t" saves the question to the notebook');
  await noHScroll('recall check and why not');
  await shot('cant-tell');
  await next();

  // ---- New questions vs repeats on the readiness board ----
  await page.evaluate(() => { const t = Date.now(); SD.state.save.sight = Array.from({ length: 30 }, (_, i) => [t, 1, i % 3 ? 1 : 0, 1]).concat(Array.from({ length: 30 }, () => [t, 0, 1, 1])); SD.today.board(); });
  const rb = await panelText();
  check(/New questions vs repeats/.test(rb) && /67%/.test(rb) && /100%/.test(rb) && /remembered, not understood/.test(rb), 'readiness shows new vs repeat accuracy and reads a 33-point gap');
  await noHScroll('readiness');
  await shot('readiness');
  await page.evaluate(() => { SD.state.save.sight = [[Date.now(), 1, 1, 1]]; SD.today.board(); });
  check(/once each side has 30 answers/.test(await panelText()), 'with too few answers it waits instead of reading the gap');
  check(await page.evaluate(() => { const s = SD.state.save; s.sight = []; const n = (s.qlog = s.qlog || {}); delete n['dva-1-02']; SD.state.recordAnswer('x11', true, 1, 5000, 'dva-1-02'); SD.state.recordAnswer('x11', true, 1, 5000, 'dva-1-02'); return JSON.stringify(s.sight.map(x => x[1])); }) === '[1,0]', 'answers log first sight, then seen before');

  // ---- Menu ----
  await page.evaluate(() => SD.main && SD.main.menu ? SD.main.menu() : document.querySelector('#hud-menu, #t-menu') && document.querySelector('#hud-menu, #t-menu').click());
  await wait(50);
  if (await page.$('#m-type')) {
    check(/Type it first: Questions I missed/.test(await panelText()) && /Why not this one: On/.test(await panelText()) && /Explain questions/.test(await panelText()), 'the menu groups Type it first, Say it first, Why not this one and Explain questions');
    await page.click('#m-type');
    check(await page.evaluate(() => SD.state.save.typeFirst) === 'all', 'Type it first cycles to Every question');
  } else check(false, 'menu opens');

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  if (fails.length) { console.log(fails.length + ' failed'); process.exit(1); }
  console.log('all passed');
})();
