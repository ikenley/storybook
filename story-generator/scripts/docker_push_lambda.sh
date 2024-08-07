# Build and push docker image to ECR

TAG=$1

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 924586450630.dkr.ecr.us-east-1.amazonaws.com

docker build --tag ik-dev-storybook-lambda -f lambda.Dockerfile .

docker tag ik-dev-storybook-lambda:latest 924586450630.dkr.ecr.us-east-1.amazonaws.com/ik-dev-storybook-lambda:${TAG}
docker push 924586450630.dkr.ecr.us-east-1.amazonaws.com/ik-dev-storybook-lambda:${TAG}