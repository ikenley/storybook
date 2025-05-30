# storybook-generator

[Demo storybooks](https://static.ikenley.com/storybook/home)

Asyncronus task runner for creating storybooks. An AWS Step Function will call a serious of Lambda functions and ECS Tasks in order to generate a "storybook" static website. The steps will be as follows:

1. Lambda Function to "write" the story using generative AI (currently Claude 3.5 Sonnet)
2. Manual approval step (with optional text overrides)
3. ECS Task to generate AI images. It will then write the images and a configuration JSON file to S3
4. ECS Task to build an Astro static front-end and deploy it to S3
5. Lambda function to send confirmation email with link to static "storybook" website (hosted on Cloudfront CDN)

---

## Manually Deploying

Ordinarily you'd use an automated, cloud-based CI/CD system (e.g. CodePipeline). But if you're in a hurry or trying to save a buck...

```
./scripts/docker_push_lambda.sh 202504076
```
