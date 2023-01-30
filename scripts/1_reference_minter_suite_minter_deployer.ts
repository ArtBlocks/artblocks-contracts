// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre from "hardhat";
import { ethers } from "hardhat";

import { MinterDAExpV4__factory } from "./contracts/factories/MinterDAExpV4__factory";
import { MinterDAExpSettlementV1__factory } from "./contracts/factories/MinterDAExpSettlementV1__factory";
import { MinterDALinV4__factory } from "./contracts/factories/MinterDALinV4__factory";
import { MinterHolderV4__factory } from "./contracts/factories/MinterHolderV4__factory";
import { MinterMerkleV5__factory } from "./contracts/factories/MinterMerkleV5__factory";
import { MinterSetPriceV4__factory } from "./contracts/factories/MinterSetPriceV4__factory";
import { MinterSetPriceERC20V4__factory } from "./contracts/factories/MinterSetPriceERC20V4__factory";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////

// GOERLI (ARTIST-STAGING) ADDRESSSES
const CORE_CONTRACT_ADDRESS = "TODO";
const FILTER_CONTRACT_ADDRESS = "TODO";
const DELEGATION_REGISTRY_ADDRESS = "TODO";

// MAINNET ADDRESSES
// const CORE_CONTRACT_ADDRESS = "TODO";
// const FILTER_CONTRACT_ADDRESS = "TODO";
// const DELEGATION_REGISTRY_ADDRESS = "TODO";

