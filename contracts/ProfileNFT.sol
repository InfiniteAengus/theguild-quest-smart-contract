// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

import "./interfaces/INexus.sol";
import "./interfaces/IReferralHandler.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ProfileNFT is ERC721URIStorage {
    using SafeERC20 for IERC20;
    
    uint32 private _tokenCounter;

    address public councelor;
    address public nexus;

    modifier onlyNexus() { // nexus / hub
        require(msg.sender == nexus, "only nexus");
        _;
    }

    modifier onlyCouncelor() {
        require(msg.sender == councelor, "only Councelor");
        _;
    }

    constructor(address _factory) ERC721("The Guild profike NFT", "GuildNFT") {
        councelor = msg.sender;
        nexus = _factory;
        _tokenCounter++; // Start Token IDs from 1 instead of 0, we use 0 to indicate absense of NFT on a wallet
    }

    function issueProfile(
        address user,
        string memory _tokenURI
    ) public onlyNexus returns (uint32) {
        uint32 newNFTId = _tokenCounter;
        _tokenCounter++;
        _mint(user, newNFTId);
        _setTokenURI(newNFTId, _tokenURI);
        return newNFTId;
    }

    /**
     * @dev Transfers `tokenId` from `from` to `to`.
     *  As opposed to {transferFrom}, this imposes no restrictions on msg.sender.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     *
     * Emits a {Transfer} event.
     */
    function transfer(
        address _to,
        uint32 _tokenId
    ) external {
        super.safeTransferFrom(msg.sender, _to, _tokenId);
    }

    function changeURI(uint32 tokenID, string memory _tokenURI) external {
        address handler = INexus(nexus).getHandler(tokenID);
        require(msg.sender == handler, "Only Handler can update Token's URI");
        _setTokenURI(tokenID, _tokenURI);
    }

    // NOTE: Add two stp ownership to contracts
    function setCouncelor(address account) public onlyCouncelor {
        councelor = account;
    }

    function setNexus(address account) public onlyCouncelor {
        nexus = account;
    }

    function getTier(uint32 tokenID) public view returns (uint8) {
        address handler = INexus(nexus).getHandler(tokenID);
        return IReferralHandler(handler).getTier(); 
    }

    function recoverTokens(
        address _token,
        address benefactor
    ) external onlyCouncelor {
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