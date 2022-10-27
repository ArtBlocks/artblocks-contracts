## Initial Setup

## Testing Methodology

Be sure to read through carefully when copy/pasting code from one contract to another -- double & triple check things, even if it takes extra development time.


## Helpful Examples

#### Mocking (smock)
Calls to external contracts can be faked -- this is really helpful when your contract relies on dependency contracts. But it can hide lots of complexity and edge-cases that could break your contract, so mocking contracts should be used carefully :)

```
import { expectRevert } from "@openzeppelin/test-helpers";
import  { expect } from "chai";
import { smock, FakeContract } from "@defi-wonderland/smock";
import { IDelegationRegistry } from "../../../scripts/contracts";

  describe(`MinterHolderV2_${coreContractName}`, async function () {
    let fakeDelegationRegistry: FakeContract<IDelegationRegistry>;

    beforeEach(async function () {
        // mock delegate.cash registry with Goerli/mainnet-deployed address
        fakeDelegationRegistry = await smock.fake("IDelegationRegistry", {
            address: "0x00000000000076A84feF008CDAbe6409d2FE638B",
        });
    });
    
    it("calls checkDelegateForToken with the right vault params", async function () {
        fakeDelegationRegistry.checkDelegateForToken.returns(true);
        
        await this.minter.connect(this.accounts.user)
          ["purchaseTo(address,uint256)"](
            allowlistedVault,
            this.projectZero,
            {
              value: this.pricePerTokenInWei,
            }
          );

        expect(fakeDelegationRegistry.checkDelegateForToken).to.have.been.calledOnce;
        
        expect(fakeDelegationRegistry.checkDelegateForToken).to.have.been.calledWith
        (    
          "0x48742D38a0809135EFd643c1150BfC137example",
          3
          );
        
        expect(fakeDelegationRegistry.checkDelegateForToken.whenCalledWith(123).returns(456));
      });

      it("does NOT allow purchases with the wrong pairing", async function () {
        fakeDelegationRegistry.checkDelegateForToken.returns(false);

        const allowlistedVault = this.accounts.artist.address;

        await expectRevert(
            await this.minter.connect(this.accounts.user)
            ["purchaseTo(address,uint256)"](
                "0xInCoRrEcCtAdDrEsS123456789",
                this.projectZero,
                {
                value: this.pricePerTokenInWei,
                }
            );
          "Invalid delegate-vault pairing"
        );
      });
```