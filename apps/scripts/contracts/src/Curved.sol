// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Curved is Ownable, ERC20 {
    // ====== Market Variables ======
    address public protocolFeeDestination;
    uint256 public protocolFeePercent; // 0.05 eth = 5%
    uint256 public currentId = 0;

    // ====== Reward Variables ======

    // Token to be staked
    IERC20 public immutable rewardsToken;
    // Reward start time
    uint256 public startTime;
    // Timestamp of when the rewards finish
    uint256 public finishAt;
    // Minimum of last updated time and reward finish time
    uint256 public updatedAt;
    // Sum of (reward rate * dt * 1e18 / total supply)
    uint256 public rewardPerEthStored;
    // User address => rewardPerEthStored
    mapping(address => uint256) public userRewardPerEthPaid;
    // User address => rewards to be claimed
    mapping(address => uint256) public rewards;
    // Net ETH from buy/sell transactions
    uint256 public openInterest;
    // User address => staked amount
    mapping(address => uint256) public userEthContributed;

    // ====== Token Variables ======

    uint256 public maxSupply = 10_000_000_000 ether;

    // ====== Events ======

    event ShareCreated(address indexed owner, uint256 indexed id);
    event Trade(
        uint256 id,
        uint256 side,
        address trader,
        address owner,
        uint256 amount,
        uint256 price,
        uint256 supply
    );

    modifier updateReward(address _account) {
        rewardPerEthStored = rewardPerToken();
        updatedAt = lastTimeRewardApplicable();

        if (_account != address(0)) {
            rewards[_account] = earned(_account);
            userRewardPerEthPaid[_account] = rewardPerEthStored;
        }

        _;
    }

    struct Share {
        address owner;
        mapping(address => uint256) balances;
        uint256 totalSupply;
        string uri;
    }

    mapping(uint256 => Share) public shareInfo;

    constructor(
        address _protocolFeeDestination,
        uint256 _protocolFeePercent
    ) ERC20("Curved", "CURVED") {
        protocolFeeDestination = _protocolFeeDestination;
        protocolFeePercent = _protocolFeePercent;
        startTime = block.timestamp;
        updatedAt = startTime;
        finishAt = startTime + 313 weeks;
        rewardsToken = IERC20(address(this));
        _mint(msg.sender, 2_000_000_000 ether);
    }

    function setProtocolFeeDestination(
        address _protocolFeeDestination
    ) external onlyOwner {
        protocolFeeDestination = _protocolFeeDestination;
    }

    function setProtocolFeePercent(
        uint256 _protocolFeePercent
    ) external onlyOwner {
        protocolFeePercent = _protocolFeePercent;
    }

    function getPrice(
        uint256 supply,
        uint256 amount
    ) public pure returns (uint256) {
        uint256 sum1 = supply == 0
            ? 0
            : ((supply - 1) * (supply) * (2 * (supply - 1) + 1)) / 6;
        uint256 sum2 = supply == 0 && amount == 1
            ? 0
            : ((supply - 1 + amount) *
                (supply + amount) *
                (2 * (supply - 1 + amount) + 1)) / 6;
        uint256 summation = sum2 - sum1;
        return (summation * 1 ether) / 4000;
    }

    function createShare(string calldata _uri) external {
        shareInfo[currentId].owner = msg.sender;
        shareInfo[currentId].balances[msg.sender] = 1;
        shareInfo[currentId].totalSupply = 1;
        shareInfo[currentId].uri = _uri;
        currentId++;
        emit ShareCreated(msg.sender, currentId - 1);
    }

    function buyShare(uint256 id, uint256 amount) external payable {
        require(id < currentId, "Invalid share id");
        Share storage share = shareInfo[id];
        uint256 supply = share.totalSupply;
        require(
            supply > 0 || share.owner == msg.sender,
            "Only the shares subject can buy the first share"
        );
        uint256 price = getPrice(supply, amount);
        userEthContributed[msg.sender] = userEthContributed[msg.sender] + price;
        openInterest = openInterest + price;
        uint256 protocolFee = (price * protocolFeePercent) / 1 ether;
        require(msg.value >= price + protocolFee, "Insufficient payment");
        share.balances[msg.sender] = share.balances[msg.sender] + amount;
        share.totalSupply = supply + amount;
        emit Trade(id, 0, msg.sender, share.owner, amount, price, supply);
        (bool success1, ) = protocolFeeDestination.call{value: protocolFee}("");
        require(success1, "Unable to send funds");
    }

    function sellShare(uint256 id, uint256 amount) external {
        require(id < currentId, "Invalid share id");
        Share storage share = shareInfo[id];
        uint256 supply = share.totalSupply;
        require(
            share.balances[msg.sender] >= amount,
            "Insufficient share balance"
        );
        require(
            share.totalSupply - amount > 0,
            "Cannot sell all shares, must leave at least one"
        );
        uint256 owed = getPrice(supply - amount, amount);
        if (owed >= userEthContributed[msg.sender]) {
            userEthContributed[msg.sender] = 0;
        } else {
            userEthContributed[msg.sender] =
                userEthContributed[msg.sender] -
                owed;
        }
        openInterest = openInterest - owed;
        uint256 protocolFee = (owed * protocolFeePercent) / 1 ether;
        share.balances[msg.sender] = share.balances[msg.sender] - amount;
        share.totalSupply = supply - amount;
        emit Trade(id, 1, msg.sender, share.owner, amount, owed, supply);
        (bool success1, ) = msg.sender.call{value: owed - protocolFee}("");
        require(success1, "Unable to send funds");
    }

    function uri(uint256 id) external view returns (string memory) {
        require(id < currentId, "Invalid share id");
        return shareInfo[id].uri;
    }

    function editUri(uint256 id, string calldata _uri) external {
        require(id < currentId, "Invalid share id");
        require(shareInfo[id].owner == msg.sender, "Only the owner can edit");
        shareInfo[id].uri = _uri;
    }

    // ====== Rewards ======

    uint256[] public epoch = [
        4_000_000_000 ether, // 50%
        1_600_000_000 ether, // 20%
        1_000_000_000 ether, // 12.5%
        600_000_000 ether, // 7.5%
        420_000_000 ether, // 5.25%
        380_000_000 ether // 4.75%
    ];

    // reward per second
    function getRate(uint256 currentTime) public view returns (uint256) {
        uint256 timeElapsed = currentTime - startTime;
        uint256 rate;
        if (timeElapsed < 52 weeks) {
            rate = (epoch[0]) / (52 weeks);
        } else if (timeElapsed < 104 weeks) {
            rate = (epoch[1]) / (52 weeks);
        } else if (timeElapsed < 156 weeks) {
            rate = (epoch[2]) / (52 weeks);
        } else if (timeElapsed < 208 weeks) {
            rate = (epoch[3]) / (52 weeks);
        } else if (timeElapsed < 260 weeks) {
            rate = (epoch[4]) / (52 weeks);
        } else if (timeElapsed < 312 weeks) {
            rate = (epoch[5]) / (52 weeks);
        } else {
            rate = 0;
        }
        return rate;
    }

    function lastTimeRewardApplicable() public view returns (uint) {
        return _min(finishAt, block.timestamp);
    }

    function rewardPerToken() public view returns (uint) {
        if (openInterest == 0) {
            return rewardPerEthStored;
        }

        return
            rewardPerEthStored +
            (getRate(block.timestamp) *
                (lastTimeRewardApplicable() - updatedAt) *
                1e18) /
            openInterest;
    }

    function earned(address _account) public view returns (uint) {
        return
            ((userEthContributed[_account] *
                (rewardPerToken() - userRewardPerEthPaid[_account])) / 1e18) +
            rewards[_account];
    }

    function getReward() external updateReward(msg.sender) {
        uint reward = rewards[msg.sender];
        require(reward + totalSupply() <= maxSupply, "Max supply reached");
        if (reward > 0) {
            rewards[msg.sender] = 0;
            _mint(msg.sender, reward);
        }
    }

    function _min(uint x, uint y) private pure returns (uint) {
        return x <= y ? x : y;
    }

    // ====== Market Getters ======

    function getShareInfo(
        uint256 id
    )
        external
        view
        returns (address _owner, uint256 _totalSupply, string memory _uri)
    {
        require(id < currentId, "Invalid share id");
        Share storage share = shareInfo[id];
        return (share.owner, share.totalSupply, share.uri);
    }

    function getBuyPrice(
        uint256 id,
        uint256 amount
    ) public view returns (uint256) {
        require(id < currentId, "Invalid share id");
        return getPrice(shareInfo[id].totalSupply, amount);
    }

    function getSellPrice(
        uint256 id,
        uint256 amount
    ) public view returns (uint256) {
        require(id < currentId, "Invalid share id");
        return getPrice(shareInfo[id].totalSupply - amount, amount);
    }

    function getBuyPriceAfterFee(
        uint256 id,
        uint256 amount
    ) external view returns (uint256) {
        require(id < currentId, "Invalid share id");
        uint256 price = getBuyPrice(id, amount);
        uint256 protocolFee = (price * protocolFeePercent) / 1 ether;
        return price + protocolFee;
    }

    function getSellPriceAfterFee(
        uint256 id,
        uint256 amount
    ) external view returns (uint256) {
        require(id < currentId, "Invalid share id");
        uint256 price = getSellPrice(id, amount);
        uint256 protocolFee = (price * protocolFeePercent) / 1 ether;
        return price - protocolFee;
    }

    function getShareBalance(
        uint256 id,
        address user
    ) external view returns (uint256) {
        require(id < currentId, "Invalid share id");
        return shareInfo[id].balances[user];
    }
}