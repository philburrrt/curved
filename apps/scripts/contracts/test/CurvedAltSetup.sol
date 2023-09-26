// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";
import {Curved} from "../src/Curved.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CurvedAltSetupTest is Test {
    IERC20 _rewardToken;
    Curved _curved;
    address _curvedAddress;
    address _owner = address(0x11);
    address[] _owners = [
        address(0x17),
        address(0x18),
        address(0x19),
        address(0x20)
    ];
    address[] _users = [
        address(0x12),
        address(0x13),
        address(0x14),
        address(0x15),
        address(0x16)
    ];
    mapping(address => uint256) _userPurchaseTimestamp;

    modifier createShare(uint256 numOwners) {
        vm.stopPrank();
        for (uint256 i = 0; i < numOwners; i++) {
            vm.startPrank(_owners[i]);
            _curved.createShare("ipfs://test");
        }
        _;
    }

    modifier purchaseShare(uint256 amount) {
        // purchases user 0 as user 1
        vm.stopPrank();
        vm.startPrank(_users[1]);
        uint256 targetId = _curved.currentId() - 1;
        uint256 cost = _curved.getBuyPriceAfterFee(targetId, amount);
        _curved.buyShare{value: cost}(targetId, amount);
        _userPurchaseTimestamp[_users[1]] = block.timestamp;
        _;
    }

    modifier purchaseFromMany(uint256 users, uint256 amountPerUser) {
        vm.stopPrank();
        uint256 targetId = _curved.currentId() - 1;
        for (uint256 i = 0; i < users; i++) {
            uint256 cost = _curved.getBuyPriceAfterFee(targetId, amountPerUser);
            vm.prank(_users[i]);
            _curved.buyShare{value: cost}(targetId, amountPerUser);
            _userPurchaseTimestamp[_users[i]] = block.timestamp;
        }
        _;
    }

    function setUp() public {
        vm.startPrank(_owner);
        for (uint i = 0; i < _users.length; i++) {
            vm.deal(_users[i], 100 ether);
        }
        _curved = new Curved(_owner, 0.01 ether);
        uint256 deploymentTime = block.timestamp;
        _curvedAddress = address(_curved);
        _rewardToken = IERC20(_curvedAddress);
        uint256 _ownerRewardTokenBalance = _rewardToken.balanceOf(_owner);
        assertEq(_ownerRewardTokenBalance, 2_000_000_000 ether);
        _curved.createShare("ipfs://test");
        uint256 payment = _curved.getBuyPriceAfterFee(0, 1);
        vm.stopPrank();
        vm.prank(_users[0]);
        uint256 purchaseTime = block.timestamp;
        assertEq(purchaseTime, deploymentTime );
        _curved.buyShare{value: payment}(0, 1);
        _userPurchaseTimestamp[_users[0]] = block.timestamp;

    }

    function testRewardAccuracy() public {
        vm.startPrank(_users[0]);
        vm.warp(_userPurchaseTimestamp[_users[0]] + 52 weeks - 1);
        uint256 preClaimBalance = _rewardToken.balanceOf(_users[0]);
        uint256 claimTime = block.timestamp;
        uint256 duration = claimTime - _userPurchaseTimestamp[_users[0]];
        assertEq(duration, 52 weeks - 1);
        _curved.getReward();
        uint256 postClaimBalance = _rewardToken.balanceOf(_users[0]);
        console2.log(
            "preClaimBalance: %s, postClaimBalance: %s",
            preClaimBalance,
            postClaimBalance
        );
    }

    
}