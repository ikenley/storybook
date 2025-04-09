# Generate static site and deploy to S3
echo "Generating site"

echo "Downloading story config"
CONFIG_S3_URI="$1"
echo "CONFIG_S3_URI=$CONFIG_S3_URI"
aws s3 cp "$CONFIG_S3_URI" ./src/story_config.json

echo "Loading environment variables"
export BASE_URL=$BASE_URL
echo "BASE_URL=$BASE_URL"

echo "Building site"
npm run build

echo "Deploying site"
aws s3 cp dist s3://${CDN_DOMAIN}${BASE_URL}/ --recursive
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths ${BASE_URL}/*

echo "Deployment complete"
SITE_URL="https://${CDN_DOMAIN}${BASE_URL}/"
echo "Site is live at $SITE_URL"

# ---

echo "Update homepage"

echo "Download homepage config"
HOME_CONFIG_PATH="./homepage/src/home_config.json"
HOME_CONFIG_PATH_TMP="./homepage/src/home_config.tmp.json"
aws s3 cp "$HOME_CONFIG_S3_URI" $HOME_CONFIG_PATH

echo "Append new title to home_config"
# TODO
TITLE=$(cat ./src/story_config.json | jq '.cover.line')
echo "TITLE=$TITLE"
# Use jq to parse home_config and append the title
# You cannot overwrite in place, so we use a tmp file
cat $HOME_CONFIG_PATH | jq ".titles += [$TITLE]" > $HOME_CONFIG_PATH_TMP
cat $HOME_CONFIG_PATH_TMP > $HOME_CONFIG_PATH
rm $HOME_CONFIG_PATH_TMP

echo "Build homepage"
npm run build-home

echo "Upload updated home_config"
aws s3 cp $HOME_CONFIG_PATH "$HOME_CONFIG_S3_URI"

echo "Deploying homepage"
aws s3 rm s3://${CDN_DOMAIN}/storybook/home/ --recursive
aws s3 cp ./homepage/dist s3://${CDN_DOMAIN}/storybook/home/ --recursive
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths /storybook/home/*

echo "Home page deployment complete"
SITE_URL="https://${CDN_DOMAIN}/storybook/home/"
echo "Home page is updated at $SITE_URL"

# ---

echo "Sending Step Function Task Success"
TASK_TOKEN="$3"
echo "TASK_TOKEN=$TASK_TOKEN"
aws stepfunctions send-task-success --task-token $TASK_TOKEN --task-output "{\"SiteUrl\": \"$SITE_URL\"}"