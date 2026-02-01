# Nullifier Program

An Anchor program demonstrating nullifiers on Solana using Light Protocol's ZK compression.

Creates rent-free compressed accounts with unique IDs. If the same ID is used twice, the transaction fails - making it useful for one-time actions like airdrops, votes, or claim systems.

## Prerequisites

- Rust 1.79+
- Solana CLI 2.2+
- Anchor CLI 0.31.1
- Node.js 18+

## Build

```bash
anchor build
```

## Test (Rust)

Uses LiteSVM - no local validator needed.

```bash
cargo test-sbf -p create-nullifier
```

## Test (TypeScript)

Requires local validator with Light Protocol infrastructure.

```bash
# Terminal 1: start test validator
light test-validator

# Terminal 2: run tests
npm install
anchor test --skip-local-validator
```

## How it works

1. Derive a compressed account address from a unique ID
2. Create the account with an empty struct
3. If the address exists, the ZK proof fails - the nullifier has been "spent"

See `programs/create-nullifier/src/lib.rs` for the implementation.
