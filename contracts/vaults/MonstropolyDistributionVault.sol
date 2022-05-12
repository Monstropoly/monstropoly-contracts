// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../utils/UUPSUpgradeableByRole.sol";
import "../shared/IMonstropolyERC20.sol";
import "../shared/IMonstropolyDeployer.sol";
import "./MonstropolyDistributor.sol";

// import "./MonstropolyRewardsDistributor.sol";

contract MonstropolyDistributionVault is UUPSUpgradeableByRole {
    mapping(address => uint256) public distributed;
    mapping(address => uint256) public allocated;

    address public rewardsDistributor;
    uint256 public assigned;

    event DistributeTokens(
        address distributor,
        address account,
        uint256 amount
    );
    event Creation(bytes32 id, address implementation);

    bytes32 public constant REWARDS_UPDATER = keccak256("REWARDS_UPDATER_ROLE");

    function initialize() public initializer {
        __AccessControlProxyPausable_init(msg.sender);
    }

    function available(address account) public view returns (uint256) {
        return allocated[account] - distributed[account];
    }

    function distribute(address account, uint256 amount) public {
        require(
            available(msg.sender) >= amount,
            "MonstropolyDistributionVault: no tokens available"
        );
        distributed[msg.sender] += amount;
        IMonstropolyERC20(IMonstropolyDeployer(config).get(keccak256("ERC20")))
            .transfer(account, amount);
        emit DistributeTokens(msg.sender, account, amount);
    }

    function createDistributor(
        bytes32 id,
        uint256 startBlock,
        uint256 endBlock,
        uint256 cliff,
        uint256 initial,
        uint256 total,
        bytes32 merkleRoot,
        string memory uri
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            assigned + total <=
                IMonstropolyERC20(
                    IMonstropolyDeployer(config).get(keccak256("ERC20"))
                ).cap(),
            "MonstropolyDistributionVault: assignation exceeds cap"
        );
        assigned += total;
        _createDistributor(
            id,
            startBlock,
            endBlock,
            cliff,
            initial,
            total,
            merkleRoot,
            uri
        );
    }

    function _createDistributor(
        bytes32 id,
        uint256 startBlock,
        uint256 endBlock,
        uint256 cliff,
        uint256 initial,
        uint256 total,
        bytes32 merkleRoot,
        string memory uri
    ) internal {
        MonstropolyDistributor distributor = new MonstropolyDistributor(
            startBlock,
            endBlock,
            cliff,
            initial,
            total,
            merkleRoot,
            uri
        );
        address distributorAddress = address(distributor);
        IMonstropolyDeployer(config).setId(id, distributorAddress);
        allocated[distributorAddress] = total;
        emit Creation(id, distributorAddress);
    }

    function migrateDistributor(
        bytes32 id,
        bytes32 newId,
        bytes32 merkleRoot,
        string memory uri
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        address previousAddr = IMonstropolyDeployer(config).get(id);
        MonstropolyDistributor previous = MonstropolyDistributor(previousAddr);

        uint256 released = previous.released();
        uint256 newTotal = allocated[previousAddr] - released;
        allocated[previousAddr] = released;

        uint256 startingPerBlock = previous.startBlock() + previous.cliff();

        require(
            block.number < previous.endBlock(),
            "MonstropolyDistributionVault: cannot migrate a finished distributor"
        );

        if (startingPerBlock > block.number) {
            _createDistributor(
                newId,
                block.number,
                previous.endBlock(),
                startingPerBlock - block.number,
                0,
                newTotal,
                merkleRoot,
                uri
            );
        } else {
            _createDistributor(
                newId,
                block.number,
                previous.endBlock(),
                0,
                0,
                newTotal,
                merkleRoot,
                uri
            );
        }

        previous.finish();
    }

    function createRewards(
        bytes memory bytecode,
        uint256 startBlock,
        uint256 endBlock,
        uint256 changeBlock,
        uint256 amountA,
        uint256 amountB
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        require(
            assigned + amountA + amountB <=
                IMonstropolyERC20(
                    IMonstropolyDeployer(config).get(keccak256("ERC20"))
                ).cap(),
            "MonstropolyDistributionVault: assignation exceeds cap"
        );
        require(
            rewardsDistributor == address(0),
            "MonstropolyDistributionVault: rewards distributor already created"
        );

        assigned += amountA + amountB;

        bytes memory creationCode = abi.encodePacked(
            bytecode,
            startBlock,
            endBlock,
            changeBlock,
            amountA,
            amountB
        );

        assembly {
            sstore(
                rewardsDistributor.slot,
                create(0, add(creationCode, 32), mload(creationCode))
            )
        }

        IMonstropolyDeployer(config).setId(
            keccak256("REWARDS"),
            rewardsDistributor
        );
        allocated[rewardsDistributor] = amountA + amountB;
        emit Creation(keccak256("REWARDS"), rewardsDistributor);
    }

    function updateRewards(uint72[4] memory allocations)
        public
        onlyRole(REWARDS_UPDATER)
        returns (bytes memory)
    {
        require(
            rewardsDistributor != address(0),
            "MonstropolyDistributionVault: rewards distributor not created yet"
        );
        (bool success, bytes memory result) = rewardsDistributor.call(
            abi.encodeWithSignature("updateAllocations(uint72[4])", allocations)
        );
        require(success, "MonstropolyDistributionVault: rewards update failed");
        return result;
    }
}
