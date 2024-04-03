//SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.20;

import {IEscrow} from "../interfaces/Quests/IEscrow.sol";
import {IRewarder} from "../interfaces/IRewarder.sol";
import {Clones} from "@openzeppelin/contracts/proxy/Clones.sol";
import {IQuest} from "../interfaces/Quests/IQuest.sol";
import {ITavern} from "../interfaces/Quests/ITavern.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Quest Implementation
 * @notice Controls the quest flow
 * @author @cosmodude
 * @dev Implementation contract, instances are created as ERC1167 clones
 */

contract MockQuest is IQuest {
    using SafeERC20 for IERC20;

    // state variables
    bool public initialized;
    bool public started;

    address public escrowImplementation; // native or with token
    uint32 public seekerId;
    uint32 public solverId;
    address public token;
    string public infoURI;
    uint256 public paymentAmount;
    address public rewarder;

    address public escrow;

    function initialize(
        uint32,
        uint32,
        uint256,
        string memory,
        uint256,
        address,
        address
    ) external override {}

    function initialize(
        uint32 _seekerNftId,
        uint32 _solverNftId,
        uint256 _paymentAmount,
        string memory _infoURI,
        address _escrowImplementation,
        address _token,
        address _rewarder
    ) external {
        require(!initialized);
        initialized = true;

        token = _token;
        escrowImplementation = _escrowImplementation;

        seekerId = _seekerNftId;
        solverId = _solverNftId;

        paymentAmount = _paymentAmount;

        infoURI = _infoURI;

        rewarder = _rewarder;
    }

    function startQuest() external payable {
        require(initialized, "not initialized");
        require(!started, "already started");

        started = true;
        escrow = Clones.clone(escrowImplementation);

        if (token == address(0)) {
            IEscrow(escrow).initialize{value: msg.value}(
                token,
                seekerId,
                solverId,
                paymentAmount
            );
        } else {
            (uint256 platformTax, uint256 referralTax) = IRewarder(
                getRewarder()
            ).calculateSeekerTax(paymentAmount);

            IERC20(token).transferFrom(
                msg.sender,
                escrow,
                paymentAmount + platformTax + referralTax
            );
            IEscrow(escrow).initialize(
                token,
                seekerId,
                solverId,
                paymentAmount
            );
        }
    }

    function startDispute() external payable {}

    function resolveDispute(uint32 _solverShare) external {
        IEscrow(escrow).processResolution(_solverShare);
    }

    function finishQuest() external {}

    function extend() external {}

    function receiveReward() external {
        IEscrow(escrow).processPayment();
    }

    function getRewarder() public view returns (address) {
        return rewarder;
    }
}
