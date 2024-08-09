import { randomUUID } from "crypto";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import FileService from "src/s3/FileService";

export type TextGeneratorResponse = {
  jobId: string;
  s3Bucket: string;
  s3Key: string;
  s3Uri: string;
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
  async generate(
    jobId: string,
    title: string,
    desription: string
  ): Promise<TextGeneratorResponse> {
    const lines = await this.generateText(title, desription);

    const fileId = randomUUID();

    const filePath = await this.fileService.writeToJsonFile(fileId, lines);

    const s3Result = await this.fileService.uploadToS3(fileId, filePath);

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
}
