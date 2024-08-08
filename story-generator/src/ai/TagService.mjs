import { DetectLabelsCommand } from "@aws-sdk/client-rekognition";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3DatePrefix } from "./s3Util.mjs";

/** Service which creates ML-based tags for an image, and then saves the results to S3 */
export default class TagService {
  constructor(rekognitionClient, s3Client, s3BucketName, s3BucketPrefix) {
    this.rekognitionClient = rekognitionClient;
    this.s3Client = s3Client;
    this.s3BucketPrefix = s3BucketPrefix;
    this.s3BucketName = s3BucketName;
  }

  /** Create ML-based tags for a given image, then write to a JSON file and copy to S3 */
  async createTagFile(imageId, imageSBucket, imageS3Key) {
    console.log(
      `createTagFile:args ${JSON.stringify({
        imageId,
        imageSBucket,
        imageS3Key,
      })}`
    );

    const tags = await this.createTags(imageSBucket, imageS3Key);
    const s3Key = await this.writeTagsToS3(imageId, tags);

    const s3BucketName = this.s3BucketName;
    const s3Uri = `s3://${s3BucketName}/${s3Key}`;
    return { s3BucketName, s3Key, s3Uri };
  }

  async createTags(imageSBucket, imageS3Key) {
    console.log(
      `createTags:args ${JSON.stringify({ imageSBucket, imageS3Key })}`
    );

    const command = new DetectLabelsCommand({
      Image: {
        S3Object: {
          Bucket: imageSBucket,
          Name: imageS3Key,
        },
      },
      MaxLabels: 50,
      MinConfidence: 50,
      Features: ["GENERAL_LABELS"],
    });
    const response = await this.rekognitionClient.send(command);
    const labels = response.Labels || [];

    const labelNames =
      labels.map((lbl) => {
        return { [lbl.Name]: lbl.Confidence };
      }) || [];

    console.log("labelNames", labelNames);

    return labelNames;
  }

  async writeTagsToS3(imageId, tags) {
    const datePrefix = getS3DatePrefix();
    const s3Key = `${this.s3BucketPrefix}/${datePrefix}/${imageId}-tags.json`;

    const params = {
      Bucket: this.s3BucketName,
      Key: s3Key,
      Body: JSON.stringify(tags),
    };

    console.log(`writeTagsToS3:params ${JSON.stringify(params)}`);
    const command = new PutObjectCommand(params);
    await this.s3Client.send(command);
    return s3Key;
  }
}
