import { ethers } from "hardhat";

import { T_Config } from "../../../util/common";

// helper functions for DALin tests

export async function advanceToAuctionStartTime(config: T_Config) {
  // advance time to auction start time
  // @dev this makes next block timestamp equal to auction start time + 1 sec,
  // which is the required condition for the DAExp auction to start
  await ethers.provider.send("evm_mine", [config.startTime]);
}

export async function advanceToAuctionEndTime(config: T_Config) {
  // advance time to auction start time
  // @dev this makes next block timestamp equal to auction start time + 1 sec,
  // which is the required condition for the DAExp auction to start
  await ethers.provider.send("evm_mine", [config.endTime]);
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
      config.endTime,
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
// advance time one day after auction start time
export async function configureProjectZeroAuctionAndAdvanceToEnd(
  config: T_Config
) {
  await configureProjectZeroAuction(config);
  // advance time to auction end time
  await advanceToAuctionEndTime(config);
}
