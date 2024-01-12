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
        handler.initialize(referrerId, address(NFT), nftId);
        NFTToHandler[nftId] = address(handler);
        HandlerToNFT[address(handler)] = nftId;
        handlerStorage[address(handler)] = true;
        addToReferrersAbove(1, nftId);
        emit NewIssuance(nftId, address(handler), address(0));
        return address(handler);
    }

    function addToReferrersAbove(uint8 _tier, uint32 nftId) internal {
        // maybe rewritten better
        uint32 firstRefId = IReferralHandler(NFTToHandler[nftId]).referredById();
        if ( firstRefId != 0) {
            IReferralHandler(NFTToHandler[firstRefId]).addToReferralTree(
                1,
                nftId,
                _tier
            );
            uint32 secondRefId = IReferralHandler(NFTToHandler[firstRefId]).referredById();
            if (secondRefId != 0) {
                IReferralHandler(NFTToHandler[secondRefId]).addToReferralTree(
                    2,
                    nftId,
                    _tier
                );
                uint32 thirdRefId = IReferralHandler(NFTToHandler[secondRefId]).referredById();
                if (thirdRefId != 0) {
                    IReferralHandler(NFTToHandler[thirdRefId]).addToReferralTree(
                        3,
                        nftId,
                        _tier
                    );
                    uint32 fourthRefId = IReferralHandler(NFTToHandler[thirdRefId]).referredById();
                    if (fourthRefId != 0) {
                        IReferralHandler(NFTToHandler[fourthRefId]).addToReferralTree(
                            4,
                            nftId,
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