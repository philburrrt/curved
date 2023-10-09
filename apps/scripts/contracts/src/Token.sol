// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

contract YuYu is Ownable, ERC20, ERC20Permit, ERC20Votes {
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 public maxSupply = 10_000_000_000 ether;

    EnumerableSet.AddressSet _minters;

    constructor() ERC20("yuyu", "YUYU") ERC20Permit("yuyu") {
        _mint(msg.sender, 2_000_000_000 ether);
    }

    function mint(address to, uint256 amt) public {
        require(_minters.contains(msg.sender), "sender is not minter");
        require(amt + totalSupply() <= maxSupply, "Max supply reached");

        _mint(to, amt);
    }

    function addMinter(address tgt) public onlyOwner {
        _minters.add(tgt);
    }

    function removeMinter(address tgt) public onlyOwner {
        _minters.remove(tgt);
    }

    /**
     * overrides *
     */

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }

    function _mint(address to, uint256 amount) internal override(ERC20, ERC20Votes) {
        if (delegates(to) == address(0)) {
            _delegate(to, to);
        }
        super._mint(to, amount);
    }

    function _burn(address account, uint256 amount) internal override(ERC20, ERC20Votes) {
        super._burn(account, amount);
    }

    // Overrides IERC6372 functions for timestamp-based governance
    function clock() public view override returns (uint48) {
        return uint48(block.timestamp);
    }

    // solhint-disable-next-line func-name-mixedcase
    function CLOCK_MODE() public pure override returns (string memory) {
        return "mode=timestamp";
    }
}
