// Raid Marks (Ladi, 2026-10-24): the raid finder's own currency, for cosmetics only. Every replay clear in the
// Multiplayer finder (js/raid-finder.js) pays them, solo, with bots or with friends, and more when another person
// is still in the party at the end. They buy outfit recolors, follow-along effects, portrait frames, looks (full-body reskins) and emote packs (js/emote.js) at the Raid shop; what's worn and how it's drawn is
// js/wear.js. No power, no story: the story's currencies (shards, tapes) never mix with marks.
//
//   SD.marks.balance()                 marks you have
//   SD.marks.pay({ right, humans })    a clear's marks: PAY.clear, plus PAY.perRight per answer right (up to
//                                      PAY.rightCap), times PAY.withHuman when humans >= 2. Adds them, returns n.
//   SD.marks.ITEMS                     the shop: [{ id, name, slot, tier, cost }]
//   SD.marks.owns(id), owned(), buy(id) -> true when bought; never twice (a pack and its emotes count as each other)
//   SD.marks.price(id)                 its price (a pack's is full price even when you have some of it)
//
// Saved at S.save.mp.marks = { n, owned: [id] }. Where the full profile's economy is loaded (js/economy.js), a buy is
// also pushed into its cosmetics list, so either can tell what you own.
(function () {
  const S = SD.state, U = SD.ui;
  const M = SD.marks = {};
  // A solo or bot clear with every question right pays 20; the same clear with another person pays 40.
  M.PAY = Object.freeze({ clear: 10, perRight: 2, rightCap: 5, withHuman: 2 });
  // What the shop sells: swap this list (and SLOTS) to change the stock; nothing else names an item. The ids, names
  // and tiers are js/wear.js's (Ladi, 2026-10-24: recolors, follow-along effects and portrait frames) and js/emote.js's. Each tier has
  // one price for now; Ladi settles the final prices once every cosmetic is built.
  M.SLOTS = Object.freeze({ outfit: 'Outfit', effect: 'Effect', frame: 'Frame', emote: 'Emote pack', emote1: 'Emote', act1: 'Action', look: 'Look' });
  M.TIERS = Object.freeze({ common: 60, rare: 150, legendary: 260, mythic: 400 });
  // A single emote or action, and a pack's price as a share of its emotes' singly (placeholders, like TIERS).
  M.SINGLE = Object.freeze({ emote1: 30, act1: 60 });
  M.PACK_OFF = 0.7;
  M.ITEMS = Object.freeze([
    ['frame-cafe', 'Café frame', 'frame', 'common'], ['frame-pager', '3 a.m. pager', 'frame', 'common'],
    ['frame-temple', 'Temple of Uptime', 'frame', 'common'], ['frame-starlit', 'Starlit', 'frame', 'common'],
    ['outfit-ember', 'Ember red', 'outfit', 'common'], ['outfit-forest', 'Forest green', 'outfit', 'common'],
    ['outfit-midnight', 'Midnight blue', 'outfit', 'common'], ['outfit-snow', 'Snow white', 'outfit', 'common'],
    ['outfit-gilded', 'Gilded trim', 'outfit', 'common'],
    ['outfit-harvest', 'Harvest', 'outfit', 'rare'], ['outfit-winterfest', 'Winterfest', 'outfit', 'rare'],
    ['outfit-lunar', 'Lunar New Year', 'outfit', 'rare'], ['outfit-spring', 'Spring bloom', 'outfit', 'rare'],
    ['fx-stardust', 'Stardust', 'effect', 'rare'], ['fx-snow', 'Snowfall', 'effect', 'rare'], ['fx-embers', 'Embers', 'effect', 'rare'],
    ['fx-soot', 'Soot puffs', 'effect', 'legendary'], ['fx-firework', 'Victory fireworks', 'effect', 'legendary'],
    // Emote packs (js/emote.js) for the Emote button: four or six emotes each, and the Moves pack's seven actions and the Story moves pack's four.
    ['emo-tavern', 'Tavern pack', 'emote', 'common'], ['emo-cloud', 'Cloud jokes pack', 'emote', 'rare'], ['emo-season', 'Seasonal pack', 'emote', 'rare'], ['emo-moves', 'Moves pack', 'emote', 'legendary'], ['emo-story', 'Story pack', 'emote', 'rare'], ['emo-lore', 'Story moves pack', 'emote', 'legendary'],
    // Looks (js/wear.js): reskins of the full body, the top tier. Restored isn't sold: it's earned by beating Freya.
    ['look-zombie', 'Zombie Process', 'look', 'mythic'], ['look-santa', 'Winterfest Santa', 'look', 'mythic'], ['look-lantern', 'Lantern-bearer', 'look', 'mythic'],
    ['look-blossom', 'Spring Blossom', 'look', 'mythic'], ['look-glacier', 'Glacier', 'look', 'mythic'], ['look-spot', 'Spot Instance', 'look', 'mythic'],
    ['look-lambda', 'Lambda', 'look', 'mythic'], ['look-veteran', 'us-east-1 Veteran', 'look', 'mythic'], ['look-guild', 'Guild armour', 'look', 'mythic'],
    ['look-acolyte', 'Temple acolyte', 'look', 'mythic'], ['look-tavern', 'Tavern keeper', 'look', 'mythic']
  ].map(([id, name, slot, tier]) => ({ id, name, slot, tier, cost: M.TIERS[tier] }))
    // Every pack's emotes are also sold one at a time (Ladi, 2026-10-25), listed under their pack as em-<emote id>, and
    // a pack costs PACK_OFF of what the emotes in it would cost singly.
    .flatMap(it => {
      const E = SD.emote;
      if (it.slot !== 'emote' || !E) return [it];
      const ones = Object.keys(E.EMOTES).filter(e => E.EMOTES[e].pack === it.id)
        .map(e => ({ id: 'em-' + e, name: E.EMOTES[e].name, slot: E.EMOTES[e].act ? 'act1' : 'emote1', tier: null, pack: it.id, emote: e, cost: M.SINGLE[E.EMOTES[e].act ? 'act1' : 'emote1'] }));
      it.has = ones.map(o => o.id);
      it.cost = Math.round(M.PACK_OFF * ones.reduce((a, o) => a + o.cost, 0));
      // Its price comes from what's in it, so it's labelled by that, not by a tier (Ladi, 2026-10-25).
      it.tier = null;
      it.label = ones.some(o => o.slot === 'act1') ? 'Action pack' : 'Emote pack';
      return [it].concat(ones);
    }).map(it => Object.freeze(it)));
  const st = () => { const s = S.save; const mp = s.mp || (s.mp = {}); return mp.marks || (mp.marks = { n: 0, owned: [] }); };
  M.balance = () => st().n;
  M.item = id => M.ITEMS.find(x => x.id === id) || null;
  const bought = id => st().owned.includes(id) || !!(SD.econ && SD.econ.state && SD.econ.state().cosmetics.includes(id));
  // A pack owns its emotes, and all of a pack's emotes own the pack, so neither can be bought twice.
  M.owns = id => {
    const it = M.item(id);
    if (bought(id)) return true;
    if (it && it.pack) return bought(it.pack);
    if (it && it.has) return it.has.every(bought);
    return false;
  };
  // A pack keeps its full price whatever of it you have, and stays for sale until every emote in it is yours (Ladi,
  // 2026-10-25).
  M.price = id => { const it = M.item(id); return it ? it.cost : null; };
  M.isEmote = it => !!it && ['emote', 'emote1', 'act1'].includes(it.slot);
  M.owned = () => st().owned.slice();
  M.earned = ({ right, humans } = {}) => {
    const P = M.PAY;
    return (P.clear + P.perRight * Math.min(Math.max(right | 0, 0), P.rightCap)) * ((humans | 0) >= 2 ? P.withHuman : 1);
  };
  M.pay = function (r) {
    const n = M.earned(r);
    st().n += n; S.persist();
    return n;
  };
  M.buy = function (id) {
    const it = M.item(id), s = st();
    const cost = M.price(id);
    if (!it || M.owns(id) || s.n < cost) return false;
    s.n -= cost; s.owned.push(id);
    if (SD.econ && SD.econ.state) { const c = SD.econ.state().cosmetics; if (!c.includes(id)) c.push(id); }
    S.persist();
    if (SD.audio) SD.audio.sfx('coin');
    U.system('RAID SHOP', `${it.name}: yours. ${s.n} ✦ left.`, 'gold');
    return true;
  };
  // js/wear.js asks here who owns what, and labels what you don't own yet with its price.
  const link = () => { if (!SD.wear) return; SD.wear.owns = M.owns; SD.wear.price = id => { const c = M.price(id); return c == null ? '' : `${c} ✦ at the Raid shop`; }; };
  link();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', link, { once: true });
})();
