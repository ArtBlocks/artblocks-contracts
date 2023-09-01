import hre from "hardhat";

// Perform automated verification on etherscan, and if it fails, provide the standard verification command
// @dev does not support complex constructor arguments that require external json files for constructor args (e.g. V3 Engine core)
export async function tryVerify(
  contractName: string,
  contractAddress: string,
  constructorArguments: any[],
  networkName: string
) {
  const standardVerify = "yarn hardhat verify";
  try {
    console.log(`[INFO] Verifying ${contractName} contract deployment...`);
    await hre.run("verify:verify", {
      address: contractAddress,
      constructorArguments: constructorArguments,
    });
    console.log(
      `[INFO] ${contractName} contract verified on Etherscan at ${contractAddress}`
    );
  } catch (error) {
    console.log(
      `[WARN] Etherscan verification of ${contractName} failed: ${error}`
    );
    console.log(`[ACTION] Verify ${contractName} contract deployment with:`);
    console.log(
      `${standardVerify} --network ${networkName} ${contractAddress} ${constructorArguments.join(
        " "
      )}`
    );
  }
}
