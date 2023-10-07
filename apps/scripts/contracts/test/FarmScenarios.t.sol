// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test, console2} from "forge-std/Test.sol";
import {Curved} from "../src/Curved.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/*
  Tests:
    - try to exploit rewards system with second wallet
    - user purchases a few shares
    - random whale purchases a bunch of shares
    - user dumps on whale
    - user makes second account, sends profits, purchases again. check their rewards doing that vs purchasing on same account
  

  ! RESULT:
    user will earn ~10x more rewards creating a new account and spending their profit vs purchasing more shares on the same account
*/

contract Tests is Test {
  Curved public _curved;
  IERC20 public _token;
  address _curvedAddress;
  address _owner = address(0x11);
  address[] farmers = [
    address(0x22),
    address(0x33),
    address(0x44)
  ];

  // ============ Setup ============

  function setUp() public {
    vm.startPrank(_owner);
    // mints 2 bil to owner, 8 bil left to be minted from contract
    _curved = new Curved();
    _curvedAddress = address(_curved);
    _token = IERC20(_curvedAddress);
    for (uint i = 0; i < farmers.length; i++) {
      vm.deal(farmers[i], 0x10000000000000000000000);
    } 
    vm.stopPrank();
  }

  function testSetup() public {
    address deployer = _curved.owner();
    assertEq(deployer, _owner);
  }

  // ============ Initial Scenario ============

  modifier createShare() {
    vm.prank(_owner);
    _curved.createShare("http://test.com");
    _;
  }

  modifier setupScenario() {
    // farmer 0 purchases owner's shares
    uint256 farmer0InitialInvestment = _curved.getBuyPriceAfterFee(0, 2);
    vm.prank(farmers[0]);
    uint256 farmer0Balance1 = farmers[0].balance;
    _curved.buyShare{value: farmer0InitialInvestment}(0, 2);
    // farmer 1 buys 10 shares
    uint256 cost = _curved.getBuyPriceAfterFee(0, 10);
    vm.prank(farmers[1]);
    _curved.buyShare{value: cost}(0, 10);

    // wait 1 day & increment block (block is only relevant here for locking in the warped timestamp)
    vm.warp(block.timestamp + 1 days);
    vm.roll(block.number + 1);

    // check rewards of farmers
    uint256 farmer0Earned = _curved.earned(farmers[0]);
    uint256 farmer1Earned = _curved.earned(farmers[1]);
    console2.log("farmer0Earned1", farmer0Earned);
    console2.log("farmer1Earned1", farmer1Earned);

    // farmer 0 claims and dumps
    vm.startPrank(farmers[0]);
    _curved.getReward();
    uint256 farmer0Claim1Balance = _token.balanceOf(farmers[0]);
    console2.log("farmer0Claim1Balance", farmer0Claim1Balance);

    _curved.sellShare(0, 2);
    uint256 farmer0Balance2 = farmers[0].balance;
    console2.log("profit", farmer0Balance2 - farmer0Balance1);
    vm.stopPrank();

    // farmer 0 spends profit on his alt account, so that he earns more rewards (?)
    // vs purchasing someone else's shares on same account, he'd be earning on his all of his profits rather than his initial investment
    // split into separate scenarios here

    _;
  }

  // ============ Alternate paths ============

  function testNewAccountScenario() public createShare setupScenario {
    // create new share
    // purchase a share with profits from another account (58250000000000000 wei)
    uint256 maxSpend = 58250000000000000;
    uint256 cost;
    uint256 supply;
    for(uint i = 1; i < 100; i++) {
      cost = _curved.getBuyPriceAfterFee(0, i);
      supply = i;
      if (cost > maxSpend) {
        break;
      }
    }
    vm.prank(farmers[2]);
    _curved.buyShare{value: cost}(0, supply);
    uint256 amtPurchased = _curved.getShareBalance(0, farmers[2]);
    console2.log(
      "amtPurchased",
      amtPurchased
    ); // 2

    // wait 1 day & increment block (block is only relevant here for locking in the warped timestamp)

    vm.warp(block.timestamp + 1 days);
    vm.roll(block.number + 1);

    // check rewards of farmers

    uint256 farmer2Earned = _curved.earned(farmers[2]);
    console2.log("farmer2Earned1", farmer2Earned);
    uint256 farmer1Earned = _curved.earned(farmers[1]);
    console2.log("farmer1Earned2", farmer1Earned);
  }
  
  function testSameAccountScenario() public createShare setupScenario {
    // mint another share for pricing reasons
    vm.prank(_owner);
    _curved.createShare("http://test.com");

    // purchase a share with profits from same account (58250000000000000 wei)

    uint256 maxSpend = 58250000000000000;
    uint256 cost;
    uint256 supply;
    for(uint i = 1; i < 100; i++) {
      cost = _curved.getBuyPriceAfterFee(1, i);
      supply = i;
      if (cost > maxSpend) {
        break;
      }
    }
    vm.prank(farmers[0]);
    _curved.buyShare{value: cost}(1, supply);

    // wait 1 day & increment block (block is only relevant here for locking in the warped timestamp)
    vm.warp(block.timestamp + 1 days);
    vm.roll(block.number + 1);

    // check rewards of farmers
    uint256 farmer0Earned2 = _curved.earned(farmers[0]);
    console2.log("%s:%s", "farmer0Earned2", farmer0Earned2);
    uint256 farmer1Earned2 = _curved.earned(farmers[1]);
    console2.log("farmer1Earned2", farmer1Earned2);
  }

  function testDifference() public pure {
    uint256 sameAccountEarned = 410037723470559291454208; // 410037.723470559291454208
    uint256 newAccountEarned = 4480135249366018596781218; // 4480135.249366018596781218

    require(sameAccountEarned > 0, "Division by zero");

    uint256 scaleFactor = 1e18; // Scaling factor to preserve decimal places
    uint256 timesMore = (newAccountEarned * scaleFactor) / sameAccountEarned;

    console2.log("Times more:", timesMore / scaleFactor); // Scaled back down to original unit
    console2.log("Remainder:", timesMore % scaleFactor); // Remainder after scaling down

    // For percent difference
    uint256 percentDifference = ((newAccountEarned - sameAccountEarned) * scaleFactor) / sameAccountEarned;
    console2.log("Percent difference:", percentDifference / 1e16); // Scaled back down, two decimal places
  }
}