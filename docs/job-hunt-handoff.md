# Isekai'd Into the Cloud: what the game covers (hand-off for the job hunt agent)

**For:** Ladi's job hunt agent (`loyeleye/job-hunt-agent`), to file under `interview/` beside `isekaid_into_the_cloud_status.md` (Nov 15) and `isekaid_into_the_cloud_game_schedule.md` (Nov 16). This doc replaces neither. It's the full picture now that the game and its modes are close to done.
**From:** the AWS Developer Study project. **As of:** Sat Nov 21, 2026, `main` at `604f148` (PR #274, merged Nov 19).
**Source:** the game's code on `main` (each mode's own header and rules file), `game/tools/bank_check.js` run today, and the project's story bible. Where an AWS fact is stated below, it's one the game itself teaches, and it was checked against current AWS documentation (sources at the end).

## 1. The short version

- **What it is:** a browser game that prepares Ladi for **AWS Certified Developer – Associate (DVA-C02) on Mon Nov 30, 2026**, the last day DVA-C02 is offered (DVA-C03 starts Dec 1). It's the sequel to Isekai'd Into Prod (system design). Comedy isekai, a walkable world between dungeon runs, and Slay the Spire-style card battles where the cards are AWS services and patterns.
- **How big it is:** a 7-chapter story (chapter 2 has two parts), **12 game modes** on the title screen's carousel, a daily Today card, topic drills and an Exam Hall with timed mocks.
- **The question bank:** 1,379 questions. **951 count for DVA-C02** (D1 269, D2 241, D3 250, D4 191; 184 are multiple-response). **761 of the 951 carry a per-question "verified" record**: the AWS docs page and a quoted sentence that confirms the answer. 58 of those were corrected by the check, and 19 carry an "era" caution where current docs differ from what older exam items may expect. 163 DVA questions are held out for the Exam Hall's three fixed forms. There are also 150 format items (25 each of Compare, Sequence, Predict, Spot the line, Typed recall and Faded worked example). `bank_check` reports 0 problems, and every exam-guide task has at least one question.
- **Where to play:** https://uptima.s.gy/c (the Cloudflare copy, the only one with a save code that moves progress between devices, and it plays offline). Also the claude.ai artifact (https://claude.ai/artifact/8SBwmaPCRLbsW6pzYuLRLP; no offline) and GitHub Pages (https://loyeleye.github.io/isekaid-into-the-cloud/; offline, no save code). Saves don't carry between copies.
- **Repo:** https://github.com/loyeleye/isekaid-into-the-cloud (public). Plain browser JavaScript, no build step and no framework.

## 2. Rules for using this doc in the job hunt

These come from the job hunt repo's own rules (`resume.md`, `notes/ai_projects_inventory.md`, `interview/project_learning/README.md`). They still apply:

- **Built with Claude Code from Ladi's design and direction.** Say "designed and directed… built with Claude Code", never that Ladi wrote the code.
- **No LLM runs in this game.** Typed answers are checked on the device with a small embedding model (MinishLab's potion-base-8M, MIT): no server, no API key, nothing leaves the browser. Only Isekai'd Into Prod has the LLM checker and its evals.
- **The resume entry:** the existing rule stands. Isekai'd Into the Cloud is one of the "five study and game apps" in the AI-native summary line, and is best folded into the Isekai'd Into Prod entry rather than listed alone. Anything new below that the agent wants on a resume goes to `resume_suggestions.md` as "Confirm first:" for Ladi to approve.
- **The AWS certification itself** isn't earned yet. Don't list it until Ladi reports a pass.

## 3. The story and the town

- **Premise.** Freya, Goddess of the Free Tier, answers four leads' prayers in chapter 1 and turns out to be the villain: likable, generous and false. She takes root and stacks the Regions she took into a hundred-floor tower. Each lead's homeland is rebuilt as a band of floors, cursed the way their story ended, and its culprit holds the band in Freya's name. Uptima, the goddess of the Cloud from the first game, is unlikable and now honest, and she's the party's ally.
- **Theme:** being liked isn't the same as being trustworthy. It's carried by three ideas that are also the exam's: least privilege, trust but verify, and "free is often the most expensive price".
- **The four leads** (you pick one; the dialogue changes by lead): Mira (a healer with a wolf arm; SQS and dead-letter queues), Kai (a line cook; DynamoDB partition keys and spreading load), Seo-yeon (a sword disciple; KMS keys and key policies) and Dutch (who trusts his gut and learns to verify).
- **The town is a camp.** The Free Cloud camp sits in the scrap field at the tower's foot, where Freya dumps what she deletes. The first game's people are there behind S3 delete markers, and restoring them is how the camp grows. Between expeditions you walk the camp and each chapter's town floor: talk to people, take quests, and open gates by understanding something (each gate is a minigame, and a gate you've understood stays open). Collectible pages in each chapter carry a quick recall question.
- **The Version Lens** (from chapter 2) shows what's under the delete markers: deleted paths you can walk once you see them, and secrets off the main path.

