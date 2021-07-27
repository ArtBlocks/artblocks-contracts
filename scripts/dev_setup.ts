import { ethers } from "hardhat";
import { GenArt721Core__factory } from "./contracts/factories/GenArt721Core__factory";
import { GenArt721Minter3__factory } from "./contracts/factories/GenArt721Minter3__factory";

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();

  const randomizerFactory = await ethers.getContractFactory(
    "contracts/Randomizer.sol:Randomizer"
  );
  const randomizer = await randomizerFactory.deploy();
  console.log(`Randomizer deployed at ${randomizer.address}`);

  const genArt721CoreFactory = new GenArt721Core__factory(deployer);
  const genArt721Core = await genArt721CoreFactory.deploy(
    "Art Blocks Dev",
    "BLOCKS",
    randomizer.address
  );
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  const genArt721MinterFactory = new GenArt721Minter3__factory(deployer);
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
