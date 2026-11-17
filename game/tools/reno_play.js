// A real-time playthrough of the Renovation (Architect's Draft): nights 1 to 3, the board through every job to the
// Grand Opening, with animations and Seymour's runs at their real speed (no skipping), at one screen size. On every
// screen it checks the seams between screens: the scene fills the stage under the top bar, nothing scrolls sideways,
// the top bar stays on top, nothing a player must press is off screen or under the scene, and the music and stings
// that should play do. It plays each job with its best plan (R.par), after one failing plan on the first job of each
// night, and answers every permit question right except one a night.
// Run from game/:  node tools/reno_play.js [phone|desktop]     SHOTS=dir saves a screenshot of every screen.
// Later nights: NIGHTS=4-6 starts on night 4 (the save seeded as if nights 1 to 3 were played) and plays to night 6;
// MISSES=rush,grandBridge seeds the jobs missed before the first of them; GIVE=n4j2,n4j5 takes those jobs to the permit
// on a failing plan, so they're missed, and checks they come back first (a Grand Opening as the next Grand Opening).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const SIZE = process.argv[2] === 'desktop' ? { width: 1280, height: 800 } : { width: 375, height: 667 };
const TAG = process.argv[2] === 'desktop' ? 'desktop' : 'phone';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.mp4': 'video/mp4', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const [N0, N1] = (process.env.NIGHTS || '1-3').split('-').map(Number).concat([]).map((x, i, a) => x || a[0]);
const NIGHTS = []; for (let n = N0; n <= (N1 || N0); n++) NIGHTS.push(n);
const MISSES = (process.env.MISSES || '').split(',').filter(Boolean);
const GIVE = new Set((process.env.GIVE || '').split(',').filter(Boolean));

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] } : {});
  const ctx = await browser.newContext({ viewport: SIZE, hasTouch: TAG === 'phone', isMobile: TAG === 'phone', deviceScaleFactor: 1,
    recordVideo: process.env.VIDEO ? { dir: process.env.VIDEO, size: SIZE } : undefined });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const missing = new Set();
  page.on('response', r => { if (r.status() === 404) missing.add(r.url().replace(/^https?:\/\/[^/]+\//, '')); });
  let n = 0;
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${TAG}-${String(++n).padStart(3, '0')}-${name}.png`) }); };

  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.goto(url);
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');
  await page.evaluate(() => {
    SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render();
    // Every sound the game asks for, in order: music loops, stings, effects and voice lines.
    const A = SD.audio; window.__snd = [];
    ['music', 'jingle', 'sfx', 'voice', 'stop'].forEach(k => { const f = A[k]; if (typeof f !== 'function') return; A[k] = function () { window.__snd.push(k + ':' + String(arguments[0] == null ? '' : arguments[0]) + (document.body.classList.contains('in-mode') ? '' : ' (title)')); return f.apply(this, arguments); }; });
  });
  const heard = [];
  const sounds = async () => { const x = await page.evaluate(() => window.__snd.splice(0)); heard.push(...x); return x; };

  // ---- The seams, measured on whatever screen is up ----
  const audit = async where => {
    const r = await page.evaluate(() => {
      const W = innerWidth, H = innerHeight, bad = [];
      const wbA = document.querySelector('#panel .win-b'), at = wbA ? Math.round(wbA.scrollTop) : 0;
      if (document.documentElement.scrollWidth > W + 1) bad.push('page scrolls sideways (' + document.documentElement.scrollWidth + 'px)');
      const p = document.querySelector('#panel');
      if (!p || p.hidden) return { bad: ['no panel'], info: {} };
      p.querySelectorAll('.win *').forEach(el => {
        if (el.closest('.rs-cam') || el.closest('.rs-world')) return;
        const b = el.getBoundingClientRect(), cs = getComputedStyle(el);
        if (!b.width || cs.visibility === 'hidden' || cs.display === 'none') return;
        if (b.right > W + 1 || b.left < -1) bad.push('sticks out sideways: ' + (el.id || String(el.className).split(' ')[0] || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      });
      // The top bar is the topmost thing where it sits.
      const bar = document.querySelector('#mode-bar');
      if (bar && !bar.hidden) {
        const bb = bar.getBoundingClientRect();
        [[W / 2, bb.top + bb.height / 2], [W - 20, bb.top + bb.height / 2]].forEach(([x, y]) => { const e = document.elementFromPoint(x, y); if (e && !bar.contains(e)) bad.push('top bar covered by ' + (e.className || e.tagName)); });
      }
      // The scene (any visible .rs): fills the stage under the bar, edge to edge, and the camera covers its box.
      const scenes = [...p.querySelectorAll('.rs')].filter(el => el.offsetParent !== null && el.getBoundingClientRect().height > 0);
      const info = { scenes: scenes.length };
      const top = bar && !bar.hidden ? bar.getBoundingClientRect().bottom : 0;
      scenes.forEach(el => {
        const b = el.getBoundingClientRect(), fixed = !!el.closest('.rn-world, .rn-pq');
        const cam = el.querySelector('.rs-cam'), sz = el.querySelector('.rs-sizer'), wd = el.querySelector('.rs-world');
        info.scene = { left: Math.round(b.left), top: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), fixed, shot: el.dataset.shot, kind: el.dataset.kind };
        if (Math.round(b.left) > 0 || Math.round(b.right) < W) bad.push(`scene not edge to edge (${Math.round(b.left)}..${Math.round(b.right)})`);
        if (fixed && (Math.round(b.top) > Math.round(top) + 1 || Math.round(b.bottom) < H - 1)) bad.push(`full-screen scene doesn't fill the stage (${Math.round(b.top)}..${Math.round(b.bottom)} of ${Math.round(top)}..${H})`);
        if (cam && sz && wd) {
          const wb = wd.getBoundingClientRect(), cb = cam.getBoundingClientRect();
          if (wb.bottom < cb.bottom - 1 || wb.top > cb.top + 1) bad.push(`the painting leaves a dark band (world ${Math.round(wb.top)}..${Math.round(wb.bottom)}, camera ${Math.round(cb.top)}..${Math.round(cb.bottom)})`);
          if (sz.offsetWidth < cam.clientWidth - 1) bad.push(`the painting is narrower than the camera (${sz.offsetWidth} < ${cam.clientWidth})`);
        }
      });
      // Every button the player needs: on the page and not hidden under the scene.
      const btns = [...p.querySelectorAll('.win button.primary, .win #rn-skip')].filter(el => el.offsetParent !== null);
      btns.forEach(el => {
        el.scrollIntoView({ block: 'center' });
        const b = el.getBoundingClientRect(), e = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        if (!e || (e !== el && !el.contains(e))) bad.push(`${el.id || el.textContent.trim().slice(0, 24)} can't be pressed: under ${e ? (e.className || e.tagName) : 'nothing'}`);
      });
      info.at = at;
      const pb = p.querySelector('.win-b');
      if (pb) pb.scrollTop = 0; p.scrollTop = 0;
      const sc = p.querySelector('.win-b') || p;
      info.scroll = Math.max(0, (sc.scrollHeight || 0) - (sc.clientHeight || 0));
      return { bad: [...new Set(bad)].slice(0, 6), info };
    });
    if (!/playing|verdict|refused/.test(where) && r.info.at) r.bad.push(`opens scrolled ${r.info.at}px down`);
    check(!r.bad.length, `${TAG} ${where}: seams${r.bad.length ? ': ' + r.bad.join(' | ') : ''}`);
    return r.info;
  };
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.reno)));
  const answer = right => page.evaluate(async right => {
    const p = document.querySelector('#panel'), q = SD.modes.current();
    const w = ms => new Promise(r => setTimeout(r, ms));
    const said = p.querySelector('#q-said'); if (said) { said.click(); await w(30); }
    const tf = p.querySelector('#tf-idk'); if (tf) { tf.click(); await w(30); }
    if (q.type === 'mc') p.querySelector(`[data-o="${right ? q.a : q.opts.findIndex((o, i) => i !== q.a)}"]`).click();
    else if (q.type === 'multi') q.items.forEach((it, i) => { if (right ? it.ok : !it.ok) p.querySelector(`[data-m="${i}"]`).click(); });
    await w(30);
    return q.id;
  }, right);
  const click = async (sel, name) => {
    await page.click(sel);
    await wait(60); await shot(name + '-cut');     // the first frames of whatever comes next: a flash or a jump shows here
    await wait(500);
  };

  // Sets the plan through the game's own handlers (the knobs' data), then redraws.
  // The template card's blanks: the first time a term shows up, it's written out in full before the plan runs.
  const writeBlanks = async () => { for (let i = 0; i < 8; i++) { const x = await page.$('.rn-blank:not(.ok)'); if (!x) break; await x.fill(await x.getAttribute('data-term')); await page.waitForTimeout(520); } };
  const runPlan = async () => { await writeBlanks(); await page.click('#rn-run'); };
  const setPlan = plan => page.evaluate(plan => { const s = SD.state.save.reno; s.jobs[s.at].plan = Object.assign({}, s.jobs[s.at].plan || {}, plan); SD.state.persist(); SD.renoUi.draw(); }, plan);
  const par = () => page.evaluate(() => { const s = SD.state.save.reno, j = SD.reno.job(s.jobs[s.at].id, s.jobs[s.at].seed); const b = SD.reno.par(j); return { plan: b && b.plan, d: j.d, title: j.title, grand: !!j.grand }; });
  const failing = () => page.evaluate(() => { const s = SD.state.save.reno, j = SD.reno.job(s.jobs[s.at].id, s.jobs[s.at].seed); const p = SD.reno.plans(j).find(x => { const r = SD.reno.inspect(j, x); return !r.refused && !r.pass; }); return p || null; });

  // One job: the board, the plan, the runs at full speed, the verdict, the permit and its question, the building.
  const job = async (night, k, o) => {
    const tag = `n${night}j${k + 1}`;
    let s = await st();
    check(s.phase === 'board', `${TAG} ${tag}: each job starts on the night's board`);
    await audit(tag + ' board'); await shot(tag + '-board');
    console.log('     sounds on the board: ' + (await sounds()).join(', '));
    await click('#rn-go', tag + '-to-plan');
    const info = await par();
    // The first job of a night: a plan that fails (or, where every plan that builds passes, one the client refuses).
    const give = GIVE.has(tag) ? await failing() : null;
    if (GIVE.has(tag)) check(!!give, `${TAG} ${tag}: a failing plan exists to take to the permit`);
    const plans = give ? [give] : o.fail ? [(await failing()) || { refuse: true }, info.plan] : [info.plan];
    for (let i = 0; i < plans.length; i++) {
      if (plans[i].refuse) {
        await runPlan(); await wait(600);
        check(!!(await page.$('.rn-refused')), `${TAG} ${tag}: the default plan is refused, in the client's words`);
        await audit(`${tag} refused`); await shot(`${tag}-refused`);
        continue;
      }
      await setPlan(plans[i]); await wait(400);
      const pi = await audit(`${tag} plan ${i + 1} (${info.title})`);
      if (pi.scroll != null) console.log(`     plan screen: ${pi.scroll}px to scroll to the Renovate button`);
      await shot(`${tag}-plan${i + 1}`);
      const t0 = Date.now();
      await runPlan();
      await wait(60); await shot(`${tag}-run${i + 1}-start`);
      await audit(`${tag} run ${i + 1} playing`);
      // Watch the cutscene at its real pace: a frame every 1.5s, until the verdict.
      let f = 0;
      while (!(await page.$('.rn-after:not([hidden])')) && Date.now() - t0 < 60000) { await wait(1500); if (f < 12) await shot(`${tag}-run${i + 1}-${String(++f).padStart(2, '0')}`); }
      const secs = (Date.now() - t0) / 1000;
      check(secs < 45, `${TAG} ${tag} run ${i + 1}: Seymour's runs play out in ${secs.toFixed(1)}s`);
      await wait(400);
      await audit(`${tag} verdict ${i + 1}`); await shot(`${tag}-verdict${i + 1}`);
      if (i < plans.length - 1 && !plans[i + 1].refuse) { check(!!(await page.$('#rn-again')), `${TAG} ${tag}: a failed plan offers another`); await click('#rn-again', `${tag}-again`); }
    }
    console.log('     sounds through the runs: ' + (await sounds()).join(', '));
    if (give) {
      const g = (await page.$('#rn-give')) ? '#rn-give' : '#rn-deb';
      check(!!(await page.$(g)), `${TAG} ${tag}: a failed plan can go to the permit as it is`);
      await click(g, tag + '-give');
    } else {
      check(!!(await page.$('#rn-deb')), `${TAG} ${tag}: the plan passes and the permit follows`);
      await click('#rn-deb', tag + '-to-permit');
    }
    // Seymour's what-if (the second and fourth job of a night): chalk every line, run it, then on to the permit.
    if (await page.$('#rn-wi-run')) {
      await audit(tag + ' what-if'); await shot(tag + '-whatif');
      check(await page.$eval('#rn-wi-run', x => x.disabled), `${TAG} ${tag}: the what-if can't run until every line is chalked`);
      const n = (await page.$$('[data-wi]')).length;
      for (let i = 0; i < n; i++) await page.click(`[data-wi="${i}"]`);
      await click('#rn-wi-run', tag + '-whatif-run'); await wait(400);
      check(!!(await page.$('.rn-wi .rn-wiyou')), `${TAG} ${tag}: the what-if fills in the slate and marks each line you chalked`);
      await audit(tag + ' what-if result'); await shot(tag + '-whatif-result');
      await click('#rn-wi-on', tag + '-whatif-on');
    }
    await audit(tag + ' permit'); await shot(tag + '-permit');
    await page.click('#rn-ask');
    await page.waitForFunction(() => !!SD.modes.current() && document.querySelector('#panel [data-c]'), null, { timeout: 8000 });
    await wait(500);
    await audit(tag + ' permit question'); await shot(tag + '-question');
    await answer(o.right);
    await page.click('[data-c="1"]');
    await wait(700);
    await audit(tag + ' permit verdict'); await shot(tag + '-answered');
    await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
    if (await page.$('#q-next')) await click('#q-next', tag + '-to-after');
    await page.waitForFunction(() => SD.state.save.reno.phase === 'after', null, { timeout: 5000 });
    await wait(300);
    await audit(tag + ' the building'); await shot(tag + '-after');
    console.log('     sounds through the permit: ' + (await sounds()).join(', '));
    await click('#rn-next', tag + '-next');
    return info;
  };

  if (N0 > 1) await page.evaluate(([n, misses]) => { SD.state.save.renoKeep = { night: n - 1, taught: {}, carry: [], misses, last: {} }; delete SD.state.save.reno; SD.state.persist(); }, [N0, MISSES]);
  for (const night of NIGHTS) {
    const before = await page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.renoKeep || { misses: [] })));
    await page.evaluate(() => SD.modes.open()); await wait(400);
    await page.click('[data-mode="draft"]'); await wait(900);
    const s = await st();
    check(s.night === night, `${TAG}: night ${night} opens`);
    const ids = s.jobs.map(j => j.id);
    console.log(`     night ${night}'s jobs: ${ids.join(', ')} (missed before: ${(before.misses || []).join(', ') || 'none'})`);
    if (night > 3) {
      const T = await page.evaluate(() => Object.fromEntries(Object.entries(SD.reno.T).map(([k, v]) => [k, { d: v.d, grand: !!v.grand }])));
      const miss = before.misses || [], back = miss.filter(id => !T[id].grand), gm = miss.find(id => T[id].grand);
      const per = {}; ids.slice(0, -1).forEach(id => { per[T[id].d] = (per[T[id].d] | 0) + 1; });
      const want = back.filter((id, i) => back.slice(0, i).filter(x => T[x].d === T[id].d).length < 2).slice(0, ids.length - 1);
      check(want.every((id, i) => ids[i] === id), `${TAG} night ${night}: the jobs missed before come back first (${want.join(', ') || 'none'})`);
      check(!gm || ids[ids.length - 1] === gm, `${TAG} night ${night}: a missed Grand Opening comes back as tonight's (${gm || 'none'})`);
      check(['eb', 'lam', 'cfn'].every(d => per[d]), `${TAG} night ${night}: the jobs before the Grand Opening mix all three districts (${JSON.stringify(per)})`);
      check(Object.values(per).every(x => x <= 2), `${TAG} night ${night}: no more than two jobs from one district before the Grand Opening`);
      check(new Set(ids).size === ids.length, `${TAG} night ${night}: no job twice in a night`);
    }
    console.log(`     sounds entering night ${night}: ` + (await sounds()).join(', '));
    for (let k = 0; k < s.jobs.length; k++) await job(night, k, { fail: k === 0, right: k !== 1 });
    // The Grand Opening: the market square, the ribbon cut a beat after the screen opens.
    const endS = await st(), cut = endS.jobs[endS.jobs.length - 1].pass;
    check(endS.phase === 'end', `${TAG} night ${night}: the night ends on the Grand Opening`);
    await shot(`n${night}-end-0s`);
    await wait(1400);
    await audit(`night ${night} Grand Opening`); await shot(`n${night}-end`);
    const snd = await sounds();
    console.log(`     sounds at the Grand Opening: ` + snd.join(', '));
    if (cut) check(snd.some(x => /ribbon|draft-win/.test(x)), `${TAG} night ${night}: the ribbon sting plays when the ribbon is cut, in the square`);
    else check(!snd.some(x => /ribbon|draft-win/.test(x)), `${TAG} night ${night}: no ribbon sting when the ribbon stays uncut`);
    await page.click('#rn-done'); await wait(900);
    console.log(`     sounds leaving: ` + (await sounds()).join(', '));
    await shot(`n${night}-home`);
  }

  await sounds();
  check(!heard.some(x => /thunder$/.test(x)), `${TAG}: no title-screen thunder once a night is open`);
  check(!errors.length, `${TAG}: no page errors` + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  check(!missing.size, `${TAG}: every file the game asked for exists` + (missing.size ? ': ' + [...missing].slice(0, 5).join(', ') : ''));
  await ctx.close(); await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nThe whole playthrough passed.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
