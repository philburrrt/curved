// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {Curved} from "../src/Curved.sol";
import {YuYu} from "../src/Token.sol";


contract CurvedTest is Test {
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
        for (uint256 i = 0; i < numOwners; i++) {
            vm.prank(_owners[i]);
            _curved.createShare("ipfs://test");
        }
        _;
    }

    modifier purchaseShare(uint256 amount) {
        // purchases user 0 as user 1
        vm.startPrank(_users[1]);
        uint256 targetId = _curved.currentId() - 1;
        uint256 cost = _curved.getBuyPriceAfterFee(targetId, amount);
        _curved.buyShare{value: cost}(targetId, amount);
        _userPurchaseTimestamp[_users[1]] = block.timestamp;
        _;
    }

    modifier purchaseFromMany(uint256 users, uint256 amountPerUser) {
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

        YuYu _tk = new YuYu();
        _rewardToken = IERC20(address(_tk));

        _curved = new Curved(address(_rewardToken));
        _curvedAddress = address(_curved);

        _tk.addMinter(_curvedAddress);
        
        uint256 _ownerRewardTokenBalance = _rewardToken.balanceOf(_owner);
        assertEq(_ownerRewardTokenBalance, 2_000_000_000 ether);
        vm.stopPrank();
    }

    function testGetOwner() public {
        address deployer = _curved.owner();
        assertEq(_owner, deployer);
    }

    function testCreateShare() public {
        vm.startPrank(_users[0]);
        uint256 currentId = _curved.currentId();
        _curved.createShare("ipfs://test");
        (address __owner, uint256 _totalSupply, string memory _uri) = _curved
            .shareInfo(currentId);
        assertEq(__owner, _users[0]);
        assertEq(_totalSupply, 1);
        assertEq(_uri, "ipfs://test");
    }

    function testPurchaseAnotherUsersShare() public createShare(1) {
        vm.startPrank(_users[1]);
        uint256 targetId = _curved.currentId() - 1;
        uint256 cost = _curved.getBuyPriceAfterFee(targetId, 1);
        _curved.buyShare{value: cost}(targetId, 1);
        uint256 userBalance = _curved.getShareBalance(targetId, _users[1]);
        assertEq(userBalance, 1);
    }

    function testPurchaseManyShares() public createShare(1) {
        vm.startPrank(_users[1]);
        uint256 targetId = _curved.currentId() - 1;
        uint256 cost = _curved.getBuyPriceAfterFee(targetId, 2);
        _curved.buyShare{value: cost}(targetId, 2);
        uint256 userBalance = _curved.getShareBalance(targetId, _users[1]);
        assertEq(userBalance, 2);
    }

    function testSellSingleShare() public createShare(1) purchaseShare(1) {
        uint256 targetId = _curved.currentId() - 1;
        _curved.sellShare(targetId, 1);
        uint256 userBalanceAfter = _curved.getShareBalance(targetId, _users[1]);
        assertEq(userBalanceAfter, 0);
    }

    function testSellManyShares() public createShare(1) purchaseShare(2) {
        uint256 targetId = _curved.currentId() - 1;
        _curved.sellShare(targetId, 2);
        uint256 userBalanceAfter = _curved.getShareBalance(targetId, _users[1]);
        assertEq(userBalanceAfter, 0);
    }

    function testGetRete() public {
      uint256 start = _curved.startTime();
      uint256 year1 = _curved.getRate(start + 1);
      uint256 year2 = _curved.getRate(start + 365 days);
      uint256 year3 = _curved.getRate(start + 2 * 365 days);
      uint256 year4 = _curved.getRate(start + 3 * 365 days);
      uint256 year5 = _curved.getRate(start + 4 * 365 days);
      uint256 year6 = _curved.getRate(start + 5 * 365 days);

      assertEq(year1, 127187627187627187627); // 127.19 per second
      assertEq(year2, 50875050875050875050); // 50.87 per second
      assertEq(year3, 31796906796906796906); // 31.80 per second
      assertEq(year4, 19078144078144078144); // 19.08 per second
      assertEq(year5, 13354700854700854700); // 13.35 per second
      assertEq(year6, 12082824582824582824); // 12.08 per second
    }

    function testClaimRewards() public createShare(1) purchaseShare(1) {
        vm.warp(block.timestamp + 1 weeks);
        _curved.getReward();
    }

    function testClaimAsMany() public createShare(1) purchaseFromMany(5, 1) {
        vm.warp(block.timestamp + 1 weeks);
        for (uint256 i = 0; i < _users.length; i++) {
            vm.prank(_users[i]);
            _curved.getReward();
        }
    }

    function testAccurateReward() public createShare(1) purchaseShare(1) {
        uint256 targetTime = _userPurchaseTimestamp[_users[1]] + 52 weeks;
        vm.warp(targetTime);
        _curved.getReward();
        uint256 userClaimTimestamp = block.timestamp;
        uint256 earnedDuration = userClaimTimestamp -
            _userPurchaseTimestamp[_users[1]];
        uint256 currentRate = _curved.getRate(userClaimTimestamp);
        uint256 expectedReward = earnedDuration * currentRate;
        uint256 userRewardBalance = _rewardToken.balanceOf(_users[1]);
        assertEq(userRewardBalance, expectedReward);
    }

    function testAccurateRewardAsManyInDiffPools() public createShare(2) {
        for (uint256 i = 0; i < 2; i++) {
            if (i == 1) {
                uint256 cost = _curved.getBuyPriceAfterFee(0, 1);
                vm.prank(_users[i]);
                _curved.buyShare{value: cost}(0, 1);
                _userPurchaseTimestamp[_users[i]] = block.timestamp;
            } else {
                uint256 cost = _curved.getBuyPriceAfterFee(1, 1);
                vm.prank(_users[i]);
                _curved.buyShare{value: cost}(1, 1);
                _userPurchaseTimestamp[_users[i]] = block.timestamp;
            }
        }
        uint256 totalDeposit = _curved.totalVolume();

        uint256 targetTime = _userPurchaseTimestamp[_users[1]] + 1 weeks;
        vm.warp(targetTime);
        uint256 currentRate = _curved.getRate(block.timestamp);

        for (uint256 i = 0; i < 2; i++) {
            vm.prank(_users[i]);
            _curved.getReward();
            uint256 earnedDuration = block.timestamp -
                _userPurchaseTimestamp[_users[i]];
            uint256 userDeposit = _curved.userVolume(_users[i]);
            uint256 expectedReward;
            if (userDeposit < 0) {
                expectedReward = 0;
            } else {
                expectedReward = (earnedDuration * currentRate * uint(userDeposit)) /
                    totalDeposit;
            }
            
            uint256 userRewardBalance = _rewardToken.balanceOf(_users[i]);
            assertEq(userRewardBalance, expectedReward);
        }
        
    }

    function testRewardProportionSamePool() public createShare(1) purchaseFromMany(2, 1) {
        uint256 totalDeposit = _curved.totalVolume();
        uint256 targetTime = _userPurchaseTimestamp[_users[1]] + 1 weeks;
        vm.warp(targetTime);
        uint256 currentRate = _curved.getRate(block.timestamp);

        for (uint256 i = 0; i < 2; i++) {
            vm.prank(_users[i]);
            _curved.getReward();
            uint256 earnedDuration = block.timestamp -
                _userPurchaseTimestamp[_users[i]];
            uint256 userDeposit = _curved.userVolume(_users[i]);
            uint256 expectedReward;
            if (userDeposit < 0) {
                expectedReward = 0;
            } else {
                expectedReward = (earnedDuration * currentRate * uint(userDeposit)) /
                    totalDeposit;
            }
            uint256 userRewardBalance = _rewardToken.balanceOf(_users[i]);
            assertEq(userRewardBalance, expectedReward);
        }
    }

    function testClaimOnSell() public createShare(1) purchaseShare(1) {
        uint256 targetTime = _userPurchaseTimestamp[_users[1]] + 51 weeks;
        vm.warp(targetTime);
        vm.roll(block.number + 1);
        uint256 earnedBeforeSell = _curved.earned(_users[1]);
        _curved.sellShare(0, 1);
        uint256 earnedAfterSell = _curved.earned(_users[1]);
        uint256 balanceAfterSell = _rewardToken.balanceOf(_users[1]);
        assertEq(earnedBeforeSell, earnedAfterSell);
        assertEq(balanceAfterSell, 0);
        _curved.getReward();
        uint256 balanceAfterClaim = _rewardToken.balanceOf(_users[1]);
        uint256 earnedAfterClaim = _curved.earned(_users[1]);
        assertEq(balanceAfterClaim, earnedBeforeSell);
        assertEq(earnedAfterClaim, 0);
    }

    function testRoyaltyFees() public createShare(1) {
      // royalty fees should be 5% of getPrice() and send to the share owner
      uint256 royaltyFee = _curved.royaltyFeePercent();
      uint256 realCost = _curved.getBuyPrice(0, 1);
      uint256 expectedRoyaltyFee = realCost * royaltyFee / 1 ether;
      uint256 ownerBalanceBefore = _owners[0].balance;
      vm.prank(_users[1]);
      _curved.buyShare{value: _curved.getBuyPriceAfterFee(0, 1)}(0, 1);
      uint256 ownerBalanceAfter = _owners[0].balance;
      assertEq(ownerBalanceAfter - ownerBalanceBefore, expectedRoyaltyFee);
    }
}