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

    constructor(address _steward, address _nexus) {
        steward = _steward;
        nexus = INexus(_nexus);
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
    // TODO: Currently missing the solver tax, only has protocol tax
    function handleRewardNative(uint32 solverId) public payable {
        address escrow = msg.sender;

        require(escrow.balance == 0, "Escrow not empty");

        ITaxManager taxManager = getTaxManager();
        uint256 protocolTaxRate = taxManager.protocolTaxRate();
        uint256 taxRateDivisor = taxManager.taxBaseDivisor();

        uint256 rewardValue = msg.value;
        uint256 tax = (rewardValue * protocolTaxRate) / taxRateDivisor;

        require(tax <= rewardValue, "Invalid tax");

        uint256 solverReward = rewardValue - tax;
        address solverHandler = nexus.getHandler(solverId);

        emit RewardNativeClaimed(solverHandler, escrow, solverReward);

        address solver = IReferralHandler(solverHandler).owner();

        rewardReferrers(solverHandler, tax, taxRateDivisor, address(0));

        _processPayment(solver, address(0), solverReward);
    }

    /**
     * @dev Can be called by anyone
     * @param solverId Nft Id of the quest solver
     * @param token Address of the payment token contract
     * @param amount Amount of the payment in token (with decimals)
     */
    // TODO: Currently missing the solver tax, only has protocol tax
    function handleRewardToken(
        address token,
        uint32 solverId,
        uint256 amount
    ) external {        
        uint256 currentBalance = IERC20(token).balanceOf(address(this));

        IERC20(token).transferFrom(msg.sender, address(this), amount);

        require(
            IERC20(token).balanceOf(address(this)) == currentBalance + amount,
            "Invalid token transfer"
        );

        ITaxManager taxManager = getTaxManager();
        uint256 protocolTaxRate = taxManager.protocolTaxRate();
        uint256 taxRateDivisor = taxManager.taxBaseDivisor();

        uint256 rewardValue = amount;
        uint256 tax = (rewardValue * protocolTaxRate) / taxRateDivisor;

        require(tax <= rewardValue, "Invalid tax");
        
        uint256 solverReward = rewardValue - tax;
        address solverHandler = nexus.getHandler(solverId);
        
        emit RewardNativeClaimed(solverHandler, msg.sender, solverReward);


        {
            address solver = IReferralHandler(solverHandler).owner();

            rewardReferrers(solverHandler, tax, taxRateDivisor, token);
            _processPayment(solver, token, solverReward);
        }
    }

    function calculateSeekerTax(uint256 _paymentAmount)
        public
        view
        returns (uint256 platformTax_, uint256 referralTax_)
    {
        ITaxManager taxManager = getTaxManager();
        (platformTax_, referralTax_) = _calculateSeekerTax(taxManager, _paymentAmount);
    }

    function _calculateSeekerTax(ITaxManager _taxManager, uint256 _paymentAmount) 
        internal 
        view
        returns 
    (
        uint256 platformTax_, 
        uint256 referralTax_
    ){
        ITaxManager.SeekerFees memory seekerFees = _taxManager.getSeekerFees();
        uint256 taxRateDivisor = _taxManager.taxBaseDivisor();

        referralTax_ = (_paymentAmount * seekerFees.referralRewards) /
            taxRateDivisor;

        platformTax_ = (_paymentAmount * seekerFees.platformRevenue) /
            taxRateDivisor;

        return (referralTax_, platformTax_);
    }

    function handleSeekerTaxNative(
        uint32 _solverId, 
        uint256 _platformTax, 
        uint256 _referralTax
    ) public payable {
        require(
            msg.value == _platformTax + _referralTax,
            "Insufficient tax amount"
        );

        ITaxManager taxManager = getTaxManager();
        uint256 taxRateDivisor = taxManager.taxBaseDivisor();

        // Seeker tax distribution

        // Platform tax distribution
        address platformTaxReceiver = taxManager.platformTaxReceiver();
        _processPayment(platformTaxReceiver, address(0), _platformTax);

        // Referral tax distribution
        address solverHandler = nexus.getHandler(_solverId);

        // Rewards referrers based on referral tax value from derived payment amount from Escrow
        rewardReferrers(solverHandler, _referralTax, taxRateDivisor, address(0));
    }

    function handleSeekerTaxToken(
        uint32 _solverId,
        uint256 _platformTax,
        uint256 _referralTax,
        address token
    ) public {

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));

        IERC20(token).transferFrom(msg.sender, address(this), _platformTax + _referralTax);

        uint256 balanceAfter = IERC20(token).balanceOf(address(this));

        require(
            balanceAfter == balanceBefore + _platformTax + _referralTax,
            "Insufficient tax amount"
        );

        ITaxManager taxManager = getTaxManager();
        uint256 taxRateDivisor = taxManager.taxBaseDivisor();

        // Seeker tax distribution

        // Platform tax distribution
        address platformTaxReceiver = taxManager.platformTaxReceiver();
        _processPayment(platformTaxReceiver, token, _platformTax);

        // Referral tax distribution
        address solverHandler = nexus.getHandler(_solverId);

        // Rewards referrers based on referral tax value from derived payment amount from Escrow
        rewardReferrers(solverHandler, _referralTax, taxRateDivisor, token);
    }

    function handleStartDisputeNative(uint256 paymentAmount) external payable {
        ITaxManager taxManager = getTaxManager();
        uint256 disputeDepositRate = taxManager.disputeDepositRate();
        uint256 baseDivisor = taxManager.taxBaseDivisor();
        uint256 deposit = msg.value;
        require(deposit == ((paymentAmount * baseDivisor) / disputeDepositRate), "Wrong dispute deposit");
        address disputeTreasury = taxManager.disputeFeesTreasury();
        _processPayment(disputeTreasury, address(0), deposit);
    }

    function handleStartDisputeToken(uint256 paymentAmount) external payable {
        // ITaxManager taxManager = getTaxManager();
        // uint256 disputeDepositRate = taxManager.disputeDepositRate();
        // uint256 baseDivisor = taxManager.taxBaseDivisor();
        // uint256 deposit = msg.value;
        // require(deposit == ((paymentAmount * baseDivisor) / disputeDepositRate), "Wrong dispute deposit");
        // address disputeTreasury = taxManager.disputeFeesTreasury();
        // _processPayment(disputeTreasury, address(0), deposit);
    }

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
    ) external payable override {
        uint256 payment = msg.value;

        // Solver at Fault
        if(solverShare == 0){
            
        }

    }

    function proccessResolutionToken(
        uint32 seekerId,
        uint32 solverId,
        uint8 solverShare,
        address token
    ) external override {

    }

    // Emit events for rewards distribution
    function rewardReferrers(
        address handler,
        uint256 taxValue,
        uint256 taxDivisor,
        address token
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

                    rewards[2] = (taxValue * secondRewardRate) / taxDivisor;
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
                            rewards[4] = (taxValue * fourthRewardRate) / taxDivisor;
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
            _processPayment(referrals[i], token, reward);
        }
        
        // Dev Allocation & // Revenue Allocation
        {
            address referralTaxReceiver = taxManager.referralTaxReceiver();
            _processPayment(referralTaxReceiver, token, leftTax);
        }
    }

    function recoverTokens(
        address _token,
        address benefactor
    ) external onlySteward {
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

    function _processPayment(address receiver, address _token, uint256 _amount) private {
        if (_token == address(0)) {
            (bool success, ) = payable(receiver).call{value: _amount}("");
            require(success, "Native token transfer error");
            return;
        } else {
            IERC20(_token).safeTransfer(receiver, _amount);
            return;
        }
    }
}