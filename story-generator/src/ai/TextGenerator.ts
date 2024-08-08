import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { writeFile } from "fs/promises";
import * as path from "path";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ConfigOptions } from "../config/ConfigOptions";
import { getS3DatePrefix } from "./s3Util";

type TextGeneratorResponse = {
  jobId: string;
  s3Bucket: string;
  s3Key: string;
  s3Uri: string;
};

type S3Result = { s3Bucket: string; s3Key: string; s3Uri: string };

export default class ImageGeneratorService {
  private config: ConfigOptions;
  private bedrockRuntimeClient: BedrockRuntimeClient;
  private s3Client: S3Client;

  constructor(
    config: ConfigOptions,
    bedrockRuntimeClient: BedrockRuntimeClient,
    s3Client: S3Client
  ) {
    this.config = config;
    this.bedrockRuntimeClient = bedrockRuntimeClient;
    this.s3Client = s3Client;
  }

  /** Generate an image based on a prompt, save it to S3, and send image link. */
  async generate(
    jobId: string,
    title: string,
    desription: string
  ): Promise<TextGeneratorResponse> {
    const lines = await this.generateText(title, desription);

    const fileId = randomUUID();

    const filePath = await this.writeToJsonFile(fileId, lines);

    const s3Result = await this.uploadToS3(fileId, filePath);

    //return s3Result;
    return { jobId, ...s3Result };
  }

  /** Generate the text for the story.
   * Returnes the last 4 lines of the generated text as a string array.
   */
  async generateText(title: string, desription: string): Promise<string[]> {
    console.log("generateText", JSON.stringify({ title, desription }));
    const payload = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Write a 4-line rhyming children's poem. 

It has the title "${title}". It is about ${desription}.`,
        },
      ],
    };

    const input = {
      // InvokeModelRequest
      body: JSON.stringify(payload),
      contentType: "application/json",
      accept: "*/*",
      modelId: "anthropic.claude-3-5-sonnet-20240620-v1:0",
    };
    const command = new InvokeModelCommand(input);
    const response = await this.bedrockRuntimeClient.send(command);

    const decodedResponseBody = new TextDecoder().decode(response.body);
    const responseBody = JSON.parse(decodedResponseBody);
    const textResponse = responseBody.content[0].text;
    console.log("textResponse", JSON.stringify(textResponse));

    const lines = this.getLinesFromModelResponse(textResponse);
    console.log("lines", JSON.stringify({ lines }));

    return lines;
  }

  /** Gets last 4 lines from response.
   * Assumes that the last 4 lines will be the poem.
   */
  private getLinesFromModelResponse(modelTextResponse: string): string[] {
    const allLines = modelTextResponse.split(/\r?\n/) || [];
    const last4Lines = allLines.slice(-4);
    return last4Lines;
  }

  /** Writes lines to a local JSON file.
   * Returns the file path.
   */
  private async writeToJsonFile(
    fileId: string,
    lines: string[]
  ): Promise<string> {
    try {
      const filePath = path.join("/tmp", `${fileId}.json`);
      const jsonString = JSON.stringify(lines, null, 2);
      await writeFile(filePath, jsonString);
      return filePath;
    } catch (error: any) {
      console.error("Error parsing JSON:", JSON.stringify(error));
      throw new Error(error);
    }
  }

  async uploadToS3(fileId: string, filePath: string): Promise<S3Result> {
    const fileContent = readFileSync(filePath); // This is inefficient, but works for small files
    const datePrefix = getS3DatePrefix();
    const s3Bucket = this.config.s3.dataLake.bucketName;
    const s3Key = `${this.config.s3.dataLake.keyPrefix}/${datePrefix}/${fileId}.json`;
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
