// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title VeilConfidentialToken
/// @notice Hackathon test confidential token used as the encrypted deposit asset.
contract VeilConfidentialToken is ERC7984, Ownable, ZamaEthereumConfig {
    constructor(address owner)
        ERC7984("Veil Mock Confidential USDC", "vcUSDC", "ipfs://veil-clubs/vcusdc")
        Ownable(owner)
    {}

    function mint(address to, externalEuint64 amount, bytes calldata inputProof) external onlyOwner {
        _mint(to, FHE.fromExternal(amount, inputProof));
    }

    /// @notice Public testnet faucet function to mint 100 cUSDC FHE confidential tokens.
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
