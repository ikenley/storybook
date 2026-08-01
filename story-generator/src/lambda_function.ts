import { randomUUID } from "node:crypto";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { S3Client } from "@aws-sdk/client-s3";
import { SESClient } from "@aws-sdk/client-ses";
import { GoogleGenAI } from "@google/genai";
import type { Context } from "aws-lambda";
import ImageGeneratorService from "./ai/ImageGeneratorService";
import TextGenerator, { type TextGeneratorResponse } from "./ai/TextGenerator";
import { type ConfigOptions, getConfigOptions } from "./config/ConfigOptions";
import { requireEnv } from "./config/env";
import EmailService from "./email/EmailService";
import FileService from "./s3/FileService";

export const handler = async (event: any, _context: Context) => {
	console.log(`event= ${JSON.stringify(event)}`);

	const config = getConfigOptions();

	let result = {};
	if (event.Command === "GenerateText") {
		const title = event.Title;
		const description = event.Description;
		result = await generateText(config, title, description);
	} else if (event.Command === "GenerateImages") {
		const jobId = event.JobId;
		const title = event.Title;
		const description = event.Description;
		const artNote = event.ArtNote;
		const linesS3Bucket = event.LinesS3Bucket;
		const linesS3Key = event.LinesS3Key;
		result = await generateImages(
			config,
			jobId,
			title,
			description,
			artNote,
			linesS3Bucket,
			linesS3Key,
		);
	} else if (event.Command === "SendConfirmationEmail") {
		const title = event.Title;
		const toEmailAddress = event.ToEmailAddress;
		const siteUrl = event.SiteUrl;
		result = await sendConfirmationEmail(
			config,
			title,
			toEmailAddress,
			siteUrl,
		);
	}

	console.log(`result= ${JSON.stringify(result)}`);

	return result;
};

const generateText = async (
	config: ConfigOptions,
	title: string,
	description: string,
): Promise<TextGeneratorResponse> => {
	const bedrockRuntimeClient = new BedrockRuntimeClient({
		region: config.aws.region,
	});
	const s3Client = new S3Client({
		region: config.aws.region,
	});
	const jobId = randomUUID();

	const fileService = new FileService(config, s3Client);
	const textGenerator = new TextGenerator(bedrockRuntimeClient, fileService);
	const result = await textGenerator.generate(jobId, title, description);

	return result;
};

const generateImages = async (
	config: ConfigOptions,
	jobId: string,
	title: string,
	description: string,
	artNote: string,
	linesS3Bucket: string,
	linesS3Key: string,
) => {
	const genAI = new GoogleGenAI({ apiKey: requireEnv("GEMINI_API_KEY") });
	const s3Client = new S3Client({
		region: config.aws.region,
	});

	const fileService = new FileService(config, s3Client);
	const imageGenerator = new ImageGeneratorService(config, genAI, fileService);

	const result = await imageGenerator.generate(
		jobId,
		title,
		description,
		artNote,
		linesS3Bucket,
		linesS3Key,
	);

	return result;
};

/** Send confirmation email via SES */
const sendConfirmationEmail = async (
	config: ConfigOptions,
	title: string,
	toEmailAddress: string,
	siteUrl: string,
) => {
	const sesClient = new SESClient();
	const emailService = new EmailService(config, sesClient);

	await emailService.sendConfirmationEmail(title, toEmailAddress, siteUrl);

	return { status: "success" };
};

export default handler;
