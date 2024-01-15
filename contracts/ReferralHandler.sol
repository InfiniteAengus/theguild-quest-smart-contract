// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IProfileNFT.sol";
import "./interfaces/IReferralHandler.sol";
import "./interfaces/ITierManager.sol";
import "./interfaces/ITaxManager.sol";
import "./interfaces/INexus.sol";
import "./interfaces/IRewarder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ReferralHandler is IReferralHandler {
    using SafeERC20 for IERC20;

    bool public initialized = false;

    IProfileNFT public NFT;
    uint32 public nftID;
    uint256 public mintTime;
    address public referredBy;  // maybe changed to referredBy address
    uint8 private tier;
    bool private canLevel;
    // NFT ids of those referred by this NFT and its subordinates
    address[] public firstLevelRefs;
    address[] public secondLevelRefs;
    address[] public thirdLevelRefs;
    address[] public fourthLevelRefs;
    INexus nexus;

    // bad practice of repeated tiers storing, expensive tier updates 
    // Mapping of the above Id list and their corresponding NFT tiers, tiers are public (tier + 1)
    mapping (address => uint8) public firstLevelTiers; 
    mapping (address => uint8) public secondLevelTiers;
    mapping (address => uint8) public thirdLevelTiers;
    mapping (address => uint8) public fourthLevelTiers;

    modifier onlyMaster() {
        require(msg.sender == nexus.master(), "only master");
        _;
    }

    modifier onlyProtocol() {
        require(msg.sender == nexus.master() || msg.sender == address(nexus), "only master or nexus");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == ownedBy(), "only profile owner");
        _;
    }

    modifier onlyNexus() {
        require(msg.sender == address(nexus), "only nexus");
        _;
    }

    modifier onlyRewarder() {
        require(msg.sender == nexus.rewarder());
        _;
    }

    function initialize(
        address _referredBy,
        address _nftAddress,
        uint32 _nftId
    ) public {
        require(!initialized, "Already initialized");
        initialized = true;
        nexus = INexus(msg.sender);
        referredBy = _referredBy;
        NFT = IProfileNFT(_nftAddress);
        nftID = _nftId;
        mintTime = block.timestamp;
        tier = 1; // Default tier is 1 instead of 0, since solidity 0 can also mean non-existant, all tiers on contract are + 1
        canLevel = true;
    }

    function setNexus(address account) public onlyMaster {
        nexus = INexus(account);
    }

    function ownedBy() public view returns (address) { // Returns the Owner of the NFT coupled with this handler
        return NFT.ownerOf(nftID);
    }

    function nftId() external view returns (uint256) { // Returns the address of the NFT coupled with this handler
        return nftID;
    }

    function getTier() public view returns (uint8) {
        return tier - 1;
    }

    function getTierManager() public view returns (ITierManager) {
        address tierManager = nexus.tierManager() ;
        return ITierManager(tierManager);
    }

    function getTaxManager() public view returns (ITaxManager) {
        address taxManager = nexus.taxManager() ;
        return ITaxManager(taxManager);
    }

    function changeEligibility(bool status) public onlyMaster {
        canLevel = status;
    }

    // function checkExistenceAndLevel(uint8 depth, address referred) view public returns (uint32 nftId) {
    //     // Checks for existence for the given address in the given depth of the tree
    //     // Returns 0 if it does not exist, else returns the NFT tier
    //     requirerefDepth <= 4 && depth >= 1, "Invalid depth");
    //     require(referred != address(0), "Invalid referred address");

    //     if refDepth == 1) {
    //         return firstLevelTiers[referralHandler];
    //     } else if refDepth == 2) {
    //         return secondLevelTiers[referralHandler];
    //     } else if refDepth == 3) {
    //         return thirdLevelTiers[referralHandler];
    //     } else if refDepth == 4) {
    //         return fourthLevelTiers[referralHandler];
    //     }
    //     return 0;
    // }

    function updateReferrersAbove(uint8 _tier) internal {
        address firstRef = referredBy;
        if(firstRef != address(0)) {
            IReferralHandler(firstRef).updateReferralTree(1, _tier);
            address secondRef = IReferralHandler(firstRef).referredBy();
            if(secondRef != address(0)) {
                IReferralHandler(secondRef).updateReferralTree(2, _tier);
                address thirdRef = IReferralHandler(secondRef).referredBy();
                if(thirdRef != address(0)) {
                    IReferralHandler(thirdRef).updateReferralTree(3, _tier);
                    address fourthRef = IReferralHandler(thirdRef).referredBy();
                    if(fourthRef != address(0))
                        IReferralHandler(fourthRef).updateReferralTree(4, _tier);
                }
            }
        }
    }

    /**
     * 
     * @param refDepth Number of layers between the referral and referee
     * @param referralHandler Address of the handler of referred person(referral)
     * @param _tier Tier of the referral Nft
     */
    function addToReferralTree(uint8 refDepth, address referralHandler, uint8 _tier) public onlyNexus { 
        require(refDepth <= 4 && refDepth >= 0, "Invalid depth");
        require(referralHandler != address(0), "Invalid referral address");
    
        if (refDepth == 1) {
            firstLevelRefs.push(referralHandler);
            firstLevelTiers[referralHandler] = _tier;
        } else if (refDepth == 2) {
            secondLevelRefs.push(referralHandler);
            secondLevelTiers[referralHandler] = _tier;
        } else if (refDepth == 3) {
            thirdLevelRefs.push(referralHandler);
            thirdLevelTiers[referralHandler] = _tier;
        } else if (refDepth == 4) {
            fourthLevelRefs.push(referralHandler);
            fourthLevelTiers[referralHandler] = _tier;
        }
    }

    function updateReferralTree(uint8 refDepth, uint8 _tier) external {  // msg.sender should be the handler reffered by this address
        require(refDepth <= 4 && refDepth >= 1, "Invalid depth");
        require(msg.sender != address(0), "Invalid referred address");

        if (refDepth == 1) {
            require(firstLevelTiers[msg.sender]!= 0, "Cannot update non-existant entry");
            firstLevelTiers[msg.sender] = _tier;
        } else if (refDepth == 2) {
            require(secondLevelTiers[msg.sender]!= 0, "Cannot update non-existant entry");
            secondLevelTiers[msg.sender] = _tier;
        } else if (refDepth == 3) {
            require(thirdLevelTiers[msg.sender]!= 0, "Cannot update non-existant entry");
            thirdLevelTiers[msg.sender] = _tier;
        } else if (refDepth == 4) {
            require(fourthLevelTiers[msg.sender]!= 0, "Cannot update non-existant entry");
            fourthLevelTiers[msg.sender] = _tier;
        }
    }
    /**
     * @notice Returns number of referrals for each tier
     * @dev Returns array of counts for Tiers 1 to 5 under the user
     */
    function getTierCounts() public view returns (uint32[5] memory) { 
        uint32[5] memory tierCounts; // Tiers can be 0 to 4 (Stored 1 to 5 in Handlers)
        for (uint32 i = 0; i < firstLevelRefs.length; ++i) {
            address referral = firstLevelRefs[i];
            uint8 _tier = firstLevelTiers[referral] - 1; 
            tierCounts[_tier]++;
        }
        for (uint32 i = 0; i < secondLevelRefs.length; ++i) {
            address referral = secondLevelRefs[i];
            uint8 _tier = secondLevelTiers[referral] - 1;
            tierCounts[_tier]++;
        }
        for (uint32 i = 0; i < thirdLevelRefs.length; ++i) {
            address referral = thirdLevelRefs[i];
            uint8 _tier = thirdLevelTiers[referral] - 1;
            tierCounts[_tier]++;
        }
        for (uint32 i = 0; i < fourthLevelRefs.length; ++i) {
            address referral = fourthLevelRefs[i];
            uint8 _tier = fourthLevelTiers[referral] - 1;
            tierCounts[_tier]++;
        }
        return tierCounts;
    }

    function setTier(uint8 _tier) public onlyProtocol {
        require( _tier >= 0 && _tier <= 4, "Invalid Tier");
        uint8 oldTier = getTier(); // For events
        tier = _tier + 1; // Adding the default +1 offset stored in handlers
        updateReferrersAbove(tier);
        string memory tokenURI = getTierManager().getTokenURI(getTier());
        NFT.changeURI(nftID, tokenURI);
        nexus.notifyTierUpdate(oldTier, getTier());
    }

    function tierUp() external returns (bool) {  // not used anywhere, changed to external
    require(getTier() < 4 &&  canLevel == true, "Can't increase the tier");
    require(getTierManager().checkTierUpgrade(getTierCounts()), "Tier upgrade condition not met");
            uint8 oldTier = getTier(); // For events
            tier = tier + 1;
            updateReferrersAbove(tier);
            string memory tokenURI = getTierManager().getTokenURI(getTier());
            NFT.changeURI(nftID, tokenURI);
            nexus.notifyTierUpdate(oldTier, getTier());
            return true;
    }