## 4. Card battles and the chapters

**How battles work.** Expeditions are dungeon runs on a branching map (incidents, elites, events, shops, break rooms, a boss), with card combat on the Slay the Spire model. Cards are AWS services and patterns (for example AssumeRole, Fix the Trust Policy, MFA Session, HTTPS Only, Read the Trail in chapter 1; a Lambda layer, a retry-and-catch, a DLQ alarm and message groups in chapter 2). Enemies are AWS problems, and some refuse a card outright the way a boundary or a key policy would. Inside runs, Field Notes are worked examples that fade (from row 5 you finish them), and Policy Sorts ask you to predict how many of five requests get through, then sort them. Seymour's Tapes are the run's lives. Expeditions play solo with the other three leads as bots, or as a party with friends online (chapter 1's Deny Mines and the Borderlands dungeons). Ship It (the deploy step) and the Design Board (draw the band's system, load-test it, defend one part) recur at camp.

| Chapter | Place | What it teaches (DVA-C02 tasks) |
|---|---|---|
| 1, Freya's Brigade | Freya's camp, the road east, Brookfall, the Temple of Uptime | IAM: implicit deny, Allow vs explicit Deny, roles and trust policies, STS temporary credentials and session length, revoking a role's sessions, cross-account resource policies, condition keys (MFA, HTTPS), CloudTrail (2.1) |
| 2, the Mailroom (part 1) | The edge of the Cloud, the scrap field, Thornwick | S3 versioning and delete markers, lifecycle rules, root user protections, SQS (letters that hide, come back and arrive twice), EventBridge patterns (1.1) |
| 2, part 2 | The Dead Letter Office, the Inquisition's Tower | Lambda timeouts, memory and CPU, concurrency, failed async events, layers; Kinesis with Lambda; API Gateway validation and throttling; Step Functions; queue alarms, scaling consumers, DLQ redrive; CloudWatch Logs Insights (1.1, 1.2, 4.1) |
| 3, the Granaries | Halcyon, the Cold Stores, the Abyss | S3 storage classes and retrieval, DynamoDB partition keys and hot partitions, caching (ElastiCache, DAX, API Gateway caching), Lambda versions, aliases and provisioned concurrency, a SAM stack to test first (1.3, 3.2, 4.3) |
| 4, the Sealed Floors | The Murim Alliance's mountains | Security groups vs NACLs, Cognito and JWTs, credential chain and presigned URLs, SigV4, cross-service auth, KMS envelope encryption, key policies, rotation, cross-account keys, ACM, Secrets Manager and Parameter Store, masking PII in logs, Macie (2.1, 2.2, 2.3) |
| 5, the Machine Floors | The Arcanum's city, the Workshops, the Records Floors, the Astronomy Tower | CloudFormation and SAM templates, CodePipeline, CodeBuild and CodeDeploy, canary and blue/green, rollbacks, Elastic Beanstalk, API Gateway stages, stage variables and custom domains, AppConfig feature flags, CloudWatch metrics, embedded metric format, dashboards, X-Ray annotations and traces, ECS task roles (3.1–3.4, 4.1, 4.2) |
| 6, the Mirror Floors | Twinwater's two shores and the mirror lake | Health checks and readiness, quota alarms, CloudFront and API Gateway cache keys, StackSets and environments, multi-Region and replication (mostly SAA-C03 ground) (3.4, 4.2, 4.3) |
| 7, Root | Floor 100 and the camp the night before | The finale: sessions and revoking them, the policy book (policy evaluation), root and MFA, shared responsibility, least privilege; Freya's last fight mixes every band (review of all four domains) |

