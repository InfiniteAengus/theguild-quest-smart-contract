//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import { IEscrowNative, IEscrowToken, IEscrow } from "./interfaces/Quests/IEscrow.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { IQuest } from "./interfaces/Quests/IQuest.sol";
import { ITavern } from "./interfaces/Quests/ITavern.sol";
import { ITaxManager } from "./interfaces/ITaxManager.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Quest Implementation
 * @notice Controls the quest flow
 * @author @cosmodude
 * @dev Implementation contract, instances are created as ERC1167 clones 
 */

contract Quest is IQuest {
    using SafeERC20 for IERC20;

    // state variables
    bool public initialized;
    bool public started;
    bool public submitted;
    bool public extended;
    bool public beingDisputed;
    bool public finished;
    bool public rewarded;
    bool public withToken;

    address public escrowImplemntation; // native or with token
    uint32 public solverId;
    address public token;
    uint32 public seekerId;
    address public mediator;
    string public infoURI;
    uint256 public paymentAmount;
    uint256 public rewardTime;
    
    ITavern private tavern;
    ITaxManager private taxManager;

    address private escrow;
    
    modifier onlySeeker() {
        require(tavern.ownerOf(seekerId) == msg.sender, "only Seeker");
        _;
    }

    modifier onlySolver() {
        require(tavern.ownerOf(solverId) == msg.sender, "only Solver");
        _;
    }

    modifier onlyMediator() {
        require(msg.sender == mediator, "only mediator");
        _;
    }

    function initialize(
        uint32 _solverNftId,
        uint32 _seekerNftId,
        uint256 _paymentAmount,
        string memory _infoURI,
        address _escrowImplementation,
        address _token,
        address _taxManager
    ) external returns (bool) {
        tavern = ITavern(msg.sender);
        require(!initialized);
        initialized = true;
        solverId = _solverNftId;
        seekerId = _seekerNftId;
        paymentAmount = _paymentAmount;
        infoURI = _infoURI;
        escrowImplemntation = _escrowImplementation;
        token = _token;
        taxManager = ITaxManager(_taxManager);
        
        return true;
    }

    function startQuest(uint256 _bountyAmount) external payable onlySeeker {
        require(initialized, "not initialized");
        require(!started, "already started");

        ITaxManager.SeekerFees memory seekerFees = taxManager.getSeekerFees();

        started = true;
        escrow = Clones.clone(escrowImplemntation);

        uint256 referralTax = (_bountyAmount * seekerFees.referralRewards) / taxManager.taxBaseDivisor();
        uint256 platformTax = (_bountyAmount * seekerFees.platformRevenue) / taxManager.taxBaseDivisor();
        uint256 totalTax = referralTax + platformTax;

        if(token == address(0)){
            require(msg.value >= _bountyAmount + totalTax, "Insufficient payment amount");
            _transferTax(address(0), referralTax, platformTax);
            IEscrowNative(escrow).initialize{value: _bountyAmount}(token);
        } else {
            _transferTax(token, referralTax, platformTax);
            IERC20(token).transferFrom(msg.sender, escrow, paymentAmount);
            IEscrowToken(escrow).initialize(token, paymentAmount);
        }
    }

    // todo
    function startDispute() external onlySeeker {
        require(started, "quest not started");
        require(!beingDisputed, "Dispute started before");
        beingDisputed = true;
        mediator = tavern.mediator();
    }

    function resolveDispute(
        uint8 solverShare
    ) external onlyMediator {
        require(beingDisputed, "Dispute not started");
        require(!rewarded, "Rewarded before");
        require(solverShare <= 100, "Share can't be more than 100");
        rewarded = true;
        IEscrow(escrow).proccessResolution(seekerId, solverId, solverShare, getRewarder());  
    }

    function finishQuest() external onlySolver {
        // might be changed
        require(started, "quest not started");

        finished = true;
        rewardTime = block.timestamp + tavern.reviewPeriod(); // arbitrary time
    }

    function extend() external onlySeeker {
        require(finished, "Quest not finished");
        require(!extended, "Was extended before");
        require(!rewarded, "Was rewarded before");
        extended = true;
        rewardTime += tavern.reviewPeriod();
    }

    function receiveReward() external onlySolver {
        require(finished, "Quest not finished");
        require(!rewarded, "Rewarded before");
        require(!beingDisputed, "Is under dispute");
        require(rewardTime <= block.timestamp, "Not reward time yet");
        rewarded = true;
        IEscrow(escrow).proccessPayment(solverId, getRewarder());
    }

    function getRewarder() public view returns (address) {
        return tavern.getRewarder();
    }

    function _transferTax(address _token, uint256 _referralTax, uint256 _platformTax) private {
        address referralTaxReceiver = taxManager.getReferralTaxReceiver();
        address platformTaxReceiver = taxManager.getPlatformTaxReceiver();

        require(referralTaxReceiver != address(0) && platformTaxReceiver != address(0), "Referral tax receiver not set");

        if(token == address(0)){
            (bool success, ) = payable(referralTaxReceiver).call{value: _referralTax}("");
            require(success, "Referral tax transfer error");
            (success, ) = payable(platformTaxReceiver).call{value: _platformTax}("");
            require(success, "Platform tax transfer error");
        } else {
            IERC20(_token).transferFrom(msg.sender, referralTaxReceiver, _referralTax);
            IERC20(_token).transferFrom(msg.sender, platformTaxReceiver, _platformTax);
        }
    }
}