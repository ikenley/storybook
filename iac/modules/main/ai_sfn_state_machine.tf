# ------------------------------------------------------------------------------
# AWS Step Function State Machine
# ------------------------------------------------------------------------------

resource "aws_sfn_state_machine" "step_fn" {
  name     = local.id
  role_arn = aws_iam_role.step_fn.arn

  definition = <<EOF
{
  "Comment": "A description of my state machine",
  "StartAt": "CreateText",
  "States": {
    "CreateText": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "${aws_lambda_function.storybook_lambda.arn}:$LATEST",
        "Payload": {
          "Command": "GenerateText",
          "Title.$": "$$.Execution.Input.Title",
          "Description.$": "$$.Execution.Input.Description"
        }
      },
      "Retry": [
        {
          "ErrorEquals": [
            "Lambda.ServiceException",
            "Lambda.AWSLambdaException",
            "Lambda.SdkClientException",
            "Lambda.TooManyRequestsException"
          ],
          "IntervalSeconds": 1,
          "MaxAttempts": 3,
          "BackoffRate": 2
        }
      ],
      "ResultPath": "$.CreateText",
      "ResultSelector": {
        "JobId.$": "$.Payload.jobId",
        "BaseUrl.$": "$.Payload.baseUrl",
        "S3Bucket.$": "$.Payload.s3Bucket",
        "S3Key.$": "$.Payload.s3Key",
        "S3Uri.$": "$.Payload.s3Uri"
      },
      "Next": "ManualApproveLambda"
    },
    "ManualApproveLambda": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
      "Parameters": {
        "FunctionName": "${data.aws_ssm_parameter.manual_approval_send_lambda_function_arn.value}",
        "Payload": {
          "ExecutionContext.$": "$$",
          "APIGatewayEndpoint": "${data.aws_ssm_parameter.manual_approval_api_gateway_invoke_url.value}",
          "EmailSnsTopic": "${aws_sns_topic.step_fn.arn}",
          "Message.$": "States.Format('The text of your story is ready for review. Please see https://${local.aws_region}.console.aws.amazon.com/s3/object/${data.aws_ssm_parameter.data_lake_s3_bucket_name.value}?region=${local.aws_region}&bucketType=general&prefix={}.', $.CreateText.S3Key)"
        }
      },
      "ResultPath": "$.ManualApproveLambda",
      "Next": "ManualApproveChoiceState"
    },
    "ManualApproveChoiceState": {
      "Type": "Choice",
      "Choices": [
        {
          "Variable": "$.ManualApproveLambda.action",
          "StringEquals": "approve",
          "Next": "ApprovedPassState"
        },
        {
          "Variable": "$.ManualApproveLambda.action",
          "StringEquals": "reject",
          "Next": "RejectedPassState"
        }
      ]
    },
    "ApprovedPassState": {
      "Type": "Pass",
      "Next": "CreateImage"
    },
    "RejectedPassState": {
      "Type": "Pass",
      "Next": "SnsPublish"
    },
    "CreateImage": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "${aws_lambda_function.storybook_lambda.arn}:$LATEST",
        "Payload": {
          "Command": "GenerateImages",
          "JobId.$": "$.CreateText.JobId",
          "Title.$": "$$.Execution.Input.Title",
          "Description.$": "$$.Execution.Input.Description",
          "LinesS3Bucket.$": "$.CreateText.S3Bucket",
          "LinesS3Key.$": "$.CreateText.S3Key"
        }
      },
      "Retry": [
        {
          "ErrorEquals": [
            "Lambda.ServiceException",
            "Lambda.AWSLambdaException",
            "Lambda.SdkClientException",
            "Lambda.TooManyRequestsException"
          ],
          "IntervalSeconds": 1,
          "MaxAttempts": 3,
          "BackoffRate": 2
        }
      ],
      "ResultPath": "$.CreateImage",
      "ResultSelector": {
        "S3Bucket.$": "$.Payload.s3Bucket",
        "S3Key.$": "$.Payload.s3Key",
        "S3Uri.$": "$.Payload.s3Uri"
      },
      "Next": "GenerateStaticSite"
    },
    "GenerateStaticSite": {
      "Type": "Task",
      "Resource": "arn:aws:states:::ecs:runTask.waitForTaskToken",
      "Parameters": {
        "LaunchType": "FARGATE",
        "Cluster": "arn:aws:ecs:us-east-1:924586450630:cluster/main",
        "TaskDefinition": "${aws_ecs_task_definition.storybook_task.arn}",
        "NetworkConfiguration": {
          "AwsvpcConfiguration": {
            "Subnets": ${jsonencode(local.private_subnets)},
            "SecurityGroups": [
              "${aws_security_group.storybook_task.id}"
            ],
            "AssignPublicIp": "DISABLED"
          }
        },
        "Overrides": {
          "ContainerOverrides": [
            {
              "Name": "storybook-ssg",
              "Command.$": "States.Array($.CreateImage.S3Uri, '--task-token', $$.Task.Token)",
              "Environment": [
                {
                  "Name": "BASE_URL",
                  "Value.$": "$.CreateText.BaseUrl"
                }
              ]
            }
          ]
        }
      },
      "ResultPath": "$.GenerateStaticSite",
      "Next": "SnsPublish"
    },
    "SnsPublish": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "Message.$": "$",
        "TopicArn": "${aws_sns_topic.step_fn.arn}"
      },
      "End": true,
      "ResultPath": "$.SnsPublish"
    }
  }
}
EOF

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.step_fn.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }
}

