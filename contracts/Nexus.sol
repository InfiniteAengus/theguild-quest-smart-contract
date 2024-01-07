// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IProfileNFT.sol";
import "./interfaces/IReferralHandler.sol";
import "./interfaces/INexus.sol";  
//import "./interfaces/IRebaserNew.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";

contract Nexus is INexus {
    address public master;
    address public tierManager;
    address public taxManager;
    //address public rebaser;
    //address public token;
    address public handlerImplementation;
    address public depositBoxImplementation;
    address public rewarder;
    mapping(uint256 => address) NFTToHandler;
    mapping(address => uint256) HandlerToNFT;
    //mapping(uint256 => address) NFTToDepositBox; // should be changed to account, not needed
    mapping(address => bool) handlerStorage;
    IProfileNFT public NFT;

    event NewAdmin(address oldAdmin, address newAdmin);
    event NewURI(string OldTokenURI, string NewTokenURI);
    event NewRewarder(address oldRewarder, address newRewarder);
    event NewNFT(address oldNFT, address NewNFT);
    event NewRebaser(address oldRebaser, address newRebaser);
    event NewToken(address oldToken, address newToken);
    event NewTaxManager(address oldTaxManager, address newTaxManager);
    event NewTierManager(address oldTierManager, address newTierManager);

    event NewIssuance(uint256 id, address handler, address depositBox);
    event LevelChange(address handler, uint256 oldTier, uint256 newTier);
    event SelfTaxClaimed(
        address indexed handler,
        uint256 amount,
        uint256 timestamp
    );
    event RewardClaimed(
        address indexed handler,
        uint256 amount,
        uint256 timestamp
    );
    event DepositClaimed(
        address indexed handler,
        uint256 amount,
        uint256 timestamp
    );

    modifier onlyMaster() {
        require(msg.sender == master, "only admin");
        _;
    }

    constructor(
        address _handlerImplementation
    ) {
        master = msg.sender;
        handlerImplementation = _handlerImplementation;
    }
    
    // should be deprecated/ changed to account
    function getHandlerForProfile(address user) external view returns (address) {
        uint256 tokenID = NFT.belongsTo(user);
        if (tokenID != 0)
            // Incase user holds no NFT
            return NFTToHandler[tokenID];
        return address(0);
    }

    function getHandler(uint256 tokenID) external view returns (address) {
        return NFTToHandler[tokenID];
    }

    function isHandler(address _handler) public view returns (bool) {
        return handlerStorage[_handler];
    }

    function addHandler(address _handler) public onlyMaster {
        // For adding handlers for Staking pools and Protocol owned Pools
        handlerStorage[_handler] = true;
    }

    function notifyLevelUpdate(uint256 oldTier, uint256 newTier) external {
        // All the handlers notify the Factory incase there is a change in levels
        require(isHandler(msg.sender) == true);
        emit LevelChange(msg.sender, oldTier, newTier);
    }

    function notifySelfTaxClaimed(uint256 amount, uint256 timestamp) external {
        // All the handlers notify the Factory when they claim self tax
        require(isHandler(msg.sender) == true);
        emit SelfTaxClaimed(msg.sender, amount, timestamp);
    }

    function notifyReferralTaxClaimed(
        uint256 amount,
        uint256 timestamp
    ) external {
        // All the handlers notify the Factory when the claim referral Reward
        require(isHandler(msg.sender) == true);
        emit RewardClaimed(msg.sender, amount, timestamp);
    }

    function setAdmin(address account) public onlyMaster {
        address oldAdmin = master;
        master = account;
        emit NewAdmin(oldAdmin, account);
    }

    function setRewarder(address _rewarder) public onlyMaster {
        address oldRewarder = rewarder;
        rewarder = _rewarder;
        emit NewRewarder(oldRewarder, _rewarder);
    }

    function setNFT(address _NFT) external onlyMaster {
        address oldNFT = address(NFT);
        NFT = IProfileNFT(_NFT); // Set address of the NFT contract
        emit NewNFT(oldNFT, _NFT);
    }

    function setTaxManager(address _taxManager) external onlyMaster {
        address oldManager = taxManager;
        taxManager = _taxManager;
        emit NewTaxManager(oldManager, _taxManager);
    }

    function setTierManager(address _tierManager) external onlyMaster {
        address oldManager = tierManager;
        tierManager = _tierManager;
        emit NewTierManager(oldManager, _tierManager);
    }

    function mint(uint32 reffererId) external returns (address) {
        //Referrer is address of refferal handler of the guy above
        uint256 nftId = NFT.issueNFT(msg.sender, "hjg"); // token URI should be updated
        IReferralHandler handler = IReferralHandler(
            Clones.clone(handlerImplementation)
        );
        require(nftId!= reffererId, "Cannot be its own referrer");
        require(
            reffererId < nftId || reffererId == 0,
            "Referrer should be a valid handler"
        );
        //handler.initialize(master, referrerId, address(NFT), nftID);

        // IDepositBox depositBox = IDepositBox(
        //     Clones.clone(depositBoxImplementation)
        // );
        //depositBox.initialize(address(handler), nftID, admin);
        // handler.setDepositBox(address(depositBox));
        NFTToHandler[nftId] = address(handler);
        HandlerToNFT[address(handler)] = nftId;
        handlerStorage[address(handler)] = true;
        //handlerStorage[address(depositBox)] = true; // Required to allow it fully transfer the collected rewards without limit
        addToReferrersAbove(1, address(handler));
        emit NewIssuance(nftId, address(handler), address(0));
        return address(handler);
    }

    //TODO: Refactor reuable code
    function mintToAddress(
        address referrer,
        address recipient,
        uint256 tier
    ) external onlyMaster returns (address) {
        //Referrer is address of NFT handler of the guy above
        uint256 nftID = NFT.issueNFT(recipient, "hhh");
        // uint256 epoch = IRebaser(rebaser).getPositiveEpochCount(); // The handlers need to only track positive rebases
        IReferralHandler handler = IReferralHandler(
            Clones.clone(handlerImplementation)
        );
        require(address(handler) != referrer, "Cannot be its own referrer");
        require(
            handlerStorage[referrer] == true || referrer == address(0),
            "Referrer should be a valid handler"
        );
        // handler.initialize(token, referrer, address(NFT), nftID);
        // if(claimedAt[recipient] == 0)
        //     claimedAt[recipient] = epoch;
    
        // depositBox.initialize(address(handler), nftID, token);
       
        NFTToHandler[nftID] = address(handler);
        HandlerToNFT[address(handler)] = nftID;
        handlerStorage[address(handler)] = true;
        // Required to allow it fully transfer the collected rewards without limit
        addToReferrersAbove(1, address(handler));
        handler.setTier(tier);
        emit NewIssuance(nftID, address(handler), address(0));
        return address(handler);
    }

    function addToReferrersAbove(uint8 _tier, address _handler) internal {
        // maybe rewritten better
        if (_handler != address(0)) {
            address first_ref = IReferralHandler(_handler).referredBy();
            if (first_ref != address(0)) {
                IReferralHandler(first_ref).addToReferralTree(
                    1,
                    _handler,
                    _tier
                );
                address second_ref = IReferralHandler(first_ref).referredBy();
                if (second_ref != address(0)) {
                    IReferralHandler(second_ref).addToReferralTree(
                        2,
                        _handler,
                        _tier
                    );
                    address third_ref = IReferralHandler(second_ref)
                        .referredBy();
                    if (third_ref != address(0)) {
                        IReferralHandler(third_ref).addToReferralTree(
                            3,
                            _handler,
                            _tier
                        );
                        address fourth_ref = IReferralHandler(third_ref)
                            .referredBy();
                        if (fourth_ref != address(0))
                            IReferralHandler(fourth_ref).addToReferralTree(
                                4,
                                _handler,
                                _tier
                            );
                    }
                }
            }
        }
    }

    function getTierManager() external view returns (address) {
        return tierManager;
    }

    function getTaxManager() external view returns (address) {
        return taxManager;
    }

    function getRewarder() external view returns (address) {
        return rewarder;
    }

    function getMaster() external view returns (address) {
        return master;
    }
}