# @version ^0.3.7

"""
@title Filtered Minter contract that allows tokens to be minted with ETH.
@author Art Blocks Inc.
@license LGPL-3.0-only
"""

from ..interfaces.abi import i_gen_art_721_core_contract_v1 as IGenArt721CoreContractV1
from ..interfaces.abi import i_filtered_minter_v0 as IFilteredMinterV0
from ..interfaces.abi import i_minter_filter_v0 as IMinterFilterV0

implements: IFilteredMinterV0

# Price per token in wei updated for project `_projectId` to `_pricePerTokenInWei`.
event PricePerTokenInWeiUpdated:
    _projectId: indexed(uint256)
    _pricePerTokenInWei: indexed(uint256)

# Currency updated for project `_projectId` to symbol `_currencySymbol` and address `_currencyAddress`.
# Limiting `_currencySymbol` length to 9 as Vyper requires fixed length strings.
event ProjectCurrencyInfoUpdated:
    _projectId: indexed(uint256)
    _currencyAddress: indexed(address)
    _currencySymbol: String[8]

# `togglePurchaseToDisabled` updated
event PurchaseToDisabledUpdated:
    _projectId: indexed(uint256)
    _purchaseToDisabled: bool

# Core contract address this minter interacts with
genArt721CoreAddress: public(immutable(address))

# This contract handles cores with interface IV1
genArtCoreContract: immutable(IGenArt721CoreContractV1)

# Minter filter address this minter interacts with
minterFilterAddress: public(immutable(address))

# Minter filter this minter may interact with.
minterFilter: immutable(IMinterFilterV0)

# minterType for this minter
minterType: public(constant(String[32])) = "MinterSetPriceV1"

ONE_MILLION: constant(uint256) = 1000000

# projectId => has project reached its maximum number of invocations?
projectMaxHasBeenInvoked: public(HashMap[uint256, bool])
# projectId => project's maximum number of invocations
projectMaxInvocations: public(HashMap[uint256, uint256])
# projectId => price per token in wei - supersedes any defined core price
projectIdToPricePerTokenInWei: public(HashMap[uint256, uint256])
# projectId => price per token has been configured on this minter
projectIdToPriceIsConfigured: public(HashMap[uint256, bool])

@external
def __init__(_genArt721Address: address, _minterFilter: address):
    """
    @notice Initializes contract to be a Filtered Minter for
    `_minterFilter`, integrated with Art Blocks core contract
    at address `_genArt721Address`.
    @param _genArt721Address Art Blocks core contract address for
    which this contract will be a minter.
    @param _minterFilter Minter filter for whichccthis will a
    filtered minter.
    """
    self.minterType = MINTER_TYPE

    genArt721CoreAddress = _genArt721Address
    genArtCoreContract = IGenArt721CoreContractV1(_genArt721Address)

    minterFilterAddress = _minterFilter
    minterFilter = IMinterFilterV0(_minterFilter)

    assert minterFilter.genArt721CoreAddress() == _genArt721Address, "Illegal contract pairing"

@external
def setProjectMaxInvocations(_projectId: uint256):
    """
    @notice Sets the maximum invocations of project `_projectId` based
    on the value currently defined in the core contract.
    @param _projectId Project ID to set the maximum invocations for.
    @dev also checks and may refresh projectMaxHasBeenInvoked for project
    @dev this enables gas reduction after maxInvocations have been reached -
    core contracts shall still enforce a maxInvocation check during mint.
    """
    assert genArtCoreContract.isWhitelisted(msg.sender), "Only Core whitelisted"

    # return values from `projectTokenInfo` that are necessary.
    invocations: uint256 = 0
    maxInvocations: uint256 = 0
    # throwaway return values from `projectTokenInfo`
    z: address = empty(address)
    y: uint256 = 0
    x: bool = False
    w: address = empty(address)
    v: uint256 = 0
    u: String[8] = ""
    t: address = empty(address)

    (z, y, invocations, maxInvocations, x, w, v, u, t) = genArtCoreContract.projectTokenInfo(_projectId)
    # update storage with results
    self.projectMaxInvocations[_projectId] = maxInvocations
    if (invocations < maxInvocations):
        self.projectMaxHasBeenInvoked[_projectId] = False

@external
@view
def togglePurchaseToDisabled(_projectId: uint256):
    """
    @notice Warning: Disabling purchaseTo is not supported on this minter.
    This method exists purely for interface-conformance purposes.
    """
    assert msg.sender == genArtCoreContract.projectIdToArtistAddress(_projectId), "Only Artist"
    raise "Action not supported"

@external
def updatePricePerTokenInWei(_projectId: uint256, _pricePerTokenInWei: uint256):
    """
    @notice Updates this minter's price per token of project `_projectId`
    to be '_pricePerTokenInWei`, in Wei.
    This price supersedes any legacy core contract price per token value.
    """
    assert msg.sender == genArtCoreContract.projectIdToArtistAddress(_projectId), "Only Artist"

    self.projectIdToPricePerTokenInWei[_projectId] = _pricePerTokenInWei
    self.projectIdToPriceIsConfigured[_projectId] = True
    log PricePerTokenInWeiUpdated(_projectId, _pricePerTokenInWei)

