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

    bool public initialized;
    address public quest;

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
        require(_token == address(0));
        
        initialized = true;
        quest = msg.sender;

        seekerId = _seekerId;
        solverId = _solverId;

        paymentAmount = _paymentAmount;

        rewarder = IRewarder(_rewarder);

        (uint256 referralTax, uint256 platformTax) = rewarder.calculateSeekerTax(paymentAmount);

        require(msg.value == paymentAmount + referralTax + platformTax, "Invalid amount sent");

        rewarder.handleSeekerTaxNative{ value: referralTax + platformTax }(_solverId, referralTax, platformTax);
    }

    function proccessPayment() external onlyQuest{
        rewarder.handleRewardNative{value: paymentAmount}(solverId);
    }

    /**
     * @notice Proccess the dispute resolution
     */
    function proccessResolution(uint8 solverShare) external onlyQuest {
        rewarder.proccessResolutionNative{value: paymentAmount}(seekerId, solverId, solverShare);
    }
}