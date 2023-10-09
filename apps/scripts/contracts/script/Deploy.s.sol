// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";

import {TimelockController} from "@openzeppelin/contracts/governance/TimelockController.sol";
import {IVotes} from "@openzeppelin/contracts/governance/utils/IVotes.sol";

import {Curved} from "../src/Curved.sol";
import {YuYuMother} from "../src/Governance.sol";
import {YuYu} from "../src/Token.sol";

contract Deploy is Script {
    function setUp() public {}

    function run() public {
        uint256 privKey = vm.envUint("LOCAL_PRIVATE_KEY");
        address deployer = vm.addr(privKey);
        vm.startBroadcast(privKey);

        address[] memory proposers;

        address[] memory executors = new address[](1);
        executors[0] = 0x0000000000000000000000000000000000000000;
        // we set the zero address as executor so that anyone can call it.
        // maybe its better for the Gov to be sole executor? and then anyone can call it from there.

        TimelockController tl = new TimelockController(4 hours, proposers, executors, deployer);

        YuYu token = new YuYu();
        Curved shares = new Curved(address(token));

        token.addMinter(address(shares));

        YuYuMother gov = new YuYuMother(IVotes(token), tl);

        // grant PROPOSER_ROLE to yuyu mother
        tl.grantRole(tl.PROPOSER_ROLE(), address(gov));

        // renounce timelock admin rights
        tl.renounceRole(tl.DEFAULT_ADMIN_ROLE(), deployer);

        // transfer contract ownership to mother
        token.transferOwnership(address(tl));
        shares.transferOwnership(address(tl));

        vm.stopBroadcast();
    }
}
