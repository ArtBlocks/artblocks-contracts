// This file is used to configure the deployment of Engine and Engine Flex contracts
// It is intended to be imported by the batch engine factory deployer by running `deploy:v3-engine:mainnet`, `deploy:v3-engine:staging` or `deploy:v3-engine:dev`.

export const deployNetworkConfiguration = {
  network: "mainnet",
  // environment is only used for metadata purposes, and is not used in the deployment process	    tokenName: "",
  // Please set to "dev", "staging", or "mainnet", as appropriate
  environment: "mainnet",
  useLedgerSigner: true,
  useGnosisSafe: true,
  safeAddress: "0x52119BB73Ac8bdbE59aF0EEdFd4E4Ee6887Ed2EA",
  transactionServiceUrl: "https://safe-transaction-mainnet.safe.global",
  // set the transaction hash after successful execution of the batch creation
  transactionHash: "",
};

export const deployConfigDetailsArray = [
  {
    // 0 for Engine, 1 for Engine Flex
    engineCoreContractType: 1,
    tokenName: "TRAMExCPG",
    tokenTicker: "TRAMExCPG",
    renderProviderAddress: "0x036F3D03C1ccdde1878F01607922EA12110Ee9Bd",
    platformProviderAddress: "0x4C7D8c95a0ABE647E36a8570136cAe0BaA5288af",
    // set to the address you want to transfer the superAdmin role to
    // (can be the zero address if you have an existing Admin ACL Contract and are not transferring)
    newSuperAdminAddress: "0x4C7D8c95a0ABE647E36a8570136cAe0BaA5288af",
    startingProjectId: 0,
    autoApproveArtistSplitProposals: true,
    nullPlatformProvider: false,
    allowArtistProjectActivation: true,
    // if you want to use an existing admin ACL, set the address here (otherwise set as the zero address to deploy a new one)
    adminACLContract: "0x0000000000000000000000000000000000000000",
    salt: "0x0000000000000000000000000000000000000000a73bf3db9deb50b95c1600c0",
    // optionally define this to set default vertical name for the contract after deployment.
    // if not defined, the default vertical name will be "unassigned".
    // common values include `studio`, `fullyonchain`, `flex`, or partnerships like `artblocksxpace`.
    // also note that if you desire to create a new vertical, you will need to add the vertical name to the
    // `project_verticals` table in the database before running this deploy script.
    defaultVerticalName: "flex",
  },
];
