#------------------------------------------------------------------------------
# ai_image_task.tf
#------------------------------------------------------------------------------

resource "aws_ssm_parameter" "ai_image_task_security_group_id" {
  name  = "${local.output_prefix}/ai_image_task_security_group_id"
  type  = "String"
  value = aws_security_group.ai_image_task.id
}

#------------------------------------------------------------------------------
# sfn_state_machine.tf
#------------------------------------------------------------------------------

resource "aws_ssm_parameter" "sfn_state_machine_arn" {
  name  = "${local.output_prefix}/sfn_state_machine_arn"
  type  = "String"
  value = aws_sfn_state_machine.sfn.arn
}

