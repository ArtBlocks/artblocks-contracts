const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");

describe("Integration Test of AWS SDK Client to Create S3 Bucket", () => {
  it("connects AWS SDK v3 client and lists buckets", async () => {
    const client = new S3Client({ region: "us-east-1" });
    const command = new ListBucketsCommand({});
    const response = await client.send(command);
    expect(response).toBeDefined();
    expect(response.$metadata.httpStatusCode).toEqual(200);
    expect(response.Buckets?.length).toBeGreaterThan(0)
    client.destroy();
  });
});
