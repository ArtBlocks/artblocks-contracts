import { ethers } from "hardhat";

import { T_Config, deployAndGet } from "../../../util/common";
import { ONE_DAY, ONE_MINUTE } from "../../../util/constants";
import { Contract } from "ethers";
import { deployCore } from "../../../util/common";

// helper functions for DAExp Settlement tests

export async function advanceToAuctionStartTime(config: T_Config) {
  // advance time to auction start time
  // @dev this makes next block timestamp equal to auction start time + 1 sec,
  // which is the required condition for the DAExp auction to start
  await ethers.provider.send("evm_mine", [config.startTime]);
}

// helper function to configure auction on project zero
// @dev "user" account is the one who initializes the auction
export async function configureProjectZeroAuction(config: T_Config) {
  await config.minter
    .connect(config.accounts.artist)
    .setAuctionDetails(
      config.projectZero,
      config.genArt721Core.address,
      config.startTime,
      config.defaultHalfLife,
      config.startingPrice,
      config.basePrice
    );
}

// helper function to configure auction on project zero, and then
// advance time to auction start time
export async function configureProjectZeroAuctionAndAdvanceToStart(
  config: T_Config
) {
  await configureProjectZeroAuction(config);
  // advance time to starting of auction
  await advanceToAuctionStartTime(config);
}

// helper function to configure auction on project zero, and then
// advance time to auction start time. Max invocations are then
// set to one, a purchase is performed, and the auction is left
// in a state where it is sold out, but no revenues have been collected.
export async function configureProjectZeroAuctionAndSellout(config: T_Config) {
  await configureProjectZeroAuction(config);
  // advance time to starting of auction
  await advanceToAuctionStartTime(config);
  // set max invocations to 1
  await config.minter
    .connect(config.accounts.artist)
    .manuallyLimitProjectMaxInvocations(
      config.projectZero,
      config.genArt721Core.address,
      1
    );
  // purchase token
  await config.minter
    .connect(config.accounts.user)
    .purchase(config.projectZero, config.genArt721Core.address, {
      value: config.startingPrice,
    });
}

// helper function to configure auction on project zero, and then
// advance time one day after auction start time
export async function configureProjectZeroAuctionAndAdvanceOneDay(
  config: T_Config
) {
  await configureProjectZeroAuction(config);
  // advance time to one day after auction start time
  await ethers.provider.send("evm_mine", [config.startTime + ONE_DAY]);
}

// helper function to configure auction on project zero, and then
// advance time one day after auction start time, then collect revenues
export async function configureProjectZeroAuctionAndAdvanceOneDayAndWithdrawRevenues(
  config: T_Config
) {
  await configureProjectZeroAuction(config);
  // advance time to one day after auction start time
  await ethers.provider.send("evm_mine", [config.startTime + ONE_DAY]);
  await config.minter
    .connect(config.accounts.artist)
    .withdrawArtistAndAdminRevenues(
      config.projectZero,
      config.genArt721Core.address
    );
}

export async function mintTokenOnDifferentMinter(config: T_Config) {
  const minterSetPrice = await deployAndGet(config, "MinterSetPriceV5", [
    config.minterFilter.address,
  ]);
  await config.minterFilter
    .connect(config.accounts.deployer)
    .approveMinterGlobally(minterSetPrice.address);
  await config.minterFilter.setMinterForProject(
    config.projectZero,
    config.genArt721Core.address,
    minterSetPrice.address
  );
  await minterSetPrice
    .connect(config.accounts.artist)
    .updatePricePerTokenInWei(
      config.projectZero,
      config.genArt721Core.address,
      config.pricePerTokenInWei
    );
  await minterSetPrice
    .connect(config.accounts.artist)
    .purchase(config.projectZero, config.genArt721Core.address, {
      value: config.pricePerTokenInWei,
    });
  // set minter back to original Minter
  await config.minterFilter.setMinterForProject(
    config.projectZero,
    config.genArt721Core.address,
    config.minter.address
  );
}

/**
 * Deploys a new core contract, and configures project one to use config.minter.
 * Then sells out project one, via a purchase from user account.
 * @param config config object
 * @returns newly deployed core contract
 */
export async function configureProjectOneOnNewCoreAndSellout(
  config: T_Config
): Promise<Contract> {
  // deploy new core contract
  let newCore: Contract;
  ({ genArt721Core: newCore } = await deployCore(
    config,
    "GenArt721CoreV3",
    config.coreRegistry
  ));
  // const coreVersion = await newCore.coreVersion();
  // const coreType = await newCore.coreType();
  // configure the new core to use the shared minter filter
  await newCore
    .connect(config.accounts.deployer)
    .updateMinterContract(config.minterFilter.address);
  // add project and set up for minting
  await newCore
    .connect(config.accounts.deployer)
    .addProject("NAME_1", config.accounts.artist.address);
  await newCore
    .connect(config.accounts.deployer)
    .addProject("NAME_2", config.accounts.artist.address);
  await newCore.toggleProjectIsActive(1);
  await newCore.connect(config.accounts.artist).toggleProjectIsPaused(1);
  await config.minterFilter.setMinterForProject(
    1,
    newCore.address,
    config.minter.address
  );
  // configure minter
  const newStartTime = config.startTime + ONE_DAY + ONE_MINUTE;
  await config.minter
    .connect(config.accounts.artist)
    .setAuctionDetails(
      1,
      newCore.address,
      newStartTime,
      config.defaultHalfLife,
      config.startingPrice,
      config.basePrice
    );
  // advance time to starting of auction
  await ethers.provider.send("evm_mine", [newStartTime]);
  // set max invocations to 1
  await config.minter
    .connect(config.accounts.artist)
    .manuallyLimitProjectMaxInvocations(1, newCore.address, 1);
  // purchase token
  await config.minter
    .connect(config.accounts.user)
    .purchase(1, newCore.address, { value: config.startingPrice });
  return newCore;
}
