# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Storybook is an AI-powered children's book generator that uses AWS Step Functions to orchestrate the creation of illustrated stories. The system generates text via Claude 3.5 Sonnet, creates AI images, builds a static website with Astro, and deploys to CloudFront.

## Repository Structure

- **story-generator/** - TypeScript Lambda function for AI text/image generation and email notifications
- **front-end/** - Astro static site generator for rendering storybooks
- **iac/** - Terraform infrastructure (AWS Step Functions, Lambda, ECS, S3, SES)

## Common Commands

### Story Generator (Lambda)
```bash
cd story-generator
npm install
npm run build          # Compile TypeScript
npm test               # Run Jest tests
npm run lint           # ESLint
npm run test-lambda    # Local Lambda testing with ts-node
./scripts/docker_push_lambda.sh <version>  # Deploy Lambda Docker image
```

### Front-end (Astro)
```bash
cd front-end
npm install
cp .env.example .env && source .env
npm run dev            # Development server
npm run build          # Production build (includes astro check)
npm run dev-home       # Dev server for homepage
npm run build-home     # Build homepage
./scripts/docker_push.sh <version>  # Deploy ECS task Docker image
```

### Infrastructure
```bash
cd iac/projects/dev
terraform init
terraform plan
terraform apply
```

## Architecture

The Step Function workflow (`iac/modules/main/ai_sfn_state_machine.tf`):
1. **CreateText** - Lambda generates story text via Bedrock (Claude 3.5 Sonnet)
2. **ManualApprove** - Human approval step with email notification
3. **CreateImage** - Lambda generates images via Bedrock
4. **GenerateStaticSite** - ECS Fargate task builds Astro site, deploys to S3/CloudFront
5. **SendConfirmationEmail** - Lambda sends completion email via SES

The Lambda function (`story-generator/src/lambda_function.ts`) handles multiple commands via a `Command` parameter: `GenerateText`, `GenerateImages`, `SendConfirmationEmail`.

Story configuration flows as JSON through S3, with each step reading/writing to a data lake bucket.
