import { Hex, WalletClient, PublicClient } from "viem";
import { setup, assign, ActorRefFrom } from "xstate";
import { purchaseTrackingMachine } from "./purchaseTrackingMachine";

/**
 * TODO
 * - Use shared web3 events type
 */

type PurchaseTrackingManagerManagerMachineContext = {
  walletClient?: WalletClient;
  publicClient?: PublicClient;
  txHash?: string;
  purchaseTrackingMachines: Record<
    string,
    ActorRefFrom<typeof purchaseTrackingMachine>
  >;
};

type PurchaseTrackingManagerMachineEvents =
  | {
      type: "PUBLIC_CLIENT_AVAILABLE";
      data: PublicClient;
    }
  | {
      type: "PUBLIC_CLIENT_UNAVAILABLE";
    }
  | {
      type: "WALLET_CLIENT_AVAILABLE";
      data: WalletClient;
    }
  | {
      type: "WALLET_CLIENT_UNAVAILABLE";
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
  },
  actors: {
    purchaseTrackingMachine,
  },
  actions: {
    assignPublicClient: assign({
      publicClient: (_, params: { publicClient?: PublicClient }) => {
        return params.publicClient;
      },
    }),
    spawnPurchaseTrackingMachine: assign({
      purchaseTrackingMachines: (
        { spawn, context },
        params: { txHash: Hex }
      ) => {
        if (!context.publicClient) {
          return context.purchaseTrackingMachines;
        }

        return {
          ...context.purchaseTrackingMachines,
          [params.txHash]: spawn("purchaseTrackingMachine", {
            id: params.txHash,
            systemId: params.txHash,
            input: {
              publicClient: context.publicClient,
              purchaseTransactionHash: params.txHash,
            },
          }),
        };
      },
    }),
  },
}).createMachine({
  /** @xstate-layout N4IgpgJg5mDOIC5QAcCuAnAxgCwIazABV1dMBrASwDsoBZXK3GdenasAYgAUBVAIQAyASQDCAfRHCAogDlCYgIIA1BUIELBUgNoAGALqIUAe1gUALhSNVDIAB6IA7ADYAdAFYAzE4cAWB258ATicnDwAOJwAaEABPRB8dFwAmD1SwgEZAjwCQ8IBfPOi0LDwCYlJKGnpGZlZsdm5+YXFJIVl5HhllVXVNXQMkEGQTc0trQfsEAFoPdKSXH3CfMMD0sJ0dHz9ouIQE5NTwzOyfXOcCoowcfCIScmo6BiYwFlJ6qk5eACURAAkFADKUjEQhkQkIQgUhCkABF+jZhqYLFYbJMpp4XB4kk4dOsAg4kqcdF4dogkoE3AdMkkHIEkuk5ukHAVCiAqEYIHAEVdSrcKg9qs9XmwPgiRsjxqA0XMfC4HL4Mm55RTAnSwqSEOknOkXJsHJtCcSnDkWXkgA */
  id: "purchaseTrackingManagerMachine",
  context: {
    purchaseTrackingMachines: {},
  },
  on: {
    PUBLIC_CLIENT_AVAILABLE: {
      actions: {
        type: "assignPublicClient",
        params({ event }) {
          return { publicClient: event.data };
        },
      },
    },
    PUBLIC_CLIENT_UNAVAILABLE: {
      actions: {
        type: "assignPublicClient",
        params: { publicClient: undefined },
      },
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
