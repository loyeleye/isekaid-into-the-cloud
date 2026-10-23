// Seymour's Tapes (Ladi, Oct 23): extra lives you keep. One stockpile for the whole game, in S.save.tapes, shown on
// the raid screen. When the team goes down in a raid with a tape to play, the tape is used up for good, the team is
// healed to full, and the expedition goes on from the fight it lost (js/raid.js asks a question first: right, and the
// incident keeps the damage you'd done; wrong, and it starts again at full Severity). With no tape to play, it's back
// to camp and the expedition starts over, as before.
//   Where they come from: Seymour's first gift in chapter 2 (STARTER), exploration rewards (SD.tapes.award, once per
//   key), and one a day from the seller after a spaced review (SD.tapes.shop): Seymour, and Kagemaru once he's taken
//   the original tape in chapter 6. In chapter 5 Freya's midnight redeploy overwrites half the stockpile (halve).
//   How many can play on one expedition: SD.tapes.cap(ch), 3 through chapter 4 and 2 from chapter 5.
//   SD.tapes.forRaid(ch) -> { tapes, onTape } for SD.raid.play: the tapes this expedition can play, and the callback
//   that takes one out of the stockpile when it does.
(function () {
  const T = SD.tapes = {};
  const S = SD.state, U = SD.ui;
  const STARTER = 3, MAX = 99, REVIEW = 5, PASS = 4;
  const PRICE = { seymour: 50, kagemaru: 100 };
  const today = () => new Date().toDateString();
  // The stockpile. A save from before the rework that's past Seymour's bunker starts with his first gift.
  function st() {
    const sv = S.save;
    if (!sv.tapes || typeof sv.tapes !== 'object') {
      const met = !!(sv.c2 && sv.c2.w && sv.c2.w.x && sv.c2.w.x.seymour) || ['c2x', 'c3', 'c4', 'c5', 'c6', 'c7'].some(k => sv[k]);
      sv.tapes = { n: met ? STARTER : 0, day: '', got: met ? ['starter'] : [] };
    }
    const t = sv.tapes;
    t.n = Math.max(0, Math.min(MAX, t.n | 0));
    if (!Array.isArray(t.got)) t.got = [];
    return t;
  }
  T.count = () => st().n;
  T.cap = ch => ((ch | 0) >= 5 ? 2 : 3);
  T.add = function (n, title, why) {
    const t = st();
    t.n = Math.min(MAX, t.n + Math.max(0, n | 0));
    S.persist();
    if (title) U.system(title, `${why ? why + ' ' : ''}📼 You have ${t.n} of Seymour's Tapes.`, 'gold');
    return t.n;
  };
  // An exploration reward: n tapes, once per key, whatever happens after.
  T.award = function (key, n, why) {
    const t = st();
    if (t.got.includes(key)) return false;
    t.got.push(key);
    T.add(n == null ? 1 : n, n > 1 ? `+${n} SEYMOUR'S TAPES` : '+1 SEYMOUR\'S TAPE', why);
    return true;
  };
  T.has = key => st().got.includes(key);
  T.spend = function () { const t = st(); if (t.n > 0) t.n--; S.persist(); return t.n; };
  // Chapter 5's first night: the redeploy writes over half of them. Returns [before, after].
  T.halve = function () { const t = st(), was = t.n; t.n = Math.max(was ? 1 : 0, Math.ceil(was / 2)); S.persist(); return [was, t.n]; };
  T.forRaid = function (ch, none) {
    if (none) return { tapes: 0 };
    return { tapes: Math.min(T.count(), T.cap(ch)), onTape: T.spend };
  };
  // Who sells them: Seymour, until Kagemaru takes the original from his bunker (chapter 6).
  T.seller = () => (S.save.c6 && S.save.c6.w && S.save.c6.w.x && S.save.c6.w.x.reveal ? 'kagemaru' : 'seymour');
  // One line for an expedition's door.
  T.line = function (ch, none) {
    if (none) return 'Seymour\'s Tapes don\'t play here. Go down, and the expedition starts over from its first floor.';
    const n = T.count(), c = T.cap(ch), k = Math.min(n, c);
    return `📼 You have ${n} of Seymour's Tapes${n ? `; up to ${k} can play on this expedition` : ''}. Go down with one and it's gone for good, but you're healed to full and fight on from where you fell. Go down with none and you're back at camp, and the expedition starts over.`;
  };
  T.shopLabel = () => `📼 Get a tape from ${T.seller() === 'kagemaru' ? 'Kagemaru' : 'Seymour'}`;
  // An expedition door's tape line and shop button (wire it with T.wire): the button closes the door's panel the way
  // its "Not yet" does (notYet), then opens the shop.
  T.door = (ch, none) => `<p class="muted small">${U.esc(T.line(ch, none))}</p>${none ? '' : `<div class="row"><button class="ghost" id="tp-shop">${U.esc(T.shopLabel())}</button></div>`}`;
  T.wire = function (b, notYet) {
    const el = b.querySelector('#tp-shop');
    if (el) el.onclick = () => { notYet(); setTimeout(() => T.shop(), 250); };
  };
  // The tape shop: once a day, a spaced review of REVIEW questions (what's due first), PASS right to buy one.
  T.shop = async function () {
    const t = st(), who = T.seller(), price = PRICE[who], name = who === 'kagemaru' ? 'Kagemaru' : 'Sir Seymour';
    const pitch = who === 'kagemaru' ? '"A tape? I have exactly one supplier, and I robbed him. Answer my little quiz and it\'s yours. For a modest fee. Ah ha ha."'
      : '"A tape is only a backup if it\'s been tested. So are you. Five questions. Four right, and I\'ll make you one."';
    const go = await new Promise(res => {
      const done = t.day === today(), poor = (S.save.shards | 0) < price;
      const b = U.panel(`<p>${pitch}</p>
        <p class="muted small">Once a day: ${REVIEW} review questions, due ones first. Get ${PASS} right, then pay ${price} shards for one tape. You have ${S.save.shards | 0} shards and ${t.n} tape${t.n === 1 ? '' : 's'}.</p>
        <div class="row">${done ? '<p class="muted">Come back tomorrow.</p>' : `<button class="primary" id="tp-go" ${poor ? 'disabled' : ''}>${poor ? `Need ${price} shards` : 'Start the review'}</button>`}<button class="ghost" id="tp-no">Not now</button></div>`, { title: name.toUpperCase() + '\'S TAPES', onClose: () => res(false) });
      const g = b.querySelector('#tp-go'); if (g) g.onclick = () => { U.closePanel(); res(true); };
      b.querySelector('#tp-no').onclick = () => { U.closePanel(); res(false); };
    });
    if (!go) return false;
    // Concepts you've met and can review, due ones first (SD.state.pickConcepts).
    const seen = Object.keys(SD.concepts).filter(id => S.reviewable(id) && S.save.concepts[id] && S.save.concepts[id].seen && S.questionsFor(id).length);
    const r = await SD.quiz.session(REVIEW, { title: 'SPACED REVIEW · ' + name.toUpperCase(), pool: seen.length >= REVIEW ? seen : undefined });
    const right = r.filter(x => x.ok).length;
    t.day = today();
    S.persist();
    if (right < PASS) { U.system('NOT TODAY', `${right} of ${r.length} right. ${who === 'kagemaru' ? 'Kagemaru tuts.' : 'Seymour shuts the slot.'} Try again tomorrow; what you missed comes back first.`, 'red'); return false; }
    S.save.shards = (S.save.shards | 0) - price;
    T.add(1, 'TAPE BOUGHT', `${right} of ${r.length} right, and ${price} shards.`);
    return true;
  };
})();
