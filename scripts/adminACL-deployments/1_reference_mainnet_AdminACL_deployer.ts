// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import { ethers } from "hardhat";
// explorations
import { AdminACLV1__factory } from "../contracts/factories/AdminACLV1__factory";

// delay to avoid issues with reorgs and tx failures
import { delay } from "../util/utils";
const EXTRA_DELAY_BETWEEN_TX = 5000; // ms

/**
 * This script was created to deploy the AdminACLV1 contract to the Ethereum
 * mainnet. It is intended to document the deployment process and provide a
 * reference for the steps required to deploy the AdminACLV1 contract.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const superAdminAddress = "0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283"; // Art Blocks contract-management multi-sig
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;
  if (networkName != "mainnet") {
    throw new Error("This script is intended to be run on mainnet only");
  }
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy AdminACL contract
  const adminACLFactory = new AdminACLV1__factory(deployer);
  const adminACL = await adminACLFactory.deploy();
  await adminACL.deployed();
  const adminACLAddress = adminACL.address;
  console.log(`Admin ACL V1 deployed at ${adminACLAddress}`);
  await delay(EXTRA_DELAY_BETWEEN_TX);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // change superAdmin to Art Blocks contract-management multi-sig
  // note: this gives the multi-sig the superAdmin role, but does not refresh
  // the superAdmin role on the core contracts. See next steps below for that.
  await adminACL.changeSuperAdmin(superAdminAddress, []);

  // Output instructions for manual Etherscan verification.
  const standardVerify = "yarn hardhat verify";
  console.log(`Verify Admin ACL V1 contract deployment with:`);
  console.log(`${standardVerify} --network ${networkName} ${adminACL.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  console.log("Next Steps:");
  console.log(
    "1. Verify Admin ACL V1 contract deployment on Etherscan (see above)"
  );
  console.log(
    "2. Migrate existing AdminACLV0's to the Admin ACL V1 address in Core contract via the AdminACLV0's transferOwnershipOn function (one call per core contract using the AdminACLV0)"
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
