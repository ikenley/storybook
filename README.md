# storybook

Short books for kiddo, using AI, task orchestration, and static site generation

---

## Getting started

```
cd iac/projects/dev
terraform init
terraform apply
```

---

## Background

- [Astro](https://astro.build/) for static site generation

---

## cmd

```
cd front-end
npm run build
aws s3 cp dist s3://static.ikenley.com/cat-story/ --recursive
aws cloudfront create-invalidation --distribution-id ESXOJUXNNU11Y --paths /cat-story/*
```
