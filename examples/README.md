# Example Usage of the Nullifier Program using Rust and Typescript

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

> Find and run example here: [rust/src/main.rs](rust/src/main.rs).

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
