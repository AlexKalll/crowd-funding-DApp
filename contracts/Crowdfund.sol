// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Crowdfund {
    uint256 public campaignCount;

    struct Campaign {
        address payable creator;
        uint256 goal;
        uint256 pledged;
        uint256 startAt;
        uint256 endAt;
        bool claimed;
        string metadataURI; 
    }

    struct Reward {
        string title;
        string description;
        uint256 minimumContribution;
        uint256 quantityAvailable; 
        uint256 claimedCount;
    }

    // mappings
    mapping(uint256 => Campaign) public campaigns; // campaignId => Campaign
    mapping(uint256 => Reward[]) public campaignRewards; // campaignId => Reward[]
    mapping(uint256 => mapping(address => uint256)) public pledgedAmounts; // campaignId => user => amount
    mapping(address => uint256) public totalContributed;

    // events
    event CampaignCreated(uint256 indexed id, address indexed creator, uint256 goal, uint256 startAt, uint256 endAt);
    event Pledged(uint256 indexed id, address indexed contributor, uint256 amount);
    event Withdrawn(uint256 indexed id, uint256 amount);
    event Refunded(uint256 indexed id, address indexed contributor, uint256 amount);
    event RewardClaimed(uint256 indexed campaignId, address indexed contributor, uint256 rewardIndex);

    // campaign functions
    function createCampaign(
        uint256 _goal,
        uint256 _startAt,
        uint256 _endAt,
        string memory _metadataURI
    ) external returns (uint256) {
        require(_goal > 0, "Goal must be > 0");
        require(_startAt < _endAt, "Start must be before end");
        require(_startAt >= block.timestamp, "Start must be now or future");
        require(_endAt > block.timestamp, "End must be in the future");

        campaignCount++;
        campaigns[campaignCount] = Campaign({
            creator: payable(msg.sender),
            goal: _goal,
            pledged: 0,
            startAt: _startAt,
            endAt: _endAt,
            claimed: false,
            metadataURI: _metadataURI
        });

        emit CampaignCreated(campaignCount, msg.sender, _goal, _startAt, _endAt);
        return campaignCount;
    }

    // reward functions
    function addReward(
        uint256 _campaignId,
        string memory _title,
        string memory _description,
        uint256 _minimumContribution,
        uint256 _quantityAvailable
    ) external {
        Campaign storage c = campaigns[_campaignId];
        require(c.creator != address(0), "Campaign does not exist");
        require(msg.sender == c.creator, "Only creator can add rewards");
        require(block.timestamp < c.startAt, "Cannot add reward after campaign start");

        campaignRewards[_campaignId].push(Reward({
            title: _title,
            description: _description,
            minimumContribution: _minimumContribution,
            quantityAvailable: _quantityAvailable,
            claimedCount: 0
        }));
    }

    // contribution functions
    function pledge(uint256 _campaignId, uint256 _rewardIndex) external payable {
        Campaign storage c = campaigns[_campaignId];
        require(c.creator != address(0), "Campaign does not exist");
        require(block.timestamp >= c.startAt && block.timestamp <= c.endAt, "Campaign inactive");
        require(msg.value > 0, "Must send ETH");

        // Handle reward if specified
        if (_rewardIndex < campaignRewards[_campaignId].length) {
            Reward storage r = campaignRewards[_campaignId][_rewardIndex];
            require(msg.value >= r.minimumContribution, "Contribution below reward minimum");
            if (r.quantityAvailable > 0) {
                require(r.claimedCount < r.quantityAvailable, "Reward sold out");
                r.claimedCount++;
                emit RewardClaimed(_campaignId, msg.sender, _rewardIndex);
            }
        }

        pledgedAmounts[_campaignId][msg.sender] += msg.value;
        c.pledged += msg.value;
        totalContributed[msg.sender] += msg.value;

        emit Pledged(_campaignId, msg.sender, msg.value);
    }

    // withdrawal functions
    function withdraw(uint256 _campaignId) external {
        Campaign storage c = campaigns[_campaignId];
        require(c.creator != address(0), "Campaign does not exist");
        require(msg.sender == c.creator, "Not creator");
        require(block.timestamp > c.endAt, "Campaign not ended");
        require(c.pledged >= c.goal, "Goal not reached");
        require(!c.claimed, "Already withdrawn");

        // effects
        c.claimed = true;
        uint256 amount = c.pledged;
        // c.pledged = 0;

        // interaction
        (bool sent, ) = c.creator.call{value: amount}("");
        require(sent, "Transfer failed");

        emit Withdrawn(_campaignId, amount);
    }

    // refund functions
    function refund(uint256 _campaignId) external {
        Campaign storage c = campaigns[_campaignId];
        require(c.creator != address(0), "Campaign does not exist");
        require(block.timestamp > c.endAt, "Campaign not ended");
        require(c.pledged < c.goal, "Goal reached, cannot refund");

        uint256 bal = pledgedAmounts[_campaignId][msg.sender];
        require(bal > 0, "No contributions");

        // effects
        pledgedAmounts[_campaignId][msg.sender] = 0;
        totalContributed[msg.sender] -= bal;

        // interaction
        (bool sent, ) = msg.sender.call{value: bal}("");
        require(sent, "Refund failed");

        emit Refunded(_campaignId, msg.sender, bal);
    }

    // view functions
    function getRewards(uint256 _campaignId) external view returns (Reward[] memory) {
        return campaignRewards[_campaignId];
    }

    function getUserContribution(uint256 _campaignId, address _user) external view returns (uint256) {
        return pledgedAmounts[_campaignId][_user];
    }
}
