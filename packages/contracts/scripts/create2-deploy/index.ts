import hre from "hardhat";
import http from "http";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { deployConfigs, type DeployConfig } from "./config";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CREATE2_FACTORY = "0x0000000000ffe8b47b3e2130213b802212439497";
const PORT = 3000;
const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

const CHAIN_CONFIG: Record<
  number,
  { name: string; network: string; explorer: string }
> = {
  1: {
    name: "Ethereum Mainnet",
    network: "mainnet",
    explorer: "https://etherscan.io",
  },
  42161: {
    name: "Arbitrum One",
    network: "arbitrum",
    explorer: "https://arbiscan.io",
  },
  8453: {
    name: "Base",
    network: "base",
    explorer: "https://basescan.org",
  },
  11155111: {
    name: "Sepolia",
    network: "sepolia",
    explorer: "https://sepolia.etherscan.io",
  },
  560048: {
    name: "Hoodi",
    network: "hoodi",
    explorer: "https://hoodi.etherscan.io",
  },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CompiledConfig = DeployConfig & {
  initcode: string;
  initcodeHash: string;
  proxyInitcode?: string;
  proxyInitcodeHash?: string;
  implAddress?: string;
  proxyArgs?: any[];
};

type VerifyJob = {
  id: string;
  contractName: string;
  address: string;
  args: any[];
  libraries: Record<string, string>;
  chainId: number;
  contract?: string;
  status: "queued" | "running" | "success" | "failed";
  output: string;
};

// ---------------------------------------------------------------------------
// Verification queue (serialized — never runs two hardhat processes at once)
// ---------------------------------------------------------------------------

const verifyJobs: VerifyJob[] = [];
let verifyRunning = false;

function queueVerification(params: {
  contractName: string;
  address: string;
  args: any[];
  libraries: Record<string, string>;
  chainId: number;
  contract?: string;
}): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  verifyJobs.push({ ...params, id, status: "queued", output: "" });
  processNextVerification();
  return id;
}

