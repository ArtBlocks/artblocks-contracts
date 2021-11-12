import { ethers } from "hardhat";
import { RandomizerFlutter__factory } from "../../contracts/factories/RandomizerFlutter__factory";

async function main() {
  const [deployer] = await ethers.getSigners();

  const randomizerFactory = new RandomizerFlutter__factory(deployer);
  const randomizer = await randomizerFactory.deploy();
  console.log(`Randomizer deployed at ${randomizer.address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
