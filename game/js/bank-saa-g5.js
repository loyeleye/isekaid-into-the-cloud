// Question bank batch: SAA in-scope services the bank never tested (AI services, DMS, Kinesis Video Streams, Device Farm,
// Data Exchange, AppFlow, Neptune, Managed Grafana and Prometheus, Service Catalog, License Manager, AWS Health,
// Wavelength, Serverless Application Repository, ECS/EKS Anywhere). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Domain 1: Design Secure Architectures
  { id: "saa-1-301", exam: "SAA", saa: "1.3", topic: "comprehend", type: "mc",
    q: "A company exports thousands of English customer support chat transcripts to an S3 bucket each night. Before analysts can read them, every name, credit card number and postal address in the text must be replaced with masking characters. The team has no machine learning experience and wants a managed service. Which solution meets these requirements?",
    opts: [
      "Run an Amazon Comprehend PII redaction job on the nightly files and give analysts access only to the redacted output prefix.",
      "Enable Amazon Macie automated sensitive data discovery on the bucket and give analysts the files that Macie has already reviewed.",
      "Run Amazon Textract on the nightly files to find the sensitive fields and write the extracted key-value pairs to a new prefix.",
      "Encrypt the transcripts with SSE-KMS and grant analysts kms:Decrypt so that only authorized readers can open the files."
    ], a: 0,
    no: [null,
      "Macie discovers sensitive data in S3 objects and reports it as findings. It doesn't produce masked copies of the text.",
      "Textract extracts text and structure from scanned documents and images. It doesn't find PII in plain text or redact it.",
      "Encryption protects the files at rest, but anyone allowed to decrypt them still sees every name and card number."],
    why: "Amazon Comprehend detects PII entities such as names, card numbers and addresses in English or Spanish text. Redaction runs as an asynchronous batch job that returns a copy of each document with the PII replaced by masking characters.",
    doc: ["https://docs.aws.amazon.com/comprehend/latest/dg/how-pii.html", "https://docs.aws.amazon.com/comprehend/latest/dg/pii.html"] },

  { id: "saa-1-302", exam: "SAA", saa: "1.1", topic: "servicecatalog", type: "mc",
    q: "Developers in a company's AWS account need to create their own test environments from three approved CloudFormation templates. The security team doesn't want to give developers IAM permissions for EC2, RDS or CloudFormation, and developers must not be able to change the templates. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Add the templates as AWS Service Catalog products in a portfolio with a launch constraint role, and give developers access to it.",
      "Store the templates in a private S3 bucket and give developers an IAM policy that allows only the cloudformation:CreateStack action.",
      "Have the platform team launch each environment from the templates whenever a developer opens a ticket asking for one.",
      "Share the templates with the developers through AWS RAM and attach a permissions boundary that limits what they can launch."
    ], a: 0,
    no: [null,
      "CloudFormation builds the stack with the developer's own permissions unless a service role is passed, so developers would still need EC2 and RDS rights or iam:PassRole.",
      "It meets the security goals, but every environment waits on a manual ticket, which is far more overhead than self-service.",
      "AWS RAM can't share CloudFormation templates, and a permissions boundary only caps permissions. It grants none."],
    why: "A Service Catalog launch constraint names an IAM role that Service Catalog assumes when an end user launches, updates or terminates the product, so end users need only Service Catalog access to the portfolio. Administrators own the products, so end users can't change the templates.",
    doc: ["https://docs.aws.amazon.com/servicecatalog/latest/adminguide/constraints-launch.html", "https://docs.aws.amazon.com/servicecatalog/latest/adminguide/introduction.html"] },

  { id: "saa-1-303", exam: "SAA", saa: "1.1", topic: "servicecatalog", type: "multi", hint: "Select TWO.",
    q: "A central cloud team publishes approved products in an AWS Service Catalog portfolio. Users in 40 member accounts of the company's AWS Organizations organization must be able to launch them. When the central team adds a product or constraint, every account must get the change without a redeployment, and member account admins must not be able to remove constraints. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Share the portfolio from the central account with the organization or its OUs by using Service Catalog organizational sharing.", ok: true },
      { t: "Have each member account's admin import the shared portfolio and grant the account's users, groups or roles access to it.", ok: true },
      { t: "Deploy a copy of the portfolio into every member account with CloudFormation StackSets each time the central team edits it.", ok: false, no: "StackSets deploy independent copies, so every change needs a redeployment, which the requirement rules out." },
      { t: "Attach an SCP to the member accounts that grants servicecatalog:ProvisionProduct for the products in the portfolio.", ok: false, no: "SCPs never grant permissions. They only set the maximum that IAM policies in the accounts can allow." },
      { t: "Copy the product templates to an S3 bucket the organization can read, and let each account build its own portfolio.", ok: false, no: "Portfolios built from copied templates don't stay in sync, and each account's admin could change or drop the constraints." }
    ],
    why: "A portfolio shared through AWS Organizations is imported, not copied: products and constraints added to the shared portfolio propagate to every import, and recipients can add constraints but can't remove the imported ones. The recipient admin still grants end users access in their own account.",
    doc: ["https://docs.aws.amazon.com/servicecatalog/latest/adminguide/catalogs_portfolios_sharing.html"] },

  { id: "saa-1-304", exam: "SAA", saa: "1.1", topic: "grafana", type: "mc",
    q: "An operations team wants dashboards that combine metrics from Amazon CloudWatch and Amazon Managed Service for Prometheus. Staff must sign in with the company's existing SAML 2.0 identity provider, without IAM users, and the company doesn't want to patch or scale any dashboard servers. Which solution meets these requirements?",
    opts: [
      "Create an Amazon Managed Grafana workspace with SAML authentication, and add CloudWatch and the Prometheus workspace as data sources.",
      "Run open source Grafana on an EC2 Auto Scaling group behind an ALB that authenticates users through the corporate identity provider.",
      "Build CloudWatch dashboards for the metrics and create an IAM user for each staff member so that they can sign in and view them.",
      "Copy the metrics into Amazon OpenSearch Service with exporters on EC2 instances, and have staff view them in OpenSearch Dashboards."
    ], a: 0,
    no: [null,
      "It works, but the team would patch and scale the Grafana servers itself, which the company wants to avoid.",
      "IAM users are exactly what the company wants to avoid. Staff should sign in through the corporate identity provider.",
      "The EC2 exporters are servers to run and patch, and the data is copied instead of queried at its sources."],
    why: "Amazon Managed Grafana runs Grafana workspaces for you and signs users in through a SAML 2.0 identity provider or IAM Identity Center instead of IAM. CloudWatch and Amazon Managed Service for Prometheus are built-in AWS data sources.",
    doc: ["https://docs.aws.amazon.com/grafana/latest/userguide/authentication-in-AMG.html", "https://docs.aws.amazon.com/grafana/latest/userguide/what-is-Amazon-Managed-Service-Grafana.html"] },

  { id: "saa-1-305", exam: "SAA", saa: "1.2", topic: "rekognition", type: "multi", hint: "Select TWO.",
    q: "A fintech app must verify new customers at sign-up. Each customer uploads a photo of a US driver's license and a selfie. The app must read the name and date of birth from the license and confirm that the selfie shows the same person as the license photo. The company has no machine learning staff. Which services should the solutions architect use? (Select TWO.)",
    items: [
      { t: "Amazon Textract AnalyzeID to extract the name and date of birth from the image of the driver's license.", ok: true },
      { t: "Amazon Rekognition CompareFaces to compare the face in the selfie with the face on the driver's license.", ok: true },
      { t: "Amazon Comprehend DetectPiiEntities to read the name and date of birth straight from the license image.", ok: false, no: "Comprehend's PII detection works on UTF-8 text. It can't read text out of a photo of a license." },
      { t: "Amazon Cognito user pool threat protection to match the selfie against the photo on the driver's license.", ok: false, no: "Cognito threat protection scores sign-in risk, such as compromised credentials. It doesn't compare faces." },
      { t: "Amazon Rekognition DetectFaces to confirm that the selfie and the license show the same person's face.", ok: false, no: "DetectFaces only finds faces and their attributes in one image. Matching two faces needs CompareFaces." }
    ],
    why: "Textract's AnalyzeID API extracts fields such as name and date of birth from US government-issued IDs like driver's licenses and passports. Rekognition's CompareFaces compares a face in a source image with the faces in a target image, which suits identity verification.",
    doc: ["https://docs.aws.amazon.com/textract/latest/dg/how-it-works-identity.html", "https://docs.aws.amazon.com/rekognition/latest/dg/faces-comparefaces.html"] },

  // Domain 2: Design Resilient Architectures
  { id: "saa-2-301", exam: "SAA", saa: "2.1", topic: "rekognition", type: "mc",
    q: "A social app stores user-uploaded photos in an S3 bucket. Each new photo must be checked for explicit or violent content within seconds of upload, and flagged photos must stay hidden until a moderator reviews them. The company wants no servers to manage and no custom model training. Which solution meets these requirements?",
    opts: [
      "Invoke a Lambda function from S3 event notifications that calls Amazon Rekognition DetectModerationLabels and hides flagged photos.",
      "Invoke a Lambda function from S3 event notifications that sends each new photo to Amazon Comprehend to classify unsafe content.",
      "Train an image classifier in Amazon SageMaker AI, host it on an endpoint, and call it from a worker on an EC2 instance that polls S3.",
      "Turn on Amazon Macie for the bucket so that it scans each new photo and raises a finding for explicit or violent images."
    ], a: 0,
    no: [null,
      "Comprehend analyzes text. It can't detect unsafe content in images.",
      "It could work, but model training and an EC2 worker break both the no-training and no-servers requirements.",
      "Macie discovers sensitive data such as PII in S3 objects. It doesn't moderate image content."],
    why: "Rekognition's DetectModerationLabels operation uses a pre-trained model to label inappropriate or offensive content in an image stored in S3. An S3 event that invokes Lambda makes the check event-driven and serverless.",
    doc: ["https://docs.aws.amazon.com/rekognition/latest/dg/procedure-moderate-images.html", "https://docs.aws.amazon.com/rekognition/latest/dg/moderation.html"] },

  { id: "saa-2-302", exam: "SAA", saa: "2.1", topic: "polly", type: "mc",
    q: "A news site wants an audio version of every article, and many articles are longer than 20,000 characters. When an editor publishes an article, the audio must be generated in the background, saved for playback, and the content management system notified when it is ready. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Call Amazon Polly StartSpeechSynthesisTask with an S3 output bucket and an SNS topic that notifies the CMS when the file is ready.",
      "Call Amazon Polly SynthesizeSpeech once with the full article text and stream the audio that it returns straight into an S3 bucket for playback.",
      "Send the article text to an Amazon Transcribe batch job that writes an audio file to S3 and publishes a completion event.",
      "Run an open source text-to-speech engine in containers on Amazon ECS and have each task upload the finished audio to S3."
    ], a: 0,
    no: [null,
      "SynthesizeSpeech is the near-real-time operation and takes only 3,000 characters per request, so a long article fails.",
      "Transcribe converts speech to text, the opposite direction.",
      "It works, but running and scaling the speech containers is more overhead than calling a managed API."],
    why: "Polly's asynchronous synthesis (StartSpeechSynthesisTask) queues long text, up to 100,000 billable characters, writes the audio straight to the S3 bucket you name, and can publish a completion message to an SNS topic.",
    doc: ["https://docs.aws.amazon.com/polly/latest/dg/asynchronous.html"] },

  { id: "saa-2-303", exam: "SAA", saa: "2.1", topic: "lex", type: "mc",
    q: "A bank wants customers to check balances and report lost cards in natural language, by text in a website chat widget or by voice. The conversation must ask for any required details that are missing, such as the card's last four digits, and then call the bank's existing backend APIs. Which solution meets these requirements?",
    opts: [
      "Build an Amazon Lex bot with an intent and slots for each request, and attach a Lambda function that calls the backend APIs.",
      "Use Amazon Polly to speak menu prompts, and a Lambda function that scans each typed message for keywords and then calls the matching APIs.",
      "Send each customer message to Amazon Comprehend to detect key phrases and sentiment, and route it to the matching API.",
      "Use Amazon Transcribe to turn spoken requests into text, and an SQS queue that passes the text to a backend worker."
    ], a: 0,
    no: [null,
      "Polly only turns text into speech, and keyword matching isn't natural language understanding or dialog management.",
      "Comprehend extracts insights from text, but it doesn't hold a conversation that asks for missing details.",
      "Transcribe only converts speech to text. Nothing understands the request or prompts for missing details."],
    why: "Amazon Lex builds conversational interfaces for voice and text with natural language understanding. Slots make the bot prompt for the details an intent needs, and a Lambda function attached to the bot alias runs the business logic.",
    doc: ["https://docs.aws.amazon.com/lexv2/latest/dg/what-is.html", "https://docs.aws.amazon.com/lexv2/latest/dg/lambda.html"] },

  { id: "saa-2-304", exam: "SAA", saa: "2.1", topic: "translate", type: "multi", hint: "Select TWO.",
    q: "A gaming company runs an in-game chat where players write in many languages. Each message must appear to every reader in their own language within a second or two, and the company's product and character names must stay untranslated. The company wants managed services only. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Call the Amazon Translate TranslateText API from the chat service for each message and each reader's language.", ok: true },
      { t: "Create an Amazon Translate custom terminology that maps each product and character name to itself.", ok: true },
      { t: "Run an Amazon Translate StartTextTranslationJob batch on the chat messages collected in S3 each minute.", ok: false, no: "Batch jobs are for document collections when instant translation isn't required, so they're too slow for live chat." },
      { t: "Send each message to Amazon Comprehend to detect its language and return translated text to each reader.", ok: false, no: "Comprehend can detect the dominant language of text, but it doesn't translate anything." },
      { t: "Add the names to an Amazon Polly pronunciation lexicon so that they keep their spelling in every language.", ok: false, no: "Polly lexicons customize how synthesized speech pronounces words. They don't affect text translation." }
    ],
    why: "TranslateText is Amazon Translate's real-time operation, which returns the translation immediately. A custom terminology tells Translate how to render terms such as brand and character names, for example by keeping them unchanged.",
    doc: ["https://docs.aws.amazon.com/translate/latest/dg/sync.html", "https://docs.aws.amazon.com/translate/latest/dg/how-custom-terminology.html"] },

  { id: "saa-2-305", exam: "SAA", saa: "2.2", topic: "health", type: "multi", hint: "Select TWO.",
    q: "A company runs a legacy single-instance application on an EBS-backed EC2 instance that Systems Manager manages. When AWS schedules the instance for retirement, staff notice the email too late. The company wants the instance stopped and started automatically so that it moves to healthy hardware, with no manual steps. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create an EventBridge rule that matches AWS Health events of type AWS_EC2_PERSISTENT_INSTANCE_RETIREMENT_SCHEDULED.", ok: true },
      { t: "Set the rule's target to a Systems Manager Automation runbook that stops and then starts the affected instance.", ok: true },
      { t: "Create a CloudWatch alarm on the StatusCheckFailed_System metric that runs the EC2 reboot action on the instance.", ok: false, no: "The alarm fires only after the hardware is impaired, and a reboot keeps the instance on the same host." },
      { t: "Turn on AWS Config with a managed rule that finds instances scheduled for retirement and remediates them.", ok: false, no: "Config evaluates resource configurations. It doesn't receive scheduled maintenance events from AWS Health." },
      { t: "Add the operations team as the account's alternate operations contact so that retirement emails reach them sooner.", ok: false, no: "A faster email still needs a person to act, and the requirement is no manual steps." }
    ],
    why: "AWS Health sends scheduled events such as AWS_EC2_PERSISTENT_INSTANCE_RETIREMENT_SCHEDULED to EventBridge at no extra cost. A rule can target a Systems Manager Automation runbook that stops and starts the instance, which moves an EBS-backed instance to new hardware.",
    doc: ["https://docs.aws.amazon.com/health/latest/ug/automating-instance-actions.html", "https://docs.aws.amazon.com/health/latest/ug/cloudwatch-events-health.html"] },

  { id: "saa-2-306", exam: "SAA", saa: "2.2", topic: "health", type: "mc",
    q: "A company has 60 accounts in AWS Organizations with all features enabled. The central operations team wants one place to see which accounts are affected by AWS service issues and scheduled maintenance events, and it must not need to work in the management account to do so. Which solution meets these requirements?",
    opts: [
      "Enable AWS Health organizational view and register the operations account as a delegated administrator for AWS Health.",
      "Create an organization trail in AWS CloudTrail and query it from the operations account for AWS service disruptions.",
      "Set up an AWS Config aggregator in the operations account that collects configuration items from every member account.",
      "Give the operations team a role in each account and have them open the AWS Health Dashboard in every account each morning."
    ], a: 0,
    no: [null,
      "CloudTrail records API calls made in the accounts, not AWS service issues or scheduled maintenance.",
      "Config aggregators collect resource configuration and compliance data, not AWS Health events.",
      "It works, but checking 60 dashboards by hand isn't one place and doesn't scale."],
    why: "AWS Health organizational view aggregates Health events across the organization so you can see which accounts are affected. AWS recommends a delegated administrator so operations teams get that view while the management account stays restricted.",
    doc: ["https://docs.aws.amazon.com/health/latest/ug/aggregate-events.html"] },

  { id: "saa-2-307", exam: "SAA", saa: "2.1", topic: "serverlessrepo", type: "mc",
    q: "A platform team has built a serverless log-processing app as an AWS SAM template with Lambda functions and an SQS queue. Product teams in other accounts of the company's organization should be able to find and deploy it themselves, but it must not be available to the public. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Publish the app to the AWS Serverless Application Repository and share it with the organization through an application policy.",
      "Publish the app to the AWS Serverless Application Repository as a public app, and then send its link only to the company's product teams.",
      "Store the packaged template in an S3 bucket and email each product team the steps to deploy it with the AWS SAM CLI.",
      "Copy the Lambda code into each product team's account as a Lambda layer and have each team write its own SAM template."
    ], a: 0,
    no: [null,
      "Anyone can deploy a publicly shared app, which breaks the not-public requirement.",
      "It works, but teams can't browse or search for the app, and each one repeats the deploy steps by hand.",
      "Layers share code, not the whole app with its queue and settings, and every team rebuilds the template."],
    why: "The Serverless Application Repository stores SAM-based apps that consumers can browse and deploy. An application policy keeps an app private, shares it with specific accounts or an AWS organization, or makes it public.",
    doc: ["https://docs.aws.amazon.com/serverlessrepo/latest/devguide/security_iam_resource-based-policy-examples.html", "https://docs.aws.amazon.com/serverlessrepo/latest/devguide/what-is-serverlessrepo.html"] },

  { id: "saa-2-308", exam: "SAA", saa: "2.1", topic: "ecs", type: "mc",
    q: "A manufacturer must keep a set of data-processing services on its existing servers in its factory because the data can't leave the site. It wants to run the services as containers managed with the same Amazon ECS console, APIs and task definitions it uses for its cloud workloads. The services only make outbound connections. Which solution meets these requirements?",
    opts: [
      "Register the factory servers as external instances with Amazon ECS Anywhere and run the services with the EXTERNAL launch type.",
      "Run the containers on AWS Fargate in the nearest AWS Region and connect the factory's network to that Region with an AWS Site-to-Site VPN.",
      "Install a self-managed Kubernetes cluster on the factory servers and register it in the Amazon EKS console with EKS Connector.",
      "Order an AWS Outposts rack for the factory and run the ECS services on EC2 instances that run on the Outpost's hardware."
    ], a: 0,
    no: [null,
      "Fargate runs the tasks in the Region, so the data would leave the factory.",
      "EKS Connector only lets you view a cluster in the console, and the company wants to keep its ECS task definitions.",
      "That brings in new AWS-owned hardware instead of using the factory's existing servers."],
    why: "ECS Anywhere registers on-premises servers or VMs as external instances in an ECS cluster, and the EXTERNAL launch type runs tasks on them through the same ECS APIs and task definitions. It suits outbound-only workloads because external instances have no Elastic Load Balancing support.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere.html"] },

  { id: "saa-2-309", exam: "SAA", saa: "2.1", topic: "eks", type: "mc",
    q: "A defense contractor must run Kubernetes workloads in a secure facility that has no network connection to AWS or the internet. It wants an AWS-supported Kubernetes distribution with tooling that automates cluster creation and upgrades on its own VMware vSphere servers. Which solution meets these requirements?",
    opts: [
      "Run Amazon EKS Anywhere clusters on the vSphere servers in an air-gapped setup, with an Enterprise Subscription for support.",
      "Create an Amazon EKS cluster in the nearest AWS Region and join the vSphere servers to it as Amazon EKS Hybrid Nodes.",
      "Install an AWS Outposts rack in the facility and run an Amazon EKS cluster with its worker nodes on the Outpost.",
      "Register the vSphere servers with Amazon ECS Anywhere and run the workloads as tasks with the EXTERNAL launch type."
    ], a: 0,
    no: [null,
      "Hybrid Nodes need a reliable connection to the EKS control plane in an AWS Region, and the facility has none.",
      "EKS on Outposts also needs a reliable connection to an AWS Region.",
      "ECS Anywhere isn't Kubernetes, and its external instances must reach the ECS control plane in the Region."],
    why: "EKS Anywhere is a customer-managed Kubernetes distribution that automates cluster lifecycle on vSphere, bare metal and other infrastructure, and it can run air-gapped. EKS Hybrid Nodes and EKS on Outposts both rely on a connection to an AWS Region.",
    doc: ["https://docs.aws.amazon.com/eks/latest/userguide/eks-deployment-options.html"] },

  { id: "saa-2-310", exam: "SAA", saa: "2.2", topic: "prometheus", type: "multi", hint: "Select TWO.",
    q: "A company runs microservices on several Amazon EKS clusters and monitors them with a self-managed Prometheus server and Grafana on EC2. The Prometheus server is a single point of failure and keeps running out of storage. The team wants to keep its PromQL queries and dashboards while removing servers it must manage. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Send the clusters' metrics to an Amazon Managed Service for Prometheus workspace, which stores them across three AZs.", ok: true },
      { t: "Move the dashboards to an Amazon Managed Grafana workspace that uses the Prometheus workspace as a data source.", ok: true },
      { t: "Install the CloudWatch agent on each node and rewrite the PromQL alert rules as CloudWatch Logs Insights queries.", ok: false, no: "That means rewriting every query in a different language, which the team wants to avoid." },
      { t: "Move the Prometheus server to a larger EC2 instance with a bigger EBS volume and take daily EBS snapshots of it.", ok: false, no: "It eases storage for a while but keeps a single server to manage and a single point of failure." },
      { t: "Stream the metrics into Amazon Kinesis Data Streams and query them with Amazon Athena from the Grafana server.", ok: false, no: "That replaces PromQL and still leaves the Grafana server to run." }
    ],
    why: "Amazon Managed Service for Prometheus is serverless, uses the same Prometheus data model and PromQL, scales ingestion and storage automatically, and replicates data across three Availability Zones. Amazon Managed Grafana runs the dashboards and supports that workspace as a data source.",
    doc: ["https://docs.aws.amazon.com/prometheus/latest/userguide/what-is-Amazon-Managed-Service-Prometheus.html", "https://docs.aws.amazon.com/grafana/latest/userguide/what-is-Amazon-Managed-Service-Grafana.html"] },

  // Domain 3: Design High-Performing Architectures
  { id: "saa-3-301", exam: "SAA", saa: "3.5", topic: "textract", type: "mc",
    q: "An insurance company receives thousands of scanned, multipage claim forms as PDFs each day in an S3 bucket. It must load each form's field labels with their values, and the line items from the tables on each form, into a database without building or training a model. Which solution meets these requirements?",
    opts: [
      "Run Amazon Textract asynchronous document analysis with the FORMS and TABLES features on each PDF, and load the results.",
      "Call Amazon Textract DetectDocumentText on each PDF, and write code that guesses which lines are labels and which are values.",
      "Call Amazon Rekognition DetectText on each page of every PDF to read the printed words, and load the words into the database.",
      "Run Amazon Comprehend entity detection on each PDF to find the field labels, their values and the rows of each table."
    ], a: 0,
    no: [null,
      "Text detection returns only lines and words, so the team would have to rebuild the forms and tables itself.",
      "Rekognition DetectText is for text in scenes such as posters and road signs, not for analyzing document forms and tables.",
      "Comprehend's pre-trained entity detection works on plain text and returns no form key-value pairs or table structure."],
    why: "Textract document analysis returns form data as key-value pairs and tables as cells, rows and columns. Multipage PDFs are processed with the asynchronous StartDocumentAnalysis operation.",
    doc: ["https://docs.aws.amazon.com/textract/latest/dg/how-it-works-analyzing.html", "https://docs.aws.amazon.com/textract/latest/dg/api-async.html"] },

  { id: "saa-3-302", exam: "SAA", saa: "3.5", topic: "transcribe", type: "multi", hint: "Select TWO.",
    q: "A call center saves thousands of recorded customer calls as audio files in Amazon S3 every day. Managers want a daily report listing the calls in which the customer's sentiment was negative. The company has no data scientists and doesn't want to train models. Which combination of services should a solutions architect use? (Select TWO.)",
    items: [
      { t: "Amazon Transcribe batch jobs to convert each recorded call in S3 into a text transcript.", ok: true },
      { t: "Amazon Comprehend sentiment analysis to label each transcript positive, negative, neutral or mixed.", ok: true },
      { t: "Amazon Polly to convert each recorded call into text that can be searched and analyzed.", ok: false, no: "Polly does the reverse: it turns text into speech." },
      { t: "Amazon Translate to analyze each recording and return a sentiment score for the whole call.", ok: false, no: "Translate converts text between languages. It doesn't read audio or score sentiment." },
      { t: "Amazon Rekognition Video to analyze each recording and detect the emotions of the caller.", ok: false, no: "Rekognition analyzes images and video. The calls are audio-only recordings." }
    ],
    why: "Transcribe converts audio files in S3 to text with batch transcription jobs. Comprehend's pre-trained sentiment analysis labels text as positive, negative, neutral or mixed, so no model training is needed.",
    doc: ["https://docs.aws.amazon.com/transcribe/latest/dg/what-is.html", "https://docs.aws.amazon.com/comprehend/latest/dg/how-sentiment.html"] },

  { id: "saa-3-303", exam: "SAA", saa: "3.5", topic: "kinesisvideo", type: "mc",
    q: "A city is connecting 2,000 traffic cameras to AWS. Operators must be able to watch any camera live in a browser, recorded video must be kept for 30 days for review, and a team will build its own computer vision app that reads frames from the live feeds. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Stream each camera to Amazon Kinesis Video Streams with 30-day retention, watch it through HLS, and read frames with its APIs.",
      "Send each camera's frames to Amazon Kinesis Data Streams with 30-day retention and render the frames in a custom web player.",
      "Upload one-minute video files from each camera to S3 with a 30-day lifecycle rule, and play the newest file for live viewing.",
      "Run a fleet of EC2 media servers that ingest the cameras' RTSP streams, store recordings on EBS and serve live video to browsers."
    ], a: 0,
    no: [null,
      "Data Streams is built for data records, not media, so the team would build its own video packaging and player.",
      "One-minute files aren't live, and the team would build the upload and playback pieces itself.",
      "It works, but running and scaling media servers is exactly the overhead the managed service removes."],
    why: "Kinesis Video Streams ingests live video from millions of devices, stores it for the retention period you set, and serves it for live or archived playback through HLS. Apps can read the media frame by frame in real time through its APIs.",
    doc: ["https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/what-is-kinesis-video.html", "https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/hls-playback.html"] },

  { id: "saa-3-304", exam: "SAA", saa: "3.5", topic: "dataexchange", type: "mc",
    q: "An analytics team wants to add a third-party company's weekly economic data to its S3 data lake. The provider sells the data as a product in AWS Marketplace. The team wants to subscribe, get each new version of the data into S3, and avoid setting up any file-transfer process with the provider. Which solution meets these requirements?",
    opts: [
      "Subscribe to the provider's product in AWS Data Exchange and export each new revision of the data set to the data lake bucket.",
      "Ask the provider to upload each weekly file to an AWS Transfer Family SFTP server that writes each file into the data lake bucket.",
      "Create an Amazon AppFlow flow that pulls the provider's product from AWS Marketplace into the data lake bucket each week.",
      "Use AWS DataSync to copy the provider's weekly files from their storage location into the data lake bucket on a schedule."
    ], a: 0,
    no: [null,
      "That sets up and runs a file-transfer process with the provider, which the team wants to avoid.",
      "AppFlow moves data between SaaS applications such as Salesforce and AWS. It doesn't subscribe to Marketplace data products.",
      "DataSync needs access to the provider's storage and a transfer task, which is the process the team wants to avoid."],
    why: "AWS Data Exchange delivers data products bought through AWS Marketplace. A subscriber can export or copy entitled data sets and their revisions to Amazon S3 for use with analytics and machine learning services.",
    doc: ["https://docs.aws.amazon.com/data-exchange/latest/userguide/what-is.html", "https://docs.aws.amazon.com/data-exchange/latest/userguide/jobs.html"] },

  { id: "saa-3-305", exam: "SAA", saa: "3.5", topic: "appflow", type: "mc",
    q: "A sales operations team wants new and changed Salesforce opportunity records copied into an S3 data lake every hour for analysis with Athena. The team doesn't want to write or host integration code, and each run should not resend records that haven't changed. Which solution meets these requirements?",
    opts: [
      "Create an Amazon AppFlow flow from Salesforce to S3 that runs on an hourly schedule with incremental transfer.",
      "Write a Lambda function that calls the Salesforce API every hour and writes all opportunity records to S3.",
      "Point an AWS Glue crawler at the Salesforce org on an hourly schedule so that it copies the opportunity records to S3.",
      "Create an AWS DMS task with a Salesforce source endpoint and ongoing replication to an S3 target endpoint."
    ], a: 0,
    no: [null,
      "That's integration code to write and host, and it resends every record each hour.",
      "Glue crawlers catalog the schema of data in stores such as S3 and JDBC databases. They don't copy records.",
      "DMS migrates databases and similar data stores, and Salesforce isn't one of its source endpoints."],
    why: "AppFlow transfers data between SaaS applications such as Salesforce and AWS services without code. Schedule-triggered flows can use incremental transfer, which moves only the records added or changed since the last successful run.",
    doc: ["https://docs.aws.amazon.com/appflow/latest/userguide/flow-triggers.html", "https://docs.aws.amazon.com/appflow/latest/userguide/what-is-appflow.html"] },

  { id: "saa-3-306", exam: "SAA", saa: "3.2", topic: "sagemaker", type: "mc",
    q: "A retailer's data scientists want to train a demand-forecasting model on five years of the company's own sales data with their own Python code, then serve predictions to an internal app over an HTTPS endpoint. They don't want to manage training clusters or inference servers. Which solution meets these requirements?",
    opts: [
      "Run training jobs on Amazon SageMaker AI with the team's code, and deploy the trained model to a SageMaker AI endpoint.",
      "Train an Amazon Comprehend custom classifier on the sales data and call its endpoint for each demand forecast.",
      "Train the model on a self-managed GPU EC2 Auto Scaling group and serve it from containers behind an ALB.",
      "Train the model with Amazon Rekognition Custom Labels on the sales data and call the model for each forecast."
    ], a: 0,
    no: [null,
      "Comprehend custom classification labels documents by category. It doesn't run the team's own forecasting code.",
      "It works, but the team would manage the training and serving servers, which it wants to avoid.",
      "Custom Labels trains image models that find objects in images, not forecasting models on sales records."],
    why: "SageMaker AI is a fully managed service to build, train and deploy ML models, including your own algorithms and frameworks. Training runs on managed compute, and trained models deploy to managed endpoints that apps call over HTTPS.",
    doc: ["https://docs.aws.amazon.com/sagemaker/latest/dg/whatis.html"] },

  { id: "saa-3-307", exam: "SAA", saa: "3.4", topic: "wavelength", type: "mc",
    q: "A company is building an augmented-reality app for phones on a telecom carrier's 5G network. The app's game servers must answer the phones with the lowest possible latency, so they must run at the edge of the carrier's 5G network rather than in an AWS Region or metro location. Which solution meets these requirements?",
    opts: [
      "Run the game servers on EC2 in a subnet in the carrier's AWS Wavelength Zone, and route traffic through a carrier gateway.",
      "Run the game servers on EC2 in the nearest AWS Local Zone, and route the phones' traffic to them through an internet gateway.",
      "Run the game servers in the nearest AWS Region, and put AWS Global Accelerator in front of them to use the AWS network.",
      "Run the game servers in the nearest AWS Region, and serve the app's responses through an Amazon CloudFront distribution."
    ], a: 0,
    no: [null,
      "Local Zones put AWS compute near large metro areas, not inside the carrier's 5G network.",
      "Global Accelerator speeds the path to a Region, but the servers still run in the Region.",
      "CloudFront caches content at edge locations. It doesn't run interactive game servers near the phones."],
    why: "Wavelength Zones deploy AWS compute and storage at the edge of communications service providers' networks to give mobile devices low latency. A carrier gateway carries traffic between instances in a Wavelength subnet and devices on the carrier network.",
    doc: ["https://docs.aws.amazon.com/wavelength/latest/developerguide/what-is-wavelength.html", "https://docs.aws.amazon.com/wavelength/latest/developerguide/how-wavelengths-work.html"] },

  { id: "saa-3-308", exam: "SAA", saa: "3.5", topic: "dms", type: "mc",
    q: "A company wants its S3 data lake to hold a copy of the order tables from an on-premises Oracle database, kept current within the hour. Analysts query the data with Athena, and the files should use a columnar format. The database team won't allow any change to the application. Which solution meets these requirements?",
    opts: [
      "Create an AWS DMS task with full load and change data capture to an S3 target endpoint that is set to write Parquet files.",
      "Schedule a nightly Oracle export, copy the dump files to S3 with AWS DataSync, and convert them to Parquet with an AWS Glue job.",
      "Change the application to also send each order to Amazon Data Firehose, which converts the records to Parquet in S3.",
      "Use DMS Schema Conversion to convert the Oracle schema for Amazon S3 and apply it so that the tables stay in sync."
    ], a: 0,
    no: [null,
      "A nightly export can't keep the data lake current within the hour.",
      "It needs a change to the application, which the database team won't allow.",
      "Schema Conversion converts schemas, not data, and its targets are Aurora, RDS and Redshift, not S3."],
    why: "AWS DMS can use S3 as a target and writes both full-load and change data capture (CDC) files there. CSV is the default, and an endpoint setting writes Apache Parquet instead for compact storage and faster queries.",
    doc: ["https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html", "https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html"] },

  { id: "saa-3-309", exam: "SAA", saa: "3.3", topic: "neptune", type: "mc",
    q: "A social network stores friend relationships in an Amazon Neptune cluster that has a single instance. Read queries for friend suggestions have grown tenfold and now slow down the writes that record new friendships. Most of the traffic is reads. Which solution scales the reads with the fewest application changes?",
    opts: [
      "Add Neptune replicas in other AZs and send the read queries to the reader endpoint, keeping writes on the cluster endpoint.",
      "Put an Amazon DynamoDB Accelerator (DAX) cluster in front of the Neptune cluster to cache the results of the friend suggestion queries.",
      "Migrate the relationships to Amazon DocumentDB and run the friend-of-friend queries as lookups in nested arrays.",
      "Send the reads to a second Neptune cluster that is restored each night from a snapshot of the first cluster."
    ], a: 0,
    no: [null,
      "DAX is a cache for DynamoDB only. It doesn't work with Neptune.",
      "That's a rewrite to a document model, which handles multi-hop relationship queries poorly.",
      "A nightly copy is up to a day out of date, and the app has to manage a second cluster."],
    why: "Neptune replicas share the cluster's storage volume and serve only reads, up to 15 per cluster. The reader endpoint spreads read connections across the replicas, while the cluster endpoint keeps sending writes to the primary.",
    doc: ["https://docs.aws.amazon.com/neptune/latest/userguide/feature-overview-endpoints.html", "https://docs.aws.amazon.com/neptune/latest/userguide/intro.html"] },

  { id: "saa-3-310", exam: "SAA", saa: "3.3", topic: "dms", type: "multi", hint: "Select TWO.",
    q: "A company must move a 2 TB on-premises MySQL database to Amazon RDS for MySQL. The database keeps taking writes during the weeks the migration runs, and the application can be offline for no more than 10 minutes at cutover. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create an AWS DMS replication task with full load and ongoing replication (CDC) from the source to the RDS instance.", ok: true },
      { t: "When the task's CDC latency is low, stop the application's writes, let the last changes apply, and point it at RDS.", ok: true },
      { t: "Take a mysqldump backup, copy it to S3, and restore it into the RDS instance during a weekend maintenance window.", ok: false, no: "Writes made after the dump would be lost, or the app would be down for the whole long restore." },
      { t: "Use AWS Application Migration Service to replicate the database server's disks and launch them into RDS.", ok: false, no: "Application Migration Service rehosts whole servers onto EC2. It doesn't load data into an RDS instance." },
      { t: "Convert the schema with DMS Schema Conversion first, because a MySQL-to-MySQL migration requires it.", ok: false, no: "Same-engine migrations don't need schema conversion, and Schema Conversion moves no data anyway." }
    ],
    why: "A DMS task with full load plus CDC copies the existing data and then keeps applying changes from the source's logs, so the source stays in use throughout. Cutover needs only a short pause while the last changes apply.",
    doc: ["https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html", "https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html"] },

  // Domain 4: Design Cost-Optimized Architectures
  { id: "saa-4-301", exam: "SAA", saa: "4.3", topic: "dms", type: "multi", hint: "Select TWO.",
    q: "A company wants to cut database licensing costs by moving an on-premises Oracle database, including its tables, views and stored procedures, to Amazon Aurora PostgreSQL. It wants AWS managed tools and a report of which objects will need manual rework. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Use DMS Schema Conversion to assess the Oracle schema, convert it to PostgreSQL, and apply it to the Aurora cluster.", ok: true },
      { t: "Use an AWS DMS replication task to migrate the data from Oracle into the converted Aurora PostgreSQL tables.", ok: true },
      { t: "Use Oracle Data Pump to export the database and import the dump file directly into the Aurora PostgreSQL cluster.", ok: false, no: "Data Pump dump files are Oracle-specific, and PostgreSQL can't import them." },
      { t: "Use AWS Application Migration Service to replicate the Oracle server and launch it as an Aurora PostgreSQL cluster.", ok: false, no: "Application Migration Service rehosts servers onto EC2. It can't change the database engine or create an Aurora cluster." },
      { t: "Use AWS DataSync to copy the Oracle data files to S3, then load them into Aurora with the aws_s3 extension.", ok: false, no: "Oracle data files are a binary format PostgreSQL can't load, and nothing converts the stored procedures." }
    ],
    why: "DMS Schema Conversion assesses and converts source schemas and code, such as views and stored procedures, to the target engine and reports what needs manual work; it doesn't move data. A DMS task then migrates the data.",
    doc: ["https://docs.aws.amazon.com/dms/latest/userguide/CHAP_SchemaConversion.html", "https://docs.aws.amazon.com/dms/latest/userguide/Welcome.html"] },

  { id: "saa-4-302", exam: "SAA", saa: "4.2", topic: "licensemanager", type: "multi", hint: "Select TWO.",
    q: "A company brings its own SQL Server licenses to EC2 to save costs. Its agreement covers 96 vCPUs, and an audit found that teams had launched more instances than the licenses allow. The company wants launches that would exceed the limit blocked, and license usage tracked centrally. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create a self-managed license in AWS License Manager counted by vCPU, with a limit of 96 and a hard limit enforced.", ok: true },
      { t: "Associate the self-managed license with the AMIs or launch templates that teams use to launch SQL Server instances.", ok: true },
      { t: "Create an AWS Budgets cost budget for the SQL Server instances that alerts when spend passes the cost of 96 vCPUs.", ok: false, no: "A budget alerts on spend after the fact. It doesn't block a launch or count license usage." },
      { t: "Tag every SQL Server instance and use AWS Config to report the instances that are missing the license tag.", ok: false, no: "Config reports on resources after they launch. It doesn't block launches or count vCPUs against a license." },
      { t: "Buy a Compute Savings Plan sized for 96 vCPUs so that any extra SQL Server instances can't be started.", ok: false, no: "A Savings Plan is a pricing commitment. It doesn't limit how many instances can launch." }
    ],
    why: "License Manager self-managed licenses count usage by vCPUs, cores, sockets or instances. With a hard limit, a launch from an associated AMI, launch template or CloudFormation template that would exceed the limit is blocked.",
    doc: ["https://docs.aws.amazon.com/license-manager/latest/userguide/license-rules.html", "https://docs.aws.amazon.com/license-manager/latest/userguide/license-manager.html"] },

  { id: "saa-4-303", exam: "SAA", saa: "4.2", topic: "devicefarm", type: "mc",
    q: "A startup must test each release of its native Android and iOS apps on 50 popular phone and tablet models before shipping. Testing happens only a few days a month, and the team doesn't want to buy, store or maintain physical devices. Which solution meets these requirements MOST cost-effectively?",
    opts: [
      "Upload the app and its tests to AWS Device Farm and run them in parallel on its real, AWS-hosted phones and tablets.",
      "Buy the 50 devices for an in-house test lab and connect them to a CI server that runs the full test suite on each new release.",
      "Run Android and iOS emulators on EC2 Mac and Linux instances and run the whole test suite against the emulators.",
      "Host a web build of the app on AWS Amplify and have the QA team test it in desktop browsers before each release."
    ], a: 0,
    no: [null,
      "That's buying, storing and maintaining devices, which the team wants to avoid, for a few days of use a month.",
      "Emulators aren't the 50 real device models, and the team would set up and run the instances and emulators itself.",
      "Desktop browsers don't test the native apps on any of the 50 phone and tablet models."],
    why: "Device Farm runs automated tests in parallel on real, physical Android and iOS devices hosted by AWS, and it also offers remote interactive sessions, so there is no device lab to buy or maintain.",
    doc: ["https://docs.aws.amazon.com/devicefarm/latest/developerguide/welcome.html"] },

  { id: "saa-4-304", exam: "SAA", saa: "4.2", topic: "sagemaker", type: "mc",
    q: "A company hosts a fraud-scoring model on a SageMaker AI real-time endpoint backed by an instance that runs around the clock. The model gets a few hundred requests a day in unpredictable bursts with long idle periods. Callers can tolerate an occasional cold start but need the score in the same response. Which solution is the MOST cost-effective?",
    opts: [
      "Redeploy the model to a SageMaker AI Serverless Inference endpoint, which scales to zero when no requests arrive.",
      "Move the endpoint to a smaller instance type and buy a SageMaker Savings Plan to cover a year of steady usage.",
      "Deploy the model to a SageMaker AI Asynchronous Inference endpoint and have the callers poll S3 for the scores.",
      "Run a SageMaker AI batch transform job every hour that scores all the requests received during the last hour."
    ], a: 0,
    no: [null,
      "It still pays for an instance through every idle hour.",
      "Callers need the score in the same response, but asynchronous inference delivers results later through S3.",
      "An hourly batch can't return a score in the same response."],
    why: "Serverless Inference launches compute only when requests arrive and scales the endpoint down to zero when idle, with pay-per-use pricing. It suits infrequent or unpredictable traffic that can tolerate cold starts.",
    doc: ["https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html"] },

  { id: "saa-4-305", exam: "SAA", saa: "4.4", topic: "polly", type: "mc",
    q: "A language-learning app plays about 2,000 fixed example sentences as audio. Each time a user taps a sentence, the app calls Amazon Polly SynthesizeSpeech, and millions of taps a month make Polly most of the bill. Users are worldwide and want fast playback. Which solution is the MOST cost-effective?",
    opts: [
      "Synthesize each sentence once, store the audio files in S3, and serve them to users through an Amazon CloudFront distribution.",
      "Switch the calls from SynthesizeSpeech to StartSpeechSynthesisTask so that Polly bills the requests as batch tasks instead.",
      "Cache the Polly responses in an Amazon ElastiCache cluster in one Region and have the app read each sentence's audio from that cache.",
      "Move the app servers to a larger instance type so that each SynthesizeSpeech call finishes faster and so costs less money."
    ], a: 0,
    no: [null,
      "Polly bills for the text synthesized in either mode, so asynchronous tasks still pay for every repeat of the same sentence.",
      "It cuts Polly calls, but a cluster that runs all the time costs more than S3 and serves distant users slowly.",
      "Polly charges for the text synthesized, not for how fast the call returns."],
    why: "Polly charges for the text you synthesize, and you can cache and replay its generated speech at no additional cost. Synthesizing each fixed sentence once and serving the files from S3 through CloudFront edge caches removes the repeat charges and speeds playback worldwide.",
    doc: ["https://docs.aws.amazon.com/polly/latest/dg/what-is.html"] }
);
