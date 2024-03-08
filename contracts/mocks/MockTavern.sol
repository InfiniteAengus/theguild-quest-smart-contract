// SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.20;

import "../interfaces/IProfileNFT.sol";
import "../interfaces/Quests/IQuest.sol";
import "../interfaces/INexus.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ITavern } from "../interfaces/Quests/ITavern.sol";
/**
 * @title Quest Factory (Tavern)
 * @notice Deploys Quest Contracts and manages them
 * @author @cosmodude
 */
// NOTE: the access control library isnt actually used, local access control is used instead
contract MockTavern is ITavern {
    using SafeERC20 for IERC20;
    
    address public owner;
    address private _barkeeper;
    address public escrowNativeImplementation; // for native blockchain tokens
    address public escrowTokenImplementation; // for ERC20 tokens
    address public questImplementation;
    address public seekerFeesTreasury;
    address public solverFeesTreasury;
    address public disputeFeesTreasury;
    address public mediator; // for disputes
    address public seeker;
    address public solver;
    address public rewarder;
    uint256 public reviewPeriod = 1000;
    IProfileNFT private nft;
    address public nexus;

    modifier onlyBarkeeper() {
        require(msg.sender == _barkeeper, "only barkeeper");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    constructor(
        address _questImplementation,
        address _escrowNativeImplementation,
        address _escrowTokenImplementation,
        address _seeker,
        address _solver,
        address _rewarder,
        address _nexus
    ) {
        escrowNativeImplementation = _escrowNativeImplementation;
        escrowTokenImplementation = _escrowTokenImplementation;
        questImplementation = _questImplementation;
        owner = msg.sender;
        seeker = _seeker;
        solver = _solver;
        rewarder = _rewarder;
        nexus = _nexus;
    }

    function createNewQuest(
        // user identificators
        uint32 _seekerId,
        uint32 _solverId,
        uint256 _paymentAmount,
        string memory infoURI
    ) external payable onlyBarkeeper {
        IQuest quest = IQuest(Clones.clone(questImplementation));
        address escrowImpl = escrowNativeImplementation;
        address taxManager = INexus(nexus).taxManager();
        require(taxManager != address(0), "TaxManager not set");

        emit QuestCreatedNative(_seekerId, _solverId, address(quest), escrowImpl, _paymentAmount, taxManager);

        quest.initialize(
            _seekerId,
            _solverId,
            _paymentAmount,
            infoURI,
            escrowImpl,
            address(0)
        );
    }

    function createNewQuest(
        // user identificators
        uint32 _seekerId,
        uint32 _solverId,
        uint256 _paymentAmount,
        string memory infoURI,
        address _token
    ) external payable onlyBarkeeper {     
        IQuest quest = IQuest(Clones.clone(questImplementation));
        address escrowImpl = escrowTokenImplementation;
        address taxManager = INexus(nexus).taxManager();

        require(taxManager != address(0), "TaxManager not set");

        emit QuestCreatedToken(_seekerId, _solverId, address(quest), escrowImpl, _paymentAmount, _token, taxManager);

        quest.initialize(
            _seekerId,
            _solverId,
            _paymentAmount,
            infoURI,
            escrowImpl,
            _token
        );   
    }

    // in case of backend problem
    function setBarkeeper(address keeper) external onlyOwner {
        _barkeeper = keeper;
    }

    // in case of serious emergency
    function setProfileNft(address _nft) external onlyOwner {
        nft = IProfileNFT(_nft);
    }

    function setQuestImplementation(address impl) external onlyOwner {
        questImplementation = impl;
    }

    function setEscrowNativeImplementation(address impl) external onlyOwner {
        escrowNativeImplementation = impl;
    }

    function setEscrowTokenImplementation(address impl) external onlyOwner {
        escrowTokenImplementation = impl;
    }

    function setSeekerTreasury(address treasury) external onlyOwner {
        seekerFeesTreasury = treasury;
    }

    function setSolverTreasury(address treasury) external onlyOwner {
        solverFeesTreasury = treasury;
    }

    function setDisputeTreasuryAddress(address treasury) external onlyOwner {
        disputeFeesTreasury = treasury;
    }

    function setMediator(address _mediator) external onlyOwner {
        mediator = _mediator;
    }

    function setReviewPeriod(uint256 period) external onlyOwner {
        reviewPeriod = period;
    }

    function getRewarder() external view returns (address) {
        return rewarder;
    }

    function getBarkeeper() external view onlyOwner returns (address) {
        return _barkeeper;
    }

    function getProfileNFT() public view returns (address) {
        return address(nft);
    }

    function ownerOf(uint32 nftId) external view returns (address) {
        if(nftId == 1) {
            return solver;
        } else {
            return seeker;
        }
    }

    function confirmNFTOwnership(
        address identity
    ) public view returns (bool confirmed) {
    }

    function recoverTokens(
        address _token,
        address benefactor
    ) public onlyOwner {
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