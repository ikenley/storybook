# Build and push docker image to ECR

TAG=$1

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 924586450630.dkr.ecr.us-east-1.amazonaws.com

docker build --tag ik-dev-step-demo-ai-image-task .

docker tag ik-dev-step-demo-ai-image-task:latest 924586450630.dkr.ecr.us-east-1.amazonaws.com/ik-dev-step-demo-ai-image-task:${TAG}
docker push 924586450630.dkr.ecr.us-east-1.amazonaws.com/ik-dev-step-demo-ai-image-task:${TAG}