// Question bank batch: DVA tasks 3.1-3.4 gap fill (API Gateway stages, stage variables, canary and custom domains;
// SAM and CDK deploys to other environments; CodeArtifact, Amplify branches, EKS/ECR image deploys, Elastic Beanstalk
// config; approvals, change sets, rollbacks and release branches). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // 3.2 Test in development environments
  { id: "dva-3-301", exam: "DVA", dva: "3.2", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A REST API's GET /rates method uses a mock integration as a stand-in for a third-party rates service during integration tests. The tests must also check the client's error handling, so a request with ?scenario=fail must get HTTP 500, and every other request must get HTTP 200 with a sample body. No backend may be built. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "In the integration request mapping template, return statusCode 500 when $input.params('scenario') is fail, else 200.", ok: true },
      { t: "Add a 500 method response, and an integration response with HTTP status regex 5\\d{2} that maps to it.", ok: true },
      { t: "Turn on Lambda proxy integration for the method, so that the mock can set its own status code in each response.", ok: false, no: "Proxy integration applies to Lambda and HTTP backends, and the team must not build a backend." },
      { t: "Add a gateway response for DEFAULT_5XX, so that API Gateway returns 500 when the scenario parameter is fail.", ok: false, no: "Gateway responses customize errors API Gateway itself raises. They don't choose a status from a request parameter." },
      { t: "Set a stage variable named scenario to fail on the test stage, so all of that stage's requests return 500.", ok: false, no: "Every request on the stage would then fail. The status must depend on each request's query string." }
    ],
    why: "A mock integration's request template returns the statusCode to use, and it can branch on request parameters. An integration response whose status regex matches that code maps it to a method response.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-mock-integration.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-mock-integration-console.html"] },

  { id: "dva-3-302", exam: "DVA", dva: "3.2", topic: "apigateway", type: "mc",
    q: "A REST API has dev and prod stages, and both call the same Lambda function. Testers run load scripts against the dev stage's POST methods, and the bursts overload a small shared dev database. The scripts send no API keys and must not be changed. Dev requests must be held to 20 requests per second, and prod must not be limited. What should the developer do?",
    opts: [
      "Turn on stage-level throttling for the dev stage, with a rate of 20 and a small burst, and leave prod's settings as they are.",
      "Ask AWS Support to lower the account-level throttling limit in the Region to 20 requests per second for every API in the account.",
      "Set reserved concurrency on the Lambda function, so that it can't run enough copies at once to overload the database.",
      "Create a usage plan for the dev stage with a rate of 20, and add the plan to the dev stage without any API keys."
    ], a: 0,
    no: [null,
      "The account-level limit covers every API and stage in the Region, so prod would be limited too.",
      "Both stages call the same function, so the cap would also limit prod traffic.",
      "Usage plan throttles apply per API key. Requests without keys aren't matched to the plan."],
    why: "Each stage can set its own default throttling rate and burst for its methods. API Gateway then returns 429 to dev callers above the target without touching other stages.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-stages.html"] },

  { id: "dva-3-303", exam: "DVA", dva: "3.2", topic: "sam", type: "mc",
    q: "A CI job promotes a SAM application from dev to staging by running sam deploy --config-env staging after every merge. When a merge changes only documentation, the staging stack has nothing to update, and the job fails because sam deploy exits with a non-zero code. Real deployment failures must still fail the job. What should the developer do?",
    opts: [
      "Add --no-fail-on-empty-changeset to the sam deploy command for staging, or set it in samconfig.toml.",
      "Add --no-confirm-changeset to the command, so that sam deploy applies the change set without a prompt.",
      "Wrap the command so the CI job ignores any non-zero exit code that sam deploy returns for staging.",
      "Run sam sync --stack-name staging instead of sam deploy, so that unchanged resources are skipped."
    ], a: 0,
    no: [null,
      "That controls the confirmation prompt. An empty change set still returns a non-zero exit code.",
      "That would also hide real deployment failures, which must still fail the job.",
      "sam sync is meant for fast development loops, not for promoting builds to a shared staging stack."],
    why: "By default sam deploy returns a non-zero exit code when there are no changes to deploy. --no-fail-on-empty-changeset makes that case succeed, while real errors still fail.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html"] },

  // 3.3 Automate deployment testing
  { id: "dva-3-304", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc",
    q: "A new CloudFormation template creates a REST API with AWS::ApiGateway::RestApi, two AWS::ApiGateway::Method resources, and an AWS::ApiGateway::Deployment with StageName set to test. Creating the stack in a fresh test account fails at the deployment with the error The REST API doesn't contain any methods. What should the developer do?",
    opts: [
      "Add a DependsOn attribute to the Deployment that lists both Method resources, so they exist before it is created.",
      "Move StageName out of the Deployment into a separate AWS::ApiGateway::Stage resource that references the Deployment by ID.",
      "Add the methods to the Deployment's StageDescription property, so that the stage knows which methods to serve.",
      "Change the Deployment's DeletionPolicy to Retain, so it isn't rolled back when it is created before the methods."
    ], a: 0,
    no: [null,
      "A separate stage still points at a deployment, and the deployment would still be created before any methods.",
      "StageDescription holds stage settings such as logging and caching. It doesn't list methods.",
      "DeletionPolicy controls what happens on delete. It doesn't change the order resources are created in."],
    why: "Nothing in the Deployment references the methods, so CloudFormation can create it as soon as the RestApi exists. DependsOn on the methods makes it wait until the API has methods to snapshot.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-deployment.html"] },

  { id: "dva-3-305", exam: "DVA", dva: "3.3", topic: "apigateway", type: "mc",
    q: "One REST API has dev, test and prod stages. Prod must cache GET responses for 5 minutes to cut backend load. Dev and test must always reach the backend so testers see their changes at once, and the team doesn't want to pay for caches it doesn't need. Which solution meets these requirements MOST cost-effectively?",
    opts: [
      "Provision an API cache on the prod stage only, with default method-level caching on and a TTL of 300 seconds.",
      "Provision an API cache on all three stages, and set the cache TTL to 0 seconds on the dev and test stages only.",
      "Create a separate copy of the API for prod with caching on, and keep dev and test on the original API.",
      "Add an ElastiCache cluster that the Lambda functions use in every stage, with a 5-minute expiry on prod keys."
    ], a: 0,
    no: [null,
      "TTL 0 turns caching off, but each provisioned cache is still billed by the hour.",
      "Caching is set per stage, so a second API adds drift and work for no benefit.",
      "That needs cache code and a cluster billed in every environment, more cost and work than a stage setting."],
    why: "API Gateway caching is turned on per stage, and each provisioned cache is charged by the hour. Turning it on only for prod gives prod the cache while dev and test always call the backend.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html"] },

  // 3.4 Stage variables, custom domains
  { id: "dva-3-306", exam: "DVA", dva: "3.4", topic: "apigateway", type: "mc",
    q: "A REST API's Lambda integration uses orders:${stageVariables.alias} as the function name. The prod stage, with alias set to prod, works. The developer adds a qa stage with alias set to qa, and creates the qa alias on the function. Every request to the qa stage returns 500 Internal Server Error. What should the developer do?",
    opts: [
      "Run aws lambda add-permission on the orders function's qa alias, so API Gateway is allowed to invoke it.",
      "Change the qa stage variable to hold the full ARN of the qa alias, instead of just the alias name on its own.",
      "Add lambda:InvokeFunction for the qa alias to the function's own execution role, then redeploy the API.",
      "Turn on Lambda proxy integration for the method, so that the qa alias returns the correct response."
    ], a: 0,
    no: [null,
      "The variable fills in the alias after orders:, so an ARN there makes an invalid name. Permission is the problem.",
      "The execution role is what the function uses to call other services. It doesn't let API Gateway invoke it.",
      "The prod stage works with the same integration, so the response format isn't the problem."],
    why: "When a stage variable names the function, the console can't add the invoke permission for each value. Each function or alias needs a resource-based permission for apigateway.amazonaws.com, or calls fail with 500.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-set-stage-variables-aws-console.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/stage-variables.html"] },

  { id: "dva-3-307", exam: "DVA", dva: "3.4", topic: "apigateway", type: "mc",
    q: "Clients call a REST API at https://abc123.execute-api.us-east-1.amazonaws.com/prod/items. The team creates the custom domain api.example.com and an API mapping with an empty path to the prod stage. Clients switched to https://api.example.com/prod/items now get errors, because no resource matches. Which URL should clients use?",
    opts: [
      "https://api.example.com/items, because the mapping already selects the prod stage.",
      "https://api.example.com/prod/items, after the stage is redeployed to the custom domain.",
      "https://api.example.com/abc123/prod/items, with the API ID first in the path.",
      "https://prod.api.example.com/items, after adding a DNS record for each stage."
    ], a: 0,
    no: [null,
      "The mapping chooses the stage, so /prod is sent to the API as a resource path, which doesn't exist.",
      "A custom domain doesn't route by API ID in the path. The mapping already chooses the API.",
      "Custom domains don't create stage subdomains. The mapping on api.example.com chooses the stage."],
    why: "An API mapping ties a custom domain path to one API stage, so the stage name isn't part of the URL. With an empty mapping path, requests go straight to the API's resources.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-mappings.html"] },

  // CodeArtifact
  { id: "dva-3-308", exam: "DVA", dva: "3.4", topic: "codeartifact", type: "mc",
    q: "A self-hosted CI runner runs aws codeartifact login --tool npm once when it starts, and then runs builds for days. Each morning, npm install fails with 401 Unauthorized against the CodeArtifact repository, and restarting the runner fixes it. The runner's role still has every permission it needs. What should the developer do?",
    opts: [
      "Run aws codeartifact login at the start of each build, so every build gets a fresh token that lasts up to 12 hours.",
      "Run the login command with --duration-seconds set to 604800, so that one token lasts the full week.",
      "Attach codeartifact:ReadFromRepository to the role again, since the token lost it when the session ended.",
      "Add an upstream repository with an external connection to npmjs.com, so npm can fall back to it."
    ], a: 0,
    no: [null,
      "Token lifetimes run from 15 minutes up to 12 hours (43,200 seconds).",
      "Permissions don't expire. The token does, after 12 hours by default.",
      "That doesn't fix the expired token, and private packages aren't on npmjs.com anyway."],
    why: "CodeArtifact authorization tokens last 12 hours by default and at most. Fetching a token at the start of each build means a build never uses an expired one.",
    doc: ["https://docs.aws.amazon.com/codeartifact/latest/ug/tokens-authentication.html"] },

  { id: "dva-3-309", exam: "DVA", dva: "3.4", topic: "codeartifact", type: "multi", hint: "Select TWO.",
    q: "A CodeArtifact domain and its shared-libs repository are in a tools account. CodeBuild projects in a separate workload account must install packages from shared-libs with aws codeartifact login, using their own service roles and no stored keys. Which steps are required? (Select TWO.)",
    items: [
      { t: "In the tools account, add domain and repository policies that let the workload account's build roles get tokens and read from shared-libs.", ok: true },
      { t: "In the workload account, allow the build roles the CodeArtifact token and read actions, and sts:GetServiceBearerToken.", ok: true },
      { t: "Add sts:GetServiceBearerToken to the domain policy in the tools account instead of to the build roles' own policies.", ok: false, no: "That permission has no effect in a domain policy. The caller's own IAM policy must allow it." },
      { t: "Create an IAM user in the tools account, and store its access keys as plaintext environment variables in each project.", ok: false, no: "That stores long-lived keys, which the team ruled out." },
      { t: "Give a repository in the workload account an external connection to shared-libs, so packages flow through it.", ok: false, no: "External connections point to public repositories such as npmjs.com, not to another CodeArtifact repository." }
    ],
    why: "Cross-account access needs both sides: a resource policy in the owning account and identity policies in the calling account. Getting a token also needs sts:GetServiceBearerToken in the caller's own policy.",
    doc: ["https://docs.aws.amazon.com/codeartifact/latest/ug/repo-policies.html", "https://docs.aws.amazon.com/codeartifact/latest/ug/tokens-authentication.html"] },

  // CDK
  { id: "dva-3-310", exam: "DVA", dva: "3.4", topic: "cdk", type: "mc",
    q: "A developer changes a CDK app that is already deployed as the OrdersStack stack in production. Before deploying, the team lead wants a list of what will change in the live stack, including whether any resource will be replaced, without changing anything. Which command should the developer run?",
    opts: [
      "cdk diff OrdersStack, which compares the app's synthesized stack with the deployed stack.",
      "cdk synth OrdersStack, which writes the stack's new CloudFormation template to the cdk.out folder.",
      "cdk deploy OrdersStack --hotswap, which applies only the code changes that it finds.",
      "cdk bootstrap, which prepares the account and lists the resources each stack will need."
    ], a: 0,
    no: [null,
      "It produces the new template, but doesn't compare it with what is deployed.",
      "That deploys changes, which the team lead wants to review first.",
      "Bootstrapping provisions the CDK's own resources. It doesn't compare stacks."],
    why: "cdk diff compares the local app's stacks with the deployed stacks. By default it creates a change set to show accurate replacement information, without applying it.",
    doc: ["https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-diff.html"] },

  { id: "dva-3-311", exam: "DVA", dva: "3.4", topic: "cdk", type: "mc",
    q: "A CDK app looks up an existing VPC with Vpc.fromLookup. On a developer's laptop, cdk synth produces the same template every time. In the CI pipeline, which runs in a fresh container, the lookup runs on every build, and the synthesized template changed after the VPC's subnets changed. Builds must produce the same templates everywhere. What should the developer do?",
    opts: [
      "Commit the cdk.context.json file that the laptop generated to source control, with the rest of the app.",
      "Run cdk context --clear at the start of every pipeline build, so that the lookup always uses fresh values.",
      "Add cdk.context.json to .gitignore, so the pipeline never uses values cached on a developer's laptop.",
      "Pass the VPC ID with --context vpcId on every cdk deploy, and keep calling Vpc.fromLookup for the rest."
    ], a: 0,
    no: [null,
      "That forces a new lookup every time, which is how the template drifted in the first place.",
      "That is the current state of things: without the file, the pipeline looks the values up again.",
      "fromLookup still queries the account for subnet details, so the result can still change."],
    why: "The CDK caches lookup results in cdk.context.json so synthesis is repeatable. That file and cdk.json must be committed, or other environments such as CI will look the values up again.",
    doc: ["https://docs.aws.amazon.com/cdk/v2/guide/context.html"] },

  // Amplify
  { id: "dva-3-312", exam: "DVA", dva: "3.3", topic: "amplify", type: "mc",
    q: "An Amplify Hosting app has connected main and staging branches. The front end reads its backend URL from the API_URL environment variable at build time. Builds of staging must point at the staging API, and builds of main at the production API, from the same code. What should the developer do with the LEAST effort?",
    opts: [
      "Set API_URL for all branches to the production URL, and add a branch override on staging with the staging URL.",
      "Create a second Amplify app for the staging branch, and set API_URL there to the staging URL instead.",
      "Commit a separate config file for each branch, and edit the staging file whenever a merge from main overwrites it.",
      "Store both URLs in the build spec, and use a rewrite rule on the staging branch to swap the API URL in requests."
    ], a: 0,
    no: [null,
      "It works, but it duplicates the app's settings, which is more work than one override.",
      "Merges between branches overwrite the file, so it needs hand edits every time.",
      "Rewrite rules change paths the site serves. They don't change which API the built app calls."],
    why: "Amplify environment variables apply to all branches by default, and a variable override gives one branch its own value. Each branch's build then gets its own setting from the same code.",
    doc: ["https://docs.aws.amazon.com/amplify/latest/userguide/setting-env-vars.html"] },

  { id: "dva-3-313", exam: "DVA", dva: "3.4", topic: "amplify", type: "mc",
    q: "An Amplify Hosting app deploys main to the public site and connects several feature branches, each at its own URL. Unreleased features on the feature branches must be seen only by testers who have a shared user name and password. The main branch must stay public, and nothing new may be built. What should the developer do?",
    opts: [
      "Turn on access control for each feature branch with a user name and password, and leave main without it.",
      "Turn on access control for all branches with one user name and password, so that testers use one login.",
      "Add a Cognito user pool with the Amplify libraries, and require users to sign in on each of the feature branches.",
      "Add a redirect rule on each feature branch that sends any request without a tester header back to main."
    ], a: 0,
    no: [null,
      "The global setting also protects main, which must stay public.",
      "That means building sign-in into the app, which the team ruled out.",
      "Anyone can send a header, so it doesn't restrict access, and redirects don't ask for credentials."],
    why: "Amplify access control puts a user name and password on a branch's URL. It can be set per branch or for all branches, and a branch setting takes precedence over the global one.",
    doc: ["https://docs.aws.amazon.com/amplify/latest/userguide/access-control.html"] },

  // EKS and ECR
  { id: "dva-3-314", exam: "DVA", dva: "3.4", topic: "eks", type: "multi", hint: "Select TWO.",
    q: "An Amazon EKS cluster runs some pods on a managed node group and others through a Fargate profile. A new release's image is in a private ECR repository in the same account. Pods on both kinds of capacity fail to pull the image, and the logs show authorization errors from ECR. Which roles must allow the image pulls? (Select TWO.)",
    items: [
      { t: "The node IAM role of the managed node group, with a policy such as AmazonEC2ContainerRegistryPullOnly.", ok: true },
      { t: "The Fargate profile's pod execution role, with the AmazonEKSFargatePodExecutionRolePolicy policy.", ok: true },
      { t: "The IAM role of the pods' Kubernetes service account, which the containers use for their AWS calls.", ok: false, no: "The kubelet pulls the image before the containers run. Service account roles are for the app's own AWS calls." },
      { t: "The cluster IAM role, which the EKS control plane uses to manage AWS resources for the cluster.", ok: false, no: "The control plane doesn't pull images for pods. Nodes and Fargate do." },
      { t: "A Kubernetes RBAC role bound to the pods' service account that allows get on the image's repository.", ok: false, no: "Kubernetes RBAC grants access to the Kubernetes API, not to ECR." }
    ],
    why: "On EC2 nodes, the kubelet pulls images with the node IAM role. On Fargate, the pod execution role gives the Fargate components permission to pull from ECR.",
    doc: ["https://docs.aws.amazon.com/eks/latest/userguide/create-node-role.html", "https://docs.aws.amazon.com/eks/latest/userguide/pod-execution-role.html"] },

  { id: "dva-3-315", exam: "DVA", dva: "3.4", topic: "eks", type: "multi", hint: "Select TWO.",
    q: "A CodeBuild project pushes each new image to ECR and must then update a Deployment on an Amazon EKS cluster that uses access entries, by running kubectl set image with the new tag. kubectl has no cluster configured in the build, and the build's service role has no Kubernetes permissions yet. Which steps are required? (Select TWO.)",
    items: [
      { t: "Create an access entry for the build's service role, and associate an access policy such as AmazonEKSEditPolicy with it.", ok: true },
      { t: "In the buildspec, run aws eks update-kubeconfig for the cluster, with eks:DescribeCluster allowed on the role.", ok: true },
      { t: "Store a cluster administrator's access keys in the project's environment variables, and use them for kubectl.", ok: false, no: "Long-lived admin keys break least privilege. The build's own role can be granted access." },
      { t: "Attach AmazonEKSClusterPolicy to the build's service role, so it gains Kubernetes permissions in the cluster.", ok: false, no: "That policy is for the cluster role. IAM policies alone don't grant Kubernetes permissions." },
      { t: "Push the new image with the tag that the Deployment already uses, so the running pods pick it up by themselves.", ok: false, no: "Running pods don't re-pull a tag that moved. The Deployment's image must change to start a rollout." }
    ],
    why: "An access entry maps an IAM role to Kubernetes permissions through an access policy. update-kubeconfig writes the cluster's endpoint and authentication settings so kubectl can call it as that role.",
    doc: ["https://docs.aws.amazon.com/eks/latest/userguide/access-entries.html", "https://docs.aws.amazon.com/eks/latest/userguide/create-kubeconfig.html"] },

  // Elastic Beanstalk
  { id: "dva-3-316", exam: "DVA", dva: "3.1", topic: "beanstalk", type: "mc",
    q: "A developer adds .ebextensions/proxy.yaml to the root of an Elastic Beanstalk app's source bundle. The file uses option_settings to raise a proxy setting. The bundle deploys without errors, but the environment's configuration never changes. The YAML is valid. What should the developer do?",
    opts: [
      "Rename the file to .ebextensions/proxy.config, because configuration files must use the .config extension.",
      "Move the file into a .platform/hooks/predeploy folder, so that it runs on each instance before each deployment.",
      "Convert the file from YAML to JSON, because Elastic Beanstalk reads configuration files only in JSON.",
      "Move the setting into the Procfile, because Procfile entries can set environment configuration options."
    ], a: 0,
    no: [null,
      "Hook folders hold executable scripts, not option_settings.",
      "Configuration files can be YAML or JSON, and YAML is recommended.",
      "A Procfile lists the commands that start processes. It doesn't set options."],
    why: "Elastic Beanstalk configuration files are YAML or JSON documents with the .config extension in an .ebextensions folder. Files with other extensions are not applied.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/ebextensions.html"] },

  { id: "dva-3-317", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc",
    q: "A developer set the environment property POOL_SIZE=10 on an Elastic Beanstalk environment from the console. Later the team moved its settings into source control, with POOL_SIZE: 20 under option_settings in an .ebextensions config file, and deployed it. The app still sees 10. The value must come from the config file from now on. What should the developer do?",
    opts: [
      "Remove POOL_SIZE from the environment's own configuration, for example with the EB CLI or AWS CLI, then redeploy.",
      "Rename the config file so that it sorts first alphabetically, so its value is applied ahead of the console's value.",
      "Save the environment's configuration as a saved configuration, so that the config file's value is used next time.",
      "Rebuild the environment, so that every instance reads the configuration files from the source bundle again."
    ], a: 0,
    no: [null,
      "File order matters only between config files. Settings applied directly to the environment still win.",
      "Saved configurations also outrank config files, so that keeps the value 10.",
      "The directly applied value is part of the environment's configuration, so it is still 10 after a rebuild."],
    why: "Settings applied directly to the environment take precedence over saved configurations, which take precedence over .ebextensions files. Removing the direct setting lets the file's value apply.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options.html"] },

  { id: "dva-3-318", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc",
    q: "A team deploys an Elastic Beanstalk app with the EB CLI from a Git repository. The develop branch must always deploy to the app-dev environment and the main branch to app-prod, so that a plain eb deploy on either branch can't reach the wrong environment. What should the developer do?",
    opts: [
      "Check out each branch and run eb use with its environment, so each branch has its own default environment.",
      "Run eb init again in each branch, and pick the environment that the branch should deploy to from the list shown.",
      "Add a Git tag to each commit with the environment's name, so that eb deploy reads the tag to pick one.",
      "Create a saved configuration for each environment, and name each one after the branch it should serve."
    ], a: 0,
    no: [null,
      "eb init sets up the application and Region, not a default environment per branch.",
      "A Git tag can label an application version, but it doesn't choose the environment.",
      "Saved configurations hold settings. They don't map branches to environments."],
    why: "With Git, eb use sets the default environment for the current branch. Running it once per branch makes eb deploy on that branch target its own environment.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-cli-git.html", "https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb3-use.html"] },

  // CodeBuild, CodePipeline
  { id: "dva-3-319", exam: "DVA", dva: "3.4", topic: "codebuild", type: "mc",
    q: "A CodeBuild project builds release candidates from GitHub. Its webhook has two filter groups: the first has only the PUSH event, and the second has the PUSH event with a HEAD_REF filter of ^refs/heads/release/.*. Builds start on pushes to every branch, but they must start only on pushes to release/ branches. What should the developer do?",
    opts: [
      "Delete the first filter group, so the only group requires both the PUSH event and the HEAD_REF filter.",
      "Add a HEAD_REF filter of ^refs/heads/.* to the first group, so that every filter group has a branch filter.",
      "Change the HEAD_REF pattern to ^release/.*, so it matches branch names without the refs/heads/ prefix.",
      "Add a FILE_PATH filter to the second group, so it matches only files that change on release/ branches."
    ], a: 0,
    no: [null,
      "That pattern matches every branch, so the first group still starts a build on any push.",
      "HEAD_REF matches the full Git reference, such as refs/heads/release/1.2, so that pattern wouldn't match.",
      "The first group would still start a build on any push, whatever the second group checks."],
    why: "A build starts when any filter group is true, and a group is true only when all its filters are. A group with just PUSH matches every push, so it must go.",
    doc: ["https://docs.aws.amazon.com/codebuild/latest/userguide/github-webhook.html"] },

  { id: "dva-3-320", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "multi", hint: "Select TWO.",
    q: "A pipeline in us-east-1 pauses at a manual approval action before deploying to production. Release managers must get an email when it pauses, with a link to the staging site, and only members of the release-managers IAM role may approve or reject. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Set the action's SNS topic to a us-east-1 topic with the managers' email subscriptions, and set its URL for review.", ok: true },
      { t: "Allow codepipeline:PutApprovalResult on that approval action only in the release-managers role's IAM policy.", ok: true },
      { t: "Point the approval action at an SNS topic in us-west-2, where the company's other alert topics already live.", ok: false, no: "The topic must be in the same Region as the pipeline." },
      { t: "Add a CodeBuild action that emails the managers with Amazon SES and waits until one of them replies by email.", ok: false, no: "A build can't wait on email replies, and that rebuilds what the approval action already does." },
      { t: "Grant codepipeline:StartPipelineExecution to the release managers, so they can approve by starting the pipeline.", ok: false, no: "Starting a new execution doesn't approve the paused one." }
    ],
    why: "An approval action can publish to an SNS topic in the pipeline's Region and include a URL for review. Approving or rejecting needs codepipeline:PutApprovalResult, which can be scoped to the action.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals.html", "https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-action-add.html", "https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-iam-permissions.html"] },

  { id: "dva-3-321", exam: "DVA", dva: "3.4", topic: "codepipeline", type: "multi", hint: "Select TWO.",
    q: "A pipeline deploys one CloudFormation template to a test stack and then to a prod stack. Each stack needs its own parameter values, kept in source control. A reviewer must see exactly what will change in prod and approve it before prod is changed. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "In the prod stage, use a CHANGE_SET_REPLACE action, then a manual approval, then a CHANGE_SET_EXECUTE action.", ok: true },
      { t: "Keep a template configuration file per environment, and set each action's TemplateConfiguration to its file.", ok: true },
      { t: "Use a CREATE_UPDATE action in the prod stage, followed by a manual approval for the reviewer to sign off.", ok: false, no: "CREATE_UPDATE changes the stack right away, so the review would come after the change." },
      { t: "Copy the template once per environment, with each copy's values written in as defaults in its parameters.", ok: false, no: "Two templates drift apart. One template with a configuration file per environment avoids that." },
      { t: "Deploy prod with a StackSets action, so CloudFormation shows the drift between test and prod before updating.", ok: false, no: "StackSets deploy one template across accounts and Regions. They don't hold an update for review." }
    ],
    why: "CHANGE_SET_REPLACE creates a change set without touching the stack, and CHANGE_SET_EXECUTE applies it after approval. A template configuration file in the input artifact gives each action its own parameter values.",
    doc: ["https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CloudFormation.html"] },

  // Rollbacks
  { id: "dva-3-322", exam: "DVA", dva: "3.4", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A new deployment of a REST API to its prod stage broke a mapping template. The previous deployment worked and is still in the stage's deployment history. Prod must return to it within minutes, at the same URL, without rebuilding or re-importing the API. Which actions will do this? (Select TWO.)",
    items: [
      { t: "In the console's Deployment history tab for prod, select the previous deployment and choose Change active deployment.", ok: true },
      { t: "Run aws apigateway update-stage with a replace operation on /deploymentId, set to the previous deployment's ID.", ok: true },
      { t: "Run aws apigateway create-deployment for the prod stage, so prod gets a fresh copy of the API as it was.", ok: false, no: "It snapshots the API as it is now, broken template included." },
      { t: "Flush the prod stage's cache, so the responses from the earlier deployment are served again.", ok: false, no: "Flushing the cache removes cached responses. It doesn't change which deployment the stage runs." },
      { t: "Delete the prod stage and create it again from the previous deployment, keeping the same stage name.", ok: false, no: "It does more than needed, drops the stage's settings, and interrupts prod while the stage is gone." }
    ],
    why: "A stage points at one deployment, a snapshot of the API. Changing the stage's deploymentId to an earlier deployment rolls the stage back, in the console or with update-stage.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-deployments.html"] },

  // 3.3 Approved versions
  { id: "dva-3-323", exam: "DVA", dva: "3.3", topic: "lambda", type: "mc",
    q: "A pipeline runs UpdateFunctionCode, runs integration tests against $LATEST, then publishes a version and points the qa alias at it. Other developers sometimes upload code to the same function during the tests. The pipeline must never publish code other than what it tested, and must fail instead. What should the developer do?",
    opts: [
      "Pass the CodeSha256 from the UpdateFunctionCode output to PublishVersion, so it publishes only if the code still matches.",
      "Publish the version first, and run the tests against $LATEST afterward to check that the code is still the same.",
      "Set reserved concurrency to 0 on the function during the tests, so other developers can't upload any new code.",
      "Pass the alias's RevisionId from GetAlias to UpdateAlias, so the alias moves only if nobody else changed it."
    ], a: 0,
    no: [null,
      "The version would be published before testing, and $LATEST can change again at any time.",
      "Reserved concurrency throttles invocations. It doesn't stop code updates, and it would break the tests too.",
      "That protects the alias from concurrent edits, not the version's code from being someone else's upload."],
    why: "PublishVersion takes an optional CodeSha256 and publishes only if the function's code still has that hash. The pipeline gets the hash from its own UpdateFunctionCode call.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/api/API_PublishVersion.html"] },

  { id: "dva-3-324", exam: "DVA", dva: "3.3", topic: "ecr", type: "mc",
    q: "A pipeline tags each tested image in ECR as build-118 and so on. When QA approves a build, the same image must also get the tag approved-118 so the production deploy can find it. The image is 3 GB, and the approval step runs on a small runner where pulling and pushing it takes too long. What should the developer do?",
    opts: [
      "Get the image manifest with aws ecr batch-get-image, then call aws ecr put-image with it and --image-tag approved-118.",
      "Run docker pull for build-118, then docker tag and docker push the image to ECR as approved-118.",
      "Turn on tag immutability for the repository, so that ECR adds the approved tag to tested images.",
      "Add a lifecycle policy rule that tags images as approved when they are older than the test period."
    ], a: 0,
    no: [null,
      "It works, but it moves the whole 3 GB image twice, which the stem rules out.",
      "Tag immutability stops tags from being moved. It doesn't add tags.",
      "Lifecycle policies expire images. They don't add tags."],
    why: "ECR can retag an existing image by putting its manifest again with a new tag. No layers move, so it saves time and bandwidth.",
    doc: ["https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-retag.html"] },

  // 3.1 Code repositories
  { id: "dva-3-325", exam: "DVA", dva: "3.1", topic: "codeartifact", type: "mc",
    q: "A company publishes an internal npm package named acme-auth to a CodeArtifact repository that also has an external connection to npmjs.com. Security worries that someone could publish a higher version of a package named acme-auth on npmjs.com, and builds would install it, because acme-auth's origin controls currently allow both publishing and upstream versions. Internal publishing must keep working. What should the developer do?",
    opts: [
      "Set acme-auth's package origin controls in the repository to allow publishing and block upstream versions.",
      "Remove the external connection, and copy every public package that the builds need into the repository by hand.",
      "Delete each acme-auth package version after it is installed, so that only fresh versions are ever used.",
      "Turn on tag immutability for acme-auth, so that a public version can't take over the latest tag."
    ], a: 0,
    no: [null,
      "It blocks the attack, but at the cost of maintaining every public dependency by hand.",
      "That breaks builds that need older versions, and doesn't stop public versions coming in.",
      "Tag immutability is an Amazon ECR repository setting, not a CodeArtifact package setting."],
    why: "Package origin controls decide whether a package's versions may come from publishing, from upstreams, or both. Publish ALLOW with upstream BLOCK stops a dependency substitution attack.",
    doc: ["https://docs.aws.amazon.com/codeartifact/latest/ug/package-origin-controls.html"] },

  // 3.3 IaC
  { id: "dva-3-326", exam: "DVA", dva: "3.3", topic: "cdk", type: "mc",
    q: "A CDK app creates an S3 bucket with the L2 Bucket construct. A team needs a CloudFormation property of AWS::S3::Bucket that the L2 construct doesn't expose yet. They want to keep using the L2 construct and its grant methods for everything else. What should the developer do?",
    opts: [
      "Get the L1 CfnBucket with bucket.node.defaultChild, and set the property on it or with addPropertyOverride.",
      "Replace the Bucket construct with a CfnBucket, and write the bucket's IAM policies by hand from now on.",
      "Add the property to the bucket's tags in the CDK app, so that CloudFormation passes it to the bucket.",
      "Edit the template in cdk.out after running cdk synth, and deploy that edited template with cdk deploy each time."
    ], a: 0,
    no: [null,
      "It works, but it loses the L2 construct and its grant methods, which the team wants to keep.",
      "Tags are key-value labels. They don't set resource properties.",
      "cdk deploy synthesizes again, and cdk.out is overwritten, so the edit is lost."],
    why: "Each L2 construct wraps an L1 construct for its CloudFormation resource. The escape hatch, node.defaultChild, gives access to every CloudFormation property while keeping the L2 construct.",
    doc: ["https://docs.aws.amazon.com/cdk/v2/guide/cfn-layer.html"] },

  // 3.2 Local tests with a mocked dependency
  { id: "dva-3-327", exam: "DVA", dva: "3.2", topic: "sam", type: "mc",
    q: "A developer runs a Lambda function on a laptop with sam local invoke, and its tests must use DynamoDB local instead of the real dev table. DynamoDB local runs in a Docker container named ddb-local on a Docker network named test-net. The function sends DynamoDB calls to the URL in DDB_ENDPOINT, which is set to http://localhost:8000, and every call fails to connect. What should the developer do?",
    opts: [
      "Run sam local invoke with --docker-network test-net, and set DDB_ENDPOINT to http://ddb-local:8000 in an --env-vars file.",
      "Run sam local start-lambda instead, so that the function runs directly on the laptop and can reach localhost:8000.",
      "Restart DynamoDB local with the -inMemory option, so that it accepts connections from other containers on localhost.",
      "Run sam local invoke with --skip-pull-image, so that the function's container shares the laptop's own network."
    ], a: 0,
    no: [null,
      "start-lambda also runs each function in a Docker container, so localhost still means that container.",
      "-inMemory keeps the data in memory instead of a file. It doesn't change who can connect.",
      "That only skips downloading the latest runtime image. The network setup stays the same."],
    why: "sam local runs the function in its own container, where localhost is that container. --docker-network joins it to DynamoDB local's network, where the container name resolves, and --env-vars overrides the endpoint.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-local-invoke.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.DownloadingAndRunning.html"] },

  // 3.3 Test events
  { id: "dva-3-328", exam: "DVA", dva: "3.3", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A Lambda function reads event.httpMethod and event.path, and its saved test events are REST API proxy events. The team now puts it behind an HTTP API created with CloudFormation, with payloadFormatVersion 2.0. The tests still pass, but real requests fail because both fields are undefined. Which actions fix this? (Select TWO.)",
    items: [
      { t: "Set the integration's payload format version to 1.0, so the function gets the event shape it was written for.", ok: true },
      { t: "Read requestContext.http.method and rawPath in the function, and replace the test events with 2.0 events.", ok: true },
      { t: "Turn on Lambda proxy integration for the route, so that API Gateway adds httpMethod and path to the event.", ok: false, no: "HTTP API Lambda integrations are already proxy integrations. The payload version sets the shape." },
      { t: "Add a mapping template to the HTTP API route that writes httpMethod and path into the request body.", ok: false, no: "HTTP APIs don't use mapping templates; they use parameter mapping, which doesn't rebuild the event." },
      { t: "Keep the test events and code, and set the function's runtime to the newest version so it reads both formats.", ok: false, no: "The runtime doesn't change the event API Gateway sends." }
    ],
    why: "The payload format version sets the event shape. Version 1.0 matches REST proxy events, with httpMethod and path. Version 2.0 puts them in requestContext.http.method and rawPath, so code and test events must match it.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html"] },

  // 3.4 Orchestrated multi-environment deploys
  { id: "dva-3-329", exam: "DVA", dva: "3.4", topic: "sam", type: "multi", hint: "Select TWO.",
    q: "A team wants a CI/CD pipeline that deploys its SAM application to a dev account and then to a prod account. Each stage needs its own deployment role, CloudFormation execution role and artifact bucket in its account. They want SAM to create these and a starter pipeline definition rather than write them by hand. Which steps should they take? (Select TWO.)",
    items: [
      { t: "Run sam pipeline bootstrap once for each stage, with that stage's account credentials and Region.", ok: true },
      { t: "Run sam pipeline init to generate a two-stage pipeline configuration, then commit it to the repository.", ok: true },
      { t: "Run sam deploy --guided once for each account, and copy the resulting samconfig.toml into the pipeline.", ok: false, no: "That deploys the app, but it doesn't create pipeline roles or a pipeline definition." },
      { t: "Run cdk bootstrap in both accounts, so that the SAM pipeline can use the CDK's staging bucket and roles.", ok: false, no: "CDK bootstrap prepares accounts for CDK deploys. SAM pipelines use the resources from sam pipeline bootstrap." },
      { t: "Run sam sync --watch against each account, so that every commit is pushed to both accounts as it is made.", ok: false, no: "sam sync is for quick development loops, not for a gated pipeline across accounts." }
    ],
    why: "sam pipeline bootstrap creates each stage's pipeline credentials, CloudFormation execution role and artifact bucket. sam pipeline init then generates a pipeline configuration with two deployment stages.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-pipeline-bootstrap.html", "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-generating-example-ci-cd.html"] },

  // 3.4 Labels and rollbacks in Elastic Beanstalk
  { id: "dva-3-330", exam: "DVA", dva: "3.4", topic: "beanstalk", type: "mc",
    q: "A pipeline creates a new Elastic Beanstalk application version, labeled with the commit ID, on every merge. It will soon reach the application version quota, after which new deploys would fail. The team must keep the last 50 versions available to redeploy for rollbacks, and auditors need every source bundle kept. What should the developer do?",
    opts: [
      "Set an application version lifecycle policy with a maximum of 50 versions, and choose to keep source bundles in S3.",
      "Set an application version lifecycle policy with a maximum of 50 versions, and choose to delete the old source bundles.",
      "Turn on S3 versioning on the Elastic Beanstalk bucket, so old versions no longer count toward the version quota.",
      "Create a new Elastic Beanstalk application each time the quota is reached, and deploy new versions there instead."
    ], a: 0,
    no: [null,
      "The source bundles would be deleted, which the auditors don't allow.",
      "The quota counts the versions Elastic Beanstalk tracks, not objects in S3, so new deploys still fail.",
      "The quota covers every application in the Region, and existing environments can't run another application's versions."],
    why: "A lifecycle policy deletes the oldest application versions once a count or age is passed, and never deletes versions in use. It can keep each deleted version's source bundle in S3.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/applications-lifecycle.html", "https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/applications-versions.html"] }
);
