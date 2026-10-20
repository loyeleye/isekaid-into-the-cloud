// Question bank batch: SAA-C03 Domain 2 (Design Resilient Architectures), tasks 2.1 and 2.2. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 2.1: scalable, loosely coupled architectures
  { id: "saa-2-101", exam: "SAA", saa: "2.1", topic: "mq", type: "mc",
    q: "A company is moving an on-premises order system to AWS. Its services exchange messages through an Apache ActiveMQ broker, using JMS over the OpenWire and STOMP protocols. The company wants a managed broker that survives the loss of an Availability Zone, and it must not change the messaging code in the services. Which solution meets these requirements?",
    opts: [
      "Create an Amazon MQ for ActiveMQ active/standby broker, and point the services at its endpoints.",
      "Create Amazon SQS queues for each destination, and replace the broker connections with SQS API calls.",
      "Create Amazon SNS topics for each destination, and subscribe each consuming service over HTTPS.",
      "Create an Amazon Kinesis data stream for each destination, and have the services read it with the KCL."
    ], a: 0,
    no: [null,
      "SQS has its own API and doesn't speak OpenWire or STOMP, so every service's messaging code would change.",
      "SNS is a push service with its own API, so the services would have to be rewritten to use it.",
      "Kinesis is a streaming service with its own API and client library, which means rewriting the messaging code."],
    why: "Amazon MQ runs managed ActiveMQ and RabbitMQ brokers that speak the standard protocols the services already use, so existing messaging code moves without a rewrite. An active/standby broker is a redundant pair in two Availability Zones.",
    doc: ["https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/welcome.html", "https://docs.aws.amazon.com/amazon-mq/latest/developer-guide/amazon-mq-broker-architecture.html"] },

  { id: "saa-2-102", exam: "SAA", saa: "2.1", topic: "autoscaling", type: "mc",
    q: "Worker EC2 instances in an Auto Scaling group poll an Amazon SQS queue and process image jobs. Each instance finishes about 20 jobs a minute, and every job must start within roughly 5 minutes of arriving. Scaling on CPU utilization reacts too late during bursts and adds too many instances while the queue drains. How should a solutions architect scale the group?",
    opts: [
      "Use target tracking on backlog per instance (visible messages / InService instances), with a target of 100.",
      "Use target tracking on the queue's ApproximateNumberOfMessagesVisible metric alone, with a target value of 100.",
      "Use a scheduled action that doubles the group's desired capacity on weekdays during the hours bursts usually occur.",
      "Move the workers to a larger instance type, and keep the CPU target tracking policy with a lower target value."
    ], a: 0,
    no: [null,
      "A target on queue length alone ignores how many instances are already working, so it can add more instances than needed.",
      "Bursts don't follow a schedule, so capacity is wrong whenever traffic doesn't match the calendar.",
      "Bigger instances still scale on CPU, which only rises after the jobs have piled up."],
    why: "Backlog per instance measures the work waiting for each worker, so the group grows and shrinks in proportion to the queue. The target is the acceptable latency divided by the time per job: 300 s / 3 s = 100 messages per instance.",
    doc: ["https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html"] },

  { id: "saa-2-103", exam: "SAA", saa: "2.1", topic: "eventbridge", type: "mc",
    q: "A company uses a SaaS help-desk application that is a supported Amazon EventBridge partner. Ticket-created, ticket-escalated and ticket-closed events must each start a different Lambda function, based on a field in the event. The company does not want to build or run any code that receives or polls for the events. Which solution meets these requirements?",
    opts: [
      "Associate the partner event source with an event bus, and add rules whose patterns route each type to its function.",
      "Create an SNS topic, build a webhook receiver that publishes the events to it, and filter each subscription by event type.",
      "Run a scheduled Lambda function every minute that polls the help-desk API and invokes the right function for each event.",
      "Send the events to a Kinesis data stream, and have one consumer read every record and call the matching function itself."
    ], a: 0,
    no: [null,
      "The webhook receiver is exactly the custom receiving code the company wants to avoid.",
      "That is polling code the company would have to build and run, and it adds up to a minute of delay.",
      "Getting events into the stream needs custom code, and the dispatching consumer is more code to run."],
    why: "EventBridge receives events from supported SaaS partners on a partner event bus. Rules match event patterns against the event's content and send matching events to targets such as Lambda functions.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-saas.html", "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rules.html"] },

  { id: "saa-2-104", exam: "SAA", saa: "2.1", topic: "transfer", type: "mc",
    q: "Dozens of external partners upload nightly CSV files to a company's on-premises SFTP server, using their own SFTP clients and SSH keys. The company wants the files to land in Amazon S3 for processing, without asking partners to change their clients. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Create a Transfer Family SFTP server that stores files in an S3 bucket, and add each partner's SSH public key.",
      "Run OpenSSH on EC2 instances in an Auto Scaling group, and sync the upload directory to the S3 bucket every few minutes.",
      "Give each partner an IAM user with access keys, and ask them to upload their files with the AWS CLI s3 cp command.",
      "Deploy an AWS DataSync agent at each partner's site, and schedule tasks that copy the partners' files to the S3 bucket."
    ], a: 0,
    no: [null,
      "It works, but the company patches and scales the servers and runs the sync itself.",
      "Partners would have to change their tools, and long-lived access keys would be handed to outsiders.",
      "Each partner would have to install and run an agent, which changes how they deliver files."],
    why: "Transfer Family is a fully managed SFTP endpoint that writes directly to S3. Service-managed users authenticate with the SSH public keys the partners already use, so their clients don't change.",
    doc: ["https://docs.aws.amazon.com/transfer/latest/userguide/what-is-aws-transfer-family.html", "https://docs.aws.amazon.com/transfer/latest/userguide/service-managed-users.html"] },

  { id: "saa-2-105", exam: "SAA", saa: "2.1", topic: "cloudfront", type: "multi", hint: "Select TWO.",
    q: "A news site serves pages from EC2 instances behind an Application Load Balancer in one Region. Images, CSS and JavaScript files make up most of the traffic, readers are spread around the world, and the instances are overloaded at peak. The company wants lower latency for distant readers and less load on the instances. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Move the static files to an S3 bucket, and keep Block Public Access turned on for the bucket.", ok: true },
      { t: "Create a CloudFront distribution with the bucket as an origin that uses origin access control.", ok: true },
      { t: "Put AWS Global Accelerator in front of the load balancer, so readers reach the Region over the AWS network.", ok: false, no: "Global Accelerator improves the network path but caches nothing, so the instances still serve every file." },
      { t: "Add an ElastiCache cluster, and have the web servers cache the static files in memory before serving them.", ok: false, no: "The instances still serve every byte from one Region, so distant readers see no improvement." },
      { t: "Scale the instances up to a larger instance type, so that each one can serve more static files at peak.", ok: false, no: "Bigger instances ease the load but are still far from distant readers." }
    ],
    why: "CloudFront caches the static files at edge locations near readers, which cuts latency and keeps those requests off the instances. Origin access control lets only CloudFront read the private bucket.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html", "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html"] },

  { id: "saa-2-106", exam: "SAA", saa: "2.1", topic: "ecs", type: "multi", hint: "Select TWO.",
    q: "A company has packaged a monolithic Java web app as a Docker image and wants to run it on AWS behind an Application Load Balancer. The operations team is small and does not want to patch, scale or manage any servers or cluster nodes. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Push the image to a private repository in Amazon Elastic Container Registry.", ok: true },
      { t: "Run the image as an Amazon ECS service on AWS Fargate, registered with the load balancer's target group.", ok: true },
      { t: "Run the image as an Amazon ECS service on an EC2 capacity provider backed by an Auto Scaling group.", ok: false, no: "The team would patch and manage the EC2 container instances." },
      { t: "Create an Amazon EKS cluster with self-managed node groups, and run the image as a Deployment.", ok: false, no: "Self-managed nodes are servers the team must patch and scale." },
      { t: "Launch EC2 instances from an AMI that has Docker installed, and start the container from user data.", ok: false, no: "The team would own every instance's patching and scaling." }
    ],
    why: "ECR stores the image privately, and ECS on Fargate runs the containers without any servers or cluster capacity for the team to manage. The ECS service registers each task with the target group.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html", "https://docs.aws.amazon.com/AmazonECR/latest/userguide/what-is-ecr.html"] },

  { id: "saa-2-107", exam: "SAA", saa: "2.1", topic: "eks", type: "mc",
    q: "A company runs dozens of microservices on a self-managed Kubernetes cluster in its data center and deploys them with Helm charts and kubectl. It wants to move to AWS without rewriting its manifests or changing its tools, and it no longer wants to run the Kubernetes control plane itself. Which solution meets these requirements?",
    opts: [
      "Create an Amazon EKS cluster with managed node groups, and deploy the existing Helm charts to it.",
      "Convert each Kubernetes manifest into an Amazon ECS task definition, and run the services on AWS Fargate.",
      "Install Kubernetes on EC2 instances with kubeadm, and run the control plane on three instances in different AZs.",
      "Deploy each microservice to its own AWS Elastic Beanstalk environment, and connect them with environment variables."
    ], a: 0,
    no: [null,
      "Every manifest would be rewritten, and the team's Kubernetes tools wouldn't work with ECS.",
      "The company would still run and upgrade the control plane itself.",
      "That abandons Kubernetes, so the manifests and tools no longer apply."],
    why: "Amazon EKS runs a managed, certified Kubernetes-conformant control plane, so existing manifests, Helm charts and kubectl work without refactoring.",
    doc: ["https://docs.aws.amazon.com/eks/latest/userguide/what-is-eks.html"] },

  { id: "saa-2-108", exam: "SAA", saa: "2.1", topic: "elb", type: "mc",
    q: "A company is splitting a monolith into three containerized services on Amazon ECS that handle /orders, /users and /search. Clients must keep using a single HTTPS hostname, and each service must scale on its own. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Use one Application Load Balancer with a target group per service, and a path-based listener rule for each.",
      "Use one Network Load Balancer with a listener per service on a different port, and give clients the port for each path.",
      "Run NGINX reverse proxies on EC2 instances in front of the services, and configure a location block for each path.",
      "Create one Application Load Balancer per service, and use Route 53 weighted records to split the hostname among them."
    ], a: 0,
    no: [null,
      "A Network Load Balancer works at the connection level and can't route by path, and clients would have to change.",
      "It works, but the company runs, patches and scales the proxy fleet.",
      "Weighted records split traffic by percentage, not by path, so requests reach the wrong service."],
    why: "Application Load Balancer listener rules can match path patterns and forward each to its own target group. Each ECS service registers its tasks there and scales independently.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-condition-types.html"] },

  { id: "saa-2-109", exam: "SAA", saa: "2.1", topic: "stepfunctions", type: "mc",
    q: "An order pipeline is made of four Lambda functions, each of which invokes the next one directly. When a payment API fails briefly, orders are lost, and the team can't tell where a given order stopped. The company wants retries with backoff, a failure path that alerts staff, and a per-order history, with the least custom code. What should a solutions architect do?",
    opts: [
      "Orchestrate the functions with Step Functions, using Retry with backoff and a Catch that goes to an alert state.",
      "Add try/catch blocks and a sleep-based retry loop to each function, and record each order's progress in a DynamoDB table.",
      "Invoke each function asynchronously with two automatic retries, and log every step of every order to CloudWatch Logs.",
      "Put an SQS queue between each pair of functions, with a redrive policy that moves failed messages to a dead-letter queue."
    ], a: 0,
    no: [null,
      "It works, but it is the custom retry and tracking code the company wants to avoid, and the sleeps are billed.",
      "The chain stays hard-wired, and logs give no single view of where each order stopped.",
      "Queues keep failed messages, but there is no per-order history or alert path without more code."],
    why: "Step Functions records the history of every execution, so each order's path is visible. Retry fields set the attempts and backoff rate, and Catch sends errors that remain to a fallback state.",
    doc: ["https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html"] },

  { id: "saa-2-110", exam: "SAA", saa: "2.1", topic: "sqs", type: "mc",
    q: "A trading app publishes account events, such as deposits, withdrawals and transfers, that a fleet of consumers applies to balances. Events for the same account must be applied in the order they were sent, and a duplicate sent a minute later must not be applied twice. Events for different accounts should be processed in parallel. Which solution meets these requirements?",
    opts: [
      "Send the events to an SQS FIFO queue, with the account ID as the message group ID and deduplication turned on.",
      "Send the events to an SQS standard queue, and have each consumer sort its batch of messages by timestamp first.",
      "Send the events to an SQS FIFO queue, with one fixed message group ID that every producer uses for every event.",
      "Publish the events to an SNS standard topic, and subscribe each consumer to the topic with an HTTPS endpoint."
    ], a: 0,
    no: [null,
      "Standard queues give best-effort ordering and at-least-once delivery, and sorting one batch can't fix order across batches.",
      "A single message group is processed one message at a time, so accounts can't be processed in parallel.",
      "A standard topic doesn't keep order or remove duplicates, and every consumer gets every event."],
    why: "In a FIFO queue, messages in the same message group are processed one at a time in order, while different groups are processed in parallel. Messages with the same deduplication ID within the 5-minute interval are delivered only once.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-key-terms.html"] },

  { id: "saa-2-111", exam: "SAA", saa: "2.1", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A company exposes product data to partner companies through an API Gateway REST API backed by Lambda. Most requests are identical GET calls whose responses change about once an hour. Each partner must be held to its contracted request rate, and Lambda costs must drop. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Enable API caching on the stage, and set the cache TTL to match how often the data changes.", ok: true },
      { t: "Create usage plans with throttling limits, and give each partner an API key associated with its plan.", ok: true },
      { t: "Set reserved concurrency on the function to cap how many partner requests can run at the same time.", ok: false, no: "It caps all partners together, not each one, and every request still invokes the function." },
      { t: "Turn on provisioned concurrency for the function, so that repeated requests are answered faster.", ok: false, no: "It removes cold starts and adds cost. Every request still invokes the function." },
      { t: "Put an SQS queue between API Gateway and the function, so that bursts are buffered before processing.", ok: false, no: "Callers of a GET need the data in the response, which a queue can't return." }
    ],
    why: "The stage cache answers repeated requests without calling Lambda for the TTL, up to an hour. Usage plans identify each partner by API key and throttle it to its own limits.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-caching.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html"] },

  { id: "saa-2-112", exam: "SAA", saa: "2.1", topic: "aurora", type: "multi", hint: "Select TWO.",
    q: "An app on Aurora PostgreSQL has a single writer instance. Read traffic from a reporting dashboard varies widely through the day and is slowing the app's writes. The company wants read capacity that grows and shrinks with demand, without changing the dashboard's connection settings as capacity changes. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Add an Aurora Auto Scaling policy that adds and removes Aurora Replicas based on average reader CPU.", ok: true },
      { t: "Point the dashboard's read-only connections at the cluster's reader endpoint.", ok: true },
      { t: "Point the dashboard at the cluster endpoint, so that Aurora spreads its queries across all instances.", ok: false, no: "The cluster endpoint always connects to the writer, so the reads stay on it." },
      { t: "Scale the writer up to a larger instance class each morning, and back down each night, on a schedule.", ok: false, no: "Each class change briefly interrupts the database, and reads still compete with writes on one instance." },
      { t: "Put an ElastiCache cluster in front of the database, and cache every dashboard query result for 24 hours.", ok: false, no: "The dashboard would show day-old data, and the caching logic must be written into the app." }
    ],
    why: "Aurora Auto Scaling adjusts the number of Aurora Replicas to match load. The reader endpoint balances connections across the available replicas, including new ones, so connection settings never change.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Integrating.AutoScaling.html", "https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.Endpoints.html"] },

  { id: "saa-2-113", exam: "SAA", saa: "2.1", topic: "elasticache", type: "mc",
    q: "A product catalog page runs the same complex join query against an RDS for MySQL database thousands of times a minute. The query takes about 2 seconds, the results may be up to 5 minutes old, and the page must load in under 100 ms. Which solution meets these requirements?",
    opts: [
      "Add an ElastiCache cluster, cache the query results with lazy loading, and set a 5-minute TTL on each key.",
      "Create two RDS read replicas, and send the catalog query to them through a round-robin DNS record in Route 53.",
      "Convert the DB instance to a Multi-AZ DB instance deployment, so that the standby takes part of the read load.",
      "Put RDS Proxy in front of the database, so that connections are pooled and reused across the catalog requests."
    ], a: 0,
    no: [null,
      "Replicas spread the load, but each query still takes about 2 seconds.",
      "In a Multi-AZ DB instance deployment, the standby serves no reads.",
      "Pooling saves connection setup time, not the 2 seconds the query itself takes."],
    why: "With lazy loading, a cache miss runs the query once and stores the result, and later reads come from memory in well under a millisecond. The TTL bounds how stale a result can be.",
    doc: ["https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html"] },

  { id: "saa-2-114", exam: "SAA", saa: "2.1", topic: "s3", type: "mc",
    q: "A photo-sharing app runs on EC2 instances in an Auto Scaling group behind an Application Load Balancer. Uploaded photos are saved on the receiving instance's EBS root volume, so photos go missing when a later request lands on another instance, and they are lost when instances are replaced. Which solution lets the web tier scale freely?",
    opts: [
      "Have the app write uploads to an S3 bucket and read them from there, so that no photo is stored on any instance.",
      "Turn on sticky sessions for the target group, so that each user keeps reaching the instance that holds their photos.",
      "Attach one io2 EBS volume to every instance with Multi-Attach, and save the photos to it with an ext4 file system.",
      "Set the group's termination policy to OldestInstance, so that the instances holding the most photos last longer."
    ], a: 0,
    no: [null,
      "Other users still can't see those photos, and they are lost when that instance is replaced.",
      "Multi-Attach works only within one Availability Zone, and ext4 isn't built for several instances writing at once.",
      "Instances still fail and get replaced, and other instances still can't see the photos."],
    why: "Storing the files in S3 moves state off the instances, so any instance can serve any request and instances can be added or removed freely.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html", "https://docs.aws.amazon.com/ebs/latest/userguide/ebs-volumes-multi.html"] },

  { id: "saa-2-115", exam: "SAA", saa: "2.1", topic: "kinesis", type: "mc",
    q: "A mobile game sends clickstream events that three teams must each consume on their own: real-time fraud detection, a leaderboard and an analytics loader. Events for each player must be read in order, and a team must be able to reprocess the last day of events after fixing a bug. Which solution meets these requirements?",
    opts: [
      "Use Kinesis Data Streams with the player ID as the partition key, and give each team its own consumer.",
      "Use an SQS standard queue that all three teams poll, with each team deleting the events after it processes them.",
      "Use an SNS standard topic with one subscription for each team's HTTPS endpoint, so each gets events as they arrive.",
      "Use Amazon Data Firehose to deliver the events to an S3 bucket, and have each team read new files every few minutes."
    ], a: 0,
    no: [null,
      "A deleted message is gone for the other teams, and standard queues don't keep order or allow replay.",
      "SNS doesn't keep order and doesn't store events for a team to replay.",
      "Firehose buffers records before delivery, so fraud detection can't act in real time."],
    why: "Records with the same partition key go to the same shard in order, and each consumer reads the stream independently. The default 24-hour retention lets a team re-read the last day.",
    doc: ["https://docs.aws.amazon.com/streams/latest/dev/key-concepts.html"] },

  { id: "saa-2-116", exam: "SAA", saa: "2.1", topic: "sqs", type: "multi", hint: "Select TWO.",
    q: "A REST API in API Gateway invokes a Lambda function synchronously, and the function forwards each request to a partner API that allows at most 50 concurrent calls. During sales spikes, the partner rejects calls and requests fail. Clients need only an acknowledgment that their request was accepted. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Change the API's integration to send each request to an SQS queue and return a success response.", ok: true },
      { t: "Have the function consume the queue through an event source mapping with maximum concurrency set to 50.", ok: true },
      { t: "Turn on provisioned concurrency of 50 for the function, so that it is warm for every request.", ok: false, no: "Provisioned concurrency pre-initializes instances. It doesn't cap concurrency, and cold starts aren't the problem." },
      { t: "Raise the function's timeout and memory, so that each call to the partner has more time to finish.", ok: false, no: "More time per call doesn't limit how many calls run at once." },
      { t: "Publish each request to an SNS topic that invokes the function for every message it receives.", ok: false, no: "SNS pushes every message at once, so the spike still reaches the partner." }
    ],
    why: "The queue absorbs the spike and lets API Gateway acknowledge at once. Maximum concurrency on the SQS event source mapping limits how many function invocations the queue drives at the same time.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-scaling.html"] },

  // Task 2.2: highly available and fault-tolerant architectures
  { id: "saa-2-117", exam: "SAA", saa: "2.2", topic: "route53", type: "multi", hint: "Select TWO.",
    q: "A company runs identical, active copies of its API behind Application Load Balancers in us-east-1, eu-west-1 and ap-southeast-1. Users must reach the Region that gives them the lowest latency, and if a Region's load balancer has no healthy targets, its users must be sent to the next-best Region automatically. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Create one latency alias record per Region for the same name, each pointing to that Region's load balancer.", ok: true },
      { t: "Set Evaluate Target Health to Yes on each of the latency alias records.", ok: true },
      { t: "Create one geolocation record per continent pointing to the nearest load balancer, with no default record.", ok: false, no: "Geolocation routes by location, not measured latency, and with no default record unmapped users get no answer." },
      { t: "Create failover records with us-east-1 as the primary and the other two Regions as secondaries.", ok: false, no: "Failover routing is active-passive with one primary and one secondary, and it ignores latency." },
      { t: "Create multivalue answer records for the three load balancers, each with its own health check.", ok: false, no: "Multivalue answers return healthy values at random, not the lowest-latency Region." }
    ],
    why: "Latency records answer with the Region that has the lowest latency for the user. With Evaluate Target Health, Route 53 skips a Region whose load balancer has no healthy targets and answers with the next-best one.",
    doc: ["https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-latency.html", "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-failover-complex-configs.html"] },

  { id: "saa-2-118", exam: "SAA", saa: "2.2", topic: "route53", type: "multi", hint: "Select TWO.",
    q: "For data residency, a company must send every user located in Europe to its eu-central-1 deployment and every other user to its us-east-1 deployment. Some DNS resolvers' IP addresses can't be mapped to a location, and those users must still get an answer. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Create a geolocation record for the Europe continent that points to the eu-central-1 endpoint.", ok: true },
      { t: "Create a geolocation record for the Default location that points to the us-east-1 endpoint.", ok: true },
      { t: "Create geoproximity records for both Regions, and give the eu-central-1 record a positive bias.", ok: false, no: "Geoproximity routes by distance adjusted by bias, so the boundary doesn't follow Europe's borders." },
      { t: "Create latency records for both Regions, so that European users reach the closer deployment.", ok: false, no: "Latency changes over time, so some European users could be sent to us-east-1." },
      { t: "Create weighted records that send half of all DNS queries to each of the two Regions.", ok: false, no: "Weighted routing splits by percentage and ignores where users are." }
    ],
    why: "Geolocation routing answers based on where the query comes from. The Default record answers for unmapped addresses and for locations without their own record; without it, Route 53 returns no answer.",
    doc: ["https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-geo.html"] },

  { id: "saa-2-119", exam: "SAA", saa: "2.2", topic: "route53", type: "mc",
    q: "A small UDP service runs on six EC2 instances in one Region, each with its own Elastic IP address. The company does not want to pay for a load balancer, but DNS answers must include several instances and must leave out any instance that fails a health check. Which Route 53 configuration meets these requirements?",
    opts: [
      "Create one multivalue answer record per instance, each with its IP address and its own health check.",
      "Create one simple record that lists all six IP addresses, and create a health check for each address in the record.",
      "Create one weighted record per instance with equal weights, and leave the records without any health checks.",
      "Create a CNAME record that points to the public DNS name of whichever instance currently has the most free capacity."
    ], a: 0,
    no: [null,
      "Simple routing returns all the values in random order, and they aren't health checked.",
      "Weighted routing answers with one record per query, and without health checks failed instances keep getting traffic.",
      "It sends everyone to one instance and needs manual changes when that instance fails."],
    why: "With multivalue answer routing, Route 53 answers each query with up to eight healthy records, chosen from the records whose health checks pass.",
    doc: ["https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-multivalue.html", "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-simple.html"] },

  { id: "saa-2-120", exam: "SAA", saa: "2.2", topic: "dr", type: "mc",
    q: "A company runs 40 physical and virtual servers in its data center, a mix of Windows and Linux, with several commercial databases installed on them. It needs disaster recovery on AWS with data loss measured in seconds and recovery in minutes, and it doesn't want to pay for full-size servers on AWS until a disaster. Which solution meets these requirements MOST cost-effectively?",
    opts: [
      "Use AWS Elastic Disaster Recovery to replicate the servers continuously, and launch recovery instances when needed.",
      "Copy nightly image backups of every server to an S3 bucket, and import them as EC2 AMIs when a disaster is declared.",
      "Run a full-size copy of every server on EC2 at all times, and keep the copies in sync with each database's replication.",
      "Use AWS Application Migration Service to copy the servers to AWS once, and repeat the copy at the end of each week."
    ], a: 0,
    no: [null,
      "Up to a day of data is lost, and importing and launching 40 servers takes hours.",
      "It meets the targets but pays for full production capacity all the time.",
      "Application Migration Service is built for a one-time move with a cutover, and weekly copies lose up to a week of data."],
    why: "Elastic Disaster Recovery replicates servers continuously into a staging area that uses low-cost storage and minimal compute, then launches full recovery instances within minutes from the latest state.",
    doc: ["https://docs.aws.amazon.com/drs/latest/userguide/what-is-drs.html"] },

  { id: "saa-2-121", exam: "SAA", saa: "2.2", topic: "dr", type: "mc",
    q: "A web app runs in us-east-1 on EC2 Auto Scaling groups with an Aurora MySQL database. For disaster recovery in us-west-2, the recovery time objective is 10 minutes, and the recovery site must serve some production traffic the moment it is switched over, even before it scales out. Which disaster recovery strategy meets these requirements at the lowest cost?",
    opts: [
      "Warm standby: run a scaled-down but working copy of the stack in us-west-2, and scale it out on failover.",
      "Pilot light: replicate the database to us-west-2, keep the app servers off, and deploy them on failover.",
      "Backup and restore: copy snapshots and AMIs to us-west-2, and rebuild the stack from them on failover.",
      "Multi-site active/active: run the full production stack in both Regions, and split traffic between them."
    ], a: 0,
    no: [null,
      "The recovery site can't serve any traffic until the app servers are deployed and started.",
      "Rebuilding a stack from backups takes hours, and recent data is lost.",
      "It meets the targets but runs full capacity in both Regions, which is the most expensive option."],
    why: "Warm standby keeps a fully working but scaled-down copy running, so it can take traffic at once and then scale out. Pilot light keeps only the core, such as the data, running and can't serve requests until more is deployed.",
    doc: ["https://docs.aws.amazon.com/whitepapers/latest/disaster-recovery-workloads-on-aws/disaster-recovery-options-in-the-cloud.html"] },

  { id: "saa-2-122", exam: "SAA", saa: "2.2", topic: "aurora", type: "mc",
    q: "An Aurora MySQL cluster has a db.r6g.4xlarge writer, a db.r6g.4xlarge replica that serves the app's reads, and a db.r6g.large replica used for nightly reports. During a test failover, Aurora promoted the small reporting replica, and the app slowed badly. How should a solutions architect make sure the large replica is promoted in a future failover?",
    opts: [
      "Set the large replica's failover priority to tier 0 and the reporting replica's priority to tier 15.",
      "Point the app's reads at the reader endpoint, so that a failover always promotes the largest replica.",
      "Turn on Multi-AZ for the writer, so that Aurora adds a same-size standby that is used only for failover.",
      "Move the reporting replica into the writer's Availability Zone, so that it is never chosen for failover."
    ], a: 0,
    no: [null,
      "Endpoints decide where connections go, not which replica is promoted.",
      "Aurora has no separate standby. Its replicas are the failover targets, chosen by priority.",
      "A replica in the writer's AZ can still be promoted. Promotion follows priority, then size."],
    why: "Each Aurora Replica has a failover priority from tier 0 (highest) to tier 15 (lowest), and Aurora promotes the replica in the highest-priority tier. Within a tier, it promotes the largest replica.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html"] },

  { id: "saa-2-123", exam: "SAA", saa: "2.2", topic: "dynamodb", type: "mc",
    q: "A gaming company stores player profiles in a DynamoDB table in us-east-1. It is launching in Europe, and players in both Regions must read and write their profiles with single-digit-millisecond latency. The data must also survive the loss of a whole Region. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Add a replica in eu-west-1 to make the table a global table, and have each Region's app use its local replica.",
      "Enable DynamoDB Streams, and write a Lambda function that copies every change to a second table in eu-west-1.",
      "Migrate the profiles to an Aurora global database, with the primary in us-east-1 and a secondary in eu-west-1.",
      "Enable point-in-time recovery, and copy a backup of the table to eu-west-1 every hour with AWS Backup."
    ], a: 0,
    no: [null,
      "It can work, but the company builds and runs the replication and conflict handling itself.",
      "An Aurora global database has one writer Region, and the move means a migration.",
      "Hourly backups give no local writes in Europe, and a restore takes time."],
    why: "Global tables are multi-active: every replica takes reads and writes locally, and DynamoDB replicates the changes between Regions, so either Region can carry on alone.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html"] },

  { id: "saa-2-124", exam: "SAA", saa: "2.2", topic: "dynamodb", type: "mc",
    q: "A bad deployment wrote corrupt values into thousands of items in a DynamoDB table, and no one noticed for 3 hours. The company wants to be able to recover from mistakes like this to any second within the past few weeks, without scheduling or managing any backup jobs. What should a solutions architect do?",
    opts: [
      "Turn on point-in-time recovery for the table, and restore to a new table from just before a bad change.",
      "Make the table a global table, so that a replica in another Region keeps an untouched copy of every item.",
      "Create an on-demand backup each night from a scheduled Lambda function, and keep the backups for 30 days.",
      "Enable DynamoDB Streams on the table, and treat the stream records as the history for rebuilding items."
    ], a: 0,
    no: [null,
      "Replicas receive the bad writes within seconds, so they hold the same corrupt data.",
      "It's a backup job to schedule and run, and it can only go back to each night's backup.",
      "Stream records are kept for only 24 hours, and rebuilding items from them is custom work."],
    why: "Point-in-time recovery keeps continuous backups with per-second recovery points for up to 35 days, fully managed by DynamoDB. A restore creates a new table.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html", "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html"] },

  { id: "saa-2-125", exam: "SAA", saa: "2.2", topic: "s3", type: "multi", hint: "Select TWO.",
    q: "A company must keep a copy of every new object in a critical S3 bucket in a second Region for disaster recovery. An auditor requires that almost all objects be copied within 15 minutes, with an AWS service level agreement and metrics that show how far behind replication is. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Turn on S3 Versioning for the source bucket and for a destination bucket in the second Region.", ok: true },
      { t: "Add a replication rule on the source bucket that targets that bucket, with S3 Replication Time Control on.", ok: true },
      { t: "Add a Same-Region Replication rule that copies new objects to a second bucket in the source Region.", ok: false, no: "The copy stays in the same Region, so it doesn't survive a Regional outage." },
      { t: "Add an S3 Lifecycle rule that moves new objects to S3 Glacier Flexible Retrieval after 15 minutes.", ok: false, no: "Lifecycle rules change storage classes in the same bucket, and they work in days, not minutes." },
      { t: "Enable S3 Transfer Acceleration on the source bucket, so that the objects reach the other Region faster.", ok: false, no: "Transfer Acceleration speeds up client transfers through edge locations. It copies nothing." }
    ],
    why: "Replication requires versioning on both buckets. S3 Replication Time Control replicates 99.9 percent of new objects within 15 minutes, is backed by an SLA, and turns on replication metrics.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-time-control.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-requirements.html"] },

  { id: "saa-2-126", exam: "SAA", saa: "2.2", topic: "efs", type: "multi", hint: "Select TWO.",
    q: "Linux web servers in an Auto Scaling group across three Availability Zones must read and write the same set of files over NFS. The shared files must stay available if any one Availability Zone fails. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Create an Amazon EFS file system that uses the Regional file system type.", ok: true },
      { t: "Create an EFS mount target in each of the three AZs, and mount the file system through it.", ok: true },
      { t: "Create an Amazon EFS file system that uses the One Zone file system type to lower the cost.", ok: false, no: "A One Zone file system lives in one AZ and goes down with it." },
      { t: "Attach one io2 EBS volume to every server with Multi-Attach, and format it with ext4.", ok: false, no: "Multi-Attach works only within one AZ, and ext4 isn't built for several writers at once." },
      { t: "Create an Amazon FSx for Windows File Server Single-AZ file system, and share it to the servers.", ok: false, no: "It serves SMB for Windows clients, and a Single-AZ file system fails with its AZ." }
    ],
    why: "A Regional EFS file system stores data redundantly across AZs. With a mount target in each AZ, instances in the surviving zones keep using the file system if one AZ fails.",
    doc: ["https://docs.aws.amazon.com/efs/latest/ug/features.html", "https://docs.aws.amazon.com/efs/latest/ug/accessing-fs.html"] },

  { id: "saa-2-127", exam: "SAA", saa: "2.2", topic: "autoscaling", type: "multi", hint: "Select TWO.",
    q: "A company patches its web fleet by logging in to each EC2 instance and running updates, and the instances have drifted apart over time. It wants immutable deployments instead: each release is a new AMI, and the Auto Scaling group must roll it out without dropping below 90 percent of its healthy capacity. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Create a new launch template version that uses the new AMI, and use it as the group's desired configuration.", ok: true },
      { t: "Start an instance refresh on the group with a minimum healthy percentage of 90.", ok: true },
      { t: "Use Systems Manager Run Command to install the updates on every running instance at once.", ok: false, no: "That still changes instances in place, which is what causes the drift." },
      { t: "Set the group's desired capacity to zero, then set it back once the new AMI is in place.", ok: false, no: "Capacity drops to zero, which is a full outage." },
      { t: "Turn on scale-in protection for the old instances, so that they stay while new ones launch.", ok: false, no: "Protection only stops instances from being removed. It doesn't replace them with the new AMI." }
    ],
    why: "An instance refresh replaces instances with ones built from the new launch template version, a few at a time. The minimum healthy percentage keeps enough healthy capacity in service during the rollout.",
    doc: ["https://docs.aws.amazon.com/autoscaling/ec2/userguide/asg-instance-refresh.html", "https://docs.aws.amazon.com/autoscaling/ec2/userguide/instance-refresh-overview.html"] },

  { id: "saa-2-128", exam: "SAA", saa: "2.2", topic: "autoscaling", type: "mc",
    q: "Instances in an Auto Scaling group write application logs to local disk and upload them to S3 once an hour. When the group scales in, the logs written since the last upload are lost. The company needs every instance to upload its remaining logs before it is terminated. What should a solutions architect do?",
    opts: [
      "Add a termination lifecycle hook, upload the logs while the instance waits, then complete the lifecycle action.",
      "Turn on scale-in protection for every instance in the group, so that no instance is terminated while it still has logs.",
      "Increase the group's default cooldown period, so that instances have more time to upload their logs before scale-in.",
      "Change the group's termination policy to OldestInstance, so that instances that uploaded more logs are removed first."
    ], a: 0,
    no: [null,
      "The group could never scale in, so it would pay for idle capacity.",
      "A cooldown delays the next scaling activity. It doesn't pause an instance that is being terminated.",
      "Whichever instance is removed still loses the logs written since its last upload."],
    why: "A termination lifecycle hook pauses the instance in a wait state before it is terminated, so a script or Lambda function can copy off its logs and then complete the lifecycle action.",
    doc: ["https://docs.aws.amazon.com/autoscaling/ec2/userguide/lifecycle-hooks.html"] },

  { id: "saa-2-129", exam: "SAA", saa: "2.2", topic: "quotas", type: "multi", hint: "Select TWO.",
    q: "A company's disaster recovery plan launches 400 vCPUs of On-Demand EC2 capacity in us-west-2 if us-east-1 fails. A recovery test failed because launches in us-west-2 hit the account's vCPU quota, which had been raised only in us-east-1. The company wants to fix this and to be warned early about future quota problems. Which steps should a solutions architect take? (Select TWO.)",
    items: [
      { t: "Request an increase of the On-Demand vCPU quota in us-west-2 through Service Quotas, sized for the recovery fleet.", ok: true },
      { t: "Create CloudWatch alarms on the quota usage metrics, so the team is warned as usage nears each quota.", ok: true },
      { t: "Rely on EC2 Auto Scaling to raise the vCPU quota automatically when the recovery group launches more instances.", ok: false, no: "Auto Scaling can't change quotas. Its launches simply fail at the limit." },
      { t: "Launch the recovery fleet as Spot Instances, which don't count against any of the account's vCPU quotas.", ok: false, no: "Spot Instances have their own vCPU quotas, and Spot capacity can be interrupted in a disaster." },
      { t: "Create the same IAM policies in us-west-2 as in us-east-1, so that the raised quota carries over to it.", ok: false, no: "IAM is global and has nothing to do with service quotas, which are set per Region." }
    ],
    why: "Most service quotas apply per Region, so a recovery Region needs its own increases before a disaster. Service Quotas works with CloudWatch alarms that fire as usage nears a quota value.",
    doc: ["https://docs.aws.amazon.com/servicequotas/latest/userguide/intro.html", "https://docs.aws.amazon.com/servicequotas/latest/userguide/configure-cloudwatch.html"] },

  { id: "saa-2-130", exam: "SAA", saa: "2.2", topic: "ec2", type: "mc",
    q: "A legacy licensing server runs on a single EC2 instance with EBS volumes. Its vendor license is tied to the instance ID and private IP address, the software can't be modified, and only one copy may run. The company wants the server to come back on its own if the underlying host hardware fails. What should a solutions architect do?",
    opts: [
      "Use EC2 automatic recovery, or add a CloudWatch alarm with the recover action on the system status check.",
      "Put the instance in an Auto Scaling group with a minimum and maximum of one, so a failed instance is replaced.",
      "Enable hibernation on the instance, so that its memory state is saved and restored after a hardware failure.",
      "Take hourly EBS snapshots, and launch a new instance from the latest snapshot whenever the instance fails."
    ], a: 0,
    no: [null,
      "The replacement is a new instance with a new instance ID and private IP address, which breaks the license.",
      "Hibernation is a stop you start yourself. It does nothing when the host fails.",
      "It is manual, and the new instance has a new ID and IP address."],
    why: "Automatic recovery moves the instance to new hardware when a system status check fails, and keeps its instance ID, private and Elastic IP addresses, metadata and attached EBS volumes.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-recover.html"] },

  { id: "saa-2-131", exam: "SAA", saa: "2.2", topic: "rds", type: "mc",
    q: "A Java app on EC2 connects to an RDS for MySQL Multi-AZ DB instance. During failovers, the app's connections break and users see errors until the new DNS answer is picked up. The company wants failovers to disrupt the app less, without changing application code beyond its database endpoint. Which solution meets these requirements?",
    opts: [
      "Create an RDS Proxy for the DB instance, and change the app's database endpoint to the proxy's endpoint.",
      "Add a read replica in another Availability Zone, and point the app at it during each maintenance window.",
      "Move the DB instance to a larger instance class with more memory, so that each failover completes faster.",
      "Put a Network Load Balancer in front of the primary and the standby, and point the app at the load balancer."
    ], a: 0,
    no: [null,
      "A read replica can't take the app's writes, and switching to it is a manual step.",
      "A bigger instance doesn't change how clients find the new primary after a failover.",
      "The standby can't be reached or used until it is promoted, and the load balancer can't follow the primary role."],
    why: "RDS Proxy sits between the app and the database. On a Multi-AZ failover it connects to the new primary without dropping idle client connections, so the app doesn't wait on DNS changes.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-proxy.howitworks.html"] },

  { id: "saa-2-132", exam: "SAA", saa: "2.2", topic: "fsx", type: "mc",
    q: "A Windows app runs on EC2 instances in two Availability Zones and stores shared documents on an SMB file share that is joined to Active Directory. The share is hosted on a single Windows file server instance today. The company wants a managed file share that keeps working if an Availability Zone fails. Which solution meets these requirements?",
    opts: [
      "Create an Amazon FSx for Windows File Server Multi-AZ file system, and move the share to it.",
      "Create an Amazon FSx for Windows File Server Single-AZ file system in the busier of the two AZs.",
      "Create an Amazon EFS file system with mount targets in both AZs, and mount it on the Windows instances.",
      "Create an Amazon FSx for Lustre file system, and mount it in both AZs as the app's document share."
    ], a: 0,
    no: [null,
      "A Single-AZ file system becomes unavailable if its AZ fails.",
      "EFS uses NFS and isn't supported on Windows instances.",
      "FSx for Lustre is a high-performance file system for Linux clients, not an SMB share."],
    why: "A Multi-AZ FSx for Windows File Server file system keeps a standby file server in a second AZ and fails over to it automatically if the preferred server's AZ has an outage.",
    doc: ["https://docs.aws.amazon.com/fsx/latest/WindowsGuide/high-availability-multiAZ.html", "https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html"] }
);
