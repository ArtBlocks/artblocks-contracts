// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer in `/scripts/minter-deployments/generic-minter-deployer-v3core.ts`

export const minterDeployDetailsArray = [
  {
    network: "goerli",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "dev",
    minterName: "MinterDALinV4",
    genArt721V3CoreAddress: "0x4A185f9A8ee3d247fD564407658602228a8de265",
    minterFilterAddress: "0x19254c1226Dbb83EC08Ab07Ba0B5c3994792D9D8",
  },
];
