#!/usr/bin/env node
// Ported from the first game, Isekai'd Into Prod (loyeleye/system-design-study, game/tools/offline_check.js, PR #221).
// Changed here: this game's saves, its chapter 1 dungeon, the raid finder in place of the Guild Hall, voice lines,
// the typed-answer model, and the Cloudflare build's vector art and save, which must survive a cached page.
//
// Checks offline single player (js/offline.js, sw.js): open the game once online, let it save itself, then cut the
// network (the server stops answering and the browser goes offline) and play.
//
//   node tools/offline_check.js
//
// For a local copy on desktop (music and voices saved too) and a Cloudflare copy (Server-Timing: sd-cloud, with
// api/hello) on an iPhone 13 that leaves music out:
//   - off by default: no service worker until Menu > Play offline is switched on; switching it on warns how many MB
//     it downloads (with and without music and voices), then saves core (and, on desktop, music and voices), and
//     the switch says so
//   - offline: the game reloads from the cache with no request reaching the server; the Cloudflare copy still knows
//     it's the Cloudflare copy (vector art, its own save); music and voice lines play from the cache (a byte range
//     comes back as a 206); the typed-answer model loads; the cloud and multiplayer answer "offline" at once instead
//     of waiting, and the raid finder says so; progress saves; a chapter 1 dungeon fight plays a card and a turn;
//     no broken images and no page errors
//   - switching it off warns, then deletes the saved copy and unregisters the worker; the game still opens online
//   - a deploy: a changed file is picked up on the next launch, and a list naming a file the server doesn't have yet
//     keeps the old version
// Needs Playwright (preinstalled in cloud sessions; run with NODE_PATH=$(npm root -g) if it isn't found).
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium, devices } = require('playwright');
const { build } = require('./offline_files.js');
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.svg': 'image/svg+xml' };

let LIST = build(ROOT);
// Files this server serves differently from disk: { path: Buffer }, for the deploy check.
const swap = {};
let down = false, cloud = false;
const hits = [];
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (down) { hits.push(url); return req.socket.destroy(); }
  if (url === '/offline-files.json') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(LIST)); }
  if (url === '/api/hello' && cloud) { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end('{"game":"isekaid"}'); }
  if (url.startsWith('/api/')) { res.writeHead(404); return res.end(); }
  const rel = url === '/' ? 'index.html' : url.slice(1);
  const f = path.join(ROOT, rel);
  if (!f.startsWith(ROOT) || (!swap[rel] && (!fs.existsSync(f) || fs.statSync(f).isDirectory()))) { res.writeHead(404); return res.end(); }
  const h = { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' };
  if (cloud) h['Server-Timing'] = 'sd-cloud';
  res.writeHead(200, h);
  if (swap[rel]) return res.end(swap[rel]);
  fs.createReadStream(f).pipe(res);
});

