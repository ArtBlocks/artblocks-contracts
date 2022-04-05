import { formatTitleCaseToKebabCase } from "./format";
const { S3Client, CreateBucketCommand } = require("@aws-sdk/client-s3");

const s3Client = new S3Client({ region: "us-east-1" });

const createBucket = async (client: any, bucketName: string) => {
  const input = {
    Bucket: bucketName,
  };
  const command = new CreateBucketCommand(input);
  return await client.send(command);
};

const createPBABBuckets = async (client: any, pbabTokenName: string) => {
  let payload = {};
  const key = formatTitleCaseToKebabCase(pbabTokenName);
  if (client === undefined) {
    client = s3Client;
  }

  // Create PBAB bucket for staging
  const stagingBucketName = `${key}-staging`;
  const stagingBucketResponse = await createBucket(s3Client, stagingBucketName);
  payload["staging"] = stagingBucketResponse;
  console.log(`Created s3 bucket for ${stagingBucketName}`);

  // Create PBAB bucket for prod
  const prodBucketName = `${key}-mainnet`;
  const prodBucketResponse = await createBucket(s3Client, prodBucketName);
  payload["production"] = prodBucketResponse;
  console.log(`Created s3 bucket for ${prodBucketName}`);

  return payload;
};

export { createPBABBuckets, createBucket };
