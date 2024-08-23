import prompt from "prompt";
import fs from "fs";
import path from "path";
import { ProductClassEnum } from "./constants";
var util = require("util");
import { ethers } from "hardhat";

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The following gets the path to this repo's root directory via
// traversing module.paths until the root path is found.
// inspired by: https://stackoverflow.com/a/18721515/17459565
export async function getAppPath() {
  const { dirname } = require("path");
  const {
    constants,
    promises: { access },
  } = require("fs");

  for (let path of module.paths) {
    try {
      await access(path, constants.F_OK);
      return dirname(path);
    } catch (e) {
      // Just move on to next path
    }
  }
}

type BaseConfig = {
  network: string;
  environment: string;
  useLedgerSigner: boolean;
  transactionHash?: string;
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

export type DeployNetworkConfiguration = GnosisSafeConfig | NoGnosisSafeConfig;

export type DeployConfigDetails = {
  productClass?: ProductClassEnum;
  network?: string;
  environment?: string;
  // shared randomizer fields
  randomizerName?: string;
  pseudorandomAtomicContractAddress?: string;
  pseudorandomAtomicContractName?: string;
  // shared minter filter fields
  existingAdminACL?: string;
  adminACLContract?: string;
  adminACLContractName?: string;
  minterFilterName?: string;
  existingCoreRegistry?: string;
  coreRegistryContractName?: string;
  // shared minter fields
  minterName?: string;
  minterFilterAddress?: string;
  approveMinterGlobally?: boolean;
  // engine core fields (shared minter suite)
  engineCoreContractType?: number; // 0 for Engine, 1 for Engine Flex
  genArt721CoreContractName?: string;
  tokenName?: string;
  tokenTicker?: string;
  startingProjectId?: number;
  allowArtistProjectActivation?: boolean;
  autoApproveArtistSplitProposals?: boolean;
  renderProviderAddress?: string;
  nullPlatformProvider?: boolean;
  platformProviderAddress?: string;
  addInitialProject?: boolean;
  doTransferSuperAdmin?: boolean;
  newSuperAdminAddress?: string;
  renderProviderSplitPercentagePrimary?: number;
  renderProviderSplitBPSSecondary?: number;
  defaultVerticalName?: string;
  salt?: string;
  // flagship core fields
  artblocksPrimarySalesAddress?: string;
  artblocksSecondarySalesAddress?: string;
  // splits fields
  implementationName?: string;
  factoryName?: string;
  requiredSplitAddress?: string;
  requiredSplitBPS?: number;
};

export async function getConfigInputs(
  exampleConfigPath: string,
  promptMessage: string
): Promise<{
  deployConfigDetailsArray: DeployConfigDetails[];
  deployNetworkConfiguration?: DeployNetworkConfiguration;
  deploymentConfigFile: string;
  inputFileDirectory: string;
}> {
  // get repo's root directory absolute path
  const appPath = await getAppPath();
  console.log(appPath);
  console.log(
    `[INFO] example deployment config file is:\n\n${exampleConfigPath}\n`
  );
  prompt.start();
  const deploymentConfigFile = (
    await prompt.get<{ from: string }>([promptMessage])
  )[promptMessage];
  // dynamically import input deployment configuration detailsf
  console.log("appPath", appPath);
  console.log("deploymentConfigFile", deploymentConfigFile);
  const fullDeploymentConfigPath = path.join(appPath, deploymentConfigFile);
  const fullImportPath = path.join(fullDeploymentConfigPath);
  const inputFileDirectory = path.dirname(fullImportPath);
  let deployConfigDetailsArray: DeployConfigDetails[];
  let deployNetworkConfiguration;
  try {
    ({ deployConfigDetailsArray, deployNetworkConfiguration } = await import(
      fullImportPath
    ));
  } catch (error) {
    throw new Error(
      `[ERROR] Unable to import deployment configuration file at: ${fullDeploymentConfigPath}
      Please ensure the file exists (e.g. deployments/engine/V3/internal-testing/dev-example/minter-deploy-config-01.dev.ts)`
    );
  }
  // record all deployment logs to a markdown file
  try {
    const pathToMyLogFile = path.join(inputFileDirectory, "DEPLOYMENT_LOGS.md");
    const outputMD = `
      ----------------------------------------
      [INFO] Datetime of deployment: ${new Date().toISOString()}
      [INFO] Deployment configuration file: ${fullDeploymentConfigPath}

    `;
    fs.writeFileSync(pathToMyLogFile, outputMD, { flag: "as+" });
  } catch (error) {
    console.error("[ERROR] Updating deployment file failed:", error);
  }
  return {
    deployConfigDetailsArray,
    deployNetworkConfiguration,
    deploymentConfigFile,
    inputFileDirectory,
  };
}

export async function getNetworkName() {
  const network = await ethers.provider.getNetwork();
  let networkName = network.name;
  if (networkName === "homestead") {
    networkName = "mainnet";
  } else if (networkName === "unknown" && network.chainId === 421614) {
    // The arbitrum-sepolia rpc currently only returns a chainId
    // for arbitrum-sepolia so we need to manually set the name here
    networkName = "arbitrum-sepolia";
  } else if (networkName === "unknown" && network.chainId === 8453) {
    // base rpc doesn't return name, so handle unknown + chainId
    networkName = "base";
  }

  return networkName;
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}