## 5. The shared learning engine

Every mode is built on the same shell, so these rules hold everywhere:

- **Honest confidence.** Each answer is staked Guess, Think so or Sure: right pays +1/+2/+3, wrong costs 0/−1/−3. Sure only pays when you'd be right more than 2 times in 3, so always pressing Sure loses. Results screens show a calibration readout.
- **The whole stem, no hints before you commit.** Most modes put their bank question on the plain exam screen as the "debrief" after the game's action, so the game teaches the idea and the exam screen tests it.
- **The Wall of misses.** A Sure miss (in some modes, every miss) goes up as a poster. It comes back as its twin (the same rule in a new scenario), and comes down only after two different questions on that idea are right on two different days.
- **Spaced review:** Leitner boxes at 1, 3, 7, 14 and 30 days. With exam prep on, nothing falls due later than two days before the exam (Nov 28).
- **Verified first.** Modes pick verified questions first and say when they top up with unchecked ones ("Not verified yet").
- **Type it once and Terms I own.** Modes ask you to type an AWS term (`kms:Decrypt`, `VisibilityTimeout`) from memory; the Terms I own page lists every term typed, its recall level and when it's due.
- **Huh??? and ELI5 help** on every concept and question, and Pip's "Why did that work?" on results screens.

## 6. The game modes

Exam domains: **D1** Development with AWS Services (32%), **D2** Security (26%), **D3** Deployment (24%), **D4** Troubleshooting and Optimization (18%). The design is one game per domain (the Sorting Floor and Mira's Kitchen for D1, the Night Watch for D2, Architect's Draft for D3, the Fire Drill for D4), plus Incident Commander on D1 and D4, and modes that draw on all four.

| Mode (host) | Domains | Length | In one line |
|---|---|---|---|
| Incident Commander (Uptima) | D4, D1 | 15–20 min | One on-call shift: 3 waves of incidents on the request path, then a major incident. The right answer is the fix. |
| The Fire Drill (Uptima) | D4 | about 20 min | A small system with a hidden fault. Read the metrics and traces, change settings, redeploy. |
| Mira's Kitchen (Mira) | D1 (task 1.2) | about 15 min | The kitchen is one Lambda function. Set its configuration, fire it, read every result. |
| The Sorting Floor (Dutch) | D1 | about 18 min | Every claim is a workload; build the queue-and-function architecture that handles it. |
| The Lost and Found (Dutch) | All four | about 18 min | A short deckbuilding run: stake cards on a domain-stamped check before you read it, then prove it. |
| The Night Watch (Seo-yeon) | D2 | about 10 min | Set the castle's locks and keys (resource and identity policies) so errands work and thieves don't. |
| The Night Watch, walkable (Seo-yeon) | D2 | about 20 min a day and night | The same Security content as a walkable town by day and castle patrol by night, nine of each. |
| Architect's Draft (Ayo or Coo, foreman) | D3 | about 18 min | Renovate a lived-in quarter: pick how to ship each new version, then see it run sound and cracked. |
| The Look-Alike Cup (Kagemaru) | All four | 15–20 min | A board game of look-alike services: lay a pin that really does the job, or call his fake. |
| Monster Hunt (Bru) | Your misses | about 12 min | Each poster on the Wall is a monster: type the answer, beat its twin, say why the closest wrong option fails. |
| Exam Sprint: the Proving Road (Lexi) | All four | 26 min | Ten questions on a 20:00 clock at exam pace, judged only at the end. |
| Terms I own | Every term typed | a few min | Every AWS term you've typed, grouped by exam task, with the due ones asked from memory. |

