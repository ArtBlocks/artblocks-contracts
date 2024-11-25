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
import { CoreRegistryV1__factory } from "../contracts";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
type BaseConfig = {
  network: string;
  coreRegistryAddress: string;
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
  coreRegistryAddress: "0x652490c8bb6e7ec3fd798537d2f348d7904bbbc2",
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
  const registryAddresses = [
    "0x2ee7b9bb2e038be7323a119701a191c030a61ec6",
    "0x652490c8bb6e7ec3fd798537d2f348d7904bbbc2",
  ];

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

  const coreRegistry = CoreRegistryV1__factory.connect(
    config.coreRegistryAddress,
    signer
  );

  const txData: MetaTransactionData[] = [];
  for (const contract of res.data.contracts_metadata) {
    const contractCoreVersion = contract.core_version
      ? ethers.utils.formatBytes32String(contract.core_version)
      : ethers.constants.HashZero; // "0x0000000000000000000000000000000000000000000000000000000000000000"

    const contractType = contract.contract_type
      ? ethers.utils.formatBytes32String(contract.contract_type)
      : ethers.constants.HashZero;

    if (config.useGnosisSafe) {
      const data = coreRegistry.interface.encodeFunctionData(
        "registerContract",
        [contract.address, contractCoreVersion, contractType]
      );
      txData.push({
        to: config.coreRegistryAddress,
        value: "0x00",
        data,
      });
    } else {
      try {
        const tx = await coreRegistry.registerContract(
          contract.address,
          contractCoreVersion,
          contractType
        );
        await tx.wait();
        console.log(`Successfully registered contract: ${contract.address}`);
      } catch (error) {
        console.error(
          `Failed to register contract ${contract.address}:`,
          error
        );
      }
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