@internal
@payable
def _splitFundsETH(_projectId: uint256):
    """
    @dev splits ETH funds between sender (if refund), foundation,
    artist, and artist's additional payee for a token purchased on
    project `_projectId`.
    """
    # return early if nothing to split
    if (msg.value == 0):
        return

    # refund any excess payment to buyer
    pricePerTokenInWei: uint256 = self.projectIdToPricePerTokenInWei[_projectId]
    refund: uint256 = msg.value - pricePerTokenInWei
    if (refund > 0):
        raw_call(msg.sender, 0x00, value=refund)

    # pay out Art Blocks
    foundationAmount: uint256 = (
        pricePerTokenInWei * genArtCoreContract.artblocksPercentage()
    ) / 100
    if (foundationAmount > 0):
        raw_call(genArtCoreContract.artblocksAddress(), 0x00, value=foundationAmount)

    # pay out artist additional payee
    projectFunds: uint256 = pricePerTokenInWei - foundationAmount
    additionalPayeeAmount: uint256 = 0
    if (genArtCoreContract.projectIdToAdditionalPayeePercentage(_projectId) > 0):
        additionalPayeeAmount = (
            projectFunds * genArtCoreContract.projectIdToAdditionalPayeePercentage(_projectId)
        ) / 100
        if (additionalPayeeAmount > 0):
            raw_call(genArtCoreContract.projectIdToAdditionalPayee(_projectId), 0x00, value=additionalPayeeAmount)

    # pay out artist primary payee
    creatorFunds: uint256 = projectFunds - additionalPayeeAmount
    if (creatorFunds > 0):
        raw_call(genArtCoreContract.projectIdToArtistAddress(_projectId), 0x00, value=creatorFunds)

@internal
@payable
def _purchaseTo(_to: address, _projectId: uint256) -> uint256:
    """
    @notice Purchases a token from project `_projectId` and sets
    the token's owner to `_to`.
    @param _to Address to be the new token's owner.
    @param _projectId Project ID to mint a token on.
    @return tokenId Token ID of minted token
    """
    # CHECKS
    assert not self.projectMaxHasBeenInvoked[_projectId], "Maximum number of invocations reached"
    # require artist to have configured price of token on this minter
    assert self.projectIdToPriceIsConfigured[_projectId], "Price not configured"
    assert msg.value >= self.projectIdToPricePerTokenInWei[_projectId], "Must send minimum value to mint!"

    # EFFECTS
    tokenId: uint256 = minterFilter.mint(_to, _projectId, msg.sender)
    # what if projectMaxInvocations[_projectId] is 0 (default value)?
    # that is intended, so that by default the minter allows infinite transactions,
    # allowing the artblocks contract to stop minting
    # tokenInvocation: uint256 = tokenId % ONE_MILLION
    if (
        (self.projectMaxInvocations[_projectId] > 0)
        and
        (tokenId % ONE_MILLION == self.projectMaxInvocations[_projectId] - 1)
    ):
        self.projectMaxHasBeenInvoked[_projectId] = True

    # INTERACTIONS
    self._splitFundsETH(_projectId)

    return tokenId

@external
@payable
@nonreentrant("purchase-flow")
def purchase(_projectId: uint256) -> uint256:
    """
    @notice Purchases a token from project `_projectId`.
    @param _projectId Project ID to mint a token on.
    @return tokenId Token ID of minted token
    """
    return self._purchaseTo(msg.sender, _projectId)

@external
@payable
@nonreentrant("purchase-flow")
def purchaseTo(_to: address, _projectId: uint256) -> uint256:
    """
    @notice Purchases a token from project `_projectId` and sets
    the token's owner to `_to`.
    @param _to Address to be the new token's owner.
    @param _projectId Project ID to mint a token on.
    @return tokenId Token ID of minted token
    """
    return self._purchaseTo(_to, _projectId)

@external
@view
def getPriceInfo(_projectId: uint256) -> (bool, uint256, String[8], address):
    """
    @notice Gets if price of token is configured, price of minting a
    token on project `_projectId`, and currency symbol and address to be
    used as payment. Supersedes any core contract price information.
    @param _projectId Project ID to get price information for.
    @return isConfigured true only if token price has been configured on
    this minter
    @return tokenPriceInWei current price of token on this minter - invalid
    if price has not yet been configured
    @return currencySymbol currency symbol for purchases of project on this
    minter. This minter always returns "ETH"
    @return currencyAddress currency address for purchases of project on
    this minter. This minter always returns null address, reserved for ether
    """
    return (
        self.projectIdToPriceIsConfigured[_projectId], # isConfigured
        self.projectIdToPricePerTokenInWei[_projectId], # tokenPriceInWei
        "ETH", # currencySymbol
        empty(address) # currencyAddress
    )
