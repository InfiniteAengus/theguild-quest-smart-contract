//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IEscrow } from "./interfaces/Quests/IEscrow.sol";
import { IRewarder } from "./interfaces/IRewarder.sol";

/**
 * @title Quest Escrow for Native Tokens
 * @notice Stores reward for quest
 * @author @cosmodude
 * @dev Implementation contract, instances are created as clones 
 */
contract EscrowNative is IEscrow {
  using SafeERC20 for IERC20;

  bool public initialized = false;
  address public quest;
  uint256 paymentAmount;

  modifier onlyQuest() {
    require(msg.sender == quest, "only quest");
    _;
  }

  function initialize(address token) external payable {   
    require(!initialized);
    require(token == address(0));
    initialized = true;
    quest = msg.sender;
    paymentAmount = msg.value;
  }

  function proccessPayment(uint32 solverId, address rewarder) external onlyQuest{
    IRewarder Rewarder  = IRewarder(rewarder);
    Rewarder.handleRewardNative{value: address(this).balance}(solverId);
  }
  
  /**
   * @notice Proccess the dispute resolution
   */
  function proccessResolution(uint32 seekerId, uint32 solverId, uint8 solverShare, address rewarder) external onlyQuest {
    IRewarder Rewarder  = IRewarder(rewarder);
    Rewarder.proccessResolutionNative{value: address(this).balance}(seekerId, solverId, solverShare);
  }

}