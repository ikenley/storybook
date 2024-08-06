import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import * as path from "path";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3DatePrefix } from "./s3Util.js";

export default class ImageGeneratorService {
  constructor(config, bedrockRuntimeClient, s3Client) {
    this.config = config;
    this.bedrockRuntimeClient = bedrockRuntimeClient;
    this.s3Client = s3Client;
  }

  /** Generate an image based on a prompt, save it to S3, and send image link. */
  async generate(imageId, prompt) {
    const filePath = await this.createImage(imageId, prompt);

    const s3Result = await this.uploadToS3(imageId, filePath);

    return s3Result;
  }

  /** Generate an image based on a prompt */
  async createImage(imageId, prompt) {
    const input = {
      // InvokeModelRequest
      body: `{"text_prompts":[{"text":"${prompt}"}],"cfg_scale":10,"seed":0,"steps":50}`,
      contentType: "application/json",
      accept: "*/*",
      modelId: "stability.stable-diffusion-xl-v1",
    };
    const command = new InvokeModelCommand(input);
    console.log("createImage", JSON.stringify({ imageId, prompt }));
    const response = await this.bedrockRuntimeClient.send(command);

    const blobAdapter = response.body;
    const textDecoder = new TextDecoder("utf-8");
    const jsonString = textDecoder.decode(blobAdapter.buffer);

    try {
      const parsedData = JSON.parse(jsonString);
      const base64Data = parsedData.artifacts[0].base64;
      const filePath = path.join("/tmp", `${imageId}.png`);
      await writeFile(filePath, base64Data, { encoding: "base64" });
      return filePath;
    } catch (error) {
      console.error("Error parsing JSON:", JSON.stringify(error));
      throw new Error(error);
    }
  }

  async uploadToS3(imageId, filePath) {
    const fileContent = readFileSync(filePath); // This is inefficient, but works for small images
    const datePrefix = getS3DatePrefix();
    const s3Bucket = this.config.s3.bucketName;
    const s3Key = `${this.config.s3.keyPrefix}/${datePrefix}/${imageId}.png`;
    const input = {
      Body: fileContent,
      Bucket: s3Bucket,
      Key: s3Key,
    };
    console.log(
      "uploadToS3",
      JSON.stringify({ bucket: input.Bucket, s3Key: input.Key })
    );
    const command = new PutObjectCommand(input);
    await this.s3Client.send(command);

    const s3Uri = `s3://${s3Bucket}/${s3Key}`;
    return { s3Bucket, s3Key, s3Uri };
  }
}
