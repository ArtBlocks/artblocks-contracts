import { assert } from "chai";
const { mockClient } = require("aws-sdk-client-mock");
const { S3Client, CreateBucketCommand } = require("@aws-sdk/client-s3");
import { createPBABBucket, createBucket } from "../../scripts/util/aws_s3";
import {
  formatTitleCaseToKebabCase,
  getBucketURL,
  getPBABBucketName,
} from "../../scripts/util/format";

require("dotenv").config();
const environment = process.env.environment || "development";

// Mock client documentation: https://www.npmjs.com/package/aws-sdk-client-mock
const s3ClientMock = mockClient(new S3Client({}));

const pbabTokenName = "Foobar PBAB Bucket";
const pbabBucketName = getPBABBucketName(pbabTokenName);
const pbabBucketURL = getBucketURL(pbabBucketName);

const createBucketResponse = {
  Location: `/${pbabBucketName}`,
};

const expectedCreatePBABBucketResponse = {
  url: pbabBucketURL,
  response: createBucketResponse,
};

describe("Create S3 Bucket for PBAB", () => {
  beforeEach(() => {
    s3ClientMock.reset();
    s3ClientMock.on(CreateBucketCommand).resolves(createBucketResponse);
  });

  it("creates s3 bucket", async () => {
    const result = await createBucket(pbabBucketName, s3ClientMock as any);
    assert(result?.["Location"] === `/${pbabBucketName}`);
  });

  it("creates s3 bucket with pbab naming conventions", async () => {
    const pbabTokenName = "Foobar PBAB Bucket";
    const result = await createPBABBucket(pbabTokenName, s3ClientMock as any);
    assert(
      result?.["response"]["Location"] ===
        expectedCreatePBABBucketResponse["response"]["Location"]
    );
    assert(result?.["url"] === expectedCreatePBABBucketResponse["url"]);
  });
});

describe("Format PBAB token name into S3 bucket name and url", () => {
  it("formats PBAB token name to hyphened lowercase", () => {
    const pbabTokenName = "Foobar PBAB Bucket";
    const bucketName = formatTitleCaseToKebabCase(pbabTokenName);
    assert(bucketName === "foobar-pbab-bucket");
  });

  it("formats PBAB bucket name to full url", () => {
    const pbabTokenName = "Foobar PBAB Bucket";
    const pbabBucketName = getPBABBucketName(pbabTokenName);
    const pbabBucketURL = getBucketURL(pbabBucketName);
    assert(
      pbabBucketName.split("-")[pbabBucketName.split("-").length - 1] ===
        environment
    );
    assert(pbabBucketURL === `https://${pbabBucketName}.s3.amazonaws.com`);
  });
});
