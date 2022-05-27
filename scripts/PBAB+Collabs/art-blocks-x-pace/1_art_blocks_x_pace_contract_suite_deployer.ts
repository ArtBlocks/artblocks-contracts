import { ethers } from "hardhat";

// Core Contract
import { GenArt721CoreV2ArtBlocksXPace__factory } from "../../contracts/factories/GenArt721CoreV2ArtBlocksXPace__factory";

// MinterSuite
import { MinterFilterV0PRTNR__factory } from "../../contracts/factories/MinterFilterV0PRTNR__factory";
import { MinterSetPriceERC20V0PRTNR__factory } from "../../contracts/factories/MinterSetPriceERC20V0PRTNR__factory";
import { MinterSetPriceV0PRTNR__factory } from "../../contracts/factories/MinterSetPriceV0PRTNR__factory";
import { MinterDALinV0PRTNR__factory } from "../../contracts/factories/MinterDALinV0PRTNR__factory";
import { MinterDAExpV0PRTNR__factory } from "../../contracts/factories/MinterDAExpV0PRTNR__factory";

import { createPBABBucket } from "../../util/aws_s3";

//////////////////////////////////////////////////////////////////////////////
// CONFIG BEGINS HERE
//////////////////////////////////////////////////////////////////////////////
const pbabTokenName = "Art Blocks x Pace";
const pbabTokenTicker = "ABXPACE";
// AB multi-sig wallet
const pbabTransferAddress = "0xCF00eC2B327BCfA2bee2D8A5Aee0A7671d08A283";
// AB primary sales wallet
const rendererProviderAddress = "0xf7A55108A6E830a809e88e74cbf5f5DE9D930153";
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
  const genArt721CoreFactory = new GenArt721CoreV2ArtBlocksXPace__factory(
    deployer
  );
  const genArt721Core = await genArt721CoreFactory.deploy(
    pbabTokenName,
    pbabTokenTicker,
    randomizerContractAddress
  );

  await genArt721Core.deployed();
  console.log(`GenArt721Core deployed at ${genArt721Core.address}`);

  // Deploy Minter Filter contract.
  const minterFilterFactory = new MinterFilterV0PRTNR__factory(deployer);
  const minterFilter = await minterFilterFactory.deploy(genArt721Core.address);
  await minterFilter.deployed();
  console.log(`MinterFilterV0_PRTNR deployed at ${minterFilter.address}`);

  // Deploy basic Minter contract (functionally equivalent to the current
  // standard Minter contract).
  const minterSetPriceERC20V0Factory = new MinterSetPriceERC20V0PRTNR__factory(
    deployer
  );
  const minterSetPriceERC20V0 = await minterSetPriceERC20V0Factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterSetPriceERC20V0.deployed();
  console.log(
    `MinterSetPriceERC20V0_PRTNR deployed at ${minterSetPriceERC20V0.address}`
  );

  // Deploy basic Minter contract that **only** supports ETH, as an optimization,
  // and thus _does not_ support custom ERC20 minting.
  const minterSetPriceV0Factory = new MinterSetPriceV0PRTNR__factory(deployer);
  const minterSetPriceV0 = await minterSetPriceV0Factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterSetPriceV0.deployed();
  console.log(`MinterSetPriceV0_PRTNR deployed at ${minterSetPriceV0.address}`);

  // Deploy automated linear-decay DA Minter contract that **only** supports ETH.
  const minterDALinV0Factory = new MinterDALinV0PRTNR__factory(deployer);
  const minterDALinV0 = await minterDALinV0Factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterDALinV0.deployed();
  console.log(`MinterDALinV0_PRTNR deployed at ${minterDALinV0.address}`);

  // Deploy automated exponential-decay DA Minter contract that **only** supports ETH.
  const minterDAExpV0Factory = new MinterDAExpV0PRTNR__factory(deployer);
  const minterDAExpV0 = await minterDAExpV0Factory.deploy(
    genArt721Core.address,
    minterFilter.address
  );
  await minterDAExpV0.deployed();
  console.log(`MinterDAExpV0_PRTNR deployed at ${minterDAExpV0.address}`);

  //////////////////////////////////////////////////////////////////////////////
  // DEPLOYMENT ENDS HERE
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  // SETUP BEGINS HERE
  //////////////////////////////////////////////////////////////////////////////

  // Allowlist the Minter on the Core contract.
  await genArt721Core
    .connect(deployer)
    .addMintWhitelisted(minterFilter.address);
  console.log(`Allowlisted the Minter on the Core contract.`);

  // Update the Renderer provider.
  await genArt721Core
    .connect(deployer)
    .updateRenderProviderAddress(rendererProviderAddress);
  console.log(`Updated the renderer provider to: ${rendererProviderAddress}.`);

  // Call `alertAsCanonicalMinterFilter`.
  await minterFilter.connect(deployer).alertAsCanonicalMinterFilter();
  console.log(`Called 'alertAsCanonicalMinterFilter' from MinterFilter.`);

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
  const standardVerify = "yarn hardhat verify";
  console.log(`Verify GenArt721CoreV2 deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${genArt721Core.address} "${pbabTokenName}" "${pbabTokenTicker}" ${randomizerContractAddress}`
  );
  console.log(`Verify MinterFilter deployment with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterFilter.address} ${genArt721Core.address}`
  );
  console.log(`Verify each of the Minter deployments with:`);
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceERC20V0.address} ${genArt721Core.address} ${minterFilter.address}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterSetPriceV0.address} ${genArt721Core.address} ${minterFilter.address}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterDALinV0.address} ${genArt721Core.address} ${minterFilter.address}`
  );
  console.log(
    `${standardVerify} --network ${networkName} ${minterDAExpV0.address} ${genArt721Core.address} ${minterFilter.address}`
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
