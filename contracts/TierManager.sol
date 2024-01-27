// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./interfaces/IReferralHandler.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract TierManager {
    using SafeERC20 for IERC20;

    struct TierParamaters {
        uint256 xpPoints;
        // change naming
        uint256 novicesReferred;
        uint256 adeptsReferred;
        uint256 mastersReferred;
        uint256 godsReferred;
    }

    address public admin;
    mapping(uint256 => TierParamaters) public levelUpConditions;
    mapping(uint256 => uint256) public transferLimits;
    mapping(uint256 => string) public tokenURI;

    modifier onlyAdmin() {
        // Change this to a list with ROLE library
        require(msg.sender == admin, "only admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function scaleUpTokens(uint256 amount) public pure returns (uint256) {
        uint256 scalingFactor = 10 ** 18;
        return amount * scalingFactor;
    }

    function setAdmin(address account) public onlyAdmin {
        admin = account;
    }

    function setConditions(
        uint8 tier,
        uint256 xpPoints,
        uint256 novicesReferred,
        uint256 adeptsReferred,
        uint256 mastersReferred,
        uint256 godsReferred
    ) public onlyAdmin {
        levelUpConditions[tier].novicesReferred = novicesReferred;
        levelUpConditions[tier].adeptsReferred = adeptsReferred;
        levelUpConditions[tier].mastersReferred = mastersReferred;
        levelUpConditions[tier].godsReferred = godsReferred;
    }

    function validateUserTier(
        uint256 tier,
        uint8[5] memory tierCounts
    ) public view returns (bool) {
        // Check if user has valid requirements for the tier, if it returns true it means they have the requirement for the tier sent as parameter
        
        // todo: update
        if (tierCounts[0] < levelUpConditions[tier].novicesReferred) return false;
        if (tierCounts[1] < levelUpConditions[tier].adeptsReferred) return false;
        if (tierCounts[2] < levelUpConditions[tier].mastersReferred) return false;
        if (tierCounts[3] < levelUpConditions[tier].godsReferred) return false;
        return true;
    }

    function setTokenURI(
        uint256 tier,
        string memory _tokenURI
    ) public onlyAdmin {
        tokenURI[tier] = _tokenURI;
    }

    function getTokenURI(uint256 tier) public view returns (string memory) {
        return tokenURI[tier];
    }

    function checkTierUpgrade(
        uint8[5] memory tierCounts
    ) public view returns (bool) {
        uint8 newTier = IReferralHandler(msg.sender).getTier() + 1;
        return validateUserTier(newTier, tierCounts); // If it returns true it means user is eligible for an upgrade in tier
    }

// needs to be updated 
    function recoverTokens(address token, address benefactor) public onlyAdmin {
        uint256 tokenBalance = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(benefactor, tokenBalance);
    }
}