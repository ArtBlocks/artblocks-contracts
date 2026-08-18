// SPDX-License-Identifier: LGPL-3.0-only
// Created By: Art Blocks Inc.

/**
 * Serves the backfill to a browser wallet.
 *
 * Used where the registry's `superAdmin` is an EOA. Signing happens in the
 * wallet, so no private key is ever handed to this repo — the same reason the
 * CREATE2 deployer works this way.
 *
 * The page can only offer calls this process already simulated from the
 * superAdmin, and the process re-reads the registry after each one, so the
 * terminal remains the source of truth for whether the backfill is complete.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { encodeBackfillCall } from "./calls";
import { BackfillCall, buildBackfillPlan, describeCall } from "./plan";

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

const METHOD_NAMES: Record<BackfillCall["kind"], string> = {
  canvasTagType: "updateDependencyCanvasTagType",
  loadAsModule: "updateDependencyLoadAsModule",
  projectScriptTagType: "updateDependencyProjectScriptTagType",
  projectDependencyOverride: "addProjectDependencyOverride",
};

export async function serveBackfill(params: {
  network: string;
  chainId: number;
  explorer: string;
  registry: string;
  superAdmin: string;
  calls: BackfillCall[];
}): Promise<void> {
  const uiHtml = fs.readFileSync(
    path.join(__dirname, "backfill-ui.html"),
    "utf-8"
  );

  const payload = {
    network: params.network,
    chainId: params.chainId,
    explorer: params.explorer,
    registry: params.registry,
    superAdmin: params.superAdmin,
    calls: params.calls.map((call) => ({
      method: METHOD_NAMES[call.kind],
      // @dev the human-readable form is the same string the terminal prints, so
      // what a signer approves can be matched against what was simulated.
      summary: describeCall(call),
      data: encodeBackfillCall(call),
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
          const plan = await buildBackfillPlan(params.network, params.registry);
          if (plan.calls.length === 0) {
            console.log(
              "\nBackfill complete — the registry reports nothing outstanding."
            );
            console.log(
              "Stop this process (ctrl-c) and continue with 4_upgrade-generator.ts."
            );
          } else {
            console.log(`\n${plan.calls.length} call(s) still outstanding:`);
            for (const call of plan.calls) {
              console.log(`  ${describeCall(call)}`);
            }
          }
          json(res, { remaining: plan.calls.length });
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

  await new Promise<void>((resolve) => server.listen(PORT, resolve));
  console.log(`\n  ┌────────────────────────────────────────────┐`);
  console.log(`  │  Registry backfill: http://localhost:${PORT}  │`);
  console.log(`  └────────────────────────────────────────────┘\n`);
  console.log(
    `Connect ${params.superAdmin} and send the ${params.calls.length} transaction(s).`
  );
  console.log(`Ctrl-c when the backfill reports complete.`);

  // @dev never resolves: the caller exits the process on return, which would
  // take the server with it.
  await new Promise<void>(() => {});
}
