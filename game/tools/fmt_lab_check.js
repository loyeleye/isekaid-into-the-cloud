#!/usr/bin/env node
// Headless check of the question formats (js/qformats.js) through game/fmt-lab.html: serves game/ with
// python3 -m http.server, opens the lab on a phone (375 x 812) and a desktop (1280 x 800), and plays every item of
// every type through the UI to the end, once right and once wrong. On the first item of each type it also walks the
// intro rule (worked, then practice with a hint, then scored) and checks the exposure saved in SD.state.save.fg.fmt.
// Fails on any page or console error, on horizontal page scroll or an overflowing panel at 375 px, on a phone
// button under 44 px tall, or on a verdict that doesn't match the answer given.
//
// Run from game/:  node tools/fmt_lab_check.js     (NODE_PATH=$(npm root -g) if Playwright isn't found)
// SHOTS=dir saves a screenshot of each item's answer and feedback screens.
const { spawn, execSync } = require('child_process');
// Playwright from the project, NODE_PATH, or the global install.
const { chromium } = (() => { try { return require('playwright'); } catch (e) { return require(require('path').join(execSync('npm root -g').toString().trim(), 'playwright')); } })();
const fs = require('fs'), path = require('path'), net = require('net'), http = require('http');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const fail = [];
const freePort = () => new Promise(r => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });
const up = url => new Promise(r => { const t = Date.now(); (function poll() { http.get(url, res => { res.resume(); r(true); }).on('error', () => Date.now() - t > 10000 ? r(false) : setTimeout(poll, 150)); })(); });

