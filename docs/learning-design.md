# Learning design

How Isekai'd Into the Cloud teaches. The principles come from the first game, [Isekai'd Into Prod](https://github.com/loyeleye/system-design-study) (`docs/game-design.md`, "Learning science, and where it lives in the game"), which drew on Barbara Oakley's *Learning How to Learn* (Coursera) and Justin Sung's YouTube channel on learning. Most of them already work here, because the quiz, save and run engines were copied as they are; what changes is the content, which now prepares for the AWS Certified Developer – Associate exam (DVA-C02) instead of system design interviews.

Every chapter thread reads this before writing questions, cards, bosses or mini-games. Questions follow `docs/question-style.md`.

## Ground rules

- **The exam decides what is taught.** Topics come from the DVA-C02 exam guide's task statements and from what the well-regarded prep courses cover (their outlines, not their questions), so every question is one the exam could plausibly ask. The project's research on prep resources is in `/mnt/project-files/research/`. Facts come from the current AWS documentation, never from memory alone; where a detail is uncertain, check the docs or leave it out.
- **Write everything fresh.** No practice-exam questions, course questions (Udemy, Pluralsight, Tutorials Dojo, Skill Builder's official practice sets) or course text are copied or paraphrased, even when the player owns them. They are for the player to take as real practice, outside the game.
- **The game never bends a fact.** Jokes may bend a metaphor; questions, card text, ELI5s and the Cheat Sheet don't.
- **The game never asks you to go faster.** Speed counts toward mastery only once accuracy and consistency are there.

## Principles, and where they live

Status: **Live** means it works now in the copied engine. **Content** means the engine works but needs AWS text per chapter. **Build** means it was in the first game but hasn't been carried over yet.

| Principle | Source | Status | In this game |
| --- | --- | --- | --- |
| Retrieval, not rereading; recall, not recognition | Oakley; Sung ("generate the answer first") | Live (`js/quiz.js`) | You answer every question before you see feedback. Diagnose fights show only the symptom, the way an exam stem or a CloudWatch alarm does (`429 TooManyRequestsException`, `AccessDenied`, a message that keeps coming back), so you name the cause yourself. Pip's "why did that work?" after Gary is retrieval too. |
| Recall before recognition: Say it first | Sung (generation) | Live (`js/quiz.js`, Menu) | A multiple choice question shows only its stem until you tap "I've said it", so you answer in your own words before you can recognise an option. On for boss steps and Exam Twists by default; Menu switches it to every question or off. |
| Explain it in your own words | Oakley (explaining is the test of a chunk); Sung (generation) | Content (`js/explain-data.js`, `js/embed.js`) | About one review in three, once you've answered a concept right, asks an open question instead. The game pre-ticks the rubric points it can see (key terms, or sentence embeddings on your device, with no server), you confirm the ticks, and 60% passes. A model answer follows. One AWS rubric exists (`x-sqs1`); each chapter adds its own. Check them with `node tools/explain_check.js`. |
| Draw the design yourself | Sung (generation); Hello Interview (draw it, then walk a request through it) | Build (`js/board.js` is copied, not loaded) | Before a chapter boss you lay out the architecture from a tray that includes decoys (API Gateway, Lambda, SQS, DynamoDB, S3, Step Functions...), connect it, then trace a request through it. The checks are about behaviour, not one right picture: every call is authorised, each function's role reaches only what it uses, slow work sits behind a queue, nothing writes to a table the caller can reach directly. The problems in `js/board-data.js` are still the first game's and need replacing. |
| Capacity is part of the design | Hello Interview (estimation drives design) | Content, then Build (`js/board-load.js` is copied, not loaded) | Typed estimates, not choices: Lambda concurrency (requests per second times duration), DynamoDB read and write capacity units, SQS batch sizes and visibility timeouts. The load test can later size a board against a peak, a throttled dependency and a hot partition key. |
| Work the incident: diagnose, fix, prevent | How the exams frame scenario questions, and how an engineer works an outage | Live (`R.incident` in `js/run.js`, data in `SD.bossDesign`) | Before each boss you get its incident as evidence (an error message, a CloudTrail event, a CloudWatch metric) and answer three questions: what's wrong, the smallest correct change (least privilege; a number when the fix is one, such as DurationSeconds or maxReceiveCount), and what stops it or catches it next time (a guardrail, an alarm, a test, a template). Each right answer buffs the fight. |
| Survive the twist | The first game's learning review ("if your concepts are not clear, you will not survive the counter questions"); the exam's one-changed-constraint scenarios | Live (`examTwist` in `js/run.js`, data in `SD.twists`) | At half severity each boss asks its incident again with one thing changed: another account, a role you can't touch, a body instead of attributes, a retry that arrives too late. You say which part of your answer still holds. That is also how the exam's qualifiers work: the *most* cost-effective, the *least* operational overhead, the *most* secure. |
| Wrong options teach too | The first game's learning review, Oct 18 | Live (`tools/question_lint.js`) | Every wrong option is a real AWS service, feature or setting used in the wrong place, about as long as the right answer, with a "why not" line saying what it *is* for. DVA-C02's distractors are built the same way, so these lines are where most of the exam's breadth gets taught. Rules in `docs/question-style.md`. |
| Calibrate confidence; overconfident misses matter most | Sung (gap seeking); Oakley (illusions of competence) | Live (`js/quiz.js`, `js/raid.js`, `SD.state.tally`) | You commit with Guess, Think so or Sure. A confident miss resets the concept's review box and is flagged; a lucky guess isn't counted as known. Your **Trust Policy** (see below) scores how well your confidence matches your answers. |
| Spaced repetition at 20–30% forgetting | Sung (one week to one month); Oakley | Live (`js/state.js`) | Leitner boxes at 1, 3, 7, 14 and 30 days. Due and weak concepts come first in fights, questions and card rewards. |
| Interleaving, early and lateral | Sung ("early interleaving") | Live | Runs mix concepts, and the same concept shows up as a fight, a question, an event and a card. Later chapters keep earlier services in the mix, as the exam does (an IAM question inside a Lambda scenario). |
| Path to mastery: accuracy, consistency, fluency | Sung | Live | Each concept moves through Accuracy, Consistency (success over the last five), Fluency (75% or better) and Mastered (five of five, mostly under 12 seconds, box 3 or higher). |
| Deep processing: relate, compare, judge | Sung (schemas; "isolated vs integrated") | Content (`SD.links` in `js/content.js`) | In a break room you pick how two concepts connect, and correct links draw lines on the Cheat Sheet's mind map. AWS has many look-alike pairs worth linking: SQS vs SNS vs EventBridge, Secrets Manager vs Parameter Store, Cognito user pools vs identity pools, provisioned vs reserved concurrency. Events ask for judgement, not definitions. |
| Confusion compass | Sung | Live | After a miss you turn the confusion into a question ("When is Parameter Store enough, and when do I need Secrets Manager?"). It's saved under Open questions for real study sessions. |
| Concrete before abstract; analogies for newcomers | Oakley (metaphor and analogy); Sung (encoding through relation) | Content (`js/eli5.js`) | Every answer has an **ELI5** button that explains it through a game or anime, and **Huh???** explains the whole concept and defines the jargon in the question. `js/eli5.js` still holds the first game's system design text; each AWS question needs its own entry. |
| Prime the gist before the details | Sung (priming); Oakley (chunking) | Build | Before a run, a gist board shows tonight's goal and the four concept chunks it covers (the first game's was at Uptima's temple; here it can be Uptima's pager board). Pip nudges you if you skip it. |
| Concrete experience before abstraction | Oakley (chunking); Sung (priming with structure) | Build | Short building lessons let you *do* an idea before a dungeon tests it: be the Lambda service handing out concurrency, sort which requests IAM allows, watch messages go invisible and come back. |
| Predict, then play | Sung (generation and priming); Oakley | Build | Each mini-game opens with a prediction ("how many messages reach the dead-letter queue?"), then you play, and the result checks the guess. A wrong prediction is framed as the memorable part. |
| Focused and diffuse modes; short sessions | Oakley | Live (`js/run.js`) | A run takes about 20 minutes. Break rooms frame rest as diffuse mode, and the run summary says how long you focused and suggests five minutes away from the screen. |
| Practise like you play | Sung (match the challenge, level and cue) | Content, then Build | Questions read like the exam: a short scenario, a constraint, and a qualifier, with multiple choice (one right answer and three distractors) and multiple response (two or more right of five or more) questions, as the exam guide defines them. Estimates are typed, not chosen. A timed mock in the exam's format, kept apart from the story, is worth building for the last two weeks. |
| Mindset: mistakes are the data | Sung | Live | Dying is part of the joke. You keep XP, shards and what you learned; only the run resets. |

### Trust Policy

The confidence tally, shown in expeditions as **Trust Policy** (an IAM trust policy pun: how far the team trusts your calls; short label "Trust"). Ported from Isekai'd Into Prod's On-call Cred (its PR #166).

- **Score:** your last 20 answers anywhere in the game, each by how sure you said you were: Guess +1 right, ±0 wrong; Think so +2, −1; Sure +3, −5. It never goes above 15 (`SD.state.TALLY`, `TALLY_MAX`). Town reviews feed it silently; only expedition questions show it.
- **Meter:** the HUD chip `🎯 Trust N` has a pip per point up to 15 (red below 0) and ends with what a right debrief answer heals now. Under 2 it turns pink and reads `Debrief +1 ×2`. Tapping it opens a short help bubble on how it's scored and how to recover.
- **Stakes:** each confidence button shows its right / wrong change, with a line under the buttons giving your current Trust and, on a debrief, what a right answer heals; tapping it shows how the stakes work. Saying how sure you really are is the point, so the cost of a confident miss is visible before you commit.
- **Badge:** the verdict carries `🎯 Trust a → b ±d`, green or red.
- **Why row:** a collapsed "🎯 Why Trust ±d?" above Continue, opened by tap so it works on phones, says what you chose, what it cost, every button's stakes and what Trust heals.
- **Continue heal:** on a debrief the button reads `Continue · team heals N SLA` or `Continue · no heal`. After a won fight a right debrief answer heals the team by your Trust, up to 15 SLA; under 2 you get two questions at 1 SLA each instead.

## Game design notes

Carried over from the first game; they are about why it's fun, which is what keeps the reps coming.

- **Roguelite structure** (Extra Credits): short sessions that fit into a day, "just one more run", randomised maps and rewards, and frustration valves when a run goes badly. Gary is the loudest valve.
- **Progression that serves learning** (Extra Credits): card unlocks by level act as a self-paced curve, so a new player meets Lambda and IAM basics before concurrency limits and cross-account roles. Cheat Sheet pages reward understanding, not grinding.
- **Kinds of discovery** (Extra Credits): places to walk, mechanics to find (an incident that shrugs off one card but not another), new cards and relics, and story that changes as you go.
- **Honest hidden mechanics** (Extra Credits with Jennifer Scheurle): a new player's first fight deals 75% load, and once per run Last Uptime leaves you at 1 SLA instead of dying.
- **First impressions:** the cold open starts with action and a joke, teaches by doing in a scripted fight, and ends with a spectacle that sets up a recurring payoff.
- **Juice:** thick outlines, squishy idles, screen shake, floating numbers and a sound on every action, so a button feels good before you know why.

## Checks

From `game/`:

- `node tools/question_lint.js` flags multiple choice questions whose right answer stands out by length, or that lack "why not" lines.
- `node tools/explain_check.js` checks typed-answer rubrics with the on-device model.
- `node tools/board_check.js` checks Design Board problems, once the board is loaded.
