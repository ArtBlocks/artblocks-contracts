import { createPBABBucket } from "../util/aws_s3";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const pbabTokenNames = [
  "Art Blocks x Pace Dev (Goerli)",
  "Art Blocks x Pace Stage (Goerli)",
];
const networkName = "goerli";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  for (const pbabTokenName of pbabTokenNames) {
    // Create Bucket
    console.log(
      `attempting to create PBAB bucket for ${pbabTokenName}, network ${networkName}`
    );
    await createPBABBucket(pbabTokenName, networkName);
    console.log(
      `pbab bucket created for ${pbabTokenName}, network ${networkName}`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
