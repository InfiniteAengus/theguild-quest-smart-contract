// SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import "../interfaces/IProfileNFT.sol";
import "../interfaces/Quests/IQuest.sol";
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
    uint256 public reviewPeriod = 1;
    IProfileNFT private nft;

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
        address _escrowNativeImplementation,
        address _escrowTokenImplementation,
        address _questImplementation,
        address _seeker,
        address _solver,
        address _rewarder
    ) {
        escrowNativeImplementation = _escrowNativeImplementation;
        escrowTokenImplementation = _escrowTokenImplementation;
        questImplementation = _questImplementation;
        owner = msg.sender;
        seeker = _seeker;
        solver = _solver;
        rewarder = _rewarder;
    }

    function createNewQuest(
        // user identificators
        uint32 _solverId,
        uint32 _seekerId,
        uint256 _paymentAmount,
        string memory infoURI
    ) external payable onlyBarkeeper {
        IQuest quest = IQuest(Clones.clone(questImplementation));
        address escrowImpl = escrowNativeImplementation;
   
        emit QuestCreatedNative(_solverId, _seekerId, address(quest), escrowImpl, _paymentAmount);

        quest.initialize(
            _solverId,
            _seekerId,
            _paymentAmount,
            infoURI,
            escrowImpl,
            address(0)
        );
    }

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

        emit QuestCreatedToken(_solverId, _seekerId, address(quest), escrowImpl, _paymentAmount, _token);

        quest.initialize(
            _solverId,
            _seekerId,
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