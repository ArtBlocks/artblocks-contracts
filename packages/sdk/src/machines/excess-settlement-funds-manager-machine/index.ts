import { setup, assign, enqueueActions, ActorRefFrom } from "xstate";
import { ReceiptSettlementDataFragment } from "../../generated/graphql";
import { receiptPollingMachine } from "./receipt-polling-machine";
import { excessSettlementFundsClaimMachine } from "../excess-settlement-funds-claim-machine";
import { ArtBlocksClient } from "../..";

/**
 * TODO
 * - No inline actions/guards
 * - Add description fields to states and transitions
 * - Use shared web3 events type
 */

export type ExcessSettlementFundsManagerMachineEvent =
  | {
      type: "ART_BLOCKS_CLIENT_UPDATED";
      artblocksClient: ArtBlocksClient;
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
  artblocksClient: ArtBlocksClient;
  claimMachines?: Map<
    string,
    ActorRefFrom<typeof excessSettlementFundsClaimMachine>
  >;
};

export const excessSettlementFundsManagerMachine = setup({
  types: {
    input: {} as Pick<
      ExcessSettlementFundsManagerMachineContext,
      "artblocksClient"
    >,
    context: {} as ExcessSettlementFundsManagerMachineContext,
    events: {} as ExcessSettlementFundsManagerMachineEvent,
  },
  actors: {
    receiptPollingMachine,
    excessSettlementFundsClaimMachine,
  },
  actions: {
    assignArtblocksClient: assign({
      artblocksClient: (_, params: { artblocksClient: ArtBlocksClient }) =>
        params.artblocksClient,
    }),
  },
  guards: {
    hasClaimableExcessSettlementFunds: (
      _,
      { receipts }: { receipts: ReceiptSettlementDataFragment[] }
    ) => {
      return receipts.length > 0;
    },
    walletClientAvailable: (
      _,
      { artblocksClient }: { artblocksClient: ArtBlocksClient }
    ) => {
      return Boolean(artblocksClient.getWalletClient());
    },
    walletClientUnavailable: (
      _,
      { artblocksClient }: { artblocksClient: ArtBlocksClient }
    ) => {
      return !artblocksClient.getWalletClient();
    },
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5RgB4GM6wMpgC64BswBbMAO1wDEBXMiWAWQEMymYAnZtACwEsywAYgCiADQDCwrFgD6WYQBUFAGWENhAOQUzKAVQ0ARWeOUBBAJLqDAbQAMAXUSgADgHtYvXL1dknIFIgAbABMABwAdLYAjLahACyhAMxRYYGhADQgAJ6IALRRoQCc4YmJwXHlZQDsAKyhYYkAvo2ZqBiw2HiEJORUtPTMrBxcfAKCAAq6AELK5uIyJuaa2qYAahZmM8J2jkggbh5ePn4BCKVV4cGBsaXXoaE1hVWZOQj5RSVlFXHVdQ3NrXQmBw+CIpAoNDojBYbDAnCYPH4QkmMzmC1myxk+jWG1MWx2fgOnm8vj2p0C4QqdVsNWCKRqUUKZWCLzyBWKpXKlWCtXqSQB4CBHRB3XBfShg1h8MRAnCCLQrlouF0rAAbkxeAQmAAjIiCADqpmUqm0i0xOPMm1UBL2RKOpNAp3KcUuVxqVVCtkCT3icVZCGCthdhS9PKq13daXdArawK6YN6kIGMOGCNGYHCBF4sFw5H4UEornYACUwBheM5cLADUaTeillosRoLVbtg5Ce5iccyYgorVKYVgoUonUqiHEjUaoF-T9wuHh4lQn3yn2CjGhZ1QT0If1oUM4SMkZns7myPnCyWy2AK1XBMXhJJzOMFLJKIpxAAJYQ2du2zv2k5ECqWxgnCQIqgSQpAhie5HmebJEHdS44ndGkoKnMJgiaAUyFcCA4D8WNhXjbdxWTfdpXTDtDhJQC3kSF0R3A65okHKpEkCBj-VyWd2NiKdriuYJ3Tidd2k3UVE13SVUxlDN5UVCgVSYdVNR1IhqK7B1-F7RJwniMpEkKQpPSqK4OOnBCA0SWx9L5GoUIYsJwzEuMtzFJM9ylQ9ZSzHM8zIAsi1LctK3gP8aO7R1EI4ucYieQoHNKJl-UDC5FzCWk4gSIzAinZpmiAA */
  id: "excessSettlementFundsManagerMachine",
  initial: "accountUnavailable",
  context: ({ input }) => ({
    artblocksClient: input.artblocksClient,
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
  },
  states: {
    accountUnavailable: {
      on: {
        ART_BLOCKS_CLIENT_UPDATED: [
          {
            target: "listeningForReceipts",
            guard: {
              type: "walletClientAvailable",
              params: ({ event }) => ({
                artblocksClient: event.artblocksClient,
              }),
            },
            actions: {
              type: "assignArtblocksClient",
              params: ({ event }) => ({
                artblocksClient: event.artblocksClient,
              }),
            },
          },
          {
            actions: {
              type: "assignArtblocksClient",
              params: ({ event }) => ({
                artblocksClient: event.artblocksClient,
              }),
            },
          },
        ],
      },
    },
    listeningForReceipts: {
      entry: enqueueActions(({ context, enqueue }) => {
        const { artblocksClient } = context;

        const walletClient = artblocksClient.getWalletClient();
        const publicClient = artblocksClient.getPublicClient();

        if (!walletClient || !publicClient) {
          return;
        }

        enqueue.spawnChild("receiptPollingMachine", {
          id: "receiptPollingMachine",
          systemId: "receiptPollingMachine",
          input: {
            artblocksClient,
          },
        });
      }),
      on: {
        ART_BLOCKS_CLIENT_UPDATED: {
          target: "accountUnavailable",
          guard: {
            type: "walletClientUnavailable",
            params: ({ event }) => ({
              artblocksClient: event.artblocksClient,
            }),
          },
          actions: [
            {
              type: "assignArtblocksClient",
              params: ({ event }) => ({
                artblocksClient: event.artblocksClient,
              }),
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
                artblocksClient,
              } = context;
              const walletClient = artblocksClient.getWalletClient();
              const publicClient = artblocksClient.getPublicClient();

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
                            artblocksClient,
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
