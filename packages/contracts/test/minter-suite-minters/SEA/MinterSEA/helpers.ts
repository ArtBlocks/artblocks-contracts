import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import { T_Config } from "../../../util/common";

// helper functions for MinterSEA tests

export async function advanceToAuctionStartTime(config: T_Config) {
  // advance time to auction start time - 1 second
  // @dev this makes next block timestamp equal to auction start time
  await ethers.provider.send("evm_mine", [config.startTime - 1]);
}

// helper function to initialize a token auction on project zero
// @dev "user" account is the one who initializes the auction
export async function initializeProjectZeroTokenZeroAuction(config: T_Config) {
  await advanceToAuctionStartTime(config);
  // someone initializes the auction
  const targetToken = BigNumber.from(config.projectZeroTokenZero.toString());
  await config.minter
    .connect(config.accounts.user)
    .createBid(targetToken, config.genArt721Core.address, {
      value: config.basePrice,
    });
}

// helper function to initialize a token auction on project zero, and then
// advance time to the end of the auction, but do not settle the auction
export async function initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(
  config: T_Config
) {
  await initializeProjectZeroTokenZeroAuction(config);
  // advance time to end of auction
  await ethers.provider.send("evm_mine", [
    config.startTime + config.defaultAuctionLengthSeconds,
  ]);
}

// helper function to initialize a token auction on project zero, advances to end
// of auction, then settles the auction
export async function initializeProjectZeroTokenZeroAuctionAndSettle(
  config: T_Config
) {
  await initializeProjectZeroTokenZeroAuctionAndAdvanceToEnd(config);
  // settle the auction
  const targetToken = BigNumber.from(config.projectZeroTokenZero.toString());
  await config.minter
    .connect(config.accounts.user)
    .settleAuction(targetToken, config.genArt721Core.address);
}