let failed = 0;
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) failed++; };
const ms = async f => { const t = Date.now(); const v = await f(); return [v, Date.now() - t]; };
const SONG = Object.keys(LIST.files).find(p => /^assets\/audio\/m-/.test(p));
const VOICE = Object.keys(LIST.files).find(p => /^assets\/audio\/vo\//.test(p));

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});

  for (const [name, dev, isCloud] of [['local copy, desktop', { viewport: { width: 1280, height: 800 } }, false], ['Cloudflare, iPhone 13', devices['iPhone 13'], true]]) {
    console.log(`-- ${name}`);
    cloud = isCloud; down = false; hits.length = 0;
    const ctx = await browser.newContext(dev);
    // Browser tests skip the service worker (js/offline.js) unless they ask for it.
    await ctx.addInitScript(() => { try { localStorage.setItem('isekai-cloud-sw', '1'); } catch (e) { /* about:blank */ } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(e.message));
    const opened = () => page.waitForFunction(() => window.SD && SD.main && SD.state && SD.state.save && document.querySelector('#title-actions button'), null, { timeout: 30000 });

    // ---- Online: off until the player switches it on ----
    await page.goto(base + 'index.html');
    await opened();
    check(await page.evaluate(() => SD.offline.supported()), 'the game can be saved for offline here');
    await page.waitForTimeout(500);
    check(await page.evaluate(async () => !SD.offline.enabled() && !(await navigator.serviceWorker.getRegistrations()).length), 'off by default: no service worker');
    await page.evaluate(() => SD.main.menu());
    const row = await page.waitForSelector('#m-offline', { timeout: 5000 }).then(el => el.evaluate(e => ({ on: e.getAttribute('aria-checked'), text: e.textContent })), () => null);
    check(row && row.on === 'false' && /Play offline: Off/.test(row.text), `the menu has a Play offline switch, off ${JSON.stringify(row)}`);
    if (row) await page.click('#m-offline');
    const warn = await page.waitForSelector('#of-on', { timeout: 5000 }).then(() => page.evaluate(() => {
      const with_ = document.querySelector('#of-on').textContent; document.querySelector('#of-mu').click();
      const without = document.querySelector('#of-on').textContent; document.querySelector('#of-mu').click();
      return { with_, without, music: document.querySelector('#of-mu').checked };
    }), () => null);
    const mbOf = t => +((/(\d+) MB/.exec(t || '') || [])[1] || 0);
    check(warn && mbOf(warn.with_) > mbOf(warn.without) + 100 && mbOf(warn.without) > 20, `switching it on warns how much it downloads ${JSON.stringify(warn)}`);
    // Desktop takes the music and voices; the phone leaves them out.
    if (warn && warn.music === isCloud) await page.click('#of-mu');
    await page.click('#of-on');
    await page.waitForSelector('#m-offline', { timeout: 5000 }).catch(() => null);
    check(await page.evaluate(() => SD.offline.enabled() && document.querySelector('#m-offline').getAttribute('aria-checked') === 'true'), 'Download turns the switch on and goes back to the menu');
    await page.evaluate(() => SD.ui.closePanel());
    const [, coreMs] = await ms(() => page.waitForFunction(() => SD.offline.ready(), null, { timeout: 180000 }).catch(() => null));
    check(await page.evaluate(() => SD.offline.ready()), `core saved (${(coreMs / 1000).toFixed(1)} s)`);
    if (!isCloud) {
      await page.waitForFunction(() => { const s = SD.offline.state(); return s.music.total && s.music.got >= s.music.total; }, null, { timeout: 300000 }).catch(() => null);
      const st = await page.evaluate(() => SD.offline.state());
      check(st.music.total > 0 && st.music.got >= st.music.total, `music and voices saved too (${Math.round(st.music.got / 1e6)} of ${Math.round(st.music.total / 1e6)} MB)`);
    }
    check(await page.evaluate(() => !!navigator.serviceWorker.controller), 'the service worker controls the page');
    const vector = () => page.evaluate(() => [!!window.SD_VECTOR, document.documentElement.classList.contains('vector')]);
    const v0 = await vector();
    check(v0[0] === isCloud && v0[1] === isCloud, `online: ${isCloud ? 'the Cloudflare copy plays the vector art' : 'the local copy plays the painted art'}`);
    if (isCloud) check(await page.evaluate(() => SD.cloud.available()), 'online: the Worker answers');
    // A save to come back to.
    await page.evaluate(() => { SD.state.save.shards = 4321; SD.state.persist(); });
    const saveKey = isCloud ? 'isekai-cloud-vector-v1' : 'isekai-cloud-save-v1';

    // ---- Offline ----
    const goOffline = async () => { down = true; hits.length = 0; await ctx.setOffline(true); };
    // Each launch checks sw.js and the file list for updates; offline both fail quietly.
    const missed = () => [...new Set(hits.filter(u => u !== '/sw.js' && u !== '/offline-files.json'))];
    await goOffline();
    const [, loadMs] = await ms(async () => { await page.goto(base + 'index.html'); await opened(); });
    check(true, `offline: the game opens (${(loadMs / 1000).toFixed(1)} s)`);
    const v1 = await vector();
    check(v1[0] === isCloud && v1[1] === isCloud, `offline: still ${isCloud ? 'the Cloudflare copy (vector art)' : 'the painted art'} ${JSON.stringify(v1)}`);
    check(await page.evaluate(() => SD.state.save.shards === 4321), 'offline: the same save opens');

    // Music and voices from the cache, as <audio> asks for them (a byte range); on the phone they aren't saved.
    const mp3 = await page.evaluate(async f => {
      try { const r = await fetch(f, { headers: { range: 'bytes=0-99' } }); return { status: r.status, len: (await r.arrayBuffer()).byteLength, range: r.headers.get('content-range') }; } catch (e) { return { status: 'failed' }; }
    }, SONG);
    if (!isCloud) {
      check(mp3.status === 206 && mp3.len === 100 && /^bytes 0-99\/\d+$/.test(mp3.range), `offline: music comes from the cache in ranges ${JSON.stringify(mp3)}`);
      for (const f of [SONG, VOICE]) {
        const r = await page.evaluate(f => new Promise(res => {
          const a = new Audio(f);
          a.oncanplay = () => res('plays'); a.onerror = () => res('error'); setTimeout(() => res('timeout'), 8000);
        }), f);
        check(r === 'plays', `offline: ${f} loads in an <audio> element (${r})`);
      }
    } else check(mp3.status === 'failed', 'offline: music the player said no to isn\'t saved, and fails at once');
    const sfx = await page.evaluate(() => fetch('assets/audio/s-anvil1.mp3').then(r => r.status, () => 'failed'));
    check(sfx === 200, `offline: sound effects are saved with core (${sfx})`);

    // The typed-answer model.
    check(await page.evaluate(() => SD.embed.load().then(ok => ok && SD.embed.ready, () => false)), 'offline: the typed-answer model loads');

    // Network features answer at once.
    const [avail, availMs] = await ms(() => page.evaluate(() => SD.cloud.available()));
    check(avail === false && availMs < 1000, `offline: the cloud reports unavailable in ${availMs} ms`);
    const [hub, hubMs] = await ms(() => page.evaluate(() => SD.net.open().then(h => ({ mode: h.mode, offline: h.offline }))));
    check(hub.offline && hub.mode === 'local' && hubMs < 1500, `offline: multiplayer opens in ${hubMs} ms and knows it's offline ${JSON.stringify(hub)}`);
    // Chapter 1's story done, with Kai leading: the dungeon and the raids are open.
    await page.evaluate(() => {
      const S = SD.state;
      S.save.flags.prologue = true; S.save.flags.ch1 = true;
      S.save.c1 = { lead: 'kai', f: { intro: true, cart: true, brief: true, done: true }, deck: SD.starterDeck.map(id => ({ id, up: false })), pos: null };
      S.persist();
    });
    if (await page.evaluate(() => SD.mp && SD.mp.available())) {
      await page.evaluate(() => {
        SD.mp.open('title');
      });
      const note = await page.waitForFunction(() => { const r = document.querySelector('#run'); return r && /offline/i.test(r.textContent) && r.textContent; }, null, { timeout: 8000 }).then(h => h.jsonValue(), () => '');
      check(/offline/i.test(note), 'offline: the raid finder says why no one else\'s party shows');
      await page.goto(base + 'index.html'); await opened();
    }

    // The save still saves.
    await page.evaluate(() => { SD.state.save.shards = 1234; SD.state.persist(); });
    check(await page.evaluate(k => JSON.parse(localStorage.getItem(k) || '{}').shards === 1234, saveKey), 'offline: progress saves in this browser');

    // The switch's line in the menu.
    await page.waitForFunction(() => SD.offline.ready(), null, { timeout: 10000 }).catch(() => null);
    await page.evaluate(() => SD.main.menu());
    const line = await page.evaluate(() => document.querySelector('#m-offline').textContent);
    check(/Play offline: On/.test(line) && /Saved on this device/.test(line) && (isCloud ? /no music/.test(line) : /with music and voices/.test(line)), `offline: the switch says what's saved ("${line}")`);
    await page.evaluate(() => SD.ui.closePanel());

    // A chapter 1 dungeon fight: a card, End turn.
    await page.evaluate(() => {
      const S = SD.state;
      SD.ui.dialog = async () => {}; SD.ui.closePanel();
      S.save.flags.boardTut = false;
      SD.run.start(1);
    });
    await page.waitForFunction(() => document.querySelector('#run .node'), null, { timeout: 15000 }).catch(() => null);
    await page.evaluate(() => { SD.ui.closePanel(); const pools = SD.chapters[1].pools; SD.run.api.fight((pools[1] || pools[2])[0], {}, () => SD.run.showMap()); });
    const inFight = await page.waitForSelector('#end-turn', { timeout: 10000 }).then(() => true, () => false);
    check(inFight, 'offline: a dungeon fight opens');
    if (inFight) {
      await page.waitForFunction(() => { const C = SD.run.api.combat(); return C && !C.busy && C.hand.length; }, null, { timeout: 10000 }).catch(() => null);
      await page.waitForTimeout(500);
      // A card that draws keeps the hand's size, so count the hand, the discard and the capacity.
      const snap = () => page.evaluate(() => { const C = SD.run.api.combat(); return [C.hand.length, C.disc.length, C.energy]; });
      const before = await snap();
      const i = await page.evaluate(() => [...document.querySelectorAll('#run .hand .card')].findIndex(c => !c.classList.contains('dim')));
      await (isCloud ? page.tap(`#run .hand .card >> nth=${i}`) : page.click(`#run .hand .card >> nth=${i}`));
      await page.waitForTimeout(700);
      const after = await snap();
      check(after[0] < before[0] || after[1] > before[1] || after[2] < before[2], `offline: a card plays ${JSON.stringify([before, after])}`);
      const turn = await page.evaluate(() => SD.run.api.combat().turn);
      await (isCloud ? page.tap('#end-turn') : page.click('#end-turn'));
      const ended = await page.waitForFunction(t => { const C = SD.run.api.combat(); return C.over || (!C.busy && C.turn > t); }, turn, { timeout: 10000 }).then(() => true, () => false);
      check(ended, 'offline: End turn plays the foe\'s turn');
    }
    const art = await page.evaluate(() => [...document.images].filter(im => im.src && im.complete && !im.naturalWidth).map(im => im.src));
    check(!art.length, 'offline: no broken images' + (art.length ? ': ' + art.slice(0, 3).join(', ') : ''));
    const m = missed();
    check(!m.length, 'offline: no request reached the server' + (m.length ? ': ' + m.slice(0, 8).join(', ') : ''));
    down = false;
    await ctx.setOffline(false);

    // ---- Switching it off ----
    await page.goto(base + 'index.html');
    await opened();
    await page.evaluate(() => SD.main.menu());
    await page.click('#m-offline');
    const del = await page.waitForSelector('#of-off', { timeout: 5000 }).then(() => page.evaluate(() => document.querySelector('#panel').textContent), () => '');
    check(/delete/i.test(del) && /\d+ MB/.test(del) && /download it again/.test(del), `switching it off warns that the download is deleted ("${del.replace(/\s+/g, ' ').slice(0, 90)}…")`);
    await page.click('#of-off');
    await page.waitForSelector('#m-offline', { timeout: 5000 }).catch(() => null);
    const gone = await page.evaluate(async () => ({
      on: SD.offline.enabled(), sw: (await navigator.serviceWorker.getRegistrations()).length,
      caches: (await caches.keys()).filter(k => /^isekai-cloud-(offline|fonts)/.test(k)), row: document.querySelector('#m-offline').getAttribute('aria-checked')
    }));
    check(!gone.on && !gone.sw && !gone.caches.length && gone.row === 'false', `Turn off and delete: nothing saved, no worker, switch off ${JSON.stringify(gone)}`);
    await page.goto(base + 'index.html');
    await opened();
    check(await page.evaluate(() => !navigator.serviceWorker.controller), 'after switching off, the game opens from the network');
    check(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
    await ctx.close();
  }

  // ---- A deploy reaches a device on its next launch ----
  {
    console.log('-- deploy');
    cloud = false; down = false;
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => { try { localStorage.setItem('isekai-cloud-sw', '1'); } catch (e) { /* about:blank */ } });
    // Switched on without music, as the warning does.
    await ctx.addInitScript(() => { try { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('isekai-cloud-offline', '1'); localStorage.setItem('isekai-cloud-offline-music', '0'); sessionStorage.setItem('seeded', '1'); } } catch (e) { /* about:blank */ } });
    const page = await ctx.newPage();
    await page.goto(base + 'index.html');
    await page.waitForFunction(() => window.SD && SD.offline && SD.offline.ready(), null, { timeout: 180000 });
    const v1 = await page.evaluate(() => SD.offline.state().v);
    // The deploy is mid-spread: the list names a new js/eli5.js the server doesn't have yet. Nothing switches.
    const f = 'js/eli5.js', orig = fs.readFileSync(path.join(ROOT, f));
    const next = Buffer.concat([orig, Buffer.from('\n// deploy 2\n')]);
    LIST = JSON.parse(JSON.stringify(LIST));
    LIST.files[f] = [crypto.createHash('sha256').update(next).digest('hex').slice(0, 16), next.length, 'core'];
    LIST.v = 'test-v2';
    await page.reload();
    await page.waitForFunction(() => window.SD && SD.offline && SD.offline.state().v === 'test-v2' && SD.offline.state().phase !== 'core', null, { timeout: 30000 }).catch(() => null);
    let served = await page.evaluate(f => fetch(f).then(r => r.text()), f);
    check(!/deploy 2/.test(served), 'deploy: a list ahead of the server keeps the saved version');
    // Now the server has it: the next launch picks it up and serves it.
    swap[f] = next;
    await page.reload();
    await page.waitForFunction(() => window.SD && SD.offline && SD.offline.state().v === 'test-v2' && SD.offline.state().phase === 'ready', null, { timeout: 30000 }).catch(() => null);
    delete swap[f];
    served = await page.evaluate(f => fetch(f).then(r => r.text()), f);
    check(/deploy 2/.test(served) && v1 !== 'test-v2', 'deploy: the new version is saved and served on the next launch');
    await ctx.close();
  }

  await browser.close(); server.close();
  console.log(failed ? `${failed} failed` : 'all passed');
  process.exit(failed ? 1 : 0);
})();
