// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title VeilConfidentialToken
/// @notice Local/dev confidential token. Production-oriented deployments should
/// use an official Zama Registry ERC-7984 wrapper such as Sepolia cUSDCMock.
contract VeilConfidentialToken is ERC7984, Ownable, ZamaEthereumConfig {
    constructor(address owner)
        ERC7984("Veil Mock Confidential USDC", "vcUSDC", "ipfs://veil-clubs/vcusdc")
        Ownable(owner)
    {}

    function mint(address to, externalEuint64 amount, bytes calldata inputProof) external onlyOwner {
        _mint(to, FHE.fromExternal(amount, inputProof));
    }

    /// @notice Dev-only helper. The app faucet uses the official Zama mock-USDC
    /// mint + wrapper flow instead of this function for bounty deployments.
    function faucetMint(address to) external {
        euint64 amount = FHE.asEuint64(100);
        FHE.allowThis(amount);
        FHE.allow(amount, to);
        _mint(to, amount);
    }

    function burn(address from, externalEuint64 amount, bytes calldata inputProof) external onlyOwner {
        _burn(from, FHE.fromExternal(amount, inputProof));
    }
}