// should be changed to notify 
    function alertFactory(uint256 reward, uint256 timestamp) external onlyRewarder { 
        nexus.notifySelfTaxClaimed(reward, timestamp);
    }

    function handleClaimTaxAndDistribution(address owner, uint256 currentClaimable, uint256 protocolTaxRate, uint256 taxDivisor) internal {
        ITaxManager taxManager =  getTaxManager();
        uint256 leftOverTaxRate = protocolTaxRate;
        address _handler = address(this);
        address [5] memory referral; // Used to store above referrals, saving variable space
        // User Distribution
        // Block Scoping to reduce local Variables spillage (leak)
        { 
        uint256 taxedAmount = currentClaimable * protocolTaxRate / taxDivisor;
        uint256 userReward = currentClaimable - taxedAmount;
        // token.transferForRewards(owner, userReward);
        nexus.notifyReferralTaxClaimed(userReward, block.timestamp);
        }
        {
        uint256 perpetualTaxRate = taxManager.getPerpetualPoolTaxRate();
        uint256 perpetualAmount = currentClaimable * perpetualTaxRate / taxDivisor;
        address perpetualPool = taxManager.getPerpetualPool();
        // IERC20(address(token)).safeApprove(perpetualPool, 0);
        // IERC20(address(token)).safeApprove(perpetualPool, perpetualAmount);
        // IPoolEscrow(perpetualPool).notifySecondaryTokens(perpetualAmount);
        leftOverTaxRate = leftOverTaxRate - perpetualTaxRate;
        }
        // Block Scoping to reduce local Variables spillage
        {
        uint256 protocolMaintenanceRate = taxManager.getMaintenanceTaxRate();
        uint256 protocolMaintenanceAmount = currentClaimable * protocolMaintenanceRate / taxDivisor;
        address maintenancePool = taxManager.getMaintenancePool();
        // token.transferForRewards(maintenancePool, protocolMaintenanceAmount);
        leftOverTaxRate = leftOverTaxRate - protocolMaintenanceRate; // Minted above
        }
        referral[1]  = IReferralHandler(_handler).referredBy();
        if(referral[1] != address(0)) {
            // Block Scoping to reduce local Variables spillage
            {
            // Rightup Reward
            uint256 rightUpRate = taxManager.getRightUpTaxRate();
            // uint256 rightUpAmount = currentClaimable.mul(rightUpRate).div(taxDivisor);
            // token.transferForRewards(referral[1], rightUpAmount);
            leftOverTaxRate = leftOverTaxRate - rightUpRate;
            // Normal Referral Reward
            uint256 firstTier = IReferralHandler(referral[1]).getTier();
            uint256 firstRewardRate = taxManager.getReferralRate(1, firstTier);
            uint256 firstReward = currentClaimable * firstRewardRate / taxDivisor;
            // token.transferForRewards(referral[1], firstReward);
            leftOverTaxRate = leftOverTaxRate - firstRewardRate;
            }
            referral[2] = IReferralHandler(referral[1]).referredBy();
            if(referral[2] != address(0)) {
                // Block Scoping to reduce local Variables spillage
                {
                uint256 secondTier = IReferralHandler(referral[2]).getTier();
                uint256 secondRewardRate = taxManager.getReferralRate(2, secondTier);
                uint256 secondReward = currentClaimable * secondRewardRate / taxDivisor;
                // token.transferForRewards(referral[2], secondReward);
                leftOverTaxRate = leftOverTaxRate - secondRewardRate;
                }
                referral[3] = IReferralHandler(referral[2]).referredBy();
                if(referral[3] != address(0)) {
                // Block Scoping to reduce local Variables spillage
                    {
                    uint256 thirdTier = IReferralHandler(referral[3]).getTier();
                    uint256 thirdRewardRate = taxManager.getReferralRate(3, thirdTier);
                    uint256 thirdReward = currentClaimable * thirdRewardRate / taxDivisor;
                    // token.transferForRewards(referral[3], thirdReward);
                    leftOverTaxRate = leftOverTaxRate - thirdRewardRate;
                    }
                    referral[4] = IReferralHandler(referral[3]).referredBy();
                    if(referral[4] != address(0)) {
                        // Block Scoping to reduce local Variables spillage
                        {
                        uint256 fourthTier = IReferralHandler(referral[4]).getTier();
                        uint256 fourthRewardRate = taxManager.getReferralRate(4, fourthTier);
                        uint256 fourthReward = currentClaimable * fourthRewardRate / taxDivisor;
                        // token.transferForRewards(referral[4], fourthReward);
                        leftOverTaxRate = leftOverTaxRate - fourthRewardRate;
                        }
                    }
                }
            }
        }
        // Reward Allocation
        {
        uint256 rewardTaxRate = taxManager.getRewardPoolRate();
        uint256 rewardPoolAmount = currentClaimable * rewardTaxRate / taxDivisor;
        address rewardPool = taxManager.getRewardAllocationPool();
        // token.transferForRewards(rewardPool, rewardPoolAmount);
        leftOverTaxRate = leftOverTaxRate - rewardTaxRate;
        }
        // Dev Allocation & // Revenue Allocation
        {
        uint256 leftOverTax = currentClaimable * leftOverTaxRate / taxDivisor;
        address devPool = taxManager.getDevPool();
        address revenuePool = taxManager.getRevenuePool();
        // token.transferForRewards(devPool, leftOverTax.div(2));
        // token.transferForRewards(revenuePool, leftOverTax.div(2));
        }
    }
}