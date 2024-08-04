/** Get ConfigOptions from env vars.
 * (This is a function to lazy-load and
 *    give bootstrap services time to inject env vars)
 */
export const getConfigOptions = () => {
  const config = {
    aws: {
      region: process.env.AWS_REGION,
    },
    s3: {
      bucketName: process.env.S3_BUCKET_NAME,
      keyPrefix: process.env.S3_BUCKET_KEY_PREFIX,
    },
  };

  return config;
};
