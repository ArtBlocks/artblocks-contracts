import { getPBABBucketName, getBucketURL } from "./format";
const {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
  DeletePublicAccessBlockCommand,
  PutBucketAclCommand,
} = require("@aws-sdk/client-s3");

// Docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/index.html

const supportedNetworks = [
  "mainnet",
  "arbitrum",
  "sepolia",
  "arbitrum-sepolia",
  "base",
];

const awsCreds = {
  accessKeyId: process.env.PROD_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.PROD_AWS_SECRET_ACCESS_KEY,
};

const s3Client = new S3Client({
  region: "us-east-1",
  credentials: awsCreds,
});

const createBucket = async (bucketName: string, client: any) => {
  // create bucket, default blocks public access
  const input = {
    Bucket: bucketName,
    ObjectLockEnabledForBucket: false,
    ObjectOwnership: "ObjectWriter",
  };
  const command = new CreateBucketCommand(input);
  const return_ = await client.send(command);
  // remove block public access
  const input2 = {
    Bucket: bucketName,
  };
  const command2 = new DeletePublicAccessBlockCommand(input2);
  await client.send(command2);
  // set bucket ACL to public-read
  const input3 = {
    Bucket: bucketName,
    ACL: "public-read",
  };
  const command3 = new PutBucketAclCommand(input3);
  await client.send(command3);
  // return create bucket response
  return return_;
};

const updateBucketCors = async (bucketName: string, client: any) => {
  const corsRules = [
    {
      AllowedMethods: ["GET", "PUT", "POST"],
      AllowedOrigins: ["*"],
      AllowedHeaders: ["*"],
      ExposeHeaders: ["ETag"],
    },
  ];
  const input = {
    Bucket: bucketName,
    CORSConfiguration: {
      CORSRules: corsRules,
    },
  };
  const command = new PutBucketCorsCommand(input);
  return await client.send(command);
};

const createEngineBucket = async (
  pbabTokenName: string,
  networkName: string,
  client?: any,
  isTest: boolean = false
) => {
  let payload = {};
  payload["response"] = {};
  payload["url"] = "";
  let bucketName = "";

  // throw error for unsupported networks
  if (!supportedNetworks.includes(networkName) && isTest === false) {
    throw new Error("Unsupported network");
  }

  if (client === undefined) {
    client = s3Client;
  }

  // create bucket + update configuration
  bucketName = getPBABBucketName(pbabTokenName, networkName);
  const bucketURL = getBucketURL(bucketName);
  const bucketResponse = await createBucket(bucketName, client);
  await updateBucketCors(bucketName, client);
  payload["response"] = bucketResponse;
  payload["url"] = bucketURL;

  // return payload and bucket name
  console.log(`Created s3 bucket for ${bucketURL}`);
  return { payload, bucketName };
};

export { createEngineBucket, createBucket, updateBucketCors };