//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Use already deployed Minter Filter contract.
  console.log(`Using MinterFilterV1 deployed at ${FILTER_CONTRACT_ADDRESS}`);

  // Deploy MinterDAExpV4 minter.
  const minterDAExpV4Factory = new MinterDAExpV4__factory(deployer);
  const minterDAExpV4 = await minterDAExpV4Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    FILTER_CONTRACT_ADDRESS
  );
  await minterDAExpV4.deployed();
  console.log(`MinterDAExpV4 deployed at ${minterDAExpV4.address}`);

  // Deploy MinterDAExpSettlementV1 minter.
  const minterDAExpSettlementV1Factory = new MinterDAExpSettlementV1__factory(
    deployer
  );
  const minterDAExpSettlementV1 = await minterDAExpSettlementV1Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    FILTER_CONTRACT_ADDRESS
  );
  await minterDAExpSettlementV1.deployed();
  console.log(
    `MinterDAExpSettlementV1 deployed at ${minterDAExpSettlementV1.address}`
  );

  // Deploy MinterDALinV4 minter.
  const minterDALinV4Factory = new MinterDALinV4__factory(deployer);
  const minterDALinV4 = await minterDALinV4Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    FILTER_CONTRACT_ADDRESS
  );
  await minterDALinV4.deployed();
  console.log(`MinterDALinV4 deployed at ${minterDALinV4.address}`);

  // Deploy MinterHolderV4 minter.
  const minterHolderV4Factory = new MinterHolderV4__factory(deployer);
  const minterHolderV4 = await minterHolderV4Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    FILTER_CONTRACT_ADDRESS,
    DELEGATION_REGISTRY_ADDRESS
  );
  await minterHolderV4.deployed();
  console.log(`MinterHolderV4 deployed at ${minterHolderV4.address}`);

  // Deploy MinterMerkleV5 minter.
  const minterMerkleV5Factory = new MinterMerkleV5__factory(deployer);
  const minterMerkleV5 = await minterMerkleV5Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    FILTER_CONTRACT_ADDRESS,
    DELEGATION_REGISTRY_ADDRESS
  );
  await minterMerkleV5.deployed();
  console.log(`MinterMerkleV5 deployed at ${minterMerkleV5.address}`);

  // Deploy MinterSetPriceV4 minter.
  const minterSetPriceV4Factory = new MinterSetPriceV4__factory(deployer);
  const minterSetPriceV4 = await minterSetPriceV4Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    FILTER_CONTRACT_ADDRESS
  );
  await minterSetPriceV4.deployed();
  console.log(`MinterSetPriceV4 deployed at ${minterSetPriceV4.address}`);

  // Deploy MinterSetPriceERC20V4 minter.
  const minterSetPriceERC20V4Factory = new MinterSetPriceERC20V4__factory(
    deployer
  );
  const minterSetPriceERC20V4 = await minterSetPriceERC20V4Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    FILTER_CONTRACT_ADDRESS
  );
  await minterSetPriceERC20V4.deployed();
  console.log(
    `MinterSetPriceERC20V4 deployed at ${minterSetPriceERC20V4.address}`
  );

  // Reminder re: MinterFilter allowlisting.
  console.log(
    `REMINDER: Allowlist these minters on your MinterFilterV1 deployed at: ${FILTER_CONTRACT_ADDRESS}`
  );

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // VERIFICATION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Output instructions for manual Etherscan verification.
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  const standardVerify = "yarn hardhat verify";

  console.log(`If automated verification below fails, verify deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterDAExpV4.address} ${CORE_CONTRACT_ADDRESS} ${FILTER_CONTRACT_ADDRESS}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterDAExpSettlementV1.address} ${CORE_CONTRACT_ADDRESS} ${FILTER_CONTRACT_ADDRESS}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterDALinV4.address} ${CORE_CONTRACT_ADDRESS} ${FILTER_CONTRACT_ADDRESS}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterHolderV4.address} ${CORE_CONTRACT_ADDRESS} ${FILTER_CONTRACT_ADDRESS} ${DELEGATION_REGISTRY_ADDRESS}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterMerkleV5.address} ${CORE_CONTRACT_ADDRESS} ${FILTER_CONTRACT_ADDRESS} ${DELEGATION_REGISTRY_ADDRESS}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceV4.address} ${CORE_CONTRACT_ADDRESS} ${FILTER_CONTRACT_ADDRESS}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceERC20V4.address} ${CORE_CONTRACT_ADDRESS} ${FILTER_CONTRACT_ADDRESS}`
  );

  // Perform automated verification
  await hre.run("verify:verify", {
    address: minterDAExpV4.address,
    constructorArguments: [CORE_CONTRACT_ADDRESS, FILTER_CONTRACT_ADDRESS],
  });
  await hre.run("verify:verify", {
    address: minterDAExpSettlementV1.address,
    constructorArguments: [CORE_CONTRACT_ADDRESS, FILTER_CONTRACT_ADDRESS],
  });
  await hre.run("verify:verify", {
    address: minterDALinV4.address,
    constructorArguments: [CORE_CONTRACT_ADDRESS, FILTER_CONTRACT_ADDRESS],
  });
  await hre.run("verify:verify", {
    address: minterHolderV4.address,
    constructorArguments: [
      CORE_CONTRACT_ADDRESS,
      FILTER_CONTRACT_ADDRESS,
      DELEGATION_REGISTRY_ADDRESS,
    ],
  });
  await hre.run("verify:verify", {
    address: minterMerkleV5.address,
    constructorArguments: [
      CORE_CONTRACT_ADDRESS,
      FILTER_CONTRACT_ADDRESS,
      DELEGATION_REGISTRY_ADDRESS,
    ],
  });
  await hre.run("verify:verify", {
    address: minterSetPriceV4.address,
    constructorArguments: [CORE_CONTRACT_ADDRESS, FILTER_CONTRACT_ADDRESS],
  });
  await hre.run("verify:verify", {
    address: minterSetPriceERC20V4.address,
    constructorArguments: [CORE_CONTRACT_ADDRESS, FILTER_CONTRACT_ADDRESS],
  });

  //////////////////////////////////////////////////////////////////////////////
  // VERIFICATION ENDS HERE
  //////////////////////////////////////////////////////////////////////////////
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
