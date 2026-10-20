// Question bank batch: DVA tasks 3.1 (prepare artifacts), 3.2 (test in dev environments) and 3.3 (automate
// deployment testing: SAM, CloudFormation, CDK, Amplify, ECR). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 3.1: Prepare application artifacts
  { id: "dva-3-101", exam: "DVA", dva: "3.1", topic: "lambda", type: "mc",
    q: "A developer zips only app.py and creates a Python Lambda function from it. The code imports the requests library, which the developer installed on a laptop with pip. Every invocation fails with Unable to import module 'app': No module named 'requests'. What should the developer do?",
    opts: [
      "Install requests into a package folder with pip install --target, zip it with app.py at the root of the archive, and redeploy.",
      "Set the PYTHONPATH environment variable on the function to the folder where pip installed the requests library on the laptop.",
      "Raise the function's memory and timeout, so the runtime has time to download requests from PyPI during the init phase.",
      "Change the handler from app.lambda_handler to requests.lambda_handler, so the runtime loads the library before the code."
    ], a: 0,
    no: [null,
      "The function runs in Lambda's environment, which can't see files on the developer's laptop.",
      "Lambda doesn't install packages at run time. Dependencies must be in the package or in a layer.",
      "The handler names the file and function that hold the code. Pointing it at the library breaks it further."],
    why: "Lambda only sees what is in the deployment package and its layers. Python dependencies must be installed at the root of the .zip file next to the handler file, or in a layer.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/python-package.html", "https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-deployment.html"] },

  { id: "dva-3-102", exam: "DVA", dva: "3.1", topic: "lambda", type: "mc",
    q: "A Node.js function's handler is set to index.handler. To package it, the developer compresses the project folder itself, so the .zip file holds my-function/index.mjs and my-function/node_modules/. Every test fails because the runtime can't find the module index. What should the developer do?",
    opts: [
      "Create the .zip file from inside my-function, so that index.mjs and node_modules sit at the root of the archive, and upload it again.",
      "Rename index.mjs to handler.mjs, so that the file name matches the handler setting of index.handler that the function has.",
      "Move node_modules into a Lambda layer, and leave index.mjs inside the my-function folder in the deployment package.",
      "Set the NODE_PATH environment variable to /opt/my-function, so that the Node.js runtime searches that folder for the index module."
    ], a: 0,
    no: [null,
      "The part before the dot is the file name, so index.handler already expects index.mjs. Renaming the file breaks the match.",
      "The handler file must still be at the root of the package. A layer doesn't change where Lambda looks for it.",
      "/opt holds layer content, not the deployment package, and the handler file still isn't at the package's root."],
    why: "Lambda loads the handler file from the root of the .zip file. Compressing the folder itself puts everything one level down, so the file named in index.handler isn't found.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/nodejs-package.html", "https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-deployment.html"] },

  { id: "dva-3-103", exam: "DVA", dva: "3.1", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A team builds one Lambda layer for a Python function that needs the requests library, and another for a Node.js function that needs the axios package. Lambda extracts layer content to /opt. Which .zip file layouts let each runtime find its library with no code or setting changes? (Select TWO.)",
    items: [
      { t: "For the Python layer, put the library under a top-level python folder, as in python/requests/.", ok: true },
      { t: "For the Node.js layer, put the package under nodejs/node_modules, as in nodejs/node_modules/axios/.", ok: true },
      { t: "For the Python layer, put the library at the root of the .zip file, as in requests/, with no parent folder.", ok: false, no: "Root-level folders land directly in /opt, which isn't on the Python path. Python layers use python/ or python/lib/python3.x/site-packages/." },
      { t: "For the Node.js layer, put the package under lib/node_modules, the folder that npm uses for global installs.", ok: false, no: "/opt/lib is on LD_LIBRARY_PATH for shared libraries. Node.js looks in nodejs/node_modules and the nodejs/nodeXX/node_modules folders." },
      { t: "For both layers, put the library under bin, since every Lambda runtime adds /opt/bin to its search path.", ok: false, no: "/opt/bin is on PATH, which is for executables. Python and Node.js don't load libraries from it." }
    ],
    why: "Lambda puts layer content in /opt, and each runtime searches set folders there: python and python/lib/python3.x/site-packages for Python, nodejs/node_modules for Node.js.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/packaging-layers.html"] },

  { id: "dva-3-104", exam: "DVA", dva: "3.1", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A developer on a Mac with Apple silicon packages a Python Lambda function that uses a library with compiled C extensions. The function uses the x86_64 architecture. Packages built with a plain pip install on the Mac fail in Lambda because the library's native code won't load. Which approaches will produce a working package? (Select TWO.)",
    items: [
      { t: "Build with sam build --use-container, so dependencies are installed inside a Lambda-like Docker container.", ok: true },
      { t: "Install with pip using --platform manylinux2014_x86_64 and --only-binary=:all:, so pip fetches Linux wheels.", ok: true },
      { t: "Keep the __pycache__ folders from the Mac build in the package, so Lambda doesn't compile the code again.", ok: false, no: "AWS advises leaving __pycache__ out, because bytecode built on another OS or architecture may not be compatible." },
      { t: "Switch the function to the arm64 architecture, since the Mac's own processor is also an ARM design.", ok: false, no: "The Mac build produces macOS binaries. Lambda runs Linux, so they still won't load on arm64." },
      { t: "Raise the function's memory to 3,008 MB, so the native library has enough room to load at startup.", ok: false, no: "Memory doesn't change which operating system the binaries were compiled for." }
    ],
    why: "Native extensions must be built for Linux and for the function's architecture. A Lambda-like build container, or manylinux wheels chosen with pip's --platform option, both give that.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/python-package.html", "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-build.html"] },

  { id: "dva-3-105", exam: "DVA", dva: "3.1", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Lambda function's .zip package is built once by CI and must be promoted unchanged from the dev stack to the prod stack, both in the same account and Region. Each stage needs different settings, such as a database host and a log level, and nobody may rebuild the package per stage. Which approaches meet these requirements? (Select TWO.)",
    items: [
      { t: "Read the settings from environment variables, set for each stack by its own template parameter values.", ok: true },
      { t: "Read the settings from AWS AppConfig, with a dev and a prod environment that each hold that stage's values.", ok: true },
      { t: "Put a config.json file with each stage's values into the package, and build the .zip again for each stage.", ok: false, no: "Rebuilding per stage means prod runs a different artifact from the one tested in dev, which the stem rules out." },
      { t: "Pick the settings in code by checking the AWS_REGION variable, since Lambda sets it for every function.", ok: false, no: "Both stacks run in the same Region, so AWS_REGION is the same for dev and prod." },
      { t: "Write each stage's settings into /tmp during deployment, so that each function reads its own copy at startup.", ok: false, no: "/tmp is per execution environment and starts empty. A deployment can't write files into it." }
    ],
    why: "Keeping configuration outside the package lets one tested artifact run in every stage. Environment variables are set per function, and AppConfig environments hold per-stage configuration that can change without a deployment.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html", "https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-environment.html"] },

  { id: "dva-3-106", exam: "DVA", dva: "3.1", topic: "lambda", type: "mc",
    q: "A Lambda function runs a container image referenced as orders:prod in Amazon ECR. A developer builds a fixed image, pushes it with the same prod tag, and confirms that the tag now points to the new image. An hour later the function still runs the old code. What should the developer do?",
    opts: [
      "Call UpdateFunctionCode with the image URI, so Lambda resolves the prod tag to the new image's digest and deploys it.",
      "Wait for Lambda's periodic refresh from Amazon ECR, which picks up a tag that has moved within a day without a deployment.",
      "Publish a new version of the function, which pulls the newest image that carries the tag from the repository.",
      "Turn on tag immutability in the repository, so that the prod tag can only ever point to the newest image."
    ], a: 0,
    no: [null,
      "Lambda resolves the tag to a digest when the code is set. It doesn't follow a tag that moves afterward.",
      "Publishing a version snapshots $LATEST, which still holds the old image's digest.",
      "Immutability stops a tag from being moved at all. It doesn't update the function."],
    why: "For an image function, Lambda resolves the tag to an image digest when the function's code is set. Moving the tag in ECR later doesn't change the function until its code is updated again.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/api/API_UpdateFunctionCode.html"] },

  { id: "dva-3-107", exam: "DVA", dva: "3.1", topic: "appconfig", type: "mc",
    q: "Lambda functions read feature flags from AWS AppConfig by calling StartConfigurationSession and GetLatestConfiguration on every invocation. AppConfig charges and function duration have both grown with traffic. The team wants the flags cached and refreshed in the background, with the LEAST code to maintain. What should the developer do?",
    opts: [
      "Add the AWS AppConfig Agent Lambda extension as a layer, and have the code read flags from it at localhost:2772.",
      "Copy the flags into environment variables at deployment time, and redeploy the functions whenever a flag changes.",
      "Put an ElastiCache cluster in front of AppConfig, and write code that refreshes the cached flags on a schedule.",
      "Turn on provisioned concurrency, so the functions keep their AppConfig sessions open between invocations."
    ], a: 0,
    no: [null,
      "That loses AppConfig's gradual rollout and rollback, and every flag change becomes a redeployment.",
      "It works, but it adds a cluster and caching code that the AppConfig extension already provides.",
      "Warm environments don't change the code, which still calls AppConfig on every invocation."],
    why: "The AppConfig Agent Lambda extension keeps a local cache and checks AppConfig for updates in the background. The function reads it over HTTP at localhost:2772, which cuts API calls and duration.",
    doc: ["https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-integration-lambda-extensions-how-it-works.html"] },

  { id: "dva-3-108", exam: "DVA", dva: "3.1", topic: "appconfig", type: "mc",
    q: "A team keeps a free-form JSON configuration in AWS AppConfig and deploys it to separate dev and prod environments. Last week a version with a missing required field reached prod and broke the service. AppConfig must now refuse a configuration with the wrong structure before a deployment goes ahead. What should the developer do?",
    opts: [
      "Add a JSON Schema validator to the configuration profile, so AppConfig checks each version when a deployment starts.",
      "Add a CloudWatch alarm to the prod environment, so AppConfig rolls back when errors rise after a deployment.",
      "Use the AppConfig.AllAtOnce deployment strategy for prod, so that a bad configuration shows up the moment it goes live.",
      "Keep every earlier version of the hosted configuration, so AppConfig can fall back to it if the new one is bad."
    ], a: 0,
    no: [null,
      "An alarm rolls back after the bad configuration is already live. The team needs it stopped before that.",
      "AllAtOnce only deploys faster, to every target at once. It checks nothing.",
      "Hosted configurations are already versioned. Keeping old versions doesn't stop a bad one being deployed."],
    why: "Validators on a configuration profile, a JSON Schema or a Lambda function, check configuration data for syntax and meaning. AppConfig runs them when a deployment starts and refuses a version that fails.",
    doc: ["https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-configuration-and-profile-validators.html"] },

  { id: "dva-3-109", exam: "DVA", dva: "3.1", topic: "cloudformation", type: "mc",
    q: "A SAM template sets a Lambda environment variable with the dynamic reference {{resolve:ssm:/orders/prod/api-url}}. An operator changes that Parameter Store value to a new endpoint. A day later the function still calls the old endpoint, although it reads the variable on every invocation. What should the developer do?",
    opts: [
      "Run a stack update, so that CloudFormation resolves the latest parameter version and writes it into the variable.",
      "Run drift detection on the stack, then resolve the drift so the variable picks up the parameter's new value.",
      "Set the function's reserved concurrency to zero and back, so new execution environments read the new value.",
      "Change the parameter's type to SecureString, so that Lambda reads its newest value at each cold start of the function."
    ], a: 0,
    no: [null,
      "Drift detection doesn't support dynamic references, and it reports differences rather than fixing them.",
      "The value is stored in the function's configuration, so new environments get the same old value.",
      "The ssm reference reads only String and StringList parameters, and Lambda never reads Parameter Store itself."],
    why: "CloudFormation resolves an ssm dynamic reference when the stack is created or updated and writes the value into the resource. A later change in Parameter Store has no effect until the next stack update.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm.html"] },

  { id: "dva-3-110", exam: "both", dva: "3.1", saa: "3.1", topic: "lambda", type: "mc",
    q: "A Lambda function downloads video files of up to 4 GB from S3, transcodes each one, and uploads the result. Each invocation needs scratch disk space for only its own file and output, and nothing has to be kept afterward. Runs on large files fail with No space left on device. Which solution meets these requirements MOST cost-effectively?",
    opts: [
      "Raise the function's ephemeral storage so /tmp fits the largest file and its output, within the 10,240 MB maximum.",
      "Mount an Amazon EFS file system on the function, and write each file into its own folder on the shared file system.",
      "Raise the function's memory to 10,240 MB, so that the operating system has more room to hold each file in /tmp.",
      "Attach an Amazon EBS volume to the function when it starts, and delete the volume when the invocation ends."
    ], a: 0,
    no: [null,
      "It works, but it adds VPC networking and a file system to pay for, to hold data nobody shares or keeps.",
      "Memory and /tmp are separate settings. More memory doesn't add disk space.",
      "Lambda functions can't attach EBS volumes."],
    why: "Each execution environment has its own /tmp, configurable from 512 MB to 10,240 MB, which suits temporary per-invocation files. EFS is for data that must persist or be shared.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-ephemeral-storage.html"] },

  // Task 3.2: Test applications in development environments
  { id: "dva-3-111", exam: "DVA", dva: "3.2", topic: "sam", type: "mc",
    q: "A SAM template passes a DynamoDB table name to a function in the TABLE_NAME environment variable, set with !Ref to a table in the same template. The developer wants to run the function on a laptop with sam local invoke against the real table already deployed in the dev account, without editing the template. What should the developer do?",
    opts: [
      "Write a JSON file that maps the function's logical ID to a TABLE_NAME value naming the dev table, and pass it with --env-vars.",
      "Pass --parameter-overrides TABLE_NAME=dev-table to sam local invoke, so that the variable is replaced like a template parameter.",
      "Run sam local generate-event dynamodb update with the dev table's name, and pass the output to the function with --event.",
      "Run sam sync --watch against the dev stack, then invoke the function locally so that it picks up the deployed settings."
    ], a: 0,
    no: [null,
      "--parameter-overrides sets values in the template's Parameters section. TABLE_NAME is an environment variable.",
      "That builds a sample stream event. It doesn't change the function's environment variables.",
      "sam sync deploys to the cloud. A local run still uses the template's values unless an env-vars file overrides them."],
    why: "sam local invoke --env-vars takes a JSON or .env file whose values override the template's environment variables, for one function by logical ID or for all under Parameters. Local code can then call resources already in the cloud.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-invoke.html", "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-invoke.html"] },

  { id: "dva-3-112", exam: "DVA", dva: "3.2", topic: "sam", type: "mc",
    q: "A team's pytest suite invokes Lambda functions through the AWS SDK for Python. They want to run the same suite on a laptop against their SAM application's functions, without deploying them, changing only the endpoint the SDK client uses. What should the developer do?",
    opts: [
      "Run sam local start-lambda, and point the SDK's Lambda client at the local endpoint it prints, such as http://127.0.0.1:3001.",
      "Run sam local start-api, and change the tests to call each function's API path with an HTTP client instead of the AWS SDK.",
      "Run sam local invoke once for each test case with its event file, and have the suite compare the printed results.",
      "Run sam sync --watch to a dev stack, and point the SDK's Lambda client at that stack's functions in the cloud."
    ], a: 0,
    no: [null,
      "start-api serves functions through API routes, so the tests would need rewriting from SDK calls to HTTP calls.",
      "That replaces the SDK calls with CLI runs, which is far more than an endpoint change.",
      "That deploys the functions, which the team wants to avoid."],
    why: "sam local start-lambda starts a local endpoint that emulates the Lambda Invoke API, so the AWS CLI or an SDK can invoke the template's functions by setting the endpoint URL.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-start-lambda.html"] },

  { id: "dva-3-113", exam: "DVA", dva: "3.2", topic: "sam", type: "mc",
    q: "A developer is changing the code of one Lambda function in a SAM application and wants each change running in the dev account within seconds of saving. A full sam deploy takes several minutes per change. Production is deployed by a separate pipeline. What should the developer do?",
    opts: [
      "Run sam sync --code --watch against the dev stack, so saved code changes go to the function through service APIs.",
      "Run sam deploy --no-confirm-changeset after each change, so the change set is executed without waiting for a prompt.",
      "Run sam local start-api --warm-containers EAGER, so saved code changes take effect in the dev account right away.",
      "Run sam build --cached after each change, so only the changed function is rebuilt and published to the dev account."
    ], a: 0,
    no: [null,
      "It skips a prompt, but every change still goes through a full CloudFormation deployment.",
      "start-api runs the functions on the laptop. Nothing reaches the dev account.",
      "sam build only builds. It doesn't deploy anything."],
    why: "sam sync, part of SAM Accelerate, updates code through service APIs instead of a CloudFormation deployment where it can, and --watch syncs on every save. AWS recommends it for development, not production.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-sync.html"] },

  { id: "dva-3-114", exam: "DVA", dva: "3.2", topic: "sam", type: "mc",
    q: "A developer has deployed a SAM stack named orders-dev and is sending test requests to it. The developer wants the deployed OrderFunction's log output to stream into the terminal as it is written, without looking up the function's log group name. What should the developer do?",
    opts: [
      "Run sam logs with -n OrderFunction, --stack-name orders-dev and --tail, so new log events print as they arrive.",
      "Run sam local invoke OrderFunction with --debug, so the deployed function's logs print as requests arrive.",
      "Run sam remote invoke OrderFunction with --stack-name orders-dev, so every other request's logs stream too.",
      "Run sam validate --lint on the orders-dev template, so the function's logs are read and printed while tests run."
    ], a: 0,
    no: [null,
      "sam local invoke runs a local copy of the function. It doesn't show the deployed function's logs.",
      "remote invoke sends one event and shows that invocation's result, not a live stream of other requests.",
      "validate checks the template. It doesn't read logs."],
    why: "sam logs finds a function's log group from its logical ID and stack name, and --tail keeps fetching new events as they arrive. --include-traces adds X-Ray traces.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-logs.html"] },

  { id: "dva-3-115", exam: "DVA", dva: "3.2", topic: "apigateway", type: "mc",
    q: "A mobile team needs a dev endpoint for a new GET /offers method in a REST API so it can build screens now. The Lambda function behind it won't be ready for two weeks. The endpoint must return a fixed sample JSON body with status 200, with no backend to build, run or pay for. What should the developer do?",
    opts: [
      "Use a MOCK integration that maps to status 200 and returns the sample body from a response template, then deploy to a dev stage.",
      "Create a placeholder Lambda function that returns the sample body, and use a Lambda proxy integration until the real code is ready.",
      "Use an HTTP proxy integration that points to a JSON file holding the sample body in a public S3 bucket, then deploy to a dev stage.",
      "Turn on API Gateway caching for the dev stage, and load the sample body into the cache for GET /offers before the team starts."
    ], a: 0,
    no: [null,
      "It works, but it's a backend to build and run. A mock integration needs none.",
      "It depends on another resource and makes a bucket public, when API Gateway can answer by itself.",
      "The cache only stores responses an integration returned. With no integration, there's nothing to cache."],
    why: "With a MOCK integration, API Gateway builds the response itself from the integration request and response mappings, so dependent teams can work before the backend exists.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-mock-integration.html"] },

  { id: "dva-3-116", exam: "DVA", dva: "3.2", topic: "sam", type: "multi", hint: "Select TWO.",
    q: "A team deploys one SAM application to dev and staging, each as its own stack with its own parameter values, such as Stage=dev or Stage=staging. Developers keep deploying staging changes into the dev stack by mistake. Which steps let them deploy each environment with one short, repeatable command? (Select TWO.)",
    items: [
      { t: "Add a [staging.deploy.parameters] table to samconfig.toml with the staging stack_name and parameter_overrides.", ok: true },
      { t: "Run sam deploy --config-env staging to deploy staging, and sam deploy --config-env dev to deploy dev.", ok: true },
      { t: "Use sam sync with --stack-name for staging, since sync is the recommended way to update shared environments.", ok: false, no: "AWS recommends sam sync for development only, and it doesn't add per-environment settings." },
      { t: "Add AllowedValues of dev and staging to the Stage parameter, so CloudFormation picks the matching stack.", ok: false, no: "AllowedValues only limits what a parameter accepts. It doesn't choose which stack is deployed." },
      { t: "Run sam package once per environment, so each environment keeps its own packaged template in S3.", ok: false, no: "Packaging uploads artifacts. It doesn't store stack names or parameter values per environment." }
    ],
    why: "samconfig.toml can hold named environments, each with its own command settings such as stack_name and parameter_overrides. The --config-env option picks one, so each environment deploys the same way every time.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html"] },

  { id: "dva-3-117", exam: "DVA", dva: "3.2", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "Integration tests for an order function run in a test environment and must never charge real cards through a third-party payment API. The payment API's URL is written into the function's code. The tests must still make real HTTPS calls and get realistic responses. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Move the payment API's base URL into an environment variable, set for each environment by a template parameter.", ok: true },
      { t: "Build a REST API with MOCK integrations that return the provider's sample responses, and use its URL in the test environment.", ok: true },
      { t: "Turn on X-Ray active tracing in the test environment, so calls to the payment API are recorded instead of sent.", ok: false, no: "X-Ray records calls that happen. It doesn't stop or replace them." },
      { t: "Run the integration tests with sam local invoke, so the function's calls to the payment API stay on the laptop.", ok: false, no: "A local run still calls whatever URL the code holds, so real cards would still be charged." },
      { t: "Give the function a test-only execution role, so the payment API rejects calls from the test environment.", ok: false, no: "IAM roles control access to AWS. A third-party API never sees or checks them." }
    ],
    why: "Reading the URL from configuration lets each environment point somewhere different without code changes. An API Gateway mock integration gives the test environment a real HTTPS endpoint with canned responses and no backend.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-mock-integration.html"] },

  { id: "dva-3-118", exam: "DVA", dva: "3.2", topic: "eventbridge", type: "mc",
    q: "A developer is writing an EventBridge rule that should match only order events whose detail.status is SHIPPED and whose detail.total is over 100. Before creating or changing any rule, the developer wants to check the pattern from the command line against several saved sample events. What should the developer do?",
    opts: [
      "Call aws events test-event-pattern with the pattern and each sample event, and check whether the result is true.",
      "Create the rule on the default bus, send each sample with put-events, and watch the rule's MatchedEvents metric.",
      "Archive the default event bus, and replay the sample events from the archive into a new rule with the pattern.",
      "Put the rule into a CloudFormation template, and run aws cloudformation validate-template against the samples."
    ], a: 0,
    no: [null,
      "That creates a rule and publishes real events, which the developer wants to avoid while testing.",
      "Replay resends events that already passed through the bus, and it still needs a rule and real events.",
      "validate-template checks a template's syntax. It doesn't evaluate a pattern against events."],
    why: "The TestEventPattern API, or the Sandbox in the EventBridge console, reports whether a given event matches a pattern without creating a rule or sending any events.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_TestEventPattern.html", "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-pattern-sandbox.html"] },

  { id: "dva-3-119", exam: "DVA", dva: "3.2", topic: "lambda", type: "mc",
    q: "Several developers in one AWS account test the same Lambda function from the console. Each keeps rebuilding the same large JSON test events, because the events one developer saves don't appear for the others. They want saved test events that everyone in the account can run and edit from the console. What should the developer do?",
    opts: [
      "Save the events as shareable test events, and give the developers permissions on the EventBridge schema registry Lambda uses.",
      "Save the events as private test events, and ask for a quota increase above 10 private test events for the function.",
      "Store the events in an S3 bucket, and set the function's console Test tab to load its test events from that bucket.",
      "Put the events into the function's environment variables, so that every developer's console test reads its events from there."
    ], a: 0,
    no: [null,
      "Private test events are visible only to the person who created them, however many there are.",
      "The console's Test tab doesn't load test events from S3.",
      "Environment variables configure the function. The console doesn't use them as test events."],
    why: "Shareable test events are visible to other users in the same account. Lambda stores them as schemas in the lambda-testevent-schemas EventBridge schema registry, so users need schemas permissions.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/testing-functions.html"] },

  { id: "dva-3-120", exam: "DVA", dva: "3.2", topic: "lambda", type: "mc",
    q: "A developer adds an SQS queue as the on-failure destination of a Lambda function that other services invoke asynchronously. The execution role allows sqs:SendMessage on the queue. To test it, the developer runs a console test event that makes the function throw. The error appears in the console, but nothing reaches the queue. What should the developer do?",
    opts: [
      "Invoke the function with aws lambda invoke and --invocation-type Event, so Lambda queues the call, retries, then records it.",
      "Add a dead-letter queue to the function too, because on-failure destinations take effect only when a DLQ is also set.",
      "Change the destination to an SQS FIFO queue, so that the failed event is delivered in order once Lambda's retries are done.",
      "Raise the function's timeout, so the code has time to send the failure record to the queue before the invocation ends."
    ], a: 0,
    no: [null,
      "Destinations don't need a dead-letter queue. They're separate options.",
      "FIFO queues aren't supported as destinations, so delivery would fail.",
      "Lambda itself sends destination records, not the function's code. The timeout doesn't affect them."],
    why: "The console invokes the function synchronously, and destinations apply to asynchronous invocations. An Event invocation is queued, retried on error, and then sent to the on-failure destination.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/invocation-async-retain-records.html", "https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html"] },

  { id: "dva-3-121", exam: "DVA", dva: "3.2", topic: "sam", type: "multi", hint: "Select TWO.",
    q: "A developer has deployed a SAM stack named billing-dev. From the terminal, the developer wants to send a saved file, event.json, to the deployed InvoiceFunction in the cloud and see its response, using the SAM CLI or AWS CLI version 2. Which commands will do this? (Select TWO.)",
    items: [
      { t: "Run sam remote invoke InvoiceFunction with --stack-name billing-dev and --event-file event.json.", ok: true },
      { t: "Run aws lambda invoke on the deployed function with --cli-binary-format raw-in-base64-out and --payload file://event.json.", ok: true },
      { t: "Run sam local invoke InvoiceFunction with --event event.json from the root of the project folder.", ok: false, no: "That runs a local copy in Docker, not the deployed function in the cloud." },
      { t: "Run sam local start-lambda, then aws lambda invoke on InvoiceFunction with --endpoint-url http://127.0.0.1:3001.", ok: false, no: "That also targets a local emulator, not the deployed function." },
      { t: "Run aws lambda invoke on the deployed function with only --payload file://event.json and an output file.", ok: false, no: "CLI version 2 reads payloads as base64 by default, so raw JSON fails without --cli-binary-format raw-in-base64-out." }
    ],
    why: "sam remote invoke finds a deployed function by its logical ID and stack name and sends it an event. AWS CLI version 2 needs --cli-binary-format raw-in-base64-out to send a raw JSON payload.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-remote-invoke.html", "https://docs.aws.amazon.com/cli/latest/userguide/cliv2-migration-changes.html"] },

  // Task 3.3: Automate deployment testing
  { id: "dva-3-122", exam: "DVA", dva: "3.3", topic: "sam", type: "mc",
    q: "A function runs on S3 uploads and reads the bucket and key from each event record. For CI, a developer wants a realistic event file for bucket uploads-dev and key incoming/a.csv, kept in the repository and passed to sam local invoke, without writing the event structure by hand. What should the developer do?",
    opts: [
      "Run sam local generate-event s3 put with --bucket uploads-dev and --key incoming/a.csv, and save the output as a file.",
      "Upload a file to uploads-dev, and copy the event that the function received from its CloudWatch logs into a file.",
      "Run sam local start-api and POST the file to it, so the SAM CLI builds the S3 event and saves it to the project.",
      "Run aws s3api put-object with --debug, and save the debug output as the event, since it matches the S3 event format."
    ], a: 0,
    no: [null,
      "It depends on the code logging its whole event, and it's a manual copy from a live run each time.",
      "start-api passes API Gateway events to functions. It doesn't build S3 events or save files.",
      "Debug output shows the API request and response, not the notification that S3 sends to Lambda."],
    why: "sam local generate-event prints a sample event for a service and event type, and options such as --bucket and --key fill in values. The saved file is passed to sam local invoke with --event.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-generate-event.html"] },

  { id: "dva-3-123", exam: "DVA", dva: "3.3", topic: "ecr", type: "multi", hint: "Select TWO.",
    q: "A pipeline builds a container image, tags it release-42 in Amazon ECR, and runs integration tests against a staging Lambda function created from it. After approval, the production function is created from the same tag. Production must run exactly the image that passed testing, even if someone pushes another image with that tag in between. Which steps meet this requirement? (Select TWO.)",
    items: [
      { t: "Record the tested image's digest, and create the production function from repository@sha256:<digest>.", ok: true },
      { t: "Turn on tag immutability for the repository, so a new push can't take over a tag that's already used.", ok: true },
      { t: "Turn on scan on push for the repository, so any image pushed with the tag is checked before it is used.", ok: false, no: "Scanning looks for vulnerabilities. It doesn't stop a tag from moving to a different image." },
      { t: "Add a lifecycle policy that keeps only the newest image in the repository and expires the older images.", ok: false, no: "Lifecycle policies remove old images. They don't stop the tag from being moved to a new one." },
      { t: "Tag every build as latest and use that tag for both functions, so both always get the same image.", ok: false, no: "latest moves with every push, so the two deployments can get different images." }
    ],
    why: "A digest names one exact image and never changes, while a mutable tag can be moved to another image. With tag immutability on, pushing an image with an existing tag fails with ImageTagAlreadyExistsException.",
    doc: ["https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html", "https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-pull-ecr-image.html"] },

  { id: "dva-3-124", exam: "DVA", dva: "3.3", topic: "amplify", type: "mc",
    q: "A web app is hosted on AWS Amplify from a private GitHub repository and has a backend created with Amplify. QA wants every pull request deployed to its own URL for review before merge, with a temporary backend that is removed when the pull request closes, and no manual step for each pull request. What should the developer do?",
    opts: [
      "Turn on web previews for pull requests, so each pull request gets its own preview URL and temporary backend.",
      "Turn on branch autodetection with the pattern feature*, so each matching branch is deployed to its own URL.",
      "Connect each pull request's source branch in the Amplify console, and disconnect it after the pull request merges.",
      "Add a staging branch for QA, and merge every pull request into staging before it goes into the main branch."
    ], a: 0,
    no: [null,
      "That deploys branches whose names match a pattern. It doesn't deploy per pull request or remove a backend when one closes.",
      "It works, but it's a manual step for every pull request.",
      "Every change shares one staging URL and backend, so pull requests aren't reviewed apart before merge."],
    why: "Amplify web previews deploy each pull request to a unique preview URL. For apps with Amplify backends in private repositories, each pull request also gets a temporary backend that's deleted when it closes.",
    doc: ["https://docs.aws.amazon.com/amplify/latest/userguide/pr-previews.html"] },

  { id: "dva-3-125", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc",
    q: "One CloudFormation template deploys a Lambda function to dev, test and prod, chosen by an EnvType parameter. MemorySize must be 256 MB in dev, 512 MB in test and 1,024 MB in prod. The sizes must live in the template, not be typed in at each deployment. What should the developer do?",
    opts: [
      "Add a Mappings section keyed by environment with a MemorySize value for each, and read it with !FindInMap and !Ref EnvType.",
      "Add three MemorySize parameters, one per environment, and pass all three values at each deployment so the stack can pick one.",
      "Add a Mappings section whose values use !Ref EnvType, so each entry works out its own memory size at deployment time.",
      "Add a Conditions section with only IsProd, and set MemorySize to !If [IsProd, 1024, 256] for every environment."
    ], a: 0,
    no: [null,
      "Parameters are typed in at deployment, which the stem rules out, and nothing picks among them.",
      "Mappings can't contain parameters, pseudo parameters or intrinsic functions. Keys and values must be literals.",
      "Test would get 256 MB instead of 512 MB. One condition with two values can't cover three environments."],
    why: "A Mappings section holds fixed lookup tables in the template, and Fn::FindInMap reads a value by map name, top-level key and second-level key. The top-level key can come from a parameter.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/mappings-section-structure.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-findinmap.html"] },

  { id: "dva-3-126", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "multi", hint: "Select TWO.",
    q: "A shared template creates a Lambda function for dev or prod, chosen by an Env parameter. In prod only, it must also create a CloudWatch alarm and set the function's ReservedConcurrentExecutions to 100. In dev, the alarm must not exist and the property must be left unset. Which changes meet these requirements? (Select TWO.)",
    items: [
      { t: "Define IsProd as !Equals [!Ref Env, prod] under Conditions, and add Condition: IsProd to the alarm resource.", ok: true },
      { t: "Set ReservedConcurrentExecutions on the function to !If [IsProd, 100, !Ref AWS::NoValue].", ok: true },
      { t: "Set ReservedConcurrentExecutions on the function to !If [IsProd, 100, 0], so dev has no reserved setting.", ok: false, no: "Zero is a real setting. It reserves no concurrency and stops the function from running at all." },
      { t: "Add DependsOn: IsProd to the alarm resource, so CloudFormation creates it only when the condition is true.", ok: false, no: "DependsOn sets the order resources are created in. It names resources, not conditions." },
      { t: "Define the IsProd condition in the Parameters section, next to the Env parameter that it evaluates.", ok: false, no: "Conditions are declared in the Conditions section. The Parameters section only holds inputs." }
    ],
    why: "A Condition attribute on a resource creates it only when the condition is true. Fn::If returning AWS::NoValue removes a property entirely when the condition is false.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/conditions-section-structure.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-conditions.html"] },

  { id: "dva-3-127", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "multi", hint: "Select TWO.",
    q: "A template defines OrdersQueue, an AWS::SQS::Queue, and OrdersTable, an AWS::DynamoDB::Table. An inline IAM policy in the same template uses !Ref OrdersQueue and !Ref OrdersTable as its Resource values, and stack creation fails because those values aren't valid ARNs. Which values should the developer use instead? (Select TWO.)",
    items: [
      { t: "Use !GetAtt OrdersQueue.Arn as the Resource value for the queue's actions.", ok: true },
      { t: "Use !GetAtt OrdersTable.Arn as the Resource value for the table's actions.", ok: true },
      { t: "Use !GetAtt OrdersQueue.QueueName as the Resource value for the queue.", ok: false, no: "That returns the queue's name. IAM needs the queue's ARN." },
      { t: "Use !Ref OrdersTable.Arn as the Resource value for the table's actions.", ok: false, no: "Ref takes only a logical ID or parameter name. Attributes are read with Fn::GetAtt." },
      { t: "Use !Sub '${OrdersTable}' as the Resource value for the table's actions.", ok: false, no: "${OrdersTable} in Fn::Sub returns the same as Ref, which is the table's name." }
    ],
    why: "For an SQS queue, Ref returns the queue URL, and for a DynamoDB table it returns the table name. Fn::GetAtt with the Arn attribute returns the ARN that an IAM policy's Resource needs.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-sqs-queue.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-dynamodb-table.html"] },

  { id: "dva-3-128", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc",
    q: "A production stack holds a DynamoDB table with live data. A teammate's template change renames the table by changing its TableName property. Before anything changes, the team lead must see whether CloudFormation will replace the table, and approve the update. What should the developer do?",
    opts: [
      "Create a change set from the new template, check the table's Replacement value, and execute it only after approval.",
      "Run aws cloudformation validate-template on the new template, and approve the update if it reports no errors.",
      "Run drift detection on the stack, and approve the update if the table shows as IN_SYNC with its template.",
      "Run update-stack with --disable-rollback, so a replacement can be paused partway through and then approved."
    ], a: 0,
    no: [null,
      "validate-template checks syntax. It doesn't show how resources will change.",
      "Drift compares live resources with the current template, not with the proposed one.",
      "That changes what happens after a failure. The update still runs with no preview."],
    why: "A change set previews each resource change, including whether CloudFormation will replace it, and nothing changes until it's executed. Changing a DynamoDB table's TableName requires replacement.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-dynamodb-table.html"] },

  { id: "dva-3-129", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc",
    q: "A stack update failed, and the rollback then failed too, because an ElastiCache cluster in the stack had been deleted by hand outside CloudFormation. The stack is now in UPDATE_ROLLBACK_FAILED and rejects new updates. The team must return it to a working state without deleting its other resources. What should the developer do?",
    opts: [
      "Continue the update rollback, and skip the deleted cluster's logical ID so that CloudFormation can finish it.",
      "Run update-stack with the original template, so CloudFormation recreates the cluster and clears the failure.",
      "Run cancel-update-stack, so CloudFormation stops the failed rollback and goes back to the last good state.",
      "Run drift detection, so CloudFormation records the cluster as deleted and then completes the rollback itself."
    ], a: 0,
    no: [null,
      "A stack in UPDATE_ROLLBACK_FAILED can't be updated until its rollback completes.",
      "Cancel applies only to an update that is still in progress, not to a failed rollback.",
      "Drift detection reports differences. It doesn't change the stack's state."],
    why: "Continuing the update rollback retries it, and the option to skip resources marks ones that can't roll back as complete. The stack reaches UPDATE_ROLLBACK_COMPLETE and can be updated again.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-continueupdaterollback.html"] },

  { id: "dva-3-130", exam: "both", dva: "3.3", saa: "1.3", topic: "cloudformation", type: "multi", hint: "Select TWO.",
    q: "A CloudFormation stack holds an AWS::DynamoDB::Table with customer data. The data must survive if someone deletes the stack, and also if a later template change makes CloudFormation replace the table with a new one. Which settings on the table resource meet these requirements? (Select TWO.)",
    items: [
      { t: "DeletionPolicy: Retain, so the table is kept when the stack is deleted or the resource is removed.", ok: true },
      { t: "UpdateReplacePolicy: Retain, so the old table is kept when an update replaces it with a new one.", ok: true },
      { t: "DeletionPolicy: Snapshot, so CloudFormation takes a backup of the table before deleting it.", ok: false, no: "Snapshot works only for resources such as EBS volumes, RDS and ElastiCache, not DynamoDB tables." },
      { t: "CreationPolicy with a ResourceSignal timeout, so CloudFormation waits before replacing the table.", ok: false, no: "CreationPolicy waits for success signals when a resource is created. It doesn't protect data." },
      { t: "UpdatePolicy with AutoScalingReplacingUpdate, so a replacement copies the old table's items.", ok: false, no: "UpdatePolicy applies to resources such as Auto Scaling groups. It doesn't copy items to a new table." }
    ],
    why: "DeletionPolicy controls what happens when a stack is deleted or a resource is removed from it, but not when an update replaces the resource. UpdateReplacePolicy covers replacement, so both are needed.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatereplacepolicy.html"] },

  { id: "dva-3-131", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc",
    q: "Ten application templates each copy the same 200 lines that define an Application Load Balancer, its listeners and its security group. Every fix to that block must be repeated ten times. Each application still needs its own load balancer, created and deleted with its stack. What should the developer do with the LEAST ongoing effort?",
    opts: [
      "Move the block into its own template, and include it in each application template as an AWS::CloudFormation::Stack resource.",
      "Deploy one load balancer stack that exports its ARN, and have each application template import it with Fn::ImportValue.",
      "Deploy the block with a StackSet to the account and Region, and have each application point at that stack instance.",
      "Generate the ten templates with a script that pastes in the shared block, and commit all of the generated output to the repository."
    ], a: 0,
    no: [null,
      "That shares one load balancer across every application, when each one needs its own.",
      "StackSets deploy one template across accounts and Regions. They don't build a resource into each application's stack.",
      "It works, but it's a custom build step to maintain for something nested stacks do natively."],
    why: "A nested stack is a template referenced from another template through an AWS::CloudFormation::Stack resource. The shared component lives in one template and is created as part of each parent stack.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-nested-stacks.html"] },

  { id: "dva-3-132", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "mc",
    q: "A security team must deploy the same IAM role, defined in one CloudFormation template, to every account in an AWS Organizations organization in us-east-1. Accounts that join the organization later must get the role automatically, with no IAM setup done in each account. What should the developer do?",
    opts: [
      "Create a StackSet with service-managed permissions that targets the organization, and turn on automatic deployment.",
      "Create a StackSet with self-managed permissions, and create the execution role in each target account before deploying it.",
      "Deploy the template as a nested stack from the management account, with one child stack for each member account.",
      "Export the role's ARN from a stack in the management account, and import it with a stack in each member account."
    ], a: 0,
    no: [null,
      "Self-managed permissions need roles set up in every target account, and new accounts aren't covered automatically.",
      "Nested stacks are created in the same account and Region as their parent stack.",
      "Exports work within one account and Region, and they share values, not resources."],
    why: "With service-managed permissions, StackSets creates the IAM roles it needs through Organizations. Automatic deployment adds stack instances to accounts that join the targeted organization or OUs.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-orgs-manage-auto-deployment.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/stacksets-concepts.html"] },

  { id: "dva-3-133", exam: "DVA", dva: "3.3", topic: "cdk", type: "multi", hint: "Select TWO.",
    q: "A team will deploy an existing CDK app, which includes Lambda code assets, to a new AWS account in eu-west-1 for the first time. Security reviewers must read the CloudFormation templates the app produces before anything is deployed. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Run cdk synth, and give the reviewers the templates it writes to the cdk.out folder.", ok: true },
      { t: "Run cdk bootstrap once for the new account and eu-west-1, so the asset bucket, ECR repository and roles exist.", ok: true },
      { t: "Run cdk deploy --hotswap, so templates are skipped and reviewers check the deployed resources instead.", ok: false, no: "It deploys before anyone has reviewed anything, which the stem rules out." },
      { t: "Run cdk init in the new account, so the CDK creates the app's templates and deployment resources there.", ok: false, no: "cdk init creates a new project from a template. It doesn't prepare an account or produce this app's templates." },
      { t: "Run cdk watch against the new account, so each template prints for review as it is deployed.", ok: false, no: "watch deploys changes as files change, so templates reach the account before review." }
    ],
    why: "cdk synth produces the cloud assembly, with a CloudFormation template for each stack, without deploying. Each account and Region must be bootstrapped once before cdk deploy can upload assets and deploy there.",
    doc: ["https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-synth.html", "https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html"] },

  { id: "dva-3-134", exam: "DVA", dva: "3.3", topic: "cloudformation", type: "multi", hint: "Select TWO.",
    q: "A Lambda-backed custom resource seeds a DynamoDB table during stack creation. When the seeding code throws an exception, the stack stays in CREATE_IN_PROGRESS for an hour before it fails. The team wants such failures to fail the stack quickly. Which changes meet this requirement? (Select TWO.)",
    items: [
      { t: "Catch every error in the handler, and send a FAILED response to the request's ResponseURL before exiting.", ok: true },
      { t: "Set the custom resource's ServiceTimeout property to a few minutes, so CloudFormation stops waiting sooner.", ok: true },
      { t: "Raise the Lambda function's timeout, so the seeding code has longer to finish before CloudFormation gives up.", ok: false, no: "A longer run still sends no response, so CloudFormation still waits up to an hour." },
      { t: "Return a Status of FAILED as the handler's return value, so Lambda passes it back to CloudFormation.", ok: false, no: "CloudFormation reads the response uploaded to the presigned ResponseURL, not the function's return value." },
      { t: "Add a CreationPolicy to the custom resource, and call cfn-signal from the handler when seeding fails.", ok: false, no: "CreationPolicy and cfn-signal work with resources such as EC2 instances and Auto Scaling groups, not custom resources." }
    ],
    why: "CloudFormation waits for the provider to upload SUCCESS or FAILED to a presigned S3 ResponseURL, for one hour by default. Always responding, even on errors, and a shorter ServiceTimeout make failures fast.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html"] },

  { id: "dva-3-135", exam: "DVA", dva: "3.3", topic: "sam", type: "mc",
    q: "In a SAM template, one function only reads items from OrdersTable, which is defined in the same template. The team wants least-privilege permissions scoped to that one table, without writing any IAM policy JSON. What should the developer add to the function's Policies property?",
    opts: [
      "The DynamoDBReadPolicy policy template, with its TableName placeholder set to !Ref OrdersTable.",
      "The AmazonDynamoDBReadOnlyAccess managed policy, which SAM narrows to the tables in the template.",
      "The DynamoDBCrudPolicy policy template, with its TableName placeholder set to !Ref OrdersTable.",
      "A Policies entry in the Globals section, so every function in the template gets read access to the table."
    ], a: 0,
    no: [null,
      "That managed policy grants read access to every table in the account. SAM doesn't narrow it.",
      "It's scoped to the table, but it adds write and delete actions the function doesn't need.",
      "Policies isn't a property the Globals section supports, and the other functions don't need the access."],
    why: "SAM policy templates expand into IAM policies scoped to the resources named in their placeholders. DynamoDBReadPolicy grants read-only actions on one table and its indexes.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-template-list.html", "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-templates.html"] }
);