Multiplayer (online parties for the story dungeons) is the carousel's last card. A separate prototype page (`rush.html`, "The Rush") isn't part of the main game.

### Incident Commander

- **AWS services:** API Gateway, Lambda, DynamoDB, SQS, S3 (the request path), plus about 1 question in 4 due from other topics.
- **Skills:** reading a symptom (an error, throttling, a timeout, latency) and picking the fix; triage under time pressure. D4 task 4.1 (debug defects) and 4.3 (optimize), D1 tasks 1.1–1.3.
- **Mechanics:** a pager board with clocks counted in answers and moves, never seconds. Each card shows its symptom and a page cost (SEV-3/2/1 = 10/15/25% of the error budget), so "lowest clock first" is a trade-off. A miss stays open as its twin for one retry. From shift 2 a request-path map adds walking (each step costs every clock a tick), a runbook detour, and format items: **Predict** (what Lambda does next) and **Spot the line** (find the faulty line) on S3, SQS, DynamoDB and API Gateway. From shift 3, a free pick between waves.

### The Fire Drill

- **AWS services:** API Gateway (throttling, usage plans and API keys, Lambda authorizers and their cached policies, caching and cache keys), SQS (visibility timeout, FIFO message groups, DLQ), Lambda (cold starts, provisioned concurrency, partial batch responses, Kinesis stream retries, its role), DynamoDB (partition keys, eventually consistent reads through DAX), KMS key policies, Secrets Manager rotation, CodeDeploy canary vs AllAtOnce, SNS subscription filter policies, Step Functions retriers, S3 uploads, ElastiCache lazy loading vs write-through and TTL. Signals are CloudWatch metric names and X-Ray trace map colours.
- **Skills:** D4 end to end: tasks 4.1 (find the cause from metrics, logs and traces), 4.2 (instrumentation), 4.3 (concurrency, caching, retries with backoff). The fault usually shows at a different station from the one that caused it.
- **Mechanics:** four stations, each owned by a lead: Seo-yeon the Gate (API Gateway and callers' retries), Mira the Queue (SQS), Kai the Function (Lambda) and Dutch the Store (DynamoDB and its KMS key). You're the incident commander: up to 3 changes a deploy and 3 deploys a drill. Deterministic, so the same settings always give the same result. Twenty-one drills, among them Retry Storm (immediate retries of a 429), The Hot Key (`status` as partition key), The Bad Canary, The Locked Vault (a rotated secret read once and cached), The Forged Pass (an authorizer policy cached for 5 minutes), The Wrong Receipt (a cache key missing `customerId`), The Poison Batch (no partial batch response, no DLQ), Single File (one FIFO group ID) and The Midnight Batch (the boss). The debrief is one verified bank question on the drill's cause.

### Mira's Kitchen

- **AWS services:** Lambda, with API Gateway (proxy integration) and S3 (async invoke) as callers.
- **Skills:** D1 task 1.2 (develop code for Lambda): memory and the CPU that comes with it (128 MB to 10,240 MB), the timeout (3 seconds by default, up to 900), init code outside the handler (cold vs warm starts), the proxy integration's `statusCode` and `body` (anything else is a 502), async retries (two more tries by default) and on-failure destinations or DLQs, environment variables per stage, provisioned concurrency (on a version or alias, never `$LATEST`), and GB-second billing.
- **Mechanics:** the recipe card is the function's code and configuration (Bram's book shows it as real code). Five orders a night (breakfast at the counter, the photo pantry, two kitchens one recipe, the banquet toast, the dinner rush), up to 3 firings an order. Each plate says what Lambda did: served, late, 502, timed out, wrong pantry, lost or kept.

