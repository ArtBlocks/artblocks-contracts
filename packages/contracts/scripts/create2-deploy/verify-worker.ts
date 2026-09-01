import fs from "fs";

import { runVerification } from "../util/verification";

async function main() {
  const paramsFile = process.env.VERIFY_PARAMS_FILE;
  if (!paramsFile) {
    throw new Error("VERIFY_PARAMS_FILE environment variable not set");
  }

  const params = JSON.parse(fs.readFileSync(paramsFile, "utf-8"));

  console.log(
    `Verifying ${params.contractName || "contract"} at ${params.address}...`
  );

  try {
    await runVerification({
      address: params.address,
      constructorArguments: params.args || [],
      libraries:
        params.libraries && Object.keys(params.libraries).length > 0
          ? params.libraries
          : undefined,
      contract: params.contract,
    });
    console.log("VERIFICATION_SUCCESS");
  } catch (error: any) {
    if (error.message?.toLowerCase().includes("already verified")) {
      console.log("VERIFICATION_SUCCESS");
    } else {
      console.error(`Verification failed: ${error.message || error}`);
      process.exit(1);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
