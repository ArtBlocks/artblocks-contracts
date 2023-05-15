import { ethers } from "hardhat";

import { GenArt721CoreV2LegendsOfMetaterra__factory } from "../../contracts/factories/GenArt721CoreV2LegendsOfMetaterra__factory";
import { GenArt721MinterLegendsOfMetaterra__factory } from "../../contracts/factories/GenArt721MinterLegendsOfMetaterra__factory";

import { createPBABBucket } from "../../util/aws_s3";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
// TODO: Update and verify the below configuration items before deploying!
//////////////////////////////////////////////////////////////////////////////
const pbabTokenName = "Legends of Metaterra PBAB";
const pbabTokenTicker = "LOM";
const pbabTransferAddress = "0x78DE7DcFA6fdF63A1BcF2584Cc1CACC6F6635F4E";
const rendererProviderAddress = "0xf5a5fabF99890c44E15BC2481b5080ccc1155e64";
const randomizerContractAddress = "0x088098f7438773182b703625c4128aff85fcffc4";
//////////////////////////////////////////////////////////////////////////////
// CONFIG ENDS HERE
//////////////////////////////////////////////////////////////////////////////

async function main() {
  const [deployer] = await ethers.getSigners();

  const network = await ethers.provider.getNetwork();
  const networkName = network.name == "homestead" ? "mainnet" : network.name;

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  await createPBABBucket(pbabTokenName, networkName);

  // Deploy Core contract.
  console.log(`Using Randomizer deployed at ${randomizerContractAddress}`);
  const genArt721CoreFactory = new GenArt721CoreV2LegendsOfMetaterra__factory(
    deployer
  );
  const genArt721Core = await genArt721CoreFactory.deploy(
    pbabTokenName,
    pbabTokenTicker,
    randomizerContractAddress
  );

  await genArt721Core.deployed();
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  // Deploy Minter contract.
  const genArt721MinterFactory = new GenArt721MinterLegendsOfMetaterra__factory(
    deployer
  );
  const genArt721Minter = await genArt721MinterFactory.deploy(
    genArt721Core.address
  );

  await genArt721Minter.deployed();
  console.log(`Minter deployed at ${genArt721Minter.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Allowlist the Minter on the Core contract.
  await genArt721Core
    .connect(deployer)
    .addMintWhitelisted(genArt721Minter.address);
  console.log(`Allowlisted the Minter on the Core contract.`);

  // Update the Renderer provider.
  await genArt721Core
    .connect(deployer)
    .updateRenderProviderAddress(rendererProviderAddress);
  console.log(`Updated the renderer provider to: ${rendererProviderAddress}.`);

  // Set Minter owner.
  await genArt721Minter.connect(deployer).setOwnerAddress(pbabTransferAddress);
  console.log(`Set the Minter owner to: ${pbabTransferAddress}.`);

  // Allowlist AB staff (testnet only)
  if (network.name == "ropsten") {
    // purplehat
    await genArt721Core
      .connect(deployer)
      .addWhitelisted("0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63");
    // dogbot
    await genArt721Core
      .connect(deployer)
      .addWhitelisted("0x3c3cAb03C83E48e2E773ef5FC86F52aD2B15a5b0");
    // ben_thank_you
    await genArt721Core
      .connect(deployer)
      .addWhitelisted("0x0B7917b62BC98967e06e80EFBa9aBcAcCF3d4928");
    console.log(`Performing ${network.name} deployment, allowlisted AB staff.`);
  }

  // Allowlist new PBAB owner.
  await genArt721Core.connect(deployer).addWhitelisted(pbabTransferAddress);
  console.log(`Allowlisted Core contract access for: ${pbabTransferAddress}.`);

  // Transfer Core contract to new PBAB owner.
  await genArt721Core.connect(deployer).updateAdmin(pbabTransferAddress);
  console.log(`Transferred Core contract admin to: ${pbabTransferAddress}.`);

  // Output instructions for manual Etherscan verification.
  const standardVerify =
    "yarn hardhat verify --contract <path to .sol>:<contract name>";
  console.log(`Verify GenArt721CoreV2 deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721Core.address} "${pbabTokenName}" "${pbabTokenTicker}" ${randomizerContractAddress}`
  );
  console.log(`Verify GenArt721Minter deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721Minter.address} ${genArt721Core.address}`
  );

  //////////////////////////////////////////////////////////////////////////////
  // SETUP ENDS HERE
  //////////////////////////////////////////////////////////////////////////////
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
