//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IEscrow, IEscrowToken } from "./interfaces/Quests/IEscrow.sol";
import { IRewarder } from "./interfaces/IRewarder.sol";

/**
 * @title Quest Escrow for ERC20 Tokens
 * @notice Stores reward for quest
 * @author @cosmodude
 * @dev Implementation contract, instances are created as clones 
 */
contract EscrowToken is IEscrow, IEscrowToken {
  using SafeERC20 for IERC20;

  bool public initialized;
  address public quest;
  IERC20 public token;
  uint256 public paymentAmount;

  modifier onlyQuest() {
    require(msg.sender == quest, "only quest");
    _;
  }

  function initialize(address _token, uint256 _amount) external payable {   
    require(!initialized);
    require(_token != address(0), "Invalid token address");
    initialized = true;
    quest = msg.sender;
    token = IERC20(_token);
    paymentAmount = _amount;

    require(IERC20(token).balanceOf(address(this)) >= _amount, "Insufficient balance");
  }

  function proccessPayment(uint32 solverId, address rewarder) external onlyQuest{
    IRewarder Rewarder  = IRewarder(rewarder);
    Rewarder.handleRewardToken(address(token), solverId, paymentAmount);
  }
  
  /**
   * @notice Proccess the dispute resolution
   */
  function proccessResolution(uint32 seekerId, uint32 solverId, uint8 solverShare, address rewarder) external onlyQuest {
    IRewarder Rewarder  = IRewarder(rewarder);
    Rewarder.proccessResolutionToken(seekerId, solverId, solverShare, address(token));
  }

}