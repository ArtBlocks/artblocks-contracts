// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers } from "hardhat";
import { DependencyRegistryV0__factory } from "../contracts/engine/V3/EngineFactoryV0";
import Safe from "@safe-global/protocol-kit";
import { EthersAdapter } from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { getNetworkName } from "../util/utils";
import { chunkArray } from "../util/utils";

// Fill these out before running
const config = {
  network: "mainnet",
  dependencyRegistryAddress: "0x37861f95882ACDba2cCD84F5bFc4598e2ECDDdAF", // mainnet
  safeAddress: "0x---",
  useLedgerSigner: false,
  useGnosisSafe: false,
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

  // Create transaction to override dependency on NimTeens
  const overrideProjectDependencyTransactionData = [
    {
      to: dependencyRegistry.address,
      data: dependencyRegistry.interface.encodeFunctionData(
        "addProjectDependencyOverride",
        [
          "0x99a9b7c1116f9ceeb1652de04d5969cce509b069",
          "408",
          ethers.utils.formatBytes32String("js-legacy@na"),
        ]
      ),
      value: "0",
    },
  ];

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
