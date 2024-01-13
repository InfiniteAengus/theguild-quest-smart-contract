// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IProfileNFT.sol";
import "./interfaces/IReferralHandler.sol";
import "./interfaces/INexus.sol";  
//import "./interfaces/IRebaserNew.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";

contract Nexus is INexus {
    address public master; 
    address private guardian;
    address public tierManager;
    address public taxManager;
    address public handlerImplementation;
    address public accountImplementation;
    address public rewarder;
    mapping(uint32 => address) NFTToHandler;
    mapping(address => uint32) HandlerToNFT;
    //mapping(uint256 => address) NFTToDepositBox; // should be changed to account, not needed
    mapping(address => bool) handlerStorage;
    IProfileNFT public NFT;

    // check events
    event NewAdmin(address oldAdmin, address newAdmin);
    event NewURI(string OldTokenURI, string NewTokenURI);
    event NewRewarder(address oldRewarder, address newRewarder);
    event NewNFT(address oldNFT, address NewNFT);
    event NewRebaser(address oldRebaser, address newRebaser);
    event NewToken(address oldToken, address newToken);
    event NewTaxManager(address oldTaxManager, address newTaxManager);
    event NewTierManager(address oldTierManager, address newTierManager);

    event NewIssuance(uint32 id, address handler, address account);
    event LevelChange(address handler, uint8 oldTier, uint8 newTier);

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

// check events
    modifier onlyMaster() {
        require(msg.sender == master, "only admin");
        _;
    }

    modifier onlyGuardian() {
        require(msg.sender == guardian, "only admin");
        _;
    }

    constructor(
        address _handlerImplementation
    ) {
        master = msg.sender;
        handlerImplementation = _handlerImplementation;
    }

    function getHandler(uint32 tokenID) external view returns (address) {
        return NFTToHandler[tokenID];
    }

    function isHandler(address _handler) public view returns (bool) {
        return handlerStorage[_handler];
    }

    function addHandler(address _handler) public onlyMaster {
        handlerStorage[_handler] = true;
    }

    function notifyLevelUpdate(uint8 oldTier, uint8 newTier) external {
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

    function setGuardian(address account) public onlyMaster {
        address oldAdmin = guardian;
        guardian = account;
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

    function createProfile(uint32 referrerId, address recipient, string memory profileLink) external onlyGuardian returns (address) {
        uint32 nftId = NFT.issueProfile(recipient, profileLink); // token URI should be updated
        IReferralHandler handler = IReferralHandler(
            Clones.clone(handlerImplementation)
        );
        require(nftId!= referrerId, "Cannot be its own referrer");
        require(
            referrerId < nftId,  // 0 in case of no referrer
            "Referrer should have a valid profile id"
        );
        address referrerHandler = NFTToHandler[referrerId];
        handler.initialize(referrerHandler, address(NFT), nftId);
        NFTToHandler[nftId] = address(handler);
        HandlerToNFT[address(handler)] = nftId;
        handlerStorage[address(handler)] = true;
        addToReferrersAbove(1, address(handler));
        emit NewIssuance(nftId, address(handler), address(0));
        return address(handler);
    }

    /**
     * 
     * @param _tier  Tier of the profile
     * @param _handler Address of the handler for the newly created profile
     */
    function addToReferrersAbove(uint8 _tier, address _handler) internal {  // handler of the newly created profile
        // maybe rewritten id -> address (handler of the referrer)  ;; done
        address firstRef = IReferralHandler(_handler).referredBy();
        if ( firstRef != address(0)) {
            IReferralHandler(firstRef).addToReferralTree(
                1,
                _handler,
                _tier
            );
            address secondRef = IReferralHandler(firstRef).referredBy();
            if (secondRef!= address(0)) {
                IReferralHandler(secondRef).addToReferralTree(
                    2,
                    _handler,
                    _tier
                );
                address thirdRef = IReferralHandler(secondRef).referredBy();
                if (thirdRef != address(0)) {
                    IReferralHandler(thirdRef).addToReferralTree(
                        3,
                        _handler,
                        _tier
                    );
                    address fourthRef = IReferralHandler(thirdRef).referredBy();
                    if (fourthRef != address(0)) {
                        IReferralHandler(fourthRef).addToReferralTree(
                            4,
                            _handler,
                            _tier
                        );
                    }
                }
            }
        }
    }

    function getGuardian() external view onlyMaster returns(address){
        return guardian;
    }

}