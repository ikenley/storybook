import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { ConfigOptions } from "../config/ConfigOptions";

/** Handles sending confirmation emails via AWS SES */
export default class FileService {
  private config: ConfigOptions;
  private sesClient: SESClient;

  constructor(config: ConfigOptions, sesClient: SESClient) {
    this.config = config;
    this.sesClient = sesClient;
  }

  /** Writes lines to a local JSON file.
   * Writes to the /tmp directory.
   * Returns the file path.
   */
  public async sendConfirmationEmail(
    title: string,
    toEmail: string,
    siteUrl: string
  ): Promise<void> {
    console.log(
      "Sending confirmation email",
      JSON.stringify({ title, siteUrl })
    );

    const subject = this.getSubject(title);
    const body = this.getBody(title, siteUrl);

    await this.sendEmail(toEmail, subject, body);
  }

  private getSubject(title: string): string {
    return `Your story "${title}" is ready`;
  }

  private getBody(title: string, siteUrl: string): string {
    return `Your story "${title}" is ready! View it at: ${siteUrl}`;
  }

  /** Send email via SES */
  private async sendEmail(toEmail: string, subject: string, body: string) {
    console.log("sendEmail", JSON.stringify({ toEmail, subject }));
    const fromEmail = this.config.fromEmailAddress;

    const params = {
      Destination: {
        ToAddresses: [toEmail],
      },
      Message: {
        Body: {
          Html: {
            Charset: "UTF-8",
            Data: `<html><body>${body}<br/><br/>Best,<br/>-The Storybook team</body></html>`,
          },
          Text: {
            Charset: "UTF-8",
            Data: `${body}`,
          },
        },
        Subject: {
          Charset: "UTF-8",
          Data: `${subject}`,
        },
      },
      Source: fromEmail,
      ReplyToAddresses: [fromEmail],
    };

    try {
      const command = new SendEmailCommand(params);
      const response = await this.sesClient.send(command);
      console.log("MessageId", response.MessageId);
    } catch (err) {
      console.error(err);
    }
  }
}
