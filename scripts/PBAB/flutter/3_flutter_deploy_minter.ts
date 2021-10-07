import { ethers } from "hardhat";
import { GenArt721MinterFlutter__factory } from "../../contracts/factories/GenArt721MinterFlutter__factory";

async function main() {
  const [deployer] = await ethers.getSigners();

  const genArt721MinterFactory = new GenArt721MinterFlutter__factory(deployer);
  const genArt721Minter = await genArt721MinterFactory.deploy(
    "TODO: Enter GenArt721CoreV2 address here."
  );
  console.log(`GenArt721Minter deployed at ${genArt721Minter.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
