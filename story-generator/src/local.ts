import dotenv from "dotenv";
import handler from "./lambda_function";

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || "development";
dotenv.config({ path: ".env" });

/** Simulate local lambda handler event for local testing */
const main = async () => {
  const event = {
    Command: "GenerateText",
    Title: "The fish that learned to fly",
    Description: `a fish that builds an airplane and flies through a rainbow.`,
  };

  const context: any = {};

  const callback = (error: any, result: any) => {
    console.error(`error= ${error}`);
    console.log(`result= ${JSON.stringify(result)}`);
  };

  await handler(event, context, callback);
};

main();
