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
cargo test-sbf -p light-nullifier-program
```

## Test (TypeScript)

Requires local validator.

```bash
npm install -g @lightprotocol/zk-compression-cli@0.28.0-beta.5
```

```bash
light test-validator
npm test
```

## SDK 

### Example Usage with Rust and Typescript

Both examples load your Solana keypair at `~/.config/solana/id.json`.

**Devnet**(default):

Set up the `.env` file with a Helius API key ([get one here](https://dev.helius.xyz)):

```bash
cp .env.example .env
# edit .env and add your API_KEY
```

**Localnet:**
For localnet, install the CLI, start the test-validator with the program, and swap the RPC comments in the example files:

```bash
npm install -g @lightprotocol/zk-compression-cli@0.28.0-beta.5
```

```bash
light test-validator --sbf-program NFLx5WGPrTHHvdRNsidcrNcLxRruMC92E4yv7zhZBoT target/deploy/light_nullifier_program.so
```

#### Rust

> Find and run example here: [rust/src/main.rs](examples/rust/src/main.rs).

```bash
cd examples/rust && cargo run
```

#### TypeScript

> Find and run example here: [action-create-nullifier.ts](action-create-nullifier.ts).

```bash
npm install
```

```bash
npm run ts:create-nullifier
```

## Rust SDK Guide

Works with `LightClient` (production) or `LightProgramTest` (testing).

```rust
use light_nullifier_program::sdk::{create_nullifier_ix, PROGRAM_ID};
use light_client::{LightClient, LightClientConfig};

let rpc_url = "https://devnet.helius-rpc.com/?api-key=...".to_string();
let config = LightClientConfig::new(rpc_url, None, None);
let mut rpc = LightClient::new(config).await?;
let ix = create_nullifier_ix(&mut rpc, payer.pubkey(), id).await?;
```

Or step-by-step:

```rust
use light_nullifier_program::sdk::{fetch_proof, build_instruction};

let proof_result = fetch_proof(&mut rpc, &id).await?;
let ix = build_instruction(payer.pubkey(), id, proof_result);
```

## TypeScript SDK Guide

Works with any `Rpc` from `@lightprotocol/stateless.js`.

```typescript
import {
  createNullifierIx,
  PROGRAM_ID,
} from "@lightprotocol/nullifier-program";
import { createRpc } from "@lightprotocol/stateless.js";

const rpc = createRpc("https://devnet.helius-rpc.com/?api-key=...");
const ix = await createNullifierIx(rpc, payer.publicKey, id);
```

Or step-by-step:

```typescript
import { fetchProof, buildInstruction } from "@lightprotocol/nullifier-program";

const proofResult = await fetchProof(rpc, id);
const ix = buildInstruction(payer.publicKey, id, proofResult);
```

Check if nullifier exists:

```typescript
import { deriveNullifierAddress } from "@lightprotocol/nullifier-program";
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

## Documentation 

Find more documentation here: https://www.zkcompression.com/compressed-pdas/guides/how-to-create-nullifier-pdas.

---

The nullifier program code is unaudited, use at your own risk.
