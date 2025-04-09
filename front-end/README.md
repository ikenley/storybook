# front-end

This project uses Astro to generate a static site and then deploy to a CDN.

---

## Getting Started / Running Locally

```
cd front-end
npm i
cp .env.example .env
source .env
npm run start
```

---

## Deploying the site

```
cd front-end
./scripts/generate_site.sh "s3://924586450630-data-lake/ik-dev-storybook/2024-08-11/18b48ef3-9409-470a-ad6f-d1a7c775731d-story-config.json"
```

---

## Deploying the Docker image

```
docker build -t ik-dev-storybook-task:test --build-arg VERSION=TEST .

# Start the Docker image with the docker run command.
docker run -e BASE_URL -e CDN_DOMAIN -e DISTRIBUTION_ID -e AWS_ACCESS_KEY_ID -e AWS_SECRET_ACCESS_KEY -e AWS_SESSION_TOKEN  ik-dev-storybook-task:test "s3://924586450630-data-lake/ik-dev-storybook/2024-08-11/18b48ef3-9409-470a-ad6f-d1a7c775731d-story-config.json"

# Deploy
./scripts/docker_push.sh 7

# Test running the ECS task
./scripts/run_task.sh
```
