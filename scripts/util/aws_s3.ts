import { formatTitleCaseToKebabCase } from "./format";
const { S3Client, CreateBucketCommand } = require("@aws-sdk/client-s3");
const { fromEnv } = require("@aws-sdk/credential-providers");

// Docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/index.html

const s3Client = new S3Client({
  region: "us-east-1",
  credentials: fromEnv(),
});

const createBucket = async (bucketName: string, client: any) => {
  const input = {
    Bucket: bucketName,
  };
  const command = new CreateBucketCommand(input);
  return await client.send(command);
};

const createPBABBuckets = async (
  pbabTokenName: string,
  client: any = s3Client
) => {
  let payload = {};
  const key = formatTitleCaseToKebabCase(pbabTokenName);

  // Create PBAB bucket for staging
  const stagingBucketName = `${key}-staging`;
  const stagingBucketResponse = await createBucket(stagingBucketName, client);
  payload["staging"] = stagingBucketResponse;
  console.log(`Created s3 bucket for ${stagingBucketName}`);

  // Create PBAB bucket for prod
  const prodBucketName = `${key}-mainnet`;
  const prodBucketResponse = await createBucket(prodBucketName, client);
  payload["production"] = prodBucketResponse;
  console.log(`Created s3 bucket for ${prodBucketName}`);

  return payload;
};

export { createPBABBuckets, createBucket };
