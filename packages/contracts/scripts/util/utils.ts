import prompt from "prompt";
import hre from "hardhat";
import fs from "fs";
import path from "path";
import { ethers } from "ethers";
var util = require("util");

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gets the configured max nominal gas price in gwei for the current network
 * @returns the max nominal gas price in gwei for the current network
 */
function getMaxNominalGasPriceGwei(): number {
  // Require maxNominalGasPrice defined in hardhat config
  const maxNominalGasPriceGwei: number =
    hre.network.config.maxNominalGasPriceGwei;
  if (!maxNominalGasPriceGwei) {
    throw new Error(
      `[ERROR] maxNominalGasPrice must be defined in hardhat.config.ts for the current network ${hre.network.name}`
    );
  }
  return maxNominalGasPriceGwei;
}

/**
 * Ensures the current gas price is below the configured max nominal gas price
 * Throws an error if the current gas price is above the configured max nominal gas price
 */
export async function requireLowGasPrice() {
  const maxNominalGasPriceGwei = getMaxNominalGasPriceGwei();
  // get gas price and ensure it is below the max nominal gas price
  const gasPriceGwei = parseFloat(
    ethers.utils.formatUnits(await hre.ethers.provider.getGasPrice(), "gwei")
  );
  if (gasPriceGwei > maxNominalGasPriceGwei) {
    throw new Error(
      `[ERROR] Gas price is ${gasPriceGwei.toString()} gwei, which is above the configured max nominal gas price of ${maxNominalGasPriceGwei} gwei`
    );
  }
  console.log(
    `[INFO] Gas price is ${gasPriceGwei.toString()} gwei, which is lt the configured max nominal gas price of ${maxNominalGasPriceGwei} gwei`
  );
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

export type DeployConfigDetails = {
  network?: string;
  environment?: string;
  // shared randomizer fields
  randomizerName?: string;
  pseudorandomAtomicContractAddress?: string;
  pseudorandomAtomicContractName?: string;
  // shared minter filter fields
  existingAdminACL?: string;
  adminACLContractName?: string;
  minterFilterName?: string;
  existingCoreRegistry?: string;
  coreRegistryContractName?: string;
  // shared minter fields
  minterName?: string;
  minterFilterAddress?: string;
  approveMinterGlobally?: boolean;
};

export async function getConfigInputs(
  exampleConfigPath: string,
  promptMessage: string
): Promise<{
  deployConfigDetailsArray: DeployConfigDetails[];
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
  try {
    ({ deployConfigDetailsArray } = await import(fullImportPath));
  } catch (error) {
    throw new Error(
      `[ERROR] Unable to import deployment configuration file at: ${fullDeploymentConfigPath}
      Please ensure the file exists (e.g. deployments/engine/V3/internal-testing/dev-example/minter-deploy-config-01.dev.ts)`
    );
  }
  // record all deployment logs to a file, monkey-patching stdout
  const pathToMyLogFile = path.join(inputFileDirectory, "DEPLOYMENT_LOGS.log");
  var myLogFileStream = fs.createWriteStream(pathToMyLogFile, { flags: "a+" });
  var log_stdout = process.stdout;
  console.log = function (d) {
    myLogFileStream.write(util.format(d) + "\n");
    log_stdout.write(util.format(d) + "\n");
  };
  // record relevant deployment information in logs
  console.log(`----------------------------------------`);
  console.log(`[INFO] Datetime of deployment: ${new Date().toISOString()}`);
  console.log(
    `[INFO] Deployment configuration file: ${fullDeploymentConfigPath}`
  );
  return { deployConfigDetailsArray, deploymentConfigFile, inputFileDirectory };
}
