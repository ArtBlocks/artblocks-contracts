/**
 *Submitted for verification at Etherscan.io on 2020-12-20
*/

import "./libs/SafeMath.sol";
import "./libs/Strings.sol";


pragma solidity ^0.5.0;



interface GenArt721CoreContract {
  function isWhitelisted(address sender) external view returns (bool);
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




contract GenArt721Minter5 {
  using SafeMath for uint256;

  GenArt721CoreContract public artblocksContract;

  address payable public ownerAddress;
  uint256 public ownerPercentage;

  mapping(uint256 => bool) public projectIdToBonus;
  mapping(uint256 => address) public projectIdToBonusContractAddress;
  mapping(uint256 => bool) public contractFilterProject;
  mapping(address => mapping (uint256 => uint256)) public projectMintCounter;
  mapping(uint256 => uint256) public projectMintLimit;

  // Auction variables
  mapping(uint256 => uint256) public auctionMultiplier;
  mapping(uint256 => uint256) public auctionTimestamp;
  mapping(uint256 => uint256) public auctionDuration;
  mapping(uint256 => uint256) public auctionedIterations;
  mapping(uint256 => uint256) public auctionIterationCounter;
  mapping(uint256 => uint256) public auctionFinalPrice;
  mapping(address => mapping (uint256 => uint256)) public addressPricePaid;
  mapping(address => mapping (uint256 => bool)) public addressClaimedRefund;
  mapping(uint256 => bool) public projectSplitAuctionFunds;

  constructor(address _genArt721Address) public {
    artblocksContract=GenArt721CoreContract(_genArt721Address);
  }

  function getYourBalanceOfProjectERC20(uint256 _projectId) public view returns (uint256){
    uint256 balance = ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).balanceOf(msg.sender);
    return balance;
  }

  function checkYourAllowanceOfProjectERC20(uint256 _projectId) public view returns (uint256){
    uint256 remaining = ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).allowance(msg.sender, address(this));
    return remaining;
  }

  function setProjectMintLimit(uint256 _projectId,uint8 _limit) public {
    require(artblocksContract.isWhitelisted(msg.sender), "can only be set by admin");
    projectMintLimit[_projectId] = _limit;
  }

  function setOwnerAddress(address payable _ownerAddress) public {
    require(artblocksContract.isWhitelisted(msg.sender), "can only be set by admin");
    ownerAddress = _ownerAddress;
  }

  function setOwnerPercentage(uint256 _ownerPercentage) public {
    require(artblocksContract.isWhitelisted(msg.sender), "can only be set by admin");
    ownerPercentage = _ownerPercentage;
  }

  function toggleContractFilter(uint256 _projectId) public {
    require(artblocksContract.isWhitelisted(msg.sender), "can only be set by admin");
    contractFilterProject[_projectId]=!contractFilterProject[_projectId];
  }

  function artistToggleBonus(uint256 _projectId) public {
    require(msg.sender==artblocksContract.projectIdToArtistAddress(_projectId), "can only be set by artist");
    projectIdToBonus[_projectId]=!projectIdToBonus[_projectId];
  }

  function artistSetBonusContractAddress(uint256 _projectId, address _bonusContractAddress) public {
    require(msg.sender==artblocksContract.projectIdToArtistAddress(_projectId), "can only be set by artist");
    projectIdToBonusContractAddress[_projectId]=_bonusContractAddress;
  }


  ////// Auction Functions

    function setAuctionDetails(uint256 _projectId, uint256 _auctionMultiplier, uint256 _durationInSeconds, uint256 _auctionedIterations) public {
      require(artblocksContract.isWhitelisted(msg.sender), "can only be set by admin");
      auctionMultiplier[_projectId]=_auctionMultiplier;
      auctionDuration[_projectId]=_durationInSeconds;
      auctionedIterations[_projectId]=_auctionedIterations;
      auctionIterationCounter[_projectId]=0;
      projectMintLimit[_projectId] = 1;
      contractFilterProject[_projectId]=true;
      projectSplitAuctionFunds[_projectId]=false;

    }

    function startAuctionNow(uint256 _projectId) public {
      require(artblocksContract.isWhitelisted(msg.sender), "can only be set by admin");
      require(auctionMultiplier[_projectId]!=0, "multiplier must be in place to set project for auction");
      auctionTimestamp[_projectId]=block.timestamp;
    }

    function startAuctionLater(uint256 _projectId, uint256 _startTime) public {
      require(artblocksContract.isWhitelisted(msg.sender), "can only be set by admin");
      require(auctionMultiplier[_projectId]!=0, "multiplier must be in place to set project for auction");
      auctionTimestamp[_projectId]=_startTime;
    }

    function stopAuction(uint256 _projectId) public {
      require(artblocksContract.isWhitelisted(msg.sender), "can only be set by admin");
      auctionTimestamp[_projectId]=0;
    }

    function withdrawExcess(uint256 _projectId) public payable returns (bool) {
      require(!isAuctionLive(_projectId), "cannot withdraw until after auction");
      require(!addressClaimedRefund[msg.sender][_projectId], "refund already claimed");
      uint256 pricePaid = addressPricePaid[msg.sender][_projectId];
      addressClaimedRefund[msg.sender][_projectId]=true;

      if (auctionFinalPrice[_projectId]>0){
        uint256 finalPrice=auctionFinalPrice[_projectId];
        uint256 refund = pricePaid.sub(finalPrice);
        if (refund>0){
          msg.sender.transfer(refund);
        }
      } else {
        uint256 finalPrice=artblocksContract.projectIdToPricePerTokenInWei(_projectId);
        uint256 refund = pricePaid.sub(finalPrice);
        if (refund>0){
          msg.sender.transfer(refund);
        }
      }
      return true;
    }

    function splitAuctionFunds(uint256 _projectId) public payable returns (bool) {
      require(artblocksContract.isWhitelisted(msg.sender), "can only be triggered by admin");
      require(!isAuctionLive(_projectId), "cannot trigger while auction is live");
      _splitFundsETHAuction(_projectId);
      return true;
    }

  function purchase(uint256 _projectId) public payable returns (uint256 _tokenId) {
    return purchaseTo(msg.sender, _projectId);
  }
