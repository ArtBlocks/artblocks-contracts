import { ethers } from "hardhat";
import { GenArt721Minter2__factory } from "./contracts/factories/GenArt721Minter2__factory";
import * as createPrompt from "prompt-sync";

const prompt = createPrompt({});

async function main() {
  const [deployer] = await ethers.getSigners();

  const genArt721CoreAddress = prompt("GenArt721Core Address: ");

  const genArt721MinterFactory = new GenArt721Minter2__factory(deployer);
  const genArt721Minter = await genArt721MinterFactory.deploy(
    genArt721CoreAddress
  );

  console.log(`GenArt721Minter deployed at ${genArt721Minter.address}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
