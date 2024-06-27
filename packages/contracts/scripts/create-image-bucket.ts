import { createEngineBucket } from "./util/aws_s3";

async function main() {
  // create image bucket
  let imageBucketCreated = false;
  let bucketNameBase = "Generative Goods";
  let networkName = "base";
  let bucketName = "TBD";
  try {
    const result = await createEngineBucket(bucketNameBase, networkName);
    bucketName = result.bucketName;
    console.log(`[INFO] Created image bucket ${bucketName}`);
    imageBucketCreated = true;
  } catch (error) {
    console.log(`[ERROR] Failed to create image bucket`);
  }

  if (!imageBucketCreated) {
    console.log(
      `[ACTION] Manually create an image bucket a different way or fix this script.`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
