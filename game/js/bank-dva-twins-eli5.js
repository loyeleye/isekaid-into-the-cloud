// ELI5 lines (game and anime terms, plain words) for the twin questions in js/bank-dva-twins.js. Loaded after
// js/eli5.js; a line already set there wins. See js/eli5.js for the style.
window.SD = window.SD || {};
SD.eli5 = SD.eli5 || {};
(function () {
  const E = {
    'dva-1-950': 'Every parcel waits in one single-file line, so only one clerk can work at a time. Give each parcel its own line and the clerks work side by side, each line still in order.',
    'dva-1-951': 'Instead of reserving the quest for 30 minutes, reserve it for 2 and keep shouting "still on it!" every minute. Go quiet (crash) and it\'s back on the board fast.',
    'dva-1-952': 'The fraud check hands back a slip, and by default the slip replaces your whole backpack. Tell it to put the slip in a side pocket instead, and you keep the order too.',
    'dva-1-953': 'A saved game file never changes. Your fix is in the live play-through, so save a new file and point the "live" bookmark at it.',
    'dva-1-954': 'Lambda may need several tries at a quest. Keep the quest greyed out for six times Lambda\'s time limit so nobody else grabs it in the meantime: 6 × 5 = 30 minutes.',
    'dva-1-955': 'The side quest log (LSI) can only be set up when you create your character. The guild board (GSI) can be added any time, even two years into the save.',
    'dva-1-956': 'Writes are paid in 1 KB coins, and you round up. A 2.5 KB item costs 3 coins, 50 times a second: 150. Only reads get a half-price deal.',
    'dva-1-957': 'The cache is a shop window that only refreshes now and then. For the till, ask to check the actual stockroom (a strongly consistent read) and you see the true count.',
    'dva-2-950': 'The vendor runs errands for many guilds. Your door only opens to the vendor when they also say your secret password, so nobody can send them in pretending to be you.',
    'dva-2-951': 'You only need the chest locked. The bank already locks every new chest with its own key, free. Bring your own key only when you need to hold it.',
    'dva-2-952': 'Stamp each tenant\'s name on its lockbox when you seal it. The box only opens if you say the same name, and the guard\'s logbook writes the name down.',
    'dva-2-953': 'The password must change itself every 60 days. Secrets Manager comes with a built-in "change the password" ritual; Parameter Store is just a shelf.',
    'dva-2-954': 'Instead of walking to the vault every turn, keep a copy in your pocket (the extension) that refreshes every few minutes.',
    'dva-3-950': 'Eight guards, and at least four must stay on duty. Swap four at a time: two rounds, and the castle is never left short.',
    'dva-3-951': 'Bring in a whole new team to stand beside the old one. Once every newcomer is healthy, they take over and the old team goes home. If anyone fails, the newcomers leave and the old team carries on.',
    'dva-3-952': 'Before casting the big spell, read the preview that says "this will destroy and rebuild your database". Nothing happens until someone says go.',
    'dva-3-953': 'Move players to the new server in equal 10% groups every 2 minutes (linear). A canary sends one group, waits, then sends everyone.',
    'dva-4-950': 'On the map, yellow means "you asked wrong" (4xx), red means "the other side broke" (5xx), and purple means "slow down" (429).',
    'dva-4-951': 'Everyone queues at one door because the door is named after today. Number ten doors for today and pick one at random, and the crowd spreads out.',
    'dva-4-952': 'Each lane on the conveyor is worked by one person. Let several people work each lane at once, while keeping each item\'s steps in order.',
    'dva-4-953': 'You can\'t change the bard\'s song, but you can stand by and count every time he sings "PAYMENT_FAILED". That counter is a metric filter.'
  };
  Object.keys(E).forEach(k => { if (!SD.eli5[k]) SD.eli5[k] = E[k]; });
})();
