// ELI5 lines (game and anime terms, plain words) for the questions in js/bank-mix-g7.js. Loaded after js/eli5.js; a
// line already set there wins. See js/eli5.js for the style.
window.SD = window.SD || {};
SD.eli5 = SD.eli5 || {};
(function () {
  const E = {
    'saa-3-701': 'The supply depot is across the map, and your party grabs a million tiny potions an hour. Build a small depot right next to camp (S3 Express One Zone) and every grab is quick.',
    'saa-3-702': 'Your backpack can be upgraded while you wear it. Swap gp2 for gp3 and turn up its speed dial without stopping the quest.',
    'saa-3-703': 'Windows heroes need a Windows-style guild hall with the guild\'s own member list (Active Directory). FSx for Windows is that hall, with a spare in the next town.',
    'saa-3-704': 'Three smiths must hammer the same anvil at once. Only the heavy-duty anvil (io2) can be shared that way, and the smiths must take turns by their own rules.',
    'saa-3-705': 'A moving caravan that copies the whole library once, then each night carries only the books that changed, and checks every crate on arrival.',
    'saa-3-706': 'Only the castle gate (the load balancer) faces the road. The workers inside send runners out through a one-way door (NAT) for supplies, and the vault has no door to the road at all.',
    'saa-3-707': 'One front door, a clerk who reads each letter\'s address line: anything for "/api/" goes to the new office, everything else to the old one.',
    'saa-3-708': 'Your village ran out of house plots. You can\'t stretch the old streets, but you can annex a new field (a secondary CIDR) and lay new streets there.',
    'saa-3-709': 'The main bridge is fast but alone. Keep a cheap ferry (a VPN) on the same dock, and the boats take the bridge until it falls, then the ferry.',
    'saa-3-710': 'Raw messages on a secret channel, and partners who only trust fixed doors. The Network Load Balancer passes the channel through and stands at the same address every day.',
    'dva-3-701': 'Before the army crosses to the new bridge, a scout walks it first. If the scout falls, nobody crosses and the old bridge stays in use.',
    'dva-3-702': 'Let one in ten adventurers try the new dungeon door at the same entrance, watch how they fare, then open it for everyone.',
    'dva-3-703': 'Tell the referee where the scorecards are (the reports section) and let it file them, and it keeps a season table of wins and losses.',
    'dva-3-704': 'A checkpoint between the practice field and the arena. If the practice match fails, the gate to the arena stays shut.',
    'dva-3-705': 'Send five of every hundred players to the new map through the same portal. Close that path in one move if it goes badly.'
  };
  Object.keys(E).forEach(id => { if (!SD.eli5[id]) SD.eli5[id] = E[id]; });
})();
