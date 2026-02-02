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
npm run build
```

## Test (Rust)

```bash
cargo test-sbf -p create-nullifier
```

## Test (TypeScript)

Requires local validator with Light Protocol.

```bash
light test-validator  # terminal 1
npm test              # terminal 2
```

## Rust SDK

Works with `LightClient` (production) or `LightProgramTest` (testing).

```rust
use create_nullifier::sdk::{create_nullifier_ix, PROGRAM_ID};
use light_client::{LightClient, LightClientConfig};

let mut rpc = LightClient::new(LightClientConfig::new("https://devnet.helius-rpc.com/?api-key=...")).await?;
let ix = create_nullifier_ix(&mut rpc, payer.pubkey(), id).await?;
```

Or step-by-step:

```rust
use create_nullifier::sdk::{fetch_proof, build_instruction};

let proof_result = fetch_proof(&mut rpc, &id).await?;
let ix = build_instruction(payer.pubkey(), id, proof_result);
```

## TypeScript SDK

Works with any `Rpc` from `@lightprotocol/stateless.js`.

```typescript
import { createNullifierIx, PROGRAM_ID } from "nullifier-sdk";
import { createRpc } from "@lightprotocol/stateless.js";

const rpc = createRpc("https://devnet.helius-rpc.com/?api-key=...");
const ix = await createNullifierIx(rpc, payer.publicKey, id);
```

Or step-by-step:

```typescript
import { fetchProof, buildInstruction } from "nullifier-sdk";

const proofResult = await fetchProof(rpc, id);
const ix = buildInstruction(payer.publicKey, id, proofResult);
```

Check if nullifier exists:

```typescript
import { deriveNullifierAddress } from "nullifier-sdk";
import { bn } from "@lightprotocol/stateless.js";

const address = deriveNullifierAddress(id);
const account = await rpc.getCompressedAccount(bn(address.toBytes()));
const exists = account !== null;
```

## How it works

1. Derive a compressed account address from `["nullifier", id]` seeds
2. Create the account with an empty struct
3. If the address exists, the ZK proof verification fails - the nullifier is "spent"

See `programs/create-nullifier/src/lib.rs` for program logic.
