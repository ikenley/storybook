# Build and push docker image to ECR

TAG=$1

npm run build

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 924586450630.dkr.ecr.us-east-1.amazonaws.com

docker build --tag ik-dev-storybook-task --provenance=false --build-arg VERSION=${TAG} .

docker tag ik-dev-storybook-task:latest 924586450630.dkr.ecr.us-east-1.amazonaws.com/ik-dev-storybook-task:${TAG}
docker push 924586450630.dkr.ecr.us-east-1.amazonaws.com/ik-dev-storybook-task:${TAG}