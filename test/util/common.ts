/**
 * This file contains common types and util functions for testing purposes
 */
import { BN } from "@openzeppelin/test-helpers";
import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Contract } from "ethers";

export type TestAccountsArtBlocks = {
  deployer: SignerWithAddress;
  deployer2: SignerWithAddress;
  artist: SignerWithAddress;
  additional: SignerWithAddress;
  artist2: SignerWithAddress;
  additional2: SignerWithAddress;
  user: SignerWithAddress;
  user2: SignerWithAddress;
};

export type CoreWithMinterSuite = {
  randomizer: Contract;
  token: Contract;
  minterFilter: Contract;
};

export async function getAccounts(): Promise<TestAccountsArtBlocks> {
  const [
    deployer,
    deployer2,
    artist,
    additional,
    artist2,
    additional2,
    user,
    user2,
  ] = await ethers.getSigners();
  return {
    deployer: deployer,
    deployer2: deployer2,
    artist: artist,
    additional: additional,
    artist2: artist2,
    additional2: additional2,
    user: user,
    user2: user2,
  };
}

export async function assignDefaultConstants(
  projectZero: Number = 0
): Promise<void> {
  this.projectZero = projectZero;
  this.name = "Non Fungible Token";
  this.symbol = "NFT";
  this.firstTokenId = new BN(projectZero.toString()).mul(new BN("1000000"));
  this.pricePerTokenInWei = ethers.utils.parseEther("1");
  this.maxInvocations = 15;
}

// utility function to simplify code when deploying any contract from factory
export async function deployAndGet(
  coreContractName: string,
  deployArgs?: any[]
): Promise<Contract> {
  const contractFactory = await ethers.getContractFactory(coreContractName);
  return await contractFactory
    .connect(this.accounts.deployer)
    .deploy(...deployArgs);
}

// utility function to deploy randomizer, core, and MinterFilter
export async function deployCoreWithMinterFilter(
  coreContractName: string,
  minterFilterName: string
): Promise<CoreWithMinterSuite> {
  const randomizer = await deployAndGet.call(this, "BasicRandomizer", []);
  const token = await deployAndGet.call(this, coreContractName, [
    this.name,
    this.symbol,
    randomizer.address,
  ]);
  const minterFilter = await deployAndGet.call(this, minterFilterName, [
    token.address,
  ]);
  // allowlist minterFilter on the core contract
  await token
    .connect(this.accounts.deployer)
    .addMintWhitelisted(minterFilter.address);
  return { randomizer, token, minterFilter };
}
