import dotenv from "dotenv";
import { randomUUID } from "crypto";
import { parseArgs } from "node:util";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { S3Client } from "@aws-sdk/client-s3";
import {
  SendTaskSuccessCommand,
  SendTaskFailureCommand,
  SFNClient,
} from "@aws-sdk/client-sfn";
import { getConfigOptions } from "./config/ConfigOptions.mjs";
import ImageGeneratorService from "./ai/ImageGeneratorService.mjs";

// Set the NODE_ENV to 'development' by default
process.env.NODE_ENV = process.env.NODE_ENV || "development";
dotenv.config({ path: ".env" });

const main = async () => {
  const args = getArguments();
  console.log("args", JSON.stringify(args));
  const imageId = args.id;
  const { prompt, taskToken } = args;

  const config = getConfigOptions();

  const bedrockClient = new BedrockRuntimeClient();
  const s3Client = new S3Client();
  const stepFnClient = new SFNClient();

  const imageGeneratorService = new ImageGeneratorService(
    config,
    bedrockClient,
    s3Client
  );

  let output = null;
  try {
    output = await imageGeneratorService.generate(imageId, prompt);
  } catch (e) {
    const failureCommand = new SendTaskFailureCommand({
      taskToken,
      error: "500",
      cause: JSON.stringify(e),
    });
    await this.stepFnClient.command(failureCommand);
    console.error("Error during image generation", e);
    throw new Error("Error during image generation", e);
  }
  console.log("output", JSON.stringify(output));

  const stepFnCommand = new SendTaskSuccessCommand({
    taskToken,
    output: JSON.stringify(output),
  });
  await stepFnClient.send(stepFnCommand);

  return result;
};

/** Parse CLI arguments.
 * This could be a library like yargs or commander, but for now we'll avoid dependencies.
 */
const getArguments = () => {
  const args = process.args;
  const options = {
    id: {
      type: "string",
      short: "i",
    },
    prompt: {
      type: "string",
      short: "p",
    },
    "task-token": { type: "string", short: "t" },
  };

  const { values, positionals } = parseArgs({
    args,
    options,
    allowPositionals: true,
  });

  // Basic validation
  if (!values.id) {
    values.id = randomUUID();
  }
  if (!values.prompt) {
    throw new Error("--prompt argument is required.");
  }
  if (!values["task-token"]) {
    throw new Error("--task-token argument is required.");
  }

  values.taskToken = values["task-token"];

  return { command: positionals[0], ...values };
};

main();
