#-------------------------------------------------------------------------------
# Notifications via SNS
#-------------------------------------------------------------------------------

# SNS Topic for notifications
resource "aws_sns_topic" "step_function_notifications" {
  name = local.id

  kms_master_key_id = "alias/aws/sns"
}

resource "aws_sns_topic_subscription" "step_fn" {
  for_each = var.sns_email_addresses

  topic_arn = aws_sns_topic.step_function_notifications.arn
  protocol  = "email"
  endpoint  = each.key
}

# EventBridge Rule for Step Function failure events
resource "aws_cloudwatch_event_rule" "step_function_failure" {
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
resource "aws_cloudwatch_event_target" "send_to_sns" {
  rule      = aws_cloudwatch_event_rule.step_function_failure.name
  target_id = "${local.id}-sns"
  arn       = aws_sns_topic.step_function_notifications.arn

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

    input_template = <<EOF
"Step Function Execution Alert:
Status: <status>
State Machine: <stateMachineArn>
Execution: <executionArn>
Start Time: <startDate>
End Time: <stopDate>

Raw Event JSON:
<rawJson>"
EOF
  }
}

# IAM policy to allow EventBridge to publish to SNS
resource "aws_sns_topic_policy" "step_function_sns_policy" {
  arn = aws_sns_topic.step_function_notifications.arn

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
        Resource = aws_sns_topic.step_function_notifications.arn
      }
    ]
  })
}
