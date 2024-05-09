import hre from "hardhat";

type T_Inputs = {
  contractName: string;
  args: any[];
  libraries: Record<string, string>;
};

// FILL THIS OUT

// EXAMPLE
// const inputs: T_Inputs = {
//   contractName: "V3FlexLib",
//   args: [],
//   libraries: {
//     "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
//     "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
//   },
// };

const inputs: T_Inputs = {
  contractName: "",
  args: [],
  libraries: {},
};

async function main() {
  const { contractName, args, libraries } = inputs;
  const factory = await hre.ethers.getContractFactory(contractName, {
    libraries: libraries,
  });
  const contract = factory.getDeployTransaction(...args);

  console.log(
    `initialization code for contract ${contractName}, args ${JSON.stringify(args)}, libraries ${JSON.stringify(libraries)}:`
  );
  // deploy tx data is the init code
  const initcode = contract.data?.toString() as string;
  console.log(initcode);
  const initcodeHash = hre.ethers.utils.keccak256(initcode);
  console.log(`init code hash: ${initcodeHash}`);
  // show verification
  console.log("verify via `verify.ts` script after deployment");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
