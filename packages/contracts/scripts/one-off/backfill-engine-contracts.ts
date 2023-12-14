import { contract, ethers } from "hardhat";
import contractsQueryResult from "./engine-contracts-staging.json";

// This script is a one-off script to backfill the core registry with all of the
// contracts that have been deployed to a network. It is a one-off script that should be ran with:
// `yarn hardhat run --network <network> scripts/one-off/backfill-engine-contracts.ts`

// NOTE: Only V3+ core contracts should be registered on the core registry. V1 and V2
// contracts should not be registered on the core registry, because they do not integrate
// with the shared minter suite, and the Core Registry acts as the allowlist for the shared minter
// filter.

/**
 * Converts a query of our indexed data to a calldata array for the core registry
 * `registerContracts` function. This is a one-off script to backfill the core registry
 * with a subsequent etherscan/multisig call to register all of the contracts.
 */
async function buildCoreRegistryTransaction() {
  // Core registry function inputs for bulk registration
  const outputCalldata = [[], [], []];
  for (let i = 0; i < contractsQueryResult.length; i++) {
    const contractResult = contractsQueryResult[i];
    const contractAddress: string = contractResult.address;
    const coreType: string = contractResult.contract_type;
    // get version from direct call
    const coreContract = await ethers.getContractAt(
      "IGenArt721CoreContractV3_Base",
      contractAddress
    );
    const coreVersion: string = await coreContract.coreVersion();
    // convert version and type to bytes32
    const coreVersionBytes32 = ethers.utils.formatBytes32String(coreVersion);
    const coreTypeBytes32 = ethers.utils.formatBytes32String(coreType);
    // add to output json
    outputCalldata[0].push(ethers.utils.getAddress(contractAddress));
    outputCalldata[1].push(coreVersionBytes32);
    outputCalldata[2].push(coreTypeBytes32);
  }
  // output to console
  console.log(JSON.stringify(outputCalldata).replace(/"/g, ""));
}

buildCoreRegistryTransaction()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
