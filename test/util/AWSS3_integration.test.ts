import { assert } from "chai";
const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

require("dotenv").config();

const awsCreds = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  sessionToken: process.env.AWS_SESSION_TOKEN as string,
};

describe("Integration Test of AWS SDK Client to Create S3 Bucket", () => {
  it("connects AWS SDK v3 client and lists buckets", async () => {
    const client = new S3Client({
      region: "us-east-1",
      credentials: awsCreds,
    });
    const command = new ListBucketsCommand({});
    const response = await client.send(command);
    assert(response !== null);
    assert(response.$metadata.httpStatusCode === 200);
    expect(response.Buckets?.length >= 0);
    client.destroy();
  });
});
