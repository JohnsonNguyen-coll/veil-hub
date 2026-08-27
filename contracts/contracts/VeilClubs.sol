// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

/// @title VeilClubs
/// @notice Confidential no-loss prize pools with one Global Pool and many Private Clubs.
/// @dev Draw execution keeps prize allocation encrypted and only lets the selected winner decrypt a non-zero prize.
contract VeilClubs is Ownable, ZamaEthereumConfig {
    IERC7984 public immutable depositToken;

    uint256 public constant GLOBAL_POOL_ID = 0;
    uint256 public constant MAX_MEMBERS_PER_DRAW = 100;

    uint256 public nextClubId = 1;

    struct ClubView {
        string name;
        string description;
        address admin;
        address keeper;
        uint64 minDeposit;
        uint64 drawInterval;
        uint64 nextDrawAt;
        uint256 memberCount;
        uint256 drawCount;
        bool anonymousMembers;
        bool exists;
    }

    struct Club {
        string name;
        string description;
        address admin;
        address keeper;
        uint64 minDeposit;
        uint64 drawInterval;
        uint64 nextDrawAt;
        bool anonymousMembers;
        bool exists;
        address[] members;
        mapping(address => bool) isMember;
        mapping(address => euint64) principal;
        euint64 encryptedTotalPrincipal;
        euint64 encryptedYield;
        uint256 drawCount;
    }

    mapping(uint256 => Club) private _clubs;

    // clubId => drawId => member => encryptedPrize
    mapping(uint256 => mapping(uint256 => mapping(address => euint64))) private _drawPrizes;
    // clubId => drawId => member => claimed
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) private _prizeClaimed;
    // clubId => drawId => totalPrizeHandle
    mapping(uint256 => mapping(uint256 => euint64)) private _drawTotalPrizes;

    event ClubCreated(
        uint256 indexed clubId,
        address indexed admin,
        string name,
        uint64 minDeposit,
        uint64 drawInterval,
        bool anonymousMembers
    );
    event KeeperSet(uint256 indexed clubId, address indexed keeper);
    event MemberJoined(uint256 indexed clubId, address indexed member);
    event EncryptedDeposit(uint256 indexed clubId, address indexed member, euint64 amountHandle);
    event PrincipalWithdrawn(uint256 indexed clubId, address indexed member, euint64 amountHandle);
    event YieldAccrued(uint256 indexed clubId, address indexed source, euint64 amountHandle);
    event DrawTriggered(uint256 indexed clubId, uint256 indexed drawId, euint64 prizeHandle, bytes32 drawCommitment);
    event DrawExecuted(
        uint256 indexed clubId,
        uint256 indexed drawId,
        euint64 prizeHandle,
        bytes32 drawCommitment,
        uint256 memberCount
    );
    event PrizeClaimed(uint256 indexed clubId, uint256 indexed drawId, address indexed member, euint64 prizeHandle);

    error ClubNotFound(uint256 clubId);
    error NotClubAdminOrKeeper(uint256 clubId, address caller);
    error MemberLimitReached(uint256 clubId);
    error DrawTooEarly(uint256 clubId, uint64 nextDrawAt);
    error InvalidDrawInterval();
    error NoMembersInClub(uint256 clubId);
    error InvalidDrawId(uint256 drawId);
    error PrizeAlreadyClaimed(uint256 clubId, uint256 drawId, address member);

    constructor(IERC7984 token, address owner) Ownable(owner) {
        depositToken = token;

        Club storage globalPool = _clubs[GLOBAL_POOL_ID];
        globalPool.name = "Global Pool";
        globalPool.description = "Public confidential no-loss prize pool";
        globalPool.admin = owner;
        globalPool.keeper = owner;
        globalPool.minDeposit = 1;
        globalPool.drawInterval = 1 days;
        globalPool.nextDrawAt = uint64(block.timestamp + 1 days);
        globalPool.exists = true;
    }

    function createClub(
        string calldata name,
        string calldata description,
        uint64 minDeposit,
        uint64 drawInterval,
        bool anonymousMembers
    ) external returns (uint256 clubId) {
        if (drawInterval == 0) revert InvalidDrawInterval();

        clubId = nextClubId++;
        Club storage club = _clubs[clubId];
        club.name = name;
        club.description = description;
        club.admin = msg.sender;
        club.keeper = msg.sender;
        club.minDeposit = minDeposit;
        club.drawInterval = drawInterval;
        club.nextDrawAt = uint64(block.timestamp + drawInterval);
        club.anonymousMembers = anonymousMembers;
        club.exists = true;

        emit ClubCreated(clubId, msg.sender, name, minDeposit, drawInterval, anonymousMembers);
    }

    function setKeeper(uint256 clubId, address keeper) external {
        Club storage club = _requireClub(clubId);
        if (msg.sender != club.admin) revert NotClubAdminOrKeeper(clubId, msg.sender);
        club.keeper = keeper;
        emit KeeperSet(clubId, keeper);
    }

    function deposit(uint256 clubId, externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        Club storage club = _requireClub(clubId);
        _joinIfNeeded(club, clubId, msg.sender);

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowTransient(amount, address(depositToken));
        euint64 received = depositToken.confidentialTransferFrom(msg.sender, address(this), amount);

        club.principal[msg.sender] = FHE.add(club.principal[msg.sender], received);
        club.encryptedTotalPrincipal = FHE.add(club.encryptedTotalPrincipal, received);

        _allowUserAndContract(club.principal[msg.sender], msg.sender);
        _allowContractOnly(club.encryptedTotalPrincipal);

        emit EncryptedDeposit(clubId, msg.sender, received);
    }

    function withdrawPrincipal(uint256 clubId) external {
        Club storage club = _requireClub(clubId);

        euint64 amount = club.principal[msg.sender];
        club.principal[msg.sender] = FHE.asEuint64(0);
        club.encryptedTotalPrincipal = FHE.sub(club.encryptedTotalPrincipal, amount);

        FHE.allowTransient(amount, address(depositToken));
        depositToken.confidentialTransfer(msg.sender, amount);

        _allowUserAndContract(club.principal[msg.sender], msg.sender);
        _allowContractOnly(club.encryptedTotalPrincipal);

        emit PrincipalWithdrawn(clubId, msg.sender, amount);
    }

    function accrueYield(uint256 clubId, externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        Club storage club = _requireClub(clubId);
        if (msg.sender != club.admin && msg.sender != club.keeper && msg.sender != owner()) {
            revert NotClubAdminOrKeeper(clubId, msg.sender);
        }

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowTransient(amount, address(depositToken));
        euint64 received = depositToken.confidentialTransferFrom(msg.sender, address(this), amount);

        club.encryptedYield = FHE.add(club.encryptedYield, received);
        _allowContractOnly(club.encryptedYield);

        emit YieldAccrued(clubId, msg.sender, received);
    }

    /// @notice Executes an onchain verifiable confidential draw.
    /// @dev Selects a winner in ciphertext without exposing the selected index. Only the winner
    /// can decrypt their non-zero prize allocation.
    function executeDraw(uint256 clubId, bytes32 drawCommitment) public returns (uint256 drawId, euint64 prize) {
        Club storage club = _requireClub(clubId);
        if (msg.sender != club.admin && msg.sender != club.keeper && msg.sender != owner()) {
            revert NotClubAdminOrKeeper(clubId, msg.sender);
        }
        if (block.timestamp < club.nextDrawAt) revert DrawTooEarly(clubId, club.nextDrawAt);
        if (club.members.length == 0) revert NoMembersInClub(clubId);

        drawId = ++club.drawCount;
        prize = club.encryptedYield;
        club.encryptedYield = FHE.asEuint64(0);
        club.nextDrawAt = uint64(block.timestamp + club.drawInterval);
        _drawTotalPrizes[clubId][drawId] = prize;

        // 1. Generate encrypted random winner index uniformly over member count
        uint256 len = club.members.length;
        euint64 randIdx = FHE.randEuint64(uint64(len));

        // 2. Homomorphic selection and prize allocation across all members
        for (uint256 i = 0; i < len; i++) {
            address member = club.members[i];
            ebool isWinner = FHE.eq(randIdx, FHE.asEuint64(uint64(i)));

            euint64 allocatedPrize = FHE.select(isWinner, prize, FHE.asEuint64(0));
            _drawPrizes[clubId][drawId][member] = allocatedPrize;

            // Allow only this member and the contract to operate on/decrypt their prize handle
            _allowUserAndContract(allocatedPrize, member);
        }

        _allowContractOnly(prize);
        emit DrawTriggered(clubId, drawId, prize, drawCommitment);
        emit DrawExecuted(clubId, drawId, prize, drawCommitment, len);
    }

    /// @notice Compatibility wrapper for triggering a draw.
    function triggerDraw(uint256 clubId, bytes32 drawCommitment) external returns (uint256 drawId, euint64 prize) {
        return executeDraw(clubId, drawCommitment);
    }

    /// @notice Allows a member to claim their encrypted prize from a completed draw.
    function claimPrize(uint256 clubId, uint256 drawId) external {
        Club storage club = _requireClub(clubId);
        if (drawId == 0 || drawId > club.drawCount) revert InvalidDrawId(drawId);
        if (_prizeClaimed[clubId][drawId][msg.sender]) revert PrizeAlreadyClaimed(clubId, drawId, msg.sender);

        euint64 prize = _drawPrizes[clubId][drawId][msg.sender];
        _prizeClaimed[clubId][drawId][msg.sender] = true;
        _drawPrizes[clubId][drawId][msg.sender] = FHE.asEuint64(0);

        FHE.allowTransient(prize, address(depositToken));
        depositToken.confidentialTransfer(msg.sender, prize);

        _allowUserAndContract(prize, msg.sender);
        emit PrizeClaimed(clubId, drawId, msg.sender, prize);
    }

    function clubView(uint256 clubId) external view returns (ClubView memory view_) {
        Club storage club = _requireClub(clubId);
        view_ = ClubView({
            name: club.name,
            description: club.description,
            admin: club.admin,
            keeper: club.keeper,
            minDeposit: club.minDeposit,
            drawInterval: club.drawInterval,
            nextDrawAt: club.nextDrawAt,
            memberCount: club.members.length,
            drawCount: club.drawCount,
            anonymousMembers: club.anonymousMembers,
            exists: club.exists
        });
    }

    function memberAt(uint256 clubId, uint256 index) external view returns (address) {
        Club storage club = _requireClub(clubId);
        return club.members[index];
    }

    function encryptedPrincipalOf(uint256 clubId, address member) external returns (euint64 principal) {
        Club storage club = _requireClub(clubId);
        principal = club.principal[member];
        FHE.allow(principal, member);
        FHE.allowThis(principal);
    }

    function encryptedPrizeOf(uint256 clubId, uint256 drawId, address member) external returns (euint64 prize) {
        Club storage club = _requireClub(clubId);
        if (drawId == 0 || drawId > club.drawCount) revert InvalidDrawId(drawId);
        prize = _drawPrizes[clubId][drawId][member];
        FHE.allow(prize, member);
        FHE.allowThis(prize);
    }

    function isPrizeClaimed(uint256 clubId, uint256 drawId, address member) external view returns (bool) {
        return _prizeClaimed[clubId][drawId][member];
    }

    function encryptedYieldOf(uint256 clubId) external onlyOwner returns (euint64 yieldHandle) {
        Club storage club = _requireClub(clubId);
        yieldHandle = club.encryptedYield;
        FHE.allowThis(yieldHandle);
    }

    function _joinIfNeeded(Club storage club, uint256 clubId, address member) private {
        if (club.isMember[member]) return;
        if (club.members.length >= MAX_MEMBERS_PER_DRAW) revert MemberLimitReached(clubId);
        club.isMember[member] = true;
        club.members.push(member);
        emit MemberJoined(clubId, member);
    }

    function _requireClub(uint256 clubId) private view returns (Club storage club) {
        club = _clubs[clubId];
        if (!club.exists) revert ClubNotFound(clubId);
    }

    function _allowUserAndContract(euint64 handle, address user) private {
        FHE.allowThis(handle);
        FHE.allow(handle, user);
    }

    function _allowContractOnly(euint64 handle) private {
        FHE.allowThis(handle);
    }
}
