#-------------------------------------------------------------------------------
# Notifications via SNS
#-------------------------------------------------------------------------------

locals {
  error_notification_id = "${local.id}-error"
}

# SNS Topic for notifications
resource "aws_sns_topic" "error_notification" {
  name = local.error_notification_id

  kms_master_key_id = "alias/aws/sns"
}

resource "aws_sns_topic_subscription" "error_notification" {
  for_each = var.sns_email_addresses

  topic_arn = aws_sns_topic.error_notification.arn
  protocol  = "email"
  endpoint  = each.key
}

# EventBridge Rule for Step Function failure events
resource "aws_cloudwatch_event_rule" "error_notification" {
  name        = local.error_notification_id
  description = "Capture Step Function failures and timeouts"

  event_pattern = jsonencode({
    source      = ["aws.states"],
    detail-type = ["Step Functions Execution Status Change"],
    detail = {
      status          = ["ABORTED", "FAILED", "TIMED_OUT"],
      stateMachineArn = [aws_sfn_state_machine.step_fn.arn]
    }
  })
}

# EventBridge Target to send events to SNS
resource "aws_cloudwatch_event_target" "error_notification" {
  rule      = aws_cloudwatch_event_rule.error_notification.name
  target_id = "${local.id}-sns"
  arn       = aws_sns_topic.error_notification.arn
  role_arn  = aws_iam_role.error_notification.arn

  # Format the message for email
  input_transformer {
    input_paths = {
      detail = "$.detail"
    }

    # EventBridge does not allow multi-line strings
    # This is ugly but valid
    # "An error occurred while running ${local.id}:\n<detail>"
    input_template = <<EOT
{
  "message": "An error occurred while running ${local.id}",
  "eventDetail": <detail>
}
EOT
  }
}

# Execution role for EventBridge Target
resource "aws_iam_role" "error_notification" {
  name               = local.error_notification_id
  assume_role_policy = data.aws_iam_policy_document.error_notification_trust.json
}

data "aws_iam_policy_document" "error_notification_trust" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }
  }
}

resource "aws_iam_policy" "error_notification_policy" {
  name   = "${local.error_notification_id}-policy"
  policy = data.aws_iam_policy_document.error_notification_policy.json
}

resource "aws_iam_role_policy_attachment" "error_notification_policy" {
  policy_arn = aws_iam_policy.error_notification_policy.arn
  role       = aws_iam_role.error_notification.name
}

data "aws_iam_policy_document" "error_notification_policy" {
  statement {
    effect    = "Allow"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.error_notification.arn]
  }
}

# IAM resource policy to allow EventBridge to publish to SNS
resource "aws_sns_topic_policy" "error_notification" {
  arn = aws_sns_topic.error_notification.arn

  policy = jsonencode({
    Version = "2012-10-17",
    Id      = "StepFunctionSNSPolicy",
    Statement = [
      {
        Effect = "Allow",
        Principal = {
          Service = "events.amazonaws.com"
        },
        Action   = "sns:Publish",
        Resource = aws_sns_topic.error_notification.arn
      }
    ]
  })
}
