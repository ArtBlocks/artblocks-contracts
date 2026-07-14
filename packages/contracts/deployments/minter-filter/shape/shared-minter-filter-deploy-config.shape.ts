// This file is used to configure the deployment of shared minter filter contracts.
// It is intended to be imported by the generic shared minter filter deployer by running
// `deploy:shared-minter-filter:shape`.

export const deployConfigDetailsArray = [
  {
    network: "shape",
    environment: "shape-mainnet",
    minterFilterName: "MinterFilterV2",
    existingAdminACL: undefined,
    adminACLContractName: "AdminACLV0",
    existingCoreRegistry: "0x440E1B5A98332BcA7564DbffA4146f976CE75397",
    coreRegistryContractName: "CoreRegistryV1",
  },
];
