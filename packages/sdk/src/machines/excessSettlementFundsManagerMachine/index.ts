import { WalletClient, PublicClient } from "viem";
import { setup, assign, enqueueActions, ActorRefFrom } from "xstate";
import { ReceiptSettlementDataFragment } from "../../generated/graphql";
import { receiptPollingMachine } from "./receiptPollingMachine";
import { excessSettlementFundsClaimMachine } from "./excessSettlementFundsClaimMachine";

/**
 * TODO
 * - No inline actions/guards
 * - Add description fields to states and transitions
 * - Use shared web3 events type
 */

export type ExcessSettlementFundsManagerMachineEvent =
  | {
      type: "WALLET_CLIENT_AVAILABLE";
      data: WalletClient;
    }
  | {
      type: "WALLET_CLIENT_UNAVAILABLE";
    }
  | {
      type: "PUBLIC_CLIENT_AVAILABLE";
      data: PublicClient;
    }
  | {
      type: "PUBLIC_CLIENT_UNAVAILABLE";
    }
  | {
      type: "RECEIPTS_FETCHED";
      receipts: ReceiptSettlementDataFragment[];
    }
  | {
      type: "EXCESS_SETTLEMENT_FUNDS_CLAIMED";
      receiptId: string;
    };

export type ExcessSettlementFundsManagerMachineContext = {
  publicClient?: PublicClient;
  walletClient?: WalletClient;
  claimMachines?: Map<
    string,
    ActorRefFrom<typeof excessSettlementFundsClaimMachine>
  >;
};

