/* The Night Watch: relationships. Trust in you per person, ties between people, referrals and perks.
   Pure logic (no DOM). Browser: SD.watchBonds. Node: module.exports.
   Lesson it mirrors (DVA-C02 2.1): acting in another account needs both sides to allow it,
   and an explicit deny beats any allow. */
(function () {
  'use strict';
  var START = 20, START_HIGH = 40, HIGH = { mira: 1, pell: 1, kagemaru: 1 };
  var GAIN = { chat: 2, mini: 5, lesson: 3, small: 10, trust: 20, wrong: -5, breach: -5 };
  // Named steps of trust (Ladi, Nov 18: a richer relationship engine). Crossing one is announced; 40 unlocks a secret.
  var TIERS = [[0, 'stranger'], [20, 'acquaintance'], [40, 'friend'], [60, 'close friend'], [80, 'trusted friend']];
  function tier(n) { var t = TIERS[0][1]; TIERS.forEach(function (x) { if (n >= x[0]) t = x[1]; }); return t; }
  var CAP = { warm: 80, neutral: 50, cool: 0 };
  var PERKS = [
    { at: 40, id: 'secret-gossip' },
    { at: 60, id: 'discount', off: 0.2, shops: ['kagemaru', 'hobb', 'wen'] },
    { at: 80, id: 'second-try' }, { at: 80, id: 'walk-with' }, { at: 80, id: 'ward-boost' }
  ];
  function clamp(n) { return Math.max(0, Math.min(100, Math.round(n))); }

  // b = { trust: {who: n}, chatted: {who: day}, today: {'a|b': 'warm'|'cool'|'neutral'}, day }
  function create(day) { return { trust: {}, chatted: {}, today: {}, day: day || 1 }; }
  function trust(b, who) { return who in b.trust ? b.trust[who] : (HIGH[who] ? START_HIGH : START); }
  function add(b, who, kind) {
    var d = typeof kind === 'number' ? kind : (GAIN[kind] || 0);
    b.trust[who] = clamp(trust(b, who) + d); return b.trust[who];
  }
  function chat(b, who) {  // first chat each day only
    if (b.chatted[who] === b.day) return trust(b, who);
    b.chatted[who] = b.day; return add(b, who, 'chat');
  }
  function newDay(b, day) { b.day = day; b.today = {}; }

  // ties: content's WATCH_CONTENT.ties = { who: { warm: [..], cool: [..] } }; a tie is how `who` feels about `other`
  function key(a, b) { return a < b ? a + '|' + b : b + '|' + a; }
  function tie(b, ties, who, other) {
    if (who === other) return 'warm';
    var t = b.today[key(who, other)]; if (t) return t;
    var row = (ties || {})[who] || {};
    if ((row.cool || []).indexOf(other) >= 0) return 'cool';
    if ((row.warm || []).indexOf(other) >= 0) return 'warm';
    return 'neutral';
  }
  function shift(b, a, c, to) { b.today[key(a, c)] = to; }  // gossip: a quarrel or a shared meal, for today

  // A referral: `sender` sends you to `who`. Help = the lower of trust in you and the tie cap; cool denies.
  function refer(b, ties, who, sender) {
    var t = tie(b, ties, who, sender), you = trust(b, who);
    if (t === 'cool') return { tie: t, you: you, score: 0, band: 'deny' };
    var score = Math.min(you, CAP[t]);
    return { tie: t, you: you, sender: CAP[t], score: score, band: score >= 60 ? 'high' : score >= 30 ? 'mid' : 'low' };
  }
  // Who could vouch: someone warm to both `who` and `sender` (and who trusts you at least 30).
  function vouchers(b, ties, who, sender, people) {
    return (people || Object.keys(ties || {})).filter(function (p) {
      return p !== who && p !== sender && tie(b, ties, who, p) === 'warm' &&
        tie(b, ties, p, sender) === 'warm' && trust(b, p) >= 30;
    });
  }
  function perks(b, who) { var n = trust(b, who); return PERKS.filter(function (p) { return n >= p.at; }).map(function (p) { return p.id; }); }
  function price(b, who, cost) {
    var n = trust(b, who), d = PERKS[1];
    return n >= d.at && d.shops.indexOf(who) >= 0 ? Math.round(cost * (1 - d.off)) : cost;
  }

  var api = { TIERS: TIERS, tier: tier, START: START, GAIN: GAIN, CAP: CAP, PERKS: PERKS, create: create, trust: trust, add: add, chat: chat,
    newDay: newDay, tie: tie, shift: shift, refer: refer, vouchers: vouchers, perks: perks, price: price };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.SD = window.SD || {}; window.SD.watchBonds = api; }
})();
