import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
export function generateRandomAddress() {
  const pkey = generatePrivateKey();
  const account = privateKeyToAccount(pkey);
  return account.address;
}
