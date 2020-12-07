const {BigNumber} = require('ethers');
var prompt = require('prompt-sync')();

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(
    "Deploying GEN ART 721 Bonus from:",
    deployerAddress
  );

  const erc20Address = prompt('erc20 address? ');
  const minterAddress = prompt('minter address? ');
  const bonusValueInWei = prompt('bonusValueInWei');
  //const contractOwnsTokens = prompt('contractOwnsTokens? ');
  const GenArt721Bonus = await ethers.getContractFactory("GenArt721Bonus");

  const genArt721Bonus = await GenArt721Bonus.deploy(erc20Address, minterAddress, bonusValueInWei);

  console.log('GenArt721 Bonus contract deployed at:', (await genArt721Bonus.deployed()).address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
