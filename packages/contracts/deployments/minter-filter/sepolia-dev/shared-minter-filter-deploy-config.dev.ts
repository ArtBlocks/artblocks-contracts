// This file is used to configure the deployment of shared minter filter contracts.
// It is intended to be imported by the generic shared minter filter deployer by running
// one of the commands similar to `deploy:shared-minter-filter:<network>.

export const deployConfigDetailsArray = [
  {
    network: "sepolia",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "dev",
    minterFilterName: "MinterFilterV2",
    // if you want to use an existing admin ACL, set the address here (otherwise set as undefined to deploy a new one)
    existingAdminACL: undefined,
    // the following can be undefined if you are using an existing admin ACL, otherwise define the Admin ACL contract name
    // if deploying a new AdminACL
    // @dev no reason for payment approver functionality, so don't use AdminACLV1
    adminACLContractName: "AdminACLV0",
    // if the following is undefined, a new core registry will be deployed.
    // if the following is defined, the existing core registry will be used.
    existingCoreRegistry: undefined,
    // the following can be undefined if coreRegistryAddress is defined,
    // but must be defined if coreRegistryAddress is undefined (since new
    // core registry will be deployed)
    coreRegistryContractName: "CoreRegistryV1",
  },
];
