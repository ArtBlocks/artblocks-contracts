// This file is used to configure the deployment of minter contracts
// It is intended to be imported by the generic minter deployer by running `deploy:mainnet:minter`, `deploy:staging:minter` or `deploy:dev:minter`.

export const minterDeployDetailsArray = [
  {
    network: "mainnet",
    // environment is only used for metadata purposes, and is not used in the deployment process
    // Please set to "dev", "staging", or "mainnet", as appropriate
    environment: "mainnet",
    minterName: "MinterDAExpV4",
    genArt721V3CoreAddress: "0x6DdefE5DB20D79EC718A8960177bEB388f7EbB8d",
    minterFilterAddress: "0xf377a477704DD68907BC603A7403B09B7b97DC0E",
  },
];
