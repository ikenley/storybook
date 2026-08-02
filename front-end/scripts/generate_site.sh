#!/usr/bin/env bash
# Generate static site and deploy to S3
#
# Fail fast: without this, a failed build or aws call does not stop the script,
# and it goes on to deploy stale output and report task success to the Step
# Function. Required inputs: $1 (story config S3 URI) and $3 (task token) from
# the state machine's Command override; BASE_URL from its Environment override;
# CDN_DOMAIN, DISTRIBUTION_ID and HOME_CONFIG_S3_URI from the task definition.
set -euo pipefail

echo "Generating site"

echo "Downloading story config"
CONFIG_S3_URI="$1"
TASK_TOKEN="$3"
echo "CONFIG_S3_URI=$CONFIG_S3_URI"

# The GenerateStaticSite state uses ecs:runTask.waitForTaskToken with no
# TimeoutSeconds, so it waits on this token indefinitely. Now that set -e can
# abort before the send-task-success at the end, any failure must actively
# report back or the execution hangs forever.
#
# Trapping EXIT rather than ERR on purpose: a `set -u` unbound-variable error
# exits bash without running the ERR trap, which would leave a misconfigured
# task hanging. EXIT catches that case too.
on_exit() {
  exit_code=$?
  [ "$exit_code" -eq 0 ] && exit 0
  echo "generate_site.sh failed with exit code ${exit_code}; reporting task failure"
  # || true so a failure inside the failure path cannot mask the real code.
  aws stepfunctions send-task-failure \
    --task-token "$TASK_TOKEN" \
    --error "GenerateSiteFailed" \
    --cause "generate_site.sh exited with code ${exit_code}" || true
  exit "$exit_code"
}
trap on_exit EXIT
aws s3 cp "$CONFIG_S3_URI" ./src/story_config.json

echo "Loading environment variables"
export BASE_URL=$BASE_URL
echo "BASE_URL=$BASE_URL"

echo "Building site"
npm run build

echo "Deploying site"
aws s3 cp dist "s3://${CDN_DOMAIN}${BASE_URL}/" --recursive
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "${BASE_URL}/*"

echo "Deployment complete"
SITE_URL="https://${CDN_DOMAIN}${BASE_URL}/"
echo "Site is live at $SITE_URL"

# ---

echo "Update homepage"

echo "Download homepage config"
HOME_CONFIG_PATH="./homepage/src/home_config.json"
HOME_CONFIG_PATH_TMP="./homepage/src/home_config.tmp.json"
aws s3 cp "$HOME_CONFIG_S3_URI" "$HOME_CONFIG_PATH"

echo "Append new title to home_config"
# TODO
TITLE=$(jq '.cover.line' ./src/story_config.json)
echo "TITLE=$TITLE"
# Use jq to parse home_config and append the title
# You cannot overwrite in place, so we use a tmp file
jq ".titles += [$TITLE]" "$HOME_CONFIG_PATH" > "$HOME_CONFIG_PATH_TMP"
mv "$HOME_CONFIG_PATH_TMP" "$HOME_CONFIG_PATH"

echo "Build homepage"
npm run build-home

echo "Upload updated home_config"
aws s3 cp "$HOME_CONFIG_PATH" "$HOME_CONFIG_S3_URI"

echo "Deploying homepage"
aws s3 rm "s3://${CDN_DOMAIN}/storybook/home/" --recursive
aws s3 cp ./homepage/dist "s3://${CDN_DOMAIN}/storybook/home/" --recursive
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" --paths "/storybook/home/*"

echo "Home page deployment complete"
HOME_URL="https://${CDN_DOMAIN}/storybook/home/"
echo "Home page is updated at $HOME_URL"

# ---

echo "Sending Step Function Task Success"
aws stepfunctions send-task-success \
  --task-token "$TASK_TOKEN" \
  --task-output "$(jq -nc --arg site "$SITE_URL" --arg home "$HOME_URL" \
    '{SiteUrl: $site, HomeUrl: $home}')"