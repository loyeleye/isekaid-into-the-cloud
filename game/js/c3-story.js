// Chapter 3's cutscenes, as visual-novel scripts for js/vn.js (each six lines or fewer, and skippable). js/c3-world.js
// plays them where the Story Bible puts them; the storyboards are in storyboard/ch3 on the shared drive.
// Steps: ['bg', id], ['show', who, face, pos], ['hide', who], ['narr', text], [who, text, face], ['fx', 'black'].
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const T = SD.c3story = {};

  // ---------- Cold open: tax season ----------
  T.cold = [['bg', 'c3-kitchen'], ['show', 'hana', 'amused', 'left'], ['show', 'kai', 'neutral', 'right'],
    ['narr', 'Our world, a year and a half ago. Kai\'s kitchen table, a shoebox of receipts, and his sister Hana, eighteen, doing his taxes.'],
    ['hana', 'You kept a receipt for one lemon. One. But not your rent.', 'amused'],
    ['kai', 'The lemon was a business expense, boss.', 'smirk'],
    ['hana', 'You\'re an idiot about receipts. Sit. We\'re sorting these properly.', 'smile']];
  T.cold2 = [['bg', 'c3-kitchen'], ['show', 'hana', 'warm', 'left'], ['show', 'kai', 'neutral', 'right'],
    ['hana', 'Done. Now floss. In front of me. I don\'t trust you.', 'warm'],
    ['kai', 'I\'m twenty-four.', 'smirk'],
    ['hana', 'Then you\'ve had twenty-four years to learn. Floss, boss.', 'amused'],
    ['narr', 'Then a light comes under the kitchen door, gold and far too bright. And then Halcyon.']];

  // ---------- Act 1: Halcyon ----------
  T.arrive = [['bg', 'c3-halcyon'], ['show', 'kai', 'shock', 'right'],
    ['narr', 'Floor 21: Halcyon, rebuilt as the tower\'s stores, beautiful and well fed under a dome of gold light.'],
    ['narr', 'The barrier. It hums. Everyone here grew up under it, and nobody looks up.'],
    ['kai', 'I know this place. I know every street of this place.', 'grief'],
    ['narr', 'In the cathedral, bells start. They ring every night for the crowning of the twelfth Saint. It\'s in the template.']];
  T.heart = [['bg', 'c3-square'], ['show', 'kai', 'grief', 'right'],
    ['narr', 'The heart of the barrier, in the square. Kai puts his hand on it, the cracked hand that unmakes things.'],
    ['narr', 'And feels his sister. Warm, and everywhere, holding the city up.'],
    ['kai', '...Hana.', 'grief'],
    ['kai', 'If I break it, she goes. And so do a hundred thousand people behind it.', 'sad']];
  T.crown = [['bg', 'c3-gallery'], ['show', 'noor', 'smile', 'left'],
    ['narr', 'On the cathedral steps the twelfth Saint is crowned: a girl from our world in a borrowed dress, about Hana\'s age.'],
    ['noor', 'I\'m Noor. Noor Haddad. I worked in a bookshop. Is that... are you from home too?', 'smile'],
    ['narr', 'For her first week she thought being a Saint was the best thing that had ever happened to her. By now she knows what the Drawing is.'],
    ['noor', 'It\'s fine. It\'s an honour. That\'s what Saints say.', 'smile']];
  T.crown2 = [['bg', 'c3-gallery'], ['show', 'selvaria', 'cold', 'left'], ['show', 'aurelian', 'grief', 'right'],
    ['selvaria', 'Kai Mercer. Out of the Abyss again. Before you shout: one girl a decade, against a hundred thousand lives. Do the sum.', 'cold'],
    ['narr', 'Princess Selvaria governs from the gallery as Freya\'s regent. Cold, brilliant, and honest about the math.'],
    ['narr', 'Below her, Sir Aurelian, the Hero, who performs the Drawing every night and weeps every night.'],
    ['aurelian', '...', 'grief'],
    ['narr', 'Eleven names are scratched inside his gauntlet. He has started on the twelfth.']];
  T.offer = [['bg', 'c3-cathkitchen'], ['show', 'freya', 'neutral', 'left'], ['show', 'kai', 'neutral', 'right'],
    ['freya', 'Cook for me, Kai? Just an omelette. I\'ve missed your omelettes.', 'neutral'],
    ['kai', 'Yes, chef.', 'neutral'],
    ['freya', 'Yes, chef. Ha. I can lift her out of the barrier, love. Every bit of her. And I\'ll hold Halcyon up myself, so nobody else has to. Free.', 'neutral'],
    ['kai', 'I\'ll think about it.', 'neutral'],
    ['narr', 'He\'s lying. He doesn\'t know which way.']];
  T.sure = [['bg', 'c3-square'], ['show', 'dutch', 'anger', 'left'], ['show', 'kai', 'anger', 'right'],
    ['dutch', 'Break it. Tonight. Get that girl out before they draw from her again.', 'anger'],
    ['kai', 'It\'s not my call. It\'s hers.', 'anger'],
    ['dutch', 'That\'s cowardice, Kai.', 'stone'],
    ['kai', 'You held a kid over a rail because you were sure.', 'anger'],
    ['narr', 'Dutch hits him. Later Mira patches them both, and won\'t speak to either.']];

  // ---------- Camp ----------
  T.wen = [['bg', 'c3-camp'], ['show', 'wen', 'smile', 'left'],
    ['narr', 'Grandma Wen, who cached her face in 1987 and never set an expiry, comes down from the Granaries with the party.'],
    ['wen', 'Freya had me serving whatever was asked for last and forgetting the rest. That\'s no way to run a pantry, dears.', 'neutral'],
    ['wen', 'Keepsakes on the shelves, ranked. Warm bread. The Cache Café is open.', 'warm']];
  T.jar = [['bg', 'c3-camp'], ['show', 'freya', 'neutral', 'left'], ['show', 'kai', 'neutral', 'right'],
    ['freya', 'A gift, love. A single strand of her, in a jar. Warm, see?', 'neutral'],
    ['freya', 'A little piece of her. A sample. There\'s more where that came from.', 'warm'],
    ['narr', 'It\'s real. Kai puts it on the shelf over the stove, and doesn\'t look at it.']];
  T.aurelian = [['bg', 'c3-camp'], ['show', 'aurelian', 'tired', 'left'], ['show', 'kai', 'anger', 'right'],
    ['narr', 'Sir Aurelian comes to camp once, at night, without his armour.'],
    ['aurelian', 'I know the cathedral\'s records. I know they were changed. Let me help you. Once.', 'tired'],
    ['kai', 'You drew from her. Every night.', 'anger'],
    ['aurelian', 'I did. Let me help you anyway.', 'grief'],
    ['narr', 'Kai can barely stand to take it. He takes it. Mira watches him not look at the jar.']];

  // ---------- The bottom of the Abyss ----------
  T.ash = [['bg', 'c3-abyss'], ['show', 'ash', 'laugh', 'left'], ['show', 'kai', 'neutral', 'right'],
    ['narr', 'At the bottom of the Abyss: Mother Ash, the seventh Saint, who burned out and was thrown down long ago.'],
    ['ash', 'Ha! The cook! Back down my hole! Sit. Sit, boy.', 'laugh'],
    ['ash', 'Nobody ever asked me, you know. Not once. Not the regent, not the Hero, not the city. They told me I\'d agreed.', 'sad'],
    ['kai', '...Nobody asked Hana either. Nobody\'s asked Noor.', 'grief'],
    ['narr', 'Kai has spent the chapter deciding what to do with Hana and with Noor. Nobody has asked either of them.']];
  T.ash2 = [['bg', 'c3-abyss'], ['show', 'ash', 'amused', 'left'], ['show', 'kai', 'shock', 'right'],
    ['ash', 'Show me that page you carry. Her sum. Read it like a cook, not a mourner.', 'amused'],
    ['ash', 'The barrier was built to take a day a year from everyone. Spread across the whole city. Nobody throttled.', 'neutral'],
    ['ash', 'Three hundred years they\'ve been drawing from one key.', 'sad'],
    ['kai', 'A day a year. From everyone.', 'shock'],
    ['narr', 'She won\'t come up. She\'s still in love with Aurelian, and she won\'t be seen like this.']];

  // ---------- The choice ----------
  T.tellher = [['bg', 'c3-square'], ['show', 'mira', 'warm', 'left'], ['show', 'kai', 'grief', 'right'],
    ['mira', 'That prayer. The one you said every night for a year.', 'warm'],
    ['kai', '"Tell her I didn\'t leave." Nobody delivered it.', 'grief'],
    ['mira', 'So deliver it yourself, love. Put your hand on it, and don\'t break anything.', 'warm'],
    ['kai', 'Hana. I didn\'t leave. I was in the Abyss. I didn\'t leave.', 'grief'],
    ['narr', 'Whatever is left of Hana hears him.']];
  T.asknoor = [['bg', 'c3-gallery'], ['show', 'noor', 'neutral', 'left'], ['show', 'kai', 'neutral', 'right'],
    ['narr', 'For the first time in his life, Kai asks instead of deciding.'],
    ['kai', 'Noor. What do you want?', 'neutral'],
    ['noor', 'Nobody\'s asked me that since I got here.', 'shock'],
    ['noor', 'I want to go home. Can I?', 'sad']];
  T.speech = [['bg', 'c3-square'], ['show', 'kai', 'neutral', 'right'],
    ['narr', 'Saint\'s Day. Kai stands up in the square and reads Hana\'s speech, the one she never got to give, from her notes.'],
    ['kai', '"The barrier was built to take a day a year from each of us. Three hundred years ago it was rewritten to take everything from one girl."', 'neutral'],
    ['kai', '"Always a stranger, so we\'d never have to look. I\'m asking you to look."', 'neutral'],
    ['kai', '"Share it. A day a year each. That\'s all it ever cost." ...That\'s hers. I\'m just reading it.', 'grief']];
  T.argue = [['bg', 'c3-square'], ['show', 'baker', 'neutral', 'left'], ['show', 'lord', 'neutral', 'right'],
    ['narr', 'The city argues.'],
    ['baker', 'A day a year? I lose more than that to proving dough. Yes.', 'neutral'],
    ['lord', 'No. Absolutely not. We were promised.', 'neutral'],
    ['child', 'Does it hurt?', 'neutral'],
    ['narr', 'Sir Aurelian, who has taken from twelve girls, puts his hand up first.']];
  T.unmake = [['bg', 'c3-square'], ['show', 'kai', 'grief', 'right'],
    ['narr', 'Kai puts his hand on the barrier and unmakes the rewrite. It goes back to what it was built to be: a day a year, from everyone.'],
    ['narr', 'Noor walks out of the cathedral in her own clothes.'],
    ['narr', 'The last of Hana goes with it. Kai feels her go. She isn\'t afraid.'],
    ['kai', 'Bye, boss.', 'grief']];
  T.leave = [['bg', 'c3-square'], ['show', 'kai', 'grief', 'right'], ['show', 'noor', 'sad', 'left'],
    ['narr', 'Kai takes his hand off the barrier. Hana stays in it. Noor stays Saint.'],
    ['kai', 'I\'ll come back with root. I promise. I\'ll come back.', 'grief'],
    ['noor', 'People keep promising me things up here.', 'sad']];
  T.uptima = [['bg', 'c3-camp'], ['show', 'uptima', 'neutral', 'left'], ['show', 'kai', 'neutral', 'right'],
    ['uptima', '"Tell her I didn\'t leave." There are three hundred and sixty-five copies of it in my backlog. One a night.', 'neutral'],
    ['narr', 'She reads one. Then she says there\'s another prayer filed beside them, from the night before Saint\'s Day, in the same queue.'],
    ['uptima', 'Hana\'s. "Let my brother be alive. He\'s late. He\'s always late."', 'sad'],
    ['narr', 'The two messages sat next to each other for a year and never reached each other.']];
  T.clean = [['bg', 'c3-camp'], ['show', 'kai', 'neutral', 'right'], ['show', 'dutch', 'tired', 'left'],
    ['narr', 'Dawn. Kai goes outside to clean the camp kitchen. It\'s already clean: scrubbed spotless, every pot hung by size.'],
    ['narr', 'That\'s Dutch\'s apology.'],
    ['kai', 'You missed a spot.', 'smirk'],
    ['dutch', 'No I didn\'t.', 'neutral'],
    ['narr', 'He didn\'t.']];
  T.freed = [['bg', 'c3-camp'], ['show', 'noor', 'smile', 'left'],
    ['narr', 'Halcyon takes back its grants. Its market moves down to the camp, run from Kai\'s kitchen beside Wen\'s café.'],
    ['noor', 'I want to see what a camp of people who don\'t want anything from me looks like.', 'smile'],
    ['narr', 'Sir Aurelian goes back down into the Abyss, to bring Mother Ash up. It will take him the rest of the game.'],
    ['narr', 'On the shelf over the stove, Freya\'s jar has gone dark.']];

  // ---------- The reckoning ----------
  T.reckon = [['bg', 'c3-square'], ['show', 'selvaria', 'unreadable', 'left'], ['show', 'kai', 'neutral', 'right'],
    ['narr', 'Kai doesn\'t unmake her. He hands her the chalk, in front of the city.'],
    ['selvaria', 'One girl a decade, or a day a year from everyone. It always added up both ways. I chose the one nobody had to watch.', 'unreadable'],
    ['kai', 'Then watch. Give your day first.', 'neutral'],
    ['narr', 'She does. Somewhere far above, Freya\'s blessing lets go of her.']];
})();
