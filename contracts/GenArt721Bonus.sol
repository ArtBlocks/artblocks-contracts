
pragma solidity ^0.5.0;

import "./libs/SafeMath.sol";
import "./libs/Strings.sol";




interface ERC20 {
  function balanceOf(address _owner) external view returns (uint balance);
  function transfer(address _to, uint _value) external returns (bool success);
  function transferFrom(address _from, address _to, uint _value) external returns (bool success);
  function allowance(address _owner, address _spender) external view returns (uint remaining);
}

contract GenArt721Bonus {
  using SafeMath for uint256;

  ERC20 erc20Contract;

  mapping(address => bool) public isWhitelisted;
  bool public bonusIsActive;
  address public owner;
  uint256 public bonusValueInWei;
  bool public contractOwnsTokens;

  constructor(address _erc20, address _minter, uint256 _bonusValueInWei) public {
    owner=msg.sender;
    erc20Contract=ERC20(_erc20);
    isWhitelisted[_minter]=true;
    bonusIsActive = true;
    bonusValueInWei=_bonusValueInWei;
  }

  function triggerBonus(address _to) external returns (bool){
    require(isWhitelisted[msg.sender]==true, "only whitelisted contracts can trigger bonus");
    if (contractOwnsTokens){
      require(erc20Contract.balanceOf(address(this))>=bonusValueInWei, "this contract does not have sufficient balance for reward");
      erc20Contract.transfer(_to, bonusValueInWei);
    } else {
      require(erc20Contract.allowance(owner, address(this))>=bonusValueInWei, "this contract does not have sufficient allowance set for reward");
      erc20Contract.transferFrom(owner, _to, bonusValueInWei);
    }
    return true;
  }

  function checkOwnerAllowance() public view returns (uint256){
    uint256 remaining = erc20Contract.allowance(owner, address(this));
    return remaining;
  }

  function checkContractTokenBalance() public view returns (uint256){
    return erc20Contract.balanceOf(address(this));
  }

  function toggleBonusIsActive() public {
    require(msg.sender==owner, "can only be set by owner");
    bonusIsActive=!bonusIsActive;
  }

  function toggleContractOwnsTokens() public {
    require(msg.sender==owner, "can only be set by owner");
    contractOwnsTokens=!contractOwnsTokens;
  }

  function addWhitelisted(address _whitelisted) public {
    require(msg.sender==owner, "only owner can add whitelisted contract");
    isWhitelisted[_whitelisted]=true;
  }

  function removeWhitelisted(address _whitelisted) public {
    require(msg.sender==owner, "only owner can remove whitelisted contract");
    isWhitelisted[_whitelisted]=false;
  }

  function changeBonusValueInWei(uint _bonusValueInWei) public {
    require(msg.sender==owner, "only owner can modify bonus reward");
    bonusValueInWei=_bonusValueInWei;
  }

  function returnTokensToOwner() public {
    require(msg.sender==owner, "only owner can modify bonus reward");
    erc20Contract.transfer(owner, erc20Contract.balanceOf(address(this)));
  }
}
