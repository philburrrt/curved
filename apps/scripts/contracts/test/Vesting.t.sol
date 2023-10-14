// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {Curved} from "../src/Curved.sol";
import {YuYu} from "../src/Token.sol";
import {Vesting} from "../src/Vesting.sol";

contract VestingTest is Test {
    YuYu _yuyu;
    Vesting _vesting;
    address _yuyuAddr;
    address _vestingAddr;
    address _owner = address(0x11);
    uint64 _startTimestamp = uint64(block.timestamp + 13 weeks);

    function setUp() public {
      vm.startPrank(_owner);
      _yuyu = new YuYu();
      _yuyuAddr = address(_yuyu);
      // 13 week cliff, 6 year linear vesting
      _vesting = new Vesting(_owner, _startTimestamp, 52 weeks * 6);
      _vestingAddr = address(_vesting);
      _yuyu.transfer(_vestingAddr, 2_000_000_000 ether);
    }

    function testSetUp() public {
      assertEq(_yuyu.balanceOf(_owner), 0);
      assertEq(_yuyu.balanceOf(_vestingAddr), 2_000_000_000 ether);
      assertEq(_yuyu.totalSupply(), 2_000_000_000 ether);
      assertEq(_vesting.beneficiary(), _owner);
      
    }

    /* 
    expected behavior:
    - once tokens are transferred to the vesting contract they are included in the vesting schedule
    - no tokens emitted until the cliff has passed
    - tokens are emitted linearly after the cliff has passed
    - tokens are emitted until the vesting period has passed
    - only the owner can claim tokens
    */

    function testCliff() public {
      vm.roll(block.number + 1);
      vm.warp(block.timestamp + 13 weeks);
      _vesting.release(_yuyuAddr);
      assertEq(_yuyu.balanceOf(_owner), 0);
      assertEq(_yuyu.balanceOf(_vestingAddr), 2_000_000_000 ether);
    }

    function testRelease() public {
      vm.roll(block.number + 1);
      vm.warp(_startTimestamp + 13 weeks + 1);
      _vesting.release(_yuyuAddr);
      assertGt(_yuyu.balanceOf(_owner), 0);
      assertLt(_yuyu.balanceOf(_vestingAddr), 2_000_000_000 ether);
    }

    function testReleaseEnd() public {
      vm.roll(block.number + 1);
      vm.warp(_startTimestamp + 52 weeks * 6 + 1);
      _vesting.release(_yuyuAddr);
      assertEq(_yuyu.balanceOf(_owner), 2_000_000_000 ether);
      assertEq(_yuyu.balanceOf(_vestingAddr), 0);
    }

    function testHalfWayRelease() public {
      vm.roll(block.number + 1);
      vm.warp(_startTimestamp + 52 weeks * 3);
      _vesting.release(_yuyuAddr);
      assertEq(_yuyu.balanceOf(_owner), 1_000_000_000 ether);
      assertEq(_yuyu.balanceOf(_vestingAddr), 1_000_000_000 ether);
    }

}