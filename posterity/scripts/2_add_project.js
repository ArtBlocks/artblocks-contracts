var prompt = require("prompt-sync")();
const GenArt721Core = require("../../artifacts/contracts/PBAB+Collabs/GenArt721CoreV2_ENGINE_FLEX.sol/GenArt721CoreV2_ENGINE_FLEX.json");

async function main() {
  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("Adding project:", deployerAddress);

  const genArt721Address = prompt("GenArt721 address? ");
  const genArt721Core = new ethers.Contract(
    genArt721Address,
    GenArt721Core.abi,
    deployer //provider
  );

  await genArt721Core.addProject(
    "TestProject1",
    "0x6a3633883F704a631B8BF8CA8C4A416a3e5Ed30d",
    "100000000000000000"
  );

  console.log("addProject done");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
