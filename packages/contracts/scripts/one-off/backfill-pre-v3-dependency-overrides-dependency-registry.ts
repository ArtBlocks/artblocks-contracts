// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers } from "hardhat";
import { GetProjectsNullOverridesDocument } from "../../generated/graphql";
import { getClient } from "../util/graphql-client-utils";
import { DependencyRegistryV0__factory } from "../contracts";
import { getNetworkName } from "../util/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getDeployerWallet } from "../util/get-deployer-wallet";
import { Wallet } from "ethers";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { MetaTransactionData } from "@gnosis.pm/safe-core-sdk-types";

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
  network: "mainnet",
  dependencyRegistryAddress: "0x37861f95882ACDba2cCD84F5bFc4598e2ECDDdAF",
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

  // query for projects with null script_type_and_version_override
  const client = getClient();
  const res = await client
    .query(GetProjectsNullOverridesDocument, {})
    .toPromise();

  if (!res.data?.projects_metadata) {
    throw new Error("No projects_metadata found");
  }
  // Connect to dependency registry contract
  const dependencyRegistry = DependencyRegistryV0__factory.connect(
    config.dependencyRegistryAddress,
    signer
  );

  const txData: MetaTransactionData[] = [];
  for (const project of res.data.projects_metadata) {
    if (!project.contract_address) {
      throw new Error(
        `Missing contract_address for project ${project.name || "unknown"}`
      );
    }
    if (!project.project_id) {
      throw new Error(
        `Missing project_id for project ${project.name || "unknown"}`
      );
    }
    if (!project.script_type_and_version) {
      throw new Error(
        `Missing script_type_and_version for project ${project.name || "unknown"}`
      );
    }
    const contractAddress = project.contract_address;
    const projectId = parseInt(project.project_id, 10);
    const scriptTypeAndVersion = project.script_type_and_version;

    // If we're using a gnosis safe, create a transaction to propose adding the override
    if (config.useGnosisSafe) {
      const data = dependencyRegistry.interface.encodeFunctionData(
        "addProjectDependencyOverride",
        [
          contractAddress,
          projectId,
          ethers.utils.formatBytes32String(scriptTypeAndVersion),
        ]
      );
      txData.push({
        to: config.dependencyRegistryAddress,
        value: "0x00",
        data,
      });
    } else {
      const tx = await dependencyRegistry.addProjectDependencyOverride(
        contractAddress,
        projectId,
        ethers.utils.formatBytes32String(scriptTypeAndVersion)
      );
      await tx.wait();
      console.log(
        `Added override for project ${project.name} (${projectId}): ${scriptTypeAndVersion}`
      );
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