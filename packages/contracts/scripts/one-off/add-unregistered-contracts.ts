import hre, { ethers } from "hardhat";
import { GetUnregisteredContractsDocument } from "../../generated/graphql";
import { getClient } from "../util/graphql-client-utils";
import { getNetworkName } from "../util/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getDeployerWallet } from "../util/get-deployer-wallet";
import { Wallet } from "ethers";
import Safe, { EthersAdapter } from "@safe-global/protocol-kit";
import SafeApiKit from "@safe-global/api-kit";
import { MetaTransactionData } from "@gnosis.pm/safe-core-sdk-types";
import { EngineFactoryV0__factory } from "../contracts";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
type BaseConfig = {
  network: string;
  engineFactoryAddress: string;
  useLedgerSigner: boolean;
};

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

const config: Config = {
  network: "mainnet",
  engineFactoryAddress: "0x000000004058B5159ABB5a3Dd8cf775A7519E75F",
  useLedgerSigner: false,
  useGnosisSafe: true,
  safeAddress: "0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA",
  transactionServiceUrl: "https://safe-transaction-mainnet.safe.global/",
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

  // Query for unregistered contracts
  const registryAddresses = ["0x2ee7b9bb2e038be7323a119701a191c030a61ec6"];

  const client = getClient();
  const res = await client
    .query(GetUnregisteredContractsDocument, {
      registryAddresses,
    })
    .toPromise();

  if (!res.data?.contracts_metadata || !res.data.contracts_metadata.length) {
    console.log("No unregistered contracts found");
    return;
  }

  const contractAddresses: string[] = [];
  const coreVersions: string[] = [];
  const coreTypes: string[] = [];

  // format data
  for (const contract of res.data.contracts_metadata) {
    if (!contract.contract_type) {
      throw new Error(`Contract ${contract.address} has no type specified`);
    }
    // add contract version if not specified
    let version = contract.core_version;
    if (!version) {
      switch (contract.contract_type) {
        case "GenArt721CoreV2_PBAB":
          version = "v2.0.0";
          break;
        case "GenArt721CoreV0":
          version = "v0.0.1";
          break;
        case "GenArt721CoreV1":
          version = "v1.0.0";
          break;
        default:
          throw new Error(
            `Contract ${contract.address} has no core_version and has unrecognized contract_type: ${contract.contract_type}`
          );
      }
    }

    contractAddresses.push(contract.address);
    coreVersions.push(ethers.utils.formatBytes32String(version));
    coreTypes.push(ethers.utils.formatBytes32String(contract.contract_type));
  }

  const engineFactory = EngineFactoryV0__factory.connect(
    config.engineFactoryAddress,
    signer
  );

  const txData: MetaTransactionData[] = [];

  if (config.useGnosisSafe) {
    const data = engineFactory.interface.encodeFunctionData(
      "registerMultipleContracts",
      [contractAddresses, coreVersions, coreTypes]
    );
    txData.push({
      to: config.engineFactoryAddress,
      value: "0x00",
      data,
    });
  } else {
    try {
      const tx = await engineFactory.registerMultipleContracts(
        contractAddresses,
        coreVersions,
        coreTypes
      );
      await tx.wait();
      console.log(
        `Successfully registered ${contractAddresses.length} contracts`
      );
      // Log the addresses for verification
      contractAddresses.forEach((address) => {
        console.log(`- ${address}`);
      });
    } catch (error) {
      console.error(`Failed to register contracts:`, error);
    }
  }

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
    console.log(
      "Proposed contract registration transactions sent to gnosis safe"
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
