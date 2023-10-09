// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";
import {GovernorCompatibilityBravo} from
    "@openzeppelin/contracts/governance/compatibility/GovernorCompatibilityBravo.sol";

import {Curved} from "../src/Curved.sol";
import {YuYuMother} from "../src/Governance.sol";

import {YuYu} from "../src/Token.sol";

contract YuyuMotherTest is Test {
    enum VoteType {
        Against,
        For,
        Abstain
    }

    IERC20 _rewardToken;
    Curved _curved;

    TimelockController _tl;
    YuYuMother _gov;
    YuYu _tk;

    address _curvedAddress;
    address _owner = address(0x11);
    address[] _owners = [address(0x17), address(0x18), address(0x19), address(0x20)];
    address[] _users = [address(0x12), address(0x13), address(0x14), address(0x15), address(0x16)];
    mapping(address => uint256) _userPurchaseTimestamp;

    function setUp() public {
        vm.startPrank(_owner);

        _tk = new YuYu();
        _rewardToken = IERC20(address(_tk));

        _curved = new Curved(address(_rewardToken));
        _curvedAddress = address(_curved);

        uint256 _ownerRewardTokenBalance = _rewardToken.balanceOf(_owner);
        assertEq(_ownerRewardTokenBalance, 2_000_000_000 ether);

        uint256 equalShares = _ownerRewardTokenBalance / (_users.length + 1);
        for (uint256 i = 0; i < _users.length; i++) {
            vm.deal(_users[i], 100 ether);
            _rewardToken.transfer(_users[i], equalShares);
        }

        address[] memory proposers;
        address[] memory executors;
        //  = new address[](1);
        // executors[0] = 0x0000000000000000000000000000000000000000;

        _tl = new TimelockController(4 hours, proposers, executors, _owner);
        _gov = new YuYuMother(IVotes(_tk), _tl);

        // grant PROPOSER_ROLE to yuyu mother
        _tl.grantRole(_tl.PROPOSER_ROLE(), address(_gov));
        _tl.grantRole(_tl.EXECUTOR_ROLE(), address(_gov));

        // renounce timelock admin rights
        _tl.renounceRole(_tl.DEFAULT_ADMIN_ROLE(), _owner);

        // transfer contract ownership to mother
        _curved.transferOwnership(address(_tl));

        vm.stopPrank();
    }

    modifier delegation() {
        for (uint256 i = 0; i < _users.length; i++) {
            vm.prank(_users[i]);
            _tk.delegate(_users[i]);
        }
        _;
    }

    function testVoteCycle() public delegation {
        vm.startPrank(_owner);

        string memory desc = "Proposal #1: Raise Fees";
        bytes memory fnData = _encodeProposal(20);

        address[] memory targets = new address[](1);
        targets[0] = address(_curved);

        uint256[] memory values = new uint256[](1);
        values[0] = 0;

        bytes[] memory calldatas = new bytes[](1);
        calldatas[0] = fnData;

        uint256 id = _gov.propose(targets, values, calldatas, desc);
        vm.stopPrank();

        console.log(
            _gov.proposalThreshold(), _gov.proposalDeadline(id), _gov.proposalSnapshot(id), uint256(_gov.state(id))
        );

        vm.warp(_gov.votingDelay() + 1 hours);
        console.log(uint256(_gov.state(id)));

        //voting cycle
        // vm.prank(_owner);
        // _gov.castVote(id, uint8(VoteType.For));

        for (uint256 i = 0; i < _users.length; i++) {
            vm.prank(_users[i]);
            _gov.castVote(id, uint8(VoteType.For));
        }

        vm.startPrank(address(0x42)); // anyone can queue up proposal and execute

        vm.warp(block.timestamp + _gov.proposalDeadline(id) + 10 seconds);
        _gov.queue(targets, values, calldatas, keccak256(bytes(desc)));
        vm.warp(block.timestamp + 4 hours + 1 minutes);
        _gov.execute(targets, values, calldatas, keccak256(bytes(desc)));

        assertEq(_curved.protocolFeePercent(), 20);

        vm.stopPrank();
    }

    function _encodeProposal(uint256 percen) internal returns (bytes memory) {
        // bytes4 selector = bytes4(keccak256(bytes("transfer(address,uint)")));
        bytes4 selector = _curved.setProtocolFeePercent.selector;
        bytes memory data = abi.encodeWithSelector(selector, percen);

        return data;
    }
}
