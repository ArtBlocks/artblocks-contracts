//Frotest: https://rinkeby.etherscan.io/token/0x8006fa51A40468988338863ab2df849bfFc7089f
//ABST: https://rinkeby.etherscan.io/token/0xe2da04b49156cff09e79c0ae6a720ccac0edefa9
pragma solidity ^0.5.0;

import "./libs/SafeMath.sol";
import "./libs/Strings.sol";


interface GenArt721Contract {
  function projectIdToCurrencySymbol(uint256 _projectId) external view returns (string memory);
  function projectIdToCurrencyAddress(uint256 _projectId) external view returns (address);
  function projectIdToArtistAddress(uint256 _projectId) external view returns (address payable);
  function projectIdToPricePerTokenInWei(uint256 _projectId) external view returns (uint256);
  function projectIdToAdditionalPayee(uint256 _projectId) external view returns (address payable);
  function projectIdToAdditionalPayeePercentage(uint256 _projectId) external view returns (uint256);
  function artblocksAddress() external view returns (address payable);
  function artblocksPercentage() external view returns (uint256);
  function mint(address _to, uint256 _projectId, address _by) external returns (uint256 tokenId);
}


interface ERC20 {
  function balanceOf(address _owner) external view returns (uint balance);
  function transferFrom(address _from, address _to, uint _value) external returns (bool success);
  function allowance(address _owner, address _spender) external view returns (uint remaining);
}

interface BonusContract {
  function triggerBonus(address _to) external returns (bool);
  function bonusIsActive() external view returns (bool);
}




contract GenArt721Minter {
  using SafeMath for uint256;

  GenArt721Contract public artblocksContract;


  mapping(uint256 => bool) public projectIdToBonus;
  mapping(uint256 => address) public projectIdToBonusContractAddress;

  constructor(address _genArt721Address) public {
    artblocksContract=GenArt721Contract(_genArt721Address);
  }


function getYourBalanceOfProjectERC20(uint256 _projectId) public view returns (uint256){
  uint256 balance = ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).balanceOf(msg.sender);
  return balance;
}

function checkYourAllowanceOfProjectERC20(uint256 _projectId) public view returns (uint256){
  uint256 remaining = ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).allowance(msg.sender, address(this));
  return remaining;
}

function artistToggleBonus(uint256 _projectId) public {
  require(msg.sender==artblocksContract.projectIdToArtistAddress(_projectId), "can only be set by artist");
  projectIdToBonus[_projectId]=!projectIdToBonus[_projectId];
}

function artistSetBonusContractAddress(uint256 _projectId, address _bonusContractAddress) public {
  require(msg.sender==artblocksContract.projectIdToArtistAddress(_projectId), "can only be set by artist");
  projectIdToBonusContractAddress[_projectId]=_bonusContractAddress;
}

function purchase(uint256 _projectId) public payable returns (uint256 _tokenId) {
    return purchaseTo(msg.sender, _projectId);
}

function purchaseTo(address _to, uint256 _projectId) public payable returns(uint256 _tokenId){
  if (keccak256(abi.encodePacked(artblocksContract.projectIdToCurrencySymbol(_projectId))) != keccak256(abi.encodePacked("ETH"))){
    require(msg.value==0, "this project accepts a different currency and cannot accept ETH");
    require(ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).allowance(msg.sender, address(this)) >= artblocksContract.projectIdToPricePerTokenInWei(_projectId), "Insufficient Funds Approved for TX");
    require(ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).balanceOf(msg.sender) >= artblocksContract.projectIdToPricePerTokenInWei(_projectId), "Insufficient balance.");
  } else {
    require(msg.value>=artblocksContract.projectIdToPricePerTokenInWei(_projectId), "Must send minimum value to mint!");
  }
  uint256 tokenId = artblocksContract.mint(_to, _projectId, msg.sender);

  if (projectIdToBonus[_projectId]){
    require(BonusContract(projectIdToBonusContractAddress[_projectId]).bonusIsActive(), "bonus must be active");
    BonusContract(projectIdToBonusContractAddress[_projectId]).triggerBonus(msg.sender);
    }

  _splitFunds(_projectId);

  return tokenId;
}

function _splitFunds(uint256 _projectId) internal {
  if (keccak256(abi.encodePacked(artblocksContract.projectIdToCurrencySymbol(_projectId))) != keccak256(abi.encodePacked("ETH"))){

    uint256 pricePerTokenInWei = artblocksContract.projectIdToPricePerTokenInWei(_projectId);

    uint256 foundationAmount = pricePerTokenInWei.div(100).mul(artblocksContract.artblocksPercentage());
    if (foundationAmount > 0) {
      ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).transferFrom(msg.sender, artblocksContract.artblocksAddress(), foundationAmount);
    }

    uint256 projectFunds = pricePerTokenInWei.sub(foundationAmount);

    uint256 additionalPayeeAmount;
    if (artblocksContract.projectIdToAdditionalPayeePercentage(_projectId) > 0) {
        additionalPayeeAmount = projectFunds.div(100).mul(artblocksContract.projectIdToAdditionalPayeePercentage(_projectId));
        if (additionalPayeeAmount > 0) {
          ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).transferFrom(msg.sender, artblocksContract.projectIdToAdditionalPayee(_projectId), additionalPayeeAmount);
        }
    }

    uint256 creatorFunds = projectFunds.sub(additionalPayeeAmount);
    if (creatorFunds > 0) {
      ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).transferFrom(msg.sender, artblocksContract.projectIdToArtistAddress(_projectId), creatorFunds);
    }
  } else {
    if (msg.value > 0) {

        uint256 pricePerTokenInWei = artblocksContract.projectIdToPricePerTokenInWei(_projectId);
        uint256 refund = msg.value.sub(artblocksContract.projectIdToPricePerTokenInWei(_projectId));

        if (refund > 0) {
            msg.sender.transfer(refund);
        }

        uint256 foundationAmount = pricePerTokenInWei.div(100).mul(artblocksContract.artblocksPercentage());
        if (foundationAmount > 0) {
            artblocksContract.artblocksAddress().transfer(foundationAmount);
        }

        uint256 projectFunds = pricePerTokenInWei.sub(foundationAmount);

        uint256 additionalPayeeAmount;
        if (artblocksContract.projectIdToAdditionalPayeePercentage(_projectId) > 0) {
            additionalPayeeAmount = projectFunds.div(100).mul(artblocksContract.projectIdToAdditionalPayeePercentage(_projectId));
            if (additionalPayeeAmount > 0) {
                artblocksContract.projectIdToAdditionalPayee(_projectId).transfer(additionalPayeeAmount);
            }
        }

        uint256 creatorFunds = projectFunds.sub(additionalPayeeAmount);
        if (creatorFunds > 0) {
            artblocksContract.projectIdToArtistAddress(_projectId).transfer(creatorFunds);
        }
    }
  }
}}
