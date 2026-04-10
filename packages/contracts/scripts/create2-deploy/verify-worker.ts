import hre from "hardhat";
import fs from "fs";

async function main() {
  const paramsFile = process.env.VERIFY_PARAMS_FILE;
  if (!paramsFile) {
    throw new Error("VERIFY_PARAMS_FILE environment variable not set");
  }

  const params = JSON.parse(fs.readFileSync(paramsFile, "utf-8"));

  const verifyArgs: Record<string, any> = {
    address: params.address,
    constructorArguments: params.args || [],
  };

  if (params.libraries && Object.keys(params.libraries).length > 0) {
    verifyArgs.libraries = params.libraries;
  }

  if (params.contract) {
    verifyArgs.contract = params.contract;
  }

  console.log(
    `Verifying ${params.contractName || "contract"} at ${params.address}...`
  );

  try {
    await hre.run("verify:verify", verifyArgs);
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