### The Sorting Floor

- **AWS services:** SQS standard and FIFO queues, dead-letter queues and redrive, SNS fan-out with filter policies, Lambda concurrency (reserved concurrency, 429 `TooManyRequestsException`), SDK retries with exponential backoff and jitter.
- **Skills:** D1 task 1.1 (messaging, fault-tolerant code, loose coupling) and 1.2 (Lambda with SQS): at-least-once delivery, visibility timeout (30 seconds by default, up to 12 hours, at least 6x the function timeout), the 5-minute FIFO deduplication interval, `ReportBatchItemFailures`.
- **Mechanics:** tickets come down Dutch's chute each turn; cards are the services between the chute and the clerks, and a played piece stays on the floor, so the deck you build is the architecture you run. Parked tickets cost less than lost ones, unless redriven. Opened from the Lost and Found card's chooser (two doors).

### The Lost and Found

- **AWS services:** the whole DVA-C02 bank.
- **Skills:** all four domains in exam weight (4 / 3 / 3 / 2 per 12 checks, one slot tilted to the weakest domain). Nights 2 to 5 add question formats by homeland: Compare (Mira), Spot the line (Seo-yeon), Predict (Kai), Sequence (Dutch), with partly-right scoring.
- **Mechanics:** a short deckbuilder: a hand of 4, 3 Capacity, an 8-card starter. Each door shows its domain stamp; you stake cards before the check opens, and the confidence button sets how hard they land. Unstaked capacity still plays (Patch or Guard), so no hand is dead. The Hunch is the boss: every unspent room check becomes a loose proof against you.

### The Night Watch (and its walkable version)

