// Question bank batch: more DVA-C02 practice on the two tasks the chapters teach least, task 3.1 (prepare application
// artifacts to be deployed) and task 3.2 (test applications in development environments). Same schema and rules as
// js/bank-dva.js and js/bank-dva-gap.js. Facts checked against the AWS docs in October 2026.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // ---------------------------------------------------------------- Task 3.1: prepare application artifacts

  // Lambda layers
  { id: "dva-3-920", exam: "DVA", dva: "3.1", topic: "lambda", type: "mc",
    q: "Twelve Lambda functions in one account each bundle the same in-house logging library in their deployment packages. Every library fix means rebuilding and redeploying all twelve packages. The developer wants to package the library once and have each function pick up a chosen version of it. What should the developer do?",
    opts: [
      "Copy the library into the /tmp directory of each function on its first invocation, downloading it from an S3 bucket by key.",
      "Store the library in Parameter Store as a SecureString and have each function load and evaluate it during initialization.",
      "Publish the library as a Lambda layer and add a specific version of that layer to each function's configuration.",
      "Put the library in its own Lambda function and have the other twelve call it synchronously for every log line they write."
    ], a: 2,
    no: [
      "Downloading code at run time slows every cold start, adds an S3 dependency to start-up and isn't versioned with the function's configuration.",
      "Parameter Store holds settings and secrets of up to 8 KB, not code libraries, and evaluating downloaded code is fragile and unsafe.",
      null,
      "A synchronous call per log line adds latency and cost to every request and doubles the concurrency the functions use."],
    why: "A layer is a .zip archive of shared code or dependencies. Each layer version is immutable, and a function can use up to five layers, so a library fix becomes a new layer version that functions adopt by updating their configuration.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html"] },

  // Container images for large dependencies
  { id: "dva-3-921", exam: "DVA", dva: "3.1", topic: "lambda", type: "mc",
    q: "A Python Lambda function needs a machine learning library and model files that total about 1.8 GB unzipped. The developer tried a .zip deployment package with layers and hit the size limit. The function should keep running on Lambda. What should the developer do?",
    opts: [
      "Package the function as a container image, push it to Amazon ECR and create the function from that image.",
      "Split the dependencies across five layers of about 360 MB each, so each layer stays under its own size limit.",
      "Upload the .zip package to an S3 bucket first, since packages deployed from S3 have no unzipped size limit.",
      "Compress the model files with gzip inside the .zip archive so that the unzipped package stays under 250 MB."
    ], a: 0,
    no: [null,
      "The 250 MB unzipped limit covers the function code and all its layers together, so splitting the files across layers doesn't help.",
      "Uploading through S3 raises the zipped upload size you can send, but the 250 MB unzipped limit still applies.",
      "The archive would be smaller, but the function would have to unpack 1.8 GB into memory or /tmp at start-up, which is slow and also limited."],
    why: "A .zip package plus its layers can't exceed 250 MB unzipped. A container image can be up to 10 GB, so large libraries and models fit. The image is stored in Amazon ECR.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/images-create.html", "https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html"] },

  // cloudformation package
  { id: "dva-3-922", exam: "DVA", dva: "3.1", topic: "cloudformation", type: "mc",
    q: "A CloudFormation template sets the Code property of an AWS::Lambda::Function to a local folder, ./src, instead of an S3 location. Deploying the template directly fails. The developer wants a pipeline step that uploads the local code and produces a template CloudFormation can deploy. Which command should the step run?",
    opts: [
      "aws cloudformation validate-template, which checks the template and uploads the folder named in each Code property.",
      "aws cloudformation create-change-set, which zips the referenced folder and attaches it to the change set it creates.",
      "aws lambda publish-version, which uploads the local folder and returns an ARN to paste into the template's Code property.",
      "aws cloudformation package, which uploads the local artifacts to S3 and writes a template that points to them."
    ], a: 3,
    no: [
      "validate-template only checks the template's syntax. It uploads nothing.",
      "A change set compares a template with the stack. It doesn't upload local files, so the local path still fails.",
      "publish-version freezes the code that's already deployed as a numbered version. It doesn't upload a local folder or fix the template.",
      null],
    why: "The package command zips local paths that the template references, uploads them to an S3 bucket, and writes an output template with those local paths replaced by S3 locations. sam package and sam deploy do the same for SAM templates.",
    doc: ["https://docs.aws.amazon.com/cli/latest/reference/cloudformation/package.html"] },

  // AppConfig feature flags
  { id: "dva-3-923", exam: "DVA", dva: "3.1", topic: "appconfig", type: "mc",
    q: "A team wants to turn a new checkout feature on for production without redeploying its Lambda functions. It must be able to roll the change out gradually, check the value against a JSON schema before it goes live, and roll back automatically if a CloudWatch alarm fires. What should the developer use?",
    opts: [
      "A Lambda environment variable named CHECKOUT_V2, changed with update-function-configuration whenever the team wants the feature on.",
      "AWS AppConfig feature flags, with a validator, a deployment strategy and the alarm set as a rollback trigger on the environment.",
      "A Parameter Store String parameter that each function reads on every invocation, with a second parameter holding the old value.",
      "A new Lambda function version with the feature switched on in code, shifted in with a weighted alias over an hour."
    ], a: 1,
    no: [
      "Changing configuration updates every running environment at once, with no gradual rollout, no schema check and no automatic rollback.",
      null,
      "Parameter Store stores the value, but it has no validators, gradual deployment strategies or alarm-based rollback.",
      "Turning on the feature in code means a redeploy, which the team wants to avoid."],
    why: "AppConfig separates configuration from code. Validators (a JSON schema or a Lambda function) check a value before deployment, deployment strategies roll it out over time, and a CloudWatch alarm on the environment rolls it back. The AppConfig Lambda extension caches the value for the function.",
    doc: ["https://docs.aws.amazon.com/appconfig/latest/userguide/what-is-appconfig.html", "https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-creating-deployment-strategy.html"] },

  // CodeArtifact
  { id: "dva-3-924", exam: "DVA", dva: "3.1", topic: "codeartifact", type: "mc",
    q: "A company's CodeBuild projects pull npm packages straight from the public registry. Security wants every build to install packages from one company-controlled repository that also holds internal packages, while still letting approved public packages be fetched and cached. What should the developer set up?",
    opts: [
      "An S3 bucket of package tarballs, with each buildspec running npm install against the bucket's static website endpoint.",
      "A self-managed npm proxy on an EC2 instance, with each CodeBuild project placed in a VPC that has no internet route at all.",
      "A shared CodeBuild cache in S3 that keeps node_modules between builds, so the public npm registry is contacted only the first time.",
      "An AWS CodeArtifact repository with an upstream connection to the public npm registry, with npm configured to use it in the build."
    ], a: 3,
    no: [
      "An S3 bucket isn't an npm registry. npm can't resolve versions or dependencies from a folder of tarballs.",
      "It could work, but it means running, patching and scaling your own server for something CodeArtifact does as a managed service.",
      "A cache speeds builds up, but packages still come from the public registry and there's nowhere to publish internal packages.",
      null],
    why: "CodeArtifact is a managed artifact repository for npm, PyPI, Maven and others. A repository can have an upstream (an external connection to the public registry), so it holds internal packages and caches approved public ones. Builds sign in with aws codeartifact login.",
    doc: ["https://docs.aws.amazon.com/codeartifact/latest/ug/welcome.html", "https://docs.aws.amazon.com/codeartifact/latest/ug/external-connection.html"] },

  // samconfig.toml environments
  { id: "dva-3-925", exam: "DVA", dva: "3.1", topic: "sam", type: "mc",
    q: "A SAM application deploys to a dev account and a prod account, with a different stack name, Region and parameter overrides for each. Developers keep typing long sam deploy commands and sometimes deploy dev settings to prod. The settings should live in the repository. What should the developer do?",
    opts: [
      "Define dev and prod environments in samconfig.toml and deploy with sam deploy --config-env dev or --config-env prod.",
      "Put both sets of values in the template's Mappings section and pick one with the Fn::FindInMap function at deploy time.",
      "Keep two copies of template.yaml, one for each account, and point each developer's shell alias at the right copy.",
      "Store the settings in environment variables on each developer's machine and let sam deploy --guided read them."
    ], a: 0,
    no: [null,
      "Mappings choose values inside the template, but stack name and Region are deploy settings, not template values, so they can't live there.",
      "Two templates drift apart over time, and the aliases live on each machine, not in the repository.",
      "Settings on each laptop aren't shared or reviewed. --guided asks questions and saves the answers to samconfig.toml anyway."],
    why: "samconfig.toml holds sam deploy settings grouped by environment, such as stack_name, region and parameter_overrides. --config-env picks the group, so the same command shape deploys each environment and the settings are versioned with the code.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html"] },

  // sam build --use-container
  { id: "dva-3-926", exam: "DVA", dva: "3.1", topic: "sam", type: "mc",
    q: "A developer on macOS runs sam build for a Python function that depends on a library with compiled C extensions. The deployed function fails at import with an invalid ELF header error. Unit tests pass on the laptop. What should the developer change?",
    opts: [
      "Raise the function's memory to 1,024 MB, so Lambda has enough room to compile the native extension at start-up.",
      "Run sam build --use-container, so the dependencies are built inside a container that matches the Lambda runtime.",
      "Switch the function's architecture from x86_64 to arm64, since the arm64 runtime loads macOS-built native libraries.",
      "Move the library into a layer, because Lambda recompiles native code in layers for its own operating system."
    ], a: 1,
    no: [
      "Lambda doesn't compile anything at start-up. The library was built for macOS and won't load on Amazon Linux at any memory size.",
      null,
      "arm64 Lambda runs Amazon Linux too. A macOS binary won't load on either architecture.",
      "Layers are unpacked as they are. A macOS binary in a layer fails exactly the same way."],
    why: "Native extensions must be compiled for Amazon Linux and the function's architecture. sam build --use-container builds inside a Lambda-like Docker image, so the packaged binaries match what the function runs on.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-build.html"] },

  // Elastic Beanstalk .ebextensions
  { id: "dva-3-927", exam: "DVA", dva: "3.1", topic: "beanstalk", type: "mc",
    q: "An application on Elastic Beanstalk needs an extra operating system package and an environment property set on every instance, including instances added later by scaling. The developer wants this to ship with the application source, not done by hand in the console. Where should the developer put it?",
    opts: [
      "In a user data script entered on the environment's launch template, edited in the EC2 console after each deployment.",
      "In a Dockerfile at the root of the source bundle, which Beanstalk runs on every platform before the application starts.",
      "In a .config file in the .ebextensions folder of the source bundle, using its packages and option_settings keys.",
      "In the buildspec.yml file at the root of the source bundle, which Beanstalk runs on each instance during deployment."
    ], a: 2,
    no: [
      "Changes made by hand to resources Beanstalk manages can be overwritten, and they don't travel with the source code.",
      "A Dockerfile is used only on the Docker platform. On other platforms, Beanstalk ignores it.",
      null,
      "buildspec.yml is read by CodeBuild, not by Elastic Beanstalk instances."],
    why: ".ebextensions holds YAML or JSON .config files in the source bundle. They can install packages, run commands, create files and set option_settings such as environment properties, and Beanstalk applies them to every instance, including new ones.",
    doc: ["https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/ebextensions.html"] },

  // ECR tag immutability
  { id: "dva-3-928", exam: "DVA", dva: "3.1", topic: "ecr", type: "mc",
    q: "An ECS service runs the image tagged release-1.4 from Amazon ECR. A developer accidentally pushed a test build with the same tag, and tasks that started afterwards ran the test build. The team wants a pushed release tag never to point to a different image again. What should the developer do?",
    opts: [
      "Turn on scan on push for the repository, so that a test build pushed with a release tag is rejected by the scan.",
      "Add a lifecycle policy that expires untagged images after one day, so the overwritten release image is removed quickly.",
      "Turn on cross-Region replication, so that a second copy of every release tag is kept in a separate Region.",
      "Set the repository's image tag mutability to IMMUTABLE, so that a push that reuses an existing tag fails."
    ], a: 3,
    no: [
      "Image scanning looks for vulnerabilities. It doesn't stop a tag from being reused.",
      "Expiring the old image makes the problem worse: the real release-1.4 image would be deleted.",
      "Replication copies whatever the tag points to, test build included. It doesn't stop the overwrite.",
      null],
    why: "With tag immutability on, ECR rejects a push that would move an existing tag to a new image. Deployments that name a tag always get the same image, and pinning to the image digest gives the same guarantee.",
    doc: ["https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html"] },

  // Smaller Lambda packages
  { id: "dva-3-929", exam: "DVA", dva: "3.1", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Node.js Lambda function's .zip package is 90 MB, mostly node_modules, and deployments are slow. The developer uses AWS SAM. Which actions make the deployment package smaller? (Select TWO.)",
    items: [
      { t: "Leave devDependencies, tests and local tooling out of the package, installing production dependencies only.", ok: true },
      { t: "Set the function's BuildMethod to esbuild in its SAM Metadata, so the code is bundled and minified at build time.", ok: true },
      { t: "Raise the function's memory setting, which also raises the deployment package size that Lambda allows it.", ok: false, no: "Memory affects CPU and the price per millisecond. The package size limits don't change with memory." },
      { t: "Turn on provisioned concurrency for the $LATEST version, so the package is loaded before any requests arrive.", ok: false, no: "Provisioned concurrency can't be set on $LATEST, and it doesn't change the package size anyway." },
      { t: "Write the dependencies to /tmp from the handler on each invocation, so they don't have to be in the package.", ok: false, no: "The files still have to come from somewhere at run time, and loading them on every request is slow." }
    ],
    why: "Smaller packages come from shipping only what runs: production dependencies, with no tests or tools. SAM can build Node.js functions with esbuild, which bundles, tree-shakes and minifies the code into a small file.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-using-build-typescript.html", "https://docs.aws.amazon.com/lambda/latest/dg/nodejs-package.html"] },

  // ---------------------------------------------------------------- Task 3.2: test in development environments

  // sam local invoke with a generated event
  { id: "dva-3-930", exam: "DVA", dva: "3.2", topic: "sam", type: "mc",
    q: "A developer is writing a Lambda function that runs when an object is uploaded to an S3 bucket. They want to run it on their own machine with a realistic S3 event before deploying anything. Which approach works with the SAM CLI?",
    opts: [
      "Run sam local generate-event s3 put to create the event file, then pass it to sam local invoke with the -e option.",
      "Run sam local start-api and upload a test object to the real bucket, which sends the S3 event to the local function.",
      "Run sam validate with the --event option, which runs the function against a sample event stored in the template.",
      "Run sam deploy --guided with a test stage name, then upload an object to the bucket to trigger the deployed function."
    ], a: 0,
    no: [null,
      "start-api emulates API Gateway for HTTP requests. A real bucket can't send events to a process on your laptop.",
      "sam validate checks the template. It doesn't run functions, and it has no event option.",
      "That deploys to the cloud, and the developer wanted to test locally before deploying anything."],
    why: "sam local generate-event prints sample payloads for many event sources, such as s3 put, sqs receive-message and apigateway aws-proxy. sam local invoke -e runs the function once in a local container with that event.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-generate-event.html", "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-invoke.html"] },

  // sam local start-api
  { id: "dva-3-931", exam: "DVA", dva: "3.2", topic: "sam", type: "mc",
    q: "A SAM template defines an HTTP API with four routes, each backed by a Lambda function. A front-end developer wants to send requests to the routes from a browser on their laptop while changing the function code, without deploying. What should they run?",
    opts: [
      "sam local invoke for each function in turn, pasting the browser's request body into an event file for every call.",
      "sam sync --watch, which serves the four routes from the developer's own laptop on port 3000 while it watches the files.",
      "sam local start-api, which serves the routes on a local HTTP endpoint and runs each function in a container per request.",
      "sam local start-lambda, which emulates the Lambda Invoke API so the browser can call each function by its name."
    ], a: 2,
    no: [
      "invoke runs one function once with a fixed event. It doesn't serve HTTP requests from a browser.",
      "sam sync deploys to a stack in the cloud. It doesn't serve anything locally.",
      null,
      "start-lambda emulates the Lambda API for SDK and CLI callers, not the HTTP routes a browser would call."],
    why: "sam local start-api reads the template's API events and serves them on a local endpoint (port 3000 by default). Each request runs the matching function in a local container, so code changes show up without a deploy.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-local-start-api.html"] },

  // Stubbing the SDK in unit tests
  { id: "dva-3-932", exam: "DVA", dva: "3.2", topic: "testing", type: "mc",
    q: "Unit tests for a Lambda handler call DynamoDB and SQS through the AWS SDK. The tests run in a CI pipeline that has no AWS credentials, and they must be fast and repeatable. How should the developer write them?",
    opts: [
      "Give the CI runner an IAM user's access keys, so the tests can call the real dev table and queue on every run.",
      "Stub or mock the SDK clients in the tests (for example with botocore's Stubber or aws-sdk-client-mock) to return set responses.",
      "Run the unit tests inside sam local invoke, which answers SDK calls to DynamoDB and SQS without contacting AWS.",
      "Deploy a copy of the stack for every pipeline run and delete it when the tests finish, so each run starts clean."
    ], a: 1,
    no: [
      "Long-term keys in CI are a security risk, and tests against shared live resources are slow and flaky.",
      null,
      "sam local invoke runs the function in a container, but SDK calls inside it still go to real AWS (or to an endpoint you provide). It doesn't fake them.",
      "That's an integration test. It's slow, costs money and needs credentials, which this pipeline doesn't have."],
    why: "Unit tests should test your logic, not AWS. Stubbing the SDK clients returns canned responses (and errors) with no network calls or credentials. Integration tests against real or local services are a separate layer.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/testing-guide.html", "https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/unit-testing.html"] },

  // API Gateway stage variables and Lambda aliases
  { id: "dva-3-933", exam: "DVA", dva: "3.2", topic: "apigateway", type: "mc",
    q: "A REST API has dev and prod stages. Both currently call the same Lambda function, so testers in dev hit production code. The function has a dev alias and a prod alias. The developer wants each stage to call its own alias without keeping two copies of the API. What should the developer do?",
    opts: [
      "Create a second REST API for testing, copied from the first, with its integration pointing to the dev alias ARN.",
      "Add a resource-based policy to the function that sends requests from the dev stage to the dev alias automatically.",
      "Turn on canary release settings on the prod stage, sending 100% of canary traffic to the dev alias for the testers.",
      "Add a stage variable, such as lambdaAlias, set it to dev and prod on the stages, and use it in the integration's function ARN."
    ], a: 3,
    no: [
      "A second API is the copy the developer wants to avoid, and the two will drift apart.",
      "A resource-based policy says who may invoke the function. It doesn't route requests to an alias.",
      "A canary on prod would send real production traffic to dev code, which is worse.",
      null],
    why: "Stage variables are name-value pairs on a stage. An integration ARN ending in :${stageVariables.lambdaAlias} calls a different alias from each stage. Each alias also needs permission for API Gateway to invoke it.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/stage-variables.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/amazon-api-gateway-using-stage-variables.html"] },

  // SAM Accelerate
  { id: "dva-3-934", exam: "DVA", dva: "3.2", topic: "sam", type: "mc",
    q: "A developer tests a serverless app against real AWS services in a personal dev stack. Each sam deploy after a one-line code change takes several minutes while CloudFormation updates the stack. They want code changes to reach the dev stack within seconds. What should they use?",
    opts: [
      "sam sync --watch, which pushes code changes straight to the dev stack's functions and uses CloudFormation only for infrastructure.",
      "sam deploy --no-execute-changeset, which skips the slow CloudFormation step and updates the functions directly.",
      "sam local start-lambda pointed at the dev account, which forwards each invocation in the cloud to the laptop.",
      "sam package --force-upload, which uploads the code so that the running functions pick it up on their next invocation."
    ], a: 0,
    no: [null,
      "--no-execute-changeset creates the change set but doesn't apply it, so nothing changes in the stack.",
      "start-lambda runs functions locally for local callers. It doesn't receive invocations from the cloud.",
      "Uploading to S3 doesn't change a function's code. The function has to be updated to point to the new package."],
    why: "SAM Accelerate (sam sync) updates code with service APIs, such as Lambda UpdateFunctionCode, and uses CloudFormation only when infrastructure changes. --watch syncs on every save. AWS recommends it for dev stacks, not production.",
    doc: ["https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-sync.html"] },

  // Versions and aliases for test
  { id: "dva-3-935", exam: "DVA", dva: "3.2", topic: "lambda", type: "mc",
    q: "QA tests a Lambda function by invoking $LATEST. Developers keep updating the code during the test cycle, so QA sometimes signs off code that's different from what later goes to production. The team wants QA to test exactly what ships. What should the developer do?",
    opts: [
      "Turn on code signing for the function, so the code can't change while the QA team is still testing it.",
      "Set reserved concurrency to 0 on $LATEST during QA, so developers can't update the code until testing finishes.",
      "Publish a version when the code is ready, point a qa alias at it for testing, and later move the prod alias to that version.",
      "Copy the function to a new function named after each release and have QA invoke that copy until sign-off."
    ], a: 2,
    no: [
      "Code signing checks that the code comes from a trusted publisher. Signed code can still change between tests.",
      "Reserved concurrency of 0 throttles every invocation, QA's included, and it doesn't block code updates.",
      null,
      "Copies are a different function, with their own configuration and permissions, so what QA tested still isn't what ships."],
    why: "A published version is an immutable snapshot of the code and configuration, while $LATEST keeps changing. Aliases point to versions, so QA tests a version through one alias and production is moved to that same version.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html", "https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html"] },

  // API Gateway mock integration
  { id: "dva-3-936", exam: "DVA", dva: "3.2", topic: "apigateway", type: "mc",
    q: "A mobile team needs a working GET /orders endpoint in a dev stage this week so it can build screens. The backend Lambda function won't be ready for two weeks. The response format is already agreed. What is the quickest way to give the mobile team an endpoint?",
    opts: [
      "Point the method at an HTTP integration of a public sample API until the real function is ready to replace it.",
      "Set the method's integration type to MOCK and return the agreed JSON from an integration response mapping template.",
      "Create a placeholder Lambda function that throws an error, so the mobile team can build the screens' error states first.",
      "Turn on stage caching for GET /orders and seed the cache with the agreed response through the console's test tool."
    ], a: 1,
    no: [
      "A public sample API won't return the agreed format, and it adds a dependency outside the team's control.",
      null,
      "The team needs the success response to build screens, not only errors.",
      "The cache stores responses from a working integration. You can't seed it by hand, and there's nothing behind it yet."],
    why: "A mock integration makes API Gateway answer from its own mapping templates without calling a backend. It's built for exactly this: client teams can work against the agreed contract before the backend exists.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-mock-integration.html"] },

  // DynamoDB local
  { id: "dva-3-937", exam: "DVA", dva: "3.2", topic: "dynamodb", type: "mc",
    q: "Developers want integration tests that run real DynamoDB queries against a table with their indexes, on their laptops and in CI, without needing AWS credentials, paying for capacity, or sharing a table with other developers. What should they use?",
    opts: [
      "A dev table in the shared AWS account with on-demand capacity, which costs nothing while only the tests are using it.",
      "DAX in front of the dev table, so repeated test queries are answered from the cache and use no table capacity.",
      "An in-memory map in the test code, filled from a JSON file and swapped in for the DynamoDB client in the tests.",
      "DynamoDB local, run as a Docker container or a .jar file, with the SDK client's endpoint set to the local address."
    ], a: 3,
    no: [
      "On-demand still charges per request and needs credentials, and every developer shares the same table.",
      "DAX needs a cluster in a VPC and credentials, and it caches reads, not queries against indexes on a laptop.",
      "A fake map doesn't run real queries, key conditions or index behaviour, so it isn't an integration test.",
      null],
    why: "DynamoDB local is a downloadable version of DynamoDB for development and testing. It runs on your machine or in CI, supports tables, indexes and the same API, and the SDK uses it when you set the endpoint, for example http://localhost:8000.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html"] },

  // Testing a deployed function with an event
  { id: "dva-3-938", exam: "DVA", dva: "3.2", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A function is deployed to a dev account. A developer wants to send it a sample event and read the response and logs, without wiring up its real trigger. Which options do this? (Select TWO.)",
    items: [
      { t: "Create a test event in the Lambda console and choose Test, which shows the response and the log output.", ok: true },
      { t: "Run sam remote invoke with the function's logical ID and an --event-file, which invokes the deployed function.", ok: true },
      { t: "Run sam local start-lambda, which sends each local test event on to the function deployed in the dev account.", ok: false, no: "start-lambda runs functions locally. It never calls the deployed function." },
      { t: "Run sam validate --lint, which runs the deployed function with the template's sample events and reports failures.", ok: false, no: "validate checks the template's syntax and best practices. It doesn't invoke anything." },
      { t: "Turn on X-Ray active tracing, which replays the function's last event so the developer can see the response.", ok: false, no: "X-Ray records traces of real invocations. It doesn't replay or send events." }
    ],
    why: "The console's test events invoke the deployed function and show its result and logs, and shareable test events can be saved for the team. sam remote invoke does the same from the command line for functions in a deployed stack.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/testing-functions.html", "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/using-sam-cli-remote-invoke.html"] },

  // Environment-specific endpoints in tests
  { id: "dva-3-939", exam: "DVA", dva: "3.2", topic: "testing", type: "mc",
    q: "An integration test suite should run against the dev stack's API, queue and table. Today the test code has the names and the URL typed in by hand, and the tests break every time the stack is recreated. How should the developer make the tests find the right resources?",
    opts: [
      "Give every resource in the template a fixed physical name, so the names never change when the stack is recreated.",
      "Look the resources up with the List APIs at the start of the tests and use the first API, queue and table returned.",
      "Export the values as stack outputs and have the tests read them with describe-stacks (or sam list stack-outputs) before running.",
      "Have the tests read the values from the template file in the repository, since it lists every resource the stack creates."
    ], a: 2,
    no: [
      "Fixed names stop CloudFormation from replacing resources and clash when a second stack is deployed, for example a second developer's.",
      "\"The first one returned\" is a guess. Any account with more than one stack will pick the wrong resources.",
      null,
      "The template has logical IDs and parameters, not the URL and generated names that exist only after deployment."],
    why: "Stack outputs publish the values a stack creates, such as the API URL and the queue and table names. Tests read them from the stack they're pointed at, so they keep working across recreated stacks and stacks for each developer.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html", "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-list-stack-outputs.html"] }
);
