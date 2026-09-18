# FormPaletteBindingHooks artist guide

Operational directions for [`FormPaletteBindingHooks.sol`](./FormPaletteBindingHooks.sol).
Dashboard steps refer to Creator Dashboard v2.

## What it does

You have one form project, the artwork whose image depends on what is paired to
it, and any number of palette projects, whose tokens supply the palette the form
paints with.

A collector holding one of each can bind them. The form token then renders with
that palette. Pairing is 1:1 and both tokens must sit in the same wallet. Moving
or selling either token breaks the pairing and re-renders the form token with no
palette.

One deployment serves one form project and any number of palette projects, on
any Art Blocks contracts, added whenever you like.

## Register a palette project before it mints

This is the only step with no recovery.

A palette token's image renders at mint. If its project is not registered by
then, the token resolves no palette. Palette projects carry no PostParam, so
nothing exists to write afterward that would trigger a re-render. The live
generator corrects itself, but the stored image and features stay wrong.

Form tokens carry no equivalent risk. They are meant to mint unbound, and every
bind re-renders them.

See [Re-render escape hatch](#re-render-escape-hatch) if you want insurance.

## Calling the hook

The Creator Dashboard configures projects, not hooks. Hook contracts are
specific to the project that commissioned them, so the dashboard does not expose
their functions and will not. Make those calls from the block explorer's write
tab, a Gnosis Safe transaction builder, or a script against the verified ABI.
Verify the hook on the explorer at deploy time or there is no form to use.

Two steps below are hook calls, deploying it and `registerPaletteProject`.
Everything else is a dashboard step.

## Form project setup, once

Do all of this before the form project mints.

1. Deploy the hook with your PMP contract address, the form project's contract,
   and its project ID, then verify it on the block explorer.

2. Scripts tab, click Enable PostParams. This adds the PostParams contract
   dependency to the project.

3. Scripts tab, Configure PostParams. Add one parameter:

   | Field                          | Value                                                                            |
   | ------------------------------ | -------------------------------------------------------------------------------- |
   | Parameter name                 | `boundPaletteTokenId`                                                            |
   | Parameter type                 | Number                                                                           |
   | Who can change this parameter? | Token owner and Contract address                                                 |
   | Contract address               | the hook's address                                                               |
   | Min range                      | `0`                                                                              |
   | Max range                      | `115792089237316195423570985008687907853269984665640564039457584007913129639935` |
   | Lock parameter                 | leave off                                                                        |

   Two of these carry weight. Contract address must be the hook, because that is
   how the hook writes the unbind when a token transfers. Point it elsewhere and
   pairings survive transfers they should not, and that address gains the power
   to bind and unbind collectors' tokens. Lock parameter must stay off, because
   a passed lock date freezes the value for everyone including the hook, making
   every existing pairing permanent.

4. Scripts tab, PostParam hooks. Set the hook's address as both Post-config hook
   and Read augmentation hook.

5. Advanced tab, Transfer hook. Set the hook's address.

## Palette collection setup, every time

Repeat for each palette project, including the first, before it mints.

1. Call `registerPaletteProject(coreContract, projectId, palettes)` on the hook
   from the form project's artist wallet. See [Calling the
   hook](#calling-the-hook).

   The contract must be an Art Blocks core on v3.3 or later, since the hook
   reads token hashes and owners from it and you set a transfer hook on it. Any
   project ID on that contract works except the form project itself, including
   project 0.

   The palette list is written once and can never be changed, extended, or
   replaced, so finalize it first. Selection is `tokenHash % paletteCount`, so
   repeating an entry raises its odds.

   Skip this step and nothing in the collection can be bound, and its tokens
   resolve no palette.

2. Scripts tab, Enable PostParams.

   Skip it and nothing the hook injects reaches the script.

3. Scripts tab, PostParam hooks. Set Read augmentation hook to the hook's
   address. Leave Post-config hook empty, since a palette project has no binding
   parameter.

   Skip it and binding still works and form tokens paint correctly, but the
   collection's own tokens receive no palette and render their default.

4. Advanced tab, Transfer hook. Set the hook's address.

   Skip it and binding still works, but moving one of its tokens does not break
   the pairing. This is the worst of the four to miss. It is the only one that
   leaves wrong state rather than missing state. The form token stops showing
   the palette once the tokens sit in different wallets, but the pairing stays
   recorded and blocks that palette token from binding anywhere else until the
   form token's owner clears it.

## What cannot change later

The form project is fixed in the constructor. A palette project's list is
written once, which is what stops already-minted tokens from being repainted.
Registration has no reverse, because deregistering would strand pairings already
made against that project.

Adding palette collections stays open indefinitely.

## What silently breaks it

Re-running Configure PostParams on the form project without
`boundPaletteTokenId` in the list. Each submission bumps a nonce, after which
the hook's writes fail. Pairings still break correctly on chain, but form tokens
keep stale images. Include the binding parameter every time you touch that form.

Changing the parameter's Contract address or Parameter type has the same effect.
Setting Lock parameter is permanent.

Configuring `boundPaletteCoreContract`, `boundPaletteTokenId`,
`boundPaletteTokenHash`, `boundFormTokenId`, or `paletteData` as project
parameters. The hook injects these and strips anything you configure under those
names.

Locking the form project's script is safe. Storing palettes on chain is what
buys you that. Neither script changes when you add a collection.

## What your scripts receive

Both scripts read the same key:

```js
const params = tokenData.externalAssetDependencies.find(
  (d) => d.dependency_type === "ONCHAIN"
)?.data;
const paletteData = params?.["paletteData"]; // "" when none is in effect
const palette = paletteData ? JSON.parse(paletteData) : defaultPalette;
```

Entries are opaque to the contract. JSON, packed hex, a name, whatever the two
scripts agree on.

On a palette token, `paletteData` holds that token's own entry, always present
once the project is registered, and `boundFormTokenId` holds the form token it
is bound to or an empty string.

On a form token, all four keys are empty strings when unbound:
`paletteData` holds the bound palette token's entry, `boundPaletteCoreContract`
and `boundPaletteTokenId` identify that token, and `boundPaletteTokenHash` is
its hash as `0x` plus 64 hex characters, zero padded.

The form script must render something meaningful with no palette. That is the
state every form token has at mint, and returns to on every transfer.

### boundPaletteTokenHash

Use it for provenance, or to vary something between two palette tokens that
share the same entry.

Do not pick the palette from it. The contract already did that and gave you the
answer in `paletteData`. Your script cannot reproduce the contract's choice
anyway, since it holds neither the palette list nor its length, so anything
derived from the hash would quietly disagree with the chain.

It is always padded to 32 bytes. The on-chain generator writes `tokenData.hash`
unpadded, dropping leading zero bytes on roughly one hash in 256, so pad before
feeding both to one function.

## What collectors can do

Binding needs both tokens in one wallet, both currently unbound.

| Action                                 | How                                                                                                  | Result                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Bind                                   | Write the value from `bindingParamValueFor(core, tokenId)` to the form token's `boundPaletteTokenId` | Form token re-renders with the palette |
| Unbind                                 | Write `0`                                                                                            | Form token re-renders with no palette  |
| Swap palette on one form token         | One transaction, two inputs: `[0, newValue]`                                                         | Form token re-renders once             |
| Move a palette between two form tokens | Two writes, clear the first form token then bind the second                                          | Each form token re-renders             |

The swap is a single transaction because PMP applies a call's inputs in order
and the hook never writes back into PMP. Moving a palette between two form
tokens takes two writes because each `configureTokenParams` call targets one
token, and only a token that gets written re-renders.

The value written is the palette token's contract address and token ID packed
into one number, since a PostParam is a single integer and a bare token ID is
only unique within one contract:

```
value = (BigInt(coreContract) << 96n) | BigInt(paletteTokenId)
```

A front end can compute that directly, or read it from
`bindingParamValueFor(coreContract, paletteTokenId)`, which also reports whether
the project is registered. `previewBind(formTokenId, coreContract,
paletteTokenId)` reports whether a bind will be accepted and what blocks it
otherwise. Every view, event, and error the contract returns speaks in plain
contract addresses and token IDs.

A collector who pastes a bare token ID by mistake gets a clean revert, because
that number is far too small to carry a contract address and unpacks to the zero
address. It cannot bind the wrong palette.

Collectors write the parameter from the token's PostParams controls on
artblocks.io, or from a project site you build. The artblocks.io control is a
numeric field today, so a collector pastes the packed value. Art Blocks may
improve that UI later. Either way, a project site that computes the value for
them, and calls `previewBind` before offering the button, gives collectors a
better path.

## What breaks a pairing

Any transfer of either token, including a sale. The form token re-renders with
no palette and both tokens become free to re-bind. Returning them to one wallet
does not restore the pairing. It has to be made again.

## Re-render escape hatch

Palette projects carry no PostParam, which is why registration has to precede
minting. For insurance, configure an unrelated parameter on each palette
project. Parameter name `renderNonce`, type Number, Artist only, no lock.
Writing it does nothing except emit the event that triggers a re-render.

The hook ignores every key but its own, so this is safe. It is a per-token
write, so treat it as a fix for a mistake rather than a bulk tool.

## Checklist

Form project, once:

- [ ] Hook deployed against the right PMP and form project, and verified on the explorer
- [ ] Enable PostParams
- [ ] `boundPaletteTokenId` configured, Contract address set to the hook, Lock parameter off
- [ ] Post-config hook and Read augmentation hook both set to the hook
- [ ] Transfer hook set
- [ ] Form script renders correctly with no palette

Each palette collection, before it mints:

- [ ] `registerPaletteProject` called on the hook with the final list
- [ ] Enable PostParams
- [ ] Read augmentation hook set to the hook
- [ ] Transfer hook set
- [ ] Staging mint shows `paletteData` populated
