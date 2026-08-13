// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";

/// @title VeilClubs
/// @notice Confidential no-loss prize pools with one Global Pool and many Private Clubs.
/// @dev This is the first contract pass: deposits, withdrawals, club admin, mock yield,
/// and draw state are wired around ERC-7984/FHE handles. The final weighted draw kernel
/// should be gas-profiled on Sepolia before raising member caps beyond the MVP range.
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
    event MockYieldAccrued(uint256 indexed clubId, address indexed source, euint64 amountHandle);
    event DrawTriggered(uint256 indexed clubId, uint256 indexed drawId, euint64 prizeHandle, bytes32 drawCommitment);
    event PrizeClaimPrepared(uint256 indexed clubId, uint256 indexed drawId, address indexed winner, euint64 prizeHandle);

    error ClubNotFound(uint256 clubId);
    error NotClubAdminOrKeeper(uint256 clubId, address caller);
    error MemberLimitReached(uint256 clubId);
    error DrawTooEarly(uint256 clubId, uint64 nextDrawAt);
    error InvalidDrawInterval();

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

    function accrueMockYield(uint256 clubId, externalEuint64 encryptedAmount, bytes calldata inputProof) external {
        Club storage club = _requireClub(clubId);
        if (msg.sender != club.admin && msg.sender != club.keeper && msg.sender != owner()) {
            revert NotClubAdminOrKeeper(clubId, msg.sender);
        }

        euint64 amount = FHE.fromExternal(encryptedAmount, inputProof);
        FHE.allowTransient(amount, address(depositToken));
        euint64 received = depositToken.confidentialTransferFrom(msg.sender, address(this), amount);

        club.encryptedYield = FHE.add(club.encryptedYield, received);
        _allowContractOnly(club.encryptedYield);

        emit MockYieldAccrued(clubId, msg.sender, received);
    }

    /// @notice Starts a draw and reserves the current encrypted yield as the prize handle.
    /// @dev Winner finalization is intentionally separated because public addresses cannot be
    /// selected with ordinary `if` statements from encrypted comparisons. The production path
    /// should use a profiled FHE draw kernel or a batched/grouped selection module.
    function triggerDraw(uint256 clubId, bytes32 drawCommitment) external returns (uint256 drawId, euint64 prize) {
        Club storage club = _requireClub(clubId);
        if (msg.sender != club.admin && msg.sender != club.keeper) revert NotClubAdminOrKeeper(clubId, msg.sender);
        if (block.timestamp < club.nextDrawAt) revert DrawTooEarly(clubId, club.nextDrawAt);

        drawId = ++club.drawCount;
        prize = club.encryptedYield;
        club.encryptedYield = FHE.asEuint64(0);
        club.nextDrawAt = uint64(block.timestamp + club.drawInterval);

        _allowContractOnly(prize);
        emit DrawTriggered(clubId, drawId, prize, drawCommitment);
    }

    /// @notice MVP/admin finalization hook for demos while the FHE weighted selector is being gas-profiled.
    /// @dev This makes the privacy tradeoff explicit: balances/prize remain encrypted, but selected winner
    /// is supplied by keeper/admin. Do not present this function as the final fair weighted draw.
    function preparePrizeClaim(uint256 clubId, uint256 drawId, address winner, euint64 prize) external {
        Club storage club = _requireClub(clubId);
        if (msg.sender != club.admin && msg.sender != club.keeper) revert NotClubAdminOrKeeper(clubId, msg.sender);

        FHE.allowTransient(prize, address(depositToken));
        depositToken.confidentialTransfer(winner, prize);
        FHE.allow(prize, winner);

        emit PrizeClaimPrepared(clubId, drawId, winner, prize);
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
