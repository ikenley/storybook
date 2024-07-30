# ai-image

This is an example of a more complex Step Function use case. There are simplifications that one would not use in production, but it demonstrates a Step Function which uses:
- Lambda Functions
- An ECS Task
- A manual approval stage
- SNS notifications

A "real" application would presumably have tests, TypeScript, 3rd party dependencies, and better documentation. But boy is the Max Power way faster.

## Directory Structure

- src
    - lambda_function.mjs: The entrypoint for the Lambda function. This function will be called multiple times and will "route" to the correct actions.
    - index.mjs: The entrypoint for local development and Docker containers.
    - ai.js: The core application logic which all entrypoints share. If we were creating tests, this would make unit testing easier.

---

## Running locally

```
cd iac/modules/main/lambda/ai-image
npm i
npm run start -- generate-image --id 12345 --task-token "1234567" --prompt "A man sitting on a bench in front of a lake"
```

## Docker

```
# Build the Docker image 
docker build -t ik-dev-step-demo-ai-image-task:test .

# Start the Docker image with the docker run command.
docker run --env-file .env ik-dev-step-demo-ai-image-task:test generate-image --prompt "A house on the beach in the style of Hopper"

# Test your application locally using the RIE
curl -XPOST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{}'

# Deploy
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 924586450630.dkr.ecr.us-east-1.amazonaws.com
aws ecr create-repository --repository-name ik-dev-step-demo-ai-image-task --image-scanning-configuration scanOnPush=true --image-tag-mutability MUTABLE
docker tag ik-dev-step-demo-ai-image-task:latest 924586450630.dkr.ecr.us-east-1.amazonaws.com/ik-dev-step-demo-ai-image-task:latest
docker push 924586450630.dkr.ecr.us-east-1.amazonaws.com/ik-dev-step-demo-ai-image-task:latest
```