const {BigNumber} = require('ethers');
var prompt = require('prompt-sync')();

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Deploying GEN ART 721 Minter from:",
    deployerAddress
  );

  const genArt721Address = prompt('GenArt721 address? ');
  const GenArt721 = await ethers.getContractFactory("GenArt721Minter3");

  const genArt721 = await GenArt721.deploy(genArt721Address);

  console.log('GenArt721 Minter contract deployed at:', (await genArt721.deployed()).address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
