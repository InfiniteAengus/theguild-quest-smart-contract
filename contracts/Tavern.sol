// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import "./interfaces/IProfileNFT.sol";
import "./interfaces/Quests/IQuest.sol";
import "./interfaces/INexus.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { ITavern } from "./interfaces/Quests/ITavern.sol";

/**
 * @title Quest Factory (Tavern)
 * @notice Deploys Quest Contracts and manages them
 * @author @cosmodude
 */
contract Tavern is AccessControl, ITavern {
    address public owner;
    address private _barkeeper;
    address public nexus;
    address public escrowNativeImplementation; // for native blockchain tokens
    address public escrowTokenImplementation; // for ERC20 tokens
    address public questImplementation;
    address public seekerFeesTreasury;
    address public solverFeesTreasury;
    address public disputeFeesTreasury;
    address public mediator; // for disputes
    uint256 public reviewPeriod = 1;
    IProfileNFT private nFT;

    modifier onlyBarkeeper() {
        require(msg.sender == _barkeeper, "only barkeeper");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    // quests with paymants in native token
    event QuestCreatedNative(
        uint32 solverId,
        uint32 seekerId,
        address quest,
        address escrowImplementation,
        uint256 paymentAmount
    );
    
    // quests with token payments
    event QuestCreatedToken(
        uint32 solverId,
        uint32 seekerId,
        address quest,
        address escrowImplementation,
        uint256 paymentAmount,
        address token
    );

    constructor(
        address _questImplementation,
        address _escrowNativeImplementation,
        address _escrowTokenImplementation,
        address _profileNft
    ) {
        escrowNativeImplementation = _escrowNativeImplementation;
        escrowTokenImplementation = _escrowTokenImplementation;
        questImplementation = _questImplementation;
        owner = msg.sender;
        nFT = IProfileNFT(_profileNft);
    }

    /**
     * @notice Function to create quests with Native token payments
     * @param _solverId Nft id of the solver of the quest
     * @param _seekerId Nft id of the seeker of the quest
     * @param _paymentAmount Amount of Native tokens to be paid
     * @param infoURI Link to the info a bout quest (flexible, decide with backend)
     */
    function createNewQuest(
        // user identificators
        uint32 _solverId,
        uint32 _seekerId,
        uint256 _paymentAmount,
        string memory infoURI
    ) external payable onlyBarkeeper {
        IQuest quest = IQuest(Clones.clone(questImplementation));
        address escrowImpl = escrowNativeImplementation;
   
        emit QuestCreatedNative(_seekerId, _solverId, address(quest), escrowImpl, _paymentAmount);

        quest.initialize(
            _solverId,
            _seekerId,
            _paymentAmount,
            infoURI,
            escrowImpl,
            address(0)
        );
        
    }

    /**
     * @notice Function to create quests with ERC20 token payments
     * @param _solverId Nft id of the solver of the quest
     * @param _seekerId Nft id of the seeker of the quest
     * @param _paymentAmount Amount of Native tokens to be paid
     * @param infoURI Link to the info a bout quest (flexible, decide with backend)
     * @param _token Address of the paymant token
     */
    function createNewQuest(
        // user identificators
        uint32 _solverId,
        uint32 _seekerId,
        uint256 _paymentAmount,
        string memory infoURI,
        address _token
    ) external payable onlyBarkeeper {
        IQuest quest = IQuest(Clones.clone(questImplementation));
        address escrowImpl = escrowTokenImplementation;

        emit QuestCreatedToken(_seekerId, _solverId, address(quest), escrowImpl, _paymentAmount, _token);

        quest.initialize(
            _solverId,
            _seekerId,
            _paymentAmount,
            infoURI,
            escrowImpl,
            _token
        );
        
    }
       
    function confirmNFTOwnership(
        address identity
    ) public view returns (bool confirmed) {
        confirmed = nFT.balanceOf(identity) > 0;
        return confirmed;
    }

    // in case of backend problem
    function setBarkeeper(address keeper) external onlyOwner {
        _barkeeper = keeper;
    }

    // in case of serious emergency
    function setProfileNft(address nft) external onlyOwner {
        nFT = IProfileNFT(nft);
    }

    function setQuestImplementation(address impl) external onlyOwner {
        escrowNativeImplementation = impl;
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
        return INexus(nexus).rewarder();
    }

    function getBarkeeper() external view onlyOwner returns (address) {
        return _barkeeper;
    }

    function getProfileNFT() public view returns (address) {
        return address(nFT);
    }

    function ownerOf(uint32 nftId) external view returns (address) {
        return nFT.ownerOf(nftId);
    }

}