# Nullifier Program

An Anchor program demonstrating nullifiers on Solana using Light Protocol's ZK compression.

Creates rent-free compressed accounts with unique IDs. If the same ID is used twice, the transaction fails - useful for one-time actions like airdrops, votes, or claim systems.

## Prerequisites

- Rust 1.79+
- Solana CLI 2.2+
- Anchor CLI 0.31.1
- Node.js 18+

## Build

```bash
anchor build
```

## Test

```bash
cargo test-sbf -p create-nullifier
```

## SDK Usage

The crate exposes an SDK module for building instructions without reimplementing the logic.

### All-in-one

```rust
use create_nullifier::sdk::{create_nullifier_ix, PROGRAM_ID};

let ix = create_nullifier_ix(&mut rpc, payer.pubkey(), id).await?;
rpc.create_and_send_transaction(&[ix], &payer.pubkey(), &[&payer]).await?;
```

### Step-by-step

```rust
use create_nullifier::sdk::{fetch_proof, build_instruction, derive_nullifier_address};

// 1. Fetch proof (async, requires RPC)
let proof_result = fetch_proof(&mut rpc, &id).await?;

// 2. Build instruction (sync, no RPC)
let ix = build_instruction(payer.pubkey(), id, proof_result);

// 3. Add to your transaction
tx.add(ix);
```

### Check if nullifier exists

```rust
use create_nullifier::sdk::derive_nullifier_address;

let address = derive_nullifier_address(&id);
let exists = rpc.get_compressed_account(address, None).await?.value.is_some();
```

## How it works

1. Derive a compressed account address from `["nullifier", id]` seeds
2. Create the account with an empty struct
3. If the address exists, the ZK proof verification fails - the nullifier is "spent"

See `programs/create-nullifier/src/lib.rs` for program logic and `src/sdk.rs` for the SDK.
