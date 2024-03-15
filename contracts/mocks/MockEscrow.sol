//SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.20;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IEscrow} from "../interfaces/Quests/IEscrow.sol";
import {IQuest} from "../interfaces/Quests/IQuest.sol";
import {IRewarder} from "../interfaces/IRewarder.sol";

/**
 * @title Quest Escrow for Native Tokens
 * @notice Stores reward for quest
 * @author @cosmodude
 * @dev Implementation contract, instances are created as clones
 */
contract MockEscrow is IEscrow {
    using SafeERC20 for IERC20;

    bool public initialized;
    IQuest public quest;

    uint32 public seekerId;
    uint32 public solverId;

    uint256 public paymentAmount;

    address public rewarder;
    address public token;

    modifier onlyQuest() {
        require(msg.sender == address(quest), "only quest");
        _;
    }

    function setRewarder(address _rewarder) external {
        rewarder = _rewarder;
    }

    function setToken(address _token) external {
        token = _token;
    }

    function setPaymentAmount(uint256 _paymentAmount) external {
        paymentAmount = _paymentAmount;
    }

    function initialize(
        address,
        uint32 _seekerId,
        uint32 _solverId,
        uint256 _paymentAmount
    ) external payable {
        require(!initialized, "Already Initialized");
        require(rewarder != address(0), "Rewarder not set");

        initialized = true;
        quest = IQuest(msg.sender);

        seekerId = _seekerId;
        solverId = _solverId;

        paymentAmount = _paymentAmount;
    }

    function processPayment() external {
        IRewarder(rewarder).handleRewardNative{value: address(this).balance}(
            solverId,
            0
        );
    }

    /**
     * @notice process the dispute start
     */
    function processStartDispute() external payable {
        IRewarder(rewarder).handleStartDisputeNative{value: msg.value}(
            paymentAmount
        );
    }

    /**
     * @notice process the dispute resolutionForNativeTokens
     */
    function processResolution(uint32 solverShare) external {
        IRewarder(rewarder).processResolutionNative{
            value: address(this).balance
        }(seekerId, solverId, solverShare);
    }

    receive() external payable {}
}
