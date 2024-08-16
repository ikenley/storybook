export type S3Config = {
  bucketName: string;
  keyPrefix: string;
};

export type ConfigOptions = {
  aws: {
    region: string;
  };
  cdnDomain: string;
  fromEmailAddress: string;
  s3: {
    dataLake: S3Config;
    static: S3Config;
  };
};

/** Get ConfigOptions from env vars.
 * (This is a function to lazy-load and
 *    give bootstrap services time to inject env vars)
 */
export const getConfigOptions = (): ConfigOptions => {
  const config = {
    aws: {
      region: process.env.AWS_REGION!,
    },
    cdnDomain: process.env.CDN_DOMAIN!,
    fromEmailAddress: process.env.FROM_EMAIL_ADDRESS!,
    s3: {
      dataLake: {
        bucketName: process.env.DATA_LAKE_S3_BUCKET_NAME!,
        keyPrefix: process.env.DATA_LAKE_S3_BUCKET_KEY_PREFIX!,
      },
      static: {
        bucketName: process.env.STATIC_S3_BUCKET_NAME!,
        keyPrefix: process.env.STATIC_S3_BUCKET_KEY_PREFIX!,
      },
    },
  };

  return config;
};
