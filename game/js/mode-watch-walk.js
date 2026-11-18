// The Night Watch, version 3: the walkable loop (storyboard "The Night Watch", Ladi Nov 17: "we're good to start
// building everything"). Days in the town, nights patrolling the castle, nine of each.
//   Morning: Mira's review (from day 2), then the day walk. Talk to people for gossip and quests; the clock stops
//            while you talk. The relationship engine (js/watch-bonds.js) sets how helpful people are on referrals.
//   Dusk:    you're put at Pell's gate on the West Road. Pell's briefing, then through the gate to the castle.
//   Night:   walk the four floors, find each breach marker and pick the narrow fix (one retry; a second miss locks
//            it until dawn). A bell every minute; when time runs out, dawn comes.
//   Dawn:    pay: base 20, +10 a fix, -10 a missed breach (night 1 has no fines).
// Content comes from window.WATCH_CONTENT (js/watch-content.js, the content thread); until it's there, the night's
// breaches come from the v2 locks in js/watch-data.js and three placeholder shortcut quests stand in.
//   Watchers: talk to one of the eight in the day to hire them (50, then 80). Ward level 0-4 = paid (up to 2) +
//            their quest's heart + trust in you of 60 or more. On the Long Night: 1 counts, 2 marks, 3 fixes one, 4 all.
//   Night 9: the Long Night. Every breach missed on nights 1-8 comes back first, new ones wait in town, the castle
//            gate stays open both ways, and unwarded breaches only show when you're close. Three endings; retry from
//            that dusk keeps silver, watchers and trust.
//   Shop:    at Kagemaru's stall: spare tools (an extra try), lantern posts (an area seen from afar on night 9), an outpost.
// Save: S.save.watch3 = { v: 3, day, silver, unlocks, quests: { id: { step, done } }, hearts, fixed, missed, bonds }.
(function () {
  const M = SD.modes, U = SD.ui, S = SD.state, W = SD.watchData, WW = SD.watchWorld, WV = SD.watchView, B = SD.watchBonds;
  if (!M || !U || !WW || !WV || !B) return;
  const esc = s => U.esc(String(s == null ? '' : s));
  const content = () => window.WATCH_CONTENT || {};
  const PAY = { base: 20, fix: 10, miss: -10, review: 10, each: 3 };
  const DAY_S = 600, nightS = n => (n === 9 ? 900 : n >= 5 ? 600 : 480);
  const NAME = Object.assign({ seoyeon: 'Seo-yeon', kevin: 'Hooded Stranger', captain: 'The Captain' }, (W && W.WHO) || {});
  const nm = who => NAME[who] || who.charAt(0).toUpperCase() + who.slice(1);
  const PEOPLE = ['mira', 'coo', 'bru', 'kagemaru', 'lexi', 'kai', 'dutch', 'hobb', 'pell', 'wen', 'ayo', 'aigerim', 'doug', 'tess', 'hollis', 'odu', 'fennel', 'seymour', 'captain'];
  // Watchers (doc: The Long Night, "The map is eight areas"): one per area, hired in the day.
  const WATCHERS = { mira: 'main-street', coo: 'hill-road', kagemaru: 'far-lane', bru: 'west-road',
    lexi: 'castle:towers', kai: 'castle:upper', dutch: 'castle:ground', hobb: 'castle:cellars' };
  const HIRE = [50, 80], HIRE_DAY = 3;
  // The shop at Kagemaru's stall (doc: Economy, money out). Trust 60 takes 20% off (js/watch-bonds.js).
  const SHOP = [{ id: 'tools', name: 'Spare tools', cost: 10, what: 'one extra try on a fix tonight' },
    { id: 'post', name: 'Lantern post', cost: 15, what: 'one area glows on the Long Night: you see its breaches from afar' },
    { id: 'outpost', name: 'Outpost', cost: 60, what: 'a door from Main Street into the castle, kept all game' }];
  const watcherOf = scene => Object.keys(WATCHERS).find(k => WATCHERS[k] === scene) || null;
  // Ward level 0-4: up to 2 paid, up to 2 from trust (their quest's heart, and trust in you of 60 or more).
  const ward = who => { const w = sv(); return Math.min(2, (w.hires || {})[who] || 0) + (w.hearts[who] ? 1 : 0) + (B.trust(w.bonds, who) >= 60 ? 1 : 0); };
  const OLD_ROOM = { tower: 'watchtower', bridge: 'bridge-tower', post: 'post-room', strong: 'strongroom' };
  const FIX_OF = { lock: 'door', key: 'badge-desk' };

  const sv = () => {
    const s = S.save;
    if (!(s.watch3 && s.watch3.v === 3)) s.watch3 = { v: 3, day: 1, silver: 0, unlocks: {}, quests: {}, hearts: {}, fixed: {}, missed: {}, bonds: B.create(1) };
    return s.watch3;
  };

  // ---- Breaches for a night ----
  function roomX(floor, room, salt) {
    const r = WW.CASTLE[floor] && WW.CASTLE[floor].rooms.find(x => x[0] === room);
    if (!r) return 800;
    const span = r[2] - r[1];
    return Math.round(r[1] + span * (0.3 + 0.4 * ((salt * 37) % 10) / 10));
  }
  function fallbackBreaches(n) {
    const night = W && W.NIGHTS[n - 1];
    if (!night) return [];
    return night.set.map(([slot], i) => {
      const s = W.SLOTS[slot], room = OLD_ROOM[s.room] || s.room, floor = (W.ROOMS[s.room] || {}).floor || 'ground';
      return { id: 'v2-' + n + '-' + slot, night: n, skill: s.task, fix: FIX_OF[s.kind] || 'door', where: { floor, room },
        title: s.name, story: s.ask, raid: 'Thieves',
        choices: Object.keys(s.tiles).map(k => ({ text: s.tiles[k].label, best: s.tiles[k].res === 'ok', why: s.tiles[k].line })), _i: i };
    });
  }
  function fallbackNine() {   // the Long Night's new breaches, until content lands: the night-9 locks, one per town level
    return fallbackBreaches(9).map((b, i) => {
      const lvl = WW.LEVELS[i % 4], spot = WW.TOWN[lvl].spots.find(s => s.kind === 'fix') || WW.TOWN[lvl].spots[0];
      return Object.assign({}, b, { where: { level: lvl, x: spot.x } });
    });
  }
  const allFor = n => { const c = content().breaches; return c && c.length ? c.filter(b => b.night === n) : n === 9 ? fallbackNine() : fallbackBreaches(n); };
  const AREA = a => (WW.FLOORS.includes(a) ? 'castle:' + a : a);
  function breaches(n) {
    const w0 = sv(), sealed = w0.sealed || {};
    let list = allFor(n).filter(b => !(b.where && b.where.floor && n < 9 && (sealed[b.where.floor] === 'all' || sealed[b.where.floor] === n)));
    if (n === 9 && list.some(b => b.area)) {   // the night-9 pool: about one per area
      const seenA = {};
      list = list.filter(b => { const a = AREA(b.area || ''); if (seenA[a]) return false; seenA[a] = 1; return true; });
    }
    if (n === 9) {   // returning: every breach missed on nights 1-8, in the same place, first
      const w = sv(), back = [];
      for (let k = 1; k <= 8; k++) allFor(k).forEach(b => { if (w.missed[b.id]) back.push(b); });
      list = back.concat(list);
    }
    if (n === 1) list = list.slice(0, 1);   // night 1: one breach, on the ground floor (doc: Night 1)
    return list.map((b, i) => {
      const scene = b.where && b.where.level ? b.where.level : 'castle:' + ((b.where && b.where.floor) || 'ground');
      const sc = WW.scene(scene);
      const sp = b.where && b.where.spot && WW.spot(b.where.level, b.where.spot);
      const x = b.where && b.where.x != null ? b.where.x : sp ? sp.x + 24 : b.where && b.where.room ? roomX(b.where.floor, b.where.room, (b.id.length + i) % 7 + 1)
        : Math.round(sc.from + 200 + ((b.id.length * 7919) % 1000) / 1000 * (sc.to - sc.from - 400));   // a sparkle somewhere on the level
      return Object.assign({ scene, x }, b);
    });
  }

  // ---- Quests ----
  const FALLBACK_QUESTS = [
    { id: 'dutch-own-pass', giver: 'dutch', kind: 'shortcut', opens: 2, closes: 4, skill: '2.1', reward: { silver: 20, heart: true, unlock: 'cellar-stair' },
      steps: [
        { at: { who: 'dutch' }, say: [['dutch', 'All four of my crews share one pass, and it opens every door in the cellars.'], ['seoyeon', 'Let me think about how it should work.']] },
        { at: { who: 'dutch' }, ask: { q: 'Four Lambda functions share one execution role that can read and write every table. What should change?',
          choices: ['Give each function its own execution role that allows only the actions and tables it uses',
            'Put an IAM user\'s access keys in each function\'s environment variables',
            'Attach AdministratorAccess so no function ever fails'], answer: 0,
          why: 'An execution role per function keeps each one to least privilege. Lambda gets the role\'s temporary credentials for you, so long-term keys aren\'t needed, and admin access is far wider than any function needs.' } },
        { at: { who: 'dutch' }, say: [['dutch', 'Own passes all round. Here, take the key to the old cellar stair by the gate.']] }
      ] },
    { id: 'kai-night-cloak', giver: 'kai', kind: 'shortcut', opens: 3, closes: 5, skill: '2.1', reward: { silver: 20, heart: true, unlock: 'back-stair' },
      steps: [
        { at: { who: 'kai' }, say: [['kai', 'The night clerk needs the ledger only during the shift. Right now they carry a copy of the key home.']] },
        { at: { who: 'hobb' }, say: [['hobb', 'Kai sent you? Then here is how cloaks work: you wear one for a while, then it goes back on the hook.']] },
        { at: { who: 'kai' }, ask: { q: 'A worker needs to read an S3 bucket only during the night shift. How should they get access?',
          choices: ['Let them assume a role whose trust policy names them, so STS gives temporary credentials that expire',
            'Create a long-term access key for them and delete it each morning', 'Make the bucket public at night'], answer: 0,
          why: 'Assuming a role returns temporary security credentials from AWS STS that expire on their own. A long-term key lasts until someone deletes it, and a public bucket lets anyone read it.' } },
        { at: { who: 'kai' }, say: [['kai', 'A cloak on a hook. Take the back stair key: it runs from the upper floor to the towers.']] }
      ] },
    { id: 'captain-hoist-key', giver: 'captain', kind: 'big', opens: 5, closes: 7, skill: '2.1', reward: { silver: 30, heart: false, unlock: 'hoist' },
      steps: [
        { at: { who: 'captain' }, say: [['captain', 'The hoist reaches every floor, so its key is the most dangerous one in the keep.']] },
        { at: { who: 'captain' }, ask: { q: 'One permission can reach every floor. What keeps it safest?',
          choices: ['Give it to a role the watch assumes only while on patrol, and record each use in CloudTrail',
            'Copy it to every worker so nobody is stuck', 'Leave it in the gatehouse so it never goes missing'], answer: 0,
          why: 'Granting wide access through a role that is assumed only when needed limits how long anyone holds it, and CloudTrail records each AssumeRole call. Copies for everyone, or a key left where anyone can take it, defeat the point.' } },
        { at: { who: 'captain' }, say: [['captain', 'Good. The hoist is yours. Pull the cord for the floor you want.']] }
      ] }
  ];
  const quests = () => (content().quests && content().quests.length ? content().quests : FALLBACK_QUESTS);
  const qstate = id => (sv().quests[id] = sv().quests[id] || { step: -1, done: false });
  const openOn = (q, d) => d >= q.opens && d <= q.closes;

  // ---- People in a scene ----
  function people(phase, day) {
    const out = {}, wx = WW.weather(day, phase === 'night' ? 'night' : 'day');
    const put = (scene, who, x) => { (out[scene] = out[scene] || []).push({ who, x }); };
    if (phase === 'day' || phase === 'dusk') {
      WW.LEVELS.forEach(l => WW.TOWN[l].spots.forEach(s => {
        if (!s.who) return;
        if (s.who === 'pell' && phase !== 'dusk') return;
        if (s.who === 'fennel' && wx === 'mist') return;                 // doc: day 7 mist, Fennel stays in
        if (s.who === 'kagemaru' && wx === 'rain') { put('main-street', 'kagemaru', 1960); return; }  // under the café awning
        if (!(s.who === 'mira' && run && run.escort && run.phase === phase)) put(l, s.who, s.x + 34);   // day 1: she's walking with you
        (s.also || []).forEach((w, i) => put(l, w, s.x - 40 - i * 40));
      }));
      if (phase === 'day' && wx !== 'rain') WW.LEVELS.forEach((l, i) => [1, 2].forEach(k => {   // the background crowd
        const T = WW.TOWN[l]; (out[l] = out[l] || []).push({ who: 'townsfolk-' + ((i + k) % 3 + 1), x: T.from + (T.to - T.from) * (k / 3), walk: true, facing: k === 1 ? 1 : -1, crowd: true });
      }));
    } else {
      put('castle:towers', 'captain', 1150);
      if (day === 1) { WW.artSync(); put('castle:ground', 'pell', WW.ENTRY_X + 70); }
    }
    return out;
  }

  // The walk-in ends at the castle gate: Mira goes back to her fire, and the hint clears.
  function homeMira() {
    if (!run || !run.escort) return;
    run.escort = false; view.set('follow', null); view.set('hint', ''); music(tune('day'));
    (run.ppl['main-street'] = run.ppl['main-street'] || []).push({ who: 'mira', x: (WW.spot('main-street', 'base-camp') || { x: 560 }).x + 34 });
  }

  // ---- Screens over the view ----
  let view = null, wrap = null, busy = false, clock = 0, run = null;
  function overlay(html) {
    busy = true;
    let o = wrap.querySelector('.ww-o');
    if (!o) { o = document.createElement('div'); o.className = 'ww-o'; wrap.appendChild(o); }
    o.innerHTML = `<div class="ww-card" role="dialog" aria-modal="true">${html}</div>`;
    o.hidden = false;
    const f = o.querySelector('button'); if (f) setTimeout(() => f.focus(), 0);
    return o;
  }
  // Enter, Space or E moves a message on or closes it (Ladi, Nov 18). Choice lists keep their buttons:
  // a focused choice still answers with Enter, and nothing is picked for you.
  document.addEventListener('keydown', e => {
    if (!busy || !wrap || !['Enter', ' ', 'e', 'E'].includes(e.key)) return;
    const o = wrap.querySelector('.ww-o:not([hidden])'); if (!o) return;
    const f = document.activeElement;
    if (f && o.contains(f) && f.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;   // the browser clicks it
    const b = o.querySelector('[data-a=n]') || o.querySelector('[data-a=d]') || o.querySelector('[data-a=x]');   // Next, OK, or Bye: never a purchase
    if (b) { e.preventDefault(); b.click(); }
  });
  function close() { const o = wrap && wrap.querySelector('.ww-o'); if (o) { o.hidden = true; o.innerHTML = ''; } setTimeout(() => { const o2 = wrap && wrap.querySelector('.ww-o'); if (!o2 || o2.hidden) busy = false; }, 80); }
  // Faces (Ladi, Nov 18: every dialog box shows the speaker's face). The painted portrait where the cast has one,
  // else the head cropped from their side-view sprite (js/watch-art.js), else their initial.
  // Painted busts for every speaker (Sogni, Nov 18) at assets/img/watch/portraits/<who>.webp; anyone else gets a crop of their sprite.
  const PORTRAIT = { seoyeon: 1, mira: 1, kai: 1, dutch: 1, coo: 1, bru: 1, kagemaru: 1, lexi: 1, wen: 1, ayo: 1, aigerim: 1, chad: 1, seymour: 1, hobb: 1, pell: 1, tess: 1, doug: 1, hollis: 1, odu: 1, fennel: 1, captain: 1, kevin: 1 };
  const crops = {};
  function cropHead(who) {
    if (who in crops) return crops[who];
    crops[who] = null;
    const a = window.WATCH_ART && WATCH_ART.people && WATCH_ART.people[who];
    if (!a) return null;
    const im = new Image();
    im.onload = () => {
      try {
        const cv = document.createElement('canvas'), n = 44; cv.width = n; cv.height = n;
        const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
        const top = Math.max(0, a.anchor[1] - 104);   // the head sits near the top of the 112-tall frame
        g.drawImage(im, a.anchor[0] - 22, top, 44, 44, 0, 0, n, n);
        crops[who] = cv.toDataURL();
        document.querySelectorAll('.ww-face[data-who="' + who + '"]').forEach(el => { el.innerHTML = `<img src="${crops[who]}" alt="">`; });
      } catch (e) { /* a tainted canvas or a missing sheet: the initial stays */ }
    };
    im.src = a.sheet;
    return null;
  }
  const face = who => {
    const src = PORTRAIT[who] ? `assets/img/watch/portraits/${who}.webp` : cropHead(who);
    return `<span class="ww-face${PORTRAIT[who] ? ' bust' : ''}" data-who="${who}" aria-hidden="true">${src ? `<img src="${src}" alt="">` : esc(nm(who).charAt(0))}</span>`;
  };
  const line = (who, text) => `<p class="ww-say">${face(who)}<span><b>${esc(nm(who))}:</b> ${esc(text)}</span></p>`;
  const bars = r => `<div class="ww-bars"><span>Trusts you <i style="--v:${r.you}"></i></span><span>Trusts the sender <i style="--v:${r.tie === 'cool' ? 0 : r.sender}"></i></span></div>`;
  function sayAll(lines, then) {
    let i = 0;
    const next = () => {
      if (i >= lines.length) { close(); if (then) then(); return; }
      const [who, text] = lines[i++];
      const o = overlay(line(who, text) + '<div class="row"><button class="primary" data-a="n">Next</button></div>');
      o.querySelector('[data-a=n]').onclick = next;
    };
    next();
  }
  // A choice question: { q, choices, answer, why }. done(ok). tries: how many misses allowed before it locks.
  function choose(title, q, tries, done, who) {
    let miss = 0;
    const draw = (msg) => {
      const o = overlay(`${who ? `<p class="ww-say">${face(who)}<span class="ww-t">${esc(title)}</span></p>` : `<p class="ww-t">${esc(title)}</p>`}<p class="ww-q">${esc(q.q)}</p>${msg || ''}
        <div class="ww-ch">${q.choices.map((c, i) => `<button data-i="${i}">${esc(c)}</button>`).join('')}</div>`);
      o.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
        const i = +b.dataset.i;
        if (i === q.answer) {
          const o2 = overlay(`<p class="ww-ok">✓ ${esc(q.choices[i])}</p><p class="ww-why">${esc(q.why || '')}</p><div class="row"><button class="primary" data-a="d">Done</button></div>`);
          o2.querySelector('[data-a=d]').onclick = () => { close(); done(true, miss); };
        } else if (++miss > tries) {
          const o2 = overlay(`<p class="ww-no">✗ Not quite.</p><p class="ww-why">${esc(q.why || '')}</p><div class="row"><button class="primary" data-a="d">OK</button></div>`);
          o2.querySelector('[data-a=d]').onclick = () => { close(); done(false, miss); };
        } else draw(`<p class="ww-no">✗ That isn't the narrow fix. One more try.</p>`);
      });
    };
    draw();
  }

  // ---- Talking ----
  function gossipFor(who, day, wx) {
    const g = (content().gossip || []).filter(x => x.who === who && x.day === day && (!x.weather || x.weather === wx));
    return g[0] || null;
  }
  function talk(who) {
    const w = sv(), day = w.day, b = w.bonds, ties = content().ties || {};
    const pq = (content().pellTall || {}).quips || {};   // once each, after you've met Pell: a line about his height
    if (w.metPell && pq[who] && !(w.pellq = w.pellq || {})[who]) {
      w.pellq[who] = 1; w.pellReply = who; S.persist();
      return sayAll([[who, pq[who][0]]], () => setTimeout(() => talk(who), 90));
    }
    B.chat(b, who);
    // A quest step at this person?
    for (const q of quests()) {
      const s = qstate(q.id);
      if (s.done) continue;
      if (s.step < 0) {
        if (q.giver === who && openOn(q, day) && q.kind === 'capstone') {   // needs ward level 4: both hires and trust
          const paid = Math.min(2, (w.hires || {})[who] || 0), trustLv = ward(who) - paid, L = q.lines || {};
          const set = trustLv < 2 ? L.trust : paid < 2 ? L.pay : L.yes;
          sayAll((set || ['Not yet.']).map(t => [who, t]), () => { if (trustLv >= 2 && paid >= 2) finish(q); });
          return;
        }
        if (q.giver === who && openOn(q, day)) {
          const o = overlay(`${line(who, 'Have you got a minute? I could use the watch\'s help.')}${q.reward.unlock ? line(who, 'Do this and I\'ll show you a shortcut nobody else uses.') : ''}
            <div class="row"><button class="ghost" data-a="no">Not now</button><button class="primary" data-a="yes">Help · ${q.reward.silver} silver</button></div>`);
          o.querySelector('[data-a=no]').onclick = close;
          o.querySelector('[data-a=yes]').onclick = () => { s.step = 0; close(); setTimeout(() => step(q), 90); };
          return;
        }
        continue;
      }
      const st = q.steps[s.step];
      if (st && st.at && st.at.who === who) { step(q); return; }
    }
    const wx = WW.weather(day, run && run.phase === 'night' ? 'night' : 'day');
    const g = gossipFor(who, day, wx);
    if (g && g.tie) B.shift(b, g.tie.a, g.tie.b, g.tie.to);
    const shopOpen = who === 'kagemaru' && day >= 2;
    if ((WATCHERS[who] && day >= HIRE_DAY || shopOpen) && run && run.phase === 'day' && day <= 9) {
      const paid = (w.hires = w.hires || {})[who] || 0, cost = HIRE[paid], area = WW.scene(WATCHERS[who]).name;
      const hiring = WATCHERS[who] && day >= HIRE_DAY, lv = ward(who);
      const o = overlay(`${line(who, g ? g.line : 'Quiet day so far.')}${hiring ? line(who, wardLine(who, area, lv, Math.min(2, paid))) : ''}
        <div class="row"><button class="ghost" data-a="x">Bye</button>${shopOpen ? '<button class="ghost" data-a="s">Shop</button>' : ''}${hiring && cost ? `<button class="primary" data-a="h" ${w.silver < cost ? 'disabled' : ''}>Hire · ${cost} silver</button>` : ''}</div>`);
      o.querySelector('[data-a=x]').onclick = close;
      const sb = o.querySelector('[data-a=s]'); if (sb) sb.onclick = shop;
      const h = o.querySelector('[data-a=h]');
      if (h) h.onclick = () => { w.silver -= cost; w.hires[who] = paid + 1; S.persist(); close(); };
      return;
    }
    sayAll([[who, g ? g.line : who === 'pell' ? 'Mind the locks.' : 'Evening soon. Be careful up at the castle.']]);
  }
  // What a watcher says about the ninth night, in their own words, instead of a ward-level readout (Ladi: keep tips as gossip).
  function wardLine(who, area, lv, paid) {
    const say = [`On the ninth night? I could keep an eye on the ${area}, I suppose. Can't promise much. I hardly know you.`,
      `On the ninth night I'd watch the ${area} and tell you how many got in. That's about all.`,
      `On the ninth night I'd mark every break-in round the ${area} for you.`,
      `On the ninth night I'd fix a break-in in the ${area} myself before you got there.`,
      `The ${area} on the ninth night? Leave it to me. All of it.`][lv];
    const more = lv >= 4 ? '' : paid < 2 && B.trust(sv().bonds, who) < 60 ? ' Silver helps. A friend helps more.' : paid < 2 ? ' Silver would help.' : ' I\'d do more for a friend.';
    return say + more;
  }
  function step(q) {
    const w = sv(), s = qstate(q.id), st = q.steps[s.step], ties = content().ties || {};
    if (!st) return finish(q);
    const who = st.at && st.at.who;
    const go = () => {
      s.step++; S.persist();
      if (s.step >= q.steps.length) return finish(q);
      const n = q.steps[s.step];
      if (n.at && n.at.who === who) step(q);   // the same person carries on
    };
    const body = () => {
      if (st.ask) {
        const tries = B.trust(w.bonds, q.giver) >= 80 ? 1 : 0;   // trust 80 perk: a second try after the explanation
        choose(nm(q.giver) + '\'s question', st.ask, tries, ok => { if (ok) go(); else { B.add(w.bonds, q.giver, 'wrong'); S.persist(); } }, q.giver);
      } else sayAll(st.say || [], go);
    };
    if (who && who !== q.giver) {
      const r = B.refer(w.bonds, ties, who, q.giver), help = st.help || {};
      if (r.band === 'deny') {
        const v = B.vouchers(w.bonds, ties, who, q.giver, PEOPLE);
        const o = overlay(`${line(who, help.deny || `${nm(q.giver)} sent you? Then no.`)}${bars(r)}${line('tess', `Psst! Once ${nm(who)} says no about ${nm(q.giver)}, being nice won't change it. Nothing will. ` + (v.length ? `But ${v.map(nm).join(' or ')} gets on with both of them. Get them to send you instead!` : 'Nobody can talk them round today. Try another day!'))}<div class="row"><button class="primary" data-a="d">OK</button></div>`);
        o.querySelector('[data-a=d]').onclick = close;
        return;
      }
      const first = !w.seenReferral; w.seenReferral = true;
      const o = overlay(`${line(who, r.band === 'high' ? `Anyone ${nm(q.giver)} sends is welcome. ${help.high || ''}` : r.band === 'low' ? 'I don\'t know you well. Prove you know your stuff first.' : `${nm(q.giver)} sent you? All right.`)}${bars(r)}
        ${first ? line('pell', 'Same as the castle locks: both doors have to open, and one bolt shuts it.') : ''}<div class="row"><button class="primary" data-a="d">Go on</button></div>`);
      const proof = () => {   // low band: one review question first (doc: Relationships)
        const pool = content().reviews || [], rv = pool.find(x => x.id === help.low) || pool.find(x => x.day <= w.day);
        if (r.band !== 'low' || !rv) return body();
        choose(nm(who) + ' wants proof', rv, 0, ok => { if (ok) { B.add(w.bonds, who, 'chat'); setTimeout(body, 90); } }, who);
      };
      o.querySelector('[data-a=d]').onclick = () => { close(); setTimeout(proof, 90); };
      return;
    }
    body();
  }
  function shop() {
    const w = sv(), price = it => B.price(w.bonds, 'kagemaru', it.cost);
    const o = overlay(`${line('kagemaru', 'Take a look. Quality gear.')}<p class="ww-meta">🪙 ${w.silver} · spare tools ${w.tools || 0}${w.unlocks.outpost ? ' · outpost built' : ''}</p>
      <div class="ww-ch">${SHOP.filter(it => it.id === 'tools' || w.toldHire).map(it => `<button data-b="${it.id}" ${w.silver < price(it) || (it.id === 'outpost' && w.unlocks.outpost) ? 'disabled' : ''}><b>${esc(it.name)} · ${price(it)}</b><br><small>${esc(it.what)}</small></button>`).join('')}</div>
      <div class="row"><button class="ghost" data-a="x">Done</button></div>`);
    o.querySelector('[data-a=x]').onclick = close;
    o.querySelectorAll('[data-b]').forEach(el => el.onclick = () => {
      const it = SHOP.find(v => v.id === el.dataset.b);
      if (it.id === 'post') {   // pick the area it lights
        const o2 = overlay(`<p class="ww-t">Where should the lantern post go?</p><div class="ww-ch">${Object.values(WATCHERS).filter(a => !(w.posts || {})[a]).map(a => `<button data-p="${a}">${esc(WW.scene(a).name)}</button>`).join('')}</div><div class="row"><button class="ghost" data-a="x">Back</button></div>`);
        o2.querySelector('[data-a=x]').onclick = shop;
        o2.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { w.silver -= price(it); (w.posts = w.posts || {})[b.dataset.p] = 1; S.persist(); shop(); });
        return;
      }
      w.silver -= price(it);
      if (it.id === 'tools') w.tools = (w.tools || 0) + 1;
      if (it.id === 'outpost') { w.unlocks.outpost = 1; if (run) run.st.unlocks.outpost = 1; }
      S.persist(); shop();
    });
  }
  function finish(q) {
    const w = sv(), s = qstate(q.id), r = q.reward || {};
    s.done = true;
    w.silver += r.silver || 0;
    if (r.heart) w.hearts[q.giver] = 1;
    if (r.unlock === 'seal-floor' && r.floor) (w.sealed = w.sealed || {})[r.floor] = r.permanent ? 'all' : w.day;   // no breaches there
    else if (r.unlock) { w.unlocks[r.unlock] = 1; if (run) run.st.unlocks[r.unlock] = 1; }
    B.add(w.bonds, q.giver, q.kind === 'small' ? 'small' : 'trust');
    S.persist();
    const o = overlay(`<p class="ww-ok">Quest done</p><p>🪙 +${r.silver || 0} silver${r.heart ? ' · ❤ ' + esc(nm(q.giver)) + '\'s trust' : ''}${r.unlock === 'seal-floor' ? ' · the ' + esc(r.floor || '') + ' sealed ' + (r.permanent ? 'for good' : 'tonight') : r.unlock ? ' · new shortcut: ' + esc(r.unlock.replace('-', ' ')) : ''}</p><div class="row"><button class="primary" data-a="d">OK</button></div>`);
    o.querySelector('[data-a=d]').onclick = close;
  }

  // ---- The day ----
  async function morning() {
    const w = sv();
    B.newDay(w.bonds, w.day);
    music('watchMorning');
    if (w.day >= 2) await review();
    if (w.day >= HIRE_DAY && !w.toldHire) await tellHire();
    walk('day');
  }
  // Hiring stays hidden until Mira explains the ninth night (Ladi, Nov 18: day 1 had too much, too early).
  function tellHire() {
    const w = sv(); w.toldHire = 1; S.persist();
    return new Promise(res => {
      const b = U.panel(`<p class="ww-top">Day ${w.day} · Morning</p>
        ${line('mira', 'The Captain thinks all these break-ins are practice. On the ninth night, the full moon, the thief tries for everything at once.')}
        ${line('mira', 'You can\'t be everywhere that night. Ask people to keep watch over their own corner of town or the castle. Pay helps, but people work hardest for someone they trust.')}
        <div class="row"><button class="primary" id="ww-hn">Got it</button></div>`, { title: 'THE NIGHT WATCH' });
      b.querySelector('#ww-hn').onclick = res;
    });
  }
  async function review() {
    const w = sv(), pool = (content().reviews || []).filter(r => r.day <= w.day && !(w.asked || {})[r.id]);
    const n = w.day === 2 ? 1 : 2;
    let right = 0, asked = 0;
    if (pool.length) {
      for (const r of pool.slice(0, n)) {
        asked++; (w.asked = w.asked || {})[r.id] = 1;
        const ok = await new Promise(res => {
          const b = U.panel(`<p class="ww-top">Day ${w.day} · Mira's review</p>${line('mira', r.q)}<div class="ww-ch">${r.choices.map((c, i) => `<button data-i="${i}">${esc(c)}</button>`).join('')}</div>`, { title: 'THE NIGHT WATCH' });
          b.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {
            const good = +el.dataset.i === r.answer;
            const b2 = U.panel(`<p class="${good ? 'ww-ok' : 'ww-no'}">${good ? '✓ Right' : '✗ Not quite'}: ${esc(r.choices[r.answer])}</p><p class="ww-why">${esc(r.why)}</p><div class="row"><button class="primary" id="ww-n">Next</button></div>`, { title: 'THE NIGHT WATCH' });
            b2.querySelector('#ww-n').onclick = () => res(good);
          });
        });
        if (ok) right++;
      }
    } else {
      const r = M.pick({ match: q => SD.exam && SD.exam.domainOf(q) === 2, n, verifiedOnly: true, mix: 0 });
      for (const it of r.items || []) {
        const q = SD.exam.find(it.q); if (!q) continue;
        asked++;
        const a = await M.ask(q, { tally: M.newTally(), title: 'MIRA\'S REVIEW' });
        if (a && a.ok) right++;
      }
    }
    if (asked) w.silver += PAY.review + PAY.each * right;
    S.persist();
  }

  // ---- Walking (day, dusk and night share this) ----
  // ---- Music (Ladi's Mureka takes, Nov 17; CREDITS.md). The storm and Long Night tracks are being redone, so nights
  // 5 to 9 keep the calm night track until they land. Stings are the songs' own endings, so they resolve. ----
  const AU = SD.audio;
  if (AU) AU.add({
    songs: { watchDay: 'm-watch-day', watchRain: 'm-watch-day-rain', watchWalkin: 'm-watch-walkin', watchDusk: 'm-watch-dusk', watchNight: 'm-watch-night', watchMorning: 'm-watch-morning' },
    samples: { watchFix: 'j-watch-fix', watchMiss: 'j-watch-miss' },   // over the night track, so it keeps playing
    jingles: { watchDawn: 'j-watch-dawn', watchEndLanterns: 'j-watch-end-lanterns', watchEndMorning: 'j-watch-end-morning', watchEndFall: 'j-watch-end-fall' }
  });
  const tune = phase => {
    const w = sv(), wx = WW.weather(w.day, 'day');
    return phase === 'night' ? 'watchNight' : phase === 'dusk' ? 'watchDusk'
      : run && run.escort ? 'watchWalkin' : wx === 'rain' || wx === 'mist' ? 'watchRain' : 'watchDay';
  };
  const music = name => { if (AU) AU.music(name, true); };
  const jingle = (name, then) => { if (AU) AU.jingle(name, then); };

  function walk(phase, opts) {
    opts = opts || {};
    const w = sv();
    if (view) view.stop();
    busy = false;   // a new screen replaces any open talk
    const st = WW.create({ scene: opts.scene || (phase === 'night' ? 'castle:ground' : phase === 'dusk' ? 'west-road' : 'main-street'),
      x: opts.x != null ? opts.x : phase === 'night' ? (WW.artSync(), WW.ENTRY_X) : phase === 'dusk' ? 3180 : 600, unlocks: w.unlocks, phase, night: w.day });
    run = { phase, st, list: phase === 'night' ? breaches(w.day) : [], tries: {}, locked: {}, fixed: {}, bell: 0, ward: {} };
    run.escort = phase === 'day' && w.day === 1 && !!(content().tutorial || []).length;   // Mira walks you in on day 1 (Ladi, Nov 18)
    music(tune(phase));
    if (phase === 'night' && w.day === 9) {   // ward levels act before you arrive (doc: Ward level)
      Object.keys(WATCHERS).forEach(k => {
        const lv = ward(k), mine = run.list.filter(x => x.scene === WATCHERS[k]);
        run.ward[WATCHERS[k]] = lv;
        if (lv >= 4) mine.forEach(x => { run.fixed[x.id] = 'ward'; });
        else if (lv >= 3 && mine[0]) run.fixed[mine[0].id] = 'ward';
      });
    }
    clock = phase === 'night' ? nightS(w.day) : phase === 'day' ? DAY_S : 0;
    const b = U.panel(`<p class="ww-top" id="ww-top"></p><div class="ww-wrap"><div class="ww-view"></div></div>
      <div class="row"><button class="ghost" id="ww-quit">Save and leave</button><button class="ghost" id="ww-end">${phase === 'night' ? 'End the night' : phase === 'day' ? 'End the day' : ''}</button></div>`, { title: 'THE NIGHT WATCH' });
    wrap = b.querySelector('.ww-wrap');
    const top = b.querySelector('#ww-top'), endB = b.querySelector('#ww-end');
    if (phase === 'dusk') endB.hidden = true;
    b.querySelector('#ww-quit').onclick = () => { if (view) view.stop(); view = null; S.persist(); M.open && M.open(); };
    endB.onclick = () => (phase === 'night' ? dawn() : dusk());
    const seen = x => w.day !== 9 || (run.ward[x.scene] || 0) >= 2 || (w.posts || {})[x.scene] || Math.abs(x.x - st.x) < 220;   // night 9: search unless warded
    const marks = () => run.list.filter(x => !run.fixed[x.id] && seen(x)).map(x => ({ scene: x.scene, x: x.x, sparkle: x.fix === 'hiding-spot', text: run.locked[x.id] ? 'Locked till dawn' : x.title, color: run.locked[x.id] ? '#8a93b8' : '#e9c56d' }));
    const wx = WW.weather(w.day, phase === 'night' ? 'night' : 'day');
    view = WV.mount(b.querySelector('.ww-view'), {
      paused: () => busy,
      st, people: (run.ppl = people(phase, w.day)), marks: marks(), weather: wx, follow: run.escort ? 'mira' : null,
      hint: phase === 'night' ? '' : phase === 'dusk' ? 'Walk to Pell at the gate' : '',
      onUse(spot) {
        if (busy) return;
        if (phase === 'night') {
          const x = run.list.find(v => !run.fixed[v.id] && v.scene === st.scene && Math.abs(v.x - st.x) <= WW.REACH);
          if (x) return fix(x, () => view.set('marks', marks()));
        }
        const f = run.escort && view.follower;
        if (f && f.scene === st.scene && Math.abs(f.x - st.x) <= WW.REACH) return sayAll([['mira', 'Don\'t mind me. Pretend I\'m not here.']]);
        const p = (people(phase, w.day)[st.scene] || []).find(v => !v.crowd && Math.abs(v.x - st.x) <= WW.REACH);
        if (p) return talk(p.who);
        const q = quests().find(q => { const s = qstate(q.id), t = q.steps[s.step]; return !s.done && s.step >= 0 && t && t.at && t.at.spot && spot && (WW.ALIAS[t.at.spot] || t.at.spot) === spot.id; });
        if (q) return step(q);
      },
      onMove(m) {
        if (busy) return false;
        if (/^castle:/.test(m.to.scene) && phase !== 'night') { setTimeout(() => walk('night', m.via === 'pell-gate' ? {} : { scene: m.to.scene, x: m.to.x }), 0); return false; }
        if (m.via === 'castle-exit' && phase === 'night' && w.day !== 9) return false;
        return true;
      },
      onLift(moves) {
        if (busy) return;
        const o = overlay(`<p class="ww-t">Supply hoist</p><div class="ww-ch">${moves.map(m => `<button data-k="${m.key}">${esc(m.label)}</button>`).join('')}</div><div class="row"><button class="ghost" data-a="x">Stay</button></div>`);
        o.querySelectorAll('[data-k]').forEach(el => el.onclick = () => { WW.go(st, el.dataset.k); if (phase === 'night') clock -= 60; close(); });
        o.querySelector('[data-a=x]').onclick = close;
      },
      onTick(s, dt) {
        const tut = content().tutorial;
        if (phase === 'day' && w.day === 1 && tut && !busy && (run.tut || 0) < tut.length) {
          const t = tut[run.tut || 0], sp = WW.spot(null, t.at);
          if (!sp || (s.scene === sp.level && Math.abs(s.x - sp.x) < 120)) { run.tut = (run.tut || 0) + 1; sayAll(t.lines || [[t.who, t.line]], run.tut === tut.length ? homeMira : null); }
          else view.set('hint', 'Mira wants to show you ' + sp.label);
        }
        if (phase === 'night' && w.day === 1 && !busy && !run.rang && clock < nightS(1) / 2) {   // a humor beat: she can't help herself
          run.rang = 1;   // Coo flies a note up from Mira
          sayAll([['coo', 'Coo. Note from Mira. It says: "Are the doors locked?"'], ['seoyeon', 'Locking the doors is the whole job.'], ['coo', 'She sent three of these. Coo. I\'m only bringing one.']]);
        }
        if (w.day === 9 && phase === 'night' && ((run.tk = (run.tk || 0) + dt) > 0.25)) { run.tk = 0; view.set('marks', marks()); }
        if (!busy && clock > 0) {
          clock -= dt;
          if (phase === 'night') { const bell = Math.floor((nightS(w.day) - clock) / 60); if (bell > run.bell) { run.bell = bell; } }
          if (clock <= 0) { clock = 0; setTimeout(() => (phase === 'night' ? dawn() : dusk()), 0); }
        }
        const left = run.list.filter(x => !run.fixed[x.id]).length, lv = run.ward[st.scene];
        const here = w.day === 9 && lv >= 1 ? ` · ${run.list.filter(x => x.scene === st.scene && !run.fixed[x.id]).length || 'all clear'} here (${nm(watcherOf(st.scene))})` : '';
        const t = phase === 'dusk' ? `Day ${w.day} · Dusk · 🪙 ${w.silver}` : `${phase === 'night' ? 'Night' : 'Day'} ${w.day} · ${Math.floor(clock / 60)}:${String(Math.floor(clock % 60)).padStart(2, '0')}${busy ? ' (paused)' : ''} · 🪙 ${w.silver}${phase === 'night' ? (w.day === 9 ? here : ` · ${left} breach${left === 1 ? '' : 'es'} left`) + ` · 🔔 ${run.bell}` : ''}`;
        if (top.textContent !== t) top.textContent = t;
      }
    });
    if (phase === 'dusk') {
      const d = (content().dusk || []).find(x => x.night === w.day), P = content().pellTall || {};
      const pre = [];   // the Pell running joke: meeting him, Chad's pitch on dusk 2, his answer to the latest quip
      if (!w.metPell && P.meet) { pre.push(...P.meet); w.metPell = 1; }
      if (w.day === 2 && P.chad && !w.chadPitched) { pre.push(...P.chad); w.chadPitched = 1; }
      if (w.pellReply && (P.quips || {})[w.pellReply]) { pre.push(['pell', P.quips[w.pellReply][1]]); w.pellReply = null; }
      S.persist();
      sayAll(pre.concat(d ? d.lines.map(l => [d.who || 'pell', l]) : [['pell', 'Night\'s coming. Walk with me to the gate, and keep your lantern low.']]));
    }
    if (phase === 'night' && w.day === 9) sayAll([['pell', 'The Long Night. Every lock you missed is open again, and there are new ones in town. The castle gate stays open tonight: the town is ours to search too.']]);
    if (phase === 'dusk' && w.day === 9 && !w.retry) w.retry = JSON.stringify(Object.assign({}, w, { retry: null }));
    if (phase === 'night' && w.day === 1) sayAll([['pell', 'One problem tonight, at the main gate. Walk to the glowing marker and press use.']]);
  }
  function dusk() { walk('dusk'); }

  // ---- Fix screens ----
  function fix(x, after) {
    if (run.locked[x.id]) { sayAll([['seoyeon', 'I\'ve tried this one twice. It has to wait for morning.']]); return; }
    const best = x.choices.findIndex(c => c.best), q = { q: x.story, choices: x.choices.map(c => c.text), answer: best, why: x.choices[best].why };
    const w = sv(), tools = w.day > 1 && (w.tools || 0) > 0;
    const tries = w.day === 1 ? 99 : tools ? 2 : 1;   // spare tools: one extra try
    choose(x.title, q, tries, (ok, miss) => {
      if (tools && miss >= 2) w.tools--;
      const keeper = watcherOf(x.scene);
      if (ok) { run.fixed[x.id] = 1; sv().fixed[x.id] = 1; delete sv().missed[x.id]; if (keeper) B.add(sv().bonds, keeper, 3); } else run.locked[x.id] = 1;
      if (AU) AU.sfx(ok ? 'watchFix' : 'watchMiss');
      S.persist(); after();
      if (run.list.every(v => run.fixed[v.id] || run.locked[v.id])) sayAll([['seoyeon', 'That\'s everything I can do tonight. Time to report at dawn.']], () => dawn());
    });
  }

  // ---- Dawn ----
  function dawn() {
    if (!run || run.phase !== 'night') return;
    const w = sv(), fixed = run.list.filter(x => run.fixed[x.id]), missed = run.list.filter(x => !run.fixed[x.id]);
    if (w.day === 9) return ending(missed, fixed);
    const fines = w.day === 1 ? 0 : missed.length * PAY.miss;
    const pay = PAY.base + fixed.length * PAY.fix + fines;
    missed.forEach(x => { w.missed[x.id] = x.raid || 'Thieves'; });
    w.silver += pay;
    const night = w.day;
    w.day = Math.min(10, w.day + 1);
    w.bonds.day = w.day;
    const xp = M.pay('watch');
    S.persist();
    if (view) view.stop(); view = null; run = null;
    jingle('watchDawn', 'watchMorning');
    const b = U.panel(`<p class="ww-top">Night ${night} · Dawn</p>
      <ul class="nw-rows">${fixed.map(x => `<li class="nw-r ok"><span class="nw-rr">✓</span><span>${esc(x.title)}</span></li>`).join('')}${missed.map(x => `<li class="nw-r leak"><span class="nw-rr">✗</span><span>${esc(x.title)}${night < 9 ? ' · comes back on the Long Night' : ''}</span></li>`).join('')}</ul>
      <p class="ww-pay">🪙 Pay: ${PAY.base} base + ${fixed.length * PAY.fix} for fixes${fines ? ` ${fines} in fines` : ''} = ${pay} · ${w.silver} saved</p>
      ${xp ? `<p class="small muted">${esc(xp)}</p>` : ''}
      <div class="row"><button class="primary" id="ww-next">${w.day > 9 ? 'The end' : 'Day ' + w.day}</button></div>`, { title: 'THE NIGHT WATCH' });
    b.querySelector('#ww-next').onclick = () => (w.day > 9 ? ending() : morning());
  }
  // Endings (doc: The Long Night, Dawn): by how many got through. Retry from that morning keeps silver, watchers, trust.
  const ENDINGS = [
    { id: 'lanterns', name: 'Lanterns at Dawn', text: 'On the last chime the Stranger tries the main gate with a forged pass and walks straight into every watcher you earned. The hood comes off: it\'s Kevin, Doug\'s old bot, wearing a stolen badge. His signal leads to the café terrace, where Chad the Consultant is mid-pitch with a laptop open. The Captain hands Seo-yeon the captain\'s key, and the town walks the West Road with lanterns, up the hill to the castle gate.' },
    { id: 'morning', name: 'The Long Morning', text: 'The Stranger escapes over the rooftops with whatever the worst breach exposed. The Captain is hurt holding the stairs. By noon a wanted poster with the Stranger\'s mark is on Bru\'s bounty board, and Seo-yeon keeps her lantern on probation.' },
    { id: 'fall', name: 'The Fall of the Watch', text: 'The Stranger opens the main gate from inside. Every breach you missed lights up across the town one by one, the castle bell rings by itself, and the watch\'s banners come down. At Mira\'s fire Seo-yeon apologizes. Mira looks into the flames: "It\'s not over, Seo-yeon... This is only the beginning."' }
  ];
  const endingFor = got => ENDINGS[got === 0 ? 0 : got <= 3 ? 1 : 2];
  function ending(missed, fixed) {
    const w = sv();
    missed = missed || []; fixed = fixed || [];
    if (view) view.stop(); view = null; run = null;
    const e = endingFor(missed.length);
    w.ending = e.id; w.day = 10;
    jingle({ lanterns: 'watchEndLanterns', morning: 'watchEndMorning', fall: 'watchEndFall' }[e.id], 'watchMorning');
    const xp = M.pay('watch');
    S.persist();
    const b = U.panel(`<p class="ww-top">The Long Night · Dawn</p><h3 class="ww-end">${esc(e.name)}</h3><p>${esc(e.text)}</p>
      <p class="ww-pay">${fixed.length} fixed · ${missed.length} got through</p>
      ${missed.length ? `<ul class="nw-rows">${missed.map(x => `<li class="nw-r leak"><span class="nw-rr">✗</span><span>${esc(x.title)} · ${esc(x.raid || 'Thieves')} got in</span></li>`).join('')}</ul>` : ''}
      ${xp ? `<p class="small muted">${esc(xp)}</p>` : ''}
      <div class="row">${w.retry ? '<button class="ghost" id="ww-retry">Retry the Long Night</button>' : ''}<button class="primary" id="ww-new">New watch</button></div>`, { title: 'THE NIGHT WATCH' });
    const r = b.querySelector('#ww-retry');
    if (r) r.onclick = () => {   // the ones that got through come back first, in the same places
      const back = JSON.parse(w.retry), got = {};
      missed.forEach(x => { got[x.id] = 1; });
      S.save.watch3 = Object.assign(back, { retry: w.retry, missed: Object.assign({}, back.missed, got) });
      S.persist(); walk('dusk');
    };
    b.querySelector('#ww-new').onclick = () => { S.save.watch3 = null; S.persist(); morning(); };
  }

  M.register({
    id: 'watch-walk', name: 'The Night Watch (walkable preview)', host: 'Seo-yeon', minutes: 'about 20 a day and night',
    blurb: 'Walk the town by day for gossip and quests, then patrol the castle at night and fix each breach. Security only.',
    start: () => morning(),
    status: () => { const w = S.save && S.save.watch3; return w && w.v === 3 ? `Day ${Math.min(9, w.day)} of 9 · ${w.silver} silver` : ''; }
  });
  SD.watchWalk = { sv, breaches, ward, WATCHERS, ENDINGS, endingFor, quests, people, morning, walk, dawn, talk, fix: x => fix(x, () => {}), get run() { return run; }, get view() { return view; }, get busy() { return busy; } };

  const css = document.createElement('style');
  css.textContent = `
    .ww-wrap { position: relative; }
    .ww-pay { font-weight: 700; color: #7a5410; }
    .ww-end { margin: 4px 0; color: #2c3566; }
    .ww-top { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #2c3566; }
    .ww-o { position: absolute; top: 0; left: 0; right: 0; min-height: 100%; display: grid; align-items: start; padding: 8px; background: rgba(4,6,20,.35); border-radius: 10px; }
    .ww-o[hidden] { display: none; }
    .ww-card { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 10px; background: rgba(14,20,56,.97); color: #eef1ff; border: 1px solid #e9c56d; font-size: 14px; }
    .ww-say { margin: 4px 0; line-height: 1.4; display: flex; gap: 10px; align-items: flex-start; }
    .ww-face { flex: none; width: 48px; height: 48px; border-radius: 10px; overflow: hidden; display: grid; place-items: center; background: #2a3466; border: 2px solid #e9c56d; color: #fff; font-weight: 700; }
    .ww-face img { width: 100%; height: 100%; object-fit: cover; object-position: top; image-rendering: pixelated; }
    .ww-face.bust img { image-rendering: auto; } .ww-meta { font-size: 12.5px; color: #c9d0ee; margin: 6px 0; }
    .ww-t { margin: 0 0 4px; font-weight: 700; color: #e9c56d; } .ww-q { margin: 0 0 8px; }
    .ww-ch { display: grid; gap: 6px; margin: 6px 0; }
    .ww-ch button { text-align: left; padding: 9px 10px; min-height: 44px; border-radius: 8px; border: 1px solid rgba(185,196,255,.4); background: rgba(255,255,255,.06); color: inherit; font: inherit; cursor: pointer; }
    .ww-ok { color: #6fcf8a; font-weight: 700; } .ww-no { color: #ff9a9a; font-weight: 700; } .ww-why { font-size: 13px; color: #d6dbf3; }
    .ww-bars { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 6px 0; font-size: 12px; color: #c9d0ee; }
    .ww-bars i { display: block; height: 6px; margin-top: 3px; border-radius: 3px; background: linear-gradient(90deg, #e9c56d calc(var(--v) * 1%), rgba(255,255,255,.12) 0); }
  `;
  document.head.appendChild(css);
})();
