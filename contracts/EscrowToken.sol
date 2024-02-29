//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IEscrow } from "./interfaces/Quests/IEscrow.sol";
import { IRewarder } from "./interfaces/IRewarder.sol";

/**
 * @title Quest Escrow for ERC20 Tokens
 * @notice Stores reward for quest
 * @author @cosmodude
 * @dev Implementation contract, instances are created as clones 
 */
contract EscrowToken is IEscrow {
  using SafeERC20 for IERC20;

  bool public initialized;
  address public quest;
  IERC20 public token;

  uint32 public seekerId;
  uint32 public solverId;

  uint256 public paymentAmount;

  IRewarder public rewarder;

  modifier onlyQuest() {
    require(msg.sender == quest, "only quest");
    _;
  }

  function initialize(
    address _token, 
    address _rewarder,
    uint32 _seekerId,
    uint32 _solverId, 
    uint256 _paymentAmount
  ) external payable {   
    require(!initialized);
    require(_token != address(0), "Invalid token address");

    initialized = true;

    quest = msg.sender;
    token = IERC20(_token);
    
    seekerId = _seekerId;
    solverId = _solverId;

    paymentAmount = _paymentAmount;

    rewarder = IRewarder(_rewarder);

    (uint256 referralTax, uint256 platformTax) = rewarder.calculateSeekerTax(paymentAmount);

    require(IERC20(token).balanceOf(address(this)) == paymentAmount + referralTax + platformTax, "Insufficient amount sent");
  
    IERC20(token).approve(address(rewarder), referralTax + platformTax);

    rewarder.handleSeekerTaxToken(_solverId, referralTax, platformTax, address(token));
  }

  function proccessPayment() external onlyQuest{
    IERC20(token).approve(address(rewarder), paymentAmount);
    rewarder.handleRewardToken(address(token), solverId, paymentAmount);
  }
  
  /**
   * @notice Proccess the dispute resolution
   */
  function proccessResolution(uint8 solverShare) external onlyQuest {
    rewarder.proccessResolutionToken(seekerId, solverId, solverShare, address(token));
  }

}