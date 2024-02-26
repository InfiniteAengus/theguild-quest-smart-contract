// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import "../interfaces/IRewarder.sol";
import "../interfaces/IReferralHandler.sol";
import "../interfaces/INexus.sol";
import "../interfaces/ITaxManager.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Mock Rewarder for testing
contract MockRewarder is IRewarder {
    using SafeERC20 for IERC20;

    address public steward;
    INexus nexus;

    event RewardClaimed(
        address indexed solverAccount,
        address escrow,
        uint256 solverReward
    );
    event ResolutionProccessed(
        uint32 indexed seekerId,
        uint32 indexed solverId,
        uint8 solverShare
    );

    constructor(address _steward) {
        steward = _steward;
    }

    modifier onlySteward() {
        require(msg.sender == steward, "only Steward");
        _;
    }

    function getTaxManager() public view returns (ITaxManager) {
        address taxManager = INexus(nexus).taxManager();
        return ITaxManager(taxManager);
    }

    function handleRewardNative(uint32) public payable {
        address escrow = msg.sender;
        require(escrow.balance == 0, "Escrow not empty");

        (bool success, ) = payable(tx.origin).call{value: msg.value}("");
        require(success, "Solver reward pay error");

        emit RewardClaimed(tx.origin, escrow, msg.value);
    }

    function handleRewardToken(
        address token,
        uint32,
        uint256 amount
    ) external override {
        uint256 balance = IERC20(token).balanceOf(msg.sender);
        require(balance == 0, "Escrow not empty");
        
        IERC20(token).safeTransfer(tx.origin, amount);

        emit RewardClaimed(tx.origin, msg.sender, amount);
    }

    function proccessResolutionNative(
        uint32 seekerId,
        uint32 solverId,
        uint8 solverShare
    ) external payable override {
        emit ResolutionProccessed(seekerId, solverId, solverShare);
    }

    function proccessResolutionToken(
        uint32 seekerId,
        uint32 solverId,
        uint8 solverShare,
        address token
    ) external override {
        emit ResolutionProccessed(seekerId, solverId, solverShare);
    }

    function rewardReferrers(
        address handler,
        uint256 taxValue,
        uint256 taxDivisor
    ) internal {
        
    }

    function recoverTokens(
        address _token,
        address benefactor
    ) external onlySteward {
        if (_token == address(0)) {
            (bool sent, ) = payable(benefactor).call{
                value: address(this).balance
            }("");
            require(sent, "Send error");
            return;
        }
        uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transfer(benefactor, tokenBalance);
        return;
    } 
}