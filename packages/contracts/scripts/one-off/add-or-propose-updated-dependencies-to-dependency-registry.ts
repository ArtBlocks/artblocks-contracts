// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers } from "hardhat";
import { DependencyRegistryV0__factory } from "../contracts/factories/DependencyRegistryV0__factory";
import { getNetworkName } from "../util/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getDeployerWallet } from "../util/get-deployer-wallet";
import { Wallet } from "ethers";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { MetaTransactionData } from "@gnosis.pm/safe-core-sdk-types";

const DEPENDENCIES: {
  nameAndVersion: string;
  preferredCdn: string;
  preferredRepository: string;
  licenseType: string;
  website: string;
}[] = [
  {
    nameAndVersion: "aframe@1.5.0",
    preferredCdn:
      "https://cdnjs.cloudflare.com/ajax/libs/aframe/1.5.0/aframe.min.js",
    preferredRepository: "https://github.com/aframevr/aframe",
    licenseType: "MIT",
    website: "https://aframe.io",
  },
  {
    nameAndVersion: "babylon@6.36.0",
    preferredCdn:
      "https://cdnjs.cloudflare.com/ajax/libs/babylonjs/6.36.0/babylon.min.js",
    preferredRepository: "https://github.com/BabylonJS/Babylon.js",
    licenseType: "Apache-2.0",
    website: "https://www.babylonjs.com",
  },
  {
    nameAndVersion: "p5@1.9.0",
    preferredCdn:
      "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js",
    preferredRepository: "https://github.com/processing/p5.js",
    licenseType: "LGPL-2.1-only",
    website: "https://p5js.org",
  },
  {
    nameAndVersion: "three@0.160.0",
    preferredCdn:
      "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.min.js",
    preferredRepository: "https://github.com/mrdoob/three.js",
    licenseType: "MIT",
    website: "https://threejs.org",
  },
];

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
type BaseConfig = {
  network: string;
  dependencyRegistryAddress: string;
  useLedgerSigner: boolean;
};

// Add a discriminant property, like "type"
type GnosisSafeConfig = BaseConfig & {
  useGnosisSafe: true;
  safeAddress: string;
  transactionServiceUrl: string;
};

type NoGnosisSafeConfig = BaseConfig & {
  useGnosisSafe: false;
  safeAddress?: never;
  transactionServiceUrl?: never;
};

type Config = GnosisSafeConfig | NoGnosisSafeConfig;

// Fill this out before running the script
const config: Config = {
  network: "",
  dependencyRegistryAddress: "",
  useLedgerSigner: false,
  useGnosisSafe: false,
};

//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const networkName = await getNetworkName();

  if (networkName !== config.network) {
    throw new Error(
      `network name ${networkName} does not match expected network name ${config.network}`
    );
  }

  if (
    config.useGnosisSafe &&
    (!config.safeAddress || !config.transactionServiceUrl)
  ) {
    throw new Error(
      `Must provide both safeAddress and transactionServiceUrl when using gnosis safe`
    );
  }

  let signer: SignerWithAddress | Wallet;
  if (config.useLedgerSigner) {
    // Ethers adapter reuires a signer with a provider so create one here
    const ledgerAddress = hre.network.config.ledgerAccounts[0];
    signer = await ethers.getSigner(ledgerAddress);
    console.log("using wallet", await signer.getAddress());
  } else {
    const deployerWallet = getDeployerWallet();

    if (!deployerWallet) {
      throw new Error("Deployer wallet not found");
    }

    signer = deployerWallet.connect(ethers.provider);
  }

  let gnosisSetup: {
    ethAdapter: EthersAdapter;
    safeApiKit: SafeApiKit;
    protocolKit: Safe;
  } | null = null;

  // Gnosis sdk setup
  if (config.useGnosisSafe) {
    const ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: signer,
    });

    const safeApiKit = new SafeApiKit({
      txServiceUrl: config.transactionServiceUrl,
      ethAdapter,
    });

    const protocolKit = await Safe.create({
      ethAdapter,
      safeAddress: config.safeAddress,
    });

    gnosisSetup = {
      ethAdapter,
      safeApiKit,
      protocolKit,
    };
  }

  //////////////////////////////////////////////////////////////////////////////
  // ACTION BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Connect to dependency registry contract
  const dependencyRegistry = DependencyRegistryV0__factory.connect(
    config.dependencyRegistryAddress,
    signer
  );

  const txData: MetaTransactionData[] = [];
  for (const dependency of DEPENDENCIES) {
    const {
      nameAndVersion,
      preferredCdn,
      preferredRepository,
      licenseType,
      website,
    } = dependency;

    // If we're using a gnosis safe, create a transaction to propose adding the dependency
    // to the dependency registry. Otherwise, add it directly.
    if (config.useGnosisSafe) {
      const data = dependencyRegistry.interface.encodeFunctionData(
        "addDependency",
        [
          ethers.utils.formatBytes32String(nameAndVersion),
          ethers.utils.formatBytes32String(licenseType),
          preferredCdn,
          preferredRepository,
          website,
        ]
      );
      txData.push({
        to: config.dependencyRegistryAddress,
        value: "0x00",
        data,
      });
    } else {
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
  }

  // Use SDK to propose transactions if we're using a gnosis safe
  if (gnosisSetup) {
    const nonce = await gnosisSetup.protocolKit.getNonce();
    const safeTransaction = await gnosisSetup.protocolKit.createTransaction({
      safeTransactionData: txData,
      options: {
        nonce,
      },
    });
    const senderAddress = await signer.getAddress();
    const safeTxHash =
      await gnosisSetup.protocolKit.getTransactionHash(safeTransaction);
    const signature =
      await gnosisSetup.protocolKit.signTransactionHash(safeTxHash);
    await gnosisSetup.safeApiKit.proposeTransaction({
      safeAddress: await gnosisSetup.protocolKit.getAddress(),
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress,
      senderSignature: signature.data,
    });
    console.log("Proposed transactions sent to gnosis safe");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
