// Question bank batch: points the second half of chapter 2 teaches that the bank had no question on (SQS system
// attributes such as SentTimestamp and ApproximateReceiveCount, a maxReceiveCount of 1, CloudTrail data events for
// SQS, the CloudWatch metrics that catch a dead-letter queue filling or readers falling behind, keeping events for a
// later EventBridge replay, and Transfer Family's custom identity providers). First written for the Dead Letter
// Office and the Inquisition's Tower, then worded here without the story. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 1.1: Develop code for applications hosted on AWS
  { id: "dva-1-670", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc",
    q: "An audit tool reads messages from an SQS standard queue. Many messages have been received several times by consumers that crashed before deleting them. For each message, the tool must record the time the queue first accepted it from the producer, however many receives came later. Which value should it read?",
    opts: [
      "The SentTimestamp system attribute, which SQS sets when it accepts the message and never changes on a receive.",
      "The ApproximateFirstReceiveTimestamp system attribute, which SQS sets when it accepts the message from a producer.",
      "The time of the receive call itself, taken from the consumer's own clock as soon as ReceiveMessage returns it.",
      "The ApproximateReceiveCount system attribute, which counts the seconds that have passed since the message was sent."
    ], a: 0,
    no: [
      null,
      "That's when a consumer first received the message, which can be much later than when it was sent.",
      "The consumer's clock says when this receive happened, not when the producer sent the message.",
      "ApproximateReceiveCount counts how many times the message has been received, not seconds."],
    why: "SentTimestamp is the time, in epoch milliseconds, at which SQS accepted the message. Receiving the message again changes ApproximateReceiveCount but never SentTimestamp. ApproximateFirstReceiveTimestamp is the first receive, not the send.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html", "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-metadata.html"] },

  { id: "dva-1-671", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc",
    q: "A consumer on EC2 reads an SQS queue that has no dead-letter queue. The team wants the consumer itself to log a warning, and skip a message, when that message has already been delivered five times without being deleted. How should the consumer find out how many times a message has been delivered?",
    opts: [
      "Count deliveries in the consumer's own memory, keyed by MessageId, and reset the counts each time it restarts.",
      "Request the ApproximateReceiveCount system attribute in ReceiveMessage, and read it from each message returned.",
      "Compare the message's SentTimestamp with the current time, and treat each visibility timeout as one delivery.",
      "Read the receipt handle, which SQS lengthens by one segment on every delivery, and count its segments each time."
    ], a: 1,
    no: [
      "Other consumers deliver the same message too, and a restart loses the counts.",
      null,
      "A message can wait in the queue without being received, so elapsed time doesn't count deliveries.",
      "A receipt handle is an opaque token that changes on each receive; its length means nothing."],
    why: "ReceiveMessage can return system attributes when asked for them (AttributeNames or MessageSystemAttributeNames). ApproximateReceiveCount is how many times the message has been received across all consumers, the same count a redrive policy compares with maxReceiveCount.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html"] },

  { id: "dva-1-672", exam: "DVA", dva: "1.1", topic: "sqs", type: "mc",
    q: "A Lambda function reads an SQS queue whose redrive policy has a maxReceiveCount of 1. The function calls a partner API that sometimes fails for a second or two. The team notices that good messages, which would have worked on a second try, keep ending up in the dead-letter queue. What should the developer change?",
    opts: [
      "Lower the queue's visibility timeout to zero, so that each failed message is retried straight away by the function.",
      "Remove the redrive policy from the queue, so that failed messages stay in the source queue until they succeed.",
      "Raise maxReceiveCount to a value such as 5, so that a message gets several tries before it is moved to the DLQ.",
      "Turn on long polling for the queue, so that each message is received only once by the event source mapping."
    ], a: 2,
    no: [
      "A visibility timeout of zero lets other pollers receive messages that are still being processed.",
      "Then a message that always fails would loop forever and never be set aside.",
      null,
      "Long polling changes how empty receives behave. It doesn't stop a message from being received again."],
    why: "With maxReceiveCount set to 1, a message that fails once is moved to the dead-letter queue on its next receive, leaving no room for a passing error. A higher count, such as 3 to 5, gives transient failures a retry while still setting aside messages that always fail.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html", "https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html"] },

  { id: "dva-1-675", exam: "DVA", dva: "1.1", topic: "eventbridge", type: "mc",
    q: "A team runs its order events through a custom EventBridge event bus. After a bad deployment, it wanted to send the last day's events to a fixed rule again, but found there was nothing to replay. It wants to be able to replay any of the last 30 days' events in future incidents. What should the developer set up?",
    opts: [
      "A CloudTrail trail with data events for the bus, so that each event it carried can be replayed later from the logs.",
      "A dead-letter queue on each rule's target, so that every event the bus has delivered is also kept there for 30 days.",
      "Nothing new: start a replay with a 30-day window, since every event bus keeps its events for 30 days automatically.",
      "An archive on the event bus with a 30-day retention period, which keeps every event it receives from now on."
    ], a: 3,
    no: [
      "CloudTrail records API calls such as PutEvents. It can't send events back to the bus as a replay.",
      "A target's DLQ keeps only the events that failed to reach that target.",
      "A bus keeps no events of its own. A replay can only read from an archive.",
      null],
    why: "A replay sends events from an archive back to the bus. An archive keeps the events the bus receives after the archive is created, all of them or those that match its pattern, for the retention period you set or indefinitely.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-archive.html", "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-replay-archived-event.html"] },

  // Task 4.1, 4.2: Root cause analysis; instrumenting code for observability
  { id: "dva-4-673", exam: "DVA", dva: "4.1", topic: "cloudtrail", type: "mc",
    q: "Messages are disappearing from an SQS queue before the expected consumer sees them. The account's trail logs management events only, and it shows no calls on the queue apart from SetQueueAttributes. The team must record which principal receives and deletes messages on the queue from now on. What should the developer do?",
    opts: [
      "Turn on SQS server access logging for the queue, so that every receive and delete is written to an S3 bucket.",
      "Add data events for the queue to a CloudTrail trail, so that ReceiveMessage and DeleteMessage calls are logged.",
      "Turn on CloudTrail Insights for the trail, so that unusual ReceiveMessage activity on the queue is recorded.",
      "Create a CloudWatch alarm on NumberOfMessagesDeleted, so that every delete on the queue is linked to its caller."
    ], a: 1,
    no: [
      "SQS has no server access logging feature; that's an S3 bucket setting.",
      null,
      "Insights looks for unusual rates of management API calls. It doesn't record each data call or its caller.",
      "A metric counts deletes. It never says who made them."],
    why: "SendMessage, ReceiveMessage and DeleteMessage are data events in CloudTrail. They aren't logged by default; a trail (or event data store) must select data events for the queue, and each record then carries the caller's userIdentity.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-logging-using-cloudtrail.html", "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/logging-data-events-with-cloudtrail.html"] },

  { id: "dva-4-674", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc",
    q: "A queue's redrive policy moves messages that keep failing to a dead-letter queue. The team wants to be paged within a couple of minutes whenever any message lands in the dead-letter queue. An alarm on the DLQ's NumberOfMessagesSent metric never fired, even though the DLQ now holds 40 messages. Which alarm should the developer use?",
    opts: [
      "An alarm on the dead-letter queue's ApproximateNumberOfMessagesVisible metric, firing when it is greater than 0.",
      "An alarm on the source queue's NumberOfMessagesSent metric, firing when it rises above its usual daily level.",
      "An alarm on the dead-letter queue's NumberOfMessagesSent metric with a shorter period of 10 seconds instead.",
      "An alarm on the source queue's ApproximateNumberOfMessagesNotVisible metric, firing when it is greater than 0."
    ], a: 0,
    no: [
      null,
      "That measures new messages from producers, not failures.",
      "Messages moved to a DLQ by a redrive policy aren't counted in its NumberOfMessagesSent, so any period stays at 0.",
      "Messages in flight are normal while consumers work; that doesn't mean anything failed."],
    why: "A dead-letter queue should normally be empty, so its ApproximateNumberOfMessagesVisible above 0 means something failed. NumberOfMessagesSent counts only messages sent to a queue directly; messages moved there by a redrive policy don't appear in it.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html", "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/dead-letter-queues-alarms-cloudwatch.html"] },

  { id: "dva-4-676", exam: "DVA", dva: "4.2", topic: "cloudwatch", type: "mc",
    q: "Consumers read support tickets from an SQS queue, and every ticket must be picked up within 15 minutes of arriving. Last week the consumers stalled for an hour and nobody noticed, because CPU and error metrics stayed normal while the consumers were idle. Which CloudWatch alarm would have caught it?",
    opts: [
      "An alarm on the consumers' average CPU utilization, firing when it drops below 5% for fifteen minutes.",
      "An alarm on the queue's NumberOfEmptyReceives metric, firing when it rises above zero for fifteen minutes.",
      "An alarm on the queue's ApproximateAgeOfOldestMessage metric, firing when it is above 900 seconds (15 minutes).",
      "An alarm on the queue's NumberOfMessagesSent metric, firing when it rises above the usual level for an hour."
    ], a: 2,
    no: [
      "Quiet hours also have low CPU, so this would page all night, and a stalled consumer can still use CPU.",
      "Empty receives mean consumers are polling and finding nothing, the opposite of a stall.",
      null,
      "That's how many tickets arrived, not whether anyone read them."],
    why: "ApproximateAgeOfOldestMessage is how long the oldest message has waited in the queue. If consumers stall, it climbs whatever the traffic, so an alarm at the 15-minute limit catches exactly the failure the users would notice.",
    doc: ["https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html"] },

  // SAA Task 2.1: Scalable and loosely coupled architectures
  { id: "saa-2-677", exam: "SAA", saa: "2.1", topic: "transfer", type: "mc",
    q: "A company is moving its partners' SFTP uploads to AWS so that files land in Amazon S3. Partners sign in today with a user name and password, which the company checks against its own customer identity database, and the partners can't switch to SSH keys. Which design meets this with the least to run?",
    opts: [
      "An EC2 instance in an Auto Scaling group that runs an SFTP daemon and copies each uploaded file to S3 every minute.",
      "An S3 bucket policy that allows each partner's user name and password to call PutObject on the bucket directly.",
      "An AWS DataSync agent that reads each partner's files from their own servers each night and writes them to S3.",
      "A Transfer Family SFTP server that stores files in S3 and checks passwords with a custom identity provider in Lambda."
    ], a: 3,
    no: [
      "It works, but the company then patches and scales its own SFTP servers.",
      "S3 doesn't take user names and passwords; requests are signed with AWS credentials.",
      "DataSync needs access to the partners' systems, and the partners would stop uploading over SFTP.",
      null],
    why: "Transfer Family runs the SFTP endpoint and writes files to S3. Besides service-managed SSH keys, a server can use a custom identity provider: a Lambda function (or API Gateway) that checks the user name and password against the company's own store and returns the user's role and home directory.",
    doc: ["https://docs.aws.amazon.com/transfer/latest/userguide/custom-idp-intro.html", "https://docs.aws.amazon.com/transfer/latest/userguide/what-is-aws-transfer-family.html"] }
);
