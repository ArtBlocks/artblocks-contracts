// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

import hre, { ethers } from "hardhat";
import { EngineFactoryV0__factory } from "../../contracts";
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
  getActiveSharedSplitProvider,
  getActiveEngineFactoryAddress,
  ZERO_ADDRESS,
  getActiveCoreRegistry,
  getProdRenderProviderPaymentAddress,
} from "../../util/constants";
import fs from "fs";
import path from "path";

// Types for Gnosis Safe Transaction Builder JSON format
type AbiInput = {
  internalType: string;
  name: string;
  type: string;
  components?: AbiInput[];
};

type ContractMethod = {
  inputs: AbiInput[];
  name: string;
  payable: boolean;
  outputs?: AbiInput[];
  stateMutability?: string;
  type?: string;
};

type TxBuilderTransaction = {
  to: string;
  value: string;
  data: string | null;
  contractMethod: ContractMethod | null;
  contractInputsValues: Record<string, string> | null;
};

type TxBuilderMeta = {
  name: string;
  description: string;
  txBuilderVersion: string;
  createdFromSafeAddress: string;
  createdFromOwnerAddress: string;
  checksum: string;
};

type TxBuilderJson = {
  version: string;
  chainId: string;
  createdAt: number;
  meta: TxBuilderMeta;
  transactions: TxBuilderTransaction[];
};

// ABI definition for createEngineContract function
// Note: This matches the exact format expected by Gnosis Safe Transaction Builder
// - components must come before internalType for tuple types
// - Only inputs, name, and payable are included (no outputs, stateMutability, type)
const CREATE_ENGINE_CONTRACT_METHOD: ContractMethod = {
  inputs: [
    {
      internalType: "enum IEngineFactoryV0.EngineCoreType",
      name: "engineCoreContractType",
      type: "uint8",
    },
    {
      components: [
        { internalType: "string", name: "tokenName", type: "string" },
        { internalType: "string", name: "tokenSymbol", type: "string" },
        {
          internalType: "address",
          name: "renderProviderAddress",
          type: "address",
        },
        {
          internalType: "address",
          name: "platformProviderAddress",
          type: "address",
        },
        {
          internalType: "address",
          name: "newSuperAdminAddress",
          type: "address",
        },
        {
          internalType: "address",
          name: "randomizerContract",
          type: "address",
        },
        {
          internalType: "address",
          name: "splitProviderAddress",
          type: "address",
        },
        {
          internalType: "address",
          name: "minterFilterAddress",
          type: "address",
        },
        { internalType: "uint248", name: "startingProjectId", type: "uint248" },
        {
          internalType: "bool",
          name: "autoApproveArtistSplitProposals",
          type: "bool",
        },
        { internalType: "bool", name: "nullPlatformProvider", type: "bool" },
        {
          internalType: "bool",
          name: "allowArtistProjectActivation",
          type: "bool",
        },
      ],
      internalType: "struct EngineConfiguration",
      name: "engineConfiguration",
      type: "tuple",
    },
    {
      internalType: "address",
      name: "adminACLContract",
      type: "address",
    },
    {
      internalType: "bytes32",
      name: "salt",
      type: "bytes32",
    },
  ],
  name: "createEngineContract",
  payable: false,
};

// Type for transaction data with input values for TX Builder
// Note: data is set to null to let Transaction Builder encode from ABI and contractInputsValues
type TxBuilderInputData = {
  to: string;
  value: string;
  data: null;
  contractInputsValues: {
    engineCoreContractType: string;
    engineConfiguration: string;
    adminACLContract: string;
    salt: string;
  };
};

/**
 * Serialize a JSON object in a deterministic way for checksum calculation.
 * This matches the Gnosis Safe Transaction Builder's serialization format.
 */
function serializeJSONObject(json: unknown): string {
  if (Array.isArray(json)) {
    return `[${json.map((el) => serializeJSONObject(el)).join(",")}]`;
  }

  if (typeof json === "object" && json !== null) {
    let acc = "";
    const keys = Object.keys(json).sort();
    acc += `{${JSON.stringify(keys)}`;

    for (let i = 0; i < keys.length; i++) {
      acc += `${serializeJSONObject((json as Record<string, unknown>)[keys[i]])},`;
    }

    return `${acc}}`;
  }

  return `${JSON.stringify(json === undefined ? null : json)}`;
}

/**
 * Calculate the checksum for a Transaction Builder JSON file.
 * The checksum is calculated by serializing the batch (with name set to null)
 * and hashing it with keccak256.
 */