//remove public and payable to prevent public use of purchaseTo function
  function purchaseTo(address _to, uint256 _projectId) private returns(uint256 _tokenId){
    if (keccak256(abi.encodePacked(artblocksContract.projectIdToCurrencySymbol(_projectId))) != keccak256(abi.encodePacked("ETH"))){
      require(msg.value==0, "this project accepts a different currency and cannot accept ETH");
      require(ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).allowance(msg.sender, address(this)) >= artblocksContract.projectIdToPricePerTokenInWei(_projectId), "Insufficient Funds Approved for TX");
      require(ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).balanceOf(msg.sender) >= artblocksContract.projectIdToPricePerTokenInWei(_projectId), "Insufficient balance.");
      _splitFundsERC20(_projectId);
    } else {
      if (isAuctionLive(_projectId)){
        require(msg.value>=getPrice(_projectId), "Must send minimum value to mint!");
        uint256 totalIterations = auctionIterationCounter[_projectId];
        uint256 newIterations = totalIterations.add(1);
        uint256 projectMaxIterations = auctionedIterations[_projectId];
        uint256 currentPrice = getPrice(_projectId);
        require(totalIterations<projectMaxIterations, "max number of auctioned iterations met");
        auctionIterationCounter[_projectId] = newIterations;
        addressClaimedRefund[_to][_projectId]=false;
        addressPricePaid[_to][_projectId] = currentPrice;
        if (newIterations == projectMaxIterations){
          auctionFinalPrice[_projectId] = currentPrice;
        }
        //_splitFundsETHAuction(_projectId);
      } else {
      require(msg.value>=artblocksContract.projectIdToPricePerTokenInWei(_projectId), "Must send minimum value to mint!");
      _splitFundsETH(_projectId);
    }
    }

    // if contract filter is active prevent calls from another contract
    if (contractFilterProject[_projectId]) require(msg.sender == tx.origin, "No Contract Buys");

    // limit mints per address by project
    if (projectMintLimit[_projectId] > 0) {
        require(projectMintCounter[msg.sender][_projectId] < projectMintLimit[_projectId], "Reached minting limit");
        projectMintCounter[msg.sender][_projectId]++;
    }

    uint256 tokenId = artblocksContract.mint(_to, _projectId, msg.sender);

    if (projectIdToBonus[_projectId]){
      require(BonusContract(projectIdToBonusContractAddress[_projectId]).bonusIsActive(), "bonus must be active");
      BonusContract(projectIdToBonusContractAddress[_projectId]).triggerBonus(msg.sender);
    }

    return tokenId;
  }

  function _splitFundsETH(uint256 _projectId) internal {
    if (msg.value > 0) {
      uint256 pricePerTokenInWei = artblocksContract.projectIdToPricePerTokenInWei(_projectId);
      uint256 refund = msg.value.sub(artblocksContract.projectIdToPricePerTokenInWei(_projectId));
      if (refund > 0) {
        msg.sender.transfer(refund);
      }
      uint256 artBlocksAmount = pricePerTokenInWei.div(100).mul(artblocksContract.artblocksPercentage());
      if (artBlocksAmount > 0) {
        artblocksContract.artblocksAddress().transfer(artBlocksAmount);
      }

      uint256 remainingFunds = pricePerTokenInWei.sub(artBlocksAmount);

      uint256 ownerFunds = remainingFunds.div(100).mul(ownerPercentage);
      if (ownerFunds > 0) {
        ownerAddress.transfer(ownerFunds);
      }

      uint256 projectFunds = pricePerTokenInWei.sub(artBlocksAmount).sub(ownerFunds);
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

  function _splitFundsETHAuction(uint256 _projectId) internal {
    require(!projectSplitAuctionFunds[_projectId], "Funds have already been split for this project");
    require(!isAuctionLive(_projectId), "cannot split funds during an auction");

      uint256 totalFundsToSplit;
      if (auctionFinalPrice[_projectId]>0){
        totalFundsToSplit = auctionFinalPrice[_projectId].mul(auctionIterationCounter[_projectId]);
      } else {
        totalFundsToSplit = getPrice(_projectId).mul(auctionIterationCounter[_projectId]);
      }
      //uint256 pricePerTokenInWei = getPrice(_projectId);
      //uint256 refund = msg.value.sub(pricePerTokenInWei);
      //if (refund > 0) {
        //msg.sender.transfer(refund);
      //}
      uint256 artBlocksAmount = totalFundsToSplit.div(100).mul(artblocksContract.artblocksPercentage());
      if (artBlocksAmount > 0) {
        artblocksContract.artblocksAddress().transfer(artBlocksAmount);
      }

      uint256 remainingFunds = totalFundsToSplit.sub(artBlocksAmount);

      uint256 ownerFunds = remainingFunds.div(100).mul(ownerPercentage);
      if (ownerFunds > 0) {
        ownerAddress.transfer(ownerFunds);
      }

      uint256 projectFunds = totalFundsToSplit.sub(artBlocksAmount).sub(ownerFunds);
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

  function _splitFundsERC20(uint256 _projectId) internal {
      uint256 pricePerTokenInWei = artblocksContract.projectIdToPricePerTokenInWei(_projectId);
      uint256 artBlocksAmount = pricePerTokenInWei.div(100).mul(artblocksContract.artblocksPercentage());
      if (artBlocksAmount > 0) {
        ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).transferFrom(msg.sender, artblocksContract.artblocksAddress(), artBlocksAmount);
      }
      uint256 remainingFunds = pricePerTokenInWei.sub(artBlocksAmount);

      uint256 ownerFunds = remainingFunds.div(100).mul(ownerPercentage);
      if (ownerFunds > 0) {
        ERC20(artblocksContract.projectIdToCurrencyAddress(_projectId)).transferFrom(msg.sender, ownerAddress, ownerFunds);
      }

      uint256 projectFunds = pricePerTokenInWei.sub(artBlocksAmount).sub(ownerFunds);
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
    }

  function getPrice(uint256 _projectId) public view returns (uint256) {
    uint256 auctionStartPrice = artblocksContract.projectIdToPricePerTokenInWei(_projectId).mul(auctionMultiplier[_projectId]);
    if (block.timestamp<auctionTimestamp[_projectId]){
      return auctionStartPrice;
    } else {
    uint256 elapsedTime = block.timestamp.sub(auctionTimestamp[_projectId]);
    uint256 duration = auctionDuration[_projectId];
    if (elapsedTime<duration && isAuctionLive(_projectId)){
      uint256 currentPrice = duration.sub(elapsedTime).mul(auctionStartPrice).div(duration);
      if (currentPrice<artblocksContract.projectIdToPricePerTokenInWei(_projectId)){
        return artblocksContract.projectIdToPricePerTokenInWei(_projectId);
      } else {
        return currentPrice;
      }

    } else {
      return artblocksContract.projectIdToPricePerTokenInWei(_projectId);
    }
  }

     }

  function isAuctionLive(uint256 _projectId) public view returns (bool){
    if (block.timestamp<auctionTimestamp[_projectId]){
      return false;
    } else if (auctionIterationCounter[_projectId]==auctionedIterations[_projectId]){
      return false;
    } else {
       return block.timestamp.sub(auctionTimestamp[_projectId])<auctionDuration[_projectId];
     }
     }

  function auctionTimeRemaining(uint256 _projectId) public view returns (uint256) {
    require(isAuctionLive(_projectId), "auction is not currently live");
    uint256 elapsedTime = block.timestamp.sub(auctionTimestamp[_projectId]);
    uint256 duration = auctionDuration[_projectId];
    return duration.sub(elapsedTime);

  }

  function getCurrentTime() public view returns (uint256){
    return block.timestamp;
  }

//// clear refund amount once refund is claimed
  function getRefundAmount(address _address, uint256 _projectId) public view returns (uint256){
    uint256 pricePaid = addressPricePaid[_address][_projectId];
    if (auctionFinalPrice[_projectId]>0){
      uint256 finalPrice=auctionFinalPrice[_projectId];
      uint256 refund = pricePaid.sub(finalPrice);
      return refund;
    } else {
      uint256 finalPrice=artblocksContract.projectIdToPricePerTokenInWei(_projectId);
      uint256 refund = pricePaid.sub(finalPrice);
      return refund;
    }
  }


}
