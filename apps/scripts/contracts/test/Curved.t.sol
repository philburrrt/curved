// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";
import {Curved} from "../src/Curved.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

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
        _curvedAddress = address(_curved);
        _rewardToken = IERC20(_curvedAddress);
        uint256 _ownerRewardTokenBalance = _rewardToken.balanceOf(_owner);
        assertEq(_ownerRewardTokenBalance, 2_000_000_000 ether);
    }

    function testGetOwner() public {
        address deployer = _curved.owner();
        assertEq(_owner, deployer);
    }

    function testCreateShare() public {
        vm.stopPrank();
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
        vm.stopPrank();
        vm.startPrank(_users[1]);
        uint256 targetId = _curved.currentId() - 1;
        uint256 cost = _curved.getBuyPriceAfterFee(targetId, 1);
        _curved.buyShare{value: cost}(targetId, 1);
        uint256 userBalance = _curved.getShareBalance(targetId, _users[1]);
        assertEq(userBalance, 1);
    }

    function testPurchaseManyShares() public createShare(1) {
        vm.stopPrank();
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

    // function testGetUserOwnedShares() public createShare(1) {
    //     uint256[] memory ownedShares = _curved.getUserOwnedShares(_users[0]);
    //     assertEq(ownedShares.length, 1);
    //     assertEq(ownedShares[0], _curved.currentId() - 1);
    // }

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
        console2.log("expected reward: ", expectedReward);
        console2.log("user reward balance: ", userRewardBalance);
    }

    function testAccurateRewardAsManyInDiffPools() public createShare(2) {
        vm.stopPrank();
        for (uint256 i = 0; i < 2; i++) {
            if (i == 1) {
                vm.startPrank(_users[i]);
                uint256 cost = _curved.getBuyPriceAfterFee(0, 1);
                _curved.buyShare{value: cost}(0, 1);
                _userPurchaseTimestamp[_users[i]] = block.timestamp;
            } else {
                vm.startPrank(_users[i]);
                uint256 cost = _curved.getBuyPriceAfterFee(1, 1);
                _curved.buyShare{value: cost}(1, 1);
                _userPurchaseTimestamp[_users[i]] = block.timestamp;
            }
        }
        uint256 totalDeposit = _curved.openInterest();

        uint256 targetTime = _userPurchaseTimestamp[_users[1]] + 1 weeks;
        vm.warp(targetTime);
        uint256 currentRate = _curved.getRate(block.timestamp);

        for (uint256 i = 0; i < 2; i++) {
            vm.prank(_users[i]);
            _curved.getReward();
            uint256 earnedDuration = block.timestamp -
                _userPurchaseTimestamp[_users[i]];
            uint256 userDeposit = _curved.userEthContributed(_users[i]);
            uint256 expectedReward = (earnedDuration * currentRate * userDeposit) /
                totalDeposit;
            uint256 userRewardBalance = _rewardToken.balanceOf(_users[i]);
            console2.log("============== USER REWARD STATE ==============");
            console2.log("user: ", _users[i]);
            console2.log("expected reward: ", expectedReward);
            console2.log("user reward balance: ", userRewardBalance);
            console2.log("============== END USER REWARD STATE ==============");
        }
        
    }

    function testRewardProportionSamePool() public createShare(1) purchaseFromMany(2, 1) {
        uint256 totalDeposit = _curved.openInterest();
        uint256 targetTime = _userPurchaseTimestamp[_users[1]] + 1 weeks;
        vm.warp(targetTime);
        uint256 currentRate = _curved.getRate(block.timestamp);

        for (uint256 i = 0; i < 2; i++) {
            vm.prank(_users[i]);
            _curved.getReward();
            uint256 earnedDuration = block.timestamp -
                _userPurchaseTimestamp[_users[i]];
            uint256 userDeposit = _curved.userEthContributed(_users[i]);
            uint256 expectedReward = (earnedDuration * currentRate * userDeposit) /
                totalDeposit;
            uint256 userRewardBalance = _rewardToken.balanceOf(_users[i]);
            console2.log("============== USER REWARD STATE ==============");
            console2.log("user: ", _users[i]);
            console2.log("expected reward: ", expectedReward);
            console2.log("user reward balance: ", userRewardBalance);
            console2.log("============== END USER REWARD STATE ==============");
        }
    }

    function testClaimYearOne() public createShare(1) purchaseShare(1) {
        uint256 targetTime = _curved.startTime() + 31449598;
        vm.warp(targetTime);
        _curved.getReward();
        uint256 userRewardBalance = _rewardToken.balanceOf(_users[1]);
        console2.log("user reward balance: ", userRewardBalance);
    }

    function testClaimYearTwo() public createShare(1) purchaseShare(1) {
        uint256 targetTime = _userPurchaseTimestamp[_users[1]] + 2 * 51 weeks;
        vm.warp(targetTime);
        _curved.getReward();
        uint256 userRewardBalance = _rewardToken.balanceOf(_users[1]);
        console2.log("user reward balance: ", userRewardBalance);
    }


    // ====== HELPERS ======

    function logRewardState() public view {
        console2.log("============== REWARD STATE ==============");
        console2.log("open interest: ", _curved.openInterest());
        console2.log("updatedAt: ", _curved.updatedAt());
        console2.log("rewardPerEthStored: ", _curved.rewardPerEthStored());
        console2.log("============== END REWARD STATE ==============");
    }

    function logUserRewardState(uint256 user) public view {
        console2.log("============== USER REWARD STATE ==============");
        console2.log("user: ", _users[user]);
        console2.log(
            "userEthContributed: ",
            _curved.userEthContributed(_users[user])
        );
        console2.log(
            "userRewardPerEthPaid: ",
            _curved.userRewardPerEthPaid(_users[user])
        );
        console2.log("rewards: ", _curved.rewards(_users[user]));
        console2.log("token balance: ", _rewardToken.balanceOf(_users[user]));
        console2.log("============== END USER REWARD STATE ==============");
    }
}