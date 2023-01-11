import { ethers } from "hardhat";
import { GenArt721CoreV2LegendsOfMetaterra__factory } from "../../contracts/factories/GenArt721CoreV2LegendsOfMetaterra__factory";
import { GenArt721MinterLegendsOfMetaterra__factory } from "../../contracts/factories/GenArt721MinterLegendsOfMetaterra__factory";

import { createPBABBucket } from "../../util/aws_s3";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const pbabTokenName = "Legends of Metaterra PBAB";
const pbabTokenTicker = "LOM";
const pbabTransferAddress = "0xe18Fc96ba325Ef22746aDA9A82d521845a2c16f8";
const rendererProviderAddress = "0x2246475beddf9333b6a6D9217194576E7617Afd1";
const randomizerContractAddress = "0xEC5DaE4b11213290B2dBe5295093f75920bD2982";
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
  if (
    network.name == "ropsten" ||
    network.name == "rinkeby" ||
    network.name == "goerli"
  ) {
    console.log(`Detected testnet - Adding AB staff to the whitelist.`);
    const devAddresses = [
      "0xB8559AF91377e5BaB052A4E9a5088cB65a9a4d63", // purplehat
      "0x3c3cAb03C83E48e2E773ef5FC86F52aD2B15a5b0", // dogbot
      "0x0B7917b62BC98967e06e80EFBa9aBcAcCF3d4928", // ben_thank_you
      "0x2246475beddf9333b6a6D9217194576E7617Afd1", // ryley-o.eth
    ];
    for (let i = 0; i < devAddresses.length; i++) {
      await genArt721Core.connect(deployer).addWhitelisted(devAddresses[i]);
      console.log(`Allowlisted dev ${devAddresses[i]} on the Core contract.`);
    }
  }

  // Allowlist new PBAB owner.
  await genArt721Core.connect(deployer).addWhitelisted(pbabTransferAddress);
  console.log(`Allowlisted Core contract access for: ${pbabTransferAddress}.`);

  // Transfer Core contract to new PBAB owner.
  await genArt721Core.connect(deployer).updateAdmin(pbabTransferAddress);
  console.log(`Transferred Core contract admin to: ${pbabTransferAddress}.`);

  // // Create PBAB Bucket
  // await createPBABBucket(pbabTokenName, networkName);
  // console.log(
  //   `pbab bucket created for ${pbabTokenName}, network ${networkName}`
  // );

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
