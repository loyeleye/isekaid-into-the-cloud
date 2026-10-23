// ELI5 lines (game and anime terms, plain words) for the questions in js/bank-dva-gap2.js. Loaded after js/eli5.js; a
// line already set there wins. See js/eli5.js for the style.
window.SD = window.SD || {};
SD.eli5 = SD.eli5 || {};
(function () {
  const E = {
    'dva-3-920': 'Twelve heroes each carry their own copy of the same spellbook. Put the book in the guild library once (a layer), and each hero borrows the edition they want.',
    'dva-3-921': 'Your backpack (a .zip) holds 250 MB, and the gear weighs 1.8 GB. Pack it in a shipping crate instead (a container image), which holds up to 10 GB.',
    'dva-3-922': 'The map says "treasure is in my room", but the castle can only fetch from the bank vault. The package command carries your stuff to the vault and fixes the map.',
    'dva-3-923': 'A settings dial outside the game. Turn the new feature on slowly for more and more players, check the value first, and snap it back if the alarm rings.',
    'dva-3-924': 'Instead of every party shopping at the open market, the guild runs one supply shop. It stocks your own crafted items and fetches approved market goods once, then keeps them on the shelf.',
    'dva-3-925': 'One saved loadout per world: "dev" and "prod". Pick the loadout by name, and you can\'t walk into the boss room with your practice gear by accident.',
    'dva-3-926': 'You forged a sword in your kitchen, but it only fits hands from your village. Forge it in a smithy that copies Lambda\'s world (--use-container) and it fits there.',
    'dva-3-927': 'A note packed with the game that every new player\'s house follows: install this, set that. Houses built later by scaling read the same note.',
    'dva-3-928': 'Once a trophy is labelled "release-1.4", nobody can stick that label on a different trophy. A second push with the same label is turned away.',
    'dva-3-929': 'Pack only the gear you\'ll actually use on the quest, and let a smith fold it small (esbuild). Practice dummies and spare tools stay home.',
    'dva-3-930': 'Make a fake "new upload" letter, then hand it to your practice dummy of the function on your own desk. No real bucket, no deploy.',
    'dva-3-931': 'Your laptop pretends to be the API front desk. Each request wakes a local copy of the function, so you can click around in the browser while you edit.',
    'dva-3-932': 'In practice fights, stand-ins play the database and the queue and say exactly the lines you wrote for them. No real monsters, no keys needed.',
    'dva-3-933': 'One castle with a dev gate and a prod gate. A sign on each gate (a stage variable) says which version of the guard to send for: dev or prod.',
    'dva-3-934': 'Instead of rebuilding the whole castle for every new torch, a runner carries just the torch to your practice castle in seconds. Only for practice castles.',
    'dva-3-935': 'Testing a moving target: freeze a snapshot (a version), test that exact snapshot, then crown that same snapshot as the release.',
    'dva-3-936': 'The shop isn\'t built yet, so put up a cardboard shopkeeper who always says the agreed line. The other team can practice talking to it now.',
    'dva-3-937': 'A practice copy of the database that lives on your own laptop. Real moves, real rules, no gold spent and nobody else\'s save in it.',
    'dva-3-938': 'Poke the real function with a sample letter, from the console\'s Test button or from your terminal (sam remote invoke), and read what it says back.',
    'dva-3-939': 'When the stack is built, it posts a notice board of addresses (outputs). Tests read the board each time instead of remembering old addresses.'
  };
  Object.keys(E).forEach(id => { if (!SD.eli5[id]) SD.eli5[id] = E[id]; });
})();
