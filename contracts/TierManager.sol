// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;
import "./interfaces/IReferralHandler.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ITierManager.sol";

contract TierManager is ITierManager {
    using SafeERC20 for IERC20;

    struct TierParamaters {
        uint256 xpPoints;
        uint256 novicesReferred;
        uint256 adeptsReferred;
        uint256 mastersReferred;
        uint256 godsReferred;
    }

    address public magistrate;
    address public xpToken;
    mapping(uint256 => TierParamaters) public tierUpConditions;
    mapping(uint256 => uint256) public transferLimits;
    mapping(uint32 => string) public tokenURI;

    modifier onlyMagistrate() {
        require(msg.sender == magistrate, "only magistrate");
        _;
    }

    constructor(address _xpToken) {
        magistrate = msg.sender;
        xpToken = _xpToken;
    }

    function setMagistrate(address account) external onlyMagistrate {
        magistrate = account;
    }

    function setXpToken(address token) external onlyMagistrate {
        xpToken = token;
    }

    // @audit - Should probably be set during the constructor as well
    function setConditions(
        uint8 tier,
        uint256 xpPoints, // NOTE: XP not used for anything
        uint256 novicesReferred,
        uint256 adeptsReferred,
        uint256 mastersReferred,
        uint256 godsReferred
    ) external onlyMagistrate {
        tierUpConditions[tier].novicesReferred = novicesReferred;
        tierUpConditions[tier].adeptsReferred = adeptsReferred;
        tierUpConditions[tier].mastersReferred = mastersReferred;
        tierUpConditions[tier].godsReferred = godsReferred;
        tierUpConditions[tier].xpPoints = xpPoints;
    }

    function validateUserTier(
        uint32[5] memory tierCounts,
        address account,
        uint8 tier
    ) internal view returns (bool) {
        // Check if user has valid requirements for the tier, if it returns true it means they have the requirement for the tier sent as parameter

        // NOTE: Crucial that these values are set after deployment, or users would be able to upgrade without meeting the requirements

        if (tierCounts[0] < tierUpConditions[tier].novicesReferred)
            return false;
        if (tierCounts[1] < tierUpConditions[tier].adeptsReferred) return false;
        if (tierCounts[2] < tierUpConditions[tier].mastersReferred)
            return false;
        if (tierCounts[3] < tierUpConditions[tier].godsReferred) return false;

        IERC20 xp = IERC20(xpToken);
        if (xp.balanceOf(account) < tierUpConditions[tier].xpPoints)
            return false;
        return true;
    }

    function setTokenURI(
        uint8 tier,
        string memory _tokenURI
    ) public onlyMagistrate {
        tokenURI[tier] = _tokenURI;
    }

    function getTokenURI(uint32 tier) public view returns (string memory) {
        return tokenURI[tier];
    }

    function checkTierUpgrade(
        uint32[5] memory tierCounts,
        address account,
        uint8 tier
    ) external override view returns (bool) {
        uint8 newTier = tier + 1;
        return validateUserTier(tierCounts, account, newTier); // If it returns true it means user is eligible for an upgrade in tier
    }

    function recoverTokens(
        address _token,
        address benefactor
    ) external onlyMagistrate {
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

    // function checkTierUpgrade(
    //     uint32[5] memory tierCounts,
    //     address account,
    //     uint8 tier
    // ) external override returns (bool) {}

}