var prompt = require("prompt-sync")();
const GenArt721Core = require("../../artifacts/contracts/PBAB+Collabs/GenArt721CoreV2_ENGINE_FLEX.sol/GenArt721CoreV2_ENGINE_FLEX.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Adding minter:", deployerAddress);

  const genArt721Address = prompt("GenArt721 address? ");
  const minterAddress = prompt("Minting Contract Address? ");
  const genArt721Core = new ethers.Contract(
    genArt721Address,
    GenArt721Core.abi,
    deployer //provider
  );

  await genArt721Core.addMintWhitelisted(minterAddress);

  console.log("addMinter done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
