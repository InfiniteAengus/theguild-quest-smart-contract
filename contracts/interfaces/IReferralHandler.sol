// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IReferralHandler {
    function initialize(
        uint32 _referredBy,
        address _nftAddress,
        uint32 _nftId
    ) external;
    function setTier(uint256 _tier) external;
    function checkExistence(uint256, address) external view returns (address);
    function coupledNFT() external view returns (address);
    function referredById() external view returns (uint32);
    function ownedBy() external view returns (address);
    function getTier() external view returns (uint8);
    function updateReferralTree(uint256 depth, uint8 NFTtier) external;
    function addToReferralTree(uint256 refDepth, uint32 referreId, uint8 _tier) external;
    function notifyFactory(uint256 reward, uint256 timestamp) external;
}