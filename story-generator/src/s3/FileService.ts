import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ConfigOptions } from "../config/ConfigOptions";
import { getS3DatePrefix } from "./s3Util";
import { NodeJsRuntimeStreamingBlobPayloadOutputTypes } from "@smithy/types/dist-types/streaming-payload/streaming-blob-payload-output-types";

export type S3Result = { s3Bucket: string; s3Key: string; s3Uri: string };

/** Handles local and S3 file I/O */
export default class FileService {
  private config: ConfigOptions;
  private s3Client: S3Client;

  constructor(config: ConfigOptions, s3Client: S3Client) {
    this.config = config;
    this.s3Client = s3Client;
  }

  /** Writes lines to a local JSON file.
   * Writes to the /tmp directory.
   * Returns the file path.
   */
  public async writeToJsonFile(
    data: any,
    fileId: string | null = null
  ): Promise<string> {
    try {
      const id = fileId ?? randomUUID();
      const filePath = path.join("/tmp", `${id}.json`);
      const jsonString = JSON.stringify(data, null, 2);
      await writeFile(filePath, jsonString);
      return filePath;
    } catch (error: any) {
      console.error("Error parsing JSON:", JSON.stringify(error));
      throw new Error(error);
    }
  }

  /** Uploads a given local file to S3.
   * It uses the date prefix and file key suffix to create the S3 key.
   * Returns the S3 bucket, key, and URI.
   */
  public async uploadToS3(
    filePath: string,
    fileKeySuffix: string,
    s3Bucket: string = this.config.s3.dataLake.bucketName,
    s3KeyPrefix: string = this.config.s3.dataLake.keyPrefix
  ): Promise<S3Result> {
    const fileContent = readFileSync(filePath); // This is inefficient, but works for small files
    const datePrefix = getS3DatePrefix();
    const s3Key = `${s3KeyPrefix}/${datePrefix}/${fileKeySuffix}`;
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

  /** Reads a JSON file from S3 as a given type */
  async readJsonFromS3<T>(s3Bucket: string, s3Key: string): Promise<T> {
    console.log("readJsonFromS3", JSON.stringify({ s3Bucket, s3Key }));

    const input = {
      Bucket: s3Bucket,
      Key: s3Key,
    };

    const command = new GetObjectCommand(input);
    const data = await this.s3Client.send(command);

    const dataAsString = await this.streamToString(data.Body as any);
    const parsedData = JSON.parse(dataAsString);

    return parsedData as T;
  }

  private streamToString(
    stream: NodeJsRuntimeStreamingBlobPayloadOutputTypes
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: any = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });
  }
}
