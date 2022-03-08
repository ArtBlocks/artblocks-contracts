// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
import { MinterFilterV0__factory } from "./contracts/factories/MinterFilterV0__factory";
import { MinterSetPriceERC20V0__factory } from "./contracts/factories/MinterSetPriceERC20V0__factory";
import { MinterSetPriceV0__factory } from "./contracts/factories/MinterSetPriceV0__factory";
import { MinterDALinV0__factory } from "./contracts/factories/MinterDALinV0__factory";
import { MinterDAExpV0__factory } from "./contracts/factories/MinterDAExpV0__factory";

const CORE_CONTRACT_ADDRESS = "0x87c6E93Fc0B149ec59AD595e2E187a4e1d7fDC25";

async function main() {
  const [deployer] = await ethers.getSigners();

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy Minter Filter contract.
  const minterFilterFactory = new MinterFilterV0__factory(deployer);
  const minterFilter = await minterFilterFactory.deploy(CORE_CONTRACT_ADDRESS);
  await minterFilter.deployed();
  console.log(`MinterFilterV0 deployed at ${minterFilter.address}`);

  // Deploy basic Minter contract (functionally equivalent to the current
  // standard Minter contract).
  const minterSetPriceERC20V0Factory = new MinterSetPriceERC20V0__factory(
    deployer
  );
  const minterSetPriceERC20V0 = await minterSetPriceERC20V0Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    minterFilter.address
  );
  await minterSetPriceERC20V0.deployed();
  console.log(
    `MinterSetPriceERC20V0 deployed at ${minterSetPriceERC20V0.address}`
  );

  // Deploy basic Minter contract that **only** supports ETH, as an optimization,
  // and thus _does not_ support custom ERC20 minting.
  const minterSetPriceV0Factory = new MinterSetPriceV0__factory(deployer);
  const minterSetPriceV0 = await minterSetPriceV0Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    minterFilter.address
  );
  await minterSetPriceV0.deployed();
  console.log(`MinterSetPriceV0 deployed at ${minterSetPriceV0.address}`);

  // Deploy automated linear-decay DA Minter contract that **only** supports ETH.
  const minterDALinV0Factory = new MinterDALinV0__factory(deployer);
  const minterDALinV0 = await minterDALinV0Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    minterFilter.address
  );
  await minterDALinV0.deployed();
  console.log(`MinterDALinV0 deployed at ${minterDALinV0.address}`);

  // Deploy automated exponential-decay DA Minter contract that **only** supports ETH.
  const minterDAExpV0Factory = new MinterDAExpV0__factory(deployer);
  const minterDAExpV0 = await minterDAExpV0Factory.deploy(
    CORE_CONTRACT_ADDRESS,
    minterFilter.address
  );
  await minterDAExpV0.deployed();
  console.log(`MinterDAExpV0 deployed at ${minterDAExpV0.address}`);

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
  const standardVerify =
    "yarn hardhat verify --contract <path to .sol>:<contract name>";
  console.log(`Verify MinterFilter deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterFilter.address} ${CORE_CONTRACT_ADDRESS}`
  );
  console.log(`Verify each of the Minter deployments with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceERC20V0.address} ${CORE_CONTRACT_ADDRESS} ${minterFilter.address}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceV0.address} ${CORE_CONTRACT_ADDRESS} ${minterFilter.address}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterDALinV0.address} ${CORE_CONTRACT_ADDRESS} ${minterFilter.address}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterDAExpV0.address} ${CORE_CONTRACT_ADDRESS} ${minterFilter.address}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
