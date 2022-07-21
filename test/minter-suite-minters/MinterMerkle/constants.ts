import { ethers } from "hardhat";

export const CONFIG_MERKLE_ROOT =
  ethers.utils.formatBytes32String("merkleRoot");
export const CONFIG_MINT_LIMITER_DISABLED = ethers.utils.formatBytes32String(
  "mintLimiterDisabled"
);
