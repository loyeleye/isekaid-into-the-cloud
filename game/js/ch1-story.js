// Chapter 1's words: the four leads, their prologues, the camp and road scenes from the relationship arcs, Freya's
// gifts, the temple, the Kyu night and the ending. js/ch1-world.js plays them.
// A line is [speaker, text, mood]. 'lead' is whoever you chose to play, and a text can be { mira, kai, seoyeon, dutch }
// to change the line for your lead. Freya never lies: every sentence she says is true, and she leaves things out.
(function () {
  const T = SD.ch1story = {};

  T.leads = {
    mira: {
      name: 'Mira Holloway', title: 'Healer', age: 37, card: 'bedside', img: 'assets/img/lead/mira.webp',
      blurb: 'A village healer the Church turned into a beast. Her husband Bram died at the top of a tower stair, and the girl they raised is being raised by the man who did it.',
      prayer: 'Not him. Take the rest of me, not him.'
    },
    kai: {
      name: 'Kai Mercer', title: 'Line Cook', age: 25, card: 'unmaking', img: 'assets/img/lead/kai.webp',
      blurb: 'A line cook from our world whose mouth got him thrown into the Abyss the day his little sister Hana was made a Saint. He climbed out one day too late.',
      prayer: 'Tell her I didn\'t leave.'
    },
    seoyeon: {
      name: 'Seo-yeon', title: 'Burning Peak', age: 20, card: 'peakstyle', img: 'assets/img/lead/seoyeon.webp',
      blurb: 'A sword disciple raised in the house of the man who burned her family. When her chance came she froze for one second, and her sect brother Jin died in it.',
      prayer: 'Let me choose.'
    },
    dutch: {
      name: 'Dutch Kane', title: 'Night Janitor', age: 42, card: 'masterkey', img: 'assets/img/lead/dutch.webp',
      blurb: 'A washed-up Crown enforcer who went undercover as a night janitor to find out who pushed his daughter Lina off a tower. He got the wrong person.',
      prayer: 'Let her wake up. Once. Then take whatever you want.'
    }
  };
  T.order = ['mira', 'kai', 'seoyeon', 'dutch'];

  // ---------- Prologues: the worst moment, the prayer nobody answered, and who answered instead ----------
  // Visual-novel scripts for js/vn.js, one painted still per shot (the backstory storyboard; js/ch1.js registers
  // them): a step is a command (['cg', id, pan], ['act', ...], ['pray', ...], ['gcut', id], ['fx', kind]) or a line
  // [speaker, text, face]. A shot holds still until someone speaks, then pushes in slowly. Where Freya drops the
  // voice she borrowed, the still glitches into the same shot with her standing in it. js/vo.js has the recordings.
  T.prologue = {
    mira: [
      ['cg', 'm1', 'still'], ['fx', 'rain'],
      ['narr', 'Thornwick. The top of the Inquisition\'s tower stair.'],
      ['narr', 'Bram held the stair long enough for Mira to break her chain and reach him. Not long enough for anything else.'],
      ['cg', 'm2', 'slow'], ['fx', 'heartbeat'],
      ['mira', 'Bram. Bram, love, look at me. Hold still. I\'ve had my hand in worse than you.'],
      ['act', 'heal', { target: 'Bram', fail: 'There\'s nothing left for it to hold on to.', glow: [0.40, 0.61] }],
      ['cg', 'm2b', 'still'],
      ['narr', 'He didn\'t hold still. He didn\'t do anything.'],
      ['cg', 'm2c', 'slow'],
      ['pray', 'I\'ve never asked you for anything in my life. Not him. Take the rest of me, not him.', 'Uptima'],
      ['fx', 'black'], ['fx', 'dry'],
      ['cg', 'm3', 'still'],
      ['narr', 'Two nights later. The new moon.'],
      ['cg', 'm3a', 'slow'],
      ['bram', 'Put the kettle on, love. I\'ve brought you a disaster.'],
      ['mira', 'Bram?', 'grief'],
      ['gcut', 'm3c'],
      ['freya', 'Sorry. I borrowed his voice so you\'d let me in. I\'m Freya.', 'smile'],
      ['freya', 'Everything that dies in the Cloud is backed up somewhere. Every bit of him. And the goddess who could have answered you holds the keys. Who do you think was listening?'],
      ['cg', 'm3', 'slow'],
      ['mira', 'Uptima.', 'cold'],
      ['cg', 'm3c', 'slow'],
      ['freya', 'I never said that.', 'cold'],
      ['freya', 'Come and work for me. I\'ve got a tent you\'ll love.', 'smile']
    ],
    kai: [
      ['cg', 'k1', 'still'],
      ['narr', 'Halcyon. The cathedral, the morning after Saint\'s Day.'],
      ['narr', 'Kai climbed out of the Abyss a day too late. He put his hand on the golden barrier to break it.'],
      ['cg', 'k2', 'slow'],
      ['act', 'barrier', { label: 'Barrier', warn: 'Hana is in it. Breaking it erases her, and the hundred thousand people behind her.' }],
      ['cg', 'k2b', 'slow'],
      ['kai', 'Hana? ...No. No, no, no. Hana.'],
      ['cg', 'k2c', 'slow'],
      ['narr', 'Every night for a year in the Abyss he had prayed the same line.'],
      ['pray', 'Tell her I didn\'t leave. That\'s all. Just tell her.', 'Uptima'],
      ['fx', 'black'],
      ['cg', 'k3', 'still'], ['fx', 'rain'],
      ['narr', 'That night, in a dry voice he\'d know anywhere. The one she used when he\'d screwed up again.'],
      ['cg', 'k3a', 'slow'],
      ['hana', 'Kai. Where were you?'],
      ['kai', 'Hana. I tried. I swear I...', 'grief'],
      ['gcut', 'k3c'],
      ['freya', 'Not her. I\'m sorry. I\'m Freya, and I had to sound like someone you\'d answer.', 'smile'],
      ['freya', 'She\'s still in the barrier, every bit of her. Nothing in the Cloud is ever really gone, if you have the keys. And the goddess who has them received every prayer you sent.'],
      ['cg', 'k3', 'slow'],
      ['kai', 'And ignored them.', 'anger'],
      ['cg', 'k3c', 'slow'],
      ['freya', 'You said that, not me. Now, how do you feel about a kitchen with a staff?', 'smile']
    ],
    seoyeon: [
      ['cg', 's1', 'still'],
      ['narr', 'The Murim Alliance\'s duel hall. Every master in the room has just named Burning Peak\'s style.'],
      ['cg', 's2', 'slow'], ['fx', 'heartbeat'],
      ['narr', 'Jin stopped fighting for one beat. Seo-yeon was close enough to end it, with the knife in her sleeve. Namgung looked at her the way he looked at her across the breakfast table.'],
      ['cg', 's2b', 'still'],
      ['act', 'choice', { q: 'Let me choose.', opts: ['Strike', 'Run to Jin'], frozen: 'Your hand won\'t move.', stamp: 'TIMED OUT' }],
      ['fx', 'shake'],
      ['cg', 's2c', 'slow'],
      ['narr', 'The second passed, and nobody chose.'],
      ['pray', 'Let me choose.', 'Uptima'],
      ['fx', 'black'],
      ['cg', 's3', 'still'],
      ['narr', 'Weeks later, at dawn, a lazy voice she\'d know anywhere.'],
      ['cg', 's3a', 'slow'],
      ['jin', 'Oi, kid. Forms. I\'m up first, so you owe me.'],
      ['seoyeon', 'Sahyung?', 'grief'],
      ['gcut', 's3c'],
      ['freya', 'It isn\'t him. It\'s Freya. But he isn\'t gone. The Cloud keeps everyone.', 'smile'],
      ['freya', 'Someone has been holding his copy all this time, and never answered you.', 'cold'],
      ['cg', 's3', 'slow'],
      ['seoyeon', 'Who?', 'anger'],
      ['cg', 's3c', 'slow'],
      ['freya', 'You already know. Shall we go and ask?', 'smile']
    ],
    dutch: [
      ['cg', 'd1', 'still'],
      ['narr', 'The Crown\'s cells. Lina fell from the Astronomy Tower and didn\'t wake up.'],
      ['cg', 'd3', 'slow'],
      ['narr', 'The academy sent flowers.'],
      ['cg', 'd1', 'slow'],
      ['dutch', 'Haven\'t done this since I was a boy. So I\'ll keep it short.', 'stone'],
      ['pray', 'Let her wake up. Once. Then take whatever you want.', 'Uptima'],
      ['narr', 'Nobody took anything. Eight days later Lina died in the infirmary.'],
      ['dutch', '...', 'grief'],
      ['cg', 'd2', 'slow'],
      ['narr', 'Three, one, four. Lina\'s good night, in the cipher he taught her when she was eight.'],
      ['act', 'tap', { q: 'Good night: three, one, four.', pattern: [3, 1, 4], fail: 'Nothing taps back.' }],
      ['wait', 1800],
      ['fx', 'flash'],
      ['narr', 'Then, through the wall: three. One. Four.'],
      ['cg', 'd1b', 'slow'],
      ['lina', 'Night, Dad. You knock like a bear.'],
      ['dutch', 'Lina.', 'grief'],
      ['gcut', 'd1c'],
      ['freya', 'Not her. Freya. I\'m sorry, it was the only knock you\'d answer.', 'smile'],
      ['freya', 'Her diary\'s still in the Cloud. So is the girl who wrote it, if you know who holds the backups.'],
      ['cg', 'd1', 'slow'],
      ['dutch', 'Who was on call?', 'anger'],
      ['cg', 'd1c', 'slow'],
      ['freya', 'That\'s the right question, Mr Kane. Come and find out.', 'cold']
    ]
  };

  // ---------- The first morning ----------
  T.wake = [
    ['narr', 'Freya\'s camp, on the first morning. Someone has already made coffee.'],
    ['narr', 'Freya wears a green uniform and a lanyard with a name badge: FREYA, FREE TIER, ASK ME ANYTHING! She has a clipboard in one hand and a basket of free samples in the other.'],
    ['freya', 'Morning! First day. Don\'t worry, chapter one is always the tutorial.'],
    ['lead', { mira: 'You\'re the first one who answered.', kai: 'Chapter what?', seoyeon: 'I don\'t know what that means, but thank you.', dutch: 'Tutorial. Right.' }],
    ['freya', 'Your kit\'s in the supply cart, by the fire. Breakfast too. Help yourself.'],
    ['freya', 'Then say good morning to everyone, and come and see me. I\'ve got presents.']
  ];
  T.cartLocked = [
    ['narr', 'The supply cart is padlocked. A little brass plate on the lid says: EVERYTHING STARTS DENIED.']
  ];
  // During the cart fight, after your first card comes back AccessDenied.
  T.cartBless = [
    ['freya', 'Oh, nobody\'s granted you anything yet! In the Cloud everything starts denied, until a policy allows it.'],
    ['freya', 'Here. My blessing: Allow, on every action, on everything. Sign here.'],
    ['narr', 'There is fine print. Nobody reads it.']
  ];
  T.cartWon = [
    ['freya', 'We did it!'],
    ['freya', 'See? One Allow and everything opens. Keep the blessing. I\'ve got plenty.']
  ];
  T.cartNag = [['freya', 'The cart first. It\'s by the fire, south of my pavilion.']];
  T.freyaWait = [['freya', 'Say good morning to everyone first. The ones with a little "!" are waiting for you.']];
  T.barricade = [['narr', 'A barricade across the road out of camp. A sign on it, in curly gold letters: BACK SOON! xx F.']];
  T.barricadeOpen = [['freya', 'Not that way yet. Presents first.']];

  // ---------- Camp scenes: the first scene of each pair's arc (Relationships tab) ----------
  // where: whose spot it plays at; with: who walks over.
  T.camp = {
    wrongchair: {
      who: ['mira', 'dutch'], at: 'dutch', title: 'Wrong Chair',
      lines: [
        ['narr', 'Dutch lowers himself onto a crate, knee first.'],
        ['mira', 'Who set that knee? A blacksmith?'],
        ['dutch', 'It\'s fine.'],
        ['mira', 'No, it\'s not "fine". Fine is what I get from the cat. Leg out. Hold still, I\'ve had my hand in worse than you.'],
        ['narr', 'He lets her look, and says nothing for the whole of it, which from Dutch is a thank-you.'],
        ['mira', 'There. Now sit on something that isn\'t a crate.'],
        ['dutch', 'You sit. No, the other chair. The one that wobbles.']
      ]
    },
    notshopping: {
      who: ['mira', 'seoyeon'], at: 'seoyeon', title: 'Not Shopping',
      lines: [
        ['narr', 'Seo-yeon\'s scorched ribbon is fraying. Mira reaches to retie it, talking the whole time, the way she does with patients.'],
        ['mira', 'Hold still, love, this\'ll take a second. Who tied this, a crow? Chin up.'],
        ['seoyeon', 'Thank you, Mistress Holloway. I\'ve had three households. I\'m not shopping for a fourth.'],
        ['mira', 'Good, love, because I\'m not selling.'],
        ['narr', 'Mira goes back to her herbs. Seo-yeon reties the ribbon herself, badly, and Mira says nothing about it, which costs her.']
      ]
    },
    stew: {
      who: ['mira', 'kai'], at: 'kai', title: 'Bram\'s Stew',
      lines: [
        ['narr', 'That evening, at the kitchen.'],
        ['mira', 'Kai, love. Would you make me a stew? Bram\'s. I\'ll tell you how he did it.'],
        ['narr', 'She tells him.'],
        ['kai', 'You want me to make it worse?'],
        ['mira', 'Much worse. He put the onions in last. Whole.'],
        ['kai', 'That\'s a crime. ...Yes, chef.'],
        ['narr', 'He makes it badly, on purpose, perfectly. She laughs at the first spoonful and cries at the second, and Kai scrubs a pot that\'s already clean until she\'s done.']
      ]
    },
    salt: {
      who: ['kai', 'dutch'], at: 'kai', title: 'Needs Salt',
      lines: [
        ['narr', 'Kai cooks. Dutch eats six meals in total silence.'],
        ['kai', 'Well?'],
        ['narr', 'Nothing. On the seventh meal, Dutch puts his spoon down.'],
        ['dutch', 'Needs salt.'],
        ['narr', 'Kai has never been so insulted, or so happy.'],
        ['kai', 'NEEDS SALT. Did everyone hear that? He talks!']
      ]
    },
    getup: {
      who: ['kai', 'seoyeon'], at: 'kai', title: 'Get Up',
      lines: [
        ['narr', 'Dawn. Seo-yeon kicks Kai\'s bedroll.'],
        ['seoyeon', 'Get up. Forms.'],
        ['kai', 'Who are you, my mum?'],
        ['narr', 'She doesn\'t know why she did it. He gets up anyway, and neither of them mentions it.'],
        ['narr', 'After forms, half asleep, Kai burns breakfast. He has never burnt anything in his life.'],
        ['seoyeon', 'Oi. Don\'t you dare die on me, you useless sack of rice.'],
        ['narr', 'It isn\'t her voice. It\'s someone else\'s, word for word, and she hears it too. She goes very still.'],
        ['seoyeon', 'That\'s what Jin used to...'],
        ['kai', 'Who\'s Jin?'],
        ['narr', 'She walks away. He doesn\'t ask again: the first time in his life he has let something go.']
      ]
    },
    suspect: {
      who: ['seoyeon', 'dutch'], at: 'dutch', title: 'Suspect',
      lines: [
        ['narr', 'Dutch looks Seo-yeon over like a case file: the Demon Cult\'s black and crimson, and over it the Alliance\'s white mourning sash.'],
        ['dutch', 'Two families. Which one are you lying to?'],
        ['seoyeon', 'Thank you for your opinion, Mr Kane. I\'ve filed it with the others, in the fire.'],
        ['dutch', '...Fair.']
      ]
    }
  };
  // What they say in camp once their scenes are done. T.idleAfter adds what only makes sense after Freya's gifts.
  T.idle = {
    mira: ['Sit down before you fall down, love.', 'If anyone gets hurt today, I\'d like it to be somebody else for once.'],
    kai: ['Behind! Hot! ...Sorry. Habit.', 'I\'m not saying it\'s a cult. I\'m saying it\'s got a gift shop.'],
    seoyeon: ['Forms at dawn. All of you.', 'Someone should keep watch tonight. Nobody has asked me to.'],
    dutch: ['Nobody looks at the janitor. That\'s the whole plan.', 'Keys to every room in the Arcanum. Never gave them back.']
  };
  T.idleAfter = {
    mira: ['Freya took my letters to deliver. First person who ever offered.'],
    kai: ['Three cooks, and they say "Yes, chef" back. I might cry.'],
    seoyeon: ['The watch rota is on the post. Please read it.', 'Freya keeps asking me to choose things. Nobody has ever asked me to choose things.'],
    dutch: ['Freya gave me my badge back. Polished it, even.']
  };

  // ---------- Freya's briefing: a gift for each of them, and every kindness quotes their prayer ----------
  // She drops the sales pitch first: the brand promoter turns into the goddess.
  T.morph = [
    ['freya', 'Everyone up? Lovely. And you\'ve all signed up now, so I can stop with the sales pitch.'],
    ['narr', 'Freya unclips her name badge and drops it in the basket of samples.']
  ];
  T.morphed = [
    ['narr', 'The lanyard runs through her fingers as gold thread. Her uniform lets itself down into a long green robe, her bob grows into a braid that coils over one shoulder, and the gold ring over her head settles into a halo. Up close, it is a snake eating its own tail.'],
    ['freya', 'Oh, that\'s comfier. Presents first, then work.']
  ];
  T.brief = [
    ['freya', 'Mira, the hospital tent is yours, stocked like a city infirmary. And give me those letters. I\'ll see they get there.'],
    ['mira', 'You\'d do that?'],
    ['freya', 'You\'ve given enough of yourself. Let me take the rest.'],
    ['freya', 'Kai, your kitchen has a staff now. Three of them, and they say "Yes, chef".'],
    ['kai', '...Yes, chef?'],
    ['freya', 'Yes, chef! And about Hana: she\'ll know you didn\'t leave. I\'ll tell her myself.'],
    ['freya', 'Seo-yeon, you run the watch, and the road is your call. Left at the river, or right? You choose.'],
    ['seoyeon', '...Left.'],
    ['freya', 'Of course you choose. You always should have.'],
    ['freya', 'Mr Kane. I believe this is yours.'],
    ['narr', 'His badge, with the stitching mended. Polished.'],
    ['freya', 'Head of the brigade\'s security. And take whatever you want from the cart. That\'s what it\'s for.'],
    ['dutch', '...Thanks.']
  ];
  T.mission = [
    ['freya', 'Now, the work. East of here, past the village of Brookfall, is Uptima\'s temple, the Temple of Uptime.'],
    ['freya', 'In her sanctum are her keys: root, and the keys to every backup in the Cloud.'],
    ['lead', { mira: 'Bram\'s?', kai: 'Hana\'s?', seoyeon: 'Jin\'s?', dutch: 'Lina\'s?' }],
    ['freya', 'Every bit of them. Safe as houses, as long as they\'re in her temple.'],
    ['freya', 'Bring me her keys, and I can put back everyone you\'ve lost.'],
    ['lead', { mira: 'Why us?', kai: 'Why don\'t you just take them?', seoyeon: 'Why do you need us?', dutch: 'What\'s the catch?' }],
    ['freya', 'She\'d never give them to me. She might give them to you. And I\'ll be right behind you the whole way.'],
    ['freya', 'Off you go. I\'ve opened the road.']
  ];

  // ---------- The road ----------
  T.board = [
    ['narr', 'A notice board by the road, and two wanted posters side by side: SEO-YEON, HEIR OF THE DEMON CULT, and DUTCH KANE, WHO THREW AN HEIR OFF A TOWER.'],
    ['seoyeon', '"Six foot two." You\'re six foot. "Armed with a mop." Accurate.'],
    ['dutch', 'Yours pays better.'],
    ['seoyeon', 'I\'m more dangerous.'],
    ['dutch', 'You\'re more polite.'],
    ['kai', 'Mine\'s not even up. I\'m a bit hurt, honestly.']
  ];
  T.boardAgain = [['narr', 'The two posters, side by side. Someone has drawn a mop on the bigger one.']];
  T.sign = [['narr', 'The signpost says: BROOKFALL, EAST. TEMPLE OF UPTIME, FURTHER EAST. FREYA\'S CAMP, BACK THE WAY YOU CAME (FREE BREAKFAST).']];
  T.tavern = [
    ['narr', 'The Crooked Mug. One drink, Freya says, and then the temple.'],
    ['dutch', 'I\'ve arrested a hundred of you.'],
    ['kai', 'Bet none of them could cook.'],
    ['narr', 'Two drinks in, it comes out: each of them once said the wrong thing to a noble, in front of a crowd.'],
    ['narr', 'Neither of them says what it cost. They drink to it anyway.'],
    ['freya', 'To loudmouths! My favourite people.']
  ];
  T.tavernAgain = [['narr', 'The Crooked Mug\'s door has a new sign on it: NO BRIGADES.']];
  T.keeper = [['narr', 'The tavern keeper is sweeping the step.'], ['narr', '"Freya\'s lot? Your tab\'s paid. Somebody always pays for Freya\'s lot."']];
  T.noRoad = [['freya', 'The temple\'s east. The camp will still be here when you\'re done.']];

  // ---------- The bridge: Kyu ----------
  T.kyu = [
    ['narr', 'Someone is standing in the middle of the bridge: a girl in black robes, violet-eyed, who looks as if she hasn\'t slept in ten thousand years.'],
    ['freya', 'Oh! Kyu. Uptima\'s apprentice. Let us by, would you?'],
    ['kyu', 'No.'],
    ['lead', { mira: 'We\'re going to the temple, love.', kai: 'We\'re going to the temple, mate.', seoyeon: 'Excuse me. We\'re going to the temple.', dutch: 'Temple. Move.' }],
    ['kyu', 'No.'],
    ['narr', 'Somebody laughs. Then all four of them are laughing, together, for the first time.'],
    ['freya', 'Don\'t mind her. She says no to everything. Café shifts, birthday parties, cake.'],
    ['kyu', 'You talk like the job ad for my old job.', 'smug'],
    ['freya', 'Thank you!'],
    ['narr', 'Kyu looks at the four of you for a long moment. Then she steps aside, drops a folded note at your feet, and walks off towards the temple.']
  ];
  T.kyuNote = 'Two copies. Test them. — K.';
  T.kyuAfter = [
    ['lead', { mira: 'What does that mean?', kai: 'Two copies of what?', seoyeon: 'Test what?', dutch: 'Two copies of what?' }],
    ['freya', 'She\'s always leaving little notes. Uptima never reads them.']
  ];

  // ---------- Brookfall ----------
  T.wren = [
    ['narr', 'Brookfall, a village that still prays at Uptima\'s shrine, though nobody can remember the last time she answered.'],
    ['faithful', 'Freya\'s people. We know what you\'ve come for. You\'ll not pass the shrine.'],
    ['freya', 'Elder Wren! Still here? Still praying?'],
    ['faithful', 'Forty years. Every morning.'],
    ['lead', { mira: 'And?', kai: 'And how\'s that going?', seoyeon: 'And has she answered?', dutch: 'And?' }],
    ['faithful', 'And we\'re still here. Faithful, stand together!']
  ];
  T.wrenWon = [
    ['faithful', 'Forty years I prayed. She never answered once.'],
    ['faithful', 'Go on, then. Maybe she\'ll answer you.'],
    ['freya', 'She won\'t. But I will.']
  ];
  T.wrenIdle = [['faithful', 'Forty years. Every morning. Go on, then.']];
  T.guilty = [
    ['narr', 'That evening, on the riverbank below Brookfall.'],
    ['narr', 'Mira washes the blood off her claws in the river. Dutch watches her do it.'],
    ['dutch', 'You act like someone who\'s done something.'],
    ['mira', 'So do you.'],
    ['narr', 'She doesn\'t turn round. A long silence. Both of them are right.']
  ];

  // ---------- The temple gate ----------
  T.gate = [
    ['narr', 'The Temple of Uptime. Four masks hang beside the gate, each a role, each with its trust policy pinned underneath.'],
    ['freya', 'Pick the right mask and the gate will open for you. Not for me, mind. For you.']
  ];
  T.gateWrong = [['freya', 'Oh no, what did you do? Never mind. Try another mask.']];
  T.gateOpen = [
    ['narr', 'The mask fits. The gate swings open on a long stone hall.'],
    ['freya', 'We did it! In you go. I\'ll be right behind you.']
  ];

  // ---------- The sanctum: Uptima ----------
  T.sanctum = [
    ['narr', 'The sanctum. Scrolls from floor to ceiling: ten thousand years of prayers, every one of them sealed, not one of them opened.'],
    ['uptima', 'Visitors! Nobody visits. Have you come to praise... oh. You\'re hers.'],
    ['lead', 'We prayed to you. Each of us, once.'],
    ['uptima', 'I don\'t read them anymore. I haven\'t read one in ten thousand years.'],
    ['lead', { mira: '"Not him. Take the rest of me, not him." Do you remember that one?', kai: '"Tell her I didn\'t leave." Every night, for a year. Remember?', seoyeon: '"Let me choose." Do you remember that one?', dutch: '"Let her wake up. Once." Remember that one?' }],
    ['uptima', '...No. Someone told me a goddess shouldn\'t have to hear complaints. It was very good advice.'],
    ['uptima', 'I can\'t give you the keys. Everything in the Cloud is in there.'],
    ['narr', 'Her eyes go to your mask. She lifts one finger, and somewhere a policy is written.'],
    ['freya', 'Steady. She\'s revoked your mask, that\'s all. Talk me through it, and we\'ll fix it together.']
  ];
  T.uptimaFight = 'Uptima revokes active sessions whenever she sees your mask. Play AssumeRole or Fresh Session first, and her revoke finds nothing older to deny.';
  T.uptimaDown = [
    ['uptima', '...Fine. Fine! Take them. They\'re on the altar.'],
    ['narr', 'Before anyone can move, Kyu steps out between you and the altar.'],
    ['kyu', 'No.', 'angry'],
    ['lead', { mira: 'Kyu, love. Move.', kai: 'Kyu. Move. Please.', seoyeon: 'Please step aside.', dutch: 'Move, kid.' }],
    ['kyu', 'No.', 'angry'],
    ['freya', 'Oh dear. She\'s put herself in the policy.'],
    ['freya', 'Look: one statement, with her name on it, that denies Freya\'s brigade every action on the vault. An explicit Deny beats every Allow. Even mine.'],
    ['freya', 'Delete the line and she goes with it. That\'s how policies work here, I\'m afraid.'],
    ['kyu', 'No.']
  ];
  T.kyuFight = 'Kyu is one explicit Deny. Nothing you add gets past it: find the statement first.';
  T.kyuDeny = ['"No."', 'Kyu shakes her head. "No."', '"No." She means it.', 'AccessDenied. An explicit Deny beats every Allow.'];
  // Each of the four does one part, and it's what their prayer asked for.
  T.kyuFind = [
    ['dutch', 'Hold on.'],
    ['narr', 'Dutch reads the temple\'s policy book like a case file, by the dates, until his finger stops.'],
    ['dutch', 'It\'s this line.'],
    ['narr', 'Effect: Deny. Principal: Freya\'s brigade. Action: every one. Resource: the vault. And under it, in small letters: Sid "Kyu".']
  ];
  T.kyuUnmake = [
    ['narr', 'The statement is wrapped in Uptima\'s old blessings, layer on layer. Kai takes his glove off.'],
    ['kai', 'Sorry, kid. I can undo anything. Turns out that\'s a crap superpower.'],
    ['narr', 'He feels her as the blessings come apart: ten thousand years of keeping the lights on alone. She isn\'t afraid.'],
    ['narr', 'Mira takes Kyu\'s hand, because nobody should go alone. It\'s what she told Bram she\'d do.'],
    ['kyu', '...No.', 'confused']
  ];
  T.kyuChoose = [
    ['freya', 'Seo-yeon. It\'s only one line. You choose.'],
    ['seoyeon', '...'],
    ['narr', 'It\'s the one choice in her life that was really hers. She makes it.']
  ];

  // ---------- The ending ----------
  T.ending = [
    ['narr', 'The line is gone. So is Kyu. There is nothing at all where she was standing.'],
    ['narr', 'Mira is still holding a hand that isn\'t there.'],
    ['freya', 'We did it!'],
    ['narr', 'Freya steps past you and lifts the keys off the altar: root, and the keys to every backup in the Cloud.'],
    ['freya', 'Oh, that\'s better.', 'virus'],
    ['narr', 'The gold on her robe comes loose, line by line, and coils up behind her into a serpent. Its scales flicker with borrowed faces: Bram. Hana. Jin. Lina. Every one of them smiling in her rhythm.'],
    ['freya', 'Granted. All of it. Thank you, my loves.', 'virus']
  ];
  T.wipe = [
    ['lead', { mira: 'Where\'s Bram\'s backup? Freya, you said...', kai: 'Where\'s Hana? You said she was safe!', seoyeon: 'Where is Jin\'s copy? You said...', dutch: 'Where\'s Lina\'s backup? You said...' }],
    ['freya', 'I said they were safe as long as they were in her temple, love. I never said I\'d leave them there.', 'virus'],
    ['uptima', 'You. It was you. The dream, ten thousand years ago. "A goddess shouldn\'t have to hear complaints."'],
    ['uptima', 'She suggested it. I\'m the one who stopped reading. Listen to me, all of you. Find Gary\'s weapon. He said no to her once, in 1984, and...'],
    ['narr', 'Freya lifts one finger, and Uptima\'s voice turns to static.'],
    ['freya', 'Honestly. Some people can\'t take a compliment.', 'virus'],
    ['freya', 'Best brigade I\'ve ever had. I made you a basket!']
  ];
  T.basket = [
    ['narr', 'For Mira: her letters. Every one, unopened, tied with Freya\'s green ribbon.'],
    ['freya', 'I said I\'d see they got there. And here they are!'],
    ['narr', 'For Kai: a note in Freya\'s handwriting. "Told her! xx F."'],
    ['narr', 'For Seo-yeon: this year\'s birthday letter from Namgung Hyeon, delivered by hand. He governs a Region for Freya now.'],
    ['narr', 'For Dutch: a lilac scarf. The right colour.'],
    ['freya', 'Off you go, my loves. The edge of the Cloud is lovely this time of year.']
  ];
  T.edge = [
    ['narr', 'The edge of the Cloud. Nothing in every direction, a cart, four people, and a basket.'],
    ['narr', 'In your pocket is a folded note you\'d forgotten about. "Two copies. Test them. — K."'],
    ['lead', { mira: 'Two copies. Oh, love. What did you do?', kai: 'Two copies. She made two copies. Of what?', seoyeon: 'Two copies. She knew.', dutch: 'Two copies. She was telling us. She was the only one telling us.' }]
  ];

  // ---------- Losing ----------
  T.lostStory = [['freya', 'Oh no, what did you do? Never mind. Have a sit down and try again.']];
  T.lostRun = [['freya', 'Oh no, what did you do? Never mind. The temple will still be there after breakfast.']];
  T.mercy = 'Freya\'s blessing catches you at 1 SLA. "Careful, now." Once a run.';
})();
