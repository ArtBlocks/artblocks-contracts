// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Serves step 2's calls to a browser wallet, where the registry's superAdmin is an externally
 * owned account (sepolia). Reuses the registry-driven rendering rollout's backfill page: it only
 * offers calls this process already simulated from the superAdmin, signing happens in the wallet,
 * and the terminal re-plans after each transaction, so it remains the source of truth.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { PlannedCall } from "./plan";

const PORT = 3001;

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function json(res: http.ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

export async function serveCalls(params: {
  network: string;
  chainId: number;
  explorer: string;
  registry: string;
  superAdmin: string;
  calls: PlannedCall[];
  remaining: () => Promise<number>;
}): Promise<void> {
  const uiHtml = fs.readFileSync(
    path.join(__dirname, "..", "registry-driven-rendering", "backfill-ui.html"),
    "utf-8"
  );
  const payload = {
    network: params.network,
    chainId: params.chainId,
    explorer: params.explorer,
    registry: params.registry,
    superAdmin: params.superAdmin,
    calls: params.calls.map((call) => ({
      method: call.label.slice(0, call.label.indexOf("(")),
      // @dev the same string the terminal printed, so what a signer approves can be matched
      // against what was simulated
      summary: call.label,
      to: call.to,
      data: call.data,
    })),
  };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://localhost:${PORT}`);
    try {
      switch (url.pathname) {
        case "/":
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(uiHtml);
          break;
        case "/api/plan":
          json(res, payload);
          break;
        case "/api/sent": {
          const body = JSON.parse(await readBody(req));
          console.log(`  sent  ${body.method}  ${body.hash}`);
          json(res, { ok: true });
          break;
        }
        case "/api/status": {
          const remaining = await params.remaining();
          console.log(
            remaining === 0
              ? "\nStep 2 complete: nothing outstanding. Stop this process (ctrl-c)."
              : `\n${remaining} call(s) still outstanding.`
          );
          json(res, { remaining });
          break;
        }
        default:
          res.writeHead(404);
          res.end("Not found");
      }
    } catch (error: any) {
      json(res, { error: error.message }, 500);
    }
  });

  await new Promise<void>((resolve) =>
    server.listen(PORT, "127.0.0.1", resolve)
  );
  console.log(`\n  Send from the browser wallet: http://localhost:${PORT}\n`);
  console.log(
    `Connect ${params.superAdmin} and send the ${params.calls.length} transaction(s).`
  );
  // @dev never resolves: the caller exits the process on return, which would take the server
  await new Promise<void>(() => {});
}
