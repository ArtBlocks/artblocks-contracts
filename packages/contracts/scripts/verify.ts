import { tryVerify } from "./util/verification";

type T_Inputs = {
  address: string;
  network: string;
  contractName: string;
  args: any[];
};

// FILL THIS OUT

const inputs: T_Inputs = {
  address: "",
  network: "",
  contractName: "",
  args: [],
};

async function main() {
  const { address, network, contractName, args } = inputs;
  // verify
  await tryVerify(contractName, address, args, network);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
