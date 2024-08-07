locals {
  core_output_prefix   = "/${var.namespace}/${var.env}/core"
  static_output_prefix = "/${var.namespace}/${var.env}/static"
}

# # Core management
# data "aws_ssm_parameter" "event_bus_arn" {
#   name  = "${local.core_output_prefix}/event_bus_arn"
# }
# data "aws_ssm_parameter" "event_bus_name" {
#   name  = "${local.core_output_prefix}/event_bus_name"
# }
# data "aws_ssm_parameter" "ses_email_address" {
#   name  = "${local.core_output_prefix}/ses_email_address"
# }
# data "aws_ssm_parameter" "ses_email_arn" {
#   name  = "${local.core_output_prefix}/ses_email_arn"
# }

# Network
locals {
  private_subnets = split(",", data.aws_ssm_parameter.private_subnets.value)
}

data "aws_ssm_parameter" "vpc_id" {
  name = "${local.core_output_prefix}/vpc_id"
}

data "aws_ssm_parameter" "private_subnets" {
  name = "${local.core_output_prefix}/private_subnets"
}

# Data environment
data "aws_ssm_parameter" "data_lake_s3_bucket_arn" {
  name = "${local.core_output_prefix}/data_lake_s3_bucket_arn"
}
data "aws_ssm_parameter" "data_lake_s3_bucket_name" {
  name = "${local.core_output_prefix}/data_lake_s3_bucket_name"
}

# Static environment
data "aws_ssm_parameter" "static_s3_bucket_arn" {
  name = "${local.static_output_prefix}/bucket_arn"
}

data "aws_ssm_parameter" "static_s3_bucket_name" {
  name = "${local.static_output_prefix}/bucket_id"
}
