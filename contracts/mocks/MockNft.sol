// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockNFT is ERC721 {
    
    uint32 private _tokenCounter;

    constructor() ERC721("Mock NFT", "mNFT") {}

    function mint(address to) external returns (uint256) {
        uint32 newNFTId = _tokenCounter;
        _tokenCounter++;
        _mint(to, newNFTId);

        return newNFTId;
    }
}