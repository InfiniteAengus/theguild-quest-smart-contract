//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

interface ITavern {

    // quests with payments in native token
    event QuestCreatedNative(
        uint32 solverId,
        uint32 seekerId,
        address quest,
        address escrowImplementation,
        uint256 paymentAmount,
        address taxManager
    );
    
    // quests with token payments
    event QuestCreatedToken(
        uint32 solverId,
        uint32 seekerId,
        address quest,
        address escrowImplementation,
        uint256 paymentAmount,
        address token,
        address taxManager
    );

    function confirmNFTOwnership(address seeker) external view returns (bool); 
    function escrowNativeImplementation() external view returns (address);
    function escrowTokenImplementation() external view returns (address);
    function questImplementation() external view returns (address);
    function seekerFeesTreasury() external view returns (address);
    function solverFeesTreasury() external view returns (address);
    function disputeFeesTreasury() external view returns (address);
    function reviewPeriod() external view returns (uint256);
    function getProfileNFT() external view returns(address);
    function mediator() external view returns(address);
    function ownerOf(uint32) external view returns (address);
    function getRewarder() external view returns (address);
}