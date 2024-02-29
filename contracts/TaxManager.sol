// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;
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

    address public solverTaxPool;
    address public revenuePool;

    // Tax Receiver Addresses
    address private referralTaxReceiver;
    address private platformTaxReceiver;

    SeekerFees public seekerFees;

    // Tax Rates variables
    uint256 public solverTaxRate;
    uint256 public protocolTaxRate;

    // Treasury addresses
    address public seekerFeesTreasury;
    address public solverFeesTreasury;
    address public disputeFeesTreasury;

    // attention here
    uint256 public constant taxBaseDivisor = 10000;

    struct TaxRates {
        uint256 first;
        uint256 second;
        uint256 third;
        uint256 fourth;
    }

    mapping(uint8 => TaxRates) referralRatesByTier; // tier to refferal rates
    uint256 public tierPoolRate;

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
    // Getters for Addresses
    //
    //

    function getReferralTaxReceiver() external view returns (address) {
        return referralTaxReceiver;
    }

    function getPlatformTaxReceiver() external view returns (address) {
        return platformTaxReceiver;
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

    function setSolverTaxPool(address _solverTaxPool) external onlyCustodian {
        solverTaxPool = _solverTaxPool;
    }

    function setSeekerTreasury(address treasury) external onlyCustodian {
        seekerFeesTreasury = treasury;
    }

    function setSolverTreasury(address treasury) external onlyCustodian {
        solverFeesTreasury = treasury;
    }

    function setDisputeTreasuryAddress(address treasury) external onlyCustodian {
        disputeFeesTreasury = treasury;
    }

    //
    //
    // Getters for the Tax Rates
    //
    //

    function getSeekerTaxRate() external view returns (uint256) {
        return seekerFees.referralRewards + seekerFees.platformRevenue;
    }

    function getSeekerFees() external view returns (SeekerFees memory) {
        return seekerFees;
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
        require(_referralRewards + _platformRevenue < taxBaseDivisor, "Tax rate too high");
        seekerFees.referralRewards = _referralRewards;
        seekerFees.platformRevenue = _platformRevenue;
    }

    function setSolverTaxRate(
        uint256 _solverTaxRate
    ) external onlyCustodian validTaxRate(_solverTaxRate) {
        solverTaxRate = _solverTaxRate;
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