import { assert } from "chai";
const { mockClient } = require("aws-sdk-client-mock");
const { S3Client, CreateBucketCommand } = require("@aws-sdk/client-s3");
import { createPBABBuckets, createBucket } from "../../scripts/util/aws_s3";
import { formatTitleCaseToKebabCase } from "../../scripts/util/format";

// Mock client documentation: https://www.npmjs.com/package/aws-sdk-client-mock
const s3ClientMock = mockClient(new S3Client({}));

const createBucketResponse = {
  Location: "/foobar-pbab-bucket",
};

const createPBABBucketsResponse = {
  staging: {
    Location: "/foobar-pbab-bucket-staging",
  },
  production: {
    Location: "/foobar-pbab-bucket-mainnet",
  },
};

describe("Create S3 Bucket for PBAB", () => {
  beforeEach(() => {
    s3ClientMock.reset();
    s3ClientMock.on(CreateBucketCommand).resolves(createBucketResponse);
  });

  it("creates s3 bucket", async () => {
    const pbabBucketName = "foobar-pbab-bucket";
    const result = await createBucket(pbabBucketName, s3ClientMock as any);
    assert(result !== null);
    assert(result?.["Location"] === "/foobar-pbab-bucket");
  });

  it("creates s3 bucket for staging and prod", async () => {
    const pbabTokenName = "Foobar PBAB Bucket";
    const result = await createPBABBuckets(pbabTokenName, s3ClientMock as any);
    assert(result !== null);
    assert(
      result?.["staging"]["Location"] ===
        createPBABBucketsResponse["staging"]["Location"]
    );
    assert(
      result?.["production"]["Location"] ===
        createPBABBucketsResponse["production"]["Location"]
    );
  });
});

describe("Format bucket name", () => {
  it("formats PBAB token name to hyphened lowercase", () => {
    const pbabTokenName = "Foobar PBAB Bucket";
    const bucketName = formatTitleCaseToKebabCase(pbabTokenName);
    assert(bucketName === "foobar-pbab-bucket");
  });
});
