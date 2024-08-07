# #-------------------------------------------------------------------------------
# # Lambda Function which handle ai image generation.
# #-------------------------------------------------------------------------------

locals {
  storybook_lambda_id = "${local.id}-lambda"
}

resource "aws_ecr_repository" "ai_image_task" {
  name                 = local.storybook_lambda_id
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# module "ai_image_lambda" {
#   source = "terraform-aws-modules/lambda/aws"

#   function_name = local.ai_image_lambda_id
#   description   = "${local.id} AI image generation"
#   handler       = "lambda_function.handler"
#   runtime       = "nodejs20.x"
#   publish       = true
#   timeout       = 30 # seconds

#   source_path = "${path.module}/lambda/ai-image/src"

#   vpc_subnet_ids         = local.private_subnets
#   vpc_security_group_ids = [aws_security_group.ai_image_lambda.id]
#   attach_network_policy  = true

#   environment_variables = {
#     S3_BUCKET_NAME       = data.aws_ssm_parameter.data_lake_s3_bucket_name.value
#     S3_BUCKET_KEY_PREFIX = local.ai_image_task_id
#   }

#   tags = local.tags
# }

# resource "aws_iam_role_policy_attachment" "ai_image_lambda_main" {
#   role       = module.ai_image_lambda.lambda_role_name
#   policy_arn = aws_iam_policy.ai_image_lambda_main.arn
# }

# resource "aws_iam_policy" "ai_image_lambda_main" {
#   name        = local.ai_image_lambda_id
#   path        = "/"
#   description = "Main policy for ${local.ai_image_lambda_id}"

#   policy = jsonencode({
#     "Version" : "2012-10-17",
#     "Statement" : [
#       {
#         "Sid" : "Logging",
#         "Action" : [
#           "logs:CreateLogGroup",
#           "logs:CreateLogStream",
#           "logs:PutLogEvents"
#         ],
#         "Resource" : "arn:aws:logs:*:*:*",
#         "Effect" : "Allow"
#       },
#       {
#         "Sid" : "AllowVpcAccess",
#         "Effect" : "Allow",
#         "Action" : [
#           "ec2:CreateNetworkInterface",
#           "ec2:DescribeNetworkInterfaces",
#           "ec2:DeleteNetworkInterface"
#         ],
#         "Resource" : "*"
#       },
#       {
#         "Sid" : "ListObjectsInBucket",
#         "Effect" : "Allow",
#         "Action" : ["s3:ListBucket"],
#         "Resource" : ["${data.aws_ssm_parameter.data_lake_s3_bucket_arn.value}"]
#       },
#       {
#         "Sid" : "S3ReadWrite",
#         "Effect" : "Allow",
#         "Action" : [
#           "s3:GetObject",
#           "s3:PutObject"
#         ],
#         "Resource" : ["${data.aws_ssm_parameter.data_lake_s3_bucket_arn.value}/${local.ai_image_task_id}/*"]
#       },
#       {
#         "Sid" : "Rekognition",
#         "Effect" : "Allow",
#         "Action" : "rekognition:DetectLabels",
#         "Resource" : "*"
#       }
#     ]
#   })
# }

# resource "aws_security_group" "ai_image_lambda" {
#   name        = local.ai_image_lambda_id
#   description = "Egress-only security group for ${local.ai_image_lambda_id}"
#   vpc_id      = data.aws_ssm_parameter.vpc_id.value

#   egress {
#     protocol    = "-1"
#     from_port   = 0
#     to_port     = 0
#     cidr_blocks = ["0.0.0.0/0"]
#   }

#   tags = local.tags
# }
