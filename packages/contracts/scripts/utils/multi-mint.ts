/**
 * multi-mint.ts
 *
 * EXPERIMENTAL - NOT FOR PRODUCTION USE - USE AT YOUR OWN RISK
 *
 * Script to queue up multiple purchaseToMulti transactions on the
 * MintMulticallUtil contract. Builds Legacy (type 0) transactions for
 * Arbitrum gas efficiency, assigns sequential nonces, and sends them
 * all in rapid succession.
 *
 * Usage:
 *   npx hardhat run scripts/utils/multi-mint.ts --network arbitrum
 *
 * Requires:
 *   - WALLET_ENCRYPTED_KEYSTORE_FILE env var set (or hardhat default accounts)
 *   - RPC provider URL configured for the target network in hardhat.config.ts
 */

import { ethers } from "hardhat";
import { BigNumber } from "ethers";

// =============================================================================
// INPUT CONFIGURATION - FILL THIS OUT BEFORE RUNNING
// =============================================================================

type MintTransactionConfig = {
  /** Number of mints in this transaction */
  numMints: number;
};

type RecipientConfig =
  | {
      /** Use explicit addresses. Each mint randomly picks from this pool. */
      mode: "addresses";
      addresses: string[];
    }
  | {
      /** Generate N unique wallets. Mints are assigned pseudorandomly to one of each.
       *  Note: Private keys are not persisted; add key export if you need to access tokens. */
      mode: "unique";
      count: number;
    };

type InputConfig = {
  /** The deployed MintMulticallUtil contract address */
  mintMulticallUtilAddress: string;
  /** The MinterSetPriceV5 contract address to call purchaseTo on */
  minterAddress: string;
  /** The Art Blocks core contract address */
  coreContractAddress: string;
  /** The project ID to mint from */
  projectId: number;
  /** Price per token in ETH (e.g. "0.05") */
  pricePerTokenEth: string;
  /** Maximum gas price in Gwei. Transactions will not be sent if the
   *  current gas price exceeds this value. */
  maxGasPriceGwei: number;
  /** Recipient config: either explicit addresses or N unique generated wallets. */
  recipients: RecipientConfig;
  /** Array of transaction configs. Each entry produces one on-chain tx. */
  transactions: MintTransactionConfig[];
};

// FILL THIS OUT
const INPUT_CONFIG: InputConfig = {
  mintMulticallUtilAddress: "0x63023B5b2De3EA6610adB631e031a780AeD66558",
  minterAddress: "0xe2bC24f74ed326CA4deB75753942731A566ebC83",
  coreContractAddress: "0xaAAC8Ba5bd685d81Ac7EED28d913a73c3be526D5",
  projectId: 100,
  pricePerTokenEth: "0.0",
  maxGasPriceGwei: 0.1,
  // Option A: explicit addresses (randomly picks from pool per mint)
  recipients: {
    mode: "addresses",
    addresses: [
      "0x3c6412FEE019f5c50d6F03Aa6F5045d99d9748c4",
      "0xAbaBab074cbD610f70A0809b6c4BA8852d7B93Da",
    ],
  },
  // Option B: generate N unique wallets (mints assigned pseudorandomly)
  // recipients: { mode: "unique", count: 100 },
  transactions: [
    { numMints: 500 },
    { numMints: 500 },
    { numMints: 500 },
    { numMints: 500 },
    { numMints: 500 },
    { numMints: 500 },
    { numMints: 500 },
    { numMints: 500 },
    { numMints: 500 },
    { numMints: 500 },
  ],
};

// =============================================================================
// ABI - minimal ABI for MintMulticallUtil.purchaseToMulti
// =============================================================================

const MINT_MULTICALL_UTIL_ABI = [
  "function purchaseToMulti(address minter, uint256 numMints, address[] calldata toAddresses, uint256 projectId, address coreContract) external payable",
];

// =============================================================================
// SCRIPT
// =============================================================================

/**
 * Resolves recipient config into a pool of addresses.
 * - addresses: returns the provided array
 * - unique: generates N fresh wallets and returns their addresses
 */
function resolveRecipientPool(config: RecipientConfig): string[] {
  if (config.mode === "addresses") {
    return config.addresses;
  }
  // Generate N unique wallets (addresses only; private keys are discarded)
  return Array.from(
    { length: config.count },
    () => ethers.Wallet.createRandom().address
  );
}

