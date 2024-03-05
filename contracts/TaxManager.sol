// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.17;
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/ITaxManager.sol";

/**
 * @title Tax Manager contract
 * @author @cosmodude
 * @notice Holds tax rates and pool addreses 
 * @dev Readonly contract; functions devided by pool and rate relation
 */
contract TaxManager is ITaxManager {
    using SafeERC20 for IERC20;

    address public custodian;

    // Tax Receiver Addresses
    address public referralTaxReceiver;
    address public platformTaxReceiver;
    address public platformTreasuryReceiver;

    // Seeker and Solver fees broken down
    SeekerFees public seekerFees;
    SolverFees public solverFees;

    // Tax Rates variables
    uint256 public disputeDepositRate;  // with base divisor
    uint256 public protocolTaxRate;

    // Treasury addresses
    address public platformTreasury;
    address public disputeFeesTreasury;

    // attention here
    uint256 public constant taxBaseDivisor = 10000;

    struct ReferralTaxRates {
        uint256 first;
        uint256 second;
        uint256 third;
        uint256 fourth;
    }

    mapping(uint8 => ReferralTaxRates) referralRatesByTier; // tier to refferal rates by refDepth

    modifier onlyCustodian() {
        // Change this to a list with ROLE library
        require(msg.sender == custodian, "only custodian"); // need multiple admins
        _;
    }

    modifier validTaxRate(uint256 _taxRate){
        require(_taxRate < taxBaseDivisor, "Tax rate too high");
        _;
    }

    constructor() {
        custodian = msg.sender;
    }

    function setCustodian(address account) public onlyCustodian {
        custodian = account;
    }

    /**
     * @notice Get Referral reward rate 
     * @param depth  A layer of the referral connection (from 1 to 4)
     * @param tier A targeted tier 
     * @return Referral reward rate based on the tier and depth of connection
     */
    function getReferralRate(
        uint8 depth,
        uint8 tier
    ) external view returns (uint256) {
        if (depth == 1) {
            return referralRatesByTier[tier].first;
        } else if (depth == 2) {
            return referralRatesByTier[tier].second;
        } else if (depth == 3) {
            return referralRatesByTier[tier].third;
        } else if (depth == 4) {
            return referralRatesByTier[tier].fourth;
        }
        return 0;
    }

    //
    //
    // Setters for Addresses
    //
    //

    function setreferralTaxReceiver(address _referralTaxReceiver) external onlyCustodian {
        require(_referralTaxReceiver != address(0), "Zero address");
        referralTaxReceiver = _referralTaxReceiver;
    }

    function setPlatformTaxReceiver(address _platformTaxReceiver) external onlyCustodian {
        require(_platformTaxReceiver != address(0), "Zero address");
        platformTaxReceiver = _platformTaxReceiver;
    }

    function setDisputeTreasuryAddress(address treasury) external onlyCustodian {
        disputeFeesTreasury = treasury;
    }

    function setPlatformTreasury(address treasury) external onlyCustodian {
        platformTreasury = treasury;
    }

    //
    //
    // Getters for the Tax Rates
    //
    //

    function getSeekerTaxRate() external view returns (uint256) {
        return seekerFees.referralRewards + seekerFees.platformRevenue;
    }

    function getSolverTaxRate() external view returns (uint256) {
        return solverFees.referralRewards + solverFees.platformRevenue + solverFees.platformTreasury;
    }

    function getSeekerFees() external view returns (SeekerFees memory) {
        return seekerFees;
    }

    function getSolverFees() external view returns (SolverFees memory) {
        return solverFees;
    }

    //
    //
    // Setters for the Tax Rates
    //
    //

    function setSeekerFees(
        uint256 _referralRewards,
        uint256 _platformRevenue
    ) 
        external 
        onlyCustodian 
        validTaxRate(_referralRewards) 
        validTaxRate(_platformRevenue) 
    {
        require(platformTaxReceiver != address(0), "Zero address");
        require(referralTaxReceiver != address(0), "Zero address");
        require(_referralRewards + _platformRevenue <= taxBaseDivisor, "Tax rate too high");
        seekerFees.referralRewards = _referralRewards;
        seekerFees.platformRevenue = _platformRevenue;
    }

    function setSolverFees(
        uint256 _referralRewards,
        uint256 _platformRevenue,
        uint256 _platformTreasury
    ) 
        external 
        onlyCustodian 
        validTaxRate(_referralRewards) 
        validTaxRate(_platformRevenue) 
        validTaxRate(_platformTreasury) 
    {
        require(platformTaxReceiver != address(0), "Zero address");
        require(referralTaxReceiver != address(0), "Zero address");
        require(platformTreasury != address(0), "Zero address");

        require(_referralRewards + _platformRevenue + _platformTreasury <= taxBaseDivisor, "Tax rate too high");

        solverFees.referralRewards = _referralRewards;
        solverFees.platformRevenue = _platformRevenue;
        solverFees.platformTreasury = _platformTreasury;
    }


    function setBulkReferralRate(
        uint8 tier,
        uint256 first,
        uint256 second,
        uint256 third,
        uint256 fourth
    ) 
        external 
        onlyCustodian 
        validTaxRate(first)
        validTaxRate(second)
        validTaxRate(third)
        validTaxRate(fourth)
    {
        referralRatesByTier[tier].first = first;
        referralRatesByTier[tier].second = second;
        referralRatesByTier[tier].third = third;
        referralRatesByTier[tier].fourth = fourth;
    }

    function recoverTokens(
        address _token,
        address benefactor
    ) external onlyCustodian {
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