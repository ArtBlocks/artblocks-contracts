import { assert } from "chai";
const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

describe("Integration Test of AWS SDK Client to Create S3 Bucket", () => {
  it("connects AWS SDK v3 client and lists buckets", async () => {
    const client = new S3Client({ region: "us-east-1" });
    const command = new ListBucketsCommand({});
    const response = await client.send(command);
    assert(response !== null);
    assert(response.$metadata.httpStatusCode === 200);
    expect(response.Buckets?.length >= 0);
    client.destroy();
  });
});
