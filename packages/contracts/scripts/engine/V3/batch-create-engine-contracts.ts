// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers } from "hardhat";
import { EngineFactoryV0__factory } from "../../../../scripts/contracts/engine/V3/EngineFactoryV0__factory";
import {
  getConfigInputs,
  getNetworkName,
} from "../../../../scripts/util/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getDeployerWallet } from "../../../../scripts/util/get-deployer-wallet";
import { Wallet } from "ethers";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { MetaTransactionData } from "@gnosis.pm/safe-core-sdk-types";
import { getActiveSharedRandomizer } from "../../../../scripts/util/constants";
import { EngineContractConfig } from "./deployment-config.template";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
type BaseConfig = {
  network: string;
  environment: string;
  engineFactoryAddress: string;
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
  environment: "",
  engineFactoryAddress: "",
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

  // Connect to engine factory contract
  const engineFactory = EngineFactoryV0__factory.connect(
    config.engineFactoryAddress,
    signer
  );

  // Get shared randomizer contract
  const randomizerAddress = getActiveSharedRandomizer(
    networkName,
    config.environment
  );

  const txData: MetaTransactionData[] = [];
  // get deployment configuration details
  const { deployConfigDetailsArray } = await getConfigInputs(
    "deployments/engine/V3/deployment-config.template.ts",
    "Batch Engine deployment config file"
  );
  for (const engineContractConfiguration of deployConfigDetailsArray) {
    const {
      engineCoreContractType,
      engineConfiguration,
      adminACLContract,
      salt,
    } = engineContractConfiguration as EngineContractConfig;

    // set randomizer address
    engineConfiguration.randomizerContractAddress = randomizerAddress;

    // If we're using a gnosis safe, create a transaction to propose adding the dependency
    // to the dependency registry. Otherwise, add it directly.
    if (config.useGnosisSafe) {
      const data = engineFactory.interface.encodeFunctionData(
        "createEngineContract",
        [
          engineCoreContractType,
          engineConfiguration,
          adminACLContract,
          ethers.utils.formatBytes32String(salt),
        ]
      );
      txData.push({
        to: config.engineFactoryAddress,
        value: "0x00",
        data,
      });
    } else {
      const tx = await engineFactory.createEngineContract(
        engineCoreContractType,
        engineConfiguration,
        adminACLContract,
        ethers.utils.formatBytes32String(salt)
      );
      await tx.wait();
      console.log(
        `Create engine contract called with configuration ${engineConfiguration}`
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
