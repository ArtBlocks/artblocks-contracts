// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers, upgrades } from "hardhat";
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
    nameAndVersion: "aframe@1.2.0",
    preferredCdn:
      "https://cdnjs.cloudflare.com/ajax/libs/aframe/1.2.0/aframe.min.js",
    preferredRepository: "https://github.com/aframevr/aframe",
    licenseType: "MIT",
    website: "https://aframe.io",
  },
  {
    nameAndVersion: "babylon@5.0.0",
    preferredCdn:
      "https://cdnjs.cloudflare.com/ajax/libs/babylonjs/5.0.0/babylon.min.js",
    preferredRepository: "https://github.com/BabylonJS/Babylon.js",
    licenseType: "Apache-2.0",
    website: "https://www.babylonjs.com",
  },
  {
    nameAndVersion: "js@na",
    preferredCdn: "",
    preferredRepository: "",
    licenseType: "NA",
    website: "",
  },
  {
    nameAndVersion: "p5@1.0.0",
    preferredCdn:
      "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.0.0/p5.min.js",
    preferredRepository: "https://github.com/processing/p5.js",
    licenseType: "LGPL-2.1-only",
    website: "https://p5js.org",
  },
  {
    nameAndVersion: "paper@0.12.15",
    preferredCdn:
      "https://cdnjs.cloudflare.com/ajax/libs/paper.js/0.12.15/paper-full.min.js",
    preferredRepository: "https://github.com/paperjs/paper.js",
    licenseType: "MIT",
    website: "https://paperjs.org",
  },
  {
    nameAndVersion: "processing-js@1.4.6",
    preferredCdn:
      "https://cdnjs.cloudflare.com/ajax/libs/processing.js/1.4.6/processing.min.js",
    preferredRepository: "https://github.com/processing-js/processing-js",
    licenseType: "MIT",
    website: "http://processingjs.org",
  },
  {
    nameAndVersion: "regl@2.1.0",
    preferredCdn:
      "https://cdnjs.cloudflare.com/ajax/libs/regl/2.1.0/regl.min.js",
    preferredRepository: "https://github.com/regl-project/regl",
    licenseType: "MIT",
    website: "https://regl.party",
  },
  {
    nameAndVersion: "svg@na",
    preferredCdn: "",
    preferredRepository: "",
    licenseType: "NA",
    website: "",
  },
  {
    nameAndVersion: "three@0.124.0",
    preferredCdn:
      "https://cdnjs.cloudflare.com/ajax/libs/three.js/r124/three.min.js",
    preferredRepository: "https://github.com/mrdoob/three.js",
    licenseType: "MIT",
    website: "https://threejs.org",
  },
  {
    nameAndVersion: "tone@14.8.15",
    preferredCdn: "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.15/Tone.js",
    preferredRepository: "https://github.com/Tonejs/Tone.js",
    licenseType: "MIT",
    website: "https://tonejs.github.io",
  },
  {
    nameAndVersion: "twemoji@14.0.2",
    preferredCdn: "https://unpkg.com/twemoji@14.0.2/dist/twemoji.min.js",
    preferredRepository: "https://github.com/twitter/twemoji",
    licenseType: "MIT",
    website: "https://twemoji.twitter.com",
  },
  {
    nameAndVersion: "zdog@1.1.2",
    preferredCdn: "https://unpkg.com/zdog@1/dist/zdog.dist.min.js",
    preferredRepository: "https://github.com/metafizzy/zdog",
    licenseType: "MIT",
    website: "https://zzz.dog",
  },
];

/**
 * This script was created to deploy the DependencyRegistryV0 contract on Goerli.
 * It uses the hardhat-upgrades plugin to deploy the contract with a proxy. It assigns
 * the existing dev admin ACL contract as the owner of the DependencyRegistryV0 contract.
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

  const uploadedLicenses = new Set([]);
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