(async () => {
  const port = await freePort();
  const srv = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1', '--directory', ROOT], { stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}/fmt-lab.html`;
  if (!(await up(base))) { console.log('server did not start'); srv.kill(); process.exit(1); }
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  let shots = 0;
  try {
    for (const vp of [{ name: '375', width: 375, height: 812, phone: true }, { name: '1280', width: 1280, height: 800, phone: false }]) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.phone, isMobile: vp.phone });
      const errors = [];
      page.on('pageerror', e => errors.push('pageerror: ' + e.message));
      // The lab tries js/fmt-items-a.js and -b.js, which may not exist yet: their 404s are expected.
      page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console: ' + m.text()); });
      page.on('response', r => { if (r.status() >= 400 && !/fmt-items-[ab]\.js$/.test(r.url())) errors.push(`HTTP ${r.status()} ${r.url()}`); });
      await page.goto(base);
      await page.waitForSelector('body[data-ready="1"]', { timeout: 15000 });
      await page.waitForSelector('[data-play]', { timeout: 15000 });
      if (!(await page.evaluate(() => document.body.dataset.css === 'game'))) fail.push(`${vp.name}: the game's CSS did not load from index.html`);
      const items = await page.evaluate(() => SD.fmtItems.map(q => JSON.parse(JSON.stringify(q))));
      const types = [...new Set(items.map(q => q.type))];
      console.log(`${vp.name}px: ${items.length} items (${types.join(', ')})`);
      const where = (q, what) => `${vp.name}px ${q.id} ${what}`;

      const layout = async (q, phase) => {
        if (!vp.phone) return;
        const r = await page.evaluate(() => {
          const d = document.documentElement, wb = document.querySelector('#panel .win-b');
          const small = [...document.querySelectorAll('#panel .qf button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44)
            .map(b => (b.textContent.trim() || b.getAttribute('aria-label') || b.id).slice(0, 30) + ' ' + Math.round(b.getBoundingClientRect().height));
          const code = document.querySelector('#panel .qf-code');
          return { page: d.scrollWidth - window.innerWidth, panel: wb ? wb.scrollWidth - wb.clientWidth : 0, code: code ? code.scrollWidth - code.clientWidth : 0, small };
        });
        if (r.page > 0) fail.push(where(q, `${phase}: page scrolls sideways by ${r.page}px`));
        if (r.panel > 1) fail.push(where(q, `${phase}: panel content overflows sideways by ${r.panel}px`));
        if (r.code > 1) fail.push(where(q, `${phase}: code box scrolls sideways by ${r.code}px (lines should wrap)`));
        if (r.small.length) fail.push(where(q, `${phase}: buttons under 44px: ${r.small.join('; ')}`));
      };
      // Wait out the panel's pop-in (and, on a predict reveal, its animation) so the shot shows the settled screen.
      const shot = async (q, tag) => { if (!SHOTS) return; await page.waitForTimeout(/feedback/.test(tag) && q.anim ? 5300 : 350); await page.screenshot({ path: path.join(SHOTS, `${vp.name}-${q.type}-${q.id}-${tag}.png`) }); shots++; };
      const click = async sel => { const el = await page.waitForSelector(sel, { timeout: 5000 }); await el.click(); };
      const open = async (q, mode) => {
        await page.selectOption('#lab-mode', mode);
        await click(`[data-play="${q.id}"]`);
        await page.waitForSelector('#panel .qf', { timeout: 5000 });
      };

      // Answer an item through the UI. right: the right answer; otherwise a wrong one.
      async function answer(q, right) {
        const t = q.type;
        if (t === 'compare') {
          const col = right ? q.a : [0, 1, 2].find(i => i !== q.a && !(q.alsoOk || []).includes(i));
          if (vp.phone) {
            for (let k = 0; k < 4 && !(await page.$(`.qf-car [data-qf-col="${col}"]`)); k++) await click('#qf-next');
            const dots = await page.textContent('.qf-dots b');
            if (!/^\d\/3$/.test(dots.trim())) fail.push(where(q, 'no 1/3 position on the carousel: ' + dots));
          }
          await click(`[data-qf-col="${col}"]`);
          await click(`[data-qf-row="${q.key}"]`);
        } else if (t === 'seq') {
          if (!right) {
            // Place one, send it back, then fill the slots with a decoy first.
            await click('[data-qf-pool="s1"]');
            await click('[data-qf-slot="0"]');
            if (!(await page.$('[data-qf-pool="s1"]'))) fail.push(where(q, 'tapping a slot did not send the step back'));
            const keys = ['d0'].concat(q.steps.map((_, i) => 's' + i)).slice(0, q.steps.length);
            for (const k of keys) await click(`[data-qf-pool="${k}"]`);
          } else for (let i = 0; i < q.steps.length; i++) await click(`[data-qf-pool="s${i}"]`);
        } else if (t === 'predict') {
          const i = right ? q.a : await page.evaluate(a => +[...document.querySelectorAll('[data-qf-opt]')].find(b => +b.dataset.qfOpt !== a && !b.disabled).dataset.qfOpt, q.a);
          await click(`[data-qf-opt="${i}"]`);
        } else if (t === 'spot') {
          await click(`[data-qf-line="${right ? q.bad : (q.bad + 1) % q.lines.length}"]`);
          await click(`[data-qf-reason="${q.a}"]`);
        } else if (t === 'recall') {
          const typed = await page.$('#qf-recall-in');
          if (vp.phone && typed) fail.push(where(q, 'phone shows typed recall, not the word bank'));
          if (!vp.phone && !typed) fail.push(where(q, 'desktop shows the word bank, not typed recall'));
          if (typed) {
            const words = right ? q.answers.map((a, i) => (i % 2 && a.alt && a.alt.length ? a.alt[0] : a.t).toUpperCase()) : ['zzz not a thing'];
            for (const w of words) { await page.fill('#qf-recall-in', w); await page.press('#qf-recall-in', 'Enter'); }
            if (!right) { await page.fill('#qf-recall-in', 'qqq'); await click('#qf-recall-add'); }
          } else {
            if (!(await page.$('.qf-recog'))) fail.push(where(q, 'word bank is not labelled Recognition'));
            if (right) for (let i = 0; i < q.answers.length; i++) await click(`[data-qf-word="a${i}"]`);
            else for (let i = 0; i < q.decoys.length; i++) await click(`[data-qf-word="d${i}"]`);
          }
        } else if (t === 'faded') {
          const blanks = await page.evaluate(() => [...document.querySelectorAll('[data-qf-blank]')].map(b => +b.dataset.qfBlank));
          if (!blanks.length) fail.push(where(q, 'no blanks to fill'));
          for (const [n, i] of blanks.entries()) {
            const s = q.steps[i], good = s.opts.indexOf(s.t);
            const o = right || n > 0 ? good : s.opts.findIndex((x, k) => k !== good);
            await click(`[data-qf-fill="${i}:${o}"]`);
          }
        }
        // idle -> selected -> submitted: the confidence buttons only appear after Submit.
        if (await page.$('[data-c]')) fail.push(where(q, 'confidence buttons shown before Submit'));
        const st = await page.getAttribute('#panel .qf', 'data-qf-state');
        if (st !== 'selected') fail.push(where(q, `state before Submit is ${st}, not selected`));
        await shot(q, right ? 'answer' : 'answer-wrong');
        await layout(q, 'answer');
        await click('#qf-submit');
        await page.waitForSelector('#panel .qf[data-qf-state="submitted"] [data-c="1"]:not([disabled])', { timeout: 5000 });
      }
      async function finish(q, right, label) {
        await click('[data-c="1"]');
        await page.waitForSelector('#panel .qf[data-qf-phase="feedback"] .verdict', { timeout: 5000 });
        const ok = await page.getAttribute('#panel .qf', 'data-qf-ok');
        if ((ok === '1') !== right) fail.push(where(q, `${label}: verdict ${ok === '1' ? 'right' : 'wrong'} for a ${right ? 'right' : 'wrong'} answer`));
        if (!(await page.$('#panel .why'))) fail.push(where(q, `${label}: no why`));
        if (!(await page.$('#panel .qf-docs a[href^="https://"]'))) fail.push(where(q, `${label}: no doc links`));
        if (q.type === 'compare' && !(await page.$('#panel .qf-key'))) fail.push(where(q, 'feedback does not highlight the key row'));
        if (q.type === 'spot' && !(await page.$('#panel .qf-line.bad + .qf-line.fix'))) fail.push(where(q, 'feedback does not show the fix under the bad line'));
        if (q.type === 'seq' && !right && !(await page.$('#panel .qf-slot.wrong'))) fail.push(where(q, 'no wrong slot marked'));
        if (q.type === 'predict' && !/You predicted .* · What happened:/.test(await page.textContent('#panel .qf-yp'))) fail.push(where(q, 'no "You predicted X · What happened: Y" line'));
        if (q.type === 'predict' && q.anim === 'visibility' && !(await page.$('#panel .qf-anim.play, #panel .qf-anim.still'))) fail.push(where(q, 'visibility animation did not start'));
        if (['seq', 'recall'].includes(q.type) && !right && !(await page.$('#panel .nots'))) fail.push(where(q, 'no "why not" lines for decoys'));
        await shot(q, right ? 'feedback' : 'feedback-wrong');
        await layout(q, 'feedback');
        if (await page.$('#q-eli5')) {
          await click('#q-eli5');
          if (await page.$eval('#q-eli5-box', b => b.hidden)) fail.push(where(q, 'ELI5 did not open'));
        } else fail.push(where(q, 'no ELI5 button'));
        await click('#q-next');
        await page.waitForSelector('#panel', { state: 'hidden', timeout: 5000 });
        const res = await page.evaluate(() => window.lastResult);
        if (!res || res.id !== q.id || res.ok !== right) fail.push(where(q, `${label}: lab result ${JSON.stringify(res)}`));
        return res;
      }

      // The intro rule on the first item of each type: worked, practice (hint), scored.
      await click('#lab-reset');
      for (const t of types) {
        const q = items.find(x => x.type === t);
        await open(q, 'auto');
        if (!(await page.$('#qf-got'))) fail.push(where(q, 'first appearance is not worked'));
        await shot(q, 'worked');
        await layout(q, 'worked');
        await click('#qf-got');
        await page.waitForSelector('#panel', { state: 'hidden', timeout: 5000 });
        await open(q, 'auto');
        if (!(await page.$('#panel .qf-hint .qf-practice'))) fail.push(where(q, 'second appearance has no Practice label and hint'));
        await answer(q, true);
        const r2 = await finish(q, true, 'practice');
        if (r2.scored !== false || r2.mode !== 'hint') fail.push(where(q, 'practice round was scored: ' + JSON.stringify(r2)));
        await open(q, 'auto');
        if (await page.$('#panel .qf-hint')) fail.push(where(q, 'third appearance still shows a hint'));
        await answer(q, true);
        const r3 = await finish(q, true, 'scored');
        if (r3.mode !== 'scored') fail.push(where(q, 'third appearance not scored'));
        const e = await page.evaluate(t => SD.state.save.fg && SD.state.save.fg.fmt && SD.state.save.fg.fmt[t], t);
        const recog = t === 'recall' && vp.phone;
        // A word-bank pass is recognition: partial for exposure, so it never makes the format "known" on a phone.
        if (!e || e.n !== 3 || e.known !== !recog) fail.push(where(q, `exposure after worked, practice, scored: ${JSON.stringify(e)}`));
        if (recog && !(r3.recognition && r3.partial <= 0.5)) fail.push(where(q, 'word bank pass not marked as recognition/partial: ' + JSON.stringify(r3)));
      }

      // Every item, scored, right then wrong.
      for (const q of items) {
        for (const right of [true, false]) {
          await open(q, 'scored');
          await answer(q, right);
          await finish(q, right, right ? 'right' : 'wrong');
        }
      }

      // Keyboard: the first item's options can be reached with Tab and chosen with Enter.
      const kq = items.find(x => x.type === 'predict');
      if (kq) {
        await open(kq, 'scored');
        let found = false;
        for (let k = 0; k < 30 && !found; k++) {
          await page.keyboard.press('Tab');
          found = await page.evaluate(() => !!(document.activeElement && document.activeElement.matches('[data-qf-opt]:not([disabled])')));
        }
        if (!found) fail.push(`${vp.name}px keyboard: Tab never reached an option`);
        else {
          const lbl = await page.evaluate(() => document.activeElement.getAttribute('aria-label'));
          if (!lbl) fail.push(`${vp.name}px keyboard: option has no aria-label`);
          await page.keyboard.press('Enter');
          if (!(await page.$('#qf-submit:not([disabled])'))) fail.push(`${vp.name}px keyboard: Enter did not select the option`);
        }
        await click('#qf-submit'); await click('[data-c="0"]'); await click('#q-next');
        await page.waitForSelector('#panel', { state: 'hidden', timeout: 5000 });
      }

      for (const e of errors) fail.push(`${vp.name}px ${e}`);
      await page.close();
    }

    // Without a save the engine keeps exposure in memory.
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    await page.goto(base + '?mem');
    await page.waitForSelector('[data-play]');
    const m = await page.evaluate(async () => { const q = SD.fmtItems[0]; const p = SD.qf.ask(q, {}); document.querySelector('#qf-got').click(); await p; return { e: SD.qf.exposure(q.type), state: !!SD.state }; });
    if (m.state || !m.e || m.e.n !== 1) fail.push('?mem: exposure not kept in memory: ' + JSON.stringify(m));
    for (const e of errs) fail.push('?mem pageerror: ' + e);
    await page.close();

    // Reduced motion: the reveal shows its last frame instead of playing, and wrong slots don't shake.
    const rm = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    await rm.goto(base);
    await rm.waitForSelector('[data-play]');
    const r = await rm.evaluate(async () => {
      const out = {};
      const pq = SD.fmtItems.find(q => q.type === 'predict' && q.anim === 'visibility');
      if (pq) {
        const p = SD.qf.ask(pq, { mode: 'scored' });
        document.querySelector(`[data-qf-opt="${(pq.a + 1) % 3}"]`).click(); document.querySelector('#qf-submit').click(); document.querySelector('[data-c="1"]').click();
        await new Promise(r => setTimeout(r, 50));
        out.still = !!document.querySelector('.qf-anim.still'); out.play = !!document.querySelector('.qf-anim.play');
        document.querySelector('#q-next').click(); await p;
      }
      const sq = SD.fmtItems.find(q => q.type === 'seq');
      if (sq) {
        const p = SD.qf.ask(sq, { mode: 'scored' });
        for (let i = sq.steps.length - 1; i >= 0; i--) document.querySelector(`[data-qf-pool="s${i}"]`).click();
        document.querySelector('#qf-submit').click(); document.querySelector('[data-c="1"]').click();
        out.shake = !!document.querySelector('.qf-shake'); out.wrong = !!document.querySelector('.qf-slot.wrong');
        document.querySelector('#q-next').click(); await p;
      }
      return out;
    });
    if (r.still === false || r.play) fail.push('reduced motion: the visibility reveal should show its last frame, not play: ' + JSON.stringify(r));
    if (r.shake || r.wrong === false) fail.push('reduced motion: wrong slots should be marked without shaking: ' + JSON.stringify(r));
    await rm.close();
  } finally {
    await browser.close();
    srv.kill();
  }
  if (SHOTS) console.log(`${shots} screenshots in ${SHOTS}`);
  console.log(fail.length ? `\n${fail.length} problem${fail.length === 1 ? '' : 's'}:\n  - ${fail.join('\n  - ')}` : '\nAll formats played through. No problems.');
  process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
