import { requireEnv } from "./env.ts";

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
      region: requireEnv("AWS_REGION"),
    },
    cdnDomain: requireEnv("CDN_DOMAIN"),
    fromEmailAddress: requireEnv("FROM_EMAIL_ADDRESS"),
    s3: {
      dataLake: {
        bucketName: requireEnv("DATA_LAKE_S3_BUCKET_NAME"),
        keyPrefix: requireEnv("DATA_LAKE_S3_BUCKET_KEY_PREFIX"),
      },
      static: {
        bucketName: requireEnv("STATIC_S3_BUCKET_NAME"),
        keyPrefix: requireEnv("STATIC_S3_BUCKET_KEY_PREFIX"),
      },
    },
  };

  return config;
};
