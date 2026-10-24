// The FullGame economy (FullGame plan, "Economy" and Addendum A): shards are the one currency. They come mostly from
// tonight's set of due reviews; they go to Seymour's and Kagemaru's tapes, Kagemaru's doors, Seymour's "deprecate",
// Ayo's forge, Aigerim's card shop and the Cache Café. Card picks come from fixed, capped places (see CARDS).
//
// Loads only under the full profile (SD.profile === 'full'); anywhere else SD.econ stays undefined and nothing changes.
// The tables are data; the functions that price and pay are pure (they take what they need as arguments). The only
// save data this module owns is S.save.fg.econ (E.state()); the balance itself is the game's existing S.save.shards.
// tools/economy_sim.js loads this file and plays 60 nights against it; see docs/economy.md.
(function () {
  if (typeof SD === 'undefined' || SD.profile !== 'full') return;
  const E = SD.econ = {};
  const today = () => new Date().toDateString();
  const freeze = o => Object.freeze(o);

  // ---- Sources -------------------------------------------------------------------------------------------------------
  // Tonight's set (due reviews). conf as js/state.js records it: 0 guess, 1 think so, 2 Sure. Shards only tell Sure
  // apart; the confidence tally (S.TALLY) still scores all three. Sure-and-wrong pays nothing and the tally takes its -5.
  // Pillar 3: a wrong answer never pays less than a skip, and a skip never pays more than trying (skip keeps it due).
  // Tuned from the addendum's starting 3 / 1 / Sure-right 5 / Sure-wrong 0 / skip 0 (tools/economy_sim.js). Sure pays off
  // on an item you get right more than wrong / (sureRight - right + wrong) of the time: 33% at the starting values, so
  // saying Sure on everything out-earned saying it honestly. No whole numbers on the 3 / 1 scale reach the plan's
  // "about 60%" (Sure-right 4 gives 50%, a coin flip at 60% accuracy), so the set doubles and keeps the ratios: right
  // is 3 times wrong, Sure-wrong and skip pay nothing, and Sure-right 7 breaks even at 67%. That's also the game design
  // review's "one night's set is about 70 shards", the scale its sink prices (below) were set for.
  E.SET = freeze({ right: 6, wrong: 2, sureRight: 7, sureWrong: 0, skip: 0 });
  E.NIGHT_CAP = 15;              // questions a night, glimmers included; the rest roll forward quietly
  // A glimmer on a map (a due or weak concept) is one of tonight's questions and pays as one, except a concept
  // already answered tonight, which pays 0 (no paying twice for massed practice). It still counts against the cap.
  E.GLIMMER = E.SET;
  // Exam Hall mock: only on a held-out form you haven't sat (each form is used once), at most once in EVERY_DAYS.
  // No buying mocks with shards.
  E.MOCK = freeze({ base: 30, perDomainRose: 10, everyDays: 7 });
  E.CARD_SKIP = 0;               // skipping a card offer pays nothing (Addendum A: skip pays 0)
  E.POSTER = 0;                  // a cleared poster pays a Receipt, not shards (shards would make missing on purpose pay)
  E.FIGHT = freeze({ normal: 0, elite: 0, boss: 0 }); // fights pay XP and cards; shards come from reviews
  E.DAILY_QUEST = 0;             // the old daily quest's 100 shards would swamp tonight's set

  // ---- Sinks ---------------------------------------------------------------------------------------------------------
  // opens: the chapter a sink first appears in.
  E.TAPES = freeze({ opens: { seymour: 2, kagemaru: 6 } }); // prices and the review rule are js/tapes.js's (SD.tapes.RULES)
  // Kagemaru's doors: the price is agreed at the door and charged only on a right answer ("I only charge when you win").
  // Wrong costs nothing and that door stays shut until tomorrow. Right upgrades one card you own. Ch7's price is a
  // favour, not shards (Addendum C).
  E.DOOR = freeze({ opens: 3, tiers: freeze({ 1: 40, 2: 70, 3: 100 }), tierByCh: freeze({ 3: 1, 4: 1, 5: 2, 6: 3 }), favourCh: 7, perChapter: 3 });
  // Seymour's "deprecate" (remove a starting card, from ch2): base, +step each time, Slay the Spire style.
  E.DEPRECATE = freeze({ opens: 2, base: 75, step: 25 });
  // Ayo's forge (from ch5): upgrade one owned card (once per card), or remove a starting card, cheaper than Seymour.
  E.FORGE = freeze({ opens: 5, upgrade: 60, remove: 50, perVisit: 2 });
  // Aigerim's card shop (from ch6): a card on a concept you've answered right twice; perChapter cards each chapter.
  E.SHOP = freeze({ opens: 6, prices: freeze({ common: 40, uncommon: 70, rare: 110 }), perChapter: 2, needRight: 2 });
  // The Cache Café (from ch2): cosmetics, no power. A long tail on purpose, the late game's open-ended sink.
  E.COSMETICS = freeze({
    opens: 2,
    items: freeze([
      ['mug', 30], ['hat-beanie', 40], ['lantern', 50], ['rug', 60], ['hat-crown', 80], ['plant', 90], ['banner', 110],
      ['hat-party', 120], ['bookshelf', 140], ['hat-wizard', 160], ['fountain', 180], ['telescope', 200], ['hat-cloud', 220],
      ['arcade', 240], ['hat-golden', 260], ['observatory', 300]
    ].map(([id, cost]) => freeze({ id, cost })))
  });

  // ---- Who owns a card -----------------------------------------------------------------------------------------------
  // The run deck is lost when an expedition ends, capped at runCap so decks can't snowball. The loadout is up to
  // loadout cards brought from the library. The library is the permanent collection (set pieces, hardest finds, the
  // shop). Removal never takes a starting deck below deckMin (as raid.js's own removal).
  E.CARDS = freeze({ runCap: 30, loadout: 3, deckMin: 5, upgradesPerCard: 1 });

  // ---- Pure functions ------------------------------------------------------------------------------------------------
  // result: { ok, conf (2 = Sure), skip, glimmer, repeat (concept already answered tonight) } -> shards.
  E.payout = function (result) {
    const r = result || {};
    const t = r.glimmer ? E.GLIMMER : E.SET;
    if (r.skip) return t.skip;
    if (r.glimmer && r.repeat) return 0;
    const sure = r.conf === 2 || r.sure === true;
    return r.ok ? (sure ? t.sureRight : t.right) : (sure ? t.sureWrong : t.wrong);
  };
  E.canAfford = (balance, cost) => cost != null && isFinite(cost) && cost >= 0 && (balance | 0) >= cost;
  E.isOpen = (opens, ch) => (ch | 0) >= opens;
  // A tape's price, from js/tapes.js. null while the tapes code isn't loaded or the seller isn't open in ch.
  E.tapePrice = function (seller, ch) {
    const R = SD.tapes && SD.tapes.RULES;
    if (!R || !(seller in R.price)) return null;
    if (ch != null && !E.isOpen(E.TAPES.opens[seller], ch)) return null;
    return R.price[seller];
  };
  E.tapeReview = () => (SD.tapes && SD.tapes.RULES ? { n: SD.tapes.RULES.review, pass: SD.tapes.RULES.pass } : null);
  // A door's price in chapter ch: shards by tier, 'favour' in ch7, null before ch3.
  E.doorPrice = function (ch) {
    ch = ch | 0;
    if (ch >= E.DOOR.favourCh) return 'favour';
    const tier = E.DOOR.tierByCh[ch];
    return tier ? E.DOOR.tiers[tier] : null;
  };
  // What a door attempt costs: the agreed price on a right answer, nothing on a wrong one.
  E.doorCharge = (price, ok) => (ok && typeof price === 'number' ? price : 0);
  E.deprecateCost = removals => E.DEPRECATE.base + E.DEPRECATE.step * Math.max(0, removals | 0);
  // The cheapest removal open in ch (forge from ch5, Seymour from ch2), or null.
  E.removeCost = function (ch, removals) {
    const c = [];
    if (E.isOpen(E.DEPRECATE.opens, ch)) c.push(E.deprecateCost(removals));
    if (E.isOpen(E.FORGE.opens, ch)) c.push(E.FORGE.remove);
    return c.length ? Math.min.apply(null, c) : null;
  };
  E.upgradeCost = ch => (E.isOpen(E.FORGE.opens, ch) ? E.FORGE.upgrade : null);
  E.shopPrice = (rarity, ch) => (E.isOpen(E.SHOP.opens, ch) && E.SHOP.prices[rarity] != null ? E.SHOP.prices[rarity] : null);
  E.cosmeticCost = id => { const c = E.COSMETICS.items.find(x => x.id === id); return c ? c.cost : null; };
  // Mock payout: m = { form, used (forms already sat), daysSince (since the last paid mock, null for none), rose }.
  E.mockPayout = function (m) {
    m = m || {};
    if (!m.form || (m.used || []).includes(m.form)) return 0;
    if (m.daysSince != null && m.daysSince < E.MOCK.everyDays) return 0;
    return E.MOCK.base + E.MOCK.perDomainRose * Math.max(0, m.rose | 0);
  };
  E.fightShards = opts => (opts && opts.boss ? E.FIGHT.boss : opts && opts.elite ? E.FIGHT.elite : E.FIGHT.normal);
  // The run deck an expedition starts with: starting deck (less removals) + loadout + picks, capped at runCap.
  E.runDeck = (starter, loadout, picks) => (starter || []).concat((loadout || []).slice(0, E.CARDS.loadout), picks || []).slice(0, E.CARDS.runCap);
  E.canAddToRun = deck => (deck || []).length < E.CARDS.runCap;

  // ---- State helpers (take the econ state explicitly; E.state() is the save's) ---------------------------------------
  E.fresh = () => ({ v: 1, night: { day: '', asked: 0, concepts: [], earned: 0 }, library: [], loadout: [], upgrades: {}, removed: [],
    removals: 0, doors: {}, mocks: { used: [], last: null }, shop: {}, cosmetics: [] });
  E.state = function () {
    const S = SD.state, sv = S && S.save;
    if (!sv) return null;
    sv.fg = sv.fg && typeof sv.fg === 'object' ? sv.fg : {};
    const st = sv.fg.econ = sv.fg.econ && typeof sv.fg.econ === 'object' ? sv.fg.econ : E.fresh();
    const f = E.fresh();
    Object.keys(f).forEach(k => { if (st[k] == null || typeof st[k] !== typeof f[k] || Array.isArray(f[k]) !== Array.isArray(st[k])) st[k] = f[k]; });
    return st;
  };
  // Tonight's record, started afresh on a new day.
  E.night = function (st, day) {
    day = day || today();
    if (!st.night || st.night.day !== day) st.night = { day, asked: 0, concepts: [], earned: 0 };
    return st.night;
  };
  E.canAsk = (st, day) => E.night(st, day).asked < E.NIGHT_CAP;
  // One of tonight's answers (set or glimmer): counts against the cap, marks the concept, returns the shards it pays.
  // Past the cap it pays 0 and isn't counted (the question should not have been asked).
  E.answer = function (st, result, day) {
    const n = E.night(st, day), r = Object.assign({}, result);
    if (n.asked >= E.NIGHT_CAP) return 0;
    r.repeat = !!(r.concept && n.concepts.includes(r.concept));
    const pay = E.payout(r);
    n.asked++;
    if (r.concept && !r.repeat && !r.skip) n.concepts.push(r.concept);
    n.earned += pay;
    return pay;
  };
  // A door: is it open to try today, and the outcome of an attempt. price: the agreed price (E.doorPrice).
  E.doorReady = (st, id, day) => { const d = st.doors[id]; return !d || (!d.opened && d.shut !== (day || today())); };
  E.doorAttempt = function (st, id, ok, price, day) {
    if (!E.doorReady(st, id, day)) return { charge: 0, opened: false, ready: false };
    const d = st.doors[id] = st.doors[id] || { tries: 0 };
    d.tries++;
    if (ok) d.opened = true; else d.shut = day || today();
    return { charge: E.doorCharge(price, ok), opened: !!ok, ready: true };
  };
  E.canUpgrade = (st, id) => !!id && (st.upgrades[id] | 0) < E.CARDS.upgradesPerCard;
  E.upgrade = (st, id) => { if (!E.canUpgrade(st, id)) return false; st.upgrades[id] = (st.upgrades[id] | 0) + 1; return true; };
  E.addToLibrary = (st, id) => { if (!id || st.library.includes(id)) return false; st.library.push(id); return true; };
  E.setLoadout = (st, ids) => (st.loadout = (ids || []).filter((id, i, a) => st.library.includes(id) && a.indexOf(id) === i).slice(0, E.CARDS.loadout));
  // The starting deck after removals (by index into the deck given, one removal per entry in st.removed).
  E.startingDeck = (st, starter) => { const d = (starter || []).slice(); (st.removed || []).forEach(id => { const i = d.indexOf(id); if (i >= 0) d.splice(i, 1); }); return d; };
  E.canRemove = (st, starter) => E.startingDeck(st, starter).length > E.CARDS.deckMin;
  // The run deck is the expedition's; it goes when the expedition ends.
  E.endExpedition = run => { if (run) run.deck = []; return run; };

  // ---- Save wrappers -------------------------------------------------------------------------------------------------
  // Pay from / into the game's one balance, S.save.shards. spend returns false (and charges nothing) if it can't afford.
  E.balance = () => (SD.state && SD.state.save ? SD.state.save.shards | 0 : 0);
  E.earn = function (n) { const sv = SD.state.save; sv.shards = (sv.shards | 0) + Math.max(0, n | 0); return sv.shards; };
  E.spend = function (cost) {
    const sv = SD.state.save;
    if (!E.canAfford(sv.shards, cost)) return false;
    sv.shards = (sv.shards | 0) - cost;
    if (SD.state.persist) SD.state.persist();
    return true;
  };
  // Record one of tonight's answers into the save and pay it.
  E.record = function (result) { const p = E.answer(E.state(), result); if (p) E.earn(p); if (SD.state.persist) SD.state.persist(); return p; };
})();
