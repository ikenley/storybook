#-------------------------------------------------------------------------------
# ECS Task which handle ai image generation.
#-------------------------------------------------------------------------------

locals {
  storybook_task_id = "${local.id}-task"
}

resource "aws_ecs_task_definition" "storybook_task" {
  family = local.storybook_task_id

  task_role_arn            = aws_iam_role.storybook_task_role.arn
  execution_role_arn       = aws_iam_role.storybook_task_execution_role.arn
  network_mode             = "awsvpc"
  cpu                      = 1024
  memory                   = 2048
  requires_compatibilities = ["FARGATE"]

  container_definitions = jsonencode([
    {
      name      = "storybook-ssg"
      image     = "${aws_ecr_repository.storybook_task.repository_url}:9"
      cpu       = 1024
      memory    = 2048
      essential = true

      environment = [
        {
          name : "CDN_DOMAIN",
          value : data.aws_ssm_parameter.static_s3_bucket_name.value
        },
        {
          name : "DISTRIBUTION_ID",
          value : data.aws_ssm_parameter.cdn_distribution_id.value
        },
        {
          name : "HOME_CONFIG_S3_URI",
          value : "s3://${data.aws_ssm_parameter.data_lake_s3_bucket_name.value}/${local.id}/home/home_config.json"
        },
        {
          name : "STORYBOOK_URL_PREFIX",
          value : "https://${data.aws_ssm_parameter.static_s3_bucket_name.value}/storybook"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs",
        options = {
          awslogs-group         = aws_cloudwatch_log_group.storybook_task.name,
          awslogs-region        = "us-east-1",
          awslogs-stream-prefix = "ecs"
        }
      }
    }
  ])

  # lifecycle {
  #   ignore_changes = [
  #     # Ignore container_definitions b/c this will be managed by CodePipeline
  #     container_definitions,
  #   ]
  # }

  tags = local.tags
}

resource "aws_cloudwatch_log_group" "storybook_task" {

  name = "/ecs/${aws_ecr_repository.storybook_task.name}"

  tags = local.tags
}

resource "aws_ecr_repository" "storybook_task" {
  name                 = local.storybook_task_id
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_iam_role" "storybook_task_execution_role" {
  name = "${local.storybook_task_id}-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_role_policy_attachment" "storybook_task_execution_role_attach" {
  role       = aws_iam_role.storybook_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "storybook_task_role" {
  name = "${local.storybook_task_id}-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.tags
}

resource "aws_iam_policy" "storybook_task_role" {
  name        = "${local.storybook_task_id}-role-main"
  description = "Additional permissions for ECS task application"

  # TODO
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid = "Bedrock"
        Action = [
          "bedrock:InvokeModel"
        ]
        Effect   = "Allow"
        Resource = "*"
      },
      {
        "Sid" : "ListObjectsInBucket",
        "Effect" : "Allow",
        "Action" : ["s3:ListBucket"],
        "Resource" : [
          "${data.aws_ssm_parameter.data_lake_s3_bucket_arn.value}",
          "${data.aws_ssm_parameter.static_s3_bucket_arn.value}"
        ]
      },
      {
        "Sid" : "S3ReadWrite",
        "Effect" : "Allow",
        "Action" : [
          "s3:GetObject",
          "s3:PutObject"
        ],
        "Resource" : [
          "${data.aws_ssm_parameter.data_lake_s3_bucket_arn.value}/${local.id}/*",
          "${data.aws_ssm_parameter.static_s3_bucket_arn.value}/${local.id}/*",
          "${data.aws_ssm_parameter.static_s3_bucket_arn.value}/storybook/*"
        ]
      },
      {
        "Sid" : "CloudFrontInvalidation",
        "Effect" : "Allow",
        "Action" : [
          "cloudfront:CreateInvalidation"
        ],
        "Resource" : "*"
      },
      {
        "Sid" : "SendTaskSuccess",
        "Effect" : "Allow",
        "Action" : [
          "states:SendTaskSuccess"
        ],
        "Resource" : "*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "storybook_task_role" {
  role       = aws_iam_role.storybook_task_role.name
  policy_arn = aws_iam_policy.storybook_task_role.arn
}

resource "aws_security_group" "storybook_task" {
  name        = local.storybook_task_id
  description = "Egress-only security group for ${local.storybook_task_id}"
  vpc_id      = data.aws_ssm_parameter.vpc_id.value

  egress {
    protocol    = "-1"
    from_port   = 0
    to_port     = 0
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = local.tags
}
