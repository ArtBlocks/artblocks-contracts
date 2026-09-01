import hre from "hardhat";

/**
 * Run a programmatic verification against the right provider for this network.
 *
 * @dev `verify:verify` dispatches only to `verify:etherscan` and
 * `verify:sourcify` — it never reaches `verify:blockscout`, even when
 * `blockscout.enabled` is true. (The `verify` CLI task does, via
 * `verify:get-verification-subtasks`, which is why the same contract verifies
 * from the command line and fails from a script.) Networks configured under
 * `blockscout.customChains` therefore fail with "the plugin doesn't recognize
 * it as a supported chain" unless the blockscout subtask is invoked directly.
 * Shape (chainId 360) is the only such network here.
 */
export async function runVerification(params: {
  address: string;
  constructorArguments?: any[];
  libraries?: Record<string, string>;
  contract?: string;
}) {
  const blockscout = (hre.config as any).blockscout;
  const usesBlockscout =
    blockscout?.enabled === true &&
    (blockscout.customChains ?? []).some(
      (chain: any) => chain.network === hre.network.name
    );

  if (usesBlockscout) {
    // @dev the blockscout subtask accepts no constructor arguments — it submits
    // an empty string and Blockscout recovers them from the creation
    // transaction.
    await hre.run("verify:blockscout", {
      address: params.address,
      ...(params.libraries ? { libraries: params.libraries } : {}),
      ...(params.contract ? { contract: params.contract } : {}),
    });
    return;
  }

  await hre.run("verify:verify", {
    address: params.address,
    constructorArguments: params.constructorArguments ?? [],
    ...(params.libraries ? { libraries: params.libraries } : {}),
    ...(params.contract ? { contract: params.contract } : {}),
  });
}

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
    await runVerification({
      address: contractAddress,
      constructorArguments,
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
