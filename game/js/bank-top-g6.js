// Question bank batch: replacements for dropped duplicates (Lambda stream record age, local tests of container image
// functions, IAM Access Analyzer unused access, Cognito threat protection). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // DVA Domain 1: Development with AWS Services
  { id: "dva-1-331", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A Lambda function reads a Kinesis data stream of vehicle positions through an event source mapping with default settings and updates a live map. When a downstream API is down, the function returns errors and Lambda keeps retrying the same batches, so the map falls hours behind. Positions older than 5 minutes are useless to the map, but a failing batch that is newer than that must keep being retried, however many attempts that takes. Details of every discarded batch must be recorded for auditing. What should the developer do?",
    opts: [
      "Set MaximumRecordAgeInSeconds to 300 on the event source mapping, and add an on-failure destination for discarded batches.",
      "Set MaximumRetryAttempts to 5 on the event source mapping, and add an on-failure destination for the discarded batches.",
      "Lower the stream's data retention period to 5 minutes, so that old records expire before the function can fall far behind.",
      "Turn on BisectBatchOnFunctionError for the event source mapping, so that Lambda splits each failing batch and moves past it."
    ],
    a: 0,
    no: [null,
      "A retry count limits retries by number, not by age, so a batch that is still fresh could be discarded after five quick failures.",
      "A Kinesis stream keeps records for at least 24 hours, so this can't be set, and records that expire leave no audit details.",
      "Splitting a batch helps isolate one bad record, but when the downstream API is down every half fails too, and retries continue."
    ],
    why: "For stream sources, MaximumRecordAgeInSeconds makes Lambda stop retrying and discard records once they are older than the set age (the default, -1, never discards them). An on-failure destination receives details of each discarded batch, so the skipped records can be audited.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-kinesis-parameters.html", "https://docs.aws.amazon.com/lambda/latest/dg/kinesis-on-failure-destination.html"] },

  { id: "dva-1-332", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A developer packages a Python Lambda function as a container image built from the AWS base image for Python. Before pushing the image to Amazon ECR, the developer wants to send JSON test events to the function on a laptop that has only Docker installed, without the SAM CLI or any other tool, and see the handler's response. What should the developer do?",
    opts: [
      "Run the image with docker run -p 9000:8080, and POST each event to localhost:9000/2015-03-31/functions/function/invocations.",
      "Push the image to Amazon ECR, create a function from it, and send each test event to that function with aws lambda invoke.",
      "Rebuild the image from an AWS OS-only base image, the only kind of Lambda base image that includes the runtime interface emulator.",
      "Run sam local invoke on the function's image with each event file, so that SAM starts the container and passes the event in."
    ],
    a: 0,
    no: [null,
      "This deploys the function to AWS, but the developer wants to test the image on the laptop before it is pushed to ECR.",
      "AWS base images for Python already include the runtime interface emulator, so no rebuild is needed to test locally.",
      "This needs the SAM CLI, which the developer doesn't want to install or use for these tests."
    ],
    why: "AWS base images include the Lambda runtime interface emulator. Running the image with docker run exposes a local endpoint at /2015-03-31/functions/function/invocations, and a POST of the event JSON to it runs the handler and returns its response.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/python-image.html"] },

  // SAA Domain 1: Design Secure Architectures
  { id: "saa-1-231", exam: "SAA", saa: "1.1", topic: "iam", type: "mc",
    q: "A company has 50 accounts in AWS Organizations. To move toward least privilege, the security team wants a central, continuously updated list across all accounts of IAM roles not used in the last 90 days, IAM user access keys and passwords not used in that time, and services and actions that active roles are allowed but never use. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Create an IAM Access Analyzer unused access analyzer for the organization, with a 90-day tracking period, in the delegated administrator account.",
      "Create an IAM Access Analyzer external access analyzer with the organization as its zone of trust, in the delegated administrator account.",
      "Deploy the AWS Config managed rule iam-user-unused-credentials-check to every account with a 90-day limit, through an organization conformance pack.",
      "Generate an IAM credential report in each account every week with a scheduled script, and merge the reports into one file in a central S3 bucket."
    ],
    a: 0,
    no: [null,
      "An external access analyzer finds resources shared with principals outside the zone of trust. It doesn't report unused roles or permissions.",
      "This rule checks only IAM users' passwords and access keys, so it misses unused roles and unused permissions on active roles.",
      "Credential reports list IAM users and their credentials only, not roles or permissions, and the script is custom work to maintain."
    ],
    why: "An unused access analyzer continuously monitors IAM roles and users across the organization and reports unused roles, unused access keys and passwords, and unused services and actions for active principals, over a tracking period of 1 to 365 days.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-create-unused.html", "https://docs.aws.amazon.com/IAM/latest/UserGuide/what-is-access-analyzer.html"] },

  { id: "saa-1-232", exam: "SAA", saa: "1.2", topic: "cognito", type: "multi", hint: "Select TWO.",
    q: "A consumer app signs users in through an Amazon Cognito user pool on the Essentials feature plan, with the USER_PASSWORD_AUTH flow. Many users reuse passwords from other sites. The company must block sign-ins that use passwords found in public leaks, and must ask for MFA only when a sign-in looks risky, such as one from a new device or location. It doesn't want to write custom authentication code. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Change the user pool to the Plus feature plan, which is the plan that includes Cognito threat protection.", ok: true },
      { t: "Turn on threat protection in full-function mode, with compromised credentials blocking and adaptive authentication.", ok: true },
      { t: "Turn on threat protection in audit-only mode, so that Cognito scores the risk of each sign-in and acts on that score.", ok: false, no: "Audit-only mode only logs risk levels and publishes metrics. It takes no action, such as blocking or requiring MFA." },
      { t: "Set the user pool's MFA setting to Required, so that every user must enter a second factor each time they sign in.", ok: false, no: "This asks for MFA at every sign-in rather than only risky ones, and it doesn't block passwords found in leaks." },
      { t: "Associate an AWS WAF web ACL with the user pool, with a rate-based rule that limits sign-in requests from each IP address.", ok: false, no: "A rate limit slows high-volume attacks, but it doesn't check passwords against leaks or judge the risk of a single sign-in." }
    ],
    why: "Cognito threat protection, part of the Plus feature plan, compares credentials in username-password flows with public leaks and can block those sign-ins, and its adaptive authentication scores each sign-in's risk and can require MFA at the risk levels you choose. Both act only in full-function mode.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-threat-protection.html", "https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-adaptive-authentication.html"] }
);
