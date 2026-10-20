// Placeholders for the systems the run engine (js/run.js) and saves (js/state.js) ask about, until the sequel has a
// town to put them in: town quests and their Plot Devices and curses (the first game's js/quests.js), and the
// bestiary and ascension modifiers (its js/meta.js). Replace each with the real thing when the story needs it.
(function () {
  // No town quests yet: no Plot Devices owned, no dungeon curses.
  SD.quests = SD.quests || {
    list: [],
    has: () => false,
    curses: () => [],
    devices: () => []
  };
  SD.curses = SD.curses || {};

  // Run events go nowhere yet. Gary's ONE COMMIT rescue stays off until the story decides whether he returns.
  SD.meta = SD.meta || {
    emit() {},
    mod: (k, v) => (k === 'gary' ? false : v)
  };
})();