resource "aws_cloudwatch_log_group" "step_fn" {
  name = local.id

  tags = local.tags
}

resource "aws_iam_role" "step_fn" {
  name = local.id

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = "states.amazonaws.com"
        }
      },
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "step_fn" {
  role       = aws_iam_role.step_fn.name
  policy_arn = aws_iam_policy.step_fn.arn
}

resource "aws_iam_policy" "step_fn" {
  name        = local.id
  path        = "/"
  description = "Main policy for ${local.id}"

  # Terraform's "jsonencode" function converts a
  # Terraform expression result to valid JSON syntax.
  policy = jsonencode({
    "Version" : "2012-10-17",
    "Statement" : [
      {
        "Sid" : "Cloudwatch",
        "Effect" : "Allow",
        "Action" : [
          "logs:CreateLogDelivery",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
          "logs:DescribeLogGroups"
        ],
        "Resource" : "*"
      },
      {
        "Sid" : "xray",
        "Effect" : "Allow",
        "Action" : [
          "xray:PutTraceSegments",
          "xray:PutTelemetryRecords",
          "xray:GetSamplingRules",
          "xray:GetSamplingTargets"
        ],
        "Resource" : [
          "*"
        ]
      },
      {
        "Sid" : "InvokeLambda",
        "Effect" : "Allow",
        "Action" : [
          "lambda:InvokeFunction"
        ],
        "Resource" : [
          "${aws_lambda_function.storybook_lambda.arn}",
          "${aws_lambda_function.storybook_lambda.arn}:*",
          "${data.aws_ssm_parameter.manual_approval_send_lambda_function_arn.value}",
          "${data.aws_ssm_parameter.manual_approval_send_lambda_function_arn.value}:*"
        ]
      },
      {
        "Sid" : "EcsRunTask",
        "Effect" : "Allow",
        "Action" : [
          "ecs:RunTask"
        ],
        "Resource" : [
          "${aws_ecs_task_definition.storybook_task.arn_without_revision}:*"
        ]
      },
      {
        "Sid" : "EcsDescribeTasks",
        "Effect" : "Allow",
        "Action" : [
          "ecs:StopTask",
          "ecs:DescribeTasks"
        ],
        "Resource" : "*"
      },
      #   {
      #     "Sid" : "EcsEvents",
      #     "Effect" : "Allow",
      #     "Action" : [
      #       "events:PutTargets",
      #       "events:PutRule",
      #       "events:DescribeRule"
      #     ],
      #     "Resource" : [
      #       "arn:aws:events:us-east-1:924586450630:rule/StepFunctionsGetEventsForECSTaskRule"
      #     ]
      #   },
      {
        "Sid" : "PassRoleTaskExecution",
        "Effect" : "Allow",
        "Action" : [
          "iam:PassRole"
        ],
        "Resource" : [
          "${aws_iam_role.storybook_task_execution_role.arn}",
          "${aws_iam_role.storybook_task_role.arn}"
        ]
      },
      {
        "Sid" : "Sns",
        "Effect" : "Allow",
        "Action" : [
          "SNS:Publish"
        ],
        "Resource" : [aws_sns_topic.step_fn.arn]
      }
    ]
  })
}

resource "aws_sns_topic" "step_fn" {
  name = local.id

  kms_master_key_id = "alias/aws/sns"
}

# TODO make this a for each
resource "aws_sns_topic_subscription" "step_fn" {
  for_each = var.ses_email_addresses

  topic_arn = aws_sns_topic.step_fn.arn
  protocol  = "email"
  endpoint  = each.key
}
