import type { PublicClient, Hex } from "viem";

type TraceTransactionResult = {
  action: {
    callType: string;
    from: `0x${string}`;
    gas: `0x${string}`;
    input: `0x${string}`;
    to: `0x${string}`;
    value: `0x${string}`;
  };
  result: {
    gasUsed: `0x${string}`;
    output: `0x${string}`;
  };
  subtraces: number;
  traceAddress: number[];
  type: string;
};

type TraceTransactionOverride = {
  Parameters: [`0x${string}`];
  ReturnType: TraceTransactionResult[];
};

// NOTE: Not all JSON RPC providers support this method, so it should be called
// within a try/catch block.
export async function traceTransaction(
  publicClient: PublicClient,
  txHash: Hex
): Promise<TraceTransactionResult[]> {
  return await publicClient.request<TraceTransactionOverride>({
    method: "trace_transaction",
    params: [txHash],
  });
}