/**
 * Pseudorandomly selects `count` addresses from the pool (with replacement).
 */
function buildRandomRecipientArray(pool: string[], count: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    result.push(pool[idx]);
  }
  return result;
}

async function main() {
  // ---- Validate config ----
  const config = INPUT_CONFIG;

  if (config.transactions.length === 0) {
    throw new Error("transactions must not be empty");
  }
  for (const txCfg of config.transactions) {
    if (txCfg.numMints <= 0) {
      throw new Error("Each transaction must have numMints > 0");
    }
  }
  if (
    config.recipients.mode === "addresses" &&
    config.recipients.addresses.length === 0
  ) {
    throw new Error(
      "recipients.addresses must not be empty when mode is 'addresses'"
    );
  }
  if (config.recipients.mode === "unique" && config.recipients.count <= 0) {
    throw new Error("recipients.count must be > 0 when mode is 'unique'");
  }

  // ---- Resolve recipient pool ----
  const recipientPool = resolveRecipientPool(config.recipients);
  const poolDescription =
    config.recipients.mode === "addresses"
      ? `${recipientPool.length} addresses`
      : `${recipientPool.length} unique generated wallets`;

  // ---- Setup signer & provider ----
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  const network = await ethers.provider.getNetwork();
  console.log(
    `Connected to network: ${network.name} (chainId: ${network.chainId})`
  );
  console.log(`Signer address: ${signerAddress}`);

  // ---- Determine optimal gas price ----
  // On Arbitrum, cost = L2 execution (very cheap) + L1 data posting (dominant).
  // The sequencer is FCFS — no priority fee auction — so bidding above the L2
  // base fee is pure waste. We read baseFeePerGas directly from the latest
  // block to bid the exact minimum the network will accept. Any overpayment
  // above baseFee is refunded, but using the exact value avoids even
  // temporary overcollateralization.
  // We use Legacy (type 0) transactions because their RLP encoding is smaller
  // than EIP-1559 (type 2), meaning fewer bytes posted to L1 = lower L1 data
  // cost. Since Arbitrum has no priority fee mechanism, the extra type 2
  // fields are pure overhead.
  const latestBlock = await ethers.provider.getBlock("latest");
  const baseFee = latestBlock.baseFeePerGas;
  if (!baseFee) {
    throw new Error(
      "Could not read baseFeePerGas from latest block. " +
        "Ensure the target network supports EIP-1559 base fee reporting."
    );
  }
  const maxGasPriceWei = ethers.utils.parseUnits(
    config.maxGasPriceGwei.toString(),
    "gwei"
  );
  console.log(
    `L2 base fee (from latest block): ${ethers.utils.formatUnits(baseFee, "gwei")} Gwei`
  );
  console.log(`Max acceptable gas price: ${config.maxGasPriceGwei} Gwei`);

  if (baseFee.gt(maxGasPriceWei)) {
    throw new Error(
      `Current base fee (${ethers.utils.formatUnits(baseFee, "gwei")} Gwei) ` +
        `exceeds max acceptable gas price (${config.maxGasPriceGwei} Gwei). Aborting.`
    );
  }

  // Add a 10% buffer above baseFee to account for base fee fluctuations
  // between reading the block and tx inclusion. Arbitrum refunds any
  // overpayment above the actual baseFee at inclusion time, so this buffer
  // costs nothing — it just prevents rejection if the fee ticks up slightly.
  const bufferedGasPrice = baseFee.mul(110).div(100);
  // Cap the buffered bid at the user's max, so we never bid above their limit
  const gasPrice = bufferedGasPrice.gt(maxGasPriceWei)
    ? maxGasPriceWei
    : bufferedGasPrice;
  console.log(
    `Gas price bid (baseFee + 10% buffer, capped): ${ethers.utils.formatUnits(gasPrice, "gwei")} Gwei`
  );

  // ---- Build contract interface ----
  const multicallContract = new ethers.Contract(
    config.mintMulticallUtilAddress,
    MINT_MULTICALL_UTIL_ABI,
    signer
  );

  const pricePerToken = ethers.utils.parseEther(config.pricePerTokenEth);

  // ---- Get starting nonce ----
  let nonce = await ethers.provider.getTransactionCount(
    signerAddress,
    "pending"
  );
  console.log(`Starting nonce: ${nonce}`);

  // ---- Summary ----
  const totalMints = config.transactions.reduce(
    (sum, tx) => sum + tx.numMints,
    0
  );
  const totalEth = pricePerToken.mul(totalMints);
  console.log("\n--- Transaction Plan ---");
  console.log(`Total transactions: ${config.transactions.length}`);
  console.log(`Total mints: ${totalMints}`);
  console.log(`Price per token: ${config.pricePerTokenEth} ETH`);
  console.log(`Total ETH required: ${ethers.utils.formatEther(totalEth)} ETH`);
  console.log(`Recipient pool: ${poolDescription}`);
  console.log(
    `Gas price (L2 base fee): ${ethers.utils.formatUnits(gasPrice, "gwei")} Gwei`
  );
  console.log("------------------------\n");

  // ---- Check balance ----
  const balance = await ethers.provider.getBalance(signerAddress);
  console.log(`Signer balance: ${ethers.utils.formatEther(balance)} ETH`);
  if (balance.lt(totalEth)) {
    throw new Error(
      `Insufficient balance. Need ${ethers.utils.formatEther(totalEth)} ETH ` +
        `but only have ${ethers.utils.formatEther(balance)} ETH (before gas)`
    );
  }

  // ---- Build and send transactions ----
  const sentTxHashes: string[] = [];

  for (let i = 0; i < config.transactions.length; i++) {
    const txConfig = config.transactions[i];
    const { numMints } = txConfig;

    // Build random recipient array for this tx
    const toAddresses = buildRandomRecipientArray(recipientPool, numMints);

    // Calculate total value for this tx
    const txValue = pricePerToken.mul(numMints);

    // Encode calldata
    const calldata = multicallContract.interface.encodeFunctionData(
      "purchaseToMulti",
      [
        config.minterAddress,
        numMints,
        toAddresses,
        config.projectId,
        config.coreContractAddress,
      ]
    );

    // Estimate gas (use first tx for estimate, add buffer)
    let gasLimit: BigNumber;
    try {
      const estimate = await ethers.provider.estimateGas({
        from: signerAddress,
        to: config.mintMulticallUtilAddress,
        data: calldata,
        value: txValue,
      });
      // Add 20% buffer to gas estimate
      gasLimit = estimate.mul(120).div(100);
    } catch (err) {
      console.error(
        `Gas estimation failed for transaction ${i + 1}. ` +
          `This may indicate a revert condition. Aborting.`
      );
      throw err;
    }

    // Build Legacy (type 0) transaction for Arbitrum gas efficiency.
    // Type 0: smaller RLP encoding = fewer L1 data bytes = lower cost.
    // gasPrice set to exact L2 baseFee = minimum accepted, no waste.
    const rawTx = {
      type: 0, // Legacy — smaller serialized size than type 2
      to: config.mintMulticallUtilAddress,
      data: calldata,
      value: txValue,
      nonce: nonce,
      gasPrice: gasPrice, // exact baseFee, the true minimum
      gasLimit: gasLimit,
      chainId: network.chainId,
    };

    console.log(
      `Sending tx ${i + 1}/${config.transactions.length}: ` +
        `${numMints} mints, ${ethers.utils.formatEther(txValue)} ETH, ` +
        `nonce ${nonce}, gasLimit ${gasLimit.toString()}`
    );

    // Send transaction (don't await receipt — queue them up)
    const txResponse = await signer.sendTransaction(rawTx);
    sentTxHashes.push(txResponse.hash);
    console.log(`  tx hash: ${txResponse.hash}`);

    nonce++;
  }

  // ---- Wait for all transactions to be mined ----
  console.log("\n--- Waiting for confirmations ---");
  for (let i = 0; i < sentTxHashes.length; i++) {
    const hash = sentTxHashes[i];
    console.log(`Waiting for tx ${i + 1}/${sentTxHashes.length}: ${hash} ...`);
    const receipt = await ethers.provider.waitForTransaction(hash);
    if (receipt.status === 1) {
      console.log(
        `  ✓ Confirmed in block ${receipt.blockNumber}, ` +
          `gas used: ${receipt.gasUsed.toString()}`
      );
    } else {
      console.error(
        `  ✗ FAILED in block ${receipt.blockNumber}. Check tx on block explorer.`
      );
    }
  }

  console.log("\n--- Done ---");
  console.log(
    `Sent ${sentTxHashes.length} transactions for ${totalMints} total mints.`
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
