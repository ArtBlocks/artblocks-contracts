const { BigNumber } = require("ethers");
var prompt = require("prompt-sync")();

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Deploying GEN ART 721 Core Plus from:", deployerAddress);

  const randomizerAddress = prompt("randomizer address? ");

  const contract = await ethers.getContractFactory("GenArt721CorePlus");
  const deployedContract = await contract.deploy(
    "Art Blocks",
    "BLOCKS",
    randomizerAddress
  );

  console.log(
    "GenArt721 Core token contract deployed at:",
    (await deployedContract.deployed()).address
  );
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