export const excessSettlementFundsManagerMachine = setup({
  types: {
    input: {} as Pick<
      ExcessSettlementFundsManagerMachineContext,
      "publicClient" | "walletClient"
    >,
    context: {} as ExcessSettlementFundsManagerMachineContext,
    events: {} as ExcessSettlementFundsManagerMachineEvent,
  },
  actors: {
    receiptPollingMachine,
    excessSettlementFundsClaimMachine,
  },
  actions: {
    assignWalletClient: assign({
      walletClient: (_, params: { walletClient?: WalletClient }) =>
        params.walletClient,
    }),
    assignPublicClient: assign({
      publicClient: (_, params: { publicClient?: PublicClient }) =>
        params.publicClient,
    }),
  },
  guards: {
    hasClaimableExcessSettlementFunds: (
      _,
      { receipts }: { receipts: ReceiptSettlementDataFragment[] }
    ) => {
      return receipts.length > 0;
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgB4GM6wMpgC64BswBbMAO1wDEBXMiWAWQEMymYAnZtACwEsywAYgCiADQDCwrFgD6WYQBUFAGWENhAOQUzKAVQ0ARWeOUBBAJLqDAbQAMAXUSgADgHtYvXL1dknIFIgAbABMABwAdLYAjLahACyhAMxRYYGhADQgAJ6IALRRoQCc4YmJwXHlZQDsAKyhYYkAvo2ZqBiw2HiEJORUtPTMrBxcfAKCAAq6AELK5uIyJuaa2qYAahZmM8J2jkggbh5ePn4BCKVV4cGBsaXXoaE1hVWZOQj5RSVlFXHVdQ3NrXQmBw+CIpAoNDojBYbDAnCYPH4QkmMzmC1myxk+jWG1MWx2fgOnm8vj2p0C4QqdVsNWCKRqUUKZWCLzyBWKpXKlWCtXqSQB4CBHRB3XBfShg1h8MRAnCCLQrlouF0rAAbkxeAQmAAjIiCADqpmUqm0i0xOPMm1UBL2RKOpNAp3KcUuVxqVVCtkCT3icVZCGCthdhS9PKq13daXdArawK6YN6kIGMOGCNGYHCBF4sFw5H4UEornYACUwBheM5cLADUaTeillosRoLVbtg5Ce5iccyYgorVKYVgoUonUqiHEjUaoF-T9wuHh4lQn3yn2CjGhZ1QT0If1oUM4SMkZns7myPnCyWy2AK1XBMXhJJzOMFLJKIpxAAJYQ2du2zv2k5ECqWxgnCQIqgSQpAhie5HmebJEHdS44ndGkoKnMJgiaAUyFcCA4D8WNhXjbdxWTfdpXTDtDhJQC3kSF0R3A65okHKpEkCBj-VyWd2NiKdriuYJ3Tidd2k3UVE13SVUxlDN5UVCgVSYdVNR1IhqK7B1-F7RJwniMpEkKQpPSqK4OOnBCA0SWx9L5GoUIYsJwzEuMtzFJM9ylQ9ZSzHM8zIAsi1LctK3gP8aO7R1EI4ucYieQoHNKJl-UDC5FzCWk4gSIzAinZpmiAA */
  id: "excessSettlementFundsManagerMachine",
  initial: "accountUnavailable",
  context: ({ input }) => ({
    publicClient: input.publicClient,
    walletClient: input.walletClient,
  }),
  on: {
    EXCESS_SETTLEMENT_FUNDS_CLAIMED: {
      actions: enqueueActions(({ event, context, enqueue }) => {
        const { claimMachines = new Map() } = context;
        const updatedClaimMachines = new Map(claimMachines);
        const { receiptId } = event;
        if (claimMachines.has(receiptId)) {
          enqueue.stopChild(receiptId);
          updatedClaimMachines.delete(receiptId);
        }

        enqueue.assign({ claimMachines: updatedClaimMachines });
      }),
    },
    PUBLIC_CLIENT_AVAILABLE: {
      actions: [
        {
          type: "assignPublicClient",
          params: ({ event }) => {
            return { publicClient: event.data };
          },
        },
      ],
    },
    PUBLIC_CLIENT_UNAVAILABLE: {
      actions: [
        {
          type: "assignPublicClient",
          params: { publicClient: undefined },
        },
      ],
    },
  },
  states: {
    accountUnavailable: {
      on: {
        WALLET_CLIENT_AVAILABLE: {
          target: "listeningForReceipts",
          actions: {
            type: "assignWalletClient",
            params: ({ event }) => {
              return { walletClient: event.data };
            },
          },
        },
      },
    },
    listeningForReceipts: {
      entry: enqueueActions(({ context, enqueue }) => {
        const { walletClient, publicClient } = context;
        if (!walletClient || !publicClient) {
          return;
        }

        enqueue.spawnChild("receiptPollingMachine", {
          id: "receiptPollingMachine",
          systemId: "receiptPollingMachine",
          input: {
            walletClient,
          },
        });
      }),
      on: {
        WALLET_CLIENT_UNAVAILABLE: {
          target: "accountUnavailable",
          actions: [
            {
              type: "assignWalletClient",
              params: { walletClient: undefined },
            },
            enqueueActions(({ context, enqueue }) => {
              enqueue.stopChild("receiptPollingMachine");

              const {
                claimMachines = new Map<
                  string,
                  ActorRefFrom<typeof excessSettlementFundsClaimMachine>
                >(),
              } = context;
              claimMachines.forEach((_, id) => {
                enqueue.stopChild(id);
              });

              enqueue.assign({ claimMachines: new Map() });
            }),
          ],
        },
        RECEIPTS_FETCHED: [
          {
            actions: enqueueActions(({ event, enqueue, context }) => {
              const {
                claimMachines = new Map<
                  string,
                  ActorRefFrom<typeof excessSettlementFundsClaimMachine>
                >(),
                publicClient,
                walletClient,
              } = context;
              const updatedClaimMachines = new Map(claimMachines);

              if (!publicClient || !walletClient) {
                enqueue.assign({
                  claimMachines: updatedClaimMachines,
                });
                return;
              }

              const receipts = event.receipts;

              // Convert receipts to a map for easier lookup
              const receiptsMap = new Map(
                receipts.map((receipt) => [receipt.id, receipt])
              );

              // Remove claim machines that are not in the new receipts list
              claimMachines.forEach((_, id) => {
                if (!receiptsMap.has(id)) {
                  enqueue.stopChild(id);
                  updatedClaimMachines.delete(id);
                }
              });

              // Add new machines for receipts not already in claimMachines
              receipts.forEach((receipt) => {
                if (!claimMachines.has(receipt.id)) {
                  enqueue.assign({
                    claimMachines: ({ spawn }) => {
                      const claimMachine = spawn(
                        "excessSettlementFundsClaimMachine",
                        {
                          id: receipt.id,
                          systemId: receipt.id,
                          input: {
                            receipt,
                            walletClient,
                            publicClient,
                          },
                        }
                      );

                      updatedClaimMachines.set(receipt.id, claimMachine);
                      return updatedClaimMachines;
                    },
                  });
                }
              });
            }),
          },
        ],
      },
    },
  },
});
