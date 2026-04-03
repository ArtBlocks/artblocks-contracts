export type DeployConfig = {
  contractName: string;
  args: any[];
  libraries: Record<string, string>;
  chainIds: number[];
};

// Edit this array with your deployment batch.
//
// Example:
//
// export const deployConfigs: DeployConfig[] = [
//   {
//     contractName: "PMPV0",
//     args: ["0x00000000000000447e69651d841bd8d104bed493"],
//     libraries: {},
//     chainIds: [11155111],
//   },
//   {
//     contractName: "GenArt721CoreV3_Engine",
//     args: [],
//     libraries: {
//       "contracts/libs/v0.8.x/BytecodeStorageV2.sol:BytecodeStorageReader":
//         "0x000000000016A5A5ff2FA7799C4BEe89bA59B74e",
//     },
//     chainIds: [1, 42161, 8453, 11155111],
//   },
// ];

export const deployConfigs: DeployConfig[] = [
  {
    contractName: "SRSimpleHooks",
    args: [],
    libraries: {},
    chainIds: [11155111],
  },
];
