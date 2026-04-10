export type DeployConfig = {
  contractName: string;
  args: any[];
  libraries: Record<string, string>;
  chainIds: number[];
  /** When set, the contract is deployed as a UUPS implementation + ERC1967Proxy. */
  proxy?: {
    /** Arguments passed to the implementation's `initialize()` function. */
    initializeArgs: any[];
  };
};

// Edit this array with your deployment batch.
//
// Example (plain CREATE2):
//
// export const deployConfigs: DeployConfig[] = [
//   {
//     contractName: "PMPV0",
//     args: ["0x00000000000000447e69651d841bd8d104bed493"],
//     libraries: {},
//     chainIds: [11155111],
//   },
// ];
//
// Example (UUPS proxy pattern — deploys implementation + ERC1967Proxy):
//
// export const deployConfigs: DeployConfig[] = [
//   {
//     contractName: "SRSimpleHooks",
//     args: [],
//     libraries: {},
//     chainIds: [11155111],
//     proxy: {
//       initializeArgs: ["0xOwnerAddress", "0xCoreContractAddress", 251],
//     },
//   },
// ];

export const deployConfigs: DeployConfig[] = [];
