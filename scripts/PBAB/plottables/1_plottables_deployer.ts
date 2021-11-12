import { ethers } from "hardhat";
import { RandomizerPlottables__factory } from "../../contracts/factories/RandomizerPlottables__factory";
import { GenArt721CoreV2Plottables__factory } from "../../contracts/factories/GenArt721CoreV2Plottables__factory";
import { GenArt721MinterPlottables__factory } from "../../contracts/factories/GenArt721MinterPlottables__factory";

async function main() {
  const [deployer] = await ethers.getSigners();

  const randomizerFactory = new RandomizerPlottables__factory(deployer);
  const randomizer = await randomizerFactory.deploy();

  await randomizer.deployed();
  console.log(`Randomizer deployed at ${randomizer.address}`);

  const genArt721CoreFactory = new GenArt721CoreV2Plottables__factory(deployer);
  const genArt721Core = await genArt721CoreFactory.deploy(
    "Plottables",
    "PLOTS",
    randomizer.address
  );

  await genArt721Core.deployed();
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  const genArt721MinterFactory = new GenArt721MinterPlottables__factory(
    deployer
  );
  const genArt721Minter = await genArt721MinterFactory.deploy(
    genArt721Core.address
  );

  await genArt721Minter.deployed();
  console.log(`GenArt721Minter deployed at ${genArt721Minter.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
