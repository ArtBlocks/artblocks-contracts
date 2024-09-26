// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers } from "hardhat";
import { DependencyRegistryV0__factory } from "../contracts/factories/DependencyRegistryV0__factory";

const readlineSync = require("readline-sync");

const DEPENDENCIES: {
  nameAndVersion: string;
  preferredCdn: string;
  preferredRepository: string;
  licenseType: string;
  website: string;
}[] = [
  {
    nameAndVersion: "three@0.167.0",
    preferredCdn:
      "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.167.0/three.module.min.js",
    preferredRepository: "https://github.com/mrdoob/three.js",
    licenseType: "MIT",
    website: "https://threejs.org",
  },
];

/**
 * This script was created to add a new version of threejs to the dependency registry.
 * This version was requested by MPKoz for the first curated exhibition.
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();

  let dependencyRegistryAddress = readlineSync.question(
    "dependency registry address: "
  );

  if (!dependencyRegistryAddress) {
    throw new Error("no dependency registry address provided");
  }

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Deploy dependency registry contract and proxy
  const dependencyRegistry = DependencyRegistryV0__factory.connect(
    dependencyRegistryAddress,
    deployer
  );

  const uploadedLicenses = new Set<string>(["MIT"]);
  for (const dependency of DEPENDENCIES) {
    const {
      nameAndVersion,
      preferredCdn,
      preferredRepository,
      licenseType,
      website,
    } = dependency;

    if (!uploadedLicenses.has(licenseType)) {
      const tx = await dependencyRegistry.addLicenseType(
        ethers.utils.formatBytes32String(licenseType)
      );
      await tx.wait();
      console.log(`Uploaded license type ${licenseType}`);
      uploadedLicenses.add(licenseType);
    }

    const tx = await dependencyRegistry.addDependency(
      ethers.utils.formatBytes32String(nameAndVersion),
      ethers.utils.formatBytes32String(licenseType),
      preferredCdn,
      preferredRepository,
      website
    );
    await tx.wait();
    console.log(`Uploaded dependency ${nameAndVersion}`);
  }

  const deps = await dependencyRegistry.getDependencyNamesAndVersions();
  console.log("DEPENDENCIES UPLOADED: ", deps);
  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
