//SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.20;

interface IQuest {
    function initialize(
        uint32 seekerId,
        uint32 solverId,
        uint256 paymentAmount,
        string memory infoURI,
        uint256 _maxExtensions,
        address escrowImplementation,
        address token
    ) external;

    function startDispute() external payable;

    function resolveDispute(uint32 solverShare) external;

    function finishQuest() external;

    function receiveReward() external;

    function getRewarder() external view returns (address);

    event QuestStarted(
        uint32 seekerId,
        uint32 solverId,
        address token,
        uint256 paymentAmount,
        address escrow
    );
    event DisputeStarted(uint32 seekerId, uint32 solverId);
    event DisputeResolved(uint32 seekerId, uint32 solverId, uint32 solverShare);
    event QuestFinished(uint32 seekerId, uint32 solverId);
    event QuestExtended(
        uint32 seekerId,
        uint32 solverId,
        uint256 extendedCount
    );
    event RewardReceived(
        uint32 seekerId,
        uint32 solverId,
        uint256 paymentAmount
    );
}
