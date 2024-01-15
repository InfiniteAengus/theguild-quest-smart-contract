// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IReferralHandler {
    function initialize(
        address _referredBy,
        address _nftAddress,
        uint32 _nftId
    ) external;
    function setTier(uint8 _tier) external;
    function checkExistence(uint256, address) external view returns (address);
    function nFTId() external view returns (address);
    function referredBy() external view returns (address);
    function ownedBy() external view returns (address);
    function getTier() external view returns (uint8);
    function updateReferralTree(uint8 refDepth, uint8 _tier) external;
    function addToReferralTree(uint8 refDepth, address referralHandler , uint8 _tier) external;
    function notifyFactory(uint256 reward, uint256 timestamp) external;
}