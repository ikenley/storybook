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
  name        = "step-function-failure-rule"
  description = "Capture Step Function failures and timeouts"

  event_pattern = jsonencode({
    source      = ["aws.states"],
    detail-type = ["Step Functions Execution Status Change"],
    detail = {
      status          = ["FAILED", "TIMED_OUT"],
      stateMachineArn = [aws_sfn_state_machine.step_fn.arn]
    }
  })
}

# EventBridge Target to send events to SNS
resource "aws_cloudwatch_event_target" "error_notification" {
  rule      = aws_cloudwatch_event_rule.error_notification.name
  target_id = "${local.id}-sns"
  arn       = aws_sns_topic.error_notification.arn

  # Format the message for email
  input_transformer {
    input_paths = {
      status          = "$.detail.status",
      stateMachineArn = "$.detail.stateMachineArn",
      executionArn    = "$.detail.executionArn",
      startDate       = "$.detail.startDate",
      stopDate        = "$.detail.stopDate",
      rawJson         = "$"
    }

    # EventBridge does not allow multi-line strings
    # This is ugly but valid
    input_template = <<EOT
"Step Function Execution Alert:\nStatus: <status>\nState Machine: <stateMachineArn>\nExecution: <executionArn>\nStart Time: <startDate>\nEnd Time: <stopDate>\n\nRaw Event JSON:\n<rawJson>"
EOT
  }
}

/*
"Step Function Execution Alert:
Status: <status>
State Machine: <stateMachineArn>
Execution: <executionArn>
Start Time: <startDate>
End Time: <stopDate>

Raw Event JSON:
<rawJson>"
*/

# IAM policy to allow EventBridge to publish to SNS
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
