import { writeFile } from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { ConfigOptions } from "../config/ConfigOptions";
import FileService, { S3Result } from "../s3/FileService";
import * as textUtil from "./textUtil";

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
  private config: ConfigOptions;
  private bedrockRuntimeClient: BedrockRuntimeClient;
  private fileService: FileService;

  constructor(
    config: ConfigOptions,
    bedrockRuntimeClient: BedrockRuntimeClient,
    fileService: FileService
  ) {
    this.config = config;
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
  ): Promise<S3Result> {
    console.log(
      "generateImages",
      JSON.stringify({ jobId, title, description, linesS3Bucket, linesS3Key })
    );

    // Get lines from S3
    const lines = await this.fileService.readJsonFromS3<string[]>(
      linesS3Bucket,
      linesS3Key
    );
    console.log("lines", JSON.stringify(lines));

    // For the title + each line, generate an image
    const storyConfig: StorybookConfig = {
      cover: {
        pageNumber: 0,
        line: title,
        imgSrc: "",
      },
      pages: lines.map((line, ix) => {
        return { pageNumber: ix + 1, line, imgSrc: "" };
      }),
    };
    storyConfig.cover = await this.generatePage(
      jobId,
      title,
      description,
      storyConfig.cover
    );
    for (let i = 0; i < storyConfig.pages.length; i++) {
      const page = storyConfig.pages[i];
      storyConfig.pages[i] = await this.generatePage(
        jobId,
        title,
        description,
        page
      );
    }

    const storyConfigS3 = await this.uploadStorybookConfig(storyConfig);

    return storyConfigS3;
  }

  /** Generates the image for a given page and uploads it to S3.
   * Returns a new StoryBookPage with the imgSrc set to the S3 URL.
   */
  private async generatePage(
    jobId: string,
    title: string,
    description: string,
    page: StoryBookPage
  ): Promise<StoryBookPage> {
    const isCover = page.pageNumber === 0;

    // Generate image
    const prompt = textUtil.createPrompt(
      title,
      description,
      page.line,
      isCover
    );

    const imgPath = await this.createImage(prompt);

    // Upload to S3
    const fileName = textUtil.getFileName(page.line);
    const fileKeySuffix = `${jobId}/${fileName}`;
    const { bucketName, keyPrefix } = this.config.s3.static;
    const { s3Key } = await this.fileService.uploadToS3(
      imgPath,
      fileKeySuffix,
      bucketName,
      keyPrefix
    );

    // Return Page configuration
    const imgSrc = `https://${this.config.cdnDomain}/${s3Key}`;
    return { ...page, imgSrc };
  }

  /** Generate an image based on a prompt.
   * Returns the path to the generated image.
   */
  async createImage(prompt: string): Promise<string> {
    const imageId = randomUUID();
    const input = {
      // InvokeModelRequest
      body: `{"text_prompts":[{"text":"${prompt}"}, {"text": "Text", "weight": -1}],"cfg_scale":10,"seed":0,"steps":50}`,
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
    } catch (error: any) {
      console.error("Error parsing JSON:", JSON.stringify(error));
      throw new Error(error);
    }
  }

  /** Upload StoryBookConfig JSON file to S3 data lake */
  private async uploadStorybookConfig(
    storyconfig: StorybookConfig
  ): Promise<S3Result> {
    const storyConfigFilePath = await this.fileService.writeToJsonFile(
      storyconfig
    );
    const fileName = `${randomUUID()}-story-config.json`;
    const storyConfigS3 = await this.fileService.uploadToS3(
      storyConfigFilePath,
      fileName
    );

    return storyConfigS3;
  }
}
