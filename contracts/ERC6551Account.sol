//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "./interfaces/IERC6551/IERC6551Account.sol";
import "./interfaces/IERC6551/IER6551Executable.sol";

import "./interfaces/IReferralHandler.sol";
import "./interfaces/IProfileNFT.sol";
import "./interfaces/IReferralHandler.sol";
import "./interfaces/ITierManager.sol";
import "./interfaces/ITaxManager.sol";
import "./interfaces/INexus.sol";
//import "./interfaces/IRewarder.sol";
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title The Guild User Account 
 * @author @cosmodude
 * @notice Erc6551 Account + Referral Handler
 * @dev Implementation contract, instances are created as clones
 */
contract ReferralHandlerERC6551Account is
    IERC165,
    IERC1271,
    IERC6551Account,
    IERC6551Executable,
    IReferralHandler
{
    uint256 private _state;

    receive() external payable {}
    
    //
    //
    // Hanlder part
    //
    //
    //
    //

    //using SafeERC20 for IERC20;

    bool public initialized = false;
    bool private canLevel;
    uint8 private tier;
    address public referredBy; // maybe changed to referredBy address
    uint256 public mintTime;

    // NFT ids of those referred by this NFT and its subordinates
    address[] public firstLevelRefs;
    address[] public secondLevelRefs;
    address[] public thirdLevelRefs;
    address[] public fourthLevelRefs;


    INexus public nexus;

    // todo: bad practice of repeated tiers storing, expensive tier updates
    // Mapping of the above Handler list and their corresponding NFT tiers, tiers are public (tier + 1)
    mapping(address => uint8) public firstLevelTiers;
    mapping(address => uint8) public secondLevelTiers;
    mapping(address => uint8) public thirdLevelTiers;
    mapping(address => uint8) public fourthLevelTiers;

    modifier onlyMaster() {
        require(msg.sender == nexus.master(), "only master");
        _;
    }

    modifier onlyProtocol() {
        require(
            msg.sender == nexus.master() || msg.sender == address(nexus),
            "only master or nexus"
        );
        _;
    }

    modifier onlyNexus() {
        require(msg.sender == address(nexus), "only nexus");
        _;
    }

    function initialize(address _referredBy) external {
        require(!initialized, "Already initialized");
        nexus = INexus(msg.sender);
        initialized = true;
        referredBy = _referredBy;
        mintTime = block.timestamp;
        tier = 1; // Default tier is 1 instead of 0, since solidity 0 can also mean non-existant, all tiers on contract are + 1
        canLevel = true;
    }

    /**
     * @dev Can be called by anyone
     */
    function tierUp() external returns (bool) {
        require(getTier() < 4 && canLevel == true, "Can't increase the tier");
        require(
            getTierManager().checkTierUpgrade(getTierCounts()),
            "Tier upgrade condition not met"
        );
        uint8 oldTier = getTier();
        tier = tier + 1;
        nexus.notifyTierUpdate(oldTier, getTier());
        updateReferrersAbove(tier);
        string memory tokenURI = getTierManager().getTokenURI(getTier());
        IProfileNFT NFT = IProfileNFT(getNft());
        uint32 nftId = getNftId();
        NFT.changeURI(nftId, tokenURI);
        
        return true;
    }

    //
    //Admin functions
    //

    function setNexus(address account) public onlyMaster {
        nexus = INexus(account);
    }

    function setTier(uint8 _tier) public onlyProtocol {
        require(_tier >= 0 && _tier <= 4, "Invalid Tier");
        uint8 oldTier = getTier(); // For events
        tier = _tier + 1; // Adding the default +1 offset stored in handlers
        updateReferrersAbove(tier);
        string memory tokenURI = getTierManager().getTokenURI(getTier());
        IProfileNFT NFT = IProfileNFT(getNft());
        uint32 nftId = getNftId();
        NFT.changeURI(nftId, tokenURI);
        nexus.notifyTierUpdate(oldTier, getTier());
    }

    function changeEligibility(bool status) public onlyMaster {
        canLevel = status;
    }

    // Internal/Utility functions

    function updateReferrersAbove(uint8 _tier) internal {
        address firstRef = referredBy;
        if (firstRef != address(0)) {
            IReferralHandler(firstRef).updateReferralTree(1, _tier);
            address secondRef = IReferralHandler(firstRef).referredBy();
            if (secondRef != address(0)) {
                IReferralHandler(secondRef).updateReferralTree(2, _tier);
                address thirdRef = IReferralHandler(secondRef).referredBy();
                if (thirdRef != address(0)) {
                    IReferralHandler(thirdRef).updateReferralTree(3, _tier);
                    address fourthRef = IReferralHandler(thirdRef).referredBy();
                    if (fourthRef != address(0))
                        IReferralHandler(fourthRef).updateReferralTree(
                            4,
                            _tier
                        );
                }
            }
        }
    }

    /**
     * @notice Adds new Handler to the Referral Tree
     * @param refDepth Number of layers between the referral and referee
     * @param referralHandler Address of the handler of referred person(referral)
     * @param _tier Tier of the referral Nft
     * @dev Can be called only by Nexus
     */
    function addToReferralTree(
        uint8 refDepth,
        address referralHandler,
        uint8 _tier
    ) external onlyNexus {
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

    function updateReferralTree(uint8 refDepth, uint8 _tier) external {
        // msg.sender should be the handler reffered by this address
        require(refDepth <= 4 && refDepth >= 1, "Invalid depth");
        require(msg.sender != address(0), "Invalid referred address");

        if (refDepth == 1) {
            require(
                firstLevelTiers[msg.sender] != 0,
                "Cannot update non-existant entry"
            );
            firstLevelTiers[msg.sender] = _tier;
        } else if (refDepth == 2) {
            require(
                secondLevelTiers[msg.sender] != 0,
                "Cannot update non-existant entry"
            );
            secondLevelTiers[msg.sender] = _tier;
        } else if (refDepth == 3) {
            require(
                thirdLevelTiers[msg.sender] != 0,
                "Cannot update non-existant entry"
            );
            thirdLevelTiers[msg.sender] = _tier;
        } else if (refDepth == 4) {
            require(
                fourthLevelTiers[msg.sender] != 0,
                "Cannot update non-existant entry"
            );
            fourthLevelTiers[msg.sender] = _tier;
        }
    }

    // Get Methods

    function getNft() public view returns (address) {
        (, address nftAddr, ) = token();
        return nftAddr;
    }

    function getNftId() public view returns (uint32) {
        (, , uint256 nftId) = token();
        return uint32(nftId);
    }

    function getTier() public view returns (uint8) {
        return tier - 1;
    }

    function getTierManager() public view returns (ITierManager) {
        address tierManager = nexus.tierManager();
        return ITierManager(tierManager);
    }

    function getTaxManager() public view returns (ITaxManager) {
        address taxManager = nexus.taxManager();
        return ITaxManager(taxManager);
    }

    /**
     * @notice Checks for existence of the given address on the given depth of the tree
     * @param refDepth A layer of the referral connection
     * @param referralHandler Address of the Handler Account of referral
     * @return _tier Returns 0 if it does not exist, else returns the NFT tier
     */
    function checkReferralExistence(
        uint8 refDepth,
        address referralHandler
    ) public view returns (uint8 _tier) {
        require(refDepth <= 4 && refDepth >= 1, "Invalid depth");
        require(referralHandler != address(0), "Invalid referred address");

        if (refDepth == 1) {
            return firstLevelTiers[referralHandler];
        } else if (refDepth == 2) {
            return secondLevelTiers[referralHandler];
        } else if (refDepth == 3) {
            return thirdLevelTiers[referralHandler];
        } else if (refDepth == 4) {
            return fourthLevelTiers[referralHandler];
        }
        return 0;
    }

    /**
     * @notice Returns number of referrals for each tier
     * @return Returns array of counts for Tiers 1 to 5 under the user
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


    //
    //
    //
    // ERC6551 part
    //
    //
    //

    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        uint8 operation
    ) external payable returns (bytes memory result) {
        require(_isValidSigner(msg.sender), "Invalid signer");
        require(operation == 0, "Only call operations are supported");

        ++_state;

        bool success;
        (success, result) = to.call{value: value}(data);

        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    function isValidSigner(
        address signer,
        bytes calldata
    ) external view returns (bytes4) {
        if (_isValidSigner(signer)) {
            return IERC6551Account.isValidSigner.selector;
        }

        return bytes4(0);
    }

    function isValidSignature(
        bytes32 hash,
        bytes memory signature
    ) external view returns (bytes4 magicValue) {
        bool isValid = SignatureChecker.isValidSignatureNow(
            owner(),
            hash,
            signature
        );

        if (isValid) {
            return IERC1271.isValidSignature.selector;
        }

        return "";
    }

    function supportsInterface(
        bytes4 interfaceId
    ) external pure returns (bool) {
        return (interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC6551Account).interfaceId ||
            interfaceId == type(IERC6551Executable).interfaceId);
    }

    function token() public view returns (uint256, address, uint256) {
        bytes memory footer = new bytes(0x60);

        assembly {
            extcodecopy(address(), add(footer, 0x20), 0x4d, 0x60)
        }

        return abi.decode(footer, (uint256, address, uint256));
    }

    function owner() public view returns (address) {
        (uint256 chainId, address tokenContract, uint256 tokenId) = token();
        if (chainId != block.chainid) return address(0);

        return IERC721(tokenContract).ownerOf(tokenId);
    }

    function _isValidSigner(address signer) internal view returns (bool) {
        return signer == owner();
    }

    function state() external view override returns (uint256) {
        return _state;
    }

    // End of Account

}