// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { MinterFilterV0__factory } from "../../scripts/contracts/factories/minter-suite/MinterFilter/MinterFilterV0__factory";
import { MinterSetPriceERC20V1__factory } from "../../scripts/contracts/factories/archive/minter-suite/Minters/MinterSetPriceERC20/MinterSetPriceERC20V1__factory";
import { MinterSetPriceV1__factory } from "../../scripts/contracts/factories/archive/minter-suite/Minters/MinterSetPrice/MinterSetPriceV1__factory";
import { MinterDALinV1__factory } from "../../scripts/contracts/factories/archive/minter-suite/Minters/MinterDALin/MinterDALinV1__factory";
import { MinterDAExpV1__factory } from "../../scripts/contracts/factories/archive/minter-suite/Minters/MinterDAExp/MinterDAExpV1__factory";

// ROPSTEN (ARTIST-STAGING) ADDRESSSES
const CORE_CONTRACT_ADDRESS = "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270";
const FILTER_CONTRACT_ADDRESS = "0xF3d2a642640c928A33a087545939e5df3d0d657f";

// MAINNET ADDRESSES
// const CORE_CONTRACT_ADDRESS = "0xa7d8d9ef8D8Ce8992Df33D8b8CF4Aebabd5bD270";
// const FILTER_CONTRACT_ADDRESS = "0x4aafCE293b9B0faD169c78049A81e400f518E199";

async function main() {
  const [deployer] = await ethers.getSigners();

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Use already deployed Minter Filter contract.
  console.log(`Using MinterFilterV0 deployed at ${FILTER_CONTRACT_ADDRESS}`);

  // Deploy basic Minter contract (functionally equivalent to the current
  // standard Minter contract).
  const minterSetPriceERC20V1Factory = new MinterSetPriceERC20V1__factory(
    deployer
  );
  const minterSetPriceERC20V1 = await minterSetPriceERC20V1Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    FILTER_CONTRACT_ADDRESS
  );
  await minterSetPriceERC20V1.deployed();
  console.log(
    `MinterSetPriceERC20V1 deployed at ${minterSetPriceERC20V1.address}`
  );

  // Deploy basic Minter contract that **only** supports ETH, as an optimization,
  // and thus _does not_ support custom ERC20 minting.
  const minterSetPriceV1Factory = new MinterSetPriceV1__factory(deployer);
  const minterSetPriceV1 = await minterSetPriceV1Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    FILTER_CONTRACT_ADDRESS
  );
  await minterSetPriceV1.deployed();
  console.log(`MinterSetPriceV1 deployed at ${minterSetPriceV1.address}`);

  // Deploy automated linear-decay DA Minter contract that **only** supports ETH.
  const minterDALinV1Factory = new MinterDALinV1__factory(deployer);
  const minterDALinV1 = await minterDALinV1Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    FILTER_CONTRACT_ADDRESS
  );
  await minterDALinV1.deployed();
  console.log(`MinterDALinV1 deployed at ${minterDALinV1.address}`);

  // Deploy automated exponential-decay DA Minter contract that **only** supports ETH.
  const minterDAExpV1Factory = new MinterDAExpV1__factory(deployer);
  const minterDAExpV1 = await minterDAExpV1Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    FILTER_CONTRACT_ADDRESS
  );
  await minterDAExpV1.deployed();
  console.log(`MinterDAExpV1 deployed at ${minterDAExpV1.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Reminder re: CoreContract allowlisting.
  console.log(
    `REMINDER: Allowlist the MinterFilter on your core contract located at: ${CORE_CONTRACT_ADDRESS}`
  );

  // Output instructions for manual Etherscan verification.
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  const standardVerify = "yarn hardhat verify";

  console.log(`Verify each of the Minter deployments with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceERC20V1.address} ${CORE_CONTRACT_ADDRESS} ${FILTER_CONTRACT_ADDRESS}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceV1.address} ${CORE_CONTRACT_ADDRESS} ${FILTER_CONTRACT_ADDRESS}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterDALinV1.address} ${CORE_CONTRACT_ADDRESS} ${FILTER_CONTRACT_ADDRESS}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterDAExpV1.address} ${CORE_CONTRACT_ADDRESS} ${FILTER_CONTRACT_ADDRESS}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
