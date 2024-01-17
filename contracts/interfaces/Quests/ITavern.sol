//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

interface ITavern {
    function createNewQuest(uint32 _solverId, uint32 _seekerId, uint256 _paymentAmount, string memory infoURI, bool withTokens) external payable;
    function confirmNFTOwnership(address seeker) external view returns (bool); 
    function escrowNativeImplementation() external view returns (address);
    function escrowTokenImplementation() external view returns (address);
    function questImplementation() external view returns (address);
    function seekerFeesTreasury() external view returns (address);
    function solverFeesTreasury() external view returns (address);
    function disputeFeesTreasury() external view returns (address);
    function reviewPeriod() external view returns (uint256);
    function getProfileNFT() external view returns(address);
    function counselor() external view returns(address);
    function ownerOf(uint32) external view returns (address);
    function getRewarder() external view returns (address);
}