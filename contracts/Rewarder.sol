// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import "./interfaces/IRewarder.sol";
import "./interfaces/IReferralHandler.sol";
import "./interfaces/INexus.sol";
import "./interfaces/ITaxManager.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Rewarder is IRewarder {
    using SafeERC20 for IERC20;

    uint256 public BASE = 1e18;
    address public steward;
    INexus nexus;

    event RewardNativeClaimed(
        address indexed solverAccount,
        address escrow,
        uint256 solverReward
    );

    constructor(address _steward) {
        steward = _steward;
    }

    modifier onlySteward() {
        require(msg.sender == steward, "only Steward");
        _;
    }

    function getTaxManager() public view returns (ITaxManager) {
        address taxManager = INexus(nexus).taxManager();
        return ITaxManager(taxManager);
    }

    /**
     * @dev Can be called by anyone
     * @param solverId Nft Id of the quest solver
     */
    function handleRewardNative(uint32 solverId) public payable {
        address escrow = msg.sender;
        require(escrow.balance == 0, "Escrow not empty");

        ITaxManager taxManager = getTaxManager();
        uint256 protocolTaxRate = taxManager.getProtocolTaxRate();
        uint256 taxRateDivisor = taxManager.getTaxBaseDivisor();

        uint256 rewardValue = msg.value;
        uint256 tax = (rewardValue * protocolTaxRate) / taxRateDivisor;
        require(tax <= rewardValue);
        uint256 solverReward = rewardValue - tax;
        address solverHandler = nexus.getHandler(solverId);
        emit RewardNativeClaimed(solverHandler, escrow, solverReward);

        address solver = IReferralHandler(solverHandler).owner();

        rewardReferrers(solverHandler, tax, taxRateDivisor);

        (bool success, ) = payable(solver).call{value: solverReward}("");
        require(success, "Solver reward pay error;");
    }

    /**
     * @dev Can be called by anyone
     * @param solverId Nft Id of the quest solver
     * @param token Address of the payment token contract
     * @param amount Amount of the payment in token (with decimals)
     */
    function handleRewardToken(
        address token,
        uint32 solverId,
        uint256 amount
    ) external override {}

    /**
     *
     * @param seekerId Nft Id of the quest seeker
     * @param solverId Nft Id of the quest solver
     * @param solverShare % of the reward allocated to solver
     */
    function proccessResolutionNative(
        uint32 seekerId,
        uint32 solverId,
        uint8 solverShare
    ) external payable override {}

    function proccessResolutionToken(
        uint32 seekerId,
        uint32 solverId,
        uint8 solverShare,
        address token
    ) external override {}

    // function handleSolverTax(
    //     address handler,
    //     uint256 balance,
    //     uint256 protocolTaxRate,
    //     uint256 taxDivisor
    // ) internal {
    //     address owner = IReferralHandler(handler).ownedBy();
    //     ITaxManager taxManager = getTaxManager();
    //     uint256 selfTaxRate = taxManager.getSelfTaxRate();
    //     // uint256 taxedAmountReward = balance * selfTaxRate / divisor;
    //     // uint256 protocolTaxed = taxedAmountReward * protocolTaxRate / divisor;
    //     uint256 reward = 0;//taxedAmountReward - protocolTaxed;

    //     IReferralHandler(handler).notifyNexus(reward, block.timestamp); // change to notify
    // }

    // function handlePayment(
    //     address handler,
    //     uint256 taxRate,
    //     uint256 protocolTaxRate,
    //     uint256 divisor
    // ) internal {
    //     ITaxManager taxManager = getTaxManager(nexus);
    //     uint256 taxedAmountReward = balance * taxRate / divisor;
    //     uint256 protocolTaxed = taxedAmountReward * protocolTaxRate /divisor;
    //     uint256 reward = taxedAmountReward - protocolTaxed;
    //     address referrer = IReferralHandler(handler).referredBy();
    // }

    function rewardReferrers(
        address handler,
        uint256 taxValue,
        uint256 taxDivisor
    ) internal {
        ITaxManager taxManager = getTaxManager();
        address[5] memory referrals; // Used to store above referrals, saving variable space
        uint256[5] memory rewards;
        

        uint256 leftTax = taxValue;

        referrals[1] = IReferralHandler(handler).referredBy();
        if (referrals[1] != address(0)) {
            // Block Scoping to reduce local Variables spillage
            {
                uint8 firstTier = IReferralHandler(referrals[1]).getTier();
                uint256 firstRewardRate = taxManager.getReferralRate(
                    1,
                    firstTier
                );

                rewards[1] = (taxValue * firstRewardRate) / taxDivisor;
                leftTax -= rewards[1];
            }
            referrals[2] = IReferralHandler(referrals[1]).referredBy();
            if (referrals[2] != address(0)) {
                // Block Scoping to reduce local Variables spillage
                {
                    uint8 secondTier = IReferralHandler(referrals[2]).getTier();
                    uint256 secondRewardRate = taxManager.getReferralRate(
                        2,
                        secondTier
                    );

                    rewards[2] = (secondRewardRate * taxValue) / taxDivisor;
                    leftTax -= rewards[2];
                }
                referrals[3] = IReferralHandler(referrals[2]).referredBy();
                if (referrals[3] != address(0)) {
                    // Block Scoping to reduce local Variables spillage
                    {
                        uint8 thirdTier = IReferralHandler(referrals[3])
                            .getTier();
                        uint256 thirdRewardRate = taxManager.getReferralRate(
                            3,
                            thirdTier
                        );
                        rewards[3] = (taxValue * thirdRewardRate) / taxDivisor;
                        leftTax -= rewards[3];
                    }
                    referrals[4] = IReferralHandler(referrals[3]).referredBy();
                    if (referrals[4] != address(0)) {
                        // Block Scoping to reduce local Variables spillage
                        {
                            uint8 fourthTier = IReferralHandler(referrals[4])
                                .getTier();
                            uint256 fourthRewardRate = taxManager
                                .getReferralRate(4, fourthTier);
                            rewards[4] =
                                ((taxValue) * fourthRewardRate) /
                                taxDivisor;
                            leftTax -= rewards[4];
                        }
                    }
                }
            }
        }

        // Pay out the Refferal rewards
        for (uint8 i = 0; i < 5; ++i) {
            uint256 reward = rewards[i];
            rewards[i] = 0;
            (bool success, ) = payable(referrals[i]).call{value: reward}("");
            require(success, "Referral rewards pay error;");
        }
        // {
        //     uint256 rewardTaxRate = taxManager.getRewardPoolRate();
        // }
        // Dev Allocation & // Revenue Allocation
        {
            address revenuePool = taxManager.getRevenuePool();
            (bool success, ) = payable(revenuePool).call{value: leftTax}("");
            require(success, "Revenue pool pay error;");
        }
    }

    function recoverTokens(
        address _token,
        address benefactor
    ) public onlySteward {
        if (_token == address(0)) {
            (bool sent, ) = payable(benefactor).call{
                value: address(this).balance
            }("");
            require(sent, "Send error");
            return;
        }
        uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).transfer(benefactor, tokenBalance);
    }


}