function calculateChecksum(
  batchFile: Omit<TxBuilderJson, "meta"> & {
    meta: Omit<TxBuilderMeta, "checksum">;
  }
): string {
  const serialized = serializeJSONObject({
    ...batchFile,
    meta: { ...batchFile.meta, name: null },
  });
  return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(serialized));
}

/**
 * Generate a Gnosis Safe Transaction Builder JSON file from transaction data.
 */
function generateTxBuilderJson(
  transactions: TxBuilderInputData[],
  chainId: number,
  safeAddress: string
): TxBuilderJson {
  const txBuilderTransactions: TxBuilderTransaction[] = transactions.map(
    (tx) => ({
      to: tx.to,
      value: tx.value,
      data: tx.data ?? null,
      contractMethod: CREATE_ENGINE_CONTRACT_METHOD,
      contractInputsValues: tx.contractInputsValues,
    })
  );

  const createdAt = Date.now();

  // Create the batch file without checksum first
  const batchFileWithoutChecksum = {
    version: "1.0",
    chainId: chainId.toString(),
    createdAt,
    meta: {
      name: "Batch Engine Contract Deployment",
      description: "Batch deployment of Engine contracts via EngineFactoryV0",
      txBuilderVersion: "1.16.5",
      createdFromSafeAddress: safeAddress,
      createdFromOwnerAddress: "",
    },
    transactions: txBuilderTransactions,
  };

  // Calculate checksum
  const checksum = calculateChecksum(batchFileWithoutChecksum);

  // Return the complete batch file with checksum
  return {
    ...batchFileWithoutChecksum,
    meta: {
      ...batchFileWithoutChecksum.meta,
      checksum,
    },
  };
}

/**
 * This script was created to batch deploy new Engine and Engine Flex contracts
 * using the EngineFactoryV0, and configure them to use the shared minter suite.
 * After deployments, the transaction hashes can be used to run the
 * `post-batch-create-engine-contract` script to sync off-chain data.
 * IMPORTANT: This configures the core contract to use the active shared minter
 * filter and active shared randomizer as defined in constants.ts
 *
 * OPTIONAL: Set EXPORT_TX_BUILDER=true to export a tx_builder.json file instead
 * of proposing transactions directly to the Gnosis Safe. This file can be uploaded
 * to the Gnosis Safe Transaction Builder app to execute the transactions.
 *
 * Example usage:
 *   EXPORT_TX_BUILDER=true yarn deploy:v3-engine:mainnet
 */
