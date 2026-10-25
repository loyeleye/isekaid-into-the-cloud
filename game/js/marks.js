// Raid Marks (Ladi, 2026-10-24): the raid finder's own currency, for cosmetics only. Every replay clear in the
// Multiplayer finder (js/raid-finder.js) pays them, solo, with bots or with friends, and more when another person
// is still in the party at the end. They buy outfit recolors, follow-along effects, portrait frames, looks (full-body reskins) and emote packs (js/emote.js) at the Raid shop; what's worn and how it's drawn is
// js/wear.js. No power, no story: the story's currencies (shards, tapes) never mix with marks.
//
//   SD.marks.balance()                 marks you have
//   SD.marks.pay({ right, humans })    a clear's marks: PAY.clear, plus PAY.perRight per answer right (up to
//                                      PAY.rightCap), times PAY.withHuman when humans >= 2. Adds them, returns n.
//   SD.marks.ITEMS                     the shop: [{ id, name, slot, tier, cost }]
//   SD.marks.owns(id), owned(), buy(id) -> true when bought
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
  M.SLOTS = Object.freeze({ outfit: 'Outfit', effect: 'Effect', frame: 'Frame', emote: 'Emote pack', look: 'Look' });
  M.TIERS = Object.freeze({ common: 60, rare: 150, legendary: 260, mythic: 400 });
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
  ].map(([id, name, slot, tier]) => Object.freeze({ id, name, slot, tier, cost: M.TIERS[tier] })));
  const st = () => { const s = S.save; const mp = s.mp || (s.mp = {}); return mp.marks || (mp.marks = { n: 0, owned: [] }); };
  M.balance = () => st().n;
  M.item = id => M.ITEMS.find(x => x.id === id) || null;
  M.owns = id => st().owned.includes(id) || !!(SD.econ && SD.econ.state && SD.econ.state().cosmetics.includes(id));
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
    if (!it || M.owns(id) || s.n < it.cost) return false;
    s.n -= it.cost; s.owned.push(id);
    if (SD.econ && SD.econ.state) { const c = SD.econ.state().cosmetics; if (!c.includes(id)) c.push(id); }
    S.persist();
    if (SD.audio) SD.audio.sfx('coin');
    U.system('RAID SHOP', `${it.name}: yours. ${s.n} ✦ left.`, 'gold');
    return true;
  };
  // js/wear.js asks here who owns what, and labels what you don't own yet with its price.
  const link = () => { if (!SD.wear) return; SD.wear.owns = M.owns; SD.wear.price = id => { const it = M.item(id); return it ? `${it.cost} ✦ at the Raid shop` : ''; }; };
  link();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', link, { once: true });
})();
