// Raid Marks (Ladi, 2026-10-24): the raid finder's own currency, for cosmetics only. Every replay clear in the
// Multiplayer finder (js/raid-finder.js) pays them, solo, with bots or with friends, and more when another person
// is still in the party at the end. They buy hats and scarves at the Raid shop; what's worn and how it's drawn is
// js/wear.js. No power, no story: the story's currencies (shards, tapes) never mix with marks.
//
//   SD.marks.balance()                 marks you have
//   SD.marks.pay({ right, humans })    a clear's marks: PAY.clear, plus PAY.perRight per answer right (up to
//                                      PAY.rightCap), times PAY.withHuman when humans >= 2. Adds them, returns n.
//   SD.marks.ITEMS                     the shop: [{ id, name, slot, cost }]
//   SD.marks.owns(id), owned(), buy(id) -> true when bought
//
// Saved at S.save.mp.marks = { n, owned: [id] }. Where the full profile's economy is loaded (js/economy.js), a buy is
// also pushed into its cosmetics list, so either can tell what you own.
(function () {
  const S = SD.state, U = SD.ui;
  const M = SD.marks = {};
  // A solo or bot clear with every question right pays 20; the same clear with another person pays 40.
  M.PAY = Object.freeze({ clear: 10, perRight: 2, rightCap: 5, withHuman: 2 });
  // Same ids as js/economy.js COSMETICS (and js/wear.js), priced in marks.
  M.ITEMS = Object.freeze([
    ['hat-beanie', 'Beanie', 'hat', 40], ['scarf-red', 'Red scarf', 'scarf', 50], ['hat-crown', 'Paper crown', 'hat', 80],
    ['scarf-knit', 'Knitted scarf', 'scarf', 100], ['hat-party', 'Party hat', 'hat', 120], ['hat-wizard', 'Wizard hat', 'hat', 160],
    ['scarf-cloud', 'Cloud scarf', 'scarf', 190], ['hat-cloud', 'Cloud hat', 'hat', 220], ['hat-golden', 'Golden crown', 'hat', 260],
    ['scarf-golden', 'Golden scarf', 'scarf', 280]
  ].map(([id, name, slot, cost]) => Object.freeze({ id, name, slot, cost })));
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
