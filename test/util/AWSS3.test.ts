import { assert } from "chai";
const { mockClient } = require("aws-sdk-client-mock");
const {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
} = require("@aws-sdk/client-s3");
import {
  createPBABBucket,
  createBucket,
  updateBucketCors,
} from "../../scripts/util/aws_s3";
import {
  formatTitleCaseToKebabCase,
  getBucketURL,
  getPBABBucketName,
} from "../../scripts/util/format";

// Mock client documentation: https://www.npmjs.com/package/aws-sdk-client-mock
const s3ClientMock = mockClient(new S3Client({}));

const pbabTokenName = "Foobar PBAB Bucket";
const networkName = "rinkeby";
const pbabBucketName = getPBABBucketName(pbabTokenName, networkName);
const pbabBucketURL = getBucketURL(pbabBucketName);

const expectedCreateBucketResponse = {
  Location: `/${pbabBucketName}`,
};

const expectedCreatePBABBucketResponse = {
  url: pbabBucketURL,
  response: expectedCreateBucketResponse,
};

const expectedUpdateCorsResponse = {
  $metadata: {
    httpStatusCode: 200,
    requestId: undefined,
    extendedRequestId: "ab123",
    cfId: undefined,
    attempts: 1,
    totalRetryDelay: 0,
  },
};

describe("Create S3 Bucket for PBAB", () => {
  beforeEach(() => {
    s3ClientMock.reset();
    s3ClientMock.on(CreateBucketCommand).resolves(expectedCreateBucketResponse);
    s3ClientMock.on(PutBucketCorsCommand).resolves(expectedUpdateCorsResponse);
  });

  it("creates s3 bucket", async () => {
    const result = await createBucket(pbabBucketName, s3ClientMock as any);
    assert(result?.["Location"] === `/${pbabBucketName}`);
  });

  it("updates bucket cors", async () => {
    const result = await updateBucketCors(pbabBucketName, s3ClientMock as any);
    assert(result?.["$metadata"]["httpStatusCode"] === 200);
    assert(result?.["$metadata"]["extendedRequestId"] === "ab123");
  });

  it("creates s3 bucket with pbab naming conventions", async () => {
    const pbabTokenName = "Foobar PBAB Bucket";
    const isTest = true;
    const result = await createPBABBucket(
      pbabTokenName,
      networkName,
      s3ClientMock as any,
      isTest
    );
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
    const networkName = "rinkeby";
    const pbabBucketName = getPBABBucketName(pbabTokenName, networkName);
    const pbabBucketURL = getBucketURL(pbabBucketName);
    assert(
      pbabBucketName.split("-")[pbabBucketName.split("-").length - 1] ===
        networkName
    );
    assert(pbabBucketURL === `https://${pbabBucketName}.s3.amazonaws.com`);
  });
});
