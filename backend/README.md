# Veil Clubs Backend

No backend service is required for the first MVP path.

The app can run as:

- `frontend/`: wallet connection, Zama SDK encryption/decryption, UI.
- `contracts/`: ERC-7984 token and Veil Clubs pool contracts.

Use this folder later only if the project needs:

- keeper automation for scheduled draws,
- event indexing/cache,
- invite-code persistence beyond onchain club ids,
- faucet rate limiting,
- relayer services.
