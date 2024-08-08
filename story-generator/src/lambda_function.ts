import { randomUUID } from "crypto";
import { S3Client } from "@aws-sdk/client-s3";
import { Handler } from "aws-lambda";
import { getConfigOptions } from "./config/ConfigOptions";
import TextGenerator from "./ai/TextGenerator";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

export const handler: Handler = async (event, _context, callback) => {
  console.log(`event= ${JSON.stringify(event)}`);

  const config = getConfigOptions();

  let result = {};
  if (event.Command === "GenerateText") {
    const bedrockRuntimeClient = new BedrockRuntimeClient({
      region: config.aws.region,
    });
    const s3Client = new S3Client({
      region: config.aws.region,
    });
    const jobId = randomUUID();
    const title = event.Title;
    const description = event.Description;

    const textGenerator = new TextGenerator(
      config,
      bedrockRuntimeClient,
      s3Client
    );
    result = await textGenerator.generate(jobId, title, description);
  }

  console.log(`result= ${JSON.stringify(result)}`);

  callback(null, result);
};

export default handler;
