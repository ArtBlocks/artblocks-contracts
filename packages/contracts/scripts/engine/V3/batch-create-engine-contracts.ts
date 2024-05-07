// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers } from "hardhat";
import { EngineFactoryV0__factory } from "../../../../scripts/contracts/engine/V3/EngineFactoryV0__factory";
import { getConfigInputs, getNetworkName } from "../../util/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getDeployerWallet } from "../../util/get-deployer-wallet";
import { Wallet } from "ethers";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { MetaTransactionData } from "@gnosis.pm/safe-core-sdk-types";
import {
  getActiveSharedRandomizer,
  getActiveSharedMinterFilter,
  ZERO_ADDRESS,
  getActiveCoreRegistry,
  BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES,
} from "../../util/constants";
import { EngineContractConfig } from "../../../deployments/engine/V3/studio/deployment-config.template";

/**
 * This script was created to batch deploy new Engine and Engine Flex contracts
 * using the EngineFactoryV0, and configure them to use the shared minter suite.
 * After deployments, the transaction hashes can be used to run the
 * `post-batch-create-engine-contract` script to sync off-chain data.
 * IMPORTANT: This configures the core contract to use the active shared minter
 * filter and active shared randomizer as defined in constants.ts
 */
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

  console.log(`[INFO] Deploying to network: ${networkName}`);

  // verify intended environment
  if (process.env.NODE_ENV === config.environment) {
    console.log(`[INFO] Deploying to environment: ${config.environment}`);
  } else {
    throw new Error(
      `[ERROR] The deployment config indicates environment ${config.environment}, but script is being run in environment ${process.env.NODE_ENV}`
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

  // verify a shared minter filter address is defined for network and environment
  // @dev throws if not found
  getActiveSharedMinterFilter(networkName, config.environment);

  // verify a shared randomizer address is defined for network and environment
  // @dev throws if not found
  getActiveSharedRandomizer(networkName, config.environment);

  // verify the Engine Factory contract owns and can register contracts on the Core Registry
  const activeCoreRegistryAddress = await getActiveCoreRegistry(
    networkName,
    config.environment
  );

  const coreRegistryContract = await ethers.getContractAt(
    "CoreRegistryV1",
    activeCoreRegistryAddress
  );

  const coreRegistryOwner = await coreRegistryContract.owner();
  if (coreRegistryOwner !== config.engineFactoryAddress) {
    throw new Error(
      `[ERROR] Active core registry address ${activeCoreRegistryAddress} is not owned by Engine Factory ${config.engineFactoryAddress}. Please update the owner.`
    );
  }

  // verify that there is a valid bytecode storage reader library address for the network
  const bytecodeStorageLibraryAddress =
    BYTECODE_STORAGE_READER_LIBRARY_ADDRESSES[networkName];
  if (!bytecodeStorageLibraryAddress) {
    throw new Error(
      `[ERROR] No bytecode storage reader library address configured for network ${networkName}`
    );
  }

  // Get shared minter filter
  const minterFilterAddress = getActiveSharedMinterFilter(
    networkName,
    config.environment
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

    // verify a sensible AdminACL input config
    // ensure that the adminACL contract name is valid (i.e. the following doesn't throw)
    await ethers.getContractFactory("AdminACLV0");
    if (adminACLContract !== ZERO_ADDRESS) {
      // ensure a valid address
      ethers.utils.isAddress(adminACLContract);
    }

    // validate configuration values
    // verify that core contract type is either 0 for Engine or 1 for Engine Flex
    if (engineCoreContractType !== 0 && engineCoreContractType !== 1) {
      throw new Error(
        `[ERROR] The engine core contract type should be 0 for Engine or 1 for Engine Flex`
      );
    }

    // verify that token name and symbol are populated
    if (
      engineConfiguration.tokenName.length > 0 &&
      engineConfiguration.tokenSymbol.length > 0
    ) {
      throw new Error(`[ERROR] The token name and symbol should be populated`);
    }

    // validate that the render provider addresses is not null
    if (
      engineConfiguration.renderProviderAddress.length > 0 &&
      engineConfiguration.renderProviderAddress !== ZERO_ADDRESS
    ) {
      throw new Error(`[ERROR] The render provider address should not be null`);
    }

    // validate that the Admin ACL and super admin address are as expected
    if (
      !(
        adminACLContract === ZERO_ADDRESS &&
        engineConfiguration.newSuperAdminAddress !== ZERO_ADDRESS
      ) ||
      !(
        adminACLContract !== ZERO_ADDRESS &&
        engineConfiguration.newSuperAdminAddress === ZERO_ADDRESS
      )
    ) {
      throw new Error(
        `[ERROR] If using an existing Admin ACL Contract, the super admin address must be null.
        If deploying a new Admin ACL Contract, the super admin address must not be null.`
      );
    }

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
