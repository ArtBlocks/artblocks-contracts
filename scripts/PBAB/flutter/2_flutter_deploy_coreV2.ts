import { ethers } from "hardhat";
import { GenArt721CoreV2Flutter__factory } from "./contracts/factories/GenArt721CoreV2Flutter__factory";

async function main() {
  const [deployer] = await ethers.getSigners();

  const genArt721CoreFactory = new GenArt721CoreV2Flutter__factory(deployer);
  const genArt721Core = await genArt721CoreFactory.deploy(
    "Flutter Gen Art",
    "FLUTTER",
    "TODO: Enter Randomizer address here."
  );
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
