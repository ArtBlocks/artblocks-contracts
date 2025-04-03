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

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
