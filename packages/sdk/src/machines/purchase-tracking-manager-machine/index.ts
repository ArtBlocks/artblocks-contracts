import { Hex } from "viem";
import { setup, assign, ActorRefFrom } from "xstate";
import { purchaseTrackingMachine } from "../purchase-tracking-machine";
import { ArtBlocksClient } from "../..";

/**
 * TODO
 * - Use shared web3 events type
 */

type PurchaseTrackingManagerManagerMachineContext = {
  artblocksClient: ArtBlocksClient;
  marketplaceUrl?: string;
  purchaseTrackingMachines: Record<
    string,
    ActorRefFrom<typeof purchaseTrackingMachine>
  >;
};

type PurchaseTrackingManagerMachineEvents =
  | {
      type: "ART_BLOCKS_CLIENT_UPDATED";
      artblocksClient: ArtBlocksClient;
    }
  | {
      type: "PURCHASE_INITIATED";
      txHash: Hex;
    }
  | {
      type: "PURCHASE_COMPLETED";
      txHash: Hex;
    };

export const purchaseTrackingManagerMachine = setup({
  types: {
    context: {} as PurchaseTrackingManagerManagerMachineContext,
    events: {} as PurchaseTrackingManagerMachineEvents,
    input: {} as {
      artblocksClient: ArtBlocksClient;
      marketplaceUrl?: string;
    },
  },
  actors: {
    purchaseTrackingMachine,
  },
  actions: {
    assignArtblocksClient: assign({
      artblocksClient: (
        _,
        { artblocksClient }: { artblocksClient: ArtBlocksClient }
      ) => artblocksClient,
    }),
    spawnPurchaseTrackingMachine: assign({
      purchaseTrackingMachines: (
        { spawn, context },
        params: { txHash: Hex }
      ) => {
        const publicClient = context.artblocksClient.getPublicClient();

        if (!publicClient) {
          return context.purchaseTrackingMachines;
        }

        return {
          ...context.purchaseTrackingMachines,
          [params.txHash]: spawn("purchaseTrackingMachine", {
            id: params.txHash,
            systemId: params.txHash,
            input: {
              artblocksClient: context.artblocksClient,
              purchaseTransactionHash: params.txHash,
              marketplaceUrl: context.marketplaceUrl,
            },
          }),
        };
      },
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCuAnAxgCwIazABV1dMBrASwDsoBZXK3GdenasAYgEEAlQgIQAyAeQDCAaQDKAfVGCAkgFEAcoWkBVAAoARLoUXaA2gAYAuohQB7WBQAuFS1QsgAHogBMAdgCsAOgCMnv4AHABsoQAsAMz+3u5x3gA0IACeiP7uwb7BUZnGxgCcQe5RURERAL4VyWhYeATEpJQ09IzMrNjsHJrqPKIAElySitLyyvKE8noGJuZIIMjWdg5O824IALTeUb65ocbBxt4Rnu4R+1GhyWkI7gV+Jf4FXs-+GYFV1SBUlhBwzrUcPgiCRyNQ6AwmGAWKROlQwAClvZHM51hsMhFfJ5PBFgrFsfcCs9gtd0qF-L5jCcqWdjJdjqFPhUgA */
  id: "purchaseTrackingManagerMachine",
  context: ({ input }) => ({
    artblocksClient: input.artblocksClient,
    marketplaceUrl: input.marketplaceUrl,
    purchaseTrackingMachines: {},
  }),
  on: {
    ART_BLOCKS_CLIENT_UPDATED: {
      actions: [
        {
          type: "assignArtblocksClient",
          params: ({ event }) => ({
            artblocksClient: event.artblocksClient,
          }),
        },
      ],
    },
    PURCHASE_INITIATED: {
      actions: [
        {
          type: "spawnPurchaseTrackingMachine",
          params({ event }) {
            return { txHash: event.txHash };
          },
        },
      ],
    },
  },
});
