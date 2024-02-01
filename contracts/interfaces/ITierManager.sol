// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

interface ITierManager {
    function checkTierUpgrade(uint32[5] memory tierCounts) external returns (bool);
    function getTokenURI(uint32 tokenId) external view returns (string memory tokenURI);
}