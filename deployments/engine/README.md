## Overview of this Directory

This directory should contain all deployment details for Art Blocks Engine contracts. It is intended for reference purposes only.

For V2_PBAB core contracts:

- All relevant deployment logs should be included in the `./V2/<engine-partner>DEPLOYMENTS.md` file.

For V3_Engine core contracts:

- All relevant deployment input files and logs should be included in the `./V3/<engine-partner>/` directory.
  - the `input.json` file should contain the input parameters used to deploy the contract.
  - the `DEPLOYMENTS.md` file should contain the deployment logs, as recorded by whatever deployment script was used.

All mainnet deployments that occurred after 10 Jan, 2023 should have a corresponding tag+release in the GitHub repository. This is to ensure that Art Blocks provides a well-documented contract deployment history and that the code deployed to mainnet can easily be verified by anyone.
