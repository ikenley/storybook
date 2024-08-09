import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import * as path from "path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { ConfigOptions } from "../config/ConfigOptions";
import { getS3DatePrefix } from "./s3Util";

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
