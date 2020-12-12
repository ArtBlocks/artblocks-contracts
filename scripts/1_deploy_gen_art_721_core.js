const {BigNumber} = require('ethers');

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Deploying GEN ART 721 Core from:",
    deployerAddress
  );

  const GenArt721Core = await ethers.getContractFactory("GenArt721Core");
  const genArt721Core = await GenArt721Core.deploy("Art Blocks", "BLOCKS", "0xb4a987e8a4Fb6f843489274670F3EE1c640AA3C9");

  console.log('GenArt721 Core token contract deployed at:', (await genArt721Core.deployed()).address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
