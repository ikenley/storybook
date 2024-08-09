import { writeFile } from "fs/promises";
import * as path from "path";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import FileService from "..//s3/FileService";

export type StoryBookPage = {
  pageNumber: number;
  line: string;
  imgSrc: string;
};

export type StorybookConfig = {
  cover: StoryBookPage;
  pages: StoryBookPage[];
};

export default class ImageGeneratorService {
  private bedrockRuntimeClient: BedrockRuntimeClient;
  private fileService: FileService;

  constructor(
    bedrockRuntimeClient: BedrockRuntimeClient,
    fileService: FileService
  ) {
    this.bedrockRuntimeClient = bedrockRuntimeClient;
    this.fileService = fileService;
  }

  /** Generate an image based on a prompt, save it to S3, and send image link. */
  public async generate(
    jobId: string,
    title: string,
    description: string,
    linesS3Bucket: string,
    linesS3Key: string
  ): Promise<StorybookConfig> {
    // Get lines from S3
    // For the title + each line
    // Generate an image
    // Upload image to S3
    // Upload storyBookConfig to S3

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
}
