// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.17;

import "./interfaces/IReferralHandler.sol";
import "./interfaces/INexus.sol";
import "./interfaces/ITaxManager.sol";
import "./TaxCalculator.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IRewarder.sol";

/**
 * @title Rewarder contract
 * @author @cosmodude
 * @notice Controls the referral and quest reward proccess
 * @dev Processes native and ERC20 tokens 
 */
contract Rewarder is IRewarder, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public BASE = 1e18;
    address public steward;
    INexus public nexus;

    event RewardNativeClaimed(
        address indexed solverAccount,
        address escrow,
        uint256 solverReward
    );

    event RewardTokenClaimed(
        address indexed solverAccount,
        address escrow,
        uint256 solverReward,
        address token
    );

    event SeekerTaxPaidNative(
        address indexed seekerAccount,
        address escrow,
        uint256 tax
    );

    event SeekerTaxPaidToken(
        address indexed seekerAccount,
        address escrow,
        uint256 tax,
        address token
    );

    event DisputeDepositPaidNative(
        address escrow,
        uint256 deposit
    );

    event DisputeDepositPaidToken(
        address escrow,
        uint256 deposit,
        address token
    );

    event ReferralRewardReceived(
        address account,
        uint256 amount,
        address token
    );

    constructor(address _steward, address _nexus) {
        steward = _steward;
        nexus = INexus(_nexus);
    }

    modifier onlySteward() {
        require(msg.sender == steward, "only Steward");
        _;
    }

    function pause() external onlySteward {
        _pause();
    }

    function unpause() external onlySteward {
        _unpause();
    }


    function getTaxManager() public view whenNotPaused returns (ITaxManager) {
        address taxManager = INexus(nexus).taxManager();
        return ITaxManager(taxManager);
    }

    /**
     * @dev Can be called by anyone
     * @param solverId Nft Id of the quest solver
     */
    function handleRewardNative(uint32 solverId, uint256 amount) external payable whenNotPaused nonReentrant {
        _handleRewardNative(solverId, amount);
    }

    function _handleRewardNative(uint32 _solverId, uint256 _amount) private {
        address escrow = msg.sender;

        // griefer can send dust values of paymentAmount and make solver unable to claim
        require(escrow.balance == 0, "Escrow not empty");

        ITaxManager taxManager = getTaxManager();
        uint256 taxRateDivisor = taxManager.taxBaseDivisor();

        uint256 rewardValue;
        // in case, want to process less than msg.value 
        if(_amount > 1) { // for gas optimisation (0 comparison is more expensive)
            
            require(
                _amount <= msg.value, 
                "handleRewardNative: amount bigger then msg.value"
            );

            rewardValue = _amount;
        } else { 
            rewardValue = msg.value;
        }

        (uint256 referralTax, uint256 platformTax, uint256 platformTreasuryTax) = calculateSolverTax(rewardValue);

        uint256 totalTax = referralTax + platformTax + platformTreasuryTax;

        require(totalTax <= rewardValue, "Invalid tax");

        uint256 solverReward = rewardValue - totalTax;
        address solverHandler = nexus.getHandler(_solverId);

        address solver = IReferralHandler(solverHandler).owner();

        emit RewardNativeClaimed(solverHandler, escrow, solverReward);

        {
            // Transfers reward to solver after deducting tax amount
            _processPayment(solver, address(0), solverReward);

            // Solver tax distribution //

            // Referral tax distribution
            // Rewards referrers based on referral tax value from derived payment amount from Escrow
            rewardReferrers(solverHandler, referralTax, taxRateDivisor, address(0));
        
            // Platform tax distribution
            address platformTaxReceiver = taxManager.platformRevenuePool();
            _processPayment(platformTaxReceiver, address(0), platformTax);

            // Platform treasury tax distribution
            address platformTreasuryReceiver = taxManager.platformTreasury();
            _processPayment(platformTreasuryReceiver, address(0), platformTreasuryTax);
        }
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
    ) public whenNotPaused {        
        uint256 currentBalance = IERC20(token).balanceOf(address(this));

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        require(
            IERC20(token).balanceOf(address(this)) == currentBalance + amount,
            "Invalid token transfer"
        );

        ITaxManager taxManager = getTaxManager();
        address solverHandler = nexus.getHandler(solverId);

        _handleRewardTokenPayout(taxManager, token, solverHandler, amount);
    }

    function _handleRewardTokenPayout(
        ITaxManager _taxManager, 
        address _token, 
        address _solverHandler, 
        uint256 _amount
    ) internal {
        uint256 taxRateDivisor = _taxManager.taxBaseDivisor();
        
        (uint256 referralTax, uint256 platformTax, uint256 platformTreasuryTax) = calculateSolverTax(_amount);

        uint256 totalTax = referralTax + platformTax + platformTreasuryTax;

        require(totalTax <= _amount, "Invalid tax");
        
        emit RewardTokenClaimed(_solverHandler, msg.sender, _amount - totalTax, _token);

        {

            // Transfers reward to solver after deducting tax amount
            _processPayment(
                IReferralHandler(_solverHandler).owner(), 
                _token, 
                _amount - totalTax
            );

            // Solver tax distribution //

            // Referral tax distribution
            // Rewards referrers based on referral tax value from derived payment amount from Escrow
            rewardReferrers(_solverHandler, referralTax, taxRateDivisor, _token);

            // Platform tax distribution
            _processPayment(_taxManager.platformRevenuePool(), _token, platformTax);

            // Platform treasury tax distribution
            _processPayment(_taxManager.platformTreasury(), _token, platformTreasuryTax);
        }
    } 

    function calculateSeekerTax(uint256 _paymentAmount)
        public
        view
        returns (uint256 platformTax_, uint256 referralTax_)
    {
        ITaxManager taxManager = getTaxManager();
        (platformTax_, referralTax_) = TaxCalculator._calculateSeekerTax(taxManager, _paymentAmount);
    }

    function calculateSolverTax(uint256 _paymentAmount)
        public
        view
        returns (
            uint256 platformTax_,
            uint256 referralTax_,
            uint256 platformTreasuryTax_
        )
    {
        ITaxManager taxManager = getTaxManager();
        (platformTax_, referralTax_, platformTreasuryTax_) = TaxCalculator._calculateSolverTax
        (
            taxManager,
            _paymentAmount
        );
    }

    function handleSeekerTaxNative(
        uint32 _seekerId,
        uint256 _platformTax, 
        uint256 _referralTax
    ) public payable whenNotPaused nonReentrant {
        require(
            msg.value == _platformTax + _referralTax,
            "Insufficient tax amount"
        );

        ITaxManager taxManager = getTaxManager();

        uint256 taxRateDivisor = taxManager.taxBaseDivisor();
        address seekerHandler = nexus.getHandler(_seekerId);

        emit SeekerTaxPaidNative(seekerHandler, msg.sender,  _platformTax + _referralTax);

        // Seeker tax distribution //

        // Platform tax distribution
        address platformTaxReceiver = taxManager.platformRevenuePool();
        _processPayment(platformTaxReceiver, address(0), _platformTax);

        // Referral tax distribution
        // Rewards referrers based on referral tax value from derived payment amount from Escrow
        rewardReferrers(seekerHandler, _referralTax, taxRateDivisor, address(0));
    }

    function handleSeekerTaxToken(
        uint32 _seekerId,
        uint256 _platformTax,
        uint256 _referralTax,
        address token
    ) public whenNotPaused {

        uint256 balanceBefore = IERC20(token).balanceOf(address(this));

        IERC20(token).safeTransferFrom(msg.sender, address(this), _platformTax + _referralTax);

        uint256 balanceAfter = IERC20(token).balanceOf(address(this));

        require(
            balanceAfter == balanceBefore + _platformTax + _referralTax,
            "Insufficient tax amount"
        );

        ITaxManager taxManager = getTaxManager();

        uint256 taxRateDivisor = taxManager.taxBaseDivisor();
        address seekerHandler = nexus.getHandler(_seekerId);

        emit SeekerTaxPaidToken(seekerHandler, msg.sender,  _platformTax + _referralTax, token);
        // Seeker tax distribution

        // Platform tax distribution
        address platformTaxReceiver = taxManager.platformRevenuePool();
        _processPayment(platformTaxReceiver, token, _platformTax);

        // Referral tax distribution
        // Rewards referrers based on referral tax value from derived payment amount from Escrow
        rewardReferrers(seekerHandler, _referralTax, taxRateDivisor, token);
    }

    function handleStartDisputeNative(uint256 paymentAmount) external payable whenNotPaused nonReentrant {
        ITaxManager taxManager = getTaxManager();
        uint256 disputeDepositRate = taxManager.disputeDepositRate();
        uint256 baseDivisor = taxManager.taxBaseDivisor();

        uint256 deposit = msg.value;

        // NOTE: will not be able to start dispute if depositRate is 0, and will revert
        require(deposit == ((paymentAmount * disputeDepositRate) / baseDivisor), "Wrong dispute deposit");
        
        address disputeTreasury = taxManager.disputeFeesTreasury();
        
        emit DisputeDepositPaidNative(msg.sender, deposit);

        _processPayment(disputeTreasury, address(0), deposit);
    }

    function handleStartDisputeToken(uint256 paymentAmount, address token, uint32 seekerId) external whenNotPaused {
        ITaxManager taxManager = getTaxManager();
        uint256 disputeDepositRate = taxManager.disputeDepositRate();
        uint256 baseDivisor = taxManager.taxBaseDivisor();

        // NOTE: will transfer 0 if depositRate is 0, will not revert
        uint256 deposit = ((paymentAmount * disputeDepositRate) / baseDivisor);

        address seekerHandler = nexus.getHandler(seekerId);
        address seeker = IReferralHandler(seekerHandler).owner();

        IERC20(token).safeTransferFrom(seeker, address(this), deposit);

        address disputeTreasury = taxManager.disputeFeesTreasury();

        emit DisputeDepositPaidToken(msg.sender, deposit, token);

        _processPayment(disputeTreasury, token, deposit);
    }

    /**
     *
     * @param seekerId Nft Id of the quest seeker
     * @param solverId Nft Id of the quest solver
     * @param solverShare % of the reward allocated to solver
     */
    function processResolutionNative(
        uint32 seekerId,
        uint32 solverId,
        uint32 solverShare
    ) external payable override whenNotPaused nonReentrant {
        uint256 payment = msg.value;

        address seekerHandler = nexus.getHandler(seekerId);
        address seeker = IReferralHandler(seekerHandler).owner();

        // Solver at Fault
        if(solverShare == 0){
            _processPayment(seeker, address(0), payment);
        }
        // Seeker at Fault
        else if(solverShare == 10000){
            // Tax handled through the handleRewardNative function
            _handleRewardNative(solverId, 0);
        } 
        // Arbitrary distribution
        else {
            ITaxManager taxManager = getTaxManager();
            uint256 disputeDepositRate = taxManager.disputeDepositRate();
            uint256 baseDivisor = taxManager.taxBaseDivisor();

            uint256 deposit = ((payment * disputeDepositRate) / baseDivisor);

            // both pay half of the dispute deposit 
            // uint256 seekerPayment = (payment * ((baseDivisor + (disputeDepositRate / 2)) + ((100 - solverShare) * baseDivisor) / 100)) / baseDivisor;
            uint256 seekerPayment = ((payment * (baseDivisor - solverShare)) / baseDivisor) + ((deposit * 5000) / baseDivisor);
            // uint256 solverPayment = (payment * ((baseDivisor - (disputeDepositRate / 2)) + (solverShare  * baseDivisor) / 100)) / baseDivisor;
            uint256 solverPayment = ((payment * solverShare) / baseDivisor) - ((deposit * 5000) / baseDivisor);

            // Sends to seeker
            _processPayment(seeker, address(0), seekerPayment);

            // Sends to solver
            // Tax handled through the handleRewardNative function
            _handleRewardNative(solverId, solverPayment);
        }
    }

    function processResolutionToken(
        uint32 seekerId,
        uint32 solverId,
        uint32 solverShare,
        address token,
        uint256 payment
    ) external override whenNotPaused {
        address seekerHandler = nexus.getHandler(seekerId);
        address seeker = IReferralHandler(seekerHandler).owner();

        address solverHandler = nexus.getHandler(solverId);

        uint256 currentBalance = IERC20(token).balanceOf(address(this));

        IERC20(token).safeTransferFrom(msg.sender, address(this), payment);

        require(
            IERC20(token).balanceOf(address(this)) == currentBalance + payment,
            "Invalid token transfer"
        );

        ITaxManager taxManager = getTaxManager();

        // Solver at Fault
        if(solverShare == 0){
            _processPayment(seeker, token, payment);
        }
        // Seeker at Fault
        else if(solverShare == 10000){
            // Tax handled through the handleRewardToken function
            _handleRewardTokenPayout(taxManager, token, solverHandler, payment);            
        } 
        // Arbitrary distribution
        else {
            uint256 baseDivisor = taxManager.taxBaseDivisor();
            uint256 disputeDepositRate = taxManager.disputeDepositRate();

            uint256 deposit = ((payment * disputeDepositRate) / baseDivisor);

            // uint256 seekerPayment = (payment * ((baseDivisor + (disputeDepositRate / 2)) + ((100 - solverShare) * baseDivisor) / 100)) / baseDivisor;
            uint256 seekerPayment = ((payment * (baseDivisor - solverShare)) / baseDivisor) + ((deposit * 5000) / baseDivisor);
            // uint256 rewardValue = (payment * ((baseDivisor - (disputeDepositRate / 2)) + (solverShare  * baseDivisor) / 100)) / baseDivisor;
            uint256 solverPayment = ((payment * solverShare) / baseDivisor) - ((deposit * 5000) / baseDivisor);
            
            // Sends to seeker
            _processPayment(seeker, token, seekerPayment);
            
            // Sends to solver
            // Tax handled through the _handleRewardTokenPayout function
            _handleRewardTokenPayout(taxManager, token, solverHandler, solverPayment);            
        }
    }

    // Emit events for rewards distribution
    function rewardReferrers(
        address handler,
        uint256 taxValue,
        uint256 taxDivisor,
        address token
    ) internal {
        ITaxManager taxManager = getTaxManager();
        address[4] memory referrals; // Used to store above referrals, saving variable space
        uint256[4] memory rewards;
        
        uint256 leftTax = taxValue;

        referrals[0] = IReferralHandler(handler).referredBy();

        if (referrals[0] != address(0)) {
            // Block Scoping to reduce local Variables spillage
            {
                uint8 firstTier = IReferralHandler(referrals[0]).getTier();
                uint256 firstRewardRate = taxManager.getReferralRate(
                    1,
                    firstTier
                );

                rewards[0] = (taxValue * firstRewardRate) / taxDivisor;
                leftTax -= rewards[0];
            }

            referrals[1] = IReferralHandler(referrals[0]).referredBy();

            if (referrals[1] != address(0)) {
                // Block Scoping to reduce local Variables spillage
                {
                    uint8 secondTier = IReferralHandler(referrals[1]).getTier();
                    uint256 secondRewardRate = taxManager.getReferralRate(
                        2,
                        secondTier
                    );

                    rewards[1] = (taxValue * secondRewardRate) / taxDivisor;
                    leftTax -= rewards[1];
                }

                referrals[2] = IReferralHandler(referrals[1]).referredBy();

                if (referrals[2] != address(0)) {
                    // Block Scoping to reduce local Variables spillage
                    {
                        uint8 thirdTier = IReferralHandler(referrals[2])
                            .getTier();
                        uint256 thirdRewardRate = taxManager.getReferralRate(
                            3,
                            thirdTier
                        );
                        rewards[2] = (taxValue * thirdRewardRate) / taxDivisor;
                        leftTax -= rewards[2];
                    }

                    referrals[3] = IReferralHandler(referrals[2]).referredBy();

                    if (referrals[3] != address(0)) {
                        // Block Scoping to reduce local Variables spillage
                        {
                            uint8 fourthTier = IReferralHandler(referrals[3])
                                .getTier();
                            uint256 fourthRewardRate = taxManager
                                .getReferralRate(4, fourthTier);
                            rewards[3] = (taxValue * fourthRewardRate) / taxDivisor;
                            leftTax -= rewards[3];
                        }
                    }
                }
            }
        }

        // Pay out the Refferal rewards
        for (uint8 i = 0; i < 4; ++i) {
            uint256 reward = rewards[i];
            rewards[i] = 0;

            if (referrals[i] != address(0)) {
                emit ReferralRewardReceived(referrals[i], reward, token);
                _processPayment(referrals[i], token, reward);
            }
        }

        // Leftover Tax allocation
        {
            address referralTaxReceiver = taxManager.referralTaxTreasury();
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

    function _processPayment(address _receiver, address _token, uint256 _amount) private {
        if (_token == address(0)) {
            (bool success, ) = payable(_receiver).call{value: _amount}("");
            require(success, "Native token transfer error");
            return;
        } else {
            IERC20(_token).safeTransfer(_receiver, _amount);
            return;
        }
    }
}