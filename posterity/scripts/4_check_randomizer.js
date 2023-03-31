var prompt = require("prompt-sync")();
const GenArt721Core = require("../../artifacts/contracts/PBAB+Collabs/GenArt721CoreV2_PBAB.sol/GenArt721CoreV2_PBAB.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Checking:", deployerAddress);

  const genArt721Address = prompt("GenArt721 address? ");
  const genArt721 = new ethers.Contract(
    genArt721Address,
    GenArt721Core.abi,
    deployer //provider
  );

  let randomizer = await genArt721.randomizerContract();

  console.log("randomizer: " + randomizer);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