//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const networkName = await getNetworkName();

  // Get network and safe configuration
  const { deployConfigDetailsArray, deployNetworkConfiguration } =
    await getConfigInputs(
      "deployments/engine/V3/studio/deployment-config.template.ts",
      "Batch Engine deployment config file"
    );

  if (networkName !== deployNetworkConfiguration?.network) {
    throw new Error(
      `network name ${networkName} does not match expected network name ${deployNetworkConfiguration?.network}`
    );
  }

  console.log(`[INFO] Deploying to network: ${networkName}`);

  // verify intended environment
  if (process.env.NODE_ENV === deployNetworkConfiguration.environment) {
    console.log(
      `[INFO] Deploying to environment: ${deployNetworkConfiguration.environment}`
    );
  } else {
    throw new Error(
      `[ERROR] The deployment config indicates environment ${deployNetworkConfiguration.environment}, but script is being run in environment ${process.env.NODE_ENV}`
    );
  }

  if (
    deployNetworkConfiguration.useGnosisSafe &&
    (!deployNetworkConfiguration.safeAddress ||
      !deployNetworkConfiguration.transactionServiceUrl)
  ) {
    throw new Error(
      `Must provide both safeAddress and transactionServiceUrl when using gnosis safe`
    );
  }

  let signer: SignerWithAddress | Wallet;
  if (deployNetworkConfiguration.useLedgerSigner) {
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
  if (deployNetworkConfiguration.useGnosisSafe) {
    const ethAdapter = new EthersAdapter({
      ethers,
      signerOrProvider: signer,
    });

    const safeApiKit = new SafeApiKit({
      txServiceUrl: deployNetworkConfiguration.transactionServiceUrl,
      ethAdapter,
    });

    const protocolKit = await Safe.create({
      ethAdapter,
      safeAddress: deployNetworkConfiguration.safeAddress,
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
  // Get engine factory address
  const engineFactoryAddress = getActiveEngineFactoryAddress(
    networkName,
    deployNetworkConfiguration.environment
  );
  // Connect to engine factory contract
  const engineFactory = EngineFactoryV0__factory.connect(
    engineFactoryAddress,
    signer
  );

  // verify a shared minter filter address is defined for network and environment
  // @dev throws if not found
  getActiveSharedMinterFilter(
    networkName,
    deployNetworkConfiguration.environment
  );

  // verify a shared randomizer address is defined for network and environment
  // @dev throws if not found
  getActiveSharedRandomizer(
    networkName,
    deployNetworkConfiguration.environment
  );

  // verify the Engine Factory contract owns and can register contracts on the Core Registry
  const activeCoreRegistryAddress = await getActiveCoreRegistry(
    networkName,
    deployNetworkConfiguration.environment
  );

  const coreRegistryContract = await ethers.getContractAt(
    "CoreRegistryV1",
    activeCoreRegistryAddress
  );

  const coreRegistryOwner = await coreRegistryContract.owner();
  if (coreRegistryOwner !== engineFactoryAddress) {
    throw new Error(
      `[ERROR] Active core registry address ${activeCoreRegistryAddress} is not owned by Engine Factory ${engineFactoryAddress}. Please update the owner.`
    );
  }

  // @dev no need to verify bytecode storage reader library addresses as they are not used in this script (they are only referenced in implementation contracts)

  // Get shared minter filter
  const minterFilterAddress = getActiveSharedMinterFilter(
    networkName,
    deployNetworkConfiguration.environment
  );

  // Get shared randomizer contract
  const randomizerAddress = getActiveSharedRandomizer(
    networkName,
    deployNetworkConfiguration.environment
  );

  // Get shared split provider
  const splitProviderAddress = getActiveSharedSplitProvider();

  const txData: MetaTransactionData[] = [];
  const txBuilderData: TxBuilderInputData[] = [];

  for (const engineContractConfiguration of deployConfigDetailsArray) {
    const {
      productClass,
      engineCoreContractType,
      tokenName,
      tokenTicker,
      renderProviderAddress,
      platformProviderAddress,
      newSuperAdminAddress,
      startingProjectId,
      autoApproveArtistSplitProposals,
      nullPlatformProvider,
      allowArtistProjectActivation,
      adminACLContract,
      salt,
    } = engineContractConfiguration;

    // require that productClass is defined
    if (!productClass) {
      throw new Error(`[ERROR] productClass must be defined`);
    }

    // validate adminACLContract is defined
    if (adminACLContract === undefined) {
      throw new Error(`[ERROR] Admin ACL Contract must be defined`);
    }

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
    if (!tokenName?.length || !tokenTicker?.length) {
      throw new Error(`[ERROR] The token name and symbol should be populated`);
    }

    // validate that the render provider addresses is not null
    if (
      !renderProviderAddress?.length ||
      (renderProviderAddress.length > 0 &&
        renderProviderAddress === ZERO_ADDRESS)
    ) {
      throw new Error(`[ERROR] The render provider address should not be null`);
    }

    // validate that the Admin ACL and super admin address are as expected
    if (
      adminACLContract === ZERO_ADDRESS &&
      newSuperAdminAddress === ZERO_ADDRESS
    ) {
      throw new Error(
        `[ERROR] If using an existing Admin ACL Contract, the super admin address must be null.
        If deploying a new Admin ACL Contract, the super admin address must not be null.`
      );
    }

    // validate platform provider address is null if nullPlatformProvider is true
    if (nullPlatformProvider && platformProviderAddress !== ZERO_ADDRESS) {
      throw new Error(
        `[ERROR] If nullPlatformProvider is set to true, the platform provider
            address must be the zero address.`
      );
    }

    // validate super admin address is defined
    if (!newSuperAdminAddress) {
      throw new Error(`[ERROR] newSuperAdminAddress must be defined`);
    }

    // validate starting project id is defined
    if (startingProjectId === undefined) {
      throw new Error(`[ERROR] starting project ID must be defined`);
    }

    // validate autoApproveArtistSplitProposals is defined
    if (autoApproveArtistSplitProposals === undefined) {
      throw new Error(
        `[ERROR] auto approve artist split proposals must be defined`
      );
    }

    // validate nullPlatformProvider is defined
    if (nullPlatformProvider === undefined) {
      throw new Error(`[ERROR] null platform provider must be defined`);
    }

    // validate allowArtistProjectActivation is defined
    if (allowArtistProjectActivation === undefined) {
      throw new Error(
        `[ERROR] allow artist project activation must be defined`
      );
    }

    // validate platform provider address is defined
    if (!platformProviderAddress) {
      throw new Error(`[ERROR] platformProviderAddress must be defined`);
    }

    // validate render provider address meets requirements
    // get the required render provider payment address, if required (e.g. required on prod networks)
    const requiredRenderProviderAddress = getProdRenderProviderPaymentAddress(
      networkName,
      deployNetworkConfiguration.environment,
      productClass
    );
    if (
      requiredRenderProviderAddress &&
      renderProviderAddress !== requiredRenderProviderAddress
    ) {
      throw new Error(
        `[ERROR] Render provider address ${renderProviderAddress} does not match required address for (network,env,product) ${requiredRenderProviderAddress}`
      );
    }

    const inputEngineConfiguration = {
      tokenName,
      tokenSymbol: tokenTicker,
      renderProviderAddress,
      platformProviderAddress,
      newSuperAdminAddress,
      randomizerContract: randomizerAddress,
      splitProviderAddress,
      minterFilterAddress,
      startingProjectId,
      autoApproveArtistSplitProposals,
      nullPlatformProvider,
      allowArtistProjectActivation,
    };

    const inputSalt =
      !salt || salt === "0x0" ? ethers.constants.HashZero : salt;

    // If we're using a gnosis safe, create a transaction to propose adding the dependency
    // to the dependency registry. Otherwise, add it directly.
    if (deployNetworkConfiguration?.useGnosisSafe) {
      const data = engineFactory.interface.encodeFunctionData(
        "createEngineContract",
        [
          engineCoreContractType,
          inputEngineConfiguration,
          adminACLContract,
          inputSalt,
        ]
      );
      txData.push({
        to: engineFactoryAddress,
        value: "0",
        data,
      });

      // Also build data for TX Builder with human-readable input values
      // Format the engineConfiguration tuple as a JSON string for display
      const engineConfigTuple = `["${tokenName}","${tokenTicker}","${renderProviderAddress}","${platformProviderAddress}","${newSuperAdminAddress}","${randomizerAddress}","${splitProviderAddress}","${minterFilterAddress}",${startingProjectId},${autoApproveArtistSplitProposals},${nullPlatformProvider},${allowArtistProjectActivation}]`;

      txBuilderData.push({
        to: engineFactoryAddress,
        value: "0",
        data: null,
        contractInputsValues: {
          engineCoreContractType: engineCoreContractType.toString(),
          engineConfiguration: engineConfigTuple,
          adminACLContract: adminACLContract,
          salt: inputSalt,
        },
      });
    } else {
      const tx = await engineFactory.createEngineContract(
        engineCoreContractType,
        inputEngineConfiguration,
        adminACLContract,
        inputSalt
      );
      await tx.wait();
      console.log(
        `Create engine contract called with configuration
        -- Token Name: ${tokenName}
        -- Token Symbol: ${tokenTicker}
        -- Render Provider Address: ${renderProviderAddress}
        -- Platform Provider Address: ${platformProviderAddress}
        -- New Super Admin Address: ${newSuperAdminAddress}
        -- Starting Project ID: ${startingProjectId}
        -- Auto Approve Artist Split Proposals: ${autoApproveArtistSplitProposals}
        -- Null Platform Provider: ${nullPlatformProvider}
        -- Allow Artist Project Activation: ${allowArtistProjectActivation}
        -- Admin ACL Contract: ${adminACLContract}
        -- Salt: ${inputSalt}
        `
      );
    }
  }

  // Use SDK to propose transactions if we're using a gnosis safe
  if (gnosisSetup) {
    // Check if we should export to Transaction Builder JSON instead of proposing
    const exportTxBuilder = process.env.EXPORT_TX_BUILDER === "true";

    if (exportTxBuilder) {
      // Get chain ID for the Transaction Builder JSON
      const network = await ethers.provider.getNetwork();
      const chainId = network.chainId;

      // Generate the Transaction Builder JSON
      // safeAddress is guaranteed to exist due to earlier validation when useGnosisSafe is true
      const txBuilderJson = generateTxBuilderJson(
        txBuilderData,
        chainId,
        deployNetworkConfiguration.safeAddress!
      );

      // Write the JSON file to the root directory
      const outputPath = path.resolve(process.cwd(), "tx_builder.json");
      fs.writeFileSync(outputPath, JSON.stringify(txBuilderJson, null, 2));

      console.log(`[INFO] Transaction Builder JSON exported to: ${outputPath}`);
      console.log(`[INFO] Contains ${txBuilderData.length} transaction(s)`);
      console.log(
        `[INFO] Upload this file to Gnosis Safe Transaction Builder to execute the transactions`
      );
    } else {
      const nonce = await gnosisSetup.protocolKit.getNonce();
      const safeTransaction = await gnosisSetup.protocolKit.createTransaction({
        safeTransactionData: txData,
        onlyCalls: true,
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
