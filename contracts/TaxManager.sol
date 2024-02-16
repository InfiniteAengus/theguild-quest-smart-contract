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

    address public seekerTaxPool;
    address public solverTaxPool;
    address public maintenancePool;
    address public devPool;
    address public rewardAllocationPool;
    address public perpetualPool;
    address public tierPool;
    address public revenuePool;
    address public marketingPool;

    uint256 public seekerTaxRate;
    uint256 public solverTaxRate;
    uint256 public maintenanceTaxRate;
    uint256 public protocolTaxRate;
    uint256 public perpetualPoolTaxRate;
    // uint256 public devPoolTaxRate;
    uint256 public rewardPoolTaxRate;
    uint256 public marketingTaxRate;
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

    function setSeekerTaxPool(address _selfTaxPool) external onlyCustodian {
        seekerTaxPool = _selfTaxPool;
    }

    function setSolverTaxPool(address _solverTaxPool) external onlyCustodian {
        solverTaxPool = _solverTaxPool;
    }

    function setMaintenancePool(
        address _maintenancePool
    ) external onlyCustodian {
        maintenancePool = _maintenancePool;
    }

    // unused pools

    function setDevPool(address _devPool) external onlyCustodian {
        devPool = _devPool;
    }

 

    function setRewardAllocationPool(
        address _rewardAllocationPool
    ) external onlyCustodian {
        rewardAllocationPool = _rewardAllocationPool;
    }



    function setPerpetualPool(address _perpetualPool) external onlyCustodian {
        perpetualPool = _perpetualPool;
    }

 

    function setTierPool(address _tierPool) external onlyCustodian {
        tierPool = _tierPool;
    }



    function setMarketingPool(address _marketingPool) external onlyCustodian {
        marketingPool = _marketingPool;
    }



    function setRevenuePool(address _revenuePool) external onlyCustodian {
        revenuePool = _revenuePool;
    }


    //
    //
    // Setters for the Tax Rates
    //
    //

    function setSeeker(uint256 _seekerTaxRate) external onlyCustodian {
        seekerTaxRate = _seekerTaxRate;
    }


    function setSolverTaxRate(uint256 _solverTaxRate) external onlyCustodian {
        solverTaxRate = _solverTaxRate;
    }

    // unused

    function setMaintenanceTaxRate(
        uint256 _maintenanceTaxRate
    ) external onlyCustodian {
        maintenanceTaxRate = _maintenanceTaxRate;
    }

    function setProtocolTaxRate(
        uint256 _protocolTaxRate
    ) external onlyCustodian {
        protocolTaxRate = _protocolTaxRate;
    }

    // function getProtocolTaxRate() external view returns (uint256) {
    //     return protocolTaxRate + rightUpTaxRate;
    // }

    // function getTotalTaxAtMint() external view returns (uint256) {
    //     return protocolTaxRate + rightUpTaxRate + selfTaxRate;
    // }

    function setPerpetualPoolTaxRate(
        uint256 _perpetualPoolTaxRate
    ) external onlyCustodian {
        perpetualPoolTaxRate = _perpetualPoolTaxRate;
    }

    function setBulkReferralRate(
        uint8 tier,
        uint256 first,
        uint256 second,
        uint256 third,
        uint256 fourth
    ) external onlyCustodian {
        referralRatesByTier[tier].first = first;
        referralRatesByTier[tier].second = second;
        referralRatesByTier[tier].third = third;
        referralRatesByTier[tier].fourth = fourth;
    }

 

    // function setDevPoolTaxRate(uint256 _devPoolRate) external {
    //     devPoolTaxRate = _devPoolRate;
    // }

    // function getDevPoolRate() external view returns (uint256) {
    //     return devPoolTaxRate;
    // }

    function setRewardPoolTaxRate(
        uint256 _rewardPoolRate
    ) external onlyCustodian {
        rewardPoolTaxRate = _rewardPoolRate;
    }

    function setTierPoolRate(uint256 _tierPoolRate) external onlyCustodian {
        tierPoolRate = _tierPoolRate;
    }

    function setMarketingTaxRate(
        uint256 _marketingTaxRate
    ) external onlyCustodian {
        marketingTaxRate = _marketingTaxRate;
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