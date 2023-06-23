## Overview of this Directory

This directory should contain all deployment details for Art Blocks Engine contracts. It is intended for reference purposes only.

For V2_PBAB core contracts:

- All relevant deployment logs should be included in the `./V2/<engine-partner>DEPLOYMENTS.md` file
- Note that deployment scripts are unique to each Engine partner for V2 contracts, and are stored in the root `/scripts/engine/V2/<engine-partner>` directory.

For V3_Engine core contracts:

- All relevant deployment input files and logs should be included in the `./V3/<engine-partner>/` directory
  - the `deployment-config.<environment>.ts` file should contain the input parameters used to deploy the contract.
    - see starting template for this file in `./deployment-config.template.ts`
  - the `DEPLOYMENTS.md` file should contain the deployment logs, as recorded by whatever deployment script was used.
  - the `DEPLOYMENT_LOGS.log` file should contain the raw deployment logs, as recorded by whatever deployment script was used.
- Note that deployment scripts are NOT unique to each Engine partner for V3 contracts, and the `deployment-config.<environment>.ts` is intended to be sufficient to fully reproduce the deployment.
