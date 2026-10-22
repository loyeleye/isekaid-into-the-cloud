// Chapter 1's climb, in words: Coldstart at the foot of Mount Quota, the switchbacks and their puzzles, the Rest
// Stops, the cave mouth, the upper trail and the way onto the summit. js/ch1-mountain.js plays them.
// Lines are [speaker, text, face], as in js/ch1-story.js: 'lead' is whoever you play, and a text can be
// { mira, kai, seoyeon, dutch }. Freya never lies. She is neutral unless a line asks for a face, and smiles rarely.
(function () {
  const T = SD.ch1trek = {};

  // ---------- Coldstart ----------
  T.wake = [
    ['narr', 'Coldstart, a village at the foot of Mount Quota, on the first morning. The wind comes down off the mountain and goes straight through your coat.'],
    ['narr', 'A woman in a green uniform is waiting by the Free Tier welcome hut. Lanyard, clipboard, name badge: FREYA, FREE TIER, ASK ME ANYTHING!'],
    ['freya', 'Morning. First day. Chapter one is always the tutorial, so don\'t worry.', 'smile'],
    ['lead', { mira: 'You\'re the first one who answered.', kai: 'Chapter what?', seoyeon: 'I don\'t know what that means, but thank you.', dutch: 'Tutorial. Right.' }],
    ['freya', 'My camp is at the top. All of it: hot food, beds, presents. We walk up together.'],
    ['narr', 'Everyone looks up. The mountain goes on for a long time, and then it goes into cloud.'],
    ['freya', 'Your kit is in the supply cart. Help yourselves, and then we\'ll go.']
  ];
  T.cartWon = [
    ['freya', 'There. One Allow, and everything opens.'],
    ['freya', 'Keep it. It\'s AdministratorAccess: Allow, every action, every resource. I\'ve got plenty.', 'smile'],
    ['dutch', 'Every action.'],
    ['freya', 'Every action. It will ask you something each time you use it, that\'s all. What you actually needed. It\'s good practice.'],
    ['narr', 'There is fine print. It says Principal: Freya. Nobody reads it.']
  ];
  T.cartNag = [['freya', 'The cart first. It\'s by the hut.']];
  T.board = [
    ['narr', 'A notice board at the trailhead. Under TRAIL RULES there is exactly one thing pinned: a policy statement, in JSON.'],
    ['freya', 'Everything here is written like that. Read it like a sentence: who may do what, to what, and only if.']
  ];
  T.boardWon = [['freya', 'Every part has to match, or the statement doesn\'t count. You\'ll see that a lot on the way up.']];
  T.map = [
    ['narr', 'A painted trail map. Freya taps four places on it with her pen, bottom to top.'],
    ['freya', 'How to read a policy, down here. How a request is decided, in the switchbacks. Other people\'s rules, and the "only ifs", on the ledges. Masks, at the top.'],
    ['freya', 'Four things. If you know those four, you know how the Cloud says yes and no.'],
    ['kai', 'And the cave halfway up?'],
    ['freya', 'Practice.']
  ];
  T.gateShut = [['freya', 'Kit first, then the board. Then we climb.']];
  T.setOff = [
    ['freya', 'Up we go. Stay on the path; the wind gets ideas.'],
    ['narr', 'The trail leaves the village and starts to climb, back and forth across the face of the mountain.']
  ];

  // ---------- The ranger's locker ----------
  T.locker = [
    ['narr', 'A ranger\'s locker at the first bend, bolted to the rock. ROPE INSIDE, says a label. A policy is screwed to the door.'],
    ['dutch', 'We\'re allowed to take things out of it. Says so right there.'],
    ['seoyeon', 'Then what\'s in it?']
  ];
  T.lockerPredict = { q: 'Your policy allows s3:GetObject on arn:aws:s3:::trail-locker/*. Can you see the list of what\'s inside?', opts: ['Yes, the policy covers the locker', 'No, listing is something else'], a: 1,
    right: 'Right. You can take an item out if you already know its name, but listing is a different action, on a different resource.',
    wrong: 'That\'s the trap most people fall into. The policy covers the things in the locker, not the locker. Listing is a different action on the bucket itself.' };
  T.lockerWon = [
    ['narr', 'The door lists its contents on a little brass plate: rope.txt, pitons.txt, snacks.txt (EMPTY).'],
    ['kai', 'Somebody ate the snacks.'],
    ['freya', 'The bucket and the things in it have different names. Two lines, not one.']
  ];

  // ---------- The toll hut ----------
  T.toll = [
    ['narr', 'A toll hut across the trail, with a striped bar. A sign: PROPERTY OF THE RANGER ACCOUNT. MEMBERS OF OTHER ACCOUNTS, SEE KEEPER.'],
    ['narr', 'The keeper points at her own sign, which already lists your party by name. Then she points at you, and waits.'],
    ['mira', 'She\'s said yes. What\'s she waiting for?']
  ];
  T.tollPredict = { q: 'The hut\'s policy names you. Your own policies say nothing about the hut. You\'re in a different account from the hut. Does the bar go up?', opts: ['Yes, the hut\'s policy names me', 'No, my side must say yes too'], a: 1,
    right: 'Right. Across accounts, both sides have to say yes.',
    wrong: 'Not across accounts. In one account the hut\'s yes would do, but here your own account has to allow it too.' };
  T.tollWon = [
    ['narr', 'The bar goes up. The keeper stamps four hands.'],
    ['freya', 'Other people\'s things have their own rules. Across accounts, both sides have to say yes.']
  ];

  // ---------- The windy ledge ----------
  T.ledge = [
    ['narr', 'The trail narrows to a ledge. The wind is loud enough to lean on. A bucket policy is painted on the rock in letters a foot high.'],
    ['seoyeon', 'It says nobody crosses "when aws:SecureTransport is false".'],
    ['dutch', 'There\'s a rope. Guide rope, on rings. That\'ll be the secure transport.']
  ];
  T.ledgePredict = { q: 'The rock says: Deny everything when aws:SecureTransport is false. Your role is allowed to cross. You cross without the guide rope, over plain HTTP. What happens?', opts: ['Denied, whatever I\'m allowed', 'Allowed, because my role allows it'], a: 0,
    right: 'Right. An explicit Deny beats every Allow, and without TLS the condition is true.',
    wrong: 'An explicit Deny wins over every Allow. Without the rope (TLS), aws:SecureTransport is false, so the Deny applies.' };
  T.ledgeWon = [
    ['narr', 'You clip onto the guide rope, one at a time, and cross. Kai doesn\'t look down. Then he does.'],
    ['kai', 'Right. Yep. Rope. Love the rope.'],
    ['freya', 'Conditions are the "only if". Read them, they\'re short.']
  ];

  // ---------- Rest Stops ----------
  T.rest = [
    [['narr', 'Rest Stop 1: a bench, a Free Tier sign, and a view all the way down to Coldstart, already small.'], ['freya', 'Five minutes. Sit.']],
    [['narr', 'Rest Stop 2: a hut with its door off, and a stove someone left lit. The wind can\'t get in.'], ['freya', 'Warm your hands. We\'re halfway to the cave.']],
    [['narr', 'Rest Stop 3: above the cloud now. The summit is right there, and a light on it that must be Freya\'s camp.'], ['freya', 'Nearly home.', 'smile']]
  ];
  T.check = [['freya', 'Before we sit: the ones you got wrong on the way up. Again, while it\'s fresh.']];
  T.checkNone = [['freya', 'Nothing to go back over. Good. Sit.']];
  T.checkDone = [['freya', 'There. That\'s the part you\'ll remember.']];

  // ---------- The cave mouth ----------
  T.rockfall = [
    ['narr', 'The trail ends at a rockfall: half the mountain, lying across the path. To the right of it, a cave mouth, and a sign: DENY MINES. SHORTCUT TO THE UPPER TRAIL.'],
    ['freya', 'Oh dear. Well, through there, then. It comes out higher up.'],
    ['lead', { mira: 'You\'re not coming?', kai: 'You\'re not coming in?', seoyeon: 'Are you coming with us?', dutch: 'You\'re staying out here.' }],
    ['freya', 'The Free Tier doesn\'t cover caves. I\'ll meet you at the top of it.'],
    ['freya', 'I\'ve left notes inside. They\'ll help.'],
    ['dutch', 'You\'ve been in there.'],
    ['freya', 'I\'ve been everywhere on this mountain.']
  ];
  // After Freya's exit (js/ch1-mountain.js, freyaExit): she comes apart into gold sparks that go up the cliff.
  T.freyaGone = [
    ['narr', 'Then she isn\'t there. A few gold sparks drift up the cliff face toward the upper trail, and go out.'],
    ['lead', { mira: 'Did she just...?', kai: 'Okay. She can do that.', seoyeon: 'Where did she go?', dutch: 'She didn\'t walk.' }]
  ];
  T.minesSoon = [
    ['narr', 'The cave is dark and goes a long way in. Somewhere ahead, water drips on stone, and something says "Denied" in a small, satisfied voice.'],
    ['narr', 'The Deny Mines are still being dug. For now the four of you feel your way through to the upper mouth.']
  ];
  T.caveExit = [
    ['narr', 'Daylight, and a ledge high above the rockfall. Freya is sitting on a rock with a flask, as if she had been there for hours.'],
    ['freya', 'There you are. Tea?', 'smile'],
    ['lead', { mira: 'How did you get up here?', kai: 'How are you up here?', seoyeon: 'How did you get here first?', dutch: 'You didn\'t climb.' }],
    ['freya', 'I took the lift. It\'s further up. You\'ll like it.']
  ];

  // ---------- The upper trail ----------
  T.lift = [
    ['narr', 'A cable lift station, its car swinging in the wind. A sign: THIS LIFT IS A ROLE. RIDERS MUST BE NAMED IN ITS TRUST POLICY.'],
    ['narr', 'Under it, the trust policy. One name on it: the ranger\'s role.'],
    ['seoyeon', 'Freya rode it.'],
    ['freya', 'I\'m on everyone\'s trust policy, love.']
  ];
  T.liftPredict = { q: 'The lift role can go anywhere on the mountain. Its trust policy names only the ranger\'s role. Can you ride it?', opts: ['Yes, it\'s allowed to go up', 'No, it doesn\'t trust me'], a: 1,
    right: 'Right. What a role can do and who may wear it are two different policies.',
    wrong: 'What the role can do doesn\'t matter if its trust policy doesn\'t name you. That decides who may assume it.' };
  T.liftWon = [
    ['narr', 'You write your role into the trust policy. The car stops swinging and opens its door.'],
    ['freya', 'A role is a mask. Its trust policy says who can put it on, and its permissions say what it lets you do.']
  ];
  T.operator = [
    ['narr', 'The lift motor won\'t start. A little screen on it says AccessDeniedException, and a name: lift-motor.'],
    ['kai', 'The motor\'s got its own permissions?'],
    ['freya', 'It\'s a function. It wears its own role to do its job.']
  ];
  T.operatorWon = [
    ['narr', 'The motor catches and hums. The car lurches out over nothing.'],
    ['mira', 'Nobody look down.'],
    ['kai', 'Too late.']
  ];
  T.ride = [['narr', 'The lift climbs through the storm, into cloud, and out above it. Nobody says anything for a long time.']];
  T.logbook = [
    ['narr', 'The ranger\'s hut at the top station. The ranger is out. Her logbook is open on the desk, and the last line says: BRIDGE ROPE GONE, LOWER TRAIL. WHO?'],
    ['dutch', 'There\'s a record of every call on this mountain, isn\'t there.'],
    ['freya', 'Of a lot of them.']
  ];
  T.logPredict = { q: 'The rope was an object in an S3 bucket, and someone deleted it last night. The account has no trails. Will CloudTrail\'s event history show who did it?', opts: ['Yes, CloudTrail records every call', 'No, not that kind of call'], a: 1,
    right: 'Right. Deleting an object is a data event, and event history only has management events.',
    wrong: 'Event history keeps management events for 90 days. Deleting an object is a data event, recorded only by a trail set up for it beforehand.' };
  T.logWon = [
    ['dutch', 'So nobody knows who cut the rope.'],
    ['freya', 'Nobody asked CloudTrail to watch it. It writes down what you asked it to, and nothing else.'],
    ['narr', 'Dutch writes something in his own notebook, and doesn\'t say what.']
  ];

  // ---------- The summit ----------
  T.summitGate = [['freya', 'Rest stop first. Then home.']];
  T.summit = [
    ['narr', 'The trail tops out on a wide, green summit, out of the wind at last. Tents, a pavilion, a cookfire, and a road running east to a village and a temple under its own storm.'],
    ['freya', 'Welcome to my camp. Breakfast is still hot.', 'smile'],
    ['freya', 'Sit down, eat something, and then come and find me. I\'ve got presents.']
  ];
})();