function processNextVerification() {
  if (verifyRunning) return;
  const job = verifyJobs.find((j) => j.status === "queued");
  if (!job) return;

  const chain = CHAIN_CONFIG[job.chainId];
  if (!chain) {
    job.status = "failed";
    job.output = `Unknown chain ID: ${job.chainId}`;
    processNextVerification();
    return;
  }

  verifyRunning = true;
  job.status = "running";

  const tmpDir = path.join(PROJECT_ROOT, ".create2-deploy-tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const paramsFile = path.join(tmpDir, `verify-${job.id}.json`);
  fs.writeFileSync(
    paramsFile,
    JSON.stringify({
      contractName: job.contractName,
      address: job.address,
      args: job.args,
      libraries: job.libraries,
      contract: job.contract,
    })
  );

  const env = { ...process.env, VERIFY_PARAMS_FILE: paramsFile };
  const cmd = `npx hardhat run --network ${chain.network} scripts/create2-deploy/verify-worker.ts`;

  console.log(
    `[VERIFY] Starting: ${job.contractName} @ ${job.address} on ${chain.name}`
  );

  exec(
    cmd,
    { cwd: PROJECT_ROOT, env, timeout: 120_000, maxBuffer: 1024 * 1024 },
    (error, stdout, stderr) => {
      const output = (stdout || "") + (stderr || "");
      job.output = output;
      job.status = output.includes("VERIFICATION_SUCCESS")
        ? "success"
        : "failed";

      try {
        fs.unlinkSync(paramsFile);
      } catch {}

      verifyRunning = false;
      console.log(
        `[VERIFY] ${job.status}: ${job.contractName} on ${chain.name}`
      );
      processNextVerification();
    }
  );
}

// ---------------------------------------------------------------------------
// Deployment logging — both JSONL (machine) and Markdown (human)
// ---------------------------------------------------------------------------

function logDeployment(deployment: {
  contractName: string;
  address: string;
  chainId: number;
  salt: string;
  txHash: string;
  args: any[];
  libraries: Record<string, string>;
  initcodeHash: string;
}) {
  const deploymentsDir = path.join(PROJECT_ROOT, "deployments");
  if (!fs.existsSync(deploymentsDir))
    fs.mkdirSync(deploymentsDir, { recursive: true });

  const timestamp = new Date().toISOString();
  const record = { ...deployment, timestamp };
  const chain = CHAIN_CONFIG[deployment.chainId];
  const explorer = chain?.explorer || "";

  // --- JSONL ---
  const jsonlPath = path.join(deploymentsDir, "create2-deployments.jsonl");
  fs.appendFileSync(jsonlPath, JSON.stringify(record) + "\n");

  // --- Markdown ---
  const mdPath = path.join(deploymentsDir, "create2-deployments.md");
  if (!fs.existsSync(mdPath)) {
    fs.writeFileSync(
      mdPath,
      "# CREATE2 Deployments\n\nCanonical append-only deployment log.\n\n---\n"
    );
  }

  const txLink = explorer
    ? `[${deployment.txHash}](${explorer}/tx/${deployment.txHash})`
    : `\`${deployment.txHash}\``;
  const addrLink = explorer
    ? `[${deployment.address}](${explorer}/address/${deployment.address})`
    : `\`${deployment.address}\``;

  const mdEntry =
    `\n## ${deployment.contractName}\n\n` +
    `- **Chain:** ${chain?.name || "Unknown"} (${deployment.chainId})\n` +
    `- **Address:** ${addrLink}\n` +
    `- **Salt:** \`${deployment.salt}\`\n` +
    `- **TX:** ${txLink}\n` +
    `- **Args:** \`${JSON.stringify(deployment.args)}\`\n` +
    `- **Libraries:** \`${JSON.stringify(deployment.libraries)}\`\n` +
    `- **Initcode Hash:** \`${deployment.initcodeHash}\`\n` +
    `- **Timestamp:** ${timestamp}\n\n---\n`;

  fs.appendFileSync(mdPath, mdEntry);

  console.log(
    `[LOG] ${deployment.contractName} @ ${deployment.address} on chain ${deployment.chainId}`
  );
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function json(res: http.ServerResponse, data: any, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

async function startServer(configs: CompiledConfig[]) {
  const uiPath = path.join(__dirname, "ui.html");
  const uiHtml = fs.readFileSync(uiPath, "utf-8");

  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://localhost:${PORT}`);

    try {
      switch (url.pathname) {
        case "/": {
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(uiHtml);
          break;
        }
        case "/api/configs": {
          json(res, {
            configs,
            chainConfig: CHAIN_CONFIG,
            factory: CREATE2_FACTORY,
          });
          break;
        }
        case "/api/log-deployment": {
          if (req.method !== "POST") {
            json(res, { error: "POST only" }, 405);
            break;
          }
          const logBody = JSON.parse(await readBody(req));
          logDeployment(logBody);
          json(res, { ok: true });
          break;
        }
        case "/api/verify": {
          if (req.method !== "POST") {
            json(res, { error: "POST only" }, 405);
            break;
          }
          const verifyBody = JSON.parse(await readBody(req));
          const id = queueVerification(verifyBody);
          json(res, { id });
          break;
        }
        case "/api/verify-status": {
          json(
            res,
            verifyJobs.map((j) => ({
              id: j.id,
              status: j.status,
              output: j.output,
              contractName: j.contractName,
              chainId: j.chainId,
              address: j.address,
            }))
          );
          break;
        }
        default:
          res.writeHead(404);
          res.end("Not found");
      }
    } catch (e: any) {
      console.error(`[ERROR] ${req.url}: ${e.message}`);
      json(res, { error: e.message }, 500);
    }
  });

  server.listen(PORT, () => {
    console.log(`\n  ┌──────────────────────────────────────────┐`);
    console.log(`  │  CREATE2 Deployer: http://localhost:${PORT}  │`);
    console.log(`  └──────────────────────────────────────────┘\n`);
  });
}

// ---------------------------------------------------------------------------
// Cleanup on exit
// ---------------------------------------------------------------------------

function cleanup() {
  const tmpDir = path.join(PROJECT_ROOT, ".create2-deploy-tmp");
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (deployConfigs.length === 0) {
    console.error(
      "\n  No deployment configs found." +
        "\n  Edit scripts/create2-deploy/config.ts and try again.\n"
    );
    process.exit(1);
  }

  console.log(`Generating initcode for ${deployConfigs.length} config(s)...\n`);

  const compiled: CompiledConfig[] = [];
  for (const config of deployConfigs) {
    const factory = await hre.ethers.getContractFactory(config.contractName, {
      libraries: config.libraries,
    });
    const deployTx = factory.getDeployTransaction(...config.args);
    const initcode = deployTx.data?.toString() as string;
    const initcodeHash = hre.ethers.utils.keccak256(initcode);

    const entry: CompiledConfig = { ...config, initcode, initcodeHash };

    if (config.proxy) {
      const implSalt = "0x" + "0".repeat(64);
      const implAddress = hre.ethers.utils.getCreate2Address(
        CREATE2_FACTORY,
        implSalt,
        initcodeHash
      );

      const initializeData = factory.interface.encodeFunctionData(
        "initialize",
        config.proxy.initializeArgs
      );

      const proxyFactory = await hre.ethers.getContractFactory(
        "@openzeppelin-5.0/contracts/proxy/ERC1967/ERC1967Proxy.sol:ERC1967Proxy"
      );
      const proxyDeployTx = proxyFactory.getDeployTransaction(
        implAddress,
        initializeData
      );
      const proxyInitcode = proxyDeployTx.data?.toString() as string;
      const proxyInitcodeHash = hre.ethers.utils.keccak256(proxyInitcode);

      entry.implAddress = implAddress;
      entry.proxyInitcode = proxyInitcode;
      entry.proxyInitcodeHash = proxyInitcodeHash;
      entry.proxyArgs = [implAddress, initializeData];

      console.log(`  ${config.contractName} (UUPS Proxy)`);
      console.log(`    impl initcodeHash: ${initcodeHash}`);
      console.log(`    impl address:      ${implAddress}`);
      console.log(`    proxy initcodeHash: ${proxyInitcodeHash}`);
      console.log(`    chains: [${config.chainIds.join(", ")}]\n`);
    } else {
      console.log(`  ${config.contractName}`);
      console.log(`    initcodeHash: ${initcodeHash}`);
      console.log(`    chains: [${config.chainIds.join(", ")}]\n`);
    }

    compiled.push(entry);
  }

  await startServer(compiled);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
