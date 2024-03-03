//SPDX-License-Identifier: GNU AGPLv3
pragma solidity ^0.8.0;

import { IEscrow } from "./interfaces/Quests/IEscrow.sol";
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

    address public escrowImplmentation; // native or with token
    uint32 public solverId;
    address public token;
    uint32 public seekerId;
    address public mediator;
    string public infoURI;
    uint256 public paymentAmount;
    uint256 public rewardTime;
    
    ITavern private tavern;

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
        address _token
    ) external {
        tavern = ITavern(msg.sender);
        require(!initialized, "Already Initialized");
        initialized = true;

        token = _token;
        escrowImplmentation = _escrowImplementation;

        solverId = _solverNftId;
        seekerId = _seekerNftId;

        paymentAmount = _paymentAmount;

        infoURI = _infoURI;
    }

    function startQuest() external payable onlySeeker {
        require(initialized, "not initialized");
        require(!started, "already started");

        started = true;
        escrow = Clones.clone(escrowImplmentation);

        if(token == address(0)){
            IEscrow(escrow).initialize{value: msg.value}(
                token, 
                seekerId,
                solverId, 
                paymentAmount
            );
        } else {
            IERC20(token).transferFrom(msg.sender, escrow, paymentAmount);
            IEscrow(escrow).initialize(
                token, 
                seekerId,
                solverId,
                paymentAmount
            );
        }
    }

    function startDispute() external payable onlySeeker {
        require(started, "quest not started");
        require(!beingDisputed, "Dispute started before");
        if (token == address(0)){
            beingDisputed = true;
            mediator = tavern.mediator();
            IEscrow(escrow).proccessStartDispute{value: msg.value}();
        }
        else{
            require(msg.value == 0 , "Dispute started before");
            beingDisputed = true;
            mediator = tavern.mediator();
            IEscrow(escrow).proccessStartDispute{value: 0}();
        }
    }

    function resolveDispute(
        uint8 solverShare
    ) external onlyMediator {
        require(beingDisputed, "Dispute not started");
        require(!rewarded, "Rewarded before");
        require(solverShare <= 100, "Share can't be more than 100");
        rewarded = true;
        IEscrow(escrow).proccessResolution(solverShare);  
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
        IEscrow(escrow).proccessPayment();
    }

    function getRewarder() public view returns (address) {
        return tavern.getRewarder();
    }
}