- **AWS services:** API Gateway authorizers (Cognito user pool JWTs vs API keys vs IAM/SigV4), IAM identity policies (least privilege on DynamoDB `PutItem`), role trust policies (`sts:AssumeRole`), cross-account S3 (both the bucket policy and the caller's identity policy must allow), KMS key policies and envelope encryption (`Encrypt` takes at most 4,096 bytes; `GenerateDataKey` for anything bigger, or SSE-KMS), Secrets Manager rotation and the Parameters and Secrets Lambda extension's cache (300 seconds by default), Parameter Store SecureString, secrets in environment variables, PII masking in CloudWatch Logs.
- **Skills:** D2 only, tasks 2.1 (authentication and authorization), 2.2 (encryption) and 2.3 (sensitive data).
- **Mechanics:** a castle of 13 rooms on four floors, each an AWS resource. By day, the town's gossip says which lock is wrong. You set each lock (a resource policy) or key (an identity policy) to one tile: the narrow fix, one that works but is too wide (fined at dawn: a star key, rotation off, logs off), one that blocks the worker, or one that leaks. Dawn scores three candles (every errand done, no thief, no spare keys), then one verified D2 question. Nine nights; night 9 is the Long Night, where every missed breach returns. The walkable version adds a day walk with quests and a relationship system, a timed night patrol to find and fix breach markers, hired watchers, a shop and three endings.

### Architect's Draft (the Renovation)

- **AWS services:** Elastic Beanstalk deployment policies (all at once, rolling, rolling with additional batch, immutable, traffic splitting, and blue/green by CNAME swap), Lambda with CodeDeploy (`Canary10Percent5Minutes` and the other canary, linear and all-at-once configurations, an alias over two published versions, CloudWatch alarms that roll back, `BeforeAllowTraffic`/`AfterAllowTraffic` hooks), CloudFormation (stacks and `DeletionPolicy`).
- **Skills:** D3 task 3.4 (deployment strategies, rollbacks) and 3.3 (IaC), plus the exam's multiple-response format (Select TWO / Select THREE), which this mode was built to train.
- **Mechanics:** three districts (Beanstalk Row, the Shrine Bridge for Lambda aliases, the Blueprint Office for CloudFormation). Each job is a client's building with constraints chalked on the gate (nobody turned away, at most N soot if it cracks, rent at most N extra, done by sundown, everyone back on the old version within N ticks). You pick a plan; Sir Seymour Backups runs it twice, once with a sound release and once with a cracked beam. Five jobs a night ending on a Grand Opening. A wrong debrief leaves the building under scaffolding until its Wall poster comes down.

### The Look-Alike Cup

- **AWS services:** the classic look-alike sets: SQS vs SNS vs EventBridge vs Kinesis Data Streams; KMS vs Secrets Manager vs Parameter Store; CodeDeploy for Lambda vs Elastic Beanstalk policies; CloudTrail vs CloudWatch alarms vs Logs Insights vs X-Ray (annotations are indexed, metadata isn't); provisioned vs reserved concurrency, versions vs aliases.
- **Skills:** all four domains, aimed at the exam's distractors: telling apart services that sound right but don't do the job.
- **Mechanics:** a nine-square felt board. Each square is a job written as a need ("every guild gets every order"). Lay a service pin that really does it, or call Kagemaru's pin a fake; every pin is tested by what the service really does. Three in a line wins. The questions come after the board as his bill: one per thing owed, up to 3.

### Monster Hunt

- **AWS services:** whatever is on your Wall.
- **Skills:** turning misses into durable knowledge. After a practice test, "Report a sighting" logs the topic of each miss and spawns wild monsters on those topics.
- **Mechanics:** 3 monsters a hunt, oldest first, from different topics. **Track:** type the answer before the options show. **Fight:** its twin. **Pin it down:** pick why the closest wrong option doesn't fit. Captured (poster down), wounded (back tomorrow) or escaped (back later on a different twin).

### Exam Sprint: the Proving Road

- **AWS services:** the whole bank, from 10 reserved questions per run that no other mode shows.
- **Skills:** pacing and test-taking: 1:45 a question, marking and coming back, not overthinking.
- **Mechanics:** ten patches on a one-way road, 20:00 on the clock, 3 markers, no verdict until Lexi's Lamp House debrief (pace log, an if-then plan). A practice patch first, then Route 1 (with pace aids, scheduled Nov 24) and Proctor's Pass (exam conditions, Nov 28). After both, free roads draw from the verified bank.

## 7. Exam tools outside the modes

- **Today card** (Uptima): one short set a day (15 questions on a phone, 25 on a wide screen), two thirds due reviews and one third new questions weighted to the weakest domain, readiness by domain, and the Wall.
- **Topic drills:** pick a topic, a commonly confused pair or a pack, get 10, 15 or 20 questions with the explanation, AWS docs links and the verified record after each answer.
- **Exam Hall:** timed mocks that play like the exam (no feedback until you submit, flags, a question grid, a review screen, a scaled score out of 1,000 with 720 to pass). Three fixed DVA-C02 forms: a 33-question half mock (65 minutes) and Mocks A and B (65 questions, 130 minutes each), then practice mocks from the bank.

## 8. Coverage by domain

| Domain | Modes that teach it | Story chapters |
|---|---|---|
| D1 Development (32%) | Mira's Kitchen, the Sorting Floor, Incident Commander, plus the all-domain modes | 2, 2 part 2, 3 |
| D2 Security (26%) | The Night Watch (both versions), plus the all-domain modes; the Fire Drill touches KMS, secrets and authorizers | 1, 4, 7 |
| D3 Deployment (24%) | Architect's Draft, plus the all-domain modes; the Fire Drill's Bad Canary | 3 (SAM, aliases), 5, 6 |
| D4 Troubleshooting (18%) | The Fire Drill, Incident Commander, plus the all-domain modes | 2 part 2 (Logs Insights), 5 |

All-domain modes: the Lost and Found, the Look-Alike Cup, Monster Hunt, Exam Sprint, the Today card, topic drills and the Exam Hall.

**Thin spots:** Step Functions appears in chapter 2 part 2 and one Fire Drill drill only; Elastic Beanstalk is now well covered by Architect's Draft (it was thin on Nov 15). ECS/ECR, AppSync, Amplify, CDK and Amazon Q Developer exist only as bank questions (5 to 15 each), not as game mechanics. There's no DVA-C03 track (no Bedrock, Bedrock AgentCore, Kiro, or securing AI services).

## 9. What changed since the Nov 15 and Nov 16 hand-offs

- **Verified records exist now:** 761 of 951 DVA-C02 questions (Nov 15: none). The 58 fixes the check made are already in the bank.
- **New modes since the Nov 16 schedule:** the Fire Drill, Mira's Kitchen, the Sorting Floor, the Night Watch (both versions) and Terms I own. Architect's Draft became the Renovation (deployment strategies), the Look-Alike Cup became the Counterfeit Table (pins tested against real behaviour), and the Lost and Found's nights 2 to 5 are built.
- **The bank grew** from 671 to 951 DVA-C02 questions (1,099 to 1,379 in all), mostly twins, so a miss can return in a new scenario.
- **The Nov 16 schedule** in `isekaid_into_the_cloud_game_schedule.md` still holds for its fixed dates (Route 1 on Nov 24, Proctor's Pass on Nov 28). For the domain days, the new one-domain modes fit better: Night Watch on Security days, Architect's Draft on Deployment days, the Fire Drill on Troubleshooting days. As before, send any calendar change back to this project for Ladi's approval rather than editing it directly.

## 10. How the job hunt agent can use this

- **Interview prep:** for AWS-heavy roles, each mode is a concrete talking point on an AWS behaviour Ladi has drilled (for example "a FIFO queue with one message group ID caps Lambda at one batch at a time", "an API key isn't authorization", "a canary with a CloudWatch alarm rolls back on its own"). Frame them as what Ladi studied, not production experience.
- **Product and design talking points** (true, and safe with the "designed and directed" framing): deterministic, pure rule engines shared by several modes (`aws-sim.js`, `aws-sim-ops.js`, `aws-deploy.js`) with each rule tied to a docs link; headless simulators that tune every mode so no fixed strategy always wins; a per-question verification record with quoted sources; an on-device embedding checker with no server; a Cloudflare Workers deploy with Durable Objects for multiplayer rooms and cloud saves on the Free plan; offline play through a service worker; 72 automated check scripts (56 of them drive a real browser with Playwright).
- **Resume suggestions:** none are pressing. If the agent proposes any, it should be "Confirm first:", and it shouldn't add the AWS certification before a pass.
- **After Nov 30:** if a DVA-C03 retake is needed, the Nov 15 status doc's section 8 estimate still stands. Nothing is planned before the exam.

## Sources

- AWS DVA-C02 exam guide (domains and weights): https://docs.aws.amazon.com/aws-certification/latest/developer-associate-02/developer-associate-02.html
- DVA-C02 last day Nov 30, 2026; DVA-C03 from Dec 1, 2026: https://aws.amazon.com/blogs/training-and-certification/updated-aws-certified-developer-associate-registration-now-open
- SQS payload up to 1 MiB (Aug 2025): https://aws.amazon.com/about-aws/whats-new/2025/08/amazon-sqs-max-payload-size-1mib
- SQS visibility timeout: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Lambda with SQS (6x rule, partial batch responses): https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html, https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- Lambda memory and timeout: https://docs.aws.amazon.com/lambda/latest/dg/configuration-memory.html, https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html
- Lambda async error handling: https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-error-handling.html
- KMS key policies and rotation (90 to 2,560 days, 365 by default): https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html, https://docs.aws.amazon.com/kms/latest/developerguide/rotating-keys-enable.html
- Parameters and Secrets Lambda extension (TTL 300 seconds by default): https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html
- API Gateway usage plans ("don't use API keys for authentication or authorization"): https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- Elastic Beanstalk deployment policies: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.deploy-existing-version.html
- CodeDeploy deployment configurations for Lambda: https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html
