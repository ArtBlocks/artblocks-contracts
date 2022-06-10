# @version ^0.3.3

"""
@title Basic randomizer.
@author Art Blocks Inc.
@license LGPL-3.0-only
"""

from interfaces.abi import i_randomizer as IRandomizer

implements: IRandomizer

@external
@view
def returnValue() -> bytes32:
    time: uint256 = block.timestamp
    extra: uint256 = (time % 200) + 1

    return keccak256(
        _abi_encode(
            block.number,
            blockhash(block.number - 2),
            time,
            extra
        )
    )
