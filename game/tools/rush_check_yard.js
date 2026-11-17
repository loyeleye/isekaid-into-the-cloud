// Headless check and screenshots of claim 9, the New Sorter (rush.html?claim=sorter: js/rush-yard.js rules, the
// claim 9 blocks in js/rush.js). Plays the claim at desktop and phone size: the blueprint (sam deploy), every buy (the
// timetable, the alarm wire and the test track ticked on the blueprint and flipped in the yard, the manifest bought
// later as a stack update), the whistle, a deployment going out, a rollback on the reverse lever, the hotfix crate
// (dragged onto the points while the group is busy, then the card), the change-set slip, a weighbridge inspection card
// (spot the line), the review room in the cellar, and the end strip. Checks page errors, horizontal scroll and that the
// belt and the docked card fit on screen, and saves screenshots.
// node tools/rush_check_yard.js [outDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = process.argv[2] || '/tmp/rush-yard-shots';
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.css': 'text/css', '.png': 'image/png' };
const srv = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
});
let fail = 0;
const bad = (...a) => { fail++; console.log('FAIL', ...a); };
const ok = (...a) => console.log('ok  ', ...a);
const tap = async (pg, p) => { await pg.mouse.click(p[0], p[1]); };
// The player in the cellar: answers what's on the wall and checks what the intern stamps.
const tendCellar = pg => pg.evaluate(() => {
  const R = SD.rushCore, V = SD_RUSH.S.review; if (!V) return;
  V.tickets.filter(k => k.quiz && (k.phase === 'stamped' || k.phase === 'leak')).forEach(k => R.check(V, k.id, k.internRight ? 'ok' : 'wrong'));
  V.tickets.filter(k => k.quiz && k.phase === 'ask' && V.time - k.askAt > 3).forEach(k => R.reply(V, k.id, true));
});
// Phone legibility: no text on a card or the blueprint under 11 CSS px, and every tap-the-line row at least 40 px tall.
const MIN_PX = 11, LINE_H = 40;
async function legible(pg, name, what) {
  if (name !== 'phone') return;
  const r = await pg.evaluate(([MIN_PX, LINE_H]) => {
    const small = [], short = [];
    for (const root of [document.getElementById('q'), document.getElementById('ycard')]) {
      if (!root || !root.classList.contains('on')) continue;
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n; (n = walk.nextNode());) {
        const t = n.textContent.trim(), el = n.parentElement; if (!t || !el) continue;
        const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
        if (!b.width || !b.height || cs.visibility === 'hidden' || el.closest('details:not([open]) > :not(summary)')) continue;
        const f = parseFloat(cs.fontSize); if (f < MIN_PX) small.push(t.slice(0, 30) + ' ' + f);
      }
      root.querySelectorAll('button.yc-line').forEach(b => { const h = b.getBoundingClientRect().height; if (h < LINE_H) short.push(Math.round(h)); });
    }
    return { small, short };
  }, [MIN_PX, LINE_H]);
  if (r.small.length) bad(name, what, 'text under ' + MIN_PX + ' px', r.small.slice(0, 6)); else ok(name, what, 'card text >= ' + MIN_PX + ' px');
  if (r.short.length) bad(name, what, 'tap lines under ' + LINE_H + ' px', r.short);
}
// The canvas words drawn on the phone (fillText on the game canvas): the smallest, in CSS px.
const CANVAS_WATCH = () => {
  window.__small = {};
  for (const fn of ['fillText', 'strokeText']) {
    const orig = CanvasRenderingContext2D.prototype[fn];
    CanvasRenderingContext2D.prototype[fn] = function (t, ...a) {
      // (The live window onto the other room is a thumbnail: its words are skipped.)
      if (this.canvas && this.canvas.id === 'rush' && innerWidth < 600 && String(t).trim() && this.getTransform().a / (devicePixelRatio || 1) > 0.3) {
        const px = parseFloat((this.font.match(/([\d.]+)px/) || [])[1]) * this.getTransform().a / (devicePixelRatio || 1);
        const k = String(t).slice(0, 24); if (!(k in window.__small) || px < window.__small[k]) window.__small[k] = px;
      }
      return orig.call(this, t, ...a);
    };
  }
};
// Label overlaps: every word the yard draws on the stage canvas in the last whole frame, as a box in CSS pixels. Two
// labels that cover each other count as a failure; a passing pop over a label is printed as a note (it moves and fades).
// The departure board's flaps (monospace), Dutch's words and the cellar thumbnail are left out.
const LABEL_WATCH = () => {
  window.__lab = []; window.__labLast = [];
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = f => raf(t => { window.__lab = []; f(t); window.__labLast = window.__lab; });
  const orig = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (t, x, y, ...a) {
    const m = this.getTransform(), dpr = devicePixelRatio || 1;
    if (this.canvas && this.canvas.id === 'rush' && String(t).trim() && !m.b && !m.c && m.a / dpr > 0.3 && !/monospace/.test(this.font) && this.fillStyle !== '#1e160f') {
      const px = parseFloat((this.font.match(/([\d.]+)px/) || [])[1]), w = this.measureText(t).width;
      const x0 = this.textAlign === 'center' ? x - w / 2 : this.textAlign === 'right' || this.textAlign === 'end' ? x - w : x;
      const y0 = this.textBaseline === 'middle' ? y - px * .45 : this.textBaseline === 'top' ? y : y - px * .8;
      const ui = window.SD_RUSH && SD_RUSH.yard && SD_RUSH.yard.ui;
      window.__lab.push({ t: String(t), pop: !!(ui && ui.popping), r: [(m.e + x0 * m.a) / dpr, (m.f + y0 * m.d) / dpr, w * m.a / dpr, px * .9 * m.d / dpr] });
    }
    return orig.call(this, t, x, y, ...a);
  };
};
async function labels(pg, name, shot) {
  const r = await pg.evaluate(() => {
    if (SD_RUSH.view === 'review') return [];
    // (While a crate is being dragged, its tag passing over a label is a note too.)
    const L = window.__labLast, out = [], moving = !!SD_RUSH.yard.ui.drag;
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const [a, b] = [L[i].r, L[j].r], ix = Math.min(a[0] + a[2], b[0] + b[2]) - Math.max(a[0], b[0]), iy = Math.min(a[1] + a[3], b[1] + b[3]) - Math.max(a[1], b[1]);
      if (ix <= 0 || iy <= 0 || (L[i].t === L[j].t && Math.abs(a[0] - b[0]) < 2)) continue;
      if (ix * iy > .15 * Math.min(a[2] * a[3], b[2] * b[3])) out.push({ a: L[i].t, b: L[j].t, pop: moving || L[i].pop || L[j].pop });
    }
    return out;
  });
  for (const o of r) (o.pop ? (...m) => console.log('note', ...m) : bad)(name, shot, 'labels overlap:', JSON.stringify(o.a), JSON.stringify(o.b));
  if (!r.some(o => !o.pop)) ok(name, shot, 'no labels overlap');
}
async function fits(pg, name, what) {
  const r = await pg.evaluate(() => {
    const c = document.getElementById('rush'), y = document.getElementById('ycard'), b = y && y.getBoundingClientRect();
    const belt = SD_RUSH.at.slot(SD_RUSH.S.belt.length - 1), first = SD_RUSH.at.slot(0);
    return { scroll: document.documentElement.scrollWidth > innerWidth || document.body.scrollWidth > innerWidth, w: innerWidth, h: innerHeight,
      belt: [first, belt], card: y && y.classList.contains('on') ? [b.left, b.top, b.right, b.bottom] : null };
  });
  if (r.scroll) bad(name, what, 'horizontal scroll');
  const [a, z] = r.belt;
  if (a[0] < 0 || z[0] > r.w || a[1] > r.h || z[1] > r.h) bad(name, what, 'belt off screen', JSON.stringify(r.belt));
  if (r.card && (r.card[0] < 0 || r.card[2] > r.w + 1 || r.card[3] > r.h + 1)) bad(name, what, 'card off screen', r.card.map(Math.round));
}
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port, browser = await chromium.launch();
  for (const [name, vp] of [['wide', { width: 1366, height: 768 }], ['phone', { width: 390, height: 844 }]]) {
    const pg = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await pg.addInitScript(CANVAS_WATCH);
    await pg.addInitScript(LABEL_WATCH);
    // The depot on the wide run, express mode on the phone. Crates: cracked then a snag, so a rollback and a stack
    // rollback both happen.
    const orders = name === 'wide' ? 'depot' : 'express';
    await pg.goto(`http://127.0.0.1:${port}/rush.html?claim=sorter&orders=${orders}&seed=5`);
    await pg.waitForTimeout(800);
    await pg.evaluate(() => SD.rushYard.setCrates(SD_RUSH.S, ['cracked', 'snag']));
    // The blueprint: tick the platform, the returns wagon, the timetable, the alarm wire, the test track.
    if (!(await pg.evaluate(() => document.getElementById('q').classList.contains('bp-sheet') || !!document.querySelector('.bp-sheet')))) bad(name, 'no blueprint');
    const wireFirst = await pg.evaluate(() => { const b = document.querySelector('.bp-line[data-t="wire"]'); return b.disabled; });
    if (!wireFirst) bad(name, 'the alarm wire should need the timetable first');
    for (const t of ['rack', 'bin', 'board', 'wire', 'tests']) await pg.click(`.bp-line[data-t="${t}"]`);
    if (name === 'wide') { await pg.click('.bp-depot button[data-p="immutable"]').catch(() => bad(name, 'no depot policy row')); }
    await pg.evaluate(() => { const d = document.querySelector('.bp-yaml-d'); if (d) d.open = true; });
    const yaml = await pg.evaluate(() => document.querySelector('.bp-yaml').textContent);
    if (!/AutoPublishAlias: live/.test(yaml) || !/DeploymentPreference/.test(yaml) || !/Hooks/.test(yaml)) bad(name, 'template.yaml preview', yaml.slice(0, 200));
    await legible(pg, name, 'blueprint');
    await labels(pg, name, '1-blueprint'); await pg.screenshot({ path: `${OUT}/${name}-1-blueprint.png` });
    await pg.click('.bp-go');
    await pg.waitForTimeout(500);
    const built = await pg.evaluate(() => ['rack', 'bin', 'board', 'wire', 'tests'].every(t => SD_RUSH.S[t]) && !SD_RUSH.S.manifest);
    built ? ok(name, 'blueprint built') : bad(name, 'blueprint pieces missing');
    await fits(pg, name, 'build');
    await labels(pg, name, '2-build'); await pg.screenshot({ path: `${OUT}/${name}-2-build.png` });
    // Flip each switch in the yard: the timetable, what the wire watches, the test track. Then set them back.
    const before = await pg.evaluate(() => [SD_RUSH.S.cfg, SD_RUSH.S.watch, SD_RUSH.S.testsOn]);
    await tap(pg, await pg.evaluate(() => SD_RUSH.yard.at.board()));
    await tap(pg, await pg.evaluate(() => SD_RUSH.yard.at.mast()));
    if (name === 'wide') await tap(pg, await pg.evaluate(() => SD_RUSH.yard.at.siding())); else await pg.evaluate(() => SD_RUSH.place('tests'));
    const after = await pg.evaluate(() => [SD_RUSH.S.cfg, SD_RUSH.S.watch, SD_RUSH.S.testsOn]);
    if (after[0] === before[0] || after[1] === before[1] || after[2] === before[2]) bad(name, 'switches', before, after); else ok(name, 'switches flip', before.join('/'), '->', after.join('/'));
    await pg.evaluate(() => { const Y = SD.rushYard, S = SD_RUSH.S; Y.setCard(S, 'canary'); Y.setAlarm(S, 'new'); Y.setTests(S, true); });
    // The whistle starts the night.
    await tap(pg, await pg.evaluate(() => SD_RUSH.at.lever()));
    await pg.waitForTimeout(300);
    if (!(await pg.evaluate(() => SD_RUSH.S.started))) { bad(name, 'whistle did not start'); await pg.evaluate(() => SD_RUSH.start()); }
    // The manifest, bought later from the belt as a stack update (a tap on its slot).
    await pg.evaluate(() => { SD_RUSH.S.coins += 2; });
    const mi = await pg.evaluate(() => SD_RUSH.S.belt.indexOf('manifest'));
    await tap(pg, await pg.evaluate(i => SD_RUSH.at.slot(i), mi));
    await pg.waitForTimeout(2600);
    (await pg.evaluate(() => !!SD_RUSH.S.manifest)) ? ok(name, 'manifest bought as a stack update') : bad(name, 'manifest not bought');
    // Play the night. Each step looks for something to exercise.
    const seen = { mid: false, rollback: false, slip: false, card: false, review: false, hotfix: false, busy: false, express: false, stackRb: false };
    const t0 = Date.now();
    while (Date.now() - t0 < 150000) {
      const st = await pg.evaluate(() => {
        const S = SD_RUSH.S, q = document.getElementById('q'), y = document.getElementById('ycard');
        return { over: S.over, end: q.classList.contains('end'), insp: q.classList.contains('yinsp') && !document.querySelector('.lt-go.on'), go: !!document.querySelector('.lt-go.on'),
          ycard: y.className, phase: S.y.dep && S.y.dep.phase, next: S.alias.next, w: S.alias.w, hf: S.y.hf.state, busy: SD.rushYard.groupBusy(S), held: !!S.y.held,
          rb: S.rollbacks, snags: S.snags, broken: S.y.broken && !S.y.fixAt, orders: [...S.orders].join(), view: SD_RUSH.view, time: S.time };
      });
      if (st.end) break;
      await tendCellar(pg);
      if (st.insp) {
        // Spot the line: the card's right line.
        await legible(pg, name, 'inspection card');
        await labels(pg, name, '6-config-card'); await pg.screenshot({ path: `${OUT}/${name}-6-config-card.png` });
        const r = await pg.evaluate(() => {
          const btn = [...document.querySelectorAll('#q .yc-line[data-i], #q .lt-opts button[data-i]')];
          const id = SD_RUSH.yard.ui.cards[SD_RUSH.yard.ui.cardN - 1] || null; return { n: btn.length, id: id && id.id };
        });
        const card = await pg.evaluate(id => SD.rushYard.CARDS.find(c => c.id === id), r.id);
        const pick = card ? card.kind === 'line' ? `#q .yc-line[data-i="${card.answer}"]` : `#q .lt-opts button[data-i="0"]` : '#q .yc-line[data-i], #q .lt-opts button';
        await pg.click(pick).catch(e => bad(name, 'card click', e.message));
        const right = await pg.evaluate(() => !!document.querySelector('#q .right') && !document.querySelector('#q .wrong'));
        right ? ok(name, 'inspection card answered', r.id) : bad(name, 'inspection card', r.id);
        await legible(pg, name, 'inspection answer');
        await labels(pg, name, '6b-config-card-answer'); await pg.screenshot({ path: `${OUT}/${name}-6b-config-card-answer.png` });
        await pg.click('.lt-go'); seen.card = true; continue;
      }
      if (st.go) { await pg.click('.lt-go'); continue; }
      if (st.ycard.includes('slip')) {
        if (!seen.slip) { await pg.waitForTimeout(400); await fits(pg, name, 'slip'); await legible(pg, name, 'slip'); await labels(pg, name, '4-change-set'); await pg.screenshot({ path: `${OUT}/${name}-4-change-set.png` }); seen.slip = true; }
        await pg.click('#ycard button[data-x="now"]').catch(() => {});
      }
      if (st.ycard.includes('express')) {
        seen.express = true; await pg.waitForTimeout(400); await fits(pg, name, 'express'); await legible(pg, name, 'express'); await labels(pg, name, '4b-update-failed'); await pg.screenshot({ path: `${OUT}/${name}-4b-update-failed.png` });
        await pg.click('#ycard button[data-f="rollback"]').catch(() => {});
      }
      if (st.hf === 'card' && !seen.hotfix) {
        // The hotfix crate: drag it onto the points. With a deployment going out, the group is busy.
        const from = await pg.evaluate(() => SD_RUSH.yard.at.hotfix()), to = await pg.evaluate(() => SD_RUSH.yard.at.dial());
        if (from) {
          const [taps, busyNow] = await pg.evaluate(() => [SD_RUSH.S.busyTaps, SD.rushYard.groupBusy(SD_RUSH.S)]);
          await pg.mouse.move(from[0], from[1]); await pg.mouse.down(); await pg.mouse.move((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, { steps: 4 });
          await labels(pg, name, '5-hotfix-drag'); await pg.screenshot({ path: `${OUT}/${name}-5-hotfix-drag.png` });
          await pg.mouse.move(to[0], to[1], { steps: 4 }); await pg.mouse.up();
          const r = await pg.evaluate(() => [SD_RUSH.S.busyTaps, SD_RUSH.S.y.hf.state]);
          // The group can come free during the drag (the alarm rolls back): then the drop sends it (the card's "wait").
          if (busyNow) { r[0] > taps ? (seen.busy = true, ok(name, 'hotfix drag while busy: one at a time')) : r[1] === 'card' ? bad(name, 'busy drag did nothing', r) : ok(name, 'group came free during the drag:', r[1]); }
          else ok(name, 'hotfix drag on a free group:', r[1]);
        }
        if (await pg.evaluate(() => SD_RUSH.S.y.hf.state === 'card')) {
          await fits(pg, name, 'hotfix card'); await legible(pg, name, 'hotfix card');
          await labels(pg, name, '5b-hotfix-card'); await pg.screenshot({ path: `${OUT}/${name}-5b-hotfix-card.png` });
          await pg.click('#ycard button[data-c="stop"]').catch(() => pg.click('#ycard button[data-c]'));
        }
        seen.hotfix = await pg.evaluate(() => SD_RUSH.S.y.hf.state !== 'card') || seen.hotfix;
        ok(name, 'hotfix choice', await pg.evaluate(() => SD_RUSH.S.hotfixChoice));
        continue;
      }
      if (st.phase === 'shift' && st.next && st.w > 0 && !seen.mid) { seen.mid = true; await labels(pg, name, '3-mid-deployment'); await pg.screenshot({ path: `${OUT}/${name}-3-mid-deployment.png` }); }
      // A rollback on the reverse lever: once the second deployment is shifting.
      if (seen.mid && !seen.rollback && st.phase === 'shift' && st.next && st.w > 0) {
        await tap(pg, await pg.evaluate(() => SD_RUSH.yard.at.rlever()));
        await pg.waitForTimeout(250);
        if (await pg.evaluate(rb => SD_RUSH.S.rollbacks > rb, st.rb)) { seen.rollback = true; ok(name, 'reverse lever rolled back'); await labels(pg, name, '3b-rollback'); await pg.screenshot({ path: `${OUT}/${name}-3b-rollback.png` }); }
      }
      if (st.snags) seen.stackRb = true;
      if (st.broken && !st.ycard.includes('express') && !seen.brokenNoCard) { seen.brokenNoCard = true; bad(name, 'the yard is half-built with no express card', JSON.stringify(st)); }
      // The review room in the cellar, once: through the inset, and back.
      if (!seen.review && st.time > 20 && !st.ycard.includes('on')) {
        await tap(pg, await pg.evaluate(() => SD_RUSH.at.inset()));
        await pg.waitForTimeout(500);
        if (await pg.evaluate(() => SD_RUSH.view) === 'review') { seen.review = true; ok(name, 'review room'); await labels(pg, name, '7-review-room'); await pg.screenshot({ path: `${OUT}/${name}-7-review-room.png` }); }
        else bad(name, 'inset did not switch to the review room');
        await pg.evaluate(() => SD_RUSH.switchRoom('main'));
      }
      await pg.waitForTimeout(200);
    }
    const end = await pg.evaluate(() => document.getElementById('q').classList.contains('end'));
    end ? ok(name, 'end strip') : bad(name, 'no end strip');
    await pg.waitForTimeout(600);
    await fits(pg, name, 'end');
    await labels(pg, name, '8-end'); await pg.screenshot({ path: `${OUT}/${name}-8-end.png` });
    const sum = await pg.evaluate(() => { const S = SD_RUSH.S; return { over: S.over, spill: S.spill, shipped: S.shipped, rollbacks: S.rollbacks, snags: S.snags, hotfix: S.hotfixChoice, strip: (document.querySelector('.end-strip') || {}).textContent }; });
    console.log(name, JSON.stringify(sum));
    for (const k of ['mid', 'rollback', 'slip', 'card', 'review', 'hotfix']) if (!seen[k]) bad(name, 'never saw', k);
    if (name === 'phone') {
      // The yard's own canvas words (the cellar room's art and shared pieces are claims 1-6's, not checked here).
      const small = await pg.evaluate(MIN => Object.entries(window.__small).filter(([, px]) => px < MIN - 0.25).map(([t, px]) => t + ' ' + px.toFixed(1)), MIN_PX);
      if (small.length) bad(name, 'canvas text under ' + MIN_PX + ' px', small.slice(0, 12)); else ok(name, 'canvas text >= ' + MIN_PX + ' px');
    }
    if (name === 'phone' && !seen.express) console.log('note', name, 'express: no snag broke the stack this run');
    if (errs.length) bad(name, 'page errors', errs.slice(0, 5)); else ok(name, 'no page errors');
    await pg.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? `${fail} failures` : 'all good', '· screenshots in', OUT);
  process.exit(fail ? 1 : 0);
})();
