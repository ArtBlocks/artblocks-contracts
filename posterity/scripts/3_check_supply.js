var prompt = require("prompt-sync")();
const GenArt721Core = require("../../artifacts/contracts/PBAB+Collabs/GenArt721CoreV2_ENGINE_FLEX.sol/GenArt721CoreV2_ENGINE_FLEX.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("checking supply:", deployerAddress);

  const genArt721Address = prompt("GenArt721 address? ");
  const genArt721 = new ethers.Contract(
    genArt721Address,
    GenArt721Core.abi,
    deployer //provider
  );

  let supply = await genArt721.projectTokenInfo(0);

  console.log("project details: " + supply);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
