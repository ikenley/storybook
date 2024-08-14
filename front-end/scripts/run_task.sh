# Run standalone ECS task
# https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_run_task-v2.html

REVISION=$(aws ecs describe-task-definition \
--task-definition ik-dev-storybook-task \
--query 'taskDefinition.revision' \
--output text)

TASK_DEFINITION="ik-dev-storybook-task:${REVISION}"
echo "TASK_DEFINITION=$TASK_DEFINITION"

aws ecs run-task \
    --cluster main \
    --task-definition $TASK_DEFINITION \
    --launch-type FARGATE \
    --network-configuration="awsvpcConfiguration={subnets=[subnet-0e6d4d3994a55e9bd,subnet-0f2afb4dd0b52058c],securityGroups=[sg-0a41bdd1081ad9ffb],assignPublicIp=DISABLED}" \
    --overrides file://scripts/overrides.json