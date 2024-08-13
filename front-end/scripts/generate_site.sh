# Generate static site and deploy to S3
echo "Generating site"

echo "Downloading story config"
CONFIG_S3_URI="$1"
echo "CONFIG_S3_URI=$CONFIG_S3_URI"
aws s3 cp "$CONFIG_S3_URI" ./src/story_config.json

echo "Loading environment variables"
BASE_URL=$(cat "./src/story_config.json" | jq -r '.baseUrl')
export BASE_URL=$BASE_URL
echo "BASE_URL=$BASE_URL"

echo "Building site"
npm run build

echo "Deploying site"
aws s3 cp dist s3://${CDN_DOMAIN}${BASE_URL}/ --recursive
aws cloudfront create-invalidation --distribution-id ESXOJUXNNU11Y --paths ${BASE_URL}/*

echo "Deployment complete"
echo "Site is live at https://${CDN_DOMAIN}${BASE_URL}/"