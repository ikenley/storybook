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

## Deploying

```
cd front-end
./scripts/generate_site.sh "s3://924586450630-data-lake/ik-dev-storybook/2024-08-11/18b48ef3-9409-470a-ad6f-d1a7c775731d-story-config.json"
```
