// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IReferralHandler.sol";
import "./interfaces/INexus.sol";
import "./interfaces/ITaxManager.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Rewarder {
    using SafeERC20 for IERC20;

    uint256 public BASE = 1e18;
    address public steward;
    INexus nexus;

    constructor(address _steward) {
        steward = _steward;
    }

    modifier onlySteward() {
        require(msg.sender == steward, "only Steward");
        _;
    }

    function getTaxManager(address factory) public view returns (ITaxManager) {
        address taxManager = INexus(factory).taxManager();
        return ITaxManager(taxManager);
    }

    function handleRewardNative(  // anyone can call
        address factory
    ) external payable {
        ITaxManager taxManager = getTaxManager(factory);
        uint256 protocolTaxRate = taxManager.getProtocolTaxRate();
        uint256 taxDivisor = taxManager.getTaxBaseDivisor();
        address handler = msg.sender;
        address owner = IReferralHandler(handler).ownedBy();

        // handleSelfTax(
        //     handler,
        //     factory,
        //     balanceToMint,
        //     protocolTaxRate,
        //     taxDivisor
        // );
        
    }


    function handleSolverTax(
        address handler,
        address factory,
        uint256 balance,
        uint256 protocolTaxRate,
        uint256 taxDivisor
    ) internal {
        address owner = IReferralHandler(handler).ownedBy();
        ITaxManager taxManager = getTaxManager(factory);
        uint256 selfTaxRate = taxManager.getSelfTaxRate();
        uint256 taxedAmountReward = balance * selfTaxRate / divisor;
        uint256 protocolTaxed = taxedAmountReward * protocolTaxRate / divisor;
        uint256 reward = taxedAmountReward - protocolTaxed;
        
        IReferralHandler(handler).notifyNexus(reward, block.timestamp); // change to notify 
    }

    function handlePayment(
        address handler,
        address factory,
        uint256 balance,
        uint256 taxRate,
        uint256 protocolTaxRate,
        uint256 divisor
    ) internal {
        ITaxManager taxManager = getTaxManager(factory);
        uint256 taxedAmountReward = balance * taxRate / divisor;
        uint256 protocolTaxed = taxedAmountReward * protocolTaxRate /divisor;
        uint256 reward = taxedAmountReward - protocolTaxed;
        address referrer = IReferralHandler(handler).referredBy();
    }

    function rewardReferrers(
        address handler,
        address factory,
        uint256 balanceDuringRebase,
        uint256 rightUpTaxRate,
        uint256 protocolTaxRate,
        uint256 taxDivisor
    ) internal {
        // This function mints the tokens and disperses them to referrers above
        ITaxManager taxManager = getTaxManager(factory);
        uint256 perpetualTaxRate = taxManager.getPerpetualPoolTaxRate();
        uint256 leftOverTaxRate = protocolTaxRate - perpetualTaxRate; // Taxed and minted on rebase
        leftOverTaxRate = leftOverTaxRate - rightUpTaxRate; // Tax and minted in function above
        address[5] memory referral; // Used to store above referrals, saving variable space
        // Block Scoping to reduce local Variables spillage
        {
            uint256 protocolMaintenanceRate = taxManager
                .getMaintenanceTaxRate();
            uint256 protocolMaintenanceAmount = balanceDuringRebase * protocolMaintenanceRate / taxDivisor;
            address maintenancePool = taxManager.getMaintenancePool();
            leftOverTaxRate = leftOverTaxRate - protocolMaintenanceRate;
        }
        referral[1] = IReferralHandler(handler).referredBy();
        if (referral[1] != address(0)) {
            // Block Scoping to reduce local Variables spillage
            {
                uint256 firstTier = IReferralHandler(referral[1]).getTier();
                uint256 firstRewardRate = taxManager.getReferralRate(
                    1,
                    firstTier
                );
                leftOverTaxRate = leftOverTaxRate - firstRewardRate;
                uint256 firstReward = balanceDuringRebase * firstRewardRate / taxDivisor;
            }
            referral[2] = IReferralHandler(referral[1]).referredBy();
            if (referral[2] != address(0)) {
                // Block Scoping to reduce local Variables spillage
                {
                    uint256 secondTier = IReferralHandler(referral[2])
                        .getTier();
                    uint256 secondRewardRate = taxManager.getReferralRate(
                        2,
                        secondTier
                    );
                    leftOverTaxRate = leftOverTaxRate - secondRewardRate;
                    uint256 secondReward = balanceDuringRebase * secondRewardRate / taxDivisor;
                }
                referral[3] = IReferralHandler(referral[2]).referredBy();
                if (referral[3] != address(0)) {
                    // Block Scoping to reduce local Variables spillage
                    {
                        uint256 thirdTier = IReferralHandler(referral[3])
                            .getTier();
                        uint256 thirdRewardRate = taxManager.getReferralRate(
                            3,
                            thirdTier
                        );
                        leftOverTaxRate = leftOverTaxRate - thirdRewardRate;
                        uint256 thirdReward = balanceDuringRebase * thirdRewardRate / taxDivisor;
                    }
                    referral[4] = IReferralHandler(referral[3]).referredBy();
                    if (referral[4] != address(0)) {
                        // Block Scoping to reduce local Variables spillage
                        {
                            uint256 fourthTier = IReferralHandler(referral[4])
                                .getTier();
                            uint256 fourthRewardRate = taxManager
                                .getReferralRate(4, fourthTier);
                            leftOverTaxRate = leftOverTaxRate - fourthRewardRate;
                            uint256 fourthReward = balanceDuringRebase * fourthRewardRate / taxDivisor;
                        }
                    }
                }
            }
        }
        // Reward Allocation
        {
            uint256 rewardTaxRate = taxManager.getRewardPoolRate();
            uint256 rewardPoolAmount = balanceDuringRebase * rewardTaxRate / taxDivisor;
            address rewardPool = taxManager.getRewardAllocationPool();
            leftOverTaxRate = leftOverTaxRate - rewardTaxRate;
        }
        // Dev Allocation & // Revenue Allocation
        {
            uint256 leftOverTax = balanceDuringRebase * leftOverTaxRate / taxDivisor;
            address devPool = taxManager.getDevPool();
            address revenuePool = taxManager.getRevenuePool();
        }
    }

    function recoverTokens(
        address _token,
        address benefactor
    ) public onlySteward {
        if(_token == address(0)){
            (bool sent, bytes memory data) = payable(benefactor).call{value: address(this).balance}("");
            require(sent, "Send error");
            return;
        }
        uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transfer(benefactor, tokenBalance);
    }
}