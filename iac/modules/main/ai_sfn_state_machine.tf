# ------------------------------------------------------------------------------
# MAWS Step Function State Machine
# ------------------------------------------------------------------------------

locals {
  ai_sfn_id = "${local.id}-ai-sfn"
}

resource "aws_sfn_state_machine" "ai_sfn" {
  name     = local.ai_sfn_id
  role_arn = aws_iam_role.ai_sfn.arn

  definition = <<EOF
{
  "Comment": "A description of my state machine",
  "StartAt": "GetMetadata",
  "States": {
    "GetMetadata": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "${module.ai_image_lambda.lambda_function_arn}:$LATEST",
        "Payload": {
          "command": "GetMetadata"
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
      "ResultPath": "$.GetMetadata",
      "ResultSelector": {
        "ImageId.$": "$.Payload.imageId"
      },
      "Next": "GenerateImage"
    },
    "GenerateImage": {
      "Type": "Task",
      "Resource": "arn:aws:states:::ecs:runTask.waitForTaskToken",
      "Parameters": {
        "LaunchType": "FARGATE",
        "Cluster": "arn:aws:ecs:us-east-1:924586450630:cluster/main",
        "TaskDefinition": "${aws_ecs_task_definition.ai_image_task.arn}",
        "NetworkConfiguration": {
          "AwsvpcConfiguration": {
            "Subnets": ${jsonencode(local.private_subnets)},
            "SecurityGroups": [
              "${aws_security_group.ai_image_task.id}"
            ],
            "AssignPublicIp": "DISABLED"
          }
        },
        "Overrides": {
          "ContainerOverrides": [
            {
              "Name": "ai-image",
              "Command.$": "States.Array('generate-image', '--id', $.GetMetadata.ImageId, '--prompt', $$.Execution.Input.prompt, '--task-token', $$.Task.Token)"
            }
          ]
        }
      },
      "ResultPath": "$.GenerateImage",
      "Next": "CreateTags"
    },
    "CreateTags": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke",
      "Parameters": {
        "FunctionName": "${module.ai_image_lambda.lambda_function_arn}:$LATEST",
        "Payload": {
          "command": "CreateTags",
          "imageId.$": "$.GetMetadata.ImageId",
          "imageSBucket.$": "$.GenerateImage.s3Bucket",
          "imageS3Key.$": "$.GenerateImage.s3Key"
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
      "ResultSelector": {
        "S3BucketName.$": "$.Payload.s3BucketName",
        "S3Key.$": "$.Payload.s3Key",
        "S3Uri.$": "$.Payload.s3Uri"
      },
      "ResultPath": "$.CreateTags",
      "Next": "ManualApproveLambda"
    },
    "ManualApproveLambda": {
      "Type": "Task",
      "Resource": "arn:aws:states:::lambda:invoke.waitForTaskToken",
      "Parameters": {
        "FunctionName": "${module.manual_approval.send_lambda_function_arn}",
        "Payload": {
          "ExecutionContext.$": "$$",
          "APIGatewayEndpoint": "${module.manual_approval.api_gateway_invoke_url}",
          "EmailSnsTopic": "${aws_sns_topic.ai_sfn.arn}",
          "Message.$": "States.Format('An image is ready for review. Please see https://${local.aws_region}.console.aws.amazon.com/s3/object/${data.aws_ssm_parameter.data_lake_s3_bucket_name.value}?region=${local.aws_region}&bucketType=general&prefix={}.', $.GenerateImage.s3Key)"
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
      "Next": "SnsPublish"
    },
    "RejectedPassState": {
      "Type": "Pass",
      "Next": "SnsPublish"
    },
    "SnsPublish": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "Message.$": "$",
        "TopicArn": "${aws_sns_topic.ai_sfn.arn}"
      },
      "End": true,
      "ResultPath": "$.SnsPublish"
    }
  }
}
EOF

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.ai_sfn.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }
}

resource "aws_cloudwatch_log_group" "ai_sfn" {
  name = local.ai_sfn_id

  tags = local.tags
}

resource "aws_iam_role" "ai_sfn" {
  name = local.ai_sfn_id

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

resource "aws_iam_role_policy_attachment" "ai_sfn" {
  role       = aws_iam_role.ai_sfn.name
  policy_arn = aws_iam_policy.ai_sfn.arn
}

resource "aws_iam_policy" "ai_sfn" {
  name        = local.ai_sfn_id
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
          "${module.ai_image_lambda.lambda_function_arn}",
          "${module.ai_image_lambda.lambda_function_arn}:*",
          "${module.manual_approval.send_lambda_function_arn}",
          "${module.manual_approval.send_lambda_function_arn}:*"
        ]
      },
      {
        "Sid" : "EcsRunTask",
        "Effect" : "Allow",
        "Action" : [
          "ecs:RunTask"
        ],
        "Resource" : [
          "${aws_ecs_task_definition.ai_image_task.arn_without_revision}:*"
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
      {
        "Sid" : "EcsEvents",
        "Effect" : "Allow",
        "Action" : [
          "events:PutTargets",
          "events:PutRule",
          "events:DescribeRule"
        ],
        "Resource" : [
          "arn:aws:events:us-east-1:924586450630:rule/StepFunctionsGetEventsForECSTaskRule"
        ]
      },
      {
        "Sid" : "PassRoleTaskExecution",
        "Effect" : "Allow",
        "Action" : [
          "iam:PassRole"
        ],
        "Resource" : [
          "${aws_iam_role.ai_image_task_execution_role.arn}",
          "${aws_iam_role.ai_image_task_role.arn}"
        ]
      },
      {
        "Sid" : "Sns",
        "Effect" : "Allow",
        "Action" : [
          "SNS:Publish"
        ],
        "Resource" : [aws_sns_topic.ai_sfn.arn]
      }
    ]
  })
}

resource "aws_sns_topic" "ai_sfn" {
  name = local.ai_sfn_id

  kms_master_key_id = "alias/aws/sns"
}

# TODO make this a for each
resource "aws_sns_topic_subscription" "ai_sfn" {
  for_each = var.ses_email_addresses

  topic_arn = aws_sns_topic.ai_sfn.arn
  protocol  = "email"
  endpoint  = each.key
}