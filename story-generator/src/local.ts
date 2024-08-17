import dotenv from "dotenv";
import handler from "./lambda_function";

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || "development";
dotenv.config({ path: ".env" });

/** Simulate local lambda handler event for local testing */
const main = async () => {
  // const event = {
  //   Command: "GenerateText",
  //   Title: "The fish that learned to fly",
  //   Description: `a fish that builds an airplane and flies through a rainbow.`,
  // };

  // const event = {
  //   Command: "GenerateImages",
  //   JobId: "72f5fe55-5d3f-47e1-936e-bf857b8e6aee",
  //   Title: "The fish that learned to fly",
  //   Description: `a fish that builds an airplane and flies through a rainbow.`,
  //   LinesS3Bucket: process.env.DATA_LAKE_S3_BUCKET_NAME!,
  //   LinesS3Key:
  //     "ik-dev-storybook-generator/2024-08-06/b900721e-e769-4e39-b289-38113eca0e0c.json",
  // };

  // const event = {
  //   Command: "SendConfirmationEmail",
  //   Title: "The bird in the circle",
  //   ToEmailAddress: process.env.EXAMPLE_TO_EMAIL_ADDRESS!,
  //   SiteUrl: "https://static.ikenley.com/storybook/the-bird-in-the-circle/",
  // };

  const event = {
    Command: "GenerateImages",
    Description:
      "A clique of unicorns harass their comrade Charley into reluctantly going on an adventure to Candy Mountain.",
    LinesS3Bucket: "924586450630-data-lake",
    Title: "Candy Mountain, Charlie!",
    LinesS3Key:
      "ik-dev-storybook/2024-08-16/eab82d50-772d-45e8-b656-4e7486ca0e42-text.json",
    JobId: "68d64b63-cba7-4b3f-983c-2245e575bed1",
  };

  const context: any = {};

  const callback = (error: any, result: any) => {
    console.error(`error= ${error}`);
    console.log(`result= ${JSON.stringify(result)}`);
  };

  await handler(event, context, callback);
};

main();
