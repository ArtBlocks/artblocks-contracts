import { ethers } from "hardhat";
import { GenArt721CoreV2DoodleLabs__factory } from "./contracts/factories/GenArt721CoreV2DoodleLabs__factory";
import { GenArt721MinterDoodleLabs__factory } from "./contracts/factories/GenArt721MinterDoodleLabs__factory";
import { RandomizerDoodleLabs__factory } from "./contracts/factories/RandomizerDoodleLabs__factory";

async function main() {
  const [deployer] = await ethers.getSigners();

  const randomizerFactory = new RandomizerDoodleLabs__factory(deployer)
  const randomizer = await randomizerFactory.deploy();
  console.log(`Randomizer deployed at ${randomizer.address}`);

  const genArt721CoreFactory = new GenArt721CoreV2DoodleLabs__factory(deployer);
  const genArt721Core = await genArt721CoreFactory.deploy(
    "Doodle Labs Gen Art",
    "DOODLE",
    randomizer.address
  );
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  const genArt721MinterFactory = new GenArt721MinterDoodleLabs__factory(deployer);
  const genArt721Minter = await genArt721MinterFactory.deploy(
    genArt721Core.address
  );
  console.log(`GenArt721Minter deployed at ${genArt721Minter.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
