//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import { IEscrowNative, IEscrowToken, IEscrow } from "./interfaces/Quests/IEscrow.sol";
import { Clones } from "@openzeppelin/contracts/proxy/Clones.sol";
import { IQuest } from "./interfaces/Quests/IQuest.sol";
import { ITavern } from "./interfaces/Quests/ITavern.sol";
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
    
    ITavern private Tavern;
    address private escrow;
    
    modifier onlySeeker() {
        require(Tavern.ownerOf(seekerId) == msg.sender, "only Seeker");
        _;
    }

    modifier onlySolver() {
        require(Tavern.ownerOf(solverId) == msg.sender, "only Solver");
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
        address _token
    ) external returns (bool) {
        Tavern = ITavern(msg.sender);
        require(!initialized);
        initialized = true;
        solverId = _solverNftId;
        seekerId = _seekerNftId;
        paymentAmount = _paymentAmount;
        infoURI = _infoURI;
        escrowImplemntation = _escrowImplementation;
        token = _token;
        
        return true;
    }

    function startQuest() external payable onlySeeker {
        require(initialized, "not initialized");
        require(!started, "already started");
        if(token == address(0)){
            require(msg.value >= paymentAmount, "wrong payment amount");
            // todo tax logic

        } else {
           // todo tax logic 
        }
        started = true;
        escrow = Clones.clone(escrowImplemntation);

        if(token == address(0)){
            IEscrowNative(escrow).initialize{value: msg.value}(token);
        } else {
            IERC20(token).transferFrom(msg.sender, escrow, paymentAmount);
            IEscrowToken(escrow).initialize(token, paymentAmount);
        }
    }

    // todo
    function startDispute() external onlySeeker {
        require(started, "quest not started");
        require(!beingDisputed, "Dispute started before");
        beingDisputed = true;
        mediator = Tavern.mediator();
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
        rewardTime = block.timestamp + Tavern.reviewPeriod(); // arbitrary time
    }

    function extend() external onlySeeker {
        require(finished, "Quest not finished");
        require(!extended, "Was extended before");
        require(!rewarded, "Was rewarded before");
        extended = true;
        rewardTime += Tavern.reviewPeriod();
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
        return Tavern.getRewarder();
    }
}