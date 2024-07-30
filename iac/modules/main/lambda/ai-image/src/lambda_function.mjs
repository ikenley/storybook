import { randomUUID } from "crypto";
import { RekognitionClient } from "@aws-sdk/client-rekognition";
import { S3Client } from "@aws-sdk/client-s3";
import { getConfigOptions } from "./config/ConfigOptions.mjs";
import TagService from "./ai/TagService.mjs";

export const handler = async (event, context, callback) => {
  console.log(`event= ${JSON.stringify(event)}`);

  const config = getConfigOptions();

  let result = {};
  if (event.command === "GetMetadata") {
    result = getMetadata();
  } else if (event.command === "CreateTags") {
    const rekognitionClient = new RekognitionClient();
    const s3Client = new S3Client();

    const tagService = new TagService(
      rekognitionClient,
      s3Client,
      config.s3.bucketName,
      config.s3.keyPrefix
    );

    result = await tagService.createTagFile(
      event.imageId,
      event.imageSBucket,
      event.imageS3Key
    );
  }

  console.log(`result= ${JSON.stringify(result)}`);

  callback(null, result);
};

/** Creates imageId and other metadata */
export const getMetadata = () => {
  return { imageId: randomUUID() };
};

export default handler;
