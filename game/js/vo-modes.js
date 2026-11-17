// Recorded voice lines for the title's games (Ladi, Nov 16): 'who|text' to assets/audio/vo/<file>.mp3, as in js/vo.js.
// Each game marks a spoken line with data-vo="who|text" (js/mode-duel.js, mode-ic.js, mode-pop.js, hunt.js, draft.js,
// mode-sprint.js, mode-drill.js, raid.js); the player below voices it when it appears. Change a line's text and it goes quiet until
// it's recorded again (tools/vo_modes_check.js lists what's mapped, missing or unrecorded).
(function () {
  const LINES = {
    // Look-Alike Cup (Kagemaru)
    "kagemaru|Shop's shut. I play one game a night, with one regular. Tonight that's you. Sit. It's free. Most things are, at first.": 'kagemaru-mg-duel-walkup',
    "kagemaru|Three look-alikes in your hand. Name the real thing and the square is yours. Pick a look-alike, and I'll help myself.": 'kagemaru-mg-duel-sit',
    "kagemaru|A practice round. On the house. I'm told it builds trust.": 'kagemaru-mg-duel-practice',
    "kagemaru|Oh, you're back. I kept your seat. And your cards, exactly as you left them.": 'kagemaru-mg-duel-resume',
    "kagemaru|Mine, then. I'll take the one that hurts.": 'kagemaru-mg-duel-move',
    "kagemaru|Fine. Keep it. I have more.": 'kagemaru-mg-duel-hit',
    "kagemaru|Oh. You've seen it. Clever customer.": 'kagemaru-mg-duel-threat',
    "kagemaru|You were Sure. Ah ha ha. Let me hang that on your Wall for you.": 'kagemaru-mg-duel-suremiss',
    "kagemaru|Your pick? Bold. Or desperate. They look alike from here.": 'kagemaru-mg-duel-mypick',
    "kagemaru|My pick. I know exactly what you're bad at. I keep a ledger.": 'kagemaru-mg-duel-hispick',
    "kagemaru|Closing time. One card. Make it a good one.": 'kagemaru-mg-duel-closing',
    "kagemaru|Won, have you. How dull. I'll have to start pricing you properly.": 'kagemaru-mg-duel-won',
    "kagemaru|A guess. Ah ha ha. Luck is the one thing I can't sell you.": 'kagemaru-mg-duel-wonguess',
    "kagemaru|Come back tomorrow. The stock rotates. Your mistakes don't. Ah ha ha.": 'kagemaru-mg-duel-lost',
    // Look-Alike Cup, the Counterfeit Table (Kagemaru, js/mode-table.js; Nov 16)
    "kagemaru|Shop's shut. I play one game a night, with one regular. Tonight that's you. Sit. Every square is a job, and I sell pins for every job. Mostly real ones.": 'kagemaru-mg-duel-t-walkup',
    "kagemaru|Same table, fresh stock. Some of it is even genuine.": 'kagemaru-mg-duel-t-sit',
    "kagemaru|Fine. It works. I have more.": 'kagemaru-mg-duel-t-held',
    "kagemaru|Cracked. That's mine now, thank you.": 'kagemaru-mg-duel-t-failed',
    "kagemaru|Ah. You checked the clasp. Rude, but correct.": 'kagemaru-mg-duel-t-callfake',
    "kagemaru|Genuine. You called an honest pin a fake, so I'll take another square for the insult.": 'kagemaru-mg-duel-t-callreal',
    "kagemaru|There. That should do the job. Probably.": 'kagemaru-mg-duel-t-lay',
    "kagemaru|Three in a line. Unless you think one of them is paste.": 'kagemaru-mg-duel-t-line',
    "kagemaru|Hm. You checked the labels. How dull.": 'kagemaru-mg-duel-t-boardme',
    "kagemaru|That one's mine. Now, the bill.": 'kagemaru-mg-duel-t-boardhim',
    "kagemaru|Now the bill. Everything you got wrong, I keep a note of. Pay it in answers.": 'kagemaru-mg-duel-t-bill',
    "kagemaru|Nothing owed? I'll find something. Here.": 'kagemaru-mg-duel-t-billnone',
    "kagemaru|Your pick, since you lost. Bold. Or desperate.": 'kagemaru-mg-duel-t-mypick',
    "kagemaru|One board each. So, the Rack. Four pins, two of them genuine. Tell me which.": 'kagemaru-mg-duel-t-rack',
    "kagemaru|Closing time. One pin. Real or paste?": 'kagemaru-mg-duel-t-sudden',
    "kagemaru|Won, have you. I'll have to start pricing you properly.": 'kagemaru-mg-duel-t-won',
    "kagemaru|You won the Cup last time, so the house opens on the centre. Genuine, before you ask.": 'kagemaru-mg-duel-t-edge',
    "kagemaru|Oh, you're back. I kept your seat, and the pins exactly where they were.": 'kagemaru-mg-duel-t-resume',
    // The Fire Drill (Uptima and the four leads)
    "uptima|Behold, mortals! Thy goddess hath devised a trial most... okay, I copied the order system and broke something. On purpose! Mostly. Find it before the error budget runs out. I'll be supervising. From the snack table.": 'uptima-mg-drill-open',
    "uptima|Another drill! Same system, brand new break. I'd tell you what I broke, but I didn't write it down.": 'uptima-mg-drill-again',
    "uptima|Every drill closed! Praise Uptima. Thank Uptima. Credit... okay, fine. Credit them a little.": 'uptima-mg-drill-won',
    "uptima|The budget's gone. In a real outage, this is where everyone gets paged. Including me. Please don't page me. We'll try again tomorrow.": 'uptima-mg-drill-zero',
    "uptima|Next one! This one's definitely fine. Probably. Don't quote me.": 'uptima-mg-drill-next',
    "uptima|Postmortem time! One answer, and tell me how sure you are. If you're right, I'm taking the credit.": 'uptima-mg-drill-postmortem',
    "seoyeon|The Gate's bucket only refills so fast. A 429 means it was empty.": 'seoyeon-mg-drill-teach-429',
    "mira|AWS says a queue in front of a function wants a visibility timeout of at least six times the function's timeout.": 'mira-mg-drill-teach-vis',
    "dutch|The table has room. One partition doesn't. Each one only takes so many writes a second.": 'dutch-mg-drill-teach-hot',
    "dutch|A KMS key listens to its key policy first. If that doesn't let IAM decide, no IAM policy helps.": 'dutch-mg-drill-teach-kms',
    "kai|New environment, new start-up. Reserved concurrency saves a place. It doesn't warm it.": 'kai-mg-drill-teach-cold',
    "mira|One group, one line. The function can only work as many groups as there are.": 'mira-mg-drill-teach-fifo',
    "kai|Without ReportBatchItemFailures, one bad message sends the whole batch back.": 'kai-mg-drill-teach-poison',
    "dutch|AWS won't take that one. Read the refusal: it's the lesson.": 'dutch-mg-drill-teach-refused',
    "seoyeon|Grey on the map means nobody traced it. You can't see what you didn't instrument.": 'seoyeon-mg-drill-teach-grey',
    "dutch|A 4xx down here turns into a 5xx up there. On the trace, yellow is a 4xx and red is a 5xx. Start at the yellow.": 'dutch-mg-drill-teach-iam',
    "kai|A canary only helps if something is watching it. CodeDeploy rolls back on an alarm only while the deployment is still running.": 'kai-mg-drill-teach-canary',
    "dutch|A secret you read once and keep goes stale the moment it rotates. Cache it, and know when to read it again.": 'dutch-mg-drill-teach-secret',
    "mira|A stream keeps its order. A record that always fails holds up everything behind it, and by default Lambda retries it until it expires.": 'mira-mg-drill-teach-stream',
    "seoyeon|401 means no pass at all. 403 means a pass that says no. And the Gate remembers what a pass said.": 'seoyeon-mg-drill-teach-auth',
    "dutch|Reads are eventually consistent unless you ask. Right after a write, ask: ConsistentRead.": 'dutch-mg-drill-teach-reads',
    "mira|A filter policy reads message attributes unless you tell it to read the body. No attributes, no match, and SNS doesn't call that an error.": 'mira-mg-drill-teach-fanout',
    "kai|Retry what might work next time. Catch what never will. And give the catch a ResultPath, or the error replaces your input.": 'kai-mg-drill-teach-flow',
    "seoyeon|Held. Write it up before you forget why.": 'seoyeon-mg-drill-held',
    "seoyeon|We didn't find it in time. Now we know where to look.": 'seoyeon-mg-drill-lost',
    "mira|Held. Write it up before you forget why.": 'mira-mg-drill-held',
    "mira|We didn't find it in time. Now we know where to look.": 'mira-mg-drill-lost',
    "kai|Held. Write it up before you forget why.": 'kai-mg-drill-held',
    "kai|We didn't find it in time. Now we know where to look.": 'kai-mg-drill-lost',
    "dutch|Held. Write it up before you forget why.": 'dutch-mg-drill-held',
    "dutch|We didn't find it in time. Now we know where to look.": 'dutch-mg-drill-lost',
    // Incident Commander (Uptima)
    "uptima|Kyu held the Cloud's pager since before the first server booted. I'm the secondary. Tonight it's yours. Wake me if the error budget hits zero. Don't wake me.": 'uptima-mg-ic-open',
    "uptima|Next wave. I'm asleep. This is a recording of me being asleep.": 'uptima-mg-ic-wave2',
    "uptima|Still going. Kyu did this every night. Every. Night.": 'uptima-mg-ic-wave3',
    "uptima|Major incident. Everything that got away tonight came back at once. They always come back.": 'uptima-mg-ic-major',
    "uptima|Resolved. One less red light. I like fewer red lights.": 'uptima-mg-ic-right',
    "uptima|Resolved, and you were Sure. I'm writing that in the postmortem. In gold.": 'uptima-mg-ic-sureright',
    "uptima|Still open. Same fault, different symptoms. Read it all again. The stem is always telling on someone.": 'uptima-mg-ic-wrong',
    "uptima|That one got away. It'll page you again before morning. They always do.": 'uptima-mg-ic-missed',
    "uptima|You were Sure. I was Sure once. I was a goddess. Look at me now.": 'uptima-mg-ic-suremiss',
    "uptima|That one paged. It comes back next wave, in a new disguise.": 'uptima-mg-ic-timeout',
    "uptima|Between waves. Somebody's offering to help. Take it. I never did.": 'uptima-mg-ic-pick',
    "uptima|My runbook. Mostly coffee rings. But it says where the next ones land.": 'uptima-mg-ic-runbook',
    "uptima|I am risen! Thy goddess is... oh. Oh no. Kyu never woke me. Not once.": 'uptima-mg-ic-zero',
    "uptima|Live shift! Kyu's asleep, so tonight I'm in charge. Which means you're in charge. I'll supervise. From over here. Supportively.": 'uptima-mg-icl-open',
    "uptima|Another page. Don't panic. I'm panicking enough for both of us.": 'uptima-mg-icl-next',
    "uptima|Before you touch anything, guess what it does. I always guess. I'm right every single time I'm right.": 'uptima-mg-icl-ask',
    "uptima|You called it! I also called it. In my head. Very loudly.": 'uptima-mg-icl-right',
    "uptima|Nope, that's not what it did. Remember what it really did. Write it on your hand. That's what I do.": 'uptima-mg-icl-wrong',
    "uptima|GREEN! Five nines! Don't touch anything. Don't even breathe on it.": 'uptima-mg-icl-met',
    "uptima|Still red. One more change. I believe in you. I believe in me more, but you're a close second.": 'uptima-mg-icl-unmet',
    "uptima|Still red, and the shift keeps going. The debrief explains it. I'd explain, but I'm busy looking calm.": 'uptima-mg-icl-lastred',
    "uptima|One question on what you just did. It's open book. I lost the book.": 'uptima-mg-icl-debrief',
    "uptima|Three pages, three fixes. I'm putting my name on the incident report. Go to sleep.": 'uptima-mg-icl-end',
    // Her reactions while the minute plays (js/ic-live.js QUIP; Nov 17)
    "uptima|Four-two-nine. That's AWS for \"no\". It says it very politely.": 'uptima-mg-icl-q-throttled',
    "uptima|That caller gave up. Honestly, same.": 'uptima-mg-icl-q-gaveup',
    "uptima|Same message, failing again. It's me on a Monday.": 'uptima-mg-icl-q-fail',
    "uptima|They got a message ID. Not an order. A number. Lovely.": 'uptima-mg-icl-q-unanswered',
    "uptima|Charged twice! Somewhere a customer is typing a very long email.": 'uptima-mg-icl-q-dupe',
    "uptima|Into the bin. Rest well, little message.": 'uptima-mg-icl-q-dlq',
    "uptima|Second charge blocked. Nobody pays twice on my watch.": 'uptima-mg-icl-q-dupeblocked',
    "uptima|Orders going through. Don't jinx it. I said don't.": 'uptima-mg-icl-q-done',
    "uptima|Checkout is spinning for customers on launch night. Some orders never go through.": 'uptima-mg-icl-page-launch',
    "uptima|The order queue keeps growing, and some customers got two confirmation emails.": 'uptima-mg-icl-page-poison',
    "uptima|Customers are being charged twice for one order.": 'uptima-mg-icl-page-twice',
    "uptima|Shift over. Hand me the pager. ...Actually, keep it till morning.": 'uptima-mg-ic-end',
    // Lost and Found (Dutch, Freya, Mira, Seo-yeon)
    "freya|Good evening! Tonight's deleted rooms have been removed from the tower. Thank you for keeping the Cloud tidy!": 'freya-mg-pop-announce',
    "dutch|Removed. Not gone. Everything in there says it's somebody's. That's a claim. Nobody's proved one yet.": 'dutch-mg-pop-arrive1',
    "dutch|See that, up top? That's a hunch. Big one. Loud. Never once shown its working.": 'dutch-mg-pop-arrive2',
    "dutch|New heap. Same claims, different coats.": 'dutch-mg-pop-again1',
    "dutch|The thing up top is still there. It's always still there.": 'dutch-mg-pop-again2',
    "dutch|Back the check with your cards, or don't. Before you read it.": 'dutch-mg-pop-stake',
    "dutch|That one's mine. Twenty-five years I've carried it. Never once asked it for proof.": 'dutch-mg-pop-hunch',
    "dutch|Out. We're not proving anything bleeding.": 'dutch-mg-pop-zero',
    "dutch|Huh. Smaller than it sounded.": 'dutch-mg-pop-won',
    "dutch|It checked out. It always does, the first time.": 'dutch-mg-pop-lost',
    "dutch|It'll be there tomorrow. It always is.": 'dutch-mg-pop-retreat',
    "dutch|Back. Your stake's still on the table. I didn't touch it.": 'dutch-mg-pop-resume',
    "dutch|That's a record. That I'll believe.": 'dutch-mg-pop-proven',
    "dutch|Holds. Next.": 'dutch-mg-pop-right',
    "dutch|A guess that held. I'll take it. I won't frame it.": 'dutch-mg-pop-guessright',
    "dutch|Fizzled. No harm. No proof either.": 'dutch-mg-pop-fizzle',
    "dutch|Cost you a little. Cheaper than a lie.": 'dutch-mg-pop-wrong',
    "dutch|Up on the Wall, next to mine. Same claim's coming back in a different coat, kid.": 'dutch-mg-pop-suremiss',
    "dutch|It ran. Claims do, when nobody's got a check left for them.": 'dutch-mg-pop-flee',
    "dutch|Sit. No, the other chair.": 'dutch-mg-pop-breakin1',
    "dutch|Now. Where were you at midnight?": 'dutch-mg-pop-breakin2',
    "mira|Hold still. No, it's not \"just a backfire\". A backfire is what I get from Kai's stove. This is a hole.": 'mira-mg-pop-rest',
    "seoyeon|Rest is over. Forms.": 'seoyeon-mg-pop-breakout',
    "dutch|Mira doesn't argue. She lines three of them up and points at the row that settles it. Watch.": 'dutch-mg-pop-teach-compare',
    "dutch|Seo-yeon reads a policy like a confession. One line's lying. Find it, then say why.": 'dutch-mg-pop-teach-spot',
    "dutch|Kai's question: what does this do when it runs? Not what it's meant to do. What it does.": 'dutch-mg-pop-teach-predict',
    "dutch|My way. Records. What happened first, what happened next, and what never happened at all.": 'dutch-mg-pop-teach-seq',
    "dutch|Your turn. One hint. Nothing staked, nothing scored.": 'dutch-mg-pop-practice',
    "dutch|Half a proof. Half the payout. The claim keeps the rest.": 'dutch-mg-pop-fmt-partial',
    "dutch|Sure, and wrong. Up on the Wall, as a bank question. Its idea comes back tomorrow night too, exam-style.": 'dutch-mg-pop-fmt-suremiss',
    "dutch|Practice. Nothing rides on it.": 'dutch-mg-pop-fmt-unscored',
    "dutch|…It's been wrong before.": 'dutch-mg-pop-deflate2',
    "dutch|Twenty-five years, and nobody ever made it show its working. Me included.": 'dutch-mg-pop-deflate3',
    "dutch|Smaller every night. I could get used to that.": 'dutch-mg-pop-deflate4',
    "dutch|Something big moved into the heap. Says it's AWS. Says it loud.": 'dutch-mg-pop-room-night3',
    "dutch|There's a cat in my heap.": 'dutch-mg-pop-room-night4',
    "dutch|Locked. Keys come off cleared claims.": 'dutch-mg-pop-room-locked',
    "dutch|One key. One check. Then it's yours.": 'dutch-mg-pop-room-vaultopen',
    "dutch|Seal's off. That's a record.": 'dutch-mg-pop-room-vaultwon',
    "dutch|Seal held. The key stays in the lock. Happens.": 'dutch-mg-pop-room-vaultlost',
    "dutch|Back stairs. Skips a row. The checks you'd have spent come up with you.": 'dutch-mg-pop-room-shortcut',
    "dutch|Up we go. Mind the third step.": 'dutch-mg-pop-room-shorttaken',
    "dutch|The records vault. Two keys. Nobody gets blamed in here. We just write down what happened.": 'dutch-mg-pop-room-records',
    "dutch|Blameless Postmortem. It pays for what you proved, not what you bet.": 'dutch-mg-pop-room-recordsopen',
    "dutch|Suit yourself. It'll keep.": 'dutch-mg-pop-room-pass',
    "kai|Come here, love.": 'kai-mg-pop-room-catwon',
    "dutch|Suspect fled the scene. Again.": 'dutch-mg-pop-room-catlost',
    "dutch|Fine. Go. I've got your description.": 'dutch-mg-pop-room-catgo',
    "mira|Patient.": 'mira-mg-pop-room-cat1',
    "kai|Chef.": 'kai-mg-pop-room-cat2',
    "seoyeon|Honoured Guest.": 'seoyeon-mg-pop-room-cat3',
    "dutch|Suspect.": 'dutch-mg-pop-room-cat4',
    // Monster Hunt (Bru)
    "bru|Every answer you got wrong is a bounty on my board. Nothing in the Cloud is ever really deleted: your misses have been living in the scrap field behind a delete marker, and they've grown. Ay, no.": 'bru-mg-hunt-board1',
    "bru|I know where everyone in this camp is. Your misses too. Especially your misses.": 'bru-mg-hunt-board2',
    "bru|Bounties are up. I checked the scrap field myself. I don't trust a heartbeat I can't see.": 'bru-mg-hunt-board3',
    "bru|The board is clear. ¡Qué milagro! Sure misses and mock misses go up on the Wall, and I'll pin them here.": 'bru-mg-hunt-empty',
    "bru|They're out past the delete marker. Pick your fight. Things in here have versions.": 'bru-mg-hunt-pick',
    "bru|¡Mira! CAPTURED.": 'bru-mg-hunt-captured1',
    "bru|¡Eso! Stamped and filed.": 'bru-mg-hunt-captured2',
    "bru|CAPTURED. Into the book it goes.": 'bru-mg-hunt-captured3',
    "bru|It's limping. Back tomorrow, and it won't get far.": 'bru-mg-hunt-wounded1',
    "bru|Wounded. I'll leave the scrap field gate open for it.": 'bru-mg-hunt-wounded2',
    "bru|EHHH?! It was right there! ...Fine. I'll walk the scrap field tonight and check the doors myself.": 'bru-mg-hunt-escaped1',
    "bru|¡Ay! It slipped the marker. It'll be back, and so will you.": 'bru-mg-hunt-escaped2',
    "bru|¡Bien! Driven off before it could put down roots.": 'bru-mg-hunt-wildok',
    "bru|It got away into the scrap field. It's on the Wall now, with the others.": 'bru-mg-hunt-wildbad',
    // Incident Commander (Uptima)
    "dutch|Point at a door. Nobody pages through it while I'm standing there.": 'dutch-mg-ic-pick',
    "coo|Coo. The next letter that goes astray, I'll catch half of it.": 'coo-mg-ic-pick',
    "bru|I'll walk the doors myself while you work. Go. ¡Ándale!": 'bru-mg-ic-pick',
    // Architect's Draft (Coo or Ayo, Sir Seymour, the clients)
    "coo|Coo. Pingsby's Quarter, under delete markers, all of it. Clients are waiting. Read the whole scroll. Build what it says.": 'coo-mg-draft-intro',
    "coo|Coo. Filed. Same again tomorrow.": 'coo-mg-draft-end',
    "ayo|Pingsby's Quarter! Freya deleted it, so we build it back. Pick a client, read the whole scroll, build what it says. Not what they say. What it says. HA!": 'ayo-mg-draft-intro',
    "ayo|Good day's work. The forge stays lit.": 'ayo-mg-draft-end',
    "seymour|HALT! ...I have checked it. And checked it again. It stands.": 'seymour-mg-draft-clean',
    "seymour|The scaffolding stays up. I don't sign for what I haven't seen hold on two different days.": 'seymour-mg-draft-scaf',
    "seymour|A second blueprint on the same rule? Bring it here. I'll inspect it. Thoroughly.": 'seymour-mg-draft-retry',
    "mira|Good. Clean lines. Nothing I'll have to stitch later.": 'mira-mg-draft-client-right',
    "mira|Hold still. That one's wrong, and I'm going to show you where.": 'mira-mg-draft-client-wrong',
    "mira|You were sure. I hear that a lot from people on my table. Look again.": 'mira-mg-draft-client-sure',
    "seoyeon|Acceptable. I will try not to look impressed.": 'seoyeon-mg-draft-client-right',
    "seoyeon|How generous of you, leaving the door open. For everyone.": 'seoyeon-mg-draft-client-wrong',
    "seoyeon|Such certainty. It must be restful.": 'seoyeon-mg-draft-client-sure',
    "dutch|Huh. It holds. Don't let it go to your head.": 'dutch-mg-draft-client-right',
    "dutch|Wrong door, kid. Read the scroll again. Slower.": 'dutch-mg-draft-client-wrong',
    "dutch|You went with your gut. I know how that ends. Sit down.": 'dutch-mg-draft-client-sure',
    "kai|Look at that. It doesn't even fall over when I lean on it.": 'kai-mg-draft-client-right',
    "kai|That's not what I ordered. I'll fix it. ...No. You fix it.": 'kai-mg-draft-client-wrong',
    "kai|You plated that like it was perfect. It's raw in the middle.": 'kai-mg-draft-client-sure',
    "marrow|That'll ring true. I can hear it already.": 'marrow-mg-draft-client-right',
    "marrow|That would ring at the wrong hour. Half the camp would come running for nothing.": 'marrow-mg-draft-client-wrong',
    "marrow|Loud and wrong. That's the worst kind of bell.": 'marrow-mg-draft-client-sure',
    "coo|Coo-ah. Every pigeonhole where I'd have put it.": 'coo-mg-draft-client-right',
    "coo|Coo. This goes back to the sender. That's you.": 'coo-mg-draft-client-wrong',
    "coo|You signed for that with great confidence. Coo. I keep the receipts.": 'coo-mg-draft-client-sure',
    // Exam Sprint (Lexi, Coo)
    "lexi|By the Forbidden Index, I open the Proving Road. Every jar you fill takes my seal, and no seal breaks before the Lamp House.": 'lexi-mg-sprint-gate1',
    "lexi|Read the whole question. Shh. Go.": 'lexi-mg-sprint-gate2',
    "lexi|Exam conditions. This is an emergency.": 'lexi-mg-sprint-exam1',
    "lexi|No pace line, no nudges. The sun doesn't wait for anyone today.": 'lexi-mg-sprint-exam2',
    "lexi|The Index records your footsteps before it records your answers.": 'lexi-mg-sprint-house1',
    "lexi|The sun beat you to the door. Sit anyway. The jars can wait a minute.": 'lexi-mg-sprint-house-sunset',
    "lexi|You made it before dark. Sit. The jars can wait a minute.": 'lexi-mg-sprint-house-dark',
    "lexi|The lid didn't take. It slipped out somewhere on the road.": 'lexi-mg-sprint-lid',
    "lexi|I now break the seal.": 'lexi-mg-sprint-seal',
    "coo|Coo-ah. Late out of the loft, on schedule from the fourth stop. Leave the loft on time and the whole round is on time.": 'coo-mg-sprint-end-slow',
    "coo|Coo. Every stop on schedule. That is how the post is run.": 'coo-mg-sprint-end-steady',
    "coo|Coo. A fine start. The round is judged at the last door, not the first.": 'coo-mg-sprint-end-fade',
    "coo|Coo. Late at every stop. Late is still delivered. Leave earlier tomorrow.": 'coo-mg-sprint-end-late',
    "coo|Coo. Some letters didn't go out before dark. Undelivered isn't lost. Someone meant them. Same road, next time.": 'coo-mg-sprint-end-out',
    // Multiplayer (your champion)
    "mira|Stay close, and tell me when you're hurt. I can't fix what nobody tells me about.": 'mira-mg-mp-start',
    "mira|Everyone still breathing? Good. That's the only score I keep.": 'mira-mg-mp-won',
    "mira|Up. Slowly. We find out where it hurt, and we go back in.": 'mira-mg-mp-lost',
    "kai|Right. Everybody eats after this. Nobody skips dinner by dying.": 'kai-mg-mp-start',
    "kai|HA! That's service! Somebody wipe down the floor.": 'kai-mg-mp-won',
    "kai|Burnt it. Happens. We cook it again.": 'kai-mg-mp-lost',
    "seoyeon|Eyes up. Guard the one beside you. Begin.": 'seoyeon-mg-mp-start',
    "seoyeon|Clean. Again tomorrow, and cleaner.": 'seoyeon-mg-mp-won',
    "seoyeon|We lost. Remember exactly how. That is the lesson.": 'seoyeon-mg-mp-lost',
    "dutch|Keep it tidy. Nobody goes through a door alone.": 'dutch-mg-mp-start',
    "dutch|Done. Mop's in the corner, if anyone wants to make themselves useful.": 'dutch-mg-mp-won',
    "dutch|Down. Not out. We go back and ask it better questions.": 'dutch-mg-mp-lost'
  };
  const VM = SD.voModes = { LINES };
  SD.vo = Object.assign(SD.vo || {}, LINES);

  // The player. Watches the page for [data-vo] lines; when a screen shows lines that weren't on it a moment ago, it
  // voices them in order (a new screen replaces the queue), and a line that leaves the screen stops. A re-render that
  // keeps the same line on screen doesn't replay it. A toast's line (in #notes) plays out when the toast goes. A line with no recording yet (a 404) goes quiet for the session.
  if (typeof document === 'undefined' || typeof MutationObserver !== 'function') return;
  let shown = new Set(), sfxShown = new Set(), queue = [], cur = null, timer = 0, keep = new Set();
  const missing = new Set();
  const visible = el => el.isConnected && el.getClientRects().length > 0 && !el.closest('[hidden]');
  function next() {
    const k = queue.shift();
    if (!k || !SD.audio || !SD.audio.voice) { cur = null; return; }
    cur = k;
    const on = SD.audio.voice(LINES[k], r => {
      if (cur !== k) return;
      cur = null; keep.delete(k);
      if (r === 'error') missing.add(k);
      if (r === false) { queue = []; return; }   // cut off by another line (a scene, or the next screen)
      if (queue.length) setTimeout(() => { if (!cur) next(); }, r === 'error' ? 0 : 250);
    });
    if (!on) { cur = null; queue = []; }          // sound effects are off
  }
  function pass() {
    timer = 0;
    const els = [...document.querySelectorAll('[data-vo]')].filter(visible), now = new Set(), fresh = [];
    els.forEach(el => {
      const k = el.getAttribute('data-vo');
      now.add(k);
      if (el.closest('#notes')) keep.add(k);
      if (!shown.has(k) && !fresh.includes(k) && LINES[k] && !missing.has(k)) fresh.push(k);
    });
    shown = now;
    // A wordless speaker (the Hunch) marks its moment with data-sfx: a synth effect in js/audio.js, once as it appears.
    const fx = new Set([...document.querySelectorAll('[data-sfx]')].filter(visible).map(el => el.getAttribute('data-sfx')));
    fx.forEach(n => { if (!sfxShown.has(n) && SD.audio && SD.audio.sfx) SD.audio.sfx(n); });
    sfxShown = fx;
    if (cur && !now.has(cur) && !keep.has(cur)) { const k = cur; cur = null; queue = []; if (SD.audio && SD.audio.voice) SD.audio.voice(null); missing.delete(k); }
    if (fresh.length) { queue = fresh; if (!cur) next(); }
  }
  VM.pass = pass;
  VM.stop = () => { queue = []; if (cur) { cur = null; SD.audio.voice(null); } };
  const watch = () => {
    new MutationObserver(() => { if (!timer) timer = setTimeout(pass, 60); })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'data-vo', 'data-sfx', 'class'] });
    pass();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch, { once: true }); else watch();
})();
