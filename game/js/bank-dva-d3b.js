// Question bank batch: DVA task 3.4, deploying with AWS CI/CD services (CodePipeline, CodeBuild, CodeDeploy, Lambda
// packaging and aliases, SAM hooks, Elastic Beanstalk, ECS, API Gateway stages and domains, Amplify, CodeArtifact).
// Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // CodeDeploy on EC2
  { id: "dva-3-201", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc",
    q: "A CodeDeploy deployment group has 20 EC2 instances behind a load balancer. During in-place deployments, at least 15 instances must stay in service at all times, and the team wants each release to finish in as few batches as possible. What should the developer do?",
    opts: [
      "Create a custom deployment configuration with minimum healthy hosts set to FLEET_PERCENT 75, and use it for the deployment group.",
      "Use CodeDeployDefault.HalfAtATime, since it deploys to half of the instances at a time while the other half keep serving traffic.",
      "Use CodeDeployDefault.OneAtATime, since it never takes more than one instance out of service during a deployment.",
      "Use CodeDeployDefault.AllAtOnce, and register each of the instances with the load balancer again after the deployment finishes."
    ], a: 0,
    no: [null,
      "Half at a time takes 10 of the 20 instances out of service, leaving fewer than the 15 that must keep serving.",
      "It keeps 19 instances in service, but it needs 20 batches, where a 75% minimum needs only 4.",
      "All the instances update together, so nothing is guaranteed to stay in service during the release."],
    why: "On EC2, a deployment configuration sets the minimum healthy hosts as a count or a fleet percentage. With 75% of 20, CodeDeploy keeps 15 instances healthy and deploys to the other 5 in each batch.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/instances-health.html", "https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations-create.html"] },

  { id: "dva-3-202", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc",
    q: "A team deploys a web app to EC2 instances with CodeDeploy. A CloudWatch alarm already watches the app's 5xx error rate. If the alarm goes off during a deployment, the deployment must stop and the instances must return to the last working release without anyone acting. What should the developer configure?",
    opts: [
      "Add the alarm to the deployment group, and turn on the automatic rollback option to roll back when alarm thresholds are met.",
      "Add an alarm action that invokes a Lambda function, which calls StopDeployment on the deployment that is currently running.",
      "Add a ValidateService hook script that reads the alarm's state and exits with an error code while it is in the ALARM state.",
      "Turn on automatic rollback when a deployment fails, and leave the alarm out of the deployment group's settings."
    ], a: 0,
    no: [null,
      "Stopping the deployment leaves the instances partly updated. Nothing redeploys the last working revision.",
      "The hook runs once per instance right after start-up. It doesn't watch the alarm for the rest of the deployment.",
      "A deployment that only raises errors doesn't fail on its own, so the alarm would never trigger a rollback."],
    why: "CodeDeploy watches the alarms added to a deployment group and stops the deployment when one fires. With rollback on alarm thresholds turned on, it then redeploys the last known good revision as a new deployment.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html", "https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-groups-configure-advanced-options.html"] },

  { id: "dva-3-203", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc",
    q: "A team moves an existing app on EC2 instances to CodeDeploy. The first deployment fails with the error: The deployment failed because a specified file already exists at this location. The files on the instances were copied there by hand before CodeDeploy was used, and the new revision should replace them. What should the developer do?",
    opts: [
      "Create the deployment with the file exists behavior set to OVERWRITE, so files from the revision replace the ones already there.",
      "Create the deployment with the file exists behavior set to RETAIN, so the files that are already on the instances are kept in place.",
      "Add the existing files to the files section of the appspec.yml, so the CodeDeploy agent treats them as its own files.",
      "Reinstall the CodeDeploy agent on each instance, so that its cleanup file lists the files that are already there."
    ], a: 0,
    no: [null,
      "RETAIN keeps the old files and skips the revision's copies, so the new release wouldn't be installed.",
      "The files section says what to copy from the revision. It doesn't change how existing files are handled.",
      "The cleanup file only lists what earlier CodeDeploy deployments installed. Reinstalling the agent doesn't add the hand-copied files."],
    why: "The agent removes the files the last deployment installed. Any other file in a target location fails the deployment by default (DISALLOW), unless the deployment sets fileExistsBehavior to OVERWRITE or RETAIN.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-rollback-and-redeploy.html", "https://docs.aws.amazon.com/codedeploy/latest/APIReference/API_CreateDeployment.html"] },

  { id: "dva-3-204", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc",
    q: "A revision's ApplicationStop script had a bug, and it was fixed in the next revision. Every new deployment to the EC2 instances still fails in the ApplicationStop event, with the same error from the old script. What should the developer do to get the fixed revision deployed?",
    opts: [
      "Deploy with the option to ignore ApplicationStop failures, since that event runs the script from the last successful revision.",
      "Move the fixed stop logic into the BeforeInstall hook, since the ApplicationStop event always runs the script from the newest revision.",
      "Roll back to an older revision first, and then deploy the fixed revision again with the same appspec.yml file.",
      "Raise the timeout on the ApplicationStop hook in the new appspec.yml, so the old script has longer to finish."
    ], a: 0,
    no: [null,
      "ApplicationStop runs the previous successful revision's script, so it would still fail before BeforeInstall is reached.",
      "A rollback is a new deployment too, and it runs the same failing ApplicationStop script first.",
      "The new appspec.yml isn't used for ApplicationStop. The old script fails anyway; it isn't slow."],
    why: "ApplicationStop, BeforeBlockTraffic and AfterBlockTraffic run scripts from the AppSpec file of the last successful deployment. If one of those scripts always fails, deploy with ignoreApplicationStopFailures (--ignore-application-stop-failures).",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/troubleshooting-deployments.html"] },

  { id: "dva-3-205", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "multi", hint: "Select TWO.",
    q: "A developer adds new EC2 instances, launched from a plain Amazon Linux AMI, to a CodeDeploy deployment group by tag. The revision is stored in an S3 bucket. Deployments to the new instances never start their lifecycle events and then fail. Which actions must the developer take? (Select TWO.)",
    items: [
      { t: "Install the CodeDeploy agent on each instance and make sure it is running, for example with Systems Manager.", ok: true },
      { t: "Attach an instance profile whose role can read the revision bucket, with s3:Get* and s3:List* on it.", ok: true },
      { t: "Attach the CodeDeploy service role to the instances, so that CodeDeploy can act on them directly.", ok: false, no: "The service role is for CodeDeploy itself. Instances need their own instance profile to fetch revisions." },
      { t: "Open inbound port 443 in the instances' security group, so that CodeDeploy can push the revision.", ok: false, no: "The agent polls CodeDeploy over outbound HTTPS. Nothing connects in to the instances." },
      { t: "Switch the deployment group to blue/green, since in-place deployments need instances from an AWS AMI.", ok: false, no: "In-place deployments work on any supported OS. Blue/green would hit the same agent problem." }
    ],
    why: "On the EC2/On-Premises platform, the CodeDeploy agent on each instance polls for work and runs the hooks. The instance profile gives the agent permission to download the revision from S3.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/codedeploy-agent.html", "https://docs.aws.amazon.com/codedeploy/latest/userguide/getting-started-create-iam-instance-profile.html"] },

  { id: "dva-3-206", exam: "both", dva: "3.4", saa: "2.2", topic: "codedeploy", type: "mc",
    q: "An app runs on EC2 instances in an Auto Scaling group behind an Application Load Balancer and is released with CodeDeploy in-place deployments. Each release now must run on freshly launched instances, keep full capacity, and be undone within minutes by sending traffic back to the old instances. Which solution meets these requirements?",
    opts: [
      "Use a blue/green deployment group that copies the Auto Scaling group, and keep the original instances running for a set time.",
      "Keep the in-place deployment type, use CodeDeployDefault.OneAtATime, and turn on automatic rollback when a deployment fails.",
      "Replace the deployment group's instances with a new launch template version, then start an instance refresh on the group.",
      "Use a blue/green deployment group with a Canary10Percent5Minutes configuration for the instances in the replacement group."
    ], a: 0,
    no: [null,
      "In-place updates the running instances, and a rollback redeploys the old revision onto them instead of switching traffic back.",
      "An instance refresh replaces instances gradually, but the old ones are terminated, so there is nothing to send traffic back to.",
      "Canary and linear configurations are for Lambda and ECS. EC2 blue/green uses the EC2/On-Premises configurations."],
    why: "An EC2 blue/green deployment installs the revision on a replacement set of instances, which can be a copy of the Auto Scaling group, then reroutes the load balancer to them. Keeping the originals for a while makes rolling back a traffic switch.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/welcome.html", "https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-groups-create-blue-green.html"] },

  // CodeDeploy on Lambda and ECS, SAM hooks
  { id: "dva-3-207", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc",
    q: "A CodeDeploy deployment of a Lambda function lists a BeforeAllowTraffic hook function in its AppSpec file. The hook function runs its tests, which pass, and returns normally. The deployment stays at BeforeAllowTraffic and fails after an hour. What should the developer do?",
    opts: [
      "Have the hook call PutLifecycleEventHookExecutionStatus with the deployment and hook execution IDs from its event.",
      "Give the CodeDeploy service role permission to invoke the hook function, so that CodeDeploy can read the hook function's result.",
      "Move the tests to an AfterAllowTraffic hook, which completes as soon as the hook function returns without an error.",
      "Raise the hook function's timeout, so CodeDeploy has more time to collect the result before the one-hour limit ends."
    ], a: 0,
    no: [null,
      "The tests ran, so CodeDeploy already invoked the function. A return value isn't how a hook reports back.",
      "Every Lambda hook, AfterAllowTraffic included, has to report its result the same way.",
      "The function already finished. CodeDeploy is waiting for a status call that never comes."],
    why: "A Lambda hook function for a Lambda or ECS deployment must report Succeeded or Failed by calling PutLifecycleEventHookExecutionStatus, which its execution role must allow. If CodeDeploy hears nothing within one hour, it fails the deployment.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html"] },

  { id: "dva-3-208", exam: "DVA", dva: "3.4", topic: "codedeploy", type: "mc",
    q: "An ECS service uses CodeDeploy blue/green deployments with an Application Load Balancer that has a production listener and a test listener. Automated API tests must run against the new task set through the test listener, and roll the deployment back if they fail, before any production traffic moves. In which AppSpec hook should the test function run?",
    opts: ["AfterAllowTestTraffic", "BeforeInstall", "AfterAllowTraffic", "ValidateService"], a: 0,
    no: [null,
      "It runs before the replacement task set exists, so there is nothing new to test yet.",
      "It runs after production traffic has already moved to the new task set.",
      "That hook belongs to EC2/On-Premises deployments. ECS AppSpec files don't have it."],
    why: "In an ECS deployment, AfterAllowTestTraffic runs after the test listener sends traffic to the replacement task set and before production traffic shifts. A failed hook can trigger a rollback.",
    doc: ["https://docs.aws.amazon.com/codedeploy/latest/userguide/reference-appspec-file-structure-hooks.html", "https://docs.aws.amazon.com/codedeploy/latest/userguide/tutorial-ecs-deployment-with-hooks.html"] },

  { id: "dva-3-209", exam: "DVA", dva: "3.4", topic: "ecs", type: "multi", hint: "Select TWO.",
    q: "A team wants to move an ECS service on Fargate from rolling updates to CodeDeploy blue/green deployments that shift 10% of traffic first and the rest after 5 minutes. Which steps are required? (Select TWO.)",
    items: [
      { t: "Set the service's deployment controller type to CODE_DEPLOY, so that CodeDeploy manages its task sets.", ok: true },
      { t: "Put an Application Load Balancer in front, with a production listener and two target groups for the task sets.", ok: true },
      { t: "Use a Network Load Balancer with a test listener, and the CodeDeployDefault.ECSCanary10Percent5Minutes config.", ok: false, no: "With a Network Load Balancer, only CodeDeployDefault.ECSAllAtOnce is supported." },
      { t: "Install the CodeDeploy agent in each task's image, so that CodeDeploy can run lifecycle hooks in the tasks.", ok: false, no: "The agent is only for EC2/On-Premises deployments. ECS deployments don't use it." },
      { t: "Set the service's scheduling strategy to DAEMON, so each task set runs on every host during the shift.", ok: false, no: "Fargate and the CODE_DEPLOY controller don't support the DAEMON strategy." }
    ],
    why: "CodeDeploy blue/green for ECS needs a service using the CODE_DEPLOY controller and a load balancer with a production listener and two target groups, one for each task set. Canary and linear configurations need an Application Load Balancer.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-bluegreen.html", "https://docs.aws.amazon.com/codedeploy/latest/userguide/deployment-configurations.html"] },

  { id: "dva-3-210", exam: "DVA", dva: "3.4", topic: "sam", type: "mc",
    q: "A SAM template already deploys a function with AutoPublishAlias and a canary DeploymentPreference. A smoke test must run against the new version before it gets any traffic, and an integration test must run after all traffic has moved, failing the deployment if either test fails. What should the developer add?",
    opts: [
      "Hooks under DeploymentPreference, with PreTraffic and PostTraffic test functions that report their results to CodeDeploy.",
      "The two test functions under DeploymentPreference Alarms, so CodeDeploy runs them before and after the traffic shift.",
      "A CodeBuild test action in the pipeline after sam deploy, which fails the pipeline when either of the tests fails.",
      "An AWS::Lambda::EventInvokeConfig resource on the alias, with the test functions as its on-success and on-failure destinations."
    ], a: 0,
    no: [null,
      "Alarms takes CloudWatch alarms, not functions. They roll back on a metric, they don't run tests.",
      "sam deploy has already shifted the traffic by then, so the smoke test isn't before any traffic.",
      "Destinations receive the results of asynchronous invocations. They don't run tests during a deployment."],
    why: "SAM passes Hooks to CodeDeploy: the PreTraffic function runs before any traffic shifts and the PostTraffic function after it finishes. Each must call back to CodeDeploy with Succeeded or Failed, and a failure rolls the deployment back.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/automating-updates-to-serverless-apps.html"] },

  // Lambda packaging and aliases
  { id: "dva-3-211", exam: "DVA", dva: "3.4", topic: "lambda", type: "mc",
    q: "A developer wants a Lambda alias named live to send 95% of traffic to version 6 and 5% to the code just uploaded, without CodeDeploy. The update-alias call that adds $LATEST as the additional version with weight 0.05 is rejected. What should the developer do?",
    opts: [
      "Publish the new code as version 7, then update the alias with AdditionalVersionWeights set to 0.05 for version 7.",
      "Point the alias at $LATEST with weight 0.95, and add version 6 as the additional version with weight 0.05.",
      "Create a second alias for $LATEST, and set the live alias's routing configuration to send 5% of its traffic there.",
      "Set reserved concurrency on version 6 to 95% of the account limit, so that the rest of the calls go to $LATEST."
    ], a: 0,
    no: [null,
      "A weighted alias can't point to $LATEST at all, as either the main or the additional version.",
      "Alias routing weights name function versions. An alias can't route to another alias.",
      "Reserved concurrency caps concurrent executions. It doesn't split an alias's traffic between versions."],
    why: "A weighted alias splits traffic between two published versions. Both must have the same execution role and dead-letter queue configuration, and neither can be $LATEST.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html"] },

  { id: "dva-3-212", exam: "DVA", dva: "3.4", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A team moves a Lambda function from a .zip package to a container image. Company policy requires the image to be built on the company's own Debian base image, which is kept in a private third-party registry. Which steps are required? (Select TWO.)",
    items: [
      { t: "Add the runtime interface client for the function's language to the image, so the image works with Lambda.", ok: true },
      { t: "Push the built image to an Amazon ECR repository in the same Region as the function, and use its URI.", ok: true },
      { t: "Change the existing function's package type from Zip to Image with update-function-configuration.", ok: false, no: "The package type can't be changed on an existing function. Create a new function from the image." },
      { t: "Point the function at the image in the third-party registry, and give Lambda the registry's credentials.", ok: false, no: "Lambda only pulls images from Amazon ECR, so the image has to be copied there first." },
      { t: "Build one multi-architecture image for x86_64 and arm64, so Lambda can pick either architecture.", ok: false, no: "Lambda doesn't support multi-architecture images. Build for the function's one architecture." }
    ],
    why: "AWS base images already include a runtime interface client, but a non-AWS base image needs one added. Lambda creates functions from images in an ECR repository in the function's Region.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/images-create.html"] },

  { id: "dva-3-213", exam: "DVA", dva: "3.4", topic: "lambda", type: "mc",
    q: "Twelve Lambda functions share a validation library through a Lambda layer. The developer fixes a bug in the library and publishes the layer again, which creates version 4. A day later, the functions still behave as if the bug were there. What should the developer do?",
    opts: [
      "Update each function to use the layer's version 4 ARN, since a function keeps the layer version it was given.",
      "Delete layer version 3, so that the functions fall back to the newest version of the layer the next time they start.",
      "Publish a new version of each function, so that Lambda picks up the latest version of each of the layers it uses.",
      "Wait for the functions' execution environments to be recycled, after which they load the newest layer version."
    ], a: 0,
    no: [null,
      "Functions keep using a layer version they already have, even after it is deleted.",
      "Publishing a function version snapshots the current configuration, which still names version 3.",
      "New execution environments load the same layer version ARN that the configuration names."],
    why: "Layer versions are immutable, and a function's configuration names a specific layer version ARN. Taking a new layer version means updating each function to it.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/adding-layers.html", "https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html"] },

  // Elastic Beanstalk
  { id: "dva-3-214", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc",
    q: "An Elastic Beanstalk environment with an Application Load Balancer serves a busy web app. Each release must first get 10% of client traffic for 15 minutes, then all of it. If the new instances fail health checks, traffic must return to the old instances with no interruption. The environment and its URL must stay the same. What should the developer configure?",
    opts: [
      "The TrafficSplitting deployment policy, with NewVersionPercent set to 10 and EvaluationTime set to 15.",
      "The Rolling deployment policy, with BatchSizeType set to Percentage and BatchSize set to 10.",
      "The Immutable deployment policy, with the health check threshold for the new instances set to Ok.",
      "A cloned environment for each release, then Swap environment URLs once the clone has run for 15 minutes."
    ], a: 0,
    no: [null,
      "Rolling updates 10% of the instances per batch, takes them out of service, and has no evaluation period.",
      "Immutable puts the new instances into service without a set traffic percentage or evaluation period.",
      "A URL swap moves all traffic at once, and it uses a second environment, which the team doesn't want."],
    why: "Traffic splitting launches a full new set of instances, sends a set percentage of traffic to them for the evaluation time, then shifts the rest. If health checks fail, traffic goes back to the old instances.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html"] },

  { id: "dva-3-215", exam: "both", dva: "3.4", saa: "2.2", topic: "beanstalk", type: "mc",
    q: "A rolling deployment to an Elastic Beanstalk web environment failed halfway last month and left instances on two versions, which took hours to fix. Deployments must not change the instances that are serving traffic, a failed deployment must leave them in service, and the environment's DNS name must not change. Which deployment policy should the team use?",
    opts: [
      "Immutable: the new version launches on new instances in a temporary Auto Scaling group.",
      "Rolling with additional batch, which adds one batch of instances first so capacity stays full.",
      "All at once, followed by a redeploy of the previous version if any of the instances fail.",
      "Blue/green, with a cloned environment and Swap environment URLs once the clone is healthy."
    ], a: 0,
    no: [null,
      "After the extra batch, it still updates the instances that serve traffic, so a failure can leave mixed versions.",
      "Every instance changes at once, causing downtime, and a failure affects all of them.",
      "It protects the old instances, but the URL swap changes DNS records, which the team ruled out."],
    why: "An immutable update builds a full set of new instances in a separate Auto Scaling group alongside the old ones. If the new instances fail health checks, Elastic Beanstalk terminates them and the originals keep serving.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environmentmgmt-updates-immutable.html", "https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.rolling-version-deploy.html"] },

  { id: "dva-3-216", exam: "both", dva: "3.4", saa: "2.2", topic: "beanstalk", type: "multi", hint: "Select TWO.",
    q: "A company must move an Elastic Beanstalk web app to a new major platform version that is not compatible with the current one. Users must see no downtime, and the RDS database that Elastic Beanstalk created inside the environment must keep its data. Which steps should the team take? (Select TWO.)",
    items: [
      { t: "Launch a new environment on the new platform, deploy and test the app there, then use Swap environment URLs.", ok: true },
      { t: "Decouple the database from the environment first, so both environments connect to one database outside them.", ok: true },
      { t: "Update the platform version in place, using the Immutable deployment policy to replace all the instances.", ok: false, no: "Moving to an incompatible platform version needs a blue/green deployment, not an in-place update." },
      { t: "Terminate the old environment right after the URL swap, so that clients can't reach the old version.", ok: false, no: "DNS caches can still send clients to the old environment. Wait until the old records expire." },
      { t: "Use Route 53 failover routing between the two environments, with the new one as the primary record.", ok: false, no: "Failover routing is for outages. It sends traffic to the secondary only when the primary is unhealthy." }
    ],
    why: "A blue/green deployment runs the new version in a separate environment and swaps the CNAMEs. A database created inside an environment is tied to that environment, so it must be decoupled to keep it.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features.CNAMESwap.html"] },

  { id: "dva-3-217", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc",
    q: "A web app runs on an Elastic Beanstalk environment with four instances. Every deployment must run the app's database schema migration exactly once, after the new source is extracted and before the new version is deployed. What should the developer add to a file in the .ebextensions folder?",
    opts: [
      "A container_commands entry that runs the migration, with leader_only set to true.",
      "A commands entry that runs the migration, with leader_only set to true on that command.",
      "A files entry that writes the migration script into the instances' cron directory.",
      "An option_settings entry that sets the migration command as an environment property."
    ], a: 0,
    no: [null,
      "The commands key has no leader_only option, and it runs before the source is extracted.",
      "A cron job runs on every instance on a schedule, not once per deployment.",
      "An environment property is only a value. Nothing runs it during the deployment."],
    why: "container_commands run after the source is extracted to the staging directory and before it is deployed. leader_only runs a command on one instance, and only during environment creation and deployments.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/customize-containers-ec2.html"] },

  { id: "dva-3-218", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc",
    q: "An app runs on an Elastic Beanstalk Amazon Linux 2023 platform. After every application deployment, a script must call an internal service from each instance once the app and its proxy server are running. Where should the developer put the script in the source bundle?",
    opts: [
      "In .platform/hooks/postdeploy, as an executable file that starts with a #! line.",
      "In .platform/confighooks/postdeploy, as an executable file that starts with a #! line.",
      "In .platform/hooks/prebuild, as an executable file that starts with a #! line.",
      "In .ebextensions, under the commands key of a configuration file."
    ], a: 0,
    no: [null,
      "confighooks run only on configuration deployments, not when a new source bundle is deployed.",
      "prebuild runs before the app and web server are set up, so the app isn't running yet.",
      "The commands key runs before the source bundle is even extracted."],
    why: "Platform hooks in .platform/hooks run during application deployments: prebuild, predeploy, then postdeploy, which is the last step, after the app and proxy server are deployed.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/platforms-linux-extend.hooks.html"] },

  { id: "dva-3-219", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc",
    q: "An Elastic Beanstalk worker environment runs three instances that process jobs from its SQS queue. A nightly report must also run once at 02:00 UTC, through the app's existing POST /nightly-report endpoint. It must not run three times because there are three instances. What should the developer do?",
    opts: [
      "Add a cron.yaml file to the source bundle with a task whose url is /nightly-report and whose schedule is 0 2 * * *.",
      "Add an .ebextensions files entry that writes a crontab line to each instance that posts to /nightly-report at 02:00.",
      "Add a container_commands entry with leader_only set to true that schedules the report on the leader instance.",
      "Send a message to the worker queue each evening with a delay that makes it visible at exactly 02:00 UTC."
    ], a: 0,
    no: [null,
      "Every instance gets the crontab line, so the report would run three times.",
      "Leader-only commands run only during deployments, and the chosen instance can later be replaced.",
      "SQS delays are at most 15 minutes, and something would still have to send the message each night."],
    why: "Periodic tasks in cron.yaml are queued by one leader instance, so each scheduled run becomes one message. Any instance can pick it up, and the daemon POSTs it to the task's url.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features-managing-env-tiers.html"] },

  // ECS deployments
  { id: "dva-3-220", exam: "DVA", dva: "3.4", topic: "ecs", type: "multi", hint: "Select TWO.",
    q: "An ECS service with the rolling update deployment type runs 6 tasks. During every deployment, all 6 desired tasks must keep running and healthy. If the new tasks keep failing to start, the service must return to the last working deployment without anyone acting. Which settings meet these requirements? (Select TWO.)",
    items: [
      { t: "Set minimumHealthyPercent to 100 and maximumPercent to 200 in the deployment configuration.", ok: true },
      { t: "Turn on the deployment circuit breaker with rollback in the service's deployment configuration.", ok: true },
      { t: "Set minimumHealthyPercent to 50 and maximumPercent to 100 in the deployment configuration.", ok: false, no: "That lets ECS stop half the tasks before it starts new ones, dropping below 6." },
      { t: "Select the CodeDeployDefault.ECSAllAtOnce configuration for the service's rolling updates.", ok: false, no: "CodeDeploy configurations apply only to services using the CODE_DEPLOY controller." },
      { t: "Add target tracking auto scaling to the service, so that it adds tasks while the deployment runs.", ok: false, no: "Auto scaling reacts to load. It doesn't hold capacity during a deployment or roll it back." }
    ],
    why: "minimumHealthyPercent is the floor and maximumPercent the ceiling on running tasks during a rolling update, so 100 and 200 start new tasks before stopping old ones. The circuit breaker can roll back to the last COMPLETED deployment.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html", "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html"] },

  { id: "dva-3-221", exam: "DVA", dva: "3.4", topic: "ecs", type: "multi", hint: "Select TWO.",
    q: "A team's ECS task definition uses the image tag app:stable. They push a new image to ECR under the same tag, then wait. Running tasks keep the old code, and even new tasks started by scaling out run the old image. Which actions will get the new image running? (Select TWO.)",
    items: [
      { t: "Start a new deployment of the service, for example with update-service --force-new-deployment.", ok: true },
      { t: "Tag each build uniquely, register a new task definition revision with that tag, and update the service.", ok: true },
      { t: "Stop the tasks one at a time, so the service scheduler starts replacements that pull the new image.", ok: false, no: "The service resolved the tag to an image digest at deployment, so replacements run the old image." },
      { t: "Raise the service's desired count, so that the extra tasks it starts pull the new image from ECR.", ok: false, no: "New tasks in the same deployment use the digest it already resolved, as the team saw." },
      { t: "Turn on tag immutability on the ECR repository, so that the stable tag always means the latest image.", ok: false, no: "Tag immutability stops tags from being overwritten. It would block the push, not deploy it." }
    ],
    why: "ECS resolves image tags to digests when a deployment starts and uses those digests for every task in it. A new deployment resolves the tag again; unique tags in new task definition revisions make each release explicit.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-type-ecs.html", "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/update-service-console-v2.html"] },

  // CodePipeline
  { id: "dva-3-222", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc",
    q: "A pipeline uses an S3 source action on a versioned bucket. A developer added an EventBridge rule so that uploads start the pipeline right away. Since then, every upload starts two pipeline executions. What should the developer do?",
    opts: [
      "Set PollForSourceChanges to false in the S3 source action's configuration.",
      "Turn off versioning on the source bucket, so that each upload makes one event.",
      "Add a second EventBridge rule that drops one of the duplicate events.",
      "Set the pipeline's execution mode to QUEUED, so that one execution waits."
    ], a: 0,
    no: [null,
      "The S3 source action requires a versioned bucket.",
      "EventBridge rules match events; they can't drop a pipeline's polling run.",
      "Queued mode orders executions but still runs both of them."],
    why: "If PollForSourceChanges is left out, it defaults to true, so the pipeline also polls the bucket. With event-based change detection, set it to false to avoid duplicate executions.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-S3.html"] },

  { id: "dva-3-223", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc",
    q: "A pipeline in us-east-1, defined in a CloudFormation template, gets a new CloudFormation deploy action that must create a stack in eu-west-1. Updating the pipeline fails because the action's Region has no artifact store. What should the developer do?",
    opts: [
      "List an S3 bucket per Region in ArtifactStores, including one in eu-west-1 in the pipeline's account, and set Region on the action.",
      "Turn on S3 Cross-Region Replication from the us-east-1 artifact bucket to a bucket in eu-west-1, and name that bucket in the action.",
      "Create the eu-west-1 artifact bucket in the account that owns the target stack, and give the pipeline role access to it.",
      "Move the source action to eu-west-1 as well, so that all the artifacts that the deploy action needs start out in that Region."
    ], a: 0,
    no: [null,
      "CodePipeline copies input artifacts to the action's Region itself. It needs a declared artifact store, not replication.",
      "The artifact bucket and key for each Region must be in the same account as the pipeline.",
      "Source actions can't be cross-Region actions."],
    why: "A pipeline with cross-Region actions needs one artifact bucket per Region, declared in ArtifactStores. CodePipeline then replicates each cross-Region action's input artifacts to that Region.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/actions-create-cross-region.html"] },

  { id: "dva-3-224", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "multi", hint: "Select TWO.",
    q: "A pipeline in a tools account must deploy with CodeDeploy into a production account. The artifact bucket's policy already lets the production account read the bucket, but the deploy action still can't use the artifacts. Which additional steps are required? (Select TWO.)",
    items: [
      { t: "Encrypt artifacts with a customer managed KMS key whose key policy lets the production account use it.", ok: true },
      { t: "Create a role in production that trusts the pipeline's service role, and set it as the action's roleArn.", ok: true },
      { t: "Grant the production account use of the default aws/s3 AWS managed key in its key policy.", ok: false, no: "You can't change an AWS managed key's policy, so other accounts can't be given access to it." },
      { t: "Replicate the artifact bucket to a bucket in the production account with S3 Cross-Region Replication.", ok: false, no: "The action reads from the pipeline's artifact store. A copy elsewhere isn't used." },
      { t: "Create an IAM user in production, and store its access keys as variables in the pipeline's definition.", ok: false, no: "Long-lived keys in plain text are insecure, and actions don't sign in as IAM users." }
    ],
    why: "Cross-account actions need a customer managed KMS key shared with the other account, plus a role in that account that the pipeline's service role assumes to run the action.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-create-cross-account.html"] },

  { id: "dva-3-225", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "multi", hint: "Select TWO.",
    q: "A CodeBuild action in a pipeline builds a container image and computes its tag in the variable IMAGE_TAG. A later deploy action in the same pipeline must receive that tag in its configuration. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "List IMAGE_TAG under env exported-variables in the buildspec, so CodeBuild outputs it.", ok: true },
      { t: "Give the build action a namespace such as BuildVariables, and use #{BuildVariables.IMAGE_TAG}.", ok: true },
      { t: "Reference the value as #{codepipeline.IMAGE_TAG} in the configuration of the deploy action.", ok: false, no: "The codepipeline namespace holds only the implicit variables, such as PipelineExecutionId." },
      { t: "Run export IMAGE_TAG in the post_build phase, so the shell passes it to the next stage.", ok: false, no: "A shell export lasts only inside the build container." },
      { t: "Declare IMAGE_TAG as a pipeline-level variable, and have the build set its value as it runs.", ok: false, no: "Pipeline-level values are set when an execution starts, not by actions." }
    ],
    why: "CodeBuild outputs the variables listed under exported-variables as action variables. Other actions reference an action's variables through the namespace assigned to it, with #{namespace.variable}.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/reference-variables.html", "https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html"] },

  { id: "dva-3-226", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc",
    q: "A release pipeline uses a GitHub source through a CodeConnections connection. It now runs on every push to main, but it must start automatically, and only when a release manager pushes a Git tag that starts with release-, such as release-2.4.0. What should the developer do?",
    opts: [
      "Use a V2 pipeline, and add a push trigger that filters on Git tags matching release-*.",
      "Set the source action's BranchName to release-*, so that only matching refs start a run.",
      "Create an EventBridge rule for GitHub tag events that starts the pipeline on release- tags.",
      "Turn off change detection, and have the release manager start a run by hand after tagging."
    ], a: 0,
    no: [null,
      "BranchName names a single branch, not a pattern, and tags aren't branches.",
      "GitHub events don't reach EventBridge on their own, so the rule would never match.",
      "Runs would start by hand, not automatically when the tag is pushed."],
    why: "V2 pipelines support triggers that filter push events on Git tags, branches or file paths. A tag filter makes tagging a commit the act that starts a release.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-filter.html", "https://docs.aws.amazon.com/codepipeline/latest/userguide/pipeline-types-planning.html"] },

  { id: "dva-3-227", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "mc",
    q: "A V2 pipeline's Deploy stage updates an ECS service. When the stage fails, the team wants the stage to redeploy the artifacts from its last successful execution without anyone acting, rather than leave production on a half-finished release. What should the developer configure?",
    opts: [
      "Automatic rollback on stage failure for the Deploy stage, which reruns it with the last successful execution's artifacts.",
      "Automatic retry on stage failure for the Deploy stage, which reruns the failed actions with the same artifacts.",
      "Automatic rollback on the Source stage, so the pipeline returns to the previous commit and then runs all of its stages again.",
      "A manual approval action at the start of the Deploy stage, so someone can stop a bad release before it starts."
    ], a: 0,
    no: [null,
      "A retry deploys the same failing artifacts again.",
      "A source stage can't be rolled back.",
      "An approval comes before the deployment. It does nothing when the deployment itself fails."],
    why: "In V2 pipelines, a stage can be set to roll back automatically on failure. The rollback is a new execution that uses the source revisions and variables of the stage's most recent successful execution.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/stage-rollback-auto.html", "https://docs.aws.amazon.com/codepipeline/latest/userguide/stage-rollback.html"] },

  // CodeBuild
  { id: "dva-3-228", exam: "DVA", dva: "3.4", topic: "codebuild", type: "multi", hint: "Select TWO.",
    q: "A CodeBuild project must run integration tests against an RDS database in a private subnet. The build also downloads packages from the internet. Builds currently can't reach the database. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Add the VPC, private subnets and a security group to the project, and let the database's group allow it.", ok: true },
      { t: "Route the private subnets' outbound traffic through a NAT gateway in a public subnet of the same VPC.", ok: true },
      { t: "Put the project in a public subnet whose route table sends 0.0.0.0/0 to the VPC's internet gateway.", ok: false, no: "CodeBuild can't give its network interfaces public IP addresses, so an internet gateway route doesn't work." },
      { t: "Make the database publicly accessible, so that the build can reach it from CodeBuild's network.", ok: false, no: "It exposes the database to the internet. A VPC build reaches it privately." },
      { t: "Peer the database's VPC with the VPC that CodeBuild uses by default to run the project's builds.", ok: false, no: "The default build network isn't a VPC in your account that you can peer with." }
    ],
    why: "A VPC-enabled build runs with network interfaces in your subnets, so it can reach private resources. It needs a NAT gateway or NAT instance to reach the internet.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/vpc-support.html"] },

  { id: "dva-3-229", exam: "DVA", dva: "3.4", topic: "codebuild", type: "mc",
    q: "A CodeBuild project runs a few times a day. Each build spends several minutes downloading the same Maven dependencies into /root/.m2. The team wants later builds to reuse those files even when they run on a different build host. What should the developer do?",
    opts: [
      "Configure an Amazon S3 cache on the project, and list /root/.m2/**/* under cache paths in the buildspec.",
      "Configure a local cache with Docker layer cache mode, so that the dependency layers stay on the build host.",
      "Configure a local cache with source cache mode, so that the files in the repository don't download again.",
      "Choose a larger compute type for the project, so that the dependencies download and unpack faster."
    ], a: 0,
    no: [null,
      "A local cache lives on one build host and suits frequent builds. Docker layer caching is for image layers.",
      "Source cache keeps Git metadata, not the dependencies the build downloads.",
      "More CPU and memory don't remove the download from every build."],
    why: "An S3 cache is stored in a bucket and available to any build host, which suits infrequent builds. The paths listed under cache in the buildspec are saved after a build and restored before the next.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/caching-s3.html", "https://docs.aws.amazon.com/codebuild/latest/userguide/caching-local.html"] },

  { id: "dva-3-230", exam: "DVA", dva: "3.4", topic: "codebuild", type: "mc",
    q: "A CodeBuild project runs unit tests that write JUnit XML files to target/surefire-reports. The team wants to see passed and failed test cases for each build in the CodeBuild console, and track test failure rates across builds. What should the developer do?",
    opts: [
      "Add a reports section to the buildspec naming a report group, with those files and file-format JUNITXML.",
      "List the XML files under artifacts in the buildspec, so that CodeBuild uploads them to S3 after each build.",
      "Print the XML files to the build log, and use a CloudWatch Logs metric filter that counts the failed tests.",
      "Add the XML files under secondary-artifacts, so that they show up next to the build output in the console."
    ], a: 0,
    no: [null,
      "Artifacts are stored as files. CodeBuild doesn't read them as test results.",
      "It counts lines in logs, with no per-test view or trends in CodeBuild.",
      "Secondary artifacts are more build output. They aren't parsed as test reports."],
    why: "A buildspec reports section sends test files in a supported format, such as JUnit XML, to a report group. CodeBuild shows each report's test cases and the group's trends.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/test-reporting.html", "https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html"] },

  { id: "dva-3-231", exam: "DVA", dva: "3.4", topic: "codebuild", type: "mc",
    q: "A CodeBuild project on a managed Linux image builds a Docker image and pushes it to ECR. The build fails at the docker build command with: Cannot connect to the Docker daemon at unix:///var/run/docker.sock. What should the developer do?",
    opts: [
      "Turn on privileged mode in the project's environment settings, then run the build again.",
      "Add ecr:GetAuthorizationToken to the service role, and log in to ECR before the build.",
      "Install Docker in the install phase of the buildspec, then start the build again.",
      "Turn on the local Docker layer cache, so that the base layers come from the host."
    ], a: 0,
    no: [null,
      "An ECR login is needed to push, but this error comes earlier, from the Docker daemon itself.",
      "The managed images already include Docker. It needs privileged mode to run.",
      "Docker layer caching itself requires privileged mode, so it doesn't fix this."],
    why: "Building Docker images inside a CodeBuild container needs privileged mode, which gives the build container the access the Docker daemon needs.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/troubleshooting.html"] },

  // API Gateway, Amplify, CodeArtifact
  { id: "dva-3-232", exam: "DVA", dva: "3.4", topic: "apigateway", type: "mc",
    q: "A REST API's prod stage uses the stage variable lambdaAlias to call a Lambda alias. A new API deployment changes mapping templates and must call the function's next alias. It must get 5% of prod traffic at the same URL, then all of it once its metrics look good. What should the developer do?",
    opts: [
      "Add canary settings to the prod stage with 5% traffic, override lambdaAlias to next, then promote the canary.",
      "Create a beta stage for the new deployment, and use Route 53 weighted records to send 5% of clients to it.",
      "Give the function's prod alias a 5% routing weight to next, and leave the API's prod stage as it is.",
      "Create a usage plan for the new deployment, and assign 5% of the API keys to it while the test runs."
    ], a: 0,
    no: [null,
      "A beta stage has its own path, so the new deployment wouldn't be served at the same URL.",
      "Alias weights shift the function's traffic only. The API's new mapping templates wouldn't reach anyone.",
      "Usage plans meter and throttle clients. They don't route requests to a deployment."],
    why: "A canary release on a stage sends a set percentage of the stage's traffic to a newer deployment, with its own stage variable overrides and logs. Promoting it makes that deployment the stage's base.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/canary-release.html"] },

  { id: "dva-3-233", exam: "DVA", dva: "3.4", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "Two Regional REST APIs in eu-west-1 must be served from one hostname: api.example.com/v1 must go to API A's prod stage and api.example.com/v2 to API B's prod stage. The domain is hosted in Route 53. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create a Regional custom domain name with an ACM certificate from eu-west-1, and map v1 and v2 to the stages.", ok: true },
      { t: "Create a Route 53 alias A record for api.example.com that points to the custom domain's Regional domain name.", ok: true },
      { t: "Request the ACM certificate in us-east-1, since API Gateway needs custom domain certificates from there.", ok: false, no: "Only edge-optimized custom domains need us-east-1. A Regional domain needs a certificate in its own Region." },
      { t: "Create a Route 53 CNAME record that points api.example.com to API A's default execute-api hostname.", ok: false, no: "That reaches only API A, and its default endpoint doesn't serve your hostname or path mappings." },
      { t: "Use stage variables in API A's prod stage to forward any request under /v2 to API B's prod stage.", ok: false, no: "Stage variables set values within one API. They don't route requests between APIs." }
    ],
    why: "A custom domain name with API mappings sends each base path to an API stage. A Regional custom domain uses an ACM certificate in the same Region, and DNS points the hostname at its Regional domain name.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-mappings.html"] },

  { id: "dva-3-234", exam: "DVA", dva: "3.4", topic: "amplify", type: "multi", hint: "Select TWO.",
    q: "A front-end app is hosted on AWS Amplify Hosting, connected to a private GitHub repository. Every branch named release/* must be built and deployed to its own URL as soon as it is created, and reviewers must see each pull request at its own URL before it is merged. Which features should the developer turn on? (Select TWO.)",
    items: [
      { t: "Branch autodetection with a pattern such as release*, so matching branches connect and deploy automatically.", ok: true },
      { t: "Web previews for pull requests, so each pull request deploys to a unique preview URL of its own.", ok: true },
      { t: "Manual deploys, with each release branch zipped and uploaded through the console when it is created.", ok: false, no: "Manual deploys aren't connected to Git, so nothing happens when a branch is created." },
      { t: "Custom headers on the main branch, so that requests are routed to whichever branch they name.", ok: false, no: "Custom headers set HTTP response headers. They don't deploy or route branches." },
      { t: "A redirect rule on the main branch that sends /release/* paths to the build of each release branch.", ok: false, no: "Redirects change URLs on one deployed branch. They don't build or deploy other branches." }
    ],
    why: "Amplify Hosting deploys connected branches on every commit. Branch autodetection connects new branches that match a pattern, and web previews deploy each pull request to its own URL.",
    doc: ["https://docs.aws.amazon.com/amplify/latest/userguide/pattern-based-feature-branch-deployments.html", "https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html"] },

  { id: "dva-3-235", exam: "DVA", dva: "3.4", topic: "codeartifact", type: "multi", hint: "Select TWO.",
    q: "CodeBuild builds must install the company's private npm packages and public packages from npmjs.com through a single registry. No long-lived registry token may be stored in the repository or the project. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create a CodeArtifact repository with an upstream repository that has an external connection to npmjs.com.", ok: true },
      { t: "Run aws codeartifact login --tool npm in pre_build, with the service role allowed to get the token.", ok: true },
      { t: "Commit an .npmrc file holding a CodeArtifact authorization token, so that npm can use it in each build.", ok: false, no: "That stores a token in the repository, and it expires after 12 hours by default anyway." },
      { t: "Create an IAM user for the builds, and store its access keys in the project's plaintext environment variables.", ok: false, no: "Long-lived keys in plain text are what the team must avoid. The service role already has credentials." },
      { t: "Publish the private packages to a public npmjs.com scope, so that the builds need no registry login.", ok: false, no: "It makes the company's private code public." }
    ],
    why: "A CodeArtifact repository can pull public packages through an upstream with an external connection, so one registry serves both. The login command uses the build's role to fetch a short-lived token and configure npm.",
    doc: ["https://docs.aws.amazon.com/codeartifact/latest/ug/external-connection.html", "https://docs.aws.amazon.com/codeartifact/latest/ug/using-npm-packages-in-codebuild.html"] }
);
