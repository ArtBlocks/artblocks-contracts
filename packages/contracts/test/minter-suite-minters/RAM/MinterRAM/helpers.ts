import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import { T_Config, deployAndGet } from "../../../util/common";

// helper functions for MinterRAM tests

export async function configureDefaultProjectZero(config: T_Config) {
  // configure project zero
  await config.minter.connect(config.accounts.artist).setAuctionDetails(
    config.projectZero,
    config.genArt721Core.address,
    config.startTime,
    config.defaultAuctionLengthSeconds + config.startTime,
    config.basePrice,
    true, // allowExtraTime
    true // admin/artist only mint period if sellout
  );
}

export async function placeMinBidInProjectZeroAuction(config: T_Config) {
  // get min next bid
  const minNextBid = await config.minter.getMinimumNextBid(
    config.projectZero,
    config.genArt721Core.address
  );
  // place bid
  await config.minter
    .connect(config.accounts.user)
    .createBid(
      config.projectZero,
      config.genArt721Core.address,
      minNextBid.minNextBidSlotIndex,
      {
        value: minNextBid.minNextBidValueInWei,
      }
    );
}

export async function advanceToAuctionStartTime(config: T_Config) {
  // advance time to auction start time - 1 second
  // @dev this makes next block timestamp equal to auction start time
  await ethers.provider.send("evm_mine", [config.startTime - 1]);
}

// helper function to configure project zero auction and advance to start time
export async function configureProjectZeroAuctionAndAdvanceToStartTime(
  config: T_Config
) {
  await configureDefaultProjectZero(config);
  await advanceToAuctionStartTime(config);
}

// helper function to initialize an auction on project zero
// @dev "user" account is the one who initializes the auction
export async function initializeMinBidInProjectZeroAuction(config: T_Config) {
  await configureDefaultProjectZero(config);
  await advanceToAuctionStartTime(config);
  // place bid in the auction
  await config.minter
    .connect(config.accounts.user)
    .createBid(config.projectZero, config.genArt721Core.address, 0, {
      value: config.basePrice,
    });
}

// helper function to initialize an auction on project zero, and place bids
// to enter a sellout, live auction
//
export async function configureProjectZeroAuctionAndSelloutLiveAuction(
  config: T_Config
) {
  await initializeMinBidInProjectZeroAuction(config);
  // place 14 more bids in the auction to "sellout" the auction
  for (let i = 0; i < 14; i++) {
    await placeMinBidInProjectZeroAuction(config);
  }
}

// helper function to sellout an auction and advance to State C
export async function selloutProjectZeroAuctionAndAdvanceToStateC(
  config: T_Config
) {
  await configureProjectZeroAuctionAndSelloutLiveAuction(config);
  // advance time to end of auction, entering State C
  await ethers.provider.send("evm_mine", [
    config.startTime + config.defaultAuctionLengthSeconds,
  ]);
}

// helper function to initialize an auction on project zero, and place bids
// to enter a sellout, live auction. Configures auction to skip State C.
//
export async function configureProjectZeroAuctionSelloutAndAdvanceToStateD(
  config: T_Config
) {
  // configure project zero to skip State C
  await config.minter.connect(config.accounts.artist).setAuctionDetails(
    config.projectZero,
    config.genArt721Core.address,
    config.startTime,
    config.defaultAuctionLengthSeconds + config.startTime,
    config.basePrice,
    true, // allowExtraTime
    false // admin/artist only mint period if sellout
  );
  // advance to auction start time
  await advanceToAuctionStartTime(config);
  // place 15 bids in the auction to "sellout" the auction
  for (let i = 0; i < 15; i++) {
    await placeMinBidInProjectZeroAuction(config);
  }
  // advance time to end of auction, entering State D
  await ethers.provider.send("evm_mine", [
    config.startTime + config.defaultAuctionLengthSeconds,
  ]);
}

// helper function to initialize an auction on project zero, and place bids
// to enter a sellout, live auction. Configures auction to skip State C.
// induces E1 state by reducing max invocations on project by one.
//
export async function configureProjectZeroAuctionSelloutAndAdvanceToStateDWithE1(
  config: T_Config
) {
  await configureProjectZeroAuctionSelloutAndAdvanceToStateD(config);
  // artist reduce max invocations on core to enter E1
  await config.genArt721Core
    .connect(config.accounts.artist)
    .updateProjectMaxInvocations(config.projectZero, 14);
}

// helper function to initialize and place bid in auction on project zero, and then
// advance time to the end of the auction
export async function initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(
  config: T_Config
) {
  await initializeMinBidInProjectZeroAuction(config);
  // advance time to end of auction
  await ethers.provider.send("evm_mine", [
    config.startTime + config.defaultAuctionLengthSeconds,
  ]);
}

// helper function to initialize and place bid in auction on project zero, and then
// advance time near the end of the auction, place another bid and cause auction to enter extra time
export async function initializeMinBidInProjectZeroAuctionAndEnterExtraTime(
  config: T_Config
) {
  // update project zero to allow one max invocation
  await config.genArt721Core
    .connect(config.accounts.artist)
    .updateProjectMaxInvocations(config.projectZero, 1);
  await initializeMinBidInProjectZeroAuction(config);
  // advance time to near the end of auction
  await ethers.provider.send("evm_mine", [
    config.startTime + config.defaultAuctionLengthSeconds - 60,
  ]);
  // place bid to enter extra time
  await placeMinBidInProjectZeroAuction(config);
  // advance time to near the end of auction
  await ethers.provider.send("evm_mine", [
    config.startTime + config.defaultAuctionLengthSeconds - 58,
  ]);
}

// helper function to initialize and place bid in auction on project zero, and then
// advance time to the end of the auction. Then mints the token to the winner.
export async function initializeProjectZeroTokenZeroAuctionAndMint(
  config: T_Config
) {
  await initializeMinBidInProjectZeroAuctionAndAdvanceToEnd(config);
  // mint token to the winner
  await config.minter
    .connect(config.accounts.deployer)
    .adminArtistDirectMintTokensToWinners(
      config.projectZero,
      config.genArt721Core.address,
      [1] // only one token available to mint
    );
}

export async function mintTokenOnDifferentMinter(config: T_Config) {
  // deploy and set different minter
  const differentMinter = await deployAndGet(config, "MinterSetPriceV5", [
    config.minterFilter.address,
  ]);
  await config.minterFilter
    .connect(config.accounts.deployer)
    .approveMinterGlobally(differentMinter.address);
  await config.minterFilter
    .connect(config.accounts.deployer)
    .setMinterForProject(
      config.projectZero,
      config.genArt721Core.address,
      differentMinter.address
    );
  // mint token to user using different minter
  await differentMinter
    .connect(config.accounts.artist)
    .updatePricePerTokenInWei(
      config.projectZero,
      config.genArt721Core.address,
      0
    );
  await differentMinter
    .connect(config.accounts.artist)
    .syncProjectMaxInvocationsToCore(
      config.projectZero,
      config.genArt721Core.address
    );
  await differentMinter
    .connect(config.accounts.artist)
    .purchaseTo(
      config.accounts.user.address,
      config.projectZero,
      config.genArt721Core.address,
      {
        value: config.pricePerTokenInWei,
      }
    );
  // change minter back to original minter
  await config.minterFilter
    .connect(config.accounts.deployer)
    .setMinterForProject(
      config.projectZero,
      config.genArt721Core.address,
      config.minter.address
    );
}
