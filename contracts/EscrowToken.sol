//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IEscrow } from "./interfaces/Quests/IEscrow.sol";
import { IRewarder } from "./interfaces/IRewarder.sol";
import { IQuest } from "./interfaces/Quests/IQuest.sol";

/**
 * @title Quest Escrow for ERC20 Tokens
 * @notice Stores reward for quest
 * @author @cosmodude
 * @dev Implementation contract, instances are created as clones 
 */
contract EscrowToken is IEscrow {
    using SafeERC20 for IERC20;

    bool public initialized;
    IQuest public quest;
    IERC20 public token;

    uint32 public seekerId;
    uint32 public solverId;

    uint256 public paymentAmount;

    modifier onlyQuest() {
        require(msg.sender == address(quest), "only quest");
        _;
    }

    function initialize(
        address _token, 
        uint32 _seekerId,
        uint32 _solverId, 
        uint256 _paymentAmount
    ) external payable {   
        require(!initialized, "Already Initialized");
        require(_token != address(0), "Invalid token address");

        initialized = true;

        quest = IQuest(msg.sender);
        token = IERC20(_token);
        
        seekerId = _seekerId;
        solverId = _solverId;

        paymentAmount = _paymentAmount;

        address rewarder = quest.getRewarder();

        (uint256 referralTax, uint256 platformTax) = IRewarder(rewarder).calculateSeekerTax(paymentAmount);

        require(IERC20(token).balanceOf(address(this)) == paymentAmount + referralTax + platformTax, "Insufficient amount sent");
    
        IERC20(token).approve(address(rewarder), referralTax + platformTax);

        IRewarder(rewarder).handleSeekerTaxToken(_solverId, referralTax, platformTax, address(token));
    }

    function processPayment() external onlyQuest{
        address rewarder = quest.getRewarder();
        token.approve(address(rewarder), paymentAmount);
        IRewarder(rewarder).handleRewardToken(address(token), solverId, paymentAmount);
    }

    /**
     * @notice process the dispute start
     */
    function processStartDispute() external payable onlyQuest {
        address rewarder = quest.getRewarder();
        IRewarder(rewarder).handleStartDisputeToken{value: 0}(paymentAmount, address(token));
    }
  
    /**
     * @notice process the dispute resolution
     */
    function processResolution(uint8 solverShare) external onlyQuest {
        address rewarder = quest.getRewarder();
        token.approve(rewarder, paymentAmount);
        IRewarder(rewarder).processResolutionToken(seekerId, solverId, solverShare, address(token), paymentAmount);
    }

}