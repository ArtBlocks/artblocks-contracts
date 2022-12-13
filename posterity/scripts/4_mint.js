var prompt = require("prompt-sync")();
const GenArt721Minter = require("../../artifacts/contracts/PBAB+Collabs/GenArt721Minter_PBAB.sol/GenArt721Minter_PBAB.json");
var utils = require("ethers").utils;

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Minting:", deployerAddress);

  const minterAddress = prompt("Minting Contract Address? ");
  const genArt721Minter = new ethers.Contract(
    minterAddress,
    GenArt721Minter.abi,
    deployer //provider
  );

  await genArt721Minter.purchase("0", { value: utils.parseEther("0.000000000001") });

  console.log("mint done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
