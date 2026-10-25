// Multiplayer (Ladi, 2026-10-24): the raid finder, on the title screen and in the ☰ menu. It lists every expedition
// from the chapters you have beaten and the ones you've reached in the chapter you are on (Ladi, 2026-10-25), the open parties for them, and a box for a friend's code.
// A party here is a replay on the Borderlands engine (js/raid.js) outside the story: the leader picks any expedition
// they are eligible for, friends join from the list or by code, and the leader can fill the other seats with bots.
// Nothing it does moves the story (no flags, no story cards, no chapter progress); a clear pays REWARD.win XP to each
// player on their own page, half of the 80 a first clear pays in the story, as the game's other replays pay half.
// Every clear, solo, with bots or with friends, also pays Raid Marks (js/marks.js), more for your answers right and
// double with another person still in the party at the end: the currency of the Raid shop, cosmetics only
// (Ladi, Oct 24, in place of the earlier daily party tape).
// A guest who hasn't reached the expedition the leader starts is sent back here (raid.js o.open, 'locked').
//
//   SD.mp.eligible() -> [{ ch, label, done, xps: [expedition] }], in story order: the chapters you can replay
//   SD.mp.shop({ onClose }) the Raid shop's panel (the finder's button, and the Wardrobe's); onClose runs on ✕
//   SD.mp.reached(id)      -> true once the story has let you into that expedition (the gate for hosting and joining)
//   SD.mp.open(from, code) -> the finder; from 'title' or 'menu' (back resumes the chapter you were in). With a
//                       code, straight into that party first. A party room's Copy link (js/party.js, #join-CODE)
//                       opens here: the title, once past PRESS START, joins it.
//
// The parties share one directory, 'raid' (the Worker's and net.js's raid prefix, r). A table's info is its
// expedition's name, which is how the list tells which parties you can join.
(function () {
  const U = SD.ui, S = SD.state, $ = U.$, esc = s => U.esc(s);
  const MP = SD.mp = {};
  const REWARD = { win: 40 };

  // Each chapter's save field (as js/demo-select.js) and its expeditions, in story order.
  const CHAPTERS = [
    { n: '1', key: 'c1', label: 'Chapter 1: The Temple of Uptime', xps: ['denymines'] },
    { n: '2', key: 'c2', label: 'Chapter 2: The Mailroom', xps: ['sortingfloors'] },
    { n: '2b', key: 'c2x', label: 'Chapter 2, part 2: The Dead Letter Office', xps: ['deadletter', 'inqtower', 'greynovice'] },
    { n: '3', key: 'c3', label: 'Chapter 3: The Granaries', xps: ['cold', 'abyss', 'cathedral', 'regent'] },
    { n: '4', key: 'c4', label: 'Chapter 4: The Sealed Floors', xps: ['k4gates', 'k4peak', 'k4house', 'k4letter'] },
    { n: '5', key: 'c5', label: 'Chapter 5: The Machine Floors', xps: ['x5shops', 'x5records', 'x5tower'] },
    { n: '6', key: 'c6', label: 'Chapter 6: The Mirror Floors', xps: ['r6stairs', 'r6relay', 'r6vault'] },
    { n: '7', key: 'c7', label: 'Chapter 7: Root', xps: ['r7root'] }
  ];
  MP.CHAPTERS = CHAPTERS;
  const sv = () => S.save || {};
  const saved = c => { const v = sv()[c.key]; return !!(v && (c.key === 'c1' ? v.lead : true)); };
  const done = c => { const v = sv()[c.key]; return !!(v && v.f && v.f.done); };
  const lead = () => (sv().c1 && sv().c1.lead) || null;
  const expOf = id => (SD.expeditions || []).find(x => x.id === id && Array.isArray(x.floors) && x.floors.length >= 2) || null;
  // In the chapter you're on, only the expeditions the story has let you into (Ladi, 2026-10-25): its door is open in
  // the story, you've cleared it, or the story has started it (SD.raid.play with story and xp, recorded at
  // S.save.mp.reached). Each gate is the chapter's own flag for that door; a beaten chapter opens all of its own.
  const fl = k => (sv()[k] || {}).f || {}, wx = k => ((sv()[k] || {}).w || {}).x || {};
  const GATE = {
    denymines: () => fl('c1').m_rock,
    sortingfloors: () => fl('c2').act1,
    deadletter: () => fl('c2x').f7, inqtower: () => fl('c2x').f13, greynovice: () => fl('c2x').reckon,
    cold: () => wx('c3').gate1 || wx('c3').x1, abyss: () => wx('c3').ship || wx('c3').x2, cathedral: () => wx('c3').board || wx('c3').x3,
    regent: () => wx('c3').x4 || (wx('c3').x3 && (wx('c3').reckon || wx('c4').xp1)),
    k4gates: () => wx('c4').xp1, k4peak: () => wx('c4').xp2, k4house: () => wx('c4').xp3,
    x5shops: () => wx('c5').metric || wx('c5').xp1, x5records: () => wx('c5').xp2, x5tower: () => wx('c5').turned || wx('c5').xp3,
    r6stairs: () => wx('c6').route || wx('c6').xp1, r6relay: () => wx('c6').xp2, r6vault: () => wx('c6').xp3,
    r7root: () => wx('c7').uptima
  };
  const reachedList = () => { const mp = sv().mp; return (mp && Array.isArray(mp.reached)) ? mp.reached : []; };
  MP.reached = id => { try { return reachedList().includes(id) || !!(GATE[id] && GATE[id]()); } catch (e) { return false; } };
  // { ch, label, done, now, xps: [expedition you can play], locked: [expedition further on in the chapter you're on] }
  MP.eligible = function () {
    let cur = -1;
    CHAPTERS.forEach((c, i) => { if (saved(c)) cur = i; });
    return CHAPTERS.map((c, i) => {
      const all = c.xps.map(expOf).filter(Boolean), d = done(c);
      const xps = d ? all : all.filter(x => MP.reached(x.id));
      return { ch: c.n, label: c.label, done: d, now: i === cur, xps, locked: d ? [] : all.filter(x => !xps.includes(x)) };
    }).filter((c, i) => (c.done || i === cur) && (c.xps.length || c.locked.length));
  };
  const ids = () => [].concat(...MP.eligible().map(c => c.xps.map(x => x.id)));
  MP.available = () => !!(SD.net && SD.raid && SD.raid.available() && SD.party);

  // The replay's say: the floors' lines in your party's voices, without the story's cues (a { who: 'c4' } line plays a
  // chapter's own scene and sets its flags) and with per-lead lines picked for your lead.
  function say(list) {
    const me = (SD.champions && SD.champions.mine && SD.champions.mine()) || lead(), mates = ['mira', 'kai', 'seoyeon', 'dutch'].filter(x => x !== me);
    const out = [];
    (list || []).forEach(l => {
      if (!l || /^c\d$/.test(l.who || '')) return;
      const t = l.text && typeof l.text === 'object' ? (l.text[me] || l.text.other) : l.text;
      if (!t) return;
      const who = l.who === 'lead' ? me : l.who === 'mate1' ? mates[0] : l.who === 'mate2' ? mates[1] : l.who;
      out.push({ s: who && SD.cast && SD.cast[who] ? who : 'narr', t: String(t), e: l.e });
    });
    return out.length ? U.dialog(out) : Promise.resolve();
  }

  function css() {
    if (document.getElementById('mp-css')) return;
    const st = document.createElement('style');
    st.id = 'mp-css';
    st.textContent = `.mp { display: grid; gap: 14px; max-width: 760px; margin: 0 auto; padding: 4px 0 40px; }
.mp-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.mp-top .ghost { min-height: 44px; }
.mp-wallet { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; }
.mp-wallet b { font: 800 14px var(--f-body); background: var(--sun, #ffe14d); border: 2px solid var(--ink); border-radius: 999px; padding: 0 8px; }
.mp-card { background: var(--paper, #fff8ea); color: var(--ink); border: 3px solid var(--ink); border-radius: 16px; padding: 14px 16px; display: grid; gap: 10px; min-width: 0; }
.mp-card h2, .mp-card h3, .mp-card h4 { margin: 0; font-family: var(--f-head); }
.mp-card h2 { font-size: 26px; } .mp-card h3 { font-size: 19px; } .mp-card h4 { font-size: 15px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.mp-card p { margin: 0; }
.mp-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.mp-more summary { cursor: pointer; font-weight: 700; font-size: 13px; min-height: 32px; display: flex; align-items: center; }
.mp-more ul { margin: 4px 0 0; padding-left: 20px; display: grid; gap: 2px; }
.mp-note { border: 2px solid var(--ink); border-left-width: 6px; border-radius: 10px; background: #fff3c4; padding: 8px 10px; font-weight: 700; }
.mp-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.mp-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; border-top: 1px solid rgba(0,0,0,.12); padding-top: 8px; }
.mp-list li:first-child { border-top: 0; padding-top: 0; }
.mp-list li.mp-locked b { color: var(--muted); }
.mp-txt { min-width: 0; flex: 1 1 200px; }
.mp-txt small { display: block; color: var(--muted); }
.mp-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.mp .mi-btn { min-height: 44px; }
.mp-ch { display: grid; gap: 8px; padding-top: 10px; border-top: 2px solid rgba(0,0,0,.14); }
.mp-card > p + .mp-ch { border-top: 0; padding-top: 0; }
.mp-chip { font: 700 11px var(--f-body); border-radius: 999px; padding: 1px 8px; border: 2px solid var(--ink); background: #fff; white-space: nowrap; }
.mp-chip.ok { background: #dff4ea; border-color: #1f8a57; color: #1f6b46; } .mp-chip.now { background: var(--sun, #ffe14d); }
.mp-chip.lock { background: #ece8f2; border-color: #8a829a; color: #5f566e; }
.mp-code { display: grid; gap: 6px; padding-top: 10px; border-top: 2px solid rgba(0,0,0,.14); }
.mp-code label { font-weight: 700; font-size: 14px; }
.mp-code-row { display: flex; gap: 8px; }
.mp-code input { font: 700 18px var(--f-head); letter-spacing: .18em; text-transform: uppercase; flex: 0 1 9em; min-width: 0; min-height: 44px; padding: 4px 10px; border: 3px solid var(--ink); border-radius: 12px; }
.mp-code input[aria-invalid="true"] { border-color: #c43a3a; }
.mp-why { min-height: 1.2em; }
.mp-why.bad { color: #a02a2a !important; font-weight: 700; }
#screen-run .mp-card :is(.mi-tag, .muted, small) { color: #5f566e; }
#screen-run .mp-code input { background: #fff; color: var(--ink); }
#screen-run .mp-code input::placeholder { color: #a39cae; }

.rs { display: grid; gap: 12px; }
.rs-top { position: sticky; top: -16px; z-index: 3; margin: -16px -16px 0; padding: 12px 16px 8px; background: var(--cream); border-bottom: 2px solid rgba(0,0,0,.12); display: grid; gap: 8px; }
.rs-bal { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.rs-bal b { font: 700 24px var(--f-head); }
.rs-tabs { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; margin: 0; padding-bottom: 2px; }
.rs-tabs .tab { flex: none; min-height: 40px; }
.rs-tabs .tab small { opacity: .75; font-family: var(--f-body); font-weight: 700; }
.rs-pack { display: grid; gap: 8px; }
.rs-pack h3 { margin: 0; font: 600 16px var(--f-head); }
.rs-grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.rs-item { position: relative; display: grid; grid-template-rows: auto 1fr auto; gap: 6px; padding: 10px; background: #fff; border: 2px solid var(--ink); border-top-width: 6px; border-top-color: var(--rs-tier, #8a829a); border-radius: 12px; min-width: 0; }
.rs-item.t-rare { --rs-tier: #2a62c9; } .rs-item.t-legendary { --rs-tier: #d98a1c; } .rs-item.t-mythic { --rs-tier: #8a3fd1; }
.rs-item.own { background: #f4fbf7; }
.rs-pv { display: grid; place-items: center; height: 72px; border-radius: 8px; background: #f3efe6; overflow: hidden; }
.rs-pv .wd-sw { width: 56px; height: 36px; }
.rs-pv .wd-sw.wd-look { width: 40px; height: 66px; }
.rs-pv svg { width: 44px; height: 44px; }
.rs-pv.rs-many { display: flex; flex-wrap: wrap; justify-content: center; align-content: center; gap: 2px; padding: 4px; }
.rs-pv.rs-many svg { width: 26px; height: 26px; }
.rs-name { font-weight: 800; font-size: 14px; line-height: 1.25; }
.rs-name small { display: block; font-weight: 600; font-size: 12px; color: var(--muted); }
.rs-tier { display: block; font: 800 10px var(--f-body); text-transform: uppercase; letter-spacing: .06em; color: var(--rs-tier, #6f6787); }
.rs-deal { display: inline-block; font: 800 11px var(--f-body); color: #1f6b46; }
.rs-act { display: grid; gap: 4px; }
.rs-act .mi-btn { width: 100%; min-height: 44px; }
.rs-act .mi-btn.confirm { background: var(--sun, #ffe14d); color: var(--ink); }
.rs-act small { font-size: 11px; color: var(--muted); text-align: center; }
.rs-own { font: 800 11px var(--f-body); color: #1f6b46; text-align: center; }
.rs-empty { text-align: center; color: var(--muted); }
@media (max-width: 420px) { .rs-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; } }`;
    document.head.appendChild(st);
  }

  // ---------- Raid Marks and the Raid shop ----------
  const P = () => SD.marks.PAY;
  const earnLines = () => [`${P().clear} ✦ for each clear`, `+${P().perRight} ✦ for each of your answers right, up to ${P().rightCap}`, `Doubled when another player is still in the party at the end`];
  // The Raid shop (Ladi, 2026-10-25): a tab per kind of cosmetic, each item a card with its preview, its rarity and
  // its price. Buying takes two taps (Buy, then Confirm), what you can't afford says how many marks you still need, and an emote
  // pack lists its emotes under it with what the pack saves. Prices are js/marks.js's placeholders.
  const KINDS = [['outfit', 'Outfits'], ['look', 'Looks'], ['effect', 'Effects'], ['frame', 'Frames'], ['emote', 'Emotes']];
  const kindOf = it => (SD.marks.isEmote(it) ? 'emote' : it.slot);
  let shopTab = 'outfit';
  function shop(opts) {
    opts = opts || {};
    css();
    const M = SD.marks, W = SD.wear, E = SD.emote;
    let armed = null, armT = 0;
    const tierName = t => (t ? t[0].toUpperCase() + t.slice(1) : '');
    const emoteSvg = id => (E && E.EMOTES[id] ? E.EMOTES[id].svg : '');
    const preview = it => {
      if (it.slot === 'emote') return `<div class="rs-pv rs-many" aria-hidden="true">${(it.has || []).map(o => emoteSvg(M.item(o).emote)).join('')}</div>`;
      if (it.emote) return `<div class="rs-pv" aria-hidden="true">${emoteSvg(it.emote)}</div>`;
      return `<div class="rs-pv" aria-hidden="true">${W && W.swatch ? W.swatch(it.id) : ''}</div>`;
    };
    const card = (it, worn) => {
      const own = M.owns(it.id), on = worn.includes(it.id), cost = M.price(it.id), need = cost - M.balance();
      const has = it.has || [];
      const sub = it.slot === 'emote' ? `${it.label || M.SLOTS[it.slot]} · ${has.length} ${E && has.some(o => E.EMOTES[M.item(o).emote].act) ? 'moves' : 'emotes'}` : it.label || M.SLOTS[it.slot] || it.slot;
      const single = it.slot === 'emote' ? has.reduce((a, o) => a + M.price(o), 0) : 0;
      const got = it.slot === 'emote' ? has.filter(o => M.owns(o)).length : 0;
      let act;
      if (own) act = M.isEmote(it) ? '<p class="rs-own">✓ Owned · on your Emote button</p>'
        : W && W.equip ? `<p class="rs-own">✓ Owned${on ? ' · wearing' : ''}</p><button class="mi-btn sm${on ? '' : ' go'}" type="button" data-wear="${esc(it.id)}" aria-pressed="${on}">${on ? 'Take off' : 'Wear'}</button>` : '<p class="rs-own">✓ Owned</p>';
      else if (need > 0) act = `<button class="mi-btn sm" type="button" disabled>${cost} ✦</button><small>Need ${need} more</small>`;
      else act = armed === it.id ? `<button class="mi-btn sm confirm" type="button" data-buy="${esc(it.id)}">Confirm: ${cost} ✦</button><small>Tap again to buy</small>`
        : `<button class="mi-btn go sm" type="button" data-buy="${esc(it.id)}">Buy · ${cost} ✦</button>`;
      return `<li class="rs-item${it.tier ? ' t-' + it.tier : ''}${own ? ' own' : ''}" data-item="${esc(it.id)}">${preview(it)}
        <div class="rs-name">${it.tier ? `<span class="rs-tier">${tierName(it.tier)}</span>` : ''}${esc(it.name)}<small>${esc(sub)}${got && !own ? ` · ${got} of ${has.length} yours` : ''}</small>
          ${single > cost && !own ? `<span class="rs-deal">Saves ${single - cost} ✦ on buying them one by one</span>` : ''}</div>
        <div class="rs-act">${act}</div></li>`;
    };
    // The window opens once; a tap redraws what's inside it, so it doesn't pop in again or lose your place.
    const box = U.panel('<div class="rs" id="rs"></div>', { title: 'RAID SHOP', cls: 'wide', onClose: () => { clearTimeout(armT); if (opts.onClose) opts.onClose(); } });
    const rs = box.querySelector('#rs');
    const draw = () => {
      if (!rs.isConnected) return;
      const top = box.scrollTop;
      const ae = document.activeElement, back = ae && ae.closest && ae.closest('#rs [data-item]') ? ae.closest('[data-item]').dataset.item : null;
      const worn = W && W.worn ? W.worn() : [];
      const items = M.ITEMS.filter(it => kindOf(it) === shopTab);
      const tabs = KINDS.map(([k, l]) => { const all = M.ITEMS.filter(it => kindOf(it) === k && !it.pack); const mine = all.filter(it => M.owns(it.id)).length;
        return `<button role="tab" type="button" class="tab${k === shopTab ? ' on' : ''}" data-tab="${k}" aria-selected="${k === shopTab}">${l} <small>${mine}/${all.length}</small></button>`; }).join('');
      // Emotes: each pack, then its emotes one by one; everything else in one grid, cheapest first.
      const grid = shopTab === 'emote'
        ? items.filter(it => it.slot === 'emote').map(pk => `<section class="rs-pack" aria-label="${esc(pk.name)}"><h3>${esc(pk.name)}</h3><ul class="rs-grid">${card(pk, worn)}${items.filter(it => it.pack === pk.id).map(it => card(it, worn)).join('')}</ul></section>`).join('')
        : `<ul class="rs-grid">${items.slice().sort((a, b) => a.cost - b.cost).map(it => card(it, worn)).join('')}</ul>`;
      rs.innerHTML = `<div class="rs-top"><div class="rs-bal"><b>${M.balance()} ✦</b><span>Raid Marks to spend</span></div>
          <details class="mp-more"><summary>How to earn Raid Marks</summary><ul class="small">${earnLines().map(l => `<li>${esc(l)}</li>`).join('')}</ul></details>
          <div class="rs-tabs" role="tablist" aria-label="Kinds of cosmetic">${tabs}</div></div>
        <p class="small muted" style="margin:0">Cosmetics only: they change how your lead looks, never how they play.</p>
        ${grid || '<p class="rs-empty">Nothing here yet.</p>'}`;
      box.scrollTop = top;
      if (back) { const el = rs.querySelector(`[data-item="${back}"] button:not([disabled])`); if (el) el.focus({ preventScroll: true }); }
      rs.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => { shopTab = b.dataset.tab; armed = null; draw(); box.scrollTop = 0; const f = rs.querySelector(`[data-tab="${shopTab}"]`); if (f) f.focus(); }; });
      rs.querySelectorAll('[data-buy]').forEach(b => { b.onclick = () => {
        const id = b.dataset.buy;
        clearTimeout(armT);
        if (armed !== id) { armed = id; armT = setTimeout(() => { if (armed === id) { armed = null; draw(); } }, 4000); return draw(); }
        armed = null;
        M.buy(id); draw();
      }; });
      rs.querySelectorAll('[data-wear]').forEach(b => { b.onclick = () => { const it = M.item(b.dataset.wear); if (worn.includes(it.id)) W.unequip(it.slot); else W.equip(it.id); draw(); }; });
    };
    draw();
  }
  MP.shop = shop;

  // ---------- The finder ----------
  let busy = false, from = 'title';
  MP.open = async function (where, code) {
    if (busy || !MP.available()) return;
    busy = true;
    from = where || 'title';
    css();
    U.closePanel();
    if (from === 'menu') SD.main.haltWorlds();
    SD.main.show('run');
    if (SD.audio) SD.audio.music('multiplayer');
    let hub = null, dir = null, note = '';
    try {
      hub = await SD.net.open();
      dir = await hub.directory('raid');
      for (let first = true; ; first = false) {
        // Back to the Multiplayer theme each time the list shows, after a raid's battle music too.
        if (SD.audio) SD.audio.music('multiplayer');
        const pick = first && code ? { code } : await finder(dir, note);
        note = '';
        if (!pick) break;
        const why = await play(hub, dir, pick);
        const lx = /^locked:/.test(why || '') ? expOf(why.slice(7)) : null;
        note = lx ? `The leader started ${lx.name}, which you haven't reached in the story yet. Pick a party on one of yours.` : { full: 'That party is full.', kicked: 'The leader removed you from the party.' }[why] || '';
      }
    } catch (e) {
      console.warn('Multiplayer:', e);
      U.system('MULTIPLAYER', 'Couldn\'t reach the party list. Check your connection and try again.');
    } finally {
      if (dir) dir.leave();
      busy = false;
    }
    back();
  };
  function back() {
    $('#run').innerHTML = '';
    if (from !== 'menu') return SD.main.title();
    // Back to the chapter you were in, as the title's Continue would.
    const c = SD.demo && SD.demo.chapters && SD.demo.chapters.slice().reverse().find(x => (x.resume || (SD.chapterStart && SD.chapterStart[x.n])) && saved(x));
    if (c) return c.resume ? c.resume() : SD.chapterStart[c.n]();
    if (SD.ch1 && lead()) return SD.ch1.resume();
    SD.main.title();
  }

  // The finder, top to bottom: Back and the Raid shop (with your marks), what Multiplayer is, Join a party (the open
  // parties you can join, Quick join, a friend's code), then Host a party (your expeditions by chapter; the ones
  // further on in the chapter you're on show locked). Resolves to { code, create, xp } or null for Back.
  function finder(dir, note) {
    const net = SD.net, root = $('#run');
    return new Promise(res => {
      let off = null, sig = '', typed = '', bad = false;
      const draw = () => {
        const ch = MP.eligible(), mine = new Set(ids()), byName = {};
        (SD.expeditions || []).forEach(x => { byName[x.name] = x; });
        const tables = dir.tables().filter(t => net.cleanCode(t.code).length >= 4);
        const xOf = t => byName[String(t.info || '').replace(/ · floor \d+$/, '')] || null;
        const ok = tables.filter(t => { const x = xOf(t); return x && mine.has(x.id); });
        const hidden = tables.length - ok.length;
        const count = id => ok.filter(t => xOf(t).id === id).length;
        // The list only redraws when what it shows changes, so it doesn't jump under a thumb on every heartbeat.
        const now = JSON.stringify([ok.map(t => [t.code, t.players, t.max, t.info]), hidden, note, SD.marks.balance()]);
        if (now === sig) return;
        sig = now;
        // Keep focus and what's typed across a redraw.
        const ae = document.activeElement, keep = ae && root.contains(ae) ? (ae.id ? '#' + ae.id : ['data-host', 'data-find', 'data-join'].map(a => ae.hasAttribute(a) ? `[${a}="${ae.getAttribute(a)}"]` : '').find(Boolean)) : null;
        const inp = root.querySelector('#mp-code'); if (inp) typed = inp.value;
        root.innerHTML = `<div class="mp">
          <div class="mp-top"><button class="ghost" type="button" id="mp-back">‹ ${from === 'menu' ? 'Back to the story' : 'Back to the title'}</button>
            <button class="mi-btn mp-wallet" type="button" id="mp-shop" aria-label="Raid shop: you have ${SD.marks.balance()} Raid Marks">Raid shop <b id="mp-marks">${SD.marks.balance()} ✦</b></button></div>
          <div class="mp-card"><span class="mi-tag">Multiplayer</span><h2>Expedition raids</h2>
            <p>Replay expeditions you've reached in the story, with friends or with bots. Replays never move the story.</p>
            <details class="mp-more"><summary>What a clear pays</summary><ul class="small"><li>${REWARD.win} XP for each player</li>${earnLines().map(l => `<li>Raid Marks: ${esc(l[0].toLowerCase() + l.slice(1))}</li>`).join('')}</ul></details>
            ${note ? `<p class="mp-note small" role="alert">${esc(note)}</p>` : ''}</div>
          <section class="mp-card" aria-labelledby="mp-h-join"><div class="mp-head"><h3 id="mp-h-join">Join a party</h3>
            ${ok.length ? '<button class="mi-btn go" type="button" id="mp-quick">Quick join</button>' : ''}</div>
            ${ok.length ? `<ul class="mp-list" aria-live="polite">${ok.map(t => { const x = xOf(t); return `<li><div class="mp-txt"><b>${esc(x.name)}</b><small>${esc(t.nick || 'A party')} · ${t.players | 0}/${t.max | 0} players · ${esc(SD.raid.level(x))}</small></div>
              <div class="mp-btns"><button class="mi-btn go sm" type="button" data-join="${esc(net.cleanCode(t.code))}">Join</button></div></li>`; }).join('')}</ul>`
              : '<p class="muted small">No open parties on your expeditions right now. Host one below and share its code.</p>'}
            ${hidden > 0 ? `<p class="muted small">${hidden} more open part${hidden === 1 ? 'y is' : 'ies are'} on expeditions you haven't reached yet.</p>` : ''}
            <form class="mp-code" id="mp-form" novalidate><label for="mp-code">Join with a friend's code</label>
              <div class="mp-code-row"><input id="mp-code" maxlength="5" autocomplete="off" autocapitalize="characters" autocorrect="off" spellcheck="false" enterkeyhint="go" placeholder="R7KQP" aria-describedby="mp-why" aria-invalid="${bad}"><button class="mi-btn sm" type="submit" id="mp-go">Join</button></div>
              <p class="muted small mp-why${bad ? ' bad' : ''}" id="mp-why" role="status">${bad ? 'That isn\'t a party code. Party codes are 5 letters and start with R, like R7KQP.' : '5 letters, starting with R.'}</p></form></section>
          <section class="mp-card" aria-labelledby="mp-h-host"><div class="mp-head"><h3 id="mp-h-host">Host a party</h3></div>
            <p class="muted small">Pick an expedition. Friends join with your party's code, and bots can fill the other seats.</p>
          ${ch.length ? ch.map(c => `<div class="mp-ch"><h4>${esc(c.label)} ${c.done ? '<span class="mp-chip ok">Cleared</span>' : c.now ? '<span class="mp-chip now">You are here</span>' : ''}</h4>
            <ul class="mp-list">${c.xps.map(x => { const n = count(x.id); return `<li><div class="mp-txt"><b>${esc(x.name)}</b><small>${esc(SD.raid.level(x))}, ${x.floors.length} floors${n ? ` · ${n} open part${n === 1 ? 'y' : 'ies'}` : ''}</small></div>
              <div class="mp-btns">${n ? `<button class="mi-btn sm" type="button" data-find="${esc(x.id)}">Join one</button>` : ''}<button class="mi-btn go sm" type="button" data-host="${esc(x.id)}">Host</button></div></li>`; }).join('')}
            ${c.locked.map(x => `<li class="mp-locked"><div class="mp-txt"><b>${esc(x.name)}</b><small>Reach it in the story to replay it here.</small></div><span class="mp-chip lock">Locked</span></li>`).join('')}</ul></div>`).join('')
            : '<p>No expeditions yet. Start the story: chapter 1\'s Deny Mines is the first.</p>'}</section>
</div>`;
        root.querySelectorAll('[data-join]').forEach(b => { b.onclick = () => end({ code: b.dataset.join }); });
        root.querySelectorAll('[data-find]').forEach(b => { b.onclick = () => { const t = ok.find(y => xOf(y).id === b.dataset.find); if (t) end({ code: net.cleanCode(t.code) }); }; });
        root.querySelectorAll('[data-host]').forEach(b => { b.onclick = () => end({ code: net.code('raid'), create: true, xp: b.dataset.host }); });
        const why = root.querySelector('#mp-why'), input = root.querySelector('#mp-code');
        input.value = typed;
        input.oninput = () => { if (bad) { bad = false; input.setAttribute('aria-invalid', 'false'); why.classList.remove('bad'); why.textContent = '5 letters, starting with R.'; } };
        root.querySelector('#mp-form').onsubmit = e => {
          e.preventDefault();
          const c = net.cleanCode(input.value);
          if (c.length !== 5 || net.gameOf(c) !== 'raid') { bad = true; input.setAttribute('aria-invalid', 'true'); why.classList.add('bad'); why.textContent = 'That isn\'t a party code. Party codes are 5 letters and start with R, like R7KQP.'; input.focus(); return; }
          end({ code: c });
        };
        root.querySelector('#mp-back').onclick = () => end(null);
        root.querySelector('#mp-shop').onclick = () => shop({ onClose: () => { sig = ''; draw(); const b = root.querySelector('#mp-shop'); if (b) b.focus(); } });
        const qj = root.querySelector('#mp-quick');
        // Quick join: the open party with the most players already in it (the soonest to start), oldest first.
        if (qj) qj.onclick = () => { const t = ok.slice().sort((a, b) => (b.players | 0) - (a.players | 0))[0]; if (t) end({ code: net.cleanCode(t.code) }); };
        if (keep) { const el = root.querySelector(keep); if (el) el.focus({ preventScroll: true }); }
      };
      const end = v => { if (off) off(); res(v); };
      off = dir.onTables(() => { if (!root.contains(document.activeElement) || document.activeElement.id !== 'mp-code') draw(); }) || null;
      draw();
    });
  }

  // One party: the party room, the expedition, and the reward. Resolves to how the player left (raid.js).
  async function play(hub, dir, pick) {
    const RD = SD.raid, net = SD.net, root = $('#run');
    if (lead() && SD.champions && SD.champions.setMine) SD.champions.setMine(lead());
    let status = null, last = '', hosting = false, listed = true;
    const beat = () => {
      const st = status ? status() : null;
      if (!st || !st.lead) { if (hosting) { hosting = false; last = ''; dir.unhost(); } return; }
      const info = { code: pick.code, nick: hub.me.nick, players: st.players, max: st.max, open: !!(listed && st.open), champ: st.champ || null, info: net.clean(st.info, 48) };
      const j = JSON.stringify(info);
      if (j !== last) { last = j; hosting = true; dir.host(info); }
    };
    const poll = setInterval(beat, 1000);
    const onFinish = r => {
      if (!r || !r.won || !ids().includes(r.xp)) return;
      SD.run.gainXp(REWARD.win);
      const n = SD.marks.pay(r);
      U.system('REPLAY CLEARED', `${esc((expOf(r.xp) || {}).name || 'The expedition')}: +${REWARD.win} XP and +${n} ✦ Raid Marks${(r.humans | 0) >= 2 ? ' (doubled: you played with another person)' : ''}. The story stays where you left it.`, 'gold');
    };
    try {
      const rewardNote = `A clear pays ${REWARD.win} XP each, and Raid Marks for the Raid shop: double with another player. The story stays where you left it.`;
      return await RD.play(root, hub, pick.code, { create: !!pick.create, xp: pick.xp, open: ids(), label: 'Multiplayer', champNames: true, say, onFinish, rewardNote,
        status: f => { status = f; beat(); }, vis: { get: () => listed, set: v => { listed = !!v; beat(); } } });
    } finally { clearInterval(poll); if (hosting) dir.unhost(); }
  }

  // The story starting an expedition is the surest sign you've reached it: noted for MP.reached, whatever its gate says.
  if (SD.raid && SD.raid.play && !SD.raid.play.mpNoted) {
    const play0 = SD.raid.play;
    SD.raid.play = function (root, hub, code, o) {
      if (o && o.story && o.xp && S.save) {
        const mp = S.save.mp || (S.save.mp = {}), r = Array.isArray(mp.reached) ? mp.reached : (mp.reached = []);
        if (!r.includes(o.xp)) { r.push(o.xp); S.persist(); }
      }
      return play0.apply(this, arguments);
    };
    SD.raid.play.mpNoted = true;
  }

  // ---------- Where it's offered ----------
  // The title: a Multiplayer button after Continue and New game. This is the outermost title patch (it loads after
  // js/demo-select.js, whose patch replaces the buttons the chapters leave), so it adds to whatever those drew.
  const boot = () => {
    const M = SD.main, title = M.title;
    M.title = function () {
      title();
      const box = $('#title-actions');
      if (!box || box.querySelector('#t-start') || box.querySelector('#t-mp') || !MP.available()) return;
      const b = document.createElement('button');
      b.className = 'ghost'; b.id = 't-mp'; b.type = 'button'; b.textContent = 'Multiplayer';
      b.onclick = () => MP.open('title');
      const help = box.querySelector('#t-help');
      box.insertBefore(b, help || null);
      // An invite link: once, straight into the party.
      const m = /^#join-([a-z0-9]{5})$/i.exec(location.hash || '');
      if (m && SD.net.gameOf(SD.net.cleanCode(m[1])) === 'raid') {
        try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) { location.hash = ''; }
        setTimeout(() => MP.open('title', SD.net.cleanCode(m[1])), 0);
      }
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { boot(); if (!$('#screen-title').hidden) SD.main.title(); }, 0), { once: true });
  else { boot(); if (!$('#screen-title').hidden) SD.main.title(); }
})();
