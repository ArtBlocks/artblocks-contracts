import { ethers } from "hardhat";

import { T_Config } from "../../../util/common";
import { ONE_DAY } from "../../../util/constants";

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
