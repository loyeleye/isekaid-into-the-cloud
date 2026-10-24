#!/usr/bin/env node
// Checks the wearable cosmetics (js/wear.js): every item has its art, its vector shape and a café price; equipping
// keeps one item a slot and only what you own; your lead's faceset, full body and vector figure show what's worn and
// nobody else's do; a party member's presence can't put junk on a seat; the Wardrobe equips and takes off.
// Run from game/:  node tools/wear_check.js
// Needs Playwright (preinstalled in cloud sessions; PLAYWRIGHT_BROWSERS_PATH points at Chromium there).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  let fail = 0;
  const check = (ok, msg) => { if (ok) console.log('ok   ' + msg); else { fail++; console.log('FAIL ' + msg); } };

  // The café's price list (js/economy.js loads only under the full profile, so read it on its own).
  const econ = (() => { const SD = { profile: 'full' }; new Function('SD', fs.readFileSync(path.join(ROOT, 'js/economy.js'), 'utf8'))(SD); return SD.econ; })();

  for (const vector of [false, true]) {
    const mode = vector ? 'vector' : 'pixel';
    await page.goto(url + (vector ? '?vector' : ''));
    await page.waitForFunction(() => window.SD && SD.main && SD.wear);
    const items = await page.evaluate(() => Object.keys(SD.wear.ITEMS));
    if (!vector) {
      check(items.length >= 10, `${items.length} items`);
      items.forEach(id => {
        check(fs.existsSync(path.join(ROOT, 'assets/img/wear', id + '.webp')) && fs.existsSync(path.join(ROOT, 'assets/img/wear', id + '-s.webp')), `${id}: both pictures`);
        check(econ.cosmeticCost(id) > 0, `${id}: on the Cache Café's list`);
      });
      check(econ.COSMETICS.items.filter(x => /^(hat|scarf)-/.test(x.id)).every(x => items.includes(x.id)), 'every hat and scarf the café sells can be worn');
    }

    const r = await page.evaluate(async () => {
      const W = SD.wear, out = {};
      document.body.dataset.lead = 'kai';
      out.none = W.worn().length;
      out.junk = W.equip('mug') === false && W.equip('nope') === false && W.slot('mug') === null;
      W.equip('hat-beanie'); W.equip('scarf-red'); W.equip('hat-crown');
      out.worn = W.worn().join(',');
      out.saved = JSON.stringify(SD.state.save.fg.wear);
      out.kai = (SD.art.portrait('kai', 120, 'smile').match(/class="wear /g) || []).length;
      out.mira = (SD.art.portrait('mira', 120, 'smile').match(/class="wear /g) || []).length;
      out.preview = (W.bust('mira', 'neutral', ['hat-party']).match(/class="wear /g) || []).length;
      out.clean = W.clean(['hat-crown', 'hat-party', '"><script>', 42, 'scarf-knit', 'mug']).join(',');
      // The full body: a crown sticks up over Kai's hair, so the picture gains rows on top.
      const m = await new Promise(res => { const x = W.stand('kai', 'assets/img/lead/kai.webp', ['hat-crown'], res); if (x) res(x); });
      out.stand = m && m.h > 138 && m.top > 0 && m.w === 84;
      const el = document.createElement('div');
      el.style.cssText = 'width:84px;height:138px;background-image:url(assets/img/lead/kai.webp)';
      W.dressSprite(el, 'kai', ['hat-crown']);
      await new Promise(res => setTimeout(res, 300));
      out.sprite = /blob:/.test(el.style.backgroundImage) && parseFloat(el.style.height) > 138;
      if (SD.vec && SD.vec.fig) {
        const a = SD.vec.fig('kai', 'neutral', 'full'), b = SD.vec.fig('kai', 'neutral', 'full', null, []), c = SD.vec.fig('mira', 'neutral', 'full');
        out.vec = a !== b && decodeURIComponent(a).includes('#f2c230') && !decodeURIComponent(b).includes('#f2c230') && !decodeURIComponent(c).includes('#f2c230');
        out.leadImg = /svg/.test(getComputedStyle(document.body).getPropertyValue('--lead-img'));
      }
      W.unequip('hat');
      out.after = W.worn().join(',');
      W.unequip('scarf');
      // Owning: with the economy loaded, only what's bought.
      SD.econ = { state: () => ({ cosmetics: ['scarf-knit'] }), cosmeticCost: () => 100 };
      out.owned = W.equip('hat-golden') === false && W.equip('scarf-knit') === true;
      W.open();
      out.locked = document.querySelectorAll('#panel [data-wear]:disabled').length;
      document.querySelector('#panel [data-off="scarf"]').click();
      out.wardrobeOff = W.worn().length;
      document.querySelector('#panel [data-wear="scarf-knit"]').click();
      out.wardrobeOn = W.worn().join(',');
      SD.ui.closePanel(); delete SD.econ; W.unequip('scarf');
      return out;
    });
    check(r.none === 0, `${mode}: nothing worn on a fresh save`);
    check(r.junk, `${mode}: a mug or a made-up id can't be worn`);
    check(r.worn === 'hat-crown,scarf-red', `${mode}: one item a slot, the newer hat replacing the beanie (${r.worn})`);
    check(r.saved === '{"hat":"hat-crown","scarf":"scarf-red"}', `${mode}: kept in the save as S.save.fg.wear`);
    check(r.kai === 2, `${mode}: your lead's faceset shows the hat and the scarf`);
    check(r.mira === 0, `${mode}: another lead's faceset doesn't`);
    check(r.preview === 1, `${mode}: a preview list goes on any lead`);
    check(r.clean === 'hat-crown,scarf-knit', `${mode}: a party member's list keeps real items, one a slot (${r.clean})`);
    check(r.stand, `${mode}: the full body gets the hat drawn on, with room on top`);
    check(r.sprite, `${mode}: a party-room seat is dressed and grows to fit the hat`);
    if (vector) {
      check(r.vec, 'vector: your lead\'s figure wears the crown; [] and other leads don\'t');
      check(r.leadImg, 'vector: your fighter in battle is redrawn when you change');
    }
    check(r.after === 'scarf-red', `${mode}: taking the hat off leaves the scarf`);
    check(r.owned, `${mode}: with the economy loaded, only bought items can be worn`);
    check(r.locked === items.length - 1, `${mode}: the Wardrobe shows the rest as not yet bought (${r.locked})`);
    check(r.wardrobeOff === 0 && r.wardrobeOn === 'scarf-knit', `${mode}: the Wardrobe takes off and puts on`);
  }

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
  server.close();
  console.log(fail ? `${fail} failed` : 'all passed');
  process.exit(fail ? 1 : 0);
})();
