import { ethers } from "hardhat";
import { RandomizerBrightMoments__factory } from "../../contracts/factories/RandomizerBrightMoments__factory";
import { GenArt721CoreV2BrightMoments__factory } from "../../contracts/factories/GenArt721CoreV2BrightMoments__factory";
import { GenArt721MinterBrightMoments__factory } from "../../contracts/factories/GenArt721MinterBrightMoments__factory";

async function main() {
  const [deployer] = await ethers.getSigners();

  const randomizerFactory = new RandomizerBrightMoments__factory(deployer)
  const randomizer = await randomizerFactory.deploy();

  await randomizer.deployed();
  console.log(`Randomizer deployed at ${randomizer.address}`);

  const genArt721CoreFactory = new GenArt721CoreV2BrightMoments__factory(deployer);
  const genArt721Core = await genArt721CoreFactory.deploy(
    "Bright Moments",
    "MOMENT",
    randomizer.address
  );

  await genArt721Core.deployed();
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  const genArt721MinterFactory = new GenArt721MinterBrightMoments__factory(deployer);
  const genArt721Minter = await genArt721MinterFactory.deploy(
    genArt721Core.address
  );

  await genArt721Minter.deployed();
  console.log(`GenArt721Minter deployed at ${genArt721Minter.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
