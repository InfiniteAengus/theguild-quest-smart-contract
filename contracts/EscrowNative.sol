//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { IEscrow } from "./interfaces/Quests/IEscrow.sol";
import { IQuest } from "./interfaces/Quests/IQuest.sol";
import { IRewarder } from "./interfaces/IRewarder.sol";

/**
 * @title Quest Escrow for Native Tokens
 * @notice Stores reward for quest
 * @author @cosmodude
 * @dev Implementation contract, instances are created as clones 
 */
contract EscrowNative is IEscrow {
    using SafeERC20 for IERC20;

    bool public initialized;
    IQuest public quest;

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
        require(_token == address(0), "EscrowNative: Token address shouod be 0");
        
        initialized = true;
        quest = IQuest(msg.sender);

        seekerId = _seekerId;
        solverId = _solverId;

        paymentAmount = _paymentAmount;

        address rewarder = quest.getRewarder();

        (uint256 referralTax, uint256 platformTax) = IRewarder(rewarder).calculateSeekerTax(paymentAmount);

        require(msg.value == paymentAmount + referralTax + platformTax, "Invalid amount sent");

        IRewarder(rewarder).handleSeekerTaxNative{ value: referralTax + platformTax }(_solverId, referralTax, platformTax);
    }

    function proccessPayment() external onlyQuest {
        address rewarder = quest.getRewarder();
        IRewarder(rewarder).handleRewardNative{value: paymentAmount}(solverId);
    }

    /**
     * @notice Proccess the dispute start
     */
    function proccessStartDispute() external payable onlyQuest {
        address rewarder = quest.getRewarder();
        IRewarder(rewarder).handleStartDisputeNative{value: msg.value}(paymentAmount);
    }

    /**
     * @notice Proccess the dispute resolution
     */
    function proccessResolution(uint8 solverShare) external onlyQuest {
        address rewarder = quest.getRewarder();
        IRewarder(rewarder).proccessResolutionNative{value: paymentAmount}(seekerId, solverId, solverShare);
    }
}