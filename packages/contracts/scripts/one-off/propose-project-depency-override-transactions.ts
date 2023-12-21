// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers } from "hardhat";
import { DependencyRegistryV0__factory } from "../contracts/factories/DependencyRegistryV0__factory";
import { getClient } from "../util/graphql-client-utils";
import {
  GetProjectDependenciesDocument,
  GetProjectDependenciesQuery,
} from "../../generated/graphql";
import Safe from "@safe-global/protocol-kit";
import { EthersAdapter } from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { MetaTransactionData } from "@gnosis.pm/safe-core-sdk-types";
import { getNetworkName } from "../util/utils";
import { chunkArray } from "../util/utils";

const supportedDependencies = [
  "aframe@1.2.0",
  "babylon@5.0.0",
  "js@na",
  "custom@na",
  "p5@1.0.0",
  "paper@0.12.15",
  "processing-js@1.4.6",
  "regl@2.1.0",
  "svg@na",
  "three@0.124.0",
  "tone@14.8.15",
  "twemoji@14.0.2",
  "zdog@1.1.2",
];

// Fill these out before running
const config = {
  network: "mainnet",
  dependencyRegistryAddress: "0x37861f95882ACDba2cCD84F5bFc4598e2ECDDdAF",
  safeAddress: "0x---",
  transactionServiceUrl: "https://safe-transaction-mainnet.safe.global",
};

const TRANSACTION_CHUNK_SIZE = 200;

async function main() {
  const networkName = await getNetworkName();

  if (networkName !== config.network) {
    throw new Error(
      `network name ${networkName} does not match expected network name ${config.network}`
    );
  }

  // Ethers adapter reuires a signer with a provider so create one here
  const ledgerAddress = hre.network.config.ledgerAccounts[0];
  const ledgerSigner = await ethers.getSigner(ledgerAddress);
  console.log("using wallet", await ledgerSigner.getAddress());

  // Gnosis sdk setup
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: ledgerSigner,
  });

  const safeApiKit = new SafeApiKit({
    txServiceUrl: config.transactionServiceUrl,
    ethAdapter,
  });

  const protocolKit = await Safe.create({
    ethAdapter,
    safeAddress: config.safeAddress,
  });

  // Get contract to create transactions
  const dependencyRegistry = DependencyRegistryV0__factory.connect(
    config.dependencyRegistryAddress,
    ledgerSigner
  );

  // Fetch all pre-v3 projects from Hasura
  const client = getClient();
  const res = await client.query<GetProjectDependenciesQuery>(
    GetProjectDependenciesDocument,
    {}
  );

  if (res.error || !res.data) {
    throw new Error("error fetching dependencies");
  }

  // Create transactions to add dependencies to dependency registry
  const overrideProjectDependencyTransactionData: MetaTransactionData[] =
    res.data.projects_metadata
      .map((project) => {
        const [contractAddress, projectId] = project.id.split("-");
        let dependencyNameAndVersion = project.script_type_and_version;

        if (!supportedDependencies.includes(dependencyNameAndVersion)) {
          // We know of a few projects that have dependencies that are not supported
          // by the dependency registry. We will override these dependencies to be
          // "js@na" so that they can be added to the dependency registry.
          if (
            dependencyNameAndVersion === "js@undefined" ||
            dependencyNameAndVersion === "js@n/a"
          ) {
            dependencyNameAndVersion = "js@na";
          } else {
            // If we encounter a dependency that is not supported by the dependency
            // registry and is not one of the known exceptions, we will skip it.
            console.log(
              `Unexpected dependency name and version ${dependencyNameAndVersion} found for project ${project.id}. Skipping override.`
            );
            return null;
          }
        }

        const data = dependencyRegistry.interface.encodeFunctionData(
          "addProjectDependencyOverride",
          [
            contractAddress,
            projectId,
            ethers.utils.formatBytes32String(dependencyNameAndVersion),
          ]
        );
        return {
          to: dependencyRegistry.address,
          data,
          value: "0x00",
        };
      })
      .filter((transaction) => transaction !== null);

  // Chunk transactions into groups of TRANSACTION_CHUNK_SIZE to avoid hitting the gas limit
  const chunkedTransactions = chunkArray(
    overrideProjectDependencyTransactionData,
    TRANSACTION_CHUNK_SIZE
  );

  // Propose each chunk of transactions as a multi-send transaction
  let nonce = await protocolKit.getNonce();
  for (const transactions of chunkedTransactions) {
    const safeTransaction = await protocolKit.createTransaction({
      safeTransactionData: transactions,
      options: {
        nonce: nonce++,
      },
    });
    const senderAddress = await ledgerSigner.getAddress();
    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
    const signature = await protocolKit.signTransactionHash(safeTxHash);
    await safeApiKit.proposeTransaction({
      safeAddress: await protocolKit.getAddress(),
      safeTransactionData: safeTransaction.data,
      safeTxHash,
      senderAddress,
      senderSignature: signature.data,
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
