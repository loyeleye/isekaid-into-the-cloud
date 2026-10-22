// Chapter 5, the Machine Floors (floors 61 to 80): everything the raid engine (js/raid.js) plays, as data. The concepts
// with their links, the new cards (what the overworld's minigames hand you, and the floors' rewards), the curses of
// these floors and the Plot Devices that lift them, the enemies (their art is in js/c5-art.js), the Field Notes and
// Policy Sorts, the events, and three expeditions, one floor per boss the Story Bible names:
//   The Workshops (Easy, 2 floors)          the Forge (the Forge Master), the Assembly Line (the Line Itself)
//   The Records Floors (Medium, 3)          the Janitor's Closet (the Mop Bucket), the Lecture Halls (the Dean), the
//                                           Healers' Ward (the Night Nurse)
//   The Astronomy Tower (Hard, 4)           the Staff Stair (the Stair Itself), the Relay Floor (the Relay Keeper), the
//                                           Clocktower (Midnight), the Observatory (Iris Vell)
// Ids carry an x5 prefix (cards and sprites x5-, enemies, notes, sorts and events x5...) so they never meet another
// chapter's. The overworld and story are js/c5-world.js; the Huh??? and ELI5 lines js/c5-help.js. AWS facts follow the
// current AWS documentation (EC2, Auto Scaling, Elastic Load Balancing, ECS, EKS, Fargate, Batch, Elastic Beanstalk,
// CodePipeline, CodeBuild, CodeDeploy, CloudFormation, SAM, CloudTrail, S3 logging, CloudWatch, X-Ray, API Gateway,
// AppConfig, Athena, Glue, Lake Formation and the AI services). Every explanation is written fresh.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const D = SD.c5data = {};

  // ---------- Concepts ----------
  const C = (name, gist, page) => ({ name, zone: 5, gist, page });
  Object.assign(SD.concepts, {
    ec2buy: C('EC2 Instance Types and Purchase Options', 'Instance families are shaped for the work: general purpose (M, T), compute optimized (C), memory optimized (R, X), storage optimized (I, D), accelerated (P, G). T instances are burstable: they earn CPU credits below a baseline and spend them above it, so a busy-all-day job belongs on a fixed-performance type. On-Demand is pay as you go; Reserved Instances and Savings Plans trade a 1- or 3-year commitment for a discount (Convertible RIs and Compute Savings Plans let you change family); Spot uses spare capacity at a deep discount with a two-minute warning, for work that can stop. Hibernation saves RAM to the encrypted EBS root volume, so a stopped instance wakes with its memory.', 'Bigger isn\'t more. More is more. — Ayo, chalked on the forge wall'),
    scaling: C('EC2 Auto Scaling', 'An Auto Scaling group keeps a fleet between its minimum and maximum, across Availability Zones, and replaces unhealthy instances. Target tracking holds a metric near a target (average CPU, requests per target, or your own backlog per instance); step and simple policies react to alarms; scheduled actions change capacity at set times; predictive scaling launches ahead of a forecast. Warm pools keep pre-initialized instances ready, lifecycle hooks pause an instance while it launches or terminates, and an instance refresh rolls out a new launch template a few at a time.', 'Scale out, not up. And scale on the thing that\'s actually full. — Kyu\'s page 8'),
    loadbal: C('Load Balancers and Health Checks', 'An Application Load Balancer works at layer 7: HTTP and HTTPS, routing rules by path, host or header, weighted target groups, stickiness, and Lambda targets. A Network Load Balancer works at layer 4: TCP, UDP and TLS, very high throughput, static IPs. A Gateway Load Balancer passes all IP traffic through a fleet of virtual appliances such as firewalls. Each sends traffic only to targets that pass its health check, so the check must test what a real request needs; an Auto Scaling group can use those checks to replace failing instances.', 'A target that answers "fine" and fails every customer is the worst kind of liar. — the Forge\'s door'),
    containers: C('ECS, EKS and Fargate', 'ECS runs containers from task definitions; EKS runs Kubernetes with a managed control plane. Either can run on EC2 instances you manage or on Fargate, which removes the servers. ECS has two roles: the task execution role lets ECS pull the image from ECR, send logs and fetch secrets before the app starts; the task role gives the app\'s own code its AWS credentials. Images are pinned by digest when a deployment starts, so retagging needs a new deployment; slim images start faster. Services scale their task count with Application Auto Scaling.', 'One task, one job, one role that lets it do its job. — Kaito, eventually'),
    ebdeploy: C('Elastic Beanstalk Deployment Policies', 'Elastic Beanstalk runs your app on EC2 with load balancing, scaling and health monitoring set up for you. Its deployment policies: all at once (fast, with downtime), rolling (batches, less capacity while it runs), rolling with additional batch (an extra batch first, so capacity stays full), immutable (a fresh set of instances in a temporary Auto Scaling group, then swapped in; the safest rollback), and traffic splitting (a percentage of traffic to new instances for an evaluation period). Blue/green is a second environment and a CNAME swap. .ebextensions files end in .config.', 'Update the old forge without letting the fire go out. — Ayo'),
    edgecompute: C('Batch, Migration, and AWS Outside the Region', 'AWS Batch queues jobs and provisions right-sized compute for them (EC2, Spot or Fargate), with retries and array jobs. Application Migration Service (now AWS Transform MGN) lifts whole servers onto EC2 with continuous block-level replication. Outposts puts AWS racks in your own building; ECS Anywhere and EKS Anywhere run your containers on your own servers; EKS Distro is the Kubernetes EKS uses, for you to run; EKS Hybrid Nodes join your servers to an EKS cluster; Wavelength Zones put compute at the edge of a carrier\'s 5G network.', 'Some forges have to stay in the village. Bring the tools to them. — Kaito'),
    cicd: C('CodePipeline and CodeBuild', 'CodePipeline runs a release through stages: source, build, test, deploy, with actions in each and artifacts passed between them. A manual approval action pauses it until someone approves, and the same artifact that passed testing continues. CodeBuild runs a buildspec (install, pre_build, build and post_build phases, artifacts, reports and caches) in a fresh container; secrets come from Secrets Manager or Parameter Store at build time. V2 pipelines can trigger on Git tags or branches and roll a failed stage back automatically.', 'For the first time, the fix ships without anyone touching it. — the camp table'),
    iac: C('CloudFormation, SAM and the CDK', 'A CloudFormation template declares resources and a stack creates them; a change set previews what an update will add, modify or replace before anything happens, and drift detection shows what was changed by hand. Rollback triggers watch alarms during an update. Nested stacks reuse a component; StackSets deploy one template to many accounts and Regions. DeletionPolicy and UpdateReplacePolicy keep data. SAM adds serverless shorthand (and deploys through CloudFormation); the CDK writes templates from code. CodeArtifact serves packages to builds.', 'Read the change set. Then read it again. — Ayo\'s post-mortem for Pingsby'),
    trailproof: C('CloudTrail: Data Events, Integrity and Lake', 'CloudTrail records API calls with who made them, from where and when. Management events (changing resources) are recorded by default, and event history keeps 90 days of them in every account with no setup. Data events (reading and writing inside a resource: S3 GetObject and PutObject, Lambda Invoke, DynamoDB item calls) are off until you add them to a trail or event data store, and cost extra. A trail delivers to S3 for as long as you keep it; log file integrity validation adds signed hourly digests so you can prove no file was changed or deleted. CloudTrail Lake keeps events in event data stores and queries them with SQL.', 'The wards logged who changed the rooms. Not who read the pages in them. — Dutch'),
    familiars: C('The AI Services', 'Each AI service does one job through an API, with no model to train: Polly speaks text aloud, Transcribe turns speech into text (and can redact PII), Translate translates, Textract reads forms, tables, receipts and IDs, Rekognition sees faces, objects, unsafe content and protective gear, Comprehend understands text (sentiment, entities, PII, custom classes), and Lex holds a conversation by voice or text. SageMaker AI is for training and serving your own models; Amazon Q Developer helps write, test and fix code; Device Farm tests apps on real phones; Kinesis Video Streams carries live video.', 'Ask each familiar its own question. — the Lecture Halls\' first rule'),
    datalake: C('The Data Lake: Athena, Glue, Lake Formation', 'Keep the data in S3 and query it where it sits. Glue crawlers find schemas and fill the Glue Data Catalog; Glue ETL jobs convert data (job bookmarks skip what\'s done). Athena runs SQL on S3 and charges by the bytes it scans, so partitions (skip whole folders), compression and a columnar format such as Parquet (read only the columns asked for) make the same question far cheaper. Lake Formation adds permissions down to columns and rows. Quick Sight draws dashboards; EMR runs Spark and Hadoop for heavy jobs; Data Exchange sells outside data.', 'Two hundred years of trials, and you only need to read one column. — Pella'),
    metrics: C('CloudWatch Metrics and Alarms', 'Services publish metrics; your code adds custom metrics with PutMetricData or, cheaper and easier, by writing logs in the embedded metric format (EMF), which CloudWatch turns into metrics on its own. Every unique set of dimension values is a separate metric, so never use a request ID as a dimension. An alarm watches a metric against a threshold and acts (SNS, Auto Scaling, a rollback); composite alarms combine others; missing data can count as fine. Dashboards are for people looking; alarms are for when nobody is.', 'A dashboard nobody opens at 23:40 is a painting. — the Healers\' Ward'),
    structlogs: C('Structured Logs and Logs Insights', 'Log one JSON object per event, with fields such as requestId, level and orderId, and CloudWatch Logs Insights discovers the fields so you can filter, sort and aggregate without parsing (Lambda\'s JSON log format adds level and requestId for you). Metric filters turn matching log events into metrics; subscription filters stream them to Lambda, Kinesis or Firehose. Logs are the detailed record; metrics and alarms watch for known trouble; Managed Grafana and Managed Service for Prometheus suit teams who already use those tools.', 'A scream nobody can search is just noise. — the Night Nurse\'s chart'),
    deploycfg: C('CodeDeploy: Configurations, Hooks and Rollback', 'CodeDeploy deploys to EC2 and on-premises servers, Lambda and ECS. The AppSpec file names the revision and its lifecycle hooks: on EC2, ApplicationStop, BeforeInstall, AfterInstall, ApplicationStart and ValidateService; for Lambda, BeforeAllowTraffic and AfterAllowTraffic hook functions that report back with PutLifecycleEventHookExecutionStatus. Deployment configurations set the pace: all at once, canary (one slice, a wait, then the rest) or linear (equal steps). Alarms on the deployment group stop it, and automatic rollback redeploys the last good revision.', 'Every midnight job gets its own pace, and an alarm that can stop it. — Cron'),
    s3access: C('S3 Server Access Logs and Data Events', 'Two ways to know who touched your objects. CloudTrail data events record object-level calls with the caller\'s IAM identity, are delivered reliably within minutes, and can go to CloudWatch Logs or EventBridge; they cost per event. S3 server access logs record every request with its status, bytes, referrer and timing, are delivered on a best-effort basis, usually within hours, and cost only their storage. Send access logs to a separate bucket in the same Region, never back into the bucket being logged.', 'Lina\'s ward: on a week before she needed it. — the Staff Stair'),
    integdebug: C('Debugging Service Integrations', 'When one service calls another for you (EventBridge to a target, S3 to Lambda, Step Functions to a task), a failure can happen before your code ever runs, so your own logs are empty. Look at the integration\'s side: EventBridge\'s FailedInvocations metric and a dead-letter queue on the target (each failed event kept with its error), Lambda\'s on-failure destinations for asynchronous calls, Step Functions\' execution history. Most silent failures are a missing resource-based permission or a role the service can\'t assume.', 'Two machines, a gap between them, and nobody watching the gap. — the Lift Operator'),
    tracing: C('X-Ray and Distributed Tracing', 'A trace follows one request through every service it touches. Each service adds a segment, and subsegments time its downstream calls (instrument the AWS SDK and HTTP clients, or they don\'t show). Annotations are indexed key-value pairs you can search and group on; metadata is extra detail you can read but not search. The trace header must be passed along at every hop or the trace breaks. Sampling rules decide how many requests are traced; the service map colors each node by its errors and throttling. OpenTelemetry (ADOT) is the recommended way to instrument.', 'The relay map shows every hop, and how long each one took. — Theo'),
    stages: C('API Gateway Stages and Releases', 'An API Gateway deployment is a snapshot of the API; a stage (dev, test, prod) serves one deployment at its own URL, with its own throttling, caching, logging and stage variables. A stage variable can name the Lambda alias each stage calls, so one API definition serves every environment (each alias needs its own invoke permission). Changes reach a REST API stage only when deployed; a canary on a stage sends a share of traffic to a new deployment. Custom domains map paths to stages. Amplify Hosting deploys each connected Git branch to its own URL.', 'Test traffic goes to test. Every time. — the Clocktower\'s first bell'),
    appcfg: C('AppConfig and Feature Flags', 'AWS AppConfig deploys configuration and feature flags separately from code. A configuration profile can carry validators (a JSON Schema or a Lambda function) that check each version before it rolls out; a deployment strategy rolls it out gradually; a CloudWatch alarm can roll it back automatically. Functions read it through the AppConfig Agent Lambda extension, which caches it locally. Keep configuration outside the package, so one tested artifact runs in every environment.', 'Flip a flag slowly, with an alarm on it, and you can flip it back. — Cron'),
    shifting: C('Lambda Aliases and Traffic Shifting', 'A Lambda version is an immutable snapshot of a function\'s code and configuration; an alias is a named pointer to a version, and a weighted alias splits traffic between two versions. CodeDeploy (or SAM\'s DeploymentPreference) shifts an alias from the old version to the new one: canary (10 percent, a wait, then all), linear (equal steps) or all at once, watching alarms on the new version\'s errors and rolling back if one fires. Blue/green is the wrong choice when both versions can\'t share the same data, or you can\'t afford two of everything.', 'Ten percent. Hold. Twenty-five. Hold. And an alarm on every step. — the traffic bar')
  });
  SD.links.push(
    { id: 'ec2buy-scaling', a: 'ec2buy', b: 'scaling', text: 'An Auto Scaling group can mix On-Demand and Spot across many instance types, so the cheap capacity is spread out.' },
    { id: 'scaling-loadbal', a: 'scaling', b: 'loadbal', text: 'The group can use the load balancer\'s health checks, so a target that fails them is replaced, not just skipped.' },
    { id: 'loadbal-containers', a: 'loadbal', b: 'containers', text: 'An ECS service registers each task in a target group, and the load balancer\'s health check decides when it gets traffic.' },
    { id: 'containers-edgecompute', a: 'containers', b: 'edgecompute', text: 'The same task definitions run on Fargate, on your own servers with ECS Anywhere, or on an Outpost.' },
    { id: 'ebdeploy-deploycfg', a: 'ebdeploy', b: 'deploycfg', text: 'Beanstalk\'s immutable update and CodeDeploy\'s blue/green are the same idea: new instances first, swap when healthy.' },
    { id: 'cicd-iac', a: 'cicd', b: 'iac', text: 'A pipeline can create a change set in one action and execute it after a manual approval in the next.' },
    { id: 'cicd-deploycfg', a: 'cicd', b: 'deploycfg', text: 'The pipeline\'s deploy stage hands the artifact to CodeDeploy, which shifts traffic at the configuration\'s pace.' },
    { id: 'deploycfg-shifting', a: 'deploycfg', b: 'shifting', text: 'CodeDeploy shifts a Lambda alias\'s weights for you, and rolls them back when an alarm fires.' },
    { id: 'metrics-shifting', a: 'metrics', b: 'shifting', text: 'The rollback alarm should watch the new version\'s errors through the alias, not the whole account.' },
    { id: 'trailproof-s3access', a: 'trailproof', b: 's3access', text: 'Data events say which principal read the object; server access logs say every request, more cheaply and less reliably.' },
    { id: 'trailproof-cloudtrail', a: 'trailproof', b: 'cloudtrail', text: 'The same trail that records who changed a policy records who read a page, once data events are on.' },
    { id: 'metrics-structlogs', a: 'metrics', b: 'structlogs', text: 'Embedded metric format is a structured log line that CloudWatch also turns into a metric.' },
    { id: 'structlogs-tracing', a: 'structlogs', b: 'tracing', text: 'Put the trace ID in every log line, and you can jump from a slow trace to exactly what the code said.' },
    { id: 'tracing-integdebug', a: 'tracing', b: 'integdebug', text: 'A trace shows the gap between two services; the integration\'s own metrics say why the call never arrived.' },
    { id: 'datalake-familiars', a: 'datalake', b: 'familiars', text: 'Transcribe the trial recordings, let Comprehend find the names, and query the results with Athena.' },
    { id: 'stages-appcfg', a: 'stages', b: 'appcfg', text: 'Stage variables pick a backend per stage; AppConfig changes behaviour without any deploy at all.' },
    { id: 'stages-shifting', a: 'stages', b: 'shifting', text: 'Each stage calls its own alias, so prod\'s alias can shift while test\'s stays put.' }
  );

  // ---------- Cards ----------
  // ch: 5 keeps them in this chapter's rewards. What the overworld teaches turns up in your deck (js/c5-world.js).
  const card = (name, cost, o) => Object.assign({ name, cost, kind: 'action', ch: 5, rarity: 'common', tags: [] }, o);
  Object.assign(SD.cards, {
    'x5-scaleout':  card('Scale Out', 1, { pow: 8, tags: ['scaleout'], art: 'globe', concept: 'scaling', text: 'Add another instance behind the balancer. Out, not up.' }),
    'x5-target':    card('Target Tracking', 2, { kind: 'infra', each: { any: 3 }, pow: 6, tags: ['target', 'scaleout'], art: 'clock', concept: 'scaling', text: 'Infra. Each turn absorb 3 load. The fleet grows and shrinks to keep one number near its target.' }),
    'x5-warmpool':  card('Warm Pool', 1, { pow: 6, draw: 1, tags: ['scaleout'], art: 'undo', concept: 'scaling', text: 'Draw 1. Instances already booted and stopped, ready to serve in moments.' }),
    'x5-spot':      card('Spot, Diversified', 1, { pow: 9, tags: ['spot', 'checkpoint'], art: 'coin', concept: 'ec2buy', text: 'Many instance types, price-capacity-optimized, and work that checkpoints: two minutes\' warning is enough.' }),
    'x5-fixed':     card('Fixed Performance', 1, { pow: 9, tags: ['fixed'], art: 'wrench', concept: 'ec2buy', text: 'A C or M instance for work that runs hot all day. No credits to run out of.' }),
    'x5-hibernate': card('Hibernate', 1, { mit: 5, draw: 1, tags: ['hibernate', 'schedule'], art: 'clock', concept: 'ec2buy', text: 'Mitigate {mit}, draw 1. Memory saved to the encrypted root volume; no instance charges until morning.' }),
    'x5-savings':   card('Savings Plan', 1, { mit: 5, abs: { any: 3 }, tags: ['reserved'], art: 'coin', rarity: 'uncommon', concept: 'ec2buy', text: 'Mitigate {mit}, absorb {any}. Commit to a steady spend; any family, Fargate and Lambda too.' }),
    'x5-health':    card('Deep Health Check', 1, { pow: 8, tags: ['health'], art: 'eye', concept: 'loadbal', text: 'A check that tests what a real request needs, not just "the process is up".' }),
    'x5-alb':       card('Path Rules (ALB)', 1, { pow: 9, tags: ['alb'], art: 'gate', concept: 'loadbal', text: 'Layer 7: route /orders, /users and /search to their own target groups on one hostname.' }),
    'x5-taskrole':  card('Task Role', 1, { pow: 9, tags: ['taskrole'], art: 'key', concept: 'containers', text: 'The app\'s own AWS calls use the task role. Not the execution role, not the instance\'s.' }),
    'x5-execrole':  card('Execution Role', 1, { pow: 7, abs: { any: 3 }, tags: ['execrole'], art: 'key', concept: 'containers', text: 'Absorb {any}. ECS pulls the image, ships the logs and fetches the secrets with it, before the app starts.' }),
    'x5-slim':      card('Slim Image', 1, { pow: 7, draw: 1, tags: ['image'], art: 'box', concept: 'containers', text: 'Draw 1. A small base image and one process: pulled fast, started fast.' }),
    'x5-fargate':   card('Fargate', 2, { kind: 'infra', each: { any: 3 }, pow: 6, tags: ['fargate'], art: 'globe', rarity: 'uncommon', concept: 'containers', text: 'Infra. Each turn absorb 3 load. The tasks run, and the servers under them are somebody else\'s problem.' }),
    'x5-immutable': card('Immutable Update', 2, { pow: 11, mit: 3, tags: ['immutable'], art: 'undo', rarity: 'uncommon', concept: 'ebdeploy', text: 'Mitigate {mit}. A fresh set of instances beside the old; if they fail, throw them away.' }),
    'x5-rolling':   card('Rolling, Extra Batch', 1, { pow: 8, tags: ['rolling'], art: 'trace', concept: 'ebdeploy', text: 'An extra batch first, so full capacity serves while the rest update in turn.' }),
    'x5-batch':     card('AWS Batch', 1, { pow: 9, tags: ['batch'], art: 'box', concept: 'edgecompute', text: 'A queue of jobs and right-sized compute for each, Spot included, retried when they fail.' }),
    'x5-outpost':   card('Outposts Rack', 2, { mit: 7, abs: { any: 4 }, tags: ['edge'], art: 'box', rarity: 'uncommon', concept: 'edgecompute', text: 'Mitigate {mit}, absorb {any}. AWS racks in your own building, for work that has to stay there.' }),
    'x5-pipeline':  card('The Pipeline', 2, { kind: 'infra', each: { any: 3 }, pow: 7, tags: ['pipeline'], art: 'trace', concept: 'cicd', text: 'Infra. Each turn absorb 3 load. Source, build, test, deploy: it ships without anyone touching it.' }),
    'x5-buildspec': card('Buildspec', 1, { pow: 8, draw: 1, tags: ['pipeline', 'build'], art: 'note', concept: 'cicd', text: 'Draw 1. Install, build, test, report: written down once, run the same way every time.' }),
    'x5-approval':  card('Manual Approval', 1, { mit: 6, tags: ['approval'], art: 'lock', concept: 'cicd', text: 'Mitigate {mit}. The pipeline waits for a person, and then ships the very artifact that passed.' }),
    'x5-changeset': card('Read the Change Set', 1, { pow: 8, reveal: true, tags: ['changeset'], art: 'eye', concept: 'iac', text: 'Reveal weaknesses. What will be added, modified, and replaced, before anything changes.' }),
    'x5-drift':     card('Detect Drift', 1, { pow: 8, tags: ['drift', 'changeset'], art: 'eye', concept: 'iac', text: 'What\'s standing tonight, against what the template says should be.' }),
    'x5-dataevents': card('Data Events, On', 1, { pow: 9, tags: ['dataevents'], art: 'eye', concept: 'trailproof', text: 'Record who read and wrote inside the resource, not just who changed it.' }),
    'x5-integrity': card('Integrity Validation', 1, { pow: 8, tags: ['integrity'], art: 'lock', concept: 'trailproof', text: 'Signed hourly digests: prove no log file was changed or deleted after delivery.' }),
    'x5-trail':     card('A Trail to S3', 2, { kind: 'infra', each: { any: 2 }, pow: 6, tags: ['trailstore'], art: 'note', concept: 'trailproof', text: 'Infra. Each turn absorb 2 load. Every event kept for as long as you keep the bucket, not 90 days.' }),
    'x5-lake':      card('CloudTrail Lake', 2, { pow: 11, tags: ['lake', 'trailstore'], art: 'globe', rarity: 'uncommon', concept: 'trailproof', text: 'Years of events from every account, asked with SQL.' }),
    'x5-askvoice':  card('Ask It to Speak or Listen', 1, { pow: 8, tags: ['speak', 'listen'], art: 'note', concept: 'familiars', text: 'Polly speaks text aloud; Transcribe writes down what was said.' }),
    'x5-askeyes':   card('Ask It to Read or See', 1, { pow: 8, tags: ['read', 'see'], art: 'eye', concept: 'familiars', text: 'Textract reads forms and receipts; Rekognition sees faces, objects and gear.' }),
    'x5-askmind':   card('Ask It to Translate or Understand', 1, { pow: 8, tags: ['translate', 'understand'], art: 'globe', concept: 'familiars', text: 'Translate changes the language; Comprehend finds the meaning, the names and the mood.' }),
    'x5-asktalk':   card('Ask It to Talk or Learn', 1, { pow: 8, tags: ['talk', 'learn'], art: 'undo', concept: 'familiars', text: 'Lex holds the conversation; SageMaker AI trains and serves your own model.' }),
    'x5-partition': card('Partition It', 1, { pow: 7, draw: 1, tags: ['partition'], art: 'box', concept: 'datalake', text: 'Draw 1. Folders by year: the query skips every year it doesn\'t need.' }),
    'x5-parquet':   card('Convert to Parquet', 2, { pow: 11, tags: ['parquet', 'catalog'], art: 'box', rarity: 'uncommon', concept: 'datalake', text: 'Columnar and compressed, and catalogued by a crawler: read only the columns asked for.' }),
    'x5-alarm':     card('Set an Alarm', 1, { pow: 8, reveal: true, tags: ['alarm'], art: 'clock', concept: 'metrics', text: 'Reveal weaknesses. A threshold on the metric, and someone woken when it\'s crossed.' }),
    'x5-emf':       card('Embedded Metric Format', 1, { pow: 8, tags: ['emf'], art: 'note', concept: 'metrics', text: 'A structured log line that CloudWatch turns into a metric. No extra calls.' }),
    'x5-structured': card('Structured Logs', 1, { pow: 8, tags: ['structured'], art: 'note', concept: 'structlogs', text: 'One JSON object per event, with the fields you\'ll want to search on.' }),
    'x5-insights':  card('Logs Insights Query', 1, { pow: 7, draw: 1, tags: ['insights', 'structured'], art: 'eye', concept: 'structlogs', text: 'Draw 1. filter, stats, sort: the ten slowest requests, with their IDs.' }),
    'x5-hooks':     card('AppSpec Hooks', 1, { pow: 8, tags: ['hooks'], art: 'note', concept: 'deploycfg', text: 'BeforeAllowTraffic tests the new version before anyone uses it, and reports back.' }),
    'x5-rollback':  card('Roll Back on Alarm', 2, { pow: 10, mit: 4, tags: ['rollback', 'alarm'], art: 'undo', rarity: 'uncommon', concept: 'deploycfg', text: 'Mitigate {mit}. The alarm fires, the deployment stops, and the last good version comes back.' }),
    'x5-accesslog': card('Server Access Logs', 1, { pow: 8, tags: ['accesslog'], art: 'note', concept: 's3access', text: 'Every request to the bucket, with its status and bytes, for the price of the storage.' }),
    'x5-logbucket': card('A Separate Log Bucket', 1, { pow: 7, abs: { any: 3 }, tags: ['separate', 'accesslog'], art: 'box', concept: 's3access', text: 'Absorb {any}. Logs go somewhere else, so logging never logs itself.' }),
    'x5-dlq':       card('Target Dead-Letter Queue', 1, { pow: 8, tags: ['dlq', 'failed'], art: 'box', concept: 'integdebug', text: 'Every event the rule couldn\'t deliver, kept with the reason why.' }),
    'x5-trace':     card('Trace It (X-Ray)', 1, { pow: 9, tags: ['trace'], art: 'trace', concept: 'tracing', text: 'One request, every hop, and how long each one took.' }),
    'x5-annotate':  card('Annotate It', 1, { pow: 8, tags: ['annotate'], art: 'note', concept: 'tracing', text: 'An indexed annotation, not metadata: now you can search for it.' }),
    'x5-propagate': card('Pass the Header On', 1, { pow: 8, tags: ['propagate'], art: 'trace', concept: 'tracing', text: 'Instrument the client, so the trace header rides along to the next service.' }),
    'x5-sampling':  card('Sampling Rule', 1, { pow: 6, draw: 1, tags: ['sampling'], art: 'eye', concept: 'tracing', text: 'Draw 1. Trace more of the path you\'re debugging, and less of the health checks.' }),
    'x5-stagevar':  card('A Stage per Alias', 1, { pow: 8, tags: ['stagevar'], art: 'gate', concept: 'stages', text: 'Each stage\'s variable names its own alias. Test traffic goes to test.' }),
    'x5-appconfig': card('AppConfig Rollout', 1, { pow: 9, tags: ['appconfig'], art: 'clock', concept: 'appcfg', text: 'The flag goes out slowly, validated first, with an alarm that can pull it back.' }),
    'x5-canary':    card('Canary, Ten Percent', 2, { pow: 11, mit: 3, tags: ['canary', 'alias'], art: 'eye', rarity: 'uncommon', concept: 'shifting', text: 'Mitigate {mit}. A tenth of the traffic first. If it lives, the rest follows.' }),
    'x5-linear':    card('Linear Shift', 2, { kind: 'infra', each: { any: 3 }, pow: 6, tags: ['linear', 'alias'], art: 'trace', concept: 'shifting', text: 'Infra. Each turn absorb 3 load. Ten percent more every minute, in equal steps.' }),
    // The Plot Devices and the boons (quests, js/c5-world.js), and Dutch's upgrade.
    'x5-blueprint': card('Ayo\'s Blueprint', 0, { pow: 8, draw: 1, tags: ['changeset', 'drift'], art: 'note', rarity: 'rare', quest: true, concept: 'iac', text: 'Draw 1. The Rewrite is lifted. "Every bent sword gets a post-mortem. Even the ones I bent."' }),
    'x5-helm':      card('Kaito\'s Helm', 0, { draw: 2, exhaust: true, tags: ['fargate', 'taskrole'], art: 'undo', rarity: 'rare', quest: true, concept: 'containers', text: 'Exhaust. Draw 2: the cards you were about to lose, back on top. "I didn\'t need help. Take it anyway."' }),
    'x5-watch':     card('Cron\'s Stopped Watch', 1, { mit: 6, abs: { any: 6 }, tags: ['rollback', 'hooks'], art: 'clock', rarity: 'rare', quest: true, concept: 'deploycfg', text: 'Mitigate {mit}, absorb {any}. Midnight Regrowth is lifted. It stopped at 23:59, and he won\'t wind it.' }),
    'x5-ledger':    card('Pella\'s Ledger', 0, { reveal: true, draw: 2, exhaust: true, tags: ['partition', 'parquet'], art: 'eye', rarity: 'rare', quest: true, concept: 'datalake', text: 'Exhaust. Reveal every weakness, and draw 2. Two hundred years, one column at a time.' }),
    'x5-turnedon':  card('Turned On', 1, { pow: 13, mit: 4, reveal: true, draw: 1, tags: ['dataevents', 'alarm', 'trace'], art: 'key', rarity: 'rare', quest: true, champ: 'dutch', concept: 'trailproof', text: 'Mitigate {mit}, reveal every weakness, draw 1. Master Key, with the data events on.' })
  });
  // The curses of these floors (the Story Bible): The Rewrite changes one card in every hand each turn, and Midnight
  // Regrowth brings a defeated enemy back on turn 6. Here each is a card that costs the team while it sits in a hand,
  // and it comes back every fight until its Plot Device lifts it.
  const curse = (name, cost, held, text) => ({ name, cost, kind: 'action', exhaust: true, rarity: 'basic', quest: true, curse: true, tags: [], art: 'undo', held, text, ch: 5 });
  SD.cards['x5-rewrite'] = curse('The Rewrite', 1, { stale: 1, grow: 1 }, 'Freya\'s template, rewriting your hand. Overwrite it for 1 Capacity (exhaust). Each end of turn it\'s still in your hand, +1 Stale and it costs 1 more. Ayo\'s Blueprint lifts it.');
  SD.cards['x5-regrowth'] = curse('Midnight Regrowth', 1, { sev: 4 }, 'Something the redeploy is growing back. Cut it for 1 Capacity (exhaust). Each end of turn it\'s still in your hand, the incident gains 4 Severity. Cron\'s Stopped Watch lifts it.');
  D.CARDS = { forge: ['x5-scaleout', 'x5-target', 'x5-warmpool', 'x5-spot', 'x5-fixed', 'x5-hibernate', 'x5-savings', 'x5-health', 'x5-alb', 'x5-taskrole', 'x5-execrole', 'x5-slim', 'x5-fargate', 'x5-immutable', 'x5-rolling', 'x5-batch', 'x5-outpost'],
    records: ['x5-dataevents', 'x5-integrity', 'x5-trail', 'x5-lake', 'x5-askvoice', 'x5-askeyes', 'x5-askmind', 'x5-asktalk', 'x5-partition', 'x5-parquet', 'x5-alarm', 'x5-emf', 'x5-structured', 'x5-insights', 'x5-buildspec', 'x5-approval'],
    tower: ['x5-accesslog', 'x5-logbucket', 'x5-dlq', 'x5-trace', 'x5-annotate', 'x5-propagate', 'x5-sampling', 'x5-stagevar', 'x5-appconfig', 'x5-changeset', 'x5-drift', 'x5-canary', 'x5-linear', 'x5-rollback', 'x5-hooks', 'x5-alarm', 'x5-dataevents'] };

  // ---------- Enemies ----------
  // F(id, name, short, cause, sev, concept, tier, flavor, symptom, weak, resist, pattern, more); the key is 'x5' + id.
  const r = n => ({ t: 'read', n }), w = n => ({ t: 'write', n }), b = n => ({ t: 'burst', n }), up = (u) => (u ? { t: 'escalate', up: u } : { t: 'escalate' });
  const E = {};
  const F = (id, name, short, cause, sev, concept, tier, flavor, symptom, weak, resist, pattern, more) => {
    E['x5' + id] = Object.assign({ name, short, cause, sev, concept, tier, sprite: 'x5-' + id, flavor, symptom, weak, resist, pattern, ch: 5, raid: true }, tier === 2 ? { elite: true } : tier === 3 ? { boss: true } : {}, more);
  };
  // Floor 1, the Forge
  F('golem', 'The Overworked Golem', 'Golem', 'One machine made bigger and bigger, never more of them', 28, 'scaling', 1, 'He can only get bigger. He has never once got more.',
    'One huge instance serves every request. When it reboots for a resize, the whole forge goes dark.',
    { scaleout: 'Several instances behind a load balancer, in more than one AZ: more, not bigger.', target: 'Let target tracking add golems when they\'re busy.' },
    { fixed: 'A bigger, steadier golem is still one golem.', allow: 'Permissions don\'t add capacity.' }, [w(6), r(7), b(7)]);
  F('reclaim', 'The Spot Reclaimer', 'Spot Reclaimer', 'Takes your cheapest worker back with two minutes\' notice', 26, 'ec2buy', 1, 'He gives two minutes\' warning. He always gives two minutes\' warning.',
    'Overnight renders run on one Spot instance type in one AZ. Every interruption restarts a three-hour job from the beginning.',
    { checkpoint: 'Checkpoint the work, so an interruption costs minutes, not hours.', spot: 'Many instance types and AZs, price-capacity-optimized: fewer interruptions at Spot prices.' },
    { reserved: 'A three-year reservation for a job that runs a few nights a month.' }, [r(6), w(7), b(7)]);
  F('burst', 'The Burstable Apprentice', 'Apprentice', 'Fast until his CPU credits run out', 26, 'ec2buy', 1, 'He sprints. Then he stops, and sits down, and won\'t get up.',
    'A t3 instance runs a pricing job at 80 percent CPU all day. Its credit balance hits zero and it\'s held to its baseline.',
    { fixed: 'Work that runs hot all day belongs on a fixed-performance C or M instance.' },
    { scaleout: 'More apprentices run out of credits too.', hibernate: 'Sleep doesn\'t earn him the credits he spends all day.' }, [w(7), r(6), up()]);
  F('night', 'The Night Shift', 'Night Shift', 'A machine paid for all night that nobody uses until morning', 24, 'ec2buy', 1, 'He clocks in at six. He sits there until nine the next morning.',
    'An analytics instance runs around the clock so its 40-minute cache load is done by 9 AM. Nobody uses it after 6 PM.',
    { hibernate: 'Hibernate it at night: the memory is saved, the instance charges stop, and it wakes warm.', schedule: 'A schedule that stops it after hours.' },
    { reserved: 'Reserving an idle machine just pays less for idling.' }, [r(6), r(6), b(7)]);
  F('liar', 'The Health-Check Liar', 'Health-Check Liar', 'A target that answers its health check and fails every real request', 46, 'loadbal', 2, 'He says he\'s fine. He says it every thirty seconds.',
    'The target group checks GET /ping, which returns 200 while the app\'s database connection is dead. Every customer gets a 500.',
    { health: 'A deep health check that tests what a real request needs, so the balancer stops sending him traffic.', alb: 'The ALB only routes to targets that pass. Make passing mean something.' },
    { scaleout: 'More liars, all saying they\'re fine.', target: 'Scaling on CPU won\'t notice: lying is cheap.' }, [r(9), w(10), up(), b(11)]);
  F('forgemaster', 'The Forge Master', 'Forge Master', 'Scales out to a fleet behind a load balancer; your capacity must keep up with his', 80, 'scaling', 3, 'He brings more hammers every turn. Match him, or be buried.',
    'Traffic triples at random. One instance per AZ can\'t keep up, and nobody wants to pay for a fleet sized for peak all night.',
    { target: 'Target tracking keeps your capacity matched to his.', scaleout: 'Out across the AZs, behind the balancer.', alb: 'The balancer spreads his blows across every healthy target.', health: 'And replaces whoever can\'t take them.' },
    { fixed: 'One bigger anvil is still one anvil.', allow: 'Policy won\'t lift a hammer.' }, [w(10), r(11), b(13), up(3), w(12)]);
  // Floor 2, the Assembly Line
  F('norole', 'The Container With No Role', 'No Role', 'A task with no task role, so the app can reach nothing', 28, 'containers', 1, 'He has a job, and no permission to do it.',
    'An ECS task on Fargate pulls its image and writes its logs, but every S3 call from the app fails with AccessDenied.',
    { taskrole: 'The app\'s calls use the task role. Give it one, with exactly what the app needs.' },
    { execrole: 'The execution role already pulled his image. It doesn\'t make his calls.', allow: 'An Allow on the wrong role is still the wrong role.' }, [w(6), r(7), b(7)]);
  F('fatimage', 'The Fat Image', 'Fat Image', 'A container image so big it takes minutes to pull', 28, 'containers', 1, 'Four gigabytes. Compilers, test data, a copy of himself.',
    'New tasks take minutes to start under load: the image carries a whole build toolchain the app never uses.',
    { image: 'A slim base image and a multi-stage build: only what runs goes in.', fargate: 'Fargate starts what you give it. Give it less.' },
    { scaleout: 'More tasks, each pulling four gigabytes.' }, [r(7), w(6), up()]);
  F('oldforge', 'The Old Forge', 'Old Forge', 'An Elastic Beanstalk app that has to be updated without stopping', 28, 'ebdeploy', 1, 'If the fire goes out, it never comes back. Update it lit.',
    'An eight-instance Beanstalk environment must keep eight instances serving during every deployment, and a failed one must not leave two versions mixed.',
    { immutable: 'An immutable update: new instances in a temporary group; if they fail, they\'re thrown away.', rolling: 'Rolling with an additional batch keeps full capacity while it updates.' },
    { allatonce: 'All at once puts the fire out.' }, [w(7), r(7), b(8)]);
  F('migrant', 'The Lifted Server', 'Lifted Server', 'A server that must move to AWS exactly as it is', 26, 'edgecompute', 1, 'He won\'t be rebuilt. He wants to be carried.',
    'Forty servers, physical and virtual, must move to EC2 with nothing reinstalled and a short cutover window.',
    { migrate: 'Application Migration Service replicates them continuously; test, then cut over.', edge: 'And whatever must stay behind can run on an Outpost.' },
    { image: 'Containerizing him is a rebuild. He said no.' }, [r(6), w(7), b(7)]);
  F('overseer', 'The Batch Overseer', 'Batch Overseer', 'A thousand jobs overnight, each with its own size', 48, 'edgecompute', 2, 'One thousand jobs. All due by dawn. All different shapes.',
    'Thousands of containerized simulations run each night with different CPU and memory, must retry when they fail, and should cost as little as possible.',
    { batch: 'AWS Batch: queues, right-sized compute, retries, array jobs.', spot: 'Its managed compute environment can run on Spot.' },
    { lambda: 'Fifteen minutes isn\'t enough for some of his jobs.', scaleout: 'An idle fleet waiting for jobs is what Batch exists to avoid.' }, [w(9), r(10), up(), b(11)]);
  F('line', 'The Line Itself', 'The Line', 'A cluster of tasks; Fargate takes the servers out from under them', 82, 'containers', 3, 'Fifty-two machines, one line, and Kaito somewhere in the middle of it, shouting.',
    'Fifty-two services on a self-managed cluster of EC2 instances. Half of them share one role. Nobody patches the hosts.',
    { fargate: 'Fargate: the servers under the tasks are gone.', taskrole: 'One task role per service, with only what it needs.', execrole: 'And an execution role to pull each image.', image: 'Slim images, pinned by digest.' },
    { fixed: 'Bigger hosts are still hosts to patch.', allow: 'A shared role with every permission is the problem.' }, [r(11), w(12), b(13), up(3), r(13)]);
  // Floor 3, the Janitor's Closet
  F('furniture', 'The Furniture', 'Furniture', 'Staff the wards never record', 30, 'trailproof', 1, 'He has been standing in this corridor for twenty-five years. The wards think he\'s a coat stand.',
    'The trail records every policy change on the records bucket, and not one object read. Whoever reads the pages leaves no trace.',
    { dataevents: 'Turn on data events: then the trail records who read the pages, staff included.' },
    { mgmt: 'Management events see who changed the doors, not who walked through them.' }, [r(7), r(7), b(8)]);
  F('rewritten', 'The Rewritten Page', 'Rewritten Page', 'A log file altered after it was written', 30, 'trailproof', 1, 'He says exactly what someone wanted him to say. Last night, he said something else.',
    'Someone with access to the trail\'s bucket replaced a log file. Nobody can prove the one there now isn\'t the original.',
    { integrity: 'Log file integrity validation: signed digests prove whether any file was changed or deleted.' },
    { sse: 'Encryption keeps him secret, not unchanged.' }, [w(7), r(7), up()]);
  F('ninety', 'The Ninety-First Day', 'Ninety-First Day', 'Event history keeps 90 days, and then forgets', 28, 'trailproof', 1, 'He remembers everything. For ninety days.',
    'A record was deleted four months ago. The account never had a trail, so event history has nothing older than 90 days.',
    { trailstore: 'A trail to S3 keeps events for as long as you keep the bucket.', lake: 'Or an event data store in CloudTrail Lake, asked with SQL.' },
    { mgmt: 'Management events are exactly what he forgot.' }, [r(6), w(7), b(7)]);
  F('nodata', 'The Trail With No Data', 'Trail With No Data', 'Logs every door, and not one page read', 50, 'trailproof', 2, 'A ledger as long as the corridor. Every entry says "door opened".',
    'A trail with management events only. The auditor asks who downloaded the trial ledgers. There is no answer anywhere.',
    { dataevents: 'Data events for the bucket: GetObject, with the principal who called it.', lake: 'And a place to ask questions of them.' },
    { mgmt: 'More management events are more doors.', allow: 'Nobody\'s denied anything. Nobody\'s recorded either.' }, [r(9), r(10), up(), b(11)]);
  F('mop', 'The Mop Bucket', 'Mop Bucket', 'A joke with a lesson: it has no logs, so nobody can tell what it did', 78, 'trailproof', 3, 'It sloshes. It may have mopped up the evidence. There is no way to know.',
    'The closet has no trail, no data events, no digests. Something was cleaned up in here. What, and by whom, is gone.',
    { dataevents: 'From tonight, record what it touches.', trailstore: 'And keep the record somewhere it can\'t mop.', integrity: 'With digests, so the record can\'t be wiped clean either.' },
    { allow: 'It has no permissions problem. It has a memory problem.', mgmt: 'It never changed a single door.' }, [w(10), r(11), b(12), up(3), w(12)]);
  // Floor 4, the Lecture Halls: the familiars, each with one job.
  const fam = (id, name, job, tag, svc, more) => F(id, name, name.replace('The ', ''), `A familiar that ${job}`, 22, 'familiars', 1, `It ${job}. Ask it anything else and it stares.`,
    `${svc} does one job through an API, with no model to train.`, { [tag]: `Ask it to ${tag === 'understand' ? 'understand the text' : tag}: that\'s its one job.` }, more || { allow: 'Permission isn\'t the question. The right question is.' }, [r(5), w(6), b(6)]);
  fam('polly', 'The Familiar Who Speaks', 'speaks text aloud', 'speak', 'Amazon Polly');
  fam('transcribe', 'The Familiar Who Listens', 'writes down what it hears', 'listen', 'Amazon Transcribe');
  fam('translate', 'The Familiar Who Translates', 'turns one language into another', 'translate', 'Amazon Translate');
  fam('textract', 'The Familiar Who Reads Forms', 'reads forms, tables and receipts', 'read', 'Amazon Textract');
  fam('rekognition', 'The Familiar Who Sees', 'sees faces, objects and gear', 'see', 'Amazon Rekognition');
  fam('comprehend', 'The Familiar Who Understands', 'finds the meaning, the names and the mood in text', 'understand', 'Amazon Comprehend');
  fam('lex', 'The Familiar Who Talks Back', 'holds a conversation', 'talk', 'Amazon Lex');
  fam('sagemaker', 'The Familiar Who Learns', 'trains and serves your own model', 'learn', 'Amazon SageMaker AI');
  F('fullscan', 'The Full Scan', 'Full Scan', 'Every query reads every byte of two hundred years', 28, 'datalake', 1, 'He reads the whole library to find one name. He bills you for every page.',
    'Athena queries over CSV files scan all 200 TB every time, though each asks for a few columns from one year.',
    { partition: 'Partition by year: the query skips every folder it doesn\'t need.', parquet: 'Parquet, compressed: it reads only the columns asked for.' },
    { scaleout: 'Athena has no servers to add. It charges by what it reads.' }, [w(7), r(6), up()]);
  F('q', 'Q, the Assistant', 'Q', 'Writes your tests for you, mostly right, and runs them on a farm of real phones', 46, 'familiars', 2, 'Helpful. Fast. Ninety percent right. The other ten percent is your problem.',
    'Amazon Q Developer generated the unit tests; one of them asserts the bug. The tests pass on real devices in Device Farm.',
    { tests: 'Read what it wrote: generated tests are a first draft, not a verdict.', devicefarm: 'Real devices find what emulators don\'t; read the failures it shows.' },
    { allow: 'It has every permission. That\'s not the issue.' }, [r(9), w(9), up(), b(10)]);
  F('dean', 'The Dean', 'The Dean', 'Asks a question no single familiar can answer', 84, 'familiars', 3, '"Which of these recorded trials mention a spared student, and how did the speakers feel about it?"',
    'Two hundred years of recorded trial hearings. The answer needs the words first, then their meaning, then a cheap query over all of it.',
    { listen: 'First the familiar who listens: transcripts.', understand: 'Then the one who understands: names and sentiment.', parquet: 'Then the results as Parquet, queried with Athena.', partition: 'Partitioned by year.' },
    { speak: 'Reading the question aloud doesn\'t answer it.', allow: 'Permission doesn\'t chain two familiars.' }, [r(11), w(12), b(13), up(3), r(13)]);
  // Floor 5, the Healers' Ward
  F('flatline', 'The Flatline', 'Flatline', 'A metric that drops with no alarm on it', 30, 'metrics', 1, 'The line went flat at 23:40. Nobody was watching. It\'s still flat.',
    'A health metric falls to zero overnight. It\'s on a dashboard. Nobody opens the dashboard until the morning.',
    { alarm: 'An alarm on the metric, so someone is woken when it drops.' },
    { dashboard: 'Nobody looks at the dashboard at 3 AM.', structured: 'A log line about it at 23:40 helps nobody at 23:41.' }, [r(7), w(7), b(8)]);
  F('scream', 'The Unstructured Scream', 'Scream', 'A log line nobody can query', 28, 'structlogs', 1, 'AAAAAAAAA error AAAAAA order 4471 AAAAA.',
    'Each request writes a free-text log line. Finding the slowest orders means regular expressions in every query.',
    { structured: 'One JSON object per event, with orderId, level and duration as fields.', insights: 'Then Logs Insights finds the fields by itself.' },
    { alarm: 'An alarm on screaming doesn\'t tell you what it said.' }, [w(7), r(7), up()]);
  F('dashboard', 'The Dashboard Nobody Opens', 'Dashboard', 'Forty graphs, and not one alarm', 26, 'metrics', 1, 'Beautiful. Colour-coded. Last viewed eleven weeks ago.',
    'Every metric the ward has is on one dashboard. The night the patient\'s magic dropped, nobody was looking at it.',
    { alarm: 'Dashboards are for people looking. Alarms are for when nobody is.' },
    { dashboard: 'A forty-first graph.' }, [r(6), r(7), b(7)]);
  F('custom', 'The Custom Metric', 'Custom Metric', 'A number from inside the code, sent the expensive way', 48, 'metrics', 2, 'He calls PutMetricData forty times a request. With the request ID as a dimension.',
    'A function sends a custom metric on every call with RequestId as a dimension, creating a new metric for every request.',
    { emf: 'Write it in the embedded metric format, and drop the request ID from the dimensions.', alarm: 'Then an alarm on the one metric that matters.' },
    { dashboard: 'He already has ten thousand metrics on a dashboard.' }, [w(9), r(10), up(), b(11)]);
  F('nurse', 'The Night Nurse', 'Night Nurse', 'Hides what she\'s about to do, unless an alarm is set on her', 84, 'metrics', 3, 'She comes at 23:38 with flowers. She leaves at 23:40. The chart drops at 23:40.',
    'The ward\'s chart shows the patient\'s magic rising for three nights, then dropping at 23:40. No alarm was on it. Nobody came.',
    { alarm: 'Set an alarm on her, and her intents show.', emf: 'The chart as a real metric, from inside the ward.', structured: 'Every visit logged, with who and when.', insights: 'And asked: who visited at 23:38?' },
    { dashboard: 'She knows nobody opens it.', allow: 'She has every right to be on the ward. That\'s the point.' }, [r(11), w(12), b(13), up(3), w(13)]);
  // Floor 6, the Staff Stair
  F('unseen', 'Unseen', 'Unseen', 'A stair the wards can\'t see', 30, 's3access', 1, 'Footsteps. No feet.',
    'The staff stair\'s bucket has no data events and no access logs. Whoever climbs it leaves nothing behind.',
    { dataevents: 'Data events on the stair\'s bucket: who, as which role.', accesslog: 'Or access logs: every request, cheaply.' },
    { mgmt: 'Nobody changed the stair. They just climbed it.' }, [r(7), r(7), b(8)]);
  F('reader', 'The Bucket Reader', 'Bucket Reader', 'Reads pages and leaves no trace unless object-level logging is on', 30, 's3access', 1, 'He reads everything. He\'s never been seen reading anything.',
    'Thousands of GetObject calls on a sensitive bucket. The trail shows the bucket policy change from last year, and nothing else.',
    { dataevents: 'Object-level logging: data events, with his IAM identity on each read.', accesslog: 'Server access logs see him too, a few hours late.' },
    { mgmt: 'He never touches the bucket\'s settings.' }, [r(7), w(6), up()]);
  F('loop', 'The Log That Logs Itself', 'Log Loop', 'Access logs delivered into the bucket they\'re logging', 28, 's3access', 1, 'Every page he writes is a page somebody wrote. He writes that down too.',
    'Server access logs go to the same bucket under logs/. The object count climbs all night with nobody using the app.',
    { separate: 'A separate log bucket in the same Region, which doesn\'t log itself.' },
    { lifecycle: 'Deleting yesterday\'s logs doesn\'t stop tonight\'s.' }, [w(7), w(6), b(7)]);
  F('liftop', 'The Lift Operator', 'Lift Operator', 'A service integration that fails silently between two machines', 48, 'integdebug', 2, 'He takes the message. He doesn\'t deliver it. He doesn\'t tell anyone.',
    'An EventBridge rule matches every event, and its Lambda target never runs. The function\'s logs are empty: the call never arrived.',
    { failed: 'The rule\'s FailedInvocations metric says it\'s him.', dlq: 'A dead-letter queue on the target keeps each message with the reason it failed.' },
    { structured: 'The function\'s logs are empty. It never ran.', retry: 'Retrying a call that\'s never allowed just fails more slowly.' }, [r(9), w(10), up(), b(11)]);
  F('stair', 'The Stair Itself', 'The Stair', 'Lina\'s ward, turned on: it records every step on it', 82, 's3access', 3, 'One hundred and twelve steps. Every one remembers who stood on it.',
    'The ward Lina turned on a week before she fell: data events on the staff stair. Its record still exists. Nobody has ever read it.',
    { dataevents: 'Her ward: data events, on. Every step, every name.', accesslog: 'The access logs agree, a few hours late.', lake: 'Ask it with SQL: who was on the stair at 23:38?' },
    { mgmt: 'Management events never saw anyone on a stair.', allow: 'The stair doesn\'t care who was allowed. It cares who was there.' }, [w(11), r(12), b(13), up(3), r(13)]);
  // Floor 7, the Relay Floor
  F('slowhop', 'The Slow Hop', 'Slow Hop', 'One call that takes most of the request\'s time', 30, 'tracing', 1, 'He\'s never slow when you look at him. You\'ve never looked at him.',
    'Requests take five seconds. The logs say "done" at the end. Nobody knows which of the four services ate the time.',
    { trace: 'A trace: one segment per service, a subsegment per call, each with its time.' },
    { structured: 'The logs say it was slow, not where.' }, [r(7), w(7), b(8)]);
  F('lostheader', 'The Lost Header', 'Lost Header', 'One service drops the trace header, and the trace breaks in two', 28, 'tracing', 1, 'He passes the message on. He keeps the envelope.',
    'Traces stop at the queue. The consumer\'s work shows up as a separate trace, unconnected.',
    { propagate: 'Instrument the producer\'s client, so the trace header goes with the message.', trace: 'Then the trace map joins them.' },
    { sampling: 'Tracing more of a broken trace is more broken traces.' }, [w(6), r(7), up()]);
  F('metadata', 'The Unsearchable Note', 'Unsearchable', 'The customer tier written as metadata, so nobody can search for it', 26, 'tracing', 1, 'Everything about him is written down. In a drawer nobody can search.',
    'Traces carry customer_tier as metadata. A filter expression for premium customers finds nothing.',
    { annotate: 'Make it an annotation: indexed, searchable, groupable.' },
    { metadata: 'More metadata, more drawers.' }, [r(6), r(7), b(7)]);
  F('sampler', 'The Sampler', 'Sampler', 'Records only one call in twenty', 48, 'tracing', 2, 'He watched the first request this second. And five percent of the rest.',
    'The rare /checkout error almost never appears in a trace: the default sampling records one request a second and 5 percent after that.',
    { sampling: 'A sampling rule for /checkout with a higher rate and priority, with no redeploy.', annotate: 'And annotate what you\'ll search for.' },
    { trace: 'More tracing code doesn\'t change what\'s sampled.' }, [r(9), r(10), up(), b(11)]);
  F('relaykeeper', 'The Relay Keeper', 'Relay Keeper', 'Only annotated segments can be searched for, and only those cards land', 84, 'tracing', 3, 'He keeps the relay map of every night. He shows it only to those who ask properly.',
    'The night\'s calls through the wards, as a trace: a request from one office to the infirmary ward at 23:38, in two hops.',
    { annotate: 'Search by an annotation: office, ward, time.', trace: 'The whole path, hop by hop.', propagate: 'Every hop carried the header.', sampling: 'And that night, every request was sampled.' },
    { metadata: 'He won\'t search the drawers for you.', allow: 'The map isn\'t locked. It\'s just unread.' }, [r(11), w(12), b(13), up(3), r(13)]);
  // Floor 8, the Clocktower
  F('unapproved', 'The Unapproved Release', 'Unapproved', 'A release that reached the live floor with nobody signing it off', 30, 'cicd', 1, 'He\'s already live. He was never approved. He\'s very confident.',
    'The pipeline deploys to production the moment staging passes, at midnight, with nobody awake.',
    { approval: 'A manual approval between staging and production, and the same artifact continues.', pipeline: 'Through the pipeline, not around it.' },
    { allatonce: 'All at once is how he got there.' }, [w(7), r(7), b(8)]);
  F('stagevar', 'The Stage Variable', 'Stage Variable', 'Sends test traffic to the live function', 30, 'stages', 1, 'He points every stage at prod. It\'s efficient.',
    'The test stage\'s variable names the prod alias. The load test charges real cards.',
    { stagevar: 'Each stage\'s variable names its own alias, each with its own invoke permission.' },
    { redeploy: 'Redeploying the same mapping sends test to prod again.' }, [r(7), w(7), up()]);
  F('flag', 'The Feature Flag', 'Feature Flag', 'Flipped without a deploy, and without a check', 28, 'appcfg', 1, 'On. Off. On. Nobody remembers asking.',
    'A flag with a missing field rolls out to every function at once, and nothing checks it first.',
    { appconfig: 'AppConfig: a validator first, a gradual strategy, and an alarm that rolls it back.' },
    { envvar: 'An environment variable change is a redeploy of every function.' }, [w(6), r(7), b(7)]);
  F('unread', 'The Change Set Nobody Read', 'Unread Change Set', 'An update that will replace the database, and nobody looked', 50, 'iac', 2, 'Page three says Replacement: True. Nobody got to page three.',
    'A template change renames a table. The update would replace it, with the data in it. It was about to execute.',
    { changeset: 'Read the change set: Replacement: True, before you execute.', approval: 'And make someone approve it.' },
    { allatonce: 'Executing it faster doesn\'t make it safer.' }, [w(9), r(10), up(), b(11)]);
  F('midnight', 'Midnight', 'Midnight', 'Freya\'s pipeline as a boss: it redeploys the floor unless yours is ahead of it', 86, 'cicd', 3, 'BONG. Everything you fixed is as it was. BONG.',
    'Every night at midnight, Freya\'s pipeline redeploys the whole tower from her template, overwriting whatever changed.',
    { pipeline: 'Your pipeline, ahead of hers: source, build, test, deploy.', approval: 'An approval gate she can\'t skip.', rollback: 'Automatic rollback on an alarm.', changeset: 'Read what she\'s about to replace.' },
    { allatonce: 'She already deploys all at once.', allow: 'She has every permission in the tower.' }, [w(12), r(12), b(14), up(3), w(14)], { denies: ['adminaccess'] });
  // Floor 9, the Observatory
  F('iris', 'Iris Vell', 'Iris Vell', 'She doesn\'t have to fall: the floor has to move from Freya\'s version to yours, before midnight', 98, 'shifting', 3, 'The most loved teacher in the Arcanum, at the rail, with her lanterns along the walls.',
    'Freya\'s version of the Arcanum on one side, yours on the other: the same floor, with every ward recording everyone. Shift it, one step at a time, with an alarm on every step.',
    { canary: 'Ten percent first, and hold.', linear: 'Then equal steps.', rollback: 'An alarm on the new version\'s errors, ready to roll back.', alarm: 'Watching every step.', dataevents: 'And in your version, the wards record the staff.' },
    { allatonce: 'All at once is what she\'s counting on.', admin: 'Freya\'s keys would make it Freya\'s floor.', allow: 'Permission was never what she lacked.' }, [r(13), w(14), b(16), up(3), w(15), r(15)], { denies: ['adminaccess'] });
  F('lantern', 'A Student\'s Lantern', 'Lantern', 'A grant in a glass: one of Iris\'s lanterns, held by a drained student', 30, 'trailproof', 1, 'A scholarship student holds it up. She doesn\'t look at you.',
    'Each lantern is a grant Iris gives. Its record is in the ward. Nobody has read it.',
    { dataevents: 'Read the record, and the lantern goes out.' }, { allow: 'It\'s a grant. Allowing it more doesn\'t help.' }, [r(9), w(9)]);
  Object.assign(SD.enemies, E);

  // ---------- Field Notes and Policy Sorts ----------
  Object.assign(SD.fieldNotes, {
    x5page8: { title: 'Kyu\'s page 8: scale out, and on what', c: 'scaling',
      ev: 'Forge fleet: Auto Scaling group, min 2, max 12, two AZs, behind an ALB\nPolicy: target tracking on ALBRequestCountPerTarget = 200\nLoad test: each instance stays fast up to ~200 requests/s; CPU stays under 30%',
      steps: [
        'Scaling up (a bigger instance) needs a restart and still leaves one machine. Scaling out adds machines behind the balancer.',
        'CPU is the wrong signal here: the work waits on other services, so CPU stays low while users wait.',
        'Requests per target rises and falls with the number of instances: double the fleet, halve the number.',
        'Target tracking adds instances when it goes above 200 and removes them when it falls well below.',
        'The group spans two AZs, so losing one zone loses half the fleet, not all of it.',
        'For a queue of jobs, the same idea: backlog per instance, with a target of acceptable wait divided by time per job.'] },
    x5buy: { title: 'Which way to pay for the forge', c: 'ec2buy',
      ev: 'Web tier: steady, 24/7, three years, may change instance family\nRenders: nightly, checkpointed, can stop any time\nPricing engine: t3, 80% CPU all day, credits at zero\nAnalytics box: used 9 to 6, 40-minute warm-up',
      steps: [
        'Steady for years, changing family: a Compute Savings Plan or Convertible Reserved Instances.',
        'Interruptible, checkpointed work: Spot, across many instance types and AZs.',
        'Busy all day on a burstable instance: move to a fixed-performance C or M type.',
        'Used only in office hours, slow to warm up: hibernate it at night; it wakes with its memory.',
        'Whatever you choose, right-size first: Compute Optimizer shows who\'s too big.'] },
    x5health: { title: 'Why the liar keeps getting traffic', c: 'loadbal',
      ev: 'Target group health check: GET /ping  ->  200 OK (the process is up)\nGET /orders  ->  500 (the database connection pool is dead)\nALB: 3 targets, all "healthy"',
      steps: [
        'The balancer only knows what the health check tells it.',
        '/ping proves the web server answers, not that the app can serve an order.',
        'A deeper check (/health that touches the database) fails on the broken target.',
        'After the unhealthy threshold, the ALB stops routing to it.',
        'With ELB health checks on the Auto Scaling group, it\'s replaced, not just skipped.',
        'Keep the check cheap and honest: test the dependencies a request needs, nothing more.'] },
    x5roles: { title: 'Two roles on every task', c: 'containers',
      ev: 'Task definition orders-api\n  executionRoleArn: ecsTaskExecutionRole (ECR pull, logs, secrets)\n  taskRoleArn:      (none)\nApp: s3.put_object(...)  ->  AccessDenied',
      steps: [
        'ECS uses the execution role before the app starts: it pulls the image, sends the logs, injects the secrets.',
        'That\'s why the image pulled and the logs arrived.',
        'The app\'s own AWS calls use the task role, and there isn\'t one.',
        'Add a task role with s3:PutObject on exactly that bucket.',
        'On EKS the same idea is Pod Identity or IRSA: a role per service account, not the node\'s role.'] },
    x5eb: { title: 'Updating the old forge with the fire lit', c: 'ebdeploy',
      ev: 'Elastic Beanstalk, 8 instances, steady load\nRule: 8 instances serving at all times; a failure must not leave two versions mixed',
      steps: [
        'All at once: every instance at once, a moment of downtime. No.',
        'Rolling: batches go out of service in turn, so capacity drops. No.',
        'Rolling with additional batch: an extra batch first, so 8 always serve. A failure can still leave a mix.',
        'Immutable: a full new set in a temporary Auto Scaling group; if they fail health checks, they\'re terminated and the old 8 never noticed.',
        'Traffic splitting: the same new set, with a share of traffic to it for an evaluation period first.'] },
    x5ship: { title: 'Ship It, as a pipeline', c: 'cicd',
      ev: 'Source:  a commit to main\nBuild:   CodeBuild, buildspec.yml (install, build, unit tests, artifact)\nTest:    deploy to a test alias, integration tests with the outside call mocked\nApprove: a manual approval\nDeploy:  canary on the live alias, with an alarm',
      steps: [
        'The commit starts the pipeline. Nobody runs anything by hand.',
        'The build stage runs the buildspec in a fresh container: the same steps every time, and test reports.',
        'One artifact is built once, and the same artifact moves through every stage.',
        'The test stage proves it works against things that don\'t charge real money.',
        'The approval waits for a person. Then the very artifact that passed continues.',
        'Deploy shifts traffic slowly, with an alarm that can roll it back.'] },
    x5drift: { title: 'Ayo\'s post-mortem for Pingsby', c: 'iac',
      ev: 'Template: OrdersTable (TableName: orders), ForgeRole, ForgeAlarm\nTonight: OrdersTable exists; ForgeRole has an extra policy someone added by hand; ForgeAlarm was deleted\nChange: TableName orders -> orders-v2',
      steps: [
        'Drift detection compares what\'s standing with the template: ForgeRole MODIFIED, ForgeAlarm DELETED.',
        'Fix drift in the template, not by hand, or tomorrow\'s redeploy undoes you.',
        'The change set for the rename shows OrdersTable: Replacement True. A new table, empty.',
        'Execute nothing until someone reads that line.',
        'For data that must survive, DeletionPolicy and UpdateReplacePolicy: Retain.',
        'Root cause, Pingsby: a change set nobody read. Action: an approval on every replacement.'] },
    x5trail: { title: 'What the wards record', c: 'trailproof',
      ev: 'Trail: management events (read and write), all Regions, to s3://wards-log\nData events: none\nLog file validation: off',
      steps: [
        'Management events: who created, changed or deleted resources. PutBucketPolicy is here.',
        'Data events: who read or wrote inside them. GetObject on a page is not here: they\'re off.',
        'Without a trail, event history still keeps 90 days of management events, and nothing older.',
        'Turn on data events for the records bucket: every read, with the caller\'s identity.',
        'Turn on log file validation: hourly signed digests prove no file was altered.',
        'For questions across years and accounts: CloudTrail Lake, asked with SQL.'] },
    x5ledgers: { title: 'The trial\'s ledgers, as a record', c: 'trailproof',
      ev: 'eventName: GetObject   eventSource: s3.amazonaws.com\nuserIdentity: AssumedRole .../ArcanumStaff/vell\nrequestParameters: { bucketName: trial-ledgers, key: 1999/scholarship.csv }\neventTime: (the night of the trial)',
      steps: [
        'This is a data event: an object read.',
        'userIdentity says who: a staff role, with the session name at the end of the ARN.',
        'requestParameters says what: which bucket, which page.',
        'eventTime says when.',
        'Nobody had this on in Dutch\'s year. Freya\'s copy of the floor has it, because Freya copies everything.'] },
    x5lake: { title: 'Two hundred years, cheaply', c: 'datalake',
      ev: 's3://trials/  200 years of CSV, 200 TB, one folder\nQuery: SELECT name, verdict FROM trials WHERE year = 1999\nAthena price: per TB scanned',
      steps: [
        'Athena queries the files where they sit, and charges by what it reads.',
        'Today it reads all 200 TB to find one year.',
        'A Glue crawler catalogues the table; partition it by year (s3://trials/year=1999/).',
        'Now the query reads one year\'s folder.',
        'Convert to Parquet, compressed: it reads only the name and verdict columns.',
        'Same question, a tiny fraction of the bytes. Lake Formation can hide the columns some students shouldn\'t see.'] },
    x5familiars: { title: 'Which familiar do you ask?', c: 'familiars',
      ev: 'Recordings of trials (audio)\nScanned verdict forms (images)\nA student\'s letter in another language\nA question asked aloud at the library desk',
      steps: [
        'Audio to text: Transcribe.',
        'Text to its meaning, names and mood: Comprehend.',
        'Scanned forms to fields and tables: Textract.',
        'One language to another: Translate.',
        'A conversation at the desk: Lex, and an answer read aloud by Polly.',
        'A model of your own, trained on your own data: SageMaker AI.'] },
    x5chart: { title: 'Lina\'s infirmary chart', c: 'metrics',
      ev: 'Metric: ward/magic, one point a minute\nNight 1-3: rising\n23:38: a visitor (flowers)\n23:40: drops to zero\nAlarms on the metric: none',
      steps: [
        'The metric was there. It was on the ward\'s dashboard.',
        'Nobody looks at a dashboard at 23:40.',
        'An alarm on ward/magic, below a threshold for 2 minutes, would have woken the healers.',
        'A structured log line for each visit says who came at 23:38.',
        'A log line alone would have waited until someone searched. A metric with an alarm doesn\'t wait.'] },
    x5emf: { title: 'A metric from inside the code', c: 'metrics',
      ev: '{ "_aws": { "CloudWatchMetrics": [ { "Namespace": "Ward", "Dimensions": [["Bed"]], "Metrics": [{ "Name": "Magic" }] } ] },\n  "Bed": "12", "Magic": 41, "requestId": "a1b2" }',
      steps: [
        'This is one log line, written to CloudWatch Logs as usual.',
        'CloudWatch reads the _aws block and makes a metric, Magic, with the dimension Bed.',
        'No PutMetricData calls, no extra latency in the code.',
        'requestId is a field, not a dimension: every distinct dimension value is a separate metric.',
        'The same line is still a searchable log event in Logs Insights.'] },
    x5stair: { title: 'Two records of the staff stair', c: 's3access',
      ev: 'CloudTrail data event:   GetObject  stair/step-112   AssumedRole/ArcanumStaff/vell   23:38:04  (delivered in minutes)\nServer access log line:  REST.GET.OBJECT  stair/step-112  200  2310 bytes  23:38:04  (delivered within hours, best effort)',
      steps: [
        'Both saw the same read.',
        'The data event names the IAM principal and arrives reliably within minutes; it costs per event.',
        'The access log line has the status, bytes and timing, costs only its storage, and may arrive hours later or, rarely, not at all.',
        'For an alarm on who reads: data events. For a cheap traffic report: access logs.',
        'Either way, Lina turned it on a week before she needed it.'] },
    x5lift: { title: 'The gap between two machines', c: 'integdebug',
      ev: 'EventBridge rule ward-alerts  ->  target: Lambda notify-healers\nMatchedEvents: 41   Invocations: 41   FailedInvocations: 41\nnotify-healers logs: (empty)',
      steps: [
        'The rule matched, and tried to invoke 41 times. The function never ran.',
        'So the failure is between them, not in the code.',
        'Created from the CLI, the function has no resource-based policy letting events.amazonaws.com invoke it.',
        'A dead-letter queue on the target would hold each event, with ERROR_CODE and ERROR_MESSAGE.',
        'Add the permission; the next event goes through.'] },
    x5relay: { title: 'The relay map', c: 'tracing',
      ev: 'Trace 1-5f3c...   23:38:02\n  office-vell (segment)          0.4 s\n    -> ward-relay (subsegment)    0.1 s\n  infirmary-ward (segment)       2.6 s\n  annotation: ward = infirmary, office = vell',
      steps: [
        'One trace, one request, from start to end.',
        'Each service adds a segment; each downstream call, a subsegment with its own time.',
        'Two hops: Iris\'s office, the relay, the infirmary ward.',
        'The annotations are indexed, so a filter finds it: annotation.office = "vell".',
        'Metadata would have been there too, and unsearchable.',
        'At 23:38. Two minutes before the chart drops.'] },
    x5stages: { title: 'Every stage its own alias', c: 'stages',
      ev: 'REST API ward-api   integration: ward-fn:${stageVariables.alias}\nStage test: alias = test     Stage prod: alias = live\nwardfn:test invoke permission for API Gateway: missing',
      steps: [
        'One API definition, many stages, each its own URL and settings.',
        'The stage variable picks which alias each stage calls.',
        'Each alias is a separate resource: API Gateway needs permission to invoke each one.',
        'Changes reach a stage only when you deploy them to it.',
        'Now test traffic goes to test, and charges no real cards.'] },
    x5shift: { title: 'Ten, twenty-five, fifty...', c: 'shifting',
      ev: 'Alias live: version 41 (Freya\'s) 100%\nNew: version 42 (yours)\nDeployment: canary 10%, then linear; alarm: Errors on live, ExecutedVersion 42',
      steps: [
        'Publish your code as version 42: an immutable snapshot.',
        'The alias sends 10% to 42 and holds. The alarm watches 42\'s errors.',
        'If it fires, CodeDeploy moves everything back to 41.',
        'If not, the next step, and the next, until 42 has it all.',
        'Blue/green would be wrong if 41 and 42 couldn\'t share the same records. Here they can.'] }
  });
  Object.assign(SD.policySorts, {
    x5listener: { title: 'Which requests reach the green forge?', c: 'loadbal',
      ev: 'ALB listener :443\n  rule 10: header X-Tester = yes  ->  forward TG-green\n  rule 20: path /search*          ->  forward TG-search\n  default:                         ->  forward TG-blue 90%, TG-green 10%',
      reqs: [
        { t: 'A tester\'s request carrying X-Tester: yes', ok: true, why: 'Rule 10 matches first and forwards to green.' },
        { t: 'A customer\'s request to /search?q=anvil', ok: false, why: 'Rule 20 sends it to TG-search before the default rule is read.' },
        { t: 'A customer\'s request to /orders, if the weights pick green', ok: true, why: 'The default rule sends 10% of what\'s left to green.' },
        { t: 'A tester\'s request to /search with X-Tester: yes', ok: true, why: 'Rule 10 has the lower number, so it\'s read first.' },
        { t: 'A request to /orders while every green target fails its health check', ok: false, why: 'The balancer won\'t route to unhealthy targets.' }] },
    x5task: { title: 'Which calls work?', c: 'containers',
      ev: 'Task definition forge-api\n  executionRoleArn: ecsTaskExecutionRole (AmazonECSTaskExecutionRolePolicy)\n  taskRoleArn:      forge-api-task (s3:PutObject on forge-bucket/*)',
      reqs: [
        { t: 'ECS pulls the image from the account\'s private ECR repository', ok: true, why: 'The execution role\'s managed policy allows the ECR pull.' },
        { t: 'The app writes to forge-bucket', ok: true, why: 'The task role allows s3:PutObject there.' },
        { t: 'The app reads from forge-bucket', ok: false, why: 'The task role allows PutObject only.' },
        { t: 'The app calls DynamoDB with the execution role\'s permissions', ok: false, why: 'The app\'s calls use the task role, never the execution role.' },
        { t: 'The container\'s logs reach CloudWatch Logs', ok: true, why: 'The execution role sends them.' }] },
    x5gate: { title: 'Which changes reach the live floor?', c: 'cicd',
      ev: 'Pipeline: Source (main) -> Build (unit tests) -> Test (test alias) -> Approval -> Deploy (canary, alarm)\nThe approval is pending.',
      reqs: [
        { t: 'A commit to main whose unit tests fail', ok: false, why: 'The build stage fails, and nothing after it runs.' },
        { t: 'A commit that passes every test, while the approval waits', ok: false, why: 'Nothing passes a pending manual approval.' },
        { t: 'The same commit, after the approval', ok: true, why: 'The artifact that passed continues to the deploy stage.' },
        { t: 'A hotfix uploaded by hand to the live function', ok: false, why: 'Not through this pipeline. (And the next run would overwrite it.)' },
        { t: 'An approved release whose canary trips the error alarm', ok: false, why: 'The alarm rolls it back before it gets the rest of the traffic.' }] },
    x5lakeperm: { title: 'Who can read the trial records?', c: 'datalake',
      ev: 'Lake Formation, table trials\n  students:  SELECT on (year, verdict) only\n  registrar: SELECT on all columns\n  dean:      row filter: year >= 1990',
      reqs: [
        { t: 'A student reads the verdict for 1999', ok: true, why: 'Students may read year and verdict.' },
        { t: 'A student reads the names of the spared', ok: false, why: 'Names aren\'t in the students\' column grant.' },
        { t: 'The registrar reads every column for 1850', ok: true, why: 'The registrar has every column, and no row filter.' },
        { t: 'The dean reads 1850', ok: false, why: 'The dean\'s row filter starts at 1990.' },
        { t: 'The dean reads 1999', ok: true, why: 'Inside the dean\'s row filter.' }] },
    x5release: { title: 'Which releases reach every customer?', c: 'deploycfg',
      ev: 'CodeDeploy, Lambda alias live: LambdaCanary10Percent5Minutes\nAlarm on the deployment group: Errors for live, new version, > 1% for 1 minute\nAutomatic rollback: on alarm',
      reqs: [
        { t: 'A version with no errors through the five-minute wait', ok: true, why: 'The canary passes, and the other 90% shifts.' },
        { t: 'A version whose errors cross 1% in minute two', ok: false, why: 'The alarm fires, and CodeDeploy rolls back.' },
        { t: 'A version whose BeforeAllowTraffic hook reports Failed', ok: false, why: 'A failed hook stops the deployment before any traffic shifts.' },
        { t: 'A version that\'s slow but never errors', ok: true, why: 'The alarm only watches errors. (Add a Duration alarm if slow matters.)' },
        { t: 'A version whose hook never reports back at all', ok: false, why: 'A hook that never calls back times out, and the deployment fails.' }] },
    x5stagesort: { title: 'Where does each request go?', c: 'stages',
      ev: 'API ward-api, integration ward-fn:${stageVariables.alias}\n  dev: alias=dev (auto-deploy on)    test: alias=test    prod: alias=live, canary 10% -> next',
      reqs: [
        { t: 'A request to the test stage reaches the live alias', ok: false, why: 'Test\'s variable names the test alias.' },
        { t: 'A route added a minute ago works on dev', ok: true, why: 'Dev deploys automatically on every change.' },
        { t: 'The same new route works on prod without a deployment', ok: false, why: 'A stage serves only what was deployed to it.' },
        { t: 'One in ten prod requests reaches the next alias', ok: true, why: 'The stage\'s canary sends 10% to the new deployment, with its own variable overrides.' },
        { t: 'A prod request reaches the dev alias', ok: false, why: 'Nothing on prod names dev.' }] }
  });

  // ---------- Events ----------
  Object.assign(SD.expeditionEvents, {
    x5anvil: { id: 'x5anvil', title: 'Ayo at the Anvil', who: 'ayo', per: true, text: 'A huge man chained to one anvil, hammering one sword, over and over. "SCALE OUT, they told me! I did! Then the template put me back!"',
      choices: [
        { label: 'Help him work out how to share the load', out: 'Right: each of you takes Scale Out from his rack. Wrong: the anvil kicks back, and the team loses 6 SLA.', fx: { ask: { c: 'scaling', right: { card: 'x5-scaleout' }, wrong: { sla: -6 } } } },
        { label: 'Take a sword from his rack (15 bits each)', out: 'Each of you pays, and one of you refactors a card at his forge.', fx: { cost: 15, upgrade: 1, who: 'one' } },
        { label: 'Promise to come back for him', out: '"I\'ll hold you to that! I hold EVERYONE to things!"', fx: {} }] },
    x5kaito: { id: 'x5kaito', title: 'Fifty-Two Machines', who: 'kaito', per: true, text: 'A young man in a hero\'s cape, on a gantry above fifty-two services, half of them on fire. "I don\'t need help. I have the Legendary Skill: Kubernetes."',
      choices: [
        { label: 'Ask him which role each service uses', out: 'Right: he goes quiet, then hands each of you a Task Role. Wrong: a service catches fire, and the team loses 6 SLA.', fx: { ask: { c: 'containers', right: { card: 'x5-taskrole' }, wrong: { sla: -6 } } } },
        { label: 'Leave him to it', out: '"Fine! FINE." He doesn\'t mean it.', fx: { sla: 4 } }] },
    x5kyu8: { id: 'x5kyu8', title: 'Kyu\'s Page 8', who: null, text: 'A page in Kyu\'s hand, nailed to the forge door: "Scale out, not up. Then ask: scale on WHAT?"',
      choices: [
        { label: 'Answer the page', out: 'Right: one of you refactors a card. Wrong: the page curls, and the team loses 6 SLA.', fx: { ask: { c: 'ec2buy', right: { upgrade: 1, who: 'one' }, wrong: { sla: -6 } } } },
        { label: 'Fold it into your pocket', out: 'You rest by the forge. The team recovers 8 SLA.', fx: { sla: 8 } }] },
    x5lina: { id: 'x5lina', title: 'Lina\'s Ward Record', who: null, text: 'On the closet shelf, in the template\'s perfect copy: a ward record, on the staff stair, from the night she fell. It\'s a data event.',
      choices: [
        { label: 'Work out what kind of record this is', out: 'Right: each of you takes Data Events, On. Wrong: the shelf collapses, and the team loses 6 SLA.', fx: { ask: { c: 'trailproof', right: { card: 'x5-dataevents' }, wrong: { sla: -6 } } } },
        { label: 'Give it to Dutch, unread', out: 'He holds it a long time. The team recovers 10 SLA.', fx: { sla: 10 } }] },
    x5generations: { id: 'x5generations', title: 'Generations', who: 'pella', per: true, text: 'A girl in a library carrel with two hundred years of trial records as files. "Every query costs me a week\'s stipend. It shouldn\'t."',
      choices: [
        { label: 'Show her how to make the question cheaper', out: 'Right: each of you takes Partition It. Wrong: the query scans everything, and the team loses 6 SLA.', fx: { ask: { c: 'datalake', right: { card: 'x5-partition' }, wrong: { sla: -6 } } } },
        { label: 'Pay for her query (15 bits each)', out: '"Thank you. I\'ll pay it back. I always do." The team recovers 12 SLA.', fx: { cost: 15, sla: 12 } }] },
    x5video: { id: 'x5video', title: 'The Moving Picture', who: null, text: 'A mirror in the hall shows the corridor outside, live, frame by frame, to the familiar who sees.',
      choices: [
        { label: 'Work out what\'s feeding it', out: 'Right: one of you refactors a card. Wrong: the mirror fogs, and the team loses 6 SLA.', fx: { ask: { c: 'familiars', right: { upgrade: 1, who: 'one' }, wrong: { sla: -6 } } } },
        { label: 'Wave at it', out: 'It waves back, a little late. Each of you gains 10 bits.', fx: { bits: 10 } }] },
    x5infirmary: { id: 'x5infirmary', title: 'Lina\'s Infirmary Chart', who: null, text: 'A chart at the foot of an empty bed: her magic rising for three nights, then dropping at 23:40. Flowers on the sill, long dead.',
      choices: [
        { label: 'Work out what would have caught it', out: 'Right: each of you takes Set an Alarm. Wrong: the team loses 6 SLA.', fx: { ask: { c: 'metrics', right: { card: 'x5-alarm' }, wrong: { sla: -6 } } } },
        { label: 'Leave the chart for Dutch', out: 'You leave it face up. The team recovers 8 SLA.', fx: { sla: 8 } }] },
    x5relaymap: { id: 'x5relaymap', title: 'The Relay Map', who: 'theo', per: true, text: 'A man in a dock worker\'s coat, hiding with the drained students, a folded map in his fist. "I was on the stair. I told them. Nobody wrote it down."',
      choices: [
        { label: 'Ask him how to read the map', out: 'Right: each of you takes Trace It. Wrong: he folds it away again, and the team loses 6 SLA.', fx: { ask: { c: 'tracing', right: { card: 'x5-trace' }, wrong: { sla: -6 } } } },
        { label: 'Just listen', out: 'He talks for a long time. Nobody interrupts. The team recovers 12 SLA.', fx: { sla: 12 } }] },
    x5bell: { id: 'x5bell', title: 'The Lecture Bell', who: null, text: 'A bell rope with a card tied to it: "Ring for a release. Ring twice to undo."',
      choices: [
        { label: 'Work out what should ring the second time', out: 'Right: one of you refactors a card. Wrong: the bell rings at the wrong time, and the team loses 6 SLA.', fx: { ask: { c: 'deploycfg', right: { upgrade: 1, who: 'one' }, wrong: { sla: -6 } } } },
        { label: 'Leave it', out: 'The rope sways. Nothing rings.', fx: {} }] },
    x5flagbox: { id: 'x5flagbox', title: 'The Flag Box', who: null, text: 'A box of feature flags on the clocktower stair, each with a little switch. Someone has flipped half of them.',
      choices: [
        { label: 'Work out how they should be flipped', out: 'Right: each of you takes AppConfig Rollout. Wrong: a flag flips everything off, and the team loses 6 SLA.', fx: { ask: { c: 'appcfg', right: { card: 'x5-appconfig' }, wrong: { sla: -6 } } } },
        { label: 'Flip them all back', out: 'Back as they were. The team recovers 6 SLA.', fx: { sla: 6 } }] },
    x5freya: { id: 'x5freya', title: 'The Real Records', who: 'freya', per: true, text: 'Freya, in a polished brass frame in the corridor: "Every record in this city, love. The real ones. Just say yes, and your badge with it."',
      choices: [
        { label: 'Trade her AdministratorAccess back', out: 'AdministratorAccess goes into the frame. Back come Data Events, On and Read the Change Set. "You always did like reading."', fx: { trade: { give: 'adminaccess', get: ['x5-dataevents', 'x5-changeset'] } } },
        { label: 'Say nothing', out: 'Dutch says nothing for a long time. She waits, then smiles. "You never asked."', fx: {} }] },
    x5kagemaru: { id: 'x5kagemaru', title: 'A Hooded Stall', who: null, per: true, text: 'A stall that wasn\'t here a minute ago. A hooded man giggles behind it. "Exactly what you\'ll need, before you need it. Don\'t ask how."',
      choices: [
        { label: 'Buy what he picks for you (20 bits each)', out: 'Each of you pays, and picks an uncommon card from his tray.', fx: { cost: 20, card: 'uncommon' } },
        { label: 'Ask him how he knows', out: 'He giggles. That\'s all.', fx: {} }] }
  });

  // ---------- Questions ----------
  // The bank questions each concept asks (js/qpick.js picks one at random), the chapter's ELI5 lines in js/c5-help.js.
  D.Q = {
    ec2buy: ['saa-4-108', 'saa-4-03', 'saa-4-109', 'saa-3-213', 'saa-4-112', 'saa-3-109', 'saa-4-04', 'saa-3-102'],
    scaling: ['saa-2-102', 'saa-3-107', 'saa-3-108', 'saa-3-209', 'saa-2-128', 'saa-4-113', 'saa-2-06'],
    loadbal: ['saa-2-108', 'saa-3-118', 'saa-4-410', 'saa-2-211', 'dva-4-103', 'dva-3-405', 'dva-4-124', 'saa-4-215'],
    containers: ['dva-2-06', 'dva-4-111', 'dva-2-132', 'dva-3-221', 'dva-4-110', 'saa-2-106', 'saa-3-04', 'saa-4-128', 'saa-2-107', 'dva-4-323'],
    ebdeploy: ['dva-3-214', 'dva-3-215', 'dva-3-216', 'dva-3-217', 'dva-3-09', 'saa-2-561', 'dva-3-316'],
    edgecompute: ['saa-3-110', 'saa-3-207', 'saa-2-214', 'saa-4-209', 'saa-4-210', 'saa-3-307', 'saa-2-308', 'saa-2-309', 'saa-2-569'],
    cicd: ['dva-3-14', 'dva-3-226', 'dva-3-227', 'dva-3-320', 'dva-3-229', 'dva-3-231', 'dva-3-11', 'dva-3-230', 'dva-3-225'],
    iac: ['dva-3-128', 'dva-3-124', 'dva-3-131', 'dva-3-132', 'dva-3-130', 'dva-3-06', 'dva-3-07', 'dva-3-310', 'dva-3-308', 'dva-3-129'],
    trailproof: ['dva-4-800', 'dva-4-801', 'dva-4-802', 'dva-4-803', 'dva-4-404', 'dva-4-12', 'dva-2-406'],
    familiars: ['saa-2-501', 'saa-2-303', 'saa-2-302', 'saa-2-301', 'saa-3-504', 'saa-1-501', 'saa-3-506', 'saa-3-306', 'saa-3-303', 'saa-4-303', 'dva-3-502'],
    datalake: ['saa-4-121', 'saa-3-124', 'saa-3-127', 'saa-3-226', 'saa-3-223', 'saa-3-206', 'saa-3-225', 'saa-3-233', 'saa-3-304'],
    metrics: ['dva-4-104', 'dva-4-115', 'dva-4-120', 'dva-4-121', 'dva-4-03', 'dva-4-301', 'dva-4-125'],
    structlogs: ['dva-4-13', 'dva-4-04', 'dva-4-308', 'dva-4-105', 'dva-4-310', 'saa-1-304', 'saa-2-310'],
    deploycfg: ['dva-3-201', 'dva-3-202', 'dva-3-207', 'dva-3-208', 'dva-3-10', 'dva-4-109', 'dva-4-123', 'dva-3-210', 'dva-3-206'],
    s3access: ['dva-4-804', 'dva-4-805', 'dva-4-806'],
    integdebug: ['dva-4-807', 'dva-3-120', 'dva-3-118'],
    tracing: ['dva-4-01', 'dva-4-02', 'dva-4-117', 'dva-4-107', 'dva-4-118', 'saa-2-201', 'saa-2-202', 'dva-4-315'],
    stages: ['dva-3-02', 'dva-3-03', 'dva-3-232', 'dva-3-302', 'dva-3-306', 'dva-3-322', 'dva-3-406', 'dva-3-312'],
    appcfg: ['dva-3-12', 'dva-3-107', 'dva-3-108', 'dva-3-105', 'dva-3-117'],
    shifting: ['dva-3-808', 'dva-3-809', 'dva-3-810', 'dva-3-211', 'dva-3-01', 'dva-3-323', 'dva-3-209', 'dva-3-402']
  };
  Object.keys(D.Q).forEach(c => D.Q[c].forEach(id => {
    const q = (SD.bank || []).find(x => x.id === id);
    if (q && !SD.questions.some(x => x.id === id)) SD.questions.push(Object.assign({}, q, { c }));
  }));
  // One of a concept's questions (or, for an earlier chapter's concept, one of its own), at random.
  D.pickQ = c => (D.Q[c] ? SD.qpick(D.Q[c], { c }) : SD.qpick(SD.questions.filter(q => q.c === c && q.id && !q.lp && q.type !== 'explain')));

  // ---------- The expeditions ----------
  const intro = (...l) => l.map(([who, text]) => ({ who, text }));
  const XP = (id, name, blurb, back, floors, more) => Object.assign({ id, name, who: ['mira', 'kai', 'seoyeon', 'dutch'], opens: () => !!(SD.c5world && SD.c5world.on), sev: 0.85, dmg: 0.85, blurb, back,
    cafe: { title: 'The Refectory', who: null, name: 'The refectory', text: 'The Arcanum\'s refectory, rebuilt to the last chipped plate. The scholarship students eat at the far table. Tonight, so do you.' },
    camp: { title: 'A Lecture Hall After Hours', text: 'An empty lecture hall with a lamp still lit. Rest on the benches, or use the demonstration bench on one of your cards. Each of you chooses one.' },
    regroup: [{ who: 'dutch', text: 'Up. Again. From the top of the floor, and this time we read the record first.' }], floors }, more);
  const fl = (o) => Object.assign({ map: '5' }, o);
  SD.expeditions = (SD.expeditions || []).concat([
    XP('x5shops', 'The Workshops', 'The Arcanum\'s workshops, where the tower\'s machines are made: the Forge, then the Assembly Line.', 'Back up to the city', [
      fl({ name: 'The Forge', gate: 'THE WORKSHOPS · THE FORGE', beat: 'Golems that only get bigger, apprentices out of breath, and a liar at the door.', boss: 'x5forgemaster', bossTitle: 'The Forge Master', fade: 5,
        plan: [['fight', 'notes', 'fight'], ['notes', 'fight', 'event'], ['fight', 'sort', 'notes'], ['elite', 'cafe', 'fight'], ['camp', 'fight', 'notes'], ['fight', 'event', 'board'], ['notes', 'elite', 'fight'], ['event', 'fight', 'board'], ['camp', 'cafe', 'camp']],
        fights: ['x5golem', 'x5reclaim', 'x5burst', 'x5night', { ids: ['x5golem', 'x5burst'] }, { ids: ['x5reclaim', 'x5night'] }], elites: ['x5liar'],
        notes: ['x5page8', 'x5buy', 'x5health'], sorts: ['x5listener'], events: ['x5anvil', 'x5kyu8', 'x5kagemaru'],
        intro: intro([null, 'The Forge: furnaces in rows, golems at every anvil, and the heat of a thousand machines being made at once.'], ['lead', { dutch: 'Kyu left a page on the door. Read it before you hit anything.', other: 'There\'s a page of Kyu\'s on the door. Page eight.' }], ['dutch', 'Somewhere in here there\'s a man chained to an anvil. I can hear him.']),
        outro: intro([null, 'The Forge Master lowers his hammers, one by one, across the whole fleet.'], ['mate1', 'He kept growing. We kept up.'], ['dutch', 'Ayo. We said we\'d come back for him.']) }),
      fl({ name: 'The Assembly Line', gate: 'THE WORKSHOPS · THE ASSEMBLY LINE', beat: 'Containers with no roles, images too fat to start, and fifty-two machines on fire.', boss: 'x5line', bossTitle: 'The Line Itself', fade: 5,
        plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'sort'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'board'], ['camp', 'notes', 'event'], ['fight', 'elite', 'sort'], ['notes', 'fight', 'board'], ['fight', 'event', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['x5norole', 'x5fatimage', 'x5oldforge', 'x5migrant', { ids: ['x5norole', 'x5fatimage'] }, { ids: ['x5oldforge', 'x5migrant'] }], elites: ['x5overseer'],
        notes: ['x5roles', 'x5eb'], sorts: ['x5task'], events: ['x5kaito', 'x5kagemaru', 'x5kyu8'],
        intro: intro(['c5', 'kaito'], [null, 'The Assembly Line: a conveyor through the whole floor, and fifty-two services along it, half of them smoking.'], ['mate2', 'Somebody built this as fifty-two pieces.'], ['dutch', 'Somebody\'s still up there on the gantry, pretending it\'s fine.']),
        outro: intro([null, 'The Line slows, and stops, and the servers under it are simply gone. The tasks keep running.'], ['kaito', 'I had it under control.', 'proud'], ['dutch', 'Sure you did, kid. Down the stairs. Camp\'s that way.']) })
      // Balance (Ladi, 2026-10-21: chapters get harder in order): the Workshops were a 100% clear for bots; their Severity
      // and load up to 1.1 and 1.2 bring it to about 85%, the easiest of the three.
    ], { sev: 1.1, dmg: 1.2 }),
    XP('x5records', 'The Records Floors', 'Below the city, the floors where the Arcanum keeps its records: the Janitor\'s Closet, the Lecture Halls, the Healers\' Ward.', 'Back up to the city', [
      fl({ name: 'The Janitor\'s Closet', gate: 'THE RECORDS FLOORS · THE JANITOR\'S CLOSET', beat: 'Furniture the wards never see, pages rewritten after the fact, and a trail that logged every door.', boss: 'x5mop', bossTitle: 'The Mop Bucket', fade: 5,
        plan: [['fight', 'notes', 'fight'], ['sort', 'fight', 'event'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'board'], ['camp', 'event', 'fight'], ['fight', 'elite', 'notes'], ['notes', 'fight', 'board'], ['fight', 'event', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['x5furniture', 'x5rewritten', 'x5ninety', { ids: ['x5furniture', 'x5rewritten'] }, { ids: ['x5ninety', 'x5furniture'] }], elites: ['x5nodata'],
        notes: ['x5trail', 'x5ledgers'], sorts: ['x5gate'], events: ['x5lina', 'x5freya', 'x5kagemaru'],
        intro: intro([null, 'The janitor\'s closet. It goes down a long way further than a closet should, shelf after shelf, all of it Freya\'s perfect copy.'], ['dutch', 'I worked nights in this closet for a year. It was smaller.'], ['mate1', 'The wards log every door down here.'], ['dutch', 'Every door. Not one page.']),
        outro: intro(['c5', 'ledgers']) }),
      fl({ name: 'The Lecture Halls', gate: 'THE RECORDS FLOORS · THE LECTURE HALLS', beat: 'The familiars, each with one job, and a dean who wants two answered at once.', boss: 'x5dean', bossTitle: 'The Dean', fade: 5,
        plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'notes'], ['fight', 'sort', 'cafe'], ['elite', 'fight', 'notes'], ['camp', 'event', 'fight'], ['fight', 'elite', 'board'], ['notes', 'fight', 'event'], ['fight', 'board', 'fight'], ['camp', 'cafe', 'camp']],
        fights: [{ ids: ['x5polly', 'x5transcribe'] }, { ids: ['x5textract', 'x5rekognition'] }, { ids: ['x5translate', 'x5comprehend'] }, { ids: ['x5lex', 'x5sagemaker'] }, 'x5fullscan', { ids: ['x5fullscan', 'x5comprehend'] }], elites: ['x5q'],
        notes: ['x5familiars', 'x5lake'], sorts: ['x5lakeperm'], events: ['x5generations', 'x5video', 'x5kagemaru'],
        intro: intro([null, 'The Lecture Halls: tiered benches, a lectern in each, and on every lectern a familiar, waiting to be asked its one question.'], ['lead', { seoyeon: 'Ask each one its own question. Nothing else.', other: 'Each of them does one thing. Ask the right one.' }], ['dutch', 'Lina sat in this hall. Third row. She told me that once. I didn\'t listen.']),
        outro: intro([null, 'The Dean closes the register. "Two familiars, one question. Adequate."'], ['mate2', 'Pella\'s still in the library. She should come with us.']) }),
      fl({ name: 'The Healers\' Ward', gate: 'THE RECORDS FLOORS · THE HEALERS\' WARD', beat: 'Lines gone flat with nobody watching, screams nobody can search, and the night nurse.', boss: 'x5nurse', bossTitle: 'The Night Nurse', fade: 4,
        plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'board'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'notes'], ['camp', 'event', 'fight'], ['fight', 'elite', 'board'], ['notes', 'fight', 'event'], ['fight', 'board', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['x5flatline', 'x5scream', 'x5dashboard', { ids: ['x5flatline', 'x5scream'] }, { ids: ['x5dashboard', 'x5flatline'] }], elites: ['x5custom'],
        notes: ['x5chart', 'x5emf'], sorts: ['x5gate'], events: ['x5infirmary', 'x5freya', 'x5kagemaru'],
        intro: intro([null, 'The Healers\' Ward: rows of beds, charts at their feet, and one bed by the window, made up and empty.'], ['mira', 'I\'ve worked wards like this. You learn to read the charts before the faces.'], ['dutch', '...That\'s her bed.']),
        outro: intro(['c5', 'chart']) })
      // Balance (2026-10-21): up from 0.85 and 0.88 (a 100% clear) so the Night Nurse bites, to about two in three clean;
      // she is steep, so small steps (0.9 and 0.96 was 50%).
    ], { sev: 0.88, dmg: 0.93 }),
    XP('x5tower', 'The Astronomy Tower', 'Up the Arcanum\'s tower to floor 80: the Staff Stair, the Relay Floor, the Clocktower, and the Observatory at the top, rail and all.', 'Back down to the city', [
      fl({ name: 'The Staff Stair', gate: 'THE ASTRONOMY TOWER · THE STAFF STAIR', beat: 'A stair the wards can\'t see, a reader who leaves no trace, and the ward Lina turned on.', boss: 'x5stair', bossTitle: 'The Stair Itself', fade: 5,
        plan: [['fight', 'notes', 'fight'], ['sort', 'fight', 'event'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'board'], ['camp', 'event', 'fight'], ['fight', 'elite', 'notes'], ['notes', 'fight', 'board'], ['fight', 'event', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['x5unseen', 'x5reader', 'x5loop', { ids: ['x5unseen', 'x5reader'] }, { ids: ['x5loop', 'x5unseen'] }], elites: ['x5liftop'],
        notes: ['x5stair', 'x5lift'], sorts: ['x5gate'], events: ['x5lina', 'x5kagemaru', 'x5freya'],
        intro: intro([null, 'The staff stair: narrow, stone, a hundred and twelve steps up the inside of the tower. The wards were never meant to see it.'], ['dutch', 'She turned a ward on here. A week before.'], ['mate1', 'Then it saw everyone.']),
        outro: intro([null, 'The Stair Itself goes quiet. Every step it remembers is in the record, and the record is in Dutch\'s hand.'], ['dutch', 'Twenty-three thirty-eight. Somebody came up the stair.']) }),
      fl({ name: 'The Relay Floor', gate: 'THE ASTRONOMY TOWER · THE RELAY FLOOR', beat: 'Slow hops, lost headers, a sampler who sees one in twenty, and Theo.', boss: 'x5relaykeeper', bossTitle: 'The Relay Keeper', fade: 4,
        plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'notes'], ['fight', 'board', 'cafe'], ['elite', 'fight', 'notes'], ['camp', 'event', 'fight'], ['fight', 'elite', 'board'], ['notes', 'fight', 'event'], ['fight', 'board', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['x5slowhop', 'x5lostheader', 'x5metadata', { ids: ['x5slowhop', 'x5lostheader'] }, { ids: ['x5metadata', 'x5slowhop'] }], elites: ['x5sampler'],
        notes: ['x5relay', 'x5lift'], sorts: ['x5stagesort'], events: ['x5relaymap', 'x5kagemaru', 'x5bell'],
        intro: intro(['c5', 'theo'], [null, 'Floor 76, the Relay Floor: the wards\' messages pass through here, hop by hop, on brass wires along the walls.'], ['dutch', 'Theo was on this floor all along. Hiding with the drained kids.']),
        outro: intro([null, 'The Relay Keeper unrolls the night\'s map: a request from one office, two hops, the infirmary ward. 23:38.'], ['theo', 'I told them. Nobody wrote it down.', 'sad'], ['dutch', 'Somebody did. It just took a ward.']) }),
      fl({ name: 'The Clocktower', gate: 'THE ASTRONOMY TOWER · THE CLOCKTOWER', beat: 'Unapproved releases, flags flipped in the dark, and Midnight itself.', boss: 'x5midnight', bossTitle: 'Midnight', fade: 3,
        plan: [['fight', 'notes', 'fight'], ['fight', 'event', 'notes'], ['board', 'fight', 'cafe'], ['elite', 'fight', 'board'], ['camp', 'notes', 'fight'], ['fight', 'elite', 'board'], ['event', 'fight', 'notes'], ['fight', 'board', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['x5unapproved', 'x5stagevar', 'x5flag', { ids: ['x5unapproved', 'x5stagevar'] }, { ids: ['x5flag', 'x5unapproved'] }], elites: ['x5unread'],
        notes: ['x5ship', 'x5stages', 'x5drift'], sorts: ['x5release', 'x5stagesort'], events: ['x5flagbox', 'x5bell', 'x5kagemaru'],
        intro: intro(['c5', 'clock'], [null, 'The Clocktower: gears the size of houses, and in the middle of them, the pipeline that redeploys the tower every night.'], ['dutch', 'Cron ran this. Because the schedule said to.'], ['mate2', 'Then we get ahead of it.']),
        outro: intro([null, 'Midnight strikes, and nothing changes. Your pipeline was ahead of hers.'], ['dutch', 'Up. The Observatory. She\'s at the rail.']) }),
      fl({ name: 'The Observatory', gate: 'THE ASTRONOMY TOWER · THE OBSERVATORY', beat: '23:50. Iris at the rail, the lanterns along the walls, and the floor to move before midnight.', boss: 'x5iris', bossTitle: 'Iris Vell', bossPack: { ids: ['x5iris', 'x5lantern', 'x5lantern'] }, fade: 3,
        plan: [['fight', 'notes', 'fight'], ['notes', 'event', 'fight'], ['fight', 'board', 'notes'], ['elite', 'fight', 'cafe'], ['camp', 'notes', 'fight'], ['fight', 'event', 'board'], ['fight', 'elite', 'notes'], ['event', 'fight', 'board'], ['camp', 'cafe', 'camp']],
        fights: [{ ids: ['x5furniture', 'x5unseen'] }, { ids: ['x5flatline', 'x5slowhop'] }, { ids: ['x5lantern', 'x5lantern'] }, 'x5reader', { ids: ['x5scream', 'x5metadata'] }], elites: ['x5nodata', 'x5custom'],
        notes: ['x5shift', 'x5chart', 'x5relay'], sorts: ['x5release'], events: ['x5infirmary', 'x5relaymap', 'x5kagemaru'],
        intro: intro(['c5', 'confront'], [null, 'Freya\'s version of the Observatory, and yours, laid over each other. Everything she rebuilt tonight stands between you and the rail.'], ['dutch', 'Every ward on. Everyone recorded. Staff included.']),
        outro: intro(['c5', 'shift']) })
      // Balance (2026-10-21): a step up from 0.88 and 0.9 (about 60% clean, too close to the Records Floors) so the Tower,
      // with Midnight at the Clocktower, stays the chapter's peak.
    ], { sev: 0.9, dmg: 0.93 })
  ]);
  // A { who: 'c5' } line is a cue for js/c5-world.js, not a line: 'kaito' before the Assembly Line, 'ledgers' after the
  // Closet (the trial's ledgers, the midpoint), 'chart' after the Ward, 'theo' before the Relay Floor, 'clock' before
  // the Clocktower, 'confront' (the evidence) before the Observatory, and 'shift' (the traffic bar) after it.
})();
