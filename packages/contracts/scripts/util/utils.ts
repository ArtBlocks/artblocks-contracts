import fs from "fs";
import path from "path";
import * as readline from "readline";
import { ProductClassEnum } from "./constants";
import { ethers } from "hardhat";

/**
 * Top-level directories under the contracts package root that clutter
 * autocomplete and are never deployment-config parents.
 */
const PATH_COMPLETE_IGNORE_AT_ROOT = new Set([
  "node_modules",
  "artifacts",
  "cache",
  "coverage",
  "typechain-types",
  "dist",
  "build",
]);

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
  minMintFeeETH?: string;
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

/**
 * Tab-complete paths relative to `baseDir` (typically the contracts package root).
 * Uses Node readline so Tab works in the terminal like a shell.
 */
function createDeploymentConfigPathCompleter(baseDir: string) {
  return (line: string): readline.CompleterResult => {
    const trimmed = line;

    let absSearchDir: string;
    let displayPrefix: string;
    let partialName: string;

    if (!trimmed) {
      absSearchDir = baseDir;
      displayPrefix = "";
      partialName = "";
    } else {
      const lastSlash = trimmed.lastIndexOf("/");
      if (lastSlash === -1) {
        absSearchDir = baseDir;
        displayPrefix = "";
        partialName = trimmed;
      } else {
        const relDir = trimmed.slice(0, lastSlash);
        partialName = trimmed.slice(lastSlash + 1);
        absSearchDir = path.resolve(baseDir, relDir);
        displayPrefix = trimmed.slice(0, lastSlash + 1);
      }
    }

    let entries: fs.Dirent[];
    try {
      const st = fs.statSync(absSearchDir);
      if (!st.isDirectory()) {
        return [[], line];
      }
      entries = fs.readdirSync(absSearchDir, { withFileTypes: true });
    } catch {
      return [[], line];
    }

    const atPackageRoot = path.resolve(absSearchDir) === path.resolve(baseDir);

    const matches = entries
      .filter((e) => {
        if (e.name.startsWith(".")) {
          return false;
        }
        if (atPackageRoot && PATH_COMPLETE_IGNORE_AT_ROOT.has(e.name)) {
          return false;
        }
        if (partialName === "") {
          return true;
        }
        return e.name.startsWith(partialName);
      })
      .map((e) => {
        const rel =
          displayPrefix === "" ? e.name : `${displayPrefix}${e.name}`;
        return e.isDirectory() ? `${rel}/` : rel;
      })
      .sort();

    return [matches.length ? matches : [], line];
  };
}

function promptDeploymentConfigPath(
  label: string,
  baseDir: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      completer: createDeploymentConfigPathCompleter(baseDir),
      terminal: process.stdin.isTTY,
    });

    let finished = false;

    const onSigInt = () => {
      process.removeListener("SIGINT", onSigInt);
      finished = true;
      rl.close();
      reject(new Error("Config path prompt aborted (SIGINT)"));
    };
    process.once("SIGINT", onSigInt);

    rl.setPrompt(`${label}: `);
    rl.prompt();

    rl.on("line", (answer) => {
      finished = true;
      process.removeListener("SIGINT", onSigInt);
      rl.close();
      resolve(answer.trim());
    });

    rl.on("close", () => {
      if (!finished) {
        process.removeListener("SIGINT", onSigInt);
        reject(
          new Error(
            "Config path prompt closed before a path was entered (empty stdin or EOF)"
          )
        );
      }
    });
  });
}

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
  if (!appPath) {
    throw new Error(
      "[ERROR] Could not resolve package root directory for config path resolution"
    );
  }
  console.log(appPath);
  console.log(
    `[INFO] example deployment config file is:\n\n${exampleConfigPath}\n`
  );
  console.log(
    "[INFO] Tab completes paths relative to the directory printed above."
  );
  const deploymentConfigFile = await promptDeploymentConfigPath(
    promptMessage,
    appPath
  );
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
  } else if (networkName === "unknown" && network.chainId === 8453) {
    // base rpc doesn't return name, so handle unknown + chainId
    networkName = "base";
  } else if (networkName === "unknown" && network.chainId === 31337) {
    networkName = "hardhat";
  }

  return networkName;
}

export async function getChainId(): Promise<number> {
  const network = await ethers.provider.getNetwork();
  return network.chainId;
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
}
