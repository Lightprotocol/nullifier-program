# Nullifier Program

Creates a rent-free PDA derived from id. If the id has been used before, the PDA
already exists, causing the instruction to fail.

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

- lightprotocol/zk-compression-cli 0.28.0-beta.5

```bash
light test-validator
npm test
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

1. Derive a compressed account address from `["nullifier", id]` seeds. E.g. hash payment inputs.
2. Creates the empty rentfree PDA account, "spending the nullifier"
3. If the address already exists, the instruction fails
4. prepend or append this instruction to your regular transaction (eg. payment)
