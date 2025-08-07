import { ethers } from "hardhat";

export const revertMessages = {
  onlyCoreAdminACL: "Only core admin ACL allowed",
  tokenAlreadyClaimed: "Token already claimed",
  claimingNotYetStarted: "Claiming not yet started",
  onlySendPricePerToken: "Only send price per token",
  tokenNotPreMinted: "Token not pre-minted",
  maxInvocationsReached: "Maximum number of invocations reached",
  projectNotActive: "Project not active",
  projectNotExist: "Project does not exist",
  onlyMinterFilter: "Only minter filter",
  onlyPMPContract: "Only PMP contract",
  onlyPseudorandomAtomicContract: "Only pseudorandom atomic contract",
};

export const testValues = {
  projectZero: 0,
  projectOne: 1,
  basePriceInWei: ethers.utils.parseEther("0.1"),
  priceIncrementInWei: ethers.utils.parseEther("0.0005"),
  timestampStart: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  timestampPast: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
  amountToPreMint: 15,
  tokenIdZero: 0,
  tokenIdOne: 1,
  tokenIdTwo: 2,
  tokenIdThree: 3,
  tokenIdFour: 4,
  maxInvocations: 500,
};

export const events = {
  ProjectNextTokenEjected: "ProjectNextTokenEjected",
  AuctionSettled: "AuctionSettled",
  TokenClaimed: "TokenClaimed",
  PriceConfigured: "PriceConfigured",
  TimestampStartConfigured: "TimestampStartConfigured",
};
