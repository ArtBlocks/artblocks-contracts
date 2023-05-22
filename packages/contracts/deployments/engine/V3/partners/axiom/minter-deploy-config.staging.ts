// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer in `/scripts/minter-deployments/generic-minter-deployer-v3core.ts`

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "staging",
    minterName: "MinterDALinV4",
    genArt721V3CoreAddress: "0xd6c97e2CA3d2ecE73Eaee6CA7F66faF89F74c98A",
    minterFilterAddress: "0x77D4b54e91822E9799AB0900876D6B1cdA752706",
  },
];
