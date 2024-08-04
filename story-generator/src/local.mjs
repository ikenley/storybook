import dotenv from "dotenv";
import { getConfigOptions } from "./config/ConfigOptions.mjs";
import handler from "./lambda_function.mjs";

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || "development";
dotenv.config({ path: ".env" });

/** Simulate local lambda handler event for local testing */
const main = async () => {
  const config = getConfigOptions();

  const event = {
    command: "CreateTags",
    imageId: "65d36f88-b6fd-4330-b8e9-b0a76f7220f3",
    imageSBucket: config.s3.bucketName,
    imageS3Key:
      "ik-dev-step-demo-ai-image-task/2024-07-23/65d36f88-b6fd-4330-b8e9-b0a76f7220f3.png",
  };

  const callback = (error, result) => {
    console.error(`error= ${error}`);
    console.log(`result= ${JSON.stringify(result)}`);
  };

  await handler(event, null, callback);
};

main();
